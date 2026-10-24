// Spelling Bee: ten levels, a contest on stage against rival spellers, practice that brings back missed words,
// and a family bee where everyone plays at their own level on one device.
import { LEVELS, ORIGIN_ZH, POS_ZH } from './words.js?v=1';
import { say, spellOut, stop, canSpeak, voices, setVoice, setRate, sfx, setMuted } from './speech.js?v=1';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const KEY = 'bee.v1', GAME = 'spelling-bee';
let S = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } })() || {};
S = Object.assign({ lang: /^zh/i.test(navigator.language || '') ? 'zh' : 'en', stars: {}, unlocked: 1, mastery: {}, best: {}, set: {} }, S);
S.set = Object.assign({ voice: '', rate: 1, timer: 60, strikes: 2, sound: true, unlockAll: false }, S.set);
let cloud = null;
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } if (cloud) cloud.touch(GAME, KEY); }
setVoice(S.set.voice); setRate(S.set.rate); setMuted(!S.set.sound);

// ------------------------------------------------------------------ words on screen
const T = {
  zh: { title: '拼字大賽', sub: '十個等級，從幼稚園到全國冠軍', contest: '比賽', practice: '練習', list: '單字表', family: '家庭比賽', locked: '贏得上一級比賽就能解鎖', back: '返回',
    yourWord: '你的單字', say: '再唸一次', slow: '慢慢唸', def: '定義', sent: '例句', origin: '字源', pos: '詞性', submit: '送出', round: (r, n) => `第 ${r} / ${n} 回合`, you: '你',
    spelling: (n) => `${n} 正在拼字…`, correct: '答對了！', wrong: '答錯了', was: '正確拼法：', out: '出局', strikes: '機會', time: '時間到！', next: '下一個',
    won: '你是冠軍！', lost: '你出局了', finished: '比賽結束', review: '答錯的單字', again: '再比一次', nextLevel: '下一級', home: '回首頁', practiceDone: '練習完成！',
    mastered: (a, b) => `已熟練 ${a} / ${b}`, settings: '設定', voice: '朗讀的聲音', speed: '朗讀速度', timer: '每個字的時間', off: '不計時', sec: (n) => `${n} 秒`, strikesSet: '可以答錯幾次',
    real: '1 次（正式比賽規則）', sound: '音效', unlockAll: '解鎖所有等級（給家長）', lang: '語言', noVoice: '這個瀏覽器不能朗讀。可以按「定義」和「例句」看文字提示，或換用 Chrome、Edge、Safari。',
    players: '參賽者', addPlayer: '新增參賽者', start: '開始比賽', name: '名字', level: '等級', turn: (n) => `輪到 ${n}！`, pass: (n) => `把裝置交給 ${n}，準備好了就按開始`, ready: '我準備好了',
    winner: (n) => `🏆 ${n} 贏了！`, tie: '平手！大家都很厲害', score: (a, b) => `答對 ${a} / ${b}`, practiceRound: (i, n) => `第 ${i} / ${n} 題`, skip: '略過', listen: '先聽單字，再拼出來',
    rivalsLeft: (n) => `還剩 ${n} 位對手`, hint: '提示', letters: (n) => `${n} 個字母`, stars: '星星', wordsOf: (n) => `${n} 個單字`, champion: '冠軍', theWord: '單字' },
  en: { title: 'Spelling Bee', sub: 'Ten levels, from kindergarten to national champion', contest: 'Contest', practice: 'Practice', list: 'Word list', family: 'Family Bee', locked: 'Win the level before to unlock', back: 'Back',
    yourWord: 'Your word', say: 'Repeat', slow: 'Say it slowly', def: 'Definition', sent: 'Sentence', origin: 'Origin', pos: 'Part of speech', submit: 'Submit', round: (r, n) => `Round ${r} of ${n}`, you: 'You',
    spelling: (n) => `${n} is spelling…`, correct: 'Correct!', wrong: 'Incorrect', was: 'The correct spelling:', out: 'OUT', strikes: 'Chances', time: 'Time’s up!', next: 'Next',
    won: 'You’re the champion!', lost: 'You’re out', finished: 'Contest over', review: 'Words you missed', again: 'Try again', nextLevel: 'Next level', home: 'Home', practiceDone: 'Practice done!',
    mastered: (a, b) => `Mastered ${a} of ${b}`, settings: 'Settings', voice: 'Pronouncer voice', speed: 'Speaking speed', timer: 'Time per word', off: 'No timer', sec: (n) => `${n} seconds`, strikesSet: 'Misses allowed',
    real: '1 (official rules)', sound: 'Sound effects', unlockAll: 'Unlock all levels (for parents)', lang: 'Language', noVoice: 'This browser cannot speak. Use Definition and Sentence for text hints, or try Chrome, Edge or Safari.',
    players: 'Spellers', addPlayer: 'Add a speller', start: 'Start the bee', name: 'Name', level: 'Level', turn: (n) => `${n}’s turn!`, pass: (n) => `Pass the device to ${n}. Press start when ready.`, ready: 'I’m ready',
    winner: (n) => `🏆 ${n} wins!`, tie: 'It’s a tie! Great spelling, everyone', score: (a, b) => `${a} of ${b} correct`, practiceRound: (i, n) => `Word ${i} of ${n}`, skip: 'Skip', listen: 'Listen to the word, then spell it',
    rivalsLeft: (n) => `${n} rivals left`, hint: 'Hint', letters: (n) => `${n} letters`, stars: 'Stars', wordsOf: (n) => `${n} words`, champion: 'Champion', theWord: 'Word' },
};
const t = () => T[S.lang];
const tx = (a) => (Array.isArray(a) ? a[S.lang === 'zh' ? 0 : 1] : a);
const W = (w) => ({ w: w[0], pos: w[1], def: w[2], sent: w[3], origin: w[4] });
const posName = (p) => (S.lang === 'zh' ? `${POS_ZH[p] || p}（${p}）` : p);
const originName = (o) => (S.lang === 'zh' ? `${ORIGIN_ZH[o] || o}（${o}）` : o);
const blank = (sent, w) => sent.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*', 'gi'), '_____');
const unlocked = (lv) => S.set.unlockAll || lv <= S.unlocked;

// ------------------------------------------------------------------ home: a honeycomb of levels
function home() {
  stop(); view('home');
  const L = t();
  $('home').innerHTML = `<header class="top"><span class="logo">${BEE}</span><div><h1>${L.title}</h1><p>${L.sub}</p></div><span class="sp"></span><button class="ic" id="hLang">${S.lang === 'zh' ? 'EN' : '中'}</button><button class="ic" id="hSet" aria-label="${L.settings}">⚙️</button></header>
    ${canSpeak() ? '' : `<p class="warn">🔇 ${L.noVoice}</p>`}
    <div class="comb">${LEVELS.map((lv) => { const st = S.stars[lv.id] || 0, ok = unlocked(lv.id), m = lv.words.filter((w) => (S.mastery[w[0]] || 0) >= 2).length;
      return `<button class="hex ${ok ? '' : 'lock'}" data-lv="${lv.id}" style="--c:${lv.color}"><span class="num">${ok ? lv.id : '🔒'}</span><b>${tx(lv.n)}</b><small>${tx(lv.grade)}</small><span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>${m ? `<i class="mb" style="--p:${m / lv.words.length}"></i>` : ''}</button>`; }).join('')}</div>
    <button class="big fam" id="hFam">👨‍👩‍👦 ${L.family}</button>`;
  $('home').querySelectorAll('[data-lv]').forEach((b) => b.onclick = () => levelSheet(+b.dataset.lv));
  $('hFam').onclick = () => familySetup();
  $('hLang').onclick = () => { S.lang = S.lang === 'zh' ? 'en' : 'zh'; save(); home(); };
  $('hSet').onclick = () => settings();
}
function levelSheet(id) {
  const lv = LEVELS[id - 1], L = t(), ok = unlocked(id), m = lv.words.filter((w) => (S.mastery[w[0]] || 0) >= 2).length;
  sheet(`<div class="lvh" style="--c:${lv.color}"><span class="hexs">${id}</span><div><h2>${tx(lv.n)}</h2><p>${tx(lv.grade)} · ${L.wordsOf(lv.words.length)}</p></div></div>
    <p class="dim">${L.mastered(m, lv.words.length)}${S.best[id] ? ` · ${'★'.repeat(S.stars[id] || 0)}` : ''}</p>
    ${ok ? '' : `<p class="warn">🔒 ${L.locked}</p>`}
    <div class="acts col"><button class="big" id="sC" ${ok ? '' : 'disabled'}>🏆 ${L.contest}</button><button class="big alt" id="sP">📚 ${L.practice}</button><button class="big ghost" id="sL">📖 ${L.list}</button></div>`);
  if (ok) $('sC').onclick = () => { closeSheet(); contest(id); };
  $('sP').onclick = () => { closeSheet(); practice(id); };
  $('sL').onclick = () => { closeSheet(); wordList(id); };
}
function wordList(id) {
  const lv = LEVELS[id - 1], L = t(); view('list'); stop();
  $('list').innerHTML = `<header class="top"><button class="ic" id="lBack">←</button><h2>${tx(lv.n)} · ${L.list}</h2></header>
    <div class="words">${lv.words.map(W).map((w) => `<div class="wl ${(S.mastery[w.w] || 0) >= 2 ? 'ok' : ''}"><button class="ic sm" data-say="${esc(w.w)}">🔊</button><div><b>${esc(w.w)}</b> <small>${esc(posName(w.pos))} · ${esc(originName(w.origin))}</small><p>${esc(w.def)}</p><p class="dim">${esc(w.sent)}</p></div></div>`).join('')}</div>`;
  $('lBack').onclick = () => home();
  $('list').querySelectorAll('[data-say]').forEach((b) => b.onclick = () => say(b.dataset.say));
}

// ------------------------------------------------------------------ the spelling desk (shared by every mode)
// game: { mode, title, word, onAnswer(text, timedOut) } ; the desk asks the pronouncer, takes typing, runs the clock
let desk = null, timerT = null;
function deskHTML(top) {
  const L = t();
  return `<header class="top"><button class="ic" id="dQuit">←</button><div class="hd">${top}</div><button class="ic" id="dSet">⚙️</button></header>
    <div id="stage"></div>
    <section class="desk">
      <div class="pron"><button class="mic" id="dSay" aria-label="${L.say}">🔊</button><div><b id="dWho">${L.yourWord}</b><small id="dHint">${L.listen}</small></div></div>
      <div class="asks"><button data-ask="say">🔁 ${L.say}</button><button data-ask="slow">🐢 ${L.slow}</button><button data-ask="def">📖 ${L.def}</button><button data-ask="sent">💬 ${L.sent}</button><button data-ask="origin">🌍 ${L.origin}</button><button data-ask="pos">🏷️ ${L.pos}</button></div>
      <p class="info" id="dInfo"></p>
      <div class="clock" id="dClock" hidden><i></i></div>
      <div class="boxes" id="dBoxes"></div>
      <div class="kb" id="dKb"></div>
      <div class="acts"><button class="big ghost" id="dBack">⌫</button><button class="big" id="dGo">✓ ${L.submit}</button></div>
    </section>`;
}
function startDesk(g) {
  desk = { ...g, typed: '', busy: false };
  const L = t();
  $('dWho').textContent = g.who || L.yourWord; $('dHint').textContent = `${L.listen} · ${L.letters(g.word.w.length)}`; $('dInfo').textContent = '';
  drawBoxes(); setDeskEnabled(true);
  setTimeout(() => say(g.word.w), 250);
  clearInterval(timerT);
  const total = S.set.timer;
  if (total) {
    let left = total; $('dClock').hidden = false; const bar = $('dClock').firstElementChild; bar.style.width = '100%';
    timerT = setInterval(() => { if (!desk || desk.busy) return; left -= 0.25; bar.style.width = `${Math.max(0, left / total) * 100}%`; $('dClock').classList.toggle('low', left < 10); if (left <= 10 && Math.abs(left - Math.round(left)) < 0.01) sfx.tick(); if (left <= 0) { clearInterval(timerT); submit(true); } }, 250);
  } else $('dClock').hidden = true;
}
function drawBoxes() {
  if (!desk) return;
  const n = Math.max(desk.word.w.length, desk.typed.length), ch = [...desk.typed];
  $('dBoxes').innerHTML = Array.from({ length: n }, (_, i) => `<span class="${i < ch.length ? 'f' : ''} ${i === ch.length ? 'cur' : ''}">${esc(ch[i] || '')}</span>`).join('');
  $('dBoxes').style.setProperty('--n', Math.min(n, 18));
}
function setDeskEnabled(on) { document.querySelectorAll('.desk button').forEach((b) => { b.disabled = !on; }); }
function typeKey(k) {
  if (!desk || desk.busy) return;
  if (k === 'back') desk.typed = desk.typed.slice(0, -1);
  else if (k === 'enter') { submit(false); return; }
  else if (/^[a-z]$/i.test(k) && desk.typed.length < 30) desk.typed += k.toLowerCase();
  sfx.key(); drawBoxes();
}
function ask(kind) {
  if (!desk) return;
  const w = desk.word, L = t(), info = $('dInfo');
  if (kind === 'say') say(w.w);
  else if (kind === 'slow') say(w.w, 0.5);
  else if (kind === 'def') { info.innerHTML = `📖 <b>${L.def}:</b> ${esc(w.def)}`; say(w.def); }
  else if (kind === 'sent') { info.innerHTML = `💬 ${esc(blank(w.sent, w.w))}`; say(w.sent); }
  else if (kind === 'origin') { info.innerHTML = `🌍 <b>${L.origin}:</b> ${esc(originName(w.origin))}`; say(`The language of origin is ${w.origin}.`); }
  else if (kind === 'pos') { info.innerHTML = `🏷️ <b>${L.pos}:</b> ${esc(posName(w.pos))}`; say(`It is a ${w.pos}.`); }
}
function submit(timedOut) {
  if (!desk || desk.busy) return;
  if (!timedOut && !desk.typed) return;
  desk.busy = true; clearInterval(timerT); setDeskEnabled(false); stop();
  const ok = !timedOut && desk.typed.toLowerCase() === desk.word.w.toLowerCase();
  desk.onAnswer(ok, desk.typed, timedOut);
}
// show what was typed against the right spelling, letter by letter
function align(a, b) {
  const n = a.length, m = b.length, d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i ? (j ? 0 : i) : j)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const out = []; let i = n, j = m;
  while (i || j) {
    if (i && j && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { out.unshift(a[i - 1] === b[j - 1] ? ['ok', b[j - 1]] : ['sub', b[j - 1], a[i - 1]]); i--; j--; }
    else if (j && d[i][j] === d[i][j - 1] + 1) { out.unshift(['miss', b[j - 1]]); j--; }
    else { out.unshift(['extra', '', a[i - 1]]); i--; }
  }
  return out;
}
function feedback(ok, typed, word, timedOut) {
  const L = t();
  if (ok) { sfx.right(); $('dBoxes').innerHTML = [...word].map((c) => `<span class="f ok">${esc(c)}</span>`).join(''); $('dInfo').innerHTML = `<b class="good">✓ ${L.correct}</b>`; return; }
  sfx.wrong();
  const parts = align(typed.toLowerCase(), word.toLowerCase());
  $('dBoxes').innerHTML = parts.filter((p) => p[0] !== 'extra').map((p) => `<span class="f ${p[0] === 'ok' ? 'ok' : 'bad'}">${esc(p[1])}</span>`).join('');
  $('dInfo').innerHTML = `<b class="bad">✗ ${timedOut ? L.time : L.wrong}</b>${typed ? ` · <s>${esc(typed)}</s>` : ''} · ${L.was} <b>${esc(word)}</b>`;
  setTimeout(() => spellOut(word), 700);
}
function wireDesk(onQuit) {
  $('dQuit').onclick = () => { clearInterval(timerT); desk = null; stop(); onQuit(); };
  $('dSet').onclick = () => settings();
  $('dSay').onclick = () => ask('say');
  document.querySelectorAll('[data-ask]').forEach((b) => b.onclick = () => ask(b.dataset.ask));
  $('dKb').innerHTML = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((r) => `<div>${[...r].map((c) => `<button data-k="${c}">${c}</button>`).join('')}</div>`).join('');
  $('dKb').querySelectorAll('[data-k]').forEach((b) => b.onpointerdown = (e) => { e.preventDefault(); typeKey(b.dataset.k); });
  $('dBack').onclick = () => typeKey('back'); $('dGo').onclick = () => typeKey('enter');
}
document.addEventListener('keydown', (e) => {
  if (!desk || $('sheet').open || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Backspace') { e.preventDefault(); typeKey('back'); }
  else if (e.key === 'Enter') { e.preventDefault(); if (desk.busy && desk.next) $('dGo').click(); else typeKey('enter'); }
  else if (/^[a-zA-Z]$/.test(e.key)) typeKey(e.key);
  else if (e.key === ' ' && !desk.busy) { e.preventDefault(); ask('say'); }
});

// ------------------------------------------------------------------ the contest: you and four rivals on stage
const RIVALS = [['Ava', '🦊'], ['Leo', '🦁'], ['Mia', '🐰'], ['Kai', '🐼'], ['Zoe', '🐨'], ['Sam', '🐯'], ['Nora', '🦉'], ['Eli', '🐸'], ['Ruby', '🐞'], ['Max', '🐻']];
const ROUNDS = 8;
let fast = false;   // tap the stage to hurry the rivals along
const wait = (ms) => new Promise((r) => setTimeout(r, fast ? ms / 5 : ms));
function stageHTML(people, cur) {
  return `<div class="stage">${people.map((p, i) => `<div class="sp-${p.out ? 'out' : 'in'} ${i === cur ? 'now' : ''} person"><span class="av">${p.emoji}</span><b>${esc(p.name)}</b><small>${p.out ? t().out : '♥'.repeat(Math.max(0, p.lives))}</small></div>`).join('')}<div class="mic-stand">🎤</div></div>`;
}
// a believable wrong spelling for a rival who slips
function misspell(w) {
  const a = [...w.toLowerCase()], i = 1 + Math.floor(Math.random() * Math.max(1, a.length - 2)), r = Math.random();
  const vow = 'aeiou';
  if (r < 0.3 && a.length > 3) a.splice(i, 1);
  else if (r < 0.55) a.splice(i, 0, a[i]);
  else if (r < 0.8 && vow.includes(a[i])) a[i] = vow[(vow.indexOf(a[i]) + 1 + Math.floor(Math.random() * 3)) % 5];
  else if (a.length > 2) [a[i], a[i - 1]] = [a[i - 1], a[i]];
  const s = a.join('');
  return s === w.toLowerCase() ? s + 'e' : s;
}
function contest(id) {
  const lv = LEVELS[id - 1], L = t(), pool = shuffle(lv.words).map(W);
  const people = [{ name: L.you, emoji: '🐝', you: true, lives: S.set.strikes, out: false }, ...shuffle(RIVALS).slice(0, 4).map(([n, e]) => ({ name: n, emoji: e, lives: S.set.strikes, out: false }))];
  const missed = []; let round = 1, wi = 0, turn = 0, myRight = 0, myTotal = 0;
  view('play');
  const draw = (cur) => { $('play').querySelector('.hd').innerHTML = `<b>${tx(lv.n)}</b><small>${L.round(Math.min(round, ROUNDS), ROUNDS)} · ${L.rivalsLeft(people.filter((p) => !p.you && !p.out).length)}</small>`; $('stage').innerHTML = stageHTML(people, cur); };
  $('play').innerHTML = deskHTML(''); wireDesk(() => home());
  fast = false; $('stage').onclick = () => { fast = true; };
  const nextWord = () => { if (wi >= pool.length) wi = 0; return pool[wi++]; };
  const step = () => {
    if (!desk && !$('play').classList.contains('on')) return;
    const me = people[0], rivalsIn = people.filter((p) => !p.you && !p.out);
    if (me.out || round > ROUNDS || !rivalsIn.length) return finish();
    // find the next speller in this round
    while (turn < people.length && people[turn].out) turn++;
    if (turn >= people.length) { round++; turn = 0; return step(); }
    const p = people[turn], word = nextWord();
    draw(turn);
    if (p.you) {
      fast = false;
      myTotal++;
      desk = null;
      startDesk({ word, who: L.yourWord, onAnswer: (ok, typed, to) => {
        feedback(ok, typed, word.w, to);
        if (ok) myRight++; else { me.lives--; missed.push(word); if (me.lives <= 0) { me.out = true; sfx.out(); } }
        draw(turn);
        desk.next = () => { desk.next = null; turn++; step(); };
        showNext(desk.next, ok ? 1100 : 0);
      } });
    } else {
      // a rival spells: the pronouncer says their word, their letters appear one by one
      desk = null; setDeskEnabled(false);
      const skill = 0.97 - id * 0.008 - round * 0.012 - word.w.length * 0.004, ok = Math.random() < skill, shown = ok ? word.w.toLowerCase() : misspell(word.w);
      $('dWho').textContent = L.spelling(p.name); $('dHint').textContent = ''; $('dInfo').textContent = ''; $('dBoxes').innerHTML = ''; $('dClock').hidden = true;
      Promise.race([say(word.w), wait(800)]).then(() => {
        let i = 0;
        const iv = setInterval(() => {
          if (!$('play').classList.contains('on')) { clearInterval(iv); return; }
          i++; $('dBoxes').innerHTML = [...shown.slice(0, i)].map((c) => `<span class="f">${esc(c)}</span>`).join(''); $('dBoxes').style.setProperty('--n', Math.min(shown.length, 18)); sfx.key();
          if (i >= shown.length) {
            clearInterval(iv);
            setTimeout(() => {
              if (!$('play').classList.contains('on')) return;
              if (ok) { sfx.right(); $('dBoxes').querySelectorAll('span').forEach((s) => s.classList.add('ok')); $('dInfo').innerHTML = `<b class="good">✓ ${esc(p.name)}</b>`; }
              else { sfx.wrong(); p.lives--; if (p.lives <= 0) p.out = true; $('dBoxes').querySelectorAll('span').forEach((s) => s.classList.add('bad')); $('dInfo').innerHTML = `<b class="bad">✗ ${esc(p.name)}</b> · ${L.was} <b>${esc(word.w)}</b>`; }
              draw(turn);
              wait(ok ? 650 : 1400).then(() => { if ($('play').classList.contains('on')) { turn++; step(); } });
            }, fast ? 60 : 250);
          }
        }, fast ? 20 : Math.max(60, 650 / shown.length));
      });
    }
  };
  const finish = () => {
    desk = null; clearInterval(timerT);
    const me = people[0], win = !me.out, misses = S.set.strikes - me.lives, stars = !win ? 0 : misses === 0 ? 3 : misses === 1 ? 2 : 1;
    if (win) { sfx.win(); if (stars > (S.stars[id] || 0)) S.stars[id] = stars; if (id >= S.unlocked && id < 10) S.unlocked = id + 1; S.best[id] = Math.max(S.best[id] || 0, myRight); }
    for (const w of missed) S.mastery[w.w] = 0;
    save();
    result(win ? L.won : L.lost, `${L.score(myRight, myTotal)}${win ? ` · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : ''}`, missed, [
      [L.again, () => contest(id)], ...(win && id < 10 ? [[L.nextLevel, () => contest(id + 1)]] : []), [L.home, () => home()],
    ], win);
  };
  step();
}
function showNext(fn, auto) {
  const g = $('dGo'); g.disabled = false; g.textContent = '→ ' + t().next; g.onclick = () => { g.onclick = () => typeKey('enter'); g.textContent = '✓ ' + t().submit; fn(); };
  if (auto) setTimeout(() => { if (desk && desk.next === fn) g.onclick(); }, auto);
}
function result(title, line, missed, buttons, win) {
  const L = t();
  sheet(`<div class="res ${win ? 'win' : ''}"><div class="medal">${win ? '🏆' : '🐝'}</div><h2>${esc(title)}</h2><p>${esc(line)}</p>
    ${missed.length ? `<h3>${L.review}</h3><div class="miss">${missed.map((w) => `<button data-say="${esc(w.w)}"><b>${esc(w.w)}</b><small>${esc(w.def)}</small></button>`).join('')}</div>` : ''}
    <div class="acts col">${buttons.map((b, i) => `<button class="big ${i ? 'ghost' : ''}" data-b="${i}">${esc(b[0])}</button>`).join('')}</div></div>`, false);
  $('sheetBody').querySelectorAll('[data-say]').forEach((b) => b.onclick = () => spellOut(b.dataset.say));
  $('sheetBody').querySelectorAll('[data-b]').forEach((b) => b.onclick = () => { closeSheet(); buttons[+b.dataset.b][1](); });
}

// ------------------------------------------------------------------ practice: ten words, the ones you missed come first
function practice(id) {
  const lv = LEVELS[id - 1], L = t(), all = lv.words.map(W);
  const weak = shuffle(all.filter((w) => (S.mastery[w.w] || 0) < 2)), strong = shuffle(all.filter((w) => (S.mastery[w.w] || 0) >= 2));
  const queue = [...weak, ...strong].slice(0, 10), missed = []; let i = 0, right = 0;
  view('play'); $('play').innerHTML = deskHTML(''); wireDesk(() => home());
  const next = () => {
    if (i >= queue.length) { save(); const m = lv.words.filter((w) => (S.mastery[w[0]] || 0) >= 2).length; if (right === queue.length) sfx.win(); result(L.practiceDone, `${L.score(right, queue.length)} · ${L.mastered(m, lv.words.length)}`, missed, [[L.practice, () => practice(id)], [L.home, () => home()]], right === queue.length); return; }
    const w = queue[i];
    $('play').querySelector('.hd').innerHTML = `<b>${tx(lv.n)} · ${L.practice}</b><small>${L.practiceRound(i + 1, queue.length)}</small>`;
    $('stage').innerHTML = `<div class="prog"><i style="width:${(i / queue.length) * 100}%"></i></div>`;
    startDesk({ word: w, onAnswer: (ok, typed, to) => {
      feedback(ok, typed, w.w, to);
      S.mastery[w.w] = ok ? (S.mastery[w.w] || 0) + 1 : 0;
      if (ok) right++; else { missed.push(w); queue.push(w); }   // a missed word comes back at the end
      if (queue.length > 16) queue.length = 16;
      save();
      desk.next = () => { desk.next = null; i++; next(); };
      showNext(desk.next, ok ? 1000 : 0);
    } });
  };
  next();
}

// ------------------------------------------------------------------ family bee: pass the device around
let famPlayers = null;
function familySetup() {
  const L = t();
  famPlayers = famPlayers || S.family || [{ name: 'Josh', emoji: '🦁', lv: 4 }, { name: 'Jasper', emoji: '🐼', lv: 2 }, { name: S.lang === 'zh' ? '爸爸' : 'Dad', emoji: '🦉', lv: 8 }];
  const row = (p, i) => `<div class="fp" data-i="${i}"><select class="em">${['🦁', '🐼', '🦉', '🦊', '🐰', '🐯', '🐨', '🐸', '🐞', '🐻', '🐝', '🦄'].map((e) => `<option ${e === p.emoji ? 'selected' : ''}>${e}</option>`).join('')}</select><input class="nm" maxlength="12" value="${esc(p.name)}" placeholder="${L.name}"><select class="lv">${LEVELS.map((l) => `<option value="${l.id}" ${l.id === p.lv ? 'selected' : ''}>${l.id}. ${esc(tx(l.n))}</option>`).join('')}</select><button class="ic sm rm">✕</button></div>`;
  const draw = () => {
    sheet(`<h2>👨‍👩‍👦 ${L.family}</h2><p class="dim">${S.lang === 'zh' ? '每個人選自己的等級，輪流拼字，答錯太多次就出局，最後留下的人獲勝。' : 'Everyone picks their own level and takes turns. Too many misses and you’re out. Last speller standing wins.'}</p>
      <div id="fps">${famPlayers.map(row).join('')}</div>${famPlayers.length < 6 ? `<button class="ghost" id="fAdd">＋ ${L.addPlayer}</button>` : ''}
      <div class="acts col"><button class="big" id="fGo" ${famPlayers.length < 2 ? 'disabled' : ''}>${L.start}</button></div>`);
    const read = () => { famPlayers = [...document.querySelectorAll('.fp')].map((r) => ({ emoji: r.querySelector('.em').value, name: r.querySelector('.nm').value.trim() || '?', lv: +r.querySelector('.lv').value })); };
    document.querySelectorAll('.fp input, .fp select').forEach((x) => x.onchange = read);
    document.querySelectorAll('.fp .rm').forEach((b) => b.onclick = () => { read(); famPlayers.splice(+b.closest('.fp').dataset.i, 1); draw(); });
    if ($('fAdd')) $('fAdd').onclick = () => { read(); famPlayers.push({ name: '', emoji: '🐝', lv: 3 }); draw(); };
    $('fGo').onclick = () => { read(); S.family = famPlayers; save(); closeSheet(); familyBee(famPlayers); };
  };
  draw();
}
function familyBee(list) {
  const L = t(), people = list.map((p) => ({ ...p, lives: S.set.strikes, out: false, right: 0, pool: shuffle(LEVELS[p.lv - 1].words).map(W), wi: 0 }));
  let round = 1, turn = 0, roundMiss = [];
  view('play'); $('play').innerHTML = deskHTML(''); wireDesk(() => home());
  const draw = (cur) => { $('play').querySelector('.hd').innerHTML = `<b>${L.family}</b><small>${L.round(round, 15)}</small>`; $('stage').innerHTML = stageHTML(people, cur); };
  const step = () => {
    const alive = people.filter((p) => !p.out);
    if (alive.length <= 1 || round > 15) return finish();
    while (turn < people.length && people[turn].out) turn++;
    if (turn >= people.length) {
      // if everyone left missed this round, nobody goes out (like the real bee)
      if (roundMiss.length && roundMiss.length === people.filter((p) => !p.out || roundMiss.includes(p)).length) for (const p of roundMiss) { p.out = false; p.lives = Math.max(1, p.lives); }
      round++; turn = 0; roundMiss = []; return step();
    }
    const p = people[turn]; draw(turn);
    // hand the device over first
    desk = null; setDeskEnabled(false);
    $('dWho').textContent = L.turn(`${p.emoji} ${p.name}`); $('dHint').textContent = L.pass(p.name); $('dInfo').textContent = ''; $('dBoxes').innerHTML = ''; $('dClock').hidden = true;
    const g = $('dGo'); g.disabled = false; g.textContent = L.ready;
    g.onclick = () => {
      g.onclick = () => typeKey('enter'); g.textContent = '✓ ' + L.submit;
      if (p.wi >= p.pool.length) p.wi = 0;
      const word = p.pool[p.wi++];
      startDesk({ word, who: `${p.emoji} ${p.name}`, onAnswer: (ok, typed, to) => {
        feedback(ok, typed, word.w, to);
        if (ok) p.right++; else { p.lives--; if (p.lives <= 0) { p.out = true; roundMiss.push(p); sfx.out(); } }
        draw(turn);
        desk.next = () => { desk.next = null; turn++; step(); };
        showNext(desk.next, 0);
      } });
    };
  };
  const finish = () => {
    desk = null; clearInterval(timerT);
    const alive = people.filter((p) => !p.out), top = alive.length === 1 ? alive : null;
    sfx.win();
    result(top ? L.winner(`${top[0].emoji} ${top[0].name}`) : L.tie, people.map((p) => `${p.emoji} ${p.name}: ${p.right}`).join(' · '), [], [[L.again, () => familyBee(list)], [L.home, () => home()]], true);
  };
  step();
}

// ------------------------------------------------------------------ settings, sheets, views
function settings() {
  const L = t(), vs = voices();
  sheet(`<h2>⚙️ ${L.settings}</h2>
    <label>${L.voice}<select id="sV"><option value="">—</option>${vs.map((v) => `<option ${v.name === S.set.voice ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>
    <label>${L.speed} <input type="range" id="sR" min="0.6" max="1.3" step="0.1" value="${S.set.rate}"></label>
    <label>${L.timer}<select id="sT">${[0, 30, 60, 90, 120].map((n) => `<option value="${n}" ${n === S.set.timer ? 'selected' : ''}>${n ? L.sec(n) : L.off}</option>`).join('')}</select></label>
    <label>${L.strikesSet}<select id="sS">${[1, 2, 3].map((n) => `<option value="${n}" ${n === S.set.strikes ? 'selected' : ''}>${n === 1 ? L.real : n}</option>`).join('')}</select></label>
    <label class="row"><input type="checkbox" id="sSnd" ${S.set.sound ? 'checked' : ''}> ${L.sound}</label>
    <label class="row"><input type="checkbox" id="sU" ${S.set.unlockAll ? 'checked' : ''}> ${L.unlockAll}</label>
    <div class="acts"><button class="big ghost" id="sTest">🔊 Test</button><button class="big" id="sOk">OK</button></div>`);
  $('sV').onchange = () => { S.set.voice = $('sV').value; setVoice(S.set.voice); save(); say('spelling bee'); };
  $('sR').oninput = () => { S.set.rate = +$('sR').value; setRate(S.set.rate); save(); };
  $('sT').onchange = () => { S.set.timer = +$('sT').value; save(); };
  $('sS').onchange = () => { S.set.strikes = +$('sS').value; save(); };
  $('sSnd').onchange = () => { S.set.sound = $('sSnd').checked; setMuted(!S.set.sound); save(); };
  $('sU').onchange = () => { S.set.unlockAll = $('sU').checked; save(); };
  $('sTest').onclick = () => say('Your word is honeycomb. Honeycomb.');
  $('sOk').onclick = () => { closeSheet(); if ($('home').classList.contains('on')) home(); };
}
function sheet(html, closable = true) { const d = $('sheet'); $('sheetBody').innerHTML = html; d.dataset.closable = closable ? '1' : ''; $('sheetX').hidden = !closable; if (!d.open) d.showModal(); }
function closeSheet() { const d = $('sheet'); if (d.open) d.close(); }
$('sheetX').onclick = closeSheet;
$('sheet').addEventListener('cancel', (e) => { if (!$('sheet').dataset.closable) e.preventDefault(); });
function view(v) { for (const id of ['home', 'play', 'list']) $(id).classList.toggle('on', id === v); window.scrollTo(0, 0); }
const BEE = `<svg viewBox="0 0 64 64" width="52" height="52"><ellipse cx="22" cy="20" rx="12" ry="8" fill="#e8f6ff" stroke="#3b2a1a" stroke-width="3" transform="rotate(-25 22 20)"/><ellipse cx="40" cy="18" rx="12" ry="8" fill="#e8f6ff" stroke="#3b2a1a" stroke-width="3" transform="rotate(25 40 18)"/><ellipse cx="32" cy="38" rx="18" ry="15" fill="#ffc93c" stroke="#3b2a1a" stroke-width="3"/><path d="M22 28 Q32 32 42 28 M18 38 Q32 43 46 38 M21 48 Q32 52 43 48" stroke="#3b2a1a" stroke-width="5" fill="none"/><circle cx="26" cy="34" r="2.5" fill="#3b2a1a"/><circle cx="38" cy="34" r="2.5" fill="#3b2a1a"/></svg>`;

// start, pulling a newer save from the cloud
home();
(async () => { try { cloud = await import('/save.js'); if (await cloud.pull(GAME, KEY)) { S = Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); if ($('home').classList.contains('on')) home(); } } catch (e) { cloud = null; } })();
window.BEE = { S, LEVELS, contest, practice, familyBee, home, get desk() { return desk; }, typeKey };
