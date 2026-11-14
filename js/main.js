/* 宿舍人生 · 主流程 */
(function (root) {
  "use strict";
  const DL = root.DL;
  const UI = DL.UI, $ = (id) => document.getElementById(id), esc = UI.esc;
  const SAVE = "dl2.save", ARCHIVE = "dl2.archive";
  const ABORT = { abort: true };
  let runToken = 0;
  let current = null;

  /* ---------- 屏幕切换 ---------- */
  function screen(name) {
    for (const id of ["titleScreen", "setupScreen", "gameScreen"]) $(id).classList.add("hidden");
    $("app").dataset.screen = name;
    if (name === "title") $("titleScreen").classList.remove("hidden");
    if (name === "setup") { $("titleScreen").classList.add("hidden"); $("setupScreen").classList.remove("hidden"); }
    if (name === "game") $("gameScreen").classList.remove("hidden");
  }

  function titleScene() {
    const m = new Date().getMonth() + 1;
    const season = m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
    UI.Stage.show({ at: "dormout", time: "night", weather: season === "winter" ? "snow" : "clear", season }, true);
  }

  function refreshTitle() {
    const save = UI.store.get(SAVE, null);
    $("btnContinue").classList.toggle("hidden", !(save && !save.done && save.v === 2));
    if (save && !save.done && save.v === 2) $("btnContinue").textContent = "继续 · " + (DL.SEMESTERS[save.sem] || DL.SEMESTERS[0]).label;
    const a = UI.store.get(ARCHIVE, null);
    $("titleMeta").textContent = a && a.runs ? `已经毕业 ${a.runs} 次 · 收集了 ${Object.keys(a.memories || {}).length} 段回忆` : "";
  }

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
          home: () => { UI.store.del(SAVE); goTitle(); },
          global: (box) => renderGlobal(box, e, s),
        });
      }),
    };
  }

  async function play(state) {
    const token = ++runToken;
    current = state;
    UI.resetHud();
    screen("game");
    $("dialog").classList.add("idle");
    $("choices").innerHTML = "";
    UI.hud(state);
    if (UI.settings.sound) DL.Audio.start();
    syncSound();
    try {
      await DL.playRun(state, makeIO(token));
    } catch (err) {
      if (err !== ABORT) { console.error(err); UI.store.del(SAVE); alert("出了点问题：" + err.message); goTitle(); }
    }
  }

  function goTitle() {
    runToken++;
    current = null;
    UI.clearKeys();
    UI.closeOverlay();
    $("yearbook").classList.add("hidden");
    document.querySelectorAll(".choices-backdrop").forEach((x) => x.remove());
    $("choices").innerHTML = "";
    screen("title");
    titleScene();
    refreshTitle();
  }

  function toSetup() {
    runToken++;
    $("yearbook").classList.add("hidden");
    UI.closeOverlay();
    titleScene();
    screen("setup");
    const last = UI.store.get("dl2.lastName", "");
    if (last) $("inName").value = last;
    updateFamilyHint();
  }
  function updateFamilyHint() {
    const v = (document.querySelector('input[name="family"]:checked') || {}).value || "mid";
    const f = DL.FAMILY[v];
    $("familyHint").textContent = f.desc + " 每学期生活费 ¥" + f.allowance.toLocaleString() + "，开销约 ¥" + DL.LIVING_COST.toLocaleString() + "。";
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
      box.innerHTML = `<h3>这一届</h3><p>这是你第 <b>${a.runs}</b> 次从 404 毕业。</p><p class="muted">现在是离线模式。用 <code>npm start</code> 启动自带的后端，这里会显示所有玩家的毕业去向，还有一面留给下一届的留言墙。</p>`;
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

  /* ---------- 菜单 / 相册 / 声音 ---------- */
  function syncSound() { $("btnSound").classList.toggle("muted", !UI.settings.sound); }
  function toggleSound() {
    UI.settings.sound = !UI.settings.sound; UI.saveSettings();
    if (UI.settings.sound) DL.Audio.start(); else DL.Audio.stop();
    syncSound();
  }
  function menu() {
    const sheet = UI.el("div", "sheet");
    const sp = UI.settings.speed;
    sheet.innerHTML = `<div class="sheet-grip"></div><div class="sheet-head"><h3>暂停</h3><p>进度会在每个场景开始时自动保存。</p></div>
      <div class="sheet-body">
        <div class="setting"><span>文字速度</span><div class="seg seg-3" style="width:220px">${[["slow", "慢"], ["mid", "中"], ["fast", "快"]].map(([v, n]) => `<label><input type="radio" name="spd" value="${v}" ${sp === v ? "checked" : ""}><span>${n}</span></label>`).join("")}</div></div>
        <div class="setting"><span>声音</span><div class="seg" style="width:150px"><label><input type="radio" name="snd" value="1" ${UI.settings.sound ? "checked" : ""}><span>开</span></label><label><input type="radio" name="snd" value="0" ${!UI.settings.sound ? "checked" : ""}><span>关</span></label></div></div>
        <div class="menu-list" style="margin-top:14px"><button class="btn ghost" data-a="resume">继续</button><button class="btn ghost" data-a="title">保存并回到标题</button><button class="btn text" data-a="restart">重新开始</button></div>
      </div>`;
    sheet.querySelectorAll('input[name="spd"]').forEach((i) => (i.onchange = () => { UI.settings.speed = i.value; UI.saveSettings(); }));
    sheet.querySelectorAll('input[name="snd"]').forEach((i) => (i.onchange = () => { if ((i.value === "1") !== UI.settings.sound) toggleSound(); }));
    sheet.querySelector('[data-a="resume"]').onclick = () => UI.closeOverlay();
    sheet.querySelector('[data-a="title"]').onclick = () => goTitle();
    sheet.querySelector('[data-a="restart"]').onclick = () => { if (confirm("放弃这一局，重新开始？")) { UI.store.del(SAVE); toSetup(); } };
    const o = UI.overlay(sheet, "sheet-mode");
    o.onclick = (e) => { if (e.target === o) UI.closeOverlay(); };
  }

  function album() {
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
      if (t === "m") body.innerHTML = mems.length ? `<div class="mem-grid">${mems.map((m) => `<div class="mem"><div class="ph" style="background-image:url('${DL.Art.thumb(m.scene, 240, 180)}')"></div><h6>${esc(m.title)}</h6><p>${esc(m.text)}</p></div>`).join("")}</div>` : '<p class="empty">还是空的。去过一遍四年吧。</p>';
      else body.innerHTML = allPaths.map((id) => { const p = DL.PATH_EPILOGUE[id], got = a.paths[id]; return `<div class="person"><span class="yc-icon" style="width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.06);font-size:22px;${got ? "" : "filter:grayscale(1);opacity:.35"}">${p.icon}</span><div><h5>${got ? esc(p.name) : "？？？"}<small>${got ? "× " + got : "未解锁"}</small></h5><p>${got ? esc(DL.fmt(p.text, { name: "你", flags: {}, dorm: "m", crush: "f" })).slice(0, 46) + "…" : "换一种活法，也许会遇见。"}</p></div></div>`; }).join("") +
        (Object.keys(a.titles).length ? `<p class="muted" style="margin-top:16px">得到过的称号：${Object.keys(a.titles).map(esc).join("、")}</p>` : "");
    };
    sheet.querySelectorAll(".tab").forEach((b) => (b.onclick = () => show(b.dataset.t)));
    sheet.querySelector(".sheet-foot .btn").onclick = () => UI.closeOverlay();
    const o = UI.overlay(sheet, "sheet-mode");
    o.onclick = (e) => { if (e.target === o) UI.closeOverlay(); };
    show("m");
  }

  /* ---------- 启动 ---------- */
  function boot() {
    UI.Stage.init();
    titleScene();
    refreshTitle();
    DL.API.detect();

    $("btnNew").onclick = () => { if (UI.settings.sound) DL.Audio.start(); toSetup(); };
    $("btnContinue").onclick = () => { const s = UI.store.get(SAVE, null); if (s) play(s); };
    $("btnAlbum").onclick = album;
    $("btnSetupBack").onclick = goTitle;
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
    $("btnSound").onclick = (e) => { e.stopPropagation(); toggleSound(); };
    $("btnMenu").onclick = (e) => { e.stopPropagation(); menu(); };
    document.addEventListener("keydown", (e) => {
      if (!$("gameScreen").classList.contains("hidden") && $("overlay").classList.contains("hidden")) {
        if (e.key === "Escape") { menu(); return; }
        if (e.key === "j" || e.key === "J") { if (current) UI.journal(current); return; }
        if (e.key === "m" || e.key === "M") { toggleSound(); return; }
      } else if (e.key === "Escape" && !$("overlay").classList.contains("hidden") && $("overlay").querySelector(".sheet")) { UI.closeOverlay(); return; }
      UI.onKey(e);
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) DL.Audio.stop(); else if (UI.settings.sound && $("app").dataset.screen === "game") DL.Audio.start(); });

    if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !/[?&]nosw/.test(location.search)) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
    root.__dorm = { DL, play, goTitle, get state() { return current; } };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : globalThis);
