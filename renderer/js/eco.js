// 生态：每只动物都有自己的家、作息、口味和脾气，在五个场景里过自己的日子。
// 看不到的地方它们也在生活：去吃饭、串门、回家睡觉、躲雨——等你切过去，正好撞见。
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G, A = PP.ACTIONS;
  const sf = (a) => new Set(a);

  // ---------- 每种动物的习性 ----------
  // home：家在哪个场景 · avoid：什么天气躲回家（数值越大越讨厌）· foods/water/fun：去哪儿吃、喝、玩
  // 每一项：scene 场景 · spot 设施 · kind 干什么 · label 在干嘛 · w 喜好程度 · season 季节限制 · when 额外条件
  const ALL = ['spring', 'summer', 'autumn', 'winter'], WARM = ['spring', 'summer', 'autumn'];
  const HAB = {
    cat: {
      home: 'farm', about: '住在农场谷仓的阁楼里。一天要睡十几个小时，清晨和傍晚最精神：先去谷仓门口吃猫粮，再到草垛边蹲老鼠，或者溜到湖边码头盯着水里的鱼。晒太阳一定要挑高处——栅栏顶、谷仓屋顶。最讨厌下雨和大风，雨一来就躲回阁楼。',
      likes: '晒太阳 · 高处 · 码头看鱼 · 抓老鼠', hates: '下雨 · 大风 · 下雪', diet: '猫粮、湖里的小鱼、老鼠',
      avoid: { drizzle: 0.6, rain: 1, heavyrain: 1, storm: 1, sleet: 1, snow: 0.8, heavysnow: 1, windy: 0.6 }, cold: 0, heat: 33,
      foods: [{ scene: 'farm', spot: 'catbowl', kind: 'eat', label: '在谷仓门口吃猫粮', w: 1 }, { scene: 'lake', spot: 'dock', kind: 'fish', label: '蹲在码头钓鱼', w: 1.3, season: WARM, noIce: 1 }, { scene: 'farm', spot: 'hay', kind: 'hunt', label: '在草垛边蹲老鼠', w: 0.8 }],
      water: [{ scene: 'farm', spot: 'trough' }, { scene: 'lake', spot: 'shore' }],
      fun: [{ scene: 'farm', spot: 'fence', kind: 'perch', label: '趴在栅栏顶上晒太阳', w: 1.2, when: 'sunny' }, { scene: 'farm', spot: 'barnroof', kind: 'perch', label: '在谷仓屋顶上看风景', w: 0.7 }, { scene: 'lake', spot: 'dock', kind: 'watch', label: '蹲在码头盯着鱼看', w: 0.9, noIce: 1 }, { scene: 'farm', spot: 'hay', kind: 'knead', label: '在干草堆上踩奶', w: 0.8 }, { scene: 'meadow', spot: 'flowers', kind: 'pounce', label: '在花丛里扑蝴蝶', w: 0.7, season: ['spring', 'summer'] }],
    },
    dog: {
      home: 'farm', about: '住在农场门口的狗窝，自认是农场的保安。白天精力旺盛：绕着院子巡逻，跑到草地上疯跑、刨土找骨头。天一黑就回窝睡。下雪天反而兴奋，会去雪地里打滚；只有大雨和打雷会让它缩回窝里。',
      likes: '巡逻 · 疯跑 · 刨土 · 雪地打滚 · 交朋友', hates: '打雷 · 大雨', diet: '狗粮、骨头',
      avoid: { rain: 0.6, heavyrain: 1, storm: 1, sleet: 0.7, heavysnow: 0.7 }, cold: -12, heat: 32,
      foods: [{ scene: 'farm', spot: 'dogbowl', kind: 'eat', label: '在狗窝旁边吃饭', w: 1.2 }, { scene: 'meadow', spot: 'grass', kind: 'dig', label: '在草地上刨骨头', w: 0.5 }],
      water: [{ scene: 'farm', spot: 'trough' }, { scene: 'forest', spot: 'brook' }, { scene: 'meadow', spot: 'puddle' }],
      fun: [{ scene: 'farm', spot: 'yard', kind: 'patrol', label: '在农场巡逻', w: 1.2 }, { scene: 'meadow', spot: 'grass', kind: 'zoom', label: '在草地上撒欢疯跑', w: 1 }, { scene: 'meadow', spot: 'hill', kind: 'dig', label: '在小山坡上刨坑', w: 0.6 }, { scene: 'forest', spot: 'leaves', kind: 'sniff', label: '在林子里到处闻', w: 0.5 }, { scene: 'snow', spot: 'snowfield', kind: 'roll', label: '在雪地里打滚', w: 1.4, when: 'snowy' }],
    },
    rabbit: {
      home: 'meadow', about: '住在草地灌木丛下的兔子洞里。晨昏两头最活跃（天刚亮、天快黑），中午和半夜都窝在洞里。主食是三叶草和嫩草，夏秋会偷偷溜去农场菜园啃胡萝卜。胆子很小：打雷、刮大风、下雨都会立刻钻回洞里；开心的时候会原地起跳转体。',
      likes: '三叶草 · 胡萝卜 · 挖洞 · 原地起跳', hates: '下雨 · 打雷 · 大风 · 狐狸', diet: '三叶草、嫩草、胡萝卜，冬天啃干草',
      avoid: { drizzle: 0.6, rain: 1, heavyrain: 1, storm: 1, sleet: 1, snow: 0.7, heavysnow: 1, windy: 0.8, fog: 0.3 }, cold: -5, heat: 30,
      foods: [{ scene: 'meadow', spot: 'clover', kind: 'graze', label: '在三叶草地上吃草', w: 1.5, season: WARM }, { scene: 'farm', spot: 'veg', kind: 'graze', label: '溜进菜园偷吃胡萝卜', w: 0.9, season: ['summer', 'autumn'] }, { scene: 'farm', spot: 'hay', kind: 'graze', label: '啃农场的干草', w: 1, season: ['winter'] }],
      water: [{ scene: 'meadow', spot: 'puddle' }],
      fun: [{ scene: 'meadow', spot: 'clover', kind: 'binky', label: '开心得原地起跳', w: 1 }, { scene: 'meadow', spot: 'rabbit_home', kind: 'dig', label: '在洞口挖土', w: 0.6 }, { scene: 'meadow', spot: 'flowers', kind: 'groom', label: '在花丛边洗脸', w: 0.7 }],
    },
    hamster: {
      home: 'meadow', about: '住在向日葵地底下的地洞里，洞里有它的秘密粮仓。白天几乎都在睡，太阳落山才出门：钻进向日葵地里捡瓜子，腮帮子塞满了就跑回洞里囤起来。冬天外面没吃的，就靠存粮过日子。怕冷怕风，天气不好绝不出门。',
      likes: '瓜子 · 囤粮 · 夜里跑来跑去', hates: '白天 · 刮风 · 冷', diet: '向日葵瓜子（会囤在洞里）',
      avoid: { drizzle: 0.8, rain: 1, heavyrain: 1, storm: 1, sleet: 1, snow: 1, heavysnow: 1, windy: 1, fog: 0.4 }, cold: 5, heat: 31,
      foods: [{ scene: 'meadow', spot: 'sunflowers', kind: 'seeds', label: '在向日葵地里捡瓜子', w: 1.6, season: ['summer', 'autumn'] }, { scene: 'meadow', spot: 'clover', kind: 'graze', label: '在草地上找草籽', w: 0.6, season: ['spring'] }],
      water: [{ scene: 'meadow', spot: 'puddle' }],
      fun: [{ scene: 'meadow', spot: 'sunflowers', kind: 'zoom', label: '在向日葵地里跑酷', w: 1 }, { scene: 'meadow', spot: 'hamster_home', kind: 'groom', label: '蹲在洞口洗脸', w: 0.8 }],
      stash: true,
    },
    penguin: {
      home: 'snow', about: '住在雪原上的冰屋里——这里是整个世界唯一常年有雪的地方。每天去冰窟窿钓鱼，吃饱了就从雪坡上肚皮滑下来，一遍又一遍。越冷越开心，下雪天最兴奋；只有打雷会让它回冰屋。很少离开雪原。',
      likes: '下雪 · 肚皮滑行 · 钓鱼 · 一群人一起走', hates: '热 · 打雷', diet: '冰窟窿里的鱼',
      avoid: { storm: 1 }, cold: -60, heat: 99, snowLover: 1,
      foods: [{ scene: 'snow', spot: 'icehole', kind: 'dive', label: '在冰窟窿里抓鱼', w: 1.5 }],
      water: [{ scene: 'snow', spot: 'icehole' }],
      fun: [{ scene: 'snow', spot: 'slidetop', kind: 'slide', label: '从雪坡上肚皮滑下来', w: 1.6 }, { scene: 'snow', spot: 'pond', kind: 'waddle', label: '在冰面上摇摇摆摆地散步', w: 0.8 }, { scene: 'snow', spot: 'snowfield', kind: 'groom', label: '站在雪地里理羽毛', w: 0.6 }],
    },
    fox: {
      home: 'forest', about: '住在森林大橡树根下的狐狸洞。清晨和黄昏出来觅食：摘浆果、到草地上听地下的田鼠，一跃扎进去。下雪天会专门去雪地里“扎雪堆”捕猎。白天中午在洞里打盹，或者趴在大石头上晒太阳。下大雨、打雷时不出门。',
      likes: '浆果 · 捕猎 · 晒太阳 · 扎雪堆', hates: '大雨 · 打雷 · 狗太吵', diet: '浆果、田鼠、虫子',
      avoid: { rain: 0.7, heavyrain: 1, storm: 1, sleet: 0.8, heavysnow: 0.8, windy: 0.4 }, cold: -25, heat: 31,
      foods: [{ scene: 'forest', spot: 'berries', kind: 'berries', label: '在摘浆果吃', w: 1.3, season: ['summer', 'autumn'] }, { scene: 'meadow', spot: 'grass', kind: 'hunt', label: '在草地上听田鼠，准备扑', w: 1 }, { scene: 'snow', spot: 'snowfield', kind: 'hunt', label: '一头扎进雪堆里抓老鼠', w: 1.2, when: 'snowy' }, { scene: 'forest', spot: 'leaves', kind: 'sniff', label: '在落叶里找虫子', w: 0.6 }],
      water: [{ scene: 'forest', spot: 'brook' }],
      fun: [{ scene: 'forest', spot: 'sunrock', kind: 'perch', label: '趴在大石头上晒太阳', w: 1.1, when: 'sunny' }, { scene: 'forest', spot: 'leaves', kind: 'patrol', label: '在林子里巡视领地', w: 0.9 }, { scene: 'meadow', spot: 'flowers', kind: 'pounce', label: '在花丛里扑蝴蝶', w: 0.6, season: ['spring', 'summer'] }],
    },
    frog: {
      home: 'lake', about: '住在湖里那片最大的荷叶上。傍晚和夜里最精神：蹲在荷叶上呱呱叫，舌头一伸抓飞虫，或者在水里游一圈。最爱下雨天，一下雨就全员出动。冬天湖面结冰，它会钻进湖底的泥里冬眠，一直睡到春天。',
      likes: '下雨 · 飞虫 · 荷叶 · 呱呱叫', hates: '干燥的大晴天中午 · 冷', diet: '飞虫',
      avoid: { storm: 0.8, windy: 0.5 }, cold: 6, heat: 34, hibernate: 1, rainLover: 1,
      foods: [{ scene: 'lake', spot: 'frog_home', kind: 'tongue', label: '蹲在荷叶上用舌头抓飞虫', w: 1.4, season: WARM }, { scene: 'meadow', spot: 'puddle', kind: 'tongue', label: '在水洼边抓虫子', w: 0.7, season: WARM, when: 'wet' }],
      water: [{ scene: 'lake', spot: 'swim' }],
      fun: [{ scene: 'lake', spot: 'frog_home', kind: 'croak', label: '坐在荷叶上呱呱叫', w: 1.3 }, { scene: 'lake', spot: 'swim', kind: 'swim', label: '在湖里游泳', w: 1, noIce: 1 }, { scene: 'lake', spot: 'lily', kind: 'perch', label: '跳到另一片荷叶上发呆', w: 0.7, noIce: 1 }],
    },
    chick: {
      home: 'farm', about: '住在农场的鸡舍。天一亮就醒，天一黑就回窝，比谁都准时。一整天都在院子里低头啄玉米粒、刨土洗沙浴，喜欢跟在别的动物屁股后面走。下雨刮风都躲进鸡舍；看到狐狸会吓得扑腾回窝。',
      likes: '玉米粒 · 沙浴 · 跟着大家走', hates: '下雨 · 大风 · 狐狸 · 天黑', diet: '玉米粒、草籽、小虫',
      avoid: { drizzle: 0.7, rain: 1, heavyrain: 1, storm: 1, sleet: 1, snow: 0.9, heavysnow: 1, windy: 0.9 }, cold: 0, heat: 32,
      foods: [{ scene: 'farm', spot: 'feed', kind: 'peck', label: '在院子里啄玉米粒', w: 1.6 }, { scene: 'meadow', spot: 'grass', kind: 'peck', label: '在草地上找草籽', w: 0.4, season: WARM }],
      water: [{ scene: 'farm', spot: 'trough' }],
      fun: [{ scene: 'farm', spot: 'yard', kind: 'dust', label: '在院子里洗沙浴', w: 1 }, { scene: 'farm', spot: 'feed', kind: 'follow', label: '跟在大家后面走', w: 1.1 }, { scene: 'farm', spot: 'apple', kind: 'peck', label: '在苹果树下刨土找虫', w: 0.7 }],
    },
    duck: {
      home: 'lake', about: '住在湖边芦苇丛里的鸭窝。白天大部分时间漂在湖上：一头扎进水里找水草（屁股朝天），游累了上岸理羽毛。下雨天最开心，反而要出来扑腾。冬天湖面结冰就待在窝里，偶尔去农场水槽边转转。',
      likes: '游泳 · 下雨 · 理羽毛 · 扑腾', hates: '打雷 · 结冰', diet: '水草、小虫、面包屑',
      avoid: { storm: 1, heavysnow: 0.8, windy: 0.4 }, cold: -8, heat: 35, rainLover: 1,
      foods: [{ scene: 'lake', spot: 'swim', kind: 'dabble', label: '在湖里扎猛子找水草', w: 1.5, noIce: 1 }, { scene: 'farm', spot: 'feed', kind: 'peck', label: '去农场蹭点玉米粒', w: 0.5 }, { scene: 'lake', spot: 'reeds', kind: 'peck', label: '在芦苇边啄小虫', w: 0.6 }],
      water: [{ scene: 'lake', spot: 'swim', noIce: 1 }, { scene: 'farm', spot: 'trough' }],
      fun: [{ scene: 'lake', spot: 'swim', kind: 'swim', label: '在湖面上漂来漂去', w: 1.6, noIce: 1 }, { scene: 'lake', spot: 'reeds', kind: 'groom', label: '在岸边理羽毛', w: 0.8 }, { scene: 'meadow', spot: 'puddle', kind: 'splash', label: '在水洼里扑腾', w: 0.7, when: 'wet' }],
    },
    pig: {
      home: 'farm', about: '住在农场的猪圈。吃饭最积极：先去水槽边，再到苹果树下拱掉下来的苹果，秋天还会一路拱到森林里找蘑菇松露。天热了就在泥坑里打滚降温（泥巴就是它的防晒霜）。下着小雨也照样出门玩泥巴，只有暴雨打雷才回圈里。',
      likes: '吃 · 泥坑 · 拱土 · 晒太阳', hates: '暴雨 · 饿肚子', diet: '饲料、苹果、蘑菇、什么都吃',
      avoid: { heavyrain: 1, storm: 1, sleet: 0.8, heavysnow: 1, snow: 0.6 }, cold: -3, heat: 99, mudLover: 1,
      foods: [{ scene: 'farm', spot: 'trough', kind: 'eat', label: '在水槽边吃饲料', w: 1.2 }, { scene: 'farm', spot: 'apple', kind: 'root', label: '在苹果树下拱苹果吃', w: 1.3, season: ['summer', 'autumn'] }, { scene: 'forest', spot: 'mushrooms', kind: 'root', label: '在森林里拱松露', w: 1, season: ['autumn'] }, { scene: 'farm', spot: 'veg', kind: 'root', label: '在菜园边拱菜叶', w: 0.5, season: ['summer', 'autumn'] }],
      water: [{ scene: 'farm', spot: 'trough' }],
      fun: [{ scene: 'farm', spot: 'mud', kind: 'wallow', label: '在泥坑里打滚', w: 1.4 }, { scene: 'farm', spot: 'yard', kind: 'nap', label: '躺在院子里晒太阳', w: 0.8, when: 'sunny' }, { scene: 'forest', spot: 'leaves', kind: 'root', label: '在落叶里拱来拱去', w: 0.6 }],
    },
    capybara: {
      home: 'lake', about: '住在湖边的温泉里——对，它就住在温泉里。每天的日程：泡温泉、到岸边吃草、再泡温泉。冬天泡得更久，头上还会顶个柚子。情绪极其稳定，什么天气都无所谓（打雷也只是泡得更深一点）；所有动物都喜欢来靠着它。',
      likes: '泡温泉 · 柚子 · 吃草 · 发呆 · 被大家靠着', hates: '（好像没有）', diet: '岸边的嫩草、水草、西瓜',
      avoid: {}, cold: -30, heat: 99,
      foods: [{ scene: 'lake', spot: 'shore', kind: 'graze', label: '在岸边慢慢吃草', w: 1.4 }, { scene: 'meadow', spot: 'clover', kind: 'graze', label: '去草地上吃草', w: 0.4, season: WARM }],
      water: [{ scene: 'lake', spot: 'shore' }],
      fun: [{ scene: 'lake', spot: 'capybara_home', kind: 'soak', label: '泡在温泉里发呆', w: 2 }, { scene: 'lake', spot: 'swim', kind: 'swim', label: '在湖里慢悠悠地游', w: 0.6, noIce: 1, season: ['summer'] }, { scene: 'lake', spot: 'shore', kind: 'nap', label: '在岸边打盹', w: 0.6 }],
    },
    hedgehog: {
      home: 'forest', about: '住在森林倒木下的落叶窝。昼伏夜出：天黑以后慢慢出门，用鼻子在落叶堆里拱虫子吃，有时候走到草地上找甲虫。被吓到就缩成一个刺球。天冷以后会在落叶窝里冬眠，一觉睡到开春。',
      likes: '夜里散步 · 虫子 · 落叶堆', hates: '白天 · 吵闹 · 冷', diet: '虫子、蚯蚓、甲虫',
      avoid: { rain: 0.6, heavyrain: 1, storm: 1, sleet: 1, snow: 1, heavysnow: 1, windy: 0.8 }, cold: 5, heat: 32, hibernate: 1,
      foods: [{ scene: 'forest', spot: 'leaves', kind: 'forage', label: '在落叶堆里拱虫子', w: 1.5 }, { scene: 'meadow', spot: 'grass', kind: 'forage', label: '在草地上找甲虫', w: 0.6, season: WARM }, { scene: 'forest', spot: 'mushrooms', kind: 'forage', label: '在蘑菇边找蜗牛', w: 0.6, when: 'wet' }],
      water: [{ scene: 'forest', spot: 'brook' }],
      fun: [{ scene: 'forest', spot: 'leaves', kind: 'sniff', label: '慢慢地夜游', w: 1 }, { scene: 'forest', spot: 'log', kind: 'groom', label: '蹲在倒木边发呆', w: 0.7 }],
    },
    dragon: {
      home: 'forest', about: '从神秘的蛋里孵出来，住在森林深处的石头山洞。白天到处探险，最爱吃辣辣的东西和红浆果；会在大石头上晒太阳（毕竟是冷血的？没人知道）。不怕冷也不怕热。',
      likes: '探险 · 红浆果 · 晒太阳 · 发光的东西', hates: '无聊', diet: '浆果、辣椒、蘑菇',
      avoid: { storm: 0.6 }, cold: -40, heat: 99,
      foods: [{ scene: 'forest', spot: 'berries', kind: 'berries', label: '在偷吃红浆果', w: 1.2 }, { scene: 'forest', spot: 'mushrooms', kind: 'berries', label: '在啃蘑菇', w: 0.7 }],
      water: [{ scene: 'forest', spot: 'brook' }],
      fun: [{ scene: 'forest', spot: 'sunrock', kind: 'perch', label: '在大石头上晒太阳', w: 1 }, { scene: 'meadow', spot: 'hill', kind: 'zoom', label: '在草地上练习飞', w: 0.8 }, { scene: 'lake', spot: 'dock', kind: 'watch', label: '在码头看自己的倒影', w: 0.5 }],
    },
  };
  // ---- 海底的伙伴（只在海底和海滩活动；海里不怕下雨刮风） ----
  Object.assign(HAB, {
    turtle: {
      home: 'sea', sea: true, about: '住在海底珊瑚拱门下的海草窝里。白天慢慢游：先去海草地啃海草，吃饱了游到珊瑚拱门顶上歇着，或者在海带林里随着水流晃。夏天会爬上海滩晒太阳、在沙里挖坑下蛋；冬天海水冷，它就整天窝在家里不太动。',
      likes: '海草 · 慢慢游 · 晒太阳 · 夏天上岸', hates: '塑料袋 · 太吵', diet: '海草、海带，偶尔一只小水母',
      avoid: {}, cold: -99, heat: 99, underwater: 1,
      foods: [{ scene: 'sea', spot: 'seagrass', kind: 'graze', label: '在海草地慢慢啃海草', w: 1.6 }, { scene: 'sea', spot: 'kelp', kind: 'graze', label: '在海带林里吃海带', w: 0.9 }],
      water: [{ scene: 'sea', spot: 'seagrass' }],
      fun: [{ scene: 'sea', spot: 'reef', kind: 'perch', label: '趴在珊瑚拱门顶上歇着', w: 1.2 }, { scene: 'sea', spot: 'kelp', kind: 'waddle', label: '在海带林里随水流晃', w: 0.9 }, { scene: 'beach', spot: 'sand', kind: 'nap', label: '爬上沙滩晒太阳', w: 0.9, when: 'sunny', season: ['spring', 'summer'] }, { scene: 'sea', spot: 'coral', kind: 'watch', label: '在珊瑚丛边看小鱼', w: 0.8 }],
    },
    crab: {
      home: 'beach', sea: true, about: '住在沙滩上一只大海螺里。傍晚和夜里最活跃：横着走到潮池里翻找小虾小贝，或者下到海底的沙地上找吃的。喜欢捡亮晶晶的小石子和贝壳。胆子小，一受惊就钻进沙里只露两只眼睛；白天大部分时间在海螺里睡觉。',
      likes: '小虾 · 潮池 · 挖沙 · 亮晶晶的东西', hates: '被踩到 · 大浪', diet: '小虾、海藻、贝壳里的小东西',
      avoid: { storm: 0.8 }, cold: -99, heat: 99, underwater: 1,
      foods: [{ scene: 'sea', spot: 'sandflat', kind: 'forage', label: '在沙地上横着走找小虾', w: 1.4 }, { scene: 'beach', spot: 'tidepool', kind: 'peck', label: '爬到潮池里觅食', w: 1, season: ['spring', 'summer', 'autumn'] }],
      water: [{ scene: 'sea', spot: 'sandflat' }],
      fun: [{ scene: 'sea', spot: 'sandflat', kind: 'dig', label: '在沙里挖洞', w: 1.1 }, { scene: 'sea', spot: 'clam', kind: 'watch', label: '在大砗磲边捡亮晶晶的东西', w: 0.9 }, { scene: 'beach', spot: 'sand', kind: 'patrol', label: '在沙滩上横着散步', w: 0.8, season: ['summer', 'autumn'] }, { scene: 'sea', spot: 'coral', kind: 'sniff', label: '在珊瑚缝里钻来钻去', w: 0.7 }],
    },
    octopus: {
      home: 'sea', sea: true, about: '住在沉船肚子里的一个陶罐里。夜里出门：在珊瑚和石头缝里伸触手摸小虾，顺便把好看的贝壳带回家摆在门口。很聪明也很怕生，高兴了会变成粉红色，受惊会喷一团墨溜走。白天窝在罐子里睡觉。',
      likes: '收集贝壳 · 小虾 · 钻罐子 · 变颜色', hates: '亮光 · 被盯着看', diet: '小虾、小螃蟹（嘘，别告诉螃蟹）',
      avoid: {}, cold: -99, heat: 99, underwater: 1,
      foods: [{ scene: 'sea', spot: 'coral', kind: 'forage', label: '把触手伸进珊瑚缝里摸小虾', w: 1.5 }, { scene: 'sea', spot: 'sandflat', kind: 'hunt', label: '在沙地上悄悄埋伏', w: 0.8 }],
      water: [{ scene: 'sea', spot: 'coral' }],
      fun: [{ scene: 'sea', spot: 'clam', kind: 'watch', label: '在大砗磲边挑贝壳', w: 1.2 }, { scene: 'sea', spot: 'kelp', kind: 'zoom', label: '在海带林里喷水冲刺', w: 0.9 }, { scene: 'sea', spot: 'octopus_home', kind: 'groom', label: '在沉船门口整理收藏', w: 0.8 }],
    },
  });
  // ---- 新伙伴们 ----
  // open：睡在露天（不进屋），回“家”就是走到家门口那块地方趴下睡
  const F = (scene, spot, kind, label, w, x) => Object.assign({ scene, spot, kind, label, w }, x || {});
  const W = (scene, spot) => ({ scene, spot });
  const COLDOK = { cold: -40, heat: 30 }, HOTOK = { cold: 5, heat: 99 };
  Object.assign(HAB, {
    polarbear: Object.assign({ home: 'snow', snowLover: 1, about: '住在雪坡里挖出来的冰洞。白天在冰窟窿边一坐就是半天等鱼，吃饱了在雪地里打滚。最不怕冷，暴风雪的时候才回冰洞。', likes: '鱼 · 雪地打滚 · 冰水', hates: '热 · 打雷', diet: '鱼、海豹（嘘）',
      avoid: { storm: 0.8, heavysnow: 0.4 }, foods: [F('snow', 'icehole', 'fish', '守在冰窟窿边等鱼', 1.6)], water: [W('snow', 'pond')],
      fun: [F('snow', 'snowfield', 'roll', '在雪地里打滚', 1.2), F('snow', 'slideend', 'nap', '趴在雪坡下晒太阳', 0.8, { when: 'sunny' })] }, COLDOK),
    arcticfox: Object.assign({ home: 'snow', snowLover: 1, about: '住在雪地里的小洞。跟在北极熊后面捡剩下的鱼吃，自己也会竖起耳朵听雪下面的旅鼠，然后一头扎进去。', likes: '跟着北极熊 · 扎雪堆', hates: '暴风雪', diet: '旅鼠、剩鱼、浆果',
      avoid: { storm: 1, heavysnow: 0.7 }, foods: [F('snow', 'snowfield', 'hunt', '一头扎进雪里抓旅鼠', 1.4), F('snow', 'icehole', 'sniff', '在冰窟窿边捡北极熊吃剩的鱼', 0.8)], water: [W('snow', 'pond')],
      fun: [F('snow', 'slidetop', 'slide', '从雪坡上滑下来', 0.8), F('snow', 'polarbear_home', 'follow', '悄悄跟在北极熊后面', 0.7)] }, COLDOK),
    yak: Object.assign({ home: 'mountain', snowLover: 1, about: '住在高山上石头垒的牛圈。白天在高山草甸慢慢吃草，下雪也照样出门，长毛拖到地上。去溪边喝水，傍晚自己回圈。', likes: '高山草 · 冷天 · 溪水', hates: '热', diet: '高山草、苔藓',
      avoid: { storm: 0.7 }, foods: [F('mountain', 'meadow', 'graze', '在高山草甸上吃草', 1.6), F('mountain', 'pasture', 'graze', '在山坡上啃苔藓', 0.8)], water: [W('mountain', 'stream')],
      fun: [F('mountain', 'cairn', 'groom', '在石堆边蹭痒痒', 0.8), F('snow', 'snowfield', 'waddle', '去雪原散步', 0.4, { season: ['winter'] })] }, COLDOK),
    alpaca: { home: 'mountain', about: '住在山脚的小木棚里。喜欢和大家挤在一起吃草，走到哪儿都要歪头看看。生气了会吐口水，但不会对你吐。', likes: '嫩草 · 挤在一起 · 好奇', hates: '大雨 · 被吓到', diet: '草、干草',
      avoid: { rain: 0.6, heavyrain: 1, storm: 1, heavysnow: 0.8 }, cold: -15, heat: 30, foods: [F('mountain', 'pasture', 'graze', '在山坡上吃草', 1.4), F('mountain', 'meadow', 'graze', '在草甸上啃小花', 0.8)], water: [W('mountain', 'stream')],
      fun: [F('mountain', 'cairn', 'watch', '歪着头盯着石堆看', 0.8), F('mountain', 'yak_home', 'follow', '跟在牦牛后面走', 0.7), F('meadow', 'grass', 'zoom', '去草地上撒欢', 0.5, { season: ['spring', 'summer'] })] },
    snowleopard: Object.assign({ home: 'mountain', snowLover: 1, about: '住在岩壁上的山洞。黄昏出来在岩壁之间跳，趴在高处看整座山。很怕生，有动静就躲回洞里。睡觉时用大尾巴盖住鼻子。', likes: '高处 · 安静 · 黄昏', hates: '吵闹 · 被盯着', diet: '岩羊（远远看着就好）',
      avoid: { storm: 0.8 }, foods: [F('mountain', 'ledge', 'hunt', '趴在岩壁上盯着猎物', 1.3), F('mountain', 'cairn', 'hunt', '在石堆后面埋伏', 0.8)], water: [W('mountain', 'stream')],
      fun: [F('mountain', 'ledge', 'perch', '蹲在岩壁顶上看风景', 1.4), F('snow', 'snowfield', 'patrol', '去雪原巡视', 0.4, { when: 'snowy' })] }, COLDOK),
    deer: { home: 'forest', open: 1, about: '睡在森林灌木丛里压出来的草窝，不进洞。早晚出来吃嫩叶和浆果，去小溪边喝水。耳朵一直在转，有一点动静就竖起尾巴跑。', likes: '嫩叶 · 浆果 · 清晨', hates: '大雨 · 狐狸靠太近', diet: '嫩叶、浆果、橡果',
      avoid: { heavyrain: 0.8, storm: 1 }, cold: -20, heat: 32, foods: [F('forest', 'berries2', 'berries', '在灌木边啃嫩叶和浆果', 1.3), F('meadow', 'clover', 'graze', '到草地上吃三叶草', 0.8, { season: ['spring', 'summer'] }), F('forest', 'leaves', 'forage', '在落叶里找橡果', 0.9, { season: ['autumn', 'winter'] })], water: [W('forest', 'brook')],
      fun: [F('forest', 'shade', 'nap', '在树荫下歇着', 1), F('forest', 'brook', 'watch', '在溪边看水', 0.6)] },
    tiger: Object.assign({ home: 'jungle', open: 1, about: '睡在雨林大树的板根之间，不住洞。很喜欢水：天热就去河里泡着。傍晚悄悄在蕨丛里埋伏，晚上在大树下磨爪子。', likes: '泡水 · 埋伏 · 大树', hates: '被打扰', diet: '野猪、鹿（远远地）',
      avoid: { storm: 0.6 }, foods: [F('jungle', 'ferns', 'hunt', '在蕨丛里悄悄埋伏', 1.4)], water: [W('jungle', 'river')],
      fun: [F('jungle', 'river', 'swim', '在河里泡澡', 1.4), F('jungle', 'bigtree', 'knead', '在大树上磨爪子', 0.8), F('jungle', 'tiger_home', 'groom', '舔爪子洗脸', 0.7)] }, HOTOK),
    monkey: Object.assign({ home: 'jungle', about: '住在大树上的树屋里。白天一刻不停：在树之间荡、摘果子、给同伴理毛、去河边捞东西。下大雨才回树屋。', likes: '香蕉 · 荡秋千 · 热闹', hates: '下大雨 · 无聊', diet: '香蕉、果子、嫩叶',
      avoid: { heavyrain: 1, storm: 1 }, foods: [F('jungle', 'flowers', 'berries', '在树上摘果子', 1.4), F('jungle', 'treehouse', 'berries', '坐在树屋门口剥香蕉', 1)], water: [W('jungle', 'river')],
      fun: [F('jungle', 'treehouse', 'perch', '在树屋边荡来荡去', 1.2), F('jungle', 'river', 'splash', '在河边捞东西', 0.8), F('jungle', 'parrot_home', 'visit', '去找鹦鹉聊天', 0.5)] }, HOTOK),
    parrot: Object.assign({ home: 'jungle', about: '住在大树上的树洞里。天一亮就开始叫，嗑坚果、学别的动物说话，飞到河边喝水。最喜欢热闹的地方。', likes: '坚果 · 学说话 · 热闹', hates: '暴雨 · 安静太久', diet: '坚果、种子、果子',
      avoid: { heavyrain: 0.8, storm: 1 }, foods: [F('jungle', 'flowers', 'peck', '在花丛里啄种子', 1.3), F('jungle', 'bigtree', 'peck', '在大树下嗑坚果', 1)], water: [W('jungle', 'river')],
      fun: [F('jungle', 'parrot_home', 'perch', '站在树洞口唱歌', 1.2), F('jungle', 'treehouse', 'perch', '飞到树屋顶上学猴子叫', 0.8)] }, HOTOK),
    sheep: { home: 'meadow', open: 1, about: '睡在草地边的羊圈里，晚上挤成一团。白天跟着大家在草地上吃草，谁走它就跟着走。', likes: '嫩草 · 挤在一起 · 跟着走', hates: '大雨 · 被落下', diet: '草、三叶草',
      avoid: { heavyrain: 0.8, storm: 1, heavysnow: 0.7 }, cold: -20, heat: 30, foods: [F('meadow', 'grass', 'graze', '在草地上低头吃草', 1.4), F('meadow', 'clover', 'graze', '在三叶草地吃草', 1)], water: [W('meadow', 'puddle')],
      fun: [F('meadow', 'hill', 'nap', '在大树下躺着反刍', 1), F('meadow', 'rabbit_home', 'follow', '跟着兔子走', 0.5)] },
    cow: { home: 'farm', about: '住在农场的牛棚里。白天在牧场慢悠悠地吃草，然后躺下来反刍，去水槽喝水。嚼东西能嚼一整天。', likes: '嫩草 · 晒太阳 · 慢慢来', hates: '被催 · 打雷', diet: '草、干草',
      avoid: { heavyrain: 0.7, storm: 1, heavysnow: 0.7 }, cold: -15, heat: 32, foods: [F('farm', 'pasture', 'graze', '在牧场慢悠悠地吃草', 1.6), F('farm', 'hay', 'eat', '在草垛边嚼干草', 1, { season: ['winter'] })], water: [W('farm', 'trough')],
      fun: [F('farm', 'pasture', 'nap', '躺着反刍', 1.2), F('meadow', 'grass', 'graze', '去草地散步吃草', 0.5, { season: ['spring', 'summer'] })] },
    lion: Object.assign({ home: 'savanna', open: 1, about: '睡在草原的大石台上——一天能睡二十个小时。傍晚醒来去水塘喝水，在草丛里巡视领地，偶尔吼一声。', likes: '睡觉 · 晒太阳 · 大石头', hates: '被吵醒', diet: '斑马、羚羊（远远看着就好）',
      avoid: { storm: 0.6 }, foods: [F('savanna', 'grass', 'hunt', '在草丛里埋伏', 1.2), F('savanna', 'plain', 'hunt', '盯着远处的斑马', 0.8)], water: [W('savanna', 'waterhole')],
      fun: [F('savanna', 'lion_home', 'nap', '趴在大石台上晒太阳', 1.6), F('savanna', 'acacia', 'nap', '在金合欢树下打盹', 1), F('savanna', 'grass', 'patrol', '在草原上巡视领地', 0.8)] }, HOTOK),
    zebra: Object.assign({ home: 'savanna', open: 1, about: '晚上就站在金合欢树下睡。白天在草原上吃草，去水塘喝水，喜欢和羚羊混在一起，有人放哨就安心。', likes: '嫩草 · 一大群 · 水塘', hates: '狮子 · 打雷', diet: '草',
      avoid: { storm: 0.8 }, foods: [F('savanna', 'plain', 'graze', '在草原上低头吃草', 1.5), F('savanna', 'grass', 'graze', '在草丛边吃草', 1)], water: [W('savanna', 'waterhole')],
      fun: [F('savanna', 'antelope_home', 'follow', '和羚羊一起走', 0.7), F('savanna', 'acacia', 'groom', '在树下互相蹭痒', 0.6), F('savanna', 'plain', 'zoom', '在草原上跑一圈', 0.6)] }, HOTOK),
    antelope: Object.assign({ home: 'savanna', open: 1, about: '睡在高草丛里，只露出两只角。白天吃草、喝水，一有动静就蹦着跑，能跳很高。', likes: '嫩草 · 奔跑 · 高草丛', hates: '狮子 · 被追', diet: '草、嫩叶',
      avoid: { storm: 0.8 }, foods: [F('savanna', 'grass', 'graze', '在草丛里吃嫩草', 1.4), F('savanna', 'acacia', 'graze', '踮脚吃金合欢的叶子', 0.8)], water: [W('savanna', 'waterhole')],
      fun: [F('savanna', 'plain', 'binky', '在草原上弹跳', 1), F('savanna', 'zebra_home', 'follow', '跟着斑马走', 0.6)] }, HOTOK),
    hippo: Object.assign({ home: 'savanna', open: 1, about: '住在草原的水塘里：白天泡在水里只露眼睛和鼻子，晚上上岸吃草。会张大嘴打个超大的哈欠。', likes: '泡水 · 晚上吃草 · 打哈欠', hates: '太阳晒 · 被打扰', diet: '草',
      avoid: {}, foods: [F('savanna', 'grass', 'graze', '晚上上岸吃草', 1.4)], water: [W('savanna', 'waterhole')],
      fun: [F('savanna', 'hippo_home', 'soak', '泡在水塘里只露鼻子', 2), F('savanna', 'waterhole', 'wallow', '在塘边打滚', 0.6)] }, HOTOK),
    camel: Object.assign({ home: 'desert', open: 1, about: '睡在绿洲边的帐篷旁。白天慢悠悠地在沙漠里走，嚼仙人掌，去绿洲喝一大肚子水。一点也不怕热。', likes: '绿洲 · 慢慢走 · 仙人掌', hates: '冷 · 下雨', diet: '仙人掌、干草',
      avoid: { rain: 0.6 }, foods: [F('desert', 'cactus', 'graze', '嚼仙人掌', 1.3), F('desert', 'oasis', 'graze', '在绿洲边吃草', 1)], water: [W('desert', 'oasis')],
      fun: [F('desert', 'dunes', 'waddle', '在沙丘上慢慢走', 1), F('desert', 'camel_home', 'nap', '趴在帐篷边的阴凉里', 0.8)] }, HOTOK),
    fennec: Object.assign({ home: 'desert', about: '住在沙丘下的洞里。白天太热就在洞里睡，夜里出来竖起大耳朵听沙子下面的虫子，再一口刨出来。跳得特别高。', likes: '夜晚 · 虫子 · 跳', hates: '中午的太阳', diet: '虫子、浆果、小蜥蜴',
      avoid: { windy: 0.6 }, foods: [F('desert', 'dunes', 'dig', '竖着耳朵刨沙子找虫', 1.4), F('desert', 'cactus', 'berries', '吃仙人掌的果子', 0.8)], water: [W('desert', 'oasis')],
      fun: [F('desert', 'dunes', 'pounce', '在沙丘上跳来跳去', 1), F('desert', 'meerkat_home', 'visit', '去找狐獴玩', 0.5)] }, HOTOK),
    meerkat: Object.assign({ home: 'desert', about: '住在沙地下四通八达的地道里。早上先在洞口站成一排晒太阳，然后出去刨虫子吃，总有一只站岗放哨。', likes: '晒太阳 · 放哨 · 挖洞', hates: '老鹰 · 冷', diet: '虫子、蝎子（小心）',
      avoid: { windy: 0.6, rain: 0.8 }, foods: [F('desert', 'rocks', 'dig', '在石头边刨虫子', 1.4), F('desert', 'dunes', 'dig', '在沙丘上挖洞', 1)], water: [W('desert', 'oasis')],
      fun: [F('desert', 'meerkat_home', 'watch', '站起来放哨', 1.5), F('desert', 'rocks', 'perch', '趴在石头上晒太阳', 0.8, { when: 'sunny' })] }, HOTOK),
    seagull: Object.assign({ home: 'beach', sea: true, about: '住在海边木桩顶上的草窝。在浪花边找小鱼小虾，站在漂流木上发呆，看到谁手里有吃的就凑过去。', likes: '鱼 · 风 · 抢吃的', hates: '暴风雨', diet: '鱼、虾、薯条（嘘）',
      avoid: { storm: 1 }, foods: [F('beach', 'waves', 'peck', '在浪花边啄小鱼', 1.4), F('beach', 'tidepool', 'peck', '在潮池里找小虾', 1)], water: [W('beach', 'tidepool')],
      fun: [F('beach', 'seagull_home', 'perch', '站在木桩上吹风', 1.2), F('beach', 'driftwood', 'watch', '站在漂流木上发呆', 0.8)] }, HOTOK, { cold: -10 }),
    seal: Object.assign({ home: 'beach', sea: true, open: 1, about: '睡在海滩的礁石上。白天趴着晒太阳翻个身，饿了就下海抓鱼，游完再爬回礁石，拍拍肚子。', likes: '晒太阳 · 鱼 · 拍肚子', hates: '被打扰', diet: '鱼、乌贼',
      avoid: {}, foods: [F('beach', 'waves', 'fish', '在浪里抓鱼', 1.3), F('sea', 'kelp', 'hunt', '下海在海带林里抓鱼', 0.8)], water: [W('beach', 'waves')],
      fun: [F('beach', 'seal_home', 'nap', '趴在礁石上晒太阳', 1.6), F('beach', 'sand', 'roll', '在沙滩上翻身', 0.6)] }, { cold: -30, heat: 34 }),
    gardeneel: { home: 'sea', sea: true, open: 1, about: '一大群住在海底沙地的小洞里，从不离开家。整天把身子从洞里探出来，随着水流摇摆，吃漂过来的浮游生物；一有动静就缩回去。', likes: '水流 · 一大群 · 安静', hates: '被盯着看', diet: '浮游生物',
      avoid: {}, cold: -99, heat: 99, foods: [F('sea', 'gardeneel_home', 'forage', '探出身子吃漂过来的浮游生物', 2)], water: [W('sea', 'gardeneel_home')],
      fun: [F('sea', 'gardeneel_home', 'watch', '随着水流摇摆', 1.6)] },
    shark: { home: 'sea', sea: true, open: 1, about: '在礁石洞边睡觉（其实是慢慢游着睡）。傍晚出来巡游，绕着沉船和珊瑚转圈，是个爱巡游的老实人。', likes: '巡游 · 黄昏 · 沉船', hates: '被说凶', diet: '小鱼',
      avoid: {}, cold: -99, heat: 99, foods: [F('sea', 'coral', 'hunt', '在珊瑚边找小鱼', 1.2), F('sea', 'kelp', 'hunt', '在海带林里巡游找吃的', 1)], water: [W('sea', 'coral')],
      fun: [F('sea', 'octopus_home', 'patrol', '绕着沉船转圈', 1.2), F('sea', 'sandflat', 'patrol', '在沙地上空巡游', 1)] },
  });
  // 一年四季各自的事（叠加到上面的日常里）
  const SEASONAL = {
    cat: { spring: [{ scene: 'meadow', spot: 'flowers', kind: 'pounce', label: '春天在花丛里扑蝴蝶', w: 1 }], summer: [{ scene: 'forest', spot: 'shade', kind: 'nap', label: '夏天躲到树荫下打盹', w: 1 }], autumn: [{ scene: 'forest', spot: 'leaves', kind: 'pounce', label: '秋天扑满地的落叶', w: 1 }], winter: [{ scene: 'farm', spot: 'hay', kind: 'knead', label: '冬天钻进干草堆取暖', w: 1.2 }] },
    dog: { spring: [{ scene: 'meadow', spot: 'flowers', kind: 'sniff', label: '春天到处闻花', w: 0.8 }], summer: [{ scene: 'beach', spot: 'waves', kind: 'splash', label: '夏天跑去海边追浪花', w: 1 }], autumn: [{ scene: 'forest', spot: 'leaves', kind: 'zoom', label: '秋天在落叶堆里疯跑', w: 1 }], winter: [{ scene: 'snow', spot: 'snowfield', kind: 'roll', label: '冬天去雪原打滚', w: 0.8 }] },
    rabbit: { spring: [{ scene: 'meadow', spot: 'rabbit_home', kind: 'dig', label: '春天给洞里挖个新房间', w: 1 }], summer: [{ scene: 'forest', spot: 'shade', kind: 'nap', label: '夏天躲到树荫下乘凉', w: 0.8 }], autumn: [{ scene: 'farm', spot: 'veg', kind: 'graze', label: '秋天去菜园偷胡萝卜', w: 1 }], winter: [{ scene: 'meadow', spot: 'rabbit_home', kind: 'groom', label: '冬天在洞口晒一会儿太阳', w: 0.6, when: 'sunny' }] },
    hamster: { spring: [{ scene: 'meadow', spot: 'grass', kind: 'zoom', label: '春天在草地上跑圈', w: 0.8 }], summer: [{ scene: 'meadow', spot: 'sunflowers', kind: 'seeds', label: '夏天在向日葵下等瓜子掉下来', w: 1 }], autumn: [{ scene: 'meadow', spot: 'sunflowers', kind: 'seeds', label: '秋收！拼命往洞里囤瓜子', w: 2 }], winter: [] },
    penguin: { spring: [{ scene: 'snow', spot: 'pond', kind: 'waddle', label: '春天排着队散步', w: 0.8 }], summer: [{ scene: 'snow', spot: 'icehole', kind: 'dive', label: '夏天一个猛子扎进冰水里', w: 1 }], autumn: [{ scene: 'snow', spot: 'snowfield', kind: 'groom', label: '秋天换毛，到处是绒毛', w: 0.8 }], winter: [{ scene: 'snow', spot: 'slidetop', kind: 'slide', label: '冬天滑雪坡滑到停不下来', w: 2 }] },
    fox: { spring: [{ scene: 'meadow', spot: 'flowers', kind: 'pounce', label: '春天在花丛里扑蝴蝶', w: 0.9 }], summer: [{ scene: 'mountain', spot: 'meadow', kind: 'patrol', label: '夏天去高山草甸巡视', w: 0.8 }], autumn: [{ scene: 'forest', spot: 'berries', kind: 'berries', label: '秋天摘浆果养膘', w: 1.4 }], winter: [{ scene: 'snow', spot: 'snowfield', kind: 'hunt', label: '冬天一头扎进雪堆抓老鼠', w: 1 }] },
    frog: { spring: [{ scene: 'lake', spot: 'frog_home', kind: 'croak', label: '春天开演唱会，呱呱个不停', w: 2 }], summer: [{ scene: 'jungle', spot: 'river', kind: 'swim', label: '夏天去雨林的河里玩', w: 0.6 }], autumn: [{ scene: 'lake', spot: 'lily', kind: 'nap', label: '秋天在荷叶上养膘准备冬眠', w: 1 }], winter: [] },
    chick: { spring: [{ scene: 'meadow', spot: 'grass', kind: 'follow', label: '春天跟着大家去草地散步', w: 1 }], summer: [{ scene: 'farm', spot: 'yard', kind: 'dust', label: '夏天洗沙浴降温', w: 1 }], autumn: [{ scene: 'farm', spot: 'apple', kind: 'peck', label: '秋天在苹果树下找虫子', w: 1 }], winter: [{ scene: 'farm', spot: 'hay', kind: 'nap', label: '冬天挤在干草堆边取暖', w: 0.8 }] },
    duck: { spring: [{ scene: 'lake', spot: 'swim', kind: 'swim', label: '春天在湖上排队游', w: 1, noIce: 1 }], summer: [{ scene: 'beach', spot: 'waves', kind: 'splash', label: '夏天去海边玩浪', w: 0.9 }], autumn: [{ scene: 'lake', spot: 'reeds', kind: 'groom', label: '秋天换上新羽毛，仔细打理', w: 1 }], winter: [{ scene: 'farm', spot: 'trough', kind: 'peck', label: '冬天去农场水槽边蹭吃的', w: 0.8 }] },
    pig: { spring: [{ scene: 'meadow', spot: 'grass', kind: 'root', label: '春天在草地上拱嫩芽', w: 0.8 }], summer: [{ scene: 'farm', spot: 'mud', kind: 'wallow', label: '夏天整天泡在泥坑里', w: 2 }], autumn: [{ scene: 'forest', spot: 'mushrooms', kind: 'root', label: '秋天进森林拱松露', w: 1.4 }], winter: [{ scene: 'farm', spot: 'hay', kind: 'nap', label: '冬天钻进干草堆睡觉', w: 1 }] },
    capybara: { spring: [{ scene: 'lake', spot: 'shore', kind: 'graze', label: '春天在岸边吃新长的草', w: 1 }], summer: [{ scene: 'jungle', spot: 'river', kind: 'swim', label: '夏天去雨林的河里泡澡', w: 1 }], autumn: [{ scene: 'meadow', spot: 'clover', kind: 'nap', label: '秋天在草地上晒太阳发呆', w: 0.8 }], winter: [{ scene: 'lake', spot: 'capybara_home', kind: 'soak', label: '冬天顶着柚子泡温泉', w: 3 }] },
    hedgehog: { spring: [{ scene: 'meadow', spot: 'grass', kind: 'forage', label: '春天刚睡醒，到草地上找虫子', w: 1.2 }], summer: [{ scene: 'forest', spot: 'mushrooms', kind: 'forage', label: '夏天夜里在蘑菇边找蜗牛', w: 0.9 }], autumn: [{ scene: 'forest', spot: 'leaves', kind: 'forage', label: '秋天拼命吃，准备冬眠', w: 2 }], winter: [] },
    dragon: { spring: [{ scene: 'jungle', spot: 'bigtree', kind: 'watch', label: '春天去雨林探险', w: 1 }], summer: [{ scene: 'desert', spot: 'dunes', kind: 'nap', label: '夏天去沙漠晒个够', w: 1 }], autumn: [{ scene: 'mountain', spot: 'ledge', kind: 'perch', label: '秋天站在高山岩壁上看风景', w: 1 }], winter: [{ scene: 'mountain', spot: 'cairn', kind: 'patrol', label: '冬天去高山找发光的石头', w: 0.8 }] },
    turtle: { spring: [{ scene: 'sea', spot: 'seagrass', kind: 'graze', label: '春天海草最嫩，吃个够', w: 1.2 }], summer: [{ scene: 'beach', spot: 'sand', kind: 'dig', label: '夏天爬上海滩，在沙里挖坑下蛋', w: 1.4 }], autumn: [{ scene: 'sea', spot: 'kelp', kind: 'waddle', label: '秋天跟着洋流在海带林里漂', w: 1 }], winter: [{ scene: 'sea', spot: 'turtle_home', kind: 'nap', label: '冬天水冷，窝在海草里慢慢睡', w: 1.2 }] },
    crab: { spring: [{ scene: 'beach', spot: 'tidepool', kind: 'peck', label: '春天退潮去潮池找吃的', w: 1 }], summer: [{ scene: 'beach', spot: 'sand', kind: 'dig', label: '夏夜在沙滩上挖洞', w: 1.2 }], autumn: [{ scene: 'sea', spot: 'clam', kind: 'watch', label: '秋天换壳，找个新贝壳试试', w: 1 }], winter: [{ scene: 'sea', spot: 'coral', kind: 'sniff', label: '冬天躲在珊瑚缝里', w: 0.8 }] },
    octopus: { spring: [{ scene: 'sea', spot: 'clam', kind: 'watch', label: '春天收集新贝壳装饰家门', w: 1.2 }], summer: [{ scene: 'sea', spot: 'coral', kind: 'forage', label: '夏天在珊瑚丛里抓小虾', w: 1 }], autumn: [{ scene: 'sea', spot: 'kelp', kind: 'zoom', label: '秋天在海带林里玩捉迷藏', w: 1 }], winter: [{ scene: 'sea', spot: 'octopus_home', kind: 'groom', label: '冬天待在罐子里整理收藏', w: 1 }] },
  };
  Object.assign(SEASONAL, {
    polarbear: { winter: [F('snow', 'snowfield', 'roll', '冬天在新雪里打滚', 1.4)], summer: [F('snow', 'icehole', 'swim', '夏天在冰水里游泳', 1)] },
    arcticfox: { winter: [F('snow', 'snowfield', 'hunt', '冬天换上白毛，在雪里抓旅鼠', 1.2)], summer: [F('mountain', 'meadow', 'sniff', '夏天换上灰毛，去高山草甸找吃的', 0.8)] },
    yak: { winter: [F('mountain', 'meadow', 'graze', '冬天刨开雪吃下面的草', 1.2)], summer: [F('mountain', 'stream', 'splash', '夏天在溪水里凉快', 0.8)] },
    alpaca: { spring: [F('mountain', 'pasture', 'groom', '春天剪毛，变得瘦瘦的', 1)], winter: [F('mountain', 'alpaca_home', 'nap', '冬天在木棚里挤在一起', 1)] },
    snowleopard: { winter: [F('mountain', 'ledge', 'perch', '冬天在雪中的岩壁上一动不动', 1.2)] },
    deer: { spring: [F('meadow', 'clover', 'graze', '春天带着小鹿吃三叶草', 1)], autumn: [F('forest', 'leaves', 'forage', '秋天在落叶里找橡果', 1.4)] },
    tiger: { summer: [F('jungle', 'river', 'swim', '夏天整天泡在河里', 1.6)] },
    monkey: { summer: [F('jungle', 'flowers', 'berries', '夏天果子熟了，吃个够', 1.4)] },
    parrot: { spring: [F('jungle', 'parrot_home', 'perch', '春天在树洞口唱求偶歌', 1.2)] },
    sheep: { spring: [F('meadow', 'grass', 'groom', '春天剪完毛，凉快多了', 1)], winter: [F('farm', 'hay', 'eat', '冬天去农场吃干草', 1)] },
    cow: { summer: [F('farm', 'mud', 'nap', '夏天躺在树荫下反刍', 0.8)], winter: [F('farm', 'cow_home', 'eat', '冬天在牛棚里嚼干草', 1.2)] },
    lion: { summer: [F('savanna', 'acacia', 'nap', '雨季在树荫下睡一整天', 1.2)] },
    zebra: { autumn: [F('savanna', 'plain', 'waddle', '旱季跟着大家去找水草', 1.2)] },
    antelope: { spring: [F('savanna', 'plain', 'binky', '雨季草长起来了，到处蹦', 1.2)] },
    hippo: { summer: [F('savanna', 'hippo_home', 'soak', '夏天整天泡在水塘里', 1.6)] },
    camel: { summer: [F('desert', 'oasis', 'drink', '夏天一口气喝一大桶水', 1)] },
    fennec: { winter: [F('desert', 'fennec_home', 'nap', '沙漠的冬夜很冷，窝在洞里', 1)] },
    meerkat: { winter: [F('desert', 'meerkat_home', 'watch', '冬天早上在洞口排队晒太阳', 1.4)] },
    seagull: { summer: [F('beach', 'waves', 'peck', '夏天跟着游客抢吃的', 1.2)] },
    seal: { winter: [F('snow', 'icehole', 'swim', '冬天去雪原的冰窟窿游泳', 0.6)] },
    gardeneel: {},
    shark: { summer: [F('sea', 'clam', 'patrol', '夏天在砗磲边巡游', 1)] },
  });
  PP.HAB = HAB; PP.SEASONAL = SEASONAL;

  // 不同动作的时长（秒，游戏时间）和效果
  const KIND = {
    eat: { d: [8, 14], hunger: 50 }, graze: { d: [14, 30], hunger: 45 }, fish: { d: [14, 26], hunger: 50 }, hunt: { d: [8, 16], hunger: 30, fun: 10 },
    peck: { d: [10, 20], hunger: 30 }, root: { d: [10, 18], hunger: 40, fun: 8 }, forage: { d: [14, 26], hunger: 40 }, berries: { d: [10, 18], hunger: 40 },
    seeds: { d: [12, 20], hunger: 35 }, tongue: { d: [12, 22], hunger: 40 }, dive: { d: [12, 20], hunger: 55, fun: 6 }, dabble: { d: [14, 26], hunger: 45, fun: 8 },
    drink: { d: [4, 7], thirst: 100 }, swim: { d: [20, 40], fun: 22 }, soak: { d: [40, 90], fun: 30, battery: 30 }, wallow: { d: [20, 40], fun: 30 },
    perch: { d: [25, 60], fun: 18, energy: 6 }, watch: { d: [20, 40], fun: 18 }, knead: { d: [8, 14], fun: 15 }, pounce: { d: [10, 18], fun: 22 },
    slide: { d: [12, 20], fun: 30 }, dig: { d: [8, 14], fun: 16 }, croak: { d: [12, 24], fun: 18 }, patrol: { d: [14, 26], fun: 15 },
    binky: { d: [6, 10], fun: 25 }, dust: { d: [8, 14], fun: 15 }, zoom: { d: [6, 12], fun: 26 }, sniff: { d: [12, 22], fun: 12 },
    roll: { d: [8, 14], fun: 25 }, nap: { d: [30, 70], energy: 25 }, groom: { d: [6, 12], fun: 6 }, waddle: { d: [12, 20], fun: 12 },
    follow: { d: [12, 20], social: 15 }, splash: { d: [8, 14], fun: 20 }, visit: { d: [20, 40], social: 30, fun: 10 },
  };

  // ---------- 小工具 ----------
  const S = () => G.save.settings;
  const on = () => !!(G.save && S().mode !== 'mini');
  const view = () => (PP.scene && PP.scene.view()) || 'forest';
  const ROUTE = () => PP.ROUTE;
  const hops = (a, b) => Math.abs(ROUTE().indexOf(a) - ROUTE().indexOf(b));
  const nextHop = (a, b) => { const r = ROUTE(), i = r.indexOf(a), j = r.indexOf(b); return r[i + Math.sign(j - i)] || b; };
  const homeScene = (p) => (HAB[p.d.species] || HAB.cat).home;
  const env = (sc) => (sc ? PP.env.at(sc) : PP.env.get());
  const lay = () => (PP.scene && PP.scene.layout()) || null;
  const iceNow = (e) => (e || env()).season === 'winter';
  const sunny = (e) => ['clear', 'partly'].includes(e.weather.kind) && e.time.phase === 'day';
  const wet = (e) => ['drizzle', 'rain', 'heavyrain', 'storm'].includes(e.weather.kind) || e.fx.rain > 0;
  const snowy = (e) => ['snow', 'heavysnow'].includes(e.weather.kind) || e.season === 'winter';
  const COND = { sunny, wet, snowy };
  PP.eco = {};

  // ---------- 天气、冬眠 ----------
  function hibernating(p, e) {
    const h = HAB[p.d.species];
    return !!(h.hibernate && e.season === 'winter' && (e.weather.temp == null || e.weather.temp < 10));
  }
  // 返回“为什么不想出门”，没有就是 null
  function weatherBad(p, e) {
    const h = HAB[p.d.species], k = e.weather.kind, t = e.weather.temp;
    const v = (h.avoid || {})[k] || 0;
    // 胆子大的偶尔也会冒雨出门；胆小的更容易躲着
    const brave = (1 - p.tr.timid) * 0.25;
    if (v - brave >= 0.5) return PP.env.weatherName(k);
    if (e.fx.wind >= 3 && (h.avoid || {}).windy) return '风太大了';
    if (t != null && t < (h.cold != null ? h.cold : 0) && !h.snowLover) return '太冷了';
    if (t != null && t > (h.heat || 99) && e.time.phase === 'day') return '太热了';
    return null;
  }

  // ---------- 计划：现在该干嘛 ----------
  function plan(p) {
    const sp = p.d.species, h = HAB[sp] || HAB.cat, e = env(p.d.scene || h.home), n = p.n, season = e.realSeason || e.season;
    // 睡露天的（斑马、狮子、鲨鱼…）：回“家”就是在家门口那块地方趴下 / 泡着 / 站着睡，一直看得见
    const home = (why, label, dur) => (h.open && why !== 'hibernate'
      ? { scene: h.home, spot: sp + '_home', kind: sp === 'hippo' ? 'soak' : sp === 'gardeneel' ? 'watch' : 'nap', why, rest: true, label: label.replace('在家里睡觉', '在家门口睡觉').replace('回家睡个午觉', '在老地方打个盹').replace('躲在家里', '找个地方躲着'), dur }
      : { home: true, scene: h.home, spot: sp + '_home', why, label, dur });
    if (hibernating(p, e)) return home('hibernate', '在冬眠，要睡到春天', 300);
    if (PP.sleepTime && PP.sleepTime()) return home('sleep', '睡眠时间，在家里睡觉', U.rand(120, 240));
    const sleepy = p.sleepiness();
    if (sleepy > 0.62 || n.energy < 18) return home('sleep', e.time.phase === 'night' ? '在家里睡觉' : '回家睡个午觉', U.rand(90, 200));
    const bad = weatherBad(p, e);
    if (bad && !(h.rainLover && wet(e) && bad !== '太冷了' && e.weather.kind !== 'storm')) return home('shelter', `${bad}，躲在家里`, U.rand(60, 120));
    const here = p.d.scene || h.home;
    const cands = [];
    const ok = (o) => (o.scene !== 'sea' || h.sea) && (!h.sea || o.scene === 'sea' || o.scene === 'beach') && (!o.season || o.season.includes(season)) && (!o.when || COND[o.when](e)) && !(o.noIce && iceNow(e)) && (o.scene === 'snow' ? h.home === 'snow' || snowy(e) || sp === 'dog' || sp === 'fox' : true);
    const far = (o) => 1 / (1 + hops(here, o.scene) * 0.8 + (o.scene !== h.home ? 0.3 : 0));
    const push = (o, kind, wgt, label) => cands.push([{ scene: o.scene, spot: o.spot, kind, label, dur: U.rand(...(KIND[kind] || KIND.groom).d) }, wgt]);
    // 饿了：去觅食（越饿越想去远一点的好地方）
    if (n.hunger < 62) for (const f of h.foods) if (ok(f)) push(f, f.kind, Math.pow((62 - n.hunger) / 62, 0.7) * 2.6 * (f.w || 1) * Math.sqrt(far(f)), f.label);
    if (h.stash && n.hunger < 40 && p.d.stash > 0 && !cands.length) return home('eatStash', '回洞里吃存粮', 30);
    if (n.thirst < 58) for (const f of h.water) if (ok(f)) push(f, 'drink', ((58 - n.thirst) / 58) * 2.4 * far(f), '去喝水');
    // 玩
    const funNeed = 0.45 + (100 - n.fun) / 100;
    for (const f of h.fun) if (ok(f)) push(f, f.kind, funNeed * (f.w || 1) * far(f) * (0.6 + p.tr.playful * 0.6), f.label);
    for (const f of ((SEASONAL[sp] || {})[season] || [])) if (ok(f)) push(f, f.kind, (0.5 + funNeed * 0.6) * (f.w || 1) * far(f), f.label);
    // 串门：去找好朋友
    const livable = (sc) => (sc === 'sea' ? !!h.sea : !h.sea || sc === 'beach') && (sc !== 'snow' || h.home === 'snow' || ((sp === 'dog' || sp === 'fox') && snowy(e)));
    const friend = G.all.filter((o) => o !== p && !o.d.hidden && !o.d.inHome && o.d.scene && livable(o.d.scene) && p.relWith(o) > 58 && hops(here, o.d.scene) <= 1).sort((a, b) => p.relWith(b) - p.relWith(a))[0];
    if (friend && n.social < 80) cands.push([{ scene: friend.d.scene, kind: 'visit', friend: friend.d.id, label: `去找${friend.name}玩`, dur: U.rand(20, 40) }, (0.3 + p.tr.extro * 0.6) * ((100 - n.social) / 100) * 1.4]);
    // 回家歇会儿
    cands.push([home('rest', '在家里歇着', U.rand(25, 60)), 0.05 + p.tr.lazy * 0.15 + (n.battery < 35 ? 0.5 : 0) + Math.max(0, sleepy - 0.35) * 0.9]);
    if (!cands.length) return home('rest', '在家里歇着', 60);
    return U.weighted(cands.map(([t, w]) => [t, w * w + 0.01]));
  }

  // ---------- 位置 ----------
  // 设施在屏幕上的位置（只对当前看着的场景有效）
  function spotPos(id) {
    const l = lay(); if (!l) return null;
    const s = l.L.spots[id]; if (!s) return null;
    return { x: s.c * l.g.u, r: s.r, water: !!s.water, perch: !!s.perch, c: s.c, id };
  }
  function rowY(r) { const l = lay(); return l ? l.g.y0 + r * l.g.u : G.ground; }
  // 宠物脚下的“地面”：陆地分前后好几排（lane），水里、高处另算
  function floorY(p) {
    if (!on() || !G.pets.includes(p)) return G.ground;
    if (p.surf && p.surf.r != null) { const l2 = lay(), sp2 = p.surf.id && l2 && l2.L.spots[p.surf.id]; return rowY(sp2 ? sp2.r : p.surf.r) + (p.surf.dy || 0); }
    const l = lay(); if (!l) return G.ground;
    const back = l.g.y0 + (l.L.base + 1) * l.g.u, front = G.ground;
    return Math.round(back + (front - back) * (p.lane != null ? p.lane : 0.75));
  }
  PP.eco.floorY = floorY;

  // ---------- 可见 / 不可见 ----------
  const ins = () => (PP.scene && PP.scene.inside && PP.scene.inside()) || null;
  function visibleIn(p) { const sp = ins(); if (sp) return on() && !p.d.hidden && !!p.d.inHome && p.d.species === sp && p.d.scene === view() && !(S().mode === 'mini' && PP.F && PP.F.main() === p); return on() && !p.d.hidden && !p.d.inHome && p.d.scene === view() && !(p.eco && p.eco.state === 'travel'); }
  PP.eco.visible = visibleIn;
  function countAt(scene) { return G.all.filter((p) => !p.d.hidden && p.d.scene === scene && !(p.eco && p.eco.state === 'travel') && !(S().mode === 'mini' && PP.F && PP.F.main() === p)).length; }
  PP.eco.countAt = countAt;

  // 切换到某个场景：这里的动物现身，别处的退场
  function onView(to) {
    for (const p of G.all) {
      if (p.d.hidden) continue;
      const was = G.pets.includes(p);
      if (was && !visibleIn(p)) { toOffscreen(p); }
    }
    PP.syncPets();
    for (const p of G.pets) if (!p._shown) appear(p);
    G.all.forEach((p) => (p._shown = G.pets.includes(p)));
  }
  PP.eco.onView = onView;
  PP.eco.toOffscreen = (p) => { toOffscreen(p); };
  // 刚出现在画面里：放到它正在干的事情的地方
  function appear(p) {
    p._shown = true;
    if (ins() && p.d.inHome) { // 在家里：接着睡 / 接着待着
      p.homeEco = p.eco || { state: 'home', task: { home: true, why: 'rest', label: '在家里歇着', dur: 60 }, until: G.t + 60 };
      p.eco = null; p.surf = null; p.wade = 0; p.sinkOut = 0; p.lane = U.rand(0.3, 0.8);
      const b = spotPos(p.homeEco.task.why === 'sleep' || p.homeEco.task.why === 'hibernate' ? 'bed' : U.pick(['bed', 'eat', 'play']));
      p.x = b ? U.clamp(b.x + U.rand(-20, 20), 40, G.W - 40) : U.rand(G.W * 0.3, G.W * 0.7); p.y = floorY(p);
      return;
    }
    p.surf = null; p.wade = 0; p.lane = p.lane != null ? p.lane : U.rand(0.35, 0.95);
    const t = p.eco && p.eco.task;
    if (t && !t.home && t.scene === p.d.scene) {
      const pos = t.spot ? spotPos(t.spot) : null;
      p.x = pos ? U.clamp(pos.x + U.rand(-30, 30), 20, G.W - 20) : U.rand(G.W * 0.15, G.W * 0.85);
      p.y = floorY(p);
      const left = p.eco.until ? Math.max(4, p.eco.until - G.t) : t.dur;
      p.eco = null;
      p.run('eco', A.eco, Object.assign({}, t, { dur: left }));
    } else {
      if (p.x == null || p.x < 0 || p.x > G.W) p.x = U.rand(G.W * 0.15, G.W * 0.85);
      p.eco = null; p.y = floorY(p);
    }
  }
  // 画面外：把正在做的事换成“后台进行”
  function toOffscreen(p) {
    const t = p.ecoTask;
    p.interrupt(true);
    if (p.homeEco) { p.eco = p.homeEco; p.homeEco = null; p.surf = null; p.wade = 0; p.sinkOut = 0; p._shown = false; p.d.inHome = true; return; }
    p.surf = null; p.wade = 0; p.held = false; p.airborne = false;
    if (t && !t.home) p.eco = { state: 'do', task: t, until: G.t + Math.max(5, (t.dur || 20) - (G.t - (p.taskStart || G.t))) };
    else p.eco = null;
    p._shown = false;
  }

  // ---------- 后台生活（看不见的动物也在过日子） ----------
  let simAcc = 0;
  function tick(dt) {
    if (!G.save || !G.all.length) return;
    simAcc += dt; if (simAcc < 1) return;
    const step = simAcc; simAcc = 0;
    const main = PP.F && PP.F.main();
    let changed = false;
    for (const p of G.all) {
      if (p.d.hidden) continue;
      if (!p.d.scene) p.d.scene = homeScene(p);
      if (G.pets.includes(p)) {
        if (on()) watchWeather(p);
        continue;
      }
      if (S().mode === 'mini' && p === main) continue;
      p.decay(step);
      if (p.bubble) p.bubble = null;
      changed = simOne(p) || changed;
    }
    if (changed) { PP.syncPets(); for (const p of G.pets) if (!p._shown) appear(p); G.all.forEach((p) => (p._shown = G.pets.includes(p))); }
  }
  PP.eco.tick = tick;

  // 返回 true 表示可见性可能变了
  function simOne(p) {
    const a = p.eco;
    if (!a) { startOff(p, plan(p)); return false; }
    if (a.state === 'travel') {
      if (G.t < a.arrive) return false;
      p.d.scene = a.to;
      const t = a.task;
      if (p.d.scene === view() && on()) { p.eco = { state: 'arrive', task: t }; enterFromEdge(p, a.from); return true; }
      if (p.d.scene !== t.scene) { p.eco = { state: 'travel', from: p.d.scene, to: nextHop(p.d.scene, t.scene), arrive: G.t + U.rand(18, 30), task: t }; return false; }
      startOff(p, t); return false;
    }
    if (a.state === 'do') {
      if (G.t < a.until) return false;
      effects(p, a.task); p.eco = null; p.sleeping = false;
      startOff(p, plan(p)); return p.d.scene === view();
    }
    if (a.state === 'home') {
      p.sleeping = ['sleep', 'hibernate'].includes(a.task.why);
      if (a.task.why === 'eatStash' && p.d.stash > 0 && p.n.hunger < 70) { p.d.stash--; p.n.hunger = Math.min(100, p.n.hunger + 35); }
      if (G.t < a.until) return false;
      const nx = plan(p);
      if (nx.home) { p.eco = { state: 'home', task: nx, until: G.t + nx.dur }; return false; }
      // 出门
      p.d.inHome = false; p.sleeping = false;
      if (p.d.scene === view() && on()) { p.eco = { state: 'emerge', task: nx }; return true; }
      startOff(p, nx); return false;
    }
    if (a.state === 'emerge' || a.state === 'arrive') { // 等待显示
      if (!(p.d.scene === view() && on())) startOff(p, a.task);
      return true;
    }
    return false;
  }
  function startOff(p, t) {
    p.d.scene = p.d.scene || homeScene(p);
    if (t.friend) { const f = G.all.find((o) => o.d.id === t.friend); if (f && f.d.scene) t.scene = f.d.scene; }
    if (t.scene !== p.d.scene) { p.eco = { state: 'travel', from: p.d.scene, to: nextHop(p.d.scene, t.scene), arrive: G.t + U.rand(18, 30), task: t }; return; }
    if (t.home) { p.d.inHome = true; p.eco = { state: 'home', task: t, until: G.t + (t.dur || 60) }; p.sleeping = ['sleep', 'hibernate'].includes(t.why); return; }
    p.d.inHome = false;
    p.eco = { state: 'do', task: t, until: G.t + (t.dur || 30) };
    if (t.rest && t.why === 'sleep') p.sleeping = true;
  }
  function effects(p, t) {
    const k = KIND[t.kind] || {}, n = p.n;
    if (k.hunger) n.hunger = Math.min(100, n.hunger + k.hunger);
    if (k.thirst) n.thirst = Math.min(100, n.thirst + k.thirst);
    if (k.fun) n.fun = Math.min(100, n.fun + k.fun);
    if (k.social) n.social = Math.min(100, n.social + k.social);
    if (k.energy) n.energy = Math.min(100, n.energy + k.energy);
    if (k.battery) n.battery = Math.min(100, n.battery + k.battery);
    n.bladder = Math.min(100, n.bladder + 30);
    if (t.kind === 'seeds' && p.d.stash < 12) p.d.stash += 2;
    if (Math.random() < 0.12) PP.diary && PP.diary.add(p, (t.label || '') + '。', 'note');
  }
  // 从路牌那边走进来
  function enterFromEdge(p, from) {
    const side = PP.ROUTE.indexOf(from) < PP.ROUTE.indexOf(p.d.scene) ? -1 : 1;
    p.x = side < 0 ? 18 : G.W - 18; p.lane = U.rand(0.4, 0.95); p.surf = null; p.wade = 0;
  }

  // 显示出来以后的第一件事：从家里出来 / 从路边走进来，然后继续干活
  PP.eco.afterSync = function () {
    for (const p of G.pets) {
      const a = p.eco; if (!a) continue;
      if (a.state === 'emerge') { p.eco = null; p._shown = true; const pos = spotPos(p.d.species + '_home'); p.x = pos ? pos.x : p.x; p.lane = 0.55; p.surf = null; p.y = floorY(p); p.run('eco', A.ecoOut, a.task); }
      else if (a.state === 'arrive') { p.eco = null; p._shown = true; p.y = floorY(p); p.run('eco', A.eco, a.task); }
    }
  };

  // ---------- 可见动物的决策：在 pet.decide() 里调用 ----------
  // 返回 true 表示已经安排了事情
  PP.eco.decide = function (p, add) {
    if (!on() || !G.pets.includes(p)) return false;
    if (p.homeEco) { p.run('eco', A.homeLife); return true; }
    if (p.calm) return false;
    const t = plan(p);
    const urgent = t.home || t.scene !== p.d.scene || p.n.hunger < 45 || p.n.thirst < 40;
    if (urgent) { p.run('eco', A.eco, t); return true; }
    // 不着急的时候：和“摸摸你、找朋友玩、发呆”这些放在一起随机
    add('eco', 1.1);
    p._ecoNext = t;
    return false;
  };
  // 极简模式：主角走到右下角待着
  A.cornerWalk = function* () {
    const p = this, [a, b] = PP.miniZone ? PP.miniZone() : [G.W - 260, G.W - 70];
    yield p.goto(U.rand(a, b));
    p.anim = 'idle'; yield 1;
  };

  // 天气突变：正在外面的动物看情况跑回家
  function watchWeather(p) {
    if (p.homeEco) return;
    if (p.held || p.airborne || p.doorBusy() || p.calm) return;
    if ((p.cooldown.wx || 0) > 0) return;
    p.cooldown.wx = 6;
    if (p.ecoTask && p.ecoTask.home) return;
    const h = HAB[p.d.species], e = env(p.d.scene || h.home);
    const bad = weatherBad(p, e);
    const hib = hibernating(p, e);
    if ((bad && !(h.rainLover && wet(e) && e.weather.kind !== 'storm')) || hib) {
      p.say(U.pick(hib ? ['好冷…要去冬眠了', '困…（打哈欠）'] : bad === '太热了' ? ['好热…回家凉快凉快', '受不了了'] : ['下雨啦，回家！', '要淋湿了！', '快跑快跑']), 2);
      p.run('eco', A.eco, { home: true, scene: h.home, spot: p.d.species + '_home', why: hib ? 'hibernate' : 'shelter', label: hib ? '在冬眠' : `${bad}，躲在家里`, dur: U.rand(60, 120), run: true });
    }
  }

  // ---------- 行为脚本 ----------
  const SZ = () => G.S;
  function* hopTo(p, surf, lane) {
    // 跳到新的“地面”（上岸 / 下水 / 跳上高处）
    const y0 = p.y;
    p.surf = surf; if (lane != null) p.lane = lane;
    const y1 = floorY(p);
    p.transit = true;
    const n = 8, h = Math.max(10, Math.abs(y1 - y0) * 0.4 + 10);
    for (let k = 1; k <= n; k++) { const a = k / n; p.y = y0 + (y1 - y0) * a - Math.sin(a * Math.PI) * h; p.anim = a < 0.5 ? 'jump' : 'fall'; yield 0.04; }
    p.transit = false; p.y = y1; p.anim = 'land'; p.jolt(-2, 0); yield 0.15; p.anim = 'idle';
  }
  function* walkTo(p, pos, task, run) {
    if (!pos) { yield p.goto(p.x + U.rand(-120, 120), run); return; }
    const tx = U.clamp(pos.x + (task && task.jit != null ? task.jit : U.rand(-14, 14) * SZ()), 20, G.W - 20);
    // 先从水里 / 高处下来
    if (p.surf && !(pos.water && p.surf.water) && !(pos.perch && p.surf.perch && Math.abs(p.surf.c - pos.c) < 3)) {
      if (p.surf.water) { PP.scene.splash(p.x / lay().g.u, p.surf.r); }
      p.wade = 0; yield* hopTo(p, null, 0.3);
    }
    if (pos.water) {
      if (!p.surf) { // 走到岸边，跳下水
        yield p.goto(tx, run);
        const l = lay(); PP.scene.splash(tx / l.g.u, pos.r);
        yield* hopTo(p, { r: pos.r, water: true, c: pos.c, id: pos.id }, null);
        p.wade = wadeOf(p, task); PP.scene.splash(tx / l.g.u, pos.r);
      } else yield p.goto(tx, run);
      return;
    }
    yield p.goto(tx, run);
    if (pos.perch) { p.facing = U.chance(0.5) ? 1 : -1; yield* hopTo(p, { r: pos.r, perch: true, c: pos.c, id: pos.id }, null); }
  }
  function wadeOf(p, task) {
    const sp = p.d.species, S = SZ();
    if (task && task.spot === 'frog_home') return 0;
    if (task && task.kind === 'soak') return (sp === 'capybara' ? 13 : 8) * S;
    return { duck: 6, frog: 9, penguin: 11, capybara: 13, turtle: 8, crab: 6, octopus: 8 }[sp] * S || 8 * S;
  }
  function done(p, t) { effects(p, t); p.ecoTask = null; }

  // 主脚本：去目标场景 → 去目标地点 → 干活
  A.eco = function* (task) {
    const p = this;
    p.ecoTask = task; p.taskStart = G.t;
    if (task.friend) { const f = G.all.find((o) => o.d.id === task.friend); if (f && f.d.scene) task.scene = f.d.scene; }
    // 1. 不在这个场景：走到路牌那边离开
    if (task.scene !== p.d.scene) {
      const to = nextHop(p.d.scene, task.scene);
      if (Math.random() < 0.35) p.say(U.pick([`去${PP.SCENES[task.scene].name}～`, task.label ? task.label.replace(/^在/, '去') : '出发！', '走啦']), 2);
      if (p.surf) { p.wade = 0; yield* hopTo(p, null, 0.6); }
      yield p.goto(PP.scene.exitX(to), !!task.run);
      p.eco = { state: 'travel', from: p.d.scene, to, arrive: G.t + U.rand(18, 30), task };
      p.ecoTask = null; p._shown = false;
      PP.syncPets();
      return;
    }
    // 2. 回家
    if (task.home) {
      const pos = spotPos(task.spot);
      if (p.surf && !(pos && pos.water)) { p.wade = 0; yield* hopTo(p, null, 0.5); }
      if (pos && pos.water && !p.surf) yield* walkTo(p, pos, Object.assign({ jit: 0 }, task), task.run);
      else yield p.goto(pos ? pos.x : p.x, !!task.run);
      p.facing = U.chance(0.5) ? 1 : -1;
      yield* goIn(p, task);
      return;
    }
    // 3. 去干活的地方
    const pos = spotPos(task.spot);
    if (task.kind === 'visit') { yield* visit(p, task); done(p, task); return; }
    yield* walkTo(p, pos, task, task.run);
    const body = DO[task.kind] || DO.groom;
    yield* body(p, task, pos);
    done(p, task);
  };
  // 在家里过日子（你进来看的时候）：睡觉、吃存粮、理毛、玩，时间到了从门口出去
  A.homeLife = function* () {
    const p = this;
    for (let guard = 0; guard < 400; guard++) {
      const he = p.homeEco; if (!he) return;
      const why = he.task.why;
      if (G.t >= he.until) {
        const nx = plan(p);
        if (nx.home) { p.homeEco = { state: 'home', task: nx, until: G.t + (nx.dur || 60) }; p.sleeping = ['sleep', 'hibernate'].includes(nx.why); continue; }
        // 出门
        p.sleeping = false; p.anim = 'stretch'; p.eyes = 'open'; yield 1;
        if (Math.random() < 0.7) p.say(U.pick([nx.label ? nx.label.replace(/^在/, '去') : '出门啦', '出门啦～', '我出去一下']), 2);
        const d = spotPos('door'); yield p.goto(d ? d.x : 20);
        for (let k = 0; k < 10; k++) { p.sinkOut = (k + 1) / 10; yield 0.05; }
        p.sinkOut = 0; p.homeEco = null; p.d.inHome = false; p._shown = false; p.ecoTask = null;
        startOff(p, nx); PP.syncPets();
        return;
      }
      if (why === 'sleep' || why === 'hibernate') {
        const b = spotPos('bed'); if (b && Math.abs(p.x - b.x) > 30) yield p.goto(b.x + U.rand(-10, 10));
        p.facing = U.chance(0.5) ? 1 : -1;
        yield* DO.nap(p, { dur: Math.min(30, Math.max(4, he.until - G.t)) });
        continue;
      }
      p.sleeping = false;
      const opts = [['eat', p.n.hunger < 75 ? 1.4 : 0.3], ['groom', 1], ['nap', p.n.energy < 60 ? 1.2 : 0.4], ['play', 0.8 + p.tr.playful], ['look', 0.6]];
      const what = U.weighted(opts);
      if (what === 'eat') {
        const b = spotPos('eat'); if (b) yield p.goto(b.x + U.rand(-8, 8));
        yield* DO.eat(p, { dur: U.rand(5, 9) });
        if (HAB[p.d.species] && HAB[p.d.species].stash && p.d.stash > 0) { p.d.stash--; p.n.hunger = Math.min(100, p.n.hunger + 30); }
        else p.n.hunger = Math.min(100, p.n.hunger + 12);
      } else if (what === 'groom') { const b = spotPos('bed'); if (b) yield p.goto(b.x + U.rand(-16, 16)); yield* DO.groom(p, { dur: U.rand(4, 8) }); }
      else if (what === 'nap') { const b = spotPos('bed'); if (b) yield p.goto(b.x + U.rand(-8, 8)); yield* DO.nap(p, { dur: U.rand(15, 35) }); p.sleeping = false; p.eyes = 'open'; }
      else if (what === 'play') { const b = spotPos('play') || spotPos('bed'); if (b) yield p.goto(b.x + U.rand(-20, 20)); p.eyes = 'happy'; for (let k = 0; k < 3; k++) { p.anim = 'jump'; p.jolt(-4, 0); yield 0.35; p.anim = 'idle'; yield 0.5; p.facing = -p.facing; } p.anim = 'knead'; yield 2; p.anim = 'idle'; yield 1; p.n.fun = Math.min(100, p.n.fun + 8); }
      else { const rm = lay() && lay().L.room, u = lay() ? lay().g.u : 1; yield p.goto(rm ? U.rand((rm.x0 + 30) * u, (rm.x1 - 40) * u) : U.rand(G.W * 0.2, G.W * 0.85)); p.anim = 'sit'; yield U.rand(3, 7); p.anim = 'idle'; }
    }
  };
  // 从家里出来
  A.ecoOut = function* (task) {
    const p = this;
    const pos = spotPos(p.d.species + '_home');
    if (pos && pos.water) { p.surf = { r: pos.r, water: true, c: pos.c, id: pos.id }; }
    p.y = floorY(p);
    p.sinkOut = 1; p.anim = 'idle';
    for (let k = 0; k < 10; k++) { p.sinkOut = 1 - (k + 1) / 10; yield 0.05; }
    p.sinkOut = 0; p.jolt(-2, 0);
    if (Math.random() < 0.6) p.anim = 'stretch', yield 1.1;
    p.anim = 'idle';
    yield* A.eco.call(p, task);
  };
  // 钻进家里
  function* goIn(p, task) {
    p.anim = 'idle'; yield 0.3;
    for (let k = 0; k < 10; k++) { p.sinkOut = (k + 1) / 10; yield 0.05; }
    p.sinkOut = 0; p.d.inHome = true; p.surf = null; p.wade = 0;
    p.eco = { state: 'home', task, until: G.t + (task.dur || 60) };
    p.ecoTask = null; p._shown = false; p.sleeping = ['sleep', 'hibernate'].includes(task.why);
    PP.syncPets();
  }
  function* visit(p, task) {
    const f = G.pets.find((o) => o.d.id === task.friend);
    if (!f) { yield* DO.groom(p, task); return; }
    yield p.goto(f.x + (p.x < f.x ? -1 : 1) * 16 * SZ());
    p.facing = Math.sign(f.x - p.x) || 1;
    if (A.social) { yield* A.social.call(p); return; }
    p.say(U.pick(PP.LINES.friend), 2); yield 3;
  }

  // 每种活动具体怎么做（可见的时候）
  const r = (a, b) => U.rand(a, b);
  const DO = {
    *eat(p, t) { p.anim = 'eat'; p.mouth = 'chew'; p.eyes = 'closed'; yield t.dur; p.anim = 'idle'; p.mouth = 'tongue'; p.eyes = 'happy'; yield 0.8; p.mouth = 'w'; p.eyes = 'open'; },
    *graze(p, t) {
      let left = t.dur;
      while (left > 0) { p.anim = 'eat'; p.mouth = 'chew'; const d = r(2, 4); yield d; left -= d; p.anim = 'idle'; yield 0.6; left -= 0.6; if (Math.random() < 0.4) { yield p.goto(p.x + r(-25, 25)); } if (p.d.species === 'rabbit' && Math.random() < 0.25) { p.ears = 'perk'; p.anim = 'look_up'; yield 0.8; p.ears = 'up'; } }
      p.anim = 'idle'; p.mouth = 'w';
    },
    *drink(p, t) { p.anim = 'drink'; p.eyes = 'closed'; for (let k = 0; k < 6; k++) { yield 0.45; PP.fx({ kind: 'dot', x: p.x + r(-6, 6), y: p.y - 6 * SZ(), vx: r(-30, 30), vy: r(-90, -50), grav: 400, life: 0.5, col: '#8fd0ff', size: Math.max(1, SZ() - 1) }); } p.anim = 'idle'; p.eyes = 'open'; },
    *fish(p, t) {
      // 猫：蹲在码头边，盯着水面，伸爪子一捞
      p.facing = U.chance(0.5) ? 1 : -1; let left = t.dur, got = false;
      while (left > 0) {
        p.anim = 'crouch'; p.eyes = 'wide'; const d = r(2.5, 5); yield d; left -= d;
        if (Math.random() < 0.45) {
          p.jolt(-3, 0); p.anim = 'jump'; yield 0.25; p.anim = 'land';
          const l = lay(); if (l && l.L.water) PP.scene.splash(p.x / l.g.u + p.facing * 4, l.L.water.y1 - 2);
          if (Math.random() < 0.5) { got = true; p.emote('heart'); PP.scene.fishAt(p.x / lay().g.u + p.facing * 6); p.say(U.pick(['抓到了！', '鱼！', '（叼着鱼）']), 1.6); break; }
          p.setExpr('sad', 'frown', 1); yield 0.6;
        }
      }
      if (got) { p.anim = 'eat'; p.mouth = 'chew'; p.eyes = 'closed'; yield 4; }
      p.anim = 'idle'; p.eyes = 'open'; p.mouth = 'w';
      if (!got) t.kind = 'watch'; // 没抓到就当看了会儿鱼
    },
    *watch(p, t) { p.anim = 'sit'; p.eyes = 'open'; let left = t.dur; while (left > 0) { yield 3; left -= 3; if (Math.random() < 0.25 && lay().L.water) PP.scene.fishAt(p.x / lay().g.u + r(-10, 10)); if (Math.random() < 0.2) p.facing = -p.facing; } },
    *hunt(p, t) {
      let left = t.dur;
      while (left > 0) {
        p.anim = 'crouch'; p.ears = 'perk'; p.eyes = 'wide'; yield r(1.5, 3); left -= 2.5;
        // 一跃扎下去
        const x0 = p.x, x1 = U.clamp(p.x + p.facing * r(30, 60) * SZ() / 2, 20, G.W - 20), y0 = p.y;
        p.transit = true;
        for (let k = 1; k <= 10; k++) { const a = k / 10; p.x = x0 + (x1 - x0) * a; p.y = y0 - Math.sin(a * Math.PI) * 26 * SZ() / 2; p.anim = a < 0.5 ? 'jump' : 'fall'; yield 0.04; }
        p.transit = false; p.y = floorY(p); p.anim = 'eat'; p.jolt(-4, 0);
        PP.puff && PP.puff(p.x, p.y, 4);
        yield 0.8;
        if (Math.random() < 0.4) { p.emote('heart'); p.anim = 'eat'; p.mouth = 'chew'; yield 2.5; break; }
        p.anim = 'idle'; p.think('dots', 1); yield 1; left -= 2;
      }
      p.anim = 'idle'; p.ears = 'up'; p.eyes = 'open'; p.mouth = 'w';
    },
    *peck(p, t) { let left = t.dur; while (left > 0) { p.anim = 'eat'; yield 0.25; p.anim = 'idle'; const d = r(0.3, 0.9); yield d; left -= d + 0.25; if (Math.random() < 0.3) { yield p.goto(p.x + r(-30, 30)); left -= 1; } } },
    *root(p, t) {
      for (let i = 0; i < 5; i++) { p.anim = 'eat'; p.mouth = 'chew'; yield 0.6; PP.fx({ kind: 'dot', x: p.x + p.facing * 8 * SZ(), y: p.y - 2, vx: r(-50, 50), vy: r(-90, -40), grav: 400, life: 0.5, col: '#9a6a46', size: SZ() }); if (i === 2) yield p.goto(p.x + r(-30, 30)); }
      if (t.spot === 'mushrooms' && Math.random() < 0.5) { p.say(U.pick(['哼！松露！', '找到好东西了']), 2); p.emote('heart'); }
      if (Math.random() < 0.15 && G.items.filter((i) => i.type === 'gift').length < 3) { const g = PP.events.rollGift(p); PP.addItem({ type: 'gift', x: p.x + p.facing * 10 * SZ(), data: { gift: g, from: p.d.id } }); p.say('哼哼～送你', 1.6); }
      p.anim = 'eat'; yield Math.max(2, t.dur - 5); p.anim = 'idle'; p.mouth = 'w';
    },
    *forage(p, t) {
      let left = t.dur;
      while (left > 0) { yield p.goto(p.x + r(-60, 60)); p.anim = 'eat'; const d = r(1.2, 2.4); yield d; left -= d + 1.5; p.anim = 'idle'; if (Math.random() < 0.2) p.emote('heart'); }
      if (p.d.species === 'hedgehog' && Math.random() < 0.3 && !p.hat) { p.hat = 'leaf'; }
    },
    *berries(p, t) { p.anim = 'look_up'; yield 1; let left = t.dur; while (left > 0) { p.anim = 'eat'; p.mouth = 'chew'; yield 2; p.anim = 'look_up'; yield 0.8; left -= 2.8; } p.anim = 'idle'; p.mouth = 'w'; if (Math.random() < 0.4) p.emote('heart'); },
    *seeds(p, t) { let left = t.dur; while (left > 0) { yield p.goto(p.x + r(-30, 30)); p.anim = 'eat'; yield 1.2; p.cheeks = true; left -= 2.5; } p.anim = 'idle'; p.say(U.pick(['（腮帮子鼓鼓的）', '囤起来囤起来', '吱！']), 1.6); },
    *tongue(p, t) {
      let left = t.dur;
      while (left > 0) {
        p.anim = 'idle'; p.eyes = 'open'; const d = r(2, 4); yield d; left -= d;
        const tx = p.x + p.facing * r(20, 50), ty = p.y - r(20, 50) * SZ() / 2;
        p.tongue = { x: tx, y: ty, t: 0.3, max: 0.3 }; p.mouth = 'open'; yield 0.3; p.mouth = 'w';
        if (Math.random() < 0.6) { p.mouth = 'chew'; yield 0.8; p.mouth = 'w'; }
      }
    },
    *dive(p, t) {
      // 企鹅：跳进冰窟窿，过一会儿叼着鱼冒出来
      const l = lay(); p.facing = U.chance(0.5) ? 1 : -1;
      p.anim = 'jump'; p.jolt(-3, 0); yield 0.3;
      for (let k = 0; k < 8; k++) { p.sinkOut = (k + 1) / 8; yield 0.04; }
      if (l && l.L.icehole) PP.scene.splash(l.L.icehole.c, l.L.icehole.r);
      yield r(3, 6);
      if (l && l.L.icehole) PP.scene.splash(l.L.icehole.c, l.L.icehole.r);
      for (let k = 0; k < 8; k++) { p.sinkOut = 1 - (k + 1) / 8; yield 0.04; }
      p.sinkOut = 0; p.jolt(-3, 0);
      if (Math.random() < 0.7) { p.say(U.pick(['嘎！抓到了', '（叼着鱼）', '今天的鱼好大']), 1.6); p.anim = 'eat'; p.mouth = 'chew'; yield 3; }
      p.anim = 'idle'; p.mouth = 'w'; yield Math.max(1, t.dur - 10);
    },
    *dabble(p, t) {
      // 鸭子：一头扎进水里，屁股朝天
      let left = t.dur;
      while (left > 0) {
        yield p.goto(p.x + r(-60, 60)); left -= 2;
        const w0 = p.wade; p.anim = 'eat'; p.wade = w0 + 8 * SZ(); p.jolt(2, 0); yield r(1.2, 2.2); p.wade = w0; p.anim = 'idle'; p.jolt(-2, 0);
        PP.scene.splash(p.x / lay().g.u, p.surf ? p.surf.r : 0); left -= 2;
      }
    },
    *swim(p, t) {
      let left = t.dur;
      while (left > 0) { yield p.goto(U.clamp(p.x + r(-160, 160), G.W * 0.08, G.W * 0.64)); if (Math.random() < 0.5) PP.scene.splash(p.x / lay().g.u, p.surf ? p.surf.r : 0); p.anim = 'idle'; const d = r(1.5, 4); yield d; left -= d + 3; }
    },
    *soak(p, t) {
      if (p.d.species === 'capybara' && !p.hat && (env().season === 'winter' || Math.random() < 0.5)) p.hat = 'yuzu';
      p.surf = p.surf || { r: lay().L.spring ? lay().L.spring.r + 2 : null, c: 0 }; p.wade = 12 * SZ();
      p.anim = 'lie'; p.eyes = 'closed'; p.mouth = 'smile';
      let left = t.dur; while (left > 0) { yield 2; left -= 2; if (Math.random() < 0.08) p.setExpr('happy', 'smile', 1); }
      p.wade = 0; p.surf = null; yield* hopTo(p, null, 0.5);
      p.anim = 'idle'; p.eyes = 'open'; p.mouth = 'w';
    },
    *wallow(p, t) {
      p.anim = 'lie'; p.eyes = 'happy'; p.mouth = 'smile'; p.wade = 4 * SZ();
      let left = t.dur; while (left > 0) { yield 1.2; left -= 1.2; if (Math.random() < 0.3) { p.facing = -p.facing; p.jolt(2, r(-3, 3)); PP.fx({ kind: 'dot', x: p.x + r(-10, 10), y: p.y - 4, vx: r(-60, 60), vy: r(-100, -50), grav: 500, life: 0.6, col: '#7a4a2a', size: SZ() }); } }
      p.wade = 0; p.anim = 'idle'; p.eyes = 'open'; p.mouth = 'w'; p.say(U.pick(['哼哼～舒服', '（满身泥巴）']), 1.6);
    },
    *perch(p, t) {
      p.anim = 'lie'; p.eyes = 'sleepy';
      let left = t.dur; while (left > 0) { yield 3; left -= 3; p.eyes = Math.random() < 0.6 ? 'happy' : 'sleepy'; if (Math.random() < 0.15) p.facing = -p.facing; if (Math.random() < 0.06) { p.anim = 'sleep'; p.eyes = 'closed'; yield 6; left -= 6; p.anim = 'lie'; } }
      p.anim = 'stretch'; yield 1; p.anim = 'idle'; p.eyes = 'open';
    },
    *knead(p, t) { p.anim = 'knead'; p.eyes = 'happy'; p.purr = 2; yield t.dur; p.anim = 'idle'; p.eyes = 'open'; },
    *pounce(p, t) {
      if (!G.ambient.bug && env().season !== 'winter') G.ambient.bug = { x: p.x + p.facing * 60, y: p.y - 50, vx: U.pick([-30, 30]), t: 0, life: r(14, 24), caught: false };
      if (A.bug) { yield* A.bug.call(p); return; }
      yield* DO.zoom(p, t);
    },
    *slide(p, t) {
      // 企鹅：在坡顶趴下，肚皮滑下去
      for (let round = 0; round < 2; round++) {
        const end = spotPos('slideend'); if (!end) break;
        p.anim = 'lie'; p.facing = end.x > p.x ? 1 : -1; p.say(round ? '' : U.pick(['嘎——！', '冲呀！', '']), 1);
        yield 0.5;
        p.wade = 0; p.surf = null; p.transit = true;
        const x0 = p.x, y0 = p.y, y1 = floorY(p);
        for (let k = 1; k <= 24; k++) { const a = k / 24; p.x = x0 + (end.x - x0) * a; p.y = y0 + (y1 - y0) * Math.min(1, a * 1.4); p.anim = 'lie'; if (k % 4 === 0) PP.fx({ kind: 'dot', x: p.x - p.facing * 10, y: p.y - 2, vx: -p.facing * r(20, 60), vy: r(-40, -10), grav: 200, life: 0.5, col: '#ffffff', size: SZ() }); yield 0.05; }
        p.transit = false; p.y = floorY(p); p.jolt(-2, 2); p.anim = 'idle'; p.eyes = 'happy'; yield 1.2; p.eyes = 'open';
        if (round === 0 && Math.random() < 0.6) { const top = spotPos('slidetop'); yield p.goto(top.x); yield* hopTo(p, { r: top.r, perch: true, c: top.c }, null); } else break;
      }
    },
    *dig(p, t) { for (let i = 0; i < 8; i++) { p.anim = 'eat'; yield 0.35; PP.fx({ kind: 'dot', x: p.x - p.facing * 8 * SZ(), y: p.y - 2, vx: -p.facing * r(40, 90), vy: r(-120, -60), grav: 500, life: 0.6, col: env().season === 'winter' ? '#ffffff' : '#8a5a3a', size: SZ() }); p.anim = 'idle'; yield 0.2; } if (p.d.species === 'dog' && Math.random() < 0.3) { p.say(U.pick(['汪！骨头！', '挖到了！']), 1.6); p.emote('heart'); } yield Math.max(1, t.dur - 5); },
    *croak(p, t) { let left = t.dur; while (left > 0) { p.anim = 'idle'; p.cheeks = true; p.mouth = 'o'; p.emote('music'); PP.audio && PP.audio.chirp(p); yield 0.6; p.cheeks = false; p.mouth = 'w'; const d = r(2, 4); yield d; left -= d + 0.6; } },
    *patrol(p, t) { let left = t.dur; while (left > 0) { yield p.goto(U.rand(G.W * 0.1, G.W * 0.9)); p.anim = 'eat'; yield 0.8; p.anim = 'idle'; p.anim = 'look_up'; yield 0.8; p.anim = 'idle'; left -= 6; } },
    *binky(p, t) { for (let i = 0; i < 3; i++) { p.transit = true; const y0 = p.y; for (let k = 1; k <= 8; k++) { const a = k / 8; p.y = y0 - Math.sin(a * Math.PI) * 22 * SZ() / 2; p.facing = k === 4 ? -p.facing : p.facing; p.anim = 'jump'; yield 0.04; } p.transit = false; p.y = floorY(p); p.anim = 'land'; p.jolt(-2, 3); yield r(0.6, 1.4); } p.anim = 'idle'; p.eyes = 'happy'; yield 1; p.eyes = 'open'; },
    *dust(p, t) { p.anim = 'lie'; p.eyes = 'closed'; for (let i = 0; i < 6; i++) { p.jolt(1.5, r(-3, 3)); PP.puff && PP.puff(p.x, p.y, 2); yield 1; } p.anim = 'idle'; p.eyes = 'open'; yield 0.6; },
    *zoom(p, t) { for (let i = 0; i < 4; i++) yield p.goto(U.rand(G.W * 0.08, G.W * 0.92), true); p.anim = 'idle'; p.mouth = 'tongue'; yield 1; p.mouth = 'w'; },
    *sniff(p, t) { let left = t.dur; while (left > 0) { yield p.goto(p.x + r(-90, 90)); p.anim = 'eat'; yield r(0.8, 1.6); p.anim = 'idle'; left -= 3; if (Math.random() < 0.15) p.think(U.pick(['q', 'excl']), 1.2); } },
    *roll(p, t) { for (let i = 0; i < 5; i++) { p.anim = 'lie'; p.facing = -p.facing; p.jolt(2, 4); PP.puff && PP.puff(p.x, p.y, 3); yield 0.7; } p.anim = 'idle'; p.mouth = 'tongue'; p.eyes = 'happy'; yield 1.2; p.mouth = 'w'; p.eyes = 'open'; },
    *nap(p, t) { p.anim = 'lie'; p.eyes = 'sleepy'; yield 1.5; p.anim = 'sleep'; p.eyes = 'closed'; p.sleeping = true; let left = t.dur; while (left > 0) { yield 2.4; left -= 2.4; PP.fx({ x: p.x + p.facing * 6 * SZ(), y: p.y - 18 * SZ(), vx: 10, vy: -16, icon: 'zzz', life: 2.2, s: Math.max(1, SZ() - 1) }); } p.sleeping = false; p.anim = 'stretch'; yield 1; p.anim = 'idle'; p.eyes = 'open'; },
    *groom(p, t) { p.anim = 'groom'; p.eyes = 'closed'; yield Math.min(t.dur, 6); p.anim = 'idle'; p.eyes = 'open'; yield 1; },
    *waddle(p, t) { let left = t.dur; while (left > 0) { yield p.goto(p.x + r(-100, 100)); p.anim = 'idle'; yield r(1, 2); left -= 4; } },
    *follow(p, t) { if (A.follow) yield* A.follow.call(p); else yield* DO.peck(p, t); },
    *splash(p, t) { for (let i = 0; i < 8; i++) { p.jolt(-1, r(-2, 2)); PP.fx({ kind: 'dot', x: p.x + r(-10, 10), y: p.y - 4 * SZ(), vx: r(-60, 60), vy: r(-140, -60), grav: 500, life: 0.6, col: '#8fd0ff', size: Math.max(1, SZ() - 1) }); yield 0.5; } p.say(U.pick(['嘎嘎！', '好玩！']), 1.4); },
  };
  PP.eco.DO = DO;

  // ---------- 家：门口状态、悬停说明、叫出来 ----------
  function residents(species) { return G.all.filter((p) => p.d.species === species && !p.d.hidden && p.d.inHome && !(S().mode === 'mini' && PP.F && PP.F.main() === p)); }
  PP.eco.homeKnown = () => true;
  PP.eco.residentsOf = residents;
  const SHORT = { sleep: '睡觉', hibernate: '冬眠中', shelter: '躲雨', rest: '在家', eatStash: '吃存粮' };
  PP.eco.homeTag = function (species) {
    const inside = residents(species); if (!inside.length) return '';
    const w = (p) => { const he = p.homeEco || p.eco; const why = he && he.task && he.task.why; return why === 'shelter' && he.task.label ? he.task.label.split('，')[0].replace(/了$/, '') + '·躲着' : SHORT[why] || '在家'; };
    const first = inside[0];
    return `${inside.map((p) => p.name).join('、')} · ${w(first)}${first.sleeping ? ' zZ' : ''}`;
  };
  PP.eco.homeTip = function (species) {
    const name = PP.HOME_NAME[species] || '小窝';
    const owners = G.all.filter((p) => p.d.species === species && !p.d.hidden);
    if (!owners.length) return `${name}（空着，还没有${PP.SPECIES[species] ? PP.SPECIES[species].name : ''}住这儿）`;
    const inside = residents(species);
    if (!inside.length) return `${owners.map((p) => p.name).join('、')}的${name} · 没人在家`;
    const why = (p) => (p.eco && p.eco.task && p.eco.task.label) || '在家';
    return `${name}：${inside.map((p) => `${p.name}${why(p)}`).join('；')} · 点一下叫出来`;
  };
  PP.eco.callOut = function (species) {
    const inside = residents(species);
    if (!inside.length) { PP.ui.toast(PP.eco.homeTip(species)); return; }
    const p = inside[0], e = env();
    const hib = hibernating(p, e), why = p.eco && p.eco.task && p.eco.task.why;
    p.d.inHome = false; p.sleeping = false;
    const t = { scene: p.d.scene, spot: species + '_home', kind: 'groom', label: '被你叫出来了', dur: hib ? 20 : 30 };
    p.eco = { state: 'emerge', task: t };
    PP.syncPets(); PP.eco.afterSync();
    setTimeout(() => {
      if (hib) p.say(U.pick(['……冬眠呢……（又闭上眼）', '好冷……让我再睡会儿', '春天到了吗？……没有啊']), 3);
      else if (why === 'sleep') p.line('wakeGrumpy');
      else if (why === 'shelter') p.say(U.pick(['外面在下雨诶…', '就出来一下下哦', '你叫我？']), 2.4);
      else p.say(U.pick(['你叫我？', '来啦～', '（探出头）']), 2);
      p.addAff(0.3);
    }, 700);
  };
  // 家门口的动静：睡觉冒 zZ，冬眠冒雪花，夜里醒着能看到一对亮眼睛
  PP.eco.renderHomes = function (ctx, R, L, e, t) {
    for (const h of L.homes) {
      const inside = residents(h.species); if (!inside.length) continue;
      const sleeping = inside.some((p) => p.sleeping);
      if (sleeping) {
        const a = (t * 0.4 + h.c * 0.13) % 1;
        ctx.globalAlpha = 1 - a;
        const hib = inside.some((p) => p.eco && p.eco.task && p.eco.task.why === 'hibernate');
        const zx = h.c + 2 + Math.round(a * 4), zy = h.y0 - 1 - Math.round(a * 6);
        if (hib) { R(zx, zy, '#ffffff'); R(zx - 1, zy, '#cfe6f5'); R(zx + 1, zy, '#cfe6f5'); R(zx, zy - 1, '#cfe6f5'); R(zx, zy + 1, '#cfe6f5'); }
        else { R(zx, zy, '#ffffff', 3, 1); R(zx + 1, zy + 1, '#ffffff'); R(zx, zy + 2, '#ffffff', 3, 1); }
        ctx.globalAlpha = 1;
      } else if (e.time.phase !== 'day' || e.fx.dark > 0.3) {
        if (Math.floor(t * 0.7 + h.c) % 5 !== 0) { R(h.c - 1, h.r - 2, '#fff6a0'); R(h.c + 1, h.r - 2, '#fff6a0'); }
      } else if (Math.floor(t * 0.5 + h.c) % 7 === 0) { R(h.c, h.y0 - 2, '#ffffff', 1, 1); }
    }
  };

  // ---------- 档案里用的描述 ----------
  PP.eco.describe = function (p) {
    const h = HAB[p.d.species] || HAB.cat;
    const where = PP.SCENES[p.d.scene || h.home] ? PP.SCENES[p.d.scene || h.home].name : '';
    let now = '';
    if (p.d.hidden) now = '回电脑里休息了';
    else if (S().mode === 'mini' && PP.F && PP.F.main() === p) now = '陪在你身边';
    else if (p.d.inHome) now = `在${PP.HOME_NAME[p.d.species]}里 · ${(p.eco && p.eco.task && p.eco.task.label) || '休息'}`;
    else if (p.eco && p.eco.state === 'travel') now = `正在去${PP.SCENES[p.eco.task.scene] ? PP.SCENES[p.eco.task.scene].name : ''}的路上`;
    else if (p.ecoTask) now = `在${where} · ${p.ecoTask.label || ''}`;
    else if (p.eco && p.eco.task) now = `在${where} · ${p.eco.task.label || ''}`;
    else now = `在${where}`;
    const chrono = p.sp.chrono, awake = [];
    for (let i = 0; i < 24; i++) if (chrono[i] < 0.5) awake.push(i);
    const ranges = []; let st = null;
    for (let i = 0; i <= 24; i++) { const a = awake.includes(i % 24) && i < 24; if (a && st == null) st = i; if (!a && st != null) { ranges.push(`${st}点–${i}点`); st = null; } }
    const SN = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }, ys = SEASONAL[p.d.species] || {};
    const year = Object.keys(SN).map((k) => [SN[k], (ys[k] || []).map((o) => o.label).join('；') || (k === 'winter' && h.hibernate ? '冬眠，一觉睡到开春' : '照常过日子')]);
    return { year, home: `${PP.SCENES[h.home].name}的${PP.HOME_NAME[p.d.species]}`, about: h.about, likes: h.likes, hates: h.hates, diet: h.diet, now, active: ranges.join('、') || '随时', hibernate: !!h.hibernate };
  };

  // ---------- 开机：大家各就各位 ----------
  PP.eco.init = function () {
    for (const p of G.all) {
      if (!p.d.scene || !PP.SCENES[p.d.scene]) p.d.scene = homeScene(p);
      if (!HAB[p.d.species]) continue;
      const t = plan(p);
      // 直接到位（不用走过去）
      p.d.scene = t.scene && !t.friend ? t.scene : p.d.scene;
      if (t.home) { p.d.inHome = true; p.eco = { state: 'home', task: t, until: G.t + U.rand(10, t.dur || 60) }; p.sleeping = ['sleep', 'hibernate'].includes(t.why); }
      else { p.d.inHome = false; p.eco = { state: 'do', task: t, until: G.t + t.dur }; }
    }
  };
  // 新来的（领养）：先回家看看
  PP.eco.adopted = function (p) { p.d.scene = homeScene(p); p.d.inHome = false; p.eco = null; };
  PP.eco.nextHop = nextHop;
  PP.eco.plan = plan;
})();
