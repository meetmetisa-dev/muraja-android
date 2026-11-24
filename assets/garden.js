// Each region spans the canonical ayahs of one juz, including partial surahs.
const regions=['Spring Vale','Cedar Hills','Willow Marsh','Apricot Ridge','Olive Terraces','Jasmine Coast','Date Palm Oasis','Moonflower Glen','Fig Orchard','Saffron Meadow','Amber Highlands','Starfall Bay','Fern Crossing','Lotus Lake','Mistwood','Pine Reach','Sunflower Fields','Maple Pass','Reed Lagoon','Cherry Bluff','Mint Hollow','Rosewood','Golden Steppe','Sage Springs','Cypress Gate','Clover Downs','Coral Reach','Plum Valley','Silver Grove','Dawn Summit'];

function gardenState(chapter){
  const missing=chapter.verses.filter(v=>!checked.has(chapter.id+':'+v.id));
  return {matched:chapter.verses.length-missing.length, total:chapter.verses.length, next:missing.length?missing[0].id:1};
}
function juzFor(index){return juzStarts.findIndex((n,j)=>index>=n && index<(juzStarts[j+1] || verses.length));}
function regionVerses(j){return verses.slice(juzStarts[j],juzStarts[j+1] || verses.length);}
function regionChapters(j){return [...new Set(regionVerses(j).map(v=>v.chapter))];}
function gardenMap(){
  section(true);quest=null;
  el('practice').hidden=true;el('adventure').hidden=false;
  el('practiceTab').setAttribute('aria-pressed',false);el('gardenTab').setAttribute('aria-pressed',true);
  renderRegion();
  showJourney();
}
function renderRegion(){
  const region=Number(el('region').value)||0;
  localStorage.setItem('juzGardenRegion',region);
  const map=el('plots');map.textContent='';
  const part=regionVerses(region);
  const visible=new Set(part.map(v=>v.chapter));
  let grown=0;
  for(const chapter of chapters){
    const state=gardenState(chapter);
    if(state.matched===state.total) grown++;
    if(!visible.has(chapter)) continue;
    const button=node('button','', 'plot');
    const segment=part.filter(v=>v.chapter===chapter);
    const count=segment.filter(v=>checked.has(v.ref)).length;
    const status=count===segment.length?'🌳':count?'🌱':'◌';
    button.append(node('span',status,'plant'),node('b',chapter.id+' · '+chapter.transliteration),node('small',count+' / '+segment.length));
    button.onclick=()=>selectGarden(chapter);
    map.appendChild(button);
  }
  el('gardenTotal').textContent=grown+' / 114 gardens grown';
  el('gardenPlan').hidden=true;
}
function selectGarden(chapter){
  const region=Number(el('region').value)||0;
  const part=regionVerses(region).filter(v=>v.chapter===chapter);
  if(!part.length)return;
  const missing=part.find(v=>!checked.has(v.ref));
  const start=(missing || part[0]).number;
  let last=start;
  while(last<part[part.length-1].number && last<start+4 && !checked.has(chapter.id+':'+(last+1))) last++;
  el('gardenPlan').hidden=false;
  el('gardenName').textContent=chapter.transliteration;
  el('gardenGoal').textContent=(!missing?'Review':'Grow your garden')+' · ayahs '+start+'–'+last;
  el('beginQuest').onclick=()=>{
    const index=verses.findIndex(v=>v.ref===chapter.id+':'+start);
    section(true);openPage(pageFor(index),false,index);
    quest={end:index+last-start+1,chapter};drawPage();
  };
  el('gardenPlan').scrollIntoView({block:'nearest'});
}
regions.forEach((name,i)=>el('region').add(new Option('Juz '+(i+1)+' · '+name,i)));
el('region').value=localStorage.getItem('juzGardenRegion') || 0;
el('region').onchange=()=>{renderRegion();showJourney();};el('gardenTab').onclick=gardenMap;

function regionDone(index){
  return regionVerses(index).every(v=>checked.has(v.ref));
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
    localStorage.setItem('juzKeeperTrip',JSON.stringify({from:region,to:destination}));
    el('region').value=region;
    return true;
  }
  return false;
}
function showJourney(){
  const complete=entireQuranDone();
  el('harvest').hidden=!complete;
  const trip=JSON.parse(localStorage.getItem('juzKeeperTrip') || 'null');
  const traveling=trip && trip.to!==null && !complete;
  el('travel').hidden=!traveling;
  el('travelNote').textContent=traveling?regions[trip.from]+' complete. Your garden keeper is walking to '+regions[trip.to]+'.':'';
  if(traveling){
    const sprite=el('keeper');
    if(sprite.animate) sprite.animate([{left:'4%'},{left:'72%'}],{duration:1700,fill:'forwards'});
    el('travel').textContent='Enter '+regions[trip.to];
    el('travel').onclick=()=>{
      el('region').value=trip.to;localStorage.setItem('juzKeeperTrip','null');renderRegion();showJourney();
      const next=regionVerses(trip.to).find(v=>!checked.has(v.ref))?.chapter;
      if(next)selectGarden(next);
    };
  }
  if(complete){
    const list=el('completedRegions');list.textContent='';
    regions.forEach((name,i)=>list.appendChild(node('li','✓ Juz '+(i+1)+' · '+name)));

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
  const here=Math.min(cursor,verses.length-1);
  el('planFromHere').textContent='Set plan start to practice position '+verses[here].ref;
  el('planFromHere').onclick=()=>{
    let slot=0;
    while(slot<pace-1 && here>=assignment(pace,slot).end)slot++;
    localStorage.setItem('reviewSession.'+pace,Math.floor(session/pace)*pace+slot);
    localStorage.setItem('reviewCursor.'+pace,here);
    showAssignment();
  };
  const saved=Number(localStorage.getItem('reviewCursor.'+pace));
  const start=saved>=plan.start && saved<plan.end?saved:plan.start;
  el('assignment').textContent='Session '+(session%pace+1)+' of '+pace+' · '+plan.label+' · '+verses[start].ref+'–'+verses[plan.end-1].ref+'. Aim for one session per day.';
  el('reviewStart').onclick=()=>{
    section(true);openPage(pageFor(start),false,start);quest={review:true,pace,end:plan.end};drawPage();el('recite').onclick();
  };
}
function completeAssignment(review){
  localStorage.setItem('reviewCursor.'+review.pace,-1);
  const key='reviewSession.'+review.pace;
  localStorage.setItem(key,Number(localStorage.getItem(key)||0)+1);
}
el('pace').onchange=()=>{localStorage.setItem('reviewPace',el('pace').value);showAssignment();};

function openPlanner(){
  section(true);
  el('practice').hidden=true;el('practiceTab').setAttribute('aria-pressed',false);
  el('planner').hidden=false;el('planTab').setAttribute('aria-pressed',true);
  el('pace').value=localStorage.getItem('reviewPace') || '30';
  showAssignment();updateAtlas();
}
el('planTab').onclick=openPlanner;
el('adventureMap').onclick=openPlanner;
el('harvestPlan').onclick=openPlanner;
