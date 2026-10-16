import test from 'node:test';
import assert from 'node:assert/strict';
import {parseYoutubeId,initialLounge,reduceLounge,watchPosition,REACTIONS,MAX_QUEUE} from '../watch.mjs';
import {fresh,reduce,GAMES} from '../engine.mjs';
const URL_A='https://www.youtube.com/watch?v=jfKfPfyJRdk';
const URL_B='https://youtu.be/5qap5aO4i9A';
const URL_C='https://www.youtube.com/embed/M7lc1UVf-VE';
const apply=(state,seat,kind,more={},time=10000)=>reduceLounge(state,{kind,...more},seat,time);
const room=(s,seat,kind,more={})=>reduce(s,{type:'watch',kind,epoch:s.epoch,round:s.round,...more},seat);

test('validates YouTube video URLs and blocks impersonator origins',()=>{
 for(const input of [URL_A,'https://youtube.com/shorts/jfKfPfyJRdk','https://m.youtube.com/live/jfKfPfyJRdk','https://youtu.be/jfKfPfyJRdk?t=33','jfKfPfyJRdk'])assert.equal(parseYoutubeId(input),'jfKfPfyJRdk');
 for(const input of ['https://youtube.com.evil.example/watch?v=jfKfPfyJRdk','https://evil.example/watch?v=jfKfPfyJRdk','https://youtube.com/watch?v=wrong','javascript:alert(1)','https://youtu.be/fake/extra','https://user:pass@youtube.com/watch?v=jfKfPfyJRdk',null,'','123'])assert.equal(parseYoutubeId(input),null,String(input));
});

test('lounge state validates open/close and game isolation',()=>{
 let s=initialLounge();
 assert.equal(apply(s,0,'add',{url:URL_A}),null);
 s=apply(s,0,'open');
 assert.equal(s.open,true);
 assert.equal(apply(s,1,'open'),null);
 s=apply(s,1,'close');
 assert.equal(s.open,false);
 let a=fresh();
 a=room(a,0,'open');assert.ok(a.watch.open);
 assert.equal(reduce(a,{type:'start',game:'truth',epoch:a.epoch,round:a.round},0),null);
 a=room(a,1,'close');assert.equal(a.watch.open,false);
 a=reduce(a,{type:'start',game:'truth',epoch:a.epoch,round:a.round},0);
 assert.equal(a.game,'truth');assert.equal(room(a,0,'open'),null);
 assert.equal(Object.keys(GAMES).length,13);
});

test('two peers build and manage bounded shared queue',()=>{
 let s=apply(initialLounge(),0,'open');
 s=apply(s,1,'add',{url:URL_A});
 assert.equal(s.queue.length,1);assert.equal(s.index,0);
 assert.equal(s.playing,false);
 assert.equal(apply(s,0,'add',{url:URL_A}),null);
 s=apply(s,0,'add',{url:URL_B});
 s=apply(s,0,'add',{url:URL_C});
 assert.equal(s.queue.length,3);
 s=apply(s,1,'select',{index:2});
 assert.equal(s.index,2);assert.deepEqual(s.ready,[false,false]);
 assert.equal(apply(s,0,'select',{index:4}),null);
 s=apply(s,0,'remove',{index:0});
 assert.equal(s.index,1);assert.equal(s.queue.length,2);
 s=apply(s,1,'remove',{index:1});
 assert.equal(s.index,0);assert.deepEqual(s.ready,[false,false]);
 s=apply(s,0,'remove',{index:0});
 assert.equal(s.index,-1);
 assert.equal(MAX_QUEUE,24);
});

test('two-party readiness gates play, pause and seek',()=>{
 let s=apply(initialLounge(),0,'open');
 s=apply(s,0,'add',{url:URL_A});
 assert.equal(apply(s,1,'play'),null);
 assert.equal(apply(s,0,'seek',{seconds:30}),null);
 s=apply(s,0,'ready');
 assert.deepEqual(s.ready,[true,false]);
 assert.equal(apply(s,0,'ready'),null);
 s=apply(s,1,'ready');
 assert.deepEqual(s.ready,[true,true]);assert.equal(s.playing,true);
 assert.equal(s.position,0);
 assert.equal(watchPosition(s,14500),4.5);
 s=apply(s,1,'pause',{},15000);
 assert.equal(s.playing,false);assert.equal(s.position,5);assert.equal(watchPosition(s,20000),5);
 s=apply(s,0,'seek',{seconds:41.5},20000);
 assert.equal(s.position,41.5);assert.equal(apply(s,0,'seek',{seconds:-7}),null);
 s=apply(s,1,'play',{},21000);
 assert.equal(s.playing,true);assert.equal(watchPosition(s,22500),43);
 s=apply(s,0,'next',{},25000);
 assert.equal(s,null,'no next video can be played');
});

test('next selection resets readiness and host can advance automatically',()=>{
 let s=apply(initialLounge(),0,'open');
 s=apply(s,0,'add',{url:URL_A});
 s=apply(s,1,'add',{url:URL_B});
 s=apply(s,0,'ready');
 s=apply(s,1,'ready');
 assert.equal(apply(s,1,'ended'),null,'guest cannot advance on ended');
 s=apply(s,0,'ended');
 assert.equal(s.index,1);assert.equal(s.playing,false);assert.deepEqual(s.ready,[false,false]);
 s=apply(s,1,'ready');s=apply(s,0,'ready');
 assert.equal(s.playing,true);
 const ended=apply(s,0,'ended',{},30000);
 assert.equal(ended.playing,false);assert.equal(ended.index,1);
});

test('closing room stops playback and resumes by ready-check',()=>{
 let s=apply(initialLounge(),0,'open');
 s=apply(s,0,'add',{url:URL_A});
 s=apply(s,0,'ready');s=apply(s,1,'ready');
 assert.equal(s.playing,true);
 s=apply(s,1,'close',{},20000);
 assert.equal(s.open,false);assert.equal(s.playing,false);assert.deepEqual(s.ready,[false,false]);
 assert.equal(s.position,10);
 s=apply(s,1,'open',{},25000);
 assert.equal(s.open,true);assert.equal(s.playing,false);
 assert.equal(s.queue.length,1);
});

test('reconnect snapshots preserve room, selected video, playback progress',()=>{
 let s=fresh();s=room(s,0,'open');s=room(s,1,'add',{url:URL_A});
 s=room(s,0,'ready');s=room(s,1,'ready');
 assert.equal(s.watch.playing,true);
 assert.equal(s.watch.queue[0],'jfKfPfyJRdk');
 const guest=structuredClone(s);
 assert.deepEqual(guest.watch,s.watch);
 assert.equal(guest.rev,s.rev);
 assert.equal(REACTIONS.length,6);
});
