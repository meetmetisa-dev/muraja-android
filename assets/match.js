// Compare only a working copy. Always display the original Quran text.
function tokens(text) {
  return text.trim().split(/\s+/).map(word => ({
    word,
    key: word.replace(/[أإآٱ]/g, 'ا').replace(/ى/g,'ي')
      .replace(/[\u0610-\u061a\u0640\u064b-\u065f\u0670\u06d6-\u06ed]/g,'')
      .replace(/[^\u0621-\u064a]/g,'')
  })).filter(item => item.key);
}
// Longest common subsequence preserves word order and handles repeated words.
function compare(reference, transcript) {
  const expected = tokens(reference), heard = tokens(transcript);
  const rows = Array.from({length:expected.length+1}, () => new Uint16Array(heard.length+1));
  for (let i=1; i<=expected.length; i++)
    for (let j=1; j<=heard.length; j++)
      rows[i][j] = expected[i-1].key === heard[j-1].key ? rows[i-1][j-1]+1 : Math.max(rows[i-1][j],rows[i][j-1]);
  let i=expected.length, j=heard.length;
  const missed=[], extra=[];
  while(i || j) {
    if(i && j && expected[i-1].key===heard[j-1].key) {i--; j--;}
    else if(j && (!i || rows[i][j-1]>=rows[i-1][j])) extra.unshift(heard[--j].word);
    else missed.unshift(expected[--i].word);
  }
  return {matched:expected.length-missed.length, total:expected.length, missed, extra};
}
