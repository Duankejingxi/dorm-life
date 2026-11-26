// 叙事引擎 + 全部剧情的自动化测试：用随机选择跑几千局，检查不崩、文本无残留、结局分布合理
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const FILES = ["js/engine.js", "js/story/world.js", "js/story/y1.js", "js/story/y2.js", "js/story/y3.js", "js/story/y4.js", "js/story/moments.js", "js/story/endings.js", "js/story/social.js", "js/story/nights.js", "js/systems.js"];

function load() {
  const ctx = { console, Math, Date, JSON };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  return ctx.DL;
}

const LOCS = ["station", "gate", "dormout", "road", "library", "field", "gym", "canteen", "rooftop", "classroom", "lake", "hospital", "city", "stage", "sea", "mountain", "stairs", "dorm"];

function mockIO(DL, pick, out) {
  const check = (t, where) => {
    if (typeof t !== "string") throw new Error("非字符串文本 @" + where + ": " + t);
    if (/\{\w+\}/.test(t)) throw new Error("模板残留 @" + where + ": " + t);
    if (/undefined|NaN|null/.test(t)) throw new Error("坏文本 @" + where + ": " + t);
    out.chars += t.length;
  };
  return {
    say: async (who, text) => { if (who && who[0] !== "?" && !DL.CAST[who]) throw new Error("未知角色 " + who); check(text, "say"); out.lines++; },
    ask: async (prompt, opts) => { check(prompt, "ask"); assert.ok(opts.length > 0, "选项为空：" + prompt); opts.forEach((o) => check(o.t, "opt")); out.choices++; return pick(opts.length); },
    scene: async (sc) => { if (!LOCS.includes(sc.at)) throw new Error("未知场景 " + sc.at); },
    toast: () => {},
    memory: async (m) => { check(m.title, "mem"); check(m.text, "mem"); },
    card: async (t) => check(t, "card"),
    heading: async (t) => check(t, "heading"),
    chapter: async () => {},
    plan: async (opts, n) => { assert.ok(opts.length >= 3); opts.forEach((o) => { check(o.name, "plan"); check(o.desc, "plan"); }); const r = []; for (let i = 0; i < n; i++) r.push(opts[pick(opts.length)].id); return r; },
    montage: async (lines) => lines.forEach((l) => check(l, "montage")),
    transcript: async () => {},
    game: async (kind, o) => { out.games = (out.games || 0) + 1; if (o && o.optional && pick(3) === 0) return null; return pick(100) / 99; },
    free: async (opts) => { assert.ok(opts.length >= 2 && opts.length <= 4); opts.forEach((o) => { check(o.name, "free"); if (o.title) check(o.title, "free"); }); out.free = (out.free || 0) + 1;
      // 一半的玩家专挑有“新故事”的地点
      const k = opts.findIndex((o) => o.story); return k >= 0 && pick(2) === 0 ? k : pick(opts.length); },
    chat: async (c) => { check(c.title, "chat"); c.msgs.forEach((m) => check(m.text, "chat")); c.replies.forEach((r) => check(r, "chat")); c.follow.forEach((f) => f.forEach((m) => check(m.text, "chat"))); out.chats = (out.chats || 0) + 1; return pick(c.replies.length); },
    bond: async () => {},
    night: { start: async () => { out.nights = (out.nights || 0) + 1; }, say: async (who, t) => { if (who && !DL.CAST[who]) throw new Error("未知角色 " + who); check(t, "night"); out.lines++; }, ask: async (q, opts) => { check(q, "night"); assert.ok(opts.length > 0, "卧谈会选项为空：" + q); opts.forEach((o) => check(o, "night")); out.choices++; return pick(opts.length); }, end: async (t) => check(t, "night") },
    achieve: (a) => { out.ach = out.ach || {}; out.ach[a.id] = 1; },
    save: () => {},
    epilogue: async (e) => {
      check(e.path.text, "end"); check(e.title.name, "title"); check(e.reunion.text, "reunion");
      e.fates.concat([e.lin]).forEach((f) => { check(f.text, "fate"); check(f.title, "fate"); });
    },
  };
}

test("剧情用到的字都在内置字体里（新增剧情后运行 tools/subset-fonts.py）", () => {
  const have = new Set(Array.from(fs.readFileSync(path.join(ROOT, "fonts/chars.txt"), "utf8")));
  let txt = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  for (const f of FILES.concat(["js/ui.js", "js/main.js", "js/games.js", "js/site.js", "js/marks.js"])) txt += fs.readFileSync(path.join(ROOT, f), "utf8");
  const missing = [...new Set(Array.from(txt).filter((c) => c.codePointAt(0) > 0x2e80 && !have.has(c)))];
  assert.deepEqual(missing, [], "字体里缺这些字：" + missing.join(""));
});

test("所有场景、节拍都存在", () => {
  const DL = load();
  const builtins = ["chapter", "plan", "moment", "exam", "summer", "chat", "free", "night"];
  for (const sem of DL.SEMESTERS) for (const b of sem.beats) {
    if (builtins.includes(b) && b !== "summer") continue;
    assert.ok(DL.SCENES[b], "缺少场景 " + b);
  }
  assert.ok(DL.MOMENTS.length >= 35, "校园碎片太少");
  const ids = new Set();
  for (const m of DL.MOMENTS) { assert.ok(!ids.has(m.id), "重复碎片 " + m.id); ids.add(m.id); }
});

test("随机跑 4000 局：不崩、无残留文本、结局分布合理", async () => {
  const DL = load();
  const stats = { path: {}, fate: {}, lin: {}, reunion: {}, title: {}, ach: {}, games: 0, lines: 0, choices: 0, chars: 0 };
  const N = 4000;
  for (let i = 0; i < N; i++) {
    let seed = i * 7919 + 13;
    const r = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    // 一半纯随机，一半“有偏好”的玩家（倾向某几个选项），覆盖更多分支
    const bias = i % 2 ? null : Math.floor(r() * 4);
    const pick = (n) => (bias != null && r() < 0.6 ? Math.min(bias, n - 1) : Math.floor(r() * n));
    const tal = DL.drawTalents(5, r); const s = DL.newState({ name: "测试", dorm: i % 3 ? "m" : "f", crush: i % 5 ? "f" : "m", family: ["rich", "mid", "poor"][i % 3], seed: i, talents: [tal[0].id, tal[1].id] });
    const out = { lines: 0, choices: 0, chars: 0 };
    const e = await DL.playRun(s, mockIO(DL, pick, out));
    stats.path[e.path.id] = (stats.path[e.path.id] || 0) + 1;
    for (const f of e.fates) stats.fate[f.who + ":" + f.title] = (stats.fate[f.who + ":" + f.title] || 0) + 1;
    stats.lin[e.lin.title] = (stats.lin[e.lin.title] || 0) + 1;
    stats.reunion[e.reunion.count] = (stats.reunion[e.reunion.count] || 0) + 1;
    stats.title[e.title.name] = (stats.title[e.title.name] || 0) + 1;
    for (const k in out.ach || {}) stats.ach[k] = (stats.ach[k] || 0) + 1;
    stats.games += out.games || 0;
    // 学期预测要能在任意状态下给出合理结果
    const pv = DL.previewPlan(s, ["library", "rest", "field"]); assert.ok(pv.gpaHi >= pv.gpaLo && pv.gpaHi <= 4);
    stats.lines += out.lines; stats.choices += out.choices; stats.chars += out.chars;
  }
  const pct = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, (v / N * 100).toFixed(1) + "%"]));
  console.log("去向", pct(stats.path));
  console.log("命运", pct(stats.fate));
  console.log("林溪", pct(stats.lin));
  console.log("重聚人数", pct(stats.reunion));
  console.log("称号", pct(stats.title));
  console.log("平均每局：", Math.round(stats.lines / N), "句，", Math.round(stats.choices / N), "次选择，", Math.round(stats.games / N), "个小游戏，", Math.round(stats.chars / N), "字");
  console.log("成就", pct(stats.ach));
  for (const a of DL.ACH) assert.ok(stats.ach[a.id] > 0, "成就不可达：" + a.id);
  // 每个人的每种命运都应该能达到
  for (const k of ["jiang:冠军教练", "jiang:少儿篮球教练", "jiang:健身房老板", "jiang:很少说话的人", "su:苏博士", "su:走得慢的人", "su:远方", "xu:主唱", "xu:livehouse 老板", "xu:穿西装的人"]) {
    assert.ok(stats.fate[k] > 0, "命运不可达：" + k);
  }
  for (const k of ["靠窗的家", "四个小时的高铁", "太远了", "最后一张", "没说出口", "未曾相遇"]) assert.ok(stats.lin[k] > 0, "林溪结局不可达：" + k);
  for (const c of ["1", "2", "3", "4"]) assert.ok(stats.reunion[c] > 0, "重聚人数不可达：" + c);
});

test("存档可以在任意节拍恢复", async () => {
  const DL = load();
  const saves = [];
  const io = mockIO(DL, () => 0, { lines: 0, choices: 0, chars: 0 });
  io.save = (st) => saves.push(JSON.stringify(st));
  await DL.playRun(DL.newState({ seed: 42 }), io);
  assert.ok(saves.length > 50);
  for (const raw of saves.filter((_, i) => i % 7 === 0)) {
    const st = JSON.parse(raw);
    if (st.done) continue;
    const e = await DL.playRun(st, mockIO(DL, () => 1, { lines: 0, choices: 0, chars: 0 }));
    assert.ok(e.path.id);
  }
});
