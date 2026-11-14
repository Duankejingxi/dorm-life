// 后端接口测试
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.TRUST_PROXY = "1";
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "dl-srv-"));
const { createServer, _reset } = require("../server/server.js");

let base, server;
test.before(async () => { server = createServer(); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => server.close());
const post = (p, b, h) => fetch(base + p, { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, h), body: typeof b === "string" ? b : JSON.stringify(b) });

test("健康检查和静态文件", async () => {
  _reset();
  assert.equal((await (await fetch(base + "/api/health")).json()).ok, true);
  const r = await fetch(base + "/");
  assert.equal(r.status, 200); assert.match(await r.text(), /宿舍人生/);
  assert.equal((await fetch(base + "/server/server.js")).status, 404, "不能下载后端源码");
  assert.equal((await fetch(base + "/../package.json")).status, 404);
  assert.equal((await fetch(base + "/js/engine.js")).status, 200);
  assert.equal((await fetch(base + "/%2e%2e/%2e%2e/etc/passwd")).status, 404);
});

test("上报结局：白名单校验 + 统计", async () => {
  _reset();
  assert.equal((await post("/api/runs", { path: "hack" })).status, 400);
  assert.equal((await post("/api/runs", "{bad json")).status, 400);
  const r = await post("/api/runs", { path: "kaoyan_top", title: "图书馆的守夜人", reunion: 4, choices: { club: "photo", path: "kaoyan", group: "evil" }, flags: { together: true, suStayed: "yes" } });
  const j = await r.json();
  assert.equal(j.rank, 1);
  assert.equal(j.paths.kaoyan_top, 1);
  assert.equal(j.choices.club.photo, 1);
  assert.equal(j.choices.group, undefined, "非白名单群名不计");
  assert.equal(j.flags.together, 1);
  assert.equal(j.flags.suStayed, undefined, "非 true 不计");
  assert.equal((await post("/api/runs", { path: "x".repeat(5000) })).status, 400, "超大请求体被拒");
});

test("留言墙：清洗、过滤、限频", async () => {
  _reset();
  assert.equal((await post("/api/wall", { name: "a", text: "" })).status, 400);
  assert.equal((await post("/api/wall", { name: "a", text: "加我 vx:abc" }, { "X-Forwarded-For": "9.9.9.1" })).status, 400);
  const ok = await (await post("/api/wall", { name: "<b>阿念</b>超长的名字一二三四五", text: "  你会遇到很好的人。\n\n" }, { "X-Forwarded-For": "9.9.9.2" })).json();
  assert.equal(ok.note.text, "你会遇到很好的人。");
  assert.ok(ok.note.name.length <= 8);
  for (let i = 0; i < 2; i++) await post("/api/wall", { name: "x", text: "第" + i + "条" }, { "X-Forwarded-For": "9.9.9.3" });
  assert.equal((await post("/api/wall", { name: "x", text: "第三条" }, { "X-Forwarded-For": "9.9.9.3" })).status, 200);
  assert.equal((await post("/api/wall", { name: "x", text: "第四条" }, { "X-Forwarded-For": "9.9.9.3" })).status, 429);
  const w = await (await fetch(base + "/api/wall")).json();
  assert.equal(w.notes[0].text, "第三条", "最新的在前");
});
