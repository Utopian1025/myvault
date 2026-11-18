// 体素宠物：把原来的 2D 像素形象“立”起来——同样的配色、同样的大眼白和圆刺帽，
// 只是变成一块一块的小方块，可以转身、侧身、缩成球。渲染时 1 个方块 ≈ 1 个像素，还是像素画的味道。
// 现在做好的：刺猬。其他动物还是原来的 2D（PP.VOX.has 只对做好的返回 true）。
(function () {
  const PP = (window.PP = window.PP || {});

  function tone(hex, k) {
    const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const K = '#231c20';

  // ---------- 体素模型 ----------
  // 坐标：x 朝前（鼻子方向），y 朝上，z 朝它的右手边。
  class Model {
    constructor() { this.m = new Map(); }
    k(x, y, z) { return x + ',' + y + ',' + z; }
    set(x, y, z, c, flat) { this.m.set(this.k(x, y, z), { x, y, z, c, f: !!flat }); }
    get(x, y, z) { return this.m.get(this.k(x, y, z)); }
    has(x, y, z) { return this.m.has(this.k(x, y, z)); }
    // 法线：看周围 2 格内哪边是空的；表面方块才参与渲染
    finish() {
      for (const v of this.m.values()) {
        v.out = !this.has(v.x + 1, v.y, v.z) || !this.has(v.x - 1, v.y, v.z) || !this.has(v.x, v.y + 1, v.z) || !this.has(v.x, v.y - 1, v.z) || !this.has(v.x, v.y, v.z + 1) || !this.has(v.x, v.y, v.z - 1);
        if (!v.out) continue;
        let nx = 0, ny = 0, nz = 0;
        for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
          if ((!dx && !dy && !dz) || this.has(v.x + dx, v.y + dy, v.z + dz)) continue;
          const w = 1 / (dx * dx + dy * dy + dz * dz); nx += dx * w; ny += dy * w; nz += dz * w;
        }
        const l = Math.hypot(nx, ny, nz) || 1; v.n = [nx / l, ny / l, nz / l];
        v.k = this.k(v.x, v.y, v.z);
        // 预先算好 4 档明暗（亮 / 本色 / 暗 / 更暗），渲染时不再算颜色
        v.t = v.f ? [v.c, v.c, v.c, v.c] : [tone(v.c, 0.08), v.c, tone(v.c, -0.14), tone(v.c, -0.28)];
      }
      this.list = [...this.m.values()].filter((v) => v.out);
      return this;
    }
  }
  function ellip(M, cx, cy, cz, rx, ry, rz, fn) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++)
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d <= 1) { const c = typeof fn === 'string' ? fn : fn(x, y, z, d, dx, dy, dz); if (c) M.set(x, y, z, c); }
        }
  }
  // 这一行（y,z）最靠前的方块的 x
  function frontX(M, y, z, from = 26) { for (let x = from; x > -24; x--) if (M.has(x, y, z)) return x; return null; }

  // ---------- 刺猬：身子（随姿势变） ----------
  // 对照 2D 正脸（1 格 = 1 像素）：整只宽约 28、高约 26；刺帽罩住头顶、两侧和后背；
  // 正面一张 15×16 的奶油色大脸；脸上沿两只小圆耳朵；底下四只小脚。
  // pose：leg 走路第几帧（0 站 / 1~4 / 5 挠痒）、curl 缩球程度 0~1、dip 低头（-1 抬头 / 1 / 2）、spike 炸毛、lie 趴下
  function hedgehogBody(C, P) {
    const M = new Model(), c = P.curl || 0, dip = P.dip || 0, lie = P.lie || 0, spike = P.spike || 0;
    const SX = lerp(-1, 0, c), SY = lerp(12.5, 11.2, c) - lie * 2.2, SRX = lerp(14, 11.6, c), SRY = lerp(12.5, 11.4, c) - lie * 2.4, SRZ = lerp(13.5, 11.8, c) + lie * 0.6;
    const fk = 1 - c * 0.42;
    const FX = lerp(6.6, 3.2, c), FY = 10.5 - dip * 0.9 - c * 1.6 - lie * 2.2, FRX = 8.6 * fk, FRY = 8.2 * fk, FRZ = 7.8 * fk;
    const open = Math.max(0, 1 - c * 1.25); // 脸露出来多少（缩成球时脸藏进去）
    const inFaceCol = (y, z) => { if (open <= 0.05) return false; const dy = (y + 0.5 - FY) / (FRY * open), dz = (z + 0.5) / (FRZ * Math.max(0.35, open)); return dy * dy + dz * dz < 1; };
    const cut = FX - 4.6;
    const spine = [C.dark, C.spine, tone(C.spine, 0.22), C.tip];
    // 1. 刺帽：从额头往后、往两边放射的一条条刺。每条是“深色缝 + 中间色的刺 + 一截一截的浅色刺尖”，
    //    浅色刺尖排成虚线——远看就是一根根梳好的刺，不是一团噪点
    const AX = FX + 1, AY = FY + FRY * 0.9;
    const shellAt = (x, y, z) => {
      const th = Math.atan2(z + 0.5, y + 0.5 - (FY - 3)), u = (th / Math.PI) * 12 + 40, si = Math.floor(u), f = u - si;
      const dist = Math.hypot(x + 0.5 - AX, y + 0.5 - AY, z + 0.5), g = dist / 3.1 + hash(si, 5, 9) - Math.floor(dist / 3.1 + hash(si, 5, 9));
      return { f, g, si };
    };
    ellip(M, SX, SY, 0, SRX, SRY, SRZ, (x, y, z, d) => {
      if (x > cut && inFaceCol(y, z)) return null;
      if (c < 0.5 && y < 2.2 - lie && x > -9) return null;
      const { f, g } = shellAt(x, y, z);
      if (f < 0.28) return C.dark;
      if (d > 0.9 && g > 0.7 && f > 0.42 && f < 0.88) return C.tip;
      return C.spine;
    });
    // 2. 肚皮、脸、小尖嘴
    if (c < 0.5) ellip(M, -1, 4.2 - lie, 0, 11, 3.8 - lie * 0.6, 9.6, (x, y, z) => (M.has(x, y, z) ? null : C.base));
    if (open > 0.05) {
      ellip(M, FX, FY, 0, FRX, FRY, FRZ, (x, y, z) => (y < FY - 3 && Math.abs(z) < 4 && hash(x, z, 7) < 0.5 ? C.light : C.base));
      const sx = lerp(14.2, 9, c) + (dip > 0 ? 0.6 : 0), sy = FY - 2.3 - dip * 0.4;
      ellip(M, sx, sy, 0, 2.6 * fk, 2.4 * fk, 2.6 * fk, (x, y, z) => (y >= sy + 1 ? C.light : C.base));
      // 胡须点：小嘴两侧各两个小黑点
      for (const s of [-1, 1]) for (const [yy, dz] of [[0, 2], [-1, 2]]) { const z = s * dz - (s < 0 ? 1 : 0), y = Math.round(sy) + yy, x = frontX(M, y, z); if (x != null && x > sx - 1) M.set(x, y, z, tone(C.base, -0.42), true); }
    }
    // 3. 刺尖：在浅色刺尖的位置真的戳出来 1~2 格（往后梳；缩成球 / 炸毛时竖起来）——轮廓上就是一圈尖尖
    const tips = [];
    for (const v of [...M.m.values()]) {
      const extra = spike && v.c === C.spine && hash(v.x, v.y, v.z) < 0.1; if (v.c !== C.tip && !extra) continue;
      const dx = (v.x + 0.5 - SX) / SRX, dy = (v.y + 0.5 - SY) / SRY, dz = (v.z + 0.5) / SRZ;
      let nx = dx / SRX, ny = dy / SRY, nz = dz / SRZ; const l0 = Math.hypot(nx, ny, nz); nx /= l0; ny /= l0; nz /= l0;
      if (ny < (c > 0.5 ? -0.9 : -0.3)) continue;
      const back = spike || c > 0.5 ? 0.1 : 0.55;
      let ex = nx - back, ey = ny + 0.1, ez = nz; const l = Math.hypot(ex, ey, ez); ex /= l; ey /= l; ez /= l;
      const L = (hash(v.y, v.x, v.z) < 0.5 ? 2 : 1) + (spike ? 1 : 0);
      if (v.c === C.tip) v.c = C.spine; // 刺的根部是中间色，尖才是浅色
      for (let k = 1; k <= L; k++) tips.push([Math.round(v.x + ex * k * 1.05), Math.round(v.y + ey * k * 1.05), Math.round(v.z + ez * k * 1.05), k === L && !extra ? C.tip : k === L ? tone(C.spine, 0.15) : C.spine]);
    }
    for (const [x, y, z, col] of tips) if (!M.has(x, y, z) && !(x > cut && inFaceCol(y, z))) M.set(x, y, z, col);
    if (open > 0.3) {
      // 4. 刘海：脸上沿一排往前垂的小刺
      const fy = Math.round(FY + FRY * 0.92);
      for (let z = -5; z <= 5; z += 2) { const x = frontX(M, fy, z); if (x == null) continue; M.set(x + 1, fy, z, C.spine); M.set(x + 1, fy - 1, z, (z & 2) ? C.tip : C.spine); if (Math.abs(z) < 4) M.set(x + 2, fy - 1, z, C.dark); }
      // 5. 小圆耳朵 + 粉耳心
      for (const s of [-1, 1]) {
        const zc = s * 5.5, ey = FY + FRY * 0.82;
        ellip(M, FX + 1.6, ey, zc, 1.6, 1.7, 1.6, C.base);
        const z = Math.floor(zc); for (const yy of [0, 1]) { const x = frontX(M, Math.round(ey) - yy, z); if (x != null) M.set(x, Math.round(ey) - yy, z, C.inner, true); }
      }
    }
    // 6. 四只小脚（带深色小爪尖）。走路时对角线的两只一起抬
    if (c < 0.6) {
      const L = P.leg || 0, st = [0, 0, 0, 0], fw = [0, 0, 0, 0]; // FL FR BL BR
      if (L === 1) { st[0] = 1; st[3] = 1; fw[0] = 1; fw[3] = 1; } else if (L === 2) { fw[0] = 1; fw[3] = 1; fw[1] = -1; fw[2] = -1; }
      else if (L === 3) { st[1] = 1; st[2] = 1; fw[1] = 1; fw[2] = 1; } else if (L === 4) { fw[1] = 1; fw[2] = 1; fw[0] = -1; fw[3] = -1; }
      else if (L === 5) { st[2] = 2; fw[2] = 2; } // 挠痒：后脚抬起来
      const feet = [[6, -6], [6, 4], [-8, -7], [-8, 5]];
      feet.forEach(([x0, z0], i) => {
        const y0 = st[i] + (lie ? -1 : 0), x1 = x0 + fw[i];
        for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) { M.set(x1 + a, y0, z0 + b, C.paw); M.set(x1 + a, y0 + 1, z0 + b, C.paw); }
        M.set(x1 + 3, y0, z0, tone(C.paw, -0.45), true); M.set(x1 + 3, y0, z0 + 1, tone(C.paw, -0.45), true);
      });
    }
    M.FX = FX; M.FY = FY; M.open = open;
    return M.finish();
  }

  // ---------- 刺猬：脸（眼睛 / 鼻子 / 嘴 / 腮红），叠在身子上 ----------
  // 眼睛照搬 2D 的 5×5：K 黑、W 白；左眼的白在外侧，右眼镜像——瞳孔都往中间看，呆呆的
  const EYES = {
    open: ['.KKK.', 'KWWWK', 'KWKKK', 'KWKKK', '.KKK.'],
    wide: ['.KKK.', 'KWWWK', 'KWKWK', 'KWWWK', '.KKK.'],
    sleepy: ['.....', '.....', 'KKKKK', 'KWKKK', '.KKK.'],
    closed: ['.....', '.....', 'K...K', '.KKK.', '.....'],
    happy: ['.....', '.KKK.', 'K...K', '.....', '.....'],
    dizzy: ['K...K', '.K.K.', '..K..', '.K.K.', 'K...K'],
    angry: ['KK...', 'KWKK.', 'KWKKK', 'KWKKK', '.KKK.'],
    look: ['.KKK.', 'KKKWK', 'KKKWK', 'KWWWK', '.KKK.'], // 往上看（想事情）
  };
  function hedgehogFace(M, C, F) {
    const o = new Map(); if (M.open < 0.3) return o;
    const put = (x, y, z, col) => { const k = x + ',' + y + ',' + z; if (M.m.has(k)) o.set(k, col); };
    const dy = Math.round(M.FY - 10.5), ep = EYES[F.eyes] || EYES.open;
    const eye = (z0, mirror) => {
      for (let r = 0; r < 5; r++) for (let cI = 0; cI < 5; cI++) {
        const ch = ep[r][mirror ? 4 - cI : cI]; if (ch === '.') continue;
        const y = 16 - r + dy, z = z0 - cI, x = frontX(M, y, z); if (x == null) continue;
        put(x, y, z, ch === 'W' ? '#ffffff' : K);
      }
    };
    eye(5, false); eye(-1, true);
    // 鼻头：2×2，左上一点高光；嗅嗅的时候鼻头上下动
    const ny = 9 + dy + (F.sniff ? 1 : 0), nx = frontX(M, ny, 0) ?? frontX(M, ny - 1, 0);
    if (nx != null) for (const [yy, z, col] of [[0, 0, K], [0, -1, '#5a4a50'], [-1, 0, K], [-1, -1, K]]) { const x = frontX(M, ny + yy, z); if (x != null) put(x, ny + yy, z, col); }
    // 嘴
    const my = 7 + dy;
    const mouth = F.mouth || 'w';
    if (mouth === 'open' || mouth === 'tongue' || mouth === 'o') {
      for (const z of [-1, 0]) { const x = frontX(M, my, z); if (x != null) put(x, my, z, K); const x2 = frontX(M, my - 1, z); if (x2 != null) put(x2, my - 1, z, mouth === 'o' ? K : '#ff7f95'); }
    } else {
      const w = mouth === 'smile' ? 2 : 1;
      for (const z of [w, -1 - w]) { const x = frontX(M, my, z); if (x != null) put(x, my, z, K); }
      for (const z of [w - 1, -w]) { const x = frontX(M, my - 1, z); if (x != null) put(x, my - 1, z, K); }
    }
    // 腮红
    // 腮红：平时淡淡的一点，被摸 / 开心时更红一圈
    const bl = F.blush ? [6, 7, -7, -8] : [6, -7];
    for (const z of bl) { const y = 11 + dy, x = frontX(M, y, z); if (x != null) put(x, y, z, F.blush ? tone(C.inner, 0.05) : tone(C.inner, 0.4)); }
    if (F.blush) for (const z of [6, -7]) { const y = 10 + dy, x = frontX(M, y, z); if (x != null) put(x, y, z, tone(C.inner, 0.3)); }
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
  const bodies = new Map(), faces = new Map(), frames = new Map();
  const palKey = (C) => C.spine + C.base + C.tip;
  function body(C, P) {
    const k = palKey(C) + '|' + [P.leg || 0, P.curl || 0, P.dip || 0, P.spike || 0, P.lie || 0].join(',');
    let m = bodies.get(k); if (!m) { m = hedgehogBody(C, P); bodies.set(k, m); if (bodies.size > 90) bodies.delete(bodies.keys().next().value); }
    return m;
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
      case 'walk': { const s = Math.floor(t * 8) % 4; P.leg = s + 1; bob = s % 2 ? 1 : 0; F.sniff = s === 1; break; }
      case 'run': { const s = Math.floor(t * 13) % 4; P.leg = s + 1; bob = s % 2 ? 1 : 0; sq *= s % 2 ? 0.95 : 1.04; lean = 1.6; break; }
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
  const BW = 44, BH = 36, TX = 6, TY = 8, GROUND = 31 + TY; // 第 31 行是脚底（和 2D 一样），下面再多 4 行放斜着看时伸出来的脚
  function drawPet(p) {
    const SPR = PP.SPR, C = p.pal, ps = poseOf(p);
    const M = body(C, ps.P), over = face(M, C, ps.F);
    let yaw = p.portrait ? Math.PI / 2 : p.vyaw != null ? p.vyaw : (p.facing >= 0 ? 0.3 : 0.7) * Math.PI;
    yaw += ps.spin;
    const pitch = p.portrait ? 0.12 : 0.36;
    const yq = Math.round(yaw / (Math.PI / 32)), rq = Math.round((ps.roll || 0) / (Math.PI / 16)), sqq = Math.round(ps.sq * 40);
    const key = palKey(C) + '|' + [ps.P.leg, ps.P.curl, ps.P.dip, ps.P.spike, ps.P.lie].join(',') + '|' + [ps.F.eyes, ps.F.mouth, ps.F.sniff ? 1 : 0, ps.F.blush ? 1 : 0].join(',') + '|' + [yq, rq, sqq, ps.bob, Math.round(ps.lean * 2), pitch, p.scene ? 1 : 0, p.grade || ''].join(',');
    let b = frames.get(key);
    if (b) { frames.delete(key); frames.set(key, b); return b; }
    b = new SPR.Buf(BW, BH, TY); b.tx = TX;
    b.d = render(M, over, { w: BW, h: BH + TY, yaw: yq * (Math.PI / 32), pitch, roll: rq * (Math.PI / 16), sq: sqq / 40, lean: Math.round(ps.lean * 2) / 2, ox: BW / 2, oy: GROUND + 0.5 - ps.bob });
    SPR._h.outlineSel(b);
    if (SPR._h.sceneRim) SPR._h.sceneRim(b, p);
    frames.set(key, b); if (frames.size > 400) frames.delete(frames.keys().next().value);
    return b;
  }

  // 只给做好的动物开 3D；设置里可以关（settings.vox === false 时全用 2D）
  const READY = new Set(['hedgehog']);
  const has = (sp) => READY.has(sp) && !(PP.G && PP.G.save && PP.G.save.settings && PP.G.save.settings.vox === false);
  PP.VOX = { Model, ellip, has, drawPet, yawFor, poseOf, render, body, face, _cache: { bodies, frames } };
})();
