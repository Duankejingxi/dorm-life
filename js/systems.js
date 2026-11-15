/* 宿舍人生 · 玩法系统：天赋、关系等级、奖学金 / 体测、学期预测、成就
 * 纯逻辑，可在 Node 里测试 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});

  /* ======================= 天赋 ======================= */
  // rarity: gold 金 / purple 紫 / blue 蓝；mul 是对正向（或负向）变化的倍率
  const TALENTS = [
    { id: "memory", r: "gold", icon: "🧠", name: "过目不忘", desc: "学业的所有提升 ×1.35", mul: { study: 1.35 } },
    { id: "koi", r: "gold", icon: "🎏", name: "锦鲤附体", desc: "考试、面试、升学的运气大幅提升", luck: 10 },
    { id: "allround", r: "gold", icon: "🌟", name: "万事通", desc: "履历的所有提升 ×1.4", mul: { exp: 1.4 } },
    { id: "genius", r: "gold", icon: "📐", name: "学霸基因", desc: "开局学业 +18", start: { study: 18 } },
    { id: "grind", r: "purple", icon: "🔥", name: "卷王", desc: "备考的所有提升 ×1.35", mul: { prep: 1.35 } },
    { id: "social", r: "purple", icon: "🎤", name: "社交牛人", desc: "和室友的好感提升 ×1.3", relMul: { jiang: 1.3, su: 1.3, xu: 1.3 } },
    { id: "romantic", r: "purple", icon: "💌", name: "恋爱脑", desc: "和林溪的好感提升 ×1.6", relMul: { lin: 1.6 } },
    { id: "sunny", r: "purple", icon: "☀️", name: "天生乐观", desc: "心情的下降减半", loss: { mood: 0.5 } },
    { id: "hustle", r: "purple", icon: "💼", name: "打工皇帝", desc: "所有收入 ×1.3", mul: { money: 1.3 } },
    { id: "hands", r: "purple", icon: "🎯", name: "手感火热", desc: "所有小游戏的成绩 +15%", game: 0.15 },
    { id: "iron", r: "blue", icon: "🛡️", name: "铁打的身体", desc: "体魄的下降减半", loss: { body: 0.5 } },
    { id: "thrifty", r: "blue", icon: "🧾", name: "会过日子", desc: "每月开销少 ¥320", living: 0.8 },
    { id: "redpacket", r: "blue", icon: "🧧", name: "压岁钱存折", desc: "开局存款 +¥6000", start: { money: 6000 } },
    { id: "baller", r: "blue", icon: "🏀", name: "篮球少年", desc: "开局体魄 +15，江野好感 +12", start: { body: 15 }, rel: { jiang: 12 } },
    { id: "artsy", r: "blue", icon: "🎸", name: "文艺青年", desc: "许多好感 +12，林溪好感 +8", rel: { xu: 12, lin: 8 } },
    { id: "honest", r: "blue", icon: "🌾", name: "老实人", desc: "苏念好感 +12，周老师好感 +10", rel: { su: 12, zhou: 10 } },
    { id: "chill", r: "blue", icon: "🍵", name: "心大", desc: "期末周不焦虑：考后心情不下降", noExamStress: true },
    { id: "athlete", r: "blue", icon: "🏃", name: "运动神经", desc: "体测必过，开局体魄 +8", start: { body: 8 }, fitness: true },
  ];
  const RARITY = { gold: { name: "传说", w: 1 }, purple: { name: "稀有", w: 3 }, blue: { name: "普通", w: 6 } };
  const T = Object.fromEntries(TALENTS.map((t) => [t.id, t]));
  const has = (s, id) => !!(s.talents && s.talents.includes(id));
  const talentsOf = (s) => (s.talents || []).map((id) => T[id]).filter(Boolean);

  // 抽 n 张不重复的天赋（按稀有度加权）
  function drawTalents(n, rnd) {
    rnd = rnd || Math.random;
    const pool = TALENTS.slice();
    const out = [];
    while (out.length < n && pool.length) {
      const total = pool.reduce((a, t) => a + RARITY[t.r].w, 0);
      let r = rnd() * total;
      let i = 0;
      for (; i < pool.length; i++) { r -= RARITY[pool[i].r].w; if (r <= 0) break; }
      out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
    }
    return out;
  }

  function applyStartTalents(s) {
    for (const t of talentsOf(s)) {
      if (t.start) for (const k in t.start) s.stats[k] = k === "money" ? s.stats[k] + t.start[k] : Math.min(100, s.stats[k] + t.start[k]);
      if (t.rel) for (const k in t.rel) s.rel[k] = Math.min(100, s.rel[k] + t.rel[k]);
    }
  }
  // 引擎在 applyFx 里调用：按天赋调整一项变化
  function adjustStat(s, k, d) {
    if (!s.talents || !d) return d;
    for (const t of talentsOf(s)) {
      if (d > 0 && t.mul && t.mul[k]) d = d * t.mul[k];
      if (d < 0 && t.loss && t.loss[k]) d = d * t.loss[k];
    }
    return Math.round(d);
  }
  function adjustRel(s, who, d) {
    if (!s.talents || d <= 0) return d;
    for (const t of talentsOf(s)) if (t.relMul && t.relMul[who]) d = d * t.relMul[who];
    return Math.round(d);
  }
  const luck = (s) => talentsOf(s).reduce((a, t) => a + (t.luck || 0), 0);
  const gameBonus = (s) => talentsOf(s).reduce((a, t) => a + (t.game || 0), 0);
  const livingFactor = (s) => talentsOf(s).reduce((a, t) => a * (t.living || 1), 1);

  /* ======================= 关系等级 ======================= */
  const LEVELS = ["陌生", "认识", "朋友", "好友", "挚友"];
  const levelOf = (v) => (v >= 80 ? 4 : v >= 60 ? 3 : v >= 40 ? 2 : v >= 20 ? 1 : 0);

  /* ======================= 奖学金 / 体测 ======================= */
  function scholarship(gpa) {
    if (gpa >= 3.7) return { tier: 1, name: "一等奖学金", amount: 5000 };
    if (gpa >= 3.45) return { tier: 2, name: "二等奖学金", amount: 3000 };
    if (gpa >= 3.2) return { tier: 3, name: "三等奖学金", amount: 1500 };
    return null;
  }
  const FITNESS_LINE = 50;
  const fitnessPass = (s) => has(s, "athlete") || s.stats.body >= FITNESS_LINE;

  /* ======================= 学期预测 ======================= */
  // 根据当前状态 + 已选的安排，预测这学期结束时的状态和绩点区间
  function previewPlan(s, ids) {
    const t = DL.clone(s);
    if (ids && ids.length) DL.applyPlan(t, ids);
    const st = t.stats;
    let g = 1.3 + (st.study / 100) * 2.75;
    if (st.mood < 25) g -= 0.25;
    if (st.body < 25) g -= 0.2;
    const lo = Math.max(0.8, g - 0.2), hi = Math.min(4, g + 0.2 + 0.25);
    const warn = [];
    if (st.body <= 18) warn.push("体魄会降到 " + st.body + "，可能病倒");
    if (st.mood <= 18) warn.push("心情会降到 " + st.mood + "，可能撑不住");
    if (st.study < 30) warn.push("学业只有 " + st.study + "，可能挂科");
    const living = Math.round(DL.LIVING_COST * livingFactor(s));
    if (st.money - living < 0) warn.push("学期末存款可能不够付生活费");
    if (s.sem % 2 === 0 && !has(s, "athlete") && st.body < FITNESS_LINE) warn.push("体魄低于 " + FITNESS_LINE + "，体测可能不过");
    const sch = scholarship(hi);
    return { stats: st, rel: t.rel, gpaLo: Math.round(lo * 100) / 100, gpaHi: Math.round(hi * 100) / 100, scholarship: sch, warn };
  }

  /* ======================= 成就 ======================= */
  const g = (s, k) => (s.flags["g_" + k] != null ? s.flags["g_" + k] : -1);
  const ACH = [
    { id: "first_night", icon: "🚪", name: "404 的第一晚", desc: "推开 404 的门", test: (s) => s.seen.y1a_arrival },
    { id: "stand", icon: "🪖", name: "站如松", desc: "军训站军姿拿到 85% 以上", test: (s) => g(s, "stand") >= 0.85 },
    { id: "rush", icon: "⚡", name: "手速王", desc: "抢课拿到 80% 以上", test: (s) => g(s, "rush") >= 0.8 },
    { id: "umbrella", icon: "☂️", name: "伞往一边歪", desc: "雨夜里没让林溪淋到一点雨", test: (s) => g(s, "umbrella") >= 0.8 },
    { id: "shoot", icon: "🏀", name: "神投手", desc: "陪江野投篮，五投四中以上", test: (s) => g(s, "shoot") >= 0.8 },
    { id: "clutch", icon: "🎯", name: "最后一投", desc: "决赛前夜，帮江野投进那一个", test: (s) => g(s, "clutch") >= 0.5 },
    { id: "rhythm", icon: "🎸", name: "舞台中央", desc: "毕业晚会演出拿到 85% 以上", test: (s) => g(s, "rhythm") >= 0.85 },
    { id: "run", icon: "🥇", name: "第一块金牌", desc: "1500 米跑出好成绩", test: (s) => g(s, "run") >= 0.75 },
    { id: "quiz", icon: "💡", name: "反应最快的人", desc: "抢答拿到 85% 以上", test: (s) => g(s, "quiz") >= 0.85 },
    { id: "cram", icon: "📖", name: "考前一夜", desc: "考前冲刺满分", test: (s) => (s.flags.cramBest || 0) >= 0.95 },
    { id: "sch1", icon: "🥇", name: "一等奖学金", desc: "拿到一次一等奖学金", test: (s) => (s.flags.sch1 || 0) >= 1 },
    { id: "sch3x", icon: "💰", name: "奖学金专业户", desc: "拿到三次以上奖学金", test: (s) => (s.flags.schCount || 0) >= 3 },
    { id: "fail", icon: "📉", name: "人生第一次挂科", desc: "挂了一门课", test: (s) => s.fails >= 1 },
    { id: "broke", icon: "🍜", name: "月底吃土", desc: "存款见底", test: (s) => s.seen.broke },
    { id: "rich", icon: "🏦", name: "小金库", desc: "存款超过 ¥40000", test: (s) => s.stats.money >= 40000 },
    { id: "bestie", icon: "🤝", name: "挚友", desc: "和一个人成为挚友", test: (s) => Object.values(s.rel).some((v) => v >= 80) },
    { id: "glue", icon: "🧡", name: "404 的粘合剂", desc: "和三个室友都成为挚友", test: (s) => ["jiang", "su", "xu"].every((k) => s.rel[k] >= 80) },
    { id: "snow", icon: "❄️", name: "初雪", desc: "在第一场雪里，和林溪在一起", test: (s) => s.flags.togetherAt === "snow" },
    { id: "watch", icon: "🏥", name: "守夜人", desc: "在医院走廊坐了一整夜", test: (s) => s.flags.nightWatch },
    { id: "rehab", icon: "🌅", name: "凌晨六点", desc: "陪江野复健两个学期以上", test: (s) => (s.flags.rehabDays || 0) >= 2 },
    { id: "su", icon: "💡", name: "楼梯间的灯", desc: "让苏念留在了学校", test: (s) => s.flags.suStayed },
    { id: "fest", icon: "🚄", name: "搬音箱的人", desc: "期末周跟许多去了音乐节", test: (s) => s.flags.wentFest },
    { id: "dad", icon: "✉️", name: "送出那条消息", desc: "许多的爸爸来看了演出", test: (s) => s.flags.dadCame },
    { id: "low", icon: "🌧️", name: "有人拉开了床帘", desc: "熬过一段很糟的日子", test: (s) => s.seen.crisis_mood },
    { id: "sick", icon: "🤒", name: "原来身体会累坏", desc: "病倒过一次", test: (s) => s.seen.crisis_body },
    { id: "fit", icon: "🏅", name: "体测全勤", desc: "四次体测全部通过", test: (s) => (s.flags.fitPass || 0) >= 4 },
    { id: "mem12", icon: "📷", name: "收藏家", desc: "一局里收集 15 段回忆", test: (s) => s.memories.length >= 15 },
    { id: "landed", icon: "🎓", name: "上岸", desc: "考研、保研或考公成功", test: (s) => s.flags.result && s.flags.result.ok && /kaoyan|baoyan|gongwu/.test(s.flags.result.id) },
    { id: "follow", icon: "🏠", name: "撑伞的人", desc: "毕业后和林溪去了同一座城市", test: (s) => s.flags.linFollow },
    { id: "reunion", icon: "🔑", name: "四个人", desc: "十年后，404 一个都没少", test: (s) => s.done && ["jiang", "su", "xu"].every((k) => s.rel[k] >= 62) },
    { id: "gold", icon: "✨", name: "天选之人", desc: "抽到一张传说天赋", test: (s) => talentsOf(s).some((t) => t.r === "gold") },
    { id: "gold2", icon: "🌈", name: "欧皇", desc: "同时带着两张传说天赋入学", test: (s) => talentsOf(s).filter((t) => t.r === "gold").length >= 2 },
  ];
  function checkAchievements(s) {
    s.ach = s.ach || [];
    const got = [];
    for (const a of ACH) {
      if (s.ach.includes(a.id)) continue;
      let ok = false;
      try { ok = !!a.test(s); } catch (e) { ok = false; }
      if (ok) { s.ach.push(a.id); got.push(a); }
    }
    return got;
  }

  Object.assign(DL, {
    TALENTS, RARITY, drawTalents, applyStartTalents, adjustStat, adjustRel, hasTalent: has, talentsOf, luck, gameBonus, livingFactor,
    LEVELS, levelOf, scholarship, fitnessPass, FITNESS_LINE, previewPlan, ACH, checkAchievements,
  });
})(typeof window !== "undefined" ? window : globalThis);
