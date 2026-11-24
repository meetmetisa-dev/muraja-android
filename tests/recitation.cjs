const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const nodes = {}, storage = new Map();
class Element { setAttribute() {} append() {} appendChild() {} add() {} }
const context = vm.createContext({
  assert, window:{}, document:{
    body:{classList:{remove(){},add(){}}}, getElementById:id=>nodes[id] ||= new Element(),
    createElement:()=>new Element(), createTextNode:()=>new Element()
  },
  localStorage:{getItem:k=>storage.get(k), setItem:(k,v)=>storage.set(k,String(v))},
  Option:Element, Practice:{chapters:()=>fs.readFileSync('assets/quran.json','utf8'),cancel(){},listen(){},finish(){}}
});
for(const file of ['spellings','pages','match','app']){
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
const wholeSession=pending;
for(let i=0;i<verses.length;i++){
  const text=conventional[verses[i].ref] || verses[i].text;
  window.voiceEvent(wholeSession,'final',[text]);
  assert.equal(cursor,i+1,verses[i].ref);
  if(i+1<verses.length) assert.equal(pending,wholeSession);
}
assert.equal(page,603);assert.equal(cursor,6236);assert.equal(pending,null);
assert.equal(el('result').textContent,'Recitation complete.');
`,context);
console.log('Passed overlap, alternative transcript, split word group and 6,236 consecutive ayah callbacks.');
