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
  const LM = { clock: [-40, 18], temple: [180, 16], obs: [135, 21], bridge: [110, 15], gate: [90, 24.2] };
  const lmPos = (k) => P(LM[k][0] * D, LM[k][1], FLOOR);

  /* ---------- 岛的岩体：外沿一圈长着苔藓的岩顶，峭壁往下收成尖 ---------- */
  function rock(m, o) {
    const N = 96, snow = o.snow, top = snow ? '#eef4fa' : '#6f8a52', tm = snow ? M.snow : M.grass;
    const RINGS = [[1, 0.6], [0.995, -6], [0.97, -14], [0.9, -24], [0.76, -32], [0.56, -40], [0.34, -46], [0.14, -51]];
    for (let k = 0; k < N; k++) { const t0 = (k / N) * 6.2832, t1 = ((k + 1) / N) * 6.2832, j0 = H(k, 3) * 0.8, j1 = H(k + 1, 3) * 0.8;
      // 岩顶：盆地边到外沿，长满苔藓和草
      m.quad(P(t0, basR(t0) + 0.2, 0.2 + j0 * 0.5), P(t1, basR(t1) + 0.2, 0.2 + j1 * 0.5), P(t1, rimR(t1), RINGS[0][1] + j1), P(t0, rimR(t0), RINGS[0][1] + j0), top, tm);
      for (let i = 0; i + 1 < RINGS.length; i++) { const [a, za] = RINGS[i], [b, zb] = RINGS[i + 1], ja = i === 0 ? j0 : 0, jb = i === 0 ? j1 : 0;
        m.quad(P(t0, rimR(t0) * a, za + ja), P(t1, rimR(t1) * a, za + jb), P(t1, rimR(t1) * b, zb), P(t0, rimR(t0) * b, zb), ['#8a8274', '#7e776a', '#958c7c', '#857d70'][(k + i) % 4], M.stone); }
      m.tri(P(t0, rimR(t0) * 0.14, -51), P(t1, rimR(t1) * 0.14, -51), [CEN[0], CEN[1], -55], '#6f685e', M.stone); }
    // 岩顶上的石块和灌木丛
    for (let k = 0; k < 40; k++) { const t = (k / 40) * 6.2832 + H(k, 1) * 0.1, r = (basR(t) + rimR(t)) / 2 + (H(k, 2) - 0.5) * 1.5, [u, v] = P(t, r, 0); if (H(k, 4) < 0.5) m.blob(u, v, 0.4, 0.6 + H(k, 5) * 0.8, 0.5, snow ? '#e8eef4' : '#9a9282', M.stone, k); else if (!snow) m.foliage(u, v, 1.1, 0.9 + H(k, 6) * 0.6, 0.7, ['#4f8a44', '#5e9a4c', '#6aa858'], 16, k, 0.6); }
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

  /* ---------- 盆地：内壁（古城外面的崖）+ 古城的地面（石板：广场浅、街道中、街区深） ---------- */
  const streetAt = (u, v) => { const [t, r] = polar(u, v); if (r < 11) return 'plaza'; if (Math.abs(r - 19) < 1.6) return 'street'; for (let k = 0; k < 6; k++) { const a = k * 60 * D, dd = Math.abs(Math.sin(t - a)) * r; if (Math.cos(t - a) > 0 && dd < 1.6) return 'street'; } return 'block'; };
  function basin(m, o) {
    const N = 96;
    for (let k = 0; k < N; k++) { const t0 = (k / N) * 6.2832, t1 = ((k + 1) / N) * 6.2832;
      m.quad(P(t0, basR(t0) + 0.2, 0.2), P(t1, basR(t1) + 0.2, 0.2), P(t1, basR(t1) * 0.97, -6), P(t0, basR(t0) * 0.97, -6), k % 2 ? '#5f7a52' : '#6a8458', M.grass);
      m.quad(P(t0, basR(t0) * 0.97, -6), P(t1, basR(t1) * 0.97, -6), P(t1, basR(t1) * 0.94, FLOOR - 0.5), P(t0, basR(t0) * 0.94, FLOOR - 0.5), ['#7a7a70', '#727468', '#80806f'][k % 3], M.stone); }
    // 地面：2 格一块的石板；树干那儿空着（后面树根会盖住），裂口那儿是洞
    const [cu, cv] = P(CRACK.t, CRACK.r, 0);
    for (let x = -24; x < 24; x += 2) for (let y = -24; y < 24; y += 2) { const u = CEN[0] + x + 1, v = CEN[1] + y + 1; if (!inBasin(u, v, 1.6)) continue; const [, r] = polar(u, v); if (r < TRUNK_R - 1.2) continue; if (Math.hypot(u - cu, v - cv) < 2.4) continue;
      const s = streetAt(u, v), col = s === 'plaza' ? (H(x, y) < 0.5 ? '#c9c0ac' : '#bfb6a2') : s === 'street' ? (H(x, y) < 0.5 ? '#aaa290' : '#a09886') : (H(x, y) < 0.5 ? '#7f7a68' : '#77735f'), up = s === 'block' ? 0 : H(y, x) * 0.12;
      m.box(u - 0.98, v - 0.98, FLOOR - 0.5, u + 0.98, v + 0.98, FLOOR + up, col, M.stone); }
    // 广场：一圈台阶状的石沿 + 几块被树根拱翘起来的石板
    for (let k = 0; k < 40; k++) { const t = (k / 40) * 6.2832, [u, v] = P(t, 11.2, 0); m.box(u - 0.6, v - 0.6, FLOOR, u + 0.6, v + 0.6, FLOOR + 0.45, '#d6ccb6', M.stone); }
    for (let k = 0; k < 8; k++) { const t = k * 0.8 + 0.2, [u, v] = P(t, 9.8 + H(k, 2) * 0.8, 0); m.box(u - 0.9, v - 0.6, FLOOR, u + 0.9, v + 0.6, FLOOR + 0.6 + H(k, 3) * 0.6, '#c4bba6', M.stone); }
  }

  /* ---------- 城里的房子 ---------- */
  const W = () => PP.isleModels && PP.isleModels.parts.warp;
  const rot = (m, u, v, yaw, fn) => { const w = W(); if (w) w(m, [u, v, FLOOR], yaw, 0, 0, fn); else fn(); };
  const WALLS = ['#d8cdb4', '#cfc4aa', '#c9bea6', '#d2c6ae', '#c4b8a0'], ROOFC = ['#6f8a8a', '#7a8a7a', '#8a7a6a', '#6a7a86'], MOSS = '#5f8a52', WIN = '#2e3f48';
  // 一栋民居：w×d 的石墙房子，2～3 层，拱门、深色窗洞、坡屋顶（塌了的就没顶、墙头参差）
  function house(m, u, v, yaw, w, d, h, k, broken) {
    rot(m, u, v, yaw, () => { const z = FLOOR, a = u - d / 2, b = v - w / 2, c = u + d / 2, e = v + w / 2, wc = WALLS[k % WALLS.length];
      if (!broken) m.box(a, b, z, c, e, z + h, wc, M.stone);
      else { // 塌了一半：四面墙，墙头一段高一段低，里面是空的
        const T = 0.5, hh = (s) => h * (0.45 + H(k, s) * 0.55);
        m.box(a, b, z, c, b + T, z + hh(1), wc, M.stone); m.box(a, e - T, z, c, e, z + hh(2), wc, M.stone); m.box(a, b + T, z, a + T, e - T, z + hh(3), wc, M.stone); m.box(c - T, b + T, z, c, e - T, z + hh(4) * 0.6, wc, M.stone);
        m.blob(u + 0.4, v - 0.3, z + 0.3, 1.2, 0.6, '#9a927f', M.stone, k); }
      // 正面（朝街的那面 = c 那面）：拱门、每层两扇窗
      m.box(c - 0.02, v - 0.7, z, c + 0.06, v + 0.7, z + 2.6, WIN, 0); m.box(c - 0.02, v - 0.45, z + 2.6, c + 0.06, v + 0.45, z + 3.0, WIN, 0);
      for (let f = 0; f * 3.6 + 3.8 < h; f++) for (const s of [-1, 1]) { const zz = z + 3.8 + f * 3.6; if (zz > z + h - 1.2) continue; m.box(c - 0.02, v + s * w * 0.28 - 0.4, zz, c + 0.06, v + s * w * 0.28 + 0.4, zz + 1.4, WIN, 0); m.box(c, v + s * w * 0.28 - 0.55, zz - 0.2, c + 0.2, v + s * w * 0.28 + 0.55, zz, '#e2d8c2', M.stone); }
      for (let f = 0; f * 3.6 + 3.8 < h - 1; f++) { const zz = z + 3.8 + f * 3.6; m.box(a - 0.02, v - 0.4, zz, a + 0.02, v + 0.4, zz + 1.4, WIN, 0); }
      if (!broken) { m.gable(a - 0.3, b - 0.3, c + 0.3, e + 0.3, z + h, w * 0.5, 'u', ROOFC[k % ROOFC.length], M.tile, 0.3, wc, M.stone);
        for (let j = 0; j < 3; j++) m.blob(a + 0.8 + H(k, j + 20) * (d - 1.6), b + 1 + H(j, k) * (w - 2), z + h + w * 0.22, 0.8, 0.3, MOSS, M.grass, k * 3 + j); }
      m.box(a - 0.15, b - 0.15, z, c + 0.15, e + 0.15, z + 0.6, '#a69e8a', M.stone); });
  }
  // 两圈街区里的民居：每个扇区（两条放射街之间）里圈 2 栋、外圈 2 栋，朝街摆
  function houses(m) {
    let k = 0;
    for (let s = 0; s < 6; s++) for (const [r, n] of [[14.4, 2], [22.2, 2]]) for (let i = 0; i < n; i++) {
      const t = (s * 60 + 18 + i * 24) * D, [u, v] = P(t, r, 0), yaw = t + Math.PI; // 正面朝着岛心那边的街
      if (Object.keys(LM).some((key) => { const L = lmPos(key); return Math.hypot(L[0] - u, L[1] - v) < 6.2; })) { k++; continue; }
      const w = 4.2 + H(k, 31) * 1.6, d = 4.4 + H(k, 32) * 1.4, h = 7 + Math.floor(H(k, 33) * 3) * 3.4;
      house(m, u, v, yaw, w, d, h, k, H(k, 34) < 0.3); k++; }
  }
  // 钟塔：方塔从城里一直伸出水面，塔顶四面钟、尖顶、一口钟（城里最高的东西，露在水面上像个灯标）
  function clockTower(m) {
    const [u, v] = lmPos('clock'), s = 2.6, top = 6.6;
    m.box(u - s - 0.4, v - s - 0.4, FLOOR, u + s + 0.4, v + s + 0.4, FLOOR + 1.2, '#b8ae98', M.stone);
    m.box(u - s, v - s, FLOOR, u + s, v + s, top, '#d0c6b0', M.stone);
    for (let z = FLOOR + 6; z < top - 2; z += 6) m.box(u - s - 0.15, v - s - 0.15, z, u + s + 0.15, v + s + 0.15, z + 0.5, '#bdb39d', M.stone);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const fx = u + dx * (s + 0.05), fy = v + dy * (s + 0.05); m.disc(fx, fy, top - 2.4, 1.3, dx ? 'u' : 'v', '#f2ead6', 0, 14); m.box(fx - (dy ? 0.06 : 0.04), fy - (dx ? 0.06 : 0.04), top - 2.4, fx + (dy ? 0.06 : 0.04), fy + (dx ? 0.06 : 0.04), top - 1.4, '#2a2030', 0); }
    m.box(u - s - 0.3, v - s - 0.3, top, u + s + 0.3, v + s + 0.3, top + 0.4, '#b0a690', M.stone);
    for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(u + x * (s - 0.3) - 0.3, v + y * (s - 0.3) - 0.3, top + 0.4, u + x * (s - 0.3) + 0.3, v + y * (s - 0.3) + 0.3, top + 3.2, '#d0c6b0', M.stone);
    m.cyl(u, v, top + 0.6, top + 2.4, 0.9, 0.5, '#8a7a4a', M.metal, 10);
    m.tri([u - s, v - s, top + 3.2], [u + s, v - s, top + 3.2], [u, v, top + 7], '#5f7a78', M.tile); m.tri([u + s, v - s, top + 3.2], [u + s, v + s, top + 3.2], [u, v, top + 7], '#57706e', M.tile); m.tri([u + s, v + s, top + 3.2], [u - s, v + s, top + 3.2], [u, v, top + 7], '#5f7a78', M.tile); m.tri([u - s, v + s, top + 3.2], [u - s, v - s, top + 3.2], [u, v, top + 7], '#57706e', M.tile);
    m.blob(u - 1, v + 1.2, top + 3.4, 1.1, 0.4, MOSS, M.grass, 3);
  }
  // 神殿：台基 + 两排柱子 + 横梁 + 三角山墙（柱子断了几根）
  function temple(m) {
    const [u, v] = lmPos('temple'), L = 6, Wd = 4;
    rot(m, u, v, 0, () => { m.box(u - L, v - Wd, FLOOR, u + L, v + Wd, FLOOR + 1.6, '#d2c8b2', M.stone); for (let k = 0; k < 3; k++) m.box(u + L + k * 0.6, v - 2.4, FLOOR, u + L + 0.6 + k * 0.6, v + 2.4, FLOOR + 1.6 - k * 0.5, '#c8beaa', M.stone);
      const top = FLOOR + 11;
      for (const y of [v - Wd + 0.8, v + Wd - 0.8]) for (let i = 0; i < 6; i++) { const x = u - L + 0.9 + i * ((2 * L - 1.8) / 5), broken = H(i, y) < 0.25, h = broken ? 3 + H(i, 7) * 4 : top - FLOOR - 1.6; m.cyl(x, y, FLOOR + 1.6, FLOOR + 1.6 + h, 0.5, 0.45, '#e0d6c0', M.stone, 10); if (!broken) m.box(x - 0.65, y - 0.65, top - 0.4, x + 0.65, y + 0.65, top, '#d2c8b2', M.stone); }
      m.box(u - L, v - Wd, top, u + L, v + Wd, top + 1.2, '#d6ccb6', M.stone);
      m.gable(u - L, v - Wd, u + L, v + Wd, top + 1.2, 2.6, 'u', '#c8beaa', M.stone, 0.2, '#d6ccb6', M.stone);
      m.blob(u - 2, v, top + 2.6, 1.4, 0.4, MOSS, M.grass, 5); m.blob(u + 3, v + 1, top + 1.6, 1, 0.3, MOSS, M.grass, 6); });
  }
  // 天文台：圆塔，顶上一个玻璃穹顶（穹顶露出水面，以后当温室）
  function observatory(m) {
    const [u, v] = lmPos('obs'), r = 4.6, top = -1.4;
    m.cyl(u, v, FLOOR, top, r, r, '#d4cab4', M.stone, 20, false);
    for (let z = FLOOR + 5; z < top - 1; z += 5) m.cyl(u, v, z, z + 0.5, r + 0.2, r + 0.2, '#bfb59f', M.stone, 20, false);
    for (let k = 0; k < 6; k++) { const a = k * 1.05, zz = FLOOR + 6 + (k % 3) * 5.5; m.box(u + Math.cos(a) * (r - 0.05) - 0.4, v + Math.sin(a) * (r - 0.05) - 0.4, zz, u + Math.cos(a) * (r - 0.05) + 0.4, v + Math.sin(a) * (r - 0.05) + 0.4, zz + 2, WIN, 0); }
    m.cyl(u, v, top, top + 0.6, r + 0.35, r + 0.35, '#b8ae98', M.stone, 20);
    m.ball(u, v, top + 0.6, r, r * 0.95, '#c8eef6', M.glass, 6, 18, 0, 3, true);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.2832; for (let j = 0; j < 5; j++) { const e0 = (j / 5) * 1.5708, e1 = ((j + 1) / 5) * 1.5708; m.box(u + Math.cos(a) * Math.cos(e0) * r - 0.06, v + Math.sin(a) * Math.cos(e0) * r - 0.06, top + 0.6 + Math.sin(e0) * r * 0.95, u + Math.cos(a) * Math.cos(e1) * r + 0.06, v + Math.sin(a) * Math.cos(e1) * r + 0.06, top + 0.6 + Math.sin(e1) * r * 0.95, '#8a7a4a', M.metal); } }
  }
  // 拱桥：跨过一条旧水渠（渠是地面下陷的一条），三个桥拱
  function bridge(m) {
    const [u, v] = lmPos('bridge'), t = LM.bridge[0] * D, ax = [Math.cos(t + Math.PI / 2), Math.sin(t + Math.PI / 2)], L = 7;
    rot(m, u, v, t, () => { m.box(u - 1.6, v - 9, FLOOR - 1.4, u + 1.6, v + 9, FLOOR + 0.02, '#4a5a5e', M.stone);
      for (let i = -1; i <= 1; i++) { const cv = v + i * 3; for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI, y = cv - Math.cos(a) * 1.4, z = FLOOR + 2.4 + Math.sin(a) * 1.4; m.box(u - 2.2, y - 0.35, z, u + 2.2, y + 0.35, z + 0.6, '#cfc5ae', M.stone); } m.box(u - 2.2, cv - 1.6, FLOOR, u + 2.2, cv - 1.3, FLOOR + 2.6, '#c6bca6', M.stone); }
      m.box(u - 2.2, v - 4.9, FLOOR + 4.2, u + 2.2, v + 4.9, FLOOR + 4.7, '#d4cab4', M.stone);
      for (const x of [u - 2.1, u + 1.9]) m.box(x, v - 4.9, FLOOR + 4.7, x + 0.2, v + 4.9, FLOOR + 5.6, '#cfc5ae', M.stone); });
    void ax; void L;
  }
  // 城墙：沿盆地边一圈，墙顶有垛口；有的段塌矮了，有的刚好露出水面
  function cityWall(m) {
    const N = 72;
    for (let k = 0; k < N; k++) { const t0 = (k / N) * 6.2832, t1 = ((k + 1) / N) * 6.2832, r0 = basR(t0) * 0.93, r1 = basR(t1) * 0.93, top = -2.6 + Math.sin(k * 0.7) * 1.6 + H(k, 40) * 2.6 - (H(k, 41) < 0.15 ? 9 : 0);
      if (Math.abs(Math.atan2(Math.sin(t0 - LM.gate[0] * D), Math.cos(t0 - LM.gate[0] * D))) < 0.07) continue; // 城门那儿空着
      const A = P(t0, r0, 0), B = P(t1, r1, 0), nx = Math.cos((t0 + t1) / 2) * 0.7, ny = Math.sin((t0 + t1) / 2) * 0.7;
      m.quad([A[0] - nx, A[1] - ny, top], [B[0] - nx, B[1] - ny, top], [B[0] - nx, B[1] - ny, FLOOR], [A[0] - nx, A[1] - ny, FLOOR], k % 2 ? '#c8bea8' : '#bfb59f', M.stone);
      m.quad([A[0] - nx, A[1] - ny, top], [A[0] + nx, A[1] + ny, top], [B[0] + nx, B[1] + ny, top], [B[0] - nx, B[1] - ny, top], '#b4aa94', M.stone);
      if (k % 2 === 0 && top > FLOOR + 6) { const [cu, cv] = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; m.box(cu - 0.5, cv - 0.5, top, cu + 0.5, cv + 0.5, top + 1, '#c4baa4', M.stone); }
      if (H(k, 42) < 0.35) m.blob((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, top, 0.9, 0.3, MOSS, M.grass, k); }
    // 城门：两座方塔 + 拱
    const t = LM.gate[0] * D, [u, v] = P(t, basR(t) * 0.93, 0);
    for (const s of [-1, 1]) { const x = u + Math.cos(t + Math.PI / 2) * s * 3, y = v + Math.sin(t + Math.PI / 2) * s * 3; m.box(x - 1.4, y - 1.4, FLOOR, x + 1.4, y + 1.4, -1.8, '#d2c8b2', M.stone); m.box(x - 1.6, y - 1.6, -1.8, x + 1.6, y + 1.6, -1.4, '#c4baa4', M.stone); }
    for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI, off = -Math.cos(a) * 1.8, z = -9 + Math.sin(a) * 2.2, x = u + Math.cos(t + Math.PI / 2) * off, y = v + Math.sin(t + Math.PI / 2) * off; m.box(x - 0.5, y - 0.5, z, x + 0.5, y + 0.5, z + 0.7, '#d6ccb6', M.stone); }
  }
  // 水草：一丛丛从古城地面往上长，轻轻摆
  function weeds(m, o) {
    if (o.snow) return; const sw0 = m.sway; m.sway = 0.5;
    for (let i = 0; i < 70; i++) { const t = H(i, 50) * 6.2832, r = 10 + H(i, 51) * 14, [u, v] = P(t, r, 0); if (!inBasin(u, v, 2) || streetAt(u, v) === 'street') continue; const h = 3 + H(i, 52) * 8;
      let px = u, py = v, pz = FLOOR; for (let k = 0; k < 5; k++) { const nx = u + Math.sin(k * 0.9 + i) * 0.35, ny = v + Math.cos(k * 0.7 + i) * 0.3, nz = FLOOR + h * (k + 1) / 5; m.quad([px - 0.14, py, pz], [px + 0.14, py, pz], [nx + 0.1, ny, nz], [nx - 0.1, ny, nz], k % 2 ? '#3f7a4a' : '#4a8a52', M.leaf); px = nx; py = ny; pz = nz; } }
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
    rock(m, o); floatStone(m, o); basin(m, o); houses(m); clockTower(m); temple(m); observatory(m); bridge(m); cityWall(m); weeds(m, o); outflow(m, o); water(m, o, opt.pkFish);
  }
  PP.CITY = { build, CEN, WL, FLOOR, RB, RI, rimR, basR, inBasin, polar, LM, lmPos, CRACK, STONE, TRUNK_R, streetAt, rootLine };
})();
