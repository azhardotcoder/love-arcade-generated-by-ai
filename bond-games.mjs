/* Love Arcade — HeartSync and Touch the Same Star: host-authoritative state. */
export const BOND_IDS=['heartsync','stars'];
const q=(text,options)=>({text,options});
export const HEART_CATEGORIES={
 sweet:{title:'Sweet & Romantic',icon:'♡',description:'Tender gestures, comfort and affection.',questions:[
 q('Our perfect day together would be…',['Movies and cuddles','A scenic long drive','Exploring somewhere new','Dinner under the stars']),
 q('The little gesture that means the most is…',['A handwritten note','A spontaneous hug','Remembering tiny details','Making time to talk']),
 q('My ideal romantic surprise would be…',['A candlelit picnic','A surprise playlist','A weekend escape','A home-cooked dinner']),
 q('Which moment should we repeat?',['Our first long conversation','Our funniest date','A sunset together','A quiet everyday moment']),
 q('The sweetest way to say goodnight is…',['A sleepy voice note','A forehead kiss','One last meaningful message','A shared song']),
 q('When I miss you most, I would rather…',['Call right away','Look at our photos','Plan our next meeting','Write you a message']),
 q('My dream anniversary feels like…',['Dressing up for dinner','Revisiting our first date','Escaping to nature','Staying in with a surprise']),
 q('A perfect lazy Sunday is…',['Breakfast in bed','A walk holding hands','Cooking something new','Binge-watching together']),
 q('Which promise warms my heart the most?',['I am listening','I will make time','We are a team','I will cheer you on']),
 q('Our next romantic memory should be…',['Dancing in the kitchen','Watching the sunrise','Getting lost on a day trip','Making a scrapbook'])]},
 funny:{title:'Funny & Playful',icon:'✧',description:'Laugh-out-loud questions and silly couple moments.',questions:[
 q('Our couple superpower should be…',['Telepathic snack ordering','Instant teleporting hugs','Pausing awkward moments','Finding lost socks']),
 q('If we got stuck in a movie, it would be…',['A romantic comedy','A wild adventure','A cozy fantasy','A hilarious mystery']),
 q('Who should be our official mascot?',['A sleepy cat','A dramatic penguin','A dancing otter','A tiny dragon']),
 q('Our most ridiculous date idea is…',['A costume grocery run','A karaoke showdown','A mystery bus ride','A home cooking competition']),
 q('Our couple theme song should sound…',['Ridiculously cheerful','Epic and cinematic','Soft and dreamy','A little chaotic']),
 q('Our matching outfits would be…',['Pajamas everywhere','Matching hoodies','Wildly different colors','Funny slogan shirts']),
 q('If I could prank you harmlessly, I would…',['Leave goofy notes','Switch our wallpapers','Invent a fake holiday','Hide tiny paper hearts']),
 q('Our dream talent-show act is…',['Terrible duet singing','Two-person magic tricks','Synchronized dancing','Stand-up comedy']),
 q('What should we name our shared spaceship?',['The Cuddle Rocket','Mission: Snacks','Forever Express','Oops, We Did It Again']),
 q('One silly tradition we should start is…',['A weekly dance break','A monthly mystery date','Creating fake awards','Inventing new nicknames'])]},
 flirty:{title:'Flirty',icon:'♥',description:'Playful sparks, attraction and sweet teasing.',questions:[
 q('The quickest way to make me blush is…',['A sincere compliment','A surprise handhold','That special look','A playful voice note']),
 q('Our most flirty date would be…',['Slow dancing','A rooftop sunset','A dress-up dinner','A spontaneous night drive']),
 q('A romantic text I would love to receive is…',['Thinking of you','Meet me for a surprise','You looked amazing today','Can we talk all night?']),
 q('The cutest first move is…',['A shy smile','A playful joke','Reaching for my hand','A direct sweet compliment']),
 q('The atmosphere for a date should be…',['Fairy lights','Soft music','Rain on the windows','A sky full of stars']),
 q('My favorite kind of compliment is about…',['My smile','My kindness','My confidence','My sense of humor']),
 q('Our cutest challenge would be…',['A staring contest','A compliment battle','A handwritten poem','A silly slow dance']),
 q('The best spontaneous romantic plan is…',['A midnight dessert','A surprise picnic','A playlist and drive','A rooftop conversation']),
 q('The kind of affection I enjoy most is…',['Holding hands','Warm hugs','Sweet words','Thoughtful surprises']),
 q('I would rather end our date with…',['One last walk','A heartfelt conversation','A shared favorite song','Plans for the next date'])]},
 deep:{title:'Deep Connection',icon:'☾',description:'Understanding emotions, support and trust.',questions:[
 q('When life is overwhelming, I most need…',['A listening ear','Quiet company','Encouraging words','A practical helping hand']),
 q('The most comforting thing to hear is…',['I understand','I am here','You can take your time','We will figure it out']),
 q('I feel most understood when you…',['Ask thoughtful questions','Remember what matters','Notice my mood','Give me room to speak']),
 q('A healthy disagreement should end with…',['A calm conversation','A warm reassurance','Time to reflect','A shared solution']),
 q('Which quality strengthens our connection?',['Honest communication','Making time','Patience','Shared laughter']),
 q('When I am quiet, I would rather…',['Be gently asked why','Have a little space','Sit together silently','Get a comforting message']),
 q('My biggest love-language reminder is…',['Thoughtful actions','Quality time','Affectionate words','Little physical gestures']),
 q('The best way to celebrate my success is…',['A private proud moment','A fun surprise','A heartfelt message','A special day out']),
 q('Something I want us to practice more is…',['Listening without rushing','Planning quality time','Sharing feelings','Cheering each other on']),
 q('When I need courage, I hope you…',['Believe in me','Help me make a plan','Make me laugh','Sit beside me'])]},
 future:{title:'Dream Future',icon:'✦',description:'Little adventures and big dreams ahead.',questions:[
 q('Our dream first big trip would be…',['A mountain retreat','A beautiful coastline','A new city','A cabin under the stars']),
 q('A home that feels like us would have…',['A cozy reading nook','A bright kitchen','A balcony garden','A gaming and movie corner']),
 q('Which adventure should we try first?',['A weekend road trip','Learning something together','A surprise destination','A sunrise hike']),
 q('Our future weekend ritual should be…',['Sunday breakfast','A weekly date night','Long evening walks','Cooking new recipes']),
 q('Our ideal future celebration is…',['A small intimate gathering','A grand exciting party','A peaceful getaway','An unexpected adventure']),
 q('A shared hobby worth exploring is…',['Photography','Dancing','Travel planning','Cooking']),
 q('A dream view from our window is…',['Mountains','Ocean waves','City lights','A peaceful forest']),
 q('Our most memorable trip souvenir is…',['A photo album','A handwritten postcard','A tiny handmade item','A new shared playlist']),
 q('What future story should we tell someday?',['The places we explored','The surprises we planned','The challenges we overcame','The everyday joys we shared']),
 q('In five years, I hope we are…',['Exploring the world','Building a cozy home','Learning new things','Still making each other laugh'])]}
};
export const STAR_MODES={
 same:{title:'Same Wish',icon:'✦',description:'Pick a hidden wish and discover if you chose the same star.'},
 find:{title:'Find My Star',icon:'☄',description:'Hide a star in a sky of sixteen, then give your person a clue.'},
 feel:{title:'Feel My Heart',icon:'♡',description:'Choose a feeling; let your partner guess what your heart needs.'},
 constellation:{title:'Our Constellation',icon:'✧',description:'Complete five tiny connection rituals and build your shared sky.'}
};
export const STAR_QUESTIONS=[
 q('If we were together tonight, our wish would be…',['Watching the sunset','A long drive','Cuddling close','Talking for hours','Dancing to our song']),
 q('Our perfect little escape would be…',['A moonlit beach','A mountain hideaway','A city rooftop','A forest cabin','A quiet lakeside']),
 q('The gift we would give our future selves is…',['More adventures','More slow mornings','More shared laughter','More honest talks','More spontaneous dates']),
 q('Our next memory should feel like…',['A surprise','A warm embrace','An exciting adventure','A peaceful evening','A magical night']),
 q('If we had one wish under the stars…',['More time together','A dream journey','A cozy shared home','Everyday kindness','A lifetime of laughter'])
];
export const FEEL_STARS=[
 {label:'Peaceful',symbol:'☾',color:'#abceff'},
 {label:'Excited',symbol:'✦',color:'#ffe1a2'},
 {label:'Loved',symbol:'♥',color:'#ffaccd'},
 {label:'Thoughtful',symbol:'✧',color:'#c4b7ff'},
 {label:'Playful',symbol:'★',color:'#b5f5d3'}
];
export const FIND_STARS=[
 {x:13,y:14,label:'First Wish',clue:'It glows in the upper sky.'},
 {x:34,y:10,label:'Warm Glow',clue:'It glows in the upper sky.'},
 {x:58,y:17,label:'Soft Light',clue:'It glows in the upper sky.'},
 {x:83,y:13,label:'North Star',clue:'It glows in the upper sky.'},
 {x:19,y:35,label:'New Moon',clue:'It shines on the left side.'},
 {x:40,y:30,label:'Little Hope',clue:'It shines near the middle.'},
 {x:64,y:36,label:'Our Song',clue:'It shines near the middle.'},
 {x:88,y:32,label:'Stardust',clue:'It shines on the right side.'},
 {x:10,y:57,label:'Morning Star',clue:'It shines on the left side.'},
 {x:35,y:53,label:'A Promise',clue:'It shines near the middle.'},
 {x:60,y:58,label:'Daydream',clue:'It shines near the middle.'},
 {x:82,y:54,label:'Long Drive',clue:'It shines on the right side.'},
 {x:19,y:82,label:'Home',clue:'It waits low in the sky.'},
 {x:43,y:77,label:'Butterfly',clue:'It waits low in the sky.'},
 {x:66,y:83,label:'Your Smile',clue:'It waits low in the sky.'},
 {x:90,y:76,label:'Forever',clue:'It waits low in the sky.'}
];
export const CONSTELLATION_CHALLENGES=[
 {title:'One Little Thank You',task:'Tell your person one tiny thing they did that you appreciated today.',star:'Gratitude'},
 {title:'Our Favorite Memory',task:'Share a memory that still makes you smile. Take turns remembering the details.',star:'Memories'},
 {title:'Dream a Date',task:'Invent a wonderful date together, even if it is impossible for now.',star:'Adventure'},
 {title:'The Bright Side',task:'Name a strength you admire in your person and explain why.',star:'Admiration'},
 {title:'Make a Wish',task:'Each say one hopeful wish for your next chapter together.',star:'Tomorrow'}
];
const validIndex=(i,max)=>Number.isInteger(i)&&i>=0&&i<max;
const isChoiceDone=s=>s.choices.every(x=>x!==null);
function finishRound(s){
 const match=s.choices[0]===s.choices[1];
 const correct=[s.predictions[0]===s.choices[1],s.predictions[1]===s.choices[0]];
 s.history.push({index:s.index,choices:s.choices.slice(),predictions:s.predictions.slice(),match,correct});
 s.score[0]+=Number(correct[0]);s.score[1]+=Number(correct[1]);s.matches+=Number(match);s.phase='reveal';
}
export function newBondGame(type){
 if(type==='heartsync')return {type,phase:'setup',category:'sweet',index:0,choices:[null,null],predictions:[null,null],ready:[false,false],history:[],score:[0,0],matches:0};
 if(type==='stars')return {type,phase:'setup',mode:'same',index:0,choices:[null,null],ready:[false,false],history:[],matches:0,clue:''};
 return null;
}
export function reduceBond(src,a,seat){
 if(!src||a?.type!=='bond'||![0,1].includes(seat)||typeof a.action!=='string')return null;
 const s=structuredClone(src),op=a.action;
 if(s.phase==='setup'){
  if(op==='configure'&&seat===0){
   if(s.type==='heartsync'&&Object.hasOwn(HEART_CATEGORIES,a.value))s.category=a.value;
   else if(s.type==='stars'&&Object.hasOwn(STAR_MODES,a.value))s.mode=a.value;
   else return null;
   return s;
  }
  if(op==='begin'&&seat===0){s.phase=s.mode==='constellation'?'challenge':'choose';return s}
  return null;
 }
 if(s.phase==='summary'){
  if(op!=='replay'||s.ready[seat])return null;
  s.ready[seat]=true;
  if(s.ready.every(Boolean)){const next=newBondGame(s.type);if(s.type==='heartsync')next.category=s.category;else next.mode=s.mode;return next}
  return s;
 }
 if(s.type==='heartsync'){
  if(op==='choose'&&s.phase==='choose'&&s.choices[seat]===null&&validIndex(a.value,4)){
   s.choices[seat]=a.value;
   if(isChoiceDone(s))s.phase='predict';
   return s;
  }
  if(op==='predict'&&s.phase==='predict'&&s.predictions[seat]===null&&validIndex(a.value,4)){
   s.predictions[seat]=a.value;
   if(s.predictions.every(x=>x!==null))finishRound(s);
   return s;
  }
  if(op==='next'&&s.phase==='reveal'&&!s.ready[seat]){
   s.ready[seat]=true;
   if(s.ready.every(Boolean)){
    s.index++;s.phase=s.index>=10?'summary':'choose';
    s.choices=[null,null];s.predictions=[null,null];s.ready=[false,false];
   }
   return s;
  }
  return null;
 }
 if(s.type!=='stars')return null;
 const len=s.mode==='find'?16:s.mode==='feel'?5:5;
 if(s.mode==='constellation'){
  if(op==='complete'&&s.phase==='challenge'&&s.choices[seat]===null){
   s.choices[seat]=s.index;
   if(isChoiceDone(s)){s.history.push({index:s.index,choices:[s.index,s.index],match:true});s.matches++;s.phase='reveal'}
   return s;
  }
 }else if(s.mode==='same'){
  if(op==='choose'&&s.phase==='choose'&&s.choices[seat]===null&&validIndex(a.value,5)){
   s.choices[seat]=a.value;
   if(isChoiceDone(s)){s.history.push({index:s.index,choices:s.choices.slice(),match:s.choices[0]===s.choices[1]});s.matches+=Number(s.choices[0]===s.choices[1]);s.phase='reveal'}
   return s;
  }
 }else{
  const selector=s.index%2,guesser=1-selector;
  if(op==='choose'&&s.phase==='choose'&&seat===selector&&validIndex(a.value,len)){
   s.choices[selector]=a.value;
   s.phase='guess';
   s.clue=s.mode==='find'?FIND_STARS[a.value].clue:'Read the feeling in your person’s heart.';
   return s;
  }
  if(op==='guess'&&s.phase==='guess'&&seat===guesser&&validIndex(a.value,len)){
   s.choices[guesser]=a.value;
   const matched=s.choices[selector]===s.choices[guesser];
   s.history.push({index:s.index,choices:s.choices.slice(),match:matched,selector});
   s.matches+=Number(matched);s.phase='reveal';
   return s;
  }
 }
 if(op==='next'&&s.phase==='reveal'&&!s.ready[seat]){
  s.ready[seat]=true;
  if(s.ready.every(Boolean)){
   s.index++;s.phase=s.index>=5?'summary':s.mode==='constellation'?'challenge':'choose';
   s.ready=[false,false];s.choices=[null,null];s.clue='';
  }
  return s;
 }
 return null;
}
export function bondView(src,seat){
 if(!src||![0,1].includes(seat))return null;
 const s=structuredClone(src);
 if(!['reveal','summary'].includes(s.phase)){
  s.choices[1-seat]=null;
  if(s.type==='heartsync')s.predictions[1-seat]=null;
 }
 return s;
}
