// 水生动物的立体模型（0.38）：图鉴里每一种鱼按它自己的身形、颜色、花纹、鳍做成光滑的 3D 模型，
// 还有虾、螃蟹、田螺、河蚌、乌龟、青蛙、蝌蚪、桃花水母；以及钓上来的靴子、漂流瓶。
// 每种只算一次（模板），画的时候按位置、朝向、尾巴摆动现算，直接塞进当帧的网格。
// 坐标：x 朝前（头），y 朝左，z 朝上；鱼的模板身长 1。
(function () {
  const PP = (window.PP = window.PP || {});
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const C = (c) => (typeof c === 'string' ? hex(c) : c);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const hs = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const MAT = () => PP.g3.MAT;

  // 一个模板：一串三角形（每个顶点自己的法线和颜色）
  function T() { return { p: [], n: [], c: [], m: [], tri(a, b, c, na, nb, nc, ca, cb, cc, mt) { this.p.push(a, b, c); this.n.push(na, nb, nc); this.c.push(ca, cb, cc); this.m.push(mt); } }; }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // 网格曲面：P[i][j]（i 沿身子，j 绕一圈），法线按相邻点算，颜色 Cf(i,j)
  function grid(t, P, Cf, mt, closeJ = true, flip = false) {
    const ni = P.length, nj = P[0].length, N = P.map((row, i) => row.map((q, j) => { const a = P[Math.min(ni - 1, i + 1)][j], b = P[Math.max(0, i - 1)][j], c = row[(j + 1) % nj], d = row[(j - 1 + nj) % nj]; let n = cross(sub(a, b), sub(c, d)); if (flip) n = mul(n, -1); return nrm(n); }));
    for (let i = 0; i + 1 < ni; i++) for (let j = 0; j < (closeJ ? nj : nj - 1); j++) { const j2 = (j + 1) % nj, A = [i, j], B = [i + 1, j], Cc = [i + 1, j2], D = [i, j2]; const q = (k) => P[k[0]][k[1]], n = (k) => N[k[0]][k[1]], c = (k) => Cf(k[0], k[1]), m2 = typeof mt === 'function' ? mt(i, j) : mt;
      if (flip) { t.tri(q(A), q(Cc), q(B), n(A), n(Cc), n(B), c(A), c(Cc), c(B), m2); t.tri(q(A), q(D), q(Cc), n(A), n(D), n(Cc), c(A), c(D), c(Cc), m2); }
      else { t.tri(q(A), q(B), q(Cc), n(A), n(B), n(Cc), c(A), c(B), c(Cc), m2); t.tri(q(A), q(Cc), q(D), n(A), n(Cc), n(D), c(A), c(Cc), c(D), m2); } }
  }
  // 椭球（光滑），可以给一个上色函数 cf(local dir)
  function ell(t, c, r, cf, mt, la = 7, lo = 12, rot) {
    const P = []; for (let i = 0; i <= la; i++) { const ph = -Math.PI / 2 + (i / la) * Math.PI, row = []; for (let j = 0; j < lo; j++) { const th = (j / lo) * 6.2832; let d = [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)]; let q = [d[0] * r[0], d[1] * r[1], d[2] * r[2]]; if (rot) q = rot(q); row.push([c[0] + q[0], c[1] + q[1], c[2] + q[2]]); } P.push(row); }
    const D = (i, j) => { const ph = -Math.PI / 2 + (i / la) * Math.PI, th = (j / lo) * 6.2832; return [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)]; };
    grid(t, P, (i, j) => C(cf(D(i, j))), mt, true, false);
  }
  // 细管（触须、腿、胡子）：沿一串点
  function tube(t, pts, r0, r1, col, mt, n = 5) {
    const P = pts.map((p, i) => { const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], d = nrm(sub(q, o)), up = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], x = nrm(cross(d, up)), y = cross(d, x), r = r0 + (r1 - r0) * i / (pts.length - 1); return Array.from({ length: n }, (_, k) => { const a = (k / n) * 6.2832; return [p[0] + (x[0] * Math.cos(a) + y[0] * Math.sin(a)) * r, p[1] + (x[1] * Math.cos(a) + y[1] * Math.sin(a)) * r, p[2] + (x[2] * Math.cos(a) + y[2] * Math.sin(a)) * r]; }); });
    const cc = C(col); grid(t, P, () => cc, mt);
  }
  // 一片薄膜（鳍）：边 A（贴着身子）到边 B（鳍的外沿），一条条鳍条深浅相间；两面都画
  function fin(t, A, B, col, mt, rays = true) {
    const n = A.length, c0 = C(col), cL = mix(c0, [1, 1, 1], 0.35), cD = mul(c0, 0.78);
    for (let i = 0; i + 1 < n; i++) { const a = A[i], b = A[i + 1], c = B[i + 1], d = B[i], nn = nrm(cross(sub(b, a), sub(d, a))), ca = c0, cb = c0, cc = rays && (i + 1) % 2 ? cD : cL, cd = rays && i % 2 ? cD : cL;
      t.tri(a, b, c, nn, nn, nn, ca, cb, cc, mt); t.tri(a, c, d, nn, nn, nn, ca, cc, cd, mt); const m2 = mul(nn, -1); t.tri(a, c, b, m2, m2, m2, ca, cc, cb, mt); t.tri(a, d, c, m2, m2, m2, ca, cd, cc, mt); }
  }
  // 眼睛：白眼圈、金色虹膜、黑瞳孔、一点高光
  function eye(t, c, r, out) {
    const o = nrm(out), mt = MAT().flat; ell(t, c, [r, r, r], (d) => { const k = d[0] * o[0] + d[1] * o[1] + d[2] * o[2]; return k > 0.86 ? (d[2] > 0.55 && k < 0.95 ? '#ffffff' : '#141018') : k > 0.62 ? '#d8a848' : '#f0ece0'; }, mt, 6, 10);
  }

  /* ---------- 鱼 ---------- */
  const SHAPE = { n: { H: 0.2, W: 0.085, tail: 'fork', dors: 0.9 }, r: { H: 0.3, W: 0.1, tail: 'round', dors: 1.0 }, l: { H: 0.135, W: 0.07, tail: 'fork', dors: 0.8 }, e: { H: 0.06, W: 0.052, tail: 'eel', dors: 0.5 }, p: { H: 0.3, W: 0.27, tail: 'round', dors: 0.4 } };
  const EXTRA = { carp: { barbel: 2, bl: 0.12 }, goldcarp: { barbel: 2, bl: 0.12 }, koi: { barbel: 2, bl: 0.1 }, catfish: { barbel: 4, bl: 0.45, wide: 1.5 }, loach: { barbel: 6, bl: 0.12 }, yellowcat: { barbel: 4, bl: 0.2, wide: 1.25 }, goldfish: { fancy: 1 }, mandarin: { spiny: 1 }, puffer: { spines: 1 } };
  function fishT(id, look, lod = 1) {
    const [body, belly, finC, pat, shape] = look, S0 = SHAPE[shape] || SHAPE.n, X = EXTRA[id] || {}, t = T(), M = MAT(), NX = lod ? 30 : 12, NA = lod ? 16 : 8;
    const cB = C(body), cY = C(belly), cF = C(finC);
    const prof = (s) => { if (shape === 'e') return Math.max(0.15, Math.pow(Math.sin(Math.PI * Math.min(1, 0.04 + s * 0.98)), 0.28)) * (s < 0.2 ? 0.55 + s * 2.25 : 1); const b = Math.sin(Math.PI * Math.pow(Math.min(1, 0.02 + s * 0.98), shape === 'p' ? 1 : 0.82)); return Math.max(0.17, Math.pow(b, shape === 'p' ? 0.45 : 0.62)); };
    const zc = (s) => S0.H * 0.08 * Math.sin(Math.PI * s), hh = (s) => S0.H * prof(s), ww = (s) => S0.W * prof(s) * (X.wide && s > 0.7 ? 1 + (X.wide - 1) * (s - 0.7) / 0.3 : 1);
    const colAt = (s, th) => { const tz = Math.sin(th); let c = mix(cY, cB, sm(-0.4, 0.2, tz)); if (tz > 0.65) c = mul(c, 0.86);
      if (pat === 'stripe' && Math.abs(tz) < 0.2 && s > 0.25 && s < 0.85) c = mix(c, cF, 0.85);
      if (pat === 'band' && Math.sin(s * 24) > 0.45 && tz > -0.35) c = mix(c, cF, 0.7);
      if (pat === 'dot' && hs(Math.floor(s * 26), Math.floor(th * 5)) > 0.78 && tz > -0.3) c = mix(c, cF, 0.8);
      if (pat === 'spot' && Math.sin(s * 17 + th * 3) * Math.sin(s * 9 - th * 5 + 1) > 0.3) c = mix(c, cF, 0.75);
      if (pat === 'koi') { if (Math.sin(s * 7 + 1) * Math.cos(th * 2 + s * 3) > 0.15 && tz > -0.5) c = cF; if (hs(Math.floor(s * 14), Math.floor(th * 3)) > 0.9 && tz > 0.2) c = [0.12, 0.1, 0.12]; }
      if (pat === 'rainbow') { if (Math.abs(tz - 0.05) < 0.22 && s > 0.15) c = mix(c, C('#e07a8a'), 0.7); if (tz > 0.3 && hs(Math.floor(s * 30), Math.floor(th * 6)) > 0.8) c = mul(c, 0.55); }
      if (pat === 'glow' && hs(Math.floor(s * 18), Math.floor(th * 4)) > 0.75 && Math.abs(tz) < 0.6) c = mix(c, [0.85, 1, 0.95], 0.8);
      if (pat === 'clear') { c = mix(c, [1, 1, 1], 0.25); if (Math.abs(tz - 0.1) < 0.12 && s > 0.1 && s < 0.85) c = mix(c, C('#7a98a8'), 0.6); }
      if (pat === 'petal' && Math.sin(s * 30 + th * 2) > 0.7 && tz > -0.2) c = mix(c, [1, 0.94, 0.96], 0.8);
      if (pat === 'scale' || pat === '' || pat === 'koi') c = mul(c, 0.975 + 0.035 * (((Math.floor(s * 44) + Math.floor((th + (Math.floor(s * 44) % 2) * 0.2) * 7)) % 2)));
      if (s > 0.74 && s < 0.78 && tz > -0.6) c = mul(c, 0.82); // 鳃盖的一道弧
      if (Math.abs(tz) < 0.04 && s > 0.2 && s < 0.74) c = mul(c, 0.85); // 侧线
      if (s > 0.97) c = mul(c, 0.7); // 嘴
      return c; };
    const P = []; for (let i = 0; i <= NX; i++) { const s = i / NX, x = -0.5 + s, h = hh(s) * (s > 0.985 ? 0.3 : 1), w = ww(s) * (s > 0.985 ? 0.3 : 1), z0 = zc(s), row = []; for (let j = 0; j < NA; j++) { const th = (j / NA) * 6.2832, sn = Math.sin(th); row.push([x, Math.cos(th) * w, z0 + sn * h * (sn < 0 ? 1.06 : 1)]); } P.push(row); }
    grid(t, P, (i, j) => colAt(i / NX, (j / NA) * 6.2832), pat === 'glow' ? (i, j) => (hs(Math.floor((i / NX) * 18), Math.floor((j / NA) * 6.2832 * 4 / 6.2832 * 1.25)) > 0.82 ? M.glow : M.flat) : M.flat);
    // 鳍
    const top = (s) => [-0.5 + s, 0, zc(s) + hh(s)], bot = (s) => [-0.5 + s, 0, zc(s) - hh(s) * 1.06], NF = lod ? 7 : 3, fm = M.flat;
    const finCol = pat === 'koi' ? mix(cF, [1, 1, 1], 0.4) : shape === 'r' && id === 'goldfish' ? cF : cF;
    if (shape === 'e') { const A = [], B = []; for (let k = 0; k <= 14; k++) { const s = 0.04 + k * 0.62 / 14; A.push(top(s)); const b = top(s); B.push([b[0], 0, b[2] + S0.H * 0.9 * Math.sin(Math.PI * k / 14) + 0.01]); } fin(t, A, B, finCol, fm, false); const A2 = [], B2 = []; for (let k = 0; k <= 10; k++) { const s = 0.02 + k * 0.4 / 10; A2.push(bot(s)); const b = bot(s); B2.push([b[0], 0, b[2] - S0.H * 0.7 * Math.sin(Math.PI * k / 10) - 0.01]); } fin(t, A2, B2, finCol, fm, false); }
    else { // 背鳍
      const d0 = 0.4, d1 = shape === 'r' ? 0.72 : 0.68, dh = S0.H * S0.dors * (X.spiny ? 1.1 : 1); const A = [], B = []; for (let k = 0; k <= NF; k++) { const f = k / NF, s = d1 - (d1 - d0) * f, b = top(s), hgt = dh * (X.spiny ? (0.6 + 0.4 * Math.abs(Math.sin(f * 9))) : (1 - f * 0.55)) * (f < 0.1 ? f * 10 : 1); A.push(b); B.push([b[0] - dh * 0.35, 0, b[2] + hgt]); } fin(t, A, B, finCol, fm);
      // 臀鳍
      const A2 = [], B2 = []; for (let k = 0; k <= 4; k++) { const s = 0.3 - k * 0.1 / 4, b = bot(s); A2.push(b); B2.push([b[0] - 0.06, 0, b[2] - S0.H * 0.45 * Math.sin(Math.PI * (k + 0.5) / 5)]); } fin(t, A2, B2, finCol, fm);
      // 尾鳍
      const tb = -0.5, th0 = hh(0) + 0.01, L = shape === 'p' ? 0.16 : X.fancy ? 0.55 : 0.3, A3 = [], B3 = [], NT = lod ? 9 : 4;
      for (let k = 0; k <= NT; k++) { const f = k / NT, zA = -th0 + 2 * th0 * f, ang = (f - 0.5) * 2; A3.push([tb + 0.02, 0, zc(0) + zA]); let ex = L, ez = ang * (S0.tail === 'fork' ? L * 0.95 : L * 0.75); if (S0.tail === 'fork') ex = L * (0.55 + 0.45 * Math.pow(Math.abs(ang), 0.8)); if (X.fancy) ex = L * (0.75 + 0.25 * Math.cos(ang * 2)); B3.push([tb - ex, (X.fancy ? Math.sin(f * 6.28) * 0.04 : 0), zc(0) + ez]); }
      fin(t, A3, B3, finCol, fm); if (X.fancy) { const B4 = B3.map((q) => [q[0] + 0.04, q[1] + 0.1, q[2] * 0.9]); fin(t, A3, B4, finCol, fm); }
      // 胸鳍、腹鳍（成对）
      for (const sd of [-1, 1]) { const s = 0.72, b = [-0.5 + s, sd * ww(s) * 0.9, zc(s) - hh(s) * 0.35]; fin(t, [b, [b[0] - 0.05, b[1], b[2] + 0.02]], [[b[0] - 0.12, b[1] + sd * 0.09, b[2] - 0.06], [b[0] - 0.16, b[1] + sd * 0.07, b[2] - 0.02]], finCol, fm);
        const s2 = 0.48, b2 = [-0.5 + s2, sd * ww(s2) * 0.6, zc(s2) - hh(s2) * 0.85]; fin(t, [b2, [b2[0] - 0.04, b2[1], b2[2]]], [[b2[0] - 0.1, b2[1] + sd * 0.05, b2[2] - 0.08], [b2[0] - 0.13, b2[1] + sd * 0.04, b2[2] - 0.05]], finCol, fm); } }
    // 眼睛
    for (const sd of [-1, 1]) { const s = shape === 'e' ? 0.93 : 0.86, r = Math.max(0.018, hh(s) * (shape === 'p' ? 0.22 : 0.3)); eye(t, [-0.5 + s, sd * ww(s) * 0.82, zc(s) + hh(s) * 0.25], r, [0.2, sd, 0.15]); }
    // 胡须
    if (X.barbel) for (let k = 0; k < X.barbel; k++) { const sd = k % 2 ? 1 : -1, row = Math.floor(k / 2), base = [0.49, sd * ww(0.99) * 0.6, zc(1) - hh(0.97) * (0.3 + row * 0.25)], L = X.bl * (row === 0 ? 1 : 0.6), pts = []; for (let i = 0; i <= 4; i++) { const f = i / 4; pts.push([base[0] + f * L * 0.3, base[1] + sd * f * L * 0.9, base[2] - f * L * 0.35 + Math.sin(f * 3) * 0.01]); } tube(t, pts, 0.008, 0.003, mul(cB, 0.8), M.flat, 4); }
    if (X.spines) for (let k = 0; k < 18; k++) { const s = 0.2 + hs(k, 1) * 0.65, th = hs(k, 2) * 6.28, b = [-0.5 + s, Math.cos(th) * ww(s), zc(s) + Math.sin(th) * hh(s)], o = nrm([0, Math.cos(th), Math.sin(th)]); tube(t, [b, [b[0], b[1] + o[1] * 0.05, b[2] + o[2] * 0.05]], 0.012, 0.002, cF, M.flat, 4); }
    return t;
  }
  /* ---------- 虾（小龙虾、小河虾） ---------- */
  function shrimpT(look, clawed = true) {
    const [body, belly, finC] = look, t = T(), M = MAT(), cB = C(body), cY = C(belly), cF = C(finC);
    const shell = (d) => mix(cY, cB, sm(-0.5, 0.3, d[2]));
    ell(t, [0.18, 0, 0.02], [0.2, 0.09, 0.08], shell, M.flat, 6, 12); // 头胸甲
    for (let k = 0; k < 6; k++) { const x = -0.04 - k * 0.07, r = 0.075 - k * 0.008; ell(t, [x, 0, 0.02 - k * 0.012], [0.05, r, r * 0.85], (d) => (d[2] > 0.3 ? mul(cB, 0.9 + (k % 2) * 0.1) : shell(d)), M.flat, 5, 10); }
    for (const sd of [-1, 0, 1]) fin(t, [[-0.45, 0, -0.04], [-0.45, sd * 0.02, -0.03]], [[-0.58, sd * 0.07, -0.08], [-0.6, sd * 0.09, -0.04]], cF, M.flat, false); // 尾扇
    for (const sd of [-1, 1]) { eye(t, [0.36, sd * 0.04, 0.07], 0.018, [1, sd, 0.3]); tube(t, [[0.37, sd * 0.03, 0.05], [0.55, sd * 0.12, 0.12], [0.8, sd * 0.25, 0.08], [1.05, sd * 0.32, -0.02]], 0.008, 0.003, cF, M.flat, 4); // 触角
      for (let k = 0; k < 4; k++) tube(t, [[0.15 - k * 0.06, sd * 0.06, -0.03], [0.13 - k * 0.06, sd * 0.13, -0.08], [0.1 - k * 0.06, sd * 0.16, -0.15]], 0.01, 0.006, cF, M.flat, 4); // 腿
      if (clawed) { tube(t, [[0.3, sd * 0.06, -0.02], [0.4, sd * 0.14, 0], [0.5, sd * 0.14, 0.02]], 0.018, 0.016, cB, M.flat, 5); ell(t, [0.6, sd * 0.15, 0.02], [0.11, 0.045, 0.035], (d) => (d[2] > 0 ? cB : cY), M.flat, 5, 9); ell(t, [0.66, sd * 0.11, 0.01], [0.08, 0.02, 0.02], () => mul(cB, 0.85), M.flat, 4, 7); } }
    return t;
  }
  /* ---------- 螃蟹（中华绒螯蟹：钳子上一团褐色的绒毛） ---------- */
  function crabT() {
    const t = T(), M = MAT(), sh = C('#6a5a3a'), sh2 = C('#8a7a52'), leg = C('#7a6a46');
    ell(t, [0, 0, 0.05], [0.22, 0.26, 0.09], (d) => mix(mul(sh2, 0.9), sh, sm(-0.3, 0.6, d[2])), M.flat, 6, 14);
    for (const sd of [-1, 1]) { eye(t, [0.2, sd * 0.07, 0.15], 0.025, [1, sd * 0.3, 0.5]); tube(t, [[0.17, sd * 0.07, 0.08], [0.2, sd * 0.07, 0.14]], 0.01, 0.008, leg, M.flat, 4);
      for (let k = 0; k < 4; k++) { const a = (-0.5 + k * 0.35) * sd, bx = 0.08 - k * 0.09, b = [bx, sd * 0.22, 0.03]; tube(t, [b, [bx - 0.02, sd * 0.36, 0.1], [bx - 0.06 - k * 0.02, sd * 0.47, -0.04]], 0.022, 0.01, leg, M.flat, 5); void a; }
      tube(t, [[0.15, sd * 0.18, 0.04], [0.26, sd * 0.26, 0.08], [0.36, sd * 0.2, 0.08]], 0.03, 0.03, leg, M.flat, 6); ell(t, [0.44, sd * 0.2, 0.08], [0.1, 0.06, 0.055], (d) => (d[1] * sd < 0 && d[2] < 0.5 ? '#4a3a2a' : mix(sh2, sh, 0.5)), M.flat, 5, 10); ell(t, [0.4, sd * 0.2, 0.1], [0.07, 0.065, 0.06], () => '#3e3024', M.flat, 4, 8); ell(t, [0.53, sd * 0.17, 0.06], [0.06, 0.02, 0.02], () => '#c8b080', M.flat, 4, 7); }
    return t;
  }
  /* ---------- 田螺：一圈圈往上盘的壳 + 伸出来的肉足、两根触角 ---------- */
  function snailT() {
    const t = T(), M = MAT(), P = [], NS = 40, NA = 10, a0 = C('#6a6a4a'), a1 = C('#8a8a62'), a2 = C('#4a4a36');
    for (let i = 0; i <= NS; i++) { const f = i / NS, ang = f * 3.2 * 6.2832, R = 0.04 + 0.22 * Math.pow(1 - f, 1.2), r = 0.03 + 0.16 * Math.pow(1 - f, 1.25), c = [Math.cos(ang) * R * 0.55, Math.sin(ang) * R * 0.55, 0.06 + f * 0.45], row = []; for (let j = 0; j < NA; j++) { const th = (j / NA) * 6.2832, d = [Math.cos(ang) * Math.cos(th), Math.sin(ang) * Math.cos(th), Math.sin(th)]; row.push([c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r * 0.9]); } P.push(row); }
    grid(t, P, (i, j) => (i % 4 === 0 ? a2 : mix(a0, a1, (j % 5) / 5)), M.flat);
    ell(t, [0.12, 0, 0.02], [0.2, 0.08, 0.04], () => '#9a8a6a', M.flat, 5, 10); for (const sd of [-1, 1]) tube(t, [[0.26, sd * 0.03, 0.04], [0.33, sd * 0.06, 0.1], [0.36, sd * 0.07, 0.14]], 0.01, 0.005, '#8a7a5a', M.flat, 4);
    return t;
  }
  /* ---------- 河蚌：两片带生长纹的壳，张开一条缝 ---------- */
  function musselT() {
    const t = T(), M = MAT(); for (const sd of [-1, 1]) ell(t, [0, sd * 0.02, 0.05], [0.28, 0.06, 0.13], (d) => { const r = Math.hypot(d[0], d[2]); return Math.floor(r * 7) % 2 ? '#4a5a3a' : '#5a6a46'; }, M.flat, 5, 12, (q) => [q[0], q[1] + sd * 0.02, q[2]]);
    ell(t, [0.02, 0, 0.06], [0.24, 0.025, 0.08], () => '#e8d8c8', M.flat, 4, 8); return t;
  }
  /* ---------- 乌龟（草龟）：拱起来的背甲一块块的盾片，脑袋、四条腿、小尾巴 ---------- */
  function turtleT() {
    const t = T(), M = MAT(), s1 = C('#5a5a3a'), s2 = C('#6e6a44'), skin = C('#6a6a52');
    ell(t, [0, 0, 0.08], [0.42, 0.33, 0.2], (d) => { if (d[2] < 0.05) return '#b8a878'; const a = Math.atan2(d[1], d[0]), ring = d[2] > 0.75 ? 0 : 1, cell = Math.floor((a + 3.2) / (ring ? 0.75 : 1.6)); return (cell + ring) % 2 ? s1 : s2; }, M.flat, 7, 16, (q) => [q[0], q[1], q[2] < 0 ? q[2] * 0.3 : q[2]]);
    tube(t, [[0.35, 0, 0.06], [0.46, 0, 0.09], [0.52, 0, 0.1]], 0.07, 0.065, skin, M.flat, 7); ell(t, [0.58, 0, 0.11], [0.1, 0.075, 0.07], (d) => (d[1] > 0.3 || d[1] < -0.3) && d[2] > -0.1 && d[2] < 0.5 && d[0] < 0.6 ? '#c8b84a' : skin, M.flat, 5, 10);
    for (const sd of [-1, 1]) { eye(t, [0.63, sd * 0.055, 0.14], 0.018, [0.5, sd, 0.3]); for (const fx of [0.25, -0.25]) ell(t, [fx, sd * 0.33, 0.02], [0.12, 0.09, 0.035], () => skin, M.flat, 4, 8); }
    tube(t, [[-0.4, 0, 0.05], [-0.5, 0, 0.03], [-0.56, 0, 0.0]], 0.035, 0.008, skin, M.flat, 5); return t;
  }
  /* ---------- 青蛙（黑斑蛙）：圆背、鼓眼睛、长后腿、蹼 ---------- */
  function frogT() {
    const t = T(), M = MAT(), g = C('#6a9a4a'), g2 = C('#4a7a3a'), y = C('#e8e0b0');
    ell(t, [0, 0, 0.12], [0.24, 0.16, 0.12], (d) => (d[2] < -0.2 ? y : hs(Math.floor(d[0] * 5), Math.floor(d[1] * 5)) > 0.75 ? g2 : g), M.flat, 6, 12);
    ell(t, [0.2, 0, 0.14], [0.13, 0.13, 0.09], (d) => (d[2] < -0.3 ? y : g), M.flat, 5, 10);
    for (const sd of [-1, 1]) { eye(t, [0.24, sd * 0.09, 0.22], 0.045, [0.4, sd, 0.6]); tube(t, [[0.12, sd * 0.12, 0.08], [0.18, sd * 0.2, 0.0], [0.24, sd * 0.22, -0.01]], 0.03, 0.02, g, M.flat, 5);
      tube(t, [[-0.16, sd * 0.12, 0.1], [-0.08, sd * 0.28, 0.12], [-0.26, sd * 0.3, 0.04], [-0.4, sd * 0.24, 0.0]], 0.05, 0.025, g, M.flat, 6); fin(t, [[-0.4, sd * 0.22, 0.0], [-0.4, sd * 0.26, 0.0]], [[-0.52, sd * 0.18, -0.01], [-0.52, sd * 0.32, -0.01]], '#5a8a42', M.flat, false); }
    return t;
  }
  function tadpoleT() { const t = T(), M = MAT(); ell(t, [0.08, 0, 0], [0.12, 0.09, 0.08], (d) => (d[2] < -0.3 ? '#6a6a5a' : '#2e2a26'), M.flat, 5, 9); fin(t, [[-0.02, 0, 0.03], [-0.02, 0, -0.03]], [[-0.32, 0, 0.012], [-0.32, 0, -0.012]], '#4a4640', M.flat, false); for (const sd of [-1, 1]) eye(t, [0.15, sd * 0.06, 0.04], 0.015, [0.5, sd, 0.4]); return t; }
  /* ---------- 桃花水母：半透明的伞，伞里一个粉色的十字，伞边一圈细触手 ---------- */
  function jellyT() {
    const t = T(), M = MAT(); ell(t, [0, 0, 0], [0.22, 0.22, 0.15], (d) => (d[2] < 0 ? '#d8f0f0' : Math.abs(d[0]) < 0.18 || Math.abs(d[1]) < 0.18 ? '#f4a8c0' : '#e4f6f4'), M.glow, 6, 14, (q) => [q[0], q[1], q[2] < 0 ? q[2] * 0.25 : q[2]]);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.2832, b = [Math.cos(a) * 0.2, Math.sin(a) * 0.2, -0.02]; tube(t, [b, [b[0] * 1.05, b[1] * 1.05, -0.15], [b[0] * 0.95, b[1] * 0.95, -0.3]], 0.006, 0.002, '#e8f4f0', M.glow, 3); }
    return t;
  }
  /* ---------- 野鸭（绿头鸭）：公的绿脑袋、白颈环、褐色胸脯，母的一身麻褐 ---------- */
  function duckT(male) { const t = T(), M = MAT(), b1 = male ? '#9a9a90' : '#8a6a46', b2 = male ? '#7a5a3a' : '#6a5034';
    ell(t, [0, 0, 0.12], [0.32, 0.17, 0.13], (d) => (d[0] > 0.6 ? b2 : d[2] < -0.3 ? '#d8d0c0' : d[0] < -0.75 ? '#2a2a2a' : b1), M.flat, 6, 12);
    ell(t, [0.27, 0, 0.32], [0.1, 0.085, 0.1], (d) => (male ? (d[2] < -0.6 ? '#f4f4f0' : '#2a6a3a') : '#7a5a3a'), M.flat, 5, 10); tube(t, [[0.24, 0, 0.16], [0.27, 0, 0.27]], 0.07, 0.06, male ? '#2a6a3a' : '#7a5a3a', M.flat, 6);
    ell(t, [0.38, 0, 0.3], [0.07, 0.035, 0.02], () => (male ? '#e8c040' : '#c8883a'), M.flat, 4, 8); for (const sd of [-1, 1]) eye(t, [0.31, sd * 0.07, 0.34], 0.015, [0.4, sd, 0.2]);
    ell(t, [-0.05, 0.1, 0.2], [0.2, 0.04, 0.06], () => (male ? '#4a4a8a' : '#5a6a9a'), M.flat, 4, 8); ell(t, [-0.05, -0.1, 0.2], [0.2, 0.04, 0.06], () => (male ? '#4a4a8a' : '#5a6a9a'), M.flat, 4, 8); return t; }
  /* ---------- 靴子、漂流瓶 ---------- */
  function bootT() { const t = T(), M = MAT(); ell(t, [-0.15, 0, 0.25], [0.14, 0.12, 0.3], () => '#6a4a34', M.flat, 6, 10); ell(t, [0.08, 0, 0.06], [0.28, 0.12, 0.08], (d) => (d[2] < -0.5 ? '#3a2a20' : '#6a4a34'), M.flat, 5, 10); tube(t, [[-0.15, 0, 0.55], [-0.15, 0, 0.56]], 0.14, 0.14, '#5a3a28', M.flat, 10); return t; }
  function bottleT() { const t = T(), M = MAT(); ell(t, [0, 0, 0], [0.32, 0.12, 0.12], (d) => (d[2] > 0.6 ? '#e8fff8' : '#9ad4c8'), M.flat, 6, 12); tube(t, [[0.3, 0, 0], [0.48, 0, 0]], 0.06, 0.05, '#9ad4c8', M.flat, 8); tube(t, [[0.48, 0, 0], [0.55, 0, 0]], 0.055, 0.055, '#a8784a', M.flat, 8); ell(t, [0, 0, 0], [0.18, 0.06, 0.06], () => '#f4ead8', M.flat, 4, 8); return t; }

  const cache = {};
  function tpl(id, lod = 1) {
    const k = id + ':' + lod; if (cache[k]) return cache[k];
    const F = PP.FISHDEX && PP.FISHDEX.BY && PP.FISHDEX.BY[id]; let t;
    if (id === 'crab') t = crabT(); else if (id === 'snail') t = snailT(); else if (id === 'mussel') t = musselT(); else if (id === 'turtle') t = turtleT(); else if (id === 'frog') t = frogT(); else if (id === 'tadpole') t = tadpoleT(); else if (id === 'jelly') t = jellyT(); else if (id === 'duckM') t = duckT(true); else if (id === 'duckF') t = duckT(false); else if (id === 'shrimp') t = shrimpT(['#c8d0c0', '#e8ece0', '#a8b4a8'], false);
    else if (F) { const sh = F.look[4]; t = sh === 'c' ? shrimpT(F.look, true) : sh === 'b' ? bootT() : sh === 'o' ? bottleT() : fishT(id, F.look, lod); }
    else t = fishT(id, ['#9aa8a0', '#d8dccc', '#7a8a84', '', 'n'], lod);
    // 摊平成数组，画的时候快
    const n = t.p.length, P = new Float32Array(n * 3), N = new Float32Array(n * 3), Cc = new Float32Array(n * 3), Mt = new Uint8Array(n / 3); let x0 = 1e9, x1 = -1e9;
    for (let i = 0; i < n; i++) { P.set(t.p[i], i * 3); N.set(t.n[i], i * 3); Cc.set(t.c[i], i * 3); x0 = Math.min(x0, t.p[i][0]); x1 = Math.max(x1, t.p[i][0]); } for (let i = 0; i < n / 3; i++) Mt[i] = t.m[i];
    return (cache[k] = { P, N, C: Cc, M: Mt, n, x0, x1 });
  }
  /* 把一个模板放进网格：位置 (u,v,z)、朝向 yaw（俯仰 pitch、横滚 roll）、大小 s；wag 是尾巴摆（鱼身从头到尾一条 S 形的波），
     tint 是整体染色（水下深处更蓝、夜里更暗由着色器管，这里只给「看不清的影子」用） */
  const ZK = 2.83 / 1.155; // 场景坐标里竖直 1 格 = 水平 0.41 格那么长
  function put(m, id, u, v, z, yaw, s, o = {}) {
    const T0 = tpl(id, o.lod == null ? 1 : o.lod), cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0), wag = o.wag || 0, ph = o.phase || 0, k = o.k || 7, sq = o.squash || 0;
    const tint = o.tint, pk = 32 * (m.pick || 0), sw = o.sway != null ? o.sway : -1, ox = m.ox || 0, oy = m.oy || 0, oz = m.oz || 0;
    const xf = (x, y, z2, isN) => { if (!isN) { if (wag) { const back = Math.max(0, 0.35 - x); y += wag * Math.sin(ph - x * k) * back * back * 2.4; } if (sq) { const f = 1 + sq * (z2 > 0 ? 1 : 0.3); z2 *= f; x *= 1 - sq * 0.3; } }
      const y1 = y * cr - z2 * sr, z1 = y * sr + z2 * cr; const x2 = x * cp - z1 * sp, z3 = x * sp + z1 * cp; return [x2 * cy - y1 * sy, x2 * sy + y1 * cy, z3]; };
    for (let i = 0; i < T0.n; i++) { const b = i * 3, q = xf(T0.P[b], T0.P[b + 1], T0.P[b + 2], false), n = xf(T0.N[b], T0.N[b + 1], T0.N[b + 2], true);
      m.p.push(u + q[0] * s + ox, v + q[1] * s + oy, z + q[2] * s * ZK + oz); m.n.push(n[0], n[1], n[2]); /* 法线本来就是真实比例的；只有位置的竖直方向要按场景的格子换算 */ if (tint) m.c.push(T0.C[b] * tint[0], T0.C[b + 1] * tint[1], T0.C[b + 2] * tint[2]); else m.c.push(T0.C[b], T0.C[b + 1], T0.C[b + 2]); m.m.push(T0.M[(i / 3) | 0] + pk); m.w.push(sw); }
  }
  /* 画到一张 2D 画布上（钓上来的鱼的卡片、图鉴）：稍微侧过来一点的立体样子，三角形按远近排好、按光照上明暗，边上一圈淡淡的轮廓光 */
  const pcache = {};
  function paint(id, W = 360, H = 200, o = {}) {
    const key = [id, W, H, o.yaw || 0, o.dark ? 1 : 0].join(':'); if (pcache[key]) return pcache[key];
    const T0 = tpl(id, 1), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const yaw = o.yaw != null ? o.yaw : 0.5, pit = 0.32, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
    const view = (x, y, z) => { const x1 = x * cy + y * sy, y1 = -x * sy + y * cy; return [x1, z * cp - y1 * sp, z * sp + y1 * cp]; }; // 屏幕 x、屏幕 y（向上）、深度（越大越近）
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const V = []; for (let i = 0; i < T0.n; i++) { const b = i * 3, q = view(T0.P[b], -T0.P[b + 1], T0.P[b + 2]); V.push(q); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    const sc = Math.min((W * 0.86) / (x1 - x0), (H * 0.8) / (y1 - y0)), ox = W / 2 - ((x0 + x1) / 2) * sc, oy = H / 2 + ((y0 + y1) / 2) * sc, L = nrm([0.35, 0.75, 0.6]);
    const tris = []; for (let i = 0; i < T0.n; i += 3) { const a = V[i], b = V[i + 1], c = V[i + 2], cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); tris.push([i, (a[2] + b[2] + c[2]) / 3, cr]); }
    tris.sort((p, q) => p[1] - q[1]);
    for (const [i] of tris) { const P3 = [0, 1, 2].map((k) => V[i + k]); let col = [0, 0, 0], nz = 0; for (let k = 0; k < 3; k++) { const b = (i + k) * 3, n = view(T0.N[b], -T0.N[b + 1], T0.N[b + 2]); let d = n[0] * L[0] + n[1] * L[1] + n[2] * L[2]; if (n[2] < 0) d = -d * 0.4; const glow = T0.M[((i + k) / 3) | 0] === MAT().glow ? 0.5 : 0, rim = Math.pow(1 - Math.abs(n[2]), 3) * 0.25, lit = 0.55 + 0.55 * Math.max(0, d) + rim + glow; col = col.map((x, j) => x + T0.C[b + j] * lit / 3); nz += n[2]; }
      const cs = 'rgb(' + col.map((x) => Math.round(Math.min(1, x) * 255)).join(',') + ')'; g.fillStyle = cs; g.strokeStyle = cs; g.lineWidth = 0.6; g.beginPath(); g.moveTo(ox + P3[0][0] * sc, oy - P3[0][1] * sc); g.lineTo(ox + P3[1][0] * sc, oy - P3[1][1] * sc); g.lineTo(ox + P3[2][0] * sc, oy - P3[2][1] * sc); g.closePath(); g.fill(); g.stroke(); void nz; }
    if (o.dark) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(40,44,60,.92)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
    return (pcache[key] = cv);
  }
  PP.AQUA = { tpl, put, paint };
})();
