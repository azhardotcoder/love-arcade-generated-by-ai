/*
 * Love Arcade Chess. Standard chess rules are provided by chess.js 1.4.0
 * https://github.com/jhlywa/chess.js (BSD-2-Clause)
 * One pinned lazy import, so other arcade games work if the chess CDN is down.
 */
let library;
export async function chessLibrary(){
 if(!library) library=import('https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm')
   .then(m=>{if(typeof m.Chess!=='function')throw new Error('Chess engine unavailable');return m})
   .catch(e=>{library=null;throw e});
 return library;
}
export const CONTROLS={
 rapid:{name:'Rapid · 10 + 5',base:600000,increment:5000},
 blitz:{name:'Blitz · 3 + 2',base:180000,increment:2000},
 classic:{name:'Classic · No clock',base:0,increment:0}
};
const initialFen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export function startChess(mode='rapid',now=Date.now()){
 if(!Object.hasOwn(CONTROLS,mode))return null;
 const spec=CONTROLS[mode];
 return {mode,fen:initialFen,moves:[],white:0,turn:0,lastAt:now,
  clocks:[spec.base,spec.base],increment:spec.increment,base:spec.base,
  status:'playing',result:null,offer:null,ready:[false,false],lastMove:null,check:false,version:1};
}
export function chessInstance(Chess,s){
 const game=new Chess();
 for(const ply of s.moves){
  // SAN from our host-validated game, replayed to retain 3-fold and fifty-move state
  try{game.move(ply.san)}catch{return null}
 }
 return game;
}
export function clockNow(s,now=Date.now()){
 if(!s||s.mode==='classic'||s.status!=='playing')return s?.clocks?.slice()||[0,0];
 const out=s.clocks.slice();out[s.turn]=Math.max(0,out[s.turn]-Math.max(0,now-s.lastAt));
 return out;
}
export function moveStatus(game){
 if(game.isCheckmate())return {status:'finished',result:game.turn()==='w'?'Black wins by checkmate':'White wins by checkmate'};
 if(game.isStalemate())return {status:'finished',result:'Draw · stalemate'};
 if(game.isThreefoldRepetition())return {status:'finished',result:'Draw · threefold repetition'};
 if(game.isInsufficientMaterial())return {status:'finished',result:'Draw · insufficient material'};
 if(game.isDraw())return {status:'finished',result:'Draw · chess rules'};
 return {status:'playing',result:null};
}
export function reduceChess(input,action,seat,Chess,now=Date.now()){
 if(!input||!Object.hasOwn(CONTROLS,input.mode)||![0,1].includes(seat)||!action||typeof action!=='object')return null;
 const s=structuredClone(input);
 if(action.type==='chess-tick'){
  if(s.mode==='classic'||s.status!=='playing')return null;
  const c=clockNow(s,now);
  if(c[s.turn]>0)return null;
  s.clocks=c;s.status='finished';s.result=(s.turn===0?'Black':'White')+' wins on time';s.offer=null;s.lastAt=now;
  return s;
 }
 if(action.type==='chess-rematch'){
  if(s.status!=='finished'||s.ready[seat])return null;
  s.ready[seat]=true;
  if(s.ready.every(Boolean)){
   const fresh=startChess(s.mode,now);
   fresh.white=1-s.white;fresh.turn=fresh.white;
   return fresh;
  }
  return s;
 }
 if(s.status!=='playing')return null;
 if(s.mode!=='classic'){
  const c=clockNow(s,now);
  if(c[s.turn]===0){s.clocks=c;s.status='finished';s.result=(s.turn===0?'Black':'White')+' wins on time';s.offer=null;s.lastAt=now;return s}
 }
 if(action.type==='chess-resign'){
  s.status='finished';s.result=(seat===s.white?'Black':'White')+' wins · resignation';s.offer=null;s.clocks=clockNow(input,now);s.lastAt=now;return s;
 }
 if(action.type==='chess-offer'){
  if(s.offer||!['draw','takeback'].includes(action.offer))return null;
  if(action.offer==='takeback'&&!s.moves.length)return null;
  s.offer={kind:action.offer,from:seat};return s;
 }
 if(action.type==='chess-decline'){
  if(!s.offer||s.offer.from===seat)return null;s.offer=null;return s;
 }
 if(action.type==='chess-accept'){
  if(!s.offer||s.offer.from===seat)return null;
  const offer=s.offer;s.offer=null;
  if(offer.kind==='draw'){s.status='finished';s.result='Draw · by agreement';s.clocks=clockNow(input,now);s.lastAt=now;return s}
  if(offer.kind==='takeback'){
   const last=s.moves.pop();if(!last)return null;
   const game=chessInstance(Chess,s);if(!game)return null;
   s.fen=game.fen();s.turn=game.turn()==='w'?s.white:1-s.white;s.check=game.isCheck();
   s.lastMove=s.moves.length?{from:s.moves.at(-1).from,to:s.moves.at(-1).to}:null;
   if(s.mode!=='classic'&&last.clockBefore!==undefined)s.clocks[last.seat]=last.clockBefore;
   s.lastAt=now;return s
  }
 }
 if(action.type!=='chess-move'||s.turn!==seat)return null;
 const {from,to,promotion='q'}=action;
 if(!/^[a-h][1-8]$/.test(from||'')||!/^[a-h][1-8]$/.test(to||'')||!['q','r','b','n'].includes(promotion))return null;
 const g=chessInstance(Chess,s);if(!g||g.isGameOver())return null;
 const before=clockNow(s,now);
 let move;
 try{move=g.move({from,to,promotion})}catch{return null}
 if(!move)return null;
 const clockBefore=before[seat];
 if(s.mode!=='classic')before[seat]+=s.increment;
 s.clocks=before;
 s.moves.push({from:move.from,to:move.to,san:move.san,piece:move.piece,color:move.color,captured:move.captured||null,flags:move.flags,seat,clockBefore});
 s.fen=g.fen();s.lastMove={from:move.from,to:move.to};s.turn=1-seat;s.lastAt=now;
 s.check=g.isCheck();s.offer=null;
 const status=moveStatus(g);s.status=status.status;s.result=status.result;
 return s;
}
export function chessPgn(Chess,state){
 const g=chessInstance(Chess,state);if(!g)return '';
 return g.pgn({maxWidth:72,newline:'\n'});
}
