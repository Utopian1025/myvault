// 场景像素画工具：和宠物同样大小的像素（1 格 = G.S 屏幕像素）
// 每样东西先画在自己的小画布（Pix）上：有明暗、有描边，再贴到场景里 —— 画面更细、更整齐
(function () {
  const PP = (window.PP = window.PP || {});

  // ---------- 颜色 ----------
  const CC = new Map();
  function rgba(hex) {
    let v = CC.get(hex); if (v !== undefined) return v;
    let r, g, b, a = 255;
    if (hex[0] === '#') { const n = hex.length === 4 ? hex.slice(1).split('').map((c) => c + c).join('') : hex.slice(1, 7); const x = parseInt(n, 16); r = (x >> 16) & 255; g = (x >> 8) & 255; b = x & 255; if (hex.length === 9) a = parseInt(hex.slice(7, 9), 16); }
    else { const m = hex.match(/[\d.]+/g); r = +m[0]; g = +m[1]; b = +m[2]; a = m[3] != null ? Math.round(+m[3] * 255) : 255; }
    v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0; CC.set(hex, v); return v;
  }
  function hex2(r, g, b) { return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
  function parse(h) { const x = parseInt(h.slice(1, 7), 16); return [(x >> 16) & 255, (x >> 8) & 255, x & 255]; }
  // 调亮 / 调暗 / 混合
  const shade = (h, k) => { const [r, g, b] = parse(h); const f = (c) => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)))); return hex2(f(r), f(g), f(b)); };
  const mix = (a, b, t) => { const A = parse(a), B = parse(b); return hex2(...A.map((c, i) => Math.round(c + (B[i] - c) * t))); };

  // ---------- 像素缓冲 ----------
  class Pix {
    constructor(w, h) { this.w = Math.max(1, Math.ceil(w)); this.h = Math.max(1, Math.ceil(h)); this.d = new Uint32Array(this.w * this.h); }
    set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return; this.d[y * this.w + x] = typeof c === 'number' ? c : rgba(c); }
    get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[y * this.w + x]; }
    rect(x, y, w, h, c) { const v = rgba(c); x = Math.round(x); y = Math.round(y); for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.d[j * this.w + i] = v; }
    hl(x, y, w, c) { this.rect(x, y, w, 1, c); }
    vl(x, y, h, c) { this.rect(x, y, 1, h, c); }
    // 椭圆：fn(nx, ny) 返回颜色（nx, ny ∈ [-1,1]，可以做明暗）
    ell(cx, cy, rx, ry, fn) {
      for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
        const nx = x / (rx + 0.3), ny = y / (ry + 0.3); if (nx * nx + ny * ny > 1) continue;
        const c = typeof fn === 'function' ? fn(nx, ny, x, y) : fn; if (c) this.set(cx + x, cy + y, c);
      }
    }
    // 精修：受光和体积（左上来光）+ 大块平涂处加一点细纹理，让每样东西都有“手绘像素”的质感
    polish() {
      const src = this.d.slice(), w = this.w, h = this.h;
      const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x] >>> 24);
      const tone = (v, k, tr, tg, tb) => { const r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255; return ((v >>> 24) << 24 | (Math.round(b + (tb - b) * k) << 16) | (Math.round(g + (tg - g) * k) << 8) | Math.round(r + (tr - r) * k)) >>> 0; };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, v = src[i]; if ((v >>> 24) < 200) continue;
        const up = A(x, y - 1), dn = A(x, y + 1), lf = A(x - 1, y), rt = A(x + 1, y);
        let o = v;
        if (!up) o = tone(o, 0.24, 255, 248, 226);
        else if (!lf) o = tone(o, 0.1, 255, 248, 226);
        if (!dn) o = tone(o, 0.2, 52, 34, 62);
        else if (!rt) o = tone(o, 0.1, 52, 34, 62);
        if (o === v && up && dn && lf && rt && src[i - 1] === v && src[i + 1] === v && src[i - w] === v && src[i + w] === v) {
          const n = hash(x, y, w * 31 + h);
          if (n < 0.07) o = tone(v, 0.09, 40, 28, 50); else if (n > 0.95) o = tone(v, 0.1, 255, 250, 236);
        }
        this.d[i] = o;
      }
      return this;
    }
    // 外描边（只描透明处）：描边颜色跟着旁边的颜色走（暗一档），比一圈死黑更柔和、更精致
    outline(c, edge) {
      this.polish();
      const v = rgba(c), src = this.d.slice(), w = this.w, h = this.h;
      const vr = v & 255, vg = (v >>> 8) & 255, vb = (v >>> 16) & 255;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (src[y * w + x]) continue;
        const n = (x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1]) || (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x]);
        if (n && (!edge || edge(x, y))) {
          const r = n & 255, g = (n >>> 8) & 255, b = (n >>> 16) & 255;
          this.d[y * w + x] = (255 << 24 | (Math.round(vb * 0.55 + b * 0.45 * 0.5) << 16) | (Math.round(vg * 0.55 + g * 0.45 * 0.5) << 8) | Math.round(vr * 0.55 + r * 0.45 * 0.5)) >>> 0;
        }
      }
      return this;
    }
    // 贴到另一张上（ax, ay 是锚点：默认底边中间）
    stamp(dst, x, y, ax = 0.5, ay = 1, flip = false) {
      const ox = Math.round(x - this.w * ax), oy = Math.round(y - this.h * ay);
      for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) { const v = this.d[j * this.w + (flip ? this.w - 1 - i : i)]; if (v) { const X = ox + i, Y = oy + j; if (X >= 0 && Y >= 0 && X < dst.w && Y < dst.h) dst.d[Y * dst.w + X] = v; } }
      return { x0: ox, y0: oy, x1: ox + this.w, y1: oy + this.h };
    }
    canvas() { const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h; const c = cv.getContext('2d'); const im = c.createImageData(this.w, this.h); new Uint32Array(im.data.buffer).set(this.d); c.putImageData(im, 0, 0); return cv; }
  }
  // 带边距的小精灵（给描边留位置）
  const spr = (w, h) => new Pix(w + 2, h + 2);

  // ---------- 随机 / 噪声 ----------
  const rng = (seed) => { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const noise = (x, y, s = 0) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const dith = (x, y, t) => (bayer[y & 3][x & 3] + 0.5) / 16 < t; // 有序抖动：t 越大越多

  // ---------- 季节配色 ----------
  const LEAF = {
    spring: ['#3f8f4a', '#5aae54', '#86cc6a', '#b6e68c'],
    summer: ['#2c6f3c', '#3f8a44', '#5aa64e', '#86c264'],
    autumn: ['#9a3f22', '#cf6a2a', '#e8963a', '#f3c058'],
    winter: ['#5c6f66', '#748a80', '#93a89e', '#b7c8c0'],
  };
  const PINE = { spring: ['#1f4f3a', '#2c6648', '#3e8058', '#5c9c6c'], summer: ['#1b4a36', '#285f44', '#367654', '#4f9064'], autumn: ['#22493a', '#2f5e48', '#3f7456', '#58886a'], winter: ['#2a4a48', '#3a5e5a', '#4e746e', '#6a8e86'] };
  const BARK = ['#4a3020', '#6b4630', '#8a5e40', '#a87a54'];
  const OUT = '#2a2026'; // 和宠物一样的深色描边（物件用稍浅一点的）
  const outCol = (h) => shade(h, -0.55);

  // ---------- 植物 ----------
  // 松树：一层一层的枝叶，左上受光
  function pine(h, season, R, snow) {
    const w = Math.round(h * 0.56), s = spr(w, h), cx = (w + 2) / 2, P = PINE[season];
    const trunkH = Math.round(h * 0.14);
    s.rect(cx - 2, h + 1 - trunkH, 4, trunkH, BARK[1]); s.vl(cx - 2, h + 1 - trunkH, trunkH, BARK[2]);
    const tiers = Math.max(3, Math.round(h / 16));
    for (let t = 0; t < tiers; t++) {
      const top = 1 + Math.round((t / tiers) * (h - trunkH) * 0.92), bot = 1 + Math.round(((t + 1.35) / tiers) * (h - trunkH));
      for (let y = top; y < Math.min(bot, h + 1 - trunkH + 2); y++) {
        const k = (y - top) / Math.max(1, bot - top), half = Math.round((0.25 + k * 0.75) * (w / 2) * (0.45 + 0.55 * (t + 1) / tiers));
        for (let x = -half; x <= half; x++) {
          const nx = x / Math.max(1, half);
          let c = nx < -0.35 ? P[3] : nx < 0.15 ? P[2] : nx < 0.6 ? P[1] : P[0];
          if (k > 0.8 && Math.abs(x) > half - 2) c = P[0];
          if (hash(x + 99, y, t) < 0.08) c = P[Math.max(0, P.indexOf(c) - 1)];
          if (snow && (k < 0.28 || (k < 0.45 && hash(x, y) < 0.5)) && nx < 0.5) c = k < 0.15 ? '#ffffff' : '#e6eef6';
          s.set(cx + x, y, c);
        }
      }
    }
    return s.outline(outCol(P[0]));
  }
  // 阔叶树：树干 + 几团圆圆的树冠（橡树 / 苹果树 / 白桦 / 枫树）
  function broadleaf(h, season, R, kind = 'oak') {
    const w = Math.round(h * 0.86), s = spr(w, h), cx = (w + 2) / 2;
    const L = kind === 'maple' && season === 'autumn' ? ['#8a2a1a', '#c23a24', '#e8603a', '#f59a5a'] : LEAF[season];
    const trunkH = Math.round(h * 0.42), birch = kind === 'birch';
    for (let y = 0; y < trunkH; y++) { const yy = h + 1 - y, tw = 2 + (y < 3 ? 2 : 0) + Math.round(h / 40); for (let x = -tw; x <= tw; x++) s.set(cx + x, yy, birch ? (hash(x, yy) < 0.12 ? '#3a3036' : x < 0 ? '#f4f0ea' : '#d6d0c8') : x < -tw / 2 ? BARK[3] : x < tw / 2 ? BARK[2] : BARK[1]); }
    // 分叉
    for (let k = 0; k < Math.round(h * 0.18); k++) { s.set(cx - 2 - k * 0.8, h + 1 - trunkH - k, BARK[1]); s.set(cx + 2 + k * 0.7, h + 1 - trunkH - k * 0.9, BARK[1]); }
    if (season === 'winter' && kind !== 'pine') {
      // 冬天：光秃秃的枝条
      const br = (x, y, a, len, d) => { for (let i = 0; i < len; i++) { x += Math.cos(a); y -= Math.sin(a); s.set(x, y, d > 1 ? BARK[1] : BARK[0]); if (d > 0 && i === Math.round(len * 0.6)) { br(x, y, a + 0.6, len * 0.6, d - 1); br(x, y, a - 0.5, len * 0.55, d - 1); } } if (d === 0) s.set(x, y - 1, '#ffffff'); };
      br(cx, h + 1 - trunkH, Math.PI / 2, h * 0.32, 3); br(cx, h + 1 - trunkH, Math.PI * 0.72, h * 0.28, 2); br(cx, h + 1 - trunkH, Math.PI * 0.28, h * 0.28, 2);
      return s.outline(outCol(BARK[1]));
    }
    const blobs = [[0, 0.3, 0.38], [-0.28, 0.42, 0.28], [0.28, 0.4, 0.3], [-0.12, 0.18, 0.26], [0.16, 0.2, 0.25]];
    for (const [bx, by, br] of blobs) {
      const r = br * w * 0.58, X = cx + bx * w, Y = 1 + by * (h - trunkH * 0.6);
      s.ell(X, Y, r, r * 0.86, (nx, ny, x, y) => {
        const l = -nx * 0.6 - ny * 0.8 + (noise((X + x) / 3.2, (Y + y) / 3.2, 7) - 0.5) * 0.9;
        let c = l > 0.55 ? L[3] : l > 0.05 ? L[2] : l > -0.5 ? L[1] : L[0];
        if (kind === 'apple' && (season === 'summer' || season === 'autumn') && hash(X + x, Y + y, 3) < 0.035) c = '#e0332e';
        if (kind === 'apple' && season === 'spring' && hash(X + x, Y + y, 4) < 0.08) c = '#ffd6e4';
        if (kind === 'oak' && season === 'spring' && hash(X + x, Y + y, 5) < 0.03) c = '#fff2a8';
        return c;
      });
    }
    return s.outline(outCol(L[0]));
  }
  function palm(h, R) {
    const w = Math.round(h * 0.9), s = spr(w, h), cx = (w + 2) / 2;
    // 弯弯的树干，一节一节
    for (let y = 0; y < h * 0.82; y++) { const yy = h + 1 - y, x = cx + Math.round(Math.sin(y / (h * 0.55)) * h * 0.08); s.rect(x - 2, yy, 4, 1, y % 4 === 0 ? '#8a6440' : '#b08a5a'); s.set(x + 1, yy, '#7a5434'); }
    const tx = cx + Math.round(Math.sin((h * 0.82) / (h * 0.55)) * h * 0.08), ty = Math.round(h * 0.2);
    for (let f = 0; f < 7; f++) {
      const a = Math.PI * (0.05 + f / 6.2), len = h * (0.38 + (f % 2) * 0.08);
      for (let i = 0; i < len; i++) { const t = i / len, x = tx + Math.cos(a) * i, y = ty - Math.sin(a) * i * 0.55 + t * t * len * 0.55; s.set(x, y, '#3f8a44'); s.set(x, y + 1, '#2c6f3c'); if (i % 2) { s.set(x, y + 2, '#5aa64e'); s.set(x, y - 1, t > 0.3 ? '#5aa64e' : null); } }
    }
    s.ell(tx, ty + 2, 2.5, 2, '#6b4a30'); s.set(tx - 1, ty + 1, '#8a6440');
    return s.outline('#1f3a24');
  }
  function cactus(h, R) {
    const w = Math.round(h * 0.7), s = spr(w, h), cx = Math.round((w + 2) / 2), bw = Math.max(3, Math.round(h * 0.14));
    const body = (x0, y0, ww, hh) => { for (let y = 0; y < hh; y++) for (let x = 0; x < ww; x++) { const nx = x / (ww - 1); s.set(x0 + x, y0 + y, nx < 0.3 ? '#7cc06a' : nx < 0.7 ? '#4f9a4a' : '#3a7a3c'); if ((x === 1 || x === ww - 2) && y % 3 === 0) s.set(x0 + x, y0 + y, '#e8f0c8'); } s.ell(x0 + ww / 2 - 0.5, y0, ww / 2 - 0.5, 1.2, '#5aa64e'); };
    body(cx - bw / 2, 2, bw, h - 1);
    const ah = Math.round(h * 0.32), ay = Math.round(h * 0.35);
    body(cx - bw / 2 - bw - 1, ay, bw - 1, ah); s.rect(cx - bw / 2 - 2, ay + ah - 2, 3, bw - 1, '#4f9a4a');
    body(cx + bw / 2 + 2, ay - 4, bw - 1, ah - 2); s.rect(cx + bw / 2, ay + ah - 6, 3, bw - 1, '#4f9a4a');
    if (R() < 0.6) { s.set(cx, 1, '#ff6b9a'); s.set(cx - 1, 1, '#ff9fc0'); s.set(cx + 1, 1, '#ff9fc0'); }
    return s.outline('#244a2a');
  }
  function bamboo(h, season, R) {
    const w = Math.round(h * 0.5), s = spr(w, h);
    for (let k = 0; k < 6; k++) {
      const x = 2 + Math.round((k / 5) * (w - 4)), hh = Math.round(h * (0.65 + hash(k, 3) * 0.35));
      for (let y = 0; y < hh; y++) { const yy = h + 1 - y; s.set(x, yy, y % 9 === 0 ? '#5a8a3a' : '#8cc05a'); s.set(x + 1, yy, y % 9 === 0 ? '#4a7a30' : '#6aa048'); }
      for (let j = 9; j < hh; j += 9) { const yy = h + 1 - j, d = (j / 9) % 2 ? 1 : -1; for (let i = 1; i < 5; i++) { s.set(x + d * i, yy - Math.round(i * 0.4), season === 'autumn' ? '#b8b04a' : '#5aa64e'); s.set(x + d * i, yy - Math.round(i * 0.4) + 1, '#3f8a44'); } }
    }
    return s.outline('#2c4a24');
  }
  // 雨林大树：粗树干、板根、厚厚的树冠、垂下来的藤
  function jungleTree(h, R) {
    const w = Math.round(h * 0.95), s = spr(w, h), cx = (w + 2) / 2, th = Math.round(h * 0.55);
    for (let y = 0; y < th; y++) { const yy = h + 1 - y, tw = 3 + (y < 5 ? 5 - y : 0); for (let x = -tw; x <= tw; x++) s.set(cx + x, yy, x < -1 ? '#8a6a4a' : x < 2 ? '#6b4f36' : '#4f3a28'); }
    const L = ['#1c4a2a', '#2a6a36', '#3f8a44', '#6ab05a'];
    for (const [bx, by, br] of [[0, 0.22, 0.42], [-0.3, 0.3, 0.3], [0.3, 0.3, 0.3], [0, 0.08, 0.3]]) {
      const r = br * w * 0.55, X = cx + bx * w, Y = 1 + by * h;
      s.ell(X, Y, r, r * 0.7, (nx, ny, x, y) => { const l = -nx * 0.5 - ny * 0.9 + (noise((X + x) / 2.5, (Y + y) / 2.5, 11) - 0.5); return l > 0.5 ? L[3] : l > 0 ? L[2] : l > -0.6 ? L[1] : L[0]; });
    }
    for (let v = 0; v < 6; v++) { const x = cx - w * 0.35 + v * w * 0.14, len = h * (0.15 + hash(v, 9) * 0.25); for (let i = 0; i < len; i++) s.set(x + Math.round(Math.sin(i / 3)), h * 0.32 + i, i % 4 === 0 ? '#6ab05a' : '#2a6a36'); }
    return s.outline('#123a1e');
  }
  function bush(r, season, R, berries) {
    const w = Math.round(r * 2.6), hh = Math.round(r * 1.5), s = spr(w, hh), L = LEAF[season];
    for (const [bx, by, br] of [[0.3, 0.55, 0.55], [0.62, 0.5, 0.6], [0.48, 0.32, 0.5]]) {
      const X = 1 + bx * w, Y = 1 + by * hh, rr = br * hh;
      s.ell(X, Y, rr * 1.25, rr, (nx, ny, x, y) => { if (Y + y > hh) return null; const l = -nx * 0.6 - ny * 0.8 + (noise((X + x) / 2.4, (Y + y) / 2.4, 13) - 0.5) * 0.8; let c = l > 0.5 ? L[3] : l > 0 ? L[2] : l > -0.6 ? L[1] : L[0]; if (season === 'winter' && ny < -0.3) c = '#f4f8fc'; if (berries && (season === 'summer' || season === 'autumn') && hash(X + x, Y + y, 21) < 0.06) c = berries; if (season === 'spring' && hash(X + x, Y + y, 22) < 0.04) c = '#ffffff'; return c; });
    }
    return s.outline(outCol(L[0]));
  }
  function rock(r, R, snow, tint) {
    const w = Math.round(r * 2.4), hh = Math.round(r * 1.5), s = spr(w, hh), base = tint || '#8e8a96';
    const C = [shade(base, -0.35), shade(base, -0.15), base, shade(base, 0.25)];
    s.ell((w + 2) / 2, hh + 0.5, w / 2, hh, (nx, ny, x, y) => { if (ny > 0.05) return null; const l = -nx * 0.7 - ny * 0.7 + (hash(x, y, 31) - 0.5) * 0.3; let c = l > 0.6 ? C[3] : l > 0.1 ? C[2] : l > -0.4 ? C[1] : C[0]; if (snow && ny < -0.55) c = '#f4f8fc'; return c; });
    return s.outline(shade(base, -0.6));
  }
  function grassTuft(season, R, tall) {
    const s = spr(7, tall ? 7 : 4), c = season === 'winter' ? ['#c8d4c8', '#e8eef0'] : season === 'autumn' ? ['#a8883a', '#d0b05a'] : ['#3f8a44', '#7cc35a'];
    for (let k = 0; k < 5; k++) { const x = 1 + k + (k > 2 ? 1 : 0), hh = (tall ? 4 : 2) + ((k * 7) % 3); for (let y = 0; y < hh; y++) s.set(x + (y > hh - 2 && k % 2 ? (k < 2 ? -1 : 1) : 0), (tall ? 8 : 5) - y, y > hh - 2 ? c[1] : c[0]); }
    return s;
  }
  function flower(season, R, col) {
    const s = spr(3, 6); if (season === 'winter') return s;
    const c = col || ['#ff8fb0', '#ffd84a', '#b98cff', '#ffffff', '#ff6b5a', '#7ac8ff'][Math.floor(R() * 6)];
    s.vl(2, 3, 4, '#3f8a44'); s.set(1, 5, '#5aae54'); s.set(2, 1, season === 'autumn' ? '#c08a3a' : c); s.set(1, 2, c); s.set(3, 2, c); s.set(2, 3, c); s.set(2, 2, '#ffcf33');
    return s;
  }
  function mushrooms(season) {
    const s = spr(12, 7); if (season === 'winter') return s;
    for (const [x, h, c] of [[2, 4, '#d9342b'], [6, 6, '#c8a070'], [9, 3, '#d9342b']]) { s.vl(x + 1, 8 - h, h, '#f4ead8'); s.ell(x + 1, 8 - h, 2.2, 1.3, (nx, ny) => (ny > 0.4 ? null : nx < -0.2 ? shade(c, 0.25) : c)); if (c === '#d9342b') { s.set(x, 7 - h, '#ffffff'); s.set(x + 2, 8 - h, '#ffffff'); } }
    return s.outline('#4a2a20');
  }
  function reeds(h, season) {
    const s = spr(10, h);
    for (let k = 0; k < 6; k++) { const x = 1 + k * 1.7, hh = Math.round(h * (0.6 + hash(k, 5) * 0.4)); for (let y = 0; y < hh; y++) s.set(x + (y > hh * 0.7 ? 1 : 0), h + 1 - y, season === 'winter' ? '#b9a88a' : y % 5 === 0 ? '#4c8a3a' : '#6aa64a'); if (season !== 'spring') { s.rect(x, h + 1 - hh - 3, 2, 4, '#7a4a2a'); s.set(x, h + 1 - hh - 3, '#9a6a3a'); } }
    return s;
  }

  // ---------- 小物件 ----------
  function fence(len, snow) {
    const s = spr(len, 9);
    for (let x = 1; x < len; x += 6) { s.rect(x, 1, 2, 9, '#c9a878'); s.set(x, 1, '#e2c49a'); s.vl(x + 1, 2, 8, '#a8865a'); }
    s.rect(0, 3, len + 2, 2, '#b8946a'); s.hl(0, 3, len + 2, '#d8b88a'); s.rect(0, 7, len + 2, 2, '#b8946a'); s.hl(0, 7, len + 2, '#d8b88a');
    if (snow) for (let x = 1; x < len; x += 6) s.rect(x, 0, 2, 1, '#ffffff');
    return s.outline('#6a4a30');
  }
  function sign(label, snow) {
    const s = spr(26, 20);
    s.rect(12, 8, 3, 13, '#7a5234'); s.vl(12, 8, 13, '#9a6a44');
    s.rect(1, 2, 25, 9, '#c99a6a'); s.hl(1, 2, 25, '#e2b88a'); s.hl(1, 10, 25, '#9a6a44'); s.set(2, 4, '#7a5234'); s.set(24, 4, '#7a5234');
    if (snow) s.hl(1, 1, 25, '#ffffff');
    return s.outline('#4a3020');
  }
  function lamp(snow) {
    const s = spr(7, 26);
    s.rect(3, 6, 2, 21, '#3a3a44'); s.rect(1, 25, 6, 2, '#3a3a44'); s.rect(1, 2, 6, 5, '#3a3a44'); s.rect(2, 3, 4, 3, '#ffe08a'); s.hl(0, 1, 8, '#4a4a56'); if (snow) s.hl(0, 0, 8, '#ffffff');
    return s.outline('#1a1a24');
  }
  function bench(snow) { const s = spr(22, 10); s.rect(1, 1, 22, 2, '#8a5e40'); s.rect(1, 5, 22, 2, '#a87a54'); s.hl(1, 5, 22, '#c99a6a'); s.rect(3, 7, 2, 4, '#5a3a24'); s.rect(19, 7, 2, 4, '#5a3a24'); s.rect(3, 3, 2, 2, '#5a3a24'); s.rect(19, 3, 2, 2, '#5a3a24'); if (snow) s.hl(1, 4, 22, '#ffffff'); return s.outline('#3a2418'); }
  function stump(snow) { const s = spr(12, 8); s.rect(2, 3, 10, 6, BARK[2]); s.vl(2, 3, 6, BARK[3]); s.vl(11, 3, 6, BARK[1]); s.ell(7, 3, 5, 1.6, (nx) => (Math.abs(nx) < 0.5 ? '#e2c49a' : '#c99a6a')); s.set(7, 3, '#a8865a'); if (snow) s.ell(7, 2.5, 5, 1.4, '#ffffff'); return s.outline('#3a2418'); }
  function hayBale(snow) { const s = spr(16, 11); s.ell(9, 7, 8, 5, (nx, ny, x, y) => (ny < -0.6 ? '#f0cc6a' : (y + x) % 3 === 0 ? '#c49a3a' : nx < -0.3 ? '#e8bc52' : '#d4a43a')); s.hl(2, 7, 14, '#a8822a'); if (snow) s.ell(9, 3, 6, 1.5, '#ffffff'); return s.outline('#6a4a20'); }
  function snowman() { const s = spr(14, 22); s.ell(7.5, 17, 6, 5, (nx, ny) => (nx > 0.4 ? '#d8e4f0' : '#ffffff')); s.ell(7.5, 8, 4, 4, (nx) => (nx > 0.4 ? '#d8e4f0' : '#ffffff')); s.set(6, 7, '#222'); s.set(9, 7, '#222'); s.rect(9, 8, 3, 1, '#ff8a2a'); s.rect(4, 3, 8, 1, '#3a3a44'); s.rect(5, 0, 6, 3, '#3a3a44'); s.rect(3, 11, 9, 2, '#e33b3b'); s.rect(9, 12, 2, 4, '#e33b3b'); return s.outline('#6a7a8a'); }
  function pumpkin() { const s = spr(12, 9); s.ell(6.5, 6, 6, 3.6, (nx) => (Math.abs(nx) < 0.15 || Math.abs(Math.abs(nx) - 0.55) < 0.12 ? '#d8661a' : nx < -0.3 ? '#ffa04a' : '#ff8a2a')); s.rect(6, 1, 2, 2, '#4c7a30'); return s.outline('#6a2a10'); }
  function lily(season) { const s = spr(12, 4); if (season === 'winter') return s; s.ell(6.5, 2.5, 6, 1.8, (nx, ny) => (nx > 0.1 && nx < 0.3 && ny < 0 ? null : ny < -0.2 ? '#6ab05a' : '#3f8a44')); if (season === 'summer' || season === 'spring') { s.ell(4, 1, 1.6, 1.2, '#ffb0cc'); s.set(4, 0, '#fff0f6'); } return s; }

  PP.ART = { Pix, spr, rgba, shade, mix, rng, hash, noise, dith, LEAF, PINE, BARK, OUT, outCol, pine, broadleaf, palm, cactus, bamboo, jungleTree, bush, rock, grassTuft, flower, mushrooms, reeds, fence, sign, lamp, bench, stump, hayBale, snowman, pumpkin, lily };
})();
