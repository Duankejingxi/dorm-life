/* 宿舍人生 · 字印
 * 不用 emoji。每一项（时间安排、天赋、成就、去向、小游戏）用一个字作记号，渲染成印章。
 * 在数据加载之后、界面之前执行，原地替换各数据表的 icon 字段。
 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});
  const FOCUS = { library: "书", field: "跑", work: "工", club: "社", dorm: "寝", su: "晨", ball: "球", rehab: "愈", xu: "弦", lin: "影", lab: "研", intern: "职", prep: "考", rest: "眠" };
  const TALENT = { memory: "忆", koi: "鲤", allround: "通", genius: "才", grind: "卷", social: "交", romantic: "恋", sunny: "晴", hustle: "赚", hands: "准", iron: "铁", thrifty: "俭", redpacket: "红", baller: "篮", artsy: "文", honest: "朴", chill: "闲", athlete: "健" };
  const ACH = { first_night: "门", letter: "笺", pact: "约", stand: "立", rush: "抢", umbrella: "伞", shoot: "投", clutch: "绝", rhythm: "唱", cram: "记", run: "金", quiz: "答", sch1: "甲", sch3x: "奖", fail: "挂", broke: "穷", rich: "富", bestie: "友", glue: "家", snow: "雪", watch: "守", rehab: "晨", su: "灯", fest: "远", dad: "信", low: "雨", sick: "病", fit: "健", mem12: "影", landed: "岸", follow: "随", reunion: "聚", bond1: "缘", bond4: "知", bondall: "夜", gold: "运", gold2: "欧" };
  const PATH = { kaoyan_top: "研", kaoyan_adjust: "南", kaoyan_fail: "再", baoyan_top: "博", baoyan_home: "师", baoyan_fail: "绕", job_big: "厂", job_small: "创", job_none: "慢", abroad_ok: "远", abroad_money: "留", abroad_fail: "转", gongwu_ok: "公", gongwu_fail: "又", music_sign: "乐", music_small: "歌", teach: "山", gap: "路", delay: "迟" };
  const GAME = { stand: "站", rush: "抢", umbrella: "伞", shoot: "投", clutch: "绝", rhythm: "弦", cram: "记", run: "跑", quiz: "答" };

  const apply = (list, map, key) => { if (!list) return; for (const it of Array.isArray(list) ? list : Object.keys(list).map((k) => Object.assign(list[k], { _k: k }))) { const id = key ? it[key] : it._k; if (map[id]) it.icon = map[id]; } };
  apply(DL.FOCUS, FOCUS, "id");
  apply(DL.TALENTS, TALENT, "id");
  apply(DL.ACH, ACH, "id");
  apply(DL.PATH_EPILOGUE, PATH);
  if (DL.Games && DL.Games.INFO) apply(DL.Games.INFO, GAME);

  // 中文数字与天干，用于序号
  DL.NUM_CN = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  DL.NUM_CAP = ["壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌"];
  DL.ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  DL.EN_NUM = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
  // 去掉选项文本开头的 emoji
  DL.stripEmoji = (t) => String(t).replace(/^(?:\p{Extended_Pictographic}|️|‍)+\s*/u, "");
})(typeof window !== "undefined" ? window : globalThis);
