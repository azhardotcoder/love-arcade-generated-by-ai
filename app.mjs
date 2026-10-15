import {GAMES,QUESTIONS,RATHER,fresh,reduce,viewForSeat,registerChessRules} from './engine.mjs';
import {chessLibrary,clockNow} from './chess.mjs';
import {chessBoardView,legalMoves,promotionRequired,pgnOf,formatClock} from './chess-ui.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svg=n=>'<svg><use href="#icon-'+n+'"/></svg>';
const uid=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
const stamp=()=>Date.now();
const session=(()=>{try{let s=sessionStorage.getItem('love-arcade-session');if(!s){s=uid();sessionStorage.setItem('love-arcade-session',s)}return s}catch{return uid()}})();
let peer=null,conn=null,host=false,active=false,connected=false,room='',name='',partner='Your partner',guestSession='',lastSeen=0,presenceAway=false,joinCount=0,connecting=false,blocked=false,signalReady=false,S=fresh();
let lastCelebrateEpoch='',lastExperienceSignature='',messages=[],messageIds=new Set(),unread=0,drafts={},hideTimer=null,retryTimer=null,connectionTimer=null,pingTimer=null,toastTimer=null,chatTypingTimer=null,lastTyping=0,closed=false;
let call=null,stream=null,voice='off',voiceId='',voiceToken=0,micMuted=false,soundMuted=false,partnerMicMuted=false,playbackBlocked=false,callStarted=0,callTimeout=null,voiceClock=null;
const audio=$('remoteaudio');
let ChessCtor=null,chessSelection=null,chessPromotion=null,chessFlip=false,chessLoading=null,chessLastEpoch=-1,chessLastWhite=-1,hostClockOffset=0;
const online=()=>active&&connected&&conn?.open&&navigator.onLine&&stamp()-lastSeen<17000&&!closed;
const send=d=>{try{if(conn?.open){conn.send({v:2,...d});return true}}catch{}return false};
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3600)}
function modal(title,text,confirm,label='Continue'){$('dialogtitle').textContent=title;$('dialogbody').textContent=text;const a=$('dialogactions');a.replaceChildren();if(confirm){const b=document.createElement('button');b.className='secondary';b.textContent='Cancel';b.onclick=()=>$('dialog').close();a.appendChild(b)}const y=document.createElement('button');y.className='primary';y.textContent=confirm?label:'Got it';y.onclick=()=>{$('dialog').close();confirm?.()};a.appendChild(y);$('dialog').showModal()}
async function loadChess(){
 if(ChessCtor)return ChessCtor;
 if(chessLoading)return chessLoading;
 chessLoading=chessLibrary().then(({Chess})=>{
  ChessCtor=Chess;registerChessRules(Chess);
  chessLoading=null;
  if(S.game==='chess')renderGame();
  return Chess;
 }).catch(e=>{chessLoading=null;toast('Unable to load chess rules. Try again with internet.');throw e});
 return chessLoading;
}
async function startSelectedGame(type){
 if(type==='chess'){
  try{await loadChess()}catch{return}
  if(!active||!online())return;
 }
 chessSelection=null;chessPromotion=null;chessFlip=false;act({type:'start',game:type});
}
function chessAttempt(from,to){
 if(!ChessCtor||!online()||S.game!=='chess'||S.chess.status!=='playing')return;
 if(S.chess.turn!==(host?0:1))return;
 const moves=legalMoves(ChessCtor,S.chess,from).filter(m=>m.to===to);
 if(!moves.length)return;
 if(promotionRequired(ChessCtor,S.chess,from,to)){chessPromotion={from,to};renderGame();return}
 chessSelection=null;act({type:'chess-move',from,to,promotion:'q'});
}
function chessPickSquare(sq){
 if(!ChessCtor||S.game!=='chess'||!online()||S.chess.status!=='playing'||S.chess.turn!==(host?0:1))return;
 const g=new ChessCtor(S.chess.fen),piece=g.get(sq);
 const color=(host?0:1)===S.chess.white?'w':'b';
 if(chessSelection===sq){chessSelection=null;renderGame();return}
 if(chessSelection&&legalMoves(ChessCtor,S.chess,chessSelection).some(m=>m.to===sq)){chessAttempt(chessSelection,sq);return}
 chessSelection=piece&&piece.color===color?sq:null;
 renderGame();
}
function chessClipboard(){
 if(!ChessCtor||!S.chess)return;
 const pgn=pgnOf(ChessCtor,S.chess);
 if(!pgn)return;
 navigator.clipboard?.writeText(pgn).then(()=>toast('Chess PGN copied!')).catch(()=>modal('Your chess PGN',pgn));
}
function chessClockUpdate(){
 if(!active||S.game!=='chess'||!S.chess)return;
 const c=S.chess;
 if(c.status==='playing'&&c.mode!=='classic'&&host&&online()&&clockNow(c)[c.turn]<=0){
  act({type:'chess-tick'});return;
 }
 const current=clockNow(c,stamp()+(host?0:hostClockOffset));
 document.querySelectorAll('[data-chess-clock]').forEach(el=>{
  const seat=Number(el.dataset.chessClock);
  const v=current[seat];
  el.textContent=c.mode==='classic'?'∞':formatClock(v);
  el.classList.toggle('low',c.mode!=='classic'&&c.status==='playing'&&c.turn===seat&&v<30000);
 });
}
function busy(v){$('create').disabled=v;$('join').disabled=v;$('create').textContent=v?'Connecting...':'Create our room →'}
function codegen(){const abc='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.getRandomValues(new Uint8Array(12)),v=>abc[v%abc.length]).join('')}
function extractCode(value){try{if(value.includes('://')){const u=new URL(value);value=new URLSearchParams(u.hash.slice(1)).get('room')||u.searchParams.get('room')||''}}catch{}return value.trim().replace(/[\s-]/g,'').toUpperCase()}
function create(isHost){if(active)return;if(!window.Peer){$('entryerror').textContent='The connection library has not loaded. Check your connection and refresh.';return}name=$('nickname').value.trim().slice(0,24)||'Sweetheart';try{localStorage.setItem('la-name',name)}catch{}room=isHost?codegen():extractCode($('roominput').value);if(!/^[A-Z0-9]{12}$/.test(room)){$('entryerror').textContent='Enter a 12-character room code or paste the latest invite link.';return}
host=isHost;active=true;connected=false;connecting=false;blocked=false;closed=false;partner='Your partner';guestSession='';joinCount=0;S=fresh();messages=[];messageIds=new Set();drafts={};unread=0;signalReady=false;busy(true);$('entryerror').textContent='';
const p=new Peer(host?'love-arcade-v2-'+room:undefined,{debug:0});peer=p;
connectionTimer=setTimeout(()=>{if(peer===p&&!p.open){leave(false);$('entryerror').textContent='Could not reach the multiplayer service. Please try again.'}},19000);
p.on('open',()=>{if(!active||peer!==p)return;clearTimeout(connectionTimer);signalReady=true;busy(false);$('welcome').hidden=true;$('room').hidden=false;$('dock').hidden=false;render();if(!host)join()});
p.on('connection',c=>{if(!host||!active){c.on('open',()=>{c.send({v:2,type:'denied',reason:'Room is not available.'});c.close()});return}const m=c.metadata||{};const same=m.session===guestSession;if(m.protocol!==2||!(/^[a-f0-9]{32}$/.test(m.session||''))||(guestSession&&!same)||(conn?.open&&stamp()-lastSeen<17000)){c.on('open',()=>{c.send({v:2,type:'denied',reason:guestSession?'Room is full. Only the original partner can reconnect.':'Update both browsers and rejoin.'});setTimeout(()=>c.close(),200)});return}partner=String(m.name||'Sweetheart').slice(0,24);guestSession=m.session;bind(c)});
p.on('call',c=>{if(voice==='connecting'&&c.metadata?.id===voiceId&&c.peer===conn?.peer&&stream){wireCall(c);c.answer(stream)}else c.close()});
p.on('disconnected',()=>{signalReady=false;presence();if(active&&navigator.onLine){setTimeout(()=>{if(peer===p&&p.disconnected&&!p.destroyed){try{p.reconnect()}catch{}}},2500)}});
p.on('error',e=>{if(!active||peer!==p)return;if(e.type==='peer-unavailable'&&!host){connecting=false;clearTimeout(connectionTimer);toast('Host not found yet. Check your code and keep the host page open.');scheduleJoin()}else if(e.type==='unavailable-id'){toast('This room code is already in use. Leave and make another room.')}else{toast('Connection issue. Try changing Wi-Fi or mobile data.');if(!host)scheduleJoin()}});
}
function join(){if(!active||host||connecting||conn?.open||blocked||!peer?.open||!navigator.onLine)return;connecting=true;joinCount++;const c=peer.connect('love-arcade-v2-'+room,{reliable:true,metadata:{protocol:2,session,name}});bind(c);clearTimeout(connectionTimer);connectionTimer=setTimeout(()=>{if(conn===c&&!connected){connecting=false;c.close();scheduleJoin()}},14000)}
function scheduleJoin(){if(!host&&active&&!blocked&&joinCount<5){clearTimeout(retryTimer);retryTimer=setTimeout(join,3500)}}
function bind(c){if(conn&&conn!==c)conn.close();conn=c;connected=false;c.on('open',()=>{if(!active||conn!==c)return;lastSeen=stamp();connecting=false;clearTimeout(connectionTimer);if(host){connected=true;send({type:'welcome',name,state:viewForSeat(S,1),messages:messages.slice(-80)});toast(partner+' joined your room.');addSystem(partner+' joined the room.')}send({type:'ping',away:document.hidden});resendPendingMessages();render()});c.on('data',d=>{if(!active||conn!==c||!d||d.v!==2||typeof d.type!=='string')return;try{if(JSON.stringify(d).length>50000)return}catch{return}lastSeen=stamp();receive(d)});c.on('close',()=>{if(conn!==c||!active)return;conn=null;connected=false;connecting=false;stopVoice(false);addSystem(partner+' went offline.');presence();scheduleJoin()});c.on('error',()=>{if(conn!==c)return;conn=null;connected=false;connecting=false;stopVoice(false);presence();scheduleJoin()})}
function validState(s){return s&&Number.isInteger(s.rev)&&Number.isInteger(s.epoch)&&Number.isInteger(s.round)&&(s.game===null||Object.hasOwn(GAMES,s.game))&&[0,1].includes(s.turn)&&Array.isArray(s.answers)&&Array.isArray(s.ready)&&Array.isArray(s.board)&&Array.isArray(s.found)}
function receive(d){if(d.type==='welcome'&&!host&&validState(d.state)){connected=true;blocked=false;joinCount=0;S=d.state;if(S.game==='chess'&&!ChessCtor)loadChess().catch(()=>{});partner=String(d.name||'Sweetheart').slice(0,24);if(Array.isArray(d.messages)){messages=d.messages.filter(m=>m&&typeof m.text==='string'&&typeof m.id==='string').slice(-80);messageIds=new Set(messages.map(m=>m.id))}toast('Your partner is here!');render();return}
if(d.type==='denied'&&!host){blocked=true;connecting=false;toast(String(d.reason||'Room unavailable').slice(0,180));conn?.close();presence();return}
if(!connected)return;
if(d.type==='ping'){presenceAway=!!d.away;send({type:'pong',away:document.hidden,echo:d.sentAt||0,hostNow:stamp()});presence();return}
if(d.type==='pong'){presenceAway=!!d.away;if(!host&&Number.isFinite(d.hostNow)&&Number.isFinite(d.echo)&&d.echo>0){const end=stamp();const elapsed=Math.max(0,end-d.echo);if(elapsed<30000)hostClockOffset=d.hostNow+elapsed/2-end;}presence();return}
if(d.type==='sync'&&host){send({type:'snapshot',state:viewForSeat(S,1)});return}
if(d.type==='snapshot'&&!host&&validState(d.state)&&d.state.rev>=S.rev){const gained=d.state.hearts>S.hearts;S=d.state;if(S.game==='chess'&&!ChessCtor)loadChess().catch(()=>{});renderGame();presence();if(gained)celebrate();return}
if(d.type==='action'&&host&&online()){apply(d.action,1);return}
if(d.type==='left'){stopVoice(false);const c=conn;conn=null;connected=false;c?.close();if(host){guestSession='';partner='Your partner';S=fresh();messages=[];messageIds.clear();drafts={};toast('Your partner left. Their seat is now available.');render()}else{blocked=true;closed=true;toast('Your partner ended the room.');presence()}return}
if(d.type==='message'&&typeof d.text==='string'&&typeof d.id==='string'&&/^[a-f0-9]{32}$/.test(d.id)){
 if(messageIds.has(d.id)){send({type:'message-ack',id:d.id});return}
 const text=d.text.trim().slice(0,500);if(!text)return;
 messages.push({id:d.id,text,who:1-(host?0:1),time:stamp(),delivered:true});
 messageIds.add(d.id);trimMessages();send({type:'message-ack',id:d.id});
 if($('chatpanel').hidden)unread++;drawChat();return
}
if(d.type==='message-ack'&&typeof d.id==='string'){
 const m=messages.find(m=>m.id===d.id&&m.who===(host?0:1));
 if(m){m.delivered=true;drawChat()}return
}
if(d.type==='typing'){$('typing').textContent=partner+' is typing…';clearTimeout(chatTypingTimer);chatTypingTimer=setTimeout(()=>$('typing').textContent='',2500);return}
if(d.type.startsWith('voice-'))receiveVoice(d);
}
function trimMessages(){messages=messages.slice(-100);messageIds=new Set(messages.map(x=>x.id))}
function addSystem(text){messages.push({id:uid(),who:-1,text,time:stamp()});trimMessages();drawChat()}
function apply(action,seat){const next=reduce(S,action,seat);if(!next)return;const gained=next.hearts>S.hearts;S=next;send({type:'snapshot',state:viewForSeat(S,1)});if(S.game==='chess')chessSelection=null;renderGame();presence();if(gained)celebrate();clearTimeout(hideTimer);hideTimer=null;if(S.game==='match'&&S.open.length===2){const rev=S.rev;hideTimer=setTimeout(()=>{if(host&&online())apply({type:'hide',epoch:S.epoch,round:S.round,rev},0)},1400)}}
function act(a){if(!online()){toast('Wait until your partner is connected.');return}const data={epoch:S.epoch,round:S.round,...a};if(host)apply(data,0);else send({type:'action',action:data})}
function presence(){if(!active)return;const is=online();$('myname').textContent=name;$('myavatar').textContent=name[0]?.toUpperCase()||'Y';$('theirname').textContent=partner;$('theiravatar').textContent=connected||guestSession?partner[0]?.toUpperCase()||'?':'?';const myOnline=navigator.onLine;const myStatus=$('mystatus');const theirStatus=$('theirstatus');
 myStatus.className='presence-label '+(myOnline?'is-online':'is-offline');
 myStatus.textContent=myOnline?(document.hidden?'● Online · Away':'● Online'):'● Offline';
 const partnerState=is?'is-online':(connected||guestSession?'is-offline':'is-waiting');
 theirStatus.className='presence-label '+partnerState;
 theirStatus.textContent=is?(presenceAway?'● Online · Away':'● Online'):(connected||guestSession?'● Offline':'○ Waiting');$('hearts').textContent=S.hearts;$('roomcode').textContent=room.match(/.{1,4}/g).join(' ');$('connectionbanner').replaceChildren();let msg=!navigator.onLine?'You are offline. Games and chat are paused.':closed?'Host ended the room. Leave to start again.':!is?(host?'Waiting for your partner, or for them to reconnect.':'Partner offline or room unavailable.'):presenceAway?'Your partner switched tabs. Play resumes when they return.':'';if(msg){const t=document.createElement('span');t.textContent=msg;$('connectionbanner').append(t);if(!is&&!host&&!closed){const b=document.createElement('button');b.className='textbutton';b.textContent='Reconnect';b.onclick=()=>{joinCount=0;connecting=false;join()};$('connectionbanner').append(b)}}$('chatsend').disabled=!is;$('chatinput').disabled=!is;$('featured').disabled=!is;document.querySelectorAll('#gamecards button').forEach(b=>b.disabled=!is);const field=$('gamefield');if(field)field.disabled=!is;refreshVoice();updateExperience()}
function updateExperience(){
 if(!active)return;
 const ready=online();
 const guide=$('roomGuide');
 if(guide){
  guide.classList.toggle('is-ready',ready);
  $('guideKicker').textContent=ready?'02 / READY TO PLAY':guestSession?'01 / RECONNECTING':'01 / INVITE YOUR PERSON';
  $('guideTitle').textContent=ready?'Both hearts are here. Your date can begin.':guestSession?'A little pause. Your person can reconnect.':'You made it. Now invite your person.';
  $('guideText').textContent=ready?'Choose any game below. Your chat and voice controls stay available.':guestSession?'Keep this tab open while your partner returns.':'Share your private room link and keep this tab open while they join.';
  $('guideShare').textContent=ready?'Copy invite ↗':'Invite player two ↗';
 }
 const status=$('gameStatus');
 if(S.game&&status){
  const seat=host?0:1,mine=S.turn===seat;
  let title='Your move',detail='Pick an action to continue.',symbol='✦',count='ROUND '+S.round;
  if(S.game==='chess'){const c=S.chess;title=c?.status==='finished'?'Match complete':c?.turn===seat?'Your move · Chess Royale':'Opponent thinking…';detail=c?.status==='finished'?c.result:c?.check?'Check! Protect your king.':'Tap a piece to see legal squares. You can also drag pieces.';symbol='♞';count='MOVE '+(Math.floor((c?.moves?.length||0)/2)+1)}
  else if(S.game==='truth'){
   if(S.phase==='choose'){title=mine?'Your turn: choose Truth or Dare':partner+' is choosing';detail=mine?'Pick your challenge. Your partner approves once it is done.':'Watch the next challenge appear on both screens.';symbol=mine?'♡':'◌'}
   else if(S.phase==='task'){title=mine?'Challenge in progress':partner+' is completing a challenge';detail=mine?'Answer by text, chat or voice, then tap completed.':'You will get the Approve / Try Again choice next.';symbol='✧'}
   else{title=mine?'Awaiting partner approval':'Your decision';detail=mine?'Your turn changes only after your partner approves.':'Approve the completed task or ask for another try.';symbol='✓'}
  }else if(['quiz','rather','notes'].includes(S.game)){
   if(S.phase==='reveal'){title='The reveal is here';detail=S.ready[seat]?'Waiting for your person to continue.':'See each answer, then tap Ready for next round.';symbol='♥'}
   else{title=S.answers[seat]!==null?'Your answer is locked':'Your secret turn';detail=S.answers[seat]!==null?'Waiting for your person to submit too.':'Both answers stay secret until you each finish.';symbol='✉'}
  }else if(S.game==='match'){title=S.phase==='win'?'You found every pair!':mine?'Your two-card turn':partner+' is finding a match';detail='Matched pairs stay visible. Misses pass the turn.';symbol='❖';count=S.found.length/2+' / 6 PAIRS'}
  const signature=[title,detail,count,S.epoch,S.round,S.phase,S.turn].join('|');
  if(lastExperienceSignature!==signature){
   status.innerHTML='<span class="status-symbol" aria-hidden="true">'+esc(symbol)+'</span><span class="status-copy"><b>'+esc(title)+'</b><small>'+esc(detail)+'</small></span><span class="status-count">'+esc(count)+'</span>';
   lastExperienceSignature=signature;
  }
  $('gameName').textContent=GAMES[S.game]?.title||'';
 }
}
function celebrate(){
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const el=$('celebration');el.replaceChildren();
 const tokens=['♥','✧','♡','✦','♥','♡'];
 tokens.forEach((c,i)=>{const span=document.createElement('span');span.className='burst';span.textContent=c;span.style.setProperty('--x',(Math.cos(i*Math.PI/3)*155)+'px');span.style.setProperty('--y',(Math.sin(i*Math.PI/3)*105-50)+'px');span.style.setProperty('--r',((i*44)-100)+'deg');span.style.color=i%2?'#ffd5a6':'#ff9ccf';el.append(span)});
 setTimeout(()=>el.replaceChildren(),1050);
}
function render(){ $('gamecards').innerHTML=Object.entries(GAMES).map(([id,g],i)=>'<button class="gamecard '+g.theme+'" data-game="'+id+'"><span class="tagline">0'+(i+1)+' / '+g.label+'</span><span class="arrow">↗</span><span class="art">'+g.icon+'</span><h3>'+g.title+'</h3><p>'+g.desc+'</p></button>').join('');renderGame();drawChat();presence();updateExperience()}
const button=(k,s,cl='primary',extra='')=>'<button class="'+cl+'" data-do="'+k+'" '+extra+'>'+s+'</button>';
function renderGame(){const g=S.game;$('lobby').hidden=!!g;$('game').hidden=!g;if(!g){$('gamebody').replaceChildren();return}if(g==='chess'&&!ChessCtor){$('gamebody').innerHTML='<div class="waiting">Loading professional chess engine…</div>';loadChess().catch(()=>{});return}const mine=S.turn===(host?0:1),seat=host?0:1;const old=$('response');if(old)drafts[old.dataset.key]=old.value;const key=S.epoch+'-'+S.round+'-'+S.phase;const ta=(label,max)=>'<label for="response">'+label+'</label><textarea id="response" data-key="'+key+'" maxlength="'+max+'" placeholder="Write something sweet...">'+esc(drafts[key]||'')+'</textarea>';let h='<div class="game-surface"><span class="eyebrow pink">'+GAMES[g].label+'</span><fieldset id="gamefield" '+(online()?'':'disabled')+'>';const who=mine?'Your turn':esc(partner)+"'s turn";$('roundlabel').textContent=g==='match'?'PAIRS '+S.found.length/2+' / 6':'ROUND '+String(S.round).padStart(2,'0');
if(g==='truth'){h+='<h2>Truth or Dare</h2><div class="turnline"><span class="turnchip '+(mine?'':'other')+'">'+who+'</span><span class="fineprint">Approval required before switching turns</span></div><div class="steps"><span class="'+(S.phase==='choose'?'active':'')+'">01 CHOOSE</span><span class="'+(S.phase==='task'?'active':'')+'">02 COMPLETE</span><span class="'+(S.phase==='approval'?'active':'')+'">03 APPROVE</span></div>';if(S.feedback)h+='<div class="feedback">'+esc(S.feedback)+'</div>';if(S.phase==='choose')h+=mine?'<p class="subtitle">Be honest, be brave, be you.</p><div class="choices">'+button('truth','♡ Truth<small>Open up a little.</small>','choice')+button('dare','✧ Dare<small>Make a little magic.</small>','choice')+'</div>':'<div class="waiting">Your partner is choosing Truth or Dare…</div>';else{h+='<span class="eyebrow pink">'+esc(S.kind.toUpperCase())+'</span><h2>'+esc(S.task)+'</h2>';if(S.reply)h+='<div class="answerbox"><small>THE ANSWER</small><p>'+esc(S.reply)+'</p></div>';if(S.phase==='task')h+=mine?ta('Optional: type your answer or use voice/chat',500)+'<div class="gameactions">'+button('complete','✓ I completed it')+button('skip','Skip (no penalty)','secondary')+'</div>':'<div class="waiting">'+esc(partner)+' is completing the task…</div>';else h+=mine?'<div class="waiting">Waiting for partner approval before turns switch.</div><div class="gameactions">'+button('skip','Skip instead','secondary')+'</div>':'<p class="subtitle">Did they complete the challenge?</p><div class="gameactions">'+button('approve','✓ Approve & switch turns')+button('retry','Try again','secondary')+'</div>'}h+='<p class="fineprint">You can always skip. There is never a penalty.</p>'}
if(['quiz','rather','notes'].includes(g)){const question=g==='quiz'?QUESTIONS[(S.round-1)%QUESTIONS.length]:g==='notes'?'Tell them something beautiful.':'What would you rather?';h+='<h2>'+esc(question)+'</h2><p class="subtitle">Both answers stay hidden until you each submit.</p>';if(S.phase==='reveal'){const options=g==='rather'?RATHER[(S.round-1)%RATHER.length]:null;h+='<p class="reveal-title">Two hearts, one reveal.</p>';for(const i of [seat,1-seat])h+='<div class="answerbox"><small>'+(i===seat?'YOU':esc(partner).toUpperCase())+'</small><p>'+esc(options?options[S.answers[i]]:S.answers[i])+'</p></div>';h+=S.ready[seat]?'<div class="waiting">Waiting for your partner to continue…</div>':button('next','Ready for next round')}else if(S.answers[seat]!==null)h+='<div class="waiting">Your answer is sealed. Waiting for your partner…</div>';else if(g==='rather')h+='<div class="choices">'+RATHER[(S.round-1)%RATHER.length].map((x,i)=>button('option',esc(x),'choice','data-value="'+i+'"')).join('')+'</div>';else h+=ta(g==='notes'?'Write your secret love note':'Share your answer',g==='notes'?1000:500)+button('answer',g==='notes'?'Seal my love note':'Lock my answer')}
if(g==='chess'){
 if(chessLastEpoch!==S.epoch||chessLastWhite!==S.chess.white){chessLastEpoch=S.epoch;chessLastWhite=S.chess.white;chessFlip=false;chessSelection=null;chessPromotion=null}
 $('gamebody').innerHTML=chessBoardView(S.chess,seat,ChessCtor,chessSelection,chessFlip,chessPromotion,stamp()+(host?0:hostClockOffset));
 updateExperience();chessClockUpdate();return;
}
if(g==='match'){h+='<h2>'+ (S.phase==='win'?'All hearts found. Together.':'Find all six perfect pairs.')+'</h2><div class="turnline"><span class="turnchip '+(mine?'':'other')+'">'+who+'</span></div><p class="subtitle">'+S.moves+' attempts · '+S.found.length/2+' pairs matched</p>';if(S.feedback)h+='<div class="feedback">'+esc(S.feedback)+'</div>';h+='<div class="memorygrid">'+S.board.map((x,i)=>'<button class="memorycard '+(S.found.includes(i)?'found revealed':S.open.includes(i)?'revealed':'')+'" data-do="flip" data-index="'+i+'" '+(!mine||S.open.length===2||S.open.includes(i)||S.found.includes(i)?'disabled':'')+' aria-label="Card '+(i+1)+'">'+(S.found.includes(i)||S.open.includes(i)?x:'♡')+'</button>').join('')+'</div>';if(S.phase==='win')h+=S.ready[seat]?'<div class="waiting">Waiting for partner to replay…</div>':button('replay','Play another round')}
$('gamebody').innerHTML=h+'</fieldset></div>';updateExperience();const el=$('response');if(el)el.addEventListener('input',()=>drafts[el.dataset.key]=el.value)}
function drawChat(){const log=$('chatlog');log.innerHTML=messages.length?messages.map(m=>m.who<0?'<div class="systemmsg">'+esc(m.text)+'</div>':'<div class="bubble '+(m.who===(host?0:1)?'mine':'')+'">'+esc(m.text)+'<small>'+(m.who===(host?0:1)?'You':esc(partner))+' · '+new Date(m.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+(m.who===(host?0:1)?' · '+(m.delivered?'Delivered':'Sent'):'')+'</small></div>').join(''):'<div class="chatempty">♡<p>A little hello goes a long way.<br>Your conversation starts here.</p></div>';log.scrollTop=log.scrollHeight;$('unread').hidden=unread===0;$('unread').textContent=unread}
function chatOpen(show){$('chatpanel').hidden=!show;$('chatbackdrop').hidden=!show;$('chatopen').setAttribute('aria-expanded',String(show));if(show){unread=0;drawChat();$('chatinput').focus()}else $('chatopen').focus()}
function postMessage(e){e.preventDefault();if(!online())return toast('Wait for your partner to reconnect.');
 const text=$('chatinput').value.trim().slice(0,500);if(!text)return;const id=uid();
 if(send({type:'message',id,text})){messages.push({id,who:host?0:1,text,time:stamp(),delivered:false});messageIds.add(id);trimMessages();$('chatinput').value='';drawChat()}
}
function resendPendingMessages(){
 if(!connected||!conn?.open)return;
 for(const m of messages.filter(x=>x.who===(host?0:1)&&x.delivered===false))
 send({type:'message',id:m.id,text:m.text});
}
async function copyInvite(){const link=location.origin+location.pathname+'#room='+room;try{await navigator.clipboard.writeText(link);toast('Invite copied. Send it to your partner!')}catch{modal('Copy this invite',link)}}
function leave(sendNotice=true){if(sendNotice)send({type:'left'});lastExperienceSignature='';active=false;connected=false;blocked=false;closed=false;stopVoice(false);clearTimeout(connectionTimer);clearTimeout(retryTimer);clearTimeout(hideTimer);peer?.destroy();peer=null;conn=null;S=fresh();messages=[];messageIds.clear();drafts={};guestSession='';partner='Your partner';$('welcome').hidden=false;$('room').hidden=true;$('dock').hidden=true;$('chatpanel').hidden=true;$('chatbackdrop').hidden=true;$('entryerror').textContent='';busy(false);history.replaceState(null,'',location.pathname);scrollTo({top:0,behavior:'instant'})}
function refreshVoice(){const states={off:'Voice is off',request:'Requesting microphone…',outgoing:'Ringing your partner…',incoming:'Incoming voice call',connecting:'Connecting voice…',connected:micMuted?'Your mic is muted':'Voice connected'};$('voicestate').textContent=states[voice];$('voicedot').className='voice-dot'+(voice==='connected'?' live':'');$('voicedetail').textContent=voice==='connected'?partnerMicMuted?'Partner mic muted':playbackBlocked?'Tap Sound to enable playback':'Live, private audio':voice==='off'?'Stay close, even from afar':'Microphone consent required';$('callbanner').hidden=voice!=='incoming';$('callinvite').textContent=partner+' wants to talk 💗';$('call').disabled=!online()||voice!=='off';$('hangup').disabled=voice==='off';$('mic').disabled=!(stream&&stream.getAudioTracks().some(track=>track.readyState==='live'));$('speaker').disabled=voice!=='connected';$('mic').setAttribute('aria-pressed',String(micMuted));$('speaker').setAttribute('aria-pressed',String(soundMuted));$('mic').innerHTML=svg(micMuted?'micoff':'mic')+'<span>'+(micMuted?'Unmute':'Mute')+'</span>';$('speaker').innerHTML=svg(soundMuted?'voloff':'volume')+'<span>'+(soundMuted?'Unmute':'Sound')+'</span>'}
function stopVoice(notify=true){if(notify&&voiceId)send({type:'voice-end',id:voiceId});voiceToken++;clearTimeout(callTimeout);const c=call;call=null;const s=stream;stream=null;s?.getTracks().forEach(t=>{t.onended=null;t.stop()});audio.pause();audio.srcObject=null;c?.close();voice='off';voiceId='';micMuted=false;soundMuted=false;partnerMicMuted=false;playbackBlocked=false;refreshVoice()}
async function microphone(){if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Microphone requires HTTPS and a supported browser');return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false})}
function attachMic(s){stream=s;micMuted=false;s.getAudioTracks().forEach(t=>{t.enabled=true;t.onended=()=>{if(stream===s)stopVoice(true)}})}
function timeoutVoice(){clearTimeout(callTimeout);const token=voiceToken;callTimeout=setTimeout(()=>{if(token===voiceToken&&voice!=='connected'){stopVoice(true);toast('Voice timed out. Try calling again.')}},30000)}
async function startVoice(){if(!online()||voice!=='off')return;voice='request';voiceId=uid();const token=++voiceToken;refreshVoice();try{const s=await microphone();if(token!==voiceToken||!online()){s.getTracks().forEach(t=>t.stop());return}attachMic(s);voice='outgoing';send({type:'voice-invite',id:voiceId});timeoutVoice();refreshVoice()}catch(e){stopVoice(true);toast(e.name==='NotAllowedError'?'Please allow microphone access in your browser.':'Cannot start microphone: '+e.message)}}
async function acceptVoice(){if(voice!=='incoming'||!online())return;voice='request';const token=++voiceToken;refreshVoice();try{const s=await microphone();if(token!==voiceToken||!online()){s.getTracks().forEach(t=>t.stop());return}attachMic(s);voice='connecting';send({type:'voice-accept',id:voiceId});timeoutVoice();refreshVoice()}catch(e){stopVoice(true);toast('Microphone permission is required for voice chat.')}}
function wireCall(c){call=c;c.on('stream',async remote=>{if(call!==c)return;clearTimeout(callTimeout);audio.srcObject=remote;audio.muted=soundMuted;voice='connected';try{await audio.play();playbackBlocked=false}catch{playbackBlocked=true}refreshVoice()});c.on('close',()=>{if(call===c)stopVoice(false)});c.on('error',()=>{if(call===c){stopVoice(true);toast('Audio failed. Try another network.') }})}
function receiveVoice(d){if(typeof d.id!=='string'||!/^[a-f0-9]{32}$/.test(d.id))return;if(d.type==='voice-invite'){if(voice!=='off'){
 if(voice==='outgoing'&&d.id<voiceId){stopVoice(false)}
 else {send({type:'voice-decline',id:d.id});return}
}
voiceId=d.id;voice='incoming';voiceToken++;timeoutVoice();refreshVoice();return}if(d.id!==voiceId)return;if(d.type==='voice-accept'&&voice==='outgoing'&&stream){voice='connecting';const c=peer.call(conn.peer,stream,{metadata:{id:voiceId}});if(c)wireCall(c);else{stopVoice(true);toast('Could not connect voice.')}refreshVoice();return}if(d.type==='voice-end'||d.type==='voice-decline'){stopVoice(false);toast('Voice call ended.');return}if(d.type==='voice-mute'){partnerMicMuted=!!d.value;refreshVoice()}}
try{$('nickname').value=localStorage.getItem('la-name')||''}catch{}const initial=new URLSearchParams(location.hash.slice(1)).get('room')||new URLSearchParams(location.search).get('room');if(initial)$('roominput').value=initial;
$('create').onclick=()=>create(true);$('join').onclick=()=>create(false);$('roominput').onkeydown=e=>{if(e.key==='Enter')create(false)};$('invite').onclick=copyInvite;
$('leave').onclick=()=>modal('Leave this room?',host?'You are hosting. Leaving ends this room for both players, including the call and chat.':'Your chat and game progress will clear from this device.',()=>leave(true),'Leave room');
$('help').onclick=()=>modal('How to play','Create a room and share the code with your partner. Both players must keep this page open. There are five games, a private session chat, and optional voice calling.\n\nYour partner must accept each voice call and give microphone permission. Rooms and chats are not saved. Your voice is never recorded by this app.\n\nA peer-to-peer connection may fail on restrictive Wi-Fi or mobile networks. Try another network if it does.');
$('rules').onclick=()=>modal(GAMES[S.game]?.title||'Game rules',({truth:'Choose Truth or Dare on your turn. Complete the task, then your partner approves or asks you to retry. Only approval changes turns. Skip freely.',quiz:'Both write answers privately and reveal together. Both must tap ready for the next round.',rather:'Both choose one of two romantic options secretly. Reveal your choices together.',notes:'Both write secret love notes that reveal together once submitted.',match:'Flip two cards on your turn. Matched pairs stay revealed; if they do not match, your partner takes over.'})[S.game]||'Pick a game.');
$('gamecards').onclick=e=>{const b=e.target.closest('[data-game]');if(b)startSelectedGame(b.dataset.game)};$('featured').onclick=()=>act({type:'start',game:'truth'});$('back').onclick=()=>modal('Return to games?','This resets the current game for both players. Your call and chat remain connected.',()=>act({type:'lobby'}),'Back to games');
$('gamebody').onclick=e=>{
 const promo=e.target.closest('[data-promote]');
 if(promo&&chessPromotion){const p=chessPromotion;chessPromotion=null;chessSelection=null;act({type:'chess-move',from:p.from,to:p.to,promotion:promo.dataset.promote});return}
 const chessAction=e.target.closest('[data-chess-action]');
 if(chessAction&&S.game==='chess'){
  const type=chessAction.dataset.chessAction;
  if(type==='flip'){chessFlip=!chessFlip;chessSelection=null;renderGame();return}
  if(type==='pgn'){chessClipboard();return}
  if(type==='cancel-promotion'){chessPromotion=null;renderGame();return}
  if(type==='chess-resign'){modal('Resign this chess match?','You will lose the game by resignation.',()=>act({type}),'Resign');return}
  if(type==='chess-rematch'){act({type});return}
  if(type==='chess-offer'){act({type,offer:chessAction.dataset.offer});return}
  if(type==='chess-accept'||type==='chess-decline'){act({type});return}
 }
 const square=e.target.closest('[data-square]');
 if(square&&S.game==='chess'){chessPickSquare(square.dataset.square);return}
 const b=e.target.closest('[data-do]');if(!b||b.disabled)return;const a=b.dataset.do;if(a==='truth'||a==='dare')act({type:'pick',kind:a});else if(a==='complete')act({type:'complete',value:$('response')?.value||''});else if(a==='answer'){const v=$('response')?.value.trim();if(!v)return toast('Write an answer first.');act({type:'answer',value:v})}else if(a==='option')act({type:'answer',value:Number(b.dataset.value)});else if(a==='flip')act({type:'flip',index:Number(b.dataset.index)});else if(['approve','retry','skip','next','replay'].includes(a))act({type:a})};
$('gamebody').addEventListener('change',e=>{
 if(e.target.id==='chess-time'&&S.game==='chess'&&online()){
  chessSelection=null;act({type:'chess-config',mode:e.target.value});
 }
});
$('gamebody').addEventListener('dragstart',e=>{
 const sq=e.target.closest('[data-square]');if(!sq||S.game!=='chess'||!ChessCtor||!online()||S.chess.turn!==(host?0:1)){e.preventDefault();return}
 const g=new ChessCtor(S.chess.fen),p=g.get(sq.dataset.square);
 if(!p||p.color!==((host?0:1)===S.chess.white?'w':'b')){e.preventDefault();return}
 e.dataTransfer.setData('text/plain',sq.dataset.square);e.dataTransfer.effectAllowed='move';
});
$('gamebody').addEventListener('dragover',e=>{if(e.target.closest('[data-square]')&&S.game==='chess')e.preventDefault()});
$('gamebody').addEventListener('drop',e=>{
 const sq=e.target.closest('[data-square]');if(!sq||S.game!=='chess')return;
 e.preventDefault();const from=e.dataTransfer.getData('text/plain');chessAttempt(from,sq.dataset.square);
});
$('chatopen').onclick=()=>chatOpen($('chatpanel').hidden);$('chatclose').onclick=()=>chatOpen(false);$('chatbackdrop').onclick=()=>chatOpen(false);$('guideShare').onclick=copyInvite;$('chatform').onsubmit=postMessage;$('chatinput').oninput=()=>{if(online()&&stamp()-lastTyping>1200){lastTyping=stamp();send({type:'typing'})}};
$('call').onclick=startVoice;$('hangup').onclick=()=>stopVoice(true);$('acceptcall').onclick=acceptVoice;$('declinecall').onclick=()=>{send({type:'voice-decline',id:voiceId});stopVoice(false)};$('mic').onclick=()=>{if(!stream||!stream.getAudioTracks().some(t=>t.readyState==='live'))return;micMuted=!micMuted;stream.getAudioTracks().filter(t=>t.readyState==='live').forEach(t=>t.enabled=!micMuted);send({type:'voice-mute',id:voiceId,value:micMuted});refreshVoice()};$('speaker').onclick=async()=>{if(voice!=='connected')return;if(playbackBlocked){try{await audio.play();playbackBlocked=false}catch{toast('Audio playback blocked in browser.')}}else{soundMuted=!soundMuted;audio.muted=soundMuted}refreshVoice()};
$('dialogclose').onclick=()=>$('dialog').close();window.addEventListener('offline',()=>{stopVoice(true);presence()});window.addEventListener('online',()=>{if(!host){connecting=false;joinCount=0;join()}presence()});document.addEventListener('visibilitychange',()=>{if(active){send({type:'ping',away:document.hidden});if(!document.hidden){send({type:'sync'});if(!host&&!conn?.open){connecting=false;join()}}presence()}});
window.addEventListener('pagehide',e=>{stopVoice(true);if(!e.persisted)peer?.destroy()});
window.addEventListener('pageshow',e=>{if(e.persisted&&active){if(peer?.disconnected&&!peer.destroyed){try{peer.reconnect()}catch{}}if(!host&&!conn?.open){connecting=false;join()}send({type:'sync'});presence()}});window.addEventListener('beforeunload',e=>{if(host&&active&&connected){e.preventDefault();e.returnValue=''}});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('chatpanel').hidden)chatOpen(false)});setInterval(()=>{if(active){send({type:'ping',away:document.hidden,sentAt:stamp()});presence();if(!host&&!conn?.open&&!connecting&&joinCount<5&&!blocked)join()}},4000);setInterval(chessClockUpdate,1000);refreshVoice();
