// 成长 + 小鱼干：让喂食、陪伴、专注都“有用”
// - 小鱼干：你在电脑前认真干活的时间、完成番茄钟、探险带回来的 —— 用来买零食、种子、家具、装扮、神秘蛋
// - 等级：吃饱喝足才长经验（你亲手喂的“吃得好”经验翻倍），零食直接加经验；升级解锁才艺、探险、装扮
// - 饿了不会死，只是没精神（不玩、不表演、不肯出门探险）
// - 探险：派一只出门 15 分钟～2 小时，带回特产、明信片、小鱼干、种子；收进图鉴；信箱里收信
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const A = PP.ACTIONS;

  // ---------- 目录 ----------
  // kind: snack 零食 / seed 种子 / crop 收成 / furn 家具（屋里）/ deco 摆设（岛上）/ hat 装扮 / egg 蛋
  const ITEMS = {
    biscuit: { kind: 'snack', name: '小饼干', price: 3, icon: 'bread', xp: 20, aff: 1, hunger: 30, desc: '香香脆脆，+20 经验' },
    jerky: { kind: 'snack', name: '肉干', price: 5, icon: 'meat', xp: 35, aff: 1.5, hunger: 40, desc: '嚼劲十足，+35 经验' },
    tuna: { kind: 'snack', name: '鱼罐头', price: 8, icon: 'fish', xp: 60, aff: 2, hunger: 60, desc: '大餐！+60 经验' },
    honey: { kind: 'snack', name: '蜂蜜水', price: 4, icon: 'drop', xp: 25, aff: 1, thirst: 60, desc: '甜甜的，解渴，+25 经验' },
    cake: { kind: 'snack', name: '小蛋糕', price: 20, icon: 'cake', xp: 150, aff: 5, hunger: 50, desc: '特别的日子吃，+150 经验，好感大涨' },

    s_carrot: { kind: 'seed', name: '胡萝卜种子', price: 2, icon: 'seed', crop: 'carrot', desc: '30 分钟成熟' },
    s_berry: { kind: 'seed', name: '草莓种子', price: 3, icon: 'seed', crop: 'berry', desc: '1 小时成熟' },
    s_corn: { kind: 'seed', name: '玉米种子', price: 4, icon: 'seed', crop: 'corn', desc: '1.5 小时成熟' },
    s_sun: { kind: 'seed', name: '向日葵种子', price: 4, icon: 'seed', crop: 'sunflower', desc: '2 小时开花' },
    s_pumpkin: { kind: 'seed', name: '南瓜种子', price: 6, icon: 'seed', crop: 'pumpkin', desc: '3 小时成熟，个头大' },
    s_tomato: { kind: 'seed', name: '番茄种子', price: 3, icon: 'seed', crop: 'tomato', desc: '45 分钟成熟' },
    s_cabbage: { kind: 'seed', name: '卷心菜种子', price: 3, icon: 'seed', crop: 'cabbage', desc: '1 小时成熟' },
    s_tulip: { kind: 'seed', name: '郁金香球茎', price: 5, icon: 'seed', crop: 'tulip', desc: '1.5 小时开花' },
    s_melon: { kind: 'seed', name: '西瓜种子', price: 8, icon: 'seed', crop: 'melon', desc: '4 小时成熟，又大又甜' },

    carrot: { kind: 'crop', name: '胡萝卜', sell: 4, icon: 'carrot', xp: 25, hunger: 30, desc: '自己种的，喂给它 +25 经验' },
    berry: { kind: 'crop', name: '草莓', sell: 6, icon: 'berry', xp: 40, hunger: 20, aff: 1, desc: '酸甜，+40 经验' },
    corn: { kind: 'crop', name: '玉米', sell: 8, icon: 'corn', xp: 50, hunger: 40, desc: '+50 经验' },
    sunflower: { kind: 'crop', name: '向日葵', sell: 9, icon: 'star', xp: 30, aff: 3, desc: '送给它，好感大涨' },
    pumpkin: { kind: 'crop', name: '南瓜', sell: 14, icon: 'melon', xp: 90, hunger: 60, desc: '+90 经验' },
    tomato: { kind: 'crop', name: '番茄', sell: 5, icon: 'berry', xp: 30, hunger: 25, desc: '+30 经验' },
    cabbage: { kind: 'crop', name: '卷心菜', sell: 6, icon: 'leaf', xp: 35, hunger: 35, desc: '+35 经验' },
    tulip: { kind: 'crop', name: '郁金香', sell: 10, icon: 'flower', xp: 20, aff: 3, desc: '送给它，好感大涨' },
    melon: { kind: 'crop', name: '西瓜', sell: 18, icon: 'melon', xp: 110, hunger: 60, thirst: 40, desc: '+110 经验，解渴' },

    bed: { kind: 'furn', name: '软软小床', price: 25, icon: 'moon', slot: 'bed', desc: '小屋里：困了会去床上睡' },
    rug: { kind: 'furn', name: '圆地毯', price: 12, icon: 'heart', slot: 'rug', desc: '小屋里：喜欢在上面打滚、踩奶' },
    lamp: { kind: 'furn', name: '暖光台灯', price: 15, icon: 'sun', slot: 'c1', desc: '小屋里：晚上亮起暖光' },
    plant: { kind: 'furn', name: '大盆栽', price: 10, icon: 'leaf', slot: 'c2', desc: '小屋里：绿绿的' },
    shelf: { kind: 'furn', name: '小书架', price: 22, icon: 'book', slot: 'c2', desc: '小屋里：会凑过去“看书”' },
    painting: { kind: 'furn', name: '挂画', price: 14, icon: 'star', slot: 'wall', desc: '小屋墙上：一幅小风景' },
    table: { kind: 'furn', name: '小书桌', price: 18, icon: 'bowl', slot: 'c1', desc: '小屋里：桌上一杯热可可' },
    piano: { kind: 'furn', name: '小钢琴', price: 45, icon: 'note', slot: 'c3', desc: '小屋里：会坐上去弹一曲' },
    rocker: { kind: 'furn', name: '摇椅', price: 16, icon: 'moon', slot: 'c3', desc: '小屋里：摇啊摇，打个盹' },

    bench: { kind: 'deco', name: '木长椅', price: 15, icon: 'friend', desc: '小岛上：会坐上去发呆' },
    swing: { kind: 'deco', name: '木秋千', price: 30, icon: 'heart', desc: '小岛上：会去荡秋千' },
    lampPost: { kind: 'deco', name: '小路灯', price: 12, icon: 'sun', desc: '小岛上：晚上亮灯' },
    scarecrow: { kind: 'deco', name: '稻草人', price: 10, icon: 'hay', desc: '小岛上：守着菜地' },
    hay: { kind: 'deco', name: '干草垛', price: 6, icon: 'hay', desc: '小岛上：可以趴上面晒太阳' },
    lantern: { kind: 'deco', name: '南瓜灯', price: 8, icon: 'melon', desc: '小岛上：秋天的味道' },
    flowers: { kind: 'deco', name: '花坛', price: 8, icon: 'flower', desc: '小岛上：一圈小花' },

    straw: { kind: 'hat', name: '草帽', price: 18, icon: 'sun', lv: 4, desc: '戴在头上（Lv4 解锁装扮）' },
    bow: { kind: 'hat', name: '蝴蝶结', price: 12, icon: 'heart', lv: 4, desc: '戴在头上' },
    beanie: { kind: 'hat', name: '毛线帽', price: 15, icon: 'cloud', lv: 4, desc: '冬天也暖暖的' },
    wreath: { kind: 'hat', name: '花环', price: 16, icon: 'flower', lv: 4, desc: '小花编的' },
    glasses: { kind: 'hat', name: '圆眼镜', price: 14, icon: 'book', lv: 4, desc: '看起来很有学问' },
    crown: { kind: 'hat', name: '小皇冠', price: 60, icon: 'star', lv: 10, desc: 'Lv10 才戴得上' },

    egg: { kind: 'egg', name: '神秘蛋', price: 80, icon: 'egg', desc: '孵 20 分钟，会出来一只新伙伴' },
  };
  const SHOP_TABS = [['snack', '零食'], ['seed', '种子'], ['furn', '家具'], ['deco', '摆设'], ['hat', '装扮'], ['egg', '蛋']];
  const CROPS = {
    carrot: { min: 30, item: 'carrot', n: [2, 3] },
    berry: { min: 60, item: 'berry', n: [2, 4] },
    corn: { min: 90, item: 'corn', n: [2, 3] },
    sunflower: { min: 120, item: 'sunflower', n: [1, 2] },
    pumpkin: { min: 180, item: 'pumpkin', n: [1, 2] },
    tomato: { min: 45, item: 'tomato', n: [2, 4] },
    cabbage: { min: 60, item: 'cabbage', n: [1, 2] },
    tulip: { min: 90, item: 'tulip', n: [2, 3] },
    melon: { min: 240, item: 'melon', n: [1, 2] },
  };
  // 每个地方的特产（图鉴）：[id, 名字, 图标, 稀有度 1 常见 / 2 少见 / 3 稀有]
  const SOUV = {
    forest: [['pinecone', '松果', 'seed', 1], ['acorn', '橡子', 'seed', 1], ['owlfeather', '猫头鹰羽毛', 'leaf', 3]],
    meadow: [['clover', '四叶草', 'leaf', 2], ['dandelion', '蒲公英', 'flower', 1], ['ladybug', '瓢虫徽章', 'butterfly', 2]],
    farm: [['egg', '新鲜鸡蛋', 'egg', 1], ['milk', '一瓶牛奶', 'drop', 1], ['horseshoe', '幸运马蹄铁', 'star', 3]],
    lake: [['pebble', '光滑石子', 'ball', 1], ['lotus', '睡莲花', 'flower', 2], ['goldfish', '小金鱼挂件', 'fish', 3]],
    mountain: [['edelweiss', '雪绒花', 'flower', 2], ['crystal', '山里的水晶', 'sparkle', 3], ['stone', '山石', 'ball', 1]],
    cave: [['glowshroom', '发光蘑菇', 'sparkle', 2], ['batbadge', '蝙蝠徽章', 'moon', 2], ['amber', '琥珀', 'star', 3]],
    snow: [['icicle', '冰棱', 'drop', 1], ['snowglobe', '雪花水晶球', 'sparkle', 3], ['mitten', '小手套', 'heart', 2]],
    antarctic: [['krill', '一包磷虾', 'shrimp', 1], ['penguinfeather', '企鹅羽毛', 'leaf', 2], ['aurora', '极光瓶', 'sparkle', 3]],
    desert: [['sandrose', '沙漠玫瑰石', 'flower', 2], ['date', '椰枣', 'berry', 1], ['scarab', '金甲虫', 'star', 3]],
    savanna: [['baobab', '猴面包果', 'apple', 1], ['zebra', '斑马纹围巾', 'note', 2], ['lionmane', '狮子鬃毛', 'star', 3]],
    jungle: [['mango', '芒果', 'apple', 1], ['parrot', '鹦鹉羽毛', 'leaf', 2], ['orchid', '兰花', 'flower', 3]],
    beach: [['shell', '贝壳', 'gift', 1], ['starfish', '海星', 'star', 2], ['bottle', '漂流瓶', 'drop', 3]],
    sea: [['coral', '珊瑚枝', 'kelp', 2], ['pearl', '珍珠', 'ball', 3], ['seaweed', '海带', 'kelp', 1]],
    skyisle: [['cloudcandy', '云朵棉花糖', 'cloud', 2], ['windmill', '小风车', 'sun', 1], ['balloon', '热气球票', 'star', 3]],
    academy: [['potion', '魔法药水', 'drop', 2], ['wand', '小魔杖', 'sparkle', 3], ['scroll', '咒语卷轴', 'book', 1]],
    undergrove: [['rootcharm', '树根护身符', 'leaf', 2], ['lightorb', '小光球', 'sparkle', 3], ['moss', '一团青苔', 'leaf', 1]],
  };
  // 探险能去哪：等级越高去得越远
  const TRIP_TIER = [
    [2, ['forest', 'meadow', 'farm', 'lake']],
    [5, ['mountain', 'cave', 'beach', 'desert', 'savanna', 'jungle', 'snow']],
    [7, ['sea', 'antarctic']],
    [8, ['skyisle', 'academy', 'undergrove']],
  ];
  const TRIP_DUR = [[15, 2], [30, 2], [60, 5], [120, 8]]; // [分钟, 需要的等级]
  // 升级解锁
  const UNLOCK = {
    2: '探险（附近的地方，15～30 分钟）', 3: '才艺：转圈圈', 4: '装扮（戴帽子）', 5: '探险：更远的地方、1 小时', 6: '才艺：后空翻',
    7: '探险：大海和南极', 8: '探险：「我的」三处、2 小时', 9: '才艺：鞠躬谢幕', 10: '小皇冠（商店）、金色名牌',
  };
  const TRICKS = [[3, 'spin', '转圈圈'], [6, 'flip', '后空翻'], [9, 'bow', '鞠躬谢幕']];

  // ---------- 存档 ----------
  function E() {
    const s = G.save; if (!s) return null;
    const e = (s.econ = s.econ || {});
    if (e.fish == null) e.fish = 6; // 开张送一点
    e.bag = e.bag || {}; e.owned = e.owned || {}; e.book = e.book || {}; e.cards = e.cards || []; e.mail = e.mail || [];
    e.farm = e.farm || []; while (e.farm.length < 6) e.farm.push(null);
    e.isleDeco = e.isleDeco || []; while (e.isleDeco.length < 6) e.isleDeco.push(null);
    e.room = e.room || {}; // slot -> furniture id
    e.today = e.today || { d: '', fish: 0 };
    e.activeMin = e.activeMin || 0;
    if (!e.welcomed) { e.welcomed = 1; e.bag.s_carrot = (e.bag.s_carrot || 0) + 2; e.bag.biscuit = (e.bag.biscuit || 0) + 2; }
    return e;
  }
  const save = () => PP.save && PP.save.soon();
  const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  // ---------- 小鱼干 ----------
  function addFish(n, why, quiet) {
    const e = E(); if (!e || !n) return;
    e.fish = Math.max(0, Math.round(e.fish + n));
    if (n > 0) { const p = PP.F && PP.F.main(); if (p && G.pets.includes(p)) PP.fx({ x: p.x, y: p.y - 34 * G.S, vy: -26, icon: 'fish', life: 1.4, s: Math.max(1, G.S - 1) }); }
    if (!quiet && why) PP.ui.toast(`+${n} 小鱼干（${why}）· 共 ${e.fish}`);
    save(); refreshOpen();
  }
  const give = (id, n = 1) => { const e = E(); e.bag[id] = (e.bag[id] || 0) + n; if (e.bag[id] <= 0) delete e.bag[id]; save(); };
  const has = (id) => (E().bag[id] || 0) > 0;

  // ---------- 等级 ----------
  const need = (lv) => 40 + lv * 35;
  function lvOf(p) { if (!p.d.lv) { p.d.lv = 1; p.d.xp = 0; } return p.d.lv; }
  function addXp(p, n, quiet) {
    if (!p || p.d.wild || !n) return;
    lvOf(p);
    p.d.xp = (p.d.xp || 0) + n;
    let up = false;
    while (p.d.lv < 30 && p.d.xp >= need(p.d.lv)) { p.d.xp -= need(p.d.lv); p.d.lv++; up = true; onLevel(p); }
    if (!quiet && G.pets.includes(p) && !up) PP.fx({ x: p.x + 10, y: p.y - 30 * G.S, vy: -20, icon: 'star', life: 1, s: 1 });
    save();
  }
  function onLevel(p) {
    const lv = p.d.lv, un = UNLOCK[lv];
    PP.ui.toast(`${p.name} 升到 Lv${lv} 啦！${un ? '解锁：' + un : ''}`, 'egg');
    PP.diary && PP.diary.add(p, `长大了一点，升到了 Lv${lv}。`, 'love');
    if (G.pets.includes(p) && !p.held && !(G.save.settings.quiet)) { p.interrupt(true); p.run('levelUp', A.levelUp); }
  }
  A.levelUp = function* () {
    const p = this; p.sleeping = false;
    p.eyes = 'happy'; p.mouth = 'open'; p.jolt(0, -5); PP.hearts && PP.hearts(p.x, p.y - 20 * G.S, 4);
    for (let i = 0; i < 6; i++) { PP.fx({ x: p.x + U.rand(-14, 14) * G.S / 2, y: p.y - U.rand(10, 30) * G.S, vy: -30, icon: 'sparkle', life: 1, s: 1 }); yield 0.12; }
    p.anim = 'dance'; yield 1.4; p.anim = 'idle'; p.eyes = 'open'; p.mouth = 'w';
  };
  const tricksOf = (p) => TRICKS.filter(([lv]) => lvOf(p) >= lv);
  // 没精神：太饿 / 太渴
  const listless = (p) => p.n.hunger < 20 || p.n.thirst < 20;

  // 新才艺
  A.spinTrick = function* () { const p = this; p.eyes = 'happy'; for (let i = 0; i < 10; i++) { p.facing = -p.facing; p.jolt(0, -1); yield 0.09; } p.mouth = 'open'; yield 0.6; p.mouth = 'w'; };
  A.flipTrick = function* () { const p = this; p.anim = 'crouch'; yield 0.35; p.anim = 'jump'; for (let i = 0; i < 10; i++) { p.jolt(0, -3); p.transform = i > 2 && i < 7 ? 'flipV' : null; yield 0.06; } p.transform = null; p.anim = 'land'; yield 0.3; p.anim = 'idle'; p.eyes = 'happy'; yield 0.8; };
  A.bowTrick = function* () { const p = this; p.anim = 'crouch'; p.eyes = 'closed'; yield 1; p.anim = 'idle'; p.eyes = 'happy'; p.think('heart', 1.2); yield 1; };
  const TRICK_ACT = { spin: A.spinTrick, flip: A.flipTrick, bow: A.bowTrick };
  // 双击时：会的才艺里挑一个（没精神时只是懒懒地看你一眼）
  const baseTrick = A.trick;
  A.trick = function* () {
    const p = this;
    if (!p.d.wild && listless(p)) { p.eyes = 'sleepy'; p.think('bowl', 2); p._forceSay = true; p.say(U.pick(['好饿…没力气表演…', '先给我点吃的嘛…', '渴了…']), 2.5); p._forceSay = false; yield 2; p.eyes = 'open'; return; }
    const tl = p.d.wild ? [] : tricksOf(p);
    if (tl.length && Math.random() < 0.65) { const [, k] = U.pick(tl); p.d.stats.tricks++; yield* TRICK_ACT[k].call(p); p.n.fun = Math.min(100, p.n.fun + 10); return; }
    yield* baseTrick.call(p);
  };

  // ---------- 喂食有用：亲手喂 = 吃得好（经验翻倍 40 分钟）+ 经验 ----------
  const baseFeed = PP.feedPet;
  PP.feedPet = function (p, what) {
    const before = { h: p.n.hunger, t: p.n.thirst };
    baseFeed(p, what);
    if (p.d.wild) return;
    const now = Date.now(), last = p.d.fedAt || 0;
    p.d.fedAt = now; p.d.nourish = now + 40 * 60000;
    const hungry = (what !== 'water' && before.h < 80) || (what !== 'food' && before.t < 80);
    if (now - last > 15 * 60000 || hungry) { addXp(p, hungry ? 8 : 4, true); if (G.pets.includes(p)) PP.fx({ x: p.x + 12, y: p.y - 32 * G.S, vy: -22, icon: 'star', life: 1.2, s: 1 }); }
  };
  // 用零食 / 收成喂
  function feedItem(p, id) {
    const it = ITEMS[id]; if (!it || !has(id) || !p) return false;
    give(id, -1);
    if (it.hunger) p.n.hunger = Math.min(100, p.n.hunger + it.hunger);
    if (it.thirst) p.n.thirst = Math.min(100, p.n.thirst + it.thirst);
    p.addAff && p.addAff(it.aff || 1);
    p.d.nourish = Date.now() + 40 * 60000;
    if (G.pets.includes(p) && !p.held) { p.interrupt(true); p.run('fed', A.fed, it.thirst && !it.hunger ? 'water' : 'food'); }
    addXp(p, it.xp || 10);
    PP.ui.toast(`${p.name} 吃了${it.name}：+${it.xp || 10} 经验`);
    return true;
  }

  // ---------- 装扮 ----------
  function wear(p, id) {
    if (!p) return;
    if (!id) { p.d.outfit = null; save(); return; }
    const it = ITEMS[id]; if (!it || !E().owned[id]) return;
    if (lvOf(p) < (it.lv || 4)) { PP.ui.toast(`${p.name} 要到 Lv${it.lv || 4} 才能戴${it.name}`); return; }
    p.d.outfit = id; save();
    if (G.pets.includes(p)) { p.think('heart', 1.5); }
  }

  // ---------- 商店 ----------
  function buy(id) {
    const it = ITEMS[id], e = E(); if (!it || !it.price) return;
    if (e.fish < it.price) { PP.ui.toast(`小鱼干不够（还差 ${it.price - e.fish}）`); return; }
    if ((it.kind === 'furn' || it.kind === 'deco' || it.kind === 'hat') && e.owned[id]) { PP.ui.toast('已经有啦'); return; }
    e.fish -= it.price;
    if (it.kind === 'furn' || it.kind === 'deco' || it.kind === 'hat') {
      e.owned[id] = 1;
      if (it.kind === 'furn') e.room[it.slot] = id; // 买了直接摆上
      if (it.kind === 'deco') { const k = e.isleDeco.indexOf(null); if (k >= 0) e.isleDeco[k] = id; }
      PP.isle && PP.isle.dirty();
    } else give(id, 1);
    PP.ui.toast(`买了${it.name}（剩 ${e.fish} 小鱼干）`);
    save(); refreshOpen();
  }
  function sell(id) { const it = ITEMS[id]; if (!it || !it.sell || !has(id)) return; give(id, -1); addFish(it.sell, '卖了' + it.name); }

  // ---------- 蛋 ----------
  function incubate() {
    const e = E(); if (!has('egg') || e.incub) return;
    give('egg', -1); e.incub = { start: Date.now(), end: Date.now() + 20 * 60000 };
    PP.ui.toast('神秘蛋开始孵啦（20 分钟）'); save(); refreshOpen();
  }
  function hatchCheck() {
    const e = E(); if (!e.incub || Date.now() < e.incub.end) return;
    e.incub = null;
    const mine = new Set(G.all.filter((p) => !p.d.wild).map((p) => p.d.species));
    const all = (PP.SPECIES_LIST || Object.keys(PP.SPECIES)).filter((k) => PP.SPECIES[k]);
    const pool = all.filter((k) => !mine.has(k));
    const sp = U.pick(pool.length ? pool : all);
    const p = PP.Pet.create(sp, null, PP.randomName());
    p.d.lv = 1; p.d.xp = 0;
    PP.addPet(p);
    if (G.pets.includes(p)) PP.petEmerge(p, U.rand(G.W * 0.3, G.W * 0.7));
    mail('蛋壳', `神秘蛋孵出来啦！是一只${PP.SPECIES[sp].name}，取名叫${p.name}。`, null);
    PP.ui.toast(`神秘蛋孵出来了：${PP.SPECIES[sp].name}「${p.name}」！`, 'egg');
    PP.diary && PP.diary.add(p, '从一颗神秘蛋里钻了出来。', 'love');
    save();
  }

  // ---------- 信箱 ----------
  function mail(from, text, extra) {
    const e = E();
    e.mail.unshift(Object.assign({ id: U.uid(), t: Date.now(), from, text, read: false }, extra || {}));
    if (e.mail.length > 40) e.mail.length = 40;
    badge(); save();
  }
  const unread = () => (E() ? E().mail.filter((m) => !m.read).length : 0);
  function badge() { PP.hud && PP.hud.refresh(); }

  // ---------- 探险 ----------
  const sceneName = (k) => (PP.SCENES[k] ? PP.SCENES[k].name : k);
  const tripPlaces = (p) => TRIP_TIER.filter(([lv]) => lvOf(p) >= lv).flatMap(([, l]) => l).filter((k) => PP.SCENES[k]);
  function canTrip(p) {
    if (!p || p.d.wild) return '只有认养的伙伴才能出门探险';
    if (p.d.trip) return '已经在外面了';
    if (lvOf(p) < 2) return 'Lv2 才能出门探险（多喂喂它）';
    if (listless(p) || p.n.hunger < 40 || p.n.thirst < 40) return '肚子饿 / 口渴，没力气出门（先喂饱它）';
    if (p.n.energy < 25) return '太困了，先睡一觉';
    return null;
  }
  function startTrip(p, to, min) {
    const why = canTrip(p); if (why) { PP.ui.toast(`${p.name}：${why}`); return false; }
    const now = Date.now();
    p.d.trip = { to, start: now, end: now + min * 60000, min };
    p.n.hunger = Math.max(0, p.n.hunger - 15); p.n.thirst = Math.max(0, p.n.thirst - 15);
    const go = () => { p.interrupt(true); p.held = false; PP.syncPets(); };
    if (G.pets.includes(p)) { p._forceSay = true; p.say(`我去${sceneName(to)}啦！`, 2); p._forceSay = false; setTimeout(() => (PP.petEnter ? PP.petEnter(p, go) : go()), 900); } else go();
    PP.diary && PP.diary.add(p, `出发去${sceneName(to)}探险（${min} 分钟）。`, 'normal');
    PP.ui.toast(`${p.name} 出发去${sceneName(to)}了，${min} 分钟后回来`);
    save(); refreshOpen();
    return true;
  }
  function tripCheck() {
    for (const p of G.all) {
      const t = p.d.trip; if (!t || Date.now() < t.end) continue;
      p.d.trip = null;
      const rew = rollTrip(p, t);
      const parts = [`${rew.fish} 条小鱼干`].concat(rew.souv.map((s) => s[1]));
      if (rew.seed) parts.push(ITEMS[rew.seed].name);
      if (rew.card) parts.push('一张明信片');
      if (rew.egg) parts.push('一颗神秘蛋！');
      mail(p.name, `我从${sceneName(t.to)}回来啦！带回了：${parts.join('、')}。`, { pet: p.d.id, card: rew.card ? E().cards[0].id : null });
      PP.diary && PP.diary.add(p, `从${sceneName(t.to)}探险回来，带回了${parts.join('、')}。`, 'love');
      addXp(p, Math.round(t.min * 0.8), true);
      p.addAff && p.addAff(1);
      PP.hereNow && PP.hereNow(p);
      PP.syncPets();
      if (G.pets.includes(p)) { PP.petEmerge && PP.petEmerge(p, U.rand(G.W * 0.3, G.W * 0.7)); setTimeout(() => { p._forceSay = true; p.say('我回来啦！看我带了什么～', 3); p._forceSay = false; }, 1800); }
      PP.ui.toast(`${p.name} 从${sceneName(t.to)}回来了，信箱里有它的信`, 'gift');
      E().fish += rew.fish;
      save(); refreshOpen();
    }
  }
  function rollTrip(p, t) {
    const e = E(), list = SOUV[t.to] || [], out = { fish: Math.round(t.min / 6 + U.rand(0, 3) + lvOf(p) * 0.3), souv: [] };
    const n = t.min >= 60 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const w = list.map((s) => [s, s[3] === 1 ? 6 : s[3] === 2 ? 3 : t.min >= 60 ? 1.6 : 0.8]);
      const s = U.weighted(w); if (!s) continue;
      out.souv.push(s); e.book[s[0]] = (e.book[s[0]] || 0) + 1;
    }
    if (Math.random() < (t.min >= 60 ? 1 : 0.7)) { out.card = true; e.cards.unshift({ id: U.uid(), scene: t.to, pet: p.d.id, sp: p.d.species, coat: p.d.coat, name: p.name, t: Date.now(), pose: U.pick(['idle', 'sit', 'dance', 'lie']) }); if (e.cards.length > 60) e.cards.length = 60; }
    if (Math.random() < 0.45) { out.seed = U.pick(Object.keys(ITEMS).filter((k) => ITEMS[k].kind === 'seed')); give(out.seed, 1); }
    if (t.min >= 120 && Math.random() < 0.15) { out.egg = true; give('egg', 1); }
    return out;
  }

  // ---------- 种地（小岛上的菜地） ----------
  function plant(i, seedId) {
    const e = E(), it = ITEMS[seedId]; if (!it || it.kind !== 'seed' || !has(seedId) || e.farm[i]) return false;
    give(seedId, -1);
    e.farm[i] = { crop: it.crop, t0: Date.now(), water: 0 };
    save(); return true;
  }
  function plotInfo(i) {
    const e = E(), pl = e.farm[i]; if (!pl) return null;
    const c = CROPS[pl.crop], dur = c.min * 60000 * (1 - Math.min(0.3, (pl.water || 0) * 0.1));
    const k = Math.min(1, (Date.now() - pl.t0) / dur);
    return { crop: pl.crop, k, stage: k >= 1 ? 3 : k > 0.55 ? 2 : k > 0.15 ? 1 : 0, left: Math.max(0, pl.t0 + dur - Date.now()) };
  }
  function harvest(i) {
    const e = E(), inf = plotInfo(i); if (!inf || inf.stage < 3) return false;
    const c = CROPS[inf.crop], n = Math.round(U.rand(c.n[0], c.n[1]));
    give(c.item, n); e.farm[i] = null;
    PP.ui.toast(`收获了 ${n} 个${ITEMS[c.item].name}！（在背包里：可以喂它，也可以卖成小鱼干）`, 'gift');
    save(); refreshOpen(); return true;
  }
  function waterPlot(i) { const pl = E().farm[i]; if (!pl || (pl.water || 0) >= 3) return false; pl.water = (pl.water || 0) + 1; save(); return true; }

  // ---------- 每分钟：认真干活攒小鱼干、吃饱喝足长经验、检查探险和孵蛋 ----------
  let lastMin = Date.now();
  function tick() {
    const e = E(); if (!e || !PP.started) return;
    const now = Date.now(); if (now - lastMin < 55000) return; lastMin = now;
    if (e.today.d !== dayKey()) e.today = { d: dayKey(), fish: 0 };
    const active = G.user && now - G.user.lastActive < 70000;
    if (active) {
      e.activeMin++;
      if (e.activeMin % 10 === 0 && e.today.fish < 36) { e.today.fish++; addFish(1, null, true); }
      // 吃饱喝足的伙伴长一点经验（你亲手喂过的翻倍）
      if (e.activeMin % 5 === 0) for (const p of G.all) if (!p.d.wild && !p.d.trip && p.n.hunger > 55 && p.n.thirst > 55) addXp(p, (p.d.nourish || 0) > now ? 2 : 1, true);
    }
    // 没精神：偶尔冒一个“饿”的念头（不打扰工作模式）
    if (!G.save.settings.quiet) for (const p of G.pets) if (!p.d.wild && listless(p) && !p.sleeping && !p.bubble && Math.random() < 0.25) p.think(p.n.hunger < 20 ? 'bowl' : 'drop', 2.5);
    tripCheck(); hatchCheck(); badge();
  }
  setInterval(() => { try { tick(); } catch (err) { console.warn('econ tick', err); } }, 5000);
  setInterval(() => { try { if (PP.started) { tripCheck(); hatchCheck(); } } catch (err) {} }, 15000);

  // 番茄钟完成：+6 小鱼干
  function onFocusDone(min) { const n = Math.max(2, Math.round((min || 25) / 4)); addFish(n, `专注了 ${min || 25} 分钟`); const p = PP.F && PP.F.main(); if (p) addXp(p, 10, true); }

  // 没精神：不去玩
  const baseDecide = PP.Pet && PP.Pet.prototype.decide;
  if (baseDecide) PP.Pet.prototype.decide = function () {
    if (!this.d.wild && listless(this) && !this.calm && Math.random() < 0.5) { this.run('idle', A.idle); this.eyes = 'sleepy'; return; }
    return baseDecide.call(this);
  };

  // =====================================================================
  // 面板：背包 / 商店 / 探险 / 图鉴 / 信箱
  // =====================================================================
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let open = null; // { el, tab, sub, pet }
  function icoCanvas(name, px = 20) {
    const [w, h] = PP.SPR.iconSize(name) || [8, 8], cv = document.createElement('canvas'), s = Math.max(1, Math.floor(px / Math.max(w, h)));
    cv.width = w * s; cv.height = h * s; const c = cv.getContext('2d'); PP.SPR.drawIcon(c, name, 0, 0, s); cv.className = 'ico'; return cv;
  }
  const mine = () => G.all.filter((p) => !p.d.wild);
  const fmtLeft = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} 小时 ${m % 60} 分` : `${m} 分钟`; };
  function petPick(sel) {
    const L = mine(); if (!L.length) return '<p class="muted">还没有认养的伙伴</p>';
    const cur = sel || (PP.F && PP.F.main() && !PP.F.main().d.wild ? PP.F.main().d.id : L[0].d.id);
    return `<div class="petpick">${L.map((p) => `<button class="chip ${p.d.id === cur ? 'on' : ''}" data-pet="${p.d.id}">${esc(p.name)} <small>Lv${lvOf(p)}${p.d.trip ? ' · 出门中' : ''}</small></button>`).join('')}</div>`;
  }
  function curPet() { const L = mine(); return L.find((p) => open && p.d.id === open.pet) || (PP.F && PP.F.main() && !PP.F.main().d.wild ? PP.F.main() : L[0]); }
  function lvBar(p) {
    const lv = lvOf(p), k = Math.min(1, (p.d.xp || 0) / need(lv));
    const nx = Object.keys(UNLOCK).map(Number).find((l) => l > lv);
    const st = listless(p) ? '<span class="warn">没精神：肚子饿 / 口渴</span>' : (p.d.nourish || 0) > Date.now() ? '<span class="good">吃得好：经验翻倍</span>' : '<span class="muted">亲手喂它，经验翻倍 40 分钟</span>';
    return `<div class="lvrow"><b>${esc(p.name)}</b> Lv${lv}<div class="xpbar"><i style="width:${(k * 100).toFixed(0)}%"></i></div><small>${p.d.xp || 0}/${need(lv)}</small></div><div class="lvsub">${st}${nx ? ` · Lv${nx} 解锁：${esc(UNLOCK[nx])}` : ''}</div>`;
  }
  function render() {
    if (!open || !open.el.isConnected) { open = null; return; }
    const e = E(), tab = open.tab, body = open.el.querySelector('.body');
    const tabs = [['bag', '背包'], ['shop', '商店'], ['trip', '探险'], ['book', '图鉴'], ['mail', `信箱${unread() ? '·' + unread() : ''}`], ['home', '小窝']];
    let h = `<div class="ecohead"><span class="fishc">${'<i class="fishico"></i>'} ${e.fish} 小鱼干</span><small class="muted">认真干活每 10 分钟 +1（今天 ${e.today.fish}/36）· 番茄钟 +6 · 探险带回</small></div>
      <div class="ecotabs">${tabs.map(([k, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div><div class="ecobody">`;
    const p = curPet();
    if (tab === 'bag') {
      const ids = Object.keys(e.bag).filter((k) => e.bag[k] > 0 && ITEMS[k]);
      h += (p ? lvBar(p) : '') + petPick(p && p.d.id);
      h += ids.length ? `<div class="grid items">${ids.map((k) => { const it = ITEMS[k]; const acts = it.kind === 'snack' || it.kind === 'crop' ? `<button class="small" data-feed="${k}">喂${p ? esc(p.name) : ''}</button>` : it.kind === 'seed' ? `<button class="small" data-goisle="1">去种</button>` : it.kind === 'egg' ? `<button class="small" data-incub="1" ${e.incub ? 'disabled' : ''}>孵蛋</button>` : ''; return `<div class="cell"><i data-ico="${it.icon}"></i><b>${esc(it.name)} ×${e.bag[k]}</b><small>${esc(it.desc || '')}</small><div>${acts}${it.sell ? `<button class="small" data-sell="${k}">卖 ${it.sell}</button>` : ''}</div></div>`; }).join('')}</div>` : '<p class="muted">背包空空的。去商店逛逛，或者派伙伴去探险。</p>';
      if (e.incub) h += `<p class="good">神秘蛋孵化中：还有 ${fmtLeft(e.incub.end - Date.now())}</p>`;
      const hats = Object.keys(e.owned).filter((k) => ITEMS[k] && ITEMS[k].kind === 'hat');
      if (p && hats.length) h += `<div class="sec">装扮 ${esc(p.name)}</div><div class="row">${['', ...hats].map((k) => `<button class="chip ${(p.d.outfit || '') === k ? 'on' : ''}" data-wear="${k}">${k ? esc(ITEMS[k].name) : '不戴'}</button>`).join('')}</div>`;
    } else if (tab === 'shop') {
      const sub = open.sub || 'snack';
      h += `<div class="row">${SHOP_TABS.map(([k, n]) => `<button class="chip ${sub === k ? 'on' : ''}" data-sub="${k}">${n}</button>`).join('')}</div>`;
      const ids = Object.keys(ITEMS).filter((k) => ITEMS[k].kind === sub && ITEMS[k].price);
      h += `<div class="grid items">${ids.map((k) => { const it = ITEMS[k], own = e.owned[k]; return `<div class="cell"><i data-ico="${it.icon}"></i><b>${esc(it.name)}</b><small>${esc(it.desc || '')}</small><div><button class="small ${e.fish >= it.price && !own ? '' : 'dim'}" data-buy="${k}" ${own ? 'disabled' : ''}>${own ? '已拥有' : it.price + ' 小鱼干'}</button>${(e.bag[k] || 0) ? `<small> 有 ${e.bag[k]}</small>` : ''}</div></div>`; }).join('')}</div>`;
    } else if (tab === 'trip') {
      const away = mine().filter((q) => q.d.trip);
      if (away.length) h += `<div class="sec">在外面的</div>${away.map((q) => `<div class="trip">${esc(q.name)} 在${esc(sceneName(q.d.trip.to))} · 还有 ${fmtLeft(q.d.trip.end - Date.now())}<div class="xpbar"><i style="width:${(Math.min(1, (Date.now() - q.d.trip.start) / (q.d.trip.end - q.d.trip.start)) * 100).toFixed(0)}%"></i></div></div>`).join('')}`;
      h += `<div class="sec">派谁出门</div>` + petPick(p && p.d.id);
      if (p) {
        const why = canTrip(p);
        if (why && !p.d.trip) h += `<p class="warn">${esc(p.name)}：${esc(why)}</p>`;
        if (!why) {
          const places = tripPlaces(p), dur = open.dur || 30, to = places.includes(open.to) ? open.to : places[0];
          h += `<div class="sec">去哪儿</div><div class="row wrap">${places.map((k) => `<button class="chip ${to === k ? 'on' : ''}" data-to="${k}">${esc(sceneName(k))}</button>`).join('')}</div>`;
          h += `<div class="sec">多久</div><div class="row">${TRIP_DUR.map(([m, l]) => `<button class="chip ${dur === m ? 'on' : ''}" data-dur="${m}" ${lvOf(p) < l ? 'disabled title="Lv' + l + ' 解锁"' : ''}>${m >= 60 ? m / 60 + ' 小时' : m + ' 分钟'}</button>`).join('')}</div>`;
          h += `<p class="muted">时间越长带回越多：1 小时以上一定有明信片、两件特产；2 小时有机会捡到神秘蛋。</p><button class="primary" data-go="${to}">出发！</button>`;
        }
      }
    } else if (tab === 'book') {
      const total = Object.values(SOUV).reduce((a, l) => a + l.length, 0), got = Object.keys(e.book).length;
      h += `<div class="sec">特产图鉴 ${got}/${total}</div><div class="book">${Object.entries(SOUV).filter(([k]) => PP.SCENES[k]).map(([k, l]) => `<div class="bk"><b>${esc(sceneName(k))}</b>${l.map(([id, n, ic, r]) => e.book[id] ? `<span class="sv r${r}" title="${esc(n)} ×${e.book[id]}"><i data-ico="${ic}"></i>${esc(n)}</span>` : `<span class="sv no" title="还没找到">？？？</span>`).join('')}</div>`).join('')}</div>`;
      h += `<div class="sec">明信片 ${e.cards.length}</div><div class="cards">${e.cards.slice(0, 24).map((c) => `<canvas class="card" data-card="${c.id}" width="156" height="72" title="${esc(c.name)} 在${esc(sceneName(c.scene))} · ${new Date(c.t).toLocaleDateString()}"></canvas>`).join('') || '<p class="muted">派伙伴去探险，会寄明信片回来。</p>'}</div>`;
    } else if (tab === 'mail') {
      h += e.mail.length ? e.mail.map((m) => `<div class="mailrow ${m.read ? '' : 'new'}"><b>${esc(m.from)}</b><small>${new Date(m.t).toLocaleString()}</small><p>${esc(m.text)}</p>${m.card ? `<canvas class="card" data-card="${m.card}" width="156" height="72"></canvas>` : ''}</div>`).join('') : '<p class="muted">信箱是空的。</p>';
      e.mail.forEach((m) => (m.read = true)); setTimeout(badge, 50); save();
    } else if (tab === 'home') {
      const furn = Object.keys(e.owned).filter((k) => ITEMS[k] && ITEMS[k].kind === 'furn'), deco = Object.keys(e.owned).filter((k) => ITEMS[k] && ITEMS[k].kind === 'deco');
      const SLOT = [['bed', '床位'], ['rug', '地上'], ['wall', '墙上'], ['c1', '窗边'], ['c2', '右墙边'], ['c3', '钢琴 / 摇椅']];
      h += `<p class="muted">小屋和小岛都在「小岛」视图里（视图按钮停留 → 收起时 → 小岛）。买来的家具会自动摆上，这里可以换着摆。</p>`;
      h += `<div class="sec">小屋里</div>${SLOT.map(([sl, n]) => { const opts = furn.filter((k) => ITEMS[k].slot === sl); return `<div class="row"><span class="lab">${n}</span>${['', ...opts].map((k) => `<button class="chip ${(e.room[sl] || '') === k ? 'on' : ''}" data-room="${sl}" data-f="${k}">${k ? esc(ITEMS[k].name) : '空着'}</button>`).join('')}</div>`; }).join('')}`;
      h += `<div class="sec">岛上的六个位置</div>${[0, 1, 2, 3, 4, 5].map((i) => `<div class="row"><span class="lab">${(PP.isle && PP.isle.SLOT_NAME || [])[i] || '位置' + (i + 1)}</span>${['', ...deco].map((k) => `<button class="chip ${(e.isleDeco[i] || '') === k ? 'on' : ''}" data-deco="${i}" data-f="${k}">${k ? esc(ITEMS[k].name) : '空着'}</button>`).join('')}</div>`).join('')}`;
      if (!furn.length && !deco.length) h += '<p class="muted">还没有家具：去商店的「家具」「摆设」看看。</p>';
    }
    h += '</div>';
    body.innerHTML = h;
    body.querySelectorAll('i[data-ico]').forEach((el) => el.replaceWith(icoCanvas(el.dataset.ico)));
    const fi = body.querySelector('.fishico'); if (fi) fi.replaceWith(icoCanvas('fish', 16));
    body.querySelectorAll('canvas.card').forEach((cv) => drawCard(cv, e.cards.find((c) => c.id === cv.dataset.card)));
  }
  function drawCard(cv, c) {
    if (!c) return;
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, cv.width, cv.height);
    try { ctx.drawImage(PP.scene.thumb(c.scene, 148, 52), 4, 4); } catch (err) {}
    try {
      const pal = PP.SPR.PAL[c.sp] && PP.SPR.PAL[c.sp][c.coat] ? PP.SPR.PAL[c.sp][c.coat] : null;
      const buf = PP.SPR.drawPet({ species: c.sp, pal, coatKey: c.coat, facing: 1, anim: c.pose || 'idle', t: 0, eyes: 'happy', mouth: 'w', look: [0, 0] });
      PP.SPR.blit(ctx, buf, 60, 20, 1);
    } catch (err) {}
    ctx.fillStyle = '#3b2a4c'; ctx.font = '10px sans-serif'; ctx.fillText(`${c.name} · ${sceneName(c.scene)}`, 6, 68);
    ctx.strokeStyle = '#e07a9a'; ctx.setLineDash([2, 2]); ctx.strokeRect(127.5, 54.5, 24, 14); ctx.setLineDash([]);
    ctx.fillStyle = '#e07a9a'; ctx.fillText('邮', 134, 66);
  }
  function openPanel(tab, opt = {}) {
    E();
    const el = PP.ui.panel('小鱼干 · 成长', '<div class="eco"></div>', { wide: true });
    el.classList.add('ecopanel');
    open = { el, tab: tab || 'bag', sub: opt.sub, pet: opt.pet || null, dur: 30, to: null };
    el.querySelector('.body').addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b || b.disabled) return;
      const d = b.dataset, p = curPet();
      if (d.tab) open.tab = d.tab;
      else if (d.sub) open.sub = d.sub;
      else if (d.pet) open.pet = d.pet;
      else if (d.buy) buy(d.buy);
      else if (d.sell) sell(d.sell);
      else if (d.feed) feedItem(p, d.feed);
      else if (d.incub) incubate();
      else if (d.wear != null) wear(p, d.wear || null);
      else if (d.to) open.to = d.to;
      else if (d.dur) open.dur = +d.dur;
      else if (d.go) { if (startTrip(p, d.go, open.dur || 30)) open.tab = 'trip'; }
      else if (d.room) { E().room[d.room] = d.f || null; PP.isle && PP.isle.dirty(); save(); }
      else if (d.deco != null) { E().isleDeco[+d.deco] = d.f || null; PP.isle && PP.isle.dirty(); save(); }
      else if (d.goisle) { PP.ui.closePanel(); PP.setMode('isle'); return; }
      render();
    });
    render();
  }
  function refreshOpen() { if (open && open.el.isConnected && open.tab !== 'mail') render(); }
  setInterval(() => { if (open && open.el.isConnected && (open.tab === 'trip' || open.tab === 'bag')) render(); }, 30000);

  PP.econ = { ITEMS, CROPS, SOUV, E, addFish, give, has, addXp, lvOf, need, listless, feedItem, wear, buy, sell, startTrip, canTrip, tripPlaces, plant, plotInfo, harvest, waterPlot, mail, unread, badge, openPanel, onFocusDone, tricksOf, UNLOCK };
})();
