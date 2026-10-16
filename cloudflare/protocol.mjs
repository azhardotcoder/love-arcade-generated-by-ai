// Pure helpers shared by Cloudflare Worker and Node regression tests.
export const ROOM_CODE=/^\d{6}$/;
export const SECRET=/^[a-f0-9]{64}$/;
export const SIX_HOURS=6*60*60*1000;
export const ALLOWED_EVENTS=new Set([
  'voice-invite','voice-accept','voice-end','voice-decline','voice-mute',
  'watch-reaction','draw-preview','typing','chat-typing','voice-peer'
]);
export function codeFromRandom(next=()=>crypto.getRandomValues(new Uint32Array(1))[0]){
  const max=Math.floor(2**32/1_000_000)*1_000_000;
  let n;
  do{n=next()}while(n>=max);
  return String(n%1_000_000).padStart(6,'0');
}
export function secretHex(bytes=crypto.getRandomValues(new Uint8Array(32))){
  return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function secretHash(secret){
  const data=new TextEncoder().encode(secret);
  const digest=await crypto.subtle.digest('SHA-256',data);
  return secretHex(new Uint8Array(digest));
}
export function equalHash(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
export function displayName(s){
  if(typeof s!=='string')return 'Sweetheart';
  return s.replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,24)||'Sweetheart';
}
export function safeOrigin(origin,allow){
  if(!origin)return false; // Explicit browser origin required for public routes.
  return allow.split(',').some(x=>x.trim()===origin);
}
export function readMessage(raw,limit=180000){
  if(typeof raw!=='string'||raw.length>limit)return null;
  try{const value=JSON.parse(raw);return value&&typeof value==='object'&&!Array.isArray(value)?value:null}
  catch{return null}
}
export function json(value,status=200,origin=null){
  const headers={
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'
  };
  if(origin){
    headers['Access-Control-Allow-Origin']=origin;
    headers['Access-Control-Allow-Methods']='GET,POST,OPTIONS';
    headers['Access-Control-Allow-Headers']='Content-Type';
    headers.Vary='Origin';
  }
  return new Response(JSON.stringify(value),{status,headers});
}
