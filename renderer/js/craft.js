// 加工工坊（0.38）：古城之池东边的一座木棚子。按真实的做法把岛上的东西加工成别的东西——
//   钓鱼用的饵：堆肥箱里翻蚯蚓、玉米面揉面团、玉米粒泡蜂蜜、卷心菜叶揉团、用柴刻小拟饵；
//   吃的：草莓熬果酱、向日葵盘里抠瓜子炒香；
//   留种：熟透的南瓜、西瓜、番茄掏出籽晒干，下一季接着种；
//   送礼：郁金香倒挂晾成干花束。
(function () {
  const PP = (window.PP = window.PP || {});
  const E = () => PP.econ.E();
  const ITEMS_ADD = {
    bait_worm: { kind: 'bait', name: '蚯蚓', icon: 'seed', pic: 1, desc: '鱼饵：从堆肥箱、雨后的菜地里翻出来的；鲤鱼鲫鱼鲶鱼泥鳅都吃', bait: 'worm' },
    bait_blood: { kind: 'bait', name: '红虫', icon: 'seed', pic: 1, desc: '鱼饵：池底淤泥里用细网捞的摇蚊幼虫；小鱼最爱', bait: 'blood' },
    bait_shrimp: { kind: 'bait', name: '小河虾', icon: 'fish', pic: 1, desc: '鱼饵：虾笼里收的活虾；鳜鱼、黄颡、河豚爱吃', bait: 'shrimp' },
    bait_hopper: { kind: 'bait', name: '蚱蜢', icon: 'leaf', pic: 1, desc: '鱼饵：夏秋白天草地里扑的；虹鳟、草鱼会跳起来抢', bait: 'hopper' },
    bait_cricket: { kind: 'bait', name: '蟋蟀', icon: 'leaf', pic: 1, desc: '鱼饵：夏末秋天夜里循着叫声捉的；虹鳟爱吃', bait: 'cricket' },
    bait_duck: { kind: 'bait', name: '浮萍', icon: 'leaf', pic: 1, desc: '鱼饵：池面上漂的小圆叶；草鱼最爱', bait: 'duck' },
    bait_minnow: { kind: 'bait', name: '活麦穗鱼', icon: 'fish', pic: 1, desc: '鱼饵：钓到的小麦穗鱼、青鳉养在桶里当活饵；鳜鱼、鲶鱼、月光鳗专吃活鱼', bait: 'minnow' },
    bait_dough: { kind: 'bait', name: '面团', icon: 'bread', pic: 1, desc: '鱼饵：自己种的玉米磨面揉的；鲫鱼、金鱼爱吃', bait: 'dough' },
    bait_corn: { kind: 'bait', name: '蜜玉米粒', icon: 'corn', pic: 1, desc: '鱼饵：玉米粒泡自己岛上的蜂蜜；鲤鱼、锦鲤闻着就来', bait: 'sweetcorn' },
    bait_leaf: { kind: 'bait', name: '菜叶团', icon: 'leaf', pic: 1, desc: '鱼饵：卷心菜叶揉团；草鱼吃', bait: 'leaf' },
    bait_lure: { kind: 'bait', name: '木头小拟饵', icon: 'fish', pic: 1, desc: '鱼饵：用柴刻、用草莓汁涂色的小木鱼；追小鱼的鳜鱼、虹鳟会扑；一个能用 8 次', bait: 'lure' },
    jam: { kind: 'snack', name: '草莓果酱', icon: 'berry', xp: 70, aff: 3, hunger: 30, desc: '自己熬的果酱，+70 经验，好感涨' },
    seeds: { kind: 'snack', name: '炒瓜子', icon: 'seed', xp: 18, aff: 1, hunger: 10, desc: '向日葵籽炒的，嗑着玩，+18 经验' },
    dryflower: { kind: 'crop', name: '干花束', icon: 'flower', xp: 30, aff: 4, desc: '郁金香晾的干花，送给它好感大涨' },
    starstone: { kind: 'crop', name: '陨石碎片', icon: 'star', sell: 60, aff: 2, xp: 10, desc: '流星雨那天落在岛上的小陨石，摸着还有点温，发着淡淡的光' },
    treefruit: { kind: 'snack', name: '神树的果子', icon: 'apple', xp: 200, aff: 6, hunger: 40, thirst: 20, desc: '好几年才结一次的金色果子，甜得很：+200 经验，好感大涨' },
    mushroom: { kind: 'snack', name: '蘑菇', icon: 'leaf', xp: 25, hunger: 20, desc: '秋雨后树根边长出来的，+25 经验' },
  };
  /* 配方：in 用掉什么（背包里的东西；fuel 是石炉的柴），out 得到什么，cd 冷却（分钟，堆肥里的蚯蚓要等它们再钻出来），t 做多久（秒） */
  const RECIPES = [
    { id: 'prune', icon: '🪓', name: '修剪林子', act: () => { const n = PP.CIV ? PP.CIV.prune() : 0; return n ? `修下了一捆枝条，柴 +${n}（林子会慢一点长）` : '岛边还没有成材的树可以修'; }, in: {}, out: {}, cd: 24 * 60, t: 4, how: '把大树太密的侧枝锯下来当柴——砍得太勤，林子就长得慢' },
    { id: 'compost', icon: '🟫', name: '翻堆肥养地', need: 'compost', act: () => { PP.CIV.compost(); return '堆肥翻进了菜地，地力养回来了'; }, in: {}, out: {}, cd: 3 * 24 * 60, t: 4, how: '堆肥箱里烂好的黑土翻出来撒进菜地' },
    { id: 'smoke', icon: '🔥', name: '熏鱼', need: 'smoke', in: { fish_fresh: 2, fuel: 3 }, out: { smoked_fish: 2 }, t: 5, how: '鲜鱼挂在烟里熏一整天' },
    { id: 'dryfish', icon: '☀️', name: '晒鱼干', need: 'drying', cond: () => (/rain|drizzle|storm|snow/.test((PP.env && PP.env.get().weather.kind) || '') ? '下雨天晒不了' : ''), in: { fish_fresh: 2 }, out: { dried_fish: 2 }, t: 3, how: '剖开晾在竹架上，晴天才行' },
    { id: 'saltfish', icon: '🧂', name: '腌咸鱼', need: 'salt', in: { fish_fresh: 2, salt: 1 }, out: { salted_fish: 2 }, t: 3, how: '一层鱼一层盐码进坛子' },
    { id: 'pickle', icon: '🥬', name: '腌酸菜', need: 'ferment', in: { cabbage: 2 }, out: { pickle: 3 }, t: 3, how: '卷心菜压进坛子，自己发酵变酸' },
    { id: 'flour', icon: '🌽', name: '磨玉米面', need: 'mill', in: { corn: 2 }, out: { flour: 3 }, t: 4, how: '玉米粒放进石磨，一圈圈推' },
    { id: 'flatbread', icon: '🫓', name: '烤玉米饼', need: 'mill', in: { flour: 2, fuel: 2 }, out: { flatbread: 2 }, t: 4, how: '玉米面和水拍成饼，在石炉上烤' },
    { id: 'dough', icon: '🥣', name: '揉面团', in: { corn: 1 }, out: { bait_dough: 5 }, t: 3, how: '玉米磨成面，加水揉成小团' },
    { id: 'sweetcorn', icon: '🌽', name: '泡蜜玉米粒', in: { corn: 1, honeyjar: 1 }, out: { bait_corn: 6 }, t: 3, how: '剥下玉米粒，用蜂蜜泡着' },
    { id: 'leaf', icon: '🥬', name: '揉菜叶团', in: { cabbage: 1 }, out: { bait_leaf: 5 }, t: 2, how: '卷心菜叶撕碎揉成团' },
    { id: 'lure', icon: '🐟', name: '刻小拟饵', in: { fuel: 8, berry: 1 }, out: { bait_lure: 1 }, t: 4, how: '挑一根柴刻成小鱼，用草莓汁涂上红色' },
    { id: 'jam', icon: '🍓', name: '熬草莓果酱', in: { berry: 3, fuel: 4 }, out: { jam: 1 }, t: 4, how: '草莓加蜂蜜在小炉子上慢慢熬' },
    { id: 'seeds', icon: '🌻', name: '炒瓜子', in: { sunflower: 1, fuel: 2 }, out: { seeds: 4 }, t: 3, how: '从向日葵花盘里抠出籽，炒香' },
    { id: 'pseed', icon: '🎃', name: '南瓜留种', in: { pumpkin: 1 }, out: { s_pumpkin: 3 }, t: 2, how: '熟透的南瓜掏出籽，洗净晒干' },
    { id: 'mseed', icon: '🍉', name: '西瓜留种', in: { melon: 1 }, out: { s_melon: 3 }, t: 2, how: '吃剩的西瓜籽晒干' },
    { id: 'tseed', icon: '🍅', name: '番茄留种', in: { tomato: 2 }, out: { s_tomato: 3 }, t: 2, how: '番茄籽连着瓤泡几天再晾干' },
    { id: 'dry', icon: '💐', name: '晾干花束', in: { tulip: 2 }, out: { dryflower: 1 }, t: 2, how: '郁金香倒挂在棚子梁上晾干' },
  ];
  /* 找鱼饵（不是做出来的，是从岛上的生态里找的）：能找到多少看现在这东西多不多（PP.ECO 的种群：季节、天气、土湿不湿），
     where：在哪儿找（工坊 / 池边），when：只有白天 / 夜里才有；cd：找过一次要等它们再聚过来（分钟） */
  const FIND = [
    { id: 'f_worm', icon: 'bait_worm', name: '翻堆肥找蚯蚓', where: 'work', pop: 'worm', item: 'bait_worm', max: 7, cd: 20, t: 2, how: '堆肥箱里是厨房的菜叶、收菜剩下的茎叶，蚯蚓就住在里面；下过雨、土湿的时候最多，冬天钻得很深', low: '土太干或太冷，蚯蚓都钻到深处去了' },
    { id: 'f_hopper', icon: 'bait_hopper', name: '去草地扑蚱蜢', where: 'work', pop: 'hopper', item: 'bait_hopper', max: 5, cd: 15, t: 3, when: 'day', how: '夏天秋天白天，岛边的长草里一蹦一蹦的', low: '这个季节草地里没什么蚱蜢' },
    { id: 'f_cricket', icon: 'bait_cricket', name: '夜里循着叫声捉蟋蟀', where: 'work', pop: 'cricket', item: 'bait_cricket', max: 4, cd: 15, t: 3, when: 'night', how: '夏末到秋天的夜里，听着叫声找到石头缝', low: '现在听不到蟋蟀叫' },
    { id: 'f_blood', icon: 'bait_blood', name: '用细网捞池底的红虫', where: 'pond', pop: 'blood', item: 'bait_blood', max: 8, cd: 30, t: 2, how: '古城之池边上的淤泥里住着摇蚊的幼虫，红红的一小条', low: '水太冷，红虫少' },
    { id: 'f_duck', icon: 'bait_duck', name: '捞一把浮萍', where: 'pond', pop: 'duck', item: 'bait_duck', max: 6, cd: 30, t: 1, how: '池面上漂着的小圆叶，天暖了长得飞快', low: '天冷，浮萍还没长出来' },
  ];
  const SHRIMP = { name: '虾笼', how: '在古城之池里放一个竹虾笼（里面挂点菜叶），过几个小时收：笼子放得越久、水越暖，虾越多' };
  const ECO = () => PP.ECO && PP.ECO.st();
  function night() { const h = new Date().getHours(); return h >= 19 || h < 5; }
  function findLack(f) { const out = [], t = ((E().craftT || {})[f.id] || 0) + f.cd * 60000 - Date.now(); if (t > 0) out.push(Math.ceil(t / 60000) + ' 分钟后再来'); if (f.when === 'day' && night()) out.push('天黑了，看不见'); if (f.when === 'night' && !night()) out.push('要等天黑'); return out; }
  function findDo(f) { if (findLack(f).length) return null; const e = E(), s = ECO(), p = s ? s.pop[f.pop] : 0.5, n = Math.max(0, Math.round(f.max * p * (0.7 + Math.random() * 0.5))); e.craftT = e.craftT || {}; e.craftT[f.id] = Date.now(); if (s) s.pop[f.pop] = Math.max(0.02, s.pop[f.pop] - 0.08);
    if (n) PP.econ.give(f.item, n); PP.save && PP.save.soon && PP.save.soon(); return n ? `${PP.econ.ITEMS[f.item].name} ×${n}` + (p < 0.3 ? `（${f.low}，只找到这些）` : '') : `一条都没找到——${f.low}`; }
  function trap() { const e = E(); return e.trap || null; }
  function trapSet() { E().trap = { t: Date.now() }; PP.save && PP.save.soon && PP.save.soon(); }
  function trapGet() { const e = E(), tr = e.trap; if (!tr) return null; const h = (Date.now() - tr.t) / 3600000, s = ECO(), p = s ? s.pop.shrimp : 0.5, n = Math.round(Math.min(1, h / 4) * 8 * p + (h > 0.5 ? 1 : 0)); e.trap = null; if (n) PP.econ.give('bait_shrimp', n); if (s) s.pop.shrimp = Math.max(0.05, s.pop.shrimp - 0.1); PP.save && PP.save.soon && PP.save.soon(); return { n, h }; }
  /* 鱼饵的小图：每种画一张（圆润的、有光有影的小插画，不是像素块） */
  const icons = {};
  function icon(k, S = 64) {
    const key = k + S; if (icons[key]) return icons[key]; const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), u = S / 64; g.lineCap = 'round'; g.lineJoin = 'round';
    const ball = (x, y, r, c1, c2) => { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); };
    const curve = (pts, w, c, c2) => { g.strokeStyle = c2 || 'rgba(0,0,0,.25)'; g.lineWidth = w + 2 * u; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); g.strokeStyle = c; g.lineWidth = w; g.stroke(); };
    const wave = (x0, y0, x1, amp, n, ph = 0) => Array.from({ length: 24 }, (_, i) => { const t = i / 23; return [(x0 + (x1 - x0) * t) * u, (y0 + Math.sin(t * n * 3.14 + ph) * amp) * u]; });
    if (k === 'bait_worm') { const P = wave(10, 34, 54, 9, 2.2); curve(P, 7 * u, '#d88a8a'); g.strokeStyle = '#b86868'; g.lineWidth = 1 * u; for (let i = 3; i < 22; i += 2) { g.beginPath(); g.arc(P[i][0], P[i][1], 3 * u, 0, 6.28); g.stroke(); } ball(P[23][0], P[23][1], 3.6 * u, '#f0b0b0', '#c87878'); }
    else if (k === 'bait_blood') for (let j = 0; j < 4; j++) curve(wave(12 + j * 4, 20 + j * 8, 48 + j * 2, 4, 3, j), 3 * u, ['#c8323a', '#d84048', '#b82830', '#e05058'][j]);
    else if (k === 'bait_shrimp' || k === 'bait_minnow') { const id = k === 'bait_shrimp' ? 'shrimp' : 'minnow'; ball(32 * u, 34 * u, 26 * u, 'rgba(150,200,230,.55)', 'rgba(80,140,190,.35)'); if (PP.AQUA) g.drawImage(PP.AQUA.paint(id, 128, 72), 2 * u, 14 * u, 60 * u, 34 * u); }
    else if (k === 'bait_hopper' || k === 'bait_cricket') { const hop = k === 'bait_hopper', c1 = hop ? '#9ac85a' : '#5a4632', c2 = hop ? '#5a8a2e' : '#2e2218'; curve([[26 * u, 40 * u], [44 * u, 24 * u], [52 * u, 46 * u]], 3 * u, c2); curve([[22 * u, 40 * u], [34 * u, 30 * u], [40 * u, 46 * u]], 2.2 * u, c2); g.fillStyle = c1; g.save(); g.translate(30 * u, 36 * u); g.rotate(-0.15); const gr = g.createLinearGradient(0, -8 * u, 0, 8 * u); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 19 * u, 7 * u, 0, 0, 6.28); g.fill(); g.restore(); ball(12 * u, 32 * u, 7 * u, c1, c2); g.fillStyle = '#1a1410'; g.beginPath(); g.arc(10 * u, 30 * u, 1.8 * u, 0, 6.28); g.fill(); curve([[9 * u, 27 * u], [2 * u, hop ? 12 * u : 6 * u]], 1.2 * u, c2, 'rgba(0,0,0,0)'); curve([[11 * u, 26 * u], [hop ? 8 * u : 16 * u, 6 * u]], 1.2 * u, c2, 'rgba(0,0,0,0)'); if (!hop) { g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(34 * u, 32 * u, 12 * u, 3 * u, -0.15, 0, 6.28); g.fill(); } }
    else if (k === 'bait_duck') { ball(32 * u, 34 * u, 26 * u, 'rgba(120,170,200,.6)', 'rgba(60,110,150,.5)'); for (let i = 0; i < 16; i++) { const a = hs2(i, 1) * 6.28, r = hs2(i, 2) * 18; ball((32 + Math.cos(a) * r) * u, (34 + Math.sin(a) * r * 0.8) * u, (3.5 + hs2(i, 3) * 2) * u, '#b8e070', '#5a9a3a'); } }
    else if (k === 'bait_dough') for (const [x, y, r] of [[22, 38, 11], [40, 40, 12], [31, 24, 10]]) ball(x * u, y * u, r * u, '#fff4d8', '#d8b878');
    else if (k === 'bait_corn') { ball(32 * u, 42 * u, 20 * u, 'rgba(240,190,80,.5)', 'rgba(200,130,40,.3)'); for (let i = 0; i < 14; i++) { const x = 16 + (i % 5) * 8 + (Math.floor(i / 5) % 2) * 4, y = 30 + Math.floor(i / 5) * 8; ball(x * u, y * u, 4.4 * u, '#fff2a0', '#e0a820'); } }
    else if (k === 'bait_leaf') { for (let i = 0; i < 7; i++) { const a = i * 0.9, r = i ? 10 : 0; ball((32 + Math.cos(a) * r) * u, (34 + Math.sin(a) * r) * u, (12 - (i ? 2 : 0)) * u, '#b8e08a', '#5a9a42'); } g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1 * u; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(32 * u, 34 * u, (6 + i * 4) * u, i, i + 1.2); g.stroke(); } }
    else if (k === 'bait_lure') { g.save(); g.translate(30 * u, 32 * u); g.rotate(-0.3); const gr = g.createLinearGradient(0, -9 * u, 0, 9 * u); gr.addColorStop(0, '#e04a3a'); gr.addColorStop(0.5, '#f4ecd8'); gr.addColorStop(1, '#c8a070'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 20 * u, 9 * u, 0, 0, 6.28); g.fill(); g.beginPath(); g.moveTo(-18 * u, 0); g.lineTo(-30 * u, -9 * u); g.lineTo(-30 * u, 9 * u); g.closePath(); g.fillStyle = '#d0583a'; g.fill(); g.fillStyle = '#1a1410'; g.beginPath(); g.arc(12 * u, -2 * u, 2.4 * u, 0, 6.28); g.fill(); g.restore(); curve([[40 * u, 44 * u], [46 * u, 54 * u], [52 * u, 50 * u], [50 * u, 44 * u]], 1.6 * u, '#9aa0a8', 'rgba(0,0,0,0)'); }
    else if (k === 'jerky') for (let i = 0; i < 3; i++) { g.save(); g.translate((22 + i * 10) * u, (32 + i * 3) * u); g.rotate(-0.5 + i * 0.3); const gr = g.createLinearGradient(-5 * u, 0, 5 * u, 0); gr.addColorStop(0, '#a85a34'); gr.addColorStop(1, '#6a3420'); g.fillStyle = gr; g.fillRect(-5 * u, -18 * u, 10 * u, 36 * u); g.restore(); }
    return (icons[key] = cv);
  }
  const hs2 = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const iconURL = (k) => { try { return icon(k, 64).toDataURL(); } catch (e) { return ''; } };
  const fuelNow = () => { const f = E().fort; return f ? f.fuel : 0; };
  const nameOf = (k) => (k === 'fuel' ? '柴' : (PP.econ.ITEMS[k] || {}).name || k);
  function lack(r) { const e = E(), out = []; if (r.need && !(PP.CIV && PP.CIV.has(r.need))) return ['还不会「' + PP.CIV.KNOW[r.need].name + '」（去' + PP.CIV.KNOW[r.need].where.join('/') + '学）']; if (r.cond) { const c = r.cond(); if (c) out.push(c); } for (const k in r.in) { const n = r.in[k], have = k === 'fuel' ? fuelNow() : e.bag[k] || 0; if (have < n) out.push(nameOf(k) + (k === 'fuel' ? '' : ' ×' + (n - have))); } const cd = cdLeft(r); if (cd > 0) out.push(cd > 120 ? Math.ceil(cd / 60) + ' 小时后再来' : Math.ceil(cd) + ' 分钟后再来'); return out; }
  function cdLeft(r) { if (!r.cd) return 0; const t = (E().craftT || {})[r.id] || 0; return (t + r.cd * 60000 - Date.now()) / 60000; }
  function make(r) {
    if (lack(r).length) return false; const e = E(); if (r.act) { e.craftT = e.craftT || {}; if (r.cd) e.craftT[r.id] = Date.now(); const msg = r.act(); PP.save && PP.save.soon && PP.save.soon(); return msg || true; }
    for (const k in r.in) { if (k === 'fuel') { if (e.fort) e.fort.fuel = Math.max(0, e.fort.fuel - r.in[k]); } else PP.econ.give(k, -r.in[k]); }
    for (const k in r.out) { PP.econ.give(k, r.out[k]); if (k === 'bait_lure') e.lureUses = (e.lureUses || 0) + 8 * r.out[k]; }
    if (r.cd) { e.craftT = e.craftT || {}; e.craftT[r.id] = Date.now(); }
    PP.save && PP.save.soon && PP.save.soon(); return true;
  }
  const outText = (r) => r.act ? '' : Object.keys(r.out).map((k) => nameOf(k) + ' ×' + r.out[k]).join('、'), inText = (r) => r.act ? r.how : Object.keys(r.in).length ? Object.keys(r.in).map((k) => nameOf(k) + (k === 'fuel' ? ' ' + r.in[k] : ' ×' + r.in[k])).join(' + ') : '不用材料';
  function install() { if (!PP.econ || !PP.econ.ITEMS) return setTimeout(install, 50); Object.assign(PP.econ.ITEMS, ITEMS_ADD); }
  install();
  PP.CRAFT = { RECIPES, FIND, SHRIMP, lack, make, outText, inText, cdLeft, findLack, findDo, trap, trapSet, trapGet, icon, iconURL, night };
})();
