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
