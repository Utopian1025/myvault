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
  const GH = { u0: 27, u1: 36, v0: 7.5, v1: 14.5, z: 4.4, h: 7, roof: 4, door: 0.5, nv: 5, nu: 4 };
  const iu = (S, t) => R0 + t * (S.u1 - S.u0) * SC, iv = (S, t) => R0 + t * (S.v1 - S.v0) * SC;
  const HU1 = iu(HOUSE, 1), HV1 = iv(HOUSE, 1), GU1 = iu(GH, 1), GV1 = iv(GH, 1);
  const PICK = { door: 1, green: 2, mail: 3, barrel: 4, balloon: 6, fish: 8, tree: 9, lamp: 10, plot: 20, deco: 30, exit: 40, kitchen: 51, bed: 57, chair: 58, piano: 64, gbarrel: 71, bench: 74 };

  // ---------- 地形：一块长满草的浮岛，有两座小山丘、山上的泉眼、弯弯的小河、天然的水塘，水从岛边落下去 ----------
  const CEN = [24, 23];
  const rimR = (t) => 23.2 + 1.5 * Math.sin(3 * t + 0.7) + 1.0 * Math.sin(5 * t + 2.1) + 0.6 * Math.sin(7 * t);
  const rimAt = (u, v) => rimR(Math.atan2(v - CEN[1], u - CEN[0]));
  const inIsle = (u, v, m = 0.6) => Math.hypot(u - CEN[0], v - CEN[1]) < rimAt(u, v) - m;
  const gs = (du, dv, r) => Math.exp(-(du * du + dv * dv) / (r * r));
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const RIVER = [[7, 8.6], [6.3, 12.6], [6.5, 17.2], [8.2, 22], [10.4, 27.2], [13.4, 31.6], [16.2, 35.4]];
  const OUTLET = [[21.6, 42.4], [22.4, 44.6], [22.8, 47.2]];
  const POND = { cu: 19, cv: 38.7, ru: 5.6, rv: 4.4, u0: 13.4, u1: 24.6, v0: 34.3, v1: 43.1, z: -0.7 };
  const pondR = (u, v) => { const a = Math.atan2(v - POND.cv, u - POND.cu); return 1 + 0.12 * Math.sin(3 * a + 1) + 0.08 * Math.sin(5 * a); };
  const pondD = (u, v) => Math.hypot((u - POND.cu) / POND.ru, (v - POND.cv) / POND.rv) / pondR(u, v); // <1 在塘里
  const segD = (u, v, pts) => { let best = 1e9, bt = 0; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy, t = Math.max(0, Math.min(1, ((u - ax) * vx + (v - ay) * vy) / l2)), d = Math.hypot(u - ax - vx * t, v - ay - vy * t); if (d < best) { best = d; bt = i + t; } } return [best, bt / (pts.length - 1)]; };
  const riverD = (u, v) => segD(u, v, RIVER)[0];
  const BRIDGE = { u0: 7.2, u1: 11.8, v0: 24.4, v1: 26, z: 0.8 };
  const onBridge = (u, v) => u >= BRIDGE.u0 && u <= BRIDGE.u1 && v >= BRIDGE.v0 && v <= BRIDGE.v1;
  const SPRING = { u: 7, v: 8.6 };
  function hills(u, v) { return 7.6 * gs(u - 6, v - 8, 6.8) + 4.8 * gs(u - 36, v - 7, 7.5) + 1.5 * gs(u - 37, v - 33, 5.5) + 1.3 * gs(u - 22, v - 4, 5) + 0.7 * gs(u - 4, v - 30, 4); }
  const FLAT = [[11, 8, 26, 21, 0.25], [26, 6.5, 37, 15.5, GH.z], [25.5, 26, 40.5, 36, 0.35], [26.6, 19.6, 30.4, 23.4, 0.4]];
  function flatW(u, v, f) { const dx = Math.max(f[0] - u, 0, u - f[2]), dy = Math.max(f[1] - v, 0, v - f[3]); return 1 - sstep(0, 2.4, Math.hypot(dx, dy)); }
  function terrain(u, v) {
    let h = hills(u, v);
    for (const f of FLAT) { const w = flatW(u, v, f); if (w > 0) h = h + (f[4] - h) * w; }
    const rr = Math.hypot(u - CEN[0], v - CEN[1]) / rimAt(u, v); h -= 0.9 * sstep(0.82, 1.0, rr); // 岛边圆圆地往下收
    const pd = pondD(u, v); if (pd < 1.35) h = h + (POND.z - 1.6 - h) * (1 - sstep(0.75, 1.35, pd)); // 塘底
    const rd = riverD(u, v); if (rd < 1.4) h -= 0.85 * (1 - sstep(0.5, 1.4, rd)); // 河床
    const od = segD(u, v, OUTLET)[0]; if (od < 1.2) h -= 0.7 * (1 - sstep(0.4, 1.2, od));
    return h;
  }
  const waterAt = (u, v) => pondD(u, v) < 1 || riverD(u, v) < 0.8 || segD(u, v, OUTLET)[0] < 0.7 || Math.hypot(u - SPRING.u, v - SPRING.v) < 1.4;
  const zAt = (u, v) => (onBridge(u, v) ? BRIDGE.z + 0.35 * Math.sin(((u - BRIDGE.u0) / (BRIDGE.u1 - BRIDGE.u0)) * Math.PI) : terrain(u, v));
  const walkable = (u, v) => inIsle(u, v, 1.1) && (onBridge(u, v) || !waterAt(u, v)) && pondD(u, v) > 1.12;
  // 石板小路：从门口分出去
  const PATHS = [[[17.5, 21.2], [19, 24.6], [22.4, 27.6], [26.4, 29.6]], [[19, 24.6], [18.6, 29.6], [19, 32.6]], [[22.4, 27.6], [26.2, 25.4], [30.6, 21], [31.5, 15.6]], [[17.5, 21.2], [13.4, 23.6], [11.8, 25.2]], [[7.2, 25.2], [5.2, 26.6]], [[31.5, 17], [36.6, 15.6], [40, 14.6]]];
  const pathD = (u, v) => Math.min(...PATHS.map((p) => segD(u, v, p)[0]));
  const T = { CEN, rimR, rimAt, inIsle, terrain, zAt, walkable, waterAt, pondD, riverD, RIVER, OUTLET, BRIDGE, onBridge, SPRING, PATHS, pathD };

  const K = {
    IW: 150, IH: 124, ORG: { deck: [72, 30], house: [70, 45], gh: [67, 45] }, SC, R0, HOUSE, GH, PICK, HU1, HV1, GU1, GV1, LOFT: 28, WALLH: 52, T,
    Z: { yard: 0 },
    DOOR: { u: 12 + 0.42 * 13, v: 20 }, GDOOR: { u: 31.5, v: 14.5 }, TREE: { u: 40.5, v: 23 }, TANK: { u: 28.5, v: 21.5 }, MAILB: { u: 20.8, v: 22.8 }, BALLOON: { u: 41, v: 13.5 },
    POND, FISH: { u: 19, v: 33.4 }, BOB: { u: 19.4, v: 38.8 },
    PLOTS: [[27, 27], [31.2, 27], [35.4, 27], [27, 31.6], [31.2, 31.6], [35.4, 31.6]], PS: 3.6, PH: [1.1, 1.4, 1.0, 1.2, 0.9, 1.3],
    SLOTS: [[15, 24.8], [4.8, 26.6], [23.4, 31.4], [34.4, 23.4], [41, 18.6], [11.6, 31]], LAMPS: [[21.6, 31.6, 0], [12.6, 22.8, 0], [36.6, 17.2, 0]],
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

  // ---------- 室外：长满草的浮岛 ----------
  function deck(o) {
    const m = new Mesh(), sea = o.season, snow = o.snow, Tt = K.T, tz = Tt.terrain;
    const LEAF = sea === 'autumn' ? ['#e0a040', '#d8702a', '#c85a2a', '#e8c050'] : sea === 'winter' ? ['#6a8a70', '#7a9a80', '#8aa890'] : sea === 'spring' ? ['#7cc860', '#a0dc78', '#f2b6d0', '#5aa64e'] : ['#4c9a48', '#6fbf5a', '#3f8a44', '#86cc6a'];
    const IVY = sea === 'autumn' ? ['#c8502a', '#e08a3a', '#a83a2a'] : sea === 'winter' ? ['#5a7a5a', '#6a8a68'] : ['#3f8a44', '#5aa64e', '#2f7a3a'];
    const HED = sea === 'winter' ? ['#5a8262', '#6a9070', '#e8f0f4'] : sea === 'autumn' ? ['#8aa04a', '#b8a040', '#6a9048'] : ['#3f8a44', '#58a850', '#4c9a48'];
    const GRC = snow ? ['#eef4fa', '#e2ecf6'] : sea === 'autumn' ? ['#b8b060', '#a8a050'] : sea === 'spring' ? ['#86c866', '#7cbc62'] : ['#76b85c', '#6aac52'], GM = snow ? M.snow : M.grass;
    const ROOF = snow ? '#e4ecf4' : '#b8503c', ROOF2 = snow ? '#dce6f0' : '#5a7a8a', RM = snow ? M.snow : M.tile, bloom = sea === 'spring' || sea === 'summer' ? '#c8a0f0' : null;
    const SOIL = ['#6a4a34', '#7a5a3e', '#5a3e2c'], ROCK = ['#8a8478', '#a8a296', '#76706a'];
    // —— 地面：从中心一圈圈往外的网格，顶点高度 = 地形 ——
    const NR = 26, NA = 132, P0 = (i, j) => { const a = (j / NA) * 6.2832, r = (i / NR) * (rimR(a) - 0.35); const u = CEN[0] + Math.cos(a) * r, v = CEN[1] + Math.sin(a) * r; return [u, v, tz(u, v)]; };
    const grid = []; for (let i = 0; i <= NR; i++) { grid.push([]); for (let j = 0; j <= NA; j++) grid[i].push(P0(i, j % NA)); }
    const colAt = (u, v, z) => {
      if (Tt.pondD(u, v) < 1.2 || Tt.riverD(u, v) < 1.05) return [snow ? '#c8d4e0' : '#8a7a5a', 0]; // 岸边的泥和石子
      if (Tt.pathD(u, v) < 0.8) return [snow ? '#e6eef6' : '#b89a6a', snow ? M.snow : 0];
      const k = (Math.sin(u * 0.7 + v * 0.3) + Math.sin(u * 0.23 - v * 0.61)) * 0.25 + 0.5;
      return [k > 0.5 ? GRC[0] : GRC[1], GM];
    };
    for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) {
      const a = grid[i][j], b = grid[i][j + 1], c = grid[i + 1][j + 1], d = grid[i + 1][j], cu = (a[0] + c[0]) / 2, cv = (a[1] + c[1]) / 2, [col, mt] = colAt(cu, cv, 0);
      m.quad(a, b, c, d, col, mt);
    }
    // —— 底座：岩石和泥土往下收成一个尖，树根垂下来，里面嵌着一点黄铜管子和舷窗（像飞行城堡的底） ——
    const rim = []; for (let j = 0; j <= NA; j++) rim.push(grid[NR][j % NA]);
    const RINGS = [[1, -1.6, 0], [0.97, -3.6, 1], [0.86, -6.8, 2], [0.66, -10, 2], [0.42, -13, 2], [0.18, -15.6, 2]];
    let prev = rim;
    RINGS.forEach(([k, z, mt], ri) => {
      const ring = []; for (let j = 0; j <= NA; j++) { const a = (j / NA) * 6.2832, jag = Math.sin(j * 1.7) * 0.6 + Math.sin(j * 0.53 + ri) * 1.1, rr = (rimR(a) - 0.35) * k; ring.push([CEN[0] + Math.cos(a) * rr, CEN[1] + Math.sin(a) * rr, z - (ri > 1 ? jag : jag * 0.3)]); }
      for (let j = 0; j < NA; j++) { const col = mt === 0 ? (snow ? '#e8eef6' : GRC[1]) : mt === 1 ? SOIL[j % 3] : ROCK[(j + ri) % 3]; m.quad(prev[j], prev[j + 1], ring[j + 1], ring[j], col, mt === 0 ? GM : mt === 1 ? M.soil : M.stone); }
      prev = ring;
    });
    for (let j = 0; j < NA; j++) m.tri(prev[j], prev[j + 1], [CEN[0] + 1, CEN[1] + 1, -18.5], ROCK[j % 3], M.stone);
    // 几块突出来的岩石
    for (const [a, z, r] of [[0.6, -8, 1.8], [1.5, -6.5, 1.5], [2.4, -9, 2], [3.6, -7, 1.4], [4.6, -10, 1.8], [5.6, -6.8, 1.6]]) { const rr = rimR(a) * 0.82; m.blob(CEN[0] + Math.cos(a) * rr, CEN[1] + Math.sin(a) * rr, z, r, r * 1.6, ROCK[1], M.stone, a * 3, 3, 6); }
    // 垂下来的树根
    for (let i = 0; i < 16; i++) { const a = i * 0.4 + 0.2, rr = rimR(a) - 0.8, u = CEN[0] + Math.cos(a) * rr, v = CEN[1] + Math.sin(a) * rr; m.vine([[u, v, -1.5], [u - Math.cos(a) * 0.4, v - Math.sin(a) * 0.4, -5 - (i % 4) * 1.5]], { cols: ['#6a4a30', '#5a4026'], seed: i + 70, gap: 1.4, ls: 0.35, drop: i % 3 === 0 ? 4 : 0 }); }
    for (let i = 0; i < 10; i++) { const a = i * 0.63 + 0.1, rr = rimR(a) - 0.6; m.vine([[CEN[0] + Math.cos(a) * rr, CEN[1] + Math.sin(a) * rr, -0.4], [CEN[0] + Math.cos(a) * (rr + 0.2), CEN[1] + Math.sin(a) * (rr + 0.2), -2]], { cols: IVY, seed: i + 90, gap: 0.6, ls: 0.6, drop: 5 + (i % 3) * 2, bloom: i % 2 ? bloom : null }); }
    // 黄铜的东西：一圈管子、三个圆舷窗、一根冒汽的排气管、一个小齿轮
    for (let j = 0; j < 30; j++) { const a0 = 0.15 + j * 0.06, a1 = a0 + 0.06, r0 = rimR(a0) * 0.9, r1 = rimR(a1) * 0.9; m.quad([CEN[0] + Math.cos(a0) * r0, CEN[1] + Math.sin(a0) * r0, -5.4], [CEN[0] + Math.cos(a1) * r1, CEN[1] + Math.sin(a1) * r1, -5.4], [CEN[0] + Math.cos(a1) * r1, CEN[1] + Math.sin(a1) * r1, -4.6], [CEN[0] + Math.cos(a0) * r0, CEN[1] + Math.sin(a0) * r0, -4.6], COPPER, M.metal); }
    for (const a of [0.55, 0.85, 1.15]) { const rr = rimR(a) * 0.8; m.disc(CEN[0] + Math.cos(a) * rr + 0.3, CEN[1] + Math.sin(a) * rr + 0.3, -8.4, 0.7, Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? 'u' : 'v', '#ffe9a8', M.glow, 10); }
    { const a = 1.9, rr = rimR(a) * 0.78, u = CEN[0] + Math.cos(a) * rr, v = CEN[1] + Math.sin(a) * rr; m.cyl(u, v, -9, -3, 0.45, 0.45, '#6a6470', M.metal, 7); m.cyl(u, v, -10.5, -9, 0.45, 0.8, COPPER, M.metal, 7); K.VENT = [u, v, -10.5]; }
    { const a = 0.3, rr = rimR(a) * 0.86, u = CEN[0] + Math.cos(a) * rr, v = CEN[1] + Math.sin(a) * rr; m.cyl(u, v, -7.6, -7.2, 1.6, 1.6, COPPER, M.metal, 12); for (let i = 0; i < 10; i++) { const b = i * 0.628; m.box(u + Math.cos(b) * 1.6 - 0.2, v + Math.sin(b) * 1.6 - 0.2, -7.7, u + Math.cos(b) * 1.6 + 0.2, v + Math.sin(b) * 1.6 + 0.2, -7.1, COPPER, M.metal); } }

    // —— 水：泉眼、小河、水塘、出水口和岛边落下去的瀑布 ——
    const WC = snow ? '#cfe2f0' : '#4aa8d8', WM = snow ? M.snow : M.water;
    { const S = Tt.SPRING, z0 = tz(S.u, S.v) + 0.55; m.pk(0); m.cyl(S.u, S.v, z0 - 0.02, z0, 1.5, 1.5, WC, WM, 14); for (let i = 0; i < 9; i++) { const a = i * 0.7; m.blob(S.u + Math.cos(a) * 1.7, S.v + Math.sin(a) * 1.7, z0 + 0.1, 0.5 + (i % 3) * 0.15, 0.8, ROCK[i % 3], M.stone, i, 3, 6); } }
    const ribbon = (pts, w0, w1, lift) => { // 沿着折线铺一条水面
      const N2 = 40, P = (t) => { const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; };
      let L0 = null, R0_ = null;
      for (let s2 = 0; s2 <= N2; s2++) { const t = s2 / N2, [u, v] = P(t), [u2, v2] = P(Math.min(1, t + 0.02)), [u1, v1] = P(Math.max(0, t - 0.02)), du = u2 - u1, dv = v2 - v1, l = Math.hypot(du, dv) || 1, w = w0 + (w1 - w0) * t, nu = -dv / l * w, nv = du / l * w, z = Math.max(K.POND.z, tz(u, v) + lift);
        const Lp = [u + nu, v + nv, z], Rp = [u - nu, v - nv, z]; if (L0) m.quad(L0, R0_, Rp, Lp, WC, WM); L0 = Lp; R0_ = Rp; }
    };
    m.pk(PICK.fish);
    ribbon(Tt.RIVER, 0.7, 0.95, 0.55);
    { // 水塘：不规则的一汪水
      const n = 40, P = K.POND, pts = []; for (let i = 0; i <= n; i++) { const a = (i / n) * 6.2832, k = 1 + 0.12 * Math.sin(3 * a + 1) + 0.08 * Math.sin(5 * a); pts.push([P.cu + Math.cos(a) * P.ru * k, P.cv + Math.sin(a) * P.rv * k, P.z]); }
      for (let i = 0; i < n; i++) m.tri([P.cu, P.cv, P.z], pts[i], pts[i + 1], WC, WM);
    }
    m.pk(0);
    ribbon(Tt.OUTLET, 0.6, 0.7, 0.4);
    { const [u, v] = Tt.OUTLET[Tt.OUTLET.length - 1], z0 = tz(u, v) + 0.3; m.quad([u - 0.7, v, z0], [u + 0.7, v, z0], [u + 0.7, v + 0.3, -16], [u - 0.7, v + 0.3, -16], snow ? '#dcecf6' : '#9adcf6', WM); K.FALL = [u, v + 0.3, -16]; }
    // 岸边：石头、芦苇、荷叶；塘边的小木栈台（钓鱼的地方）
    for (let i = 0; i < 22; i++) { const a = i * 0.29 + 0.1, P = K.POND, k = 1.1 + 0.12 * Math.sin(3 * a + 1), u = P.cu + Math.cos(a) * P.ru * k, v = P.cv + Math.sin(a) * P.rv * k; if (Math.abs(u - 19) < 2 && v < 36) continue; if (i % 3 === 0) m.blob(u, v, tz(u, v) + 0.1, 0.5 + (i % 4) * 0.12, 0.7, ROCK[i % 3], M.stone, i, 3, 6); else if (!snow) m.tuft(u, v, tz(u, v), 3.2 + (i % 3), 5, sea === 'autumn' ? '#a89a48' : '#5a9a48', i); }
    if (!snow) for (const [u, v, r] of [[16.4, 39.4, 0.7], [21.6, 40.8, 0.8], [18, 41.6, 0.55], [22.4, 37.6, 0.5], [15.6, 37, 0.6]]) { m.cyl(u, v, K.POND.z + 0.02, K.POND.z + 0.06, r, r, '#5aa64e', 0, 8); if (r > 0.6) m.leaf([u, v, K.POND.z + 0.3], 1, 1.2, 0.4, '#f2a6c2', 0.3); }
    for (let i = 0; i < 8; i++) { const [u, v] = Tt.RIVER[1 + (i % 5)], s = i % 2 ? 1 : -1; if (!snow) m.tuft(u + s * 1.3, v + 0.5, tz(u + s * 1.3, v), 2.6, 4, '#5a9a48', i + 40); else m.blob(u + s * 1.3, v, tz(u + s * 1.3, v), 0.4, 0.5, ROCK[i % 3], M.stone, i, 3, 5); }
    m.box(17.6, 32.6, -0.2, 20.4, 35.8, 0.15, WOOD, M.plank); for (const [u, v] of [[17.8, 35.6], [20.2, 35.6]]) m.cyl(u, v, -1.4, 0.4, 0.18, 0.18, DARK, 2, 5);
    // 小木桥：横跨在小河上
    { const B = Tt.BRIDGE; for (let i = 0; i < 9; i++) { const u0 = B.u0 + (B.u1 - B.u0) * i / 9, u1 = u0 + (B.u1 - B.u0) / 9 - 0.05, z = Tt.zAt((u0 + u1) / 2, (B.v0 + B.v1) / 2); m.box(u0, B.v0, z - 0.25, u1, B.v1, z, i % 2 ? WOOD : WOOD2, M.plank); }
      for (const v of [B.v0, B.v1]) { for (let i = 0; i <= 4; i++) { const u = B.u0 + (B.u1 - B.u0) * i / 4, z = Tt.zAt(u, (B.v0 + B.v1) / 2); m.box(u - 0.1, v - 0.1, z, u + 0.1, v + 0.1, z + 2.2, DARK, 2); } for (let i = 0; i < 8; i++) { const ua = B.u0 + (B.u1 - B.u0) * i / 8, ub = ua + (B.u1 - B.u0) / 8, za = Tt.zAt(ua, B.v0) + 2, zb = Tt.zAt(ub, B.v0) + 2; m.quad([ua, v - 0.08, za], [ub, v - 0.08, zb], [ub, v + 0.08, zb + 0.3], [ua, v + 0.08, za + 0.3], WOOD2, 2); } } }
    // 石板路：一块块扁石头
    for (const path of Tt.PATHS) for (let i = 0; i < path.length - 1; i++) { const [a, b] = [path[i], path[i + 1]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.15); for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, u = a[0] + (b[0] - a[0]) * t + Math.sin(k * 2.3 + i) * 0.18, v = a[1] + (b[1] - a[1]) * t + Math.cos(k * 1.7) * 0.18; if (Tt.onBridge(u, v)) continue; const z = tz(u, v); m.cyl(u, v, z - 0.05, z + 0.12, 0.5 + 0.08 * Math.sin(k * 3.1), 0.48, snow ? '#e4ecf4' : k % 3 ? '#b4aea4' : '#a49e92', M.stone, 7); } }

    // —— 小屋：坐落在坡上，石头地基埋进地里；灰泥一层 + 外挑的木筋二层 + 陡屋顶 ——
    const S = HOUSE, uL = S.u1 - S.u0, vL = S.v1 - S.v0, z0 = 0.25, z1 = z0 + S.h1, z2 = z1 + S.h2;
    m.box(S.u0 - 0.2, S.v0 - 0.2, -1.6, S.u1 + 0.2, S.v1 + 0.2, z0 + 1.6, STONE, M.stone);
    m.box(S.u0, S.v0, z0, S.u1, S.v1, z1, PLAS, M.plaster);
    m.box(S.u0 - 0.4, S.v0 - 0.4, z1, S.u1 + 0.4, S.v1 + 0.4, z2, PLAS2, M.plaster); m.box(S.u0 - 0.5, S.v0 - 0.5, z1 - 0.5, S.u1 + 0.5, S.v1 + 0.5, z1 + 0.5, TIMBER, 2);
    for (const t of [0, 0.33, 0.66, 1]) { const u = S.u0 - 0.3 + t * (uL + 0.6); m.box(u - 0.18, S.v1 + 0.4, z1, u + 0.18, S.v1 + 0.52, z2, TIMBER, 2); } for (const t of [0, 0.5, 1]) { const v = S.v0 - 0.3 + t * (vL + 0.6); m.box(S.u1 + 0.4, v - 0.18, z1, S.u1 + 0.52, v + 0.18, z2, TIMBER, 2); }
    m.quad([S.u0 + 0.3, S.v1 + 0.46, z1 + 0.6], [S.u0 + 0.7, S.v1 + 0.46, z1 + 0.6], [S.u0 + 4.4, S.v1 + 0.46, z2], [S.u0 + 4, S.v1 + 0.46, z2], TIMBER, 2);
    m.gable(S.u0 - 0.4, S.v0 - 0.4, S.u1 + 0.4, S.v1 + 0.4, z2, 9, 'u', ROOF, RM, 0.9, PLAS2, M.plaster);
    { const mid = (S.v0 + S.v1) / 2; m.win('u', mid - 0.7, mid + 0.7, z2 + 2, z2 + 5, S.u1 + 0.4, { arch: 1 }); }
    m.box(16.2, 17.4, z2 + 1.5, 19, 20.6, z2 + 4.6, PLAS2, M.plaster); m.gable(16.2, 17.4, 19, 20.6, z2 + 4.6, 1.8, 'v', ROOF, RM, 0.3, PLAS2, M.plaster); m.win('v', 17, 18.2, z2 + 2.2, z2 + 4, 20.6, {});
    m.box(19.3, 9.4, z2 + 2, 21, 11, z2 + 14, BRICK, M.stone); m.box(19.1, 9.2, z2 + 14, 21.2, 11.2, z2 + 15, STONE2, M.stone); m.cyl(20.15, 10.2, z2 + 15, z2 + 17, 0.5, 0.4, '#3a3448', M.metal, 7); K.CHIMNEY = [20.15, 10.2, z2 + 17];
    const du = K.DOOR.u;
    m.pk(PICK.door); m.box(du - 1.1, S.v1, z0, du + 1.1, S.v1 + 0.22, z0 + 7.6, '#8a5a3a', M.plank); m.box(du - 1.35, S.v1 + 0.05, z0, du - 1.1, S.v1 + 0.34, z0 + 8, TIMBER, 2); m.box(du + 1.1, S.v1 + 0.05, z0, du + 1.35, S.v1 + 0.34, z0 + 8, TIMBER, 2); m.box(du - 1.5, S.v1 + 0.05, z0 + 7.6, du + 1.5, S.v1 + 0.4, z0 + 8.4, TIMBER, 2); m.disc(du, S.v1 + 0.26, z0 + 5.6, 0.36, 'v', '#ffe9a8', M.glass, 8); m.box(du + 0.6, S.v1 + 0.22, z0 + 3.4, du + 0.78, S.v1 + 0.36, z0 + 3.8, '#c8a050', M.metal); m.pk(0);
    m.box(du - 1.6, S.v1, -0.2, du + 1.6, S.v1 + 1.5, z0 + 0.3, STONE, M.stone); m.box(du + 1.6, S.v1 + 0.3, z0 + 6.4, du + 2, S.v1 + 0.7, z0 + 7.6, '#ffe9a8', M.glow);
    m.quad([du - 2, S.v1, z0 + 8.6], [du + 2, S.v1, z0 + 8.6], [du + 2, S.v1 + 1.7, z0 + 7.8], [du - 2, S.v1 + 1.7, z0 + 7.8], ROOF2, RM);
    S.fv.forEach((t) => { const c = S.u0 + t * uL; m.win('v', c - 0.9, c + 0.9, z0 + 4, z0 + 8, S.v1, { shut: '#5a7a8a', box: FLOW[2] }); });
    S.fv2.forEach((t, i) => { const c = S.u0 + t * uL; m.win('v', c - 0.8, c + 0.8, z1 + 2.6, z1 + 6.4, S.v1 + 0.4, { box: i === 1 ? FLOW[0] : null }); });
    S.fu.forEach((t) => { const c = S.v0 + t * vL; m.win('u', c - 0.9, c + 0.9, z0 + 4, z0 + 8, S.u1, { shut: '#5a7a8a' }); });
    S.fu2.forEach((t) => { const c = S.v0 + t * vL; m.win('u', c - 0.8, c + 0.8, z1 + 2.6, z1 + 6.4, S.u1 + 0.4, {}); });
    // 木桶、木箱、柴堆（靠着屋子侧面）
    for (const [u, v, h] of [[25.9, 17.2, 2.4], [26.4, 18.8, 2]]) { m.cyl(u, v, 0, h, 0.7, 0.75, '#8a5e3c', M.plank, 9); m.cyl(u, v, h * 0.3, h * 0.3 + 0.2, 0.78, 0.78, '#4a4652', M.metal, 9); }
    m.box(25.6, 14, 0, 27.2, 15.6, 1.6, '#a8784a', M.plank); for (let i = 0; i < 4; i++) m.box(25.8, 10.4 + i * 0.75, 0, 26.9, 11.05 + i * 0.75, 2.2 - (i % 2) * 0.4, i % 2 ? '#a8784a' : '#8a5e3c', M.plank);
    // 爬藤、屋顶的苔藓
    m.vine([[S.u0 + 0.4, S.v1 + 0.3, z0], [S.u0 + 0.6, S.v1 + 0.5, z0 + 8], [S.u0 + 2.4, S.v1 + 0.6, z0 + 13], [S.u0 + 1.4, S.v1 + 0.6, z2], [S.u0 + 3, S.v1 + 1, z2 + 3]], { cols: IVY, seed: 2, gap: 0.5, ls: 0.6 });
    m.vine([[S.u1 + 0.2, S.v1 - 0.5, z0], [S.u1 + 0.3, S.v1 - 1, z0 + 10], [S.u1 + 0.5, S.v1 - 3, z2 - 2], [S.u1 + 0.5, S.v1 - 1.6, z2 + 1]], { cols: IVY, seed: 5, gap: 0.5, ls: 0.6 });
    m.vine([[S.u0, S.v1 + 0.9, z2 - 0.6], [S.u1, S.v1 + 0.9, z2 - 0.6]], { cols: IVY, seed: 7, gap: 1.1, ls: 0.5, drop: 4, bloom });
    if (!snow) for (let i = 0; i < 26; i++) { const u = S.u0 + H(i, 1) * uL, t = H(1, i), v = S.v1 + 0.9 - t * 5; m.leaf([u, v, z2 - 0.9 + t * 5 * 9 / 6.4 + 0.25], H(i, 2) * 6, 0.15, 0.7, i % 3 ? '#6a9a50' : '#8ab860', 0.2); }

    // —— 玻璃花房：坐在右后方的小山顶上 ——
    const Gh = GH, gz = GH.z;
    m.box(Gh.u0 - 0.4, Gh.v0 - 0.4, gz - 2, Gh.u1 + 0.4, Gh.v1 + 0.4, gz, STONE2, M.stone);
    m.box(Gh.u0, Gh.v0, gz, Gh.u1, Gh.v1, gz + 1.2, BRICK, M.stone);
    m.box(Gh.u0 + 0.1, Gh.v0 + 0.1, gz + 1.2, Gh.u1 - 0.1, Gh.v1 - 0.1, gz + Gh.h, '#7fc0dc', M.glass);
    for (let i = 0; i <= Gh.nv; i++) { const u = Gh.u0 + (Gh.u1 - Gh.u0) * i / Gh.nv; m.box(u - 0.12, Gh.v1 - 0.06, gz + 1.2, u + 0.12, Gh.v1 + 0.1, gz + Gh.h, '#f4f0e6', 0); }
    for (let i = 0; i <= Gh.nu; i++) { const v = Gh.v0 + (Gh.v1 - Gh.v0) * i / Gh.nu; m.box(Gh.u1 - 0.06, v - 0.12, gz + 1.2, Gh.u1 + 0.1, v + 0.12, gz + Gh.h, '#f4f0e6', 0); }
    m.box(Gh.u0, Gh.v1 - 0.06, gz + Gh.h - 0.3, Gh.u1, Gh.v1 + 0.12, gz + Gh.h, '#f4f0e6', 0); m.box(Gh.u1 - 0.06, Gh.v0, gz + Gh.h - 0.3, Gh.u1 + 0.12, Gh.v1, gz + Gh.h, '#f4f0e6', 0);
    m.gable(Gh.u0, Gh.v0, Gh.u1, Gh.v1, gz + Gh.h, Gh.roof, 'u', '#8cc8e0', M.glass, 0.3, '#7fc0dc', M.glass);
    for (let i = 0; i <= Gh.nv; i++) { const u = Gh.u0 + (Gh.u1 - Gh.u0) * i / Gh.nv, mid = (Gh.v0 + Gh.v1) / 2; m.quad([u - 0.08, Gh.v1 + 0.3, gz + Gh.h - 0.1], [u + 0.08, Gh.v1 + 0.3, gz + Gh.h - 0.1], [u + 0.08, mid, gz + Gh.h + Gh.roof + 0.12], [u - 0.08, mid, gz + Gh.h + Gh.roof + 0.12], '#f4f0e6', 0); }
    const gd = K.GDOOR.u;
    m.pk(PICK.green); m.box(gd - 0.85, Gh.v1, gz, gd + 0.85, Gh.v1 + 0.18, gz + 5.6, '#7fc8a8', M.glass); m.box(gd - 1, Gh.v1 + 0.1, gz, gd - 0.85, Gh.v1 + 0.26, gz + 5.9, '#f4f0e6', 0); m.box(gd + 0.85, Gh.v1 + 0.1, gz, gd + 1, Gh.v1 + 0.26, gz + 5.9, '#f4f0e6', 0); m.box(gd - 1, Gh.v1 + 0.1, gz + 5.6, gd + 1, Gh.v1 + 0.26, gz + 5.9, '#f4f0e6', 0); m.pk(0);
    for (let i = 0; i < 6; i++) m.foliage(Gh.u0 + 1 + i * 1.4, Gh.v1 - 0.7, gz + 2.6 + H(i, 4) * 1.5, 0.5, 1.2, LEAF, 8, i + 40, 0.5);
    m.stairs(Gh.v1 + 2.4, Gh.v1 + 0.4, gd - 1.2, gd + 1.2, gz - 1.6, gz, 'v', STONE, 3);
    m.vine([[Gh.u1 + 0.1, Gh.v0, gz], [Gh.u1 + 0.2, Gh.v0 + 2, gz + 5], [Gh.u1 + 0.2, Gh.v1 - 1, gz + Gh.h]], { cols: IVY, seed: 9, gap: 0.45, ls: 0.6 });

    // —— 水井（喝水）、信箱、热气球 ——
    const Tk = K.TANK, wz = tz(Tk.u, Tk.v); m.pk(PICK.barrel);
    m.cyl(Tk.u, Tk.v, wz, wz + 2.4, 1.5, 1.5, STONE, M.stone, 12, false); m.cyl(Tk.u, Tk.v, wz + 2.2, wz + 2.6, 1.6, 1.6, '#b8b2a6', M.stone, 12); m.cyl(Tk.u, Tk.v, wz + 1.6, wz + 1.65, 1.2, 1.2, WC, WM, 12);
    posts(m, [[Tk.u - 1.3, Tk.v], [Tk.u + 1.3, Tk.v]], wz + 2.4, 4.6, DARK, 0.14); m.gable(Tk.u - 1.8, Tk.v - 1, Tk.u + 1.8, Tk.v + 1, wz + 7, 1.8, 'u', ROOF, RM, 0.3);
    m.box(Tk.u - 1.2, Tk.v - 0.08, wz + 5.6, Tk.u + 1.2, Tk.v + 0.08, wz + 5.8, DARK, 2); m.cyl(Tk.u, Tk.v, wz + 3.4, wz + 4.4, 0.45, 0.5, '#8a5e3c', M.plank, 7); m.pk(0);
    const B = K.MAILB, bz = tz(B.u, B.v); m.pk(PICK.mail); m.box(B.u - 0.14, B.v - 0.14, bz, B.u + 0.14, B.v + 0.14, bz + 5, DARK, 2); m.box(B.u - 0.9, B.v - 0.55, bz + 5, B.u + 0.9, B.v + 0.55, bz + 6.9, '#e0604a', 0); m.box(B.u - 0.9, B.v + 0.55, bz + 5.1, B.u + 0.9, B.v + 0.62, bz + 6.6, '#f4e6c8', 0); m.box(B.u + 0.9, B.v - 0.1, bz + 6, B.u + 1, B.v + 0.1, bz + 8.4, '#ffd36a', 0); m.pk(0);
    const BL = K.BALLOON, lz = tz(BL.u, BL.v); m.pk(PICK.balloon); m.box(BL.u - 1, BL.v - 1, lz, BL.u + 1, BL.v + 1, lz + 2.4, '#c89a5a', M.cloth); m.box(BL.u - 1.1, BL.v - 1.1, lz + 2.4, BL.u + 1.1, BL.v + 1.1, lz + 2.8, DARK, 2);
    if (!o.tripping) { for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.quad([BL.u + a - 0.04, BL.v + b, lz + 2.8], [BL.u + a + 0.04, BL.v + b, lz + 2.8], [BL.u + a * 1.6 + 0.04, BL.v + b * 1.6, lz + 9], [BL.u + a * 1.6 - 0.04, BL.v + b * 1.6, lz + 9], '#d8c8a0', 0); m.blob(BL.u, BL.v, lz + 15, 3.2, 8, '#e8705a', M.cloth, 4, 6, 10); m.blob(BL.u, BL.v, lz + 15.4, 3.25, 3, '#ffd36a', M.cloth, 4, 4, 10); }
    m.pk(0);
    K.PLOTZ = K.PLOTS.map(([pu, pv]) => tz(pu + K.PS / 2, pv + K.PS / 2));
    // —— 菜地：一块块围着木框的地 ——
    K.PLOTS.forEach(([pu, pv], i) => {
      const h = K.PH[i] * 0.6, f = o.farm && o.farm[i], s = K.PS, z = K.PLOTZ[i];
      m.pk(PICK.plot + i); m.box(pu, pv, z - 0.6, pu + s, pv + s, z + h, i % 2 ? '#8a5e3c' : '#9a6a44', M.plank, f && f.wet ? '#4a3426' : '#6a4a34', M.soil);
      if (f) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) crop(m, f.crop, f.stage, pu + 0.65 + a * 1.15, pv + 0.65 + b * 1.15, z + h, i * 9 + a * 3 + b);
      m.pk(0);
    });
    for (const [a, b, c, d] of [[26.2, 26.2, 39.6, 26.2], [39.6, 26.2, 39.6, 35.6]]) { const n = Math.round(Math.hypot(c - a, d - b) / 1.6); for (let i = 0; i <= n; i++) { const u = a + (c - a) * i / n, v = b + (d - b) * i / n; m.box(u - 0.12, v - 0.12, tz(u, v), u + 0.12, v + 0.12, tz(u, v) + 2.4, WOOD2, 2); } m.box(Math.min(a, c) - 0.08, Math.min(b, d) - 0.08, tz(a, b) + 1.6, Math.max(a, c) + 0.08, Math.max(b, d) + 0.08, tz(a, b) + 1.85, WOOD, 2); }
    // —— 大树：右边的老橡树，树根爬在地上；树下的蘑菇 ——
    const TR = K.TREE, trz = tz(TR.u, TR.v); m.pk(PICK.tree);
    m.cyl(TR.u, TR.v, trz - 0.5, trz + 5, 1.2, 0.8, '#7a5236', M.plank, 9); m.cyl(TR.u + 0.2, TR.v - 0.1, trz + 5, trz + 12, 0.8, 0.55, '#7a5236', M.plank, 8);
    for (const [du2, dv2, zz, r] of [[1.6, -0.6, 13, 0.4], [-1.2, 1.2, 14, 0.36], [0.4, 1.6, 12, 0.34], [-0.6, -1.6, 15, 0.3]]) m.quad([TR.u + 0.2 - r, TR.v, trz + 9], [TR.u + 0.2 + r, TR.v, trz + 9], [TR.u + du2 * 1.6 + r * 0.5, TR.v + dv2 * 1.6, trz + zz + 4], [TR.u + du2 * 1.6 - r * 0.5, TR.v + dv2 * 1.6, trz + zz + 4], '#6a4630', 2);
    for (const a of [0.4, 1.6, 2.6, 3.8, 5]) m.quad([TR.u + Math.cos(a) * 0.9 - 0.25, TR.v + Math.sin(a) * 0.9, trz + 1.2], [TR.u + Math.cos(a) * 0.9 + 0.25, TR.v + Math.sin(a) * 0.9, trz + 1.2], [TR.u + Math.cos(a) * 2.6 + 0.1, TR.v + Math.sin(a) * 2.6, trz - 0.2], [TR.u + Math.cos(a) * 2.6 - 0.1, TR.v + Math.sin(a) * 2.6, trz - 0.2], '#6a4630', 2);
    if (sea === 'winter') { for (let i = 0; i < 9; i++) m.quad([TR.u + 0.2, TR.v, trz + 12 + i % 3], [TR.u + 0.35, TR.v, trz + 12 + i % 3], [TR.u + Math.cos(i * 0.7) * 3.4, TR.v + Math.sin(i * 0.7) * 3.4, trz + 17 + (i % 4) * 2], [TR.u + Math.cos(i * 0.7) * 3.3, TR.v + Math.sin(i * 0.7) * 3.3, trz + 17 + (i % 4) * 2], '#6a4630', 2); m.foliage(TR.u, TR.v, trz + 19, 3.2, 5, ['#eef4fa', '#dce8f2'], 50, 3, 0.9); }
    else { for (const [a, b, c, r, n] of [[0, 0, 20, 3.4, 170], [2.2, -0.8, 17, 2.4, 110], [-1.8, 1.6, 17.5, 2.3, 110], [0.6, 2.4, 16, 2, 85], [-0.8, -2.2, 18.5, 2.2, 90], [0.4, 0.2, 24.5, 2.1, 85]]) m.foliage(TR.u + a, TR.v + b, trz + c, r, r * 2.1, LEAF, n, a * 7 + b * 3 + c, 0.66); if (sea !== 'spring') for (let i = 0; i < 7; i++) m.blob(TR.u + Math.cos(i * 0.9) * 2.6, TR.v + Math.sin(i * 0.9) * 2.6, trz + 14.5 + (i % 3) * 2, 0.26, 0.62, sea === 'autumn' ? '#e8705a' : '#f2a03a', 0, i, 3, 5); }
    m.pk(0);
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.6, u = TR.u + Math.cos(a) * 2, v = TR.v + Math.sin(a) * 2, z = tz(u, v); m.cyl(u, v, z, z + 0.7 + (i % 2) * 0.4, 0.09, 0.09, '#f4ead8', 0, 4); m.cyl(u, v, z + 0.7 + (i % 2) * 0.4, z + 1.2 + (i % 2) * 0.4, 0.34, 0.06, i % 2 ? '#e0604a' : '#d8a060', 0, 7); }
    // 山上的小树林（泉眼那座山、花房那座山）
    const smallTree = (u, v, s, kind, seed) => { const z = tz(u, v); m.cyl(u, v, z - 0.3, z + 6 * s, 0.38 * s, 0.24 * s, kind === 'birch' ? '#e8e2d6' : '#7a5236', 2, 6); if (kind === 'pine') { for (let i = 0; i < 4; i++) m.cyl(u, v, z + (3 + i * 2.6) * s, z + (7 + i * 2.6) * s, (2.3 - i * 0.45) * s, 0.05, snow ? '#e8f0f6' : ['#2f6a3e', '#3a7a48', '#2a5e38', '#447e50'][i], M.leaf, 9); } else if (sea === 'winter') m.foliage(u, v, z + 9 * s, 1.8 * s, 3 * s, ['#eef4fa', '#dce8f2'], 26, seed, 0.7); else m.foliage(u, v, z + 9 * s, 2 * s, 4 * s, kind === 'blossom' && sea === 'spring' ? ['#f2b6d0', '#f8cce0', '#e8a0c0'] : LEAF, 60, seed, 0.62); };
    for (const [u, v, s, k] of [[3.4, 11, 0.9, 'pine'], [5, 5, 1, 'pine'], [10.4, 4.4, 0.8, 'birch'], [11, 12.8, 0.7, 'blossom'], [2.8, 16, 0.75, 'pine'], [38.2, 4.2, 0.85, 'pine'], [42.4, 8, 0.7, 'birch'], [23.4, 2.6, 0.75, 'blossom'], [4.6, 33, 0.8, 'blossom'], [44, 27.6, 0.65, 'pine']]) if (Tt.inIsle(u, v, 0.8)) smallTree(u, v, s, k, u * 7 + v);
    // 灌木、花丛、草、小石头
    for (const [u, v, r, fl] of [[11.4, 20.4, 0.75, 1], [25.6, 21.4, 0.7, 0], [9.2, 15.4, 0.8, 1], [36.6, 20, 0.7, 1], [42.6, 20.4, 0.6, 0], [26, 38, 0.7, 1], [30.4, 37.4, 0.65, 0], [13.8, 29.4, 0.6, 1], [2.6, 22.4, 0.6, 0], [41, 31.4, 0.7, 1]]) if (Tt.inIsle(u, v, 0.6)) bush(m, u, v, tz(u, v), r, HED, Math.round(u * 3 + v), !snow && fl);
    if (!snow) for (let i = 0; i < 170; i++) { const a = H(i, 11) * 6.283, r = Math.sqrt(H(11, i)) * (rimR(a) - 1.4), u = CEN[0] + Math.cos(a) * r, v = CEN[1] + Math.sin(a) * r; if (!Tt.walkable(u, v) || Tt.pathD(u, v) < 0.9 || (o.busy && o.busy(u, v))) continue; const z = tz(u, v); if (i % 4 === 0) m.flower(u, v, z, 1.3 + H(i, 3) * 1.4, FLOW[i % 5], i); else if (i % 9 === 1) m.blob(u, v, z, 0.3, 0.35, ROCK[i % 3], M.stone, i, 2, 5); else m.tuft(u, v, z, 1.2 + H(i, 5) * 1.4, 4, sea === 'autumn' ? '#a8a050' : '#5aa64e', i); }
    // 野餐垫（桥那边的小草坪上）
    { const pu = 3.6, pv = 27.6, z = tz(pu, pv) + 0.05; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) m.quad([pu + a * 0.7, pv + b * 0.7, z], [pu + a * 0.7 + 0.7, pv + b * 0.7, z], [pu + a * 0.7 + 0.7, pv + b * 0.7 + 0.7, z], [pu + a * 0.7, pv + b * 0.7 + 0.7, z], (a + b) % 2 ? '#e0504a' : '#fff4ec', M.cloth); m.box(pu + 1.8, pv + 0.4, z, pu + 2.8, pv + 1.2, z + 1, '#b88a4a', M.cloth); }
    K.LAMPS.forEach(([u, v], i) => lamp(m, u, v, tz(u, v), PICK.lamp + i));
    // 屋子到大树之间挂一串小灯
    { const a = [S.u1 + 0.4, S.v1 - 1, z1 + 1], b = [TR.u - 0.6, TR.v - 0.4, trz + 11]; for (let i = 0; i <= 14; i++) { const t = i / 14, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - Math.sin(t * Math.PI) * 2.4]; if (i < 14) { const t2 = (i + 1) / 14, q = [a[0] + (b[0] - a[0]) * t2, a[1] + (b[1] - a[1]) * t2, a[2] + (b[2] - a[2]) * t2 - Math.sin(t2 * Math.PI) * 2.4]; m.quad([p[0], p[1], p[2]], [q[0], q[1], q[2]], [q[0], q[1], q[2] - 0.08], [p[0], p[1], p[2] - 0.08], '#3a3040', 0); } if (i % 2) m.blob(p[0], p[1], p[2] - 0.4, 0.22, 0.4, ['#ffd36a', '#ff9a6a', '#a8e0ff'][i % 3], M.glow, i, 3, 5); } }
    (o.deco || []).forEach((id, i) => { if (id && K.SLOTS[i]) deco(m, id, K.SLOTS[i][0], K.SLOTS[i][1], tz(K.SLOTS[i][0], K.SLOTS[i][1]), PICK.deco + i); });
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
    if (rm.rug) { m.cyl(24, 21, 0, 0.25, 5.4, 5.4, '#e8a0b0', M.cloth, 16); m.cyl(24, 21, 0.25, 0.3, 3.6, 3.6, '#f8e0c8', M.cloth, 14); }
    else { m.cyl(22, 21, 0, 0.2, 5, 5, '#c8a0d8', M.cloth, 18); m.cyl(22, 21, 0.2, 0.24, 3.8, 3.8, '#f2dcae', M.cloth, 16); m.cyl(22, 21, 0.24, 0.28, 2.2, 2.2, '#a8c8e8', M.cloth, 14); }
    m.pk(PICK.c1);
    if (rm.c1 === 'table') { m.box(9.6, 21, 5.4, 15.6, 25.6, 6.2, '#c8935e', M.plank); posts(m, [[10, 21.4], [15.2, 21.4], [10, 25.2], [15.2, 25.2]], 0, 5.4, '#8a5a3a', 0.2); m.cyl(12.6, 23.2, 6.2, 7.6, 0.5, 0.5, '#f8f4ec', 0, 7); }
    else if (rm.c1 === 'lamp') { m.cyl(11, 23, 0, 12, 0.2, 0.14, '#5a5466', M.metal, 5); m.cyl(11, 23, 11.4, 15, 1.3, 0.8, '#ffe9a8', M.glow, 9); }
    m.pk(PICK.c2);
    if (rm.c2 === 'plant') { m.pot(34.4, 15.4, 0, 1, '#5a7ab0'); m.foliage(34.4, 15.4, 7.4, 1.6, 3.6, ['#3f8a44', '#5aa64e', '#86cc6a'], 40, 8, 0.9); }
    else if (rm.c2 === 'shelf') { m.box(32.6, R0 + 3.2, 0, 37, R0 + 5.4, 15, '#a8784a', M.plank); for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) m.box(33 + j * 0.76, R0 + 5.4, 1.4 + i * 4.6, 33.6 + j * 0.76, R0 + 5.56, 4.6 + i * 4.6, ['#c85a4a', '#5a8ad8', '#e8c860', '#7fc8a8', '#c8a0f0'][(i + j) % 5], 0); }
    m.pk(!rm.c3 || rm.c3 === 'piano' ? PICK.piano : PICK.chair);
    if (!rm.c3 || rm.c3 === 'piano') { m.box(27, 24, 0, 35, 26.8, 10.4, '#5a3428', M.plank); m.box(27.4, 26.8, 5.6, 34.6, 28.2, 6.4, '#f8f4ec', M.cloth); m.box(29.6, 28.8, 0, 32.4, 30.4, 3.4, '#7a4a38', M.plank); }
    else if (rm.c3 === 'rocker') { m.box(29, 25, 2.8, 32.6, 28.2, 3.6, '#c8935e', M.plank); m.box(29, 25, 3.6, 29.8, 28.2, 10, WOOD2, M.plank); for (const v of [25.2, 28]) m.quad([28.4, v, 0.8], [33.4, v, 0.8], [33, v, 0], [28.8, v, 0], '#7a4e30', 2); posts(m, [[29.3, 25.3], [32.3, 25.3], [29.3, 27.9], [32.3, 27.9]], 0.5, 2.4, '#8a5a3a', 0.14); }
    m.pk(0);
    if (true) { m.box(R0 + 0.25, 21, 13, R0 + 0.5, 27, 20, '#c8935e', 0); m.box(R0 + 0.45, 21.6, 13.6, R0 + 0.6, 26.4, 19.4, '#a8d8f6', M.cloth); m.box(R0 + 0.55, 21.6, 13.6, R0 + 0.66, 26.4, 15.8, '#7cbc62', M.grass); }
    // —— 更多的家当（照着住了很久的小屋摆）——
    // 烤箱：灶台下面一个亮着的小炉门；墙上挂着锅铲和小锅
    m.box(ku + 0.8, R0 + 3, 1, ku + 4.8, R0 + 3.15, 5.6, '#3a3448', M.metal); m.box(ku + 1.4, R0 + 3.1, 2, ku + 4.2, R0 + 3.25, 4.6, '#ffb060', M.glow);
    for (let i = 0; i < 5; i++) { const u = ku - 4.8 + i * 1.5; m.box(u - 0.06, R0 + 0.3, 13, u + 0.06, R0 + 0.4, 17, '#5a5466', M.metal); if (i % 2) m.cyl(u, R0 + 0.8, 11.6, 12.4, 0.9, 0.9, COPPER, M.metal, 8); else m.box(u - 0.4, R0 + 0.3, 12, u + 0.4, R0 + 0.45, 13.2, '#8a8494', M.metal); }
    m.box(ku - 5.4, R0 + 0.1, 17.6, U1 - 0.4, R0 + 0.3, 17.8, TIMBER, 2);
    // 碗柜：右墙（远处）旁边，玻璃门里一摞摞盘子
    { const cu0 = 33.6, cv0 = 17; m.box(cu0, cv0, 0, U1 - 0.2, cv0 + 5, 16, '#a8784a', M.plank); m.box(cu0 - 0.1, cv0 + 0.3, 7, cu0, cv0 + 4.7, 15, '#cfeaf6', M.glass); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m.disc(cu0 - 0.15, cv0 + 1 + j * 1.5, 8.6 + i * 2.4, 0.5, 'u', ['#f8f4ec', '#a8c8e8', '#f2c6d2'][(i + j) % 3], 0, 8); m.box(cu0 - 0.1, cv0 + 0.3, 1, cu0, cv0 + 4.7, 6, '#8a5a3a', M.plank); }
    // 摇椅：壁炉边上
    if (rm.c3 !== 'rocker') { m.pk(PICK.chair); const ru = 19.4, rv = 11.6; m.box(ru, rv, 2.8, ru + 3.4, rv + 3, 3.4, '#c8935e', M.plank); m.box(ru, rv, 3.4, ru + 0.7, rv + 3, 9.4, WOOD2, M.plank); m.box(ru + 0.7, rv + 0.4, 3.4, ru + 3, rv + 2.6, 4, '#e8a0b0', M.cloth); for (const v of [rv + 0.2, rv + 2.8]) m.quad([ru - 0.6, v, 0.8], [ru + 4, v, 0.8], [ru + 3.6, v, 0], [ru - 0.2, v, 0], '#7a4e30', 2); m.pk(0); }
    // 镜子：左墙上一面椭圆的镜子
    m.disc(R0 + 0.32, 9.6, 16, 1.5, 'u', '#c8a050', M.metal, 14); m.disc(R0 + 0.4, 9.6, 16, 1.2, 'u', '#dcecf6', M.glass, 14);
    // 墙上的搁板：书、小盆栽、罐子
    for (const z of [15.6, 21]) { m.box(11, R0, z, 20.4, R0 + 1.6, z + 0.4, TIMBER, 2); for (let i = 0; i < 6; i++) { const u = 11.6 + i * 1.5; if (i % 3 === 0) { m.pot(u, R0 + 0.8, z + 0.4, 0.35, '#c8705a'); m.foliage(u, R0 + 0.8, z + 2.2, 0.55, 1.1, ['#5aa64e', '#86cc6a'], 12, i + z, 0.45); } else if (i % 3 === 1) for (let k = 0; k < 3; k++) m.box(u - 0.6 + k * 0.4, R0 + 0.2, z + 0.4, u - 0.3 + k * 0.4, R0 + 1.4, z + 2.4 - (k % 2) * 0.4, ['#c85a4a', '#5a8ad8', '#e8c860'][k], 0); else m.cyl(u, R0 + 0.8, z + 0.4, z + 1.8, 0.4, 0.4, '#a8d0c0', M.glass, 8); } }
    // 窗帘：远墙的窗两边挂着布帘
    S.bv.forEach((t) => { for (const s2 of [-1, 1]) m.box(uu(t) + s2 * 2.6 - 0.5, R0 + 0.3, 9.4, uu(t) + s2 * 2.6 + 0.5, R0 + 0.5, 22, '#e8b0a0', M.cloth); m.box(uu(t) - 3.4, R0 + 0.3, 22, uu(t) + 3.4, R0 + 0.6, 22.6, TIMBER, 2); m.pot(uu(t) - 1.2, R0 + 0.7, 10.6, 0.35, '#c8705a'); for (let q = 0; q < 3; q++) m.flower(uu(t) - 1.2 + (q - 1) * 0.25, R0 + 0.75, 11.8, 2.2 + q * 0.4, FLOW[q], q); });
    S.bu.forEach((t) => { for (const s2 of [-1, 1]) m.box(R0 + 0.3, vv(t) + s2 * 2.6 - 0.5, 11, R0 + 0.5, vv(t) + s2 * 2.6 + 0.5, 22.4, '#a8c8a0', M.cloth); });
    // 一串彩旗：沿着远墙上沿
    for (let i = 0; i < 16; i++) { const u0 = 22.5 + i * 0.95, z = 34 - Math.sin((i / 15) * Math.PI) * 2; m.tri([u0, R0 + 0.4, z], [u0 + 0.8, R0 + 0.4, z], [u0 + 0.4, R0 + 0.45, z - 1.6], FLOW[i % 5], M.cloth); }
    // 门边的鞋柜 + 郁金香
    m.box(K.RDOOR.u + 4, V1 - 2.6, 0, K.RDOOR.u + 8, V1 - 0.6, 4.6, '#a8784a', M.plank); m.pot(K.RDOOR.u + 6, V1 - 1.6, 4.6, 0.45, '#5a7ab0'); for (let q = 0; q < 4; q++) m.flower(K.RDOOR.u + 5.6 + q * 0.3, V1 - 1.6, 5.4, 2.4 + (q % 2) * 0.5, ['#f2a6c2', '#e8705a', '#ffd95a', '#ffffff'][q], q);
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
      const P = K.POND;
      // 塘里的鱼：水面下游来游去的影子
      for (let i = 0; i < 4; i++) { const a = t * (0.35 + i * 0.08) + i * 1.7, cu = P.cu + Math.cos(a) * (P.ru * 0.6 - i * 0.3), cv = P.cv + Math.sin(a * 1.3) * P.rv * 0.55, d = [-Math.sin(a) * (P.ru * 0.6 - i * 0.3), Math.cos(a * 1.3) * 1.3 * P.rv * 0.55], l = Math.hypot(d[0], d[1]) || 1, du = d[0] / l, dv = d[1] / l, wg = Math.sin(t * 7 + i) * 0.18, col = i === 1 ? '#f08a5a' : i === 3 ? '#f8f0e0' : '#2a5a78';
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
