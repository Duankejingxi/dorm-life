/* 宿舍人生 · 程序化插画
 * 每个场景 = 地点 × 时间 × 季节 × 天气，用分层剪影 + 大气透视绘制（远处的层更接近天际线颜色）。
 * 虚拟画布高度固定 1000，宽度随屏幕比例变化，所有元素按宽度自适应排布。
 * 同一个场景用同一个种子，画面稳定可复现（回忆相册的缩略图也靠它）。
 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});
  const VH = 1000;

  /* ---------- 颜色 ---------- */
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb(a, al) { return al == null ? `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})` : `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${al})`; }
  function mixA(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function mix(c1, c2, t, al) { return rgb(mixA(hex(c1), hex(c2), t), al); }
  function mixHex(c1, c2, t) { const m = mixA(hex(c1), hex(c2), t); return "#" + m.map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""); }

  const PAL = {
    dawn: { sky: ["#25305e", "#6d4f86", "#df8b8c", "#f8c79c"], far: "#c48e9f", near: "#2e2645", light: 0.55, wall: "#a69aa8", floor: "#5b4f63" },
    day: { sky: ["#3a7fc0", "#74afdc", "#b5d6ea", "#eaf2ee"], far: "#a3bccb", near: "#34495b", light: 1, wall: "#ddd5c4", floor: "#9c8a72" },
    dusk: { sky: ["#1c1f4a", "#563474", "#c5577a", "#f6a160"], far: "#b06d88", near: "#271a35", light: 0.45, wall: "#9c7f82", floor: "#4b3a48" },
    night: { sky: ["#050918", "#0c1432", "#18234d", "#2a3366"], far: "#263060", near: "#0a0d1e", light: 0.12, wall: "#1e1e2e", floor: "#121220" },
  };
  const SEASON = {
    spring: { leaf: ["#f5b8c9", "#a8d48f", "#f9d0dc"], ground: "#86ad72" },
    summer: { leaf: ["#3f7d4c", "#5d9b57", "#2f6b44"], ground: "#5d8a4c" },
    autumn: { leaf: ["#f3b63e", "#e48a2c", "#f6cf63"], ground: "#a98552" },
    winter: { leaf: null, ground: "#e3e9f1" },
  };

  function palette(sc) {
    const p = PAL[sc.time] || PAL.day;
    const out = { sky: p.sky.slice(), far: p.far, near: p.near, light: p.light, wall: p.wall, floor: p.floor };
    if (sc.weather === "rain") {
      out.sky = out.sky.map((c, i) => mixHex(c, ["#3c4352", "#566071", "#6f7a89", "#8a94a0"][i], 0.7));
      out.far = mixHex(out.far, "#7d8794", 0.6); out.near = mixHex(out.near, "#283039", 0.5); out.light *= 0.6;
    } else if (sc.weather === "snow" || sc.season === "winter") {
      const k = sc.weather === "snow" ? 0.55 : 0.25;
      out.sky = out.sky.map((c, i) => mixHex(c, ["#6b7a96", "#94a3bb", "#c0cbd9", "#dfe5ec"][i], k * (sc.time === "night" ? 0.35 : 1)));
      out.far = mixHex(out.far, "#b9c4d3", k * 0.7);
    }
    return out;
  }

  /* ---------- 随机 ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---------- 基础图元 ---------- */
  function skyGrad(g, W, top, bottom, p) {
    const gr = g.createLinearGradient(0, top, 0, bottom);
    gr.addColorStop(0, p.sky[0]); gr.addColorStop(0.38, p.sky[1]); gr.addColorStop(0.75, p.sky[2]); gr.addColorStop(1, p.sky[3]);
    g.fillStyle = gr; g.fillRect(0, top, W, bottom - top);
  }
  function glow(g, x, y, r, color, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgb(hex(color), a)); gr.addColorStop(1, rgb(hex(color), 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function stars(g, R, W, H, n) {
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = R() * H, s = R() < 0.08 ? 2.2 : R() * 1.3 + 0.4;
      g.fillStyle = `rgba(255,250,235,${0.35 + R() * 0.6})`; g.beginPath(); g.arc(x, y, s, 0, 6.283); g.fill();
    }
  }
  function moon(g, x, y, r) {
    glow(g, x, y, r * 7, "#c9d4ff", 0.18); glow(g, x, y, r * 2.4, "#fff6dc", 0.35);
    g.fillStyle = "#fff8e6"; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    g.fillStyle = "rgba(200,190,170,.25)"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, 6.283); g.arc(x + r * 0.25, y + r * 0.3, r * 0.15, 0, 6.283); g.fill();
  }
  function sun(g, x, y, r, c) { glow(g, x, y, r * 9, c, 0.35); glow(g, x, y, r * 2.5, "#fff3d6", 0.6); g.fillStyle = "#fff5dd"; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
  function clouds(g, R, W, y0, y1, color, a, n) {
    for (let i = 0; i < n; i++) {
      const cx = R() * W, cy = y0 + R() * (y1 - y0), w = 120 + R() * 260;
      g.fillStyle = rgb(hex(color), a * (0.5 + R() * 0.5));
      for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(cx + (R() - 0.5) * w, cy + (R() - 0.5) * 18, w * (0.2 + R() * 0.25), 14 + R() * 18, 0, 0, 6.283); g.fill(); }
    }
  }
  function sky(g, W, sc, p, R, horizon) {
    skyGrad(g, W, 0, horizon, p);
    if (sc.time === "night") { if (sc.weather === "clear") stars(g, R, W, horizon * 0.85, Math.round(W / 6)); moon(g, W * 0.76, horizon * 0.22, 34); }
    else if (sc.time === "dusk") sun(g, W * 0.3, horizon * 0.93, 46, "#ffb36b");
    else if (sc.time === "dawn") sun(g, W * 0.68, horizon * 0.96, 40, "#ffc6a0");
    else if (sc.weather === "clear") sun(g, W * 0.82, horizon * 0.16, 36, "#fff1c4");
    if (sc.weather === "rain") clouds(g, R, W, 0, horizon * 0.6, "#4a525f", 0.55, 14);
    else if (sc.weather === "snow") clouds(g, R, W, 0, horizon * 0.5, "#e3e8ef", 0.3, 10);
    else clouds(g, R, W, horizon * 0.15, horizon * 0.65, sc.time === "night" ? "#3a4373" : sc.time === "day" ? "#ffffff" : "#ffd2c0", sc.time === "day" ? 0.5 : 0.22, 5);
  }
  function layerColor(p, t) { return mixHex(p.far, p.near, t); }
  function groundOf(sc, p) {
    const S = SEASON[sc.season] || SEASON.autumn;
    const k = { day: 0.12, dawn: 0.5, dusk: 0.55, night: sc.season === "winter" ? 0.55 : 0.8 }[sc.time] || 0.2;
    return mixHex(S.ground, p.near, k);
  }
  function ground(g, W, y, color) { g.fillStyle = color; g.fillRect(0, y, W, VH - y); }
  function hills(g, R, W, base, amp, color, freq) {
    g.fillStyle = color; g.beginPath(); g.moveTo(0, VH);
    const ph = R() * 10, ph2 = R() * 10;
    for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, base - amp * (0.55 + 0.45 * Math.sin(x * freq + ph) * Math.sin(x * freq * 0.37 + ph2)));
    g.lineTo(W, VH); g.closePath(); g.fill();
  }

  // 一排楼：夜里随机亮灯
  function skyline(g, R, W, base, color, o) {
    o = o || {};
    let x = -20;
    while (x < W + 20) {
      const w = (o.minW || 50) + R() * (o.varW || 80), h = (o.minH || 60) + R() * (o.varH || 140);
      g.fillStyle = color; g.fillRect(x, base - h, w, h + 2);
      if (R() < 0.25) g.fillRect(x + w * 0.45, base - h - 22, 3, 22);
      if (o.windows) windowsGrid(g, R, x + 6, base - h + 8, w - 12, h - 12, o.windows, o.night, o.size || 6);
      x += w + (o.gap || 0) + R() * (o.varGap || 6);
    }
  }
  function windowsGrid(g, R, x, y, w, h, light, night, size) {
    const sx = size * 2.2, sy = size * 2.6;
    for (let yy = y; yy < y + h - size; yy += sy) for (let xx = x; xx < x + w - size; xx += sx) {
      if (night) { if (R() < light) { g.fillStyle = R() < 0.8 ? "rgba(255,210,130,.9)" : "rgba(190,220,255,.8)"; g.fillRect(xx, yy, size, size * 1.2); } }
      else { g.fillStyle = `rgba(255,255,255,${0.06 + R() * 0.12})`; g.fillRect(xx, yy, size, size * 1.2); }
    }
  }

  // 树：圆冠 / 银杏扇形 / 柳树 / 冬天的枯枝
  function tree(g, R, x, base, s, color, sc, kind) {
    const winter = sc.season === "winter";
    const trunk = mixHex(color, "#1a1410", 0.45);
    g.strokeStyle = trunk; g.lineCap = "round";
    g.lineWidth = s * 0.09; g.beginPath(); g.moveTo(x, base); g.lineTo(x, base - s * 0.75); g.stroke();
    if (winter) {
      g.lineWidth = s * 0.03;
      const branch = (bx, by, ang, len, d) => {
        if (d > 3) return;
        const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
        branch(ex, ey, ang - 0.45 - R() * 0.2, len * 0.68, d + 1); branch(ex, ey, ang + 0.45 + R() * 0.2, len * 0.68, d + 1);
      };
      branch(x, base - s * 0.6, -1.57, s * 0.35, 0);
      if (sc.weather === "snow" || sc.time !== "night") { g.fillStyle = "rgba(245,248,252,.75)"; for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse(x + (R() - 0.5) * s * 0.8, base - s * (0.7 + R() * 0.5), s * 0.06, s * 0.025, 0, 0, 6.283); g.fill(); } }
      return;
    }
    if (kind === "willow") {
      g.strokeStyle = trunk; g.lineWidth = s * 0.05;
      for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x, base - s * 0.7); g.quadraticCurveTo(x + d * s * 0.15, base - s * 1.05, x + d * s * 0.4, base - s * 1.0); g.stroke(); }
      g.strokeStyle = color; g.lineWidth = s * 0.012;
      for (let i = 0; i < 70; i++) {
        const t = R(), sx = x + (t - 0.5) * s * 1.0, top = base - s * (1.05 - Math.abs(t - 0.5) * 0.35);
        const len = s * (0.35 + R() * 0.45);
        g.globalAlpha = 0.5 + R() * 0.5;
        g.beginPath(); g.moveTo(sx, top); g.bezierCurveTo(sx + (t - 0.5) * s * 0.25, top + len * 0.3, sx + (t - 0.5) * s * 0.18, top + len * 0.7, sx + (t - 0.5) * s * 0.1 + (R() - 0.5) * 6, top + len); g.stroke();
      }
      g.globalAlpha = 1;
      return;
    }
    if (kind === "ginkgo") {
      g.fillStyle = color; g.beginPath(); g.moveTo(x, base - s * 1.55); g.quadraticCurveTo(x + s * 0.6, base - s * 0.9, x + s * 0.42, base - s * 0.55); g.lineTo(x - s * 0.42, base - s * 0.55); g.quadraticCurveTo(x - s * 0.6, base - s * 0.9, x, base - s * 1.55); g.fill();
      const lighter = mixHex(color, "#fff4c8", 0.25);
      g.fillStyle = rgb(hex(lighter), 0.55); for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(x + (R() - 0.5) * s * 0.55, base - s * (0.7 + R() * 0.65), s * (0.02 + R() * 0.03), 0, 6.283); g.fill(); }
      return;
    }
    g.fillStyle = color;
    for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(x + (R() - 0.5) * s * 0.7, base - s * (0.85 + R() * 0.45), s * (0.22 + R() * 0.16), 0, 6.283); g.fill(); }
    if (sc.season === "spring") { g.fillStyle = "rgba(255,230,238,.55)"; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(x + (R() - 0.5) * s * 0.8, base - s * (0.8 + R() * 0.55), s * 0.035, 0, 6.283); g.fill(); } }
  }
  function treeColor(sc, p, depth, R) {
    const S = SEASON[sc.season] || SEASON.autumn;
    if (!S.leaf) return layerColor(p, depth);
    const leaf = S.leaf[Math.floor(R() * S.leaf.length)];
    const darken = sc.time === "night" ? 0.82 : sc.time === "dusk" ? 0.55 : sc.time === "dawn" ? 0.45 : 0.18;
    return mixHex(mixHex(leaf, p.far, (1 - depth) * 0.45), p.near, Math.min(0.92, darken + depth * 0.15));
  }
  function lamp(g, x, base, h, color, on) {
    g.fillStyle = color; g.fillRect(x - 2.5, base - h, 5, h);
    g.fillRect(x - 2.5, base - h, 26, 4); g.fillRect(x + 16, base - h, 10, 10);
    if (on) { glow(g, x + 21, base - h + 10, 160, "#ffd08a", 0.42); glow(g, x + 21, base - h + 10, 30, "#fff2cf", 0.9);
      const gr = g.createLinearGradient(0, base - h, 0, base); gr.addColorStop(0, "rgba(255,214,150,.18)"); gr.addColorStop(1, "rgba(255,214,150,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x + 16, base - h + 10); g.lineTo(x + 26, base - h + 10); g.lineTo(x + 90, base); g.lineTo(x - 48, base); g.fill(); }
  }
  const night = (sc) => sc.time === "night";
  const i3 = (sc) => sc.time === "dawn";
  const lit = (sc) => sc.time === "night" || sc.time === "dusk";
  function snowCover(g, W, y, sc) { if (sc.season === "winter" || sc.weather === "snow") { g.fillStyle = sc.time === "night" ? "rgba(190,205,230,.55)" : "rgba(245,248,252,.85)"; g.fillRect(0, y, W, 10); } }

  // 室内墙面 + 光照
  function room(g, W, p, sc) {
    const wall = sc.weather === "rain" ? mixHex(p.wall, "#4a5060", 0.3) : p.wall;
    const gr = g.createLinearGradient(0, 0, 0, VH);
    gr.addColorStop(0, mixHex(wall, "#000000", 0.25)); gr.addColorStop(0.7, wall); gr.addColorStop(1, mixHex(wall, "#000000", 0.15));
    g.fillStyle = gr; g.fillRect(0, 0, W, VH);
  }
  function floor(g, W, y, p) {
    const gr = g.createLinearGradient(0, y, 0, VH); gr.addColorStop(0, p.floor); gr.addColorStop(1, mixHex(p.floor, "#000000", 0.4));
    g.fillStyle = gr; g.fillRect(0, y, W, VH - y);
  }
  // 画一扇窗，里面是外面的天和楼；返回窗的矩形（给天气粒子做裁剪）
  function windowView(g, R, x, y, w, h, sc, p, mull) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.translate(x, y); g.scale(w / 1000, h / 1000);
    skyGrad(g, 1000, 0, 1000, p);
    if (night(sc)) { stars(g, R, 1000, 600, 60); moon(g, 760, 220, 60); }
    else if (sc.time === "dusk") sun(g, 300, 880, 80, "#ffb36b");
    skyline(g, R, 1000, 1000, layerColor(p, 0.55), { minH: 120, varH: 380, minW: 90, varW: 140, windows: night(sc) ? 0.35 : 0, night: night(sc), size: 12 });
    g.restore();
    g.fillStyle = "rgba(255,255,255,.04)"; g.fillRect(x, y, w, h);
    const frame = mixHex(p.wall, "#ffffff", sc.time === "night" ? 0.05 : 0.35);
    g.strokeStyle = frame; g.lineWidth = 14; g.strokeRect(x, y, w, h);
    g.lineWidth = 8; g.beginPath();
    for (let i = 1; i < (mull || 2); i++) { g.moveTo(x + (w * i) / (mull || 2), y); g.lineTo(x + (w * i) / (mull || 2), y + h); }
    g.moveTo(x, y + h * 0.38); g.lineTo(x + w, y + h * 0.38); g.stroke();
    if (!night(sc) && sc.weather === "clear") {
      g.save(); g.globalCompositeOperation = "lighter";
      const gr = g.createLinearGradient(x, y, x + w * 1.4, VH); gr.addColorStop(0, "rgba(255,235,190,.16)"); gr.addColorStop(1, "rgba(255,235,190,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w * 1.9, VH); g.lineTo(x + w * 0.4, VH); g.fill(); g.restore();
    }
    return { x, y, w, h };
  }
  function shade(g, W, a, color) { g.fillStyle = rgb(hex(color || "#05060d"), a); g.fillRect(0, 0, W, VH); }

  /* ---------- 地点 ---------- */
  const PLACES = {};

  PLACES.station = (g, W, sc, p, R) => {
    const H0 = 560; sky(g, W, sc, p, R, H0);
    skyline(g, R, W, H0, layerColor(p, 0.2), { minH: 40, varH: 160, windows: night(sc) ? 0.2 : 0, night: night(sc), size: 4 });
    skyline(g, R, W, H0 + 20, layerColor(p, 0.45), { minH: 30, varH: 90, minW: 80, windows: night(sc) ? 0.3 : 0, night: night(sc) });
    ground(g, W, H0 + 20, layerColor(p, 0.6));
    // 火车
    const ty = 650, tc = mixHex(layerColor(p, 0.7), "#3d6e8f", 0.35);
    g.fillStyle = tc; g.fillRect(-10, ty - 120, W * 0.82, 120);
    g.fillStyle = mixHex(tc, "#000", 0.3); g.fillRect(-10, ty - 30, W * 0.82, 30);
    g.fillStyle = "#e9e2d0"; g.fillRect(-10, ty - 70, W * 0.82, 6);
    for (let x = 20; x < W * 0.8 - 60; x += 74) { g.fillStyle = lit(sc) ? "rgba(255,220,160,.85)" : "rgba(200,225,240,.55)"; g.fillRect(x, ty - 108, 52, 32); }
    g.beginPath(); g.fillStyle = tc; g.moveTo(W * 0.82 - 10, ty - 120); g.quadraticCurveTo(W * 0.82 + 80, ty - 110, W * 0.82 + 90, ty); g.lineTo(W * 0.82 - 10, ty); g.fill();
    if (lit(sc)) glow(g, W * 0.82 + 60, ty - 50, 120, "#fff0c0", 0.5);
    // 站台
    floor(g, W, ty, { floor: layerColor(p, 0.82) });
    g.fillStyle = "#e8c95a"; g.fillRect(0, ty + 8, W, 6);
    const pc = layerColor(p, 0.95);
    g.fillStyle = pc; g.fillRect(0, 0, W, 70); g.beginPath(); g.moveTo(0, 70); g.lineTo(W, 70); g.lineTo(W, 100); g.lineTo(0, 120); g.fill();
    for (let x = W * 0.12; x < W; x += W * 0.28) { g.fillStyle = pc; g.fillRect(x - 7, 90, 14, ty + 200); if (lit(sc)) glow(g, x, 130, 140, "#ffdca0", 0.35); }
  };

  PLACES.gate = (g, W, sc, p, R) => {
    const H0 = 600; sky(g, W, sc, p, R, H0);
    hills(g, R, W, H0 - 40, 50, layerColor(p, 0.12), 0.004);
    skyline(g, R, W, H0, layerColor(p, 0.3), { minH: 60, varH: 120, minW: 100, varW: 120, windows: night(sc) ? 0.35 : 0, night: night(sc) });
    ground(g, W, H0, groundOf(sc, p));
    shade(g, W, 0, "#000");
    // 路
    g.fillStyle = layerColor(p, 0.5); g.beginPath(); g.moveTo(W / 2 - 60, H0); g.lineTo(W / 2 + 60, H0); g.lineTo(W / 2 + 520, VH); g.lineTo(W / 2 - 520, VH); g.fill();
    g.fillStyle = mix(layerColor(p, 0.5), "#000000", 0.25); g.fillRect(0, H0, W, 6);
    // 两侧树
    for (let i = 0; i < 7; i++) {
      const t = i / 6, y = H0 + 10 + t * t * 380, s = 80 + t * t * 420;
      const dx = 120 + t * t * 620;
      tree(g, R, W / 2 - dx, y, s, treeColor(sc, p, 0.3 + t * 0.6, R), sc, "ginkgo");
      tree(g, R, W / 2 + dx, y, s, treeColor(sc, p, 0.3 + t * 0.6, R), sc, "ginkgo");
    }
    // 校门
    const gc = mixHex(layerColor(p, 0.75), "#6d5b4a", 0.2), gx = W / 2, gy = H0 + 40;
    g.fillStyle = gc; g.fillRect(gx - 230, gy - 260, 46, 260); g.fillRect(gx + 184, gy - 260, 46, 260);
    g.fillRect(gx - 260, gy - 300, 520, 52);
    g.fillStyle = mixHex(gc, "#000", 0.3); g.fillRect(gx - 270, gy - 310, 540, 14);
    g.fillStyle = sc.time === "night" ? "rgba(255,226,170,.92)" : "#f2e7cf"; g.font = "bold 34px serif"; g.textAlign = "center"; g.fillText("知 行 合 一", gx, gy - 262);
    if (lit(sc)) { glow(g, gx - 207, gy - 270, 90, "#ffd590", 0.45); glow(g, gx + 207, gy - 270, 90, "#ffd590", 0.45); }
    snowCover(g, W, H0, sc);
  };

  function dormBuilding(g, R, x, base, w, h, color, sc, highlight) {
    g.fillStyle = color; g.fillRect(x, base - h, w, h);
    g.fillStyle = mixHex(color, "#000", 0.25); g.fillRect(x - 10, base - h - 16, w + 20, 18);
    const floors = 6, cols = Math.max(4, Math.floor(w / 70));
    const fh = (h - 40) / floors, cw = w / cols;
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const wx = x + c * cw + cw * 0.2, wy = base - h + 30 + f * fh, ww = cw * 0.6, wh = fh * 0.55;
      const is404 = highlight && f === 2 && c === Math.floor(cols * 0.62);
      let on = night(sc) ? R() < 0.45 : sc.time === "dusk" ? R() < 0.25 : false;
      if (is404) on = night(sc) || sc.time === "dusk";
      g.fillStyle = on ? (is404 ? "#ffd27a" : R() < 0.85 ? "rgba(255,206,130,.88)" : "rgba(180,215,255,.8)") : mixHex(color, "#9fb6c9", night(sc) ? 0.08 : 0.35);
      g.fillRect(wx, wy, ww, wh);
      if (on) glow(g, wx + ww / 2, wy + wh / 2, ww * (is404 ? 2.2 : 1.2), "#ffcf80", is404 ? 0.55 : 0.18);
      g.fillStyle = mixHex(color, "#000", 0.3); g.fillRect(wx - 4, wy + wh, ww + 8, 6);
      if (is404) { g.fillStyle = "rgba(255,240,210,.9)"; g.font = "bold 15px sans-serif"; g.textAlign = "center"; g.fillText("404", wx + ww / 2, wy - 6); }
    }
  }

  PLACES.dormout = (g, W, sc, p, R) => {
    const H0 = 720; sky(g, W, sc, p, R, H0);
    skyline(g, R, W, H0 - 40, layerColor(p, 0.2), { minH: 100, varH: 160, minW: 120, varW: 120, windows: night(sc) ? 0.25 : 0, night: night(sc), size: 5 });
    const bw = Math.min(W * 0.78, 1100);
    dormBuilding(g, R, W / 2 - bw / 2, H0, bw, 560, mixHex(layerColor(p, 0.55), "#8a6e5c", 0.25), sc, true);
    ground(g, W, H0, mixHex(layerColor(p, 0.75), groundOf(sc, p), 0.4));
    snowCover(g, W, H0, sc);
    for (let x = 60; x < W; x += 260 + R() * 120) tree(g, R, x, H0 + 70 + R() * 60, 220 + R() * 90, treeColor(sc, p, 0.85, R), sc, "round");
    lamp(g, W * 0.2, VH - 60, 300, layerColor(p, 0.95), lit(sc));
    lamp(g, W * 0.78, VH - 40, 320, layerColor(p, 0.95), lit(sc));
    // 自行车
    g.strokeStyle = layerColor(p, 0.98); g.lineWidth = 5;
    for (let i = 0; i < 4; i++) { const bx = W * 0.55 + i * 70; g.beginPath(); g.arc(bx, VH - 70, 26, 0, 6.283); g.arc(bx + 50, VH - 70, 26, 0, 6.283); g.moveTo(bx, VH - 70); g.lineTo(bx + 22, VH - 110); g.lineTo(bx + 50, VH - 70); g.stroke(); }
  };

  PLACES.road = (g, W, sc, p, R) => {
    const H0 = 560; sky(g, W, sc, p, R, H0);
    skyline(g, R, W, H0, layerColor(p, 0.25), { minH: 50, varH: 110, minW: 90, windows: night(sc) ? 0.3 : 0, night: night(sc), size: 5 });
    ground(g, W, H0, mixHex(layerColor(p, 0.6), groundOf(sc, p), 0.45));
    g.fillStyle = mixHex(layerColor(p, 0.55), "#776a5c", 0.25); g.beginPath(); g.moveTo(W / 2 - 30, H0); g.lineTo(W / 2 + 30, H0); g.lineTo(W / 2 + 600, VH); g.lineTo(W / 2 - 600, VH); g.fill();
    if (sc.season === "autumn") for (let i = 0; i < 260; i++) { const y = H0 + Math.pow(R(), 0.7) * (VH - H0), x = W / 2 + (R() - 0.5) * (60 + (y - H0) * 2.8); g.fillStyle = R() < 0.6 ? "rgba(243,182,62,.8)" : "rgba(228,138,44,.7)"; g.beginPath(); g.ellipse(x, y, 3 + (y - H0) / 60, 1.5 + (y - H0) / 140, R() * 3, 0, 6.283); g.fill(); }
    snowCover(g, W, H0, sc);
    for (let i = 0; i < 9; i++) {
      const t = i / 8, y = H0 + 4 + t * t * 430, s = 60 + t * t * 520, dx = 70 + t * t * 760;
      tree(g, R, W / 2 - dx, y, s, treeColor(sc, p, 0.25 + t * 0.7, R), sc, "ginkgo");
      tree(g, R, W / 2 + dx, y, s, treeColor(sc, p, 0.25 + t * 0.7, R), sc, "ginkgo");
      if (i % 3 === 1) { lamp(g, W / 2 - dx * 0.75, y + 10, s * 0.65, layerColor(p, 0.4 + t * 0.6), lit(sc)); }
    }
  };

  PLACES.field = (g, W, sc, p, R) => {
    const H0 = 600; sky(g, W, sc, p, R, H0);
    skyline(g, R, W, H0 - 10, layerColor(p, 0.22), { minH: 60, varH: 120, minW: 110, windows: night(sc) ? 0.3 : 0, night: night(sc), size: 5 });
    for (let x = 0; x < W; x += 140 + R() * 80) tree(g, R, x, H0 + 10, 120 + R() * 50, treeColor(sc, p, 0.4, R), sc, "round");
    // 看台
    g.fillStyle = layerColor(p, 0.55); for (let i = 0; i < 5; i++) g.fillRect(0, H0 - 10 + i * 14, W * 0.35 - i * 10, 14);
    // 跑道
    const track = mixHex("#b3553f", p.near, night(sc) ? 0.6 : 0.15), grass = mixHex(SEASON[sc.season] ? SEASON[sc.season].ground : "#5d8a4c", p.near, night(sc) ? 0.6 : 0.1);
    g.fillStyle = track; g.fillRect(0, H0 + 60, W, VH);
    g.fillStyle = grass; g.beginPath(); g.ellipse(W / 2, VH + 220, W * 0.55, 380, 0, 0, 6.283); g.fill();
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2.5;
    for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(W / 2, VH + 220, W * 0.55 + 50 + k * 42, 380 + 30 + k * 30, 0, 3.4, 6.0); g.stroke(); }
    snowCover(g, W, H0 + 60, sc);
    // 灯塔
    for (const fx of [W * 0.12, W * 0.88]) {
      g.fillStyle = layerColor(p, 0.85); g.fillRect(fx - 5, 220, 10, H0 + 80 - 220); g.fillRect(fx - 50, 200, 100, 34);
      if (lit(sc)) { glow(g, fx, 217, 260, "#f6f2ff", 0.4); g.save(); g.globalCompositeOperation = "lighter"; const gr = g.createLinearGradient(fx, 230, W / 2, VH); gr.addColorStop(0, "rgba(240,240,255,.16)"); gr.addColorStop(1, "rgba(240,240,255,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(fx - 40, 230); g.lineTo(fx + 40, 230); g.lineTo(W / 2 + (fx < W / 2 ? 200 : -200), VH); g.lineTo(W / 2 + (fx < W / 2 ? -300 : 300), VH); g.fill(); g.restore(); }
    }
    // 篮球架
    const hx = W * 0.72, hc = layerColor(p, 0.92);
    g.fillStyle = hc; g.fillRect(hx, 440, 12, 330); g.fillRect(hx - 80, 440, 92, 10); g.fillRect(hx - 128, 380, 70, 50);
    g.strokeStyle = "#e0703c"; g.lineWidth = 4; g.beginPath(); g.ellipse(hx - 93, 438, 20, 6, 0, 0, 6.283); g.stroke();
  };

  PLACES.gym = (g, W, sc, p, R) => {
    const P = { wall: "#2a2f45", floor: "#c58a4e" };
    g.fillStyle = "#151827"; g.fillRect(0, 0, W, VH);
    // 屋顶钢架 + 灯
    g.strokeStyle = "#2c3150"; g.lineWidth = 3;
    for (let x = -200; x < W + 200; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 200, 160); g.lineTo(x + 400, 0); g.stroke(); }
    for (let x = W * 0.15; x < W; x += W * 0.23) { glow(g, x, 120, 280, "#fdf6e6", 0.28); g.fillStyle = "#fffbef"; g.fillRect(x - 40, 110, 80, 12); }
    // 看台人群
    for (let row = 0; row < 7; row++) {
      const y = 260 + row * 46;
      g.fillStyle = mixHex("#2b2f4a", "#151827", row / 10); g.fillRect(0, y + 20, W, 46);
      for (let x = (row % 2) * 18; x < W; x += 36) { g.fillStyle = mixHex("#3a3f60", "#151827", R() * 0.5); g.beginPath(); g.arc(x, y + 14, 13, 0, 6.283); g.fill(); g.fillRect(x - 15, y + 22, 30, 26); }
    }
    g.fillStyle = "rgba(240,120,70,.85)"; g.fillRect(W * 0.18, 300, 260, 40); g.fillStyle = "#fff"; g.font = "bold 22px sans-serif"; g.textAlign = "left"; g.fillText("江野 冲冲冲", W * 0.18 + 60, 328);
    // 地板
    const fy = 600; const gr = g.createLinearGradient(0, fy, 0, VH); gr.addColorStop(0, "#9b6536"); gr.addColorStop(1, "#d89a5c"); g.fillStyle = gr; g.fillRect(0, fy, W, VH - fy);
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, fy + 60); g.lineTo(W, fy + 60); g.stroke();
    g.beginPath(); g.ellipse(W / 2, VH + 40, 260, 140, 0, 3.14, 6.283); g.stroke();
    g.fillStyle = "rgba(255,255,255,.10)"; g.beginPath(); g.ellipse(W / 2, fy + 200, W * 0.4, 60, 0, 0, 6.283); g.fill();
    // 篮筐
    const hx = W * 0.5; g.fillStyle = "#eef0f5"; g.fillRect(hx - 90, 420, 180, 120); g.strokeStyle = "#d2543a"; g.lineWidth = 5; g.strokeRect(hx - 36, 470, 72, 56);
    g.beginPath(); g.ellipse(hx, 548, 34, 9, 0, 0, 6.283); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 1.5; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(hx + i * 10, 550); g.lineTo(hx + i * 6, 600); g.stroke(); }
    if (sc.time !== "night") shade(g, W, 0.05, "#ffffff");
  };

  PLACES.rooftop = (g, W, sc, p, R) => {
    const H0 = 720; sky(g, W, sc, p, R, H0);
    skyline(g, R, W, H0 - 80, layerColor(p, 0.15), { minH: 80, varH: 260, minW: 50, varW: 70, windows: lit(sc) ? 0.25 : 0, night: lit(sc), size: 4 });
    skyline(g, R, W, H0, layerColor(p, 0.35), { minH: 60, varH: 200, minW: 60, varW: 90, windows: lit(sc) ? 0.4 : 0, night: lit(sc), size: 5 });
    if (lit(sc)) glow(g, W / 2, H0, W * 0.6, "#ff9e5c", 0.12);
    // 天台地面 + 栏杆
    g.fillStyle = layerColor(p, 0.88); g.fillRect(0, 780, W, VH - 780);
    g.fillStyle = layerColor(p, 0.95); g.fillRect(0, 700, W, 10); g.fillRect(0, 770, W, 14);
    for (let x = 10; x < W; x += 46) g.fillRect(x, 700, 6, 80);
    // 水箱
    g.fillRect(W * 0.08, 520, 150, 190); g.fillRect(W * 0.08 + 20, 480, 110, 40);
    snowCover(g, W, 780, sc);
  };

  PLACES.lake = (g, W, sc, p, R) => {
    const H0 = 560; sky(g, W, sc, p, R, H0);
    hills(g, R, W, H0 - 20, 70, layerColor(p, 0.18), 0.003);
    skyline(g, R, W, H0, layerColor(p, 0.32), { minH: 30, varH: 90, minW: 90, windows: night(sc) ? 0.35 : 0, night: night(sc), size: 5 });
    // 亭子
    const px = W * 0.3, pc = layerColor(p, 0.45);
    g.fillStyle = pc; g.beginPath(); g.moveTo(px - 90, H0 - 90); g.quadraticCurveTo(px, H0 - 150, px + 90, H0 - 90); g.lineTo(px + 70, H0 - 80); g.lineTo(px - 70, H0 - 80); g.fill(); g.fillRect(px - 60, H0 - 82, 8, 82); g.fillRect(px + 52, H0 - 82, 8, 82);
    if (night(sc)) glow(g, px, H0 - 60, 70, "#ffcf80", 0.4);
    // 水面倒影
    const waterTop = H0;
    g.save(); g.translate(0, waterTop * 2); g.scale(1, -1); g.globalAlpha = 0.45;
    skyGrad(g, W, 0, H0, p); g.restore();
    const wg = g.createLinearGradient(0, waterTop, 0, VH); wg.addColorStop(0, rgb(hex(p.sky[3]), 0.25)); wg.addColorStop(1, rgb(hex(p.near), 0.85));
    g.fillStyle = wg; g.fillRect(0, waterTop, W, VH - waterTop);
    if (sc.season === "winter") { g.fillStyle = "rgba(220,232,245,.35)"; g.fillRect(0, waterTop, W, VH - waterTop); }
    g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 1.5;
    for (let i = 0; i < 70; i++) { const y = waterTop + Math.pow(R(), 1.6) * (VH - waterTop), x = R() * W, l = 20 + (y - waterTop) * 0.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke(); }
    if (night(sc)) { g.fillStyle = "rgba(255,248,220,.5)"; for (let i = 0; i < 14; i++) g.fillRect(W * 0.76 - 20 + (R() - 0.5) * 40, waterTop + 20 + i * 22, 30 + R() * 30, 3); }
    // 柳树 + 长椅
    tree(g, R, W * 0.86, 700, 420, treeColor(sc, p, 0.95, R), sc, "willow");
    tree(g, R, W * 0.06, 680, 360, treeColor(sc, p, 0.9, R), sc, "willow");
    g.fillStyle = layerColor(p, 0.98); g.fillRect(0, 860, W, VH - 860);
    g.fillRect(W * 0.55, 800, 220, 14); g.fillRect(W * 0.55, 770, 220, 10); g.fillRect(W * 0.55 + 14, 800, 10, 60); g.fillRect(W * 0.55 + 196, 800, 10, 60);
    lamp(g, W * 0.48, 860, 260, layerColor(p, 0.98), lit(sc));
  };

  PLACES.city = (g, W, sc, p, R) => {
    const H0 = 780; sky(g, W, sc, p, R, H0);
    skyline(g, R, W, H0, layerColor(p, 0.12), { minH: 200, varH: 380, minW: 70, varW: 90, windows: lit(sc) ? 0.3 : 0.0, night: lit(sc), size: 4 });
    skyline(g, R, W, H0, layerColor(p, 0.35), { minH: 120, varH: 300, minW: 90, varW: 120, gap: 10, windows: lit(sc) ? 0.45 : 0.6, night: lit(sc), size: 6 });
    if (lit(sc)) glow(g, W / 2, H0, W * 0.7, "#ff8f5a", 0.16);
    g.fillStyle = layerColor(p, 0.7); g.fillRect(0, H0, W, VH - H0);
    // 车流光带
    if (lit(sc)) { for (let i = 0; i < 60; i++) { const y = H0 + 30 + R() * 80, x = R() * W; g.fillStyle = R() < 0.5 ? "rgba(255,90,70,.7)" : "rgba(255,240,200,.75)"; g.fillRect(x, y, 30 + R() * 90, 2.5); } }
    g.fillStyle = layerColor(p, 0.9); g.fillRect(0, H0 + 130, W, VH);
    for (let x = 40; x < W; x += 230) lamp(g, x, VH - 20, 300, layerColor(p, 0.95), lit(sc));
  };

  PLACES.sea = (g, W, sc, p, R) => {
    const H0 = 560; sky(g, W, sc, p, R, H0);
    hills(g, R, W * 0.4, H0, 40, layerColor(p, 0.25), 0.01);
    const wg = g.createLinearGradient(0, H0, 0, 820); wg.addColorStop(0, mixHex(p.sky[3], "#2f6f8f", 0.4)); wg.addColorStop(1, mixHex(p.near, "#1d4f6b", 0.5));
    g.fillStyle = wg; g.fillRect(0, H0, W, 300);
    const sx = sc.time === "dusk" ? W * 0.3 : sc.time === "dawn" ? W * 0.68 : W * 0.76;
    for (let i = 0; i < 40; i++) { const y = H0 + 6 + i * 6.5, w = 10 + i * 5 * (0.6 + R()); g.fillStyle = sc.time === "night" ? "rgba(240,240,255,.35)" : "rgba(255,226,170,.55)"; g.fillRect(sx - w / 2 + (R() - 0.5) * 20, y, w, 2.5); }
    g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; for (let i = 0; i < 5; i++) { const y = 760 + i * 18; g.beginPath(); for (let x = 0; x <= W; x += 30) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 4); g.stroke(); }
    const sand = mixHex("#e2c79a", p.near, night(sc) ? 0.7 : sc.time === "dusk" ? 0.4 : 0.1);
    g.fillStyle = sand; g.beginPath(); g.moveTo(0, 820); for (let x = 0; x <= W; x += 40) g.lineTo(x, 815 + Math.sin(x * 0.006) * 12); g.lineTo(W, VH); g.lineTo(0, VH); g.fill();
    // 四个坐着的人
    const c = layerColor(p, 0.98);
    for (let i = 0; i < 4; i++) { const x = W * 0.42 + i * 62; g.fillStyle = c; g.beginPath(); g.arc(x, 860, 15, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(x, 905, 22, 34, 0, 0, 6.283); g.fill(); }
  };

  PLACES.mountain = (g, W, sc, p, R) => {
    const H0 = 700; sky(g, W, sc, p, R, H0);
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      hills(g, R, W, 470 + t * 330, 140 - t * 40, layerColor(p, 0.1 + t * 0.85), 0.002 + t * 0.002);
      if (i === 2) { g.fillStyle = rgb(hex(p.sky[3]), 0.55); for (let k = 0; k < 18; k++) { g.beginPath(); g.ellipse(R() * W, 610 + R() * 50, 120 + R() * 160, 18 + R() * 16, 0, 0, 6.283); g.fill(); } }
    }
    g.fillStyle = mixHex(p.near, "#000000", 0.55);
    g.beginPath(); g.moveTo(W * 0.25, VH); g.quadraticCurveTo(W * 0.45, 900, W * 0.62, 905); g.quadraticCurveTo(W * 0.8, 915, W, 960); g.lineTo(W, VH); g.fill();
    for (let i = 0; i < 4; i++) { const x = W * 0.44 + i * 56, y = 868 - i * 2; g.beginPath(); g.arc(x, y - 52, 13, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(x - 15, y + 40); g.lineTo(x - 12, y - 36); g.quadraticCurveTo(x, y - 44, x + 12, y - 36); g.lineTo(x + 15, y + 40); g.fill(); }
    if (i3(sc)) { g.strokeStyle = mixHex(p.near, "#000000", 0.55); g.lineWidth = 6; g.beginPath(); g.moveTo(W * 0.44 + 14, 830); g.lineTo(W * 0.44 + 44, 790); g.stroke(); }
  };

  PLACES.stage = (g, W, sc, p, R) => {
    g.fillStyle = "#07060d"; g.fillRect(0, 0, W, VH);
    const cols = ["#a58be0", "#6fa8e8", "#f08a4b", "#e7a1a1"];
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const x = W * (0.12 + i * 0.152), c = cols[i % cols.length];
      const gr = g.createLinearGradient(x, 0, W / 2, 640); gr.addColorStop(0, rgb(hex(c), 0.45)); gr.addColorStop(1, rgb(hex(c), 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - 18, 60); g.lineTo(x + 18, 60); g.lineTo(W / 2 + (x - W / 2) * 0.25 + 140, 640); g.lineTo(W / 2 + (x - W / 2) * 0.25 - 140, 640); g.fill();
    }
    glow(g, W / 2, 560, 340, "#fff1d6", 0.35);
    g.restore();
    g.fillStyle = "#1b1726"; g.fillRect(0, 40, W, 26); for (let i = 0; i < 6; i++) { g.fillStyle = "#e9e4ff"; g.fillRect(W * (0.12 + i * 0.152) - 16, 56, 32, 14); }
    g.fillStyle = "#16131f"; g.fillRect(0, 640, W, 40);
    // 台上的人
    g.fillStyle = "#0b0912";
    const fig = (x, s, guitar) => { g.beginPath(); g.arc(x, 470 - s * 0.1, 22 * s, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(x - 30 * s, 640); g.lineTo(x - 26 * s, 500); g.quadraticCurveTo(x, 480, x + 26 * s, 500); g.lineTo(x + 30 * s, 640); g.fill(); if (guitar) { g.beginPath(); g.ellipse(x + 10, 580, 30, 22, -0.4, 0, 6.283); g.fill(); g.fillRect(x + 20, 520, 70, 8); } };
    fig(W / 2, 1.05, true); fig(W / 2 - 220, 0.95, true); fig(W / 2 + 230, 0.95, false);
    g.fillRect(W / 2 + 200, 560, 120, 80); g.beginPath(); g.arc(W / 2 + 260, 600, 46, 0, 6.283); g.fill();
    g.fillRect(W / 2 - 3, 500, 6, 140);
    // 观众
    for (let row = 0; row < 4; row++) for (let x = (row % 2) * 22; x < W; x += 44) {
      const y = 760 + row * 70 + (R() - 0.5) * 10;
      g.fillStyle = mixHex("#14111c", "#05040a", row / 4); g.beginPath(); g.arc(x, y, 20, 0, 6.283); g.fill(); g.fillRect(x - 24, y + 14, 48, 80);
      if (R() < 0.12) { g.fillStyle = "rgba(220,235,255,.9)"; g.fillRect(x + 6, y - 46, 12, 20); glow(g, x + 12, y - 36, 26, "#cfe2ff", 0.5); }
    }
  };

  PLACES.dorm = (g, W, sc, p, R) => {
    room(g, W, p, sc); floor(g, W, 820, p);
    const ww = Math.min(380, W * 0.3), wx = W / 2 - ww / 2;
    const win = windowView(g, R, wx, 150, ww, 400, sc, p, 2);
    // 窗帘
    g.fillStyle = mixHex(p.wall, "#5b7c8a", 0.45); g.beginPath(); g.moveTo(wx - 40, 120); g.lineTo(wx + 30, 120); g.quadraticCurveTo(wx + 5, 360, wx + 20, 600); g.lineTo(wx - 50, 600); g.fill();
    g.beginPath(); g.moveTo(wx + ww + 40, 120); g.lineTo(wx + ww - 30, 120); g.quadraticCurveTo(wx + ww - 5, 360, wx + ww - 20, 600); g.lineTo(wx + ww + 50, 600); g.fill();
    g.fillStyle = mixHex(p.wall, "#000", 0.3); g.fillRect(wx - 70, 112, ww + 140, 10);
    // 书桌
    const dk = mixHex(p.floor, "#6e5a44", 0.3);
    g.fillStyle = dk; g.fillRect(wx - 60, 640, ww + 120, 22); g.fillRect(wx - 50, 662, 14, 160); g.fillRect(wx + ww + 36, 662, 14, 160);
    g.fillStyle = mixHex(dk, "#000", 0.3); g.fillRect(wx + 20, 560, 120, 80); g.fillStyle = mixHex(dk, "#9fd", night(sc) ? 0.35 : 0.1); g.fillRect(wx + 28, 568, 104, 60);
    for (let i = 0; i < 6; i++) { g.fillStyle = ["#c0614f", "#5d8fb4", "#e0b552", "#6f9e70", "#a58be0", "#ddd"][i]; g.fillRect(wx + ww - 130 + i * 16, 570 + (i % 2) * 8, 13, 70 - (i % 2) * 8); }
    // 台灯
    const lx = wx + ww - 20;
    g.strokeStyle = "#2a2a30"; g.lineWidth = 6; g.beginPath(); g.moveTo(lx, 640); g.lineTo(lx - 20, 560); g.lineTo(lx + 20, 520); g.stroke();
    g.fillStyle = "#2a2a30"; g.beginPath(); g.moveTo(lx + 2, 510); g.lineTo(lx + 50, 520); g.lineTo(lx + 36, 548); g.fill();
    if (lit(sc) || sc.weather === "rain") { glow(g, lx + 34, 560, 420, "#ffc36e", 0.45); glow(g, lx + 34, 545, 60, "#fff0c8", 0.8); }
    // 上下铺
    const bed = (x, flip) => {
      const c = mixHex(p.floor, "#3f4d5c", 0.5), w = 330;
      const bx = flip ? x - w : x;
      g.fillStyle = c; g.fillRect(bx, 200, 16, 640); g.fillRect(bx + w - 16, 200, 16, 640);
      g.fillRect(bx, 420, w, 18); g.fillRect(bx, 760, w, 18);
      g.fillStyle = mixHex(p.wall, flip ? "#8aa3c7" : "#d19a8a", 0.5); g.fillRect(bx + 16, 380, w - 32, 40); g.fillRect(bx + 16, 720, w - 32, 40);
      g.fillStyle = mixHex(p.wall, "#f3efe6", 0.4); g.beginPath(); g.ellipse(bx + (flip ? w - 70 : 70), 380, 46, 18, 0, 0, 6.283); g.fill();
      g.strokeStyle = c; g.lineWidth = 8; for (let y = 470; y < 760; y += 60) { g.beginPath(); g.moveTo(flip ? bx + 16 : bx + w - 16, y); g.lineTo(flip ? bx - 30 : bx + w + 30, y); g.stroke(); }
      // 床帘
      g.fillStyle = mixHex(p.wall, flip ? "#6f8a6a" : "#5c6a8f", 0.55); g.globalAlpha = 0.85; g.fillRect(bx + 16, 440, w - 32, 280); g.globalAlpha = 1;
    };
    bed(-40, false); bed(W + 40, true);
    // 海报
    g.fillStyle = mixHex(p.wall, "#f08a4b", 0.5); g.fillRect(310 > W * 0.3 ? W * 0.05 : 310, 200, 0, 0);
    if (night(sc)) shade(g, W, 0.25, "#05060f");
    if (lit(sc)) glow(g, lx + 34, 560, 300, "#ffb35c", 0.12);
    return win;
  };

  PLACES.library = (g, W, sc, p, R) => {
    room(g, W, { wall: mixHex(p.wall, "#7b5a40", 0.3) }, sc); floor(g, W, 780, { floor: mixHex(p.floor, "#4a3526", 0.5) });
    let win = null;
    const n = Math.max(2, Math.floor(W / 420));
    for (let i = 0; i < n; i++) {
      const ww = 220, x = (W / n) * (i + 0.5) - ww / 2;
      const r = windowView(g, R, x, 120, ww, 520, sc, p, 2);
      g.fillStyle = mixHex(p.wall, "#7b5a40", 0.3); g.beginPath(); g.moveTo(x - 8, 120); g.lineTo(x - 8, 80); g.arc(x + ww / 2, 120, ww / 2 + 8, 3.14, 6.283); g.lineTo(x + ww + 8, 120); g.fill();
      if (i === Math.floor(n / 2)) win = r;
    }
    // 书架
    const shelf = (x, w) => { g.fillStyle = "#3a2618"; g.fillRect(x, 160, w, 640); for (let y = 190; y < 780; y += 80) { for (let bx = x + 10; bx < x + w - 14;) { const bw = 10 + R() * 14; g.fillStyle = ["#7a3b2e", "#2f4b63", "#6b6b3a", "#9a7a4a", "#4b3b5c", "#2e5a4c"][Math.floor(R() * 6)]; g.fillRect(bx, y + 70 - (50 + R() * 18), bw, 50 + R() * 18); bx += bw + 2; } g.fillStyle = "#24170e"; g.fillRect(x, y + 70, w, 10); } };
    shelf(-30, Math.min(260, W * 0.18)); shelf(W - Math.min(230, W * 0.18), 260);
    // 长桌 + 绿台灯
    g.fillStyle = "#4a3020"; g.fillRect(W * 0.18, 720, W * 0.64, 26); g.fillRect(W * 0.2, 746, 16, 120); g.fillRect(W * 0.8 - 16, 746, 16, 120);
    for (let i = 0; i < 3; i++) { const x = W * (0.3 + i * 0.2); g.fillStyle = "#2e6b4c"; g.beginPath(); g.ellipse(x, 668, 40, 16, 0, 3.14, 6.283); g.fill(); g.fillStyle = "#b8a067"; g.fillRect(x - 3, 668, 6, 52); if (lit(sc) || sc.weather === "rain") glow(g, x, 690, 180, "#ffd38a", 0.45); }
    if (night(sc)) shade(g, W, 0.3, "#04040a");
    return win;
  };

  PLACES.classroom = (g, W, sc, p, R) => {
    room(g, W, p, sc); floor(g, W, 760, p);
    // 黑板
    const bw = Math.min(W * 0.55, 760), bx = W * 0.08;
    g.fillStyle = "#6b5440"; g.fillRect(bx - 12, 160, bw + 24, 300);
    g.fillStyle = mixHex("#244436", "#0b1510", night(sc) ? 0.5 : 0); g.fillRect(bx, 172, bw, 276);
    g.strokeStyle = "rgba(240,240,230,.55)"; g.lineWidth = 3; g.font = "28px serif"; g.fillStyle = "rgba(240,240,230,.7)"; g.textAlign = "left";
    g.fillText("∫ f(x)dx = F(b) − F(a)", bx + 40, 240); g.fillText("今日值日：404", bx + 40, 300);
    g.beginPath(); g.moveTo(bx + 40, 340); g.quadraticCurveTo(bx + 200, 300, bx + 340, 380); g.stroke();
    let win = null;
    const wx = bx + bw + 60;
    if (wx < W - 120) win = windowView(g, R, wx, 140, Math.min(320, W - wx - 40), 420, sc, p, 2);
    // 课桌
    for (let row = 0; row < 3; row++) {
      const y = 600 + row * 120, s = 1 + row * 0.25;
      for (let x = 60 + row * 20; x < W; x += 230 * s) {
        g.fillStyle = mixHex("#a8825a", p.near, 0.3 + (2 - row) * 0.1); g.fillRect(x, y, 170 * s, 18 * s); g.fillRect(x + 10, y + 18 * s, 10, 80 * s); g.fillRect(x + 160 * s - 20, y + 18 * s, 10, 80 * s);
        if (R() < 0.4) { g.fillStyle = "rgba(240,236,224,.8)"; g.fillRect(x + 30, y - 8, 50, 8); }
      }
    }
    if (night(sc)) { shade(g, W, 0.5, "#05060e"); glow(g, W * 0.5, 140, 500, "#e6f1ff", 0.14); }
    return win;
  };

  PLACES.canteen = (g, W, sc, p, R) => {
    const warm = { wall: mixHex(p.wall, "#c99b6b", 0.35), floor: mixHex(p.floor, "#6d4f3a", 0.4) };
    room(g, W, warm, sc); floor(g, W, 760, warm);
    // 窗口
    for (let x = 30; x < W; x += 300) {
      g.fillStyle = "#e9dcc1"; g.fillRect(x, 300, 260, 200); g.fillStyle = "#f6efe0"; g.fillRect(x + 14, 330, 232, 110);
      g.fillStyle = "#b94a35"; g.fillRect(x, 270, 260, 40); g.fillStyle = "#fff4dc"; g.font = "bold 20px sans-serif"; g.textAlign = "center"; g.fillText(["麻辣烫", "家常菜", "面食", "盖浇饭", "铁板烧", "砂锅"][Math.floor(x / 300) % 6], x + 130, 298);
      for (let k = 0; k < 4; k++) { g.fillStyle = ["#d98b3a", "#8fae5d", "#c4523e", "#e8c46a"][k]; g.fillRect(x + 24 + k * 56, 400, 46, 30); }
    }
    // 吊灯
    for (let x = W * 0.1; x < W; x += W * 0.2) { g.strokeStyle = "#333"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 130); g.stroke(); g.fillStyle = "#2b2b2b"; g.beginPath(); g.moveTo(x - 36, 160); g.lineTo(x + 36, 160); g.lineTo(x + 14, 130); g.lineTo(x - 14, 130); g.fill(); glow(g, x, 175, 230, "#ffcf87", lit(sc) ? 0.5 : 0.25); }
    // 桌子
    for (let x = 80; x < W; x += 340) { g.fillStyle = "#3f3a37"; g.fillRect(x, 640, 260, 20); g.fillRect(x + 120, 660, 20, 120); g.fillStyle = "#e8e2d4"; g.fillRect(x + 40, 628, 60, 12); g.fillRect(x + 150, 628, 60, 12); }
    if (night(sc)) shade(g, W, 0.2, "#100803");
  };

  PLACES.hospital = (g, W, sc, p, R) => {
    const wall = "#cfd8dc";
    g.fillStyle = wall; g.fillRect(0, 0, W, VH);
    const cx = W / 2, vy = 420;
    // 走廊透视
    g.fillStyle = "#e7edef"; g.beginPath(); g.moveTo(cx - 120, vy - 140); g.lineTo(cx + 120, vy - 140); g.lineTo(cx + 120, vy + 80); g.lineTo(cx - 120, vy + 80); g.fill();
    g.fillStyle = "#aebcc2"; g.beginPath(); g.moveTo(cx - 120, vy + 80); g.lineTo(cx + 120, vy + 80); g.lineTo(W + 200, VH); g.lineTo(-200, VH); g.fill();
    g.fillStyle = "#b8c6cc"; g.beginPath(); g.moveTo(0, 0); g.lineTo(cx - 120, vy - 140); g.lineTo(cx - 120, vy + 80); g.lineTo(-200, VH); g.lineTo(0, VH); g.fill();
    g.beginPath(); g.moveTo(W, 0); g.lineTo(cx + 120, vy - 140); g.lineTo(cx + 120, vy + 80); g.lineTo(W + 200, VH); g.lineTo(W, VH); g.fill();
    g.fillStyle = "#dfe7ea"; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(cx + 120, vy - 140); g.lineTo(cx - 120, vy - 140); g.fill();
    // 灯
    for (let i = 0; i < 5; i++) { const t = 1 - i / 5, y = vy - 140 - (vy - 140) * t * 0.9, w = 30 + t * 220; g.fillStyle = "#fbfdff"; g.fillRect(cx - w / 2, y, w, 6 + t * 10); glow(g, cx, y + 20, 80 + t * 200, "#eef7ff", 0.3); }
    // 门
    for (let i = 0; i < 4; i++) { const t = i / 4, x = cx - 120 - (cx - 120) * (1 - t) * 0.95, h = 120 + (1 - t) * 360; g.fillStyle = "#7fa0ab"; g.fillRect(x, vy + 80 - h * 0.85 + (1 - t) * 160, 30 + (1 - t) * 70, h); }
    // 椅子
    for (let i = 0; i < 4; i++) { const x = W - 380 + i * 90; g.fillStyle = "#4f7f9a"; g.fillRect(x, 780, 70, 60); g.fillRect(x, 720, 70, 14); g.fillRect(x + 6, 840, 8, 70); g.fillRect(x + 56, 840, 8, 70); }
    if (night(sc)) shade(g, W, 0.35, "#0a1420");
    g.fillStyle = "rgba(160,255,200,.85)"; g.fillRect(cx - 40, vy - 120, 80, 26); g.fillStyle = "#0a2a1a"; g.font = "bold 18px sans-serif"; g.textAlign = "center"; g.fillText("安全出口", cx, vy - 101);
  };

  PLACES.stairs = (g, W, sc, p, R) => {
    g.fillStyle = "#2a2d36"; g.fillRect(0, 0, W, VH);
    // 声控灯
    const lx = W * 0.5; g.fillStyle = "#fff8e2"; g.beginPath(); g.arc(lx, 90, 18, 0, 6.283); g.fill(); glow(g, lx, 100, 620, "#ffe2a8", 0.55);
    // 台阶
    const c1 = "#8d8a84", c2 = "#6e6b66";
    for (let i = 0; i < 12; i++) { const y = 420 + i * 50, x0 = W * 0.18 + i * 30; g.fillStyle = i % 2 ? c1 : c2; g.fillRect(x0, y, W * 0.7, 50); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x0, y + 44, W * 0.7, 6); }
    // 扶手
    g.strokeStyle = "#3a3633"; g.lineWidth = 10; g.beginPath(); g.moveTo(W * 0.12, 330); g.lineTo(W * 0.62, 900); g.stroke();
    g.lineWidth = 4; for (let i = 0; i < 9; i++) { const x = W * 0.14 + i * 55, y = 352 + i * 62; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 120); g.stroke(); }
    // 小窗
    const win = windowView(g, R, W * 0.78, 180, 160, 220, sc, p, 1);
    // 坐着的人影
    g.fillStyle = "#1b1b22"; g.beginPath(); g.arc(W * 0.47, 520, 26, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(W * 0.47, 600, 40, 60, 0, 0, 6.283); g.fill();
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, 0, W, VH);
    return win;
  };

  /* ---------- 对外接口 ---------- */
  function sceneKey(sc) { return [sc.at, sc.time, sc.weather, sc.season].join("|"); }

  // 把场景画到 canvas 上（cover 填满），返回窗户在屏幕坐标中的矩形（室内场景才有）
  function paint(canvas, sc, dpr) {
    const cw = canvas.clientWidth || canvas.width, ch = canvas.clientHeight || canvas.height;
    dpr = dpr || 1;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    const g = canvas.getContext("2d");
    const scale = canvas.height / VH;
    const W = Math.max(560, canvas.width / scale);
    const ox = (canvas.width / scale - W) / 2;
    g.setTransform(scale, 0, 0, scale, ox * scale, 0);
    const p = palette(sc);
    const R = rng(hash(sceneKey(sc)));
    const fn = PLACES[sc.at] || PLACES.road;
    let win = null;
    try { win = fn(g, W, sc, p, R) || null; } catch (e) { console.error(e); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    return win ? { x: (win.x + ox) * scale / dpr, y: (win.y * scale) / dpr, w: (win.w * scale) / dpr, h: (win.h * scale) / dpr, indoor: true } : { indoor: INDOOR.includes(sc.at) };
  }
  const INDOOR = ["dorm", "library", "classroom", "canteen", "hospital", "gym", "stage", "stairs"];

  const thumbCache = new Map();
  function thumb(sc, w, h) {
    if (!sc) sc = { at: "dorm", time: "night", weather: "clear", season: "autumn" };
    const k = sceneKey(sc) + w + "x" + h;
    if (thumbCache.has(k)) return thumbCache.get(k);
    const c = document.createElement("canvas");
    c.style.width = w + "px"; c.style.height = h + "px";
    Object.defineProperty(c, "clientWidth", { value: w }); Object.defineProperty(c, "clientHeight", { value: h });
    paint(c, sc, 1.5);
    const url = c.toDataURL("image/jpeg", 0.82);
    thumbCache.set(k, url);
    return url;
  }

  /* ---------- 天气与季节粒子 ---------- */
  function Weather(canvas) {
    this.c = canvas; this.g = canvas.getContext("2d"); this.p = []; this.mode = null; this.win = null; this.t = 0; this.running = false;
    this.reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  Weather.prototype.set = function (sc, win) {
    const indoor = win && win.indoor;
    let mode = null;
    if (sc.weather === "rain") mode = "rain";
    else if (sc.weather === "snow") mode = "snow";
    else if (!indoor && sc.season === "autumn" && sc.at !== "city") mode = "leaf";
    else if (!indoor && sc.season === "spring") mode = "petal";
    else if (!indoor && sc.season === "summer" && sc.time === "night") mode = "firefly";
    else if (sc.at === "stage") mode = "spark";
    else if (indoor && sc.time !== "night") mode = "dust";
    else if (!indoor && sc.time === "night") mode = "twinkle";
    this.mode = mode; this.win = indoor && win.w ? win : null;
    if (indoor && (mode === "rain" || mode === "snow") && !this.win) this.mode = mode === "rain" ? "dust" : null;
    this.resize(); this.p = [];
    const n = { rain: 160, snow: 120, leaf: 26, petal: 34, firefly: 30, dust: 40, spark: 30, twinkle: 18 }[this.mode] || 0;
    for (let i = 0; i < (this.reduced ? Math.round(n / 4) : n); i++) this.p.push(this.spawn(true));
    if (!this.running) { this.running = true; this.loop(); }
  };
  Weather.prototype.resize = function () {
    const d = Math.min(2, root.devicePixelRatio || 1);
    this.w = this.c.clientWidth; this.h = this.c.clientHeight; this.c.width = this.w * d; this.c.height = this.h * d; this.g.setTransform(d, 0, 0, d, 0, 0);
  };
  Weather.prototype.spawn = function (init) {
    const W = this.w, H = this.h, r = Math.random;
    const area = this.win || { x: 0, y: 0, w: W, h: H };
    const o = { x: area.x + r() * area.w, y: init ? area.y + r() * area.h : area.y - 20, s: r(), a: r() * 6.28, life: r() };
    if (this.mode === "firefly" || this.mode === "dust" || this.mode === "twinkle" || this.mode === "spark") o.y = area.y + r() * area.h;
    return o;
  };
  Weather.prototype.loop = function () {
    if (!this.running) return;
    const g = this.g, W = this.w, H = this.h, m = this.mode;
    g.clearRect(0, 0, W, H);
    if (m) {
      const area = this.win || { x: 0, y: 0, w: W, h: H };
      if (this.win) { g.save(); g.beginPath(); g.rect(area.x, area.y, area.w, area.h); g.clip(); }
      this.t += 1;
      for (let i = 0; i < this.p.length; i++) {
        const o = this.p[i];
        if (m === "rain") { o.x += -1.5 - o.s; o.y += 14 + o.s * 10; g.strokeStyle = `rgba(200,215,235,${0.18 + o.s * 0.3})`; g.lineWidth = 1; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + 2, o.y - 16 - o.s * 10); g.stroke(); }
        else if (m === "snow") { o.y += 0.5 + o.s * 1.4; o.x += Math.sin(this.t / 60 + o.a) * 0.6; g.fillStyle = `rgba(255,255,255,${0.5 + o.s * 0.5})`; g.beginPath(); g.arc(o.x, o.y, 1 + o.s * 2.6, 0, 6.28); g.fill(); }
        else if (m === "leaf" || m === "petal") {
          o.y += 0.6 + o.s * 1.1; o.x += Math.sin(this.t / 70 + o.a) * 1.1 + 0.35; o.a += 0.02 + o.s * 0.02;
          g.save(); g.translate(o.x, o.y); g.rotate(o.a); g.scale(1, Math.abs(Math.cos(o.a * 1.3)) * 0.8 + 0.2);
          if (m === "leaf") { g.fillStyle = o.s < 0.6 ? "rgba(245,186,60,.9)" : "rgba(230,140,45,.85)"; const z = 6 + o.s * 6; g.beginPath(); g.moveTo(0, z * 0.6); g.arc(0, z * 0.6, z, -2.4, -0.74); g.closePath(); g.fill(); }
          else { g.fillStyle = "rgba(250,200,215,.85)"; g.beginPath(); g.ellipse(0, 0, 4 + o.s * 3, 2.4 + o.s * 1.5, 0, 0, 6.28); g.fill(); }
          g.restore();
        } else if (m === "firefly") { o.x += Math.sin(this.t / 50 + o.a) * 0.5; o.y += Math.cos(this.t / 63 + o.a) * 0.4; const al = 0.3 + 0.7 * Math.abs(Math.sin(this.t / 40 + o.a)); g.fillStyle = `rgba(220,255,150,${al})`; g.beginPath(); g.arc(o.x, o.y, 2, 0, 6.28); g.fill(); g.fillStyle = `rgba(220,255,150,${al * 0.15})`; g.beginPath(); g.arc(o.x, o.y, 9, 0, 6.28); g.fill(); }
        else if (m === "dust") { o.x += Math.sin(this.t / 90 + o.a) * 0.15 + 0.08; o.y += Math.cos(this.t / 110 + o.a) * 0.12 - 0.04; g.fillStyle = `rgba(255,240,200,${0.12 + 0.25 * Math.abs(Math.sin(this.t / 80 + o.a))})`; g.beginPath(); g.arc(o.x, o.y, 1 + o.s * 1.5, 0, 6.28); g.fill(); }
        else if (m === "spark") { o.y -= 0.3 + o.s * 0.6; o.x += Math.sin(this.t / 40 + o.a) * 0.4; g.fillStyle = `rgba(255,230,190,${0.2 + 0.5 * Math.abs(Math.sin(this.t / 30 + o.a))})`; g.beginPath(); g.arc(o.x, o.y, 1.2 + o.s, 0, 6.28); g.fill(); if (o.y < 0) Object.assign(o, this.spawn(false), { y: H }); }
        else if (m === "twinkle") { if (o.y > H * 0.5) o.y = r01() * H * 0.5; const al = Math.max(0, Math.sin(this.t / (30 + o.s * 40) + o.a)); g.fillStyle = `rgba(255,250,230,${al * 0.9})`; g.beginPath(); g.arc(o.x, o.y, 0.8 + o.s * 1.2, 0, 6.28); g.fill(); }
        if (o.y > area.y + area.h + 20 || o.x < area.x - 40 || o.x > area.x + area.w + 40) this.p[i] = this.spawn(false);
      }
      if (this.win) g.restore();
    }
    if (this.reduced && m !== "rain" && m !== "snow") { this.running = false; return; }
    requestAnimationFrame(() => this.loop());
  };
  function r01() { return Math.random(); }

  DL.Art = { paint, thumb, Weather, INDOOR, palette };
})(typeof window !== "undefined" ? window : globalThis);
