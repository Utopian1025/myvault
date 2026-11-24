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
  const inBasin = (u, v, m = 0) => { const [t, r] = polar(u, v); return r < basR(t) - m; };
  // 地标（θ 度、半径）

  /* ---------- 岛的岩体：外沿一圈长着苔藓的岩顶，峭壁往下收成尖 ---------- */
  function rock(m, o) {
    const N = 96, snow = o.snow, top = snow ? '#eef4fa' : '#68a844', tm = snow ? M.snow : M.grass;
    const RINGS = [[1, 0.6], [0.995, -6], [0.97, -14], [0.9, -24], [0.76, -32], [0.56, -40], [0.34, -46], [0.14, -51]];
    for (let k = 0; k < N; k++) { const t0 = (k / N) * 6.2832, t1 = ((k + 1) / N) * 6.2832, j0 = H(k, 3) * 0.8, j1 = H(k + 1, 3) * 0.8;
      // 岩顶：盆地边到外沿，长满苔藓和草
      m.quad(P(t0, basR(t0) + 0.2, 0.2 + j0 * 0.5), P(t1, basR(t1) + 0.2, 0.2 + j1 * 0.5), P(t1, rimR(t1), RINGS[0][1] + j1), P(t0, rimR(t0), RINGS[0][1] + j0), top, tm);
      for (let i = 0; i + 1 < RINGS.length; i++) { const [a, za] = RINGS[i], [b, zb] = RINGS[i + 1], ja = i === 0 ? j0 : 0, jb = i === 0 ? j1 : 0;
        m.quad(P(t0, rimR(t0) * a, za + ja), P(t1, rimR(t1) * a, za + jb), P(t1, rimR(t1) * b, zb), P(t0, rimR(t0) * b, zb), ['#a48c6a', '#95805f', '#b09776', '#8a7558'][(k + i) % 4] /* 天空之城那种暖褐色的岩层 */, M.stone); }
      m.tri(P(t0, rimR(t0) * 0.14, -51), P(t1, rimR(t1) * 0.14, -51), [CEN[0], CEN[1], -55], '#7a6650', M.stone); }
    // 岩顶上的石块和灌木丛
    for (let k = 0; k < 40; k++) { const t = (k / 40) * 6.2832 + H(k, 1) * 0.1, r = (basR(t) + rimR(t)) / 2 + (H(k, 2) - 0.5) * 1.5, [u, v] = P(t, r, 0); if (H(k, 4) < 0.5) m.blob(u, v, 0.4, 0.6 + H(k, 5) * 0.8, 0.5, snow ? '#e8eef4' : '#b4a082', M.stone, k); else if (!snow) m.foliage(u, v, 1.1, 0.9 + H(k, 6) * 0.6, 0.7, ['#3f9440', '#5cb04a', '#80c450'], 16, k, 0.6); }
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
  const GL = '#1f3540', TIM = '#4a3a2c', MOSS = '#5aa046';
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

  /* ---------- 半木结构的民居（中世纪欧洲小镇） ----------
     石头砌的底层（拱门、小窗）；上面一两层是木筋墙（深色木条：立柱、横梁、斜撑，中间刷灰泥），每层往街上挑出去一点；
     很陡的屋顶（石板或红瓦），屋面上一个老虎窗，山墙上一根石头烟囱；有的门口挂着店铺招牌。塌了的只剩半截墙。
     正面（朝街）是 +u 那面 */
  const PLAST = ['#e6dcc4', '#e8d6b4', '#dcd2bc', '#efe2c6', '#d8c8a8'], ROOF = ['#4a6a8c', '#3f5f80', '#b0583a', '#9a4e36', '#5a6c80'], SHUT = ['#5a7a6a', '#8a5a4a', '#5a6a8a', '#7a6a4a'];
  function mHouse(m, u, v, yaw, w, d, fl, k, broken, z0) {
    rot(m, u, v, yaw, () => { const a = u - d / 2, c = u + d / 2, b = v - w / 2, e = v + w / 2, G = 3.6, F = 3.2, pl = PLAST[k % PLAST.length], st = H(k, 5) < 0.5 ? '#c4b9a2' : '#b9ae98';
      m.box(a - 0.15, b - 0.15, z0, c + 0.15, e + 0.15, z0 + 0.5, '#a39985', M.stone);
      m.box(a, b, z0, c, e, z0 + G, st, M.stone); // 底层石墙
      archDoor(m, c, v + (H(k, 6) - 0.5) * w * 0.3, z0, 1.3, 2.2);
      for (const s of [-1, 1]) if (w > 4.2) m.box(c - 0.02, v + s * w * 0.32 - 0.35, z0 + 1.4, c + 0.05, v + s * w * 0.32 + 0.35, z0 + 2.4, GL, 0);
      let z = z0 + G, j = 0.35; const top = broken ? Math.max(1, Math.floor(fl * 0.5)) : fl;
      for (let f = 0; f < top; f++) { const A = a - j * 0.3, C = c + j * (f + 1), B = b - j * 0.25 * (f + 1), E = e + j * 0.25 * (f + 1);
        m.box(A, B, z, C, E, z + F, pl, M.plaster); // 灰泥墙
        m.box(A - 0.05, B - 0.05, z - 0.1, C + 0.05, E + 0.05, z + 0.18, TIM, M.plank); // 楼板梁（挑出来的那条）
        for (let y = B; y <= E + 0.01; y += (E - B) / 4) m.box(C - 0.02, y - 0.09, z, C + 0.08, y + 0.09, z + F, TIM, M.plank); // 立柱
        for (let x = A; x <= C + 0.01; x += (C - A) / 3) for (const y of [B, E]) m.box(x - 0.09, y - 0.08, z, x + 0.09, y + 0.02, z + F, TIM, M.plank);
        m.box(C - 0.02, B, z + F * 0.5 - 0.06, C + 0.08, E, z + F * 0.5 + 0.06, TIM, M.plank);
        for (const [y0, y1] of [[B, B + (E - B) / 4], [E - (E - B) / 4, E]]) m.quad([C + 0.06, y0, z + 0.1], [C + 0.06, y0 + 0.16, z + 0.1], [C + 0.06, y1, z + F * 0.5], [C + 0.06, y1 - 0.16, z + F * 0.5], TIM, 0); // 斜撑
        for (const s of [-1, 1]) win(m, C + 0.05, v + s * (E - B) * 0.25, z + F * 0.55, 0.9, 1.2, SHUT[(k + f) % SHUT.length]);
        z += F; }
      const A = a - j * 0.3, C = c + j * top, B = b - j * 0.25 * top, E = e + j * 0.25 * top;
      if (!broken) { const rh = (E - B) * 0.85, rc = ROOF[k % ROOF.length];
        m.gable(A - 0.3, B - 0.35, C + 0.4, E + 0.35, z, rh, 'u', rc, M.tile, 0.35, pl, M.plaster);
        // 老虎窗
        const dv = v + (H(k, 8) - 0.5) * (E - B) * 0.3, dz = z + rh * 0.3; m.box(C - 1.4, dv - 0.7, dz - 0.2, C - 0.2, dv + 0.7, dz + 1.3, pl, M.plaster); win(m, C - 0.15, dv, dz + 0.1, 0.7, 0.9, null); m.gable(C - 1.5, dv - 0.85, C - 0.1, dv + 0.85, dz + 1.3, 0.7, 'v', rc, M.tile, 0.15, pl, M.plaster);
        // 烟囱
        const cy = H(k, 9) < 0.5 ? B + 0.9 : E - 0.9; m.box(a + 0.6, cy - 0.45, z, a + 1.5, cy + 0.45, z + rh + 1.4, '#a89c86', M.stone); m.box(a + 0.5, cy - 0.55, z + rh + 1.4, a + 1.6, cy + 0.55, z + rh + 1.7, '#8f8472', M.stone);
        if (H(k, 10) < 0.6) m.blob((A + C) / 2, v + (H(k, 11) - 0.5) * 2, z + rh * 0.55, 0.9, 0.3, MOSS, M.grass, k); }
      else { for (let s2 = 0; s2 < 3; s2++) m.blob(u + (H(k, s2) - 0.5) * d, v + (H(s2, k) - 0.5) * w, z0 + 0.4, 0.8 + H(k, s2 + 4) * 0.6, 0.5, '#9a8f7c', M.stone, k + s2); }
      if (H(k, 12) < 0.35) { const sv = v - w * 0.28; m.box(c + 0.05, sv - 0.05, z0 + 3.0, c + 1.4, sv + 0.05, z0 + 3.12, '#2a2622', M.metal); m.box(c + 0.6, sv - 0.04, z0 + 2.2, c + 1.3, sv + 0.04, z0 + 2.95, ['#8a5a3a', '#5a6a7a', '#7a6a3a'][k % 3], M.plank); } }, z0);
  }
  // 沿着放射街两边、环街外侧排一排房子（朝街），上城台地上几栋，避开地标
  const LM2 = { cath: [82, 18.5], hall: [-14, 20], keep: [205, 17.5], mkt: [-20, 14.6], clock: [-80, 21], obs: [115, 23.5], bridge: [150, 15.5], gate: [90, 25] };
  const lm = (k) => P(LM2[k][0] * D, LM2[k][1], 0);
  function houses(m) {
    let k = 0; const used = [];
    const ok = (u, v, rr) => { if (!inBasin(u, v, 3.2)) return false; for (const key of Object.keys(LM2)) { const L = lm(key), lim = key === 'cath' ? 9.5 : key === 'keep' ? 7.5 : key === 'mkt' ? 4.6 : 6; if (Math.hypot(L[0] - u, L[1] - v) < lim + rr) return false; } return !used.some(([x, y, q]) => Math.hypot(x - u, y - v) < q + rr); };
    const put = (u, v, yaw, w, d, fl) => { const rr = Math.max(w, d) * 0.6; if (!ok(u, v, rr) || polar(u, v)[1] < 12) return; used.push([u, v, rr]); mHouse(m, u, v, yaw, w, d, fl, k, H(k, 34) < 0.22, groundZ(u, v)); k++; };
    for (const a of STREETS) for (let r = 13.5; r < 25; r += 5.2) for (const s of [-1, 1]) { const off = 4.2, [u, v] = P(a, r, 0), nx = -Math.sin(a) * s * off, ny = Math.cos(a) * s * off, yaw = a + (s > 0 ? -Math.PI / 2 : Math.PI / 2);
      put(u + nx, v + ny, yaw, 4.2 + H(k, 31) * 1.2, 4.4 + H(k, 32), 1 + Math.floor(H(k, 33) * 2.2)); }
    for (let t = 0; t < 360; t += 17) { const a = t * D, r = 22.6, [u, v] = P(a, r, 0); put(u, v, a + Math.PI, 4.4 + H(t, 1), 4.2, 1 + Math.floor(H(t, 2) * 2)); }
    for (let t = UP.t0 + 0.12; t < UP.t1; t += 0.26) { const [u, v] = P(t, 22.2, 0); put(u, v, t + Math.PI, 4.2, 4.2, 1 + Math.floor(H(t, 4) * 2)); }
  }
  /* 哥特教堂（上城）：中厅 + 两侧低一点的侧廊（外面一排扶壁、飞扶壁）、尖拱窗、正面两座钟楼带尖顶（尖顶刚好戳出水面）、
     两塔之间一扇玫瑰窗和尖拱大门、后面半圆的后殿 */
  function cathedral(m) {
    const [u, v] = lm('cath'), t = LM2.cath[0] * D, z0 = UP.z;
    rot(m, u, v, t + Math.PI, () => { const L = 8, Wn = 3, Wa = 2.2, hN = 11, hA = 6.4, S = '#d6ccb4', S2 = '#c8bea6';
      m.box(u - L, v - Wn, z0, u + L, v + Wn, z0 + hN, S, M.stone); m.gable(u - L, v - Wn - 0.2, u + L, v + Wn + 0.2, z0 + hN, 4.2, 'u', '#46647e', M.tile, 0.3, S, M.stone);
      for (const sd of [-1, 1]) { const y0 = sd > 0 ? v + Wn : v - Wn - Wa, y1 = sd > 0 ? v + Wn + Wa : v - Wn;
        m.box(u - L + 1, y0, z0, u + L - 0.5, y1, z0 + hA, S2, M.stone);
        for (let x = u - L + 2.2; x < u + L - 1; x += 2.6) { const yy = sd > 0 ? y1 : y0; m.box(x - 0.35, yy + (sd > 0 ? 0 : -1.1), z0, x + 0.35, yy + (sd > 0 ? 1.1 : 0), z0 + hA + 1.2, S, M.stone); // 扶壁
          m.quad([x - 0.15, yy + sd * 0.8, z0 + hA + 1.2], [x + 0.15, yy + sd * 0.8, z0 + hA + 1.2], [x + 0.15, v + sd * Wn, z0 + hN - 1.5], [x - 0.15, v + sd * Wn, z0 + hN - 1.5], S2, M.stone); // 飞扶壁
          rot(m, x, yy, sd > 0 ? Math.PI / 2 : -Math.PI / 2, () => gothWin(m, x + 0.01, yy - 1.3, z0 + 1.6, 0.8, 2.6), 0);
          rot(m, x + 1.3, v + sd * Wn, sd > 0 ? Math.PI / 2 : -Math.PI / 2, () => gothWin(m, x + 1.31, v + sd * Wn, z0 + hA + 1.4, 0.7, 2.2), 0); }
        m.quad([u - L + 1, y1 - (sd > 0 ? 0 : Wa), z0 + hA], [u + L - 0.5, y1 - (sd > 0 ? 0 : Wa), z0 + hA], [u + L - 0.5, sd > 0 ? v + Wn : v - Wn, z0 + hA + 1.6], [u - L + 1, sd > 0 ? v + Wn : v - Wn, z0 + hA + 1.6], '#56626c', M.tile); }
      // 后殿：半圆，锥形屋顶
      m.cyl(u - L, v, z0, z0 + hN - 1, Wn, Wn, S, M.stone, 14, false); m.cyl(u - L, v, z0 + hN - 1, z0 + hN + 3, Wn + 0.3, 0.2, '#46647e', M.tile, 14);
      // 正面：两座钟楼 + 尖顶
      const fx = u + L;
      for (const sd of [-1, 1]) { const y = v + sd * (Wn + 1.2), s = 1.9, hT = 10; /* 尖顶在门厅地板下面一点，从码头往下能隐约看见 */ m.box(fx - 0.6, y - s, z0, fx + 3.2, y + s, z0 + hT, S, M.stone);
        for (let z = z0 + 4; z < z0 + hT; z += 4) m.box(fx - 0.7, y - s - 0.1, z, fx + 3.3, y + s + 0.1, z + 0.3, S2, M.stone);
        gothWin(m, fx + 3.21, y, z0 + hT - 4.2, 0.8, 2.4); gothWin(m, fx + 3.21, y, z0 + 6, 0.6, 2);
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.cyl(fx + 1.3 + dx * 1.6, y + dy * 1.6, z0 + hT, z0 + hT + 2.2, 0.28, 0.05, S2, M.stone, 6); // 小尖塔
        const cx = fx + 1.3, sp = z0 + hT + 8.5; m.tri([cx - s, y - s, z0 + hT], [cx + s, y - s, z0 + hT], [cx, y, sp], '#52708a', M.tile); m.tri([cx + s, y - s, z0 + hT], [cx + s, y + s, z0 + hT], [cx, y, sp], '#46647e', M.tile); m.tri([cx + s, y + s, z0 + hT], [cx - s, y + s, z0 + hT], [cx, y, sp], '#52708a', M.tile); m.tri([cx - s, y + s, z0 + hT], [cx - s, y - s, z0 + hT], [cx, y, sp], '#46647e', M.tile);
        m.box(cx - 0.05, y - 0.05, sp, cx + 0.05, y + 0.05, sp + 1.2, '#8a7a4a', M.metal); m.box(cx - 0.05, y - 0.4, sp + 0.7, cx + 0.05, y + 0.4, sp + 0.82, '#8a7a4a', M.metal); }
      // 两塔之间：玫瑰窗 + 尖拱大门 + 山墙
      m.box(fx - 0.2, v - Wn, z0, fx + 0.6, v + Wn, z0 + hN + 1.5, S, M.stone);
      m.disc(fx + 0.62, v, z0 + 8, 1.6, 'u', '#c8a64a', M.glow, 16); m.disc(fx + 0.64, v, z0 + 8, 1.15, 'u', GL, 0, 16); for (let k = 0; k < 8; k++) { const a = k * 0.785; m.box(fx + 0.64, v + Math.cos(a) * 0.6 - 0.05, z0 + 8 + Math.sin(a) * 0.6 - 0.05, fx + 0.7, v + Math.cos(a) * 0.6 + 0.05, z0 + 8 + Math.sin(a) * 0.6 + 0.05, '#d8ceb6', 0); }
      m.box(fx + 0.58, v - 1.1, z0, fx + 0.66, v + 1.1, z0 + 3.4, '#2a2620', 0); m.tri([fx + 0.67, v - 1.1, z0 + 3.4], [fx + 0.67, v + 1.1, z0 + 3.4], [fx + 0.67, v, z0 + 5], '#2a2620', 0);
      for (let k = 0; k < 4; k++) m.box(fx + 0.6 + k * 0.6, v - 2.2 + k * 0.1, z0 - 0.0, fx + 1.2 + k * 0.6, v + 2.2 - k * 0.1, z0 + 0.6 - k * 0.15, '#cdc3ac', M.stone);
      m.blob(u, v + 1, z0 + hN + 3.2, 1.6, 0.4, MOSS, M.grass, 2); m.blob(u - 4, v - 2, z0 + hA + 1.2, 1, 0.3, MOSS, M.grass, 4); }, z0);
  }
  // 市政厅：底层一排拱廊，上层大窗，陡屋顶上一座小钟楼（正对集市广场）
  function townHall(m) {
    const [u, v] = lm('hall'), t = LM2.hall[0] * D;
    rot(m, u, v, t + Math.PI, () => { const d = 6, w = 10, a = u - d / 2, c = u + d / 2, b = v - w / 2, e = v + w / 2, z0 = FLOOR, S = '#d2c6ac';
      m.box(a, b, z0, c - 1.6, e, z0 + 4.2, S, M.stone); m.box(c - 0.3, b, z0 + 3.8, c, e, z0 + 4.4, S, M.stone);
      for (let k = 0; k < 5; k++) { const y = b + 1 + k * (w - 2) / 4; m.box(c - 0.4, y - 0.35, z0, c, y + 0.35, z0 + 3.8, S, M.stone); if (k < 4) { const ym = y + (w - 2) / 8; for (let j = 0; j <= 4; j++) { const a2 = (j / 4) * Math.PI, yy = ym - Math.cos(a2) * ((w - 2) / 8 - 0.35), zz = z0 + 2.6 + Math.sin(a2) * 0.9; m.box(c - 0.4, yy - 0.15, zz, c, yy + 0.15, zz + 0.3, '#c6baa0', M.stone); } } }
      m.box(a, b, z0 + 4.4, c, e, z0 + 9, '#e2d6bc', M.plaster); for (let k = 0; k < 4; k++) { const y = b + 1.4 + k * (w - 2.8) / 3; gothWin(m, c + 0.01, y, z0 + 5.4, 0.9, 2.2); }
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
  // 领主城堡：方形主楼、四角圆塔（锥顶）、城垛
  function keep(m) {
    const [u, v] = lm('keep'), z = FLOOR, s = 4.2, hK = 12, S = '#c8bea6';
    m.box(u - s, v - s, z, u + s, v + s, z + hK, S, M.stone);
    for (let k = -3; k <= 3; k++) for (const [ax, sd] of [['u', -1], ['u', 1], ['v', -1], ['v', 1]]) { if (k % 2) continue; const p = k * s / 3.5; if (ax === 'u') m.box(u + sd * s - 0.4, v + p - 0.45, z + hK, u + sd * s + 0.4, v + p + 0.45, z + hK + 1, S, M.stone); else m.box(u + p - 0.45, v + sd * s - 0.4, z + hK, u + p + 0.45, v + sd * s + 0.4, z + hK + 1, S, M.stone); }
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = u + dx * s, y = v + dy * s; m.cyl(x, y, z, z + hK + 2, 1.6, 1.5, '#cfc5ae', M.stone, 12); m.cyl(x, y, z + hK + 2, z + hK + 5, 1.9, 0.1, '#46647e', M.tile, 12); gothWin(m, x + dx * 1.5, y, z + hK - 2, 0.4, 1.2, dx); }
    for (let f = 0; f < 3; f++) for (const s2 of [-1, 1]) { m.box(u + s - 0.02, v + s2 * 1.6 - 0.3, z + 4 + f * 4, u + s + 0.05, v + s2 * 1.6 + 0.3, z + 5.4 + f * 4, GL, 0); }
    archDoor(m, u + s, v, z, 1.8, 3);
    m.blob(u, v, z + hK + 0.3, 2.4, 0.4, MOSS, M.grass, 9);
  }
  // 钟塔：方塔从城里一直伸出水面，塔顶四面钟、尖顶（城里最高的东西之一，露在水面上像个灯标）
  function clockTower(m) {
    const [u, v] = lm('clock'), s = 2.4, top = 5.6, S = '#d0c6b0';
    m.box(u - s - 0.4, v - s - 0.4, FLOOR, u + s + 0.4, v + s + 0.4, FLOOR + 1.4, '#b8ae98', M.stone);
    m.box(u - s, v - s, FLOOR, u + s, v + s, top, S, M.stone);
    for (let z = FLOOR + 6; z < top - 2; z += 6) m.box(u - s - 0.15, v - s - 0.15, z, u + s + 0.15, v + s + 0.15, z + 0.4, '#bdb39d', M.stone);
    for (let z = FLOOR + 3; z < top - 4; z += 6) for (const [dx, dy] of [[1, 0], [0, 1]]) gothWin(m, u + dx * (s + 0.01), v + dy * (s + 0.01), z, 0.5, 1.6, 1);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const fx = u + dx * (s + 0.05), fy = v + dy * (s + 0.05); m.disc(fx, fy, top - 2.2, 1.2, dx ? 'u' : 'v', '#f2ead6', 0, 14); m.box(fx - (dy ? 0.05 : 0.04), fy - (dx ? 0.05 : 0.04), top - 2.2, fx + (dy ? 0.05 : 0.04), fy + (dx ? 0.05 : 0.04), top - 1.3, '#2a2030', 0); }
    m.box(u - s - 0.3, v - s - 0.3, top, u + s + 0.3, v + s + 0.3, top + 0.4, '#b0a690', M.stone);
    for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(u + x * (s - 0.3) - 0.3, v + y * (s - 0.3) - 0.3, top + 0.4, u + x * (s - 0.3) + 0.3, v + y * (s - 0.3) + 0.3, top + 3, S, M.stone);
    m.cyl(u, v, top + 0.6, top + 2.3, 0.85, 0.45, '#8a7a4a', M.metal, 10);
    const sp = top + 7.5; m.tri([u - s, v - s, top + 3], [u + s, v - s, top + 3], [u, v, sp], '#52708a', M.tile); m.tri([u + s, v - s, top + 3], [u + s, v + s, top + 3], [u, v, sp], '#46647e', M.tile); m.tri([u + s, v + s, top + 3], [u - s, v + s, top + 3], [u, v, sp], '#52708a', M.tile); m.tri([u - s, v + s, top + 3], [u - s, v - s, top + 3], [u, v, sp], '#46647e', M.tile);
    m.blob(u - 1, v + 1.1, top + 3.2, 1, 0.35, MOSS, M.grass, 3);
  }
  // 天文台：圆塔，顶上一个玻璃穹顶（穹顶露出水面，以后当温室）
  function observatory(m) {
    const [u, v] = lm('obs'), r = 5.5, top = -0.4;
    m.cyl(u, v, FLOOR, top, r, r, '#d4cab4', M.stone, 22, false);
    for (let z = FLOOR + 5; z < top - 1; z += 5) m.cyl(u, v, z, z + 0.5, r + 0.2, r + 0.2, '#bfb59f', M.stone, 22, false);
    for (let k = 0; k < 6; k++) { const a = k * 1.05, zz = FLOOR + 5.5 + (k % 3) * 5.5; rot(m, u + Math.cos(a) * r, v + Math.sin(a) * r, a, () => gothWin(m, u + Math.cos(a) * r + 0.01, v + Math.sin(a) * r, zz, 0.7, 2), 0); }
    m.cyl(u, v, top, top + 0.6, r + 0.35, r + 0.35, '#b8ae98', M.stone, 22);
    // 玻璃穹顶：自己一片片拼（朝门厅那边留一个门洞，人从门厅走进温室）
    const door = Math.atan2(40.4 - v, 24 - u);
    for (let k = 0; k < 20; k++) for (let j = 0; j < 6; j++) { const a0 = (k / 20) * 6.2832, a1 = ((k + 1) / 20) * 6.2832, e0 = (j / 6) * 1.5708, e1 = ((j + 1) / 6) * 1.5708, am = (a0 + a1) / 2;
      if (j < 3 && Math.abs(Math.atan2(Math.sin(am - door), Math.cos(am - door))) < 0.36) continue;
      const Q = (a, e) => [u + Math.cos(a) * Math.cos(e) * r, v + Math.sin(a) * Math.cos(e) * r, top + 0.6 + Math.sin(e) * r * 1.6]; m.quad(Q(a0, e0), Q(a1, e0), Q(a1, e1), Q(a0, e1), '#c8eef6', M.glass); }
    for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.2832; for (let j = 0; j < 5; j++) { if (j < 3 && Math.abs(Math.atan2(Math.sin(a - door), Math.cos(a - door))) < 0.4) continue; const e0 = (j / 5) * 1.5708, e1 = ((j + 1) / 5) * 1.5708; m.box(u + Math.cos(a) * Math.cos(e0) * r - 0.06, v + Math.sin(a) * Math.cos(e0) * r - 0.06, top + 0.6 + Math.sin(e0) * r * 1.6, u + Math.cos(a) * Math.cos(e1) * r + 0.06, v + Math.sin(a) * Math.cos(e1) * r + 0.06, top + 0.6 + Math.sin(e1) * r * 1.6, '#8a7a4a', M.metal); } }
  }
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
    for (let k = 0; k < 8; k++) { const t = (k / 8) * 6.2832 + 0.2; if (Math.abs(Math.atan2(Math.sin(t - gate), Math.cos(t - gate))) < 0.35) continue; const [u, v] = P(t, Rw(t), 0), hT = -3 + H(k, 44) * 2 - (H(k, 45) < 0.25 ? 7 : 0);
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
    const N = 96; if (PKF != null) m.pk(PKF);
    for (let k = 0; k < N; k++) { const t0 = (k / N) * 6.2832, t1 = ((k + 1) / N) * 6.2832; m.tri([CEN[0], CEN[1], WL], P(t0, basR(t0) + 0.3, WL), P(t1, basR(t1) + 0.3, WL), o.snow ? '#7fb8c8' : '#3f9aa8', M.lake); }
    m.pk(0);
  }
  // 出水口：东边城墙的缺口，水流过岩顶，挂成瀑布从峭壁落下去
  function outflow(m, o) {
    const t = -8 * D, ax = Math.cos(t), ay = Math.sin(t), [u0, v0] = P(t, basR(t) - 0.5, 0), [u1, v1] = P(t, rimR(t) + 0.6, 0), nx = -ay * 1.2, ny = ax * 1.2;
    m.quad([u0 + nx, v0 + ny, WL + 0.05], [u0 - nx, v0 - ny, WL + 0.05], [u1 - nx, v1 - ny, 0.2], [u1 + nx, v1 + ny, 0.2], '#5ab4d8', M.water);
    if (!o.snow) { m.quad([u1 + nx, v1 + ny, 0.2], [u1 - nx, v1 - ny, 0.2], [u1 - nx + ax * 1.2, v1 - ny + ay * 1.2, -30], [u1 + nx + ax * 1.2, v1 + ny + ay * 1.2, -30], '#7ac8e8', M.water);
      for (let k = 0; k < 8; k++) m.ball(u1 + ax * 1.4 + (H(k, 1) - 0.5) * 2, v1 + ay * 1.4 + (H(k, 2) - 0.5) * 2, -30 + H(k, 3) * 2, 0.7 + H(k, 4) * 0.6, 0.5, '#f4f8fc', 0, 3, 6); }
  }

  function build(m, o, opt = {}) {
    rock(m, o); floatStone(m, o); basin(m, o); houses(m); cathedral(m); townHall(m); market(m); keep(m); clockTower(m); observatory(m); bridge(m); cityWall(m); lamps(m); weeds(m, o); outflow(m, o); water(m, o, opt.pkFish);
  }
  PP.CITY = { build, CEN, WL, FLOOR, RB, RI, rimR, basR, inBasin, polar, LM: LM2, lm, UP, groundZ, CRACK, STONE, TRUNK_R, streetAt, rootLine };
})();
