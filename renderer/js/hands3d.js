// 第一人称的手和手里的东西（0.35）
// 手不是拼起来的零件：手掌、每一节手指、拇指、手腕写成一个「距离场」，零件之间用平滑并集融在一起（像捏黏土），
// 再用 Surface Nets 把它变成一整张连续的网格，每个顶点的法线取距离场的梯度——表面是光滑连续的，没有接缝和棱角。
// 手里的东西（水壶、篮子、鱼竿、木柴、面包、种子袋）也是光滑的 3D 曲面（解析曲面 + 每顶点法线）。
// 所有几何都在「手的局部坐标」里：a 往右、b 往上（指尖方向）、c 往前（离开镜头），单位大约是手掌宽 0.26。
// 结果按手势（握拳程度）缓存，之后每帧只做位置变换。
(function () {
  const PP = (window.PP = window.PP || {});
  const v3 = (x, y, z) => [x, y, z], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(a[0], a[1], a[2]);
  const nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const hex = (c) => { const n = parseInt(String(c).replace('#', '').slice(0, 6), 16) || 0; return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const mixc = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
  // ---- 距离场的小零件 ----
  function capsule(p, a, b, ra, rb) { const pa = sub(p, a), ba = sub(b, a), h = Math.max(0, Math.min(1, dot(pa, ba) / (dot(ba, ba) || 1))); return len([pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h]) - (ra + (rb - ra) * h); }
  function rbox(p, c, hf, r) { const q = [Math.abs(p[0] - c[0]) - hf[0], Math.abs(p[1] - c[1]) - hf[1], Math.abs(p[2] - c[2]) - hf[2]]; return len([Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)]) + Math.min(Math.max(q[0], q[1], q[2]), 0) - r; }
  function ellip(p, c, r) { const q = [(p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]], k0 = len(q), k1 = len([q[0] / r[0], q[1] / r[1], q[2] / r[2]]); return k0 * (k0 - 1) / (k1 || 1); }
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  // ---- Surface Nets：把距离场变成光滑的网格 ----
  function nets(sdf, col, b0, b1, h) {
    const nx = Math.ceil((b1[0] - b0[0]) / h) + 1, ny = Math.ceil((b1[1] - b0[1]) / h) + 1, nz = Math.ceil((b1[2] - b0[2]) / h) + 1, V = new Float32Array(nx * ny * nz), I = (i, j, k) => (k * ny + j) * nx + i;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[I(i, j, k)] = sdf([b0[0] + i * h, b0[1] + j * h, b0[2] + k * h]);
    const vid = new Int32Array(nx * ny * nz).fill(-1), pos = [], E = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const c = [], P = []; let neg = 0; for (let q = 0; q < 8; q++) { const di = q & 1, dj = (q >> 1) & 1, dk = (q >> 2) & 1; const val = V[I(i + di, j + dj, k + dk)]; c.push(val); P.push([b0[0] + (i + di) * h, b0[1] + (j + dj) * h, b0[2] + (k + dk) * h]); if (val < 0) neg++; }
      if (neg === 0 || neg === 8) continue; let s = [0, 0, 0], n = 0;
      for (const [a, b] of E) { if ((c[a] < 0) === (c[b] < 0)) continue; const t = c[a] / (c[a] - c[b]); s = [s[0] + P[a][0] + (P[b][0] - P[a][0]) * t, s[1] + P[a][1] + (P[b][1] - P[a][1]) * t, s[2] + P[a][2] + (P[b][2] - P[a][2]) * t]; n++; }
      vid[I(i, j, k)] = pos.length; pos.push([s[0] / n, s[1] / n, s[2] / n]); }
    const e = h * 0.5, nor = pos.map((p) => nrm([sdf([p[0] + e, p[1], p[2]]) - sdf([p[0] - e, p[1], p[2]]), sdf([p[0], p[1] + e, p[2]]) - sdf([p[0], p[1] - e, p[2]]), sdf([p[0], p[1], p[2] + e]) - sdf([p[0], p[1], p[2] - e])]));
    const cols = pos.map((p) => col(p)), tris = [];
    const quad = (a, b, c2, d, flip) => { if (a < 0 || b < 0 || c2 < 0 || d < 0) return; if (flip) tris.push(a, c2, b, a, d, c2); else tris.push(a, b, c2, a, c2, d); };
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const v0 = V[I(i, j, k)] < 0;
      if (i < nx - 1 && v0 !== (V[I(i + 1, j, k)] < 0)) quad(vid[I(i, j - 1, k - 1)], vid[I(i, j, k - 1)], vid[I(i, j, k)], vid[I(i, j - 1, k)], !v0);
      if (j < ny - 1 && v0 !== (V[I(i, j + 1, k)] < 0)) quad(vid[I(i - 1, j, k - 1)], vid[I(i - 1, j, k)], vid[I(i, j, k)], vid[I(i, j, k - 1)], !v0);
      if (k < nz - 1 && v0 !== (V[I(i, j, k + 1)] < 0)) quad(vid[I(i - 1, j - 1, k)], vid[I(i, j - 1, k)], vid[I(i, j, k)], vid[I(i - 1, j, k)], !v0); }
    return pack(tris.map((t) => [pos[t], nor[t], cols[t]]));
  }
  // 打包成三角形列表：每个顶点 [位置, 法线, 颜色, 材质]
  const pack = (verts, mat = 0) => verts.map((v) => (v.length > 3 ? v : [v[0], v[1], v[2], mat]));
  // ---- 解析曲面（手里的东西）：每个顶点自己的法线，表面是圆滑的 ----
  function tube(out, p0, p1, r0, r1, col, mat = 0, n = 14, cap = true) { const d = sub(p1, p0), L = len(d), z = nrm(d), t0 = Math.abs(z[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; const x = nrm([z[1] * t0[2] - z[2] * t0[1], z[2] * t0[0] - z[0] * t0[2], z[0] * t0[1] - z[1] * t0[0]]), y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    const Q = (p, r, a) => [p[0] + (x[0] * Math.cos(a) + y[0] * Math.sin(a)) * r, p[1] + (x[1] * Math.cos(a) + y[1] * Math.sin(a)) * r, p[2] + (x[2] * Math.cos(a) + y[2] * Math.sin(a)) * r], N = (a) => { const sl = (r0 - r1) / (L || 1); return nrm([x[0] * Math.cos(a) + y[0] * Math.sin(a) + z[0] * sl, x[1] * Math.cos(a) + y[1] * Math.sin(a) + z[1] * sl, x[2] * Math.cos(a) + y[2] * Math.sin(a) + z[2] * sl]); };
    for (let i = 0; i < n; i++) { const a0 = (i / n) * 6.2832, a1 = ((i + 1) / n) * 6.2832, c0 = typeof col === 'function' ? col(i, a0) : col; out.push([Q(p0, r0, a0), N(a0), c0, mat], [Q(p1, r1, a1), N(a1), c0, mat], [Q(p0, r0, a1), N(a1), c0, mat], [Q(p0, r0, a0), N(a0), c0, mat], [Q(p1, r1, a0), N(a0), c0, mat], [Q(p1, r1, a1), N(a1), c0, mat]);
      if (cap) { const mz = [-z[0], -z[1], -z[2]], cc = typeof col === 'function' ? col(-1, 0) : col; out.push([p0, mz, cc, mat], [Q(p0, r0, a1), mz, cc, mat], [Q(p0, r0, a0), mz, cc, mat], [p1, z, cc, mat], [Q(p1, r1, a0), z, cc, mat], [Q(p1, r1, a1), z, cc, mat]); } } }
  function ball(out, c, r, col, mat = 0, la = 10, lo = 16) { for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) { const P = (ii, jj) => { const th = (ii / la) * Math.PI - Math.PI / 2, ph = (jj / lo) * 6.2832, n = [Math.cos(th) * Math.cos(ph), Math.sin(th), Math.cos(th) * Math.sin(ph)]; return [[c[0] + n[0] * r[0], c[1] + n[1] * r[1], c[2] + n[2] * r[2]], nrm([n[0] / r[0], n[1] / r[1], n[2] / r[2]])]; };
      const a = P(i, j), b = P(i + 1, j), c2 = P(i + 1, j + 1), d = P(i, j + 1), cl = typeof col === 'function' ? col(a[0]) : col; out.push([a[0], a[1], cl, mat], [c2[0], c2[1], cl, mat], [b[0], b[1], cl, mat], [a[0], a[1], cl, mat], [d[0], d[1], cl, mat], [c2[0], c2[1], cl, mat]); } }
  function torusArc(out, c, R, r, a0, a1, axisA, axisB, col, mat = 0, n = 16, m = 10) { for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const P = (ii, jj) => { const u = a0 + (a1 - a0) * ii / n, w = (jj / m) * 6.2832, dir = [axisA[0] * Math.cos(u) + axisB[0] * Math.sin(u), axisA[1] * Math.cos(u) + axisB[1] * Math.sin(u), axisA[2] * Math.cos(u) + axisB[2] * Math.sin(u)], ax = nrm([axisA[1] * axisB[2] - axisA[2] * axisB[1], axisA[2] * axisB[0] - axisA[0] * axisB[2], axisA[0] * axisB[1] - axisA[1] * axisB[0]]), nn = nrm([dir[0] * Math.cos(w) + ax[0] * Math.sin(w), dir[1] * Math.cos(w) + ax[1] * Math.sin(w), dir[2] * Math.cos(w) + ax[2] * Math.sin(w)]); return [[c[0] + dir[0] * R + nn[0] * r, c[1] + dir[1] * R + nn[1] * r, c[2] + dir[2] * R + nn[2] * r], nn]; };
      const a = P(i, j), b = P(i + 1, j), c2 = P(i + 1, j + 1), d = P(i, j + 1); out.push([a[0], a[1], col, mat], [b[0], b[1], col, mat], [c2[0], c2[1], col, mat], [a[0], a[1], col, mat], [c2[0], c2[1], col, mat], [d[0], d[1], col, mat]); } }
  // ---- 手 ----
  const handCache = new Map();
  function hand(g, pal) {
    g = Math.round(Math.max(0, Math.min(1, g)) * 8) / 8; const key = g + '|' + pal.join(','); if (handCache.has(key)) return handCache.get(key);
    const fur = mixc(hex(pal[0]), hex(pal[1]), 0.12), furL = mixc(hex(pal[0]), [1, 1, 1], 0.3), furD = mixc(hex(pal[0]), hex(pal[2]), 0.18), SLV = hex('#6e9aa6'), SLVD = hex('#5a8490'), CUF = hex('#ebe0c8'), CUFD = hex('#d2c4a4');
    // 四根手指：每根三节，按握拳程度往掌心卷（指根、中节、指尖各自弯）
    const F = [], ext = [0.92, 1, 0.96, 0.78];
    for (let i = 0; i < 4; i++) { const x0 = -0.082 + i * 0.055, y0 = 0.285 - Math.abs(i - 1.5) * 0.012, sp = (i - 1.5) * 0.06 * (1 - g * 0.8), L = [0.08, 0.058, 0.046].map((l) => l * ext[i]), ang = [0.12 + g * 1.35, 0.18 + g * 1.5, 0.12 + g * 1.0], rad = [0.031, 0.028, 0.026, 0.022].map((r) => r * (i === 3 ? 0.9 : 1));
      let p = [x0, y0, 0.012], a = 0; const pts = [p]; for (let s2 = 0; s2 < 3; s2++) { a += ang[s2]; p = [p[0] + sp * L[s2], p[1] + Math.cos(a) * L[s2], p[2] + Math.sin(a) * L[s2]]; pts.push(p); } F.push({ pts, rad }); }
    const ta = 0.75 - g * 0.35, tb = [0.1, 0.085, 0.02], t1 = [tb[0] + Math.cos(ta) * 0.075, tb[1] + Math.sin(ta) * 0.06, tb[2] + 0.03 + g * 0.05], t2 = [t1[0] + Math.cos(ta + 0.5) * 0.055 - g * 0.05, t1[1] + Math.sin(ta + 0.5) * 0.05, t1[2] + 0.02 + g * 0.06];
    const parts = (p) => {
      let palm = rbox(p, [0, 0.165, 0.004], [0.088, 0.1, 0.022], 0.038); palm = smin(palm, ellip(p, [0, 0.17, -0.012], [0.11, 0.13, 0.042]), 0.04); // 手掌 + 手背微微鼓起
      let fing = 1e9; for (const f of F) { let d = 1e9; for (let s2 = 0; s2 < 3; s2++) d = smin(d, capsule(p, f.pts[s2], f.pts[s2 + 1], f.rad[s2], f.rad[s2 + 1]), 0.014); fing = Math.min(fing, d); }
      const thumb = smin(capsule(p, tb, t1, 0.036, 0.031), capsule(p, t1, t2, 0.031, 0.026), 0.012);
      const wrist = capsule(p, [0, -0.3, 0.02], [0, 0.05, 0.004], 0.07, 0.075);
      let handD = smin(smin(palm, fing, 0.03), thumb, 0.03); handD = smin(handD, wrist, 0.05);
      const ang2 = Math.atan2(p[2] - 0.008, p[0]), cuff = capsule(p, [0, -0.18, 0.012], [0, -0.035, 0.006], 0.106, 0.104) - 0.004 * Math.cos(ang2 * 22); // 罗纹袖口
      const sleeve = capsule(p, [0.005, -0.9, 0.1], [0, -0.16, 0.014], 0.135, 0.11);
      return { handD, cuff, sleeve, palm, fing, thumb };
    };
    const sdf = (p) => { const q = parts(p); return Math.min(q.handD, q.cuff, q.sleeve); };
    const col = (p) => { const q = parts(p), m = Math.min(q.handD, q.cuff, q.sleeve); if (m === q.sleeve) return mixc(SLV, SLVD, Math.max(0, Math.min(1, (p[0] + 0.12) * 3))); if (m === q.cuff) return mixc(CUF, CUFD, 0.5 + 0.5 * Math.cos(Math.atan2(p[2], p[0]) * 22)); const tip = q.fing < q.palm - 0.01 ? Math.max(0, Math.min(1, (p[1] - 0.3) * 8)) : 0; return mixc(mixc(fur, furL, Math.max(0, -p[2] * 4) * 0.5), furD, tip * 0.35); };
    const geo = nets(sdf, col, [-0.2, -0.72, -0.15], [0.24, 0.5, 0.3], 0.0165);
    handCache.set(key, geo); if (handCache.size > 40) handCache.delete(handCache.keys().next().value); return geo;
  }
  // ---- 手里的东西（右手局部坐标；双手捧的东西放在两只手之间，用 ITEM_AT 说清楚） ----
  const itemCache = new Map();
  function item(kind, t) {
    if (itemCache.has(kind)) return itemCache.get(kind); const out = [], M = { flat: 0, metal: 12, plank: 2, cloth: 11 };
    if (kind === 'can') { // 铜绿旧水壶：圆滚滚的壶身、一圈黄铜箍、长壶嘴、莲蓬头、拱起的提手
      const body = [-0.17, 0.2, 0.17], C1 = hex('#6f9e94'), C2 = hex('#c8a860');
      tube(out, [body[0] - 0.12, body[1], body[2]], [body[0] + 0.1, body[1], body[2]], 0.12, 0.115, C1, M.metal, 20); ball(out, [body[0] - 0.12, body[1], body[2]], [0.03, 0.12, 0.12], C1, M.metal, 8, 20); ball(out, [body[0] + 0.1, body[1], body[2]], [0.02, 0.115, 0.115], C1, M.metal, 8, 20);
      tube(out, [body[0] - 0.02, body[1], body[2]], [body[0] + 0.02, body[1], body[2]], 0.124, 0.124, C2, M.metal, 20, false);
      tube(out, [body[0] - 0.08, body[1] + 0.02, body[2]], [-0.5, 0.36, body[2]], 0.035, 0.018, C1, M.metal, 12); ball(out, [-0.51, 0.375, body[2]], [0.04, 0.05, 0.05], C2, M.metal, 8, 12);
      torusArc(out, [body[0] + 0.04, body[1] + 0.06, body[2]], 0.13, 0.018, -0.2, 3.0, [1, 0, 0], [0, 1, 0], C1, M.metal, 18, 8); }
    else if (kind === 'pouch') { const C1 = hex('#c9a46c'), C2 = hex('#8a6438'); ball(out, [0, 0.2, 0.08], [0.11, 0.12, 0.1], (p) => mixc(C1, hex('#b08a58'), 0.5 + 0.5 * Math.sin(p[0] * 60) * Math.sin(p[1] * 60)), M.cloth, 12, 18); tube(out, [0, 0.3, 0.08], [0, 0.36, 0.08], 0.05, 0.065, C1, M.cloth, 14); torusArc(out, [0, 0.31, 0.08], 0.052, 0.01, 0, 6.2832, [1, 0, 0], [0, 0, 1], C2, M.plank, 16, 6);
      for (let i = 0; i < 6; i++) ball(out, [(i - 2.5) * 0.017, 0.36, 0.08 + ((i % 2) - 0.5) * 0.02], [0.012, 0.008, 0.01], i % 2 ? hex('#e8d090') : hex('#a8743a'), M.flat, 4, 6); }
    else if (kind === 'basket') { const C1 = hex('#c89a62'), C2 = hex('#9a6c3c'), base = [0.02, 0.3, 0.14];
      for (let k = 0; k < 6; k++) { const y0 = base[1] - 0.12 + k * 0.035; tube(out, [base[0], y0, base[2]], [base[0], y0 + 0.035, base[2]], 0.15 + k * 0.006, 0.15 + (k + 1) * 0.006, (i) => (i + k) % 2 ? C1 : C2, M.plank, 18, k === 0); } // 一圈圈编的藤
      torusArc(out, [base[0], base[1] + 0.09, base[2]], 0.19, 0.012, 0, 6.2832, [1, 0, 0], [0, 0, 1], C2, M.plank, 20, 6); torusArc(out, [base[0], base[1] + 0.09, base[2]], 0.17, 0.014, 0.2, 2.94, [1, 0, 0], [0, 1, 0], C2, M.plank, 16, 6);
      [['#e8783a', '#4c9a48'], ['#d84a3a', '#3f8a40'], ['#e8c040', '#5aa050'], ['#9a4aa0', '#4c9a48']].forEach(([c1, c2], i) => { const p = [base[0] + (i - 1.5) * 0.07, base[1] + 0.1, base[2] + (i % 2 - 0.5) * 0.06]; ball(out, p, [0.045, 0.04, 0.045], hex(c1), M.flat, 8, 12); ball(out, [p[0], p[1] + 0.05, p[2]], [0.015, 0.03, 0.015], hex(c2), M.flat, 5, 8); }); }
    else if (kind === 'rod') { const C1 = hex('#8a5a34'), C2 = hex('#d8b088'), tip = [-0.05, 1.55, 1.05]; ROD_TIP = tip;
      tube(out, [0, 0.0, 0.05], [0, 0.32, 0.1], 0.04, 0.036, C2, M.cloth, 14); tube(out, [0, 0.32, 0.1], tip, 0.024, 0.006, C1, M.plank, 10); ball(out, [0.07, 0.1, 0.1], [0.012, 0.05, 0.05], hex('#9aaab0'), M.metal, 8, 14); tube(out, [0.04, 0.1, 0.1], [0.082, 0.1, 0.1], 0.052, 0.052, hex('#7a8a90'), M.metal, 16);
      for (let i = 1; i <= 4; i++) { const k = i / 5, p = [tip[0] * k, 0.32 + (tip[1] - 0.32) * k, 0.1 + (tip[2] - 0.1) * k]; torusArc(out, [p[0] - 0.02, p[1], p[2]], 0.014, 0.003, 0, 6.2832, [0, 1, 0], [0, 0, 1], hex('#c8c8c8'), M.metal, 8, 4); } }
    else if (kind === 'logs') { const C1 = hex('#8a6040'), C2 = hex('#e2bc88');
      [[-0.02, 0.0], [0.1, 0.02], [0.04, 0.1]].forEach(([y, zo], i) => { const z = 0.16 + zo, a = [-0.34, y, z], b = [0.34 + (i - 1) * 0.04, y + 0.01, z]; tube(out, a, b, 0.065, 0.06, (j) => (j < 0 ? C2 : j % 3 ? C1 : hex('#74502f')), M.plank, 14, true); }); }
    else if (kind === 'bun') { const C1 = hex('#e0a058'), C2 = hex('#f4d8a0'); ball(out, [0, 0, 0], [0.13, 0.085, 0.11], (p) => mixc(C1, C2, Math.max(0, Math.min(1, -p[1] * 8 + 0.3))), M.flat, 12, 20);
      for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 0.05 + (i % 3) * 0.02; ball(out, [Math.cos(a) * r, 0.08, Math.sin(a) * r], [0.012, 0.006, 0.008], hex('#fff4d8'), M.flat, 4, 6); } }
    const geo = pack(out); itemCache.set(kind, geo); return geo;
  }
  let ROD_TIP = [-0.05, 1.55, 1.05];
  PP.HANDS = { hand, item, rodTip: () => ROD_TIP };
})();
