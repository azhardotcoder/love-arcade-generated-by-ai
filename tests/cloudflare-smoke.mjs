/* Real local Cloudflare/Miniflare WebSocket integration smoke test. */
import assert from 'node:assert/strict';
import WebSocket from 'ws';

const base='http://127.0.0.1:8788';
const origin='https://lovearcade.azhardev.in';
const health=await fetch(base+'/health');
assert.equal(health.status,200);
assert.equal((await health.json()).transport,'websocket');

const hostile=await fetch(base+'/api/rooms',{method:'POST',headers:{Origin:'https://wrong.example','Content-Type':'application/json'},body:'{}'});
assert.equal(hostile.status,403,'Untrusted browser origins must be blocked');

const preflight=await fetch(base+'/api/rooms',{
 method:'OPTIONS',
 headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}
});
assert.equal(preflight.status,204,'Production domain CORS preflight must succeed');
assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
assert.match(preflight.headers.get('access-control-allow-methods'),/POST/);
assert.match(preflight.headers.get('access-control-allow-headers'),/Content-Type/i);

const deniedPreflight=await fetch(base+'/api/rooms',{
 method:'OPTIONS',
 headers:{Origin:'https://lovearcade.azhardev.in.evil.example','Access-Control-Request-Method':'POST'}
});
assert.equal(deniedPreflight.status,403,'Lookalike production origins must be denied');
assert.equal(deniedPreflight.headers.get('access-control-allow-origin'),null);

const create=await fetch(base+'/api/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Test Host'})});
assert.equal(create.status,201);
assert.equal(create.headers.get('access-control-allow-origin'),origin,'Room creation must emit production CORS header');
const room=await create.json();
assert.match(room.code,/^\d{6}$/);
assert.match(room.hostToken,/^[a-f0-9]{64}$/);
assert.match(room.inviteToken,/^[a-f0-9]{64}$/);

const clients=new Set();
async function connect(role,token,name){
 const ws=new WebSocket('ws://127.0.0.1:8788/ws?room='+room.code,{headers:{Origin:origin}});
 const inbox=[],listeners=new Set();
 ws.on('message',raw=>{
  let d;try{d=JSON.parse(String(raw))}catch{return}
  const listener=[...listeners].find(fn=>fn(d));
  if(!listener)inbox.push(d);
 });
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('WS connection timed out')),8000);
  ws.once('open',()=>{clearTimeout(timer);resolve()});
  ws.once('error',reject);
 });
 ws.send(JSON.stringify({type:'hello',role,name,...(token?{token}:{})}));
 const client={
  ws,
  send:x=>ws.send(JSON.stringify(x)),
  next(type,ms=6000){
   const found=inbox.findIndex(x=>x.type===type);
   if(found>=0)return Promise.resolve(inbox.splice(found,1)[0]);
   return new Promise((resolve,reject)=>{
    let finished=false;
    const fn=(data)=>{
     if(data.type!==type)return false;
     if(finished)return false;
     finished=true;clearTimeout(timer);listeners.delete(fn);resolve(data);return true;
    };
    const timer=setTimeout(()=>{if(!finished){finished=true;listeners.delete(fn);reject(new Error('Missing event '+type+', got '+JSON.stringify(inbox.map(x=>x.type))))}},ms);
    listeners.add(fn);
   });
  },
  close:()=>ws.close()
 };
 clients.add(client);
 return client;
}
try{
 const host=await connect('host',room.hostToken,'Test Host');
 let welcome=await host.next('welcome');
 assert.equal(welcome.seat,0);
 assert.equal(welcome.state.game,null);
 const guest=await connect('guest',null,'Test Guest');
 assert.equal((await guest.next('pending')).type,'pending');
 const request=await host.next('join-request');
 assert.equal(request.name,'Test Guest');
 host.send({type:'approve',requestId:request.requestId});
 welcome=await guest.next('welcome');
 assert.equal(welcome.seat,1);
 assert.match(welcome.sessionToken,/^[a-f0-9]{64}$/);
 await host.next('presence');
 await guest.next('presence');
 host.send({type:'action',action:{type:'start',game:'quiz',epoch:0,round:1}});
 const hs=await host.next('state'),gs=await guest.next('state');
 assert.equal(hs.state.game,'quiz');
 assert.equal(gs.state.game,'quiz');
 assert.equal(gs.state.answers[0],null);
 assert.equal(gs.state.answers[1],null);
 const id='0123456789abcdef0123456789abcdef';
 guest.send({type:'chat',id,text:'hello across India'});
 assert.equal((await guest.next('chat-ack')).id,id);
 assert.equal((await host.next('chat')).message.text,'hello across India');
 guest.close();
 await host.next('presence');
 const resumed=await connect('guest',welcome.sessionToken,'Test Guest');
 const after=await resumed.next('welcome');
 assert.equal(after.state.game,'quiz','State should be restored after guest reconnect');
 assert.equal(after.messages.length,1);
 await resumed.next('presence');
 const pending=await connect('guest',null,'Intruder');
 const denied=await pending.next('error');
 assert.match(denied.message,/two players/i);
 host.send({type:'leave'});
 console.log('Cloudflare multiplayer smoke test passed: origin, auth, approval, state, chat, reconnect, capacity.');
}finally{
 for(const c of clients){try{c.ws.terminate()}catch{}}
}
