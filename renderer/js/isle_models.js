// 小岛的 3D 模型：浮空花园船（外景）、小屋内部（两层：客厅 / 厨房 + 阁楼卧室）、玻璃花房内部，以及会动的小部件。
// 全部是代码搭出来的原创设计：红瓦人字顶 + 出挑的木筋墙二楼 + 老虎窗 + 阳台，石头圆塔绕着一圈露天楼梯，
// 连廊、角楼、花房、抬高的船尾甲板（走楼梯上去），打补丁的帆。
(function () {
  const PP = (window.PP = window.PP || {});
  const g3 = PP.g3, M = g3.MAT;
  const K = {
    N: 60, HG: 6, QD: 6.5, QH: 10, IW: 240, IH: 234, OX: 120, OY: 80,
    COT: { u0: 8, v0: 21, u1: 19, v1: 32 }, DOOR: { u: 13 }, WING: { u0: 19, v0: 23.5, u1: 21.5, v1: 30 },
    TOWER: { u: 8, v: 15.5, r: 3.4, h: 52 }, GREEN: { u0: 27, v0: 17.6, u1: 35, v1: 24.2 }, GDOOR: { u: 35, v: 20.9 },
    CABIN: { u0: 2.4, v0: 23, u1: 4.8, v1: 28 }, MAST: { u: 33, v: 11 }, TREE: { u: 25.5, v: 12.5 },
    PLOTS: [[24, 27], [29, 27], [34, 27], [24, 32], [29, 32], [34, 32]], FIRE: { u: 44, v: 37 }, MAILB: { u: 49, v: 32 }, BARREL: { u: 21, v: 39 },
    PLANK: { u0: 43.6, u1: 46.4, v0: 3.5, v1: 12 }, FISH: { u: 53.9, v: 45.2 }, BALLOON: { u: 4.2, v: 40 }, SCOPE: { u: 3.6, v: 44 }, WHEEL: { u: 5.3, v: 33 },
    RAMP: { u0: 6.5, u1: 10.5, v0: 35.6, v1: 38.4 },
    SLOTS: [[17, 37], [15, 41], [30, 13], [30, 41], [50, 24], [40, 43]],
    R0: 6, R1: 56, RH0: 4, LOFT: 30, LOFTV: 22, WALLH: 64, RDOOR: { u: 31.5 }, RRAMP: { u0: 6.5, u1: 11.5, v0: 22, v1: 40 },
    GV0: 18, GZ: -8, DZ: -24, LAND: { u0: 13, u1: 16.5, v0: 46.2, v1: 50 }, RAMP2: { u0: 16.5, u1: 23.5, v0: 47.5, v1: 50 }, GAL: { u0: 23.5, u1: 42 }, RAMP3: { u0: 42, u1: 47.8, v0: 44.8, v1: 47.2 }, DOCK: { u: 51.2, v: 44, r: 3.8 }, HDOOR: { u: 31 }, HAMMOCK: { u: 37.5 },
  };
  const { HG, QD, QH, COT, TOWER, GREEN, CABIN, MAST, TREE, PLOTS, FIRE, MAILB, BARREL, PLANK, BALLOON, R0, R1, RH0, LOFT, LOFTV, WALLH } = K;
  function deckW(u) { const t = (u - 29) / 27; if (t < -1 || t > 1) return 0; let w = 19; if (t > 0.3) w *= Math.sqrt(Math.max(0, 1 - ((t - 0.3) / 0.7) ** 2)); if (t < -0.82) w *= 1 - ((-0.82 - t) / 0.18) ** 2 * 0.35; return w; }
  K.deckW = deckW;
  K.inDeck = (u, v) => { const w = deckW(u); return w > 0.6 && Math.abs(v - 28) <= w; };
  const SEASON = {
    spring: { grass: '#7cc062', tree: ['#86cc6a', '#f2b6cc', '#6ab45a'], bush: '#5aa64e' },
    summer: { grass: '#62a84e', tree: ['#4f9a48', '#3f8a44', '#66b058'], bush: '#3f8a44' },
    autumn: { grass: '#b8a24a', tree: ['#e08a3a', '#c8543a', '#f0b040'], bush: '#a8903e' },
    winter: { grass: '#eef3fa', tree: ['#dfe8f2', '#c8d6e6', '#f6fafe'], bush: '#d0dcec' },
  };
  const TILE = '#cf6248', SLATE = '#5a7ab0', PLASTER = '#f2e6cc', TIMBER = '#5a3a28', STONE = '#b4acc0', WOOD = '#a8784a';
  const FLOW = ['#f2a6c2', '#ffd36a', '#b8a0f0', '#ffffff', '#e8705a'];
  const galV = (u) => 28 + deckW(u) + 0.3; K.galV = galV;
  const H = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------- 作物（3D）：四个阶段 ----------
  function crop(m, kind, stage, u, v, z, seed) {
    const g1 = '#5aa64e', g2 = '#86cc6a', g0 = '#3f8a44';
    if (stage === 0) { m.cyl(u, v, z, z + 1.6, 0.12, 0.02, g2, 0, 4); m.blob(u, v, z + 1.7, 0.2, 0.5, g2, 8, seed, 2, 4); return; }
    if (stage === 1) { m.blob(u, v, z + 1.6, 0.4, 1.5, g1, 8, seed, 3, 5); m.cyl(u, v, z, z + 3.2, 0.1, 0.02, g2, 0, 4); return; }
    const big = stage === 3, s = big ? 1 : 0.72;
    if (kind === 'corn') { m.cyl(u, v, z, z + 10 * s, 0.13, 0.08, g0, 0, 5); for (let i = 0; i < 3; i++) m.blob(u + (i - 1) * 0.3, v + (i % 2 ? 0.25 : -0.25), z + (3 + i * 2.4) * s, 0.5, 0.9, i % 2 ? g1 : g2, 8, seed + i, 2, 5); if (big) { m.cyl(u + 0.28, v + 0.2, z + 4.5, z + 8.2, 0.24, 0.12, '#ffd36a', 0, 6); m.cyl(u, v, z + 10, z + 12, 0.1, 0.25, '#e0c070', 0, 4); } }
    else if (kind === 'sunflower') { m.cyl(u, v, z, z + 11 * s, 0.12, 0.08, g0, 0, 5); m.blob(u, v + 0.3, z + 4 * s, 0.5, 1, g1, 8, seed, 2, 5); if (big) { m.disc(u + 0.2, v + 0.35, z + 11.5, 0.78, 'v', '#f6c43a', 0, 9); m.disc(u + 0.2, v + 0.42, z + 11.5, 0.36, 'v', '#7a4a2a', 0, 7); m.disc(u + 0.35, v + 0.2, z + 11.5, 0.7, 'u', '#ffd95a', 0, 9); } }
    else if (kind === 'tulip') { for (let i = 0; i < 3; i++) { const a = u + (i - 1) * 0.42, b = v + (i % 2 ? 0.3 : -0.2), hh = (5 + i) * s; m.cyl(a, b, z, z + hh, 0.07, 0.05, g0, 0, 4); m.blob(a, b, z + 1.4, 0.26, 1.2, g1, 8, i, 2, 4); if (big) m.cyl(a, b, z + hh, z + hh + 2.2, 0.26, 0.14, FLOW[(seed + i) % 5], 0, 6); } }
    else if (kind === 'pumpkin') { m.blob(u, v, z + 1.2, 0.75, 1.2, g1, 8, seed, 3, 6); if (big) { m.blob(u + 0.15, v + 0.25, z + 2.1, 0.78, 1.9, '#f2832a', 0, seed, 4, 8); m.cyl(u + 0.15, v + 0.25, z + 3.9, z + 4.8, 0.09, 0.06, g0, 0, 4); } }
    else if (kind === 'melon') { m.blob(u, v, z + 1.1, 0.8, 1.1, g1, 8, seed, 3, 6); if (big) m.blob(u + 0.1, v + 0.3, z + 2.2, 0.85, 2.1, '#3f8a44', 11, seed, 4, 8); }
    else if (kind === 'cabbage') { m.blob(u, v, z + 1.6, 0.8 * s, 1.7 * s, '#7ab85a', 8, seed, 3, 7); if (big) m.blob(u, v, z + 2.4, 0.55, 1.5, '#c8ec9a', 0, seed + 2, 3, 6); }
    else { m.blob(u, v, z + 2.2 * s, 0.7 * s, 2.3 * s, g1, 8, seed, 3, 6);
      if (big && kind === 'carrot') for (let i = 0; i < 2; i++) m.cyl(u + (i ? 0.4 : -0.35), v + 0.45, z, z + 1.5, 0.22, 0.16, '#f08a3a', 0, 5);
      if (big && kind === 'berry') for (let i = 0; i < 5; i++) m.blob(u + Math.cos(i * 1.3) * 0.6, v + Math.sin(i * 1.3) * 0.6, z + 1.6 + (i % 3), 0.17, 0.42, '#e8405a', 0, i, 2, 4);
      if (big && kind === 'tomato') { m.cyl(u, v, z, z + 6, 0.06, 0.06, '#8a6040', 0, 4); for (let i = 0; i < 4; i++) m.blob(u + Math.cos(i * 1.7) * 0.55, v + Math.sin(i * 1.7) * 0.55, z + 2 + i * 0.9, 0.24, 0.6, '#e0402a', 0, i, 3, 5); } }
  }
  function flowers(m, u, v, z, n, r, seed, bush) { for (let i = 0; i < n; i++) { const a = H(seed, i) * 6.28, d = H(i, seed) * r; m.blob(u + Math.cos(a) * d, v + Math.sin(a) * d, z + 0.9, 0.32, 0.9, i % 3 ? FLOW[(seed + i) % 5] : bush, i % 3 ? 0 : 8, i, 2, 5); } }
  const posts = (m, pts, z, h, col) => pts.forEach(([u, v]) => m.box(u - 0.2, v - 0.2, z, u + 0.2, v + 0.2, z + h, col, 2));

  // ---------- 外景 ----------
  function deck(o) {
    const m = new g3.Mesh(), S = SEASON[o.season] || SEASON.summer, snow = o.snow, roof = (c) => (snow ? '#f4f7fc' : c), rmat = snow ? M.snow : M.tile;
    const grass = snow ? '#f2f6fc' : S.grass, gmat = snow ? M.snow : M.grass;
    // 船身：一圈圈往下收的环
    const us = []; for (let u = 2; u <= 56.01; u += 1.5) us.push(Math.min(u, 55.98)); const out = [];
    for (const u of us) out.push([u, 28 + deckW(u)]); for (const u of us.slice().reverse()) out.push([u, 28 - deckW(u)]);
    const rings = [[HG + 0.6, 1.035, 1.035], [HG - 0.8, 1.035, 1.035], [HG - 1.3, 1.0, 1.0], [-11, 0.985, 0.975], [-12, 1.0, 0.99], [-22, 0.9, 0.8], [-30, 0.62, 0.42], [-35, 0.3, 0.1]];
    const RC = [['#e0b070', 0], ['#5a3a28', 0], [PLASTER, M.plaster], ['#5a3a28', 0], [STONE, M.stone], ['#b8703a', M.metal], ['#7aa890', M.metal]];
    const rp = (p, r) => [27 + (p[0] - 27) * r[1], 28 + (p[1] - 28) * r[2], r[0]];
    for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; m.quad(rp(a, rings[k]), rp(b, rings[k]), rp(b, rings[k + 1]), rp(a, rings[k + 1]), RC[k][0], RC[k][1]); }
    // 舷窗、垂下来的藤
    // 下层外墙（就是这栋房子的下面两层）：木筋 + 一排窗 + 小雨棚
    for (let i = 1; i < us.length - 2; i++) { const u = us[i], v = 28 + deckW(u) * 0.99; m.box(u - 0.16, v - 0.2, -11, u + 0.16, v + 0.12, HG - 1.3, TIMBER, 2);
      if (i % 2 === 0 && u > 9 && u < 50 && Math.abs(u - K.HDOOR.u) > 2.2) { const vv = 28 + Math.min(deckW(u - 0.6), deckW(u + 1.4)) * 0.985; m.win('v', u + 0.1, u + 1.3, -6.5, -1.5, vv, { shut: i % 4 ? '#3a7a8a' : '#c8504a', box: i % 6 === 0 ? FLOW[i % 5] : null }); } }
    for (const u of [20, 36, 46]) { const v = 28 + deckW(u) * 0.86; m.cyl(u, v, -30, -14, 0.3, 0.3, '#8a9ab0', M.metal, 6); m.disc(u, v + 0.34, -17, 0.6, 'v', '#e0b070', 0, 9); m.disc(u, v + 0.4, -17, 0.4, 'v', '#9fd4f2', M.glass, 8); }
    for (let i = 1; i < us.length - 1; i += 2) { const u = us[i] + 0.4, v = 28 + deckW(u) * 1.04; for (let j = 0; j < 2 + (i % 3); j++) m.blob(u + (j % 2) * 0.3, v, HG - 1.5 - j * 2.6, 0.5, 1.5, j % 2 ? '#86cc6a' : '#4f9a48', 8, i + j, 3, 5); if (i % 4 === 1) m.blob(u, v + 0.1, HG - 2 - (2 + (i % 3)) * 2.6, 0.3, 0.8, FLOW[i % 5], 0, i, 2, 4); }
    // 浮空水晶底座
    m.cyl(27, 28, -40, -34, 1.2, 2.6, '#8a5a3a', M.metal, 8);
    // 甲板面：主甲板（草地）+ 抬高的船尾甲板（木板）
    for (let i = 0; i < us.length - 1; i++) {
      const a = us[i], b = us[i + 1], wa = deckW(a), wb = deckW(b);
      if (b <= QD + 0.01) m.quad([a, 28 - wa, HG + QH], [a, 28 + wa, HG + QH], [b, 28 + wb, HG + QH], [b, 28 - wb, HG + QH], '#c8935e', M.plank);
      else m.quad([Math.max(a, QD), 28 - wa, HG], [Math.max(a, QD), 28 + wa, HG], [b, 28 + wb, HG], [b, 28 - wb, HG], grass, gmat);
    }
    { const w = deckW(QD); m.box(QD - 0.3, 28 - w, HG, QD, 28 + w, HG + QH, '#9a6a42', M.stone); m.box(QD - 0.4, 28 - w, HG + QH - 0.6, QD + 0.15, 28 + w, HG + QH + 0.2, '#e0b070', 0);
      for (const u of us) if (u < QD) { const w2 = deckW(u), u2 = Math.min(u + 1.5, QD), w3 = deckW(u2); m.quad([u, 28 + w2, HG], [u2, 28 + w3, HG], [u2, 28 + w3, HG + QH], [u, 28 + w2, HG + QH], '#9a6a42', M.stone); }
      m.stairs(10.5, QD, 35.6, 38.4, HG, HG + QH, 'u', '#b88a5a', 7); m.rail(10.5, 35.5, QD, 35.5, HG, 6); // 上船尾甲板的楼梯
      m.rail(QD - 0.2, 28 - w + 0.5, QD - 0.2, 35.3, HG + QH, 5.5); m.rail(QD - 0.2, 38.7, QD - 0.2, 28 + w - 0.5, HG + QH, 5.5); }
    // 栏杆：沿船舷一圈
    for (let i = 0; i < out.length; i++) {
      const a = out[i], b = out[(i + 1) % out.length], z = (a[0] + b[0]) / 2 < QD ? HG + QH : HG, port = a[1] < 28 && b[1] < 28;
      if (port && (a[0] + b[0]) / 2 > PLANK.u0 - 1 && (a[0] + b[0]) / 2 < PLANK.u1 + 1) continue;
      if (Math.abs(a[0] - b[0]) < 0.1 && a[0] > 50) continue;
      if (!port && a[1] > 28 && (a[0] + b[0]) / 2 > K.LAND.u0 && (a[0] + b[0]) / 2 < K.LAND.u1) continue;
      m.box(a[0] - 0.16, a[1] - 0.16, z, a[0] + 0.16, a[1] + 0.16, z + 5.6, WOOD, M.plank);
      for (const zz of [2.4, 4.9]) m.quad([a[0], a[1], z + zz], [b[0], b[1], z + zz], [b[0], b[1], z + zz + 0.75], [a[0], a[1], z + zz + 0.75], '#c8935e', M.plank);
    }
    // 木栈道
    const walk = (u0, v0, u1, v1) => m.box(u0, v0, HG, u1, v1, HG + 0.3, snow ? '#e8eef6' : '#c8935e', snow ? M.snow : M.plank);
    walk(10.5, 33.2, 52, 35.5); walk(39, 11, 41.5, 33.2); walk(12, 33, 14, 33.4); walk(21, 15.2, 39, 16.8); walk(35, 20.2, 39, 21.6); walk(14, 35.5, 15.8, 46.4);
    // ---- 往下的楼层：平台 → 楼梯 → 悬空回廊（底舱的门、吊床）→ 楼梯 → 最底下的小码头（钓鱼、铃铛）----
    { const L = K.LAND, R2 = K.RAMP2, R3 = K.RAMP3, GZ = K.GZ, DZ = K.DZ, D = K.DOCK;
      m.box(L.u0, L.v0, HG - 1, L.u1, L.v1, HG + 0.3, '#c8935e', M.plank); m.rail(L.u0, L.v1, L.u1, L.v1, HG + 0.3, 5.4); m.rail(L.u0, L.v0 + 0.8, L.u0, L.v1, HG + 0.3, 5.4);
      for (const u of [L.u0 + 0.5, L.u1 - 0.5]) m.tri([u, L.v0, HG - 1], [u, L.v1 - 0.4, HG - 1], [u, L.v0, HG - 7], TIMBER, 2);
      m.stairs(R2.u1, R2.u0, R2.v0, R2.v1, GZ, HG, 'u', '#b88a5a', 9, true); m.box(R2.u0, R2.v1 - 0.2, GZ - 1.4, R2.u1, R2.v1, GZ, TIMBER, 2);
      for (let i = 0; i <= 4; i++) { const u = R2.u0 + (R2.u1 - R2.u0) * i / 4, z = HG + (GZ - HG) * i / 4; m.box(u - 0.12, R2.v1 - 0.25, z, u + 0.12, R2.v1, z + 5.6, WOOD, 2); if (i < 4) { const u2 = R2.u0 + (R2.u1 - R2.u0) * (i + 1) / 4, z2 = HG + (GZ - HG) * (i + 1) / 4; m.quad([u, R2.v1 - 0.1, z + 4.8], [u2, R2.v1 - 0.1, z2 + 4.8], [u2, R2.v1 - 0.1, z2 + 5.6], [u, R2.v1 - 0.1, z + 5.6], '#c8935e', 2); } }
      const G = K.GAL; for (let u = G.u0; u < G.u1 - 0.01; u += 1.5) { const u2 = Math.min(G.u1, u + 1.5), a = galV(u), b = galV(u2);
        m.quad([u, a - 0.4, GZ], [u, a + 3.1, GZ], [u2, b + 3.1, GZ], [u2, b - 0.4, GZ], '#c8935e', M.plank); m.quad([u, a + 3.1, GZ - 1.2], [u2, b + 3.1, GZ - 1.2], [u2, b + 3.1, GZ], [u, a + 3.1, GZ], '#8a5a3a', 2);
        m.box(u - 0.13, a + 2.85, GZ, u + 0.13, a + 3.1, GZ + 5.6, WOOD, 2); for (const zz of [2.4, 4.9]) m.quad([u, a + 3, GZ + zz], [u2, b + 3, GZ + zz], [u2, b + 3, GZ + zz + 0.7], [u, a + 3, GZ + zz + 0.7], '#c8935e', 2);
        if (Math.round((u - G.u0) / 1.5) % 3 === 0) m.tri([u, a - 0.4, GZ - 1], [u, a + 2.8, GZ - 1], [u, a - 0.6, GZ - 8], TIMBER, 2); }
      { const u = K.HDOOR.u, v = galV(u) - 0.45; m.box(u - 1.3, v, GZ, u + 1.3, v + 0.2, GZ + 12.2, TIMBER, 2); m.box(u - 1, v + 0.1, GZ, u + 1, v + 0.32, GZ + 11.4, '#8a5236', M.plank); m.disc(u, v + 0.36, GZ + 8.6, 0.42, 'v', '#9fd4f2', M.glass, 8); m.box(u + 1.6, v + 0.1, GZ + 8, u + 2, v + 0.5, GZ + 9.8, '#ffe9a8', M.glow); m.box(u - 2.6, v + 0.1, GZ + 7.4, u - 1.6, v + 0.25, GZ + 9.8, '#e8c08a', M.plank); }
      { const u = K.HAMMOCK.u, a = galV(u - 1.6), b = galV(u + 1.6); m.box(u - 1.75, a + 0.2, GZ, u - 1.45, a + 0.5, GZ + 7, WOOD, 2); m.box(u + 1.45, b + 0.2, GZ, u + 1.75, b + 0.5, GZ + 7, WOOD, 2);
        for (let i = 0; i < 4; i++) { const t0 = i / 4, t1 = (i + 1) / 4, P = (t, w) => [u - 1.6 + 3.2 * t, a + (b - a) * t + 0.35 + w, GZ + 6 - Math.sin(t * Math.PI) * 3]; m.quad(P(t0, -0.6), P(t1, -0.6), P(t1, 0.9), P(t0, 0.9), i % 2 ? '#e8705a' : '#f4ead6', M.cloth); } }
      m.pot(G.u0 + 1.5, galV(G.u0 + 1.5) + 2.4, GZ, 0.45, '#c8705a', FLOW[0], 3); m.pot(41, galV(41) + 0.2, GZ, 0.45, '#5a7ab0', '#5aa64e', 5); m.box(26, galV(26) - 0.3, GZ, 27.6, galV(26) + 0.9, GZ + 2.6, '#a8784a', M.plank);
      m.stairs(R3.u1, R3.u0, R3.v0, R3.v1, DZ, GZ, 'u', '#b88a5a', 10, true); for (let i = 0; i <= 4; i++) { const u = R3.u0 + (R3.u1 - R3.u0) * i / 4, z = GZ + (DZ - GZ) * i / 4; m.box(u - 0.12, R3.v1 - 0.25, z, u + 0.12, R3.v1, z + 5.6, WOOD, 2); }
      m.cyl(D.u, D.v, DZ - 1.4, DZ, 3.2, D.r, '#8a5a3a', M.plank, 14, true, '#c8935e'); m.cyl(D.u, D.v, DZ - 5, DZ - 1.4, 0.6, 2.6, TIMBER, 0, 8);
      for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.36, pu = D.u + Math.cos(a) * (D.r - 0.2), pv = D.v + Math.sin(a) * (D.r - 0.2); m.box(pu - 0.11, pv - 0.11, DZ, pu + 0.11, pv + 0.11, DZ + 5, WOOD, 2); }
      for (const [du, dv] of [[-2.6, -2.2], [2.2, -2.4]]) m.box(D.u + du - 0.08, D.v + dv - 0.08, DZ, D.u + du + 0.08, D.v + dv + 0.08, -4, '#8a7a6a', 0);
      m.box(D.u - 2.9, D.v - 2.7, DZ, D.u - 2.6, D.v - 2.4, DZ + 9, WOOD, 2); m.box(D.u - 2.9, D.v - 2.7, DZ + 8.4, D.u - 1.6, D.v - 2.4, DZ + 9, WOOD, 2); m.cyl(D.u - 1.9, D.v - 2.55, DZ + 5.6, DZ + 8.2, 0.55, 0.2, '#e0b070', M.metal, 8);
      m.cyl(D.u + 1.4, D.v - 1.8, DZ, DZ + 2.4, 0.5, 0.6, '#8a9ab0', M.metal, 8); m.box(D.u + 2.3, D.v + 1, DZ, D.u + 2.7, D.v + 1.4, DZ + 6, '#3a3448', M.metal); m.box(D.u + 2.1, D.v + 0.8, DZ + 6, D.u + 2.9, D.v + 1.6, DZ + 8, '#ffe9a8', M.glow); }
    house(m, o, S, roof, rmat); tower(m, o, roof, rmat); greenhouse(m, o);
    // 船尾甲板：小舱房、舵轮、望远镜、系气球的桩
    { const z = HG + QH; m.box(CABIN.u0, CABIN.v0, z, CABIN.u1, CABIN.v1, z + 9, '#a8784a', M.plank);
      m.quad([CABIN.u0 - 0.4, CABIN.v0 - 0.4, z + 12.5], [CABIN.u0 - 0.4, CABIN.v1 + 0.4, z + 12.5], [CABIN.u1 + 0.5, CABIN.v1 + 0.4, z + 9], [CABIN.u1 + 0.5, CABIN.v0 - 0.4, z + 9], roof('#8a9ab0'), snow ? M.snow : M.metal);
      m.tri([CABIN.u0, CABIN.v1, z + 9], [CABIN.u1, CABIN.v1, z + 9], [CABIN.u0, CABIN.v1, z + 12.3], '#a8784a', M.plank);
      m.box(CABIN.u1 - 0.02, 24.6, z, CABIN.u1 + 0.12, 26.2, z + 7.5, '#3a6a7a', M.plank); m.disc(CABIN.u1 + 0.16, 27, z + 5.5, 0.4, 'u', '#9fd4f2', M.glass, 8); m.win('v', 3, 4.2, z + 3.5, z + 7, CABIN.v1, { frame: '#3a6a7a' });
      m.box(5.1, 32.8, z, 5.5, 33.2, z + 5, WOOD, 2); m.disc(5.56, 33, z + 5.2, 0.95, 'u', '#7a5236', 0, 10); m.disc(5.6, 33, z + 5.2, 0.6, 'u', '#e0b070', 0, 8); m.disc(5.64, 33, z + 5.2, 0.2, 'u', '#5a3a28', 0, 6);
      m.cyl(K.SCOPE.u, K.SCOPE.v, z, z + 6, 0.5, 0.08, '#5a5466', M.metal, 3, false); m.cyl(K.SCOPE.u, K.SCOPE.v, z + 6, z + 7.4, 0.22, 0.3, '#e0b070', M.metal, 7); m.quad([K.SCOPE.u - 0.2, K.SCOPE.v, z + 6.6], [K.SCOPE.u + 1.3, K.SCOPE.v + 1.3, z + 9.2], [K.SCOPE.u + 1.5, K.SCOPE.v + 1.1, z + 10.2], [K.SCOPE.u, K.SCOPE.v - 0.2, z + 7.6], '#e0b070', M.metal);
      m.cyl(BALLOON.u, BALLOON.v, z, z + 8, 0.3, 0.22, '#8a5a3a', 2, 6); m.cyl(BALLOON.u, BALLOON.v, z + 8, z + 9, 0.34, 0.1, '#e0b070', 0, 6);
      m.pot(3, 31, z, 0.5, '#c8705a', S.bush, 3); m.pot(5.4, 22, z, 0.45, '#5a7ab0', FLOW[0], 5); m.box(2.6, 34.5, z, 4, 36, z + 2.8, '#8a5a3a', M.plank); m.cyl(3.3, 37.4, z, z + 3.6, 0.6, 0.6, '#9a6a42', M.plank, 8); }
    // 桅杆、打补丁的帆、彩旗
    { const u = MAST.u, v = MAST.v; m.cyl(u, v, HG, HG + 74, 0.38, 0.2, '#8a5a3a', M.plank, 7); m.cyl(u, v, HG, HG + 2.5, 0.9, 0.7, '#7a5236', 2, 8); m.cyl(u, v, HG + 64, HG + 68, 0.75, 1.0, '#7a5236', M.plank, 8);
      m.box(u - 4.9, v - 0.15, HG + 57, u + 4.9, v + 0.15, HG + 58.2, '#7a5236', 2); m.box(u - 4.4, v - 0.15, HG + 19, u + 4.4, v + 0.15, HG + 20, '#7a5236', 2);
      const PAT = ['#f4ead6', '#e8c8a8', '#a8d0c8', '#f2c4c4', '#ffe0a0'], P = (i, j) => [u + (i - 2.5) * 1.8 * (1 - 0.06 * Math.abs(j - 2.5)), v + 0.25 + Math.sin(Math.PI * j / 5) * Math.sin(Math.PI * i / 5) * 1.5, HG + 20 + j * 7.4];
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) m.quad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), PAT[(i * 2 + j * 3 + (i * j) % 2) % 5], M.cloth);
      m.tri([u, v, HG + 74], [u + 2.6, v + 0.2, HG + 72.5], [u, v, HG + 71], '#e8405a', 0);
      const A = [u, v, HG + 60], B = [COT.u1 + 0.8, 26.5, HG + 45.5], BC = ['#e8705a', '#ffd36a', '#5a8ad8', '#7cbc62', '#f2a6c2'];
      for (let i = 1; i < 12; i++) { const t = i / 12, p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t - Math.sin(t * Math.PI) * 9]; m.tri([p[0] - 0.35, p[1] - 0.35, p[2]], [p[0] + 0.35, p[1] + 0.35, p[2]], [p[0], p[1], p[2] - 2.6], BC[i % 5], 0); } }
    // 树、菜地、篝火、信箱、雨水桶、船头灯
    m.box(TREE.u - 1.6, TREE.v - 1.6, HG, TREE.u + 1.6, TREE.v + 1.6, HG + 3.2, '#a8784a', M.plank, '#6a4026', M.soil); m.tree(TREE.u, TREE.v, HG + 3, 1.25, S.tree, 4);
    if (o.season === 'spring' || o.season === 'summer') for (let i = 0; i < 6; i++) m.blob(TREE.u + Math.cos(i * 1.1) * 2.2, TREE.v + Math.sin(i * 1.1) * 2.2, HG + 17 + (i % 3) * 3, 0.26, 0.6, o.season === 'spring' ? '#ffd0e0' : '#e8405a', 0, i, 2, 4);
    PLOTS.forEach(([pu, pv], i) => {
      m.box(pu - 0.5, pv - 0.5, HG, pu + 4.5, pv + 4.5, HG + 1.3, '#a8784a', M.plank); m.box(pu - 0.2, pv - 0.2, HG + 0.4, pu + 4.2, pv + 4.2, HG + 1.5, snow && !(o.farm && o.farm[i]) ? '#e4ecf6' : (o.farm && o.farm[i] && o.farm[i].wet ? '#4a2c1a' : '#6a4026'), M.soil);
      const f = o.farm && o.farm[i]; if (f) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) crop(m, f.crop, f.stage, pu + 0.7 + a * 1.3, pv + 0.7 + b * 1.3, HG + 1.5, i * 9 + a * 3 + b);
    });
    m.box(PLOTS[0][0] - 1.9, PLOTS[0][1] + 1.3, HG, PLOTS[0][0] - 1.6, PLOTS[0][1] + 1.6, HG + 5, WOOD, 2); m.box(PLOTS[0][0] - 2, PLOTS[0][1] + 0.4, HG + 4, PLOTS[0][0] - 1.5, PLOTS[0][1] + 2.5, HG + 7.5, '#e0b07a', M.plank);
    m.cyl(FIRE.u, FIRE.v, HG, HG + 0.4, 2.9, 2.9, '#a8a0b4', M.stone, 14); for (let i = 0; i < 9; i++) m.blob(FIRE.u + Math.cos(i * 0.7) * 1.25, FIRE.v + Math.sin(i * 0.7) * 1.25, HG + 0.9, 0.36, 0.8, i % 2 ? '#9890a8' : '#b8b0c4', 0, i, 3, 5);
    m.box(FIRE.u - 0.9, FIRE.v - 0.2, HG + 0.4, FIRE.u + 0.9, FIRE.v + 0.2, HG + 1.3, '#6a4430', 2); m.box(FIRE.u - 0.2, FIRE.v - 0.9, HG + 0.6, FIRE.u + 0.2, FIRE.v + 0.9, HG + 1.5, '#7a5236', 2);
    for (const [a, b] of [[-3.2, 2], [2.2, -3.2], [-2.5, -2.8]]) { m.cyl(FIRE.u + a, FIRE.v + b, HG, HG + 2.6, 0.75, 0.7, '#8a5a3a', M.plank, 9, true, '#d8b080'); }
    m.box(MAILB.u - 0.14, MAILB.v - 0.14, HG, MAILB.u + 0.14, MAILB.v + 0.14, HG + 6.5, WOOD, 2); m.box(MAILB.u - 0.55, MAILB.v - 0.75, HG + 6.5, MAILB.u + 0.55, MAILB.v + 0.75, HG + 9.3, '#e0503a', 0, '#f06a52'); m.box(MAILB.u + 0.55, MAILB.v + 0.2, HG + 7.5, MAILB.u + 0.66, MAILB.v + 0.4, HG + 11, '#ffd36a', 0);
    m.cyl(BARREL.u, BARREL.v, HG, HG + 6.5, 0.95, 1.05, '#9a6a42', M.plank, 10, false); m.cyl(BARREL.u, BARREL.v, HG + 5.8, HG + 5.9, 0.95, 0.95, '#7ac0e8', M.water, 10); for (const zz of [1.2, 4.6]) m.cyl(BARREL.u, BARREL.v, HG + zz, HG + zz + 0.6, 1.08, 1.08, '#5a5466', M.metal, 10, false);
    for (const [u, v] of [[54, 28], [22.5, 34.3], [38.2, 17.4]]) { m.cyl(u, v, HG, HG + 11, 0.16, 0.12, '#3a3448', M.metal, 5); m.box(u - 0.4, v - 0.4, HG + 11, u + 0.4, v + 0.4, HG + 13.6, '#ffe9a8', M.glow); m.cyl(u, v, HG + 13.6, HG + 15, 0.6, 0.05, '#3a3448', 0, 4); }
    // 花丛、灌木
    let n = 0; for (let i = 0; i < 46; i++) { const u = 8 + H(i, 1) * 46, v = 9 + H(i, 2) * 40; if (!K.inDeck(u + 1.5, v) || !K.inDeck(u, v + 1.5) || !K.inDeck(u, v - 1.5) || o.busy(u, v)) continue; n++; if (i % 4 === 0) m.blob(u, v, HG + 1.3, 1, 2, snow ? '#e4ecf6' : S.bush, snow ? M.snow : 8, i, 4, 7); if (!snow) flowers(m, u, v, HG, 5, 1.3, i, S.bush); }
    // 摆设
    (o.deco || []).forEach((id, i) => { if (!id || !K.SLOTS[i]) return; const [u, v] = K.SLOTS[i], z = HG;
      if (id === 'bench') { m.box(u - 1.6, v - 0.5, z + 2, u + 1.6, v + 0.5, z + 2.6, '#c8935e', M.plank); m.box(u - 1.6, v - 0.5, z + 2.6, u + 1.6, v - 0.3, z + 5.4, '#a8784a', M.plank); posts(m, [[u - 1.4, v - 0.3], [u + 1.4, v - 0.3], [u - 1.4, v + 0.3], [u + 1.4, v + 0.3]], z, 2, '#7a5236'); }
      else if (id === 'lampPost') { m.cyl(u, v, z, z + 13, 0.18, 0.13, '#3a3448', M.metal, 5); m.box(u - 0.45, v - 0.45, z + 13, u + 0.45, v + 0.45, z + 16, '#ffe9a8', M.glow); m.cyl(u, v, z + 16, z + 17.5, 0.7, 0.05, '#3a3448', 0, 4); }
      else if (id === 'hay') { m.box(u - 1.3, v - 0.9, z, u + 1.3, v + 0.9, z + 3.6, '#e8c860', M.cloth); m.box(u - 0.8, v - 0.6, z + 3.6, u + 1, v + 0.7, z + 6, '#dcb850', M.cloth); }
      else if (id === 'lantern') { m.blob(u, v, z + 2, 0.95, 2.2, '#f2832a', 0, 3, 4, 8); m.box(u - 0.3, v + 0.75, z + 1.6, u + 0.3, v + 0.95, z + 2.8, '#ffe27a', M.glow); m.cyl(u, v, z + 4, z + 5, 0.1, 0.07, '#3f8a44', 0, 4); }
      else if (id === 'flowers') { m.blob(u, v, z + 1.4, 1.2, 2.2, S.bush, 8, i, 4, 7); flowers(m, u, v, z + 1.5, 9, 1.2, i + 7, S.bush); }
      else if (id === 'scarecrow') { m.box(u - 0.14, v - 0.14, z, u + 0.14, v + 0.14, z + 11, '#8a6040', 2); m.box(u - 1.7, v - 0.12, z + 7, u + 1.7, v + 0.12, z + 7.7, '#8a6040', 2); m.box(u - 0.9, v - 0.3, z + 4, u + 0.9, v + 0.3, z + 8.2, '#5a8ad8', M.cloth); m.blob(u, v, z + 10.2, 0.6, 1.5, '#f2d28a', 0, 2, 4, 7); m.cyl(u, v, z + 11, z + 11.5, 1.1, 1.1, '#c8a050', 0, 9); m.cyl(u, v, z + 11.5, z + 13.5, 0.6, 0.15, '#b08a40', 0, 8); }
      else if (id === 'swing') { for (const s of [-1.6, 1.6]) { m.quad([u + s - 0.5, v, z], [u + s - 0.2, v, z], [u + s + 0.15, v, z + 13], [u + s - 0.15, v, z + 13], '#8a6040', 2); } m.box(u - 1.9, v - 0.15, z + 12.6, u + 1.9, v + 0.15, z + 13.5, '#a8784a', 2); for (const s of [-0.8, 0.8]) m.box(u + s - 0.05, v - 0.05, z + 3.6, u + s + 0.05, v + 0.05, z + 12.6, '#d8c8a0', 0); m.box(u - 1, v - 0.4, z + 3, u + 1, v + 0.4, z + 3.6, '#c8935e', M.plank); } });
    return m;
  }
  function house(m, o, S, roof, rmat) {
    const z = HG, c = COT, z1 = z + 17, z2 = z + 31, fv = c.v1, fu = c.u1;
    m.box(c.u0 - 0.15, c.v0 - 0.15, z, c.u1 + 0.15, c.v1 + 0.15, z + 3.6, STONE, M.stone); m.box(c.u0, c.v0, z + 3.6, c.u1, c.v1, z1, PLASTER, M.plaster);
    for (const u of [c.u0, c.u1 - 0.5, 11.4, 14.2]) m.box(u, fv - 0.02, z + 3.6, u + 0.5, fv + 0.14, z1, TIMBER, 2);
    // 门：门廊小屋顶 + 台阶 + 门垫 + 门灯
    m.box(11.8, fv, z, 14.2, fv + 1.5, z + 1, '#c4bcd0', M.stone); m.box(12.1, fv + 1.5, z, 13.9, fv + 2.1, z + 0.5, '#c4bcd0', M.stone); m.box(12.3, fv + 0.2, z + 1, 13.7, fv + 1.3, z + 1.15, '#d0604a', M.cloth);
    m.box(11.9, fv, z + 1, 14.1, fv + 0.2, z + 13.6, TIMBER, 2); m.box(12.15, fv + 0.1, z + 1, 13.85, fv + 0.3, z + 12.8, '#3a7a8a', M.plank); m.disc(13, fv + 0.34, z + 10, 0.42, 'v', '#9fd4f2', M.glass, 8); m.box(13.45, fv + 0.3, z + 6.4, 13.65, fv + 0.45, z + 7, '#ffd36a', M.glow);
    posts(m, [[11.6, fv + 1.4], [14.4, fv + 1.4]], z + 1, 13, TIMBER); m.gable(11.3, fv, 14.7, fv + 1.6, z + 14.2, 3, 'v', roof(TILE), rmat, 0.3, PLASTER, M.plaster);
    m.box(14.5, fv + 0.1, z + 10, 14.9, fv + 0.5, z + 11.6, '#ffe9a8', M.glow);
    m.win('v', 15.4, 17.8, z + 7, z + 13.5, fv, { shut: '#3a7a8a', box: '#e8705a' }); m.win('v', 8.7, 10.6, z + 7, z + 13.5, fv, { shut: '#3a7a8a', box: '#ffd36a' });
    // 侧屋（厨房）：单坡顶 + 烟管
    const w = K.WING; m.box(w.u0, w.v0, z, w.u1, w.v1, z + 3, STONE, M.stone); m.box(w.u0, w.v0 + 0.1, z + 3, w.u1 - 0.1, w.v1 - 0.1, z + 11, '#ecdcb8', M.plaster);
    m.quad([fu, w.v0 - 0.5, z + 16.5], [fu, w.v1 + 0.5, z + 16.5], [w.u1 + 0.8, w.v1 + 0.5, z + 10.2], [w.u1 + 0.8, w.v0 - 0.5, z + 10.2], roof(TILE), rmat);
    m.tri([fu, w.v1 - 0.1, z + 11], [w.u1 - 0.1, w.v1 - 0.1, z + 11], [fu, w.v1 - 0.1, z + 16], '#ecdcb8', M.plaster);
    m.win('u', 24.4, 26, z + 5.5, z + 9.6, w.u1 - 0.1, { box: '#f2a6c2' }); m.win('u', 27.4, 29, z + 5.5, z + 9.6, w.u1 - 0.1, {}); m.win('v', 19.6, 20.9, z + 5.5, z + 9.6, w.v1 - 0.1, {});
    m.cyl(20.6, 24.6, z + 12, z + 21, 0.3, 0.3, '#8a9ab0', M.metal, 6); m.cyl(20.6, 24.6, z + 21, z + 22.2, 0.55, 0.1, '#5a667e', 0, 6);
    // 二楼：出挑的木筋墙
    const a0 = c.u0 - 0.5, a1 = c.u1 + 0.6, b0 = c.v0 - 0.5, b1 = c.v1 + 0.6;
    m.box(a0 - 0.1, b0 - 0.1, z1 - 0.7, a1 + 0.1, b1 + 0.1, z1 + 0.6, TIMBER, 2); m.box(a0, b0, z1 + 0.6, a1, b1, z2, '#f6eedc', M.plaster); m.box(a0 - 0.1, b0 - 0.1, z2 - 1, a1 + 0.1, b1 + 0.1, z2, TIMBER, 2);
    for (let u = a0; u < a1 + 0.1; u += (a1 - a0 - 0.4) / 5) m.box(u, b1 - 0.02, z1, u + 0.4, b1 + 0.14, z2, TIMBER, 2);
    for (let v = b0; v < b1 + 0.1; v += (b1 - b0 - 0.4) / 5) m.box(a1 - 0.02, v, z1, a1 + 0.14, v + 0.4, z2, TIMBER, 2);
    m.box(a0, b1, z1 + 6.4, a1, b1 + 0.12, z1 + 7, TIMBER, 2); m.box(a1, b0, z1 + 6.4, a1 + 0.12, b1, z1 + 7, TIMBER, 2);
    m.win('v', 8.6, 10.2, z1 + 4, z1 + 10.5, b1, { shut: '#c8504a' }); m.win('v', 11.6, 13.2, z1 + 4, z1 + 10.5, b1, { shut: '#c8504a', box: '#ffffff' });
    m.win('u', 22.4, 24, z1 + 4, z1 + 10.5, a1, { shut: '#c8504a' }); m.win('u', 25.6, 27.4, z1 + 4, z1 + 10.5, a1, { box: '#f2a6c2' }); m.win('u', 29, 30.6, z1 + 4, z1 + 10.5, a1, { shut: '#c8504a' });
    // 阳台（二楼正面右侧）：落地窗 + 栏杆 + 花盆
    m.box(15.6, b1, z1 + 0.8, 18.4, b1 + 0.15, z1 + 11.5, TIMBER, 2); m.box(15.85, b1 + 0.1, z1 + 1, 18.15, b1 + 0.22, z1 + 11, '#9fd4f2', M.glass); m.box(16.95, b1 + 0.2, z1 + 1, 17.05, b1 + 0.3, z1 + 11, TIMBER, 2);
    m.box(14.9, b1, z1 - 0.2, 19.3, b1 + 2, z1 + 0.6, '#b88a5a', M.plank); m.rail(14.9, b1 + 1.9, 19.3, b1 + 1.9, z1 + 0.6, 5); m.rail(19.25, b1 + 0.2, 19.25, b1 + 1.9, z1 + 0.6, 5); m.rail(14.95, b1 + 0.2, 14.95, b1 + 1.9, z1 + 0.6, 5);
    for (const u of [15.2, 19]) m.tri([u, b1, z1 - 4.5], [u, b1, z1 - 0.2], [u, b1 + 1.8, z1 - 0.2], TIMBER, 2);
    m.pot(15.5, b1 + 1.3, z1 + 0.6, 0.4, '#c8705a', FLOW[0], 2); m.pot(18.7, b1 + 1.3, z1 + 0.6, 0.4, '#5a7ab0', S.bush, 4);
    // 屋顶 + 两个老虎窗 + 山墙圆窗 + 烟囱
    const rh = 14; m.gable(a0, b0, a1, b1, z2, rh, 'u', roof(TILE), rmat, 0.9, '#f6eedc', M.plaster);
    m.disc(a1 + 0.1, (b0 + b1) / 2, z2 + 5.5, 0.85, 'u', TIMBER, 0, 10); m.disc(a1 + 0.16, (b0 + b1) / 2, z2 + 5.5, 0.6, 'u', '#9fd4f2', M.glass, 8); m.tri([a1 + 0.05, b0 + 1, z2], [a1 + 0.05, (b0 + b1) / 2, z2 + rh - 1.5], [a1 + 0.05, b0 + 1.5, z2], TIMBER, 2);
    for (const u of [9.4, 14.6]) { m.box(u, 28.2, z2 + 2.5, u + 2.4, 31.2, z2 + 8, '#f6eedc', M.plaster); m.gable(u, 27.2, u + 2.4, 31.3, z2 + 8, 2.4, 'v', roof(TILE), rmat, 0.35, '#f6eedc', M.plaster); m.win('v', u + 0.5, u + 1.9, z2 + 4, z2 + 7.4, 31.2, { out: 0.12 }); }
    m.box(15.6, 22.2, z2 + 6, 17.6, 24, z2 + 21, '#b8584a', M.stone); m.box(15.4, 22, z2 + 21, 17.8, 24.2, z2 + 22.2, '#8a8298', 0); m.cyl(16.1, 23.1, z2 + 22.2, z2 + 24.5, 0.32, 0.26, '#c8705a', 0, 6); m.cyl(17.1, 23.1, z2 + 22.2, z2 + 25.4, 0.32, 0.26, '#c8705a', 0, 6);
    // 角楼（蓝色尖顶）+ 通到圆塔的木连廊
    m.cyl(c.u0 + 0.2, c.v1 - 0.4, z, z + 43, 1.7, 1.6, '#d8d0dc', M.stone, 10); m.cyl(c.u0 + 0.2, c.v1 - 0.4, z + 43, z + 44.5, 1.7, 2.3, TIMBER, 0, 10); m.cyl(c.u0 + 0.2, c.v1 - 0.4, z + 44.5, z + 59, 2.4, 0, roof(SLATE), rmat, 10); m.cyl(c.u0 + 0.2, c.v1 - 0.4, z + 59, z + 62, 0.1, 0.02, '#e0b070', 0, 4);
    for (const zz of [8, 22, 35]) { m.box(c.u0 - 0.2, c.v1 + 1.15, z + zz, c.u0 + 0.6, c.v1 + 1.4, z + zz + 4.5, '#9fd4f2', M.glass); m.box(c.u0 - 0.35, c.v1 + 1.1, z + zz - 0.6, c.u0 + 0.75, c.v1 + 1.35, z + zz, '#d8ccb4', 0); }
    m.box(8.3, 18.6, z + 19, 10.3, c.v0 - 0.4, z + 27, '#b88a5a', M.plank); m.gable(8.3, 18.4, 10.3, c.v0 - 0.3, z + 27, 2.2, 'v', roof(TILE), rmat, 0.3, '#b88a5a', M.plank); m.win('u', 19.2, 20.2, z + 21.5, z + 25, 10.3, { out: 0.1 });
    for (const u of [8.5, 10.1]) m.box(u - 0.15, 18.8, z, u + 0.15, 19.1, z + 19, TIMBER, 2);
    // 爬藤、墙脚的灌木、门牌
    for (let i = 0; i < 9; i++) m.blob(9.1 + H(i, 5) * 1.6, fv + 0.2, z + 3 + i * 1.5, 0.75, 1.6, i % 2 ? '#4f9a48' : '#66b058', 8, i, 3, 5); for (let i = 0; i < 7; i++) m.blob(fu + 0.75, 31.2 - H(i, 8) * 1.4, z1 + 1 + i * 1.6, 0.6, 1.6, i % 2 ? '#4f9a48' : '#3f8a44', 8, i + 3, 3, 5);
    for (const [u, v, r] of [[15.2, fv + 1, 1], [17.6, fv + 1.1, 1.2], [9.6, fv + 1, 0.9], [22.3, 30.6, 0.9]]) { m.blob(u, v, z + 1.3, r, 2.2, o.snow ? '#e4ecf6' : S.bush, o.snow ? M.snow : 8, u, 4, 7); if (!o.snow) flowers(m, u, v, z + 1.6, 5, r, u | 0, S.bush); }
    m.box(10.9, fv + 0.1, z + 9, 11.6, fv + 0.25, z + 11.4, '#e8c08a', M.plank);
  }
  function tower(m, o, roof, rmat) {
    const t = TOWER, z = HG, top = z + t.h;
    m.cyl(t.u, t.v, z, z + 5, 3.9, 3.5, '#a8a0b4', M.stone, 16); m.cyl(t.u, t.v, z + 5, top, 3.45, 3.2, '#cfc6d6', M.stone, 16);
    m.cyl(t.u, t.v, top, top + 2, 3.3, 4.3, '#5a3a28', 0, 16); m.cyl(t.u, t.v, top + 2, top + 26, 4.5, 0, roof(TILE), rmat, 16); m.cyl(t.u, t.v, top + 26, top + 30, 0.12, 0.04, '#e0b070', 0, 4);
    // 塔顶小老虎窗、塔身的窗
    m.box(t.u - 0.7, t.v + 2.4, top + 3, t.u + 0.7, t.v + 3.6, top + 8, '#f6eedc', M.plaster); m.gable(t.u - 0.7, t.v + 1.5, t.u + 0.7, t.v + 3.7, top + 8, 2, 'v', roof(TILE), rmat, 0.3, '#f6eedc', M.plaster); m.box(t.u - 0.4, t.v + 3.6, top + 4, t.u + 0.4, t.v + 3.7, top + 7.2, '#9fd4f2', M.glass);
    const W = (a, zz, hh = 5) => { const cu = t.u + Math.cos(a) * 3.25, cv = t.v + Math.sin(a) * 3.25; m.box(cu - 0.55, cv - 0.55, z + zz - 0.6, cu + 0.55, cv + 0.55, z + zz + hh + 0.6, TIMBER, 0); m.box(cu - 0.42 + Math.cos(a) * 0.2, cv - 0.42 + Math.sin(a) * 0.2, z + zz, cu + 0.42 + Math.cos(a) * 0.2, cv + 0.42 + Math.sin(a) * 0.2, z + zz + hh, '#9fd4f2', M.glass); };
    W(1.57, 12); W(0.5, 22); W(1.2, 41); W(0.1, 42); W(1.57, 26, 4); W(0, 9);
    // 绕塔的露天楼梯 → 一圈木阳台
    for (let i = 0; i < 20; i++) { const a = 2.6 - i * 0.155, cu = t.u + Math.cos(a) * 4.25, cv = t.v + Math.sin(a) * 4.25, zz = z + 1 + i * 1.62; m.box(cu - 0.72, cv - 0.72, zz - 0.5, cu + 0.72, cv + 0.72, zz + 0.3, '#b88a5a', M.plank); if (i % 2 === 0) { const pu = t.u + Math.cos(a) * 4.9, pv = t.v + Math.sin(a) * 4.9; m.box(pu - 0.1, pv - 0.1, zz, pu + 0.1, pv + 0.1, zz + 4.6, WOOD, 2); } if (i % 4 === 0) m.box(cu - 0.16, cv - 0.16, z, cu + 0.16, cv + 0.16, zz - 0.5, '#7a5236', 2); }
    const bz = z + 33; m.cyl(t.u, t.v, bz - 1.2, bz, 4.2, 5.1, '#7a5236', 0, 16); m.cyl(t.u, t.v, bz, bz + 0.6, 5.1, 5.1, '#c8935e', M.plank, 16);
    for (let i = 0; i < 16; i++) { const a = i * 0.3927, pu = t.u + Math.cos(a) * 4.95, pv = t.v + Math.sin(a) * 4.95; m.box(pu - 0.12, pv - 0.12, bz + 0.6, pu + 0.12, pv + 0.12, bz + 5.4, WOOD, 2); }
    m.cyl(t.u, t.v, bz + 4.8, bz + 5.5, 5.05, 5.05, '#c8935e', 0, 16, false); m.cyl(t.u, t.v, bz + 2.6, bz + 3.2, 5.0, 5.0, '#c8935e', 0, 16, false);
    { const a = 0.8, cu = t.u + Math.cos(a) * 3.3, cv = t.v + Math.sin(a) * 3.3; m.box(cu - 0.6, cv - 0.6, bz + 0.6, cu + 0.6, cv + 0.6, bz + 9, '#3a7a8a', M.plank); }
    m.pot(t.u + 4.3, t.v + 1.2, bz + 0.6, 0.38, '#c8705a', FLOW[1], 3); m.pot(t.u + 1, t.v + 4.4, bz + 0.6, 0.38, '#5a7ab0', '#5aa64e', 6);
    for (let i = 0; i < 12; i++) m.blob(t.u + Math.cos(0.3 + i * 0.12) * 3.5, t.v + Math.sin(0.3 + i * 0.12) * 3.5, z + 4 + i * 2.3, 0.7, 1.7, i % 2 ? '#4f9a48' : '#66b058', 8, i, 3, 5);
    { const a = 1.25, cu = t.u + Math.cos(a) * 3.55, cv = t.v + Math.sin(a) * 3.55; m.box(cu - 0.7, cv - 0.5, z, cu + 0.7, cv + 0.5, z + 9.5, TIMBER, 2); m.box(cu - 0.5, cv - 0.3, z, cu + 0.5, cv + 0.62, z + 8.6, '#8a5236', M.plank); }
  }
  function greenhouse(m, o) {
    const g = GREEN, z = HG, zt = z + 13, W = '#f4f4f4', GL = '#bfe6f5';
    m.box(g.u0, g.v0, z, g.u1, g.v1, z + 2.6, STONE, M.stone); m.box(g.u0 + 0.15, g.v0 + 0.15, z + 2.6, g.u1 - 0.15, g.v1 - 0.15, zt, GL, M.glass);
    for (let u = g.u0; u <= g.u1 + 0.01; u += 2) m.box(u - 0.15, g.v1 - 0.2, z + 2.6, u + 0.15, g.v1 + 0.02, zt, W, 0); for (let v = g.v0; v <= g.v1 + 0.01; v += 1.65) m.box(g.u1 - 0.2, v - 0.15, z + 2.6, g.u1 + 0.02, v + 0.15, zt, W, 0);
    m.box(g.u0 - 0.1, g.v0 - 0.1, zt - 0.5, g.u1 + 0.1, g.v1 + 0.1, zt + 0.4, W, 0); m.box(g.u0, g.v1 - 0.1, z + 7.5, g.u1, g.v1 + 0.04, z + 8.1, W, 0); m.box(g.u1 - 0.1, g.v0, z + 7.5, g.u1 + 0.04, g.v1, z + 8.1, W, 0);
    m.gable(g.u0, g.v0, g.u1, g.v1, zt + 0.4, 6, 'u', o.snow ? '#f4f7fc' : '#cfeefa', o.snow ? M.snow : M.glass, 0.3, GL, M.glass);
    for (let u = g.u0; u <= g.u1 + 0.01; u += 2) { const mv = (g.v0 + g.v1) / 2; m.quad([u - 0.12, g.v1 + 0.3, zt + 0.3], [u + 0.12, g.v1 + 0.3, zt + 0.3], [u + 0.12, mv, zt + 6.6], [u - 0.12, mv, zt + 6.6], W, 0); }
    // 门（朝船头那面）+ 门口的盆栽和木箱
    const D = K.GDOOR.v;
    m.box(g.u1, D + -0.90, z, g.u1 + 0.2, D + 0.90, z + 11, W, 0); m.box(g.u1 + 0.1, D + -0.70, z + 0.4, g.u1 + 0.3, D + 0.70, z + 10.4, '#8fd0c0', M.glass); m.box(g.u1 + 0.3, D + 0.40, z + 5, g.u1 + 0.42, D + 0.55, z + 5.6, '#ffd36a', M.glow); m.box(g.u1, D + -1.00, z, g.u1 + 1.2, D + 1.00, z + 0.5, '#c4bcd0', M.stone);
    m.pot(g.u1 + 0.8, D + -1.70, z, 0.5, '#c8705a', '#5aa64e', 2); m.pot(g.u1 + 0.8, D + 1.80, z, 0.45, '#c8705a', FLOW[4], 5); m.box(g.u1 + 0.4, D + 2.60, z, g.u1 + 1.8, D + 3.80, z + 2.4, '#a8784a', M.plank); m.blob(g.u1 + 1.1, D + 3.20, z + 3, 0.6, 1.3, '#f08a3a', 0, 4, 3, 6);
    for (let i = 0; i < 6; i++) m.blob(g.u0 + 1 + i * 1.2, g.v1 + 0.2, z + 3 + (i % 3) * 2.4, 0.7, 1.6, i % 2 ? '#4f9a48' : '#66b058', 8, i, 3, 5);
  }

  // ---------- 小屋内部：客厅 + 厨房（一楼），走楼梯上阁楼（卧室 + 书桌）----------
  function wallShell(m, hgt, o) {
    m.box(R0, R0, -3, R1, R1, 0, '#9890a8', M.stone); m.box(R0, R0, 0, R1, R1, RH0, o.floor || '#c09060', o.fmat == null ? M.plank : o.fmat);
    m.box(R0 - 1.6, R0 - 1.6, -3, R1, R0, hgt, o.wall || '#f4e2c4', o.wmat == null ? M.wallpaper : o.wmat); m.box(R0 - 1.6, R0, -3, R0, R1, hgt, o.wall2 || '#ead6b6', o.wmat == null ? M.wallpaper : o.wmat);
    m.box(R0 - 1.8, R0 - 1.8, hgt, R1, R0 + 0.3, hgt + 1.5, TIMBER, 2); m.box(R0 - 1.8, R0, hgt, R0 + 0.3, R1, hgt + 1.5, TIMBER, 2);
  }
  function exitDoor(m, u) { const v = R1 - 0.4; m.box(u - 2.2, v, RH0, u - 1.7, v + 0.4, RH0 + 24, TIMBER, 2); m.box(u + 1.7, v, RH0, u + 2.2, v + 0.4, RH0 + 24, TIMBER, 2); m.box(u - 2.2, v, RH0 + 24, u + 2.2, v + 0.4, RH0 + 26, TIMBER, 2); m.box(u - 1.5, v - 3.4, RH0, u + 1.5, v - 0.4, RH0 + 0.15, '#d0604a', M.cloth); }
  function room(o) {
    const m = new g3.Mesh(), rm = o.room || {}, z = RH0, lz = RH0 + LOFT;
    wallShell(m, WALLH, {});
    m.box(R0, R0, z, R1, R0 + 0.25, z + 11, '#9a6a42', M.plank); m.box(R0, R0, z, R0 + 0.25, R1, z + 11, '#8a5a3a', M.plank); m.box(R0, R0, z + 11, R1, R0 + 0.4, z + 11.8, '#c8935e', 0); m.box(R0, R0, z + 11, R0 + 0.4, R1, z + 11.8, '#c8935e', 0);
    // 窗：一楼三扇、阁楼四扇
    const cur = { frame: '#6a4430', sill: '#c8935e' };
    for (const [a, b] of [[35.5, 42]]) { m.win('v', a, b, z + 15, z + 26, R0, cur); m.box(a - 1, R0 + 0.2, z + 14, a + 0.6, R0 + 0.5, z + 27.5, '#d0604a', M.cloth); m.box(b - 0.6, R0 + 0.2, z + 14, b + 1, R0 + 0.5, z + 27.5, '#d0604a', M.cloth); m.box(a - 1.2, R0 + 0.1, z + 27.4, b + 1.2, R0 + 0.6, z + 28, TIMBER, 2); }
    m.win('u', 44, 51, z + 15, z + 26, R0, cur);
    for (const [a, b] of [[11, 16], [24, 29], [44, 49]]) m.win('v', a, b, lz + 12, lz + 23, R0, cur); m.win('u', 10, 16, lz + 12, lz + 23, R0, { ...cur, arch: 1 });
    // 阁楼：地板、栏杆、柱子
    const LU = 34; m.box(R0, R0, lz - 2, LU, LOFTV, lz, '#b88a5a', M.plank); m.box(R0, LOFTV - 0.4, lz - 3.2, LU, LOFTV, lz, TIMBER, 2); m.box(LU - 0.4, R0, lz - 3.2, LU, LOFTV, lz, TIMBER, 2);
    m.rail(12, LOFTV - 0.3, LU - 0.3, LOFTV - 0.3, lz, 6.5); m.rail(LU - 0.3, LOFTV - 0.3, LU - 0.3, R0 + 0.5, lz, 6.5);
    for (const u of [12.2, 23, LU - 0.5]) { m.box(u - 0.4, LOFTV - 0.8, z, u + 0.4, LOFTV, lz - 3.2, TIMBER, 2); m.tri([u, LOFTV - 0.4, lz - 8], [u + 3, LOFTV - 0.4, lz - 3.2], [u, LOFTV - 0.4, lz - 3.2], TIMBER, 2); }
    // 楼梯（靠左墙）
    m.stairs(40, LOFTV, 6.5, 11.5, z, lz, 'v', '#b88a5a', 14); m.rail(11.5, 40, 11.5, 40.2, z, 7); for (let i = 0; i <= 6; i++) { const v = 40 - i * 3, zz = z + (i / 6) * LOFT; m.box(11.3, v - 0.15, zz, 11.6, v + 0.15, zz + 7, WOOD, 2); if (i < 6) m.quad([11.45, v, zz + 6.4], [11.45, v - 3, zz + 6.4 + LOFT / 6], [11.45, v - 3, zz + 7.2 + LOFT / 6], [11.45, v, zz + 7.2], '#c8935e', 2); }
    // 壁炉（阁楼底下的后墙）+ 烟道一直通到顶
    const FX = 16.5;
    m.box(27 + FX, R0, z, 39 + FX, R0 + 4, z + 24, '#b0a8bc', M.stone); m.box(29.5 + FX, R0, z + 24, 36.5 + FX, R0 + 3, WALLH, '#a8a0b4', M.stone); m.box(26.6 + FX, R0, z + 15, 39.4 + FX, R0 + 4.6, z + 16.6, '#7a4e30', M.plank);
    m.box(29.5 + FX, R0 + 3.6, z + 1, 36.5 + FX, R0 + 4.1, z + 12, '#2a2026', 0); m.box(30 + FX, R0 + 2, z, 36 + FX, R0 + 5.4, z + 1, '#8a8298', M.stone); m.box(31 + FX, R0 + 3.5, z + 1, 35 + FX, R0 + 4.6, z + 2.6, '#6a4430', 2);
    m.cyl(28.4 + FX, R0 + 2.4, z + 16.6, z + 19.6, 0.3, 0.3, '#f4ead6', 0, 6); m.box(28.25 + FX, R0 + 2.25, z + 19.6, 28.55 + FX, R0 + 2.55, z + 20.6, '#ffd36a', M.glow); m.pot(37.4 + FX, R0 + 2.4, z + 16.6, 0.42, '#c8705a', '#5aa64e', 3); m.box(31.4 + FX, R0 + 4, z + 17.6, 34.6 + FX, R0 + 4.2, z + 22.4, '#e8c08a', M.plank); m.box(31.8 + FX, R0 + 4.15, z + 18.1, 34.2 + FX, R0 + 4.3, z + 21.9, '#7cc0a0', M.cloth);
    m.box(41.2, R0 + 0.3, z, 43.2, R0 + 3, z + 5, '#8a5a3a', M.plank); for (let i = 0; i < 3; i++) m.cyl(41.7 + i * 0.5, R0 + 3.1, z + 0.6 + i * 1.4, z + 2 + i * 1.4, 0.5, 0.5, '#a8784a', M.plank, 6);
    // 扶手椅、地毯
    { const X = 16, Y = -1; m.box(21 + X, 13 + Y, z, 25.5 + X, 17.5 + Y, z + 4, '#5a8a6a', M.cloth); m.box(21 + X, 13 + Y, z + 4, 22.2 + X, 17.5 + Y, z + 10, '#4a7a5a', M.cloth); m.box(21 + X, 12.4 + Y, z + 4, 25.5 + X, 13.4 + Y, z + 6.4, '#4a7a5a', M.cloth); m.box(21 + X, 17.1 + Y, z + 4, 25.5 + X, 18.1 + Y, z + 6.4, '#4a7a5a', M.cloth); m.box(22.4 + X, 14 + Y, z + 4, 24 + X, 16.6 + Y, z + 4.9, '#f2c4c4', M.cloth); }
    if (rm.rug === 'rug') { m.cyl(33, 30, z, z + 0.25, 8.5, 8.5, '#5a8a8a', M.cloth, 20); m.cyl(33, 30, z + 0.25, z + 0.35, 6.6, 6.6, '#f0e8d0', M.cloth, 20); m.cyl(33, 30, z + 0.35, z + 0.45, 3.4, 3.4, '#e8a090', M.cloth, 16); }
    // 厨房（左墙前段）：台面、水槽、炉子和锅、吊着的锅、墙上的搁板
    m.box(R0, 42, z, R0 + 4, R1 - 1, z + 9, '#e8dcc8', M.plank); m.box(R0, 41.8, z + 9, R0 + 4.3, R1 - 0.8, z + 9.8, '#c8935e', M.plank);
    m.box(R0 + 0.8, 49.5, z + 9.8, R0 + 3.4, 52.5, z + 10.2, '#5a5466', M.metal); m.cyl(R0 + 2.1, 51, z + 10.2, z + 12.4, 0.9, 1, '#8a9ab0', M.metal, 9); m.box(R0 + 1, 44, z + 9.8, R0 + 3.2, 47, z + 10.1, '#d8e4ec', M.metal); m.pot(R0 + 2, 53.6, z + 9.8, 0.36, '#c8705a', '#5aa64e', 2);
    m.box(R0, 43, z + 31, R0 + 2.4, 54, z + 31.8, '#a8784a', M.plank); for (let i = 0; i < 6; i++) m.cyl(R0 + 1.2, 44 + i * 1.8, z + 31.8, z + 34 + (i % 2), 0.42, 0.42, ['#e8705a', '#f4f0e8', '#7cc0a0', '#ffd36a'][i % 4], 0, 7);
    // 书架（后墙右下）
    // 可选家具
    const table = (u, v) => { m.box(u, v, z + 6.2, u + 8, v + 5.6, z + 7.2, '#c8935e', M.plank); posts(m, [[u + 0.4, v + 0.4], [u + 7.6, v + 0.4], [u + 0.4, v + 5.2], [u + 7.6, v + 5.2]], z, 6.2, '#8a5a3a'); m.box(u + 2, v + 1.2, z + 7.2, u + 6, v + 4.4, z + 7.35, '#e8705a', M.cloth); m.cyl(u + 4, v + 2.8, z + 7.35, z + 9, 0.7, 0.9, '#f4ead8', 0, 8); for (const [a, b] of [[-2.4, 1.4], [8.4, 1.4]]) { m.box(u + a, v + b, z, u + a + 2, v + b + 2.4, z + 3.6, '#a8784a', M.plank); } };
    const shelf = (u, v, zb = z) => { m.box(u, v, zb, u + 9, v + 2.2, zb + 22, '#5a7a5a', M.plank); for (let r = 0; r < 4; r++) { m.box(u + 0.4, v + 2.2, zb + 1.5 + r * 5.2, u + 8.6, v + 2.35, zb + 5.6 + r * 5.2, '#2a3a2a', 0); for (let i = 0; i < 9; i++) m.box(u + 0.6 + i * 0.88, v + 2.3, zb + 1.5 + r * 5.2, u + 1.3 + i * 0.88, v + 2.5, zb + 4.6 + r * 5.2 + (i % 3) * 0.3, ['#e8705a', '#5a8ad8', '#ffd36a', '#7cbc62', '#b08af0'][(i + r) % 5], 0); } };
    const piano = (u, v) => { m.box(u, v, z, u + 10, v + 3.4, z + 12, '#5a3428', M.plank); m.box(u + 0.5, v + 3.4, z + 6.4, u + 9.5, v + 5, z + 7.4, '#f8f4ec', M.cloth); m.box(u, v + 3.4, z + 5.6, u + 10, v + 5.2, z + 6.4, '#4a2a20', 0); m.box(u + 3.5, v + 6, z, u + 6.5, v + 8, z + 3.8, '#7a4a38', M.plank); m.box(u + 3, v + 3.3, z + 8, u + 7, v + 3.5, z + 11.4, '#f4ead8', 0); };
    if (rm.c1 === 'table') table(18, 44); else if (rm.c1 === 'shelf') shelf(16, 50); else if (rm.c1 === 'plant') m.pot(20, 46, z, 1.1, '#c8705a', '#5aa64e', 5);
    else if (rm.c1 === 'lamp') { m.cyl(20, 46, z, z + 14, 0.2, 0.14, '#5a5466', M.metal, 5); m.cyl(20, 46, z + 13, z + 17, 1.3, 0.8, '#ffe9a8', M.glow, 9); }
    if (rm.c2 === 'plant') m.pot(52.5, 25.5, z, 1.1, '#5a7ab0', '#3f8a44', 8);
    if (rm.c3 === 'piano') piano(44, 38); else if (rm.c3 === 'rocker') { m.box(44, 44, z + 3, 48, 47.6, z + 4, '#c8935e', M.plank); m.box(44, 44, z + 4, 45, 47.6, z + 11, '#a8784a', M.plank); for (const v of [44.2, 47.4]) m.quad([43.4, v, z + 0.8], [48.8, v, z + 0.8], [48.4, v, z], [43.8, v, z], '#7a4e30', 2); posts(m, [[44.3, 44.3], [47.7, 44.3], [44.3, 47.3], [47.7, 47.3]], z + 0.5, 2.6, '#8a5a3a'); }
    if (rm.wall === 'painting') { m.box(R0 + 0.25, 28, z + 16, R0 + 0.5, 36, z + 25, '#c8935e', 0); m.box(R0 + 0.45, 28.7, z + 16.8, R0 + 0.6, 35.3, z + 24.2, '#a8d8f6', M.cloth); m.box(R0 + 0.55, 28.7, z + 16.8, R0 + 0.66, 35.3, z + 19.4, '#7cbc62', M.grass); }
    // 挂钟、落地灯
    m.disc(38.7, R0 + 0.5, z + 33, 1.3, 'v', '#6a4430', 0, 12); m.disc(38.7, R0 + 0.62, z + 33, 1.0, 'v', '#fff8e8', 0, 12); m.box(38.62, R0 + 0.66, z + 33, 38.78, R0 + 0.74, z + 35, '#3a2630', 0);
    m.cyl(36, 19, z, z + 16, 0.2, 0.14, '#5a5466', M.metal, 5); m.cyl(36, 19, z + 15, z + 19.5, 1.5, 0.9, '#ffe9a8', M.glow, 9);
    // 阁楼上：床、书桌、书架、箱子、小地毯
    if (rm.bed === 'bed') { m.box(21.5, 8, lz, 33.4, 16, lz + 3, '#7a4e30', M.plank); m.box(21.9, 8.4, lz + 3, 33, 15.6, lz + 5, '#f4f0e8', 0); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) m.box(25 + i * 2, 8.3 + j * 2.45, lz + 5, 27 + i * 2, 10.75 + j * 2.45, lz + 5.5, ['#e8705a', '#7aa07a', '#ffd36a', '#a8c8f0'][(i + j) % 4], M.cloth); m.box(22.3, 10, lz + 5, 24.6, 14, lz + 6.2, '#ffffff', 0); m.box(20.9, 8, lz, 21.7, 16, lz + 10, '#7a4e30', M.plank); }
    else { m.box(22, 9, lz, 33, 15, lz + 1.6, '#e8dcc8', M.cloth); m.box(22.6, 10.4, lz + 1.6, 25, 13.6, lz + 2.5, '#ffffff', 0); }
    m.box(12, R0 + 0.3, lz + 6, 19.5, R0 + 4, lz + 7, '#c8935e', M.plank); posts(m, [[12.4, R0 + 3.6], [19.1, R0 + 3.6]], lz, 6, '#8a5a3a'); m.box(13, R0 + 0.8, lz + 7, 15.4, R0 + 2.6, lz + 7.5, '#f4ead8', 0); m.cyl(18.2, R0 + 1.6, lz + 7, lz + 11, 0.25, 0.9, '#7cc0a0', M.glow, 7); m.box(14.4, R0 + 5.4, lz, 17, R0 + 7.6, lz + 3.6, '#a8784a', M.plank);
    m.box(13.4, 17.6, lz, 16.6, 20, lz + 3.2, '#8a5a3a', M.plank); m.box(13.4, 17.6, lz + 3.2, 16.6, 20, lz + 3.8, '#e0b070', 0);
    m.cyl(25, 19, lz, lz + 0.2, 2.4, 2.4, '#c86a5a', M.cloth, 14); m.pot(9, 9.5, lz, 0.8, '#c8705a', '#5aa64e', 9);
    exitDoor(m, K.RDOOR.u);
    return m;
  }

  // ---------- 玻璃花房内部 ----------
  function green(o) {
    const m = new g3.Mesh(), z = RH0, V0 = K.GV0, GL = '#c8ecf8', W = '#f4f4f4', hgt = 46;
    m.box(R0, V0, -3, R1, R1, 0, '#9890a8', M.stone); m.box(R0, V0, 0, R1, R1, z, '#d8d0c0', M.stone);
    m.box(R0 - 1.2, V0 - 1.2, -3, R1, V0, z + 6, STONE, M.stone); m.box(R0 - 1.2, V0, -3, R0, R1, z + 6, STONE, M.stone);
    m.box(R0 - 0.8, V0 - 0.8, z + 6, R1, V0 - 0.3, hgt, GL, M.glass); m.box(R0 - 0.8, V0, z + 6, R0 - 0.3, R1, hgt, GL, M.glass);
    for (let u = R0; u <= R1; u += 6.25) m.box(u - 0.3, V0 - 0.9, z + 6, u + 0.3, V0 - 0.1, hgt, W, 0); for (let v = V0; v <= R1; v += 6.33) m.box(R0 - 0.9, v - 0.3, z + 6, R0 - 0.1, v + 0.3, hgt, W, 0);
    for (const zz of [z + 6, z + 24, hgt]) { m.box(R0 - 1, V0 - 1, zz, R1, V0, zz + 1, W, 0); m.box(R0 - 1, V0, zz, R0, R1, zz + 1, W, 0); }
    // 半个玻璃顶（后半边）
    m.quad([R0 - 1, V0 - 1, hgt + 1], [R1, V0 - 1, hgt + 1], [R1, V0 + 9, hgt + 10], [R0 - 1, V0 + 9, hgt + 10], '#d8f2fc', M.glass);
    // 靠墙的花架（两层）+ 一排排盆栽
    const P = ['#5aa64e', '#3f8a44', '#86cc6a', '#66b058'];
    m.box(R0 + 0.5, V0 + 0.3, z + 6, R1 - 6, V0 + 4, z + 7, '#a8784a', M.plank); posts(m, [[R0 + 1, V0 + 3.6], [22, V0 + 3.6], [38, V0 + 3.6], [R1 - 6.4, V0 + 3.6]], z, 6, '#7a5236'); m.box(R0 + 0.5, V0 + 0.3, z + 15, R1 - 6, V0 + 2.4, z + 15.8, '#a8784a', M.plank);
    for (let i = 0; i < 10; i++) { m.pot(R0 + 3 + i * 4.3, V0 + 2.2, z + 7, 0.7, i % 2 ? '#c8705a' : '#5a7ab0', i % 3 === 0 ? FLOW[i % 5] : P[i % 4], i); if (i % 3 === 0) flowers(m, R0 + 3 + i * 4.3, V0 + 2.2, z + 12.4, 4, 0.8, i, P[0]); }
    for (let i = 0; i < 8; i++) m.pot(R0 + 4 + i * 5.2, V0 + 1.4, z + 15.8, 0.55, '#e8dcc8', i % 2 ? FLOW[(i + 2) % 5] : P[(i + 1) % 4], i + 20);
    m.box(R0 + 0.3, V0 + 8, z + 6, R0 + 4, R1 - 8, z + 7, '#a8784a', M.plank); posts(m, [[R0 + 3.6, V0 + 8.4], [R0 + 3.6, 38], [R0 + 3.6, R1 - 8.4]], z, 6, '#7a5236');
    for (let i = 0; i < 6; i++) m.pot(R0 + 2.1, V0 + 10 + i * 4.6, z + 7, 0.7, i % 2 ? '#5a7ab0' : '#c8705a', i % 2 ? P[i % 4] : FLOW[(i + 1) % 5], i + 40);
    // 中间的花池：一棵小柠檬树 + 一圈花
    m.box(25, 33, z, 37, 41, z + 3.4, '#b4acc0', M.stone, '#6a4026', M.soil); m.tree(31, 37, z + 3, 1.5, ['#4f9a48', '#66b058', '#3f8a44'], 8); for (let i = 0; i < 8; i++) m.blob(31 + Math.cos(i * 0.8) * 3.2, 37 + Math.sin(i * 0.8) * 3.2, z + 22 + (i % 3) * 4, 0.42, 1, '#ffe14a', 0, i, 3, 5); flowers(m, 28, 39.4, z + 3.4, 6, 1.6, 3, P[0]); flowers(m, 34.6, 34.6, z + 3.4, 6, 1.6, 9, P[0]);
    // 吊篮、藤蔓、水桶、喷壶、麻袋、大盆栽
    for (const [u, v] of [[16, V0 + 6], [44, V0 + 6], [R0 + 6, 46]]) { m.box(u - 0.05, v - 0.05, hgt - 12, u + 0.05, v + 0.05, hgt + 2, '#8a7a6a', 0); m.cyl(u, v, hgt - 15, hgt - 12, 0.6, 1.1, '#a8784a', M.plank, 8); m.blob(u, v, hgt - 12, 1.6, 3, P[2], 8, u, 4, 7); m.blob(u + 0.5, v + 0.4, hgt - 17, 0.6, 3, P[0], 8, u + 1, 3, 5); }
    for (let i = 0; i < 14; i++) m.blob(R1 - 4 + H(i, 3) * 2, V0 + 0.4, z + 8 + i * 2.6, 0.9, 1.9, P[i % 4], 8, i, 3, 5);
    m.cyl(49, 28, z, z + 6, 1.5, 1.7, '#9a6a42', M.plank, 10, false); m.cyl(49, 28, z + 5.2, z + 5.3, 1.5, 1.5, '#7ac0e8', M.water, 10); m.cyl(45, 30, z, z + 3.6, 0.9, 0.8, '#8a9ab0', M.metal, 8); m.quad([45.6, 30, z + 2], [47.4, 30, z + 4.6], [47.4, 30.3, z + 5], [45.6, 30.3, z + 3], '#8a9ab0', M.metal);
    m.blob(51, 46, z + 2, 1.6, 2.6, '#d8c8a0', M.cloth, 2, 4, 7); m.blob(48.4, 48, z + 1.6, 1.4, 2.2, '#c8b890', M.cloth, 5, 4, 7); m.pot(14, 50, z, 1.4, '#c8705a', P[1], 12); m.pot(20, 28, z, 1.1, '#5a7ab0', FLOW[0], 13); m.pot(42, 46, z, 1.2, '#c8705a', P[2], 14);
    exitDoor(m, K.RDOOR.u);
    return m;
  }

  // ---------- 底舱：水晶引擎室 + 储藏间 ----------
  function hold(o) {
    const m = new g3.Mesh(), z = RH0, hgt = 40;
    wallShell(m, hgt, { floor: '#a89078', wall: '#b4acc0', wall2: '#a8a0b4', wmat: M.stone });
    for (const u of [16, 30, 44]) { m.disc(u, R0 + 0.2, z + 24, 2.6, 'v', '#e0b070', M.metal, 12); m.disc(u, R0 + 0.3, z + 24, 2, 'v', '#9fd4f2', M.glass, 12); }
    for (const v of [20, 44]) { m.disc(R0 + 0.2, v, z + 24, 2.6, 'u', '#e0b070', M.metal, 12); m.disc(R0 + 0.3, v, z + 24, 2, 'u', '#9fd4f2', M.glass, 12); }
    for (const v of [R0 + 0.4, 30, R1 - 2]) m.box(R0, v, hgt - 3, R1, v + 1.2, hgt, TIMBER, 2);
    // 水晶引擎：铜架子 + 管道（水晶本身会动，在 dyn 里）
    m.cyl(40, 22, z, z + 3, 5.5, 5, '#8a8298', M.stone, 12); for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.78, pu = 40 + Math.cos(a) * 4.2, pv = 22 + Math.sin(a) * 4.2; m.box(pu - 0.3, pv - 0.3, z + 3, pu + 0.3, pv + 0.3, z + 26, '#b8703a', M.metal); }
    m.cyl(40, 22, z + 26, z + 28, 4.6, 4.6, '#b8703a', M.metal, 12, false); m.cyl(40, 22, z + 28, hgt, 0.7, 0.7, '#8a9ab0', M.metal, 6);
    m.box(44, 21.5, z + 6, R1 - 0.2, 22.5, z + 7, '#8a9ab0', M.metal); m.box(39.5, R0, z + 14, 40.5, 18, z + 15, '#8a9ab0', M.metal); m.cyl(48, 22, z + 5, z + 8.5, 0.9, 0.9, '#e0b070', M.metal, 8);
    m.box(47, 26, z, 51, 27, z + 12, '#5a5466', M.metal); m.disc(49, 27.1, z + 9, 1.1, 'v', '#fff8e8', 0, 10); m.box(47.6, 27.05, z + 3, 48.2, 27.2, z + 6, '#e8405a', M.glow); m.box(49.6, 27.05, z + 3, 50.2, 27.2, z + 6, '#7cc35a', M.glow);
    // 工作台
    m.box(R0 + 0.3, 12, z + 7, R0 + 4.6, 26, z + 8, '#c8935e', M.plank); posts(m, [[R0 + 4.2, 12.4], [R0 + 4.2, 25.6]], z, 7, '#8a5a3a'); m.box(R0 + 1, 14, z + 8, R0 + 3, 16.4, z + 9.6, '#8a9ab0', M.metal); m.box(R0 + 1.2, 19, z + 8, R0 + 3.6, 23, z + 8.4, '#f4ead6', 0); m.cyl(R0 + 2, 24.6, z + 8, z + 11, 0.3, 0.9, '#ffe9a8', M.glow, 7);
    m.box(R0 + 0.25, 12, z + 17, R0 + 0.5, 26, z + 28, '#8a5a3a', M.plank); for (let i = 0; i < 5; i++) m.box(R0 + 0.5, 13 + i * 2.6, z + 19, R0 + 0.7, 13.5 + i * 2.6, z + 26 - (i % 2) * 2, '#8a9ab0', M.metal);
    // 酒桶、木箱、麻袋、腌菜架
    for (const [u, v, r, hh] of [[14, 10, 1.9, 9], [18.4, 9.6, 1.6, 7.5], [15.6, 13.6, 1.5, 7]]) { m.cyl(u, v, z, z + hh, r, r, '#9a6a42', M.plank, 10, true, '#b8834e'); for (const zz of [1.2, hh - 2]) m.cyl(u, v, z + zz, z + zz + 0.7, r + 0.1, r + 0.1, '#5a5466', M.metal, 10, false); }
    m.box(23, R0 + 0.4, z, 28, R0 + 4.6, z + 5, '#a8784a', M.plank); m.box(24, R0 + 1, z + 5, 27.4, R0 + 4, z + 9, '#b8834e', M.plank); m.box(28.6, R0 + 0.6, z, 32, R0 + 3.6, z + 3.6, '#8a5a3a', M.plank);
    m.blob(12, 44, z + 2.4, 2, 3, '#d8c8a0', M.cloth, 2, 4, 7); m.blob(15.4, 46.6, z + 2, 1.7, 2.6, '#c8b890', M.cloth, 5, 4, 7); m.blob(13.4, 47.4, z + 5.4, 1.5, 2.2, '#d0c098', M.cloth, 7, 4, 7);
    m.box(R0 + 0.3, 32, z, R0 + 3, 42, z + 20, '#7a5236', M.plank); for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) m.cyl(R0 + 3, 33 + i * 2, z + 2.6 + r * 6, z + 5.6 + r * 6, 0.7, 0.7, ['#e8705a', '#ffd36a', '#7cc0a0', '#b08af0'][(i + r) % 4], M.glass, 7);
    // 吊床、小地毯、梯子
    m.box(44.7, 40, z, 45.3, 40.6, z + 13, WOOD, 2); m.box(44.7, 52, z, 45.3, 52.6, z + 13, WOOD, 2); for (let i = 0; i < 6; i++) { const P = (t, w) => [45 + w, 40.3 + 12 * t, z + 11.5 - Math.sin(t * Math.PI) * 5]; m.quad(P(i / 6, -1.6), P((i + 1) / 6, -1.6), P((i + 1) / 6, 1.6), P(i / 6, 1.6), i % 2 ? '#5a8ad8' : '#f4ead6', M.cloth); }
    m.cyl(28, 38, z, z + 0.2, 6, 6, '#8a5a6a', M.cloth, 16); m.cyl(28, 38, z + 0.2, z + 0.3, 4, 4, '#e0c8a0', M.cloth, 14);
    for (const v of [50, 52.4]) m.box(R0 + 0.4, v, z, R0 + 0.8, v + 0.4, hgt, WOOD, 2); for (let i = 0; i < 8; i++) m.box(R0 + 0.4, 50.2, z + 3 + i * 4.4, R0 + 0.8, 52.6, z + 3.7 + i * 4.4, '#c8935e', 2);
    exitDoor(m, K.RDOOR.u);
    return m;
  }

  // ---------- 会动的小东西（每帧重搭）----------
  function dyn(o) {
    const m = new g3.Mesh(), t = o.t;
    if (o.scene === 'deck') {
      const T = TOWER, zt = HG + T.h + 31, a = t * (o.wind > 1 ? 3 : 1.1);
      for (let k = 0; k < 4; k++) { const c = Math.cos(a + k * 1.5708), s = Math.sin(a + k * 1.5708), r = 2.1; m.quad([T.u + 0.2, T.v + 0.3, zt], [T.u + 0.2 + c * r, T.v + 0.3, zt + s * r * 2.45], [T.u + 0.2 + c * r - s * 0.6, T.v + 0.3, zt + (s * r + c * 0.6) * 2.45], [T.u + 0.2 - s * 0.25, T.v + 0.3, zt + c * 0.25 * 2.45], k % 2 ? '#f4ead6' : '#e8c8a8', M.cloth); }
      m.cyl(T.u + 0.2, T.v + 0.42, zt - 0.5, zt + 0.5, 0.25, 0.25, '#3a2418', 0, 5);
      // 船尾螺旋桨
      for (let k = 0; k < 3; k++) { const b = t * 5 + k * 2.094, c = Math.cos(b), s = Math.sin(b), r = 3; m.quad([1.5, 28, -8], [1.5, 28 + c * r, -8 + s * r * 2.45], [1.5, 28 + c * r - s * 0.9, -8 + (s * r + c * 0.9) * 2.45], [1.5, 28 - s * 0.3, -8 + c * 0.3 * 2.45], '#c8935e', M.plank); }
      // 水晶：慢慢上下浮
      const cz = -47 + Math.sin(t * 0.9) * 1.6; m.cyl(27, 28, cz, cz + 5.5, 1.5, 0, '#a8e8ff', M.glow, 6); m.cyl(27, 28, cz - 5.5, cz, 0.01, 1.5, '#7ac8f0', M.glow, 6, false);
      // 篝火
      const F = FIRE, fl = o.rain ? 0.6 : 1; for (let k = 0; k < 3; k++) m.cyl(F.u + Math.sin(t * 7 + k * 2) * 0.12, F.v + Math.cos(t * 6 + k) * 0.12, HG + 1.2, HG + (5.4 - k * 1.2 + Math.sin(t * 9 + k * 1.7) * 0.9) * fl, 0.75 - k * 0.2, 0, ['#f6a03a', '#ffcf5a', '#fff2b0'][k], M.glow, 6);
      // 热气球
      if (!o.tripping) { const bu = BALLOON.u - 3.2, bv = BALLOON.v + 5.4, bz = HG + QH + 30 + Math.sin(t * 0.8) * 1.6, C = ['#e8705a', '#ffd36a', '#5a8ad8', '#7cbc62', '#f2a6c2'], la = 6, lo = 10;
        const P = (i, j) => { const th = (i / la) * Math.PI * 0.88, f = (j / lo) * 6.2832, r = Math.sin(th) * 4.4 * (i > 4 ? 0.9 : 1); return [bu + Math.cos(f) * r, bv + Math.sin(f) * r, bz + 12 + Math.cos(th) * 11]; };
        for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) m.quad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), C[(j + (i > 2 ? 1 : 0)) % 5], M.cloth);
        m.box(bu - 0.9, bv - 0.9, bz - 8, bu + 0.9, bv + 0.9, bz - 4.4, '#b88a5a', M.plank); for (const [a2, b2] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) m.quad([bu + a2, bv + b2, bz - 4.4], [bu + a2 * 2.2, bv + b2 * 2.2, bz + 2.6], [bu + a2 * 2.2 + 0.1, bv + b2 * 2.2, bz + 2.6], [bu + a2 + 0.1, bv + b2, bz - 4.4], '#8a7a6a', 0);
        m.quad([BALLOON.u, BALLOON.v, HG + QH + 8.6], [bu + 0.6, bv - 0.6, bz - 8], [bu + 0.72, bv - 0.6, bz - 8], [BALLOON.u + 0.12, BALLOON.v, HG + QH + 8.6], '#8a7a6a', 0); }
    } else if (o.scene === 'hold') {
      const cz = RH0 + 14 + Math.sin(t * 1.3) * 1.2, r = 2.6 + Math.sin(t * 2) * 0.1, a = t * 0.8; m.cyl(40, 22, cz, cz + 9, r, 0, '#a8e8ff', M.glow, 6); m.cyl(40, 22, cz - 9, cz, 0.01, r, '#7ac8f0', M.glow, 6, false);
      for (let k = 0; k < 3; k++) m.blob(40 + Math.cos(a + k * 2.09) * 3.4, 22 + Math.sin(a + k * 2.09) * 3.4, cz + Math.sin(t * 2 + k) * 4, 0.3, 0.7, '#e8fbff', M.glow, k, 2, 4);
    } else if (o.scene === 'house') {
      for (let k = 0; k < 3; k++) m.cyl(49.5 + Math.sin(t * 7 + k * 2) * 0.3, R0 + 4.2, RH0 + 2.4, RH0 + (9 - k * 2 + Math.sin(t * 9 + k * 1.7) * 1.2) * (o.cooking ? 1.2 : 1), 1.6 - k * 0.45, 0, ['#f6a03a', '#ffcf5a', '#fff2b0'][k], M.glow, 6);
    }
    return m;
  }
  PP.isleModels = { K, deck, room, green, hold, dyn };
})();
