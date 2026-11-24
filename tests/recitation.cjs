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
console.log('All verse reference and recitation session checks passed.');
