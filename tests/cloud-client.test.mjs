import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DEFAULT_ARCADE_BACKEND,TOKEN_PATTERN,ROOM_PATTERN,getBackendURL,
 readInvite,inviteLink,createCloudClient,createCloudRoom
} from '../cloud-client.mjs';

test('frontend chooses production Cloudflare origin unless explicitly testing a local Worker',()=>{
 assert.equal(getBackendURL({hostname:'love-arcade-generated-by-ai.vercel.app',search:''}),DEFAULT_ARCADE_BACKEND);
 assert.equal(getBackendURL({hostname:'127.0.0.1',search:'?backend=http%3A%2F%2F127.0.0.1%3A8788'}),'http://127.0.0.1:8788');
 assert.equal(getBackendURL({hostname:'evil.example',search:'?backend=http://evil.example'}),DEFAULT_ARCADE_BACKEND);
 assert.equal(getBackendURL({hostname:'127.0.0.1',search:'?backend=https://fake.example'}),DEFAULT_ARCADE_BACKEND);
});
test('room links preserve six-digit leading zeroes and protect the invitation in a URL fragment',()=>{
 const secret='a'.repeat(64);
 assert.ok(ROOM_PATTERN.test('000009'));assert.ok(TOKEN_PATTERN.test(secret));
 const link=inviteLink('https://love-arcade-generated-by-ai.vercel.app','/','000009',secret);
 assert.equal(new URL(link).search,'');
 assert.equal(readInvite(link).code,'000009');
 assert.equal(readInvite(link).invite,secret);
 assert.deepEqual(readInvite(' 000009 '),{code:'000009',invite:''});
 assert.deepEqual(readInvite('bad'),{code:'',invite:''});
 assert.equal(readInvite('#room=000009&invite=bad').invite,'');
 assert.throws(()=>inviteLink('https://example.com','/','hello',secret));
});
test('Cloudflare room creation validates response shape and non-2xx responses',async()=>{
 const previous=globalThis.fetch;
 let captured;
 globalThis.fetch=async (url,options)=>{
  captured={url,options};
  return new Response(JSON.stringify({code:'123456',hostToken:'f'.repeat(64),inviteToken:'c'.repeat(64)}),{status:201,headers:{'content-type':'application/json'}});
 };
 try{
  const room=await createCloudRoom('Nova','https://localhost');
  assert.equal(room.code,'123456');
  assert.equal(captured.url,'https://localhost/api/rooms');
  assert.deepEqual(JSON.parse(captured.options.body),{name:'Nova'});
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'Please wait before creating another room.'}),{status:429});
  await assert.rejects(createCloudRoom('Nova','https://localhost'),/Please wait/);
 }finally{globalThis.fetch=previous}
});
test('transport authenticates without leaking its token through URL and reconnects on request',async()=>{
 const Previous=globalThis.WebSocket;
 const sockets=[];
 class FakeSocket{
  static OPEN=1;
  constructor(url){this.url=url;this.readyState=0;this.listeners={};this.sent=[];sockets.push(this)}
  addEventListener(type,handler){(this.listeners[type]??=[]).push(handler)}
  emit(type,event={}){for(const fn of this.listeners[type]||[])fn(event)}
  open(){this.readyState=1;this.emit('open')}
  message(msg){this.emit('message',{data:JSON.stringify(msg)})}
  send(message){this.sent.push(JSON.parse(message))}
  close(code=1000,reason=''){this.readyState=3;this.emit('close',{code,reason})}
 }
 globalThis.WebSocket=FakeSocket;
 const received=[],statuses=[];
 try{
  const client=createCloudClient({base:'https://love-arcade-server.example',onEvent:d=>received.push(d),onStatus:(status)=>statuses.push(status)});
  client.start({code:'000042',role:'guest',token:'a'.repeat(64),name:'Sky'});
  const ws=sockets.at(-1);
  assert.equal(new URL(ws.url).searchParams.get('room'),'000042');
  assert.ok(!ws.url.includes('a'.repeat(64)));
  assert.ok(!client.isReady());
  ws.open();assert.equal(ws.sent[0].type,'hello');assert.equal(ws.sent[0].token,'a'.repeat(64));
  ws.message({type:'welcome',seat:1,sessionToken:'b'.repeat(64)});
  assert.ok(client.isReady());
  assert.equal(client.getToken(),'b'.repeat(64));
  assert.ok(client.send({type:'ping'}));
  assert.equal(ws.sent.at(-1).type,'ping');
  client.reconnectNow();
  assert.equal(sockets.length,2);
  const next=sockets.at(-1);next.open();
  assert.equal(next.sent[0].token,'b'.repeat(64));
  next.message({type:'welcome',seat:1});
  assert.ok(statuses.includes('authorized'));
  assert.ok(received.filter(x=>x.type==='welcome').length===2);
  client.stop({leave:true});
  assert.equal(next.sent.at(-1).type,'leave');
 }finally{globalThis.WebSocket=Previous}
});
