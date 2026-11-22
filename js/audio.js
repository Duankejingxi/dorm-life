/* 宿舍人生 · 生成式配乐：八音盒 + 柔和的和弦铺底 + 环境声（雨、夏夜虫鸣、清晨鸟叫、食堂人声）。没有任何音频文件。 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});
  let ctx = null, master = null, musicBus = null, rainGain = null, delay = null, ambBus = null, murmurGain = null, ambTimer = null, amb = null;
  let timer = null, on = false, step = 0, chordIdx = 0, mood = "day";
  // C 大调：I – vi – IV – V，夜里换成 vi – IV – I – V
  const CHORDS = { day: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], night: [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]] };
  const PENTA = [0, 2, 4, 7, 9];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ctx) return true;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55;
    delay = ctx.createDelay(1.5); delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    musicBus.connect(master); musicBus.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(master);
    // 雨声：粉噪声 + 带通
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 0.5;
    rainGain = ctx.createGain(); rainGain.gain.value = 0;
    src.connect(bp); bp.connect(rainGain); rainGain.connect(master); src.start();
    // 环境声总线
    ambBus = ctx.createGain(); ambBus.gain.value = 0.9; ambBus.connect(master);
    // 食堂人声：同一段噪声，低通 + 共振峰 + 缓慢起伏，像远处很多人在说话
    const src2 = ctx.createBufferSource(); src2.buffer = buf; src2.loop = true; src2.playbackRate.value = 0.6;
    const lp2 = ctx.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 900;
    const fm = ctx.createBiquadFilter(); fm.type = "peaking"; fm.frequency.value = 480; fm.Q.value = 1.4; fm.gain.value = 9;
    murmurGain = ctx.createGain(); murmurGain.gain.value = 0;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.23; lfoG.gain.value = 0.05;
    lfo.connect(lfoG); lfoG.connect(murmurGain.gain); lfo.start();
    src2.connect(lp2); lp2.connect(fm); fm.connect(murmurGain); murmurGain.connect(ambBus); src2.start();
    return true;
  }

  function pluck(freq, t, vel, dur) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o2.type = "triangle"; o.frequency.value = freq; o2.frequency.value = freq * 2.001;
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicBus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function pad(notes, t, dur) {
    for (const n of notes) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = midi(48 + n); o.detune.value = (Math.random() - 0.5) * 12;
      f.type = "lowpass"; f.frequency.value = mood === "night" ? 520 : 800;
      o.connect(f); f.connect(g); g.connect(musicBus);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.022, t + dur * 0.4); g.gain.linearRampToValueAtTime(0, t + dur);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }

  /* ---------- 环境声 ---------- */
  function panNode() {
    if (!ctx.createStereoPanner) return null;
    const p = ctx.createStereoPanner(); p.pan.value = Math.random() * 1.6 - 0.8; return p;
  }
  function voice(freq, t, dur, vel, sweep) {
    const o = ctx.createOscillator(), g = ctx.createGain(), p = panNode();
    o.type = "sine"; o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g); if (p) { g.connect(p); p.connect(ambBus); } else g.connect(ambBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function cricket(t) {
    const f = 4200 + Math.random() * 600, n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) voice(f, t + i * 0.055, 0.035, 0.010, 1.01);
  }
  function bird(t) {
    const base = 2400 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) voice(base * (1 + Math.random() * 0.15), t + i * (0.09 + Math.random() * 0.06), 0.07 + Math.random() * 0.05, 0.012, Math.random() < 0.5 ? 1.35 : 0.8);
  }
  function ambTick() {
    if (!on || !ctx) { ambTimer = null; return; }
    const t = ctx.currentTime + 0.05;
    let next = 1000;
    if (amb === "night") { if (Math.random() < 0.8) cricket(t); if (Math.random() < 0.35) cricket(t + 0.3); next = 500 + Math.random() * 700; }
    else if (amb === "day") { if (Math.random() < 0.45) bird(t); next = 1400 + Math.random() * 3200; }
    ambTimer = setTimeout(ambTick, next);
  }
  function setAmb(sc) {
    const indoor = DL.Art && DL.Art.INDOOR.includes(sc.at);
    const wet = sc.weather === "rain" || sc.weather === "snow";
    const outdoorish = !indoor || sc.at === "dorm"; // 宿舍开着窗
    amb = null;
    if (!wet && outdoorish && sc.season !== "winter" && (sc.time === "night" || sc.time === "dusk") && sc.at !== "city") amb = "night";
    else if (!wet && !indoor && sc.season !== "winter" && (sc.time === "dawn" || sc.time === "day") && sc.at !== "city" && sc.at !== "station") amb = "day";
    if (ctx && murmurGain) murmurGain.gain.linearRampToValueAtTime(sc.at === "canteen" ? 0.16 : 0, ctx.currentTime + 1.5);
    if (on && ctx && !ambTimer) ambTick();
  }

  function tick() {
    if (!on || !ctx) return;
    const beat = mood === "night" ? 0.62 : 0.5;
    const now = ctx.currentTime + 0.05;
    const chords = CHORDS[mood === "night" ? "night" : "day"];
    if (step % 16 === 0) { chordIdx = (chordIdx + 1) % chords.length; pad(chords[chordIdx], now, beat * 16); pluck(midi(48 + chords[chordIdx][0]), now, 0.12, 3); }
    // 八音盒：大部分拍子落在和弦音，偶尔经过五声音阶，留白也是音乐
    if (Math.random() < (step % 2 ? 0.35 : 0.7)) {
      const ch = chords[chordIdx];
      const pool = Math.random() < 0.7 ? ch : PENTA;
      const n = pool[Math.floor(Math.random() * pool.length)] % 12;
      const oct = mood === "night" ? 72 : 76;
      pluck(midi(oct + n), now, 0.07 + Math.random() * 0.05, 2.2);
    }
    step++;
    timer = setTimeout(tick, beat * 1000);
  }

  DL.Audio = {
    start() {
      if (!init()) return;
      if (ctx.state === "suspended") ctx.resume();
      on = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2.5);
      if (!timer) tick();
      if (!ambTimer) ambTick();
    },
    stop() {
      on = false; clearTimeout(timer); timer = null; clearTimeout(ambTimer); ambTimer = null;
      if (ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6); }
    },
    scene(sc) {
      mood = sc.time === "night" || sc.time === "dusk" ? "night" : "day";
      setAmb(sc);
      if (ctx && rainGain) rainGain.gain.linearRampToValueAtTime(sc.weather === "rain" ? (DL.Art.INDOOR.includes(sc.at) ? 0.25 : 0.55) : 0, ctx.currentTime + 1.5);
    },
    blip(kind) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      if (kind === "mem") { [0, 4, 7, 12].forEach((n, i) => pluck(midi(79 + n), t + i * 0.09, 0.08, 1.8)); }
      else if (kind === "choose") pluck(midi(84), t, 0.05, 0.4);
      else pluck(midi(91), t, 0.025, 0.12);
    },
    note(n) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      pluck(midi(64 + (n % 24)), t, 0.16, 1.4);
      pluck(midi(52 + (n % 12)), t, 0.06, 1.0);
    },
    get on() { return on; },
  };
})(typeof window !== "undefined" ? window : globalThis);
