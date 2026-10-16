/**
 * Love Arcade authoritative Cloudflare multiplayer server.
 * Rooms run on SQLite-backed Durable Objects with hibernatable WebSockets.
 * No legacy PeerJS direct data channel is required when this backend is enabled.
 *
 * Deployment remains intentionally separate from the existing live frontend.
 */
import {DurableObject} from 'cloudflare:workers';
import {Chess} from 'chess.js';
import {fresh,reduce,viewForSeat,registerChessRules} from '../engine.mjs';
registerChessRules(Chess);
import {
  ROOM_CODE,SECRET,SIX_HOURS,ALLOWED_EVENTS,codeFromRandom,
  secretHex,secretHash,equalHash,displayName,safeOrigin,readMessage,json
} from './protocol.mjs';

const MAX_ROOM_AGE=24*60*60*1000;
const ROOM_VERSION=1;
const MAX_CHAT=80;
const MAX_SOCKETS=8;

function reply(ws,payload){
  try{if(ws.readyState===1)ws.send(JSON.stringify(payload))}catch{}
}
function attached(ws){return ws.deserializeAttachment?.()||{role:'unauthorized'}}
function activeSockets(ctx,role){
  return ctx.getWebSockets().filter(ws=>{
    const a=attached(ws);return a.role===role&&ws.readyState===1;
  });
}
function socketOf(ctx,role){return activeSockets(ctx,role)[0]||null}
function refuse(ws,reason,close=true){
  reply(ws,{type:'error',code:'DENIED',message:reason});
  if(close)try{ws.close(1008,'Not permitted')}catch{}
}
function isObject(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)}
const cloneJson=x=>JSON.parse(JSON.stringify(x));

export class ArcadeRoom extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.queue=Promise.resolve();
  }
  async fetch(request){
    const path=new URL(request.url).pathname;
    if(path==='/create'&&request.method==='POST'){
      const existing=await this.ctx.storage.get('room');
      if(existing&&existing.expiresAt>Date.now())return json({error:'Room already in use'},409);
      if(existing)for(const ws of this.ctx.getWebSockets())try{ws.close(1001,'Previous room expired')}catch{}
      const body=await request.json().catch(()=>null);
      if(!body||!SECRET.test(body.hostToken)||!SECRET.test(body.inviteToken))
        return json({error:'Invalid room setup'},400);
      const now=Date.now();
      const room={
        version:ROOM_VERSION,createdAt:now,maxExpiresAt:now+MAX_ROOM_AGE,
        expiresAt:now+SIX_HOURS,touchedAt:now,
        hostHash:await secretHash(body.hostToken),
        inviteHash:await secretHash(body.inviteToken),
        guestHash:null,
        hostName:displayName(body.name),guestName:'',
        state:fresh(),messages:[]
      };
      await this.ctx.storage.put('room',room);
      await this.ctx.storage.setAlarm(room.expiresAt);
      return json({ok:true,expiresAt:room.expiresAt},201);
    }
    if(path==='/socket'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
      const room=await this.ctx.storage.get('room');
      if(!room||room.expiresAt<=Date.now())return json({error:'This room has expired'},410);
      if(this.ctx.getWebSockets().length>=MAX_SOCKETS)return json({error:'Room connection limit'},429);
      const pair=new WebSocketPair();
      const [client,server]=Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({role:'unauthorized',id:crypto.randomUUID(),createdAt:Date.now()});
      return new Response(null,{status:101,webSocket:client});
    }
    return json({error:'Unknown room operation'},404);
  }
  async webSocketMessage(ws,raw){
    this.queue=this.queue.then(()=>this.process(ws,raw)).catch(e=>{
      // Never write room secrets, client bodies, or credentials to logs.
      console.error('Room message processing error:',e?.name||'Error');
      reply(ws,{type:'error',code:'SERVER_ERROR',message:'Temporary server error. Please reconnect.'});
    });
    await this.queue;
  }
  async process(ws,raw){
    const data=readMessage(raw);
    if(!data){refuse(ws,'Invalid or oversized message');return}
    const room=await this.ctx.storage.get('room');
    if(!room||room.expiresAt<=Date.now()){
      refuse(ws,'Room expired');return
    }
    const a=attached(ws);
    if(a.role==='unauthorized'){
      if(data.type!=='hello'){refuse(ws,'Authenticate before sending events');return}
      await this.authenticate(ws,data,room);
      return;
    }
    if(a.role==='pending'){
      if(data.type==='ping')reply(ws,{type:'pong',serverTime:Date.now()});
      return;
    }
    if(!['host','guest'].includes(a.role))return;
    const seat=a.role==='host'?0:1;
    if(data.type==='ping'){
      reply(ws,{type:'pong',serverTime:Date.now()});
      if(Date.now()-room.touchedAt>5*60*1000)await this.touch(room);
      return;
    }
    if(data.type==='action'){
      if(!isObject(data.action))return;
      const now=Date.now();
      if(now-(a.lastActionAt||0)<35)return;
      ws.serializeAttachment({...a,lastActionAt:now});
      const newState=reduce(room.state,data.action,seat);
      if(!newState){reply(ws,{type:'error',code:'INVALID_ACTION',message:'Action not allowed in this round.'});return}
      if(JSON.stringify(newState).length>400000){reply(ws,{type:'error',code:'TOO_LARGE',message:'Room state limit reached.'});return}
      room.state=newState;
      await this.ctx.storage.put('room',room);
      this.sendState(room);
      return;
    }
    if(data.type==='chat'){
      const text=typeof data.text==='string'?data.text.trim().slice(0,500):'';
      if(!text||!(/^[a-f0-9]{32}$/.test(data.id||'')))return;
      if(room.messages.some(m=>m.id===data.id)){reply(ws,{type:'chat-ack',id:data.id});return}
      if(Date.now()-(a.lastChatAt||0)<350)return;
      ws.serializeAttachment({...a,lastChatAt:Date.now()});
      const msg={id:data.id,text,seat,time:Date.now()};
      room.messages.push(msg);room.messages=room.messages.slice(-MAX_CHAT);
      await this.ctx.storage.put('room',room);
      reply(ws,{type:'chat-ack',id:data.id});
      reply(socketOf(this.ctx,seat===0?'guest':'host'),{type:'chat',message:msg});
      return;
    }
    if(data.type==='signal'){
      const kind=typeof data.event==='string'?data.event:'';
      if(!ALLOWED_EVENTS.has(kind)||!isObject(data.payload)||JSON.stringify(data.payload).length>120000)return;
      const now=Date.now();
      if(now-(a.lastSignalAt||0)<15)return;
      ws.serializeAttachment({...a,lastSignalAt:now});
      reply(socketOf(this.ctx,seat===0?'guest':'host'),{type:'signal',event:kind,payload:data.payload});
      return;
    }
    if(data.type==='approve'&&seat===0){
      const pending=this.ctx.getWebSockets().find(c=>{
        const info=attached(c);return info.role==='pending'&&info.id===data.requestId&&c.readyState===1;
      });
      if(pending&&!room.guestHash)await this.admitGuest(pending,room);
      return;
    }
    if(data.type==='reject'&&seat===0){
      const pending=this.ctx.getWebSockets().find(c=>{
        const info=attached(c);return info.role==='pending'&&info.id===data.requestId;
      });
      if(pending)refuse(pending,'The host declined this invitation.');
      return;
    }
    if(data.type==='leave'){
      if(seat===0){
        for(const c of this.ctx.getWebSockets())try{c.close(1000,'Room closed by host')}catch{}
        await this.ctx.storage.deleteAll();
      }else{
        room.guestHash=null;room.guestName='';
        room.state=fresh();room.messages=[];
        await this.ctx.storage.put('room',room);
        try{ws.close(1000,'Guest left')}catch{}
        this.broadcastPresence(room);
        this.sendState(room);
      }
    }
  }
  async authenticate(ws,data,room){
    const role=data.role;
    const name=displayName(data.name);
    const token=typeof data.token==='string'?data.token:'';
    if(role==='host'){
      if(!SECRET.test(token)||!equalHash(await secretHash(token),room.hostHash)){
        refuse(ws,'Invalid host credentials');return;
      }
      await this.attachSeat(ws,room,'host',name);
      return;
    }
    if(role!=='guest'){refuse(ws,'Unknown role');return}
    if(SECRET.test(token)){
      const hashed=await secretHash(token);
      if(room.guestHash&&equalHash(hashed,room.guestHash)){
        await this.attachSeat(ws,room,'guest',name);
        return;
      }
      if(!room.guestHash&&equalHash(hashed,room.inviteHash)){
        await this.admitGuest(ws,room,name);
        return;
      }
      refuse(ws,'That invitation has expired or belongs to another guest.');
      return;
    }
    if(token){refuse(ws,'Invalid invitation token');return}
    if(room.guestHash){refuse(ws,'This room already has two players.');return}
    if(activeSockets(this.ctx,'pending').length>=2){refuse(ws,'Too many pending requests.');return}
    const previous=attached(ws);
    ws.serializeAttachment({...previous,role:'pending',name});
    reply(ws,{type:'pending',message:'Waiting for the room owner to approve your request.'});
    const host=socketOf(this.ctx,'host');
    if(host)reply(host,{type:'join-request',requestId:previous.id,name});
  }
  async admitGuest(ws,room,name=null){
    if(room.guestHash){refuse(ws,'Room is already occupied.');return}
    const secret=secretHex();
    room.guestHash=await secretHash(secret);
    room.guestName=displayName(name||attached(ws).name);
    await this.ctx.storage.put('room',room);
    await this.attachSeat(ws,room,'guest',room.guestName,secret);
    for(const pending of activeSockets(this.ctx,'pending'))if(pending!==ws)
      refuse(pending,'Another guest joined the room.');
  }
  async attachSeat(ws,room,role,name,issuedToken=null){
    const previous=attached(ws);
    for(const peer of activeSockets(this.ctx,role)){
      if(peer!==ws)try{peer.close(1000,'Connected from another tab')}catch{}
    }
    ws.serializeAttachment({...previous,role,name});
    if(role==='host')room.hostName=name;
    if(role==='guest')room.guestName=name;
    await this.ctx.storage.put('room',room);
    const seat=role==='host'?0:1;
    reply(ws,{
      type:'welcome',seat,name,partnerName:seat===0?room.guestName:room.hostName,
      state:viewForSeat(room.state,seat),messages:room.messages,
      expiresAt:room.expiresAt,...(issuedToken?{sessionToken:issuedToken}:{})
    });
    this.broadcastPresence(room);
    if(role==='host'){
      for(const pending of activeSockets(this.ctx,'pending')){
        const info=attached(pending);
        reply(ws,{type:'join-request',requestId:info.id,name:info.name});
      }
    }
  }
  broadcastPresence(room){
    const host=socketOf(this.ctx,'host'),guest=socketOf(this.ctx,'guest');
    if(host)reply(host,{type:'presence',selfOnline:true,partnerOnline:!!guest,partnerName:room.guestName||''});
    if(guest)reply(guest,{type:'presence',selfOnline:true,partnerOnline:!!host,partnerName:room.hostName});
  }
  sendState(room){
    for(const seat of [0,1]){
      const ws=socketOf(this.ctx,seat===0?'host':'guest');
      if(ws)reply(ws,{type:'state',state:viewForSeat(room.state,seat)});
    }
  }
  async touch(room){
    const now=Date.now();
    room.touchedAt=now;
    room.expiresAt=Math.min(room.maxExpiresAt,now+SIX_HOURS);
    await this.ctx.storage.put('room',room);
    await this.ctx.storage.setAlarm(room.expiresAt);
  }
  async webSocketClose(ws){
    const role=attached(ws).role;
    ws.serializeAttachment({role:'closed'});
    if(role==='host'||role==='guest'){
      const room=await this.ctx.storage.get('room');
      if(room)this.broadcastPresence(room);
    }
  }
  async webSocketError(ws){await this.webSocketClose(ws)}
  async alarm(){
    const room=await this.ctx.storage.get('room');
    if(!room)return;
    if(Date.now()<room.expiresAt){await this.ctx.storage.setAlarm(room.expiresAt);return}
    for(const ws of this.ctx.getWebSockets())try{ws.close(1001,'Room expired')}catch{}
    await this.ctx.storage.deleteAll();
  }
}

/** One short-lived counter per connecting IP for room creation, not for joining. */
export class CreateLimiter extends DurableObject {
  constructor(ctx,env){super(ctx,env)}
  async fetch(){
    const now=Date.now();
    let bucket=await this.ctx.storage.get('bucket');
    if(!bucket||bucket.resetAt<=now)bucket={count:0,resetAt:now+10*60*1000};
    if(bucket.count>=12)return json({error:'Too many room creations; try again later.'},429);
    bucket.count++;
    await this.ctx.storage.put('bucket',bucket);
    await this.ctx.storage.setAlarm(bucket.resetAt);
    return json({ok:true});
  }
  async alarm(){await this.ctx.storage.deleteAll()}
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    const allowed=env.ALLOWED_ORIGINS||
      'https://lovearcade.azhardev.in,https://love-arcade-generated-by-ai.vercel.app,http://localhost:4173,http://127.0.0.1:4173';
    if(url.pathname==='/health'&&request.method==='GET')
      return json({ok:true,service:'love-arcade-server',version:ROOM_VERSION,transport:'websocket'},200,safeOrigin(origin,allowed)?origin:null);
    if(!safeOrigin(origin,allowed))return json({error:'Origin not allowed'},403);
    if(request.method==='OPTIONS')
      return new Response(null,{status:204,headers:{
        'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'3600','Vary':'Origin'
      }});
    if(url.pathname==='/api/rooms'&&request.method==='POST'){
      if(request.headers.get('Content-Type')?.split(';')[0]?.trim()!=='application/json')
        return json({error:'Expected application/json'},415,origin);
      const ip=request.headers.get('CF-Connecting-IP')||'local';
      const limiter=env.CREATE_LIMITER.get(env.CREATE_LIMITER.idFromName('create:'+ip));
      const gate=await limiter.fetch('https://internal/check');
      if(!gate.ok)return json({error:'Too many room creations. Try again later.'},429,origin);
      const body=await request.json().catch(()=>({}));
      for(let attempt=0;attempt<16;attempt++){
        const code=codeFromRandom(),hostToken=secretHex(),inviteToken=secretHex();
        const room=env.ROOMS.get(env.ROOMS.idFromName('room-v1:'+code));
        const result=await room.fetch(new Request('https://internal/create',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({hostToken,inviteToken,name:displayName(body?.name)})
        }));
        if(result.status===409)continue;
        if(!result.ok)return json({error:'Cannot create room at the moment.'},503,origin);
        const payload=await result.json();
        return json({code,hostToken,inviteToken,expiresAt:payload.expiresAt},201,origin);
      }
      return json({error:'Unable to reserve an available room code. Try again.'},503,origin);
    }
    if(url.pathname==='/ws'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
      const code=url.searchParams.get('room')||'';
      if(!ROOM_CODE.test(code))return json({error:'Invalid room code'},400);
      const room=env.ROOMS.get(env.ROOMS.idFromName('room-v1:'+code));
      return room.fetch(new Request('https://internal/socket',{headers:request.headers}));
    }
    return json({error:'Unknown endpoint'},404,origin);
  }
};
