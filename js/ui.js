/* 宿舍人生 · 界面层：把引擎的 io 接口变成画面 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const STAT_COLOR = { study: "#8fc1ff", body: "#8be0b0", mood: "#ffc77a", money: "#f2e1b5", exp: "#d2b3ff", prep: "#ff9fb5" };

  /* ---------- 本地存储（隐私模式可能抛错） ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 忽略 */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* 忽略 */ } },
  };
  const settings = Object.assign({ speed: "mid", sound: true, auto: false, size: "m" }, store.get("dl2.settings", {}));
  const saveSettings = () => store.set("dl2.settings", settings);
  const CPS = { slow: 22, mid: 42, fast: 90, instant: 0 };

  /* ---------- 舞台 ---------- */
  const Stage = {
    cur: null, key: "", front: null, back: null, weather: null, flip: false,
    init() {
      this.front = $("bgA"); this.back = $("bgB");
      // 桌面端：鼠标带动极轻的视差
      const st = $("stage");
      if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
        addEventListener("pointermove", (e) => {
          tx = (e.clientX / innerWidth - 0.5) * -14; ty = (e.clientY / innerHeight - 0.5) * -10;
          if (!raf) raf = requestAnimationFrame(function step() { cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06; st.style.setProperty("--px", cx.toFixed(2) + "px"); st.style.setProperty("--py", cy.toFixed(2) + "px"); raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.1 ? requestAnimationFrame(step) : 0; });
        });
      }
      this.weather = new DL.Art.Weather($("fx"));
      let rt = null;
      addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => this.weather.set(this.cur), 200); });
    },
    async show(sc, instant) {
      const r = DL.Art.resolve(sc);
      const key = r.key + "|" + r.grade + "|" + sc.weather;
      this.cur = sc;
      if (key === this.key) return;
      this.key = key;
      await Promise.race([DL.Art.preload(r.url), sleep(2500)]);
      const target = instant ? this.front : this.back;
      target.style.backgroundImage = "url('" + r.url + "')";
      target.dataset.grade = r.grade;
      const app = $("app");
      app.dataset.time = sc.time || "day";
      app.dataset.weather = sc.weather || "clear";
      this.flip = !this.flip;
      target.classList.toggle("alt", this.flip);
      this.weather.set(sc);
      if (DL.Audio) DL.Audio.scene(sc);
      if (!instant) {
        this.back.classList.add("on"); this.front.classList.remove("on");
        [this.front, this.back] = [this.back, this.front];
        await sleep(700);
      } else this.front.classList.add("on");
    },
  };

  /* ---------- 推进 ---------- */
  let advanceResolver = null;
  function waitAdvance() { return new Promise((r) => { advanceResolver = r; }); }
  function advance() { if (typing) { finishTyping(); return; } const r = advanceResolver; advanceResolver = null; if (r) { if (DL.Audio) DL.Audio.blip(); r(); } }

  /* ---------- 对话 ---------- */
  let typing = null;
  function finishTyping() { if (typing) { clearInterval(typing.timer); typing.node.textContent = typing.text; const done = typing.done; typing = null; done(); } }
  function typeText(node, text) {
    return new Promise((resolve) => {
      const cps = CPS[settings.speed];
      if (!cps || document.hidden) { node.textContent = text; resolve(); return; }
      node.textContent = "";
      let i = 0;
      const chars = Array.from(text);
      // 每个字是一个 span，带一个很短的模糊 → 清晰的浮现动画
      const frag = document.createDocumentFragment();
      const spans = chars.map((c) => { const sp = document.createElement("span"); sp.className = "ch"; sp.textContent = c; frag.appendChild(sp); return sp; });
      node.appendChild(frag);
      typing = { node, text, done: resolve, timer: setInterval(() => {
        if (spans[i]) spans[i].classList.add("in");
        i += 1;
        if (i >= chars.length) { clearInterval(typing.timer); typing = null; resolve(); }
      }, 1000 / cps) };
    });
  }
  function setSpeaker(who, s) {
    const sp = $("speaker"), mono = $("speakerMono"), name = $("speakerName");
    if (!who) { sp.classList.add("none"); sp.dataset.who = ""; return; }
    sp.classList.remove("none");
    let n, c, m;
    if (who === "me") { n = s.name; c = "#e9e3d6"; m = s.name.slice(0, 1); }
    else if (who[0] === "?") { n = who.slice(1); c = "#9aa0b4"; m = n.slice(0, 1); }
    else { const C = DL.CAST[who] || {}; n = C.name || who; c = C.color || "#ccc"; m = C.mono || n.slice(0, 1); }
    if (sp.dataset.who !== who) { sp.dataset.who = who; sp.classList.remove("swap"); void sp.offsetWidth; sp.classList.add("swap"); }
    name.textContent = n; mono.textContent = m; sp.style.setProperty("--c", c); mono.style.setProperty("--c", c); name.style.color = c;
  }
  const history = [];
  function remember(item) { history.push(item); if (history.length > 240) history.shift(); }
  function speakerName(who, s) {
    if (!who) return "";
    if (who === "me") return s.name;
    if (who[0] === "?") return who.slice(1);
    return (DL.CAST[who] || {}).name || who;
  }
  let autoTimer = null;
  let coached = false;
  /* 已读记录：跨周目保存，用于“快进已读” */
  const READ_KEY = "dl2.read";
  const readSet = new Set(store.get(READ_KEY, []));
  let readTimer = null;
  function hashLine(t) { let h = 5381; for (const ch of t) h = (Math.imul(h, 33) ^ ch.codePointAt(0)) >>> 0; return h.toString(36); }
  function markRead(h) {
    if (readSet.has(h)) return;
    readSet.add(h);
    clearTimeout(readTimer);
    readTimer = setTimeout(() => store.set(READ_KEY, Array.from(readSet).slice(-12000)), 800);
  }
  function setSkip(on) {
    settings.skip = !!on;
    document.dispatchEvent(new CustomEvent("dorm:skip", { detail: settings.skip }));
    if (on && advanceResolver) advance();
  }
  async function say(who, text, s) {
    const d = $("dialog"), line = $("line");
    d.classList.remove("idle", "ready");
    setSpeaker(who, s);
    line.className = "line" + (who ? "" : " narr") + (who === "me" ? " inner" : "");
    remember({ who: speakerName(who, s), c: who && DL.CAST[who] ? DL.CAST[who].color : "", text });
    const h = hashLine((who || "") + "|" + text);
    const wasRead = readSet.has(h);
    markRead(h);
    if (settings.skip) {
      if (wasRead) { line.textContent = text; await sleep(55); return; }
      setSkip(false);
    }
    await typeText(line, text);
    d.classList.add("ready");
    if (!coached) { coached = true; setTimeout(coach, 400); }
    const wait = waitAdvance();
    if (settings.auto) autoTimer = setTimeout(() => { if (advanceResolver && !$("app").querySelector(".overlay:not(.hidden)")) advance(); }, 1100 + Array.from(text).length * 70);
    await wait;
    clearTimeout(autoTimer);
    d.classList.remove("ready");
  }

  /* ---------- 选项 ---------- */
  function ask(prompt, opts, s) {
    return new Promise(async (resolve) => {
      const d = $("dialog");
      d.classList.add("idle");
      const box = $("choices");
      box.innerHTML = "";
      box.classList.add("on"); box.classList.remove("leaving");
      if (prompt) box.appendChild(el("p", "choice-prompt", esc(prompt)));
      const backdrop = el("div", "choices-backdrop"); $("gameScreen").appendChild(backdrop); requestAnimationFrame(() => (backdrop.style.opacity = 1));
      focusStage(true);
      const pick = async (i, btn) => {
        if (!box.classList.contains("on")) return;
        box.classList.remove("on"); btn.classList.add("picked"); box.classList.add("leaving");
        if (DL.Audio) DL.Audio.blip("choose");
        haptic(8);
        remember({ choice: true, text: opts[i].t });
        keyHandler = null;
        await sleep(380);
        box.innerHTML = ""; backdrop.remove(); focusStage(false);
        resolve(i);
      };
      opts.forEach((o, i) => {
        const b = el("button", "choice", esc(DL.stripEmoji ? DL.stripEmoji(o.t) : o.t) + (o.hint ? "<small>" + esc(o.hint) + "</small>" : ""));
        b.dataset.n = DL.NUM_CN ? DL.NUM_CN[i] : i + 1; b.style.animationDelay = 0.06 * i + 0.1 + "s";
        b.addEventListener("click", (e) => { e.stopPropagation(); pick(i, b); });
        box.appendChild(b);
      });
      keyHandler = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= opts.length) pick(n - 1, box.querySelectorAll(".choice")[n - 1]); };
      const first = box.querySelector(".choice"); if (first && matchMedia("(hover: hover)").matches) setTimeout(() => first.focus({ preventScroll: true }), 200);
    });
  }
  let keyHandler = null;

  /* ---------- HUD ---------- */
  let lastStats = null;
  function hud(s) {
    const sem = DL.SEMESTERS[Math.min(s.sem, 7)];
    $("hudSem").innerHTML = sem ? `<small>Semester ${DL.ROMAN[Math.min(s.sem, 7)]}</small>${esc(sem.label)}` : "";
    const box = $("hudStats");
    const keys = ["study", "body", "mood"];
    if (!box.children.length) {
      box.innerHTML = keys.map((k) => `<span class="pill ${k}" data-k="${k}">${DL.STAT_NAMES[k]}<span class="bar"><i></i></span></span>`).join("") + `<span class="pill money" data-k="money">¥<b></b></span>`;
    }
    for (const k of keys) {
      const p = box.querySelector(`[data-k="${k}"]`); p.querySelector("i").style.width = s.stats[k] + "%";
      p.classList.toggle("low", s.stats[k] <= 20);
      p.title = DL.STAT_NAMES[k] + " " + s.stats[k];
    }
    const mp = box.querySelector('[data-k="money"]'); mp.querySelector("b").textContent = s.stats.money.toLocaleString();
    if (lastStats) for (const k of keys.concat("money")) {
      const d = s.stats[k] - lastStats[k];
      if (d) { const p = box.querySelector(`[data-k="${k}"]`); p.classList.remove("flash-up", "flash-down"); void p.offsetWidth; p.classList.add(d > 0 ? "flash-up" : "flash-down"); setTimeout(() => p.classList.remove("flash-up", "flash-down"), 900); }
    }
    lastStats = Object.assign({}, s.stats);
  }
  function toast(changes, s) {
    hud(s);
    const box = $("toasts");
    changes.slice(0, 5).forEach((c, i) => {
      const up = c.delta > 0;
      const v = c.key === "money" ? "¥" + Math.abs(c.delta) : Math.abs(c.delta);
      const label = c.kind === "rel" ? `${esc(c.name)} <span class="heart">♥</span>` : esc(c.name);
      const t = el("div", "toast " + (up ? "up" : "down"), `${label} <b>${up ? "+" : "−"}${v}</b>`);
      t.style.animationDelay = i * 0.12 + "s";
      box.appendChild(t);
      setTimeout(() => t.remove(), 3000 + i * 120);
      // 关系升级
      if (c.kind === "rel" && up && DL.levelOf) {
        const after = s.rel[c.key], lv = DL.levelOf(after);
        if (lv > DL.levelOf(after - c.delta) && lv >= 2) {
          const L = el("div", "toast lvl", `${esc(c.name)} 成为你的 <b>${DL.LEVELS[lv]}</b>`);
          L.style.animationDelay = (i * 0.12 + 0.5) + "s";
          box.appendChild(L);
          setTimeout(() => L.remove(), 3800);
          if (DL.Audio) setTimeout(() => DL.Audio.blip("mem"), 500);
        }
      }
    });
  }
  // “江野会记住这件事。”
  let remTimer = null;
  function remember(r) {
    let box = $("remember");
    if (!box) { box = el("div", "remember"); box.id = "remember"; $("gameScreen").appendChild(box); }
    box.className = "remember " + (r.up ? "up" : "down");
    box.innerHTML = `<i></i><span><b>${esc(r.name)}</b>${r.up ? "会记住这件事。" : "记下了这件事。"}</span>`;
    void box.offsetWidth; box.classList.add("show");
    clearTimeout(remTimer); remTimer = setTimeout(() => box.classList.remove("show"), 3400);
  }
  // 继续游戏：前情提要
  async function recap(s) {
    const sem = DL.SEMESTERS[Math.min(s.sem, 7)];
    const notes = s.journal.slice(-3).map((j) => j.text);
    const mems = s.memories.slice(-2).map((m) => m.title);
    const days = Math.max(0, Math.round((Date.now() - (s.savedAt || Date.now())) / 864e5));
    const ago = s.savedAt ? (days < 1 ? "今天早些时候" : days === 1 ? "昨天" : days + " 天前") : "";
    const o = overlay(`<div class="recap"><p class="rc-latin">Previously</p><h3>上次说到</h3><p class="rc-sem"><span class="ch-seal">${DL.NUM_CAP[Math.min(s.sem, 7)]}</span>${esc(sem.label)} · ${esc(sem.title)}</p>
      ${mems.length ? `<p class="rc-mem">最近的回忆：${mems.map((m) => "「" + esc(m) + "」").join("")}</p>` : ""}
      ${notes.length ? `<ul>${notes.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : `<p class="rc-mem">四年才刚开始。</p>`}
      <p class="rc-ago">${ago ? esc(ago) + "离开 · " : ""}轻触继续</p></div>`, "dark");
    await overlayTap(o, 700);
    await closeOverlay();
  }

  // 成就横幅：依次弹出
  const achQueue = [];
  let achBusy = false;
  function achieve(a) {
    achQueue.push(a);
    if (!achBusy) nextAch();
  }
  async function nextAch() {
    const a = achQueue.shift();
    if (!a) { achBusy = false; return; }
    achBusy = true;
    const t = el("div", "ach-toast", `<span class="ai">${a.icon}</span><span><small>成就解锁</small><b>${esc(a.name)}</b></span>`);
    $("app").appendChild(t);
    if (DL.Audio) DL.Audio.blip("mem");
    haptic(20);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("show")));
    await sleep(2600);
    t.classList.remove("show");
    await sleep(600);
    t.remove();
    nextAch();
  }
  function heading(text) {
    const h = $("heading");
    h.textContent = text; h.classList.remove("show"); void h.offsetWidth; h.classList.add("show");
    return sleep(500);
  }

  /* ---------- 覆盖层 ---------- */
  function focusStage(on) { const st = $("stage"); if (st) st.classList.toggle("focus", !!on); }
  function overlay(html, cls) {
    focusStage(true);
    const o = $("overlay");
    o.className = "overlay " + (cls || "");
    o.innerHTML = "";
    if (typeof html === "string") o.innerHTML = html; else if (html) o.appendChild(html);
    return o;
  }
  async function closeOverlay() {
    const o = $("overlay");
    if (o.classList.contains("hidden")) return;
    o.classList.add("out"); focusStage(false); await sleep(280); o.className = "overlay hidden"; o.innerHTML = "";
  }
  function overlayTap(o, delay) {
    return new Promise((resolve) => {
      let ok = false, done = false; setTimeout(() => (ok = true), delay || 600);
      const go = () => { if (!ok || done) return; done = true; o.removeEventListener("click", go); keyHandler = null; resolve(); };
      o.addEventListener("click", go);
      if (settings.skip) setTimeout(() => { if (settings.skip) { ok = true; go(); } }, 500);
      keyHandler = (e) => { if (e.key === " " || e.key === "Enter") go(); };
    });
  }

  const CH_SCENE = [
    { at: "gate", time: "day", season: "autumn" }, { at: "road", time: "day", season: "spring" },
    { at: "gate", time: "dusk", season: "autumn" }, { at: "field", time: "dusk", season: "spring" },
    { at: "road", time: "dusk", season: "autumn" }, { at: "station", time: "dusk", season: "spring" },
    { at: "road", time: "night", season: "autumn" }, { at: "dormout", time: "dusk", season: "summer" },
  ];
  function moneyLine(s) {
    const f = DL.FAMILY[s.family];
    return `每月生活费 <b>¥${f.monthly.toLocaleString()}</b> · 本学期 ¥${f.allowance.toLocaleString()}` + (f.grant ? ` · 助学金 ¥${f.grant.toLocaleString()}` : "");
  }
  // 后台按顺序预载这一学期会出现的照片，进场景时不再等图
  function preloadSemester(sem, s) {
    const season = (sem.season || (sem.label && sem.label.indexOf("下") >= 0 ? "spring" : "autumn"));
    const seen = new Set();
    const add = (st) => { if (st && st.at) { const u = DL.Art.url(DL.Art.photoFor({ at: st.at, time: st.time || "day", weather: st.weather || "clear", season: st.season || season, photo: st.photo })); seen.add(u); } };
    for (const b of sem.beats) {
      const sc = DL.SCENES && DL.SCENES[b];
      if (!sc) continue;
      add(sc);
      let steps = sc.steps;
      if (typeof steps === "function") { try { steps = steps(s); } catch (e) { steps = null; } }
      if (Array.isArray(steps)) steps.forEach((x) => x && typeof x === "object" && !Array.isArray(x) && add(x));
    }
    const list = [...seen];
    const next = () => { const u = list.shift(); if (u) DL.Art.preload(u).then(() => setTimeout(next, 120)); };
    setTimeout(next, 1800);
  }
  async function chapter(sem, s) {
    const i = DL.SEMESTERS.indexOf(sem);
    preloadSemester(sem, s);
    await Stage.show(Object.assign({ weather: "clear" }, CH_SCENE[i] || CH_SCENE[0]));
    hud(s);
    $("dialog").classList.add("idle");
    const N = ["第一章", "第二章", "第三章", "第四章", "第五章", "第六章", "第七章", "终章"][i];
    const EN = i === 7 ? "The Last Chapter" : "Chapter " + DL.EN_NUM[i];
    // 竖排：每个字一行，不依赖字体的竖排度量
    const col = (t) => Array.from(t).filter((c) => c.trim() && c !== "·").map((c) => `<span>${esc(c)}</span>`).join("");
    const o = overlay(`<div class="letterbox top"></div><div class="letterbox bot"></div><div class="chapter v2"><p class="ch-latin">${EN}</p><div class="ch-row"><div class="ch-meta"><p class="ch-n vcol">${col(N)}</p><p class="ch-label vcol">${col(sem.label)}</p><span class="ch-seal">${DL.NUM_CAP[i]}</span></div><h2 class="ch-title vcol">${col(sem.title)}</h2></div><p class="ch-quote">${esc(sem.quote)}</p><p class="ch-money">${moneyLine(s)}</p><p class="ch-tap">轻触继续</p></div>`, "dark");
    await overlayTap(o, 1400);
    await closeOverlay();
  }

  async function card(title, sub) {
    $("dialog").classList.add("idle");
    const o = overlay(`<div class="bigcard"><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div>`, "black");
    await sleep(2600);
    await closeOverlay();
  }

  function tagsFor(fx) {
    const out = [];
    for (const k of Object.keys(fx)) {
      if (k === "rel") { for (const w of Object.keys(fx.rel)) out.push(`<span class="tag rel">${esc(DL.CAST[w].name)} ♥</span>`); continue; }
      if (!(k in DL.STAT_NAMES) || typeof fx[k] !== "number") continue;
      const v = fx[k]; out.push(`<span class="tag ${v > 0 ? "up" : "down"}">${DL.STAT_NAMES[k]} ${v > 0 ? "↑" : "↓"}${k === "money" ? Math.abs(v) : ""}</span>`);
    }
    return out.join("");
  }
  function plan(opts, n, s) {
    return new Promise((resolve) => {
      $("dialog").classList.add("idle");
      const picks = [];
      const sheet = el("div", "sheet");
      sheet.innerHTML = `<div class="sheet-grip"></div><div class="sheet-head"><h3>这个学期，时间花在哪？</h3><p>选 ${n} 件事，同一件最多两次。</p><p class="plan-now">学业 <b>${s.stats.study}</b> · 体魄 <b>${s.stats.body}</b> · 心情 <b>${s.stats.mood}</b> · 存款 <b>¥${s.stats.money.toLocaleString()}</b></p></div><div class="slots"></div><div class="plan-forecast"></div><div class="sheet-body"><div class="focus-grid"></div></div><div class="sheet-foot"><button class="btn primary" disabled>就这样过</button></div>`;
      const grid = sheet.querySelector(".focus-grid"), slots = sheet.querySelector(".slots"), go = sheet.querySelector(".sheet-foot .btn");
      const render = () => {
        slots.innerHTML = "";
        for (let i = 0; i < n; i++) {
          const f = opts.find((o) => o.id === picks[i]);
          const sl = el("button", "slot" + (f ? " filled" : ""), f ? `<span class="si">${f.icon}</span>${esc(f.name)}` : "空");
          if (f) sl.onclick = () => { picks.splice(i, 1); render(); };
          slots.appendChild(sl);
        }
        grid.querySelectorAll(".focus-card").forEach((c) => {
          const k = picks.filter((p) => p === c.dataset.id).length;
          c.classList.toggle("n1", k === 1); c.classList.toggle("n2", k === 2);
          c.querySelector(".fc").textContent = k ? "×" + k : "";
          c.classList.toggle("dim", picks.length >= n && !k);
        });
        go.disabled = picks.length < n;
        const fc = sheet.querySelector(".plan-forecast");
        if (DL.previewPlan) {
          const pv = DL.previewPlan(s, picks);
          const d = (k) => { const v = pv.stats[k] - s.stats[k]; return v ? `<small style="color:${v > 0 ? "#9ee6b4" : "#ff9c92"}">${v > 0 ? "+" : ""}${v}</small>` : ""; };
          fc.innerHTML = `预计期末绩点 <b>${pv.gpaLo.toFixed(2)}–${pv.gpaHi.toFixed(2)}</b>` + (pv.scholarship ? ` · <span class="pf-sch">有机会拿${pv.scholarship.name}</span>` : "") +
            `<br>学业 <b>${pv.stats.study}</b>${d("study")} · 体魄 <b>${pv.stats.body}</b>${d("body")} · 心情 <b>${pv.stats.mood}</b>${d("mood")}` +
            pv.warn.map((w) => `<span class="pf-warn">⚠ ${esc(w)}</span>`).join("");
        }
      };
      for (const o of opts) {
        const c = el("button", "focus-card", `<span class="fi">${o.icon}</span><span><span class="fn">${esc(o.name)}</span><span class="fd">${esc(o.desc)}</span><span class="ft">${tagsFor(o.fx)}</span></span><span class="fc"></span>`);
        c.dataset.id = o.id;
        c.onclick = () => {
          const k = picks.filter((p) => p === o.id).length;
          if (picks.length < n && k < 2) picks.push(o.id);
          else if (k > 0) picks.splice(picks.lastIndexOf(o.id), 1);
          if (DL.Audio) DL.Audio.blip();
          render();
        };
        grid.appendChild(c);
      }
      go.onclick = async () => { await closeOverlay(); resolve(picks.slice()); };
      overlay(sheet, "sheet-mode");
      render();
    });
  }

  async function montage(lines) {
    if (!lines.length) return;
    const box = el("div", "montage");
    lines.forEach((l, i) => { const p = el("p", "", esc(l)); p.style.animationDelay = 0.3 + i * 1.1 + "s"; box.appendChild(p); });
    box.appendChild(el("p", "tapnote", "轻触继续"));
    box.lastChild.style.animationDelay = 0.3 + lines.length * 1.1 + "s";
    const o = overlay(box, "dark");
    await overlayTap(o, 900);
    await closeOverlay();
  }

  async function transcript(d, s) {
    hud(s);
    const stamp = d.failed ? "补考" : d.scholarship ? ["", "一等", "二等", "三等"][d.scholarship.tier] + "<br>奖学金" : d.gpa >= 3 ? "良好" : d.gpa >= 2 ? "合格" : "警告";
    const t = el("div", "transcript paper");
    t.innerHTML = `<h3>成绩单</h3><p class="t-sub">${esc(d.sem.label)} · ${esc(s.name)}</p><div class="gpa">${d.gpa.toFixed(2)}</div><p class="gpa-l">本学期绩点</p>
      <div class="stamp">${stamp}</div>
      <dl><dt>专业排名</dt><dd>${esc(d.rank)}</dd><dt>平均绩点</dt><dd>${d.avg.toFixed(2)}</dd><dt>挂科</dt><dd class="${d.failed ? "bad" : ""}">${d.failed ? d.failed + " 门（累计 " + d.totalFails + "）" : "无"}</dd>${d.cram != null ? `<dt>考前冲刺</dt><dd>${Math.round(d.cram * 100)}%</dd>` : ""}${d.scholarship ? `<dt>${esc(d.scholarship.name)}</dt><dd style="color:#1e8a4c">+¥${d.scholarship.amount.toLocaleString()}</dd>` : ""}${d.fitness != null ? `<dt>体测</dt><dd class="${d.fitness ? "" : "bad"}">${d.fitness ? "通过" : "没过，下学期补测"}</dd>` : ""}<dt>生活开销</dt><dd>−¥${(d.living || DL.LIVING_COST).toLocaleString()}<small style="font-weight:400;color:#86868b"> · 5 个月</small></dd><dt>余额</dt><dd class="${d.money < 0 ? "bad" : ""}">¥${d.money.toLocaleString()}</dd></dl>
      <p class="tapline">轻触继续</p>`;
    const o = overlay(t, "dark");
    await overlayTap(o, 900);
    await closeOverlay();
  }

  async function memory(mem, s) {
    if (DL.Audio) DL.Audio.blip("mem");
    const p = el("div", "", "");
    p.innerHTML = `<p class="mem-badge">✦ 收进回忆 ✦</p><div class="polaroid"><div class="ph" style="background-image:url('${DL.Art.thumb(mem.scene)}')"><span class="ph-date">${esc((DL.SEMESTERS[mem.sem] || {}).label || "")}</span></div><h4>${esc(mem.title)}</h4><p>${esc(mem.text)}</p></div>`;
    const o = overlay(p, "dark");
    await overlayTap(o, 1200);
    await closeOverlay();
  }

  /* ---------- 手账 ---------- */
  function journal(s) {
    const sheet = el("div", "sheet");
    sheet.innerHTML = `<div class="sheet-grip"></div><div class="sheet-head"><h3>${esc(s.name)} 的手账</h3><p>${esc(DL.SEMESTERS[Math.min(s.sem, 7)].label)} · 平均绩点 ${DL.gpaAvg(s).toFixed(2) || "—"}</p></div>
      <div class="tabs"><button class="tab on" data-t="me">状态</button><button class="tab" data-t="people">人</button><button class="tab" data-t="mem">回忆</button><button class="tab" data-t="diary">日记</button></div>
      <div class="sheet-body"></div><div class="sheet-foot"><button class="btn ghost">合上</button></div>`;
    const body = sheet.querySelector(".sheet-body");
    const show = (t) => {
      sheet.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
      if (t === "me") {
        const keys = ["study", "body", "mood"].concat(s.sem >= 4 ? ["exp", "prep"] : ["exp"]);
        body.innerHTML = keys.map((k) => `<div class="statrow"><span>${DL.STAT_NAMES[k]}</span><span class="sb"><i style="width:${s.stats[k]}%;background:${STAT_COLOR[k]}"></i></span><b>${s.stats[k]}</b></div>`).join("") +
          `<div class="statrow"><span>存款</span><span></span><b>¥${s.stats.money.toLocaleString()}</b></div>` +
          `<p class="muted">学业决定绩点和去向；体魄或心情太低，会撑不住。${s.flags.path ? "你选择了：" + esc(DL.PATHS[s.flags.path].name) + "。" : ""}</p>` +
          (DL.talentsOf && DL.talentsOf(s).length ? `<p class="muted" style="margin-top:14px">你的天赋</p>` + DL.talentsOf(s).map((t) => `<div class="ach-item"><span class="ai">${t.icon}</span><span><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></span></div>`).join("") : "");
      } else if (t === "people") {
        body.innerHTML = DL.REL_ORDER.filter((k) => k !== "lin" || s.flags.metLin).filter((k) => k !== "cheng" || s.flags.metCheng).map((k) => {
          const C = DL.CAST[k], v = s.rel[k];
          const note = k === "su" && s.flags.suLeft ? "（休学中）" : k === "lin" && s.flags.together && !s.flags.linBreak ? "（在一起）" : "";
          return `<div class="person"><i class="mono" style="--c:${C.color}">${C.mono}</i><div><h5>${C.name}${note}<small>${v}</small></h5><p>${esc(C.line)} — ${esc(C.bio)}</p><div class="hearts"><i style="width:${v}%;background:${C.color}"></i></div></div></div>`;
        }).join("");
      } else if (t === "mem") {
        body.innerHTML = s.memories.length ? `<div class="mem-grid">${s.memories.map((m) => `<div class="mem"><div class="ph" style="background-image:url('${DL.Art.thumb(m.scene)}')"></div><h6>${esc(m.title)}</h6><p>${esc(m.text)}</p></div>`).join("")}</div>` : `<p class="empty">还没有回忆。故事才刚开始。</p>`;
      } else {
        const items = s.journal.slice().reverse();
        let lastSem = -1;
        body.innerHTML = `<div class="diary">${items.map((j) => { const head = j.sem !== lastSem ? `<span class="sem">${esc(DL.SEMESTERS[j.sem].label)}</span>` : ""; lastSem = j.sem; return head + `<p>${esc(j.text)}</p>`; }).join("") || '<p class="empty">空白的一页。</p>'}</div>`;
      }
      body.scrollTop = 0;
    };
    sheet.querySelectorAll(".tab").forEach((b) => (b.onclick = () => show(b.dataset.t)));
    sheet.querySelector(".sheet-foot .btn").onclick = () => closeOverlay();
    const o = overlay(sheet, "sheet-mode");
    o.onclick = (e) => { if (e.target === o) closeOverlay(); };
    show("me");
  }

  /* ---------- 毕业纪念册 ---------- */
  function epilogue(e, s, hooks) {
    return new Promise((resolve) => {
      const yb = $("yearbook");
      const C = DL.CAST;
      const fate = (f) => `<div class="yb-card"><div class="yc-top"><i class="mono" style="--c:${C[f.who].color}">${C[f.who].mono}</i><div><h4>${esc(f.title)}</h4><span class="yc-who">${esc(C[f.who].name)}</span></div></div><p>${esc(f.text)}</p></div>`;
      const mems = s.memories.map((m) => `<div class="mem"><div class="ph" style="background-image:url('${DL.Art.thumb(m.scene)}')"></div><h6>${esc(m.title)}</h6><p>${esc(m.text)}</p></div>`).join("");
      const heroImg = DL.Art.url(e.path.ok ? "station-dawn" : "station-night");
      yb.innerHTML = `<div class="yb-hero"><div class="yb-img" style="background-image:url('${heroImg}')"></div><div class="yb-cover"><p class="k">毕业纪念册</p><h1>${esc(s.name)} 的四年</h1><p class="muted">7 号楼 · 404 · 「${esc(s.flags.group || "404")}」</p></div></div><div class="yb">
        <div class="yb-title"><small>你的称号</small><b>${esc(e.title.name)}</b><p>${esc(e.title.desc)}</p>${DL.talentsOf ? `<div class="tal-row">${DL.talentsOf(s).map((t) => `<span class="tal-chip ${t.r}">${t.icon} ${esc(t.name)}</span>`).join("")}</div>` : ""}</div>
        ${s.ach && s.ach.length ? `<section class="yb-sec"><h3>这一局的成就 · ${s.ach.length}</h3><div class="ach-grid">${s.ach.map((id) => DL.ACH.find((x) => x.id === id)).filter(Boolean).map((x) => `<div class="ach-item"><span class="ai">${x.icon}</span><span><b>${esc(x.name)}</b><span>${esc(x.desc)}</span></span></div>`).join("")}</div></section>` : ""}
        <section class="yb-sec"><h3>十年后的你</h3><div class="yb-card"><div class="yc-top"><span class="yc-icon">${e.path.icon}</span><div><h4>${esc(e.path.name)}<span class="result ${e.path.ok ? "ok" : "no"}">${esc(e.path.result)}</span></h4></div></div><p>${esc(e.path.text)}</p></div></section>
        <section class="yb-sec"><h3>十年后的他们</h3>${e.fates.map(fate).join("")}${fate(e.lin)}</section>
        <section class="yb-sec"><h3>十年后的 404</h3><div class="yb-reunion" style="--rimg:url('${new URL(DL.Art.url(e.reunion.count >= 3 ? "dormout-night" : "dorm-dusk"), location.href).href}')"><p class="count">${esc(e.reunion.title)}</p><p>${esc(e.reunion.text)}</p></div></section>
        <section class="yb-sec"><h3>四年</h3><div class="yb-stats"><div class="yb-stat"><b>${e.gpa.toFixed(2)}</b><span>平均绩点</span></div><div class="yb-stat"><b>${s.memories.length}</b><span>段回忆</span></div><div class="yb-stat"><b>${Math.round((s.rel.jiang + s.rel.su + s.rel.xu) / 3)}</b><span>404 羁绊</span></div></div></section>
        ${mems ? `<section class="yb-sec"><h3>相册</h3><div class="mem-grid">${mems}</div></section>` : ""}
        <section class="yb-sec yb-global" id="ybGlobal"><h3>这一届</h3><p class="muted">正在联系教务处……</p></section>
        <div class="yb-actions"><button class="btn primary" id="ybPoster">生成毕业海报</button><button class="btn ghost" id="ybAgain">再活一次</button><button class="btn text" id="ybHome">回到首页</button></div>
        <p class="yb-end">— 全剧终 · 谢谢你推开 404 的门 —</p></div>`;
      yb.classList.remove("hidden");
      yb.scrollTop = 0;
      const secs = yb.querySelectorAll(".yb-sec");
      const io = "IntersectionObserver" in root ? new IntersectionObserver((ents) => ents.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { root: yb, threshold: 0.12 }) : null;
      secs.forEach((x, i) => (io ? io.observe(x) : x.classList.add("in")));
      setTimeout(() => secs.forEach((x, i) => { if (i < 2) x.classList.add("in"); }), 200);
      $("ybPoster").onclick = () => posterPreview(e, s);
      $("ybAgain").onclick = () => { yb.classList.add("hidden"); hooks.again(); resolve(); };
      $("ybHome").onclick = () => { yb.classList.add("hidden"); hooks.home(); resolve(); };
      hooks.global($("ybGlobal"));
    });
  }

  function wrapText(g, text, x, y, maxW, lh, maxLines) {
    const chars = Array.from(text); let line = "", n = 0;
    for (const ch of chars) {
      if (g.measureText(line + ch).width > maxW) { g.fillText(line, x, y); y += lh; line = ch; n++; if (maxLines && n >= maxLines - 1) { const rest = chars.slice(chars.indexOf(ch)).join(""); let t = rest; while (g.measureText(t + "…").width > maxW && t.length) t = t.slice(0, -1); g.fillText(t + (t.length < rest.length ? "…" : ""), x, y); return y + lh; } }
      else line += ch;
    }
    if (line) g.fillText(line, x, y);
    return y + lh;
  }
  async function makePoster(e, s) {
    const W = 750, H = 1334, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    const im = await DL.Art.preload(DL.Art.url("dormout-night"));
    if (im && im.naturalWidth) {
      const ih = 700, sc = Math.max(W / im.naturalWidth, ih / im.naturalHeight);
      const dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      g.drawImage(im, (W - dw) / 2, (ih - dh) / 2, dw, dh);
    }
    const gr = g.createLinearGradient(0, 300, 0, 720); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 300, W, 420);
    const sans = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif', serif = '"Noto Serif SC", "Songti SC", serif';
    g.textAlign = "left";
    g.fillStyle = "#f6c978"; g.font = `600 22px ${sans}`; g.fillText("宿舍人生 · 毕业纪念", 64, 560);
    g.fillStyle = "#f5f5f7"; g.font = `700 68px ${sans}`; g.fillText(s.name + " 的四年", 64, 644);
    const tg = g.createLinearGradient(64, 0, 500, 0); tg.addColorStop(0, "#fbe2ae"); tg.addColorStop(1, "#ee9a5c");
    g.fillStyle = tg; g.font = `700 40px ${sans}`; g.fillText(e.title.name, 64, 712);
    g.fillStyle = "rgba(245,245,247,.6)"; g.font = `24px ${serif}`; g.fillText(e.title.desc, 64, 756);
    let y = 846;
    const row = (label, title, text, color) => {
      g.fillStyle = color; g.font = `600 20px ${sans}`; g.fillText(label, 64, y);
      g.fillStyle = "#f5f5f7"; g.font = `700 28px ${sans}`; g.fillText(title, 64, y + 38);
      g.font = `21px ${serif}`; g.fillStyle = "rgba(245,245,247,.62)";
      y = wrapText(g, text, 64, y + 74, W - 128, 32, 2) + 24;
    };
    row("我", e.path.name, e.path.text, "#f6c978");
    e.fates.slice(0, 2).forEach((f) => row(DL.CAST[f.who].name, f.title, f.text, DL.CAST[f.who].color));
    g.fillStyle = "rgba(245,245,247,.4)"; g.font = `20px ${sans}`;
    g.fillText("7 号楼 · 404 · 「" + (s.flags.group || "404") + "」", 64, H - 60);
    g.textAlign = "right"; g.fillText("十年后见。", W - 64, H - 60);
    return c.toDataURL("image/jpeg", 0.9);
  }
  async function posterPreview(e, s) {
    const url = await makePoster(e, s);
    const w = el("div", "poster-wrap", `<img alt="毕业海报" src="${url}"><p>长按图片，保存到相册</p><div class="row"><button class="btn ghost">关闭</button></div>`);
    const o = overlay(w, "dark");
    w.querySelector("button").onclick = () => closeOverlay();
    o.onclick = (ev) => { if (ev.target === o) closeOverlay(); };
  }

  /* ---------- 天赋抽卡：五张选两张，可以重抽一次 ---------- */
  function talentDraw() {
    return new Promise((resolve) => {
      let rerolls = 1, hand = [], picked = [];
      const box = el("div", "talent-screen");
      $("app").appendChild(box);
      const render = (animate) => {
        box.innerHTML = `<h2>抽取你的天赋</h2><p>五张里选两张，带着它们入学。还可以重抽 ${rerolls} 次。</p>
          <div class="tcards">${hand.map((t, i) => `<button class="tcard ${animate ? "" : "flip"} ${picked.includes(t.id) ? "sel" : ""}" data-i="${i}" data-r="${t.r}" aria-label="${esc(t.name)}"><span class="face back"></span><span class="face front"><span class="ti">${t.icon}</span><span class="tr">${DL.RARITY[t.r].name}</span><span class="tn">${esc(t.name)}</span><span class="td">${esc(t.desc)}</span></span></button>`).join("")}</div>
          <div class="talent-actions"><button class="btn ghost" id="tReroll" ${rerolls ? "" : "disabled"}>重抽</button><button class="btn primary" id="tGo" ${picked.length === 2 ? "" : "disabled"}>就它们了（${picked.length}/2）</button></div>`;
        const cards = [...box.querySelectorAll(".tcard")];
        if (animate) cards.forEach((c, i) => setTimeout(() => { c.classList.add("flip"); if (DL.Audio) DL.Audio.blip(hand[i].r === "gold" ? "mem" : undefined); }, 350 + i * 260));
        cards.forEach((c) => (c.onclick = () => {
          const id = hand[+c.dataset.i].id;
          if (picked.includes(id)) picked = picked.filter((x) => x !== id);
          else if (picked.length < 2) picked.push(id);
          else picked = [picked[1], id];
          render(false);
        }));
        box.querySelector("#tReroll").onclick = () => { if (!rerolls) return; rerolls--; deal(); };
        box.querySelector("#tGo").onclick = () => { if (picked.length !== 2) return; box.remove(); resolve(picked.slice()); };
      };
      const deal = () => { hand = DL.drawTalents(5); picked = []; render(true); };
      deal();
    });
  }


  /* ---------- 周末自由时间：校园地图 ---------- */
  function free(opts, s) {
    return new Promise((resolve) => {
      $("dialog").classList.add("idle");
      const sheet = el("div", "sheet free-sheet");
      sheet.innerHTML = `<div class="sheet-grip"></div><div class="sheet-head"><h3>这个周末，去哪？</h3><p>去找一个人，或者一个人待着。关系够深，会有只属于你们的故事。</p></div><div class="sheet-body"><div class="free-grid"></div></div>`;
      const grid = sheet.querySelector(".free-grid");
      opts.forEach((o, i) => {
        const C = o.who ? DL.CAST[o.who] : null;
        const card = el("button", "free-card" + (o.story ? " story" : ""), `
          <span class="fc-img" style="background-image:url('${DL.Art.thumb(o.scene)}')"></span>
          <span class="fc-shade"></span>
          <span class="fc-top">${esc(o.name)}</span>
          <span class="fc-who">${C ? `<i class="mono" style="--c:${C.color}">${C.mono}</i><span><b>${esc(o.whoName)}</b><small>${esc(o.level)} · 羁绊 ${o.rank}/4</small></span>` : `<span><b>一个人</b><small>好好待一会儿</small></span>`}</span>
          ${o.story ? `<span class="fc-badge">✦ 新故事 · ${esc(o.title)}</span>` : ""}`);
        card.style.animationDelay = 0.08 * i + 0.1 + "s";
        card.onclick = async () => {
          if (sheet.dataset.done) return;
          sheet.dataset.done = 1;
          card.classList.add("picked");
          haptic(10);
          if (DL.Audio) DL.Audio.blip("choose");
          await sleep(420);
          await closeOverlay();
          resolve(i);
        };
        grid.appendChild(card);
      });
      overlay(sheet, "sheet-mode");
    });
  }

  /* ---------- 手机消息 ---------- */
  function chat(c, s) {
    return new Promise(async (resolve) => {
      $("dialog").classList.add("idle");
      const fast = !!settings.skip || CPS[settings.speed] === 0;
      const ph = el("div", "chat");
      const avatars = c.group ? ["jiang", "su", "xu"].map((k) => `<i class="mono" style="--c:${DL.CAST[k].color}">${DL.CAST[k].mono}</i>`).join("") : `<i class="mono" style="--c:${c.msgs[0].color}">${esc(c.msgs[0].name.slice(0, 1))}</i>`;
      ph.innerHTML = `<div class="chat-head"><span class="chat-av">${avatars}</span><b>${esc(c.title)}</b><small>${c.group ? "4 人" : "在线"}</small></div><div class="chat-body"></div><div class="chat-foot"></div>`;
      const body = ph.querySelector(".chat-body"), foot = ph.querySelector(".chat-foot");
      overlay(ph, "chat-mode");
      if (DL.Audio) DL.Audio.blip("mem");
      haptic(12);
      const bubble = (m, mine) => {
        const b = el("div", "bub " + (mine ? "me" : "them"), (!mine && c.group ? `<small style="color:${m.color}">${esc(m.name)}</small>` : "") + `<span>${esc(m.text)}</span>`);
        body.appendChild(b);
        requestAnimationFrame(() => b.classList.add("in"));
        body.scrollTop = body.scrollHeight;
      };
      const typing = async (m) => {
        if (fast) return;
        const t = el("div", "bub them typing", "<span><i></i><i></i><i></i></span>");
        body.appendChild(t); requestAnimationFrame(() => t.classList.add("in")); body.scrollTop = body.scrollHeight;
        await sleep(Math.min(1300, 450 + Array.from(m.text).length * 35));
        t.remove();
      };
      await sleep(fast ? 100 : 500);
      for (const m of c.msgs) { await typing(m); bubble(m); await sleep(fast ? 60 : 220); }
      const idx = await new Promise((res) => {
        foot.innerHTML = c.replies.map((r, i) => `<button class="chat-reply" data-i="${i}">${esc(r)}</button>`).join("");
        foot.querySelectorAll(".chat-reply").forEach((b) => (b.onclick = () => { if (foot.dataset.done) return; foot.dataset.done = 1; haptic(8); res(+b.dataset.i); }));
        if (settings.skip) setTimeout(() => { if (!foot.dataset.done) { foot.dataset.done = 1; res(0); } }, 300);
      });
      foot.innerHTML = "";
      bubble({ text: c.replies[idx] }, true);
      remember({ choice: true, text: "（消息）" + c.replies[idx] });
      await sleep(fast ? 80 : 500);
      for (const m of c.follow[idx] || []) { await typing(m); bubble(m); await sleep(fast ? 60 : 220); }
      foot.innerHTML = `<button class="btn primary chat-done">收起手机</button>`;
      await new Promise((res) => { foot.querySelector(".chat-done").onclick = res; if (settings.skip) setTimeout(res, 400); });
      await closeOverlay();
      resolve(idx);
    });
  }

  /* ---------- 羁绊进度 ---------- */
  async function bond(who, rank, s) {
    const C = DL.CAST[who];
    const box = el("div", "bond-card", `<i class="seal-lg">${C.mono}</i><p class="bk">Bond · 羁绊</p><h3>${esc(C.name)}</h3><div class="bond-dots">${[1, 2, 3, 4].map((k) => `<i class="${k <= rank ? "on" : ""} ${k === rank ? "new" : ""}" style="--c:${C.color}"></i>`).join("")}</div><p class="bt">${rank >= 4 ? "你们之间，已经不需要再多说什么了。" : `第 ${rank} 段故事 · 关系更深时，会有下一段`}</p><p class="tapnote">轻触继续</p>`);
    box.style.setProperty("--c", C.color);
    if (DL.Audio) DL.Audio.blip("mem");
    haptic([10, 40, 10]);
    const o = overlay(box, "dark");
    await overlayTap(o, 900);
    await closeOverlay();
  }

  function haptic(p) { try { if (navigator.vibrate && !settings.noHaptic) navigator.vibrate(p); } catch (e) { /* 忽略 */ } }

  /* ---------- 第一次进游戏：按钮说明 ---------- */
  function coach() {
    if (store.get("dl2.coach", false)) return;
    store.set("dl2.coach", true);
    const right = document.querySelector(".hud-right");
    if (!right) return;
    const labels = ["回看", "快进", "自动", "手账", "菜单"];
    const tip = el("div", "coach", `<div class="coach-labels">${labels.map((l) => `<span>${l}</span>`).join("")}</div><p>轻触屏幕任意位置，继续读下去</p>`);
    $("gameScreen").appendChild(tip);
    const btns = right.querySelectorAll(".icon-btn");
    const place = () => {
      const spans = tip.querySelectorAll(".coach-labels span");
      btns.forEach((b, i) => { const r = b.getBoundingClientRect(); if (spans[i]) { spans[i].style.left = r.left + r.width / 2 + "px"; spans[i].style.top = r.bottom + 8 + "px"; } });
    };
    place();
    requestAnimationFrame(() => tip.classList.add("show"));
    const off = () => { tip.classList.remove("show"); setTimeout(() => tip.remove(), 500); removeEventListener("pointerdown", off, true); };
    setTimeout(() => addEventListener("pointerdown", off, true), 300);
    setTimeout(off, 7000);
  }

  /* ---------- 剧情回看 ---------- */
  function backlog() {
    const sheet = el("div", "sheet");
    sheet.innerHTML = `<div class="sheet-grip"></div><div class="sheet-head"><h3>剧情回看</h3><p>最近的 ${history.length} 句</p></div><div class="sheet-body backlog"></div><div class="sheet-foot"><button class="btn ghost">返回</button></div>`;
    const body = sheet.querySelector(".sheet-body");
    body.innerHTML = history.map((h) => h.choice ? `<p class="ch">› 你选择了：${esc(h.text)}</p>` : `<p>${h.who ? `<b style="color:${h.c || "#f5f5f7"}">${esc(h.who)}</b>` : ""}${esc(h.text)}</p>`).join("") || '<p class="empty">还没有内容。</p>';
    sheet.querySelector(".sheet-foot .btn").onclick = () => closeOverlay();
    const o = overlay(sheet, "sheet-mode");
    o.onclick = (ev) => { if (ev.target === o) closeOverlay(); };
    requestAnimationFrame(() => (body.scrollTop = body.scrollHeight));
  }

  /* ---------- 键盘 ---------- */
  function onKey(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (keyHandler) { keyHandler(e); if (e.key === " ") e.preventDefault(); return; }
    if ($("overlay").classList.contains("hidden") && !$("gameScreen").classList.contains("hidden")) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); advance(); }
    }
  }

  DL.UI = { remember, recap, Stage, backlog, history, setSkip, achieve, talentDraw, free, chat, bond, haptic, coach, say, ask, hud, toast, heading, overlay, closeOverlay, overlayTap, chapter, card, plan, montage, transcript, memory, journal, epilogue, advance, onKey, store, settings, saveSettings, esc, el, sleep,
    resetHud() { lastStats = null; $("hudStats").innerHTML = ""; }, clearKeys() { keyHandler = null; } };
})(typeof window !== "undefined" ? window : globalThis);
