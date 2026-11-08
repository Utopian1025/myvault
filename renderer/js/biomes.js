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
    const { hash, cols } = { hash: T().hash, cols: lay.cols };
    const [dark, mid, light] = cols2;
    for (let x = -6; x < cols + 6; x += 3 + Math.floor(hash(x, 1, seed) * 4)) {
      const h = Math.round(height * (0.55 + hash(x, 2, seed) * 0.45));
      if (kind === 'pine') {
        for (let k = 0; k < h; k++) { const half = Math.round((k / h) * (h * 0.28)) + (k % 4 === 0 ? 1 : 0); for (let dx = -half; dx <= half; dx++) P.set(x + dx, bottom - h + k, dx < -half / 2 ? light : dx < half / 2 ? mid : dark); }
      } else {
        const r = Math.round(h * 0.42);
        for (let yy = -r; yy <= r; yy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + yy * yy * 1.3 <= r * r) P.set(x + dx, bottom - r - Math.round(h * 0.25) + yy, dx + yy < -r * 0.6 ? light : dx + yy < r * 0.3 ? mid : dark);
        P.rect(x, bottom - Math.round(h * 0.3), 1, Math.round(h * 0.3), dark);
      }
    }
    P.rect(0, bottom - 1, lay.cols, 2, dark);
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
    const cairn = new A.Pix(12, 16); [[6, 13, 5, 3], [6, 9, 4, 2.5], [6, 5.5, 3, 2], [6, 2.5, 2, 1.6]].forEach(([x, y, rx, ry], i) => cairn.ell(x, y, rx, ry, (nx, ny) => (nx < -0.2 ? '#b4b4c0' : '#8e8e9a'))); cairn.outline('#4a4a56'); put(lay, cairn, C(lay, 0.2), lay.base + 1); spot(lay, 'cairn', C(lay, 0.2) + 8, lay.base + 3);
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
    lay.water = { y0: wy0, y1: wy1, ice: w };
    ground(P, Object.assign({}, lay, { gy: wy1 }), w ? GROUND.winter : ['#c8b888', '#b4a474', '#d8c898', '#8a8a96'], { path: null });
    for (let x = 0; x < lay.cols; x++) if (A.hash(x, 3) < 0.5) P.set(x, wy1, w ? '#ffffff' : '#a89868');
    // 码头：木板伸进湖里
    const dc = C(lay, 0.5), dw = Math.round(lay.cols * 0.1);
    for (let x = dc - dw; x < dc + dw; x++) { P.set(x, wy1 - 3, x % 5 === 0 ? '#6a4428' : '#a8784a'); P.set(x, wy1 - 2, '#8a5e3a'); P.set(x, wy1 - 1, '#6a4428'); }
    for (let x = dc - dw; x < dc + dw; x += 8) P.rect(x, wy1 - 2, 1, 4, '#4a3020');
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
    const hm = new A.Pix(12, 5); hm.ell(6, 5, 5, 3, (nx, ny) => (ny > 0 ? null : nx * nx + ny * ny < 0.4 ? '#2a1a12' : '#8a6448')); home(lay, 'hamster', hm, C(lay, 0.665), lay.base + 3, { x: 6 });
    const pd = new A.Pix(26, 7); pd.ell(13, 3.5, 12, 3, (nx, ny) => (w ? '#dcecf8' : ny < -0.4 ? '#bfe6f8' : '#6ab4dc')); put(lay, pd, C(lay, 0.79), lay.base + 7); spot(lay, 'puddle', C(lay, 0.79), lay.base + 5);
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
    const bowl = (col) => { const p = new A.Pix(9, 4); p.ell(4.5, 2, 4, 2, (nx, ny) => (ny < -0.3 ? '#c98a4a' : col)); return p.outline('#3a2418'); };
    put(lay, bowl('#e33b3b'), C(lay, 0.215), b + 2); spot(lay, 'catbowl', C(lay, 0.215), b + 3);
    put(lay, A.hayBale(w), C(lay, 0.27), b + 1); put(lay, A.hayBale(w), C(lay, 0.27) + 9, b - 1); spot(lay, 'hay', C(lay, 0.27), b + 3);
    const fe = A.fence(30, w); put(lay, fe, C(lay, 0.31), b); spot(lay, 'fence', C(lay, 0.31), b - fe.h + 2, { perch: true });
    const kn = PP.HOMES.kennel(z(18), s); home(lay, 'dog', kn.s, C(lay, 0.38), b, kn.door);
    put(lay, bowl('#4b9bcc'), C(lay, 0.425), b + 2); spot(lay, 'dogbowl', C(lay, 0.425), b + 3);
    const tr = new A.Pix(22, 7); tr.rect(1, 1, 20, 5, '#7a5234'); tr.rect(2, 1, 18, 2, w ? '#dcecf8' : '#6ab4dc'); tr.hl(2, 1, 18, w ? '#ffffff' : '#9fd8f2'); tr.rect(2, 6, 2, 1, '#4a3020'); tr.rect(18, 6, 2, 1, '#4a3020'); tr.outline('#3a2418'); put(lay, tr, C(lay, 0.47), b + 2); spot(lay, 'trough', C(lay, 0.47), b + 3);
    const cp = PP.HOMES.coop(z(26), s); home(lay, 'chick', cp.s, C(lay, 0.54), b, cp.door);
    const fd = new A.Pix(24, 3); for (let i = 0; i < 18; i++) fd.set((i * 7) % 23, i % 3, '#ffcf33'); put(lay, fd, C(lay, 0.6), b + 4); spot(lay, 'feed', C(lay, 0.6), b + 4);
    put(lay, A.broadleaf(z(46), s, R, 'apple'), C(lay, 0.66), b); spot(lay, 'apple', C(lay, 0.66), b + 3);
    const st = PP.HOMES.sty(z(18), s); home(lay, 'pig', st.s, C(lay, 0.74), b, st.door);
    const md = new A.Pix(28, 6); md.ell(14, 3, 13, 2.6, (nx, ny) => (w ? '#c8bcac' : ny < -0.3 ? '#8a5a3a' : '#6a4428')); put(lay, md, C(lay, 0.79), b + 4); spot(lay, 'mud', C(lay, 0.79), b + 3);
    // 菜园：一垄一垄
    const vg = new A.Pix(Math.round(lay.cols * 0.06), 10);
    for (let row = 0; row < 3; row++) for (let x = 1; x < vg.w - 1; x++) { vg.set(x, 3 + row * 3, '#7a5234'); if (x % 4 === 1 && !w) { if (s === 'spring') vg.set(x, 2 + row * 3, '#7cc35a'); else if (row === 1) { vg.ell(x, 1.5 + row * 3, 1.6, 1.2, '#a8e07a'); } else { vg.set(x, 2 + row * 3, '#ff8a2a'); vg.set(x, 1 + row * 3, '#3fa34d'); vg.set(x - 1, 0 + row * 3, '#3fa34d'); } } }
    put(lay, vg, C(lay, 0.81), b + 8); spot(lay, 'veg', C(lay, 0.81), b + 8);
    const pn = PP.HOMES.pen(SZ(lay, 24), s); home(lay, 'sheep', pn.s, C(lay, 0.93), b + 1, pn.door);
    const cs = PP.HOMES.shed(z(20), s, '#f0e6d8', '#8e2620'); home(lay, 'cow', cs.s, C(lay, 0.875), b, cs.door);
    spot(lay, 'pasture', C(lay, 0.84), b + 6);
    spot(lay, 'yard', C(lay, 0.5), b + 6);
  };
  B.desert = (P, lay, R) => {
    const A = T();
    // 远处的红色平顶山 + 沙丘
    mountains(P, lay, [[0.6, '#d48a5a', false, 0.4], [0.35, '#e0a46a', false, 0.3]], 71);
    for (let x = 0; x < lay.cols; x++) { const top = Math.round(lay.gy - lay.gy * 0.14 * (0.4 + A.noise(x / 40, 0, 72))); for (let y = top; y < lay.gy; y++) P.set(x, y, (y - top) < 1 ? '#f8dca0' : x % 37 < 18 ? '#eac080' : '#e0b070'); }
    ground(P, lay, ['#ecc888', '#e2bc78', '#f4d898', '#c49a5a'], { path: null });
    for (let y = lay.gy + 2; y < lay.rows; y += 3) for (let x = 0; x < lay.cols; x++) if (Math.sin(x / 5 + y * 0.7) > 0.7) P.set(x, y, '#d4ac68'); // 沙纹
    // 绿洲
    const oc = C(lay, 0.5), oy = lay.base + Math.round((lay.rows - lay.base) * 0.3);
    P.ell(oc, oy, lay.cols * 0.07, Math.max(3, (lay.rows - lay.base) * 0.22), (nx, ny) => (nx * nx + ny * ny > 0.75 ? '#7cb45a' : ny < -0.3 ? '#8fd0e8' : '#4ba4c8'));
    spot(lay, 'oasis', oc, oy + 2);
    put(lay, A.palm(SZ(lay, 44), R), C(lay, 0.44), lay.base + 1); put(lay, A.palm(SZ(lay, 38), R), C(lay, 0.57), lay.base);
    for (const [f, h] of [[0.15, 22], [0.3, 16], [0.8, 26], [0.93, 18]]) put(lay, A.cactus(SZ(lay, h), R), C(lay, f), lay.base + 2);
    put(lay, A.rock(SZ(lay, 7), R, false, '#c47a4a'), C(lay, 0.12) + 14, lay.base + 3); spot(lay, 'rocks', C(lay, 0.12), lay.base + 4);
    spot(lay, 'dunes', C(lay, 0.25), lay.base + 5); spot(lay, 'cactus', C(lay, 0.78), lay.base + 5);
    const sandPal = ['#e2bc78', '#f4d898', '#d4ac68', '#9a7040'];
    const fn = PP.HOMES.burrow(SZ(lay, 20), SZ(lay, 7), sandPal, [0.45]); home(lay, 'fennec', fn.s, C(lay, 0.225), lay.base + 2, fn.door);
    const mk = PP.HOMES.burrow(SZ(lay, 28), SZ(lay, 7), sandPal, [0.3, 0.6, 0.82]); home(lay, 'meerkat', mk.s, C(lay, 0.685), lay.base + 2, mk.door);
    // 骆驼：棕榈树下搭的小帐篷
    const tn = new A.Pix(SZ(lay, 26), SZ(lay, 13)); const tw = tn.w, tt = tn.h;
    for (let y = 1; y <= tt; y++) { const half = Math.round((y / tt) * tw / 2); for (let x = -half; x <= half; x++) tn.set(tw / 2 + x, y, (x + 100) % 6 < 3 ? '#c84a3a' : '#e8d4a8'); }
    tn.ell(tw / 2, tt + 1, tw * 0.12, tt * 0.5, (nx, ny) => (ny > 0 ? null : '#3a2418')); tn.outline('#6a3020');
    home(lay, 'camel', tn, C(lay, 0.615), lay.base + 2, { x: Math.round(tw / 2) });
  };
  B.beach = (P, lay, R) => {
    const A = T();
    // 海：天边一条线，越近越浅，远处一个小岛
    const wy0 = lay.gy - Math.round(lay.gy * (lay.full ? 0.3 : 0.5)), wy1 = lay.gy + 4;
    for (let y = wy0; y < wy1; y++) { const k = (y - wy0) / (wy1 - wy0); for (let x = 0; x < lay.cols; x++) P.set(x, y, y === wy0 ? '#dff4fb' : A.hash(x, y, 5) < 0.015 ? '#ffffff' : k < 0.3 ? '#3f86c8' : k < 0.7 ? '#4fa4d4' : '#6ac0e0'); }
    const ix = C(lay, 0.72); for (let x = -18; x <= 18; x++) { const h = Math.round(6 * Math.cos((x / 18) * Math.PI / 2)); P.rect(ix + x, wy0 - h, 1, h, x < -4 ? '#5aa060' : '#3f8a50'); }
    lay.water = { y0: wy0, y1: wy1, ice: false, sea: true };
    ground(P, Object.assign({}, lay, { gy: wy1 }), ['#f0dca8', '#e8d098', '#f8e8bc', '#d8c088'], {});
    for (let x = 0; x < lay.cols; x++) P.set(x, wy1, A.hash(x, 1) < 0.6 ? '#ffffff' : '#c8eef8');
    put(lay, A.palm(SZ(lay, 46), R), C(lay, 0.08), lay.base + 1); put(lay, A.palm(SZ(lay, 40), R), C(lay, 0.91), lay.base + 2);
    // 礁石 + 潮池
    const tp = new A.Pix(34, 10); tp.ell(17, 7, 12, 3, (nx, ny) => (ny < -0.3 ? '#9fe0f0' : '#5abcd8')); A.rock(4, R, false, '#7a7a88').stamp(tp, 5, 10); A.rock(5, R, false, '#8a8a96').stamp(tp, 29, 10); A.rock(3, R, false, '#6a6a78').stamp(tp, 17, 5);
    tp.set(12, 7, '#ff6b5a'); tp.set(20, 8, '#ffcf33'); put(lay, tp, C(lay, 0.3), lay.base + 3); spot(lay, 'tidepool', C(lay, 0.3), lay.base + 4);
    // 沙堡
    const sc = new A.Pix(20, 14); sc.rect(2, 7, 16, 7, '#e2c488'); for (const x of [2, 8, 14]) { sc.rect(x, 3, 4, 5, '#e8cc90'); sc.rect(x, 2, 1, 1, '#e8cc90'); sc.rect(x + 3, 2, 1, 1, '#e8cc90'); } sc.rect(9, 0, 1, 3, '#7a5234'); sc.rect(10, 0, 3, 2, '#ff6b5a'); sc.rect(8, 10, 4, 4, '#b8984a'); sc.outline('#a8884a'); put(lay, sc, C(lay, 0.6), lay.base + 4); spot(lay, 'sand', C(lay, 0.55), lay.base + 6);
    const dw = new A.Pix(28, 5); dw.rect(1, 1, 26, 3, '#b8a888'); dw.hl(1, 1, 26, '#d8c8a8'); dw.rect(20, 0, 2, 1, '#b8a888'); dw.outline('#7a6a50'); put(lay, dw, C(lay, 0.75), lay.base + 5); spot(lay, 'driftwood', C(lay, 0.75), lay.base + 4);
    for (let i = 0; i < 8; i++) { const x = Math.floor(R() * lay.cols), y = lay.base + 3 + Math.floor(R() * (lay.rows - lay.base - 4)); P.set(x, y, ['#ffb0c8', '#ffffff', '#f4d0a0'][i % 3]); P.set(x + 1, y, '#e8b0a0'); }
    spot(lay, 'waves', C(lay, 0.45), wy1 - 1);
    const cn = PP.HOMES.conch(SZ(lay, 12)); home(lay, 'crab', cn.s, C(lay, 0.4), lay.base + 3, cn.door);
    const gp = PP.HOMES.gullPost(SZ(lay, 20)); home(lay, 'seagull', gp.s, C(lay, 0.69), lay.base + 2, gp.door); lay.spots.seagull_home.r = lay.base + 2 - gp.s.h + 3; lay.spots.seagull_home.perch = true;
    const sr = new A.Pix(SZ(lay, 30), SZ(lay, 9)); A.rock(SZ(lay, 6), R, false, '#7a7a88').stamp(sr, sr.w * 0.35, sr.h); A.rock(SZ(lay, 4), R, false, '#8a8a96').stamp(sr, sr.w * 0.75, sr.h);
    home(lay, 'otter', sr, C(lay, 0.83), lay.base + 3, { x: Math.round(sr.w / 2) });
    spot(lay, 'sand', C(lay, 0.55), lay.base + 6);
  };
  B.jungle = (P, lay, R) => {
    const A = T();
    // 层层叠叠的雨林树冠（带点雾）
    for (const [b, h, cols2] of [[lay.gy - lay.gy * 0.25, lay.gy * 0.7, ['#5a8a6a', '#6a9a78', '#7aaa88']], [lay.gy - lay.gy * 0.08, lay.gy * 0.55, ['#2f6a44', '#3f7e50', '#529462']], [lay.gy, lay.gy * 0.4, ['#1c4a2e', '#26603a', '#347848']]]) treeLine(P, lay, Math.round(b), Math.round(Math.min(h, 70)), cols2, 'mix', Math.round(b));
    ground(P, lay, ['#3f7a3a', '#346c32', '#4a8a44', '#6a4a2a'], { path: ['#8a6a4a', '#7a5a3a', '#5a4028'], blades: ['#2c6a2c', '#5aa64e'] });
    // 河
    const rc = C(lay, 0.5);
    for (let y = lay.gy; y < lay.rows; y++) { const o = Math.round(Math.sin((y - lay.gy) / 6) * 3), ww = 5 + Math.round((y - lay.gy) * 0.25); for (let k = 0; k < ww; k++) P.set(rc + o + k - ww / 2, y, (k + y) % 6 === 0 ? '#9fd8c8' : '#4a9a8a'); }
    spot(lay, 'river', rc, lay.base + 3);
    const ph = PP.HOMES.bigTree(SZ(lay, 52), R, 'hollow'); home(lay, 'parrot', ph.s, C(lay, 0.09), lay.base + 1, ph.door); lay.spots.parrot_home.r = lay.base + 1 - (ph.s.h - ph.perch.y); lay.spots.parrot_home.perch = true;
    const mh = PP.HOMES.bigTree(SZ(lay, 48), R, 'house'); home(lay, 'monkey', mh.s, C(lay, 0.3), lay.base, mh.door); spot(lay, 'treehouse', C(lay, 0.3), lay.base - (mh.s.h - mh.perch.y), { perch: true });
    const tg = PP.HOMES.bigTree(SZ(lay, 56), R, 'roots'); home(lay, 'tiger', tg.s, C(lay, 0.72), lay.base + 1, tg.door); put(lay, A.bamboo(SZ(lay, 40), 'summer', R), C(lay, 0.92), lay.base);
    const fern = () => { const f = new A.Pix(18, 9); for (let k = 0; k < 5; k++) { const a = Math.PI * (0.15 + k * 0.17); for (let i = 0; i < 8; i++) f.set(9 + Math.cos(a) * i, 8 - Math.sin(a) * i * 0.9, i % 2 ? '#5aa64e' : '#3f8a44'); } return f.outline('#1c4a1c'); };
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
  function kelp(h, R) { const A = T(), s = A.spr(10, h); let x = 5; for (let y = h; y > 1; y--) { x += Math.sin(y / 5) * 0.5; s.set(x, y, '#3f7a3a'); s.set(x + 1, y, '#2f6a2e'); if (y % 6 === 0) { s.ell(x + (y % 12 ? 3 : -2), y, 2.4, 1.2, (nx) => (nx < 0 ? '#6aa64e' : '#4f8a40')); } } return s.outline('#1c3a1c'); }
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
    for (let x = 0; x < cols; x += 3 + Math.floor(A.hash(x, 7) * 5)) { const h = Math.round(gy * (0.3 + A.hash(x, 8) * 0.5)); for (let y = gy - h; y < gy; y++) P.set(x + Math.round(Math.sin(y / 6 + x) * 1.2), y, A.hash(x, 9) < 0.5 ? '#2e5e4a' : '#3a6e52'); }
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
    for (let i = 0; i < 10; i++) { const g = new A.Pix(3, 10); const hh = 5 + (i % 4); for (let y = 0; y < hh; y++) g.set(1 + (y % 3 === 0 ? 1 : 0), 9 - y, i % 2 ? '#4f9a40' : '#6aae54'); put(lay, g, C(lay, 0.26) + i * 4, lay.base + 3 + (i % 3)); }
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
    const A = T(), s = lay.season, dry = s === 'autumn' || s === 'winter';
    mountains(P, lay, [[0.7, '#b8a8b8', true, 0.5]], 91);
    hills(P, lay, [[0.32, dry ? '#d8b878' : '#a8c070'], [0.18, dry ? '#c8a060' : '#90b060']], 92);
    // 远处一排小小的金合欢树剪影
    for (let x = 10; x < lay.cols; x += 40 + Math.floor(A.hash(x, 1, 93) * 50)) { const y = lay.gy - 2; P.rect(x, y - 6, 1, 6, '#5a5a3a'); P.ell(x, y - 7, 6, 1.6, '#6a7a3a'); }
    const G2 = dry ? ['#d8b860', '#c8a450', '#e8cc78', '#a88a40'] : ['#a8c060', '#94ac50', '#bcd474', '#8a7a40'];
    ground(P, lay, G2, { path: ['#d8bc8a', '#c4a676', '#a88a5a'], blades: dry ? ['#b8963a', '#e0c070'] : ['#7a9a3a', '#b8d070'] });
    // 水塘
    const wc = C(lay, 0.5), wy = lay.base + Math.round((lay.rows - lay.base) * 0.32), wr = Math.round(lay.cols * 0.075);
    P.ell(wc, wy, wr, Math.max(3, (lay.rows - lay.base) * 0.26), (nx, ny) => (nx * nx + ny * ny > 0.8 ? '#8a7a4a' : ny < -0.3 ? '#9ad0d8' : '#5a9aa8'));
    lay.waterhole = { c: wc, r: wy };
    spot(lay, 'waterhole', wc + Math.round(wr * 0.6), wy + 2);
    home(lay, 'hippo', new A.Pix(2, 2), wc, wy + 2, { x: 1 }); lay.spots.hippo_home.water = true;
    const pr = PP.HOMES.prideRock(SZ(lay, 16), R); home(lay, 'lion', pr.s, C(lay, 0.18), lay.base + 1, pr.door); lay.spots.lion_home.r = lay.base + 1 - pr.s.h + 1; lay.spots.lion_home.perch = true;
    const ac = PP.HOMES.acacia(SZ(lay, 40), R, s); home(lay, 'zebra', ac, C(lay, 0.36), lay.base + 1, { x: Math.round(ac.w / 2) });
    // 羚羊：一大丛高草
    const tg = new A.Pix(SZ(lay, 30), SZ(lay, 12));
    for (let x = 0; x < tg.w; x++) { const hh = Math.round(tg.h * (0.5 + A.hash(x, 2, 94) * 0.5)); for (let y = 0; y < hh; y++) tg.set(x, tg.h - y, y > hh - 3 ? (dry ? '#f0d488' : '#c8e080') : dry ? '#c8a050' : '#8aac4a'); }
    home(lay, 'antelope', tg, C(lay, 0.7), lay.base + 2, { x: Math.round(tg.w / 2) });
    put(lay, PP.HOMES.acacia(SZ(lay, 34), R, s), C(lay, 0.88), lay.base + 1); spot(lay, 'acacia', C(lay, 0.88), lay.base + 4);
    // 白蚁丘
    const tm = new A.Pix(8, SZ(lay, 14)); for (let y = 0; y < tm.h; y++) { const half = Math.max(1, Math.round((y / tm.h) * 3.5)); tm.rect(4 - half, y, half * 2, 1, y % 4 === 0 ? '#a8683a' : '#c8804a'); } tm.outline('#5a3018'); put(lay, tm, C(lay, 0.6), lay.base + 2);
    spot(lay, 'grass', C(lay, 0.28), lay.base + 6); spot(lay, 'plain', C(lay, 0.78), lay.base + 6);
  };
  // 南极：远处是深蓝的海和冰山，近处是冰架；企鹅的鹅卵石巢、海豹的呼吸孔、信天翁的草巢
  B.antarctic = (P, lay, R) => {
    const A = T(); lay.season = 'winter';
    mountains(P, lay, [[0.7, '#d8e4f0', true, 0.5], [0.45, '#c4d4e6', true, 0.4]], 111);
    const wy0 = lay.gy - Math.round(lay.gy * (lay.full ? 0.2 : 0.36)), wy1 = lay.gy + 3;
    for (let y = wy0; y < wy1; y++) { const k = (y - wy0) / (wy1 - wy0); for (let x = 0; x < lay.cols; x++) P.set(x, y, y === wy0 ? '#c8e0f0' : A.hash(x, y, 5) < 0.012 ? '#ffffff' : k < 0.35 ? '#1e4a7a' : k < 0.7 ? '#2a5e92' : '#3a74a8'); }
    // 冰山：平顶，侧面淡蓝
    for (const [f, ww, hh] of [[0.12, 26, 12], [0.4, 16, 8], [0.68, 34, 15], [0.9, 12, 6]]) {
      const cx = C(lay, f), top = wy0 + 3 - Math.round(SZ(lay, hh));
      for (let y = top; y < wy0 + 4; y++) { const k = (y - top) / (wy0 + 4 - top), half = Math.round(SZ(lay, ww) / 2 * (0.6 + k * 0.4)); for (let x = -half; x <= half; x++) P.set(cx + x, y, x > half * 0.4 ? '#b8d4ea' : y === top ? '#ffffff' : '#eaf4fb'); }
    }
    lay.water = { y0: wy0, y1: wy1, ice: false, sea: true };
    ground(P, Object.assign({}, lay, { gy: wy1 }), GROUND.winter, {});
    for (let x = 0; x < lay.cols; x++) { P.set(x, wy1, A.hash(x, 2) < 0.5 ? '#ffffff' : '#d8eaf6'); if (A.hash(x, 3) < 0.4) P.set(x, wy1 + 1, '#c8dcec'); }
    spot(lay, 'shore', C(lay, 0.45), wy1 + 1); lay.icehole = { c: C(lay, 0.45), r: wy1 };
    spot(lay, 'icefield', C(lay, 0.36), lay.base + 5);
    // 冰坡：企鹅肚皮滑
    const sl = new A.Pix(Math.round(lay.cols * 0.16), SZ(lay, 14)), sw = sl.w, sh = sl.h;
    for (let x = 0; x < sw; x++) { const k = x < sw * 0.25 ? x / (sw * 0.25) : 1 - (x - sw * 0.25) / (sw * 0.75); const hh = Math.round(sh * Math.max(0, Math.pow(k, 0.8))); for (let y = 0; y < hh; y++) sl.set(x, sh - 1 - y, y === hh - 1 && x > sw * 0.25 ? '#bfe0f4' : x < sw * 0.25 ? '#ffffff' : '#eef5fc'); }
    sl.outline('#a8c0d8'); put(lay, sl, C(lay, 0.74), lay.base + 1);
    spot(lay, 'slidetop', C(lay, 0.74) - sw / 2 + sw * 0.25, lay.base + 1 - sh, { perch: true }); spot(lay, 'slideend', C(lay, 0.74) + sw / 2 - 4, lay.base + 4);
    const pn = PP.HOMES.pebbleNest(SZ(lay, 30)); home(lay, 'penguin', pn.s, C(lay, 0.2), lay.base + 4, pn.door);
    const bh = PP.HOMES.breathingHole(SZ(lay, 14)); home(lay, 'seal', bh.s, C(lay, 0.56), lay.base + 5, bh.door);
    const tn = PP.HOMES.tussockNest(SZ(lay, 13), R); home(lay, 'albatross', tn.s, C(lay, 0.92), lay.base + 1, tn.door);
    lay.spots.albatross_home.r = lay.base + 1 - tn.s.h + 3; lay.spots.albatross_home.perch = true;
    for (const f of [0.08, 0.63]) put(lay, A.rock(SZ(lay, 4), R, true), C(lay, f), lay.base + 3);
  };
  // 洞穴：没有天空，洞顶垂下钟乳石，左边是透着光的洞口；地下水潭、会发光的蘑菇和萤火虫
  B.cave = (P, lay, R) => {
    const A = T(); lay.cave = true;
    const { cols, gy } = lay, mouth = Math.round(cols * 0.07);
    for (let y = 0; y < gy; y++) for (let x = 0; x < cols; x++) {
      const n = A.noise(x / 6, y / 5, 201); let c = n < 0.33 ? '#241e2a' : n < 0.66 ? '#2e2734' : '#3a3242';
      const dx = x / mouth, dy = (y - gy * 0.55) / (gy * 0.5);
      if (dx * dx + dy * dy < 1) c = A.mix('#c8d4dc', c, Math.min(1, Math.sqrt(dx * dx + dy * dy) * 1.1));
      P.set(x, y, c);
    }
    // 钟乳石
    for (let x = mouth + 4; x < cols; x += 3 + Math.floor(R() * 6)) { const len = 2 + Math.floor(R() * Math.min(14, gy * 0.25)); for (let k = 0; k < len; k++) { const half = Math.max(0, Math.round((1 - k / len) * 1.6)); P.rect(x - half, k, half * 2 + 1, 1, k === len - 1 ? '#6a6070' : '#4a4252'); } }
    ground(P, lay, ['#3a3242', '#332c3a', '#4a4252', '#241e2a'], {});
    for (let x = 0; x < mouth; x++) for (let y = gy; y < gy + 3; y++) P.set(x, y, '#6a6a72');
    // 地下水潭
    const pc = C(lay, 0.55), py = lay.base + Math.round((lay.rows - lay.base) * 0.4);
    P.ell(pc, py, lay.cols * 0.08, Math.max(3, (lay.rows - lay.base) * 0.25), (nx, ny, x, y) => (nx * nx + ny * ny > 0.78 ? '#4a4252' : A.hash(x, y, 4) < 0.05 ? '#7fe0ff' : ny < -0.3 ? '#2a5a7a' : '#1a3a5a'));
    spot(lay, 'pool', pc, py - 2); spot(lay, 'entrance', C(lay, 0.06) + 6, lay.base + 4);
    // 石笋
    for (const [f, hh] of [[0.83, 14], [0.86, 9], [0.88, 18], [0.2, 10]]) { const sp = new A.Pix(7, SZ(lay, hh)); for (let y = 0; y < sp.h; y++) { const half = Math.round((y / sp.h) * 3); sp.rect(3 - half, y, half * 2 + 1, 1, y % 4 ? '#5a5262' : '#6a6272'); } sp.outline('#241e2a'); put(lay, sp, C(lay, f), lay.base + 1); }
    spot(lay, 'stalagmites', C(lay, 0.86), lay.base + 4);
    // 发光蘑菇
    const ms = new A.Pix(20, 6); for (let i = 0; i < 5; i++) { const x = 2 + i * 4, h2 = 2 + (i % 3); ms.rect(x, 6 - h2, 1, h2, '#d8d0e0'); ms.rect(x - 1, 5 - h2, 3, 1, i % 2 ? '#7fe0ff' : '#b8f0a0'); } put(lay, ms, C(lay, 0.3), lay.base + 3); spot(lay, 'mushrooms', C(lay, 0.3), lay.base + 4);
    for (let i = 0; i < 5; i++) lay.lights.push({ x: C(lay, 0.3) - 9 + i * 4, y: lay.base - 2, w: 1, h: 1, r: 3, col: '#9fe8ff' });
    // 洞顶的萤火虫（发光蕈蚊）
    for (let i = 0; i < 26; i++) { const x = mouth + 10 + Math.floor(R() * (cols - mouth - 20)), y = 2 + Math.floor(R() * gy * 0.35); lay.lights.push({ x, y, w: 1, h: 1, r: 2, col: '#7fe8ff', glow: true }); }
    const br = PP.HOMES.batRoost(SZ(lay, 26), Math.max(8, SZ(lay, 12))); home(lay, 'bat', br.s, C(lay, 0.66), br.s.h + 5, br.door);
    lay.spots.bat_home.r = br.s.h + 26; lay.spots.bat_home.perch = true; lay.spots.bat_home.hang = true;
    const bd = PP.HOMES.bearDen(SZ(lay, 22)); home(lay, 'brownbear', bd.s, C(lay, 0.74), lay.base + 1, bd.door);
    const pc2 = PP.HOMES.burrow(SZ(lay, 20), SZ(lay, 7), ['#4a4252', '#5a5262', '#3a3242', '#1a1620'], [0.5]); home(lay, 'porcupine', pc2.s, C(lay, 0.4), lay.base + 2, pc2.door);
  };
  PP.BIOMES = B;
  PP.BIOME_H = { put, spot, home, C, SZ, mountains, ground, GROUND, PATH, BLADES, T };
})();
