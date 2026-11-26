// 活的浮岛（0.39）：岛有自己的「年龄」，按现实的时间一天天长，没人玩也照样长（打开时把没开的这些天按当月的气候补算上）。
// 长多快看现实同步的季节和实时天气：暖和、下雨长得快；冬天、干旱、太热长得慢；暴风雨会吹断枯枝、刮倒老树。
// 整个生长按 50 年设计：
//   · 苔藓、青草、野花：几周到一年就铺满，之后跟着季节一年一轮；
//   · 藤蔓：四五年爬满小屋的墙；
//   · 岛边的小树林：一棵棵树从小树苗长成大树（十来年），成材的树春天落种、旁边冒出新树苗，林子慢慢往外扩；
//     老到四十多年的树，遇上大暴风雨会倒，倒木长苔、长蘑菇，烂掉的地方又冒出新苗；
//   · 神树：已经是千年老树，五十年里树冠还会慢慢往外撑、多分出几根大枝，身上的苔越来越厚；
//   · 水里：每种鱼按自己的繁殖快慢涨落（春天产卵，一群群小鱼苗），钓走的会少，过一阵又长回来；
//     蚯蚓看土湿不湿、冷不冷；河虾、红虫、浮萍看水温；蚱蜢、蟋蟀看季节和白天黑夜；
//   · 住在岛上的大家：过一阵就给房子添点东西（鸟屋、彩旗、更多的灯笼……）。
// 岛上的东西都有来路：种子是收菜时留下的、候鸟捎来的、探险带回的；鱼饵是从土里、池里、草里找的，或者自己用收的粮食做的。
(function () {
  const PP = (window.PP = window.PP || {});
  const E = () => PP.econ.E();
  const DAY = 86400000, YEAR_GD = 300; // 一个「正常年景」大约攒 240 生长日
  const hs = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  // 当地的气候（打开之前的那些天没有实时天气，就按这个月的气候估）：月均温、下雨的机会
  const CLIM_T = [3, 5, 10, 16, 21, 25, 28, 28, 24, 18, 11, 5], CLIM_R = [0.22, 0.28, 0.38, 0.45, 0.45, 0.55, 0.55, 0.5, 0.4, 0.3, 0.25, 0.2];
  const seasonOf = (m) => (m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter');
  /* 植物这一天能长多少（1 = 春天里普通的好天气） */
  function plantRate(T, rain, snow, dryDays) { let r = T < 0 ? 0.04 : T < 6 ? 0.18 : T < 12 ? 0.55 : T < 18 ? 0.9 : T < 28 ? 1.2 : T < 34 ? 0.95 : 0.55; if (rain) r *= 1.2; if (snow) r *= 0.6; if (dryDays > 10 && T > 22) r *= 0.65; return r; }
  const FISH_K = [0, 60, 26, 9, 3]; // 每种鱼在这片水里最多能有多少（按稀有程度）
  function st() { const e = E(); if (e.eco && e.eco.rs == null) { e.eco.rs = (Math.random() * 4294967296) | 0; e.eco.feat = e.eco.feat || []; } if (!e.eco) e.eco = { rs: (Math.random() * 4294967296) | 0, feat: [], born: Date.now(), last: Date.now(), gd: 0, days: 0, wet: 0.55, dry: 0, pop: { worm: 0.6, blood: 0.5, shrimp: 0.5, hopper: 0.3, cricket: 0.2, duck: 0.4 }, fish: {}, grove: null, log: [], add: {}, rate: 1, why: [] }; return e.eco; }
  /* 每座岛自己的随机数（种子在岛出生时随机定下、一直存着）：同样的天气，不同的岛会走出不同的结果 */
  function rng() { const s = st(); let t = (s.rs = (s.rs + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const pick = (A) => A[Math.floor(rng() * A.length)];
  function fishPop(id) { const s = st(), f = PP.FISHDEX && PP.FISHDEX.BY[id]; if (!f) return 0; const K = FISH_K[f.rare] || 10; if (s.fish[id] == null) s.fish[id] = K * 0.6; return s.fish[id]; }
  let curT = 0;
  function note(msg, t = curT || Date.now()) { const s = st(); const same = s.log.find((l) => l.msg.slice(0, 12) === msg.slice(0, 12) && Math.abs(l.t - t) < 20 * DAY); if (same) { same.n = (same.n || 1) + 1; same.t = t; s.log.splice(s.log.indexOf(same), 1); s.log.unshift(same); return; } s.log.unshift({ t, msg }); s.log.length = Math.min(s.log.length, 30); }
  /* 往前走 dt 天：T 气温、rain/snow/storm 当天的天气、m 月份、night 现在是不是夜里、live 是不是正在玩 */
  function step(dt, T, rain, snow, storm, m, live, seed) {
    const s = st(), se = seasonOf(m); s.dry = rain ? 0 : s.dry + dt; s.wet = Math.max(0, Math.min(1, s.wet + (rain ? 0.6 * dt : -0.07 * dt * (T > 22 ? 1.6 : 1))));
    const r = plantRate(T, rain, snow, s.dry); s.gd += r * dt; s.days += dt; s.rate = r;
    const P = s.pop, toward = (k, tgt, sp) => { P[k] += (tgt - P[k]) * Math.min(1, sp * dt); };
    toward('worm', T < 2 ? 0.05 : (0.25 + 0.75 * s.wet) * (T > 30 ? 0.5 : 1), 0.4); // 蚯蚓：土湿、不冷不热的时候多；冻土里钻得很深
    toward('blood', T < 6 ? 0.1 : 0.85, 0.2); toward('shrimp', T < 8 ? 0.2 : T < 30 ? 0.9 : 0.6, 0.15); toward('duck', T < 10 ? 0.05 : 0.95, 0.12);
    toward('hopper', (se === 'summer' || se === 'autumn') && T > 14 ? 0.9 : 0.02, 0.3); toward('cricket', (m >= 6 && m <= 9) && T > 12 ? 0.9 : 0.02, 0.3);
    // 鱼：各自按 logistic 慢慢长回去；春天水温合适的时候产卵（长得快）；冬天几乎不长
    if (PP.FISHDEX) for (const f of PP.FISHDEX.FISH) { if (f.eff === 'junk' || f.id === 'bottle') continue; const K = FISH_K[f.rare] || 10, n = fishPop(f.id), rr = (T < 6 ? 0.02 : se === 'spring' && T > 14 ? 3.0 : 0.6) / 365 * (5 - f.rare) * (PP.CIV && PP.CIV.has('stocking') ? 2 : 1); s.fish[f.id] = Math.max(0.3, n + rr * n * (1 - n / K) * dt * 30); }
    // 小树林：每棵树按生长日长大；春天成材的树落种，旁边冒新苗；四十多年的老树遇上暴风雨会倒
    const G = s.grove; if (G) { for (const g of G) if (g.on) g.age += r * dt / YEAR_GD * 1.0;
      if (se === 'spring' && T > 10 && rng() < 0.022 * dt) { const mature = G.filter((g) => g.on && g.age > 6); if (mature.length) { const free = G.filter((g) => !g.on && !g.dead); if (free.length) { const k = free[Math.floor(rng() * free.length)]; k.on = true; k.age = 0.05; k.sp = newSpecies(); k.lean = (rng() - 0.5) * 0.9; k.hk = 0.7 + rng() * 0.6; if (live) note('春天到了：成材的树落下的种子，在岛边冒出了一棵小树苗'); } } }
      if (storm) { const old = G.filter((g) => g.on && g.age > 42); if (old.length && rng() < 0.3) { const k = old[0]; k.on = false; k.dead = true; k.deadAt = s.days; note('一场暴风雨，岛边一棵四十多年的老树倒了——倒木会慢慢长满苔、长出蘑菇，几年后烂掉的地方又会冒出新苗'); } }
      for (const g of G) if (g.dead && s.days - g.deadAt > 3 * 365) { g.dead = false; g.burnt = false; g.on = true; g.age = 0.05; g.sp = newSpecies(); } }
    randomEvents(dt, T, rain, snow, storm, m, live);
    if (PP.CIV) try { PP.CIV.day(dt, T, rain, snow, m, live, live ? curMM : null); } catch (er) { console.error(er); }
    // 暴风雨吹断枯枝：捡回来就是柴
    if (storm && rng() < 0.5) { const f = E().fort; if (f) f.fuel = Math.min(100, f.fuel + 6); note('暴风雨吹断了好些枯枝，捡回来添进了柴堆（柴 +6）'); }
    // 候鸟：春秋两季路过的鸟在岛上歇脚，粪里带着别处的草籽、果核（真的有一部分能种出来）
    if ((m === 3 || m === 4 || m === 9 || m === 10) && rng() < 0.018 * dt) { const pool = ['s_berry', 's_sun', 's_tulip', 's_tomato', 's_melon', 's_pumpkin'], k = pool[Math.floor(rng() * pool.length)]; PP.econ.give(k, 1); note('一群候鸟在岛上歇了歇脚，飞走后在草地里留下了一颗' + PP.econ.ITEMS[k].name.replace('种子', '').replace('球茎', '') + '的种子（收进背包了）'); }
    // 秋天雨后，倒木和树根边冒蘑菇
    if (se === 'autumn' && rain && rng() < 0.07 * dt) { PP.econ.give('mushroom', 1); note('秋雨过后，树根边冒出了一朵蘑菇（收进背包了）'); }
  }
  /* 新冒出来的树是什么树：多半是跟周围一样的橡树，也可能是风吹来的桦树、候鸟带来的枫树、松树 */
  function newSpecies() { const r = rng(); return r < 0.55 ? 'oak' : r < 0.72 ? 'birch' : r < 0.87 ? 'maple' : 'pine'; }
  /* ---------- 随机事件（0.40）：世界本来就是随机的。每一天按季节、天气、岛上现在的状态，各种事有各自的机会发生；
     有的只是一阵（彩虹、流星），有的会一直留在岛上、自己再长（野花一片片蔓延、野蜂窝、倒木），有的改变以后的走向（雷劈倒的树、藻华后鱼变少） ---------- */
  const F = () => st().feat;
  function addFeat(k, o = {}) { const f = Object.assign({ k, t: Date.now(), day: st().days, id: (rng() * 1e9) | 0 }, o); F().push(f); if (F().length > 60) F().splice(0, F().length - 60); return f; }
  function event(dt, p) { return rng() < 1 - Math.pow(1 - p, dt); }
  function randomEvents(dt, T, rain, snow, storm, m, live) {
    const s = st(), G = s.grove || [], se = seasonOf(m), yr = new Date().getFullYear();
    // 雷击：暴风雨里，偶尔劈中岛边最高的树（烧成焦黑的枯树桩，几年后烂掉、又冒新苗），也可能劈在神树上留下一道焦痕
    if (storm && event(dt, 0.18)) { const tall = G.filter((g) => g.on && g.age > 5); if (tall.length && rng() < 0.7) { const g = pick(tall); g.on = false; g.dead = true; g.burnt = true; g.deadAt = s.days; note('雷雨里一道闪电劈中了岛边的一棵' + spName(g.sp) + '，烧成了焦黑的树桩（几年后会烂掉，原地又冒新苗）'); } else { s.scars = (s.scars || 0) + 1; note('一道闪电劈在神树上，树皮上留下了一道焦痕——神树没事，过几年焦痕上会长满苔'); } }
    // 流星雨（八月英仙座、十二月双子座）：偶尔有一小块陨石落在岛上，发着微光，走过去能捡
    if ((m === 7 || m === 11) && event(dt, 0.05)) { addFeat('meteor', { item: 'starstone', life: 40 }); note('流星雨的夜里，一颗小陨石落在了岛上某个地方，发着淡淡的光——去找找'); }
    // 分蜂：春天蜂箱里的蜂太多，一半跟着老蜂王飞走，在岛边的某棵大树上安了新家（野蜂窝，偶尔能掏到蜂蜜）
    if (se === 'spring' && T > 15 && !F().some((f) => f.k === 'hive') && event(dt, 0.03)) { const big = G.map((g, i) => [g, i]).filter(([g]) => g.on && g.age > 6); if (big.length) { const [, i] = pick(big); addFeat('hive', { gi: i }); note('分蜂了！一群蜜蜂跟着老蜂王飞走，在岛边一棵大树上筑了新的野蜂窝'); } }
    for (const f of F()) if (f.k === 'hive' && s.days - (f.honey || f.day) > 20 && T > 12 && !f.item && event(dt, 0.08)) { f.honey = s.days; f.item = 'honeyjar'; note('岛边那个野蜂窝攒了不少蜜，树下滴了一小罐——走过去能收'); }
    // 野鸭：春夏偶尔有一对野鸭落到古城之池，住上几个月再飞走
    if ((se === 'spring' || se === 'summer') && !F().some((f) => f.k === 'ducks') && event(dt, 0.012)) { addFeat('ducks', { life: 60 + rng() * 120, n: 2 + (rng() < 0.3 ? 3 : 0) }); note('一对野鸭落到了古城之池里，看样子要住一阵子' + (rng() < 0.5 ? '' : '（后面跟着几只小鸭子）')); }
    // 秋雨后的蘑菇圈：草地上一夜之间冒出一圈蘑菇，十来天就没了
    if (se === 'autumn' && rain && event(dt, 0.1)) { addFeat('fairy', { life: 8 + rng() * 6, item: 'mushroom', n: 3 + Math.floor(rng() * 4) }); note('秋雨过后，草地上一夜之间冒出了一圈蘑菇（仙女环），去捡'); }
    // 野花：候鸟带来的、风吹来的种子，偶尔真的在岛上发了芽，成一小片；以后每年春天往旁边蔓延
    if ((m === 3 || m === 4 || m === 9) && event(dt, 0.02)) { const sp = pick(['berry', 'sun', 'poppy', 'dandelion', 'daisy']); addFeat('wild', { sp, r: 0.8 }); note('风或者候鸟带来的种子在岛上发了芽：长出了一小片' + WILD[sp]); }
    if (se === 'spring' && T > 10) for (const f of F().slice()) if (f.k === 'wild' && event(dt, 0.004)) { if (f.r < 2.6 && rng() < 0.6) f.r += 0.3; else if (F().filter((q) => q.k === 'wild').length < 14) { addFeat('wild', { sp: f.sp, r: 0.6, near: f.id }); } }
    for (const f of F()) if (f.k === 'wild' && f.sp === 'berry' && m === 5 && (f.fruit || 0) !== yr && event(dt, 0.2)) { f.fruit = yr; f.item = 'berry'; f.n = 2 + Math.floor(rng() * 4); note('那片野草莓熟了，红红的一片——走过去能摘'); }
    // 藻华：又热又旱的夏天，池水发绿，鱼少一阵；下几场雨就好了
    if (T > 29 && s.dry > 10 && !(s.algae > 0) && event(dt, 0.12)) { s.algae = 1; note('又热又旱，古城之池起了藻华，水发绿了，鱼憋得慌——下几场雨就会好'); }
    if (s.algae > 0) { s.algae = Math.max(0, s.algae - dt * (rain ? 0.2 : 0.03)); for (const id in s.fish) s.fish[id] *= Math.pow(0.985, dt); if (!s.algae) note('几场雨后池水清了，鱼也慢慢多回来'); }
    // 风筝：大风天偶尔有一只不知道从哪飘来的风筝挂在岛边的树上
    if (storm && event(dt, 0.03)) { const big = G.map((g, i) => [g, i]).filter(([g]) => g.on && g.age > 4); if (big.length) { addFeat('kite', { gi: pick(big)[1], col: pick(['#e85a4a', '#f0c040', '#5aa0d8', '#c868c8']), life: 90 + rng() * 200 }); note('大风刮来一只不知道谁家的风筝，挂在了岛边的树梢上'); } }
    // 神树开花：不是每年都开——有的年份春天满树开白花，秋天结果，金色的果子落在树下
    if (m === 3 && (s.bloomTry || 0) !== yr) { s.bloomTry = yr; if (rng() < 0.18) { s.bloom = yr; note('今年春天神树开花了！满树的白花，好几年才有一次'); } }
    if (s.bloom === yr && m === 9 && (s.fruitYr || 0) !== yr && event(dt, 0.3)) { s.fruitYr = yr; addFeat('fruit', { item: 'treefruit', n: 3 + Math.floor(rng() * 4), life: 30 }); note('神树结果了，金色的果子落在树下的回廊上——去捡（好几年才有一次，甜得很）'); }
    // 萤火虫：每年初夏的夜里都有，但多少每年都不一样（看春天的雨水）
    if (m === 4 && (s.ffYr || 0) !== yr) { s.ffYr = yr; s.ff = Math.max(0.1, Math.min(1, s.wet * (0.5 + rng()))); }
    // 枯死：苔太厚、太旱的年份，偶尔有小树没熬过去
    if (s.dry > 25 && T > 28 && event(dt, 0.05)) { const young = G.filter((g) => g.on && g.age < 3); if (young.length) { const g = pick(young); g.on = false; note('太旱了，一棵小' + spName(g.sp) + '没熬过去，枯死了'); } }
    // 过期的东西消失
    for (const f of F().slice()) if (f.life && s.days - f.day > f.life) { F().splice(F().indexOf(f), 1); if (f.k === 'ducks') note('那对野鸭飞走了'); }
  }
  const WILD = { berry: '野草莓', sun: '野向日葵', poppy: '虞美人', dandelion: '蒲公英', daisy: '雏菊' };
  const spName = (sp) => ({ oak: '橡树', birch: '白桦', maple: '枫树', pine: '松树' })[sp || 'oak'];
  /* 雨停了、太阳出来：一阵彩虹（不是每次都有） */
  let wasRain = false;
  function skyTick(kind, day) { const s = st(), rainNow = /rain|drizzle|storm/.test(kind); if (wasRain && !rainNow && day && (kind === 'clear' || kind === 'partly') && rng() < 0.65) { s.rainbow = Date.now() + 25 * 60000; note('雨停了，天边挂起一道彩虹'); } wasRain = rainNow; }
  /* 走到这些东西跟前就能收：陨石、野蜂窝滴下的蜜、蘑菇圈、熟了的野草莓、神树的果子。u,v 是你在哪 */
  function nearPick(u, v) { const s = st(); for (const f of F().slice()) { if (!f.item) continue; const xy = f.u != null ? [f.u, f.v] : f.gi != null && PP.FORT && PP.FORT.GROVE_XY ? PP.FORT.GROVE_XY[f.gi] : null; if (!xy || Math.hypot(xy[0] - u, xy[1] - v) > (f.k === 'hive' ? 3.5 : 2.6)) continue; const n = f.n || 1; PP.econ.give(f.item, n); const nm = (PP.econ.ITEMS[f.item] || {}).name || f.item; if (f.k === 'hive' || f.k === 'wild') { f.item = null; f.n = 0; } else F().splice(F().indexOf(f), 1); PP.save && PP.save.soon && PP.save.soon(); return `捡到了 ${nm}${n > 1 ? ' ×' + n : ''}`; } return null; }
  /* 给这些东西在岛上找个位置（要等浮岛建好、知道哪儿是屋子和路之后） */
  function placeFeats() { const C = PP.CITY; if (!C || !C.BUSY) return; for (const f of F()) { if (f.u != null || f.gi != null && f.k !== 'meteor' && f.k !== 'fairy' && f.k !== 'wild' && f.k !== 'fruit') continue; const near = f.near && F().find((q) => q.id === f.near && q.u != null);
      for (let i = 0; i < 40; i++) { let u, v; if (f.k === 'fruit') { const a = rng() * 6.28; u = 24 + Math.cos(a) * 10.5; v = 24 + Math.sin(a) * 10.5; } else if (near) { const a = rng() * 6.28; u = near.u + Math.cos(a) * 2.4; v = near.v + Math.sin(a) * 2.4; } else { const t = rng() * 6.28, r = 13 + rng() * (C.basR(t) - 12); u = 24 + Math.cos(t) * r; v = 24 + Math.sin(t) * r; }
        if (f.k !== 'fruit' && ((C.BUSY || []).some(([a, b, r]) => Math.hypot(u - a, v - b) < r + 1) || (C.FLAT || []).some((q) => u > q[0] - 1 && u < q[2] + 1 && v > q[1] - 1 && v < q[3] + 1) || C.inPond(u, v, 1.5))) continue; f.u = u; f.v = v; break; } } }
  /* 「居民的添置」：岛有人住，过一阵就会多点东西（按生长年数解锁，画在浮岛上） */
  const ADDS = [[0.08, 'birdhouse', '有人在回廊柱子上钉了几个鸟屋，春天会有小鸟住进去'], [0.5, 'bunting', '码头到栈道拉起了一串彩旗'], [1.2, 'lanterns', '树下的小路边多了几盏石灯笼'], [2.5, 'swing', '神树最低那根大枝上挂了一架秋千'], [5, 'bridge2', '有人在古城之池上又搭了一座小木桥'], [10, 'treehut', '神树的大枝上搭起了一座小小的观鸟屋']];
  function yearsGrown() { return st().gd / YEAR_GD; }
  function catchUp() {
    const s = st(), now = Date.now(); let t = s.last || now; const days = Math.min(3650 * 2, (now - t) / DAY);
    if (days > 0.5) { const whole = Math.floor(days); for (let i = 0; i < whole; i++) { curT = t + i * DAY; const d = new Date(curT), m = d.getMonth(), seed = Math.floor((t + i * DAY) / DAY), T = CLIM_T[m] + (hs(seed, 1) - 0.5) * 8, rain = hs(seed, 2) < CLIM_R[m], snow = rain && T < 1, storm = (m >= 5 && m <= 8) && hs(seed, 3) < 0.035; step(1, T, rain, snow, storm, m, false, seed); }
      curT = 0; s.last = t + whole * DAY; if (whole >= 1) note(`离开的这 ${whole} 天里，浮岛自己长着：${s.log.length ? '' : ''}按每天的气候算了一遍（雨水、气温都算进去了）`, now); }
    unlockAdds();
  }
  function unlockAdds() { const s = st(), y = yearsGrown(); for (const [yy, k, msg] of ADDS) if (y >= yy && !s.add[k]) { s.add[k] = Date.now(); note(msg); } }
  let lastLive = 0, curMM = null;
  function liveTick() {
    const s = st(), now = Date.now(); if (!s.last) s.last = now; const dt = (now - s.last) / DAY; if (dt < 0.003) return; // 4 分钟左右算一次
    let T = 18, kind = 'clear'; try { const e = PP.env.get(); T = e.weather.temp != null ? e.weather.temp : CLIM_T[new Date().getMonth()]; kind = e.weather.kind || 'clear'; } catch (e) {}
    const rain = /rain|drizzle|storm/.test(kind), snow = /snow/.test(kind), storm = kind === 'storm', m = new Date().getMonth(), seed = Math.floor(now / 600000); curMM = ({ drizzle: 3, rain: 10, heavyrain: 25, storm: 30, snow: 4, heavysnow: 8 })[kind] || 0;
    step(dt, T, rain, snow, storm && now - lastLive > 3 * 3600000, m, true, seed); { const h = new Date().getHours(); skyTick(kind, h >= 7 && h < 18); } if (storm) lastLive = now; s.last = now; s.why = reasons(T, kind); unlockAdds(); PP.save && PP.save.soon && PP.save.soon();
  }
  function reasons(T, kind) { const s = st(), out = []; const m = new Date().getMonth(), se = seasonOf(m); out.push(({ spring: '春天，万物生长', summer: '夏天，长得旺', autumn: '秋天，慢慢收着长', winter: '冬天，大多在休眠' })[se]); out.push(`现在 ${Math.round(T)}°`); if (/rain|drizzle/.test(kind)) out.push('在下雨，喝饱了水'); else if (kind === 'storm') out.push('暴风雨'); else if (/snow/.test(kind)) out.push('下雪'); if (s.dry > 10 && T > 22) out.push(`已经 ${Math.round(s.dry)} 天没下雨，有点旱`); return out; }
  /* 给画浮岛用的快照（按格子取整：一天里变化很小，不会老是重建） */
  function snap() { const s = st(), gd = s.gd, q = (x, k = 40) => Math.round(x * k) / k;
    if (!s.grove) { s.grove = Array.from({ length: 40 }, (_, i) => ({ on: i < 22, age: 1.5 + rng() * 12, dead: false, sp: i < 22 ? (rng() < 0.75 ? 'oak' : newSpecies()) : 'oak', lean: (rng() - 0.5) * 0.8, hk: 0.75 + rng() * 0.5 })); }
    return { years: q(gd / YEAR_GD, 20), tree: q(1 - Math.exp(-gd / (YEAR_GD * 18))), moss: q(1 - Math.exp(-(gd + YEAR_GD * 0.8) / (YEAR_GD * 2.5))), vine: q(1 - Math.exp(-(gd + YEAR_GD * 0.6) / (YEAR_GD * 3))), grove: s.grove.map((g) => (g.on ? q(Math.min(1, 1 - Math.exp(-g.age / 7)), 20) : g.dead ? (g.burnt ? -2 : -1) : 0)), gsp: s.grove.map((g) => [g.sp || 'oak', Math.round((g.lean || 0) * 10) / 10, Math.round((g.hk || 1) * 10) / 10]), add: Object.keys(s.add).sort(), algae: q(s.algae || 0, 5), bloom: s.bloom === new Date().getFullYear() && [2, 3, 4].includes(new Date().getMonth()), scars: Math.min(6, s.scars || 0), feat: (placeFeats(), F().filter((f) => f.u != null || f.gi != null).map((f) => ({ k: f.k, u: f.u != null ? Math.round(f.u * 10) / 10 : null, v: f.v != null ? Math.round(f.v * 10) / 10 : null, gi: f.gi, sp: f.sp, r: f.r, col: f.col, ripe: !!f.item, n: f.n }))) }; }
  function key() { return JSON.stringify(snap()); }
  function caught(id) { const s = st(); if (s.fish[id] != null) s.fish[id] = Math.max(0.3, s.fish[id] - 1); }
  function fishK(id) { const f = PP.FISHDEX && PP.FISHDEX.BY[id]; if (!f) return 1; return Math.max(0.15, fishPop(id) / (FISH_K[f.rare] || 10)); }
  /* 「浮岛生长」面板：岛几岁了、现在长得快不快（为什么）、每样东西长到哪一步了、水里的鱼多不多、东西都是从哪来的、最近发生的事 */
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bar = (k, col = '#7ab85a') => `<i class="pbar" style="width:90px"><i style="width:${Math.round(Math.max(0, Math.min(1, k)) * 100)}%;background:${col}"></i></i>`;
  const lvl = (k) => ['很少', '不多', '挺多', '很多'][Math.min(3, Math.floor(k * 4))];
  function html() {
    try { liveTick(); } catch (e) {} const s = st(), sn = snap(), y = s.gd / YEAR_GD, days = Math.floor((Date.now() - s.born) / DAY) + 1, G = s.grove || [];
    const gs = { sap: G.filter((g) => g.on && g.age < 2).length, young: G.filter((g) => g.on && g.age >= 2 && g.age < 8).length, big: G.filter((g) => g.on && g.age >= 8 && g.age < 40).length, old: G.filter((g) => g.on && g.age >= 40).length, dead: G.filter((g) => g.dead).length };
    const nextAdd = ADDS.find(([yy, k]) => !s.add[k]);
    const fishRows = PP.FISHDEX ? PP.FISHDEX.FISH.filter((f) => f.eff !== 'junk' && f.id !== 'bottle').map((f) => `<span class="ecofish">${esc(f.name)} ${bar(fishK(f.id), '#5aa8d8')}</span>`).join('') : '';
    return `<div class="sec">浮岛生长</div>
      <p>这座浮岛是活的：按现实的日子一天天长，你不开它也照样长（下次打开时，按这些天每天的气候补算）。暖和、下雨长得快；冬天、干旱、太热长得慢；暴风雨会吹断枯枝、刮倒老树。整个生长按 <b>50 年</b>设计。</p>
      <div class="ecorow"><b>今天是浮岛的第 ${days} 天</b>　攒下的生长 ≈ ${y < 1 ? Math.round(y * 365) + ' 天' : y.toFixed(1) + ' 年'}的好年景　${bar(y / 50, '#c8a84a')} <small>50 年</small></div>
      <div class="ecorow">现在的生长速度：<b>${(() => { if (!s.why || !s.why.length) { try { const e = PP.env.get(); s.why = reasons(e.weather.temp != null ? e.weather.temp : 15, e.weather.kind); s.rate = plantRate(e.weather.temp != null ? e.weather.temp : 15, /rain|drizzle|storm/.test(e.weather.kind), /snow/.test(e.weather.kind), s.dry); } catch (er) {} } return ''; })()}${s.rate >= 1.1 ? '很快' : s.rate >= 0.8 ? '正常' : s.rate >= 0.4 ? '慢' : '几乎停着（休眠）'}</b>（${esc((s.why && s.why.length ? s.why : ['还没算']).join('，'))}）　土壤湿度 ${bar(s.wet, '#8a6a4a')}</div>
      <div class="sec2">植物</div>
      <div class="ecorow">神树 ${bar(sn.tree, '#5a9a4a')} <small>千年老树，五十年里树冠还会往外撑、多分出几根大枝</small></div>
      <div class="ecorow">苔藓 ${bar(sn.moss, '#6a9a4a')} <small>石头、树皮、屋顶上越长越厚</small>　藤蔓 ${bar(sn.vine, '#4a8a3a')} <small>四五年爬满小屋的墙</small></div>
      <div class="ecorow">岛边的小树林：树苗 ${gs.sap} · 小树 ${gs.young} · 成材 ${gs.big} · 老树 ${gs.old}${gs.dead ? ' · 倒木 ' + gs.dead : ''} <small>成材的树春天落种，旁边冒新苗；四十多年的老树会在暴风雨里倒下</small></div>
      <div class="sec2">水里和草里</div>
      <div class="ecofishes">${fishRows}</div>
      <div class="ecorow"><small>春天水暖了鱼会产卵，数量涨得快；钓走的会少一阵，过些天又长回来。钓的时候，水里多的鱼更容易来咬钩。</small></div>
      <div class="ecorow">蚯蚓 ${lvl(s.pop.worm)}　红虫 ${lvl(s.pop.blood)}　小河虾 ${lvl(s.pop.shrimp)}　浮萍 ${lvl(s.pop.duck)}　蚱蜢 ${lvl(s.pop.hopper)}　蟋蟀 ${lvl(s.pop.cricket)}</div>
      <div class="sec2">东西都是从哪来的</div>
      <ul class="ecosrc"><li><b>种子</b>：收菜时留的种（向日葵、瓜果里的籽；胡萝卜卷心菜要等抽薹才有）；春秋候鸟在岛上歇脚时带来的；探险带回来的；加工工坊里也能专门留种。</li>
        <li><b>鱼饵</b>：蚯蚓在工坊的堆肥箱里（厨房的菜叶、收菜剩的茎叶堆出来的，下雨后最多）；红虫在池底淤泥里；小河虾进虾笼；浮萍漂在池面；蚱蜢、蟋蟀在草地里；钓到的小麦穗鱼、青鳉放进活饵桶；面团、蜜玉米粒、菜叶团用自己种的玉米、卷心菜和蜂蜜做；拟饵用柴刻、用草莓汁上色。</li>
        <li><b>柴</b>：暴风雨吹断的枯枝、修剪下来的树枝。<b>蜂蜜</b>：蜂箱里的蜜蜂采岛上的花。<b>鸡蛋</b>：屋顶鸟巢。<b>蘑菇</b>：秋雨后的树根和倒木边。</li></ul>
      <div class="sec2">这座岛独有的经历</div>
      <div class="ecorow"><small>世界本来就是随机的：每座浮岛出生时都有自己的「运」（这座是 #${(((s.rs >>> 0) % 99991) + '').padStart(5, '0')}），同样的季节和天气，在不同的岛上会走出不一样的结果——雷劈中哪棵树、候鸟带来什么种子、哪年神树开花、野鸭来不来……谁也说不准，过一阵回来看看总会有点不一样。</small></div>
      <div class="ecorow">${(() => { const fs = s.feat || [], c = (k) => fs.filter((f) => f.k === k).length, wild = {}; fs.filter((f) => f.k === 'wild').forEach((f) => (wild[f.sp] = (wild[f.sp] || 0) + 1)); const out = [];
        if (Object.keys(wild).length) out.push('野花：' + Object.keys(wild).map((k) => WILD[k] + ' ' + wild[k] + ' 片').join('、')); if (c('ducks')) out.push('池里住着一窝野鸭'); if (c('hive')) out.push('岛边树上有个野蜂窝'); if (c('kite')) out.push('树梢挂着一只风筝'); if (c('meteor')) out.push('<b>岛上某处有一块还没捡的陨石</b>'); if (c('fairy')) out.push('草地上有一圈蘑菇'); if (c('fruit')) out.push('<b>神树下落着果子</b>');
        if (s.scars) out.push('神树上 ' + s.scars + ' 道雷劈的焦痕'); const burnt = (s.grove || []).filter((g) => g.burnt).length; if (burnt) out.push(burnt + ' 棵被雷劈过的树桩'); if (s.algae > 0) out.push('池子正闹藻华'); if (s.bloom) out.push(s.bloom + ' 年春天神树开过花');
        const sp = {}; (s.grove || []).filter((g) => g.on).forEach((g) => (sp[g.sp || 'oak'] = (sp[g.sp || 'oak'] || 0) + 1)); out.push('林子里：' + Object.keys(sp).map((k) => spName(k) + ' ' + sp[k]).join('、'));
        const dex = (E().dex || {}), vars = []; for (const id in dex) for (const v in (dex[id].vars || {})) vars.push(((PP.FISHDEX.BY[id] || {}).name || id) + '（' + ({ gold: '金色', albino: '白化', giant: '巨型' })[v] + '）'); if (vars.length) out.push('钓到过的罕见个体：' + vars.join('、'));
        return out.join('<br>'); })()}</div>
      <div class="sec2">住在岛上的大家添置的东西</div>
      <div class="ecorow">${ADDS.filter(([, k]) => s.add[k]).map(([, , msg]) => '✓ ' + esc(msg)).join('<br>') || '还没有'}${nextAdd ? `<br><small>下一件：岛再长到 ${nextAdd[0] < 1 ? Math.round(nextAdd[0] * 365) + ' 天' : nextAdd[0] + ' 年'}的样子</small>` : ''}</div>
      <div class="sec2">最近</div><div class="ecorow ecolog">${s.log.slice(0, 10).map((l) => `<small>${new Date(l.t).toLocaleDateString()}</small> ${esc(l.msg)}${l.n > 1 ? `（这阵子 ${l.n} 次）` : ''}`).join('<br>') || '<small>还没有什么事</small>'}</div>`;
  }
  function init() { if (!PP.econ || !PP.econ.E || !G().save) return setTimeout(init, 300); try { catchUp(); } catch (e) { console.error(e); } if (PP.econTabs && !PP.econTabs.some((t) => t.k === 'eco')) PP.econTabs.push({ k: 'eco', n: '浮岛生长', html: () => html() }); setInterval(() => { try { liveTick(); } catch (e) {} }, 60000); }
  const G = () => PP.G;
  setTimeout(init, 800);
  PP.ECO = { nearPick, rng, WILD, spName, html, st, snap, key, catchUp, liveTick, yearsGrown, fishPop, fishK, caught, note, reasons, ADDS, YEAR_GD, seasonOf };
})();
