import {CONTROLS,chessInstance,clockNow,chessPgn} from './chess.mjs';
const P={
 w:{p:'♙',r:'♖',n:'♘',b:'♗',q:'♕',k:'♔'},
 b:{p:'♟',r:'♜',n:'♞',b:'♝',q:'♛',k:'♚'}
};
const N={p:'Pawn',r:'Rook',n:'Knight',b:'Bishop',q:'Queen',k:'King'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const formatClock=ms=>{const seconds=Math.max(0,Math.ceil(ms/1000));const m=Math.floor(seconds/60);const s=seconds%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};
export function chessBoardView(s,seat,Chess,selection=null,flip=false,pending=null){
 if(!s||!Chess)return '<div class="waiting">Preparing the chess engine…</div>';
 const g=chessInstance(Chess,s);if(!g)return '<div class="waiting">Chess position could not be loaded.</div>';
 const mine=seat===s.turn,white=seat===s.white;
 const whiteBottom=flip?!white:white;
 const ranks=whiteBottom?[8,7,6,5,4,3,2,1]:[1,2,3,4,5,6,7,8];
 const files=whiteBottom?'abcdefgh':'hgfedcba';
 const legal=mine&&s.status==='playing'&&selection?g.moves({square:selection,verbose:true}).map(x=>x.to):[];
 const checkSquare=s.check?g.board().flat().find(p=>p?.type==='k'&&p.color===g.turn())?.square:null;
 const board=ranks.map((rank,r)=>files.split('').map((file,c)=>{
  const sq=file+rank,piece=g.get(sq),light=(file.charCodeAt(0)-97+rank)%2!==0;
  const selected=sq===selection,target=legal.includes(sq),last=s.lastMove&&(s.lastMove.from===sq||s.lastMove.to===sq),check=sq===checkSquare;
  const type=piece?N[piece.type]+' · '+(piece.color==='w'?'White':'Black'):'Empty';
  const allow=mine&&s.status==='playing'&&piece?.color===(white?'w':'b');
  return '<button type="button" class="chess-square '+(light?'light':'dark')+(selected?' selected':'')+(last?' last-move':'')+(check?' checked':'')+(target?' legal-target':'')+'" data-square="'+sq+'" aria-label="'+sq+' '+type+(target?', legal destination':'')+'" aria-pressed="'+selected+'" draggable="'+(allow?'true':'false')+'" tabindex="0">'+
   (c===0?'<span class="coordinate rank">'+rank+'</span>':'')+
   (r===7?'<span class="coordinate file">'+file+'</span>':'')+
   (piece?'<span class="chess-piece '+(piece.color==='w'?'white-piece':'black-piece')+'" aria-hidden="true">'+P[piece.color][piece.type]+'</span>':'')+
   (target?'<span class="move-dot '+(piece?'capture':'')+'" aria-hidden="true"></span>':'')+'</button>';
 }).join('')).join('');
 const visible=clockNow(s);
 const whiteClock=visible[s.white],blackClock=visible[1-s.white];
 const myClock=white?whiteClock:blackClock,opponentClock=white?blackClock:whiteClock;
 const meLabel=white?'White':'Black',opponentLabel=white?'Black':'White';
 const last=s.moves.at(-1);
 const sanRows=[];
 for(let i=0;i<s.moves.length;i+=2)sanRows.push('<div class="move-row"><span class="move-no">'+(Math.floor(i/2)+1)+'.</span><span>'+esc(s.moves[i].san)+'</span><span>'+esc(s.moves[i+1]?.san||'')+'</span></div>');
 const result=s.status==='finished'?'<div class="chess-result"><b>♛ Game finished</b><p>'+esc(s.result)+'</p><small>Ready for a rematch? Both players must agree.</small></div>':'';
 const offer=s.offer?'<div class="chess-offer"><b>'+esc(s.offer.kind==='draw'?'½ Draw offered':'↩ Takeback requested')+'</b><p>'+esc(s.offer.from===seat?'Waiting for your partner to respond.':'Your partner sent a request.')+'</p>'+
  (s.offer.from!==seat?'<div class="chess-toolbar"><button class="chess-small accent" data-chess-action="chess-accept">Accept</button><button class="chess-small" data-chess-action="chess-decline">Decline</button></div>':'')+'</div>':'';
 const statusText=s.status==='finished'?s.result:s.check?'Check! '+(mine?'Protect your king.':'Your partner is in check.'):(mine?'Your move.':'Waiting for your partner.');
 const myTimeClass=s.turn===seat&&s.status==='playing'?' active':'';
 const themTimeClass=s.turn!==seat&&s.status==='playing'?' active':'';
 return '<div class="chess-layout"><div class="chess-play">'+
 '<div class="chess-playerstrip"><div class="chess-avatar opponent">♛</div><div class="chess-playername"><b>Opponent</b><small>'+opponentLabel+'</small></div><span class="chess-clock'+themTimeClass+'" data-chess-clock="'+(white?1:0)+'">'+(s.mode==='classic'?'∞':formatClock(opponentClock))+'</span></div>'+
 '<div class="chess-board-wrap"><div class="chess-board" role="group" aria-label="Chess board, '+(whiteBottom?'white':'black')+' pieces at bottom">'+board+'</div></div>'+
 '<div class="chess-playerstrip"><div class="chess-avatar me">♚</div><div class="chess-playername"><b>You</b><small>'+meLabel+'</small></div><span class="chess-clock'+myTimeClass+'" data-chess-clock="'+(white?0:1)+'">'+(s.mode==='classic'?'∞':formatClock(myClock))+'</span></div>'+
 '<div class="chess-status" role="status"><span class="chess-status-icon">♞</span><span>'+esc(statusText)+'</span></div>'+
 '</div><aside class="chess-sidebar"><div class="chess-side-header"><span class="eyebrow">CHESS ROYALE</span><h3>One board. Two hearts.</h3><p>Classic rules, real competition, same date night.</p></div>'+
 '<div class="chess-settings"><label for="chess-time">Time control</label><select id="chess-time" '+(s.moves.length||s.status!=='playing'?'disabled':'')+'>'+Object.entries(CONTROLS).map(([k,v])=>'<option value="'+k+'" '+(s.mode===k?'selected':'')+'>'+v.name+'</option>').join('')+'</select><small>Changing the clock resets the board before the first move.</small></div>'+
 '<div class="chess-moves"><div class="chess-move-title"><b>Moves</b><span>'+s.moves.length+' plies</span></div><div class="move-list" id="chessMoves">'+(sanRows.join('')||'<p class="chess-empty">The opening move is yours…</p>')+'</div></div>'+
 result+offer+
 '<div class="chess-actions"><button data-chess-action="flip" class="chess-small">⇅ Flip board</button><button data-chess-action="pgn" class="chess-small" '+(!s.moves.length?'disabled':'')+'>↧ Copy PGN</button>'+
 (s.status==='finished'?'<button data-chess-action="chess-rematch" class="chess-small accent" '+(s.ready[seat]?'disabled':'')+'>'+(s.ready[seat]?'Waiting for rematch…':'♥ Rematch')+'</button>':
 '<button data-chess-action="chess-offer" data-offer="draw" class="chess-small" '+(s.offer?'disabled':'')+'>½ Offer draw</button>'+
 '<button data-chess-action="chess-offer" data-offer="takeback" class="chess-small" '+(!s.moves.length||s.offer?'disabled':'')+'>↩ Takeback</button>'+
 '<button data-chess-action="chess-resign" class="chess-small danger">⚑ Resign</button>')+'</div>'+
 '<p class="fineprint">Legal moves, castling, en passant, promotion and checkmate validated by chess.js. Time is tracked by the room host.</p></aside></div>'+
 (pending?'<div class="chess-promotion" role="dialog" aria-modal="true" aria-label="Choose pawn promotion"><div class="promotion-box"><h3>Promote your pawn</h3><p>Choose your new piece</p><div class="promotion-choices">'+['q','r','b','n'].map(k=>'<button type="button" data-promote="'+k+'" aria-label="Promote to '+N[k]+'">'+P[white?'w':'b'][k]+'</button>').join('')+'</div><button class="chess-small" data-chess-action="cancel-promotion">Cancel</button></div></div>':'');
}
export function legalMoves(Chess,s,square){
 const game=chessInstance(Chess,s);if(!game)return [];
 return game.moves({square,verbose:true});
}
export function promotionRequired(Chess,s,from,to){
 return legalMoves(Chess,s,from).some(m=>m.to===to&&m.flags.includes('p'));
}
export function pgnOf(Chess,s){return chessPgn(Chess,s)}
