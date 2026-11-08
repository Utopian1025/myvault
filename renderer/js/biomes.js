// 九个地方怎么画：远景 → 中景 → 地面 → 后排的东西（家、设施、树）→ 前排点缀
// 只负责“摆什么、摆哪儿”；具体的树、石头、房子在 art.js / places.js 里画
(function () {
  const PP = (window.PP = window.PP || {});
  const T = () => PP.ART;

  // ---------- 通用：远景 ----------
  // 山：多层，越远越浅，可带雪顶
  function mountains(P, lay, layers, seed) {
    const { noise, mix } = T(), { cols, gy } = lay;
    const maxSpan = (gy - (lay.full ? 4 : 9)) / 1.1; // 山尖不能顶到画面最上面（小场景顶上还有一段渐隐）
    layers.forEach(([hFrac, col, snow, rough], li) => {
      const span = Math.min(gy * hFrac, maxSpan * (1 - li * 0.08));
      for (let x = 0; x < cols; x++) {
        const n = noise(x / (60 - li * 12), li * 3.7, seed + li) * 0.7 + noise(x / 17, li, seed + 9) * 0.3 * (rough || 1);
        const top = Math.round(gy - span * (0.35 + n * 0.75));
        for (let y = top; y < gy; y++) {
          let c = col;
          const ridge = noise(x / 6, y / 6, seed + li + 5);
          if ((y - top) < 2) c = mix(col, '#ffffff', 0.12);
          else if (ridge < 0.32) c = mix(col, '#000000', 0.08);
          if (snow && y - top < span * 0.22 * (0.6 + noise(x / 9, 1, seed) * 0.8)) c = (ridge < 0.4 ? '#dde8f2' : '#f6fafe');
          // 空气感：越靠山脚越被薄雾冲淡，远的山层更淡
          c = mix(c, '#efe4ee', Math.min(0.32, ((y - top) / Math.max(1, gy - top)) * 0.22 + (layers.length - 1 - li) * 0.06));
          P.set(x, y, c);
        }
      }
    });
  }
  // 起伏的山丘
  function hills(P, lay, layers, seed) {
    const { noise, dith } = T(), { cols, gy } = lay;
    const maxSpan = gy - (lay.full ? 4 : 9);
    layers.forEach(([hFrac, col, col2], li) => {
      const span = Math.min(gy * hFrac, maxSpan);
      for (let x = 0; x < cols; x++) {
        const top = Math.round(gy - span * (0.45 + 0.55 * noise(x / (90 - li * 20), li, seed + li)));
        for (let y = top; y < gy; y++) P.set(x, y, col2 && dith(x, y, (y - top) / Math.max(1, gy - top) * 0.6) ? col2 : col);
      }
    });
  }
  // 远处一排树林（剪影 + 一点受光）
  function treeLine(P, lay, bottom, height, cols2, kind, seed) {
    // 远处的树林精修：前后两排（后排更淡），松树是一层层带锯齿的尖塔，阔叶树是几团带亮边的叶团，树之间有深色缝，底部有一道阴影
    const A = T(), { hash, mix, cols } = { hash: T().hash, mix: T().mix, cols: lay.cols };
    const [dark, mid, light] = cols2;
    for (const row of [0, 1]) {
      const haze = (c) => (row === 0 ? mix(c, '#d8dcea', 0.32) : c), hgt = height * (row === 0 ? 1.12 : 1), by = bottom - (row === 0 ? 2 : 0);
      for (let x = -6 + row * 2; x < cols + 6; x += 3 + Math.floor(hash(x, 1 + row, seed) * 4)) {
        const h = Math.round(hgt * (0.55 + hash(x, 2 + row, seed) * 0.45)), pine = kind === 'pine' || (kind === 'mix' && hash(x, 9, seed) < 0.4);
        if (pine) {
          for (let k = 0; k < h; k++) {
            const tier = k % 4, half = Math.round((k / h) * (h * 0.28)) + (tier === 3 ? 1 : 0);
            for (let dx = -half; dx <= half; dx++) { let c = dx < -half / 2 ? light : dx < half / 2 ? mid : dark; if (tier === 0 && Math.abs(dx) > 0) c = dark; P.set(x + dx, by - h + k, haze(c)); }
          }
          P.set(x, by - h - 1, haze(light));
        } else {
          const r = Math.round(h * 0.4), cyy = by - r - Math.round(h * 0.25);
          for (const [ox, oy, rr] of [[-0.45, 0.2, 0.7], [0.45, 0.25, 0.7], [0, -0.15, 0.85]]) {
            const R2 = Math.max(1.5, r * rr), X = x + ox * r, Y = cyy + oy * r;
            for (let yy = -Math.ceil(R2); yy <= R2; yy++) for (let dx = -Math.ceil(R2); dx <= R2; dx++) {
              const d = dx * dx + yy * yy * 1.25; if (d > R2 * R2) continue;
              const l = (-dx - yy * 1.3) / R2; let c = l > 0.7 ? light : l > -0.4 ? mid : dark;
              if (d > R2 * R2 * 0.75 && yy > 0) c = dark;
              if (hash(Math.round(X + dx), Math.round(Y + yy), seed + 3) < 0.08) c = dark;
              P.set(Math.round(X + dx), Math.round(Y + yy), haze(c));
            }
          }
          P.rect(x, by - Math.round(h * 0.3), 1, Math.round(h * 0.3), haze(dark));
        }
      }
    }
    P.rect(0, bottom - 1, lay.cols, 2, dark);
    for (let x = 0; x < lay.cols; x++) if (hash(x, 4, seed) < 0.5) P.set(x, bottom - 2, dark);
  }
  // ---------- 通用：地面 ----------
  function ground(P, lay, pal, opt = {}) {
    const { noise, hash, dith } = T(), { cols, rows, gy } = lay;
    const { mix } = T();
    for (let y = gy; y < rows; y++) for (let x = 0; x < cols; x++) {
      // 色块之间用抖动过渡，不再是硬邦邦的色阶
      const n = noise(x / 7, y / 4, 101) + (dith(x, y, 0.5) ? 0.04 : -0.04);
      let c = n < 0.33 ? pal[0] : n < 0.7 ? pal[1] : pal[2];
      if (hash(x, y, 7) < 0.025) c = pal[3];
      if (y - gy < 2) c = pal[2];
      // 越往前越深一点（近处的地面在阴影里）
      const depth = (y - gy) / Math.max(1, rows - gy);
      if (depth > 0.6 && dith(x, y, (depth - 0.6) * 1.2)) c = mix(c, "#3a2846", 0.05);
      P.set(x, y, c);
    }
    // 地面上的小细节：一簇簇草叶（亮的叶尖 + 暗的根）、小石子（上亮下暗）
    if (opt.blades) for (let i = 0; i < cols * (rows - gy) * 0.018; i++) {
      const x = Math.floor(hash(i, 11, 3) * cols), y = gy + 3 + Math.floor(hash(i, 12, 3) * (rows - gy - 4));
      P.set(x, y, opt.blades[1]); P.set(x - 1, y + 1, opt.blades[0]); P.set(x + 1, y + 1, opt.blades[0]); P.set(x, y + 1, mix(pal[0], '#2a1e30', 0.25));
    }
    for (let i = 0; i < cols * 0.05; i++) {
      const x = Math.floor(hash(i, 21, 5) * cols), y = gy + 3 + Math.floor(hash(i, 22, 5) * (rows - gy - 4));
      P.set(x, y, mix(pal[2], '#ffffff', 0.35)); P.set(x + 1, y, mix(pal[1], '#ffffff', 0.15)); P.set(x, y + 1, mix(pal[0], '#2a1e30', 0.3)); P.set(x + 1, y + 1, mix(pal[0], '#2a1e30', 0.35));
    }
    // 小路：从左到右，弯弯的，走的人多所以颜色浅
    if (opt.path) {
      const py = gy + Math.round((rows - gy) * 0.5);
      for (let x = 0; x < cols; x++) {
        const yc = py + Math.round(Math.sin(x / 47) * 2 + Math.sin(x / 13) * 0.7), w = 3 + Math.round(noise(x / 9, 3, 5) * 2);
        for (let k = -w; k <= w; k++) { if (Math.abs(k) === w && hash(x, k, 3) < 0.5) continue; P.set(x, yc + k, Math.abs(k) >= w - 1 ? opt.path[1] : hash(x, yc + k, 9) < 0.06 ? opt.path[2] : k < -w + 3 && dith(x, yc + k, 0.35) ? mix(opt.path[0], '#ffffff', 0.18) : opt.path[0]); }
        if (hash(x, 31, 3) < 0.5) P.set(x, yc + w + 1, mix(opt.path[1], '#2a1e30', 0.3)); // 路边一道浅浅的阴影
        // 两道浅浅的车辙、路边的草叶伸进路面
        if (hash(x, 34, 3) < 0.7) { P.set(x, yc - 1, mix(opt.path[0], opt.path[1], 0.6)); P.set(x, yc + 2, mix(opt.path[0], opt.path[1], 0.6)); }
        if (opt.blades && hash(x, 35, 3) < 0.25) { P.set(x, yc - w, opt.blades[1]); if (hash(x, 36, 3) < 0.5) P.set(x, yc - w + 1, opt.blades[0]); }
        if (opt.blades && hash(x, 37, 3) < 0.2) P.set(x, yc + w, opt.blades[0]);
        if (hash(x, 32, 3) < 0.035) { const k = Math.round((hash(x, 33, 3) - 0.5) * (w - 1) * 2); P.set(x, yc + k, mix(opt.path[2], '#ffffff', 0.4)); P.set(x, yc + k + 1, mix(opt.path[2], '#2a1e30', 0.3)); }
      }
      lay.path = py;
    }
    // 后排边缘的草叶
    if (opt.blades) for (let x = 0; x < cols; x += 1 + Math.floor(hash(x, 4) * 3)) { const h = 1 + Math.floor(hash(x, 5) * 3); for (let k = 0; k < h; k++) P.set(x, gy - 1 - k, k === h - 1 ? opt.blades[1] : opt.blades[0]); }
  }
  function season(lay) { return lay.season; }
  const W = (lay) => lay.season === 'winter';
  const GROUND = {
    spring: ['#7cc35a', '#6ab04c', '#8fd06a', '#b7e88a'], summer: ['#5fae4a', '#4f9a40', '#72bc54', '#9ad06a'],
    autumn: ['#b9a24a', '#a68a3a', '#c8b05a', '#d9662a'], winter: ['#eef4fb', '#e2eaf4', '#ffffff', '#c8d4e4'],
  };
  const PATH = { spring: ['#d4b888', '#c4a474', '#a8885a'], summer: ['#cfae7a', '#bc9a68', '#9a7a50'], autumn: ['#c4a070', '#b08a5a', '#8a6a44'], winter: ['#dcd6cc', '#cac2b6', '#b0a898'] };
  const BLADES = { spring: ['#5aa64e', '#9ad87a'], summer: ['#4f9a40', '#7cc35a'], autumn: ['#a68a3a', '#d0b05a'], winter: ['#d8e2ec', '#ffffff'] };

  // 放一个东西：row 是它脚下的行（越大越靠前）
  function put(lay, s, c, r, extra) { lay.items.push(Object.assign({ s, c: Math.round(c), r: Math.round(r) }, extra || {})); }
  function spot(lay, id, c, r, extra) { lay.spots[id] = Object.assign({ c: Math.round(c), r: Math.round(r) }, extra || {}); }
  function home(lay, species, s, c, r, door) {
    put(lay, s, c, r, { home: species });
    const dx = door && door.x != null ? Math.round(c - s.w / 2 + door.x) : Math.round(c);
    lay.homes.push({ species, c: dx, r, x0: Math.round(c - s.w / 2), x1: Math.round(c + s.w / 2), y0: r - s.h, y1: r + 1, top: r - s.h });
    lay.spots[species + '_home'] = { c: dx, r, home: species };
  }
  const C = (lay, f) => Math.round(lay.cols * f);
  // 结构的大小：全屏时大一点（但和宠物同样的像素）
  const SZ = (lay, n) => Math.round(n * (lay.full ? 1.35 : 1) * Math.min(1, (lay.gy + 6) / 56));

  // ---------- 精修工具：岩石切面（快速 Voronoi：网格里抖动的点，最近点决定是哪块石头；离两块石头一样近的地方是石缝） ----------
  function cellRock(P, x0, y0, x1, y1, cs, pal, seed, inside, opt = {}) {
    const { hash, mix } = T(), ch = cs * (opt.flat || 0.7);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (inside && !inside(x, y)) continue;
      const gx = Math.floor(x / cs), gyy = Math.floor(y / ch);
      let d1 = 1e9, d2 = 1e9, px = 0, py = 0, cid = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const cx = gx + i, cy = gyy + j, qx = (cx + 0.15 + hash(cx, cy, seed) * 0.7) * cs, qy = (cy + 0.15 + hash(cx, cy, seed + 1) * 0.7) * ch;
        const d = Math.hypot(x - qx, (y - qy) * (cs / ch));
        if (d < d1) { d2 = d1; d1 = d; px = qx; py = qy; cid = cx * 7919 + cy; } else if (d < d2) d2 = d;
      }
      let c;
      if (d2 - d1 < (opt.gap || 1.1)) c = pal[0];
      else {
        const l = -(x - px) / cs * 1.3 - (y - py) / ch * 1.7 + (hash(cid, 3, seed) - 0.5) * 0.9 + (opt.bias || 0);
        c = l > 0.75 ? pal[4] : l > 0.2 ? pal[3] : l > -0.35 ? pal[2] : pal[1];
        if (d2 - d1 < 2.2 && y > py) c = pal[1]; // 石缝下沿的阴影
        if (hash(x, y, seed + 5) < 0.03) c = pal[1];
      }
      if (opt.tint) c = mix(c, opt.tint[0], opt.tint[1](x, y));
      P.set(x, y, c);
    }
  }
  // 海面：天边一道亮线，远处深、近处浅（抖动过渡），一道道浪尖的亮线、浪谷的暗线，越近越密；岸边一道起伏的白浪花 + 湿沙
  function seaWater(P, lay, y0, y1, pal, seed, opt = {}) {
    const { noise, dith, hash, mix } = T(), cols = lay.cols, n = y1 - y0;
    for (let y = y0; y < y1; y++) {
      const k = (y - y0) / Math.max(1, n);
      for (let x = 0; x < cols; x++) {
        const t = k * 3; let c = t < 1 ? (dith(x, y, t) ? pal[1] : pal[0]) : t < 2 ? (dith(x, y, t - 1) ? pal[2] : pal[1]) : (dith(x, y, t - 2) ? pal[3] : pal[2]);
        if (y === y0) c = pal[4];
        else if (y === y0 + 1) c = mix(pal[0], pal[4], 0.5);
        const v = noise(x / (14 - k * 8), y * 0.85, seed);
        if (v > 0.8 - k * 0.08 && y > y0 + 1) c = mix(c, '#ffffff', 0.35 + k * 0.25);
        else if (v < 0.17) c = mix(c, '#0a1a3a', 0.18);
        if (opt.glint && y < y0 + n * 0.5 && Math.abs(x - opt.glint) < 30 * (1 - k) && hash(x, y, seed + 2) < 0.18) c = '#fff6d8';
        P.set(x, y, c);
      }
    }
    if (opt.foam) for (let x = 0; x < cols; x++) {
      const fy = y1 - 1 + Math.round(Math.sin(x / 9 + seed) * 0.8 + Math.sin(x / 23) * 0.8);
      P.set(x, fy, '#ffffff'); if (hash(x, 1, seed) < 0.6) P.set(x, fy - 1, mix(pal[3], '#ffffff', 0.6));
      if (hash(x, 2, seed) < 0.35) P.set(x, fy - 2, mix(pal[3], '#ffffff', 0.35));
      for (let k = 1; k <= 3; k++) P.set(x, fy + k, mix(opt.foam, '#5a6a7a', 0.28 - k * 0.07)); // 湿沙
    }
  }
  // 倒影：把水面上方的景物上下翻过来、混进水色里、隔行抖动（看起来像在晃）
  function reflect(P, lay, wy, rows, waterCol, strength) {
    const { mix, hash } = T();
    for (let k = 0; k < rows; k++) for (let x = 0; x < lay.cols; x++) {
      const sx = x + (k % 3 === 1 ? 1 : 0), v = P.get(sx, wy - 1 - k * 1.5 | 0); if (!v) continue;
      const r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255;
      const src = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
      if (hash(x, k, 77) < 0.12) continue;
      P.set(x, wy + k, mix(src, waterCol, Math.min(0.92, 1 - strength + k / rows * 0.4)));
    }
  }
  // 平顶山：一层层水平的岩层（亮暗相间），顶上平、两侧陡、山脚一圈碎石坡，右侧背阴，远的被雾冲淡
  function mesa(P, lay, cx, w, h, pal, seed, haze) {
    const { hash, mix, noise } = T(), gy = lay.gy;
    for (let x = Math.round(cx - w); x <= cx + w; x++) {
      const k = Math.abs(x - cx) / w; if (k > 1) continue;
      const step = k > 0.36 && k < 0.5, cliff = k < 0.5, top = k < 0.36 ? gy - h + Math.round(noise(x / 5, 1, seed) * 2) + (hash(Math.floor(x / 4), 1, seed) < 0.12 ? 1 : 0) : step ? gy - Math.round(h * (0.72 - (k - 0.36) * 1.2)) + Math.round(noise(x / 4, 2, seed) * 2) : gy - Math.round(h * 0.55 * Math.pow(Math.max(0, (1 - k) / 0.5), 1.4));
      for (let y = top; y < gy; y++) {
        const band = Math.floor((y - (gy - h)) / 3 + noise(x / 9, 2, seed) * 1.2), right = x > cx + w * 0.22;
        let c = pal[1 + (band % 3)];
        if (y === top) c = pal[4];
        if (!cliff) c = hash(x, y, seed) < 0.3 ? pal[1] : pal[2];
        if (right) c = mix(c, pal[0], 0.35);
        if (cliff && hash(Math.floor(x / 2), Math.floor(y / 6), seed + 3) < 0.12) c = mix(c, pal[0], 0.3); // 竖向的冲刷痕
        P.set(x, y, mix(c, '#f0e0d8', haze));
      }
    }
  }
  function tumbleweed(R) {
    const A = T(), s = A.spr(10, 8);
    for (let k = 0; k < 40; k++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 4; s.set(5.5 + Math.cos(a) * r * 1.2, 4.5 + Math.sin(a) * r, k % 3 ? '#a8885a' : '#7a5a34'); }
    return s.outline('#4a3420');
  }
  function barrelCactus(R) {
    const A = T(), s = A.spr(9, 8), G = ['#2c6a32', '#3e863e', '#58a250', '#80c06a'];
    s.ell(5, 5.5, 4, 3.6, (nx, ny, x) => { const rib = (x + 10) % 2; let c = nx < -0.3 ? G[3] : nx < 0.3 ? G[2] : G[1]; if (rib) c = G[Math.max(0, G.indexOf(c) - 1)]; return c; });
    for (let x = 2; x < 9; x += 2) s.set(x, 3 + (x % 4 ? 1 : 0), '#f2f0d0');
    s.set(4, 1, '#ffd84a'); s.set(5, 1, '#ff8a3a'); s.set(6, 1, '#ffd84a'); s.set(5, 0, '#ffb06a');
    return s.outline('#163a20');
  }
  function crystal(h, col) {
    // 洞里的水晶簇：几根六棱柱斜着长出来，每根左亮右暗、尖顶一道高光
    const A = T(), s = A.spr(h, h), lt = A.shade(col, 0.45), dk = A.shade(col, -0.35);
    for (const [ox, len, lean] of [[0, 1, 0], [-0.32, 0.65, -0.5], [0.3, 0.75, 0.45], [0.12, 0.45, 0.2]]) {
      const L = Math.round(h * len), bx = (h + 2) / 2 + ox * h;
      for (let i = 0; i < L; i++) { const x = bx + lean * i * 0.6, y = h + 1 - i, half = i > L - 3 ? 0 : 1; for (let d = -half; d <= half; d++) s.set(x + d, y, d < 0 ? lt : d > 0 ? dk : col); }
      s.set(bx + lean * L * 0.6, h + 1 - L, '#ffffff');
    }
    return s.outline(A.shade(col, -0.6));
  }
  function stalagmite(h, pal) {
    const A = T(), s = A.spr(9, h);
    for (let y = 0; y < h; y++) { const half = Math.max(0, Math.round((y / h) * 3.6)); for (let x = -half; x <= half; x++) s.set(5 + x, y + 1, x < -half / 3 ? pal[3] : x < half / 3 ? pal[2] : pal[1]); if (y % 4 === 2) s.set(5 - half, y + 1, pal[1]); }
    s.set(5, 1, pal[3]); s.set(5, 0, '#a8e0ff');
    return s.outline(pal[0]);
  }
  function seagrass(h, R) {
    const A = T(), s = A.spr(9, h);
    for (let k = 0; k < 5; k++) { const x0 = 2 + k * 1.3, hh = Math.round(h * (0.5 + R() * 0.5)), bend = (k - 2) * 0.12; for (let y = 0; y < hh; y++) s.set(x0 + Math.sin(y / 4 + k) * 0.8 + bend * y, h + 1 - y, y > hh - 2 ? '#8ad46a' : y < 2 ? '#2a6a34' : k % 2 ? '#3f8a44' : '#5aa64e'); }
    return s.outline('#1c3a20');
  }

  // ---------- 九个地方 ----------
  const B = {};
  B.snow = (P, lay, R) => {
    const A = T(); lay.season = 'winter';
    mountains(P, lay, [[0.95, '#b8c8dc', true, 1.3], [0.7, '#9cb0c8', true, 1], [0.42, '#8aa0b8', true, 0.8]], 11);
    treeLine(P, lay, lay.gy, Math.min(26, lay.gy * 0.32), ['#3e5a5e', '#56747a', '#7a969c'], 'pine', 3);
    for (let x = 0; x < lay.cols; x += 2) if (A.hash(x, 0, 4) < 0.6) P.set(x, lay.gy - 1, '#ffffff');
    ground(P, lay, GROUND.winter, { path: ['#f6f9fc', '#dfe8f2', '#c8d4e4'] });
    // 冰湖
    const pc = C(lay, 0.46), py = lay.base + Math.round((lay.rows - lay.base) * 0.35), pr = Math.round(lay.cols * 0.09);
    P.ell(pc, py, pr, Math.max(3, (lay.rows - lay.base) * 0.28), (nx, ny, x, y) => (A.hash(x, y, 2) < 0.04 ? '#ffffff' : ny < -0.5 ? '#e6f3fb' : (x + y) % 9 === 0 ? '#b8d8ee' : '#cfe6f5'));
    const ic = C(lay, 0.52); P.ell(ic, py, 4, 2, (nx, ny) => (nx * nx + ny * ny > 0.6 ? '#ffffff' : '#1e4f7a'));
    spot(lay, 'icehole', ic, py + 1); lay.icehole = { c: ic, r: py }; spot(lay, 'pond', pc - 6, py + 2);
    const hr = PP.HOMES.burrow(SZ(lay, 18), SZ(lay, 6), ['#e6eef6', '#ffffff', '#c8d6e4', '#8aa0b4'], [0.5]); home(lay, 'arctichare', hr.s, C(lay, 0.2), lay.base + 2, hr.door);
    // 雪坡滑梯
    const sl = new A.Pix(Math.round(lay.cols * 0.2), SZ(lay, 16)), sw = sl.w, sh = sl.h;
    for (let x = 0; x < sw; x++) { const k = x < sw * 0.25 ? x / (sw * 0.25) : 1 - (x - sw * 0.25) / (sw * 0.75); const hh = Math.round(sh * Math.max(0, Math.pow(k, 0.8))); for (let y = 0; y < hh; y++) sl.set(x, sh - 1 - y, y === hh - 1 && x > sw * 0.25 ? '#bfe0f4' : x < sw * 0.25 ? '#ffffff' : '#eef5fc'); }
    sl.outline('#a8c0d8'); put(lay, sl, C(lay, 0.82), lay.base + 1);
    spot(lay, 'slidetop', C(lay, 0.82) - sw / 2 + sw * 0.25, lay.base + 1 - sh, { perch: true }); spot(lay, 'slideend', C(lay, 0.82) + sw / 2 - 4, lay.base + 4);
    spot(lay, 'snowfield', C(lay, 0.34), lay.base + 4);
    const ic2 = PP.HOMES.iceCave(SZ(lay, 20)); home(lay, 'polarbear', ic2.s, C(lay, 0.645), lay.base + 1, ic2.door);
    const af = PP.HOMES.burrow(SZ(lay, 24), SZ(lay, 8), ['#e6eef6', '#ffffff', '#c8d6e4', '#8aa0b4'], [0.4]); home(lay, 'arcticfox', af.s, C(lay, 0.095), lay.base + 2, af.door);
  };
  B.mountain = (P, lay, R) => {
    const A = T(), w = W(lay);
    mountains(P, lay, [[1.15, '#a8b4cc', true, 1.5], [0.85, '#8a96ae', true, 1.2], [0.5, w ? '#c0ccd8' : '#7a8a74', w, 0.9]], 21);
    treeLine(P, lay, lay.gy, Math.min(20, lay.gy * 0.25), w ? ['#3e5a5e', '#56747a', '#7a969c'] : ['#2c4a3a', '#3e6048', '#58785c'], 'pine', 8);
    ground(P, lay, w ? GROUND.winter : ['#8aa86a', '#7a985c', '#9cb87a', '#a8a0a0'], { path: ['#c8bca8', '#b0a490', '#968a78'], blades: BLADES[lay.season] });
    // 溪流：从山上流下来，穿过地面
    const sc = C(lay, 0.62);
    for (let y = lay.gy; y < lay.rows; y++) { const o = Math.round((y - lay.gy) * 0.35), ww = 3 + Math.round((y - lay.gy) * 0.12); for (let k = 0; k < ww; k++) P.set(sc - o + k, y, w ? '#d6ecf8' : (k + y) % 5 === 0 ? '#9fd8f2' : '#5aa9d6'); }
    spot(lay, 'stream', sc - Math.round((lay.base - lay.gy) * 0.35) + 2, lay.base + 1);
    const cairn = A.spr(14, 18); [[7, 16, 5.5, 2.6, '#8e8a96'], [7.5, 12, 4.4, 2.2, '#9a96a2'], [6.5, 8.4, 3.6, 1.9, '#86828e'], [7, 5.2, 2.8, 1.6, '#a4a0ac'], [7, 2.6, 1.8, 1.2, '#b0acb8']].forEach(([x, y, rx, ry, c]) => cairn.ell(x, y, rx, ry, (nx, ny) => (ny < -0.45 ? A.shade(c, 0.3) : nx < -0.3 ? A.shade(c, 0.12) : nx > 0.45 || ny > 0.5 ? A.shade(c, -0.25) : c))); if (!w) { cairn.set(3, 16, '#5a8a4a'); cairn.set(11, 12, '#5a8a4a'); } cairn.outline('#3a3a46'); put(lay, cairn, C(lay, 0.2), lay.base + 1); spot(lay, 'cairn', C(lay, 0.2) + 8, lay.base + 3);
    put(lay, A.rock(SZ(lay, 9), R, w, '#9a9aa6'), C(lay, 0.82), lay.base + 1); spot(lay, 'ledge', C(lay, 0.82), lay.base + 1 - SZ(lay, 12), { perch: true });
    spot(lay, 'meadow', C(lay, 0.36), lay.base + 5);
    for (let i = 0; i < 14; i++) if (!w) put(lay, A.flower(lay.season, R, i % 2 ? '#ffffff' : '#c8a8ff'), C(lay, 0.3 + (i % 7) * 0.025), lay.base + 3 + (i % 3) * 3);
    const ys = PP.HOMES.stoneShelter(SZ(lay, 18), lay.season); home(lay, 'yak', ys.s, C(lay, 0.47), lay.base + 1, ys.door);
    const al = PP.HOMES.shed(SZ(lay, 18), lay.season, '#b8865a', '#7a4a30'); home(lay, 'alpaca', al.s, C(lay, 0.095), lay.base + 1, al.door);
    const sl = PP.HOMES.cave(SZ(lay, 18), lay.season); home(lay, 'snowleopard', sl.s, C(lay, 0.915), lay.base + 1, sl.door);
    // 洞口：走进去就是洞穴（套在高山里的次场景）
    const cm = PP.HOMES.caveMouth(SZ(lay, 22)), cmc = C(lay, 0.72), cmr = lay.base;
    put(lay, cm.s, cmc, cmr); lay.hots.push({ x0: Math.round(cmc - cm.s.w / 2), x1: Math.round(cmc + cm.s.w / 2), y0: cmr - cm.s.h + 1, y1: cmr + 1, tip: '走进洞穴 →', go: 'cave', door: true });
    lay.caveDoor = cmc;
    spot(lay, 'pasture', C(lay, 0.3), lay.base + 6);
  };
  B.forest = (P, lay, R) => {
    const A = T(), s = lay.season, w = W(lay);
    hills(P, lay, [[0.7, w ? '#c8d4e0' : s === 'autumn' ? '#c49a6a' : '#8db98e'], [0.45, w ? '#aebfd0' : s === 'autumn' ? '#a8784a' : '#6f9a72']], 31);
    treeLine(P, lay, lay.gy, Math.min(34, lay.gy * 0.45), w ? ['#4e6466', '#6a8084', '#8ea4a6'] : s === 'autumn' ? ['#6a3a22', '#9a5a2e', '#c8843a'] : ['#24503a', '#2f6a46', '#46865a'], 'mix', 32);
    treeLine(P, lay, lay.gy, Math.min(22, lay.gy * 0.3), w ? ['#3a5050', '#4e6666', '#6a8484'] : ['#1c3e2c', '#26523a', '#36684a'], 'pine', 33);
    ground(P, lay, w ? GROUND.winter : s === 'autumn' ? ['#a6864a', '#946f3a', '#b8975a', '#d9662a'] : ['#5f9a4a', '#4f8a40', '#6aa652', '#8a6a3a'], { path: PATH[s], blades: BLADES[s] });
    // 落叶 / 小石子
    for (let i = 0; i < lay.cols * 0.25; i++) { const x = Math.floor(R() * lay.cols), y = lay.gy + 2 + Math.floor(R() * (lay.rows - lay.gy - 2)); P.set(x, y, w ? '#d8e2ec' : ['#d9662a', '#c49a3a', '#8a6a3a', '#e8963a'][i % 4]); }
    // 小溪
    const bc = C(lay, 0.555);
    for (let y = lay.gy; y < lay.rows; y++) { const o = Math.round((y - lay.gy) * 0.6), ww = 3 + Math.round((y - lay.gy) * 0.18); for (let k = 0; k < ww; k++) P.set(bc - o + k, y, w ? '#cfe6f5' : (k === 0 || k === ww - 1) ? '#3f86b8' : (k + y) % 4 === 0 ? '#9fd8f2' : '#5aa9d6'); }
    spot(lay, 'brook', bc - Math.round((lay.base + 2 - lay.gy) * 0.6) + 1, lay.base + 2);
    const fd = PP.HOMES.foxDen(SZ(lay, 44), s, R); home(lay, 'fox', fd.s, C(lay, 0.3), lay.base + 1, fd.door);
    const ln = PP.HOMES.leafNest(s); home(lay, 'hedgehog', ln.s, C(lay, 0.12), lay.base + 2, ln.door); spot(lay, 'log', C(lay, 0.12) - 10, lay.base + 3);
    const cv = PP.HOMES.cave(SZ(lay, 20), s); home(lay, 'dragon', cv.s, C(lay, 0.85), lay.base + 1, cv.door);
    put(lay, A.bush(SZ(lay, 7), s, R, '#d9262b'), C(lay, 0.47), lay.base + 2); spot(lay, 'berries', C(lay, 0.47), lay.base + 3);
    put(lay, A.bush(SZ(lay, 6), s, R, '#5a4ac8'), C(lay, 0.64), lay.base + 2); spot(lay, 'berries2', C(lay, 0.64), lay.base + 3);
    put(lay, A.mushrooms(s), C(lay, 0.73), lay.base + 3); spot(lay, 'mushrooms', C(lay, 0.73), lay.base + 4);
    put(lay, A.rock(SZ(lay, 6), R, w), C(lay, 0.95), lay.base + 2); spot(lay, 'sunrock', C(lay, 0.95), lay.base + 2 - SZ(lay, 8), { perch: true });
    spot(lay, 'leaves', C(lay, 0.21), lay.base + 5); spot(lay, 'shade', C(lay, 0.4), lay.base + 4);
    const th = PP.HOMES.thicket(s, R); home(lay, 'deer', th.s, C(lay, 0.39), lay.base + 1, th.door);
  };
  B.lake = (P, lay, R) => {
    const A = T(), s = lay.season, w = W(lay);
    hills(P, lay, [[0.6, w ? '#c8d4e0' : '#9cc4a0'], [0.4, w ? '#b0c2d2' : '#7aa880']], 41);
    const wy0 = lay.gy - Math.round(lay.gy * (lay.full ? 0.16 : 0.32)), wy1 = lay.gy + 3;
    treeLine(P, lay, wy0, Math.min(26, lay.gy * 0.32), w ? ['#4e6466', '#6a8084', '#8ea4a6'] : s === 'autumn' ? ['#7a4a2a', '#a8683a', '#d0904a'] : ['#2a5a3e', '#36704c', '#4e8a60'], 'mix', 42);
    // 湖面：近深远浅 + 倒影
    for (let y = wy0; y < wy1; y++) { const k = (y - wy0) / (wy1 - wy0); for (let x = 0; x < lay.cols; x++) P.set(x, y, w ? ((x + y * 3) % 11 === 0 ? '#ffffff' : k < 0.3 ? '#e6f3fb' : '#cfe6f5') : y === wy0 ? '#c8ecfa' : A.hash(x, y, 4) < 0.02 ? '#bfe6f8' : k < 0.25 ? '#7ec4e6' : k < 0.6 ? '#5aa9d6' : '#4b96c8'); }
    if (!w) { reflect(P, lay, wy0 + 1, Math.min(wy1 - wy0 - 2, lay.full ? 10 : 7), '#5aa9d6', 0.55); for (let y = wy0 + 1; y < wy1; y++) for (let x = 0; x < lay.cols; x++) if (A.noise(x / 9, y * 0.9, 43) > 0.8) P.set(x, y, '#c8ecfa'); }
    else for (let y = wy0 + 1; y < wy1; y++) for (let x = 0; x < lay.cols; x++) if (Math.sin(x / 11 + y * 1.7) > 0.95) P.set(x, y, '#a8c8e0');
    lay.water = { y0: wy0, y1: wy1, ice: w };
    ground(P, Object.assign({}, lay, { gy: wy1 }), w ? GROUND.winter : s === 'autumn' ? ['#a6864a', '#946f3a', '#b8975a', '#d9662a'] : GROUND[s], { path: null, blades: BLADES[s] });
    // 岸边：一条湿沙 + 鹅卵石带，水边一道浅浪
    for (let x = 0; x < lay.cols; x++) { const e = Math.round(Math.sin(x / 17) * 0.8 + Math.sin(x / 5) * 0.4); for (let k = 0; k < 3 + e; k++) { const y = wy1 + k; let c = w ? (k === 0 ? '#ffffff' : '#e2ecf6') : k === 0 ? '#8a7a58' : A.hash(x, y, 44) < 0.25 ? ['#9a94a4', '#b4aebc', '#7a7484'][Math.floor(A.hash(x, y, 45) * 3)] : '#c8b48a'; P.set(x, y, c); } if (!w && A.hash(x, 46) < 0.5) P.set(x, wy1 - 1, '#bfe6f8'); }
    // 码头：木板伸进湖里
    const dc = C(lay, 0.5), dw = Math.round(lay.cols * 0.1);
    for (let x = dc - dw; x < dc + dw; x += 8) { P.rect(x, wy1 - 2, 2, 5, '#4a3020'); P.set(x, wy1 - 2, '#6a4428'); if (!w) { P.set(x, wy1 + 3, '#3a6a8a'); P.set(x + 1, wy1 + 3, '#4a7a9a'); } }
    for (let x = dc - dw; x < dc + dw; x++) { const pl = (x - dc + 300) % 4; P.set(x, wy1 - 4, pl === 0 ? '#5a3a22' : w ? '#ffffff' : '#c99a6a'); P.set(x, wy1 - 3, pl === 0 ? '#5a3a22' : '#a8784a'); P.set(x, wy1 - 2, '#6a4428'); if (!w) P.set(x, wy1 - 1, '#3a6a8a'); }
    spot(lay, 'dock', dc, wy1 - 3, { perch: true });
    const dn = PP.HOMES.duckNest(s); home(lay, 'duck', dn.s, C(lay, 0.08), lay.base + 2, dn.door);
    put(lay, A.reeds(SZ(lay, 16), s), C(lay, 0.15), lay.base + 1); spot(lay, 'reeds', C(lay, 0.15), lay.base + 3);
    const lr = Math.round(wy0 + (wy1 - wy0) * 0.6), lh = PP.HOMES.lilyHome(s, w); home(lay, 'frog', lh.s, C(lay, 0.3), lr, lh.door); lay.spots.frog_home.water = true;
    spot(lay, 'lily', C(lay, 0.4), Math.round(wy0 + (wy1 - wy0) * 0.45), { water: true }); if (!w) put(lay, A.lily(s), C(lay, 0.4), Math.round(wy0 + (wy1 - wy0) * 0.45) + 1);
    spot(lay, 'swim', C(lay, 0.24), Math.round(wy0 + (wy1 - wy0) * 0.7), { water: true });
    const hs = PP.HOMES.hotSpring(); home(lay, 'capybara', hs.s, C(lay, 0.84), lay.base + 3, hs.door); lay.spring = { c: C(lay, 0.84), r: lay.base - 4 };
    spot(lay, 'shore', C(lay, 0.66), lay.base + 3);
  };
  B.meadow = (P, lay, R) => {
    const A = T(), s = lay.season, w = W(lay);
    hills(P, lay, [[0.75, w ? '#d0dce8' : s === 'autumn' ? '#d4b05a' : '#a6d684', w ? '#c0ccd8' : null], [0.48, w ? '#bccad8' : s === 'autumn' ? '#c0903f' : '#86c264']], 51);
    // 远处的风车
    const mx = C(lay, 0.88), my = lay.gy - Math.round(lay.gy * 0.18), mh = Math.min(30, Math.round(lay.gy * 0.45));
    for (let k = 0; k < mh; k++) { const half = 1 + Math.round((k / mh) * 3); P.rect(mx - half, my - mh + k, half * 2 + 1, 1, k % 5 ? '#e8dcc8' : '#d0c4b0'); }
    P.rect(mx - 2, my - mh - 2, 5, 3, '#8e3d30'); lay.windmill = [mx, my - mh];
    ground(P, lay, GROUND[s], { path: PATH[s], blades: BLADES[s] });
    // 三叶草地（一片深一点的草，开小白花）
    const cc = C(lay, 0.33);
    for (let i = 0; i < 80; i++) { const x = cc - 16 + Math.floor(R() * 32), y = lay.base + Math.floor(R() * (lay.rows - lay.base)); if (w) continue; P.set(x, y, '#3f8538'); P.set(x + 1, y, '#4f9a45'); if (s !== 'autumn' && i % 6 === 0) P.set(x, y - 1, '#ffffff'); }
    spot(lay, 'clover', cc, lay.base + 4);
    const rb = PP.HOMES.mound(SZ(lay, 30), SZ(lay, 9), s, 0.35); home(lay, 'rabbit', rb.s, C(lay, 0.2), lay.base + 1, rb.door);
    put(lay, A.bush(SZ(lay, 6), s, R), C(lay, 0.235), lay.base);
    for (let i = 0; i < 10; i++) put(lay, A.flower(s, R), C(lay, 0.42 + (i % 5) * 0.014), lay.base + 2 + (i % 3) * 2);
    spot(lay, 'flowers', C(lay, 0.45), lay.base + 4); spot(lay, 'grass', C(lay, 0.52), lay.base + 6);
    // 向日葵地
    for (let i = 0; i < 7; i++) { const sf = sunflower(SZ(lay, 24) + (i % 3) * 3, s); put(lay, sf, C(lay, 0.58) + i * 4, lay.base + (i % 2)); }
    spot(lay, 'sunflowers', C(lay, 0.6), lay.base + 3);
    const hm = PP.HOMES.burrow(14, 5, w ? ['#e6eef6', '#ffffff', '#c8d6e4', '#8aa0b4'] : ['#9a7a4a', '#b8986a', '#7a5a3a', '#4a3420'], [0.5]); home(lay, 'hamster', hm.s, C(lay, 0.665), lay.base + 3, hm.door);
    const pd = A.spr(28, 8); pd.ell(14.5, 4.5, 13, 3.4, (nx, ny, x, y) => { const d = nx * nx + ny * ny; if (d > 0.8) return w ? '#b8c8d8' : ny < 0 ? '#5a7a3a' : '#7a6a4a'; if (w) return (x + y * 3) % 7 === 0 ? '#ffffff' : '#dcecf8'; return ny < -0.35 ? '#d8f2fc' : d < 0.3 ? '#4a98c8' : '#6ab4dc'; }); if (!w) { pd.hl(8, 4, 4, '#e8f8ff'); pd.hl(17, 6, 3, '#a8dcf2'); } put(lay, pd, C(lay, 0.79), lay.base + 7); spot(lay, 'puddle', C(lay, 0.79), lay.base + 5);
    put(lay, A.broadleaf(SZ(lay, 46), s, R, 'oak'), C(lay, 0.95), lay.base); spot(lay, 'hill', C(lay, 0.9), lay.base + 3);
    const mm = PP.HOMES.burrow(SZ(lay, 22), SZ(lay, 8), w ? ['#e6eef6', '#ffffff', '#c8d6e4', '#8aa0b4'] : ['#9a7a4a', '#b8986a', '#7a5a3a', '#4a3420'], [0.4, 0.75]); home(lay, 'marmot', mm.s, C(lay, 0.865), lay.base + 2, mm.door);
  };
  function sunflower(h, s) {
    const A = T(), sp = A.spr(9, h);
    if (s === 'winter') { sp.vl(5, Math.round(h * 0.4), h * 0.6, '#8a7a5a'); sp.rect(4, Math.round(h * 0.4), 3, 1, '#6a5a3a'); return sp; }
    if (s === 'spring') { const hh = Math.round(h * 0.35); sp.vl(5, h + 1 - hh, hh, '#5fae4a'); sp.set(4, h + 1 - hh, '#7cc35a'); sp.set(6, h + 2 - hh, '#7cc35a'); return sp; }
    sp.vl(5, 5, h - 3, '#4c7a30'); sp.rect(6, Math.round(h * 0.5), 2, 1, '#5fae4a'); sp.rect(3, Math.round(h * 0.65), 2, 1, '#5fae4a');
    const col = s === 'autumn' ? '#c49a2a' : '#ffcf33';
    sp.ell(5, 4, 4, 3.4, (nx, ny) => (nx * nx + ny * ny < 0.3 ? (s === 'autumn' ? '#4a2a10' : '#7a4a2a') : col));
    return sp.outline('#5a4a10');
  }
  B.farm = (P, lay, R) => {
    const A = T(), s = lay.season, w = W(lay);
    hills(P, lay, [[0.7, w ? '#d0dce8' : s === 'autumn' ? '#d4b05a' : '#a6d684'], [0.45, w ? '#bccad8' : s === 'autumn' ? '#c0903f' : '#86c264']], 61);
    treeLine(P, lay, lay.gy, Math.min(14, lay.gy * 0.2), w ? ['#6a8084', '#8ea4a6', '#a8bcbe'] : ['#3f7a44', '#55944e', '#72ae62'], 'mix', 62);
    ground(P, lay, w ? GROUND.winter : ['#7cb45a', '#6aa24c', '#8cc464', '#b49a6a'], { path: w ? PATH.winter : ['#c9a878', '#b8946a', '#9a7a54'], blades: BLADES[s] });
    const z = (n) => SZ(lay, n), b = lay.base + 1;
    const bn = PP.HOMES.barn(z(48), s); home(lay, 'cat', bn.s, C(lay, 0.13), b, bn.door);
    lay.loft = { c: Math.round(C(lay, 0.13) - bn.s.w / 2 + bn.loft.x), r: b - bn.s.h + bn.loft.y };
    lay.lights.push({ x: lay.loft.c - 3, y: lay.loft.r - 2, w: 7, h: 3, r: 6, win: true });
    spot(lay, 'barnroof', C(lay, 0.13), b - bn.s.h + 3, { perch: true });
    const bowl = (col) => { const p = A.spr(10, 5); p.ell(5.5, 3.5, 4.6, 2.2, (nx, ny) => (ny > 0.5 ? null : nx < -0.4 ? A.shade(col, 0.3) : nx > 0.5 ? A.shade(col, -0.25) : col)); p.ell(5.5, 2.4, 3.4, 0.9, (nx) => (nx < 0 ? '#d89a5a' : '#a8703a')); p.set(4, 2, '#f0c080'); p.hl(2, 5, 8, A.shade(col, -0.45)); return p.outline('#3a2418'); };
    put(lay, bowl('#e33b3b'), C(lay, 0.215), b + 2); spot(lay, 'catbowl', C(lay, 0.215), b + 3);
    put(lay, A.hayBale(w), C(lay, 0.27), b + 1); put(lay, A.hayBale(w), C(lay, 0.27) + 9, b - 1); spot(lay, 'hay', C(lay, 0.27), b + 3);
    const fe = A.fence(30, w); put(lay, fe, C(lay, 0.31), b); spot(lay, 'fence', C(lay, 0.31), b - fe.h + 2, { perch: true });
    const kn = PP.HOMES.kennel(z(18), s); home(lay, 'dog', kn.s, C(lay, 0.38), b, kn.door);
    put(lay, bowl('#4b9bcc'), C(lay, 0.425), b + 2); spot(lay, 'dogbowl', C(lay, 0.425), b + 3);
    const tr = A.spr(24, 9); for (let y = 2; y < 7; y++) for (let x = 1; x < 24; x++) tr.set(x, y, y === 2 ? '#c99a6a' : y === 4 ? '#6a4630' : x === 1 ? '#b08458' : x === 23 ? '#5a3a22' : (x * 3) % 7 === 0 ? '#7a5234' : '#9a6c46'); tr.rect(3, 3, 19, 1, w ? '#dcecf8' : '#6ab4dc'); tr.hl(4, 3, 5, w ? '#ffffff' : '#bfe6f8'); for (const x of [2, 21]) { tr.rect(x, 7, 2, 2, '#4a3020'); } tr.set(5, 5, '#5a5466'); tr.set(19, 5, '#5a5466'); tr.outline('#3a2418'); put(lay, tr, C(lay, 0.47), b + 2); spot(lay, 'trough', C(lay, 0.47), b + 3);
    const cp = PP.HOMES.coop(z(26), s); home(lay, 'chick', cp.s, C(lay, 0.54), b, cp.door);
    const fd = new A.Pix(26, 4); for (let i = 0; i < 34; i++) fd.set((i * 7 + (i >> 2)) % 25, (i * 3) % 4, ['#ffcf33', '#e8a020', '#fff0a0', '#c8902a'][i % 4]); put(lay, fd, C(lay, 0.6), b + 4); spot(lay, 'feed', C(lay, 0.6), b + 4);
    put(lay, A.broadleaf(z(46), s, R, 'apple'), C(lay, 0.66), b); spot(lay, 'apple', C(lay, 0.66), b + 3);
    const st = PP.HOMES.sty(z(18), s); home(lay, 'pig', st.s, C(lay, 0.74), b, st.door);
    const md = new A.Pix(30, 7); md.ell(15, 3.5, 14, 3, (nx, ny, x, y) => { if (w) return (x + y) % 5 ? '#c8bcac' : '#e8e0d4'; const d = nx * nx + ny * ny; if (d > 0.78) return ny < 0 ? '#9a6a44' : '#5a3a22'; if (A.hash(x, y, 63) < 0.12) return '#a87a54'; return ny < -0.3 ? '#7a4e30' : d < 0.3 ? '#4a2e1c' : '#5e3c26'; }); if (!w) { md.hl(9, 3, 3, '#b8987a'); md.hl(18, 4, 2, '#a8886a'); } put(lay, md, C(lay, 0.79), b + 4); spot(lay, 'mud', C(lay, 0.79), b + 3);
    // 菜园：一垄一垄
    const vg = new A.Pix(Math.round(lay.cols * 0.06), 11);
    for (let row = 0; row < 3; row++) { const yb = 3 + row * 3; for (let x = 1; x < vg.w - 1; x++) { vg.set(x, yb, w ? '#e8eef4' : '#8a5e3a'); vg.set(x, yb + 1, w ? '#c8d4e0' : '#5a3a22'); if (x % 4 === 1 && !w) { if (s === 'spring') { vg.set(x, yb - 1, '#7cc35a'); vg.set(x + 1, yb - 2, '#a8e07a'); } else if (row === 1) { vg.ell(x + 0.5, yb - 1.2, 1.8, 1.4, (nx, ny) => (nx < -0.2 && ny < 0 ? '#c8f0a0' : nx > 0.4 ? '#5aa04e' : '#8ad068')); } else { vg.set(x, yb, '#ff8a2a'); vg.set(x, yb - 1, '#4fae4d'); vg.set(x - 1, yb - 2, '#6ac85a'); vg.set(x + 1, yb - 2, '#3f8a44'); } } } }
    put(lay, vg, C(lay, 0.81), b + 8); spot(lay, 'veg', C(lay, 0.81), b + 8);
    const pn = PP.HOMES.pen(SZ(lay, 24), s); home(lay, 'sheep', pn.s, C(lay, 0.93), b + 1, pn.door);
    const cs = PP.HOMES.shed(z(20), s, '#f0e6d8', '#8e2620'); home(lay, 'cow', cs.s, C(lay, 0.875), b, cs.door);
    spot(lay, 'pasture', C(lay, 0.84), b + 6);
    spot(lay, 'yard', C(lay, 0.5), b + 6);
  };
  B.desert = (P, lay, R) => {
    const A = T(), { cols, gy, rows } = lay;
    // 远景：一座座红色平顶山（远的淡、近的浓），然后两三层带受光面 / 背阴面的沙丘
    const MP = ['#7a3a2a', '#b45a3a', '#c86a44', '#d47c50', '#f0b080'];
    for (const [f, w, h, hz] of [[0.18, 0.09, 0.42, 0.45], [0.55, 0.12, 0.5, 0.45], [0.86, 0.07, 0.36, 0.45], [0.36, 0.06, 0.3, 0.22], [0.72, 0.08, 0.34, 0.22]]) mesa(P, lay, C(lay, f), cols * w, Math.round(Math.min(gy * h, gy - 8)), MP, Math.round(f * 100), hz);
    for (const [amp, base, pal, sd] of [[0.2, 0, ['#e8b878', '#f6d49a', '#d49c5e', '#fff0c8'], 72], [0.12, 0, ['#e2b070', '#f2cc8e', '#c88e52', '#fbe6b4'], 73]]) {
      const top = (x) => Math.round(gy - gy * amp * (0.35 + A.noise(x / 46, 0, sd) * 0.9));
      for (let x = 0; x < cols; x++) { const t = top(x), lit = top(x + 2) <= t; for (let y = t; y < gy; y++) { let c = lit ? pal[1] : pal[0]; if (y === t) c = lit ? pal[3] : pal[1]; else if (!lit && y > t + 3 && A.dith(x, y, 0.3)) c = pal[2]; P.set(x, y, c); } }
    }
    ground(P, lay, ['#ecc888', '#e2bc78', '#f4d898', '#c49a5a'], { path: null });
    // 沙纹：一道道弯弯的月牙纹（迎风面亮、背风面一道暗线）
    for (let y = gy + 2; y < rows; y++) for (let x = 0; x < cols; x++) { const v = Math.sin(x / 5 + A.noise(x / 20, y / 6, 74) * 5 + y * 0.9); if (v > 0.9) P.set(x, y, '#d0a462'); else if (v > 0.8) P.set(x, y, '#fbe4b0'); }
    // 绿洲：一圈青草和芦苇围着的水塘（深处更蓝、边上浅、水面亮光）
    const oc = C(lay, 0.5), oy = lay.base + Math.round((rows - lay.base) * 0.3), orx = cols * 0.075, ory = Math.max(3, (rows - lay.base) * 0.24);
    P.ell(oc, oy, orx + 4, ory + 1.5, (nx, ny, x, y) => (A.hash(x, y, 75) < 0.4 ? '#6aa64e' : '#8cc464'));
    P.ell(oc, oy, orx + 1, ory, (nx, ny) => (nx * nx + ny * ny > 0.85 ? '#c8a868' : null));
    P.ell(oc, oy, orx, ory - 0.6, (nx, ny, x, y) => { const d = nx * nx + ny * ny; let c = d > 0.7 ? '#7ac8d8' : d > 0.3 ? '#4aa4c4' : '#3a8ab0'; if (ny < -0.4 && A.hash(x, y, 76) < 0.25) c = '#c8f0f8'; return c; });
    spot(lay, 'oasis', oc, oy + 2);
    put(lay, A.reeds(SZ(lay, 12), 'summer'), oc - orx - 2, oy); put(lay, A.reeds(SZ(lay, 10), 'summer'), oc + orx + 3, oy + 1);
    put(lay, A.palm(SZ(lay, 44), R), C(lay, 0.44), lay.base + 1); put(lay, A.palm(SZ(lay, 38), R), C(lay, 0.57), lay.base);
    for (const [f, h] of [[0.15, 24], [0.3, 17], [0.8, 27], [0.93, 19]]) put(lay, A.cactus(SZ(lay, h), R), C(lay, f), lay.base + 2);
    for (const f of [0.06, 0.37, 0.75, 0.97]) put(lay, barrelCactus(R), C(lay, f), lay.base + 4);
    for (const f of [0.27, 0.64, 0.89]) put(lay, tumbleweed(R), C(lay, f), lay.base + 6);
    put(lay, A.rock(SZ(lay, 7), R, false, '#c47a4a'), C(lay, 0.12) + 14, lay.base + 3); put(lay, A.rock(SZ(lay, 4), R, false, '#b46a44'), C(lay, 0.12) + 24, lay.base + 4); spot(lay, 'rocks', C(lay, 0.12), lay.base + 4);
    spot(lay, 'dunes', C(lay, 0.25), lay.base + 5); spot(lay, 'cactus', C(lay, 0.78), lay.base + 5);
    const sandPal = ['#e2bc78', '#f4d898', '#c49a5a', '#8a6034'];
    const fn = PP.HOMES.burrow(SZ(lay, 20), SZ(lay, 7), sandPal, [0.45]); home(lay, 'fennec', fn.s, C(lay, 0.225), lay.base + 2, fn.door);
    const mk = PP.HOMES.burrow(SZ(lay, 28), SZ(lay, 7), sandPal, [0.3, 0.6, 0.82]); home(lay, 'meerkat', mk.s, C(lay, 0.685), lay.base + 2, mk.door);
    // 骆驼：棕榈树下的游牧帐篷——条纹布顶在两根杆子之间往下垂，正面掀开一角露出暗的里面，门口铺着花纹地毯，两侧拉绳钉在沙里，杆子上挂一盏灯
    const tw = SZ(lay, 32), tt = SZ(lay, 15), tn = A.spr(tw, tt), tcx = (tw + 2) / 2;
    const ST = ['#8a2a22', '#c84a3a', '#e8d4a8', '#f6e8c8'];
    for (let y = 3; y <= tt + 1; y++) { const k = (y - 3) / (tt - 2), half = Math.round((tw / 2 - 3) * (0.35 + k * 0.65)); for (let x = -half; x <= half; x++) { const sag = Math.round(Math.abs(Math.sin((x / half) * Math.PI)) * 1.5); if (y < 3 + sag) continue; const stripe = Math.floor((x + 100) / 3) % 2; let c = stripe ? ST[1] : ST[2]; if (x > half * 0.35) c = stripe ? ST[0] : '#c8b48a'; if (y === 3 + sag) c = stripe ? '#e86a5a' : ST[3]; tn.set(tcx + x, y, c); } }
    for (const px of [tcx - (tw / 2 - 3) * 0.35, tcx + (tw / 2 - 3) * 0.35]) { tn.vl(Math.round(px), 0, 4, '#5a3a22'); tn.set(Math.round(px), 0, '#c8a060'); }
    const ex = Math.round(tcx - 2); for (let y = Math.round(tt * 0.45); y <= tt + 1; y++) { const half = Math.round(((y - tt * 0.45) / (tt * 0.55)) * tw * 0.14); for (let x = -half; x <= half; x++) tn.set(ex + x, y, half - Math.abs(x) < 1 ? '#8a6a4a' : '#1e1410'); }
    for (let x = ex - 6; x <= ex + 6; x++) { tn.set(x, tt + 2, (x % 3) ? '#a83a5a' : '#ffd84a'); }
    for (const [x0, x1] of [[1, Math.round(tcx - tw * 0.2)], [tw, Math.round(tcx + tw * 0.2)]]) for (let i = 0; i <= 6; i++) tn.set(Math.round(x0 + (x1 - x0) * i / 6), tt + 1 - Math.round(i * 1.2), '#8a7050');
    tn.set(Math.round(tcx + tw * 0.25), Math.round(tt * 0.4), '#ffd98a'); tn.set(Math.round(tcx + tw * 0.25), Math.round(tt * 0.4) - 1, '#3a2a20');
    tn.outline('#4a1e14');
    home(lay, 'camel', tn, C(lay, 0.615), lay.base + 2, { x: ex });
  };
  B.beach = (P, lay, R) => {
    const A = T(), { cols, gy, rows } = lay;
    const wy0 = gy - Math.round(gy * (lay.full ? 0.3 : 0.5)), wy1 = gy + 4;
    // 远处：右边一座长满树的海岬（岩壁 + 树冠），左边一个小岛，上面两棵椰子树的剪影
    seaWater(P, lay, wy0, wy1, ['#2e6aa8', '#3a86c0', '#4fa4d4', '#6cc4e2', '#e4f6fc'], 9, {});
    const hx0 = C(lay, 0.8);
    for (let x = hx0; x < cols; x++) { const k = (x - hx0) / (cols - hx0), top = Math.round(wy0 - (lay.full ? 10 : 7) * Math.min(1, k * 2.4) - A.noise(x / 6, 1, 3) * 2); for (let y = top; y <= wy0 + 1; y++) P.set(x, y, y < top + 3 ? (A.hash(x, y, 2) < 0.5 ? '#4a8a50' : '#5aa060') : y < top + 4 ? '#3a6a40' : (x + y) % 3 ? '#8a7a6a' : '#a8988a'); }
    const ix = C(lay, 0.18); for (let x = -16; x <= 16; x++) { const h = Math.round(4 * Math.cos((x / 16) * Math.PI / 2)); for (let y = 0; y < h; y++) P.set(ix + x, wy0 - y, y === h - 1 ? '#5aa060' : x > 4 ? '#3a7a48' : '#4a8a50'); }
    for (const [ox, hh] of [[-5, 9], [3, 7]]) { for (let y = 0; y < hh; y++) P.set(ix + ox + Math.round(y * 0.2), wy0 - 3 - y, '#3a5a3a'); for (const d of [-1, 1]) for (let i = 1; i < 5; i++) P.set(ix + ox + Math.round(hh * 0.2) + d * i, wy0 - 3 - hh + Math.round(i * 0.5), '#2e5a34'); }
    lay.water = { y0: wy0, y1: wy1, ice: false, sea: true };
    ground(P, Object.assign({}, lay, { gy: wy1 }), ['#f0dca8', '#e8d098', '#f8e8bc', '#d8c088'], {});
    seaWater(P, lay, wy1 - 2, wy1, ['#6cc4e2', '#6cc4e2', '#7ad0e8', '#8adcf0', '#8adcf0'], 10, { foam: '#d8c090' });
    // 沙子上的细节：风吹出来的细纹、贝壳、海星、小脚印
    for (let y = wy1 + 4; y < rows; y++) for (let x = 0; x < cols; x++) { const v = Math.sin(x / 4 + A.noise(x / 18, y / 5, 11) * 4 + y * 1.1); if (v > 0.93) P.set(x, y, '#d8be86'); else if (v > 0.86) P.set(x, y, '#fbeccc'); }
    for (let i = 0; i < 18; i++) { const x = Math.floor(R() * cols), y = wy1 + 5 + Math.floor(R() * (rows - wy1 - 6)), c = ['#ffb0c8', '#ffffff', '#f4d0a0', '#e8a080'][i % 4]; P.set(x, y, c); P.set(x + 1, y, A.shade(c, -0.25)); P.set(x, y - 1, A.shade(c, 0.4)); }
    // 沙丘草
    for (const f of [0.02, 0.06, 0.14, 0.86, 0.95]) put(lay, A.grassTuft('summer', R, true), C(lay, f), lay.base + 1);
    put(lay, A.palm(SZ(lay, 46), R), C(lay, 0.08), lay.base + 1); put(lay, A.palm(SZ(lay, 40), R), C(lay, 0.91), lay.base + 2);
    // 潮池：一圈带海藻的礁石围着一汪清水，水里一只海星和一只小海葵
    const tp = A.spr(38, 13); tp.ell(19, 9, 14, 3.4, (nx, ny, x, y) => { const d = nx * nx + ny * ny; return d > 0.75 ? '#3a8aa8' : ny < -0.3 ? '#a8e8f4' : A.hash(x, y, 3) < 0.1 ? '#d8f6fc' : '#5ac0dc'; });
    for (const [x, r, c] of [[4, 4, '#7a7a88'], [33, 5, '#8a8a96'], [19, 3, '#6a6a78'], [11, 2.4, '#8a8494'], [27, 2.6, '#7a7484']]) A.rock(r, R, false, c).stamp(tp, x, x === 19 ? 7 : 13);
    tp.set(13, 9, '#ff6b5a'); tp.set(12, 9, '#ff8a6a'); tp.set(14, 9, '#ff8a6a'); tp.set(13, 8, '#ff8a6a'); tp.set(13, 10, '#e84a3a'); tp.set(24, 10, '#ffcf33'); tp.set(23, 9, '#ffe07a'); tp.set(25, 9, '#ffe07a');
    for (let x = 2; x < 36; x += 3) tp.set(x, 12, '#3a7a4a');
    put(lay, tp.outline('#2a4a5a', (x, y) => y < 12), C(lay, 0.3), lay.base + 3); spot(lay, 'tidepool', C(lay, 0.3), lay.base + 4);
    // 沙堡：三座带垛口的塔（左亮右暗、一层层压实的沙纹），城门、护城河、顶上一面小旗，旁边一个小桶和铲子
    const sc = A.spr(26, 17), SD = ['#a8884a', '#c4a464', '#dcc080', '#ecd498', '#f8e8b8'];
    const tower = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) sc.set(x + i, y + j, j % 3 === 0 ? SD[3] : i === 0 ? SD[4] : i === w - 1 ? SD[1] : SD[2]); for (let i = 0; i < w; i += 2) sc.set(x + i, y - 1, i === 0 ? SD[4] : SD[2]); };
    tower(3, 8, 18, 7); tower(2, 4, 5, 5); tower(17, 4, 5, 5); tower(9, 2, 6, 7);
    sc.rect(11, 11, 3, 4, '#7a6038'); sc.set(12, 10, '#7a6038');
    sc.vl(12, 0, 3, '#7a5234'); sc.rect(13, 0, 3, 2, '#ff6b5a'); sc.set(15, 1, '#e84a3a');
    for (let x = 1; x < 25; x++) sc.set(x, 16, x % 2 ? '#7ac8e0' : '#5ab0d0');
    sc.rect(22, 12, 3, 3, '#ff8a3a'); sc.hl(22, 12, 3, '#ffb06a'); sc.set(24, 10, '#5a5466'); sc.set(25, 9, '#8a8494');
    put(lay, sc.outline('#8a6a34'), C(lay, 0.6), lay.base + 4); spot(lay, 'sand', C(lay, 0.55), lay.base + 6);
    // 浮木：一根被海水泡白的树干（木纹、断口、一截分叉），上面挂一缕海草
    const dw = A.spr(34, 7); for (let x = 1; x < 32; x++) for (let y = 2; y < 6; y++) dw.set(x, y, y === 2 ? '#e8dcc4' : y === 5 ? '#8a7a60' : (x * 3 + y * 5) % 7 === 0 ? '#a8987a' : '#c8b898');
    dw.ell(32, 3.5, 1.5, 2, (nx) => (nx < 0 ? '#e8d8b8' : '#a89878')); for (let i = 0; i < 6; i++) dw.set(8 - i, 1 - Math.round(i * 0.3), '#b8a888'); for (let i = 0; i < 4; i++) dw.set(20 + i, 5 + (i % 2), '#3a7a4a');
    put(lay, dw.outline('#5a4a34'), C(lay, 0.75), lay.base + 5); spot(lay, 'driftwood', C(lay, 0.75), lay.base + 4);
    spot(lay, 'waves', C(lay, 0.45), wy1 - 1);
    const cn = PP.HOMES.conch(SZ(lay, 12)); home(lay, 'crab', cn.s, C(lay, 0.4), lay.base + 3, cn.door);
    const gp = PP.HOMES.gullPost(SZ(lay, 20)); home(lay, 'seagull', gp.s, C(lay, 0.69), lay.base + 2, gp.door); lay.spots.seagull_home.r = lay.base + 2 - gp.s.h + 3; lay.spots.seagull_home.perch = true;
    // 水獭：海边一堆带海藻的礁石，石缝里是窝
    const sr = A.spr(SZ(lay, 32), SZ(lay, 11)); A.rock(SZ(lay, 6), R, false, '#6e7484').stamp(sr, sr.w * 0.35, sr.h + 1); A.rock(SZ(lay, 4), R, false, '#7a8090').stamp(sr, sr.w * 0.72, sr.h + 1); A.rock(SZ(lay, 3), R, false, '#868c9a').stamp(sr, sr.w * 0.12, sr.h + 1);
    sr.ell(sr.w * 0.53, sr.h, 2.4, 2.4, (nx, ny) => (ny > 0 ? null : '#120e10'));
    for (let x = 2; x < sr.w; x += 2) if (A.hash(x, 1, 9) < 0.5) { sr.set(x, sr.h, '#3a7a4a'); sr.set(x, sr.h - 1, '#5a9a5a'); }
    home(lay, 'otter', sr, C(lay, 0.83), lay.base + 3, { x: Math.round(sr.w * 0.53) });
    spot(lay, 'sand', C(lay, 0.55), lay.base + 6);
  };
  B.jungle = (P, lay, R) => {
    const A = T();
    // 层层叠叠的雨林树冠（带点雾）
    for (const [b, h, cols2] of [[lay.gy - lay.gy * 0.25, lay.gy * 0.7, ['#5a8a6a', '#6a9a78', '#7aaa88']], [lay.gy - lay.gy * 0.08, lay.gy * 0.55, ['#2f6a44', '#3f7e50', '#529462']], [lay.gy, lay.gy * 0.4, ['#1c4a2e', '#26603a', '#347848']]]) treeLine(P, lay, Math.round(b), Math.round(Math.min(h, 70)), cols2, 'mix', Math.round(b));
    ground(P, lay, ['#3f7a3a', '#346c32', '#4a8a44', '#6a4a2a'], { path: ['#8a6a4a', '#7a5a3a', '#5a4028'], blades: ['#2c6a2c', '#5aa64e'] });
    // 河
    const rc = C(lay, 0.5);
    for (let y = lay.gy; y < lay.rows; y++) { const o = Math.round(Math.sin((y - lay.gy) / 6) * 3), ww = 5 + Math.round((y - lay.gy) * 0.25); for (let k = -1; k <= ww; k++) { const x = rc + o + k - ww / 2; let c = k === -1 || k === ww ? '#5a4a2e' : k === 0 ? '#3a7a6a' : k === ww - 1 ? '#2e6a5a' : A.noise(x / 4, y * 0.9, 47) > 0.72 ? '#a8e0d0' : (k + y) % 5 === 0 ? '#6ab8a4' : '#4a9a8a'; P.set(x, y, c); } if (A.hash(y, 1, 48) < 0.3) { const x = rc + o + (A.hash(y, 2, 48) < 0.5 ? -2 : ww - 1) - ww / 2; P.set(x, y, '#8a8494'); P.set(x, y - 1, '#b4aebc'); } }
    spot(lay, 'river', rc, lay.base + 3);
    const ph = PP.HOMES.bigTree(SZ(lay, 52), R, 'hollow'); home(lay, 'parrot', ph.s, C(lay, 0.09), lay.base + 1, ph.door); lay.spots.parrot_home.r = lay.base + 1 - (ph.s.h - ph.perch.y); lay.spots.parrot_home.perch = true;
    const mh = PP.HOMES.bigTree(SZ(lay, 48), R, 'house'); home(lay, 'monkey', mh.s, C(lay, 0.3), lay.base, mh.door); spot(lay, 'treehouse', C(lay, 0.3), lay.base - (mh.s.h - mh.perch.y), { perch: true });
    const tg = PP.HOMES.bigTree(SZ(lay, 56), R, 'roots'); home(lay, 'tiger', tg.s, C(lay, 0.72), lay.base + 1, tg.door); put(lay, A.bamboo(SZ(lay, 40), 'summer', R), C(lay, 0.92), lay.base);
    const fern = () => { const f = A.spr(22, 11); for (let k = 0; k < 6; k++) { const a = Math.PI * (0.1 + k * 0.16), len = 9 - Math.abs(k - 2.5) * 0.8; for (let i = 0; i < len; i++) { const t = i / len, x = 12 + Math.cos(a) * i * 1.1, y = 11 - Math.sin(a) * i * 0.9 + t * t * 3; f.set(x, y, '#2e6a2e'); if (i > 0) { const lf = Math.round((1 - t) * 2.2) + 1; for (let j = 1; j <= lf; j++) { f.set(x - Math.sin(a) * j * 0.6, y - j * 0.5, j === lf ? '#8ad06a' : '#5aa64e'); f.set(x + Math.sin(a) * j * 0.3, y + j * 0.6, '#3f8a44'); } } } } return f.outline('#123a14'); };
    for (const fx of [0.2, 0.25, 0.42, 0.6, 0.8]) put(lay, fern(), C(lay, fx), lay.base + 2 + Math.round(fx * 10) % 4);
    for (let i = 0; i < 6; i++) put(lay, A.flower('summer', R, i % 2 ? '#ff4a7a' : '#ff8a2a'), C(lay, 0.84 + i * 0.01), lay.base + 2 + (i % 2) * 2);
    spot(lay, 'ferns', C(lay, 0.25), lay.base + 4); spot(lay, 'bigtree', C(lay, 0.72), lay.base + 3); spot(lay, 'flowers', C(lay, 0.85), lay.base + 4);
  };
  // 海底：整片都是水。远处是蓝色的礁石剪影，中间一排海带林，近处是带波纹的沙地、珊瑚、海葵、贝壳
  function coralBranch(h, col, R) {
    const A = T(), s = A.spr(Math.round(h * 0.9), h), cx = (s.w) / 2;
    const br = (x, y, a, len, d) => { for (let i = 0; i < len; i++) { x += Math.cos(a) * 0.9; y -= Math.sin(a); s.set(x, y, i % 3 === 0 ? A.shade(col, 0.2) : col); s.set(x + 1, y, A.shade(col, -0.15)); if (d > 0 && i === Math.round(len * 0.5)) { br(x, y, a + 0.5 + R() * 0.3, len * 0.65, d - 1); br(x, y, a - 0.5 - R() * 0.3, len * 0.6, d - 1); } } s.set(x, y - 1, A.shade(col, 0.45)); };
    br(cx, h, Math.PI / 2, h * 0.45, 2);
    return s.outline(A.shade(col, -0.5));
  }
  function brainCoral(r, col) { const A = T(), s = A.spr(r * 2.4, r * 1.4); s.ell(s.w / 2, s.h - 1, r * 1.15, r * 1.3, (nx, ny, x, y) => (y > s.h - 1 ? null : Math.sin(x * 1.3 + Math.sin(y * 0.9) * 2) > 0.3 ? A.shade(col, -0.18) : ny < -0.5 ? A.shade(col, 0.25) : col)); return s.outline(A.shade(col, -0.5)); }
  function fanCoral(h, col) { const A = T(), s = A.spr(h * 1.2, h); for (let k = 0; k < 9; k++) { const a = Math.PI * (0.15 + k * 0.0875); for (let i = 0; i < h; i++) s.set(s.w / 2 + Math.cos(a) * i * 0.6, s.h - 1 - Math.sin(a) * i, (i + k) % 4 === 0 ? A.shade(col, 0.3) : col); } for (let y = 3; y < h; y += 3) for (let x = 2; x < s.w - 2; x++) if (s.get(x, y)) s.set(x, y, col); return s.outline(A.shade(col, -0.5)); }
  function anemone(col) { const A = T(), s = A.spr(12, 9); s.rect(4, 6, 6, 4, A.shade(col, -0.2)); for (let k = 0; k < 7; k++) { const x = 2 + k * 1.5; for (let i = 0; i < 5; i++) s.set(x + Math.round(Math.sin(i + k) * 0.8), 6 - i, i === 4 ? A.shade(col, 0.5) : col); } return s.outline(A.shade(col, -0.55)); }
  function kelp(h, R) {
    // 精修海带：一根弯弯的茎，隔一段一个圆圆的气囊，气囊上长出一片长长的、边缘起皱的叶片（左亮右暗、往一边飘）
    const A = T(), s = A.spr(14, h); let x = 7;
    for (let y = h; y > 1; y--) {
      x += Math.sin(y / 6) * 0.45; s.set(x, y, '#5a6a2a'); s.set(x + 1, y, '#3e4e1e');
      if (y % 7 === 0 && y < h - 2) {
        const d = (y / 7) % 2 ? 1 : -1; s.set(x + d, y, '#a89a3a'); s.set(x + d, y - 1, '#c8b84a');
        for (let i = 1; i < 8; i++) { const bx = x + d * (1 + i * 0.8), by = y - i * 0.9 + Math.sin(i) * 0.6; s.set(bx, by, i % 3 ? '#8a8a2a' : '#a8a43a'); s.set(bx, by + 1, '#6a6a22'); if (i % 2) s.set(bx + d, by + 1, '#5a5a1e'); }
      }
    }
    s.set(x, 1, '#a8a43a');
    return s.outline('#2a2a10');
  }
  function starfish(col) { const A = T(), s = A.spr(7, 7); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566; for (let i = 0; i < 4; i++) s.set(4 + Math.round(Math.cos(a) * i), 4 + Math.round(Math.sin(a) * i), i < 2 ? A.shade(col, 0.2) : col); } return s.outline(A.shade(col, -0.5)); }
  function clamShell() { const A = T(), s = A.spr(16, 9); s.ell(8.5, 7, 7.5, 3.5, (nx, ny) => (ny > 0.2 ? null : Math.abs(Math.round(nx * 6)) % 2 ? '#8ac8d8' : '#a8dcea')); s.ell(8.5, 7, 7.5, 2.4, (nx, ny) => (ny < 0 ? null : Math.abs(Math.round(nx * 6)) % 2 ? '#7ab8c8' : '#98d0e0')); s.ell(8.5, 7, 2, 1, '#fff6ff'); s.set(9, 6, '#ffffff'); return s.outline('#2a5a6a'); }
  B.sea = (P, lay, R) => {
    const A = T(); lay.under = true; lay.season = 'summer';
    const { cols, rows, gy } = lay;
    // 水：上面亮、下面深；一束一束的光从水面照下来
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = y / rows; let c = A.mix('#5ab8e0', '#1a4a8a', k);
      if (Math.sin(x / 31 + y * 0.12) > 0.88 && A.dith(x, y, 0.35 * (1 - k))) c = A.mix(c, '#cfefff', 0.35);
      if (A.hash(x, y, 31) < 0.003) c = '#d8f0ff';
      P.set(x, y, c);
    }
    // 远处的礁石剪影（两层）
    for (const [hf, col, sd] of [[0.55, '#2a5a8a', 91], [0.32, '#244e78', 92]]) for (let x = 0; x < cols; x++) { const top = Math.round(gy - gy * hf * (0.3 + A.noise(x / 22, 1, sd) * 0.8)); for (let y = top; y < gy; y++) P.set(x, y, A.hash(x, y, sd) < 0.04 ? A.shade(col, 0.15) : col); }
    // 海带林（中景）
    for (const [far, step] of [[1, 16], [0, 26]]) for (let x = far * 4; x < cols; x += step + Math.floor(A.hash(x, 7 + far) * step)) {
      const h = Math.round(gy * (0.3 + A.hash(x, 8 + far) * 0.5) * (far ? 0.8 : 1)), cS = far ? '#2a5a78' : '#2a5e5a', cL = far ? '#3a6a86' : '#3a7a66', cD = far ? '#24506c' : '#24504e';
      for (let y = gy - h; y < gy; y++) { const xx = x + Math.round(Math.sin(y / 7 + x) * 1.6); P.set(xx, y, cS); if ((y + x) % 5 === 0) { const d = (y + x) % 10 === 0 ? 1 : -1; for (let i = 1; i < 5; i++) P.set(xx + d * i, y - Math.round(i * 0.6), i < 3 ? cL : cD); } if ((y + x) % 7 === 3) P.set(xx + 1, y, cL); }
      P.set(x + Math.round(Math.sin((gy - h) / 7 + x) * 1.6), gy - h - 1, cL);
    }
    // 沙地：带波纹
    for (let y = gy; y < rows; y++) for (let x = 0; x < cols; x++) {
      const n = A.noise(x / 6, y / 3, 93); let c = n < 0.35 ? '#c8b48a' : n < 0.7 ? '#d8c49a' : '#e4d2aa';
      if (Math.sin(x / 4 + Math.sin(y / 3) * 2 + y * 0.8) > 0.85) c = '#b8a47a';
      if (A.hash(x, y, 94) < 0.012) c = ['#ffffff', '#ffb0c8', '#f4d0a0'][Math.floor(A.hash(x, y, 95) * 3)];
      P.set(x, y, A.mix(c, '#2a5a8a', 0.12 + (1 - (y - gy) / (rows - gy)) * 0.15));
    }
    for (let x = 0; x < cols; x++) P.set(x, gy, '#b8a47a');
    // 家：海龟的珊瑚拱门、螃蟹的大海螺、章鱼的沉船
    const ra = PP.HOMES.reefArch(SZ(lay, 26)); home(lay, 'turtle', ra.s, C(lay, 0.18), lay.base + 1, ra.door);
    const eh = PP.HOMES.sandHoles(SZ(lay, 26)); home(lay, 'gardeneel', eh.s, C(lay, 0.52), lay.base + 4, eh.door);
    const rc2 = PP.HOMES.reefCave(SZ(lay, 20)); home(lay, 'shark', rc2.s, C(lay, 0.075), lay.base + 1, rc2.door);
    const wr = PP.HOMES.wreck(SZ(lay, 24)); home(lay, 'octopus', wr.s, C(lay, 0.84), lay.base + 1, wr.door);
    // 海草地、海带、珊瑚丛
    for (let i = 0; i < 8; i++) put(lay, seagrass(SZ(lay, 9) + (i % 3) * 2, R), C(lay, 0.25) + i * 5, lay.base + 3 + (i % 3));
    spot(lay, 'seagrass', C(lay, 0.3), lay.base + 5);
    for (const [f, h] of [[0.38, 0.9], [0.44, 1.1], [0.95, 0.85]]) put(lay, kelp(Math.round(SZ(lay, 44) * h), R), C(lay, f), lay.base);
    spot(lay, 'kelp', C(lay, 0.42), lay.base + 4);
    put(lay, coralBranch(SZ(lay, 22), '#ff7a8a', R), C(lay, 0.66), lay.base + 2);
    put(lay, coralBranch(SZ(lay, 16), '#ffa04a', R), C(lay, 0.72), lay.base + 3);
    put(lay, fanCoral(SZ(lay, 14), '#b98cff'), C(lay, 0.62), lay.base + 1);
    put(lay, brainCoral(5, '#e8c070'), C(lay, 0.7), lay.base + 5);
    put(lay, anemone('#ff8fb0'), C(lay, 0.75), lay.base + 4); put(lay, anemone('#7ad8c8'), C(lay, 0.33), lay.base + 2);
    spot(lay, 'coral', C(lay, 0.69), lay.base + 6);
    put(lay, coralBranch(SZ(lay, 14), '#ff6aa0', R), C(lay, 0.125), lay.base + 3);
    // 高处：珊瑚拱门顶上（海龟游上去歇着）
    spot(lay, 'reef', C(lay, 0.18), lay.base + 1 - SZ(lay, 26), { perch: true });
    // 大砗磲 + 贝壳 + 海星
    put(lay, clamShell(), C(lay, 0.93), lay.base + 4); spot(lay, 'clam', C(lay, 0.92), lay.base + 5);
    put(lay, starfish('#ff8a5a'), C(lay, 0.58), lay.base + 6); put(lay, starfish('#ffcf33'), C(lay, 0.24), lay.rows - 4);
    put(lay, A.rock(SZ(lay, 5), R, false, '#5a7a8a'), C(lay, 0.47), lay.base + 2); put(lay, A.rock(SZ(lay, 3), R, false, '#6a8a9a'), C(lay, 0.89), lay.base + 2);
    spot(lay, 'sandflat', C(lay, 0.6), lay.base + 7);
    lay.fishSchool = true;
  };
  // 草原：金黄的干草、平顶的金合欢树、远处的雪山、中间一个水塘
  B.savanna = (P, lay, R) => {
    const A = T(), s = lay.season, dry = s === 'autumn' || s === 'winter', { cols, gy, rows } = lay;
    mountains(P, lay, [[0.7, '#b8a8b8', true, 0.5]], 91);
    hills(P, lay, [[0.32, dry ? '#d8b878' : '#a8c070', dry ? '#ccaa68' : '#9ab464'], [0.18, dry ? '#c8a060' : '#90b060', dry ? '#bc9454' : '#84a456']], 92);
    // 远处一排金合欢的剪影：Y 字形的树干分叉，托起一两层扁平的树冠（上沿亮一点），远的更淡
    for (let x = 10; x < cols; x += 34 + Math.floor(A.hash(x, 1, 93) * 46)) {
      const far = A.hash(x, 2, 93) < 0.5, y = gy - (far ? 4 : 1), sc = far ? 0.7 : 1, haze = far ? 0.35 : 0.15;
      const col = A.mix('#4a5a2e', '#e8e0d0', haze), lit = A.mix('#7a8a42', '#e8e0d0', haze), tr = A.mix('#4a3a28', '#e8e0d0', haze);
      const th = Math.round(7 * sc); for (let k = 0; k < th; k++) P.set(x, y - k, tr); for (let k = 0; k < 3; k++) { P.set(x - 1 - k, y - th - k, tr); P.set(x + 1 + k, y - th - k, tr); }
      for (const [ox, oy, rx] of [[0, -th - 3, 7 * sc], [-3 * sc, -th - 5, 4 * sc]]) P.ell(x + ox, y + oy, rx, 1.4, (nx, ny) => (ny < -0.3 ? lit : col));
    }
    const G2 = dry ? ['#d8b860', '#c8a450', '#e8cc78', '#a88a40'] : ['#a8c060', '#94ac50', '#bcd474', '#8a7a40'];
    ground(P, lay, G2, { path: ['#d8bc8a', '#c4a676', '#a88a5a'], blades: dry ? ['#b8963a', '#e0c070'] : ['#7a9a3a', '#b8d070'] });
    // 水塘：一圈龟裂的泥边（深色裂纹）、浅水泛黄、深处映着天光，水边几串脚印
    const wc = C(lay, 0.5), wy = lay.base + Math.round((rows - lay.base) * 0.32), wr = Math.round(cols * 0.075), wry = Math.max(3, (rows - lay.base) * 0.26);
    P.ell(wc, wy, wr + 5, wry + 2, (nx, ny, x, y) => ((A.noise(x / 2, y / 1.5, 94) > 0.72) ? '#6a5430' : ny < 0 ? '#a8905a' : '#9a8250'));
    P.ell(wc, wy, wr, wry, (nx, ny, x, y) => { const d = nx * nx + ny * ny; if (d > 0.8) return '#7a8a6a'; if (ny < -0.35) return A.hash(x, y, 95) < 0.2 ? '#e0f4f8' : '#a8d8e0'; return d < 0.35 ? '#3a7a8a' : '#5a9aa8'; });
    for (let i = 0; i < 10; i++) { const x = wc + wr + 6 + i * 3, y = wy + 2 + (i % 2); P.set(x, y, '#7a6234'); P.set(x + 1, y, '#7a6234'); }
    lay.waterhole = { c: wc, r: wy };
    spot(lay, 'waterhole', wc + Math.round(wr * 0.6), wy + 2);
    home(lay, 'hippo', new A.Pix(2, 2), wc, wy + 2, { x: 1 }); lay.spots.hippo_home.water = true;
    const pr = PP.HOMES.prideRock(SZ(lay, 16), R); home(lay, 'lion', pr.s, C(lay, 0.18), lay.base + 1, pr.door); lay.spots.lion_home.r = lay.base + 1 - pr.s.h + 1; lay.spots.lion_home.perch = true;
    const ac = PP.HOMES.acacia(SZ(lay, 40), R, s); home(lay, 'zebra', ac, C(lay, 0.36), lay.base + 1, { x: Math.round(ac.w / 2) });
    // 羚羊：一大丛高草（一根根带穗的草茎往两边弯，根部暗、穗子亮）
    const tg = A.spr(SZ(lay, 32), SZ(lay, 14)), GG = dry ? ['#8a6a2a', '#c8a050', '#e0bc68', '#f6e0a0'] : ['#4a6a2a', '#7a9a3a', '#a8c060', '#e8e0a0'];
    for (let k = 0; k < tg.w * 1.4; k++) { const x0 = 1 + A.hash(k, 1, 96) * (tg.w - 1), hh = Math.round(tg.h * (0.45 + A.hash(k, 2, 96) * 0.55)), lean = (x0 - tg.w / 2) / tg.w * 0.5 + (A.hash(k, 3, 96) - 0.5) * 0.3; for (let y = 0; y < hh; y++) tg.set(x0 + lean * y, tg.h + 1 - y, y < hh * 0.3 ? GG[0] : y > hh - 3 ? GG[3] : k % 2 ? GG[1] : GG[2]); if (k % 3 === 0) { tg.set(x0 + lean * hh, tg.h + 1 - hh, GG[3]); tg.set(x0 + lean * hh + 1, tg.h + 2 - hh, GG[2]); } }
    home(lay, 'antelope', tg.outline(dry ? '#5a4218' : '#2e4218', (x, y) => y < tg.h), C(lay, 0.7), lay.base + 2, { x: Math.round(tg.w / 2) });
    put(lay, PP.HOMES.acacia(SZ(lay, 34), R, s), C(lay, 0.88), lay.base + 1); spot(lay, 'acacia', C(lay, 0.88), lay.base + 4);
    // 白蚁丘：几根高矮不一的土柱挤在一起（竖向的沟纹、左亮右暗、上面几个小洞）
    const tmw = 14, tmh = SZ(lay, 18), tm = A.spr(tmw, tmh), TM = ['#6a3a1a', '#9a5a30', '#b8703c', '#d08850', '#e8a868'];
    for (const [ox, hf, ww] of [[0, 1, 4], [-4, 0.7, 3], [4, 0.55, 3], [-2, 0.85, 3]]) { const top = Math.round(tmh * (1 - hf)) + 1; for (let y = top; y <= tmh + 1; y++) { const half = Math.max(1, Math.round(ww * Math.min(1, (y - top + 2) / (tmh * 0.4)))); for (let x = -half; x <= half; x++) { const nx = x / half; let c = nx < -0.4 ? TM[4] : nx < 0.2 ? TM[3] : nx < 0.6 ? TM[2] : TM[1]; if ((x + ox + 20) % 3 === 0 && A.hash(x, y, 97) < 0.5) c = TM[Math.max(0, TM.indexOf(c) - 1)]; tm.set(8 + ox + x, y, c); } } }
    for (const [x, y] of [[8, 6], [5, 10], [11, 12]]) { tm.set(x, y, TM[0]); tm.set(x, y + 1, '#3a2010'); }
    put(lay, tm.outline('#3a1e0c'), C(lay, 0.6), lay.base + 2);
    for (const f of [0.08, 0.27, 0.47, 0.8, 0.96]) put(lay, A.grassTuft(dry ? 'autumn' : 'summer', R, true), C(lay, f), lay.base + 3 + Math.round(f * 7) % 3);
    put(lay, A.rock(SZ(lay, 4), R, false, '#a89a88'), C(lay, 0.53), lay.base + 2); put(lay, A.bush(SZ(lay, 5), dry ? 'autumn' : 'summer', R), C(lay, 0.29), lay.base + 1);
    spot(lay, 'grass', C(lay, 0.28), lay.base + 6); spot(lay, 'plain', C(lay, 0.78), lay.base + 6);
  };
  // 南极：远处是深蓝的海和冰山，近处是冰架；企鹅的鹅卵石巢、海豹的呼吸孔、信天翁的草巢
  B.antarctic = (P, lay, R) => {
    const A = T(), { cols, gy, rows } = lay; lay.season = 'winter';
    mountains(P, lay, [[0.7, '#d8e4f0', true, 0.5], [0.45, '#c4d4e6', true, 0.4]], 111);
    const wy0 = gy - Math.round(gy * (lay.full ? 0.2 : 0.36)), wy1 = gy + 3;
    seaWater(P, lay, wy0, wy1, ['#183e6a', '#1e4a7a', '#28588c', '#3a6c9e', '#c8e0f0'], 112);
    // 冰山：一块块冰的切面（顶上雪白、受光面淡蓝白、背阴面蓝），竖向的冰裂纹，水线上一道深色、水里一截淡淡的倒影
    const ICE = ['#5a86b4', '#8ab4d8', '#b8d6ee', '#e2f0fa', '#ffffff'];
    for (const [f, ww, hh, sd] of [[0.12, 30, 13, 1], [0.4, 18, 8, 2], [0.66, 38, 16, 3], [0.9, 14, 7, 4]]) {
      const cx = C(lay, f), W2 = SZ(lay, ww) / 2, H2 = Math.min(SZ(lay, hh), wy0 - 4), base = wy0 + 2;
      const topAt = (x) => Math.round(base - H2 * (Math.abs(x - cx) / W2 < 0.55 ? 1 : Math.max(0, (1 - Math.abs(x - cx) / W2) / 0.45)) - A.noise(x / 4, sd, 113) * 2);
      cellRock(P, Math.round(cx - W2), Math.round(base - H2 - 3), Math.round(cx + W2), base, 5, ICE, 113 + sd, (x, y) => Math.abs(x - cx) <= W2 && y >= topAt(x), { bias: 0.3, gap: 0.7 });
      for (let x = Math.round(cx - W2); x <= cx + W2; x++) { const t = topAt(x); if (Math.abs(x - cx) <= W2) { P.set(x, t, '#ffffff'); if (A.hash(x, 1, sd) < 0.6) P.set(x, t + 1, '#f4faff'); if (x > cx + W2 * 0.3) for (let y = t + 2; y <= base; y++) P.set(x, y, A.mix(P.get(x, y) ? '#9ac0e0' : '#9ac0e0', '#5a86b4', 0.3)); P.set(x, base + 1, '#2a5a8a'); if (A.hash(x, 2, sd) < 0.5) P.set(x, base + 2, '#4a7aa8'); } }
    }
    lay.water = { y0: wy0, y1: wy1, ice: false, sea: true };
    ground(P, Object.assign({}, lay, { gy: wy1 }), GROUND.winter, {});
    // 冰架的边缘：一道蓝色的冰崖（竖纹），冰面上被风吹出来的雪纹（一道道浅蓝阴影 + 亮边）
    for (let x = 0; x < cols; x++) { const e = wy1 + Math.round(Math.sin(x / 13) * 0.7); P.set(x, e - 1, '#ffffff'); P.set(x, e, x % 3 ? '#a8c8e4' : '#8ab0d4'); P.set(x, e + 1, x % 4 ? '#c8dcee' : '#a8c4e0'); P.set(x, e + 2, '#e2ecf6'); }
    for (let y = wy1 + 4; y < rows; y++) for (let x = 0; x < cols; x++) { const v = Math.sin(x / 9 + A.noise(x / 25, y / 5, 114) * 6 + y * 0.6); if (v > 0.92) P.set(x, y, '#c8d8ea'); else if (v > 0.86) P.set(x, y, '#ffffff'); }
    spot(lay, 'shore', C(lay, 0.45), wy1 + 1); lay.icehole = { c: C(lay, 0.45), r: wy1 };
    spot(lay, 'icefield', C(lay, 0.36), lay.base + 5);
    // 冰坡：企鹅肚皮滑（受光面亮、背面淡蓝，坡面上一道被滑亮的冰道）
    const sl = new A.Pix(Math.round(cols * 0.16), SZ(lay, 14)), sw = sl.w, sh = sl.h;
    for (let x = 0; x < sw; x++) { const k = x < sw * 0.25 ? x / (sw * 0.25) : 1 - (x - sw * 0.25) / (sw * 0.75); const hh = Math.round(sh * Math.max(0, Math.pow(k, 0.8))); for (let y = 0; y < hh; y++) { let c = x < sw * 0.25 ? (y > hh - 3 ? '#ffffff' : '#dce8f4') : '#f2f8fd'; if (x >= sw * 0.25 && y === hh - 1) c = '#bfe0f4'; if (x >= sw * 0.25 && y === hh - 2) c = '#e2f2fc'; if (A.hash(x, y, 115) < 0.05) c = '#c8dcec'; sl.set(x, sh - 1 - y, c); } }
    sl.outline('#8aa8c8'); put(lay, sl, C(lay, 0.74), lay.base + 1);
    spot(lay, 'slidetop', C(lay, 0.74) - sw / 2 + sw * 0.25, lay.base + 1 - sh, { perch: true }); spot(lay, 'slideend', C(lay, 0.74) + sw / 2 - 4, lay.base + 4);
    const pn = PP.HOMES.pebbleNest(SZ(lay, 30)); home(lay, 'penguin', pn.s, C(lay, 0.2), lay.base + 4, pn.door);
    const bh = PP.HOMES.breathingHole(SZ(lay, 14)); home(lay, 'seal', bh.s, C(lay, 0.56), lay.base + 5, bh.door);
    const tn = PP.HOMES.tussockNest(SZ(lay, 13), R); home(lay, 'albatross', tn.s, C(lay, 0.92), lay.base + 1, tn.door);
    lay.spots.albatross_home.r = lay.base + 1 - tn.s.h + 3; lay.spots.albatross_home.perch = true;
    for (const [f, r] of [[0.08, 4], [0.63, 4], [0.33, 3], [0.84, 2.5]]) put(lay, A.rock(SZ(lay, r), R, true, '#6a7080'), C(lay, f), lay.base + 3);
  };
  // 洞穴：没有天空，洞顶垂下钟乳石，左边是透着光的洞口；地下水潭、会发光的蘑菇和水晶
  B.cave = (P, lay, R) => {
    const A = T(), { cols, gy, rows } = lay; lay.cave = true;
    const mouth = Math.round(cols * 0.07);
    // 洞壁：一块块岩石切面，越往上越暗；洞口那边被外面的光照亮
    cellRock(P, 0, 0, cols - 1, gy - 1, Math.max(15, Math.round(gy / 7)), ['#141019', '#221c2a', '#2c2634', '#363040', '#443c50'], 201, null, { gap: 0.9, flat: 0.85, bias: -0.15, tint: ['#0c0a12', (x, y) => Math.max(0, 0.42 - y / gy * 0.6) + Math.max(0, A.noise(x / 30, y / 16, 206) - 0.45) * 1.1] });
    for (let y = 0; y < gy; y++) for (let x = 0; x < mouth * 1.4; x++) { const dx = x / mouth, dy = (y - gy * 0.55) / (gy * 0.5), d = Math.sqrt(dx * dx + dy * dy); if (d < 1.25) { const v = P.get(x, y); const r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255; P.set(x, y, A.mix('#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1), '#d8e2ea', Math.max(0, 1 - d) * (A.dith(x, y, Math.max(0, 1.1 - d)) ? 1 : 0.8))); } }
    // 钟乳石：一根根圆锥（左亮右暗），尖上挂一滴亮水珠
    for (let x = mouth + 4; x < cols; x += 3 + Math.floor(R() * 6)) { const len = 3 + Math.floor(R() * Math.min(lay.full ? 60 : 16, gy * 0.28)), w0 = (1.5 + R() * 1.5) * (lay.full ? 1.8 : 1); for (let k = 0; k < len; k++) { const half = Math.max(0, Math.round((1 - k / len) * w0)); for (let d = -half; d <= half; d++) P.set(x + d, k, d < 0 ? '#5a5266' : d === 0 ? '#4a4256' : '#2e2836'); } if (R() < 0.5) P.set(x, len, '#a8e0ff'); }
    ground(P, lay, ['#3a3242', '#332c3a', '#4a4252', '#241e2a'], {});
    cellRock(P, 0, gy, cols - 1, rows - 1, 11, ['#1e1824', '#2e2834', '#3a3242', '#463e4e', '#585064'], 202, (x, y) => A.hash(Math.floor(x / 23), Math.floor(y / 9), 203) < 0.55, { flat: 0.45, gap: 0.8 });
    for (let x = 0; x < cols; x++) { P.set(x, gy, '#1a1620'); if (A.hash(x, 1, 204) < 0.4) P.set(x, gy + 1, '#241e2a'); }
    for (let x = 0; x < mouth; x++) for (let y = gy; y < gy + 3; y++) P.set(x, y, A.mix('#6a6a72', '#3a3242', x / mouth));
    // 地下水潭：一圈湿亮的石头，水面映着洞顶的蓝光，深处更黑
    const pc = C(lay, 0.55), py = lay.base + Math.round((rows - lay.base) * 0.4), prx = cols * 0.08, pry = Math.max(3, (rows - lay.base) * 0.25);
    P.ell(pc, py, prx + 2, pry + 1.2, (nx, ny, x, y) => (A.hash(x >> 1, y, 205) < 0.5 ? '#5a5266' : '#463e4e'));
    P.ell(pc, py, prx, pry, (nx, ny, x, y) => { const d = nx * nx + ny * ny; if (A.hash(x, y, 4) < 0.04) return '#7fe0ff'; if (ny < -0.45) return '#3a7a9a'; return d < 0.3 ? '#0e2236' : d < 0.65 ? '#163250' : '#22486a'; });
    spot(lay, 'pool', pc, py - 2); spot(lay, 'entrance', C(lay, 0.06) + 6, lay.base + 4);
    // 石笋
    const SP = ['#1a1620', '#3a3444', '#4e4858', '#6a6274'];
    for (const [f, hh] of [[0.83, 14], [0.86, 9], [0.88, 18], [0.2, 10], [0.95, 7]]) put(lay, stalagmite(SZ(lay, hh), SP), C(lay, f), lay.base + 1);
    spot(lay, 'stalagmites', C(lay, 0.86), lay.base + 4);
    // 水晶簇（会微微发光）
    for (const [f, h, col] of [[0.14, 10, '#7fd8ff'], [0.47, 8, '#b48cff'], [0.63, 12, '#7fd8ff'], [0.92, 9, '#9affd0']]) { put(lay, crystal(SZ(lay, h), col), C(lay, f), lay.base + 2); lay.lights.push({ x: C(lay, f) - 2, y: lay.base - 4, w: 4, h: 4, r: 7, col }); }
    // 发光蘑菇：细长的白柄，伞盖青绿发光，伞下一圈亮边
    const ms = A.spr(22, 9); for (let i = 0; i < 5; i++) { const x = 3 + i * 4, h2 = 3 + (i % 3) * 1.5, top = 9 - h2; ms.vl(x, top + 1, h2, '#e8e0f0'); ms.set(x + 1, top + 2, '#b8b0c8'); const cc = i % 2 ? '#7fe0ff' : '#b8f0a0'; ms.ell(x, top, 2.2, 1.3, (nx, ny) => (ny > 0.3 ? A.shade(cc, -0.3) : nx < -0.2 ? A.shade(cc, 0.5) : cc)); }
    put(lay, ms.outline('#16121c'), C(lay, 0.3), lay.base + 3); spot(lay, 'mushrooms', C(lay, 0.3), lay.base + 4);
    for (let i = 0; i < 5; i++) lay.lights.push({ x: C(lay, 0.3) - 9 + i * 4, y: lay.base - 3, w: 1, h: 1, r: 3, col: '#9fe8ff' });
    // 洞顶的萤火虫（发光蕈蚊）
    for (let i = 0; i < 26; i++) { const x = mouth + 10 + Math.floor(R() * (cols - mouth - 20)), y = 2 + Math.floor(R() * gy * 0.35); lay.lights.push({ x, y, w: 1, h: 1, r: 2, col: '#7fe8ff', glow: true }); }
    const br = PP.HOMES.batRoost(SZ(lay, 26), Math.max(8, SZ(lay, 12))); home(lay, 'bat', br.s, C(lay, 0.66), br.s.h + 5, br.door);
    lay.spots.bat_home.r = br.s.h + 26; lay.spots.bat_home.perch = true; lay.spots.bat_home.hang = true;
    const bd = PP.HOMES.bearDen(SZ(lay, 22)); home(lay, 'brownbear', bd.s, C(lay, 0.74), lay.base + 1, bd.door);
    const pc2 = PP.HOMES.burrow(SZ(lay, 20), SZ(lay, 7), ['#4a4252', '#5a5262', '#3a3242', '#1a1620'], [0.5]); home(lay, 'porcupine', pc2.s, C(lay, 0.4), lay.base + 2, pc2.door);
  };
  PP.BIOMES = B;
  PP.BIOME_H = { put, spot, home, C, SZ, mountains, ground, GROUND, PATH, BLADES, T, cellRock, seaWater };
})();
