import {startChess,reduceChess} from './chess.mjs';
import {initialLounge,reduceLounge} from './watch.mjs';
import {PACK_IDS,newCoupleGame,reduceCouple,coupleView} from './couples-games.mjs';
import {BOND_IDS,newBondGame,reduceBond,bondView} from './bond-games.mjs';
let ChessConstructor=null;
export function registerChessRules(Chess){ChessConstructor=Chess}
export const GAMES={
 truth:{title:'Truth or Dare',desc:'Take turns, complete a challenge, then let your person approve.',icon:'♡',theme:'rose',label:'THE CLASSIC'},
 quiz:{title:'Love Quiz',desc:'Reveal what you both know about your story.',icon:'✧',theme:'violet',label:'KNOW YOUR PERSON'},
 rather:{title:'Would You Rather?',desc:'Two choices. One beautifully shared adventure.',icon:'☾',theme:'blue',label:'DREAM TOGETHER'},
 notes:{title:'Love Notes',desc:'Sealed little letters, revealed together.',icon:'✉',theme:'peach',label:'JUST BETWEEN YOU'},
 match:{title:'Heart Match',desc:'A memory game you can only win together.',icon:'❖',theme:'mint',label:'TEAM PLAY'},
 chess:{title:'Chess Royale',desc:'A complete head-to-head chess match. Challenge your favorite rival.',icon:'♞',theme:'blue',label:'CHECKMATE DATE'},
 pictionary:{title:'Love Pictionary',desc:'Draw a secret romantic clue while your partner guesses.',icon:'✎',theme:'rose',label:'DRAW TOGETHER'},
 xoxo:{title:'XOXO Battle',desc:'Hearts versus kisses in a playful best-of-many battle.',icon:'⊗',theme:'violet',label:'QUICK DUEL'},
 bottle:{title:'Spin the Love Bottle',desc:'Spin for a cute, romantic, flirty or funny challenge.',icon:'↻',theme:'peach',label:'A LITTLE SPARK'},
 escape:{title:'Together We Escape',desc:'Combine two private clues to escape four romantic rooms.',icon:'⚿',theme:'blue',label:'CO-OP PUZZLES'},
 date:{title:'Dream Date Builder',desc:'Make secret choices and reveal your perfect evening.',icon:'✧',theme:'mint',label:'BUILD A DATE'},
 heartsync:{title:'HeartSync',desc:'Ten romantic questions. Secret predictions. Discover how well you know each other.',icon:'♥',theme:'rose',label:'READ MY HEART'},
 stars:{title:'Touch the Same Star',desc:'Share one magical sky, choose glowing stars, and create a couple constellation.',icon:'✦',theme:'blue',label:'ONE SHARED SKY'}};
export const TRUTHS=[
'What tiny thing I do gives you butterflies?','What was your first impression of me?','Which memory of us would you relive tonight?','What makes you feel most loved by me?','What is our dream date?','What song feels like our story?','Which silly habit of mine do you secretly love?','What do you hope we do together next year?','When did I make you laugh when you really needed it?','What compliment from me has stayed with you?','Describe your dream lazy Sunday with me.','What is your favorite way to be comforted?','Where should we go on our next adventure?','What is one small way we could grow closer?','What is your favorite inside joke of ours?','What part of our future excites you most?','What kind thing do I do that I might not notice?','How would you describe our relationship in three words?'];
export const DARES=[
'Give your partner three specific, heartfelt compliments.','Create a brand-new nickname for your partner.','Describe your perfect date in under a minute.','Send a four-line romantic poem in chat.','Give your partner a 20-second appreciation speech.','Name five things you adore about your person.','Sing or hum a few seconds of your favorite love song.','Tell the story of how you met like a dramatic movie trailer.','Share a photo you love of the two of you (outside this app).','Make a tiny bucket list of three things to do together.','Say one sweet thing in a different language.','Plan a surprise date with a budget of zero.','Describe your partner using only emojis in chat.','Choose a song to dedicate to your partner.','Make up a funny award your partner deserves.','Tell your partner something you are grateful for today.','Re-create your first hello.','Say a romantic sentence without using the word love.'];
export const QUESTIONS=[
'What do you remember most about our first conversation?','What is your favorite little memory of us?','What is something I do that always makes you smile?','What kind of date should we plan next?','What do you think is our best shared habit?','What would we call the movie about our love story?','Where would our dream holiday take us?','Which song would be our theme song?','What makes our relationship feel special?','What is something you want us to experience together?'];
export const RATHER=[
['A golden-hour picnic','A cozy movie night'],['A mountain cabin','A beachside cottage'],['A surprise road trip','A carefully planned vacation'],['Matching bracelets','A scrapbook of memories'],['Dancing in the kitchen','Stargazing on a rooftop'],['A handwritten love letter','A surprise date'],['Cooking dinner together','Discovering a new cafe'],['Revisit our first date','Try a brand-new adventure'],['Slow mornings together','Late-night heart-to-hearts'],['A midnight ice-cream run','A sunset walk']];
export const SYMBOLS=['💗','🌹','🌙','💌','🎵','✨'];
export const shuffled=a=>{const c=a.slice();for(let i=c.length-1;i>0;i--){const r=crypto.getRandomValues(new Uint32Array(1))[0];const j=r%(i+1);[c[i],c[j]]=[c[j],c[i]]}return c};
export function fresh(){return {rev:0,epoch:0,game:null,round:1,phase:'choose',turn:0,kind:'',task:'',reply:'',answers:[null,null],ready:[false,false],score:[0,0],hearts:0,board:[],open:[],found:[],moves:0,feedback:'',used:{truth:[],dare:[]},chess:null,couple:null,bond:null,watch:initialLounge()}}
const reset=(s,g)=>{s.game=g;s.epoch++;s.round=1;s.phase=g==='truth'?'choose':'answer';s.turn=0;s.kind='';s.task='';s.reply='';s.answers=[null,null];s.ready=[false,false];s.board=g==='match'?shuffled([...SYMBOLS,...SYMBOLS]):[];s.open=[];s.found=[];s.moves=0;s.feedback='';s.used={truth:[],dare:[]};s.chess=g==='chess'?startChess('rapid'):null;s.couple=PACK_IDS.includes(g)?newCoupleGame(g):null;s.bond=BOND_IDS.includes(g)?newBondGame(g):null};
export function reduce(state,a,seat){
 if(!a||typeof a!=='object'||![0,1].includes(seat)||!Number.isInteger(a.epoch)||!Number.isInteger(a.round))return null;
 if(a.epoch!==state.epoch||a.round!==state.round)return null;
 const s=structuredClone(state);
 if(a.type==='start'){if(s.game||s.watch.open||!Object.hasOwn(GAMES,a.game)||a.game==='chess'&&!ChessConstructor)return null;reset(s,a.game)}
 else if(a.type==='lobby'){if(!s.game)return null;reset(s,null)}
 else if(a.type==='watch'){
  if(!s.watch||a.kind==='open'&&s.game)return null;
  const next=reduceLounge(s.watch,a,seat,Date.now());if(!next)return null;
  s.watch=next;
 }
 else if(a.type==='chess-config'){
 if(s.game!=='chess'||s.chess.moves.length||!['rapid','blitz','classic'].includes(a.mode)||s.chess.status!=='playing')return null;
 s.chess=startChess(a.mode);
 }else if(typeof a.type==='string'&&a.type.startsWith('chess-')){
 if(s.game!=='chess'||!ChessConstructor)return null;
 const next=reduceChess(s.chess,a,seat,ChessConstructor,Date.now());
 if(!next)return null;
 s.chess=next;
 if(next.status==='finished'&&state.chess.status!=='finished')s.hearts++;
 }else if(a.type==='couple'){
 if(!PACK_IDS.includes(s.game)||!s.couple)return null;
 const next=reduceCouple(s.couple,a,seat,Date.now());if(!next)return null;
 if(s.game==='xoxo'&&next.status==='win'&&s.couple.status==='play')s.hearts++;
 if(s.game==='pictionary'&&next.phase==='reveal'&&s.couple.phase==='draw')s.hearts++;
 if(s.game==='escape'&&next.phase==='solved'&&s.couple.phase==='puzzle')s.hearts++;
 if(s.game==='date'&&next.phase==='reveal'&&s.couple.phase==='pick')s.hearts++;
 s.couple=next;
 }else if(a.type==='bond'){
  if(!BOND_IDS.includes(s.game)||!s.bond)return null;
  const next=reduceBond(s.bond,a,seat);if(!next)return null;
  if(next.phase==='reveal'&&s.bond.phase!=='reveal')s.hearts++;
  s.bond=next;
 }else if(a.type==='pick'){
  if(s.game!=='truth'||s.phase!=='choose'||s.turn!==seat||!['truth','dare'].includes(a.kind))return null;
  const list=a.kind==='truth'?TRUTHS:DARES;let pool=list.map((_,i)=>i).filter(i=>!s.used[a.kind].includes(i));
  if(!pool.length){s.used[a.kind]=[];pool=list.map((_,i)=>i)}
  const i=shuffled(pool)[0];s.used[a.kind].push(i);s.kind=a.kind;s.task=list[i];s.reply='';s.feedback='';s.phase='task';
 }else if(a.type==='complete'){
  if(s.game!=='truth'||s.phase!=='task'||seat!==s.turn)return null;s.reply=String(a.value||'').slice(0,500);s.phase='approval';
 }else if(a.type==='approve'||a.type==='retry'){
  if(s.game!=='truth'||s.phase!=='approval'||seat===s.turn)return null;
  if(a.type==='approve'){s.hearts++;s.score[s.turn]++;s.turn=1-s.turn;s.round++;s.phase='choose';s.task='';s.reply='';s.feedback='Task approved! The turn switched.'}
  else{s.phase='task';s.feedback='Your partner asked for another try.'}
 }else if(a.type==='skip'){
  if(s.game!=='truth'||seat!==s.turn||s.phase==='choose')return null;
  s.phase='choose';s.task='';s.reply='';s.round++;s.feedback='Skipped without penalty. Your comfort always comes first.';
 }else if(a.type==='answer'){
  if(!['quiz','rather','notes'].includes(s.game)||s.phase!=='answer'||s.answers[seat]!==null)return null;
  const v=s.game==='rather'?a.value:String(a.value||'').trim().slice(0,s.game==='notes'?1000:500);
  if(s.game==='rather'?![0,1].includes(v):!v)return null;
  s.answers[seat]=v;if(s.answers.every(x=>x!==null)){s.phase='reveal';s.hearts++}
 }else if(a.type==='next'){
  if(!['quiz','rather','notes'].includes(s.game)||s.phase!=='reveal'||s.ready[seat])return null;
  s.ready[seat]=true;if(s.ready.every(Boolean)){s.round++;s.phase='answer';s.ready=[false,false];s.answers=[null,null]}
 }else if(a.type==='flip'){
  if(s.game!=='match'||s.turn!==seat||s.open.length>=2||!Number.isInteger(a.index)||a.index<0||a.index>11||s.found.includes(a.index)||s.open.includes(a.index))return null;
  s.open.push(a.index);if(s.open.length===2){s.moves++;const [x,y]=s.open;if(s.board[x]===s.board[y]){s.found.push(x,y);s.open=[];s.hearts++;s.score[seat]++;s.feedback='A perfect match! Keep playing.';if(s.found.length===12)s.phase='win';}else{s.feedback='Remember these two...'}}}
 else if(a.type==='hide'){
  if(seat!==0||s.game!=='match'||s.open.length!==2||a.rev!==s.rev)return null;
  s.open=[];s.turn=1-s.turn;s.feedback='Your partner gets the next two flips.';
 }else if(a.type==='replay'){
  if(s.game!=='match'||s.phase!=='win'||s.ready[seat])return null;s.ready[seat]=true;if(s.ready.every(Boolean))reset(s,'match');
 }else return null;
 s.rev++;return s
}

/**
 * Publish only information the receiving player is allowed to see.
 * This prevents the hidden memory deck and unrevealed written choices
 * from appearing in the guest's network messages / dev tools.
 * The host remains the trusted authority for all state mutations.
 */
export function viewForSeat(state,seat) {
 if (![0,1].includes(seat)) throw new TypeError('Invalid player seat');
 const visible=structuredClone(state);
 if(PACK_IDS.includes(visible.game))visible.couple=coupleView(visible.couple,seat);
 if(BOND_IDS.includes(visible.game))visible.bond=bondView(visible.bond,seat);
 if (visible.game==='chess'&&visible.chess){visible.chess.moves=visible.chess.moves.map(({clockBefore,...ply})=>ply)}
 if (visible.game==='match') {
  visible.board=visible.board.map((symbol,index)=>
    visible.found.includes(index)||visible.open.includes(index)?symbol:null);
 }
 if (['quiz','rather','notes'].includes(visible.game)&&visible.phase!=='reveal') {
  visible.answers[1-seat]=null;
 }
 delete visible.used;
 return visible;
}
