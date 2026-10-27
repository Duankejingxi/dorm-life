// 宿舍人生 · 内容数据：每学期的行动、随机事件、结局
// 数值都是“变化量”，正数加、负数减；金钱单位是元，学分没有上限

// 每学期先选一个行动
const ACTIONS = [
  { id: "study", icon: "📚", name: "上课学习", desc: "认真听课，泡图书馆。智力、学分涨，快乐掉一点。",
    effects: { iq: 8, credits: 6, happy: -5 }, variance: 2,
    log: ["这学期你泡在图书馆，笔记记得满满当当。", "这学期你上课坐第一排，老师都记住你了。"] },
  { id: "work", icon: "💰", name: "打工赚钱", desc: "发传单、做家教、跑腿。钱多了，人累点。",
    effects: { money: 750, health: -5, happy: -4, iq: -2 }, variance: 2, moneyVariance: 100,
    log: ["这学期你打了不少零工，钱包鼓了一点，人也累了一点。", "这学期你一边上课一边打工，月底数钱的时候笑了。"] },
  { id: "gym", icon: "🏋️", name: "健身运动", desc: "跑步、撸铁、打球。身体好了，气质也好了，就是费钱。",
    effects: { health: 8, charm: 5, money: -100, happy: 3 }, variance: 2,
    log: ["这学期你天天泡操场，体测轻轻松松。", "这学期你练出了线条，走路都带风。"] },
  { id: "game", icon: "🎮", name: "打游戏", desc: "开黑、上分、通宵。快乐拉满，脑子放假。",
    effects: { happy: 10, iq: -4, credits: -2, money: -100 }, variance: 2,
    log: ["这学期你上分如喝水，快乐得冒泡。", "这学期你游戏里风生水起，现实里作业堆成山。"] },
  { id: "social", icon: "🎉", name: "社交聚会", desc: "社团、聚餐、认识新朋友。魅力涨，钱包瘪。",
    effects: { charm: 8, happy: 6, money: -200 }, variance: 2,
    log: ["这学期你认识了一大圈人，朋友圈热闹得很。", "这学期你饭局不断，人缘越来越好。"] },
  { id: "slack", icon: "😴", name: "摆烂躺平", desc: "不卷了。睡到自然醒，快乐最重要。",
    effects: { happy: 6, health: -3, iq: -3 }, variance: 2,
    log: ["这学期你彻底躺平，睡了个痛快。", "这学期你把“松弛感”贯彻到底。"] },
];

// 随机事件：year 不填就是任何学年都能遇到；choices 里每个选项有固定效果和一句话结果
// 有 odds 的选项是赌一把：按概率出 win / lose 两种结果
const EVENTS = [
  { id: "roommate-game", title: "室友半夜开黑", text: "凌晨两点，室友打游戏喊得整层楼都听得见，隔壁已经来敲过一次门了。",
    choices: [
      { text: "加入他，一起开黑", effects: { happy: 8, iq: -3 }, result: "你加入了战局，五杀到手，天亮了才睡。" },
      { text: "让他小声点", effects: { health: 4, happy: -3 }, result: "他答应了，但每死一次还是忍不住喊一嗓子。" },
      { text: "戴上耳机，忍了", effects: { iq: 3, happy: -4 }, result: "你戴上耳机刷题，耳机里全是他的喊声。" },
    ] },
  { id: "malatang", title: "食堂新开麻辣烫", text: "食堂二楼新开了一家麻辣烫，门口排起了长队，香味飘到了宿舍楼。",
    choices: [
      { text: "去尝尝", effects: { money: -25, happy: 8 }, result: "真香。就是有点辣，你喝了三瓶水。" },
      { text: "省钱，吃泡面", effects: { money: 0, happy: -3, health: -2 }, result: "泡面就咸菜，这顿吃得有点心酸。" },
    ] },
  { id: "club", title: "社团招新", text: "社团招新摆摊，街舞社的学姐特别热情，非拉着你试跳一段。",
    choices: [
      { text: "加入街舞社", effects: { charm: 6, happy: 6, money: -100 }, result: "你入了社，每周排练，跳得有模有样。" },
      { text: "婉拒了", effects: { happy: 2 }, result: "你笑着婉拒，学姐说随时欢迎你来玩。" },
    ] },
  { id: "lost-card", title: "捡到一张校园卡", text: "路上捡到一张校园卡，里面好像还有不少钱，失主肯定急坏了。",
    choices: [
      { text: "交到失物招领", effects: { charm: 6, happy: 5 }, result: "失主找回卡，特意跑来谢你，还请你喝了奶茶。" },
      { text: "先充了饭卡再说", effects: { money: 80, charm: -8, happy: -2 }, result: "你花了里面的钱，爽了一顿，心里有点不得劲。" },
    ] },
  { id: "basketball", title: "被拉去凑数打篮球", text: "班里打篮球缺一个人，全班都看向你，逃不掉了。",
    choices: [
      { text: "硬着头皮上", effects: { health: 5, charm: 5, happy: 3 }, result: "你居然进了两个球，全场为你鼓掌。" },
      { text: "装病溜了", effects: { charm: -4, happy: 3 }, result: "你捂着肚子溜了，队友在群里发了个鄙视的表情。" },
    ] },
  { id: "roll-call", title: "选修课突然点名", text: "选修课老师突然点名，点到你的时候，你人还在宿舍。",
    choices: [
      { text: "找人代答", effects: { charm: 4, happy: 4 }, result: "室友帮你喊了到，声音抖得全班都听出来了。" },
      { text: "老实承认没来", effects: { charm: 3, happy: -5 }, result: "你老实承认，老师说下不为例，这次算你运气好。" },
      { text: "翻墙进教室", effects: { happy: 6, health: -3 }, result: "你翻墙进去，正好赶上点名，裤子刮了个口子。" },
    ] },
  { id: "double11", title: "双十一", text: "购物车里躺着 2000 块的东西，尾款人狂欢夜，手指已经放在付款键上了。",
    choices: [
      { text: "剁手，全买了", effects: { money: -1200, happy: 12 }, result: "快递陆续到了，拆箱一时爽，月底吃土火葬场。" },
      { text: "只买必需品", effects: { money: -200, happy: 4 }, result: "你克制地买了两件必需品，居然有点成就感。" },
      { text: "忍住，一分不花", effects: { happy: -5, iq: 2 }, result: "你忍住了，省了钱，但刷了一晚上别人的开箱视频。" },
    ] },
  { id: "cat", title: "隔壁宿舍养猫", text: "隔壁宿舍偷偷养了只猫，被宿管发现了，整层楼都在议论。",
    choices: [
      { text: "帮他们打掩护", effects: { charm: 5, happy: 6 }, result: "你帮着把猫藏进了衣柜，猫在你怀里打呼噜。" },
      { text: "顺便去撸猫", effects: { happy: 8 }, result: "你去撸了一下午猫，毛茸茸的，值了。" },
      { text: "装作不知道", effects: { happy: -2 }, result: "你装作不知道，猫叫了一晚上，你也没睡好。" },
    ] },
  { id: "final-week", title: "期末周", text: "期末周到了，室友已经通宵三天复习，图书馆连站票都没了。",
    choices: [
      { text: "跟着卷", effects: { iq: 6, credits: 4, health: -6 }, result: "你跟着卷了三天，考完走出考场，腿都是软的。" },
      { text: "该睡睡", effects: { health: 5, happy: 4, iq: -4 }, result: "你睡了个好觉，考试全靠平时的积累和一点运气。" },
    ] },
  { id: "blackout", title: "宿舍停电", text: "宿舍突然停电，手机只剩 5% 的电，外面还下着雨。",
    choices: [
      { text: "去图书馆蹭电", effects: { iq: 4, happy: 3 }, result: "图书馆灯火通明，你顺便看了一小时书。" },
      { text: "黑灯瞎火聊天", effects: { charm: 5, happy: 6 }, result: "全宿舍摸黑聊天，聊到了半夜，关系更好了。" },
      { text: "直接睡觉", effects: { health: 6 }, result: "你直接睡了，难得睡了个整觉。" },
    ] },
  { id: "military", title: "军训", text: "军训站军姿，太阳毒得很，教官说谁动一下全排加练十分钟。", year: 1,
    choices: [
      { text: "认真站军姿", effects: { health: 6, charm: 4 }, result: "你站得笔直，教官表扬了你，晒黑了两个度。" },
      { text: "装病请假", effects: { happy: 5, charm: -4 }, result: "你装病躲在树荫下，被教官发现了，罚站了一小时。" },
      { text: "偷偷涂防晒", effects: { happy: 4 }, result: "你偷偷涂了防晒，别人晒成两截袖，你还白着。" },
    ] },
  { id: "cet4", title: "英语四级", text: "四级考试报名开始了，室友已经刷起了真题。", year: 2,
    choices: [
      { text: "狠狠刷题", effects: { iq: 6, happy: -4, money: -80 }, result: "你刷了十套真题，听力都快听吐了。" },
      { text: "裸考", effects: { happy: 4, iq: -3 }, result: "你裸考上阵，蒙了不少，居然也过了线。" },
      { text: "报了个班", effects: { money: -300, iq: 5 }, result: "你报了个班，老师讲得挺有意思，就是贵。" },
    ] },
  { id: "sports-day", title: "运动会", text: "运动会报名，班里缺人跑 1500 米，体委的眼神已经锁定你了。",
    choices: [
      { text: "硬着头皮上", effects: { health: 6, charm: 6, happy: 2 }, result: "你跑完了全程，虽然是倒数第三，但全班都在给你加油。" },
      { text: "推荐别人去", effects: { charm: 3, happy: 4 }, result: "你推荐了体育委员，他白了你一眼，还是去了。" },
    ] },
  { id: "confession-wall", title: "表白墙", text: "有人在表白墙上挂你，写得还挺深情，评论区已经炸了。",
    choices: [
      { text: "回应了", effects: { charm: 6, happy: 8, money: -100, iq: -2 }, result: "你回应了，两个人加上了好友，聊得挺投缘。" },
      { text: "装没看见", effects: { happy: -3, charm: 2 }, result: "你装没看见，评论区替你着急了一整天。" },
      { text: "发帖澄清", effects: { charm: -3, happy: 3 }, result: "你发帖澄清说不认识，评论区说你不解风情。" },
    ] },
  { id: "flyer", title: "兼职发传单", text: "有人找你发传单，一天 80 块，站路口就行。",
    choices: [
      { text: "去", effects: { money: 240, health: -4 }, result: "你站了一天路口，嗓子都喊哑了，赚了 240。" },
      { text: "嫌累，不去", effects: { happy: 3 }, result: "你嫌累没去，在宿舍睡了个午觉。" },
    ] },
  { id: "laptop-broken", title: "电脑坏了", text: "电脑突然开不了机，里面还有没交的作业和 200G 的学习资料。",
    choices: [
      { text: "自己拆开修", effects: { iq: 5, happy: 6 }, result: "你拆开清了灰，居然修好了，成就感爆棚。" },
      { text: "送去维修", effects: { money: -300, happy: -3 }, result: "送修花了 300，老板说就是灰太多了。" },
      { text: "借室友的电脑", effects: { charm: 3, happy: -2 }, result: "你借了室友的电脑赶作业，欠了他一顿饭。" },
    ] },
  { id: "dorm-dinner", title: "宿舍聚餐", text: "宿舍提议出去聚餐，AA，地方定了，人均 60。",
    choices: [
      { text: "AA 吃好的", effects: { money: -60, happy: 7, charm: 5 }, result: "一顿饭吃得热热闹闹，关系更铁了。" },
      { text: "泡面解决", effects: { happy: -3, charm: -2 }, result: "你没去，一个人泡了碗面，有点后悔。" },
    ] },
  { id: "course-rush", title: "选课抢课", text: "选课系统开了，手速不够，热门课一秒没了。",
    choices: [
      { text: "去蹭课", effects: { iq: 4, happy: 4 }, result: "你去蹭课，老师居然记得你，还让你交了作业。" },
      { text: "选冷门课", effects: { happy: 3, credits: 2 }, result: "你选了门冷门课，老师人超好，给分还大方。" },
      { text: "下学期再说", effects: { iq: -2, happy: 2 }, result: "你决定下学期再说，这学期课表空了一大块。" },
    ] },
  { id: "insomnia", title: "失眠", text: "隔壁装修，电钻响了一整夜，你翻来覆去睡不着。",
    choices: [
      { text: "买副耳塞", effects: { money: -20, health: 4 }, result: "你买了副耳塞，世界终于安静了。" },
      { text: "通宵打游戏", effects: { happy: 7, health: -6, iq: -3 }, result: "反正睡不着，你通宵上了两颗星。" },
      { text: "硬扛", effects: { health: -5 }, result: "你硬扛了一夜，第二天上课一直在点头。" },
    ] },
  { id: "singing", title: "校园歌手大赛", text: "校园歌手大赛报名，室友说你唱歌好听，非让你报名。",
    choices: [
      { text: "报名参赛", effects: { charm: 7, happy: 7, health: -3 }, result: "你上台唱了一首歌，虽然没拿奖，但收获了一堆掌声。" },
      { text: "台下当观众", effects: { happy: 4 }, result: "你在台下当观众，跟着合唱，也挺过瘾。" },
    ] },
  { id: "borrow-money", title: "室友借钱", text: "室友找你借 200 块，说下周发生活费就还。",
    choices: [
      { text: "借了", effects: { charm: 5, money: -200 }, result: "你借了，他下周真的还了，还多请你喝了杯奶茶。" },
      { text: "婉拒了", effects: { charm: -3 }, result: "你婉拒了，他没说什么，但气氛有点微妙。" },
      { text: "借一半", effects: { charm: 2, money: -100 }, result: "你借了一半，他说够了，挺感激的。" },
    ] },
  { id: "morning-run", title: "晨跑打卡", text: "体育课要求晨跑打卡，跑满 20 次才算过，早上六点半集合。",
    choices: [
      { text: "坚持打卡", effects: { health: 7, credits: 3 }, result: "你坚持打卡，跑完了 20 次，体测满分。" },
      { text: "找人代跑", effects: { charm: 3, money: -100 }, result: "你找人代跑，被查出来一次，差点记过。" },
      { text: "不打了", effects: { credits: -3, happy: 3 }, result: "你不打了，睡了个懒觉，体育课差点挂科。" },
    ] },
  { id: "library-seat", title: "图书馆占座", text: "图书馆一座难求，早上八点去已经没位置了。",
    choices: [
      { text: "早起占座", effects: { iq: 5, happy: -3 }, result: "你七点就去占座，学习效率奇高。" },
      { text: "随缘", effects: { happy: 3 }, result: "你随缘找了个角落，居然也学进去了。" },
    ] },
  { id: "confession", title: "有人向你表白", text: "隔壁班的同学向你表白了，约你周末去看电影。",
    choices: [
      { text: "答应了", effects: { happy: 9, charm: 5, money: -150, iq: -2 }, result: "你们在一起了，约会、看电影，甜得发腻。" },
      { text: "先做朋友", effects: { happy: 4, charm: 4 }, result: "你们先做了朋友，相处起来很舒服，不急。" },
      { text: "拒绝了", effects: { happy: -4, charm: 2 }, result: "你拒绝了，对方很难过，你也有点不得劲。" },
    ] },
  { id: "internship", title: "校招实习", text: "一家不错的公司来校招实习生，名额不多，竞争不小。", year: 3,
    choices: [
      { text: "去试试", effects: { iq: 5, money: 500, happy: -3 }, result: "你去实习了，学到了不少东西，还拿了点补贴。" },
      { text: "觉得太早", effects: { happy: 3 }, result: "你觉得太早，先把眼前的课上好再说。" },
    ] },
  { id: "kaoyan-talk", title: "考研宣讲", text: "考研机构来做宣讲，学长学姐分享经验，现场人山人海。", year: 3,
    choices: [
      { text: "去听听", effects: { iq: 4, happy: -2 }, result: "你听了一场宣讲，心里对考研有了点数。" },
      { text: "不去", effects: { happy: 3 }, result: "你没去，在宿舍打了两把游戏。" },
    ] },
  { id: "grad-photo", title: "毕业照", text: "毕业照拍摄，学士服、抛帽子、全班合影。", year: 4,
    choices: [
      { text: "认真拍", effects: { happy: 8, charm: 5 }, result: "你认真拍了，照片里笑得特别好看。" },
      { text: "随便拍拍", effects: { happy: 4 }, result: "你随便拍了拍，反正 P 图能拯救一切。" },
    ] },
  { id: "farewell-dinner", title: "散伙饭", text: "毕业散伙饭，全宿舍最后一次聚餐，有人提议去吃顿好的。",
    choices: [
      { text: "豪华散伙饭", effects: { money: -300, happy: 9, charm: 6 }, result: "一顿散伙饭，吃着吃着就有人哭了。" },
      { text: "食堂对付一口", effects: { happy: 4 }, result: "食堂对付了一口，但气氛一点也不差。" },
    ] },
  { id: "thesis", title: "毕业论文", text: "毕业论文开题，导师让你先交个初稿，deadline 就在眼前。", year: 4,
    choices: [
      { text: "提前开写", effects: { iq: 6, credits: 5, happy: -4 }, result: "你提前开写，改了三稿，导师夸你态度好。" },
      { text: "拖到最后", effects: { iq: -3, credits: -3, happy: 4 }, result: "你拖到最后三天，通宵赶完，差点没赶上。" },
      { text: "找学长请教", effects: { iq: 5, charm: 4 }, result: "你找学长请教，少走了不少弯路。" },
    ] },
  { id: "lottery", title: "彩票站", text: "路过一家彩票站，老板说刚有人中了小奖，你要不要也试试手气？",
    choices: [
      { text: "买一张（10 块）", effects: { money: -10 }, odds: { chance: 0.12, win: { money: 500, happy: 10 }, winText: "中了！500 块！你拿着彩票乐了一路。", lose: { happy: -2 }, loseText: "没中。就当请老板喝了杯水。" } },
      { text: "不买", effects: { happy: 1 }, result: "你没买，省了 10 块，也省了做梦的时间。" },
    ] },
  { id: "hotpot", title: "宿舍火锅", text: "室友提议在宿舍偷偷吃火锅，锅和菜都买好了，就差你点头。",
    choices: [
      { text: "加入", effects: { happy: 9, money: -40, health: -2 }, result: "一顿火锅吃得满头大汗，宿管来敲门的时候你们已经收拾干净了。" },
      { text: "劝阻", effects: { charm: 4, iq: 2 }, result: "你劝住了大家，改去外面吃，虽然贵了点但安心。" },
    ] },
  { id: "rain", title: "暴雨", text: "暴雨说来就来，你的伞还坏了，离宿舍还有十分钟路。",
    choices: [
      { text: "淋雨跑回去", effects: { health: -5, happy: 4 }, result: "你淋雨跑回去，浑身湿透，但居然有点爽。" },
      { text: "等雨停", effects: { iq: 3, happy: 3 }, result: "你等了半小时，雨停了，还顺便背了几个单词。" },
      { text: "打车回去", effects: { money: -15, health: 3 }, result: "你打车回去，干干爽爽，就是有点心疼车费。" },
    ] },
  { id: "elective-teacher", title: "神仙选修课", text: "选修课老师人特别好，从不点名，考试还开卷，全校都在抢他的课。",
    choices: [
      { text: "认真听", effects: { iq: 5, credits: 4 }, result: "你认真听了，老师讲得是真有意思。" },
      { text: "划水", effects: { happy: 5 }, result: "你划了一学期水，考试开卷，稳稳地过了。" },
    ] },
  { id: "dorm-check", title: "宿舍卫生检查", text: "宿管突击检查卫生，宿舍乱得像刚被打劫过，检查的人已经到楼下了。",
    choices: [
      { text: "连夜大扫除", effects: { health: 4, charm: 4, happy: -3 }, result: "全宿舍连夜大扫除，检查过了，还被表扬了。" },
      { text: "听天由命", effects: { charm: -4, happy: -4 }, result: "你们听天由命，结果被通报批评，全宿舍写了检讨。" },
      { text: "贿赂宿管", effects: { money: -50, charm: 5 }, result: "你塞了两包零食给宿管阿姨，她笑着走了。" },
    ] },
  { id: "borrow-notes", title: "学霸的笔记", text: "学霸的笔记字迹工整、重点齐全，全班都想借。",
    choices: [
      { text: "借来抄", effects: { iq: 5, credits: 3, charm: 3 }, result: "你借来抄了一遍，期末稳了不少。" },
      { text: "自己整理", effects: { iq: 4, happy: -2 }, result: "你自己整理了一份，虽然慢，但记得更牢。" },
    ] },
  { id: "midnight-snack", title: "半夜饿了", text: "半夜十二点，肚子叫得比室友的呼噜还响。",
    choices: [
      { text: "点外卖", effects: { money: -25, happy: 7 }, result: "外卖到了，热乎乎的，这顿夜宵值了。" },
      { text: "忍到天亮", effects: { health: 3, happy: -4 }, result: "你忍到天亮，吃早饭的时候风卷残云。" },
      { text: "翻室友零食", effects: { happy: 6, charm: -3 }, result: "你翻了室友的零食，第二天被他发现了，赔了一包大的。" },
    ] },
  { id: "club-fund", title: "社团经费", text: "社团经费不够了，下次活动没钱办，社长愁得直挠头。",
    choices: [
      { text: "自掏腰包", effects: { money: -200, charm: 6 }, result: "你自掏腰包垫上了，社长感动得不行。" },
      { text: "去拉赞助", effects: { iq: 3, charm: 5, happy: -3 }, result: "你去拉了赞助，跑了三家店，总算谈下来一家。" },
      { text: "不管", effects: { happy: 2 }, result: "你没管，活动推迟了，你落了个清闲。" },
    ] },
  { id: "lost-campus-card", title: "校园卡丢了", text: "校园卡丢了，饭卡、门禁、水卡全在里面，补办要 20 块。",
    choices: [
      { text: "挂失补办", effects: { money: -20, happy: -3 }, result: "你挂失补办，跑了两趟，终于拿到了新卡。" },
      { text: "先借室友的", effects: { charm: 3, happy: -2 }, result: "你先借了室友的卡，蹭了三天饭。" },
      { text: "找回来了", effects: { happy: 6 }, result: "居然在洗衣机里找到了，虚惊一场。" },
    ] },
  { id: "package", title: "快递到了", text: "快递到了，菜鸟驿站排起了长队，取件码都快过期了。",
    choices: [
      { text: "去排队取", effects: { happy: 5, health: -2 }, result: "你排了半小时队，抱着快递回来，拆箱一时爽。" },
      { text: "让室友代取", effects: { charm: 3, money: -10 }, result: "室友帮你取了，你请他喝了杯奶茶当跑腿费。" },
      { text: "明天再说", effects: { happy: -3 }, result: "你说明天再说，结果取件码过期了，多跑了一趟。" },
    ] },
  { id: "essay", title: "选修课论文", text: "选修课要交一篇 3000 字论文，deadline 就在下周，你一个字还没动。",
    choices: [
      { text: "认真写", effects: { iq: 5, credits: 4, happy: -4 }, result: "你认真写了三天，交上去居然拿了优。" },
      { text: "水一篇", effects: { happy: 4, credits: -2 }, result: "你水了一篇，老师给了个及格，万幸。" },
      { text: "找 AI 帮忙", effects: { iq: 3, happy: 4 }, result: "你找 AI 帮忙打了个草稿，自己改了改，居然还挺像那么回事。" },
    ] },
];

// 结局：按顺序检查，第一个满足条件的就是你的结局
const ENDINGS = [
  { id: "sick", title: "病倒休学", emoji: "🤒", early: true,
    desc: "身体垮了。连续熬夜加生病，你不得不休学一年。健康才是本钱，这次算是交了学费。" },
  { id: "debt", title: "欠债退学", emoji: "💸", early: true,
    desc: "钱花光了，还欠了一屁股债。你不得不退学打工还钱。大学这条路，暂时走不下去了。" },
  { id: "baoyan", title: "保研成功", emoji: "🎓",
    desc: "四年苦读没有白费。你以优异的成绩保研本校，继续深造。学弟学妹口中的“大神”，就是你。" },
  { id: "kaoyan", title: "考研上岸", emoji: "📚",
    desc: "备考的日子很苦，但你挺过来了。收到录取通知的那一刻，所有的通宵都值了。" },
  { id: "dachang", title: "大厂 Offer", emoji: "💼",
    desc: "凭着过硬的专业能力和出色的面试表现，你拿到了大厂的 Offer。毕业即就业，还是高薪的那种。" },
  { id: "startup", title: "创业成功", emoji: "🚀",
    desc: "大学四年你攒下启动资金和人脉，毕业就创了业。第一笔融资到账的时候，你请全宿舍吃了顿好的。" },
  { id: "athlete", title: "校队明星", emoji: "🏅",
    desc: "四年坚持运动，你成了校队的明星，比赛拿奖拿到手软。毕业时，好几家俱乐部都想签你。" },
  { id: "happy", title: "快乐躺平", emoji: "😌",
    desc: "四年过得开开心心，没卷也没垮。毕业了，找了份轻松的工作，日子过得舒舒服服。快乐也是一种成功。" },
  { id: "delay", title: "延毕一年", emoji: "📉",
    desc: "学分不够，延毕一年。看着同届的同学毕业离校，你在空荡荡的宿舍里多住了一年。" },
  { id: "normal", title: "平凡毕业", emoji: "🎓",
    desc: "四年平平淡淡地过去了。你拿到了毕业证，找了份普通的工作，过上了普通的生活。平凡，但也挺好。" },
];

// 结局判定（按顺序，第一个满足的胜出；延毕排在前面——学分不够毕不了业，再快乐也没用）
function judgeEnding(s) {
  if (s.health <= 0) return "sick";
  if (s.money <= -500) return "debt";
  if (s.credits < 20) return "delay";
  if (s.credits >= 40 && s.iq >= 85) return "baoyan";
  if (s.credits >= 35 && s.iq >= 75) return "kaoyan";
  if (s.iq >= 80 && s.charm >= 75) return "dachang";
  if (s.money >= 5000 && s.charm >= 70) return "startup";
  if (s.health >= 85 && s.charm >= 70) return "athlete";
  if (s.happy >= 90) return "happy";
  return "normal";
}
