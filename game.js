// 宿舍人生 · 游戏逻辑 v1.1
// 8 个学期，每学期：1 个行动 + 1 个大事件（可能是连锁剧情的一环）+ 2 件随机小事
// 属性：健康/智力/魅力/快乐/人脉（0-100）、金钱（可负）、学分（只增不减为负时归零）
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SEMESTERS = ["大一上", "大一下", "大二上", "大二下", "大三上", "大三下", "大四上", "大四下"];
  const ENDINGS_KEY = "dorm-life-endings-v1";
  const ACHIEVE_KEY = "dorm-life-achievements-v1";
  const GAMES_KEY = "dorm-life-games-v1";
  const TOTAL_ENDINGS = 56;
  // v1.3：每学期 8 个遭遇，穿插进行：行动 → 大事件 → 行动 → 小事 → 行动 → 大事件 → 小事 → 小事
  const STEP_QUEUE = ["action", "big", "action", "micro", "action", "big", "micro", "micro"];
  const ACTIONS_PER_SEMESTER = 3;

  let state = null; // { name, semester, health, iq, charm, money, happy, connections, credits, log[], over, endingId }
  let flags = null; // 本局标记：actionCounts, eventsSeen[], microsSeen, chainsCompleted, lotteryWin, wasBroke, wasInDebt, lowHealth, completedGame, comeback
  let currentEvent = null; // 当前展示的事件（大事件 / 连锁一环 / 小事）
  let currentKind = null; // "big" | "chain" | "micro"
  let usedEventIds = [];
  let usedMicroIds = [];
  let startedChains = [];
  let completedChains = [];
  let activeChain = null; // { id, part } 下一环
  let stepIndex = 0; // 本学期走到第几个遭遇（STEP_QUEUE）
  let actionsDone = 0; // 本学期已选的行动数（3 个封顶）
  let forcedEventId = null;
  let forcedMicroId = null;
  let forcedChainId = null;
  let pendingAchievements = []; // 本学期新解锁的成就，等结果框一起展示
  // v1.4：开局选择（默认小康 + 普通人 = 以前的开局数值）
  let pickedBackground = "middle";
  let pickedTalent = "normal";
  // v1.5：开局社团（默认不参加 = 无加成，和以前一样）
  let pickedClub = "none";
  // v1.6：开局兼职（默认不打工 = 无收入，和以前一样）
  let pickedJob = "none";
  let breakShown = {}; // 哪几个学期后的假期已安排过（key 是刚打完的学期号）

  function loadEndings() {
    try { return JSON.parse(localStorage.getItem(ENDINGS_KEY) || "[]") || []; }
    catch (e) { return []; }
  }
  function saveEnding(id) {
    const list = loadEndings();
    if (list.indexOf(id) === -1) { list.push(id); try { localStorage.setItem(ENDINGS_KEY, JSON.stringify(list)); } catch (e) { /* 忽略 */ } }
  }
  function loadAchievements() {
    try { return JSON.parse(localStorage.getItem(ACHIEVE_KEY) || "[]") || []; }
    catch (e) { return []; }
  }
  function loadGamesPlayed() {
    try { return parseInt(localStorage.getItem(GAMES_KEY) || "0", 10) || 0; }
    catch (e) { return 0; }
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // 应用一组属性变化；variance 是属性点的随机浮动，moneyVariance 是金钱的浮动（元）
  function applyEffects(effects, variance, moneyVariance) {
    Object.keys(effects).forEach((k) => {
      const base = effects[k];
      const v = k === "money"
        ? base + (moneyVariance ? Math.round((Math.random() * 2 - 1) * moneyVariance) : 0)
        : base + (variance ? Math.round((Math.random() * 2 - 1) * variance) : 0);
      if (k === "money") state.money += v;
      else if (k === "credits") state.credits = Math.max(0, state.credits + v);
      else state[k] = clamp(state[k] + v, 0, 100);
    });
    if (state.money <= 0) flags.wasBroke = true;
    if (state.money <= -200) flags.wasInDebt = true;
    if (state.health <= 20) flags.lowHealth = true;
    renderStats();
    checkAchievements();
  }

  function applyRel(rel) {
    if (!rel) return;
    Object.keys(rel).forEach((id) => {
      if (state.rel[id] === undefined) state.rel[id] = 0;
      state.rel[id] = clamp(state.rel[id] + rel[id], 0, 100);
    });
    renderRel();
  }

  function renderRel() {
    NPCS.forEach((n) => {
      const v = state.rel[n.id] || 0;
      const bar = $("relBar-" + n.id);
      const num = $("relNum-" + n.id);
      if (bar) bar.style.width = v + "%";
      if (num) num.textContent = v;
    });
  }

  function buildRelPanel() {
    const panel = $("relPanel");
    if (!panel || panel.children.length > 0) return;
    NPCS.forEach((n) => {
      const row = document.createElement("div");
      row.className = "stat-row rel-row";
      const label = document.createElement("span");
      label.className = "stat-label";
      label.textContent = n.name + " · " + n.role;
      const barWrap = document.createElement("div");
      barWrap.className = "stat-bar";
      const fill = document.createElement("div");
      fill.className = "stat-fill rel";
      fill.id = "relBar-" + n.id;
      fill.style.width = n.start + "%";
      barWrap.appendChild(fill);
      const num = document.createElement("span");
      num.className = "stat-num";
      num.id = "relNum-" + n.id;
      num.textContent = n.start;
      row.appendChild(label);
      row.appendChild(barWrap);
      row.appendChild(num);
      panel.appendChild(row);
    });
  }

  function semName() { return SEMESTERS[state.semester - 1]; }
  function yearOf() { return Math.ceil(state.semester / 2); } // 1-4

  function addLog(text) {
    state.log.push({ sem: semName(), text });
    const div = document.createElement("div");
    div.className = "log-item";
    const tag = document.createElement("span");
    tag.className = "log-tag";
    tag.textContent = semName();
    const body = document.createElement("span");
    body.textContent = text;
    div.appendChild(tag);
    div.appendChild(body);
    $("logList").appendChild(div);
  }

  function renderStats() {
    const set = (barId, numId, v) => {
      $(barId).style.width = clamp(v, 0, 100) + "%";
      $(numId).textContent = v;
    };
    set("barHealth", "numHealth", state.health);
    set("barIq", "numIq", state.iq);
    set("barCharm", "numCharm", state.charm);
    set("barHappy", "numHappy", state.happy);
    set("barConnections", "numConnections", state.connections);
    $("numMoney").textContent = (state.money >= 0 ? "¥" : "-¥") + Math.abs(state.money);
    $("numCredits").textContent = state.credits;
    $("semLabel").textContent = semName() + " · 第 " + state.semester + " / 8 学期";
  }

  function renderEndingsCount() {
    const list = loadEndings();
    const text = "结局图鉴：" + list.length + " / " + TOTAL_ENDINGS + " 已解锁";
    $("endingsCount").textContent = text;
    $("endingsCount2").textContent = text;
    const renderList = (el) => {
      el.innerHTML = "";
      ENDINGS.forEach((e) => {
        const chip = document.createElement("span");
        chip.className = "ending-chip" + (list.indexOf(e.id) !== -1 ? "" : " locked");
        chip.textContent = list.indexOf(e.id) !== -1 ? e.emoji + " " + e.title : "？？？";
        el.appendChild(chip);
      });
    };
    renderList($("endingsList"));
    renderList($("endingsList2"));
  }

  function renderAchievements() {
    const list = loadAchievements();
    $("achieveCount").textContent = "成就：" + list.length + " / " + ACHIEVEMENTS.length + " 已解锁";
    const el = $("achieveList");
    el.innerHTML = "";
    ACHIEVEMENTS.forEach((a) => {
      const chip = document.createElement("span");
      chip.className = "achieve-chip" + (list.indexOf(a.id) !== -1 ? "" : " locked");
      chip.textContent = list.indexOf(a.id) !== -1 ? a.name : "？？？";
      el.appendChild(chip);
    });
  }

  // 检查成就：新解锁的记下来，等结果框一起展示
  function checkAchievements() {
    if (!state || !flags) return;
    const unlocked = loadAchievements();
    const f = Object.assign({}, flags, {
      endingsCount: loadEndings().length,
      gamesPlayed: loadGamesPlayed(),
    });
    ACHIEVEMENTS.forEach((a) => {
      if (unlocked.indexOf(a.id) !== -1) return;
      let ok = false;
      try { ok = a.check(state, f); } catch (e) { ok = false; }
      if (ok) {
        unlocked.push(a.id);
        pendingAchievements.push(a);
        try { localStorage.setItem(ACHIEVE_KEY, JSON.stringify(unlocked)); } catch (e) { /* 忽略 */ }
      }
    });
  }

  function showScreen(which) {
    ["startScreen", "gameScreen", "endingScreen"].forEach((id) => {
      $(id).classList.toggle("hidden", id !== which);
    });
  }

  function startGame(name) {
    const rel0 = {};
    NPCS.forEach((n) => { rel0[n.id] = n.start; });
    state = {
      name: (name || "").trim() || "你",
      semester: 1, health: 70, iq: 60, charm: 60, money: 500, happy: 70, connections: 60, credits: 0,
      rel: rel0,
      log: [], over: false, endingId: null, inLove: null,
      background: pickedBackground, talent: pickedTalent, club: pickedClub, job: pickedJob,
    };
    // v1.4：开局家境 + 天赋加成（默认小康 + 普通人 = 无加成，和以前一样）
    // v1.5：开局社团加成（默认不参加 = 无加成）
    const bg = BACKGROUNDS.find((b) => b.id === pickedBackground);
    const tl = TALENTS.find((t) => t.id === pickedTalent);
    const cl = CLUBS.find((c) => c.id === pickedClub);
    [bg, tl, cl].forEach((src) => {
      if (!src) return;
      Object.keys(src.effects).forEach((k) => {
        if (k === "money") state.money += src.effects[k];
        else if (k === "credits") state.credits = Math.max(0, state.credits + src.effects[k]);
        else state[k] = clamp(state[k] + src.effects[k], 0, 100);
      });
    });
    breakShown = {};
    flags = {
      actionCounts: {}, eventsSeen: [], microsSeen: 0, chainsCompleted: 0,
      lotteryWin: false, wasBroke: false, wasInDebt: false, lowHealth: false,
      completedGame: false, comeback: false,
    };
    usedEventIds = [];
    usedMicroIds = [];
    startedChains = [];
    completedChains = [];
    activeChain = null;
    pendingAchievements = [];
    try { localStorage.setItem(GAMES_KEY, String(loadGamesPlayed() + 1)); } catch (e) { /* 忽略 */ }
    $("logList").innerHTML = "";
    renderStats();
    renderRel();
    renderEndingsCount();
    renderAchievements();
    showScreen("gameScreen");
    startSemester();
    const bgName = bg ? bg.name : "", tlName = tl ? tl.name : "", clName = cl ? cl.name : "";
    const jb = JOBS.find((j) => j.id === pickedJob);
    const jbName = jb ? jb.name : "";
    addLog(state.name + "入学了，住进了宿舍，大学四年开始了。（家境：" + bgName + " · 天赋：" + tlName + " · 社团：" + clName + " · 兼职：" + jbName + "）");
  }

  // v1.6：每学期初发兼职工资（第 1 学期不发，刚入学还没开工）
  function payJob() {
    if (!state || !state.job || state.job === "none") return;
    const jb = JOBS.find((j) => j.id === state.job);
    if (!jb || !jb.effects) return;
    applyEffects(jb.effects, 0);
    addLog("💰 兼职发工资了：" + jb.name + "，到手 ¥" + (jb.effects.money || 0) + "。");
  }

  function startSemester() {
    stepIndex = 0;
    actionsDone = 0;
    if (state.semester > 1) payJob(); // 第 2 学期起，每学期初发工资
    advanceStep();
  }

  function advanceStep(resultText) {
    if (stepIndex >= STEP_QUEUE.length) { showSemesterEnd(resultText); return; }
    const kind = STEP_QUEUE[stepIndex];
    if (kind === "action") showActionPhase();
    else if (kind === "big") drawEvent();
    else drawMicroEvent();
  }

  function showActionPhase() {
    $("actionBox").classList.remove("hidden");
    $("eventCard").classList.add("hidden");
    $("resultBox").classList.add("hidden");
    $("shopPanel").classList.add("hidden");
    $("actionHint").textContent = semName() + "，选一个行动（已选 " + actionsDone + "/" + ACTIONS_PER_SEMESTER + "）。";
  }

  function doAction(actionId) {
    const a = ACTIONS.find((x) => x.id === actionId);
    if (!a || state.over) return;
    // v1.5：社团活动——没加社团点这个不消耗行动；加了按社团给不同加成
    if (a.clubAction) {
      if (!state.club || state.club === "none") {
        addLog("你还没加入社团。开局选一个社团，才能参加社团活动。（这次不算行动）");
        return;
      }
      const ca = CLUB_ACTIVITY[state.club];
      if (!ca) return;
      flags.actionCounts[actionId] = (flags.actionCounts[actionId] || 0) + 1;
      applyEffects(ca.effects, ca.variance);
      addLog(ca.log[Math.floor(Math.random() * ca.log.length)]);
      actionsDone++;
      stepIndex++;
      $("actionBox").classList.add("hidden");
      if (checkEarlyEnding()) return;
      advanceStep();
      return;
    }
    // v1.7：宿舍夜聊——随机挑一个人，关系 +6、快乐 +3
    if (a.nightchat) {
      const npc = NPCS[Math.floor(Math.random() * NPCS.length)];
      flags.actionCounts[actionId] = (flags.actionCounts[actionId] || 0) + 1;
      applyEffects({ happy: 3 }, 1);
      const relPatch = {};
      relPatch[npc.id] = 6;
      applyRel(relPatch);
      addLog("熄灯后，你和" + npc.name + "夜聊到半夜，聊了好多心里话，关系更铁了。（" + npc.name + " 关系 +6）");
      actionsDone++;
      stepIndex++;
      $("actionBox").classList.add("hidden");
      if (checkEarlyEnding()) return;
      advanceStep();
      return;
    }
    // v1.8：表白——向关系最好的那个人表白；关系 ≥80 成功（快乐 +10，记下恋爱对象），否则失败（快乐 -5，那个人关系 -3）
    if (a.confess) {
      let best = null, bestRel = -1;
      NPCS.forEach((n) => {
        const r = (state.rel && state.rel[n.id]) || 0;
        if (r > bestRel) { bestRel = r; best = n; }
      });
      flags.actionCounts[actionId] = (flags.actionCounts[actionId] || 0) + 1;
      if (best && bestRel >= 80) {
        state.inLove = best.id;
        applyEffects({ happy: 10 }, 1);
        addLog("💌 你向" + best.name + "表白了，TA 答应了！你们在一起了。（快乐 +10）");
      } else if (best) {
        applyEffects({ happy: -5 }, 1);
        const relPatch = {};
        relPatch[best.id] = -3;
        applyRel(relPatch);
        addLog("💔 你向" + best.name + "表白了，TA 说还是做朋友吧……（快乐 -5，" + best.name + " 关系 -3）");
      }
      actionsDone++;
      stepIndex++;
      $("actionBox").classList.add("hidden");
      if (checkEarlyEnding()) return;
      advanceStep();
      return;
    }
    flags.actionCounts[actionId] = (flags.actionCounts[actionId] || 0) + 1;
    applyEffects(a.effects, a.variance, a.moneyVariance);
    applyRel(a.rel);
    addLog(a.log[Math.floor(Math.random() * a.log.length)]);
    actionsDone++;
    stepIndex++;
    $("actionBox").classList.add("hidden");
    if (checkEarlyEnding()) return;
    advanceStep();
  }

  // ---- v1.3：商店（花钱买东西，买一次算一个行动）----
  const shopBtns = {}; // itemId -> 购买按钮
  let shopBuilt = false; // 面板里已有标题/提示两行静态元素，不能用 children.length 判断是否建过
  function buildShop() {
    const panel = $("shopPanel");
    if (!panel || shopBuilt) return;
    shopBuilt = true;
    SHOP_ITEMS.forEach((item) => {
      const row = document.createElement("div");
      row.className = "shop-row";
      const info = document.createElement("span");
      info.className = "shop-info";
      info.textContent = item.icon + " " + item.name + " · ¥" + item.price + " — " + item.desc;
      const btn = document.createElement("button");
      btn.className = "btn gold-btn small";
      btn.textContent = "买";
      btn.setAttribute("data-shop", item.id);
      btn.addEventListener("click", () => buyItem(item.id));
      shopBtns[item.id] = btn;
      row.appendChild(info);
      row.appendChild(btn);
      panel.appendChild(row);
    });
    const back = document.createElement("button");
    back.className = "btn ghost-btn small";
    back.textContent = "← 返回，不买了";
    back.addEventListener("click", () => { $("shopPanel").classList.add("hidden"); $("actionBox").classList.remove("hidden"); });
    panel.appendChild(back);
  }
  function showShop() {
    buildShop();
    $("actionBox").classList.add("hidden");
    $("shopPanel").classList.remove("hidden");
    $("shopMsg").textContent = "";
    // 钱不够的商品变灰
    SHOP_ITEMS.forEach((item) => {
      if (shopBtns[item.id]) shopBtns[item.id].disabled = state.money < item.price;
    });
  }
  function buyItem(itemId) {
    const item = SHOP_ITEMS.find((x) => x.id === itemId);
    if (!item || state.over) return;
    if (state.money < item.price) { $("shopMsg").textContent = "钱不够，买不起「" + item.name + "」（¥" + item.price + "）。"; return; }
    applyEffects(item.effects, 0);
    addLog(item.log);
    $("shopPanel").classList.add("hidden");
    actionsDone++;
    stepIndex++;
    if (checkEarlyEnding()) return;
    advanceStep();
  }

  // 连锁剧情的一环拼成一个“事件”对象
  function chainEvent(chainId, part) {
    const chain = CHAINS.find((c) => c.id === chainId);
    const p = chain.parts[part - 1];
    return {
      id: "chain-" + chainId + "-" + part,
      title: "🔗 " + chain.title + "（第 " + part + "/3 环）",
      text: p.text,
      choices: p.choices,
      chain: { id: chainId, part },
    };
  }

  function pickRandomEvent() {
    const year = yearOf();
    // 大事件池：按学年过滤、排除最近用过的；再加未开始的连锁第 1 环
    // v1.6：兼职专属事件只刷自己那份兼职的（没打工的刷不到）
    let pool = EVENTS.filter((e) => (!e.year || e.year === year) && (!e.club || e.club === (state && state.club)) && (!e.job || e.job === (state && state.job)) && usedEventIds.indexOf(e.id) === -1);
    CHAINS.forEach((c) => {
      if (startedChains.indexOf(c.id) === -1 && completedChains.indexOf(c.id) === -1) {
        pool.push(chainEvent(c.id, 1));
      }
    });
    if (pool.length === 0) { usedEventIds = []; pool = EVENTS.filter((e) => !e.year || e.year === year); }
    if (pool.length === 0) pool = EVENTS.slice();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function pickRandomMicro() {
    let pool = MICRO_EVENTS.filter((e) => usedMicroIds.indexOf(e.id) === -1);
    if (pool.length === 0) { usedMicroIds = []; pool = MICRO_EVENTS.slice(); }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // v1.3：按事件标题/文案里的关键词配场景图（宿舍/教室/食堂/校园）
  function sceneFor(ev) {
    // v1.3：按关键词在标题+正文里第一次出现的位置定场景（标题优先，正文里先提到的地点为准）
    // 比如“食堂新开麻辣烫”正文提到“香味飘到了宿舍楼”，但“食堂”先出现 → 食堂
    // v1.4：加图书馆和操场两张图
    const text = (ev.title || "") + " " + (ev.text || "");
    const groups = [
      ["dorm", /宿舍|室友|阿强|床|被子|寝室|打呼|停水|停电|开黑|夜聊|查寝|洗澡|晾衣/],
      ["classroom", /上课|老师|导师|考试|四级|六级|论文|自习|课堂|讲座|选修|期中|期末|答辩|考研|保研|学霸/],
      ["canteen", /食堂|麻辣烫|吃饭|外卖|奶茶|鸡腿|饭卡|泡面|早餐|夜宵|水果|零食/],
      ["library", /图书馆|借书|看书|书架|阅览/],
      ["playground", /操场|运动会|跑步|球场|篮球|足球|跑道|体测|晨跑/],
      // v1.5：社团活动室（社团招新、演出、排练、部长、会长）
      ["clubroom", /社团|招新|演出|排练|部长|会长|乐队|支教|义卖|解说|队长/],
    ];
    let best = null, bestIdx = Infinity;
    groups.forEach(([scene, re]) => {
      const idx = text.search(re);
      if (idx !== -1 && idx < bestIdx) { bestIdx = idx; best = scene; }
    });
    return best || "campus";
  }

  function showEventCard(ev, kind) {
    currentEvent = ev;
    currentKind = kind;
    const img = $("eventScene");
    if (img && (kind === "big" || kind === "chain") && typeof SCENES !== "undefined" && SCENES[sceneFor(ev)]) {
      img.src = SCENES[sceneFor(ev)];
      img.classList.remove("hidden");
    } else if (img) {
      img.classList.add("hidden");
    }
    $("eventTitle").textContent = (kind === "micro" ? "✨ 小事 · " : "🎲 ") + ev.title;
    $("eventText").textContent = ev.text;
    const box = $("eventChoices");
    box.innerHTML = "";
    ev.choices.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "btn choice-btn";
      b.textContent = c.text;
      b.addEventListener("click", () => chooseEvent(i));
      box.appendChild(b);
    });
    $("eventCard").classList.toggle("micro", kind === "micro");
    $("eventCard").classList.remove("hidden");
  }

  function drawEvent() {
    // v1.3：连锁剧情每学期只推进一环（只在第一个大事件出，第二个大事件是普通事件）
    const isFirstBig = stepIndex === 1;
    let ev;
    if (activeChain && isFirstBig) {
      ev = chainEvent(activeChain.id, activeChain.part);
      showEventCard(ev, "chain");
    } else if (forcedChainId && isFirstBig) {
      ev = chainEvent(forcedChainId, 1);
      forcedChainId = null;
      showEventCard(ev, "chain");
    } else {
      ev = forcedEventId
        ? (EVENTS.find((e) => e.id === forcedEventId) || pickRandomEvent())
        : pickRandomEvent();
      forcedEventId = null;
      showEventCard(ev, ev.chain ? "chain" : "big");
    }
    usedEventIds.push(ev.id);
    if (flags.eventsSeen.indexOf(ev.id) === -1) flags.eventsSeen.push(ev.id);
    if (ev.chain && ev.chain.part === 1) startedChains.push(ev.chain.id);
  }

  function drawMicroEvent() {
    const ev = forcedMicroId
      ? (MICRO_EVENTS.find((e) => e.id === forcedMicroId) || pickRandomMicro())
      : pickRandomMicro();
    forcedMicroId = null;
    usedMicroIds.push(ev.id);
    flags.microsSeen++;
    showEventCard(ev, "micro");
  }

  function chooseEvent(choiceIdx) {
    if (!currentEvent || state.over) return;
    const c = currentEvent.choices[choiceIdx];
    if (!c) return;
    let resultText = c.result || "";
    if (c.odds) {
      // 赌一把：按概率出输赢两种结果
      if (Math.random() < c.odds.chance) {
        applyEffects(c.odds.win, 0);
        resultText = c.odds.winText;
        flags.lotteryWin = true;
      } else {
        applyEffects(c.odds.lose, 0);
        resultText = c.odds.loseText;
      }
      applyEffects(c.effects, 0);
    } else {
      applyEffects(c.effects, 0);
    }
    applyRel(c.rel);
    addLog(resultText);
    // 连锁剧情推进
    if (currentEvent.chain) {
      const ch = currentEvent.chain;
      if (ch.part >= 3) {
        completedChains.push(ch.id);
        flags.chainsCompleted++;
        activeChain = null;
      } else {
        activeChain = { id: ch.id, part: ch.part + 1 };
      }
      checkAchievements();
    }
    $("eventCard").classList.add("hidden");
    if (checkEarlyEnding()) return;
    stepIndex++;
    advanceStep(resultText);
  }

  function showSemesterEnd(resultText) {
    $("resultText").textContent = resultText || "这学期过完了。";
    if (pendingAchievements.length > 0) {
      $("achieveLine").textContent = "🏆 解锁成就：" + pendingAchievements.map((a) => a.name).join("、");
      pendingAchievements = [];
    } else {
      $("achieveLine").textContent = "";
    }
    $("resultBox").classList.remove("hidden");
  }

  function checkEarlyEnding() {
    const id = state.health <= 0 ? "sick" : state.money <= -500 ? "debt" : null;
    if (!id) return false;
    endGame(id);
    return true;
  }

  // ---- v1.4：假期（第 2/4/6 学期末，寒暑假怎么过）----
  function showBreakEvent() {
    const sem = state.semester;
    $("resultBox").classList.add("hidden");
    $("actionBox").classList.add("hidden");
    const img = $("eventScene");
    if (img && typeof SCENES !== "undefined" && SCENES.campus) {
      img.src = SCENES.campus;
      img.classList.remove("hidden");
    }
    $("eventTitle").textContent = "☀️ 寒暑假到了";
    $("eventText").textContent = "第 " + sem + " 学期打完了，假期怎么过？选一个。";
    const box = $("eventChoices");
    box.innerHTML = "";
    BREAK_CHOICES.forEach((c) => {
      const b = document.createElement("button");
      b.className = "btn choice-btn";
      b.textContent = c.icon + " " + c.name + " — " + c.desc;
      b.addEventListener("click", () => chooseBreak(c.id));
      box.appendChild(b);
    });
    $("eventCard").classList.remove("hidden");
  }
  function chooseBreak(choiceId) {
    const c = BREAK_CHOICES.find((x) => x.id === choiceId);
    if (!c || state.over) return;
    applyEffects(c.effects, 0);
    addLog(c.log);
    breakShown[state.semester] = true;
    $("eventCard").classList.add("hidden");
    if (checkEarlyEnding()) return;
    state.semester++;
    if (state.semester > 8) { endGame(judgeEnding(state)); return; }
    renderStats();
    startSemester();
  }

  function nextSemester() {
    if (state.over) return;
    // v1.4：第 2/4/6 学期末先过假期，再进下一学期
    if ((state.semester === 2 || state.semester === 4 || state.semester === 6) && !breakShown[state.semester]) {
      showBreakEvent();
      return;
    }
    state.semester++;
    if (state.semester > 8) { endGame(judgeEnding(state)); return; }
    renderStats();
    startSemester();
  }

  function endGame(endingId) {
    state.over = true;
    state.endingId = endingId;
    const e = ENDINGS.find((x) => x.id === endingId);
    // 正常毕业才算“顺利毕业”；曾经跌入谷底又拿下顶级结局算“逆袭”
    if (state.semester > 8) flags.completedGame = true;
    const topEndings = ["baoyan", "kaoyan", "dachang", "phd", "startup", "abroad", "civil"];
    if ((flags.wasBroke || flags.wasInDebt || flags.lowHealth) && topEndings.indexOf(endingId) !== -1) {
      flags.comeback = true;
    }
    checkAchievements();
    saveEnding(endingId);
    $("endingEmoji").textContent = e.emoji;
    $("endingTitle").textContent = e.title;
    const eimg = $("endingScene");
    if (eimg && typeof SCENES !== "undefined" && SCENES.campus) { eimg.src = SCENES.campus; eimg.classList.remove("hidden"); }
    $("endingDesc").textContent = state.name + "的大学四年结束了。" + e.desc;
    $("endingStats").textContent = "最终属性：健康 " + state.health + " · 智力 " + state.iq + " · 魅力 " + state.charm +
      " · 快乐 " + state.happy + " · 人脉 " + state.connections + " · 金钱 ¥" + state.money + " · 学分 " + state.credits +
      " · 阿强 " + (state.rel.aqiang || 0) + " · 小美 " + (state.rel.xiaomei || 0) + " · 学长 " + (state.rel.xuezhang || 0) + " · 导师 " + (state.rel.daoshi || 0);
    // 人生回顾：把 8 个学期的记录搬到结局页
    const elog = $("endingLog");
    elog.innerHTML = "";
    state.log.forEach((item) => {
      const div = document.createElement("div");
      div.className = "log-item";
      const tag = document.createElement("span");
      tag.className = "log-tag";
      tag.textContent = item.sem;
      const body = document.createElement("span");
      body.textContent = item.text;
      div.appendChild(tag);
      div.appendChild(body);
      elog.appendChild(div);
    });
    $("shareMsg").textContent = "";
    renderEndingsCount();
    renderAchievements();
    showScreen("endingScreen");
  }

  function shareEnding() {
    if (!state || !state.endingId) return;
    const e = ENDINGS.find((x) => x.id === state.endingId);
    const text = "【宿舍人生】" + state.name + "的大学四年：" + e.emoji + e.title +
      "（健康 " + state.health + " · 智力 " + state.iq + " · 魅力 " + state.charm + " · 快乐 " + state.happy +
      " · 人脉 " + state.connections + " · 金钱 ¥" + state.money + " · 学分 " + state.credits +
      "）。结局图鉴 " + loadEndings().length + "/" + TOTAL_ENDINGS + "，成就 " + loadAchievements().length + "/" + ACHIEVEMENTS.length +
      "。你也来活一次：https://duankejingxi.github.io/dorm-life/";
    const done = () => { $("shareMsg").textContent = "✅ 已复制，去发给朋友炫耀吧"; };
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done();
      } catch (err) { $("shareMsg").textContent = "复制失败，长按手动复制吧"; }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else fallback();
  }

  // 建行动按钮
  ACTIONS.forEach((a) => {
    const b = document.createElement("button");
    b.className = "btn action-btn";
    b.setAttribute("data-action", a.id);
    const title = document.createElement("span");
    title.className = "action-title";
    title.textContent = a.icon + " " + a.name;
    const desc = document.createElement("span");
    desc.className = "action-desc";
    desc.textContent = a.desc;
    b.appendChild(title);
    b.appendChild(desc);
    b.addEventListener("click", () => doAction(a.id));
    $("actionBox").appendChild(b);
  });
  // v1.3：商店按钮（买东西算一个行动）
  const shopBtn = document.createElement("button");
  shopBtn.className = "btn action-btn shop-btn";
  shopBtn.setAttribute("data-action", "shop");
  const shopTitle = document.createElement("span");
  shopTitle.className = "action-title";
  shopTitle.textContent = "🛒 买东西";
  const shopDesc = document.createElement("span");
  shopDesc.className = "action-desc";
  shopDesc.textContent = "花钱买东西：新手机、健身卡、复习资料、请客吃饭。";
  shopBtn.appendChild(shopTitle);
  shopBtn.appendChild(shopDesc);
  shopBtn.addEventListener("click", showShop);
  $("actionBox").appendChild(shopBtn);

  // v1.4：开局选择按钮（家境 + 天赋）
  function buildPickRow(elId, items, pickedId, onPick) {
    const row = $(elId);
    if (!row) return;
    row.innerHTML = "";
    items.forEach((item) => {
      const b = document.createElement("button");
      b.className = "btn pick-btn" + (item.id === pickedId ? " picked" : "");
      b.setAttribute("data-pick", item.id);
      b.textContent = item.icon + " " + item.name;
      b.title = item.desc;
      b.addEventListener("click", () => {
        onPick(item.id);
        [...row.children].forEach((c) => c.classList.toggle("picked", c.getAttribute("data-pick") === item.id));
      });
      row.appendChild(b);
    });
  }
  buildPickRow("bgPick", BACKGROUNDS, pickedBackground, (id) => { pickedBackground = id; });
  buildPickRow("talentPick", TALENTS, pickedTalent, (id) => { pickedTalent = id; });
  buildPickRow("clubPick", CLUBS, pickedClub, (id) => { pickedClub = id; });
  buildPickRow("jobPick", JOBS, pickedJob, (id) => { pickedJob = id; });

  $("startBtn").addEventListener("click", () => startGame($("startName").value));
  $("nextBtn").addEventListener("click", nextSemester);
  $("shareBtn").addEventListener("click", shareEnding);
  $("againBtn").addEventListener("click", () => { showScreen("startScreen"); renderEndingsCount(); renderAchievements(); });

  buildRelPanel();
  renderEndingsCount();
  renderAchievements();

  // 调试图柄：冒烟测试用（只读状态 + 指定下一事件/小事/连锁 + 调属性），生产环境无害
  window.__dormlife = {
    get state() { return state; },
    get flags() { return flags; },
    get currentEvent() { return currentEvent; },
    get currentKind() { return currentKind; },
    start: startGame,
    doAction,
    chooseEvent,
    buyItem,
    showShop,
    get stepIndex() { return stepIndex; },
    get actionsDone() { return actionsDone; },
    sceneFor,
    nextSemester,
    pickBackground(id) { pickedBackground = id; },
    pickTalent(id) { pickedTalent = id; },
    get background() { return pickedBackground; },
    get talent() { return pickedTalent; },
    pickClub(id) { pickedClub = id; },
    get club() { return pickedClub; },
    pickJob(id) { pickedJob = id; },
    get job() { return pickedJob; },
    chooseBreak,
    get breakShown() { return breakShown; },
    setNextEvent(id) { forcedEventId = id; },
    debugPickEvent() { return pickRandomEvent(); },
    setNextMicro(id) { forcedMicroId = id; },
    setNextChain(id) { forcedChainId = id; },
    debugClearChain() { activeChain = null; startedChains = []; }, // 测试用：清空连锁，避免随机连锁抢占强制事件
    debugSetStats(patch) { Object.assign(state, patch); renderStats(); renderRel(); checkAchievements(); },
    debugSetFlags(patch) { Object.assign(flags, patch); },
    get endings() { return loadEndings(); },
    get achievements() { return loadAchievements(); },
  };
})();
