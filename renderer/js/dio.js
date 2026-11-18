// 小场景（新）：每个地方是一块等距的 3D 微缩模型（像从地上切下来的一块），用小岛那套 WebGL 引擎渲染，
// 再做像素画处理：三档光照、物体之间描深色细边、顶边提亮、对齐调色板。接口和以前的 VSCENE 一样（build / anim / reset）。
// 世界坐标 (u, v, z)：u、v ∈ [0, D] 是地面格子，z 是高度（2.45 个 z ≈ 1 格那么高）。相机固定：屏幕 X = 2(u−v)，Y = u+v−z。
(function () {
  const PP = (window.PP = window.PP || {});
  const D = 48, CUBE = 2.45, SLAB = 15;
  const hexn = (h) => { const x = parseInt(h.slice(1), 16); return [(x >> 16) & 255, (x >> 8) & 255, x & 255]; };
  const mixh = (a, b, t) => { const A = hexn(a), B = hexn(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const shade = (c, k) => { const A = hexn(c); return '#' + A.map((v) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k))).toString(16).padStart(2, '0')).join(''); };
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const H2 = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const NZ = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, f = (t) => t * t * (3 - 2 * t), a = H2(xi, yi, s), b = H2(xi + 1, yi, s), c = H2(xi, yi + 1, s), d = H2(xi + 1, yi + 1, s); return a + (b - a) * f(xf) + (c - a) * f(yf) + (a - b - c + d) * f(xf) * f(yf); };

  // ---------- 一块地 ----------
  // 每格：h（地面高度 z）、top（顶面颜色）、tm（顶面材质）、cliff（侧面材质 / 颜色）、water（水面高度，null = 没水）、lock（宠物走的地方，不能长东西）
  class World {
    constructor(scene, env, meta) {
      this.scene = scene; this.env = env; this.meta = meta || {}; this.R = rng(scene.length * 977 + 13);
      const M = PP.g3.MAT; this.MAT = M;
      this.season = meta.noSeason ? 'summer' : env.season; this.snowy = !meta.noSnow && (this.season === 'winter' || meta.snowy);
      this.h = new Float32Array(D * D); this.top = new Array(D * D).fill(meta.ground || '#78b456'); this.tm = new Uint8Array(D * D).fill(meta.groundMat != null ? meta.groundMat : M.pgrass);
      this.side = new Array(D * D).fill(meta.cliff || '#8a7a6a'); this.sm = new Uint8Array(D * D).fill(meta.cliffMat != null ? meta.cliffMat : M.prock); this.lip = new Array(D * D).fill(null);
      this.water = new Float32Array(D * D).fill(NaN); this.wcol = meta.water || '#4aa7c4'; this.lock = new Uint8Array(D * D); this.busy = new Uint8Array(D * D);
      this.mesh = new PP.g3.Mesh(); this.dyn = []; this.homes = []; this.spotsW = {}; this.perches = []; this.lights = []; this.smokes = []; this.fires = []; this.fx = []; this.wspots = []; this.hots = []; this.glints = [];
    }
    i(u, v) { return v * D + u; }
    ok(u, v) { return u >= 0 && v >= 0 && u < D && v < D; }
    H(u, v) { u = Math.max(0, Math.min(D - 1, Math.floor(u))); v = Math.max(0, Math.min(D - 1, Math.floor(v))); return this.h[this.i(u, v)]; }
    // 地形：对每一格调用 f(u, v, 格子) 改它
    each(f) { for (let v = 0; v < D; v++) for (let u = 0; u < D; u++) f(u, v, this.i(u, v)); }
    // 一块形状（'r' 矩形 / 'e' 椭圆 / 'p' 多边形 / 'l' 折线刷子 [pts, 宽]）里的格子
    shape(sh, f) {
      const [k] = sh;
      this.each((u, v, i) => {
        const x = u + 0.5, y = v + 0.5; let inn = false;
        if (k === 'r') inn = x >= sh[1] && x <= sh[3] && y >= sh[2] && y <= sh[4];
        else if (k === 'e') { const n = sh[5] ? (NZ(x / 3, y / 3, 7) - 0.5) * sh[5] : 0; inn = ((x - sh[1]) / sh[3]) ** 2 + ((y - sh[2]) / sh[4]) ** 2 <= 1 + n; }
        else if (k === 'p') { const P = sh[1]; for (let a = 0, b = P.length - 1; a < P.length; b = a++) if ((P[a][1] > y) !== (P[b][1] > y) && x < ((P[b][0] - P[a][0]) * (y - P[a][1])) / (P[b][1] - P[a][1]) + P[a][0]) inn = !inn; }
        else if (k === 'l') { const P = sh[1], w = sh[2]; for (let j = 1; j < P.length; j++) { const [ax, ay] = P[j - 1], [bx, by] = P[j], dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))), d = Math.hypot(x - ax - dx * t, y - ay - dy * t); if (d <= w / 2 + (NZ(x / 2, y / 2, 9) - 0.5) * (sh[3] || 0)) { inn = true; break; } } }
        if (inn) f(u, v, i);
      });
    }
    raise(sh, z, o = {}) { this.shape(sh, (u, v, i) => { if (this.lock[i] && !o.force) return; this.h[i] = o.add ? this.h[i] + z : z; if (o.top) this.top[i] = o.top; if (o.tm != null) this.tm[i] = o.tm; if (o.side) this.side[i] = o.side; if (o.sm != null) this.sm[i] = o.sm; if (o.lip !== undefined) this.lip[i] = o.lip; }); }
    paint(sh, top, tm) { this.shape(sh, (u, v, i) => { this.top[i] = typeof top === 'function' ? top(u, v) : top; if (tm != null) this.tm[i] = tm; }); }
    pool(sh, o = {}) { const wz = o.z != null ? o.z : -1; this.shape(sh, (u, v, i) => { this.water[i] = wz; this.h[i] = Math.min(this.h[i], wz - (o.deep || 3)); this.top[i] = o.bed || '#7a8a6a'; this.tm[i] = this.MAT.pdirt; this.side[i] = o.bank || '#6a5a48'; this.sm[i] = this.MAT.pdirt; }); }
    // 宠物走的地方：屏幕上一块长方形，压平、不长东西
    walkArea() {
      const { X0, X1, Y0, Y1 } = this.walk;
      this.each((u, v, i) => { const xs = [2 * (u - v), 2 * (u + 1 - v), 2 * (u - v - 1), 2 * (u + 1 - v - 1)], ys = [u + v, u + v + 2]; if (Math.max(...xs) >= X0 - 2 && Math.min(...xs) <= X1 + 2 && ys[1] >= Y0 - 1 && ys[0] <= Y1 + 1) { this.lock[i] = 1; this.h[i] = 0; this.water[i] = NaN; } });
    }
    free(u, v, r = 1) { for (let y = Math.floor(v - r); y <= Math.ceil(v + r); y++) for (let x = Math.floor(u - r); x <= Math.ceil(u + r); x++) { if (!this.ok(x, y)) return false; const i = this.i(x, y); if (this.lock[i] || this.busy[i] || !isNaN(this.water[i])) return false; } return true; }
    claim(u, v, r = 1) { for (let y = Math.floor(v - r); y <= Math.ceil(v + r); y++) for (let x = Math.floor(u - r); x <= Math.ceil(u + r); x++) if (this.ok(x, y)) this.busy[this.i(x, y)] = 1; }
    flat(u, v, r = 1) { const z = this.H(u, v); for (let y = Math.floor(v - r); y <= Math.ceil(v + r); y++) for (let x = Math.floor(u - r); x <= Math.ceil(u + r); x++) if (!this.ok(x, y) || Math.abs(this.H(x, y) - z) > 0.01) return false; return true; }
    // 地面网格：每格一个顶面，比旁边高就补侧面（上面一小条是顶面的“唇”，下面是崖壁）；四周切开，露出一层层的土和石头
    terrain() {
      const m = this.mesh, MT = this.MAT, sn = this.snowy;
      const cut = this.meta.slab || ['#6a4e3a', '#8a6a4a', '#5a5a66', '#4a4856'];
      for (let v = 0; v < D; v++) for (let u = 0; u < D; u++) {
        const i = this.i(u, v), z = this.h[i]; let top = this.top[i], tm = this.tm[i];
        if (sn && (tm === MT.pgrass || tm === MT.pdirt || tm === MT.psand || tm === MT.prock || tm === MT.pstone && this.meta.snowStone !== false)) { top = '#eef2f8'; tm = MT.psnow; }
        m.quad([u, v, z], [u + 1, v, z], [u + 1, v + 1, z], [u, v + 1, z], top, tm);
        const lipc = this.lip[i] || (tm === MT.pgrass ? shade(top, 0.86) : tm === MT.psnow ? '#dfe6f0' : null);
        for (const [du, dv] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const nu = u + du, nv = v + dv, edge = !this.ok(nu, nv), nz = edge ? -SLAB : this.h[this.i(nu, nv)];
          if (nz >= z - 0.001) continue;
          const a = du === 1 ? [u + 1, v] : du === -1 ? [u, v + 1] : dv === 1 ? [u + 1, v + 1] : [u, v], b = du === 1 ? [u + 1, v + 1] : du === -1 ? [u, v] : dv === 1 ? [u, v + 1] : [u + 1, v];
          const Q = (z1, z0, col, mt) => { if (z1 - z0 > 0.001) m.quad([a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], col, mt); };
          if (edge && this.meta.float) { const lp = lipc ? 0.9 : 0; if (lp) Q(z, z - lp, lipc, MT.pgrass); Q(z - lp, z - 3, '#886040', MT.pdirt); continue; }
          if (edge) { // 切面：表土、土层、石层
            let zz = z; const lp = lipc ? Math.min(0.9, z - nz) : 0; if (lp) { Q(zz, zz - lp, lipc, tm === MT.psnow ? MT.psnow : MT.pgrass); zz -= lp; }
            const w = this.water[i]; if (!isNaN(w) && w > z) Q(w, z, shade(this.wcol, 1.1), MT.pwater);
            // 切面一层层：表土 → 黄土（夹着树根、小石子）→ 灰石 → 深色岩
            const L = [Math.min(zz, -4), -9, -13, nz]; Q(zz, Math.max(nz, L[0]), cut[0], MT.pdirt); Q(Math.max(nz, L[0]), Math.max(nz, L[1]), cut[1], MT.pdirt); Q(Math.max(nz, L[1]), Math.max(nz, L[2]), cut[2], MT.prock); Q(Math.max(nz, L[2]), nz, cut[3], MT.prock);
            const hs = PP.DIO.H2(u, v, 77); const fu = du === 1, cx = fu ? u + 1.02 : u + 0.5, cyv = fu ? v + 0.5 : v + 1.02;
            if (hs < 0.22) m.box(fu ? cx : cx - 0.35, fu ? cyv - 0.35 : cyv, -7 - hs * 12, fu ? cx + 0.12 : cx + 0.35, fu ? cyv + 0.35 : cyv + 0.12, -6 - hs * 12, '#a0968a', MT.prock);
            else if (hs > 0.9 && tm === MT.pgrass) m.quad(fu ? [cx, cyv - 0.1, z - 0.5] : [cx - 0.1, cyv, z - 0.5], fu ? [cx, cyv + 0.1, z - 0.5] : [cx + 0.1, cyv, z - 0.5], fu ? [cx, cyv + 0.4, z - 4 - hs * 3] : [cx + 0.4, cyv, z - 4 - hs * 3], fu ? [cx, cyv + 0.2, z - 4 - hs * 3] : [cx + 0.2, cyv, z - 4 - hs * 3], '#4c3024', 0);
          } else {
            const lp = lipc ? Math.min(0.9, z - nz) : 0; if (lp) Q(z, z - lp, lipc, tm === MT.psnow ? MT.psnow : MT.pgrass);
            Q(z - lp, nz, sn && this.sm[i] !== MT.pwater ? mixh(this.side[i], '#c8d0dc', 0.25) : this.side[i], this.sm[i]);
          }
        }
        const w = this.water[i];
        if (!isNaN(w)) {
          const ice = this.meta.frozen || (sn && !this.meta.noIce);
          m.quad([u, v, w], [u + 1, v, w], [u + 1, v + 1, w], [u, v + 1, w], ice ? '#cfe6f4' : this.wcol, ice ? MT.pice : MT.pwater);
        }
      }
    }
    // 浮空岛的底：一圈圈往下收的岩石（带凹凸），挂着树根
    underside(depth = 44) {
      const m = this.mesh, MT = this.MAT, rings = 7, seg = 28, c = D / 2;
      const ring = (k) => { const t = k / rings, z = -3 - depth * t * (0.8 + 0.2 * t), out = []; for (let j = 0; j <= seg; j++) { const a = (j / seg) * 6.283, n = 0.82 + PP.DIO.NZ(j * 0.7, k * 1.3, 4) * 0.36; const r0 = (1 - t) ** 1.25; const sq = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))); out.push([c + Math.cos(a) * c * Math.min(sq, k === 0 ? sq : 1.15) * r0 * n, c + Math.sin(a) * c * Math.min(sq, k === 0 ? sq : 1.15) * r0 * n, z]); } return out; };
      let prev = ring(0); for (let k = 1; k <= rings; k++) { const cur = ring(k); for (let j = 0; j < seg; j++) m.quad(prev[j], prev[j + 1], cur[j + 1], cur[j], k < 2 ? '#886040' : (j + k) % 3 ? '#74707e' : '#8a8076', k < 2 ? MT.pdirt : MT.prock); prev = cur; }
      for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r = c * 0.75; this.mesh.vine([[c + Math.cos(a) * r, c + Math.sin(a) * r, -4], [c + Math.cos(a) * r * 0.9, c + Math.sin(a) * r * 0.9, -14 - (i % 3) * 5]], { seed: i, cols: ['#4c3024', '#5e3e2c', '#46803c'], ls: 0.5 }); }
    }
    // ---------- 家、设施点、灯 ----------
    home(u, v, o = {}) { this.homes.push(Object.assign({ u, v }, o)); }
    light(u, v, z, o = {}) { this.lights.push(Object.assign({ u, v, z, r: 6 }, o)); }
  }

  // ---------- 渲染 + 像素化 ----------
  const PAL = ['#16141c', '#221e2a', '#2e2a38', '#3c3846', '#4c4858', '#5e5a6a', '#74707e', '#8c8896', '#a6a2ae', '#c2bec8', '#dcdae0', '#f2f0f2',
    // 绿（偏青的暗部 → 偏黄的亮部）
    '#14281f', '#1b3626', '#22452c', '#2c5632', '#386a37', '#46803c', '#579642', '#6aa848', '#80b84e', '#98c65a', '#b2d46a', '#cce082', '#e2ec9c',
    '#1e3a36', '#2a4e46', '#386456', '#4a7a66', '#5e8e74', '#76a284', // 灰青绿
    // 木 / 土
    '#2a1a16', '#3a241c', '#4c3024', '#5e3e2c', '#724e36', '#886040', '#9e744c', '#b4885a', '#c89e6c', '#dab682', '#e8cc9c', '#f4e2bc',
    // 石（暖灰、冷灰）
    '#4a4440', '#5e5650', '#746a62', '#8a8076', '#a0968a', '#b8ae9e', '#cec6b4',
    '#3e4652', '#525c68', '#68747e', '#808c94', '#9aa6aa', '#b6c0c0',
    // 水 / 天
    '#0e2234', '#143048', '#1a405c', '#215272', '#2a6688', '#367c9c', '#4892ae', '#5ea8bc', '#7cbec8', '#a0d4d6', '#c8e8e4', '#e8f6f2',
    // 屋顶红 / 粉 / 橙 / 黄
    '#3a1620', '#56202a', '#722a32', '#90363a', '#ac4a44', '#c66252', '#d87c64', '#e89a7e', '#f2b8a0', '#f8d4c4',
    '#6a2e1a', '#904222', '#b45a2a', '#d07a34', '#e49a42', '#f0bc56', '#f8d872', '#fcee9e',
    '#a83a5a', '#c8587a', '#e07a98', '#f0a2b8', '#f8c8d6',
    // 紫 / 蓝紫（魔法、夜、阴影）
    '#241a3a', '#342652', '#46346a', '#5a4484', '#70569c', '#8a6cb4', '#a688cc', '#c4a8e0', '#e0ccf2',
    '#2a3a6a', '#3a5090', '#4c68b0', '#6488cc', '#88aae0',
    // 青 / 发光
    '#1a5a56', '#22786e', '#2c9886', '#40b89c', '#64d4b4', '#9aeccc', '#d0fff0',
    // 雪 / 冰
    '#d8e2ee', '#e6eef6', '#f4f8fc', '#ffffff', '#b4cce0', '#94b4d0'];
  const PALRGB = PAL.map(hexn);
  const qcache = new Map();
  function nearest(r, g, b) { const key = (r << 16) | (g << 8) | b; let o = qcache.get(key); if (o !== undefined) return o; let best = 0, bd = 1e12; for (let i = 0; i < PALRGB.length; i++) { const [pr, pg, pb] = PALRGB[i], dr = r - pr, dg = g - pg, db = b - pb, rm = (r + pr) / 2, d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = i; } } o = PALRGB[best]; if (qcache.size > 60000) qcache.clear(); qcache.set(key, o); return o; }

  function render(W, cw, ch, cam, o) {
    const g3 = PP.g3; if (!g3.ok()) return null;
    const meshes = [g3.upload(W.mesh)];
    const base = { w: cw, h: ch, ox: cam.ox, oy: cam.oy, k: cam.k, sun: o.sun, sunCol: o.sunCol, sky: o.sky, gnd: o.gnd, time: 0, center: [D / 2, D / 2, 4], radius: 120, yaw: 0, pitch: [1, 1], camC: [D / 2, D / 2], skyTop: o.skyTop, skyBot: o.skyBot, cel: true, shadow: true };
    const grab = (opt) => { const c = g3.draw(meshes, Object.assign({}, base, opt)); const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const x = cv.getContext('2d'); x.drawImage(c, 0, 0); return x.getImageData(0, 0, cw, ch); };
    const day = grab({ lit: 0 }), night = o.night ? grab({ lit: 1 }) : null, info = grab({ mode: 2, shadow: false });
    meshes.forEach((m) => { const gl = null; }); // 网格留给 GC（WebGL 资源很小，场景切换才重建）
    return { day, night, info };
  }
  // 像素后期：描边（前面的东西在后面的东西上压一条暗线）、顶边提亮、对齐调色板
  function post(img, info, cw, ch, o) {
    const d = img.data, f = info.data, N = cw * ch, out = new Uint8ClampedArray(d);
    const dep = new Float32Array(N), mat = new Uint8Array(N), face = new Uint8Array(N), has = new Uint8Array(N);
    for (let i = 0; i < N; i++) { if (f[i * 4 + 3] < 128) continue; has[i] = 1; dep[i] = f[i * 4] / 255 + f[i * 4 + 1] / 65025; const b = f[i * 4 + 2]; mat[i] = b & 31; face[i] = b >> 5; }
    const TH = o.th || 0.0018, OL = o.ol || [28, 26, 40];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      // 这个像素是“后面的”（或空的），它旁边有明显更靠前的像素 → 在这里画描边
      let front = -1, best = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cw || yy >= ch) continue; const j = yy * cw + xx; if (!has[j]) continue; const diff = has[i] ? dep[i] - dep[j] : 1; if (diff > TH && diff > best) { best = diff; front = j; } }
      if (front >= 0) {
        if (!has[i]) { if (o.silhouette === false) continue; const r = d[front * 4], g = d[front * 4 + 1], b = d[front * 4 + 2]; out[i * 4] = r * 0.32 + OL[0] * 0.5; out[i * 4 + 1] = g * 0.32 + OL[1] * 0.5; out[i * 4 + 2] = b * 0.32 + OL[2] * 0.5; out[i * 4 + 3] = 255; }
        else { const r = d[front * 4], g = d[front * 4 + 1], b = d[front * 4 + 2]; out[i * 4] = r * 0.42 + OL[0] * 0.42; out[i * 4 + 1] = g * 0.42 + OL[1] * 0.42; out[i * 4 + 2] = b * 0.42 + OL[2] * 0.42; }
        continue;
      }
      if (!has[i]) continue;
      // 顶面的边（下面一格是侧面，而且是同一个面接着）→ 提亮一条
      if (face[i] === 0 && y + 1 < ch) { const j = i + cw; if (has[j] && face[j] !== 0 && Math.abs(dep[j] - dep[i]) < TH) { out[i * 4] = Math.min(255, d[i * 4] * 1.14 + 10); out[i * 4 + 1] = Math.min(255, d[i * 4 + 1] * 1.14 + 10); out[i * 4 + 2] = Math.min(255, d[i * 4 + 2] * 1.1 + 6); } }
    }
    if (o.tint) for (let i = 0; i < N; i++) { if (out[i * 4 + 3] < 8) continue; out[i * 4] *= o.tint[0]; out[i * 4 + 1] *= o.tint[1]; out[i * 4 + 2] *= o.tint[2]; if (o.tintAdd) { out[i * 4] += o.tintAdd[0]; out[i * 4 + 1] += o.tintAdd[1]; out[i * 4 + 2] += o.tintAdd[2]; } }
    if (o.palette !== false) for (let i = 0; i < N; i++) { if (out[i * 4 + 3] < 8) continue; const q = nearest(out[i * 4], out[i * 4 + 1], out[i * 4 + 2]); out[i * 4] = q[0]; out[i * 4 + 1] = q[1]; out[i * 4 + 2] = q[2]; out[i * 4 + 3] = 255; }
    img.data.set(out); return { has, mat, face, dep };
  }

  // ---------- build：和以前 VSCENE.build 一样的输入输出 ----------
  // g: {u, H, ox, cols}；ext: {homes:[{species, s, door, light}], hots, spots, dims, decor}
  function build(scene, g, env, ext) {
    const u = g.u, p = Math.max(1, Math.floor(u / 2)), M = g.cols, Nn = Math.round(g.H / u);
    const cw = Math.round((M * u) / p), ch = Math.round((Nn * u) / p);
    const def = (PP.DMAPS && (PP.DMAPS[scene] || PP.DMAPS.forest)) || null;
    const meta = Object.assign({}, def.meta || {});
    const W = new World(scene, env, meta);
    // 相机：整块地的菱形正好占满宽度，切面底边贴着框的下沿
    const k = (cw - 4) / (4 * D), top = def.topRoom != null ? def.topRoom : 0;
    const cam = { k, ox: 2 * D + 2 / k, oy: (ch - 3) / k - 2 * D - SLAB };
    // 能走的地方（世界 X/Y）：中间偏前的一条
    W.walk = Object.assign({ X0: -0.92 * D, X1: 0.92 * D, Y0: 0.98 * D, Y1: 1.46 * D }, def.walk || {});
    W.toPx = (uu, vv, zz) => [(2 * (uu - vv) + cam.ox) * k, (uu + vv - zz + cam.oy) * k];
    def.build(W, ext);
    W.walkArea();
    placeHomes(W, ext, def);
    if (def.dress) def.dress(W, ext);
    W.terrain();
    if (def.after) def.after(W);
    const sky = PP.env && env.time ? env.time : null;
    const o = { sun: meta.sun || [-0.25, 0.45, 0.86], sunCol: meta.sunCol || [0.92, 0.86, 0.74], sky: meta.amb || [0.42, 0.47, 0.6], gnd: meta.gnd || [0.3, 0.28, 0.34], skyTop: [0.48, 0.72, 0.91], skyBot: [0.81, 0.92, 0.98], night: true };
    const R = render(W, cw, ch, cam, o);
    const lay = { cols: Math.ceil(G().W / u), rows: Nn, hots: [], lights: [], lanterns: [], xmas: [], boxes: [], items: [], season: W.season, scene, full: false, water: null, spots: {}, homes: [] };
    const toG = (px, py) => [(g.ox * u + px * p) / u, (py * p) / u]; // 画布像素 → 场景格子（绝对列、行）
    const P = (uu, vv, zz) => { const [x, y] = W.toPx(uu, vv, zz); return toG(x, y); };
    let cv = null, cvN = null, info = null;
    if (R) {
      info = post(R.day, R.info, cw, ch, meta);
      cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; cv.getContext('2d').putImageData(R.day, 0, 0);
      if (R.night) { post(R.night, R.info, cw, ch, meta); cvN = document.createElement('canvas'); cvN.width = cw; cvN.height = ch; cvN.getContext('2d').putImageData(R.night, 0, 0); }
    } else { cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; }
    // 海底：模型后面垫一块“水”（上浅下深、带一点波纹），像从水族箱侧面看进去
    if (meta.under) for (const c of [cv, cvN]) { if (!c) continue; const x = c.getContext('2d'); x.globalCompositeOperation = 'destination-over'; const gr = x.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#367c9c'); gr.addColorStop(0.55, '#215272'); gr.addColorStop(1, '#143048'); x.fillStyle = gr; x.fillRect(0, 0, cw, ch); x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(232,246,242,.55)'; for (let i = 0; i < cw; i += 1) { const y = 2 + Math.round(Math.sin(i * 0.15) * 1.2); x.fillRect(i, y, 1, 1); } }
    cv.px = p; cv.ox = g.ox * u; if (cvN) { cvN.px = p; cvN.ox = g.ox * u; }
    // 宠物走的范围（格子）
    const [wx0] = toG((W.walk.X0 + cam.ox) * k, 0), [wx1] = toG((W.walk.X1 + cam.ox) * k, 0), wy0 = toG(0, (W.walk.Y0 + cam.oy) * k)[1], wy1 = toG(0, (W.walk.Y1 + cam.oy) * k)[1];
    lay.base = Math.round(wy0) - 1; lay.gy = lay.base - 2;
    const V = { walk: [Math.round(wx0), Math.round(wx1)], T3: Math.round(wy1) + 2, ox: g.ox, M, N: Nn, meta, season: W.season, snowy: W.snowy, perches: W.perches.map(([a, b, c]) => P(a, b, c).map(Math.round)), p, cw, ch, cx0: g.ox * u };
    lay.v = V; lay.cvN = cvN; lay.dark = !!meta.dark; lay.cave = scene === 'cave'; lay.under = !!meta.under;
    // 动画要用的像素：水面、瀑布
    V.wpx = []; V.wfall = []; V.glass = []; V.shore = [];
    if (info && !meta.frozen && !W.snowy) for (let i = cw, n = cw * ch - cw; i < n; i++) { if (!info.has[i] || info.mat[i] === 22 || info.face[i] !== 0) continue; if (info.mat[i - 1] === 22 && info.face[i - 1] === 0 || info.mat[i + 1] === 22 && info.face[i + 1] === 0 || info.mat[i + cw] === 22 && info.face[i + cw] === 0 || info.mat[i - cw] === 22 && info.face[i - cw] === 0) V.shore.push(i); }
    if (info) for (let i = 0, n = cw * ch; i < n; i++) { if (!info.has[i]) continue; const m = info.mat[i]; if (m === 22) { if (info.face[i] === 0) { if (H2(i, 7, 3) < 0.12) V.wpx.push(i); } else V.wfall.push(i); } else if (m === 24 && H2(i, 5, 1) < 0.05) V.glass.push(i); }
    V.smokes = W.smokes.map((q) => W.toPx(...q)); V.fires = W.fires.map((q) => W.toPx(...q)); V.fx = W.fx.map((q) => { const o = Object.assign({}, q, { at: q.u != null ? W.toPx(q.u, q.v, q.z || 0) : null }); for (const [a, b, n] of [['fx', 'x', cw], ['fy', 'y', ch], ['fx0', 'x0', cw], ['fx1', 'x1', cw], ['fy0', 'y0', ch], ['fy1', 'y1', ch], ['fh', 'h', ch]]) if (q[a] != null) o[b] = q[a] * n; return o; });
    // 家
    for (const h of W.homes) {
      const [dx, dy] = P(h.du != null ? h.du : h.u, h.dv != null ? h.dv : h.v, h.dz || W.H(h.u, h.v));
      const pts = (h.box || [[h.u - 3, h.v - 3, 0], [h.u + 3, h.v + 3, 10]]); const cs = []; for (const a of [pts[0][0], pts[1][0]]) for (const b of [pts[0][1], pts[1][1]]) for (const c of [pts[0][2], pts[1][2]]) cs.push(P(a, b, c));
      const x0 = Math.min(...cs.map((c) => c[0])), x1 = Math.max(...cs.map((c) => c[0])), y0 = Math.min(...cs.map((c) => c[1])), y1 = Math.max(...cs.map((c) => c[1]));
      lay.homes.push({ species: h.species, c: Math.round(dx), r: Math.round(dy), x0, x1, y0, y1, top: y0 });
      lay.spots[h.species + '_home'] = { c: Math.round(Math.max(V.walk[0] + 2, Math.min(V.walk[1] - 2, dx))), r: Math.max(lay.base + 1, Math.min(V.T3 - 2, Math.round(dy))), home: h.species };
      if (h.lamp) { const [lx, ly] = P(...h.lamp); lay.lights.push({ x: lx - 1, y: ly - 1, w: 2, h: 2, r: 6, col: '#ffcc70' }); }
    }
    // 灯
    for (const l of W.lights) { const [lx, ly] = P(l.u, l.v, l.z); lay.lights.push({ x: lx - (l.w || 2) / 2, y: ly - (l.h || 2) / 2, w: l.w || 2, h: l.h || 2, r: l.r, col: l.col, always: l.always }); }
    // 设施点
    const sp0 = ext.spots || {}, d0 = ext.dims || { cols: 400, base: 58, rows: 85 }, depth = V.T3 - 2 - (lay.base + 1);
    let wi = 0, pi = 0;
    const wsp = W.wspots.map(([a, b, c]) => P(a, b, c));
    for (const [id, s] of Object.entries(sp0)) {
      if (s.home || /_home$/.test(id)) continue;
      const fx0 = (s.c || 0) / d0.cols, fr = Math.max(0, Math.min(1, ((s.r || d0.base) - d0.base) / Math.max(1, d0.rows - d0.base)));
      let c = Math.round(V.walk[0] + 4 + fx0 * (V.walk[1] - V.walk[0] - 8)), r = Math.round(lay.base + 2 + fr * Math.max(1, depth - 3)), extra = {};
      if (W.spotsW[id]) { const q = P(...W.spotsW[id]); c = Math.round(q[0]); r = Math.round(q[1]); }
      else if (s.water) { if (wsp.length) { const w = wsp[wi++ % wsp.length]; c = Math.round(w[0]); r = Math.round(w[1]); } else extra = { water: false }; }
      else if (s.perch || s.hang) { if (V.perches.length) { const pp = V.perches[pi++ % V.perches.length]; c = pp[0]; r = pp[1]; } else extra = { perch: false, hang: false }; }
      lay.spots[id] = Object.assign({}, s, { c, r }, extra);
    }
    // 去别的地方的入口（洞口、路牌）：位置由设计图给（caveAt / signAt）
    for (const ht of ext.hots || []) { const at = ht.door ? def.caveAt : def.signAt; if (at) W.hots.push({ u: at[0], v: at[1], z: at[2] || 0, r: at[3] || 3, hgt: at[4] || 10, tip: ht.tip, go: ht.go, door: ht.door, leave: ht.leave }); }
    for (const h of W.hots) { const a = P(h.u - h.r, h.v + h.r, h.z || 0), b = P(h.u + h.r, h.v - h.r, (h.z || 0) + (h.hgt || 8)); lay.hots.push({ x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]), tip: h.tip, go: h.go, door: h.door, leave: h.leave }); }
    // 你摆的装饰：贴在能走的那片地上
    const ctx = cv.getContext('2d'), ctxN = cvN && cvN.getContext('2d'); ctx.imageSmoothingEnabled = false; if (ctxN) ctxN.imageSmoothingEnabled = false;
    (ext.decor || []).slice().sort((a, b) => (a.fv || 0) - (b.fv || 0)).forEach((it) => {
      const c = V.walk[0] + (it.fx || 0.5) * (V.walk[1] - V.walk[0]), r = lay.base + 3 + (it.fv || 0.3) * Math.max(2, depth - 4); let s = it.s; if (s.h > 40) s = s.scaled(40 / s.h);
      const sc = u / p, x = (c * u - g.ox * u) / p - (s.w * sc) / 2, y = (r * u) / p - s.h * sc, img = s.canvas();
      ctx.drawImage(img, Math.round(x), Math.round(y), s.w * sc, s.h * sc); if (ctxN) ctxN.drawImage(img, Math.round(x), Math.round(y), s.w * sc, s.h * sc);
      lay.boxes.push({ i: it.di, x0: c - s.w / 2, x1: c + s.w / 2, y0: r - s.h, y1: r + 1 });
      if (it.light) lay.lights.push({ x: c - s.w / 2 + it.light[0], y: r - s.h + it.light[1], w: it.light[2], h: it.light[3], r: 7 });
    });
    return { cv, lay };
  }
  const G = () => PP.G;

  // 把各家的家放到设计好的位置上（设计里没写到的，就沿着能走的那片地的后沿排开）
  function placeHomes(W, ext, def) {
    const list = (ext.homes || []).map((h) => h.species), slots = (def.homes || []).slice();
    list.forEach((sp, i) => {
      let sl = slots[i];
      if (!sl) { const n = list.length, t = (i + 0.5) / n; sl = { u: 8 + t * (D - 16), v: D - 8 - t * (D - 16) - 6, kind: 'burrow' }; }
      const kind = (def.homeKind && def.homeKind[sp]) || HOMEKIND[sp] || sl.kind || 'burrow';
      const fn = PP.DPROPS.HOME[kind] || PP.DPROPS.HOME.burrow;
      const r = fn(W, sl.u, sl.v, Object.assign({ species: sp }, sl));
      W.home(sl.u, sl.v, Object.assign({ species: sp }, r || {}));
    });
  }
  // 每种动物默认住什么样的家
  const HOMEKIND = { fox: 'burrow', hedgehog: 'burrow', rabbit: 'burrow', hamster: 'burrow', marmot: 'burrow', fennec: 'sandburrow', meerkat: 'sandburrow', arctichare: 'snowburrow', arcticfox: 'snowburrow', porcupine: 'burrow',
    dragon: 'cave', brownbear: 'cave', snowleopard: 'cave', polarbear: 'icecave', bat: 'hollow', deer: 'leafhut', parrot: 'treehouse', monkey: 'treehouse', tiger: 'rockden', lion: 'rockden', zebra: 'grasshut', antelope: 'grasshut', hippo: 'mudhut',
    cat: 'cottage', dog: 'kennel', chick: 'coop', pig: 'sty', sheep: 'shed', cow: 'barn', yak: 'stonehut', alpaca: 'stonehut', duck: 'duckhouse', frog: 'lilyhut', capybara: 'reedhut',
    crab: 'shellhouse', seagull: 'nestpost', otter: 'lodge', turtle: 'sandmound', gardeneel: 'eelbed', shark: 'wreck', octopus: 'jar', penguin: 'igloo', seal: 'icehole', albatross: 'cliffnest', camel: 'tent' };

  // ---------- 每帧：会动的东西（画在框里，画布像素坐标） ----------
  const fx = { parts: [], rip: [], t: 0, lt: null };
  function anim(ctx, L, g, e, t) {
    const V = L.v; if (!V || !V.cw) return;
    const dt = Math.min(0.1, Math.max(0, t - (fx.lt == null ? t : fx.lt))); fx.lt = t;
    const p = V.p, X0 = V.cx0, Y0 = g.y0, cw = V.cw, ch = V.ch, night = e.time.phase === 'night', F = e.fx, meta = V.meta;
    const px = (x, y, col, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(X0 + Math.round(x) * p, Y0 + Math.round(y) * p, w * p, h * p); };
    // 水面闪光
    if (V.wpx.length && !meta.frozen) for (const i of V.wpx) { const ph = Math.sin(t * 1.4 + (i % 97) * 0.7 + i / 131); if (ph > 0.9) { const x = i % cw, y = (i / cw) | 0; px(x, y, '#e8f6f2'); if (ph > 0.97) px(x + 1, y, '#c8e8e4'); } }
    // 岸边的浪花：一圈白沫，涨涨落落
    if (V.shore.length) { const big = meta.waves; for (let j = 0; j < V.shore.length; j++) { const i = V.shore[j], x = i % cw, y = (i / cw) | 0, w = Math.sin(t * (big ? 1.6 : 1.1) + x * 0.12 + y * 0.3); if (w > (big ? 0.2 : 0.75)) px(x, y, w > 0.85 ? '#ffffff' : '#c8e8e4'); } }
    // 瀑布 / 水的切面：往下流的亮条
    if (V.wfall.length) for (let j = 0; j < V.wfall.length; j += 2) { const i = V.wfall[j], x = i % cw, y = (i / cw) | 0, ph = (((y - t * 26 + x * 5.3) % 7) + 7) % 7; if (ph < 1) px(x, y, '#e8f6f2'); }
    // 发光的晶体 / 魔法：一闪一闪
    for (const i of V.glass) { const a = Math.sin(t * 2 + i); if (a > 0.85) { const x = i % cw, y = (i / cw) | 0; px(x, y, '#ffffff'); } }
    // 烟囱的烟
    for (const [sx, sy] of V.smokes) for (let i = 0; i < 7; i++) { const a = (t * 0.4 + i / 7) % 1; ctx.globalAlpha = 0.6 * (1 - a); px(sx + Math.sin(t + i) * 2 + a * (4 + F.wind * 10), sy - a * 26, a < 0.4 ? '#f2f0f2' : '#dcdae0', 2 + Math.round(a * 2), 2 + Math.round(a * 2)); ctx.globalAlpha = 1; }
    // 火
    for (const [fx0, fy0] of V.fires) for (let i = 0; i < 8; i++) { const a = (t * 2.2 + i / 8) % 1; px(fx0 + Math.sin(t * 7 + i * 2) * 2, fy0 - a * 9, a < 0.3 ? '#fcee9e' : a < 0.65 ? '#f0bc56' : '#d07a34'); }
    // 场景自己的特效（气泡、魔法光点、落叶……）
    for (const q of V.fx) { const f = FX[q.k]; if (f) f(q, { px, ctx, t, dt, night, F, cw, ch, V, p, X0, Y0 }); }
    // 天上飘的：秋天落叶、春天花瓣；夏夜萤火虫
    const want = meta.under || meta.dark || V.snowy ? 0 : V.season === 'autumn' || V.season === 'spring' ? 8 : 0;
    while (fx.parts.filter((q) => q.k === 'fall').length < want) fx.parts.push({ k: 'fall', x: Math.random() * cw, y: -Math.random() * 30, vy: 9 + Math.random() * 8, ph: Math.random() * 9, col: V.season === 'autumn' ? ['#d07a34', '#e49a42', '#b45a2a'][(Math.random() * 3) | 0] : ['#f8c8d6', '#ffffff', '#f0a2b8'][(Math.random() * 3) | 0] });
    const bugs = meta.under || V.snowy || meta.noBugs ? 0 : meta.dark ? 10 : V.season === 'summer' || V.season === 'spring' ? (night ? 10 : 3) : 0;
    const [ly0, ly1] = [ch * 0.35, ch * 0.75];
    while (fx.parts.filter((q) => q.k === 'bug').length < bugs) fx.parts.push({ k: 'bug', x: cw * 0.15 + Math.random() * cw * 0.7, y: ly0 + Math.random() * (ly1 - ly0), ph: Math.random() * 9, col: meta.dark ? '#9aeccc' : night ? '#fcee9e' : ['#ffffff', '#f8d872', '#f0a2b8', '#88aae0'][(Math.random() * 4) | 0] });
    fx.parts = fx.parts.filter((q) => {
      if (q.k === 'fall') { q.y += q.vy * dt; q.ph += dt * 2; q.x += Math.sin(q.ph) * 8 * dt; px(q.x, q.y, q.col); return q.y < ch; }
      q.ph += dt; const bx = q.x + Math.sin(q.ph * 0.7) * 16, by = q.y + Math.sin(q.ph * 1.1) * 9;
      if (night || meta.dark) { if (Math.sin(q.ph * 2.3) > -0.2) { ctx.globalAlpha = 0.95; px(bx, by, q.col); ctx.globalAlpha = 0.25; px(bx - 1, by - 1, q.col, 3, 3); ctx.globalAlpha = 1; } }
      else { const fl = Math.sin(q.ph * 14) > 0; px(bx, by, '#3c3846'); px(bx - 1, by - (fl ? 1 : 0), q.col); px(bx + 1, by - (fl ? 1 : 0), q.col); }
      return true;
    }).slice(0, 50);
  }
  // 场景特效：每种一个函数，q 是设计里登记的参数
  const FX = {
    // 一串串往上冒的气泡（海底、温泉、魔药锅）
    bubbles(q, c) { const n = q.n || 6, x0 = q.at ? q.at[0] : q.x, y0 = q.at ? q.at[1] : q.y, hgt = q.h || c.ch * 0.6;
      for (let i = 0; i < n; i++) { const a = (c.t * (q.sp || 0.18) + i / n + (q.ph || 0)) % 1, x = x0 + Math.sin(c.t * 2.2 + i * 1.7) * (1.5 + a * 2.5), y = y0 - a * hgt, r = a > 0.55 ? 2 : 1; c.ctx.globalAlpha = 0.85 * (1 - a * 0.6); if (r > 1) { c.px(x - 1, y, '#c8e8e4', 1, 2); c.px(x + 1, y, '#c8e8e4', 1, 2); c.px(x, y - 1, '#e8f6f2'); c.px(x, y + 2, '#a0d4d6'); } else c.px(x, y, '#e8f6f2'); c.ctx.globalAlpha = 1; } },
    // 海面透下来的光柱
    rays(q, c) { c.ctx.globalAlpha = 0.07; for (let k = 0; k < 5; k++) { const x = ((k * 53 + c.t * 3) % (c.cw + 40)) - 20, w = 6 + (k % 3) * 4; for (let y = 0; y < c.ch * 0.8; y += 2) c.px(x + y * 0.35, y, '#ffffff', w, 2); } c.ctx.globalAlpha = 1; },
    // 一群小鱼来回游
    school(q, c) { const n = q.n || 7, dir = q.dir || 1, span = c.cw + 60, xx = ((c.t * (q.sp || 9) + (q.ph || 0) * 100) % span) - 30, cx = dir > 0 ? xx : c.cw - xx, cy = q.y + Math.sin(c.t * 0.7 + (q.ph || 0)) * 6;
      for (let i = 0; i < n; i++) { const ox = -dir * ((i * 7) % 19), oy = ((i * 5) % 11) - 5, x = cx + ox, y = cy + oy + Math.sin(c.t * 3 + i) * 0.8; c.px(x, y, q.col || '#f0bc56', 3, 1); c.px(x - dir * 2, y + (Math.sin(c.t * 9 + i) > 0 ? -1 : 1), shade(q.col || '#f0bc56', 0.7)); c.px(x + (dir > 0 ? 2 : 0), y, '#16141c'); } },
    // 一条大鱼慢慢游（鳐鱼、海龟的影子）
    glider(q, c) { const span = c.cw + 80, xx = ((c.t * (q.sp || 5) + (q.ph || 0) * 200) % span) - 40, dir = q.dir || 1, x = dir > 0 ? xx : c.cw - xx, y = q.y + Math.sin(c.t * 0.5) * 4, f = Math.sin(c.t * 2) * 2; c.ctx.globalAlpha = 0.85; c.px(x - 6, y, q.col || '#46346a', 12, 2); c.px(x - 3, y - 1 - Math.round(f / 2), q.col || '#46346a', 6, 1); c.px(x - 3, y + 2 + Math.round(f / 2), q.col || '#46346a', 6, 1); c.px(x - dir * 9, y, q.col || '#46346a', 4, 1); c.ctx.globalAlpha = 1; },
    // 魔法光点：慢慢往上飘、一闪一闪
    motes(q, c) { const n = q.n || 14; for (let i = 0; i < n; i++) { const a = (c.t * (q.sp || 0.06) + i / n) % 1, x = (q.x0 || 0) + ((i * 67) % Math.max(1, (q.x1 || c.cw) - (q.x0 || 0))) + Math.sin(c.t * 1.3 + i) * 4, y = (q.y1 || c.ch * 0.8) - a * ((q.y1 || c.ch * 0.8) - (q.y0 || 0)); const tw = Math.sin(c.t * 4 + i * 2.1); if (tw < -0.3) continue; const col = (q.cols || ['#fcee9e', '#9aeccc', '#c4a8e0'])[i % (q.cols || [1, 2, 3]).length]; c.px(x, y, col); if (tw > 0.8) { c.ctx.globalAlpha = 0.4; c.px(x - 1, y, col); c.px(x + 1, y, col); c.px(x, y - 1, col); c.px(x, y + 1, col); c.ctx.globalAlpha = 1; } } },
    // 飘着的书：上下浮动，书页一开一合
    book(q, c) { if (!q.at) return; const y = q.at[1] + Math.sin(c.t * 1.4 + (q.ph || 0)) * 3, x = q.at[0] + Math.sin(c.t * 0.6 + (q.ph || 0)) * 2, op = Math.sin(c.t * 3 + (q.ph || 0)) > 0; c.px(x - 3, y, q.col || '#90363a', 3, 2); c.px(x + 1, y, q.col || '#90363a', 3, 2); c.px(x - 2, y - (op ? 1 : 0), '#f4e2bc', 2, 1); c.px(x + 1, y - (op ? 1 : 0), '#f4e2bc', 2, 1); c.px(x, y, '#3a241c', 1, 2); c.ctx.globalAlpha = 0.18; c.px(x - 3, y + 6, '#16141c', 7, 1); c.ctx.globalAlpha = 1; },
    // 发光的魔法阵：一圈圈转的光点
    rune(q, c) { if (!q.at) return; const [x0, y0] = q.at, r = q.r || 10; for (let i = 0; i < 16; i++) { const a = c.t * 0.8 + (i / 16) * 6.283, x = x0 + Math.cos(a) * r, y = y0 + Math.sin(a) * r * 0.5; c.ctx.globalAlpha = 0.5 + 0.5 * Math.sin(c.t * 3 + i); c.px(x, y, i % 4 ? '#9aeccc' : '#ffffff'); } for (let i = 0; i < 6; i++) { const a = -c.t * 1.3 + (i / 6) * 6.283, x = x0 + Math.cos(a) * r * 0.5, y = y0 + Math.sin(a) * r * 0.25; c.px(x, y, '#c4a8e0'); } c.ctx.globalAlpha = 1; },
    // 云：慢慢飘过（浮空岛）
    cloud(q, c) { const x = ((q.x + c.t * (q.sp || 2)) % (c.cw + 60)) - 30, y = q.y, w = q.w || 22; c.ctx.globalAlpha = q.a || 0.9; c.px(x, y, '#ffffff', w, 4); c.px(x + 4, y - 3, '#ffffff', w - 10, 3); c.px(x + 2, y + 4, '#dcdae0', w - 4, 1); c.ctx.globalAlpha = 1; },
    // 风车叶片
    mill(q, c) { if (!q.at) return; const [mx, my] = q.at, a0 = c.t * (0.6 + c.F.wind * 0.9), r = q.r || 12; for (let k = 0; k < 4; k++) { const a = a0 + (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a) * 0.9; for (let j = 1; j <= r; j++) { const x = mx + ca * j, y = my + sa * j; c.px(x, y, '#4c3024'); if (j > 3) for (let w = 1; w <= 3; w++) c.px(x - sa * w, y + ca * w, j % 3 === 0 || w === 3 ? '#886040' : '#f4e2bc'); } } c.px(mx - 1, my - 1, '#3c3846', 3, 3); },
    // 旗子
    flag(q, c) { if (!q.at) return; const w = q.w || 7, h = q.h || 4; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { const wv = Math.round(Math.sin(c.t * 5 + i * 0.8) * (i / w) * 1.5); c.px(q.at[0] + 1 + i, q.at[1] + j + wv, j === h - 1 ? shade(q.col || '#c66252', 0.75) : q.col || '#c66252'); } },
    // 灯塔的光
    beam(q, c) { if (!c.night || !q.at) return; const a = Math.sin(c.t * 0.8); c.ctx.globalAlpha = 0.2; for (let k = 3; k < 70; k++) c.px(q.at[0] + a * k, q.at[1] + k * 0.1 * Math.abs(a) - Math.floor(k / 20), '#fcee9e', 1, 1 + Math.floor(k / 12)); c.ctx.globalAlpha = 1; },
    // 雪花 / 小冰晶闪
    sparkle(q, c) { for (let i = 0; i < (q.n || 10); i++) { const x = (i * 97) % c.cw, y = c.ch * 0.3 + ((i * 53) % Math.round(c.ch * 0.6)); if (Math.sin(c.t * 2.5 + i * 3.7) > 0.93) { c.px(x, y, '#ffffff'); c.px(x - 1, y, '#e6eef6'); c.px(x + 1, y, '#e6eef6'); c.px(x, y - 1, '#e6eef6'); c.px(x, y + 1, '#e6eef6'); } } },
    // 海草 / 水草摆（2D 叠在模型上）
    kelp(q, c) { if (!q.at) return; const h = q.h || 20; for (let j = 0; j < h; j++) { const s = Math.sin(c.t * 1.3 + j * 0.25 + (q.ph || 0)) * (j / h) * 3; c.px(q.at[0] + s, q.at[1] - j, j % 4 === 0 ? '#80b84e' : j % 2 ? '#46803c' : '#579642'); if (j % 5 === 2) c.px(q.at[0] + s + (j % 10 ? 1 : -1), q.at[1] - j, '#6aa848'); } },
    // 岩浆 / 魔药锅 / 温泉冒的热气
    steam(q, c) { if (!q.at) return; for (let i = 0; i < 6; i++) { const a = (c.t * 0.5 + i / 6) % 1; c.ctx.globalAlpha = 0.45 * (1 - a); c.px(q.at[0] + Math.sin(c.t * 1.5 + i) * 3, q.at[1] - a * 16, q.col || '#f2f0f2', 2, 2); c.ctx.globalAlpha = 1; } },
    // 极光：夜里天上一条条飘着的绿、紫光带
    aurora(q, c) { if (!c.night) return; for (let k = 0; k < 3; k++) { c.ctx.globalAlpha = 0.16; for (let x = 0; x < c.cw; x += 2) { const y = c.ch * 0.08 + k * 10 + Math.sin(x * 0.03 + c.t * 0.3 + k) * 10 + Math.sin(x * 0.011 - c.t * 0.2) * 8, h = 8 + Math.sin(x * 0.05 + c.t + k) * 5; c.px(x, y, ['#64d4b4', '#9aeccc', '#a688cc'][k], 2, Math.max(2, h)); } } c.ctx.globalAlpha = 1; },
    // 喷泉：水花往上冒、往两边落
    fountain(q, c) { if (!q.at) return; for (let i = 0; i < 18; i++) { const a = (c.t * 0.9 + i / 18) % 1, dir = i % 2 ? 1 : -1, x = q.at[0] + dir * a * (2 + (i % 4)), y = q.at[1] - Math.sin(a * Math.PI) * 10; c.px(x, y, a > 0.8 ? '#ffffff' : '#a0d4d6'); } },
    // 蝴蝶
    butterfly(q, c) { if (c.night) return; for (let i = 0; i < (q.n || 2); i++) { const ph = c.t * 0.5 + i * 2.3, x = (q.x || c.cw / 2) + Math.sin(ph) * 30 + Math.sin(ph * 2.7) * 8, y = (q.y || c.ch / 2) + Math.cos(ph * 1.3) * 12, f = Math.sin(c.t * 12 + i) > 0; const col = ['#f0bc56', '#88aae0', '#f0a2b8'][i % 3]; c.px(x, y, '#2a1a16'); c.px(x - 1, y - (f ? 1 : 0), col); c.px(x + 1, y - (f ? 1 : 0), col); } },
  };
  const qh = new Map();
  // 把一个颜色对齐到场景调色板（给动物用：和场景同一套颜色）
  function qhex(h) { if (!h || h[0] !== '#') return h; let o = qh.get(h); if (o) return o; const [r, g, b] = hexn(h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h.slice(0, 7)); const q = nearest(r, g, b); o = '#' + q.map((v) => v.toString(16).padStart(2, '0')).join(''); qh.set(h, o); return o; }
  PP.DIO = { D, CUBE, World, build, anim, mixh, shade, NZ, H2, rng, PAL, qhex, HOMEKIND };
  PP.VSCENE = { build, anim, reset() { fx.parts = []; fx.rip = []; fx.lt = null; } };
})();
