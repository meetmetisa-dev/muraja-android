'use strict';
const el = id => document.getElementById(id);
const chapters = JSON.parse(Practice.chapters());
const verses = [];
chapters.forEach(c => c.verses.forEach(v => verses.push({
  text:v.text, chapter:c, number:v.id, ref:c.id+':'+v.id
})));
const pageFor = index => pageStarts.findIndex((start,i) => start<=index && (i===603 || index<pageStarts[i+1]));
const legacy = new Set(JSON.parse(localStorage.getItem('practiced') || '[]'));
const checked = new Set(JSON.parse(localStorage.getItem('checkedAyahs') || '[]'));
const [oldS,oldA] = JSON.parse(localStorage.getItem('position') || '[0,0]');
const oldIndex = verses.findIndex(v => v.ref===(oldS+1)+':'+(oldA+1));
let page = Number(localStorage.getItem('mushafPage') || pageFor(Math.max(0,oldIndex)));
if (!Number.isInteger(page) || page<0 || page>=604) page=0;
let cursor, end, sequence=0, pending=null;
const digits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
function node(tag, text, cls) {
  const item=document.createElement(tag);
  if(text) item.textContent=text;
  if(cls) item.className=cls;
  return item;
}
function drawPage() {
  const first=verses[pageStarts[page]], last=verses[end-1];
  el('page').value=page;
  el('surah').value=cursor<end ? verses[cursor].chapter.id : last.chapter.id;
  el('range').textContent=first.chapter.transliteration+' · '+first.ref+' – '+last.ref;
  el('folio').textContent='Page '+(page+1);
  const sheet=el('sheet'); sheet.textContent='';
  for(let i=pageStarts[page];i<end;i++){
    const v=verses[i];
    if(i===pageStarts[page] || v.number===1) sheet.appendChild(node('h2',v.chapter.name));
    if(i<cursor) sheet.appendChild(document.createTextNode(v.text+' '));
    else {
      for(const forms of wordKeys(v.text)){
        const blank=node('span','', 'blank '+(forms[0].length<3?'short':forms[0].length<5?'medium':'long'));
        blank.setAttribute('aria-hidden','true'); sheet.append(blank,' ');
      }
    }
    sheet.append(node('span','﴿'+digits(v.number)+'﴾','marker'),' ');
  }
  el('prev').disabled=page===0; el('next').disabled=page===603;
  el('target').textContent=cursor===end?'Page complete': 'Recite '+verses[cursor].chapter.transliteration+' · ayah '+verses[cursor].number;
  el('recite').textContent=cursor===end?'Practice this page again':'Recite & check';
}
function openPage(number, restart=false){
  page=number; pending=null; end=pageStarts[page+1] || verses.length;
  const saved=Number(localStorage.getItem('pageCursor.'+page) || pageStarts[page]);
  cursor=restart || !Number.isInteger(saved) || saved<pageStarts[page] || saved>end ? pageStarts[page] : saved;
  localStorage.setItem('pageCursor.'+page,cursor);localStorage.setItem('mushafPage',page);
  el('result').textContent='';drawPage();
}
window.voiceResult=(key,words,error)=>{
  if(key!==pending || cursor>=end) return;
  pending=null;
  if(error){el('result').textContent=error;return;}
  const verse=verses[cursor];
  if(!matchesAyah(verse.text,words)){
    el('result').textContent='The recognized words did not match the full ayah. Try the same ayah again.';
    return;
  }
  checked.add(verse.ref); localStorage.setItem('checkedAyahs',JSON.stringify([...checked]));
  cursor++; localStorage.setItem('pageCursor.'+page,cursor);drawPage();
  el('result').textContent='Ayah '+verse.number+' matched.';
};
function section(practice){
  pending=null;el('practice').hidden=!practice;el('progress').hidden=practice;
  el('practiceTab').setAttribute('aria-pressed',practice);el('progressTab').setAttribute('aria-pressed',!practice);
  if(practice) return;
  el('total').textContent=checked.size+' of 6,236 ayahs matched.'+(legacy.size?' Previously marked as practiced: '+legacy.size+'.':'');
  const records=el('records');records.textContent='';
  for(let i=0;i<604;i++){
    const start=pageStarts[i], stop=pageStarts[i+1] || verses.length;
    const count=verses.slice(start,stop).filter(v=>checked.has(v.ref)).length;
    if(count){const button=node('button','Page '+(i+1)+' · '+count+' / '+(stop-start)+' matched');button.onclick=()=>{section(true);openPage(i)};records.append(button);}
  }
}
chapters.forEach(c=>el('surah').add(new Option(c.id+'. '+c.transliteration,c.id)));
pageStarts.forEach((_,i)=>el('page').add(new Option(i+1,i)));
el('surah').onchange=e=>openPage(pageFor(verses.findIndex(v=>v.chapter.id===Number(e.target.value))));
el('page').onchange=e=>openPage(Number(e.target.value));
el('prev').onclick=()=>openPage(page-1);el('next').onclick=()=>openPage(page+1);
el('recite').onclick=()=>{
  if(cursor===end){openPage(page,true);return;}
  pending=String(++sequence)+'/'+verses[cursor].ref;Practice.listen(pending);
};
el('practiceTab').onclick=()=>section(true);el('progressTab').onclick=()=>section(false);
section(true);openPage(page);
