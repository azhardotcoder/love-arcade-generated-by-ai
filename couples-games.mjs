/* Love Arcade — host-authoritative couples game pack, v1 */
export const PACK_IDS=['pictionary','xoxo','bottle','escape','date'];
export const PROMPTS=['A first kiss','Holding hands','A sunset picnic','A love letter','A heart-shaped pizza','Dancing together','A bouquet of roses','A romantic road trip','A candlelit dinner','A shooting star','A cute puppy','A rainy-day cuddle','A wedding cake','A beach getaway','A cozy movie night','A teddy bear','Two bicycles','A surprise present','A moonlit walk','A cup of coffee'];
export const BOTTLE={
 cute:['Say three things you admire about your partner.','Share the moment they made you smile today.','Invent a sweet nickname for your person.','Tell your favorite shared memory.'],
 romantic:['Describe a perfect date in 20 seconds.','Tell your partner when you first felt butterflies.','Dedicate a love song and explain why.','Say a heartfelt thank-you for something they do.'],
 flirty:['Give your partner a playful compliment.','Describe your dream romantic surprise.','Tell your partner what makes them irresistible to you.','Send a flirty, sweet one-liner.'],
 funny:['Do your best dramatic love-movie speech.','Create a silly couple superhero name.','Explain your romance as a weather forecast.','Describe your first meeting using only emojis.']
};
export const ESCAPE=[
 {title:'The Locked Love Letter',story:'The key to the secret letter is a four-digit code.',clues:['You hold the beginning: the code starts with 2 and ends with 7.','The middle pair is 14. Put the four digits together.'],answer:'2147',hint:'The first and last digits come from Player 1; Player 2 knows the center.'},
 {title:'Moonlight Balcony',story:'Unlock the gate using a four-letter word.',clues:['My clue: the word is what you see in the night sky. Four letters.','My clue: it starts with M, ends in N, and has two Os in the middle.'],answer:'MOON',hint:'Think of a glowing companion to the stars.'},
 {title:'The Flower Shop',story:'A hidden note is inside the correct bouquet.',clues:['The bouquet is a flower with thorns, often red.','A single one means love. Write its four-letter name.'],answer:'ROSE',hint:'A classic romantic flower.'},
 {title:'The Final Door',story:'The last lock opens when you speak the word that brought you here.',clues:['Five letters. Starts with H. Its shape is associated with romance.','Ends with T and the middle letters are EAR.'],answer:'HEART',hint:'You collect these throughout Love Arcade.'}
];
export const DATE_STAGES=[
 {title:'Pick our escape',choices:['Seaside sunset','Mountain hideaway','City lights','Cozy cabin']},
 {title:'What are we eating?',choices:['Homemade pasta','Street-food adventure','Candlelit dinner','Pizza and ice cream']},
 {title:'Our main event',choices:['Dancing under stars','A surprise scavenger hunt','Arcade and laughter','Midnight beach walk']},
 {title:'The soundtrack',choices:['Slow romantic songs','Indie love playlist','Retro classics','Our favorite silly hits']},
 {title:'The grand finale',choices:['Watch the sunrise','Write each other a letter','Wish on a star','Plan the next date']}
];
const safeString=(s,max=120)=>typeof s==='string'?s.trim().slice(0,max):'';
const rand=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
const randomPrompt=(used)=>{const list=PROMPTS.map((_,i)=>i).filter(i=>!used.includes(i));return (list.length?list:PROMPTS.map((_,i)=>i))[rand(list.length||PROMPTS.length)]};
export function newCoupleGame(type){
 switch(type){
 case 'pictionary':{const i=randomPrompt([]);return {type,round:1,drawer:0,phase:'draw',index:i,used:[i],strokes:[],guesses:[],score:[0,0],endsAt:Date.now()+90000,limitMs:90000,ready:[false,false]}}
 case 'xoxo':return {type,board:Array(9).fill(null),turn:0,winner:null,status:'play',score:[0,0],round:1,ready:[false,false]};
 case 'bottle':return {type,turn:0,round:1,phase:'spin',category:'cute',index:-1,angle:0,ready:[false,false],done:[0,0]};
 case 'escape':return {type,room:0,phase:'puzzle',tries:0,hints:0,solved:[],lastGuess:'',ready:[false,false]};
 case 'date':return {type,stage:0,choices:[null,null],phase:'pick',ready:[false,false],itinerary:[]};
 default:return null;
 }
}
export function reduceCouple(src,a,seat,now=Date.now()){
 if(!src||!a||![0,1].includes(seat)||a.type!=='couple'||typeof a.action!=='string')return null;
 const s=structuredClone(src),op=a.action;
 if(s.type==='pictionary'){
  if(op==='stroke'){
   if(s.phase!=='draw'||s.drawer!==seat||s.strokes.length>=75||now>s.endsAt)return null;
   if(!Array.isArray(a.points)||a.points.length<1||a.points.length>80||!a.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1)))return null;
   if(!['#fff1ed','#ff89ba','#ffc47b','#aa96ff','#8fe3c0','#37253e'].includes(a.color)||![3,6,10,15].includes(a.width))return null;
   s.strokes.push({points:a.points,color:a.color,width:a.width});return s;
  }
  if(op==='clear'&&seat===s.drawer&&s.phase==='draw'){s.strokes=[];return s}
  if(op==='guess'&&seat!==s.drawer&&s.phase==='draw'){
   const word=safeString(a.value,60);if(!word||s.guesses.length>=35)return null;
   const correct=word.toLowerCase().replace(/[^a-z0-9]/g,'')===PROMPTS[s.index].toLowerCase().replace(/[^a-z0-9]/g,'');
   s.guesses.push({seat,value:word,correct});
   if(correct){s.score[seat]+=10;s.score[s.drawer]+=5;s.phase='reveal'}
   return s;
  }
  if(op==='end'&&seat===0&&s.phase==='draw'&&now>=s.endsAt){s.phase='reveal';return s}
  if(op==='pass'&&seat===s.drawer&&s.phase==='draw'){s.phase='reveal';return s}
  if(op==='ready'&&s.phase==='reveal'&&!s.ready[seat]){
   s.ready[seat]=true;if(s.ready.every(Boolean)){s.round++;s.drawer=1-s.drawer;s.phase='draw';s.strokes=[];s.guesses=[];s.ready=[false,false];s.index=randomPrompt(s.used);s.used.push(s.index);s.endsAt=now+s.limitMs;}return s;
  }
  return null;
 }
 if(s.type==='xoxo'){
  if(op==='place'&&s.status==='play'&&seat===s.turn&&Number.isInteger(a.index)&&a.index>=0&&a.index<9&&s.board[a.index]===null){
   s.board[a.index]=seat;const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
   if(lines.some(line=>line.every(i=>s.board[i]===seat))){s.status='win';s.winner=seat;s.score[seat]++}
   else if(s.board.every(x=>x!==null)){s.status='draw';s.winner=null}
   else s.turn=1-seat;return s;
  }
  if(op==='ready'&&s.status!=='play'&&!s.ready[seat]){s.ready[seat]=true;if(s.ready.every(Boolean)){s.round++;s.board=Array(9).fill(null);s.turn=(s.round-1)%2;s.status='play';s.winner=null;s.ready=[false,false]}return s}
  return null;
 }
 if(s.type==='bottle'){
  if(op==='spin'&&s.phase==='spin'&&seat===s.turn&&Object.hasOwn(BOTTLE,a.category)){
   s.category=a.category;s.index=rand(BOTTLE[a.category].length);s.angle=720+rand(1440);s.phase='task';return s;
  }
  if(op==='done'&&s.phase==='task'&&seat===s.turn){s.phase='review';return s}
  if(op==='approve'&&s.phase==='review'&&seat!==s.turn){s.done[s.turn]++;s.turn=1-s.turn;s.round++;s.phase='spin';s.index=-1;return s}
  if(op==='retry'&&s.phase==='review'&&seat!==s.turn){s.phase='task';return s}
  if(op==='pass'&&s.phase!=='spin'&&seat===s.turn){s.turn=1-s.turn;s.round++;s.phase='spin';s.index=-1;return s}
  return null;
 }
 if(s.type==='escape'){
  if(op==='guess'&&s.phase==='puzzle'){
   const v=safeString(a.value,20).toUpperCase().replace(/\s/g,'');
   if(!v)return null;s.tries=Math.min(s.tries+1,999);s.lastGuess=v;
   if(v===ESCAPE[s.room].answer){s.solved.push(s.room);s.phase='solved';}
   return s;
  }
  if(op==='hint'&&s.phase==='puzzle'&&s.hints<3){s.hints++;return s}
  if(op==='ready'&&s.phase==='solved'&&!s.ready[seat]){
   s.ready[seat]=true;if(s.ready.every(Boolean)){s.room++;s.phase=s.room>=ESCAPE.length?'complete':'puzzle';s.tries=0;s.hints=0;s.lastGuess='';s.ready=[false,false];}return s;
  }
  if(op==='replay'&&s.phase==='complete'&&!s.ready[seat]){
   s.ready[seat]=true;if(s.ready.every(Boolean))return newCoupleGame('escape');return s;
  }
  return null;
 }
 if(s.type==='date'){
  if(op==='choose'&&s.phase==='pick'&&s.choices[seat]===null&&Number.isInteger(a.index)&&a.index>=0&&a.index<4){
   s.choices[seat]=a.index;if(s.choices.every(v=>v!==null)){s.phase='reveal';s.itinerary.push({stage:s.stage,choices:s.choices.slice()})}return s;
  }
  if(op==='ready'&&s.phase==='reveal'&&!s.ready[seat]){
   s.ready[seat]=true;if(s.ready.every(Boolean)){s.stage++;s.phase=s.stage===DATE_STAGES.length?'complete':'pick';s.choices=[null,null];s.ready=[false,false]}return s;
  }
  if(op==='replay'&&s.phase==='complete'&&!s.ready[seat]){s.ready[seat]=true;if(s.ready.every(Boolean))return newCoupleGame('date');return s}
  return null;
 }
 return null;
}
export function coupleView(src,seat){
 if(!src)return null;
 const s=structuredClone(src);
 if(s.type==='pictionary'&&s.phase==='draw'&&seat!==s.drawer)s.index=null;
 if(s.type==='date'&&s.phase==='pick')s.choices[1-seat]=null;
 if(s.type==='escape'&&s.phase==='puzzle')s.privateClue=ESCAPE[s.room]?.clues[seat]||'';
 return s;
}
