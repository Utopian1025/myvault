// 体素宠物：把原来的 2D 像素形象“立”起来——同样的配色、同样的大眼白和圆刺帽，
// 只是变成一块一块的小方块，可以转身、侧身、缩成球。渲染时 1 个方块 ≈ 1 个像素，还是像素画的味道。
// 现在做好的：刺猬。其他动物还是原来的 2D（PP.VOX.has 只对做好的返回 true）。
(function () {
  const PP = (window.PP = window.PP || {});

  const _tone = new Map();
  function tone(hex, k) { const key = hex + k; let v = _tone.get(key); if (v === undefined) { v = tone0(hex, k); _tone.set(key, v); } return v; }
  function tone0(hex, k) {
    const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const K = '#231c20';

  // ---------- 体素模型 ----------
  // 坐标：x 朝前（鼻子方向），y 朝上，z 朝它的右手边。单位是“格”（R=2 时 1 格 = 半个像素，颗粒更细）。
  class Model {
    constructor() { this.m = new Map(); }
    k(x, y, z) { return ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512); } // 数字当键，比字符串快很多
    set(x, y, z, c, flat, n, m) { this.m.set(this.k(x, y, z), { x, y, z, c, f: !!flat, n: n || null, m: m || '' }); }
    get(x, y, z) { return this.m.get(this.k(x, y, z)); }
    has(x, y, z) { return this.m.has(this.k(x, y, z)); }
    finish() {
      for (const v of this.m.values()) {
        v.out = !this.has(v.x + 1, v.y, v.z) || !this.has(v.x - 1, v.y, v.z) || !this.has(v.x, v.y + 1, v.z) || !this.has(v.x, v.y - 1, v.z) || !this.has(v.x, v.y, v.z + 1) || !this.has(v.x, v.y, v.z - 1);
        if (!v.out) continue;
        if (!v.n) { // 没给法线的：看周围哪边空
          let nx = 0, ny = 0, nz = 0;
          for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
            if ((!dx && !dy && !dz) || this.has(v.x + dx, v.y + dy, v.z + dz)) continue;
            const w = 1 / (dx * dx + dy * dy + dz * dz); nx += dx * w; ny += dy * w; nz += dz * w;
          }
          const l = Math.hypot(nx, ny, nz) || 1; v.n = [nx / l, ny / l, nz / l];
        }
        v.k = this.k(v.x, v.y, v.z);
        // 4 档柔和的明暗（像黏土小模型那样，一块块干净的色面，不是噪点）
        v.t = v.f ? [v.c, v.c, v.c, v.c] : [tone(v.c, 0.12), v.c, tone(v.c, -0.1), tone(v.c, -0.2)];
      }
      this.list = [...this.m.values()].filter((v) => v.out);
      return this;
    }
  }
  const nrm = (a, b, c) => { const l = Math.hypot(a, b, c) || 1; return [a / l, b / l, c / l]; };
  // 椭球：在里面吗 + 那一点的法线
  const E = (cx, cy, cz, rx, ry, rz) => ({ cx, cy, cz, rx, ry, rz,
    d(x, y, z) { const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz; return a * a + b * b + c * c; },
    n(x, y, z) { return nrm((x - cx) / (rx * rx), (y - cy) / (ry * ry), (z - cz) / (rz * rz)); } });
  // 这一列（y,z）最靠前的方块
  function frontV(M, y, z, from) { for (let x = from; x > -from; x--) { const v = M.get(x, y, z); if (v) return v; } return null; }

  // ---------- 刺猬（R 倍细） ----------
  // 圆滚滚的一团：后背和头顶是一顶整齐的刺帽，前面一张奶油色的大圆脸；
  // 大白眼睛 + 小黑豆瞳孔（呆呆的），小鼻头，ω 嘴，腮红，两只小圆耳朵，四只小短脚。
  // pose：leg 走路帧（0 站 / 1~4 / 5 挠痒）、curl 缩球 0~1、dip 低头（-1 抬头）、spike 炸毛、lie 趴下
  function hedgehogBody(C, P, R) {
    const M = new Model(), c = P.curl || 0, dip = P.dip || 0, lie = P.lie || 0, spike = P.spike || 0;
    const open = Math.max(0, 1 - c * 1.3);
    const B = E(-1, 9.4 - lie * 1.8 - c * 0.3, 0, 12 - c * 1.6, 9.2 - lie * 1.9 + c * 0.9, 10.6 - c * 0.5); // 身子
    const CP = E(B.cx - 1.4, B.cy + 1.0, 0, B.rx + 1.1, B.ry + 1.0, B.rz + 1.0);                            // 刺帽
    const SN = E(B.cx + B.rx * 0.9 + 0.8 + dip * 0.2, B.cy - 2.1 - dip * 0.9, 0, 2.9 * Math.max(0.3, open), 2.3 * Math.max(0.3, open), 2.6 * Math.max(0.3, open)); // 小尖嘴
    const EARS = [-1, 1].map((s) => E(B.cx + B.rx * 0.5, B.cy + B.ry * 0.74, s * B.rz * 0.6, 2.0 * open, 2.1 * open, 1.7 * open));
    // 刺帽前沿：额头往下斜，带一排整齐的小锯齿（刘海）
    const cutX = (y, z) => lerp(7.4, 18, Math.max(0, c * 1.2 - 0.1)) + (y - B.cy) * 0.22 - 0.8 * Math.abs(((z * 0.7 + 100.5) % 2) - 1);
    const capBottom = lerp(3.4, -2, Math.min(1, c * 1.4)) - lie;
    // 脚
    const feet = [];
    if (c < 0.6) {
      const L = P.leg || 0, st = [0, 0, 0, 0], fw = [0, 0, 0, 0];
      // 走路：对角两只脚一起抬起来往前迈，另外两只往后蹬（步子要大，小岛上看得出来）
      if (L === 1) { st[0] = st[3] = 1.1; fw[0] = fw[3] = 2.2; fw[1] = fw[2] = -1.3; } else if (L === 2) { fw[0] = fw[3] = 1.7; fw[1] = fw[2] = -1.7; }
      else if (L === 3) { st[1] = st[2] = 1.1; fw[1] = fw[2] = 2.2; fw[0] = fw[3] = -1.3; } else if (L === 4) { fw[1] = fw[2] = 1.7; fw[0] = fw[3] = -1.7; }
      else if (L === 5) { st[2] = 2.4; fw[2] = 2; }
      [[B.cx + B.rx * 0.52, -B.rz * 0.48], [B.cx + B.rx * 0.52, B.rz * 0.48], [B.cx - B.rx * 0.5, -B.rz * 0.52], [B.cx - B.rx * 0.5, B.rz * 0.52]].forEach(([x, z], i) => feet.push(E(x + fw[i], 0.75 + st[i] - lie * 0.6, z, 2.2, 1.35, 1.6)));
    }
    // 刺帽纹理：整齐的一排排小刺尖（深色细缝 + 浅色短刺），从额头往后梳
    const capTex = (x, y, z) => {
      const th = Math.atan2(z, y - (B.cy - 4)), ph = Math.atan2(x - (B.cx + 4), Math.hypot(z, y - B.cy));
      const row = ph * 3.2, ri = Math.floor(row), u = th * 4.4 + (ri & 1) * 0.5, fu = u - Math.floor(u), fr = row - ri;
      if (fu < 0.09) return C.dark;            // 一条条细细的深色刺缝
      if (fr > 0.62 && fr < 0.8 && fu > 0.42 && fu < 0.62) return tone(C.spine, 0.16); // 很淡的一点刺尖反光
      return C.spine;
    };
    const X0 = -16 * R, X1 = 18 * R, Y1 = 25 * R, Z0 = 14 * R;
    const parts = [B, CP, ...(open > 0.05 ? [SN] : []), ...(open > 0.3 ? EARS : []), ...feet];
    for (let j = -1 * R; j <= Y1; j++) for (let k = -Z0; k <= Z0; k++) {
      // 这一列里只扫各个部件实际占到的那一段 x（快很多）
      const y = (j + 0.5) / R, z = (k + 0.5) / R; let lo = 1e9, hi = -1e9;
      for (const e of parts) { const t = 1 - ((y - e.cy) / e.ry) ** 2 - ((z - e.cz) / e.rz) ** 2; if (t > 0) { const w = e.rx * Math.sqrt(t); if (e.cx - w < lo) lo = e.cx - w; if (e.cx + w > hi) hi = e.cx + w; } }
      if (hi < lo) continue;
      for (let i = Math.max(X0, Math.floor(lo * R) - 1); i <= Math.min(X1, Math.ceil(hi * R) + 1); i++) {
      const x = (i + 0.5) / R;
      if (open > 0.3) { let he = null; for (const e of EARS) if (e.d(x, y, z) <= 1) { he = e; break; }
        if (he) { const front = x > he.cx + 0.4 && Math.abs(z - he.cz) < 0.95 && Math.abs(y - he.cy) < 1.2; M.set(i, j, k, front ? C.inner : C.base, front, he.n(x, y, z), 'ear'); continue; } }
      // 刺帽
      if (CP.d(x, y, z) <= 1 && x < cutX(y, z) && y > capBottom) { M.set(i, j, k, capTex(x, y, z), false, CP.n(x, y, z), 'cap'); continue; }
      if (B.d(x, y, z) <= 1) { M.set(i, j, k, y < B.cy - B.ry * 0.62 && x < B.cx + B.rx * 0.6 ? C.light || C.base : C.base, false, B.n(x, y, z), 'face'); continue; }
      if (open > 0.05 && SN.d(x, y, z) <= 1) { M.set(i, j, k, y > SN.cy + 0.6 ? (C.light || C.base) : C.base, false, SN.n(x, y, z), 'snout'); continue; }
      for (const e of feet) if (e.d(x, y, z) <= 1) { M.set(i, j, k, x > e.cx + 1.3 ? tone(C.paw, -0.35) : C.paw, false, e.n(x, y, z), 'foot'); break; }
    } }
    // 刺：帽子表面上一排排小尖刺（往后梳；缩成球 / 炸毛时竖起来），每根是一个小圆锥
    const back = spike || c > 0.5 ? 0.15 : 0.6, len = spike ? 2.8 : 2.0;
    for (let r = 0; r < 6; r++) {
      const ph = lerp(-0.2, 1.3, r / 5), n = 13;
      for (let q = 0; q < n; q++) {
        const th = (q + (r & 1) * 0.5) / n * Math.PI * 2;
        // 帽子表面上的点：从帽子中心沿方向打出去
        let dx = Math.cos(ph) * Math.cos(th) * -1, dy = Math.sin(ph), dz = Math.cos(ph) * Math.sin(th);
        if (dy < -0.35 && c < 0.5) continue;
        const t = 1 / Math.sqrt((dx / CP.rx) ** 2 + (dy / CP.ry) ** 2 + (dz / CP.rz) ** 2);
        const bx = CP.cx + dx * t, by = CP.cy + dy * t, bz = dz * t;
        if (bx >= cutX(by, bz) - 0.3 || by <= capBottom + 0.5) continue;
        const nn = CP.n(bx, by, bz); const d = nrm(nn[0] - back, nn[1] + 0.1, nn[2]);
        const steps = Math.ceil(len * R * 1.6);
        for (let s2 = 0; s2 <= steps; s2++) {
          const f = s2 / steps, rad = (1 - f) * 0.85, px = bx + d[0] * len * f, py = by + d[1] * len * f, pz = bz + d[2] * len * f;
          const col = f > 0.72 ? C.tip : C.spine;
          for (let a = -1; a <= 1; a++) for (let b2 = -1; b2 <= 1; b2++) for (let e2 = -1; e2 <= 1; e2++) {
            const ox = a * rad, oy = b2 * rad, oz = e2 * rad; if (ox * ox + oy * oy + oz * oz > rad * rad + 0.05) continue;
            const vi = Math.floor((px + ox) * R), vj = Math.floor((py + oy) * R), vk = Math.floor((pz + oz) * R);
            if (!M.has(vi, vj, vk)) M.set(vi, vj, vk, col, false, nn, 'spike');
          }
        }
      }
    }
    M.B = B; M.SN = SN; M.open = open; M.R = R; M.dip = dip;
    return M.finish();
  }

  // ---------- 刺猬：脸 ----------
  // 大白眼睛 + 细黑边 + 小黑豆瞳孔 + 一点高光：呆呆萌萌；各种表情都是同一套画法
  function hedgehogFace(M, C, F) {
    const o = new Map(); if (M.open < 0.35) return o;
    const R = M.R, B = M.B, SN = M.SN, op = M.open, dip = M.dip;
    const ey = B.cy + 0.5 - dip * 0.55, ez = 3.35 * op, rw = 1.95 * op;
    const put = (y, z, col, mats) => { const v = frontV(M, Math.floor(y * R), Math.floor(z * R), 26 * R); if (v && mats.includes(v.m)) o.set(v.k || M.k(v.x, v.y, v.z), col); };
    const W = '#ffffff', KK = '#2a2024';
    const st = F.eyes || 'open';
    for (let j = Math.floor((ey - 3.5) * R); j <= Math.ceil((ey + 3.5) * R); j++) for (const s of [-1, 1]) for (let k = Math.floor((s * ez - 3.5) * R); k <= Math.ceil((s * ez + 3.5) * R); k++) {
      const y = (j + 0.5) / R, z = (k + 0.5) / R, dy = y - ey, dz = (z - s * ez) * s; // dz>0 = 朝外侧
      const d = Math.hypot(dy / 1.06, dz);
      let col = null;
      if (st === 'closed' || st === 'happy') {
        const arc = Math.abs(d - rw * 0.72) < 0.32 / op && (st === 'closed' ? dy < -0.1 : dy > 0.1);
        if (arc) col = KK;
      } else if (d < rw + 0.45) {
        if (d >= rw) col = KK; // 细黑边
        else {
          col = W;
          const pr = st === 'wide' ? 0.6 : 1.0, py = st === 'look' ? 0.75 : -0.3, pz = st === 'wide' ? 0 : -0.45; // 瞳孔微微往里、往下：呆呆地看着前面
          const pd = Math.hypot(dy - py, dz - pz);
          if (st === 'dizzy') { if (Math.abs(d - rw * 0.55) < 0.3 || d < 0.3) col = KK; }
          else if (pd < pr * op) col = KK;
          if (st !== 'dizzy' && Math.hypot(dy - (py + 0.45), dz - (pz - 0.4)) < 0.38) col = W; // 高光
          if (st === 'sleepy' && dy > 0.2) col = dy < 0.75 ? KK : null;
          if (st === 'angry' && dy > 1.1 - dz * 0.45) col = KK;
        }
      }
      if (col) put(y, z, col, ['face', 'cap']);
    }
    // 腮红
    for (const s of [-1, 1]) for (let j = Math.floor((ey - 3.6) * R); j <= Math.ceil((ey - 1.6) * R); j++) for (let k = Math.floor((s * 6.3 - 1.6) * R); k <= Math.ceil((s * 6.3 + 1.6) * R); k++) {
      const y = (j + 0.5) / R, z = (k + 0.5) / R; if (((y - (ey - 2.6)) / 0.62) ** 2 + ((z - s * 6.3) / 1.25) ** 2 < 1) put(y, z, F.blush ? tone(C.inner, 0.05) : tone(C.inner, 0.38), ['face']);
    }
    // 鼻头（小尖嘴最前面）+ 一点高光
    const ny = SN.cy + SN.ry * 0.35, sniff = F.sniff ? 0.25 : 0;
    for (let j = Math.floor((ny - 1.2) * R); j <= Math.ceil((ny + 1.2) * R); j++) for (let k = Math.floor(-1.3 * R); k <= Math.ceil(1.3 * R); k++) {
      const y = (j + 0.5) / R, z = (k + 0.5) / R, d = Math.hypot((y - ny - sniff) / 0.8, z / 1.0);
      if (d < 1) put(y, z, Math.hypot(y - ny - sniff - 0.35, z - 0.35) < 0.3 ? '#8a6a72' : KK, ['snout']);
    }
    // 嘴：ω / 张嘴 / 吐舌头 / o
    const my = SN.cy - SN.ry * 0.45, mouth = F.mouth || 'w';
    for (let j = Math.floor((my - 1.6) * R); j <= Math.ceil((my + 0.8) * R); j++) for (let k = Math.floor(-1.8 * R); k <= Math.ceil(1.8 * R); k++) {
      const y = (j + 0.5) / R, z = (k + 0.5) / R, dy = y - my;
      let col = null;
      if (mouth === 'open' || mouth === 'o') { const d = Math.hypot(dy / 0.7, z / 0.75); if (d < 1) col = mouth === 'o' && d < 0.55 ? '#5a2a34' : dy < -0.15 ? '#ff8aa0' : KK; }
      else { const w = mouth === 'smile' ? 0.75 : 0.55; for (const s of [-1, 1]) if (Math.abs(Math.hypot(dy, z - s * w) - w) < 0.22 && dy < 0.05) col = KK; if (mouth === 'tongue' && Math.hypot((dy + 0.75) / 0.5, z / 0.45) < 1) col = '#ff8aa0'; }
      if (col) put(y, z, col, ['snout', 'face']);
    }
    return o;
  }

  // ---------- 渲染 ----------
  const LIGHT = (() => { const l = [-0.45, 0.8, 0.55], n = Math.hypot(...l); return l.map((v) => v / n); })();
  // yaw：绕竖轴转（0 = 侧面朝右，π/2 = 正脸朝镜头）；pitch：俯视角；roll：绕前后轴打滚；sq：上下压扁(<1)/拉长(>1)
  function render(M, over, o) {
    const W = o.w, H = o.h, SS = 4, WS = W * SS, HS = H * SS;
    const yaw = o.yaw, pitch = o.pitch, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const roll = o.roll || 0, cr = Math.cos(roll), sr = Math.sin(roll), RC = 11; // 打滚绕身子中心
    const sq = o.sq || 1, sx = 1 / Math.sqrt(sq), lean = o.lean || 0;
    const zb = new Float32Array(WS * HS).fill(-1e9), dd = new Array(WS * HS).fill(null);
    const hx = 0.5 * (Math.abs(cy) + Math.abs(sy)) * 0.97 * Math.max(1, sx), hy = 0.5 * (cp + sp * (Math.abs(cy) + Math.abs(sy))) * 0.97 * Math.max(1, sq);
    for (const v of M.list) {
      let px = v.x + 0.5, py = v.y + 0.5, pz = v.z + 0.5, n0 = v.n[0], n1 = v.n[1], n2 = v.n[2];
      if (roll) { const a = px, b = py - RC; px = a * cr - b * sr; py = a * sr + b * cr + RC; const m0 = n0 * cr - n1 * sr, m1 = n0 * sr + n1 * cr; n0 = m0; n1 = m1; }
      py = py * sq; px *= sx; pz *= sx; px += lean * py / 20;
      const rx = px * cy - pz * sy, rz = px * sy + pz * cy;
      const ry = py * cp - rz * sp, depth = py * sp + rz * cp;
      const sxp = o.ox + rx, syp = o.oy - ry;
      const ovc = over && over.get(v.k);
      let col;
      if (ovc) col = ovc;
      else if (v.f) col = v.c;
      else {
        const nx = n0 * cy - n2 * sy, nz0 = n0 * sy + n2 * cy, ny = n1 * cp - nz0 * sp, nz = n1 * sp + nz0 * cp;
        const l = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
        col = v.t[l > 0.6 ? 0 : l > -0.05 ? 1 : l > -0.45 ? 2 : 3];
      }
      const cx0 = (sxp - hx) * SS, cx1 = (sxp + hx) * SS, cy0 = (syp - hy) * SS, cy1 = (syp + hy) * SS;
      for (let yy = Math.max(0, Math.ceil(cy0 - 0.5)), y1 = Math.min(HS - 1, Math.floor(cy1 - 0.5)); yy <= y1; yy++)
        for (let xx = Math.max(0, Math.ceil(cx0 - 0.5)), x1 = Math.min(WS - 1, Math.floor(cx1 - 0.5)); xx <= x1; xx++) {
          const i = yy * WS + xx; if (depth > zb[i]) { zb[i] = depth; dd[i] = col; }
        }
    }
    const d = new Array(W * H).fill(null), h2 = SS >> 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d[y * W + x] = dd[(y * SS + h2) * WS + x * SS + h2];
    return d;
  }

  // ---------- 缓存 ----------
  const bodies = new Map(), faces = new Map(), frames = new Map(), warmed = new Set();
  const palKey = (C) => C.spine + C.base + C.tip;
  // 每个新姿势第一次要现算（几十毫秒）：先拿最接近的已经算好的顶上，真正的放到空闲时再算，画面不卡
  let MID = 0;
  const queue = [], queued = new Set();
  function keyOf(C, P) { return palKey(C) + '|' + [P.leg || 0, P.curl || 0, P.dip || 0, P.spike || 0, P.lie || 0].join(','); }
  function build(C, P) { const k = keyOf(C, P); let m = bodies.get(k); if (!m) { m = hedgehogBody(C, P, RES); m.id = ++MID; bodies.set(k, m); if (bodies.size > 120) bodies.delete(bodies.keys().next().value); } return m; }
  function pump() {
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 30) { const [C, P, k] = queue.shift(); queued.delete(k); build(C, P); }
    if (queue.length) setTimeout(pump, 60);
  }
  function body(C, P, sync) {
    const k = keyOf(C, P); const m = bodies.get(k); if (m) return m;
    if (sync) return build(C, P);
    // 找替身：同样缩球程度、站着的那个；再不行就同毛色随便一个；都没有就现算
    const alt = bodies.get(keyOf(C, { curl: P.curl })) || bodies.get(keyOf(C, {})) || [...bodies.entries()].find(([kk]) => kk.startsWith(palKey(C)))?.[1];
    if (!alt) return build(C, P);
    if (!queued.has(k)) { queued.add(k); queue.push([C, Object.assign({}, P), k]); if (queue.length === 1) setTimeout(pump, 30); }
    return alt;
  }
  // 预热：常用姿势在空闲时先算好
  function warm(C) {
    const L = [{}, { leg: 1 }, { leg: 2 }, { leg: 3 }, { leg: 4 }, { dip: 1 }, { dip: 2 }, { curl: 0.65 }, { curl: 0.6 }, { curl: 1 }, { spike: 1 }, { lie: 1 }, { leg: 1, spike: 1 }, { dip: -1 }, { leg: 5, dip: 1 }, { leg: 5 }, { leg: 1, dip: 1 }, { leg: 3, dip: 1 }];
    for (const P of L) body(C, P);
  }
  function face(M, C, F) {
    const k = [F.eyes, F.mouth, F.sniff ? 1 : 0, F.blush ? 1 : 0].join(',');
    let fm = M.faces || (M.faces = new Map()), o = fm.get(k);
    if (!o) { o = hedgehogFace(M, C, F); fm.set(k, o); }
    return o;
  }

  // ---------- 动作：把宠物的 anim 变成 3D 姿势 ----------
  // 返回 { P 身子, F 脸, sq 压扁拉长, bob 上下, roll 打滚, lean 前倾, spin 额外转身 }
  function poseOf(p) {
    const t = p.t || 0, a = p.anim || 'idle', P = { leg: 0, curl: 0, dip: 0, spike: 0, lie: 0 };
    const F = { eyes: p.eyes || 'open', mouth: p.mouth || 'w', blush: !!p.blush, sniff: false };
    let sq = 1, bob = 0, roll = 0, lean = 0, spin = 0;
    const breathe = Math.sin(t * 2.1) > 0.2 ? 1 : 0;
    const J = p.jelly; if (J && J.sy) sq *= 1 + (J.sy - 1) * 0.8;
    if (F.eyes === 'wide' || F.eyes === 'angry') P.spike = 1; // 吓到 / 生气：刺炸起来
    switch (a) {
      case 'idle': case 'sit': {
        // 发呆时自己找点小事做：嗅嗅 / 抖抖刺 / 低头看看 / 歪头
        const ph = Math.floor(t / 4.5) % 6, lt = t % 4.5;
        sq *= breathe ? 1.02 : 1;
        if (ph === 1 && lt < 2.2) { F.sniff = Math.floor(t * 8) % 2 === 0; P.dip = Math.floor(t * 4) % 2 ? 1 : 0; }
        else if (ph === 3 && lt < 0.7) { P.spike = 1; sq *= Math.floor(t * 20) % 2 ? 1.04 : 0.97; }
        else if (ph === 4 && lt < 1.6) P.dip = 2;
        else if (ph === 5 && lt < 1.4) lean = Math.sin(lt * 4) * 1.2;
        break;
      }
      case 'walk': { const s = Math.floor(t * 9) % 4; P.leg = s + 1; bob = s % 2 ? 0 : 1; lean = s === 0 ? 0.6 : s === 2 ? -0.3 : 0.15; sq *= s % 2 ? 1.03 : 0.97; F.sniff = s === 1; break; }
      case 'run': { const s = Math.floor(t * 14) % 4; P.leg = s + 1; bob = s % 2 ? 0 : 2; sq *= s % 2 ? 0.95 : 1.04; lean = 1.6; break; }
      case 'sleep': P.curl = 0.65; F.eyes = 'closed'; sq *= breathe ? 1.03 : 0.98; break;
      case 'lie': P.lie = 1; sq *= breathe ? 1.02 : 1; break;
      case 'eat': { const s = Math.sin(t * 11) > 0; P.dip = s ? 2 : 1; F.mouth = s ? 'open' : 'w'; break; }
      case 'drink': { const s = Math.floor(t * 6) % 2; P.dip = 2; F.mouth = s ? 'tongue' : 'w'; break; }
      case 'held': {
        // 被拎起来：缩成一团，眼睛从刺里偷偷往外看；挣扎时一抖一抖
        P.curl = p.struggle ? 0.55 : 0.6; P.spike = p.struggle ? 1 : 0; roll = p.struggle ? Math.sin(t * 18) * 0.18 : Math.sin(t * 2) * 0.08;
        sq *= 1 + (p.stretch || 0) * 0.08; break;
      }
      case 'jump': sq *= 1.12; P.leg = 1; P.spike = 1; break;
      case 'fall': sq *= 1.08; P.spike = 1; F.eyes = F.eyes === 'open' ? 'wide' : F.eyes; break;
      case 'land': sq *= 0.84; break;
      case 'poop': sq *= Math.floor(t * 14) % 2 ? 0.95 : 0.97; P.dip = 1; break;
      case 'crouch': P.lie = 1; lean = Math.floor(t * 6) % 2 ? 1 : -1; P.spike = 1; break;
      case 'stretch': P.dip = 2; sq *= 0.9; lean = 2.2; break;
      case 'groom': P.leg = 5; P.dip = Math.floor(t * 6) % 2; lean = -1; F.eyes = 'happy'; break;
      case 'dance': { const s = Math.floor(t * 4) % 2; spin = t * 5; bob = s; sq *= s ? 1.06 : 0.94; P.leg = s ? 1 : 3; break; }
      case 'look_up': P.dip = -1; break;
      case 'think': P.dip = -1; F.eyes = 'look'; break;
      case 'knead': case 'type': { const s = Math.floor(t * 5) % 2; P.leg = s ? 1 : 3; P.dip = 1; break; }
      case 'roll': P.curl = 1; roll = -t * 7; bob = 0; break;
      case 'curl': P.curl = 1; break;
    }
    if (p.squash) sq *= 1 - p.squash * 0.06;
    return { P, F, sq, bob, roll, lean, spin };
  }

  // 每只宠物身上记一个“正在朝哪转”的角度，平滑地转过去（转身时能看到它真的转过来）
  const BASE = { walk: 0.12, run: 0.06, idle: 0.3, sit: 0.3, sleep: 0.36, held: 0.5, eat: 0.22, drink: 0.22 };
  function yawFor(pet) {
    const a = pet.anim || 'idle', f = pet.facing >= 0 ? 1 : -1, t = pet.t || 0;
    let b = BASE[a] != null ? BASE[a] : 0.3;
    // 发呆时偶尔正脸看看你
    if ((a === 'idle' || a === 'sit') && Math.floor(t / 4.5) % 6 === 2) b = 0.5;
    if (pet.petting > 0 || pet.held) b = 0.5;
    const target = (f > 0 ? b : 1 - b) * Math.PI;
    const dt = Math.min(0.2, Math.max(0, t - (pet._vyT || t))); pet._vyT = t;
    if (pet._vy == null) pet._vy = target;
    let d = target - pet._vy; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    pet._vy += d * Math.min(1, dt * 9);
    return pet._vy;
  }

  // ---------- 接到 drawPet ----------
  // 输出和 2D 一样能直接 blit 的 Buf：宽 44（左右各多 6 格，转斜了也放得下），往上多留 8 格给刺尖
  // RES：1 个像素里放几格（2 = 颗粒细一倍）。缓冲区按“格”算，blit 时自动缩回去
  const RES = 2, BW = 44 * RES, BH = 36 * RES, TX = 6 * RES, TY = 8 * RES, GROUND = (31 + 8) * RES; // 第 31 行是脚底（和 2D 一样），下面多留 4 行放斜着看时伸出来的脚
  function drawPet(p) {
    const SPR = PP.SPR, C = p.pal, ps = poseOf(p);
    if (!warmed.has(palKey(C))) { warmed.add(palKey(C)); body(C, {}, true); warm(C); }
    const M = body(C, ps.P), over = face(M, C, ps.F);
    let yaw = p.portrait ? Math.PI / 2 : p.vyaw != null ? p.vyaw : (p.facing >= 0 ? 0.3 : 0.7) * Math.PI;
    yaw += ps.spin;
    const pitch = p.portrait ? 0.12 : 0.36;
    const yq = Math.round(yaw / (Math.PI / 32)), rq = Math.round((ps.roll || 0) / (Math.PI / 16)), sqq = Math.round(ps.sq * 40);
    const key = M.id + '|' + [ps.F.eyes, ps.F.mouth, ps.F.sniff ? 1 : 0, ps.F.blush ? 1 : 0].join(',') + '|' + [yq, rq, sqq, ps.bob, Math.round(ps.lean * 2), pitch, p.scene ? 1 : 0, p.grade || ''].join(',');
    let b = frames.get(key);
    if (b) { frames.delete(key); frames.set(key, b); return b; }
    b = new SPR.Buf(BW, BH, TY); b.tx = TX; b.res = RES;
    b.d = render(M, over, { w: BW, h: BH + TY, yaw: yq * (Math.PI / 32), pitch, roll: rq * (Math.PI / 16), sq: sqq / 40, lean: Math.round(ps.lean * 2) / 2 * RES, ox: BW / 2, oy: GROUND + 0.5 - ps.bob * RES });
    SPR._h.outlineSel(b);
    if (SPR._h.sceneRim) SPR._h.sceneRim(b, p);
    frames.set(key, b); if (frames.size > 400) frames.delete(frames.keys().next().value);
    return b;
  }

  // 只给做好的动物开 3D；设置里可以关（settings.vox === false 时全用 2D）
  const READY = new Set([]); // 刺猬改回 2D 像素版（3D 不好看）；以后哪只做好了再放进来
  const has = (sp) => READY.has(sp) && !(PP.G && PP.G.save && PP.G.save.settings && PP.G.save.settings.vox === false);
  PP.VOX = { Model, RES, has, drawPet, yawFor, poseOf, render, body, face, _cache: { bodies, frames } };
})();
