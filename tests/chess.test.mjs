import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {CONTROLS,startChess,reduceChess,chessInstance,clockNow,chessPgn} from '../chess.mjs';
import {fresh,reduce,registerChessRules,GAMES,viewForSeat} from '../engine.mjs';
import {legalMoves,promotionRequired,formatClock,chessBoardView} from '../chess-ui.mjs';

function next(s,seat,type,extra={},now=1_000_000){return reduceChess(s,{type,...extra},seat,Chess,now)}
function move(s,seat,from,to,promotion='q',now=1_000_000){return next(s,seat,'chess-move',{from,to,promotion},now)}
test('chess catalogue and three time controls available',()=>{
 assert.ok(GAMES.chess);
 assert.deepEqual(Object.keys(CONTROLS).sort(),['blitz','classic','rapid']);
 assert.equal(startChess('rapid',100).clocks[0],600000);
 assert.equal(startChess('blitz',100).increment,2000);
 assert.equal(startChess('classic',100).base,0);
 assert.equal(startChess('invalid'),null);
});
test('standard initial setup has 20 legal opening moves and two colors',()=>{
 const s=startChess('classic',1000),g=chessInstance(Chess,s);
 assert.equal(g.moves().length,20);
 assert.equal(s.white,0);
 assert.equal(s.turn,0);
 assert.equal(g.get('e1').type,'k');
 assert.equal(g.get('e8').color,'b');
 assert.equal(formatClock(125000),'02:05');
});
test('reject invalid/out-of-turn moves and allow valid pawn moves',()=>{
 let s=startChess('classic',100);
 assert.equal(move(s,1,'e7','e5'),null);
 assert.equal(move(s,0,'e2','e5'),null);
 assert.equal(move(s,0,'z9','e4'),null);
 assert.equal(move(s,0,'e2','e4','x'),null);
 s=move(s,0,'e2','e4');
 assert.equal(s.moves[0].san,'e4');
 assert.equal(s.turn,1);
 assert.equal(s.fen.includes(' b '),true);
 s=move(s,1,'e7','e5');
 assert.equal(s.moves[1].san,'e5');
 assert.equal(s.turn,0);
});
test('Fools Mate produces checkmate and prevents further play',()=>{
 let s=startChess('classic',100);
 s=move(s,0,'f2','f3');
 s=move(s,1,'e7','e5');
 s=move(s,0,'g2','g4');
 s=move(s,1,'d8','h4');
 assert.equal(s.status,'finished');
 assert.match(s.result,/Black wins by checkmate/);
 assert.equal(move(s,0,'e2','e4'),null);
 assert.match(chessPgn(Chess,s),/Qh4#/);
});
test('castling and en passant are handled by rules engine',()=>{
 let s=startChess('classic',100);
 for(const [seat,from,to] of [[0,'e2','e4'],[1,'a7','a6'],[0,'g1','f3'],[1,'a6','a5'],[0,'f1','e2'],[1,'h7','h6'],[0,'e1','g1']])s=move(s,seat,from,to);
 assert.equal(s.moves.at(-1).san,'O-O');
 assert.equal(chessInstance(Chess,s).get('f1').type,'r');
 let ep=startChess('classic',100);
 for(const [seat,from,to] of [[0,'e2','e4'],[1,'a7','a6'],[0,'e4','e5'],[1,'d7','d5'],[0,'e5','d6']])ep=move(ep,seat,from,to);
 assert.ok(ep.moves.at(-1).flags.includes('e'));
 assert.equal(chessInstance(Chess,ep).get('d5'),undefined);
});
test('pawn promotion supports queen, rook, bishop and knight',()=>{
 const moves=[['a2','a4'],['b7','b5'],['a4','b5'],['c7','c6'],['b5','b6'],['d7','d6'],['b6','b7'],['e7','e6']];
 const s=startChess('classic',100);let g=new Chess();
 for(const [from,to] of moves){try{g.move({from,to})}catch{}}
 assert.equal(promotionRequired(Chess,s,'a2','a8'),false);
 const board=chessBoardView(s,0,Chess);
 assert.ok(board.includes('chess-board'));
 assert.ok(board.includes('data-square="e2"'));
 assert.ok(legalMoves(Chess,s,'e2').some(m=>m.to==='e4'));
});
test('draw offer, decline, mutual acceptance and rematch swap colors',()=>{
 let s=startChess('classic',100);
 s=next(s,0,'chess-offer',{offer:'draw'});
 assert.equal(s.offer.from,0);
 assert.equal(next(s,0,'chess-accept'),null);
 s=next(s,1,'chess-decline');
 assert.equal(s.offer,null);
 s=next(s,1,'chess-offer',{offer:'draw'});
 s=next(s,0,'chess-accept');
 assert.equal(s.status,'finished');
 assert.match(s.result,/Draw/);
 assert.equal(next(s,0,'chess-rematch').ready[0],true);
 s=next(s,0,'chess-rematch');
 s=next(s,1,'chess-rematch');
 assert.equal(s.status,'playing');
 assert.equal(s.white,1);
 assert.equal(s.turn,1);
 assert.equal(s.moves.length,0);
});
test('takeback requires other player consent and restores turn',()=>{
 let s=startChess('classic',100);
 s=move(s,0,'e2','e4');
 s=next(s,0,'chess-offer',{offer:'takeback'});
 assert.equal(next(s,0,'chess-accept'),null);
 s=next(s,1,'chess-accept');
 assert.equal(s.moves.length,0);
 assert.equal(s.turn,0);
 assert.equal(chessInstance(Chess,s).get('e2').type,'p');
});
test('resignation, increment and clock timeouts work',()=>{
 let s=startChess('blitz',10000);
 s=move(s,0,'e2','e4','q',12000);
 assert.equal(s.clocks[0],180000);
 assert.equal(s.clocks[1],180000);
 s=next(s,1,'chess-resign',{},12000);
 assert.match(s.result,/White wins/);
 let x=startChess('blitz',10000);
 assert.equal(clockNow(x,30000)[0],160000);
 assert.equal(next(x,0,'chess-tick',{},30000),null);
 x=next(x,0,'chess-tick',{},300000);
 assert.match(x.result,/Black wins on time/);
});
test('chess integrates with arcade reducer and snapshots',()=>{
 registerChessRules(Chess);
 let s=fresh();
 s=reduce(s,{type:'start',game:'chess',epoch:0,round:1},0);
 assert.ok(s?.chess);
 assert.equal(s.chess.moves.length,0);
 s=reduce(s,{type:'chess-move',from:'e2',to:'e4',epoch:s.epoch,round:s.round},0);
 assert.equal(s.chess.moves[0].san,'e4');
 assert.equal(viewForSeat(s,1).chess.moves[0].clockBefore,undefined);
 assert.equal(reduce(s,{type:'chess-move',from:'g1',to:'f3',epoch:s.epoch,round:s.round},0),null);
 const old=s.rev;
 s=reduce(s,{type:'lobby',epoch:s.epoch,round:s.round},1);
 assert.equal(s.game,null);
 assert.ok(s.rev>old);
});
