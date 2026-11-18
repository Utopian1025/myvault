// 城堡里的生活：更多作物（按季节）、花房里的稀有植物、植物图鉴（每种 4 个生长阶段的精细像素画）、
// 厨房菜谱（用作物 / 鸡蛋 / 蜂蜜 / 小鱼干做菜）、便当（带去探险有加成）、工作间（用收成做摆设和装扮）、
// 种子从哪儿来：探险带回当地的稀有种子、在风景里散步偶尔捡到。
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G, A = PP.ACTIONS;
  const EC = PP.econ, I = EC.ITEMS, C = EC.CROPS, E = () => EC.E();
  const save = () => PP.save && PP.save.soon();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SN = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
  const season = () => { try { return (PP.env && PP.env.at && PP.env.at('forest').season) || 'summer'; } catch (e) { return 'summer'; } };
  const sceneName = (k) => (PP.SCENES && PP.SCENES[k] ? PP.SCENES[k].name : k);

  // ---------- 植物：菜园作物 + 花房稀有植物 ----------
  // shape：root 根茎 / leafy 叶菜 / vine 爬藤 / stalk 高秆 / bush 灌木 / flower 花 / cactus 仙人掌 / fern 蕨 / shroom 蘑菇 / tree 小树
  // c：[叶子深, 叶子浅, 果实 / 花, 果实暗面]；sea：当季；temp：花房里喜欢的温度
  const PL = {};
  const pl = (id, o) => (PL[id] = Object.assign({ id }, o));
  // 原有的 9 种
  pl('carrot', { name: '胡萝卜', shape: 'root', c: ['#3f8a44', '#7cc35a', '#f08a3a', '#c8602a'], sea: ['spring', 'autumn'], about: '埋在土里慢慢变甜，叶子像小羽毛。' });
  pl('berry', { name: '草莓', shape: 'bush', c: ['#3f8a44', '#6ab85a', '#e8405a', '#a82a40'], sea: ['spring'], flw: '#ffffff', about: '先开小白花，再结红红的果子。' });
  pl('corn', { name: '玉米', shape: 'stalk', c: ['#4c9a48', '#86cc6a', '#ffd36a', '#d8a030'], sea: ['summer'], about: '长得比主人还高，穗子一摇一摇。' });
  pl('sunflower', { name: '向日葵', shape: 'stalk', head: 'sun', c: ['#3f8a44', '#6ab85a', '#f6c43a', '#7a4a2a'], sea: ['summer'], about: '整天追着太阳转。' });
  pl('pumpkin', { name: '南瓜', shape: 'vine', ground: true, c: ['#3f8a44', '#6ab85a', '#f2832a', '#c05a1a'], sea: ['autumn'], about: '藤爬满一地，秋天结出大南瓜。' });
  pl('tomato', { name: '番茄', shape: 'vine', c: ['#3f8a44', '#6ab85a', '#e0402a', '#a02a1a'], sea: ['summer'], about: '要搭竹架子，一串一串地红。' });
  pl('cabbage', { name: '卷心菜', shape: 'leafy', c: ['#5a9a4a', '#a8d880', '#d8f0b0', '#8ab868'], sea: ['spring', 'autumn'], about: '一层层包得紧紧的。' });
  pl('tulip', { name: '郁金香', shape: 'flower', c: ['#3f8a44', '#6ab85a', '#f2608a', '#c03a5a'], sea: ['spring'], about: '春天第一批开的花。' });
  pl('melon', { name: '西瓜', shape: 'vine', ground: true, c: ['#3f8a44', '#6ab85a', '#3f8a44', '#245a2a'], stripe: '#9ad070', sea: ['summer'], about: '夏天的味道，切开是红瓤。' });
  // 新增的 13 种
  pl('potato', { name: '土豆', shape: 'root', round: true, c: ['#4c8a44', '#7cbc5a', '#d8b47a', '#a8844a'], sea: ['spring', 'autumn'], flw: '#e8d8f8', min: 50, n: [2, 4], sell: 5, xp: 30, hunger: 35, price: 3, about: '开淡紫色的小花，挖出来一串圆滚滚。' });
  pl('radish', { name: '小萝卜', shape: 'root', round: true, c: ['#4c9a48', '#86cc6a', '#e8506a', '#ffffff'], sea: ['spring', 'autumn', 'winter'], min: 25, n: [2, 4], sell: 3, xp: 18, hunger: 15, price: 2, about: '长得最快的菜，红皮白肉，脆脆的。' });
  pl('pea', { name: '豌豆', shape: 'vine', c: ['#4c9a48', '#a0dc78', '#7cc35a', '#4c8a3a'], sea: ['spring'], flw: '#f2b6d0', min: 50, n: [3, 5], sell: 4, xp: 22, hunger: 15, price: 2, about: '卷须会抓住架子往上爬，豆荚里排着一列小绿豆。' });
  pl('eggplant', { name: '茄子', shape: 'bush', long: true, c: ['#3f7a44', '#6aa858', '#7a4ab0', '#4a2a78'], sea: ['summer'], flw: '#c8a0f0', min: 70, n: [2, 3], sell: 7, xp: 40, hunger: 35, price: 4, about: '紫得发亮，花也是紫色的。' });
  pl('pepper', { name: '彩椒', shape: 'bush', c: ['#3f8a44', '#6ab85a', '#f0c030', '#e0602a'], sea: ['summer'], flw: '#ffffff', min: 80, n: [2, 4], sell: 7, xp: 35, hunger: 25, price: 4, about: '先绿后黄再变红，一株上三种颜色。' });
  pl('onion', { name: '洋葱', shape: 'root', round: true, tall: true, c: ['#4c9a48', '#86cc6a', '#e8c8a8', '#b88a5a'], sea: ['autumn', 'winter'], min: 60, n: [2, 3], sell: 5, xp: 20, hunger: 20, price: 3, about: '叶子是空心的管子。切的时候会流眼泪。' });
  pl('wheat', { name: '小麦', shape: 'stalk', head: 'ear', c: ['#6a9a48', '#a8c870', '#e8c860', '#c8a040'], sea: ['summer', 'autumn'], min: 100, n: [3, 5], sell: 6, xp: 20, hunger: 20, price: 3, about: '风一吹一片金浪。磨成面粉能做松饼。' });
  pl('rice', { name: '稻子', shape: 'stalk', head: 'ear', droop: true, c: ['#5a9a48', '#9ac870', '#f0d878', '#c8a850'], sea: ['summer', 'autumn'], min: 130, n: [3, 5], sell: 7, xp: 25, hunger: 30, price: 4, about: '稻穗越饱满头垂得越低。' });
  pl('blueberry', { name: '蓝莓', shape: 'bush', c: ['#3f7a50', '#6aa868', '#4a6ad0', '#2a3a90'], sea: ['summer'], flw: '#f4f0e6', min: 110, n: [3, 5], sell: 9, xp: 45, hunger: 15, aff: 1, price: 5, about: '小铃铛一样的白花，结一簇簇蓝果子。' });
  pl('grape', { name: '葡萄', shape: 'vine', bunch: true, c: ['#4c8a44', '#7cbc5a', '#8a4ab0', '#5a2a80'], sea: ['autumn'], min: 150, n: [2, 3], sell: 12, xp: 60, thirst: 30, hunger: 15, price: 6, about: '爬满棚架，秋天一串串垂下来。' });
  pl('lavender', { name: '薰衣草', shape: 'bush', spike: true, c: ['#5a8a6a', '#8ab890', '#a888d8', '#7a5ab0'], sea: ['summer'], min: 90, n: [2, 4], sell: 8, xp: 20, aff: 2, price: 4, about: '香香的紫色花穗，蜜蜂最喜欢。' });
  pl('rose', { name: '玫瑰', shape: 'flower', bush: true, c: ['#3f7a44', '#6aa858', '#e0304a', '#a01a3a'], sea: ['spring', 'summer'], min: 120, n: [1, 3], sell: 12, xp: 25, aff: 4, price: 6, about: '有刺，但花开得特别好看。送给它好感大涨。' });
  pl('tea', { name: '茶树', shape: 'bush', c: ['#2f6a3a', '#5aa64e', '#9ad070', '#5aa64e'], sea: ['spring'], flw: '#ffffff', min: 140, n: [2, 4], sell: 9, xp: 20, thirst: 30, price: 5, about: '摘最嫩的两片叶子泡茶。' });
  // 花房里的稀有植物：只能从外面带回种子
  pl('moonfern', { name: '月光蕨', rare: true, shape: 'fern', c: ['#2f6a5a', '#5aa68e', '#cfeaff', '#8ac8e8'], from: 'forest', temp: 'cool', min: 120, about: '老林子深处的蕨，夜里叶尖会发微光。' });
  pl('bellflower', { name: '风铃草', rare: true, shape: 'flower', bell: true, c: ['#3f8a44', '#6ab85a', '#8a9af0', '#5a6ad0'], from: 'meadow', temp: 'mild', min: 90, about: '风一吹，像一串小铃铛在摇。' });
  pl('lotus', { name: '睡莲', rare: true, shape: 'flower', water: true, c: ['#3f8a5a', '#6ab87a', '#f8b8d0', '#e08aa8'], from: 'lake', temp: 'warm', min: 150, about: '要种在水盆里。白天开，傍晚合上。' });
  pl('edelweiss', { name: '雪绒花', rare: true, shape: 'flower', star: true, c: ['#7a9a7a', '#b8ccb0', '#f8f8f0', '#d8d8c8'], from: 'mountain', temp: 'cool', min: 140, about: '长在高山石缝里，花瓣毛茸茸的。' });
  pl('cactus', { name: '月下仙人掌', rare: true, shape: 'cactus', c: ['#3f8a54', '#7cc36a', '#ff8ab0', '#e05a8a'], from: 'desert', temp: 'warm', min: 180, about: '很少开花，一开就是一整夜。' });
  pl('orchid', { name: '兰花', rare: true, shape: 'flower', orchid: true, c: ['#3f7a44', '#6aa858', '#f0a8e8', '#c060b8'], from: 'jungle', temp: 'warm', min: 160, about: '雨林里挂在树上长的花，怕冷。' });
  pl('seagrape', { name: '海葡萄', rare: true, shape: 'vine', bunch: true, c: ['#3f8a6a', '#6ab88a', '#5ac8a8', '#2a8a7a'], from: 'beach', temp: 'warm', min: 100, about: '海边的藻，一颗颗像绿珍珠，咬起来会爆。' });
  pl('snowdrop', { name: '雪滴花', rare: true, shape: 'flower', bell: true, c: ['#4c8a5a', '#7cb88a', '#ffffff', '#d8e8f0'], from: 'snow', temp: 'cool', min: 110, about: '雪还没化就从雪里钻出来开花。' });
  pl('glowshroom', { name: '荧光蘑菇', rare: true, shape: 'shroom', c: ['#5a6a8a', '#8a9ab8', '#7af0d8', '#3ab8a8'], from: 'cave', temp: 'cool', min: 90, about: '山洞里的蘑菇，晚上会发出青绿色的光。' });
  pl('baobab', { name: '猴面包树苗', rare: true, shape: 'tree', c: ['#4c8a44', '#86cc6a', '#c8a07a', '#8a6a4a'], from: 'savanna', temp: 'warm', min: 200, about: '长大了树干又粗又胖，能存很多水。' });
  pl('cloudflower', { name: '云朵花', rare: true, shape: 'flower', puff: true, c: ['#6a9ab8', '#a8c8e0', '#ffffff', '#d8e8f8'], from: 'skyisle', temp: 'mild', min: 130, about: '开出来像一小团云，会慢慢飘起来一点点。' });
  pl('starlily', { name: '星星百合', rare: true, shape: 'flower', star: true, c: ['#3f6a8a', '#6a9ab8', '#ffe070', '#f0a830'], from: 'academy', temp: 'mild', min: 160, about: '魔法学院后院的花，花心里有一颗小星星。' });
  pl('mossball', { name: '青苔球', rare: true, shape: 'shroom', moss: true, c: ['#3f7a3a', '#6aa858', '#86cc6a', '#4c8a44'], from: 'undergrove', temp: 'mild', min: 80, about: '地下森林里圆滚滚的青苔，摸起来软软的。' });
  const PLANTS = Object.keys(PL), CROPS_IDS = PLANTS.filter((k) => !PL[k].rare), RARE_IDS = PLANTS.filter((k) => PL[k].rare);
  const ICON_OF = { root: 'carrot', bush: 'berry', vine: 'melon', stalk: 'corn', leafy: 'leaf', flower: 'flower', cactus: 'leaf', fern: 'leaf', shroom: 'sparkle', tree: 'leaf' };
  // 把新作物登记进商店 / 背包 / 菜地
  for (const id of CROPS_IDS) {
    const P = PL[id];
    if (!I[id]) I[id] = { kind: 'crop', name: P.name, sell: P.sell, icon: ICON_OF[P.shape], xp: P.xp, hunger: P.hunger, thirst: P.thirst, aff: P.aff, desc: `自己种的${P.name}，+${P.xp} 经验` };
    if (!C[id]) C[id] = { min: P.min, item: id, n: P.n };
    const sid = Object.keys(I).find((k) => I[k].kind === 'seed' && I[k].crop === id) || 's_' + id;
    if (!I[sid]) I[sid] = { kind: 'seed', name: P.name + '种子', price: P.price, icon: 'seed', crop: id, desc: '' };
    I[sid].desc = `${C[id].min >= 60 ? C[id].min / 60 + ' 小时' : C[id].min + ' 分钟'}成熟 · 当季：${P.sea.map((x) => SN[x]).join('')}`;
    P.seed = sid;
  }
  for (const id of RARE_IDS) {
    const P = PL[id];
    I['r_' + id] = { kind: 'rseed', name: P.name + '种子', icon: 'seed', plant: id, desc: `稀有：从${sceneName(P.from)}带回来的，要种在花房里` };
    I['p_' + id] = { kind: 'crop', name: P.name, sell: 20, icon: 'flower', xp: 40, aff: 4, desc: `花房里种出来的${P.name}，送给它好感大涨，也能拿去做菜` };
    P.seed = 'r_' + id;
  }
  // 当季长得快一点，反季慢一点
  PP.cropSpeed = (id) => { const P = PL[id]; if (!P || !P.sea) return 1; return P.sea.includes(season()) ? 0.85 : 1.25; };

  // ---------- 植物图鉴：记下见过哪些阶段 ----------
  function L0() { const e = E(); e.pdex = e.pdex || {}; e.gh = e.gh || { pots: [null, null, null, null], temp: 'mild' }; while (e.gh.pots.length < 4) e.gh.pots.push(null); return e; }
  function seen(id, st) { const e = L0(), d = (e.pdex[id] = e.pdex[id] || { st: -1, n: 0 }); if (st > d.st) { d.st = st; save(); } }
  function harvested(id, n) { const e = L0(), d = (e.pdex[id] = e.pdex[id] || { st: -1, n: 0 }); d.st = 3; d.n += n || 1; save(); }
  const baseHarvest = EC.harvest;
  EC.harvest = function (i) { const inf = EC.plotInfo(i); const ok = baseHarvest(i); if (ok && inf) harvested(inf.crop); return ok; };
  setInterval(() => { try { if (!PP.started || !E()) return; E().farm.forEach((_, i) => { const inf = EC.plotInfo(i); if (inf) seen(inf.crop, inf.stage); }); ghTick(); } catch (e) {} }, 20000);

  // ---------- 花房：4 个大花盆、一个暖气阀门 ----------
  const TEMPS = [['cool', '凉爽'], ['mild', '温和'], ['warm', '暖和']];
  function ghTick() {
    const e = L0(), now = Date.now();
    e.gh.pots.forEach((pt) => {
      if (!pt) return; const P = PL[pt.id]; const dt = Math.min(now - (pt.tl || now), 6 * 3600000); pt.tl = now;
      const wet = now < (pt.wet || 0), tempOk = e.gh.temp === P.temp, sp = (wet ? 1 : 0.25) * (tempOk ? 1 : 0.5);
      if (pt.g < 0.55 || pt.pol) pt.g = Math.min(1, pt.g + (dt * sp) / (P.min * 60000));
      else if (!pt.pol && e.econBees !== false && Math.random() < dt / (40 * 60000)) pt.pol = 'bee'; // 蜜蜂飞进来帮忙授粉
      seen(pt.id, potStage(pt));
    });
  }
  const potStage = (pt) => (pt.g >= 1 ? 3 : pt.g >= 0.55 ? 2 : pt.g >= 0.15 ? 1 : 0);
  function potInfo(i) { const e = L0(), pt = e.gh.pots[i]; if (!pt) return null; ghTick(); const P = PL[pt.id]; return { id: pt.id, name: P.name, stage: potStage(pt), g: pt.g, wet: Date.now() < (pt.wet || 0), pol: !!pt.pol, tempOk: e.gh.temp === P.temp, temp: P.temp }; }
  function potSow(i, id) { const e = L0(); if (e.gh.pots[i] || !EC.has('r_' + id)) return false; EC.give('r_' + id, -1); e.gh.pots[i] = { id, g: 0, tl: Date.now(), wet: 0, pol: false }; seen(id, 0); save(); return true; }
  function potWater(i) { const e = L0(), pt = e.gh.pots[i]; if (!pt) return false; ghTick(); pt.wet = Date.now() + 12 * 3600000; save(); return true; }
  function potPollinate(i) { const pt = L0().gh.pots[i]; if (!pt || potStage(pt) !== 2 || pt.pol) return false; pt.pol = 'paw'; save(); return true; }
  function potHarvest(i) {
    const e = L0(), pt = e.gh.pots[i]; if (!pt || potStage(pt) < 3) return false;
    const P = PL[pt.id], fl = 1 + (Math.random() < 0.5 ? 1 : 0), sd = 1 + (Math.random() < 0.4 ? 1 : 0);
    EC.give('p_' + pt.id, fl); EC.give('r_' + pt.id, sd); e.gh.pots[i] = null; harvested(pt.id, fl);
    PP.ui.toast(`花房收获：${fl} 朵${P.name}，还结了 ${sd} 颗种子！`, 'gift'); if (PP.quest) PP.quest.on('harvest'); save(); return true;
  }
  function setTemp(t) { L0().gh.temp = t; ghTick(); save(); }
  const ghKey = () => { const e = L0(); return e.gh.temp + '|' + e.gh.pots.map((pt) => (pt ? pt.id + potStage(pt) + (Date.now() < (pt.wet || 0) ? 'w' : '') : '-')).join(','); };

  // ---------- 种子从哪儿来 ----------
  const RARE_OF = {}; for (const id of RARE_IDS) RARE_OF[PL[id].from] = id;
  function findSeed(scene, who, rareCh) {
    const r = RARE_OF[scene] && Math.random() < rareCh ? RARE_OF[scene] : null;
    const sid = r ? 'r_' + r : PL[U.pick(CROPS_IDS.filter((k) => PL[k].sea.includes(season())))].seed;
    EC.give(sid, 1); return sid;
  }
  // 便当的加成 + 带回当地的稀有种子
  PP.tripBonus = (p, t, out) => {
    out.extra = out.extra || [];
    const b = t.bento && DISH[t.bento.replace(/^d_/, '')], eff = b ? b.trip : null;
    if (eff === 'fish') { const add = Math.max(2, Math.round(out.fish * 0.6)); out.fish += add; out.extra.push(`（便当加成）多 ${add} 条小鱼干`); }
    if (eff === 'souv') { const list = (EC.SOUV[t.to] || []); const s = U.pick(list); if (s) { out.souv.push(s); E().book[s[0]] = (E().book[s[0]] || 0) + 1; } }
    if (eff === 'xp') { EC.addXp(p, Math.round(t.min * 0.8), true); out.extra.push('（便当加成）经验翻倍'); }
    const rareCh = eff === 'seed' ? 1 : t.min >= 60 ? 0.6 : 0.35;
    if (RARE_OF[t.to] && Math.random() < rareCh) { EC.give('r_' + RARE_OF[t.to], 1); out.extra.push(I['r_' + RARE_OF[t.to]].name + '（稀有，种在花房）'); }
    else if (eff === 'seed') { const sid = findSeed(t.to, p, 0); out.extra.push(I[sid].name); }
    if (eff === 'luck' && Math.random() < 0.5) { EC.give('egg', 1); out.extra.push('一颗神秘蛋（便当的好运）'); }
    if (b) out.extra.push(`吃光了便当「${b.name}」`);
  };
  // 风景里散步：偶尔低头捡到一颗种子（每分钟看一次）
  setInterval(() => {
    try {
      if (!PP.started || !G.save || !PP.scene || !PP.scene.active || !PP.scene.active()) return;
      const p = PP.F && PP.F.main(); if (!p || !G.pets.includes(p) || p.held || p.sleeping) return;
      const d = (L0().seedDay = L0().seedDay || { d: '', n: 0 }), today = new Date().toDateString(); if (d.d !== today) { d.d = today; d.n = 0; }
      if (d.n >= 4 || Math.random() > 0.05) return;
      const sc = PP.scene.view(), sid = findSeed(sc, p, 0.3); d.n++;
      p.think('sparkle', 1.6); p._forceSay = true; p.say(`咦，捡到一颗${I[sid].name}！`, 3); p._forceSay = false;
      PP.ui.toast(`${p.name}在${sceneName(sc)}散步，捡到一颗${I[sid].name}（在背包里）`, 'gift'); save();
    } catch (e) {}
  }, 60000);

  // ---------- 菜谱 ----------
  // need：{物品: 个数, fish: 小鱼干}；eff：吃了以后；trip：当便当带出门的加成
  const DISH = {};
  const dish = (id, o) => { DISH[id] = Object.assign({ id }, o); I['d_' + id] = { kind: 'dish', name: o.name, icon: o.icon, xp: o.xp, hunger: o.hunger, thirst: o.thirst, aff: o.aff, energy: o.energy, desc: o.desc }; };
  const TRIPN = { fish: '多带回一半小鱼干', souv: '多一件特产', seed: '一定带回当地的稀有种子', xp: '经验翻倍', luck: '一半机会捡到神秘蛋' };
  dish('carrotsoup', { name: '胡萝卜浓汤', icon: 'bowl', need: { carrot: 2 }, hunger: 50, xp: 70, trip: 'xp', desc: '暖暖的一碗，喝完浑身是劲' });
  dish('tomatoegg', { name: '番茄炒蛋', icon: 'bowl', need: { tomato: 2, henegg: 1 }, hunger: 55, xp: 80, aff: 1, trip: 'fish', desc: '家常味道' });
  dish('mash', { name: '土豆泥', icon: 'bowl', need: { potato: 2 }, hunger: 50, xp: 60, trip: 'souv', desc: '绵绵软软，配什么都好吃' });
  dish('salad', { name: '田园沙拉', icon: 'leaf', need: { cabbage: 1, tomato: 1, radish: 1 }, hunger: 35, thirst: 20, xp: 70, trip: 'seed', desc: '三种菜拌在一起，清清爽爽' });
  dish('grilledfish', { name: '烤鱼', icon: 'fish', need: { fish: 4 }, hunger: 60, xp: 90, trip: 'fish', desc: '用 4 条小鱼干烤的，香喷喷' });
  dish('fishsoup', { name: '奶白鱼汤', icon: 'bowl', need: { fish: 3, cabbage: 1 }, hunger: 45, thirst: 30, xp: 85, trip: 'luck', desc: '熬得奶白奶白的' });
  dish('pancake', { name: '蜂蜜松饼', icon: 'bread', need: { wheat: 2, henegg: 1, honeyjar: 1 }, hunger: 55, xp: 130, aff: 2, trip: 'luck', desc: '一层层叠起来，淋上自己岛上的蜂蜜' });
  dish('onigiri', { name: '饭团', icon: 'bread', need: { rice: 2, fish: 1 }, hunger: 50, xp: 75, trip: 'souv', desc: '最适合带出门的便当' });
  dish('pumpkinpie', { name: '南瓜派', icon: 'cake', need: { pumpkin: 1, henegg: 1, wheat: 1 }, hunger: 60, xp: 150, aff: 3, trip: 'xp', desc: '秋天限定的大餐' });
  dish('berrycake', { name: '草莓蛋糕', icon: 'cake', need: { berry: 3, henegg: 1, wheat: 1 }, hunger: 45, xp: 160, aff: 5, trip: 'luck', desc: '特别的日子做一个' });
  dish('cornsoup', { name: '玉米浓汤', icon: 'bowl', need: { corn: 2, potato: 1 }, hunger: 55, xp: 90, trip: 'fish', desc: '甜甜的，喝完暖和' });
  dish('ratatouille', { name: '烤时蔬', icon: 'bowl', need: { eggplant: 1, pepper: 1, onion: 1 }, hunger: 50, xp: 100, trip: 'seed', desc: '茄子、彩椒、洋葱一起烤' });
  dish('melonslush', { name: '西瓜冰沙', icon: 'drop', need: { melon: 1, honeyjar: 1 }, thirst: 80, xp: 90, aff: 2, trip: 'xp', desc: '夏天一口下去透心凉' });
  dish('grapejuice', { name: '葡萄汁', icon: 'drop', need: { grape: 2 }, thirst: 70, xp: 70, trip: 'souv', desc: '鲜榨的，紫紫的' });
  dish('blueberryjam', { name: '蓝莓果酱面包', icon: 'bread', need: { blueberry: 2, wheat: 1 }, hunger: 40, xp: 95, trip: 'seed', desc: '果酱是自己熬的' });
  dish('lavendertea', { name: '薰衣草奶茶', icon: 'drop', need: { lavender: 1, tea: 1 }, thirst: 60, xp: 60, aff: 3, energy: 30, trip: 'luck', desc: '喝完心情很平静，困的时候提提神' });
  dish('peasoup', { name: '豌豆汤', icon: 'bowl', need: { pea: 3 }, hunger: 40, xp: 65, trip: 'fish', desc: '绿油油的一碗' });
  dish('flowerjelly', { name: '花瓣果冻', icon: 'cake', need: { rose: 1, honeyjar: 1 }, hunger: 20, xp: 120, aff: 6, trip: 'luck', desc: '玫瑰花瓣冻在里面，舍不得吃' });
  dish('seagrapebowl', { name: '海葡萄盖饭', icon: 'bowl', need: { p_seagrape: 1, rice: 1 }, hunger: 60, xp: 180, aff: 3, trip: 'seed', desc: '用花房里种的海葡萄做的稀有料理' });
  dish('glowstew', { name: '荧光蘑菇炖菜', icon: 'bowl', need: { p_glowshroom: 1, potato: 1, onion: 1 }, hunger: 65, xp: 200, energy: 40, trip: 'luck', desc: '吃完晚上身上会微微发光（？）' });
  // 吃菜：多一个“体力”效果
  const baseFeed = EC.feedItem;
  EC.feedItem = function (p, id) { const it = I[id]; const ok = baseFeed(p, id); if (ok && it && it.energy && p) p.n.energy = Math.min(100, p.n.energy + it.energy); if (ok && it && it.kind === 'dish' && p) { (L0().ate = L0().ate || {})[id] = 1; } return ok; };
  const have = (k) => (k === 'fish' ? E().fish : E().bag[k] || 0);
  const canCook = (d) => Object.entries(d.need).every(([k, n]) => have(k) >= n);
  const needTxt = (d) => Object.entries(d.need).map(([k, n]) => { const nm = k === 'fish' ? '小鱼干' : I[k] ? I[k].name : k, ok = have(k) >= n; return `<span class="${ok ? 'good' : 'warn'}">${esc(nm)} ${have(k)}/${n}</span>`; }).join(' ');
  function cook(id) {
    const d = DISH[id]; if (!d || !canCook(d)) { PP.ui.toast('材料不够'); return false; }
    for (const [k, n] of Object.entries(d.need)) { if (k === 'fish') E().fish -= n; else EC.give(k, -n); }
    EC.give('d_' + id, 1); const e = L0(); (e.cooked = e.cooked || {})[id] = (e.cooked[id] || 0) + 1;
    if (PP.quest) PP.quest.on('cook');
    const p = PP.F && PP.F.main();
    if (p && G.isle && PP.isle && PP.isle.cookAnim) PP.isle.cookAnim(p, d.name);
    PP.ui.toast(`做好了「${d.name}」，放进背包了（可以喂它，也可以当便当带出门）`, 'gift'); save(); return true;
  }

  // ---------- 工作间：用收成做东西 ----------
  const CRAFT = [
    { id: 'straw', need: { wheat: 4 }, desc: '用麦秆编一顶草帽' },
    { id: 'wreath', need: { tulip: 2, rose: 1 }, desc: '郁金香和玫瑰编的花环' },
    { id: 'hay', need: { wheat: 3, rice: 2 }, desc: '晒干的麦秆和稻草堆成垛' },
    { id: 'lantern', need: { pumpkin: 1 }, desc: '把南瓜掏空刻个笑脸' },
    { id: 'flowers', need: { tulip: 2, lavender: 2 }, desc: '一圈小花坛' },
    { id: 'scarecrow', need: { wheat: 3, corn: 1 }, desc: '稻草人' },
    { id: 'bench', need: { fish: 6, wheat: 2 }, desc: '木长椅（木料用小鱼干换）' },
  ];
  function craft(i) {
    const c = CRAFT[i], it = I[c.id], e = E(); if (!c || !it) return;
    if (e.owned[c.id]) { PP.ui.toast('已经有啦'); return; }
    if (!Object.entries(c.need).every(([k, n]) => have(k) >= n)) { PP.ui.toast('材料不够'); return; }
    for (const [k, n] of Object.entries(c.need)) { if (k === 'fish') e.fish -= n; else EC.give(k, -n); }
    e.owned[c.id] = 1; if (it.kind === 'deco') { const k = e.isleDeco.indexOf(null); if (k >= 0) e.isleDeco[k] = c.id; PP.isle && PP.isle.dirty(); }
    PP.ui.toast(`工作间里做好了「${it.name}」！`, 'gift'); save();
  }

  // ---------- 植物的像素画：24×24，4 个阶段（种子 / 发芽 / 长大开花 / 结果） ----------
  const artCache = {};
  function art(id, st) {
    const key = id + st; if (artCache[key]) return artCache[key];
    const P = PL[id], W = 24, H = 24, px = new Array(W * H).fill(null), cs = P.c;
    const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H && c) px[y * W + x] = c; };
    const rect = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c); };
    const ell = (cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny <= 1) set(x, y, typeof fn === 'function' ? fn(nx, ny) : fn); } };
    const sh = (a, b) => (nx, ny) => (nx + ny < -0.6 ? lighten(a) : nx + ny > 0.5 ? b : a);
    const line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c); };
    const leaf = (x, y, dx, dy, len, c, c2) => { for (let i = 0; i < len; i++) { const t = i / len, w = Math.sin(t * Math.PI) * 1.4; set(x + dx * i, y + dy * i, c2 || c); if (w > 0.7) { set(x + dx * i - dy, y + dy * i + dx, c); set(x + dx * i + dy, y + dy * i - dx, c); } } };
    // 土和盆
    const soilY = 19; rect(3, soilY, 18, 3, '#6a4a34'); rect(4, soilY + 3, 16, 1, '#5a3e2c'); for (let x = 4; x < 20; x += 3) set(x, soilY, '#7a5a3e');
    const L1 = cs[0], L2 = cs[1], F1 = cs[2], F2 = cs[3], mx = 12;
    if (st === 0) { // 种子：几颗种子躺在土上
      for (const [x, y] of [[9, 18], [12, 17], [15, 18]]) { ell(x, y, 1.3, 0.9, P.rare ? sh(F1, F2) : sh('#d8b878', '#a8844a')); set(x - 0.5, y - 0.5, '#fff4d8'); }
    } else if (st === 1) { // 发芽：两片子叶
      line(mx, soilY, mx, soilY - 4, L1); leaf(mx, soilY - 4, -1, -0.4, 4, L2, L1); leaf(mx, soilY - 4, 1, -0.4, 4, L2, L1); if (P.shape === 'shroom') { ell(mx, soilY - 2, 2.2, 1.6, sh(F1, F2)); }
    } else {
      const big = st === 3, s = P.shape;
      if (s === 'root') { for (let i = 0; i < 5; i++) leaf(mx, soilY - 1, (i - 2) * 0.45, -1, P.tall ? 9 : 7, i % 2 ? L1 : L2, L1); if (big || st === 2 && P.flw) { if (big) { if (P.round) ell(mx, soilY + 0.5, 3.4, 2.4, sh(F1, F2)); else for (let y = 0; y < 5; y++) rect(mx - 2 + (y >> 1), soilY - 1 + y, 4 - y, 1, y > 2 ? F2 : F1); set(mx - 1, soilY - 1, lighten(F1)); } else ell(mx, soilY - 9, 1.6, 1.2, P.flw); } }
      else if (s === 'leafy') { ell(mx, soilY - 3, big ? 7 : 5, big ? 4.5 : 3.4, sh(L1, darken(L1))); ell(mx, soilY - 4, big ? 4.6 : 3.4, big ? 3.4 : 2.4, sh(L2, L1)); if (big) { ell(mx, soilY - 4.4, 2.6, 2, sh(F1, F2)); line(mx - 3, soilY - 5, mx + 3, soilY - 2, darken(L2)); } }
      else if (s === 'stalk') { const top = big ? 3 : 7; line(mx, soilY, mx, top, L1); line(mx + 1, soilY, mx + 1, top + 2, darken(L1)); for (let i = 0; i < 4; i++) leaf(mx, soilY - 3 - i * 3, i % 2 ? 1 : -1, -0.5, 5, L2, L1);
        if (P.head === 'sun') { if (big) { ell(mx + 1, top + 1, 4.4, 4.4, F1); ell(mx + 1, top + 1, 2, 2, sh(F2, darken(F2))); } else ell(mx + 1, top + 1, 2, 1.6, L2); }
        else if (P.head === 'ear') { for (let i = 0; i < 6; i++) { const y = top + i, x = mx + (P.droop && big ? i * 0.6 : 0); set(x - 1, y, big ? F1 : L2); set(x + 1, y, big ? F2 : L1); set(x, y - 0.5, big ? lighten(F1) : L2); } }
        else if (big) { ell(mx + 2, top + 6, 1.6, 3.6, sh(F1, F2)); leaf(mx + 2, top + 9, 0.4, 1, 3, L2); } }
      else if (s === 'vine') { if (!P.ground) { line(5, soilY, 5, 4, '#c8b07a'); line(19, soilY, 19, 4, '#c8b07a'); line(5, 5, 19, 5, '#c8b07a'); }
        const pts = P.ground ? [[4, soilY - 2], [8, soilY - 3], [13, soilY - 2], [18, soilY - 3], [21, soilY - 2]] : [[mx, soilY], [mx - 2, 14], [mx + 2, 10], [mx - 1, 7], [mx + 3, 5]];
        for (let i = 0; i < pts.length - 1; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], L1);
        pts.forEach(([x, y], i) => { leaf(x, y, i % 2 ? 1 : -1, -0.6, 4, L2, L1); });
        if (st === 2 && P.flw) pts.slice(1).forEach(([x, y]) => ell(x + 1, y - 1, 1, 1, P.flw));
        if (big) { if (P.ground) { ell(13, soilY - 3, 5, 3.6, sh(F1, F2)); if (P.stripe) for (let x = 9; x < 18; x += 2) line(x, soilY - 6, x, soilY - 0.5, P.stripe); set(11, soilY - 5, lighten(F1)); line(13, soilY - 6, 14, soilY - 8, L1); }
          else if (P.bunch) { for (let k = 0; k < 2; k++) { const bx = 8 + k * 8; for (let r = 0; r < 4; r++) for (let q = 0; q <= 3 - r; q++) ell(bx - (3 - r) * 0.8 + q * 1.6, 7 + r * 1.6, 0.9, 0.9, sh(F1, F2)); } }
          else pts.slice(1).forEach(([x, y], i) => (P.id === 'pea' ? (line(x, y + 1, x + 3, y + 3, F1), line(x, y + 2, x + 3, y + 4, F2)) : ell(x + 1, y + 2, 1.6, 1.6, sh(F1, F2)))); } }
      else if (s === 'bush') { ell(mx, soilY - 5, big ? 7.5 : 6, big ? 6 : 5, sh(L1, darken(L1))); for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 3 + (i % 3); leaf(mx + Math.cos(a) * r, soilY - 6 + Math.sin(a) * r * 0.7, Math.cos(a) * 0.6, Math.sin(a) * 0.5 - 0.4, 3, L2, L1); }
        if (P.spike) { for (let i = 0; i < 5; i++) { const x = mx - 4 + i * 2; line(x, soilY - 8, x, soilY - 13 - (i % 2), L1); if (st >= 2) for (let k = 0; k < 4; k++) set(x + (k % 2), soilY - 12 - k - (i % 2), k % 2 ? F2 : F1); } }
        else if (st === 2 && P.flw) for (let i = 0; i < 5; i++) { const x = mx - 4 + i * 2, y = soilY - 9 + (i % 2) * 2; set(x, y, P.flw); set(x + 1, y, P.flw); set(x, y + 1, P.flw); set(x + 0.5, y + 0.5, '#ffd36a'); }
        if (big && !P.spike) for (let i = 0; i < 6; i++) { const x = mx - 5 + (i * 7) % 11, y = soilY - 8 + ((i * 5) % 6); if (P.long) ell(x, y + 1, 1, 2.2, sh(F1, F2)); else ell(x, y, P.id === 'blueberry' ? 0.9 : 1.3, P.id === 'blueberry' ? 0.9 : 1.3, sh(F1, F2)); set(x, y - 1.5, L1); } }
      else if (s === 'flower') { const n = P.bush ? 3 : P.water ? 1 : 2;
        if (P.water) { ell(mx, soilY - 1, 9, 2, sh('#5aa8d8', '#3a7ab0')); ell(mx - 4, soilY - 2, 3, 1.2, sh(L2, L1)); ell(mx + 5, soilY - 1.5, 2.6, 1, sh(L2, L1)); }
        for (let k = 0; k < n; k++) { const x = mx + (k - (n - 1) / 2) * 5, top = soilY - (P.water ? 4 : 11 + (k % 2) * 2); if (!P.water) { line(x, soilY, x, top + 2, L1); leaf(x, soilY - 4, k % 2 ? 1 : -1, -0.7, 5, L2, L1); }
          if (st === 2 && !big) ell(x, top + 1, 1.4, 2, sh(L2, L1));
          else if (P.bell) { for (let i = 0; i < 3; i++) { const by = top + i * 3; line(x, by, x + 2, by + 1, L1); ell(x + 2.5, by + 2.4, 1.4, 1.4, sh(F1, F2)); set(x + 2.5, by + 3.6, F2); } }
          else if (P.star) { for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28 - 1.57; line(x, top + 1, x + Math.cos(a) * 3, top + 1 + Math.sin(a) * 3, F1); } ell(x, top + 1, 1, 1, P.id === 'starlily' ? '#ffffff' : '#ffe070'); }
          else if (P.orchid) { ell(x - 2, top, 2, 1.4, sh(F1, F2)); ell(x + 2, top, 2, 1.4, sh(F1, F2)); ell(x, top + 2, 1.6, 2, sh(lighten(F1), F2)); set(x, top + 1, '#ffe070'); }
          else if (P.puff) { for (let i = 0; i < 5; i++) ell(x + Math.cos(i * 1.3) * 2, top + Math.sin(i * 1.3) * 1.4, 2, 1.6, sh(F1, F2)); }
          else if (P.water) { for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; ell(x + Math.cos(a) * 2.2, top + Math.sin(a) * 1.2, 1.4, 1, sh(F1, F2)); } ell(x, top - 0.5, 1.2, 1, '#ffe070'); }
          else { ell(x, top + 1, 2.4, 2.6, sh(F1, F2)); line(x, top - 1, x, top + 3, darken(F1)); set(x - 1, top, lighten(F1)); } } }
      else if (s === 'cactus') { ell(mx, soilY - 6, 3, 6.5, sh(L2, L1)); ell(mx - 5, soilY - 7, 1.6, 3, sh(L2, L1)); line(mx - 5, soilY - 4, mx - 3, soilY - 4, L1); ell(mx + 5, soilY - 9, 1.6, 3, sh(L2, L1)); line(mx + 5, soilY - 6, mx + 3, soilY - 6, L1); for (let y = soilY - 11; y < soilY; y += 2) { set(mx - 1, y, '#f4f0e0'); set(mx + 1, y + 1, '#f4f0e0'); } if (big) { ell(mx, soilY - 13, 3, 2.2, sh(F1, F2)); ell(mx, soilY - 13, 1, 0.8, '#ffe070'); } else if (st === 2) ell(mx, soilY - 13, 1.2, 1.6, sh(L2, F2)); }
      else if (s === 'fern') { for (let k = 0; k < 5; k++) { const a = -2.4 + k * 0.45, len = 9 + (k % 2) * 2; for (let i = 0; i < len; i++) { const x = mx + Math.cos(a) * i, y = soilY - 1 + Math.sin(a) * i * 1.2; set(x, y, L1); if (i > 1 && i % 2 === 0) { set(x - Math.sin(a) * 1.5, y + Math.cos(a) * 1.5, L2); set(x + Math.sin(a) * 1.5, y - Math.cos(a) * 1.5, L2); } } if (big) set(mx + Math.cos(a) * len, soilY - 1 + Math.sin(a) * len * 1.2, F1); } if (big) for (let i = 0; i < 4; i++) set(mx - 4 + i * 3, soilY - 12 + (i % 2), F2); }
      else if (s === 'shroom') { if (P.moss) { ell(mx, soilY - 4, big ? 6 : 4.5, big ? 5 : 4, sh(F1, L1)); for (let i = 0; i < 10; i++) set(mx - 4 + (i * 7) % 9, soilY - 7 + ((i * 3) % 6), L2); if (big) for (let i = 0; i < 3; i++) { line(mx - 2 + i * 2, soilY - 9, mx - 2 + i * 2, soilY - 11, L1); set(mx - 2 + i * 2, soilY - 12, '#f2a6c2'); } }
        else { const ks = big ? [[mx, 9, 4], [mx - 6, 13, 2.6], [mx + 6, 14, 2.2]] : [[mx, 12, 3]]; for (const [x, y, r] of ks) { rect(x - 1, y, 2, soilY - y, '#e8e0d0'); ell(x, y, r, r * 0.7, sh(F1, F2)); for (let i = 0; i < 3; i++) set(x - r * 0.5 + i * r * 0.5, y - r * 0.3, '#ffffff'); } } }
      else if (s === 'tree') { rect(mx - (big ? 3 : 2), soilY - 9, big ? 6 : 4, 9, F1); rect(mx + (big ? 1 : 0), soilY - 9, 2, 9, F2); for (let i = 0; i < 5; i++) line(mx, soilY - 9, mx - 6 + i * 3, soilY - 13 - (i % 2) * 2, F2); ell(mx, soilY - 14, big ? 8 : 6, big ? 3.6 : 3, sh(L2, L1)); if (big) for (let i = 0; i < 3; i++) ell(mx - 4 + i * 4, soilY - 11, 1, 1.6, sh('#f0e0c0', '#c8a878')); }
    }
    // 描一圈深色边
    const cv = document.createElement('canvas'); cv.width = W + 2; cv.height = H + 2; const c = cv.getContext('2d');
    const out = '#2e2430';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!px[y * W + x]) { const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && px[Y * W + X] && px[Y * W + X] !== '#6a4a34' && px[Y * W + X] !== '#5a3e2c' && px[Y * W + X] !== '#7a5a3e'; }); if (nb) { c.fillStyle = out; c.fillRect(x + 1, y + 1, 1, 1); } }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = px[y * W + x]; if (v) { c.fillStyle = v; c.fillRect(x + 1, y + 1, 1, 1); } }
    return (artCache[key] = cv);
  }
  function hexMix(h, k) { const n = parseInt(h.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); return '#' + ((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1); }
  const lighten = (h) => hexMix(h, 0.35), darken = (h) => hexMix(h, -0.28);
  // 画到一个 canvas 上（放大 s 倍）
  function artCanvas(id, st, s = 3) { const a = art(id, st), cv = document.createElement('canvas'); cv.width = a.width * s; cv.height = a.height * s; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(a, 0, 0, cv.width, cv.height); cv.className = 'pixart'; return cv; }

  // ---------- 面板：植物图鉴 / 厨房 / 工作间 / 花房 ----------
  const TEMPN = { cool: '凉爽', mild: '温和', warm: '暖和' };
  function plantHtml(open) {
    const e = L0(), got = PLANTS.filter((k) => e.pdex[k] && e.pdex[k].st >= 0).length, sel = open.plant && PL[open.plant] ? open.plant : null;
    let h = `<div class="sec">植物图鉴 ${got}/${PLANTS.length}</div><p class="muted">种下去、长大、收获，每看到一个阶段图鉴就多画一格。菜园里的作物按季节长：当季长得快，反季慢一点。稀有植物只能从探险、风景里带回种子，种在花房。</p>`;
    if (sel) {
      const P = PL[sel], d = e.pdex[sel] || { st: -1, n: 0 }, uses = Object.values(DISH).filter((x) => x.need[sel] || x.need['p_' + sel]).map((x) => x.name);
      h += `<div class="pdetail"><div class="pstages">${[0, 1, 2, 3].map((st) => `<div class="pst ${d.st >= st ? '' : 'no'}"><canvas data-part="${sel}:${st}:4"></canvas><small>${['种子', '发芽', P.rare || P.shape === 'flower' ? '开花' : '长大', P.rare ? '结种' : '收获'][st]}</small></div>`).join('')}</div>
        <b>${esc(P.name)}</b> ${P.rare ? '<span class="tagr">稀有</span>' : ''}<p>${esc(P.about || '')}</p>
        <p class="muted">${P.rare ? `来自：${esc(sceneName(P.from))} · 花房温度：${TEMPN[P.temp]} · 约 ${Math.round(P.min / 60 * 10) / 10} 小时（要浇水、要授粉）` : `当季：${P.sea.map((x) => SN[x]).join(' ')} · ${C[sel].min >= 60 ? C[sel].min / 60 + ' 小时' : C[sel].min + ' 分钟'}成熟`}${d.n ? ` · 收获过 ${d.n} 次` : ''}</p>
        ${uses.length ? `<p class="muted">能做：${esc(uses.join('、'))}</p>` : ''}<button class="small" data-plant="">返回</button></div>`;
    }
    h += `<div class="pgrid">${PLANTS.map((k) => { const d = e.pdex[k]; const st = d ? d.st : -1; return `<button class="pcell ${st < 0 ? 'no' : ''} ${PL[k].rare ? 'rare' : ''}" data-plant="${k}"><canvas data-part="${k}:${st < 0 ? 3 : st}:2" ${st < 0 ? 'data-sil="1"' : ''}></canvas><small>${st < 0 ? '？？？' : esc(PL[k].name)}</small></button>`; }).join('')}</div>`;
    return h;
  }
  function bindArt(body) {
    body.querySelectorAll('canvas[data-part]').forEach((cv) => { const [id, st, s] = cv.dataset.part.split(':'); const a = art(id, +st); cv.width = a.width * +s; cv.height = a.height * +s; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; if (cv.dataset.sil) { c.globalAlpha = 0.28; c.filter = 'brightness(0)'; } c.drawImage(a, 0, 0, cv.width, cv.height); });
  }
  function cookHtml(open) {
    let h = `<div class="sec">厨房 · 菜谱</div><p class="muted">材料够了就能做。做好的菜放进背包：喂它（比生的菜经验多），或者在「探险」里选它当便当，出门有加成。小鱼干也能当材料。</p><div class="recipes">`;
    for (const d of Object.values(DISH)) {
      const ok = canCook(d), n = (L0().cooked || {})[d.id] || 0;
      h += `<div class="rcp ${ok ? '' : 'dim'}"><i data-ico="${d.icon}"></i><div><b>${esc(d.name)}</b>${n ? `<small class="muted"> 做过 ${n} 次</small>` : ''}<small>${esc(d.desc)}</small><small>${needTxt(d)}</small><small class="muted">吃：${[d.hunger ? '饱 +' + d.hunger : '', d.thirst ? '解渴 +' + d.thirst : '', d.energy ? '体力 +' + d.energy : '', '经验 +' + d.xp].filter(Boolean).join(' ')} · 便当：${TRIPN[d.trip]}</small></div><button class="small" data-cook="${d.id}" ${ok ? '' : 'disabled'}>做</button></div>`;
    }
    return h + '</div>';
  }
  function craftHtml() {
    const e = E();
    return `<div class="sec">工作间</div><p class="muted">用菜园和花房的收成做装扮、摆设（做好的摆设会直接摆到岛上空着的位置）。</p><div class="recipes">${CRAFT.map((c, i) => { const it = I[c.id], ok = Object.entries(c.need).every(([k, n]) => have(k) >= n), own = e.owned[c.id]; return `<div class="rcp ${ok && !own ? '' : 'dim'}"><i data-ico="${it.icon}"></i><div><b>${esc(it.name)}</b><small>${esc(c.desc)}</small><small>${Object.entries(c.need).map(([k, n]) => `<span class="${have(k) >= n ? 'good' : 'warn'}">${esc(k === 'fish' ? '小鱼干' : I[k].name)} ${have(k)}/${n}</span>`).join(' ')}</small></div><button class="small" data-craft="${i}" ${ok && !own ? '' : 'disabled'}>${own ? '已有' : '做'}</button></div>`; }).join('')}</div>`;
  }
  function ghHtml(open) {
    const e = L0(); ghTick();
    let h = `<div class="sec">花房</div><p class="muted">四个大花盆专门种带回来的稀有植物。要：浇水（管 12 小时）、把暖气阀门调到它喜欢的温度、开花以后授粉（蜂箱的蜜蜂会飞进来，也可以让它帮忙），然后结出花和种子。</p>`;
    h += `<div class="row"><span class="lab">暖气阀门</span>${TEMPS.map(([k, n]) => `<button class="chip ${e.gh.temp === k ? 'on' : ''}" data-ghtemp="${k}">${n}</button>`).join('')}</div><div class="pots">`;
    e.gh.pots.forEach((pt, i) => {
      if (!pt) { const seeds = RARE_IDS.filter((k) => EC.has('r_' + k)); h += `<div class="pot"><b>花盆 ${i + 1}</b><small class="muted">空着</small>${seeds.length ? seeds.map((k) => `<button class="small" data-ghsow="${i}:${k}">种${esc(PL[k].name)}（${E().bag['r_' + k]}）</button>`).join('') : '<small class="muted">还没有稀有种子：去探险，或者在风景里散步</small>'}</div>`; return; }
      const f = potInfo(i), P = PL[f.id];
      h += `<div class="pot"><canvas data-part="${f.id}:${f.stage}:2"></canvas><b>${esc(P.name)}</b><div class="xpbar"><i style="width:${Math.round(f.g * 100)}%"></i></div><small>${['种子', '发芽了', '开花了', '结种子了！'][f.stage]} · ${f.wet ? '<span class="good">土是湿的</span>' : '<span class="warn">该浇水了</span>'} · ${f.tempOk ? '<span class="good">温度刚好</span>' : `<span class="warn">想要${TEMPN[f.temp]}</span>`}${f.stage === 2 ? (f.pol ? ' · <span class="good">授粉了</span>' : ' · <span class="warn">等授粉</span>') : ''}</small>
        <div class="row">${f.wet ? '' : `<button class="small" data-ghwater="${i}">浇水</button>`}${f.stage === 2 && !f.pol ? `<button class="small" data-ghpol="${i}">帮它授粉</button>` : ''}${f.stage === 3 ? `<button class="small primary" data-ghharv="${i}">收获</button>` : ''}</div></div>`;
    });
    return h + '</div>';
  }
  PP.econTabs = [
    { k: 'plant', n: '植物', html: (open) => plantHtml(open), bind: bindArt },
    { k: 'cook', n: '厨房', html: (open) => cookHtml(open) },
    { k: 'craft', n: '工作间', html: () => craftHtml() },
    { k: 'gh', n: '花房', html: (open) => ghHtml(open), bind: bindArt },
  ];
  PP.econClick = (d, open, p) => {
    if (d.plant != null) { open.plant = d.plant || null; return 'done'; }
    if (d.cook) { cook(d.cook); return 'done'; }
    if (d.craft != null) { craft(+d.craft); return 'done'; }
    if (d.ghtemp) { setTemp(d.ghtemp); PP.isle && PP.isle.dirty(); return 'done'; }
    if (d.ghsow) { const [i, k] = d.ghsow.split(':'); if (potSow(+i, k)) { PP.ui.toast(`把${PL[k].name}种进了花盆`); PP.isle && PP.isle.dirty(); } return 'done'; }
    if (d.ghwater) { potWater(+d.ghwater); PP.isle && PP.isle.dirty(); return 'done'; }
    if (d.ghpol) { if (potPollinate(+d.ghpol)) PP.ui.toast('用毛茸茸的爪子帮它授了粉'); return 'done'; }
    if (d.ghharv) { potHarvest(+d.ghharv); PP.isle && PP.isle.dirty(); return 'done'; }
    if (d.bento != null) { open.bento = d.bento || null; return 'done'; }
    return null;
  };
  PP.tripExtra = (open, p) => {
    const ds = Object.keys(E().bag).filter((k) => I[k] && I[k].kind === 'dish' && E().bag[k] > 0);
    if (!ds.length) return `<div class="sec">便当</div><p class="muted">背包里还没有做好的菜：去城堡厨房做一份，带着出门有加成。</p>`;
    return `<div class="sec">带一份便当</div><div class="row wrap"><button class="chip ${!open.bento ? 'on' : ''}" data-bento="">不带</button>${ds.map((k) => `<button class="chip ${open.bento === k ? 'on' : ''}" data-bento="${k}">${esc(I[k].name)}（${E().bag[k]}）<small>${TRIPN[DISH[k.slice(2)].trip]}</small></button>`).join('')}</div>`;
  };
  PP.LIFE = { PL, PLANTS, CROPS_IDS, RARE_IDS, DISH, CRAFT, art, artCanvas, cook, craft, potInfo, potSow, potWater, potPollinate, potHarvest, setTemp, ghKey, ghTick, seen, harvested, season, findSeed, TEMPN };
})();
