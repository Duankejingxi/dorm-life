// 宿舍人生 · 内容数据：每学期的行动、随机事件、结局
// 数值都是“变化量”，正数加、负数减；金钱单位是元，学分没有上限

// 每学期先选一个行动
const ACTIONS = [
  { id: "study", icon: "📚", name: "上课学习", desc: "认真听课，泡图书馆。智力、学分涨，快乐掉一点。",
    effects: { iq: 8, credits: 6, happy: -5 }, variance: 2,
    log: ["这学期你泡在图书馆，笔记记得满满当当。", "这学期你上课坐第一排，老师都记住你了。"] },
  { id: "work", icon: "💰", name: "打工赚钱", desc: "发传单、做家教、跑腿。钱多了，人累点，还能认识点人。",
    effects: { money: 750, health: -5, happy: -4, iq: -2, connections: 3 }, variance: 2, moneyVariance: 100,
    log: ["这学期你打了不少零工，钱包鼓了一点，人也累了一点。", "这学期你一边上课一边打工，月底数钱的时候笑了。"] },
  { id: "gym", icon: "🏋️", name: "健身运动", desc: "跑步、撸铁、打球。身体好了，气质也好了，还能认识健身搭子。",
    effects: { health: 8, charm: 5, money: -100, happy: 3, connections: 2 }, variance: 2,
    log: ["这学期你天天泡操场，体测轻轻松松。", "这学期你练出了线条，走路都带风。"] },
  { id: "game", icon: "🎮", name: "打游戏", desc: "开黑、上分、通宵。快乐拉满，脑子放假。",
    effects: { happy: 10, iq: -4, credits: -2, money: -100 }, variance: 2,
    log: ["这学期你上分如喝水，快乐得冒泡。", "这学期你游戏里风生水起，现实里作业堆成山。"] },
  { id: "social", icon: "🎉", name: "社交聚会", desc: "社团、聚餐、认识新朋友。魅力、人脉都涨，钱包瘪。",
    effects: { charm: 8, happy: 6, money: -200, connections: 8 }, variance: 2,
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
  // ---- v1.1 新增：宿舍生活 ----
  { id: "snore", title: "室友打呼噜", text: "室友打呼噜像电锯，整夜没停，你翻来覆去睡不着。",
    choices: [
      { text: "买耳塞", effects: { money: -15, health: 4 }, result: "你买了副耳塞，世界终于安静了。" },
      { text: "把他推醒", effects: { charm: -2, happy: 3 }, result: "你把他推醒，他翻个身继续打，你放弃了。" },
      { text: "录下来发群里", effects: { happy: 7, charm: -3 }, result: "你录下来发群里，全宿舍笑了一晚上，他本人也笑了。" },
    ] },
  { id: "shower-queue", title: "洗澡排队", text: "公共浴室排起了长队，热水只剩半小时，你前面还有五个人。",
    choices: [
      { text: "排队等", effects: { health: 2, happy: -2 }, result: "你排队等到了，洗了个痛快的热水澡。" },
      { text: "明天再洗", effects: { happy: 2, health: -2 }, result: "你决定明天再洗，躺在床上总觉得身上黏糊糊的。" },
      { text: "去校外澡堂", effects: { money: -20, happy: 5 }, result: "你去校外澡堂，贵了点，但一个人独享大池子。" },
    ] },
  { id: "laundry", title: "洗衣机", text: "洗衣机坏了，你攒了一周的衣服没地方洗，阳台已经挂满了。",
    choices: [
      { text: "手洗", effects: { health: 3, happy: -3 }, result: "你手洗了一大盆，胳膊都酸了，但衣服干净了。" },
      { text: "去洗衣房", effects: { money: -10, happy: 2 }, result: "你去洗衣房，花了 10 块，半小时搞定。" },
      { text: "再攒攒", effects: { happy: 2, charm: -3 }, result: "你决定再攒攒，室友已经开始嫌弃你的床位了。" },
    ] },
  { id: "roommate-gf", title: "室友谈恋爱了", text: "室友谈恋爱了，天天煲电话粥到半夜，宿舍成了他的恋爱直播间。",
    choices: [
      { text: "祝福他", effects: { charm: 4, happy: 3 }, result: "你祝福他，他请你吃了顿饭，顺便秀了一波恩爱。" },
      { text: "让他小声点", effects: { happy: -2, charm: 2 }, result: "你让他小声点，他答应了，但甜蜜起来还是控制不住音量。" },
      { text: "戴耳机", effects: { iq: 2, happy: -2 }, result: "你戴上耳机，假装听不见，心里默默吃了一嘴狗粮。" },
    ] },
  { id: "dorm-clean", title: "宿舍大扫除", text: "宿舍脏得没法看了，垃圾桶满了，地上全是外卖盒和头发。",
    choices: [
      { text: "带头打扫", effects: { health: 4, charm: 5, happy: -2 }, result: "你带头打扫，全宿舍都动起来了，焕然一新。" },
      { text: "只扫自己那块", effects: { happy: 2 }, result: "你只扫了自己那块地，干净是干净了，但公共区域还是乱。" },
      { text: "装没看见", effects: { charm: -3, happy: 1 }, result: "你装没看见，室友也没动，宿舍越来越像垃圾场。" },
    ] },
  { id: "power-outage", title: "宿舍跳闸", text: "宿舍跳闸了，全楼都黑了，手机快没电，热水器也停了。",
    choices: [
      { text: "去找宿管", effects: { charm: 3, happy: 2 }, result: "你去找宿管，阿姨三分钟就给恢复了，你成了宿舍的英雄。" },
      { text: "点蜡烛聊天", effects: { charm: 5, happy: 6 }, result: "你们点蜡烛聊天，聊到半夜，关系更好了。" },
      { text: "直接睡觉", effects: { health: 5 }, result: "你直接睡了，难得睡了个整觉。" },
    ] },
  { id: "ac-broken", title: "空调坏了", text: "夏天最热的时候，宿舍空调坏了，风扇转得像要散架。",
    choices: [
      { text: "报修", effects: { happy: 3, health: 2 }, result: "你报修了，师傅第二天就来修好了，凉快了。" },
      { text: "去图书馆蹭空调", effects: { iq: 4, happy: 3 }, result: "你去图书馆蹭空调，顺便看了一下午书。" },
      { text: "买个小风扇", effects: { money: -30, happy: 4 }, result: "你买了个小风扇，对着脸吹，勉强能活。" },
    ] },
  { id: "roommate-birthday", title: "室友过生日", text: "室友过生日，全宿舍给他庆祝，蛋糕和礼物都准备好了。",
    choices: [
      { text: "凑钱买礼物", effects: { money: -50, charm: 6, happy: 6 }, result: "你凑钱买了礼物，他感动得不行，说这宿舍没白住。" },
      { text: "请他吃顿饭", effects: { money: -80, charm: 5, happy: 5 }, result: "你请他吃了顿饭，一晚上有说有笑。" },
      { text: "发个红包", effects: { money: -20, charm: 3 }, result: "你发了个红包，他收了，心意到了就行。" },
    ] },
  { id: "dorm-pet", title: "宿舍养了只仓鼠", text: "室友带回一只仓鼠，毛茸茸的，全宿舍都围着看。",
    choices: [
      { text: "一起养", effects: { happy: 8, money: -20 }, result: "你们一起养，轮流喂食，仓鼠成了宿舍的团宠。" },
      { text: "只负责撸", effects: { happy: 6 }, result: "你只负责撸，不负责铲屎，仓鼠也挺喜欢你。" },
      { text: "怕它跑出来", effects: { happy: -2 }, result: "你怕它跑出来，整晚都睡不踏实。" },
    ] },
  { id: "wifi-down", title: "宿舍断网", text: "宿舍断网了，游戏打不了，视频看不了，全宿舍都在哀嚎。",
    choices: [
      { text: "用流量", effects: { money: -30, happy: 4 }, result: "你开了流量，贵是贵了点，但不断网的人生不能停。" },
      { text: "去图书馆蹭网", effects: { iq: 3, happy: 2 }, result: "你去图书馆蹭网，顺便看了两小时书。" },
      { text: "断网也挺好", effects: { health: 4, happy: 3 }, result: "你发现断网也挺好，早睡了一次，第二天精神特别好。" },
    ] },
  // ---- v1.1 新增：学习考试 ----
  { id: "exam-cheat", title: "考试前夜", text: "明天考试，你还有三章没看，室友已经把重点都划好了。",
    choices: [
      { text: "通宵突击", effects: { iq: 6, credits: 4, health: -7 }, result: "你通宵突击，考完走出考场，感觉自己什么都懂了。" },
      { text: "借室友的重点", effects: { iq: 4, credits: 3, charm: 3 }, result: "你借了室友的重点，考了个不错的分数，欠他一顿饭。" },
      { text: "裸考", effects: { happy: 4, iq: -3 }, result: "你裸考上阵，全靠平时的积累和一点运气。" },
    ] },
  { id: "professor-quiz", title: "老师突然小测", text: "老师突然宣布小测，占期末 10%，全班都懵了。",
    choices: [
      { text: "认真写", effects: { iq: 4, credits: 3 }, result: "你认真写了，居然大部分都会，平时没白听。" },
      { text: "看同桌的", effects: { charm: 2, happy: 2, iq: -1 }, result: "你看了同桌两眼，勉强写完了，心里有点虚。" },
      { text: "交白卷", effects: { happy: 2, credits: -2 }, result: "你交了白卷，老师看了你一眼，你假装淡定。" },
    ] },
  { id: "group-project", title: "小组作业", text: "小组作业，组里有人划水，有人失踪，deadline 就在眼前。",
    choices: [
      { text: "自己扛下来", effects: { iq: 5, credits: 4, happy: -4, health: -3 }, result: "你自己扛下来了，作业拿了高分，但累得够呛。" },
      { text: "在群里催", effects: { charm: 3, iq: 2 }, result: "你在群里催了一圈，大家终于动起来了，勉强赶上了。" },
      { text: "摆烂", effects: { happy: 3, credits: -3 }, result: "你摆烂了，作业交了个半成品，分数惨不忍睹。" },
    ] },
  { id: "library-closed", title: "图书馆闭馆", text: "图书馆闭馆了，你复习到一半被请出来，外面还下着雨。",
    choices: [
      { text: "回宿舍继续", effects: { iq: 3, happy: -1 }, result: "你回宿舍继续复习，虽然床很诱人，但你忍住了。" },
      { text: "去咖啡厅", effects: { money: -25, iq: 3, happy: 3 }, result: "你去咖啡厅，点了杯咖啡，复习效率居然更高了。" },
      { text: "今天就到这", effects: { happy: 4, iq: -2 }, result: "你决定今天就到这，回宿舍打了两把游戏。" },
    ] },
  { id: "scholarship", title: "奖学金评选", text: "奖学金评选开始了，你的成绩刚好卡在边上，有希望也有悬念。",
    choices: [
      { text: "争取一下", effects: { iq: 4, credits: 3, happy: -2 }, result: "你争取了一下，材料交得整整齐齐，等结果的日子有点煎熬。" },
      { text: "顺其自然", effects: { happy: 3 }, result: "你顺其自然，该干嘛干嘛，反正尽力了。" },
      { text: "帮同学参谋", effects: { charm: 5, happy: 4 }, result: "你帮同学参谋材料，他拿了奖学金，请你吃了顿大餐。" },
    ] },
  { id: "teacher-office", title: "老师找你谈话", text: "老师找你谈话，说你最近状态不错，想让你进他的课题组。",
    choices: [
      { text: "加入课题组", effects: { iq: 6, credits: 4, happy: -3 }, result: "你加入了课题组，跟着老师做项目，学到了不少真本事。" },
      { text: "先想想", effects: { iq: 2, happy: 2 }, result: "你说先想想，老师说随时欢迎，你心里有点底了。" },
      { text: "婉拒了", effects: { happy: 3 }, result: "你婉拒了，老师也没强求，你松了口气。" },
    ] },
  { id: "online-course", title: "网课", text: "有门课是网课，老师在屏幕里讲，你在屏幕外发呆。",
    choices: [
      { text: "认真听", effects: { iq: 5, credits: 3 }, result: "你认真听了，网课居然也挺有意思，还做了笔记。" },
      { text: "挂着课打游戏", effects: { happy: 6, iq: -3 }, result: "你挂着课打游戏，签到的时候手速飞快，居然没被发现。" },
      { text: "倍速刷完", effects: { iq: 3, happy: 3 }, result: "你倍速刷完了，知识点都过了一遍，效率还挺高。" },
    ] },
  { id: "exam-fail", title: "挂了一科", text: "成绩出来了，你挂了一科，补考在下个月。",
    choices: [
      { text: "认真准备补考", effects: { iq: 5, credits: 3, happy: -4 }, result: "你认真准备补考，这次稳稳地过了，还总结了教训。" },
      { text: "找老师求情", effects: { charm: 3, happy: 2 }, result: "你找老师求情，老师让你好好准备补考，别想歪门邪道。" },
      { text: "先玩两天", effects: { happy: 5, iq: -2 }, result: "你先玩了两天压压惊，然后开始复习。" },
    ] },
  { id: "book-sale", title: "旧书摊", text: "学长在卖旧书，专业课教材五块钱一本，还附赠笔记。",
    choices: [
      { text: "全买了", effects: { money: -30, iq: 4 }, result: "你全买了，笔记比教材还值钱，省了不少事。" },
      { text: "只买一本", effects: { money: -5, iq: 2 }, result: "你只买了一本最急用的，够了。" },
      { text: "不买", effects: { happy: 1 }, result: "你没买，觉得图书馆借也一样。" },
    ] },
  { id: "study-group", title: "学习小组", text: "有人拉你进学习小组，每周固定时间一起自习，互相监督。",
    choices: [
      { text: "加入", effects: { iq: 5, credits: 3, charm: 4, happy: -2 }, result: "你加入了，学习效率高了不少，还认识了几个学霸朋友。" },
      { text: "偶尔去", effects: { iq: 2, happy: 2 }, result: "你偶尔去，蹭点学习氛围，也挺好。" },
      { text: "不去", effects: { happy: 2 }, result: "你没去，一个人学也挺自在。" },
    ] },
  // ---- v1.1 新增：社交恋爱 ----
  { id: "blind-date", title: "室友给你介绍对象", text: "室友说他有个朋友，性格特别好，想介绍给你认识。",
    choices: [
      { text: "见见", effects: { charm: 5, happy: 6, money: -100 }, result: "你去见了，聊得挺投缘，加了好友，约了下次一起吃饭。" },
      { text: "先看看照片", effects: { happy: 3 }, result: "你先看了照片，觉得还行，决定慢慢了解。" },
      { text: "算了", effects: { happy: 1 }, result: "你算了，觉得现在还不是时候，室友说你不懂珍惜。" },
    ] },
  { id: "valentine", title: "情人节", text: "情人节到了，宿舍里有人收到花，有人收到巧克力，你什么也没收到。",
    choices: [
      { text: "给自己买束花", effects: { money: -50, happy: 7 }, result: "你给自己买了束花，爱自己也挺好。" },
      { text: "约朋友出去玩", effects: { charm: 4, happy: 6, money: -80 }, result: "你约朋友出去玩，一晚上开开心心，单身也快乐。" },
      { text: "在宿舍躺着", effects: { happy: 3 }, result: "你在宿舍躺着，刷了一晚上别人的秀恩爱，居然也不难受。" },
    ] },
  { id: "friend-fight", title: "和朋友吵架", text: "你和好朋友吵了一架，冷战三天了，谁也不先说话。",
    choices: [
      { text: "主动和好", effects: { charm: 6, happy: 5 }, result: "你主动和好了，两个人聊开后发现就是个误会，关系更好了。" },
      { text: "等对方先开口", effects: { happy: -3, charm: -2 }, result: "你等对方先开口，结果冷战了一周，关系有点僵。" },
      { text: "请他吃顿饭", effects: { money: -60, charm: 5, happy: 5 }, result: "你请他吃了顿饭，饭桌上就和好了，男人之间的事一顿饭就能解决。" },
    ] },
  { id: "class-reunion", title: "班级聚会", text: "班级聚会，毕业的学长学姐也来了，大家聊起了各自的近况。",
    choices: [
      { text: "积极参加", effects: { charm: 6, happy: 6, money: -100 }, result: "你积极参加，认识了不少学长学姐，还拿到了实习的内推。" },
      { text: "坐着听", effects: { happy: 3, charm: 2 }, result: "你坐着听，学到了不少经验，也挺值。" },
      { text: "提前溜了", effects: { happy: 2 }, result: "你提前溜了，回宿舍打了两把游戏。" },
    ] },
  { id: "club-president", title: "竞选社团部长", text: "社团换届，有人提名你竞选部长，你有点心动也有点慌。",
    choices: [
      { text: "竞选", effects: { charm: 7, happy: 5, iq: -2 }, result: "你竞选上了，当了部长，组织活动忙得团团转，但特别有成就感。" },
      { text: "当干事", effects: { charm: 3, happy: 3 }, result: "你当了干事，事情少点，也能参与，挺好。" },
      { text: "不参与", effects: { happy: 2 }, result: "你没参与，社团的事交给别人，你落了个清闲。" },
    ] },
  { id: "confession-reject", title: "被人表白了", text: "有人向你表白，写了封很长的信，还约你周末去看电影。",
    choices: [
      { text: "答应", effects: { happy: 9, charm: 5, money: -150, iq: -2 }, result: "你答应了，两个人约会看电影，甜得发腻。" },
      { text: "先做朋友", effects: { happy: 4, charm: 4 }, result: "你们先做了朋友，相处起来很舒服，不急。" },
      { text: "拒绝", effects: { happy: -4, charm: 2 }, result: "你拒绝了，对方很难过，你也有点不得劲。" },
    ] },
  { id: "roommate-secret", title: "室友的秘密", text: "室友偷偷告诉你一个秘密，让你千万别告诉别人。",
    choices: [
      { text: "守口如瓶", effects: { charm: 5, happy: 3 }, result: "你守口如瓶，他更信任你了，两个人关系更铁了。" },
      { text: "不小心说漏嘴", effects: { charm: -6, happy: -3 }, result: "你不小心说漏嘴了，他知道了，气得三天没理你。" },
      { text: "假装没听见", effects: { happy: 1 }, result: "你假装没听见，他也没再提，这事就过去了。" },
    ] },
  { id: "dorm-party", title: "宿舍派对", text: "周末宿舍开派对，零食饮料都买好了，还邀请了隔壁宿舍。",
    choices: [
      { text: "嗨起来", effects: { happy: 9, charm: 6, money: -50, health: -3 }, result: "你们嗨到半夜，隔壁宿舍也加入了，成了整层楼的派对。" },
      { text: "意思一下", effects: { happy: 4, charm: 3 }, result: "你意思了一下，早早睡了，第二天精神特别好。" },
      { text: "不参加", effects: { happy: -2 }, result: "你没参加，一个人戴着耳机看剧，也挺安静。" },
    ] },
  { id: "senior-advice", title: "学长的建议", text: "大四学长请你吃饭，聊了很多经验，从选课到找工作，无所不谈。",
    choices: [
      { text: "认真听", effects: { iq: 5, charm: 4, happy: 4 }, result: "你认真听了，学长说的每句话都很有用，少走不少弯路。" },
      { text: "光顾着吃", effects: { happy: 5 }, result: "你光顾着吃了，学长的话只听进去一半，但饭挺好吃。" },
      { text: "反过来请教学长", effects: { iq: 4, charm: 5 }, result: "你反过来请教学长，他知无不言，还把你拉进了他的圈子。" },
    ] },
  { id: "group-chat", title: "班级群炸了", text: "班级群突然炸了，有人在群里发了个大瓜，所有人都在吃瓜。",
    choices: [
      { text: "吃瓜", effects: { happy: 6, iq: -2 }, result: "你吃了半小时瓜，瓜越吃越大，你人都看傻了。" },
      { text: "潜水", effects: { happy: 2 }, result: "你潜水看着，偶尔发个表情包，稳稳地吃瓜。" },
      { text: "屏蔽群消息", effects: { iq: 3, happy: -1 }, result: "你屏蔽了群消息，安心学习，效率高了不少。" },
    ] },
  // ---- v1.1 新增：金钱消费 ----
  { id: "red-packet", title: "抢红包", text: "班级群里有人发红包，手速快的有，运气好的也有。",
    choices: [
      { text: "抢到了", effects: { money: 20, happy: 6 }, result: "你抢到了 20 块，运气王就是你，全群都在喊你再发一个。" },
      { text: "没抢到", effects: { happy: -2 }, result: "你没抢到，慢了一步，只能看着别人秀手气。" },
      { text: "自己发一个", effects: { money: -50, charm: 5, happy: 5 }, result: "你自己发了一个，群里热闹起来了，大家都夸你大方。" },
    ] },
  { id: "part-time-tutor", title: "家教兼职", text: "有人介绍你去当家教，教高中生数学，一小时 80 块。",
    choices: [
      { text: "接了", effects: { money: 640, iq: 4, happy: -3, health: -3 }, result: "你接了，每周去两次，学生进步很快，家长还给你涨了工资。" },
      { text: "嫌远不去", effects: { happy: 2 }, result: "你嫌远没去，在宿舍睡了个午觉。" },
      { text: "试一次", effects: { money: 80, iq: 2 }, result: "你试了一次，感觉还行，决定长期做。" },
    ] },
  { id: "secondhand", title: "闲鱼卖旧物", text: "你把不用的旧书和耳机挂上闲鱼，有人问价了。",
    choices: [
      { text: "卖了", effects: { money: 150, happy: 5 }, result: "你卖了，赚了 150，还清了宿舍一角，舒服。" },
      { text: "砍价", effects: { money: 100, happy: 3 }, result: "你砍了一会儿价，最后 100 成交，也还行。" },
      { text: "舍不得卖", effects: { happy: 1 }, result: "你舍不得卖，东西又堆回了角落。" },
    ] },
  { id: "phone-broken", title: "手机碎屏了", text: "手机掉地上，屏幕碎了，修要 300，换新要 3000。",
    choices: [
      { text: "修了", effects: { money: -300, happy: -3 }, result: "你修了，300 块，屏幕跟新的一样。" },
      { text: "将就着用", effects: { happy: -2 }, result: "你将就着用，碎屏看着难受，但省了 300。" },
      { text: "换新手机", effects: { money: -3000, happy: 8 }, result: "你换了新手机，爽是爽了，钱包空了。" },
    ] },
  { id: "takeout-coupon", title: "外卖红包", text: "外卖平台发了大额红包，满 30 减 20，今天不用就过期了。",
    choices: [
      { text: "点一单", effects: { money: -15, happy: 7 }, result: "你点了一单，红包抵了大半，吃得美滋滋。" },
      { text: "拼单", effects: { money: -10, happy: 5, charm: 3 }, result: "你和室友拼单，一起吃，人均才 10 块。" },
      { text: "不用", effects: { happy: -1 }, result: "你没用，红包过期了，有点心疼。" },
    ] },
  { id: "borrow-again", title: "又有人借钱", text: "同学找你借 500，说下个月一定还，你手头也不宽裕。",
    choices: [
      { text: "借了", effects: { money: -500, charm: 5 }, result: "你借了，他下个月真的还了，还请你吃了顿饭。" },
      { text: "借 200", effects: { money: -200, charm: 3 }, result: "你借了 200，他说够了，挺感激的。" },
      { text: "婉拒", effects: { charm: -3 }, result: "你婉拒了，他没说什么，但气氛有点微妙。" },
    ] },
  { id: "lottery-again", title: "刮刮乐", text: "路边彩票站，刮刮乐 10 块一张，老板说刚有人中了 100。",
    choices: [
      { text: "刮一张", effects: { money: -10 }, odds: { chance: 0.15, win: { money: 100, happy: 8 }, winText: "中了 100！你拿着彩票乐了一路。", lose: { happy: -2 }, loseText: "没中。就当请老板喝了杯水。" } },
      { text: "不刮", effects: { happy: 1 }, result: "你没刮，省了 10 块，也省了做梦的时间。" },
    ] },
  // ---- v1.1 新增：健康运动 ----
  { id: "gym-card", title: "健身房办卡", text: "健身房推销，年卡 999，还送三个月，销售说得天花乱坠。",
    choices: [
      { text: "办了", effects: { money: -999, health: 8, charm: 4 }, result: "你办了，前两周天天去，后来就去得少了，但身体确实好了点。" },
      { text: "办月卡", effects: { money: -150, health: 5 }, result: "你办了月卡，试试水，感觉不错。" },
      { text: "不办", effects: { happy: 2 }, result: "你没办，觉得操场跑步也一样，还免费。" },
    ] },
  { id: "cold", title: "感冒了", text: "你感冒了，头晕鼻塞，室友让你多喝热水。",
    choices: [
      { text: "去校医院", effects: { money: -30, health: 6 }, result: "你去校医院拿了药，吃了两天就好了。" },
      { text: "硬扛", effects: { health: -5, happy: -2 }, result: "你硬扛了一周，终于好了，但瘦了两斤。" },
      { text: "多喝热水", effects: { health: 3, happy: 2 }, result: "你多喝热水，早睡两天，居然也好了。" },
    ] },
  { id: "all-nighter", title: "通宵", text: "你通宵了，凌晨四点还在打游戏/赶作业，天快亮了。",
    choices: [
      { text: "直接睡", effects: { health: -4, happy: 3 }, result: "你直接睡了，一觉睡到下午，错过了早课。" },
      { text: "硬撑着上课", effects: { health: -6, iq: 2 }, result: "你硬撑着上课，坐在最后一排一直在点头，老师都没发现。" },
      { text: "请假", effects: { happy: 2, credits: -1 }, result: "你请了假，睡了个整觉，下午满血复活。" },
    ] },
  { id: "marathon", title: "校园马拉松", text: "学校办校园马拉松，跑完有奖牌和纪念衫，全校都在报名。",
    choices: [
      { text: "报名", effects: { health: 7, charm: 5, happy: 5 }, result: "你报名了，跑完了全程，虽然累得够呛，但奖牌挂在宿舍最显眼的地方。" },
      { text: "当志愿者", effects: { charm: 5, happy: 4 }, result: "你当了志愿者，给大家递水加油，也挺有参与感。" },
      { text: "当观众", effects: { happy: 3 }, result: "你在路边当观众，给认识的人加油，也挺热闹。" },
    ] },
  { id: "diet", title: "减肥", text: "你决定减肥，体重秤上的数字让你下定了决心。",
    choices: [
      { text: "管住嘴迈开腿", effects: { health: 7, charm: 4, happy: -3, money: -100 }, result: "你坚持了一个月，瘦了五斤，裤子都松了。" },
      { text: "只运动不节食", effects: { health: 4, happy: 2 }, result: "你只运动不节食，体重没怎么变，但身体结实了。" },
      { text: "算了", effects: { happy: 3 }, result: "你算了，觉得开心最重要，胖点也没什么。" },
    ] },
  { id: "dental", title: "牙疼", text: "你牙疼得睡不着，半边脸都肿了。",
    choices: [
      { text: "去看牙医", effects: { money: -200, health: 6 }, result: "你去看了牙医，补了牙，不疼了，就是钱包疼。" },
      { text: "吃止疼药", effects: { health: 2, money: -20 }, result: "你吃了止疼药，暂时不疼了，但问题还在。" },
      { text: "忍着", effects: { health: -4, happy: -3 }, result: "你忍了三天，疼得吃不下饭，终于去看了。" },
    ] },
  { id: "basketball-team", title: "篮球队选拔", text: "院篮球队选拔，队长说你有潜力，让你去试试。",
    choices: [
      { text: "去试试", effects: { health: 6, charm: 6, happy: 5 }, result: "你去试了，居然选上了，每周训练，成了院队的一员。" },
      { text: "当替补", effects: { health: 3, charm: 3 }, result: "你当了替补，上场机会不多，但训练一点没落下。" },
      { text: "不去", effects: { happy: 2 }, result: "你没去，觉得打球当个爱好就挺好。" },
    ] },
  { id: "yoga", title: "瑜伽课", text: "体育课选了瑜伽，全班就你一个男生，老师让你别紧张。",
    choices: [
      { text: "认真练", effects: { health: 6, charm: 4, happy: 4 }, result: "你认真练了，柔韧性好了不少，班里女生都夸你。" },
      { text: "划水", effects: { happy: 3 }, result: "你划了一学期水，考试居然也过了。" },
      { text: "退课", effects: { happy: 1 }, result: "你退课了，换了门篮球课。" },
    ] },
  { id: "health-check", title: "体检", text: "学校组织体检，抽血、拍片、量血压，一套流程下来半天没了。",
    choices: [
      { text: "全部正常", effects: { health: 4, happy: 5 }, result: "你全部正常，身体倍儿棒，继续保持。" },
      { text: "有点小问题", effects: { health: -2, iq: 2 }, result: "查出点小问题，医生让你注意作息，你开始早睡了。" },
      { text: "没去", effects: { happy: 1 }, result: "你没去，觉得自己身体好得很，没必要。" },
    ] },
  { id: "midnight-run", title: "夜跑", text: "室友拉你夜跑，说夜跑能减肥还能助眠。",
    choices: [
      { text: "一起跑", effects: { health: 5, happy: 4, charm: 3 }, result: "你们一起跑，跑完出了一身汗，晚上睡得特别香。" },
      { text: "跑一半", effects: { health: 2, happy: 2 }, result: "你跑了一半就回来了，剩下的路走回去的。" },
      { text: "不去", effects: { happy: 2 }, result: "你没去，在宿舍躺着，也挺舒服。" },
    ] },
  // ---- v1.1 新增：娱乐游戏 ----
  { id: "new-game", title: "新游戏发售", text: "你等了半年的游戏终于发售了，首发价 298，室友已经买了。",
    choices: [
      { text: "首发入手", effects: { money: -298, happy: 10 }, result: "你首发入手了，玩了整整一个周末，值回票价。" },
      { text: "等打折", effects: { happy: 3, money: 0 }, result: "你决定等打折，先云了两天，居然也没那么馋了。" },
      { text: "借室友的号", effects: { happy: 6, charm: 2 }, result: "你借了室友的号玩，他大方得很，你玩得也很开心。" },
    ] },
  { id: "movie-night", title: "电影之夜", text: "周末宿舍电影之夜，投影仪架好了，片单有喜剧、恐怖片和爱情片。",
    choices: [
      { text: "看喜剧", effects: { happy: 8, charm: 3 }, result: "你们看了喜剧，笑了一晚上，肚子都笑疼了。" },
      { text: "看恐怖片", effects: { happy: 7, health: -2 }, result: "你们看了恐怖片，吓得半夜不敢上厕所，但刺激。" },
      { text: "看爱情片", effects: { happy: 5, charm: 4 }, result: "你们看了爱情片，有人看哭了，有人看笑了。" },
    ] },
  { id: "concert", title: "演唱会", text: "喜欢的歌手来开演唱会，票 580，抢票的人特别多。",
    choices: [
      { text: "抢到了", effects: { money: -580, happy: 12 }, result: "你抢到了票，现场气氛炸裂，嗓子都喊哑了，值了。" },
      { text: "没抢到", effects: { happy: -4 }, result: "你没抢到票，在宿舍看了直播，也还行。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，觉得 580 太贵了，在宿舍听歌也一样。" },
    ] },
  { id: "esports", title: "电竞比赛", text: "学校电竞比赛报名，你和室友组了个队，目标是冠军。",
    choices: [
      { text: "认真打", effects: { happy: 8, charm: 5, iq: -3 }, result: "你们认真打，一路杀进决赛，虽然最后输了，但打得特别过瘾。" },
      { text: "随便玩玩", effects: { happy: 5 }, result: "你们随便玩玩，第一轮就被淘汰了，但过程很开心。" },
      { text: "当观众", effects: { happy: 3 }, result: "你当了观众，在台下喊加油，也挺热闹。" },
    ] },
  { id: "binge-drama", title: "追剧", text: "最近有部剧特别火，全宿舍都在追，更新到一半断更了。",
    choices: [
      { text: "追更", effects: { happy: 7, iq: -2 }, result: "你追更追到半夜，剧情越来越上头，根本停不下来。" },
      { text: "等完结", effects: { happy: 3, iq: 1 }, result: "你决定等完结再看，先安心学习。" },
      { text: "不追", effects: { happy: 1 }, result: "你不追，在宿舍打游戏，也挺好。" },
    ] },
  { id: "karaoke", title: "KTV", text: "朋友约你去 KTV，包厢已经订好了，麦霸的位置留给你。",
    choices: [
      { text: "去", effects: { happy: 8, charm: 5, money: -100 }, result: "你去了，唱了三小时，嗓子哑了，但特别尽兴。" },
      { text: "去但不唱", effects: { happy: 4, money: -50 }, result: "你去了但不怎么唱，坐着听别人唱，也挺有意思。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍看剧，也挺安静。" },
    ] },
  { id: "board-game", title: "桌游之夜", text: "宿舍买了桌游，狼人杀、三国杀、剧本杀，今晚开一局。",
    choices: [
      { text: "玩狼人杀", effects: { happy: 7, charm: 4 }, result: "你们玩了狼人杀，你当狼人，骗过了所有人，赢麻了。" },
      { text: "玩剧本杀", effects: { happy: 8, iq: 3 }, result: "你们玩了剧本杀，推理了一晚上，真相揭开的时候全场尖叫。" },
      { text: "不玩", effects: { happy: 1 }, result: "你没玩，在旁边看他们玩，也挺有意思。" },
    ] },
  { id: "live-stream", title: "直播", text: "你心血来潮开了个直播，打游戏，居然有人看，还有人刷礼物。",
    choices: [
      { text: "坚持播", effects: { happy: 7, charm: 6, money: 100, iq: -2 }, result: "你坚持播了一个月，粉丝涨了不少，还赚了点零花钱。" },
      { text: "播一次", effects: { happy: 4, money: 20 }, result: "你播了一次，赚了 20 块，感觉还挺有意思。" },
      { text: "不播了", effects: { happy: 1 }, result: "你不播了，觉得还是自己玩更自在。" },
    ] },
  { id: "music-fest", title: "音乐节", text: "学校办音乐节，有乐队演出，还有美食摊位，全校都在狂欢。",
    choices: [
      { text: "去嗨", effects: { happy: 9, charm: 5, money: -80 }, result: "你去嗨了，跟着音乐蹦了一晚上，嗓子都喊哑了。" },
      { text: "去逛吃", effects: { happy: 6, money: -60 }, result: "你去逛吃了，小吃摊一路吃过去，满足。" },
      { text: "在宿舍听", effects: { happy: 3 }, result: "你在宿舍听，音乐声飘进来，也挺有氛围。" },
    ] },
  { id: "anime", title: "新番", text: "新番开播，你追的番更新了，室友也在追，两个人一起看。",
    choices: [
      { text: "一起追", effects: { happy: 7, charm: 3 }, result: "你们一起追，每周更新都准时看，成了固定的快乐。" },
      { text: "自己追", effects: { happy: 5 }, result: "你自己追，半夜看完还要忍住不剧透，憋得难受。" },
      { text: "不追", effects: { happy: 1 }, result: "你不追，在宿舍打游戏，也挺好。" },
    ] },
  // ---- v1.1 新增：校园活动 ----
  { id: "volunteer", title: "志愿者", text: "学校招志愿者，去敬老院/支教/大型活动服务，算志愿时长。",
    choices: [
      { text: "报名", effects: { charm: 6, happy: 6, health: -2 }, result: "你报名了，去服务了一天，特别有意义，还认识了不少人。" },
      { text: "观望", effects: { happy: 2 }, result: "你观望了一下，决定下次再去。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍休息，也挺好。" },
    ] },
  { id: "speech-contest", title: "演讲比赛", text: "学校办演讲比赛，老师推荐你参加，说你口才不错。",
    choices: [
      { text: "参加", effects: { charm: 7, happy: 6, iq: 2 }, result: "你参加了，虽然紧张，但讲得特别好，还拿了奖。" },
      { text: "当观众", effects: { happy: 3 }, result: "你当了观众，听别人演讲，也学到了不少。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍看剧，也挺安静。" },
    ] },
  { id: "debate", title: "辩论赛", text: "院辩论队招新，你被拉去当辩手，辩题是你完全不懂的领域。",
    choices: [
      { text: "硬着头皮上", effects: { iq: 6, charm: 5, happy: 4 }, result: "你硬着头皮上了，准备了一周，居然赢了，特别有成就感。" },
      { text: "当后勤", effects: { charm: 3, happy: 3 }, result: "你当了后勤，帮忙准备资料，也挺有参与感。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍打游戏，也挺好。" },
    ] },
  { id: "lecture", title: "名家讲座", text: "学校请了个大牛来讲座，票很难抢，现场座无虚席。",
    choices: [
      { text: "去听", effects: { iq: 6, happy: 4 }, result: "你去听了，大牛讲得特别精彩，你记了满满一页笔记。" },
      { text: "站着听", effects: { iq: 4, health: -2 }, result: "你站着听完了，虽然腿酸，但值了。" },
      { text: "看回放", effects: { iq: 3, happy: 2 }, result: "你看了回放，倍速刷完，也学到了不少。" },
    ] },
  { id: "startup-comp", title: "创业大赛", text: "学校办创业大赛，奖金 5 万，你有个想法一直想试试。",
    choices: [
      { text: "组队参加", effects: { iq: 5, charm: 5, money: -200, happy: 4 }, result: "你组队参加了，虽然没拿奖，但路演的经验特别宝贵。" },
      { text: "自己参加", effects: { iq: 4, happy: 3 }, result: "你自己参加了，项目做得有模有样，评委都夸你。" },
      { text: "不参加", effects: { happy: 1 }, result: "你没参加，觉得想法还不成熟，先放放。" },
    ] },
  { id: "exchange", title: "交换生", text: "学校有交换生名额，去外地/国外交流一学期，机会难得。",
    choices: [
      { text: "申请", effects: { iq: 5, charm: 6, money: -2000, happy: 8 }, result: "你申请上了，交流了一学期，见识了不一样的世界，回来整个人都不一样了。" },
      { text: "想想", effects: { happy: 2 }, result: "你想了想，觉得时机还不成熟，下次再说。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在学校安心上课，也挺好。" },
    ] },
  { id: "canteen-new", title: "食堂新窗口", text: "食堂开了个新窗口，卖螺蛳粉，味道飘了半个食堂。",
    choices: [
      { text: "去尝尝", effects: { money: -15, happy: 7 }, result: "你去尝了，味道绝了，就是吃完身上全是味，室友嫌弃了你半天。" },
      { text: "观望", effects: { happy: 2 }, result: "你观望了一下，决定下次再去。" },
      { text: "不吃", effects: { happy: 1 }, result: "你没吃，觉得螺蛳粉味道太大了。" },
    ] },
  { id: "campus-fair", title: "校园集市", text: "学校办校园集市，学生摆摊卖手作、二手、美食，热闹得很。",
    choices: [
      { text: "去逛", effects: { happy: 6, money: -50 }, result: "你去逛了，买了点小玩意儿，还认识了几个摊主。" },
      { text: "去摆摊", effects: { money: 100, charm: 5, happy: 5 }, result: "你去摆摊了，卖了点旧东西，赚了 100，还挺有成就感。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍休息，也挺好。" },
    ] },
  { id: "photo-contest", title: "摄影大赛", text: "学校办摄影大赛，主题是“校园生活”，奖品是相机。",
    choices: [
      { text: "参加", effects: { charm: 5, happy: 6, iq: 2 }, result: "你参加了，拍了不少好照片，虽然没拿奖，但作品被展出来了。" },
      { text: "当评委", effects: { charm: 4, happy: 3 }, result: "你当了评委，看了几百张照片，审美都提高了。" },
      { text: "不参加", effects: { happy: 1 }, result: "你没参加，在宿舍看剧，也挺好。" },
    ] },
  { id: "sports-meet", title: "校运会", text: "校运会开幕，全校都在看，班里需要人去当啦啦队。",
    choices: [
      { text: "当啦啦队", effects: { charm: 5, happy: 6 }, result: "你当了啦啦队，喊了一下午，嗓子哑了，但特别热血。" },
      { text: "去参赛", effects: { health: 6, charm: 5, happy: 5 }, result: "你去参赛了，虽然没拿名次，但跑完了全程，特别有成就感。" },
      { text: "当观众", effects: { happy: 3 }, result: "你在看台上当观众，给认识的人加油，也挺热闹。" },
    ] },
  // ---- v1.1 新增：意外事件 ----
  { id: "umbrella", title: "忘带伞", text: "下课了，外面下起了大雨，你没带伞，宿舍还有十分钟路。",
    choices: [
      { text: "淋雨跑回去", effects: { health: -4, happy: 3 }, result: "你淋雨跑回去，浑身湿透，但居然有点爽。" },
      { text: "等雨停", effects: { iq: 2, happy: 2 }, result: "你等了半小时，雨停了，还顺便背了几个单词。" },
      { text: "借伞", effects: { charm: 3, happy: 3 }, result: "你借了同学的伞，两个人挤一把伞回去，关系更好了。" },
    ] },
  { id: "lost-phone", title: "手机丢了", text: "手机不见了，翻遍了书包和宿舍都没找到。",
    choices: [
      { text: "用室友手机打过去", effects: { happy: 5, charm: 2 }, result: "你用室友手机打过去，居然在图书馆的桌子上找到了，虚惊一场。" },
      { text: "去失物招领", effects: { happy: 3 }, result: "你去失物招领问了，居然真的在那，失而复得的感觉真好。" },
      { text: "买新的", effects: { money: -2000, happy: 5 }, result: "你买了新的，旧手机后来在床底下找到了，白花了钱。" },
    ] },
  { id: "wrong-classroom", title: "走错教室", text: "你走错教室了，坐了十分钟才发现这不是你的课。",
    choices: [
      { text: "悄悄溜走", effects: { happy: 3 }, result: "你悄悄溜走了，没人发现，尴尬但好笑。" },
      { text: "将错就错听完", effects: { iq: 3, happy: 2 }, result: "你将错就错听完了，居然还挺有意思，学到了点别的知识。" },
      { text: "直接站起来走", effects: { charm: -2, happy: 2 }, result: "你直接站起来走了，全班都看着你，你硬着头皮走出去了。" },
    ] },
  { id: "elevator", title: "电梯坏了", text: "电梯坏了，你住六楼，只能爬楼梯。",
    choices: [
      { text: "爬上去", effects: { health: 4, happy: -1 }, result: "你爬上去了，腿都软了，但就当锻炼了。" },
      { text: "等电梯修好", effects: { happy: 1 }, result: "你等了一会儿，电梯修好了，省了不少力气。" },
      { text: "去朋友宿舍蹭", effects: { charm: 3, happy: 3 }, result: "你去朋友宿舍蹭了一晚上，聊到半夜才回来。" },
    ] },
  { id: "fire-drill", title: "消防演习", text: "学校消防演习，警报响了，全楼的人都要下楼集合。",
    choices: [
      { text: "认真参加", effects: { health: 3, happy: 2 }, result: "你认真参加了，学到了不少消防知识，还挺有用的。" },
      { text: "磨磨蹭蹭", effects: { happy: 1 }, result: "你磨磨蹭蹭地下楼，演习都快结束了你才到。" },
      { text: "在宿舍待着", effects: { happy: 2, charm: -2 }, result: "你在宿舍待着，被宿管发现了，批评了一顿。" },
    ] },
  { id: "stray-dog", title: "流浪狗", text: "校园里有只流浪狗，毛茸茸的，跟着你走了半天。",
    choices: [
      { text: "喂它", effects: { money: -10, happy: 7 }, result: "你喂了它，它摇着尾巴走了，你心里暖暖的。" },
      { text: "带回宿舍", effects: { happy: 8, charm: 3 }, result: "你带回宿舍养了几天，后来被好心人领养了，你还有点舍不得。" },
      { text: "不管", effects: { happy: -1 }, result: "你没管，它跟了你一会儿就走了，你有点惦记。" },
    ] },
  { id: "rainy-day", title: "雨天", text: "下雨天，宿舍特别安静，适合睡觉也适合学习。",
    choices: [
      { text: "睡觉", effects: { health: 5, happy: 4 }, result: "你睡了一下午，雨声是最好的白噪音，醒来神清气爽。" },
      { text: "学习", effects: { iq: 5, happy: 2 }, result: "你学习了一下午，雨天学习效率特别高。" },
      { text: "看剧", effects: { happy: 6, iq: -1 }, result: "你看了一下午剧，雨天追剧也太舒服了。" },
    ] },
  { id: "snow", title: "下雪了", text: "下雪了，校园一片白，南方来的同学兴奋得不行。",
    choices: [
      { text: "打雪仗", effects: { happy: 9, health: 3, charm: 4 }, result: "你们打雪仗了，玩到浑身是雪，笑得停不下来。" },
      { text: "堆雪人", effects: { happy: 7, charm: 3 }, result: "你们堆了个雪人，还给它戴了围巾，成了校园一景。" },
      { text: "在宿舍看雪", effects: { happy: 4 }, result: "你在宿舍看雪，暖和又安静，也挺好。" },
    ] },
  { id: "hot-day", title: "高温天", text: "高温天，宿舍像蒸笼，风扇转得再快也没用。",
    choices: [
      { text: "去图书馆", effects: { iq: 4, happy: 3 }, result: "你去图书馆蹭空调，顺便看了一下午书。" },
      { text: "买冰棍", effects: { money: -10, happy: 5 }, result: "你买了冰棍，一根接一根，凉快了不少。" },
      { text: "冲凉水澡", effects: { health: 3, happy: 3 }, result: "你冲了个凉水澡，浑身舒坦，暂时凉快了。" },
    ] },
  { id: "midnight-hunger", title: "半夜饿了", text: "半夜两点，肚子叫得比室友的呼噜还响，外卖都关了。",
    choices: [
      { text: "泡面", effects: { money: -5, happy: 5, health: -2 }, result: "你泡了碗面，半夜吃泡面也太香了。" },
      { text: "忍到天亮", effects: { health: 2, happy: -3 }, result: "你忍到天亮，吃早饭的时候风卷残云。" },
      { text: "翻零食", effects: { happy: 4, charm: -2 }, result: "你翻了室友的零食，第二天被他发现了，赔了一包大的。" },
    ] },
  // ---- v1.1 新增：大三/大四专属 ----
  { id: "kaoyan-start", title: "决定考研", text: "你决定考研了，目标院校已经定了，接下来是一年的硬仗。", year: 3,
    choices: [
      { text: "制定计划", effects: { iq: 6, credits: 4, happy: -4 }, result: "你制定了详细的计划，每天按表执行，稳稳地推进。" },
      { text: "先买资料", effects: { money: -300, iq: 3 }, result: "你先买了资料，书堆得比人还高，看着就很有干劲。" },
      { text: "找研友", effects: { charm: 5, iq: 3, happy: 3 }, result: "你找了个研友，两个人互相监督，学习一点不孤单。" },
    ] },
  { id: "intern-interview", title: "实习面试", text: "你投了实习，收到面试邀请，明天就要去面试。", year: 3,
    choices: [
      { text: "认真准备", effects: { iq: 5, charm: 5, happy: -2 }, result: "你认真准备了，面试表现特别好，当场就拿到了 offer。" },
      { text: "临场发挥", effects: { charm: 4, happy: 2 }, result: "你临场发挥，居然也过了，运气不错。" },
      { text: "紧张得睡不着", effects: { health: -3, happy: -2 }, result: "你紧张得睡不着，第二天顶着黑眼圈去面试，居然也过了。" },
    ] },
  { id: "job-fair", title: "招聘会", text: "学校办招聘会，几百家企业，好岗位就那么几个。", year: 4,
    choices: [
      { text: "海投简历", effects: { iq: 3, charm: 4, happy: -2 }, result: "你海投了简历，收到了几个面试邀请，有戏。" },
      { text: "精准投递", effects: { iq: 5, charm: 3 }, result: "你精准投递了几家心仪的公司，命中率还挺高。" },
      { text: "先观望", effects: { happy: 2 }, result: "你先观望了一下，决定过两天再去。" },
    ] },
  { id: "grad-design", title: "毕业设计", text: "毕业设计开题，导师让你先交个方案，deadline 就在眼前。", year: 4,
    choices: [
      { text: "提前开做", effects: { iq: 6, credits: 5, happy: -4 }, result: "你提前开做，改了三稿，导师夸你态度好。" },
      { text: "拖到最后", effects: { iq: -3, credits: -3, happy: 4 }, result: "你拖到最后三天，通宵赶完，差点没赶上。" },
      { text: "找同学合作", effects: { iq: 4, charm: 5 }, result: "你找同学合作，两个人分工明确，效率高了不少。" },
    ] },
  { id: "civil-exam", title: "考公", text: "你决定考公了，行测申论都要学，竞争比考研还激烈。", year: 4,
    choices: [
      { text: "报班", effects: { money: -2000, iq: 5 }, result: "你报了个班，老师讲得挺有意思，就是贵。" },
      { text: "自学", effects: { iq: 5, happy: -3 }, result: "你自学了，每天刷题，行测越做越顺。" },
      { text: "先考着试试", effects: { iq: 3, happy: 2 }, result: "你先考着试试，积累经验，下次再战。" },
    ] },
  { id: "abroad", title: "出国留学", text: "你想出国留学，语言考试和申请材料都要准备，费用也不低。", year: 3,
    choices: [
      { text: "考语言", effects: { iq: 6, money: -2000, happy: -3 }, result: "你考了语言，一次就过了，申请材料也准备得差不多了。" },
      { text: "找中介", effects: { money: -5000, iq: 2 }, result: "你找了中介，省了不少事，就是贵。" },
      { text: "先放放", effects: { happy: 2 }, result: "你先放放了，觉得时机还不成熟。" },
    ] },
  { id: "thesis-defense", title: "论文答辩", text: "论文答辩的日子到了，评委老师坐在下面，你有点紧张。", year: 4,
    choices: [
      { text: "从容应对", effects: { iq: 5, credits: 5, charm: 4 }, result: "你从容应对，评委的问题都答上来了，顺利通过。" },
      { text: "紧张但过了", effects: { credits: 4, happy: 3 }, result: "你紧张得手心出汗，但还是过了，松了口气。" },
      { text: "被问住了", effects: { credits: 2, happy: -2 }, result: "你被问住了几个问题，回去改了一版，终于过了。" },
    ] },
  { id: "farewell-trip", title: "毕业旅行", text: "毕业前，全宿舍想去旅行一次，目的地还没定，预算也不多。", year: 4,
    choices: [
      { text: "去", effects: { money: -1000, happy: 10, charm: 5 }, result: "你们去了，玩了三天，拍了几百张照片，这趟旅行会记一辈子。" },
      { text: "穷游", effects: { money: -400, happy: 8 }, result: "你们穷游了一圈，住青旅吃路边摊，但开心一点没少。" },
      { text: "不去", effects: { happy: -2 }, result: "你没去，在宿舍收拾行李，有点遗憾。" },
    ] },
  { id: "first-job", title: "第一份工作", text: "你拿到了一份工作 offer，工资一般，但平台不错，你有点犹豫。", year: 4,
    choices: [
      { text: "接受", effects: { money: 2000, happy: 6, charm: 4 }, result: "你接受了，入职后发现平台确实不错，学到了很多。" },
      { text: "再看看", effects: { happy: 2, iq: 2 }, result: "你再看看，又投了几家，最后选了个更好的。" },
      { text: "拒绝", effects: { happy: 3 }, result: "你拒绝了，决定再找找，相信会有更好的。" },
    ] },
  { id: "dorm-moveout", title: "搬出宿舍", text: "毕业了，要搬出宿舍了，四年的东西装了满满几大箱。",
    choices: [
      { text: "好好收拾", effects: { happy: 5, charm: 3 }, result: "你好好收拾了，翻出了不少回忆，有点舍不得。" },
      { text: "全扔了", effects: { happy: 4, money: 50 }, result: "你全扔了/卖了，轻装上阵，居然还赚了 50。" },
      { text: "留给学弟", effects: { charm: 6, happy: 5 }, result: "你留给了学弟不少东西，他感动得不行，请你吃了顿饭。" },
    ] },
  // ---- v1.1 新增：趣味/抽象 ----
  { id: "fortune-teller", title: "算命", text: "学校门口有个算命的，说你今年有桃花运，还有贵人相助。",
    choices: [
      { text: "算一卦", effects: { money: -20, happy: 5 }, result: "你算了一卦，说你今年有好事发生，你半信半疑，但心情挺好。" },
      { text: "不信", effects: { happy: 1 }, result: "你不信，觉得都是心理作用，但还是忍不住想了想。" },
      { text: "拉室友一起", effects: { money: -40, happy: 7, charm: 3 }, result: "你拉室友一起算，两个人听得津津有味，出来还在讨论。" },
    ] },
  { id: "lucky-day", title: "幸运的一天", text: "今天运气特别好，捡到钱、食堂阿姨多打了肉、考试蒙的全对。",
    choices: [
      { text: "买彩票", effects: { money: -10 }, odds: { chance: 0.2, win: { money: 300, happy: 10 }, winText: "又中了！300 块！今天真是你的幸运日。", lose: { happy: -1 }, loseText: "没中。运气都用在前面了。" } },
      { text: "珍惜这一天", effects: { happy: 8 }, result: "你珍惜这一天，做了不少事，件件都顺。" },
      { text: "请朋友吃饭", effects: { money: -100, happy: 7, charm: 5 }, result: "你请朋友吃饭，把好运分享出去，大家都开心。" },
    ] },
  { id: "dream", title: "做了个梦", text: "你做了个梦，梦见自己成了亿万富翁，醒来发现还在宿舍。",
    choices: [
      { text: "继续睡", effects: { health: 4, happy: 3 }, result: "你继续睡了，想把梦做完，结果睡过了头。" },
      { text: "起来奋斗", effects: { iq: 3, happy: 2 }, result: "你起来奋斗了，梦里的亿万富翁激励了你。" },
      { text: "讲给室友听", effects: { happy: 5, charm: 3 }, result: "你讲给室友听，全宿舍笑了一早上。" },
    ] },
  { id: "time-capsule", title: "时间胶囊", text: "你和室友埋了个时间胶囊，写给四年后的自己，约好毕业那天挖出来。",
    choices: [
      { text: "认真写", effects: { happy: 6, charm: 4 }, result: "你认真写了，写满了对未来的期待，埋下去的那一刻特别有仪式感。" },
      { text: "随便写", effects: { happy: 3 }, result: "你随便写了两句，也挺好，重在参与。" },
      { text: "不参与", effects: { happy: 1 }, result: "你没参与，在旁边看着他们埋，也挺有意思。" },
    ] },
  { id: "campus-legend", title: "校园传说", text: "听说学校有个传说：半夜十二点，图书馆会传出翻书声。",
    choices: [
      { text: "去探险", effects: { happy: 8, health: -2, charm: 4 }, result: "你们去探险了，什么也没发现，但过程刺激得不行。" },
      { text: "不信", effects: { happy: 1 }, result: "你不信，觉得都是编出来的，但晚上路过图书馆还是加快了脚步。" },
      { text: "讲给别人听", effects: { happy: 4, charm: 3 }, result: "你讲给别人听，越传越玄，你成了校园传说的传播者。" },
    ] },
  { id: "wish-wall", title: "许愿墙", text: "学校有面许愿墙，贴满了大家的愿望，你也想写一个。",
    choices: [
      { text: "写愿望", effects: { happy: 5, iq: 2 }, result: "你写了愿望，贴在墙上最显眼的地方，希望它能实现。" },
      { text: "看看别人的", effects: { happy: 3 }, result: "你看了别人的愿望，有的搞笑有的感人，你笑了也感动了。" },
      { text: "不写", effects: { happy: 1 }, result: "你没写，觉得愿望在心里就行。" },
    ] },
  // ---- v1.1 新增（第 4 批）：混合 ----
  { id: "roommate-cooking", title: "室友做饭", text: "室友买了个小电锅，非要在宿舍做饭，香味飘满了整层楼。",
    choices: [
      { text: "一起吃", effects: { money: -20, happy: 8, health: 2 }, result: "你们一起吃了，他手艺居然不错，宿舍成了小饭馆。" },
      { text: "劝他别做", effects: { charm: 2, happy: -1 }, result: "你劝他别做，他答应了，但还是偷偷做了几次。" },
      { text: "蹭一口", effects: { happy: 5 }, result: "你蹭了一口，味道还不错，就是有点咸。" },
    ] },
  { id: "shared-bike", title: "共享单车", text: "共享单车坏了，你扫了三辆都是坏的，第四辆终于能骑。",
    choices: [
      { text: "骑走", effects: { happy: 3, health: 2 }, result: "你骑走了，风驰电掣，赶上了早课。" },
      { text: "走路去", effects: { health: 3, happy: -1 }, result: "你走路去了，走到一半发现其实也不远。" },
      { text: "打车", effects: { money: -12, happy: 2 }, result: "你打车去了，贵了点，但准时到了。" },
    ] },
  { id: "exam-cheat2", title: "考前划重点", text: "考前老师划重点，全班都在记，你的笔没水了。",
    choices: [
      { text: "借笔", effects: { charm: 3, iq: 3 }, result: "你借了笔，记下了重点，考试稳了。" },
      { text: "拍照", effects: { iq: 2, happy: 2 }, result: "你拍照了，重点都在手机里，回去慢慢看。" },
      { text: "不记", effects: { happy: 1, iq: -2 }, result: "你没记，觉得都懂了，考试的时候发现好像没那么懂。" },
    ] },
  { id: "club-trip", title: "社团出游", text: "社团组织出游，去郊外爬山烧烤，费用 AA。",
    choices: [
      { text: "去", effects: { money: -120, happy: 9, charm: 5, health: 3 }, result: "你去了，爬山烧烤玩了一天，认识了不少新朋友。" },
      { text: "只去烧烤", effects: { money: -60, happy: 6 }, result: "你只去了烧烤部分，吃得饱饱的，也挺开心。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍休息，也挺好。" },
    ] },
  { id: "part-time-delivery", title: "送外卖兼职", text: "有人介绍你去送外卖，时间自由，多劳多得。",
    choices: [
      { text: "去送", effects: { money: 500, health: -5, happy: -2 }, result: "你去送了，一天跑了几十单，累是累，但赚钱是真的。" },
      { text: "只送周末", effects: { money: 200, health: -2 }, result: "你只送周末，赚点零花钱，也不耽误学习。" },
      { text: "不去", effects: { happy: 2 }, result: "你没去，觉得太辛苦了。" },
    ] },
  { id: "gym-buddy", title: "健身搭子", text: "你找了个健身搭子，两个人互相监督，一起练。",
    choices: [
      { text: "坚持练", effects: { health: 7, charm: 4, happy: 4 }, result: "你们坚持练，一个月下来，体型变化特别明显。" },
      { text: "三天打鱼", effects: { health: 2, happy: 2 }, result: "你们三天打鱼两天晒网，练是练了，但效果一般。" },
      { text: "散伙", effects: { happy: 1 }, result: "你们散伙了，各练各的，也挺好。" },
    ] },
  { id: "movie-fail", title: "电影票", text: "你买了电影票，到了电影院才发现走错影厅了。",
    choices: [
      { text: "将错就错", effects: { happy: 5 }, result: "你将错就错看了另一部，居然还挺好看，意外之喜。" },
      { text: "换回来", effects: { happy: 3 }, result: "你换回来了，赶上了开头，松了口气。" },
      { text: "退票", effects: { money: 20, happy: -1 }, result: "你退票了，损失了点手续费，但省了时间。" },
    ] },
  { id: "hackathon", title: "黑客马拉松", text: "学校办黑客马拉松，24 小时做出一个产品，奖金 1 万。",
    choices: [
      { text: "组队参加", effects: { iq: 7, charm: 4, happy: 5, health: -5 }, result: "你们组队参加了，24 小时没睡，做出了一个像样的产品，虽然没拿奖，但经验拉满。" },
      { text: "当观众", effects: { happy: 3 }, result: "你当了观众，看别人熬夜做产品，也挺佩服。" },
      { text: "不参加", effects: { happy: 1 }, result: "你没参加，在宿舍睡觉，也挺好。" },
    ] },
  { id: "lost-key", title: "钥匙丢了", text: "宿舍钥匙丢了，你被锁在门外，室友都不在。",
    choices: [
      { text: "找宿管", effects: { happy: 3, charm: 2 }, result: "你找宿管借了备用钥匙，进了门，松了口气。" },
      { text: "等室友", effects: { happy: 1 }, result: "你等了半小时，室友回来了，终于进门了。" },
      { text: "配一把", effects: { money: -15, happy: 2 }, result: "你配了一把新钥匙，以后多了一把备用。" },
    ] },
  { id: "midnight-study", title: "深夜自习室", text: "深夜自习室，灯火通明，都是在备考的人，你也想加入。",
    choices: [
      { text: "加入", effects: { iq: 5, credits: 3, health: -3 }, result: "你加入了，学到半夜，氛围特别好，效率奇高。" },
      { text: "偶尔去", effects: { iq: 2, happy: 2 }, result: "你偶尔去，蹭点氛围，也挺好。" },
      { text: "不去", effects: { happy: 2 }, result: "你没去，在宿舍学习，也挺好。" },
    ] },
  { id: "birthday-self", title: "自己的生日", text: "今天是你的生日，室友给你准备了惊喜。",
    choices: [
      { text: "请全宿舍吃饭", effects: { money: -200, happy: 10, charm: 6 }, result: "你请全宿舍吃饭，大家给你唱生日歌，蛋糕上的蜡烛吹了三次才灭。" },
      { text: "简单过", effects: { happy: 7, charm: 4 }, result: "你们简单过了，吃了蛋糕聊了天，温馨又开心。" },
      { text: "不过生日", effects: { happy: 2 }, result: "你没过生日，一个人吃了碗长寿面，也挺好。" },
    ] },
  { id: "intern-offer2", title: "实习转正", text: "实习公司想让你转正，工资不错，但你要放弃考研的计划。", year: 3,
    choices: [
      { text: "转正", effects: { money: 3000, happy: 6, iq: -2 }, result: "你转正了，提前有了工作，同学们都羡慕你。" },
      { text: "继续考研", effects: { iq: 5, happy: -2 }, result: "你决定继续考研，放弃了转正的机会，心里有点不舍但目标明确。" },
      { text: "边工作边考研", effects: { iq: 3, health: -4, money: 1000 }, result: "你边工作边考研，累是累，但两边都没落下。" },
    ] },
  { id: "dorm-inspection2", title: "文明宿舍评比", text: "文明宿舍评比，全楼都在打扫，你们宿舍也有希望拿奖。",
    choices: [
      { text: "认真打扫", effects: { health: 4, charm: 5, happy: 3 }, result: "你们认真打扫了，居然真的拿了奖，还发了奖金。" },
      { text: "意思一下", effects: { happy: 2 }, result: "你们意思了一下，没拿奖，但宿舍干净了不少。" },
      { text: "不管", effects: { happy: 1 }, result: "你们没管，宿舍还是老样子。" },
    ] },
  { id: "campus-card2", title: "校园卡充值", text: "校园卡没钱了，饭卡、水卡、电卡全停了，充值要去服务中心。",
    choices: [
      { text: "去充", effects: { money: -200, happy: 2 }, result: "你去充了 200，一次性搞定，省心。" },
      { text: "网上充", effects: { money: -100, happy: 3 }, result: "你网上充了 100，方便是方便，但到账有点慢。" },
      { text: "借室友的", effects: { charm: 2, happy: 1 }, result: "你借了室友的卡，蹭了两天，终于去充了。" },
    ] },
  { id: "sports-injury", title: "运动受伤", text: "打球的时候崴了脚，走路一瘸一拐的。",
    choices: [
      { text: "去校医院", effects: { money: -50, health: 5 }, result: "你去校医院看了，医生说没大碍，休息几天就好。" },
      { text: "硬扛", effects: { health: -4, happy: -2 }, result: "你硬扛了一周，脚还是疼，终于去看了。" },
      { text: "冰敷", effects: { health: 3, happy: 1 }, result: "你冰敷了几天，肿消了，走路也利索了。" },
    ] },
  { id: "club-funding", title: "社团拉赞助", text: "社团要办活动，需要拉赞助，社长把任务交给了你。",
    choices: [
      { text: "去谈", effects: { charm: 6, iq: 3, happy: 3 }, result: "你去谈了，跑了三家店，谈下来一家，活动经费有着落了。" },
      { text: "找人帮忙", effects: { charm: 4, happy: 2 }, result: "你找人帮忙，两个人一起去，成功率更高了。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，活动推迟了，你落了个清闲。" },
    ] },
  { id: "exam-cheat3", title: "开卷考试", text: "开卷考试，可以带书，全班都在翻书找答案。",
    choices: [
      { text: "提前整理", effects: { iq: 5, credits: 4 }, result: "你提前整理了笔记，考试的时候翻得飞快，稳稳地过了。" },
      { text: "现场翻书", effects: { iq: 2, credits: 2 }, result: "你现场翻书，翻得手忙脚乱，勉强写完了。" },
      { text: "裸考", effects: { happy: 3, credits: -1 }, result: "你裸考了，全靠记忆，居然也过了大半。" },
    ] },
  { id: "roommate-move", title: "室友搬走了", text: "室友搬走了，宿舍空了一个床位，新室友下周才来。",
    choices: [
      { text: "独享大宿舍", effects: { happy: 6 }, result: "你独享大宿舍一周，安静又自在，就是有点想他。" },
      { text: "想念他", effects: { happy: 2, charm: 2 }, result: "你有点想他，两个人约了周末一起吃饭。" },
      { text: "期待新室友", effects: { happy: 4, charm: 3 }, result: "你期待新室友，希望是个好相处的人。" },
    ] },
  { id: "online-shopping", title: "网购", text: "网购的东西到了，拆开一看，和图片完全不一样。",
    choices: [
      { text: "退货", effects: { money: 0, happy: -2 }, result: "你退货了，虽然麻烦，但钱回来了。" },
      { text: "将就着用", effects: { happy: 1 }, result: "你将就着用了，其实也没那么差。" },
      { text: "给差评", effects: { happy: 3 }, result: "你给了差评，商家还来求你改，你乐了半天。" },
    ] },
  { id: "campus-run", title: "校园跑", text: "学校组织校园跑，跑满 5 公里有奖品，全校都在报名。",
    choices: [
      { text: "报名", effects: { health: 6, happy: 5, charm: 3 }, result: "你报名了，跑完了 5 公里，拿到了奖品，特别有成就感。" },
      { text: "跑一半", effects: { health: 3, happy: 2 }, result: "你跑了一半，剩下的路走完了，也算参与了。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍休息，也挺好。" },
    ] },
  { id: "library-book", title: "借书", text: "图书馆有本你想看的书，被别人借走了，预约要等一个月。",
    choices: [
      { text: "预约", effects: { iq: 3, happy: 2 }, result: "你预约了，一个月后终于借到了，读得特别认真。" },
      { text: "买一本", effects: { money: -50, iq: 4 }, result: "你买了一本，自己的书随便画，挺好。" },
      { text: "网上看", effects: { iq: 2, happy: 2 }, result: "你网上看了电子版，也一样，就是费眼睛。" },
    ] },
  { id: "dorm-argue", title: "宿舍吵架", text: "宿舍两个人吵起来了，气氛特别僵，你夹在中间很难受。",
    choices: [
      { text: "劝架", effects: { charm: 6, happy: 3 }, result: "你劝架了，两个人冷静下来，握手言和，你成了宿舍的和事佬。" },
      { text: "装没听见", effects: { happy: -1 }, result: "你装没听见，吵了一会儿自己停了，但气氛还是有点怪。" },
      { text: "站队", effects: { charm: -3, happy: 2 }, result: "你站队了，另一边不高兴了，宿舍气氛更僵了。" },
    ] },
  { id: "midterm", title: "期中考试", text: "期中考试来了，老师说这次成绩占期末 30%。",
    choices: [
      { text: "认真复习", effects: { iq: 5, credits: 4, happy: -3 }, result: "你认真复习了，考了个不错的分数，期末压力小了不少。" },
      { text: "临时抱佛脚", effects: { iq: 3, credits: 2, health: -3 }, result: "你临时抱佛脚，通宵了一晚，勉强过了。" },
      { text: "裸考", effects: { happy: 3, iq: -2 }, result: "你裸考了，分数一般，但也不算太差。" },
    ] },
  { id: "part-time-cafe", title: "咖啡店兼职", text: "学校附近的咖啡店招兼职，时薪 20，还能免费喝咖啡。",
    choices: [
      { text: "去", effects: { money: 400, happy: 5, charm: 4, health: -2 }, result: "你去了，每天能喝免费咖啡，还认识了不少常客，挺有意思。" },
      { text: "只去周末", effects: { money: 150, happy: 3 }, result: "你只去周末，赚点零花钱，也不累。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍休息，也挺好。" },
    ] },
  { id: "campus-tour", title: "带新生参观", text: "你被拉去带新生参观校园，介绍各个建筑和食堂。",
    choices: [
      { text: "认真带", effects: { charm: 6, happy: 5 }, result: "你认真带了，新生们都夸你讲得好，还有人加了你好友。" },
      { text: "随便带带", effects: { charm: 3, happy: 3 }, result: "你随便带带，介绍了几个主要地方，也算完成任务。" },
      { text: "推给别人", effects: { happy: 1 }, result: "你推给别人了，自己落了个清闲。" },
    ] },
  { id: "exam-paper", title: "试卷发下来了", text: "试卷发下来了，你考了 92，全班最高。",
    choices: [
      { text: "低调", effects: { charm: 4, happy: 6 }, result: "你低调了，但还是有人发现了，纷纷来问你怎么学的。" },
      { text: "请大家吃饭", effects: { money: -100, happy: 8, charm: 6 }, result: "你请大家吃了饭，全班都夸你大方，你也特别开心。" },
      { text: "继续努力", effects: { iq: 4, happy: 4 }, result: "你继续努力，目标是下次考得更好。" },
    ] },
  { id: "dorm-movie", title: "宿舍看球", text: "今晚有重要球赛，全宿舍一起看，还买了零食啤酒。",
    choices: [
      { text: "一起看", effects: { happy: 9, charm: 5, money: -30 }, result: "你们一起看了，支持的队赢了，全宿舍欢呼，嗓子都喊哑了。" },
      { text: "看一半", effects: { happy: 5 }, result: "你看了一半就睡了，第二天才知道结果。" },
      { text: "不看", effects: { happy: 1 }, result: "你没看，在宿舍学习，也挺好。" },
    ] },
  { id: "skill-course", title: "技能课", text: "学校开了门技能课，PS、视频剪辑、编程，免费学。",
    choices: [
      { text: "学 PS", effects: { iq: 5, happy: 4 }, result: "你学了 PS，现在海报、表情包随手就来，特别实用。" },
      { text: "学剪辑", effects: { iq: 5, happy: 4, charm: 3 }, result: "你学了剪辑，剪了个宿舍日常的视频，播放量还挺高。" },
      { text: "学编程", effects: { iq: 6, happy: 3 }, result: "你学了编程，写了个小工具，解决了不少实际问题。" },
    ] },
  { id: "campus-love", title: "校园爱情", text: "你在图书馆遇到一个人，借书的时候手碰到了一起。",
    choices: [
      { text: "要联系方式", effects: { charm: 6, happy: 7, money: -50 }, result: "你要了联系方式，聊得挺投缘，约了下次一起自习。" },
      { text: "装作没事", effects: { happy: 1 }, result: "你装作没事，心里却一直想着，回去翻来覆去睡不着。" },
      { text: "一笑而过", effects: { happy: 3, charm: 2 }, result: "你们一笑而过，谁也没说话，但那个画面一直留在你心里。" },
    ] },
  { id: "grad-photo2", title: "拍毕业照", text: "拍毕业照的日子，学士服、抛帽子、全班合影。", year: 4,
    choices: [
      { text: "认真拍", effects: { happy: 8, charm: 5 }, result: "你认真拍了，照片里笑得特别好看。" },
      { text: "搞怪拍", effects: { happy: 9, charm: 4 }, result: "你们搞怪拍了，抛帽子的瞬间特别帅，照片成了全班的屏保。" },
      { text: "随便拍拍", effects: { happy: 4 }, result: "你随便拍了拍，反正 P 图能拯救一切。" },
    ] },
  { id: "job-offer2", title: "收到 offer", text: "你收到了一份 offer，工资不错，但要去外地工作。", year: 4,
    choices: [
      { text: "接受", effects: { money: 2500, happy: 7, charm: 3 }, result: "你接受了，去外地工作，虽然离家远，但机会难得。" },
      { text: "再想想", effects: { happy: 2, iq: 2 }, result: "你再想想，又投了几家，最后选了个离家近的。" },
      { text: "拒绝", effects: { happy: 3 }, result: "你拒绝了，决定留在本地发展。" },
    ] },
  { id: "kaoyan-result", title: "考研出分", text: "考研出分了，你的分数刚好过线，复试名单里有你。", year: 4,
    choices: [
      { text: "准备复试", effects: { iq: 6, happy: 5, credits: 3 }, result: "你认真准备复试，表现特别好，顺利上岸。" },
      { text: "调剂", effects: { iq: 4, happy: 3 }, result: "你调剂到了另一所学校，虽然不是第一志愿，但也挺好。" },
      { text: "二战", effects: { iq: 4, happy: -2 }, result: "你决定二战，再拼一年，这次一定行。" },
    ] },
  { id: "dorm-last-night", title: "宿舍最后一晚", text: "宿舍最后一晚，全宿舍都没睡，聊了一整夜。", year: 4,
    choices: [
      { text: "聊到天亮", effects: { happy: 10, charm: 6 }, result: "你们聊到天亮，从大一聊到大四，笑中带泪，这晚会记一辈子。" },
      { text: "早点睡", effects: { health: 4, happy: 4 }, result: "你早点睡了，第二天精神饱满地离开了宿舍。" },
      { text: "写信给彼此", effects: { happy: 8, charm: 6 }, result: "你们互相写了信，约好十年后再聚，信收好了，等十年后打开。" },
    ] },
  { id: "campus-food2", title: "夜市", text: "学校附近开了夜市，烧烤、奶茶、小吃，应有尽有。",
    choices: [
      { text: "去逛", effects: { money: -60, happy: 8 }, result: "你去逛了，一路吃过去，满足得不行。" },
      { text: "和朋友去", effects: { money: -80, happy: 9, charm: 4 }, result: "你和朋友去了，吃吃喝喝聊聊，夜市的烟火气最治愈。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍点外卖，也挺好。" },
    ] },
  { id: "study-abroad2", title: "交换生归来", text: "交换生回来了，带了不少特产和故事，全宿舍都在听他讲。", year: 3,
    choices: [
      { text: "认真听", effects: { iq: 4, happy: 5 }, result: "你认真听了，异国的见闻特别有意思，你也想去看看。" },
      { text: "蹭特产", effects: { happy: 6 }, result: "你蹭了特产，好吃是好吃，就是有点舍不得吃完。" },
      { text: "约他吃饭", effects: { money: -60, charm: 4, happy: 5 }, result: "你约他吃饭，听他讲了更多故事，受益匪浅。" },
    ] },
  // ---- v1.1 新增（第 5 批）：混合 ----
  { id: "roommate-sick", title: "室友生病了", text: "室友生病发烧了，躺在床上起不来，需要人照顾。",
    choices: [
      { text: "照顾他", effects: { charm: 6, happy: 4, health: -2 }, result: "你照顾了他一天，买药、打水、做饭，他感动得不行，说这辈子就认定你这个兄弟了。" },
      { text: "陪他去医院", effects: { charm: 5, money: -30 }, result: "你陪他去医院，挂号拿药折腾半天，他好了，你也累了。" },
      { text: "让他自己扛", effects: { charm: -4, happy: -1 }, result: "你让他自己扛，他好了之后对你有点冷淡。" },
    ] },
  { id: "exam-cheat4", title: "监考很严", text: "这场考试监考特别严，两个老师来回走，还有摄像头。",
    choices: [
      { text: "认真考", effects: { iq: 4, credits: 3 }, result: "你认真考了，凭实力拿了个不错的分数。" },
      { text: "冒险", effects: { happy: 2, credits: -3 }, result: "你冒险了，被发现了，成绩作废，还写了检讨。" },
      { text: "提前交卷", effects: { happy: 3, iq: -1 }, result: "你提前交卷了，出去的时候全班都看着你。" },
    ] },
  { id: "club-activity", title: "社团活动", text: "社团办活动，需要人手，你被拉去帮忙。",
    choices: [
      { text: "去帮忙", effects: { charm: 5, happy: 5, health: -2 }, result: "你去帮忙了，活动办得特别成功，你也认识了不少人。" },
      { text: "只参加", effects: { happy: 4 }, result: "你只参加了活动，没帮忙，但玩得也挺开心。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍休息，也挺好。" },
    ] },
  { id: "part-time-tutor2", title: "家教涨价", text: "家教的家长想给你涨工资，但要你多上一天课。",
    choices: [
      { text: "接受", effects: { money: 400, iq: 2, happy: -2, health: -2 }, result: "你接受了，收入多了，但时间更紧了。" },
      { text: "拒绝", effects: { happy: 2 }, result: "你拒绝了，觉得现在的强度刚刚好。" },
      { text: "商量一下", effects: { money: 200, charm: 3 }, result: "你商量了一下，涨了点工资，课时不变，两全其美。" },
    ] },
  { id: "fitness-challenge", title: "健身挑战", text: "健身房办挑战，30 天打卡，坚持下来有奖励。",
    choices: [
      { text: "参加", effects: { health: 8, charm: 4, happy: 5 }, result: "你参加了，坚持了 30 天，拿到了奖励，身体也好了不少。" },
      { text: "坚持一半", effects: { health: 3, happy: 2 }, result: "你坚持了一半，后来实在扛不住，放弃了。" },
      { text: "不参加", effects: { happy: 1 }, result: "你没参加，在宿舍躺着，也挺好。" },
    ] },
  { id: "movie-premiere", title: "电影首映", text: "你喜欢的电影首映，午夜场，票很难抢。",
    choices: [
      { text: "抢到了", effects: { money: -80, happy: 9 }, result: "你抢到了票，午夜场气氛特别好，全场都在欢呼。" },
      { text: "没抢到", effects: { happy: -2 }, result: "你没抢到票，等了两天才看到，也还行。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍看剧，也挺好。" },
    ] },
  { id: "robot-comp", title: "机器人大赛", text: "学校办机器人大赛，你的队需要个程序员，你被拉入伙了。",
    choices: [
      { text: "加入", effects: { iq: 7, happy: 5, health: -3 }, result: "你加入了，熬了几个通宵，机器人居然真的动起来了，还拿了奖。" },
      { text: "帮忙调试", effects: { iq: 4, happy: 3 }, result: "你帮忙调试了，虽然没全程参与，但也出了不少力。" },
      { text: "不加入", effects: { happy: 1 }, result: "你没加入，在宿舍打游戏，也挺好。" },
    ] },
  { id: "lost-wallet", title: "钱包丢了", text: "钱包丢了，里面有身份证、银行卡和 200 块现金。",
    choices: [
      { text: "报警挂失", effects: { money: -200, happy: -4 }, result: "你报警挂失了，补办了一堆证件，折腾了一周。" },
      { text: "找回来了", effects: { happy: 8 }, result: "居然找回来了，好心人送到了失物招领，你请他吃了顿饭。" },
      { text: "自认倒霉", effects: { happy: -3 }, result: "你自认倒霉，补办了证件，心里一直在滴血。" },
    ] },
  { id: "night-market", title: "夜市摆摊", text: "你想去夜市摆摊，卖点小东西，赚点零花钱。",
    choices: [
      { text: "去摆", effects: { money: 200, charm: 5, happy: 6 }, result: "你去摆了，一晚上赚了 200，还认识了不少摊主，特别有意思。" },
      { text: "试一次", effects: { money: 50, happy: 4 }, result: "你试了一次，赚了 50，感觉还行。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍休息，也挺好。" },
    ] },
  { id: "exam-cheat5", title: "补考", text: "补考的日子到了，这次再不过就要重修了。",
    choices: [
      { text: "认真准备", effects: { iq: 5, credits: 4, happy: -3 }, result: "你认真准备了，这次稳稳地过了，松了口气。" },
      { text: "临时抱佛脚", effects: { iq: 3, credits: 2, health: -3 }, result: "你临时抱佛脚，通宵了一晚，勉强过了。" },
      { text: "裸考", effects: { happy: 2, credits: -2 }, result: "你裸考了，没过，要重修了，心里有点慌。" },
    ] },
  { id: "dorm-gift", title: "宿舍礼物", text: "室友从老家回来，带了特产分给大家。",
    choices: [
      { text: "收下", effects: { happy: 6, charm: 3 }, result: "你收下了，特产特别好吃，你回赠了他一包零食。" },
      { text: "回赠", effects: { money: -30, happy: 6, charm: 5 }, result: "你回赠了他一包特产，两个人有来有往，关系更好了。" },
      { text: "客气一下", effects: { happy: 3 }, result: "你客气了一下，最后还是收下了。" },
    ] },
  { id: "campus-concert", title: "校园演唱会", text: "学校请了个歌手来开演唱会，门票免费，先到先得。",
    choices: [
      { text: "去抢票", effects: { happy: 9, charm: 4 }, result: "你去抢票了，抢到了，现场气氛炸裂，嗓子都喊哑了。" },
      { text: "没抢到", effects: { happy: -2 }, result: "你没抢到票，在宿舍听了直播，也还行。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍看剧，也挺好。" },
    ] },
  { id: "study-plan", title: "学习计划", text: "你制定了个学习计划，每天 6 点起床，12 点睡觉，雷打不动。",
    choices: [
      { text: "坚持", effects: { iq: 6, credits: 4, health: 3, happy: -3 }, result: "你坚持了一个月，成绩提高了不少，作息也规律了。" },
      { text: "坚持一周", effects: { iq: 3, happy: 1 }, result: "你坚持了一周，后来就松懈了，但好习惯留了一点。" },
      { text: "放弃", effects: { happy: 2 }, result: "你放弃了，觉得计划赶不上变化，顺其自然也挺好。" },
    ] },
  { id: "part-time-lib", title: "图书馆兼职", text: "图书馆招兼职，整理书籍，时薪 15，还能免费看书。",
    choices: [
      { text: "去", effects: { money: 300, iq: 3, happy: 4 }, result: "你去了，每天整理书籍，顺便看了不少好书，挺充实。" },
      { text: "只去周末", effects: { money: 120, happy: 2 }, result: "你只去周末，赚点零花钱，也不累。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍休息，也挺好。" },
    ] },
  { id: "campus-run2", title: "晨跑", text: "你决定每天晨跑，6 点起床，绕操场三圈。",
    choices: [
      { text: "坚持", effects: { health: 7, happy: 4, charm: 3 }, result: "你坚持了一个月，身体好了不少，早上也不困了。" },
      { text: "跑几天", effects: { health: 3, happy: 2 }, result: "你跑了几天，后来起不来了，但好歹动过。" },
      { text: "放弃", effects: { happy: 1 }, result: "你放弃了，觉得睡懒觉更舒服。" },
    ] },
  { id: "dorm-clean2", title: "宿舍评比", text: "宿舍评比，你们宿舍有机会拿优秀宿舍，奖金 500。",
    choices: [
      { text: "认真打扫", effects: { health: 4, charm: 5, money: 125, happy: 5 }, result: "你们认真打扫了，拿了优秀宿舍，奖金 500 平分，每人 125。" },
      { text: "意思一下", effects: { happy: 2 }, result: "你们意思了一下，没拿奖，但宿舍干净了不少。" },
      { text: "不管", effects: { happy: 1 }, result: "你们没管，宿舍还是老样子。" },
    ] },
  { id: "exam-cheat6", title: "期末周", text: "期末周到了，图书馆连站票都没了，通宵自习室也满了。",
    choices: [
      { text: "通宵复习", effects: { iq: 6, credits: 5, health: -6 }, result: "你通宵复习了三天，考完走出考场，腿都是软的，但分数不错。" },
      { text: "正常作息", effects: { iq: 4, credits: 3, health: 2 }, result: "你正常作息，复习效率也不低，考得还行。" },
      { text: "佛系", effects: { happy: 5, iq: -2 }, result: "你佛系了，考多少分算多少分，居然也没挂科。" },
    ] },
  { id: "club-show", title: "社团演出", text: "社团要办演出，你被拉去表演节目，唱歌跳舞都行。",
    choices: [
      { text: "唱歌", effects: { charm: 7, happy: 7 }, result: "你唱歌了，台下掌声雷动，还有人给你献花。" },
      { text: "跳舞", effects: { charm: 6, happy: 6, health: 3 }, result: "你跳舞了，虽然动作不太熟练，但气氛特别好。" },
      { text: "当主持人", effects: { charm: 6, happy: 5 }, result: "你当主持人了，控场特别稳，全场都被你带动起来了。" },
    ] },
  { id: "part-time-design", title: "设计兼职", text: "有人找你做设计，海报一张 100，你正好会 PS。",
    choices: [
      { text: "接了", effects: { money: 300, iq: 3, happy: 4 }, result: "你接了，做了三张海报，客户特别满意，还介绍了新客户给你。" },
      { text: "接一张", effects: { money: 100, happy: 3 }, result: "你接了一张，做得挺好，赚了 100。" },
      { text: "不接", effects: { happy: 1 }, result: "你没接，觉得时间不够用。" },
    ] },
  { id: "campus-food3", title: "美食节", text: "学校办美食节，各地小吃都有，门票 20，吃到饱。",
    choices: [
      { text: "去吃", effects: { money: -20, happy: 9 }, result: "你去吃了，从头吃到尾，撑得走不动路，但特别满足。" },
      { text: "和朋友去", effects: { money: -40, happy: 10, charm: 4 }, result: "你和朋友去了，吃吃喝喝聊聊，美食节的氛围最治愈。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍点外卖，也挺好。" },
    ] },
  { id: "study-group2", title: "考研自习室", text: "考研自习室有空位，先到先得，你去晚了只剩角落的位置。", year: 3,
    choices: [
      { text: "占角落", effects: { iq: 4, happy: 2 }, result: "你占了角落，安静是安静，就是有点冷。" },
      { text: "早起占座", effects: { iq: 5, health: -2 }, result: "你第二天早起占座，抢到了好位置，学习效率高了不少。" },
      { text: "回宿舍学", effects: { iq: 2, happy: 2 }, result: "你回宿舍学了，虽然床很诱人，但你忍住了。" },
    ] },
  { id: "dorm-party2", title: "宿舍生日派对", text: "室友过生日，全宿舍给他办了个派对，蛋糕、气球、礼物都准备好了。",
    choices: [
      { text: "嗨起来", effects: { happy: 9, charm: 5, money: -50 }, result: "你们嗨到半夜，蛋糕糊了一脸，笑得停不下来。" },
      { text: "意思一下", effects: { happy: 5, charm: 3 }, result: "你意思了一下，吃了蛋糕，送了礼物，也挺开心。" },
      { text: "不参加", effects: { happy: -1 }, result: "你没参加，一个人在宿舍看剧，有点冷清。" },
    ] },
  { id: "exam-cheat7", title: "随堂测验", text: "老师突然随堂测验，占平时分 20%，全班都懵了。",
    choices: [
      { text: "认真写", effects: { iq: 4, credits: 3 }, result: "你认真写了，居然大部分都会，平时没白听。" },
      { text: "蒙", effects: { happy: 2, iq: -1 }, result: "你蒙了几个，居然蒙对了一半，运气不错。" },
      { text: "交白卷", effects: { happy: 1, credits: -2 }, result: "你交了白卷，老师看了你一眼，你假装淡定。" },
    ] },
  { id: "campus-love2", title: "表白被拒", text: "你向喜欢的人表白了，对方说只想做朋友。",
    choices: [
      { text: "做朋友", effects: { happy: 3, charm: 4 }, result: "你们做了朋友，相处起来很舒服，不急，慢慢来。" },
      { text: "难过一阵", effects: { happy: -5, charm: 2 }, result: "你难过了一阵，室友请你吃了顿饭，心情好了不少。" },
      { text: "继续追", effects: { happy: 4, charm: 3, money: -100 }, result: "你继续追，用行动证明自己，对方好像有点动摇了。" },
    ] },
  { id: "job-intern2", title: "实习加班", text: "实习要加班，晚上 10 点才下班，你累得够呛。", year: 3,
    choices: [
      { text: "坚持", effects: { money: 500, iq: 3, health: -5, happy: -3 }, result: "你坚持下来了，学到了不少东西，老板还夸你能吃苦。" },
      { text: "准时下班", effects: { happy: 3, charm: -2 }, result: "你准时下班了，虽然少学了点，但身体要紧。" },
      { text: "请假", effects: { happy: 2, money: -100 }, result: "你请了一天假，睡了个整觉，满血复活。" },
    ] },
  { id: "dorm-final", title: "宿舍最后一次聚餐", text: "毕业前最后一次聚餐，全宿舍都到了，有人提议去吃顿好的。", year: 4,
    choices: [
      { text: "豪华聚餐", effects: { money: -300, happy: 10, charm: 6 }, result: "一顿散伙饭，吃着吃着就有人哭了，四年的感情都在这顿饭里。" },
      { text: "食堂对付", effects: { happy: 6 }, result: "食堂对付了一口，但气氛一点也不差，饭菜不重要，人在就行。" },
      { text: "自己做饭", effects: { money: -100, happy: 8, charm: 5 }, result: "你们自己做了顿饭，虽然手艺一般，但吃得特别香。" },
    ] },
  { id: "campus-memories", title: "校园回忆", text: "你走在校园里，突然想起大一刚入学的时候，时间过得真快。",
    choices: [
      { text: "拍照留念", effects: { happy: 6, charm: 3 }, result: "你拍了不少照片，发了条朋友圈，感慨时间过得真快。" },
      { text: "约朋友重走", effects: { happy: 7, charm: 4 }, result: "你约朋友重走了入学那天的路，聊起当年的事，笑得不行。" },
      { text: "继续走", effects: { happy: 3 }, result: "你继续走了，享受这份安静，校园还是那个校园。" },
    ] },
  { id: "grad-cap", title: "扔学士帽", text: "毕业典礼，扔学士帽的瞬间，全场欢呼，你的帽子飞得最远。", year: 4,
    choices: [
      { text: "用力扔", effects: { happy: 10, charm: 5 }, result: "你用力扔了，帽子飞得老远，全场都在欢呼，青春就该这样。" },
      { text: "轻轻抛", effects: { happy: 7 }, result: "你轻轻抛了，帽子落下来的时候，你接住了，留作纪念。" },
      { text: "不扔", effects: { happy: 4 }, result: "你没扔，把帽子收好了，想留作纪念。" },
    ] },
  { id: "first-paycheck", title: "第一份工资", text: "你拿到了第一份工资，虽然不多，但特别有成就感。", year: 4,
    choices: [
      { text: "请父母吃饭", effects: { money: -500, happy: 9, charm: 5 }, result: "你请父母吃了顿饭，他们特别高兴，说你长大了。" },
      { text: "请朋友吃饭", effects: { money: -300, happy: 8, charm: 5 }, result: "你请朋友吃了顿饭，大家都为你高兴。" },
      { text: "存起来", effects: { money: 0, happy: 5 }, result: "你存起来了，看着余额，心里特别踏实。" },
    ] },
  { id: "campus-goodbye", title: "告别校园", text: "离开校园的那天，你回头看了一眼，宿舍楼、图书馆、操场，都还在。",
    choices: [
      { text: "挥手告别", effects: { happy: 6, charm: 3 }, result: "你挥手告别，心里默念：再见了，我的大学。" },
      { text: "拍照留念", effects: { happy: 7 }, result: "你拍了最后一张照片，存进了手机，存在了心里。" },
      { text: "头也不回", effects: { happy: 4 }, result: "你头也不回地走了，未来在等着你。" },
    ] },
  { id: "new-beginning", title: "新的开始", text: "毕业了，新的生活开始了，你站在人生的十字路口。",
    choices: [
      { text: "勇敢向前", effects: { happy: 8, iq: 3, charm: 4 }, result: "你勇敢向前走去，未来的路还很长，但你已经准备好了。" },
      { text: "回望过去", effects: { happy: 5 }, result: "你回望过去，四年的点点滴滴都还在心里，带着它们出发。" },
      { text: "深吸一口气", effects: { happy: 6, health: 3 }, result: "你深吸一口气，迈出了第一步，新的故事开始了。" },
    ] },
  { id: "dorm-legend", title: "宿舍传说", text: "听说你们宿舍出过一位大牛，毕业进了大厂，现在是公司的骨干。",
    choices: [
      { text: "以他为榜样", effects: { iq: 4, happy: 4 }, result: "你以他为榜样，努力学习，希望有一天也能像他一样。" },
      { text: "联系他", effects: { charm: 5, happy: 4 }, result: "你联系了他，他特别热情，给了你不少建议，还内推了你。" },
      { text: "不信", effects: { happy: 1 }, result: "你不信，觉得都是传说，但心里还是有点向往。" },
    ] },
  { id: "campus-festival", title: "校园文化节", text: "校园文化节开幕，各个学院都在摆摊展示，热闹非凡。",
    choices: [
      { text: "去逛", effects: { happy: 7, charm: 4 }, result: "你去逛了，每个摊位都看了，还拿了不少小礼品。" },
      { text: "去帮忙", effects: { charm: 6, happy: 6 }, result: "你去帮忙了，忙了一整天，但特别充实。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍休息，也挺好。" },
    ] },
  { id: "study-motivation", title: "学习动力", text: "你突然有了学习动力，想把之前落下的都补回来。",
    choices: [
      { text: "制定计划", effects: { iq: 6, credits: 4, happy: -2 }, result: "你制定了计划，每天按表执行，成绩提高了不少。" },
      { text: "找人监督", effects: { iq: 4, charm: 3 }, result: "你找人监督，两个人互相督促，效果特别好。" },
      { text: "三分钟热度", effects: { iq: 2, happy: 2 }, result: "你三分钟热度，坚持了两天就放弃了，但好歹动过。" },
    ] },
  // ---- v1.1 新增（第 6 批，补到 220）----
  { id: "roommate-quiz", title: "室友考你", text: "室友突然考你专业课知识，答对了请你喝奶茶，答错了你请他。",
    choices: [
      { text: "接受挑战", effects: { iq: 4, happy: 5 }, result: "你接受了挑战，居然全答对了，奶茶到手，室友服了。" },
      { text: "答错了", effects: { money: -15, happy: 3 }, result: "你答错了一道，请他喝了奶茶，但学到了新知识。" },
      { text: "拒绝", effects: { happy: 1 }, result: "你拒绝了，觉得这种挑战没意思。" },
    ] },
  { id: "exam-cheat8", title: "老师划重点", text: "老师划重点了，全班都在记，你的手机快没电了。",
    choices: [
      { text: "借充电宝", effects: { charm: 3, iq: 3 }, result: "你借了充电宝，记下了重点，考试稳了。" },
      { text: "手写", effects: { iq: 3, happy: 1 }, result: "你手写了重点，虽然慢，但记得更牢。" },
      { text: "不记", effects: { happy: 1, iq: -2 }, result: "你没记，考试的时候发现好像都考了，后悔莫及。" },
    ] },
  { id: "club-recruit", title: "社团招新", text: "社团招新摆摊，学弟学妹们围着你的摊位问东问西。",
    choices: [
      { text: "热情介绍", effects: { charm: 6, happy: 6 }, result: "你热情介绍了，招到了不少新成员，社团壮大了。" },
      { text: "发传单", effects: { charm: 3, happy: 3 }, result: "你发了传单，虽然累，但效果还不错。" },
      { text: "坐着等", effects: { happy: 2 }, result: "你坐着等，有人来问就答，也招到了几个。" },
    ] },
  { id: "part-time-waiter", title: "餐厅兼职", text: "学校附近的餐厅招兼职，包吃，时薪 18。",
    choices: [
      { text: "去", effects: { money: 350, health: -3, happy: 3 }, result: "你去了，包吃是真的，每天能吃顿好的，还赚了钱。" },
      { text: "只去周末", effects: { money: 140, happy: 2 }, result: "你只去周末，赚点零花钱，也不累。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍休息，也挺好。" },
    ] },
  { id: "fitness-run", title: "跑步打卡", text: "你决定每天跑步打卡，跑满 30 天有奖励。",
    choices: [
      { text: "坚持", effects: { health: 7, happy: 4, charm: 3 }, result: "你坚持了 30 天，拿到了奖励，身体也好了不少。" },
      { text: "跑一半", effects: { health: 3, happy: 2 }, result: "你跑了一半，后来实在扛不住，放弃了。" },
      { text: "不跑", effects: { happy: 1 }, result: "你没跑，在宿舍躺着，也挺好。" },
    ] },
  { id: "movie-club", title: "电影社", text: "电影社组织观影，今晚放一部经典老片，还有映后讨论。",
    choices: [
      { text: "去看", effects: { happy: 7, iq: 3, charm: 3 }, result: "你去看了，老片居然这么好看，讨论也特别有意思。" },
      { text: "去一半", effects: { happy: 4 }, result: "你去了一半，看到一半就走了，但前半部分挺好看。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍看剧，也挺好。" },
    ] },
  { id: "coding-comp", title: "编程比赛", text: "学校办编程比赛，奖金 5000，你的队需要个主力。",
    choices: [
      { text: "参加", effects: { iq: 7, happy: 5, health: -3 }, result: "你参加了，熬了几个通宵，居然拿了奖，奖金平分，每人 1000 多。" },
      { text: "当替补", effects: { iq: 3, happy: 3 }, result: "你当了替补，虽然没怎么上场，但也学到了不少。" },
      { text: "不参加", effects: { happy: 1 }, result: "你没参加，在宿舍打游戏，也挺好。" },
    ] },
  { id: "lost-id", title: "身份证丢了", text: "身份证丢了，补办要去派出所，还要等半个月。",
    choices: [
      { text: "去补办", effects: { money: -40, happy: -2 }, result: "你去补办了，折腾了一天，终于办好了。" },
      { text: "先用学生证", effects: { happy: 2 }, result: "你先用学生证顶着，等身份证下来再说。" },
      { text: "找回来了", effects: { happy: 7 }, result: "居然找回来了，在旧衣服口袋里，虚惊一场。" },
    ] },
  { id: "street-food", title: "路边摊", text: "学校门口的路边摊，煎饼果子、烤冷面、炸串，香味飘了半条街。",
    choices: [
      { text: "去吃", effects: { money: -20, happy: 8 }, result: "你去吃了，煎饼果子加两个蛋，满足得不行。" },
      { text: "和朋友去", effects: { money: -40, happy: 9, charm: 3 }, result: "你和朋友去了，一路吃过去，路边摊的烟火气最治愈。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍点外卖，也挺好。" },
    ] },
  { id: "exam-cheat9", title: "期中成绩", text: "期中成绩出来了，你考得不错，全班前十。",
    choices: [
      { text: "继续努力", effects: { iq: 4, happy: 5 }, result: "你继续努力，目标是期末考得更好。" },
      { text: "请大家吃饭", effects: { money: -100, happy: 8, charm: 6 }, result: "你请大家吃了饭，全班都夸你大方，你也特别开心。" },
      { text: "低调", effects: { charm: 3, happy: 4 }, result: "你低调了，但还是有人发现了，纷纷来问你怎么学的。" },
    ] },
  { id: "dorm-gift2", title: "节日礼物", text: "节日到了，室友互相送礼物，你也准备了一份。",
    choices: [
      { text: "精心准备", effects: { money: -50, happy: 7, charm: 5 }, result: "你精心准备了礼物，室友收到特别开心，回赠了你一份更好的。" },
      { text: "随便买", effects: { money: -20, happy: 4 }, result: "你随便买了一份，也还行，心意到了就行。" },
      { text: "不送", effects: { happy: 1 }, result: "你没送，在宿舍看剧，也挺好。" },
    ] },
  { id: "campus-run3", title: "校园夜跑", text: "晚上操场特别热闹，都是夜跑的人，你也想去跑两圈。",
    choices: [
      { text: "去跑", effects: { health: 5, happy: 4, charm: 3 }, result: "你去跑了，夜跑的人特别多，氛围特别好，跑完出了一身汗，晚上睡得特别香。" },
      { text: "散步", effects: { health: 2, happy: 3 }, result: "你散步了两圈，吹吹晚风，也挺舒服。" },
      { text: "不去", effects: { happy: 1 }, result: "你没去，在宿舍躺着，也挺好。" },
    ] },
  { id: "study-buddy", title: "学习搭子", text: "你找了个学习搭子，两个人互相监督，一起自习。",
    choices: [
      { text: "坚持", effects: { iq: 6, credits: 4, happy: 3, charm: 3 }, result: "你们坚持了一个月，成绩都提高了不少，互相监督的效果特别好。" },
      { text: "三天打鱼", effects: { iq: 2, happy: 2 }, result: "你们三天打鱼两天晒网，学是学了，但效果一般。" },
      { text: "散伙", effects: { happy: 1 }, result: "你们散伙了，各学各的，也挺好。" },
    ] },
  { id: "part-time-translate", title: "翻译兼职", text: "有人找你做翻译，一千字 100，你英语还不错。",
    choices: [
      { text: "接了", effects: { money: 300, iq: 4, happy: 3 }, result: "你接了，翻译了三千字，客户特别满意，还介绍了新客户给你。" },
      { text: "接一半", effects: { money: 100, happy: 2 }, result: "你接了一半，做得挺好，赚了 100。" },
      { text: "不接", effects: { happy: 1 }, result: "你没接，觉得时间不够用。" },
    ] },
  { id: "campus-snow", title: "雪天", text: "下雪了，校园一片白，南方来的同学兴奋得不行。",
    choices: [
      { text: "打雪仗", effects: { happy: 9, health: 3, charm: 4 }, result: "你们打雪仗了，玩到浑身是雪，笑得停不下来。" },
      { text: "堆雪人", effects: { happy: 7, charm: 3 }, result: "你们堆了个雪人，还给它戴了围巾，成了校园一景。" },
      { text: "在宿舍看雪", effects: { happy: 4 }, result: "你在宿舍看雪，暖和又安静，也挺好。" },
    ] },
  { id: "dorm-clean3", title: "宿舍卫生", text: "宿舍卫生检查又来了，你们宿舍有点乱，检查的人已经到楼下了。",
    choices: [
      { text: "紧急打扫", effects: { health: 3, charm: 4, happy: -2 }, result: "你们紧急打扫了，检查过了，还被表扬了。" },
      { text: "听天由命", effects: { charm: -3, happy: -2 }, result: "你们听天由命，结果被通报批评，全宿舍写了检讨。" },
      { text: "贿赂宿管", effects: { money: -50, charm: 4 }, result: "你塞了两包零食给宿管阿姨，她笑着走了。" },
    ] },
  { id: "exam-cheat10", title: "期末考试", text: "期末考试来了，这是本学期最重要的一场考试。",
    choices: [
      { text: "认真复习", effects: { iq: 6, credits: 5, happy: -3, health: -3 }, result: "你认真复习了，考了个不错的分数，期末压力小了不少。" },
      { text: "临时抱佛脚", effects: { iq: 3, credits: 3, health: -4 }, result: "你临时抱佛脚，通宵了两晚，勉强过了。" },
      { text: "佛系", effects: { happy: 5, iq: -2 }, result: "你佛系了，考多少分算多少分，居然也没挂科。" },
    ] },
  { id: "campus-love3", title: "暗恋", text: "你暗恋一个人很久了，一直没敢表白，今天是个机会。",
    choices: [
      { text: "表白", effects: { happy: 8, charm: 5, money: -80 }, result: "你表白了，对方居然答应了，你们在一起了，甜得发腻。" },
      { text: "继续暗恋", effects: { happy: 2 }, result: "你继续暗恋，默默关注着对方，心里有点酸也有点甜。" },
      { text: "放弃", effects: { happy: -2 }, result: "你放弃了，觉得不合适，但心里还是有点不舍。" },
    ] },
];

// ---- v1.1：随机小事（每学期在大事件后出现 2 件，短平快，丰富日常）----
const MICRO_EVENTS = [
  { id: "m001", text: "食堂今天的鸡腿特别大，阿姨手一点没抖。", choices: [
    { text: "多吃点", effects: { happy: 3 }, result: "你多吃了一块，满足。" },
    { text: "打包带走", effects: { happy: 2, money: -5 }, result: "你打包了一份，晚上加餐。" },
  ] },
  { id: "m002", text: "食堂排队排了二十分钟，前面的人还在纠结吃什么。", choices: [
    { text: "换个窗口", effects: { happy: 2 }, result: "你换了个窗口，马上就吃上了。" },
    { text: "继续等", effects: { happy: -2 }, result: "你继续等，终于吃上了，但有点饿过劲了。" },
  ] },
  { id: "m003", text: "外卖小哥打电话说到了，让你下楼取。", choices: [
    { text: "马上下楼", effects: { happy: 3 }, result: "你马上下楼，饭还是热的。" },
    { text: "让他放门口", effects: { happy: 1 }, result: "你让他放门口，回去的时候饭有点凉了。" },
  ] },
  { id: "m004", text: "室友请你喝奶茶，说今天他请客。", choices: [
    { text: "接受", effects: { happy: 5, charm: 2 }, result: "你接受了，奶茶真好喝，下次你请他。" },
    { text: "回请", effects: { money: -15, happy: 5, charm: 3 }, result: "你回请了一杯，两个人有来有往。" },
  ] },
  { id: "m005", text: "你发现了一家宝藏小店，东西好吃还便宜。", choices: [
    { text: "常去", effects: { happy: 4 }, result: "你常去，成了店里的常客，老板都认识你了。" },
    { text: "推荐给朋友", effects: { happy: 3, charm: 3 }, result: "你推荐给朋友，大家都夸你会找地方。" },
  ] },
  { id: "m006", text: "今天食堂的饭有点咸，你喝了三瓶水。", choices: [
    { text: "将就吃", effects: { happy: -1 }, result: "你将就吃了，下次不点这家了。" },
    { text: "换一家", effects: { money: -10, happy: 2 }, result: "你换了一家，味道好多了。" },
  ] },
  { id: "m007", text: "你点了一份超辣的菜，辣得直冒汗。", choices: [
    { text: "坚持吃完", effects: { happy: 4, health: -1 }, result: "你坚持吃完了，虽然辣，但特别过瘾。" },
    { text: "不吃了", effects: { happy: -1, money: -15 }, result: "你不吃了，浪费了一份，有点心疼。" },
  ] },
  { id: "m008", text: "超市打折，零食买一送一。", choices: [
    { text: "囤一波", effects: { money: -30, happy: 5 }, result: "你囤了一波，宿舍的零食柜满了。" },
    { text: "只买需要的", effects: { money: -10, happy: 2 }, result: "你只买了需要的，理智消费。" },
  ] },
  { id: "m009", text: "你发现宿舍楼下新开了家水果店。", choices: [
    { text: "去买点", effects: { money: -20, happy: 4, health: 2 }, result: "你买了点水果，新鲜又便宜，补充维生素。" },
    { text: "看看", effects: { happy: 1 }, result: "你看了看，决定下次再买。" },
  ] },
  { id: "m010", text: "今天的早饭特别好吃，包子皮薄馅大。", choices: [
    { text: "多吃两个", effects: { happy: 3, health: 1 }, result: "你多吃了两个，一天都元气满满。" },
    { text: "打包给室友", effects: { happy: 3, charm: 3 }, result: "你打包给室友，他感动得不行。" },
  ] },
  { id: "m011", text: "室友在宿舍煮泡面，香味飘满了整个宿舍。", choices: [
    { text: "蹭一口", effects: { happy: 4 }, result: "你蹭了一口，泡面真香。" },
    { text: "自己也煮", effects: { money: -5, happy: 4 }, result: "你自己也煮了一碗，两个人一起吃，更香。" },
  ] },
  { id: "m012", text: "你发现了一家深夜食堂，开到凌晨两点。", choices: [
    { text: "去吃", effects: { money: -25, happy: 6 }, result: "你去吃了，深夜食堂的氛围特别好，食物也好吃。" },
    { text: "改天去", effects: { happy: 1 }, result: "你决定改天去，先记下来。" },
  ] },
  { id: "m013", text: "食堂阿姨认出你了，多给了你一块肉。", choices: [
    { text: "谢谢阿姨", effects: { happy: 5, charm: 2 }, result: "你谢谢阿姨，她笑着说下次还给你多打点。" },
    { text: "受宠若惊", effects: { happy: 4 }, result: "你受宠若惊，觉得食堂阿姨真好。" },
  ] },
  { id: "m014", text: "你点的外卖洒了，汤汁流了一袋子。", choices: [
    { text: "将就吃", effects: { happy: -2 }, result: "你将就吃了，虽然卖相不好，但味道还行。" },
    { text: "申请退款", effects: { money: 15, happy: 2 }, result: "你申请退款了，平台赔了 15，聊胜于无。" },
  ] },
  { id: "m015", text: "今天食堂有免费试吃新菜，你排队尝了一口。", choices: [
    { text: "好吃，再来一份", effects: { money: -12, happy: 5 }, result: "你觉得好吃，又买了一份，值了。" },
    { text: "一般般", effects: { happy: 1 }, result: "你觉得一般般，下次不买了。" },
  ] },
  { id: "m016", text: "你发现了一家便宜又好吃的快餐店。", choices: [
    { text: "常去", effects: { happy: 4, money: 0 }, result: "你常去，性价比之王，钱包和胃都满意。" },
    { text: "带朋友去", effects: { happy: 4, charm: 3 }, result: "你带朋友去了，大家都夸你会找地方。" },
  ] },
  { id: "m017", text: "室友做了黑暗料理，邀请你尝尝。", choices: [
    { text: "尝一口", effects: { happy: 4, health: -1 }, result: "你尝了一口，味道居然还行，室友有天赋。" },
    { text: "婉拒", effects: { happy: 1 }, result: "你婉拒了，室友也没强求，自己吃了。" },
  ] },
  { id: "m018", text: "你饿了，但懒得下楼点外卖。", choices: [
    { text: "点外卖", effects: { money: -20, happy: 4 }, result: "你点了外卖，半小时就到了，热乎乎的。" },
    { text: "吃零食", effects: { happy: 2 }, result: "你吃了点零食，垫了垫肚子。" },
  ] },
  { id: "m019", text: "今天食堂的汤特别好喝，你喝了两碗。", choices: [
    { text: "再来一碗", effects: { happy: 3 }, result: "你又喝了一碗，满足。" },
    { text: "打包", effects: { happy: 2 }, result: "你打包了一份，晚上喝。" },
  ] },
  { id: "m020", text: "你发现宿舍楼下有卖烤红薯的，香味飘了老远。", choices: [
    { text: "买一个", effects: { money: -8, happy: 5 }, result: "你买了一个，热乎乎甜滋滋，冬天吃最治愈。" },
    { text: "不买", effects: { happy: 0 }, result: "你没买，闻闻香味就满足了。" },
  ] },
  // 宿舍日常
  { id: "m021", text: "宿舍 WiFi 有点卡，视频一直转圈。", choices: [
    { text: "重启路由器", effects: { happy: 3 }, result: "你重启了路由器，网速恢复了。" },
    { text: "用流量", effects: { money: -10, happy: 2 }, result: "你用了流量，贵了点，但流畅了。" },
  ] },
  { id: "m022", text: "室友在宿舍练歌，唱得还挺好听。", choices: [
    { text: "跟着唱", effects: { happy: 5, charm: 2 }, result: "你跟着唱了两句，两个人合唱了一首，挺有意思。" },
    { text: "戴耳机", effects: { happy: 1 }, result: "你戴上耳机，各唱各的，互不打扰。" },
  ] },
  { id: "m023", text: "宿舍的灯坏了，一闪一闪的。", choices: [
    { text: "报修", effects: { happy: 2 }, result: "你报修了，师傅第二天就来换了新的。" },
    { text: "自己换", effects: { happy: 3, iq: 1 }, result: "你自己换了个灯泡，成就感满满。" },
  ] },
  { id: "m024", text: "你发现宿舍的阳台能看到晚霞，特别美。", choices: [
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，发了朋友圈，收获了一堆赞。" },
    { text: "静静看", effects: { happy: 4 }, result: "你静静看了会儿，晚霞真美，心情也好了。" },
  ] },
  { id: "m025", text: "室友的快递到了，让你帮忙拿一下。", choices: [
    { text: "帮忙拿", effects: { happy: 2, charm: 3 }, result: "你帮忙拿了，他回来特别感谢你。" },
    { text: "让他自己拿", effects: { happy: 0 }, result: "你让他自己拿，他也没说什么。" },
  ] },
  { id: "m026", text: "宿舍的热水器坏了，洗不了热水澡。", choices: [
    { text: "报修", effects: { happy: 2 }, result: "你报修了，第二天就修好了。" },
    { text: "去公共浴室", effects: { money: -5, happy: 2 }, result: "你去公共浴室洗了，贵了点，但洗上了。" },
  ] },
  { id: "m027", text: "你发现宿舍里有只小蜘蛛，结了个网。", choices: [
    { text: "放生", effects: { happy: 2 }, result: "你把它放生了，功德+1。" },
    { text: "不管", effects: { happy: 0 }, result: "你没管，它自己待着，也挺好。" },
  ] },
  { id: "m028", text: "室友在宿舍看球赛，激动得直拍桌子。", choices: [
    { text: "一起看", effects: { happy: 6, charm: 2 }, result: "你们一起看了，支持的队赢了，全宿舍欢呼。" },
    { text: "戴耳机", effects: { happy: 1 }, result: "你戴上耳机，各看各的。" },
  ] },
  { id: "m029", text: "宿舍的窗帘坏了，拉不上了。", choices: [
    { text: "修一下", effects: { happy: 2, iq: 1 }, result: "你修了一下，居然修好了。" },
    { text: "用夹子夹住", effects: { happy: 2 }, result: "你用夹子夹住了，勉强能用。" },
  ] },
  { id: "m030", text: "你发现宿舍的床特别舒服，今天睡了个懒觉。", choices: [
    { text: "继续睡", effects: { health: 4, happy: 4 }, result: "你继续睡了，一觉睡到中午，神清气爽。" },
    { text: "起来", effects: { iq: 2, happy: 1 }, result: "你起来了，去图书馆学习，效率还挺高。" },
  ] },
  { id: "m031", text: "室友借了你的充电器，忘了还。", choices: [
    { text: "提醒他", effects: { happy: 1, charm: 1 }, result: "你提醒了他，他马上还了，还道了歉。" },
    { text: "算了", effects: { happy: 0 }, result: "你算了，反正你还有备用的。" },
  ] },
  { id: "m032", text: "宿舍的门锁有点松，一推就开。", choices: [
    { text: "报修", effects: { happy: 2 }, result: "你报修了，师傅来换了新锁，安全了。" },
    { text: "自己修", effects: { happy: 3, iq: 1 }, result: "你自己修了，拧紧了螺丝，居然好了。" },
  ] },
  { id: "m033", text: "你发现宿舍的墙上有个小洞，不知道是谁弄的。", choices: [
    { text: "贴张海报遮住", effects: { happy: 2 }, result: "你贴了张海报遮住，完美。" },
    { text: "不管", effects: { happy: 0 }, result: "你没管，反正也不影响住。" },
  ] },
  { id: "m034", text: "室友在宿舍做俯卧撑，一口气做了 50 个。", choices: [
    { text: "跟着做", effects: { health: 4, happy: 3 }, result: "你跟着做了 20 个，胳膊有点酸，但挺有成就感。" },
    { text: "鼓掌", effects: { happy: 3, charm: 2 }, result: "你鼓掌了，他更来劲了，又做了 20 个。" },
  ] },
  { id: "m035", text: "宿舍的空调遥控器找不到了。", choices: [
    { text: "全宿舍找", effects: { happy: 2 }, result: "你们全宿舍找，最后在床底下找到了。" },
    { text: "用手机遥控", effects: { happy: 3, iq: 1 }, result: "你用手机遥控了，科技改变生活。" },
  ] },
  { id: "m036", text: "你发现宿舍楼下的猫生了小猫，毛茸茸的。", choices: [
    { text: "去看", effects: { happy: 6 }, result: "你去看了，小猫特别可爱，你拍了好多照片。" },
    { text: "喂点吃的", effects: { money: -5, happy: 7 }, result: "你喂了点吃的，母猫蹭了蹭你的手，暖暖的。" },
  ] },
  { id: "m037", text: "室友在宿舍弹吉他，弹得还挺好听。", choices: [
    { text: "跟着唱", effects: { happy: 5, charm: 3 }, result: "你跟着唱了，宿舍成了小型演唱会。" },
    { text: "静静听", effects: { happy: 4 }, result: "你静静听了会儿，吉他声真治愈。" },
  ] },
  { id: "m038", text: "宿舍的饮水机没水了，要去换水。", choices: [
    { text: "去换", effects: { health: 2, happy: 1 }, result: "你去换了水，顺便活动了一下筋骨。" },
    { text: "等别人换", effects: { happy: 0 }, result: "你等别人换，结果等了半天没人换，你渴得不行还是自己去了。" },
  ] },
  { id: "m039", text: "你发现宿舍的镜子有点脏，擦了一下。", choices: [
    { text: "擦干净", effects: { happy: 2 }, result: "你擦干净了，镜子亮得能照出人影。" },
    { text: "不管", effects: { happy: 0 }, result: "你没管，反正也不常照镜子。" },
  ] },
  { id: "m040", text: "室友在宿舍敷面膜，白乎乎的脸吓了你一跳。", choices: [
    { text: "笑他", effects: { happy: 5 }, result: "你笑了半天，他也笑了，两个人闹了一会儿。" },
    { text: "也要一片", effects: { happy: 4, money: -5 }, result: "你也要了一片，敷完皮肤滑滑的，感觉不错。" },
  ] },
  // 学习
  { id: "m041", text: "你今天上课坐到了第一排，老师讲得特别清楚。", choices: [
    { text: "认真听", effects: { iq: 3 }, result: "你认真听了，知识点都记住了。" },
    { text: "记笔记", effects: { iq: 4 }, result: "你记了笔记，回去复习的时候特别有用。" },
  ] },
  { id: "m042", text: "你发现图书馆有个特别安静的角落，适合学习。", choices: [
    { text: "常去", effects: { iq: 3, happy: 2 }, result: "你常去，成了你的专属自习位。" },
    { text: "告诉朋友", effects: { iq: 2, charm: 3 }, result: "你告诉朋友了，两个人一起去，学习氛围更好了。" },
  ] },
  { id: "m043", text: "你今天背了 50 个单词，成就感满满。", choices: [
    { text: "继续背", effects: { iq: 3 }, result: "你又背了 50 个，词汇量蹭蹭涨。" },
    { text: "奖励自己", effects: { happy: 3, money: -10 }, result: "你奖励了自己一杯奶茶，学习也要有仪式感。" },
  ] },
  { id: "m044", text: "老师上课讲了个笑话，全班都笑了。", choices: [
    { text: "跟着笑", effects: { happy: 4 }, result: "你跟着笑了，课堂气氛特别好。" },
    { text: "记下来", effects: { happy: 3, iq: 1 }, result: "你记下来了，回去讲给室友听，他们也笑了。" },
  ] },
  { id: "m045", text: "你发现了一个特别好用的学习 App。", choices: [
    { text: "用起来", effects: { iq: 4, happy: 2 }, result: "你用起来了，学习效率提高了不少。" },
    { text: "推荐给朋友", effects: { iq: 2, charm: 3 }, result: "你推荐给朋友了，大家都觉得好用。" },
  ] },
  { id: "m046", text: "你今天做了一套真题，正确率特别高。", choices: [
    { text: "继续做", effects: { iq: 4 }, result: "你又做了一套，正确率更高了，信心爆棚。" },
    { text: "休息一下", effects: { happy: 3, iq: 1 }, result: "你休息了一下，劳逸结合，效果更好。" },
  ] },
  { id: "m047", text: "你发现了一本特别好的参考书，图书馆有借。", choices: [
    { text: "借来看看", effects: { iq: 4 }, result: "你借来看了，里面的方法特别实用。" },
    { text: "买一本", effects: { money: -40, iq: 4 }, result: "你买了一本，自己的书随便画，挺好。" },
  ] },
  { id: "m048", text: "你今天上课回答对了老师的问题，被表扬了。", choices: [
    { text: "继续努力", effects: { iq: 3, happy: 4 }, result: "你继续努力，目标是下次还被表扬。" },
    { text: "低调", effects: { happy: 3, charm: 2 }, result: "你低调了，但心里美滋滋的。" },
  ] },
  { id: "m049", text: "你发现了一个学习小组，每周一起自习。", choices: [
    { text: "加入", effects: { iq: 4, charm: 3 }, result: "你加入了，学习效率高了不少，还认识了几个学霸。" },
    { text: "观望", effects: { happy: 1 }, result: "你观望了一下，决定下次再去。" },
  ] },
  { id: "m050", text: "你今天把落下的作业都补完了，轻松了不少。", choices: [
    { text: "奖励自己", effects: { happy: 4, money: -15 }, result: "你奖励了自己一顿好吃的，辛苦了。" },
    { text: "预习明天的课", effects: { iq: 3 }, result: "你预习了明天的课，明天上课更轻松了。" },
  ] },
  // 天气/季节
  { id: "m051", text: "今天天气特别好，阳光明媚，适合出去走走。", choices: [
    { text: "去散步", effects: { health: 3, happy: 4 }, result: "你去散步了，晒了会儿太阳，心情特别好。" },
    { text: "去操场", effects: { health: 4, happy: 3 }, result: "你去操场跑了两圈，出了一身汗，舒服。" },
  ] },
  { id: "m052", text: "突然下雨了，你没带伞，被淋成了落汤鸡。", choices: [
    { text: "跑回去", effects: { health: -2, happy: 2 }, result: "你跑回去了，虽然淋湿了，但居然有点爽。" },
    { text: "躲雨", effects: { happy: 1 }, result: "你躲了一会儿雨，等雨小了才走。" },
  ] },
  { id: "m053", text: "今天风特别大，吹得人睁不开眼。", choices: [
    { text: "逆风走", effects: { health: 2, happy: 1 }, result: "你逆风走了，风大得像要把人吹跑，挺刺激。" },
    { text: "躲在室内", effects: { happy: 2 }, result: "你躲在室内，看看窗外的风，也挺有意思。" },
  ] },
  { id: "m054", text: "今天特别冷，你穿了三件衣服还觉得冷。", choices: [
    { text: "买杯热饮", effects: { money: -10, happy: 4 }, result: "你买了杯热饮，捧在手里暖暖的。" },
    { text: "回宿舍取暖", effects: { happy: 2 }, result: "你回宿舍取暖了，被窝里最暖和。" },
  ] },
  { id: "m055", text: "今天特别热，宿舍像蒸笼一样。", choices: [
    { text: "去图书馆", effects: { iq: 2, happy: 3 }, result: "你去图书馆蹭空调了，凉快又安静。" },
    { text: "买冰棍", effects: { money: -5, happy: 4 }, result: "你买了根冰棍，凉快了不少。" },
  ] },
  { id: "m056", text: "晚霞特别美，整个天空都是粉色的。", choices: [
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，发了朋友圈，收获了一堆赞。" },
    { text: "静静看", effects: { happy: 4 }, result: "你静静看了会儿，晚霞真美，心情也好了。" },
  ] },
  { id: "m057", text: "今天有彩虹，挂在天边特别好看。", choices: [
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，彩虹真难得，运气真好。" },
    { text: "许愿", effects: { happy: 4 }, result: "你许了个愿，希望它能实现。" },
  ] },
  { id: "m058", text: "今天下雪了，校园一片白。", choices: [
    { text: "打雪仗", effects: { happy: 6, health: 2 }, result: "你们打雪仗了，玩到浑身是雪，笑得停不下来。" },
    { text: "堆雪人", effects: { happy: 5 }, result: "你们堆了个雪人，还给它戴了围巾。" },
  ] },
  { id: "m059", text: "今天雾特别大，能见度不到十米。", choices: [
    { text: "慢慢走", effects: { happy: 1 }, result: "你慢慢走了，雾里看花，别有一番感觉。" },
    { text: "拍照", effects: { happy: 3 }, result: "你拍了照片，雾中的校园像仙境一样。" },
  ] },
  { id: "m060", text: "今天月亮特别圆特别亮，适合赏月。", choices: [
    { text: "去赏月", effects: { happy: 5 }, result: "你去赏月了，月亮真圆，心情也圆满了。" },
    { text: "拍照", effects: { happy: 4 }, result: "你拍了照片，月亮真美，可惜手机拍不出来。" },
  ] },
  { id: "m061", text: "今天星星特别多，抬头就是银河。", choices: [
    { text: "看星星", effects: { happy: 5 }, result: "你看了会儿星星，城市里难得有这么多星星。" },
    { text: "许愿", effects: { happy: 4 }, result: "你对着流星许了个愿，希望它能实现。" },
  ] },
  { id: "m062", text: "今天起风了，落叶满天飞，特别有诗意。", choices: [
    { text: "拍照", effects: { happy: 4 }, result: "你拍了照片，落叶纷飞的校园真美。" },
    { text: "踩落叶", effects: { happy: 4 }, result: "你踩着落叶走，咔嚓咔嚓的，特别解压。" },
  ] },
  { id: "m063", text: "今天下冰雹了，噼里啪啦的，特别壮观。", choices: [
    { text: "看冰雹", effects: { happy: 4 }, result: "你看了会儿冰雹，冰雹真大，还捡了几个。" },
    { text: "躲室内", effects: { happy: 1 }, result: "你躲在室内，听着冰雹声，也挺有意思。" },
  ] },
  { id: "m064", text: "今天出太阳了，晒被子正好。", choices: [
    { text: "晒被子", effects: { happy: 3, health: 2 }, result: "你晒了被子，晚上盖着太阳味的被子，睡得特别香。" },
    { text: "晒衣服", effects: { happy: 2 }, result: "你晒了衣服，干得特别快。" },
  ] },
  { id: "m065", text: "今天特别适合放风筝，风不大不小刚刚好。", choices: [
    { text: "去放风筝", effects: { happy: 6, health: 2 }, result: "你去放风筝了，风筝飞得老高，心情也飞起来了。" },
    { text: "看别人放", effects: { happy: 3 }, result: "你看别人放风筝，也挺有意思。" },
  ] },
  // 手机/网络
  { id: "m066", text: "你手机收到一条诈骗短信，说你中奖了。", choices: [
    { text: "直接删掉", effects: { happy: 1, iq: 1 }, result: "你直接删了，诈骗套路一眼就能看穿。" },
    { text: "发给朋友看", effects: { happy: 3 }, result: "你发给朋友看，大家都笑了，诈骗短信越来越离谱了。" },
  ] },
  { id: "m067", text: "你发现了一个特别好玩的 App，玩了一下午。", choices: [
    { text: "继续玩", effects: { happy: 5, iq: -1 }, result: "你继续玩了，越玩越上头，根本停不下来。" },
    { text: "适可而止", effects: { happy: 2 }, result: "你适可而止，玩了一会儿就去学习了。" },
  ] },
  { id: "m068", text: "你手机内存满了，要清理照片。", choices: [
    { text: "清理", effects: { happy: 2 }, result: "你清理了，删了不少重复照片，手机流畅多了。" },
    { text: "备份", effects: { happy: 2, iq: 1 }, result: "你备份了，照片都存到云盘了，安心。" },
  ] },
  { id: "m069", text: "你刷到一个特别搞笑的视频，笑了半天。", choices: [
    { text: "分享给朋友", effects: { happy: 4, charm: 2 }, result: "你分享给朋友了，大家都笑了，快乐就是要分享。" },
    { text: "自己笑", effects: { happy: 3 }, result: "你自己笑了半天，笑点也太低了。" },
  ] },
  { id: "m070", text: "你发现了一个特别有用的小程序，解决了你的大问题。", choices: [
    { text: "用起来", effects: { happy: 3, iq: 2 }, result: "你用起来了，问题解决了，效率提高了不少。" },
    { text: "推荐给朋友", effects: { happy: 2, charm: 3 }, result: "你推荐给朋友了，大家都觉得好用。" },
  ] },
  { id: "m071", text: "你手机快没电了，充电宝也快没电了。", choices: [
    { text: "找地方充电", effects: { happy: 2 }, result: "你找了个地方充电，终于续上命了。" },
    { text: "省电模式", effects: { happy: 1 }, result: "你开了省电模式，撑到了回宿舍。" },
  ] },
  { id: "m072", text: "你收到一条快递信息，东西到了。", choices: [
    { text: "去取", effects: { happy: 3 }, result: "你去取了，拆开一看，和图片一模一样，开心。" },
    { text: "明天取", effects: { happy: 1 }, result: "你决定明天取，先睡个好觉。" },
  ] },
  { id: "m073", text: "你发现了一个宝藏博主，关注了他。", choices: [
    { text: "天天看", effects: { happy: 4, iq: 1 }, result: "你天天看，学到了不少东西，还挺有意思。" },
    { text: "偶尔看", effects: { happy: 2 }, result: "你偶尔看，更新了就看一眼，也挺好。" },
  ] },
  { id: "m074", text: "你加入了一个特别有意思的群，里面全是同好。", choices: [
    { text: "积极发言", effects: { happy: 4, charm: 3 }, result: "你积极发言了，认识了不少同好，聊得特别开心。" },
    { text: "潜水", effects: { happy: 2 }, result: "你潜水看着，偶尔发个表情包，也挺有意思。" },
  ] },
  { id: "m075", text: "你发现手机里有个 App 特别占内存，删了它。", choices: [
    { text: "删掉", effects: { happy: 2 }, result: "你删掉了，手机流畅多了，舒服。" },
    { text: "留着", effects: { happy: 0 }, result: "你留着了，虽然占内存，但偶尔还会用。" },
  ] },
  { id: "m076", text: "你收到一条银行短信，工资到账了。", choices: [
    { text: "看看余额", effects: { happy: 4 }, result: "你看了看余额，数字涨了，心情也涨了。" },
    { text: "存起来", effects: { happy: 3 }, result: "你存起来了，看着余额，心里特别踏实。" },
  ] },
  { id: "m077", text: "你发现了一个免费的 WiFi，网速特别快。", choices: [
    { text: "连上", effects: { happy: 3 }, result: "你连上了，网速飞快，视频都不卡了。" },
    { text: "不用", effects: { happy: 0 }, result: "你没用，觉得免费 WiFi 不安全。" },
  ] },
  { id: "m078", text: "你手机壁纸换了新的，特别好看。", choices: [
    { text: "秀给朋友看", effects: { happy: 3, charm: 2 }, result: "你秀给朋友看了，大家都夸好看，还问你要原图。" },
    { text: "自己欣赏", effects: { happy: 2 }, result: "你自己欣赏了，每次解锁都心情好。" },
  ] },
  { id: "m079", text: "你收到一条生日祝福短信，来自很久没联系的朋友。", choices: [
    { text: "回过去", effects: { happy: 5, charm: 3 }, result: "你回过去了，两个人聊了半天，约了见面。" },
    { text: "谢谢", effects: { happy: 3 }, result: "你回了句谢谢，心里暖暖的。" },
  ] },
  { id: "m080", text: "你发现了一个特别好听的歌单，循环了一整天。", choices: [
    { text: "分享", effects: { happy: 4, charm: 2 }, result: "你分享了，朋友们都夸你品味好。" },
    { text: "自己听", effects: { happy: 3 }, result: "你自己听了，歌单真不错，循环一整天都不腻。" },
  ] },
  // 金钱
  { id: "m081", text: "你发现钱包里还有一张 50 块钱，惊喜。", choices: [
    { text: "存起来", effects: { money: 50, happy: 4 }, result: "你存起来了，意外之财最开心。" },
    { text: "请朋友吃饭", effects: { money: -50, happy: 6, charm: 3 }, result: "你请朋友吃了饭，意外之财花得最爽。" },
  ] },
  { id: "m082", text: "你收到一笔退款，之前买的东西退了。", choices: [
    { text: "存起来", effects: { money: 30, happy: 3 }, result: "你存起来了，退款到账的感觉真好。" },
    { text: "买点好吃的", effects: { happy: 4 }, result: "你买了点好吃的，退款就该这么花。" },
  ] },
  { id: "m083", text: "你发现了一个省钱妙招，一个月能省 200。", choices: [
    { text: "用起来", effects: { money: 100, happy: 3 }, result: "你用起来了，一个月真省了不少，钱包鼓了。" },
    { text: "告诉朋友", effects: { happy: 2, charm: 3 }, result: "你告诉朋友了，大家都夸你会过日子。" },
  ] },
  { id: "m084", text: "你今天花超了，钱包有点瘪。", choices: [
    { text: "省着点", effects: { happy: 1 }, result: "你决定省着点，下半个月吃食堂。" },
    { text: "找兼职", effects: { money: 100, happy: 2 }, result: "你找了个兼职，赚了点钱，钱包又鼓了。" },
  ] },
  { id: "m085", text: "你收到一笔奖学金，到账了。", choices: [
    { text: "存起来", effects: { money: 500, happy: 6 }, result: "你存起来了，奖学金是对你努力的肯定。" },
    { text: "请朋友吃饭", effects: { money: -200, happy: 8, charm: 4 }, result: "你请朋友吃了饭，大家都为你高兴。" },
  ] },
  { id: "m086", text: "你发现了一个免费领东西的活动，领了不少。", choices: [
    { text: "领", effects: { happy: 4 }, result: "你领了不少，免费的东西最香。" },
    { text: "分享给朋友", effects: { happy: 3, charm: 3 }, result: "你分享给朋友了，大家都领到了，开心。" },
  ] },
  { id: "m087", text: "你今天买了个东西，特别便宜，捡了个大漏。", choices: [
    { text: "开心", effects: { happy: 5 }, result: "你开心了一整天，捡漏的感觉真好。" },
    { text: "告诉朋友", effects: { happy: 3, charm: 2 }, result: "你告诉朋友了，大家都夸你眼光好。" },
  ] },
  { id: "m088", text: "你发现了一个打折活动，喜欢的东西半价。", choices: [
    { text: "买", effects: { money: -100, happy: 6 }, result: "你买了，半价入手，血赚。" },
    { text: "不买", effects: { happy: 1 }, result: "你没买，觉得虽然便宜，但不是必需品。" },
  ] },
  { id: "m089", text: "你今天收到一笔兼职工资，到账了。", choices: [
    { text: "存起来", effects: { money: 200, happy: 4 }, result: "你存起来了，劳动所得最踏实。" },
    { text: "奖励自己", effects: { happy: 5 }, result: "你奖励了自己一顿好吃的，辛苦了。" },
  ] },
  { id: "m090", text: "你发现了一个红包，群里有人发了大红包。", choices: [
    { text: "抢", effects: { money: 10, happy: 5 }, result: "你抢到了 10 块，运气不错。" },
    { text: "没抢到", effects: { happy: -1 }, result: "你没抢到，慢了一步，下次手速快点。" },
  ] },
  { id: "m091", text: "你今天省了一笔钱，公交改成了骑行。", choices: [
    { text: "继续省", effects: { money: 10, happy: 2, health: 2 }, result: "你继续省了，既省钱又锻炼，一举两得。" },
    { text: "偶尔省", effects: { happy: 1 }, result: "你偶尔省，舒服最重要。" },
  ] },
  { id: "m092", text: "你发现了一个免费试吃的活动，吃了不少。", choices: [
    { text: "吃", effects: { happy: 5 }, result: "你吃了不少，免费试吃最香。" },
    { text: "带朋友去", effects: { happy: 4, charm: 3 }, result: "你带朋友去了，大家都吃得很开心。" },
  ] },
  { id: "m093", text: "你今天买了个东西，质量特别好，物超所值。", choices: [
    { text: "开心", effects: { happy: 4 }, result: "你开心了一整天，物超所值的感觉真好。" },
    { text: "推荐给朋友", effects: { happy: 3, charm: 2 }, result: "你推荐给朋友了，大家都夸你会买东西。" },
  ] },
  { id: "m094", text: "你发现了一个二手市场，东西便宜又好。", choices: [
    { text: "去逛", effects: { happy: 4, money: -30 }, result: "你去逛了，淘到了不少好东西，性价比超高。" },
    { text: "去摆摊", effects: { money: 80, happy: 4 }, result: "你去摆摊了，卖了点旧东西，赚了 80。" },
  ] },
  { id: "m095", text: "你今天收到一笔稿费，之前写的文章发表了。", choices: [
    { text: "存起来", effects: { money: 150, happy: 5 }, result: "你存起来了，稿费是对你写作的肯定。" },
    { text: "请朋友吃饭", effects: { money: -100, happy: 6, charm: 3 }, result: "你请朋友吃了饭，大家都为你高兴。" },
  ] },
  { id: "m096", text: "你发现了一个省钱 App，一个月能省不少。", choices: [
    { text: "用起来", effects: { money: 80, happy: 3 }, result: "你用起来了，一个月真省了不少。" },
    { text: "推荐给朋友", effects: { happy: 2, charm: 3 }, result: "你推荐给朋友了，大家都觉得好用。" },
  ] },
  { id: "m097", text: "你今天买了个东西，特别贵，但特别喜欢。", choices: [
    { text: "买", effects: { money: -300, happy: 8 }, result: "你买了，虽然贵，但喜欢的东西就该买。" },
    { text: "不买", effects: { happy: 1 }, result: "你没买，觉得虽然喜欢，但太贵了。" },
  ] },
  { id: "m098", text: "你发现了一个免费的讲座，听了收获很大。", choices: [
    { text: "去听", effects: { iq: 3, happy: 3 }, result: "你去听了，收获特别大，免费的才是最贵的。" },
    { text: "看回放", effects: { iq: 2, happy: 2 }, result: "你看了回放，也学到了不少。" },
  ] },
  { id: "m099", text: "你今天收到一笔奖金，比赛拿了奖。", choices: [
    { text: "存起来", effects: { money: 300, happy: 6 }, result: "你存起来了，奖金是对你实力的肯定。" },
    { text: "请朋友吃饭", effects: { money: -150, happy: 7, charm: 4 }, result: "你请朋友吃了饭，大家都为你高兴。" },
  ] },
  { id: "m100", text: "你发现了一个便宜的理发店，剪得还不错。", choices: [
    { text: "去剪", effects: { money: -15, happy: 4, charm: 2 }, result: "你去剪了，15 块剪得还不错，性价比之王。" },
    { text: "不去", effects: { happy: 0 }, result: "你没去，在宿舍自己剪了个发型，还挺有型。" },
  ] },
  // 社交
  { id: "m101", text: "你今天认识了一个新朋友，聊得特别投缘。", choices: [
    { text: "加好友", effects: { happy: 5, charm: 4 }, result: "你们加了好友，约了下次一起吃饭。" },
    { text: "保持联系", effects: { happy: 3, charm: 2 }, result: "你们保持联系，偶尔聊聊天，也挺好。" },
  ] },
  { id: "m102", text: "你今天帮了同学一个忙，他特别感谢你。", choices: [
    { text: "不客气", effects: { happy: 4, charm: 4 }, result: "你说不客气，同学请你喝了杯奶茶。" },
    { text: "举手之劳", effects: { happy: 3, charm: 3 }, result: "你说举手之劳，同学记在心里了。" },
  ] },
  { id: "m103", text: "你今天和朋友一起吃了顿饭，聊了很多。", choices: [
    { text: "AA", effects: { money: -40, happy: 6, charm: 3 }, result: "你们 AA 了一顿饭，聊得特别开心。" },
    { text: "你请客", effects: { money: -80, happy: 7, charm: 5 }, result: "你请客了，朋友特别感动，下次他请你。" },
  ] },
  { id: "m104", text: "你今天收到一条朋友的关心信息，心里暖暖的。", choices: [
    { text: "回过去", effects: { happy: 5, charm: 2 }, result: "你回过去了，两个人聊了半天。" },
    { text: "约出来", effects: { happy: 6, charm: 3, money: -50 }, result: "你们约出来吃了顿饭，感情更好了。" },
  ] },
  { id: "m105", text: "你今天参加了一个聚会，认识了不少人。", choices: [
    { text: "积极社交", effects: { happy: 6, charm: 5 }, result: "你积极社交了，认识了不少人，还加了几个好友。" },
    { text: "坐着看", effects: { happy: 3 }, result: "你坐着看了会儿，也挺有意思。" },
  ] },
  { id: "m106", text: "你今天和室友一起打了游戏，配合得特别默契。", choices: [
    { text: "继续打", effects: { happy: 6, charm: 2 }, result: "你们继续打了，连胜好几把，爽。" },
    { text: "休息", effects: { happy: 3 }, result: "你们休息了，改天再战。" },
  ] },
  { id: "m107", text: "你今天收到一个朋友的生日邀请，周末去玩。", choices: [
    { text: "去", effects: { happy: 6, charm: 3, money: -50 }, result: "你去了，生日派对特别热闹，玩得很开心。" },
    { text: "有事去不了", effects: { happy: -1 }, result: "你有事去不了，发了个红包表示心意。" },
  ] },
  { id: "m108", text: "你今天和朋友一起去逛街，买了不少东西。", choices: [
    { text: "买买买", effects: { money: -100, happy: 7 }, result: "你们买买买，收获满满，开心。" },
    { text: "只逛不买", effects: { happy: 4 }, result: "你们只逛不买，过过眼瘾也挺好。" },
  ] },
  { id: "m109", text: "你今天和同学一起做了个小组作业，配合得很好。", choices: [
    { text: "继续合作", effects: { iq: 3, happy: 4, charm: 3 }, result: "你们继续合作，作业做得特别好，还拿了高分。" },
    { text: "各做各的", effects: { iq: 2 }, result: "你们各做各的，也完成了，效率还行。" },
  ] },
  { id: "m110", text: "你今天收到一条表白信息，有人喜欢你。", choices: [
    { text: "回复", effects: { happy: 6, charm: 4 }, result: "你回复了，两个人聊了起来，感觉还不错。" },
    { text: "装没看见", effects: { happy: -1 }, result: "你装没看见，对方也没再发，这事就过去了。" },
  ] },
  { id: "m111", text: "你今天和朋友一起看了场电影，特别好看。", choices: [
    { text: "再约", effects: { happy: 6, charm: 3 }, result: "你们又约了下次，电影真好看，朋友也合拍。" },
    { text: "各回各家", effects: { happy: 3 }, result: "你们各回各家，电影是真好看。" },
  ] },
  { id: "m112", text: "你今天参加了一个社团活动，认识了不少人。", choices: [
    { text: "积极参与", effects: { happy: 5, charm: 5 }, result: "你积极参与了，认识了不少人，还加了几个好友。" },
    { text: "看看", effects: { happy: 2 }, result: "你看了看，活动还挺有意思，下次再来。" },
  ] },
  { id: "m113", text: "你今天和室友一起吃了顿火锅，热气腾腾。", choices: [
    { text: "吃", effects: { money: -50, happy: 8, charm: 3 }, result: "你们吃了顿火锅，热气腾腾，冬天吃火锅最治愈。" },
    { text: "AA", effects: { money: -30, happy: 7 }, result: "你们 AA 了一顿火锅，吃得特别满足。" },
  ] },
  { id: "m114", text: "你今天收到一条老朋友的信息，好久没联系了。", choices: [
    { text: "聊起来", effects: { happy: 6, charm: 2 }, result: "你们聊了起来，从过去聊到现在，特别开心。" },
    { text: "简单回", effects: { happy: 3 }, result: "你简单回了句，心里暖暖的。" },
  ] },
  { id: "m115", text: "你今天和朋友一起去跑步，跑了 5 公里。", choices: [
    { text: "坚持跑", effects: { health: 5, happy: 4, charm: 2 }, result: "你们坚持跑完了 5 公里，出了一身汗，舒服。" },
    { text: "跑一半", effects: { health: 2, happy: 2 }, result: "你们跑了一半，剩下的路走完了，也算运动了。" },
  ] },
  // 健康
  { id: "m116", text: "你今天早睡了一次，早上起来神清气爽。", choices: [
    { text: "继续早睡", effects: { health: 4, happy: 3 }, result: "你继续早睡了，作息规律了，身体也好了。" },
    { text: "偶尔早睡", effects: { health: 2, happy: 2 }, result: "你偶尔早睡，也挺好，慢慢来。" },
  ] },
  { id: "m117", text: "你今天喝了八杯水，达标了。", choices: [
    { text: "继续", effects: { health: 3, happy: 2 }, result: "你继续喝水，身体水分充足，皮肤都好了。" },
    { text: "奖励自己", effects: { happy: 3 }, result: "你奖励了自己一杯奶茶，劳逸结合。" },
  ] },
  { id: "m118", text: "你今天做了 20 个俯卧撑，胳膊有点酸。", choices: [
    { text: "继续做", effects: { health: 4, happy: 2 }, result: "你继续做了，胳膊是酸了，但肌肉在生长。" },
    { text: "休息", effects: { health: 2, happy: 1 }, result: "你休息了，明天再做，循序渐进。" },
  ] },
  { id: "m119", text: "你今天走了 10000 步，达标了。", choices: [
    { text: "继续", effects: { health: 4, happy: 3 }, result: "你继续走了，每天 10000 步，身体倍儿棒。" },
    { text: "奖励自己", effects: { happy: 3 }, result: "你奖励了自己一顿好吃的，辛苦了。" },
  ] },
  { id: "m120", text: "你今天吃了顿特别健康的饭，蔬菜水果都有。", choices: [
    { text: "继续", effects: { health: 4, happy: 2 }, result: "你继续健康饮食，身体越来越好了。" },
    { text: "偶尔吃", effects: { health: 2, happy: 2 }, result: "你偶尔吃，也挺好，健康饮食要慢慢来。" },
  ] },
  { id: "m121", text: "你今天做了个拉伸，浑身舒坦。", choices: [
    { text: "每天拉伸", effects: { health: 3, happy: 2 }, result: "你每天拉伸，身体柔韧性好了不少。" },
    { text: "偶尔拉伸", effects: { health: 1, happy: 1 }, result: "你偶尔拉伸，也挺好，动起来就好。" },
  ] },
  { id: "m122", text: "你今天睡了个午觉，醒来精神特别好。", choices: [
    { text: "每天午睡", effects: { health: 3, happy: 3 }, result: "你每天午睡，下午学习效率高了不少。" },
    { text: "偶尔午睡", effects: { health: 2, happy: 2 }, result: "你偶尔午睡，也挺好，睡醒了精神好。" },
  ] },
  { id: "m123", text: "你今天跑步了，跑了 3 公里。", choices: [
    { text: "继续跑", effects: { health: 4, happy: 3 }, result: "你继续跑了，越跑越轻松，身体越来越好。" },
    { text: "休息", effects: { health: 1, happy: 1 }, result: "你休息了，明天再跑，循序渐进。" },
  ] },
  { id: "m124", text: "你今天做了个眼保健操，眼睛舒服多了。", choices: [
    { text: "每天做", effects: { health: 2, happy: 1 }, result: "你每天做眼保健操，眼睛不干了，看书也更专注了。" },
    { text: "偶尔做", effects: { health: 1 }, result: "你偶尔做，也挺好，眼睛要好好保护。" },
  ] },
  { id: "m125", text: "你今天喝了杯蜂蜜水，嗓子舒服多了。", choices: [
    { text: "每天喝", effects: { health: 2, happy: 2 }, result: "你每天喝蜂蜜水，嗓子不疼了，皮肤也好了。" },
    { text: "偶尔喝", effects: { health: 1, happy: 1 }, result: "你偶尔喝，也挺好，养生要慢慢来。" },
  ] },
  { id: "m126", text: "你今天做了个深呼吸，压力小了不少。", choices: [
    { text: "每天做", effects: { health: 2, happy: 2 }, result: "你每天做深呼吸，压力小了，心情也好了。" },
    { text: "偶尔做", effects: { health: 1, happy: 1 }, result: "你偶尔做，也挺好，放松一下就好。" },
  ] },
  { id: "m127", text: "你今天吃了个苹果，补充维生素。", choices: [
    { text: "每天吃", effects: { health: 3, happy: 2 }, result: "你每天吃苹果，一天一个苹果，医生远离我。" },
    { text: "偶尔吃", effects: { health: 1, happy: 1 }, result: "你偶尔吃，也挺好，水果要多吃。" },
  ] },
  { id: "m128", text: "你今天做了个瑜伽，身体柔软了不少。", choices: [
    { text: "每天练", effects: { health: 4, happy: 3 }, result: "你每天练瑜伽，身体柔韧性好了，心情也好了。" },
    { text: "偶尔练", effects: { health: 2, happy: 2 }, result: "你偶尔练，也挺好，动起来就好。" },
  ] },
  { id: "m129", text: "你今天走了楼梯，没坐电梯，锻炼了。", choices: [
    { text: "每天走", effects: { health: 3, happy: 2 }, result: "你每天走楼梯，腿有劲了，身体也好了。" },
    { text: "偶尔走", effects: { health: 1, happy: 1 }, result: "你偶尔走，也挺好，动起来就好。" },
  ] },
  { id: "m130", text: "你今天晒了会儿太阳，补充维生素 D。", choices: [
    { text: "每天晒", effects: { health: 3, happy: 3 }, result: "你每天晒太阳，心情好了，身体也好了。" },
    { text: "偶尔晒", effects: { health: 1, happy: 2 }, result: "你偶尔晒，也挺好，太阳是最好的补品。" },
  ] },
  // 娱乐
  { id: "m131", text: "你今天看了部特别好看的电影，感动得不行。", choices: [
    { text: "推荐给朋友", effects: { happy: 4, charm: 3 }, result: "你推荐给朋友了，大家都夸你品味好。" },
    { text: "二刷", effects: { happy: 5 }, result: "你二刷了，好电影值得二刷，细节更多了。" },
  ] },
  { id: "m132", text: "你今天听了首特别好听的歌，循环了一整天。", choices: [
    { text: "分享", effects: { happy: 4, charm: 2 }, result: "你分享了，朋友们都夸你品味好。" },
    { text: "自己听", effects: { happy: 3 }, result: "你自己听了，好歌值得循环，越听越有味道。" },
  ] },
  { id: "m133", text: "你今天玩了个新游戏，特别有意思。", choices: [
    { text: "继续玩", effects: { happy: 6, iq: -1 }, result: "你继续玩了，越玩越上头，根本停不下来。" },
    { text: "适可而止", effects: { happy: 3 }, result: "你适可而止，玩了一会儿就去学习了。" },
  ] },
  { id: "m134", text: "你今天看了一场特别精彩的比赛，热血沸腾。", choices: [
    { text: "和朋友讨论", effects: { happy: 5, charm: 2 }, result: "你和朋友讨论了半天，比赛真精彩，意犹未尽。" },
    { text: "自己回味", effects: { happy: 4 }, result: "你自己回味了，比赛的画面一直在脑海里。" },
  ] },
  { id: "m135", text: "你今天读了一本特别好的书，收获很大。", choices: [
    { text: "推荐给朋友", effects: { happy: 4, iq: 2, charm: 2 }, result: "你推荐给朋友了，大家都觉得好，读书使人进步。" },
    { text: "做笔记", effects: { iq: 4, happy: 2 }, result: "你做了笔记，好书值得反复读。" },
  ] },
  { id: "m136", text: "你今天看了一个特别搞笑的综艺，笑了半天。", choices: [
    { text: "分享给朋友", effects: { happy: 5, charm: 2 }, result: "你分享给朋友了，大家都笑了，快乐就是要分享。" },
    { text: "自己笑", effects: { happy: 4 }, result: "你自己笑了半天，综艺真搞笑，解压神器。" },
  ] },
  { id: "m137", text: "你今天玩了个桌游，特别有意思。", choices: [
    { text: "再来一局", effects: { happy: 6, charm: 2 }, result: "你们再来一局，越玩越上头，根本停不下来。" },
    { text: "适可而止", effects: { happy: 3 }, result: "你们适可而止，玩了一会儿就去学习了。" },
  ] },
  { id: "m138", text: "你今天听了个播客，特别有启发。", choices: [
    { text: "分享", effects: { happy: 3, iq: 2, charm: 2 }, result: "你分享了，朋友们都觉得有启发。" },
    { text: "做笔记", effects: { iq: 3, happy: 2 }, result: "你做了笔记，播客的内容值得反复听。" },
  ] },
  { id: "m139", text: "你今天看了一场脱口秀，笑得肚子疼。", choices: [
    { text: "推荐给朋友", effects: { happy: 5, charm: 2 }, result: "你推荐给朋友了，大家都笑了，脱口秀真解压。" },
    { text: "自己笑", effects: { happy: 4 }, result: "你自己笑了半天，脱口秀演员太有才了。" },
  ] },
  { id: "m140", text: "你今天玩了个手游，上了个大段位。", choices: [
    { text: "继续冲", effects: { happy: 6, iq: -1 }, result: "你继续冲了，段位越打越高，爽。" },
    { text: "见好就收", effects: { happy: 4 }, result: "你见好就收，段位够了，改天再战。" },
  ] },
  { id: "m141", text: "你今天看了一部纪录片，特别震撼。", choices: [
    { text: "推荐给朋友", effects: { happy: 4, iq: 3, charm: 2 }, result: "你推荐给朋友了，大家都觉得震撼，纪录片真有力量。" },
    { text: "做笔记", effects: { iq: 4, happy: 2 }, result: "你做了笔记，纪录片的内容值得深思。" },
  ] },
  { id: "m142", text: "你今天听了场演唱会直播，气氛特别好。", choices: [
    { text: "跟着唱", effects: { happy: 6 }, result: "你跟着唱了，嗓子都喊哑了，但特别尽兴。" },
    { text: "静静听", effects: { happy: 4 }, result: "你静静听了，演唱会真好听，现场感满满。" },
  ] },
  { id: "m143", text: "你今天玩了个解谜游戏，烧脑但特别有意思。", choices: [
    { text: "继续解", effects: { happy: 5, iq: 3 }, result: "你继续解了，谜题一个个解开，成就感满满。" },
    { text: "看攻略", effects: { happy: 3, iq: 1 }, result: "你看了攻略，解开了谜题，恍然大悟。" },
  ] },
  { id: "m144", text: "你今天看了一本漫画，特别好看，一口气看完了。", choices: [
    { text: "推荐给朋友", effects: { happy: 4, charm: 2 }, result: "你推荐给朋友了，大家都夸你品味好。" },
    { text: "追更", effects: { happy: 5 }, result: "你追更了，漫画更新得好慢，等得心急。" },
  ] },
  { id: "m145", text: "你今天玩了个音乐游戏，节奏感满满。", choices: [
    { text: "继续玩", effects: { happy: 5 }, result: "你继续玩了，音乐游戏真解压，越玩越上头。" },
    { text: "适可而止", effects: { happy: 3 }, result: "你适可而止，玩了一会儿就去学习了。" },
  ] },
  // 校园
  { id: "m146", text: "你今天在校园里看到一只猫，毛茸茸的，特别可爱。", choices: [
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，猫真可爱，发了朋友圈收获一堆赞。" },
    { text: "喂它", effects: { money: -5, happy: 6 }, result: "你喂了它，它蹭了蹭你的手，暖暖的。" },
  ] },
  { id: "m147", text: "你今天发现校园里开了很多花，特别美。", choices: [
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，花真美，春天来了。" },
    { text: "静静看", effects: { happy: 4 }, result: "你静静看了会儿，花开得真好，心情也好了。" },
  ] },
  { id: "m148", text: "你今天在图书馆偶遇了喜欢的人，心跳加速。", choices: [
    { text: "打招呼", effects: { happy: 5, charm: 3 }, result: "你打了招呼，对方也笑了，两个人聊了两句。" },
    { text: "装作没看见", effects: { happy: 1 }, result: "你装作没看见，心里却一直想着，回去翻来覆去睡不着。" },
  ] },
  { id: "m149", text: "你今天在食堂偶遇了老朋友，聊了半天。", choices: [
    { text: "一起吃饭", effects: { happy: 6, charm: 3, money: -30 }, result: "你们一起吃了顿饭，聊了半天，感情更好了。" },
    { text: "约下次", effects: { happy: 4, charm: 2 }, result: "你们约了下次，好久没见了，得好好聚聚。" },
  ] },
  { id: "m150", text: "你今天发现校园里有个特别安静的地方，适合发呆。", choices: [
    { text: "常去", effects: { happy: 4 }, result: "你常去，成了你的秘密基地，心情不好的时候就去那。" },
    { text: "带朋友去", effects: { happy: 4, charm: 2 }, result: "你带朋友去了，两个人一起发呆，也挺有意思。" },
  ] },
  // 意外/心情/混合
  { id: "m151", text: "你今天走路踩到水坑，鞋湿了。", choices: [
    { text: "换鞋", effects: { happy: 1 }, result: "你换了鞋，虽然麻烦，但干爽了。" },
    { text: "将就", effects: { happy: -1 }, result: "你将就了一天，鞋湿乎乎的，难受。" },
  ] },
  { id: "m152", text: "你今天收到一条好消息，心情特别好。", choices: [
    { text: "分享", effects: { happy: 6, charm: 2 }, result: "你分享了，好消息就是要分享，大家都为你高兴。" },
    { text: "自己开心", effects: { happy: 5 }, result: "你自己开心了一整天，好消息的余温真长。" },
  ] },
  { id: "m153", text: "你今天心情有点低落，不知道为什么。", choices: [
    { text: "出去走走", effects: { happy: 4, health: 2 }, result: "你出去走了走，吹吹风，心情好了不少。" },
    { text: "找朋友聊聊", effects: { happy: 5, charm: 2 }, result: "你找朋友聊了聊，心里舒服多了，朋友真好。" },
  ] },
  { id: "m154", text: "你今天捡到一枚硬币，运气不错。", choices: [
    { text: "存起来", effects: { money: 1, happy: 3 }, result: "你存起来了，捡到钱的感觉真好，哪怕只有一块。" },
    { text: "买糖", effects: { happy: 4 }, result: "你买了颗糖，甜甜的，运气真好。" },
  ] },
  { id: "m155", text: "你今天看到一道特别美的晚霞，停下来看了会儿。", choices: [
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，晚霞真美，发了朋友圈。" },
    { text: "静静看", effects: { happy: 4 }, result: "你静静看了会儿，晚霞真美，心情也好了。" },
  ] },
  { id: "m156", text: "你今天收到一条陌生人的夸奖，心里美滋滋的。", choices: [
    { text: "谢谢", effects: { happy: 5, charm: 2 }, result: "你说了谢谢，被夸的感觉真好，一天都元气满满。" },
    { text: "低调", effects: { happy: 4 }, result: "你低调了，但心里美滋滋的。" },
  ] },
  { id: "m157", text: "你今天帮了陌生人一个忙，对方特别感谢你。", choices: [
    { text: "不客气", effects: { happy: 5, charm: 3 }, result: "你说不客气，帮助别人的感觉真好。" },
    { text: "举手之劳", effects: { happy: 4, charm: 2 }, result: "你说举手之劳，对方记在心里了。" },
  ] },
  { id: "m158", text: "你今天发现了一个新捷径，去教学楼快了五分钟。", choices: [
    { text: "常走", effects: { happy: 3, health: 1 }, result: "你常走这条捷径，省了不少时间。" },
    { text: "告诉朋友", effects: { happy: 2, charm: 2 }, result: "你告诉朋友了，大家都夸你会找路。" },
  ] },
  { id: "m159", text: "你今天看到一只特别可爱的狗，忍不住多看了两眼。", choices: [
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，狗真可爱，发了朋友圈。" },
    { text: "摸摸它", effects: { happy: 6 }, result: "你摸了摸它，毛茸茸的，治愈。" },
  ] },
  { id: "m160", text: "你今天收到一条天气预报说明天有雨，记得带伞。", choices: [
    { text: "带伞", effects: { happy: 2 }, result: "你带了伞，第二天果然下雨了，有备无患。" },
    { text: "不带", effects: { happy: 0 }, result: "你没带，第二天被淋了，后悔莫及。" },
  ] },
  { id: "m161", text: "你今天发现了一家新开的奶茶店，买一送一。", choices: [
    { text: "去买", effects: { money: -15, happy: 6 }, result: "你去买了，买一送一，血赚，奶茶真好喝。" },
    { text: "带朋友去", effects: { money: -30, happy: 7, charm: 3 }, result: "你带朋友去了，两个人一人一杯，开心。" },
  ] },
  { id: "m162", text: "你今天看到校园里有人在拍婚纱照，特别浪漫。", choices: [
    { text: "看一会儿", effects: { happy: 4 }, result: "你看了一会儿，婚纱照真浪漫，祝福他们。" },
    { text: "拍照", effects: { happy: 4 }, result: "你拍了照片，婚纱照真好看，沾沾喜气。" },
  ] },
  { id: "m163", text: "你今天收到一条学长的建议，特别有用。", choices: [
    { text: "记下来", effects: { iq: 3, happy: 3 }, result: "你记下来了，学长的建议特别实用，少走不少弯路。" },
    { text: "照着做", effects: { iq: 4, happy: 3 }, result: "你照着做了，效果特别好，学长诚不我欺。" },
  ] },
  { id: "m164", text: "你今天发现了一个特别安静的自习室，适合学习。", choices: [
    { text: "常去", effects: { iq: 3, happy: 2 }, result: "你常去，成了你的专属自习位，学习效率高了不少。" },
    { text: "告诉朋友", effects: { iq: 2, charm: 3 }, result: "你告诉朋友了，两个人一起去，学习氛围更好了。" },
  ] },
  { id: "m165", text: "你今天看到一只鸟在窗外唱歌，特别好听。", choices: [
    { text: "听一会儿", effects: { happy: 4 }, result: "你听了一会儿，鸟叫声真治愈，心情都好了。" },
    { text: "拍照", effects: { happy: 3 }, result: "你拍了照片，鸟真好看，可惜飞走了。" },
  ] },
  { id: "m166", text: "你今天收到一条老师的表扬，心里美滋滋的。", choices: [
    { text: "继续努力", effects: { iq: 3, happy: 4 }, result: "你继续努力，目标是下次还被表扬。" },
    { text: "低调", effects: { happy: 3, charm: 2 }, result: "你低调了，但心里美滋滋的。" },
  ] },
  { id: "m167", text: "你今天发现了一个特别好吃的早餐摊，排队的人特别多。", choices: [
    { text: "排队", effects: { money: -8, happy: 5 }, result: "你排队买了，早餐真好吃，排队也值了。" },
    { text: "改天去", effects: { happy: 1 }, result: "你决定改天去，先记下来。" },
  ] },
  { id: "m168", text: "你今天看到校园里有人在放风筝，飞得老高。", choices: [
    { text: "看一会儿", effects: { happy: 4 }, result: "你看了一会儿，风筝飞得真高，心情也飞起来了。" },
    { text: "也去放", effects: { happy: 6, money: -20 }, result: "你也去放了，风筝飞起来的时候，特别有成就感。" },
  ] },
  { id: "m169", text: "你今天收到一条朋友的生日祝福，心里暖暖的。", choices: [
    { text: "回过去", effects: { happy: 5, charm: 2 }, result: "你回过去了，两个人聊了半天，约了见面。" },
    { text: "谢谢", effects: { happy: 3 }, result: "你回了句谢谢，心里暖暖的。" },
  ] },
  { id: "m170", text: "你今天发现了一个特别好玩的游戏，玩了一下午。", choices: [
    { text: "继续玩", effects: { happy: 6, iq: -1 }, result: "你继续玩了，越玩越上头，根本停不下来。" },
    { text: "适可而止", effects: { happy: 3 }, result: "你适可而止，玩了一会儿就去学习了。" },
  ] },
  { id: "m171", text: "你今天看到一朵云特别像一只狗，忍不住拍了下来。", choices: [
    { text: "拍照", effects: { happy: 4 }, result: "你拍了照片，云真像狗，发了朋友圈。" },
    { text: "分享", effects: { happy: 4, charm: 2 }, result: "你分享了，朋友们都夸你想象力丰富。" },
  ] },
  { id: "m172", text: "你今天收到一条快递，拆开一看是朋友寄的礼物。", choices: [
    { text: "回礼", effects: { money: -50, happy: 6, charm: 3 }, result: "你回礼了，朋友收到特别开心，两个人有来有往。" },
    { text: "谢谢", effects: { happy: 5, charm: 2 }, result: "你说了谢谢，礼物真用心，心里暖暖的。" },
  ] },
  { id: "m173", text: "你今天发现了一个特别安静的角落，适合看书。", choices: [
    { text: "常去", effects: { iq: 3, happy: 2 }, result: "你常去，成了你的专属阅读角，书看得特别专注。" },
    { text: "带本书去", effects: { iq: 2, happy: 3 }, result: "你带了本书去，看了一下午，收获满满。" },
  ] },
  { id: "m174", text: "你今天看到一只猫在晒太阳，懒洋洋的，特别可爱。", choices: [
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，猫晒太阳的样子真治愈。" },
    { text: "摸摸它", effects: { happy: 6 }, result: "你摸了摸它，毛茸茸暖乎乎的，治愈。" },
  ] },
  { id: "m175", text: "你今天收到一条好消息，之前申请的东西通过了。", choices: [
    { text: "开心", effects: { happy: 6 }, result: "你开心了一整天，好消息的余温真长。" },
    { text: "分享", effects: { happy: 6, charm: 2 }, result: "你分享了，大家都为你高兴。" },
  ] },
  { id: "m176", text: "你今天发现了一个特别好吃的零食，囤了不少。", choices: [
    { text: "囤", effects: { money: -30, happy: 5 }, result: "你囤了不少，宿舍的零食柜满了，幸福。" },
    { text: "分享给室友", effects: { happy: 5, charm: 3 }, result: "你分享给室友了，大家都夸你会买东西。" },
  ] },
  { id: "m177", text: "你今天看到校园里有人在弹吉他，弹得特别好听。", choices: [
    { text: "听一会儿", effects: { happy: 5 }, result: "你听了一会儿，吉他声真治愈，心情都好了。" },
    { text: "跟着唱", effects: { happy: 6, charm: 2 }, result: "你跟着唱了，路人也加入了，成了小型演唱会。" },
  ] },
  { id: "m178", text: "你今天收到一条老师的作业提醒，差点忘了交。", choices: [
    { text: "赶紧交", effects: { iq: 2, happy: 2 }, result: "你赶紧交了，幸好提醒得及时，差点就迟交了。" },
    { text: "已经交了", effects: { happy: 3 }, result: "你已经交了，松了口气，好险。" },
  ] },
  { id: "m179", text: "你今天发现了一个特别好用的笔记方法，学习效率提高了。", choices: [
    { text: "用起来", effects: { iq: 4, happy: 3 }, result: "你用起来了，学习效率提高了不少，笔记也整齐了。" },
    { text: "推荐给朋友", effects: { iq: 2, charm: 3 }, result: "你推荐给朋友了，大家都觉得好用。" },
  ] },
  { id: "m180", text: "你今天看到一只蝴蝶，特别漂亮，追着它跑了半天。", choices: [
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，蝴蝶真美，可惜飞走了。" },
    { text: "追着跑", effects: { happy: 6, health: 2 }, result: "你追着跑了半天，蝴蝶飞走了，但你跑得特别开心。" },
  ] },
  { id: "m181", text: "你今天收到一条室友的关心信息，让你多喝热水。", choices: [
    { text: "回过去", effects: { happy: 4, charm: 2 }, result: "你回过去了，室友真贴心，宿舍的感情真好。" },
    { text: "照做", effects: { health: 2, happy: 3 }, result: "你照做了，喝了热水，身体暖暖的。" },
  ] },
  { id: "m182", text: "你今天发现了一个特别安静的湖边，适合散步。", choices: [
    { text: "常去", effects: { happy: 4, health: 2 }, result: "你常去，湖边散步最治愈，心情不好就去那。" },
    { text: "带朋友去", effects: { happy: 4, charm: 2 }, result: "你带朋友去了，两个人一起散步，聊聊天，挺好。" },
  ] },
  { id: "m183", text: "你今天看到校园里有人在写生，画得特别好。", choices: [
    { text: "看一会儿", effects: { happy: 4, iq: 1 }, result: "你看了一会儿，画得真好，艺术气息满满。" },
    { text: "请教", effects: { happy: 4, charm: 3 }, result: "你请教了，对方特别热情，教了你几招。" },
  ] },
  { id: "m184", text: "你今天收到一条学校的通知，有个讲座特别有意思。", choices: [
    { text: "去听", effects: { iq: 3, happy: 3 }, result: "你去听了，讲座特别精彩，收获满满。" },
    { text: "看回放", effects: { iq: 2, happy: 2 }, result: "你看了回放，也学到了不少。" },
  ] },
  { id: "m185", text: "你今天发现了一个特别好吃的面馆，面特别劲道。", choices: [
    { text: "常去", effects: { happy: 5, money: -15 }, result: "你常去，面真好吃，成了你的固定食堂。" },
    { text: "带朋友去", effects: { happy: 5, charm: 3, money: -30 }, result: "你带朋友去了，大家都夸你会找地方。" },
  ] },
  { id: "m186", text: "你今天看到一只松鼠在树上跳来跳去，特别灵活。", choices: [
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，松鼠真灵活，可惜跑得太快。" },
    { text: "喂它", effects: { money: -5, happy: 6 }, result: "你喂了它，它居然真的下来吃了，太可爱了。" },
  ] },
  { id: "m187", text: "你今天收到一条朋友的推荐，书/电影/歌特别好。", choices: [
    { text: "去看", effects: { happy: 4, iq: 1 }, result: "你去看了，朋友推荐的果然不错，没踩雷。" },
    { text: "收藏", effects: { happy: 2 }, result: "你收藏了，改天再看，先记下来。" },
  ] },
  { id: "m188", text: "你今天发现了一个特别安静的咖啡厅，适合学习。", choices: [
    { text: "常去", effects: { iq: 3, happy: 3, money: -20 }, result: "你常去，咖啡厅学习效率特别高，就是有点费钱。" },
    { text: "偶尔去", effects: { iq: 2, happy: 2 }, result: "你偶尔去，换个环境学习，效率更高了。" },
  ] },
  { id: "m189", text: "你今天看到校园里有人在练武术，动作特别帅。", choices: [
    { text: "看一会儿", effects: { happy: 4 }, result: "你看了一会儿，武术真帅，行云流水。" },
    { text: "学两招", effects: { happy: 5, health: 2 }, result: "你学了两招，虽然动作不太标准，但挺有意思。" },
  ] },
  { id: "m190", text: "你今天收到一条妈妈的信息，让你注意身体。", choices: [
    { text: "回过去", effects: { happy: 5 }, result: "你回过去了，妈妈的关心最暖心。" },
    { text: "打电话", effects: { happy: 6, charm: 2 }, result: "你打了电话，聊了半天，妈妈特别高兴。" },
  ] },
  { id: "m191", text: "你今天发现了一个特别好玩的挑战，完成了有奖励。", choices: [
    { text: "参加", effects: { happy: 5, health: 2 }, result: "你参加了，完成了挑战，拿到了奖励，成就感满满。" },
    { text: "看看", effects: { happy: 2 }, result: "你看了看，决定下次再参加。" },
  ] },
  { id: "m192", text: "你今天看到校园里有人在跳街舞，特别帅。", choices: [
    { text: "看一会儿", effects: { happy: 5 }, result: "你看了一会儿，街舞真帅，节奏感满满。" },
    { text: "学两招", effects: { happy: 6, health: 2, charm: 2 }, result: "你学了两招，虽然动作不太标准，但挺有意思。" },
  ] },
  { id: "m193", text: "你今天收到一条同学的求助，帮他解决了个问题。", choices: [
    { text: "帮忙", effects: { happy: 4, charm: 4, iq: 2 }, result: "你帮忙了，同学特别感谢你，请你喝了杯奶茶。" },
    { text: "教他方法", effects: { happy: 3, charm: 3, iq: 3 }, result: "你教了他方法，授人以渔，同学特别感激。" },
  ] },
  { id: "m194", text: "你今天发现了一个特别安静的楼顶，适合看星星。", choices: [
    { text: "常去", effects: { happy: 5 }, result: "你常去，楼顶看星星最治愈，心情不好就去那。" },
    { text: "带朋友去", effects: { happy: 5, charm: 2 }, result: "你带朋友去了，两个人一起看星星，聊聊天，挺好。" },
  ] },
  { id: "m195", text: "你今天看到一只流浪猫，瘦瘦的，有点可怜。", choices: [
    { text: "喂它", effects: { money: -5, happy: 6 }, result: "你喂了它，它吃得狼吞虎咽，看得人心疼。" },
    { text: "带回宿舍", effects: { happy: 7, charm: 2 }, result: "你带回宿舍养了几天，后来被好心人领养了。" },
  ] },
  { id: "m196", text: "你今天收到一条学校的表扬，你的作品获奖了。", choices: [
    { text: "开心", effects: { happy: 7, charm: 3 }, result: "你开心了一整天，获奖是对你努力的肯定。" },
    { text: "分享", effects: { happy: 6, charm: 4 }, result: "你分享了，大家都为你高兴。" },
  ] },
  { id: "m197", text: "你今天发现了一个特别好吃的甜品店，蛋糕特别好吃。", choices: [
    { text: "去吃", effects: { money: -25, happy: 7 }, result: "你去吃了，蛋糕真好吃，甜品最治愈。" },
    { text: "带朋友去", effects: { money: -50, happy: 8, charm: 3 }, result: "你带朋友去了，两个人一人一块，开心。" },
  ] },
  { id: "m198", text: "你今天看到校园里有人在求婚，特别浪漫，全场都在欢呼。", choices: [
    { text: "祝福", effects: { happy: 6 }, result: "你祝福了，求婚成功了，全场都在欢呼，浪漫。" },
    { text: "拍照", effects: { happy: 5 }, result: "你拍了照片，求婚现场真浪漫，沾沾喜气。" },
  ] },
  { id: "m199", text: "你今天收到一条朋友的邀请，周末去爬山。", choices: [
    { text: "去", effects: { happy: 7, health: 4, money: -50 }, result: "你去了，爬山特别累，但山顶的风景真美，值了。" },
    { text: "下次去", effects: { happy: 2 }, result: "你决定下次去，先记下来。" },
  ] },
  { id: "m200", text: "你今天发现了一个特别安静的角落，适合一个人待会儿。", choices: [
    { text: "待会儿", effects: { happy: 4 }, result: "你待了一会儿，安静真好，心情也平静了。" },
    { text: "带本书去", effects: { iq: 2, happy: 3 }, result: "你带了本书去，看了一下午，收获满满。" },
  ] },
];
// ---- v1.1：连锁剧情（15 条，每条 3 环；抽到第 1 环后，后续学期按顺序出第 2、3 环）----
const CHAINS = [
  { id: "love", title: "校园恋爱", parts: [
    { text: "你在图书馆遇到一个人，借书的时候手碰到了一起，两个人都愣了一下。",
      choices: [
        { text: "要联系方式", effects: { charm: 5, happy: 6 }, result: "你要了联系方式，聊得挺投缘，约了下次一起自习。" },
        { text: "一笑而过", effects: { happy: 2 }, result: "你们一笑而过，谁也没说话，但那个画面一直留在你心里。" },
      ] },
    { text: "你们越聊越投缘，TA 约你周末去看电影，还说有话想对你说。",
      choices: [
        { text: "去看电影", effects: { happy: 8, charm: 4, money: -100 }, result: "你们去看了电影，电影散场的时候，TA 向你表白了。" },
        { text: "先做朋友", effects: { happy: 4, charm: 3 }, result: "你们先做了朋友，相处起来很舒服，不急，慢慢来。" },
      ] },
    { text: "你们在一起了，约会、看电影、一起自习，甜得发腻，全宿舍都知道了。",
      choices: [
        { text: "好好谈", effects: { happy: 10, charm: 5, money: -200, iq: -2 }, result: "你们好好谈着，感情越来越稳定，成了校园里的一对神仙眷侣。" },
        { text: "低调点", effects: { happy: 6, charm: 3 }, result: "你们低调地谈着，虽然不秀恩爱，但甜蜜一点没少。" },
      ] },
  ] },
  { id: "startup", title: "创业梦", parts: [
    { text: "你有个创业想法，憋在心里很久了，今天终于跟室友说了出来。",
      choices: [
        { text: "说干就干", effects: { iq: 4, happy: 5, money: -200 }, result: "你说干就干，拉上室友一起，开始写商业计划书。" },
        { text: "先想想", effects: { iq: 2, happy: 2 }, result: "你决定先想想，把想法完善一下再动手。" },
      ] },
    { text: "你们的项目有了雏形，需要找投资人，学校有个创业路演的机会。",
      choices: [
        { text: "去路演", effects: { charm: 6, iq: 4, happy: 4 }, result: "你们去路演了，评委挺感兴趣，有投资人要了你们的联系方式。" },
        { text: "再打磨", effects: { iq: 4, happy: 2 }, result: "你们决定再打磨一下产品，等更成熟了再去。" },
      ] },
    { text: "投资人投了你们第一笔钱，项目正式启动了，你成了校园创业者。",
      choices: [
        { text: "全力以赴", effects: { money: 2000, charm: 6, happy: 7, iq: -2 }, result: "你们全力以赴，项目上线了，用户量蹭蹭涨，前途一片光明。" },
        { text: "稳扎稳打", effects: { money: 1000, happy: 5, iq: 2 }, result: "你们稳扎稳打，项目稳步推进，虽然慢点，但走得踏实。" },
      ] },
  ] },
  { id: "esports", title: "电竞之路", parts: [
    { text: "你和室友组了个电竞队，目标是拿下学校比赛的冠军。",
      choices: [
        { text: "认真训练", effects: { happy: 6, charm: 3, iq: -2 }, result: "你们认真训练，每天打到半夜，配合越来越默契。" },
        { text: "随便玩玩", effects: { happy: 4 }, result: "你们随便玩玩，开心最重要，输赢无所谓。" },
      ] },
    { text: "你们打进了校内决赛，对手是去年的冠军队，实力很强。",
      choices: [
        { text: "制定战术", effects: { iq: 5, happy: 5, charm: 3 }, result: "你们制定了战术，针对对手的弱点做了充分准备。" },
        { text: "硬碰硬", effects: { happy: 4, charm: 2 }, result: "你们决定硬碰硬，狭路相逢勇者胜。" },
      ] },
    { text: "决赛打满了五局，最后一局惊险获胜，你们拿到了冠军，全场都在欢呼。",
      choices: [
        { text: "庆祝", effects: { happy: 10, charm: 7, money: -100 }, result: "你们庆祝了一整晚，冠军奖杯摆在宿舍最显眼的地方。" },
        { text: "继续冲", effects: { happy: 8, charm: 5, iq: 2 }, result: "你们决定继续冲，目标是市级比赛，电竞之路才刚刚开始。" },
      ] },
  ] },
  { id: "kaoyan", title: "考研之路", parts: [
    { text: "你决定考研了，目标院校已经定了，接下来是一年的硬仗。",
      choices: [
        { text: "制定计划", effects: { iq: 5, credits: 3, happy: -3 }, result: "你制定了详细的计划，每天按表执行，稳稳地推进。" },
        { text: "找研友", effects: { charm: 4, iq: 3, happy: 3 }, result: "你找了个研友，两个人互相监督，学习一点不孤单。" },
      ] },
    { text: "备考进入白热化，每天学习 12 小时，压力特别大，你有点扛不住了。",
      choices: [
        { text: "咬牙坚持", effects: { iq: 6, credits: 4, health: -5, happy: -4 }, result: "你咬牙坚持下来了，模拟题越做越顺，信心也回来了。" },
        { text: "调整节奏", effects: { iq: 4, health: 3, happy: 2 }, result: "你调整了节奏，劳逸结合，效率反而更高了。" },
      ] },
    { text: "考研初试结束了，你估分感觉还不错，复试名单里有你。",
      choices: [
        { text: "准备复试", effects: { iq: 6, happy: 5, credits: 3 }, result: "你认真准备复试，表现特别好，顺利上岸。" },
        { text: "等结果", effects: { happy: 4, iq: 2 }, result: "你等结果的日子有点煎熬，但最终等来了好消息。" },
      ] },
  ] },
  { id: "parttime", title: "兼职之路", parts: [
    { text: "你找到一份兼职，时薪不错，时间也自由，决定试试。",
      choices: [
        { text: "认真干", effects: { money: 400, happy: 3, health: -2 }, result: "你认真干了一个月，老板特别满意，想让你长期做。" },
        { text: "试试水", effects: { money: 150, happy: 2 }, result: "你试了试水，感觉还行，决定继续做。" },
      ] },
    { text: "老板想给你涨工资，但要你多上几天班，你有点犹豫。",
      choices: [
        { text: "接受", effects: { money: 400, iq: 2, happy: -2, health: -2 }, result: "你接受了，收入多了，但时间更紧了，好在能应付。" },
        { text: "商量", effects: { money: 200, charm: 3 }, result: "你商量了一下，涨了点工资，课时不变，两全其美。" },
      ] },
    { text: "你成了店里的老员工，老板想让你当店长，工资翻倍。",
      choices: [
        { text: "当店长", effects: { money: 1000, charm: 5, happy: 5, iq: -2 }, result: "你当了店长，管着几个人，工资翻倍，特别有成就感。" },
        { text: "继续兼职", effects: { money: 400, happy: 3 }, result: "你继续兼职，觉得现在的强度刚刚好，不想太累。" },
      ] },
  ] },
  { id: "club", title: "社团之路", parts: [
    { text: "你加入了一个社团，活动特别多，认识了不少志同道合的朋友。",
      choices: [
        { text: "积极参与", effects: { charm: 5, happy: 5 }, result: "你积极参与，成了社团的活跃分子，大家都认识你了。" },
        { text: "偶尔参加", effects: { happy: 3, charm: 2 }, result: "你偶尔参加，活动有意思就去，没意思就待着。" },
      ] },
    { text: "社团换届，有人提名你竞选部长，你有点心动也有点慌。",
      choices: [
        { text: "竞选", effects: { charm: 7, happy: 5, iq: -2 }, result: "你竞选上了，当了部长，组织活动忙得团团转，但特别有成就感。" },
        { text: "当干事", effects: { charm: 3, happy: 3 }, result: "你当了干事，事情少点，也能参与，挺好。" },
      ] },
    { text: "你当部长后办了一场大型活动，全校几百人参加，特别成功。",
      choices: [
        { text: "庆祝", effects: { happy: 9, charm: 6, money: -100 }, result: "你们庆祝了一整晚，活动办得特别成功，你是最大的功臣。" },
        { text: "总结经验", effects: { iq: 4, charm: 5, happy: 5 }, result: "你总结了经验，写了份超详细的复盘，下届部长都夸你。" },
      ] },
  ] },
  { id: "fitness", title: "健身之路", parts: [
    { text: "你决定开始健身，办了张健身卡，第一天练完胳膊都抬不起来。",
      choices: [
        { text: "坚持", effects: { health: 6, happy: 3, money: -150 }, result: "你坚持下来了，虽然累，但身体在变好。" },
        { text: "找搭子", effects: { health: 5, charm: 3, happy: 4 }, result: "你找了个健身搭子，两个人互相监督，练得更有劲了。" },
      ] },
    { text: "练了一个月，体型变化特别明显，衣服都松了，朋友们都夸你。",
      choices: [
        { text: "继续练", effects: { health: 7, charm: 5, happy: 4 }, result: "你继续练，线条越来越明显，走路都带风。" },
        { text: "加量", effects: { health: 8, happy: 3, money: -100 }, result: "你加了量，还请了教练，进步更快了。" },
      ] },
    { text: "你报名了校园马拉松，跑完了全程，还拿了名次，成了校园里的健身达人。",
      choices: [
        { text: "庆祝", effects: { happy: 9, health: 5, charm: 6 }, result: "你庆祝了一番，马拉松奖牌挂在宿舍最显眼的地方。" },
        { text: "定新目标", effects: { health: 6, happy: 6, iq: 2 }, result: "你定了新目标：下次跑进前三，健身之路没有终点。" },
      ] },
  ] },
  { id: "scholar", title: "学霸之路", parts: [
    { text: "你这学期成绩特别好，拿了奖学金，老师想让你进他的课题组。",
      choices: [
        { text: "加入", effects: { iq: 6, credits: 4, happy: -2 }, result: "你加入了课题组，跟着老师做项目，学到了不少真本事。" },
        { text: "先想想", effects: { iq: 2, happy: 2 }, result: "你说先想想，老师说随时欢迎，你心里有点底了。" },
      ] },
    { text: "你在课题组里表现特别好，老师让你独立负责一个小项目。",
      choices: [
        { text: "接下", effects: { iq: 7, credits: 4, happy: -3, health: -2 }, result: "你接下了，项目做得特别好，老师逢人就夸你。" },
        { text: "和同学合作", effects: { iq: 5, charm: 4 }, result: "你和同学合作，两个人分工明确，效率高了不少。" },
      ] },
    { text: "你的项目成果发了篇论文，还拿了奖，成了学院里的学术明星。",
      choices: [
        { text: "继续深造", effects: { iq: 8, credits: 5, happy: 6 }, result: "你决定继续深造，保研/读博的大门已经向你敞开了。" },
        { text: "分享经验", effects: { iq: 4, charm: 6, happy: 6 }, result: "你分享了经验，学弟学妹们都把你当榜样。" },
      ] },
  ] },
  { id: "streamer", title: "主播之路", parts: [
    { text: "你心血来潮开了个直播，打游戏，居然有人看，还有人刷礼物。",
      choices: [
        { text: "坚持播", effects: { happy: 6, charm: 5, money: 80, iq: -2 }, result: "你坚持播了一个月，粉丝涨了不少，还赚了点零花钱。" },
        { text: "播一次", effects: { happy: 3, money: 20 }, result: "你播了一次，赚了 20 块，感觉还挺有意思。" },
      ] },
    { text: "你的直播间火了，粉丝破万，有公会想签你。",
      choices: [
        { text: "签约", effects: { money: 1000, charm: 6, happy: 7, iq: -3 }, result: "你签约了，有了固定收入，直播成了你的第二职业。" },
        { text: "自由播", effects: { happy: 5, charm: 4, money: 200 }, result: "你决定自由播，不想被合同束缚，开心最重要。" },
      ] },
    { text: "你成了小有名气的主播，直播间每晚都有几千人看，还接了广告。",
      choices: [
        { text: "继续做大", effects: { money: 2000, happy: 8, charm: 7 }, result: "你继续做大，粉丝越来越多，广告接到手软，成了校园网红。" },
        { text: "平衡学业", effects: { iq: 4, happy: 6, money: 500 }, result: "你平衡了学业和直播，两边都没落下，稳稳的。" },
      ] },
  ] },
  { id: "travel", title: "旅行计划", parts: [
    { text: "你和朋友计划去旅行，目的地还没定，预算也不多，先攒钱吧。",
      choices: [
        { text: "开始攒钱", effects: { money: 200, happy: 4 }, result: "你们开始攒钱，每人每月存 200，旅行基金慢慢涨起来了。" },
        { text: "定目的地", effects: { happy: 5 }, result: "你们定了目的地，查攻略、订行程，期待值拉满了。" },
      ] },
    { text: "旅行基金攒够了，行程也定好了，就等出发的日子了。",
      choices: [
        { text: "出发", effects: { money: -800, happy: 8 }, result: "你们出发了，一路玩过去，风景美、心情更好。" },
        { text: "再攒点", effects: { money: 200, happy: 3 }, result: "你们决定再攒点，玩得更尽兴，期待值更高了。" },
      ] },
    { text: "旅行结束了，你们拍了几百张照片，带回一堆特产，这趟旅行会记一辈子。",
      choices: [
        { text: "分享", effects: { happy: 8, charm: 5 }, result: "你们分享了照片和故事，朋友们都羡慕得不行。" },
        { text: "计划下次", effects: { happy: 9, charm: 4 }, result: "你们计划了下次旅行，世界那么大，想去看看的地方还很多。" },
      ] },
  ] },
  { id: "pet", title: "流浪猫", parts: [
    { text: "你在校园里遇到一只流浪猫，瘦瘦的，跟着你走了半天。",
      choices: [
        { text: "喂它", effects: { money: -10, happy: 6 }, result: "你喂了它，它吃得狼吞虎咽，看得人心疼。" },
        { text: "带回宿舍", effects: { happy: 7, charm: 2 }, result: "你带回宿舍了，室友们都喜欢它，成了宿舍的团宠。" },
      ] },
    { text: "猫在宿舍住下了，每天等你回来，蹭你的腿，特别粘人。",
      choices: [
        { text: "好好养", effects: { happy: 8, money: -100 }, result: "你好好养它，买了猫粮和猫砂，它越长越胖，越长越可爱。" },
        { text: "带它绝育", effects: { money: -200, happy: 5 }, result: "你带它去绝育了，虽然花了钱，但对它好，值得。" },
      ] },
    { text: "毕业了，你决定把猫带走，继续养它，它已经是你家人了。",
      choices: [
        { text: "带走", effects: { happy: 10, charm: 4 }, result: "你把它带走了，从校园到社会，它一直陪着你，不离不弃。" },
        { text: "找好人家", effects: { happy: 6, charm: 5 }, result: "你给它找了个好人家，对方特别喜欢猫，你放心了。" },
      ] },
  ] },
  { id: "band", title: "组乐队", parts: [
    { text: "你和几个朋友想组个乐队，你负责吉他/主唱/鼓手，缺个贝斯。",
      choices: [
        { text: "组起来", effects: { happy: 6, charm: 4, money: -200 }, result: "你们组起来了，买了设备，找了排练室，像模像样。" },
        { text: "先练练", effects: { happy: 4, charm: 2 }, result: "你们先练了练，配合还行，决定正式组队。" },
      ] },
    { text: "你们排练了两个月，曲子练熟了，学校有个演出机会。",
      choices: [
        { text: "去演出", effects: { happy: 8, charm: 6 }, result: "你们去演出了，台下掌声雷动，还有人喊安可，特别过瘾。" },
        { text: "再练练", effects: { happy: 4, iq: 2 }, result: "你们决定再练练，等更熟练了再上台。" },
      ] },
    { text: "你们的乐队在学校火了，演出邀约不断，还出了首原创歌。",
      choices: [
        { text: "继续玩", effects: { happy: 10, charm: 7 }, result: "你们继续玩乐队，原创歌在校园里传唱，你们成了校园明星。" },
        { text: "录专辑", effects: { money: 500, happy: 8, charm: 6 }, result: "你们录了张专辑，虽然粗糙，但那是你们的青春。" },
      ] },
  ] },
  { id: "writing", title: "写小说", parts: [
    { text: "你开始写小说了，每天写 2000 字，故事在脑子里已经成型了。",
      choices: [
        { text: "坚持写", effects: { iq: 5, happy: 4, credits: -1 }, result: "你坚持写了一个月，写了 6 万字，故事越来越精彩。" },
        { text: "写着玩", effects: { happy: 4, iq: 2 }, result: "你写着玩，想到哪写到哪，也挺有意思。" },
      ] },
    { text: "你的小说发到网上了，居然有人看，还有人催更。",
      choices: [
        { text: "认真更", effects: { iq: 5, happy: 6, money: 100 }, result: "你认真更新，每天两更，读者越来越多，还赚了点稿费。" },
        { text: "随缘更", effects: { happy: 4 }, result: "你随缘更新，有灵感就写，没灵感就歇着。" },
      ] },
    { text: "你的小说完结了，几十万字，读者上万，还有编辑想签你。",
      choices: [
        { text: "签约", effects: { money: 2000, happy: 9, iq: 4 }, result: "你签约了，稿费到账的那一刻，你觉得写作这条路走对了。" },
        { text: "开新书", effects: { happy: 8, iq: 5 }, result: "你开了本新书，上一本的经验都用上了，写得更顺了。" },
      ] },
  ] },
  { id: "photo", title: "摄影之路", parts: [
    { text: "你买了台二手相机，开始学摄影，拍校园、拍人、拍风景。",
      choices: [
        { text: "认真学", effects: { iq: 4, happy: 5, money: -500 }, result: "你认真学了，看了不少教程，拍出来的照片越来越有感觉。" },
        { text: "随便拍", effects: { happy: 4 }, result: "你随便拍了拍，记录生活，也挺有意思。" },
      ] },
    { text: "你的照片发到网上，有人点赞，还有人想找你约拍。",
      choices: [
        { text: "接单", effects: { money: 300, charm: 5, happy: 6 }, result: "你接单了，拍了几组写真，客户特别满意，口碑传开了。" },
        { text: "继续练", effects: { iq: 3, happy: 4 }, result: "你继续练技术，觉得还不够好，想再沉淀一下。" },
      ] },
    { text: "你的作品在学校摄影展上获奖了，还办了个小型个展。",
      choices: [
        { text: "办展", effects: { happy: 9, charm: 7 }, result: "你办了个展，来看的人特别多，你的照片挂在最显眼的位置。" },
        { text: "继续拍", effects: { happy: 7, iq: 3 }, result: "你继续拍，摄影这条路越走越宽，未来可期。" },
      ] },
  ] },
  { id: "volunteer", title: "志愿者之路", parts: [
    { text: "你报名了志愿者，去敬老院陪老人聊天，老人特别开心。",
      choices: [
        { text: "常去", effects: { charm: 5, happy: 6 }, result: "你常去，老人都认识你了，每次去都给你留好吃的。" },
        { text: "偶尔去", effects: { happy: 4, charm: 3 }, result: "你偶尔去，每次去都有新收获。" },
      ] },
    { text: "你参加了支教活动，去山区给孩子们上课，条件很艰苦，但特别有意义。",
      choices: [
        { text: "坚持", effects: { charm: 7, happy: 7, iq: 3, health: -2 }, result: "你坚持下来了，孩子们特别喜欢你，临走的时候都哭了。" },
        { text: "去一次", effects: { happy: 5, charm: 4 }, result: "你去了一次，虽然短暂，但印象特别深。" },
      ] },
    { text: "你成了志愿者协会的骨干，组织了好几次大型活动，帮助了很多人。",
      choices: [
        { text: "继续做", effects: { happy: 9, charm: 7 }, result: "你继续做志愿者，帮助别人也快乐自己，成了校园里的公益明星。" },
        { text: "传承", effects: { happy: 7, charm: 6 }, result: "你把经验传给了学弟学妹，志愿者精神一代代传下去。" },
      ] },
  ] },
];

// ---- v1.1：成就（25 个；check(state, flags) 返回 true 即解锁）----
const ACHIEVEMENTS = [
  { id: "rich", name: "💰 首富", desc: "金钱达到 5000", check: (s) => s.money >= 5000 },
  { id: "scholar", name: "📚 学霸", desc: "学分达到 40", check: (s) => s.credits >= 40 },
  { id: "social", name: "✨ 社交达人", desc: "魅力达到 90", check: (s) => s.charm >= 90 },
  { id: "healthy", name: "❤️ 健康达人", desc: "健康达到 95", check: (s) => s.health >= 95 },
  { id: "happy", name: "😊 开心果", desc: "快乐达到 95", check: (s) => s.happy >= 95 },
  { id: "brain", name: "🧠 最强大脑", desc: "智力达到 95", check: (s) => s.iq >= 95 },
  { id: "network", name: "🤝 人脉王", desc: "人脉达到 90", check: (s, f) => (s.connections || 0) >= 90 },
  { id: "lottery", name: "🎰 中奖了", desc: "买彩票/刮刮乐中过奖", check: (s, f) => !!f.lotteryWin },
  { id: "survivor", name: "🎓 顺利毕业", desc: "打满 8 个学期正常毕业", check: (s, f) => !!f.completedGame },
  { id: "explorer", name: "🗺️ 见多识广", desc: "一局内遇到 30 个不同事件", check: (s, f) => (f.eventsSeen || 0) >= 30 },
  { id: "collector", name: "🏆 结局收集者", desc: "解锁 10 个结局", check: (s, f) => (f.endingsCount || 0) >= 10 },
  { id: "master", name: "👑 全结局", desc: "解锁全部 32 个结局", check: (s, f) => (f.endingsCount || 0) >= 32 },
  { id: "gamer", name: "🎮 游戏达人", desc: "一局内打游戏 4 次以上", check: (s, f) => (f.actionCounts && f.actionCounts.game >= 4) },
  { id: "worker", name: "💼 打工皇帝", desc: "一局内打工 4 次以上", check: (s, f) => (f.actionCounts && f.actionCounts.work >= 4) },
  { id: "bookworm", name: "📖 书虫", desc: "一局内学习 6 次以上", check: (s, f) => (f.actionCounts && f.actionCounts.study >= 6) },
  { id: "gymrat", name: "🏋️ 健身达人", desc: "一局内健身 4 次以上", check: (s, f) => (f.actionCounts && f.actionCounts.gym >= 4) },
  { id: "socialite", name: "🎉 社交花", desc: "一局内社交 4 次以上", check: (s, f) => (f.actionCounts && f.actionCounts.social >= 4) },
  { id: "slacker", name: "😴 躺平大师", desc: "一局内摆烂 4 次以上", check: (s, f) => (f.actionCounts && f.actionCounts.slack >= 4) },
  { id: "chain", name: "📖 剧情玩家", desc: "完成 1 条连锁剧情", check: (s, f) => (f.chainsCompleted || 0) >= 1 },
  { id: "chain-master", name: "🎬 剧情大师", desc: "完成 5 条连锁剧情", check: (s, f) => (f.chainsCompleted || 0) >= 5 },
  { id: "micro", name: "✨ 小事达人", desc: "一局内遇到 30 件随机小事", check: (s, f) => (f.microsSeen || 0) >= 30 },
  { id: "broke", name: "🕳️ 穷光蛋", desc: "金钱归零过", check: (s, f) => !!f.wasBroke },
  { id: "debtor", name: "💸 欠债", desc: "欠债超过 200", check: (s, f) => !!f.wasInDebt },
  { id: "comeback", name: "🔥 逆袭", desc: "曾经跌入谷底，最终拿下顶级结局", check: (s, f) => !!f.comeback },
  { id: "replay", name: "🔄 再来一局", desc: "累计玩过 3 局", check: (s, f) => (f.gamesPlayed || 0) >= 3 },
];

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
  // ---- v1.1 新增结局（22 个）----
  { id: "delay2", title: "延毕两年", emoji: "📉",
    desc: "学分差得太多，延毕两年。看着一届届学弟学妹毕业离校，你在空荡荡的宿舍里住了两年，终于把学分补齐了。" },
  { id: "dropout-startup", title: "退学创业", emoji: "🚀",
    desc: "你没等到毕业就退学了，带着攒下的钱和一腔热血去创业。所有人都说你疯了，但你的公司活下来了，而且越做越大。" },
  { id: "phd", title: "读博深造", emoji: "🔬",
    desc: "你以优异的成绩直博，继续在学术的道路上深造。实验室成了你的第二个家，论文发了一篇又一篇。" },
  { id: "baoyan-fail", title: "保研失败", emoji: "😔",
    desc: "就差一点点。保研名额没轮到你，失落了一阵子，但你很快振作起来，考研上岸了另一所学校，也挺好。" },
  { id: "kaoyan-retry", title: "考研二战", emoji: "📚",
    desc: "第一次没考上，你决定再战一年。二战的日子更苦，但你挺过来了，这次一定行。" },
  { id: "abroad", title: "出国留学", emoji: "✈️",
    desc: "你拿到了国外名校的 offer，飞往大洋彼岸。异国的四年，你见识了不一样的世界，回来的时候整个人都不一样了。" },
  { id: "civil", title: "考公上岸", emoji: "🏛️",
    desc: "千军万马过独木桥，你上岸了。铁饭碗端在手里，父母特别高兴，你也松了口气。" },
  { id: "startup-fail", title: "创业失败", emoji: "💔",
    desc: "你创业了，但项目没做起来，钱烧光了，团队也散了。失败的教训比成功更值钱，你带着经验重新出发。" },
  { id: "small-boss", title: "小老板", emoji: "🏪",
    desc: "你开了家小店，生意不温不火，但足够养活自己。当自己的老板，自由自在，挺好。" },
  { id: "influencer", title: "网红主播", emoji: "📱",
    desc: "你成了小有名气的主播，直播间每晚都有几千人看，广告接到手软。毕业即网红，这条路你走通了。" },
  { id: "esports-pro", title: "电竞选手", emoji: "🎮",
    desc: "你打进了职业电竞队，成了职业选手。赛场上的聚光灯、粉丝的欢呼，这是你打游戏打出来的未来。" },
  { id: "gamer-pro", title: "游戏主播", emoji: "🕹️",
    desc: "你靠打游戏直播火了，粉丝几十万，礼物收到手软。别人说你不务正业，你用收入证明了自己。" },
  { id: "teacher", title: "当老师", emoji: "👩‍🏫",
    desc: "你考了教师资格证，当了老师。站在讲台上的那一刻，你想起当年教过你的老师，薪火相传。" },
  { id: "writer", title: "作家", emoji: "✍️",
    desc: "你的小说出版了，签售会排起了长队。大学四年写下的几十万字，终于变成了铅字。" },
  { id: "artist", title: "艺术家", emoji: "🎨",
    desc: "你的作品在展览上获奖了，还办了个展。艺术这条路不好走，但你走出了自己的风格。" },
  { id: "photographer", title: "摄影师", emoji: "📷",
    desc: "你成了摄影师，拍人、拍风景、拍故事。你的照片里有光，有温度，有生活。" },
  { id: "volunteer-star", title: "公益之星", emoji: "❤️",
    desc: "你坚持做公益四年，支教、敬老院、志愿者，哪里需要你就去哪里。毕业那年，你拿到了公益之星的称号。" },
  { id: "freelancer", title: "自由职业", emoji: "💻",
    desc: "你成了自由职业者，接单、写稿、做设计，时间自由，收入也不错。不用打卡的人生，真香。" },
  { id: "love", title: "校园恋爱修成正果", emoji: "💕",
    desc: "你和 TA 从校园走到社会，感情越来越稳定。毕业那天，TA 向你求婚了，全宿舍都在起哄。" },
  { id: "gap-year", title: "间隔年", emoji: "🌍",
    desc: "毕业后你没急着工作，背起行囊去旅行了一年。走过很多地方，见过很多人，回来的时候，你知道自己想要什么了。" },
  { id: "inherit", title: "回家继承小卖部", emoji: "🏠",
    desc: "你回家继承了爸妈的小卖部，生意红红火火。每天守着小店，日子过得悠闲又满足。" },
  { id: "happy-rich", title: "平凡但幸福", emoji: "😊",
    desc: "你找了份普通的工作，收入不高但够花，周末和朋友聚聚，日子过得平平淡淡但特别幸福。平凡，也是一种成功。" },
];

// 结局判定（按顺序，第一个满足的胜出；延毕/退学排在前面——学分不够毕不了业，再快乐也没用）
function judgeEnding(s) {
  if (s.health <= 0) return "sick";
  if (s.money <= -500) return "debt";
  if (s.credits < 10) return "delay2";
  if (s.credits < 20) return "delay";
  if (s.credits >= 20 && s.credits < 25 && s.money >= 5000) return "dropout-startup";
  if (s.iq >= 90 && s.credits >= 55) return "phd";
  if (s.credits >= 40 && s.iq >= 85) return "baoyan";
  if (s.credits >= 35 && s.iq >= 75) return "kaoyan";
  if (s.credits >= 40 && s.iq >= 70) return "baoyan-fail";
  if (s.credits >= 30 && s.credits < 35 && s.iq >= 75) return "kaoyan-retry";
  if (s.iq >= 80 && s.money >= 3000) return "abroad";
  if (s.iq >= 80 && s.charm >= 75) return "dachang";
  if (s.iq >= 75 && s.charm >= 70 && (s.connections || 0) >= 60) return "civil";
  if (s.money >= 5000 && s.charm >= 70) return "startup";
  if (s.money >= 3000 && s.charm < 60 && s.iq >= 70) return "startup-fail";
  if (s.money >= 3000 && s.charm >= 60) return "small-boss";
  if (s.health >= 85 && s.charm >= 70) return "athlete";
  if (s.charm >= 85 && s.happy >= 85) return "love";
  if (s.charm >= 85 && s.happy >= 80) return "influencer";
  if (s.happy >= 90 && s.charm >= 70) return "gamer-pro";
  if (s.happy >= 85 && s.charm >= 70 && s.iq >= 60) return "esports-pro";
  if (s.iq >= 70 && s.charm >= 70 && s.credits >= 30) return "teacher";
  if (s.iq >= 80 && s.happy >= 70) return "writer";
  if (s.charm >= 85 && s.happy >= 75) return "artist";
  if (s.charm >= 80 && s.happy >= 75) return "photographer";
  if (s.charm >= 80 && s.happy >= 80 && s.money < 2000) return "volunteer-star";
  if (s.happy >= 80 && s.money >= 2000) return "freelancer";
  if (s.happy >= 80 && s.money >= 1000 && s.credits < 30) return "gap-year";
  if (s.happy >= 70 && s.money < 1000) return "inherit";
  if (s.happy >= 90) return "happy";
  if (s.happy >= 75 && s.money >= 1000) return "happy-rich";
  return "normal";
}
