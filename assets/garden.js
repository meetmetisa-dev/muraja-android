// Regions group adjacent surahs for navigation; each garden belongs to one surah.
const regions=['Spring Vale','Cedar Hills','Willow Marsh','Apricot Ridge','Olive Terraces','Jasmine Coast','Date Palm Oasis','Moonflower Glen','Fig Orchard','Saffron Meadow','Amber Highlands','Starfall Bay'];

function gardenState(chapter){
  const missing=chapter.verses.filter(v=>!checked.has(chapter.id+':'+v.id));
  return {matched:chapter.verses.length-missing.length, total:chapter.verses.length, next:missing.length?missing[0].id:1};
}
function gardenMap(){
  section(true);quest=null;
  el('practice').hidden=true;el('adventure').hidden=false;
  el('practiceTab').setAttribute('aria-pressed',false);el('gardenTab').setAttribute('aria-pressed',true);
  renderRegion();
}
function renderRegion(){
  const region=Number(el('region').value)||0;
  localStorage.setItem('gardenRegion',region);
  const map=el('plots');map.textContent='';
  let grown=0;
  for(const chapter of chapters){
    const state=gardenState(chapter);
    if(state.matched===state.total) grown++;
    if(Math.floor((chapter.id-1)/10)!==region) continue;
    const button=node('button','', 'plot');
    const status=state.matched===state.total?'🌳':state.matched?'🌱':'◌';
    button.append(node('span',status,'plant'),node('b',chapter.id+' · '+chapter.transliteration),node('small',state.matched+' / '+state.total));
    button.onclick=()=>selectGarden(chapter);
    map.appendChild(button);
  }
  el('gardenTotal').textContent=grown+' / 114 gardens grown';
  el('gardenPlan').hidden=true;
}
function selectGarden(chapter){
  const state=gardenState(chapter),start=state.next;
  let last=start;
  while(last<state.total && last<start+4 && !checked.has(chapter.id+':'+(last+1))) last++;
  el('gardenPlan').hidden=false;
  el('gardenName').textContent=chapter.transliteration;
  el('gardenGoal').textContent=(state.matched===state.total?'Review':'Grow your garden')+' · ayahs '+start+'–'+last;
  el('beginQuest').onclick=()=>{
    const index=verses.findIndex(v=>v.ref===chapter.id+':'+start);
    section(true);openPage(pageFor(index),false,index);
    quest={end:index+last-start+1,chapter};drawPage();
  };
  el('gardenPlan').scrollIntoView({block:'nearest'});
}
regions.forEach((name,i)=>el('region').add(new Option(name+' · '+(10*i+1)+'–'+Math.min(114,10*i+10),i)));
el('region').value=localStorage.getItem('gardenRegion') || 0;
el('region').onchange=renderRegion;el('gardenTab').onclick=gardenMap;
