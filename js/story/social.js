/* 宿舍人生 · 社交：周末自由时间（羁绊故事）+ 手机消息 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});

  /* ======================= 地点 ======================= */
  const PLACES = {
    library: { name: "图书馆", at: "library", time: "day", solo: { fx: { study: 5 }, line: "你一个人在图书馆坐了一下午，把落下的笔记补完了。" } },
    field: { name: "操场", at: "field", time: "dusk", solo: { fx: { body: 5, mood: 2 }, line: "你一个人绕着操场跑了十圈，晚霞烧了半边天。" } },
    rooftop: { name: "天台", at: "rooftop", time: "night", solo: { fx: { mood: 5 }, line: "你一个人在天台吹了一会儿风，城市的灯一直铺到天边。" } },
    lake: { name: "湖边", at: "lake", time: "dusk", solo: { fx: { mood: 6 }, line: "你在湖边的长椅上坐到天黑，什么都没想，觉得很好。" } },
    canteen: { name: "后街小馆", at: "canteen", time: "night", solo: { fx: { mood: 3, money: -40 }, line: "你一个人去吃了顿好的。老板娘多给了你一碟花生米。" } },
    dorm: { name: "404", at: "dorm", time: "night", solo: { fx: { body: 4, mood: 3 }, line: "你在宿舍睡了一整个下午，醒来的时候天已经黑了。" } },
  };
  // 每个人常去的地方
  const HAUNTS = { jiang: ["field", "canteen"], su: ["library", "canteen"], xu: ["rooftop", "dorm"], lin: ["lake", "library"] };

  /* ======================= 羁绊故事 ======================= */
  // 每人四段，按关系值解锁（25 / 40 / 55 / 70），按顺序看
  const B = {};
  B.jiang = [
    { req: 25, title: "早上六点的豆浆", at: "field", time: "dawn", steps: [
      "早上六点，江野一把掀开你的被子：「起来，陪我跑步。跑完请你吃早饭。」",
      "跑完五公里，你们坐在校门口的早餐摊上，豆浆冒着热气。",
      ["jiang", "我爸是开大货车的。一年三百天在路上。他每次打电话就一句话：「好好打球，有出息。」"],
      ["jiang", "可我有时候不知道，什么叫有出息。"],
      { ask: "江野低头喝豆浆，没看你。", options: [
        { t: "「你爸肯定以你为荣。」", fx: { rel: { jiang: 6 } }, then: [["jiang", "……也许吧。他从来不说。"], "他把最后一根油条推到你面前。"] },
        { t: "「那你自己想要什么？」", fx: { rel: { jiang: 8 } }, then: [["jiang", "……从来没人问过我这个。"], "他想了很久，说：「我想一直打球。打到打不动为止。」"] },
      ] },
      { fx: { body: 3 } },
    ] },
    { req: 40, title: "那双球鞋", at: "dorm", time: "night", steps: [
      "江野从床底拖出一个鞋盒，小心翼翼地打开。是一双崭新的球鞋，鞋标都没剪。",
      ["jiang", "我妈在超市上班，一个月工资买的。我一直舍不得穿，怕磨坏了。"],
      { ask: "他用袖子擦了擦鞋面上根本不存在的灰。", options: [
        { t: "「穿上，明天去打一场。」", fx: { rel: { jiang: 8 }, mood: 4 }, then: ["第二天他穿着那双鞋在球场上拿了二十分。回来的时候他说：「我妈要是看见，肯定高兴。」", "你偷偷拍了一张他投篮的照片，发给了他妈妈。"] },
        { t: "帮他把鞋收好", fx: { rel: { jiang: 6 } }, then: ["你帮他把鞋重新放回盒子里，盖上盖子。", ["jiang", "等我打进首发那天，再穿。"]] },
      ] },
    ] },
    { req: 55, title: "江野的秘密", at: "library", time: "night", steps: [
      "你在图书馆最角落的位置找到了江野。他面前摊着一本高数，草稿纸上画满了叉。",
      ["jiang", "别笑。我高数挂了。补考也没过。队里要是知道，我就不能上场了。"],
      "这是你第一次看见他这么慌。",
      { ask: "他把脸埋进胳膊里。", options: [
        { t: "「每周三晚上，我给你补。」", fx: { rel: { jiang: 9 }, exp: 3, study: 2, set: { jiangTutor: true } }, then: ["后来的每个周三，图书馆最角落都坐着你们俩。期末他考了七十二分，把成绩单拍下来发了三个群。"] },
        { t: "拉上苏念一起", if: (s) => !s.flags.suLeft, fx: { rel: { jiang: 7, su: 4 }, set: { jiangTutor: true } }, then: ["苏念讲题讲得比老师还清楚。江野说他从来没想过，导数这东西居然能听懂。"] },
      ] },
    ] },
    { req: 70, title: "伴郎", at: "rooftop", time: "night", steps: [
      "天台。江野带了两罐可乐，递给你一罐。",
      ["jiang", "{me}，我想好了一件事。"],
      ["jiang", "以后不管你在哪，你结婚，我必须是第一个到的。谁跟我抢我跟谁急。"],
      ["me", "……你喝的是可乐吧？"],
      ["jiang", "我认真的。"],
      { ask: "他举起可乐罐，等着你。", options: [
        { t: "碰杯：「说定了。你也一样。」", fx: { rel: { jiang: 8 }, mood: 6 } },
        { t: "「那你得先找到对象。」", fx: { rel: { jiang: 7 }, mood: 8 }, then: [["jiang", "……你这个人真的很会破坏气氛。"], "他笑着把可乐罐砸在你的罐子上。"] },
      ] },
      { mem: { id: "bond_jiang", title: "天台上的约定", text: "江野说：你结婚，我必须是第一个到的。" } },
    ] },
  ];
  B.su = [
    { req: 25, title: "奶奶的包子", at: "canteen", time: "dawn", steps: [
      "早上七点的食堂。苏念把一个包子掰成两半，大的那一半给了你。",
      ["su", "我奶奶蒸的包子比这个好吃。面是她自己发的，馅里放很多葱。"],
      ["su", "我走的那天，她蒸了二十个，让我在火车上吃。我吃了两天。"],
      { ask: "{ta}说到奶奶的时候，眼睛弯弯的。", options: [
        { t: "「寒假我能去你家吃吗？」", fx: { rel: { su: 8 } }, then: [["su", "……真的吗？"], "{ta}愣了很久，然后很认真地说：「那我让奶奶多蒸点。」"] },
        { t: "「你奶奶一定很想你。」", fx: { rel: { su: 6 }, mood: 2 }, then: [["su", "嗯。她每天晚上七点都等我电话。"]] },
      ] },
    ] },
    { req: 40, title: "第一次看电影", at: "city", time: "night", steps: [
      "你发现苏念从来没进过电影院。",
      "周末你拉着{ta}去了商场顶楼。{ta}站在售票处前面，看着价格犹豫了很久。",
      ["me", "我请。上次你请我吃了包子。"],
      "电影是一部很普通的爱情片。灯黑下来的时候，苏念小声说了一句「哇」。",
      "散场的时候，{ta}把电影票折好，夹进了钱包里。",
      { fx: { rel: { su: 8 }, mood: 5, money: -90 } },
      { mem: { id: "bond_su_movie", title: "第一张电影票", text: "苏念把电影票折好，夹进了钱包。" } },
    ] },
    { req: 55, title: "苏念的本子", at: "library", time: "day", steps: [
      "苏念的桌上有一个很旧的笔记本，你不小心碰掉了，翻开的那一页写着：",
      "「九月一日，{me}帮我拎袋子。九月五日，{me}给了我一颗糖。九月十四日……」",
      "每一页都是一样的格式：日期，名字，一件小事。你的名字出现了很多次。",
      ["su", "……被你看见了。"],
      ["su", "我妈说，别人对你的好，要记下来，以后要还的。"],
      { ask: "{ta}的耳朵红透了。", options: [
        { t: "「那我也要开始记了。」", fx: { rel: { su: 9 } }, then: ["你在你的本子第一页写下：「今天，苏念给了我半个包子，大的那一半。」{ta}看见了，笑了很久。"] },
        { t: "「不用还。朋友之间不算这个。」", fx: { rel: { su: 7 } }, then: [["su", "……要算的。"], "{ta}低下头，在本子上又写了一行。"] },
      ] },
    ] },
    { req: 70, title: "第一个知道的人", at: "lake", time: "dusk", steps: [
      "苏念约你去湖边。{ta}很少主动约人。",
      ["su", "我想好了。我想去做医学研究。我们那边好多人生了病，要坐一天的车才能到县医院。"],
      ["su", "这条路很长。可能要十年。"],
      ["su", "我想请你……当第一个知道的人。不管是成了，还是没成。"],
      { ask: "风吹过湖面，{ta}在等你的回答。", options: [
        { t: "「好。我等你的消息。」", fx: { rel: { su: 8 }, mood: 5 } },
        { t: "「你一定会成的。」", fx: { rel: { su: 8 }, mood: 4 }, then: [["su", "……你总是比我自己更相信我。"]] },
      ] },
      { mem: { id: "bond_su", title: "湖边的约定", text: "苏念说：不管成没成，你都是第一个知道的人。" } },
    ] },
  ];
  B.xu = [
    { req: 25, title: "深夜食堂", at: "dorm", time: "night", steps: [
      "凌晨一点，许多用违章电锅煮了一锅泡面，往里面加了芝士、午餐肉、溏心蛋，还有一片他说「很贵」的松露。",
      ["xu", "米其林三星，404 分店。尝尝。"],
      "难吃得惊人。",
      ["xu", "小时候家里请了阿姨做饭，但我爸妈很少回来吃。我就一个人坐在很长的桌子边上吃。"],
      ["xu", "所以我喜欢住宿舍。吵是吵了点，但总有人。"],
      { ask: "他把锅推过来，眼巴巴地看着你。", options: [
        { t: "吃完，说「好吃」", fx: { rel: { xu: 8 } }, then: [["xu", "你撒谎的样子跟我爸一模一样。"], "但他笑得很开心。"] },
        { t: "「下次我来煮。」", fx: { rel: { xu: 7 }, mood: 3 }, then: ["你煮了一锅普通的西红柿鸡蛋面。许多吃了三碗，说这才是米其林。"] },
      ] },
    ] },
    { req: 40, title: "二手琴行", at: "city", time: "dusk", steps: [
      "许多拉你去了老城区的一家二手琴行。他在角落里找到一把很旧的吉他，愣住了。",
      ["xu", "这个型号……是我的第一把吉他。初中的时候，被我爸摔了。"],
      "标价八百。他翻了翻钱包，又放了回去。",
      { ask: "老板在柜台后面看报纸。", options: [
        { t: "帮他砍价", fx: { rel: { xu: 8 }, exp: 2 }, then: ["你跟老板磨了四十分钟，最后五百块成交，老板还送了一套弦。许多抱着琴出门的时候，说你是天生的谈判专家。"] },
        { t: "「我们 AA，算我送你的。」", if: (s) => s.stats.money >= 400, hint: "−¥400", fx: { rel: { xu: 10 }, money: -400 }, then: ["许多抱着琴，在琴行门口站了很久。", ["xu", "……这是我收到过最好的礼物。比我爸给我买的那台车还好。"]] },
      ] },
    ] },
    { req: 55, title: "一百个半首歌", at: "rooftop", time: "night", steps: [
      "许多把手机递给你。录音备忘录里有一百多条，每条都是半首歌。",
      ["xu", "都没写完。写到一半就觉得不好，就放下了。"],
      ["xu", "你帮我挑一首。你挑哪首，我就把哪首写完。"],
      { ask: "你一条一条地听过去。", options: [
        { t: "挑那首最难过的", fx: { rel: { xu: 8 }, set: { xuSong2: "sad" } }, then: ["许多听了很久：「……你怎么知道这首是写我妈的。」"] },
        { t: "挑那首最吵的", fx: { rel: { xu: 8 }, mood: 4, set: { xuSong2: "loud" } }, then: ["许多跳了起来：「我就知道！这首是写 404 的！」"] },
      ] },
      "那天晚上，他写完了那首歌。",
    ] },
    { req: 70, title: "不开玩笑的许多", at: "lake", time: "night", steps: [
      "许多今天特别安静。你们沿着湖走了两圈，他一个段子都没讲。",
      ["xu", "{me}，我跟你说件事，你别笑。"],
      ["xu", "我一直觉得，大家喜欢我，是因为我好笑。我不好笑的时候，就没人理我了。"],
      ["xu", "可是你不一样。我不讲笑话的时候，你也在。"],
      { ask: "他看着湖面，没看你。", options: [
        { t: "「你不好笑的时候，我更喜欢你。」", fx: { rel: { xu: 9 }, mood: 4 }, then: [["xu", "……完了，你比我会说话。"], "他笑了，这次是真的。"] },
        { t: "什么都不说，拍拍他的肩", fx: { rel: { xu: 8 } } },
      ] },
      { mem: { id: "bond_xu", title: "不开玩笑的许多", text: "许多说：我不讲笑话的时候，你也在。" } },
    ] },
  ];
  B.lin = [
    { req: 25, title: "冲印店", at: "city", time: "day", steps: [
      "林溪带你去了一家藏在老巷子里的冲印店。老板八十岁了，戴着很厚的眼镜。",
      ["lin", "这是全城最后一家还能冲胶卷的店。等它关门，我就要寄去上海冲了。"],
      ["lin", "胶卷不能马上看到照片。要等。等的时候，你会一直想那一刻。"],
      { ask: "老板把一卷冲好的底片递给{lx}。", options: [
        { t: "「我也想试试拍胶卷。」", fx: { rel: { lin: 8 } }, then: ["{lx}从包里掏出一台很旧的傻瓜相机，塞给你：「借你。拍完了，我们一起来冲。」"] },
        { t: "「等待的时候，你在想什么？」", fx: { rel: { lin: 7 } }, then: [["lin", "……在想，那一刻，我是不是真的看清楚了。"]] },
      ] },
    ] },
    { req: 40, title: "空椅子", at: "city", time: "dusk", steps: [
      "美术馆的摄影展。林溪在一张照片前面站了很久：一把空椅子，窗外有光。",
      ["lin", "你觉得这张照片在拍什么？"],
      { ask: "{lx}转过头看着你。", options: [
        { t: "「在拍一个刚离开的人。」", fx: { rel: { lin: 9 } }, then: [["lin", "……对。我也是这么觉得的。"], "{lx}看你的眼神，好像有一点不一样了。"] },
        { t: "「在拍光。」", fx: { rel: { lin: 7 } }, then: [["lin", "也对。光是唯一不会离开的东西。"]] },
        { t: "「就是一把椅子吧？」", fx: { rel: { lin: 5 }, mood: 3 }, then: ["林溪愣了一下，然后笑出了声。", ["lin", "你是我认识的人里，最诚实的一个。"]] },
      ] },
    ] },
    { req: 55, title: "会消失的东西", at: "lake", time: "night", steps: [
      "你们坐在湖边，林溪翻着相机里的照片：拆了一半的老楼，关门的小卖部，冬天的最后一片银杏叶。",
      ["lin", "我爸妈在我初三那年离婚了。那天我回家，客厅里一半的东西都不见了。"],
      ["lin", "我连那个客厅原来的样子都想不起来了。所以后来，我就开始拍。拍那些马上就要消失的东西。"],
      { ask: "{lx}的声音很轻。", options: [
        { t: "「那你有没有拍过自己？」", fx: { rel: { lin: 9 } }, then: ["林溪愣住了。过了很久，{lx}把相机递给你：「……那你帮我拍一张。」"] },
        { t: "把外套披在{lx}身上", fx: { rel: { lin: 8 } }, then: ["林溪没有说话，只是往你这边靠了一点。"] },
      ] },
    ] },
    { req: 70, title: "最后一格", at: "rooftop", time: "dusk", steps: [
      "林溪递给你一卷胶卷，三十六张，已经拍了三十五张。",
      ["lin", "前面三十五张，是我这几年拍的。最后一张，留给你。"],
      ["lin", "你想拍什么都可以。拍完了，我们一起去冲。"],
      { ask: "取景框里是傍晚的天台，和林溪。", options: [
        { t: "拍林溪", fx: { rel: { lin: 8 }, mood: 6 }, then: ["咔嚓。底片冲出来的时候，最后一张有点糊，林溪在笑。{lx}说这是整卷里最好的一张。"] },
        { t: "拍你们两个人的影子", fx: { rel: { lin: 9 }, mood: 6 }, then: ["夕阳把你们的影子拉得很长，叠在天台的地面上。林溪看了很久：「……你比我会拍。」"] },
      ] },
      { mem: { id: "bond_lin", title: "第三十六张", text: "林溪把胶卷的最后一格，留给了你。" } },
    ] },
  ];
  DL.BONDS = B;

  const HANG = {
    jiang: ["你陪江野投了一下午的球，他抢了你三十个篮板，然后请你喝了一瓶冰可乐。", "江野拉着你去后街吃了一顿烧烤，讲了一晚上他们队里的八卦。"],
    su: ["你和苏念在图书馆坐了一下午，几乎没说话，但很安心。", "苏念给你讲了一道你看了三天都没看懂的题，讲完你们一起去吃了碗面。"],
    xu: ["许多在天台给你弹了一首新写的歌，歌词还是很烂。", "许多拉着你看了一部很长的文艺片，他看哭了，你看睡着了。"],
    lin: ["你和林溪绕着湖走了一圈又一圈，{lx}拍了很多照片，其中有几张是你。", "林溪带你去了一家很小的咖啡馆，你们各自看书，一下午就过去了。"],
  };

  function available(s) {
    const out = ["jiang", "xu"];
    if (!s.flags.suLeft) out.push("su");
    if (s.flags.metLin && !s.flags.linBreak) out.push("lin");
    return out;
  }
  function bondRank(s, who) { return s.flags["bond_" + who] || 0; }
  function nextBond(s, who) {
    const r = bondRank(s, who), ev = (B[who] || [])[r];
    return ev && s.rel[who] >= ev.req ? ev : null;
  }

  // 生成本周末的地点卡：每个人在一个常去的地方；不够四个地点就补空地点
  function weekendOptions(s) {
    const people = available(s);
    for (let i = people.length - 1; i > 0; i--) { const j = Math.floor(DL.rand(s) * (i + 1)); [people[i], people[j]] = [people[j], people[i]]; }
    const used = new Set(), opts = [];
    for (const who of people.slice(0, 4)) {
      const prefs = HAUNTS[who].filter((p) => !used.has(p));
      const place = prefs[Math.floor(DL.rand(s) * prefs.length)] || prefs[0];
      if (!place) continue;
      used.add(place);
      opts.push({ place, who, story: !!nextBond(s, who) });
    }
    for (const p of Object.keys(PLACES)) { if (opts.length >= 4) break; if (!used.has(p)) { used.add(p); opts.push({ place: p, who: null, story: false }); } }
    return opts;
  }

  DL.playFree = async function (s, io) {
    const opts = weekendOptions(s);
    const view = opts.map((o) => {
      const P = PLACES[o.place];
      const ev = o.who && nextBond(s, o.who);
      return { place: o.place, name: P.name, who: o.who, whoName: o.who ? DL.CAST[o.who].name : "", story: o.story, title: ev ? DL.fmt(ev.title, s) : "", rank: o.who ? bondRank(s, o.who) : 0, level: o.who ? DL.LEVELS[DL.levelOf(s.rel[o.who])] : "", scene: { at: P.at, time: P.time, weather: "clear", season: DL.currentSeason(s) } };
    });
    const idx = await io.free(view, s);
    const o = opts[idx] || opts[0];
    const P = PLACES[o.place];
    s.flags.freeCount = (s.flags.freeCount || 0) + 1;
    if (!o.who) {
      await io.scene({ at: P.at, time: P.time, weather: "clear", season: DL.currentSeason(s) }, s);
      io.toast(DL.applyFx(s, P.solo.fx), s);
      await DL.run([P.solo.line], s, io);
      return;
    }
    const ev = nextBond(s, o.who);
    if (ev) {
      s.flags["bond_" + o.who] = bondRank(s, o.who) + 1;
      await io.scene({ at: ev.at, time: ev.time || "day", weather: "clear", season: DL.currentSeason(s) }, s);
      if (io.heading) await io.heading(DL.fmt(ev.title, s), s);
      await DL.run(ev.steps, s, io);
      if (io.bond) await io.bond(o.who, s.flags["bond_" + o.who], s);
      return;
    }
    await io.scene({ at: P.at, time: P.time, weather: "clear", season: DL.currentSeason(s) }, s);
    io.toast(DL.applyFx(s, { rel: { [o.who]: 3 }, mood: 3 }), s);
    await DL.run([DL.pickOne(s, HANG[o.who])], s, io);
  };

  /* ======================= 手机消息 ======================= */
  // group: 群聊（标题用群名）；否则是私聊。msgs 是对方先发的消息；replies 是你的回复选项
  const CHATS = [
    { sem: 0, group: true, msgs: [["xu", "群建好了！以后有事群里说"], ["jiang", "明天军训几点集合"], ["xu", "六点半"], ["jiang", "……六点半？？？我要退学"], ["su", "我可以叫大家起床"]],
      replies: [
        { t: "「苏念你是天使」", fx: { rel: { su: 4 } }, reply: [["su", "（害羞）"], ["xu", "那我也要被天使叫醒"]] },
        { t: "「江野退学前把腊肉留下」", fx: { rel: { jiang: 3, xu: 2 } }, reply: [["jiang", "腊肉是苏念的！！"], ["su", "腊肉大家一起吃"]] },
        { t: "发一个「躺平」表情包", fx: { mood: 3 }, reply: [["xu", "这个表情包好灵魂"], ["jiang", "+1"]] },
      ] },
    { sem: 1, group: true, msgs: [["jiang", "谁拿了我的充电器"], ["jiang", "白色的，线上贴了胶布"], ["xu", "不是我"], ["xu", "（偷偷把充电器放回去）"], ["xu", "……发错了"]],
      replies: [
        { t: "「抓到了」", fx: { rel: { xu: 2, jiang: 2 }, mood: 4 }, reply: [["jiang", "许多你今晚别想睡"], ["xu", "我是在帮你保管！！"]] },
        { t: "「我可以作证，我什么都没看到」", fx: { rel: { xu: 4 } }, reply: [["xu", "兄弟/姐妹！"], ["jiang", "你们俩是一伙的"]] },
      ] },
    { sem: 2, group: true, msgs: [["xu", "新学期第一次宿舍聚餐，吃什么"], ["jiang", "火锅！"], ["su", "都可以"], ["xu", "苏念你每次都说都可以"], ["su", "……那吃火锅"]],
      replies: [
        { t: "「苏念说了算，就火锅」", fx: { rel: { su: 3, jiang: 2 } }, reply: [["jiang", "苏念万岁"], ["su", "（小声）其实我想吃火锅"]] },
        { t: "「我请客」", if: (s) => s.stats.money >= 300, fx: { rel: { jiang: 3, su: 3, xu: 3 }, money: -300 }, reply: [["xu", "老板大气！"], ["jiang", "这顿我记一辈子"]] },
      ] },
    { sem: 3, from: "cheng", msgs: [["cheng", "学妹/学弟在吗"], ["cheng", "我下个月就毕业了，东西太多，周末能不能来帮我搬一下"], ["cheng", "请你吃饭"]],
      replies: [
        { t: "「随叫随到」", fx: { rel: { cheng: 8 }, body: -2 }, reply: [["cheng", "好人一生平安"], ["cheng", "我有一箱书要送你，你别嫌重"]] },
        { t: "「学姐，我舍不得你走」", fx: { rel: { cheng: 6 }, mood: -2 }, reply: [["cheng", "哎，别这样"], ["cheng", "……我也舍不得你们"]] },
      ] },
    { sem: 4, from: "mom", msgs: [["mom", "最近怎么样"], ["mom", "你爸昨天看到一篇文章，说大学生要早点规划，转给你了"], ["mom", "（文章：《大三还不规划，你就晚了》）"], ["mom", "不看也行，别有压力"]],
      replies: [
        { t: "「我看了，我在想办法」", fx: { mood: 2 }, reply: [["mom", "嗯，妈相信你"], ["mom", "降温了，记得穿秋裤"]] },
        { t: "「妈，你和爸最近身体好吗？」", fx: { mood: 4 }, reply: [["mom", "好着呢"], ["mom", "你爸说想你了，让我别告诉你"]] },
      ] },
    { sem: 5, from: "su", if: (s) => s.flags.suStayed, msgs: [["su", "我发了第一笔助研工资"], ["su", "一千二"], ["su", "我想请你吃饭。去后街那家你最喜欢的"]],
      replies: [
        { t: "「好！我要吃三碗」", fx: { rel: { su: 6 }, mood: 4 }, reply: [["su", "四碗也行"], ["su", "谢谢你。那年冬天，谢谢你"]] },
        { t: "「你先给家里寄点吧」", fx: { rel: { su: 7 } }, reply: [["su", "已经寄了一千"], ["su", "剩下两百，够请你吃饭"]] },
      ] },
    { sem: 5, from: "jiang", if: (s) => !s.flags.suStayed, msgs: [["jiang", "苏念今天在群里说话了"], ["jiang", "说深圳下雨了，问我们学校下没下"], ["jiang", "我好想{ta}"]],
      replies: [
        { t: "「我们拍一张宿舍发给{ta}」", fx: { rel: { jiang: 4, su: 6 } }, reply: [["jiang", "好！我去把{ta}的床铺好再拍"]] },
        { t: "「寒假我们去深圳看{ta}」", fx: { rel: { jiang: 4, su: 5 } }, reply: [["jiang", "说定了！"]] },
      ] },
    { sem: 6, group: true, msgs: [["xu", "秋招互助会第一次会议"], ["xu", "议题：江野的简历上写了「擅长篮球」，要不要删"], ["jiang", "这是我唯一的特长！"], ["su", "可以改成「具有团队协作精神」"]],
      replies: [
        { t: "「苏念说得对」", fx: { rel: { su: 3, jiang: 2 }, exp: 2 }, reply: [["jiang", "……行吧，听苏念的"]] },
        { t: "「我帮大家一起改」", fx: { rel: { jiang: 3, su: 3, xu: 3 }, exp: 3, body: -2 }, reply: [["xu", "今晚通宵改简历！"], ["jiang", "我去买夜宵"]] },
      ] },
    { sem: 7, group: true, msgs: [["xu", "最后一个学期了"], ["xu", "我突然有点不想毕业"], ["jiang", "我也是"], ["su", "……我也是"]],
      replies: [
        { t: "「那我们把这学期过得慢一点」", fx: { rel: { jiang: 3, su: 3, xu: 3 }, mood: 5 }, reply: [["xu", "怎么慢？"], ["jiang", "每天都一起吃晚饭"], ["su", "好"]] },
        { t: "发一张大一军训的合照", fx: { rel: { jiang: 3, su: 3, xu: 3 }, mood: 4 }, reply: [["jiang", "我那时候怎么这么黑"], ["xu", "你现在也黑"], ["su", "（哭了）"]] },
      ] },
  ];
  DL.CHATS = CHATS;

  DL.playChat = async function (s, io) {
    const c = CHATS.find((x) => x.sem === s.sem && DL.test(x.if, s));
    if (!c || !io.chat) return;
    const title = c.group ? DL.fmt("{group}", s) : DL.CAST[c.from].name;
    const msgs = c.msgs.map(([w, t]) => ({ who: w, name: DL.CAST[w] ? DL.CAST[w].name : w, color: DL.CAST[w] ? DL.CAST[w].color : "#999", text: DL.fmt(t, s).replace("学妹/学弟", s.dorm === "f" ? "学妹" : "学弟").replace("兄弟/姐妹", s.dorm === "f" ? "姐妹" : "兄弟") }));
    const reps = c.replies.filter((r) => DL.test(r.if, s));
    const idx = await io.chat({ title, group: !!c.group, msgs, replies: reps.map((r) => DL.fmt(r.t, s)), follow: reps.map((r) => (r.reply || []).map(([w, t]) => ({ who: w, name: DL.CAST[w].name, color: DL.CAST[w].color, text: DL.fmt(t, s).replace("兄弟/姐妹", s.dorm === "f" ? "姐妹" : "兄弟") }))) }, s);
    const r = reps[idx] || reps[0];
    if (r && r.fx) io.toast(DL.applyFx(s, r.fx), s);
  };
})(typeof window !== "undefined" ? window : globalThis);
