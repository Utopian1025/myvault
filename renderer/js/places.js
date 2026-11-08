// 九个地方的布景 + 每只动物的家（和宠物同样大小的像素）
// 构图统一分层：天空 → 远景（山 / 丘 / 沙丘 / 海）→ 中景（树林线）→ 地面（带小路）→ 沿着后排摆的建筑和设施 → 前排少量点缀
// 设施登记：lay.spots[id] = { c, r }（宠物要去的点），lay.homes（家：悬停、点击、门口名牌）
(function () {
  const PP = (window.PP = window.PP || {});
  const A = () => PP.ART;

  // ---------- 地图 ----------
  // 主场景（大的生物群系）→ 次场景（具体的地方）。顺序就是路牌连起来的路；洞穴是高山里套着的次场景（从洞口走进去）
  PP.REGIONS = [
    // 你自己的小天地：认养的动物住在这里（不和野外的路连在一起，从地图直接去）
    { id: 'mine', name: '我的', icon: 'mine', mine: true, subs: [['skyisle', '浮空岛'], ['academy', '魔法学院'], ['undergrove', '地底森林']] },
    { id: 'polar', name: '极地', icon: 'polar', subs: [['antarctic', '南极'], ['snow', '北极冰原']] },
    { id: 'mount', name: '山地', icon: 'mount', subs: [['mountain', '高山'], ['cave', '洞穴']] },
    { id: 'woods', name: '森林', icon: 'woods', subs: [['forest', '温带森林'], ['jungle', '热带雨林']] },
    { id: 'grass', name: '草原', icon: 'grass', subs: [['meadow', '温带草原'], ['savanna', '稀树草原']] },
    { id: 'dry', name: '荒漠', icon: 'dry', subs: [['desert', '沙漠']] },
    { id: 'farmland', name: '农场', icon: 'farmland', subs: [['farm', '农场']] },
    { id: 'water', name: '水域', icon: 'water', subs: [['lake', '湖泊湿地'], ['beach', '海岸'], ['sea', '珊瑚礁']] },
  ];
  PP.WORLD = [];
  PP.REGION_OF = {};
  for (const r of PP.REGIONS) for (const [k, n] of r.subs) { PP.WORLD.push([k, n]); PP.REGION_OF[k] = r.id; }
  // 嵌在别的场景里的次场景：不在路上，从父场景里的入口进去
  PP.NEST = { cave: 'mountain' };
  PP.ISOLATED = { skyisle: 1, academy: 1, undergrove: 1 };
  PP.MINE = ['skyisle', 'academy', 'undergrove'];
  PP.CHAIN = PP.WORLD.map((w) => w[0]).filter((k) => !PP.NEST[k] && !PP.ISOLATED[k]);
  PP.SCENE_ICON = { skyisle: 'isleIco', academy: 'castleIco', undergrove: 'shroomIco', antarctic: 'penguinIco', snow: 'ice', mountain: 'peak', cave: 'caveIco', forest: 'tree', jungle: 'palmIco', meadow: 'flowerIco', savanna: 'acaciaIco', desert: 'cactusIco', farm: 'barnIco', lake: 'lakeIco', beach: 'shellIco', sea: 'coralIco' };
  PP.HOME_NAME = {
    cat: '谷仓阁楼', dog: '狗窝', chick: '鸡舍', pig: '猪圈', rabbit: '兔子洞', hamster: '向日葵下的地洞', fox: '大树根下的狐狸洞',
    hedgehog: '倒木下的落叶窝', dragon: '石头山洞', frog: '大荷叶下的泥窝', duck: '芦苇丛里的鸭窝', capybara: '湖边温泉', penguin: '鹅卵石巢',
    turtle: '珊瑚礁下的海草窝', crab: '沙滩上的大海螺', octopus: '沉船里的陶罐',
    polarbear: '雪坡里的冰洞', arcticfox: '雪地里的小洞', yak: '石头垒的牛圈', alpaca: '山脚的小木棚', snowleopard: '岩壁上的山洞',
    deer: '灌木丛里的草窝', tiger: '大树板根下的阴凉', monkey: '大树上的树屋', parrot: '大树上的树洞', sheep: '羊圈',
    cow: '牛棚', lion: '大石台', zebra: '金合欢树下', antelope: '高草丛', hippo: '水塘', camel: '棕榈树下的帐篷',
    fennec: '沙丘下的洞', meerkat: '狐獴的地道', seagull: '海边的木桩', seal: '冰面上的呼吸孔', gardeneel: '沙地里的小洞', shark: '礁石洞',
    arctichare: '雪窝', albatross: '小土丘上的草巢', marmot: '草原下的地洞', bat: '洞顶的岩缝', brownbear: '洞穴深处的熊窝', porcupine: '石缝里的窝', otter: '水边的石窝',
  };
  // 设施的大致位置（比例）。eco.js 用来决定去哪儿
  const SPOTS = {
    snow: { icehole: 0.52, slidetop: 0.75, slideend: 0.92, pond: 0.46, snowfield: 0.34 },
    antarctic: { shore: 0.5, icefield: 0.42, slidetop: 0.78, slideend: 0.92 },
    cave: { pool: 0.55, mushrooms: 0.3, entrance: 0.06, stalagmites: 0.85 },
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
  const HOME_SCENE = { penguin: 'antarctic', seal: 'antarctic', albatross: 'antarctic', polarbear: 'snow', arcticfox: 'snow', arctichare: 'snow', yak: 'mountain', alpaca: 'mountain', snowleopard: 'mountain', bat: 'cave', brownbear: 'cave', porcupine: 'cave', hedgehog: 'forest', fox: 'forest', dragon: 'forest', deer: 'forest', tiger: 'jungle', monkey: 'jungle', parrot: 'jungle', rabbit: 'meadow', hamster: 'meadow', marmot: 'meadow', lion: 'savanna', zebra: 'savanna', antelope: 'savanna', hippo: 'savanna', camel: 'desert', fennec: 'desert', meerkat: 'desert', cat: 'farm', dog: 'farm', chick: 'farm', pig: 'farm', cow: 'farm', sheep: 'farm', duck: 'lake', frog: 'lake', capybara: 'lake', crab: 'beach', seagull: 'beach', otter: 'beach', turtle: 'sea', octopus: 'sea', gardeneel: 'sea', shark: 'sea' };
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
  // ---------- 新伙伴们的家 ----------
  // 北极熊：雪坡里挖出来的冰洞
  function iceCave(h) {
    const { spr, noise } = A(); const w = Math.round(h * 2), s = spr(w, h), cx = (w + 2) / 2;
    s.ell(cx, h + 1, w / 2, h, (nx, ny, x, y) => { if (ny > 0) return null; const n = noise((cx + x) / 4, (h + y) / 3, 51); return -nx - ny > 0.9 ? '#ffffff' : n < 0.35 ? '#c8dcec' : '#e6f0f8'; });
    s.ell(cx + 2, h + 1, w * 0.2, h * 0.55, (nx, ny) => (ny > 0 ? null : nx * nx + ny * ny > 0.7 ? '#8ab8d8' : '#1e3a5a'));
    for (const [dx, dy] of [[-8, -4], [7, -6]]) s.rect(cx + dx, h + dy, 2, 1, '#a8d4f0');
    return { s: s.outline('#6a8aa8'), door: { x: Math.round(cx + 2) } };
  }
  // 地洞：一个土包 + 洞口（可以换颜色：雪地、沙地）
  function burrow(w, h, pal, holes) {
    const { spr, noise } = A(); const s = spr(w, h);
    s.ell(w / 2 + 1, h + 1, w / 2, h, (nx, ny, x, y) => (ny > 0 ? null : ny < -0.75 ? pal[1] : noise(x / 2, y / 2, 5) < 0.35 ? pal[2] : pal[0]));
    let door = 0;
    holes.forEach((hx0, i) => { const hx = Math.round(w * hx0), r = i ? 2.4 : 3.4; s.ell(hx, h + 1, r, r * 0.9, (nx, ny) => (ny > 0 ? null : ny < -0.6 ? pal[3] : '#2a1a12')); if (!i) door = hx; });
    return { s: s.outline(pal[3]), door: { x: door } };
  }
  // 石头垒的牛圈 + 草顶（牦牛）
  function stoneShelter(h, season) {
    const { spr, hash } = A(); const w = Math.round(h * 1.8), s = spr(w, h), roof = Math.round(h * 0.4);
    for (let y = roof; y <= h; y++) for (let x = 2; x < w; x++) { const bx = Math.floor((x + (Math.floor(y / 3) % 2) * 2) / 4); s.set(x, y, y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0 ? '#5a5a62' : hash(bx, Math.floor(y / 3), 3) < 0.5 ? '#8e8e98' : '#a4a4ae'); }
    for (let y = 1; y <= roof; y++) { const k = y / roof; for (let x = Math.round(w * 0.5 * (1 - k)); x <= w - Math.round(w * 0.5 * (1 - k)) + 1; x++) s.set(x, y, season === 'winter' && y < roof * 0.6 ? '#ffffff' : (x + y) % 3 === 0 ? '#a8883a' : '#c8a84a'); }
    s.rect(Math.round(w * 0.4), h - Math.round(h * 0.42), Math.round(w * 0.22), Math.round(h * 0.42) + 1, '#2a1a12');
    return { s: s.outline('#3a3a42'), door: { x: Math.round(w * 0.51) } };
  }
  // 木头小棚（羊驼、牛）：前面敞开，里面堆着干草
  function shed(h, season, wall, roofCol) {
    const { spr } = A(); const w = Math.round(h * 1.5), s = spr(w, h), roof = Math.round(h * 0.32);
    for (let y = roof; y <= h; y++) for (let x = 2; x < w; x++) s.set(x, y, x % 4 === 0 ? A().shade(wall, -0.25) : wall);
    for (let y = 1; y <= roof; y++) for (let x = 1; x <= w + 1; x++) s.set(x, y, season === 'winter' && y < roof * 0.6 ? '#ffffff' : y % 2 ? roofCol : A().shade(roofCol, -0.15));
    const ox = Math.round(w * 0.22), ow = Math.round(w * 0.56); s.rect(ox, roof + 3, ow, h - roof - 2, '#3a2418');
    s.rect(ox + 1, h - 3, ow - 2, 4, '#d8b04a'); s.hl(ox + 1, h - 3, ow - 2, '#f0cc6a');
    return { s: s.outline('#3a2418'), door: { x: Math.round(w / 2) } };
  }
  // 灌木丛里压出来的草窝（小鹿，露天）
  function thicket(season, R) {
    const { spr, bush } = A(); const a = bush(7, season, R), b2 = bush(6, season, R), s = spr(a.w + b2.w - 6, a.h + 2);
    a.stamp(s, a.w / 2, a.h + 1); b2.stamp(s, a.w + b2.w / 2 - 6, a.h + 2);
    s.ell(s.w / 2, s.h - 1, s.w * 0.25, 1.4, season === 'winter' ? '#e8eef4' : '#c8a84a');
    return { s, door: { x: Math.round(s.w / 2) } };
  }
  // 雨林大树：树洞（鹦鹉）、树屋（猴子）、粗大的板根（老虎）
  function bigTree(h, R, kind) {
    const { spr, jungleTree } = A(); const t = jungleTree(h, R), s = spr(t.w + 10, h + 2), cx = Math.round(s.w / 2);
    t.stamp(s, s.w / 2, h + 1);
    let door = { x: cx }, perch = null;
    if (kind === 'hollow') { const hy = Math.round(h * 0.62); s.ell(cx, hy, 2.4, 3, (nx, ny) => (nx * nx + ny * ny > 0.6 ? '#3a2418' : '#120c08')); perch = { x: cx, y: hy + 3 }; }
    if (kind === 'house') {
      const py = Math.round(h * 0.5); s.rect(cx - 9, py, 19, 2, '#8a5e3a'); s.hl(cx - 9, py, 19, '#a87a54');
      s.rect(cx - 6, py - 7, 12, 7, '#a87a54'); for (let y = py - 7; y < py; y += 2) s.hl(cx - 6, y, 12, '#8a5e3a');
      for (let y = 0; y < 4; y++) s.hl(cx - 7 + y, py - 8 - y, 14 - y * 2, '#5a8a3a');
      s.rect(cx - 2, py - 5, 3, 5, '#2a1a12');
      for (let y = py + 2; y < h; y += 3) { s.set(cx + 7, y, '#c8a060'); s.set(cx + 7, y + 1, '#8a6a3a'); }
      perch = { x: cx, y: py };
    }
    if (kind === 'roots') for (const dx of [-9, -5, 5, 9]) for (let k = 0; k < 6; k++) s.rect(cx + dx + Math.sign(dx) * k, h - 5 + k, 2, 1, '#5a3d2b');
    return { s: s.outline('#123a1e'), door, perch };
  }
  // 羊圈：一圈矮栅栏，里面铺着干草（露天）
  function pen(w, season) {
    const { spr, fence } = A(); const f = fence(w, season === 'winter'), s = spr(w + 2, f.h + 3);
    s.ell(s.w / 2, s.h - 1, s.w * 0.4, 2, season === 'winter' ? '#e8eef4' : '#d8b04a');
    f.stamp(s, s.w / 2, f.h);
    return { s, door: { x: Math.round(s.w / 2) } };
  }
  // 草原：平顶的金合欢树
  function acacia(h, R, season) {
    const { spr, noise } = A(); const w = Math.round(h * 1.5), s = spr(w, h), cx = (w + 2) / 2, th = Math.round(h * 0.62);
    for (let y = 0; y < th; y++) { const yy = h + 1 - y; s.rect(Math.round(cx - 1 + Math.sin(y / 6) * 1.5), yy, 3, 1, '#6a4a30'); }
    for (const dx of [-1, 1]) for (let k = 0; k < 8; k++) s.rect(Math.round(cx + dx * k * 1.4), h + 1 - th + 4 - k, 2, 1, '#6a4a30');
    const L = season === 'autumn' ? ['#7a7a2a', '#9a9a3a', '#b8b04a'] : ['#3f6a2a', '#56823a', '#72a04a'];
    s.ell(cx, h * 0.24, w / 2 - 1, h * 0.17, (nx, ny, x, y) => { const n = noise((cx + x) / 3, y / 2, 61); if (ny > 0.55 && n < 0.5) return null; return ny < -0.3 ? L[2] : n < 0.4 ? L[0] : L[1]; });
    return s.outline('#2a3a1a');
  }
  // 狮子的大石台（露天，喜欢趴在上面）
  function prideRock(h, R) {
    const { spr, hash } = A(); const w = Math.round(h * 2.2), s = spr(w, h);
    for (let y = 0; y <= h; y++) { const k = y / h, x0 = Math.round(w * 0.1 * (1 - k)) + 1, x1 = w - Math.round(w * 0.35 * Math.max(0, 1 - k * 1.8)); for (let x = x0; x <= x1; x++) s.set(x, y, y < 2 ? '#d8b88a' : hash(x, y, 7) < 0.1 ? '#8a6a4a' : x < w * 0.3 ? '#c8a070' : '#a88458'); }
    return { s: s.outline('#5a4028'), door: { x: Math.round(w * 0.4) }, top: 0 };
  }
  // 海鸥：海边的木桩，桩顶上是草窝
  function gullPost(h) {
    const { spr } = A(); const s = spr(12, h);
    s.rect(5, 4, 3, h - 3, '#8a6a4a'); for (let y = 6; y < h; y += 4) s.hl(5, y, 3, '#6a4a30');
    s.ell(6.5, 4, 5, 2, '#c8a860'); s.ell(6.5, 3.4, 3, 1, '#8a7040');
    return { s: s.outline('#3a2a1a'), door: { x: 6 } };
  }
  // 海底：鲨鱼的大礁石洞、花园鳗的沙洞群
  function reefCave(h) {
    const { spr, noise } = A(); const w = Math.round(h * 2.2), s = spr(w, h), cx = (w + 2) / 2;
    s.ell(cx, h + 1, w / 2, h, (nx, ny, x, y) => { if (ny > 0) return null; const n = noise((cx + x) / 3, (h + y) / 3, 81); return n < 0.3 ? '#3a5a7a' : n < 0.6 ? '#4a6a8a' : '#5a7a9a'; });
    s.ell(cx, h + 1, w * 0.26, h * 0.6, (nx, ny) => (ny > 0 ? null : '#0a1a2e'));
    for (const [dx, c] of [[-w * 0.3, '#ff7a8a'], [w * 0.32, '#ffcf33'], [w * 0.1, '#b98cff']]) { s.rect(cx + dx, 2, 2, 3, c); s.set(cx + dx - 1, 2, c); }
    return { s: s.outline('#1a2a3a'), door: { x: Math.round(cx) } };
  }
  function sandHoles(w) {
    const { spr } = A(); const s = spr(w, 3);
    for (let i = 0; i < 5; i++) { const x = 3 + i * Math.round((w - 6) / 4); s.ell(x, 2, 2, 1, '#8a7a5a'); s.set(x, 2, '#3a2a1a'); }
    return { s, door: { x: Math.round(w / 2) } };
  }
  // ---------- 极地 / 洞穴 / 海岸 ----------
  // 企鹅：冰面上一圈圈鹅卵石垒的小巢（露天，一大群挤在一起）
  function pebbleNest(w) {
    const { spr, hash } = A(); const s = spr(w, 5);
    for (let i = 0; i < 3; i++) { const cx = 4 + i * Math.round((w - 8) / 2), cy = 3 + (i % 2); for (let a = 0; a < 12; a++) { const x = Math.round(cx + Math.cos(a / 12 * Math.PI * 2) * 3.4), y = Math.round(cy + Math.sin(a / 12 * Math.PI * 2) * 1.4); s.set(x, y, hash(x, y, 9) < 0.5 ? '#8a8a96' : '#6a6a78'); } s.set(cx, cy, '#5a5a66'); }
    return { s, door: { x: Math.round(w / 2) } };
  }
  // 海豹：冰面上的呼吸孔（露天，趴在旁边）
  function breathingHole(w) {
    const { spr } = A(); const s = spr(w, 6);
    s.ell(w / 2, 3.4, w / 2 - 1, 2.6, (nx, ny) => (nx * nx + ny * ny > 0.55 ? (ny < 0 ? '#ffffff' : '#c8dcec') : ny < -0.2 ? '#2a5a8a' : '#1a3a6a'));
    s.set(Math.round(w / 2) - 2, 3, '#7ab8e8');
    return { s, door: { x: Math.round(w / 2) } };
  }
  // 信天翁：小土丘顶上用草和泥堆的巢
  function tussockNest(h, R) {
    const { spr, noise } = A(); const w = Math.round(h * 2.2), s = spr(w, h), cx = (w + 2) / 2;
    s.ell(cx, h + 1, w / 2, h - 2, (nx, ny, x, y) => (ny > 0 ? null : noise((cx + x) / 3, (h + y) / 3, 91) < 0.4 ? '#6a6a5a' : '#8a8a70'));
    for (let k = 0; k < 14; k++) { const x = Math.round(3 + R() * (w - 6)), y = Math.round(h * 0.4 + R() * h * 0.4); s.set(x, y, '#7a9a4a'); s.set(x, y - 1, '#9aba5a'); }
    s.ell(cx, 3, 5, 2, '#8a7040'); s.ell(cx, 2.6, 3, 1, '#5a4a2a');
    return { s: s.outline('#3a3a2a'), door: { x: Math.round(cx) }, perchY: 2 };
  }
  // 蝙蝠：洞顶垂下来的岩缝（倒挂在这里睡觉）
  function batRoost(w, h) {
    const { spr, noise } = A(); const s = spr(w, h);
    for (let x = 1; x <= w; x++) { const d = Math.round(h * (0.35 + 0.65 * Math.abs(Math.sin(x / w * Math.PI)) * (0.7 + noise(x / 3, 0, 33) * 0.3))); for (let y = 0; y < d; y++) s.set(x, y, noise(x / 2, y / 2, 34) < 0.35 ? '#6a6274' : '#7e7688'); }
    s.rect(Math.round(w * 0.3), Math.round(h * 0.15), Math.round(w * 0.4), Math.round(h * 0.3), '#120e16');
    return { s: s.outline('#1a1620'), door: { x: Math.round(w / 2) } };
  }
  // 棕熊：洞穴深处的凹进去的石窝，铺着干草
  function bearDen(h) {
    const { spr, noise } = A(); const w = Math.round(h * 1.9), s = spr(w, h), cx = (w + 2) / 2;
    s.ell(cx, h + 1, w / 2, h, (nx, ny, x, y) => (ny > 0 ? null : noise((cx + x) / 3, (h + y) / 3, 35) < 0.4 ? '#4a4048' : '#5a5058'));
    s.ell(cx, h + 1, w * 0.32, h * 0.7, (nx, ny) => (ny > 0 ? null : '#140e12'));
    s.rect(Math.round(cx - w * 0.24), h - 2, Math.round(w * 0.48), 3, '#a8883a'); s.hl(Math.round(cx - w * 0.24), h - 2, Math.round(w * 0.48), '#c8a84a');
    return { s: s.outline('#1a1418'), door: { x: Math.round(cx) } };
  }
  // 高山上的洞口（通往洞穴）
  function caveMouth(h) {
    const { spr, noise } = A(); const w = Math.round(h * 1.8), s = spr(w, h), cx = (w + 2) / 2;
    s.ell(cx, h + 1, w / 2, h, (nx, ny, x, y) => { if (ny > 0) return null; const n = noise((cx + x) / 3, (h + y) / 3, 36); return -nx - ny > 0.9 ? '#b4b4c0' : n < 0.35 ? '#7a7a88' : '#8e8e9a'; });
    s.ell(cx, h + 1, w * 0.28, h * 0.68, (nx, ny) => (ny > 0 ? null : ny < -0.6 ? '#1a1620' : '#0a080c'));
    for (const dx of [-4, -1, 3]) s.rect(Math.round(cx + dx), Math.round(h * 0.38), 1, 2, '#5a5a66');
    return { s: s.outline('#3a3a46'), door: { x: Math.round(cx) } };
  }
  PP.HOMES = { pebbleNest, breathingHole, tussockNest, batRoost, bearDen, caveMouth, barn, kennel, coop, sty, igloo, mound, foxDen, leafNest, cave, duckNest, hotSpring, lilyHome, reefArch, conch, wreck, iceCave, burrow, stoneShelter, shed, thicket, bigTree, pen, acacia, prideRock, gullPost, reefCave, sandHoles };
})();
