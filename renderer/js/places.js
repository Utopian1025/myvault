// 场景里的“家”和生活设施：每只动物的住所、吃的、喝的、玩的地方
// 坐标单位是场景格子（u 像素一格）；x 用场景宽度的比例，保证小场景和全屏位置一致
// 画完会登记：lay.spots[id] = { c, r, ... }（宠物要去的点）、lay.homes（家：悬停/点击/门口状态）
(function () {
  const PP = (window.PP = window.PP || {});

  // 各场景的固定设施（比例位置）。eco.js 用这张表决定去哪儿
  const SPOTS = {
    forest: {
      hedgehog_home: { x: 0.12, home: 'hedgehog' }, fox_home: { x: 0.3, home: 'fox' }, dragon_home: { x: 0.86, home: 'dragon' },
      berries: { x: 0.45 }, berries2: { x: 0.61 }, brook: { x: 0.535, water: 1 }, mushrooms: { x: 0.72 }, leaves: { x: 0.2 }, sunrock: { x: 0.94 }, log: { x: 0.12 },
    },
    meadow: {
      rabbit_home: { x: 0.22, home: 'rabbit' }, hamster_home: { x: 0.655, home: 'hamster' },
      clover: { x: 0.34 }, flowers: { x: 0.46 }, sunflowers: { x: 0.6 }, puddle: { x: 0.78, water: 1 }, hill: { x: 0.9 }, grass: { x: 0.52 },
    },
    farm: {
      cat_home: { x: 0.15, home: 'cat' }, dog_home: { x: 0.38, home: 'dog' }, chick_home: { x: 0.54, home: 'chick' }, pig_home: { x: 0.735, home: 'pig' },
      catbowl: { x: 0.235 }, hay: { x: 0.285 }, fence: { x: 0.315 }, dogbowl: { x: 0.43 }, trough: { x: 0.465, water: 1 }, feed: { x: 0.6 },
      apple: { x: 0.655 }, mud: { x: 0.77 }, veg: { x: 0.885 }, barnroof: { x: 0.15 }, yard: { x: 0.5 },
    },
    lake: {
      duck_home: { x: 0.09, home: 'duck' }, frog_home: { x: 0.3, home: 'frog', water: 1 }, capybara_home: { x: 0.845, home: 'capybara' },
      dock: { x: 0.47 }, shore: { x: 0.66 }, swim: { x: 0.24, water: 1 }, reeds: { x: 0.14 }, lily: { x: 0.38, water: 1 },
    },
    snow: {
      penguin_home: { x: 0.22, home: 'penguin' }, icehole: { x: 0.52 }, slidetop: { x: 0.74 }, slideend: { x: 0.9 }, pond: { x: 0.46 }, snowfield: { x: 0.36 },
    },
  };
  PP.SPOTS = SPOTS;
  PP.HOME_NAME = {
    cat: '谷仓阁楼', dog: '狗窝', chick: '鸡舍', pig: '猪圈', rabbit: '兔子洞', hamster: '向日葵下的地洞', fox: '大树根下的狐狸洞',
    hedgehog: '倒木下的落叶窝', dragon: '石头山洞', frog: '大荷叶', duck: '芦苇丛里的鸭窝', capybara: '湖边温泉', penguin: '冰屋',
  };

  const C = (cols, f) => Math.round(cols * f);

  // ---------- 森林 ----------
  function forest(px, lay, R, P) {
    const { cols, base, gy, rows, season } = lay, w = season === 'winter', au = season === 'autumn', su = season === 'summer', sp = season === 'spring';
    const hb = Math.min(lay.full ? 40 : Math.round(rows * 0.7), 40);
    // 小溪：从林子深处斜着流过来（喝水的地方）
    const bx = C(cols, SPOTS.forest.brook.x);
    for (let y = gy; y < rows; y++) { const o = Math.round((y - gy) * 0.6), ww = 3 + Math.round((y - gy) * 0.25); px(bx - o, y, w ? '#cfe6f5' : '#5aa9d6', ww, 1); if (!w && (y + o) % 3 === 0) px(bx - o + 1, y, '#9fd8f2'); }
    lay.spots.brook = { c: bx - Math.round((base - gy) * 0.6) + 1, r: base };
    // 狐狸洞：大橡树的树根下
    const fx = C(cols, SPOTS.forest.fox_home.x);
    const th = hb, r = Math.round(th * 0.3), cy = base - th + r;
    px(fx - 2, base - Math.round(th * 0.5), '#6b4a30', 5, Math.round(th * 0.5) + 1);
    for (const [dx, dy] of [[-4, 0], [-3, -1], [3, -1], [4, 0], [5, 0], [-5, 0]]) px(fx + dx, base + dy, '#5a3d2b', 1, 1);
    if (w) { for (let k = 0; k < r + 2; k++) { px(fx - Math.round(k * 0.8), base - Math.round(th * 0.5) - k, '#6b4a30'); px(fx + 2 + Math.round(k * 0.8), base - Math.round(th * 0.5) - k, '#6b4a30'); } px(fx - r, base - Math.round(th * 0.5) - r - 2, '#ffffff', 2 * r + 3, 1); }
    else for (let yy = -r; yy <= r; yy++) for (let xx = -r - 2; xx <= r + 2; xx++) {
      const d = (xx * xx) / ((r + 2) * (r + 2)) + (yy * yy) / (r * r); if (d > 1 || (d > 0.85 && (xx + yy) % 2)) continue;
      px(fx + xx, cy + yy, au ? ['#e8913a', '#d9662a', '#e8c03a'][(xx * 7 + yy * 3 + 99) % 3] : yy > r * 0.2 && xx > 0 ? '#3f8538' : sp ? '#7cc35a' : '#4f9a45');
    }
    // 洞口（土堆 + 黑洞）
    px(fx - 6, base - 1, '#8a6448', 13, 2); px(fx - 5, base - 2, '#9a7458', 11, 1);
    px(fx - 3, base - 3, '#2a1a12', 6, 3); px(fx - 2, base - 4, '#2a1a12', 4, 1);
    if (w) px(fx - 6, base - 2, '#ffffff', 13, 1);
    home(lay, 'fox', fx, base, 8, 6);
    // 刺猬窝：倒下的空心木头 + 一大堆落叶
    const hx = C(cols, SPOTS.forest.hedgehog_home.x);
    px(hx - 8, base - 3, '#6b4a30', 16, 3); px(hx + 8, base - 3, '#c99a6a', 2, 3); px(hx + 9, base - 2, '#8a6448');
    px(hx - 8, base - 4, w ? '#ffffff' : '#5f9a4a', 6, 1);
    for (let k = 0; k < 18; k++) { const xx = hx - 6 + ((k * 5) % 12), yy = base - 1 - ((k * 3) % 3); px(xx, yy, w ? (k % 3 ? '#ffffff' : '#c9a07a') : ['#d9662a', '#e8913a', '#c49a3a', '#a65a2a'][k % 4], 2, 1); }
    px(hx - 1, base - 2, '#2a1a12', 3, 2);
    if (!w) { px(hx + 3, base - 5, '#d9342b', 2, 1); px(hx + 3, base - 4, '#f4ead8'); }
    home(lay, 'hedgehog', hx, base, 8, 5);
    // 浆果丛：夏秋结果
    for (const [k, f] of [['berries', SPOTS.forest.berries.x], ['berries2', SPOTS.forest.berries2.x]]) {
      const x = C(cols, f), rr = 4;
      for (let yy = -rr; yy <= 0; yy++) for (let xx = -rr - 2; xx <= rr + 2; xx++) {
        if ((xx * xx) / ((rr + 2) * (rr + 2)) + (yy * yy) / (rr * rr) > 1) continue;
        px(x + xx, base + yy, w ? (yy <= -rr + 1 ? '#ffffff' : '#5d7d68') : au ? (xx > 0 ? '#8a6a2a' : '#a8843a') : xx > 0 ? '#2f6f38' : '#3f8538');
        if ((su || au) && (xx * 3 + yy * 7) % 5 === 0) px(x + xx, base + yy, k === 'berries' ? '#d9262b' : '#5a4ac8');
        if (sp && (xx * 3 + yy * 5) % 7 === 0) px(x + xx, base + yy, '#ffffff');
      }
      lay.spots[k] = { c: x, r: base };
    }
    // 蘑菇圈（小猪会来拱松露）
    const mx = C(cols, SPOTS.forest.mushrooms.x);
    if (!w) for (const [dx, h, col] of [[-4, 2, '#d9342b'], [-1, 3, '#c8a070'], [2, 2, '#d9342b'], [5, 2, '#c8a070']]) { px(mx + dx, base - h + 1, '#f4ead8', 1, h); px(mx + dx - 1, base - h, col, 3, 1); if (col === '#d9342b') px(mx + dx, base - h, '#ffffff'); }
    lay.spots.mushrooms = { c: mx, r: base };
    // 晒太阳的大石头
    const rx = C(cols, SPOTS.forest.sunrock.x);
    for (let xx = -5; xx <= 5; xx++) { const hh = Math.round(3 * Math.sqrt(1 - (xx * xx) / 36)) + 1; px(rx + xx, base - hh + 1, xx > 1 ? '#8a8a96' : '#a4a4b0', 1, hh); if (w) px(rx + xx, base - hh + 1, '#ffffff'); }
    lay.spots.sunrock = { c: rx, r: base - 3, perch: true };
    // 小龙的山洞：一堆大石头，中间一个黑黑的洞口
    const dx = C(cols, SPOTS.forest.dragon_home.x), dh = Math.min(16, Math.round(hb * 0.45));
    for (let xx = -10; xx <= 10; xx++) { const hh = Math.round(dh * Math.sqrt(1 - (xx * xx) / 121)); px(dx + xx, base - hh, (xx + hh) % 5 ? '#7a7a88' : '#8e8e9c', 1, hh + 1); if (w) px(dx + xx, base - hh, '#ffffff'); }
    for (let yy = 0; yy < 6; yy++) { const half = Math.round(3 * Math.sqrt(1 - ((5 - yy) * (5 - yy)) / 36)); px(dx - half, base - 5 + yy, '#1a1418', half * 2 + 1, 1); }
    px(dx + 6, base - dh + 2, '#5f9a4a', 3, 1);
    home(lay, 'dragon', dx, base, 7, 7);
    lay.spots.leaves = { c: C(cols, SPOTS.forest.leaves.x), r: base };
  }

  // ---------- 草地 ----------
  function meadow(px, lay, R, P) {
    const { cols, base, gy, rows, season } = lay, w = season === 'winter', au = season === 'autumn', su = season === 'summer', sp = season === 'spring';
    // 三叶草地（兔子最爱的食堂）
    const cx = C(cols, SPOTS.meadow.clover.x);
    for (let i = 0; i < 26; i++) { const x = cx - 10 + ((i * 7) % 21), y = gy + 1 + ((i * 5) % Math.max(1, rows - gy - 1)); if (w) { px(x, y, '#e8eef6'); continue; } px(x, y, '#3f8538', 2, 1); px(x, y - 1, '#4f9a45'); if ((sp || su) && i % 4 === 0) px(x + 1, y - 1, '#ffffff'); }
    lay.spots.clover = { c: cx, r: base };
    // 野花丛（蝴蝶多）
    const fx = C(cols, SPOTS.meadow.flowers.x);
    if (!w) for (let i = 0; i < 9; i++) { const x = fx - 8 + i * 2, h = 2 + (i % 3); px(x, base - h + 1, '#4c9640', 1, h); px(x, base - h, au ? '#c08a3a' : ['#ff8fb0', '#ffd84a', '#b98cff', '#ffffff', '#ff6b5a'][i % 5]); }
    lay.spots.flowers = { c: fx, r: base };
    // 兔子洞：小土坡 + 灌木丛 + 洞口
    const rx = C(cols, SPOTS.meadow.rabbit_home.x);
    for (let xx = -9; xx <= 9; xx++) { const hh = Math.round(3 * Math.sqrt(1 - (xx * xx) / 100)); px(rx + xx, base - hh, w ? '#ffffff' : xx > 3 ? '#5fae4a' : '#7cc35a', 1, hh + 1); }
    const br = 4; for (let yy = -br; yy <= 0; yy++) for (let xx = -br - 2; xx <= br + 2; xx++) { if ((xx * xx) / ((br + 2) * (br + 2)) + (yy * yy) / (br * br) > 1) continue; px(rx + 6 + xx, base - 3 + yy, w ? (yy < -br + 2 ? '#ffffff' : '#5d7d68') : au ? '#c9894a' : xx > 0 ? '#3f8538' : '#55a845'); }
    px(rx - 3, base - 2, '#2a1a12', 5, 3); px(rx - 2, base - 3, '#2a1a12', 3, 1); px(rx - 4, base, '#8a6448', 7, 1);
    home(lay, 'rabbit', rx - 1, base, 7, 5);
    // 向日葵地 + 下面的仓鼠洞
    const sx = C(cols, SPOTS.meadow.sunflowers.x), sh = Math.min(lay.full ? 22 : Math.round((gy) * 0.55), 22);
    for (let i = 0; i < 7; i++) {
      const x = sx - 7 + i * 2 + (i % 2), h = Math.round(sh * (0.7 + ((i * 37) % 10) / 30));
      if (w) { px(x, base - Math.round(h * 0.6), '#8a7a5a', 1, Math.round(h * 0.6)); px(x - 1, base - Math.round(h * 0.6), '#6a5a3a', 2, 1); continue; }
      if (sp) { px(x, base - 3, '#5fae4a', 1, 3); px(x - 1, base - 3, '#7cc35a'); continue; }
      px(x, base - h, '#4c7a30', 1, h); px(x + 1, base - Math.round(h * 0.5), '#5fae4a', 2, 1); px(x - 2, base - Math.round(h * 0.35), '#5fae4a', 2, 1);
      const col = au ? '#c49a2a' : '#ffcf33';
      px(x - 2, base - h - 2, col, 5, 3); px(x - 1, base - h - 3, col, 3, 1); px(x - 1, base - h + 1, col, 3, 1); px(x - 1, base - h - 1, au ? '#5a3a1a' : '#7a4a2a', 3, 1);
    }
    lay.spots.sunflowers = { c: sx, r: base };
    const hx = C(cols, SPOTS.meadow.hamster_home.x);
    px(hx - 3, base, '#9a7458', 7, 1); px(hx - 2, base - 1, '#2a1a12', 4, 2); px(hx - 1, base - 2, '#2a1a12', 2, 1);
    home(lay, 'hamster', hx, base, 5, 4);
    // 水洼（下过雨更大）
    const qx = C(cols, SPOTS.meadow.puddle.x);
    for (let yy = 0; yy < 3; yy++) { const half = [4, 6, 5][yy]; px(qx - half, base - 1 + yy, w ? '#dcecf8' : yy === 0 ? '#9fd8f2' : '#6ab4dc', half * 2 + 1, 1); }
    lay.spots.puddle = { c: qx, r: base };
    lay.spots.hill = { c: C(cols, SPOTS.meadow.hill.x), r: base };
    lay.spots.grass = { c: C(cols, SPOTS.meadow.grass.x), r: base };
  }

  // ---------- 农场 ----------
  function farm(px, lay, R, P) {
    const { cols, base, gy, rows, season } = lay, w = season === 'winter', au = season === 'autumn', su = season === 'summer', sp = season === 'spring';
    const big = Math.min(lay.full ? 34 : Math.round(gy * 0.78), 34);
    // 院子里的泥土小路
    for (let x = 0; x < cols; x++) { const y = base + 1 + Math.round(Math.sin(x / 26) * 0.8); if (R() < 0.85) px(x, y, w ? '#d8d2c8' : '#c9a878', 1, 2); }
    // 谷仓（猫住在阁楼）
    const bx = C(cols, SPOTS.farm.cat_home.x), bw = 13, wallH = Math.round(big * 0.55), roofH = Math.round(big * 0.38);
    for (let y = base - wallH; y <= base; y++) px(bx - bw, y, (y % 3) ? '#b8362e' : '#a02c26', bw * 2 + 1, 1);
    for (let k = 0; k < roofH; k++) { const half = bw + 2 - Math.round((k / roofH) * 0) - Math.round(((roofH - k) / roofH) * 0); const hh = Math.round(half * (0.35 + 0.65 * (k / roofH))); px(bx - hh, base - wallH - roofH + k, k % 2 ? '#5a3a30' : '#6a4438', hh * 2 + 1, 1); }
    if (w) for (let k = 0; k < 3; k++) { const hh = Math.round((bw + 2) * (0.35 + 0.65 * (k / roofH))); px(bx - hh, base - wallH - roofH + k, '#ffffff', hh * 2 + 1, 1); }
    px(bx - bw - 1, base - wallH, '#ffffff', bw * 2 + 3, 1);
    // 大门（白色 X）
    const dw = 6, dh = Math.min(wallH - 3, 10);
    px(bx - dw, base - dh, '#7a2420', dw * 2 + 1, dh + 1);
    for (let k = 0; k <= dh; k++) { const t = Math.round((k / dh) * (dw - 1)); px(bx - dw + 1 + t, base - dh + k, '#f0e6d8'); px(bx + dw - 1 - t, base - dh + k, '#f0e6d8'); }
    px(bx - dw, base - dh, '#f0e6d8', dw * 2 + 1, 1); px(bx, base - dh, '#f0e6d8', 1, dh + 1);
    // 阁楼窗（猫常在这儿睡）
    const ly = base - wallH - Math.round(roofH * 0.45);
    px(bx - 3, ly, '#f0e6d8', 7, 5); px(bx - 2, ly + 1, '#2a2030', 5, 3); px(bx - 2, ly + 3, '#e2b84a', 5, 1);
    lay.loft = { c: bx, r: ly + 1 };
    lay.lights.push({ x: bx - 2, y: ly + 1, w: 5, h: 3, r: 5, win: true });
    home(lay, 'cat', bx, base, dw * 2, dh + 1);
    lay.spots.barnroof = { c: bx, r: base - wallH - roofH + 1, perch: true };
    // 猫碗
    const cbx = C(cols, SPOTS.farm.catbowl.x);
    px(cbx - 2, base - 1, '#e33b3b', 5, 2); px(cbx - 1, base - 2, '#c98a4a', 3, 1);
    lay.spots.catbowl = { c: cbx, r: base };
    // 草垛 + 栅栏
    const hx = C(cols, SPOTS.farm.hay.x);
    for (let yy = 0; yy < 6; yy++) { const hw = Math.round(4 * Math.sqrt(1 - ((yy - 5) * (yy - 5)) / 36)) + 1; px(hx - hw, base - 6 + yy, yy % 2 ? '#e2b84a' : '#d4a43a', hw * 2 + 1, 1); }
    if (w) px(hx - 2, base - 6, '#ffffff', 5, 1);
    lay.spots.hay = { c: hx, r: base };
    const fx = C(cols, SPOTS.farm.fence.x);
    for (let k = 0; k < 3; k++) px(fx - 3 + k * 3, base - 6, w ? '#e6d8c8' : '#c9a878', 1, 7);
    px(fx - 4, base - 5, '#a8865a', 9, 1); px(fx - 4, base - 3, '#a8865a', 9, 1);
    if (w) px(fx - 4, base - 6, '#ffffff', 9, 1);
    lay.spots.fence = { c: fx, r: base - 6, perch: true };
    // 狗窝 + 狗碗
    const kx = C(cols, SPOTS.farm.dog_home.x), kh = 7;
    px(kx - 5, base - kh, '#c48a52', 11, kh + 1);
    for (let k = 0; k < 5; k++) px(kx - 6 + k, base - kh - 1 - k, '#8e3d30', 13 - k * 2, 1);
    if (w) px(kx - 4, base - kh - 4, '#ffffff', 9, 1);
    px(kx - 2, base - 4, '#2a1a12', 5, 5); px(kx - 1, base - 5, '#2a1a12', 3, 1);
    px(kx - 2, base - kh + 1, '#f0e6d8', 5, 1);
    home(lay, 'dog', kx, base, 6, 6);
    const dbx = C(cols, SPOTS.farm.dogbowl.x);
    px(dbx - 2, base - 1, '#4b9bcc', 5, 2); px(dbx - 1, base - 2, '#c98a4a', 3, 1);
    lay.spots.dogbowl = { c: dbx, r: base };
    // 水槽
    const tx = C(cols, SPOTS.farm.trough.x);
    px(tx - 5, base - 3, '#7a5234', 11, 3); px(tx - 4, base - 3, w ? '#dcecf8' : '#6ab4dc', 9, 1); px(tx - 4, base, '#5a3a24', 1, 1); px(tx + 4, base, '#5a3a24', 1, 1);
    lay.spots.trough = { c: tx, r: base };
    // 鸡舍：架高的小木屋 + 斜坡
    const cx = C(cols, SPOTS.farm.chick_home.x), ch = 7, cy0 = base - 4;
    px(cx - 5, cy0 - ch, '#e2c49a', 11, ch); px(cx - 5, cy0, '#7a5234', 1, 4); px(cx + 5, cy0, '#7a5234', 1, 4);
    for (let k = 0; k < 4; k++) px(cx - 6 + k, cy0 - ch - 1 - k, '#c8552a', 13 - k * 2, 1);
    if (w) px(cx - 4, cy0 - ch - 3, '#ffffff', 9, 1);
    px(cx - 1, cy0 - 4, '#3a2a20', 3, 4); px(cx + 2, cy0 - 5, '#ffd84a', 2, 2);
    for (let k = 0; k < 5; k++) px(cx - 1 - k * 1 - 1, cy0 + k, '#a8865a', 2, 1);
    home(lay, 'chick', cx - 3, base, 7, 9);
    // 撒在地上的玉米粒
    const ex = C(cols, SPOTS.farm.feed.x);
    for (let i = 0; i < 9; i++) px(ex - 5 + ((i * 7) % 11), base - ((i * 3) % 2), '#ffcf33');
    lay.spots.feed = { c: ex, r: base };
    // 苹果树（秋天地上会有掉下来的苹果）
    const ax = C(cols, SPOTS.farm.apple.x), ah = big, ar = Math.round(ah * 0.32);
    px(ax - 1, base - Math.round(ah * 0.45), '#6b4a30', 3, Math.round(ah * 0.45) + 1);
    if (!w) for (let yy = -ar; yy <= ar; yy++) for (let xx = -ar - 1; xx <= ar + 1; xx++) {
      const d = (xx * xx) / ((ar + 1) * (ar + 1)) + (yy * yy) / (ar * ar); if (d > 1 || (d > 0.85 && (xx + yy) % 2)) continue;
      let col = au ? ['#d9a03a', '#c8862a'][(xx + yy + 99) % 2] : sp ? ((xx * 5 + yy * 3) % 7 === 0 ? '#ffd0e0' : '#7cc35a') : yy > 0 && xx > 0 ? '#3f8538' : '#4f9a45';
      if ((su || au) && (xx * 7 + yy * 5) % 11 === 0) col = '#e33b3b';
      px(ax + xx, base - ah + ar + yy, col);
    } else for (let k = 0; k < ar + 2; k++) { px(ax - Math.round(k * 0.7), base - Math.round(ah * 0.45) - k, '#6b4a30'); px(ax + 1 + Math.round(k * 0.7), base - Math.round(ah * 0.45) - k, '#6b4a30'); }
    if (au) for (const dx of [-4, 3, 6]) px(ax + dx, base, '#e33b3b', 2, 1);
    lay.spots.apple = { c: ax, r: base };
    // 猪圈：矮栅栏围起来的泥坑 + 小棚子
    const px0 = C(cols, SPOTS.farm.pig_home.x);
    px(px0 - 6, base - 7, '#8a5a3a', 9, 7); for (let k = 0; k < 3; k++) px(px0 - 7 + k, base - 8 - k, '#6a4438', 11 - k * 2, 1);
    if (w) px(px0 - 6, base - 10, '#ffffff', 7, 1);
    px(px0 - 4, base - 4, '#2a1a12', 4, 4);
    home(lay, 'pig', px0 - 2, base, 6, 6);
    const mx = C(cols, SPOTS.farm.mud.x);
    for (let yy = 0; yy < 3; yy++) { const half = [5, 7, 6][yy]; px(mx - half, base - 1 + yy, w ? '#b8aa9a' : yy ? '#6a4428' : '#8a5a3a', half * 2 + 1, 1); }
    for (let k = 0; k < 6; k++) px(px0 - 8 + k * 4, base - 4, w ? '#e6d8c8' : '#c9a878', 1, 5); px(px0 - 8, base - 3, '#a8865a', 22, 1);
    lay.spots.mud = { c: mx, r: base };
    // 菜园：胡萝卜和白菜（季节不同长得不同）
    const vx = C(cols, SPOTS.farm.veg.x);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
      const x = vx - 9 + i * 3 + row, y = base - 1 + row * 2;
      px(x - 1, y + 1, '#7a5234', 3, 1);
      if (w) { px(x, y, '#e8eef6'); continue; }
      if (sp) { px(x, y, '#7cc35a'); continue; }
      if (row === 0) { px(x, y - 2, '#3fa34d', 1, 2); px(x - 1, y - 1, '#4c9640'); px(x, y, '#ff8a2a'); }
      else { px(x - 1, y - 1, '#a8e07a', 3, 2); px(x, y - 2, '#c8f0a0'); }
    }
    lay.spots.veg = { c: vx, r: base };
    lay.spots.yard = { c: C(cols, SPOTS.farm.yard.x), r: base };
  }

  // ---------- 湖边 ----------
  function lake(px, lay, R, P) {
    const { cols, base, season } = lay, w = season === 'winter', wt = lay.water;
    // 芦苇丛 + 鸭窝
    const dx = C(cols, SPOTS.lake.duck_home.x);
    for (let k = 0; k < 7; k++) { const x = dx - 6 + k * 2, hh = 8 + ((k * 3) % 4); px(x, base - hh, w ? '#b9a88a' : '#5f9a4a', 1, hh); px(x, base - hh - 2, '#7a4a2a', 1, 2); }
    for (let xx = -4; xx <= 4; xx++) px(dx + xx, base - 1 - (Math.abs(xx) > 2 ? 1 : 0), (xx % 2) ? '#a8865a' : '#8a6a44', 1, Math.abs(xx) > 2 ? 2 : 1);
    if (!w) { px(dx - 1, base - 2, '#f4f0e0'); px(dx + 1, base - 2, '#e8f0d8'); }
    home(lay, 'duck', dx, base, 6, 4);
    // 青蛙的大荷叶（在水里）
    if (wt) {
      const fx = C(cols, SPOTS.lake.frog_home.x), fy = Math.round(wt.y0 + (wt.y1 - wt.y0) * 0.55);
      if (!wt.ice) { px(fx - 5, fy, '#3f8538', 11, 1); px(fx - 4, fy - 1, '#4f9a45', 9, 1); px(fx - 3, fy + 1, '#3f8538', 7, 1); px(fx, fy, '#2f6f2a', 1, 1); if (season === 'summer' || season === 'spring') { px(fx + 4, fy - 2, '#ff9fc0'); px(fx + 4, fy - 3, '#ffd0e0'); } }
      else { px(fx - 4, fy, '#b8d8ea', 9, 1); }
      home(lay, 'frog', fx, fy + 1, 6, 3);
      lay.spots.frog_home.water = true;
      const ly = Math.round(wt.y0 + (wt.y1 - wt.y0) * 0.4);
      lay.spots.lily = { c: C(cols, SPOTS.lake.lily.x), r: ly, water: true };
      lay.spots.swim = { c: C(cols, SPOTS.lake.swim.x), r: Math.round(wt.y0 + (wt.y1 - wt.y0) * 0.6), water: true };
    }
    // 码头的位置（场景里已经画了木码头）
    lay.spots.dock = { c: C(cols, SPOTS.lake.dock.x), r: wt ? wt.y1 - 2 : base, perch: true };
    lay.spots.shore = { c: C(cols, SPOTS.lake.shore.x), r: base };
    lay.spots.reeds = { c: C(cols, SPOTS.lake.reeds.x), r: base };
    // 温泉：岸上一圈石头围着冒热气的池子（卡皮巴拉的家）
    const sx = C(cols, SPOTS.lake.capybara_home.x);
    for (let yy = 0; yy < 4; yy++) { const half = [7, 9, 9, 7][yy]; px(sx - half, base - 2 + yy, yy === 0 ? '#c8ecf0' : '#8fd0d8', half * 2 + 1, 1); }
    for (let xx = -10; xx <= 10; xx += 2) { const yy = Math.abs(xx) > 7 ? base - 1 : base - 3 + (Math.abs(xx) > 4 ? 0 : -0); if (Math.abs(xx) < 8 && yy === base - 3) { px(sx + xx, base - 3, '#9a9aa6', 2, 1); continue; } px(sx + xx, yy, '#8a8a96', 2, 2); if (w) px(sx + xx, yy, '#ffffff', 2, 1); }
    px(sx - 11, base, '#8a8a96', 2, 2); px(sx + 10, base, '#8a8a96', 2, 2);
    home(lay, 'capybara', sx, base + 1, 12, 5);
    lay.spring = { c: sx, r: base - 2 };
  }

  // ---------- 雪原 ----------
  function snow(px, lay, R, P) {
    const { cols, base, gy, rows } = lay;
    // 结冰的小湖 + 冰窟窿
    const cx = C(cols, SPOTS.snow.pond.x);
    for (let y = gy + 1; y < rows; y++) { const k = (y - gy) / Math.max(1, rows - gy), half = Math.round(16 * Math.sin(Math.PI * Math.min(1, 0.25 + k * 0.75))); px(cx - half, y, (y % 3) ? '#cfe6f5' : '#e6f3fb', half * 2 + 1, 1); }
    const ix = C(cols, SPOTS.snow.icehole.x);
    px(ix - 3, base - 1, '#1e4f7a', 7, 2); px(ix - 2, base - 2, '#2e6a9a', 5, 1); px(ix - 4, base - 1, '#ffffff', 1, 2); px(ix + 4, base - 1, '#ffffff', 1, 2);
    lay.spots.icehole = { c: ix, r: base };
    lay.icehole = { c: ix, r: base - 1 };
    // 冰屋
    const hx = C(cols, SPOTS.snow.penguin_home.x), r = 8;
    for (let yy = 0; yy <= r; yy++) { const half = Math.round(Math.sqrt(r * r - (r - yy) * (r - yy)) * 1.3); px(hx - half, base - r + yy, (yy % 3 === 0) ? '#c8dcec' : '#f4f9ff', half * 2 + 1, 1); }
    for (let yy = 1; yy < r; yy += 3) for (let xx = -10; xx <= 10; xx += 4) px(hx + xx + (yy % 2 ? 2 : 0), base - r + yy, '#b8cde0');
    px(hx + 5, base - 4, '#e6f0f8', 6, 5); px(hx + 7, base - 3, '#1a2a40', 3, 4); px(hx + 7, base - 4, '#1a2a40', 3, 1);
    home(lay, 'penguin', hx + 8, base, 5, 6);
    // 冰滑梯：雪坡 + 一条亮亮的冰道
    const tx = C(cols, SPOTS.snow.slidetop.x), ex = C(cols, SPOTS.snow.slideend.x), th = 7;
    for (let x = tx - 6; x <= ex; x++) { const k = x < tx ? (x - tx + 6) / 6 : 1 - (x - tx) / Math.max(1, ex - tx); const hh = Math.round(th * Math.max(0, k)); px(x, base - hh, '#f4f9ff', 1, hh + 1); if (x >= tx && hh > 0) px(x, base - hh, '#bfe0f4', 1, 1); }
    lay.spots.slidetop = { c: tx, r: base - th, perch: true };
    lay.spots.slideend = { c: ex, r: base };
    lay.spots.pond = { c: cx, r: base };
    lay.spots.snowfield = { c: C(cols, SPOTS.snow.snowfield.x), r: base };
  }

  function home(lay, species, c, r, w, h) {
    lay.spots[species + '_home'] = Object.assign(lay.spots[species + '_home'] || {}, { c, r, home: species });
    lay.homes.push({ species, c, r, x0: c - Math.ceil(w / 2) - 1, x1: c + Math.ceil(w / 2) + 1, y0: r - h - 1, y1: r + 1 });
  }

  PP.PLACES = { forest, meadow, farm, lake, snow };
})();
