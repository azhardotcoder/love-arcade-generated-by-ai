import test from 'node:test';
import assert from 'node:assert/strict';
import {PACK_IDS,PROMPTS,BOTTLE,ESCAPE,DATE_STAGES,newCoupleGame,reduceCouple,coupleView} from '../couples-games.mjs';
import {GAMES,fresh,reduce,viewForSeat} from '../engine.mjs';
const go=(s,seat,action,other={},now=1000)=>reduceCouple(s,{type:'couple',action,...other},seat,now);
test('five additional modes are listed with content',()=>{
 assert.deepEqual(PACK_IDS,['pictionary','xoxo','bottle','escape','date']);
 assert.ok(PROMPTS.length>=15&&ESCAPE.length>=4&&DATE_STAGES.length>=5);
 assert.equal(Object.keys(GAMES).length,11);
});
test('Pictionary prompt private, one designated drawer and correct guesses scored',()=>{
 let s=newCoupleGame('pictionary');
 assert.equal(coupleView(s,1).index,null);
 assert.equal(coupleView(s,0).index,s.index);
 assert.equal(go(s,1,'stroke',{points:[[0.3,0.5]],color:'#ff89ba',width:6}),null);
 s=go(s,0,'stroke',{points:[[0.1,0.1],[0.6,0.5]],color:'#ff89ba',width:6});
 assert.equal(s.strokes.length,1);
 assert.equal(go(s,0,'guess',{value:PROMPTS[s.index]}),null);
 s=go(s,1,'guess',{value:PROMPTS[s.index]});assert.equal(s.phase,'reveal');
 assert.deepEqual(s.score,[5,10]);
 assert.equal(go(s,1,'ready').ready[1],true);
 s=go(s,1,'ready');s=go(s,0,'ready');
 assert.equal(s.drawer,1);assert.equal(s.round,2);assert.deepEqual(s.strokes,[]);
});
test('Pictionary drawing payload guard and timeout',()=>{
 let s=newCoupleGame('pictionary');
 assert.equal(go(s,0,'stroke',{points:[[10,20]],color:'#ff89ba',width:6}),null);
 assert.equal(go(s,0,'stroke',{points:[[0.1,0.1]],color:'red',width:6}),null);
 assert.equal(go(s,0,'end',{},s.endsAt-1),null);
 s=go(s,0,'end',{},s.endsAt+1);assert.equal(s.phase,'reveal');
});
test('XOXO enforces seat turns, wins, scores and rematch',()=>{
 let s=newCoupleGame('xoxo');
 assert.equal(go(s,1,'place',{index:0}),null);
 for(const [who,i] of [[0,0],[1,3],[0,1],[1,4],[0,2]])s=go(s,who,'place',{index:i});
 assert.equal(s.status,'win');assert.equal(s.winner,0);assert.deepEqual(s.score,[1,0]);
 assert.equal(go(s,1,'place',{index:7}),null);
 s=go(s,0,'ready');s=go(s,1,'ready');
 assert.equal(s.status,'play');assert.equal(s.round,2);assert.equal(s.turn,1);
});
test('Bottle requires approval before switching turn',()=>{
 let s=newCoupleGame('bottle');
 assert.equal(go(s,1,'spin',{category:'cute'}),null);
 s=go(s,0,'spin',{category:'romantic'});
 assert.ok(BOTTLE.romantic[s.index]);assert.equal(s.phase,'task');
 assert.equal(go(s,1,'done'),null);
 s=go(s,0,'done');assert.equal(s.phase,'review');
 assert.equal(go(s,0,'approve'),null);
 s=go(s,1,'retry');assert.equal(s.phase,'task');
 s=go(s,0,'done');s=go(s,1,'approve');
 assert.equal(s.turn,1);assert.equal(s.round,2);
});
test('Escape requires both players to progress rooms and protects invalid guesses',()=>{
 let s=newCoupleGame('escape');
 assert.equal(go(s,0,'guess',{value:''}),null);
 for(let i=0;i<ESCAPE.length;i++){
  s=go(s,0,'guess',{value:'nonsense'});assert.equal(s.phase,'puzzle');
  s=go(s,1,'guess',{value:ESCAPE[i].answer});assert.equal(s.phase,'solved');
  s=go(s,0,'ready');assert.equal(s.room,i);
  s=go(s,1,'ready');
 }
 assert.equal(s.phase,'complete');
 s=go(s,0,'replay');s=go(s,1,'replay');
 assert.equal(s.room,0);assert.equal(s.phase,'puzzle');
});
test('Dream Date hides unrevealed partner choices, reveals and completes',()=>{
 let s=newCoupleGame('date');
 for(let i=0;i<DATE_STAGES.length;i++){
  assert.equal(go(s,0,'choose',{index:12}),null);
  s=go(s,0,'choose',{index:1});
  assert.equal(coupleView(s,1).choices[0],null);
  s=go(s,1,'choose',{index:2});
  assert.equal(s.phase,'reveal');assert.deepEqual(s.choices,[1,2]);
  s=go(s,0,'ready');s=go(s,1,'ready');
 }
 assert.equal(s.phase,'complete');assert.equal(s.itinerary.length,5);
 s=go(s,1,'replay');s=go(s,0,'replay');assert.equal(s.stage,0);
});
test('arcade integration validates guest actions and seat filtered state',()=>{
 let s=fresh();s=reduce(s,{type:'start',game:'pictionary',epoch:0,round:1},0);
 assert.ok(s?.couple);
 assert.equal(viewForSeat(s,1).couple.index,null);
 const a={type:'couple',action:'stroke',points:[[0.2,0.4]],color:'#37253e',width:3,epoch:s.epoch,round:s.round};
 assert.equal(reduce(s,a,1),null);
 s=reduce(s,a,0);assert.equal(s.couple.strokes.length,1);
 assert.equal(viewForSeat(s,1).couple.strokes.length,1);
 s=reduce(s,{type:'lobby',epoch:s.epoch,round:s.round},1);assert.equal(s.game,null);
});
