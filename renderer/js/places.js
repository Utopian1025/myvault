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

  // 精修：一大堆石块垒成的小山包（每块石头自己有亮面暗面、石缝是深色线、顶上可以长苔 / 盖雪 / 结冰），中间一个有深度的洞口
  function rockMound(h, wf, pal, opt = {}) {
    const { spr, mix, hash } = A(), w = Math.round(h * wf), s = spr(w, h), cx = (w + 2) / 2, seed = Math.round(h * 7 + wf * 13);
    const pts = []; for (let i = 0; i < Math.round(w * h / 28); i++) pts.push([1 + hash(i, 1, seed) * w, 1 + hash(i, 2, seed) * h]);
    const id = new Int16Array((w + 2) * (h + 2)).fill(-1);
    for (let y = 0; y <= h + 1; y++) for (let x = 0; x <= w + 1; x++) {
      const nx = (x - cx) / (w / 2), ny = (y - (h + 1)) / h; if (nx * nx + ny * ny > 1 || ny > 0) continue;
      const wob = (hash(Math.floor(x / 3), Math.floor(y / 3), seed + 5) - 0.5) * 0.12; if (nx * nx + ny * ny > 1 - Math.abs(wob)) continue;
      let best = 0, bd = 1e9; for (let i = 0; i < pts.length; i++) { const d = (pts[i][0] - x) ** 2 + ((pts[i][1] - y) * 1.3) ** 2; if (d < bd) { bd = d; best = i; } } id[y * (w + 2) + x] = best;
    }
    for (let y = 0; y <= h + 1; y++) for (let x = 0; x <= w + 1; x++) {
      const k = id[y * (w + 2) + x]; if (k < 0) continue;
      const edge = [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => { const q = id[(y + dy) * (w + 2) + x + dx]; return q !== undefined && q >= 0 && q !== k; });
      const [px, py] = pts[k], lx = (x - px) / 4, ly = (y - py) / 4, l = -lx * 0.6 - ly * 0.9 + (hash(k, 3, seed) - 0.5) * 0.6 - (y / h) * 0.3;
      let c = l > 0.8 ? pal[4] : l > 0.25 ? pal[3] : l > -0.3 ? pal[2] : pal[1];
      if (edge) c = pal[0];
      const top = !id[(y - 1) * (w + 2) + x] || id[(y - 1) * (w + 2) + x] < 0;
      if (opt.top && (top || (y < h * 0.45 && hash(x, y, seed + 9) < 0.25 && l > 0))) c = opt.top[hash(x, y, seed + 8) < 0.5 ? 0 : 1];
      if (opt.moss && !edge && l > 0.1 && hash(x, y, seed + 7) < 0.18) c = opt.moss;
      if (hash(x, y, seed + 6) < 0.04 && !edge) c = pal[1];
      s.set(x, y, c);
    }
    // 洞口：外圈一圈亮一点的石头，里面越往深越黑
    const dw = w * (opt.door || 0.2), dh = h * 0.58;
    s.ell(cx, h + 1, dw + 2, dh + 2, (nx, ny) => (ny > 0 ? null : nx < 0 ? pal[3] : pal[2]));
    s.ell(cx, h + 1, dw + 1, dh + 1, (nx, ny) => (ny > 0 ? null : pal[0]));
    s.ell(cx, h + 1, dw, dh, (nx, ny) => (ny > 0 ? null : nx * nx + ny * ny < 0.35 ? '#07050a' : nx * nx + ny * ny < 0.7 ? '#110c16' : '#1e1824'));
    if (opt.inside) opt.inside(s, cx, h, dw, dh);
    for (let k = 0; k < 4; k++) { const x = Math.round(cx + (k < 2 ? -1 : 1) * (dw + 2 + hash(k, 1, seed) * w * 0.15)); s.set(x, h + 1, pal[3]); s.set(x + 1, h + 1, pal[2]); s.set(x, h, pal[4]); }
    return { s, cx, w, dw, dh };
  }
  function barn(h, season) {
    // 精修版谷仓：石头地基、一块块竖木板（有木纹、木节、越往下越旧）、白色包角、复折屋顶的鳞片瓦、屋檐下的阴影、
    // 阁楼门里的干草和吊草的滑轮、带白色 X 撑条和铁合页的大门、带花箱的侧窗、屋脊上的通风塔和风向鸡、墙角爬藤、门边的灯
    const { spr, mix, hash } = A(), win = season === 'winter';
    const w = Math.round(h * 1.1), s = spr(w, h), cx = Math.round((w + 2) / 2);
    const RED = ['#5a1a18', '#7a2420', '#9a2e28', '#b83a30', '#d0503e'], WH = ['#9a8e86', '#c8beb4', '#ece4da', '#fffaf2'];
    const ROOF = win ? ['#8a8ea0', '#a8acbc', '#c8ccd8', '#e8ecf4'] : ['#3a2a34', '#4e3a40', '#664a4a', '#7e5c54'];
    const wallTop = Math.round(h * 0.44), found = h - 3, x0 = 3, x1 = w;
    // 墙板
    for (let y = wallTop; y < found; y++) for (let x = x0; x < x1; x++) {
      const b = (x - x0) % 4, age = (y - wallTop) / (found - wallTop);
      let c = b === 0 ? RED[1] : b === 1 ? RED[4] : b === 3 ? RED[2] : RED[3];
      if (b > 0 && hash(Math.floor((x - x0) / 4), Math.floor(y / 3), 11) < 0.12) c = RED[2];
      if (age > 0.75 && hash(x, y, 12) < (age - 0.75) * 2.2) c = mix(c, '#3a2a20', 0.35);
      s.set(x, y, c);
    }
    for (const [kx, ky] of [[x0 + 6, wallTop + 6], [x1 - 9, wallTop + 11], [x0 + 14, found - 5]]) { s.set(kx, ky, RED[0]); s.set(kx + 1, ky, RED[1]); }
    // 白色包角和腰线
    for (let y = wallTop; y < found; y++) { s.set(x0, y, WH[3]); s.set(x0 + 1, y, WH[1]); s.set(x1 - 2, y, WH[2]); s.set(x1 - 1, y, WH[0]); }
    // 石头地基
    for (let y = found; y <= h; y++) for (let x = x0 - 1; x <= x1; x++) {
      const row = y - found, sx = Math.floor((x + (row % 2) * 2) / 4), edge = (x + (row % 2) * 2) % 4 === 3 || row === 3;
      const base = ['#8a8494', '#9a94a4', '#aaa4b4'][Math.floor(hash(sx, row, 13) * 3)];
      s.set(x, y, edge ? '#5a5466' : row === 0 && hash(x, 1, 2) < 0.6 ? mix(base, '#ffffff', 0.25) : base);
    }
    // 复折屋顶：一排排鳞片瓦（每片上亮下暗，错开排）
    const rows = wallTop + 1;
    for (let y = 1; y <= rows; y++) {
      const k = y / rows, half = Math.round(k < 0.42 ? (w / 2 - 3) * (0.3 + k * 1.25) : (w / 2) * (0.82 + (k - 0.42) * 0.38));
      const r = Math.floor(y / 3), sub = y % 3, off = (r % 2) * 2;
      for (let x = -half; x <= half; x++) {
        const tile = Math.floor((x + 40 + off) / 4), tx = (x + 40 + off) % 4;
        let c = sub === 0 ? ROOF[3] : sub === 2 ? ROOF[0] : tx === 0 ? ROOF[1] : ROOF[2];
        if (sub === 1 && hash(tile, r, 14) < 0.18) c = ROOF[1];
        if (x > half * 0.55 && sub !== 0) c = mix(c, '#1a1020', 0.18);
        if (k > 0.42 && k < 0.46) c = WH[1]; // 折线处的封檐板
        if (win && (sub === 0 || hash(x, y, 15) < 0.45) && x < half * 0.6) c = sub === 0 ? '#ffffff' : '#eef4fa';
        s.set(cx + x, y, c);
      }
    }
    // 屋檐封檐板 + 檐下阴影
    s.hl(1, wallTop + 1, w, WH[3]); s.hl(1, wallTop + 2, w, WH[1]);
    for (let x = x0; x < x1; x++) { s.set(x, wallTop + 3, mix(s.get(x, wallTop + 3) ? '#7a2420' : '#7a2420', '#1a0c10', 0.3)); s.set(x, wallTop + 4, RED[1]); }
    // 屋脊上的通风塔 + 风向鸡
    const cw = Math.max(5, Math.round(w * 0.12));
    for (let y = -1; y < 3; y++) for (let x = -Math.floor(cw / 2); x <= Math.floor(cw / 2); x++) s.set(cx + x, y + 2, y === -1 ? ROOF[3] : x % 2 ? WH[1] : WH[2]);
    s.set(cx, 0, '#3a3a44'); s.set(cx, 1, '#3a3a44');
    // 阁楼门：白框、里面黑，堆着干草；上面伸出一根吊草的横梁，挂着绳子和钩
    const lw = Math.max(9, Math.round(w * 0.22)), lh = Math.round(lw * 0.85), lx = cx - Math.floor(lw / 2), ly = Math.round(wallTop * 0.5);
    s.rect(lx - 1, ly - 1, lw + 2, lh + 2, WH[2]); s.rect(lx, ly, lw, lh, '#1e1418');
    for (let x = lx; x < lx + lw; x++) { const hy = ly + Math.round(lh * 0.45) + Math.round(Math.sin(x * 0.9) * 1.2); for (let y = hy; y < ly + lh; y++) s.set(x, y, (x + y) % 3 === 0 ? '#c49a3a' : y === hy ? '#f6dc8a' : '#e0b84e'); }
    s.set(lx + 2, ly + Math.round(lh * 0.45) - 1, '#f6dc8a'); s.set(lx + lw - 3, ly + Math.round(lh * 0.45) - 2, '#f6dc8a');
    s.hl(lx - 1, ly - 3, lw + 2, '#6a4630'); s.hl(lx - 1, ly - 2, lw + 2, '#8a6040'); s.set(cx, ly - 1, '#d8c8a0'); s.set(cx, ly, '#d8c8a0'); s.set(cx, ly + 1, '#5a5466');
    // 大门：两扇，每扇有白边框 + X 撑条；门板是更深的红色竖板；铁合页、门把手
    const dw = Math.round(w * 0.2), dh = Math.round((found - wallTop) * 0.82), dx = cx - dw, dy = found - dh;
    for (let y = dy; y < found; y++) for (let x = dx; x <= dx + dw * 2; x++) s.set(x, y, (x - dx) % 3 === 0 ? RED[0] : (x - dx) % 3 === 1 ? RED[2] : RED[1]);
    for (const ox of [0, dw]) {
      const X0 = dx + ox, X1 = X0 + dw;
      for (let k = 0; k <= dh; k++) { const t = Math.round((k / dh) * dw); s.set(X0 + t, dy + k, WH[2]); s.set(X1 - t, dy + k, WH[2]); }
      s.vl(X0, dy, dh, WH[3]); s.vl(X1, dy, dh, WH[1]); s.hl(X0, dy, dw + 1, WH[3]); s.hl(X0, found - 1, dw + 1, WH[1]); s.hl(X0, dy + Math.round(dh / 2), dw + 1, WH[2]);
      s.set(X0 + (ox ? 1 : dw - 1), dy + 3, '#3a3440'); s.set(X0 + (ox ? 1 : dw - 1), found - 4, '#3a3440');
    }
    s.set(cx - 1, dy + Math.round(dh * 0.55), '#3a3440'); s.set(cx + 1, dy + Math.round(dh * 0.55), '#3a3440');
    s.hl(dx - 1, dy - 1, dw * 2 + 3, WH[3]); s.hl(dx, dy - 2, dw * 2 + 1, '#3a2a30');
    // 侧窗：白框、十字窗棂、玻璃上一道反光、下面的花箱
    for (const wx of [x0 + 4, x1 - 11]) {
      const wy = wallTop + 7; s.rect(wx - 1, wy - 1, 8, 8, WH[2]); s.rect(wx, wy, 6, 6, '#3a4a6a'); s.vl(wx + 3, wy, 6, WH[1]); s.hl(wx, wy + 3, 6, WH[1]);
      s.set(wx + 1, wy + 1, '#a8c8e8'); s.set(wx + 2, wy + 1, '#7a98c0'); s.set(wx + 1, wy + 2, '#7a98c0'); s.set(wx + 4, wy + 4, '#6a84aa');
      s.rect(wx - 1, wy + 7, 8, 2, '#8a6040'); s.hl(wx - 1, wy + 7, 8, '#b08458');
      if (!win) for (let k = 0; k < 4; k++) { s.set(wx + k * 2, wy + 6, ['#f2a6c2', '#ffd36a', '#f2a6c2', '#a8c8ff'][k]); s.set(wx + k * 2 - 1, wy + 6, '#5aa04e'); }
    }
    // 墙角爬藤（冬天没有）
    if (!win) for (let y = found - 1; y > wallTop + 6; y--) { const x = x0 + 2 + Math.round(Math.sin(y * 0.5) * 1.2); s.set(x, y, y % 2 ? '#4f8a46' : '#6aaa54'); if (y % 3 === 0) s.set(x + 1, y, '#8ac868'); }
    // 门边的小挂灯
    s.set(dx - 3, dy + 2, '#3a3440'); s.rect(dx - 4, dy + 3, 3, 3, '#ffd98a'); s.set(dx - 3, dy + 4, '#fff4c8');
    s.outline('#3a1418');
    return { s, door: { x: cx, w: dw * 2 }, loft: { x: lx + Math.floor(lw / 2), y: ly + 3 } };
  }
  function hash2(x, y) { return A().hash(x, y, 77); }
  function kennel(h, season) {
    // 精修狗窝：横木板墙、红瓦人字顶、圆拱门洞（里面黑，门口一块小地垫）、门楣上的名牌、屋顶边的小烟囱、墙脚的狗骨头
    const { spr, BLD, mix } = A(), win = season === 'winter';
    const w = Math.round(h * 1.25), s = spr(w, h), cx = Math.round((w + 2) / 2), roofH = Math.round(h * 0.42);
    BLD.planks(s, 3, roofH, w - 3, h - roofH + 1, ['#8a5a36', '#c48a52', '#d8a068', '#e8bc84'], false);
    BLD.gable(s, cx, 1, roofH, Math.round(w / 2) - 1, ['#6a2018', '#9a3424', '#b8442e', '#d06048'], win, 1);
    const dw = Math.round(w * 0.36), dh = Math.round((h - roofH) * 0.72), dx = cx - Math.floor(dw / 2), dy = h + 1 - dh;
    s.ell(cx, dy + dw / 2, dw / 2 + 1, dw / 2 + 1, (nx, ny) => (ny > 0 ? null : '#8a5a36'));
    s.rect(dx - 1, dy + Math.round(dw / 2), dw + 2, dh - Math.round(dw / 2), '#8a5a36');
    s.ell(cx, dy + dw / 2, dw / 2, dw / 2, (nx, ny) => (ny > 0 ? null : '#1a1014'));
    s.rect(dx, dy + Math.round(dw / 2), dw, dh - Math.round(dw / 2), '#1a1014');
    s.hl(dx + 1, h, dw - 2, '#c8604e'); s.hl(dx + 2, h + 1, dw - 4, '#a84a3a');
    const ny = roofH + 2; s.rect(cx - 4, ny, 9, 3, '#f6ecd8'); s.hl(cx - 3, ny + 1, 7, '#6a4630'); s.set(cx - 5, ny + 1, '#5a5466'); s.set(cx + 5, ny + 1, '#5a5466');
    s.rect(w - 3, h - 1, 4, 1, '#f6ecd8'); s.set(w - 3, h - 2, '#f6ecd8'); s.set(w, h - 2, '#f6ecd8');
    s.outline('#3a2018');
    return { s };
  }
  function coop(h, season) {
    // 精修鸡舍：高脚木屋、竖板墙（浅黄）、带封檐的红瓦顶、亮灯的小窗、小拱门、搭到地上的带横档的小斜坡、屋檐下挂着的小篮子
    const { spr, BLD } = A(), win = season === 'winter';
    const w = Math.round(h * 1.05), s = spr(w, h), cx = Math.round((w + 2) / 2), legs = Math.round(h * 0.24), roofH = Math.round(h * 0.32);
    const bodyTop = roofH + 1, bodyBot = h - legs;
    BLD.planks(s, 3, bodyTop, w - 4, bodyBot - bodyTop + 1, ['#b08a5a', '#e2c494', '#ecd2a8', '#f8e6c4'], true);
    BLD.gable(s, cx, 1, roofH, Math.round(w / 2) - 1, ['#7a2a1c', '#a8442a', '#c8552a', '#e07a4a'], win, 1);
    BLD.window(s, cx + 3, bodyTop + 3, 4, 4, '#8a5a36', { lit: true });
    BLD.door(s, cx - 5, bodyBot - 6, 4, 6, '#8a5a36', '#6a4630', { dark: true, round: true });
    for (const lx of [4, w - 4]) { s.rect(lx, bodyBot + 1, 2, legs, '#7a5234'); s.set(lx, bodyBot + 1, '#9a7048'); }
    s.hl(3, bodyBot + 1, w - 3, '#6a4630');
    for (let k = 0; k < legs + 2; k++) { const x = cx - 6 - k; s.rect(x, bodyBot + k, 4, 1, k % 2 ? '#a8865a' : '#c9a878'); if (k % 2 === 0) s.set(x + 1, bodyBot + k, '#8a6a44'); }
    s.set(w - 6, bodyTop, '#6a4630'); s.rect(w - 7, bodyTop + 1, 3, 2, '#c49a5a'); s.set(w - 6, bodyTop + 1, '#f6f0e0');
    s.outline('#4a2a18');
    return { s, door: { x: cx - 8 } };
  }
  function sty(h, season) {
    // 精修猪圈：石头半墙 + 木板小棚、单坡瓦顶、拱形门洞；旁边一圈带木纹的矮栅栏，栅栏里地上是泥
    const { spr, BLD } = A(), win = season === 'winter';
    const w = Math.round(h * 1.6), s = spr(w, h), roofH = Math.round(h * 0.34), sw = Math.round(w * 0.52);
    BLD.planks(s, 2, roofH, sw - 2, Math.round((h - roofH) * 0.55), ['#6a4430', '#9a6440', '#b07a4e', '#c8925e'], true);
    BLD.stones(s, 2, roofH + Math.round((h - roofH) * 0.55), sw - 2, h + 1 - roofH - Math.round((h - roofH) * 0.55));
    for (let y = 1; y <= roofH; y++) for (let x = 1; x < sw + 2; x++) { const ty = y + Math.floor(x / 6) * 0; let c = y % 2 ? ((x + (y >> 1) * 2) % 4 === 0 ? '#5a3a30' : '#7a5040') : '#4a2e26'; if (win && y < roofH * 0.6) c = y % 2 ? '#ffffff' : '#e6eef6'; s.set(x, ty, c); }
    s.hl(1, roofH + 1, sw + 1, '#2a1a14');
    const dw = Math.round(sw * 0.4), dx = Math.round(sw / 2 - dw / 2);
    s.ell(dx + dw / 2, h - Math.round(h * 0.28), dw / 2, dw / 2, (nx, ny) => (ny > 0 ? null : '#1a1014')); s.rect(dx, h - Math.round(h * 0.28), dw + 1, Math.round(h * 0.28) + 2, '#1a1014');
    for (let x = sw + 1; x < w + 1; x++) for (let y = h - 1; y <= h + 1; y++) s.set(x, y, win ? '#d8d0c8' : (x + y) % 3 ? '#6a4428' : '#7a5234');
    for (let x = sw; x < w + 1; x += 4) { s.rect(x, h - 7, 2, 8, '#c9a878'); s.set(x, h - 7, '#e2c49a'); s.set(x + 1, h - 6, '#a8865a'); }
    for (const yy of [h - 5, h - 2]) { s.hl(sw, yy, w - sw + 2, '#b8946a'); s.hl(sw, yy + 1, w - sw + 2, '#8a6a44'); }
    s.outline('#3a2418');
    return { s, door: { x: Math.round(sw / 2) } };
  }
  function igloo(h) {
    // 精修冰屋：一圈圈错缝的雪砖（每块上沿亮、下沿和右边有淡蓝阴影），屋顶受光，入口小隧道里透着暖光，门口的雪堆和冰柱
    const { spr, mix, hash } = A(); const w = Math.round(h * 2.1), s = spr(w, h), cx = Math.round(w * 0.42);
    s.ell(cx, h + 1, w * 0.4, h, (nx, ny, x, y) => {
      if (ny > 0) return null; const yy = y + h, row = Math.floor(yy / 4), off = row % 2 ? 3 : 0, bx = (x + off + 100) % 6, by = yy % 4;
      let c = by === 0 ? '#a8bcd4' : bx === 0 ? '#b8cce0' : by === 1 ? '#ffffff' : '#eef5fb';
      if (nx > 0.35 && by !== 0 && bx !== 0) c = mix(c, '#b8d0e8', 0.4);
      if (ny < -0.75 && nx < 0.2) c = '#ffffff';
      return c;
    });
    const tx = Math.round(w * 0.82);
    s.ell(tx, h + 1, w * 0.17, h * 0.5, (nx, ny, x, y) => (ny > 0 ? null : ((y + 50) % 4 === 0 ? '#b8cde0' : nx > 0.4 ? '#dce8f4' : '#f4f8fc')));
    s.ell(tx + 2, h + 1, w * 0.08, h * 0.32, (nx, ny) => (ny > 0 ? null : nx * nx + ny * ny < 0.4 ? '#ffcf8a' : '#2a3a58'));
    for (let k = 0; k < 5; k++) { const x = Math.round(tx - w * 0.15 + k * 2); s.set(x, Math.round(h * 0.52), '#c8f0ff'); if (k % 2) s.set(x, Math.round(h * 0.52) + 1, '#e8fbff'); }
    return { s: s.outline('#6a8aa8'), door: { x: tx + 2 } };
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
    const r = rockMound(h, 1.9, ['#2e2c38', '#55546a', '#6c6c80', '#868698', '#a8a8b8'], { top: season === 'winter' ? ['#ffffff', '#e6eef6'] : null, moss: season === 'winter' ? null : '#5f8a4a', door: 0.18, inside: (s, cx, h) => { for (const [dx, dy] of [[-4, -3], [3, -5], [5, -2]]) { s.set(cx + dx, h + dy, '#7fe0ff'); s.set(cx + dx, h + dy - 1, '#c8f4ff'); } } });
    return { s: r.s.outline('#22202a'), door: { x: Math.round(r.cx) } };
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
    // 精修沉船：一条条船板（有缝、有钉、颜色深浅不一）斜着半埋在沙里，龙骨和肋骨从破口里露出来，断桅杆上挂着海草和渔网，船身上长着藤壶
    const { spr, hash, mix } = A(); const w = Math.round(h * 2.2), s = spr(w, h);
    const WD = ['#2a1a10', '#4a3020', '#5e3e28', '#76503a', '#8a6448'];
    const tilt = (x) => Math.round((x / w) * 4);
    for (let x = 2; x < w; x++) { const top = Math.round(h * 0.38) + tilt(x), bot = h - Math.round(Math.abs(x - w / 2) / (w / 2) * h * 0.25); for (let y = top; y <= bot; y++) { const pl = (y - top) % 3; let c = pl === 0 ? WD[4] : pl === 2 ? WD[1] : WD[3]; if (hash(Math.floor(x / 9), Math.floor((y - top) / 3), 93) < 0.3) c = mix(c, '#3a5a4a', 0.35); if (pl === 1 && x % 9 === 0) c = '#5a5466'; if (hash(x, y, 94) < 0.04) c = '#d8d0c0'; s.set(x, y, c); } }
    // 破口里的肋骨
    const hx = Math.round(w * 0.36), hy = h - 4;
    s.ell(hx, hy, 6, 4.5, '#120c08'); for (let k = -2; k <= 2; k++) for (let j = -3; j <= 2; j++) if (k % 2 === 0) s.set(hx + k * 2, hy + j, WD[2]);
    s.ell(hx, hy + 1, 3, 3, (nx, ny) => (nx < -0.3 ? '#e09a6a' : '#c8784a')); s.rect(hx - 1, hy - 3, 3, 2, '#c8784a'); s.rect(hx - 1, hy - 3, 3, 1, '#2a1410');
    // 断桅杆 + 海草 + 网
    const mx = Math.round(w * 0.62); s.rect(mx, 1, 2, Math.round(h * 0.42), WD[2]); s.vl(mx, 1, Math.round(h * 0.42), WD[4]); s.rect(mx - 5, 4, 8, 1, WD[2]);
    for (let k = 0; k < 7; k++) { s.set(mx + 2 + (k % 2), 5 + k * 2, '#3f8a54'); s.set(mx + 3, 6 + k * 2, '#5aa66e'); }
    for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) if ((i + j) % 2 === 0) s.set(mx - 7 + i, 5 + j, '#c8bca0');
    return { s: s.outline('#1a100a'), door: { x: hx } };
  }

  // ---------- 新伙伴们的家 ----------
  // 北极熊：雪坡里挖出来的冰洞
  function iceCave(h) {
    const r = rockMound(h, 1.8, ['#6a8ab0', '#a8c8e4', '#c8e0f4', '#e4f2fc', '#ffffff'], { door: 0.2, inside: (s, cx, h, dw, dh) => { for (let k = -2; k <= 2; k++) { const x = Math.round(cx + k * dw * 0.35); for (let j = 0; j < 2 + (k % 2 ? 1 : 0); j++) s.set(x, Math.round(h + 1 - dh + j), '#c8f0ff'); } } });
    return { s: r.s.outline('#4a6a90'), door: { x: Math.round(r.cx + 2) } };
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
    // 精修石头小屋（高山牧民的那种）：大小不一的干砌石块墙（每块上亮下暗、石缝深色）、厚厚的茅草屋顶（一缕缕草茎、下沿参差、压草的横木）、
    // 木门框的矮门、一扇小木窗、墙角的柴堆
    const { spr, hash, mix } = A(), win = season === 'winter'; const w = Math.round(h * 1.8), s = spr(w, h), roof = Math.round(h * 0.42);
    const ST = ['#4a4652', '#76727e', '#8e8a96', '#a8a4b0', '#c4c0ca'];
    for (let y = roof; y <= h; y++) for (let x = 2; x < w; x++) {
      const row = Math.floor((y - roof) / 3), off = (row % 3) * 2, bx = Math.floor((x + off) / (4 + (row % 2))), sy = (y - roof) % 3, sx = (x + off) % (4 + (row % 2));
      let c = sy === 2 || sx === 0 ? ST[0] : sy === 0 ? ST[4] : ST[1 + Math.floor(hash(bx, row, 91) * 3)];
      s.set(x, y, c);
    }
    const TH = win ? ['#b8b0a0', '#d8d0c4', '#f0ece4', '#ffffff'] : ['#7a5a28', '#a8823a', '#c8a050', '#e2c070'];
    for (let y = 1; y <= roof + 1; y++) { const k = y / (roof + 1); for (let x = Math.round(w * 0.5 * (1 - k)) - 1; x <= w - Math.round(w * 0.5 * (1 - k)) + 2; x++) { let c = (x + y * 2) % 5 === 0 ? TH[0] : (x * 3 + y) % 7 === 0 ? TH[3] : x < w / 2 ? TH[2] : TH[1]; if (y === roof + 1 && hash(x, 1, 92) < 0.4) continue; s.set(x, y, c); } }
    for (let x = Math.round(w * 0.2); x < Math.round(w * 0.8); x++) s.set(x, Math.round(roof * 0.55), '#5a3a22');
    const dx = Math.round(w * 0.4), dw = Math.round(w * 0.2), dh = Math.round(h * 0.45);
    s.rect(dx - 1, h - dh - 1, dw + 2, dh + 2, '#6a4630'); s.rect(dx, h - dh, dw, dh + 1, '#1e1418'); s.hl(dx - 1, h - dh - 1, dw + 2, '#8a6040');
    const wx = Math.round(w * 0.75), wy = roof + 3; s.rect(wx - 1, wy - 1, 5, 5, '#6a4630'); s.rect(wx, wy, 3, 3, '#ffd98a'); s.set(wx + 1, wy, '#6a4630'); s.set(wx + 1, wy + 1, '#6a4630');
    for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) { const x = 3 + i * 2 + (j % 2), y = h - j * 2; s.set(x, y, '#9a6c46'); s.set(x + 1, y, '#e2c49a'); s.set(x, y - 1, '#7a5234'); }
    return { s: s.outline('#2e2c34'), door: { x: Math.round(w * 0.5) } };
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
    // 精修金合欢：扭着长的树干分成几根枝，托起好几层扁平的伞形树冠（每层上亮下暗，下沿一道深影），树冠边缘是一簇簇的小叶
    const { spr, hash, mix } = A(); const w = Math.round(h * 1.5), s = spr(w, h), cx = Math.round((w + 2) / 2), th = Math.round(h * 0.6);
    const BK = ['#3a2618', '#5a3a26', '#7a5234', '#9a6c46'];
    for (let y = 0; y < th; y++) { const yy = h + 1 - y, x = Math.round(cx - 1 + Math.sin(y / 6) * 1.5); s.set(x - 1, yy, BK[3]); s.set(x, yy, BK[2]); s.set(x + 1, yy, BK[1]); if (y < 2) { s.set(x - 2, yy, BK[2]); s.set(x + 2, yy, BK[0]); } }
    for (const [dx, len] of [[-1, 11], [1, 12], [-0.4, 8], [0.5, 9]]) for (let k = 0; k < len; k++) { const x = Math.round(cx + dx * k * 1.3), y = h + 1 - th + 5 - k; s.set(x, y, BK[1]); s.set(x + 1, y, BK[0]); }
    const L = season === 'autumn' ? ['#4a4a1a', '#6a6a26', '#8a8a34', '#b0a84a', '#d0c868'] : ['#24401a', '#3a5c26', '#507834', '#6a9442', '#8ab05a'];
    for (const [ly, lw, lh] of [[0.32, 0.5, 0.11], [0.2, 0.42, 0.09], [0.24, 0.24, 0.07], [0.12, 0.28, 0.07]]) {
      const Y = h * ly, rx = w * lw, ry = h * lh, X = cx + (ly === 0.24 ? w * 0.22 : ly === 0.12 ? -w * 0.12 : 0);
      s.ell(X, Y, rx, ry, (nx, ny, x, y) => { if (ny > 0.55 && hash(X + x, y, 61) < 0.6) return null; const l = -ny * 1.1 - nx * 0.3 + (hash(X + x, Y + y, 62) - 0.5) * 0.6; return l > 0.75 ? L[4] : l > 0.25 ? L[3] : l > -0.25 ? L[2] : l > -0.7 ? L[1] : L[0]; });
    }
    return s.outline('#1e2a12');
  }

  // 狮子的大石台（露天，喜欢趴在上面）
  function prideRock(h, R) {
    // 精修大石台：一层层的砂岩（层与层之间一道暗线 + 上沿一道亮边）、顶上的平台微微翘出、侧面的裂缝和石缝里的草
    const { spr, hash, mix } = A(); const w = Math.round(h * 2.2), s = spr(w, h);
    const SA = ['#6a4a2e', '#9a7448', '#b88e5c', '#d0a872', '#e8c88e'];
    for (let y = 0; y <= h; y++) {
      const k = y / h, x0 = Math.round(w * 0.1 * (1 - k)) + 1 + Math.round(Math.sin(y * 0.9) * 0.8), x1 = w - Math.round(w * 0.35 * Math.max(0, 1 - k * 1.8)) + Math.round(Math.sin(y * 1.3) * 0.8);
      const layer = Math.floor((y + Math.sin(x0 / 7) * 1.5) / 6), ly = Math.floor(y + Math.sin(x0 / 7) * 1.5) % 6;
      for (let x = x0; x <= x1; x++) {
        const nx = (x - x0) / Math.max(1, x1 - x0);
        let c = ly === 0 ? mix(SA[3], SA[4], 0.5) : ly === 5 ? mix(SA[1], SA[2], 0.5) : nx < 0.3 ? SA[3] : nx > 0.75 ? SA[1] : SA[2];
        if (y < 2) c = SA[4];
        if (hash(x, layer, 7) < 0.05) c = SA[0];
        if (hash(Math.floor(x / 5), layer, 8) < 0.1 && ly > 0) c = mix(c, '#8a5a3a', 0.3);
        s.set(x, y, c);
      }
    }
    let x = Math.round(w * 0.55), y = 3; for (let k = 0; k < h - 4; k++) { s.set(x, y, SA[0]); y++; if (hash(k, 3, 9) < 0.35) x++; }
    for (const fx of [0.2, 0.45, 0.7]) { const gx = Math.round(w * fx); s.set(gx, 1, '#8aa84a'); s.set(gx + 1, 0, '#a8c860'); s.set(gx - 1, 0, '#6a8a3a'); }
    return { s: s.outline('#4a3020'), door: { x: Math.round(w * 0.4) }, top: 0 };
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
    const r = rockMound(h, 1.8, ['#1a2a40', '#34507a', '#46648e', '#5a7aa4', '#7a9ac0'], { moss: '#3a8a7a', door: 0.22 });
    const { s, cx, w } = r;
    for (const [fx, col] of [[0.12, '#f07a9a'], [0.3, '#ffd36a'], [0.62, '#b08af0'], [0.84, '#f0a060'], [0.48, '#7af0d0']]) { const x = Math.round(1 + fx * w); for (let k = 0; k < 4; k++) { s.set(x, Math.round(h * 0.25) - k + Math.round(Math.abs(fx - 0.5) * h * 0.9), col); if (k === 3) { s.set(x - 1, Math.round(h * 0.25) - k + Math.round(Math.abs(fx - 0.5) * h * 0.9), col); s.set(x + 1, Math.round(h * 0.25) - k + Math.round(Math.abs(fx - 0.5) * h * 0.9), col); } } }
    return { s: s.outline('#0e1824'), door: { x: Math.round(cx) } };
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
    const r = rockMound(h, 1.8, ['#24202a', '#4a4252', '#5e5666', '#766c7e', '#948a9a'], { moss: '#4a6a44', door: 0.24, inside: (s, cx, h, dw) => { for (let x = -Math.round(dw * 0.7); x <= Math.round(dw * 0.7); x++) { s.set(cx + x, h, x % 2 ? '#c8a050' : '#e0bc6a'); s.set(cx + x, h + 1, '#a88038'); } } });
    return { s: r.s.outline('#141018'), door: { x: Math.round(r.cx) } };
  }

  // 高山上的洞口（通往洞穴）
  function caveMouth(h) {
    const r = rockMound(h, 1.7, ['#3a3a46', '#6e6e7e', '#888898', '#a2a2b2', '#c4c4d0'], { moss: '#6a8a5a', door: 0.22 });
    return { s: r.s.outline('#2a2a36'), door: { x: Math.round(r.cx) } };
  }

  PP.HOMES = { pebbleNest, breathingHole, tussockNest, batRoost, bearDen, caveMouth, barn, kennel, coop, sty, igloo, mound, foxDen, leafNest, cave, duckNest, hotSpring, lilyHome, reefArch, conch, wreck, iceCave, burrow, stoneShelter, shed, thicket, bigTree, pen, acacia, prideRock, gullPost, reefCave, sandHoles };
})();
