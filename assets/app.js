'use strict';
const el = id => document.getElementById(id);
const chapters = JSON.parse(Practice.chapters());
const done = new Set(JSON.parse(localStorage.getItem('practiced') || '[]'));
let [s,a] = JSON.parse(localStorage.getItem('position') || '[0,0]');
let hidden = localStorage.getItem('hidden') === 'true', hints = 0;
const key = () => (s+1)+':'+(a+1);
const verse = () => chapters[s].verses[a].text;
function draw(){
  const words=verse().split(/\s+/);
  el('ref').textContent=chapters[s].transliteration+' · '+key();
  el('verse').textContent=hidden ? words.slice(0,hints).join(' ') : verse();
  el('veil').hidden=!hidden || hints===words.length;
  el('veil').textContent=hints ? (words.length-hints)+' words hidden' : 'Recite this ayah from memory';
  el('hide').textContent=hidden?'Show ayah':'Hide ayah';
  el('hint').hidden=!hidden || hints===words.length;
  el('complete').textContent=done.has(key())?'✓ Practiced · undo':'Mark as practiced';
  el('prev').disabled=s===0 && a===0;
  el('next').disabled=s===chapters.length-1 && a===chapters[s].verses.length-1;
}
function select(si,ai){
  s=si; a=ai; hints=0;
  el('surah').value=s;
  const list=el('ayah'); list.textContent='';
  chapters[s].verses.forEach((v,i)=>list.add(new Option(v.id,i)));
  list.value=a;
  localStorage.setItem('position',JSON.stringify([s,a]));
  el('result').hidden=true;
  draw();
}
function section(practice){
  el('practice').hidden=!practice; el('progress').hidden=practice;
  el('practiceTab').setAttribute('aria-selected',practice);
  el('progressTab').setAttribute('aria-selected',!practice);
  if(practice) return;
  el('total').textContent=done.size+' / 6,236';
  document.querySelector('#bar i').style.width=(100*done.size/6236)+'%';
  const records=el('records'); records.textContent=done.size?'':'Mark an ayah as practiced to see it here.';
  chapters.forEach((chapter,index)=>{
    const practiced=chapter.verses.filter(v=>done.has(chapter.id+':'+v.id));
    if(!practiced.length) return;
    const row=document.createElement('button'); row.className='row';
    row.textContent=chapter.transliteration+' · '+practiced.length+' / '+chapter.verses.length+' practiced';
    row.onclick=()=>{select(index,practiced[0].id-1); section(true);};
    records.appendChild(row);
  });
}
window.voiceResult=(ref,words,error)=>{
  if(ref!==key()) return;
  const panel=el('result'); panel.hidden=false; panel.textContent='';
  function line(value,arabic=false){
    const node=document.createElement('p'); node.textContent=value;
    if(arabic){node.dir='rtl';node.lang='ar';}
    panel.appendChild(node);
  }
  if(error){line(error);return;}
  const summary=compare(verse(),words);
  line(summary.matched+' of '+summary.total+' words matched in order');
  line('Your phone heard'); line(words,true);
  if(summary.missed.length){line('Reference words to review');line(summary.missed.join(' · '),true);}
  if(summary.extra.length){line('Additional words heard');line(summary.extra.join(' · '),true);}
};
chapters.forEach((c,i)=>el('surah').add(new Option(c.id+'. '+c.transliteration+' · '+c.name,i)));
el('surah').onchange=e=>select(Number(e.target.value),0);
el('ayah').onchange=e=>select(s,Number(e.target.value));
el('next').onclick=()=>a+1<chapters[s].verses.length?select(s,a+1):select(s+1,0);
el('prev').onclick=()=>a>0?select(s,a-1):select(s-1,chapters[s-1].verses.length-1);
el('hide').onclick=()=>{hidden=!hidden; hints=0; localStorage.setItem('hidden',hidden); el('result').hidden=true;draw();};
el('hint').onclick=()=>{hints++; draw();};
el('complete').onclick=()=>{
  if(done.has(key()))done.delete(key()); else done.add(key());
  localStorage.setItem('practiced',JSON.stringify([...done]));draw();
};
el('recite').onclick=()=>Practice.listen(key());
el('practiceTab').onclick=()=>section(true);
el('progressTab').onclick=()=>section(false);
select(s,a);section(true);
