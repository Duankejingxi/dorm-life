/* 宿舍人生 · 官网交互：导航、滚动出现、逐字点亮、四季粘性滚动、人物滑轨、手机演示、数字滚动 */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 导航：滚过开场后变成磨砂条 */
  const nav = $("#gnav");

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

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, vh = innerHeight;
      nav.classList.toggle("solid", y > vh * 0.6);
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
      $(".ph-name").textContent = "林溪"; $(".ph-name").style.color = "#6fa8e8";
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

  /* 开始游戏 */
  function refreshContinue() {
    const has = window.DL && DL.Game && DL.Game.hasSave();
    ["#heroContinue", "#ctaContinue"].forEach((s) => { const b = $(s); if (b) { b.classList.toggle("hidden", !has); if (has) b.textContent = "继续 · " + DL.Game.saveLabel(); } });
    const m = $("#siteMeta"); if (m && window.DL && DL.Game) m.textContent = DL.Game.metaLine();
  }
  $$("[data-play]").forEach((b) => (b.onclick = () => DL.Game.open(b.dataset.play)));
  window.addEventListener("dorm:closed", refreshContinue);
  refreshContinue();
  if (location.hash === "#play") DL.Game.open("new");
})();
