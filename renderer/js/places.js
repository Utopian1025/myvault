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

  function cave(h, season) {
    const r = rockMound(h, 1.9, ['#2e2c38', '#55546a', '#6c6c80', '#868698', '#a8a8b8'], { top: season === 'winter' ? ['#ffffff', '#e6eef6'] : null, moss: season === 'winter' ? null : '#5f8a4a', door: 0.18, inside: (s, cx, h) => { for (const [dx, dy] of [[-4, -3], [3, -5], [5, -2]]) { s.set(cx + dx, h + dy, '#7fe0ff'); s.set(cx + dx, h + dy - 1, '#c8f4ff'); } } });
    return { s: r.s.outline('#22202a'), door: { x: Math.round(r.cx) } };
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


  // 海底：鲨鱼的大礁石洞、花园鳗的沙洞群
  function reefCave(h) {
    const r = rockMound(h, 1.8, ['#1a2a40', '#34507a', '#46648e', '#5a7aa4', '#7a9ac0'], { moss: '#3a8a7a', door: 0.22 });
    const { s, cx, w } = r;
    const { shade, hash } = A();
    const topY = (x) => { for (let y = 0; y < s.h; y++) if (s.get(x, y)) return y; return null; };
    for (const [fx, col, kind] of [[0.14, '#f07a9a', 'b'], [0.3, '#ffd36a', 'brain'], [0.5, '#7af0d0', 'anem'], [0.66, '#b08af0', 'fan'], [0.85, '#f0a060', 'b']]) {
      const x = Math.round(1 + fx * w), y = topY(x); if (y == null) continue;
      if (kind === 'b') { for (let i = 0; i < 3; i++) s.set(x, y - i, col); for (const d of [-1, 1]) for (let i = 1; i < 3; i++) s.set(x + d * i, y - 1 - i, i === 2 ? shade(col, 0.35) : col); }
      if (kind === 'brain') s.ell(x, y, 2.6, 1.8, (nx, ny, xx, yy) => (ny > 0.4 ? null : (xx + yy * 2 + 9) % 3 === 0 ? shade(col, -0.3) : ny < -0.3 ? shade(col, 0.3) : col));
      if (kind === 'anem') for (let j = -2; j <= 2; j++) { s.set(x + j, y - 1, shade(col, -0.2)); s.set(x + j, y - 2 - (Math.abs(j) % 2), j % 2 ? col : shade(col, 0.35)); }
      if (kind === 'fan') for (let i = 0; i < 5; i++) for (let j = -i; j <= i; j += 2) s.set(x + Math.round(j * 0.7), y - i - 1, i === 4 ? shade(col, 0.3) : (i + j) % 4 === 0 ? shade(col, -0.25) : col);
    }
    return { s: s.outline('#0e1824'), door: { x: Math.round(cx) } };
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

  // ---------- 精修工具：一块块石头（Voronoi 切面，每块自己有亮面暗面，石缝深色）填满任意形状 ----------
  function facets(s, inside, x0, y0, x1, y1, pal, seed, opt = {}) {
    const { hash } = A(), W = x1 - x0 + 1, H = y1 - y0 + 1, pts = [], sz = opt.size || 28;
    for (let i = 0; i < Math.max(4, Math.round(W * H / sz)); i++) pts.push([x0 + hash(i, 1, seed) * W, y0 + hash(i, 2, seed) * H]);
    const id = new Int16Array(W * H).fill(-1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue; let best = 0, bd = 1e9;
      for (let i = 0; i < pts.length; i++) { const d = (pts[i][0] - x) ** 2 + ((pts[i][1] - y) * (opt.flat || 1.3)) ** 2; if (d < bd) { bd = d; best = i; } }
      id[(y - y0) * W + (x - x0)] = best;
    }
    const at = (x, y) => (x < x0 || y < y0 || x > x1 || y > y1 ? -1 : id[(y - y0) * W + (x - x0)]);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = at(x, y); if (k < 0) continue;
      const edge = [[1, 0], [0, 1]].some(([dx, dy]) => { const q = at(x + dx, y + dy); return q >= 0 && q !== k; });
      const [px, py] = pts[k], l = -(x - px) / 4 * 0.6 - (y - py) / 4 * 0.9 + (hash(k, 3, seed) - 0.5) * 0.6 - ((y - y0) / H) * 0.35 + (opt.bias || 0);
      let c = l > 0.8 ? pal[4] : l > 0.25 ? pal[3] : l > -0.3 ? pal[2] : pal[1];
      if (edge) c = pal[0];
      const top = at(x, y - 1) < 0;
      if (top && !edge) c = opt.top ? opt.top[hash(x, y, seed + 8) < 0.5 ? 0 : 1] : pal[4];
      if (opt.moss && !edge && l > 0.1 && hash(x, y, seed + 7) < 0.16) c = opt.moss;
      if (!edge && hash(x, y, seed + 6) < 0.04) c = pal[1];
      s.set(x, y, c);
    }
  }
  // 土包：抖动的三色泥土、受光的顶沿、零星小石子和草
  function earth(s, cx, base, rx, ry, pal, seed, grass) {
    const { hash, noise } = A();
    s.ell(cx, base, rx, ry, (nx, ny, x, y) => {
      if (ny > 0) return null;
      const l = -nx * 0.45 - ny * 0.9 + (noise((cx + x) / 2.2, (base + y) / 2.2, seed) - 0.5) * 0.7;
      let c = l > 0.75 ? pal[1] : l > 0.1 ? pal[0] : pal[2];
      if (nx * nx + ny * ny > 0.82 && ny < -0.3) c = grass ? grass[hash(x, y, seed) < 0.5 ? 0 : 1] : pal[1];
      if (hash(cx + x, base + y, seed + 3) < 0.05) c = pal[2];
      if (hash(cx + x, base + y, seed + 4) < 0.025) c = '#d8d0c4';
      return c;
    });
    if (grass) for (let x = Math.round(cx - rx); x <= cx + rx; x++) if (hash(x, 9, seed) < 0.35) { let y = 0; while (y < ry + 2 && !s.get(x, Math.round(base - ry + y))) y++; const yy = Math.round(base - ry + y); s.set(x, yy - 1, grass[0]); if (hash(x, 10, seed) < 0.4) s.set(x, yy - 2, grass[1]); }
  }
  // 洞口：外圈一道亮土边，越往里越黑；洞口前面撒一扇形的刨出来的土
  function hole(s, x, base, rx, ry, rim, spill) {
    const { hash } = A();
    s.ell(x, base, rx + 1, ry + 1, (nx, ny) => (ny > 0 ? null : rim[nx < 0 ? 0 : 1]));
    s.ell(x, base, rx, ry, (nx, ny) => (ny > 0 ? null : nx * nx + ny * ny < 0.3 ? '#07050a' : nx * nx + ny * ny < 0.65 ? '#140e10' : '#24181a'));
    if (spill) for (let k = -rx - 3; k <= rx + 3; k++) { s.set(x + k, base + 1, spill[Math.abs(k) % 2]); if (Math.abs(k) < rx && hash(k, 1, 5) < 0.6) s.set(x + k, base + 2, spill[1]); }
  }

  function mound(w, h, season, holeX) {
    // 精修兔子洞：长满草的小土坡（草面三色、顶沿亮、零星小花和草叶），一侧露出一块土坡，洞口有亮土边，洞前一小扇刨出来的土
    const { spr, hash } = A(); const s = spr(w, h + 2), win = season === 'winter';
    const g = win ? ['#c8d6e4', '#ffffff', '#a8b8c8'] : season === 'autumn' ? ['#a8963a', '#c8b858', '#7a6a2a'] : ['#4f9a48', '#7cc35a', '#3a7a3c'];
    earth(s, w / 2 + 1, h + 1, w / 2, h, g, 31, win ? null : [g[1], '#a8e07a']);
    const hx = Math.round(w * holeX);
    s.ell(hx, h + 1, Math.max(4, w * 0.18), h * 0.75, (nx, ny) => (ny > 0 ? null : nx < 0 ? '#9a7048' : '#7a5434'));
    hole(s, hx, h + 1, Math.max(2.5, w * 0.1), Math.max(2.5, h * 0.55), ['#b08a5a', '#8a6440'], ['#8a6448', '#a8805a']);
    if (!win) for (let k = 0; k < 3; k++) { const x = Math.round(w * (0.6 + k * 0.12)), y = Math.round(h * 0.4 + k); s.set(x, y, ['#ffffff', '#ffd84a', '#ff9fc0'][k]); s.set(x, y + 1, '#3f8a44'); }
    return { s: s.outline(win ? '#7a90a8' : '#2c4a24'), door: { x: hx } };
  }
  function foxDen(h, season, R) {
    // 精修狐狸洞：一棵大橡树长在土坡上，粗大的树根从坡里拱出来、在洞口上方搭成一道拱，洞口里很深，洞前刨出来的土、几块小石头和落叶
    const { spr, broadleaf, hash } = A(); const tree = broadleaf(Math.round(h * 0.92), season, R, 'oak');
    const w = tree.w + 14, s = spr(w, h + 3), cx = Math.round(w / 2), base = h + 3, win = season === 'winter';
    tree.stamp(s, cx + 3, base - 4);
    const dirt = win ? ['#c8d0dc', '#ffffff', '#9aa8b8'] : ['#8a6440', '#a8805a', '#6a4a30'];
    earth(s, cx - 2, base, w * 0.42, h * 0.24, dirt, 41, win ? null : season === 'autumn' ? ['#a8963a', '#c8b858'] : ['#4f9a48', '#7cc35a']);
    const hx = cx - 4, hr = Math.max(4, Math.round(h * 0.11));
    hole(s, hx, base, hr, hr + 1, ['#b08a5a', '#7a5434'], ['#7a5434', '#9a7048']);
    // 拱在洞口上的树根
    const B = ['#3a2418', '#5a3a26', '#7a5034', '#9a6c46'];
    for (const [sx, ex, top] of [[hx - hr - 4, hx + hr + 2, hr + 3], [hx + hr + 6, hx - hr + 1, hr + 5]]) {
      const n = Math.abs(ex - sx); for (let i = 0; i <= n; i++) { const t = i / n, x = Math.round(sx + (ex - sx) * t), y = Math.round(base - Math.sin(t * Math.PI) * top); s.set(x, y, B[3]); s.set(x, y + 1, B[1]); s.set(x, y + 2, B[0]); }
    }
    for (const [x, c] of [[hx + hr + 4, '#9a94a4'], [hx - hr - 6, '#8a8494']]) { s.set(x, base, c); s.set(x + 1, base, '#5a5466'); s.set(x, base - 1, '#c4c0ca'); }
    if (!win) for (let k = 0; k < 6; k++) s.set(Math.round(cx - w * 0.3 + hash(k, 1, 4) * w * 0.6), base + 1, ['#d9662a', '#e8963a', '#c49a3a'][k % 3]);
    return { s: s.outline('#2a1a10'), door: { x: hx } };
  }
  function leafNest(season) {
    // 精修倒木落叶窝：一根中空的倒木（树皮一块块、顶上长苔、断口一圈圈年轮、空心里黑），倒木下面掏出一个窝，
    // 窝口堆满五颜六色的落叶，木头上长着一朵小蘑菇和一丛蕨
    const { spr, BARK, hash, mix } = A(), win = season === 'winter'; const W = 44, H = 15, s = spr(W, H);
    const top = 3, bot = 11;
    for (let y = top; y <= bot; y++) for (let x = 3; x < 38; x++) {
      const ny = (y - top) / (bot - top); let c = ny < 0.2 ? BARK[3] : ny < 0.55 ? BARK[2] : ny < 0.85 ? BARK[1] : BARK[0];
      if ((x * 3 + Math.floor(y / 2) * 5) % 9 === 0) c = mix(c, BARK[0], 0.5);
      if (y === top + 1 && hash(x, 1, 51) < 0.25) c = BARK[3];
      if (!win && y <= top + 1 && hash(Math.floor(x / 3), 2, 52) < 0.45) c = hash(x, y, 53) < 0.5 ? '#5a8a3a' : '#7aa84a';
      if (win && y <= top + 1) c = '#ffffff';
      s.set(x, y, c);
    }
    // 断口：年轮 + 空心
    s.ell(39, (top + bot) / 2, 3, (bot - top) / 2 + 0.6, (nx, ny) => { const d = Math.sqrt(nx * nx + ny * ny); return d < 0.45 ? '#1a1210' : d < 0.6 ? '#7a5434' : d < 0.75 ? '#e2c49a' : d < 0.88 ? '#c99a6a' : BARK[1]; });
    // 窝：倒木下面挖进去的黑洞 + 洞口一堆落叶
    s.ell(20, bot + 2, 6, 4, (nx, ny) => (ny > 0.2 ? null : nx * nx + ny * ny < 0.5 ? '#0e0a0a' : '#2a1a14'));
    const LV = win ? ['#ffffff', '#e8eef4', '#c9a07a'] : ['#d9662a', '#e8963a', '#c49a3a', '#a65a2a', '#f3c058', '#8a3a1a'];
    for (let k = 0; k < 70; k++) { const x = 4 + Math.floor(hash(k, 1, 54) * 34), y = bot + 1 + Math.floor(hash(k, 2, 54) * 3); if (Math.abs(x - 20) < 4 && y < bot + 3) continue; s.set(x, y, LV[k % LV.length]); if (k % 3 === 0) s.set(x + 1, y, LV[(k + 2) % LV.length]); }
    if (!win) {
      s.set(9, 1, '#e8e0d0'); s.set(9, 2, '#d8c8b0'); s.rect(8, 0, 3, 1, '#d9342b'); s.set(8, 0, '#ff6a5a'); s.set(10, 0, '#a82a22');
      for (let i = 0; i < 4; i++) { s.set(30 + i, 2 - Math.round(i * 0.5), '#5aa04e'); s.set(30 + i, 3 - Math.round(i * 0.5), '#3f8a44'); s.set(29 - i, 2 - Math.round(i * 0.4), '#6ab05a'); }
    }
    return { s: s.outline('#2a1a10'), door: { x: 20 } };
  }
  function duckNest(season) {
    // 精修鸭窝：两丛芦苇中间，用枯草和细枝编的圆窝（一圈交叉的枝条、上沿亮），窝里铺着白色绒毛，几个带斑点的蛋，脚下是水边的泥和倒影
    const { spr, reeds, hash } = A(); const s = spr(34, 24), win = season === 'winter';
    reeds(22, season).stamp(s, 7, 21); reeds(19, season).stamp(s, 27, 22); reeds(14, season).stamp(s, 17, 17);
    s.ell(17, 21, 11, 2.5, '#5a4a30'); for (let x = 7; x < 28; x++) if (hash(x, 1, 61) < 0.4) s.set(x, 23, '#7ab8d8');
    const T = ['#5a4024', '#7a5a34', '#a8865a', '#c9a878', '#e2c898'];
    s.ell(17, 19, 9, 3.6, (nx, ny, x, y) => { const k = (x * 2 + y * 3 + 40) % 5, k2 = (x * 2 - y * 3 + 40) % 5; let c = ny < -0.5 ? T[4] : k === 0 || k2 === 0 ? T[1] : ny < 0 ? T[3] : T[2]; if (ny > 0.6) c = T[0]; return c; });
    s.ell(17, 18, 6.5, 1.8, (nx, ny) => (ny < 0 ? '#f4f0e4' : '#d8d0c0'));
    if (!win) for (const [x, c] of [[14, '#f4f0e0'], [17, '#e8f0d8'], [20, '#f0ead4']]) { s.ell(x, 17, 1.6, 1.3, (nx, ny) => (nx < 0 && ny < 0 ? '#ffffff' : c)); s.set(x + 1, 17, '#b8b098'); }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; s.set(Math.round(17 + Math.cos(a) * 10), Math.round(19 + Math.sin(a) * 4), T[0]); s.set(Math.round(17 + Math.cos(a) * 11), Math.round(18 + Math.sin(a) * 4), T[3]); }
    return { s: s.outline('#2a2014'), door: { x: 17 } };
  }
  function hotSpring() {
    // 精修温泉：一圈圆滚滚的大石头围着一池冒热气的碧绿热水（水面有高光、深处更蓝），岸边一个木桶和叠好的毛巾，水面上飘着几缕白汽
    const { spr, rock, hash } = A(); const s = spr(50, 20), R = A().rng(77);
    s.ell(25, 14, 21, 5, (nx, ny) => { const d = nx * nx + ny * ny; return d > 0.8 ? '#5aa8a8' : ny < -0.4 ? '#c8f4ee' : d < 0.25 ? '#3a9aa8' : '#6ac8c4'; });
    for (let k = 0; k < 6; k++) { const x = 12 + k * 5, y = 13 + (k % 2); s.hl(x, y, 3, '#e8fffa'); }
    for (let k = 0; k < 11; k++) { const a = Math.PI * (k / 10), x = 25 + Math.cos(a) * 22, y = 14 - Math.sin(a) * 5.8; rock(2 + (k % 3) * 0.7, R, false, ['#8a8a96', '#9a9488', '#7a7a88'][k % 3]).stamp(s, x, y + 3); }
    for (const [x, y, r] of [[3, 20, 3.4], [47, 20, 3.2], [9, 21, 2.4], [41, 21, 2.6], [20, 21, 2.2], [31, 21, 2.4]]) rock(r, R, false).stamp(s, x, y);
    // 木桶
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) s.set(43 + x, 9 + y, y === 1 || y === 3 ? '#5a5466' : x === 0 ? '#c99a6a' : x === 4 ? '#7a5234' : '#a87a54');
    s.hl(43, 8, 5, '#e2b88a');
    // 毛巾
    s.rect(4, 9, 6, 2, '#ffffff'); s.hl(4, 11, 6, '#c8d4e0'); s.hl(4, 10, 6, '#ff9fb0');
    // 热气
    for (const [x0, h0] of [[16, 6], [26, 8], [35, 5]]) for (let i = 0; i < h0; i++) if (i % 2 === 0) s.set(x0 + Math.round(Math.sin(i * 0.8) * 1.5), 9 - i, i < 3 ? '#ffffffcc' : '#ffffff80');
    return { s, door: { x: 25 } };
  }
  function lilyHome(season, ice) {
    // 精修荷叶泥窝：一大片荷叶（放射叶脉、带缺口、边缘微微翘起受光），旁边两片小荷叶和一朵荷花，荷叶边上一小块露出水面的泥滩
    const { spr, hash } = A(); const s = spr(34, 10);
    if (ice) { s.ell(17, 6, 15, 3, (nx, ny) => (nx * nx + ny * ny > 0.8 ? '#8ab0cc' : ny < -0.3 ? '#e8f4fc' : '#c4dcec')); for (let k = 0; k < 4; k++) { s.set(10 + k * 4, 5 + (k % 2), '#ffffff'); s.set(11 + k * 4, 6, '#a8c8e0'); } return { s, door: { x: 17 } }; }
    s.ell(8, 8, 7, 2, (nx, ny) => (ny < 0 ? '#7a6040' : '#5a4430'));
    const pad = (cx, cy, rx, ry) => s.ell(cx, cy, rx, ry, (nx, ny) => { if (nx > 0.08 && nx < 0.32 && ny < 0.15) return null; const a = Math.atan2(ny, nx), d = nx * nx + ny * ny; if (Math.abs(Math.sin(a * 5)) < 0.1 && d > 0.08) return '#2f7a30'; return d > 0.78 ? (ny < 0 ? '#9ad878' : '#265e26') : ny < -0.25 ? '#6ab85a' : nx > 0.5 ? '#3a8a3c' : '#4ea248'; });
    pad(20, 6, 11, 3.4); pad(6, 6, 4, 1.4); pad(31, 7, 3, 1.2);
    if (season === 'summer' || season === 'spring') { const fx = 27, fy = 3; s.set(fx, fy - 1, '#fff0f6'); s.set(fx - 1, fy, '#ffb0cc'); s.set(fx + 1, fy, '#e8789a'); s.set(fx, fy, '#ffd84a'); s.set(fx - 2, fy + 1, '#ff9fc0'); s.set(fx + 2, fy + 1, '#d86a8a'); s.set(fx - 1, fy + 1, '#ffc8dc'); s.set(fx + 1, fy + 1, '#ff8fb0'); }
    for (let x = 4; x < 34; x += 3) if (hash(x, 1, 3) < 0.5) s.set(x, 10, '#a8d8f0');
    return { s: s.outline('#1a3a1a'), door: { x: 20 } };
  }
  // ---- 海底的家 ----
  function reefArch(h) {
    // 精修珊瑚礁拱门：多孔的礁石拱（一块块石面、带小孔），上面长满各种珊瑚——鹿角珊瑚的枝杈、脑珊瑚的纹路、
    // 扇形的海扇、一簇簇海葵；拱门下面铺着一片海草床，海龟就睡在里面
    const { spr, hash, shade } = A(); const w = Math.round(h * 1.6), s = spr(w, h + 2), cx = (w + 2) / 2, R = w / 2 - 2, base = h + 2;
    const inside = (x, y) => { const nx = (x - cx) / R, ny = (y - base) / (h * 0.82); return ny <= 0 && nx * nx + ny * ny <= 1 && (nx * nx) / 0.25 + (ny * ny) / 0.5 > 1; };
    facets(s, inside, 1, 1, w, base, ['#3a2a40', '#62506a', '#7e6a86', '#9a86a0', '#b8a6bc'], 91, { size: 18 });
    for (let k = 0; k < 30; k++) { const x = Math.round(2 + hash(k, 1, 92) * (w - 3)), y = Math.round(3 + hash(k, 2, 92) * (h - 2)); if (inside(x, y) && inside(x + 1, y)) { s.set(x, y, '#2a1a28'); s.set(x + 1, y, '#46304a'); } }
    // 珊瑚
    const branch = (x, y, c, n) => { s.set(x, y, c); for (let i = 1; i <= n; i++) { s.set(x - i, y - i, c); s.set(x + i, y - i, shade(c, -0.15)); if (i === n) { s.set(x - i, y - i - 1, shade(c, 0.35)); s.set(x + i, y - i - 1, shade(c, 0.2)); } } s.set(x, y - 1, c); s.set(x, y - 2, shade(c, 0.3)); };
    const topY = (x) => { for (let y = 0; y <= base; y++) if (inside(x, y)) return y; return null; };
    for (const [fx, kind, c] of [[0.12, 'b', '#f07a9a'], [0.24, 'brain', '#e8b060'], [0.38, 'fan', '#b06ae0'], [0.5, 'b', '#ff8a5a'], [0.6, 'anem', '#ffd84a'], [0.72, 'brain', '#7ad0b8'], [0.84, 'b', '#f07ad0'], [0.92, 'anem', '#ff9a6a']]) {
      const x = Math.round(1 + fx * w), y = topY(x); if (y == null) continue;
      if (kind === 'b') branch(x, y, c, 3);
      if (kind === 'brain') s.ell(x, y, 3, 2, (nx, ny, xx, yy) => (ny > 0.3 ? null : (xx + yy * 2 + 9) % 3 === 0 ? shade(c, -0.3) : ny < -0.3 ? shade(c, 0.3) : c));
      if (kind === 'fan') for (let i = 0; i < 6; i++) for (let j = -i; j <= i; j += 2) s.set(x + Math.round(j * 0.7), y - i - 1, i === 5 ? shade(c, 0.3) : (i + j) % 4 === 0 ? shade(c, -0.25) : c);
      if (kind === 'anem') for (let j = -2; j <= 2; j++) { s.set(x + j, y - 1, c); s.set(x + j, y - 2 - (Math.abs(j) % 2), shade(c, 0.35)); }
    }
    // 拱门下的海草床
    for (let k = 0; k < 14; k++) { const x = Math.round(cx - R * 0.5 + k * R * 0.075), hh = 3 + (k % 3) + Math.round(hash(k, 1, 93) * 2); for (let y = 0; y < hh; y++) s.set(x + (y > hh / 2 ? (k % 2 ? 1 : -1) : 0), base - y, y > hh - 2 ? '#7ac86a' : k % 2 ? '#3f8a44' : '#5aa64e'); }
    return { s: s.outline('#20141e'), door: { x: Math.round(cx) } };
  }
  function conch(h) {
    // 精修大海螺：侧躺的螺壳——螺塔一圈圈往右上收尖，每圈肩上一排小尖刺，壳面有生长纹和褐色斑纹，
    // 前面张开的螺口是光滑的粉色（里面越深越暗），外唇翻出一道亮边，脚下一圈沙
    const { spr, hash, mix } = A(); const w = Math.round(h * 2), s = spr(w, h + 2), base = h + 2;
    const SH = ['#8a5e46', '#c4946e', '#e2b896', '#f4d8bc', '#fff2e2'];
    for (let k = 4; k >= 0; k--) {
      const t = k / 4, cx = w * (0.4 + t * 0.42), rr = h * (0.5 - t * 0.38), cy = base - rr - t * h * 0.12;
      s.ell(cx, cy, rr * 1.15, rr, (nx, ny, x, y) => {
        const l = -nx * 0.4 - ny * 0.9; let c = l > 0.6 ? SH[4] : l > 0.1 ? SH[3] : l > -0.4 ? SH[2] : SH[1];
        if ((x * 2 + y + 60) % 5 === 0 && ny > -0.6) c = mix(c, SH[0], 0.3);
        if (hash(Math.floor((cx + x) / 2), Math.floor((cy + y) / 2), 71) < 0.12) c = '#a8704e';
        return c;
      });
      if (k < 3) for (let j = -1; j <= 1; j++) { const x = Math.round(cx + j * rr * 0.5), y = Math.round(cy - rr * 0.95); s.set(x, y - 1, SH[3]); if (k === 0) s.set(x, y - 2, SH[4]); }
    }
    s.set(Math.round(w * 0.88), Math.round(base - h * 0.42), SH[1]);
    // 螺口
    const mx = w * 0.28, my = base - h * 0.42;
    s.ell(mx, my, h * 0.36, h * 0.4, (nx, ny) => { const d = nx * nx + ny * ny; return d > 0.78 ? (nx < 0 ? '#fff4ec' : '#ffd8d4') : d > 0.5 ? '#ffb0b4' : d > 0.25 ? '#e07884' : '#7a2a3a'; });
    s.ell(mx - 1, my + 1, h * 0.14, h * 0.18, '#3a1420');
    for (let x = 1; x < w; x++) if (hash(x, 1, 72) < 0.6) s.set(x, base + 1, x % 3 ? '#e8d4a4' : '#d4bc88');
    return { s: s.outline('#6a3a2a'), door: { x: Math.round(mx) } };
  }
  // 地洞：一个土包 + 洞口（可以换颜色：雪地、沙地、洞穴）
  function burrow(w, h, pal, holes) {
    const { spr } = A(); const s = spr(w, h + 2);
    earth(s, w / 2 + 1, h + 1, w / 2, h, [pal[0], pal[1], pal[2]], 33, null);
    let door = 0;
    holes.forEach((hx0, i) => { const hx = Math.round(w * hx0), r = i ? 2 : 3; hole(s, hx, h + 1, r, r, [pal[1], pal[2]], [pal[2], pal[0]]); if (!i) door = hx; });
    return { s: s.outline(pal[3]), door: { x: door } };
  }
  // 木头小棚（羊驼、牛）：前面敞开，里面堆着干草
  function shed(h, season, wall, roofCol) {
    // 精修木棚：竖木板墙（亮边 / 缝 / 木节）、瓦片人字顶（可以盖雪）、敞开的正面有两根立柱和一道横梁，
    // 里面暗，地上厚厚的干草、墙上挂着草架和一盏油灯，门口一个水槽
    const { spr, BLD, shade, mix, hash } = A(), win = season === 'winter';
    const w = Math.round(h * 1.6), s = spr(w, h), cx = Math.round((w + 2) / 2), roof = Math.round(h * 0.38);
    BLD.planks(s, 3, roof, w - 4, h - roof + 1, [shade(wall, -0.4), shade(wall, -0.1), wall, shade(wall, 0.25)], true);
    BLD.gable(s, cx, 1, roof, Math.round(w / 2), [shade(roofCol, -0.35), roofCol, shade(roofCol, 0.15), shade(roofCol, 0.35)], win, 1);
    const ox = Math.round(w * 0.2), ow = Math.round(w * 0.6), oy = roof + 3;
    for (let y = oy; y <= h; y++) for (let x = ox; x < ox + ow; x++) s.set(x, y, y < oy + 2 ? '#120a08' : mix('#2a1a14', '#3a2418', (x - ox) / ow));
    // 草架 + 灯
    for (let x = ox + 2; x < ox + ow - 2; x += 2) { s.set(x, oy + 3, '#8a6040'); s.set(x, oy + 4, '#d8b04a'); }
    s.hl(ox + 2, oy + 2, ow - 4, '#6a4630');
    s.set(ox + ow - 3, oy + 2, '#3a3440'); s.rect(ox + ow - 4, oy + 3, 2, 2, '#ffd98a'); s.set(ox + ow - 4, oy + 3, '#fff4c8');
    // 干草
    for (let x = ox; x < ox + ow; x++) { const hy = h - 2 - Math.round(Math.sin((x - ox) / ow * Math.PI) * 2.5); for (let y = hy; y <= h; y++) s.set(x, y, y === hy ? '#f6dc8a' : (x + y) % 3 === 0 ? '#b08a2e' : '#e0b84e'); }
    // 立柱 + 横梁
    for (const px of [ox - 1, ox + ow]) { s.vl(px, oy - 1, h - oy + 2, shade(wall, -0.45)); s.vl(px + (px < cx ? 1 : -1), oy, h - oy + 1, shade(wall, 0.15)); }
    s.hl(ox - 1, oy - 1, ow + 2, shade(wall, -0.3)); s.hl(ox - 1, oy - 2, ow + 2, shade(wall, 0.3));
    // 水槽
    s.rect(w - 6, h - 2, 6, 3, '#7a5234'); s.hl(w - 6, h - 2, 6, '#a87a54'); s.hl(w - 5, h - 1, 4, win ? '#d8ecf8' : '#5ab0d8');
    return { s: s.outline('#2a1a14'), door: { x: cx } };
  }
  // 灌木丛里压出来的草窝（小鹿，露天）
  function thicket(season, R) {
    // 精修：三丛高矮不一的灌木围成半圈，中间被压平的一窝草（一道道倒向同一边的草茎），边上几根高草和一朵小花
    const { spr, bush, grassTuft, hash } = A(); const a = bush(8, season, R, true), b2 = bush(6, season, R), c2 = bush(5, season, R);
    const W = a.w + b2.w + 4, s = spr(W, a.h + 3), base = a.h + 2;
    c2.stamp(s, W * 0.5, base - 3); a.stamp(s, a.w / 2 + 1, base); b2.stamp(s, W - b2.w / 2 - 1, base);
    const win = season === 'winter', G = win ? ['#c8d4dc', '#eef2f6'] : season === 'autumn' ? ['#a8883a', '#d8b860'] : ['#a8a04a', '#d8c870'];
    for (let x = Math.round(W * 0.3); x < Math.round(W * 0.72); x++) for (let y = base - 1; y <= base + 1; y++) s.set(x, y, (x + y * 2) % 3 === 0 ? G[0] : G[1]);
    for (let k = 0; k < 3; k++) grassTuft(season, R, true).stamp(s, W * (0.25 + k * 0.25), base + 1);
    if (!win) { s.set(Math.round(W * 0.66), base - 3, '#ffffff'); s.set(Math.round(W * 0.66), base - 2, '#ffd84a'); }
    return { s, door: { x: Math.round(W / 2) } };
  }
  // 雨林大树：树洞（鹦鹉）、树屋（猴子）、粗大的板根（老虎）
  function bigTree(h, R, kind) {
    const { spr, jungleTree, BLD, hash } = A(); const t = jungleTree(h, R), s = spr(t.w + 14, h + 2), cx = Math.round(s.w / 2);
    t.stamp(s, s.w / 2, h + 1);
    let door = { x: cx }, perch = null;
    if (kind === 'hollow') {
      // 树洞：一圈翻出来的树皮唇，里面深黑，洞口下沿一根小横枝当站杆
      const hy = Math.round(h * 0.6);
      s.ell(cx, hy, 3.4, 4.2, (nx, ny) => { const d = nx * nx + ny * ny; return d > 0.7 ? (nx < 0 ? '#a8885e' : '#4a3424') : d > 0.45 ? '#2a1a12' : '#0a0606'; });
      for (let i = -5; i <= 5; i++) { s.set(cx + i, hy + 5, '#6a4c34'); s.set(cx + i, hy + 6, '#3a2818'); }
      s.set(cx + 5, hy + 4, '#3f8a44'); s.set(cx + 6, hy + 4, '#5aa64e');
      perch = { x: cx, y: hy + 5 };
    }
    if (kind === 'house') {
      // 树屋：横木平台 + 栏杆，木板小屋（竖板墙、草叶屋顶、亮灯的窗、小门），一根绳梯垂到地上
      const py = Math.round(h * 0.52), hw = 12;
      for (let x = cx - hw - 2; x <= cx + hw + 2; x++) { s.set(x, py, '#c49a6a'); s.set(x, py + 1, (x % 4) ? '#8a5e3a' : '#5a3a22'); s.set(x, py + 2, '#4a2e1a'); }
      for (const d of [-1, 1]) for (let i = 0; i < 6; i++) { s.set(cx + d * (hw - 2 - i), py + 2 + i, '#5a3a22'); }
      for (let x = cx - hw - 2; x <= cx + hw + 2; x += 3) { s.set(x, py - 1, '#8a5e3a'); s.set(x, py - 2, '#8a5e3a'); }
      s.hl(cx - hw - 2, py - 3, hw * 2 + 5, '#a87a54');
      BLD.planks(s, cx - 8, py - 10, 16, 10, ['#5a3a22', '#8a5e3a', '#a87a54', '#c49a6a'], true);
      BLD.gable(s, cx, py - 17, 7, 10, ['#3a5a24', '#5a8a3a', '#7aa84a', '#9ac85a'], false, 1);
      BLD.window(s, cx + 3, py - 7, 3, 3, '#5a3a22', { lit: true });
      BLD.door(s, cx - 5, py - 6, 3, 6, '#6a4630', '#4a2e1a', { dark: true });
      for (let y = py + 3; y < h; y += 2) { s.set(cx + hw - 1, y, '#c8a060'); s.set(cx + hw + 2, y, '#c8a060'); if (y % 4 === 1) s.hl(cx + hw - 1, y, 4, '#8a6a3a'); }
      perch = { x: cx, y: py };
    }
    if (kind === 'roots') {
      // 板根之间的阴凉：几道高高的板根，中间地上一片被压平的落叶
      const tw = Math.max(3, Math.round(h / 13));
      for (const [d, L, hh] of [[-1, 14, 13], [1, 15, 15], [-1, 8, 18], [1, 9, 20]]) for (let k = 0; k <= L; k++) { const x = cx + d * (tw + k), top = h + 1 - Math.round(((L - k) / L) * hh); for (let y = top; y <= h + 1; y++) s.set(x, y, y === top ? (d < 0 ? '#c4a070' : '#8a6a4a') : d < 0 ? (k % 4 === 0 ? '#6a4c34' : '#8a6a4a') : k % 4 === 0 ? '#3a2818' : '#5a4030'); }
      for (let x = cx - 10; x <= cx + 10; x++) if (hash(x, 1, 81) < 0.6) s.set(x, h + 1, ['#a8863a', '#c8a050', '#7a6a2a'][x % 3]);
    }
    return { s: s.outline('#0c2614'), door, perch };
  }
  // 羊圈：一圈矮栅栏，里面铺着干草（露天）
  function pen(w, season) {
    // 精修羊圈：后面一排栅栏、两头两根粗门柱，圈里铺厚厚的干草（一根根草茎），角落一个木头食槽和一捆草料
    const { spr, fence, hayBale, hash } = A(), win = season === 'winter'; const f = fence(w, win), s = spr(w + 4, f.h + 6), base = f.h + 6;
    f.stamp(s, s.w / 2, base - 1);
    const G = win ? ['#e8eef4', '#ffffff', '#c8d4e0'] : ['#c49a3a', '#e0b84e', '#f6dc8a'];
    for (let y = base - 3; y <= base; y++) for (let x = 2; x < s.w - 2; x++) { const edge = y === base - 3 && hash(x, 1, 82) < 0.5; if (edge) continue; s.set(x, y, (x * 2 + y) % 5 === 0 ? G[0] : (x + y) % 3 === 0 ? G[2] : G[1]); }
    
    s.rect(s.w - 12, base - 3, 7, 3, '#7a5234'); s.hl(s.w - 12, base - 3, 7, '#a87a54'); s.hl(s.w - 11, base - 2, 5, '#5aa04e');
    return { s: s.outline('#3a2414'), door: { x: Math.round(s.w / 2) } };
  }
  // 狮子的大石台（露天，喜欢趴在上面）
  function prideRock(h, R) {
    // 精修大石台：一大块砂岩露头——由一块块大石头拼成（每块有亮面暗面、石缝深色），顶上一块平平的石板往右挑出去，
    // 下面压着阴影；脚下几丛干草和小石头
    const { spr, hash } = A(); const w = Math.round(h * 2.4), s = spr(w, h + 1), base = h + 1;
    const PAL = ['#5a3a22', '#8a6440', '#a87e52', '#c89c68', '#e4c08a'];
    const body = (x, y) => { const k = y / base; const left = Math.round(w * 0.06 + w * 0.12 * (1 - k)) + Math.round(Math.sin(y * 0.8) * 0.8); const right = w - Math.round(w * 0.12 * (1 - k * 0.6)); return y >= 4 && x >= left && x <= right; };
    facets(s, body, 1, 1, w, base, PAL, 101, { size: 34, flat: 1.8 });
    // 顶上挑出去的石板
    const sx0 = Math.round(w * 0.14), sx1 = w - 1;
    for (let y = 1; y <= 4; y++) for (let x = sx0 + (y === 1 ? 2 : 0); x <= sx1 - (y === 1 ? 1 : 0); x++) s.set(x, y, y === 1 ? PAL[4] : y === 4 ? PAL[0] : (x * 3 + y) % 11 === 0 ? PAL[2] : PAL[3]);
    for (let x = sx0 + 2; x < sx1; x++) s.set(x, 5, '#3a2414');
    for (const fx of [0.08, 0.5, 0.86]) { const gx = Math.round(w * fx); for (let k = -1; k <= 1; k++) { s.set(gx + k, base, '#a8a04a'); s.set(gx + k * 2, base - 1 - (k === 0 ? 1 : 0), '#c8c060'); } }
    return { s: s.outline('#3a2414'), door: { x: Math.round(w * 0.4) }, top: 0 };
  }
  // 海鸥：海边的木桩，桩顶上是草窝
  function gullPost(h) {
    // 精修木桩：三根高矮不一的老木桩（风吹日晒的灰褐木纹、顶面年轮、缠着粗麻绳、下半截长满藤壶和海草），最高那根顶上一个枝条编的鸟窝
    const { spr, hash } = A(); const w = 16, s = spr(w, h + 1), base = h + 1;
    const WD = ['#4a3a2e', '#6a5a4a', '#8a7a68', '#a89a86', '#c8bca8'];
    const post = (x, top, pw) => {
      for (let y = top; y <= base; y++) for (let i = 0; i < pw; i++) { let c = i === 0 ? WD[3] : i === pw - 1 ? WD[0] : (y + i * 3) % 5 === 0 ? WD[1] : WD[2]; if (y > base - (base - top) * 0.3 && hash(x + i, y, 111) < 0.35) c = hash(x + i, y, 112) < 0.5 ? '#e8e4d8' : '#3a6a4a'; s.set(x + i, y, c); }
      for (let i = 0; i < pw; i++) s.set(x + i, top, i === 1 ? WD[2] : WD[4]);
    };
    post(1, Math.round(h * 0.5), 3); post(11, Math.round(h * 0.35), 3); post(6, 5, 4);
    for (let y = Math.round(h * 0.4); y < Math.round(h * 0.4) + 4; y++) for (let x = 5; x < 11; x++) s.set(x, y, (x + y) % 2 ? '#d8c08a' : '#a88a5a');
    // 鸟窝
    s.ell(8, 4, 5.5, 2.2, (nx, ny, x, y) => ((x * 2 + y * 3 + 30) % 4 === 0 ? '#6a5030' : ny < -0.3 ? '#d8b878' : '#a8864e'));
    s.ell(8, 3.4, 3, 0.9, '#4a3820');
    s.set(3, 3, '#a8864e'); s.set(13, 4, '#a8864e'); s.set(2, 4, '#c8a868');
    return { s: s.outline('#2a2018'), door: { x: 8 } };
  }
  function sandHoles(w) {
    // 精修花园鳗的沙洞：沙地上一排小洞，每个洞口一圈被拱起来的沙（上沿亮），洞里黑；旁边散着几个小贝壳和沙纹
    const { spr, hash } = A(); const s = spr(w, 5);
    for (let x = 1; x <= w; x++) if (hash(x, 1, 121) < 0.5) s.set(x, 5, (x % 4) < 2 ? '#c8b48a' : '#b09a70');
    for (let i = 0; i < 5; i++) { const x = 3 + i * Math.round((w - 6) / 4); s.ell(x, 4, 2.6, 1.6, (nx, ny) => (ny < -0.2 ? '#e8d8b0' : '#c4ae84')); s.ell(x, 4, 1.3, 0.8, '#1a120c'); s.set(x - 1, 3, '#f6ecd0'); }
    for (const [x, c] of [[Math.round(w * 0.3), '#f4c8c0'], [Math.round(w * 0.72), '#f0e0c8']]) { s.set(x, 5, c); s.set(x + 1, 5, '#c89a8a'); }
    return { s, door: { x: Math.round(w / 2) } };
  }
  // ---------- 极地 / 洞穴 / 海岸 ----------
  function pebbleNest(w) {
    // 精修企鹅巢：冰面上三个鹅卵石垒的圆巢（每颗石子 2×2，有高光、颜色灰褐不一），巢中间凹下去一点，周围一圈踩实的雪
    const { spr, hash } = A(); const s = spr(w, 7), PB = [['#6a6a78', '#9a9aa8'], ['#7a6a5a', '#a8988a'], ['#5a5a66', '#8a8a96'], ['#8a8a96', '#c4c4d0']];
    for (let x = 1; x <= w; x++) s.set(x, 7, hash(x, 1, 131) < 0.5 ? '#dce8f2' : '#c8d8e6');
    for (let i = 0; i < 3; i++) {
      const cx = 5 + i * Math.round((w - 10) / 2), cy = 4 + (i % 2);
      s.ell(cx, cy + 1, 4, 1.4, '#b0c4d4');
      for (let a = 0; a < 10; a++) { const x = Math.round(cx + Math.cos(a / 10 * Math.PI * 2) * 4), y = Math.round(cy + Math.sin(a / 10 * Math.PI * 2) * 1.6); const p = PB[Math.floor(hash(x, y, 132) * 4)]; s.set(x, y, p[0]); s.set(x + 1, y, p[0]); s.set(x, y - 1, p[1]); s.set(x + 1, y - 1, p[0]); }
    }
    return { s, door: { x: Math.round(w / 2) } };
  }
  function breathingHole(w) {
    // 精修呼吸孔：冰面上一个圆洞，洞边一圈拱起的碎冰（上亮下蓝），洞里是深蓝的海水，水面一道高光和一圈涟漪
    const { spr, hash } = A(); const s = spr(w, 7), cx = w / 2 + 1;
    s.ell(cx, 4, w / 2, 3, (nx, ny) => { const d = nx * nx + ny * ny; if (d > 0.6) return ny < 0 ? (hash(Math.round(nx * 9), 1, 141) < 0.5 ? '#ffffff' : '#eef6fc') : '#a8c8e0'; return d > 0.45 ? '#3a6a9a' : ny < -0.2 ? '#1e4a7a' : '#14385e'; });
    s.set(Math.round(cx) - 2, 3, '#7ab8e8'); s.set(Math.round(cx) - 1, 3, '#a8d4f4'); s.hl(Math.round(cx) - 1, 5, 3, '#2a5a8a');
    for (const x of [1, w]) { s.set(x, 5, '#dce8f2'); s.set(x, 4, '#ffffff'); }
    return { s, door: { x: Math.round(cx) } };
  }
  function tussockNest(h, R) {
    // 精修信天翁巢：长满一簇簇草丛的小土丘（草叶往外弯、根部暗叶尖亮），丘顶一个泥和草堆起来的圆柱形巢，巢沿翻着草
    const { spr, hash } = A(); const w = Math.round(h * 2.4), s = spr(w, h + 1), cx = (w + 2) / 2, base = h + 1;
    earth(s, cx, base, w / 2, h - 3, ['#7a7a5a', '#9a9a70', '#5a5a44'], 151, null);
    for (let k = 0; k < 9; k++) { const x = Math.round(3 + (k / 8) * (w - 6)), y0 = Math.round(base - (h - 3) * Math.sqrt(Math.max(0, 1 - ((x - cx) / (w / 2)) ** 2)) + 2); for (let j = -2; j <= 2; j++) for (let i = 0; i < 3 - Math.abs(j) + 1; i++) s.set(x + j + Math.sign(j) * Math.round(i * 0.5), y0 - i, i === 0 ? '#5a7a3a' : i > 1 ? '#b8c870' : '#8aa84a'); }
    // 巢
    for (let y = 0; y < 3; y++) for (let x = -5; x <= 5; x++) s.set(Math.round(cx + x), 2 + y, (x + y * 2 + 9) % 3 === 0 ? '#6a5030' : x < 0 ? '#a8885a' : '#8a6a44');
    s.ell(cx, 2, 5, 1.2, (nx, ny) => (Math.abs(nx) > 0.6 ? '#c8b070' : '#4a3820'));
    for (const x of [-6, -3, 3, 6]) s.set(Math.round(cx + x), 1, '#9ab85a');
    return { s: s.outline('#2a2a1a'), door: { x: Math.round(cx) }, perchY: 2 };
  }
  // 蝙蝠：洞顶垂下来的岩缝（倒挂在这里睡觉）
  function batRoost(w, h) {
    // 精修：洞顶垂下来的一大块岩石（一块块石面），下沿参差，挂着几根钟乳石（尖端一滴亮水珠），中间一道又深又黑的岩缝
    const { spr, hash, noise } = A(); const s = spr(w, h + 4);
    const bot = (x) => Math.round(h * (0.45 + 0.55 * Math.sin(((x - 1) / w) * Math.PI) * (0.75 + noise(x / 3, 0, 161) * 0.25)));
    facets(s, (x, y) => y <= bot(x), 1, 0, w, h, ['#1a1620', '#3a3444', '#4e4858', '#625c6e', '#7e7888'], 162, { size: 16, bias: -0.3 });
    for (const fx of [0.15, 0.35, 0.68, 0.86]) { const x = Math.round(1 + fx * w), y0 = bot(x), len = 2 + Math.round(hash(x, 1, 163) * 3); for (let i = 0; i < len; i++) { s.set(x, y0 + i, i < len - 1 ? '#625c6e' : '#4e4858'); if (i < len - 2) s.set(x + 1, y0 + i, '#3a3444'); } s.set(x, y0 + len, '#a8e0ff'); }
    const cx = Math.round(w / 2) + 1; for (let y = 0; y < Math.round(h * 0.75); y++) { const hw = Math.max(1, Math.round((1 - y / h) * w * 0.12)); for (let x = -hw; x <= hw; x++) s.set(cx + x, y, Math.abs(x) === hw ? '#2a2432' : '#08060c'); }
    return { s: s.outline('#120e16'), door: { x: cx } };
  }

  PP.HOMES = { pebbleNest, breathingHole, tussockNest, batRoost, bearDen, caveMouth, barn, kennel, coop, sty, igloo, mound, foxDen, leafNest, cave, duckNest, hotSpring, lilyHome, reefArch, conch, wreck, iceCave, burrow, stoneShelter, shed, thicket, bigTree, pen, acacia, prideRock, gullPost, reefCave, sandHoles };
})();
