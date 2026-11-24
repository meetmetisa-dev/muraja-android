const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const nodes = {}, storage = new Map();
class Element { getContext(){return null;} setAttribute() {} append() {} appendChild() {} scrollIntoView() {} add() {} }
const context = vm.createContext({
  assert, window:{}, document:{
    body:{classList:{remove(){},add(){}}}, getElementById:id=>nodes[id] ||= new Element(),
    createElement:()=>new Element(), createTextNode:()=>new Element()
  },
  localStorage:{getItem:k=>storage.get(k), setItem:(k,v)=>storage.set(k,String(v))},
  Option:Element, Practice:{chapters:()=>fs.readFileSync('assets/quran.json','utf8'),cancel(){},listen(){},finish(){}}
});
for(const file of ['spellings','pages','match','app','garden','atlas']){
  vm.runInContext(fs.readFileSync('assets/'+file+'.js','utf8'),context);
}
vm.runInContext(`
for(let i=0;i<verses.length;i++) {
  for(const reference of [verses[i].text, conventional[verses[i].ref] || verses[i].text])
    assert.equal(scanSpeech(verses,i,speechKey(reference)).index,i+1,verses[i].ref);
}
el('surah').onchange({target:{value:'2'}});el('recite').onclick();const id=pending;
window.voiceEvent(id,'partial','ألف لام ميم');assert.equal(preview,8);assert.equal(cursor,7);
window.voiceEvent(id,'final','ألف لام ميم ذلك الكتاب');assert.equal(cursor,8);assert.equal(pending,id);
window.voiceEvent(id,'final','لا ريب فيه هدى للمتقين');assert.equal(cursor,9);
window.voiceEvent(id,'final','الذين خطأ');assert.equal(cursor,9);assert.equal(el('recite').textContent,'Finish');
el('surah').onchange({target:{value:'114'}});assert.equal(verses[cursor].ref,'114:1');el('recite').onclick();
window.voiceEvent(pending,'final','بسم الله الرحمن الرحيم قل أعوذ برب الناس ملك الناس');assert.equal(verses[cursor].ref,'114:3');
el('recite').onclick();assert(finishing);window.voiceEvent(pending,'end','Finished.');assert.equal(pending,null);
`, context);
vm.runInContext(`
openPage(0,true);el('recite').onclick();
window.voiceEvent(pending,'final',verses[0].text+' '+verses[1].text);
assert.equal(cursor,2);
window.voiceEvent(pending,'final',['رب العالمين الرحيم','رب العالمين الرحمان الرحيم']);
assert.equal(cursor,3);
window.voiceEvent(pending,'final',['مالك يوم']);
window.voiceEvent(pending,'final',['يوم الدين']);
assert.equal(cursor,4);
window.voiceEvent(pending,'final',['مالك يوم الدين','إياك خطأ']);
assert.equal(cursor,4);
openPage(0,true);el('recite').onclick();
el('surah').onchange({target:{value:'67'}});el('recite').onclick();
window.voiceEvent(pending,'final',verses[cursor].text);
const mulkTwo=cursor;
window.voiceEvent(pending,'final','الذي خلق الموت والحياه ليبلوكم ايكم احسن عملا');
assert.equal(cursor,mulkTwo);assert(fragment);assert(feedback.includes('First part matched'));
window.voiceEvent(pending,'final','وهو العزيز الغفور');assert.equal(verses[cursor].ref,'67:3');
assert.equal(speechKey('وجه'), 'وجه');
assert.notEqual(speechKey('عبده'),speechKey('عبدة'));
openPage(0,true);el('recite').onclick();
const wholeSession=pending;
for(let i=0;i<verses.length;i++){
  const text=conventional[verses[i].ref] || verses[i].text;
  window.voiceEvent(wholeSession,'final',[text]);
  assert.equal(cursor,i+1,verses[i].ref);
  if(i+1<verses.length) assert.equal(pending,wholeSession);
}
assert.equal(page,603);assert.equal(cursor,6236);assert.equal(pending,null);
assert.equal(el('harvest').hidden,false);
`,context);
console.log('Passed overlap, alternative transcript, split word group and 6,236 consecutive ayah callbacks.');

vm.runInContext(`
checked.clear();el('region').value=0;gardenMap();selectGarden(chapters[0]);el('beginQuest').onclick();el('recite').onclick();
window.voiceEvent(pending,'partial',verses[0].text);assert.equal(gardenState(chapters[0]).matched,0);
window.voiceEvent(pending,'final','خطأ');assert.equal(gardenState(chapters[0]).matched,0);
window.voiceEvent(pending,'final',verses.slice(0,7).map(v=>v.text).join(' '));
assert.equal(gardenState(chapters[0]).matched,5);assert.equal(pending,null);assert.equal(quest,null);
selectGarden(chapters[0]);el('beginQuest').onclick();el('recite').onclick();
window.voiceEvent(pending,'final',verses.slice(5,9).map(v=>v.text).join(' '));
assert.equal(gardenState(chapters[0]).matched,7);assert.equal(gardenState(chapters[1]).matched,0);
`,context);
console.log('Adventure progression passed.');
vm.runInContext(`
checked.clear();for(const v of verses) checked.add(v.ref);
for(const pace of [60,30,10]){
 let index=0;
 for(let s=0;s<pace;s++){const plan=assignment(pace,s);assert.equal(plan.start,index);assert(plan.end>plan.start);index=plan.end;}
 assert.equal(index,verses.length);
}
assert(entireQuranDone());checked.delete('114:5');assert(!entireQuranDone());
checked.delete('1:7');el('region').value=0;gardenMap();selectGarden(chapters[0]);
el('beginQuest').onclick();el('recite').onclick();window.voiceEvent(pending,'final',verses[6].text);
assert.equal(el('travel').hidden,false);el('travel').onclick();assert.equal(Number(el('region').value),29);
el('beginQuest').onclick();el('recite').onclick();window.voiceEvent(pending,'final',verses[verses.length-2].text);
assert.equal(el('harvest').hidden,false);
el('pace').value='60';el('pace').onchange();el('reviewStart').onclick();assert(quest.review);
window.voiceEvent(pending,'final',verses[0].text);
assert.equal(localStorage.getItem('reviewCursor.60'),'1');
`,context);
console.log('Travel, full completion and three review cycles passed.');

vm.runInContext(`
checked.clear();localStorage.setItem('reviewSession.30',0);localStorage.setItem('reviewCursor.30',-1);
openPage(0,true);openPlanner();el('pace').value='30';el('pace').onchange();el('reviewStart').onclick();
assert(quest.review && pending);assert.equal(verses[cursor].ref,'1:1');
el('surah').onchange({target:{value:'2'}});el('ayah').onchange({target:{value:'51'}});
assert.equal(verses[cursor].ref,'2:51');assert.equal(pending,null);
el('recite').onclick();window.voiceEvent(pending,'final',verses[cursor].text);assert.equal(verses[cursor].ref,'2:52');
openPlanner();el('planFromHere').onclick();el('reviewStart').onclick();assert.equal(verses[cursor].ref,'2:52');assert(pending);
for(let i=0;i<30;i++){
 openPlanner();selectIsland(i);el('atlasPractice').onclick();
 assert.equal(cursor,juzStarts[i]);assert.equal(quest.end,juzStarts[i+1]||verses.length);assert(pending);
}
el('surah').onchange({target:{value:'114'}});el('ayah').onchange({target:{value:'6'}});assert.equal(cursor,6235);
`,context);
console.log('First-use planning, arbitrary ayah starts, and all 30 playable map regions passed.');
