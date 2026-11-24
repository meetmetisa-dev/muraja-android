// Compare transcripts without changing the displayed Quran text.
function spellings(word) {
  const base = word.normalize('NFKC').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي');
  const strip = value => value.replace(/[^ء-غف-ي]/g,'');
  return [strip(base), strip(base.replace(/ٰ/g,'ا'))];
}
function wordKeys(text) {
  return text.trim().split(/\s+/).map(spellings).filter(forms => forms[0].length);
}
// Only accept the whole ayah. An insertion, omission or reordering blocks reveal.
function matchesAyah(reference, heard) {
  const expected = wordKeys(reference), actual = wordKeys(heard);
  return expected.length > 0 && expected.length === actual.length &&
    expected.every((forms,i) => forms.some(form => actual[i].includes(form)));
}

// Recognizers may separate clitics or join them. Compare the letters in sequence.
function speechKey(text) {
  return wordKeys(text).map(([word]) => word
    .replace(/^((?:و|ف)?(?:ب)?ال)رحمان$/, '$1رحمن')
    .replace(/^((?:و|ف)?(?:ب)?ال)حياه$/, '$1حياة')
  ).join('');
}
const openingLetters = {
  '2:1':'الم','3:1':'الم','7:1':'المص','10:1':'الر','11:1':'الر','12:1':'الر','13:1':'المر',
  '14:1':'الر','15:1':'الر','19:1':'كهيعص','20:1':'طه','26:1':'طسم','27:1':'طس','28:1':'طسم',
  '29:1':'الم','30:1':'الم','31:1':'الم','32:1':'الم','36:1':'يس','38:1':'ص','40:1':'حم',
  '41:1':'حم','42:1':'حم','42:2':'عسق','43:1':'حم','44:1':'حم','45:1':'حم','46:1':'حم',
  '50:1':'ق','68:1':'ن'
};
const letterNames={ا:['الف'],ل:['لام'],م:['ميم'],ص:['صاد'],ر:['را','راء'],ك:['كاف'],ه:['ها','هاء'],
  ي:['يا','ياء'],ع:['عين'],ط:['طا','طاء'],س:['سين'],ح:['حا','حاء'],ق:['قاف'],ن:['نون']};
function references(verse){
  const plain=conventional[verse.ref] || verse.text;
  const variants=new Set([speechKey(plain),speechKey(verse.text)]);
  const opening=openingLetters[verse.ref];
  if(opening){
    let prefixes=[''];
    for(const letter of opening) prefixes=prefixes.flatMap(prefix=>letterNames[letter].map(name=>prefix+name));
    const tail=speechKey(plain).slice(opening.length);
    prefixes.forEach(prefix=>variants.add(prefix+tail));
  }
  if(verse.number===1 && verse.chapter.id!==1 && verse.chapter.id!==9){
    for(const value of [...variants]) variants.add('بسماللهالرحمنالرحيم'+value);
  }
  return [...variants].sort((a,b)=>b.length-a.length);
}
// Recompute interim hypotheses from the last final segment. Never accumulate partial callbacks.
function scanSpeech(verses, start, input) {
  let index=start, rest=input;
  while(rest && index<verses.length){
    const options=references(verses[index]);
    const match=options.find(option=>option && rest.startsWith(option));
    if(!match) return {index,tail:rest,mismatch:!options.some(o=>o.startsWith(rest))};
    index++;rest=rest.slice(match.length);
  }
  return {index,tail:rest,mismatch:!!rest};
}

// Compare alternative transcripts against the same cursor. Discard a repeated lead-in
// only if it is an exact suffix of previously matched words at a word boundary.
function matchSegment(verses, cursor, fragment, hypotheses, history) {
  let best = null;
  const suffixes = new Set();
  let suffix = '';
  for(const word of history.trim().split(/\s+/).reverse()){
    suffix=word+suffix;
    if(suffix) suffixes.add(suffix);
  }
  function consider(input, transcript) {
    const candidate = scanSpeech(verses,cursor,input);
    const score = [candidate.index, Number(!candidate.mismatch), candidate.mismatch ? 0 : candidate.tail.length];
    if (!best || score[0]>best.score[0] || (score[0]===best.score[0] &&
        (score[1]>best.score[1] || (score[1]===best.score[1] && score[2]>best.score[2])))) {
      best={...candidate,score,transcript};
    }
  }
  for(const transcript of hypotheses) {
    const words=transcript.trim().split(/\s+/).map(speechKey).filter(Boolean);
    const heard=words.join('');
    if(!heard) continue;
    consider(fragment+heard,transcript);
    if(fragment) consider(heard,transcript);
    let prefix='';
    for(let i=0;i<words.length-1;i++){
      prefix+=words[i];
      if(fragment && fragment.endsWith(prefix)) consider(fragment+heard.slice(prefix.length),transcript);
      if(suffixes.has(prefix)){
        const rest=heard.slice(prefix.length);
        consider(fragment+rest,transcript);
        if(fragment) consider(rest,transcript);
      }
    }
  }
  return best;
}

// Locate the first differing reference word using the same normalized spellings
// as the matcher. If a spelling cannot be mapped safely, flag the ayah only.
function firstDifferentWord(verse, remainder){
  const original=verse.text.split(/\s+/).filter(w=>speechKey(w));
  let longest=-1, position=-1;
  for(const variant of references(verse)){
    let common=0;
    while(common<variant.length && common<remainder.length && variant[common]===remainder[common])common++;
    if(common<=longest)continue;
    longest=common;position=-1;
    for(const text of [verse.text,conventional[verse.ref] || verse.text]){
      const words=text.split(/\s+/).map(speechKey).filter(Boolean);
      if(words.length!==original.length || !variant.endsWith(words.join('')))continue;
      let offset=variant.length-words.join('').length;
      if(common<offset)break;
      for(let i=0;i<words.length;i++){
        offset+=words[i].length;
        if(common<offset){position=i;break;}
      }
      break;
    }
  }
  return position;
}
