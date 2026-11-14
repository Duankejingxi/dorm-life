/* 宿舍人生 · 叙事引擎
 * 纯逻辑，不碰 DOM：浏览器里由 UI 提供 io，测试里由 mock io 自动选择。
 * 故事是“步骤”数组，引擎逐条解释执行：
 *   "旁白"                         旁白
 *   ["jiang", "台词"]              对白（who 不在 CAST 里就当作临时角色名）
 *   { at, time, weather, season }   切换场景
 *   { ask, options:[{ t, if, fx, then }] }  选择
 *   { if, then, else }              条件分支
 *   { fx }                          属性 / 关系 / 标记变化
 *   { mem: { id, title, text } }    收进回忆相册
 *   { card: "三个月后" }            过场字幕
 *   { do: (s, io) => ... }         自定义逻辑
 *   { play: "sceneId" }             播放另一个场景
 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});

  /* ---------- 随机：可存档的种子随机 ---------- */
  function rand(s) {
    let a = (s.rng = (s.rng + 0x6d2b79f5) | 0);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const randInt = (s, lo, hi) => lo + Math.floor(rand(s) * (hi - lo + 1));
  const pickOne = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------- 状态 ---------- */
  const STAT_KEYS = ["study", "body", "mood", "money", "exp", "prep"];
  const STAT_NAMES = { study: "学业", body: "体魄", mood: "心情", money: "存款", exp: "履历", prep: "备考" };
  const FAMILY = {
    rich: { name: "宽裕", allowance: 4200, desc: "家里不缺钱，生活费给得大方。" },
    mid: { name: "普通", allowance: 2800, desc: "普通家庭，生活费够用，偶尔紧巴。" },
    poor: { name: "拮据", allowance: 1600, desc: "家里不容易，每一笔钱你都知道分量。" },
  };
  const LIVING_COST = 2500;
  const ROOMIES = ["jiang", "su", "xu"];

  function newState(opts) {
    const o = opts || {};
    const fam = FAMILY[o.family] ? o.family : "mid";
    const s = {
      v: 2,
      name: (o.name || "林一").slice(0, 6),
      dorm: o.dorm === "f" ? "f" : "m",
      crush: o.crush === "m" ? "m" : o.crush === "f" ? "f" : o.dorm === "f" ? "m" : "f",
      family: fam,
      sem: 0,
      beat: 0,
      stats: { study: 45, body: 60, mood: 62, money: 600, exp: 0, prep: 0 },
      rel: { jiang: 25, su: 15, xu: 25, lin: 0, zhou: 5, cheng: 10 },
      flags: {},
      memories: [],
      seen: {},
      gpas: [],
      fails: 0,
      focus: {},
      journal: [],
      crises: {},
      rng: (o.seed != null ? o.seed : Math.floor(Math.random() * 2147483647)) | 0,
      startedAt: Date.now(),
    };
    if (fam === "rich") { s.stats.mood += 4; s.stats.money += 800; }
    if (fam === "poor") { s.stats.study += 5; s.stats.body += 4; s.stats.money -= 300; s.rel.su += 5; }
    return s;
  }

  function clone(s) { return JSON.parse(JSON.stringify(s)); }

  /* ---------- 文本模板 ---------- */
  const TEXT_DEFAULTS = { songName: "许多那首还没有名字的歌", song: "许多那首还没有名字的歌", board: "到此一游。" };
  function fmt(text, s) {
    if (typeof text === "function") text = text(s);
    if (text == null) return "";
    const f = s.dorm === "f";
    const lxF = s.crush === "f";
    const map = {
      me: s.name,
      ta: f ? "她" : "他",
      tamen: f ? "她们" : "他们",
      bro: f ? "姐妹" : "兄弟",
      bros: f ? "姐妹们" : "兄弟们",
      lx: lxF ? "她" : "他",
      xz: f ? "学姐" : "学长", // 你对新生而言的称呼
      xd: f ? "学妹" : "学弟",
      bedName: s.flags.bed === "door" ? "靠门" : "靠窗",
      group: s.flags.group || "404",
      club: (DL.CLUBS && DL.CLUBS[s.flags.club] && DL.CLUBS[s.flags.club].name) || "社团",
      path: (DL.PATHS && DL.PATHS[s.flags.path] && DL.PATHS[s.flags.path].name) || "未定",
    };
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : typeof s.flags[k] === "string" ? s.flags[k] : k in TEXT_DEFAULTS ? TEXT_DEFAULTS[k] : m));
  }

  /* ---------- 效果 ---------- */
  // eff: { study, body, mood, money, exp, prep, rel:{jiang:5}, set:{flag:value} }
  function applyFx(s, eff) {
    const changes = [];
    if (!eff) return changes;
    for (const k of STAT_KEYS) {
      if (eff[k] == null) continue;
      const before = s.stats[k];
      const after = k === "money" ? before + eff[k] : clamp(before + eff[k], 0, 100);
      s.stats[k] = after;
      if (after !== before) changes.push({ kind: "stat", key: k, name: STAT_NAMES[k], delta: after - before });
    }
    if (eff.rel) {
      for (const who of Object.keys(eff.rel)) {
        if (!(who in s.rel)) continue;
        const before = s.rel[who];
        let d0 = eff.rel[who];
        // 室友的好感有边际递减：越熟越难再进一步，避免四年下来人人满格
        if (d0 > 0 && ROOMIES.includes(who)) d0 = Math.max(1, Math.round(d0 * 0.8 * (1 - before / 135)));
        s.rel[who] = clamp(before + d0, 0, 100);
        const d = s.rel[who] - before;
        if (d) changes.push({ kind: "rel", key: who, name: (DL.CAST[who] || {}).name || who, delta: d });
      }
    }
    if (eff.set) Object.assign(s.flags, eff.set);
    if (eff.inc) for (const k of Object.keys(eff.inc)) s.flags[k] = (s.flags[k] || 0) + eff.inc[k];
    return changes;
  }

  function test(cond, s) {
    if (cond == null) return true;
    if (typeof cond === "function") return !!cond(s);
    if (typeof cond === "string") return !!s.flags[cond];
    return true;
  }

  /* ---------- 脚本解释器 ---------- */
  const STOP = { stop: true };

  async function run(steps, s, io) {
    if (!steps) return;
    if (typeof steps === "function") steps = steps(s);
    for (const step of steps) {
      const r = await runStep(step, s, io);
      if (r === STOP) return STOP;
    }
  }

  async function runStep(step, s, io) {
    if (step == null) return;
    if (typeof step === "string" || typeof step === "function") {
      const text = fmt(step, s);
      if (text) await io.say(null, text, s);
      return;
    }
    if (Array.isArray(step)) {
      await io.say(step[0], fmt(step[1], s), s);
      return;
    }
    if (step.if !== undefined) {
      return run(test(step.if, s) ? step.then : step.else, s, io);
    }
    if (step.at) {
      await io.scene({ at: step.at, time: step.time || "day", weather: step.weather || "clear", season: step.season || currentSeason(s) }, s);
      return;
    }
    if (step.ask) {
      const opts = step.options.filter((o) => test(o.if, s));
      const idx = await io.ask(fmt(step.ask, s), opts.map((o) => ({ t: fmt(o.t, s), hint: o.hint ? fmt(o.hint, s) : "" })), s);
      const o = opts[idx] || opts[0];
      if (step.key) s.flags[step.key] = o.v != null ? o.v : idx;
      if (o.fx) io.toast(applyFx(s, o.fx), s);
      return run(o.then, s, io);
    }
    if (step.fx) {
      io.toast(applyFx(s, typeof step.fx === "function" ? step.fx(s) : step.fx), s);
      return;
    }
    if (step.mem) {
      const m = step.mem;
      if (!s.memories.some((x) => x.id === m.id)) {
        const mem = { id: m.id, title: fmt(m.title, s), text: fmt(m.text, s), sem: s.sem, scene: io.currentScene ? io.currentScene() : null };
        s.memories.push(mem);
        await io.memory(mem, s);
      }
      return;
    }
    if (step.card) {
      await io.card(fmt(step.card, s), fmt(step.sub || "", s), s);
      return;
    }
    if (step.note) {
      s.journal.push({ sem: s.sem, text: fmt(step.note, s) });
      return;
    }
    if (step.do) {
      const r = await step.do(s, io);
      if (Array.isArray(r)) return run(r, s, io);
      return;
    }
    if (step.play) {
      return playScene(step.play, s, io);
    }
    if (step.stop) return STOP;
  }

  async function playScene(id, s, io) {
    const sc = DL.SCENES[id];
    if (!sc) throw new Error("缺少场景：" + id);
    if (!test(sc.when, s)) return;
    s.seen[id] = (s.seen[id] || 0) + 1;
    if (sc.at) await io.scene({ at: sc.at, time: sc.time || "day", weather: sc.weather || "clear", season: sc.season || currentSeason(s) }, s);
    if (sc.title && io.heading) await io.heading(fmt(sc.title, s), s);
    await run(sc.steps, s, io);
  }

  /* ---------- 学期 ---------- */
  function currentSeason(s) {
    const sem = DL.SEMESTERS[s.sem];
    return (sem && sem.season) || "autumn";
  }
  function year(s) { return Math.floor(s.sem / 2) + 1; }

  async function playBeat(beat, s, io) {
    if (beat === "chapter") return chapter(s, io);
    if (beat === "plan") return plan(s, io);
    if (beat === "moment") return moment(s, io);
    if (beat === "exam") return exam(s, io);
    if (beat === "summer") return playScene("summer", s, io);
    return playScene(beat, s, io);
  }

  async function chapter(s, io) {
    const sem = DL.SEMESTERS[s.sem];
    const allowance = FAMILY[s.family].allowance;
    applyFx(s, { money: allowance });
    s.journal.push({ sem: s.sem, text: "生活费到账 ¥" + allowance + "。" });
    await io.chapter(sem, s);
  }

  // 学期安排：从“时间去向”里挑 3 次（同一项最多 2 次，第二次效果打七折）
  async function plan(s, io) {
    const opts = DL.FOCUS.filter((f) => test(f.if, s));
    const picks = await io.plan(opts.map((f) => ({ id: f.id, icon: f.icon, name: fmt(f.name, s), desc: fmt(f.desc, s), fx: f.fx })), 3, s);
    const count = {};
    const all = [];
    const lines = [];
    for (const id of picks) {
      const f = DL.FOCUS.find((x) => x.id === id) || opts[0];
      count[f.id] = (count[f.id] || 0) + 1;
      s.focus[f.id] = (s.focus[f.id] || 0) + 1;
      const k = count[f.id] === 1 ? 1 : 0.7;
      const eff = {};
      for (const key of Object.keys(f.fx)) {
        if (key === "rel") {
          eff.rel = {};
          for (const w of Object.keys(f.fx.rel)) eff.rel[w] = Math.round(f.fx.rel[w] * k);
        } else if (typeof f.fx[key] === "number") eff[key] = Math.round(f.fx[key] * k);
        else eff[key] = f.fx[key];
      }
      all.push(...applyFx(s, eff));
      if (count[f.id] === 1) lines.push(fmt(pickOne(s, f.lines), s));
    }
    io.toast(mergeChanges(all), s);
    await io.montage(lines, s);
  }

  function mergeChanges(list) {
    const m = new Map();
    for (const c of list) {
      const k = c.kind + ":" + c.key;
      if (m.has(k)) m.get(k).delta += c.delta; else m.set(k, Object.assign({}, c));
    }
    return [...m.values()].filter((c) => c.delta);
  }

  async function moment(s, io) {
    const y = year(s);
    const season = currentSeason(s);
    const pool = DL.MOMENTS.filter((m) => !s.seen[m.id] && (!m.years || m.years.includes(y)) && (!m.seasons || m.seasons.includes(season)) && test(m.if, s));
    if (!pool.length) return;
    const total = pool.reduce((a, m) => a + (m.w || 1), 0);
    let r = rand(s) * total;
    let pick = pool[0];
    for (const m of pool) { r -= m.w || 1; if (r <= 0) { pick = m; break; } }
    s.seen[pick.id] = 1;
    await io.scene({ at: pick.at, time: pick.time || "day", weather: pick.weather || "clear", season: pick.season || season }, s);
    if (io.heading) await io.heading(fmt(pick.title, s), s);
    await run(pick.steps, s, io);
  }

  // 期末：学业换算绩点，太低会挂科
  async function exam(s, io) {
    const st = s.stats;
    let gpa = 1.3 + (st.study / 100) * 2.75 + (rand(s) - 0.5) * 0.4;
    if (st.mood < 25) gpa -= 0.25;
    if (st.body < 25) gpa -= 0.2;
    gpa = Math.round(clamp(gpa, 0.8, 4.0) * 100) / 100;
    let failed = 0;
    if (st.study < 30) failed = st.study < 18 ? 2 : 1;
    s.gpas.push(gpa);
    s.fails += failed;
    // 学期结算：生活开销 + 学业自然回落（不学就会忘）
    applyFx(s, { money: -LIVING_COST, study: -4, mood: -6 });
    const avg = gpaAvg(s);
    await io.transcript({ sem: DL.SEMESTERS[s.sem], gpa, avg, failed, totalFails: s.fails, money: st.money, rank: rankOf(gpa) }, s);
    s.journal.push({ sem: s.sem, text: "期末绩点 " + gpa.toFixed(2) + (failed ? "，挂了 " + failed + " 门。" : "。") });
    if (st.money < 0) await playScene("broke", s, io);
  }
  function gpaAvg(s) {
    if (!s.gpas.length) return 0;
    return Math.round((s.gpas.reduce((a, b) => a + b, 0) / s.gpas.length) * 100) / 100;
  }
  function rankOf(g) {
    if (g >= 3.7) return "专业前 5%";
    if (g >= 3.4) return "专业前 20%";
    if (g >= 3.0) return "中上";
    if (g >= 2.5) return "中游";
    if (g >= 2.0) return "中下";
    return "岌岌可危";
  }

  // 每个节拍结束后检查：心情或体魄太低，会触发“低谷”（每学年一次），有人会来找你
  async function checkCrisis(s, io) {
    const y = year(s);
    if (s.stats.mood <= 12 && !s.crises["mood" + y]) {
      s.crises["mood" + y] = 1;
      await playScene("crisis_mood", s, io);
    } else if (s.stats.body <= 12 && !s.crises["body" + y]) {
      s.crises["body" + y] = 1;
      await playScene("crisis_body", s, io);
    }
  }

  /* ---------- 整局 ---------- */
  async function playRun(s, io) {
    while (s.sem < DL.SEMESTERS.length) {
      const sem = DL.SEMESTERS[s.sem];
      while (s.beat < sem.beats.length) {
        io.save(clone(s));
        await playBeat(sem.beats[s.beat], s, io);
        await checkCrisis(s, io);
        s.beat++;
      }
      s.beat = 0;
      s.sem++;
    }
    s.done = true;
    const ending = DL.computeEnding(s);
    s.ending = { path: ending.path.id, title: ending.title.id };
    io.save(clone(s));
    await io.epilogue(ending, s);
    return ending;
  }

  Object.assign(DL, {
    rand, randInt, pickOne, clamp, newState, clone, fmt, applyFx, test, run, playScene, playRun,
    gpaAvg, year, currentSeason, STAT_NAMES, FAMILY, LIVING_COST, mergeChanges,
  });
})(typeof window !== "undefined" ? window : globalThis);
