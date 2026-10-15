import {PROMPTS,BOTTLE,ESCAPE,DATE_STAGES} from './couples-games.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&#39;'}[c]));
const btn=(a,text,cls='secondary',extra='')=>'<button class="'+cls+'" data-couple-action="'+a+'" '+extra+'>'+text+'</button>';
const alone=(text)=>'<div class="waiting">'+esc(text)+'</div>';
const ready=(s,seat,action='ready')=>s.ready[seat]?alone('Waiting for your partner to continue…'):btn(action,'Continue together →','primary');
const S=(title,kicker,body)=>'<section class="couple-surface"><span class="eyebrow pink">'+kicker+'</span><h2>'+title+'</h2>'+body+'</section>';
function pictionary(s,seat){
 const mine=s.drawer===seat;
 const strokes=s.strokes.map(st=>'<polyline points="'+st.points.map(p=>(p[0]*800).toFixed(1)+','+(p[1]*520).toFixed(1)).join(' ')+'" fill="none" stroke="'+st.color+'" stroke-width="'+st.width+'" stroke-linecap="round" stroke-linejoin="round"/>').join('');
 const drawing='<div class="draw-wrap"><svg id="loveCanvas" role="img" aria-label="Shared Pictionary drawing canvas" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet"><rect x="0" y="0" width="800" height="520" fill="#fff9f6"/>'+strokes+'</svg></div>';
 const msg=s.phase==='reveal'?'The word was '+PROMPTS[s.index]+'!':mine?'Draw the clue, without spelling the answer.':'Guess the secret picture from the canvas.';
 const prompt=mine&&s.phase==='draw'?'<div class="secret-prompt">YOUR PRIVATE WORD <strong>'+esc(PROMPTS[s.index])+'</strong></div>':'';
 const tools=mine&&s.phase==='draw'?'<div class="draw-tools"><span>Brush:</span>'+['#37253e','#ff89ba','#ffc47b','#aa96ff','#8fe3c0'].map(c=>'<button class="ink-choice" data-ink="'+c+'" style="--ink:'+c+'" aria-label="Choose '+c+' pen color"></button>').join('')+'<select id="brushSize" aria-label="Brush size"><option value="3">Fine</option><option value="6" selected>Normal</option><option value="10">Bold</option><option value="15">Extra bold</option></select>'+btn('clear','Clear canvas')+'</div>':'';
 const guesses='<div class="guess-log"><b>Guesses</b>'+(s.guesses.length?s.guesses.slice(-5).map(x=>'<p>'+esc(x.value)+(x.correct?' ✅':'')+'</p>').join(''):'<p>Waiting for the first guess…</p>')+'</div>';
 const guessForm=!mine&&s.phase==='draw'?'<form id="guessForm" class="couple-form"><label for="guessInput">What is your partner drawing?</label><input id="guessInput" maxlength="60" autocomplete="off" placeholder="Enter your guess">'+btn('guess','Send guess','primary')+'</form>':'';
 return S('Love Pictionary','ROUND '+s.round+' · '+(mine?'YOU DRAW':'YOU GUESS'),'<div class="couple-topline"><span class="turnchip">'+(mine?'Your drawing turn':'Your guessing turn')+'</span><strong>Score: '+s.score[0]+' – '+s.score[1]+'</strong><span id="pictionaryClock" class="turnchip">01:30</span></div><p class="subtitle">'+esc(msg)+'</p>'+prompt+tools+drawing+guessForm+guesses+(s.phase==='reveal'?'<div class="gameactions">'+ready(s,seat)+'</div>':mine?'<div class="gameactions">'+btn('pass','Reveal / Skip','secondary')+'</div>':''));
}
function xoxo(s,seat){
 const done=s.status!=='play';
 const result=s.status==='draw'?'It is a draw!':s.winner===seat?'You won! ✨':'Your partner won this round 💗';
 return S('XOXO Battle','ROUND '+s.round+' · HEARTS VS KISSES','<div class="xoxo-tally">Player 1: '+s.score[0]+' <span>♡ vs ×</span> Player 2: '+s.score[1]+'</div><p class="subtitle">'+(done?result:s.turn===seat?'Your turn — place your '+(seat===0?'♡':'×'):'Waiting for your partner to play…')+'</p><div class="xoxo-grid" role="group" aria-label="Tic tac toe board">'+s.board.map((x,i)=>'<button data-xoxo="'+i+'" aria-label="Square '+(i+1)+(x!==null?' occupied':' empty')+'" '+(done||s.turn!==seat||x!==null?'disabled':'')+' class="xoxo-cell '+(x===0?'heart':x===1?'kiss':'')+'">'+(x===0?'♡':x===1?'×':'')+'</button>').join('')+'</div>'+(done?'<div class="gameactions">'+ready(s,seat)+'</div>':''));
}
function bottle(s,seat){
 const mine=s.turn===seat,task=s.index>=0?BOTTLE[s.category][s.index]:'';
 return S('Spin the Love Bottle','ROUND '+s.round+' · '+(mine?'YOUR TURN':'PARTNER TURN'),'<div class="bottle-stage"><div class="bottle-ring"><div class="bottle-needle" style="transform:translate(-50%,-50%) rotate('+s.angle+'deg)">➤</div><span>♡</span></div></div><p class="subtitle">'+(s.phase==='spin'?'Choose a mood and spin the bottle.':s.phase==='review'?'Waiting for task approval.':'Complete your romantic challenge!')+'</p>'+
 (s.phase==='spin'&&mine?'<div class="bottle-categories">'+Object.keys(BOTTLE).map(k=>btn('spin',k.charAt(0).toUpperCase()+k.slice(1),'choice','data-mood="'+k+'"')).join('')+'</div>':
 s.phase==='spin'?alone('Your partner is choosing a challenge…'):
 '<div class="bottle-task"><small>'+esc(s.category.toUpperCase())+'</small><h3>'+esc(task)+'</h3></div>'+
 (s.phase==='task'?(mine?'<div class="gameactions">'+btn('done','I completed it','primary')+btn('pass','Skip safely')+'</div>':alone('Your partner is completing the challenge…')):
 mine?alone('Waiting for partner approval.'): '<div class="gameactions">'+btn('approve','Approve & change turn','primary')+btn('retry','Try again')+'</div>')));
}
function escapeGame(s,seat){
 if(s.phase==='complete')return S('Together We Escape','ALL FOUR ROOMS CLEARED','<div class="co-op-win">🔓 You escaped together! 💕</div><p>Working together opened every door.</p><div class="gameactions">'+ready(s,seat,'replay')+'</div>');
 const r=ESCAPE[s.room],solved=s.phase==='solved';
 return S('Together We Escape','ROOM '+(s.room+1)+' / '+ESCAPE.length,'<div class="escape-progress">'+ESCAPE.map((_,i)=>'<span class="'+(i<s.room?'solved':i===s.room?'active':'')+'"></span>').join('')+'</div><div class="escape-scene"><span aria-hidden="true">🔐</span><h3>'+esc(r.title)+'</h3><p>'+esc(r.story)+'</p></div>'+
 '<div class="private-clue"><span>🔎 YOUR PRIVATE CLUE</span><p>'+esc(r.clues[seat])+'</p><small>Talk to your partner to combine your clues.</small></div>'+
 (s.hints>0?'<div class="feedback">Hint: '+esc(r.hint)+'</div>':'')+
 (solved?'<div class="co-op-win">✓ Puzzle solved! Continue when both of you are ready.</div><div class="gameactions">'+ready(s,seat)+'</div>':
 '<form id="escapeForm" class="couple-form"><label for="escapeAnswer">Enter the secret code or word</label><input id="escapeAnswer" autocomplete="off" maxlength="20" placeholder="Your combined answer">'+btn('guess','Unlock door','primary')+'</form><div class="gameactions">'+btn('hint','Get a hint','secondary',s.hints>=3?'disabled':'')+'</div>'+(s.lastGuess?'<p class="fineprint">Last try: '+esc(s.lastGuess)+' · '+s.tries+' attempts</p>':'')));
}
function date(s,seat){
 if(s.phase==='complete'){const itinerary=s.itinerary.map((entry,i)=>{const v=DATE_STAGES[i];return '<div class="date-itinerary"><b>'+esc(v.title)+'</b><span>You: '+esc(v.choices[entry.choices[seat]])+'<br>Your partner: '+esc(v.choices[entry.choices[1-seat]])+'</span></div>'}).join('');
  return S('Our Dream Date','YOUR DATE IS READY','<div class="date-complete">💕 Made for just you two.</div>'+itinerary+'<div class="gameactions">'+ready(s,seat,'replay')+'</div>')}
 const stage=DATE_STAGES[s.stage],mine=s.choices[seat],revealed=s.phase==='reveal';
 return S('Dream Date Builder','CHAPTER '+(s.stage+1)+' / '+DATE_STAGES.length,'<h3>'+esc(stage.title)+'</h3><p class="subtitle">Make a secret choice, then reveal both picks together.</p>'+
 (revealed?'<div class="date-reveal"><div><small>YOU PICKED</small><strong>'+esc(stage.choices[s.choices[seat]])+'</strong></div><div><small>YOUR PARTNER PICKED</small><strong>'+esc(stage.choices[s.choices[1-seat]])+'</strong></div></div><div class="gameactions">'+ready(s,seat)+'</div>':
 mine!==null?alone('Your choice is locked. Waiting for your person…'):
 '<div class="date-grid">'+stage.choices.map((c,i)=>'<button class="date-option" data-date="'+i+'"><span>0'+(i+1)+'</span>'+esc(c)+'</button>').join('')+'</div>'));
}
export function renderCouple(game,seat){if(!game)return '';switch(game.type){case 'pictionary':return pictionary(game,seat);case 'xoxo':return xoxo(game,seat);case 'bottle':return bottle(game,seat);case 'escape':return escapeGame(game,seat);case 'date':return date(game,seat);default:return ''}}
