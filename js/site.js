/* 宿舍人生 · 官网交互：导航、滚动出现、逐字点亮、四季粘性滚动、人物滑轨、手机演示、数字滚动 */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 导航：滚过开场后变成磨砂条 */
  const nav = $("#gnav");

  /* 首屏以下的照片：滚到附近再加载，手机首次打开快很多 */
  const lazy = $$("[data-bg]");
  const setBg = (el) => { el.style.backgroundImage = "url('" + el.dataset.bg + "')"; delete el.dataset.bg; };
  if ("IntersectionObserver" in window) {
    const lio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setBg(e.target); lio.unobserve(e.target); } }), { rootMargin: "900px 0px" });
    lazy.forEach((el) => lio.observe(el));
  } else lazy.forEach(setBg);

  /* 出现动画 */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }) : null;
  $$(".reveal").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
  // 开场文字直接进入（有自己的延迟）
  requestAnimationFrame(() => $$(".hero .reveal").forEach((el) => el.classList.add("in")));

  /* 逐字点亮 */
  const glow = $("#glowText");
  const HOT = ["404", "守夜", "哭", "追回", "记住"];
  if (glow) {
    const text = glow.textContent;
    glow.textContent = "";
    const hotIdx = new Set();
    for (const w of HOT) { let i = text.indexOf(w); while (i >= 0) { for (let k = 0; k < w.length; k++) hotIdx.add(i + k); i = text.indexOf(w, i + 1); } }
    Array.from(text).forEach((c, i) => { const s = document.createElement("span"); s.className = "ch" + (hotIdx.has(i) ? " hk" : ""); s.textContent = c; glow.appendChild(s); });
  }
  const glowChars = glow ? $$(".ch", glow) : [];

  /* 四季 */
  const seasons = $("#story");
  const sImgs = $$(".s-img"), sCards = $$(".s-card"), sDots = $$(".s-dots li");
  let sIdx = 0;
  function setSeason(i) {
    if (i === sIdx) return;
    sIdx = i;
    sImgs.forEach((x, k) => x.classList.toggle("on", k === i));
    sCards.forEach((x, k) => x.classList.toggle("on", k === i));
    sDots.forEach((x, k) => x.classList.toggle("on", k === i));
  }

  const hero = $(".hero"), cta = $(".cta");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, vh = innerHeight;
      nav.classList.toggle("solid", y > vh * 0.6);
      // 开场：随滚动放大、变暗，标题上浮淡出
      if (hero && y < vh * 1.2) {
        const p = Math.min(1, y / vh);
        hero.style.setProperty("--hp", p.toFixed(3));
      }
      // 收尾大图：进入视口时从放大缓慢回落
      if (cta) {
        const r = cta.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, 1 - r.top / vh));
        cta.style.setProperty("--cp", p.toFixed(3));
      }
      if (glow) {
        const r = glow.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.35)));
        const n = Math.round(p * glowChars.length);
        for (let i = 0; i < glowChars.length; i++) {
          const lit = i < n;
          const c = glowChars[i];
          if (c._lit !== lit) { c._lit = lit; c.classList.toggle("lit", lit); c.classList.toggle("hot", lit && c.classList.contains("hk")); }
        }
      }
      if (seasons) {
        const r = seasons.getBoundingClientRect();
        const total = r.height - vh;
        const p = Math.min(0.999, Math.max(0, -r.top / total));
        setSeason(Math.floor(p * sCards.length));
      }
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  /* 人物滑轨 */
  const rail = $("#rail"), prev = $("#railPrev"), next = $("#railNext");
  function railState() {
    if (!rail) return;
    prev.disabled = rail.scrollLeft < 8;
    next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8;
  }
  if (rail) {
    const step = () => (rail.querySelector(".pcard").offsetWidth + 20);
    prev.onclick = () => rail.scrollBy({ left: -step(), behavior: reduced ? "auto" : "smooth" });
    next.onclick = () => rail.scrollBy({ left: step(), behavior: reduced ? "auto" : "smooth" });
    rail.addEventListener("scroll", railState, { passive: true });
    railState();
  }

  /* 手机演示：点选项看结果 */
  const demoLine = $("#demoLine"), demoChoices = $("#demoChoices"), demoAgain = $("#demoAgain");
  if (demoLine) {
    const orig = demoLine.textContent;
    const type = (t) => {
      demoLine.style.opacity = 0;
      setTimeout(() => { demoLine.textContent = t; demoLine.style.opacity = 1; }, 250);
    };
    $$("button", demoChoices).forEach((b) => (b.onclick = () => {
      demoChoices.classList.add("hidden"); demoAgain.classList.remove("hidden");
      $(".ph-name").textContent = "旁白"; $(".ph-name").style.color = "#a1a1a6";
      type(b.dataset.r);
    }));
    demoAgain.onclick = () => {
      demoChoices.classList.remove("hidden"); demoAgain.classList.add("hidden");
      $(".ph-name").textContent = "林溪"; $(".ph-name").style.color = "#8fa8c4";
      type(orig);
    };
  }

  /* 数字滚动 */
  const nums = $$("[data-count]");
  const fmt = (el, v) => (el.dataset.fmt === "wan" ? (v / 10000).toFixed(1).replace(/\.0$/, "") + "万" : String(Math.round(v)));
  const countIO = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target, to = +el.dataset.count;
    if (reduced) { el.textContent = fmt(el, to); return; }
    const t0 = performance.now(), dur = 1600;
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur), e2 = 1 - Math.pow(1 - k, 3); el.textContent = fmt(el, to * e2); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 }) : null;
  nums.forEach((n) => countIO && countIO.observe(n));

  /* 图片署名 */
  const cb = $("#creditsBtn"), cr = $("#credits");
  if (cb) cb.onclick = async () => {
    if (!cr.classList.contains("hidden")) { cr.classList.add("hidden"); return; }
    cr.classList.remove("hidden");
    if (cr.dataset.loaded) return;
    try {
      const data = await (await fetch("img/credits.json")).json();
      const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
      cr.innerHTML = Object.entries(data).map(([k, v]) => `<p><b>${esc(k)}</b> — 「${esc(v.title || "无题")}」 by <a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.author || "佚名")}</a>，${esc(v.license)}，已调色裁切</p>`).join("");
      cr.dataset.loaded = 1;
    } catch (e) { cr.textContent = "署名清单在 img/credits.json。"; }
  };

  /* 人物分页点 */
  const dots = $("#railDots");
  if (rail && dots) {
    const cards = $$(".pcard", rail);
    dots.innerHTML = cards.map(() => "<li></li>").join("");
    const lis = $$("li", dots);
    const sync = () => {
      const w = cards[0].offsetWidth + 20;
      const i = Math.min(cards.length - 1, Math.round(rail.scrollLeft / w));
      lis.forEach((li, k) => li.classList.toggle("on", k === i));
    };
    rail.addEventListener("scroll", sync, { passive: true });
    sync();
  }

  /* 展开大图：圆角卡片随滚动展开到满屏 */
  const ex = $("#expand");
  function expandTick() {
    if (!ex) return;
    const r = ex.getBoundingClientRect(), vh = innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
    ex.style.setProperty("--ep", p.toFixed(3));
  }
  addEventListener("scroll", () => requestAnimationFrame(expandTick), { passive: true });
  expandTick();

  /* 去向墙 */
  const pg = $("#pathGrid");
  if (pg && window.DL && DL.PATH_EPILOGUE) {
    const seen = (() => { try { return Object.keys((JSON.parse(localStorage.getItem("dl2.archive")) || {}).paths || {}); } catch (e) { return []; } })();
    pg.innerHTML = Object.entries(DL.PATH_EPILOGUE).map(([id, p], i) => `<div class="pg reveal ${seen.includes(id) ? "got" : ""}" style="transition-delay:${(i % 6) * 0.05}s"><span class="pg-i">${p.icon}</span><span class="pg-n">${p.name}</span>${seen.includes(id) ? '<span class="pg-b">已解锁</span>' : ""}</div>`).join("");
    $$(".pg", pg).forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
  }

  /* 开始游戏 */
  function refreshContinue() {
    const has = window.DL && DL.Game && DL.Game.hasSave();
    ["#heroContinue", "#ctaContinue"].forEach((s) => { const b = $(s); if (b) { b.classList.toggle("hidden", !has); if (has) b.textContent = "继续 · " + DL.Game.saveLabel(); } });
    const m = $("#siteMeta"); if (m && window.DL && DL.Game) m.textContent = DL.Game.metaLine();
  }
  $$("[data-play]").forEach((b) => (b.onclick = (e) => DL.Game.open(b.dataset.play, e)));
  window.addEventListener("dorm:closed", refreshContinue);
  refreshContinue();
  if (location.hash === "#play") DL.Game.open("new");
})();
