import test from 'node:test';
import assert from 'node:assert/strict';
import {GAMES,TRUTHS,DARES,QUESTIONS,RATHER,SYMBOLS,fresh,reduce,viewForSeat} from '../engine.mjs';

const doIt=(s,actor,type,other={})=>reduce(s,{type,epoch:s.epoch,round:s.round,...other},actor);
function begin(game){const s=doIt(fresh(),0,'start',{game});assert.ok(s);return s}
test('catalogue: exactly five games and nonempty content pools',()=>{
 assert.deepEqual(Object.keys(GAMES).sort(),['match','notes','quiz','rather','truth']);
 assert.ok(TRUTHS.length>=10&&DARES.length>=10&&QUESTIONS.length>=5&&RATHER.length>=5);
 assert.equal(SYMBOLS.length,6);
});
test('initial state rejects invalid games and stale rounds',()=>{
 let s=fresh();
 assert.equal(doIt(s,0,'start',{game:'unknown'}),null);
 assert.equal(doIt(s,3,'start',{game:'truth'}),null);
 assert.equal(reduce(s,{type:'start',game:'truth',epoch:100,round:1},0),null);
 assert.equal(s.game,null);
});
test('truth/dare switches turns only after partner approval',()=>{
 let s=begin('truth');
 assert.equal(s.turn,0);
 assert.equal(doIt(s,1,'pick',{kind:'truth'}),null);
 s=doIt(s,0,'pick',{kind:'truth'}); assert.ok(s.task&&TRUTHS.includes(s.task));assert.equal(s.turn,0);
 assert.equal(doIt(s,1,'complete',{}),null);
 s=doIt(s,0,'complete',{value:'My answer'});assert.equal(s.phase,'approval');assert.equal(s.turn,0);
 assert.equal(doIt(s,0,'approve'),null);
 s=doIt(s,1,'retry');assert.equal(s.phase,'task');assert.equal(s.turn,0);
 s=doIt(s,0,'complete');s=doIt(s,1,'approve');assert.equal(s.turn,1);assert.equal(s.round,2);assert.equal(s.hearts,1);assert.equal(s.score[0],1);
 assert.equal(doIt(s,0,'pick',{kind:'dare'}),null);
 s=doIt(s,1,'pick',{kind:'dare'});assert.ok(DARES.includes(s.task));
});
test('truth/dare skip is allowed without a penalty',()=>{
 let s=begin('truth');s=doIt(s,0,'pick',{kind:'truth'});
 s=doIt(s,0,'skip');assert.equal(s.turn,0);assert.equal(s.round,2);assert.equal(s.hearts,0);assert.equal(s.phase,'choose');
});
test('concurrent answer lock and two-person reveal',()=>{
 let s=begin('quiz');
 s=doIt(s,0,'answer',{value:'I will always pick you'});
 assert.equal(s.phase,'answer');
 assert.equal(doIt(s,0,'answer',{value:'Overwrite attempt'}),null);
 assert.equal(viewForSeat(s,1).answers[0],null);
 assert.equal(viewForSeat(s,0).answers[0],'I will always pick you');
 s=doIt(s,1,'answer',{value:'Always together'});
 assert.equal(s.phase,'reveal');assert.equal(s.hearts,1);
 assert.deepEqual(viewForSeat(s,1).answers,s.answers);
 s=doIt(s,0,'next');assert.equal(s.round,1);
 assert.equal(doIt(s,0,'next'),null);
 s=doIt(s,1,'next');assert.equal(s.round,2);assert.deepEqual(s.answers,[null,null]);
});
test('would you rather choices validated and hidden',()=>{
 let s=begin('rather');assert.equal(doIt(s,0,'answer',{value:3}),null);
 s=doIt(s,0,'answer',{value:1});assert.equal(viewForSeat(s,1).answers[0],null);
 s=doIt(s,1,'answer',{value:0});assert.equal(s.phase,'reveal');
});
test('notes strip empty inputs and reject duplicate submission',()=>{
 let s=begin('notes');assert.equal(doIt(s,0,'answer',{value:'   '}),null);
 s=doIt(s,0,'answer',{value:'hello'});assert.equal(doIt(s,0,'answer',{value:'another'}),null);
 assert.equal(viewForSeat(s,1).answers[0],null);
});
test('memory game deals six pairs and conceals all unrevealed cards',()=>{
 let s=begin('match');assert.equal(s.board.length,12);
 for(const sym of SYMBOLS)assert.equal(s.board.filter(x=>x===sym).length,2);
 assert.equal(viewForSeat(s,1).board.every(x=>x===null),true);
 assert.equal(viewForSeat(s,0).board.every(x=>x===null),true);
 let idx=0;s=doIt(s,0,'flip',{index:idx});
 assert.equal(viewForSeat(s,1).board[idx],s.board[idx]);
 assert.equal(viewForSeat(s,1).board.filter(x=>x!==null).length,1);
 assert.equal(doIt(s,1,'flip',{index:idx+1}),null);
 assert.equal(doIt(s,0,'flip',{index:idx}),null);
});
test('memory mismatch passes turn after host hide and validates revision',()=>{
 let s=begin('match');const first=0;const other=s.board.findIndex((x,i)=>i!==first&&x!==s.board[first]);
 s=doIt(s,0,'flip',{index:first});s=doIt(s,0,'flip',{index:other});assert.equal(s.open.length,2);
 assert.equal(doIt(s,1,'hide',{rev:s.rev}),null);
 assert.equal(doIt(s,0,'hide',{rev:s.rev-1}),null);
 s=doIt(s,0,'hide',{rev:s.rev});assert.equal(s.turn,1);assert.equal(s.open.length,0);
});
test('guest cannot forge host-only hide or mutate game state with stale epoch',()=>{
 let s=begin('match');assert.equal(reduce(s,{type:'flip',index:0,epoch:s.epoch-1,round:s.round},0),null);
 assert.equal(reduce(s,null,1),null);
 assert.equal(reduce(s,{type:'lobby',epoch:s.epoch,round:s.round},2),null);
});
test('all games return safely to lobby',()=>{
 for(const game of Object.keys(GAMES)){let s=begin(game);s=doIt(s,1,'lobby');assert.equal(s.game,null);}
});
