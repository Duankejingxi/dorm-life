/* 宿舍人生 · 世界设定：角色、社团、去向、学期结构、时间安排 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});

  DL.CAST = {
    me: { name: "我", color: "#e9e3d6" },
    jiang: { name: "江野", mono: "江", color: "#f08a4b", line: "404 下铺 · 篮球特长生", bio: "嗓门大，心更大。梦想是打进 CUBA 首发。" },
    su: { name: "苏念", mono: "苏", color: "#5fb3a1", line: "404 靠门上铺 · 村里第一个大学生", bio: "话很少，起得最早，记得每个人的生日。" },
    xu: { name: "许多", mono: "许", color: "#a58be0", line: "404 靠窗下铺 · 吉他 & 段子", bio: "家里让学金融，自己只想写歌。" },
    lin: { name: "林溪", mono: "林", color: "#6fa8e8", line: "隔壁学院 · 总背着一台旧相机", bio: "说话不多，看人很准。喜欢凌晨和雨天的光。" },
    cheng: { name: "程橙", mono: "程", color: "#f2c14e", line: "大三学姐 · 社长", bio: "干脆利落，什么都见过，什么都不怕。" },
    zhou: { name: "周老师", mono: "周", color: "#9fb4c7", line: "专业课教授", bio: "上课从不点名，挂人从不手软。" },
    mom: { name: "妈妈", mono: "妈", color: "#e7a1a1" },
  };
  // 关系面板里展示的人（顺序）
  DL.REL_ORDER = ["jiang", "su", "xu", "lin", "cheng", "zhou"];

  DL.CLUBS = {
    guitar: { name: "吉他社", icon: "🎸", desc: "许多已经在里面了。每周五晚上，草坪弹唱。" },
    photo: { name: "摄影社", icon: "📷", desc: "扫街、夜拍、暗房。据说有个人总是一个人去拍凌晨。" },
    ball: { name: "篮球队", icon: "🏀", desc: "江野的主场。早上六点的球馆，汗水和吼声。" },
    debate: { name: "辩论队", icon: "🎙️", desc: "唇枪舌剑，训练到凌晨，然后一起去吃夜宵。" },
    none: { name: "不加社团", icon: "🌿", desc: "时间留给自己。" },
  };

  DL.PATHS = {
    kaoyan: { name: "考研", icon: "📖" },
    baoyan: { name: "保研", icon: "🎓" },
    job: { name: "找工作", icon: "💼" },
    abroad: { name: "出国", icon: "✈️" },
    gongwu: { name: "考公", icon: "🏛️" },
    music: { name: "玩音乐", icon: "🎸" },
    free: { name: "还没想好", icon: "🌫️" },
  };

  // 每学期的节拍：chapter 开篇 / plan 时间安排 / moment 校园碎片 / exam 期末 / summer 暑假 / 其余是剧情场景
  DL.SEMESTERS = [
    { id: "y1a", label: "大一 · 秋", year: "大一", term: "上学期", season: "autumn", title: "四个陌生人", quote: "那年九月，我们还不知道彼此的名字。",
      beats: ["chapter", "y1a_arrival", "y1a_military", "y1a_midautumn", "plan", "y1a_club", "moment", "y1a_rain", "moment", "exam"] },
    { id: "y1b", label: "大一 · 春", year: "大一", term: "下学期", season: "spring", title: "春天的夜晚很长", quote: "好像什么都还来得及。",
      beats: ["chapter", "y1b_return", "y1b_cheng", "plan", "y1b_guitar", "moment", "y1b_night", "moment", "exam", "summer"] },
    { id: "y2a", label: "大二 · 秋", year: "大二", term: "上学期", season: "autumn", title: "第一次有人倒下", quote: "原来长大，是从学会守夜开始的。",
      beats: ["chapter", "y2a_freshman", "y2a_injury", "plan", "y2a_low", "moment", "y2a_snow", "moment", "exam"] },
    { id: "y2b", label: "大二 · 春", year: "大二", term: "下学期", season: "spring", title: "有人毕业了", quote: "我们第一次送别别人。",
      beats: ["chapter", "y2b_band", "plan", "moment", "y2b_farewell", "y2b_stage", "moment", "exam", "summer"] },
    { id: "y3a", label: "大三 · 秋", year: "大三", term: "上学期", season: "autumn", title: "岔路口", quote: "每个人都开始往不同的方向看。",
      beats: ["chapter", "y3a_crossroad", "plan", "y3a_su", "moment", "y3a_lin", "moment", "exam"] },
    { id: "y3b", label: "大三 · 春", year: "大三", term: "下学期", season: "spring", title: "各自的远方", quote: "有人回到球场，有人奔向车站。",
      beats: ["chapter", "y3b_jiang", "plan", "y3b_xu", "moment", "y3b_grind", "moment", "exam", "summer"] },
    { id: "y4a", label: "大四 · 秋", year: "大四", term: "上学期", season: "autumn", title: "最后一个秋天", quote: "银杏又黄了，这是最后一次。",
      beats: ["chapter", "y4a_battle", "plan", "y4a_autumn", "moment", "y4a_lin", "exam"] },
    { id: "y4b", label: "大四 · 夏", year: "大四", term: "下学期", season: "summer", title: "404 Not Found", quote: "后来，那个房间住进了新的人。",
      beats: ["chapter", "y4b_results", "y4b_thesis", "plan", "y4b_photo", "y4b_dinner", "y4b_leave"] },
  ];

  const y = (s) => Math.floor(s.sem / 2) + 1;
  const PREP_PATHS = ["kaoyan", "baoyan", "abroad", "gongwu"];

  // 学期时间安排：每学期选 3 次，同一项最多 2 次
  DL.FOCUS = [
    { id: "library", icon: "📚", name: "泡图书馆", desc: "占座、刷题、闭馆音乐响起才走。",
      fx: { study: 9, mood: -3 },
      lines: ["你在图书馆三楼靠窗的位置坐了一整个学期，闭馆音乐响了无数次。", "你的笔记写满了三个本子，期末前全班都来借。", "你和图书馆保安混熟了，他每天十点准时对你说：「同学，该回去了。」"] },
    { id: "field", icon: "🏃", name: "去操场", desc: "夜跑、打球、出一身汗。",
      fx: { body: 9, mood: 3 },
      lines: ["你每天晚上绕操场跑五公里，耳机里的歌换了一轮又一轮。", "你的体测成绩第一次及格得那么轻松。", "夜跑的时候，你认识了一群只知道彼此跑步配速的朋友。"] },
    { id: "work", icon: "☕", name: "兼职打工", desc: "家教、奶茶店、发传单。钱和疲惫一起来。",
      fx: { money: 2200, body: -4, mood: -2, exp: 2 },
      lines: ["你在学校门口的奶茶店做兼职，学会了二十种饮品，也学会了对着刁难的客人微笑。", "你接了两份家教，周末在城市两头来回坐地铁。", "你攥着第一笔工资站在 ATM 前，觉得自己是个大人了。"] },
    { id: "club", icon: "🎪", name: "社团活动", desc: "{club}的人，一起做点什么。",
      if: (s) => s.flags.club && s.flags.club !== "none",
      fx: { mood: 6, exp: 3, rel: { cheng: 4 } },
      lines: ["{club}的活动一场接一场，你开始在别人口中被叫作「老成员」。", "你们为一次活动熬到凌晨，散场后在路边吃了一碗最好吃的馄饨。", "你在{club}学会的东西，比课本上任何一章都具体。"] },
    { id: "dorm", icon: "🎮", name: "宿舍时光", desc: "开黑、夜聊、点外卖。404 的灯总是最晚灭。",
      fx: { mood: 7, study: -3, rel: { jiang: 4, su: 4, xu: 4 } },
      lines: ["404 的灯总是整栋楼最晚灭的。", "你们发明了一套只有 404 才懂的黑话，许多管它叫「404 方言」。", "开黑输了一整晚，你们却笑得比赢了还大声。", "那些熄灯后的夜聊，你后来一句都记不清了，只记得笑到肚子疼。"] },
    { id: "su", icon: "🌅", name: "跟苏念早起自习", desc: "六点的自习室，只有你们两个。",
      if: (s) => s.sem >= 1 && !s.flags.suLeft,
      fx: { study: 6, body: -1, rel: { su: 7 } },
      lines: ["六点的自习室，苏念总是先到，在你的位置上放一个热包子。", "苏念背单词的声音很轻，像在念一首诗。", "你们几乎不说话，却成了最默契的自习搭子。"] },
    { id: "ball", icon: "🏀", name: "陪江野打球", desc: "他投，你抢篮板。",
      if: (s) => !s.flags.injured || s.flags.jiangBack,
      fx: { body: 7, mood: 4, rel: { jiang: 7 } },
      lines: ["你给江野抢了一整个学期的篮板，自己的投篮居然也进步了。", "江野说你是他见过最烂、但最靠谱的陪练。", "傍晚的球场，夕阳把你们的影子拉得很长。"] },
    { id: "rehab", icon: "🦵", name: "陪江野复健", desc: "每天早上六点，康复中心。",
      if: (s) => s.flags.injured && !s.flags.jiangBack && s.sem >= 2 && s.sem <= 4,
      fx: { body: 2, mood: -1, rel: { jiang: 9 }, inc: { rehabDays: 1 } },
      lines: ["每天早上六点，你扶着江野走进康复中心。他疼得咬牙，从来不喊。", "江野第一次扔掉拐杖走了十米，回头冲你笑得像个傻子。", "康复师都认识你了，问你是不是江野的家属。你说：「算是吧。」"] },
    { id: "xu", icon: "🎸", name: "乐队排练", desc: "地下室、旧鼓、和许多的新歌。",
      if: (s) => s.flags.band,
      fx: { mood: 6, exp: 2, rel: { xu: 8 } },
      lines: ["地下排练室没有窗，但你们总能弹到天亮。", "许多写了一首新歌，第一个弹给你听。", "邻居投诉了三次，你们学会了在鼓上蒙一层毛巾。"] },
    { id: "lin", icon: "📷", name: (s) => (s.flags.together ? "和林溪在一起" : "去找林溪"), desc: (s) => (s.flags.together ? "一起扫街、看展、走很长的路。" : "借口总是很多：还书、问作业、路过。"),
      if: (s) => s.flags.metLin && !s.flags.linBreak,
      fx: { mood: 6, money: -400, rel: { lin: 8 } },
      lines: ["林溪拍了很多照片，其中有好几张，主角是你。", "你们走遍了这座城市的老街，鞋底磨薄了一层。", "图书馆闭馆后，你们总要绕湖走一圈才分开。"] },
    { id: "lab", icon: "🔬", name: "去周老师实验室", desc: "打杂、跑数据、听他骂人。",
      if: (s) => s.flags.lab,
      fx: { study: 5, exp: 6, rel: { zhou: 7 } },
      lines: ["你在实验室跑了一个月的数据，结果全错了。周老师看了一眼：「挺好，现在你知道错在哪了。」", "周老师在你的报告上批了两个字：「尚可」。师兄说这是他三年来见过的最高评价。", "实验室的灯和 404 的灯，你分不清哪个关得更晚。"] },
    { id: "intern", icon: "💼", name: "实习", desc: "工牌、早高峰、开不完的会。",
      if: (s) => y(s) >= 3,
      fx: { exp: 10, money: 2200, body: -4, mood: -2 },
      lines: ["你第一次挤进早高峰的地铁，第一次被叫作「同学，这个需求今天能给吗」。", "实习的工位靠窗，能看见整座城市的晚霞，但你很少有空抬头。", "带你的前辈说：「你比去年那批实习生靠谱多了。」你记了很久。"] },
    { id: "prep", icon: "✍️", name: "备考", desc: "{path}这条路，只能一页一页地走。",
      if: (s) => y(s) >= 3 && PREP_PATHS.includes(s.flags.path),
      fx: { prep: 15, study: 3, mood: -4 },
      lines: ["你的桌上贴满了便利贴，每一张都是一个倒计时。", "真题刷到第三遍，你开始能猜到出题人的心思。", "有些夜晚你想放弃，然后天亮了，你又坐回了座位上。"] },
    { id: "rest", icon: "🌙", name: "好好睡觉", desc: "别的都不重要。",
      fx: { body: 6, mood: 6 },
      lines: ["你睡了一整个学期的好觉，黑眼圈消失了。", "你学会了在焦虑的时候先去睡一觉，醒来再说。", "周末你什么都没做，只是躺着看窗外的云，觉得很好。"] },
  ];
})(typeof window !== "undefined" ? window : globalThis);
