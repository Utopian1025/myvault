// 小岛的模型：一座「东拼西凑的浮空小浮岛」。不是一层层一样大的千层饼——
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
  const PICK = { door: 1, green: 2, mail: 3, barrel: 4, balloon: 6, fish: 8, river: 15, tree: 9, lamp: 10, coop: 11, hive: 12, tank: 13, plot: 20, deco: 30, exit: 40, kitchen: 51, kdoor: 16, bdoor: 17, bed: 57, chair: 58, piano: 64, gbarrel: 71, bench: 74 };

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
    DOOR: { u: 12 + 0.42 * 13, v: 20 }, GDOOR: { u: 31.5, v: 14.5 }, TREE: { u: 40.5, v: 23 }, COOP: { u: 6.6, v: 33.2 }, HIVE: { u: 43, v: 29.6 }, TANK: { u: 28.5, v: 21.5 }, MAILB: { u: 20.8, v: 22.8 }, BALLOON: { u: 28.4, v: 14.2 },
    POND, FISH: { u: 19, v: 33.4 }, BOB: { u: 19.4, v: 38.8 },
    PLOTS: [[27, 27], [31.2, 27], [35.4, 27], [27, 31.6], [31.2, 31.6], [35.4, 31.6]], PS: 3.6, PH: [1.1, 1.4, 1.0, 1.2, 0.9, 1.3],
    SLOTS: [[15, 24.8], [4.8, 26.6], [23.4, 31.4], [34.4, 23.4], [41, 18.6], [11.6, 31]], LAMPS: [[21.6, 31.6, 0], [12.6, 22.8, 0], [36.6, 17.2, 0]],
    RDOOR: { u: iu(HOUSE, 0.42) }, GRDOOR: { u: iu(GH, 0.5) }, GPOTS: [[10.6, 10.4], [15, 10.4], [10.6, 15], [15, 15]],
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
    else if (PP.LIFE && PP.LIFE.PL[kind]) lifePlant(m, PP.LIFE.PL[kind], stage, u, v, z, seed, 1);
    else { rosette(7, 0.3 * s, 0.8, [g1, g0, g2], 0.6, 1.3); if (big) for (let i = 0; i < 5; i++) m.blob(u + Math.cos(i * 1.3) * 0.5, v + Math.sin(i * 1.3) * 0.5, z + 1.2 + (i % 3) * 0.7, 0.15, 0.38, '#e8405a', 0, i, 2, 4); }
  }

  // 新作物 / 花房稀有植物的 3D 样子：按植物的“形状”和颜色搭出来（k = 缩放，花房的大花盆里大一点）
  function lifePlant(m, P, stage, u, v, z, seed, k) {
    const [l1, l2, f1, f2] = P.c, big = stage === 3, s = (big ? 1 : stage === 2 ? 0.85 : 0.6) * k, L = (c, a, t, sz, col) => m.leaf(c, a, t, sz, col, 0.9);
    const ros = (n, r, ls, cols, tilt, zz) => { for (let i = 0; i < n; i++) { const a = (i * 6.283) / n + seed; L([u + Math.cos(a) * r, v + Math.sin(a) * r, z + zz], a, tilt, ls, cols[i % cols.length]); } };
    if (stage === 0) { for (let i = 0; i < 2; i++) L([u + (i ? 0.1 : -0.1), v, z + 0.6 * k], i * 3.14 + seed, 0.9, 0.36 * k, l2); return; }
    if (stage === 1) { ros(4, 0.15 * k, 0.55 * k, [l1, l2], 0.8, 1.2 * k); return; }
    const sh = P.shape;
    if (sh === 'root') { ros(7, 0.12 * s, 0.95 * s, [l1, l2], 1.1, 1.6 * s); if (big) m.ball(u, v, z + 0.3, 0.42 * s, P.round ? 0.42 * s : 0.7 * s, f1, 0, 4, 8); }
    else if (sh === 'leafy') { ros(7, 0.4 * s, 0.95 * s, [l1, l2], 0.5, 1); if (big) m.ball(u, v, z + 0.9 * s, 0.6 * s, 0.55 * s, f1, 0, 5, 8); }
    else if (sh === 'stalk') { const hh = 8 * s; m.cyl(u, v, z, z + hh, 0.08, 0.06, l1, 0, 4); for (let i = 0; i < 4; i++) L([u, v, z + (1.5 + i * 1.6) * s], i * 2.3 + seed, 0.3, 0.9 * s, i % 2 ? l1 : l2); if (big) { if (P.head === 'ear') for (let i = 0; i < 5; i++) m.ball(u + (P.droop ? i * 0.12 : 0), v, z + hh - 0.2 - i * 0.35, 0.16, 0.24, i % 2 ? f2 : f1, 0, 3, 5); else m.cyl(u + 0.2, v, z + hh * 0.5, z + hh * 0.8, 0.22, 0.12, f1, 0, 6); } }
    else if (sh === 'vine') { if (!P.ground) for (const a of [-0.6, 0.6]) m.box(u + a - 0.04, v - 0.04, z, u + a + 0.04, v + 0.04, z + 5.4 * s, '#c8b07a', 0); ros(6, 0.4 * s, 0.85 * s, [l1, l2], P.ground ? 0.25 : 0.6, P.ground ? 0.6 : 2.4 * s); if (!P.ground) ros(5, 0.3 * s, 0.75 * s, [l2, l1], 0.6, 4 * s);
      if (big) { if (P.bunch) for (let i = 0; i < 7; i++) m.ball(u + 0.3 + (i % 3) * 0.22 - 0.2, v + 0.3, z + 3.6 * s - Math.floor(i / 3) * 0.32, 0.18, 0.18, i % 2 ? f2 : f1, 0, 3, 5); else if (P.ground) m.blob(u + 0.2, v + 0.3, z + 0.9, 0.6, 1.1, f1, 0, seed, 4, 8); else for (let i = 0; i < 3; i++) m.ball(u + Math.cos(i * 2.1) * 0.5, v + Math.sin(i * 2.1) * 0.5, z + (2 + i) * s, 0.22, 0.26, f1, 0, 3, 6); } }
    else if (sh === 'bush') { m.foliage(u, v, z + 1.4 * s, 0.9 * s, 1.5 * s, [l1, l2], 26, seed, 0.6); if (P.spike) for (let i = 0; i < 5; i++) { const a = i * 1.26 + seed; m.cyl(u + Math.cos(a) * 0.4, v + Math.sin(a) * 0.4, z + 2 * s, z + 3.6 * s, 0.1, 0.05, stage >= 2 ? f1 : l2, 0, 4); }
      else if (stage === 2 && P.flw) for (let i = 0; i < 4; i++) m.ball(u + Math.cos(i * 1.6) * 0.6 * s, v + Math.sin(i * 1.6) * 0.6 * s, z + 2.4 * s, 0.14, 0.1, P.flw, 0, 3, 5);
      if (big && !P.spike) for (let i = 0; i < 5; i++) m.ball(u + Math.cos(i * 1.3 + seed) * 0.7 * s, v + Math.sin(i * 1.3 + seed) * 0.7 * s, z + (1.4 + (i % 3) * 0.6) * s, P.long ? 0.16 : 0.2, P.long ? 0.42 : 0.2, f1, 0, 3, 5); }
    else if (sh === 'flower') { const n = P.water ? 1 : 3; for (let q = 0; q < n; q++) { const a = u + (q - 1) * 0.45 * k, b = v + (q % 2 ? 0.3 : -0.2) * k, hh = P.water ? 0.2 : (3.6 + q * 0.8) * s; if (!P.water) { m.cyl(a, b, z, z + hh, 0.05, 0.04, l1, 0, 4); L([a, b, z + 1.2 * s], q * 2 + seed, 1, 0.7 * s, l2); } else { m.cyl(u, v, z, z + 0.08, 1.2 * k, 1.2 * k, '#5aa8d8', M.water, 10); L([u - 0.6, v, z + 0.1], 0, 0, 0.9 * k, l2); }
        if (stage === 2) m.ball(a, b, z + hh + 0.2, 0.18 * k, 0.32 * k, l2, 0, 3, 5);
        else for (let i = 0; i < 5; i++) { const an = (i / 5) * 6.283; m.leaf([a + Math.cos(an) * 0.18 * k, b + Math.sin(an) * 0.18 * k, z + hh + 0.15], an, P.bell ? -0.9 : P.water ? 0.2 : 0.5, 0.42 * k, i % 2 ? f1 : f2, 0.5); } } }
    else if (sh === 'cactus') { m.cyl(u, v, z, z + 3.2 * s, 0.55 * s, 0.45 * s, l1, 0, 8); m.ball(u, v, z + 3.2 * s, 0.45 * s, 0.4 * s, l2, 0, 4, 8); m.cyl(u + 0.6 * s, v, z + 1.2 * s, z + 2.4 * s, 0.22 * s, 0.2 * s, l1, 0, 6); if (big) for (let i = 0; i < 6; i++) m.leaf([u, v, z + 3.7 * s], (i / 6) * 6.283, 0.4, 0.5 * k, f1, 0.4); }
    else if (sh === 'fern') { for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283 + seed; for (let j = 0; j < 4; j++) L([u + Math.cos(a) * j * 0.3 * s, v + Math.sin(a) * j * 0.3 * s, z + (0.6 + j * 0.45) * s], a, 0.2 + j * 0.2, (0.6 - j * 0.08) * s, j % 2 ? l1 : l2); if (big) m.ball(u + Math.cos(a) * 1.3 * s, v + Math.sin(a) * 1.3 * s, z + 2.2 * s, 0.1, 0.1, f1, M.glow, 3, 4); } }
    else if (sh === 'shroom') { if (P.moss) { m.ball(u, v, z + 0.8 * s, 0.9 * s, 0.75 * s, f1, M.grass, 5, 8); if (big) m.ball(u + 0.3, v + 0.3, z + 1.6 * s, 0.14, 0.14, '#f2a6c2', 0, 3, 5); } else { const L2 = big ? [[0, 0, 1.2], [0.6, 0.4, 0.8], [-0.5, 0.3, 0.6]] : [[0, 0, 0.9]]; for (const [a, b, r] of L2) { m.cyl(u + a, v + b, z, z + 1.6 * r * k, 0.12 * r, 0.1 * r, '#e8e0d0', 0, 5); m.ball(u + a, v + b, z + 1.6 * r * k, 0.5 * r * k, 0.3 * r * k, f1, M.glow, 4, 8); } } }
    else if (sh === 'tree') { m.cyl(u, v, z, z + 2.4 * s, 0.32 * s, 0.4 * s, f1, M.plank, 8); m.foliage(u, v, z + 3.2 * s, 1 * s, 0.6 * s, [l1, l2], 30, seed, 0.6); }
    else ros(7, 0.3 * s, 0.8 * s, [l1, l2], 0.6, 1.3 * s);
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


  // ---------- 浮岛：老树是骨架，各种房子块东一块西一块钉在树干周围 ----------
  // 一层 = 原来的石头小屋（门厅）；屋顶是露台（lv1）；露台上是厨房、浴室，中间穿过老树干；
  // 左边架在小河上的高脚「窝楼」和露台、二层连成一片；再往上是木平台（lv2）；最上面是前面的瞭望台（lv3）：锅炉、热气球码头。
  // 每只动物一间自己的窝，分散在窝楼、二层和瞭望台上。树冠盖在最顶上。动物大约 8 格高，层高都按这个来。
  const CA = {
    Z: [0, 11.25, 21.75, 33],
    KIT: { u0: 12.3, u1: 17.4, v0: 9.2, v1: 13.2, h: 9.3, door: 15.2 },
    BATH: { u0: 20.6, u1: 23.4, v0: 9.2, v1: 12.6, h: 9.3, door: 22 },
    TRUNK: { u: 19, v: 10.6, r: 1.45 },
    T1: [12, 9, 25.6, 20], LAND1: [24.2, 9.4, 26.8, 12.4], WING1: [3.4, 7, 12.2, 18.6],
    P2: [9, 6.6, 24.6, 13.4], LAND2: [11.4, 13, 15.6, 20.4],
    P3: [20.6, 12.8, 25.2, 21.4],
    R01: { u0: 25.2, u1: 26.5, v0: 12.4, v1: 20, axis: 'v', lo: 20, hi: 12.4, a: 0, b: 1 },
    R12: { u0: 15.4, u1: 23.6, v0: 16.6, v1: 18.4, axis: 'u', lo: 23.6, hi: 15.4, a: 1, b: 2 },
    R23: { u0: 15.4, u1: 23.6, v0: 18.6, v1: 20.4, axis: 'u', lo: 15.4, hi: 23.6, a: 2, b: 3 },
    CHIM: { u: 12.0, v: 14.9 },
    // 装饰用的圆塔（浮岛的轮廓）：[u, v, 半径, 塔身顶高, 屋顶颜色]
    TOWERS: [[2.6, 19.4, 1.5, 22, '#4a6a9a'], [25.4, 6.4, 1.6, 30, '#b8503c'], [8.2, 5.6, 1.3, 33, '#5a8a6a']],
    BOILER: { u: 21.4, v: 20.9 },
    // 平台上的小房子（让浮岛看起来是一栋栋房子拼起来的，不是光秃秃的木台）：[层, u0, v0, u1, v1, 墙高, 墙色, 屋顶色, 屋顶方向]
    BLOCKS: [[1, 3.8, 7.3, 11.6, 11.4, 8.4, '#e8d6b4', '#5a7a8a', 'u'], [2, 9.2, 6.8, 16.9, 10.7, 8, '#f0e2c4', '#b8503c', 'u'], [2, 20.7, 6.8, 24.5, 10.7, 7.4, '#cfe0e8', '#4a6a9a', 'v'], [3, 20.8, 13.2, 23.7, 16.6, 5.6, '#e8d6b4', '#5a8a6a', 'v'], [1, 3.8, 13.4, 6.6, 16.6, 6.4, '', '', 'v'], [2, 9.4, 11.2, 11.6, 13.2, 4.6, '', '', 'u']],
    // 小窝：[层, u0, v0, u1, v1, 门朝哪边]（'v' = 门朝前，'u' = 门朝右）
    DENS: [[2, 9.3, 6.9, 12.9, 10.6, 'v'], [1, 7.8, 7.4, 11.4, 11.4, 'v'], [2, 13.2, 6.9, 16.8, 10.6, 'v'], [1, 3.8, 7.4, 7.4, 11.4, 'v'], [2, 20.8, 6.9, 24.4, 10.6, 'v'],
      [1, 3.6, 14.2, 7.6, 17.8, 'u'], [3, 20.8, 13.2, 23.6, 16.6, 'u'], [0, 37.2, 16.6, 40.8, 20.2, 'v'], [0, 41.6, 15.2, 45, 18.8, 'v'], [0, 36.8, 9.4, 40.4, 13, 'v']],
    PICK_DEN: 80,
  };
  // 门口站的位置
  CA.denZ = (d) => (d[0] ? CA.Z[d[0]] : K.T.terrain((d[1] + d[3]) / 2, (d[2] + d[4]) / 2));
  CA.denFront = (d) => (d[5] === 'u' ? { u: d[3] + 0.9, v: (d[2] + d[4]) / 2 } : { u: (d[1] + d[3]) / 2, v: d[4] + 0.9 });
  K.CA = CA;
  const DEN_STYLE = { cat: 'cat', dog: 'dog', rabbit: 'rabbit', hamster: 'hamster', penguin: 'penguin', fox: 'fox', frog: 'frog', chick: 'chick', duck: 'duck', pig: 'pig', capybara: 'capybara', hedgehog: 'hedgehog', turtle: 'turtle', crab: 'crab', octopus: 'octopus' };
  const DEN_NAME = { cat: '猫猫木箱屋', dog: '红顶狗屋', rabbit: '胡萝卜门的土丘屋', hamster: '圆滚滚的谷仓罐', penguin: '小冰屋', fox: '树根下的狐狸洞', frog: '蘑菇屋', chick: '小鸡舍', duck: '蓝顶鸭屋', pig: '稻草顶小泥屋', capybara: '芦苇屋（带小温泉）', hedgehog: '落叶堆里的刺猬屋', turtle: '龟壳屋', crab: '大海螺屋', octopus: '水桶屋（带舷窗）' };
  K.DEN_NAME = DEN_NAME;
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
  // 局部坐标：原点在窝的中心，门朝 +y；r = 0 门朝 +v，r = 3 门朝 +u
  class LT {
    constructor(m, u, v, r, z) { this.m = m; this.u = u; this.v = v; this.r = r; this.z = z; }
    p(x, y) { const r = this.r; const [a, b] = r === 0 ? [x, y] : r === 1 ? [-y, x] : r === 2 ? [-x, -y] : [y, -x]; return [this.u + a, this.v + b]; }
    q(pt) { const [a, b] = this.p(pt[0], pt[1]); return [a, b, this.z + pt[2]]; }
    ang(a) { return a + (this.r === 3 ? -Math.PI / 2 : this.r === 1 ? Math.PI / 2 : this.r === 2 ? Math.PI : 0); }
    box(x0, y0, z0, x1, y1, z1, ...a) { const A = this.p(x0, y0), B = this.p(x1, y1); this.m.box(Math.min(A[0], B[0]), Math.min(A[1], B[1]), this.z + z0, Math.max(A[0], B[0]), Math.max(A[1], B[1]), this.z + z1, ...a); return this; }
    cyl(x, y, z0, z1, ...a) { const P = this.p(x, y); this.m.cyl(P[0], P[1], this.z + z0, this.z + z1, ...a); return this; }
    ball(x, y, z, ...a) { const P = this.p(x, y); this.m.ball(P[0], P[1], this.z + z, ...a); return this; }
    blob(x, y, z, ...a) { const P = this.p(x, y); this.m.blob(P[0], P[1], this.z + z, ...a); return this; }
    quad(a, b, c, d, ...x) { this.m.quad(this.q(a), this.q(b), this.q(c), this.q(d), ...x); return this; }
    tri(a, b, c, ...x) { this.m.tri(this.q(a), this.q(b), this.q(c), ...x); return this; }
    disc(x, y, z, rad, face, ...a) { const P = this.p(x, y), f = this.r % 2 ? (face === 'u' ? 'v' : 'u') : face; this.m.disc(P[0], P[1], this.z + z, rad, f, ...a); return this; }
    leaf(c, a, ...x) { this.m.leaf(this.q(c), this.ang(a), ...x); return this; }
    gable(x0, y0, x1, y1, z, h, axis, ...a) { const A = this.p(x0, y0), B = this.p(x1, y1), ax = this.r % 2 ? (axis === 'u' ? 'v' : 'u') : axis; this.m.gable(Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[0], B[0]), Math.max(A[1], B[1]), this.z + z, h, ax, ...a); return this; }
    vine(pts, o) { this.m.vine(pts.map((p) => this.q(p)), o); return this; }
  }
  // 一扇真的门（局部坐标里朝 +y，在 y = Y 的墙上）：门框、竖木板、圆窗、门把手、门口踏板、门边小灯
  function denDoor(t, Y, w, h, col, o = {}) {
    const hw = w / 2, fr = o.frame || TIMBER;
    t.box(-hw - 0.24, Y - 0.05, 0, -hw, Y + 0.24, h + 0.22, fr, 2); t.box(hw, Y - 0.05, 0, hw + 0.24, Y + 0.24, h + 0.22, fr, 2); t.box(-hw - 0.24, Y - 0.05, h, hw + 0.24, Y + 0.26, h + 0.42, fr, 2);
    t.box(-hw, Y, 0, hw, Y + 0.14, h, col, M.plank);
    for (let k = 1; k < 3; k++) t.box(-hw + (w * k) / 3 - 0.04, Y + 0.14, 0.1, -hw + (w * k) / 3 + 0.04, Y + 0.19, h - 0.1, shade(col, 0.72), 0);
    if (o.round !== false) t.disc(0, Y + 0.18, h * 0.72, w * 0.17, 'v', '#ffe9a8', M.glass, 8);
    t.box(hw - 0.42, Y + 0.14, h * 0.45, hw - 0.22, Y + 0.32, h * 0.45 + 0.3, '#e8b84a', M.metal);
    t.box(-hw - 0.15, Y, -0.15, hw + 0.15, Y + 0.8, 0.05, '#c8b8a0', M.stone);
    if (o.lamp !== false) t.box(hw + 0.34, Y + 0.1, h - 0.5, hw + 0.7, Y + 0.46, h + 0.05, '#ffe9a8', M.glow);
  }
  // 每种动物一间自己的窝
  function den(m, sp, d, z, snow) {
    const [, u0, v0, u1, v1, face] = d, r = face === 'u' ? 3 : 0, t = new LT(m, (u0 + u1) / 2, (v0 + v1) / 2, r, z);
    const W = r ? v1 - v0 : u1 - u0, D = r ? u1 - u0 : v1 - v0, X = W / 2, Y = D / 2, st = DEN_STYLE[sp] || 'cabin';
    const door = (col, o) => denDoor(t, Y, Math.min(1.9, W * 0.5), 4.2, col, o);
    t.box(-X - 0.1, -Y - 0.1, d[0] ? -0.15 : -2.4, X + 0.1, Y + 0.7, 0, d[0] ? '#8a6a4a' : STONE2, d[0] ? M.plank : M.stone); // 窝底下的小木台（地上的是石头台）
    if (st === 'cat') { t.box(-X, -Y, 0, X, Y, 5.4, '#d8a868', M.plank); t.box(-X - 0.15, -Y - 0.15, 5.4, X + 0.15, Y + 0.15, 5.8, '#a8704a', M.plank); for (let i = 0; i < 4; i++) t.quad([-X + (i * W) / 4, Y + 0.02, 5.3], [-X + ((i + 1) * W) / 4, Y + 0.02, 5.3], [-X + ((i + 1) * W) / 4, Y + 1.1, 4.5], [-X + (i * W) / 4, Y + 1.1, 4.5], i % 2 ? '#f4ead8' : '#e0604a', M.cloth); door('#c8603e'); t.blob(X - 0.6, -Y + 0.7, 6.2, 0.7, 0.5, '#f4ead8', M.cloth, 3, 3, 6); for (const k of [-1, 1]) t.tri([k * 1.2, -Y + 0.4, 5.8], [k * 1.2 + 0.6 * k, -Y + 0.4, 5.8], [k * 1.4, -Y + 0.4, 7], '#d8a868', M.plank); t.box(-X + 0.3, Y + 0.15, 2.4, -X + 0.9, Y + 0.32, 3.1, '#7fb8d8', 0); }
    else if (st === 'dog') { t.box(-X, -Y, 0, X, Y, 5, '#c89a5a', M.plank); t.gable(-X, -Y, X, Y, 5, 2.6, 'v', '#b8403a', M.tile, 0.4, '#c89a5a', M.plank); door('#7a4a2e', { round: false }); t.box(-0.9, Y + 0.05, 5.2, 0.9, Y + 0.22, 5.9, '#f4e6c8', 0); t.box(X + 0.2, Y - 0.3, 0, X + 1.2, Y + 0.6, 0.35, '#f4ead8', 0); t.cyl(X + 0.4, Y + 1.2, 0, 0.5, 0.5, 0.55, '#5a8ac8', 0, 8); }
    else if (st === 'rabbit') { t.blob(0, 0, -0.2, W * 0.58, 5.6, snow ? '#eef4fa' : '#6aac52', snow ? M.snow : M.grass, u0 * 3, 4, 10); door('#f08a3a'); for (const k of [-0.6, 0.6]) t.blob(k, -0.3, 5.2, 0.35, 1.6, '#f4ead8', 0, k * 9, 3, 5); t.cyl(X - 0.3, Y + 0.6, 0, 1.1, 0.28, 0.07, '#f08a3a', 0, 5); t.leaf([X - 0.3, Y + 0.6, 1.1], 1, 1.2, 0.6, '#5aa64e', 0.5); }
    else if (st === 'hamster') { t.cyl(0, 0, 0, 5, W * 0.46, W * 0.46, '#f0d8a0', M.plaster, 12); t.cyl(0, 0, 5, 6.4, W * 0.5, W * 0.18, '#d8a050', M.plank, 12); t.cyl(0, 0, 6.4, 6.9, 0.35, 0.35, '#a8704a', 0, 6); door('#d8803a'); t.cyl(-X + 0.4, Y + 0.4, 0, 1.2, 0.55, 0.45, '#e8d0a0', M.cloth, 8); t.cyl(X - 0.2, Y + 0.6, 0.4, 0.45, 0.6, 0.6, '#c8c0b0', M.metal, 10); }
    else if (st === 'penguin') { t.blob(0, -0.2, -0.3, W * 0.56, 5.4, '#eef4fa', M.snow, u0, 5, 10); t.box(-1.3, Y - 0.9, 0, 1.3, Y + 0.1, 4.6, '#e2ecf6', M.snow); door('#5ea8bc'); for (let k = 1; k < 4; k++) t.box(-X * 0.9, -Y * 0.9, k * 1.4, X * 0.9, Y - 1, k * 1.4 + 0.1, '#b4cce0', 0); }
    else if (st === 'fox') { t.blob(0, -0.2, -0.2, W * 0.6, 5.2, snow ? '#eef4fa' : '#7a5a3e', snow ? M.snow : M.soil, u0 * 2, 4, 10); t.blob(-0.6, -0.8, 3.8, W * 0.4, 2, snow ? '#f4f8fc' : '#5aa64e', snow ? M.snow : M.grass, u0, 3, 8); for (let i = 0; i < 4; i++) t.vine([[-X + (i * W) / 3, -Y, 4.4], [-X + (i * W) / 3 + 0.2, Y, 0.2]], { cols: ['#6a4a30', '#5a4026'], seed: i + 400, gap: 1, ls: 0.3 }); door('#c8402e'); t.box(-X + 0.2, Y + 0.3, 0, -X + 0.36, Y + 0.46, 4.6, TIMBER, 0); t.box(-X + 0.02, Y + 0.12, 4.6, -X + 0.54, Y + 0.64, 5.2, '#ffe9a8', M.glow); }
    else if (st === 'frog') { t.cyl(0, 0, 0, 4.4, W * 0.36, W * 0.4, '#f4ead8', M.plaster, 10); t.blob(0, 0, 4.4, W * 0.64, 2.6, '#e0503a', M.cloth, 7, 3, 10); for (let i = 0; i < 6; i++) t.disc(Math.cos(i) * W * 0.4, Math.sin(i) * W * 0.4 + 0.3, 5.8, 0.24, 'v', '#fff6e0', 0, 6); door('#5aa64e'); t.cyl(0, Y + 1.1, 0.02, 0.06, 0.9, 0.9, '#5aa64e', M.leaf, 10); }
    else if (st === 'chick') { t.box(-X, -Y, 0, X, Y, 4.8, '#f6d860', M.plank); t.gable(-X, -Y, X, Y, 4.8, 2.4, 'u', '#e0604a', M.tile, 0.35, '#f6d860', M.plank); door('#a8603a', { round: false }); t.cyl(X - 0.6, -Y + 0.6, 6.2, 7.6, 0.06, 0.06, TIMBER, 0, 4); t.box(X - 0.6, -Y + 0.55, 7.4, X + 0.1, -Y + 0.65, 7.8, '#ffd36a', 0); for (let i = 0; i < 5; i++) t.box(-X - 0.1, Y + 0.3 + i * 0.1, 0.02, -X + 1.4, Y + 0.35 + i * 0.1, 0.06, '#e8c86a', 0); }
    else if (st === 'duck') { t.box(-X, -Y, 0, X, Y, 4.8, '#f4ead8', M.plank); t.gable(-X, -Y, X, Y, 4.8, 2.4, 'v', '#4a8ac8', M.tile, 0.35, '#f4ead8', M.plank); door('#5ea8bc'); t.cyl(-X + 0.6, Y + 0.8, 0.02, 0.1, 0.8, 0.8, '#7fc0dc', M.water, 10); }
    else if (st === 'pig') { t.box(-X, -Y, 0, X, Y, 4.8, '#c8906a', M.plaster); t.gable(-X - 0.2, -Y - 0.2, X + 0.2, Y + 0.2, 4.8, 2.8, 'u', '#e0c070', M.cloth, 0.5, '#c8906a', M.plaster); door('#8a5a3a', { round: false }); t.cyl(X - 0.1, Y + 0.7, 0.02, 0.12, 0.9, 0.9, '#7a5a3e', M.soil, 9); }
    else if (st === 'capybara') { t.cyl(0, 0, 0, 6.6, W * 0.5, W * 0.12, '#c8a85a', M.cloth, 10); door('#8a5a3a', { round: false }); t.cyl(X + 0.1, Y + 0.3, 0, 0.9, 1.1, 1.1, '#a8784a', M.plank, 10); t.cyl(X + 0.1, Y + 0.3, 0.7, 0.75, 0.95, 0.95, '#9fd4f2', M.water, 10); }
    else if (st === 'hedgehog') { const lc = ['#d8702a', '#e0a040', '#c85a2a', '#b8a040']; t.blob(0, 0, -0.2, W * 0.58, 5, '#a86a3a', M.soil, u0 * 5, 4, 10); for (let i = 0; i < 34; i++) { const a = H(i, u0) * 6.28, rr = H(u0, i) * W * 0.52; t.leaf([Math.cos(a) * rr * 0.9, Math.sin(a) * rr * 0.8 - 0.3, 3.6 + Math.sqrt(Math.max(0, 1 - (rr / (W * 0.58)) ** 2)) * 1.9], a, 0.25, 0.85, lc[i % 4], 0.3); } door('#8a5a3a'); t.ball(-X + 0.5, Y + 0.5, 0.45, 0.45, 0.45, '#e0402a', 0, 3, 6); t.cyl(-X + 0.5, Y + 0.5, 0.9, 1.15, 0.05, 0.05, TIMBER, 0, 3); t.leaf([-X + 0.6, Y + 0.5, 1.1], 0.6, 0.8, 0.4, '#5aa64e', 0.3); }
    else if (st === 'turtle') { t.blob(0, 0, -0.1, W * 0.58, 4.8, '#5a9a5a', M.tile, 5, 4, 8); for (let i = 0; i < 6; i++) t.disc(Math.cos(i) * W * 0.3, Math.sin(i) * W * 0.3 - 0.2, 3.8, 0.55, 'v', '#86c26a', 0, 6); door('#a8784a'); }
    else if (st === 'crab') { for (let i = 0; i < 4; i++) t.cyl(0, 0, i * 1.5, i * 1.5 + 1.6, W * (0.5 - i * 0.1), W * (0.45 - i * 0.1), i % 2 ? '#f2b8a0' : '#f8d4c4', 0, 10); door('#e07050'); t.blob(X - 0.3, Y + 0.4, 0, 0.4, 0.3, '#f4ead8', 0, 2, 3, 5); }
    else if (st === 'octopus') { t.cyl(0, 0, 0, 5.6, W * 0.47, W * 0.47, '#8a5e3c', M.plank, 12); for (const hh of [1, 4]) t.cyl(0, 0, hh, hh + 0.3, W * 0.49, W * 0.49, '#4a4652', M.metal, 12); t.cyl(0, 0, 5.6, 5.7, W * 0.45, W * 0.45, '#7fc0dc', M.water, 12); door('#b0704a', { round: false }); t.disc(0, Y + 0.2, 3.1, 0.5, 'v', '#9fd4f2', M.glass, 10); }
    else { t.box(-X, -Y, 0, X, Y, 5, '#d8b888', M.plank); t.gable(-X, -Y, X, Y, 5, 2.4, 'u', '#7a5a8a', M.tile, 0.35, '#d8b888', M.plank); door('#8a5a3a'); }
  }
  function slab(m, P, z, top, edge) { m.box(P[0], P[1], z - 0.6, P[2], P[3], z, top, M.plank); m.box(P[0] - 0.2, P[1] - 0.2, z - 1.6, P[2] + 0.2, P[3] + 0.2, z - 0.6, edge || '#7c4632', M.metal); for (let u = P[0] + 0.4; u < P[2]; u += 0.9) m.box(u - 0.06, P[3] + 0.18, z - 1.25, u + 0.06, P[3] + 0.26, z - 1.0, '#e0b070', M.metal); for (let v = P[1] + 0.4; v < P[3]; v += 0.9) m.box(P[2] + 0.18, v - 0.06, z - 1.25, P[2] + 0.26, v + 0.06, z - 1.0, '#e0b070', M.metal); }
  // ---------- 拼凑的移动浮岛：把任意一组形状绕一个点转一转、歪一歪 ----------
  const ZS = 1.155 / 2.83;
  function warp(m, P, yaw, tu, tv, fn) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cu = Math.cos(tu), su = Math.sin(tu), cv = Math.cos(tv), sv = Math.sin(tv);
    const T = (q) => { const x = q[0] - P[0], y = q[1] - P[1], z = (q[2] - P[2]) * ZS; const x1 = x * cy - y * sy, y1 = x * sy + y * cy; const x2 = x1 * cu + z * su, z2 = -x1 * su + z * cu; const y3 = y1 * cv + z2 * sv, z3 = -y1 * sv + z2 * cv; return [x2 + P[0], y3 + P[1], z3 / ZS + P[2]]; };
    const own = Object.prototype.hasOwnProperty.call(m, 'tri'), o = m.tri; m.tri = function (a, b, c, col, mat) { return o.call(this, T(a), T(b), T(c), col, mat); };
    /* 带法线的三角形（苔藓、光滑曲面）也跟着转：位置照转，法线只转方向 */
    const ownN = Object.prototype.hasOwnProperty.call(m, 'triN'), oN = m.triN, Tn = (n) => { const q = T([P[0] + n[0], P[1] + n[1], P[2] + n[2]]); const d = [q[0] - P[0], q[1] - P[1], q[2] - P[2]], l = Math.hypot(...d) || 1; return d.map((x) => x / l); };
    if (oN) m.triN = function (a, b, c, na, nb, nc, ca, cb, cc, mat) { return oN.call(this, T(a), T(b), T(c), Tn(na), Tn(nb), Tn(nc), ca, cb, cc, mat); };
    try { fn(); } finally { if (own) m.tri = o; else delete m.tri; if (oN) { if (ownN) m.triN = oN; else delete m.triN; } }
  }
  const HW = { IRON: '#6f9e8c', IRON2: '#5b8778', RUST: '#9a8268', RUST2: '#857058', COP: '#6f9e8c', COP2: '#5b8778', CREAM: '#f0e6d2', CREAM2: '#e2d4ba', TILE: '#5f7482', TILE2: '#53677a', SHING: '#6f8a66', GOLD: '#d4b46a', STONEW: '#b8ae9a', WING: '#f4f0e6', WING2: '#d6cfbf' }; // 跟浮岛的「林间白石城」配色一致：圆顶是生了铜绿的铜，翅膀是白的
  // 横着伸出去的管子 / 炮管：从 (u,v,z) 朝 yaw 方向伸 len 格
  function pipeOut(m, u, v, z, yaw, len, r, col, up = 0) { warp(m, [u, v, z], yaw, Math.PI / 2 - up, 0, () => { m.cyl(u, v, z, z + len / ZS, r, r * 0.92, col, M.metal, 8); m.cyl(u, v, z + len / ZS - 0.3, z + len / ZS + 0.4, r * 1.35, r * 1.35, shade(col, 0.8), M.metal, 8, true, '#1e1a22'); }); }
  // 一圈城垛（石头矮墙，上面一个个垛口）
  function crenel(m, u, v, z, r, col, n = 14) { m.cyl(u, v, z - 1.4, z, r, r, col, M.stone, 16); m.cyl(u, v, z - 1.9, z - 1.4, r * 0.9, r, shade(col, 0.8), M.stone, 16); for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832, x = u + Math.cos(a) * (r - 0.2), y = v + Math.sin(a) * (r - 0.2); warp(m, [x, y, z], a, 0, 0, () => m.box(x - 0.22, y - 0.35, z, x + 0.22, y + 0.35, z + 0.9, col, M.stone)); } }
  // 灰铁圆顶：城垛箍一圈，顶上铆钉缝，伸出几根炮管和舷窗
  function dome(m, u, v, z, r, seed, cannons) {
    crenel(m, u, v, z + 0.6, r + 0.35, HW.STONEW, Math.round(r * 5));
    m.ball(u, v, z, r, r * 3.6, HW.IRON, M.metal, 4, 18, 0.05, seed, true); // 只要上半球：原来整个球画出来，下半截穿进驾驶室和工作间
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.2832 + seed; for (let k = 1; k < 6; k++) { const t = (k / 6) * Math.PI / 2, x = u + Math.cos(a) * Math.sin(t) * r * 1.01, y = v + Math.sin(a) * Math.sin(t) * r * 1.01, zz = z + Math.cos(t) * r * 3.6; m.box(x - 0.07, y - 0.07, zz - 0.15, x + 0.07, y + 0.07, zz + 0.15, '#3e3844', M.metal); } }
    (cannons || []).forEach(([a, h, len, rr], i) => { const t = Math.acos(Math.min(1, h)), x = u + Math.cos(a) * Math.sin(t) * r * 0.9, y = v + Math.sin(a) * Math.sin(t) * r * 0.9, zz = z + h * r * 3.6; pipeOut(m, x, y, zz, a, len, rr, i % 2 ? HW.IRON2 : '#4a4450', 0.15); });
  }
  // 歪歪的小房子：奶白墙、红瓦、小方窗；roof: 'g' 人字顶 / 'c' 尖锥木瓦顶 / 'h' 四坡
  function hut(m, u, v, z, w, d, h, o = {}) {
    const wall = o.wall || HW.CREAM, roof = o.snow ? '#e4ecf4' : o.roof || HW.TILE, yaw = o.yaw || 0;
    warp(m, [u, v, z], yaw, o.tu || 0, o.tv || 0, () => {
      const u0 = u - w / 2, u1 = u + w / 2, v0 = v - d / 2, v1 = v + d / 2;
      m.box(u0, v0, z, u1, v1, z + h, wall, M.plaster);
      m.box(u0 - 0.05, v0 - 0.05, z, u1 + 0.05, v1 + 0.05, z + 0.5, shade(wall, 0.78), M.stone);
      const nw = Math.max(1, Math.floor(w / 1.3)), nf = Math.max(1, Math.floor(h / 3.2));
      for (let f = 0; f < nf; f++) for (let k = 0; k < nw; k++) { const a = u0 + (w * (k + 0.5)) / nw, zz = z + 1.4 + f * 3.2; if ((k * 7 + f * 3 + (o.seed || 0)) % 5 === 4) continue; m.box(a - 0.28, v1, zz, a + 0.28, v1 + 0.08, zz + 1.2, (k + f) % 3 ? '#2e3a5a' : '#ffe9a8', (k + f) % 3 ? 0 : M.glow); m.box(a - 0.36, v1 + 0.04, zz - 0.15, a + 0.36, v1 + 0.16, zz, '#f4ead8', 0); m.box(a - 0.03, v1 + 0.08, zz, a + 0.03, v1 + 0.12, zz + 1.2, '#f4ead8', 0); if ((k + f + (o.seed || 0)) % 2) for (const sx of [-1, 1]) m.box(a + sx * 0.3, v1 + 0.02, zz - 0.05, a + sx * 0.55, v1 + 0.14, zz + 1.25, o.shut || '#4a7a6a', M.plank); }
      for (let f = 0; f < nf; f++) { const zz = z + 1.4 + f * 3.2, b = v0 + d / 2; m.box(u1, b - 0.28, zz, u1 + 0.08, b + 0.28, zz + 1.2, '#2e3a5a', 0); }
      if (o.awn) for (let i = 0; i < 6; i++) m.quad([u0 + 0.3 + (i * (w - 0.6)) / 6, v1 + 0.05, z + 3], [u0 + 0.3 + ((i + 1) * (w - 0.6)) / 6, v1 + 0.05, z + 3], [u0 + 0.3 + ((i + 1) * (w - 0.6)) / 6, v1 + 1.1, z + 2.1], [u0 + 0.3 + (i * (w - 0.6)) / 6, v1 + 1.1, z + 2.1], i % 2 ? '#f4ead8' : '#d83a32', M.cloth);
      if (o.bal) { m.box(u0 + 0.2, v1, z + 0.2, u1 - 0.2, v1 + 1.1, z + 0.45, HW.GOLD, M.metal); for (let i = 0; i <= 6; i++) m.box(u0 + 0.2 + (i * (w - 0.4)) / 6 - 0.04, v1 + 1, z + 0.45, u0 + 0.2 + (i * (w - 0.4)) / 6 + 0.04, v1 + 1.1, z + 1.6, HW.GOLD, M.metal); m.box(u0 + 0.2, v1 + 1, z + 1.5, u1 - 0.2, v1 + 1.1, z + 1.65, HW.GOLD, M.metal); }
      const rt = o.rt || 'g';
      if (rt === 'c') { m.cyl(u, v, z + h, z + h + Math.max(w, d) * 2.1, Math.max(w, d) * 0.72, 0.04, roof, M.tile, 8); if (o.cross) { m.box(u - 0.05, v - 0.05, z + h + Math.max(w, d) * 2.1, u + 0.05, v + 0.05, z + h + Math.max(w, d) * 2.1 + 2.2, TIMBER, 0); m.box(u - 0.4, v - 0.05, z + h + Math.max(w, d) * 2.1 + 1.3, u + 0.4, v + 0.05, z + h + Math.max(w, d) * 2.1 + 1.5, TIMBER, 0); } }
      else if (rt === 'h') { m.cyl(u, v, z + h, z + h + 1.6, Math.hypot(w, d) * 0.62, Math.max(0.3, w * 0.12), roof, M.tile, 4); }
      else m.gable(u0, v0, u1, v1, z + h, (o.ax === 'v' ? w : d) * 0.85, o.ax || 'u', roof, M.tile, 0.35, wall, M.plaster);
      if (o.chim) { m.box(u1 - 0.8, v0 + 0.3, z + h, u1 - 0.3, v0 + 0.8, z + h + 3, BRICK, M.stone); }
      // 精细一点：墙角石、木门、瓦片一排排、墙上的裂纹补丁
      for (const [a, b] of [[u0, v1], [u1, v1], [u1, v0]]) for (let k = 0; k < h - 0.8; k += 1.1) m.box(a - 0.12, b - 0.12, z + 0.6 + k, a + 0.12, b + 0.12, z + 1.1 + k, shade(wall, 0.86), M.stone);
      if (o.door) { const a = u0 + w * 0.5; m.box(a - 0.5, v1, z + 0.5, a + 0.5, v1 + 0.12, z + 2.6, '#6a3a26', M.plank); m.box(a - 0.62, v1 + 0.02, z + 2.6, a + 0.62, v1 + 0.16, z + 2.85, shade(wall, 0.7), M.stone); m.box(a - 0.7, v1, z + 0.3, a + 0.7, v1 + 0.6, z + 0.5, '#9a9080', M.stone); }
      for (let k = 0; k < 3; k++) { const a = u0 + 0.3 + H(k, o.seed || 3) * (w - 1.2), zz = z + 0.8 + H(o.seed || 3, k) * (h - 1.5); m.box(a, v1 + 0.01, zz, a + 0.5 + H(k, 5) * 0.6, v1 + 0.04, zz + 0.3 + H(5, k) * 0.4, shade(wall, 0.9), 0); }
      if ((o.rt || 'g') === 'g' && !o.snow) { const ax2 = o.ax || 'u', hh = (ax2 === 'v' ? w : d) * 0.85, dk = shade(roof, 0.72);
        for (let t = 0.18; t < 0.95; t += 0.2) { if (ax2 === 'u') { const vm = (v0 + v1) / 2; for (const [ve, s2] of [[v0 - 0.35, 1], [v1 + 0.35, -1]]) { const vv = ve + (vm - ve) * t, zz = z + h - 0.35 * hh / (d / 2) + (hh + 0.35 * hh / (d / 2)) * t + 0.06; m.quad([u0 - 0.35, vv, zz], [u1 + 0.35, vv, zz], [u1 + 0.35, vv + s2 * 0.14, zz + 0.1], [u0 - 0.35, vv + s2 * 0.14, zz + 0.1], dk, M.tile); } }
          else { const um = (u0 + u1) / 2; for (const [ue, s2] of [[u0 - 0.35, 1], [u1 + 0.35, -1]]) { const uu = ue + (um - ue) * t, zz = z + h - 0.35 * hh / (w / 2) + (hh + 0.35 * hh / (w / 2)) * t + 0.06; m.quad([uu, v0 - 0.35, zz], [uu, v1 + 0.35, zz], [uu + s2 * 0.14, v1 + 0.35, zz + 0.1], [uu + s2 * 0.14, v0 - 0.35, zz + 0.1], dk, M.tile); } } } }
    });
  }
  // 一根竖着的铜管烟囱：几节，接口粗一圈，顶上喇叭口
  function stack(m, u, v, z0, z1, r, col, seed) { m.cyl(u, v, z0, z1, r, r * 0.9, col, M.metal, 8); for (let zz = z0 + 2 + H(seed, 1) * 2; zz < z1 - 1; zz += 3.5 + H(seed, zz) * 2) m.cyl(u, v, zz, zz + 0.6, r * 1.25, r * 1.25, shade(col, 0.82), M.metal, 8); m.cyl(u, v, z1, z1 + 1.2, r * 0.9, r * 1.5, shade(col, 1.1), M.metal, 8, true, '#1e1a22'); }
  // 金色小轮子（竖着），面朝 yaw
  function wheel(m, u, v, z, r, yaw) { warp(m, [u, v, z], yaw, 0, Math.PI / 2, () => { m.cyl(u, v, z - 0.15, z + 0.15, r, r, HW.GOLD, M.metal, 14, false); m.cyl(u, v, z - 0.16, z + 0.16, r * 0.84, r * 0.84, '#3a2a20', 0, 14); m.cyl(u, v, z - 0.25, z + 0.25, r * 0.2, r * 0.2, HW.GOLD, M.metal, 8); for (let i = 0; i < 6; i++) { const a = (i / 6) * 3.1416; warp(m, [u, v, z], a, 0, 0, () => m.box(u - r * 0.85, v - 0.07, z - 0.1, u + r * 0.85, v + 0.07, z + 0.1, HW.GOLD, M.metal)); } }); }
  // 伸出去的桁架臂，头上一个小螺旋桨
  function truss(m, u, v, z, yaw, len) { warp(m, [u, v, z], yaw, 0, 0, () => { for (const dz of [0, 1.6]) m.box(u, v - 0.12, z + dz, u + len, v + 0.12, z + dz + 0.22, HW.GOLD, M.metal); for (let i = 0; i <= len; i += 0.9) { m.box(u + i, v - 0.1, z, u + i + 0.1, v + 0.1, z + 1.8, HW.GOLD, M.metal); m.quad([u + i, v, z + 0.2], [u + i + 0.1, v, z + 0.2], [u + i + 0.55, v, z + 1.6], [u + i + 0.45, v, z + 1.6], '#a8803a', M.metal); } m.cyl(u + len + 0.2, v, z - 0.6, z + 2.2, 0.2, 0.2, '#4a4450', M.metal, 6); for (const a of [0, 3.1416]) m.quad([u + len + 0.2, v, z + 2.2], [u + len + 0.2, v + 0.1, z + 2.2], [u + len + 0.2 + Math.cos(a) * 1.4, v + Math.sin(a) * 1.4 + 0.15, z + 2.4], [u + len + 0.2 + Math.cos(a) * 1.4, v + Math.sin(a) * 1.4 - 0.15, z + 2.4], '#d8d0c0', M.cloth); }); }
  // 红色鳞片翼：一片片往下垂的尖叶，从 (u,v,z) 沿 yaw 排开
  function fin(m, u, v, z, yaw, len, n, out) { warp(m, [u, v, z], yaw, 0, 0, () => { for (let i = 0; i < n; i++) { const a = u + (i * len) / n, b = a + len / n, hh = 5 + Math.sin((i / n) * Math.PI) * 4; m.quad([a, v, z], [b, v, z], [b - 0.2, v + out, z - hh + 1], [a + 0.1, v + out * 0.9, z - hh], i % 3 ? HW.WING : HW.WING2, M.cloth); m.tri([a, v, z + 0.1], [a + 0.15, v + out * 0.9, z - hh], [a + 0.1, v + out + 0.2, z - hh - 0.8], '#c8a050', M.metal); } }); }
  // 铆钉铜铁的大身子（一段一段圆台叠起来，接缝处一圈铆钉带）
  function hull(m, u, v, z0, segs, col) { let z = z0; segs.forEach(([r0, r1, h, du, dv], i) => { const cu = u + (du || 0), cv = v + (dv || 0); m.cyl(cu, cv, z, z + h, r0, r1, i % 2 ? col : shade(col, 0.9), M.metal, 16); m.cyl(cu, cv, z + h - 0.4, z + h, r1 + 0.12, r1 + 0.12, shade(col, 0.7), M.metal, 16); for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.2832; m.box(cu + Math.cos(a) * (r1 + 0.13) - 0.06, cv + Math.sin(a) * (r1 + 0.13) - 0.06, z + h - 0.3, cu + Math.cos(a) * (r1 + 0.13) + 0.06, cv + Math.sin(a) * (r1 + 0.13) + 0.06, z + h - 0.1, '#e0b070', M.metal); } z += h; }); return z; }
  // 浮岛后背的「身子」：三坨铆钉铜铁叠起来，后面挤满歪房子、铜管、圆顶（只在平台后面，不挡宠物走路）
  CA.HULLS = [[9, 3.4, 3], [16.6, 3, 3.3], [23.9, 3.7, 2.7]];
  function heap(m, o, c) {
    const { snow } = c, Z1 = CA.Z[1], Z2 = CA.Z[2], Z3 = CA.Z[3], tz = K.T.terrain, S = (u, v, z, w, d, h, x) => hut(m, u, v, z, w, d, h, Object.assign({ snow, seed: Math.round(u * 7 + v) }, x));
    const [A, B, Cc] = CA.HULLS;
    // —— 三坨身子 ——
    const zA = hull(m, A[0], A[1], tz(A[0], A[1]) - 2, [[A[2] * 0.8, A[2], 4], [A[2], A[2] * 1.06, 6], [A[2] * 1.06, A[2] * 1.04, 7, 0.1], [A[2] * 1.04, A[2], 7, -0.1], [A[2], A[2] * 0.95, 6, 0.1, -0.1], [A[2] * 0.95, A[2] * 0.92, 5]], HW.RUST);
    const zB = hull(m, B[0], B[1], tz(B[0], B[1]) - 2, [[B[2] * 0.85, B[2], 5], [B[2], B[2] * 1.05, 7], [B[2] * 1.05, B[2], 8, 0.1], [B[2], B[2] * 0.96, 7, -0.15, 0.1], [B[2] * 0.96, B[2] * 0.98, 7], [B[2] * 0.98, B[2] * 0.9, 5, 0.1]], HW.COP2);
    const zC = hull(m, Cc[0], Cc[1], tz(Cc[0], Cc[1]) - 2, [[Cc[2] * 0.8, Cc[2], 4], [Cc[2], Cc[2] * 1.08, 7], [Cc[2] * 1.08, Cc[2], 7, -0.1], [Cc[2], Cc[2] * 0.96, 6, 0.1]], HW.RUST2);
    // 身子上的砖块补丁、铆钉铁板、舷窗
    [[A, zA], [B, zB], [Cc, zC]].forEach(([h, zt], j) => { for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.2832 + H(i, j) * 0.3, zz = tz(h[0], h[1]) + 3 + H(j, i) * (zt - tz(h[0], h[1]) - 6), x = h[0] + Math.cos(a) * h[2] * 1.02, y = h[1] + Math.sin(a) * h[2] * 1.02; warp(m, [x, y, zz], a - Math.PI / 2, 0, 0, () => { if (i % 3 === 0) { m.box(x - 0.5, y, zz, x + 0.5, y + 0.12, zz + 1.6, HW.IRON2, M.metal); m.cyl(x, y + 0.1, zz + 0.4, zz + 1.2, 0.32, 0.32, '#2e2830', 0, 8); } else m.box(x - 0.7 - H(i, 3) * 0.5, y, zz, x + 0.6, y + 0.1, zz + 0.9 + H(3, i), i % 2 ? '#a8583e' : HW.IRON, i % 2 ? M.stone : M.metal); }); } });
    // —— 灰铁圆顶 ——
    dome(m, A[0] - 0.3, A[1], zA + 0.4, A[2] * 0.95, 1, [[1.2, 0.35, 2.2, 0.38], [2.4, 0.5, 1.6, 0.32], [0.3, 0.7, 1.4, 0.28]]);
    dome(m, Cc[0], Cc[1], zC + 0.4, Cc[2] * 0.95, 3, [[0.6, 0.4, 1.8, 0.34], [1.6, 0.55, 1.3, 0.3]]);
    // 左前角的小圆塔：铁身子 + 城垛 + 小圆顶
    { const [u, v, r] = [2.6, 19.4, 1.5], zt = hull(m, u, v, tz(u, v) - 1.5, [[r * 1.15, r * 1.05, 3], [r * 1.05, r, 6], [r, r * 1.1, 5]], HW.RUST); dome(m, u, v, zt + 0.3, r * 1.05, 5, [[0.9, 0.45, 1.3, 0.25]]); }
    // —— 中间那坨顶上：一圈城垛平台，上面挤满小房子 ——
    const zt = zB + 0.6; crenel(m, B[0], B[1], zt, B[2] + 0.6, HW.STONEW, 18);
    m.cyl(B[0], B[1], zt - 0.6, zt, B[2] + 0.4, B[2] + 0.4, '#9a8e7e', M.stone, 16);
    S(15.3, 2.4, zt, 3.4, 2.6, 6.2, { ax: 'u', yaw: 0.06, door: true });
    S(18.4, 2.2, zt, 2.2, 2.2, 11.5, { ax: 'v', yaw: -0.04, tu: 0.03, wall: HW.CREAM2 });
    S(14.4, 4.6, zt + 0.2, 2.6, 1.8, 4.2, { ax: 'u', yaw: -0.12, tv: 0.05, shut: '#b8503c' });
    S(17.9, 4.8, zt, 1.6, 1.6, 6.8, { rt: 'c', wall: '#b8683e', roof: HW.SHING, cross: true, yaw: 0.2 });
    S(15.6, 2.6, zt + 8.6, 2.2, 1.8, 4, { ax: 'v', yaw: 0.25, tu: -0.06, roof: HW.TILE2 });
    S(18.4, 2.4, zt + 15.6, 1.6, 1.6, 3, { rt: 'h', wall: HW.CREAM });
    S(13.2, 2.8, zt + 0.1, 1.4, 1.6, 7.5, { rt: 'c', wall: HW.CREAM2, roof: HW.TILE, yaw: -0.3 });
    // 左边那坨身子的侧面：几栋悬挑出去的小房子，底下撑着斜木头
    for (const [u, v, z, w, d, h, x] of [[5.4, 3.6, Z2 - 3, 2.4, 2.8, 5, { ax: 'v', yaw: 0.18, tu: -0.05 }], [5.6, 5.2, Z1 + 1, 2, 2.2, 4.2, { ax: 'u', yaw: -0.1, shut: '#b8503c' }], [6.4, 1.6, zA - 4, 1.8, 2, 4.4, { ax: 'v', yaw: 0.3, roof: HW.SHING }]]) { S(u, v, z, w, d, h, x); m.quad([u - 0.3, v, z], [u + 0.3, v, z], [u + 1.6, v - 0.2, z - 3], [u + 1.2, v - 0.2, z - 3], TIMBER, 2); }
    // 背面也挤满：屋子背朝外悬挑着，配铁皮补丁和小烟囱
    for (const [u, v, z, w, d, h, x] of [[9.4, 0.2, Z1 + 1, 2.6, 2, 4.6, { ax: 'u', yaw: Math.PI + 0.1 }], [16, -0.2, Z2 - 1, 3, 2.2, 5.4, { ax: 'u', yaw: Math.PI - 0.12, shut: '#b8503c' }], [22.8, 1, Z1 + 5, 2.2, 2, 4.4, { ax: 'v', yaw: Math.PI + 0.2, roof: HW.SHING }], [12.6, 0.8, Z2 + 7, 2, 1.8, 4, { ax: 'u', yaw: Math.PI - 0.25, tv: 0.05 }], [19.6, 0.4, Z2 + 9, 1.8, 1.8, 6, { rt: 'c', wall: '#b8683e', roof: HW.SHING, yaw: Math.PI }], [5.6, 1.6, Z1 - 2, 1.8, 2, 4, { ax: 'v', yaw: Math.PI * 0.75, roof: HW.TILE2 }], [26.2, 3, Z2 + 2, 1.8, 2, 4.2, { ax: 'u', yaw: -Math.PI * 0.6 }]]) { S(u, v, z, w, d, h, x); m.quad([u - 0.3, v, z], [u + 0.3, v, z], [u + 0.2, v + 1.4, z - 3], [u - 0.2, v + 1.4, z - 3], TIMBER, 2); }
    for (const [u, v, z0, z1, r, col] of [[8, -0.4, Z1 + 3, Z2 + 6, 0.5, HW.COP], [14.4, -0.6, Z1 + 6, zB - 1, 0.6, HW.RUST], [24.6, 0.6, Z1 + 2, Z2 + 8, 0.45, HW.COP2]]) stack(m, u, v, z0, z1, r, col, u * 3 + v);
    fin(m, 18.6, -0.6, Z1 + 2, Math.PI, 6, 6, 1.1);
    // 右边那坨的侧面：带条纹遮阳棚和金色栏杆小阳台的房子
    S(26.6, 4.6, Z1 + 3.5, 2.2, 2.6, 4.6, { ax: 'v', yaw: -0.08, awn: true, bal: true, roof: HW.TILE2 });
    S(25.8, 1.6, zC - 2, 2, 2.2, 4.4, { ax: 'u', yaw: 0.2, tv: -0.04 });
    // —— 铜管烟囱一丛一丛（贴着身子后背往上冲）——
    for (const [u, v, z0, z1, r, col] of [[11.6, 1.2, Z1, zA + 6, 0.55, HW.COP], [12.4, 2.4, Z2, zA + 9, 0.7, HW.COP2], [21, 1.4, Z2, zt + 9, 0.6, HW.COP], [21.6, 2.6, Z2 + 3, zt + 4, 0.45, HW.RUST], [20.4, 0.6, Z3, zt + 13, 0.5, HW.COP2], [26.6, 2.6, Z2, zC + 7, 0.55, HW.COP], [7.4, 0.8, Z2, zA + 3, 0.42, HW.RUST]]) stack(m, u, v, z0, z1, r, col, u + v);
    // 歪着伸出去的几根粗管子
    pipeOut(m, A[0] - A[2], A[1] + 0.6, Z1 + 4, Math.PI * 0.95, 2.6, 0.55, HW.COP, 0.25);
    pipeOut(m, Cc[0] + Cc[2], Cc[1] + 0.4, Z1 + 6, 0.15, 2.2, 0.5, HW.RUST, 0.1);
    pipeOut(m, B[0] + 1.4, B[1] - B[2], Z2 + 2, -Math.PI / 2, 1.8, 0.45, HW.COP2, -0.2);
    // —— 金色桁架臂 + 小螺旋桨、金轮子 ——
    truss(m, A[0] - A[2] + 0.2, A[1] + 1, Z2 + 1, Math.PI, 5.5);
    truss(m, Cc[0] + Cc[2] - 0.2, Cc[1] + 0.5, zC - 3, -0.1, 4.5);
    truss(m, 3.4, 12.6, Z1 - 1.4, Math.PI * 1.02, 4);
    wheel(m, A[0] - A[2] - 0.3, A[1] + 1.4, Z2 - 1, 1.5, Math.PI / 2);
    wheel(m, 4.6, 18.9, Z1 - 3.2, 1.2, 0);
    wheel(m, Cc[0] + 1, Cc[1] + Cc[2] + 0.1, Z2 + 3, 1.3, 0);
    // —— 红色鳞片翼：左边窝楼底下一排，右边瞭望台底下一排 ——
    fin(m, 3.2, 8.2, Z1 - 0.8, Math.PI / 2, 10, 10, 1.3);
    fin(m, 25.9, 21.2, Z3 - 1.2, -Math.PI / 2, 6.5, 6, 1.4);
    fin(m, A[0] - 2.4, A[1] - A[2], Z2 - 1, Math.PI, 4, 4, 1);
    // 窝楼前沿底下吊着两栋小房子（悬在小河上空），像挂在浮岛肚子上
    { const W1 = CA.WING1; hut(m, W1[0] + 2, W1[3] - 1.2, Z1 - 6.4, 2.4, 2, 4.4, { ax: 'u', snow, seed: 21, yaw: 0.08, tv: 0.04 }); hut(m, W1[0] + 6, W1[3] - 1, Z1 - 5.6, 2, 1.8, 3.8, { ax: 'v', snow, seed: 22, yaw: -0.1, roof: HW.TILE2 }); for (const u of [W1[0] + 2, W1[0] + 6]) m.box(u - 0.08, W1[3] - 1.1, Z1 - 3, u + 0.08, W1[3] - 0.9, Z1 - 1.5, '#3a3448', M.metal); }
    // 屋顶之间拉的晾衣绳和小旗
    for (let k = 0; k < 7; k++) { const t = k / 6, u = 13.4 + t * 5, v = 4.4 - t * 0.4, zz = zt + 5.2 - Math.sin(t * Math.PI) * 0.9; m.tri([u - 0.3, v, zz], [u + 0.3, v, zz], [u, v, zz - 0.9], ['#e0604a', '#ffd36a', '#5aa6d8', '#f4ead8'][k % 4], M.cloth); }
  }
  function castle(m, o, c) {
    const { LEAF, IVY, HED, bloom, snow } = c, Z1 = CA.Z[1], Z2 = CA.Z[2], Z3 = CA.Z[3], TK = CA.TRUNK, tz = K.T.terrain;
    // 平台边上的栏杆换成矮矮的石头城垛（楼梯扶手不动）
    const rail0 = m.rail; m.rail = function (u0, v0, u1, v1, z, h, col) { if (h !== 3 && h !== 2.8) return rail0.call(this, u0, v0, u1, v1, z, h, col); const L = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.round(L / 1.3)), du = (u1 - u0) / L, dv = (v1 - v0) / L, tw = 0.22;
      this.box(Math.min(u0, u1) - tw, Math.min(v0, v1) - tw, z, Math.max(u0, u1) + tw, Math.max(v0, v1) + tw, z + 1.1, HW.STONEW, M.stone);
      for (let i = 0; i < n; i += 2) { const a = u0 + du * (i * L / n), b = v0 + dv * (i * L / n), e = u0 + du * Math.min(L, (i + 1) * L / n), f = v0 + dv * Math.min(L, (i + 1) * L / n); this.box(Math.min(a, e) - tw, Math.min(b, f) - tw, z + 1.1, Math.max(a, e) + tw, Math.max(b, f) + tw, z + 1.9, shade(HW.STONEW, 1.08), M.stone); } return this; };
    const BARK = o.season === 'winter' ? '#6a4a36' : '#7a5236', RAIL = '#8a5e3c';
    // —— 中间那根老树干换成一束铜管：从一层露台一直冲到最顶上，冒烟 ——
    for (const [du, dv, r, top, col] of [[-0.6, -0.5, 0.75, Z3 + 15, HW.COP], [0.7, -0.4, 0.6, Z3 + 11, HW.COP2], [0.1, 0.75, 0.55, Z3 + 8, HW.RUST], [-0.8, 0.6, 0.45, Z3 + 13, HW.COP2]]) stack(m, TK.u + du, TK.v + dv, Z1 - 0.6, top, r, col, du * 9 + dv);
    for (const zz of [Z1 + 4, Z2 + 3, Z3 + 3]) m.cyl(TK.u, TK.v, zz, zz + 0.6, TK.r * 1.05, TK.r * 1.05, HW.IRON2, M.metal, 12);
    heap(m, o, c);
    // —— 一层屋顶 = 露台（lv1）——
    const T1 = CA.T1; slab(m, T1, Z1, '#8a6448'); for (let u = T1[0] + 1; u < T1[2]; u += 1.8) m.box(u, T1[1], Z1 + 0.01, u + 0.06, T1[3], Z1 + 0.03, '#8a5e3c', 0);
    m.rail(T1[0] + 0.2, T1[3], 15.2, T1[3], Z1, 3, RAIL); m.rail(24.6, T1[3], T1[2], T1[3], Z1, 3, RAIL); hedge(m, 15.6, T1[3] - 0.5, 24.2, T1[3] - 0.5, Z1, HED, 61, 0.6);
    const L1 = CA.LAND1; slab(m, L1, Z1, '#a8784a'); posts(m, [[L1[2] - 0.2, L1[1] + 0.2]], 0, Z1 - 0.6, TIMBER, 0.2); m.rail(L1[2], L1[1], L1[2], L1[3], Z1, 3, RAIL); m.rail(L1[0], L1[1], L1[2], L1[1], Z1, 3, RAIL);
    { const R = CA.R01; m.stairs(R.lo, R.hi, R.u0, R.u1, 0, Z1, 'v', '#9a6a44', 16, true); m.rail(R.u1 + 0.1, R.lo, R.u1 + 0.1, R.hi, 0, 3.2, RAIL); for (const v of [R.lo - 2.5, (R.lo + R.hi) / 2]) posts(m, [[R.u1 - 0.1, v]], 0, (Z1 * (R.lo - v)) / (R.lo - R.hi) - 1.2, TIMBER, 0.15); }
    // —— 左边的「窝楼」：架在小河上的高脚木台，两层，和露台、二层连成一片 ——
    const W1 = CA.WING1;
    slab(m, W1, Z1, '#8e6a4c');
    for (const [u, v] of [[W1[0] + 0.3, W1[1] + 0.3], [W1[0] + 0.3, W1[3] - 0.3], [W1[0] + 4.2, W1[3] - 0.3], [W1[2] - 0.6, W1[3] - 0.3], [W1[0] + 4.2, W1[1] + 0.3], [W1[2] - 0.6, W1[1] + 0.3]]) { const gz = tz(u, v) - 1; m.box(u - 0.26, v - 0.26, gz, u + 0.26, v + 0.26, Z1 - 0.6, TIMBER, 2); m.cyl(u, v, gz, gz + 1.2, 0.5, 0.3, STONE2, M.stone, 6); }
    for (const [a, b] of [[W1[0] + 0.3, W1[1] + 0.3], [W1[0] + 0.3, W1[3] - 0.3]]) m.quad([a, b, tz(a, b) + 1.5], [a, b + 0.2, tz(a, b) + 1.5], [a + 4, b + 0.2, Z1 - 1.2], [a + 4, b, Z1 - 1.2], TIMBER, 2);
    m.rail(W1[0], W1[1], W1[0], W1[3], Z1, 3, RAIL); m.rail(W1[0], W1[3], W1[2], W1[3], Z1, 3, RAIL); m.rail(W1[0], W1[1], W1[2], W1[1], Z1, 3, RAIL);
    if (!snow) for (let i = 0; i < 5; i++) m.vine([[W1[0] + 1 + i * 1.9, W1[3] + 0.1, Z1 - 0.9], [W1[0] + 1.3 + i * 1.9, W1[3] + 0.2, Z1 - 1.4]], { cols: IVY, seed: i + 520, gap: 0.6, ls: 0.6, drop: 3 + (i % 3) * 2, bloom: i % 2 ? bloom : null });
    m.box(10.1, 17.1, Z1, 11.2, 18.2, Z1 + 1.2, '#8a5e3c', M.plank); m.foliage(10.65, 17.65, Z1 + 1.8, 0.7, 1.2, ['#f2a6c2', '#5aa64e', '#86cc6a'], 14, 7, 0.5); // 花盆
    // —— 厨房 ——
    const KI = CA.KIT; m.box(KI.u0, KI.v0, Z1, KI.u1, KI.v1, Z1 + KI.h, '#f0d8b8', M.plaster); m.box(KI.u0 - 0.1, KI.v0 - 0.1, Z1, KI.u1 + 0.1, KI.v1 + 0.1, Z1 + 1.6, '#b8705a', M.stone);
    for (const t of [0, 1]) m.box(KI.u0 + t * (KI.u1 - KI.u0) - 0.2, KI.v1, Z1, KI.u0 + t * (KI.u1 - KI.u0) + 0.2, KI.v1 + 0.22, Z1 + KI.h, TIMBER, 2);
    m.pk(PICK.kdoor); denDoor(new LT(m, KI.door, KI.v1 - 0.01, 0, Z1), 0, 2, 5, '#5a8a6a'); m.pk(0);
    m.win('v', 12.9, 13.9, Z1 + 3.4, Z1 + 6.6, KI.v1, { shut: '#5a8a6a', box: FLOW[1] });
    m.win('u', 10.4, 12.6, Z1 + 3.4, Z1 + 6.6, KI.u1, {});
    m.quad([KI.u0 - 0.2, KI.v1 + 1.5, Z1 + KI.h - 2], [KI.u1 + 0.2, KI.v1 + 1.5, Z1 + KI.h - 2], [KI.u1 + 0.2, KI.v1, Z1 + KI.h - 0.8], [KI.u0 - 0.2, KI.v1, Z1 + KI.h - 0.8], '#d8a040', M.cloth);
    { const C = CA.CHIM; m.box(C.u - 0.8, C.v - 0.8, Z1, C.u + 0.8, C.v + 0.8, Z2 + 8, '#b8705a', M.stone); m.box(C.u - 1, C.v - 1, Z2 + 8, C.u + 1, C.v + 1, Z2 + 8.8, STONE2, M.stone); m.cyl(C.u, C.v, Z2 + 8.8, Z2 + 10.4, 0.45, 0.35, '#3a3448', M.metal, 7); K.CHIMNEY = [C.u, C.v, Z2 + 10.4]; }
    // —— 浴室：小木屋，舷窗、铜管 ——
    const BA = CA.BATH; m.box(BA.u0, BA.v0, Z1, BA.u1, BA.v1, Z1 + BA.h, '#cfe0e8', M.plaster); for (let i = 0; i < 6; i++) m.box(BA.u0, BA.v1, Z1 + 0.6 + i * 1.4, BA.u1, BA.v1 + 0.12, Z1 + 0.7 + i * 1.4, '#a8c0cc', 0);
    m.pk(PICK.bdoor); denDoor(new LT(m, BA.door, BA.v1 - 0.01, 0, Z1), 0, 1.7, 4.8, '#4a8ac8', { lamp: false }); m.pk(0);
    m.disc(BA.u1 + 0.05, (BA.v0 + BA.v1) / 2, Z1 + 5.4, 0.7, 'u', '#b0704a', M.metal, 10); m.disc(BA.u1 + 0.1, (BA.v0 + BA.v1) / 2, Z1 + 5.4, 0.52, 'u', '#cfeaf8', M.glass, 10);
    m.cyl(BA.u1 - 0.5, BA.v1 - 0.3, Z1, Z3 - 0.6, 0.2, 0.2, COPPER, M.metal, 6);
    // —— 二层（lv2）——
    const P2 = CA.P2, L2 = CA.LAND2; slab(m, P2, Z2, '#94704e'); slab(m, L2, Z2, '#94704e');
    for (let u = P2[0] + 0.9; u < P2[2]; u += 1.5) m.box(u, P2[1], Z2 + 0.01, u + 0.05, P2[3], Z2 + 0.03, '#9a6a44', 0);
    for (const [u, v] of [[P2[2] - 0.3, P2[3] - 0.3], [L2[0] + 0.3, L2[3] - 0.3], [L2[2] - 0.3, L2[3] - 0.3], [P2[2] - 0.3, P2[1] + 0.3]]) { m.cyl(u, v, Z1 - 0.6, Z2 - 0.6, 0.3, 0.3, HW.COP2, M.metal, 8); m.cyl(u, v, Z1 + 3, Z1 + 3.5, 0.4, 0.4, HW.IRON2, M.metal, 8); }
    m.rail(L2[0], L2[3], L2[0], P2[3], Z2, 2.8, RAIL); m.rail(P2[0], P2[3], L2[0], P2[3], Z2, 2.8, RAIL); m.rail(L2[2], P2[3], P2[2], P2[3], Z2, 2.8, RAIL); m.rail(P2[0], P2[1], P2[0], P2[3], Z2, 2.8, RAIL); m.rail(P2[2], P2[1], P2[2], P2[3], Z2, 2.8, RAIL); m.rail(L2[2], L2[1], L2[2], L2[3], Z2, 2.8, RAIL); m.rail(P2[0], P2[1], P2[2], P2[1], Z2, 2.8, RAIL);
    if (!snow) for (let i = 0; i < 6; i++) m.vine([[P2[0] + 6 + i * 1.6, P2[3] + 0.1, Z2 - 0.9], [P2[0] + 6.3 + i * 1.6, P2[3] + 0.2, Z2 - 1.4]], { cols: IVY, seed: i + 500, gap: 0.6, ls: 0.6, drop: 3 + (i % 3) * 1.5, bloom: i % 2 ? bloom : null });
    { const R = CA.R12; m.stairs(R.lo, R.hi, R.v0, R.v1, Z1, Z2, 'u', '#9a6a44', 14, true); m.rail(R.lo, R.v0 - 0.1, R.hi, R.v0 - 0.1, Z1, 2.6, RAIL); }
    // —— 瞭望台（lv3）：在前面右边高高架起来；楼梯从二层的前平台斜着上去 ——
    const P3 = CA.P3; slab(m, P3, Z3, '#9a7452');
    for (const [u, v] of [[P3[0] + 0.3, P3[3] - 0.3], [P3[2] - 0.3, P3[3] - 0.3], [P3[2] - 0.3, P3[1] + 0.3], [P3[0] + 0.3, P3[1] + 0.3]]) { m.cyl(u, v, Z1 - 0.6, Z3 - 0.6, 0.32, 0.32, HW.COP2, M.metal, 8); for (const zz of [Z1 + 4, Z2 + 2]) m.cyl(u, v, zz, zz + 0.5, 0.42, 0.42, HW.IRON2, M.metal, 8); } m.quad([P3[0] + 0.3, P3[1] + 0.3, Z1 + 1], [P3[0] + 0.3, P3[1] + 0.6, Z1 + 1], [P3[2] - 0.3, P3[3] - 0.6, Z3 - 1], [P3[2] - 0.3, P3[3] - 0.3, Z3 - 1], TIMBER, 2);
    m.box(P3[2] - 0.55, P3[3] - 0.55, -0.4, P3[2] - 0.05, P3[3] - 0.05, Z1 - 0.6, TIMBER, 2);
    { const R = CA.R23; m.stairs(R.lo, R.hi, R.v0, R.v1, Z2, Z3, 'u', '#9a6a44', 14, true); m.rail(R.lo, R.v1 + 0.1, R.hi, R.v1 + 0.1, Z2, 2.6, RAIL); }
    m.rail(P3[0], P3[1], P3[2], P3[1], Z3, 3, RAIL); m.rail(P3[0], P3[3], P3[2], P3[3], Z3, 3, RAIL); m.rail(P3[2], P3[1], P3[2], 13.2, Z3, 3, RAIL); m.rail(P3[2], 15.2, P3[2], P3[3], Z3, 3, RAIL); m.rail(P3[0], P3[1], P3[0], 18.2, Z3, 3, RAIL);
    { const B = CA.BOILER; m.cyl(B.u, B.v, Z3, Z3 + 4.2, 0.85, 0.85, COPPER, M.metal, 12); m.cyl(B.u, B.v, Z3 + 4.2, Z3 + 4.9, 0.85, 0.4, '#8a5a3a', M.metal, 12); for (const hh of [1, 3]) m.cyl(B.u, B.v, Z3 + hh, Z3 + hh + 0.25, 0.9, 0.9, '#4a4652', M.metal, 12); m.disc(B.u, B.v + 0.85, Z3 + 1.8, 0.32, 'v', '#ff9a4a', M.glow, 8); m.cyl(B.u - 0.3, B.v, Z3 + 4.9, Z3 + 8, 0.26, 0.26, '#4a4652', M.metal, 6); K.STEAM = [B.u - 0.3, B.v, Z3 + 8]; }
    // 热气球码头：从瞭望台右边伸出去的木栈桥，气球拴在桥头（在玻璃花房上空）
    const BL = K.BALLOON; m.box(P3[2], BL.v - 0.9, Z3 - 0.5, BL.u + 1.4, BL.v + 0.9, Z3, '#b88a5a', M.plank); m.box(BL.u + 1.2, BL.v - 0.9, Z3 - 2.6, BL.u + 1.5, BL.v - 0.6, Z3 + 2.6, TIMBER, 2);
    m.pk(PICK.balloon); m.box(BL.u - 0.9, BL.v - 0.9, Z3, BL.u + 0.9, BL.v + 0.9, Z3 + 2.2, '#c89a5a', M.cloth); m.box(BL.u - 1, BL.v - 1, Z3 + 2.2, BL.u + 1, BL.v + 1, Z3 + 2.6, DARK, 2);
    if (!o.tripping) { for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.quad([BL.u + a * 0.9 - 0.04, BL.v + b * 0.9, Z3 + 2.6], [BL.u + a * 0.9 + 0.04, BL.v + b * 0.9, Z3 + 2.6], [BL.u + a * 1.5 + 0.04, BL.v + b * 1.5, Z3 + 8], [BL.u + a * 1.5 - 0.04, BL.v + b * 1.5, Z3 + 8], '#d8c8a0', 0); m.blob(BL.u, BL.v, Z3 + 13, 3, 7, '#e8705a', M.cloth, 4, 6, 10); m.blob(BL.u, BL.v, Z3 + 13.4, 3.05, 2.6, '#ffd36a', M.cloth, 4, 4, 10); }
    m.pk(0);
    // 窝楼通到圆塔的一小段吊桥
    { const [u, v] = CA.TOWERS[0]; for (let k = 0; k < 6; k++) { const a = CA.WING1[0] + 0.2, t0 = k / 6, t1 = (k + 0.85) / 6, sag = Math.sin(((t0 + t1) / 2) * Math.PI) * 0.6; m.box(a - 0.8 + (u + 1 - a) * 0, CA.WING1[3] - 0.2 + (v - 1.4 - CA.WING1[3]) * t0, Z1 - 0.7 - sag, a + 0.4, CA.WING1[3] - 0.2 + (v - 1.4 - CA.WING1[3]) * t1, Z1 - 0.5 - sag, '#a8784a', M.plank); } }
    // 二层前沿挂一串小灯笼、几面三角小旗
    { const P2 = CA.P2; for (let k = 0; k < 9; k++) { const u = P2[0] + 1 + k * 1.8, v = P2[3] + 0.15, sag = Math.sin((k / 8) * Math.PI) * 0.8; if (k % 2) m.box(u - 0.22, v - 0.22, Z2 - 2.4 - sag, u + 0.22, v + 0.22, Z2 - 1.8 - sag, '#ffe9a8', M.glow); else m.tri([u - 0.5, v, Z2 - 1.3 - sag], [u + 0.5, v, Z2 - 1.3 - sag], [u, v, Z2 - 2.4 - sag], ['#e0604a', '#ffd36a', '#5aa6d8', '#f2a6c2'][k % 4], M.cloth); } }
    // —— 平台上的小房子：木筋灰泥墙、窗、门、陡屋顶，屋顶上长苔藓 ——
    CA.BLOCKS.forEach(([lv, u0, v0, u1, v1, h, wc, rc, ax], i) => { const z = lv ? CA.Z[lv] : 0;
      hut(m, (u0 + u1) / 2, (v0 + v1) / 2, z, u1 - u0, v1 - v0, h, { wall: [HW.CREAM, '#d8b890', HW.CREAM2, '#c8a078'][i % 4], roof: [HW.TILE, HW.SHING, HW.TILE2, HW.TILE][i % 4], ax, snow, seed: i, awn: i === 2, door: true, chim: i === 1, yaw: [0.02, -0.03, 0.04, -0.05, 0.08, -0.1][i], tv: [0, 0.03, -0.02, 0.04, -0.03, 0.05][i], tu: [0, 0, 0, 0, 0.04, -0.04][i] });
      if (i === 4) hut(m, u0 + 1.4, v0 + 1.6, z + h + 2.2, 1.6, 1.8, 3.6, { ax: 'v', yaw: -0.25, snow, seed: 14, roof: HW.TILE2, wall: HW.CREAM2 });
      const top = z + h + ((ax === 'u' ? v1 - v0 : u1 - u0) * 0.85) * 0.55;
      if (i === 0) hut(m, u0 + 1.6, v0 + 1.1, top - 1.2, 2, 1.8, 3.6, { ax: 'v', yaw: 0.22, tu: 0.06, snow, seed: 11, roof: HW.TILE2 });
      if (i === 1) { hut(m, u0 + 1.8, v0 + 1, top - 1.5, 2.4, 1.6, 4.4, { ax: 'u', yaw: -0.15, tv: -0.05, snow, seed: 12, wall: '#d8b890' }); hut(m, u1 - 1.4, v0 + 1.2, top - 1, 1.3, 1.3, 5, { rt: 'c', roof: HW.SHING, wall: '#b8683e', snow, cross: true, yaw: 0.3 }); }
      if (i === 2) hut(m, u0 + 1.2, v0 + 1, top - 1, 1.6, 1.4, 3.2, { rt: 'h', snow, seed: 13, yaw: 0.12 });
      if (!snow) for (let k = 0; k < 6; k++) m.leaf([u0 + H(k, i) * (u1 - u0), v0 + 0.5 + H(i, k) * (v1 - v0 - 1), z + h + 1 + H(k + 3, i)], H(k, 9) * 6, 0.15, 0.6, k % 3 ? '#6a9a50' : '#8ab860', 0.2); });
    // 花房右边的空地：接雨水的木水塔、堆肥箱、一小片花圃
    { const u = 39, v = 18.2, z = tz(u, v); posts(m, [[u - 1.2, v - 1.2], [u + 1.2, v - 1.2], [u - 1.2, v + 1.2], [u + 1.2, v + 1.2]], z, 6, TIMBER, 0.2); m.cyl(u, v, z + 6, z + 10, 1.8, 1.8, '#a8784a', M.plank, 12); for (const hh of [6.6, 9.2]) m.cyl(u, v, z + hh, z + hh + 0.3, 1.85, 1.85, '#4a4652', M.metal, 12); m.cyl(u, v, z + 10, z + 11.4, 2, 0.3, '#5a7a8a', M.tile, 12); m.cyl(u + 1.6, v, z + 1, z + 7, 0.14, 0.14, COPPER, M.metal, 6); }
    { const u = 43, v = 16.6, z = tz(u, v); m.box(u - 1.4, v - 1, z, u + 1.4, v + 1, z + 1.8, '#8a5e3c', M.plank, '#5a4030', M.soil); for (let i = 0; i < 4; i++) m.box(u - 1.4 + i * 0.9, v + 0.95, z + 0.2, u - 1.1 + i * 0.9, v + 1.05, z + 1.6, '#6a4a34', 0); }
    for (let i = 0; i < 7; i++) { const u = 37.4 + (i % 4) * 1.6, v = 10.4 + Math.floor(i / 4) * 1.6, z = tz(u, v); if (!snow) bush(m, u, v, z, 0.45, HED, 700 + i, true); }
    // —— 每只动物自己的窝 ——
    m.rail = rail0;
    (o.dens || []).forEach((sp, i) => { const d = CA.DENS[i]; if (!d || !sp) return; m.pk(CA.PICK_DEN + i); den(m, sp, d, CA.denZ(d), snow); m.pk(0); });
  }
  const sea2col = (s) => (s === 'winter' ? '#6a4a36' : '#7a5236');

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
    // —— 底座：岩石和泥土往下收成一个尖，树根垂下来，里面嵌着一点黄铜管子和舷窗（像浮岛的底） ——
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
    m.pk(PICK.river);
    ribbon(Tt.RIVER, 0.7, 0.95, 0.55);
    m.pk(PICK.fish);
    { // 水塘：不规则的一汪水
      const n = 40, P = K.POND, pts = []; for (let i = 0; i <= n; i++) { const a = (i / n) * 6.2832, k = 1 + 0.12 * Math.sin(3 * a + 1) + 0.08 * Math.sin(5 * a); pts.push([P.cu + Math.cos(a) * P.ru * k, P.cv + Math.sin(a) * P.rv * k, P.z]); }
      for (let i = 0; i < n; i++) m.tri([P.cu, P.cv, P.z], pts[i], pts[i + 1], WC, WM);
    }
    m.pk(0);
    // 出水口只铺到岛边为止（以前会伸出岛外一截再直角折下去）
    const OUTC = (() => { const O = Tt.OUTLET, out = [O[0]]; for (let i = 1; i < O.length; i++) { const [au, av] = out[out.length - 1], [bu, bv] = O[i]; let k = 0; for (; k <= 1.0001; k += 0.02) { const u = au + (bu - au) * k, v = av + (bv - av) * k; if (!Tt.inIsle(u, v, 0.05)) break; } if (k <= 1) { out.push([au + (bu - au) * Math.max(0, k - 0.02), av + (bv - av) * Math.max(0, k - 0.02)]); return out; } out.push(O[i]); } return out; })();
    ribbon(OUTC, 0.6, 0.7, 0.4);
    { // 瀑布：水从出水口顺着抛物线翻过岛边落下去（起点和小河水面相切，不再是直角折下去）
      const O = OUTC, [u, v] = O[O.length - 1], [pu, pv] = O[O.length - 2], dl = Math.hypot(u - pu, v - pv) || 1, du = (u - pu) / dl, dv = (v - pv) / dl, nu = -dv, nv = du;
      const z0 = tz(u, v) + 0.3, N = 14, C1 = snow ? '#dcecf6' : '#9adcf6', C2 = snow ? '#e8f2fa' : '#c4ecfb';
      // 顺着小河流出去的方向往前抛：水平走得越来越慢、往下掉得越来越快
      const at = (t) => { const f = 1.2 * Math.sqrt(t); return [u + du * f, v + dv * f, z0 - (z0 + 16) * t * t, 0.62 + 0.35 * t]; };
      for (let i = 0; i < N; i++) { const [ua, va, za, wa] = at(i / N), [ub, vb, zb, wb] = at((i + 1) / N); m.quad([ua + nu * wa, va + nv * wa, za], [ua - nu * wa, va - nv * wa, za], [ub - nu * wb, vb - nv * wb, zb], [ub + nu * wb, vb + nv * wb, zb], i % 3 === 1 ? C2 : C1, WM); }
      // 翻过岛边那一下的白色水花
      if (!snow) for (const [a, b, r] of [[-0.5, 0.25, 0.32], [0.45, 0.35, 0.28], [0, 0.55, 0.26]]) m.blob(u + nu * a + du * b, v + nv * a + dv * b, z0 - 0.15, r, 0.7, '#f4fbff', WM);
      const e = at(1); K.FALL = [e[0], e[1], -16]; }
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
    m.box(S.u0, S.v0, z0, S.u1, S.v1, z1, '#b07a5a', M.stone); for (let zz = z0 + 2.4; zz < z1 - 0.5; zz += 2.6) { m.box(S.u0 - 0.06, S.v1, zz, S.u1 + 0.06, S.v1 + 0.1, zz + 0.3, '#7c4632', M.metal); m.box(S.u1, S.v0, zz, S.u1 + 0.1, S.v1 + 0.06, zz + 0.3, '#7c4632', M.metal); }
    castle(m, o, { LEAF, IVY, HED, ROOF, RM, bloom, snow, sea });
    const du = K.DOOR.u;
    m.pk(PICK.door); m.box(du - 1.1, S.v1, z0, du + 1.1, S.v1 + 0.22, z0 + 7.6, '#8a5a3a', M.plank); m.box(du - 1.35, S.v1 + 0.05, z0, du - 1.1, S.v1 + 0.34, z0 + 8, TIMBER, 2); m.box(du + 1.1, S.v1 + 0.05, z0, du + 1.35, S.v1 + 0.34, z0 + 8, TIMBER, 2); m.box(du - 1.5, S.v1 + 0.05, z0 + 7.6, du + 1.5, S.v1 + 0.4, z0 + 8.4, TIMBER, 2); m.disc(du, S.v1 + 0.26, z0 + 5.6, 0.36, 'v', '#ffe9a8', M.glass, 8); m.box(du + 0.6, S.v1 + 0.22, z0 + 3.4, du + 0.78, S.v1 + 0.36, z0 + 3.8, '#c8a050', M.metal); m.pk(0);
    m.box(du - 1.6, S.v1, -0.2, du + 1.6, S.v1 + 1.5, z0 + 0.3, STONE, M.stone); m.box(du + 1.6, S.v1 + 0.3, z0 + 6.4, du + 2, S.v1 + 0.7, z0 + 7.6, '#ffe9a8', M.glow);
    m.quad([du - 2, S.v1, z0 + 8.6], [du + 2, S.v1, z0 + 8.6], [du + 2, S.v1 + 1.7, z0 + 7.8], [du - 2, S.v1 + 1.7, z0 + 7.8], ROOF2, RM);
    S.fv.forEach((t) => { const c = S.u0 + t * uL; m.win('v', c - 0.9, c + 0.9, z0 + 4, z0 + 8, S.v1, { shut: '#5a7a8a', box: FLOW[2] }); });
    S.fu.forEach((t) => { const c = S.v0 + t * vL; m.win('u', c - 0.9, c + 0.9, z0 + 4, z0 + 8, S.u1, { shut: '#5a7a8a' }); });
    // 木桶、木箱、柴堆（靠着屋子侧面）
    for (const [u, v, h] of [[11.2, 18.6, 2.4], [10.6, 17.1, 2]]) { m.cyl(u, v, 0, h, 0.7, 0.75, '#8a5e3c', M.plank, 9); m.cyl(u, v, h * 0.3, h * 0.3 + 0.2, 0.78, 0.78, '#4a4652', M.metal, 9); }
    // 爬藤、屋顶的苔藓
    m.vine([[S.u0 + 0.4, S.v1 + 0.3, z0], [S.u0 + 0.6, S.v1 + 0.5, z0 + 6], [S.u0 + 2.4, S.v1 + 0.6, z1 - 0.5]], { cols: IVY, seed: 2, gap: 0.5, ls: 0.6 });
    m.vine([[S.u1 + 0.2, S.v1 - 0.5, z0], [S.u1 + 0.3, S.v1 - 1, z0 + 7], [S.u1 + 0.4, S.v1 - 3, z1 - 0.5]], { cols: IVY, seed: 5, gap: 0.5, ls: 0.6 });
    m.vine([[S.u0, S.v1 + 0.5, z1 - 0.2], [S.u1, S.v1 + 0.5, z1 - 0.2]], { cols: IVY, seed: 7, gap: 1.1, ls: 0.5, drop: 4, bloom });

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
    for (const [u, v, s, k] of [[5, 5, 1, 'pine'], [10.4, 4.4, 0.8, 'birch'], [2.8, 16, 0.75, 'pine'], [38.2, 4.2, 0.85, 'pine'], [42.4, 8, 0.7, 'birch'], [23.4, 2.6, 0.75, 'blossom'], [4.6, 33, 0.8, 'blossom'], [44, 27.6, 0.65, 'pine']]) if (Tt.inIsle(u, v, 0.8)) smallTree(u, v, s, k, u * 7 + v);
    // 灌木、花丛、草、小石头
    for (const [u, v, r, fl] of [[11.4, 20.4, 0.75, 1], [25.6, 21.4, 0.7, 0], [9.2, 15.4, 0.8, 1], [36.6, 20, 0.7, 1], [42.6, 20.4, 0.6, 0], [26, 38, 0.7, 1], [30.4, 37.4, 0.65, 0], [13.8, 29.4, 0.6, 1], [2.6, 22.4, 0.6, 0], [41, 31.4, 0.7, 1]]) if (Tt.inIsle(u, v, 0.6)) bush(m, u, v, tz(u, v), r, HED, Math.round(u * 3 + v), !snow && fl);
    if (!snow) for (let i = 0; i < 170; i++) { const a = H(i, 11) * 6.283, r = Math.sqrt(H(11, i)) * (rimR(a) - 1.4), u = CEN[0] + Math.cos(a) * r, v = CEN[1] + Math.sin(a) * r; if (!Tt.walkable(u, v) || Tt.pathD(u, v) < 0.9 || (o.busy && o.busy(u, v))) continue; const z = tz(u, v); if (i % 4 === 0) m.flower(u, v, z, 1.3 + H(i, 3) * 1.4, FLOW[i % 5], i); else if (i % 9 === 1) m.blob(u, v, z, 0.3, 0.35, ROCK[i % 3], M.stone, i, 2, 5); else m.tuft(u, v, z, 1.2 + H(i, 5) * 1.4, 4, sea === 'autumn' ? '#a8a050' : '#5aa64e', i); }
    // 草地上的小细节（贴着地，不挡路）：深浅草叶、小野花、三叶草、碎石子、秋天的落叶
    { const GD = sea === 'autumn' ? ['#8a9a40', '#b0a048', '#c8903a'] : ['#4a9440', '#7cc35a', '#3f8238'], FLW = ['#fff6e0', '#ffd36a', '#f2a6c2', '#a8c8ff', '#e0604a'];
      for (let i = 0; i < 520 && !snow; i++) {
        const a = H(i, 31) * 6.283, r = Math.sqrt(H(31, i)) * (rimR(a) - 1.2), u = CEN[0] + Math.cos(a) * r, v = CEN[1] + Math.sin(a) * r;
        if (Tt.waterAt(u, v) || Tt.pathD(u, v) < 0.8 || Tt.onBridge(u, v) || (u > HOUSE.u0 - 0.6 && u < HOUSE.u1 + 0.6 && v > HOUSE.v0 - 0.6 && v < HOUSE.v1 + 1.6)) continue;
        const z = tz(u, v) + 0.04, k = H(i, 37);
        if (k < 0.5) { const l = 0.35 + H(i, 41) * 0.4, an = H(i, 43) * 3.14; m.quad([u, v, z], [u + Math.cos(an) * l, v + Math.sin(an) * l, z], [u + Math.cos(an) * l, v + Math.sin(an) * l + 0.14, z], [u, v + 0.14, z], GD[i % 3], 0); }
        else if (k < 0.72) { m.cyl(u, v, z, z + 0.16, 0.13, 0.13, FLW[i % 5], 0, 5); m.cyl(u, v, z + 0.16, z + 0.2, 0.05, 0.05, '#ffd36a', 0, 4); }
        else if (k < 0.86) { for (let j = 0; j < 3; j++) m.cyl(u + Math.cos(j * 2.1) * 0.18, v + Math.sin(j * 2.1) * 0.18, z, z + 0.06, 0.16, 0.16, '#3f8a3a', 0, 5); }
        else if (sea === 'autumn' && k < 0.95) m.quad([u, v, z], [u + 0.3, v + 0.1, z], [u + 0.25, v + 0.35, z], [u - 0.05, v + 0.25, z], ['#d86a3a', '#e8a040', '#b4483a'][i % 3], 0);
        else m.blob(u, v, z, 0.16, 0.12, ROCK[i % 3], M.stone, i, 2, 4);
      }
      // 岛边一圈小石头和蒲公英
      for (let i = 0; i < 46 && !snow; i++) { const a = i * 0.1366 * 6.283 / 0.8585 % 6.283, rr = rimR(a) - 0.9 - H(i, 51) * 0.5, u = CEN[0] + Math.cos(a) * rr, v = CEN[1] + Math.sin(a) * rr; if (Tt.waterAt(u, v) || Tt.pathD(u, v) < 0.8) continue; const z = tz(u, v); if (i % 3) m.blob(u, v, z, 0.28 + H(i, 53) * 0.2, 0.22, ROCK[i % 3], M.stone, i, 2, 5); else { m.cyl(u, v, z, z + 1.1, 0.04, 0.04, '#6aa848', 0, 3); m.blob(u, v, z + 1.2, 0.22, 0.22, '#f8f4ec', 0, i, 2, 5); } }
    }
    // 野餐垫（桥那边的小草坪上）
    { const pu = 3.6, pv = 27.6, z = tz(pu, pv) + 0.05; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) m.quad([pu + a * 0.7, pv + b * 0.7, z], [pu + a * 0.7 + 0.7, pv + b * 0.7, z], [pu + a * 0.7 + 0.7, pv + b * 0.7 + 0.7, z], [pu + a * 0.7, pv + b * 0.7 + 0.7, z], (a + b) % 2 ? '#e0504a' : '#fff4ec', M.cloth); m.box(pu + 1.8, pv + 0.4, z, pu + 2.8, pv + 1.2, z + 1, '#b88a4a', M.cloth); }
    // —— 鸡舍：高脚小木屋 + 斜梯 + 围栏小院（鸡在 2D 层里跑） ——
    { const c = K.COOP, z = tz(c.u, c.v);
      m.pk(PICK.coop);
      posts(m, [[c.u - 1.6, c.v - 1.3], [c.u + 1.6, c.v - 1.3], [c.u - 1.6, c.v + 1.3], [c.u + 1.6, c.v + 1.3]], z, 2.2, DARK, 0.18);
      m.box(c.u - 1.9, c.v - 1.6, z + 2.2, c.u + 1.9, c.v + 1.6, z + 5.6, '#c8603e', M.plank); m.box(c.u - 2, c.v - 1.7, z + 2, c.u + 2, c.v + 1.7, z + 2.3, WOOD2, M.plank);
      for (let i = 0; i < 4; i++) m.box(c.u - 1.95 + i * 1.3, c.v + 1.6, z + 2.2, c.u - 1.75 + i * 1.3, c.v + 1.7, z + 5.6, '#f4ead8', 0);
      m.gable(c.u - 2.3, c.v - 2, c.u + 2.3, c.v + 2, z + 5.6, 2.4, 'u', '#7a3a2e', M.tile, 0.4, '#c8603e', M.plank);
      m.box(c.u - 0.6, c.v + 1.62, z + 2.4, c.u + 0.6, c.v + 1.75, z + 4.2, '#3a2420', 0); // 小门洞
      m.quad([c.u - 0.5, c.v + 1.7, z + 2.3], [c.u + 0.5, c.v + 1.7, z + 2.3], [c.u + 0.5, c.v + 4.2, z + 0.05], [c.u - 0.5, c.v + 4.2, z + 0.05], WOOD, M.plank); // 斜梯
      for (let i = 1; i < 5; i++) m.box(c.u - 0.5, c.v + 1.7 + i * 0.5, z + 2.3 - i * 0.46, c.u + 0.5, c.v + 1.8 + i * 0.5, z + 2.4 - i * 0.46, DARK, 0);
      m.cyl(c.u + 2.6, c.v + 2.4, z, z + 0.6, 0.8, 0.9, '#8a6a4a', M.plank, 9); m.cyl(c.u + 2.6, c.v + 2.4, z + 0.6, z + 0.65, 0.7, 0.7, '#e8c86a', 0, 9); // 食槽
      m.pk(0);
      for (let i = 0; i <= 10; i++) { const a = i / 10 * 3.6 + 1.2, u = c.u + 0.5 + Math.cos(a) * 4.2, v = c.v + 2.6 + Math.sin(a) * 3.0; if (!Tt.inIsle(u, v, 0.8)) continue; m.box(u - 0.1, v - 0.1, tz(u, v), u + 0.1, v + 0.1, tz(u, v) + 1.6, WOOD2, 2); if (i) { const b = (i - 1) / 10 * 3.6 + 1.2, u2 = c.u + 0.5 + Math.cos(b) * 4.2, v2 = c.v + 2.6 + Math.sin(b) * 3.0; m.quad([u, v, tz(u, v) + 1.1], [u2, v2, tz(u2, v2) + 1.1], [u2, v2, tz(u2, v2) + 1.3], [u, v, tz(u, v) + 1.3], WOOD, 2); } }
      if (!snow) for (let i = 0; i < 9; i++) m.blob(c.u - 1 + (i % 3) * 1.1, c.v + 2.4 + ((i / 3) | 0) * 0.9, tz(c.u, c.v + 3) + 0.05, 0.4, 0.12, '#e8c86a', 0, i, 2, 4); }
    // —— 蜂箱：两层白木箱 + 小屋顶，旁边一丛薰衣草（蜜蜂在 2D 层里飞） ——
    { const h = K.HIVE, z = tz(h.u, h.v);
      m.pk(PICK.hive);
      m.box(h.u - 1.1, h.v - 1, z, h.u + 1.1, h.v + 1, z + 0.6, DARK, 2);
      for (let k = 0; k < 2; k++) { m.box(h.u - 1, h.v - 0.9, z + 0.6 + k * 1.5, h.u + 1, h.v + 0.9, z + 2 + k * 1.5, k ? '#f4ead0' : '#e8dcb8', M.plank); m.box(h.u - 1.05, h.v - 0.95, z + 2 + k * 1.5, h.u + 1.05, h.v + 0.95, z + 2.1 + k * 1.5, '#c8a060', 0); }
      m.gable(h.u - 1.3, h.v - 1.2, h.u + 1.3, h.v + 1.2, z + 3.7, 1, 'u', '#5a8ac8', 2, 0.2);
      m.box(h.u - 0.5, h.v + 0.9, z + 0.8, h.u + 0.5, h.v + 1.0, z + 1.0, '#2a1a14', 0); // 出入口
      m.pk(0);
      if (!snow) for (let i = 0; i < 7; i++) { const a = i * 0.9, u = h.u - 2.2 + Math.cos(a) * 0.7, v = h.v + 1.4 + Math.sin(a) * 0.7; m.tuft(u, v, tz(u, v), 1.6, 3, '#6a9a5a', i + 300); m.blob(u, v, tz(u, v) + 1.7, 0.18, 0.4, '#a888d8', 0, i, 2, 4); } }
    // —— 菜地边：稻草人、手推车、种子袋、每块地一块小木牌、竹架子 ——
    { const sc = [40.9, 36.2], z = tz(sc[0], sc[1]);
      m.box(sc[0] - 0.12, sc[1] - 0.12, z, sc[0] + 0.12, sc[1] + 0.12, z + 7, DARK, 2); m.box(sc[0] - 2, sc[1] - 0.1, z + 5, sc[0] + 2, sc[1] + 0.1, z + 5.25, DARK, 2);
      m.box(sc[0] - 1, sc[1] - 0.5, z + 3.2, sc[0] + 1, sc[1] + 0.5, z + 5.6, '#5a8ac8', M.cloth); m.box(sc[0] - 1.8, sc[1] - 0.25, z + 4.7, sc[0] - 1, sc[1] + 0.25, z + 5.5, '#5a8ac8', M.cloth); m.box(sc[0] + 1, sc[1] - 0.25, z + 4.7, sc[0] + 1.8, sc[1] + 0.25, z + 5.5, '#5a8ac8', M.cloth);
      for (const d of [-0.5, 0, 0.5]) m.box(sc[0] + d - 0.15, sc[1] - 0.3, z + 2.6, sc[0] + d + 0.15, sc[1] + 0.3, z + 3.3, '#e8c86a', 0);
      m.ball(sc[0], sc[1], z + 6.4, 0.75, 0.8, '#f0dca8', 0, 4, 8); m.cyl(sc[0], sc[1], z + 7, z + 7.25, 1.3, 1.3, '#d8b04a', 0, 10); m.cyl(sc[0], sc[1], z + 7.25, z + 8.2, 0.7, 0.5, '#d8b04a', 0, 10); m.box(sc[0] - 0.3, sc[1] + 0.65, z + 6.5, sc[0] - 0.12, sc[1] + 0.75, z + 6.7, '#2a1a20', 0); m.box(sc[0] + 0.12, sc[1] + 0.65, z + 6.5, sc[0] + 0.3, sc[1] + 0.75, z + 6.7, '#2a1a20', 0); }
    { const w = [37.6, 38.6], z = tz(w[0], w[1]); // 手推车（装着刚摘的菜）
      m.box(w[0] - 1.4, w[1] - 0.9, z + 0.9, w[0] + 1.2, w[1] + 0.9, z + 2.2, '#8a5e3c', M.plank); m.box(w[0] - 1.2, w[1] - 0.7, z + 1.4, w[0] + 1, w[1] + 0.7, z + 2.25, '#4a3426', M.soil);
      for (let i = 0; i < 6; i++) m.ball(w[0] - 0.8 + (i % 3) * 0.7, w[1] - 0.3 + ((i / 3) | 0) * 0.6, z + 2.4, 0.35, 0.35, ['#f08a3a', '#e0402a', '#9ad070'][i % 3], 0, 3, 6);
      m.cyl(w[0] + 1.6, w[1], z + 0.6, z + 0.6, 0.6, 0.6, '#3a3448', M.metal, 8); m.disc(w[0] + 1.5, w[1], z + 0.6, 0.6, 'u', '#3a3448', M.metal, 10);
      m.box(w[0] - 2.6, w[1] - 0.8, z + 1.6, w[0] - 1.4, w[1] - 0.6, z + 1.8, DARK, 0); m.box(w[0] - 2.6, w[1] + 0.6, z + 1.6, w[0] - 1.4, w[1] + 0.8, z + 1.8, DARK, 0); }
    for (const [u, v, c] of [[25.1, 27.6, '#c8b088'], [25.4, 29.4, '#b8a078'], [25.1, 31.2, '#d8c098']]) { const z = tz(u, v); m.cyl(u, v, z, z + 1.5, 0.55, 0.7, c, M.cloth, 8); m.cyl(u, v, z + 1.5, z + 1.9, 0.35, 0.2, c, M.cloth, 6); m.box(u - 0.3, v + 0.6, z + 0.5, u + 0.3, v + 0.72, z + 1, ['#e8705a', '#f6c43a', '#9ad070'][Math.round(u * 3) % 3], 0); }
    K.PLOTS.forEach(([pu, pv], i) => { const u = pu + 0.3, v = pv + K.PS + 0.25, z = tz(u, v); m.box(u - 0.06, v - 0.06, z, u + 0.06, v + 0.06, z + 1.6, DARK, 0); m.box(u - 0.55, v - 0.05, z + 1.2, u + 0.55, v + 0.07, z + 1.9, '#d8b888', M.plank); const f = o.farm && o.farm[i]; if (f) m.box(u - 0.25, v + 0.08, z + 1.4, u + 0.25, v + 0.12, z + 1.7, ({ carrot: '#f08a3a', berry: '#e8405a', corn: '#ffd36a', sunflower: '#f6c43a', pumpkin: '#f2832a', tomato: '#e0402a', cabbage: '#9ad070', melon: '#3f8a44', tulip: '#f2a6c2' })[f.crop] || '#888', 0);
      if (f && (f.crop === 'tomato' || f.crop === 'berry') && f.stage >= 1) { const z2 = K.PLOTZ[i] + K.PH[i] * 0.6; for (const a of [0.4, K.PS - 0.4]) for (const b of [0.4, K.PS - 0.4]) m.box(pu + a - 0.05, pv + b - 0.05, z2, pu + a + 0.05, pv + b + 0.05, z2 + 3.4, '#c8b07a', 0); m.box(pu + 0.3, pv + 0.35, z2 + 3.3, pu + K.PS - 0.3, pv + 0.45, z2 + 3.4, '#c8b07a', 0); m.box(pu + 0.3, pv + K.PS - 0.45, z2 + 3.3, pu + K.PS - 0.3, pv + K.PS - 0.35, z2 + 3.4, '#c8b07a', 0); } });
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
    // 阁楼（只盖住左后角，= 二层的一部分）+ 沿左墙的楼梯
    m.box(R0, R0, LZ - 1.6, 22, 18, LZ, '#a8784a', M.plank, '#c8a070', M.plank); posts(m, [[21.6, 17.6]], 0, LZ - 1.6, TIMBER, 0.3);
    m.rail(22, R0 + 0.3, 22, 18, LZ, 4.6); m.rail(8, 18, 22, 18, LZ, 4.6);
    m.stairs(30, 18, R0 + 0.4, 7.6, 0, LZ, 'v', WOOD, 12, true); m.quad([7.6, 30, 4], [7.6, 30, 4.6], [7.6, 18, LZ + 4.6], [7.6, 18, LZ + 4], WOOD2, 2);
    // 阁楼上的床、书桌、箱子、盆栽，还有楼下能挪的家具：都在 furn.js 里（可以自由摆放）
    PP.FURN.build(m, o.layout || [], { skip: o.skip, LOFT: LZ, pinkBed: !!rm.bed });
    // 鱼缸：碗柜顶上，养着钓到的小鱼（鱼在 2D 层里游）
    { const u0 = 34, u1 = HU1 - 0.6, v0 = 17.3, v1 = 21.7, z0 = 16;
      m.pk(PICK.tank); m.box(u0 - 0.2, v0 - 0.2, z0, u1 + 0.2, v1 + 0.2, z0 + 0.5, '#5a3a28', M.plank); m.box(u0, v0, z0 + 0.5, u1, v1, z0 + 5, '#bfe6f4', M.glass); m.box(u0, v0, z0 + 0.5, u1, v1, z0 + 1.1, '#e8d8a8', 0);
      for (let i = 0; i < 3; i++) m.box(u0 + 0.6 + i * 1, v0 + 0.5 + i * 1.4, z0 + 1.1, u0 + 0.8 + i * 1, v0 + 0.7 + i * 1.4, z0 + 2.4 + (i % 2) * 1.2, '#5aa64e', 0);
      m.box(u0 - 0.1, v0 - 0.1, z0 + 5, u1 + 0.1, v1 + 0.1, z0 + 5.3, '#3a3448', M.metal); m.pk(0); K.TANKIN = [u1 - 0.2, v0 + 0.5, v1 - 0.5, z0 + 1.6, z0 + 4.4]; }
    // 墙上挂的画、地上的猫爬架、一筐毛线、几个靠垫、挂在梁上的干花
    m.box(R0 + 0.25, 25.6, 9, R0 + 0.45, 29.6, 13, '#c8935e', 0); m.box(R0 + 0.4, 26, 9.4, R0 + 0.55, 29.2, 12.6, '#8ac0e0', M.cloth); m.box(R0 + 0.45, 26, 9.4, R0 + 0.6, 29.2, 10.4, '#6aa848', 0);
    for (let i = 0; i < 5; i++) { const v = 19.6 + i * 1.6; m.box(R0 + 0.5, v - 0.04, LZ - 4, R0 + 0.6, v + 0.04, LZ - 1, '#6a5a3a', 0); m.ball(R0 + 0.6, v, LZ - 4.4, 0.5, 0.7, ['#e8a0b0', '#c8a0f0', '#f6c43a'][i % 3], 0, 3, 6); }
    // 阁楼底下：储物角
    m.box(R0 + 0.2, R0 + 0.2, 0, 10, 6.6, 12, '#a8784a', M.plank); for (let i = 0; i < 3; i++) m.box(R0 + 0.6, 6.6, 1 + i * 3.8, 9.6, 6.75, 4 + i * 3.8, ['#c85a4a', '#5a8ad8', '#e8c860'][i], M.cloth);
    if (true) { m.box(R0 + 0.25, 21, 13, R0 + 0.5, 27, 20, '#c8935e', 0); m.box(R0 + 0.45, 21.6, 13.6, R0 + 0.6, 26.4, 19.4, '#a8d8f6', M.cloth); m.box(R0 + 0.55, 21.6, 13.6, R0 + 0.66, 26.4, 15.8, '#7cbc62', M.grass); }
    // —— 更多的家当（照着住了很久的小屋摆）——
    // 烤箱：灶台下面一个亮着的小炉门；墙上挂着锅铲和小锅
    m.box(ku + 0.8, R0 + 3, 1, ku + 4.8, R0 + 3.15, 5.6, '#3a3448', M.metal); m.box(ku + 1.4, R0 + 3.1, 2, ku + 4.2, R0 + 3.25, 4.6, '#ffb060', M.glow);
    for (let i = 0; i < 5; i++) { const u = ku - 4.8 + i * 1.5; m.box(u - 0.06, R0 + 0.3, 13, u + 0.06, R0 + 0.4, 17, '#5a5466', M.metal); if (i % 2) m.cyl(u, R0 + 0.8, 11.6, 12.4, 0.9, 0.9, COPPER, M.metal, 8); else m.box(u - 0.4, R0 + 0.3, 12, u + 0.4, R0 + 0.45, 13.2, '#8a8494', M.metal); }
    m.box(ku - 5.4, R0 + 0.1, 17.6, U1 - 0.4, R0 + 0.3, 17.8, TIMBER, 2);
    // 碗柜：右墙（远处）旁边，玻璃门里一摞摞盘子
    { const cu0 = 33.6, cv0 = 17; m.box(cu0, cv0, 0, U1 - 0.2, cv0 + 5, 16, '#a8784a', M.plank); m.box(cu0 - 0.1, cv0 + 0.3, 7, cu0, cv0 + 4.7, 15, '#cfeaf6', M.glass); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m.disc(cu0 - 0.15, cv0 + 1 + j * 1.5, 8.6 + i * 2.4, 0.5, 'u', ['#f8f4ec', '#a8c8e8', '#f2c6d2'][(i + j) % 3], 0, 8); m.box(cu0 - 0.1, cv0 + 0.3, 1, cu0, cv0 + 4.7, 6, '#8a5a3a', M.plank); }
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
    // 四个种稀有植物的大花盆 + 暖气阀门（铜管沿着墙脚走）
    K.GPOTS.forEach(([pu, pv], i) => { const pt = (o.pots || [])[i]; m.pk(160 + i); m.cyl(pu, pv, 0, 2.2, 1.1, 1.35, i % 2 ? '#c8705a' : '#b8604a', 0, 12); m.cyl(pu, pv, 2.2, 2.6, 1.42, 1.42, '#a8503a', 0, 12); m.cyl(pu, pv, 2.4, 2.45, 1.25, 1.25, pt && pt.wet ? '#3a2a20' : '#5a4030', M.soil, 12);
      if (pt && PP.LIFE && PP.LIFE.PL[pt.id]) lifePlant(m, PP.LIFE.PL[pt.id], pt.stage, pu, pv, 2.45, i * 3 + 1, 1.7); m.pk(0); });
    m.pk(165); m.cyl(R0 + 0.6, 14, 0, 6, 0.22, 0.22, COPPER, M.metal, 6); m.disc(R0 + 0.85, 14, 4.2, 0.7, 'u', '#c8403a', M.metal, 10); m.box(R0 + 0.5, 13.4, 3.8, R0 + 1, 14.6, 4.6, '#4a4652', M.metal);
    for (let i = 0; i < 4; i++) m.box(R0 + 0.4, 9 + i * 0.5, 0.2, R0 + 0.8, 9.3 + i * 0.5, 2.4, COPPER, M.metal);
    m.box(R0 + 0.3, 6, 0.4, R0 + 0.7, 22, 0.8, COPPER, M.metal); m.pk(0);
    return m;
  }

  // ---------- 每帧都变的东西 ----------
  function dyn(o) {
    const m = new Mesh(), t = o.t;
    if (o.scene === 'deck') {
      // 开着的窝门：门洞是黑的，门板转开贴在一边
      for (const i of o.dens || []) { const d = CA.DENS[i]; if (!d) continue; const r = d[5] === 'u' ? 3 : 0, t = new LT(m, (d[1] + d[3]) / 2, (d[2] + d[4]) / 2, r, CA.denZ(d)), W = r ? d[4] - d[2] : d[3] - d[1], Dp = r ? d[3] - d[1] : d[4] - d[2], hw = Math.min(1.9, W * 0.5) / 2, Y = Dp / 2;
        t.box(-hw, Y + 0.15, 0, hw, Y + 0.21, 4.2, '#1e1418', 0); t.box(-hw - 0.12, Y + 0.21, 0, -hw + 0.04, Y + 0.21 + hw * 2, 4.2, '#8a5a3a', M.plank); t.box(-hw * 0.7, Y + 0.21, 0.02, hw * 0.7, Y + 1.5, 0.05, '#ffe9a8', M.glow); }
      const P = K.POND;
      // 塘里的鱼：水面下游来游去的影子
      for (let i = 0; i < 4; i++) { const a = t * (0.35 + i * 0.08) + i * 1.7, cu = P.cu + Math.cos(a) * (P.ru * 0.6 - i * 0.3), cv = P.cv + Math.sin(a * 1.3) * P.rv * 0.55, d = [-Math.sin(a) * (P.ru * 0.6 - i * 0.3), Math.cos(a * 1.3) * 1.3 * P.rv * 0.55], l = Math.hypot(d[0], d[1]) || 1, du = d[0] / l, dv = d[1] / l, wg = Math.sin(t * 7 + i) * 0.18, col = i === 1 ? '#f08a5a' : i === 3 ? '#f8f0e0' : '#2a5a78';
        m.quad([cu + du * 0.7, cv + dv * 0.7, P.z + 0.03], [cu - dv * 0.22, cv + du * 0.22, P.z + 0.03], [cu - du * 0.5, cv - dv * 0.5, P.z + 0.03], [cu + dv * 0.22, cv - du * 0.22, P.z + 0.03], col, 0);
        m.tri([cu - du * 0.5, cv - dv * 0.5, P.z + 0.03], [cu - du * 0.95 - dv * (0.25 + wg), cv - dv * 0.95 + du * (0.25 + wg), P.z + 0.03], [cu - du * 0.95 + dv * (0.25 - wg), cv - dv * 0.95 - du * (0.25 - wg), P.z + 0.03], col, 0); }
    } else if (o.scene === 'house') {
      if (o.drag) PP.FURN.build(m, [o.drag], { LOFT: K.LOFT, pinkBed: o.pinkBed });
      const fu = iu(HOUSE, HOUSE.fire);
      for (let i = 0; i < 6; i++) { const h = 2.2 + Math.sin(t * 9 + i * 2.1) + (o.cooking ? 1.2 : 0); m.cyl(fu - 1.6 + i * 0.64, R0 + 3.3, 1, 1 + h * 1.9, 0.5, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); }
    }
    return m;
  }
  PP.isleModels = { K, deck, room, green, dyn, parts: { warp, hut, dome, stack, wheel, truss, fin, hull, crenel, pipeOut, crop, lifePlant, deco, lamp, shade, HW, bush, hedge } };
})();
