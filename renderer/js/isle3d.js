// 小岛的 3D 引擎（WebGL2，不依赖任何库）：真正的模型 + 太阳光 + 实时阴影 + 程序化材质（瓦片、砖石、木板、草地、玻璃……）
// 世界坐标是 (u, v, z)：u、v 是甲板上的格子，z 是高度；相机是固定的斜 45° 俯视（屏幕 X = 2(u−v)，Y = u+v−z），可以任意缩放。
(function () {
  const PP = (window.PP = window.PP || {});
  const MU = 2.83, MZ = 1.155; // 把 (u,v,z) 换成等比例的“真实空间”，算法线和光照用
  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const C = (c) => (typeof c === 'string' ? hex(c) : c);
  const MAT = { flat: 0, tile: 1, plank: 2, stone: 3, grass: 4, glass: 5, glow: 6, soil: 7, leaf: 8, plaster: 9, water: 10, cloth: 11, metal: 12, wallpaper: 13, snow: 14,
    // 像素画用的材质：花纹都是“成块”的，放大缩小都不会变成噪点
    pgrass: 15, pstone: 16, pplank: 17, pdirt: 18, psand: 19, pleaf: 20, proof: 21, pwater: 22, psnow: 23, pcrys: 24, pice: 25, pbrick: 26, pthatch: 27, prock: 28, lake: 29, bark: 30, moss: 31 };

  // ---------- 网格 ----------
  class Mesh {
    constructor() { this.p = []; this.n = []; this.c = []; this.m = []; this.w = []; this.ox = 0; this.oy = 0; this.oz = 0; this.pick = 0; this.sway = 0; }
    pk(id) { this.pick = id || 0; return this; }
    at(u, v, z) { this.ox = u; this.oy = v; this.oz = z || 0; return this; }
    tri(a, b, c, col, mat = 0) {
      col = C(col);
      const ax = (b[0] - a[0]) * MU, ay = (b[1] - a[1]) * MU, az = (b[2] - a[2]) * MZ, bx = (c[0] - a[0]) * MU, by = (c[1] - a[1]) * MU, bz = (c[2] - a[2]) * MZ;
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      if (this.nFn) { const nn = this.nFn([(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]); if (nn) { nx = nn[0]; ny = nn[1]; nz = nn[2]; } } // 树冠：按整团的球面受光（原神的做法），叶子不再各自乱亮乱暗
      for (const q of [a, b, c]) { this.p.push(q[0] + this.ox, q[1] + this.oy, q[2] + this.oz); this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]); this.m.push(mat + 32 * this.pick); this.w.push(this.sway); }
      return this;
    }
    // 带每个顶点自己法线和颜色的三角形（光滑曲面：第一人称的手、手里的东西）
    triN(a, b, c, na, nb, nc, ca, cb, cc, mat = 0) { const P = [a, b, c], N = [na, nb, nc], Cc = [C(ca), C(cb), C(cc)]; for (let i = 0; i < 3; i++) { const q = P[i], n = N[i], col = Cc[i]; this.p.push(q[0] + this.ox, q[1] + this.oy, q[2] + this.oz); this.n.push(n[0], n[1], n[2]); this.c.push(col[0], col[1], col[2]); this.m.push(mat + 32 * this.pick); this.w.push(this.sway); } return this; }
    quad(a, b, c, d, col, mat) { const s0 = this.sway; if (s0 === 0) { this._bk = ((this._bk || 0) + 1) % 13; this.sway = mat === MAT.snow ? -0.0001 : -(1 + this._bk); } this.tri(a, b, c, col, mat); this.tri(a, c, d, col, mat); this.sway = s0; return this; }
    box(u0, v0, z0, u1, v1, z1, col, mat = 0, top, topMat) {
      // 每块方块一个先后号（存在摆动值里，用负数）：重合的面谁在前就固定了（见着色器）；积雪排最后，永远被地板盖住
      const sw0 = this.sway, useK = !(sw0 > 0); if (useK) { this._bk = ((this._bk || 0) + 1) % 13; this.sway = -(1 + this._bk); }
      const q = (a, b, c, d, cl, mt) => this.quad(a, b, c, d, cl, mt);
      const tm = topMat != null ? topMat : mat; if (useK && tm === MAT.snow) this.sway = -0.0001;
      q([u0, v0, z1], [u1, v0, z1], [u1, v1, z1], [u0, v1, z1], top || col, tm);
      if (useK) this.sway = mat === MAT.snow ? -0.0001 : -(1 + this._bk);
      q([u0, v1, z0], [u1, v1, z0], [u1, v1, z1], [u0, v1, z1], col, mat); q([u1, v0, z0], [u1, v1, z0], [u1, v1, z1], [u1, v0, z1], col, mat);
      q([u0, v0, z0], [u1, v0, z0], [u1, v0, z1], [u0, v0, z1], col, mat); q([u0, v0, z0], [u0, v1, z0], [u0, v1, z1], [u0, v0, z1], col, mat);
      q([u0, v0, z0], [u1, v0, z0], [u1, v1, z0], [u0, v1, z0], col, mat); this.sway = sw0; return this;
    }
    // 圆柱 / 圆台 / 圆锥（r 以格为单位）
    cyl(u, v, z0, z1, r0, r1, col, mat = 0, n = 14, cap = true, capCol) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.2832, b = ((i + 1) / n) * 6.2832, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
        const p0 = [u + ca * r0, v + sa * r0, z0], p1 = [u + cb * r0, v + sb * r0, z0], p2 = [u + cb * r1, v + sb * r1, z1], p3 = [u + ca * r1, v + sa * r1, z1];
        if (r1 > 0.001) this.quad(p0, p1, p2, p3, col, mat); else this.tri(p0, p1, [u, v, z1], col, mat);
        if (cap && r1 > 0.001) this.tri(p3, p2, [u, v, z1], capCol || col, mat);
      }
      return this;
    }
    // 人字屋顶：axis='u' 表示屋脊沿 u 方向；ov 是出檐
    gable(u0, v0, u1, v1, z, h, axis, col, mat, ov = 0.6, wall, wallMat = 0, ovFront) { // ovFront：u0 那头单独的出檐（贴着大房间的小隔间前面不出檐）
      if (axis === 'u') {
        const m = (v0 + v1) / 2, a0 = u0 - (ovFront != null ? ovFront : ov), a1 = u1 + ov, e = ov * h / ((v1 - v0) / 2);
        this.quad([a0, v0 - ov, z - e], [a1, v0 - ov, z - e], [a1, m, z + h], [a0, m, z + h], col, mat);
        this.quad([a0, v1 + ov, z - e], [a1, v1 + ov, z - e], [a1, m, z + h], [a0, m, z + h], col, mat);
        if (wall) { this.tri([u0, v0, z], [u0, v1, z], [u0, m, z + h], wall, wallMat); this.tri([u1, v0, z], [u1, v1, z], [u1, m, z + h], wall, wallMat); }
        this.box(a0 - 0.1, m - 0.25, z + h - 0.6, a1 + 0.1, m + 0.25, z + h + 0.7, C(col).map((x) => x * 0.7), 0);
      } else {
        const m = (u0 + u1) / 2, a0 = v0 - ov, a1 = v1 + ov, e = ov * h / ((u1 - u0) / 2);
        this.quad([u0 - ov, a0, z - e], [u0 - ov, a1, z - e], [m, a1, z + h], [m, a0, z + h], col, mat);
        this.quad([u1 + ov, a0, z - e], [u1 + ov, a1, z - e], [m, a1, z + h], [m, a0, z + h], col, mat);
        if (wall) { this.tri([u0, v0, z], [u1, v0, z], [m, v0, z + h], wall, wallMat); this.tri([u0, v1, z], [u1, v1, z], [m, v1, z + h], wall, wallMat); }
        this.box(m - 0.25, a0 - 0.1, z + h - 0.6, m + 0.25, a1 + 0.1, z + h + 0.7, C(col).map((x) => x * 0.7), 0);
      }
      return this;
    }
    // 一团（树冠、灌木、云）：低面数的球，带一点起伏
    blob(u, v, z, r, rz, col, mat = 8, seed = 1, la = 5, lo = 9) { return this.ball(u, v, z, r, rz, col, mat, Math.max(3, la), Math.max(6, lo), 0.12, seed); }
    blobF(u, v, z, r, rz, col, mat = 8, seed = 1, la = 5, lo = 9) {
      const P = (i, j) => { const t = (i / la) * Math.PI, f = (j / lo) * 6.2832, k = 1 + 0.16 * Math.sin(seed * 7.1 + i * 2.3 + j * 1.7); return [u + Math.sin(t) * Math.cos(f) * r * k, v + Math.sin(t) * Math.sin(f) * r * k, z + Math.cos(t) * rz * k]; };
      for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) this.quad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), col, mat);
      return this;
    }
    // 墙上的窗：face='v' 表示这面墙朝 +v（窗沿 u 方向展开），在 w=墙面坐标 处；带窗框、十字窗棂、窗台，可选百叶和花箱
    win(face, a0, a1, z0, z1, w, o = {}) {
      const fr = o.frame || '#5a3a28', d = o.out == null ? 0.18 : o.out, B = (x0, y0, zz0, x1, y1, zz1, col, mat) => (face === 'v' ? this.box(x0, w + y0, zz0, x1, w + y1, zz1, col, mat) : this.box(w + y0, x0, zz0, w + y1, x1, zz1, col, mat));
      B(a0 - 0.2, -0.05, z0 - 0.5, a1 + 0.2, d, z1 + 0.5, fr, 0);
      B(a0, d - 0.02, z0, a1, d + 0.04, z1, o.glass || '#9fd4f2', MAT.glass);
      const m = (a0 + a1) / 2; B(m - 0.08, d, z0, m + 0.08, d + 0.08, z1, fr, 0); B(a0, d, (z0 + z1) / 2 - 0.3, a1, d + 0.08, (z0 + z1) / 2 + 0.3, fr, 0);
      if (o.arch) B(a0 - 0.1, -0.05, z1 + 0.5, a1 + 0.1, d, z1 + 1.3, fr, 0);
      B(a0 - 0.35, 0, z0 - 1.2, a1 + 0.35, d + 0.25, z0 - 0.5, o.sill || '#d8ccb4', 0);
      if (o.shut) { B(a0 - 0.75, 0, z0, a0 - 0.2, 0.12, z1, o.shut, MAT.plank); B(a1 + 0.2, 0, z0, a1 + 0.75, 0.12, z1, o.shut, MAT.plank); }
      if (o.box) { B(a0 - 0.2, 0.1, z0 - 2.6, a1 + 0.2, 0.75, z0 - 1.2, '#8a5a3a', MAT.plank); for (let i = 0; i < 4; i++) { const t = a0 + (i + 0.5) * (a1 - a0) / 4; face === 'v' ? this.blob(t, w + 0.45, z0 - 0.6, 0.35, 1.1, i % 2 ? o.box : '#5aa64e', 8, i, 3, 5) : this.blob(w + 0.45, t, z0 - 0.6, 0.35, 1.1, i % 2 ? o.box : '#5aa64e', 8, i, 3, 5); } }
      return this;
    }
    // 栏杆：从 (u0,v0) 到 (u1,v1)
    rail(u0, v0, u1, v1, z, h = 6, col = '#a8784a') {
      const n = Math.max(1, Math.round(Math.hypot(u1 - u0, v1 - v0) / 2));
      for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n, v = v0 + (v1 - v0) * i / n; this.box(u - 0.14, v - 0.14, z, u + 0.14, v + 0.14, z + h, col, 2); if (i === 0 || i === n) this.cyl(u, v, z + h, z + h + 1.2, 0.26, 0.05, '#e0b070', 0, 6); }
      const th = 0.12; for (const zz of [h * 0.45, h - 0.6]) this.box(Math.min(u0, u1) - th, Math.min(v0, v1) - th, z + zz, Math.max(u0, u1) + th, Math.max(v0, v1) + th, z + zz + 0.7, col, 2);
      return this;
    }
    // 台阶：沿 axis 从 lo 升到 hi
    stairs(a0, a1, b0, b1, z0, z1, axis, col = '#b88a5a', n = 6, thin) {
      for (let i = 0; i < n; i++) { const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n, zz = z0 + (z1 - z0) * (i + 1) / n, zb = thin ? zz - 1.4 : z0; axis === 'u' ? this.box(Math.min(t0, t1), b0, zb, Math.max(t0, t1), b1, zz, col, 2) : this.box(b0, Math.min(t0, t1), zb, b1, Math.max(t0, t1), zz, col, 2); }
      return this;
    }
    // 竖着的圆片（方向盘、圆窗、向日葵花盘）：face='u' 表示朝 +u
    disc(u, v, z, r, face, col, mat = 0, n = 10) {
      const P = (i) => { const a = (i / n) * 6.2832; return face === 'u' ? [u, v + Math.cos(a) * r, z + Math.sin(a) * r * 2.45] : [u + Math.cos(a) * r, v, z + Math.sin(a) * r * 2.45]; };
      for (let i = 0; i < n; i++) this.tri([u, v, z], P(i), P(i + 1), col, mat);
      return this;
    }
    // ---- 植物：一片片叶子拼出来的（不是一团橡皮泥）----
    // 一片叶子：中心 c，朝外的方向 (du,dv)，大小 s
    leaf(c, a, tilt, s, col, sw = 1) {
      const ca = Math.cos(a), sa = Math.sin(a), t1 = [-sa * s * 0.5, ca * s * 0.5, 0], t2 = [ca * s * 0.42 * Math.cos(tilt), sa * s * 0.42 * Math.cos(tilt), s * 1.15 * Math.sin(tilt)];
      const P = (i, j) => [c[0] + t1[0] * i + t2[0] * j, c[1] + t1[1] * i + t2[1] * j, c[2] + t1[2] * i + t2[2] * j];
      const o = this.sway; this.sway = sw; const N = 7, ctr = P(0, 0.05); for (let k = 0; k < N; k++) { const a0 = (k / N) * 6.2832, a1 = ((k + 1) / N) * 6.2832; this.tri(ctr, P(Math.cos(a0) * 1.05, Math.sin(a0) * 1.15), P(Math.cos(a1) * 1.05, Math.sin(a1) * 1.15), col, 8); } this.sway = o; return this; // 圆润的叶片（七边形，像一片小圆叶），不尖
    }
    // 一蓬叶子：n 片叶子贴在椭球面上，颜色深浅不一；里面垫一个暗色的芯，不会透
    foliage(u, v, z, r, rz, cols, n = 60, seed = 1, ls = 0.7) {
      // 大一点的树冠不是一个球：拆成几团（团和团之间有凹进去的缝），叶子按面积铺满，上面亮、下面和里面暗
      const R = (i) => { const x = Math.sin(seed * 91.7 + i * 47.3) * 43758.5; return x - Math.floor(x); };
      const big = Math.max(r, rz), nl = big > 1.3 ? Math.min(6, 2 + Math.floor(big * 0.9)) : 1, lobes = [];
      if (nl === 1) lobes.push([u, v, z, r, rz]);
      else { lobes.push([u, v, z + rz * 0.12, r * 0.62, rz * 0.62]); for (let k = 1; k < nl; k++) { const f = (k / (nl - 1)) * 6.2832 + R(k + 300) * 1.2, d = 0.42 + R(k + 310) * 0.18, hz = (R(k + 320) - 0.45) * 0.7; lobes.push([u + Math.cos(f) * r * d, v + Math.sin(f) * r * d, z + rz * hz, r * (0.48 + R(k + 330) * 0.16), rz * (0.5 + R(k + 340) * 0.16)]); } }
      const nf0 = this.nFn; this.nFn = (q) => { let best = null, bd = 1e9; for (const L of lobes) { const d = ((q[0] - L[0]) / L[3]) ** 2 + ((q[1] - L[1]) / L[3]) ** 2 + ((q[2] - L[2]) / L[4]) ** 2; if (d < bd) { bd = d; best = L; } } const x = (q[0] - best[0]) * MU / best[3], y = (q[1] - best[1]) * MU / best[3], zz = (q[2] - best[2]) * MZ / best[4] + 0.25, l = Math.hypot(x, y, zz) || 1; return [x / l, y / l, zz / l]; };
      const o = this.sway; this.sway = 0.5; for (const [a, b, c, rr, rzz] of lobes) this.blob(a, b, c, rr * 0.92, rzz * 0.92, C(cols[0]).map((x) => x * 0.82), 8, seed + a, 4, 7); this.sway = o;
      const inside = (q, skip) => lobes.some((L, k) => k !== skip && ((q[0] - L[0]) / (L[3] * 0.92)) ** 2 + ((q[1] - L[1]) / (L[3] * 0.92)) ** 2 + ((q[2] - L[2]) / (L[4] * 0.92)) ** 2 < 1);
      let id = 0;
      lobes.forEach(([a, b, c, rr, rzz], k) => {
        const area = 4.2 * Math.PI * Math.pow(rr * rr * rzz, 2 / 3), want = Math.round(Math.min(220, Math.max(nl === 1 ? n : n / nl, area / (ls * ls * 0.42))));
        for (let i = 0; i < want; i++, id++) {
          const t = Math.acos(1 - 1.8 * R(id)), f = R(id + 500) * 6.2832, kk = 0.9 + 0.2 * R(id + 900), q = [a + Math.sin(t) * Math.cos(f) * rr * kk, b + Math.sin(t) * Math.sin(f) * rr * kk, c + Math.cos(t) * rzz * kk];
          if (nl > 1 && inside(q, k)) continue;
          const up = Math.cos(t), sh = (0.88 + 0.14 * Math.max(0, up)) * (0.95 + 0.1 * R(id + 33)), /* 叶子之间的明暗差小一点：整团像一个柔软的球，不碎 */ ci = up > 0.45 && cols.length > 1 ? 1 + Math.floor(R(id + 77) * (cols.length - 1)) : Math.floor(R(id + 77) * cols.length);
          const col = C(cols[ci]).map((x) => Math.min(1, x * sh));
          this.leaf(q, f + (R(id + 5) - 0.5) * 1.2, 0.15 + (1 - t / 3.14) * 0.55, ls * (0.62 + 0.3 * R(id + 9)), col, 0.6 + 0.6 * R(id + 3));
        }
      });
      this.nFn = nf0; return this;
    }
    // 草丛：一撮细长的草叶
    tuft(u, v, z, h, n = 5, col = '#5aa64e', seed = 1) {
      const R = (i) => { const x = Math.sin(seed * 31.7 + i * 17.3) * 43758.5; return x - Math.floor(x); };
      const o = this.sway; this.sway = 1;
      for (let i = 0; i < n; i++) { const a = R(i) * 6.28, d = R(i + 9) * 0.35, w = 0.09, hh = h * (0.6 + 0.6 * R(i + 4)), bu = u + Math.cos(a) * d, bv = v + Math.sin(a) * d, lean = 0.25 * hh / 2.45; this.tri([bu - w, bv + w, z], [bu + w, bv - w, z], [bu + Math.cos(a) * lean, bv + Math.sin(a) * lean, z + hh], C(col).map((x) => x * (0.8 + 0.4 * R(i + 2))), 8); }
      this.sway = o; return this;
    }
    // 一朵花：茎 + 花瓣 + 花心
    flower(u, v, z, h, col, seed = 1) {
      const o = this.sway; this.sway = 0.8;
      this.tri([u - 0.05, v + 0.05, z], [u + 0.05, v - 0.05, z], [u, v, z + h], '#4c9a48', 8);
      for (let i = 0; i < 5; i++) this.leaf([u + Math.cos(i * 1.257 + seed) * 0.13, v + Math.sin(i * 1.257 + seed) * 0.13, z + h], i * 1.257 + seed, 0.5, 0.3, col, 0.8);
      this.box(u - 0.06, v - 0.06, z + h - 0.1, u + 0.06, v + 0.06, z + h + 0.25, '#ffd95a', 0); this.sway = o; return this;
    }
    // 爬藤：沿着一串点长，带叶子；drop>0 时每隔一段垂下一缕
    vine(pts, o = {}) {
      const R = (i) => { const x = Math.sin((o.seed || 1) * 51.7 + i * 27.3) * 43758.5; return x - Math.floor(x); }, cols = o.cols || ['#4c9a48', '#6fbf5a', '#3f8a44'], ls = o.ls || 0.5, sw0 = this.sway; let k = 0;
      for (let i = 1; i < pts.length; i++) {
        const A = pts[i - 1], B = pts[i], len = Math.hypot((B[0] - A[0]) * 2.45, (B[1] - A[1]) * 2.45, B[2] - A[2]), n = Math.max(1, Math.round(len / (o.gap || 1.1)));
        this.sway = 0.2; this.quad([A[0] - 0.05, A[1] + 0.05, A[2]], [A[0] + 0.05, A[1] - 0.05, A[2]], [B[0] + 0.05, B[1] - 0.05, B[2]], [B[0] - 0.05, B[1] + 0.05, B[2]], '#5a4a30', 0);
        for (let j = 0; j < n; j++, k++) {
          const t = (j + R(k)) / n, c = [A[0] + (B[0] - A[0]) * t + (R(k + 3) - 0.5) * 0.3, A[1] + (B[1] - A[1]) * t + (R(k + 5) - 0.5) * 0.3, A[2] + (B[2] - A[2]) * t + (R(k + 7) - 0.5) * 0.8];
          this.leaf(c, R(k + 11) * 6.28, 0.3 + R(k + 13) * 0.8, ls * (0.7 + 0.6 * R(k + 17)), C(cols[k % cols.length]).map((x) => x * (0.8 + 0.4 * R(k + 19))), 0.7);
          if (o.drop && R(k + 23) < 0.3) { const dl = o.drop * (0.4 + 0.8 * R(k + 29)); for (let q = 1; q * 1.2 < dl; q++) this.leaf([c[0] + (R(k + q) - 0.5) * 0.15, c[1] + (R(k + q + 40) - 0.5) * 0.15, c[2] - q * 1.2], R(k + q * 3) * 6.28, -0.6, ls * 0.8, C(cols[(k + q) % cols.length]).map((x) => x * (0.85 + 0.3 * R(k + q))), 1 + q * 0.25); if (o.bloom && R(k + 31) < 0.5) this.leaf([c[0], c[1], c[2] - dl], 0, -1.2, ls * 0.9, o.bloom, 1.4); }
        }
      }
      this.sway = sw0; return this;
    }
    tree(u, v, z, s, cols, seed = 1) {
      this.cyl(u, v, z, z + 9 * s, 0.42 * s, 0.26 * s, '#7a5236', 2, 7);
      this.blob(u, v, z + 15 * s, 2.5 * s, 7.5 * s, cols[0], 8, seed); this.blob(u - 1.2 * s, v + 0.9 * s, z + 12 * s, 1.7 * s, 5 * s, cols[1], 8, seed + 1); this.blob(u + 1.1 * s, v - 0.6 * s, z + 13.5 * s, 1.7 * s, 5 * s, cols[2] || cols[0], 8, seed + 2); this.blob(u + 0.3 * s, v + 0.5 * s, z + 20 * s, 1.5 * s, 4.5 * s, cols[2] || cols[1], 8, seed + 3);
      return this;
    }
    // 光滑的球（顶点法线朝外）：像素画里一团叶子、一块圆石头，光照会是一圈圈干净的明暗
    ball(u, v, z, r, rz, col, mat = 0, la = 6, lo = 12, bump = 0, seed = 1, top = false) {
      col = C(col); const P = [], N = [];
      for (let i = 0; i <= la; i++) for (let j = 0; j <= lo; j++) { const t = (i / la) * (top ? Math.PI / 2 : Math.PI), /* top：只画上半个（穹顶），不往下穿进屋里 */ f = (j / lo) * 6.2832, k = 1 + bump * Math.sin(seed * 7.1 + i * 2.3 + (j % lo) * 1.7); const x = Math.sin(t) * Math.cos(f), y = Math.sin(t) * Math.sin(f), zz = Math.cos(t); P.push([u + x * r * k, v + y * r * k, z + zz * rz * k]); let nx = x / (r * MU), ny = y / (r * MU), nz = zz / (rz * MZ); const l = Math.hypot(nx, ny, nz) || 1; N.push([nx / l, ny / l, nz / l]); }
      const W = lo + 1, put = (a) => { const q = P[a], n = N[a]; this.p.push(q[0] + this.ox, q[1] + this.oy, q[2] + this.oz); this.n.push(n[0], n[1], n[2]); this.c.push(col[0], col[1], col[2]); this.m.push(mat + 32 * this.pick); this.w.push(this.sway); };
      for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) { const a = i * W + j, b = a + 1, c = a + W + 1, d = a + W; put(a); put(b); put(c); put(a); put(c); put(d); }
      return this;
    }
    pot(u, v, z, r, col, plant, seed = 1) { this.cyl(u, v, z, z + r * 4.2, r * 0.7, r, col || '#c8705a', 0, 8); if (plant) { const c = C(plant), green = c[1] >= c[0] && c[1] >= c[2], lf = green ? [plant, '#4e8a3e', '#7cbc5c'] : ['#3e7a3a', '#5aa64e', '#6aa858'];
        // 盆里是一丛叶子（不是一个绿球），花色的盆栽上面再开几朵花
        for (let i = 0; i < 9; i++) { const a = i * 2.4 + seed, t = 0.5 + (i % 3) * 0.35; this.leaf([u + Math.cos(a) * r * 0.5, v + Math.sin(a) * r * 0.5, z + r * (4.4 + t * 1.6)], a, 0.5 + t * 0.5, r * 1.5, lf[i % 3], 0.8); }
        this.foliage(u, v, z + r * 6.2, r * 1.0, r * 1.5, lf, 10, seed, r * 1.1);
        if (!green) for (let i = 0; i < 5; i++) { const a = i * 1.26 + seed * 0.7; this.ball(u + Math.cos(a) * r * 0.75, v + Math.sin(a) * r * 0.75, z + r * (7 + (i % 2)), r * 0.42, r * 0.36, plant, 0, 2, 5); } }
      return this; }
  }

  // ---------- 着色器 ----------
  const VS = `#version 300 es
  in vec3 aP; in vec3 aN; in vec3 aC; in float aM; in float aW;
  uniform float uTime; uniform float uWind; uniform float uMir;
  uniform vec4 uView; uniform mat3 uL; uniform vec3 uLs; uniform vec3 uLo; uniform vec4 uCam; uniform vec2 uPit; uniform vec4 uFP; uniform vec4 uFP2;
  out vec3 vW; out vec3 vN; out vec3 vC; out float vM; out vec3 vS; out float vD;
  void main(){ vW=aP; vN=aN; vC=aC; vM=aM;
    vec3 m=vec3(aP.xy*${MU}, aP.z*${MZ}); vec3 l=(uL*m-uLo)*uLs; vS=vec3(l.xy,-l.z)*0.5+0.5;
    vec3 P=aP; if(aW>0.0){ float ph=uTime*(1.5+uWind)+aP.x*0.45+aP.y*0.33; float a=aW*(0.07+0.16*uWind); P.x+=sin(ph)*a; P.y+=cos(ph*0.83+1.3)*a*0.8; P.z+=sin(ph*1.31+aP.z*0.5)*a*1.2; }
    vec2 d=P.xy-uCam.zw, r=vec2(d.x*uCam.x-d.y*uCam.y, d.x*uCam.y+d.y*uCam.x)+uCam.zw; // 相机绕岛中心转
    vec2 d0=aP.xy-uCam.zw, r0=vec2(d0.x*uCam.x-d0.y*uCam.y, d0.x*uCam.y+d0.y*uCam.x)+uCam.zw; vD=r0.x+r0.y;
    float X=2.0*(r.x-r.y), Y=(r.x+r.y)*uPit.x-P.z*uPit.y;
    gl_Position=vec4(uMir*((X+uView.x)*uView.z-1.0), 1.0-(Y+uView.y)*uView.w, -(r0.x+r0.y+2.0*aP.z*uPit.x/max(uPit.y,0.3))/700.0, 1.0);
    // 第一人称：真正的透视相机（眼睛位置 uFP.xyz，朝向 uFP2.x 偏航 / uFP2.y 俯仰，uFP2.z 焦距，uFP2.w 宽高比）
    if(uFP.w>0.0){ vec3 m=vec3(P.xy*${MU}, P.z*${MZ})-uFP.xyz; float cy=cos(uFP2.x), sy=sin(uFP2.x), cp=cos(uFP2.y), sp=sin(uFP2.y);
      float rx=-m.x*sy+m.y*cy, fw=m.x*cy+m.y*sy, up=m.z; float u2=up*cp-fw*sp, f2=up*sp+fw*cp; float nr=0.25, fr=600.0;
      gl_Position=vec4(rx*uFP2.z/uFP2.w, u2*uFP2.z, (f2*(fr+nr)-2.0*fr*nr)/(fr-nr), f2); }
    // 叠在同一个平面上的两块（墙的断面和门框、地板和下层屋顶的积雪……）：按每块自带的先后号挪一丁点深度，谁在前面就固定了，不会两张面轮流抢着显示（闪烁）
    // 第一人称：挪的是「真实距离」里固定的一丁点（远处稍大一点但仍远小于窗玻璃离墙的距离）；以前按屏幕深度挪，走远了几十格后墙会跳到窗户前面，一走一闪
    if(aW<0.0){ if(uFP.w>0.0){ float st=max(0.002, gl_Position.w*3.5e-5); gl_Position.z-=(-aW)*st*(600.25/599.75); } else gl_Position.z-=(-aW)*0.7e-6*gl_Position.w; } }`;
  const VSS = `#version 300 es
  in vec3 aP; uniform mat3 uL; uniform vec3 uLs; uniform vec3 uLo;
  void main(){ vec3 m=vec3(aP.xy*${MU}, aP.z*${MZ}); vec3 s=(uL*m-uLo)*uLs; gl_Position=vec4(s.xy, -s.z, 1.0); }`;
  const FS = `#version 300 es
  precision highp float; precision highp sampler2DShadow; precision highp sampler3D;
  in vec3 vW; in vec3 vN; in vec3 vC; in float vM; in vec3 vS; in float vD;
  uniform vec4 uFP2; uniform vec4 uPond; uniform float uDay; uniform vec3 uStone;
  uniform sampler3D uVox; uniform vec3 uVoxO; uniform vec3 uVoxS; uniform float uVoxOn;
  float vd(vec3 p){ vec3 t=(p-uVoxO)/uVoxS; if(t.x<0.0||t.y<0.0||t.z<0.0||t.x>1.0||t.y>1.0||t.z>1.0) return 0.0; return texture(uVox,t).r; }
  uniform vec3 uVd; uniform sampler2DShadow uSh; uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uSkyCol; uniform vec3 uGndCol;
  uniform vec4 uRLa[40]; uniform vec4 uRLb[40]; uniform float uRLk[40]; uniform int uNRL; uniform float uLit; uniform float uTime; uniform float uCut; uniform float uPick; uniform float uH; uniform vec4 uPet[4]; uniform vec4 uPetZ[4]; uniform vec3 uRip[4]; uniform vec4 uLake; uniform vec3 uSkyTop; uniform vec3 uSkyBot; uniform float uRain; uniform float uInside; uniform float uShadow; uniform float uPost; uniform float uMode; uniform float uCel; uniform float uOcc; uniform float uGP; uniform vec4 uClip; uniform vec4 uClipS; uniform float uClipLo; uniform vec4 uFP;
  out vec4 o;
  float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float ns(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x), mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x), f.y); }
  void main(){
    if(uCut>-1e5 && vD<uCut) discard;
    // 详细视图：只留一个房间（转了角度的房间按它自己的朝向裁），房间外面和上面的都不画
    if(uClipS.x>0.0){ vec2 d=vW.xy-uClip.xy; if(uClipS.w>0.0){ if(length(d)>uClipS.w) discard; } else { vec2 l=vec2(d.x*uClip.z+d.y*uClip.w, -d.x*uClip.w+d.y*uClip.z); if(abs(l.x)>uClipS.x || abs(l.y)>uClipS.y) discard; } if(vW.z>uClipS.z || vW.z<uClipLo) discard; }
    // 遮挡层：只留下“挡在宠物前面、比它脚高”的那部分（房子、树、栏杆……），叠在宠物上面——走到房子后面就真的被房子挡住，不会像站在屋顶上
    if(uOcc>0.5){ bool keep=false; for(int i=0;i<4;i++){ vec4 q=uPet[i]; if(q.z<=0.0) continue; float yy=uH-gl_FragCoord.y;
      if(abs(gl_FragCoord.x-q.x)<q.z*0.66 && yy>q.y-q.z*1.2 && yy<q.y+q.z*0.15 && vD>q.w+0.6 && vW.z>uPetZ[i].x+0.5) keep=true; }
      if(!keep) discard; }
    // 第一人称：玻璃是透明的（看得见外面），不再是一整块发光的黄玻璃，一动就闪
    // 第一人称：玻璃画成很淡的一层（隔几个像素留一点浅蓝），看得见外面也看得出那儿有玻璃挡着；点东西时能点穿玻璃
    // 第一人称：玻璃单独第二遍画，真正半透明（看得见外面，也看得出有玻璃）；第一遍先跳过玻璃
    { int mm=int(mod(vM+0.5,32.0)); bool gl5=uFP.w>0.0 && mm==5, lk=mm==29;
      if(gl5){ if(uPick>0.5 || uMode>0.5 || uGP<0.5) discard; o=vec4(mix(uSkyTop,vec3(0.86,0.95,1.0),0.6),0.22); return; }
      // 湖水：第二遍才画，真半透明（看得见水底的古城）；点选时照样能点到水面（钓鱼）
      if(lk){ if(uMode>0.5 || (uPick<0.5 && uGP<0.5)) discard; } else if(uGP>0.5) discard; }
    if(uPick>0.5){ o=vec4(floor(vM/32.0+0.01)/255.0,0.0,0.0,1.0); return; }
    vec3 n=normalize(vN); vec3 V=normalize(uVd); if(uFP.w>0.0) V=normalize(uFP.xyz-vec3(vW.xy*${MU}, vW.z*${MZ})); if(dot(n,V)<0.0) n=-n;
    int m=int(mod(vM+0.5,32.0)); vec3 c=vC; float emis=0.0; bool lakeW=m==29; if(lakeW) m=10;
    if(uCel>0.5){ if(m==1) m=21; else if(m==2) m=17; else if(m==3) m=16; else if(m==4) m=15; else if(m==7) m=18; else if(m==8) m=20; else if(m==14) m=23; }
    if(uMode>0.5){ float d=gl_FragCoord.z*255.0; float face=n.z>0.6?0.0:(abs(n.x)>abs(n.y)?1.0:2.0); if(n.z<-0.6) face=3.0; o=vec4(floor(d)/255.0, fract(d), (float(m)+32.0*face)/255.0, 1.0); return; }
    bool wall=abs(n.z)<0.5; float hc=(abs(n.x)>abs(n.y))?vW.y:vW.x; // 墙面上的水平坐标
    if(m==1){ // 瓦片：一排排错开的鱼鳞瓦
      float row=vW.z/2.1; float r=floor(row); float t=hc*1.25+mod(r,2.0)*0.5; float id=h1(vec2(floor(t),r));
      float fy=fract(row), fx=fract(t)-0.5; float edge=smoothstep(0.0,0.28,fy-0.42*fx*fx*4.0*0.35);
      c*=0.80+0.34*id; c=mix(c*0.52,c,edge); c*=1.0-0.14*smoothstep(0.38,0.5,abs(fx)); if(id>0.9) c=mix(c,vec3(0.45,0.58,0.36),0.4);
    } else if(m==30){ // 树皮（0.37）：顺着树干竖着的深裂纹、一条条鳞片似的厚皮，颜色深浅交错；不分正面侧面（世界坐标里连续，不会在 45° 出接缝）
      float s1=vW.x+vW.y, s2=vW.x-vW.y; float f1=ns(vec2(s1*1.7, vW.z*0.28)), f2=ns(vec2(s2*1.7, vW.z*0.28+7.0)), f3=ns(vec2((s1+s2*0.6)*4.2, vW.z*0.9));
      float ridge=mix(f1,f2,0.5+0.5*sin(s1*0.37)); c*=0.84+0.3*ridge; c*=1.0-0.42*smoothstep(0.62,0.86,f3)*(wall?1.0:0.4); c*=0.94+0.12*ns(vec2(s2*0.4, vW.z*0.06));
    } else if(m==31){ // 苔藓：绒绒的，颜色一小块一小块深浅不一，边上迎着光有一层浅浅的绒光
      c*=0.84+0.28*ns(vec2(vW.x+vW.y*0.7, vW.z+vW.y)*2.6); c=mix(c, c*vec3(1.08,1.06,0.82), ns(vW.xy*0.7+vW.z*0.3)*0.5); c+=pow(1.0-max(dot(n,V),0.0),3.0)*vec3(0.1,0.13,0.04);
    } else if(m==2){ // 木板
      float t=wall? hc*1.6 : (vW.x*0.9); float id=h1(vec2(floor(t),floor((wall?vW.z*0.08:vW.y*0.25)+h1(vec2(floor(t),3.0))*3.0)));
      c*=0.86+0.24*id; c*=1.0-0.30*smoothstep(0.42,0.5,abs(fract(t)-0.5)); c*=0.95+0.1*ns(vec2(t*0.7, (wall?vW.z:vW.y)*2.0));
    } else if(m==3){ // 砖石
      float row= wall? vW.z/2.6 : vW.y*0.8; float r=floor(row); float t=(wall?hc:vW.x)*0.72+mod(r,2.0)*0.5; float id=h1(vec2(floor(t),r));
      c*=0.80+0.34*id; float e=max(smoothstep(0.38,0.5,abs(fract(t)-0.5)), smoothstep(0.36,0.5,abs(fract(row)-0.5))); c=mix(c,c*0.58,e); if(id>0.86) c=mix(c,vec3(0.42,0.55,0.34),0.45);
    } else if(m==4){ // 草地：深浅斑驳 + 小花
      float a=ns(vW.xy*0.55), b=ns(vW.xy*2.3); c*=0.82+0.28*a+0.12*b; vec2 g=floor(vW.xy*2.2); float f=h1(g);
      if(f>0.965 && length(fract(vW.xy*2.2)-0.5)<0.3) c=mix(vec3(1.0,0.95,0.7), vec3(1.0,0.6,0.75), h1(g+3.0));
    } else if(m==5){ // 玻璃：映着天；夜里透出屋里的灯光；从屋里看就是窗外的天
      float y=clamp(vW.z*0.02+0.3,0.0,1.0); vec3 sky=mix(uSkyBot,uSkyTop,y);
      float cl=smoothstep(0.55,0.75, ns(vec2(hc*0.35+uTime*0.05, vW.z*0.12))); sky=mix(sky, vec3(1.0), cl*0.7*(1.0-uLit*0.8));
      if(uInside>0.5){ c=sky; float st=h1(floor(vec2(hc*3.0,vW.z*1.2))); if(uLit>0.5 && st>0.97) c+=0.8; if(uRain>0.0){ float rr=fract(hc*4.0+vW.z*0.3+uTime*3.0*h1(vec2(floor(hc*4.0),1.0))); c=mix(c, vec3(0.85,0.9,1.0), step(0.93,rr)*uRain*0.5);} emis=1.0; }
      else { c=mix(c*0.75+sky*0.35, vec3(1.0,0.86,0.5), uLit*0.9); c+=0.25*smoothstep(0.75,1.0,fract((hc+vW.z*0.5)*0.35)); emis=uLit; }
    } else if(m==6){ emis=1.0; c*=0.97+0.03*sin(uTime*1.5+vW.x*3.0); // 灯：很慢很轻地呼吸，不再一闪一闪
    } else if(m==7){ float f=fract(vW.x*1.4); c*=0.72+0.4*smoothstep(0.0,0.5,abs(f-0.5)); c*=0.9+0.2*ns(vW.xy*3.0);
    } else if(m==8){ float a=ns(vW.xy*1.7+vW.z*0.5), b=ns(vW.xy*4.0+vW.z); c*=0.74+0.38*a+0.16*b; if(b>0.86) c*=1.25;
    } else if(m==9){ c*=0.93+0.1*ns(vec2(hc*1.3,vW.z*0.5)); c*=0.9+0.1*smoothstep(0.0,6.0,mod(vW.z,40.0));
    } else if(m==10){ // 水：两层交错的波纹 + 焦散亮线 + 映着天 + 一圈圈涟漪；竖着的面是往下流的水帘
      vec2 q=vW.xy; float t=uTime;
      if(wall){ float s1=ns(vec2(hc*3.2, vW.z*0.45+t*3.4)), s2=ns(vec2(hc*7.0+3.0, vW.z*0.8+t*5.0)); c=mix(c*0.85, vec3(1.0), smoothstep(0.5,0.85,s1)*0.65+smoothstep(0.7,0.95,s2)*0.4); emis=0.35; }
      else { float w1=sin(q.x*2.1+q.y*1.3+t*1.4+ns(q*0.9+t*0.2)*3.0), w2=sin(-q.x*1.2+q.y*2.6-t*1.1+ns(q*1.3-t*0.15)*3.0), h=w1*0.5+w2*0.5;
        for(int i=0;i<4;i++){ float age=t-uRip[i].z; if(age<0.0||age>4.0) continue; float d=length(q-uRip[i].xy); h+=sin(d*6.0-age*7.5)*exp(-d*0.8)*exp(-age*0.9)*1.6*smoothstep(0.0,0.4,age*2.5-d+0.4); }
        vec3 deep=c*0.6, sh=c*1.12+vec3(0.04,0.09,0.1); c=mix(deep,sh,smoothstep(-0.7,0.9,h)); c+=0.4*pow(clamp(1.0-abs(h),0.0,1.0),7.0);
        c=mix(c, mix(uSkyBot,uSkyTop,0.6), 0.22); c+=0.35*step(0.98,ns(q*6.0+vec2(t*0.25,-t*0.15)))*(1.0-uLit*0.6)*(1.0-uFP.w);
        // 原神那种水：斜着看映着天（越平着看越像镜子），对着太阳有一片柔和的亮光在波纹上碎开
        { float a1=q.x*2.1+q.y*1.3+t*1.4, a2=-q.x*1.2+q.y*2.6-t*1.1; vec2 dh=0.5*cos(a1)*vec2(2.1,1.3)+0.5*cos(a2)*vec2(-1.2,2.6); vec3 Nw=normalize(vec3(-dh*0.07,1.0));
          vec3 Pw=vec3(vW.xy*${MU}, vW.z*${MZ}); vec3 Vv=uFP.w>0.0? normalize(uFP.xyz-Pw) : normalize(uVd); if(Vv.z<0.0) Vv=-Vv;
          float frs=pow(1.0-clamp(Vv.z,0.0,1.0),4.0); c=mix(c, mix(uSkyBot,uSkyTop,0.35)*1.05, frs*0.55);
          vec3 Ls=normalize(uSun); float sp=pow(max(dot(reflect(-Ls,Nw),Vv),0.0),48.0); c+=uSunCol*sp*0.55*(1.0-uLit)*(1.0-uInside); }
        emis=0.25; }
    } else if(m==11){ float t=floor(vW.x*0.7)+floor(vW.y*0.7+vW.z*0.2); c*=0.88+0.2*mod(t,2.0);
    } else if(m==12){ c*=0.85+0.25*ns(vec2(hc*0.5,vW.z*0.6)); c+=0.12*smoothstep(0.8,1.0,fract(vW.z*0.2+hc*0.1));
    } else if(m==13){ // 墙纸：很淡的细竖条纹，菱形错开排着的小碎花（五瓣），远了就淡成底色
      float sl=abs(fract(hc*1.1)-0.5); c*=0.975+0.035*smoothstep(0.44,0.5,sl);
      vec2 g=vec2(hc*0.55, vW.z*0.26); vec2 ce=floor(g); vec2 fr=fract(g)-0.5; if(mod(ce.y,2.0)>0.5){ fr=fract(g+vec2(0.5,0.0))-0.5; }
      float d=length(fr*vec2(1.0,1.25)), ang=atan(fr.y,fr.x), pet=0.085+0.035*cos(ang*5.0);
      float fl=1.0-smoothstep(pet-0.012,pet+0.012,d); float cen=1.0-smoothstep(0.022,0.034,d);
      c=mix(c, c*vec3(0.84,0.88,0.93), fl*0.55); c=mix(c, c*vec3(1.05,0.92,0.78), cen*0.5);
    } else if(m==14){ c*=0.93+0.09*ns(vW.xy*1.5);
    } else if(m==15){ // 像素草地：一大块一大块深浅绿，零星亮草叶、暗点
      vec2 q=vW.xy; float a=ns(q*0.21+3.0)*0.65+ns(q*0.55)*0.35; c*= a>0.6?1.13:(a>0.42?1.0:0.86);
      if(wall){ c=c*0.9; } else { vec2 g=floor(q*1.4); float f=h1(g); if(f>0.95) c*=1.25; else if(f<0.04) c*=0.78; }
    } else if(m==16||m==28){ // 石墙 / 岩壁：一层层错开的石块，缝是暗的；顶上铺石板
      if(wall){ float rh=m==16?3.2:4.4, row=vW.z/rh; float r=floor(row); float t=hc/(m==16?1.7:2.6)+h1(vec2(r,9.0))*0.7; float id=h1(vec2(floor(t),r)); c*=0.8+0.3*id;
        float e=max(step(0.84,fract(t)), step(0.8,fract(row))); c=mix(c,c*0.58,e); if(fract(row)<0.18 && e<0.5) c*=1.1; if(id>0.88) c=mix(c,vec3(0.38,0.52,0.36),0.45); }
      else { vec2 q=vW.xy/(m==16?1.9:2.6); float o2=mod(floor(q.y),2.0)*0.5; vec2 qi=floor(vec2(q.x+o2,q.y)); float id=h1(qi); c*=0.86+0.22*id; vec2 f=fract(vec2(q.x+o2,q.y)); if(f.x>0.86||f.y>0.86) c*=0.7; }
    } else if(m==17){ // 木板：一条条，接缝暗，每条深浅不一
      float t=wall? hc/0.9 : vW.x/0.9; float r=floor(t); float id=h1(vec2(r,floor((wall?vW.z:vW.y)/7.0+h1(vec2(r,2.0))*3.0))); c*=0.86+0.22*id; if(fract(t)>0.8) c*=0.66; if(h1(vec2(r,floor((wall?vW.z:vW.y)*0.9)))>0.97) c*=0.75;
    } else if(m==18){ vec2 q=vW.xy; float a=ns(q*0.3); c*= a>0.55?1.07:0.93; float f=h1(floor(q*1.6)); if(f>0.95) c*=1.2; else if(f<0.05) c*=0.75; if(wall) c*=0.92;
    } else if(m==19){ vec2 q=vW.xy; float w=sin(q.x*0.9+q.y*0.35+ns(q*0.2)*4.0); c*= w>0.75?1.08:(w<-0.8?0.9:1.0); if(h1(floor(q*1.6))>0.97) c*=0.85;
    } else if(m==20){ // 像素树叶：上亮下暗，两三档，带亮点
      float a=ns(vW.xy*0.7+vW.z*0.2); c*= a>0.62?1.14:(a>0.38?1.0:0.84); float f=h1(floor(vec2(vW.x*1.3+vW.z*0.4, vW.y*1.3))); if(f>0.93 && n.z>0.0) c*=1.25;
    } else if(m==21){ // 屋瓦：一排排，每排下沿暗一条
      float row=vW.z/1.9; float r=floor(row); float t=hc/1.1+mod(r,2.0)*0.5; float id=h1(vec2(floor(t),r)); c*=0.88+0.2*id; if(fract(row)<0.22) c*=0.68; else if(fract(t)>0.86) c*=0.82; if(id>0.92) c=mix(c,vec3(0.4,0.55,0.35),0.35);
    } else if(m==22){ // 像素水：深浅两档 + 一道道亮线
      vec2 q=vW.xy; float w=sin(q.x*0.7+q.y*0.5+ns(q*0.25)*5.0); c*= w>0.82?1.25:(w>0.2?1.06:0.94); emis=0.2;
      if(wall){ float s1=fract(hc*0.6+h1(vec2(floor(hc*0.8),1.0))*3.0-vW.z*0.05); c=mix(c*0.95,vec3(0.9,0.97,1.0),step(0.86,s1)*0.7); emis=0.4; }
    } else if(m==23){ float a=ns(vW.xy*0.3); c*= a>0.6?1.0:0.95; if(wall) c*=0.9; if(h1(floor(vW.xy*1.5))>0.97) c=vec3(1.0);
    } else if(m==24){ emis=0.55; c*= n.z>0.5?1.2:(abs(n.x)>abs(n.y)?1.0:0.8);
    } else if(m==25){ c*= wall? (fract(hc*0.5)>0.8?1.15:0.95):1.05; emis=0.15;
    } else if(m==26){ // 砖：小块红砖
      float row= wall? vW.z/1.6 : vW.y/0.8; float r=floor(row); float t=(wall?hc:vW.x)/1.4+mod(r,2.0)*0.5; float id=h1(vec2(floor(t),r)); c*=0.84+0.24*id; if(fract(t)>0.85||fract(row)>0.8) c=mix(c,vec3(0.78,0.74,0.66)*c.r*1.3,0.55);
    } else if(m==27){ // 茅草
      float t=wall? hc*1.6 : (vW.x+vW.y)*1.2; c*=0.88+0.22*h1(vec2(floor(t),floor(vW.z/2.5))); if(fract(vW.z/2.5)<0.25) c*=0.75; }
    // 第一人称：离得远、一个像素盖住好几格花纹时，花纹（草点、木板缝、石缝、墙纸点……）慢慢淡成底色，不在像素间跳来跳去闪
    if(uFP.w>0.0 && m!=5 && m!=6 && m!=10){ float wpp=max(length(dFdx(vW)),length(dFdy(vW))); c=mix(c, vC*0.96, smoothstep(0.18,0.6,wpp)); }
    // 湖底：水下的东西有一层晃动的光斑（焦散），越深越蓝
    if(uLake.z>0.0 && !lakeW && vW.z<uLake.w-0.15){ vec2 d=vW.xy-uLake.xy; if(length(d)<uLake.z){ float dep=uLake.w-vW.z, t=uTime;
      vec2 q=vW.xy*0.9; float k1=ns(q+vec2(t*0.35,t*0.2)), k2=ns(q*1.7-vec2(t*0.25,-t*0.3)); float cs=pow(1.0-abs(k1-k2),10.0);
      c=mix(c, c*vec3(0.62,0.86,0.92)+vec3(0.02,0.08,0.1), clamp(dep/12.0,0.25,0.85)); c+=cs*vec3(0.55,0.8,0.75)*exp(-dep*0.12)*(n.z>0.3?0.7:0.35); emis=max(emis,0.06); } } // 越深光斑越淡：看得出往下是深的，不像一层瓷砖池底
    float nl=max(dot(n,uSun),0.0);
    float sh=1.0; if(uShadow>0.5 && vS.x>0.0&&vS.x<1.0&&vS.y>0.0&&vS.y<1.0){ /* 软阴影：12 个采样点撒成泊松圆盘，边缘柔和（以前是 3×3 的方格） */
      const vec2 PD[12]=vec2[12](vec2(-0.326,-0.406),vec2(-0.840,-0.074),vec2(-0.696,0.457),vec2(-0.203,0.621),vec2(0.962,-0.195),vec2(0.473,-0.480),vec2(0.519,0.767),vec2(0.185,-0.893),vec2(0.507,0.064),vec2(0.896,0.412),vec2(-0.322,-0.933),vec2(-0.792,-0.598));
      float s=0.0; for(int i=0;i<12;i++) s+=texture(uSh, vec3(vS.xy+PD[i]*(2.4/2048.0), vS.z-0.0025)); sh=s/12.0; }
    vec3 amb=mix(uGndCol,uSkyCol,n.z*0.5+0.5);
    /* 体素「光追」（0.31）：整座城堡做成一张 3D 体素图，每个点沿法线和两侧打几条短光线，看身边被东西挡住多少（墙角、桌底、屋檐下变暗）；
       再往正上方打一条光线看头顶有没有屋顶、树冠（有的话天光进不来，屋里、树荫下自然暗一层） */
    float aoK=1.0, skyV=1.0;
    if(uVoxOn>0.5 && uPick<0.5 && !lakeW && m!=6 && m!=10){ vec3 nw=normalize(vec3(n.x*${MU},n.y*${MU},n.z*${MZ})); vec3 tA=normalize(cross(nw, abs(nw.z)<0.9?vec3(0.0,0.0,1.0):vec3(1.0,0.0,0.0))), tB=cross(nw,tA); vec3 pp=vW+nw*0.35;
      float occ=vd(pp+nw*0.45)*0.28+vd(pp+nw*1.0)*0.22+vd(pp+nw*2.0)*0.14+vd(pp+nw*0.8+tA*0.9)*0.14+vd(pp+nw*0.8-tA*0.9)*0.14+vd(pp+nw*0.8+tB*0.9)*0.12+vd(pp+nw*0.8-tB*0.9)*0.12;
      aoK=1.0-clamp(occ,0.0,1.0)*0.66;
      float upB=max(max(vd(pp+vec3(0.0,0.0,2.5)),vd(pp+vec3(0.0,0.0,5.0))),max(vd(pp+vec3(0.0,0.0,9.0)),vd(pp+vec3(0.0,0.0,15.0)))); skyV=1.0-clamp(upB*1.3,0.0,1.0)*0.42; }
    amb*=aoK*skyV;
    /* 苔藓（0.36）：露天的石头、瓦、木头、树根朝上的那面，一片一片长着苔（世界坐标里的低频花纹，不闪）；屋里的地板头顶有顶（skyV 低）就不长 */
    if(uPick<0.5 && !lakeW && (m==3||m==16||m==1||m==21||m==2||m==17||m==30) && n.z>0.45 && (uVoxOn>0.5 ? skyV>0.82 : (m==1||m==21))){ float mz=ns(vW.xy*0.32+vec2(vW.z*0.11,0.0))*0.65+ns(vW.xy*1.1)*0.35; float mk=smoothstep(0.5,0.72,mz)*smoothstep(0.45,0.85,n.z)*(m==2||m==17?0.6:0.85);
      c=mix(c, mix(vec3(0.36,0.52,0.25), vec3(0.47,0.6,0.3), ns(vW.xy*2.3)), mk); }
    /* 阴暗潮湿的地方也长苔（0.37）：贴着地面的墙脚、水下古城、屋檐和树荫底下、墙角缝里、树干背阴的北面；屋里不长（按每间房的范围判断） */
    if(uPick<0.5 && !lakeW && n.z>-0.35 && (m==3||m==16||m==28||m==2||m==17||m==30||m==1||m==21||m==26||m==9)){
      bool indoor=false; for(int i=0;i<40;i++){ if(i>=uNRL) break; vec4 a=uRLa[i], b=uRLb[i]; if(vW.z<b.z-0.3||vW.z>b.w+0.3) continue; vec2 d=vW.xy-a.xy;
        if(b.x<0.0){ if(length(d)<-b.x+0.25){ indoor=true; break; } } else { vec2 l=vec2(d.x*a.z+d.y*a.w, -d.x*a.w+d.y*a.z); if(abs(l.x)<b.x+0.25&&abs(l.y)<b.y+0.25){ indoor=true; break; } } }
      if(!indoor){ float gz=vW.z+0.15, damp=(1.0-smoothstep(0.0,4.5,gz))*(m==9?0.45:1.0);
        if(vW.z<-1.3) damp=m==9?0.6:0.95;
        if(uVoxOn>0.5) damp=max(damp, (1.0-smoothstep(0.62,0.84,skyV))*0.7+(1.0-smoothstep(0.5,0.85,aoK))*0.45);
        if(m==30) damp=max(damp, 0.22+smoothstep(0.1,0.75,-n.y)*0.6);
        if(n.z>0.6 && (m==2||m==17) && vW.z>-1.3) damp*=0.5; // 走的木地板上少一点
        float mz=ns(vec2(vW.x+vW.y, vW.z*1.3)*0.45)*0.55+ns(vec2(vW.x-vW.y*0.7, vW.z*0.8+vW.x*0.3)*1.3)*0.45; float thr=mix(0.8,0.34,clamp(damp,0.0,1.0));
        float mk2=smoothstep(thr,thr+0.12,mz)*min(0.92,damp*1.2)*(0.75+0.25*max(n.z,0.0));
        c=mix(c, mix(vec3(0.3,0.45,0.22), vec3(0.44,0.57,0.28), ns(vec2(vW.x+vW.y,vW.z)*2.1)), mk2); } }
    float L=nl*sh; vec3 lit;
    if(uCel>0.5){ // 像素画的光：只分三档；亮部偏暖，暗部偏青紫
      float b=L>0.5?1.0:(L>0.18?0.58:0.22); lit=c*(amb*1.05+uSunCol*b); lit*=mix(vec3(0.93,0.95,1.08), vec3(1.05,1.0,0.9), b);
      float lu=dot(lit,vec3(0.3,0.55,0.15)); lit=mix(vec3(lu),lit,0.98); // 天空之城 / 原神：颜色干净饱满，暗面偏蓝而不是发灰
    } else { // 二次元的光：明暗两档之间软软地过渡；暗面偏冷的蓝紫，亮面偏暖
      float b=smoothstep(0.06,0.34,L); vec3 dark=c*amb*vec3(0.94,0.96,1.07)*1.1, bright=c*(amb+uSunCol*(0.55+0.45*L))*vec3(1.03,1.0,0.95); lit=mix(dark,bright,b); }
    { /* 高光：金属亮、瓦片有一点光泽、石头微微反光（太阳照到的地方才有） */ float ks= m==12?0.42 : (m==1||m==21)?0.13 : (m==3||m==16)?0.05 : 0.0, shin= m==12?42.0 : (m==1||m==21)?26.0 : 12.0;
      if(ks>0.0 && uPick<0.5){ vec3 Hh=normalize(normalize(uSun)+V); lit+=uSunCol*pow(max(dot(n,Hh),0.0),shin)*ks*sh*(1.0-uLit)*aoK; } }
    // 屋里的灯：每间房一盏，开着的时候整间屋子暖暖地亮起来（只照到这间房的范围、这一层的高度里）
    for(int i=0;i<40;i++){ if(i>=uNRL) break; float k=uRLk[i]; if(k<=0.01) continue; vec4 a=uRLa[i], b=uRLb[i]; if(vW.z<b.z-0.05||vW.z>b.w+0.05) continue;
      vec2 d=vW.xy-a.xy; float far;
      if(b.x<0.0){ float r=length(d); if(r>-b.x+0.3) continue; far=r/(-b.x); }
      else { vec2 l=vec2(d.x*a.z+d.y*a.w, -d.x*a.w+d.y*a.z); if(abs(l.x)>b.x+0.3||abs(l.y)>b.y+0.3) continue; far=length(l/vec2(b.x,b.y))*0.75; }
      vec3 lp=vec3(a.xy, b.w-2.4), L2=normalize(lp-vW); float df=0.45+0.55*max(dot(n,L2),0.0);
      lit+=c*vec3(1.0,0.8,0.55)*k*df*(1.05-0.45*clamp(far,0.0,1.0))*0.95; }
    lit*=mix(1.0,aoK,0.35); // 太阳光也被墙角吃掉一点（接触阴影）
    lit=mix(lit, c*(0.9+0.5*emis), clamp(emis,0.0,1.0));
    if(uPost>0.0){ lit=pow(lit,vec3(0.92)); lit=floor(lit*uPost+0.5)/uPost; } // 像素画：颜色分档，暖一点
    if(uPost<0.5 && uPick<0.5){ // 调色：稍微鲜艳一点；第一人称里物体边上一圈淡淡的天光、远处融进天色（空气感）
      float lu=dot(lit,vec3(0.3,0.59,0.11)); lit=mix(vec3(lu),lit,0.96); lit=lit*0.94+vec3(0.035,0.035,0.04); /* 原神 / 塞尔达：明亮但柔和，饱和度不往上推；暗部稍微提亮一点，不压得很死 */
      if(uFP.w>0.0){ vec3 eyeW=uFP.xyz/vec3(${MU},${MU},${MZ}); vec3 dv=vW-eyeW; float dd=length(dv); vec3 Vd=dv/max(dd,0.001); float rim=pow(1.0-abs(dot(n,Vd)),3.0); lit+=rim*0.08*mix(uSkyBot,vec3(1.0,0.92,0.78),0.5)*(1.0-uLit*0.7)*(1.0-clamp(emis,0.0,1.0));
        float fk=smoothstep(40.0,230.0,dd)*0.55; lit=mix(lit, mix(uSkyBot,uSkyTop,0.2), fk); } }
    /* 水下古城（0.36）：古城在地面底下的水洞里，不吃太阳的阴影，自己有一套光——
       白天阳光从池口透进来（池口正下方一道道光柱更亮）、晚上是淡淡的月光；城中央的浮石发蓝光；人潜下去时头上的探照灯照亮看着的地方；
       远处慢慢融进水色（以前从上面往下看大半被压成深蓝绿，现在看得清） */
    if(uLake.z>0.0 && !lakeW && vW.z<uLake.w-0.05 && length(vW.xy-uLake.xy)<uLake.z){ vec3 eyeW=uFP.xyz/vec3(${MU},${MU},${MZ}); bool under=uFP.w>0.0 && eyeW.z<uLake.w;
      vec3 sunUW=mix(vec3(0.12,0.18,0.28), vec3(0.3,0.46,0.52), uDay);
      vec2 pc=clamp(vW.xy, uPond.xy, uPond.zw); float dP=length(vW.xy-pc), shaft=uPond.z>uPond.x ? exp(-dP*0.085) : 0.0;
      vec3 Lw=sunUW*(0.75+0.35*shaft) + mix(vec3(0.3,0.38,0.6), vec3(0.85,0.82,0.7), uDay)*shaft*(0.22+0.25*max(n.z,0.0));
      float dS=length(vW-uStone); Lw+=vec3(0.3,0.65,0.85)*1.4/(1.0+dS*dS*0.004);
      if(under){ vec3 Pw=vec3(vW.xy*${MU}, vW.z*${MZ}), dv=Pw-uFP.xyz; float dd=length(dv); vec3 fwd=vec3(cos(uFP2.x)*cos(uFP2.y), sin(uFP2.x)*cos(uFP2.y), sin(uFP2.y)); float cone=smoothstep(0.8,0.96,dot(dv/max(dd,0.01),fwd)); Lw+=vec3(1.0,0.95,0.82)*(0.08+cone*1.3)/(1.0+dd*dd*0.0016); }
      lit=c*Lw*(0.7+0.3*aoK) + c*emis*0.8;
      vec3 deepC=mix(vec3(0.03,0.07,0.14), vec3(0.1,0.34,0.4), uDay); float k=under? smoothstep(10.0,36.0,length(vW-eyeW)) : smoothstep(3.0,26.0,uLake.w-vW.z)*0.8; lit*=mix(1.0,0.55,smoothstep(2.0,24.0,uLake.w-vW.z)); // 越深越暗、越蓝
      lit=mix(lit, deepC, k*(1.0-clamp(emis,0.0,1.0)*0.5)); }
    if(lakeW){ vec3 Vw=uFP.w>0.0? normalize(uFP.xyz/vec3(${MU},${MU},${MZ})-vW) : normalize(uVd); float fr=pow(1.0-abs(Vw.z),2.0); vec3 eyeW2=uFP.xyz/vec3(${MU},${MU},${MZ}); bool und=uFP.w>0.0 && eyeW2.z<uLake.w; o=vec4(lit, uPick>0.5?1.0:(und?0.3:clamp(0.32+0.5*fr,0.32,0.85))); return; } /* 池水清：正着往下看几乎透明，看得见底下的城 */ // 水是深的：从上面看大半看不透；潜到水下往上看才透亮 // 俯视时更透，看得见水下的古城 // 正着往下看最透，斜着看反光多
    o=vec4(lit,1.0);
  }`;
  const FSS = `#version 300 es
  precision highp float; out vec4 o; void main(){ o=vec4(1.0); }`;

  let gl = null, cv = null, prog = null, progS = null, shTex = null, shFb = null, ok = null, pickFb = null;
  const SH = 2048;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function mk(vs, fs) { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); for (const [i, n] of [[0, 'aP'], [1, 'aN'], [2, 'aC'], [3, 'aM'], [4, 'aW']]) gl.bindAttribLocation(p, i, n); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); p.u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); p.u[a.name] = gl.getUniformLocation(p, a.name); } return p; }
  function init() {
    if (ok != null) return ok;
    try {
      cv = document.createElement('canvas'); gl = cv.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true });
      if (!gl) throw new Error('no webgl2');
      prog = mk(VS, FS); progS = mk(VSS, FSS);
      shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SH, SH, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      shFb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, shFb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shTex, 0); gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      ok = true;
    } catch (e) { console.warn('isle3d', e); ok = false; }
    return ok;
  }
  function upload(mesh, old) {
    if (old) { gl.deleteVertexArray(old.vao); old.bufs.forEach((b) => gl.deleteBuffer(b)); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const bufs = [];
    [[mesh.p, 3], [mesh.n, 3], [mesh.c, 3], [mesh.m, 1], [mesh.w, 1]].forEach(([a, k], i) => { const b = gl.createBuffer(); bufs.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, k, gl.FLOAT, false, 0, 0); });
    gl.bindVertexArray(null);
    return { vao, bufs, count: mesh.p.length / 3 };
  }
  // 太阳方向（真实空间里指向太阳）→ 光照空间的基
  function lightBasis(s) {
    const l = Math.hypot(...s), L = s.map((x) => x / l); let ax = [L[1], -L[0], 0]; const al = Math.hypot(...ax) || 1; ax = ax.map((x) => x / al);
    const ay = [L[1] * ax[2] - L[2] * ax[1], L[2] * ax[0] - L[0] * ax[2], L[0] * ax[1] - L[1] * ax[0]];
    return { L, m: [ax[0], ay[0], L[0], ax[1], ay[1], L[1], ax[2], ay[2], L[2]] };
  }
  // 画一帧。scenes: [上传好的网格]；o: {w,h, ox,oy,k（一个小岛像素 = k 个屏幕像素）, iw,ih, sun, sunCol, sky, gnd, lit, time, cut, skyTop, skyBot, rain, inside, center:[u,v,z], radius, scissor, shadow}
  // 第一人称用 4 倍抗锯齿画到一张多重采样的画布上，再拷回来：细栏杆、窗格、树枝不再时有时无地闪
  let msFb = null, msRb = null, msDb = null, msW = 0, msH = 0;
  function msaaFb(W, H) {
    const n = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0); if (n < 2) return null;
    if (!msFb || msW !== W || msH !== H) {
      if (!msFb) { msFb = gl.createFramebuffer(); msRb = gl.createRenderbuffer(); msDb = gl.createRenderbuffer(); }
      gl.bindRenderbuffer(gl.RENDERBUFFER, msRb); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, n, gl.RGBA8, W, H);
      gl.bindRenderbuffer(gl.RENDERBUFFER, msDb); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, n, gl.DEPTH_COMPONENT24, W, H);
      gl.bindFramebuffer(gl.FRAMEBUFFER, msFb); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msRb); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDb);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); msFb = null; return null; }
      msW = W; msH = H;
    }
    return msFb;
  }
  function draw(scenes, o) {
    if (!init()) return null;
    const W = Math.max(2, Math.round(o.w)), H = Math.max(2, Math.round(o.h));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const lb = lightBasis(o.sun || [-0.55, 0.42, 0.72]), c = o.center || [30, 30, 10], cm = [c[0] * MU, c[1] * MU, c[2] * MZ], R = o.radius || 150;
    const off = [0, 1, 2].map((i) => lb.m[i] * cm[0] + lb.m[i + 3] * cm[1] + lb.m[i + 6] * cm[2]);
    const setL = (p) => { gl.uniformMatrix3fv(p.u.uL, false, lb.m); gl.uniform3f(p.u.uLs, 1 / R, 1 / R, 1 / R); gl.uniform3f(p.u.uLo, off[0], off[1], off[2]); };
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    if (o.shadow !== false && !o.cutPass && !o.pickAt && !o.mode) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, shFb); gl.viewport(0, 0, SH, SH); gl.disable(gl.SCISSOR_TEST); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(progS); setL(progS); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4);
      for (const s of scenes) { if (!s || s.noShadow) continue; gl.bindVertexArray(s.vao); gl.drawArrays(gl.TRIANGLES, 0, s.count); }
      gl.disable(gl.POLYGON_OFFSET_FILL); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    if (o.pickAt) { if (!pickFb) { pickFb = gl.createFramebuffer(); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, 1, 1); gl.bindFramebuffer(gl.FRAMEBUFFER, pickFb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); } gl.bindFramebuffer(gl.FRAMEBUFFER, pickFb); gl.viewport(-Math.round(o.pickAt[0]), -Math.round(H - 1 - o.pickAt[1]), W, H); }
    else { gl.viewport(0, 0, W, H); var ms = o.msaa && !o.mode && !o.cutPass && !o.scissor && !o.occ && !o.pickAt ? msaaFb(W, H) : null; /* 0.32：城堡视图精细画质也开 4 倍抗锯齿 */ if (ms) gl.bindFramebuffer(gl.FRAMEBUFFER, ms); }
    if (o.scissor) { gl.enable(gl.SCISSOR_TEST); const s = o.scissor; gl.scissor(Math.floor(s[0]), Math.floor(H - s[1] - s[3]), Math.ceil(s[2]), Math.ceil(s[3])); } else gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog); setL(prog);
    const u = prog.u;
    gl.uniform4f(u.uView, o.ox, o.oy, 2 * o.k / W, 2 * o.k / H);
    gl.uniform3fv(u.uSun, lb.L); gl.uniform3fv(u.uSunCol, o.sunCol || [0.85, 0.8, 0.7]); gl.uniform3fv(u.uSkyCol, o.sky || [0.5, 0.56, 0.68]); gl.uniform3fv(u.uGndCol, o.gnd || [0.36, 0.33, 0.36]);
    { const c = o.clip; if (u.uClip) { gl.uniform4f(u.uClip, c ? c[0] : 0, c ? c[1] : 0, c ? c[2] : 1, c ? c[3] : 0); gl.uniform4f(u.uClipS, c ? c[4] : 0, c ? c[5] : 0, c ? c[6] : 0, c ? c[7] : 0); if (u.uClipLo) gl.uniform1f(u.uClipLo, c ? c[8] : -1e6); } } gl.uniform1f(u.uLit, o.lit || 0); gl.uniform1f(u.uTime, o.time || 0); gl.uniform1f(u.uCut, o.cut == null ? -1e6 : o.cut); gl.uniform1f(u.uRain, o.rain || 0); gl.uniform1f(u.uInside, o.inside ? 1 : 0); gl.uniform1f(u.uShadow, o.shadow === false ? 0 : 1); gl.uniform1f(u.uPost, o.posterize || 0); gl.uniform1f(u.uMode, o.mode || 0); gl.uniform1f(u.uCel, o.cel ? 1 : 0); if (u.uOcc) gl.uniform1f(u.uOcc, o.occ ? 1 : 0);
    { const yaw = o.yaw || 0, A = o.pitch ? o.pitch[0] : 1, B = o.pitch ? o.pitch[1] : 1, c = Math.cos(yaw), s = Math.sin(yaw), cc = o.camC || [24, 23];
      gl.uniform4f(u.uCam, c, s, cc[0], cc[1]); gl.uniform2f(u.uPit, A, B);
      // 看过来的方向（世界空间），双面光照时用来判断哪一面朝着相机
      gl.uniform3f(u.uVd, MU * (c + s), MU * (c - s), 2 * MZ * A / Math.max(0.3, B)); }
    { const f = o.fp; if (u.uFP) { gl.uniform4f(u.uFP, f ? f.eye[0] * MU : 0, f ? f.eye[1] * MU : 0, f ? f.eye[2] * MZ : 0, f ? 1 : 0); if (u.uFP2) gl.uniform4f(u.uFP2, f ? f.yaw : 0, f ? f.pitch : 0, f ? 1 / Math.tan((f.fov || 1.15) / 2) : 1, W / H); } } gl.uniform1f(u.uWind, o.wind || 0); gl.uniform1f(u.uMir, o.mirror ? -1 : 1); gl.uniform1f(u.uPick, o.pickAt ? 1 : 0); gl.uniform1f(u.uH, H);
    { const pa = new Float32Array(16), pz = new Float32Array(16), rp = new Float32Array(12); (o.pets || []).slice(0, 4).forEach((q, i) => { pa.set(q.slice(0, 4), i * 4); pz[i * 4] = q[4]; }); (o.rips || []).slice(0, 4).forEach((q, i) => rp.set(q, i * 3)); if (!(o.rips || []).length) for (let i = 0; i < 4; i++) rp[i * 3 + 2] = -99; else for (let i = (o.rips || []).length; i < 4; i++) rp[i * 3 + 2] = -99; if (u['uPet[0]']) gl.uniform4fv(u['uPet[0]'], pa); if (u['uPetZ[0]']) gl.uniform4fv(u['uPetZ[0]'], pz); if (u['uRip[0]']) gl.uniform3fv(u['uRip[0]'], rp); }
    { const L = (o.rlights || []).slice(0, 40), A4 = new Float32Array(160), B4 = new Float32Array(160), K = new Float32Array(40); L.forEach((q, i) => { A4.set(q.a, i * 4); B4.set(q.b, i * 4); K[i] = q.k; }); if (u['uRLa[0]']) { gl.uniform4fv(u['uRLa[0]'], A4); gl.uniform4fv(u['uRLb[0]'], B4); gl.uniform1fv(u['uRLk[0]'], K); } if (u.uNRL) gl.uniform1i(u.uNRL, L.length); }
    gl.uniform3fv(u.uSkyTop, o.skyTop || [0.48, 0.72, 0.91]); gl.uniform3fv(u.uSkyBot, o.skyBot || [0.81, 0.92, 0.98]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.uniform1i(u.uSh, 0);
    if (u.uVoxOn) { const on = !!(voxT && o.vox !== false); gl.uniform1f(u.uVoxOn, on ? 1 : 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, on ? voxT.tex : null); gl.uniform1i(u.uVox, 1); if (on) { gl.uniform3fv(u.uVoxO, voxT.o); gl.uniform3fv(u.uVoxS, voxT.s); } gl.activeTexture(gl.TEXTURE0); }
    if (u.uGP) gl.uniform1f(u.uGP, 0);
    if (u.uLake) gl.uniform4fv(u.uLake, o.lake || [0, 0, 0, 0]); if (u.uPond) gl.uniform4fv(u.uPond, o.pond || [0, 0, 0, 0]); if (u.uDay) gl.uniform1f(u.uDay, o.day != null ? o.day : 1); if (u.uStone) gl.uniform3fv(u.uStone, o.stone || [0, 0, -999]); // 湖：圆心、半径、水面高度（水下光斑、发蓝）
    for (const s of scenes) { if (!s) continue; gl.bindVertexArray(s.vao); gl.drawArrays(gl.TRIANGLES, 0, s.count); }
    if (!o.pickAt && !o.mode && u.uGP && (o.fp || o.lake)) { gl.uniform1f(u.uGP, 1); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false);
      for (const s of scenes) { if (!s) continue; gl.bindVertexArray(s.vao); gl.drawArrays(gl.TRIANGLES, 0, s.count); }
      gl.depthMask(true); gl.disable(gl.BLEND); gl.uniform1f(u.uGP, 0); }
    /* 第一人称的手（0.33）：真正的 3D 模型，和场景同一套光照阴影；先清掉深度再画，贴着墙也不会戳进墙里 */
    if (o.vm && !o.pickAt && !o.mode) { gl.clear(gl.DEPTH_BUFFER_BIT); if (u.uVoxOn) gl.uniform1f(u.uVoxOn, 0); gl.bindVertexArray(o.vm.vao); gl.drawArrays(gl.TRIANGLES, 0, o.vm.count); }
    gl.bindVertexArray(null);
    if (o.pickAt) { const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return px[3] ? px[0] : -1; }
    if (typeof ms !== 'undefined' && ms) { gl.bindFramebuffer(gl.READ_FRAMEBUFFER, ms); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null); gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    return cv;
  }
  function alpha(x, y) { if (!gl) return 0; const px = new Uint8Array(4); gl.readPixels(Math.round(x), Math.round(cv.height - y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return px[3]; }
  /* 体素图：碰撞用的 0.25 格体素，2×2×2 合成一格（实心 1、树叶 0.45 的平均），传成 3D 纹理（线性插值，遮蔽过渡是软的） */
  let voxT = null;
  function setVox(V, vx, vz) { if (!init() || !V) return; const nx = Math.ceil(V.nx / 2), ny = Math.ceil(V.ny / 2), nz = Math.ceil(V.nz / 2), d = new Uint8Array(nx * ny * nz), g = V.g, NX = V.nx, NY = V.ny, NZ = V.nz;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let sum = 0; for (let c = 0; c < 8; c++) { const a = 2 * i + (c & 1), b = 2 * j + ((c >> 1) & 1), e = 2 * k + (c >> 2); if (a >= NX || b >= NY || e >= NZ) continue; const q = g[(e * NY + b) * NX + a]; if (q === 1) sum += 1; else if (q === 2) sum += 0.45; } d[(k * ny + j) * nx + i] = Math.min(255, Math.round(sum / 8 * 255 * 1.6)); }
    if (!voxT) { voxT = { tex: gl.createTexture() }; } gl.bindTexture(gl.TEXTURE_3D, voxT.tex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, nx, ny, nz, 0, gl.RED, gl.UNSIGNED_BYTE, d);
    for (const [k2, v2] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_3D, k2, v2);
    gl.bindTexture(gl.TEXTURE_3D, null); voxT.o = [V.u0, V.v0, V.z0]; voxT.s = [nx * 2 * vx, ny * 2 * vx, nz * 2 * vz]; }
  PP.g3 = { setVox, Mesh, MAT, hex, init, upload, draw, alpha, canvas: () => cv, ok: () => init() };
})();
