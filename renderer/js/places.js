// 九个地方的布景 + 每只动物的家（和宠物同样大小的像素）
// 构图统一分层：天空 → 远景（山 / 丘 / 沙丘 / 海）→ 中景（树林线）→ 地面（带小路）→ 沿着后排摆的建筑和设施 → 前排少量点缀
// 设施登记：lay.spots[id] = { c, r }（宠物要去的点），lay.homes（家：悬停、点击、门口名牌）
(function () {
  const PP = (window.PP = window.PP || {});
  const A = () => PP.ART;

  // ---------- 地图 ----------
  PP.WORLD = [
    ['snow', '雪原'], ['mountain', '高山'], ['forest', '森林'], ['jungle', '雨林'], ['lake', '湖边'], ['meadow', '草地'],
    ['farm', '农场'], ['desert', '沙漠'], ['beach', '海滩'], ['sea', '海底'],
  ];
  PP.HOME_NAME = {
    cat: '谷仓阁楼', dog: '狗窝', chick: '鸡舍', pig: '猪圈', rabbit: '兔子洞', hamster: '向日葵下的地洞', fox: '大树根下的狐狸洞',
    hedgehog: '倒木下的落叶窝', dragon: '石头山洞', frog: '大荷叶下的泥窝', duck: '芦苇丛里的鸭窝', capybara: '湖边温泉', penguin: '冰屋',
    turtle: '珊瑚礁下的海草窝', crab: '礁石边的大海螺', octopus: '沉船里的陶罐',
  };
  // 设施的大致位置（比例）。eco.js 用来决定去哪儿
  const SPOTS = {
    snow: { penguin_home: 0.2, icehole: 0.52, slidetop: 0.75, slideend: 0.92, pond: 0.46, snowfield: 0.34 },
    mountain: { stream: 0.62, meadow: 0.36, cairn: 0.2, ledge: 0.82 },
    forest: { hedgehog_home: 0.12, fox_home: 0.3, berries: 0.47, brook: 0.555, berries2: 0.64, mushrooms: 0.73, dragon_home: 0.85, sunrock: 0.95, leaves: 0.21, log: 0.12, shade: 0.4 },
    lake: { duck_home: 0.08, reeds: 0.15, frog_home: 0.3, lily: 0.4, swim: 0.24, dock: 0.5, shore: 0.66, capybara_home: 0.84 },
    meadow: { rabbit_home: 0.2, clover: 0.33, flowers: 0.45, grass: 0.52, sunflowers: 0.62, hamster_home: 0.665, puddle: 0.79, hill: 0.9 },
    farm: { cat_home: 0.13, catbowl: 0.215, hay: 0.27, fence: 0.31, dog_home: 0.38, dogbowl: 0.425, trough: 0.47, chick_home: 0.54, feed: 0.6, apple: 0.66, pig_home: 0.74, mud: 0.79, veg: 0.89, barnroof: 0.13, yard: 0.5 },
    desert: { oasis: 0.5, dunes: 0.25, cactus: 0.78, rocks: 0.12 },
    beach: { tidepool: 0.3, sand: 0.55, waves: 0.45, driftwood: 0.75 },
    jungle: { river: 0.5, ferns: 0.25, bigtree: 0.7, flowers: 0.85 },
    sea: { turtle_home: 0.18, seagrass: 0.3, kelp: 0.42, crab_home: 0.52, sandflat: 0.6, coral: 0.7, octopus_home: 0.84, clam: 0.93, reef: 0.2 },
  };
  PP.SPOTS = SPOTS;
  const HOME_SCENE = { penguin: 'snow', hedgehog: 'forest', fox: 'forest', dragon: 'forest', duck: 'lake', frog: 'lake', capybara: 'lake', turtle: 'sea', crab: 'sea', octopus: 'sea', rabbit: 'meadow', hamster: 'meadow', cat: 'farm', dog: 'farm', chick: 'farm', pig: 'farm' };
  PP.HOME_SCENE = HOME_SCENE;

  // ---------- 家（精灵） ----------
  function barn(h, season) {
    const { spr, shade } = A(); const w = Math.round(h * 1.05), s = spr(w, h), cx = Math.round((w + 2) / 2);
    const wallTop = Math.round(h * 0.42), red = '#b8362e';
    // 墙：竖木板
    for (let y = wallTop; y <= h; y++) for (let x = 3; x < w - 1; x++) s.set(x, y, x % 4 === 0 ? '#8e2620' : (x + y * 3) % 23 === 0 ? '#a02c26' : x < w * 0.3 ? '#c84238' : red);
    // 复折屋顶：瓦片
    for (let y = 1; y < wallTop + 2; y++) {
      const k = y / (wallTop + 1), half = Math.round(k < 0.45 ? (w / 2 - 2) * (0.35 + k * 1.2) : (w / 2) * (0.85 + (k - 0.45) * 0.3));
      for (let x = -half; x <= half; x++) { let c = (y % 3 === 0 || (x + (y % 6 < 3 ? 0 : 2)) % 4 === 0) ? '#4a3430' : x < 0 ? '#6a4c44' : '#5a3e38'; if (season === 'winter' && (y < 4 || (k < 0.5 && hash2(x, y) < 0.4))) c = '#ffffff'; s.set(cx + x, y, c); }
    }
    s.hl(2, wallTop + 1, w - 2, '#f0e6d8'); s.hl(2, wallTop + 2, w - 2, '#d8ccbc');
    // 阁楼门（开着，里面有干草，晚上有灯）
    const lx = cx - 5, ly = Math.round(wallTop * 0.45);
    s.rect(lx, ly, 11, 9, '#f0e6d8'); s.rect(lx + 1, ly + 1, 9, 7, '#2a1c1c'); s.rect(lx + 1, ly + 5, 9, 3, '#d4a43a'); s.hl(lx + 1, ly + 5, 9, '#f0cc6a');
    // 大门：白色 X
    const dw = Math.round(w * 0.22), dh = Math.round((h - wallTop) * 0.72), dx = cx - dw, dy = h + 1 - dh;
    s.rect(dx, dy, dw * 2 + 1, dh, '#8e2620');
    for (let k = 0; k < dh; k++) { const t = Math.round((k / dh) * (dw - 1)); for (const ox of [0, dw + 1]) { s.set(dx + ox + t, dy + k, '#f0e6d8'); s.set(dx + ox + dw - 1 - t, dy + k, '#f0e6d8'); } }
    s.rect(dx, dy, dw * 2 + 1, 1, '#f0e6d8'); s.vl(dx, dy, dh, '#f0e6d8'); s.vl(dx + dw, dy, dh, '#f0e6d8'); s.vl(dx + dw * 2, dy, dh, '#f0e6d8');
    // 风向鸡
    s.vl(cx, 0, 2, '#3a3a44');
    s.outline('#4a1c18');
    return { s, door: { x: cx, w: dw * 2 }, loft: { x: lx + 5, y: ly + 3 } };
  }
  function hash2(x, y) { return A().hash(x, y, 77); }
  function kennel(h, season) {
    const { spr } = A(); const w = Math.round(h * 1.15), s = spr(w, h), cx = Math.round((w + 2) / 2), roofH = Math.round(h * 0.42);
    for (let y = roofH; y <= h; y++) for (let x = 3; x < w - 1; x++) s.set(x, y, y % 3 === 0 ? '#a8703f' : x < w * 0.35 ? '#d49a62' : '#c48a52');
    for (let y = 1; y <= roofH; y++) { const half = Math.round((y / roofH) * (w / 2)); for (let x = -half; x <= half; x++) s.set(cx + x, y, season === 'winter' && y < roofH * 0.5 ? '#ffffff' : (x + y) % 3 === 0 ? '#7a2c22' : '#9a3a2c'); }
    s.ell(cx, h - 2, w * 0.2, h * 0.38, (nx, ny) => (ny > 0.6 ? null : '#2a1a12'));
    s.rect(cx - 4, roofH + 2, 9, 3, '#f0e6d8'); s.hl(cx - 3, roofH + 3, 7, '#8a5a3a');
    s.outline('#4a2a18');
    return { s };
  }
  function coop(h, season) {
    const { spr } = A(); const w = Math.round(h * 1.0), s = spr(w, h), cx = Math.round((w + 2) / 2), legs = Math.round(h * 0.22), roofH = Math.round(h * 0.3);
    const bodyTop = roofH, bodyBot = h - legs;
    for (let y = bodyTop; y <= bodyBot; y++) for (let x = 3; x < w - 1; x++) s.set(x, y, x % 3 === 0 ? '#d8b88a' : '#ecd2a8');
    for (let y = 1; y <= roofH; y++) { const half = Math.round((y / roofH) * (w / 2)); for (let x = -half; x <= half; x++) s.set(cx + x, y, season === 'winter' && y < 4 ? '#ffffff' : y % 2 ? '#c8552a' : '#a8442a'); }
    s.rect(cx - 3, bodyBot - 7, 6, 7, '#3a2a20'); s.rect(cx + 5, bodyTop + 3, 5, 4, '#ffd27a'); s.vl(cx + 7, bodyTop + 3, 4, '#a87a54');
    for (const lx of [5, w - 4]) s.rect(lx, bodyBot + 1, 2, legs, '#7a5234');
    for (let k = 0; k < legs + 2; k++) s.rect(cx - 6 - k, bodyBot + k, 4, 1, k % 2 ? '#a8865a' : '#c9a878');
    s.outline('#5a3a20');
    return { s, door: { x: cx - 8 } };
  }
  function sty(h, season) {
    const { spr } = A(); const w = Math.round(h * 1.5), s = spr(w, h), roofH = Math.round(h * 0.35);
    const sw = Math.round(w * 0.55);
    for (let y = roofH; y <= h; y++) for (let x = 2; x < sw; x++) s.set(x, y, y % 3 === 0 ? '#7a4a30' : '#9a6440');
    for (let y = 1; y <= roofH; y++) for (let x = 1; x < sw + 2; x++) s.set(x, y, season === 'winter' && y < 3 ? '#ffffff' : y % 2 ? '#6a4438' : '#5a3a30');
    s.ell(Math.round(sw / 2), h - 2, sw * 0.22, h * 0.35, (nx, ny) => (ny > 0.6 ? null : '#2a1a12'));
    // 矮栅栏
    for (let x = sw; x < w + 1; x += 4) s.rect(x, h - 6, 1, 7, '#c9a878');
    s.hl(sw, h - 5, w - sw + 2, '#a8865a'); s.hl(sw, h - 2, w - sw + 2, '#a8865a');
    s.outline('#3a2418');
    return { s, door: { x: Math.round(sw / 2) } };
  }
  function igloo(h) {
    const { spr } = A(); const w = Math.round(h * 2.1), s = spr(w, h), cx = Math.round(w * 0.42);
    s.ell(cx, h + 1, w * 0.4, h, (nx, ny, x, y) => { if (ny > 0) return null; const row = Math.floor((y + h) / 4), off = row % 2 ? 3 : 0; if ((y + h) % 4 === 0 || (x + off + 100) % 7 === 0) return '#b8cde0'; return nx < -0.3 ? '#ffffff' : nx < 0.4 ? '#eef5fc' : '#d6e4f0'; });
    // 入口隧道
    const tx = Math.round(w * 0.82);
    s.ell(tx, h + 1, w * 0.17, h * 0.5, (nx, ny, x, y) => (ny > 0 ? null : ((y + 50) % 4 === 0 ? '#b8cde0' : '#e6f0f8')));
    s.ell(tx + 2, h + 1, w * 0.08, h * 0.32, (nx, ny) => (ny > 0 ? null : '#1a2a40'));
    s.outline('#6a8aa8');
    return { s, door: { x: tx + 2 } };
  }
  function mound(w, h, season, holeX) {
    const { spr, noise } = A(); const s = spr(w, h);
    const g = season === 'winter' ? ['#e6eef6', '#ffffff', '#c8d6e4'] : season === 'autumn' ? ['#a8963a', '#c4b050', '#8a7a2a'] : ['#5aa64e', '#7cc35a', '#3f8a44'];
    s.ell(w / 2 + 1, h + 1, w / 2, h, (nx, ny, x, y) => (ny > 0 ? null : ny < -0.75 ? g[1] : noise(x / 2, y / 2, 3) < 0.35 ? g[2] : g[0]));
    const hx = Math.round(w * holeX);
    s.ell(hx, h + 1, Math.max(3, w * 0.13), Math.max(3, h * 0.6), (nx, ny) => (ny > 0 ? null : ny < -0.7 ? '#6a4a30' : '#2a1a12'));
    s.rect(hx - 4, h, 9, 2, '#8a6448');
    return { s: s.outline(season === 'winter' ? '#8aa0b4' : '#2c5a2c'), door: { x: hx } };
  }
  function foxDen(h, season, R) {
    const { spr, broadleaf } = A(); const tree = broadleaf(h, season, R, 'oak');
    const w = tree.w + 8, s = spr(w, h + 2); tree.stamp(s, w / 2, h + 1);
    // 树根 + 洞口
    const cx = Math.round(w / 2);
    for (const [dx, len] of [[-6, 7], [-3, 4], [4, 5], [7, 8]]) for (let i = 0; i < len; i++) s.set(cx + dx + Math.sign(dx) * i, h - 1 + (i > len / 2 ? 1 : 0), '#5a3d2b');
    s.ell(cx, h + 2, 6, 5, (nx, ny) => (ny > 0 ? null : ny < -0.7 ? '#4a3020' : '#1a1210'));
    s.rect(cx - 9, h + 1, 18, 2, '#8a6448'); s.hl(cx - 8, h + 1, 16, '#a8805a');
    return { s, door: { x: cx } };
  }
  function leafNest(season) {
    const { spr, BARK } = A(); const s = spr(34, 12);
    s.rect(2, 3, 28, 7, BARK[1]); s.hl(2, 3, 28, BARK[3]); s.hl(2, 9, 28, BARK[0]); for (let x = 5; x < 28; x += 6) s.vl(x, 4, 4, BARK[0]);
    s.ell(31, 6.5, 3, 3.5, (nx, ny) => (nx * nx + ny * ny < 0.35 ? '#2a1a12' : '#c99a6a'));
    for (let k = 0; k < 40; k++) { const x = 3 + ((k * 7) % 24), y = 9 + (k % 3); s.set(x, y, season === 'winter' ? (k % 3 ? '#ffffff' : '#c9a07a') : ['#d9662a', '#e8963a', '#c49a3a', '#a65a2a'][k % 4]); s.set(x + 1, y, ['#e8963a', '#d9662a'][k % 2]); }
    s.ell(17, 10, 3, 2, '#2a1a12');
    if (season !== 'winter') { s.rect(9, 1, 2, 2, '#d9342b'); s.set(9, 3, '#f4ead8'); s.rect(4, 2, 6, 1, '#5f9a4a'); }
    return { s: s.outline('#3a2418'), door: { x: 17 } };
  }
  function cave(h, season) {
    const { spr, noise } = A(); const w = Math.round(h * 1.9), s = spr(w, h), cx = (w + 2) / 2;
    s.ell(cx, h + 1, w / 2, h, (nx, ny, x, y) => { if (ny > 0) return null; const n = noise((cx + x) / 4, (h + y) / 3, 41); let c = n < 0.3 ? '#5e5e6c' : n < 0.6 ? '#7a7a88' : '#8e8e9c'; if (-nx - ny > 0.9) c = '#a4a4b0'; if (season === 'winter' && ny < -0.7) c = '#ffffff'; return c; });
    s.ell(cx, h + 1, w * 0.18, h * 0.55, (nx, ny) => (ny > 0 ? null : '#120e16'));
    for (const [dx, dy] of [[-4, -3], [3, -5], [5, -2]]) { s.set(cx + dx, h + dy, '#7fe0ff'); s.set(cx + dx, h + dy - 1, '#c8f4ff'); }
    s.rect(cx + w * 0.25, h * 0.3, 4, 1, '#5f9a4a');
    return { s: s.outline('#2a2a34'), door: { x: Math.round(cx) } };
  }
  function duckNest(season) {
    const { spr, reeds } = A(); const s = spr(30, 22);
    reeds(20, season).stamp(s, 8, 18); reeds(18, season).stamp(s, 22, 19);
    s.ell(15, 19, 9, 3.2, (nx, ny, x) => (ny < -0.4 ? '#c9a878' : (x % 2 ? '#a8865a' : '#8a6a44')));
    s.ell(15, 18, 6, 1.6, '#5a4430');
    if (season !== 'winter') { s.ell(13, 17, 1.4, 1.1, '#f4f0e0'); s.ell(16, 17, 1.4, 1.1, '#e8f0d8'); }
    return { s: s.outline('#3a2a18'), door: { x: 15 } };
  }
  function hotSpring() {
    const { spr, rock } = A(); const s = spr(44, 12);
    s.ell(22, 8, 19, 4.5, (nx, ny) => (ny < -0.55 ? '#d8f4f4' : ny < 0 ? '#9adcdc' : '#7ac8cc'));
    for (let k = 0; k < 9; k++) { const a = Math.PI * (k / 8), x = 22 + Math.cos(a) * 21, y = 8 - Math.sin(a) * 5.5; rock(2 + (k % 3), Math.random, false, '#8a8a96').stamp(s, x, y + 3); }
    rock(3, Math.random, false).stamp(s, 3, 12); rock(3, Math.random, false).stamp(s, 41, 12);
    return { s: s, door: { x: 22 } };
  }
  function lilyHome(season, ice) {
    const { spr } = A(); const s = spr(26, 7);
    if (ice) { s.ell(13, 4, 11, 2.5, '#b8d8ea'); return { s, door: { x: 13 } }; }
    s.ell(13, 4, 12, 3, (nx, ny) => (nx > 0.05 && nx < 0.22 && ny < 0 ? null : ny < -0.2 ? '#6ab05a' : nx > 0.5 ? '#2f6f2a' : '#3f8a44'));
    for (let k = 0; k < 6; k++) s.set(13 + Math.round(Math.cos(k) * 8), 4 + Math.round(Math.sin(k) * 2), '#2f6f2a');
    if (season === 'summer' || season === 'spring') { s.ell(20, 1.5, 2.2, 1.6, '#ff9fc0'); s.set(20, 0, '#ffe0ec'); }
    return { s: s.outline('#1f4a1f'), door: { x: 13 } };
  }
  // ---- 海底的家 ----
  // 海龟：一座珊瑚拱门，下面铺着海草
  function reefArch(h) {
    const { spr, hash, shade } = A(); const w = Math.round(h * 1.5), s = spr(w, h);
    const cx = (w + 2) / 2, R = w / 2 - 1;
    for (let y = 1; y <= h; y++) for (let x = 1; x <= w; x++) {
      const nx = (x - cx) / R, ny = (y - h) / (h - 1); const out = nx * nx + ny * ny <= 1, inn = (nx * nx) / 0.42 + (ny * ny) / 0.62 <= 1;
      if (!out || inn) continue;
      const n = hash(x >> 1, y >> 1, 3); s.set(x, y, n < 0.25 ? '#c85a6a' : n < 0.5 ? '#e8806a' : n < 0.8 ? '#d86a7a' : '#f4a890');
    }
    for (let k = 0; k < 9; k++) { const x = Math.round(cx - R * 0.6 + k * R * 0.15), hh = 3 + (k % 3); for (let y = 0; y < hh; y++) s.set(x + (y % 2), h - y, k % 2 ? '#3f8a44' : '#5aa64e'); }
    for (const [x, y, c] of [[cx - R * 0.7, h * 0.35, '#ffcf33'], [cx + R * 0.6, h * 0.3, '#b98cff'], [cx, 3, '#ff8fb0']]) { s.set(x, y, c); s.set(x + 1, y, c); s.set(x, y - 1, shade(c, 0.4)); }
    return { s: s.outline('#5a2a34'), door: { x: Math.round(cx) } };
  }
  // 螃蟹：一个侧躺的大海螺，螺口朝前
  function conch(h) {
    const { spr, mix } = A(); const w = Math.round(h * 1.6), s = spr(w, h);
    for (let k = 0; k < 4; k++) { const cx = w * (0.32 + k * 0.13), rr = h * (0.5 - k * 0.1); s.ell(cx, h - rr + 1, rr * 1.1, rr, (nx, ny) => (ny < -0.4 ? '#fbeedc' : nx > 0.5 ? '#d8b49a' : k % 2 ? '#f0d4b8' : '#e8c4a8')); }
    s.ell(w * 0.32, h - h * 0.38, h * 0.36, h * 0.34, (nx, ny) => (nx * nx + ny * ny < 0.45 ? mix('#ff9aa8', '#3a1a20', 0.6 + ny * 0.3) : '#ffc4c8'));
    for (let k = 0; k < 5; k++) s.set(Math.round(w * (0.45 + k * 0.1)), Math.round(h * 0.4 + (k % 2)), '#b89478');
    return { s: s.outline('#7a5040'), door: { x: Math.round(w * 0.32) } };
  }
  // 章鱼：半埋在沙里的小沉船，船肚子里有个陶罐
  function wreck(h) {
    const { spr, hash } = A(); const w = Math.round(h * 2.2), s = spr(w, h);
    const tilt = (x) => Math.round((x / w) * 4);
    for (let x = 2; x < w; x++) { const top = Math.round(h * 0.38) + tilt(x), bot = h - Math.round(Math.abs(x - w / 2) / (w / 2) * h * 0.25); for (let y = top; y <= bot; y++) s.set(x, y, (y - top) % 4 === 0 ? '#3e2a1e' : hash(x, y, 2) < 0.06 ? '#5a8a6a' : x < w * 0.4 ? '#6b4630' : '#5a3a26'); }
    s.rect(Math.round(w * 0.62), 1, 2, Math.round(h * 0.42), '#4a3022'); s.rect(Math.round(w * 0.62) - 5, 4, 8, 1, '#4a3022');
    for (let k = 0; k < 6; k++) s.set(Math.round(w * 0.62) + 2, 6 + k * 2, '#5aa64e');
    // 破洞 + 陶罐
    const px = Math.round(w * 0.36), py = h - 4;
    s.ell(px, py, 5, 4, '#1a1410');
    s.ell(px, py + 1, 3, 3, (nx, ny) => (nx < -0.3 ? '#e09a6a' : '#c8784a')); s.rect(px - 1, py - 3, 3, 2, '#c8784a'); s.rect(px - 1, py - 3, 3, 1, '#2a1410');
    s.set(Math.round(w * 0.75), Math.round(h * 0.6), '#bfe6ff'); s.set(Math.round(w * 0.75) + 1, Math.round(h * 0.6), '#bfe6ff');
    return { s: s.outline('#2a1a10'), door: { x: px } };
  }
  PP.HOMES = { barn, kennel, coop, sty, igloo, mound, foxDen, leafNest, cave, duckNest, hotSpring, lilyHome, reefArch, conch, wreck };
})();
