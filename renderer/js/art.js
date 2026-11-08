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
    // 按比例缩小（最近邻，保持像素感）：放不下的大树、高塔用它整体缩一点，而不是被画面顶边切掉
    scaled(k) { const w = Math.max(1, Math.round(this.w * k)), h = Math.max(1, Math.round(this.h * k)), o = new Pix(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o.d[y * w + x] = this.d[Math.min(this.h - 1, Math.floor((y + 0.5) / k)) * this.w + Math.min(this.w - 1, Math.floor((x + 0.5) / k))]; return o; }
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
    // 精修版：一层一层往下垂的枝条（每层边缘是锯齿状的针叶尖，层下面压着一道阴影），左亮右暗，树干从底下露出一截
    const w = Math.round(h * 0.6), s = spr(w, h), cx = Math.round((w + 2) / 2), P = [mix(PINE[season][0], '#141020', 0.3), ...PINE[season]], seed = h * 3;
    const trunkH = Math.max(3, Math.round(h * 0.12));
    for (let y = 0; y < trunkH + 3; y++) { const yy = h + 1 - y; s.set(cx - 1, yy, BARK[3]); s.set(cx, yy, BARK[2]); s.set(cx + 1, yy, BARK[1]); if (y < 2) { s.set(cx - 2, yy, BARK[2]); s.set(cx + 2, yy, BARK[0]); } }
    const tiers = Math.max(4, Math.round(h / 9)), body = h - trunkH;
    for (let t = 0; t < tiers; t++) {
      const k0 = t / tiers, top = 1 + Math.round(k0 * body * 0.86), bot = Math.min(h - trunkH + 1, 1 + Math.round(((t + 1.55) / tiers) * body * 0.9));
      const maxHalf = (w / 2 - 1) * (0.3 + 0.7 * (t + 1) / tiers);
      for (let y = top; y <= bot; y++) {
        const k = (y - top) / Math.max(1, bot - top);
        let half = Math.round(maxHalf * (0.18 + 0.82 * Math.pow(k, 0.8)));
        for (let x = -half; x <= half; x++) {
          // 下沿锯齿：每隔几列垂下一个针叶尖
          if (k > 0.82 && (Math.abs(x) + t) % 3 !== 0 && y === bot) continue;
          const nx = x / Math.max(1, half);
          let c = nx < -0.45 ? P[4] : nx < 0 ? P[3] : nx < 0.45 ? P[2] : nx < 0.8 ? P[1] : P[0];
          if (k > 0.7) c = P[Math.max(0, P.indexOf(c) - 1)]; // 层的下半截在阴影里
          if (hash(x + 50, y, seed + t) < 0.12) c = P[Math.max(0, P.indexOf(c) - 1)];
          else if (hash(x + 80, y, seed + t) < 0.06 && nx < 0.3) c = P[Math.min(4, P.indexOf(c) + 1)];
          if (snow && k < 0.4 && nx < 0.6 && hash(x, y, t) < 0.75) c = k < 0.2 ? '#ffffff' : '#e2ecf6';
          s.set(cx + x, y, c);
        }
      }
      // 层与层之间：上一层压在下一层上面的那道深色阴影
      if (t > 0) { const half = Math.round(maxHalf * 0.2); for (let x = -half; x <= half; x++) s.set(cx + x, top + 1, P[0]); }
    }
    s.set(cx, 0, P[3]);
    return s.outline(outCol(P[1]));
  }
  // 阔叶树：树干 + 几团圆圆的树冠（橡树 / 苹果树 / 白桦 / 枫树）
  function broadleaf(h, season, R, kind = 'oak') {
    // 精修版：树干有根、有树皮纹、分叉伸进树冠；树冠是一簇一簇的叶团（每团自己有亮面和暗面，团与团之间有深色缝），边上有零星伸出来的叶尖
    const w = Math.round(h * 0.92), s = spr(w, h), cx = Math.round((w + 2) / 2), seed = (h * 7 + kind.length * 13) | 0;
    const L = kind === 'maple' && season === 'autumn' ? ['#6a1e16', '#9a2a1c', '#c8442a', '#ec7a48', '#f8b07a'] : [mix(LEAF[season][0], '#1a1424', 0.25), ...LEAF[season]];
    const birch = kind === 'birch', trunkH = Math.round(h * 0.4), tw = Math.max(2, Math.round(h / 16));
    const B = birch ? ['#5a5058', '#c8c0b8', '#e8e2da', '#fbf8f2'] : ['#3a2418', '#5a3a26', '#7a5034', '#9a6c46'];
    // 树根：往两边张开
    for (let k = 0; k < tw + 3; k++) { s.set(cx - tw - k, h + 1 - Math.floor(k / 2), B[1]); s.set(cx + tw + k, h + 1 - Math.floor(k / 2.4), B[0]); }
    // 树干：左亮右暗，竖向树皮纹，偶尔一个树疤
    for (let y = 0; y < trunkH + 4; y++) {
      const yy = h + 1 - y, half = tw + (y < 3 ? 2 - Math.floor(y / 2) : 0);
      for (let x = -half; x <= half; x++) {
        const nx = x / half; let c = nx < -0.45 ? B[3] : nx < 0.2 ? B[2] : nx < 0.65 ? B[1] : B[0];
        if (!birch && (x + Math.floor(y / 5)) % 3 === 0 && hash(x, y, seed) < 0.55) c = mix(c, B[0], 0.55);
        if (birch && hash(x, yy, 9) < 0.14) c = '#3a3036';
        s.set(cx + x, yy, c);
      }
    }
    if (!birch && h > 24) { const ky = h + 1 - Math.round(trunkH * 0.45); s.set(cx, ky, B[0]); s.set(cx + 1, ky, B[0]); s.set(cx, ky - 1, B[1]); }
    // 树枝：从树干顶上分出去，伸进树冠
    const top = h + 1 - trunkH;
    const branch = (dx, len) => { for (let i = 0; i < len; i++) { const x = cx + Math.round(dx * i * 0.8), y = top - i; s.set(x, y, B[1]); s.set(x + (dx > 0 ? 1 : -1), y, B[0]); } };
    branch(-1, Math.round(h * 0.22)); branch(1, Math.round(h * 0.2)); branch(0, Math.round(h * 0.25));
    if (season === 'winter' && kind !== 'pine') {
      const br = (x, y, a, len, d) => { for (let i = 0; i < len; i++) { x += Math.cos(a); y -= Math.sin(a); s.set(x, y, d > 1 ? B[1] : B[0]); if (d > 0 && i === Math.round(len * 0.6)) { br(x, y, a + 0.6, len * 0.6, d - 1); br(x, y, a - 0.5, len * 0.55, d - 1); } } if (d === 0) { s.set(x, y - 1, '#ffffff'); s.set(x + 1, y - 1, '#e8f0f8'); } };
      br(cx, top, Math.PI / 2, h * 0.34, 3); br(cx, top, Math.PI * 0.74, h * 0.3, 2); br(cx, top, Math.PI * 0.26, h * 0.3, 2);
      return s.outline(outCol(B[1]));
    }
    // 树冠：一大团轮廓里撒一堆小叶团，从后往前画（后面的暗、前面的亮）
    const CW = w * 0.5, CH = (h - trunkH) * 0.62 + 2, CY = 1 + CH;
    const rnd = rng(seed);
    const blobs = [];
    const nB = Math.max(9, Math.round(w * h / 70));
    for (let i = 0; i < nB; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.78;
      const bx = Math.cos(a) * d * (CW - 3), by = Math.sin(a) * d * (CH - 3) * 0.9;
      blobs.push([cx + bx, CY + by, Math.max(2.5, (w / 9) * (0.75 + rnd() * 0.5))]);
    }
    blobs.sort((p, q) => p[1] - q[1] + (q[0] - p[0]) * 0.15); // 上面 / 左边的后画（在前面，受光）
    blobs.reverse();
    for (const [bx, by, br] of blobs) {
      const depth = (by - (CY - CH)) / (CH * 2); // 0 顶 → 1 底
      s.ell(bx, by, br, br * 0.85, (nx, ny, x, y) => {
        const lit = -nx * 0.55 - ny * 0.85 - depth * 0.9 + 0.35 + (hash(bx + x, by + y, seed) - 0.5) * 0.35;
        let c = lit > 0.75 ? L[4] : lit > 0.3 ? L[3] : lit > -0.15 ? L[2] : lit > -0.6 ? L[1] : L[0];
        if (nx * nx + ny * ny > 0.72 && ny > 0.2) c = L[Math.max(0, L.indexOf(c) - 1)]; // 每团下沿一圈暗，团和团分得开
        if (kind === 'apple' && (season === 'summer' || season === 'autumn') && hash(bx + x, by + y, 3) < 0.03) c = '#d8302a';
        if (kind === 'apple' && season === 'spring' && hash(bx + x, by + y, 4) < 0.09) c = hash(bx + x, by + y, 6) < 0.5 ? '#ffd6e4' : '#fff4f8';
        if (kind === 'oak' && season === 'spring' && hash(bx + x, by + y, 5) < 0.025) c = '#fff2a8';
        return c;
      });
      // 苹果：一个红果子带高光
      if (kind === 'apple' && (season === 'summer' || season === 'autumn') && hash(bx, by, 8) < 0.45) { const ax = Math.round(bx + br * 0.2), ay = Math.round(by + br * 0.3); s.set(ax, ay, '#c8282a'); s.set(ax + 1, ay, '#a01e22'); s.set(ax, ay + 1, '#a01e22'); s.set(ax + 1, ay + 1, '#801818'); s.set(ax, ay, '#ff7a6a'); }
    }
    // 轮廓上零星伸出来的叶尖
    const snap = s.d.slice();
    for (let y = 1; y < h - trunkH; y++) for (let x = 1; x < s.w - 1; x++) {
      if (snap[y * s.w + x] || !(snap[y * s.w + x + 1] || snap[y * s.w + x - 1] || snap[(y + 1) * s.w + x])) continue;
      if (hash(x, y, seed + 1) < 0.12) s.set(x, y, y < CY ? L[3] : L[1]);
    }
    return s.outline(outCol(L[1]));
  }
  function palm(h, R, season) {
    // 精修椰子树：一节一节的弯树干（每节上沿一道亮环、下沿一道暗缝，左亮右暗，越往上越细），
    // 顶上八九片羽状长叶（中间一根叶脉，两边一排排往下垂的小叶，叶尖下垂），叶丛中间挂着一串椰子，树脚一圈干叶和沙
    const w = Math.round(h * 1.2), s = spr(w, h), cx = (w + 2) / 2, seed = h * 11 + 3, rnd = rng(seed);
    const TR = ['#3e2818', '#5e4028', '#7e5a38', '#a07a4c', '#c4a06a'];
    const L = season === 'winter' ? ['#2a4a3a', '#3a5e48', '#4e7458', '#6a8e70', '#8aa88a'] : ['#173e24', '#24582e', '#357238', '#4f9246', '#7ab65c'];
    const th = Math.round(h * 0.7), lean = h * 0.11 * (rnd() < 0.5 ? -1 : 1);
    let tx = cx, ty = 0;
    for (let y = 0; y < th; y++) {
      const t = y / th, x = cx + Math.sin(t * 1.5) * lean, half = Math.max(1.2, (h / 24) * (1.3 - 0.45 * t)), seg = y % 4, yy = h + 1 - y;
      for (let dx = -Math.ceil(half); dx <= Math.ceil(half); dx++) {
        const nx = dx / half; if (Math.abs(nx) > 1.15) continue;
        let c = nx < -0.45 ? TR[3] : nx < 0.2 ? TR[2] : nx < 0.7 ? TR[1] : TR[0];
        if (seg === 0) c = nx < 0.3 ? TR[4] : TR[2];
        else if (seg === 3) c = nx < 0 ? TR[1] : TR[0];
        if (hash(dx, y, seed) < 0.07) c = TR[0];
        s.set(Math.round(x + dx), yy, c);
      }
      tx = x; ty = yy;
    }
    // 叶子：先画往下垂的长叶（在后面），再画朝上的短叶；每片叶子一根叶脉 + 两排分开的小叶（中间留缝，看得出一片片）
    const fronds = [];
    for (let f = 0; f < 10; f++) { const a = Math.PI * (-0.22 + (f / 9) * 1.44) + (rnd() - 0.5) * 0.1; fronds.push([a, h * (0.38 + rnd() * 0.1) * (Math.abs(Math.cos(a)) < 0.35 ? 0.6 : 1)]); }
    fronds.sort((p, q) => Math.sin(p[0]) - Math.sin(q[0]));
    for (const [a, len] of fronds) {
      const ca = Math.cos(a), sa = Math.sin(a), side = ca < -0.15 ? -1 : ca > 0.15 ? 1 : 0;
      const pts = [];
      for (let i = 0; i < len; i++) { const t = i / len; pts.push([tx + ca * i * 1.05, ty - 2 - sa * i * 0.6 + t * t * len * 0.42, t]); }
      for (let i = 1; i < pts.length; i += 2) {
        const [px, py, t] = pts[i], lf = Math.max(1, Math.round(Math.sin(Math.min(1, t * 1.1) * Math.PI) * 4.5));
        for (const dir of side ? [1, -1] : [1, -1]) {
          // 下面一排长，上面一排短；小叶顺着叶子方向往外、往下斜
          const n = dir > 0 ? lf : Math.max(1, lf - 2), ddx = side ? side * 0.55 : dir * 0.7, ddy = dir > 0 ? 0.85 : -0.6;
          for (let j = 1; j <= n; j++) s.set(px + ddx * j, py + ddy * j + (dir > 0 ? 0 : 0), j === n ? L[dir > 0 ? 1 : 3] : dir > 0 ? (t < 0.5 ? L[3] : L[2]) : L[4]);
        }
      }
      for (const [px, py, t] of pts) { s.set(px, py, t < 0.6 ? L[4] : L[3]); }
    }
    // 椰子
    for (const [ox, oy] of [[-2, 2], [1, 3], [3, 1], [-1, 4]]) { const X = Math.round(tx + ox), Y = Math.round(ty + oy); s.set(X, Y, '#6a4a2a'); s.set(X + 1, Y, '#4a3020'); s.set(X, Y + 1, '#4a3020'); s.set(X + 1, Y + 1, '#3a2418'); s.set(X, Y, '#9a7448'); }
    // 树脚：几片干叶
    for (let k = -4; k <= 4; k++) if (hash(k, 1, seed) < 0.6) s.set(cx + k, h + 1, k % 2 ? '#b89a5a' : '#8a7040');
    return s.outline('#16301e');
  }
  function cactus(h, R) {
    // 精修仙人掌（巨柱）：主干和两条手臂都是一道道竖棱（亮棱 / 中间 / 深沟），棱上一排排白色小刺、刺从轮廓上伸出来，
    // 圆圆的顶，手臂从侧面平伸出去再弯上来（肘部是圆的），顶上可能开一朵花，脚下一小撮沙和阴影
    const w = Math.round(h * 0.78), s = spr(w, h), cx = Math.round((w + 2) / 2), bw = Math.max(5, Math.round(h * 0.2)), seed = h * 5 + 1;
    const G = ['#1e4a26', '#2c6a32', '#3e863e', '#58a250', '#80c06a', '#a8d888'];
    const column = (x0, y0, ww, hh) => {
      for (let y = 0; y < hh; y++) for (let x = 0; x < ww; x++) {
        const nx = (x + 0.5) / ww, rib = x % 3;
        let c = nx < 0.3 ? G[4] : nx < 0.65 ? G[3] : nx < 0.85 ? G[2] : G[1];
        if (rib === 2) c = G[Math.max(0, G.indexOf(c) - 2)]; else if (rib === 0 && nx < 0.6) c = G[Math.min(5, G.indexOf(c) + 1)];
        s.set(x0 + x, y0 + y, c);
        if (rib === 0 && (y + x) % 3 === 0 && y > 1) s.set(x0 + x, y0 + y, '#f2f0d0');
      }
      // 圆顶
      for (let x = 0; x < ww; x++) { const d = Math.abs(x - (ww - 1) / 2) / (ww / 2); if (d > 0.55) s.set(x0 + x, y0, null); if (d > 0.85) s.set(x0 + x, y0 + 1, null); }
      s.set(x0 + Math.floor(ww / 2), y0, G[5]);
      // 轮廓上伸出来的刺
      for (let y = 4; y < hh; y += 5) { s.set(x0 - 1, y0 + y, '#e8e4c0'); s.set(x0 + ww, y0 + y + 2, '#d8d4b0'); }
    };
    const top = 2, armW = bw - 1;
    // 左手臂：在 45% 高度伸出，往上弯
    const lay = Math.round(h * 0.56), lx = cx - Math.floor(bw / 2) - armW - 2;
    column(lx, Math.round(h * 0.24), armW, lay - Math.round(h * 0.24) + 2);
    for (let y = lay - 1; y < lay + armW - 1; y++) for (let x = lx; x < cx - Math.floor(bw / 2) + 1; x++) if (!(x < lx + 2 && y > lay + armW - 3)) s.set(x, y, y === lay - 1 ? G[4] : y > lay + armW - 3 ? G[1] : G[2]);
    // 右手臂：更高、更短
    const ray = Math.round(h * 0.46), rx = cx + Math.ceil(bw / 2) + 1;
    column(rx, Math.round(h * 0.16), armW, ray - Math.round(h * 0.16) + 2);
    for (let y = ray - 1; y < ray + armW - 1; y++) for (let x = cx + Math.ceil(bw / 2) - 1; x < rx + armW; x++) if (!(x > rx + armW - 3 && y > ray + armW - 3)) s.set(x, y, y === ray - 1 ? G[3] : y > ray + armW - 3 ? G[0] : G[1]);
    // 主干最后画（压在手臂根上）
    column(cx - Math.floor(bw / 2), top, bw, h - 1);
    if (hash(1, 2, seed) < 0.7 || (R && R() < 0.5)) { const fx = cx; s.set(fx - 1, 1, '#ff6b9a'); s.set(fx, 0, '#ff9fc0'); s.set(fx + 1, 1, '#e84a7a'); s.set(fx, 1, '#ffd84a'); }
    for (let x = -bw; x <= bw; x++) if (hash(x, 3, seed) < 0.7) s.set(cx + x, h + 1, x % 2 ? '#d8b878' : '#c4a060');
    return s.outline('#163a20');
  }
  function bamboo(h, season, R) {
    // 精修竹丛：六七根粗细不一的竹竿（三色圆柱：亮边 / 中间 / 暗边），每节一道浅色竹节环 + 下面一道深线，
    // 节上斜伸出细枝，枝头一簇簇细长的竹叶（两色、往下垂），脚下几根竹笋
    const w = Math.round(h * 0.55), s = spr(w, h), seed = h * 3 + 7;
    const C = season === 'autumn' ? ['#6a6a2a', '#8a8a3a', '#b0a84a', '#d0c868'] : ['#3e6a2a', '#5a8a3a', '#7cae4e', '#a6d06a'];
    const LF = season === 'autumn' ? ['#7a6a2a', '#a8943a', '#d0b84a'] : season === 'winter' ? ['#3a5a3a', '#5a7a5a', '#dfe8ef'] : ['#24582a', '#3c7e3a', '#6aaa50'];
    const N = 7;
    const culms = [];
    for (let k = 0; k < N; k++) culms.push([2 + Math.round((k / (N - 1)) * (w - 5)), Math.round(h * (0.62 + hash(k, 3, seed) * 0.38)), k % 3 === 0 ? 3 : 2]);
    culms.sort((a, b) => a[2] - b[2]);
    for (const [x, hh, cw] of culms) {
      const node = 7 + (x % 3);
      for (let y = 0; y < hh; y++) {
        const yy = h + 1 - y, nd = y % node;
        for (let i = 0; i < cw; i++) {
          let c = i === 0 ? C[3] : i === cw - 1 ? C[1] : C[2];
          if (nd === 0) c = i === 0 ? '#e8f0b8' : C[3]; else if (nd === 1) c = C[0];
          s.set(x + i, yy, c);
        }
        if (nd === 0 && y > 6) { // 节上的细枝和叶
          const d = (Math.floor(y / node) + x) % 2 ? 1 : -1;
          for (let i = 1; i < 4; i++) s.set(x + (d > 0 ? cw - 1 : 0) + d * i, yy - i, C[1]);
          const lx = x + (d > 0 ? cw - 1 : 0) + d * 3, ly = yy - 3;
          for (let l = 0; l < 3; l++) { const ang = d * (0.4 + l * 0.45); for (let j = 1; j < 6; j++) { const px = lx + Math.round(Math.sin(ang) * j), py = ly + Math.round(j * (l === 0 ? -0.3 : 0.55)); s.set(px, py, j < 2 ? LF[1] : j > 4 ? LF[0] : l === 0 ? LF[2] : LF[1]); } }
        }
      }
      // 竿顶一簇叶
      for (let l = -2; l <= 2; l++) for (let j = 1; j < 5; j++) s.set(x + l * Math.round(j * 0.6) + 1, h + 1 - hh + Math.round(j * Math.abs(l) * 0.35) - (l === 0 ? j : 0), j > 3 ? LF[0] : LF[2]);
    }
    for (const sx of [3, w - 3]) { s.set(sx, h + 1, '#8a6a3a'); s.set(sx, h, '#a8885a'); s.set(sx, h - 1, '#c8a870'); }
    return s.outline('#1e3a1c');
  }
  // 雨林大树：粗树干（树皮竖纹、苔藓）、张开的板根、好几层叶团组成的厚树冠、垂下来的带叶藤、附生的凤梨花
  function jungleTree(h, R) {
    const w = Math.round(h * 0.98), s = spr(w, h), cx = Math.round((w + 2) / 2), th = Math.round(h * 0.6), seed = h * 13 + 5, rnd = rng(seed);
    const B = ['#2e2016', '#4a3424', '#6a4c34', '#8a6a4a', '#a8885e'];
    const L = ['#0f3018', '#1a4622', '#28602e', '#3a7c3a', '#56984a', '#7cb860'];
    const tw = Math.max(3, Math.round(h / 13));
    // 板根：从树干两侧斜着落地的薄板
    for (const d of [-1, 1]) for (let k = 0; k < tw + 4; k++) { const y = h + 1 - Math.max(0, Math.round((tw + 4 - k) * 1.3)); for (let yy = y; yy <= h + 1; yy++) s.set(cx + d * (tw + k), yy, d < 0 ? (yy === y ? B[4] : B[2]) : yy === y ? B[2] : B[1]); }
    for (let y = 0; y < th; y++) {
      const yy = h + 1 - y, half = tw + (y < 4 ? 4 - y : 0);
      for (let x = -half; x <= half; x++) {
        const nx = x / half; let c = nx < -0.5 ? B[4] : nx < 0 ? B[3] : nx < 0.5 ? B[2] : B[1];
        if ((x + 40) % 3 === 0 && hash(x, Math.floor(y / 4), seed) < 0.6) c = B[Math.max(0, B.indexOf(c) - 1)];
        if (nx > 0.2 && hash(x, y, seed + 1) < 0.22) c = y % 2 ? '#3a6a34' : '#4a8040'; // 背阴面的苔
        s.set(cx + x, yy, c);
      }
    }
    // 粗枝
    for (const [d, len] of [[-1, Math.round(h * 0.2)], [1, Math.round(h * 0.18)]]) for (let i = 0; i < len; i++) { s.set(cx + d * Math.round(i * 0.9), h + 1 - th - i * 0.6, B[2]); s.set(cx + d * Math.round(i * 0.9), h + 2 - th - i * 0.6, B[1]); }
    // 树冠：三层叶团，后暗前亮
    const CW = w * 0.42, CY = Math.round(h * 0.33), blobs = [];
    for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()); blobs.push([cx + Math.cos(a) * d * (CW - 5), CY + Math.sin(a) * d * h * 0.15, Math.max(3, w / 8 * (0.7 + rnd() * 0.5))]); }
    for (let i = 0; i < 5; i++) blobs.push([cx + (i / 4 - 0.5) * CW * 1.5 + (rnd() - 0.5) * 4, CY - h * (0.1 + rnd() * 0.07) + Math.abs(i - 2) * h * 0.035, w / 9 * (0.8 + rnd() * 0.4)]); // 顶上鼓起的几团，轮廓起伏
    blobs.sort((p, q) => q[1] - p[1]);
    for (const [bx, by, br] of blobs.reverse()) {
      const depth = (by - CY + h * 0.18) / (h * 0.36);
      s.ell(bx, by, br * 1.2, br * 0.8, (nx, ny, x, y) => {
        const l = -nx * 0.6 - ny * 1.0 - depth * 0.7 + 0.35 + (hash(bx + x, by + y, seed) - 0.5) * 0.22;
        let c = l > 0.85 ? L[5] : l > 0.4 ? L[4] : l > -0.05 ? L[3] : l > -0.5 ? L[2] : l > -0.95 ? L[1] : L[0];
        if (nx * nx + ny * ny > 0.66 && ny > 0.15) c = L[Math.max(0, L.indexOf(c) - 1)]; // 每团下沿一圈深色，团和团分得清
        if (((bx + x) * 3 + (by + y) * 5) % 11 === 0 && l > 0) c = L[Math.min(5, L.indexOf(c) + 1)]; // 叶片的小高光
        return c;
      });
    }
    // 轮廓上零星伸出来的叶尖
    { const snap = s.d.slice(); for (let y = 1; y < CY + h * 0.2; y++) for (let x = 1; x < s.w - 1; x++) { if (snap[y * s.w + x] || !(snap[y * s.w + x + 1] || snap[y * s.w + x - 1] || snap[(y + 1) * s.w + x])) continue; if (hash(x, y, seed + 2) < 0.14) s.set(x, y, y < CY ? L[4] : L[1]); } }
    // 垂藤：几根往下垂，藤上隔几格一片小叶
    for (let v = 0; v < 5; v++) {
      let x = cx - w * 0.36 + v * w * 0.18 + (rnd() - 0.5) * 3; const y0 = CY + h * 0.1, len = h * (0.1 + rnd() * 0.22);
      for (let i = 0; i < len; i++) { x += Math.sin(i / 4 + v) * 0.25; const y = y0 + i; s.set(x, y, '#2a5a2a'); if (i % 4 === 2) { s.set(x + 1, y, L[4]); s.set(x + 2, y + 1, L[3]); } if (i % 4 === 0) s.set(x - 1, y, L[3]); }
    }
    // 附生的凤梨花（树干上一簇红）
    const ey = h + 1 - Math.round(th * 0.6); s.set(cx - tw, ey, '#e8403a'); s.set(cx - tw - 1, ey - 1, '#ff7a5a'); s.set(cx - tw + 1, ey - 1, '#c82a2a'); s.set(cx - tw - 1, ey + 1, L[3]); s.set(cx - tw + 1, ey + 1, L[3]);
    return s.outline('#0c2614');
  }
  function bush(r, season, R, berries) {
    // 精修灌木：很多小叶团叠起来（后暗前亮），叶团之间有深色缝，边缘零星叶尖；可以结浆果 / 开小花；底部压一道阴影
    const w = Math.round(r * 2.8), hh = Math.round(r * 1.7), s = spr(w, hh), L = [mix(LEAF[season][0], '#141020', 0.3), ...LEAF[season]], seed = r * 17 + (berries ? 3 : 0);
    const rnd = rng(seed), blobs = [];
    for (let i = 0; i < Math.max(6, r * 2); i++) blobs.push([1 + w * (0.18 + rnd() * 0.64), 1 + hh * (0.3 + rnd() * 0.5), Math.max(1.8, r * (0.45 + rnd() * 0.3))]);
    blobs.sort((a, b) => a[1] - b[1]);
    for (const [X, Y, br] of blobs) s.ell(X, Y, br * 1.15, br, (nx, ny, x, y) => {
      if (Y + y > hh) return null;
      const l = -nx * 0.5 - ny * 0.85 - (Y / hh) * 0.6 + 0.35 + (hash(X + x, Y + y, seed) - 0.5) * 0.3;
      let c = l > 0.7 ? L[4] : l > 0.25 ? L[3] : l > -0.2 ? L[2] : l > -0.6 ? L[1] : L[0];
      if (nx * nx + ny * ny > 0.75 && ny > 0.15) c = L[Math.max(0, L.indexOf(c) - 1)];
      if (season === 'winter' && ny < -0.45) c = '#f4f8fc';
      return c;
    });
    if (season !== 'winter') {
      const bc = berries ? (season === 'autumn' ? '#e8603a' : '#c8304a') : season === 'spring' ? '#ffd6e4' : null;
      if (bc) for (let k = 0; k < r * 1.6; k++) { const x = 2 + Math.floor(hash(k, 1, seed) * (w - 3)), y = 2 + Math.floor(hash(k, 2, seed) * (hh - 3)); if (s.get(x, y)) { s.set(x, y, bc); s.set(x, y - 1, mix(bc, '#ffffff', 0.5)); } }
    }
    for (let x = 1; x < w + 1; x++) if (s.get(x, hh) || s.get(x, hh - 1)) s.set(x, hh + 1, L[0]);
    return s.outline(outCol(L[1]));
  }
  function rock(r, R, snow, tint) {
    // 精修石头：几个切面（顶面最亮、左面次亮、右面暗），面与面之间有棱线，带几道裂纹和小斑点，背阴处长一点苔
    const w = Math.round(r * 2.4), hh = Math.round(r * 1.5), s = spr(w, hh), base = tint || '#8e8a96', seed = r * 13;
    const C = [shade(base, -0.45), shade(base, -0.25), shade(base, -0.08), base, shade(base, 0.22), shade(base, 0.42)];
    const cx = (w + 2) / 2;
    s.ell(cx, hh + 0.5, w / 2, hh, (nx, ny, x, y) => {
      if (ny > 0.05) return null;
      const top = ny < -0.55 + nx * 0.15, left = nx < -0.25;
      let c = top ? (nx < 0.2 ? C[5] : C[4]) : left ? C[3] : nx < 0.35 ? C[2] : C[1];
      if (!top && Math.abs(ny + 0.55 - nx * 0.15) < 0.09) c = C[1]; // 顶面和侧面的棱
      if (hash(x, y, seed) < 0.06) c = C[Math.max(0, C.indexOf(c) - 2)];
      if (hash(x, y, seed + 1) < 0.04) c = C[Math.min(5, C.indexOf(c) + 1)];
      if (snow && (top || ny < -0.6)) c = hash(x, y, 4) < 0.2 ? '#dde8f2' : '#f6fafe';
      if (!snow && nx > 0.4 && ny > -0.35 && hash(x, y, seed + 2) < 0.45) c = '#5a8a4a';
      return c;
    });
    // 一道裂纹
    let x = Math.round(cx + r * 0.2), y = Math.round(hh * 0.45);
    for (let k = 0; k < r; k++) { if (s.get(x, y)) s.set(x, y, C[0]); x += hash(k, 7, seed) < 0.5 ? 1 : 0; y += 1; }
    return s.outline(shade(base, -0.62));
  }
  function grassTuft(season, R, tall) {
    // 精修草丛：长短不一、往两边弯的草叶，根部暗、叶尖亮，偶尔一根带穗
    const H = tall ? 8 : 5, s = spr(9, H), c = season === 'winter' ? ['#9aa8a0', '#c8d4c8', '#eef2f4'] : season === 'autumn' ? ['#8a6a2a', '#a8883a', '#d8b860'] : ['#2f6a3a', '#3f8a44', '#8ad468'];
    const seed = Math.floor((R ? R() : 0.5) * 999);
    for (let k = 0; k < 7; k++) {
      const x0 = 1 + k + (k > 3 ? 1 : 0), hh = Math.max(2, Math.round(H * (0.4 + hash(k, seed, 1) * 0.6))), lean = k < 3 ? -1 : k > 4 ? 1 : 0;
      for (let y = 0; y < hh; y++) { const x = x0 + (y > hh * 0.55 ? lean : 0); s.set(x, H + 1 - y, y > hh - 2 ? c[2] : y < 2 ? c[0] : c[1]); }
      if (tall && k === 3 && season !== 'winter') { s.set(x0, H + 1 - hh - 1, '#e8d8a0'); s.set(x0, H + 1 - hh - 2, '#f6ecc8'); }
    }
    return s;
  }
  function flower(season, R, col) {
    // 精修小花：五瓣（亮瓣 + 暗瓣）、黄色花心、茎上两片小叶子；偶尔是还没开的花苞
    const s = spr(5, 8); if (season === 'winter') return s;
    const c = col || ['#ff8fb0', '#ffd84a', '#b98cff', '#ffffff', '#ff6b5a', '#7ac8ff'][Math.floor(R() * 6)], d = mix(c, '#3a1a3a', 0.25), l = mix(c, '#ffffff', 0.45);
    s.vl(3, 4, 5, '#3f8a44'); s.set(2, 6, '#5aae54'); s.set(1, 5, '#5aae54'); s.set(4, 7, '#4a9a4a');
    if (season === 'autumn') { s.set(3, 3, '#c08a3a'); s.set(3, 2, '#a8702a'); return s; }
    if (R && R() < 0.15) { s.set(3, 3, c); s.set(3, 2, l); return s; }
    s.set(3, 1, l); s.set(2, 2, l); s.set(4, 2, c); s.set(2, 3, c); s.set(4, 3, d); s.set(3, 4, d); s.set(3, 2, '#ffcf33'); s.set(3, 3, '#e8a020');
    return s;
  }
  function mushrooms(season) {
    // 精修蘑菇丛：三朵高矮不一，伞盖有高光和白点，伞下一圈菌褶，茎带一点阴影，脚下几片落叶
    const s = spr(14, 9); if (season === 'winter') return s;
    for (const [x, h, c] of [[2, 5, '#d9342b'], [7, 7, '#c8a070'], [11, 4, '#d9342b']]) {
      const top = 10 - h; s.vl(x + 1, top, h, '#f4ead8'); s.vl(x + 2, top + 1, h - 1, '#d8c8b0');
      s.ell(x + 1.5, top, 2.6, 1.6, (nx, ny) => (ny > 0.45 ? null : ny > 0.2 ? '#e8d8c0' : nx < -0.3 && ny < -0.2 ? shade(c, 0.35) : nx > 0.5 ? shade(c, -0.2) : c));
      if (c === '#d9342b') { s.set(x, top - 1, '#ffffff'); s.set(x + 2, top, '#ffffff'); }
    }
    s.set(1, 10, '#c08a3a'); s.set(5, 10, '#a8702a'); s.set(12, 10, '#c08a3a');
    return s.outline('#4a2a20', (x, y) => y < 10);
  }
  function reeds(h, season) {
    // 精修芦苇 / 香蒲：细长的叶子交叉，几根顶着褐色的蒲棒（上亮下暗）
    const s = spr(12, h);
    for (let k = 0; k < 7; k++) {
      const x0 = 1 + k * 1.6, hh = Math.round(h * (0.55 + hash(k, 5) * 0.45)), lean = k % 2 ? 1 : -1;
      for (let y = 0; y < hh; y++) s.set(x0 + (y > hh * 0.6 ? lean : 0), h + 1 - y, season === 'winter' ? (y > hh - 2 ? '#d8c8a8' : '#b9a88a') : y > hh - 2 ? '#9ad070' : y < 3 ? '#3a7a3a' : y % 5 === 0 ? '#4c8a3a' : '#6aa64a');
      if (k % 3 === 1 && season !== 'spring') { const x = Math.round(x0), t = h + 1 - hh; s.set(x, t - 1, '#d8b080'); for (let j = 0; j < 3; j++) s.set(x, t + j, j === 0 ? '#a8704a' : '#7a4a2a'); }
    }
    return s;
  }

  // ---------- 小物件 ----------
  function fence(len, snow) {
    // 精修：木桩顶上削尖、有木纹和钉子，横木左亮右暗、下沿有阴影，底部被草遮住一点
    const s = spr(len, 11), wood = ['#6a4630', '#8a6040', '#b08458', '#d0a876', '#e8c898'];
    const rail = (y) => { for (let x = 0; x < len + 2; x++) { s.set(x, y, (x * 7) % 11 === 0 ? wood[2] : wood[3]); s.set(x, y + 1, (x * 5) % 9 === 0 ? wood[1] : wood[2]); s.set(x, y + 2, wood[1]); } };
    rail(3); rail(7);
    for (let x = 1; x < len; x += 7) {
      for (let y = 1; y < 11; y++) { s.set(x, y, y === 1 ? wood[4] : wood[3]); s.set(x + 1, y, (y + x) % 4 === 0 ? wood[1] : wood[2]); s.set(x + 2, y, wood[1]); }
      s.set(x + 1, 0, wood[3]); s.set(x + 1, 4, '#5a5466'); s.set(x + 1, 8, '#5a5466');
      if (snow) { s.set(x, 0, '#ffffff'); s.set(x + 1, 0, '#ffffff'); s.set(x + 2, 1, '#e8f0f8'); }
    }
    for (let x = 0; x < len + 2; x++) if (hash(x, 3, 5) < 0.5) s.set(x, 10, snow ? '#ffffff' : '#6aa04e');
    if (snow) for (let x = 0; x < len + 2; x++) { if (hash(x, 4) < 0.7) s.set(x, 3, '#ffffff'); if (hash(x, 5) < 0.5) s.set(x, 7, '#eef4fa'); }
    return s.outline('#4a3022');
  }
  function sign(label, snow) {
    // 精修路牌：带木纹的横板、四角的钉子、木桩上缠着的藤，桩脚埋在一小堆石头里
    const s = spr(26, 21), W2 = ['#7a5234', '#9a6a44', '#c99a6a', '#e2b88a'];
    s.rect(12, 8, 3, 13, W2[0]); s.vl(12, 8, 13, W2[1]); s.set(13, 12, W2[0]);
    for (let y = 2; y < 11; y++) for (let x = 1; x < 26; x++) s.set(x, y, y === 2 ? W2[3] : y === 10 ? W2[1] : (x * 3 + y * 7) % 13 === 0 ? W2[1] : W2[2]);
    s.hl(1, 6, 25, mix(W2[2], W2[1], 0.5));
    for (const [x, y] of [[2, 3], [24, 3], [2, 9], [24, 9]]) s.set(x, y, '#5a5466');
    if (!snow) for (let y = 11; y < 20; y++) if (y % 2) s.set(y % 4 === 1 ? 11 : 15, y, '#5aa04e');
    s.rect(10, 20, 7, 1, '#9a94a4'); s.set(11, 19, '#b4aebc'); s.set(15, 19, '#8a8494');
    if (snow) { s.hl(1, 1, 25, '#ffffff'); s.hl(3, 0, 20, '#ffffff'); }
    return s.outline('#4a3020');
  }
  function lamp(snow) {
    // 精修路灯：底座有台阶、柱子上有一圈环饰、顶上四面玻璃的灯笼（亮着暖光）+ 小尖顶和挂钩
    const s = spr(9, 28), I = ['#22202c', '#3a3a48', '#55556a'];
    s.rect(2, 25, 6, 3, I[1]); s.hl(2, 25, 6, I[2]); s.rect(3, 24, 4, 1, I[1]);
    s.rect(4, 9, 2, 15, I[1]); s.vl(4, 9, 15, I[2]); s.rect(3, 16, 4, 1, I[2]); s.rect(3, 10, 4, 1, I[2]);
    s.rect(2, 3, 6, 6, I[0]); s.rect(3, 4, 4, 4, '#ffd98a'); s.set(3, 4, '#fff4c8'); s.set(4, 4, '#fff4c8'); s.vl(5, 4, 4, '#e8b860');
    s.hl(1, 2, 8, I[1]); s.hl(2, 1, 6, I[2]); s.set(4, 0, I[1]); s.set(5, 0, I[1]); s.hl(2, 9, 6, I[1]);
    if (snow) { s.hl(1, 1, 8, '#ffffff'); s.set(4, 0, '#ffffff'); }
    return s.outline('#121018');
  }
  function bench(snow) {
    // 精修长椅：三根靠背横条 + 两根座板（木纹、亮边），铸铁扶手弯成卷，铁腿
    const s = spr(24, 12), Wd = ['#6a4630', '#8a5e40', '#a87a54', '#c99a6a'], I = '#2e2a36';
    for (const y of [1, 3]) { for (let x = 2; x < 23; x++) s.set(x, y, (x * 5) % 11 === 0 ? Wd[1] : Wd[2]); s.hl(2, y + 1, 21, Wd[1]); }
    for (const y of [6, 7]) for (let x = 1; x < 24; x++) s.set(x, y, y === 6 ? Wd[3] : (x * 3) % 7 === 0 ? Wd[1] : Wd[2]);
    s.hl(1, 8, 23, Wd[0]);
    for (const x of [2, 21]) { s.vl(x, 1, 11, I); s.set(x + 1, 9, I); s.set(x + 1, 11, I); s.set(x - 1, 11, I); s.set(x + (x < 10 ? -1 : 1), 5, I); s.set(x + (x < 10 ? -1 : 1), 4, I); }
    if (snow) { s.hl(2, 0, 21, '#ffffff'); s.hl(1, 5, 23, '#ffffff'); }
    return s.outline('#2a1a14');
  }
  function stump(snow) {
    // 精修树桩：顶面一圈圈年轮（中心深、外圈浅、最外一圈树皮），侧面树皮竖纹，根往两边伸，背阴处的小蘑菇和苔
    const s = spr(14, 10);
    for (let y = 3; y < 10; y++) for (let x = 2; x < 13; x++) { const nx = (x - 7.5) / 5.5; s.set(x, y, nx < -0.5 ? BARK[3] : nx < 0.3 ? ((x + y) % 3 === 0 ? BARK[1] : BARK[2]) : BARK[1]); }
    s.set(1, 9, BARK[2]); s.set(0, 10, BARK[1]); s.set(13, 9, BARK[1]); s.set(14, 10, BARK[0]);
    s.ell(7.5, 3, 5.5, 1.8, (nx, ny) => { const d = Math.sqrt(nx * nx + ny * ny); return d > 0.85 ? BARK[1] : d > 0.65 ? '#e2c49a' : d > 0.4 ? '#c99a6a' : d > 0.2 ? '#e2c49a' : '#a8865a'; });
    if (!snow) { s.set(12, 6, '#5a8a4a'); s.set(12, 7, '#5a8a4a'); s.set(11, 8, '#6aa04e'); s.set(3, 7, '#f4ead8'); s.set(3, 6, '#d9342b'); }
    if (snow) s.ell(7.5, 2.5, 5.5, 1.5, '#ffffff');
    return s.outline('#3a2418');
  }
  function hayBale(snow) {
    // 精修：圆滚滚的干草卷——侧面一圈圈的卷纹、两道麻绳、零散翘出来的草茎
    const s = spr(18, 13), H = ['#8a6420', '#b08a2e', '#d4a43a', '#e8c058', '#f6dc8a'];
    s.ell(9.5, 7.5, 8.5, 5.6, (nx, ny, x, y) => {
      const l = -nx * 0.5 - ny * 0.9 + (hash(x, y, 31) - 0.5) * 0.5; let c = l > 0.6 ? H[4] : l > 0.1 ? H[3] : l > -0.4 ? H[2] : l > -0.8 ? H[1] : H[0];
      if ((x + y * 2) % 5 === 0) c = H[Math.max(0, H.indexOf(c) - 1)];
      return c;
    });
    for (let y = 3; y < 13; y++) { s.set(6, y, '#a8784a'); s.set(13, y, '#a8784a'); }
    for (let k = 0; k < 7; k++) { const x = 2 + Math.floor(hash(k, 1, 9) * 15), y = 2 + Math.floor(hash(k, 2, 9) * 3); s.set(x, y - 1, H[3]); s.set(x + 1, y - 2, H[4]); }
    if (snow) { s.ell(9.5, 3, 6.5, 1.6, '#ffffff'); s.set(4, 4, '#eef4fa'); s.set(15, 4, '#eef4fa'); }
    return s.outline('#5a3a14');
  }
  function snowman() {
    // 精修雪人：三个雪球（左上受光、右下淡蓝阴影、表面一点雪粒），煤块眼睛和纽扣、带阴影的胡萝卜鼻子、
    // 树枝手臂（带小分叉）、红白条纹围巾（垂下的一截带流苏）、礼帽（帽檐、红帽带），脚下一圈雪
    const s = spr(22, 30), SN = ['#9ab0c8', '#c4d4e6', '#e2ecf6', '#ffffff'];
    const ball = (cx, cy, r) => s.ell(cx, cy, r, r * 0.92, (nx, ny, x, y) => { const l = -nx * 0.6 - ny * 0.8; let c = l > 0.45 ? SN[3] : l > -0.2 ? SN[2] : l > -0.7 ? SN[1] : SN[0]; if (hash(cx + x, cy + y, 41) < 0.06) c = SN[Math.max(0, SN.indexOf(c) - 1)]; return c; });
    ball(11, 24, 7); ball(11, 15.5, 5.2); ball(11, 8.5, 4);
    // 树枝手臂
    for (let i = 0; i < 6; i++) { s.set(6 - i, 14 - Math.round(i * 0.6), '#5a3a22'); s.set(16 + i, 14 - Math.round(i * 0.7), '#5a3a22'); }
    s.set(2, 10, '#5a3a22'); s.set(1, 11, '#5a3a22'); s.set(21, 9, '#5a3a22'); s.set(22, 11, '#5a3a22');
    // 眼睛、嘴、鼻子
    for (const [x, y] of [[9, 7], [13, 7]]) { s.set(x, y, '#1e1c24'); s.set(x, y - 1, '#3a3844'); }
    for (const x of [9, 10, 12, 13]) s.set(x, 11 - (x === 9 || x === 13 ? 1 : 0), '#2a2830');
    s.set(11, 9, '#ff9a3a'); s.set(12, 9, '#ff8a2a'); s.set(13, 9, '#e86a1a'); s.set(14, 10, '#c8561a'); s.set(11, 10, '#c8561a');
    for (const y of [15, 18, 21, 24]) { s.set(11, y, '#1e1c24'); s.set(10, y - 1, '#4a4854'); }
    // 围巾
    for (let x = 6; x <= 16; x++) { s.set(x, 12, (x % 4 < 2) ? '#d83a3a' : '#f4eee4'); s.set(x, 13, (x % 4 < 2) ? '#a82a2a' : '#d8d0c4'); }
    for (let y = 13; y < 19; y++) { s.set(14, y, y % 3 ? '#d83a3a' : '#f4eee4'); s.set(15, y, y % 3 ? '#a82a2a' : '#d8d0c4'); }
    s.set(14, 19, '#d83a3a'); s.set(15, 19, '#a82a2a'); s.set(14, 20, '#f4eee4');
    // 礼帽
    s.rect(6, 4, 11, 1, '#2a2834'); s.hl(6, 4, 11, '#3e3c4a'); s.rect(8, 0, 7, 4, '#2a2834'); s.vl(8, 0, 4, '#4a4858'); s.hl(8, 0, 7, '#4a4858'); s.hl(8, 3, 7, '#c83a3a');
    // 脚下的雪
    for (let x = 2; x <= 20; x++) { s.set(x, 31, hash(x, 2, 3) < 0.5 ? SN[2] : SN[3]); if (hash(x, 4, 3) < 0.3) s.set(x, 30, SN[3]); }
    return s.outline('#5a6e88');
  }
  function pumpkin() {
    // 精修南瓜：一瓣瓣的棱（每瓣中间亮、瓣缝深），顶上弯曲的绿茎和一片小叶、一根卷须
    const s = spr(14, 11), O = ['#8a3a10', '#c45a14', '#e47a1e', '#ff9a3a', '#ffc070'];
    s.ell(7.5, 7, 7, 4.2, (nx, ny) => { const seg = ((nx + 1) * 3.5) % 1; let c = seg < 0.18 || seg > 0.88 ? O[1] : seg < 0.45 ? O[3] : O[2]; if (nx < -0.4 && ny < -0.2 && seg > 0.2 && seg < 0.5) c = O[4]; if (ny > 0.5) c = O[Math.max(0, O.indexOf(c) - 1)]; if (nx > 0.6) c = O[Math.max(0, O.indexOf(c) - 1)]; return c; });
    s.set(7, 3, '#3a5a20'); s.set(8, 2, '#4c7a30'); s.set(8, 1, '#5a8a3a'); s.set(9, 1, '#4c7a30');
    s.set(5, 2, '#5aa04e'); s.set(4, 2, '#6ab05a'); s.set(5, 3, '#3f8a44'); s.set(10, 2, '#6a9a3a'); s.set(11, 3, '#6a9a3a'); s.set(11, 2, '#6a9a3a');
    return s.outline('#5a2208');
  }
  function lily(season) {
    // 精修荷叶：带缺口的圆叶（叶脉从中心放射、边缘一圈亮），夏天开一朵多层花瓣的荷花
    const s = spr(14, 6); if (season === 'winter') return s;
    s.ell(7, 3.5, 6.5, 2.4, (nx, ny) => { if (nx > 0.05 && nx < 0.3 && ny < 0.1) return null; const a = Math.atan2(ny, nx); if (Math.abs(Math.sin(a * 4)) < 0.12 && nx * nx + ny * ny > 0.1) return '#2f6f2a'; return nx * nx + ny * ny > 0.75 ? (ny < 0 ? '#8ac868' : '#2f6f2a') : ny < -0.2 ? '#6ab05a' : '#4a9a44'; });
    if (season === 'summer' || season === 'spring') { s.set(4, 1, '#ff9fc0'); s.set(3, 2, '#ffb0cc'); s.set(5, 2, '#e8789a'); s.set(4, 0, '#fff0f6'); s.set(4, 2, '#ffd84a'); s.set(3, 1, '#ffe0ec'); s.set(5, 1, '#ff8fb0'); }
    return s;
  }

  // ---------- 精修建筑小工具：木板墙、鳞片瓦屋顶、门、窗（所有小屋共用，保证每一栋都有同样的细节水准） ----------
  const BLD = {
    // 横 / 竖木板墙：每块板有亮边和缝，偶尔木节，越往下越旧
    planks(s, x0, y0, w, h, cols, vertical) {
      const [d, m, l, hi] = cols;
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const a = vertical ? x - x0 : y - y0, b = vertical ? y : x, k = a % 3;
        let c = k === 0 ? hi : k === 2 ? d : m;
        if (k === 1 && hash(Math.floor(a / 3), Math.floor(b / 5), 21) < 0.15) c = l;
        if (k === 1 && hash(Math.floor(a / 3), Math.floor(b / 7), 22) < 0.05) c = d;
        if ((y - y0) / h > 0.8 && hash(x, y, 23) < 0.3) c = mix(c, '#3a2a20', 0.25);
        s.set(x, y, c);
      }
    },
    // 人字形屋顶：一排排错开的瓦片（上亮下暗），右半边在阴影里，屋檐有一条封檐板，可以盖雪
    gable(s, cx, top, h, halfBase, cols, snow, overhang = 1) {
      const [d, m, l, hi] = cols;
      for (let y = 0; y < h; y++) {
        const half = Math.round(1 + (y / Math.max(1, h - 1)) * (halfBase + overhang - 1)), r = Math.floor(y / 2), sub = y % 2, off = (r % 2) * 2;
        for (let x = -half; x <= half; x++) {
          const tx = (x + 60 + off) % 4;
          let c = sub === 0 ? (tx === 0 ? m : l) : tx === 0 ? d : m;
          if (sub === 0 && hash(Math.floor((x + 60 + off) / 4), r, 24) < 0.15) c = hi;
          if (x > 0) c = mix(c, '#1a1020', 0.2);
          if (Math.abs(x) >= half - 0) c = d;
          if (snow && (y < h * 0.55 || hash(x, y, 25) < 0.35) && x < half * 0.7) c = sub === 0 ? '#ffffff' : '#e6eef6';
          s.set(cx + x, top + y, c);
        }
      }
      // 封檐板
      const half = halfBase + overhang; for (let x = -half; x <= half; x++) s.set(cx + x, top + h, snow ? '#ffffff' : mix(d, '#000000', 0.25));
    },
    // 木门：竖板、门框、横撑、门把手（可选小窗）
    door(s, x, y, w, h, wood, frame, opt = {}) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.set(x + i, y + j, i % 2 ? wood : mix(wood, '#ffffff', 0.12));
      for (let j = -1; j < h; j++) { s.set(x - 1, y + j, frame); s.set(x + w, y + j, mix(frame, '#000000', 0.25)); }
      for (let i = -1; i <= w; i++) s.set(x + i, y - 1, mix(frame, '#ffffff', 0.15));
      s.hl(x, y + Math.round(h * 0.3), w, mix(wood, '#000000', 0.3)); s.hl(x, y + Math.round(h * 0.75), w, mix(wood, '#000000', 0.3));
      s.set(x + w - 2, y + Math.round(h * 0.55), '#e8c860');
      if (opt.round) { s.set(x, y, null); s.set(x + w - 1, y, null); }
      if (opt.dark) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.set(x + i, y + j, j < 2 ? '#120a10' : '#1e1418');
    },
    // 窗：窗框、十字窗棂、玻璃反光（亮着灯就是暖黄色）、窗台 + 花箱
    window(s, x, y, w, h, frame, opt = {}) {
      const glass = opt.lit ? ['#ffd98a', '#fff2c0'] : ['#3a4a6a', '#a8c8e8'];
      s.rect(x - 1, y - 1, w + 2, h + 2, frame);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.set(x + i, y + j, opt.lit ? (j < h / 2 ? glass[1] : glass[0]) : (i + j < 2 ? glass[1] : glass[0]));
      if (w >= 4) s.vl(x + Math.floor(w / 2), y, h, frame); if (h >= 4) s.hl(x, y + Math.floor(h / 2), w, frame);
      if (!opt.lit) s.set(x + w - 1, y + h - 1, '#5a6a8a');
      s.hl(x - 1, y + h + 1, w + 2, mix(frame, '#000000', 0.3));
      if (opt.box) { s.rect(x - 1, y + h + 2, w + 2, 2, '#8a6040'); s.hl(x - 1, y + h + 2, w + 2, '#b08458'); for (let i = 0; i < w + 1; i += 2) { s.set(x + i - 1, y + h + 1, '#5aa04e'); s.set(x + i, y + h, opt.box[i % opt.box.length]); } }
    },
    // 石头基座（一块块错开、上亮下暗）
    stones(s, x0, y0, w, h, cols = ['#5a5466', '#8a8494', '#9a94a4', '#b4aebc']) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const r = y - y0, sx = Math.floor((x + (r % 2) * 2) / 4), e = (x + (r % 2) * 2) % 4 === 3;
        s.set(x, y, e ? cols[0] : r === 0 ? cols[3] : cols[1 + Math.floor(hash(sx, r, 26) * 2)]);
      }
    },
  };
  PP.ART = { BLD, Pix, spr, rgba, shade, mix, rng, hash, noise, dith, LEAF, PINE, BARK, OUT, outCol, pine, broadleaf, palm, cactus, bamboo, jungleTree, bush, rock, grassTuft, flower, mushrooms, reeds, fence, sign, lamp, bench, stump, hayBale, snowman, pumpkin, lily };
})();
