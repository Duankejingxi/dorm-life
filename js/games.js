/* 宿舍人生 · 小游戏
 * DL.Games.play(kind, opts) → Promise<得分 0–1 | null（选择跳过的可选游戏）>
 * 统一流程：说明卡 → 3·2·1 → 游戏 → 成绩。全部触屏 / 鼠标 / 键盘可玩。
 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random;
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const INFO = {
    stand: { icon: "🪖", name: "站军姿", how: "太阳太毒，你的重心在晃。按住屏幕把它拉回圈里，坚持 12 秒。", dur: 12 },
    rush: { icon: "⚡", name: "抢课", how: "课程亮绿就点，抢到就是你的。别点红色的「已满」。", dur: 10 },
    umbrella: { icon: "☂️", name: "撑伞", how: "左右拖动伞，别让林溪淋到雨。风向会变。", dur: 13 },
    shoot: { icon: "🏀", name: "投篮", how: "力度条来回走，在金色区域时点一下出手。一共五个球。", shots: 5 },
    clutch: { icon: "🎯", name: "最后一投", how: "只有一个球。力度条进入金色区域时出手。", shots: 1 },
    rhythm: { icon: "🎸", name: "演出", how: "音符落到线上时，点对应的那一列。跟上许多的节奏。", dur: 22 },
    cram: { icon: "📖", name: "考前冲刺", how: "翻牌，把知识点和它的解释配成一对。越快越好，冲刺能提高期末绩点。", dur: 30 },
  };
  const RATING = (s) => (s >= 0.9 ? "完美" : s >= 0.7 ? "漂亮" : s >= 0.45 ? "还行" : "翻车了");

  let host = null;
  function ensureHost() {
    if (host) return host;
    host = document.createElement("div");
    host.className = "mg hidden";
    host.innerHTML = `<div class="mg-top"><span class="mg-title"></span><span class="mg-hud"></span></div><div class="mg-stage"><canvas></canvas><div class="mg-dom"></div></div><div class="mg-bar"><i></i></div><div class="mg-card"></div>`;
    (document.getElementById("app") || document.body).appendChild(host);
    return host;
  }
  const q = (s) => host.querySelector(s);

  function fitCanvas(cv) {
    const r = cv.parentElement.getBoundingClientRect();
    const d = Math.min(2, root.devicePixelRatio || 1);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
    return { g, W: r.width, H: r.height };
  }

  function card(html, buttons) {
    return new Promise((resolve) => {
      const c = q(".mg-card");
      c.innerHTML = `<div class="mg-panel">${html}<div class="mg-btns">${buttons.map((b, i) => `<button class="btn ${i === 0 ? "primary" : "ghost"}" data-i="${i}">${b}</button>`).join("")}</div></div>`;
      c.classList.add("on");
      const first = c.querySelector("button");
      setTimeout(() => first && first.focus({ preventScroll: true }), 50);
      c.querySelectorAll("button").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); c.classList.remove("on"); resolve(+b.dataset.i); }));
    });
  }
  async function countdown() {
    const c = q(".mg-card");
    for (const n of ["3", "2", "1"]) {
      c.innerHTML = `<div class="mg-count">${n}</div>`; c.classList.add("on", "count");
      if (DL.Audio) DL.Audio.blip();
      await sleep(reduced ? 250 : 620);
    }
    c.classList.remove("on", "count"); c.innerHTML = "";
  }
  function setBar(p) { q(".mg-bar i").style.width = clamp(p, 0, 1) * 100 + "%"; }
  function hud(t) { q(".mg-hud").textContent = t; }

  async function play(kind, opts) {
    opts = opts || {};
    const info = INFO[kind];
    if (!info) return 0.5;
    ensureHost();
    host.classList.remove("hidden");
    host.dataset.kind = kind;
    q(".mg-title").textContent = info.icon + "  " + (opts.title || info.name);
    hud(""); setBar(0);
    q(".mg-dom").innerHTML = "";
    const cv = q("canvas"); const g0 = cv.getContext("2d"); g0.clearRect(0, 0, cv.width, cv.height);
    requestAnimationFrame(() => host.classList.add("on"));
    const go = await card(`<div class="mg-icon">${info.icon}</div><h3>${opts.title || info.name}</h3><p>${info.how}</p>`, opts.optional ? ["开始冲刺", "直接去考"] : ["开始", "跳过"]);
    let score;
    if (go === 1) score = opts.optional ? null : 0.5;
    else {
      await countdown();
      score = await GAMES[kind](info, opts);
      score = clamp(score, 0, 1);
      if (DL.Audio) DL.Audio.blip(score >= 0.7 ? "mem" : "choose");
      await card(`<p class="mg-k">${info.name}</p><div class="mg-score">${Math.round(score * 100)}<small>%</small></div><p class="mg-rate r${score >= 0.9 ? 3 : score >= 0.7 ? 2 : score >= 0.45 ? 1 : 0}">${RATING(score)}</p>`, ["继续"]);
    }
    host.classList.remove("on");
    await sleep(320);
    host.classList.add("hidden");
    q(".mg-dom").innerHTML = "";
    return score;
  }

  /* 统一的指针输入：返回 {x,y,down} 和事件注销 */
  function pointer(el) {
    const p = { x: 0, y: 0, down: false, taps: [] };
    const pos = (e) => { const r = el.getBoundingClientRect(); p.x = e.clientX - r.left; p.y = e.clientY - r.top; };
    const dn = (e) => { pos(e); p.down = true; p.taps.push({ x: p.x, y: p.y }); e.preventDefault(); };
    const mv = (e) => { pos(e); };
    const up = () => { p.down = false; };
    el.addEventListener("pointerdown", dn); el.addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
    p.off = () => { el.removeEventListener("pointerdown", dn); el.removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
    return p;
  }
  function loop(fn) {
    return new Promise((resolve) => {
      let last = performance.now();
      const tick = (t) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; const r = fn(dt, t); if (r !== undefined) resolve(r); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }

  const GAMES = {};

  /* ---------- 站军姿：把晃动的重心拉回圈里 ---------- */
  GAMES.stand = async (info) => {
    const cv = q("canvas"), { g, W, H } = fitCanvas(cv), P = pointer(cv);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.16;
    let x = cx, y = cy, vx = 0, vy = 0, t = 0, inside = 0, total = 0, wind = 0;
    const ph = rnd() * 6, dir = rnd() * 6.28;
    const trail = [];
    const score = await loop((dt) => {
      t += dt; total += dt;
      wind += dt * (0.8 + t * 0.12);
      const heat = 60 + t * 12;
      vx += (Math.sin(wind * 1.7 + ph) * 0.8 + Math.cos(dir) * 0.6 + (rnd() - 0.5) * 1.6) * heat * dt;
      vy += (Math.cos(wind * 1.3 + ph) * 0.8 + Math.sin(dir) * 0.6 + (rnd() - 0.5) * 1.6) * heat * dt;
      if (P.down) { vx += (P.x - x) * 4.2 * dt; vy += (P.y - y) * 4.2 * dt; }
      vx *= 0.94; vy *= 0.94; x += vx * dt * 8; y += vy * dt * 8;
      x = clamp(x, 16, W - 16); y = clamp(y, 16, H - 16);
      const d = Math.hypot(x - cx, y - cy);
      if (d < R) inside += dt;
      trail.push([x, y]); if (trail.length > 24) trail.shift();
      // 画
      g.clearRect(0, 0, W, H);
      const heatA = Math.min(0.5, t / 24);
      const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
      bg.addColorStop(0, `rgba(255,190,90,${0.06 + heatA * 0.25})`); bg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      for (let k = 3; k >= 1; k--) { g.beginPath(); g.arc(cx, cy, R * k * 0.95, 0, 6.283); g.strokeStyle = `rgba(255,255,255,${k === 1 ? 0.55 : 0.12})`; g.lineWidth = k === 1 ? 2.5 : 1; g.stroke(); }
      g.fillStyle = d < R ? "rgba(246,201,120,.14)" : "rgba(255,120,110,.08)"; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.fill();
      trail.forEach(([a, b], i) => { g.fillStyle = `rgba(246,201,120,${(i / trail.length) * 0.35})`; g.beginPath(); g.arc(a, b, 4 + i * 0.3, 0, 6.283); g.fill(); });
      g.fillStyle = d < R ? "#f6c978" : "#ff8b7e"; g.beginPath(); g.arc(x, y, 13, 0, 6.283); g.fill();
      g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 2; g.stroke();
      if (P.down) { g.strokeStyle = "rgba(255,255,255,.25)"; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(x, y); g.lineTo(P.x, P.y); g.stroke(); g.setLineDash([]); }
      hud(Math.round((inside / Math.max(total, 0.001)) * 100) + "% 在圈内");
      setBar(t / info.dur);
      if (t >= info.dur) return inside / total;
    });
    P.off();
    return clamp((score - 0.35) / 0.6, 0, 1);
  };

  /* ---------- 抢课：亮绿就点 ---------- */
  GAMES.rush = async (info) => {
    const dom = q(".mg-dom");
    const NAMES = ["电影与人生", "篮球（初级）", "西方音乐史", "心理学导论", "摄影基础", "中国古代建筑", "红酒鉴赏", "宇宙简史", "职业规划"];
    dom.innerHTML = `<div class="rush">${NAMES.map((n, i) => `<button class="rush-t" data-i="${i}"><b>${n}</b><span>余量 0</span></button>`).join("")}</div>`;
    const tiles = [...dom.querySelectorAll(".rush-t")];
    const state = tiles.map(() => ({ mode: "idle", until: 0 }));
    let got = 0, spawned = 0, wrong = 0;
    const set = (i, mode, ms) => {
      state[i] = { mode, until: performance.now() + ms };
      tiles[i].className = "rush-t " + mode;
      tiles[i].querySelector("span").textContent = mode === "green" ? "余量 " + (1 + Math.floor(rnd() * 3)) : mode === "red" ? "已满" : mode === "got" ? "✓ 已选上" : mode === "miss" ? "被抢走了" : "余量 0";
    };
    tiles.forEach((t, i) => t.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const st = state[i];
      if (st.mode === "green") { got++; set(i, "got", 450); if (DL.Audio) DL.Audio.blip("choose"); }
      else if (st.mode === "red") { wrong++; set(i, "bad", 400); if (navigator.vibrate) navigator.vibrate(30); }
    }));
    let t = 0, next = 0.3;
    await loop((dt, now) => {
      t += dt;
      state.forEach((st, i) => { if (st.mode !== "idle" && now > st.until) { if (st.mode === "green") set(i, "miss", 350); else set(i, "idle", 0); } });
      if (t > next) {
        const free = state.map((s, i) => (s.mode === "idle" ? i : -1)).filter((i) => i >= 0);
        if (free.length) {
          const i = free[Math.floor(rnd() * free.length)];
          if (rnd() < 0.24) set(i, "red", 900);
          else { set(i, "green", Math.max(520, 1050 - t * 45)); spawned++; }
        }
        next = t + Math.max(0.26, 0.6 - t * 0.03);
      }
      hud("已选 " + got + " 门" + (wrong ? " · 点错 " + wrong : ""));
      setBar(t / info.dur);
      if (t >= info.dur) return true;
    });
    return clamp((got - wrong * 0.7) / Math.max(1, spawned * 0.85), 0, 1);
  };

  /* ---------- 撑伞：别让林溪淋到雨 ---------- */
  GAMES.umbrella = async (info) => {
    const cv = q("canvas"), { g, W, H } = fitCanvas(cv), P = pointer(cv);
    const groundY = H * 0.86, figH = Math.min(150, H * 0.3);
    let ux = W / 2, t = 0, wet = 0, total = 0, wind = 0, windTarget = 0, fx = W / 2;
    const drops = [];
    const uw = Math.min(150, W * 0.42), uy = groundY - figH - 34;
    let keys = 0;
    const kd = (e) => { if (e.key === "ArrowLeft") keys = -1; if (e.key === "ArrowRight") keys = 1; };
    const ku = () => (keys = 0);
    addEventListener("keydown", kd); addEventListener("keyup", ku);
    await loop((dt) => {
      t += dt;
      if (rnd() < dt * 0.55) windTarget = (rnd() - 0.5) * 2 * (110 + t * 14);
      wind += (windTarget - wind) * dt * 1.2;
      fx = W / 2 + Math.sin(t * 0.9) * W * 0.18;
      if (P.down) ux += (P.x - ux) * Math.min(1, dt * 14);
      ux += keys * 420 * dt;
      ux = clamp(ux, uw / 2, W - uw / 2);
      for (let i = 0; i < 9; i++) if (rnd() < dt * 26) drops.push({ x: rnd() * (W + 400) - 200, y: -10 - rnd() * 40, vy: 520 + rnd() * 200 });
      g.clearRect(0, 0, W, H);
      g.strokeStyle = "rgba(190,210,240,.5)"; g.lineWidth = 1.2;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.x += wind * dt; d.y += d.vy * dt;
        g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x - wind * 0.03, d.y - 14); g.stroke();
        // 伞
        if (d.y > uy - 4 && d.y < uy + 10 && Math.abs(d.x - ux) < uw / 2) { drops.splice(i, 1); continue; }
        // 林溪
        if (d.y > groundY - figH && d.y < groundY - figH * 0.2 && Math.abs(d.x - fx) < figH * 0.16) { wet++; drops.splice(i, 1); continue; }
        if (d.y > groundY) { drops.splice(i, 1); total += Math.abs(d.x - fx) < figH * 0.5 ? 0.15 : 0; }
      }
      // 地面反光
      g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(0, groundY, W, 2);
      // 人
      const fy = groundY;
      g.fillStyle = "#cfd8ea";
      g.beginPath(); g.arc(fx, fy - figH * 0.88, figH * 0.1, 0, 6.283); g.fill();
      g.beginPath(); g.moveTo(fx - figH * 0.13, fy); g.lineTo(fx - figH * 0.12, fy - figH * 0.72); g.quadraticCurveTo(fx, fy - figH * 0.8, fx + figH * 0.12, fy - figH * 0.72); g.lineTo(fx + figH * 0.13, fy); g.fill();
      g.fillStyle = "#6fa8e8"; g.fillRect(fx - figH * 0.07, fy - figH * 0.55, figH * 0.14, figH * 0.09);
      // 伞
      g.fillStyle = "#1d1d1f"; g.strokeStyle = "#f6c978"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(ux - uw / 2, uy + 8); g.quadraticCurveTo(ux, uy - uw * 0.42, ux + uw / 2, uy + 8);
      for (let k = 4; k >= 0; k--) g.quadraticCurveTo(ux - uw / 2 + (uw / 5) * (k + 0.5), uy + 2, ux - uw / 2 + (uw / 5) * k, uy + 8);
      g.fill(); g.stroke();
      g.strokeStyle = "#f6c978"; g.beginPath(); g.moveTo(ux, uy + 8); g.lineTo(ux, uy + 60); g.arc(ux - 6, uy + 60, 6, 0, Math.PI); g.stroke();
      // 风向
      g.fillStyle = "rgba(255,255,255,.55)"; g.font = "13px -apple-system,sans-serif"; g.textAlign = "center";
      g.fillText(wind > 25 ? "风 →" : wind < -25 ? "← 风" : "· 风停了 ·", W / 2, 22);
      const dry = Math.max(0, 1 - wet / 60);
      hud("林溪 " + Math.round(dry * 100) + "% 干燥");
      setBar(t / info.dur);
      if (t >= info.dur) return true;
    });
    P.off(); removeEventListener("keydown", kd); removeEventListener("keyup", ku);
    return clamp(1 - wet / 60, 0, 1);
  };

  /* ---------- 投篮 / 最后一投：力度条 ---------- */
  async function shootGame(info) {
    const cv = q("canvas"), { g, W, H } = fitCanvas(cv);
    const shots = info.shots;
    let made = 0, shot = 0;
    const hoop = { x: W * 0.68, y: H * 0.3 };
    const ballStart = { x: W * 0.22, y: H * 0.8 };
    const meter = { x: W * 0.07, y: H * 0.18, w: 14, h: H * 0.6 };
    let fire = false;
    const onTap = (e) => { e.preventDefault(); fire = true; };
    const onKey = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); fire = true; } };
    cv.addEventListener("pointerdown", onTap); addEventListener("keydown", onKey);
    const results = [];
    while (shot < shots) {
      const zoneH = shots === 1 ? 0.12 : 0.2 - shot * 0.02;
      const zoneC = 0.55 + (rnd() - 0.5) * 0.3;
      const speed = 1.5 + shot * 0.22 + (shots === 1 ? 0.6 : 0);
      let ph = rnd() * 6, power = 0; fire = false;
      // 蓄力
      await loop((dt) => {
        ph += dt * speed * Math.PI;
        power = (Math.sin(ph) + 1) / 2;
        draw(power, zoneC, zoneH, null);
        if (fire) return true;
      });
      const inZone = Math.abs(power - zoneC) <= zoneH / 2;
      const off = power - zoneC;
      // 球飞
      let tt = 0;
      await loop((dt) => {
        tt += dt / 0.9;
        const k = Math.min(1, tt);
        const tx = hoop.x + (inZone ? 0 : off * W * 0.5), ty = hoop.y + (inZone ? 0 : -Math.abs(off) * 40);
        const bx = ballStart.x + (tx - ballStart.x) * k, by = ballStart.y + (ty - ballStart.y) * k - Math.sin(k * Math.PI) * H * 0.35;
        draw(power, zoneC, zoneH, { x: bx, y: by + (k >= 1 && inZone ? 18 : 0) });
        if (k >= 1) return true;
      });
      shot++;
      if (inZone) made++;
      results.push(inZone);
      if (DL.Audio) DL.Audio.blip(inZone ? "choose" : undefined);
      draw(power, zoneC, zoneH, null, inZone ? "进了！" : off > 0 ? "大了" : "短了");
      await sleep(700);
    }
    cv.removeEventListener("pointerdown", onTap); removeEventListener("keydown", onKey);
    return made / shots;

    function draw(power, zc, zh, ball, msg) {
      g.clearRect(0, 0, W, H);
      // 地板与灯光
      const fl = g.createLinearGradient(0, H * 0.82, 0, H); fl.addColorStop(0, "rgba(196,138,78,.25)"); fl.addColorStop(1, "rgba(196,138,78,.05)");
      g.fillStyle = fl; g.fillRect(0, H * 0.82, W, H * 0.18);
      // 篮板篮筐
      g.fillStyle = "rgba(255,255,255,.88)"; g.fillRect(hoop.x + 26, hoop.y - 60, 6, 74);
      g.strokeStyle = "#ee6a3c"; g.lineWidth = 4; g.beginPath(); g.ellipse(hoop.x, hoop.y, 26, 7, 0, 0, 6.283); g.stroke();
      g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 1;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(hoop.x + i * 8, hoop.y + 4); g.lineTo(hoop.x + i * 5, hoop.y + 34); g.stroke(); }
      // 力度条
      g.fillStyle = "rgba(255,255,255,.1)"; roundRect(meter.x, meter.y, meter.w, meter.h, 7); g.fill();
      g.fillStyle = "rgba(246,201,120,.85)"; roundRect(meter.x, meter.y + meter.h * (1 - zc - zh / 2), meter.w, meter.h * zh, 5); g.fill();
      const py = meter.y + meter.h * (1 - power);
      g.fillStyle = "#fff"; g.beginPath(); g.moveTo(meter.x + meter.w + 4, py); g.lineTo(meter.x + meter.w + 16, py - 7); g.lineTo(meter.x + meter.w + 16, py + 7); g.fill();
      // 球
      const b = ball || ballStart;
      g.fillStyle = "#e8803a"; g.beginPath(); g.arc(b.x, b.y, 16, 0, 6.283); g.fill();
      g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 1.5; g.beginPath(); g.arc(b.x, b.y, 16, 0, 6.283); g.moveTo(b.x - 16, b.y); g.lineTo(b.x + 16, b.y); g.moveTo(b.x, b.y - 16); g.lineTo(b.x, b.y + 16); g.stroke();
      // 战绩
      g.textAlign = "center"; g.font = "600 15px -apple-system,sans-serif";
      for (let i = 0; i < shots; i++) { g.fillStyle = i < results.length ? (results[i] ? "#f6c978" : "rgba(255,120,110,.8)") : "rgba(255,255,255,.2)"; g.beginPath(); g.arc(W / 2 + (i - (shots - 1) / 2) * 22, H * 0.08, 6, 0, 6.283); g.fill(); }
      if (msg) { g.fillStyle = "#fff"; g.font = "700 30px -apple-system,sans-serif"; g.fillText(msg, W / 2, H * 0.55); }
      else if (!ball) { g.fillStyle = "rgba(255,255,255,.55)"; g.font = "14px -apple-system,sans-serif"; g.fillText("点击屏幕出手", W / 2, H * 0.94); }
      hud("第 " + Math.min(shot + 1, shots) + " / " + shots + " 球 · 进了 " + made);
      setBar(shot / shots);
    }
    function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  }
  GAMES.shoot = shootGame;
  GAMES.clutch = shootGame;

  /* ---------- 演出：三轨节奏 ---------- */
  GAMES.rhythm = async (info) => {
    const cv = q("canvas"), { g, W, H } = fitCanvas(cv);
    const lanes = 3, laneW = Math.min(110, W / 3.4), x0 = W / 2 - laneW * 1.5, hitY = H * 0.82, speed = H * 0.55;
    const bpm = 96, beat = 60 / bpm;
    // 生成谱面：主歌稀疏，副歌密
    const notes = [];
    let tt = 1.6;
    const melody = [0, 2, 4, 7, 9, 7, 4, 2];
    let mi = 0;
    while (tt < info.dur - 1) {
      const dense = tt > info.dur * 0.45;
      notes.push({ t: tt, lane: Math.floor(rnd() * lanes), hit: null, n: melody[mi++ % melody.length] });
      tt += beat * (dense ? (rnd() < 0.4 ? 0.5 : 1) : rnd() < 0.3 ? 2 : 1);
    }
    let t = 0, combo = 0, best = 0, score = 0;
    const pops = [];
    const hitLane = (lane) => {
      const cand = notes.filter((n) => n.hit === null && n.lane === lane && Math.abs(n.t - t) < 0.22).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
      if (!cand) { combo = 0; pops.push({ lane, txt: "", t }); return; }
      const err = Math.abs(cand.t - t);
      cand.hit = err < 0.09 ? 1 : 0.6;
      score += cand.hit;
      combo++; best = Math.max(best, combo);
      pops.push({ lane, txt: cand.hit === 1 ? "完美" : "不错", t });
      if (DL.Audio && DL.Audio.note) DL.Audio.note(cand.n + lane * 12);
    };
    const onDown = (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); const lx = Math.floor((e.clientX - r.left - x0) / laneW); if (lx >= 0 && lx < lanes) hitLane(lx); };
    const onKey = (e) => { const m = { a: 0, s: 1, d: 2, j: 0, k: 1, l: 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2 }; if (e.key in m) { e.preventDefault(); hitLane(m[e.key]); } };
    cv.addEventListener("pointerdown", onDown); addEventListener("keydown", onKey);
    await loop((dt) => {
      t += dt;
      for (const n of notes) if (n.hit === null && t - n.t > 0.22) { n.hit = 0; combo = 0; }
      g.clearRect(0, 0, W, H);
      for (let i = 0; i < lanes; i++) {
        const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(165,139,224,.12)");
        g.fillStyle = lg; g.fillRect(x0 + i * laneW + 3, 0, laneW - 6, H);
        const flash = pops.some((p) => p.lane === i && t - p.t < 0.12);
        g.fillStyle = flash ? "rgba(246,201,120,.55)" : "rgba(255,255,255,.12)"; g.fillRect(x0 + i * laneW + 3, hitY - 3, laneW - 6, 6);
      }
      for (const n of notes) {
        if (n.hit !== null && n.hit > 0) continue;
        const y = hitY - (n.t - t) * speed;
        if (y < -30 || y > H + 30) continue;
        g.fillStyle = n.hit === 0 ? "rgba(255,120,110,.35)" : "#a58be0";
        const nx = x0 + n.lane * laneW + 8;
        g.beginPath(); g.roundRect ? g.roundRect(nx, y - 10, laneW - 16, 20, 10) : g.rect(nx, y - 10, laneW - 16, 20); g.fill();
      }
      g.textAlign = "center"; g.font = "700 17px -apple-system,sans-serif";
      for (const p of pops) { const a = 1 - (t - p.t) / 0.6; if (a <= 0 || !p.txt) continue; g.fillStyle = `rgba(246,201,120,${a})`; g.fillText(p.txt, x0 + p.lane * laneW + laneW / 2, hitY - 30 - (1 - a) * 20); }
      if (combo >= 4) { g.fillStyle = "rgba(255,255,255,.85)"; g.font = "700 26px -apple-system,sans-serif"; g.fillText(combo + " 连击", W / 2, H * 0.2); }
      g.fillStyle = "rgba(255,255,255,.4)"; g.font = "13px -apple-system,sans-serif"; g.fillText("点对应的一列（键盘 A S D）", W / 2, H * 0.96);
      hud("连击 " + combo + " · 最高 " + best);
      setBar(t / info.dur);
      if (t >= info.dur) return true;
    });
    cv.removeEventListener("pointerdown", onDown); removeEventListener("keydown", onKey);
    return clamp(score / Math.max(1, notes.length * 0.9), 0, 1);
  };

  /* ---------- 考前冲刺：翻牌配对 ---------- */
  const PAIRS = [
    ["导数", "瞬时变化率"], ["边际成本", "多生产一件的成本"], ["比较优势", "机会成本更低"], ["熵", "混乱程度"], ["马太效应", "强者愈强"],
    ["沉没成本", "已经花掉收不回的"], ["幸存者偏差", "只看见活下来的"], ["帕累托最优", "改善谁都要损害别人"], ["正态分布", "钟形曲线"], ["光合作用", "光能变化学能"],
    ["蝴蝶效应", "微小扰动放大"], ["囚徒困境", "个人理性集体非理性"], ["复利", "利滚利"], ["P 值", "显著性的证据"], ["递归", "函数调用自己"],
    ["通货膨胀", "钱变得不值钱"], ["边际效用递减", "第二碗没第一碗香"], ["相对论", "时空是相对的"], ["二八定律", "少数决定多数"], ["格式塔", "整体大于部分之和"],
  ];
  GAMES.cram = async (info) => {
    const dom = q(".mg-dom");
    const pool = PAIRS.slice().sort(() => rnd() - 0.5).slice(0, 6);
    const cards = [];
    pool.forEach((p, i) => { cards.push({ id: i, txt: p[0], k: "term" }); cards.push({ id: i, txt: p[1], k: "def" }); });
    cards.sort(() => rnd() - 0.5);
    dom.innerHTML = `<div class="cram">${cards.map((c, i) => `<button class="cram-c ${c.k}" data-i="${i}"><span class="f">?</span><span class="b">${c.txt}</span></button>`).join("")}</div>`;
    const els = [...dom.querySelectorAll(".cram-c")];
    let open = [], matched = 0, lock = false, t = 0, misses = 0;
    els.forEach((el, i) => el.addEventListener("click", () => {
      if (lock || el.classList.contains("up") || el.classList.contains("done")) return;
      el.classList.add("up"); open.push(i);
      if (open.length === 2) {
        const [a, b] = open;
        if (cards[a].id === cards[b].id) {
          matched++; open = [];
          setTimeout(() => { els[a].classList.add("done"); els[b].classList.add("done"); }, 220);
          if (DL.Audio) DL.Audio.blip("choose");
        } else {
          lock = true; misses++;
          setTimeout(() => { els[a].classList.remove("up"); els[b].classList.remove("up"); open = []; lock = false; }, 650);
        }
      }
    }));
    await loop((dt) => {
      t += dt;
      hud("配对 " + matched + " / 6");
      setBar(t / info.dur);
      if (matched >= 6 || t >= info.dur) return true;
    });
    await sleep(400);
    const timeBonus = matched >= 6 ? clamp((info.dur - t) / info.dur, 0, 1) * 0.3 : 0;
    return clamp(matched / 6 * 0.8 + timeBonus - misses * 0.01, 0, 1);
  };

  DL.Games = { play, INFO };
})(typeof window !== "undefined" ? window : globalThis);
