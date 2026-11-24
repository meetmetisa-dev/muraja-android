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
  showJourney();
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
el('region').onchange=()=>{renderRegion();showJourney();};el('gardenTab').onclick=gardenMap;

function regionDone(index){
  return chapters.slice(index*10,index*10+10).every(c=>c.verses.every(v=>checked.has(c.id+':'+v.id)));
}
function entireQuranDone(){
  return juzStarts.every((start,j)=>verses.slice(start,juzStarts[j+1] || verses.length).every(v=>checked.has(v.ref)));
}
function journeyTransition(changed){
  for(const region of changed){
    if(!regionDone(region)) continue;
    let destination=null;
    for(let step=1;step<regions.length;step++){
      const next=(region+step)%regions.length;
      if(!regionDone(next)){destination=next;break;}
    }
    localStorage.setItem('keeperTrip',JSON.stringify({from:region,to:destination}));
    el('region').value=region;
    return true;
  }
  return false;
}
function showJourney(){
  const complete=entireQuranDone();
  el('harvest').hidden=!complete;
  const trip=JSON.parse(localStorage.getItem('keeperTrip') || 'null');
  const traveling=trip && trip.to!==null && !complete;
  el('travel').hidden=!traveling;
  el('travelNote').textContent=traveling?regions[trip.from]+' complete. Your garden keeper is walking to '+regions[trip.to]+'.':'';
  if(traveling){
    const sprite=el('keeper');
    if(sprite.animate) sprite.animate([{left:'4%'},{left:'72%'}],{duration:1700,fill:'forwards'});
    el('travel').textContent='Enter '+regions[trip.to];
    el('travel').onclick=()=>{
      el('region').value=trip.to;localStorage.setItem('keeperTrip','null');renderRegion();showJourney();
      const next=chapters.slice(trip.to*10,trip.to*10+10).find(c=>gardenState(c).matched<c.verses.length);
      if(next)selectGarden(next);
    };
  }
  if(complete){
    const list=el('completedRegions');list.textContent='';
    regions.forEach(name=>list.appendChild(node('li','✓ '+name)));
    el('pace').value=localStorage.getItem('reviewPace') || '30';showAssignment();
  }
}
// One assignment per practice day. Index by pace so changing plans preserves each cycle.
function assignment(pace, session){
  const slot=session%pace;
  const j=pace===60?Math.floor(slot/2):pace===10?slot*3:slot;
  const end=juzStarts[j+1] || verses.length;
  const mid=Math.floor((juzStarts[j]+end)/2);
  if(pace===60)return {start:slot%2?mid:juzStarts[j],end:slot%2?end:mid,label:'Juz '+(j+1)+(slot%2?' · second half':' · first half')};
  return {start:juzStarts[j],end:pace===10?(juzStarts[j+3] || verses.length):end,label:pace===10?'Juz '+(j+1)+'–'+(j+3):'Juz '+(j+1)};
}
function showAssignment(){
  const pace=Number(el('pace').value);
  const session=Number(localStorage.getItem('reviewSession.'+pace) || 0);
  const plan=assignment(pace,session);
  const saved=Number(localStorage.getItem('reviewCursor.'+pace));
  const start=saved>=plan.start && saved<plan.end?saved:plan.start;
  el('assignment').textContent='Session '+(session%pace+1)+' of '+pace+' · '+plan.label+' · '+verses[plan.start].ref+'–'+verses[plan.end-1].ref+'. Aim for one session per day.';
  el('reviewStart').onclick=()=>{
    section(true);openPage(pageFor(start),false,start);quest={review:true,pace,end:plan.end};drawPage();
  };
}
function completeAssignment(review){
  localStorage.setItem('reviewCursor.'+review.pace,-1);
  const key='reviewSession.'+review.pace;
  localStorage.setItem(key,Number(localStorage.getItem(key)||0)+1);
}
el('pace').onchange=()=>{localStorage.setItem('reviewPace',el('pace').value);showAssignment();};
