// 古树水城 · 第①步：底层（施工图见 docs/古树水城-施工图.md）
// 从下往上：岛底的岩体收成尖、树根抱着发光的浮石垂在云里 → 盆地底下一整座被水淹没的古城
// （广场、放射街、环街、钟塔、神殿、天文台、拱桥、城门、城墙、两圈民居）→ 水面。
// 树干、根间、树上的房子是后面几步的事，这里只留出树干的位置（广场中央半径 9）。
(function () {
  const PP = (window.PP = window.PP || {});
  const g3 = PP.g3, M = g3.MAT;
  const H = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const CEN = [24, 24], WL = -1.2, FLOOR = -26, RB = 26.5, RI = 30;
  const rimR = (t) => RI * (1 + 0.05 * Math.sin(3 * t + 1) + 0.035 * Math.sin(7 * t + 2)); // 岛的外沿
  const basR = (t) => RB * (1 + 0.025 * Math.sin(5 * t + 0.5)); // 盆地（水）的边
  const P = (t, r, z) => [CEN[0] + Math.cos(t) * r, CEN[1] + Math.sin(t) * r, z];
  const polar = (u, v) => [Math.atan2(v - CEN[1], u - CEN[0]), Math.hypot(u - CEN[0], v - CEN[1])];
  const D = Math.PI / 180;
  const TRUNK_R = 9.2; // 树干（连板根）占着广场中央
  const CRACK = { t: 32 * D, r: 11.6, w: 2.2, l: 3.6 }; // 广场上被树根拱开的裂口，往下能看见浮石
  const STONE = { z: -40, r: 3.6 };
  /* 0.36：盆地不再是一整片湖——填成泥土、青草、苔藓的地面（GT），古城沉在地面下面的水洞里；
     只留一个方形石砌的池塘（像《天空之城》里机器人园丁领着走过石桥时，往观赏池里一看，下面是一整座沉在水里的城），
     池塘是唯一能下水、钓鱼、上岸的地方 */
  const GT = -0.15, CEIL = -1.25, POND = { u0: 21, v0: 0, u1: 29, v1: 8 };
  const inPond = (u, v, mg = 0) => u > POND.u0 - mg && u < POND.u1 + mg && v > POND.v0 - mg && v < POND.v1 + mg;
  const ROTUNDA = { u: 25, v: 3.6, r: 4.4 }; // 池口正下方的圆殿：从池边往下看第一眼就是它
  const TEMPLES = [[10, 14.2], [122, 13.6], [238, 15.4], [-58, 14.5]].map(([d, r]) => [CEN[0] + Math.cos(d * Math.PI / 180) * r, CEN[1] + Math.sin(d * Math.PI / 180) * r]); // 四座能游进去的柱廊小神殿
  const inBasin = (u, v, m = 0) => { const [t, r] = polar(u, v); return r < basR(t) - m; };
  // 地标（θ 度、半径）

  /* ---------- 岛的岩体：外沿一圈长着苔藓的岩顶，峭壁往下收成尖 ---------- */
  function rock(m, o) {
    const N = 96, snow = o.snow, top = snow ? '#eef4fa' : '#86ac62', tm = snow ? M.snow : M.grass;
    const RINGS = [[1, 0.6], [0.995, -6], [0.97, -14], [0.9, -24], [0.76, -32], [0.56, -40], [0.34, -46], [0.14, -51]];
    for (let k = 0; k < N; k++) { const t0 = (k / N) * 6.2832, t1 = ((k + 1) / N) * 6.2832, j0 = H(k, 3) * 0.8, j1 = H(k + 1, 3) * 0.8;
      // 岩顶：盆地边到外沿，长满苔藓和草
      { const fl = (p) => { for (const f of (PP.CITY && PP.CITY.FLAT) || []) if (p[0] > f[0] && p[0] < f[2] && p[1] > f[1] && p[1] < f[3]) { p[2] = Math.min(p[2], -0.4); break; } return p; }; /* 码头、栈道、菜地底下的岩顶压低：不从木板里冒出来 */
        const N2 = 3; for (let q = 0; q < N2; q++) { const ra0 = (k2) => basR(k2) + 0.2 + (rimR(k2) - basR(k2) - 0.2) * q / N2, ra1 = (k2) => basR(k2) + 0.2 + (rimR(k2) - basR(k2) - 0.2) * (q + 1) / N2, za = (j, f) => 0.2 + j * 0.5 + ((RINGS[0][1] + j) - (0.2 + j * 0.5)) * f;
          m.quad(fl(P(t0, ra0(t0), za(j0, q / N2))), fl(P(t1, ra0(t1), za(j1, q / N2))), fl(P(t1, ra1(t1), za(j1, (q + 1) / N2))), fl(P(t0, ra1(t0), za(j0, (q + 1) / N2))), top, tm); } }
      for (let i = 0; i + 1 < RINGS.length; i++) { const [a, za] = RINGS[i], [b, zb] = RINGS[i + 1], ja = i === 0 ? j0 : 0, jb = i === 0 ? j1 : 0;
        m.quad(P(t0, rimR(t0) * a, za + ja), P(t1, rimR(t1) * a, za + jb), P(t1, rimR(t1) * b, zb), P(t0, rimR(t0) * b, zb), ['#a48c6a', '#95805f', '#b09776', '#8a7558'][(k + i) % 4] /* 天空之城那种暖褐色的岩层 */, M.stone); }
      m.tri(P(t0, rimR(t0) * 0.14, -51), P(t1, rimR(t1) * 0.14, -51), [CEN[0], CEN[1], -55], '#7a6650', M.stone); }
    // 岩顶上的石块和灌木丛
    for (let k = 0; k < 28; k++) { const t = H(k, 1) * 6.2832, r = basR(t) + (rimR(t) - basR(t)) * (0.15 + H(k, 2) * 0.75), [u, v] = P(t, r, 0); /* 0.38：随手散落，不再排成一圈；避开栈道、码头、菜地、屋子和池塘 */ if (((PP.CITY && PP.CITY.FLAT) || []).some((q) => u > q[0] - 1.5 && u < q[2] + 1.5 && v > q[1] - 1.5 && v < q[3] + 1.5) || ((PP.CITY && PP.CITY.BUSY) || []).some(([bu, bv, br]) => Math.hypot(u - bu, v - bv) < br + 1.5) || inPond(u, v, 1.5)) continue; if (H(k, 4) < 0.5) m.blob(u, v, 0.4, 0.6 + H(k, 5) * 0.8, 0.5, snow ? '#e8eef4' : '#b4a082', M.stone, k); else m.foliage(u, v, 1.1, 0.9 + H(k, 6) * 0.6, 0.7, ['#6a9a50', '#7cac5c', '#90bc6a'], 16, k, 0.6); }
    /* 草：岩顶上一丛丛小草（两片交叉的细叶，随风摆，人能穿过），中间点缀几朵小野花——像原神的草地，不是一整块平涂的绿 */
    if (!snow) { const so = m.sway; m.sway = 0.35; const G = ['#7aa45a', '#8cb466', '#9cc070', '#6e9a52'], FL = ['#fff4f0', '#ffd95a', '#f2a6c2', '#b8a8f0'];
      for (let k = 0; k < 520; k++) { const t = H(k, 21) * 6.2832, f = H(k, 22), r = basR(t) + 0.5 + (rimR(t) - basR(t) - 0.8) * f, [u, v] = P(t, r, 0); if (((PP.CITY && PP.CITY.FLAT) || []).some((q) => u > q[0] && u < q[2] && v > q[1] && v < q[3])) continue;
        const z = 0.2 + 0.4 * f + 0.05, hh = 0.5 + H(k, 23) * 0.6, a0 = H(k, 24) * 3.14, col = G[k % 4];
        for (const da of [0, 1.57]) { const cx = Math.cos(a0 + da) * 0.28, cy = Math.sin(a0 + da) * 0.28; m.tri([u - cx, v - cy, z], [u + cx, v + cy, z], [u + cx * 0.2, v + cy * 0.2, z + hh], col, M.grass); m.tri([u + cx, v + cy, z], [u - cx, v - cy, z], [u - cx * 0.3, v - cy * 0.3, z + hh * 0.8], col, M.grass); }
        if (H(k, 25) < 0.16) { const fc = FL[k % 4]; m.tri([u - 0.14, v, z + hh], [u + 0.14, v, z + hh], [u, v + 0.14, z + hh + 0.06], fc, M.flat); m.tri([u - 0.14, v, z + hh], [u, v - 0.14, z + hh + 0.06], [u + 0.14, v, z + hh], fc, M.flat); } }
      m.sway = so; }
    /* 岸边（0.31）：水边一丛丛芦苇（随风摆），水面上漂着睡莲叶，有的开着粉白的小花 */
    if (!snow) { const so2 = m.sway, flat = (u, v) => ((PP.CITY && PP.CITY.FLAT) || []).some((q) => u > q[0] - 1 && u < q[2] + 1 && v > q[1] - 1 && v < q[3] + 1);
      m.sway = 0.45; for (let k = 0; k < 150; k++) { const t = H(k, 41) * 6.2832, r = basR(t) - 0.3 - H(k, 42) * 1.6, [u, v] = P(t, r, 0); if (flat(u, v)) continue; const n = 3 + (k % 3);
        for (let j = 0; j < n; j++) { const a = H(k, j + 50) * 6.28, ox = Math.cos(a) * 0.25, oy = Math.sin(a) * 0.25, hh = 2.2 + H(k, j + 60) * 1.8, lean = (H(k, j + 70) - 0.5) * 0.5; m.tri([u + ox - 0.06, v + oy, WL - 0.3], [u + ox + 0.06, v + oy, WL - 0.3], [u + ox + lean, v + oy + lean * 0.5, WL + hh], j % 2 ? '#7aa44a' : '#8cb456', M.grass); if (j === 0 && k % 2) m.box(u + ox + lean - 0.07, v + oy + lean * 0.5 - 0.07, WL + hh - 0.7, u + ox + lean + 0.07, v + oy + lean * 0.5 + 0.07, WL + hh - 0.05, '#7a5030', M.cloth); } }
      m.sway = so2; for (let k = 0; k < 60; k++) { const t = H(k, 81) * 6.2832, r = basR(t) - 1.4 - H(k, 82) * 4.5, [u, v] = P(t, r, 0); if (flat(u, v) || r < 13) continue; const R2 = 0.5 + H(k, 83) * 0.4, n = 9;
        for (let j = 0; j < n; j++) { if (j === 0) continue; const a0 = (j / n) * 6.2832, a1 = ((j + 1) / n) * 6.2832; m.tri([u, v, WL + 0.05], [u + Math.cos(a0) * R2, v + Math.sin(a0) * R2, WL + 0.05], [u + Math.cos(a1) * R2, v + Math.sin(a1) * R2, WL + 0.05], k % 3 ? '#4f8a3a' : '#5f9a44', M.flat); }
        if (k % 4 === 0) { m.cyl(u + 0.1, v + 0.1, WL + 0.05, WL + 0.35, 0.24, 0.1, k % 8 ? '#f6d8e4' : '#fff6f0', M.flat, 6); m.ball(u + 0.1, v + 0.1, WL + 0.38, 0.09, 0.07, '#ffd95a', M.flat, 4, 6); } } }
  }

  /* ---------- 浮石：岛底，被一圈粗根抱着，发着蓝光 ---------- */
  function floatStone(m, o) {
    const [u, v] = P(CRACK.t, CRACK.r, 0), z = STONE.z;
    // 裂口下面的石洞：从广场地面一直通到浮石
    for (let k = 0; k < 16; k++) { const a0 = (k / 16) * 6.2832, a1 = ((k + 1) / 16) * 6.2832, r0 = 2.4, r1 = 5.4; m.quad([u + Math.cos(a0) * r0, v + Math.sin(a0) * r0, FLOOR - 0.4], [u + Math.cos(a1) * r0, v + Math.sin(a1) * r0, FLOOR - 0.4], [u + Math.cos(a1) * r1, v + Math.sin(a1) * r1, z - 3], [u + Math.cos(a0) * r1, v + Math.sin(a0) * r1, z - 3], '#5e5852', M.stone); }
    m.ball(u, v, z, STONE.r, STONE.r * 1.1, '#8ff0ff', M.glow, 6, 12, 0.12, 7);
    for (let k = 0; k < 7; k++) { const a = k * 0.9, h = 2 + H(k, 9) * 3; m.cyl(u + Math.cos(a) * 3, v + Math.sin(a) * 3, z - 1 + H(k, 8), z + h, 0.5, 0.05, '#c8f8ff', M.glow, 5); }
    // 抱着浮石的根：从上面的广场钻下来，一圈箍住，再往岛底垂
    for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.2832 + 0.3, pts = [[u + Math.cos(a) * 1.6, v + Math.sin(a) * 1.6, FLOOR], [u + Math.cos(a) * 4.6, v + Math.sin(a) * 4.6, z + 4], [u + Math.cos(a + 0.5) * 4.4, v + Math.sin(a + 0.5) * 4.4, z], [u + Math.cos(a + 0.9) * 3.4, v + Math.sin(a + 0.9) * 3.4, z - 4.5], [u + Math.cos(a + 1.2) * 1.6, v + Math.sin(a + 1.2) * 1.6, z - 9]]; rootLine(m, pts, 0.7, 0.3); }
    // 岛底垂下来的根和藤：一直荡到云里
    for (let k = 0; k < 22; k++) { const t = (k / 22) * 6.2832 + H(k, 11) * 0.2, f = 0.3 + H(k, 12) * 0.55, [x, y] = P(t, rimR(t) * f, 0), z0 = -40 - (1 - f) * 8 + f * 10; rootLine(m, [[x, y, z0 + 2], [x + Math.cos(k) * 0.8, y + Math.sin(k) * 0.8, z0 - 6], [x + Math.sin(k) * 1.2, y, z0 - 14 - H(k, 13) * 10]], 0.45, 0.08); }
  }
  // 一条弯根：几段四棱的木条连起来
  function rootLine(m, pts, r0, r1, col = '#6b5442') {
    for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], ra = r0 + (r1 - r0) * i / (pts.length - 1), rb = r0 + (r1 - r0) * (i + 1) / (pts.length - 1), d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]) || 1, nx = -d[1] / L, ny = d[0] / L;
      const A1 = [a[0] - nx * ra, a[1] - ny * ra], A2 = [a[0] + nx * ra, a[1] + ny * ra], B1 = [b[0] - nx * rb, b[1] - ny * rb], B2 = [b[0] + nx * rb, b[1] + ny * rb];
      m.quad([A1[0], A1[1], a[2] + ra], [A2[0], A2[1], a[2] + ra], [B2[0], B2[1], b[2] + rb], [B1[0], B1[1], b[2] + rb], col, M.plank);
      m.quad([A1[0], A1[1], a[2] - ra], [A1[0], A1[1], a[2] + ra], [B1[0], B1[1], b[2] + rb], [B1[0], B1[1], b[2] - rb], '#57432f', M.plank);
      m.quad([A2[0], A2[1], a[2] + ra], [A2[0], A2[1], a[2] - ra], [B2[0], B2[1], b[2] - rb], [B2[0], B2[1], b[2] + rb], '#57432f', M.plank); }
  }

  /* ---------- 地形：下城（z −26）和东南的上城台地（z −16，挡土墙 + 台阶） ---------- */
  const UP = { t0: 48 * D, t1: 112 * D, r0: 12.5, r1: 24.5, z: -21.5 }; // 上城：教堂在这儿（整个沉在门厅底下，尖顶离水面还有一截） // 上城：教堂在这儿，尖顶刚好戳出水面
  const angIn = (t, a, b) => { const x = Math.atan2(Math.sin(t - a), Math.cos(t - a)), w = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return x >= 0 && x <= w; };
  const inUp = (u, v) => { const [t, r] = polar(u, v); return angIn(t, UP.t0, UP.t1) && r > UP.r0 && r < UP.r1; };
  const groundZ = (u, v) => (inUp(u, v) ? UP.z : FLOOR);
  const STREETS = [-30, 30, 150, 210, 270].map((a) => a * D); // 放射街（上城那一面用台阶接下城）
  const streetAt = (u, v) => { const [t, r] = polar(u, v); if (r < 11) return 'plaza'; if (Math.abs(r - 19) < 1.5) return 'street'; for (const a of STREETS) { if (Math.cos(t - a) > 0 && Math.abs(Math.sin(t - a)) * r < 1.5) return 'street'; } return 'block'; };
  function basin(m, o) {
    const N = 96;
    for (let k = 0; k < N; k++) { const t0 = (k / N) * 6.2832, t1 = ((k + 1) / N) * 6.2832;
      m.quad(P(t0, basR(t0) + 0.2, 0.2), P(t1, basR(t1) + 0.2, 0.2), P(t1, basR(t1) * 0.97, -6), P(t0, basR(t0) * 0.97, -6), k % 2 ? '#5f7a52' : '#6a8458', M.grass);
      m.quad(P(t0, basR(t0) * 0.97, -6), P(t1, basR(t1) * 0.97, -6), P(t1, basR(t1) * 0.94, FLOOR - 0.5), P(t0, basR(t0) * 0.94, FLOOR - 0.5), ['#6a6e66', '#62665e', '#6e7068'][k % 3], M.stone); }
    // 石板路：1.5 格一块，街上浅、街区里深；上城台地高一截
    const [cu, cv] = P(CRACK.t, CRACK.r, 0);
    for (let x = -25.5; x < 25.5; x += 1.5) for (let y = -25.5; y < 25.5; y += 1.5) { const u = CEN[0] + x + 0.75, v = CEN[1] + y + 0.75; if (!inBasin(u, v, 1.4)) continue; const [, r] = polar(u, v); if (r < TRUNK_R - 1.2 || Math.hypot(u - cu, v - cv) < 2.4) continue;
      const s = streetAt(u, v), up = inUp(u, v), z0 = up ? UP.z : FLOOR, h = H(x * 3, y * 7);
      const col = s === 'plaza' ? (h < 0.5 ? '#cfc6b2' : '#c4bba6') : s === 'street' ? (h < 0.33 ? '#a9a08c' : h < 0.66 ? '#b2a994' : '#9f9682') : (h < 0.5 ? '#857c68' : '#7d755f');
      m.box(u - 0.72, v - 0.72, up ? FLOOR - 0.5 : FLOOR - 0.5, u + 0.72, v + 0.72, z0 + (s === 'block' ? 0 : h * 0.08), col, M.stone); }
    // 上城的挡土墙：沿内弧和两条边，墙头有一排矮栏
    for (let k = 0; k <= 24; k++) { const t = UP.t0 + (UP.t1 - UP.t0) * k / 24, [u, v] = P(t, UP.r0, 0); m.box(u - 0.75, v - 0.75, FLOOR, u + 0.75, v + 0.75, UP.z + 1.1, k % 2 ? '#bdb39c' : '#b3a992', M.stone); }
    for (const t of [UP.t0, UP.t1]) for (let r = UP.r0; r < UP.r1; r += 1.4) { const [u, v] = P(t, r, 0); m.box(u - 0.7, v - 0.7, FLOOR, u + 0.7, v + 0.7, UP.z + 1.1, '#b8ae97', M.stone); }
    // 下城到上城的大台阶（θ 80°，从广场边一级级上去）
    { const t = 80 * D; for (let k = 0; k < 14; k++) { const r = UP.r0 - 1 - (13 - k) * 0.5 + 0.0, [u, v] = P(t, UP.r0 - 7 + k * 0.5, 0), zt = FLOOR + (k + 1) * (UP.z - FLOOR) / 14; void r; rot(m, u, v, t, () => m.box(u - 0.26, v - 2.2, FLOOR, u + 0.26, v + 2.2, zt, k % 2 ? '#cbc1ab' : '#c1b7a1', M.stone)); } }
    // 广场：一圈石沿 + 几块被树根拱翘起来的石板
    for (let k = 0; k < 40; k++) { const t = (k / 40) * 6.2832, [u, v] = P(t, 11.2, 0); m.box(u - 0.6, v - 0.6, FLOOR, u + 0.6, v + 0.6, FLOOR + 0.45, '#d6ccb6', M.stone); }
    for (let k = 0; k < 8; k++) { const t = k * 0.8 + 0.2, [u, v] = P(t, 9.8 + H(k, 2) * 0.8, 0); m.box(u - 0.9, v - 0.6, FLOOR, u + 0.9, v + 0.6, FLOOR + 0.6 + H(k, 3) * 0.6, '#c4bba6', M.stone); }
  }

  /* ---------- 工具：转个角度画、尖拱窗、拱门 ---------- */
  const W = () => PP.isleModels && PP.isleModels.parts.warp;
  const rot = (m, u, v, yaw, fn, z = FLOOR) => { const w = W(); if (w) w(m, [u, v, z], yaw, 0, 0, fn); else fn(); };
  const GL = '#1f3540', TIM = '#4a3a2c', MOSS = '#7aa060';
  // 竖在 u = x 这面墙上（朝 +u）的一个窗：深色玻璃 + 窗框 + 十字窗棂 + 两扇百叶
  function win(m, x, v, z, w, h, shut) {
    m.box(x - 0.02, v - w / 2, z, x + 0.05, v + w / 2, z + h, GL, 0);
    m.box(x, v - w / 2 - 0.12, z - 0.12, x + 0.14, v + w / 2 + 0.12, z, '#d8ceb8', M.stone); m.box(x, v - w / 2 - 0.12, z + h, x + 0.12, v + w / 2 + 0.12, z + h + 0.12, TIM, M.plank);
    m.box(x + 0.02, v - 0.04, z, x + 0.09, v + 0.04, z + h, TIM, 0); m.box(x + 0.02, v - w / 2, z + h * 0.55, x + 0.09, v + w / 2, z + h * 0.55 + 0.07, TIM, 0);
    if (shut) for (const s of [-1, 1]) m.box(x + 0.02, v + s * (w / 2 + 0.05) - (s > 0 ? 0 : w * 0.45), z, x + 0.1, v + s * (w / 2 + 0.05) + (s > 0 ? w * 0.45 : 0), z + h, shut, M.plank);
  }
  // 尖拱（哥特式）窗：竖条 + 顶上一个尖
  function gothWin(m, x, v, z, w, h, nx = 1) { m.box(x - 0.03 * nx, v - w / 2, z, x + 0.05 * nx, v + w / 2, z + h, GL, 0); m.tri([x + 0.06 * nx, v - w / 2, z + h], [x + 0.06 * nx, v + w / 2, z + h], [x + 0.06 * nx, v, z + h + w * 0.8], GL, 0); m.box(x, v - 0.04, z, x + 0.1 * nx, v + 0.04, z + h + w * 0.5, '#cfc5ae', 0); }
  // 半圆拱门（朝 +u 的墙面）
  function archDoor(m, x, v, z, w, h, col = '#d0c6b0') { m.box(x - 0.03, v - w / 2, z, x + 0.05, v + w / 2, z + h, '#2a2620', 0); for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI, y = v - Math.cos(a) * (w / 2 + 0.15), zz = z + h + Math.sin(a) * (w / 2 + 0.15); m.box(x, y - 0.2, zz - 0.2, x + 0.18, y + 0.2, zz + 0.2, col, M.stone); } m.box(x - 0.03, v - w / 2, z + h, x + 0.05, v + w / 2, z + h + w / 2, '#2a2620', 0); }

  /* ---------- 0.38 空心的墙、带洞的楼板、屋里的布置：水下古城的每栋房子都能游进去 ---------- */
  // 一面墙（ax 'u'：墙面垂直于 u，占 u∈[f0,f1]、沿 v 从 s0 到 s1；ax 'v' 反过来），opens 里每个 [s_a, s_b, z_a, z_b] 是一个真的洞（门、窗）
  function wall(m, ax, f0, f1, s0, s1, z0, z1, opens, col, mat) {
    const cut = [s0, s1]; for (const o of opens) { if (o[0] > s0 && o[0] < s1) cut.push(o[0]); if (o[1] > s0 && o[1] < s1) cut.push(o[1]); } cut.sort((x, y) => x - y);
    for (let i = 0; i + 1 < cut.length; i++) { const x0 = cut[i], x1 = cut[i + 1]; if (x1 - x0 < 0.01) continue; const mid = (x0 + x1) / 2, gaps = opens.filter((o) => mid > o[0] && mid < o[1]).map((o) => [Math.max(z0, o[2]), Math.min(z1, o[3])]).filter((g) => g[1] > g[0]).sort((p, q) => p[0] - q[0]);
      let zc = z0; const put = (za, zb) => { if (zb - za < 0.02) return; if (ax === 'u') m.box(f0, x0, za, f1, x1, zb, col, mat); else m.box(x0, f0, za, x1, f1, zb, col, mat); };
      for (const g of gaps) { put(zc, g[0]); zc = Math.max(zc, g[1]); } put(zc, z1); } }
  // 一块楼板，中间开一个方洞（往上游的口子）
  function slab(m, u0, v0, u1, v1, z0, z1, hole, col, mat, top) {
    if (!hole) { m.box(u0, v0, z0, u1, v1, z1, col, mat, top); return; } const [h0, g0, h1, g1] = hole;
    m.box(u0, v0, z0, h0, v1, z1, col, mat, top); m.box(h1, v0, z0, u1, v1, z1, col, mat, top); m.box(h0, v0, z0, h1, g0, z1, col, mat, top); m.box(h0, g1, z0, h1, v1, z1, col, mat, top); }
  // 窗框（没有玻璃了，鱼从窗洞里进进出出）+ 两扇百叶；x 是墙的外皮，朝 +u
  function winFrame(m, x, v, z, w, h, shut) { m.box(x - 0.02, v - w / 2 - 0.12, z - 0.14, x + 0.16, v + w / 2 + 0.12, z, '#d8ceb8', M.stone); m.box(x - 0.02, v - w / 2 - 0.12, z + h, x + 0.12, v + w / 2 + 0.12, z + h + 0.12, TIM, M.plank);
    for (const sd of [-1, 1]) m.box(x - 0.02, v + sd * (w / 2 + 0.06) - 0.06, z, x + 0.1, v + sd * (w / 2 + 0.06) + 0.06, z + h, TIM, M.plank);
    if (shut) for (const sd of [-1, 1]) { const y0 = v + sd * (w / 2 + 0.12); m.quad([x + 0.1, y0, z], [x + 0.1 + w * 0.3, y0 + sd * w * 0.38, z], [x + 0.1 + w * 0.3, y0 + sd * w * 0.38, z + h], [x + 0.1, y0, z + h], shut, M.plank); } }
  // 拱门的门框（只有一圈石头，门洞是空的）
  function archFrame(m, x, v, z, w, h, col = '#d0c6b0') { for (const sd of [-1, 1]) m.box(x - 0.32, v + sd * (w / 2) - (sd > 0 ? 0 : 0.22), z, x + 0.06, v + sd * (w / 2) + (sd > 0 ? 0.22 : 0), z + h, col, M.stone); for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI, y = v - Math.cos(a) * (w / 2 + 0.11), zz = z + h + Math.sin(a) * (w / 2 + 0.11) * 0.6; m.box(x - 0.32, y - 0.2, zz - 0.14, x + 0.08, y + 0.2, zz + 0.2, col, M.stone); } }
  const HOMES = []; // 水生动物在城里的家：{u,v,z,kind}，dyn 里按这个画会动的小动物
  /* 屋里的布置：x0..x1 × y0..y1 是屋里地面，zf 地板高，hh 屋高；keep 是要空着的地方（门口、往上游的洞）。
     都是沉在水里很多年的样子：家具长苔、有的倒了，墙角积沙、长水草；再给小动物留个窝。toW 把屋里的点换成世界坐标（登记小动物的家） */
  function room(m, x0, y0, x1, y1, zf, hh, kind, sd, keep, toW) {
    const R = (i) => H(sd, i), free = (a, b, c, d) => !keep.some(([p, q, r, t]) => a < r && c > p && b < t && d > q), W = x1 - x0, D = y1 - y0, wd = '#7a5a3e', wd2 = '#6a4c34', mossy = '#6f8a4a';
    const homes = (x, y, z, k) => { if (toW) { const w = toW(x, y, z); HOMES.push({ u: w[0], v: w[1], z: w[2], kind: k, sd: sd + HOMES.length }); } };
    // 地面：沙一层（墙脚堆得厚一点）、几块散落的瓦片和小石子
    m.box(x0, y0, zf, x1, y1, zf + 0.04, '#b8a888', M.soil); for (let i = 0; i < 4; i++) { const x = x0 + 0.3 + R(i) * (W - 0.6), y = y0 + 0.3 + R(i + 9) * (D - 0.6); m.blob(x, y, zf + 0.04, 0.12 + R(i + 3) * 0.12, 0.06, ['#9a9284', '#8a8274', '#a8a092'][i % 3], M.stone, sd + i); }
    m.quad([x0, y0, zf + 0.04], [x0, y1, zf + 0.04], [x0 + 0.6, y1, zf + 0.04], [x0 + 0.6, y0, zf + 0.04], '#c8b894', M.soil); m.quad([x0, y0, zf + 0.35], [x0, y1, zf + 0.35], [x0 + 0.6, y1, zf + 0.04], [x0 + 0.6, y0, zf + 0.04], '#c4b490', M.soil); // 后墙脚的沙坡
    const tbl = (x, y, w2, d2, h2) => { m.box(x - w2 / 2, y - d2 / 2, zf + h2 - 0.08, x + w2 / 2, y + d2 / 2, zf + h2, wd, M.plank); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(x + dx * (w2 / 2 - 0.08) - 0.04, y + dy * (d2 / 2 - 0.08) - 0.04, zf, x + dx * (w2 / 2 - 0.08) + 0.04, y + dy * (d2 / 2 - 0.08) + 0.04, zf + h2 - 0.08, wd2, M.plank); };
    const chair = (x, y, fall) => { if (fall) { m.box(x - 0.2, y - 0.2, zf, x + 0.2, y + 0.2, zf + 0.06, wd, M.plank); m.box(x + 0.2, y - 0.2, zf, x + 0.26, y + 0.2, zf + 0.06, wd2, M.plank); m.box(x - 0.2, y - 0.2, zf + 0.06, x - 0.14, y + 0.2, zf + 0.5, wd2, M.plank); return; } m.box(x - 0.2, y - 0.2, zf + 0.42, x + 0.2, y + 0.2, zf + 0.48, wd, M.plank); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(x + dx * 0.16 - 0.03, y + dy * 0.16 - 0.03, zf, x + dx * 0.16 + 0.03, y + dy * 0.16 + 0.03, zf + 0.42, wd2, M.plank); m.box(x - 0.2, y + 0.16, zf + 0.48, x + 0.2, y + 0.2, zf + 0.95, wd2, M.plank); };
    const jar = (x, y, z, r2, col) => { m.cyl(x, y, z, z + r2 * 1.6, r2, r2 * 0.7, col, M.stone, 8); m.cyl(x, y, z + r2 * 1.6, z + r2 * 1.9, r2 * 0.45, r2 * 0.5, col, M.stone, 8); };
    const shelf = (x, y, along) => { const L = Math.min(1.6, (along ? W : D) - 0.6), [a0, b0, a1, b1] = along ? [x - L / 2, y - 0.18, x + L / 2, y + 0.18] : [x - 0.18, y - L / 2, x + 0.18, y + L / 2]; for (let i = 0; i < 3; i++) m.box(a0, b0, zf + 0.5 + i * 0.55, a1, b1, zf + 0.56 + i * 0.55, wd, M.plank); for (const [p, q] of [[a0, b0], [a1, b1]]) m.box(p - 0.03, q - 0.03, zf, p + 0.03, q + 0.03, zf + 1.7, wd2, M.plank);
      for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5, px = along ? a0 + (a1 - a0) * t : x, py = along ? y : b0 + (b1 - b0) * t, lvl = Math.floor(R(i + 20) * 3); if (R(i + 30) < 0.75) jar(px, py, zf + 0.56 + lvl * 0.55, 0.09 + R(i + 40) * 0.05, ['#a86a4a', '#5a7a8a', '#8a8a6a', '#c8b898'][i % 4]); } };
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (kind === 'bed') { const bx = x0 + 0.15, by = y0 + 0.2; if (free(bx, by, bx + 2.0, by + 1.1)) { m.box(bx, by, zf, bx + 2.0, by + 1.1, zf + 0.35, wd, M.plank); m.box(bx + 0.05, by + 0.05, zf + 0.35, bx + 1.95, by + 1.05, zf + 0.5, '#8a9a7a', M.cloth); m.box(bx + 0.1, by + 0.15, zf + 0.5, bx + 0.5, by + 0.95, zf + 0.65, '#c8c0a8', M.cloth); m.box(bx - 0.05, by, zf, bx + 0.08, by + 1.1, zf + 1.0, wd2, M.plank); m.moss([bx + 1.2, by + 0.6, zf + 0.5], [0, 0, 1], 0.45, 0.16, sd + 3); homes(bx + 1.0, by + 0.55, zf + 0.6, 'turtle'); }
      const kx = x1 - 0.5, ky = y0 + 0.3; if (free(kx - 0.35, ky - 0.25, kx + 0.35, ky + 0.25)) { m.box(kx - 0.35, ky - 0.22, zf, kx + 0.35, ky + 0.22, zf + 0.45, '#8a5a34', M.plank); m.box(kx - 0.37, ky - 0.24, zf + 0.42, kx + 0.37, ky + 0.24, zf + 0.5, '#6a4a2a', M.plank); m.box(kx - 0.05, ky - 0.25, zf + 0.25, kx + 0.05, ky - 0.23, zf + 0.38, '#c8a858', M.metal); } }
    else if (kind === 'shop') { if (free(cx - 0.3, y0 + 0.3, cx + 0.3, y1 - 0.3)) { m.box(cx - 0.3, y0 + 0.3, zf, cx + 0.3, y1 - 0.3, zf + 0.85, wd, M.plank); for (let i = 0; i < 3; i++) jar(cx, y0 + 0.7 + i * (D - 1.4) / 2, zf + 0.85, 0.12, ['#a86a4a', '#5a7a8a', '#c8b898'][i]); homes(cx - 0.6, cy, zf + 0.3, 'crab'); }
      shelf(x0 + 0.25, cy, false); for (let i = 0; i < 2; i++) { const x = x1 - 0.5, y = y0 + 0.5 + i * 0.75; if (free(x - 0.3, y - 0.3, x + 0.3, y + 0.3)) { m.box(x - 0.3, y - 0.3, zf, x + 0.3, y + 0.3, zf + 0.55, '#9a7a52', M.plank); homes(x, y, zf + 0.6, 'snail'); } } }
    else { // 普通人家：桌椅、壁炉、架子、木桶
      if (free(cx - 0.7, cy - 0.45, cx + 0.7, cy + 0.45)) { tbl(cx, cy, 1.2, 0.8, 0.75); chair(cx - 0.75, cy, false); chair(cx + 0.8, cy + 0.2, true); jar(cx + 0.2, cy - 0.1, zf + 0.75, 0.1, '#a87a5a'); m.moss([cx - 0.25, cy + 0.15, zf + 0.75], [0, 0, 1], 0.3, 0.1, sd + 5); homes(cx, cy, zf + 0.25, 'crab'); }
      if (free(x0, cy - 0.7, x0 + 0.6, cy + 0.7)) { m.box(x0, cy - 0.7, zf, x0 + 0.5, cy + 0.7, zf + 1.6, '#a89c86', M.stone); m.box(x0 + 0.45, cy - 0.45, zf + 0.05, x0 + 0.52, cy + 0.45, zf + 0.9, '#2a2420', 0); m.box(x0, cy - 0.8, zf + 1.6, x0 + 0.65, cy + 0.8, zf + 1.72, '#8a7e6a', M.stone); homes(x0 + 0.7, cy, zf + 0.3, 'loach'); } // 壁炉：里头住着一条泥鳅
      shelf(cx, y1 - 0.25, true); const bx = x1 - 0.45, by = y1 - 0.45; if (free(bx - 0.3, by - 0.3, bx + 0.3, by + 0.3)) { m.cyl(bx, by, zf, zf + 0.8, 0.3, 0.3, '#8a6a46', M.plank, 10); m.cyl(bx, by, zf + 0.15, zf + 0.22, 0.32, 0.32, '#5a5048', M.metal, 10); m.cyl(bx, by, zf + 0.6, zf + 0.67, 0.32, 0.32, '#5a5048', M.metal, 10); homes(bx, by, zf + 1.0, 'snail'); } }
    // 自然：墙角的水草（会摆、能穿过）、一两团苔、给鱼的窝
    const sw0 = m.sway; m.sway = 0.8; for (let i = 0; i < 2; i++) { const x = i ? x1 - 0.3 : x0 + 0.3, y = i ? y0 + 0.3 : y1 - 0.3; if (!free(x - 0.3, y - 0.3, x + 0.3, y + 0.3)) continue; for (let j = 0; j < 7; j++) { const a = R(j + 50 + i * 9) * 6.28, h2 = hh * (0.35 + R(j + 60) * 0.45), x2 = x + Math.cos(a) * 0.15, y2 = y + Math.sin(a) * 0.15; m.quad([x2 - 0.04, y2, zf], [x2 + 0.04, y2, zf], [x2 + 0.06 + Math.cos(a) * 0.2, y2 + Math.sin(a) * 0.2, zf + h2], [x2 + Math.cos(a) * 0.2, y2 + Math.sin(a) * 0.2, zf + h2], ['#4a7a3a', '#5a8a42', '#6a9a4a'][j % 3], M.leaf); } } m.sway = sw0;
    m.moss([x1 - 0.35, y0 + 0.35, zf], [0, 0, 1], 0.35 + R(70) * 0.2, 0.14, sd + 9);
    homes(cx + (R(80) - 0.5) * W * 0.4, cy + (R(81) - 0.5) * D * 0.4, zf + hh * 0.5, 'fish');
  }
  /* ---------- 半木结构的民居（中世纪欧洲小镇） ----------
     石头砌的底层（拱门、小窗）；上面一两层是木筋墙（深色木条：立柱、横梁、斜撑，中间刷灰泥），每层往街上挑出去一点；
     很陡的屋顶（石板或红瓦），屋面上一个老虎窗，山墙上一根石头烟囱；有的门口挂着店铺招牌。塌了的只剩半截墙。正面（朝街）是 +u 那面。
     0.38：房子是空心的——门洞、窗洞都是真的，每层楼板靠里的角上开一个方洞往上游，屋里有家具、沙、水草和住在里面的小动物 */
  const PLAST = ['#e6dcc4', '#e8d6b4', '#dcd2bc', '#efe2c6', '#d8c8a8'], ROOF = ['#5e7890', '#546c84', '#a86a52', '#94604c', '#66788a'], SHUT = ['#5a7a6a', '#8a5a4a', '#5a6a8a', '#7a6a4a'];
  function mHouse(m, u, v, yaw, w, d, fl, k, broken, z0) {
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), toW = (x, y, z) => { const dx = x - u, dy = y - v; return [u + dx * cyw - dy * syw, v + dx * syw + dy * cyw, z]; };
    rot(m, u, v, yaw, () => { const a = u - d / 2, c = u + d / 2, b = v - w / 2, e = v + w / 2, G = 3.6, F = 3.2, T = 0.28, pl = PLAST[k % PLAST.length], st = H(k, 5) < 0.5 ? '#c4b9a2' : '#b9ae98', zf = z0 + 0.5;
      m.box(a - 0.15, b - 0.15, z0, c + 0.15, e + 0.15, zf, '#a39985', M.stone); // 台基 = 一楼地面
      const dv = v + (H(k, 6) - 0.5) * w * 0.3, door = [dv - 0.75, dv + 0.75, zf - 0.01, zf + 2.3], hole = [a + T + 0.15, b + T + 0.15, a + T + 1.85, b + T + 1.85];
      const gw = w > 4.2 ? [-1, 1].map((sd) => [v + sd * w * 0.32 - 0.38, v + sd * w * 0.32 + 0.38, zf + 0.95, zf + 2.0]).filter((o) => o[1] < door[0] || o[0] > door[1]) : [];
      wall(m, 'u', c - T, c, b, e, z0, z0 + G, [door, ...gw], st, M.stone); wall(m, 'u', a, a + T, b, e, z0, z0 + G, [[v - 0.38, v + 0.38, zf + 1.0, zf + 1.9]], st, M.stone);
      wall(m, 'v', b, b + T, a + T, c - T, z0, z0 + G, [[u - 0.35, u + 0.35, zf + 1.0, zf + 1.9]], st, M.stone); wall(m, 'v', e - T, e, a + T, c - T, z0, z0 + G, [[u + 0.2, u + 0.9, zf + 1.0, zf + 1.9]], st, M.stone);
      archFrame(m, c, dv, zf, 1.5, 2.3); for (const o of gw) winFrame(m, c, (o[0] + o[1]) / 2, o[2], o[1] - o[0], o[3] - o[2], null);
      const kinds = ['home', 'shop', 'home', 'bed'], top = broken ? Math.max(1, Math.floor(fl * 0.5)) : fl, keepDoor = [c - 1.3, door[0] - 0.2, c, door[1] + 0.2];
      room(m, a + T, b + T, c - T, e - T, zf, G - 0.5, kinds[k % 4] === 'bed' ? 'home' : kinds[k % 4], k * 13 + 1, [keepDoor, top > 0 ? hole : [0, 0, 0, 0]], toW);
      let z = z0 + G, j = 0.35;
      for (let f = 0; f < top; f++) { const A = a - j * 0.3, C = c + j * (f + 1), B = b - j * 0.25 * (f + 1), E = e + j * 0.25 * (f + 1);
        slab(m, A, B, C, E, z - 0.15, z + 0.06, hole, '#7a5c40', M.plank); // 楼板（角上一个洞往上游）
        m.box(A - 0.05, B - 0.05, z - 0.25, C + 0.05, E + 0.05, z - 0.1, TIM, M.plank); // 挑出来的那条梁
        for (const [x2, y2] of [[hole[0] + 0.1, hole[1] - 0.02]]) { m.box(x2, y2, z - G + 0.5, x2 + 0.06, y2 + 0.06, z + 0.06, '#6a4a30', M.plank); m.box(x2 + 1.5, y2, z - G + 0.5, x2 + 1.56, y2 + 0.06, z + 0.06, '#6a4a30', M.plank); for (let r2 = 0; r2 < 5; r2++) m.box(x2, y2, z - G + 1.0 + r2 * 0.55, x2 + 1.56, y2 + 0.06, z - G + 1.06 + r2 * 0.55, '#7a5a3a', M.plank); } // 靠着墙的梯子（游泳用不着，看着像以前有人住）
        const wz = z + F * 0.5, fw = [-1, 1].map((sd) => [v + sd * (E - B) * 0.25 - 0.45, v + sd * (E - B) * 0.25 + 0.45, wz, wz + 1.25]);
        wall(m, 'u', C - T, C, B, E, z + 0.06, z + F, fw, pl, M.plaster); wall(m, 'u', A, A + T, B, E, z + 0.06, z + F, [[v - 0.4, v + 0.4, wz, wz + 1.1]], pl, M.plaster);
        wall(m, 'v', B, B + T, A + T, C - T, z + 0.06, z + F, [[(A + C) / 2 - 0.4, (A + C) / 2 + 0.4, wz, wz + 1.1]], pl, M.plaster); wall(m, 'v', E - T, E, A + T, C - T, z + 0.06, z + F, [[(A + C) / 2 + 0.1, (A + C) / 2 + 0.9, wz, wz + 1.1]], pl, M.plaster);
        for (const y of [B, (B + E) / 2, E]) m.box(C - 0.02, y - 0.09, z, C + 0.08, y + 0.09, z + F, TIM, M.plank); // 立柱（避开窗洞）
        for (let x = A; x <= C + 0.01; x += (C - A) / 3) for (const y of [B, E]) m.box(x - 0.09, y - (y === B ? 0.08 : 0.02), z, x + 0.09, y + (y === B ? 0.02 : 0.08), z + F, TIM, M.plank);
        m.box(C - 0.02, B, z + F * 0.42 - 0.06, C + 0.08, E, z + F * 0.42, TIM, M.plank); m.box(C - 0.02, B, z + F - 0.12, C + 0.08, E, z + F, TIM, M.plank);
        for (const [y0, y1] of [[B, B + (E - B) / 4], [E - (E - B) / 4, E]]) m.quad([C + 0.06, y0, z + 0.1], [C + 0.06, y0 + 0.16, z + 0.1], [C + 0.06, y1, z + F * 0.42], [C + 0.06, y1 - 0.16, z + F * 0.42], TIM, 0); // 斜撑
        for (const o of fw) winFrame(m, C, (o[0] + o[1]) / 2, o[2], o[1] - o[0], o[3] - o[2], SHUT[(k + f) % SHUT.length]);
        room(m, A + T, B + T, C - T, E - T, z + 0.06, F - 0.2, f === top - 1 ? 'bed' : kinds[(k + f + 1) % 4], k * 13 + f + 2, [hole, [hole[0] - 0.2, hole[1] - 0.2, hole[2] + 0.2, hole[3] + 0.2]], toW);
        z += F; }
      const A = a - j * 0.3, C = c + j * top, B = b - j * 0.25 * top, E = e + j * 0.25 * top;
      if (!broken) { const rh = (E - B) * 0.85, rc = ROOF[k % ROOF.length];
        m.box(A, B, z - 0.15, C, E, z + 0.05, '#7a5c40', M.plank); // 顶层的天花板
        m.gable(A - 0.3, B - 0.35, C + 0.4, E + 0.35, z, rh, 'u', rc, M.tile, 0.35, pl, M.plaster);
        const dv2 = v + (H(k, 8) - 0.5) * (E - B) * 0.3, dz = z + rh * 0.3; m.box(C - 1.4, dv2 - 0.7, dz - 0.2, C - 0.2, dv2 + 0.7, dz + 1.3, pl, M.plaster); win(m, C - 0.15, dv2, dz + 0.1, 0.7, 0.9, null); m.gable(C - 1.5, dv2 - 0.85, C - 0.1, dv2 + 0.85, dz + 1.3, 0.7, 'v', rc, M.tile, 0.15, pl, M.plaster);
        const cy = H(k, 9) < 0.5 ? B + 0.9 : E - 0.9; m.box(a + 0.6, cy - 0.45, z, a + 1.5, cy + 0.45, z + rh + 1.4, '#a89c86', M.stone); m.box(a + 0.5, cy - 0.55, z + rh + 1.4, a + 1.6, cy + 0.55, z + rh + 1.7, '#8f8472', M.stone);
        if (H(k, 10) < 0.7) m.moss([(A + C) / 2, v + (H(k, 11) - 0.5) * 2, z + rh * 0.5], [0, 0.4, 1], 0.9, 0.3, k); }
      else { for (let s2 = 0; s2 < 3; s2++) m.blob(u + (H(k, s2) - 0.5) * d * 0.6, v + (H(s2, k) - 0.5) * w * 0.6, zf, 0.5 + H(k, s2 + 4) * 0.4, 0.35, '#9a8f7c', M.stone, k + s2); } // 塌掉的：屋里一堆碎石，顶上敞着
      if (H(k, 12) < 0.35) { const sv = v - w * 0.28; m.box(c + 0.05, sv - 0.05, z0 + 3.0, c + 1.4, sv + 0.05, z0 + 3.12, '#2a2622', M.metal); m.box(c + 0.6, sv - 0.04, z0 + 2.2, c + 1.3, sv + 0.04, z0 + 2.95, ['#8a5a3a', '#5a6a7a', '#7a6a3a'][k % 3], M.plank); } }, z0);
  }
  // 沿着放射街两边、环街外侧排一排房子（朝街），上城台地上几栋，避开地标
  const LM2 = { cath: [82, 18.5], hall: [-14, 20], keep: [205, 17.5], mkt: [-20, 14.6], clock: [-112, 21.5], obs: [115, 23.5], bridge: [150, 15.5], gate: [90, 25] };
  const lm = (k) => P(LM2[k][0] * D, LM2[k][1], 0);
  function houses(m) {
    let k = 0; const used = [];
    const ok = (u, v, rr) => { if (!inBasin(u, v, 3.2)) return false; if (TEMPLES.some(([x, y]) => Math.hypot(x - u, y - v) < 5.2 + rr)) return false; if (Math.hypot(ROTUNDA.u - u, ROTUNDA.v - v) < 8.2 + rr) return false; for (const key of Object.keys(LM2)) { const L = lm(key), lim = key === 'cath' ? 9.5 : key === 'keep' ? 7.5 : key === 'mkt' ? 4.6 : 6; if (Math.hypot(L[0] - u, L[1] - v) < lim + rr) return false; } return !used.some(([x, y, q]) => Math.hypot(x - u, y - v) < q + rr); };
    const put = (u, v, yaw, w, d, fl) => { const rr = Math.max(w, d) * 0.6; if (!ok(u, v, rr) || polar(u, v)[1] < 12) return; used.push([u, v, rr]); mHouse(m, u, v, yaw, w, d, fl, k, H(k, 34) < 0.22, groundZ(u, v)); k++; };
    for (const a of STREETS) for (let r = 13.5; r < 25; r += 5.2) for (const s of [-1, 1]) { const off = 4.2, [u, v] = P(a, r, 0), nx = -Math.sin(a) * s * off, ny = Math.cos(a) * s * off, yaw = a + (s > 0 ? -Math.PI / 2 : Math.PI / 2);
      put(u + nx, v + ny, yaw, 4.2 + H(k, 31) * 1.2, 4.4 + H(k, 32), 1 + Math.floor(H(k, 33) * 2.2)); }
    for (let t = 0; t < 360; t += 17) { const a = t * D, r = 22.6, [u, v] = P(a, r, 0); put(u, v, a + Math.PI, 4.4 + H(t, 1), 4.2, 1 + Math.floor(H(t, 2) * 2)); }
    for (let t = UP.t0 + 0.12; t < UP.t1; t += 0.26) { const [u, v] = P(t, 22.2, 0); put(u, v, t + Math.PI, 4.2, 4.2, 1 + Math.floor(H(t, 4) * 2)); }
  }
  /* 哥特教堂（上城）：中厅 + 两侧低一点的侧廊（外面一排扶壁、飞扶壁）、尖拱窗、正面两座钟楼带尖顶（尖顶刚好戳出水面）、
     两塔之间一扇玫瑰窗和尖拱大门、后面半圆的后殿 */
  function cathedral(m) {
    const [u, v] = lm('cath'), t = LM2.cath[0] * D, z0 = UP.z, cyw = Math.cos(t + Math.PI), syw = Math.sin(t + Math.PI), toW = (x, y, z) => { const dx = x - u, dy = y - v; return [u + dx * cyw - dy * syw, v + dx * syw + dy * cyw, z]; };
    rot(m, u, v, t + Math.PI, () => { const L = 8, Wn = 3, Wa = 2.2, hN = 11, hA = 6.4, S = '#d6ccb4', S2 = '#c8bea6', T = 0.4;
      /* 0.38 教堂是空的大厅：正门进去是中厅（两排长椅、尽头的祭坛和半圆后殿），中厅两边的拱廊通进两侧的侧廊；高处一排尖拱窗透下光来 */
      m.box(u - L, v - Wn, z0 - 0.3, u + L, v + Wn, z0 + 0.02, '#cfc5ae', M.stone); // 中厅地面
      const bays = []; for (let x = u - L + 2.2; x < u + L - 1; x += 2.6) bays.push(x);
      for (const sd of [-1, 1]) { const y0 = sd > 0 ? v + Wn : v - Wn - Wa, y1 = sd > 0 ? v + Wn + Wa : v - Wn, yy = sd > 0 ? y1 : y0;
        wall(m, 'v', sd > 0 ? v + Wn - T : v - Wn, sd > 0 ? v + Wn : v - Wn + T, u - L, u + L, z0, z0 + hN, bays.map((x) => [x - 0.85, x + 0.85, z0 + 0.02, z0 + 4.4]).concat(bays.map((x) => [x + 1.3 - 0.4, x + 1.3 + 0.4, z0 + hA + 1.4, z0 + hA + 3.8])), S, M.stone); // 中厅墙：下面拱廊、上面高窗
        for (const x of bays) for (let kk = 0; kk <= 5; kk++) { const a2 = (kk / 5) * Math.PI, xx = x - Math.cos(a2) * 0.85, zz = z0 + 4.4 + Math.sin(a2) * 0.6; m.box(xx - 0.15, (sd > 0 ? v + Wn - T : v - Wn) - 0.02, zz - 0.15, xx + 0.15, (sd > 0 ? v + Wn : v - Wn + T) + 0.02, zz + 0.15, S2, M.stone); }
        m.box(u - L + 1, y0, z0 - 0.3, u + L - 0.5, y1, z0 + 0.02, '#c8bea6', M.stone); // 侧廊地面
        wall(m, 'v', sd > 0 ? y1 - T : y0, sd > 0 ? y1 : y0 + T, u - L + 1, u + L - 0.5, z0, z0 + hA, bays.map((x) => [x - 1.3 - 0.4 + 1.3, x + 0.4, z0 + 1.6, z0 + 4.2]).map(([p, q, r, w2]) => [p, q, r, w2]), S2, M.stone); // 侧廊外墙（尖拱窗是真的洞）
        for (const xe of [u - L + 1, u + L - 0.9]) m.box(xe, y0, z0, xe + 0.4, y1, z0 + hA, S2, M.stone); // 侧廊两头
        for (const x of bays) { m.box(x - 0.35, yy + (sd > 0 ? 0 : -1.1), z0, x + 0.35, yy + (sd > 0 ? 1.1 : 0), z0 + hA + 1.2, S, M.stone); // 扶壁
          m.quad([x - 0.15, yy + sd * 0.8, z0 + hA + 1.2], [x + 0.15, yy + sd * 0.8, z0 + hA + 1.2], [x + 0.15, v + sd * Wn, z0 + hN - 1.5], [x - 0.15, v + sd * Wn, z0 + hN - 1.5], S2, M.stone); }
        m.quad([u - L + 1, y1 - (sd > 0 ? 0 : Wa), z0 + hA], [u + L - 0.5, y1 - (sd > 0 ? 0 : Wa), z0 + hA], [u + L - 0.5, sd > 0 ? v + Wn : v - Wn, z0 + hA + 1.6], [u - L + 1, sd > 0 ? v + Wn : v - Wn, z0 + hA + 1.6], '#56626c', M.tile);
        for (let i = 0; i < 3; i++) { const x = u - L + 2.6 + i * 4.4, y = (y0 + y1) / 2; m.box(x - 0.5, y - 0.25, z0, x + 0.5, y + 0.25, z0 + 0.5, '#8a7e6a', M.stone); HOMES.push({ ...(([a2, b2, c2]) => ({ u: a2, v: b2, z: c2 }))(toW(x, y, z0 + 0.6)), kind: i % 2 ? 'snail' : 'crab', sd: 300 + i + sd }); } } // 侧廊里的石棺
      m.gable(u - L, v - Wn - 0.2, u + L, v + Wn + 0.2, z0 + hN, 4.2, 'u', '#46647e', M.tile, 0.3, S, M.stone);
      // 后殿：半圆的墙（只画外面那半圈，里面跟中厅连通），锥形屋顶
      for (let i = 0; i < 10; i++) { const a0 = Math.PI / 2 + (i / 10) * Math.PI, a1 = Math.PI / 2 + ((i + 1) / 10) * Math.PI, P0 = [u - L + Math.cos(a0) * Wn, v + Math.sin(a0) * Wn], P1 = [u - L + Math.cos(a1) * Wn, v + Math.sin(a1) * Wn]; m.quad([P0[0], P0[1], z0], [P1[0], P1[1], z0], [P1[0], P1[1], z0 + hN - 1], [P0[0], P0[1], z0 + hN - 1], S, M.stone); m.tri([u - L, v, z0 + 0.02], [P1[0], P1[1], z0 + 0.02], [P0[0], P0[1], z0 + 0.02], '#cfc5ae', M.stone); }
      m.cyl(u - L, v, z0 + hN - 1, z0 + hN + 3, Wn + 0.3, 0.2, '#46647e', M.tile, 14, false);
      // 祭坛、烛台、长椅
      m.box(u - L + 0.4, v - 1.2, z0, u - L + 1.4, v + 1.2, z0 + 1.0, '#e0d6c0', M.stone); m.box(u - L + 0.3, v - 1.3, z0 + 1.0, u - L + 1.5, v + 1.3, z0 + 1.12, '#d0c4a8', M.stone); m.moss([u - L + 0.9, v + 0.5, z0 + 1.12], [0, 0, 1], 0.4, 0.15, 41); HOMES.push({ ...(([a2, b2, c2]) => ({ u: a2, v: b2, z: c2 }))(toW(u - L + 0.9, v - 0.3, z0 + 1.3)), kind: 'turtle', sd: 401 });
      for (const sd of [-1, 1]) { m.cyl(u - L + 1.9, v + sd * 1.6, z0, z0 + 1.6, 0.06, 0.06, '#b8a060', M.metal, 6); m.cyl(u - L + 1.9, v + sd * 1.6, z0 + 1.6, z0 + 1.7, 0.2, 0.2, '#b8a060', M.metal, 8); }
      for (let r2 = 0; r2 < 6; r2++) for (const sd of [-1, 1]) { const x = u - L + 3.5 + r2 * 1.7, y0 = v + sd * 0.7, y1 = v + sd * 2.5; if (r2 === 3 && sd > 0) { m.box(x - 0.2, Math.min(y0, y1), z0, x + 0.25, Math.max(y0, y1), z0 + 0.15, '#6a4c34', M.plank); continue; } // 一张翻倒了
        m.box(x - 0.2, Math.min(y0, y1), z0 + 0.4, x + 0.2, Math.max(y0, y1), z0 + 0.48, '#7a5a3e', M.plank); m.box(x + 0.15, Math.min(y0, y1), z0 + 0.48, x + 0.22, Math.max(y0, y1), z0 + 1.0, '#6a4c34', M.plank); for (const y of [y0, y1]) m.box(x - 0.18, y - 0.04, z0, x + 0.18, y + 0.04, z0 + 0.4, '#6a4c34', M.plank); if ((r2 + sd) % 3 === 0) m.moss([x, (y0 + y1) / 2, z0 + 0.48], [0, 0, 1], 0.3, 0.1, r2 * 7 + sd); }
      { const cx2 = u + 1, cy2 = v; m.cyl(cx2, cy2, z0, z0 + 0.15, 1.3, 1.1, '#8a7a4a', M.metal, 14, false); for (let k2 = 0; k2 < 8; k2++) { const a2 = k2 * 0.785; m.cyl(cx2 + Math.cos(a2) * 1.2, cy2 + Math.sin(a2) * 1.2, z0, z0 + 0.35, 0.05, 0.05, '#c8b068', M.metal, 5); } } // 掉在地上的吊灯
      for (let i = 0; i < 4; i++) HOMES.push({ ...(([a2, b2, c2]) => ({ u: a2, v: b2, z: c2 }))(toW(u - 4 + i * 2.6, v + (i % 2 ? 1 : -1), z0 + 3 + i)), kind: 'fish', sd: 410 + i });
      // 正面：两座钟楼（空心，正面开门，里面每 4 格一层楼板，角上开洞往上游）+ 尖顶
      const fx = u + L;
      for (const sd of [-1, 1]) { const y = v + sd * (Wn + 1.2), s2 = 1.9, hT = 10, X0 = fx - 0.6, X1 = fx + 3.2, Y0 = y - s2, Y1 = y + s2, hole = [X0 + 0.5, Y0 + 0.5, X0 + 2.1, Y0 + 2.1];
        wall(m, 'u', X1 - T, X1, Y0, Y1, z0, z0 + hT, [[y - 0.6, y + 0.6, z0 - 0.01, z0 + 2.4], [y - 0.4, y + 0.4, z0 + hT - 4.2, z0 + hT - 1.8], [y - 0.3, y + 0.3, z0 + 6, z0 + 8]], S, M.stone); wall(m, 'u', X0, X0 + T, Y0, Y1, z0, z0 + hT, [], S, M.stone);
        wall(m, 'v', Y0, Y0 + T, X0 + T, X1 - T, z0, z0 + hT, [[fx + 0.8, fx + 1.6, z0 + 5, z0 + 7]], S, M.stone); wall(m, 'v', Y1 - T, Y1, X0 + T, X1 - T, z0, z0 + hT, [[fx + 0.8, fx + 1.6, z0 + 5, z0 + 7]], S, M.stone);
        archFrame(m, X1, y, z0, 1.2, 2.4, S2); for (const zz of [z0 + 4, z0 + 8]) slab(m, X0 + T, Y0 + T, X1 - T, Y1 - T, zz - 0.2, zz, hole, '#bdb39d', M.stone); m.box(X0, Y0, z0 + hT - 0.2, X1, Y1, z0 + hT, S2, M.stone);
        m.cyl(fx + 1.3, y, z0 + 8.3, z0 + 9.6, 0.7, 0.9, '#8a7a4a', M.metal, 12); HOMES.push({ ...(([a2, b2, c2]) => ({ u: a2, v: b2, z: c2 }))(toW(fx + 1.3, y, z0 + 1)), kind: 'crab', sd: 420 + sd }); // 钟楼顶层还挂着一口铜钟
        for (let z = z0 + 4; z < z0 + hT; z += 4) m.box(fx - 0.7, y - s2 - 0.1, z, fx + 3.3, y + s2 + 0.1, z + 0.3, S2, M.stone);
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.cyl(fx + 1.3 + dx * 1.6, y + dy * 1.6, z0 + hT, z0 + hT + 2.2, 0.28, 0.05, S2, M.stone, 6);
        const cx = fx + 1.3, sp = z0 + hT + 8.5; m.tri([cx - s2, y - s2, z0 + hT], [cx + s2, y - s2, z0 + hT], [cx, y, sp], '#52708a', M.tile); m.tri([cx + s2, y - s2, z0 + hT], [cx + s2, y + s2, z0 + hT], [cx, y, sp], '#46647e', M.tile); m.tri([cx + s2, y + s2, z0 + hT], [cx - s2, y + s2, z0 + hT], [cx, y, sp], '#52708a', M.tile); m.tri([cx - s2, y + s2, z0 + hT], [cx - s2, y - s2, z0 + hT], [cx, y, sp], '#46647e', M.tile);
        m.box(cx - 0.05, y - 0.05, sp, cx + 0.05, y + 0.05, sp + 1.2, '#8a7a4a', M.metal); m.box(cx - 0.05, y - 0.4, sp + 0.7, cx + 0.05, y + 0.4, sp + 0.82, '#8a7a4a', M.metal); }
      // 两塔之间：正墙（大门是真的门洞）+ 玫瑰窗
      wall(m, 'u', fx - 0.2, fx + 0.6, v - Wn, v + Wn, z0, z0 + hN + 1.5, [[v - 1.1, v + 1.1, z0 - 0.01, z0 + 3.4]], S, M.stone); archFrame(m, fx + 0.6, v, z0, 2.2, 3.4, S2);
      m.disc(fx + 0.62, v, z0 + 8, 1.6, 'u', '#c8a64a', M.glow, 16); m.disc(fx + 0.64, v, z0 + 8, 1.15, 'u', GL, 0, 16); for (let k = 0; k < 8; k++) { const a = k * 0.785; m.box(fx + 0.64, v + Math.cos(a) * 0.6 - 0.05, z0 + 8 + Math.sin(a) * 0.6 - 0.05, fx + 0.7, v + Math.cos(a) * 0.6 + 0.05, z0 + 8 + Math.sin(a) * 0.6 + 0.05, '#d8ceb6', 0); }
      for (let k = 0; k < 4; k++) m.box(fx + 0.6 + k * 0.6, v - 2.2 + k * 0.1, z0 - 0.0, fx + 1.2 + k * 0.6, v + 2.2 - k * 0.1, z0 + 0.6 - k * 0.15, '#cdc3ac', M.stone);
      m.moss([u, v + 1, z0 + hN + 2.9], [0, 0.5, 1], 1.4, 0.4, 2); m.moss([u - 4, v - Wn - 1.2, z0 + hA + 0.9], [0, -0.4, 1], 0.9, 0.3, 4); }, z0);
  }
  // 市政厅：底层一排拱廊，上层大窗，陡屋顶上一座小钟楼（正对集市广场）
  function townHall(m) {
    const [u, v] = lm('hall'), t = LM2.hall[0] * D, cyw = Math.cos(t + Math.PI), syw = Math.sin(t + Math.PI), toW = (x, y, z) => { const dx = x - u, dy = y - v; return [u + dx * cyw - dy * syw, v + dx * syw + dy * cyw, z]; };
    rot(m, u, v, t + Math.PI, () => { const d = 6, w = 10, a = u - d / 2, c = u + d / 2, b = v - w / 2, e = v + w / 2, z0 = FLOOR, S = '#d2c6ac', T = 0.35, cf = c - 1.6, hole = [a + T + 0.2, b + T + 0.2, a + T + 1.9, b + T + 1.9];
      /* 0.38 市政厅：拱廊后面是议事厅（长桌、一圈椅子），角上洞口游上二楼的档案室（一排排架子） */
      m.box(a, b, z0 - 0.2, c, e, z0 + 0.02, '#c8bea6', M.stone);
      wall(m, 'u', cf - T, cf, b, e, z0, z0 + 4.2, [[v - 0.8, v + 0.8, z0 - 0.01, z0 + 2.6], [b + 1.6, b + 2.4, z0 + 1.2, z0 + 2.6], [e - 2.4, e - 1.6, z0 + 1.2, z0 + 2.6]], S, M.stone); wall(m, 'u', a, a + T, b, e, z0, z0 + 4.2, [[v - 0.5, v + 0.5, z0 + 1.4, z0 + 2.8]], S, M.stone);
      wall(m, 'v', b, b + T, a + T, cf - T, z0, z0 + 4.2, [], S, M.stone); wall(m, 'v', e - T, e, a + T, cf - T, z0, z0 + 4.2, [], S, M.stone); archFrame(m, cf, v, z0, 1.6, 2.6, '#c6baa0');
      m.box(c - 0.3, b, z0 + 3.8, c, e, z0 + 4.4, S, M.stone);
      for (let k = 0; k < 5; k++) { const y = b + 1 + k * (w - 2) / 4; m.box(c - 0.4, y - 0.35, z0, c, y + 0.35, z0 + 3.8, S, M.stone); if (k < 4) { const ym = y + (w - 2) / 8; for (let j = 0; j <= 4; j++) { const a2 = (j / 4) * Math.PI, yy = ym - Math.cos(a2) * ((w - 2) / 8 - 0.35), zz = z0 + 2.6 + Math.sin(a2) * 0.9; m.box(c - 0.4, yy - 0.15, zz, c, yy + 0.15, zz + 0.3, '#c6baa0', M.stone); } } }
      { const x0 = a + T + 0.8, x1 = cf - T - 0.6; m.box(x0 + 0.6, v - 0.6, z0 + 0.8, x1, v + 0.6, z0 + 0.9, '#7a5a3e', M.plank); for (const xx of [x0 + 0.8, x1 - 0.2]) for (const sd of [-1, 1]) m.box(xx - 0.06, v + sd * 0.5 - 0.06, z0, xx + 0.06, v + sd * 0.5 + 0.06, z0 + 0.8, '#6a4c34', M.plank);
        for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const xx = x0 + 1.0 + i * 0.75, yy = v + sd * 1.0; m.box(xx - 0.2, yy - 0.2, z0 + 0.45, xx + 0.2, yy + 0.2, z0 + 0.5, '#7a5a3e', M.plank); m.box(xx - 0.2, yy + sd * 0.16, z0 + 0.5, xx + 0.2, yy + sd * 0.2, z0 + 1.0, '#6a4c34', M.plank); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(xx + dx * 0.16 - 0.03, yy + dy * 0.16 - 0.03, z0, xx + dx * 0.16 + 0.03, yy + dy * 0.16 + 0.03, z0 + 0.45, '#6a4c34', M.plank); }
        m.moss([(x0 + x1) / 2, v, z0 + 0.9], [0, 0, 1], 0.45, 0.15, 51); HOMES.push({ ...(([a2, b2, c2]) => ({ u: a2, v: b2, z: c2 }))(toW((x0 + x1) / 2, v, z0 + 0.3)), kind: 'crab', sd: 501 }, { ...(([a2, b2, c2]) => ({ u: a2, v: b2, z: c2 }))(toW((x0 + x1) / 2, v + 2, z0 + 2.4)), kind: 'fish', sd: 502 }); }
      slab(m, a, b, c, e, z0 + 4.2, z0 + 4.4, hole, '#bdb39d', M.stone);
      const fw = [0, 1, 2, 3].map((k) => { const y = b + 1.4 + k * (w - 2.8) / 3; return [y - 0.45, y + 0.45, z0 + 5.4, z0 + 7.6]; });
      wall(m, 'u', c - T, c, b, e, z0 + 4.4, z0 + 9, fw, '#e2d6bc', M.plaster); wall(m, 'u', a, a + T, b, e, z0 + 4.4, z0 + 9, [[v - 0.5, v + 0.5, z0 + 5.6, z0 + 7.4]], '#e2d6bc', M.plaster);
      wall(m, 'v', b, b + T, a + T, c - T, z0 + 4.4, z0 + 9, [[u - 0.4, u + 0.4, z0 + 5.6, z0 + 7.4]], '#e2d6bc', M.plaster); wall(m, 'v', e - T, e, a + T, c - T, z0 + 4.4, z0 + 9, [[u - 0.4, u + 0.4, z0 + 5.6, z0 + 7.4]], '#e2d6bc', M.plaster);
      for (const o of fw) { const y = (o[0] + o[1]) / 2; m.tri([c + 0.02, o[0], o[3]], [c + 0.02, o[1], o[3]], [c + 0.02, y, o[3] + 0.6], '#cfc5ae', M.stone); }
      for (let i = 0; i < 3; i++) { const y = b + 2.6 + i * 2.4; m.box(a + T + 1.8, y - 0.2, z0 + 4.4, c - T - 0.6, y + 0.2, z0 + 4.46, '#7a5a3e', M.plank); for (let j = 0; j < 3; j++) m.box(a + T + 1.8, y - 0.2, z0 + 4.9 + j * 0.8, c - T - 0.6, y + 0.2, z0 + 4.96 + j * 0.8, '#7a5a3e', M.plank); for (let j = 0; j < 8; j++) { const x = a + T + 2 + j * 0.33, z1 = z0 + 4.46 + Math.floor(H(i, j) * 3) * 0.8; if (H(j, i + 3) < 0.7) m.box(x, y - 0.14, z1, x + 0.22, y + 0.14, z1 + 0.35, ['#8a4a3a', '#4a5a7a', '#6a7a4a', '#c8b898'][(i + j) % 4], M.plank); } }
      HOMES.push({ ...(([a2, b2, c2]) => ({ u: a2, v: b2, z: c2 }))(toW(c - 1.2, v, z0 + 4.8)), kind: 'snail', sd: 503 });
      m.box(a, b, z0 + 8.8, c, e, z0 + 9, '#bdb39d', M.stone);
      m.gable(a - 0.3, b - 0.3, c + 0.3, e + 0.3, z0 + 9, 4.6, 'u', '#8a4e3c', M.tile, 0.3, '#e2d6bc', M.plaster);
      m.box(u - 0.9, v - 0.9, z0 + 11, u + 0.9, v + 0.9, z0 + 15, S, M.stone); m.disc(u + 0.92, v, z0 + 13.6, 0.7, 'u', '#f0e6cc', 0, 12); m.cyl(u, v, z0 + 15, z0 + 18, 1.2, 0.05, '#4a6a8c', M.tile, 8); }, FLOOR);
  }
  // 集市广场：中间一座三层喷泉，四周几个塌了篷的摊子
  function market(m) {
    const [u, v] = lm('mkt'), z = FLOOR;
    m.cyl(u, v, z, z + 0.9, 2.6, 2.6, '#cfc5ae', M.stone, 18); m.cyl(u, v, z + 0.9, z + 1.0, 2.3, 2.3, '#3f6a72', 0, 18);
    m.cyl(u, v, z + 0.9, z + 3.2, 0.45, 0.4, '#d6ccb6', M.stone, 10); m.cyl(u, v, z + 3.2, z + 3.6, 1.4, 1.2, '#cfc5ae', M.stone, 14); m.cyl(u, v, z + 3.6, z + 5.2, 0.3, 0.25, '#d6ccb6', M.stone, 8); m.cyl(u, v, z + 5.2, z + 5.5, 0.8, 0.6, '#cfc5ae', M.stone, 12); m.ball(u, v, z + 5.9, 0.4, 0.5, '#c8a64a', M.metal, 5, 8);
    for (let k = 0; k < 5; k++) { const a = k * 1.25 + 0.4, x = u + Math.cos(a) * 5.4, y = v + Math.sin(a) * 5.4; for (const [dx, dy] of [[-1, -0.7], [1, -0.7], [-1, 0.7], [1, 0.7]]) m.box(x + dx - 0.08, y + dy - 0.08, z, x + dx + 0.08, y + dy + 0.08, z + 2.4, TIM, M.plank); m.box(x - 1.1, y - 0.8, z + 0.9, x + 1.1, y + 0.8, z + 1.05, '#8a6a4a', M.plank); if (k % 2) m.quad([x - 1.2, y - 0.9, z + 2.4], [x + 1.2, y - 0.9, z + 2.4], [x + 1.2, y + 0.9, z + 2.0], [x - 1.2, y + 0.9, z + 2.0], ['#8a4a4a', '#4a6a8a', '#8a7a4a'][k % 3], M.cloth); m.cyl(x + 0.4, y, z + 1.05, z + 1.6, 0.25, 0.28, '#7a5a3a', M.plank, 8); }
  }
  // 领主浮岛：方形主楼、四角圆塔（锥顶）、城垛
  function keep(m) {
    const [u, v] = lm('keep'), z = FLOOR, s = 4.2, hK = 12, S = '#c8bea6', T = 0.45, hole = [u - s + T + 0.3, v - s + T + 0.3, u - s + T + 2.1, v - s + T + 2.1], H2 = (x, y, zz, kind, sd) => HOMES.push({ u: x, v: y, z: zz, kind, sd });
    /* 0.38 领主浮岛：空心的方楼，三层（一楼大厅：长桌和宝座；二楼兵器架和旗子；三楼卧房），角上的洞一层层往上游，楼顶敞着 */
    m.box(u - s, v - s, z - 0.2, u + s, v + s, z + 0.02, '#bdb39d', M.stone);
    const winF = (zz) => [-1, 1].map((s2) => [v + s2 * 1.6 - 0.35, v + s2 * 1.6 + 0.35, zz, zz + 1.5]);
    wall(m, 'u', u + s - T, u + s, v - s, v + s, z, z + hK, [[v - 0.95, v + 0.95, z - 0.01, z + 3.0], ...winF(z + 5), ...winF(z + 9)], S, M.stone); wall(m, 'u', u - s, u - s + T, v - s, v + s, z, z + hK, [[v - 0.4, v + 0.4, z + 1.6, z + 2.8], [v - 0.4, v + 0.4, z + 5.6, z + 6.8], [v - 0.4, v + 0.4, z + 9.6, z + 10.8]], S, M.stone);
    for (const sd of [-1, 1]) wall(m, 'v', sd < 0 ? v - s : v + s - T, sd < 0 ? v - s + T : v + s, u - s + T, u + s - T, z, z + hK, [[u - 0.4, u + 0.4, z + 1.6, z + 2.8], [u - 0.4, u + 0.4, z + 5.6, z + 6.8], [u + 0.6, u + 1.4, z + 9.6, z + 10.8]], S, M.stone);
    archFrame(m, u + s, v, z, 1.9, 3.0, '#bdb39d'); for (const zz of [z + 4, z + 8]) slab(m, u - s + T, v - s + T, u + s - T, v + s - T, zz - 0.25, zz, hole, '#8a6a4a', M.plank, '#7a5c40');
    // 一楼大厅
    m.box(u - 2.4, v - 0.5, z + 0.8, u + 1.6, v + 0.5, z + 0.9, '#6a4c34', M.plank); for (const x of [u - 2.2, u + 1.4]) for (const sd of [-1, 1]) m.box(x - 0.06, v + sd * 0.4 - 0.06, z, x + 0.06, v + sd * 0.4 + 0.06, z + 0.8, '#5a3e2a', M.plank);
    for (const sd of [-1, 1]) m.box(u - 2.4, v + sd * 1.0 - 0.15, z + 0.45, u + 1.6, v + sd * 1.0 + 0.15, z + 0.52, '#7a5a3e', M.plank);
    m.box(u - s + T, v - 0.6, z, u - s + T + 0.9, v + 0.6, z + 0.6, '#8a7a5a', M.stone); m.box(u - s + T + 0.1, v - 0.55, z + 0.6, u - s + T + 0.8, v + 0.55, z + 0.75, '#8a3a3a', M.cloth); m.box(u - s + T, v - 0.6, z + 0.6, u - s + T + 0.2, v + 0.6, z + 2.2, '#8a7a5a', M.stone); m.box(u - s + T, v - 0.65, z + 2.0, u - s + T + 0.25, v + 0.65, z + 2.3, '#c8a858', M.metal); // 宝座
    m.moss([u - 0.4, v, z + 0.9], [0, 0, 1], 0.5, 0.16, 61); H2(u - 0.4, v, z + 0.3, 'crab', 601); H2(u - s + 1.0, v, z + 1.0, 'turtle', 602); H2(u + 1, v + 2.2, z + 2, 'fish', 603);
    // 二楼：兵器架、挂着的旗子
    for (const sd of [-1, 1]) { const y = v + sd * (s - T - 0.3); m.box(u - 1.6, y - 0.12, z + 4, u + 1.6, y + 0.12, z + 4.1, '#6a4c34', M.plank); m.box(u - 1.6, y - 0.12, z + 5.3, u + 1.6, y + 0.12, z + 5.4, '#6a4c34', M.plank); for (let i = 0; i < 6; i++) m.box(u - 1.4 + i * 0.55, y - 0.03, z + 4.1, u - 1.36 + i * 0.55, y + 0.03, z + 6.2, '#8a8a90', M.metal);
      m.quad([u + 2.2, y + sd * 0.05, z + 7.6], [u + 3.0, y + sd * 0.05, z + 7.6], [u + 3.0, y + sd * 0.05, z + 5.2], [u + 2.2, y + sd * 0.05, z + 5.6], sd < 0 ? '#7a3a3a' : '#3a4a7a', M.cloth); }
    H2(u + 0.5, v, z + 4.4, 'loach', 604); H2(u, v + 1, z + 6, 'fish', 605);
    // 三楼：卧房
    m.box(u + 0.5, v + 1.2, z + 8, u + 2.8, v + 2.9, z + 8.45, '#6a4c34', M.plank); m.box(u + 0.55, v + 1.25, z + 8.45, u + 2.75, v + 2.85, z + 8.6, '#7a6a8a', M.cloth); m.moss([u + 1.6, v + 2, z + 8.6], [0, 0, 1], 0.5, 0.18, 62); H2(u + 1.6, v + 2, z + 8.8, 'turtle', 606);
    m.box(u - 2.6, v + 2.4, z + 8, u - 1.4, v + 3.0, z + 9.8, '#7a5a3e', M.plank); H2(u - 2, v + 2.7, z + 10.0, 'snail', 607);
    for (let k = -3; k <= 3; k++) for (const [ax, sd] of [['u', -1], ['u', 1], ['v', -1], ['v', 1]]) { if (k % 2) continue; const p = k * s / 3.5; if (ax === 'u') m.box(u + sd * s - 0.4, v + p - 0.45, z + hK, u + sd * s + 0.4, v + p + 0.45, z + hK + 1, S, M.stone); else m.box(u + p - 0.45, v + sd * s - 0.4, z + hK, u + p + 0.45, v + sd * s + 0.4, z + hK + 1, S, M.stone); }
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = u + dx * s, y = v + dy * s; m.cyl(x, y, z, z + hK + 2, 1.6, 1.5, '#cfc5ae', M.stone, 12); m.cyl(x, y, z + hK + 2, z + hK + 5, 1.9, 0.1, '#46647e', M.tile, 12); gothWin(m, x + dx * 1.5, y, z + hK - 2, 0.4, 1.2, dx); }
    m.moss([u + 2.4, v - 2.4, z + hK - 0.2], [0, 0, 1], 0.9, 0.3, 9);
  }
  // 钟塔：方塔从城里一直伸出水面，塔顶四面钟、尖顶（城里最高的东西之一，露在水面上像个灯标）
  function clockTower(m) {
    const [u, v] = lm('clock'), s = 2.4, top = -10.2, S = '#d0c6b0', T = 0.35, hole = [u - s + T + 0.15, v - s + T + 0.15, u - s + T + 1.75, v - s + T + 1.75]; // 尖顶刚好在池塘水面底下：从池边往下一看就是它
    /* 0.38 钟塔是空心的：底下正面一扇门，里面每 6 格一层木楼板（角上开洞往上游），最上面一层是钟的机芯——几个大大小小的铜齿轮 */
    m.box(u - s - 0.4, v - s - 0.4, FLOOR, u + s + 0.4, v + s + 0.4, FLOOR + 0.6, '#b8ae98', M.stone);
    const gw = (ax) => { const o = []; for (let z = FLOOR + 3; z < top - 4; z += 6) o.push(ax === 'u' ? [v - 0.25, v + 0.25, z, z + 1.6] : [u - 0.25, u + 0.25, z, z + 1.6]); return o; };
    wall(m, 'u', u + s - T, u + s, v - s, v + s, FLOOR, top, [[v - 0.7, v + 0.7, FLOOR + 0.59, FLOOR + 2.8], ...gw('u').slice(1)], S, M.stone); wall(m, 'u', u - s, u - s + T, v - s, v + s, FLOOR, top, gw('u'), S, M.stone);
    wall(m, 'v', v + s - T, v + s, u - s + T, u + s - T, FLOOR, top, gw('v'), S, M.stone); wall(m, 'v', v - s, v - s + T, u - s + T, u + s - T, FLOOR, top, gw('v'), S, M.stone);
    archFrame(m, u + s, v, FLOOR + 0.6, 1.4, 2.2, '#bdb39d');
    for (let z = FLOOR + 6; z < top - 1; z += 6) { slab(m, u - s + T, v - s + T, u + s - T, v + s - T, z - 0.15, z, hole, '#7a5c40', M.plank); HOMES.push({ u: u + 0.6, v: v + 0.6, z: z + 1.5, kind: 'snail', sd: 700 + z }); }
    for (let z = FLOOR + 6; z < top - 2; z += 6) m.box(u - s - 0.15, v - s - 0.15, z, u + s + 0.15, v + s + 0.15, z + 0.4, '#bdb39d', M.stone);
    { const gz = top - 2.4; for (const [gu, gv, r2] of [[u + 0.4, v + 0.2, 1.0], [u - 0.7, v - 0.5, 0.6], [u + 0.2, v - 1.2, 0.45]]) { m.cyl(gu, gv, gz - 0.08, gz + 0.08, r2, r2, '#a8884a', M.metal, 16); for (let i = 0; i < 12; i++) { const a2 = (i / 12) * 6.2832; m.box(gu + Math.cos(a2) * r2 - 0.07, gv + Math.sin(a2) * r2 - 0.07, gz - 0.07, gu + Math.cos(a2) * r2 + 0.07, gv + Math.sin(a2) * r2 + 0.07, gz + 0.07, '#a8884a', M.metal); } m.cyl(gu, gv, gz - 1.5, gz + 0.3, 0.08, 0.08, '#6a5a3a', M.metal, 6); } HOMES.push({ u: u + 0.4, v: v + 0.2, z: gz + 0.5, kind: 'crab', sd: 711 }); }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const fx = u + dx * (s + 0.05), fy = v + dy * (s + 0.05); m.disc(fx, fy, top - 2.2, 1.2, dx ? 'u' : 'v', '#f2ead6', 0, 14); m.box(fx - (dy ? 0.05 : 0.04), fy - (dx ? 0.05 : 0.04), top - 2.2, fx + (dy ? 0.05 : 0.04), fy + (dx ? 0.05 : 0.04), top - 1.3, '#2a2030', 0); }
    m.box(u - s - 0.3, v - s - 0.3, top, u + s + 0.3, v + s + 0.3, top + 0.4, '#b0a690', M.stone);
    for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(u + x * (s - 0.3) - 0.3, v + y * (s - 0.3) - 0.3, top + 0.4, u + x * (s - 0.3) + 0.3, v + y * (s - 0.3) + 0.3, top + 3, S, M.stone);
    m.cyl(u, v, top + 0.6, top + 2.3, 0.85, 0.45, '#8a7a4a', M.metal, 10);
    const sp = top + 7.5; m.tri([u - s, v - s, top + 3], [u + s, v - s, top + 3], [u, v, sp], '#52708a', M.tile); m.tri([u + s, v - s, top + 3], [u + s, v + s, top + 3], [u, v, sp], '#46647e', M.tile); m.tri([u + s, v + s, top + 3], [u - s, v + s, top + 3], [u, v, sp], '#52708a', M.tile); m.tri([u - s, v + s, top + 3], [u - s, v - s, top + 3], [u, v, sp], '#46647e', M.tile);
    m.moss([u - 1, v + 1.1, top + 3.1], [0, 0, 1], 0.9, 0.3, 3);
  }
  // 天文台：圆塔，顶上一个玻璃穹顶（穹顶露出水面，以后当温室）
  function observatory(m) {
    const [u, v] = lm('obs'), r = 5.5, top = -0.4;
    /* 0.38 天文台的圆塔开一扇门（朝街），里面两圈环形的回廊（中间空着，一直通到上面），书架、星图、一架铜望远镜，桃花水母在里面慢慢飘 */
    { const dA = Math.atan2(CEN[1] - v, CEN[0] - u), N2 = 30; for (let i = 0; i < N2; i++) { const a0 = (i / N2) * 6.2832, a1 = ((i + 1) / N2) * 6.2832, am = (a0 + a1) / 2, isD = Math.abs(Math.atan2(Math.sin(am - dA), Math.cos(am - dA))) < 0.16, z0 = isD ? FLOOR + 3.2 : FLOOR;
        const P0 = [u + Math.cos(a0) * r, v + Math.sin(a0) * r], P1 = [u + Math.cos(a1) * r, v + Math.sin(a1) * r]; m.quad([P0[0], P0[1], z0], [P1[0], P1[1], z0], [P1[0], P1[1], top], [P0[0], P0[1], top], '#d4cab4', M.stone); }
      m.cyl(u, v, FLOOR, FLOOR + 0.2, r, r, '#bfb59f', M.stone, 22);
      for (const zz of [FLOOR + 8, FLOOR + 16]) for (let i = 0; i < 24; i++) { const a0 = (i / 24) * 6.2832, a1 = ((i + 1) / 24) * 6.2832, Q = (a, rr) => [u + Math.cos(a) * rr, v + Math.sin(a) * rr]; const [p0, p1, p2, p3] = [Q(a0, r - 0.05), Q(a1, r - 0.05), Q(a1, r - 2.0), Q(a0, r - 2.0)]; m.quad([p0[0], p0[1], zz], [p1[0], p1[1], zz], [p2[0], p2[1], zz], [p3[0], p3[1], zz], i % 2 ? '#8a6a4a' : '#7a5c40', M.plank); m.quad([p3[0], p3[1], zz - 0.2], [p2[0], p2[1], zz - 0.2], [p1[0], p1[1], zz - 0.2], [p0[0], p0[1], zz - 0.2], '#6a4c34', M.plank); m.quad([p3[0], p3[1], zz - 0.2], [p2[0], p2[1], zz - 0.2], [p2[0], p2[1], zz], [p3[0], p3[1], zz], '#6a4c34', M.plank);
        if (i % 3 === 0) { const [bx, by] = Q((a0 + a1) / 2, r - 0.5); m.box(bx - 0.3, by - 0.3, zz, bx + 0.3, by + 0.3, zz + 1.6, '#7a5a3e', M.plank); for (let j = 0; j < 3; j++) m.box(bx - 0.25, by - 0.25, zz + 0.2 + j * 0.5, bx + 0.25, by + 0.25, zz + 0.5 + j * 0.5, ['#8a4a3a', '#4a5a7a', '#6a7a4a'][(i + j) % 3], M.plank); } }
      m.cyl(u, v, FLOOR, FLOOR + 1.2, 0.5, 0.4, '#8a7a5a', M.stone, 10); m.cyl(u, v, FLOOR + 1.2, FLOOR + 1.4, 1.2, 1.2, '#c8a858', M.metal, 18, false); m.cyl(u, v, FLOOR + 1.4, FLOOR + 1.5, 0.9, 0.9, '#c8a858', M.metal, 16, false); // 地上的浑天仪
      { const tz = FLOOR + 16, tx = u + r - 1.3; m.cyl(tx, v, tz, tz + 1.2, 0.12, 0.12, '#6a5a3a', M.metal, 6); m.box(tx - 1.2, v - 0.18, tz + 1.2, tx + 0.3, v + 0.18, tz + 1.55, '#b8984a', M.metal); m.box(tx - 1.5, v - 0.24, tz + 1.4, tx - 1.1, v + 0.24, tz + 1.85, '#a8884a', M.metal); } // 铜望远镜
      for (let i = 0; i < 5; i++) HOMES.push({ u: u + Math.cos(i * 1.3) * 2, v: v + Math.sin(i * 1.3) * 2, z: FLOOR + 4 + i * 3.6, kind: 'jelly', sd: 800 + i });
      HOMES.push({ u: u + 0.8, v: v, z: FLOOR + 1.6, kind: 'crab', sd: 810 }); }
    for (let z = FLOOR + 5; z < top - 1; z += 5) m.cyl(u, v, z, z + 0.5, r + 0.2, r + 0.2, '#bfb59f', M.stone, 22, false);
    for (let k = 0; k < 6; k++) { const a = k * 1.05, zz = FLOOR + 5.5 + (k % 3) * 5.5; rot(m, u + Math.cos(a) * r, v + Math.sin(a) * r, a, () => gothWin(m, u + Math.cos(a) * r + 0.01, v + Math.sin(a) * r, zz, 0.7, 2), 0); }
    m.cyl(u, v, top, top + 0.6, r + 0.35, r + 0.35, '#b8ae98', M.stone, 22);
    // 玻璃穹顶：自己一片片拼（朝门厅那边留一个门洞，人从门厅走进温室）
    const door = Math.atan2(40.4 - v, 24 - u), door2 = door + Math.PI * 0.85, isD = (a, w) => Math.abs(Math.atan2(Math.sin(a - door), Math.cos(a - door))) < w || Math.abs(Math.atan2(Math.sin(a - door2), Math.cos(a - door2))) < w; // 0.36：外面也开一扇门，从草地直接走进温室
    for (let k = 0; k < 20; k++) for (let j = 0; j < 6; j++) { const a0 = (k / 20) * 6.2832, a1 = ((k + 1) / 20) * 6.2832, e0 = (j / 6) * 1.5708, e1 = ((j + 1) / 6) * 1.5708, am = (a0 + a1) / 2;
      if (j < 3 && isD(am, 0.36)) continue;
      const Q = (a, e) => [u + Math.cos(a) * Math.cos(e) * r, v + Math.sin(a) * Math.cos(e) * r, top + 0.6 + Math.sin(e) * r * 1.6]; m.quad(Q(a0, e0), Q(a1, e0), Q(a1, e1), Q(a0, e1), '#c8eef6', M.glass); }
    for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.2832; for (let j = 0; j < 5; j++) { if (j < 3 && isD(a, 0.4)) continue; const e0 = (j / 5) * 1.5708, e1 = ((j + 1) / 5) * 1.5708; m.box(u + Math.cos(a) * Math.cos(e0) * r - 0.06, v + Math.sin(a) * Math.cos(e0) * r - 0.06, top + 0.6 + Math.sin(e0) * r * 1.6, u + Math.cos(a) * Math.cos(e1) * r + 0.06, v + Math.sin(a) * Math.cos(e1) * r + 0.06, top + 0.6 + Math.sin(e1) * r * 1.6, '#8a7a4a', M.metal); } }
  }
  function greenDoor(m) { const [u, v] = lm('obs'), r = 5.5, top = -0.4, d2 = Math.atan2(40.4 - v, 24 - u) + Math.PI * 0.85, ca = Math.cos(d2), sa = Math.sin(d2), tx = -sa, ty = ca;
    for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI, w = -Math.cos(a) * 1.7, zz = top + 0.6 + 3.4 + Math.sin(a) * 1.7, x = u + ca * (r + 0.1) + tx * w, y = v + sa * (r + 0.1) + ty * w; m.box(x - 0.28, y - 0.28, zz - 0.28, x + 0.28, y + 0.28, zz + 0.28, '#c8bea8', M.stone); }
    for (const sg of [-1, 1]) { const x = u + ca * (r + 0.1) + tx * 1.75 * sg, y = v + sa * (r + 0.1) + ty * 1.75 * sg; m.box(x - 0.3, y - 0.3, GT, x + 0.3, y + 0.3, top + 4.0, '#c2b8a2', M.stone); m.blob(x, y, GT + 0.2, 0.5, 0.3, MOSS, M.grass, 3); }
    for (let k = 0; k < 4; k++) { const x = u + ca * (r + 1.2 + k * 1.3), y = v + sa * (r + 1.2 + k * 1.3); m.box(x - 0.6, y - 0.6, GT - 0.05, x + 0.6, y + 0.6, GT + 0.06, '#b8ae98', M.stone); } } // 门口几块踏脚石
  // 石拱桥：跨过一条旧水渠，三个半圆拱，桥面两边有矮栏
  function bridge(m) {
    const [u, v] = lm('bridge'), t = LM2.bridge[0] * D;
    rot(m, u, v, t, () => { m.box(u - 1.8, v - 9, FLOOR - 1.6, u + 1.8, v + 9, FLOOR + 0.02, '#2e4a52', M.stone);
      for (let i = -1; i <= 1; i++) { const cv = v + i * 3.2; for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI, y = cv - Math.cos(a) * 1.5, z = FLOOR + 2.2 + Math.sin(a) * 1.5; m.box(u - 2.4, y - 0.3, z, u + 2.4, y + 0.3, z + 0.5, k % 2 ? '#cfc5ae' : '#c4baa4', M.stone); } m.box(u - 2.4, cv - 1.8, FLOOR, u + 2.4, cv - 1.4, FLOOR + 2.4, '#c6bca6', M.stone); }
      m.box(u - 2.4, v - 5.2, FLOOR + 3.8, u + 2.4, v + 5.2, FLOOR + 4.3, '#d4cab4', M.stone);
      for (const x of [u - 2.4, u + 2.1]) m.box(x, v - 5.2, FLOOR + 4.3, x + 0.3, v + 5.2, FLOOR + 5.3, '#cfc5ae', M.stone); });
  }
  // 城墙：沿盆地边一圈，墙头一排垛口；每 45° 一座圆塔（锥顶）；城门两座圆塔夹着拱门、铁闸
  function cityWall(m) {
    const N = 72, Rw = (t) => basR(t) * 0.92, gate = LM2.gate[0] * D;
    for (let k = 0; k < N; k++) { const t0 = (k / N) * 6.2832, t1 = ((k + 1) / N) * 6.2832, top = -5 + Math.sin(k * 0.7) * 1.4 + H(k, 40) * 2 - (H(k, 41) < 0.12 ? 8 : 0);
      if (Math.abs(Math.atan2(Math.sin(t0 + 0.04 - gate), Math.cos(t0 + 0.04 - gate))) < 0.09) continue;
      const A = P(t0, Rw(t0), 0), B = P(t1, Rw(t1), 0), nx = Math.cos((t0 + t1) / 2) * 0.8, ny = Math.sin((t0 + t1) / 2) * 0.8;
      m.quad([A[0] - nx, A[1] - ny, top], [B[0] - nx, B[1] - ny, top], [B[0] - nx, B[1] - ny, FLOOR], [A[0] - nx, A[1] - ny, FLOOR], k % 2 ? '#c4baa4' : '#bab09a', M.stone);
      m.quad([A[0] - nx, A[1] - ny, top], [A[0] + nx, A[1] + ny, top], [B[0] + nx, B[1] + ny, top], [B[0] - nx, B[1] - ny, top], '#b0a690', M.stone);
      if (k % 2 === 0) { const [cu, cv] = [(A[0] + B[0]) / 2 - nx * 0.7, (A[1] + B[1]) / 2 - ny * 0.7]; m.box(cu - 0.45, cv - 0.45, top, cu + 0.45, cv + 0.45, top + 1, '#c0b6a0', M.stone); }
      if (H(k, 42) < 0.3) m.blob((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, top, 0.8, 0.3, MOSS, M.grass, k); }
    for (let k = 0; k < 8; k++) { const t = (k / 8) * 6.2832 + 0.2; if (Math.abs(Math.atan2(Math.sin(t - gate), Math.cos(t - gate))) < 0.35) continue; const [u, v] = P(t, Rw(t), 0), hT = -7.2 + H(k, 44) * 2 - (H(k, 45) < 0.25 ? 7 : 0);
      m.cyl(u, v, FLOOR, hT, 2, 1.9, '#c8bea8', M.stone, 14); if (hT > -6) m.cyl(u, v, hT, hT + 3.2, 2.3, 0.1, '#46647e', M.tile, 14); else m.blob(u, v, hT, 1.6, 0.4, MOSS, M.grass, k); }
    const [u, v] = P(gate, Rw(gate), 0), ox = Math.cos(gate + Math.PI / 2), oy = Math.sin(gate + Math.PI / 2);
    for (const s of [-1, 1]) { const x = u + ox * s * 3.2, y = v + oy * s * 3.2; m.cyl(x, y, FLOOR, -4, 2, 1.9, '#d2c8b2', M.stone, 14); m.cyl(x, y, -4, -1.6, 2.3, 0.1, '#46647e', M.tile, 14); }
    for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI, off = -Math.cos(a) * 1.9, z = -12 + Math.sin(a) * 2.1, x = u + ox * off, y = v + oy * off; m.box(x - 0.5, y - 0.5, z, x + 0.5, y + 0.5, z + 0.7, '#d6ccb6', M.stone); }
    for (let k = -3; k <= 3; k++) { const x = u + ox * k * 0.5, y = v + oy * k * 0.5; m.box(x - 0.06, y - 0.06, FLOOR + 2, x + 0.06, y + 0.06, -11, '#3a3a40', M.metal); }
  }
  // 路灯：沿着街一排铁灯柱，灯笼里还亮着（水下能看到一点点暖光，顺着灯就能找到街）
  function lamps(m) {
    for (const a of STREETS) for (let r = 12.5; r < 25; r += 4.2) { const off = 1.9, [u, v] = P(a, r, 0), x = u - Math.sin(a) * off, y = v + Math.cos(a) * off; if (!inBasin(x, y, 3)) continue; const z = groundZ(x, y);
      m.cyl(x, y, z, z + 4.2, 0.09, 0.07, '#2e2e34', M.metal, 5); m.box(x - 0.08, y - 0.5, z + 4.1, x + 0.08, y + 0.08, z + 4.2, '#2e2e34', M.metal); m.box(x - 0.25, y - 0.75, z + 3.3, x + 0.25, y - 0.25, z + 4.05, '#ffcf7a', M.glow); }
  }
  // 水草：一丛丛从古城地面往上长，轻轻摆
  function weeds(m, o) {
    if (o.snow) return; const sw0 = m.sway; m.sway = 0.5;
    for (let i = 0; i < 80; i++) { const t = H(i, 50) * 6.2832, r = 10 + H(i, 51) * 14, [u, v] = P(t, r, 0); if (!inBasin(u, v, 2) || streetAt(u, v) === 'street') continue; const h = 3 + H(i, 52) * 7, z0 = groundZ(u, v);
      let px = u, py = v, pz = z0; for (let k = 0; k < 5; k++) { const nx = u + Math.sin(k * 0.9 + i) * 0.35, ny = v + Math.cos(k * 0.7 + i) * 0.3, nz = z0 + h * (k + 1) / 5; m.quad([px - 0.14, py, pz], [px + 0.14, py, pz], [nx + 0.1, ny, nz], [nx - 0.1, ny, nz], k % 2 ? '#3f7a4a' : '#4a8a52', M.leaf); px = nx; py = ny; pz = nz; } }
    m.sway = sw0;
  }
  // 水面：整个盆地一层（第二遍半透明画，看得见底下的城）
  function water(m, o, PKF) {
    if (PKF != null) m.pk(PKF); m.quad([POND.u0, POND.v0, WL], [POND.u1, POND.v0, WL], [POND.u1, POND.v1, WL], [POND.u0, POND.v1, WL], o.snow ? '#7fb8c8' : o.eco && o.eco.algae > 0.2 ? '#5a9a4a' : '#3f9aa8', M.lake); /* 藻华的时候池水发绿 */ m.pk(0); // 水面只在池塘里
  }
  // 出水口：东边城墙的缺口，水流过岩顶，挂成瀑布从峭壁落下去
  function outflow(m, o) {
    const t = -8 * D, ax = Math.cos(t), ay = Math.sin(t), [u0, v0] = P(t, basR(t) - 0.5, 0), [u1, v1] = P(t, rimR(t) + 0.6, 0), nx = -ay * 1.2, ny = ax * 1.2;
    void u0; void v0; // 地下水从峭壁的石缝里涌出来
    if (!o.snow) { m.quad([u1 + nx, v1 + ny, 0.2], [u1 - nx, v1 - ny, 0.2], [u1 - nx + ax * 1.2, v1 - ny + ay * 1.2, -30], [u1 + nx + ax * 1.2, v1 + ny + ay * 1.2, -30], '#7ac8e8', M.water);
      for (let k = 0; k < 8; k++) m.ball(u1 + ax * 1.4 + (H(k, 1) - 0.5) * 2, v1 + ay * 1.4 + (H(k, 2) - 0.5) * 2, -30 + H(k, 3) * 2, 0.7 + H(k, 4) * 0.6, 0.5, '#f4f8fc', 0, 3, 6); }
  }

  /* 地面：一格 1.5 见方，青草为主，夹着苔藓（深绿、软）、泥土小路和裸土（棕）；下面一层是水洞的顶（暗色岩石，挂着根和苔） */
  function ground(m, o) {
    const S2 = 1.5, snow = o.snow, busy = (u, v) => (PP.CITY.BUSY || []).some(([x, y, r]) => Math.hypot(u - x, v - y) < r);
    const nz = (u, v, f) => (Math.sin(u * f + Math.sin(v * f * 1.3) * 1.7) + Math.sin(v * f * 0.8 - u * f * 0.6 + 1.3)) * 0.25 + 0.5;
    for (let x = CEN[0] - 27; x < CEN[0] + 27; x += S2) for (let y = CEN[1] - 27; y < CEN[1] + 27; y += S2) {
      const u = x + S2 / 2, v = y + S2 / 2; if (!inBasin(u, v, -0.3) || inPond(u, v, 0.1)) continue; const [, r] = polar(u, v); if (r < 7.4) continue;
      const path = Math.abs(((Math.atan2(v - CEN[1], u - CEN[0]) / D + 360) % 72) - 36) < 2.4 + (r > 18 ? 1 : 0) || Math.abs(r - 12.6) < 0.7, moss = nz(u, v, 0.35), dirt = nz(u, v, 0.21);
      const col = snow ? '#eef4fa' : path ? (H(x, y) < 0.5 ? '#a8865e' : '#9c7c56') : moss > 0.68 ? (H(x, y) < 0.5 ? '#5f8a46' : '#6a944e') : dirt > 0.72 ? '#8e7454' : (H(x, y) < 0.33 ? '#86ac62' : H(x, y) < 0.66 ? '#8eb46a' : '#7ea45a');
      const mat = snow ? M.snow : path || dirt > 0.72 ? M.soil : M.grass; const j = (H(x * 3, y) - 0.5) * 0.06;
      m.quad([x, y, GT + j], [x + S2, y, GT + j], [x + S2, y + S2, GT + j], [x, y + S2, GT + j], col, mat);
      m.quad([x, y + S2, CEIL], [x + S2, y + S2, CEIL], [x + S2, y, CEIL], [x, y, CEIL], H(x, y * 2) < 0.5 ? '#4e4a40' : '#58534a', M.stone); }
    // 地上：一丛丛小草、野花、苔藓垫、几块长着苔的石头，避开屋子和回廊
    if (!snow) { const so = m.sway; m.sway = 0.35; const G = ['#7aa45a', '#8cb466', '#9cc070', '#6e9a52'], FL = ['#fff4f0', '#ffd95a', '#f2a6c2', '#b8a8f0'];
      for (let k = 0; k < 900; k++) { const t = H(k, 121) * 6.2832, r = 8.4 + H(k, 122) * (basR(t) - 9), [u, v] = P(t, r, 0); if (inPond(u, v, 1.2) || busy(u, v) || ((PP.CITY.FLAT || []).some((q) => u > q[0] && u < q[2] && v > q[1] && v < q[3]))) continue;
        const hh = 0.45 + H(k, 123) * 0.6, a0 = H(k, 124) * 3.14, col = G[k % 4]; for (const da of [0, 1.57]) { const cx = Math.cos(a0 + da) * 0.26, cy = Math.sin(a0 + da) * 0.26; m.tri([u - cx, v - cy, GT], [u + cx, v + cy, GT], [u + cx * 0.2, v + cy * 0.2, GT + hh], col, M.grass); }
        if (H(k, 125) < 0.12) { const fc = FL[k % 4]; m.tri([u - 0.13, v, GT + hh], [u + 0.13, v, GT + hh], [u, v + 0.13, GT + hh + 0.05], fc, M.flat); m.tri([u - 0.13, v, GT + hh], [u, v - 0.13, GT + hh + 0.05], [u + 0.13, v, GT + hh], fc, M.flat); } }
      m.sway = so;
      for (let k = 0; k < 70; k++) { const t = H(k, 131) * 6.2832, r = 9 + H(k, 132) * (basR(t) - 10), [u, v] = P(t, r, 0); if (inPond(u, v, 1.5) || busy(u, v)) continue; if (k % 3 === 0) { m.blob(u, v, GT, 0.5 + H(k, 133) * 0.5, 0.35, '#a09a88', M.stone, k); m.moss([u + 0.1, v - 0.05, GT + 0.25], [0.15, -0.1, 1], 0.5, 0.22, k + 1); } else m.moss([u, v, GT - 0.05], [0, 0, 1], 0.6 + H(k, 134) * 0.8, 0.22 + H(k, 135) * 0.16, k); } }
  }
  /* 池塘：一圈长苔的大石块做沿（比地面高一点，石缝里长草），南边几级石阶走下水，一座小小的石拱桥从西到东跨过去 */
  function pond(m, o) {
    const { u0, v0, u1, v1 } = POND, W2 = 0.9, rimC = ['#b8ae98', '#aea48e', '#c2b8a2'], top = 0.45;
    const blk = (a, b, c, d, k) => { m.box(a, b, CEIL - 0.4, c, d, top, rimC[k % 3], M.stone); if (!o.snow && H(k, 7) < 0.55) m.blob((a + c) / 2, (b + d) / 2, top, Math.min(c - a, d - b) * 0.45, 0.14, H(k, 8) < 0.5 ? '#6a9a4a' : '#7aa858', M.grass, k); };
    let k = 0; for (let x = u0 - W2; x < u1 + W2 - 0.01; x += 1.25, k++) { const x1 = Math.min(x + 1.25, u1 + W2); blk(x, v0 - W2, x1, v0, k); if (x1 <= 24 || x >= 26) blk(x, v1, x1, v1 + W2, k + 3); }
    for (let y = v0; y < v1 - 0.01; y += 1.25, k++) { const y1 = Math.min(y + 1.25, v1); blk(u0 - W2, y, u0, y1, k); blk(u1, y, u1 + W2, y1, k + 5); }
    for (let s2 = 0; s2 < 4; s2++) m.box(24, v1 - 0.45 - s2 * 0.6, CEIL - 0.4, 26, v1 + W2 - s2 * 0.6, top - 0.15 - s2 * 0.5, s2 % 2 ? '#bdb39c' : '#b3a992', M.stone); // 下水的石阶
    for (let i = 0; i <= 12; i++) { const t = i / 12, x = u0 - W2 + (u1 - u0 + 2 * W2) * t, zz = top + Math.sin(t * Math.PI) * 1.4; m.box(x - 0.36, 3.2, zz - 0.35, x + 0.36, 4.8, zz, i % 2 ? '#c8bea8' : '#beb49e', M.stone); if (i % 2 === 0) for (const yy of [3.1, 4.75]) m.box(x - 0.08, yy, zz, x + 0.08, yy + 0.15, zz + 0.9, '#b0a690', M.stone); } // 小石拱桥
    if (!o.snow) for (let i = 0; i < 18; i++) { const side = i % 4, t = H(i, 9), u = side < 2 ? u0 + (u1 - u0) * t : side === 2 ? u0 + 0.3 : u1 - 0.3, v = side < 2 ? (side ? v1 - 0.3 : v0 + 0.3) : v0 + (v1 - v0) * t; m.blob(u, v, WL + 0.05, 0.4, 0.1, '#4f8a3a', M.flat, i); } // 池边漂着的苔和睡莲叶
  }
  /* 柱廊小神殿：一圈八根柱子顶着圆顶，台基三级，中间一个石台（古城遗物就放在这里）；没有墙，从哪边都能游进去 */
  function temples(m) {
    for (const [u, v] of TEMPLES) { const z = groundZ(u, v), R2 = 3.4;
      for (let s2 = 0; s2 < 3; s2++) m.cyl(u, v, z, z + 0.4 * (s2 + 1), R2 + 1.2 - s2 * 0.45, R2 + 1.2 - s2 * 0.45, s2 % 2 ? '#d2c8b2' : '#c8bea8', M.stone, 20);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.2832, x = u + Math.cos(a) * R2, y = v + Math.sin(a) * R2; m.cyl(x, y, z + 1.2, z + 1.6, 0.42, 0.38, '#d8cebb', M.stone, 10); m.cyl(x, y, z + 1.6, z + 7.4, 0.3, 0.27, '#e0d6c2', M.stone, 10); m.cyl(x, y, z + 7.4, z + 7.9, 0.34, 0.42, '#d8cebb', M.stone, 10); }
      m.cyl(u, v, z + 7.9, z + 8.6, R2 + 0.55, R2 + 0.55, '#cfc5ae', M.stone, 22); m.ball(u, v, z + 8.6, R2 + 0.3, 2.4, '#7a9a90', M.tile, 6, 18); m.cyl(u, v, z + 10.8, z + 11.6, 0.25, 0.05, '#b8a060', M.metal, 8);
      m.cyl(u, v, z + 1.2, z + 2.6, 0.7, 0.6, '#cfc5ae', M.stone, 12); m.blob(u + 1.2, v - 0.8, z + 8.7, 1.1, 0.4, MOSS, M.grass, Math.round(u)); }
  }
  /* 城里的自然（0.36）：不再是一片通铺的石板——苔藓地、细沙、碎石、断掉的柱子、一大片一大片摇摆的海带、彩色的海葵，
     还有大树的根从水洞顶上垂下来，扎进古城里 */
  function cityNature(m, o) {
    if (o.snow) return;
    for (let k = 0; k < 160; k++) { const t = H(k, 141) * 6.2832, r = 11 + H(k, 142) * 14, [u, v] = P(t, r, 0); if (!inBasin(u, v, 2)) continue; const z = groundZ(u, v) + 0.05;
      if (k % 4 === 0) { m.blob(u, v, z, 1.2 + H(k, 143) * 1.6, 0.12, ['#4f7a3e', '#5f8a46', '#6a8a4a'][k % 3], M.grass, k); m.moss([u + 0.3, v - 0.2, z], [0, 0, 1], 0.5 + H(k, 144) * 0.5, 0.25, k * 3); } // 苔藓地
      else if (k % 4 === 1) m.blob(u, v, z, 1 + H(k, 144) * 1.4, 0.08, '#c8b890', M.soil, k); // 细沙
      else if (k % 4 === 2) for (let j = 0; j < 4; j++) m.box(u + (H(k, j) - 0.5) * 1.6, v + (H(j, k) - 0.5) * 1.6, z - 0.1, u + (H(k, j) - 0.5) * 1.6 + 0.5, v + (H(j, k) - 0.5) * 1.6 + 0.4, z + 0.2 + H(k + j, 3) * 0.35, '#b8ae98', M.stone); // 碎石
      else { const hh = 1.2 + H(k, 145) * 3; m.cyl(u, v, z, z + hh, 0.4, 0.37, '#d8cebb', M.stone, 10); if (H(k, 146) < 0.5) m.cyl(u + 1.2, v + 0.4, z, z + 0.7, 0.4, 0.4, '#d0c6b0', M.stone, 10); } } // 断柱
    const so = m.sway; m.sway = 0.6;
    for (let i = 0; i < 26; i++) { const t = H(i, 151) * 6.2832, r = 12 + H(i, 152) * 12, [cu, cv] = P(t, r, 0); if (!inBasin(cu, cv, 2)) continue; // 海带林
      /* 0.38：淡水里长的是苦草——一根根细长的带子从泥里长出来，边走边拧，有深有浅（以前是宽宽的海带，不像淡水） */
      for (let j = 0; j < 16; j++) { const u = cu + (H(i, j + 10) - 0.5) * 3.4, v = cv + (H(j, i + 10) - 0.5) * 3.4, z0 = groundZ(u, v), hgt = 6 + H(i, j + 20) * 10; let px = u, py = v, pz = z0, tw = H(i, j + 30) * 6.28; const cA = ['#4a7a3a', '#5a8a44', '#6a9a4a', '#4f8040'][j % 4], cB = ['#5f8f46', '#6e9e50', '#7aa858', '#5a8a44'][j % 4];
        for (let q = 0; q < 9; q++) { const nx = u + Math.sin(q * 0.8 + i + j) * 0.5, ny = v + Math.cos(q * 0.6 + j) * 0.4, nz2 = Math.min(CEIL - 1, z0 + hgt * (q + 1) / 9), w0 = 0.09 * (1 - q / 11), w1 = 0.09 * (1 - (q + 1) / 11), a0 = tw + q * 0.45, a1 = a0 + 0.45; m.quad([px - Math.cos(a0) * w0, py - Math.sin(a0) * w0, pz], [px + Math.cos(a0) * w0, py + Math.sin(a0) * w0, pz], [nx + Math.cos(a1) * w1, ny + Math.sin(a1) * w1, nz2], [nx - Math.cos(a1) * w1, ny - Math.sin(a1) * w1, nz2], q % 2 ? cA : cB, M.leaf); px = nx; py = ny; pz = nz2; } } }
    m.sway = so;
    /* 0.38 淡水的水底：一片片黑褐色的淤泥、五颜六色的圆卵石、一团团毛茸茸的球藻、金鱼藻（一节节轮生的细叶）、沉在泥里长满苔的倒木 */
    for (let k = 0; k < 40; k++) { const t = H(k, 161) * 6.2832, r = 11 + H(k, 162) * 14, [u, v] = P(t, r, 0); if (!inBasin(u, v, 2)) continue; const z = groundZ(u, v);
      if (k % 3 === 0) m.blob(u, v, z + 0.02, 1.2 + H(k, 164) * 1.4, 0.1, ['#4a3e30', '#55473a', '#3e352a'][k % 3], M.soil, k); // 淤泥
      for (let j = 0; j < 7; j++) m.ball(u + (H(k, j + 165) - 0.5) * 2.2, v + (H(j, k + 165) - 0.5) * 2.2, z + 0.06, 0.1 + H(k, j + 170) * 0.16, 0.07, ['#9a9284', '#b8a890', '#7a8a8a', '#a88a6a', '#c8c0b0'][(j + k) % 5], M.stone, 4, 7); // 卵石
      if (k % 2) m.moss([u + 0.8, v - 0.5, z + 0.05], [0, 0, 1], 0.3 + H(k, 175) * 0.2, 0.32, k * 5); } // 球藻
    { const so2 = m.sway; m.sway = 0.5; for (let k = 0; k < 30; k++) { const t = H(k, 181) * 6.2832, r = 11 + H(k, 182) * 14, [u, v] = P(t, r, 0); if (!inBasin(u, v, 2)) continue; const z0 = groundZ(u, v), hgt = 3 + H(k, 183) * 5; // 金鱼藻
      for (let j = 0; j < 3; j++) { const bu = u + (H(k, j) - 0.5) * 0.8, bv = v + (H(j, k) - 0.5) * 0.8; m.stem([bu, bv, z0], [bu + 0.2, bv, z0 + hgt], 0.04, 0.02, '#4a6a32', M.leaf, 4); for (let q = 1; q < 10; q++) { const zz = z0 + hgt * q / 10, cxu = bu + 0.2 * q / 10, sz = 0.35 * (1 - q / 14); for (let a = 0; a < 6; a++) { const an = a * 1.047 + q; m.stem([cxu, bv, zz], [cxu + Math.cos(an) * sz, bv + Math.sin(an) * sz, zz + 0.12], 0.015, 0.006, q % 2 ? '#5a8a3e' : '#6a9a48', M.leaf, 3); } } } } m.sway = so2; }
    for (let k = 0; k < 7; k++) { const t = H(k, 191) * 6.2832, r = 13 + H(k, 192) * 10, [u, v] = P(t, r, 0); if (!inBasin(u, v, 3)) continue; const z = groundZ(u, v), a = H(k, 193) * 6.28, L2 = 3 + H(k, 194) * 3, e = [u + Math.cos(a) * L2, v + Math.sin(a) * L2, z + 0.25]; if (!inBasin(e[0], e[1], 2)) continue; // 倒木
      m.stem([u, v, z + 0.3], e, 0.38, 0.3, '#5a4a38', M.plank, 9); m.moss([(u + e[0]) / 2, (v + e[1]) / 2, z + 0.55], [0, 0, 1], 0.6, 0.2, k * 9); m.stem([u + Math.cos(a) * L2 * 0.4, v + Math.sin(a) * L2 * 0.4, z + 0.5], [u + Math.cos(a + 0.8) * L2 * 0.4 + 0.6, v + Math.sin(a + 0.8) * L2 * 0.4, z + 1.6], 0.1, 0.05, '#5a4a38', M.plank, 6); }
    for (let k = 0; k < 18; k++) { const t = H(k, 171) * 6.2832, r = 13 + H(k, 172) * 11, [u, v] = P(t, r, 0); if (!inBasin(u, v, 2) || inPond(u, v, 2)) continue; const z1 = groundZ(u, v) + 2 + H(k, 173) * 6; rootLine(m, [[u, v, CEIL], [u + (H(k, 174) - 0.5) * 3, v + (H(k, 175) - 0.5) * 3, (CEIL + z1) / 2], [u + (H(k, 176) - 0.5) * 4, v + (H(k, 177) - 0.5) * 4, z1]], 0.7, 0.2, '#6b5442'); } // 从水洞顶上垂下来的根
  }
  /* 圆殿（0.36）：古城最华丽的一座，正好在古城之池底下——鼓形的殿身（四面拱门能游进去，门洞上一圈尖拱窗）、
     带肋的大圆顶（离水面只有四五格，从池边一眼看下去就是它）、顶上的小亭和金尖；外面一圈十六根柱子的柱廊，四角四座小尖塔；殿里中央一个石台 */
  function rotunda(m, o) {
    const { u, v, r } = ROTUNDA, z0 = groundZ(u, v), zTop = -12.5, gates = [0, 1.5708, 3.1416, 4.7124], isG = (a) => gates.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.32);
    for (let s2 = 0; s2 < 3; s2++) m.cyl(u, v, z0, z0 + 0.5 * (s2 + 1), r + 3.6 - s2 * 0.7, r + 3.6 - s2 * 0.7, s2 % 2 ? '#d6ccb6' : '#cbc1ab', M.stone, 28); // 三级台基
    const N = 28; for (let k = 0; k < N; k++) { const a0 = (k / N) * 6.2832, a1 = ((k + 1) / N) * 6.2832, am = (a0 + a1) / 2, gate = isG(am), zb = gate ? z0 + 1.5 + 6.2 : z0 + 1.5;
      for (const rr of [r, r - 0.55]) m.quad([u + Math.cos(a0) * rr, v + Math.sin(a0) * rr, zb], [u + Math.cos(a1) * rr, v + Math.sin(a1) * rr, zb], [u + Math.cos(a1) * rr, v + Math.sin(a1) * rr, zTop], [u + Math.cos(a0) * rr, v + Math.sin(a0) * rr, zTop], k % 2 ? '#e2d8c4' : '#d8cebb', M.stone);
      if (!gate && k % 2 === 0) { const x = u + Math.cos(am) * (r + 0.04), y = v + Math.sin(am) * (r + 0.04); m.box(x - 0.3, y - 0.3, z0 + 6, x + 0.3, y + 0.3, z0 + 9.2, '#2a3a44', 0); } } // 鼓身上的窄长窗
    for (const g of gates) for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI, w = -Math.cos(a) * 1.6, zz = z0 + 1.5 + 6.2 + Math.sin(a) * 1.6, x = u + Math.cos(g) * (r + 0.2) - Math.sin(g) * w, y = v + Math.sin(g) * (r + 0.2) + Math.cos(g) * w; m.box(x - 0.3, y - 0.3, zz - 0.3, x + 0.3, y + 0.3, zz + 0.3, '#ece2ce', M.stone); } // 拱门门框
    m.cyl(u, v, zTop, zTop + 0.6, r + 0.5, r + 0.5, '#cfc5ae', M.stone, 28); // 檐口
    for (let j = 0; j < 7; j++) { const e0 = (j / 7) * 1.5708, e1 = ((j + 1) / 7) * 1.5708; for (let k = 0; k < 24; k++) { const a0 = (k / 24) * 6.2832, a1 = ((k + 1) / 24) * 6.2832, Q = (a, e) => [u + Math.cos(a) * Math.cos(e) * (r + 0.2), v + Math.sin(a) * Math.cos(e) * (r + 0.2), zTop + 0.6 + Math.sin(e) * 4.6];
      m.quad(Q(a0, e0), Q(a1, e0), Q(a1, e1), Q(a0, e1), k % 3 === 0 ? '#6a8a84' : '#7a9c94', M.tile); } } // 带肋的铜绿圆顶
    m.cyl(u, v, zTop + 5.1, zTop + 6.4, 0.9, 0.9, '#e0d6c2', M.stone, 12); m.cyl(u, v, zTop + 6.4, zTop + 7.3, 1.1, 0.15, '#7a9c94', M.tile, 12); m.cyl(u, v, zTop + 7.3, zTop + 8.4, 0.12, 0.03, '#d8b860', M.metal, 6); // 顶上的小亭和金尖
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.2832, x = u + Math.cos(a) * (r + 2.6), y = v + Math.sin(a) * (r + 2.6); if (gates.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.15)) continue; m.cyl(x, y, z0 + 1.5, z0 + 9.5, 0.32, 0.28, '#e6dcc8', M.stone, 10); m.cyl(x, y, z0 + 9.5, z0 + 10, 0.4, 0.4, '#d8cebb', M.stone, 10); } // 柱廊
    m.cyl(u, v, z0 + 10, z0 + 10.6, r + 3.1, r + 3.1, '#d2c8b2', M.stone, 28, false); m.cyl(u, v, z0 + 10, z0 + 10.6, r + 2.2, r + 2.2, '#d2c8b2', M.stone, 28, false);
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const x = u + dx * (r + 3.6), y = v + dy * (r + 3.6); m.cyl(x, y, z0, z0 + 11, 0.9, 0.8, '#ddd3be', M.stone, 10); m.cyl(x, y, z0 + 11, z0 + 15, 1.0, 0.05, '#6a8a84', M.tile, 10); } // 四座小尖塔
    m.cyl(u, v, z0 + 1.5, z0 + 3, 0.9, 0.8, '#cfc5ae', M.stone, 12); // 殿里中央的石台（遗物放这儿）
    { m.blob(u + 2, v - 1.5, zTop + 3.4, 1.4, 0.4, MOSS, M.grass, 2); m.blob(u - 2.5, v + 1.2, zTop + 2.6, 1.1, 0.35, MOSS, M.grass, 3); }
  }
  function build(m, o, opt = {}) {
    HOMES.length = 0;
    rock(m, o); ground(m, o); pond(m, o); temples(m); rotunda(m, o); cityNature(m, o); floatStone(m, o); basin(m, o); houses(m); cathedral(m); townHall(m); market(m); keep(m); clockTower(m); observatory(m); greenDoor(m); bridge(m); cityWall(m); lamps(m); weeds(m, o); outflow(m, o); water(m, o, opt.pkFish);
  }
  PP.CITY = { HOMES, ROTUNDA, GT, CEIL, POND, inPond, TEMPLES, build, CEN, WL, FLOOR, RB, RI, rimR, basR, inBasin, polar, LM: LM2, lm, UP, groundZ, CRACK, STONE, TRUNK_R, streetAt, rootLine };
})();
