'use strict';
let activeAudio=null;
function stopRecitationAudio(message=''){
  if(!activeAudio)return;
  const player=activeAudio;
  activeAudio=null;
  player.onended=null;player.onerror=null;
  player.pause();player.removeAttribute('src');player.load();
  el('stopReference').hidden=true;
  el('audioStatus').textContent=message;
}
window.stopRecitationAudio=stopRecitationAudio;
function initRecitationAudio(){
  el('stopReference').onclick=()=>stopRecitationAudio('Playback stopped.');
  for(const id of ['playCount','audioScope'])el(id).onchange=()=>stopRecitationAudio();
  el('playReference').onclick=()=>{
    const count=Number(el('playCount').value);
    stopRecitationAudio();
    if(!Number.isInteger(count) || count<1 || count>99){
      el('audioStatus').textContent='Enter a whole number from 1 to 99.';return;
    }
    if(pending){cancelCapture();drawPage();el('result').textContent='Microphone off during playback.';}
    const chapter=chapters[Number(el('surah').value)-1];
    const whole=el('audioScope').value==='surah';
    const first=whole?1:Number(el('ayah').value),last=whole?chapter.verses.length:first;
    const player=new Audio();
    activeAudio=player;
    let ayah=first, pass=1;
    const fail=()=>{
      if(activeAudio===player)stopRecitationAudio('Audio unavailable. Check your connection and tap Play recitation to retry.');
    };
    function play(){
      const part=n=>String(n).padStart(3,'0');
      player.src='https://everyayah.com/data/Alafasy_128kbps/'+part(chapter.id)+part(ayah)+'.mp3';
      el('audioStatus').textContent='Play '+pass+' of '+count+' · '+chapter.transliteration+' '+chapter.id+':'+ayah;
      player.play().catch(fail);
    }
    player.onerror=fail;
    player.onended=()=>{
      if(activeAudio!==player)return;
      if(ayah<last)ayah++;
      else if(pass<count){pass++;ayah=first;}
      else {stopRecitationAudio('Completed '+count+(count===1?' play.':' plays.'));return;}
      play();
    };
    el('stopReference').hidden=false;play();
  };
}
