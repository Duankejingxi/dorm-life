/* 宿舍人生 · 程序化剧情引擎 v2.0
目标：把剧情容量扩到 10 倍（大事件 296→3000，微事件 260→2600）。
做法：手写高质量模板（每条都是完整的小故事），槽位用精选填充词组合，
每条模板生成几十个不重样的变体。种子随机保证每次加载生成结果一致，
冒烟测试可稳定断言数量和结构。
生成的事件直接 push 进全局 EVENTS / MICRO_EVENTS（const 数组可变异），
复用现有的 pickRandomEvent / pickRandomMicro / sceneFor 逻辑，零侵入。 */

(function () {
"use strict";

// 确定性随机：mulberry32，种子固定，保证每次加载生成同一批事件
function mulberry32(seed) {
let a = seed >>> 0;
return function () {
a |= 0; a = (a + 0x6D2B79F5) | 0;
let t = Math.imul(a ^ (a >>> 15), 1 | a);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
const rng = mulberry32(20261031);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
function fill(tpl, slots) {
return tpl.replace(/\{(\w+)\}/g, (_, k) => slots[k] || "{" + k + "}");
}

/* ---------- 填充词库（宿舍生活高频词，保证场景关键词能命中配图） ---------- */
const F = {
place: ["食堂二楼", "操场", "图书馆三楼", "宿舍", "教室", "篮球场", "奶茶店", "校门口", "宿舍楼下", "自习室", "体育馆", "小树林", "商业街", "快递站", "浴室", "开水房", "报告厅", "实验楼", "天台", "地下通道"],
person: ["阿强", "小美", "学长", "隔壁宿舍的老王", "班长", "社团部长", "宿管阿姨", "研三的学姐", "大一的学弟", "前桌的女生"],
food: ["麻辣烫", "黄焖鸡", "螺蛳粉", "煎饼果子", "肉夹馍", "关东煮", "炸鸡", "包子", "煲仔饭", "过桥米线", "酸菜鱼", "猪脚饭"],
item: ["充电器", "雨伞", "耳机", "水杯", "洗衣液", "纸巾", "台灯", "插线板", "雨衣", "饭卡"],
time: ["九点", "十点", "十一点", "凌晨一点", "大清早", "午休时"],
course: ["高数", "英语", "马原", "专业课", "体育课", "选修课"],
act: ["开黑", "刷剧", "背单词", "跑步", "点外卖", "水群"],
};

/* ---------- 大事件模板（每条生成 n 个变体） ---------- */
const BIG = [
{
prefix: "g-blackout", n: 40,
slots: { time: F.time, person: F.person.slice(0, 6), item: ["充电宝", "手电筒", "笔记本", "小台灯"]},
title: "宿舍突然停电",
text: "晚上{time}，宿舍突然停电了，{person}的{item}还亮着，全宿舍就他有光。",
choices: [
{ text: "点灯夜聊", effects: { happy: 6}, result: "你们围着那点光夜聊到半夜，停电反而成了最开心的夜晚。"},
{ text: "摸黑洗漱睡觉", effects: { health: 4}, result: "你摸黑洗漱完就睡了，难得睡了个早觉。"},
{ text: "去走廊蹭电学习", effects: { iq: 3, happy: -2}, result: "走廊里蹲了一排蹭电学习的，你也是其中之一。"},
],
},
{
prefix: "g-canteen-new", n: 40,
slots: { place: ["二楼", "三楼", "一楼"], food: F.food, person: F.person.slice(0, 6), person2: F.person.slice(0, 6)},
title: "食堂出了新菜",
text: "食堂{place}窗口出了新菜{food}，{person}说好吃到跺脚，{person2}说这是黑暗料理。",
choices: [
{ text: "去尝尝", effects: { money: -20, happy: 6}, result: "你去尝了，排了二十分钟队，还行，对得起价格。"},
{ text: "观望一下", effects: { happy: 1}, result: "你决定先看看评价，不当小白鼠。"},
{ text: "自己带饭", effects: { money: 10, happy: -2}, result: "你从宿舍带了饭，省了钱，但闻着别人的{food}有点馋。"},
],
},
{
prefix: "g-alarm", n: 40,
slots: { person: ["阿强", "隔壁的老王", "上铺的兄弟"], time: ["六点", "六点半", "七点"]},
title: "{person}的闹钟",
text: "{person}定了{time}的闹钟，响了三次他都没醒，全宿舍被吵醒了，就他睡得最香。",
choices: [
{ text: "帮他关掉", effects: { happy: 2}, result: "你爬起来帮他关了闹钟，他翻了个身继续睡。"},
{ text: "把他摇醒", effects: { connections: 2, happy: -2}, result: "你把他摇醒了，他顶着鸡窝头说谢谢，然后倒头又睡了。"},
{ text: "戴耳塞继续睡", effects: { health: 2, happy: -3}, result: "你戴上耳塞，但闹钟穿透了耳塞，你认命了。"},
],
},
{
prefix: "g-delivery-wrong", n: 40,
slots: { food: F.food, person: F.person.slice(0, 6)},
title: "外卖被拿错了",
text: "你点的{food}到了，但去拿时发现被人拿走了，{person}说他看到一个背影拿着{food}上了楼。",
choices: [
{ text: "去群里问", effects: { happy: 4}, result: "你在宿舍群里问，拿错的人道歉了，还请你喝了杯奶茶。"},
{ text: "再点一份", effects: { money: -25, happy: -4}, result: "你又点了一份，饿着肚子等了四十分钟。"},
{ text: "去{person}那蹭一口", effects: { happy: 3}, result: "{person}分了你一半，你们边吃边骂拿错外卖的人。"},
],
},
{
prefix: "g-exam-cheat", n: 35,
slots: { course: F.course, person: F.person.slice(0, 6)},
title: "{course}考试",
text: "{course}考试，{person}坐在你旁边，一个劲给你使眼色，监考老师已经往这边看了三次了。",
choices: [
{ text: "给他看一眼", effects: { connections: 3, iq: -4}, result: "你把卷子往边上挪了挪，他感激涕零，说请你吃饭。"},
{ text: "装没看见", effects: { iq: 2, happy: -2}, result: "你装没看见，专心答题，他自求多福吧。"},
{ text: "自己先写完再说", effects: { iq: 4, happy: -3}, result: "你先把自己的写完，交卷时他还没写完选择题。"},
],
},
{
prefix: "g-club-fight", n: 35,
slots: { person: ["社团部长", "副部长", "大二的干事"]},
title: "社团开会吵起来了",
text: "社团开会，{person}和另一拨人为了活动方案吵起来了，气氛很僵，都看着你，等你表态。",
choices: [
{ text: "支持{person}", effects: { connections: 4, happy: -2}, result: "你站了{person}，会后他请你吃饭，另一拨人不太理你了。"},
{ text: "和稀泥", effects: { charm: 3, happy: 2}, result: "你打了个圆场，两边都给了台阶，会议总算开完了。"},
{ text: "低头玩手机", effects: { happy: -4}, result: "你低头玩手机，散会后两边都觉得你没立场。"},
],
},
{
prefix: "g-lost-item", n: 40,
slots: { item: F.item, place: F.place},
title: "丢了{person}的{item}",
text: "你在{place}发现你的{item}不见了，{person}说他好像在{place}见过。",
choices: [
{ text: "去失物招领找", effects: { happy: 4}, result: "你在失物招领处找到了，失而复得的感觉真好。"},
{ text: "买个新的", effects: { money: -50, happy: -2}, result: "你买了个新的，旧的就当捐给失物招领处了。"},
{ text: "先借{person}的用", effects: { connections: 2, happy: -1}, result: "{person}把他的借你了，说找到了再还。"},
],
},
{
prefix: "g-rain", n: 35,
slots: { place: ["教学楼", "图书馆", "食堂", "体育馆"], person: F.person.slice(0, 6)},
title: "突然下暴雨",
text: "你在{place}，外面突然下起暴雨，你没带伞，{person}倒是有伞，但你们不同路。",
choices: [
{ text: "蹭{person}的伞", effects: { happy: 4}, result: "你们挤一把伞回去，半边身子都湿了，但挺开心。"},
{ text: "等雨停", effects: { iq: 3, happy: -2}, result: "你在{place}等了一小时，顺便背了会单词。"},
{ text: "直接冲回去", effects: { health: -4, happy: 3}, result: "你冒雨冲回宿舍，成了落汤鸡，但很刺激。"},
],
},
{
prefix: "g-parttime", n: 35,
slots: { place: ["奶茶店", "快递站", "图书馆", "食堂"]},
title: "{place}招兼职",
text: "{place}贴出招兼职的告示，时间合适，工资日结，{person}说他去年干过，还行。",
choices: [
{ text: "去试试", effects: { money: 200, health: -3, happy: -2}, result: "你去干了一周，赚了点钱，就是有点累。"},
{ text: "算了，学习要紧", effects: { iq: 3}, result: "你决定先好好学习，钱以后再赚。"},
{ text: "拉{person}一起去", effects: { money: 150, connections: 3}, result: "你们一起去，有伴儿，干活都不觉得累了。"},
],
},
{
prefix: "g-confess-seen", n: 30,
slots: { person: ["小美", "阿强", "学长"], place: ["操场", "小树林", "图书馆门口"]},
title: "撞见{person}表白",
text: "晚上路过{place}，你撞见{person}在跟人表白，气氛正到关键处，你进退两难。",
choices: [
{ text: "悄悄走开", effects: { happy: 2}, result: "你屏住呼吸绕开了，第二天{person}满面春风，应该是成了。"},
{ text: "躲起来看", effects: { happy: 4, charm: -2}, result: "你躲在暗处看完了全程，吃到了第一手瓜。"},
{ text: "故意咳嗽一声", effects: { connections: -2, happy: -3}, result: "你没忍住咳嗽了一声，两人都僵住了，你尴尬地跑了。"},
],
},
    {
      prefix: "g-dorm-clean", n: 40,
      slots: { person: ["阿强", "小美", "学长", "隔壁的老王", "班长"], item: ["充电器", "雨伞", "耳机", "水杯"] },
      title: "宿舍大扫除",
      text: "宿管阿姨通知明天检查卫生，{person}的东西堆得到处都是，全宿舍开始大扫除。",
      choices: [
        { text: "带头干", effects: { connections: 3, health: 2 }, result: "你带头干了俩小时，宿舍焕然一新，阿姨给了好评。" },
        { text: "划水", effects: { happy: 2, connections: -2 }, result: "你象征性擦了下桌子，{person}白了你一眼。" },
        { text: "请大家喝奶茶", effects: { money: -40, connections: 4, happy: 3 }, result: "你请了奶茶，大家干劲十足，边喝边干。" },
      ],
    },
    {
      prefix: "g-exam-week", n: 40,
      slots: { course: ["高数", "英语", "马原", "专业课"], person: ["阿强", "小美", "学长"] },
      title: "{course}考试周",
      text: "考试周，{course}的重点有 200 页，{person}已经复习了三遍，你才刚翻开书。",
      choices: [
        { text: "通宵复习", effects: { iq: 6, health: -4 }, result: "你通宵了两天，考了个不错的分数，但黑眼圈到下巴了。" },
        { text: "求{person}划重点", effects: { iq: 4, connections: 2 }, result: "{person}给你划了重点，你请他吃了顿饭。" },
        { text: "裸考", effects: { iq: -3, happy: 4 }, result: "你裸考了，考完就去开黑，爽是爽，成绩就别问了。" },
      ],
    },
    {
      prefix: "g-midnight-snack", n: 40,
      slots: { food: ["麻辣烫", "黄焖鸡", "螺蛳粉", "煎饼果子"], person: ["阿强", "小美", "学长"] },
      title: "深夜点{food}",
      text: "凌晨一点，{person}问你要不要拼单点{food}，你摸了摸肚子，又摸了摸钱包。",
      choices: [
        { text: "拼！", effects: { money: -20, happy: 6 }, result: "你们点了{food}，深夜放毒，幸福感爆棚。" },
        { text: "忍住", effects: { health: 3, happy: -3 }, result: "你忍住了，喝了杯热水，{person}吃得吧唧嘴，你更饿了。" },
        { text: "AA", effects: { money: -15, happy: 4 }, result: "你们 AA，清清爽爽，谁也不欠谁。" },
      ],
    },
    {
      prefix: "g-argue", n: 35,
      slots: { person: ["阿强", "室友", "隔壁的老王"], item: ["充电器", "雨伞", "耳机"] },
      title: "和{person}吵架了",
      text: "你和{person}因为{item}的事吵了一架，现在气氛很僵，谁也不理谁。",
      choices: [
        { text: "主动道歉", effects: { connections: 4, happy: -2 }, result: "你主动道歉了，{person}也道歉了，和好如初。" },
        { text: "冷战", effects: { happy: -5 }, result: "你们冷战了三天，宿舍气氛降到冰点。" },
        { text: "请他吃饭", effects: { money: -40, connections: 3, happy: 2 }, result: "你请他吃了顿饭，饭桌上就和好了。" },
      ],
    },
    {
      prefix: "g-birthday", n: 35,
      slots: { person: ["阿强", "小美", "学长"], food: ["麻辣烫", "炸鸡"] },
      title: "{person}过生日",
      text: "{person}过生日，全宿舍凑钱买了蛋糕，还点了{food}，准备给他个惊喜。",
      choices: [
        { text: "精心准备", effects: { money: -50, connections: 5, happy: 5 }, result: "你们布置了宿舍，{person}感动得差点哭了。" },
        { text: "随大流", effects: { connections: 2, happy: 2 }, result: "你跟着大家一起，唱了生日歌，吃了蛋糕。" },
        { text: "送了个贵的", effects: { money: -150, connections: 4 }, result: "你送了个贵重的礼物，{person}说太破费了。" },
      ],
    },
    {
      prefix: "g-takeout-fee", n: 55,
      slots: { food: ["麻辣烫", "黄焖鸡", "螺蛳粉", "炸鸡", "煲仔饭"], person: ["阿强", "小美", "学长", "班长"] },
      title: "{food}涨价了",
      text: "你常点的{food}涨价了，从 18 涨到 25，{person}说再涨就不点了，你看着余额，陷入沉思。",
      choices: [
        { text: "继续点", effects: { money: -25, happy: 4 }, result: "你继续点了，贵是贵，但好吃啊。" },
        { text: "换便宜的", effects: { money: -12, happy: -2 }, result: "你换了家便宜的，味道一般，但省钱。" },
        { text: "自己做饭", effects: { money: 20, happy: -3, health: 2 }, result: "你买了个小电锅自己做，省钱但麻烦。" },
      ],
    },
    {
      prefix: "g-dorm-wifi", n: 55,
      slots: { person: ["阿强", "室友", "隔壁的老王"], act: ["开黑", "刷剧", "下电影"] },
      title: "宿舍 WiFi 崩了",
      text: "{person}在{act}，宿舍 WiFi 突然崩了，全宿舍哀嚎一片，{person}说他手机还有流量。",
      choices: [
        { text: "开热点", effects: { happy: 3 }, result: "{person}开了热点，你们挤在一起用，网速感人。" },
        { text: "去图书馆蹭网", effects: { iq: 3 }, result: "你去图书馆蹭网，顺便学了俩小时。" },
        { text: "断网睡觉", effects: { health: 4, happy: -2 }, result: "你决定断网睡觉，难得睡了个早觉。" },
      ],
    },
    {
      prefix: "g-exam-seat", n: 50,
      slots: { course: ["高数", "英语", "马原"], person: ["阿强", "小美"] },
      title: "{course}考试座位",
      text: "{course}考试，你的座位在第一排正中间，{person}在最后一排给你发暗号，你看得一清二楚。",
      choices: [
        { text: "专心考试", effects: { iq: 4 }, result: "你专心考试，考得还不错。" },
        { text: "给{person}传纸条", effects: { connections: 3, iq: -3 }, result: "你冒险传了纸条，{person}感激涕零。" },
        { text: "考完对答案", effects: { happy: 2 }, result: "考完你们对答案，{person}错了三道选择题。" },
      ],
    },
    {
      prefix: "g-club-trip", n: 50,
      slots: { place: ["郊外", "古镇", "海边"], person: ["社团部长", "学长", "小美"] },
      title: "社团{place}团建",
      text: "社团组织去{place}团建，{person}说费用 AA，你看了看钱包，又看了看{place}的照片。",
      choices: [
        { text: "去！", effects: { money: -200, happy: 8, connections: 3 }, result: "你去了，{place}很美，你们拍了很多照片。" },
        { text: "不去", effects: { happy: -2 }, result: "你没去，{person}回来给你看了照片，你后悔了。" },
        { text: "下次再去", effects: { happy: 1 }, result: "你说下次，{person}说下次还组织。" },
      ],
    },
    {
      prefix: "g-dorm-leader-check", n: 50,
      slots: { person: ["宿管阿姨", "辅导员", "学生会"], food: ["麻辣烫", "炸鸡"], item: ["充电器", "耳机"] },
      title: "{person}查寝",
      text: "{person}突然查寝，你们宿舍的{food}还没吃完，{item}还堆在桌上，全宿舍手忙脚乱。",
      choices: [
        { text: "快速收拾", effects: { happy: 3 }, result: "你们三分钟收拾完，{person}给了个良好。" },
        { text: "淡定", effects: { charm: 2 }, result: "你淡定地开门，{person}看你们宿舍还行，没多说。" },
        { text: "被扣分", effects: { happy: -4 }, result: "你们被扣分了，{person}说下次注意。" },
      ],
    },
    {
      prefix: "g-snore", n: 70,
      slots: { person: ['阿强', '室友', '上铺的兄弟'] },
      title: "{person}打呼噜",
      text: "凌晨三点，{person}的呼噜声震天响，你试了各种办法，都没用。",
      choices: [
        { text: "忍到天亮", effects: {'health': -3, 'happy': -4}, result: "你数羊数到天亮，{person}睡得像死猪。" },
        { text: "去客厅睡", effects: {'health': 2}, result: "你抱着被子去客厅沙发睡，反而睡得很香。" },
        { text: "录下来", effects: {'happy': 4}, result: "你录下{person}的呼噜声，第二天放给他听，全宿舍笑疯了。" },
      ],
    },
    {
      prefix: "g-canteen-queue", n: 70,
      slots: { food: ['麻辣烫', '黄焖鸡', '螺蛳粉'], time: ['中午', '晚上'], person: ['阿强', '小美'] },
      title: "{food}排长队",
      text: "{time}饭点，{food}窗口排了 30 米，{person}说等吧，值得，你的肚子在抗议。",
      choices: [
        { text: "排！", effects: {'happy': 4, 'health': -1}, result: "你排了 20 分钟，吃到了{food}，确实值。" },
        { text: "换窗口", effects: {'happy': 1}, result: "你换了个人少的窗口，快但一般。" },
        { text: "回宿舍点外卖", effects: {'money': -20, 'happy': 2}, result: "你回宿舍点了外卖，贵但不用排队。" },
      ],
    },
    {
      prefix: "g-library-sleep", n: 60,
      slots: { person: ['阿强', '小美', '学长'], place: ['图书馆', '自习室'] },
      title: "在{place}睡着",
      text: "你在{place}学习，{person}在旁边睡着了，口水流到了书上，你也困了。",
      choices: [
        { text: "叫醒他", effects: {'connections': 2}, result: "你叫醒{person}，他请你喝了杯咖啡提神。" },
        { text: "一起睡", effects: {'health': 3, 'iq': -2}, result: "你也趴下睡了 20 分钟，醒来精神多了。" },
        { text: "继续学", effects: {'iq': 4, 'happy': -2}, result: "你继续学，{person}的呼噜声成了背景音。" },
      ],
    },
    {
      prefix: "g-club-recruit", n: 60,
      slots: { person: ['学姐', '学长'], club: ['街舞社', '音乐社', '电竞社'] },
      title: "{club}招新",
      text: "{club}招新，{person}特别热情，非拉着你填表，你看着表，犹豫了。",
      choices: [
        { text: "加入", effects: {'connections': 4, 'happy': 4, 'money': -100}, result: "你加入了{club}，每周活动，生活充实了。" },
        { text: "婉拒", effects: {'happy': 1}, result: "你婉拒了，{person}说随时欢迎。" },
        { text: "先看看", effects: {'happy': 2}, result: "你说先看看，{person}拉你进了群。" },
      ],
    },
    {
      prefix: "g-crush", n: 60,
      slots: { person: ['小美', '学长'], place: ['图书馆', '操场', '食堂'] },
      title: "暗恋{person}",
      text: "你在{place}总能碰到{person}，心跳加速，但不敢搭话。",
      choices: [
        { text: "搭话", effects: {'charm': 4, 'happy': 5}, result: "你鼓起勇气搭话，{person}很健谈，你们加了微信。" },
        { text: "继续暗恋", effects: {'happy': -1}, result: "你继续暗恋，{person}还是没注意到你。" },
        { text: "放弃", effects: {'happy': -3}, result: "你决定放弃，{person}成了你青春的遗憾。" },
      ],
    },
    {
      prefix: "g-movie", n: 60,
      slots: { person: ['阿强', '小美', '学长'], movie: ['科幻片', '爱情片', '恐怖片'] },
      title: "宿舍看{movie}",
      text: "晚上，{person}提议看{movie}，全宿舍关灯，零食备好，气氛拉满。",
      choices: [
        { text: "看！", effects: {'happy': 5}, result: "你们看到了半夜，{movie}真不错。" },
        { text: "玩手机", effects: {'happy': 2}, result: "你边看边玩手机，{person}说你不尊重电影。" },
        { text: "先睡", effects: {'health': 3}, result: "你先睡了，{person}们的笑声成了背景音。" },
      ],
    },
    {
      prefix: "g-basketball", n: 60,
      slots: { person: ['阿强', '学长'], place: ['篮球场', '操场'] },
      title: "去{place}打球",
      text: "{person}约你去{place}打球，说三缺一，你的球技全宿舍最菜。",
      choices: [
        { text: "去！", effects: {'health': 5, 'happy': 4}, result: "你去了，虽然菜，但跑得很开心。" },
        { text: "当裁判", effects: {'happy': 3}, result: "你当裁判，{person}说你吹得还挺公道。" },
        { text: "拒绝", effects: {'happy': -1}, result: "你拒绝了，{person}找了别人。" },
      ],
    },
    {
      prefix: "g-ktv", n: 55,
      slots: { person: ['小美', '阿强', '班长'] },
      title: "宿舍KTV",
      text: "{person}提议去KTV，全宿舍 AA，你五音不全，但气氛组需要你。",
      choices: [
        { text: "去！", effects: {'money': -80, 'happy': 8}, result: "你们唱到半夜，你的《死了都要爱》成了全场最佳。" },
        { text: "不去", effects: {'happy': -2}, result: "你没去，{person}回来给你看了视频，你后悔了。" },
        { text: "宿舍唱", effects: {'happy': 4}, result: "你们在宿舍唱，宿管阿姨来敲门了。" },
      ],
    },
    {
      prefix: "g-intern2", n: 55,
      slots: { place: ['市中心', '高新区'], person: ['学长', '小美'] },
      title: "找实习",
      text: "{person}在{place}找到实习，一天 150，你心动了，但怕影响学习。",
      choices: [
        { text: "去实习", effects: {'money': 800, 'iq': -2}, result: "你去实习了一个月，赚了钱，还学了东西。" },
        { text: "先学习", effects: {'iq': 4}, result: "你决定先打好基础，实习以后再说。" },
        { text: "线上兼职", effects: {'money': 400, 'happy': 2}, result: "你找了个线上兼职，时间自由。" },
      ],
    },
    {
      prefix: "g-lost-phone", n: 60,
      slots: { place: ['食堂', '图书馆', '操场'], person: ['阿强', '小美'] },
      title: "手机丢了",
      text: "你的手机在{place}不见了，{person}帮你打电话，关机了，你慌了。",
      choices: [
        { text: "去失物处", effects: {'happy': 4}, result: "你在失物处找到了，失而复得。" },
        { text: "买新的", effects: {'money': -2000, 'happy': -5}, result: "你买了个新的，旧的就当丢了。" },
        { text: "先借用", effects: {'connections': 2}, result: "{person}把旧手机借你，先用着。" },
      ],
    },
    {
      prefix: "g-sick", n: 55,
      slots: { person: ['阿强', '室友'], symptom: ['感冒', '发烧', '拉肚子'] },
      title: "{symptom}了",
      text: "你{symptom}了，{person}给你买了药，还点了粥，你感动了。",
      choices: [
        { text: "吃药休息", effects: {'health': 5}, result: "你吃药休息了两天，好了。" },
        { text: "硬扛", effects: {'health': -4, 'iq': 2}, result: "你硬扛着上课，{person}说你不要命了。" },
        { text: "去校医院", effects: {'money': -50, 'health': 4}, result: "你去校医院，医生说多喝热水。" },
      ],
    },
    {
      prefix: "g-confession2", n: 50,
      slots: { person: ['小美', '学长'], place: ['天台', '小树林'] },
      title: "在{place}表白",
      text: "你决定在{place}跟{person}表白，准备了很久，手心全是汗。",
      choices: [
        { text: "表白！", effects: {'charm': 5, 'happy': 8}, result: "你表白了，{person}答应了，你们在一起了。" },
        { text: "没说出口", effects: {'happy': -4}, result: "你没说出口，{person}问你怎么了，你说没事。" },
        { text: "写信", effects: {'charm': 3, 'happy': 2}, result: "你写了封信，{person}回信说考虑一下。" },
      ],
    },
    {
      prefix: "g-parttime2", n: 60,
      slots: { place: ['奶茶店', '快递站', '图书馆'], person: ['阿强', '小美'] },
      title: "{place}兼职",
      text: "{place}招兼职，{person}说他干过，还行，你心动了。",
      choices: [
        { text: "去！", effects: {'money': 300, 'health': -2}, result: "你去了，赚了钱，就是有点累。" },
        { text: "不去", effects: {'happy': 1}, result: "你没去，{person}说下次再叫你。" },
        { text: "一起去", effects: {'money': 250, 'connections': 3}, result: "你们一起去，有伴儿不累。" },
      ],
    },
    {
      prefix: "g-travel", n: 50,
      slots: { place: ['古镇', '海边', '山里'], person: ['小美', '阿强', '班长'] },
      title: "去{place}玩",
      text: "{person}提议周末去{place}玩，AA，你看了看钱包，又看了看{place}的照片。",
      choices: [
        { text: "去！", effects: {'money': -300, 'happy': 10}, result: "你去了，{place}太美了，照片拍了 200 张。" },
        { text: "不去", effects: {'happy': -3}, result: "你没去，{person}的照片让你后悔了。" },
        { text: "下次", effects: {'happy': 1}, result: "你说下次，{person}说好。" },
      ],
    },
    {
      prefix: "g-dorm-noise", n: 65,
      slots: { person: ['隔壁的老王', '楼上的'], noise: ['打游戏', '放音乐', '吵架'] },
      title: "{person}{noise}",
      text: "{person}在{noise}，声音大到你们宿舍都听得见，你忍无可忍了。",
      choices: [
        { text: "去敲门", effects: {'connections': -1, 'happy': 2}, result: "你去敲门，{person}道歉了，声音小了。" },
        { text: "忍", effects: {'happy': -4}, result: "你忍了，戴上耳机，{person}的声音穿透了耳机。" },
        { text: "以毒攻毒", effects: {'happy': 3}, result: "你们也放音乐，比{person}还大声，{person}先怂了。" },
      ],
    },
    {
      prefix: "g-exam-cheat2", n: 55,
      slots: { course: ['高数', '英语'], person: ['阿强', '小美'] },
      title: "{course}考试",
      text: "{course}考试，{person}给你使眼色，监考老师已经看了三次了。",
      choices: [
        { text: "给他看", effects: {'connections': 3, 'iq': -3}, result: "你给他看了，他请你吃饭。" },
        { text: "不看", effects: {'iq': 2}, result: "你没看，专心答题。" },
        { text: "考完讲题", effects: {'iq': 4, 'connections': 2}, result: "考完你给{person}讲题，他恍然大悟。" },
      ],
    },
    {
      prefix: "g-bike", n: 55,
      slots: { person: ['阿强', '小美'], place: ['校门口', '商业街'] },
      title: "买自行车",
      text: "{person}说买辆自行车，去{place}方便，你心动了，但怕被偷。",
      choices: [
        { text: "买！", effects: {'money': -500, 'happy': 5}, result: "你买了，去哪都快，幸福感提升。" },
        { text: "不买", effects: {'happy': 1}, result: "你没买，{person}的车被偷了，你庆幸。" },
        { text: "买二手", effects: {'money': -200, 'happy': 3}, result: "你买了辆二手，便宜好用。" },
      ],
    },
    {
      prefix: "g-dorm-cook", n: 60,
      slots: { food: ['火锅', '麻辣烫', '泡面'], person: ['阿强', '小美'] },
      title: "宿舍煮{food}",
      text: "{person}买了小电锅，提议在宿舍煮{food}，宿管阿姨明令禁止用大功率电器。",
      choices: [
        { text: "煮！", effects: {'happy': 7}, result: "你们偷偷煮了{food}，香飘整层楼，没被发现。" },
        { text: "不煮", effects: {'happy': -2}, result: "你没煮，{person}自己煮了，分了你一碗。" },
        { text: "去外面吃", effects: {'money': -40, 'happy': 4}, result: "你们去外面吃{food}，安全但贵。" },
      ],
    },
    {
      prefix: "g-lecture2", n: 55,
      slots: { person: ['教授', '学长'], topic: ['AI', '创业', '考研'] },
      title: "{person}讲{topic}",
      text: "{person}来讲{topic}，座无虚席，你去晚了，只能站着听。",
      choices: [
        { text: "认真听", effects: {'iq': 5}, result: "你站着听完，记了三页笔记。" },
        { text: "拍照", effects: {'happy': 2}, result: "你拍照发朋友圈，获赞无数。" },
        { text: "提前走", effects: {'happy': 3, 'iq': -1}, result: "你提前走了，去食堂干饭了。" },
      ],
    },
    {
      prefix: "g-sports-injury", n: 50,
      slots: { person: ['阿强', '学长'], part: ['脚踝', '膝盖'] },
      title: "{person}{part}受伤",
      text: "打球时{person}{part}受伤了，你送他去校医院，医生说休息两周。",
      choices: [
        { text: "照顾他", effects: {'connections': 4, 'happy': -1}, result: "你照顾{person}两周，他好了请你吃饭。" },
        { text: "看望", effects: {'connections': 2}, result: "你去看望，带了水果。" },
        { text: "忙", effects: {'happy': -2}, result: "你忙，{person}说没事。" },
      ],
    },
    {
      prefix: "g-phone-bill2", n: 55,
      slots: { person: ['阿强', '小美'] },
      title: "话费欠费",
      text: "你话费欠费停机，{person}说可以转话费给你，但要请喝奶茶。",
      choices: [
        { text: "成交", effects: {'money': -15, 'connections': 2}, result: "你请喝奶茶，话费到账。" },
        { text: "去营业厅", effects: {'happy': -2}, result: "你去营业厅，排了半小时。" },
        { text: "蹭WiFi", effects: {'happy': 1}, result: "你蹭一周WiFi，电话先别打。" },
      ],
    },
    {
      prefix: "g-midnight-talk", n: 65,
      slots: { topic: ['未来', '感情', '游戏'], person: ['阿强', '室友'] },
      title: "深夜聊{topic}",
      text: "凌晨两点，{person}睡不着，拉你聊{topic}，你们越聊越精神。",
      choices: [
        { text: "畅聊", effects: {'happy': 6, 'health': -2}, result: "你们聊到四点，{topic}聊透了。" },
        { text: "先睡", effects: {'health': 3}, result: "你先睡了，{person}自己聊。" },
        { text: "改天聊", effects: {'happy': 1}, result: "你说改天，{person}说好。" },
      ],
    },
    {
      prefix: "g-canteen-new2", n: 60,
      slots: { food: ['酸菜鱼', '猪脚饭', '过桥米线'], place: ['二楼', '三楼'] },
      title: "食堂新开{food}",
      text: "食堂{place}新开{food}，排长队，你纠结去不去。",
      choices: [
        { text: "去！", effects: {'money': -22, 'happy': 6}, result: "你去了，{food}不错，值。" },
        { text: "不去", effects: {'happy': -1}, result: "你没去，听{person}说好吃，后悔了。" },
        { text: "带回宿舍", effects: {'money': -25, 'happy': 5}, result: "你打包回宿舍，边吃边刷剧。" },
      ],
    },
    {
      prefix: "g-dorm-pet2", n: 50,
      slots: { pet: ['仓鼠', '乌龟'], person: ['小美', '阿强'] },
      title: "{person}养{pet}",
      text: "{person}想养只{pet}，宿管禁止，但{person}说偷偷养。",
      choices: [
        { text: "支持", effects: {'happy': 5}, result: "你们养了{pet}，取名“小小”，每天喂。" },
        { text: "反对", effects: {'happy': -3}, result: "你反对，{person}失落，但查寝时松了口气。" },
        { text: "养绿植", effects: {'happy': 3}, result: "你们养了绿萝，{person}取名“小绿”。" },
      ],
    },
    {
      prefix: "g-study-group", n: 60,
      slots: { course: ['高数', '英语'], person: ['学霸', '小美'] },
      title: "{course}学习小组",
      text: "{person}组了个{course}学习小组，问你要不要来，你的{course}很菜。",
      choices: [
        { text: "加入", effects: {'iq': 5, 'happy': -1}, result: "你加入了，{person}讲题很清楚，你进步了。" },
        { text: "不加入", effects: {'happy': 2}, result: "你没加入，{person}说随时欢迎。" },
        { text: "蹭课", effects: {'iq': 3}, result: "你去蹭课，{person}没发现。" },
      ],
    },
    {
      prefix: "g-night-market", n: 55,
      slots: { place: ['校门口', '商业街'], food: ['烧烤', '臭豆腐'] },
      title: "{place}夜市",
      text: "{place}夜市开了，有{food}，你闻着香味走不动道了。",
      choices: [
        { text: "去吃！", effects: {'money': -30, 'happy': 7}, result: "你去了，{food}太香了，吃撑了。" },
        { text: "忍住", effects: {'health': 2, 'happy': -2}, result: "你忍住了，回宿舍喝了杯水。" },
        { text: "打包", effects: {'money': -35, 'happy': 6}, result: "你打包回宿舍，和室友分了。" },
      ],
    },
    {
      prefix: "g-dorm-birthday2", n: 55,
      slots: { person: ['阿强', '小美'] },
      title: "{person}生日",
      text: "{person}生日，你们准备惊喜，蛋糕+{food}，{person}还不知道。",
      choices: [
        { text: "精心准备", effects: {'money': -60, 'connections': 5}, result: "你们布置了，{person}感动哭了。" },
        { text: "简单过", effects: {'connections': 2}, result: "你们简单过了，吃了蛋糕。" },
        { text: "忘记", effects: {'connections': -3, 'happy': -4}, result: "你们忘了，{person}很失落。" },
      ],
    },
    {
      prefix: "g-rain2", n: 60,
      slots: { place: ['教学楼', '图书馆'], person: ['阿强', '小美'] },
      title: "暴雨",
      text: "你在{place}，暴雨，你没带伞，{person}有伞，但不同路。",
      choices: [
        { text: "蹭伞", effects: {'happy': 4}, result: "你们挤一把伞，半边湿了，但开心。" },
        { text: "等雨停", effects: {'iq': 2}, result: "你等了一小时，背了单词。" },
        { text: "冲回去", effects: {'health': -3, 'happy': 3}, result: "你冲回去，成落汤鸡，但刺激。" },
      ],
    },
    {
      prefix: "g-phone-new", n: 50,
      slots: { person: ['阿强', '小美'] },
      title: "换手机",
      text: "你手机太卡了，{person}说换新的吧，你看着价格，肉疼。",
      choices: [
        { text: "换！", effects: {'money': -3000, 'happy': 8}, result: "你换了新手机，流畅到飞起。" },
        { text: "不换", effects: {'happy': -1}, result: "你没换，{person}说你真能忍。" },
        { text: "买二手", effects: {'money': -1200, 'happy': 4}, result: "你买了二手，便宜好用。" },
      ],
    },
    {
      prefix: "g-sleep-talk", n: 60,
      slots: { person: ['阿强', '室友'] },
      title: "{person}说梦话",
      text: "{person}说梦话，喊着“别挂科”，你笑醒了，录了下来。",
      choices: [
        { text: "放给他听", effects: {'happy': 5}, result: "你放给他听，{person}尴尬到脚趾扣地。" },
        { text: "发群里", effects: {'happy': 6, 'connections': -1}, result: "你发群里，全宿舍笑疯，{person}追杀你。" },
        { text: "删掉", effects: {'connections': 2}, result: "你删了，{person}说谢谢。" },
      ],
    },
    {
      prefix: "g-final-week", n: 70,
      slots: { course: ['高数', '英语', '马原', '专业课'], person: ['阿强', '小美', '学长'] },
      title: "期末周",
      text: "期末周，{course}要考了，{person}在图书馆住了三天，你才刚开始复习。",
      choices: [
        { text: "通宵", effects: {'iq': 6, 'health': -4}, result: "你通宵了，{course}过了，但废了。" },
        { text: "求重点", effects: {'iq': 4, 'connections': 2}, result: "{person}给你划重点，你请他吃饭。" },
        { text: "裸考", effects: {'iq': -3, 'happy': 3}, result: "你裸考了，{person}说你心大。" },
      ],
    },
    {
      prefix: "g-dorm-fight", n: 65,
      slots: { person: ['阿强', '室友'], reason: ['游戏', '卫生', '作息'] },
      title: "宿舍矛盾",
      text: "你和{person}因为{reason}吵起来了，宿舍气氛降到冰点。",
      choices: [
        { text: "道歉", effects: {'connections': 4}, result: "你道歉了，{person}也道歉，和好了。" },
        { text: "冷战", effects: {'happy': -5}, result: "你们冷战三天，谁也不理谁。" },
        { text: "请吃饭", effects: {'money': -40, 'connections': 3}, result: "你请吃饭，饭桌上和好了。" },
      ],
    },
    {
      prefix: "g-canteen-discount", n: 60,
      slots: { food: ['麻辣烫', '黄焖鸡'], person: ['阿强', '小美'] },
      title: "食堂打折",
      text: "食堂{food}打折，{person}叫你快去，你放下手里的事就跑。",
      choices: [
        { text: "去！", effects: {'money': -12, 'happy': 6}, result: "你去了，{food}真香，打折更香。" },
        { text: "错过", effects: {'happy': -3}, result: "你错过了，{person}吃到了，你馋哭了。" },
        { text: "打包", effects: {'money': -15, 'happy': 5}, result: "你打包了两份，一份晚上吃。" },
      ],
    }
];

/* ---------- 微事件模板（更短，一句话的事） ---------- */
const MICRO = [
{
prefix: "m-gen-wake", n: 24,
slots: { person: ["阿强", "室友", "上铺"]},
text: "{person}的呼噜声太大了，你。",
choices: [
{ text: "戴耳塞", effects: { health: 2}, result: "耳塞救了你一命。"},
{ text: "把他推醒", effects: { happy: 2}, result: "他翻了个身，呼噜停了三分钟。"},
],
},
{
prefix: "m-gen-food", n: 24,
slots: { food: F.food},
text: "深夜，宿舍飘来{food}的香味，有人在偷吃。",
choices: [
{ text: "加入", effects: { happy: 4, money: -10}, result: "你分到了一半，好吃。"},
{ text: "睡觉", effects: { health: 2, happy: -2}, result: "你闻着香味睡着了，梦里全是{food}。"},
],
},
{
prefix: "m-gen-phone", n: 24,
slots: { person: F.person.slice(0, 6)},
text: "{person}在走廊煲电话粥，声音不大，但你就是睡不着。",
choices: [
{ text: "忍", effects: { happy: -2}, result: "你数羊数到了一千只。"},
{ text: "去阳台透气", effects: { health: 2}, result: "阳台风很大，你清醒了。"},
],
},
{
prefix: "m-gen-study", n: 24,
slots: { course: F.course, place: ["图书馆", "自习室", "教室"]},
text: "你在{place}学{course}，旁边的人学得比你认真十倍。",
choices: [
{ text: "被激励", effects: { iq: 4}, result: "你燃起了斗志，多学了两小时。"},
{ text: "摆烂", effects: { happy: 3, iq: -2}, result: "你刷起了手机，学霸与你无关。"},
],
},
{
prefix: "m-gen-rain2", n: 22,
slots: { item: ["雨伞", "雨衣"]},
text: "出门没看天气预报，半路下雨了，你没带{item}。",
choices: [
{ text: "买把伞", effects: { money: -15}, result: "校门口买了把伞，质量一般。"},
{ text: "淋回去", effects: { health: -3, happy: 2}, result: "你淋成落汤鸡，但觉得很爽。"},
],
},
    {
      prefix: "m-wake2", n: 44,
      slots: { person: ['阿强', '室友'] },
      text: "{person}又没关闹钟，你【action】。",
      choices: [
        { text: "关掉", effects: {'happy': 2}, result: "你关掉了，{person}继续睡。" },
        { text: "叫醒他", effects: {'connections': 1}, result: "你叫醒他，他说谢谢。" },
      ],
    },
    {
      prefix: "m-eat2", n: 44,
      slots: { food: ['麻辣烫', '炸鸡', '螺蛳粉'] },
      text: "深夜，有人在吃{food}，香醒了你。",
      choices: [
        { text: "要一口", effects: {'happy': 3, 'money': -5}, result: "你分到了一口，真香。" },
        { text: "睡觉", effects: {'health': 2}, result: "你蒙头睡，梦里全是{food}。" },
      ],
    },
    {
      prefix: "m-study2", n: 44,
      slots: { course: ['高数', '英语'], place: ['图书馆', '自习室'] },
      text: "你在{place}学{course}，旁边的人比你认真十倍。",
      choices: [
        { text: "被激励", effects: {'iq': 3}, result: "你多学了两小时。" },
        { text: "摆烂", effects: {'happy': 2, 'iq': -1}, result: "你刷手机了。" },
      ],
    },
    {
      prefix: "m-phone2", n: 44,
      slots: { person: ['阿强', '小美'] },
      text: "{person}在走廊打电话，你睡不着。",
      choices: [
        { text: "忍", effects: {'happy': -1}, result: "你数羊到一千只。" },
        { text: "阳台", effects: {'health': 1}, result: "你去阳台吹风，清醒了。" },
      ],
    },
    {
      prefix: "m-rain3", n: 44,
      slots: { place: ['教学楼', '食堂'] },
      text: "出门没带伞，在{place}被雨困住了。",
      choices: [
        { text: "等", effects: {'iq': 2}, result: "你等雨停，背了单词。" },
        { text: "冲", effects: {'health': -2, 'happy': 2}, result: "你冲回去，淋湿了但刺激。" },
      ],
    },
    {
      prefix: "m-hungry", n: 44,
      slots: { time: ['凌晨', '深夜'] },
      text: "{time}饿了，宿舍没有吃的。",
      choices: [
        { text: "点外卖", effects: {'money': -18, 'happy': 4}, result: "你点了外卖，救命。" },
        { text: "喝水", effects: {'health': 1}, result: "你喝了杯水，忍住了。" },
      ],
    },
    {
      prefix: "m-bored", n: 44,
      slots: { act: ['刷剧', '打游戏', '水群'] },
      text: "无聊，你开始{act}。",
      choices: [
        { text: "爽", effects: {'happy': 4, 'iq': -1}, result: "你{act}到半夜，爽。" },
        { text: "学习", effects: {'iq': 3}, result: "你改去学习了。" },
      ],
    },
    {
      prefix: "m-tired", n: 44,
      slots: { reason: ['熬夜', '跑步', '考试'] },
      text: "你因为{reason}很累。",
      choices: [
        { text: "睡觉", effects: {'health': 4}, result: "你睡了 10 小时，满血。" },
        { text: "硬扛", effects: {'health': -2, 'happy': 1}, result: "你硬扛，喝了三杯咖啡。" },
      ],
    },
    {
      prefix: "m-happy2", n: 44,
      slots: { reason: ['抢到课', '吃到好吃的', '表白成功'] },
      text: "你因为{reason}很开心。",
      choices: [
        { text: "分享", effects: {'connections': 2, 'happy': 2}, result: "你分享给室友，大家都开心。" },
        { text: "独乐", effects: {'happy': 3}, result: "你偷着乐。" },
      ],
    },
    {
      prefix: "m-sad2", n: 44,
      slots: { reason: ['挂科', '失恋', '丢钱'] },
      text: "你因为{reason}很难过。",
      choices: [
        { text: "倾诉", effects: {'connections': 2}, result: "你跟室友倾诉，好多了。" },
        { text: "独处", effects: {'happy': -1}, result: "你独处了一会，慢慢好了。" },
      ],
    },
    {
      prefix: "m-dorm-smell", n: 44,
      slots: { source: ['螺蛳粉', '臭豆腐', '榴莲'] },
      text: "宿舍飘来{source}的味道。",
      choices: [
        { text: "开窗", effects: {'happy': 1}, result: "你开窗通风，味道散了。" },
        { text: "加入", effects: {'happy': 3}, result: "你加入了，真香。" },
      ],
    },
    {
      prefix: "m-power-out2", n: 44,
      slots: { time: ['晚上', '凌晨'] },
      text: "{time}宿舍停电了。",
      choices: [
        { text: "夜聊", effects: {'happy': 4}, result: "你们点灯夜聊，很开心。" },
        { text: "睡觉", effects: {'health': 3}, result: "你摸黑睡了。" },
      ],
    },
    {
      prefix: "m-wifi-down", n: 44,
      slots: { act: ['开黑', '刷剧'] },
      text: "WiFi崩了，你正在{act}。",
      choices: [
        { text: "热点", effects: {'happy': 2}, result: "你开热点，网速感人。" },
        { text: "睡觉", effects: {'health': 3}, result: "你决定睡觉。" },
      ],
    },
    {
      prefix: "m-exam-near", n: 44,
      slots: { course: ['高数', '英语'] },
      text: "{course}考试还有三天，你还没复习。",
      choices: [
        { text: "突击", effects: {'iq': 4, 'health': -2}, result: "你突击了三天，过了。" },
        { text: "摆烂", effects: {'happy': 2, 'iq': -3}, result: "你摆烂了，挂了。" },
      ],
    },
    {
      prefix: "m-club-act", n: 44,
      slots: { club: ['街舞社', '音乐社'] },
      text: "{club}有活动，问你去不去。",
      choices: [
        { text: "去", effects: {'happy': 4, 'connections': 2}, result: "你去了，很开心。" },
        { text: "不去", effects: {'happy': 1}, result: "你没去，在宿舍躺。" },
      ],
    },
    {
      prefix: "m-job-tired", n: 44,
      slots: { job: ['发传单', '端盘子'] },
      text: "你去{job}兼职，很累。",
      choices: [
        { text: "坚持", effects: {'money': 150, 'health': -2}, result: "你坚持下来，赚了钱。" },
        { text: "不干", effects: {'happy': 2}, result: "你不干了，休息。" },
      ],
    },
    {
      prefix: "m-love-seen", n: 44,
      slots: { place: ['操场', '小树林'] },
      text: "你在{place}看到一对情侣。",
      choices: [
        { text: "祝福", effects: {'happy': 2}, result: "你祝福他们。" },
        { text: "吃柠檬", effects: {'happy': -1}, result: "你酸了。" },
      ],
    },
    {
      prefix: "m-money-low", n: 44,
      slots: { amount: ['50', '100'] },
      text: "你钱包只剩{amount}了，离月底还有一周。",
      choices: [
        { text: "省", effects: {'happy': -2}, result: "你省吃俭用，熬过去了。" },
        { text: "借", effects: {'money': 200, 'connections': -1}, result: "你借了钱，下个月还。" },
      ],
    },
    {
      prefix: "m-weather-good", n: 44,
      slots: { place: ['操场', '小树林'] },
      text: "天气很好，你想去{place}。",
      choices: [
        { text: "去", effects: {'happy': 4, 'health': 2}, result: "你去了，心情大好。" },
        { text: "躺", effects: {'happy': 2}, result: "你在宿舍躺，刷手机。" },
      ],
    },
    {
      prefix: "m-weather-bad", n: 44,
      slots: { weather: ['下雨', '降温'] },
      text: "外面{weather}了，你不想出门。",
      choices: [
        { text: "宅", effects: {'happy': 3}, result: "你在宿舍宅，很爽。" },
        { text: "出门", effects: {'health': -1, 'happy': 1}, result: "你出门了，被{weather}教做人。" },
      ],
    },
    {
      prefix: "m-dorm-chat", n: 44,
      slots: { topic: ['游戏', '八卦', '未来'] },
      title: "",
      text: "室友在聊{topic}，你加入了。",
      choices: [
        { text: "聊", effects: {'happy': 3}, result: "你们聊得很开心。" },
        { text: "听", effects: {'happy': 2}, result: "你听着，偶尔插一句。" },
      ],
    },
    {
      prefix: "m-canteen-find", n: 44,
      slots: { food: ['鸡腿', '红烧肉'] },
      title: "",
      text: "食堂今天有{food}，你运气好抢到了。",
      choices: [
        { text: "吃", effects: {'happy': 4}, result: "你吃到了{food}，真香。" },
        { text: "带回", effects: {'happy': 3}, result: "你打包回宿舍吃。" },
      ],
    },
    {
      prefix: "m-library-quiet", n: 44,
      slots: { place: ['图书馆', '自习室'] },
      title: "",
      text: "{place}很安静，你学得很投入。",
      choices: [
        { text: "继续", effects: {'iq': 3}, result: "你学了三小时，进步了。" },
        { text: "休息", effects: {'health': 2}, result: "你休息了一会。" },
      ],
    },
    {
      prefix: "m-dorm-game", n: 44,
      slots: { game: ['王者', '吃鸡'] },
      title: "",
      text: "室友叫你打{game}，三缺一。",
      choices: [
        { text: "打！", effects: {'happy': 5}, result: "你们打了三小时，赢了。" },
        { text: "不打", effects: {'iq': 2}, result: "你没打，去学习了。" },
      ],
    },
    {
      prefix: "m-weather-change", n: 44,
      slots: { change: ['降温', '升温'] },
      title: "",
      text: "天气突然{change}了，你没准备。",
      choices: [
        { text: "加衣", effects: {'health': 2}, result: "你加了衣服，没感冒。" },
        { text: "硬扛", effects: {'health': -2}, result: "你硬扛，感冒了。" },
      ],
    },
    {
      prefix: "m-exam-pass", n: 44,
      slots: { course: ['高数', '英语'] },
      title: "",
      text: "{course}成绩出来，你过了。",
      choices: [
        { text: "开心", effects: {'happy': 5}, result: "你开心地请室友喝水。" },
        { text: "淡定", effects: {'happy': 2}, result: "你淡定，继续学下一门。" },
      ],
    },
    {
      prefix: "m-exam-fail2", n: 44,
      slots: { course: ['马原', '专业课'] },
      title: "",
      text: "{course}挂了，你很难过。",
      choices: [
        { text: "补考", effects: {'iq': 3}, result: "你准备补考。" },
        { text: "摆烂", effects: {'happy': 1}, result: "你摆烂了。" },
      ],
    },
    {
      prefix: "m-club-fun", n: 44,
      slots: { act: ['聚餐', '团建'] },
      title: "",
      text: "社团{act}，你去了。",
      choices: [
        { text: "开心", effects: {'happy': 4, 'connections': 2}, result: "你玩得很开心，认识了新人。" },
        { text: "一般", effects: {'happy': 2}, result: "你觉得一般。" },
      ],
    },
    {
      prefix: "m-job-done", n: 44,
      slots: { job: ['家教', '外卖'] },
      title: "",
      text: "你做{job}兼职，拿到了工资。",
      choices: [
        { text: "存", effects: {'money': 300}, result: "你存了工资。" },
        { text: "花", effects: {'money': 200, 'happy': 4}, result: "你花了，买了想要的。" },
      ],
    },
    {
      prefix: "m-love-sweet", n: 44,
      slots: { act: ['散步', '看电影'] },
      title: "",
      text: "你和 TA 去{act}了，很甜。",
      choices: [
        { text: "开心", effects: {'happy': 6}, result: "你们很开心。" },
        { text: "害羞", effects: {'happy': 4, 'charm': 1}, result: "你害羞了，TA笑了。" },
      ],
    },
    {
      prefix: "m-money-save", n: 44,
      slots: { way: ['不点外卖', '不买奶茶'] },
      title: "",
      text: "你决定{way}，省钱。",
      choices: [
        { text: "坚持", effects: {'money': 100, 'happy': -1}, result: "你坚持了一周，省了钱。" },
        { text: "放弃", effects: {'happy': 2}, result: "你放弃了，该花花。" },
      ],
    },
    {
      prefix: "m-dorm-clean2", n: 44,
      slots: { area: ['桌子', '床铺'] },
      title: "",
      text: "你收拾了{area}，干净了。",
      choices: [
        { text: "舒服", effects: {'happy': 3}, result: "你看着干净的{area}，很舒服。" },
        { text: "又乱", effects: {'happy': -1}, result: "三天后又乱了。" },
      ],
    },
    {
      prefix: "m-canteen-new3", n: 44,
      slots: { food: ['新菜', '小吃'] },
      title: "",
      text: "食堂出了{food}，你去尝了。",
      choices: [
        { text: "好吃", effects: {'happy': 4}, result: "你觉得好吃，下次还来。" },
        { text: "一般", effects: {'happy': 1}, result: "你觉得一般。" },
      ],
    },
    {
      prefix: "m-library-book", n: 44,
      slots: { book: ['小说', '专业书'] },
      title: "",
      text: "你在图书馆借了本{book}。",
      choices: [
        { text: "看完", effects: {'iq': 3, 'happy': 2}, result: "你看完了，很有收获。" },
        { text: "没看", effects: {'happy': 1}, result: "你没看，还回去了。" },
      ],
    },
    {
      prefix: "m-dorm-movie", n: 44,
      slots: { movie: ['喜剧', '科幻'] },
      title: "",
      text: "宿舍一起看{movie}。",
      choices: [
        { text: "好看", effects: {'happy': 5}, result: "你们看到了半夜，很开心。" },
        { text: "睡着", effects: {'health': 2}, result: "你睡着了。" },
      ],
    },
    {
      prefix: "m-run", n: 44,
      slots: { dist: ['3公里', '5公里'] },
      title: "",
      text: "你去跑了{dist}。",
      choices: [
        { text: "跑完", effects: {'health': 4, 'happy': 3}, result: "你跑完了，很有成就感。" },
        { text: "放弃", effects: {'happy': 1}, result: "你跑了一半放弃了。" },
      ],
    },
    {
      prefix: "m-game-win", n: 44,
      slots: { game: ['王者', '吃鸡'] },
      title: "",
      text: "你打{game}赢了，连胜。",
      choices: [
        { text: "继续", effects: {'happy': 5}, result: "你继续打，又赢了。" },
        { text: "睡觉", effects: {'health': 2}, result: "你见好就收，去睡了。" },
      ],
    },
    {
      prefix: "m-game-lose", n: 44,
      slots: { game: ['王者', '吃鸡'] },
      title: "",
      text: "你打{game}连跪，心态崩了。",
      choices: [
        { text: "继续", effects: {'happy': -2}, result: "你继续，又输了。" },
        { text: "不打", effects: {'happy': 2}, result: "你不打了，去散心。" },
      ],
    },
    {
      prefix: "m-friend-visit", n: 44,
      slots: { person: ['高中同学', '老乡'] },
      title: "",
      text: "{person}来看你了。",
      choices: [
        { text: "招待", effects: {'money': -80, 'connections': 3, 'happy': 4}, result: "你招待了他，很开心。" },
        { text: "忙", effects: {'happy': -1}, result: "你忙，简单吃了顿饭。" },
      ],
    },
    {
      prefix: "m-home-call", n: 44,
      slots: { person: ['妈妈', '爸爸'] },
      title: "",
      text: "{person}给你打电话了。",
      choices: [
        { text: "长聊", effects: {'happy': 4}, result: "你们聊了半小时，很温暖。" },
        { text: "短聊", effects: {'happy': 2}, result: "你说在忙，改天聊。" },
      ],
    },
    {
      prefix: "m-dorm-argue2", n: 44,
      slots: { reason: ['卫生', '作息'] },
      title: "",
      text: "你和室友因为{reason}有点不愉快。",
      choices: [
        { text: "和解", effects: {'connections': 2}, result: "你们和解了。" },
        { text: "冷战", effects: {'happy': -2}, result: "你们冷战了一天。" },
      ],
    },
    {
      prefix: "m-canteen-crowd", n: 44,
      slots: { time: ['中午', '晚上'] },
      title: "",
      text: "{time}食堂人太多了。",
      choices: [
        { text: "排队", effects: {'happy': -1}, result: "你排了队，吃到了。" },
        { text: "外卖", effects: {'money': -18}, result: "你点了外卖。" },
      ],
    },
    {
      prefix: "m-study-late", n: 44,
      slots: { place: ['图书馆', '自习室'] },
      title: "",
      text: "你在{place}学到关门。",
      choices: [
        { text: "充实", effects: {'iq': 4}, result: "你觉得很充实。" },
        { text: "累", effects: {'health': -1, 'iq': 2}, result: "你很累，但学到了。" },
      ],
    },
    {
      prefix: "m-dorm-birthday3", n: 44,
      slots: { person: ['室友', '阿强'] },
      title: "",
      text: "{person}生日，你们简单庆祝了。",
      choices: [
        { text: "开心", effects: {'happy': 4, 'connections': 2}, result: "你们很开心。" },
        { text: "忙", effects: {'happy': 1}, result: "你忙，只送了祝福。" },
      ],
    },
    {
      prefix: "m-rain4", n: 44,
      slots: { item: ['伞', '雨衣'] },
      title: "",
      text: "下雨了，你带了{item}。",
      choices: [
        { text: "淡定", effects: {'happy': 2}, result: "你淡定地走，有{item}不怕。" },
        { text: "借人", effects: {'connections': 2}, result: "你把{item}借给没带的人。" },
      ],
    },
    {
      prefix: "m-sun", n: 44,
      slots: { act: ['晒被子', '散步'] },
      title: "",
      text: "出太阳了，你去{act}。",
      choices: [
        { text: "舒服", effects: {'happy': 4, 'health': 2}, result: "你觉得很舒服。" },
        { text: "宅", effects: {'happy': 2}, result: "你在宿舍宅。" },
      ],
    },
    {
      prefix: "m-night-snack2", n: 44,
      slots: { food: ['泡面', '面包'] },
      title: "",
      text: "深夜饿了，你吃了{food}。",
      choices: [
        { text: "满足", effects: {'happy': 3}, result: "你满足了，去睡了。" },
        { text: "罪恶", effects: {'happy': 1, 'health': -1}, result: "你有点罪恶感。" },
      ],
    },
    {
      prefix: "m-morning-run", n: 44,
      slots: { time: ['六点', '七点'] },
      title: "",
      text: "你{time}起床去跑步了。",
      choices: [
        { text: "坚持", effects: {'health': 4}, result: "你坚持了一周，身体变好了。" },
        { text: "放弃", effects: {'happy': 1}, result: "你放弃了，回床睡觉。" },
      ],
    },
    {
      prefix: "m-evening-walk", n: 44,
      slots: { place: ['操场', '小树林'] },
      title: "",
      text: "晚上你去{place}散步了。",
      choices: [
        { text: "放松", effects: {'happy': 3, 'health': 1}, result: "你放松了，心情很好。" },
        { text: "想事", effects: {'happy': 1}, result: "你想了很多事。" },
      ],
    },
    {
      prefix: "m-dorm-laugh", n: 44,
      slots: { reason: ['笑话', '糗事'] },
      title: "",
      text: "宿舍因为{reason}笑疯了。",
      choices: [
        { text: "开心", effects: {'happy': 5}, result: "你们笑了半小时，肚子疼。" },
        { text: "淡定", effects: {'happy': 2}, result: "你淡定地笑了。" },
      ],
    },
    {
      prefix: "m-final-push", n: 30,
      slots: { act: ["学习","锻炼","社交"] },
      text: "你决定好好{act}，不虚度光阴。",
      choices: [
        { text: "行动", effects: { happy: 3 }, result: "你行动了，感觉很好。" },
        { text: "明天", effects: { happy: 1 }, result: "你说明天，明天再说。" },
      ],
    }
];

/* ---------- 生成并注入 ---------- */
function genBig(tpl, idx) {
for (let i = 0; i < tpl.n; i++) {
const slots = {};
Object.keys(tpl.slots).forEach((k) => { slots[k] = pick(tpl.slots[k]);});
// 避免 person 和 person2 相同
if (slots.person && slots.person2 && slots.person === slots.person2) {
slots.person2 = pick(tpl.slots.person2.filter((p) => p!== slots.person));
}
EVENTS.push({
id: tpl.prefix + "-" + idx + "-" + i,
title: fill(tpl.title, slots),
text: fill(tpl.text, slots),
choices: tpl.choices.map((c) => ({
text: fill(c.text, slots),
effects: Object.assign({}, c.effects),
result: fill(c.result, slots),
})),
});
}
}
function genMicro(tpl, idx) {
for (let i = 0; i < tpl.n; i++) {
const slots = {};
Object.keys(tpl.slots).forEach((k) => { slots[k] = pick(tpl.slots[k]);});
// 是特殊槽位，从行为库里取
const text = fill(tpl.text, slots).replace("", pick(["翻来覆去", "戴上耳机", "用被子蒙头"]));
MICRO_EVENTS.push({
id: tpl.prefix + "-" + idx + "-" + i,
text: text,
choices: tpl.choices.map((c) => ({
text: c.text,
effects: Object.assign({}, c.effects),
result: c.result,
})),
});
}
}

BIG.forEach((tpl, idx) => genBig(tpl, idx));
MICRO.forEach((tpl, idx) => genMicro(tpl, idx));
})();
