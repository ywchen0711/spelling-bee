// node tools/test.mjs: every level has 40 good words with all their parts
import { LEVELS, ORIGIN_ZH, POS_ZH } from '../js/words.js';
let fails = 0;
const ok = (name, cond, info = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) fails++; };
const all = LEVELS.flatMap((l) => l.words.map((w) => w[0].toLowerCase()));
ok('10 levels of 40 words', LEVELS.length === 10 && LEVELS.every((l) => l.words.length === 40), LEVELS.map((l) => l.words.length).join(' '));
ok('no word appears twice', new Set(all).size === all.length, [...all.filter((w, i) => all.indexOf(w) !== i)].join(', '));
const bad = [];
for (const l of LEVELS) for (const [w, pos, def, sent, origin] of l.words) {
  if (!/^[A-Za-z]+$/.test(w)) bad.push(`${w}: letters only`);
  if (!POS_ZH[pos]) bad.push(`${w}: part of speech ${pos}`);
  if (!ORIGIN_ZH[origin]) bad.push(`${w}: origin ${origin}`);
  if (!def || def.length < 8 || def.toLowerCase().includes(w.toLowerCase())) bad.push(`${w}: definition gives the word away`);
  if (!sent.toLowerCase().includes(w.toLowerCase())) bad.push(`${w}: sentence lacks the word`);
}
ok('every word has a part of speech, origin, definition and a sentence using it', bad.length === 0, bad.slice(0, 6).join(' | '));
const avg = LEVELS.map((l) => (l.words.reduce((a, w) => a + w[0].length, 0) / 40).toFixed(1));
// level 10 is real winning words: hard because they are rare, not because they are long
ok('levels 1–9 get longer and harder', avg.slice(0, 9).every((a, i) => !i || +a >= +avg[i - 1] - 0.3), avg.join(' → '));
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
