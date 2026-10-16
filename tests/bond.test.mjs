import test from 'node:test';
import assert from 'node:assert/strict';
import {HEART_CATEGORIES,STAR_MODES,STAR_QUESTIONS,FIND_STARS,FEEL_STARS,CONSTELLATION_CHALLENGES,newBondGame,reduceBond,bondView} from '../bond-games.mjs';
import {renderBond,constellationSvg} from '../bond-ui.mjs';
import {GAMES,fresh,reduce,viewForSeat} from '../engine.mjs';
const go=(s,seat,action,value)=>reduceBond(s,{type:'bond',action,...(value===undefined?{}:{value})},seat);
const integrate=(s,seat,action,value)=>reduce(s,{type:'bond',action,...(value===undefined?{}:{value}),epoch:s.epoch,round:s.round},seat);
test('HeartSync has all five mood categories with ten unique four-choice prompts each',()=>{
 assert.equal(Object.keys(HEART_CATEGORIES).length,5);
 for(const c of Object.values(HEART_CATEGORIES)){
  assert.equal(c.questions.length,10);
  assert.equal(new Set(c.questions.map(q=>q.text)).size,10);
  for(const q of c.questions){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4)}
 }
 assert.ok(GAMES.heartsync&&GAMES.stars);
});
test('HeartSync setup host alone can configure and begin',()=>{
 let s=newBondGame('heartsync');
 assert.equal(go(s,1,'configure','deep'),null);
 assert.equal(go(s,1,'begin'),null);
 assert.equal(go(s,0,'configure','invalid'),null);
 s=go(s,0,'configure','deep');assert.equal(s.category,'deep');
 s=go(s,0,'begin');assert.equal(s.phase,'choose');
 assert.ok(renderBond(s,0).includes('HeartSync'));
});
test('HeartSync secret choices and prediction states are masked from partner',()=>{
 let s=go(newBondGame('heartsync'),0,'begin');
 assert.equal(go(s,0,'choose',4),null);
 s=go(s,0,'choose',2);
 assert.equal(s.phase,'choose');
 assert.equal(bondView(s,1).choices[0],null);
 assert.equal(bondView(s,0).choices[0],2);
 assert.equal(go(s,0,'choose',1),null);
 s=go(s,1,'choose',1);assert.equal(s.phase,'predict');
 s=go(s,0,'predict',1);
 assert.equal(bondView(s,1).predictions[0],null);
 assert.equal(go(s,0,'predict',0),null);
 s=go(s,1,'predict',2);
 assert.equal(s.phase,'reveal');
 assert.equal(s.matches,0);
 assert.deepEqual(s.score,[1,1]);
 assert.deepEqual(s.history[0].choices,[2,1]);
 assert.deepEqual(s.history[0].correct,[true,true]);
 assert.equal(go(s,0,'predict',2),null);
 assert.equal(go(s,0,'next').ready[0],true);
 s=go(s,0,'next');assert.equal(s.index,0);
 s=go(s,1,'next');assert.equal(s.index,1);assert.equal(s.phase,'choose');
});
test('HeartSync all ten rounds, summary, mixed preferences and safe replay',()=>{
 let s=go(newBondGame('heartsync'),0,'configure','funny');
 s=go(s,0,'begin');
 for(let i=0;i<10;i++){
  const match=i%2===0;
  s=go(s,0,'choose',1);s=go(s,1,'choose',match?1:2);
  s=go(s,0,'predict',match?1:2);s=go(s,1,'predict',1);
  assert.equal(s.phase,'reveal');
  s=go(s,0,'next');s=go(s,1,'next');
 }
 assert.equal(s.phase,'summary');
 assert.equal(s.history.length,10);assert.equal(s.matches,5);
 assert.deepEqual(s.score,[10,10]);
 const html=renderBond(s,0);assert.match(html,/Heart Reveal/);assert.match(html,/Where your hearts met/);assert.match(html,/Lovely little discoveries/);
 s=go(s,1,'replay');assert.equal(s.phase,'summary');s=go(s,0,'replay');
 assert.equal(s.phase,'setup');assert.equal(s.category,'funny');assert.equal(s.history.length,0);
});
test('Star modes contain five prompts, sixteen searchable stars and five memory challenges',()=>{
 assert.equal(Object.keys(STAR_MODES).length,4);
 assert.equal(STAR_QUESTIONS.length,5);assert.equal(FIND_STARS.length,16);
 assert.equal(FEEL_STARS.length,5);assert.equal(CONSTELLATION_CHALLENGES.length,5);
});
test('Same Wish star mode reveals matches, differences and completed constellation SVG',()=>{
 let s=go(newBondGame('stars'),0,'begin');
 for(let i=0;i<5;i++){
  s=go(s,0,'choose',i);assert.equal(bondView(s,1).choices[0],null);
  s=go(s,1,'choose',i===2?0:i);
  assert.equal(s.phase,'reveal');
  s=go(s,0,'next');s=go(s,1,'next');
 }
 assert.equal(s.phase,'summary');assert.equal(s.matches,4);
 assert.equal(s.history.length,5);
 const html=renderBond(s,1);assert.match(html,/Couple Constellation/);assert.match(html,/Save our constellation/);
 const svg=constellationSvg(s);
 assert.match(svg,/<svg /);assert.match(svg,/Our Couple Constellation/);
 assert.match(svg,/Love Arcade/);
});
test('Find My Star alternates secret-keeper and protects selected star',()=>{
 let s=go(newBondGame('stars'),0,'configure','find');s=go(s,0,'begin');
 assert.equal(go(s,1,'choose',3),null);
 assert.equal(go(s,0,'choose',16),null);
 s=go(s,0,'choose',13);
 assert.equal(s.phase,'guess');assert.equal(bondView(s,1).choices[0],null);
 assert.ok(s.clue);
 assert.equal(go(s,0,'guess',13),null);
 s=go(s,1,'guess',13);assert.equal(s.phase,'reveal');assert.equal(s.matches,1);
 s=go(s,0,'next');s=go(s,1,'next');
 assert.equal(go(s,0,'choose',2),null);
 s=go(s,1,'choose',2);assert.equal(bondView(s,0).choices[1],null);
 s=go(s,0,'guess',1);assert.equal(s.matches,1);
});
test('Feel My Heart: chooser and guesser swap turns',()=>{
 let s=go(newBondGame('stars'),0,'configure','feel');s=go(s,0,'begin');
 s=go(s,0,'choose',2);assert.equal(s.phase,'guess');assert.equal(bondView(s,1).choices[0],null);
 s=go(s,1,'guess',2);assert.equal(s.matches,1);
 s=go(s,1,'next');s=go(s,0,'next');
 s=go(s,1,'choose',0);assert.equal(s.phase,'guess');
 s=go(s,0,'guess',1);assert.equal(s.matches,1);
});
test('Our Constellation requires both players to complete each romantic ritual',()=>{
 let s=go(newBondGame('stars'),0,'configure','constellation');
 s=go(s,0,'begin');assert.equal(s.phase,'challenge');
 for(let i=0;i<5;i++){
  assert.equal(go(s,0,'next'),null);
  s=go(s,1,'complete');assert.equal(s.phase,'challenge');
  assert.equal(go(s,1,'complete'),null);
  s=go(s,0,'complete');assert.equal(s.phase,'reveal');
  s=go(s,0,'next');s=go(s,1,'next');
 }
 assert.equal(s.phase,'summary');assert.equal(s.matches,5);assert.equal(s.history.length,5);
 assert.ok(constellationSvg(s).includes('<svg'));
});
test('integration rejects guest forgeries and exposes only the local player secret state',()=>{
 let s=reduce(fresh(),{type:'start',game:'heartsync',epoch:0,round:1},0);
 assert.ok(s.bond);
 assert.equal(integrate(s,1,'begin'),null);
 s=integrate(s,0,'begin');
 s=integrate(s,0,'choose',1);
 assert.equal(viewForSeat(s,1).bond.choices[0],null);
 assert.equal(viewForSeat(s,0).bond.choices[0],1);
 assert.equal(integrate(s,1,'predict',3),null);
 s=integrate(s,1,'choose',2);
 assert.equal(s.bond.phase,'predict');
 s=integrate(s,0,'predict',2);
 assert.equal(viewForSeat(s,1).bond.predictions[0],null);
 s=integrate(s,1,'predict',1);
 assert.equal(viewForSeat(s,1).bond.history.length,1);
 assert.equal(integrate(s,0,'next').bond.ready[0],true);
 s=integrate(s,0,'next');s=integrate(s,1,'next');
 const stale={type:'bond',action:'choose',value:1,epoch:s.epoch-1,round:s.round};
 assert.equal(reduce(s,stale,0),null);
 s=reduce(s,{type:'lobby',epoch:s.epoch,round:s.round},1);
 assert.equal(s.game,null);assert.equal(s.bond,null);
});
