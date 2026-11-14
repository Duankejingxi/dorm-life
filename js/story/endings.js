/* 宿舍人生 · 结局：你的去向 + 每个人的十年后 + 重聚 + 称号 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});

  // 大四上学期“决战”之后调用：根据去向、备考、履历、学业算出结果
  DL.computeOutcome = function (s) {
    const st = s.stats;
    const g = DL.gpaAvg(s);
    const luck = DL.rand(s) * 14 - 7;
    const p = s.flags.path || "free";
    if (s.fails >= 4) {
      return { id: "delay", ok: false, city: "这里", name: "延毕一年", reveal: "教务系统里，你的名字后面跟着一行红字：「学分未修满，不予毕业。」你挂了 " + s.fails + " 门课。" };
    }
    if (p === "kaoyan") {
      const sc = st.prep * 0.55 + st.study * 0.35 + luck + (st.mood < 30 ? -5 : 0);
      if (sc >= 53) return { id: "kaoyan_top", ok: true, city: "北京", name: "考研上岸", reveal: "二月，考研成绩出来了。总分 " + (370 + Math.round(sc - 56)) + "。复试线是 351。你上岸了。" };
      if (sc >= 42) return { id: "kaoyan_adjust", ok: true, city: "广州", name: "调剂上岸", reveal: "二月，考研成绩出来了。差了第一志愿八分。三月，你收到了一所南方学校的调剂通知。" };
      return { id: "kaoyan_fail", ok: false, city: "家里", name: "考研落榜", reveal: "二月，考研成绩出来了。差了二十一分。" };
    }
    if (p === "baoyan") {
      const sc = st.prep * 0.4 + g * 14 + s.rel.zhou * 0.2 + st.exp * 0.15 + luck;
      if (sc >= 78) return { id: "baoyan_top", ok: true, city: "上海", name: "保研名校", reveal: "九月二十八日凌晨，推免系统弹出了一条消息：你被一所顶尖学校录取了。" };
      if (sc >= 60) return { id: "baoyan_home", ok: true, city: "这里", name: "保研本校", reveal: "九月二十八日，推免系统的结果出来了：本校，周老师课题组。周老师只在群里发了两个字：「欢迎。」" };
      return { id: "baoyan_fail", ok: false, city: "家里", name: "保研失败", reveal: "九月二十八日，推免名单出来了。你的名字排在最后一个名额的下面一行。" };
    }
    if (p === "job") {
      const sc = st.exp * 0.45 + st.prep * 0.35 + (s.rel.cheng >= 35 ? 8 : 0) + st.study * 0.1 + luck;
      if (sc >= 50) return { id: "job_big", ok: true, city: "深圳", name: "大厂 Offer", reveal: "十一月，你收到了那封邮件：「恭喜你通过了全部面试。」offer 在深圳。程橙学姐第一个打来电话：「早茶，我请！」" };
      if (sc >= 32) return { id: "job_small", ok: true, city: "杭州", name: "一份不错的工作", reveal: "十二月，你签了一家杭州的小公司。不大，但老板说，你可以做你想做的事。" };
      return { id: "job_none", ok: false, city: "家里", name: "没拿到 offer", reveal: "秋招结束了。你投了八十七份简历，进了十一次面试，最后一封邮件写着：「很遗憾。」" };
    }
    if (p === "abroad") {
      const sc = st.prep * 0.5 + st.study * 0.4 + st.exp * 0.1 + luck;
      const rich = s.family === "rich";
      if (sc >= (rich ? 47 : 60)) return { id: "abroad_ok", ok: true, city: "伦敦", name: "出国读书", reveal: rich ? "三月的一个凌晨，你收到了录取邮件。你把手机递给许多，许多替你尖叫了出来。" : "三月的一个凌晨，你收到了录取邮件，附件里还有一封奖学金通知：全额。你一个人在阳台上哭了很久。" };
      if (sc >= 44) return { id: "abroad_money", ok: false, city: "家里", name: "录取了，但去不了", reveal: "三月，你收到了录取邮件。但奖学金那一栏写着：「很遗憾。」你算了很多遍，那笔钱，家里拿不出来。" };
      return { id: "abroad_fail", ok: false, city: "家里", name: "申请失利", reveal: "三月，最后一封拒信到了。你申请的七所学校，一所都没有录取你。" };
    }
    if (p === "gongwu") {
      const sc = st.prep * 0.6 + st.study * 0.3 + luck;
      if (sc >= 47) return { id: "gongwu_ok", ok: true, city: "家乡", name: "考公上岸", reveal: "四月，公示名单出来了。你的名字在第三行。妈妈把截图发到了家族群里。" };
      return { id: "gongwu_fail", ok: false, city: "家里", name: "考公落榜", reveal: "一月，国考成绩出来了。面试线差了一点五分。" };
    }
    if (p === "music") {
      const sc = st.exp * 0.3 + s.rel.xu * 0.4 + st.prep * 0.3 + luck;
      if (sc >= 48) return { id: "music_sign", ok: true, city: "北京", name: "乐队签约", reveal: "四月，「{group}」的第一张专辑上线了。第一天，播放量三千。第二天，一万二。" };
      return { id: "music_small", ok: true, city: "成都", name: "继续唱", reveal: "四月，「{group}」的专辑还是没有出成。但成都那家 livehouse 的老板说，周五晚上，永远给你们留着。" };
    }
    if (s.flags.teach) return { id: "teach", ok: true, city: "山里", name: "去支教", reveal: "三月，你收到了西部计划的通知：你被分到了一所山里的小学。" };
    return { id: "gap", ok: true, city: "路上", name: "间隔年", reveal: "三月，所有人都有了着落。你订了一张单程票。" };
  };

  // 十年后的你
  const PATH_EPILOGUE = {
    kaoyan_top: { icon: "📖", name: "研究员", text: "你在北京读完了研究生，留在了一家研究院。实验室的灯总是整栋楼最晚灭的——像 404 一样。" },
    kaoyan_adjust: { icon: "🌴", name: "南方的研究生", text: "调剂去的那所学校没那么有名，但你在那里遇到了一个很好的导师。后来你留在了南方，习惯了没有冬天的日子。" },
    kaoyan_fail: { icon: "🔁", name: "二战上岸", text: "你在家乡的出租屋里又考了一年。第二年三月，你上岸了。你后来常说，那一年是你人生中最孤独、也最清醒的一年。" },
    baoyan_top: { icon: "🎓", name: "博士", text: "你在上海读完了博士。答辩那天，周老师坐了五个小时的高铁来听。他坐在最后一排，全程面无表情，结束的时候第一个鼓掌。" },
    baoyan_home: { icon: "🔬", name: "周老师的学生", text: "你留在了周老师的实验室。后来，周老师退休了，那间实验室的钥匙，交到了你手里。" },
    baoyan_fail: { icon: "🧭", name: "绕了一点路", text: "保研失败之后，你匆忙找了一份工作。绕了一点路，但你后来发现，那些弯路上也有风景。你现在做得很好。" },
    job_big: { icon: "💼", name: "大厂打工人", text: "你在深圳工作了十年，从实习生做到了团队负责人。你招的第一个实习生，你请他吃了饭。规矩。" },
    job_small: { icon: "🌱", name: "创业公司元老", text: "那家杭州的小公司后来长大了。你成了最早的那批员工之一，墙上的照片里，你站在最边上，笑得很傻。" },
    job_none: { icon: "🌧️", name: "慢慢来的人", text: "毕业后的那半年很难。你在家里投简历、改简历、被拒绝。后来你找到了一份不起眼的工作，再后来，你发现自己挺喜欢它的。" },
    abroad_ok: { icon: "✈️", name: "远方的人", text: "你在伦敦读完了书，后来留在了那边工作。每年中秋，你都会一个人去唐人街买一块月饼，切成四份。" },
    abroad_money: { icon: "🏠", name: "留下的人", text: "你没有去成。你在国内找了一份工作，有时候会在深夜打开那封录取邮件看一看。后来你不看了，你过得很好。" },
    abroad_fail: { icon: "🧳", name: "换了一条路", text: "申请失败之后，你在国内读了研。你后来去了很多次国外，出差、旅行，每一次，都是自己挣的机票钱。" },
    gongwu_ok: { icon: "🏛️", name: "基层干部", text: "你回到了家乡，在县里工作。你去过很多个苏念说的那种村子，帮很多人跑过很远的路。" },
    gongwu_fail: { icon: "🔁", name: "又考了一年", text: "第二年，你考上了。不是最想去的岗位，但是在一个需要你的地方。" },
    music_sign: { icon: "🎸", name: "乐手", text: "你和许多做了十年音乐。你们去过一百多座城市，睡过无数个面包车的后座。你不后悔，一秒都不后悔。" },
    music_small: { icon: "🎶", name: "周五的乐手", text: "你们没有大红大紫。你白天上班，周五晚上去成都那家小 livehouse 唱歌。台下的人，有些已经听了你们十年。" },
    teach: { icon: "🏔️", name: "山里的老师", text: "你本来只打算支教一年，结果待了三年。后来你回城工作了，但每年暑假，都会有几个孩子给你打电话，叫你「{me}老师」。" },
    gap: { icon: "🗺️", name: "在路上的人", text: "你走了一年，去了很多地方。回来以后，你做了一份很普通的工作，但你知道自己想要什么了。这比什么都难得。" },
    delay: { icon: "⏳", name: "晚一年毕业", text: "你延毕了一年。那一年，404 住进了新的人，你搬去了别的宿舍。第二年夏天，你终于拿到了毕业证，三个人从三座城市赶回来看你。" },
  };

  function fateJiang(s) {
    const f = s.flags;
    if (f.jiangBack) return { who: "jiang", title: "冠军教练", text: "江野在一所中学当体育老师，兼篮球队教练。他带的球队拿了全市冠军。每次比赛前，他都会跟孩子们讲同一个故事：「我十九岁那年，摔断了腿……」" };
    if (f.jiangCoach) return { who: "jiang", title: "少儿篮球教练", text: "江野后来考了教练证，在一家少儿篮球训练营。他的膝盖每到阴雨天还会疼，但他每天都站在球场边上，冲一群小孩吼：「摔倒了就站起来！」" };
    if (s.rel.jiang >= 60) return { who: "jiang", title: "健身房老板", text: "江野回了老家，在县城开了一家健身房。生意一般，但他过得挺开心。他偶尔会在朋友圈发一张空荡荡的篮球场的照片，什么都不配。" };
    return { who: "jiang", title: "很少说话的人", text: "江野后来很少在群里说话了。听说他换了好几份工作，送过外卖，做过销售。有一年冬天，他突然在群里发了一句：「突然很想你们。」那条消息下面，很快多了三十几条回复。" };
  }
  function fateSu(s) {
    const f = s.flags;
    if (f.suStayed) return { who: "su", title: "苏博士", text: "苏念读完了博士，回到家乡的省城医院做研究。{ta}的博士论文致谢里写着：「感谢「{group}」。没有你们，我在流水线上。」" + (f.suLoan ? "毕业第一年，{ta}把那笔钱还给了你，连本带利，还有一箱红薯干。" : "") };
    if (s.rel.su >= 50) return { who: "su", title: "走得慢的人", text: "苏念在深圳工作了三年，一边上班一边读完了自考本科，后来考上了家乡的卫生院。{ta}每年秋天都给你寄一箱红薯干，包裹上的字，还是那么工整。" };
    return { who: "su", title: "远方", text: "苏念在深圳待了很多年。你们的联系渐渐少了。有一次你在深圳出差，路过一片工业园，忽然想起{ta}，在路边站了很久，最后给{ta}发了一句：「最近好吗？」{ta}秒回了。" };
  }
  function fateXu(s) {
    const f = s.flags;
    const went = f.xuGo || f.wentFest || f.xuDadTalk || s.flags.path === "music";
    const dad = f.dadCame || f.xuDadTalk;
    if (went && (f.band || f.xuEncouraged)) return { who: "xu", title: "主唱", text: "许多的乐队「{group}」出了三张专辑。最红的那首，还是「{songName}」。去年音乐节，台下一万人一起唱。" + (dad ? "他爸爸坐在第一排，比谁都大声。" : "") };
    if (went) return { who: "xu", title: "livehouse 老板", text: "许多做了几年音乐，没火起来。后来他开了一家小小的 livehouse，专门给没人听过的新人乐队演出。门口的招牌上写着：「这里永远有人会唱你的歌。」" };
    return { who: "xu", title: "穿西装的人", text: "许多进了他爸爸的公司，现在是部门经理，穿西装，开会，飞来飞去。他的吉他挂在办公室的墙上。偶尔，他会在深夜发一段弹唱，配文只有三个字：「给 404」。" };
  }
  function fateLin(s, out) {
    const f = s.flags;
    const city = (out && out.city) || "那座城市";
    if (!f.metLin) return { who: "lin", title: "未曾相遇", text: "那个雨夜，图书馆门口站着一个低头擦镜头的人。你戴上耳机，冲进了雨里。你从来都不知道，你错过了什么。" };
    if (f.together && !f.linBreak) {
      if (f.linFollow) return { who: "lin", title: "靠窗的家", text: "你和林溪在一起了十年。你们的家有一扇很大的窗，墙上挂满了{lx}拍的照片。最大的那一张，是" + (f.togetherAt === "snow" ? "那年的初雪" : f.togetherAt === "exhibit" ? "雨夜里那条金色的路" : "冰面上的那条鱼") + "。" };
      if (s.rel.lin >= 80) return { who: "lin", title: "四个小时的高铁", text: "你们异地了两年，高铁坐了一百多趟，车票攒了一整个鞋盒。后来，你们终于在同一座城市安了家。" + (city === "上海" ? "" : "是你搬过去的，你说那里的雨，比较像那个晚上。") };
      return { who: "lin", title: "太远了", text: "异地的第二年，你们分开了。没有吵架，只是太远了。很多年后，在一个朋友的婚礼上，你们又遇见了。林溪说：「你还是老样子。」你说：「你也是。」" };
    }
    if (f.linBreak) return { who: "lin", title: "最后一张", text: "你们后来没有再联系。很多年后，你在一本摄影杂志上看到了{lx}的名字。那一期的主题叫「最后一张」，照片里，是一个站在湖边的人。" };
    return { who: "lin", title: "没说出口", text: "林溪去了上海，后来成了一个很好的摄影师。你们一直是朋友。有一年，{lx}办了一个个展，叫「这所学校的四季」。你一张一张地看过去，在最后一张前面，站了很久。" };
  }

  function reunion(s) {
    const close = ["jiang", "su", "xu"].filter((k) => s.rel[k] >= 62);
    const board = s.flags.board || "{group}，到此一游。";
    if (close.length === 3) return { count: 4, title: "四个人", text: "十年后的冬天，你们真的回去了。404 住着四个大一新生，宿管阿姨换了人，听说你们是这间宿舍的老住户，破例让你们上去看了一眼。床板背面那行字还在：「" + board + "」。四个人站在门口，谁都没说话。然后，许多先哭了。" };
    if (close.length >= 1) {
      const names = { jiang: "江野", su: "苏念", xu: "许多" };
      const missing = ["jiang", "su", "xu"].filter((k) => !close.includes(k)).map((k) => names[k]).join("和");
      return { count: close.length + 1, title: close.length + 1 + "个人", text: "十年后的冬天，你们回了一趟学校。来了" + (close.length === 2 ? "三" : "两") + "个人，" + missing + "说临时有事，在群里发了一个红包，红包名叫「欠你们一顿」。你们在 404 门口拍了一张照，床板背面那行字还在：「" + board + "」。" };
    }
    return { count: 1, title: "一个人", text: "十年后，「{group}」群里有人问了一句：「今年聚吗？」那条消息下面，很久都没有人回。后来，你一个人回了一趟学校。404 的灯亮着，里面住着别人，传出很大的笑声。你在楼下站了很久。" };
  }

  function title(s, out) {
    const f = s.flags;
    const fc = s.focus;
    const c = [];
    const add = (id, name, desc, w) => c.push({ id, name, desc, w });
    if ((f.rehabDays || 0) >= 2 && f.jiangBack) add("rehab", "凌晨六点的陪练", "你陪一个人走完了最难的那段路。", 9);
    if (f.su404 || f.suGrant) add("light", "楼梯间的那盏灯", "在别人最黑的时候，你跺了一下脚。", 8.5);
    if (f.wentFest) add("roadie", "搬音箱的人", "期末考可以补，第一次音乐节不能等。", 8);
    if (f.invitedDad && f.dadCame) add("bridge", "送出那条消息的人", "你替一个人，敲开了一扇很难敲开的门。", 8.2);
    if (f.together && f.linFollow) add("umbrella", "撑伞的人", "从那个雨夜开始，伞一直往一边歪。", 7.5);
    if (["jiang", "su", "xu"].every((k) => s.rel[k] >= 80)) add("glue", "404 的粘合剂", "四个陌生人，因为你，成了一家人。", 9.5);
    if (out && (out.id === "baoyan_top" || out.id === "kaoyan_top") && DL.gpaAvg(s) >= 3.6) add("scholar", "图书馆的守夜人", "闭馆音乐响了一千次，你都在。", 7);
    if (out && out.id === "job_big") add("climber", "早高峰里的人", "你比谁都早地学会了做一个大人。", 6);
    const top = Object.keys(fc).sort((a, b) => fc[b] - fc[a])[0];
    const TOPS = {
      library: ["图书馆的守夜人", "闭馆音乐响了一千次，你都在。"],
      dorm: ["404 的灵魂", "整栋楼最晚灭的灯，是你点的。"],
      work: ["早熟的大人", "别人在玩的时候，你在学着养活自己。"],
      rest: ["睡得最香的人", "你从来不跟自己过不去。这是一种天赋。"],
      field: ["操场上的风", "夜跑的人都认识你的背影。"],
      lin: ["绕湖走的人", "那个湖，你们走了一千圈。"],
      su: ["六点的自习室", "最安静的陪伴，是一个热包子。"],
      ball: ["抢篮板的人", "你不是最好的球员，但你是最好的陪练。"],
      lab: ["实验室的常客", "周老师说「尚可」的时候，你记了很久。"],
      intern: ["早高峰里的人", "你比谁都早地学会了做一个大人。"],
      prep: ["倒计时的人", "便利贴贴满了一整面墙。"],
      club: ["{club}的老成员", "那些活动后来都忘了，但那些人没有。"],
      xu: ["地下室的鼓手", "没有窗的排练室，你们弹到了天亮。"],
      rehab: ["凌晨六点的陪练", "你陪一个人走完了最难的那段路。"],
    };
    if (top && TOPS[top]) add("top_" + top, TOPS[top][0], TOPS[top][1], 5);
    add("ordinary", "平凡而闪光的人", "没有惊天动地，但每一天都算数。", 1);
    c.sort((a, b) => b.w - a.w);
    const t = c[0];
    return { id: t.id, name: DL.fmt(t.name, s), desc: t.desc };
  }

  DL.computeEnding = function (s) {
    const out = s.flags.result || DL.computeOutcome(s);
    const pe = PATH_EPILOGUE[out.id] || PATH_EPILOGUE.gap;
    const f = (x) => Object.assign({}, x, { text: DL.fmt(x.text, s), title: DL.fmt(x.title, s), name: (DL.CAST[x.who] || {}).name });
    const ending = {
      path: { id: out.id, icon: pe.icon, name: pe.name, result: out.name, ok: out.ok, text: DL.fmt(pe.text, s) },
      fates: [fateJiang(s), fateSu(s), fateXu(s)].map(f),
      lin: f(fateLin(s, out)),
      reunion: (() => { const r = reunion(s); return { count: r.count, title: r.title, text: DL.fmt(r.text, s) }; })(),
      title: title(s, out),
      gpa: DL.gpaAvg(s),
      memories: s.memories.length,
    };
    return ending;
  };

  DL.PATH_EPILOGUE = PATH_EPILOGUE;
})(typeof window !== "undefined" ? window : globalThis);
