// 宿舍人生 · 游戏逻辑：8 个学期，每学期选 1 个行动 + 遇到 1 个随机事件
// 属性：健康/智力/魅力/快乐（0-100）、金钱（可负）、学分（只增不减为负时归零）
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const SEMESTERS = ["大一上", "大一下", "大二上", "大二下", "大三上", "大三下", "大四上", "大四下"];
  const ENDINGS_KEY = "dorm-life-endings-v1";
  const TOTAL_ENDINGS = 10;

  let state = null; // { name, semester, health, iq, charm, money, happy, credits, log[], over, endingId }
  let currentEvent = null;
  let usedEventIds = [];
  let forcedEventId = null;

  function loadEndings() {
    try { return JSON.parse(localStorage.getItem(ENDINGS_KEY) || "[]") || []; }
    catch (e) { return []; }
  }
  function saveEnding(id) {
    const list = loadEndings();
    if (list.indexOf(id) === -1) { list.push(id); try { localStorage.setItem(ENDINGS_KEY, JSON.stringify(list)); } catch (e) { /* 忽略 */ } }
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
    renderStats();
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

  function showScreen(which) {
    ["startScreen", "gameScreen", "endingScreen"].forEach((id) => {
      $(id).classList.toggle("hidden", id !== which);
    });
  }

  function startGame(name) {
    state = {
      name: (name || "").trim() || "你",
      semester: 1, health: 70, iq: 60, charm: 60, money: 500, happy: 70, credits: 0,
      log: [], over: false, endingId: null,
    };
    usedEventIds = [];
    $("logList").innerHTML = "";
    renderStats();
    renderEndingsCount();
    showScreen("gameScreen");
    showActionPhase();
    addLog(state.name + "入学了，住进了宿舍，大学四年开始了。");
  }

  function showActionPhase() {
    $("actionBox").classList.remove("hidden");
    $("eventCard").classList.add("hidden");
    $("resultBox").classList.add("hidden");
    $("actionHint").textContent = semName() + "，你打算怎么过？选一个。";
  }

  function doAction(actionId) {
    const a = ACTIONS.find((x) => x.id === actionId);
    if (!a || state.over) return;
    applyEffects(a.effects, a.variance, a.moneyVariance);
    addLog(a.log[Math.floor(Math.random() * a.log.length)]);
    $("actionBox").classList.add("hidden");
    if (checkEarlyEnding()) return;
    drawEvent();
  }

  function pickRandomEvent() {
    const year = yearOf();
    let pool = EVENTS.filter((e) => (!e.year || e.year === year) && usedEventIds.indexOf(e.id) === -1);
    if (pool.length === 0) { usedEventIds = []; pool = EVENTS.filter((e) => !e.year || e.year === year); }
    if (pool.length === 0) pool = EVENTS.slice();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function drawEvent() {
    currentEvent = forcedEventId
      ? (EVENTS.find((e) => e.id === forcedEventId) || pickRandomEvent())
      : pickRandomEvent();
    forcedEventId = null;
    usedEventIds.push(currentEvent.id);
    $("eventTitle").textContent = "🎲 " + currentEvent.title;
    $("eventText").textContent = currentEvent.text;
    const box = $("eventChoices");
    box.innerHTML = "";
    currentEvent.choices.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "btn choice-btn";
      b.textContent = c.text;
      b.addEventListener("click", () => chooseEvent(i));
      box.appendChild(b);
    });
    $("eventCard").classList.remove("hidden");
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
      } else {
        applyEffects(c.odds.lose, 0);
        resultText = c.odds.loseText;
      }
      applyEffects(c.effects, 0);
    } else {
      applyEffects(c.effects, 0);
    }
    addLog(resultText);
    $("eventCard").classList.add("hidden");
    if (checkEarlyEnding()) return;
    $("resultText").textContent = resultText;
    $("resultBox").classList.remove("hidden");
  }

  function checkEarlyEnding() {
    const id = state.health <= 0 ? "sick" : state.money <= -500 ? "debt" : null;
    if (!id) return false;
    endGame(id);
    return true;
  }

  function nextSemester() {
    if (state.over) return;
    state.semester++;
    if (state.semester > 8) { endGame(judgeEnding(state)); return; }
    renderStats();
    showActionPhase();
  }

  function endGame(endingId) {
    state.over = true;
    state.endingId = endingId;
    const e = ENDINGS.find((x) => x.id === endingId);
    saveEnding(endingId);
    $("endingEmoji").textContent = e.emoji;
    $("endingTitle").textContent = e.title;
    $("endingDesc").textContent = state.name + "的大学四年结束了。" + e.desc;
    $("endingStats").textContent = "最终属性：健康 " + state.health + " · 智力 " + state.iq + " · 魅力 " + state.charm +
      " · 快乐 " + state.happy + " · 金钱 ¥" + state.money + " · 学分 " + state.credits;
    renderEndingsCount();
    showScreen("endingScreen");
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

  $("startBtn").addEventListener("click", () => startGame($("startName").value));
  $("nextBtn").addEventListener("click", nextSemester);
  $("againBtn").addEventListener("click", () => { showScreen("startScreen"); renderEndingsCount(); });

  renderEndingsCount();

  // 调试图柄：冒烟测试用（只读状态 + 指定下一事件 + 调属性），生产环境无害
  window.__dormlife = {
    get state() { return state; },
    get currentEvent() { return currentEvent; },
    start: startGame,
    doAction,
    chooseEvent,
    nextSemester,
    setNextEvent(id) { forcedEventId = id; },
    debugSetStats(patch) { Object.assign(state, patch); renderStats(); },
    get endings() { return loadEndings(); },
  };
})();
