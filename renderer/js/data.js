// 物种、性格、台词、收藏品、彩蛋登记表
(function () {
  const PP = (window.PP = window.PP || {});

  // 每小时困意（0~1）
  const curve = (pts) => {
    const a = new Array(24).fill(0);
    for (let h = 0; h < 24; h++) a[h] = pts(h);
    return a;
  };
  const diurnal = curve((h) => (h >= 23 || h < 7 ? 0.95 : h >= 13 && h < 15 ? 0.45 : h >= 21 ? 0.55 : 0.12));
  const crepus = curve((h) => (h >= 0 && h < 5 ? 0.85 : h >= 5 && h < 8 ? 0.15 : h >= 11 && h < 16 ? 0.6 : h >= 17 && h < 21 ? 0.1 : 0.4));
  const noctur = curve((h) => (h >= 8 && h < 18 ? 0.85 : h >= 18 && h < 20 ? 0.35 : h >= 20 || h < 5 ? 0.06 : 0.4));
  const foxy = curve((h) => (h >= 9 && h < 16 ? 0.6 : h >= 2 && h < 6 ? 0.55 : 0.15));

  PP.SPECIES = {
    cat: {
      name: '猫咪', coats: ['orange', 'mackerel', 'siamese', 'black', 'tux'], fav: 'treat_fish', favName: '小鱼干', favIcon: 'fish',
      chrono: crepus, speed: 38, run: 120, pitch: 880,
      bias: { extro: -0.1, playful: 0.1, lazy: 0.3, timid: 0, curious: 0.25, clingy: -0.15, greedy: 0.05, neat: 0.3 },
      trick: '翻肚皮', desc: '高冷又黏人，一天要睡十几个小时',
      lines: {
        greet: ['喵～你回来啦', '（蹭蹭）', '哼，才想起我啊'],
        hungry: ['喵！碗空了！', '饭呢饭呢', '我要饿扁了喵'],
        happy: ['呼噜呼噜…', '再摸摸这里', '喵～'],
        idle: ['窗外有鸟吗', '这个屏幕好暖和', '…（盯）', '想把那个图标推下去', '人类真奇怪'],
        alone: ['别吵，本喵在思考', '让我一个人待会儿'],
      },
    },
    dog: {
      name: '柴犬', coats: ['red', 'black', 'white'], fav: 'treat_bone', favName: '小骨头', favIcon: 'bone',
      chrono: diurnal, speed: 46, run: 150, pitch: 520,
      bias: { extro: 0.35, playful: 0.3, lazy: -0.1, timid: -0.1, curious: 0.1, clingy: 0.35, greedy: 0.25, neat: -0.2 },
      trick: '转圈圈', desc: '最喜欢你，情绪全写在尾巴上',
      lines: {
        greet: ['汪！！你回来了！！', '我等你好久了！', '主人主人主人！'],
        hungry: ['汪…饭饭…', '（盯着碗）', '可以吃饭了吗？'],
        happy: ['好开心！', '汪汪！', '再来再来！'],
        idle: ['今天也要守护主人', '那个球去哪了', '闻到了好吃的味道', '想出去散步', '你在忙吗？我等你'],
        alone: ['我在这里趴一会儿', '…（发呆）'],
      },
    },
    rabbit: {
      name: '兔兔', coats: ['white', 'gray', 'dutch'], fav: 'treat_carrot', favName: '胡萝卜', favIcon: 'carrot',
      chrono: crepus, speed: 34, run: 140, pitch: 1200,
      bias: { extro: -0.15, playful: 0.15, lazy: 0.05, timid: 0.35, curious: 0.15, clingy: 0.05, greedy: 0.2, neat: 0.35 },
      trick: '空中转体', desc: '胆小敏感，开心时会原地起跳',
      lines: {
        greet: ['（耳朵竖起来）', '你回来啦…', '（蹦蹦）'],
        hungry: ['想吃草…', '肚子咕咕叫', '（扒拉碗）'],
        happy: ['（磨牙）开心', '嘿嘿', '耳朵也要摸'],
        idle: ['刚才是什么声音', '这里很安全', '想挖个洞', '鼻子痒痒', '今天天气好吗'],
        alone: ['我躲一会儿', '安静…安静…'],
      },
    },
    hamster: {
      name: '仓鼠', coats: ['gold', 'silver', 'pudding'], fav: 'treat_seed', favName: '瓜子', favIcon: 'seed',
      chrono: noctur, speed: 30, run: 130, pitch: 1500,
      bias: { extro: 0, playful: 0.2, lazy: 0, timid: 0.25, curious: 0.3, clingy: 0, greedy: 0.45, neat: 0.2 },
      trick: '装死', desc: '夜猫子，白天睡觉晚上跑酷，爱囤粮',
      lines: {
        greet: ['吱！', '你带吃的了吗', '（腮帮子鼓鼓）'],
        hungry: ['我的存粮呢！', '吱吱吱！饿！', '再囤一点…'],
        happy: ['吱～', '（洗脸）', '好舒服'],
        idle: ['数一数存粮…', '晚上才是我的时间', '想跑轮子', '这颗瓜子藏哪好', '吱？'],
        alone: ['嘘，在数瓜子', '我在洗脸'],
      },
    },
    penguin: {
      name: '企鹅', coats: ['classic', 'emperor', 'fluffy'], fav: 'treat_fish', favName: '小鱼', favIcon: 'fish',
      chrono: diurnal, speed: 26, run: 90, pitch: 640,
      bias: { extro: 0.3, playful: 0.2, lazy: 0.05, timid: 0.05, curious: 0.2, clingy: 0.15, greedy: 0.15, neat: 0.25 },
      trick: '肚皮滑行', desc: '走路摇摇晃晃，社交达鹅',
      lines: {
        greet: ['嘎！', '（拍拍翅膀）', '你回来啦嘎'],
        hungry: ['想吃鱼', '嘎…饿了', '（摇摆着找吃的）'],
        happy: ['嘎嘎！', '（扑腾）', '好耶'],
        idle: ['好想念冰川', '这里有点热', '我能飞吗？不能', '走路要稳', '要不要去滑一圈'],
        alone: ['看会儿远方', '…嘎'],
      },
    },
    fox: {
      name: '狐狸', coats: ['red', 'arctic', 'silver'], fav: 'treat_berry', favName: '野莓', favIcon: 'berry',
      chrono: foxy, speed: 42, run: 160, pitch: 760,
      bias: { extro: -0.05, playful: 0.3, lazy: -0.05, timid: 0.1, curious: 0.35, clingy: -0.05, greedy: 0.1, neat: 0.15 },
      trick: '扎雪堆', desc: '聪明又傲娇，听到动静会一头扎下去',
      lines: {
        greet: ['哼哼，你来了', '（尾巴摇了一下）', '我才没有等你'],
        hungry: ['猎物都跑哪去了', '饿…', '你有吃的吗'],
        happy: ['嘿嘿', '尾巴给你摸一下', '还不错嘛'],
        idle: ['底下好像有动静', '月亮什么时候圆', '我的尾巴最好看', '想捉蝴蝶', '…（竖耳朵）'],
        alone: ['别看我', '我在巡逻'],
      },
    },
    dragon: {
      name: '小龙', coats: ['mint'], fav: 'treat_chili', favName: '小辣椒', favIcon: 'chili',
      chrono: diurnal, speed: 36, run: 120, pitch: 420, hidden: true,
      bias: { extro: 0.2, playful: 0.35, lazy: 0.1, timid: -0.2, curious: 0.4, clingy: 0.25, greedy: 0.2, neat: 0 },
      trick: '喷小火', desc: '从神秘的蛋里孵出来的，没人知道它从哪来',
      lines: {
        greet: ['嗷！', '（吐出一个小火星）', '你是我的家人'],
        hungry: ['想吃辣的', '肚子里的火要灭了', '饿嗷'],
        happy: ['嗷呜～', '（扑扇翅膀）', '最喜欢了'],
        idle: ['我以后会长很大吗', '翅膀还飞不起来', '那个蛋壳我还留着', '这个世界好大', '你也是从蛋里出来的吗'],
        alone: ['我在守护宝藏', '…呼'],
      },
    },
  };
  PP.SPECIES_LIST = ['cat', 'dog', 'rabbit', 'hamster', 'penguin', 'fox'];

  PP.TRAITS = [
    ['extro', '社牛', '社恐'],
    ['playful', '爱玩', '佛系'],
    ['lazy', '嗜睡', '精力旺盛'],
    ['timid', '胆小', '大胆'],
    ['curious', '好奇宝宝', '淡定'],
    ['clingy', '粘人', '独立'],
    ['greedy', '吃货', '挑食'],
    ['neat', '爱干净', '邋遢'],
  ];

  // 通用台词（物种台词之外）
  PP.LINES = {
    morning: ['早上好！', '早安～今天也一起加油', '（伸懒腰）早'],
    noon: ['午饭吃了吗？', '中午了，你也要吃饭哦'],
    evening: ['天黑了…', '今天辛苦了'],
    lateNight: ['好晚了，该睡觉了…', '你还不睡吗？', '我陪你，但你要早点睡'],
    breakTime: ['你已经忙了好久了，休息一下眼睛吧', '站起来伸个懒腰？', '喝口水吧，我也去喝'],
    backShort: ['你回来啦'],
    backLong: ['你去哪了！', '我以为你不要我了…', '终于回来了！'],
    pokeOk: ['！', '干嘛～', '嘿！', '痒'],
    pokeAnnoyed: ['别戳了！', '哼！', '生气了！'],
    wakeGrumpy: ['…谁吵我睡觉', '唔…困…', '（翻身继续睡）'],
    heldLike: ['飞起来了！', '高高～', '嘿嘿'],
    heldDislike: ['放我下来！', '我恐高！', '呜呜'],
    dizzy: ['天旋地转…', '星星在转圈', '晕…'],
    thirsty: ['好渴…', '没水了'],
    dirty: ['这里好脏…', '有便便…', '能打扫一下吗'],
    lonely: ['有人陪我玩吗', '好无聊…', '你在吗？'],
    friend: ['一起玩吧！', '你好呀', '嘿！'],
    gift: ['送给你！', '这是我找到的', '给你的礼物'],
    bored: ['好无聊啊', '有没有好玩的'],
    fav: ['是我最爱的！', '哇！！', '你最好了！'],
    sulk: ['哼，不理你了', '（背对你）'],
    forgive: ['…好吧原谅你了', '下次不许了'],
    dream: ['（梦话）嗯…', '…好吃…', '（梦里在跑）'],
    sleepNear: ['你的手好暖', '在这里睡…'],
    playAsk: ['陪我玩！', '来追我呀', '我们玩吧'],
  };

  // 随机的小念头（会结合时间、季节）
  PP.MUSINGS = {
    any: ['今天也很好', '刚才想到什么来着', '那个窗口好亮', '世界好大', '你在看什么呢', '我好像长大了一点', '想晒太阳', '如果我会打字就好了', '你的鼠标好可爱'],
    spring: ['春天的味道', '花开了吗'],
    summer: ['好热…想吃冰', '想去海边'],
    autumn: ['叶子变黄了', '秋天好适合睡觉', '风有点凉了'],
    winter: ['好冷，挤在一起吧', '下雪的话就好了', '想钻被窝'],
    monday: ['周一啦，加油', '周一好难…'],
    friday: ['周五了！', '快到周末啦'],
    weekend: ['周末不用上班吗？', '今天可以多陪我吗'],
  };

  // 宠物会捡来送你的小东西
  PP.GIFTS = {
    leaf: { name: '一片落叶', desc: '它觉得这片叶子的颜色很好看', rare: 1 },
    pebble: { name: '圆圆的小石子', desc: '在屏幕角落里找到的，特别圆', rare: 1 },
    feather: { name: '羽毛', desc: '不知道是哪只鸟掉的', rare: 2 },
    flower: { name: '小野花', desc: '它小心翼翼叼过来的', rare: 2 },
    acorn: { name: '橡果', desc: '原本想藏起来过冬的', rare: 2 },
    button: { name: '红纽扣', desc: '可能是从你衣服上掉的', rare: 3 },
    shell: { name: '小贝壳', desc: '能听到很远很远的海', rare: 3 },
    starfrag: { name: '星星碎片', desc: '流星落下的那天晚上捡到的', rare: 5 },
  };

  // 彩蛋登记表（彩蛋图鉴）
  PP.EGGS = {
    poke_rage: { name: '戳戳狂魔', hint: '有些事情做多了，会被讨厌' },
    dizzy: { name: '人肉摇摇车', hint: '抓起来以后…晃一晃？' },
    perfect_landing: { name: '完美落地', hint: '猫咪从高处落下时…' },
    circle: { name: '转圈圈', hint: '用鼠标绕着它画圈' },
    hand_nap: { name: '手心里睡着', hint: '它足够信任你时，鼠标停在它身上别动' },
    wish_1111: { name: '11:11 许愿', hint: '某个特别的时刻' },
    late_night: { name: '熬夜被抓', hint: '凌晨还在用电脑' },
    shooting_star: { name: '流星', hint: '深夜，偶尔抬头看看' },
    holiday: { name: '一起过节', hint: '节日的时候，它们也会打扮' },
    anniversary: { name: '纪念日', hint: '在一起第 7 / 30 / 100 天' },
    shiny: { name: '闪光个体', hint: '极少数宠物生来就带着光' },
    knock_off: { name: '推下去', hint: '猫咪看到桌边的杯子…' },
    zoomies: { name: '午夜跑酷', hint: '深夜突然精神' },
    fetch: { name: '捡球大师', hint: '扔球给狗狗' },
    gift: { name: '礼物', hint: '足够喜欢你的时候' },
    cuddle: { name: '抱团睡', hint: '关系很好的两只宠物' },
    trick: { name: '才艺表演', hint: '快速双击' },
    yawn: { name: '哈欠会传染', hint: '一只打哈欠的时候看看另一只' },
    friday: { name: '周五之舞', hint: '周五傍晚' },
    break_care: { name: '被关心了', hint: '连续使用电脑很久' },
    dream: { name: '梦里有你', hint: '看看睡着的它在想什么' },
    mystery_egg: { name: '神秘的蛋', hint: '一起生活一段时间后，会出现…' },
    stash: { name: '秘密粮仓', hint: '仓鼠的腮帮子是有用的' },
    full_moon: { name: '满月之夜', hint: '月亮最圆的那天晚上' },
    hunt: { name: '狩猎本能', hint: '鼠标甩得飞快的时候' },
    purr: { name: '呼噜呼噜', hint: '摸摸它的头' },
    overheat: { name: '键盘冒烟', hint: '打字打得飞快' },
    roll: { name: '卷纸大师', hint: '滚一滚页面' },
    konami: { name: '↑↑↓↓←→←→BA', hint: '古老的咒语' },
  };
})();
