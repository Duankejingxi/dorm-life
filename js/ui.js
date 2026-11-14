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
  const settings = Object.assign({ speed: "mid", sound: true }, store.get("dl2.settings", {}));
  const saveSettings = () => store.set("dl2.settings", settings);
  const CPS = { slow: 22, mid: 42, fast: 90, instant: 0 };

  /* ---------- 舞台 ---------- */
  const Stage = {
    cur: null, key: "", front: null, back: null, weather: null, win: null,
    init() {
      this.front = $("bgA"); this.back = $("bgB");
      this.weather = new DL.Art.Weather($("fx"));
      let rt = null;
      addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (this.cur) { this.key = ""; this.show(this.cur, true); } }, 200); });
    },
    show(sc, instant) {
      const key = [sc.at, sc.time, sc.weather, sc.season].join("|");
      if (key === this.key) return sleep(0);
      this.key = key; this.cur = sc;
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const target = instant ? this.front : this.back;
      this.win = DL.Art.paint(target, sc, dpr);
      this.weather.set(sc, this.win);
      if (DL.Audio) DL.Audio.scene(sc);
      if (!instant) {
        this.back.classList.add("on"); this.front.classList.remove("on");
        [this.front, this.back] = [this.back, this.front];
        return sleep(650);
      }
      this.front.classList.add("on");
      return sleep(0);
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
      typing = { node, text, done: resolve, timer: setInterval(() => {
        i += 1;
        node.textContent = chars.slice(0, i).join("");
        if (i >= chars.length) { clearInterval(typing.timer); typing = null; resolve(); }
      }, 1000 / cps) };
    });
  }
  function setSpeaker(who, s) {
    const sp = $("speaker"), mono = $("speakerMono"), name = $("speakerName");
    if (!who) { sp.classList.add("none"); return; }
    sp.classList.remove("none");
    let n, c, m;
    if (who === "me") { n = s.name; c = "#e9e3d6"; m = s.name.slice(0, 1); }
    else if (who[0] === "?") { n = who.slice(1); c = "#9aa0b4"; m = n.slice(0, 1); }
    else { const C = DL.CAST[who] || {}; n = C.name || who; c = C.color || "#ccc"; m = C.mono || n.slice(0, 1); }
    name.textContent = n; mono.textContent = m; sp.style.setProperty("--c", c); mono.style.setProperty("--c", c); name.style.color = c;
  }
  async function say(who, text, s) {
    const d = $("dialog"), line = $("line");
    d.classList.remove("idle", "ready");
    setSpeaker(who, s);
    line.className = "line" + (who ? "" : " narr") + (who === "me" ? " inner" : "");
    await typeText(line, who && !/^[「（(]/.test(text) && who !== "me" ? text : text);
    d.classList.add("ready");
    await waitAdvance();
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
      const pick = async (i, btn) => {
        if (!box.classList.contains("on")) return;
        box.classList.remove("on"); btn.classList.add("picked"); box.classList.add("leaving");
        if (DL.Audio) DL.Audio.blip("choose");
        keyHandler = null;
        await sleep(380);
        box.innerHTML = ""; backdrop.remove();
        resolve(i);
      };
      opts.forEach((o, i) => {
        const b = el("button", "choice", esc(o.t) + (o.hint ? "<small>" + esc(o.hint) + "</small>" : ""));
        b.dataset.n = i + 1; b.style.animationDelay = 0.06 * i + 0.1 + "s";
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
    $("hudSem").textContent = sem ? sem.label : "";
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
    });
  }
  function heading(text) {
    const h = $("heading");
    h.textContent = text; h.classList.remove("show"); void h.offsetWidth; h.classList.add("show");
    return sleep(500);
  }

  /* ---------- 覆盖层 ---------- */
  function overlay(html, cls) {
    const o = $("overlay");
    o.className = "overlay " + (cls || "");
    o.innerHTML = "";
    if (typeof html === "string") o.innerHTML = html; else if (html) o.appendChild(html);
    return o;
  }
  async function closeOverlay() {
    const o = $("overlay");
    if (o.classList.contains("hidden")) return;
    o.classList.add("out"); await sleep(280); o.className = "overlay hidden"; o.innerHTML = "";
  }
  function overlayTap(o, delay) {
    return new Promise((resolve) => {
      let ok = false; setTimeout(() => (ok = true), delay || 600);
      const go = () => { if (!ok) return; o.removeEventListener("click", go); keyHandler = null; resolve(); };
      o.addEventListener("click", go);
      keyHandler = (e) => { if (e.key === " " || e.key === "Enter") go(); };
    });
  }

  const CH_SCENE = [
    { at: "gate", time: "day", season: "autumn" }, { at: "road", time: "day", season: "spring" },
    { at: "gate", time: "dusk", season: "autumn" }, { at: "field", time: "dusk", season: "spring" },
    { at: "road", time: "dusk", season: "autumn" }, { at: "station", time: "dusk", season: "spring" },
    { at: "road", time: "night", season: "autumn" }, { at: "dormout", time: "dusk", season: "summer" },
  ];
  async function chapter(sem, s) {
    const i = DL.SEMESTERS.indexOf(sem);
    await Stage.show(Object.assign({ weather: "clear" }, CH_SCENE[i] || CH_SCENE[0]));
    hud(s);
    $("dialog").classList.add("idle");
    const N = ["第一章", "第二章", "第三章", "第四章", "第五章", "第六章", "第七章", "终章"][i];
    const o = overlay(`<div class="chapter"><p class="ch-n">${N}</p><p class="ch-label">${esc(sem.label)}</p><h2>${esc(sem.title)}</h2><p class="ch-quote">${esc(sem.quote)}</p><p class="ch-money">生活费到账 ¥${DL.FAMILY[s.family].allowance.toLocaleString()}</p><p class="ch-tap">轻触继续</p></div>`, "dark");
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
      sheet.innerHTML = `<div class="sheet-grip"></div><div class="sheet-head"><h3>这个学期，时间花在哪？</h3><p>选 ${n} 件事，同一件最多两次。</p></div><div class="slots"></div><div class="sheet-body"><div class="focus-grid"></div></div><div class="sheet-foot"><button class="btn primary" disabled>就这样过</button></div>`;
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
    const stamp = d.failed ? "补考" : d.gpa >= 3.7 ? "优秀" : d.gpa >= 3 ? "良好" : d.gpa >= 2 ? "合格" : "警告";
    const t = el("div", "transcript paper");
    t.innerHTML = `<h3>成绩单</h3><p class="t-sub">${esc(d.sem.label)} · ${esc(s.name)}</p><div class="gpa">${d.gpa.toFixed(2)}</div><p class="gpa-l">本学期绩点</p>
      <div class="stamp">${stamp}</div>
      <dl><dt>专业排名</dt><dd>${esc(d.rank)}</dd><dt>平均绩点</dt><dd>${d.avg.toFixed(2)}</dd><dt>挂科</dt><dd class="${d.failed ? "bad" : ""}">${d.failed ? d.failed + " 门（累计 " + d.totalFails + "）" : "无"}</dd><dt>生活开销</dt><dd>−¥${DL.LIVING_COST.toLocaleString()}</dd><dt>余额</dt><dd class="${d.money < 0 ? "bad" : ""}">¥${d.money.toLocaleString()}</dd></dl>
      <p class="tapline">轻触继续</p>`;
    const o = overlay(t, "dark");
    await overlayTap(o, 900);
    await closeOverlay();
  }

  async function memory(mem, s) {
    if (DL.Audio) DL.Audio.blip("mem");
    const p = el("div", "", "");
    p.innerHTML = `<p class="mem-badge">✦ 收进回忆 ✦</p><div class="polaroid"><div class="ph" style="background-image:url('${DL.Art.thumb(mem.scene, 340, 255)}')"></div><h4>${esc(mem.title)}</h4><p>${esc(mem.text)}</p></div>`;
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
          `<p class="muted">学业决定绩点和去向；体魄或心情太低，会撑不住。${s.flags.path ? "你选择了：" + esc(DL.PATHS[s.flags.path].name) + "。" : ""}</p>`;
      } else if (t === "people") {
        body.innerHTML = DL.REL_ORDER.filter((k) => k !== "lin" || s.flags.metLin).filter((k) => k !== "cheng" || s.flags.metCheng).map((k) => {
          const C = DL.CAST[k], v = s.rel[k];
          const note = k === "su" && s.flags.suLeft ? "（休学中）" : k === "lin" && s.flags.together && !s.flags.linBreak ? "（在一起）" : "";
          return `<div class="person"><i class="mono" style="--c:${C.color}">${C.mono}</i><div><h5>${C.name}${note}<small>${v}</small></h5><p>${esc(C.line)} — ${esc(C.bio)}</p><div class="hearts"><i style="width:${v}%;background:${C.color}"></i></div></div></div>`;
        }).join("");
      } else if (t === "mem") {
        body.innerHTML = s.memories.length ? `<div class="mem-grid">${s.memories.map((m) => `<div class="mem"><div class="ph" style="background-image:url('${DL.Art.thumb(m.scene, 240, 180)}')"></div><h6>${esc(m.title)}</h6><p>${esc(m.text)}</p></div>`).join("")}</div>` : `<p class="empty">还没有回忆。故事才刚开始。</p>`;
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
      const mems = s.memories.map((m) => `<div class="mem"><div class="ph" style="background-image:url('${DL.Art.thumb(m.scene, 240, 180)}')"></div><h6>${esc(m.title)}</h6><p>${esc(m.text)}</p></div>`).join("");
      yb.innerHTML = `<div class="yb">
        <div class="yb-cover"><p class="k">毕业纪念册</p><h1>${esc(s.name)} 的四年</h1><p class="muted">7 号楼 · 404 · 「${esc(s.flags.group || "404")}」</p><div class="yb-title">${esc(e.title.name)}</div><p class="yb-desc">${esc(e.title.desc)}</p></div>
        <section class="yb-sec"><h3>十年后的你</h3><div class="yb-card"><div class="yc-top"><span class="yc-icon">${e.path.icon}</span><div><h4>${esc(e.path.name)}<span class="result ${e.path.ok ? "ok" : "no"}">${esc(e.path.result)}</span></h4></div></div><p>${esc(e.path.text)}</p></div></section>
        <section class="yb-sec"><h3>十年后的他们</h3>${e.fates.map(fate).join("")}${fate(e.lin)}</section>
        <section class="yb-sec"><h3>十年后的 404</h3><div class="yb-reunion"><p class="count">${esc(e.reunion.title)}</p><p>${esc(e.reunion.text)}</p></div></section>
        <section class="yb-sec"><h3>四年</h3><div class="yb-stats"><div class="yb-stat"><b>${e.gpa.toFixed(2)}</b><span>平均绩点</span></div><div class="yb-stat"><b>${s.memories.length}</b><span>段回忆</span></div><div class="yb-stat"><b>${Math.round((s.rel.jiang + s.rel.su + s.rel.xu) / 3)}</b><span>404 羁绊</span></div></div></section>
        ${mems ? `<section class="yb-sec"><h3>相册</h3><div class="mem-grid">${mems}</div></section>` : ""}
        <section class="yb-sec yb-global" id="ybGlobal"><h3>这一届</h3><p class="muted">正在联系教务处……</p></section>
        <div class="yb-actions"><button class="btn primary" id="ybPoster">生成毕业海报</button><button class="btn ghost" id="ybAgain">再活一次</button><button class="btn text" id="ybHome">回到标题</button></div>
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
  function makePoster(e, s) {
    const W = 750, H = 1334, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const art = document.createElement("canvas");
    Object.defineProperty(art, "clientWidth", { value: W }); Object.defineProperty(art, "clientHeight", { value: 640 });
    DL.Art.paint(art, { at: "dormout", time: "night", weather: "clear", season: "summer" }, 1);
    g.fillStyle = "#0d0e18"; g.fillRect(0, 0, W, H);
    g.drawImage(art, 0, 0, W, 640);
    const gr = g.createLinearGradient(0, 380, 0, 660); gr.addColorStop(0, "rgba(13,14,24,0)"); gr.addColorStop(1, "#0d0e18"); g.fillStyle = gr; g.fillRect(0, 380, W, 280);
    const serif = '"Noto Serif SC", "Songti SC", serif';
    g.textAlign = "center"; g.fillStyle = "#eab54d"; g.font = `22px ${serif}`; g.fillText("宿 舍 人 生 · 毕 业 纪 念", W / 2, 560);
    g.fillStyle = "#f4eee2"; g.font = `900 64px ${serif}`; g.fillText(s.name + " 的四年", W / 2, 640);
    g.font = `600 34px ${serif}`; g.fillStyle = "#f6d58a"; g.fillText("「" + e.title.name + "」", W / 2, 706);
    g.font = `24px ${serif}`; g.fillStyle = "rgba(244,238,226,.7)"; g.fillText(e.title.desc, W / 2, 752);
    g.textAlign = "left";
    let y = 830;
    const row = (label, title, text, color) => {
      g.fillStyle = color; g.beginPath(); g.arc(78, y - 9, 8, 0, 6.283); g.fill();
      g.fillStyle = "rgba(244,238,226,.55)"; g.font = `22px ${serif}`; g.fillText(label, 100, y);
      g.fillStyle = "#f4eee2"; g.font = `600 28px ${serif}`; g.fillText(title, 100 + g.measureText(label).width + 16 + 0, y);
      g.font = `22px ${serif}`; g.fillStyle = "rgba(244,238,226,.72)";
      y = wrapText(g, text, 100, y + 38, W - 170, 34, 2) + 22;
    };
    row("我 ·", e.path.name, e.path.text, "#eab54d");
    e.fates.forEach((f) => row(DL.CAST[f.who].name + " ·", f.title, f.text, DL.CAST[f.who].color));
    g.textAlign = "center"; g.fillStyle = "rgba(244,238,226,.45)"; g.font = `22px ${serif}`;
    g.fillText("7 号楼 · 404 · 「" + (s.flags.group || "404") + "」", W / 2, H - 70);
    g.fillText("十年后见。", W / 2, H - 34);
    return c.toDataURL("image/png");
  }
  function posterPreview(e, s) {
    const url = makePoster(e, s);
    const w = el("div", "poster-wrap", `<img alt="毕业海报" src="${url}"><p>长按图片保存，或点下载</p><div class="row"><a class="btn primary" download="宿舍人生-${esc(s.name)}.png" href="${url}">下载</a><button class="btn ghost">关闭</button></div>`);
    const o = overlay(w, "dark");
    w.querySelector("button").onclick = () => closeOverlay();
    o.onclick = (ev) => { if (ev.target === o) closeOverlay(); };
  }

  /* ---------- 键盘 ---------- */
  function onKey(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (keyHandler) { keyHandler(e); if (e.key === " ") e.preventDefault(); return; }
    if ($("overlay").classList.contains("hidden") && !$("gameScreen").classList.contains("hidden")) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); advance(); }
    }
  }

  DL.UI = { Stage, say, ask, hud, toast, heading, overlay, closeOverlay, overlayTap, chapter, card, plan, montage, transcript, memory, journal, epilogue, advance, onKey, store, settings, saveSettings, esc, el, sleep,
    resetHud() { lastStats = null; $("hudStats").innerHTML = ""; }, clearKeys() { keyHandler = null; } };
})(typeof window !== "undefined" ? window : globalThis);
