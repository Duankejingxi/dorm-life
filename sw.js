/* 宿舍人生 · 离线缓存：游戏文件缓存优先，接口永远走网络 */
const VERSION = "dl-v3.1.0";
const FILES = ["./", "index.html", "css/site.css", "css/game.css", "js/site.js", "img/dormout-night.jpg", "img/station-dawn.jpg", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png",
  "js/engine.js", "js/story/world.js", "js/story/y1.js", "js/story/y2.js", "js/story/y3.js", "js/story/y4.js", "js/story/moments.js", "js/story/endings.js",
  "js/art.js", "js/audio.js", "js/api.js", "js/ui.js", "js/main.js"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.includes("/api/")) return;
  if (url.origin !== location.origin) {
    // 字体：先用缓存，没有再联网，联网成功顺手存一份
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); return res; }).catch(() => r)));
    return;
  }
  // 本站文件：网络优先（保证更新），离线时回退缓存
  e.respondWith(fetch(e.request).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); } return res; }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
});
