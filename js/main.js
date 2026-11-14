/* 宿舍人生 · 游戏流程：官网就是标题页，游戏以全屏层打开 */
(function (root) {
  "use strict";
  const DL = root.DL;
  const UI = DL.UI, $ = (id) => document.getElementById(id), esc = UI.esc;
  const SAVE = "dl2.save", ARCHIVE = "dl2.archive";
  const ABORT = { abort: true };
  let runToken = 0;
  let current = null;
  let opened = false;

  /* ---------- 打开 / 关闭 ---------- */
  function openApp() {
    if (opened) return;
    opened = true;
    document.documentElement.classList.add("in-game");
    const app = $("app");
    app.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => app.classList.add("open"));
    if (UI.settings.sound) DL.Audio.start();
  }
  function closeApp() {
    runToken++;
    current = null;
    opened = false;
    UI.clearKeys();
    UI.closeOverlay();
    DL.Audio.stop();
    const app = $("app");
    app.classList.remove("open");
    app.setAttribute("aria-hidden", "true");
    app.dataset.screen = "closed";
    document.documentElement.classList.remove("in-game");
    setTimeout(() => {
      if (opened) return;
      $("yearbook").classList.add("hidden");
      document.querySelectorAll(".choices-backdrop").forEach((x) => x.remove());
      $("choices").innerHTML = "";
      for (const id of ["setupScreen", "gameScreen"]) $(id).classList.add("hidden");
    }, 650);
    if (location.hash === "#play") history.replaceState(null, "", location.pathname + location.search);
    window.dispatchEvent(new Event("dorm:closed"));
  }

  function screen(name) {
    for (const id of ["setupScreen", "gameScreen"]) $(id).classList.add("hidden");
    $("app").dataset.screen = name;
    if (name === "setup") $("setupScreen").classList.remove("hidden");
    if (name === "game") $("gameScreen").classList.remove("hidden");
  }

  function hasSave() { const s = UI.store.get(SAVE, null); return !!(s && !s.done && s.v === 2); }

  /* ---------- 存档册（跨周目） ---------- */
  function archive(e, s) {
    const a = UI.store.get(ARCHIVE, { runs: 0, paths: {}, titles: {}, memories: {} });
    a.runs++;
    a.paths[e.path.id] = (a.paths[e.path.id] || 0) + 1;
    a.titles[e.title.name] = (a.titles[e.title.name] || 0) + 1;
    for (const m of s.memories) if (!a.memories[m.id]) a.memories[m.id] = { title: m.title, text: m.text, scene: m.scene };
    UI.store.set(ARCHIVE, a);
  }

  /* ---------- 一局 ---------- */
  function makeIO(token) {
    const guard = (fn) => async function () {
      if (token !== runToken) throw ABORT;
      const r = await fn.apply(null, arguments);
      if (token !== runToken) throw ABORT;
      return r;
    };
    return {
      say: guard(UI.say), ask: guard(UI.ask), scene: guard((sc) => UI.Stage.show(sc)), toast: (c, s) => UI.toast(c, s),
      memory: guard(UI.memory), card: guard(UI.card), heading: guard(UI.heading), chapter: guard(UI.chapter), plan: guard(UI.plan),
      montage: guard(UI.montage), transcript: guard(UI.transcript), currentScene: () => Object.assign({}, UI.Stage.cur),
      save: (st) => { if (token === runToken) UI.store.set(SAVE, st); },
      epilogue: guard(async (e, s) => {
        archive(e, s);
        $("dialog").classList.add("idle");
        await UI.Stage.show({ at: "dormout", time: "night", weather: "clear", season: "summer" });
        await UI.epilogue(e, s, {
          again: () => { UI.store.del(SAVE); toSetup(); },
          home: () => { UI.store.del(SAVE); closeApp(); },
          global: (box) => renderGlobal(box, e, s),
        });
      }),
    };
  }

  async function play(state) {
    openApp();
    const token = ++runToken;
    current = state;
    UI.resetHud();
    UI.history.length = 0;
    screen("game");
    $("dialog").classList.add("idle");
    $("choices").innerHTML = "";
    UI.hud(state);
    syncButtons();
    try {
      await DL.playRun(state, makeIO(token));
    } catch (err) {
      if (err !== ABORT) { console.error(err); UI.store.del(SAVE); closeApp(); }
    }
  }

  function toSetup() {
    openApp();
    runToken++;
    current = null;
    $("yearbook").classList.add("hidden");
    UI.closeOverlay();
    UI.Stage.show({ at: "station", time: "dawn", weather: "clear", season: "autumn" }, true);
    screen("setup");
    const last = UI.store.get("dl2.lastName", "");
    if (last) $("inName").value = last;
    updateFamilyHint();
  }
  function updateFamilyHint() {
    const v = (document.querySelector('input[name="family"]:checked') || {}).value || "mid";
    const f = DL.FAMILY[v];
    $("familyHint").textContent = f.desc + " 每月生活费 ¥" + f.monthly.toLocaleString() + "，学校里一个月的开销大约 ¥" + DL.LIVING_MONTHLY.toLocaleString() + "。";
  }

  /* ---------- 全服统计 + 留言墙 ---------- */
  const PATH_GROUP = (id) => id.split("_")[0];
  const GROUP_NAME = { kaoyan: "考研", baoyan: "保研", job: "工作", abroad: "出国", gongwu: "考公", music: "音乐", teach: "支教", gap: "间隔年", delay: "延毕" };
  async function renderGlobal(box, e, s) {
    const summary = {
      path: e.path.id, title: e.title.name, reunion: e.reunion.count,
      choices: { club: s.flags.club, path: s.flags.path, group: s.flags.group },
      flags: { together: !!(s.flags.together && !s.flags.linBreak), jiangBack: !!s.flags.jiangBack, suStayed: !!s.flags.suStayed, dadCame: !!s.flags.dadCame, wentFest: !!s.flags.wentFest, linBreak: !!s.flags.linBreak, metLin: !!s.flags.metLin },
    };
    const res = await DL.API.submitRun(summary);
    if (!res) {
      const a = UI.store.get(ARCHIVE, { runs: 1, paths: {} });
      box.innerHTML = `<h3>这一届</h3><p>这是你第 <b>${a.runs}</b> 次从 404 毕业。</p><p class="muted">这个版本没有连上服务器。用 <code>npm start</code> 启动自带的后端，这里会显示所有玩家的毕业去向，还有一面留给下一届的留言墙。</p>`;
      return;
    }
    const groups = {};
    for (const [k, v] of Object.entries(res.paths)) groups[PATH_GROUP(k)] = (groups[PATH_GROUP(k)] || 0) + v;
    const total = res.runs || 1;
    const mine = PATH_GROUP(e.path.id);
    const pct = (n) => Math.round((n / total) * 100);
    const sameTitle = res.titles[e.title.name] || 1;
    const bars = Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="barrow ${k === mine ? "me" : ""}"><span>${GROUP_NAME[k] || k}${k === mine ? " · 你" : ""}</span><span class="bb"><i style="width:${pct(v)}%"></i></span><em>${pct(v)}%</em></div>`).join("");
    const f = res.flags || {};
    box.innerHTML = `<h3>这一届</h3>
      <p>你是第 <b>${res.rank}</b> 位从 404 毕业的人。</p>
      <p>和你一样被叫作「${esc(e.title.name)}」的，有 <b>${sameTitle}</b> 人。</p>
      <p><b>${pct(f.suStayed || 0)}%</b> 的人帮苏念留在了学校，<b>${pct(f.jiangBack || 0)}%</b> 的人陪江野回到了球场，<b>${pct(f.together || 0)}%</b> 的人最后和林溪在一起。</p>
      <div class="bars">${bars}</div>
      <h3 style="margin-top:30px">留给下一届</h3>
      <form class="wall-form" id="wallForm"><input id="wallText" maxlength="60" placeholder="写一句话给下一个住进 404 的人" autocomplete="off"><button class="btn primary">留下</button></form>
      <p class="muted" id="wallMsg"></p>
      <div class="wall" id="wall"></div>`;
    const drawWall = (notes, mineNote) => {
      $("wall").innerHTML = (mineNote ? [mineNote] : []).concat(notes.filter((n) => !mineNote || n.t !== mineNote.t)).slice(0, 40)
        .map((n) => `<div class="note ${mineNote && n === mineNote ? "mine" : ""}">${esc(n.text)}<small>— ${esc(n.name)} · ${new Date(n.t).toLocaleDateString("zh-CN")}</small></div>`).join("") || '<p class="muted">还没有人留言。做第一个吧。</p>';
    };
    const w = await DL.API.wall();
    drawWall((w && w.notes) || []);
    $("wallForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const text = $("wallText").value.trim();
      if (text.length < 2) { $("wallMsg").textContent = "写点什么吧。"; return; }
      const r = await DL.API.post(s.name, text);
      if (r && r.ok) { $("wallText").value = ""; $("wallMsg").textContent = "留下了。"; const w2 = await DL.API.wall(); drawWall((w2 && w2.notes) || [], r.note); }
      else $("wallMsg").textContent = (r && r.error) || "没发出去，等会儿再试。";
    };
  }

  /* ---------- 菜单 / 相册 / 设置 ---------- */
  function syncButtons() {
    $("btnAuto").classList.toggle("on", !!UI.settings.auto);
    $("app").classList.toggle("auto", !!UI.settings.auto);
    $("app").dataset.size = UI.settings.size || "m";
  }
  function toggleSound() {
    UI.settings.sound = !UI.settings.sound; UI.saveSettings();
    if (UI.settings.sound) DL.Audio.start(); else DL.Audio.stop();
  }
  function toggleAuto() {
    UI.settings.auto = !UI.settings.auto; UI.saveSettings(); syncButtons();
    if (UI.settings.auto && document.querySelector("#dialog.ready")) UI.advance();
  }
  const seg = (name, items, cur) => `<div class="seg ${items.length === 3 ? "seg-3" : ""}">${items.map(([v, n]) => `<label><input type="radio" name="${name}" value="${v}" ${cur === v ? "checked" : ""}><span>${n}</span></label>`).join("")}</div>`;
  function menu() {
    const sheet = UI.el("div", "sheet");
    const st = UI.settings;
    sheet.innerHTML = `<div class="sheet-grip"></div><div class="sheet-head"><h3>暂停</h3><p>每个场景开始时都会自动存档。</p></div>
      <div class="sheet-body">
        <div class="setting"><span>文字速度</span>${seg("spd", [["slow", "慢"], ["mid", "中"], ["fast", "快"]], st.speed)}</div>
        <div class="setting"><span>字号</span>${seg("size", [["s", "小"], ["m", "中"], ["l", "大"]], st.size || "m")}</div>
        <div class="setting"><span>声音</span>${seg("snd", [["1", "开"], ["0", "关"]], st.sound ? "1" : "0")}</div>
        <div class="setting"><span>自动播放</span>${seg("auto", [["1", "开"], ["0", "关"]], st.auto ? "1" : "0")}</div>
        <div class="menu-list" style="margin-top:16px"><button class="btn primary" data-a="resume">继续</button><button class="btn ghost" data-a="home">保存并回到首页</button><button class="btn text" data-a="restart">重新开始</button></div>
      </div>`;
    sheet.querySelectorAll('input[name="spd"]').forEach((i) => (i.onchange = () => { st.speed = i.value; UI.saveSettings(); }));
    sheet.querySelectorAll('input[name="size"]').forEach((i) => (i.onchange = () => { st.size = i.value; UI.saveSettings(); syncButtons(); }));
    sheet.querySelectorAll('input[name="snd"]').forEach((i) => (i.onchange = () => { if ((i.value === "1") !== st.sound) toggleSound(); }));
    sheet.querySelectorAll('input[name="auto"]').forEach((i) => (i.onchange = () => { if ((i.value === "1") !== !!st.auto) { st.auto = i.value === "1"; UI.saveSettings(); syncButtons(); } }));
    sheet.querySelector('[data-a="resume"]').onclick = () => UI.closeOverlay();
    sheet.querySelector('[data-a="home"]').onclick = () => closeApp();
    const rb = sheet.querySelector('[data-a="restart"]');
    rb.onclick = () => { if (rb.dataset.armed) { UI.store.del(SAVE); toSetup(); } else { rb.dataset.armed = "1"; rb.textContent = "再点一次：放弃这一局，重新开始"; rb.style.color = "#ff9c92"; } };
    const o = UI.overlay(sheet, "sheet-mode");
    o.onclick = (e) => { if (e.target === o) UI.closeOverlay(); };
  }

  function album() {
    openApp();
    screen("album");
    UI.Stage.show({ at: "dorm", time: "dusk", weather: "clear", season: "autumn" }, true);
    const a = UI.store.get(ARCHIVE, { runs: 0, paths: {}, titles: {}, memories: {} });
    const sheet = UI.el("div", "sheet");
    const allPaths = Object.keys(DL.PATH_EPILOGUE);
    const mems = Object.values(a.memories || {});
    sheet.innerHTML = `<div class="sheet-grip"></div><div class="sheet-head"><h3>回忆相册</h3><p>毕业 ${a.runs} 次 · ${mems.length} 段回忆 · 去向 ${Object.keys(a.paths).length} / ${allPaths.length}</p></div>
      <div class="tabs"><button class="tab on" data-t="m">回忆</button><button class="tab" data-t="p">去向</button></div>
      <div class="sheet-body"></div><div class="sheet-foot"><button class="btn ghost">合上</button></div>`;
    const body = sheet.querySelector(".sheet-body");
    const show = (t) => {
      sheet.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
      if (t === "m") body.innerHTML = mems.length ? `<div class="mem-grid">${mems.map((m) => `<div class="mem"><div class="ph" style="background-image:url('${DL.Art.thumb(m.scene)}')"></div><h6>${esc(m.title)}</h6><p>${esc(m.text)}</p></div>`).join("")}</div>` : '<p class="empty">还是空的。去过一遍四年吧。</p>';
      else body.innerHTML = allPaths.map((id) => { const p = DL.PATH_EPILOGUE[id], got = a.paths[id]; return `<div class="person"><span class="yc-icon" style="width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.06);font-size:22px;${got ? "" : "filter:grayscale(1);opacity:.35"}">${p.icon}</span><div><h5>${got ? esc(p.name) : "？？？"}<small>${got ? "× " + got : "未解锁"}</small></h5><p>${got ? esc(DL.fmt(p.text, { name: "你", flags: {}, dorm: "m", crush: "f" })).slice(0, 46) + "…" : "换一种活法，也许会遇见。"}</p></div></div>`; }).join("") +
        (Object.keys(a.titles).length ? `<p class="muted" style="margin-top:16px">得到过的称号：${Object.keys(a.titles).map(esc).join("、")}</p>` : "");
    };
    sheet.querySelectorAll(".tab").forEach((b) => (b.onclick = () => show(b.dataset.t)));
    sheet.querySelector(".sheet-foot .btn").onclick = () => closeApp();
    const o = UI.overlay(sheet, "sheet-mode");
    o.onclick = (e) => { if (e.target === o) closeApp(); };
    show("m");
  }

  /* ---------- 对外 ---------- */
  DL.Game = {
    open(mode) {
      if (mode === "continue") { const s = UI.store.get(SAVE, null); if (s) return play(s); }
      if (mode === "album") return album();
      return toSetup();
    },
    close: closeApp,
    hasSave,
    saveLabel() { const s = UI.store.get(SAVE, null); return s ? (DL.SEMESTERS[s.sem] || DL.SEMESTERS[0]).label : ""; },
    metaLine() { const a = UI.store.get(ARCHIVE, null); return a && a.runs ? `你已经毕业 ${a.runs} 次，收集了 ${Object.keys(a.memories || {}).length} 段回忆。` : ""; },
  };

  /* ---------- 启动 ---------- */
  function boot() {
    UI.Stage.init();
    DL.API.detect();
    $("btnSetupBack").onclick = closeApp;
    document.querySelectorAll('input[name="family"]').forEach((i) => (i.onchange = updateFamilyHint));
    $("setupForm").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = String(fd.get("name") || "").trim().replace(/[{}<>]/g, "") || "林一";
      UI.store.set("dl2.lastName", name);
      UI.store.del(SAVE);
      play(DL.newState({ name, dorm: fd.get("dorm"), crush: fd.get("crush"), family: fd.get("family") }));
    };
    $("tap").addEventListener("click", UI.advance);
    $("dialog").addEventListener("click", UI.advance);
    $("btnJournal").onclick = (e) => { e.stopPropagation(); if (current) UI.journal(current); };
    $("btnLog").onclick = (e) => { e.stopPropagation(); UI.backlog(); };
    $("btnAuto").onclick = (e) => { e.stopPropagation(); toggleAuto(); };
    $("btnMenu").onclick = (e) => { e.stopPropagation(); menu(); };
    document.addEventListener("keydown", (e) => {
      if (!opened) return;
      const inGame = !$("gameScreen").classList.contains("hidden");
      const noOverlay = $("overlay").classList.contains("hidden");
      if (inGame && noOverlay && !e.target.matches("input")) {
        if (e.key === "Escape") { menu(); return; }
        const k = e.key.toLowerCase();
        if (k === "j") { if (current) UI.journal(current); return; }
        if (k === "l") { UI.backlog(); return; }
        if (k === "a") { toggleAuto(); return; }
        if (k === "m") { toggleSound(); return; }
      } else if (e.key === "Escape" && !noOverlay && $("overlay").querySelector(".sheet")) {
        if ($("app").dataset.screen === "album") closeApp(); else UI.closeOverlay();
        return;
      }
      UI.onKey(e);
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) DL.Audio.stop(); else if (UI.settings.sound && opened) DL.Audio.start(); });
    syncButtons();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !/[?&]nosw/.test(location.search)) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
    root.__dorm = { DL, play, close: closeApp, get state() { return current; } };
  }

  boot();
})(typeof window !== "undefined" ? window : globalThis);
