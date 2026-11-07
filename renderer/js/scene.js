// 场景：大家住在森林里，你的小屋就在林子中间。
// 森林 ←→ 湖边 / 草地（走到路牌那儿点一下），森林 ←→ 小屋（点小屋的门）。
// 画面跟着季节·节气、节日、天气、一天中的时刻变化；场景里的装饰可以自己重新布置。
// 显示模式：full 全屏 / band 小场景（任务栏上方一条）/ clear 透明（只有宠物）/ mini 极简（只留主角）
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;

  const SCENES = {
    forest: { name: '森林', out: true },
    cabin: { name: '林间小屋', out: false },
    lake: { name: '湖边', out: true },
    meadow: { name: '草地', out: true },
  };
  // 路牌：在哪个场景、哪一边、通往哪
  const EXITS = { forest: [[-1, 'lake'], [1, 'meadow']], lake: [[1, 'forest']], meadow: [[-1, 'forest']], cabin: [] };
  PP.SCENES = SCENES;
  // 每种动物最喜欢的地方
  PP.SCENE_FAV = { cat: 'cabin', dog: 'meadow', rabbit: 'meadow', hamster: 'cabin', penguin: 'lake', fox: 'forest', dragon: 'forest', frog: 'lake', chick: 'meadow', duck: 'lake', pig: 'meadow', capybara: 'lake', hedgehog: 'forest' };
  PP.MODES = [['full', '全屏场景', '整块屏幕都是森林'], ['band', '小场景', '只占任务栏上方一条'], ['clear', '透明', '只有宠物，没有场景'], ['mini', '极简', '只留主角陪着你']];

  // 装饰：k → [名字, 室内?]
  const DECOR = {
    pine: ['松树'], oak: ['大树'], apple: ['苹果树'], bush: ['灌木'], flower: ['小花'], mushroom: ['蘑菇'], rock: ['石头'], stump: ['树桩'],
    lamp: ['路灯'], bench: ['长椅'], fence: ['栅栏'], hay: ['草垛'], reed: ['芦苇'], lily: ['荷叶'], snowman: ['雪人'], pumpkin: ['南瓜'],
    plant: ['盆栽', 1], flamp: ['落地灯', 1], frame: ['挂画', 1], shelf: ['书架', 1], stool: ['小凳', 1], cushion: ['坐垫', 1],
  };
  PP.DECOR = DECOR;
  function defaultDecor(scene) {
    const L = (k, xs, v) => xs.map((x, i) => ({ k, x, v: v != null ? v : ((i * 37) % 10) / 10 }));
    const winter = PP.season() === 'winter';
    switch (scene) {
      case 'forest': return [
        ...L('pine', [0.035, 0.11, 0.19, 0.3, 0.44, 0.83, 0.9, 0.975]), ...L('oak', [0.07, 0.25, 0.37, 0.76]),
        ...L('bush', [0.15, 0.34, 0.5, 0.94]), ...L('mushroom', [0.22, 0.47, 0.86]), ...L('flower', [0.28, 0.54, 0.79]),
        ...L('rock', [0.41, 0.96]), ...L('stump', [0.52]), ...L('lamp', [0.555]), ...(winter ? L('snowman', [0.72]) : []),
      ];
      case 'meadow': return [
        ...L('apple', [0.14, 0.72]), ...L('oak', [0.93]), ...L('bush', [0.05, 0.4, 0.86]), ...L('fence', [0.24, 0.29, 0.34, 0.39]),
        ...L('hay', [0.6, 0.65]), ...L('flower', [0.09, 0.2, 0.31, 0.45, 0.52, 0.57, 0.78, 0.82, 0.9]), ...L('rock', [0.98]), ...L('bench', [0.48]),
      ];
      case 'lake': return [
        ...L('pine', [0.02, 0.97]), ...L('reed', [0.06, 0.1, 0.62, 0.67, 0.9]), ...L('lily', [0.22, 0.31, 0.47, 0.76, 0.82]),
        ...L('rock', [0.14, 0.86]), ...L('bench', [0.56]), ...L('flower', [0.18, 0.72]),
      ];
      case 'cabin': return [...L('plant', [0.1, 0.93]), ...L('frame', [0.14, 0.52]), ...L('shelf', [0.18]), ...L('flamp', [0.88]), ...L('stool', [0.66]), ...L('cushion', [0.46])];
    }
    return [];
  }
  const settings = () => G.save.settings;
  const decorOf = (scene) => settings().decor[scene] || defaultDecor(scene);

  // ---------- 几何 ----------
  function mode() { return (G.save && settings().mode) || 'band'; }
  function active() { const m = mode(); return m === 'full' || m === 'band'; }
  function geo() {
    const m = mode();
    // 全屏：户外放大 2 倍；小屋里放大 3.5 倍（家具更大，房间更满）
    if (m === 'full') return { m, y0: 0, H: G.H, u: Math.max(2, G.S) * ((G.save && settings().scene) === 'cabin' ? 3.5 : 2) };
    if (m !== 'band') return null;
    const u = Math.max(2, G.S);
    const H = Math.round(Math.max(34 * u, [0, 72, 120, 180][settings().bgH || 2] * U.clamp(G.S / 2, 0.75, 1.5)));
    return { m, y0: G.H - H, H, u };
  }
  function height() { const g = geo(); return g ? g.H : 0; }
  // 小场景模式下场景条有多高（不管现在是什么模式，按钮都按这个位置放，切换模式时按钮不会跳走）
  function bandHeight() { const u = Math.max(2, G.S); return Math.round(Math.max(34 * u, [0, 72, 120, 180][(G.save && settings().bgH) || 2] * U.clamp(G.S / 2, 0.75, 1.5))); }

  // 固定种子的伪随机
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // ---------- 静态层（缓存在离屏画布上，季节/节日/布置变了才重画） ----------
  let cache = null, key = '', L = null; // L: 布局信息（地面行、热点、灯、装饰框…）
  function build(scene, g, env) {
    const W = G.W, u = g.u, H = g.H;
    const cols = Math.ceil(W / u), rows = Math.ceil(H / u);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(Math.round(x) * u, Math.round(y) * u, w * u, h * u); };
    const R = rng(cols * 31 + rows + scene.length * 7);
    const season = env.season, hol = env.holiday && env.holiday.id;
    const full = g.m === 'full';
    const lay = { cols, rows, hots: [], lights: [], lanterns: [], xmas: [], boxes: [], season, hol, scene, chimney: null, win: null, water: null, fire: null, monitor: null };

    // 顶部抖动渐隐，和桌面自然衔接（小场景模式）
    const fade = (y0, n) => { if (full) return; c.save(); c.globalCompositeOperation = 'destination-out'; for (let k = 0; k < n; k++) for (let x = 0; x < cols; x++) if ((x + k) % (n - k + 1) !== 0) c.fillRect(x * u, (y0 + k) * u, u, u); c.restore(); };

    if (SCENES[scene].out) {
      const gh = Math.max(5, Math.round(rows * (full ? 0.13 : 0.24)));
      const gy = rows - gh;
      const base = gy + Math.max(2, Math.round(gh * 0.4));
      lay.gy = gy; lay.base = base;
      const P = palette(season);
      // 远景
      if (full) {
        // 远山
        for (const [hh, col, f] of [[0.34, P.mtn1, 53], [0.24, P.mtn2, 31]]) {
          for (let x = 0; x < cols; x++) {
            const h = Math.round(rows * hh + Math.sin(x / f) * rows * 0.05 + Math.sin(x / (f / 3.1)) * rows * 0.015);
            px(x, gy - h, col, 1, h);
            if (season === 'winter' && hh > 0.3) px(x, gy - h, '#ffffff', 1, Math.max(1, Math.round(rows * 0.012)));
          }
        }
      }
      if (scene === 'forest' || scene === 'lake') {
        const top = scene === 'lake' ? Math.round(rows * (full ? 0.55 : 0.12)) : 0;
        for (const [layer, colr, hmin, hmax, step] of [[0, P.far1, 0.4, 0.75, 7], [1, P.far2, 0.5, 0.9, 11]]) {
          const fb = scene === 'lake' ? Math.round(rows * (full ? 0.72 : 0.42)) : gy + 1;
          const span = Math.min(fb - top, full ? rows * 0.3 : rows);
          for (let x = -4; x < cols + 4; x += step + Math.floor(R() * 5)) {
            const th = Math.round(span * (hmin + R() * (hmax - hmin)));
            for (let k = 0; k < th; k++) {
              const half = Math.max(0, Math.round((k / th) * 4 + (k % 4 === 0 ? 1 : 0)));
              px(x - half, fb - th + k, colr, half * 2 + 1, 1);
              if (season === 'winter' && k % 4 === 1) for (let dx = -half; dx <= half; dx += 2) px(x + dx, fb - th + k, layer ? '#dfe8f2' : '#ffffff');
            }
          }
        }
      } else if (scene === 'meadow') {
        // 起伏的小山坡
        for (const [hh, col, f] of [[0.42, P.hill1, 41], [0.28, P.hill2, 23]]) {
          const span = full ? rows * 0.25 : rows;
          for (let x = 0; x < cols; x++) { const h = Math.round(span * hh + Math.sin(x / f + hh * 9) * span * 0.08); px(x, gy - h + 1, col, 1, h); }
        }
      }
      // 湖面
      if (scene === 'lake') {
        const wy0 = Math.round(rows * (full ? 0.72 : 0.42)), wy1 = gy + 1;
        const ice = season === 'winter';
        for (let y = wy0; y < wy1; y++) px(0, y, ice ? (y % 3 ? '#cfe6f5' : '#e6f3fb') : (y === wy0 ? '#9fd8f2' : (y - wy0) % 4 === 1 ? '#58a9d6' : '#4b9bcc'), cols, 1);
        if (ice) for (let i = 0; i < cols / 20; i++) { const x = R() * cols, y = wy0 + 1 + R() * (wy1 - wy0 - 2); px(x, y, '#ffffff', 3, 1); px(x + 2, y + 1, '#a9cbe0', 2, 1); }
        lay.water = { y0: wy0, y1: wy1, ice };
        // 小码头
        const dx = Math.round(cols * 0.4), dw = Math.round(cols * 0.12);
        for (let x = dx; x < dx + dw; x++) { px(x, wy1 - 2, x % 4 === 0 ? '#7a5234' : '#9a6a44'); px(x, wy1 - 1, '#6a4428'); }
        for (let x = dx; x < dx + dw; x += 6) px(x, wy1 - 2, '#5a3a24', 1, 4);
      }
      // 地面
      for (let y = gy; y < rows; y++) px(0, y, y - gy < 1 ? P.g1 : P.g2, cols, 1);
      for (let i = 0; i < cols * gh / 9; i++) { const x = Math.floor(R() * cols), y = gy + 1 + Math.floor(R() * (gh - 1)); px(x, y, P.g3); }
      // 小路（森林里通往小屋）
      if (scene === 'forest') for (let x = 0; x < cols; x++) { const y = base + 1 + Math.round(Math.sin(x / 30) * 0.8); if (R() < 0.9) px(x, y, P.path, 1, 2); }
      // 草叶 / 雪堆
      for (let x = 0; x < cols; x += 2 + Math.floor(R() * 3)) {
        if (season === 'winter') { if (R() < 0.25) px(x, gy - 1, '#ffffff', 3, 1); continue; }
        const h = 1 + Math.floor(R() * 2);
        for (let k = 0; k < h; k++) px(x, gy - 1 - k, k === h - 1 ? P.blade2 : P.blade);
      }
      outdoorDetail(px, lay, R, scene, full);
      fade(0, 4);

      // 装饰（大的先画，小的后画）
      const list = decorOf(scene).map((d, i) => ({ ...d, i })).sort((a, b) => (BIG[b.k] || 0) - (BIG[a.k] || 0) || a.x - b.x);
      const after = [];
      for (const d of list) {
        if (scene === 'forest' && !BIG[d.k]) { after.push(d); continue; }
        drawDecor(c, px, d, lay, R, full);
      }
      if (scene === 'forest') drawCabinOutside(px, lay, Math.round(cols * 0.62), base, env);
      for (const d of after) drawDecor(c, px, d, lay, R, full);
      // 路牌
      for (const [side, to] of EXITS[scene]) drawSign(px, lay, side, to, base);
    } else {
      buildCabinInside(px, lay, env, full, R);
      fade(0, 4);
    }
    return { cv, lay };
  }
  const BIG = { pine: 3, oak: 3, apple: 3, shelf: 2, hay: 2, fence: 1, lamp: 1, bench: 1, flamp: 1, frame: 1 };

  function palette(season) {
    const base = {
      spring: { g1: '#a5df7a', g2: '#7cc35a', g3: '#6ab04c', blade: '#7cc35a', blade2: '#b7ec8a', far1: '#8db98e', far2: '#5f8a64', hill1: '#9fd27f', hill2: '#7cbf62', mtn1: '#a9b8d8', mtn2: '#8ea5c8', path: '#c9a878' },
      summer: { g1: '#7cc35a', g2: '#5fae4a', g3: '#4c9640', blade: '#5fae4a', blade2: '#8fd16a', far1: '#5f8a64', far2: '#3f6b4a', hill1: '#6fbf55', hill2: '#55a845', mtn1: '#8fa8cc', mtn2: '#7690b8', path: '#c19a68' },
      autumn: { g1: '#d6c070', g2: '#b9a24a', g3: '#a68a3a', blade: '#c4a24a', blade2: '#e2c46a', far1: '#c9894a', far2: '#9a5a32', hill1: '#d4b05a', hill2: '#c0903f', mtn1: '#b7a9c4', mtn2: '#9d8fae', path: '#b08a5a' },
      winter: { g1: '#ffffff', g2: '#eef4fb', g3: '#d8e4f2', blade: '#e6eef8', blade2: '#ffffff', far1: '#9fb3c9', far2: '#7d93ad', hill1: '#f2f6fb', hill2: '#e2eaf4', mtn1: '#c5d2e4', mtn2: '#aebfd6', path: '#d8d2c8' },
    };
    return base[season];
  }

  function drawDecor(c, px, d, lay, R, full) {
    const { cols, base, season } = lay;
    const x = Math.round(d.x * cols), v = d.v || 0;
    const w = season === 'winter', sp = season === 'spring', au = season === 'autumn';
    const box = (x0, y0, x1, y1) => lay.boxes.push({ i: d.i, x0, y0, x1, y1 });
    const lily = d.k === 'lily';
    const b = lily && lay.water ? Math.round(lay.water.y0 + (lay.water.y1 - lay.water.y0) * (0.35 + v * 0.4)) : base;
    switch (d.k) {
      case 'pine': {
        const h = Math.round((full ? 44 : Math.min(lay.rows * 0.78, 46)) * (0.7 + v * 0.4));
        const g1 = w ? '#3a6550' : au ? '#3f6f48' : sp ? '#4f8f5a' : '#3d7a4a', g2 = w ? '#2c5040' : '#2e5e3a';
        px(x, b - 3, '#5a3d2b', 2, 4);
        const tiers = 3, th = Math.floor((h - 3) / tiers);
        for (let t = 0; t < tiers; t++) for (let k = 0; k < th + 2; k++) {
          const y = b - h + t * th + k, half = Math.round((k / (th + 2)) * (2 + t * 1.6 + h * 0.07));
          px(x + 1 - half, y, g1, half + 1, 1); px(x + 1, y, g2, half + 1, 1);
          if (w && k <= 1) px(x + 1 - half, y, '#ffffff', half * 2 + 1, 1);
          if (k === th + 1) lay.xmas.push([x + 1 - half, y], [x + 1 + half, y], [x + 1, y - 1]);
        }
        lay.lanterns.push([x + 4, b - Math.round(h * 0.5)]);
        lay.treeTop = lay.treeTop && lay.treeTop[1] < b - h ? lay.treeTop : [x + 1, b - h];
        box(x - 8, b - h, x + 10, b + 1); break;
      }
      case 'oak': case 'apple': {
        const h = Math.round((full ? 36 : Math.min(lay.rows * 0.66, 38)) * (0.75 + v * 0.35)), r = Math.round(h * 0.34);
        const cx = x + 1, cy = b - h + r;
        px(x, b - Math.round(h * 0.45), '#6b4a30', 3, Math.round(h * 0.45) + 1);
        if (w) {
          for (const [dx, len] of [[-1, r], [1, r], [0, r + 2]]) for (let k = 0; k < len; k++) { const xx = cx + Math.round(dx * k * 0.7), yy = b - Math.round(h * 0.45) - k; px(xx, yy, '#6b4a30'); if (k === len - 1) px(xx, yy - 1, '#ffffff'); }
        } else {
          for (let yy = -r; yy <= r; yy++) for (let xx = -r - 1; xx <= r + 1; xx++) {
            const dd = (xx * xx) / ((r + 1) * (r + 1)) + (yy * yy) / (r * r);
            if (dd > 1) continue;
            if (dd > 0.82 && (xx + yy) % 2) continue;
            let col = au ? ['#e8913a', '#d9662a', '#e8c03a', '#c8552a'][(xx * 7 + yy * 3 + 99) % 4] : sp ? '#7cc35a' : '#4f9a45';
            if (!au && yy > r * 0.3 && xx > 0) col = sp ? '#62ad47' : '#3f8538';
            px(cx + xx, cy + yy, col);
            if (sp && d.k === 'oak' && v < 0.6 && (xx * 5 + yy * 11) % 9 === 0) px(cx + xx, cy + yy, '#ffc4d8');
            if (d.k === 'apple' && (season === 'summer' || au) && (xx * 7 + yy * 5) % 13 === 0) px(cx + xx, cy + yy, '#e33b3b');
          }
          lay.lanterns.push([cx - r + 1, cy + Math.round(r * 0.6)], [cx + r - 1, cy + Math.round(r * 0.5)]);
        }
        box(cx - r - 2, b - h, cx + r + 2, b + 1); break;
      }
      case 'bush': {
        const r = 3 + Math.round(v * 2);
        for (let yy = -r; yy <= 0; yy++) for (let xx = -r - 2; xx <= r + 2; xx++) {
          if ((xx * xx) / ((r + 2) * (r + 2)) + (yy * yy) / (r * r) > 1) continue;
          px(x + xx, b + yy, w ? (yy === -r || yy === -r + 1 ? '#ffffff' : '#5d7d68') : au ? (xx > 0 ? '#b8552a' : '#d9662a') : (xx > 0 ? '#3f8538' : '#55a845'));
        }
        if (sp && v > 0.4) { px(x - 1, b - r + 1, '#fff2a8'); px(x + 2, b - r + 2, '#ffffff'); }
        box(x - r - 3, b - r - 1, x + r + 3, b + 1); break;
      }
      case 'flower': {
        if (w) { px(x, b - 1, '#ffffff', 2, 1); box(x - 2, b - 3, x + 3, b + 1); break; }
        const col = au ? '#c08a3a' : ['#ffffff', '#ffd84a', '#ff8fb0', '#b98cff', '#ff6b5a'][Math.floor(v * 5)];
        px(x, b - 2, '#4c9640', 1, 2); px(x, b - 4, col); px(x - 1, b - 3, col); px(x + 1, b - 3, col); px(x, b - 3, au ? '#8a5a2a' : '#ffcf33');
        box(x - 2, b - 5, x + 3, b + 1); break;
      }
      case 'mushroom': {
        if (w) { box(x - 2, b - 3, x + 3, b + 1); break; }
        px(x, b - 2, '#f4ead8', 1, 2); px(x - 1, b - 3, '#d9342b', 3, 1); px(x - 2, b - 2, '#d9342b'); px(x + 2, b - 2, '#d9342b'); px(x, b - 3, '#ffffff');
        box(x - 3, b - 4, x + 4, b + 1); break;
      }
      case 'rock': {
        const r = 2 + Math.round(v * 2);
        for (let xx = -r; xx <= r; xx++) { const hh = Math.round(r * 0.8 * Math.sqrt(1 - (xx * xx) / ((r + 1) * (r + 1)))) + 1; px(x + xx, b - hh + 1, xx > 0 ? '#8a8a96' : '#a4a4b0', 1, hh); if (w) px(x + xx, b - hh + 1, '#ffffff'); }
        box(x - r - 1, b - r - 1, x + r + 2, b + 1); break;
      }
      case 'stump': px(x - 2, b - 3, '#7a5234', 5, 4); px(x - 2, b - 3, w ? '#ffffff' : '#c99a6a', 5, 1); px(x, b - 3, '#9a6a44'); box(x - 3, b - 4, x + 4, b + 1); break;
      case 'lamp': {
        px(x, b - 11, '#3a3a44', 1, 12); px(x - 1, b - 14, '#3a3a44', 3, 1); px(x - 1, b - 13, '#ffe08a', 3, 2); px(x - 1, b - 11, '#3a3a44', 3, 1);
        if (w) px(x - 1, b - 15, '#ffffff', 3, 1);
        lay.lights.push({ x: x - 1, y: b - 13, w: 3, h: 2, r: 7 });
        box(x - 3, b - 15, x + 4, b + 1); break;
      }
      case 'bench': px(x - 4, b - 3, '#9a6a44', 9, 1); px(x - 4, b - 5, '#7a5234', 9, 1); px(x - 3, b - 2, '#5a3a24', 1, 3); px(x + 3, b - 2, '#5a3a24', 1, 3); if (w) px(x - 4, b - 4, '#ffffff', 9, 1); box(x - 5, b - 6, x + 6, b + 1); break;
      case 'fence': for (let k = 0; k < 3; k++) px(x + k * 4, b - 5, w ? '#e6d8c8' : '#c9a878', 1, 6); px(x - 1, b - 4, '#a8865a', 11, 1); px(x - 1, b - 2, '#a8865a', 11, 1); if (w) for (let k = 0; k < 3; k++) px(x + k * 4, b - 6, '#ffffff'); box(x - 2, b - 7, x + 11, b + 1); break;
      case 'hay': {
        for (let yy = 0; yy < 7; yy++) { const hw = Math.round(5 * Math.sqrt(1 - ((yy - 6) * (yy - 6)) / 49)) + 1; px(x - hw, b - 7 + yy, yy % 2 ? '#e2b84a' : '#d4a43a', hw * 2 + 1, 1); }
        if (w) px(x - 3, b - 7, '#ffffff', 7, 1);
        box(x - 7, b - 8, x + 8, b + 1); break;
      }
      case 'reed': for (let k = 0; k < 3; k++) { const hh = 7 + ((k * 3 + Math.round(v * 5)) % 4); px(x + k * 2, b - hh, w ? '#b9a88a' : '#5f9a4a', 1, hh); px(x + k * 2, b - hh - 2, '#7a4a2a', 1, 2); } box(x - 1, b - 13, x + 6, b + 1); break;
      case 'lily': if (lay.water && lay.water.ice) { box(x - 3, b - 1, x + 4, b + 2); break; } px(x - 2, b, '#4c9640', 5, 1); px(x - 1, b - 1, '#5fae4a', 3, 1); if (season === 'summer' || sp) { px(x, b - 2, '#ff9fc0'); px(x, b - 3, '#ffd0e0'); } box(x - 3, b - 4, x + 4, b + 2); break;
      case 'snowman': px(x - 3, b - 6, '#ffffff', 7, 6); px(x - 2, b - 10, '#ffffff', 5, 4); px(x - 1, b - 9, '#222'); px(x + 1, b - 9, '#222'); px(x + 2, b - 8, '#ff8a2a', 2, 1); px(x - 2, b - 11, '#3a3a44', 5, 1); px(x - 1, b - 13, '#3a3a44', 3, 2); px(x - 3, b - 6, '#e33b3b', 7, 1); box(x - 4, b - 14, x + 5, b + 1); break;
      case 'pumpkin': px(x - 2, b - 4, '#ff8a2a', 5, 4); px(x - 3, b - 3, '#e8751a', 1, 2); px(x + 3, b - 3, '#e8751a', 1, 2); px(x, b - 5, '#4c7a30'); if (lay.hol === 'halloween') { px(x - 1, b - 3, '#3a2010'); px(x + 1, b - 3, '#3a2010'); px(x - 1, b - 2, '#3a2010', 3, 1); lay.lights.push({ x: x - 1, y: b - 3, w: 3, h: 2, r: 4, col: '#ffb040' }); } box(x - 4, b - 6, x + 5, b + 1); break;
      // 室内
      case 'plant': px(x - 2, b - 4, '#b8653a', 5, 4); px(x - 2, b - 4, '#d07a48', 5, 1); for (let k = 0; k < 7; k++) px(x - 3 + (k % 4) * 2, b - 6 - (k % 3) * 2, k % 2 ? '#3f8538' : '#55a845', 1, 3); box(x - 4, b - 11, x + 5, b + 1); break;
      case 'flamp': px(x, b - 16, '#3a3a44', 1, 16); px(x - 2, b - 1, '#3a3a44', 5, 1); px(x - 3, b - 20, '#f4d9a0', 7, 4); px(x - 2, b - 21, '#f4d9a0', 5, 1); lay.lights.push({ x: x - 3, y: b - 20, w: 7, h: 4, r: 14, col: '#ffd890' }); box(x - 4, b - 22, x + 5, b + 1); break;
      case 'frame': { const fy = Math.round(lay.rows * 0.2), fw = 8 + Math.round(v * 4); px(x - 1, fy - 1, '#6b4a30', fw + 2, 9); px(x, fy, ['#9fd8f2', '#ffd0e0', '#c8e6a0'][Math.floor(v * 3)], fw, 7); px(x + 1, fy + 4, '#5fae4a', fw - 2, 3); px(x + fw - 3, fy + 1, '#ffd84a', 2, 2); box(x - 2, fy - 2, x + fw + 2, fy + 9); break; }
      case 'shelf': { const sh = Math.min(lay.rows - 6, 24); px(x - 6, b - sh, '#7a5234', 13, sh); for (let k = 0; k < 4; k++) { const yy = b - sh + 2 + k * Math.floor(sh / 4); px(x - 5, yy + Math.floor(sh / 4) - 2, '#5a3a24', 11, 1); for (let j = 0; j < 9; j += 2) px(x - 5 + j, yy, ['#e33b3b', '#4b9bcc', '#ffcf33', '#5fae4a', '#b98cff'][(j + k) % 5], 1 + (j % 3 === 0), Math.floor(sh / 4) - 3); } box(x - 7, b - sh - 1, x + 8, b + 1); break; }
      case 'stool': px(x - 3, b - 4, '#b8865a', 7, 2); px(x - 2, b - 2, '#7a5234', 1, 3); px(x + 2, b - 2, '#7a5234', 1, 3); box(x - 4, b - 5, x + 5, b + 1); break;
      case 'cushion': px(x - 4, b - 2, '#e88aa8', 9, 2); px(x - 3, b - 3, '#f5a8be', 7, 1); box(x - 5, b - 4, x + 6, b + 1); break;
    }
  }

  function drawCabinOutside(px, lay, cx, b, env) {
    const w = lay.season === 'winter', hol = lay.hol;
    const W2 = 17, wallH = 15, roofH = 10;
    const x0 = cx - W2, x1 = cx + W2;
    // 墙（原木）
    for (let y = b - wallH; y <= b; y++) px(x0, y, (y - (b - wallH)) % 3 === 0 ? '#8a5a3a' : '#a8703f', W2 * 2 + 1, 1);
    for (let y = b - wallH; y <= b; y += 3) { px(x0 - 1, y, '#6b4428', 1, 2); px(x1 + 1, y, '#6b4428', 1, 2); }
    // 屋顶
    for (let k = 0; k < roofH; k++) { const half = W2 + 3 - Math.round(((roofH - k) / roofH) * (W2 - 2)); px(cx - half, b - wallH - roofH + k, k % 2 ? '#7a3328' : '#8e3d30', half * 2 + 1, 1); }
    if (w) for (let k = 0; k < 3; k++) { const half = W2 + 3 - Math.round(((roofH - k) / roofH) * (W2 - 2)); px(cx - half, b - wallH - roofH + k, '#ffffff', half * 2 + 1, 1); }
    px(cx - W2 - 3, b - wallH, w ? '#ffffff' : '#6a2c22', W2 * 2 + 7, 1);
    // 烟囱
    const chx = cx + 9; px(chx, b - wallH - roofH - 2, '#8a8a96', 4, 7); px(chx - 1, b - wallH - roofH - 3, '#6e6e7a', 6, 1); if (w) px(chx - 1, b - wallH - roofH - 4, '#ffffff', 6, 1);
    lay.chimney = [chx + 2, b - wallH - roofH - 4];
    // 门
    const dx = cx - 9; px(dx - 1, b - 11, '#5a3a24', 8, 12); px(dx, b - 10, '#c48a52', 6, 11); px(dx + 4, b - 5, '#ffd84a');
    for (let y = b - 10; y <= b; y += 2) px(dx, y, '#b07a46', 6, 1);
    // 窗
    const wx = cx + 4; px(wx - 1, b - 12, '#5a3a24', 9, 7); px(wx, b - 11, '#2a3550', 7, 5); px(wx + 3, b - 11, '#5a3a24', 1, 5); px(wx, b - 9, '#5a3a24', 7, 1);
    if (w) px(wx - 1, b - 13, '#ffffff', 9, 1);
    lay.win = { x: wx, y: b - 11, w: 7, h: 5 };
    lay.lights.push({ x: wx, y: b - 11, w: 7, h: 5, r: 6, win: true });
    // 名牌
    px(cx - 4, b - wallH - 3, '#e2c49a', 9, 3); px(cx - 3, b - wallH - 2, '#8a5a3a', 7, 1);
    // 节日装扮
    if (hol === 'spring' || hol === 'lantern') {
      px(dx - 3, b - 11, '#d9262b', 1, 9); px(dx + 8, b - 11, '#d9262b', 1, 9); px(dx - 1, b - 13, '#d9262b', 8, 1);
      px(dx + 2, b - 8, '#d9262b', 2, 2); px(dx + 2, b - 8, '#ffd84a');
      lay.lanterns.push([x0 + 2, b - wallH + 1], [x1 - 2, b - wallH + 1]);
    }
    if (hol === 'xmas') { px(dx + 1, b - 9, '#2f8a3a', 4, 1); px(dx + 1, b - 6, '#2f8a3a', 4, 1); px(dx + 1, b - 9, '#2f8a3a', 1, 4); px(dx + 4, b - 9, '#2f8a3a', 1, 4); px(dx + 2, b - 6, '#e33b3b', 2, 1); for (let x = x0 - 2; x <= x1 + 2; x += 3) lay.xmas.push([x, b - wallH]); }
    lay.hots.push({ x0: dx - 1, y0: b - 11, x1: dx + 7, y1: b + 1, tip: `进屋（${settings().ownerName ? settings().ownerName + '的' : '你的'}小屋）`, go: 'cabin' });
    lay.cabin = { x0, x1, y0: b - wallH - roofH, b, dx };
  }

  function drawSign(px, lay, side, to, b) {
    const x = side < 0 ? 2 : lay.cols - 15;
    px(x + 6, b - 9, '#6b4a30', 1, 10);
    px(x, b - 11, '#c99a6a', 13, 4); px(x, b - 11, '#e2b88a', 13, 1); px(x, b - 8, '#9a6a44', 13, 1);
    if (side < 0) { px(x - 1, b - 10, '#c99a6a', 1, 2); } else { px(x + 13, b - 10, '#c99a6a', 1, 2); }
    if (lay.season === 'winter') px(x, b - 12, '#ffffff', 13, 1);
    lay.hots.push({ x0: x - 1, y0: b - 12, x1: x + 14, y1: b + 1, tip: `${side < 0 ? '← ' : ''}去${SCENES[to].name}${side > 0 ? ' →' : ''}`, go: to, sign: { x, y: b - 11, side, label: SCENES[to].name } });
  }

  // ---------- 小屋里面：温馨一点 ----------
  function buildCabinInside(px, lay, env, full, R) {
    const { cols, rows } = lay;
    const fy = Math.round(rows * 0.7), b = fy + Math.max(2, Math.round((rows - fy) * 0.45));
    lay.gy = fy; lay.base = b; lay.bulbs = []; lay.candles = [];
    const wainH = Math.max(4, Math.round(fy * 0.28));
    // 上半墙：暖色木板，偶尔有木节
    for (let y = 0; y < fy; y++) px(0, y, (y % 6 === 0) ? '#c8996a' : '#d6a878', cols, 1);
    for (let x = 0; x < cols; x += 14) px(x, 0, '#c08f60', 1, fy - wainH);
    for (let i = 0; i < cols / 18; i++) { const x = Math.floor(R() * cols), y = 4 + Math.floor(R() * Math.max(1, fy - wainH - 8)); px(x, y, '#b9875a', 2, 1); px(x, y + 1, '#c8996a', 2, 1); }
    // 下半墙：深色护墙板 + 线脚
    for (let y = fy - wainH; y < fy - 1; y++) px(0, y, '#9a6440', cols, 1);
    for (let x = 0; x < cols; x += 6) px(x, fy - wainH + 1, '#8a5634', 1, wainH - 3);
    px(0, fy - wainH - 1, '#7a4a2a', cols, 1); px(0, fy - wainH - 2, '#e8c49a', cols, 1);
    px(0, fy - 2, '#6b4428', cols, 2);
    // 天花板横梁 + 一串暖黄小灯
    px(0, 0, '#6b4428', cols, 3); px(0, 3, '#5a3a24', cols, 1);
    for (let x = 0; x < cols; x += 46) px(x, 0, '#4e3020', 3, 5);
    for (let x0 = 0; x0 < cols; x0 += 46) {
      for (let k = 0; k <= 46; k += 2) { const yy = 4 + Math.round(Math.sin((k / 46) * Math.PI) * 4); px(x0 + k, yy, '#3a2a20'); if (k % 6 === 3) lay.bulbs.push([x0 + k, yy + 1]); }
    }
    // 地板 + 木纹
    for (let y = fy; y < rows; y++) px(0, y, (y - fy) % 3 === 0 ? '#7a4a2a' : '#9a6440', cols, 1);
    for (let y = fy + 1; y < rows; y += 3) for (let x = (y * 7) % 20; x < cols; x += 20) px(x, y, '#6a3f22', 1, 2);
    // 椭圆花纹地毯
    const rcx = Math.round(cols * 0.47), rw = Math.round(cols * 0.15), rh = Math.max(2, Math.round((rows - fy) * 0.38));
    for (let yy = -rh; yy <= rh; yy++) for (let xx = -rw; xx <= rw; xx++) {
      const d = (xx * xx) / (rw * rw) + (yy * yy) / (rh * rh); if (d > 1) continue;
      const ring = d > 0.8 ? '#a8445e' : d > 0.6 ? '#f2c4a0' : d > 0.35 ? '#d9677e' : (xx + yy) % 4 === 0 ? '#ffe0b0' : '#e88aa0';
      px(rcx + xx, b + yy - 1, ring);
    }
    // 门（回森林）+ 门垫 + 挂钩上的围巾
    const dx = 3, dh = Math.min(Math.round(rows * 0.5), 26);
    px(dx - 1, b - dh - 1, '#5a3a24', 12, dh + 2); px(dx, b - dh, '#a8703f', 10, dh); px(dx + 8, b - Math.round(dh / 2), '#ffd84a');
    for (let y = b - dh; y < b; y += 3) px(dx, y, '#8a5a3a', 10, 1);
    px(dx - 1, b, '#c9a06a', 13, 1); px(dx, b + 1, '#b08a5a', 11, 1);
    px(dx + 14, b - dh + 2, '#3a2a20', 4, 1); px(dx + 14, b - dh + 3, '#e33b3b', 2, 7); px(dx + 16, b - dh + 3, '#ffffff', 1, 6);
    lay.hots.push({ x0: dx - 1, y0: b - dh - 1, x1: dx + 11, y1: b + 1, tip: '出门（回森林）', go: 'forest' });
    // 窗户 + 窗台上的小盆栽和蜡烛
    const wh = Math.min(Math.round(rows * 0.34), 18), ww = Math.round(wh * 1.6), wx = Math.round(cols * 0.3) - Math.round(ww / 2), wy = Math.max(6, Math.round(fy * 0.22));
    px(wx - 2, wy - 2, '#6b4428', ww + 4, wh + 4); px(wx - 3, wy + wh + 1, '#8a5a3a', ww + 6, 2);
    px(wx + 2, wy + wh - 2, '#b8653a', 3, 3); px(wx + 1, wy + wh - 5, '#55a845', 5, 3); px(wx + 3, wy + wh - 6, '#3f8538', 1, 1);
    px(wx + ww - 4, wy + wh - 2, '#fff4e0', 2, 3); lay.candles.push([wx + ww - 4, wy + wh - 3]);
    lay.win = { x: wx, y: wy, w: ww, h: wh, inside: true };
    // 墙上的置物架：罐子、书、垂下来的绿萝
    const sx = Math.round(cols * 0.44), sw = 22, sy = Math.max(8, Math.round(fy * 0.3));
    px(sx, sy, '#7a4a2a', sw, 2); px(sx + 2, sy + 2, '#5a3a24', 1, 2); px(sx + sw - 3, sy + 2, '#5a3a24', 1, 2);
    px(sx + 1, sy - 4, '#9fd8f2', 3, 4); px(sx + 1, sy - 5, '#c08a5e', 3, 1);
    px(sx + 5, sy - 3, '#ffcf33', 3, 3); px(sx + 5, sy - 4, '#e8c49a', 3, 1);
    for (let k = 0; k < 4; k++) px(sx + 10 + k * 2, sy - 5 + (k % 2), ['#e33b3b', '#4b9bcc', '#7cc35a', '#b98cff'][k], 2, 5 - (k % 2));
    px(sx + 18, sy - 3, '#b8653a', 3, 3); for (let k = 0; k < 7; k++) px(sx + 18 + (k % 3) - 1, sy - 5 + k, k % 2 ? '#3f8538' : '#55a845');
    // 书桌 + 你的电脑 + 台灯 + 马克杯 + 椅子
    const kx = Math.round(cols * 0.6), kw = 20;
    px(kx, b - 8, '#8a5a3a', kw, 2); px(kx + 1, b - 6, '#6b4428', 1, 7); px(kx + kw - 2, b - 6, '#6b4428', 1, 7);
    px(kx + 6, b - 17, '#2a2a33', 9, 7); px(kx + 7, b - 16, '#1a2a40', 7, 5); px(kx + 10, b - 10, '#2a2a33', 1, 2); px(kx + 8, b - 9, '#2a2a33', 5, 1);
    px(kx + 16, b - 10, '#ffffff', 2, 2); px(kx + 16, b - 11, '#e8e0d0', 2, 1); lay.cup = [kx + 16, b - 11];
    px(kx + 2, b - 9, '#3a3a44', 1, 1); px(kx + 2, b - 13, '#3a3a44', 1, 4); px(kx + 1, b - 15, '#e8a838', 4, 2);
    lay.lights.push({ x: kx + 1, y: b - 14, w: 4, h: 1, r: 8, col: '#ffd890' });
    px(kx + 7, b - 5, '#b8865a', 7, 1); px(kx + 7, b - 11, '#9a6a44', 1, 7); px(kx + 8, b - 4, '#7a5234', 1, 4); px(kx + 12, b - 4, '#7a5234', 1, 4);
    lay.monitor = { x: kx + 7, y: b - 16, w: 7, h: 5 };
    // 壁炉 + 壁炉架（蜡烛、时钟） + 柴火堆
    const fx = Math.round(cols * 0.78), fw = 20, fh = Math.min(Math.round(rows * 0.5), 22);
    px(fx, b - fh, '#9a9aa6', fw, fh); for (let y = b - fh; y < b; y += 3) for (let x = fx + ((y / 3) % 2 ? 0 : 2); x < fx + fw; x += 5) px(x, y, '#82828e', 4, 1);
    px(fx - 2, b - fh - 2, '#7a5234', fw + 4, 2);
    px(fx + 4, b - Math.round(fh * 0.55), '#2a1a14', fw - 8, Math.round(fh * 0.55));
    px(fx + 6, b - 2, '#5a3a24', fw - 12, 2);
    lay.fire = { x: fx + 5, y: b - Math.round(fh * 0.55) + 1, w: fw - 10, h: Math.round(fh * 0.55) - 3 };
    px(fx + 1, b - fh - 5, '#fff4e0', 2, 3); px(fx + fw - 3, b - fh - 4, '#fff4e0', 2, 2); lay.candles.push([fx + 1, b - fh - 6], [fx + fw - 3, b - fh - 5]);
    lay.clock = { x: fx + Math.round(fw / 2), y: Math.max(7, b - fh - 11), r: 4 };
    for (let k = 0; k < 3; k++) for (let j = 0; j < 3 - k; j++) { px(fx + fw + 3 + j * 3 + k, b - 3 - k * 2, '#8a5634', 3, 2); px(fx + fw + 3 + j * 3 + k, b - 3 - k * 2, '#c99a6a', 1, 2); }
    // 扶手椅 + 毯子 + 小茶几（茶杯会冒热气，书）
    const ax = fx - 16;
    px(ax, b - 9, '#b8453a', 10, 6); px(ax - 1, b - 12, '#a03a30', 2, 9); px(ax + 9, b - 12, '#a03a30', 2, 9); px(ax, b - 13, '#a03a30', 10, 4);
    for (let k = 0; k < 10; k += 3) px(ax + k, b - 9, '#e8c03a', 1, 6);
    px(ax + 1, b - 8, '#f2e6c8', 5, 3); px(ax, b - 3, '#5a3a24', 1, 3); px(ax + 9, b - 3, '#5a3a24', 1, 3);
    px(ax - 7, b - 6, '#8a5a3a', 5, 1); px(ax - 6, b - 5, '#6b4428', 1, 5); px(ax - 4, b - 5, '#6b4428', 1, 5);
    px(ax - 6, b - 8, '#ffffff', 2, 2); lay.tea = [ax - 6, b - 9];
    px(ax - 4, b - 7, '#4b9bcc', 2, 1);
    // 角落一大盆龟背竹
    const mx = Math.round(cols * 0.955);
    px(mx - 2, b - 4, '#c9785a', 5, 4); for (let k = 0; k < 9; k++) { const a = -2.6 + k * 0.4, len = 6 + (k % 3); for (let j = 0; j < len; j++) px(mx + Math.round(Math.cos(a) * j * 0.8), b - 5 - Math.round(Math.sin(-a) * j * 0.9 + j * 0.4), j > len - 3 ? '#55a845' : '#3f8538'); }
    if (env.holiday && env.holiday.id === 'xmas') { px(fx + 3, b - fh - 8, '#e33b3b', 3, 3); px(fx + fw - 6, b - fh - 8, '#2f8a3a', 3, 3); }
    if (env.holiday && (env.holiday.id === 'spring' || env.holiday.id === 'lantern')) { px(dx + 3, b - dh - 5, '#d9262b', 4, 3); px(dx + 4, b - dh - 4, '#ffd84a', 2, 1); }
    const list = decorOf('cabin').map((d, i) => ({ ...d, i }));
    for (const d of list) drawDecor(null, px, d, lay, R, full);
  }

  // 户外的小细节：蕨草、石子、倒木、湖面倒影、远处风车……
  function outdoorDetail(px, lay, R, scene, full) {
    const { cols, gy, base, season } = lay, w = season === 'winter';
    for (let x = 0; x < cols; x += 5 + Math.floor(R() * 7)) {
      const y = gy + 1 + Math.floor(R() * Math.max(1, base - gy));
      if (w) { px(x, y, '#e8eef6', 2, 1); continue; }
      const c1 = season === 'autumn' ? '#c49a3a' : '#4f9a45', c2 = season === 'autumn' ? '#a67c2a' : '#3f8538';
      px(x, y, c1); px(x - 1, y - 1, c2); px(x + 1, y - 1, c2); px(x, y - 2, c1);
    }
    for (let i = 0; i < cols / 16; i++) { const x = Math.floor(R() * cols), y = base + 1 + Math.floor(R() * Math.max(1, lay.rows - base - 1)); px(x, y, w ? '#c8d4e2' : '#a8a098', 2, 1); px(x, y - 1, w ? '#ffffff' : '#c8c0b8'); }
    if (scene === 'forest') {
      const lx = Math.round(cols * 0.12);
      px(lx, base - 2, '#6b4a30', 14, 3); px(lx + 14, base - 2, '#c99a6a', 2, 3); px(lx + 15, base - 1, '#8a6448');
      px(lx + 2, base - 3, w ? '#ffffff' : '#5f9a4a', 6, 1);
      if (!w) { px(lx + 4, base - 4, '#d9342b', 2, 1); px(lx + 4, base - 3, '#f4ead8', 1, 1); }
    }
    if (scene === 'lake' && lay.water && !lay.water.ice) {
      const { y0, y1 } = lay.water;
      for (let x = 0; x < cols; x += 3) { const h = 2 + ((x * 7) % 5); for (let k = 0; k < h; k++) if ((x + k) % 2 === 0) px(x, y0 + 1 + k, '#3f86b8'); }
      px(Math.round(cols * 0.72), y1 - 4, '#8a5a3a', 9, 2); px(Math.round(cols * 0.72) + 1, y1 - 5, '#a8703f', 7, 1);
    }
    if (scene === 'meadow') {
      const mx = Math.round(cols * (full ? 0.82 : 0.3)), my = gy - (full ? 2 : 1), mh = full ? 26 : Math.min(18, Math.round(gy * 0.7));
      for (let k = 0; k < mh; k++) { const half = 1 + Math.round(k / mh * 2.5); px(mx - half, my - mh + k, k % 4 ? '#e8dcc8' : '#d0c4b0', half * 2 + 1, 1); }
      px(mx - 1, my - mh - 2, '#8e3d30', 3, 2); px(mx, my - 5, '#6b4428', 1, 3);
      lay.windmill = [mx, my - mh];
      if (season === 'summer') for (let i = 0; i < 6; i++) { const x = Math.round(cols * (0.5 + i * 0.04)); px(x, base - 9, '#4c9640', 1, 9); px(x - 1, base - 11, '#ffcf33', 3, 3); px(x, base - 10, '#7a4a2a'); }
    }
  }

  // ---------- 动态层 ----------
  const fxs = []; // 天气粒子（雨、雪、烟花、落叶…）
  let flash = 0, nextBolt = 6, fade = 0, fadeTo = null, hover = null;
  let bats = [], nextRocket = 2, birds = [], nextBirds = 20, fish = null, ripples = [], lampsOff = {}, shoot = null;
  let fogCv = null;
  function skyCols(e) {
    const W = e.fx, ph = e.time.phase;
    let top = { dawn: '#f6b0a0', day: '#7fc8f8', dusk: '#f08a60', night: '#0e1433' }[ph];
    let bot = { dawn: '#ffe3b8', day: '#d5efff', dusk: '#6a5ca8', night: '#28305f' }[ph];
    const grey = Math.min(0.7, W.cloud * 0.4 + W.rain * 0.35 + W.snow * 0.3 + W.fog * 0.3);
    if (grey > 0) { top = mix(top, ph === 'night' ? '#1c2030' : '#7a8494', grey); bot = mix(bot, ph === 'night' ? '#2a2e3c' : '#b4bcc6', grey); }
    return [top, bot];
  }
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t), g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t), bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  function ensure() {
    const g = geo(); if (!g) return null;
    const s = settings(), e = PP.env.get(), scene = SCENES[s.scene] ? s.scene : 'forest';
    const k = [scene, g.m, G.W, g.H, g.u, e.season, e.holiday ? e.holiday.id : '', JSON.stringify(s.decor[scene] || 0), s.ownerName].join('|');
    if (k !== key) { const r = build(scene, g, e); cache = r.cv; L = r.lay; key = k; lampsOff = {}; }
    return { g, e, scene };
  }

  function render(ctx) {
    if (!G.save) return;
    const st = ensure(); if (!st) return;
    const { g, e, scene } = st, u = g.u, y0 = g.y0, W = G.W, t = G.t, F = e.fx;
    const out = SCENES[scene].out, ph = e.time.phase, night = ph === 'night';
    const R = (x, y, col, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x) * u, y0 + Math.round(y) * u, w * u, h * u); };
    // 天空（全屏模式）
    if (g.m === 'full' && out) {
      const [top, bot] = skyCols(e);
      const gr = ctx.createLinearGradient(0, 0, 0, G.H * 0.8); gr.addColorStop(0, top); gr.addColorStop(1, bot);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, G.H);
      drawSkyBodies(ctx, g, e, R);
    } else if (out && night && F.cloud < 0.6 && !F.rain && !F.snow) {
      // 小场景：夜里右上角挂个月亮
      const big = e.holiday && e.holiday.id === 'midautumn', r = big ? 5 : 3, mx = L.cols - 34, my = 4;
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) R(mx + xx, my + yy + r, '#fff3b0');
    }
    ctx.drawImage(cache, 0, y0);

    // 湖：波光、倒影里的涟漪、跳起来的鱼
    if (L.water && !L.water.ice) {
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let x = 0; x < L.cols; x += 11) { const o = Math.round(Math.sin(t * 1.3 + x / 7) * 2), yy = L.water.y0 + 1 + ((x * 7) % Math.max(1, L.water.y1 - L.water.y0 - 2)); ctx.fillRect((x + o) * u, y0 + yy * u, 3 * u, u); }
      for (const r of ripples) { const a = 1 - r.t / r.max, rr = 1 + r.t * 6; ctx.globalAlpha = a * 0.8; R(r.x - rr, r.y, '#e6f6ff', 1, 1); R(r.x + rr, r.y, '#e6f6ff', 1, 1); R(r.x - rr * 0.6, r.y - 1, '#e6f6ff', 1, 1); R(r.x + rr * 0.6, r.y - 1, '#e6f6ff', 1, 1); ctx.globalAlpha = 1; }
      if (fish) { const a = fish.t / fish.max, fx = fish.x + (a - 0.5) * 10 * fish.dir, fy = fish.y - Math.sin(a * Math.PI) * 9; R(fx, fy, '#ff9a4a', 3, 2); R(fx - 2 * fish.dir, fy, '#e8751a', 1, 2); }
      if (e.holiday && e.holiday.id === 'dragon') { const bx = ((t * 6) % (L.cols + 40)) - 20, by = L.water.y0 + 2; R(bx, by + 1, '#c8552a', 16, 2); R(bx + 15, by - 1, '#e8c03a', 2, 2); R(bx + 16, by - 2, '#c8552a', 2, 1); for (let i = 0; i < 4; i++) R(bx + 3 + i * 3, by - 1 + (Math.floor(t * 4 + i) % 2), '#ffd890', 1, 2); }
    }
    // 草地的风车（风大转得快）
    if (L.windmill) { const [mx, my] = L.windmill, a0 = t * (0.6 + F.wind * 0.9); for (let k = 0; k < 4; k++) { const a = a0 + (k * Math.PI) / 2; for (let j = 1; j < 9; j++) R(mx + Math.round(Math.cos(a) * j), my + Math.round(Math.sin(a) * j), j > 6 ? '#ffffff' : '#c8bca8'); } R(mx, my, '#5a3a24'); }
    if (!out) drawInside(ctx, R, L, e, t);
    // 灯笼（春节 / 元宵 / 中秋）
    const festLantern = e.holiday && ['spring', 'lantern', 'midautumn'].includes(e.holiday.id);
    if (festLantern) for (const [lx, ly] of L.lanterns) { const sw = Math.round(Math.sin(t * 1.6 + lx) * (0.6 + F.wind * 0.5)); R(lx + sw, ly, '#3a2010', 1, 2); R(lx - 1 + sw, ly + 2, e.holiday.id === 'midautumn' ? '#ffb040' : '#d9262b', 3, 3); R(lx + sw, ly + 5, '#ffd84a', 1, 1); }
    // 烟囱冒烟（风大时斜着飘）
    if (L.chimney && fireLit(e)) for (let i = 0; i < 6; i++) { const a = ((t * 0.5 + i / 6) % 1); R(L.chimney[0] + Math.round(Math.sin(t + i) * 1.5 + a * (3 + F.wind * 8)), L.chimney[1] - Math.round(a * (14 - F.wind * 3)), `rgba(220,220,230,${0.6 * (1 - a)})`, 2, 2); }

    // 调色：清晨 / 傍晚 / 夜里 / 阴雨（只染场景本身）
    ctx.save(); ctx.globalCompositeOperation = 'source-atop';
    const tint = out ? { dawn: ['#ffb0c0', 0.1], day: null, dusk: ['#ff8a50', 0.14], night: ['#141a40', 0.42] }[ph] : { dawn: null, day: null, dusk: ['#ff9a50', 0.12], night: ['#3a2010', 0.22] }[ph];
    if (tint) { ctx.globalAlpha = tint[1]; ctx.fillStyle = tint[0]; ctx.fillRect(0, y0, W, g.H); }
    if (out && F.dark) { ctx.globalAlpha = F.dark; ctx.fillStyle = '#4a5464'; ctx.fillRect(0, y0, W, g.H); }
    ctx.restore();
    // 雾：柔和的一团一团，慢慢飘
    if (out && F.fog) drawFog(ctx, g, F, t);
    ctx.save(); ctx.globalCompositeOperation = 'source-atop';
    if (flash > 0 && out) { ctx.globalAlpha = Math.min(0.55, flash); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, G.H); }
    if (fade > 0) { ctx.globalAlpha = Math.min(1, fade); ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, 0, W, G.H); }
    ctx.restore();

    // 灯：天暗了亮起来（画在调色之后，所以是亮的）
    const dark = night || ph === 'dusk' || (!out && ph !== 'day') || F.dark > 0.2;
    L.lights.forEach((l, i) => {
      if (lampsOff[i]) return;
      if (l.win) { if (!dark) return; R(l.x, l.y, '#ffd27a', l.w, l.h); R(l.x + 3, l.y, '#5a3a24', 1, l.h); R(l.x, l.y + 2, '#5a3a24', l.w, 1); }
      else if (!dark) return;
      glow(ctx, (l.x + l.w / 2) * u, y0 + (l.y + l.h / 2) * u, (l.r + l.w) * u, l.col || '#ffd27a', 0.45 + Math.sin(t * 3 + l.x) * 0.05);
      if (!l.win) R(l.x, l.y, l.col || '#ffe08a', l.w, l.h);
    });
    if (festLantern && dark) for (const [lx, ly] of L.lanterns) { glow(ctx, (lx + 0.5) * u, y0 + (ly + 3.5) * u, 6 * u, '#ff6040', 0.5); R(lx - 1, ly + 2, e.holiday.id === 'midautumn' ? '#ffd070' : '#ff4a3a', 3, 3); }
    if (e.holiday && e.holiday.id === 'xmas') {
      L.xmas.forEach(([x, y], i) => { if (Math.floor(t * 2 + i) % 3) R(x, y, ['#ff4a4a', '#ffd84a', '#5ad1ff', '#7be07b'][i % 4]); });
      if (L.treeTop) { R(L.treeTop[0] - 1, L.treeTop[1] - 2, '#ffd84a', 3, 1); R(L.treeTop[0], L.treeTop[1] - 3, '#ffd84a', 1, 3); }
    }
    // 萤火虫（夏天晚上、没下雨）
    if (out && e.season === 'summer' && dark && !F.rain) for (let i = 0; i < 10; i++) { const fx = (Math.sin(t * 0.3 + i * 7.1) * 0.5 + 0.5) * L.cols, fy = L.gy - 4 - (Math.sin(t * 0.7 + i * 3.3) * 0.5 + 0.5) * Math.min(20, L.gy); if (Math.sin(t * 2.5 + i) > 0) R(fx, fy, '#f6ff8a'); }
    labels(ctx, g, L);
    if (G.editing) drawEditOverlay(ctx, g);
  }

  // 雾：低分辨率画布上画柔和的圆团，放大后自然就是软的
  function drawFog(ctx, g, F, t) {
    const fw = Math.max(32, Math.round(G.W / 8)), fh = Math.max(12, Math.round(g.H / 8));
    if (!fogCv || fogCv.width !== fw || fogCv.height !== fh) { fogCv = document.createElement('canvas'); fogCv.width = fw; fogCv.height = fh; }
    const c = fogCv.getContext('2d'); c.clearRect(0, 0, fw, fh);
    const r = rng(19), sp = 1.2 + F.wind * 1.5;
    for (let i = 0; i < 14; i++) {
      const rad = fh * (0.35 + r() * 0.45), y = fh * (0.25 + r() * 0.75), x = ((r() * (fw + rad * 2) + t * sp * (0.5 + r())) % (fw + rad * 2)) - rad;
      const gr = c.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(236,240,246,0.55)'); gr.addColorStop(1, 'rgba(236,240,246,0)');
      c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const lg = c.createLinearGradient(0, fh * 0.55, 0, fh); lg.addColorStop(0, 'rgba(236,240,246,0)'); lg.addColorStop(1, 'rgba(236,240,246,0.45)');
    c.fillStyle = lg; c.fillRect(0, 0, fw, fh);
    ctx.save(); ctx.globalCompositeOperation = g.m === 'full' ? 'source-over' : 'source-atop'; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fogCv, 0, g.y0, G.W, g.H); ctx.restore(); ctx.imageSmoothingEnabled = false;
  }

  function glow(ctx, x, y, r, col, a) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function fireLit(e) { return e.season === 'winter' || (e.weather.temp != null && e.weather.temp < 12) || e.time.phase === 'night' || e.fx.rain > 0.6; }

  function drawSkyBodies(ctx, g, e, R) {
    const t = G.t, ph = e.time.phase, F = e.fx, cols = Math.ceil(G.W / g.u), rows = Math.ceil(G.H / g.u);
    const clearish = F.cloud < 0.6 && !F.rain && !F.snow;
    if (ph === 'night' && clearish) {
      const r = rng(cols + 5);
      for (let i = 0; i < cols / 4; i++) { const x = r() * cols, y = r() * rows * 0.55, p = r() * 9; if (Math.sin(t * (0.6 + r()) + p) > -0.3) R(x, y, i % 7 ? '#fff6c2' : '#ffffff'); }
      const big = e.holiday && e.holiday.id === 'midautumn', mr = big ? 9 : 6, mx = cols * 0.78, my = rows * 0.14;
      if (big) { ctx.globalAlpha = 0.15; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(mx * g.u, my * g.u, mr * g.u * 2.2, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      for (let yy = -mr; yy <= mr; yy++) for (let xx = -mr; xx <= mr; xx++) if (xx * xx + yy * yy <= mr * mr && (big || (xx - 3) * (xx - 3) + (yy + 2) * (yy + 2) > mr * mr * 0.8)) R(mx + xx, my + yy, '#fff3b0');
      if (shoot) { const a = shoot.t / shoot.max; for (let k = 0; k < 8; k++) { ctx.globalAlpha = (1 - k / 8) * (1 - a); R(shoot.x + (a * 60 - k) * 1, shoot.y + (a * 60 - k) * 0.45, '#ffffff'); } ctx.globalAlpha = 1; }
    } else if (ph !== 'night' && clearish) {
      const h = e.time.hour, aa = U.clamp((h - 6) / 12.5, 0, 1);
      const sx = cols * (0.1 + aa * 0.8), sy = rows * (0.5 - Math.sin(aa * Math.PI) * 0.38), sr = 5;
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(sx * g.u, sy * g.u, sr * g.u * 2.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      for (let yy = -sr; yy <= sr; yy++) for (let xx = -sr; xx <= sr; xx++) if (xx * xx + yy * yy <= sr * sr) R(sx + xx, sy + yy, ph === 'day' ? '#fff2a0' : '#ffb070');
    }
    // 云：云量越大越多越灰，风越大飘得越快
    const n = Math.round(3 + F.cloud * 10), darkc = F.rain || F.snow || F.storm;
    const col = darkc ? '#8a94a4' : ph === 'night' ? '#3a4470' : ph === 'dusk' ? '#ffc0a0' : '#ffffff';
    const r = rng(77), speed = 0.6 + F.wind * 1.4;
    for (let i = 0; i < n; i++) {
      const w = 14 + Math.floor(r() * 22), y = rows * (0.04 + r() * 0.3), x = ((r() * cols + t * speed * (0.6 + r() * 0.8)) % (cols + 60)) - 40;
      R(x, y, col, w, 3); R(x + 3, y - 2, col, w - 8, 2); R(x + w * 0.4, y - 4, col, w * 0.35, 2);
      if (darkc) R(x + 2, y + 3, mix(col, '#5a6474', 0.4), w - 4, 1);
    }
    // 一群小鸟飞过
    for (const bd of birds) for (let k = 0; k < bd.n; k++) { const bx = bd.x + k * 6 * -bd.dir, by = bd.y + (k % 2) * 3 + Math.sin(t * 3 + k) * 1, f = Math.floor(t * 6 + k) % 2; R(bx - 1, by - f, '#2a2a33'); R(bx, by, '#2a2a33'); R(bx + 1, by - f, '#2a2a33'); }
  }

  function drawInside(ctx, R, L, e, t) {
    const wd = L.win, F = e.fx, gg = geo(), u0 = gg.u, y00 = gg.y0;
    if (wd) {
      const [top, bot] = skyCols(e);
      for (let y = 0; y < wd.h; y++) R(wd.x, wd.y + y, mix(top, bot, y / wd.h), wd.w, 1);
      for (let x = 2; x < wd.w; x += 7) { const h = 4 + (x % 3); R(x + wd.x, wd.y + wd.h - h, e.season === 'winter' ? '#c9d6e4' : e.season === 'autumn' ? '#c9894a' : '#3f6b4a', 3, h); }
      if (e.time.phase === 'night' && F.cloud < 0.6 && !F.rain && !F.snow) for (let i = 0; i < 6; i++) if (Math.sin(t * 2 + i * 3) > 0) R(wd.x + (i * 7) % wd.w, wd.y + 1 + (i * 5) % Math.max(1, wd.h - 6), '#fff6c2');
      if (F.rain) for (let i = 0; i < wd.w; i += F.rain > 0.6 ? 2 : 4) R(wd.x + i, wd.y + Math.floor((t * 22 + i * 7) % wd.h), '#bcd4ff', 1, 2);
      if (F.snow) for (let i = 0; i < wd.w; i += 4) R(wd.x + i + Math.round(Math.sin(t + i)), wd.y + Math.floor((t * 4 + i * 5) % wd.h), '#ffffff');
      if (F.fog) { ctx.globalAlpha = 0.45; R(wd.x, wd.y, '#eef2f6', wd.w, wd.h); ctx.globalAlpha = 1; }
      if (flash > 0) { ctx.globalAlpha = Math.min(0.8, flash); R(wd.x, wd.y, '#ffffff', wd.w, wd.h); ctx.globalAlpha = 1; }
      R(wd.x + Math.floor(wd.w / 2), wd.y, '#6b4428', 1, wd.h); R(wd.x, wd.y + Math.floor(wd.h / 2), '#6b4428', wd.w, 1);
      R(wd.x - 3, wd.y - 2, '#e88aa8', 3, wd.h + 3); R(wd.x + wd.w, wd.y - 2, '#e88aa8', 3, wd.h + 3);
      R(wd.x - 3, wd.y - 3, '#a8445e', wd.w + 6, 1);
    }
    if (L.fire && fireLit(e)) {
      const f = L.fire;
      for (let i = 0; i < f.w; i++) { const h = Math.max(1, Math.round(f.h * (0.4 + 0.35 * Math.sin(t * 9 + i * 1.7) + 0.25 * Math.sin(t * 5.3 + i)))); R(f.x + i, f.y + f.h - h, '#ff7a2a', 1, h); R(f.x + i, f.y + f.h - Math.ceil(h * 0.5), '#ffd04a', 1, Math.ceil(h * 0.5)); }
      glow(ctx, (f.x + f.w / 2) * u0, y00 + (f.y + f.h / 2) * u0, (f.w + 14) * u0, '#ff9a40', 0.35 + Math.sin(t * 7) * 0.05);
    }
    if (L.monitor) { const m = L.monitor; R(m.x, m.y, '#1a2a40', m.w, m.h); for (let i = 0; i < 3; i++) R(m.x + 1, m.y + 1 + i, ['#7be07b', '#5ad1ff', '#ffd84a'][i], 1 + ((Math.floor(t * 2) + i * 2) % (m.w - 2)), 1); }
    // 墙上的钟：真实时间
    if (L.clock) {
      const c = L.clock, d = new Date();
      for (let a = 0; a < 16; a++) R(c.x + Math.round(Math.cos(a / 16 * 6.283) * c.r), c.y + Math.round(Math.sin(a / 16 * 6.283) * c.r), '#5a3a24');
      for (let yy = -c.r + 1; yy < c.r; yy++) for (let xx = -c.r + 1; xx < c.r; xx++) if (xx * xx + yy * yy < (c.r - 0.5) * (c.r - 0.5)) R(c.x + xx, c.y + yy, '#fff8e8');
      const ha = ((d.getHours() % 12) + d.getMinutes() / 60) / 12 * 6.283 - 1.571, ma = d.getMinutes() / 60 * 6.283 - 1.571;
      for (let j = 1; j <= 2; j++) R(c.x + Math.round(Math.cos(ha) * j), c.y + Math.round(Math.sin(ha) * j), '#231c20');
      for (let j = 1; j <= 3; j++) R(c.x + Math.round(Math.cos(ma) * j), c.y + Math.round(Math.sin(ma) * j), '#8a3a30');
      R(c.x, c.y, '#231c20');
    }
    // 天花板上的小灯串：傍晚和晚上会亮，一闪一闪
    const evening = e.time.phase !== 'day' || F.dark > 0.15;
    (L.bulbs || []).forEach(([x, y], i) => {
      const on = evening && (Math.sin(t * 1.5 + i * 1.7) > -0.6);
      if (on) glow(ctx, (x + 0.5) * u0, y00 + (y + 0.5) * u0, 2.5 * u0, '#ffd890', 0.6);
      R(x, y, on ? ['#ffe08a', '#ffb0c0', '#bfe8ff', '#c8f0a0'][i % 4] : '#8a7a6a');
    });
    (L.candles || []).forEach(([x, y], i) => { const f = Math.floor(t * 8 + i) % 3; R(x + (f === 1 ? 1 : 0), y - 1, '#ffb040'); R(x, y - 2 + (f === 2 ? 1 : 0), '#ffe08a'); if (evening) glow(ctx, (x + 0.5) * u0, y00 + (y - 1) * u0, 5 * u0, '#ffd890', 0.4); });
    // 茶杯和马克杯冒热气
    for (const p of [L.tea, L.cup]) if (p) for (let k = 0; k < 3; k++) { const a = ((t * 0.6 + k / 3) % 1); ctx.globalAlpha = 0.5 * (1 - a); R(p[0] + Math.round(Math.sin(t * 2 + k) * 1), p[1] - Math.round(a * 6), '#ffffff'); ctx.globalAlpha = 1; }
  }

  function labels(ctx, g, L) {
    ctx.save(); labels0(ctx, g, L); ctx.restore();
  }
  function labels0(ctx, g, L) {
    const u = g.u, y0 = g.y0;
    const fs = Math.max(9, Math.min(13, u * 4.5));
    ctx.font = `${fs}px "Zpix","Fusion Pixel 12px Proportional SC","PingFang SC","Microsoft YaHei",monospace`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    for (const h of L.hots) if (h.sign) { ctx.fillStyle = '#5a3a24'; ctx.fillText(h.sign.label, (h.sign.x + 6.5) * u, y0 + (h.sign.y + 1.6) * u); }
    if (hover) {
      const x = ((hover.x0 + hover.x1) / 2) * u, y = y0 + hover.y0 * u - 10;
      const w = ctx.measureText(hover.tip).width + 12;
      const xx = U.clamp(x, w / 2 + 4, G.W - w / 2 - 4), yy = Math.max(14, y);
      ctx.fillStyle = '#111'; ctx.fillRect(xx - w / 2, yy - 10, w, 18); ctx.fillStyle = '#ffcf33'; ctx.fillRect(xx - w / 2 + 2, yy + 8, w - 4, 2);
      ctx.fillStyle = '#fff'; ctx.fillText(hover.tip, xx, yy);
      if (!hover.sky) { ctx.strokeStyle = '#ffcf33'; ctx.lineWidth = 2; ctx.strokeRect(hover.x0 * u, y0 + hover.y0 * u, (hover.x1 - hover.x0) * u, (hover.y1 - hover.y0) * u); }
    }
  }

  // 前景：雨、雪、落叶、烟花、蝙蝠（画在宠物前面）
  function renderFront(ctx) {
    if (!G.save || !L) return;
    const g = geo(); if (!g) { fxs.length = 0; return; }
    if (!SCENES[settings().scene || 'forest'].out) return;
    const F = PP.env.get().fx;
    for (const p of fxs) {
      if (p.k === 'rain') { ctx.strokeStyle = p.sleet ? 'rgba(220,235,255,.8)' : 'rgba(180,205,255,.7)'; ctx.lineWidth = Math.max(1, g.u / 2); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.012, p.y + p.len); ctx.stroke(); }
      else if (p.k === 'snow') { ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x, p.y, p.s, p.s); }
      else if (p.k === 'leaf') { ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, g.u, g.u); ctx.fillRect(p.x + g.u * Math.sign(Math.sin(p.ph)), p.y + g.u, g.u, g.u); }
      else if (p.k === 'spark') { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, g.u, g.u); ctx.globalAlpha = 1; }
      else if (p.k === 'rocket') { ctx.fillStyle = '#fff2c0'; ctx.fillRect(p.x, p.y, g.u, g.u * 2); }
      else if (p.k === 'splash') { ctx.fillStyle = 'rgba(200,220,255,.8)'; ctx.fillRect(p.x - g.u, p.y, g.u, g.u); ctx.fillRect(p.x + g.u, p.y, g.u, g.u); }
    }
    for (const b of bats) { const f = Math.floor(G.t * 8 + b.ph) % 2; ctx.fillStyle = '#1a1424'; ctx.fillRect(b.x - g.u, b.y, g.u * 3, g.u); ctx.fillRect(b.x - g.u * 2, b.y - (f ? g.u : -g.u), g.u, g.u); ctx.fillRect(b.x + g.u * 2, b.y - (f ? g.u : -g.u), g.u, g.u); }
    if (F.wind >= 2 && fxs.length < 5) { /* 大风但没有可吹的东西时也让人看得出：在 update 里吹落叶/雪尘 */ }
  }

  function update(dt) {
    if (!G.save) return;
    if (fadeTo) { fade += dt * 3.2; if (fade >= 1) { const to = fadeTo; fadeTo = null; arrive(to); } }
    else if (fade > 0) fade = Math.max(0, fade - dt * 2.4);
    const g = geo(); if (!g || !L) return;
    const e = PP.env.get(), F = e.fx, out = SCENES[settings().scene || 'forest'].out;
    const top = g.m === 'full' ? -10 : Math.max(0, g.y0 - 40), bottom = G.ground;
    const low = settings().quiet ? 0.4 : 1, fullK = g.m === 'full' ? 2.2 : 1;
    const windVx = -(F.wind * 70);
    if (out) {
      // 雨：雨量决定密度、长度、速度；风让雨斜着下
      if (F.rain) {
        const want = (G.W / 22) * (0.4 + F.rain * 2.2) * low * fullK, cur = fxs.filter((p) => p.k === 'rain').length;
        for (let i = 0; i < Math.min(40, (want - cur) * dt * 3); i++) fxs.push({ k: 'rain', x: Math.random() * (G.W + 200) - (windVx < 0 ? 0 : 100), y: top - Math.random() * 40, vy: 300 + F.rain * 260 + Math.random() * 80, vx: windVx - 20, len: g.u * (2 + F.rain * 3), sleet: e.weather.kind === 'sleet' });
      }
      if (F.snow) {
        const want = (G.W / 26) * (0.5 + F.snow * 1.6) * low * fullK, cur = fxs.filter((p) => p.k === 'snow').length;
        for (let i = 0; i < Math.min(20, (want - cur) * dt * 2); i++) fxs.push({ k: 'snow', x: Math.random() * (G.W + 200) - 100, y: top - Math.random() * 30, vy: 18 + F.snow * 20 + Math.random() * 18, s: g.u * (Math.random() < 0.3 + F.snow * 0.3 ? 2 : 1), ph: Math.random() * 9 });
      }
      // 落叶 / 花瓣 / 风里的叶子（风越大越多）
      const leafRate = ((e.season === 'autumn' || e.season === 'spring') && !F.rain ? 0.6 : 0) + (F.wind >= 1 && e.season !== 'winter' ? F.wind * 0.8 : 0);
      if (Math.random() < dt * leafRate * low * fullK)
        fxs.push({ k: 'leaf', x: windVx < -60 ? G.W + 10 : Math.random() * G.W, y: top + Math.random() * 30, vy: 16 + Math.random() * 14, ph: Math.random() * 9, col: e.season === 'autumn' ? U.pick(['#e8913a', '#d9662a', '#c9a23a']) : e.season === 'spring' ? U.pick(['#ffc4d8', '#ffb0c8', '#fff0f4']) : U.pick(['#5fae4a', '#7cc35a']) });
      if (F.storm) { nextBolt -= dt; if (nextBolt <= 0) { flash = 0.7; nextBolt = U.rand(7, 18); setTimeout(() => (flash = 0.45), 120); PP.ambientThunder && PP.ambientThunder(true); } }
      // 湖面：下雨时到处是小涟漪，偶尔有鱼跳出来
      if (L.water && !L.water.ice) {
        if (F.rain && Math.random() < dt * (3 + F.rain * 10)) ripples.push({ x: Math.random() * L.cols, y: L.water.y0 + 1 + Math.random() * (L.water.y1 - L.water.y0 - 2), t: 0, max: 0.6 });
        if (!fish && Math.random() < dt * 0.02) jumpFish(Math.random() * L.cols);
      }
      // 小鸟：白天、不下雨时偶尔一群飞过（全屏模式）
      if (g.m === 'full' && e.time.phase !== 'night' && !F.rain && !F.storm) { nextBirds -= dt; if (nextBirds <= 0) { nextBirds = U.rand(25, 70); flock(); } }
      const fw = e.holiday && ['spring', 'lantern', 'newyear', 'nye'].includes(e.holiday.id) && e.time.phase === 'night';
      if (fw) { nextRocket -= dt; if (nextRocket <= 0) { nextRocket = U.rand(1.5, 4); fxs.push({ k: 'rocket', x: U.rand(G.W * 0.1, G.W * 0.9), y: bottom, vy: -U.rand(260, 340), top: g.m === 'full' ? G.H * 0.25 : g.y0 - U.rand(30, 120) }); } }
      if (e.holiday && e.holiday.id === 'halloween' && e.time.phase !== 'day' && bats.length < 4 && Math.random() < dt * 0.3) bats.push({ x: -20, y: g.y0 + U.rand(5, Math.max(10, g.H * 0.4)), vx: U.rand(50, 90), ph: Math.random() * 9 });
    }
    flash = Math.max(0, flash - dt * 2.5);
    for (const p of fxs) {
      if (p.k === 'snow') { p.y += p.vy * dt; p.x += (Math.sin(G.t * 1.3 + p.ph) * 14 + windVx * 0.6) * dt; if (p.y > bottom) p.dead = true; }
      else if (p.k === 'rain') { p.y += p.vy * dt; p.x += p.vx * dt; if (p.y > bottom - 2) { p.dead = true; if (Math.random() < 0.12) fxs.push({ k: 'splash', x: p.x, y: bottom - g.u * 2, life: 0.12 }); } }
      else if (p.k === 'leaf') { p.y += p.vy * dt; p.ph += dt * 2; p.x += (Math.sin(p.ph) * 22 + windVx * 1.2) * dt; if (p.y > bottom || p.x < -20 || p.x > G.W + 20) p.dead = true; }
      else if (p.k === 'splash') { p.life -= dt; if (p.life <= 0) p.dead = true; }
      else if (p.k === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; if (p.life <= 0) p.dead = true; }
      else if (p.k === 'rocket') {
        p.y += p.vy * dt; if (p.y <= p.top) {
          p.dead = true; const col = U.pick(['#ff4a4a', '#ffd84a', '#5ad1ff', '#7be07b', '#ff8fd0']);
          for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, sp = U.rand(50, 90); fxs.push({ k: 'spark', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.3, max: 1.3, col }); }
        }
      }
    }
    for (let i = fxs.length - 1; i >= 0; i--) if (fxs[i].dead) fxs.splice(i, 1);
    if (fxs.length > 1800) fxs.splice(0, fxs.length - 1800);
    for (const b of bats) { b.x += b.vx * dt; b.y += Math.sin(G.t * 3 + b.ph) * 20 * dt; }
    bats = bats.filter((b) => b.x < G.W + 30);
    for (const r of ripples) r.t += dt; ripples = ripples.filter((r) => r.t < r.max);
    if (fish) { fish.t += dt; if (fish.t > fish.max) { ripples.push({ x: fish.x + 5 * fish.dir, y: fish.y, t: 0, max: 0.8 }); fish = null; } }
    for (const bd of birds) bd.x += bd.dir * bd.v * dt;
    birds = birds.filter((bd) => bd.x > -40 && bd.x < L.cols + 40);
    if (shoot) { shoot.t += dt; if (shoot.t > shoot.max) shoot = null; }
  }
  function jumpFish(x) { if (!L || !L.water) return; fish = { x, y: L.water.y0 + 2 + Math.random() * 3, t: 0, max: 0.9, dir: Math.random() < 0.5 ? 1 : -1 }; ripples.push({ x, y: fish.y, t: 0, max: 0.7 }); }
  function flock(y) { const rows = Math.ceil(G.H / (geo() || { u: 4 }).u), dir = Math.random() < 0.5 ? 1 : -1; birds.push({ x: dir > 0 ? -20 : L.cols + 20, y: y != null ? y : rows * (0.08 + Math.random() * 0.25), dir, v: 18 + Math.random() * 10, n: 3 + Math.floor(Math.random() * 4) }); }

  // ---------- 热点：门、路牌；全屏模式下还能点树、湖、灯、天空…… ----------
  const TIP = { pine: '摇一摇', oak: '摇一摇', apple: '摇一摇（会掉苹果）', bush: '扒拉一下', flower: '闻一闻', mushroom: '戳一下', lamp: '开灯 / 关灯', snowman: '摸摸雪人', pumpkin: '敲一敲', hay: '扒拉一下', bench: '坐坐' };
  function hot(x, y) {
    hover = null;
    if (G.editing) return null;
    const g = geo(); if (!g || !L) return null;
    const lx = x / g.u, ly = (y - g.y0) / g.u;
    hover = L.hots.find((h) => lx >= h.x0 && lx <= h.x1 && ly >= h.y0 && ly <= h.y1) || null;
    if (hover || g.m !== 'full') return hover;
    // 全屏：可以和场景里的东西玩
    const list = decorOf(settings().scene || 'forest');
    for (let i = L.boxes.length - 1; i >= 0; i--) {
      const bx = L.boxes[i], d = list[bx.i];
      if (d && TIP[d.k] && lx >= bx.x0 && lx <= bx.x1 && ly >= bx.y0 && ly <= bx.y1) { hover = { ...bx, tip: TIP[d.k], decor: d, di: bx.i }; return hover; }
    }
    if (L.water && !L.water.ice && ly >= L.water.y0 && ly <= L.water.y1) { hover = { x0: lx - 4, x1: lx + 4, y0: L.water.y0, y1: L.water.y1, tip: '丢颗石子', water: true, sky: true }; return hover; }
    if (SCENES[settings().scene || 'forest'].out && ly < L.gy - 30) { const night = PP.env.get().time.phase === 'night'; hover = { x0: lx - 4, x1: lx + 4, y0: ly, y1: ly + 1, tip: night ? '许个愿' : '招招手', skyClick: true, sky: true }; return hover; }
    return null;
  }
  function click(h) {
    if (!h) return;
    if (h.go) { go(h.go); return; }
    const g = geo(), e = PP.env.get();
    if (h.water) { const x = (h.x0 + h.x1) / 2; ripples.push({ x, y: (L.water.y0 + L.water.y1) / 2, t: 0, max: 0.9 }); if (Math.random() < 0.6) jumpFish(x); return; }
    if (h.skyClick) {
      if (e.time.phase === 'night') { shoot = { x: (h.x0 + h.x1) / 2 - 30, y: h.y0 - 10, t: 0, max: 0.9 }; const p = PP.F.main(); p && p.say(U.pick(['许愿！', '流星！快许愿', '希望明天也一起玩']), 2.2); }
      else flock(h.y0);
      return;
    }
    if (h.decor) {
      const d = h.decor, k = d.k, cx = ((h.x0 + h.x1) / 2) * g.u, topY = g.y0 + h.y0 * g.u;
      const season = e.season;
      if (k === 'lamp') { const li = L.lights.findIndex((l) => Math.abs(l.x + 1 - (h.x0 + h.x1) / 2) < 4); if (li >= 0) lampsOff[li] = !lampsOff[li]; return; }
      const n = k === 'pine' || k === 'oak' || k === 'apple' ? 14 : 6;
      const col = season === 'winter' ? '#ffffff' : season === 'autumn' ? '#e8913a' : season === 'spring' && k !== 'pine' ? '#ffc4d8' : '#5fae4a';
      for (let i = 0; i < n; i++) fxs.push({ k: 'leaf', x: cx + U.rand(-20, 20) * (g.u / 2), y: topY + U.rand(0, 30) * (g.u / 4), vy: U.rand(20, 45), ph: Math.random() * 9, col });
      if (k === 'apple' && (season === 'summer' || season === 'autumn') && Math.random() < 0.7) PP.addItem({ type: 'treat', x: cx + U.rand(-30, 30), y: topY + 20, vy: 0, data: { sprite: 'treat_apple' } });
      else if ((k === 'oak' || k === 'pine') && Math.random() < 0.3) PP.addItem({ type: 'gift', x: cx + U.rand(-30, 30), y: topY + 20, data: { gift: U.pick(['acorn', 'leaf']) } });
      if (k === 'flower' && !G.ambient.bug && season !== 'winter') G.ambient.bug = { x: cx, y: topY, vx: U.pick([-40, 40]), t: 0, life: U.rand(30, 60), caught: false };
      if (k === 'snowman' || k === 'mushroom' || k === 'pumpkin') PP.hearts && PP.hearts(cx, topY, 1);
    }
  }

  // ---------- 换场景 ----------
  function go(to) {
    if (!SCENES[to]) return;
    const s = settings();
    if (s.mode !== 'full' && s.mode !== 'band') { PP.setMode(s.lastMode === 'full' ? 'full' : 'band'); }
    if (s.scene === to) return;
    fadeTo = to; fade = Math.max(fade, 0.01);
  }
  function arrive(to) {
    const s = settings(), from = s.scene;
    s.scene = to; key = ''; fxs.length = 0;
    // 去那里玩的小伙伴：原来在这儿！
    for (const p of G.pets) if (p.outing) {
      if (p.outing.scene === to) { p.outing = null; p.x = U.rand(G.W * 0.2, G.W * 0.8); p.y = G.ground; p.say(U.pick(['你也来啦！', '我在这儿玩呢～', '嘿！']), 2.5); }
      else p.outing.until = Math.min(p.outing.until, G.t + 20);
    }
    // 喜欢这里的会很开心
    G.pets.forEach((p, i) => {
      if (p.outing) return;
      p.y = G.ground;
      if (from === 'forest' && to === 'cabin' || from === 'cabin') p.x = U.clamp(p.x, 40, G.W - 40);
      if (PP.SCENE_FAV[p.d.species] === to) setTimeout(() => { p.say(U.pick(['最喜欢这里了！', '耶！', '这里好舒服']), 2.4); PP.hearts && PP.hearts(p.x, p.y - 30 * G.S, 2); p.n.fun = Math.min(100, p.n.fun + 15); }, 400 + i * 250);
    });
    PP.ui.toast(`来到了${SCENES[to].name}`);
    PP.save.soon(); PP.syncTray && PP.syncTray(true);
  }

  // ---------- 宠物：喜欢的地方、出去玩 ----------
  function fav(p) { return PP.SCENE_FAV[p.d.species] || 'forest'; }
  // 在 pet.decide() 里调用：不在喜欢的地方时，偶尔会自己跑去那边玩一会儿
  function decideHook(p, add) {
    if (!active() || p.calm || p.held) return;
    const s = settings(), f = fav(p);
    if (f === s.scene) return;
    const out = G.pets.filter((q) => q.outing).length;
    if (out >= Math.max(1, Math.floor(G.pets.length / 3))) return;
    if (PP.F && PP.F.main() === p) return; // 主角一般陪着你
    if (p.n.energy < 35 || p.cooldown.outing > 0) return;
    add('outing', 0.06 + p.tr.curious * 0.06);
  }
  // 极简模式：主角跟着你的鼠标走
  function miniHook(p, add) {
    if (settings().mode !== 'mini' || p.calm) return;
    if (!G.mouse.onScreen || Date.now() - G.mouse.lastMove > 20000) return;
    if (Math.abs(G.mouse.x - p.x) > 240) add('trail', 1.2);
  }
  function exitX(to) {
    const ex = (EXITS[settings().scene] || []).find((x) => x[1] === to) || (EXITS[settings().scene] || [])[0];
    if (settings().scene === 'cabin') return 30;
    return ex && ex[0] > 0 ? G.W - 25 : 25;
  }
  // 每 5 秒：待在喜欢的地方，心情会慢慢变好
  setInterval(() => {
    if (!G.save || !active()) return;
    for (const p of G.pets) if (!p.outing && fav(p) === settings().scene) { p.n.fun = Math.min(100, p.n.fun + 0.8); p.n.battery = Math.min(100, p.n.battery + 0.5); }
  }, 5000);

  // ---------- 布置模式 ----------
  let editEl = null, pick = null, dragD = null, ghostX = null;
  function edit(on) {
    G.editing = !!on;
    const s = settings(), scene = s.scene || 'forest';
    if (editEl) { editEl.remove(); editEl = null; }
    pick = null; dragD = null;
    if (!on) { PP.refreshInteractive(); PP.save.soon(); return; }
    if (!active()) PP.setMode('band');
    if (!s.decor[scene]) s.decor[scene] = defaultDecor(scene);
    const kinds = Object.entries(DECOR).filter(([, v]) => !!v[1] === (scene === 'cabin'));
    editEl = document.createElement('div'); editEl.className = 'editbar';
    editEl.innerHTML = `<b>布置${SCENES[scene].name}</b><div class="kinds">${kinds.map(([k, v]) => `<button class="small" data-k="${k}">${v[0]}</button>`).join('')}</div>
      <div class="hint">先点上面的东西，再点场景里放下 · 拖动可以挪位置 · 右键删掉</div>
      <div class="row"><button class="small" data-a="reset">恢复默认</button><button class="small" data-a="clear">全部清空</button><button class="small primary" data-a="done">完成</button></div>`;
    editEl.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.k) { pick = pick === b.dataset.k ? null : b.dataset.k; editEl.querySelectorAll('[data-k]').forEach((x) => x.classList.toggle('on', x.dataset.k === pick)); return; }
      if (b.dataset.a === 'reset') { s.decor[scene] = defaultDecor(scene); }
      if (b.dataset.a === 'clear') { s.decor[scene] = []; }
      if (b.dataset.a === 'done') { edit(false); PP.ui.toast('布置好了'); }
    });
    document.getElementById('ui').appendChild(editEl);
    PP.refreshInteractive();
  }
  function decorAt(x, y) {
    const g = geo(); if (!g || !L) return null;
    const lx = x / g.u, ly = (y - g.y0) / g.u;
    for (let i = L.boxes.length - 1; i >= 0; i--) { const b = L.boxes[i]; if (lx >= b.x0 && lx <= b.x1 && ly >= b.y0 && ly <= b.y1) return b; }
    return null;
  }
  function editDown(x, y, btn) {
    const g = geo(); if (!g) return;
    const s = settings(), list = s.decor[s.scene || 'forest'];
    if (y < g.y0 - 20) return;
    const hitB = decorAt(x, y);
    if (btn === 2) { if (hitB) list.splice(hitB.i, 1); return; }
    if (pick) { list.push({ k: pick, x: U.clamp(x / G.W, 0, 1), v: Math.round(Math.random() * 10) / 10 }); return; }
    if (hitB) dragD = { i: hitB.i, dx: x / G.W - list[hitB.i].x };
  }
  function editMove(x) { ghostX = x; if (!dragD) return; const s = settings(), list = s.decor[s.scene || 'forest']; if (list[dragD.i]) list[dragD.i].x = U.clamp(x / G.W - dragD.dx, 0, 1); }
  function editUp() { dragD = null; }
  function drawEditOverlay(ctx, g) {
    ctx.save(); ctx.strokeStyle = 'rgba(17,17,17,.6)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    const hb = decorAt(G.mouse.x, G.mouse.y);
    for (const b of L.boxes) { ctx.strokeStyle = hb === b ? '#ffcf33' : 'rgba(17,17,17,.5)'; ctx.lineWidth = hb === b ? 2 : 1; ctx.strokeRect(b.x0 * g.u, g.y0 + b.y0 * g.u, (b.x1 - b.x0) * g.u, (b.y1 - b.y0) * g.u); }
    if (pick && ghostX != null) { ctx.setLineDash([]); ctx.strokeStyle = '#ffcf33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ghostX, g.y0); ctx.lineTo(ghostX, G.H); ctx.stroke(); }
    ctx.restore();
  }

  PP.scene = { render, renderFront, update, hot, click, go, active, height, bandHeight, geo, fav, decideHook, miniHook, exitX, edit, editDown, editMove, editUp, get hover() { return hover; }, defaultDecor };

  // ---------- 动作：出去玩 / 跟着你 ----------
  const A = PP.ACTIONS;
  A.outing = function* () {
    const p = this, to = fav(p), name = SCENES[to].name;
    p.say(U.pick([`去${name}玩一会儿～`, `我想去${name}`, `${name}在叫我！`]), 2.2);
    yield 0.8;
    const ex = exitX(to);
    yield p.goto(ex, false);
    p.cooldown.outing = 300;
    p.outing = { scene: to, until: G.t + U.rand(70, 200) };
    yield () => !p.outing;
    // 玩回来了
    p.x = ex; p.y = G.ground; p.anim = 'idle';
    p.n.fun = Math.min(100, p.n.fun + 30); p.n.battery = Math.min(100, p.n.battery + 20);
    p.say(U.pick([`从${name}回来啦`, '玩得好开心！', '我回来了～']), 2.2);
    if (Math.random() < 0.45) {
      const gift = { lake: ['shell', 'pebble'], meadow: ['flower', 'feather'], forest: ['acorn', 'leaf'], cabin: ['button', 'feather'] }[to];
      PP.addItem({ type: 'gift', x: U.clamp(ex + (ex < G.W / 2 ? 40 : -40), 20, G.W - 20), data: { gift: U.pick(gift) } });
    }
    yield 1.2;
  };
  A.trail = function* () {
    const p = this;
    const side = G.mouse.x > p.x ? -1 : 1;
    yield p.goto(G.mouse.x + side * 70 * (G.S / 2), Math.abs(G.mouse.x - p.x) > 600);
    p.facing = Math.sign(G.mouse.x - p.x) || p.facing; p.anim = 'idle';
    yield U.rand(1, 3);
  };
})();
