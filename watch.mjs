/* Pure, host-authoritative YouTube lounge logic. No video data or accounts. */
export const MAX_QUEUE=24;
export const REACTIONS=['❤️','😍','😂','🥹','😘','👏'];
export function parseYoutubeId(input){
 if(typeof input!=='string'||input.length>2048)return null;
 const value=input.trim();
 if(/^[A-Za-z0-9_-]{11}$/.test(value))return value;
 let url;try{url=new URL(value)}catch{return null}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null;
 const host=url.hostname.toLowerCase().replace(/\.$/,'');
 let id=null;
 if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){
  if(url.pathname==='/watch')id=url.searchParams.get('v');
  else {const parts=url.pathname.split('/').filter(Boolean);if(['shorts','embed','live','v'].includes(parts[0])&&parts.length===2)id=parts[1]}
 }else if(host==='youtu.be'||host==='www.youtu.be'){
  const parts=url.pathname.split('/').filter(Boolean);if(parts.length===1)id=parts[0];
 }
 return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
}
export function initialLounge(){return {open:false,queue:[],index:-1,ready:[false,false],playing:false,position:0,updatedAt:0,rev:0}}
export function watchPosition(s,now=Date.now()){
 if(!s||s.index<0)return 0;
 return Math.max(0,Math.min(43200,s.position+(s.playing?Math.max(0,now-s.updatedAt)/1000:0)));
}
function freshSelection(s,now){s.ready=[false,false];s.playing=false;s.position=0;s.updatedAt=now;}
export function reduceLounge(src,action,seat,now=Date.now()){
 if(!src||![0,1].includes(seat)||!action||typeof action!=='object'||!Number.isFinite(now))return null;
 const s=structuredClone(src),type=action.kind;
 if(type==='open'){if(s.open)return null;s.open=true;s.updatedAt=now;s.rev++;return s}
 if(type==='close'){if(!s.open)return null;s.open=false;s.playing=false;s.ready=[false,false];s.position=watchPosition(src,now);s.updatedAt=now;s.rev++;return s}
 if(!s.open)return null;
 if(type==='add'){
  const id=parseYoutubeId(action.url);
  if(!id||s.queue.length>=MAX_QUEUE||s.queue.includes(id))return null;
  s.queue.push(id);
  if(s.index===-1){s.index=0;freshSelection(s,now)}
 }else if(type==='remove'){
  const i=action.index;
  if(!Number.isInteger(i)||i<0||i>=s.queue.length)return null;
  s.queue.splice(i,1);
  if(!s.queue.length){s.index=-1;freshSelection(s,now)}
  else if(i===s.index){s.index=Math.min(i,s.queue.length-1);freshSelection(s,now)}
  else if(i<s.index)s.index--;
 }else if(type==='select'||type==='next'){
  const i=type==='next'?s.index+1:action.index;
  if(!Number.isInteger(i)||i<0||i>=s.queue.length||i===s.index)return null;
  s.index=i;freshSelection(s,now);
 }else if(type==='ready'){
  if(s.index<0||s.ready[seat])return null;
  s.ready[seat]=true;
  if(s.ready.every(Boolean)){s.playing=true;s.position=0;s.updatedAt=now}
 }else if(type==='play'||type==='pause'||type==='seek'){
  if(s.index<0||!s.ready.every(Boolean))return null;
  if(type==='seek'){
   if(!Number.isFinite(action.seconds)||action.seconds<0||action.seconds>43200)return null;
   s.position=action.seconds;s.updatedAt=now;
  }else{
   if(s.playing===(type==='play'))return null;
   s.position=watchPosition(s,now);
   s.playing=type==='play';s.updatedAt=now;
  }
 }else if(type==='ended'){
  if(seat!==0||s.index<0||!s.ready.every(Boolean))return null;
  if(s.index+1<s.queue.length){s.index++;freshSelection(s,now)}
  else {s.position=watchPosition(s,now);s.playing=false;s.updatedAt=now;}
 }else{return null}
 s.rev++;return s;
}
