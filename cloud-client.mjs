/**
 * Cloudflare WebSocket transport for Love Arcade.
 * Room/game state is authoritative in the Durable Object, never in the host tab.
 * Tokens are credentials: never print them to logs or put host tokens in invite URLs.
 */
export const DEFAULT_ARCADE_BACKEND='https://love-arcade-server.azhardotcoder.workers.dev';
export const TOKEN_PATTERN=/^[a-f0-9]{64}$/;
export const ROOM_PATTERN=/^\d{6}$/;

export function getBackendURL(locationObject=globalThis.location){
  const params=new URLSearchParams(locationObject?.search||'');
  const override=params.get('backend');
  const local=['127.0.0.1','localhost'].includes(locationObject?.hostname);
  if(override&&local){
    const candidate=new URL(override);
    if(['http:','https:'].includes(candidate.protocol)&&['127.0.0.1','localhost'].includes(candidate.hostname)){
      return candidate.origin;
    }
  }
  return DEFAULT_ARCADE_BACKEND;
}

export function readInvite(value){
  const raw=String(value||'').trim();
  let code='',invite='';
  try{
    const url=new URL(raw);
    const h=new URLSearchParams(url.hash.replace(/^#/,''));
    code=h.get('room')||url.searchParams.get('room')||'';
    invite=h.get('invite')||url.searchParams.get('invite')||'';
  }catch{
    if(raw.startsWith('#')){
      const p=new URLSearchParams(raw.slice(1));
      code=p.get('room')||'';invite=p.get('invite')||'';
    }else code=raw;
  }
  code=code.trim().replace(/[\s-]/g,'');
  return {code:ROOM_PATTERN.test(code)?code:'',invite:TOKEN_PATTERN.test(invite)?invite:''};
}
export function inviteLink(origin,pathname,code,token){
  if(!ROOM_PATTERN.test(code)||!TOKEN_PATTERN.test(token))throw new TypeError('A valid room invite is required');
  return origin+pathname+'#'+new URLSearchParams({room:code,invite:token});
}

export async function createCloudRoom(name,base=DEFAULT_ARCADE_BACKEND){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(base+'/api/rooms',{
      method:'POST',mode:'cors',cache:'no-store',signal:controller.signal,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:String(name).slice(0,24)})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Cannot create a room right now. Please try again.');
    if(!ROOM_PATTERN.test(data.code)||!TOKEN_PATTERN.test(data.hostToken)||!TOKEN_PATTERN.test(data.inviteToken))
      throw new Error('The room server returned an invalid response.');
    return data;
  }finally{clearTimeout(timer)}
}

export function createCloudClient({onEvent,onStatus,onError,base=DEFAULT_ARCADE_BACKEND}){
  let socket=null,credentials=null,generation=0,authorized=false,retry=null,heartbeat=null,
    closed=true,attempt=0,heartbeatDeadline=0,lastPingSentAt=0;
  const notify=(kind,detail={})=>onStatus?.(kind,detail);
  const send=message=>{
    if(!socket||socket.readyState!==WebSocket.OPEN||!authorized)return false;
    try{if(message?.type==='ping')lastPingSentAt=Date.now();socket.send(JSON.stringify(message));return true}catch{return false}
  };
  const stopTimers=()=>{
    clearTimeout(retry);retry=null;
    clearInterval(heartbeat);heartbeat=null;
  };
  const stop=({leave=false}={})=>{
    closed=true;generation++;stopTimers();
    if(socket){
      if(leave&&authorized&&socket.readyState===WebSocket.OPEN){
        try{socket.send(JSON.stringify({type:'leave'}))}catch{}
      }
      try{socket.close(1000,'Leaving room')}catch{}
    }
    socket=null;authorized=false;
  };
  const queueRetry=()=>{
    if(closed||retry)return;
    const delay=Math.min(20000,Math.round(900*Math.pow(1.6,Math.min(attempt,7))));
    notify('reconnecting',{attempt,delay});
    retry=setTimeout(()=>{retry=null;open()},delay);
  };
  const open=()=>{
    if(closed||!credentials)return;
    attempt++;const gen=++generation;
    authorized=false;
    const url=new URL(base);
    url.protocol=url.protocol==='https:'?'wss:':'ws:';
    url.pathname='/ws';url.search=new URLSearchParams({room:credentials.code}).toString();url.hash='';
    let ws;
    try{ws=new WebSocket(url.href)}catch{
      onError?.('Could not open a WebSocket connection. Check your network.');
      queueRetry();return;
    }
    socket=ws;
    notify('connecting',{attempt});
    const handshakeTimeout=setTimeout(()=>{
      if(gen===generation&&!authorized){
        onError?.('Room connection timed out. Retrying automatically…');
        try{ws.close()}catch{}
      }
    },17000);
    ws.addEventListener('open',()=>{
      if(gen!==generation){ws.close();return}
      try{ws.send(JSON.stringify({type:'hello',role:credentials.role,name:credentials.name,...(credentials.token?{token:credentials.token}:{})}))}
      catch{ws.close()}
    });
    ws.addEventListener('message',event=>{
      if(gen!==generation)return;
      let payload;
      try{payload=JSON.parse(event.data)}catch{return}
      if(!payload||typeof payload.type!=='string')return;
      if(payload.type==='welcome'){
        authorized=true;attempt=0;clearTimeout(handshakeTimeout);
        if(TOKEN_PATTERN.test(payload.sessionToken||''))credentials.token=payload.sessionToken;
        notify('authorized',{seat:payload.seat});
        clearInterval(heartbeat);
        heartbeatDeadline=Date.now();
        lastPingSentAt=Date.now();
        try{ws.send(JSON.stringify({type:'ping'}))}catch{}
        heartbeat=setInterval(()=>{
          if(!authorized||ws.readyState!==WebSocket.OPEN)return;
          // A quiet connection still needs timely network failure detection.
          if(Date.now()-heartbeatDeadline>38000){ws.close();return}
          try{lastPingSentAt=Date.now();ws.send(JSON.stringify({type:'ping'}))}catch{}
        },12000);
      }
      if(payload.type==='pending')clearTimeout(handshakeTimeout); // Code-only guests may wait for deliberate host approval.
      if(payload.type==='pong'){
        const receivedAt=Date.now();heartbeatDeadline=receivedAt;
        payload={...payload,clientSentAt:lastPingSentAt,clientReceivedAt:receivedAt};
      }
      if(payload.type==='error'&&payload.code==='DENIED'){
        closed=true;clearTimeout(retry);
        onError?.(payload.message||'The room denied this connection.');
      }
      onEvent?.(payload);
    });
    ws.addEventListener('close',event=>{
      clearTimeout(handshakeTimeout);clearInterval(heartbeat);
      if(gen!==generation)return;
      authorized=false;notify('disconnected');
      if(event?.reason==='Room closed by host'||event?.reason==='Room expired'){
        closed=true;onEvent?.({type:'room-closed',message:'Your private room was closed.'});return;
      }
      if(!closed)queueRetry();
    });
    ws.addEventListener('error',()=>{
      if(gen!==generation)return;
      notify('network-error');
    });
  };
  return {
    start(data){
      if(!ROOM_PATTERN.test(data?.code)||!['host','guest'].includes(data?.role))throw new TypeError('Invalid room credentials');
      if(data.token&&!TOKEN_PATTERN.test(data.token))throw new TypeError('Invalid room token');
      stop();
      closed=false;attempt=0;
      credentials={code:data.code,role:data.role,name:String(data.name||'Sweetheart').slice(0,24),token:data.token||''};
      open();
    },
    send,
    stop,
    isReady:()=>authorized&&socket?.readyState===WebSocket.OPEN,
    getToken:()=>credentials?.token||'',
    getRole:()=>credentials?.role||'',
    getAttempt:()=>attempt,
    reconnectNow(){
      if(!credentials)return;
      const details={...credentials};
      stop();closed=false;attempt=0;credentials=details;open();
    }
  };
}
