#!/usr/bin/env node
/* 宿舍人生 · 后端（零依赖）
 *   静态文件服务 + 三个接口：
 *   GET  /api/health          健康检查
 *   POST /api/runs            上报一局的结局（只收白名单字段，匿名）
 *   GET  /api/stats           全服统计：毕业人数、去向分布、关键选择比例
 *   GET  /api/wall            毕业留言墙（最近 60 条）
 *   POST /api/wall            留言（限长、限频、过滤）
 * 数据存在 server/data/db.json，写入用临时文件 + rename，防止写坏。
 */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const PATH_IDS = ["kaoyan_top", "kaoyan_adjust", "kaoyan_fail", "baoyan_top", "baoyan_home", "baoyan_fail", "job_big", "job_small", "job_none", "abroad_ok", "abroad_money", "abroad_fail", "gongwu_ok", "gongwu_fail", "music_sign", "music_small", "teach", "gap", "delay"];
const CHOICE_KEYS = { club: ["guitar", "photo", "ball", "debate", "none"], path: ["kaoyan", "baoyan", "job", "abroad", "gongwu", "music", "free"], group: ["404 Not Found", "四个人的宇宙", "今天也要早睡", "七号楼最强宿舍"] };
const FLAG_KEYS = ["together", "jiangBack", "suStayed", "dadCame", "wentFest", "linBreak", "metLin"];
const MAX_WALL = 500;

/* ---------- 存储 ---------- */
function emptyDb() { return { runs: 0, paths: {}, titles: {}, reunion: {}, choices: {}, flags: {}, wall: [] }; }
function loadDb() {
  try { const d = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); return Object.assign(emptyDb(), d); } catch (e) { return emptyDb(); }
}
let db = loadDb();
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = DB_FILE + "." + process.pid + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, DB_FILE);
    } catch (e) { console.error("保存失败", e.message); }
  }, 300);
}
function flushSync() {
  clearTimeout(saveTimer);
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DB_FILE, JSON.stringify(db)); } catch (e) { /* 忽略 */ }
}
const inc = (obj, k, n) => { obj[k] = (obj[k] || 0) + (n || 1); };

/* ---------- 限频 ---------- */
const hits = new Map();
function limited(ip, key, max, windowMs) {
  const k = ip + "|" + key, now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(k, arr); return true; }
  arr.push(now); hits.set(k, arr);
  if (hits.size > 5000) for (const [kk, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(kk);
  return false;
}

/* ---------- 文本清洗 ---------- */
const BAD = /(傻[逼比b]|操你|草你|sb\b|fuck|shit|cnm|nmsl|https?:\/\/|www\.|\.com\b|微信号|vx[:：]|加q|qq[:：]?\d)/i;
function clean(str, max) {
  const s = Array.from(String(str || "")).filter((ch) => { const c = ch.codePointAt(0); return !(c < 32 || c === 127 || (c >= 0x200b && c <= 0x200f) || (c >= 0x2028 && c <= 0x202e)); }).join("");
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}

/* ---------- HTTP ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8" };
const SECURITY = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "SAMEORIGIN" };

function send(res, code, body, type) {
  const data = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, Object.assign({ "Content-Type": type || "application/json; charset=utf-8", "Cache-Control": "no-store" }, SECURITY));
  res.end(data);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    let over = false;
    req.on("data", (c) => { size += c.length; if (size > limit) { if (!over) { over = true; reject(new Error("too large")); } } else chunks.push(c); });
    req.on("end", () => { if (over) return; try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch (e) { reject(new Error("bad json")); } });
    req.on("error", reject);
  });
}
// 只有部署在反向代理后面（设置 TRUST_PROXY=1）才信任 X-Forwarded-For，否则可被伪造绕过限频
function ipOf(req) { return (process.env.TRUST_PROXY && (req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress || "?"; }

function statsPayload() {
  return { runs: db.runs, paths: db.paths, titles: db.titles, reunion: db.reunion, choices: db.choices, flags: db.flags };
}

async function api(req, res, url) {
  const ip = ipOf(req);
  if (url.pathname === "/api/health") return send(res, 200, { ok: true, runs: db.runs });
  if (url.pathname === "/api/stats" && req.method === "GET") return send(res, 200, statsPayload());
  if (url.pathname === "/api/runs" && req.method === "POST") {
    if (limited(ip, "run", 20, 60 * 60 * 1000)) return send(res, 429, { error: "太频繁了" });
    let b; try { b = await readBody(req, 4096); } catch (e) { return send(res, 400, { error: e.message }); }
    if (!PATH_IDS.includes(b.path)) return send(res, 400, { error: "bad path" });
    db.runs++;
    inc(db.paths, b.path);
    if (typeof b.title === "string" && b.title.length <= 20) inc(db.titles, clean(b.title, 20));
    const rc = Number(b.reunion); if (rc >= 1 && rc <= 4) inc(db.reunion, String(rc));
    for (const k of Object.keys(CHOICE_KEYS)) { const v = b.choices && b.choices[k]; if (CHOICE_KEYS[k].includes(v)) { db.choices[k] = db.choices[k] || {}; inc(db.choices[k], v); } }
    for (const k of FLAG_KEYS) if (b.flags && b.flags[k] === true) inc(db.flags, k);
    // 称号字典别无限增长
    const tk = Object.keys(db.titles); if (tk.length > 80) { tk.sort((a, c) => db.titles[a] - db.titles[c]).slice(0, tk.length - 80).forEach((k) => delete db.titles[k]); }
    save();
    return send(res, 200, Object.assign({ ok: true, rank: db.runs }, statsPayload()));
  }
  if (url.pathname === "/api/wall" && req.method === "GET") return send(res, 200, { notes: db.wall.slice(-60).reverse() });
  if (url.pathname === "/api/wall" && req.method === "POST") {
    if (limited(ip, "wall", 3, 10 * 60 * 1000)) return send(res, 429, { error: "留言太频繁了，过会儿再来" });
    let b; try { b = await readBody(req, 2048); } catch (e) { return send(res, 400, { error: e.message }); }
    const name = clean(b.name, 8) || "匿名毕业生";
    const text = clean(b.text, 60);
    if (text.length < 2) return send(res, 400, { error: "写点什么吧" });
    if (BAD.test(text) || BAD.test(name)) return send(res, 400, { error: "换个说法吧" });
    const note = { name, text, t: Date.now() };
    db.wall.push(note);
    if (db.wall.length > MAX_WALL) db.wall = db.wall.slice(-MAX_WALL);
    save();
    return send(res, 200, { ok: true, note });
  }
  return send(res, 404, { error: "not found" });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.resolve(ROOT, "." + rel);
  const relPath = path.relative(ROOT, file).split(path.sep).join("/");
  // 只对外提供游戏本身的文件（白名单），后端源码、测试、配置一律 404
  const PUBLIC = /^(index\.html|sw\.js|manifest\.webmanifest|(css|js|icons|img)\/[\w\-/.]+)$/;
  if (!file.startsWith(ROOT + path.sep) || !PUBLIC.test(relPath)) return send(res, 404, "Not Found", "text/plain; charset=utf-8");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "Not Found", "text/plain; charset=utf-8");
    const ext = path.extname(file);
    res.writeHead(200, Object.assign({ "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": ext === ".html" || file.endsWith("sw.js") ? "no-cache" : ext === ".jpg" ? "public, max-age=604800" : "public, max-age=3600" }, SECURITY));
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname.startsWith("/api/")) {
      api(req, res, url).catch((e) => { console.error(e); send(res, 500, { error: "server error" }); });
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "method" });
    serveStatic(req, res, url);
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, HOST, () => console.log(`宿舍人生 运行在 http://localhost:${PORT}`));
  const bye = () => { flushSync(); process.exit(0); };
  process.on("SIGINT", bye); process.on("SIGTERM", bye);
}

module.exports = { createServer, _reset: () => { db = emptyDb(); }, _db: () => db };
