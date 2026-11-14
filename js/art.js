/* 宿舍人生 · 场景摄影
 * 每个场景 = 地点 × 时间 × 季节 × 天气 → 选一张最贴切的照片（img/*.jpg，统一调过色）。
 * 照片本身的光线和场景时间不一致时（比如白天的照片用在黄昏），再叠一层时间调色。
 * 照片来自 Open Images 数据集，CC BY 2.0，署名见 img/credits.json。
 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});

  const PHOTOS = ["canteen-day", "canteen-night", "city-day", "city-dusk", "city-night", "classroom-dawn", "classroom-day", "classroom-dusk", "classroom-night",
    "dorm-dawn", "dorm-day", "dorm-dusk", "dorm-night", "dorm-rain", "dormout-day", "dormout-night", "dormout-snow", "field-day", "field-night",
    "gate-autumn", "gate-night", "gate-spring", "gate-summer", "gate-winter", "gym", "hospital", "lake-dawn", "lake-day", "lake-dusk", "lake-night", "lake-winter",
    "library-dawn", "library-day", "library-night", "library-rain", "mountain", "road-autumn", "road-dusk", "road-rain", "road-snow", "road-spring", "road-summer", "road-winter",
    "rooftop-dawn", "rooftop-dusk", "rooftop-night", "sea", "stage-festival", "stage", "stairs", "station-dawn", "station-dusk", "station-night"];
  const HAS = new Set(PHOTOS);
  // 照片自身的光线
  const NATIVE = { "gate-night": "night", "road-rain": "night", "road-snow": "night", "dormout-snow": "night", gym: "night", hospital: "night", stage: "night", "stage-festival": "night", sea: "dusk", mountain: "dawn", stairs: "day", "road-dusk": "dusk", "road-summer": "dawn", "road-winter": "dawn", "lake-winter": "day", "dorm-rain": "day", "library-rain": "day" };
  const INDOOR = ["dorm", "library", "classroom", "canteen", "hospital", "gym", "stage", "stairs"];
  const ALT = { dawn: ["day", "dusk"], day: ["dawn", "dusk"], dusk: ["night", "day"], night: ["dusk", "day"] };

  function photoFor(sc) {
    if (!sc) return "dormout-night";
    if (sc.photo && HAS.has(sc.photo)) return sc.photo;
    const { at, time, weather, season } = sc;
    const t = [];
    if (weather === "rain") t.push(at + "-rain");
    if (weather === "snow") t.push(at + "-snow", at + "-winter");
    if (at === "gate" || at === "road") {
      if (time === "night") t.push(at + "-night", "gate-night");
      if (time === "dusk" && season === "autumn") t.push(at + "-dusk");
      t.push(at + "-" + season);
    }
    if (season === "winter") t.push(at + "-winter");
    t.push(at + "-" + time);
    for (const a of ALT[time] || []) t.push(at + "-" + a);
    t.push(at, at + "-day", at + "-night");
    for (const k of t) if (HAS.has(k)) return k;
    return "road-autumn";
  }
  function nativeTime(key) {
    if (NATIVE[key]) return NATIVE[key];
    const m = key.match(/-(dawn|day|dusk|night)$/);
    return m ? m[1] : "day";
  }
  const url = (key) => "img/" + key + ".jpg";

  // 返回 { key, url, grade }：grade 决定叠加的时间调色
  function resolve(sc) {
    const key = photoFor(sc);
    const native = nativeTime(key);
    const grade = sc && sc.time && sc.time !== native ? sc.time : "none";
    return { key, url: url(key), grade, indoor: sc ? INDOOR.includes(sc.at) : false };
  }

  const cache = new Map();
  function preload(src) {
    if (cache.has(src)) return cache.get(src);
    const p = new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => res(im); im.src = src; });
    cache.set(src, p);
    return p;
  }

  /* ---------- 天气：只保留雨和雪，克制地叠在照片上 ---------- */
  function Weather(canvas) {
    this.c = canvas; this.g = canvas.getContext("2d"); this.p = []; this.mode = null; this.running = false; this.t = 0;
    this.reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  Weather.prototype.set = function (sc) {
    this.mode = sc && sc.weather === "rain" ? "rain" : sc && sc.weather === "snow" ? "snow" : null;
    this.indoor = !!(sc && INDOOR.includes(sc.at));
    this.resize();
    this.p = [];
    const n = this.mode === "rain" ? (this.indoor ? 40 : 110) : this.mode === "snow" ? 90 : 0;
    for (let i = 0; i < (this.reduced ? Math.round(n / 4) : n); i++) this.p.push(this.spawn(true));
    if (!this.mode) this.g.clearRect(0, 0, this.w || 0, this.h || 0);
    else if (!this.running) { this.running = true; this.loop(); }
  };
  Weather.prototype.resize = function () {
    const d = Math.min(2, root.devicePixelRatio || 1);
    this.w = this.c.clientWidth; this.h = this.c.clientHeight;
    this.c.width = this.w * d; this.c.height = this.h * d; this.g.setTransform(d, 0, 0, d, 0, 0);
  };
  Weather.prototype.spawn = function (init) {
    const r = Math.random;
    return { x: r() * (this.w + 100) - 50, y: init ? r() * this.h : -20 - r() * 60, s: r(), a: r() * 6.28 };
  };
  Weather.prototype.loop = function () {
    if (!this.mode) { this.running = false; return; }
    const g = this.g, W = this.w, H = this.h;
    g.clearRect(0, 0, W, H);
    this.t++;
    for (let i = 0; i < this.p.length; i++) {
      const o = this.p[i];
      if (this.mode === "rain") {
        o.x -= 1 + o.s; o.y += 13 + o.s * 9;
        g.strokeStyle = `rgba(210,222,240,${0.08 + o.s * (this.indoor ? 0.12 : 0.22)})`; g.lineWidth = o.s > 0.8 ? 1.2 : 0.8;
        g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + 1.6, o.y - 14 - o.s * 14); g.stroke();
      } else {
        o.y += 0.35 + o.s * 1.1; o.x += Math.sin(this.t / 70 + o.a) * 0.5;
        g.fillStyle = `rgba(255,255,255,${0.25 + o.s * 0.55})`;
        g.beginPath(); g.arc(o.x, o.y, 0.8 + o.s * o.s * 3.2, 0, 6.283); g.fill();
      }
      if (o.y > H + 30 || o.x < -60) this.p[i] = this.spawn(false);
    }
    if (this.reduced) { this.running = false; return; }
    requestAnimationFrame(() => this.loop());
  };

  DL.Art = {
    resolve, preload, url, photoFor, Weather, INDOOR, PHOTOS,
    thumb: (sc) => url(photoFor(sc)),
  };
})(typeof window !== "undefined" ? window : globalThis);
