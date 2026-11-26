// 浮岛里动物的 3D 形象（0.38）：画风不变——还是原来那张像素画，只是把它「吹鼓」成立体的：
// 每个像素按离轮廓多远往前后鼓起来（身子中间最厚、边上最薄，像一只毛绒玩偶），正反两面都是原来的颜色，
// 法线按鼓起来的弧度算，所以在浮岛的光照里有明暗、有影子遮挡，能被墙和家具挡住，转着看也是一个圆鼓鼓的小东西。
(function () {
  const PP = (window.PP = window.PP || {});
  const cache = new Map();
  const hexRGB = new Map(), rgb = (c) => { let v = hexRGB.get(c); if (!v) { v = [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255]; hexRGB.set(c, v); } return v; };
  /* 一帧像素 → 模板（坐标单位：精灵像素；X 往右、Y 往下、D 往镜头方向） */
  function build(buf) {
    const w = buf.w, h = buf.h, res = buf.res || 1, d = buf.d, op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[y * w + x] != null;
    // 离轮廓的距离（4 邻域，两遍扫描）
    const D = new Float32Array(w * h); for (let i = 0; i < w * h; i++) D[i] = d[i] == null ? 0 : 99;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!D[i]) continue; D[i] = Math.min(D[i], (x ? D[i - 1] : 0) + 1, (y ? D[i - w] : 0) + 1); }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!D[i]) continue; D[i] = Math.min(D[i], (x < w - 1 ? D[i + 1] : 0) + 1, (y < h - 1 ? D[i + w] : 0) + 1); }
    const Dm = 5.5 * res, T = 4.2 * res, th = (i) => { if (!D[i]) return 0; const k = Math.min(1, (D[i] - 0.5) / Dm); return T * Math.sqrt(1 - (1 - k) * (1 - k)) + 0.35 * res; };
    // 角点的高度 = 四周像素的平均（外面算 0）：轮廓上前后两面正好合在一起
    const W1 = w + 1, HV = new Float32Array(W1 * (h + 1));
    for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) { let s = 0, n = 0, any = 0; for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const xx = x + dx, yy = y + dy; n++; if (op(xx, yy)) { s += th(yy * w + xx); any = 1; } } HV[y * W1 + x] = any ? s / n : 0; }
    const hv = (x, y) => HV[Math.max(0, Math.min(h, y)) * W1 + Math.max(0, Math.min(w, x))];
    const nrmAt = (x, y, sg) => { const gx = (hv(x + 1, y) - hv(x - 1, y)) / 2, gy = (hv(x, y + 1) - hv(x, y - 1)) / 2; let nx = -gx * sg, ny = -gy * sg, nd = sg; const l = Math.hypot(nx, ny, nd); return [nx / l, ny / l, nd / l]; };
    const P = [], N = [], C = [];
    const vtx = (x, y, sg, col) => { P.push((x - (buf.tx || 0)) / res, (y - (buf.ty || 0)) / res, (hv(x, y) * sg) / res); const n = nrmAt(x, y, sg); N.push(n[0], n[1], n[2]); C.push(col[0], col[1], col[2]); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = d[y * w + x]; if (c == null) continue; const col = rgb(c), back = [col[0] * 0.9, col[1] * 0.9, col[2] * 0.9];
      vtx(x, y, 1, col); vtx(x + 1, y + 1, 1, col); vtx(x + 1, y, 1, col); vtx(x, y, 1, col); vtx(x, y + 1, 1, col); vtx(x + 1, y + 1, 1, col);
      vtx(x, y, -1, back); vtx(x + 1, y, -1, back); vtx(x + 1, y + 1, -1, back); vtx(x, y, -1, back); vtx(x + 1, y + 1, -1, back); vtx(x, y + 1, -1, back); }
    return { P: new Float32Array(P), N: new Float32Array(N), C: new Float32Array(C), n: P.length / 3 };
  }
  function tplOf(buf) { const key = buf.w + 'x' + buf.h + ':' + (buf.tx || 0) + ',' + (buf.ty || 0) + ',' + (buf.res || 1) + ':' + buf.d.join(','); let t = cache.get(key); if (!t) { if (cache.size > 400) cache.clear(); t = build(buf); cache.set(key, t); } return t; }
  /* 放进当帧的网格：脚在 base（u,v,z），right 是精灵往右的方向（场景平面上的单位向量），toward 是朝镜头的方向；k 是 1 个精灵像素在场景里多宽（水平格） */
  const ZK = 2.83 / 1.155;
  function put(m, buf, base, right, toward, k, o = {}) {
    const T = tplOf(buf), pk = 32 * (m.pick || 0), mat = o.mat || 0, sw = -1, fx = o.flip ? -1 : 1, cx = 16, fy = 31;
    for (let i = 0; i < T.n; i++) { const b = i * 3, X = (T.P[b] - cx) * fx, Y = fy - T.P[b + 1], Dd = T.P[b + 2], nx = T.N[b] * fx, ny = -T.N[b + 1], nd = T.N[b + 2];
      m.p.push(base[0] + (right[0] * X + toward[0] * Dd) * k, base[1] + (right[1] * X + toward[1] * Dd) * k, base[2] + Y * k * ZK);
      const wx = right[0] * nx + toward[0] * nd, wy = right[1] * nx + toward[1] * nd, wz = ny, l = Math.hypot(wx, wy, wz) || 1; m.n.push(wx / l, wy / l, wz / l);
      m.c.push(T.C[b], T.C[b + 1], T.C[b + 2]); m.m.push(mat + pk); m.w.push(sw); }
  }
  PP.PET3D = { put, tplOf };
})();
