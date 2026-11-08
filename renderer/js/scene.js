// 场景：一条路串起来的五个地方 —— 雪原 ←→ 湖边 ←→ 森林 ←→ 草地 ←→ 农场（走到路牌那儿点一下）
// 每只动物在其中一个地方有自己的家（见 places.js），每天在各处觅食、玩、回家睡觉（见 eco.js）
// 画面跟着季节·节气、节日、天气、一天中的时刻变化；场景里的装饰可以自己重新布置。
// 显示模式：mini 极简（只留主角）/ band 小场景（任务栏上方一条）/ full 全屏
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;

  // 九个地方，一条路串起来（从左到右）
  const SCENES = {}; (PP.WORLD || []).forEach(([k, n]) => (SCENES[k] = { name: n, out: true }));
  const EXITS = {}, LINKS = {};
  const CH = PP.CHAIN || PP.WORLD.map((w) => w[0]);
  PP.WORLD.forEach(([k]) => { EXITS[k] = []; LINKS[k] = []; });
  CH.forEach((k, i) => { if (i > 0) { EXITS[k].push([-1, CH[i - 1]]); LINKS[k].push(CH[i - 1]); } if (i < CH.length - 1) { EXITS[k].push([1, CH[i + 1]]); LINKS[k].push(CH[i + 1]); } });
  // 套在父场景里的次场景：只有一个路牌回父场景；父场景里有个入口
  for (const [sub, parent] of Object.entries(PP.NEST || {})) { EXITS[sub] = [[-1, parent]]; LINKS[sub] = [parent]; LINKS[parent].push(sub); }
  if (SCENES.cave) SCENES.cave.out = false;
  if (SCENES.undergrove) SCENES.undergrove.out = false;
  PP.ROUTE = PP.WORLD.map((w) => w[0]);
  PP.LINKS = LINKS;
  // 两个地方之间要走几段路、下一站去哪
  const pathCache = {};
  function path(a, b) {
    const key = a + '>' + b; if (pathCache[key]) return pathCache[key];
    const prev = { [a]: null }, q = [a];
    while (q.length) { const c = q.shift(); if (c === b) break; for (const n of LINKS[c] || []) if (!(n in prev)) { prev[n] = c; q.push(n); } }
    const out = []; let c = b; if (!(b in prev)) return (pathCache[key] = [a, b]);
    while (c != null) { out.unshift(c); c = prev[c]; }
    return (pathCache[key] = out);
  }
  PP.hops = (a, b) => (a === b ? 0 : path(a, b).length - 1);
  PP.nextHop = (a, b) => (a === b ? b : path(a, b)[1] || b);
  PP.SCENES = SCENES; PP.EXITS = EXITS;
  // 每种动物的家在哪个场景
  PP.SCENE_FAV_OLD = { turtle: 'sea', crab: 'sea', octopus: 'sea', cat: 'farm', dog: 'farm', chick: 'farm', pig: 'farm', rabbit: 'meadow', hamster: 'meadow', fox: 'forest', hedgehog: 'forest', dragon: 'forest', frog: 'lake', duck: 'lake', capybara: 'lake', penguin: 'snow' };
  PP.MODES = [['mini', '极简', '只留主角，安安静静待在右下角'], ['band', '小场景', '任务栏上方一条，大家在里面过日子'], ['full', '全屏场景', '整块屏幕都是它们的世界（一打字就自动收起）']];

  // 装饰：k → [名字, 室内?]
  const DECOR = {
    pine: ['松树'], oak: ['大树'], apple: ['苹果树'], bush: ['灌木'], flower: ['小花'], mushroom: ['蘑菇'], rock: ['石头'], stump: ['树桩'],
    lamp: ['路灯'], bench: ['长椅'], fence: ['栅栏'], hay: ['草垛'], reed: ['芦苇'], lily: ['荷叶'], snowman: ['雪人'], pumpkin: ['南瓜'],
    palm: ['椰子树'], cactus: ['仙人掌'], bamboo: ['竹子'],
  };
  PP.DECOR = DECOR;
  // 默认布置：树在后排、和家错开；小东西零星点缀，不挤在一起
  function defaultDecor(scene) {
    const L = (k, xs, v) => xs.map((x, i) => ({ k, x, v: v != null ? v : ((i * 37) % 10) / 10 }));
    const winter = PP.season() === 'winter';
    switch (scene) {
      case 'snow': return [...L('pine', [0.035, 0.27, 0.565, 0.975], 0.5), ...L('rock', [0.33, 0.705], 0.3), ...L('snowman', [0.42], 0.2)];
      case 'mountain': return [...L('pine', [0.04, 0.16, 0.56, 0.72], 0.4), ...L('rock', [0.27, 0.66], 0.5), ...L('bush', [0.39], 0.2)];
      case 'forest': return [...L('pine', [0.035, 0.205, 0.585, 0.785], 0.6), ...L('oak', [0.075, 0.68, 0.98], 0.4), ...L('bush', [0.17, 0.52, 0.9], 0.3), ...L('flower', [0.25, 0.44, 0.8], 0.6), ...L('lamp', [0.61], 0.1), ...(winter ? L('snowman', [0.92], 0.1) : [])];
      case 'lake': return [...L('pine', [0.02, 0.97], 0.6), ...L('oak', [0.6], 0.8), ...L('reed', [0.22, 0.38, 0.73], 0.2), ...L('lily', [0.18, 0.47, 0.56, 0.68], 0.5), ...L('rock', [0.2, 0.76], 0.3), ...L('bench', [0.62], 0.1), ...L('flower', [0.35, 0.71], 0.7)];
      case 'meadow': return [...L('oak', [0.04], 0.5), ...L('bush', [0.11, 0.4, 0.72], 0.3), ...L('flower', [0.08, 0.15, 0.28, 0.36, 0.55, 0.74, 0.84, 0.97], 0.5), ...L('bench', [0.5], 0.1)];
      case 'farm': return [...L('oak', [0.025], 0.4), ...L('fence', [0.06], 0.1), ...L('flower', [0.465, 0.62, 0.84], 0.7), ...L('lamp', [0.405], 0.1), ...(PP.env && PP.env.get().holiday && PP.env.get().holiday.id === 'halloween' ? L('pumpkin', [0.82]) : [])];
      case 'desert': return [...L('rock', [0.36, 0.86], 0.4), ...L('cactus', [0.05], 0.5)];
      case 'beach': return [...L('rock', [0.17], 0.4), ...L('palm', [0.97], 0.4)];
      case 'savanna': return [...L('rock', [0.06, 0.55], 0.4), ...L('bush', [0.26], 0.2)];
      case 'sea': return [...L('rock', [0.3, 0.78], 0.3)];
      case 'antarctic': return [];
      case 'cave': return [];
      case 'skyisle': case 'academy': case 'undergrove': return [];
      case 'jungle': return [...L('bush', [0.15, 0.38, 0.62], 0.4), ...L('flower', [0.2, 0.55], 0.5)];
    }
    return [];
  }
  const settings = () => G.save.settings;
  const decorOf = (scene) => settings().decor[scene] || defaultDecor(scene);

  // ---------- 几何 ----------
  function mode() { return (G.save && settings().mode) || 'band'; }
  function active() { const m = mode(); return m === 'full' || m === 'band'; }
  // 场景像素和宠物像素一样大（1 格 = G.S 屏幕像素），画面更细
  function geo() {
    const m = mode();
    const u = Math.max(1, G.S);
    if (m === 'full') return { m, y0: 0, H: G.H, u };
    if (m !== 'band') return null;
    const H = bandHeight();
    return { m, y0: G.H - H, H, u };
  }
  function height() { const g = geo(); return g ? g.H : 0; }
  // 小场景模式下场景条有多高（不管现在是什么模式，按钮都按这个位置放，切换模式时按钮不会跳走）
  function bandHeight() { return Math.round([0, 120, 170, 230][(G.save && settings().bgH) || 2] * U.clamp(G.S / 2, 0.75, 1.6)); }

  // 固定种子的伪随机
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // ---------- 静态层：画在一张和宠物同样像素大小的画布上（季节/节日/布置变了才重画） ----------
  let cache = null, key = '', L = null, inside = null; // inside: 正在看谁的家（物种） // L: 布局信息（地面行、热点、灯、装饰框、家…）
  function build(scene, g, env) {
    const A = PP.ART, u = g.u, H = g.H;
    const cols = Math.ceil(G.W / u), rows = Math.ceil(H / u);
    const P = new A.Pix(cols, rows);
    const R = rng(cols * 31 + rows + scene.length * 7);
    const full = g.m === 'full';
    const season = scene === 'snow' ? 'winter' : env.season, hol = env.holiday && env.holiday.id;
    const gh = Math.round(rows * (full ? 0.3 : 0.34));
    const gy = rows - gh, base = gy + 2;
    const lay = { cols, rows, gy, base, hots: [], lights: [], lanterns: [], xmas: [], boxes: [], items: [], season, hol, scene, full, water: null, spots: {}, homes: [] };
    PP.BIOMES[scene](P, lay, R, env);
    scatter(lay, R);
    // 自己布置的装饰
    decorOf(scene).forEach((d, i) => { const it = decorItem(d, lay, R); if (it) { it.decor = d; it.di = i; lay.items.push(it); } });
    // 路牌：只有套在别的场景里的次场景（洞穴）留一个“出去”的牌子；其它地方用场景按钮里的地图直接去
    for (const [side, to] of (PP.NEST && PP.NEST[scene] ? EXITS[scene] : [])) {
      const sg = A.sign(SCENES[to].name, season === 'winter');
      const c = side < 0 ? 16 : cols - 16, r = base + 3;
      lay.items.push({ s: sg, c, r });
      lay.hots.push({ x0: c - 14, y0: r - sg.h, x1: c + 14, y1: r + 1, tip: `${side < 0 ? '← ' : ''}回到${SCENES[to].name}${side > 0 ? ' →' : ''}`, go: to, sign: { x: c - 13, y: r - sg.h + 1, side, label: SCENES[to].name } });
    }
    // 从后往前贴
    lay.items.sort((a, b) => a.r - b.r);
    for (const it of lay.items) {
      const bx = it.s.stamp(P, it.c, it.r + 1, 0.5, 1);
      if (it.decor) lay.boxes.push({ i: it.di, x0: bx.x0, y0: bx.y0, x1: bx.x1, y1: bx.y1 });
      if (it.light) lay.lights.push({ x: bx.x0 + it.light[0], y: bx.y0 + it.light[1], w: it.light[2], h: it.light[3], r: 7 });
      if (it.top) lay.treeTop = [it.c, bx.y0];
      if (it.lantern) lay.lanterns.push([it.c + 3, bx.y0 + Math.round(it.s.h * 0.45)]);
    }
    // 小场景：顶上用抖动渐隐，和桌面自然衔接
    if (!full) for (let y = 0; y < 6; y++) for (let x = 0; x < cols; x++) if (!A.dith(x, y, (y + 1) / 7)) P.d[y * cols + x] = 0;
    lightPass(P.d, P.w, P.h, lay.gy); PP.gradePix && PP.gradePix(P.d); return { cv: P.canvas(), lay };
  }
  // 地面上的零碎：前后错落，越靠前越大一点，避开小路、水和房子门口
  function scatter(lay, R) {
    const A = PP.ART, sc = lay.scene, s = lay.season, w = s === 'winter' || sc === 'snow';
    if (lay.under || lay.cave || lay.noScatter) return;
    const depth = lay.rows - lay.base - 2; if (depth < 4) return;
    const bad = (c, r) => (lay.path && Math.abs(r - lay.path) < 6) || (lay.water && r >= lay.water.y0 - 1 && r <= lay.water.y1 + 2) || lay.homes.some((h) => c > h.x0 - 4 && c < h.x1 + 4 && r < h.y1 + 6) || c < 30 || c > lay.cols - 30;
    // 一丛一丛地长，不是均匀撒满
    const groups = Math.round(lay.cols / (lay.full ? 28 : 85) * (sc === 'desert' || sc === 'beach' || w ? 0.5 : 1));
    for (let g = 0; g < groups; g++) {
      const gc = 30 + R() * (lay.cols - 60), gr = lay.base + 3 + Math.pow(R(), 0.9) * depth, m = 2 + Math.floor(R() * 4);
      const fl = R() < 0.5; // 这一丛主要是花还是草
      for (let i = 0; i < m; i++) {
        const c = Math.round(gc + (R() - 0.5) * 14), r = Math.round(Math.min(lay.rows - 1, gr + (R() - 0.5) * 4));
        if (bad(c, r)) continue;
        const k = R(), big = lay.full && (r - lay.base) / depth > 0.5;
        let sp = null;
        if (sc === 'desert') sp = k < 0.6 ? A.rock(2, R, false, '#c8a070') : A.grassTuft('autumn', R);
        else if (sc === 'beach') sp = k < 0.5 ? A.rock(1, R, false, '#e8d8c0') : null;
        else if (w) sp = k < 0.3 ? A.rock(2, R, true) : A.grassTuft('winter', R);
        else if (i === 0 && k < 0.3) sp = big ? A.bush(4 + Math.floor(R() * 2), s, R, sc === 'forest' ? '#c8283a' : null) : A.rock(2 + Math.floor(R() * 2), R, false);
        else sp = fl && k < 0.6 ? A.flower(s, R) : A.grassTuft(s, R, big && k > 0.7);
        if (sp) lay.items.push({ s: sp, c, r });
      }
    }
  }
  // 家里面
  function buildInside(sp, scene, g, env) {
    const A = PP.ART, u = g.u, cols = Math.ceil(G.W / u), rows = Math.ceil(g.H / u), full = g.m === 'full';
    // 屋子不铺满整个屏幕：像一个剖开的小房子，摆在中间
    const rw = Math.min(cols - 8, Math.max(240, Math.round(cols * (full ? 0.62 : 0.5)))), ox = Math.round((cols - rw) / 2);
    const top = full ? Math.round(rows * 0.18) : 0, rh = rows - top;
    const gh = Math.round(rh * (full ? 0.32 : 0.38)), gy = rh - gh, base = gy + 2;
    const season = scene === 'snow' ? 'winter' : env.season;
    const lay = { cols: rw, rows: rh, gy, base, hots: [], lights: [], lanterns: [], xmas: [], boxes: [], items: [], season, scene, full, water: null, spots: {}, homes: [], inside: sp };
    const Q = new A.Pix(rw, rh);
    PP.INTERIOR[sp](Q, lay, rng(cols * 7 + sp.length), env);
    lay.items.sort((a, b) => a.r - b.r);
    for (const it of lay.items) { const bx = it.s.stamp(Q, it.c, it.r + 1, 0.5, 1); if (it.light) lay.lights.push({ x: bx.x0 + it.light[0], y: bx.y0 + it.light[1], w: it.light[2], h: it.light[3], r: 7, col: it.col }); }
    const P = new A.Pix(cols, rows);
    if (full) P.rect(0, 0, cols, rows, '#1a1418');
    // 外框 + 影子
    P.rect(ox + 3, top + 3, rw, rh, '#00000055');
    Q.stamp(P, ox, top, 0, 0);
    P.rect(ox - 2, top, 2, rh, '#2a2026'); P.rect(ox + rw, top, 2, rh, '#2a2026'); if (full) P.rect(ox - 2, top - 2, rw + 4, 2, '#2a2026');
    // 坐标挪到整张画布上
    const sh = (o) => { if (!o) return o; if (o.c != null) o.c += ox; if (o.r != null) o.r += top; return o; };
    Object.values(lay.spots).forEach(sh);
    lay.lights.forEach((l) => { l.x += ox; l.y += top; });
    lay.cols = cols; lay.rows = rows; lay.gy += top; lay.base += top; lay.room = { x0: ox, x1: ox + rw, top };
    const d = lay.door || { c: 22, top: gy - 20 };
    lay.hots.push({ x0: ox + d.c - 9, y0: top + d.top, x1: ox + d.c + 9, y1: lay.gy + 1, tip: '← 出去', leave: true });
    const sg = A.sign('出去', season === 'winter'), c = ox + rw - 16, r = lay.base + 3;
    sg.stamp(P, c, r + 1, 0.5, 1);
    lay.hots.push({ x0: c - 14, y0: r - sg.h, x1: c + 14, y1: r + 1, tip: '回到外面', leave: true, sign: { x: c - 13, y: r - sg.h + 1, side: 1, label: '出去' } });
    if (lay.steam) sh(lay.steam);
    lay.bubblesX = lay.bubbles ? [ox, rw] : null;
    if (!full) for (let y = 0; y < 4; y++) for (let x = 0; x < cols; x++) if (!A.dith(x, y, (y + 1) / 5)) P.d[y * cols + x] = 0;
    lightPass(P.d, P.w, P.h, lay.gy); PP.gradePix && PP.gradePix(P.d); return { cv: P.canvas(), lay };
  }
  // 装饰 → 精灵
  function decorItem(d, lay, R) {
    const A = PP.ART, s = lay.season, w = s === 'winter', v = d.v || 0, c = Math.round(d.x * lay.cols);
    const room = Math.max(16, lay.base - 3), z = lay.full ? 1.35 : 1;
    const tall = (n) => Math.min(room, Math.round(n * z));
    const back = lay.base + Math.round(v * 2), front = lay.base + 3 + Math.round(v * Math.max(1, lay.rows - lay.base - 6));
    switch (d.k) {
      case 'pine': return { s: A.pine(tall(42 + v * 22), s, R, w || lay.scene === 'snow'), c, r: back, top: true, lantern: true };
      case 'oak': return { s: A.broadleaf(tall(38 + v * 16), s, R, v > 0.6 ? 'birch' : v > 0.3 && s === 'autumn' ? 'maple' : 'oak'), c, r: back, lantern: true };
      case 'apple': return { s: A.broadleaf(tall(36 + v * 10), s, R, 'apple'), c, r: back, lantern: true };
      case 'palm': return { s: A.palm(tall(40 + v * 12), R), c, r: back };
      case 'cactus': return { s: A.cactus(tall(16 + v * 12), R), c, r: back + 2 };
      case 'bamboo': return { s: A.bamboo(tall(34 + v * 14), s, R), c, r: back };
      case 'bush': return { s: A.bush(Math.round((5 + v * 3) * z), s, R), c, r: back + 2 };
      case 'flower': return { s: A.flower(s, R), c, r: front };
      case 'mushroom': return { s: A.mushrooms(s), c, r: back + 3 };
      case 'rock': return { s: A.rock(Math.round((3 + v * 4) * z), R, w || lay.scene === 'snow'), c, r: back + 3 };
      case 'stump': return { s: A.stump(w), c, r: back + 2 };
      case 'lamp': return { s: A.lamp(w), c, r: back + 1, light: [1, 2, 6, 4] };
      case 'bench': return { s: A.bench(w), c, r: back + 2 };
      case 'fence': return { s: A.fence(24, w), c, r: back + 1 };
      case 'hay': return { s: A.hayBale(w), c, r: back + 2 };
      case 'reed': return { s: A.reeds(Math.round(14 * z), s), c, r: back + 1 };
      case 'lily': return lay.water && !lay.water.ice ? { s: A.lily(s), c, r: Math.round(lay.water.y0 + (lay.water.y1 - lay.water.y0) * (0.35 + v * 0.4)) } : null;
      case 'snowman': return { s: A.snowman(), c, r: back + 3 };
      case 'pumpkin': return { s: A.pumpkin(), c, r: front };
    }
    return null;
  }
  // 兼容旧代码
  const BIG = {};

  // ---------- 动态层 ----------
  const fxs = []; // 天气粒子（雨、雪、烟花、落叶…）
  let flash = 0, nextBolt = 6, fade = 0, fadeTo = null, hover = null;
  let bats = [], nextRocket = 2, birds = [], nextBirds = 20, fish = null, ripples = [], lampsOff = {}, shoot = null;
  let fogCv = null;
  // 画面精修：天光从上面打下来——所有东西朝天的那一圈亮边（树冠、屋顶、山头），地面越往前越深一点，有景深
  function lightPass(d, w, h, gy) {
    const lit = (v, k, tr, tg, tb) => { const r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255; return ((v >>> 24) << 24 | (Math.round(b + (tb - b) * k) << 16) | (Math.round(g + (tg - g) * k) << 8) | Math.round(r + (tr - r) * k)) >>> 0; };
    const src = d.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, v = src[i]; if (!(v >>> 24)) continue;
      const up = y > 0 ? src[i - w] >>> 24 : 0, up2 = y > 1 ? src[i - 2 * w] >>> 24 : 0;
      if (!up) d[i] = lit(v, 0.2, 255, 246, 222);
      else if (!up2) d[i] = lit(v, 0.08, 255, 246, 222);
      if (gy && y > gy + 2) { const k = Math.min(1, (y - gy - 2) / Math.max(6, h - gy - 2)) * 0.12; d[i] = lit(d[i], k, 58, 40, 70); }
    }
  }

  function skyCols(e) {
    const W = e.fx, ph = e.time.phase;
    let top = { dawn: '#f6b0a0', day: '#7fc8f8', dusk: '#f08a60', night: '#0e1433' }[ph];
    let bot = { dawn: '#ffe3b8', day: '#d5efff', dusk: '#6a5ca8', night: '#28305f' }[ph];
    const grey = Math.min(0.7, W.cloud * 0.4 + W.rain * 0.35 + W.snow * 0.3 + W.fog * 0.3);
    if (grey > 0) { top = mix(top, ph === 'night' ? '#1c2030' : '#7a8494', grey); bot = mix(bot, ph === 'night' ? '#2a2e3c' : '#b4bcc6', grey); }
    return PP.gradeHex ? [PP.gradeHex(top), PP.gradeHex(bot)] : [top, bot];
  }
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t), g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t), bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  function ensure() {
    const g = geo(); if (!g) return null;
    const s = settings(), scene = SCENES[s.scene] ? s.scene : 'forest', e = PP.env.at(scene);
    if (inside && !(PP.INTERIOR && PP.INTERIOR[inside])) inside = null;
    const k = [scene, inside || '', g.m, G.W, g.H, g.u, e.season, e.holiday ? e.holiday.id : '', JSON.stringify(s.decor[scene] || 0), s.ownerName, PP.ownSpecies ? PP.ownSpecies(scene).join(',') : ''].join('|');
    if (k !== key) { const r = inside ? buildInside(inside, scene, g, e) : build(scene, g, e); cache = r.cv; L = r.lay; key = k; lampsOff = {}; }
    return { g, e, scene };
  }

  // 场景按钮点一下：把场景画面藏起来（动物还在），再点一下显示
  const hidden = () => !!(G.save && settings().sceneHidden && !inside);
  function render(ctx) { if (hidden()) return; renderInner(ctx); }
  PP.sceneFade = () => 1;
  function renderInner(ctx) {
    if (!G.save) return;
    const st = ensure(); if (!st) return;
    const { g, e, scene } = st, u = g.u, y0 = g.y0, W = G.W, t = G.t, F = e.fx;
    const out = SCENES[scene].out && !inside, ph = e.time.phase, night = ph === 'night';
    const R = (x, y, col, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x) * u, y0 + Math.round(y) * u, w * u, h * u); };
    // 天空（全屏模式）
    if (g.m === 'full' && out) {
      const [top, bot] = skyCols(e);
      const gr = ctx.createLinearGradient(0, 0, 0, G.H * 0.8); gr.addColorStop(0, top); gr.addColorStop(1, bot);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, G.H);
      drawSkyBodies(ctx, g, e, R);
    } else if (out && night && F.cloud < 0.6 && !F.rain && !F.snow) {
      // 小场景：夜里右上角挂个月亮
      const big = e.holiday && e.holiday.id === 'midautumn', r = big ? 5 : 3, mx = L.cols - 34, my = 4;
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) R(mx + xx, my + yy + r, '#fff3b0');
    }
    ctx.imageSmoothingEnabled = false; ctx.drawImage(cache, 0, y0, cache.width * u, cache.height * u);

    // 湖：波光、倒影里的涟漪、跳起来的鱼
    if (L.water && !L.water.ice) {
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let x = 0; x < L.cols; x += 11) { const o = Math.round(Math.sin(t * 1.3 + x / 7) * 2), yy = L.water.y0 + 1 + ((x * 7) % Math.max(1, L.water.y1 - L.water.y0 - 2)); ctx.fillRect((x + o) * u, y0 + yy * u, 3 * u, u); }
      for (const r of ripples) { const a = 1 - r.t / r.max, rr = 1 + r.t * 6; ctx.globalAlpha = a * 0.8; R(r.x - rr, r.y, '#e6f6ff', 1, 1); R(r.x + rr, r.y, '#e6f6ff', 1, 1); R(r.x - rr * 0.6, r.y - 1, '#e6f6ff', 1, 1); R(r.x + rr * 0.6, r.y - 1, '#e6f6ff', 1, 1); ctx.globalAlpha = 1; }
      if (fish) { const a = fish.t / fish.max, fx = fish.x + (a - 0.5) * 10 * fish.dir, fy = fish.y - Math.sin(a * Math.PI) * 9; R(fx, fy, '#ff9a4a', 3, 2); R(fx - 2 * fish.dir, fy, '#e8751a', 1, 2); }
      if (e.holiday && e.holiday.id === 'dragon') { const bx = ((t * 6) % (L.cols + 40)) - 20, by = L.water.y0 + 2; R(bx, by + 1, '#c8552a', 16, 2); R(bx + 15, by - 1, '#e8c03a', 2, 2); R(bx + 16, by - 2, '#c8552a', 2, 1); for (let i = 0; i < 4; i++) R(bx + 3 + i * 3, by - 1 + (Math.floor(t * 4 + i) % 2), '#ffd890', 1, 2); }
    }
    // 草地的风车（风大转得快）
    if (L.windmill) { const [mx, my] = L.windmill, a0 = t * (0.6 + F.wind * 0.9); for (let k = 0; k < 4; k++) { const a = a0 + (k * Math.PI) / 2; for (let j = 1; j < 9; j++) R(mx + Math.round(Math.cos(a) * j), my + Math.round(Math.sin(a) * j), j > 6 ? '#ffffff' : '#c8bca8'); } R(mx, my, '#5a3a24'); }
    // 温泉冒热气
    if (L.spring) for (let k = 0; k < 7; k++) { const a = ((t * 0.35 + k / 7) % 1); ctx.globalAlpha = 0.55 * (1 - a); R(L.spring.c - 6 + k * 2 + Math.round(Math.sin(t * 1.5 + k) * 1.5 - F.wind * a * 4), L.spring.r - Math.round(a * 12), '#ffffff', 2, 2); ctx.globalAlpha = 1; }
    // 冰窟窿：水面一闪一闪
    if (L.icehole && Math.floor(t * 2) % 3 === 0) R(L.icehole.c - 1, L.icehole.r, '#7ab8e8', 2, 1);
    // 海底：一群群小鱼游过、泡泡往上冒、水面的光斑晃动
    if (L.under) {
      for (let k = 0; k < 4; k++) {
        const dir = k % 2 ? 1 : -1, sp = 8 + k * 3, span = L.cols + 80, x0 = ((t * sp + k * 211) % span) - 40, fx = dir > 0 ? x0 : L.cols - x0;
        const fy = L.gy * (0.25 + k * 0.17) + Math.sin(t * 0.7 + k) * 3, col = ['#ffcf33', '#ff8a5a', '#9fe0ff', '#ffffff'][k];
        for (let j = 0; j < 5 + k; j++) { const jx = fx - dir * (j % 3) * 5 - dir * Math.floor(j / 3) * 2, jy = fy + ((j * 5) % 7) - 3 + Math.round(Math.sin(t * 3 + j) * 0.6); R(jx, jy, col, 2, 1); R(jx - dir, jy, col); R(jx - dir * 2, jy - 1, col); R(jx - dir * 2, jy + 1, col); if (dir > 0) R(jx + 1, jy, '#1a2a3a'); else R(jx, jy, '#1a2a3a'); }
      }
      for (let k = 0; k < 18; k++) { const a = ((t * 0.12 + k / 18) % 1), bx = (k * 97) % L.cols + Math.round(Math.sin(t * 1.6 + k) * 1.5), by = L.base - a * (L.base + 4); ctx.globalAlpha = 0.85; R(bx, by, '#e6f6ff'); if (k % 4 === 0) R(bx + 1, by - 1, '#ffffff'); ctx.globalAlpha = 1; }
      ctx.globalAlpha = 0.18; for (let x = 0; x < L.cols; x += 9) { const o = Math.round(Math.sin(t * 0.9 + x / 13) * 3); R(x + o, 2 + ((x * 3) % 5), '#ffffff', 4, 1); } ctx.globalAlpha = 1;
    }
    // 家里：湖底冒泡泡、温泉冒热气
    if (L.bubbles) for (let k = 0; k < 14; k++) { const a = ((t * 0.18 + k / 14) % 1), bx = (L.bubblesX ? L.bubblesX[0] + (k * 53) % L.bubblesX[1] : (k * 53) % L.cols) + Math.round(Math.sin(t * 2 + k) * 1.5); R(bx, L.gy - a * (L.gy - (L.room ? L.room.top : 0)), a > 0.9 ? '#ffffff' : '#bfe6ff', 1, 1); if (k % 3 === 0) R(bx + 1, L.gy - a * (L.gy - (L.room ? L.room.top : 0)) - 1, '#e6f6ff'); }
    if (L.steam) for (let k = 0; k < 16; k++) { const a = ((t * 0.3 + k / 16) % 1); ctx.globalAlpha = 0.5 * (1 - a); R(L.steam.c - L.steam.w / 2 + (k * 37) % L.steam.w + Math.round(Math.sin(t + k) * 2), L.steam.r - a * 30, '#ffffff', 3, 2); ctx.globalAlpha = 1; }
    // 动物们的家：谁在里面、在干嘛（睡觉冒 zZ，夜里醒着会看到一对亮眼睛）
    if (PP.eco) PP.eco.renderHomes(ctx, R, L, e, t);
    // 灯笼（春节 / 元宵 / 中秋）
    const festLantern = e.holiday && ['spring', 'lantern', 'midautumn'].includes(e.holiday.id);
    if (festLantern) for (const [lx, ly] of L.lanterns) { const sw = Math.round(Math.sin(t * 1.6 + lx) * (0.6 + F.wind * 0.5)); R(lx + sw, ly, '#3a2010', 1, 2); R(lx - 1 + sw, ly + 2, e.holiday.id === 'midautumn' ? '#ffb040' : '#d9262b', 3, 3); R(lx + sw, ly + 5, '#ffd84a', 1, 1); }
    // 烟囱冒烟（风大时斜着飘）
    if (L.chimney) for (let i = 0; i < 6; i++) { const a = ((t * 0.5 + i / 6) % 1); R(L.chimney[0] + Math.round(Math.sin(t + i) * 1.5 + a * (3 + F.wind * 8)), L.chimney[1] - Math.round(a * (14 - F.wind * 3)), `rgba(220,220,230,${0.6 * (1 - a)})`, 2, 2); }

    // 调色：清晨 / 傍晚 / 夜里 / 阴雨（只染场景本身）
    ctx.save(); ctx.globalCompositeOperation = 'source-atop';
    const tint = out ? { dawn: ['#ffb0c0', 0.1], day: null, dusk: ['#ff8a50', 0.14], night: ['#141a40', 0.42] }[ph] : { dawn: null, day: null, dusk: ['#ff9a50', 0.12], night: ['#3a2010', 0.22] }[ph];
    if (tint) { ctx.globalAlpha = tint[1]; ctx.fillStyle = tint[0]; ctx.fillRect(0, y0, W, g.H); }
    if (out && F.dark) { ctx.globalAlpha = F.dark; ctx.fillStyle = '#4a5464'; ctx.fillRect(0, y0, W, g.H); }
    ctx.restore();
    // 雾：柔和的一团一团，慢慢飘
    if (out && F.fog) drawFog(ctx, g, F, t);
    ctx.save(); ctx.globalCompositeOperation = 'source-atop';
    if (flash > 0 && out) { ctx.globalAlpha = Math.min(0.55, flash); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, G.H); }
    if (fade > 0) { ctx.globalAlpha = Math.min(1, fade); ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, 0, W, G.H); }
    ctx.restore();

    // 灯：天暗了亮起来（画在调色之后，所以是亮的）
    const dark = L.cave || L.dark || night || ph === 'dusk' || (!out && ph !== 'day') || F.dark > 0.2;
    L.lights.forEach((l, i) => {
      if (lampsOff[i]) return;
      if (l.win) { if (!dark) return; R(l.x, l.y, '#ffd27a', l.w, l.h); R(l.x + 3, l.y, '#5a3a24', 1, l.h); R(l.x, l.y + 2, '#5a3a24', l.w, 1); }
      else if (!dark && !l.always) return;
      glow(ctx, (l.x + l.w / 2) * u, y0 + (l.y + l.h / 2) * u, (l.r + l.w) * u, l.col || '#ffd27a', 0.45 + Math.sin(t * 3 + l.x) * 0.05);
      if (!l.win) R(l.x, l.y, l.col || '#ffe08a', l.w, l.h);
    });
    if (festLantern && dark) for (const [lx, ly] of L.lanterns) { glow(ctx, (lx + 0.5) * u, y0 + (ly + 3.5) * u, 6 * u, '#ff6040', 0.5); R(lx - 1, ly + 2, e.holiday.id === 'midautumn' ? '#ffd070' : '#ff4a3a', 3, 3); }
    if (e.holiday && e.holiday.id === 'xmas') {
      L.xmas.forEach(([x, y], i) => { if (Math.floor(t * 2 + i) % 3) R(x, y, ['#ff4a4a', '#ffd84a', '#5ad1ff', '#7be07b'][i % 4]); });
      if (L.treeTop) { R(L.treeTop[0] - 1, L.treeTop[1] - 2, '#ffd84a', 3, 1); R(L.treeTop[0], L.treeTop[1] - 3, '#ffd84a', 1, 3); }
    }
    // 萤火虫（夏天晚上、没下雨）
    if (out && e.season === 'summer' && dark && !F.rain) for (let i = 0; i < 10; i++) { const fx = (Math.sin(t * 0.3 + i * 7.1) * 0.5 + 0.5) * L.cols, fy = L.gy - 4 - (Math.sin(t * 0.7 + i * 3.3) * 0.5 + 0.5) * Math.min(20, L.gy); if (Math.sin(t * 2.5 + i) > 0) R(fx, fy, '#f6ff8a'); }
    labels(ctx, g, L);
    if (G.editing) drawEditOverlay(ctx, g);
  }

  // 雾：低分辨率画布上画柔和的圆团，放大后自然就是软的
  function drawFog(ctx, g, F, t) {
    const fw = Math.max(32, Math.round(G.W / 8)), fh = Math.max(12, Math.round(g.H / 8));
    if (!fogCv || fogCv.width !== fw || fogCv.height !== fh) { fogCv = document.createElement('canvas'); fogCv.width = fw; fogCv.height = fh; }
    const c = fogCv.getContext('2d'); c.clearRect(0, 0, fw, fh);
    const r = rng(19), sp = 1.2 + F.wind * 1.5;
    for (let i = 0; i < 14; i++) {
      const rad = fh * (0.35 + r() * 0.45), y = fh * (0.25 + r() * 0.75), x = ((r() * (fw + rad * 2) + t * sp * (0.5 + r())) % (fw + rad * 2)) - rad;
      const gr = c.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(236,240,246,0.55)'); gr.addColorStop(1, 'rgba(236,240,246,0)');
      c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const lg = c.createLinearGradient(0, fh * 0.55, 0, fh); lg.addColorStop(0, 'rgba(236,240,246,0)'); lg.addColorStop(1, 'rgba(236,240,246,0.45)');
    c.fillStyle = lg; c.fillRect(0, 0, fw, fh);
    ctx.save(); ctx.globalCompositeOperation = g.m === 'full' ? 'source-over' : 'source-atop'; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fogCv, 0, g.y0, G.W, g.H); ctx.restore(); ctx.imageSmoothingEnabled = false;
  }

  function glow(ctx, x, y, r, col, a) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }

  function drawSkyBodies(ctx, g, e, R) {
    const t = G.t, ph = e.time.phase, F = e.fx, cols = Math.ceil(G.W / g.u), rows = Math.ceil(G.H / g.u);
    const clearish = F.cloud < 0.6 && !F.rain && !F.snow;
    if (ph === 'night' && clearish) {
      const r = rng(cols + 5);
      for (let i = 0; i < cols / 4; i++) { const x = r() * cols, y = r() * rows * 0.55, p = r() * 9; if (Math.sin(t * (0.6 + r()) + p) > -0.3) R(x, y, i % 7 ? '#fff6c2' : '#ffffff'); }
      const big = e.holiday && e.holiday.id === 'midautumn', mr = big ? 9 : 6, mx = cols * 0.78, my = rows * 0.14;
      if (big) { ctx.globalAlpha = 0.15; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(mx * g.u, my * g.u, mr * g.u * 2.2, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      for (let yy = -mr; yy <= mr; yy++) for (let xx = -mr; xx <= mr; xx++) if (xx * xx + yy * yy <= mr * mr && (big || (xx - 3) * (xx - 3) + (yy + 2) * (yy + 2) > mr * mr * 0.8)) R(mx + xx, my + yy, '#fff3b0');
      if (shoot) { const a = shoot.t / shoot.max; for (let k = 0; k < 8; k++) { ctx.globalAlpha = (1 - k / 8) * (1 - a); R(shoot.x + (a * 60 - k) * 1, shoot.y + (a * 60 - k) * 0.45, '#ffffff'); } ctx.globalAlpha = 1; }
    } else if (ph !== 'night' && clearish) {
      const h = e.time.hour, aa = U.clamp((h - 6) / 12.5, 0, 1);
      const sx = cols * (0.1 + aa * 0.8), sy = rows * (0.5 - Math.sin(aa * Math.PI) * 0.38), sr = 5;
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(sx * g.u, sy * g.u, sr * g.u * 2.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      for (let yy = -sr; yy <= sr; yy++) for (let xx = -sr; xx <= sr; xx++) if (xx * xx + yy * yy <= sr * sr) R(sx + xx, sy + yy, ph === 'day' ? '#fff2a0' : '#ffb070');
    }
    // 云：云量越大越多越灰，风越大飘得越快
    const n = Math.round(3 + F.cloud * 10), darkc = F.rain || F.snow || F.storm;
    const col = darkc ? '#8a94a4' : ph === 'night' ? '#3a4470' : ph === 'dusk' ? '#ffc0a0' : '#ffffff';
    const r = rng(77), speed = 0.6 + F.wind * 1.4;
    for (let i = 0; i < n; i++) {
      const w = 14 + Math.floor(r() * 22), y = rows * (0.04 + r() * 0.3), x = ((r() * cols + t * speed * (0.6 + r() * 0.8)) % (cols + 60)) - 40;
      R(x, y, col, w, 3); R(x + 3, y - 2, col, w - 8, 2); R(x + w * 0.4, y - 4, col, w * 0.35, 2);
      if (darkc) R(x + 2, y + 3, mix(col, '#5a6474', 0.4), w - 4, 1);
    }
    // 一群小鸟飞过
    for (const bd of birds) for (let k = 0; k < bd.n; k++) { const bx = bd.x + k * 6 * -bd.dir, by = bd.y + (k % 2) * 3 + Math.sin(t * 3 + k) * 1, f = Math.floor(t * 6 + k) % 2; R(bx - 1, by - f, '#2a2a33'); R(bx, by, '#2a2a33'); R(bx + 1, by - f, '#2a2a33'); }
  }

  function labels(ctx, g, L) {
    ctx.save(); labels0(ctx, g, L); ctx.restore();
  }
  function labels0(ctx, g, L) {
    const u = g.u, y0 = g.y0;
    const fs = Math.max(10, Math.min(13, u * 5.5));
    ctx.font = `${fs}px "Zpix","Fusion Pixel 12px Proportional SC","PingFang SC","Microsoft YaHei",monospace`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    if (L.inside) {
      const own = G.all.filter((p) => p.d.species === L.inside && !p.d.hidden).map((p) => p.name).join('、');
      const title = `${own ? own + '的' : ''}${PP.HOME_NAME[L.inside] || '家'}`;
      ctx.textAlign = 'left'; const w = ctx.measureText(title).width + 14;
      ctx.fillStyle = 'rgba(20,14,10,.72)'; const tx = (L.room ? L.room.x0 : 0) * u + 8, ty = y0 + (L.room ? L.room.top : 0) * u + 6; ctx.fillRect(tx, ty, w, 18); ctx.fillStyle = '#ffe6a8'; ctx.fillText(title, tx + 7, ty + 9); ctx.textAlign = 'center';
    }
    // 可选：左上角显示这里是哪儿、什么季节、什么天气
    if (settings().sceneInfo && !L.inside) {
      const sc = view(), reg = (PP.REGIONS || []).find((r) => r.subs.some((x) => x[0] === sc)), e = PP.env.at(sc), w = e.weather;
      const txt = `${reg && reg.subs.length > 1 ? reg.name + ' · ' : ''}${SCENES[sc].name} · ${PP.env.seasonName(e.season)} · ${PP.env.weatherName(w.kind)}${w.temp != null ? ' ' + w.temp + '°' : ''}`;
      ctx.textAlign = 'left'; const tw = ctx.measureText(txt).width + 14, tx = 8, ty = y0 + (g.m === 'full' ? 10 : 12);
      ctx.fillStyle = 'rgba(20,14,10,.6)'; ctx.fillRect(tx, ty, tw, 18); ctx.fillStyle = '#fff'; ctx.fillText(txt, tx + 7, ty + 9); ctx.textAlign = 'center';
    }
    // 家门口的小牌子：谁在家、在干嘛（不用找了）
    if (PP.eco && PP.eco.homeTag) for (const h of L.homes) {
      const tag = PP.eco.homeTag(h.species); if (!tag) continue;
      const x = ((h.x0 + h.x1) / 2) * u, y = Math.max(y0 + 10, y0 + h.y0 * u - 9), w = ctx.measureText(tag).width + 10;
      ctx.fillStyle = 'rgba(20,14,10,.66)'; ctx.fillRect(x - w / 2, y - 8, w, 16); ctx.fillStyle = '#fff'; ctx.fillText(tag, x, y);
      ctx.fillStyle = 'rgba(20,14,10,.66)'; ctx.fillRect(x - 2, y + 8, 4, 3);
    }
    for (const h of L.hots) if (h.sign) {
      ctx.fillStyle = '#5a3a24'; ctx.fillText(h.sign.label, (h.sign.x + 14) * u, y0 + (h.sign.y + 7) * u);
      // 那边现在有几只（小圆点）
      const n = PP.eco && h.go ? PP.eco.countAt(h.go) : 0;
      if (n) { const bx = (h.sign.x + (h.sign.side < 0 ? 0 : 13)) * u, by = y0 + (h.sign.y - 1) * u; ctx.fillStyle = '#ff6b5a'; ctx.fillRect(bx - 7, by - 7, 14, 13); ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.fillText(String(n), bx, by); ctx.font = `${fs}px "Zpix","Fusion Pixel 12px Proportional SC","PingFang SC","Microsoft YaHei",monospace`; }
    }
    if (hover) {
      const x = ((hover.x0 + hover.x1) / 2) * u, y = y0 + hover.y0 * u - 10;
      const w = ctx.measureText(hover.tip).width + 12;
      const xx = U.clamp(x, w / 2 + 4, G.W - w / 2 - 4), yy = Math.max(14, y);
      ctx.fillStyle = '#111'; ctx.fillRect(xx - w / 2, yy - 10, w, 18); ctx.fillStyle = '#ffcf33'; ctx.fillRect(xx - w / 2 + 2, yy + 8, w - 4, 2);
      ctx.fillStyle = '#fff'; ctx.fillText(hover.tip, xx, yy);
      if (!hover.sky) { ctx.strokeStyle = '#ffcf33'; ctx.lineWidth = 2; ctx.strokeRect(hover.x0 * u, y0 + hover.y0 * u, (hover.x1 - hover.x0) * u, (hover.y1 - hover.y0) * u); }
    }
  }

  // 前景：雨、雪、落叶、烟花、蝙蝠（画在宠物前面）
  function renderFront(ctx) {
    if (!G.save || !L) return;
    const g = geo(); if (!g) { fxs.length = 0; return; }
    const F = PP.env.at(view()).fx;
    for (const p of fxs) {
      if (p.k === 'rain') { ctx.strokeStyle = p.sleet ? 'rgba(220,235,255,.8)' : 'rgba(180,205,255,.7)'; ctx.lineWidth = Math.max(1, g.u / 2); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.012, p.y + p.len); ctx.stroke(); }
      else if (p.k === 'snow') { ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x, p.y, p.s, p.s); }
      else if (p.k === 'leaf') { ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, g.u, g.u); ctx.fillRect(p.x + g.u * Math.sign(Math.sin(p.ph)), p.y + g.u, g.u, g.u); }
      else if (p.k === 'spark') { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, g.u, g.u); ctx.globalAlpha = 1; }
      else if (p.k === 'rocket') { ctx.fillStyle = '#fff2c0'; ctx.fillRect(p.x, p.y, g.u, g.u * 2); }
      else if (p.k === 'splash') { ctx.fillStyle = 'rgba(200,220,255,.8)'; ctx.fillRect(p.x - g.u, p.y, g.u, g.u); ctx.fillRect(p.x + g.u, p.y, g.u, g.u); }
    }
    for (const b of bats) { const f = Math.floor(G.t * 8 + b.ph) % 2; ctx.fillStyle = '#1a1424'; ctx.fillRect(b.x - g.u, b.y, g.u * 3, g.u); ctx.fillRect(b.x - g.u * 2, b.y - (f ? g.u : -g.u), g.u, g.u); ctx.fillRect(b.x + g.u * 2, b.y - (f ? g.u : -g.u), g.u, g.u); }
    if (F.wind >= 2 && fxs.length < 5) { /* 大风但没有可吹的东西时也让人看得出：在 update 里吹落叶/雪尘 */ }
  }

  // 指着家就弹出“叫出来 / 进去看看”，不用再点
  let homeHov = null, homeHovT = 0, popAway = 0;
  function homeHover(dt) {
    const h = G.hoverHot && G.hoverHot.home ? G.hoverHot : null;
    if (h && (!homeHov || homeHov.home !== h.home)) { homeHov = h; homeHovT = 0; }
    if (!h) homeHov = null;
    if (homeHov) { homeHovT += dt; if (homeHovT > 0.25 && (!popEl || popEl.dataset.sp !== homeHov.home)) homeMenu(homeHov); }
    if (popEl) {
      const over = popEl.matches(':hover') || (h && popEl.dataset.sp === h.home);
      popAway = over ? 0 : popAway + dt;
      if (popAway > 0.6) { popEl.remove(); popEl = null; popAway = 0; PP.refreshInteractive && PP.refreshInteractive(); }
    }
  }
  function update(dt) {
    if (!G.save) return;
    homeHover(dt);
    if (fadeTo) { fade += dt * 3.2; if (fade >= 1) { const to = fadeTo; fadeTo = null; arrive(to); } }
    else if (fade > 0) fade = Math.max(0, fade - dt * 2.4);
    const g = geo(); if (!g || !L) return;
    const e = PP.env.at(view()), out = true;
    // 雪原在山上：下雨在这里就是下雪
    const F = inside || view() === 'sea' ? Object.assign({}, e.fx, { snow: 0, rain: 0, storm: 0, wind: 0 }) : view() === 'snow' ? Object.assign({}, e.fx, { snow: Math.max(e.fx.snow, e.fx.rain), rain: 0 }) : e.fx;
    const top = g.m === 'full' ? -10 : Math.max(0, g.y0 - 40), bottom = G.ground;
    const low = settings().quiet ? 0.4 : 1, fullK = g.m === 'full' ? 2.2 : 1;
    const windVx = -(F.wind * 70);
    if (out) {
      // 雨：雨量决定密度、长度、速度；风让雨斜着下
      if (F.rain) {
        const want = (G.W / 22) * (0.4 + F.rain * 2.2) * low * fullK, cur = fxs.filter((p) => p.k === 'rain').length;
        for (let i = 0; i < Math.min(40, (want - cur) * dt * 3); i++) fxs.push({ k: 'rain', x: Math.random() * (G.W + 200) - (windVx < 0 ? 0 : 100), y: top - Math.random() * 40, vy: 300 + F.rain * 260 + Math.random() * 80, vx: windVx - 20, len: g.u * (2 + F.rain * 3), sleet: e.weather.kind === 'sleet' });
      }
      if (F.snow) {
        const want = (G.W / 26) * (0.5 + F.snow * 1.6) * low * fullK, cur = fxs.filter((p) => p.k === 'snow').length;
        for (let i = 0; i < Math.min(20, (want - cur) * dt * 2); i++) fxs.push({ k: 'snow', x: Math.random() * (G.W + 200) - 100, y: top - Math.random() * 30, vy: 18 + F.snow * 20 + Math.random() * 18, s: g.u * (Math.random() < 0.3 + F.snow * 0.3 ? 2 : 1), ph: Math.random() * 9 });
      }
      // 落叶 / 花瓣 / 风里的叶子（风越大越多）
      const leafRate = inside || view() === 'sea' ? 0 : ((e.season === 'autumn' || e.season === 'spring') && !F.rain ? 0.6 : 0) + (F.wind >= 1 && e.season !== 'winter' ? F.wind * 0.8 : 0);
      if (Math.random() < dt * leafRate * low * fullK)
        fxs.push({ k: 'leaf', x: windVx < -60 ? G.W + 10 : Math.random() * G.W, y: top + Math.random() * 30, vy: 16 + Math.random() * 14, ph: Math.random() * 9, col: e.season === 'autumn' ? U.pick(['#e8913a', '#d9662a', '#c9a23a']) : e.season === 'spring' ? U.pick(['#ffc4d8', '#ffb0c8', '#fff0f4']) : U.pick(['#5fae4a', '#7cc35a']) });
      if (F.storm) { nextBolt -= dt; if (nextBolt <= 0) { flash = 0.7; nextBolt = U.rand(7, 18); setTimeout(() => (flash = 0.45), 120); PP.ambientThunder && PP.ambientThunder(true); } }
      // 湖面：下雨时到处是小涟漪，偶尔有鱼跳出来
      if (L.water && !L.water.ice) {
        if (F.rain && Math.random() < dt * (3 + F.rain * 10)) ripples.push({ x: Math.random() * L.cols, y: L.water.y0 + 1 + Math.random() * (L.water.y1 - L.water.y0 - 2), t: 0, max: 0.6 });
        if (!fish && Math.random() < dt * 0.02) jumpFish(Math.random() * L.cols);
      }
      // 小鸟：白天、不下雨时偶尔一群飞过（全屏模式）
      if (g.m === 'full' && !inside && view() !== 'sea' && e.time.phase !== 'night' && !F.rain && !F.storm) { nextBirds -= dt; if (nextBirds <= 0) { nextBirds = U.rand(25, 70); flock(); } }
      const fw = e.holiday && ['spring', 'lantern', 'newyear', 'nye'].includes(e.holiday.id) && e.time.phase === 'night';
      if (fw) { nextRocket -= dt; if (nextRocket <= 0) { nextRocket = U.rand(1.5, 4); fxs.push({ k: 'rocket', x: U.rand(G.W * 0.1, G.W * 0.9), y: bottom, vy: -U.rand(260, 340), top: g.m === 'full' ? G.H * 0.25 : g.y0 - U.rand(30, 120) }); } }
      if (e.holiday && e.holiday.id === 'halloween' && e.time.phase !== 'day' && bats.length < 4 && Math.random() < dt * 0.3) bats.push({ x: -20, y: g.y0 + U.rand(5, Math.max(10, g.H * 0.4)), vx: U.rand(50, 90), ph: Math.random() * 9 });
    }
    flash = Math.max(0, flash - dt * 2.5);
    for (const p of fxs) {
      if (p.k === 'snow') { p.y += p.vy * dt; p.x += (Math.sin(G.t * 1.3 + p.ph) * 14 + windVx * 0.6) * dt; if (p.y > bottom) p.dead = true; }
      else if (p.k === 'rain') { p.y += p.vy * dt; p.x += p.vx * dt; if (p.y > bottom - 2) { p.dead = true; if (Math.random() < 0.12) fxs.push({ k: 'splash', x: p.x, y: bottom - g.u * 2, life: 0.12 }); } }
      else if (p.k === 'leaf') { p.y += p.vy * dt; p.ph += dt * 2; p.x += (Math.sin(p.ph) * 22 + windVx * 1.2) * dt; if (p.y > bottom || p.x < -20 || p.x > G.W + 20) p.dead = true; }
      else if (p.k === 'splash') { p.life -= dt; if (p.life <= 0) p.dead = true; }
      else if (p.k === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; if (p.life <= 0) p.dead = true; }
      else if (p.k === 'rocket') {
        p.y += p.vy * dt; if (p.y <= p.top) {
          p.dead = true; const col = U.pick(['#ff4a4a', '#ffd84a', '#5ad1ff', '#7be07b', '#ff8fd0']);
          for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, sp = U.rand(50, 90); fxs.push({ k: 'spark', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.3, max: 1.3, col }); }
        }
      }
    }
    for (let i = fxs.length - 1; i >= 0; i--) if (fxs[i].dead) fxs.splice(i, 1);
    if (fxs.length > 1800) fxs.splice(0, fxs.length - 1800);
    for (const b of bats) { b.x += b.vx * dt; b.y += Math.sin(G.t * 3 + b.ph) * 20 * dt; }
    bats = bats.filter((b) => b.x < G.W + 30);
    for (const r of ripples) r.t += dt; ripples = ripples.filter((r) => r.t < r.max);
    if (fish) { fish.t += dt; if (fish.t > fish.max) { ripples.push({ x: fish.x + 5 * fish.dir, y: fish.y, t: 0, max: 0.8 }); fish = null; } }
    for (const bd of birds) bd.x += bd.dir * bd.v * dt;
    birds = birds.filter((bd) => bd.x > -40 && bd.x < L.cols + 40);
    if (shoot) { shoot.t += dt; if (shoot.t > shoot.max) shoot = null; }
  }
  function jumpFish(x) { if (!L || !L.water) return; fish = { x, y: L.water.y0 + 2 + Math.random() * 3, t: 0, max: 0.9, dir: Math.random() < 0.5 ? 1 : -1 }; ripples.push({ x, y: fish.y, t: 0, max: 0.7 }); }
  function flock(y) { const rows = Math.ceil(G.H / (geo() || { u: 4 }).u), dir = Math.random() < 0.5 ? 1 : -1; birds.push({ x: dir > 0 ? -20 : L.cols + 20, y: y != null ? y : rows * (0.08 + Math.random() * 0.25), dir, v: 18 + Math.random() * 10, n: 3 + Math.floor(Math.random() * 4) }); }

  // ---------- 热点：门、路牌；全屏模式下还能点树、湖、灯、天空…… ----------
  const TIP = { pine: '摇一摇', oak: '摇一摇', apple: '摇一摇（会掉苹果）', bush: '扒拉一下', flower: '闻一闻', mushroom: '戳一下', lamp: '开灯 / 关灯', snowman: '摸摸雪人', pumpkin: '敲一敲', hay: '扒拉一下', bench: '坐坐' };
  function hot(x, y) {
    hover = null;
    if (G.editing || hidden()) return null;
    const g = geo(); if (!g || !L) return null;
    const lx = x / g.u, ly = (y - g.y0) / g.u;
    hover = L.hots.find((h) => lx >= h.x0 && lx <= h.x1 && ly >= h.y0 && ly <= h.y1) || null;
    if (hover) return hover;
    // 动物的家：看看谁在里面，点一下叫它出来
    const hm = L.homes.find((h) => lx >= h.x0 && lx <= h.x1 && ly >= h.y0 && ly <= h.y1 && PP.eco && PP.eco.homeKnown(h.species));
    if (hm) { hover = { x0: hm.x0, x1: hm.x1, y0: hm.y0, y1: hm.y1, tip: PP.eco.homeTip(hm.species), home: hm.species }; return hover; }
    if (g.m !== 'full' || inside) return null;
    // 全屏：可以和场景里的东西玩
    const list = decorOf(settings().scene || 'forest');
    for (let i = L.boxes.length - 1; i >= 0; i--) {
      const bx = L.boxes[i], d = list[bx.i];
      if (d && TIP[d.k] && lx >= bx.x0 && lx <= bx.x1 && ly >= bx.y0 && ly <= bx.y1) { hover = { ...bx, tip: TIP[d.k], decor: d, di: bx.i }; return hover; }
    }
    if (L.water && !L.water.ice && ly >= L.water.y0 && ly <= L.water.y1) { hover = { x0: lx - 4, x1: lx + 4, y0: L.water.y0, y1: L.water.y1, tip: '丢颗石子', water: true, sky: true }; return hover; }
    if (SCENES[settings().scene || 'forest'].out && !L.under && ly < L.gy - 30) { const night = PP.env.get().time.phase === 'night'; hover = { x0: lx - 4, x1: lx + 4, y0: ly, y1: ly + 1, tip: night ? '许个愿' : '招招手', skyClick: true, sky: true }; return hover; }
    return null;
  }
  function click(h) {
    if (!h) return;
    if (h.go) { go(h.go); return; }
    if (h.leave) { leave(); return; }
    if (h.home) { homeMenu(h); return; }
    const g = geo(), e = PP.env.at(view());
    if (h.water) { const x = (h.x0 + h.x1) / 2; ripples.push({ x, y: (L.water.y0 + L.water.y1) / 2, t: 0, max: 0.9 }); if (Math.random() < 0.6) jumpFish(x); return; }
    if (h.skyClick) {
      if (e.time.phase === 'night') { shoot = { x: (h.x0 + h.x1) / 2 - 30, y: h.y0 - 10, t: 0, max: 0.9 }; const p = PP.F.main(); p && p.say(U.pick(['许愿！', '流星！快许愿', '希望明天也一起玩']), 2.2); }
      else flock(h.y0);
      return;
    }
    if (h.decor) {
      const d = h.decor, k = d.k, cx = ((h.x0 + h.x1) / 2) * g.u, topY = g.y0 + h.y0 * g.u;
      const season = e.season;
      if (k === 'lamp') { const li = L.lights.findIndex((l) => Math.abs(l.x + 1 - (h.x0 + h.x1) / 2) < 4); if (li >= 0) lampsOff[li] = !lampsOff[li]; return; }
      const n = k === 'pine' || k === 'oak' || k === 'apple' ? 14 : 6;
      const col = season === 'winter' ? '#ffffff' : season === 'autumn' ? '#e8913a' : season === 'spring' && k !== 'pine' ? '#ffc4d8' : '#5fae4a';
      for (let i = 0; i < n; i++) fxs.push({ k: 'leaf', x: cx + U.rand(-20, 20) * (g.u / 2), y: topY + U.rand(0, 30) * (g.u / 4), vy: U.rand(20, 45), ph: Math.random() * 9, col });
      if (k === 'apple' && (season === 'summer' || season === 'autumn') && Math.random() < 0.7) PP.addItem({ type: 'treat', x: cx + U.rand(-30, 30), y: topY + 20, vy: 0, data: { sprite: 'treat_apple' } });
      else if ((k === 'oak' || k === 'pine') && Math.random() < 0.3) PP.addItem({ type: 'gift', x: cx + U.rand(-30, 30), y: topY + 20, data: { gift: U.pick(['acorn', 'leaf']) } });
      if (k === 'flower' && !G.ambient.bug && season !== 'winter') G.ambient.bug = { x: cx, y: topY, vx: U.pick([-40, 40]), t: 0, life: U.rand(30, 60), caught: false };
      if (k === 'snowman' || k === 'mushroom' || k === 'pumpkin') PP.hearts && PP.hearts(cx, topY, 1);
    }
  }

  // ---------- 换场景（只是换个地方看看，大家各过各的） ----------
  function view() { const sc = G.save && settings().scene; return SCENES[sc] ? sc : 'forest'; }
  function go(to) {
    if (!SCENES[to]) return;
    const s = settings();
    if (s.mode === 'mini') PP.setMode(s.lastMode === 'full' ? 'full' : 'band', true);
    if (s.scene === to) return;
    fadeTo = to; fade = Math.max(fade, 0.01);
  }
  function arrive(to) {
    const s = settings();
    s.scene = to; key = ''; inside = null; fxs.length = 0; ripples = []; fish = null;
    PP.eco && PP.eco.onView(to);
    const here = PP.eco ? PP.eco.countAt(to) : 0;
    PP.ui.toast(`来到了${SCENES[to].name}${here ? `（${here} 只在这儿）` : ''}`);
    PP.save.soon(); PP.syncTray && PP.syncTray(true);
  }
  function fav(p) { return (PP.HOME_SCENE && PP.HOME_SCENE[p.d.species]) || 'forest'; }
  function exitX(to) {
    const door = L && L.hots.find((h) => h.go === to && h.door);
    if (door) { const g = geo(); return ((door.x0 + door.x1) / 2) * (g ? g.u : G.S); }
    const ex = (EXITS[view()] || []).find((x) => x[1] === to) || (EXITS[view()] || [])[0];
    return ex && ex[0] > 0 ? G.W - 25 : 25;
  }
  // 进家里看看 / 出来
  function enter(sp) {
    const s = settings();
    if (s.mode === 'mini') PP.setMode(s.lastMode === 'full' ? 'full' : 'band', true);
    const home = PP.HAB && PP.HAB[sp] ? PP.HAB[sp].home : s.scene;
    if (home !== s.scene) { s.scene = home; }
    inside = sp; key = ''; fade = Math.max(fade, 0.6); ripples = []; fish = null;
    PP.eco && PP.eco.onView(view());
    const n = PP.eco ? PP.eco.residentsOf(sp).length : 0;
    PP.ui.toast(n ? `悄悄走进了${PP.HOME_NAME[sp]}` : `${PP.HOME_NAME[sp]}里现在没人`);
    PP.save.soon();
  }
  function leave() {
    if (!inside) return;
    inside = null; key = ''; fade = Math.max(fade, 0.6);
    PP.eco && PP.eco.onView(view());
  }
  // 点家：弹个小菜单
  let popEl = null;
  function homeMenu(h) {
    if (popEl) popEl.remove();
    const sp = h.home, g = geo(), who = PP.eco ? PP.eco.residentsOf(sp) : [];
    popEl = document.createElement('div'); popEl.className = 'homepop'; popEl.dataset.sp = sp;
    popEl.innerHTML = `<div class="t">${PP.eco.homeTip(sp).replace(/ · 点一下叫出来$/, '')}</div><div class="row">${PP.INTERIOR && PP.INTERIOR[sp] ? '<button class="small" data-a="in">进去看看</button>' : ''}<button class="small" data-a="out" ${who.length ? '' : 'disabled'}>叫出来</button></div>`;
    document.getElementById('ui').appendChild(popEl);
    const x = ((h.x0 + h.x1) / 2) * g.u, y = g.y0 + h.y0 * g.u, r = popEl.getBoundingClientRect();
    popEl.style.left = U.clamp(x - r.width / 2, 4, G.W - r.width - 4) + 'px'; popEl.style.top = Math.max(4, y - r.height - 6) + 'px';
    popEl.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; ev.stopPropagation(); popEl.remove(); popEl = null; if (b.dataset.a === 'in') enter(sp); else PP.eco.callOut(sp); });
    PP.refreshInteractive && PP.refreshInteractive();
  }
  // 场景布局（给 eco.js 用）：当前场景的几何和设施位置
  function layout() { const st = ensure(); return st && L ? { g: st.g, L, scene: st.scene } : null; }

  // ---------- 布置模式 ----------
  let editEl = null, pick = null, dragD = null, ghostX = null;
  function edit(on) {
    G.editing = !!on;
    const s = settings(), scene = s.scene || 'forest';
    if (editEl) { editEl.remove(); editEl = null; }
    pick = null; dragD = null;
    if (!on) { PP.refreshInteractive(); PP.save.soon(); return; }
    if (!active()) PP.setMode('band');
    if (!s.decor[scene]) s.decor[scene] = defaultDecor(scene);
    const kinds = Object.entries(DECOR);
    editEl = document.createElement('div'); editEl.className = 'editbar';
    editEl.innerHTML = `<b>布置${SCENES[scene].name}</b><div class="kinds">${kinds.map(([k, v]) => `<button class="small" data-k="${k}">${v[0]}</button>`).join('')}</div>
      <div class="hint">先点上面的东西，再点场景里放下 · 拖动可以挪位置 · 右键删掉</div>
      <div class="row"><button class="small" data-a="reset">恢复默认</button><button class="small" data-a="clear">全部清空</button><button class="small primary" data-a="done">完成</button></div>`;
    editEl.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.k) { pick = pick === b.dataset.k ? null : b.dataset.k; editEl.querySelectorAll('[data-k]').forEach((x) => x.classList.toggle('on', x.dataset.k === pick)); return; }
      if (b.dataset.a === 'reset') { s.decor[scene] = defaultDecor(scene); }
      if (b.dataset.a === 'clear') { s.decor[scene] = []; }
      if (b.dataset.a === 'done') { edit(false); PP.ui.toast('布置好了'); }
    });
    document.getElementById('ui').appendChild(editEl);
    PP.refreshInteractive();
  }
  function decorAt(x, y) {
    const g = geo(); if (!g || !L) return null;
    const lx = x / g.u, ly = (y - g.y0) / g.u;
    for (let i = L.boxes.length - 1; i >= 0; i--) { const b = L.boxes[i]; if (lx >= b.x0 && lx <= b.x1 && ly >= b.y0 && ly <= b.y1) return b; }
    return null;
  }
  function editDown(x, y, btn) {
    const g = geo(); if (!g) return;
    const s = settings(), list = s.decor[s.scene || 'forest'];
    if (y < g.y0 - 20) return;
    const hitB = decorAt(x, y);
    if (btn === 2) { if (hitB) list.splice(hitB.i, 1); return; }
    if (pick) { list.push({ k: pick, x: U.clamp(x / G.W, 0, 1), v: Math.round(Math.random() * 10) / 10 }); return; }
    if (hitB) dragD = { i: hitB.i, dx: x / G.W - list[hitB.i].x };
  }
  function editMove(x) { ghostX = x; if (!dragD) return; const s = settings(), list = s.decor[s.scene || 'forest']; if (list[dragD.i]) list[dragD.i].x = U.clamp(x / G.W - dragD.dx, 0, 1); }
  function editUp() { dragD = null; }
  function drawEditOverlay(ctx, g) {
    ctx.save(); ctx.strokeStyle = 'rgba(17,17,17,.6)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    const hb = decorAt(G.mouse.x, G.mouse.y);
    for (const b of L.boxes) { ctx.strokeStyle = hb === b ? '#ffcf33' : 'rgba(17,17,17,.5)'; ctx.lineWidth = hb === b ? 2 : 1; ctx.strokeRect(b.x0 * g.u, g.y0 + b.y0 * g.u, (b.x1 - b.x0) * g.u, (b.y1 - b.y0) * g.u); }
    if (pick && ghostX != null) { ctx.setLineDash([]); ctx.strokeStyle = '#ffcf33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ghostX, g.y0); ctx.lineTo(ghostX, G.H); ctx.stroke(); }
    ctx.restore();
  }

  // 地图用的小画面：每个地方的全景缩略图（按季节缓存）
  const thumbs = {};
  function thumb(sc, w, h) {
    const e = PP.env.at(sc), u = 2, bh = 150;
    const k = [sc, e.season, e.holiday ? e.holiday.id : '', w, h, JSON.stringify(settings().decor[sc] || 0)].join('|');
    if (thumbs[sc] && thumbs[sc].k === k) return thumbs[sc].cv;
    const W0 = G.W; let r;
    try { G.W = 1200; r = build(sc, { m: 'band', u, H: bh, y0: 0 }, e); } finally { G.W = W0; }
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    const [top, bot] = sc === 'cave' ? ['#2a2430', '#3a3242'] : sc === 'sea' ? ['#2a6a9a', '#4a9ac8'] : skyCols(e);
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    // 取中间偏左的一段（家和动物最多的地方），按比例缩放
    const src = r.cv, sh = src.height, sw = Math.min(src.width, Math.round(sh * w / h));
    const sx = Math.max(0, Math.round((src.width - sw) * 0.35));
    c.drawImage(src, sx, 0, sw, sh, 0, 0, w, h);
    thumbs[sc] = { k, cv };
    return cv;
  }
  PP.scene = { thumb, hidden, render, renderFront, update, hot, click, go, active, height, bandHeight, geo, fav, exitX, view, layout, edit, editDown, editMove, editUp, get hover() { return hover; }, defaultDecor, splash(x, y) { ripples.push({ x, y, t: 0, max: 0.7 }); }, fishAt(x) { jumpFish(x); }, enter, leave, inside: () => inside };

})();
