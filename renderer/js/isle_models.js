// 小岛的模型：一座「东拼西凑的浮空小城堡」。不是一层层一样大的千层饼——
// 每个模块有自己的占地和自己的层高，贴在一起：小屋（二层 + 悬挑卧室舱）、石头储藏楼（屋顶上顶着玻璃花房）、
// 外挂楼梯、抬高的树台（底下吊着地窖舱）、下沉的石头露台（篝火、热气球）、挑出去的鱼塘台、高低不一的菜箱……
// 植物和建筑长在一起：爬藤、垂下来的藤蔓、屋顶的苔藓、树篱代替栏杆。
// 室内（room / green）的门、窗的位置和个数、长宽比例，都和外面看到的一样（同一份 SPEC）。
(function () {
  const PP = (window.PP = window.PP || {});
  const g3 = PP.g3, Mesh = g3.Mesh, M = g3.MAT;
  const H = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const SC = 2.6, R0 = 4; // 室内 = 室外 × SC
  // 建筑规格：室外占地 + 各面墙上的门窗（t = 沿墙的位置 0..1）。室内外都从这里读
  const HOUSE = { u0: 12, u1: 25, v0: 9, v1: 20, h1: 11, h2: 9, door: 0.42, fv: [0.14, 0.78], fv2: [0.2, 0.5, 0.8], fu: [0.3, 0.72], fu2: [0.8], bv: [0.25, 0.85], bv2: [0.25, 0.75], bu: [0.5], bu2: [0.5], fire: 0.62 };
  const GH = { u0: 28, u1: 37, v0: 7, v1: 14, z: 13, h: 7, roof: 4, door: 0.5, nv: 5, nu: 4 };
  const iu = (S, t) => R0 + t * (S.u1 - S.u0) * SC, iv = (S, t) => R0 + t * (S.v1 - S.v0) * SC;
  const HU1 = iu(HOUSE, 1), HV1 = iv(HOUSE, 1), GU1 = iu(GH, 1), GV1 = iv(GH, 1);
  const PICK = { door: 1, green: 2, mail: 3, barrel: 4, fire: 5, balloon: 6, scope: 7, fish: 8, tree: 9, lamp: 10, shed: 13, plot: 20, deco: 30, exit: 40, fireplace: 50, kitchen: 51, clock: 52, flamp: 53, desk: 54, trunk: 55, pot: 56, bed: 57, chair: 58, win: 59, rug: 60, c1: 61, c2: 62, c3: 63, lemon: 70, gbarrel: 71, basket: 72, sacks: 73, bench: 74 };
  const K = {
    IW: 150, IH: 124, ORG: { deck: [72, 30], house: [70, 45], gh: [67, 45] }, SC, R0, HOUSE, GH, PICK, HU1, HV1, GU1, GV1, LOFT: 28, WALLH: 52,
    Z: { yard: 0, porch: 2.5, east: -3, pond: -5, terr: 13, pod: 19.5 },
    DOOR: { u: 12 + 0.42 * 13, v: 20 }, GDOOR: { u: 32.5, v: 14 }, TREE: { u: 6.2, v: 24.6 }, TANK: { u: 10.6, v: 17.2 }, MAILB: { u: 11, v: 23.2 }, FIRE: { u: 43.2, v: 19.4 }, BALLOON: { u: 44, v: 13.8 }, SCOPE: { u: 26.4, v: 12.6 },
    POND: { u0: 14.5, u1: 23.5, v0: 35.7, v1: 42.4, z: -3.8 }, FISH: { u: 19, v: 34.6 }, BOB: { u: 19.4, v: 38.6 },
    PLOTS: [[27, 21.6], [31.2, 21.6], [35.4, 21.6], [27, 27], [31.2, 27], [35.4, 27]], PS: 3.6, PH: [1.2, 1.9, 1.2, 1.6, 1, 1.8],
    SLOTS: [[14.4, 23.2], [6.4, 30.6], [21.6, 27], [23.4, 23.2], [42.6, 16.6], [11.4, 29.4]], LAMPS: [[20.8, 31.2, 0], [9.9, 21.4, 0], [41.8, 24.2, 2]],
    RDOOR: { u: iu(HOUSE, 0.42) }, GRDOOR: { u: iu(GH, 0.5) },
  };
  const WOOD = '#b88a5a', WOOD2 = '#a8784a', DARK = '#6a4a36', TIMBER = '#5a3a28', STONE = '#a8a296', STONE2 = '#8a8478', PLAS = '#f0e2c4', PLAS2 = '#e8d6b4', COPPER = '#b0704a', BRICK = '#b8705a';
  const FLOW = ['#f2a6c2', '#ffd95a', '#e8705a', '#c8a0f0', '#ffffff'];
  const posts = (m, pts, z, h, col = DARK, w = 0.2) => pts.forEach(([u, v]) => m.box(u - w, v - w, z, u + w, v + w, z + h, col, 2));

  // ---------- 菜：每种长得不一样，叶子一片片的 ----------
  function crop(m, kind, stage, u, v, z, seed) {
    const g1 = '#5aa64e', g2 = '#86cc6a', g0 = '#3f8a44', L = (c, a, t, s, col) => m.leaf(c, a, t, s, col, 0.9);
    if (stage === 0) { for (let i = 0; i < 2; i++) L([u + (i ? 0.1 : -0.1), v, z + 0.7], i * 3.14 + seed, 0.9, 0.36, g2); return; }
    if (stage === 1) { for (let i = 0; i < 4; i++) L([u + Math.cos(i * 1.57 + seed) * 0.16, v + Math.sin(i * 1.57 + seed) * 0.16, z + 1.3], i * 1.57 + seed, 0.8, 0.55, i % 2 ? g1 : g2); return; }
    const big = stage === 3, s = big ? 1 : 0.7;
    const rosette = (n, r, ls, cols, tilt = 0.5, zz = 1) => { for (let i = 0; i < n; i++) { const a = i * 6.283 / n + seed; L([u + Math.cos(a) * r, v + Math.sin(a) * r, z + zz * s], a, tilt, ls * s, cols[i % cols.length]); } };
    const stalk = (hh, col = g0) => { m.sway = 0.4; m.quad([u - 0.06, v + 0.06, z], [u + 0.06, v - 0.06, z], [u + 0.05, v - 0.05, z + hh], [u - 0.05, v + 0.05, z + hh], col, 8); m.sway = 0; };
    if (kind === 'corn') { stalk(9 * s); for (let i = 0; i < 5; i++) L([u, v, z + (2 + i * 1.5) * s], i * 2.4 + seed, 0.25, 1.1 * s, i % 2 ? g1 : g2); if (big) { m.cyl(u + 0.2, v + 0.15, z + 4.2, z + 7.2, 0.2, 0.1, '#ffd36a', 0, 6); L([u + 0.2, v + 0.15, z + 5], 1, 1.2, 0.7, '#c8e08a'); } }
    else if (kind === 'sunflower') { stalk(10 * s); for (let i = 0; i < 3; i++) L([u, v, z + (2.5 + i * 2.2) * s], i * 2.1 + seed, 0.3, 0.9 * s, g1); if (big) { for (let i = 0; i < 10; i++) { const a = i * 0.628; m.leaf([u + 0.1, v + 0.25, z + 10.6], a, 0, 0.01, '#f6c43a', 0.4); m.tri([u + 0.1, v + 0.3, z + 10.6], [u + 0.1 + Math.cos(a) * 0.75, v + 0.3, z + 10.6 + Math.sin(a) * 1.9], [u + 0.1 + Math.cos(a + 0.5) * 0.75, v + 0.3, z + 10.6 + Math.sin(a + 0.5) * 1.9], i % 2 ? '#f6c43a' : '#ffd95a', 0); } m.disc(u + 0.1, v + 0.34, z + 10.6, 0.34, 'v', '#7a4a2a', 0, 8); } }
    else if (kind === 'tulip') { for (let i = 0; i < 3; i++) { const a = u + (i - 1) * 0.42, b = v + (i % 2 ? 0.3 : -0.2), hh = (4.5 + i) * s; m.tri([a - 0.05, b + 0.05, z], [a + 0.05, b - 0.05, z], [a, b, z + hh], g0, 8); L([a, b, z + 1.4], i * 2 + seed, 1.1, 0.7 * s, g1); L([a, b, z + 1.2], i * 2 + seed + 3, 1.1, 0.6 * s, g2); if (big) for (let q = 0; q < 3; q++) m.leaf([a + Math.cos(q * 2.1) * 0.08, b + Math.sin(q * 2.1) * 0.08, z + hh + 0.5], q * 2.1, 1.3, 0.42, FLOW[(seed + i) % 5], 0.6); } }
    else if (kind === 'pumpkin' || kind === 'melon') { rosette(5, 0.5, 0.95, [g1, g2, g0], 0.25, 0.8); if (big) { m.blob(u + 0.1, v + 0.25, z + 1.5, 0.62, 1.5, kind === 'melon' ? '#3f8a44' : '#f2832a', kind === 'melon' ? 11 : 0, seed, 4, 8); m.cyl(u + 0.1, v + 0.25, z + 2.9, z + 3.6, 0.07, 0.05, g0, 0, 4); } }
    else if (kind === 'cabbage') { rosette(6, 0.42 * s, 0.9, ['#7ab85a', '#8cc86a'], 0.55, 1); rosette(4, 0.2 * s, 0.7, ['#b8e08a', '#c8ec9a'], 0.95, 1.5); }
    else if (kind === 'carrot') { rosette(6, 0.12, 0.9, [g1, g2], 1.15, 1.6); if (big) m.cyl(u, v, z, z + 0.9, 0.2, 0.26, '#f08a3a', 0, 6); }
    else if (kind === 'tomato') { stalk(6 * s, '#8a6040'); for (let i = 0; i < 6; i++) L([u + Math.cos(i * 1.9) * 0.3, v + Math.sin(i * 1.9) * 0.3, z + (1.5 + i * 0.75) * s], i * 1.9, 0.5, 0.75 * s, i % 2 ? g1 : g0); if (big) for (let i = 0; i < 4; i++) m.blob(u + Math.cos(i * 1.7) * 0.45, v + Math.sin(i * 1.7) * 0.45, z + 2 + i * 0.9, 0.2, 0.5, '#e0402a', 0, i, 3, 5); }
    else { rosette(7, 0.3 * s, 0.8, [g1, g0, g2], 0.6, 1.3); if (big) for (let i = 0; i < 5; i++) m.blob(u + Math.cos(i * 1.3) * 0.5, v + Math.sin(i * 1.3) * 0.5, z + 1.2 + (i % 3) * 0.7, 0.15, 0.38, '#e8405a', 0, i, 2, 4); }
  }
  // 树篱 / 灌木：一蓬叶子 + 几朵花
  function bush(m, u, v, z, r, cols, seed, flw) { m.foliage(u, v, z + r * 1.6, r, r * 2.1, cols, Math.round(18 + r * 26), seed, 0.6); if (flw) for (let i = 0; i < 3; i++) m.leaf([u + (H(seed, i) - 0.5) * r * 1.4, v + (H(i, seed) - 0.3) * r * 1.2, z + r * 2.4 + H(seed + 1, i) * r], H(i, 7) * 6, 0.9, 0.42, FLOW[(seed + i) % 5], 0.8); }
  // 一段缠着藤的树篱（代替栏杆）
  function hedge(m, u0, v0, u1, v1, z, cols, seed, r = 0.75) { const n = Math.max(1, Math.round(Math.hypot(u1 - u0, v1 - v0) / (r * 1.5))); for (let i = 0; i <= n; i++) bush(m, u0 + (u1 - u0) * i / n + (H(seed, i) - 0.5) * 0.3, v0 + (v1 - v0) * i / n + (H(i, seed) - 0.5) * 0.3, z, r * (0.75 + 0.5 * H(seed + 3, i)), cols, seed * 7 + i, H(seed, i + 9) < 0.45); }
  // 路灯
  function lamp(m, u, v, z, id) { m.pk(id); m.cyl(u, v, z, z + 9.5, 0.17, 0.12, '#3a3448', M.metal, 5); m.box(u - 0.42, v - 0.42, z + 9.5, u + 0.42, v + 0.42, z + 11.8, '#ffe9a8', M.glow); m.cyl(u, v, z + 11.8, z + 13, 0.66, 0.05, '#3a3448', 0, 4); m.pk(0); }
  // 买来的摆设
  function deco(m, id, u, v, z, pid) {
    m.pk(pid);
    if (id === 'bench') { m.box(u - 1.6, v - 0.5, z + 2, u + 1.6, v + 0.5, z + 2.6, '#c8935e', M.plank); m.box(u - 1.6, v - 0.5, z + 2.6, u + 1.6, v - 0.3, z + 5.4, WOOD2, M.plank); posts(m, [[u - 1.4, v - 0.3], [u + 1.4, v - 0.3], [u - 1.4, v + 0.3], [u + 1.4, v + 0.3]], z, 2, '#7a5236', 0.14); }
    else if (id === 'lampPost') lamp(m, u, v, z, pid);
    else if (id === 'hay') { m.box(u - 1.3, v - 0.9, z, u + 1.3, v + 0.9, z + 3.2, '#e8c860', M.cloth); m.box(u - 0.8, v - 0.6, z + 3.2, u + 1, v + 0.7, z + 5.4, '#dcb850', M.cloth); }
    else if (id === 'lantern') { m.blob(u, v, z + 1.8, 0.85, 2, '#f2832a', 0, 3, 4, 8); m.box(u - 0.3, v + 0.68, z + 1.4, u + 0.3, v + 0.86, z + 2.5, '#ffe27a', M.glow); m.cyl(u, v, z + 3.6, z + 4.5, 0.1, 0.07, '#3f8a44', 0, 4); }
    else if (id === 'flowers') { m.cyl(u, v, z, z + 0.8, 1.5, 1.5, '#9a8a78', M.stone, 10); for (let i = 0; i < 12; i++) { const a = H(i, 3) * 6.28, d = H(3, i) * 1.2; m.flower(u + Math.cos(a) * d, v + Math.sin(a) * d, z + 0.8, 1.6 + H(i, 5) * 1.6, FLOW[i % 5], i); m.tuft(u + Math.cos(a + 1) * d, v + Math.sin(a + 1) * d, z + 0.8, 1.6, 3, '#5aa64e', i); } }
    else if (id === 'scarecrow') { m.box(u - 0.14, v - 0.14, z, u + 0.14, v + 0.14, z + 10, '#8a6040', 2); m.box(u - 1.6, v - 0.12, z + 6.4, u + 1.6, v + 0.12, z + 7.1, '#8a6040', 2); m.box(u - 0.85, v - 0.3, z + 3.8, u + 0.85, v + 0.3, z + 7.6, '#5a8ad8', M.cloth); m.blob(u, v, z + 9.3, 0.55, 1.4, '#f2d28a', 0, 2, 4, 7); m.cyl(u, v, z + 10, z + 10.5, 1.05, 1.05, '#c8a050', 0, 9); m.cyl(u, v, z + 10.5, z + 12.2, 0.56, 0.15, '#b08a40', 0, 8); }
    else if (id === 'swing') { for (const s of [-1.6, 1.6]) m.quad([u + s - 0.5, v, z], [u + s - 0.2, v, z], [u + s + 0.15, v, z + 12], [u + s - 0.15, v, z + 12], '#8a6040', 2); m.box(u - 1.9, v - 0.15, z + 11.6, u + 1.9, v + 0.15, z + 12.5, WOOD2, 2); for (const s of [-0.8, 0.8]) m.box(u + s - 0.05, v - 0.05, z + 3.4, u + s + 0.05, v + 0.05, z + 11.6, '#d8c8a0', 0); m.box(u - 1, v - 0.4, z + 2.8, u + 1, v + 0.4, z + 3.4, '#c8935e', M.plank); }
    m.pk(0);
  }

  // ---------- 室外 ----------
  function deck(o) {
    const m = new Mesh(), sea = o.season, snow = o.snow, Z = K.Z;
    const LEAF = sea === 'autumn' ? ['#e0a040', '#d8702a', '#c85a2a', '#e8c050'] : sea === 'winter' ? ['#6a8a70', '#7a9a80', '#8aa890'] : sea === 'spring' ? ['#7cc860', '#a0dc78', '#f2b6d0', '#5aa64e'] : ['#4c9a48', '#6fbf5a', '#3f8a44', '#86cc6a'];
    const IVY = sea === 'autumn' ? ['#c8502a', '#e08a3a', '#a83a2a'] : sea === 'winter' ? ['#5a7a5a', '#6a8a68'] : ['#3f8a44', '#5aa64e', '#2f7a3a'];
    const HED = sea === 'winter' ? ['#5a8262', '#6a9070', '#e8f0f4'] : sea === 'autumn' ? ['#8aa04a', '#b8a040', '#6a9048'] : ['#3f8a44', '#58a850', '#4c9a48'];
    const GR = snow ? '#eef4fa' : sea === 'autumn' ? '#b8b060' : '#7cbc62', GM = snow ? M.snow : M.grass, ROOF = snow ? '#e4ecf4' : '#b8503c', ROOF2 = snow ? '#dce6f0' : '#5a7a8a', RM = snow ? M.snow : M.tile, bloom = sea === 'spring' || sea === 'summer' ? '#c8a0f0' : null;

    // —— 底盘：一块块厚薄不一、各伸出去一截的模块，底下的轮廓也是参差的 ——
    m.box(9, 7, -2.2, 41, 32, 0, '#8a6a4a', M.plank, GR, GM);                       // 院子（草地）
    m.box(30, 32, -1.4, 33, 35.4, 0, WOOD, M.plank);                                // 通往鱼塘的小平台
    m.box(11, 9, -6, 39, 30, -2.2, DARK, M.plank); m.box(14, 12, -13, 35, 27, -6, STONE2, M.stone); // 木裙 + 石头芯
    m.cyl(24.5, 19.5, -21, -13, 4, 6.2, COPPER, M.metal, 12); m.cyl(24.5, 19.5, -22.2, -21, 2.4, 4, '#8a5a3a', M.metal, 12); // 铜锅炉肚子
    m.box(11.4, 8.4, -9.5, 25.6, 20.6, 0, '#9a948a', M.stone); m.box(26.6, 5.6, -11, 38.4, 17.4, 0, STONE2, M.stone); // 小屋和储藏楼各自的地基，深浅不同
    // 前面往下伸的两个舱：深浅不一（下面的轮廓是参差的），带舷窗和管子
    m.box(26, 20, -10, 40.4, 31.4, -2.2, STONE, M.stone); for (const u of [29, 33.4, 37.6]) m.disc(u, 31.46, -6, 0.8, 'v', '#ffe9a8', M.glass, 10); m.box(26, 31.4, -3.4, 40.4, 31.7, -2.8, TIMBER, 2); m.cyl(40.5, 28, -9, -3, 0.3, 0.3, COPPER, M.metal, 6);
    m.box(9.6, 24, -6.6, 25, 31.6, -2.2, '#9a6a48', M.plank); for (const u of [12.4, 16.6, 21]) m.disc(u, 31.66, -4.4, 0.62, 'v', '#9fd4f2', M.glass, 10); for (const u of [9.7, 14.6, 19, 24.8]) m.box(u - 0.15, 31.6, -6.6, u + 0.15, 31.8, -2.2, TIMBER, 2); m.box(11, 26, -9.4, 17, 30.8, -6.6, DARK, M.plank);
    for (const [u, v] of [[36, 28], [13, 28]]) m.quad([u, v, -2.2], [u + 1.2, v, -2.2], [u - 3, v - 6, -12], [u - 4.2, v - 6, -12], DARK, 2); // 斜撑
    m.cyl(39.6, 24, -9, -3, 0.5, 0.5, '#6a6470', M.metal, 7); m.cyl(40.6, 24, -9.6, -8.4, 0.5, 0.9, '#6a6470', M.metal, 7); // 排气管
    // 树台（抬高）+ 底下吊着的地窖舱
    m.box(3.5, 19, 0.6, 9, 33, Z.porch, WOOD, M.plank, '#c8a070', M.plank); m.box(4, 20.4, -8, 8.6, 31.6, 0.6, PLAS2, M.plaster);
    for (const v of [20.4, 26, 31.4]) m.box(8.5, v - 0.2, -8, 8.75, v + 0.2, 0.6, TIMBER, 2); m.box(3.9, 31.5, -4.4, 8.7, 31.75, -3.8, TIMBER, 2);
    m.disc(6.3, 31.72, -3, 0.75, 'v', '#9fd4f2', M.glass, 10); m.box(3.6, 20, -9, 9, 32, -8, DARK, M.plank);
    m.stairs(10.6, 9, 24, 27, 0, Z.porch, 'u', WOOD2, 3); // 上树台的两级台阶
    // 石头露台（下沉）
    m.box(41, 12, -4.4, 45.5, 25, Z.east, STONE, M.stone, '#b8b2a6', M.stone); m.box(41.4, 13, -9, 44.6, 23, -4.4, STONE2, M.stone);
    m.stairs(40, 41.6, 14, 17, 0, Z.east, 'u', STONE, 3);
    // 鱼塘台（挑出去的）
    const P = K.POND;
    m.box(13, 33, -6.2, 25, 43.4, Z.pond, WOOD2, M.plank, WOOD, M.plank);
    for (const u of [14.5, 23.5]) m.quad([u - 0.3, 43, -6.2], [u + 0.3, 43, -6.2], [u + 0.3, 30, -13], [u - 0.3, 30, -13], DARK, 2);
    m.stairs(30, 25, 33, 35.2, 0, Z.pond, 'u', WOOD, 6, true);
    // 塘：木桶壁 + 铜箍 + 水面
    for (const [a, b, c, d] of [[P.u0 - 0.5, P.v0 - 0.5, P.u1 + 0.5, P.v0], [P.u0 - 0.5, P.v1, P.u1 + 0.5, P.v1 + 0.5], [P.u0 - 0.5, P.v0, P.u0, P.v1], [P.u1, P.v0, P.u1 + 0.5, P.v1]]) m.box(a, b, Z.pond, c, d, P.z + 0.7, '#8a5e3c', M.plank);
    m.box(P.u0 - 0.6, P.v1 + 0.5, Z.pond + 0.5, P.u1 + 0.6, P.v1 + 0.62, Z.pond + 0.9, COPPER, M.metal); m.box(P.u1 + 0.5, P.v0 - 0.6, Z.pond + 0.5, P.u1 + 0.62, P.v1 + 0.6, Z.pond + 0.9, COPPER, M.metal);
    m.pk(PICK.fish); m.quad([P.u0, P.v0, P.z], [P.u1, P.v0, P.z], [P.u1, P.v1, P.z], [P.u0, P.v1, P.z], '#4aa8d8', M.water); m.pk(0);
    // 进水：从院子边的铜管流下来；出水：前面缺口挂下一道水帘
    m.cyl(23, 33.2, -1.4, -0.6, 0.35, 0.35, COPPER, M.metal, 7); m.box(22.7, 32, -1.3, 23.3, 33.4, -0.7, COPPER, M.metal);
    m.quad([22.6, 35.9, -1], [23.4, 35.9, -1], [23.4, 35.9, P.z], [22.6, 35.9, P.z], '#9adcf6', M.water);
    m.quad([17.4, P.v1 + 0.56, P.z], [19.6, P.v1 + 0.56, P.z], [19.6, P.v1 + 0.56, -15], [17.4, P.v1 + 0.56, -15], '#9adcf6', M.water);
    for (const [u, v, r] of [[16, 37.4, 0.7], [21.6, 40.6, 0.8], [17.2, 41.2, 0.55], [22.2, 37, 0.5]]) { m.cyl(u, v, P.z + 0.02, P.z + 0.06, r || 0.5, r || 0.5, '#5aa64e', 0, 8); if (!snow && r > 0.6) m.leaf([u, v, P.z + 0.3], 1, 1.2, 0.4, '#f2a6c2', 0.3); }
    for (let i = 0; i < 7; i++) m.tuft(P.u0 + 0.5 + H(i, 1) * 1.2, P.v0 + 0.5 + H(1, i) * 5.6, P.z, 3.4 + H(i, 2) * 2, 4, '#6a9a50', i);

    // —— 储藏楼（石头）+ 屋顶上的玻璃花房 ——
    m.box(27, 6.5, 0, 38, 17, Z.terr, STONE, M.stone, '#b0aa9c', M.stone);
    m.win('u', 9, 10.6, 4.5, 8.5, 38, { shut: '#5a7a8a' }); m.disc(38.06, 14, 7, 0.7, 'u', '#9fd4f2', M.glass, 10); m.box(38, 8.6, 0, 38.3, 11, 0.6, STONE2, M.stone);
    const G = GH, gz = Z.terr;
    m.box(G.u0, G.v0, gz, G.u1, G.v1, gz + 1.2, BRICK, M.stone);
    m.box(G.u0 + 0.1, G.v0 + 0.1, gz + 1.2, G.u1 - 0.1, G.v1 - 0.1, gz + G.h, '#7fc0dc', M.glass);
    for (let i = 0; i <= G.nv; i++) { const u = G.u0 + (G.u1 - G.u0) * i / G.nv; m.box(u - 0.12, G.v1 - 0.06, gz + 1.2, u + 0.12, G.v1 + 0.1, gz + G.h, '#f4f0e6', 0); }
    for (let i = 0; i <= G.nu; i++) { const v = G.v0 + (G.v1 - G.v0) * i / G.nu; m.box(G.u1 - 0.06, v - 0.12, gz + 1.2, G.u1 + 0.1, v + 0.12, gz + G.h, '#f4f0e6', 0); }
    m.box(G.u0, G.v1 - 0.06, gz + G.h - 0.3, G.u1, G.v1 + 0.12, gz + G.h, '#f4f0e6', 0); m.box(G.u1 - 0.06, G.v0, gz + G.h - 0.3, G.u1 + 0.12, G.v1, gz + G.h, '#f4f0e6', 0);
    m.gable(G.u0, G.v0, G.u1, G.v1, gz + G.h, G.roof, 'u', '#8cc8e0', M.glass, 0.3, '#7fc0dc', M.glass);
    for (let i = 0; i <= G.nv; i++) { const u = G.u0 + (G.u1 - G.u0) * i / G.nv, mid = (G.v0 + G.v1) / 2; m.quad([u - 0.08, G.v1 + 0.3, gz + G.h - 0.1], [u + 0.08, G.v1 + 0.3, gz + G.h - 0.1], [u + 0.08, mid, gz + G.h + G.roof + 0.12], [u - 0.08, mid, gz + G.h + G.roof + 0.12], '#f4f0e6', 0); }
    m.pk(PICK.green); m.box(K.GDOOR.u - 0.85, G.v1, gz, K.GDOOR.u + 0.85, G.v1 + 0.18, gz + 5.6, '#7fc8a8', M.glass); m.box(K.GDOOR.u - 1, G.v1 + 0.1, gz, K.GDOOR.u - 0.85, G.v1 + 0.26, gz + 5.9, '#f4f0e6', 0); m.box(K.GDOOR.u + 0.85, G.v1 + 0.1, gz, K.GDOOR.u + 1, G.v1 + 0.26, gz + 5.9, '#f4f0e6', 0); m.box(K.GDOOR.u - 1, G.v1 + 0.1, gz + 5.6, K.GDOOR.u + 1, G.v1 + 0.26, gz + 5.9, '#f4f0e6', 0); m.box(K.GDOOR.u + 0.5, G.v1 + 0.2, gz + 2.6, K.GDOOR.u + 0.66, G.v1 + 0.34, gz + 3, '#c8a050', M.metal); m.pk(0);
    for (let i = 0; i < 6; i++) m.foliage(G.u0 + 1 + i * 1.4, G.v1 - 0.7, gz + 2.6 + H(i, 4) * 1.5, 0.5, 1.2, LEAF, 8, i + 40, 0.5); // 玻璃后面隐约的绿
    // 外挂楼梯 + 悬空的小平台
    m.stairs(36.4, 28.4, 17.2, 19.6, 0, Z.terr, 'u', WOOD, 12, true);
    m.box(25.6, 17, Z.terr - 0.8, 28.4, 19.6, Z.terr, WOOD2, M.plank); posts(m, [[26, 19.3], [28.1, 19.3]], 0, Z.terr - 0.8, DARK, 0.18); posts(m, [[32.4, 19.4], [36.2, 19.4]], 0, 6, DARK, 0.14);
    m.quad([36.4, 19.6, 3.2], [36.4, 19.6, 3.8], [28.4, 19.6, Z.terr + 3.8], [28.4, 19.6, Z.terr + 3.2], WOOD2, 2); for (let i = 0; i <= 4; i++) { const u = 36.4 - i * 2, z = (36.4 - u) / 8 * Z.terr; m.box(u - 0.1, 19.5, z, u + 0.1, 19.7, z + 3.6, WOOD2, 2); }
    m.rail(25.6, 19.6, 28.4, 19.6, Z.terr, 3.6); m.rail(38, 14.2, 38, 17, Z.terr, 3.6); m.rail(36.6, 17, 38, 17, Z.terr, 3.6);

    // —— 小屋：石基 + 灰泥一层 + 外挑的木筋二层 + 悬挑卧室舱 + 陡屋顶 ——
    const S = HOUSE, uL = S.u1 - S.u0, vL = S.v1 - S.v0, z1 = S.h1, z2 = S.h1 + S.h2;
    m.box(S.u0, S.v0, 0, S.u1, S.v1, z1, PLAS, M.plaster); m.box(S.u0 - 0.15, S.v0 - 0.15, 0, S.u1 + 0.15, S.v1 + 0.15, 1.6, STONE, M.stone);
    m.box(S.u0 - 0.4, S.v0 - 0.4, z1, S.u1 + 0.4, S.v1 + 0.4, z2, PLAS2, M.plaster); m.box(S.u0 - 0.5, S.v0 - 0.5, z1 - 0.5, S.u1 + 0.5, S.v1 + 0.5, z1 + 0.5, TIMBER, 2);
    for (const t of [0, 0.33, 0.66, 1]) { const u = S.u0 - 0.3 + t * (uL + 0.6); m.box(u - 0.18, S.v1 + 0.4, z1, u + 0.18, S.v1 + 0.52, z2, TIMBER, 2); } for (const t of [0, 0.5, 1]) { const v = S.v0 - 0.3 + t * (vL + 0.6); m.box(S.u1 + 0.4, v - 0.18, z1, S.u1 + 0.52, v + 0.18, z2, TIMBER, 2); }
    m.quad([S.u0 + 0.3, S.v1 + 0.46, z1 + 0.6], [S.u0 + 0.7, S.v1 + 0.46, z1 + 0.6], [S.u0 + 4.4, S.v1 + 0.46, z2], [S.u0 + 4, S.v1 + 0.46, z2], TIMBER, 2);
    m.gable(S.u0 - 0.4, S.v0 - 0.4, S.u1 + 0.4, S.v1 + 0.4, z2, 9, 'u', ROOF, RM, 0.9, PLAS2, M.plaster);
    { const mid = (S.v0 + S.v1) / 2; m.win('u', mid - 0.7, mid + 0.7, z2 + 2, z2 + 5, S.u1 + 0.4, { arch: 1 }); }
    // 屋顶上的补丁（铁皮、木板）
    { const mid = (S.v0 + S.v1) / 2, hw = (vL + 0.8) / 2, zr = (v) => z2 + 9 * (1 - (v - mid) / hw) + 0.12; for (const [a, b, c, d, col, mt] of [[21, 22.8, mid + 1.2, mid + 3.2, '#5a7a8a', M.metal], [13.2, 14.6, mid + 3, mid + 5, '#c8a060', M.plank], [22.6, 24.2, mid + 3.8, mid + 5.4, '#8a6a5a', M.metal]]) m.quad([a, c, zr(c)], [b, c, zr(c)], [b, d, zr(d)], [a, d, zr(d)], snow ? '#dce6f0' : col, mt); }
    // 柴棚：斜搭在储藏楼侧面
    m.pk(PICK.shed); posts(m, [[40.2, 8.4], [40.2, 12.2]], 0, 5.2, DARK, 0.16); m.quad([38, 8, 7.2], [38, 12.6, 7.2], [40.7, 12.6, 5.2], [40.7, 8, 5.2], ROOF2, RM); for (let i = 0; i < 3; i++) for (let j = 0; j < 5 - i; j++) m.cyl(38.9 + (i % 2) * 0.3, 8.9 + j * 0.72 + i * 0.36, i * 1.15, i * 1.15 + 0.01, 0.01, 0.01, '#c8935e', 0, 3) && m.box(38.2, 8.6 + j * 0.72 + i * 0.36, i * 1.15, 40, 9.2 + j * 0.72 + i * 0.36, i * 1.15 + 1.1, j % 2 ? '#a8784a' : '#8a5e3c', M.plank); m.pk(0);
    // 老虎窗
    m.box(16.2, 17.4, z2 + 1.5, 19, 20.6, z2 + 4.6, PLAS2, M.plaster); m.gable(16.2, 17.4, 19, 20.6, z2 + 4.6, 1.8, 'v', ROOF, RM, 0.3, PLAS2, M.plaster); m.win('v', 17, 18.2, z2 + 2.2, z2 + 4, 20.6, {});
    // 烟囱（歪一点的砖烟囱 + 铁皮烟管）
    m.box(19.3, 9.4, z2 + 2, 21, 11, z2 + 14, BRICK, M.stone); m.box(19.1, 9.2, z2 + 14, 21.2, 11.2, z2 + 15, STONE2, M.stone); m.cyl(20.15, 10.2, z2 + 15, z2 + 17, 0.5, 0.4, '#3a3448', M.metal, 7);
    m.cyl(14, 12.4, z2 + 6.5, z2 + 11, 0.28, 0.28, '#6a6470', M.metal, 6); m.cyl(14, 12.4, z2 + 11, z2 + 11.8, 0.5, 0.2, '#6a6470', M.metal, 6);
    // 门
    const du = K.DOOR.u;
    m.pk(PICK.door); m.box(du - 1.1, S.v1, 0, du + 1.1, S.v1 + 0.22, 7.6, '#8a5a3a', M.plank); m.box(du - 1.35, S.v1 + 0.05, 0, du - 1.1, S.v1 + 0.34, 8, TIMBER, 2); m.box(du + 1.1, S.v1 + 0.05, 0, du + 1.35, S.v1 + 0.34, 8, TIMBER, 2); m.box(du - 1.5, S.v1 + 0.05, 7.6, du + 1.5, S.v1 + 0.4, 8.4, TIMBER, 2); m.disc(du, S.v1 + 0.26, 5.6, 0.36, 'v', '#ffe9a8', M.glass, 8); m.box(du + 0.6, S.v1 + 0.22, 3.4, du + 0.78, S.v1 + 0.36, 3.8, '#c8a050', M.metal); m.pk(0);
    m.box(du - 1.6, S.v1, -0.01, du + 1.6, S.v1 + 1.5, 0.5, STONE, M.stone); m.box(du + 1.6, S.v1 + 0.3, 6.4, du + 2, S.v1 + 0.7, 7.6, '#ffe9a8', M.glow);
    m.quad([du - 2, S.v1, 8.6], [du + 2, S.v1, 8.6], [du + 2, S.v1 + 1.7, 7.8], [du - 2, S.v1 + 1.7, 7.8], ROOF2, RM); // 门檐
    // 窗（位置、个数 = SPEC；室内同一份）
    S.fv.forEach((t) => { const c = S.u0 + t * uL; m.win('v', c - 0.9, c + 0.9, 4, 8, S.v1, { shut: '#5a7a8a', box: FLOW[2] }); });
    S.fv2.forEach((t, i) => { const c = S.u0 + t * uL; m.win('v', c - 0.8, c + 0.8, z1 + 2.6, z1 + 6.4, S.v1 + 0.4, { box: i === 1 ? FLOW[0] : null }); });
    S.fu.forEach((t) => { const c = S.v0 + t * vL; m.win('u', c - 0.9, c + 0.9, 4, 8, S.u1, { shut: '#5a7a8a' }); });
    S.fu2.forEach((t) => { const c = S.v0 + t * vL; m.win('u', c - 0.8, c + 0.8, z1 + 2.6, z1 + 6.4, S.u1 + 0.4, {}); });
    // 悬挑卧室舱（自己的占地、自己的层高；屋顶是望远镜台）
    m.box(25.4, 11.4, z1 + 0.4, 27.4, 15.6, K.Z.pod - 0.5, '#d8b890', M.plank); m.box(25, 11.2, K.Z.pod - 0.5, 27.6, 15.8, K.Z.pod, WOOD2, M.plank);
    m.win('u', 12.6, 14.4, z1 + 2.8, z1 + 6.2, 27.4, { box: FLOW[1] }); for (const v of [11.8, 15.2]) m.quad([27.3, v, z1 + 0.4], [27.3, v + 0.3, z1 + 0.4], [25.1, v + 0.3, z1 - 3.4], [25.1, v, z1 - 3.4], DARK, 2);
    m.rail(27.6, 11.2, 27.6, 15.8, K.Z.pod, 3.2); m.rail(25, 11.2, 27.6, 11.2, K.Z.pod, 3.2);
    m.stairs(17, 15.6, 25.8, 27.2, Z.terr, K.Z.pod, 'v', WOOD, 7, true); // 陡梯：小平台 → 舱顶
    m.pk(PICK.scope); posts(m, [[K.SCOPE.u - 0.5, K.SCOPE.v + 0.4], [K.SCOPE.u + 0.5, K.SCOPE.v + 0.4], [K.SCOPE.u, K.SCOPE.v - 0.5]], K.Z.pod, 3.4, '#5a4a40', 0.08); m.quad([K.SCOPE.u - 0.9, K.SCOPE.v - 0.3, K.Z.pod + 5.6], [K.SCOPE.u - 0.9, K.SCOPE.v + 0.3, K.Z.pod + 5.6], [K.SCOPE.u + 0.9, K.SCOPE.v + 0.3, K.Z.pod + 3], [K.SCOPE.u + 0.9, K.SCOPE.v - 0.3, K.Z.pod + 3], COPPER, M.metal); m.box(K.SCOPE.u - 1, K.SCOPE.v - 0.36, K.Z.pod + 5.2, K.SCOPE.u - 0.7, K.SCOPE.v + 0.36, K.Z.pod + 6.2, '#3a3448', M.metal); m.pk(0);

    // —— 水塔、信箱、篝火、热气球 ——
    const T = K.TANK; m.pk(PICK.barrel); posts(m, [[T.u - 0.9, T.v - 0.9], [T.u + 0.9, T.v - 0.9], [T.u - 0.9, T.v + 0.9], [T.u + 0.9, T.v + 0.9]], 0, 7.4, DARK, 0.14); m.cyl(T.u, T.v, 7.4, 12.4, 1.45, 1.45, '#8a6a4a', M.plank, 12); m.cyl(T.u, T.v, 12.4, 14.4, 1.6, 0.1, ROOF2, RM, 12); for (const z of [8.2, 11.4]) m.cyl(T.u, T.v, z, z + 0.4, 1.52, 1.52, COPPER, M.metal, 12); m.cyl(T.u + 0.6, T.v + 1.3, 1.6, 7.4, 0.14, 0.14, COPPER, M.metal, 5); m.cyl(T.u + 0.6, T.v + 1.9, 0, 1.5, 0.55, 0.7, '#7a5a40', M.plank, 9); m.cyl(T.u + 0.6, T.v + 1.9, 1.3, 1.34, 0.6, 0.6, '#4aa8d8', M.water, 9); m.pk(0);
    const B = K.MAILB; m.pk(PICK.mail); m.box(B.u - 0.14, B.v - 0.14, 0, B.u + 0.14, B.v + 0.14, 5, DARK, 2); m.box(B.u - 0.9, B.v - 0.55, 5, B.u + 0.9, B.v + 0.55, 6.9, '#e0604a', 0); m.box(B.u - 0.9, B.v + 0.55, 5.1, B.u + 0.9, B.v + 0.62, 6.6, '#f4e6c8', 0); m.box(B.u + 0.9, B.v - 0.1, 6, B.u + 1, B.v + 0.1, 8.4, '#ffd36a', 0); m.pk(0);
    const F = K.FIRE; m.pk(PICK.fire); for (let i = 0; i < 8; i++) { const a = i * 0.785; m.box(F.u + Math.cos(a) * 1.25 - 0.35, F.v + Math.sin(a) * 1.25 - 0.35, Z.east, F.u + Math.cos(a) * 1.25 + 0.35, F.v + Math.sin(a) * 1.25 + 0.35, Z.east + 0.9, i % 2 ? STONE2 : '#9a948a', M.stone); } m.box(F.u - 0.9, F.v - 0.15, Z.east + 0.2, F.u + 0.9, F.v + 0.15, Z.east + 0.7, '#5a3a28', 2); m.box(F.u - 0.15, F.v - 0.9, Z.east + 0.4, F.u + 0.15, F.v + 0.9, Z.east + 0.9, '#6a4a30', 2); m.pk(0);
    const BL = K.BALLOON; m.pk(PICK.balloon); m.box(BL.u - 1, BL.v - 1, Z.east, BL.u + 1, BL.v + 1, Z.east + 2.4, '#c89a5a', M.cloth); m.box(BL.u - 1.1, BL.v - 1.1, Z.east + 2.4, BL.u + 1.1, BL.v + 1.1, Z.east + 2.8, DARK, 2);
    if (!o.tripping) { for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.quad([BL.u + a - 0.04, BL.v + b, Z.east + 2.8], [BL.u + a + 0.04, BL.v + b, Z.east + 2.8], [BL.u + a * 1.6 + 0.04, BL.v + b * 1.6, Z.east + 9], [BL.u + a * 1.6 - 0.04, BL.v + b * 1.6, Z.east + 9], '#d8c8a0', 0); m.blob(BL.u, BL.v, Z.east + 15, 3.2, 8, '#e8705a', M.cloth, 4, 6, 10); m.blob(BL.u, BL.v, Z.east + 15.4, 3.25, 3, '#ffd36a', M.cloth, 4, 4, 10); }
    m.pk(0);

    // —— 菜箱：高低不一 ——
    K.PLOTS.forEach(([pu, pv], i) => {
      const h = K.PH[i], f = o.farm && o.farm[i], s = K.PS;
      m.pk(PICK.plot + i); m.box(pu, pv, 0, pu + s, pv + s, h, i % 2 ? '#8a5e3c' : '#9a6a44', M.plank, f && f.wet ? '#4a3426' : '#6a4a34', M.soil); posts(m, [[pu, pv], [pu + s, pv], [pu, pv + s], [pu + s, pv + s]], 0, h + 0.4, DARK, 0.16);
      if (f) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) crop(m, f.crop, f.stage, pu + 0.65 + a * 1.15, pv + 0.65 + b * 1.15, h, i * 9 + a * 3 + b);
      m.pk(0);
    });

    // —— 大树：长在树台上，根扒着台子垂下去 ——
    const TR = K.TREE, tz = Z.porch; m.pk(PICK.tree);
    m.cyl(TR.u, TR.v, tz, tz + 5, 1.15, 0.8, '#7a5236', M.plank, 9); m.cyl(TR.u + 0.2, TR.v - 0.1, tz + 5, tz + 12, 0.8, 0.55, '#7a5236', M.plank, 8);
    for (const [du2, dv2, zz, r] of [[1.6, -0.6, 13, 0.4], [-1.2, 1.2, 14, 0.36], [0.4, 1.6, 12, 0.34], [-0.6, -1.6, 15, 0.3]]) m.quad([TR.u + 0.2 - r, TR.v, tz + 9], [TR.u + 0.2 + r, TR.v, tz + 9], [TR.u + du2 * 1.6 + r * 0.5, TR.v + dv2 * 1.6, tz + zz + 4], [TR.u + du2 * 1.6 - r * 0.5, TR.v + dv2 * 1.6, tz + zz + 4], '#6a4630', 2);
    for (const [a, len] of [[0.4, 9], [1.6, 12], [2.6, 7], [4.4, 10]]) m.quad([TR.u + Math.cos(a) * 0.9 - 0.25, TR.v + Math.sin(a) * 0.9, tz + 1.4], [TR.u + Math.cos(a) * 0.9 + 0.25, TR.v + Math.sin(a) * 0.9, tz + 1.4], [TR.u + Math.cos(a) * 2.8 + 0.1, TR.v + Math.sin(a) * 2.8, tz - len], [TR.u + Math.cos(a) * 2.8 - 0.1, TR.v + Math.sin(a) * 2.8, tz - len], '#6a4630', 2);
    if (sea === 'winter') { for (let i = 0; i < 9; i++) m.quad([TR.u + 0.2, TR.v, tz + 12 + i % 3], [TR.u + 0.35, TR.v, tz + 12 + i % 3], [TR.u + Math.cos(i * 0.7) * 3.4, TR.v + Math.sin(i * 0.7) * 3.4, tz + 17 + (i % 4) * 2], [TR.u + Math.cos(i * 0.7) * 3.3, TR.v + Math.sin(i * 0.7) * 3.3, tz + 17 + (i % 4) * 2], '#6a4630', 2); m.foliage(TR.u, TR.v, tz + 19, 3.2, 5, ['#eef4fa', '#dce8f2'], 50, 3, 0.9); }
    else { for (const [a, b, c, r, n] of [[0, 0, 20, 3.4, 170], [2.2, -0.8, 17, 2.4, 110], [-1.8, 1.6, 17.5, 2.3, 110], [0.6, 2.4, 16, 2, 85], [-0.8, -2.2, 18.5, 2.2, 90], [0.4, 0.2, 24.5, 2.1, 85]]) m.foliage(TR.u + a, TR.v + b, tz + c, r, r * 2.1, LEAF, n, a * 7 + b * 3 + c, 0.66); if (sea !== 'spring') for (let i = 0; i < 7; i++) m.blob(TR.u + Math.cos(i * 0.9) * 2.6, TR.v + Math.sin(i * 0.9) * 2.6, tz + 14.5 + (i % 3) * 2, 0.26, 0.62, sea === 'autumn' ? '#e8705a' : '#f2a03a', 0, i, 3, 5); }
    m.pk(0);
    for (let i = 0; i < 4; i++) { const a = i * 1.5 + 0.6; m.cyl(TR.u + Math.cos(a) * 1.7, TR.v + Math.sin(a) * 1.7, tz, tz + 0.7 + (i % 2) * 0.4, 0.09, 0.09, '#f4ead8', 0, 4); m.cyl(TR.u + Math.cos(a) * 1.7, TR.v + Math.sin(a) * 1.7, tz + 0.7 + (i % 2) * 0.4, tz + 1.2 + (i % 2) * 0.4, 0.34, 0.06, i % 2 ? '#e0604a' : '#d8a060', 0, 7); } // 树根边的蘑菇

    // —— 植物和房子长在一起 ——
    m.vine([[S.u0 + 0.4, S.v1 + 0.3, 0], [S.u0 + 0.6, S.v1 + 0.5, 8], [S.u0 + 2.4, S.v1 + 0.6, 13], [S.u0 + 1.4, S.v1 + 0.6, z2], [S.u0 + 3, S.v1 + 1, z2 + 3]], { cols: IVY, seed: 2, gap: 0.5, ls: 0.6 });
    m.vine([[S.u1 + 0.2, S.v1 - 0.5, 0], [S.u1 + 0.3, S.v1 - 1, 10], [S.u1 + 0.5, S.v1 - 3, z2 - 2], [S.u1 + 0.5, S.v1 - 1.6, z2 + 1]], { cols: IVY, seed: 5, gap: 0.5, ls: 0.6 });
    m.vine([[S.u0, S.v1 + 0.9, z2 - 0.6], [S.u1, S.v1 + 0.9, z2 - 0.6]], { cols: IVY, seed: 7, gap: 1.1, ls: 0.5, drop: 4, bloom }); // 屋檐下垂着一排
    m.vine([[38.1, 6.8, 0], [38.2, 8, 7], [38.2, 12.4, Z.terr], [38.2, 16.6, Z.terr - 3]], { cols: IVY, seed: 9, gap: 0.45, ls: 0.6 }); m.vine([[27.2, 17.1, 0], [27.4, 17.2, 9], [30, 17.2, Z.terr]], { cols: IVY, seed: 11, gap: 0.5, ls: 0.55 });
    m.vine([[28.4, 19.7, Z.terr + 3.6], [36.4, 19.7, 3.6]], { cols: IVY, seed: 13, gap: 0.9, ls: 0.5, drop: 3.5, bloom }); m.vine([[25.6, 19.7, Z.terr - 0.8], [28.4, 19.7, Z.terr - 0.8]], { cols: IVY, seed: 15, gap: 0.6, ls: 0.5, drop: 6, bloom });
    for (const [a, b, c, d, z, dr, sd] of [[9, 32.1, 29.6, 32.1, 0, 7, 21], [33.2, 32.1, 41, 32.1, 0, 9, 22], [41.1, 25.4, 41.1, 32, 0, 6, 23], [3.5, 33.1, 9, 33.1, Z.porch, 8, 24], [13, 43.5, 25, 43.5, Z.pond, 6, 25], [45.6, 12, 45.6, 25, Z.east, 7, 26], [41, 25.1, 45.5, 25.1, Z.east, 5, 27], [9, 6.9, 12, 6.9, 0, 4, 28]]) m.vine([[a, b, z], [c, d, z]], { cols: IVY, seed: sd, gap: 0.95, ls: 0.55, drop: dr, bloom: sd % 2 ? bloom : null });
    if (!snow) for (let i = 0; i < 26; i++) { const u = S.u0 + H(i, 1) * uL, t = H(1, i), v = S.v1 + 0.9 - t * 5; m.leaf([u, v, z2 - 0.9 + t * 5 * 9 / 6.4 + 0.25], H(i, 2) * 6, 0.15, 0.7, i % 3 ? '#6a9a50' : '#8ab860', 0.2); } // 屋顶上的苔藓
    // 树篱代替栏杆 + 花 + 草丛
    hedge(m, 9.6, 7.8, 11.4, 7.8, 0, HED, 1); hedge(m, 25.6, 7.6, 26.6, 7.6, 0, HED, 2, 0.6); hedge(m, 40.4, 25.8, 40.4, 30.4, 0, HED, 4, 0.7); hedge(m, 9.6, 30.6, 9.6, 28, 0, HED, 5, 0.7); hedge(m, 12.4, 31.4, 19, 31.4, 0, HED, 6, 0.7); hedge(m, 4.2, 20, 4.2, 22.4, Z.porch, HED, 7, 0.7); hedge(m, 4.2, 28, 4.2, 32.4, Z.porch, HED, 8, 0.7); hedge(m, 44.8, 15.6, 44.8, 24.4, Z.east, HED, 9, 0.6); hedge(m, 37.4, 14.6, 34.6, 14.6, Z.terr, HED, 10, 0.5); hedge(m, 13.6, 33.6, 13.6, 35, Z.pond, HED, 11, 0.5);
    if (!snow) for (let i = 0; i < 120; i++) { const u = 9.6 + H(i, 11) * 30.8, v = 7.6 + H(11, i) * 23.8; if (o.busy && o.busy(u, v)) continue; if (i % 4 === 0) m.flower(u, v, 0, 1.4 + H(i, 3) * 1.4, FLOW[i % 5], i); else m.tuft(u, v, 0, 1.2 + H(i, 5) * 1.4, 4, sea === 'autumn' ? '#a8a050' : '#5aa64e', i); }
    for (const [u, v, z] of [[29, 16.2, Z.terr], [35.6, 16.4, Z.terr], [26.2, 18.6, Z.terr], [8.2, 20, Z.porch], [42, 12.8, Z.east]]) { m.pot(u, v, z, 0.5, '#c8705a'); m.foliage(u, v, z + 3.4, 0.7, 1.6, LEAF, 16, u, 0.55); }
    K.LAMPS.forEach(([u, v, lv], i) => lamp(m, u, v, lv === 2 ? Z.east : 0, PICK.lamp + i));
    (o.deco || []).forEach((id, i) => { if (id && K.SLOTS[i]) deco(m, id, K.SLOTS[i][0], K.SLOTS[i][1], i === 1 ? Z.porch : i === 4 ? Z.east : 0, PICK.deco + i); });
    return m;
  }

  // ---------- 室内公用：剖开的房间（远处两面墙是完整的，近处两面只留矮墙 + 门框 + 窗框，位置和外面一一对应）----------
  function shell(m, U1, V1, hgt, floor, fmat, wall, wmat) {
    m.box(R0 - 0.6, R0 - 0.6, -3, U1 + 0.4, V1 + 0.4, 0, '#7a5a40', M.plank, floor, fmat);
    if (wall) { m.box(R0 - 0.6, R0 - 0.6, 0, U1, R0, hgt, wall, wmat); m.box(R0 - 0.6, R0, 0, R0, V1, hgt, wall, wmat); }
    m.box(R0, V1, 0, U1 + 0.4, V1 + 0.4, 1.4, '#9a8a78', M.stone); m.box(U1, R0, 0, U1 + 0.4, V1, 1.4, '#9a8a78', M.stone);
  }
  const ghost = (m, face, c, hw, z0, z1, w) => { const B = (a0, a1, zz0, zz1) => (face === 'v' ? m.box(a0, w, zz0, a1, w + 0.3, zz1, TIMBER, 2) : m.box(w, a0, zz0, w + 0.3, a1, zz1, TIMBER, 2)); B(c - hw, c - hw + 0.3, 1.4, z1); B(c + hw - 0.3, c + hw, 1.4, z1); B(c - hw, c + hw, z1 - 0.3, z1); B(c - hw, c + hw, z0, z0 + 0.3); };
  function exitDoor(m, u, V1, hgt = 20) { m.pk(PICK.exit); m.box(u - 2.9, V1, 0, u - 2.4, V1 + 0.4, hgt, TIMBER, 2); m.box(u + 2.4, V1, 0, u + 2.9, V1 + 0.4, hgt, TIMBER, 2); m.box(u - 2.9, V1, hgt, u + 2.9, V1 + 0.4, hgt + 0.9, TIMBER, 2); m.box(u - 2.4, V1 + 0.3, 0, u + 2.4, V1 + 2.6, 0.3, '#c8a878', M.cloth); m.pk(0); }

  function room(o) {
    const m = new Mesh(), S = HOUSE, rm = o.room || {}, U1 = HU1, V1 = HV1, LZ = K.LOFT, WH = K.WALLH, uu = (t) => iu(S, t), vv = (t) => iv(S, t);
    shell(m, U1, V1, WH, '#c8a070', M.plank, '#f0dcc0', M.wallpaper);
    m.box(R0 - 0.2, R0 - 0.05, LZ - 1, U1, R0 + 0.25, LZ + 0.6, TIMBER, 2); m.box(R0 - 0.05, R0, LZ - 1, R0 + 0.25, V1, LZ + 0.6, TIMBER, 2);
    // 远墙的窗（和外面背面的窗一样多）
    m.pk(PICK.win);
    S.bv.forEach((t) => m.win('v', uu(t) - 2.3, uu(t) + 2.3, 10.4, 20.8, R0, { out: 0.3 })); S.bv2.forEach((t) => m.win('v', uu(t) - 2.1, uu(t) + 2.1, LZ + 6.8, LZ + 16.6, R0, { out: 0.3 }));
    S.bu.forEach((t) => m.win('u', vv(t) - 2.3, vv(t) + 2.3, 12, 21, R0, { out: 0.3 })); S.bu2.forEach((t) => m.win('u', vv(t) - 2.1, vv(t) + 2.1, LZ + 6.8, LZ + 16.6, R0, { out: 0.3 }));
    m.pk(0);
    // 近处：门框 + 窗框（= 外面正面看到的那扇门、那几扇窗）
    exitDoor(m, K.RDOOR.u, V1); S.fv.forEach((t) => ghost(m, 'v', uu(t), 2.3, 10.4, 20.8, V1)); S.fu.forEach((t) => ghost(m, 'u', vv(t), 2.3, 10.4, 20.8, U1));
    // 壁炉（= 外面烟囱的位置）
    const fu = uu(S.fire);
    m.pk(PICK.fireplace); m.box(fu - 5, R0, 0, fu + 5, R0 + 3, 15, BRICK, M.stone); m.box(fu - 3, R0 + 2.6, 0, fu + 3, R0 + 3.1, 9, '#2a2026', 0); m.box(fu - 5.6, R0, 15, fu + 5.6, R0 + 3.6, 16.4, TIMBER, 2); m.box(fu - 3.4, R0, 16.4, fu + 3.4, R0 + 2.2, WH, BRICK, M.stone); m.box(fu - 2, R0 + 3.2, 0, fu + 2, R0 + 3.6, 1, '#5a3a28', 2); m.pk(0);
    m.pot(fu - 4, R0 + 1.8, 16.4, 0.5, '#5a7ab0'); m.foliage(fu - 4, R0 + 1.8, 20, 0.7, 1.5, ['#5aa64e', '#86cc6a'], 12, 3, 0.5); m.box(fu + 2.6, R0 + 1.2, 16.4, fu + 4.6, R0 + 1.5, 20, '#c8935e', 0);
    // 厨房：远墙右边（灶台、水槽、吊着的锅）
    const ku = uu(0.85);
    m.pk(PICK.kitchen); m.box(ku - 5.4, R0, 0, U1 - 0.4, R0 + 3, 7.4, '#d8c4a0', M.plank, '#e8dcc8', 0); m.box(ku + 1.4, R0 + 0.4, 7.4, ku + 4.2, R0 + 2.6, 8, '#3a3448', M.metal); m.cyl(ku + 2.8, R0 + 1.5, 8, 9.6, 0.9, 0.9, COPPER, M.metal, 9); m.box(ku - 4.6, R0 + 0.5, 7.4, ku - 1.6, R0 + 2.5, 7.7, '#9fd4f2', M.glass);
    m.box(ku - 5.4, R0, 23.4, U1 - 0.4, R0 + 1.4, 24.2, TIMBER, 2); for (let i = 0; i < 4; i++) m.cyl(ku - 4.4 + i * 2.4, R0 + 0.9, 24.2, 26.2, 0.6, 0.6, [COPPER, '#e8dcc8', '#7fc8a8', '#e0604a'][i], 0, 7); m.pk(0);
    // 挂钟、落地灯
    m.pk(PICK.clock); m.disc(uu(0.48), R0 + 0.3, 21, 1.5, 'v', '#f8f0dc', 0, 12); m.disc(uu(0.48), R0 + 0.2, 21, 1.8, 'v', TIMBER, 0, 12); m.box(uu(0.48) - 0.1, R0 + 0.32, 21, uu(0.48) + 0.1, R0 + 0.4, 24, '#2a2026', 0); m.pk(0);
    m.pk(PICK.flamp); m.cyl(14, 27.6, 0, 13, 0.2, 0.14, '#5a5466', M.metal, 5); m.cyl(14, 27.6, 12.4, 16, 1.4, 0.8, '#ffe9a8', M.glow, 9); m.pk(0);
    // 扶手椅（壁炉前）
    m.pk(PICK.chair); m.box(27, 11, 0, 31.4, 15, 3.6, '#c86a5a', M.cloth); m.box(27, 11, 3.6, 31.4, 12, 9.4, '#b85a4c', M.cloth); m.box(27, 11, 3.6, 27.8, 15, 6, '#b85a4c', M.cloth); m.box(30.6, 11, 3.6, 31.4, 15, 6, '#b85a4c', M.cloth); m.pk(0);
    // 阁楼（只盖住左后角，= 二层的一部分）+ 沿左墙的楼梯
    m.box(R0, R0, LZ - 1.6, 22, 18, LZ, '#a8784a', M.plank, '#c8a070', M.plank); posts(m, [[21.6, 17.6]], 0, LZ - 1.6, TIMBER, 0.3);
    m.rail(22, R0 + 0.3, 22, 18, LZ, 4.6); m.rail(8, 18, 22, 18, LZ, 4.6);
    m.stairs(30, 18, R0 + 0.4, 7.6, 0, LZ, 'v', WOOD, 12, true); m.quad([7.6, 30, 4], [7.6, 30, 4.6], [7.6, 18, LZ + 4.6], [7.6, 18, LZ + 4], WOOD2, 2);
    // 阁楼上：床、书桌、箱子、盆栽
    m.pk(PICK.bed); m.box(11, 5, LZ, 20.5, 10.6, LZ + 2.6, '#a8784a', M.plank); m.box(11.3, 5.3, LZ + 2.6, 20.2, 10.3, LZ + 4.2, rm.bed ? '#f2c6d2' : '#e8dcc8', M.cloth); m.box(11.3, 5.3, LZ + 4.2, 14, 10.3, LZ + 5.2, '#fff6ea', M.cloth); m.box(10.6, 5, LZ, 11, 10.6, LZ + 8, '#8a5a3a', M.plank); if (rm.bed) m.box(15, 5.3, LZ + 4.2, 20.2, 10.3, LZ + 4.8, '#e88aa0', M.cloth); m.pk(0);
    m.pk(PICK.desk); m.box(5, 4.6, LZ + 5.4, 10, 7.6, LZ + 6.2, '#b88a5a', M.plank); posts(m, [[5.3, 7.3], [9.7, 7.3]], LZ, 5.4, '#8a5a3a', 0.2); m.box(6, 5, LZ + 6.2, 8, 6.6, LZ + 6.5, '#f8f4ec', 0); m.cyl(9.2, 5.4, LZ + 6.2, LZ + 9, 0.3, 0.6, '#7fc8a8', M.glow, 7); m.pk(0);
    m.pk(PICK.trunk); m.box(17.4, 14, LZ, 20.8, 16.4, LZ + 2.8, '#8a5a3a', M.plank); m.box(17.3, 13.9, LZ + 2.8, 20.9, 16.5, LZ + 3.4, COPPER, M.metal); m.pk(0);
    m.pk(PICK.pot); m.pot(5.6, 15.6, LZ, 0.8, '#c8705a'); m.foliage(5.6, 15.6, LZ + 6, 1.3, 3, ['#4c9a48', '#6fbf5a', '#86cc6a'], 34, 9, 0.8); m.pk(0);
    // 阁楼底下：储物角
    m.box(R0 + 0.2, R0 + 0.2, 0, 10, 6.6, 12, '#a8784a', M.plank); for (let i = 0; i < 3; i++) m.box(R0 + 0.6, 6.6, 1 + i * 3.8, 9.6, 6.75, 4 + i * 3.8, ['#c85a4a', '#5a8ad8', '#e8c860'][i], M.cloth);
    m.cyl(18, 6.4, 0, 4.4, 1.5, 1.5, '#8a5e3c', M.plank, 10);
    // 买来的家具
    if (rm.rug) { m.pk(PICK.rug); m.cyl(24, 21, 0, 0.25, 5.4, 5.4, '#e8a0b0', M.cloth, 16); m.cyl(24, 21, 0.25, 0.3, 3.6, 3.6, '#f8e0c8', M.cloth, 14); m.pk(0); }
    m.pk(PICK.c1);
    if (rm.c1 === 'table') { m.box(9.6, 21, 5.4, 15.6, 25.6, 6.2, '#c8935e', M.plank); posts(m, [[10, 21.4], [15.2, 21.4], [10, 25.2], [15.2, 25.2]], 0, 5.4, '#8a5a3a', 0.2); m.cyl(12.6, 23.2, 6.2, 7.6, 0.5, 0.5, '#f8f4ec', 0, 7); }
    else if (rm.c1 === 'lamp') { m.cyl(11, 23, 0, 12, 0.2, 0.14, '#5a5466', M.metal, 5); m.cyl(11, 23, 11.4, 15, 1.3, 0.8, '#ffe9a8', M.glow, 9); }
    m.pk(PICK.c2);
    if (rm.c2 === 'plant') { m.pot(34.4, 15.4, 0, 1, '#5a7ab0'); m.foliage(34.4, 15.4, 7.4, 1.6, 3.6, ['#3f8a44', '#5aa64e', '#86cc6a'], 40, 8, 0.9); }
    else if (rm.c2 === 'shelf') { m.box(32.6, R0 + 3.2, 0, 37, R0 + 5.4, 15, '#a8784a', M.plank); for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) m.box(33 + j * 0.76, R0 + 5.4, 1.4 + i * 4.6, 33.6 + j * 0.76, R0 + 5.56, 4.6 + i * 4.6, ['#c85a4a', '#5a8ad8', '#e8c860', '#7fc8a8', '#c8a0f0'][(i + j) % 5], 0); }
    m.pk(PICK.c3);
    if (rm.c3 === 'piano') { m.box(27, 24, 0, 35, 26.8, 10.4, '#5a3428', M.plank); m.box(27.4, 26.8, 5.6, 34.6, 28.2, 6.4, '#f8f4ec', M.cloth); m.box(29.6, 28.8, 0, 32.4, 30.4, 3.4, '#7a4a38', M.plank); }
    else if (rm.c3 === 'rocker') { m.box(29, 25, 2.8, 32.6, 28.2, 3.6, '#c8935e', M.plank); m.box(29, 25, 3.6, 29.8, 28.2, 10, WOOD2, M.plank); for (const v of [25.2, 28]) m.quad([28.4, v, 0.8], [33.4, v, 0.8], [33, v, 0], [28.8, v, 0], '#7a4e30', 2); posts(m, [[29.3, 25.3], [32.3, 25.3], [29.3, 27.9], [32.3, 27.9]], 0.5, 2.4, '#8a5a3a', 0.14); }
    m.pk(0);
    if (rm.wall === 'painting') { m.box(R0 + 0.25, 21, 13, R0 + 0.5, 27, 20, '#c8935e', 0); m.box(R0 + 0.45, 21.6, 13.6, R0 + 0.6, 26.4, 19.4, '#a8d8f6', M.cloth); m.box(R0 + 0.55, 21.6, 13.6, R0 + 0.66, 26.4, 15.8, '#7cbc62', M.grass); }
    return m;
  }

  function green(o) {
    const m = new Mesh(), G = GH, U1 = GU1, V1 = GV1, hgt = G.h * SC, rf = G.roof * SC, mid = (R0 + V1) / 2;
    shell(m, U1, V1, 0, '#b8b0a0', M.stone);
    // 远处两面玻璃墙：砖脚 + 窗格（格数 = 外面看到的格数）
    m.box(R0 - 0.5, R0 - 0.5, 0, U1, R0, 3.1, BRICK, M.stone); m.box(R0 - 0.5, R0, 0, R0, V1, 3.1, BRICK, M.stone);
    m.box(R0 - 0.3, R0 - 0.3, 3.1, U1, R0 - 0.1, hgt, '#cfeaf6', M.glass); m.box(R0 - 0.3, R0 - 0.1, 3.1, R0 - 0.1, V1, hgt, '#cfeaf6', M.glass);
    m.tri([R0 - 0.2, R0, hgt], [R0 - 0.2, V1, hgt], [R0 - 0.2, mid, hgt + rf], '#cfeaf6', M.glass);
    for (let i = 0; i <= G.nv; i++) { const u = R0 + (U1 - R0) * i / G.nv; m.box(u - 0.2, R0 - 0.1, 3.1, u + 0.2, R0 + 0.15, hgt, '#f4f0e6', 0); m.quad([u - 0.14, R0, hgt], [u + 0.14, R0, hgt], [u + 0.14, mid, hgt + rf], [u - 0.14, mid, hgt + rf], '#f4f0e6', 0); }
    for (let i = 0; i <= G.nu; i++) { const v = R0 + (V1 - R0) * i / G.nu; m.box(R0 - 0.1, v - 0.2, 3.1, R0 + 0.15, v + 0.2, hgt, '#f4f0e6', 0); }
    m.box(R0 - 0.1, R0 - 0.1, hgt - 0.4, U1, R0 + 0.2, hgt, '#f4f0e6', 0); m.box(R0 - 0.1, R0, hgt - 0.4, R0 + 0.2, V1, hgt, '#f4f0e6', 0); m.box(R0, mid - 0.2, hgt + rf - 0.3, U1, mid + 0.2, hgt + rf + 0.2, '#f4f0e6', 0);
    exitDoor(m, K.GRDOOR.u, V1, 14.6); for (let i = 0; i <= G.nu; i++) { const v = R0 + (V1 - R0) * i / G.nu; if (i && i < G.nu) m.box(U1, v - 0.15, 1.4, U1 + 0.3, v + 0.15, 4, '#f4f0e6', 0); }
    // 花架：沿远处两面墙
    m.pk(PICK.bench); m.box(R0 + 3.4, R0 + 0.2, 3.4, U1 - 0.6, R0 + 2.6, 4, WOOD, M.plank); posts(m, [[R0 + 3.6, R0 + 2.4], [U1 - 0.9, R0 + 2.4], [(R0 + U1) / 2, R0 + 2.4]], 0, 3.4, DARK, 0.16); m.box(R0 + 0.2, R0 + 3, 3.4, R0 + 2.6, V1 - 2, 4, WOOD, M.plank); posts(m, [[R0 + 2.4, R0 + 3.2], [R0 + 2.4, V1 - 2.2]], 0, 3.4, DARK, 0.16);
    for (let i = 0; i < 7; i++) { const u = R0 + 4.4 + i * 2.6; m.pot(u, R0 + 1.4, 4, 0.42, i % 2 ? '#c8705a' : '#b8604a'); if (i % 3 === 0) { m.foliage(u, R0 + 1.4, 6.6, 0.7, 1.5, ['#5aa64e', '#86cc6a'], 14, i, 0.5); for (let q = 0; q < 3; q++) m.flower(u + (q - 1) * 0.3, R0 + 1.5, 6, 2.4 + q * 0.5, FLOW[(i + q) % 5], q); } else if (i % 3 === 1) { for (let q = 0; q < 5; q++) m.leaf([u, R0 + 1.4, 6.4], q * 1.26, 1.1, 1.3, q % 2 ? '#5aa64e' : '#3f8a44', 0.8); } else { m.cyl(u, R0 + 1.4, 5.8, 7.4, 0.5, 0.4, '#6aa858', 8, 7); m.leaf([u, R0 + 1.4, 7.8], 0, 1.2, 0.4, '#f2a6c2', 0.3); } }
    for (let i = 0; i < 5; i++) { const v = R0 + 4.2 + i * 2.6; m.box(R0 + 0.5, v - 0.9, 4, R0 + 2.3, v + 0.9, 4.7, '#8a5e3c', M.plank, '#5a4030', M.soil); for (let q = 0; q < 4; q++) m.leaf([R0 + 0.9 + (q % 2) * 0.9, v - 0.4 + (q > 1 ? 0.8 : 0), 5.2], q * 1.6 + i, 0.9, 0.5, q % 2 ? '#86cc6a' : '#5aa64e', 0.8); }
    m.pk(PICK.lemon); m.cyl(20.4, 12, 0, 3, 1.5, 1.8, '#c8705a', 0, 10); m.cyl(20.4, 12, 3, 9, 0.3, 0.22, '#7a5236', 2, 6); m.foliage(20.4, 12, 12, 2.4, 4.6, ['#3f8a44', '#5aa64e', '#4c9a48'], 70, 5, 0.9); for (let i = 0; i < 6; i++) m.blob(20.4 + Math.cos(i * 1.05) * 2, 12 + Math.sin(i * 1.05) * 2, 10 + (i % 3) * 1.6, 0.24, 0.6, '#ffe04a', 0, i, 3, 5); m.pk(0);
    m.pk(PICK.gbarrel); m.cyl(24.6, 18.6, 0, 4.2, 1.3, 1.5, '#7a5a40', M.plank, 10); m.cyl(24.6, 18.6, 3.9, 3.95, 1.36, 1.36, '#4aa8d8', M.water, 10); m.pk(0);
    m.pk(PICK.basket); for (const [u, v, z] of [[10.6, 12.6, 13], [15.4, 8.4, 14.6]]) { m.box(u - 0.04, v - 0.04, z, u + 0.04, v + 0.04, hgt + rf * 0.5, '#d8c8a0', 0); m.cyl(u, v, z - 1.4, z, 0.5, 0.9, '#a8784a', M.cloth, 8); m.foliage(u, v, z + 0.4, 1.1, 1.4, ['#5aa64e', '#86cc6a'], 22, u, 0.6); m.vine([[u - 0.8, v, z], [u + 0.8, v, z]], { seed: u, gap: 0.5, ls: 0.5, drop: 4.5, bloom: '#f2a6c2' }); } m.pk(0);
    m.pk(PICK.sacks); m.blob(8.4, 19.6, 1.3, 1.2, 1.5, '#d8c8a0', M.cloth, 2, 4, 7); m.blob(10.2, 20.4, 1, 1, 1.2, '#c8b890', M.cloth, 3, 4, 7); m.pk(0);
    m.vine([[R0, R0 + 0.3, 3.1], [R0 + 0.3, R0 + 0.3, hgt - 1], [R0 + 6, R0 + 0.3, hgt - 0.4]], { seed: 3, gap: 0.5, ls: 0.6 });
    return m;
  }

  // ---------- 每帧都变的东西 ----------
  function dyn(o) {
    const m = new Mesh(), t = o.t;
    if (o.scene === 'deck') {
      const F = K.FIRE, P = K.POND, cz = -27 + Math.sin(t * 1.3) * 1.2;
      m.cyl(24.5, 19.5, cz, cz + 3.6, 1.6, 0.01, '#bff0ff', M.glow, 6); m.cyl(24.5, 19.5, cz - 3.6, cz, 0.01, 1.6, '#8fe0ff', M.glow, 6);
      for (let i = 0; i < 5; i++) { const h = 1.6 + Math.sin(t * 9 + i * 2.1) * 0.7 + (o.cooking ? 1 : 0); m.cyl(F.u + Math.cos(i * 1.3) * 0.45, F.v + Math.sin(i * 1.3) * 0.45, K.Z.east + 0.7, K.Z.east + 0.7 + h * 1.8, 0.34, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); }
      // 塘里的鱼：水面下游来游去的影子
      for (let i = 0; i < 4; i++) { const a = t * (0.35 + i * 0.08) + i * 1.7, cu = (P.u0 + P.u1) / 2 + Math.cos(a) * (2.8 - i * 0.3), cv = (P.v0 + P.v1) / 2 + Math.sin(a * 1.3) * 2.2, d = [-Math.sin(a) * (2.8 - i * 0.3), Math.cos(a * 1.3) * 1.3 * 2.2], l = Math.hypot(d[0], d[1]) || 1, du = d[0] / l, dv = d[1] / l, wg = Math.sin(t * 7 + i) * 0.18, col = i === 1 ? '#f08a5a' : i === 3 ? '#f8f0e0' : '#2a5a78';
        m.quad([cu + du * 0.7, cv + dv * 0.7, P.z + 0.03], [cu - dv * 0.22, cv + du * 0.22, P.z + 0.03], [cu - du * 0.5, cv - dv * 0.5, P.z + 0.03], [cu + dv * 0.22, cv - du * 0.22, P.z + 0.03], col, 0);
        m.tri([cu - du * 0.5, cv - dv * 0.5, P.z + 0.03], [cu - du * 0.95 - dv * (0.25 + wg), cv - dv * 0.95 + du * (0.25 + wg), P.z + 0.03], [cu - du * 0.95 + dv * (0.25 - wg), cv - dv * 0.95 - du * (0.25 - wg), P.z + 0.03], col, 0); }
    } else if (o.scene === 'house') {
      const fu = iu(HOUSE, HOUSE.fire);
      for (let i = 0; i < 6; i++) { const h = 2.2 + Math.sin(t * 9 + i * 2.1) + (o.cooking ? 1.2 : 0); m.cyl(fu - 1.6 + i * 0.64, R0 + 3.3, 1, 1 + h * 1.9, 0.5, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); }
    }
    return m;
  }
  PP.isleModels = { K, deck, room, green, dyn };
})();
