// The pronouncer: the browser's own text-to-speech with an English voice, and little sound effects.
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null, wanted = '';
export const canSpeak = () => !!synth && typeof SpeechSynthesisUtterance !== 'undefined';
export function voices() { return canSpeak() ? synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang) || v.lang === 'en') : []; }
// the best English voice: the one chosen in settings, else a natural US/UK voice
function pick() {
  const list = voices(); if (!list.length) return null;
  return list.find((v) => v.name === wanted) || list.find((v) => /natural|neural/i.test(v.name) && /en-US/i.test(v.lang)) || list.find((v) => /Google US English|Samantha|Aria|Jenny|Guy|Microsoft Zira/i.test(v.name)) || list.find((v) => /en-US/i.test(v.lang)) || list[0];
}
export function setVoice(name) { wanted = name || ''; voice = pick(); }
if (canSpeak()) { synth.onvoiceschanged = () => { voice = pick(); }; voice = pick(); }
let rateK = 1;
export function setRate(k) { rateK = k; }
// say something; resolves when it has been said (or after a safe timeout)
export function say(text, rate = 0.9) {
  return new Promise((done) => {
    if (!canSpeak() || !text) { done(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (!voice) voice = pick();
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-US'; u.rate = Math.max(0.3, Math.min(1.6, rate * rateK)); u.pitch = 1;
    let fin = false; const end = () => { if (!fin) { fin = true; done(); } };
    u.onend = end; u.onerror = end; setTimeout(end, 1500 + text.length * 120);
    synth.speak(u);
  });
}
export const stop = () => { if (canSpeak()) synth.cancel(); };
// letter by letter, the way a speller says it
export const spellOut = (w) => say(w.toUpperCase().split('').join('. ') + '.', 0.75);

// ------------------------------------------------------------------ sounds
let ac = null, muted = false;
export const setMuted = (m) => { muted = m; };
function tone(f, t0, len, type = 'sine', vol = 0.18) {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t); o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.start(t); o.stop(t + len + 0.05);
  } catch (e) { /* no sound */ }
}
export const sfx = {
  right: () => { tone(660, 0, 0.18); tone(880, 0.12, 0.3); },
  wrong: () => { tone(1320, 0, 1.2, 'triangle', 0.22); tone(1980, 0, 0.9, 'sine', 0.06); },   // the judge's bell
  tick: () => tone(1200, 0, 0.05, 'square', 0.04),
  key: () => tone(520 + Math.random() * 80, 0, 0.04, 'triangle', 0.05),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.16)),
  out: () => { tone(392, 0, 0.3, 'sawtooth', 0.08); tone(311, 0.25, 0.5, 'sawtooth', 0.08); },
};
