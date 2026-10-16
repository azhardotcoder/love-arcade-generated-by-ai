import {parseYoutubeId,watchPosition,MAX_QUEUE,REACTIONS} from './watch.mjs';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const timestamp=s=>{const t=Math.max(0,Math.floor(s||0));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
let ytPromise;
function loadYoutubeApi(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(ytPromise)return ytPromise;
 ytPromise=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{reject(Error('YouTube player failed to load. Check your network.'))},18000);
  const previous=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{
   try{previous?.()}catch{}
   clearTimeout(timeout);resolve(window.YT);
  };
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';
  script.async=true;script.onerror=()=>{clearTimeout(timeout);reject(Error('YouTube is currently unreachable.'))};
  document.head.append(script);
 }).catch(e=>{ytPromise=null;throw e});
 return ytPromise;
}
export function createWatchController({state,seat,online,hostTime,act,send,toast}){
 let player=null,currentId='',playerReady=false,suppressUntil=0,loading=false,queueKey='',reactionTime=0,seekBusy=false,active=false,wasOpen=false,queueExpanded=true,queueInitiallySet=false;
 let lastVideoState=-99,lastReadyKey='',pendingLoad='',localPlaying=false;
 const watch=()=>state()?.watch;
 const suppress=ms=>{suppressUntil=Date.now()+ms};
 function frameTime(){try{return playerReady?Number(player.getCurrentTime())||0:0}catch{return 0}}
 function frameDuration(){try{return playerReady?Number(player.getDuration())||0:0}catch{return 0}}
 function disposePlayer(){
  suppress(1600);currentId='';pendingLoad='';playerReady=false;loading=false;lastVideoState=-99;localPlaying=false;
  if(player){try{player.destroy()}catch{}player=null}
  $('watchVideo').replaceChildren();$('watchStartPlayback').hidden=true;
 }
 async function setVideo(id){
  if(id===currentId&&player)return;
  if(!id){disposePlayer();return}
  currentId=id;pendingLoad=id;loading=true;playerReady=false;
  // The YouTube API may load after a reconnect or the lounge closes.
  try{
   const YT=await loadYoutubeApi();
   if(pendingLoad!==id||!active||!watch()?.open)return;
   if(player){suppress(1800);try{player.destroy()}catch{}player=null}
   $('watchVideo').replaceChildren();
   suppress(1800);
   const slot=document.createElement('div');slot.id='watchYTSlot';$('watchVideo').append(slot);
   player=new YT.Player('watchYTSlot',{
    width:'100%',height:'100%',videoId:id,
    playerVars:{playsinline:1,controls:1,rel:0,origin:location.origin,enablejsapi:1},
    events:{
     onReady:()=>{
      if(!active||watch()?.queue[watch()?.index]!==id)return;
      loading=false;playerReady=true;
      suppress(900);try{player.cueVideoById(id)}catch{}
      syncPlayer(true);
      render();
     },
     onStateChange:e=>{
      if(Date.now()<suppressUntil||!active||!online()||!watch()?.ready.every(Boolean))return;
      if(e.data===1&&watch()?.playing===false)act({type:'watch',kind:'play'});
      else if(e.data===2&&watch()?.playing===true)act({type:'watch',kind:'pause'});
      else if(e.data===0&&seat()===0)act({type:'watch',kind:'ended'});
     },
     onError:e=>{toast('This video cannot play here. Try another embeddable YouTube video (error '+e.data+').')}
    }
   });
  }catch(e){loading=false;toast(e.message);$('watchStatus').textContent=e.message}
 }
 function syncPlayer(force=false){
  const s=watch();
  if(!playerReady||!player||!s?.open||s.index<0)return;
  const expected=watchPosition(s,hostTime());
  const actual=frameTime();
  const drift=Math.abs(expected-actual);
  if(force||drift>(s.playing?2.5:1.2)){
   suppress(1500);
   try{player.seekTo(expected,true)}catch{}
  }
  let stateCode;try{stateCode=player.getPlayerState()}catch{return}
  if(s.ready.every(Boolean)){
   if(s.playing&&stateCode!==1){suppress(1700);try{player.playVideo();localPlaying=true}catch{}}
   else if(!s.playing&&stateCode===1){suppress(900);try{player.pauseVideo();localPlaying=false}catch{}}
  }else if(stateCode===1){suppress(1000);try{player.pauseVideo()}catch{}}
 }
 function render(){
  const s=watch();if(!s)return;
  const open=s.open;active=open;
  $('watch').hidden=!open;
  if(!open){if(wasOpen)disposePlayer();wasOpen=false;queueKey='';queueExpanded=true;queueInitiallySet=false;return}
  wasOpen=true;
  const connected=online(),ready=s.ready.every(Boolean),self=seat();
  const selected=s.index>=0?s.queue[s.index]:null;
  $('watchPresence').textContent=connected?'● CONNECTED':'○ WAITING / OFFLINE';
  $('watchPresence').classList.toggle('watch-online',connected);
  $('watchPresence').classList.toggle('watch-offline',!connected);
  $('watchCount').textContent=s.queue.length+' / '+MAX_QUEUE;
  const queueToggle=$('watchQueueToggle');
  queueToggle.disabled=!s.queue.length;
  $('watchQueueToggleText').textContent='Playlist · '+s.queue.length;
  if(!queueInitiallySet&&s.queue.length&&s.index>=0){
   queueInitiallySet=true;
   queueExpanded=true;
  }
  if(!s.queue.length){queueExpanded=true;queueInitiallySet=false}
  $('watchSidebar').dataset.expanded=String(queueExpanded);
  queueToggle.setAttribute('aria-expanded',String(queueExpanded));
  $('watchEmpty').hidden=!!selected;
  if(!selected)$('watchStartPlayback').hidden=true;
  $('watchReady').disabled=!connected||!selected||s.ready[self];
  $('watchReady').textContent=s.ready[self]?'✓ You’re ready':'✓ I’m ready';
  $('watchReadyText').textContent=!selected?'Add a video to start your watch party.':
    !connected?'Waiting for your partner to reconnect…':
    ready?'Both ready! Watch together and use shared controls.':
    s.ready[self]?'You’re ready. Waiting for your partner…':'Both players must tap Ready before synchronized playback.';
  $('watchStatus').textContent=!selected?'Your shared watchlist is empty.':
    !connected?'Playback controls paused while offline.':
    !ready?'Ready check: '+s.ready.filter(Boolean).length+'/2 confirmed':
    loading?'Preparing YouTube player…':s.playing?'▶ Watching together':'Ⅱ Paused for both of you';
  $('watchPlay').disabled=!connected||!selected||!ready;
  $('watchPlay').textContent=s.playing?'Ⅱ Pause':'▶ Play';
  $('watchSync').disabled=!connected||!selected;
  $('watchNext').disabled=!connected||s.index<0||s.index>=s.queue.length-1;
  $('watchAdd').disabled=!connected||s.queue.length>=MAX_QUEUE;
  const key=s.queue.join(',')+'|'+s.index+'|'+connected;
  if(key!==queueKey){
   const q=$('watchQueue');const y=q.scrollTop;
   q.innerHTML=s.queue.length?s.queue.map((id,i)=>'<div class="watch-queue-item '+(i===s.index?'current':'')+'"><img class="watch-queue-thumb" src="https://i.ytimg.com/vi/'+id+'/mqdefault.jpg" alt="" loading="lazy"><button type="button" class="watch-queue-play" data-watch-select="'+i+'" '+(!connected||i===s.index?'disabled':'')+'><b>'+(i===s.index?'▶ NOW PLAYING':'PLAY VIDEO')+'</b><small>youtube.com/watch?v='+esc(id)+'</small></button><button type="button" class="watch-queue-remove" data-watch-remove="'+i+'" '+(!connected?'disabled':'')+' aria-label="Remove video '+(i+1)+'" title="Remove video">×</button></div>').join(''):'<div class="watch-queue-empty">Nothing queued yet. Add a video to begin ♡</div>';
   q.scrollTop=y;queueKey=key;
  }
  if(selected!==currentId)setVideo(selected);
  if(selected&&playerReady)syncPlayer();
 }
 function update(){
  const s=watch();if(!s?.open)return;
  if(s.index>=0&&playerReady){
   let iframePlaying=false;try{iframePlaying=player.getPlayerState()===1}catch{}
   $('watchStartPlayback').hidden=!(s.playing&&s.ready.every(Boolean)&&!iframePlaying);
   const time=watchPosition(s,hostTime()),duration=frameDuration();
   if(!seekBusy){
    const slider=$('watchSeek');slider.disabled=!online()||!s.ready.every(Boolean)||!duration;
    slider.max=String(Math.max(1,Math.floor(duration)));
    slider.value=String(Math.min(Math.floor(duration||1),Math.floor(time)));
   }
   $('watchClock').textContent=timestamp(time)+' / '+timestamp(duration);
   if(s.playing&&online())syncPlayer();
  }else{$('watchStartPlayback').hidden=true;$('watchClock').textContent='0:00 / 0:00';$('watchSeek').disabled=true}
 }
 function reaction(emoji){
  if(!REACTIONS.includes(emoji)||!watch()?.open)return;
  const holder=$('watchReactions'),el=document.createElement('span');
  el.className='watch-float';el.textContent=emoji;
  el.style.left=(12+Math.floor(Math.random()*73))+'%';
  holder.append(el);setTimeout(()=>el.remove(),1700);
  if(holder.childElementCount>16)holder.firstElementChild.remove();
 }
 function startReaction(emoji){
  if(!online()||!REACTIONS.includes(emoji)||Date.now()-reactionTime<320)return;
  reactionTime=Date.now();reaction(emoji);
  send({type:'watch-reaction',emoji,epoch:state().epoch,origin:seat()});
 }
 function init(){
  $('watchQueueToggle').onclick=()=>{queueExpanded=!queueExpanded;$('watchSidebar').dataset.expanded=String(queueExpanded);$('watchQueueToggle').setAttribute('aria-expanded',String(queueExpanded))};
  $('watchLaunch').onclick=()=>{if(!online()){toast('Connect with your partner first.');return}act({type:'watch',kind:'open'})};
  $('watchClose').onclick=()=>act({type:'watch',kind:'close'});
  $('watchAddForm').onsubmit=e=>{
   e.preventDefault();if(!online())return;
   const input=$('watchUrl'),id=parseYoutubeId(input.value);
   if(!id){toast('Please paste a valid YouTube video link.');return}
   if(watch()?.queue.includes(id)){toast('That video is already in the queue.');return}
   act({type:'watch',kind:'add',url:input.value.trim()});input.value='';
  };
  $('watchReady').onclick=()=>act({type:'watch',kind:'ready'});
  $('watchStartPlayback').onclick=()=>{if(!watch()?.ready.every(Boolean)||!online()||!playerReady)return;try{player.playVideo()}catch{toast('Tap the play button in the YouTube player to begin.')}update()};
  $('watchPlay').onclick=()=>{const s=watch();if(!s?.ready.every(Boolean))return;act({type:'watch',kind:s.playing?'pause':'play'});if(!s.playing&&playerReady){try{player.playVideo()}catch{}}};
  $('watchSync').onclick=()=>{syncPlayer(true);if(seat()===1)send({type:'sync'});toast('Playback synchronized with the room.')};
  $('watchNext').onclick=()=>act({type:'watch',kind:'next'});
  $('watchSeek').addEventListener('pointerdown',()=>seekBusy=true);
  $('watchSeek').addEventListener('pointerup',()=>seekBusy=false);
  $('watchSeek').addEventListener('change',e=>{
   seekBusy=false;
   const seconds=Number(e.target.value);
   if(Number.isFinite(seconds)&&online()&&watch()?.ready.every(Boolean))act({type:'watch',kind:'seek',seconds});
  });
  $('watchQueue').onclick=e=>{
   const select=e.target.closest('[data-watch-select]'),remove=e.target.closest('[data-watch-remove]');
   if(select)act({type:'watch',kind:'select',index:Number(select.dataset.watchSelect)});
   if(remove)act({type:'watch',kind:'remove',index:Number(remove.dataset.watchRemove)});
  };
  document.querySelectorAll('[data-watch-react]').forEach(b=>b.onclick=()=>startReaction(b.dataset.watchReact));
  setInterval(update,1200);
 }
 return {init,render,update,reaction,dispose:disposePlayer};
}
