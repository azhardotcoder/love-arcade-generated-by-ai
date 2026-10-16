/* HeartSync and Touch the Same Star — accessible, mobile-first visual game screens. */
import {HEART_CATEGORIES,STAR_MODES,STAR_QUESTIONS,FEEL_STARS,FIND_STARS,CONSTELLATION_CHALLENGES} from './bond-games.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SKY_POINTS=[{x:17,y:32},{x:38,y:17},{x:62,y:35},{x:82,y:21},{x:49,y:76}];
const button=(action,label,cls='bond-button',extra='')=>'<button type="button" class="'+cls+'" data-bond-action="'+action+'" '+extra+'>'+label+'</button>';
const stepper=(current,total)=>'<div class="bond-progress" role="img" aria-label="Round '+(current+1)+' of '+total+'">'+Array.from({length:total},(_,i)=>'<span class="'+(i<current?'complete':i===current?'current':'')+'"></span>').join('')+'</div>';
const level=s=>s.type==='heartsync'?(s.phase==='summary'?'HEART REVEAL':s.index<3?'STAGE 1 · DISCOVER ME':'STAGE 2 · READ MY MIND'):'FIVE MOMENTS · ONE SKY';
function frame(s,title,subtitle,body){
 const limit=s.type==='heartsync'?10:5, idx=Math.min(s.index,limit-1);
 return '<section class="bond-surface '+(s.type==='stars'?'bond-stars':'bond-hearts')+'" data-bond-phase="'+s.phase+'"><div class="bond-head"><span class="bond-overline">'+level(s)+'</span><div class="bond-pill">'+(s.phase==='setup'?'TOGETHER':s.phase==='summary'?'YOUR STORY':(idx+1)+' / '+limit)+'</div></div>'+
 '<h2 class="bond-title">'+esc(title)+'</h2>'+(subtitle?'<p class="bond-subtitle">'+esc(subtitle)+'</p>':'')+(s.phase==='setup'||s.phase==='summary'?'':stepper(idx,limit))+body+'</section>';
}
function setup(s,seat){
 const heart=s.type==='heartsync';
 const list=heart?Object.entries(HEART_CATEGORIES):Object.entries(STAR_MODES);
 const selected=heart?s.category:s.mode;
 const cards='<div class="bond-setup-grid">'+list.map(([id,entry])=>
 '<button type="button" class="bond-mode '+(id===selected?'selected':'')+'" data-bond-action="configure" data-value="'+id+'" '+(seat!==0?'disabled':'')+' aria-pressed="'+(id===selected)+'"><span class="bond-mode-icon">'+esc(entry.icon)+'</span><b>'+esc(entry.title)+'</b><small>'+esc(entry.description)+'</small></button>').join('')+'</div>';
 return frame(s,heart?'HeartSync':'Touch the Same Star',
 heart?'Choose a mood for ten questions about who you are and what you wish for.':'Choose your night-sky experience. Your partner sees the same journey.',
 cards+'<div class="bond-setup-footer"><span class="bond-muted">'+(seat===0?'You choose the experience for both players.':'Your partner is choosing the experience for you both.')+'</span>'+(seat===0?button('begin','Start together →','bond-button bond-primary'):'<div class="bond-waiting"><span class="bond-loading"></span> Waiting for your person to start…</div>')+'</div>');
}
function choices(question,selected,action,locked=false){
 return '<div class="bond-options">'+question.options.map((option,i)=>
 '<button type="button" class="bond-option '+(selected===i?'selected':'')+'" data-bond-action="'+action+'" data-value="'+i+'" '+(locked?'disabled':'')+'><span class="bond-option-index">'+String(i+1).padStart(2,'0')+'</span><span>'+esc(option)+'</span><span class="bond-option-check" aria-hidden="true">'+(selected===i?'♥':'↗')+'</span></button>').join('')+'</div>';
}
function waiting(title,detail){
 return '<div class="bond-waiting-panel" role="status"><div class="bond-beating">♡</div><b>'+esc(title)+'</b><span>'+esc(detail)+'</span></div>';
}
function resultsHeader(isMatch){
 return '<div class="bond-reveal-center"><div class="bond-reveal-icon '+(isMatch?'match':'different')+'" aria-hidden="true">'+(isMatch?'♥':'♡')+'</div><h3>'+(isMatch?'Your hearts are thinking alike!':'Different wishes. Another beautiful discovery.')+'</h3><p>'+(isMatch?'You picked the same thing — what a lovely surprise.':'There is something new to learn about your person.')+'</p></div>';
}
function heartsReveal(s,seat,q){
 const record=s.history.at(-1);if(!record)return waiting('Preparing reveal','Your answers are on their way.');
 const mine=record.choices[seat],other=record.choices[1-seat];
 const guessMine=record.predictions[seat],guessTheirs=record.predictions[1-seat];
 const card=(title,index,guess,correct,own)=>
 '<div class="bond-reveal-card"><small>'+title+'</small><strong>'+esc(q.options[index])+'</strong><div class="bond-predict-check '+(correct?'correct':'')+'">'+(own?'You guessed: ':'They guessed: ')+esc(q.options[guess])+'<span>'+(correct?' · ✓ Right':' · A sweet surprise')+'</span></div></div>';
 return resultsHeader(record.match)+
 '<div class="bond-reveal-grid">'+card('YOUR CHOICE',mine,guessMine,record.correct[seat],true)+card('YOUR PERSON CHOSE',other,guessTheirs,record.correct[1-seat],false)+'</div>'+
 '<div class="bond-points">♡ Your HeartSync points: '+s.score[seat]+' <span>·</span> '+s.matches+' shared wishes</div>'+
 continueButton(s,seat,'Next question →');
}
function continueButton(s,seat,label='Continue together →'){
 return s.ready[seat]?waiting('You are ready','Waiting for your partner to continue…'):button('next',label,'bond-button bond-primary bond-next');
}
function heartsPlay(s,seat){
 const q=HEART_CATEGORIES[s.category].questions[s.index];
 const stage=s.index<3?'Discover Me':'Read My Mind';
 const mine=s.choices[seat],prediction=s.predictions[seat];
 let body='<div class="bond-question-tag"><span>'+esc(HEART_CATEGORIES[s.category].icon)+'</span> '+esc(HEART_CATEGORIES[s.category].title)+' <span>·</span> '+stage+'</div>';
 body+='<h3 class="bond-question">'+esc(q.text)+'</h3>';
 if(s.phase==='choose'){
  body+='<p class="bond-instruction">First, choose what feels right for <b>you</b>. Your partner cannot see your answer.</p>';
  body+=mine===null?choices(q,null,'choose'):waiting('Your answer is safely locked','Waiting for your person to make a secret choice.');
 }else if(s.phase==='predict'){
  body+='<p class="bond-instruction">Now read their heart: <b>what did your partner choose?</b></p>';
  body+=prediction===null?choices(q,null,'predict'):waiting('Prediction sealed with a heart','The reveal begins when both predictions are in.');
 }else if(s.phase==='reveal')body+=heartsReveal(s,seat,q);
 return frame(s,'HeartSync',s.phase==='reveal'?'A little magic in the moments you share.':'Two answers. Two predictions. One sweet reveal.',body);
}
function heartsSummary(s,seat){
 const q=HEART_CATEGORIES[s.category].questions;
 const shared=s.history.filter(x=>x.match).slice(0,3);
 const differences=s.history.filter(x=>!x.match).slice(0,2);
 const list=(items,sharedList)=>items.length?
 '<div class="bond-memory-list">'+items.map(r=>'<div><b>'+esc(q[r.index].text)+'</b><small>'+(sharedList?esc(q[r.index].options[r.choices[0]]):'You: '+esc(q[r.index].options[r.choices[seat]])+' · Your person: '+esc(q[r.index].options[r.choices[1-seat]]))+'</small></div>').join('')+'</div>':
 '<p class="bond-muted">'+(sharedList?'Every unique answer adds something lovely to your story.':'You found common ground across every question!')+'</p>';
 const note=s.matches>=7?'You dream in many of the same colors, and your curiosity keeps growing.':s.matches>=4?'Some wishes match and some are wonderfully different. Keep discovering each other.':'You have different little worlds to share. What matters is how beautifully you listen.';
 const body='<div class="bond-final-heart" aria-hidden="true">♥</div><div class="bond-stats"><div><strong>'+s.matches+'<span>/10</span></strong><small>SHARED WISHES</small></div><div><strong>'+s.score[seat]+'<span>/10</span></strong><small>YOUR PREDICTIONS</small></div><div><strong>'+s.score[1-seat]+'<span>/10</span></strong><small>THEIR PREDICTIONS</small></div></div>'+
 '<p class="bond-finale-note">'+esc(note)+'</p><div class="bond-memories"><h3>Where your hearts met</h3>'+list(shared,true)+'<h3>Lovely little discoveries</h3>'+list(differences,false)+'</div><div class="bond-final-actions">'+(s.ready[seat]?waiting('Rematch requested','Waiting for your partner…'):button('replay','Explore our hearts again ↗','bond-button bond-primary'))+'</div>';
 return frame(s,'Your Heart Reveal','Ten small discoveries, one beautiful connection.',body);
}
function starsFor(s){
 if(s.mode==='find')return FIND_STARS.map((x,i)=>({...x,index:i,symbol:'✦'}));
 if(s.mode==='feel')return FEEL_STARS.map((x,i)=>({...SKY_POINTS[i],...x,index:i}));
 if(s.mode==='constellation')return CONSTELLATION_CHALLENGES.map((x,i)=>({...SKY_POINTS[i],label:x.star,index:i,symbol:'✦'}));
 return STAR_QUESTIONS[s.index].options.map((label,i)=>({...SKY_POINTS[i],label,index:i,symbol:'✦'}));
}
function sky(s,seat,action=null,chosenIndex=null){
 const stars=starsFor(s);
 const other=1-seat;
 const reveal=s.phase==='reveal',guess=s.mode!=='same'&&s.mode!=='constellation';
 const a=s.choices[0],b=s.choices[1];
 const p1=stars[a],p2=stars[b];
 const line=reveal&&p1&&p2?'<svg class="bond-sky-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+
 (a===b?'<path d="M '+p1.x+' '+(p1.y+11)+' C '+(p1.x-23)+' '+(p1.y-10)+' '+(p1.x-10)+' '+(p1.y-25)+' '+p1.x+' '+(p1.y-12)+' C '+(p1.x+10)+' '+(p1.y-25)+' '+(p1.x+23)+' '+(p1.y-10)+' '+p1.x+' '+(p1.y+11)+'" fill="none" stroke="#ffc4df" stroke-width="1.2"/>':
 '<line x1="'+p1.x+'" y1="'+p1.y+'" x2="'+p2.x+'" y2="'+p2.y+'" stroke="#a8cfff" stroke-width=".9" stroke-dasharray="1.5,1.5"/>')+'</svg>':'';
 const nodes=stars.map((item,i)=>{
  const chosen=reveal&&(a===i||b===i),mine=chosenIndex===i;
  const active=action&&chosenIndex===null;
  return '<button type="button" class="bond-star '+(chosen?'revealed ':'')+(mine?'my-star ':'')+'" style="--sx:'+item.x+'%;--sy:'+item.y+'%" data-bond-action="'+(action||'none')+'" data-value="'+i+'" '+(!active?'disabled':'')+' aria-label="'+esc(item.label)+'" title="'+esc(item.label)+'"><span class="bond-star-glyph" aria-hidden="true">'+esc(item.symbol||'✦')+'</span><span class="bond-star-label">'+esc(item.label)+'</span></button>';
 }).join('');
 return '<div class="bond-sky" aria-label="'+(action?'Choose one star to answer':'Our shared starry sky')+'">'+
 '<div class="bond-moon" aria-hidden="true">☾</div>'+line+nodes+'</div>';
}
function starReveal(s,seat){
 const item=s.history.at(-1);if(!item)return waiting('The sky is changing','One moment…');
 const options=s.mode==='find'?FIND_STARS:s.mode==='feel'?FEEL_STARS:s.mode==='constellation'?CONSTELLATION_CHALLENGES:STAR_QUESTIONS[s.index].options.map(x=>({label:x}));
 let mine=item.choices[seat],theirs=item.choices[1-seat];
 if(s.mode==='find'||s.mode==='feel'){const selector=item.selector;mine=item.choices[selector];theirs=item.choices[1-selector]}
 const matched=item.match;
 const matchText=s.mode==='find'?matched?'You found their star!':'A different star, but the same beautiful universe.':s.mode==='feel'?matched?'You read their heart!':'Every feeling deserves to be heard.':matched?'Two hearts, one wish.':'Different wishes, one beautiful universe.';
 return sky(s,seat)+
 '<div class="bond-star-reveal" role="status"><span class="bond-star-heart" aria-hidden="true">'+(matched?'♥':'♡')+'</span><h3>'+esc(matchText)+'</h3><p>'+(s.mode==='constellation'?'One more star joins your shared sky.':s.mode==='find'||s.mode==='feel'?'Secret: '+esc(options[mine]?.label)+' · Guess: '+esc(options[theirs]?.label):'You chose '+esc(options[item.choices[seat]]?.label)+' · Your person chose '+esc(options[item.choices[1-seat]]?.label))+'</p></div>'+continueButton(s,seat,s.index===4?'See our constellation →':'Our next star →');
}
function starPlay(s,seat){
 const mode=STAR_MODES[s.mode];
 let body='';
 if(s.phase==='reveal')body=starReveal(s,seat);
 else if(s.mode==='constellation'){
  const challenge=CONSTELLATION_CHALLENGES[s.index];
  body='<div class="bond-star-question"><small>CONSTELLATION CHALLENGE</small><h3>'+esc(challenge.title)+'</h3><p>'+esc(challenge.task)+'</p></div>'+sky(s,seat)+
  (s.choices[seat]===null?button('complete','We shared this moment ✓','bond-button bond-primary'):waiting('A star is ready','Waiting for your partner to finish this moment.'));
 }else if(s.mode==='same'){
  const q=STAR_QUESTIONS[s.index];
  body='<div class="bond-star-question"><small>SAME WISH · ROUND '+(s.index+1)+'</small><h3>'+esc(q.text)+'</h3><p>Choose a star that holds your wish. Both choices remain secret.</p></div>'+sky(s,seat,s.choices[seat]===null?'choose':null,s.choices[seat])+
  (s.choices[seat]===null?'<p class="bond-sky-hint">Tap a glowing star to make your wish.</p>':waiting('Your wish is safe','Waiting for your partner to choose their star.'));
 }else{
  const selector=s.index%2,sel=selector===seat,len=s.mode==='find'?16:5;
  const pick=s.choices[selector],mine=s.choices[seat];
  const descriptor=s.mode==='find'?'a mystery star':'a feeling';
  const who=sel?'Your turn to hide '+descriptor+'.':'Your person is hiding '+descriptor+'.';
  const guess=sel?'Your person is searching for your star.':'Follow the clue and choose the star your person selected.';
  body='<div class="bond-star-question"><small>'+esc(mode.title.toUpperCase())+' · ROUND '+(s.index+1)+'</small><h3>'+(s.phase==='choose'?esc(who):s.phase==='guess'?'Can you find their star?':esc(mode.title))+'</h3><p>'+(s.phase==='choose'?'The chooser’s secret stays hidden until the reveal.':esc(guess))+'</p></div>';
  const canPick=sel&&s.phase==='choose'&&mine===null,canGuess=!sel&&s.phase==='guess'&&mine===null;
  body+=s.clue&&s.phase==='guess'?'<div class="bond-star-clue"><small>A CLUE FROM YOUR PERSON</small>'+esc(s.clue)+'</div>':'';
  body+=sky(s,seat,canPick?'choose':canGuess?'guess':null,mine);
  if(!(canPick||canGuess))body+=waiting(sel?'Your secret is hidden':'Waiting for the secret choice',sel?'The next step is a guess from your partner.':'A clue will appear as soon as your partner chooses.');
  if(canGuess)body+='<p class="bond-sky-hint">Tap the star you think they selected.</p>';
 }
 return frame(s,s.mode==='constellation'?'Our Constellation':'Touch the Same Star',
 s.mode==='same'?'Two hearts, one sky, five wishes.':s.mode==='find'?'The stars hold your next secret.':s.mode==='feel'?'Read the feeling behind the light.':'Complete small moments, one star at a time.',body);
}
function memoryPoints(s){
 return s.history.map((item,i)=>{
  const spots=s.mode==='find'?FIND_STARS:SKY_POINTS;
  const a=spots[item.choices[0]]||SKY_POINTS[i],b=spots[item.choices[1]]||a;
  if(s.mode==='constellation')return SKY_POINTS[i];
  return {x:Math.min(93,Math.max(7,(a.x+b.x)/2)),y:Math.min(89,Math.max(11,(a.y+b.y)/2))};
 });
}
export function constellationSvg(s){
 if(!s||s.type!=='stars'||s.phase!=='summary'||s.history.length!==5)throw new TypeError('A completed constellation is required');
 const pts=memoryPoints(s),nodes=pts.map((p,i)=>'<circle cx="'+p.x*8+'" cy="'+p.y*5.2+'" r="9" fill="#ffe7bb" stroke="#ffaeca" stroke-width="4"/><text x="'+(p.x*8+17)+'" y="'+(p.y*5.2-14)+'" fill="#e1d6f5" font-family="Arial,sans-serif" font-size="15">'+(i+1)+'</text>').join('');
 const path=pts.map((p,i)=>(i?'L':'M')+' '+p.x*8+' '+p.y*5.2).join(' ');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 650" width="800" height="650"><defs><linearGradient id="night" x2="0" y2="1"><stop stop-color="#171b39"/><stop offset="1" stop-color="#0b1020"/></linearGradient></defs><rect width="800" height="650" fill="url(#night)"/><text x="400" y="62" text-anchor="middle" font-size="29" font-family="Georgia,serif" fill="#ffe6f0">Our Couple Constellation</text><text x="400" y="90" text-anchor="middle" font-size="15" font-family="Arial,sans-serif" fill="#c9bfd7">Two people · One shared sky</text><path d="'+path+'" fill="none" stroke="#ffa9d4" stroke-width="3" stroke-dasharray="7 5"/>'+nodes+'<text x="400" y="613" text-anchor="middle" font-size="17" font-family="Arial,sans-serif" fill="#ffd3e8">Five moments, one beautiful universe · Love Arcade</text></svg>';
}
function starsSummary(s,seat){
 const points=memoryPoints(s);
 const path=points.map((p,i)=>(i?'L':'M')+' '+p.x+' '+p.y).join(' ');
 const nodes=points.map((p,i)=>'<span class="bond-memory-star" style="--sx:'+p.x+'%;--sy:'+p.y+'%" aria-hidden="true">'+(i+1)+'</span>').join('');
 const field='<div class="bond-sky bond-memory-sky"><svg class="bond-memory-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="'+path+'" stroke="#ffc4e6" stroke-width=".8" fill="none"/></svg>'+nodes+'</div>';
 const msg=s.mode==='constellation'?'You created five moments of connection, together.':s.matches>=4?'Your wishes found each other in a glowing little universe.':'Some stars met and some traveled differently. Every moment still belongs to both of you.';
 const body=field+'<div class="bond-star-finale"><div class="bond-final-heart">✦</div><h3>Your Couple Constellation</h3><p>'+esc(msg)+'</p><div class="bond-star-stats">'+s.matches+' of 5 '+(s.mode==='constellation'?'moments completed':s.mode==='same'?'shared wishes':'stars discovered')+'</div></div>'+
 '<div class="bond-final-actions"><button type="button" class="bond-button bond-primary" data-bond-export="constellation">↓ Save our constellation</button>'+
 (s.ready[seat]?waiting('Ready for another sky','Waiting for your partner…'):button('replay','Wish on the stars again ↗','bond-button'))+'</div>';
 return frame(s,'Our sky, together.','Every star remembers a moment you shared.',body);
}
export function renderBond(s,seat){
 if(!s)return '<p class="bond-muted">Preparing your little universe…</p>';
 if(s.phase==='setup')return setup(s,seat);
 if(s.phase==='summary')return s.type==='heartsync'?heartsSummary(s,seat):starsSummary(s,seat);
 return s.type==='heartsync'?heartsPlay(s,seat):starPlay(s,seat);
}
