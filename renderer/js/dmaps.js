// 小场景的设计图：每个地方单独设计（地形、水、房子、家的位置、种什么树、有什么会动的东西）。
// 坐标：u、v ∈ [0, 48]；(0,0) 是画面最上面的角，(48,48) 是最下面（最靠近你）的角，(0,48) 左角，(48,0) 右角。
// 宠物走的是中间偏前的一条（u+v ≈ 47~70，|u−v| ≤ 22），那里自动压平、不长东西。
(function () {
  const PP = (window.PP = window.PP || {});
  const D = 48;
  const Pp = () => PP.DPROPS, M = () => PP.g3.MAT;
  const R = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const CUBE = 2.45;
  // 地面颜色：两种绿按大块噪声交替（深绿、浅绿）
  const greens = (W, a = '#6aa848', b = '#4f8c46', c) => (u, v) => { const n = PP.DIO.NZ(u / 7, v / 7, 11) * 0.7 + PP.DIO.NZ(u / 3, v / 3, 12) * 0.3; return n > 0.62 ? (c || PP.DIO.shade(a, 1.08)) : n > 0.42 ? a : b; };
  // 自动种：在空地上一丛一丛地种（kinds 按权重），离画面前沿越近越矮
  function dress(W, o) {
    const P = Pp(), rnd = PP.DIO.rng(W.scene.length * 131 + 7), kinds = o.kinds, tot = kinds.reduce((a, k) => a + k[1], 0), pick = () => { let r = rnd() * tot; for (const k of kinds) if ((r -= k[1]) <= 0) return k[0]; return kinds[0][0]; };
    const n = o.n || 70;
    for (let t = 0; t < n * 6 && n > 0; t++) {
      const u = 1.5 + rnd() * (D - 3), v = 1.5 + rnd() * (D - 3), front = u + v > 74, side = Math.abs(u - v) > 26;
      if (o.back && u + v > o.back && !side) continue;
      const k = front && !o.frontTall ? (o.low || ['bush', 'flowers', 'tufts'])[(rnd() * 3) | 0] : pick();
      const r = { oak: 3, pine: 2.4, birch: 2.2, blossom: 3, palm: 2, cactus: 1.5, acacia: 3, jungle: 3, bush: 1.4, rock: 1.2, flowers: 0.8, tufts: 0.6, mushroom: 0.6, fern: 1, stump: 1.2, deadtree: 2 }[k] || 1.4;
      if (!W.free(u, v, r) || !W.flat(u, v, Math.min(1.5, r))) continue;
      if (o.near && !o.near(u, v)) continue;
      const s = 0.8 + rnd() * 0.45;
      if (k === 'flowers') P.flowers(W, u, v, 5); else if (k === 'tufts') P.tufts(W, u, v, 4); else if (k === 'mushroom') P.mushroom(W, u, v, 0.8 + rnd() * 0.5);
      else if (k === 'fern') P.tufts(W, u, v, 6, { h: 4, cols: ['#386a37', '#46803c', '#579642'] });
      else if (k === 'rock') P.rock(W, u, v, s * 0.9); else if (k === 'bush') P.bush(W, u, v, s, { berry: o.berry && rnd() < 0.3 ? o.berry : null });
      else if (P[k]) P[k](W, u, v, s);
      W.claim(u, v, r * 0.8); n > 0 && 0;
    }
  }
  const MAPS = {};

  // ---------- 温带森林：后山两层长苔藓的石坎，坎上是高高的老林子；一条小溪从最上层落成两级瀑布，汇成坎脚的小水潭，
  // 再从左边流出去；木桥、林间小路、路灯、长椅、倒木、蘑菇圈。狐狸住山坡、刺猬住树根下、龙住后山的洞、鹿住树叶小屋 ----------
  MAPS.forest = {
    meta: { ground: '#6aa848', cliff: '#7a7266' },
    homes: [{ u: 34, v: 9 }, { u: 10, v: 43 }, { u: 6, v: 6 }, { u: 41, v: 21 }],
    build(W) {
      const P = Pp(), MT = M(), T1 = CUBE * 3, T2 = CUBE * 7;
      W.paint(['r', 0, 0, D, D], greens(W));
      const tier1 = [[0, 0], [D, 0], [D, 9], [40, 11], [33, 13], [27, 15], [21, 17], [15, 21], [10, 26], [5, 30], [0, 32]];
      const tier2 = [[0, 0], [32, 0], [28, 4], [23, 6], [18, 9], [13, 12], [7, 15], [0, 17]];
      W.raise(['p', tier1], T1, { side: '#7a7266', sm: MT.pstone }); W.paint(['p', tier1], greens(W, '#5e9c4a', '#46803c'));
      W.raise(['p', tier2], T2, { side: '#6e6a62', sm: MT.pstone }); W.paint(['p', tier2], greens(W, '#579642', '#3f7a40'));
      // 小溪：上层 → 瀑布 → 中层的小潭 → 瀑布 → 坎脚的水潭 → 往左流出去
      const lay = (pts, w, wz) => W.shape(['l', pts, w, 0.8], (u, v, i) => { if (W.lock[i]) return; W.water[i] = wz; W.h[i] = wz - 1.8; W.top[i] = '#5e6a58'; W.tm[i] = MT.pdirt; W.side[i] = '#6a5a48'; W.sm[i] = MT.pdirt; });
      lay([[12, 0], [13, 5], [15, 10]], 3, T2 - 0.8);
      W.shape(['e', 16.5, 13.5, 3.2, 2.4, 0.3], (u, v, i) => { if (W.h[i] > T1 - 1 && W.h[i] < T2 - 1) { W.water[i] = T1 - 0.8; W.h[i] = T1 - 2.6; W.top[i] = '#5e6a58'; W.tm[i] = MT.pdirt; W.side[i] = '#6a5a48'; } });
      lay([[16.5, 13.5], [17, 19]], 3, T1 - 0.8);
      W.pool(['e', 17.5, 23, 4.2, 2.8, 0.35], { z: -0.8, deep: 2.6, bed: '#5e6a58' });
      lay([[15, 25], [10, 30], [6, 35], [4, 42], [3, 48]], 3.2, -0.8);
      W.wspots.push([17.5, 23, -0.8], [6, 36, -0.8]);
      // 小路
      P.path(W, [[36, 34], [40, 28], [41, 25]], 2.4, { stones: true });
      P.path(W, [[16, 40], [11, 41], [9, 42]], 2.2);
      P.bridge(W, 9.5, 39, 2.5, 36, { w: 1.5, z: 0.3 });
      W.perches.push([30, 8, T1 + 5]); W.spotsW.brook = [15, 26, -0.8]; W.spotsW.sunrock = [30, 8, T1 + 5];
    },
    dress(W) {
      const P = Pp(), MT = M();
      // 瀑布边、水潭边的石头和芦苇
      P.boulders(W, 22.5, 24, 3, 0.8); P.rock(W, 13, 22, 0.8); P.rock(W, 20, 15, 0.7); P.rock(W, 13.5, 15, 0.6);
      P.tufts(W, 22, 27, 6, { h: 6, cols: ['#579642', '#80b84e', '#9e744c'] }); P.tufts(W, 12.5, 26, 5, { h: 6, cols: ['#579642', '#80b84e'] });
      P.boulders(W, 30, 8, 2, 1.5);
      // 设计好的东西
      P.log(W, 30, 41, 6, 'u', { shrooms: true }); P.stump(W, 43, 33); P.mushroom(W, 44.6, 34.5, 1.1); P.mushroom(W, 43.5, 36, 0.7); P.mushroom(W, 45.5, 32.2, 0.6, { col: '#f0bc56' });
      P.bush(W, 25, 36, 1.1, { berry: '#c66252' }); P.bush(W, 38, 30, 1, { berry: '#4c68b0' });
      P.lamp(W, 14, 37); P.lamp(W, 36, 30); P.bench(W, 29, 33, 'u'); P.sign(W, 38, 36, { arrow: 1 });
      P.flowers(W, 20, 42, 8); P.flowers(W, 44, 42, 7); P.flowers(W, 32, 45, 6); P.flowers(W, 46, 26, 6);
      P.bunting(W, [14, 37, 15], [26, 27, 14], { lights: true, sag: 3 });
      // 上面的老林子：大树，越往后越高，把天空撑满
      const tr = [[2, 3, 'pine', 1.5], [8, 13, 'oak', 1.25], [6, 1.5, 'oak', 1.55], [12, 2, 'pine', 1.6], [19, 3, 'oak', 1.6], [26, 2, 'pine', 1.55], [31, 3, 'oak', 1.4], [22, 9, 'oak', 1.3], [3, 15, 'pine', 1.3],
        [38, 3, 'oak', 1.4], [44, 4, 'pine', 1.45], [46, 9, 'oak', 1.2], [35, 8, 'birch', 1.25], [42, 10, 'pine', 1.2], [27, 14, 'birch', 1.1], [6, 26, 'oak', 1.15], [2, 30, 'pine', 1.1], [12, 26, 'birch', 1.05], [37, 16, 'oak', 1.1], [46, 15, 'pine', 1.1]];
      tr.forEach(([u, v, k, sc], i) => { if (W.free(u, v, 0.8)) P[k](W, u, v, sc * (0.95 + R(i) * 0.12)); });
      dress(W, { kinds: [['oak', 2], ['pine', 1], ['birch', 1], ['bush', 5], ['fern', 5], ['rock', 2], ['mushroom', 2], ['flowers', 4], ['tufts', 6]], n: 200, berry: '#c66252' });
      W.fx.push({ k: 'butterfly', n: 2 });
    },
  };


  const slot = { bl: [9, 30], b: [20, 17], br: [33, 8], l: [7, 42], r: [42, 8], fl: [20, 46], fr: [46, 20] };
  const ring = (W, u, v, r, f) => { for (let i = 0; i < 360; i += 30) f(u + Math.cos(i / 57.3) * r, v + Math.sin(i / 57.3) * r, i); };

  // ---------- 温带草原：起伏的绿坡，坡上一座风车，右后方一片向日葵田；矮石墙把草坡分成一块块；野花、蜂箱、小水洼 ----------
  MAPS.meadow = {
    meta: { ground: '#80b84e', cliff: '#8a7a5a' },
    homes: [{ u: 22, v: 15 }, { u: 7, v: 41 }, { u: 41, v: 14 }],
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], greens(W, '#80b84e', '#6aa848', '#98c65a'));
      const t1 = [[0, 0], [D, 0], [D, 10], [36, 13], [28, 18], [20, 22], [12, 28], [4, 32], [0, 33]], t2 = [[0, 0], [26, 0], [20, 6], [12, 10], [4, 14], [0, 15]];
      W.raise(['p', t1], CUBE * 2, { side: '#8a7a5a', sm: MT.pdirt }); W.raise(['p', t2], CUBE * 4, { side: '#8a7a5a', sm: MT.pdirt });
      W.paint(['p', t1], greens(W, '#80b84e', '#6aa848', '#98c65a')); W.paint(['p', t2], greens(W, '#98c65a', '#80b84e'));
      P.path(W, [[30, 38], [34, 30], [36, 22], [40, 14], [44, 8]], 2.6); P.path(W, [[18, 36], [12, 30], [8, 22], [10, 14]], 2.2);
      P.puddle(W, 6, 35, 2.2); W.wspots.push([6, 35, 0.15]);
      W.perches.push([10, 6, CUBE * 4 + 2]); W.spotsW.hill = [12, 8, CUBE * 4]; W.spotsW.sunflowers = [34, 12, CUBE * 2]; W.spotsW.puddle = [7, 36, 0];
    },
    dress(W) {
      const P = Pp();
      P.windmill(W, 9, 6, 1.1); P.crops(W, 30, 2, 44, 10, 'sunflower'); P.fence(W, 29, 11, 45, 11, { h: 4 });
      P.drystone(W, 36, 13, 28, 18); P.drystone(W, 20, 22, 12, 28); P.drystone(W, 20, 6, 12, 10);
      P.beehive(W, 25, 4); P.beehive(W, 27.5, 3); P.bench(W, 16, 34, 'v'); P.cart(W, 40, 26); P.hay(W, 44, 30, { round: true }); P.hay(W, 46, 34, { round: true });
      P.oak(W, 3, 24, 1.15); P.oak(W, 46, 14, 1.0, { fruit: '#c66252' }); P.blossom(W, 18, 2, 1.15); P.birch(W, 2, 4, 1.2);
      for (let i = 0; i < 14; i++) P.flowers(W, 2 + R(i) * 44, 2 + R(i + 40) * 44, 7);
      dress(W, { kinds: [['flowers', 8], ['tufts', 6], ['bush', 2], ['rock', 1], ['oak', 0.5]], n: 160 });
      W.fx.push({ k: 'butterfly', n: 3 });
    },
  };

  // ---------- 农场：红谷仓 + 筒仓、主人的小屋、鸡舍、狗窝、猪圈、羊棚；后面一层台地是菜地（卷心菜、南瓜、胡萝卜）和稻草人；干草垛、水槽、苹果树、水井、小推车 ----------
  MAPS.farm = {
    meta: { ground: '#80b84e', cliff: '#8a7a5a' },
    homes: [{ u: 9, v: 13 }, { u: 19, v: 21 }, { u: 6, v: 40 }, { u: 44, v: 26 }, { u: 26, v: 6 }, { u: 38, v: 8 }],
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], greens(W, '#80b84e', '#6aa848'));
      const t1 = [[0, 0], [D, 0], [D, 16], [34, 17], [26, 26], [16, 30], [6, 34], [0, 34]];
      W.raise(['p', t1], CUBE * 2, { side: '#8a7a5a', sm: MT.pdirt }); W.paint(['p', t1], greens(W, '#80b84e', '#6aa848'));
      P.path(W, [[24, 36], [22, 28], [20, 24]], 2.6, { col: '#c89e6c' }); P.path(W, [[34, 32], [38, 22], [38, 14]], 3, { col: '#c89e6c' });
      W.paint(['e', 44, 30, 3, 2.4, 0.3], '#724e36', MT.pdirt);
      W.spotsW.barnroof = [38, 8, CUBE * 2 + 23]; W.spotsW.mud = [44, 31, 0]; W.spotsW.veg = [8, 26, CUBE * 2];
    },
    dress(W) {
      const P = Pp();
      P.silo(W, 46, 3); P.crops(W, 1, 18, 9, 26, 'cabbage'); P.crops(W, 10, 23, 18, 28, 'pumpkin'); P.crops(W, 1, 27, 7, 32, 'carrot'); P.scarecrow(W, 9.5, 21);
      P.fence(W, 0.5, 17, 19, 17, { h: 4 }); P.fence(W, 33, 36, 47, 36, { h: 4 }); P.fence(W, 33, 36, 33, 46, { h: 4 });
      P.hay(W, 30, 12, { round: true }); P.hay(W, 31, 15); P.hay(W, 46, 12); P.trough(W, 40, 33); P.cart(W, 28, 4);
      P.oak(W, 15, 2, 1.25, { fruit: '#c66252' }); P.oak(W, 2, 6, 1.1, { fruit: '#c66252' }); P.oak(W, 46, 40, 1.0); P.well(W, 24, 14);
      P.crops(W, 36, 40, 46, 46, 'wheat'); P.lamp(W, 29, 33); P.barrel(W, 34, 19, { water: 1 }); P.crate(W, 33, 22); P.crate(W, 34.6, 22.4, 0.8);
      dress(W, { kinds: [['flowers', 4], ['tufts', 6], ['bush', 2]], n: 90 });
    },
  };

  // ---------- 湖泊湿地：右后方一大片湖，木栈道伸进湖里、拴着一条小船；岸边芦苇、睡莲；左后方一棵大垂柳；鸭子的小木屋在水上，青蛙住睡莲上的蘑菇屋，水豚住芦苇屋 ----------
  MAPS.lake = {
    meta: { ground: '#6aa848', cliff: '#7a7266', water: '#3a86a6' },
    homes: [{ u: 38, v: 6 }, { u: 28, v: 5 }, { u: 7, v: 40 }],
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], greens(W, '#6aa848', '#4f8c46'));
      W.raise(['p', [[0, 0], [20, 0], [16, 6], [10, 12], [4, 18], [0, 20]]], CUBE * 2, { side: '#7a7266', sm: MT.pstone }); W.paint(['p', [[0, 0], [20, 0], [16, 6], [10, 12], [4, 18], [0, 20]]], greens(W, '#579642', '#46803c'));
      W.pool(['p', [[19, 0], [D, 0], [D, 26], [44, 22], [40, 17], [34, 14], [27, 13], [22, 10], [19, 5]]], { z: -0.8, deep: 3.4, bed: '#4a6050' });
      W.pool(['e', 6, 32, 3.6, 2.6, 0.4], { z: -0.8, deep: 2 });
      W.wspots.push([30, 8, -0.8], [40, 12, -0.8], [6, 32, -0.8]); W.spotsW.dock = [33, 11, 1.2];
    },
    dress(W) {
      const P = Pp();
      P.dock(W, 30, 13.5, 33.5, 8, {}); P.dock(W, 30, 13.5, 32, 15.5, {}); P.rowboat(W, 36, 10.5, { col: '#c66252' });
      P.willow(W, 9, 6, 1.25); P.willow(W, 45, 34, 0.95);
      for (const [u, v] of [[23, 12], [27, 14.5], [36, 16], [42, 20], [20, 6], [46, 24], [8, 34], [3, 30]]) P.reeds(W, u, v, 7);
      for (const [u, v, f] of [[24, 4, 1], [26, 9, 0], [34, 3, 1], [44, 6, 0], [41, 15, 1], [30, 2, 0], [46, 12, 1]]) P.lily(W, u, v, { flower: f });
      P.oak(W, 3, 3, 1.3); P.pine(W, 14, 2, 1.4); P.birch(W, 2, 12, 1.2); P.bench(W, 18, 34, 'v'); P.lamp(W, 24, 34);
      P.boulders(W, 18, 14, 3, 0.8); P.tufts(W, 12, 22, 6);
      dress(W, { kinds: [['bush', 3], ['flowers', 4], ['tufts', 6], ['birch', 1], ['oak', 1], ['rock', 1]], n: 120 });
      W.fx.push({ k: 'butterfly', n: 1 });
    },
  };

  // ---------- 海岸：右边是海（一层层浪花），左后方礁石上的红白灯塔；沙滩上遮阳伞、毛巾、沙堡、潮池里的海星，搁浅的小船、漂流木；后面沙丘上长着海草和棕榈 ----------
  MAPS.beach = {
    meta: { ground: '#e8cc9c', groundMat: 21 - 2, cliff: '#c89e6c', cliffMat: 19, water: '#2a90b0', waves: true, slab: ['#c89e6c', '#b4885a', '#8a8076', '#6a6470'], noSnow: true },
    homes: [{ u: 20, v: 46 }, { u: 46, v: 22 }, { u: 6, v: 38 }],
    homeKind: { otter: 'lodge' },
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], (u, v) => (PP.DIO.NZ(u / 5, v / 5, 3) > 0.55 ? '#e8cc9c' : '#dab682'), MT.psand);
      W.raise(['p', [[0, 0], [28, 0], [22, 6], [14, 11], [6, 16], [0, 18]]], CUBE * 2, { side: '#c89e6c', sm: MT.psand, top: '#dab682', tm: MT.psand });
      W.raise(['e', 7, 6, 8, 6, 0.4], CUBE * 4, { side: '#8a8076', sm: MT.prock, top: '#9a9488', tm: MT.prock });
      W.pool(['p', [[30, 0], [D, 0], [D, D], [44, 40], [42, 30], [38, 22], [34, 14], [31, 6]]], { z: -0.8, deep: 4, bed: '#c8b08a' });
      W.paint(['p', [[28, 0], [31, 6], [34, 14], [38, 22], [42, 30], [44, 40], [D, D], [42, D], [40, 40], [37, 30], [33, 22], [29, 14], [26, 6], [24, 0]]], '#c8a878', MT.psand);
      W.pool(['e', 18, 38, 2.2, 1.6, 0.3], { z: -0.6, deep: 1, bed: '#c8b08a' }); W.pool(['e', 24, 42, 1.6, 1.2, 0.3], { z: -0.6, deep: 1, bed: '#c8b08a' });
      W.wspots.push([36, 8, -0.8], [41, 20, -0.8]); W.spotsW.tidepool = [18, 38, -0.6]; W.spotsW.waves = [38, 18, -0.8];
    },
    dress(W) {
      const P = Pp();
      P.lighthouse(W, 7, 6, 1.0); P.boulders(W, 13, 4, 3, 1); P.boulders(W, 30, 4, 2, 0.9, { col: '#74707e' });
      P.palm(W, 20, 4, 1.15, { lean: [1, 0.6] }); P.palm(W, 3, 20, 1.0, { lean: [0.6, 1] }); P.palm(W, 25, 10, 0.9, { lean: [1, 0.2] });
      P.umbrella(W, 28, 34, '#c66252'); P.towel(W, 30, 37, '#4c68b0'); P.umbrella(W, 12, 30, '#40b89c'); P.towel(W, 14, 33, '#f0bc56'); P.sandcastle(W, 23, 30);
      P.rowboat(W, 40, 44, { z: 0, col: '#3a86a6' }); P.driftwood(W, 4, 28); P.dock(W, 33, 18, 38, 14, { z: 0.4 });
      P.starfish(W, 18.5, 37.6); P.starfish(W, 24.4, 42.5, '#c66252'); for (let i = 0; i < 12; i++) P.shell(W, 8 + R(i) * 30, 24 + R(i + 9) * 22, ['#f8d4c4', '#f4e2bc', '#e89a7e'][i % 3]);
      for (const [u, v] of [[2, 8], [10, 14], [18, 10], [4, 14], [24, 2]]) P.tallgrass(W, u, v, 5);
      W.fx.push({ k: 'cloud', fx: 0.1, fy: 0.12, w: 26, sp: 3 });
    },
  };

  // ---------- 珊瑚礁（海底）：不要台阶，一片平平的白沙海底，五颜六色的珊瑚丛、海扇、脑珊瑚、海葵；左边一片随水摆的海带林，右后方的沉船、礁石拱门；
  // 海面透下来的光柱、一串串气泡、一群群小鱼、一只鳐鱼慢慢游过 ----------
  MAPS.sea = {
    meta: { under: true, noSeason: true, noSnow: true, ground: '#e0cc9c', groundMat: 19, cliff: '#8a7a8a', water: '#2a6688', slab: ['#c8b08a', '#a8906a', '#6a6478', '#4c4858'],
      tint: [0.62, 0.84, 1.0], tintAdd: [0, 8, 26], amb: [0.42, 0.55, 0.7], sunCol: [0.7, 0.85, 0.92], noBugs: true },
    homes: [{ u: 10, v: 30 }, { u: 44, v: 28 }, { u: 34, v: 8 }, { u: 20, v: 10 }],
    homeKind: { turtle: 'sandmound', gardeneel: 'eelbed', shark: 'wreck', octopus: 'jar' },
    build(W) {
      const MT = M();
      W.paint(['r', 0, 0, D, D], (u, v) => (PP.DIO.NZ(u / 6, v / 6, 3) > 0.6 ? '#e8d6a8' : '#d8c494'), MT.psand);
      W.raise(['e', 6, 6, 9, 7, 0.4], CUBE * 2, { side: '#8a7a8a', sm: MT.prock, top: '#b8a888', tm: MT.psand });
      W.raise(['e', 44, 4, 6, 6, 0.4], CUBE * 1.5, { side: '#8a7a8a', sm: MT.prock, top: '#b8a888', tm: MT.psand });
      W.perches.push([6, 6, CUBE * 2 + 2]); W.spotsW.reef = [6, 6, CUBE * 2];
    },
    dress(W) {
      const P = Pp();
      P.archrock(W, 22, 3, 1.1);
      const cc = ['#e07a98', '#f0bc56', '#a688cc', '#e89a7e', '#64d4b4', '#c66252'];
      [[4, 12], [12, 6], [16, 14], [28, 12], [40, 14], [46, 10], [6, 22], [14, 24], [42, 22], [26, 20], [36, 20], [2, 34], [46, 38], [30, 4]].forEach(([u, v], i) => P.coral(W, u, v, { col: cc[i % cc.length], s: 0.8 + R(i) * 0.5 }));
      [[10, 16], [38, 16], [20, 22], [46, 18]].forEach(([u, v], i) => P.brain(W, u, v, { col: ['#d87c64', '#98c65a', '#e89a7e', '#c4a8e0'][i] }));
      [[18, 8], [32, 18], [8, 26], [44, 34]].forEach(([u, v], i) => P.fan(W, u, v, { col: ['#a688cc', '#e07a98', '#f0bc56', '#88aae0'][i] }));
      [[24, 26], [12, 38], [40, 40], [30, 44]].forEach(([u, v], i) => P.anemone(W, u, v, ['#f0a2b8', '#64d4b4', '#f0bc56', '#c4a8e0'][i]));
      for (let i = 0; i < 7; i++) { const u = 1 + R(i) * 6, v = 14 + i * 3.2; P.kelpstem(W, u, v, 26 + R(i + 3) * 10); W.fx.push({ k: 'kelp', u, v, z: 26, h: 16, ph: i }); }
      P.chest(W, 16, 40); P.anchor(W, 34, 40); for (let i = 0; i < 10; i++) P.shell(W, 4 + R(i) * 40, 24 + R(i + 7) * 22, ['#f8d4c4', '#f2b8a0', '#f4e2bc'][i % 3]); P.starfish(W, 20, 34); P.starfish(W, 40, 32, '#c66252');
      P.boulders(W, 14, 2, 3, 1, { col: '#8a7a8a' }); P.boulders(W, 46, 4, 2, 1.1, { col: '#8a7a8a' });
      for (const [fx, fy, n] of [[0.12, 0.75, 6], [0.5, 0.62, 5], [0.86, 0.7, 7], [0.32, 0.5, 4]]) W.fx.push({ k: 'bubbles', fx, fy, n, fh: 0.55, sp: 0.15 + fx * 0.1, ph: fx });
      W.fx.push({ k: 'rays' }, { k: 'school', fy: 0.22, n: 9, col: '#f0bc56', sp: 10, dir: 1 }, { k: 'school', fy: 0.36, n: 6, col: '#88aae0', sp: 7, dir: -1, ph: 2 }, { k: 'school', fy: 0.14, n: 5, col: '#e07a98', sp: 12, dir: -1, ph: 4 }, { k: 'glider', fy: 0.08, sp: 4, col: '#3a5090', dir: 1 });
    },
  };

  // ---------- 沙漠：后面一排红砂岩方山，一层层的岩纹；左后方的绿洲（棕榈 + 小水潭）；驼队的帐篷和旗子、陶罐；半埋的古石柱、白骨；沙丘起伏 ----------
  MAPS.desert = {
    meta: { ground: '#e8c890', groundMat: 19, cliff: '#c87a44', cliffMat: 28, noSeason: true, noSnow: true, slab: ['#d8b682', '#c89e6c', '#a07858', '#7a5a4a'], sunCol: [1, 0.9, 0.72] },
    homes: [{ u: 7, v: 40 }, { u: 22, v: 46 }, { u: 40, v: 14 }],
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], (u, v) => { const w = Math.sin(u * 0.5 + v * 0.2 + PP.DIO.NZ(u / 6, v / 6, 2) * 4); return w > 0.6 ? '#f0d8a0' : w < -0.6 ? '#dab682' : '#e8c890'; }, MT.psand);
      W.raise(['p', [[0, 0], [D, 0], [D, 6], [38, 8], [30, 12], [24, 14], [16, 18], [8, 22], [0, 24]]], CUBE * 2, { side: '#c89e6c', sm: MT.psand, top: '#e0c088', tm: MT.psand });
      // 后面的红砂岩方山：一块块抬高的岩台，侧面是一层层的岩纹
      for (const [u, v, a, b, h] of [[7, 5, 6, 5, 9], [19, 3, 5, 4, 7], [33, 3, 7, 4.5, 11], [45, 7, 4, 5, 7], [26, 6, 3, 2.6, 5]]) W.raise(['e', u, v, a, b, 0.5], CUBE * h, { side: '#c87a44', sm: MT.prock, top: '#d8a868', tm: MT.psand });
      W.raise(['e', 33, 3, 4, 2.6, 0.4], CUBE * 14, { side: '#b46a3a', sm: MT.prock, top: '#d8a868', tm: MT.psand }); W.raise(['e', 7, 5, 3.4, 2.8, 0.4], CUBE * 12, { side: '#b46a3a', sm: MT.prock, top: '#d8a868', tm: MT.psand });
      W.pool(['e', 10, 30, 4.6, 3.2, 0.4], { z: -0.8, deep: 2, bed: '#6a8a6a' }); W.paint(['e', 10, 30, 7.5, 5.5, 0.3], '#6aa848', MT.pgrass); W.pool(['e', 10, 30, 4.6, 3.2, 0.4], { z: -0.8, deep: 2, bed: '#6a8a6a' });
      W.wspots.push([10, 30, -0.8]); W.spotsW.oasis = [11, 31, 0];
    },
    dress(W) {
      const P = Pp();

      P.dune(W, 26, 12, 6, 6); P.dune(W, 44, 20, 5, 5);
      P.palm(W, 6, 26, 1.1, { lean: [0.6, 1] }); P.palm(W, 14, 28, 1.0, { lean: [1, 0.3] }); P.palm(W, 8, 35, 0.85); P.tallgrass(W, 14, 33, 5); P.reeds(W, 6, 31, 5);
      P.pillar(W, 22, 22, { h: 18 }); P.pillar(W, 26, 20, { h: 12, broken: 1 }); P.pillar(W, 30, 18, { h: 16 });
      P.pot(W, 36, 22); P.pot(W, 37.6, 23.4, '#b46a3a'); P.pot(W, 35, 24, '#d0925a'); P.bones(W, 44, 34); P.crate(W, 42, 18);
      P.cactus(W, 46, 28, 0.9); P.cactus(W, 3, 44, 0.8); P.boulders(W, 30, 44, 2, 0.9, { col: '#c89e6c', moss: false });
      W.fx.push({ k: 'cloud', fx: 0.6, fy: 0.08, w: 20, sp: 2, a: 0.7 });
    },
  };

  // ---------- 稀树草原：金黄的干草地，几棵平顶金合欢和一棵猴面包树；右后方的大岩石台（狮子的家），中间偏左的水塘（河马的泥屋）；白蚁丘、高草丛 ----------
  MAPS.savanna = {
    meta: { ground: '#c8b060', cliff: '#b4885a', noSnow: true, sunCol: [1, 0.88, 0.7] },
    homes: [{ u: 10, v: 30 }, { u: 36, v: 6 }, { u: 7, v: 42 }, { u: 44, v: 22 }],
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], greens(W, '#c8b060', '#b49a50', '#d8c070'));
      W.raise(['p', [[0, 0], [D, 0], [D, 8], [36, 12], [24, 16], [12, 20], [0, 22]]], CUBE * 1.5, { side: '#b4885a', sm: MT.pdirt }); W.paint(['p', [[0, 0], [D, 0], [D, 8], [36, 12], [24, 16], [12, 20], [0, 22]]], greens(W, '#c0a858', '#a89048'));
      W.wspots.push([12, 34, -0.6]);
    },
    dress(W) {
      const P = Pp();
      P.acacia(W, 8, 8, 1.3); P.acacia(W, 24, 4, 1.15); P.acacia(W, 46, 34, 1.0); P.acacia(W, 2, 26, 0.9); P.baobab(W, 16, 12, 1.1);
      P.termite(W, 30, 14); P.termite(W, 40, 30); P.boulders(W, 22, 22, 3, 1, { col: '#b4885a', moss: false });
      for (let i = 0; i < 16; i++) P.tallgrass(W, 2 + R(i) * 44, 2 + R(i + 30) * 44, 6);
      dress(W, { kinds: [['tufts', 4], ['rock', 1], ['bush', 1]], n: 60 });
      W.fx.push({ k: 'cloud', fx: 0.2, fy: 0.1, w: 24, sp: 2, a: 0.8 });
    },
  };

  // ---------- 热带雨林：几棵巨树（板根、垂着开花的藤），后面长满青苔的古神庙台阶；一条河从后山落下来；树屋之间的吊桥；龟背竹、蕨、热带花 ----------
  MAPS.jungle = {
    meta: { ground: '#4f8c46', cliff: '#5e6a58', noSnow: true },
    homes: [{ u: 10, v: 12 }, { u: 30, v: 8 }, { u: 44, v: 24 }],
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], greens(W, '#4f8c46', '#386a37', '#5e9c4a'));
      const t1 = [[0, 0], [D, 0], [D, 10], [36, 14], [26, 20], [16, 26], [6, 30], [0, 31]];
      W.raise(['p', t1], CUBE * 3, { side: '#5e6a58', sm: MT.pstone }); W.paint(['p', t1], greens(W, '#46803c', '#2c5632'));
      const lay = (pts, w, wz) => W.shape(['l', pts, w, 0.8], (u, v, i) => { if (W.lock[i]) return; W.water[i] = wz; W.h[i] = wz - 2; W.top[i] = '#4a5a48'; W.tm[i] = MT.pdirt; W.side[i] = '#4a4038'; W.sm[i] = MT.pdirt; });
      lay([[20, 0], [21, 10], [22, 19]], 3.4, CUBE * 3 - 0.8); lay([[22, 21], [16, 30], [8, 36], [2, 42], [0, 46]], 3.6, -0.8);
      W.wspots.push([18, 28, -0.8], [6, 38, -0.8]); W.spotsW.river = [14, 31, -0.8];
    },
    dress(W) {
      const P = Pp();
      P.temple(W, 38, 5, 0.8); P.giant(W, 6, 5, 1.1); P.giant(W, 30, 22, 0.8); P.giant(W, 46, 14, 0.9);
      P.ropebridge(W, [10, 12 + 4.5, CUBE * 3 + 17], [30, 8 + 4.5, CUBE * 3 + 17]);
      for (const [u, v] of [[14, 22], [26, 14], [4, 22], [44, 32], [36, 26], [2, 36], [18, 4], [12, 34]]) P.monstera(W, u, v, 0.9 + R(u) * 0.3);
      for (let i = 0; i < 8; i++) P.flowers(W, 4 + R(i) * 40, 4 + R(i + 5) * 40, 5, { cols: ['#c8587a', '#e49a42', '#f8d872', '#a688cc'] });
      dress(W, { kinds: [['jungle', 1], ['bush', 3], ['fern', 6], ['tufts', 3], ['flowers', 2]], n: 160 });
      W.fx.push({ k: 'butterfly', n: 3 });
    },
  };

  // ---------- 高山：后面两座雪峰撑满天空，中间一层高山草甸和小溪；石头小屋、经幡、玛尼堆；右边岩石里有个山洞（通往洞穴）----------
  MAPS.mountain = {
    meta: { ground: '#80b84e', cliff: '#8c8896' },
    homes: [{ u: 12, v: 22 }, { u: 7, v: 41 }, { u: 30, v: 4 }],
    homeKind: { snowleopard: 'cave' },
    caveAt: [44, 16, 0, 4, 14],
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], greens(W, '#80b84e', '#6aa848'));
      const t1 = [[0, 0], [D, 0], [D, 12], [38, 14], [30, 18], [20, 24], [10, 28], [0, 30]], t2 = [[0, 0], [36, 0], [30, 5], [20, 9], [10, 13], [0, 15]];
      W.raise(['p', t1], CUBE * 3, { side: '#8c8896', sm: MT.prock }); W.raise(['p', t2], CUBE * 6, { side: '#8c8896', sm: MT.prock });
      W.paint(['p', t1], greens(W, '#6aa848', '#579642')); W.paint(['p', t2], greens(W, '#98a890', '#808c80'));
      // 雪峰：一圈圈往上收的岩台，顶上积雪
      for (const [cu, cv, r, n] of [[8, 4, 11, 9], [24, 2, 9, 7], [40, 3, 8, 6]]) for (let k = 1; k <= n; k++) { const rr = r * (1 - k / (n + 1.5)); const snow = k > n * 0.55; W.raise(['e', cu + k * 0.15, cv + k * 0.1, rr, rr * 0.8, 0.5], CUBE * 6 + k * CUBE * 1.6, { side: snow ? '#b6c0c0' : '#8c8896', sm: MT.prock, top: snow ? '#f4f8fc' : '#9aa6aa', tm: snow ? MT.psnow : MT.prock, lip: snow ? '#e6eef6' : null }); }
      const lay = (pts, w, wz) => W.shape(['l', pts, w, 0.8], (u, v, i) => { if (W.lock[i]) return; W.water[i] = wz; W.h[i] = wz - 1.6; W.top[i] = '#6a7068'; W.tm[i] = MT.pdirt; });
      lay([[26, 6], [24, 12], [22, 20]], 2.4, CUBE * 3 - 0.6); lay([[22, 23], [18, 30], [12, 34], [4, 40], [0, 44]], 2.6, -0.6);
      W.wspots.push([16, 32, -0.6]); W.spotsW.stream = [15, 32, -0.6]; W.perches.push([38, 10, CUBE * 3 + 6]); W.spotsW.ledge = [38, 10, CUBE * 3 + 6];
    },
    dress(W) {
      const P = Pp(), MT = M();

      { const m = W.mesh, z = 0; m.ball(44, 16, z - 2, 6, 18, '#8c8896', MT.prock, 5, 9, 0.12, 4); m.disc(44, 16 + 5.2, z + 3.4, 2.6, 'v', '#16141c', 0, 12); m.box(41.4, 20.8, z, 46.6, 21.3, z + 3.4, '#16141c', 0); P.lantern(W, 41, 22, z + 7); }
      P.cairn(W, 36, 22); P.cairn(W, 30, 12); P.bunting(W, [14, 20, CUBE * 3 + 10], [34, 14, CUBE * 3 + 12], { sag: 3 }); P.bunting(W, [4, 34, 8], [16, 22, CUBE * 3 + 8], { sag: 2 });
      for (const [u, v, s] of [[2, 20, 1.2], [4, 26, 1.0], [46, 30, 1.0], [42, 38, 0.9], [34, 8, 1.1], [16, 14, 1.0]]) if (W.free(u, v, 1)) P.pine(W, u, v, s);
      P.boulders(W, 26, 26, 3, 1); P.boulders(W, 36, 34, 2, 0.8);
      dress(W, { kinds: [['flowers', 4], ['tufts', 5], ['rock', 3], ['pine', 1]], n: 110 });
    },
  };

  // ---------- 洞穴：四周是高高的岩壁（像个房间），钟乳石、石笋，发光的水晶，地下水潭，矿车铁轨，挂着的灯，发光的蘑菇 ----------
  MAPS.cave = {
    meta: { dark: true, ground: '#6a6476', groundMat: 28, cliff: '#5a5468', noSeason: true, noSnow: true, amb: [0.36, 0.34, 0.44], sunCol: [0.55, 0.5, 0.58], gnd: [0.22, 0.2, 0.26], slab: ['#4c4858', '#3c3846', '#2e2a38', '#221e2a'] },
    homes: [{ u: 6, v: 20 }, { u: 24, v: 6 }, { u: 7, v: 42 }],
    homeKind: { bat: 'cave', brownbear: 'cave', porcupine: 'burrow' },
    signAt: [42, 30, 0, 3, 10],
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], (u, v) => (PP.DIO.NZ(u / 5, v / 5, 3) > 0.55 ? '#5e5a6a' : '#524e5e'), MT.prock);
      W.raise(['p', [[0, 0], [D, 0], [D, 4], [30, 5], [14, 8], [5, 14], [4, 30], [0, 34]]], CUBE * 10, { side: '#4c4858', sm: MT.prock, top: '#3c3846', tm: MT.prock });
      W.raise(['p', [[0, 0], [D, 0], [D, 2], [0, 2]]], CUBE * 14, { side: '#4c4858', sm: MT.prock, top: '#3c3846', tm: MT.prock });
      W.raise(['p', [[0, 0], [2, 0], [2, D], [0, D]]], CUBE * 14, { side: '#4c4858', sm: MT.prock, top: '#3c3846', tm: MT.prock });
      W.pool(['e', 36, 14, 6, 4, 0.4], { z: -0.8, deep: 3, bed: '#2e2a38' }); W.wspots.push([36, 14, -0.8]); W.spotsW.pool = [34, 18, 0];
    },
    dress(W) {
      const P = Pp();
      for (const [u, v, h] of [[14, 14, 10], [16, 16, 6], [28, 9, 12], [44, 8, 8], [46, 12, 5], [10, 24, 7], [44, 38, 9], [20, 44, 6], [8, 36, 8]]) P.stalag(W, u, v, h);
      for (const [u, v, c] of [[12, 10, '#88aae0'], [30, 22, '#a688cc'], [46, 26, '#64d4b4'], [8, 30, '#88aae0'], [40, 44, '#a688cc']]) P.crystal(W, u, v, { col: c, s: 1.1 });
      P.rails(W, [[20, 46], [22, 34], [26, 26], [32, 22]]); P.minecart(W, 24, 30);
      for (const [u, v] of [[18, 20], [40, 22], [14, 40]]) { W.mesh.box(u - 0.15, v - 0.15, 0, u + 0.15, v + 0.15, 9, '#4c3024', 0); P.lantern(W, u + 0.8, v, 9); W.mesh.box(u, v - 0.1, 8.9, u + 0.9, v + 0.1, 9.2, '#4c3024', 0); }
      for (const [u, v] of [[34, 30], [36, 32], [18, 8], [42, 34]]) P.mushroom(W, u, v, 1.1, { col: '#40b89c', glow: '#64d4b4', dots: false });
      P.sign(W, 42, 30, { arrow: 1 }); P.boulders(W, 28, 40, 3, 0.9, { col: '#6a6070' });
      W.fx.push({ k: 'motes', n: 10, cols: ['#88aae0', '#c4a8e0'], fy0: 0.2, fy1: 0.8, sp: 0.03 });
    },
  };

  // ---------- 北极冰原：一片雪原，后面是蓝白的冰崖，冻住的池塘（能滑冰），冰块、雪松、雪人、雪橇；夜里有极光 ----------
  MAPS.snow = {
    meta: { snowy: true, ground: '#eef2f8', groundMat: 23, cliff: '#b4cce0', cliffMat: 25, noSeason: true, frozen: true, slab: ['#d8e2ee', '#b4cce0', '#94b4d0', '#6a8aa8'] },
    homes: [{ u: 7, v: 41 }, { u: 22, v: 12 }, { u: 42, v: 14 }],
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], (u, v) => (PP.DIO.NZ(u / 6, v / 6, 3) > 0.6 ? '#f4f8fc' : '#e6eef6'), MT.psnow);
      const t1 = [[0, 0], [D, 0], [D, 8], [36, 10], [26, 15], [16, 20], [6, 26], [0, 28]];
      W.raise(['p', t1], CUBE * 3, { side: '#b4cce0', sm: MT.pice, top: '#eef2f8', tm: MT.psnow }); W.raise(['e', 10, 4, 10, 5, 0.4], CUBE * 6, { side: '#94b4d0', sm: MT.pice, top: '#f4f8fc', tm: MT.psnow });
      W.pool(['e', 8, 32, 5, 3.5, 0.4], { z: -0.3, deep: 1, bed: '#94b4d0' }); W.wspots.push([8, 32, -0.3]);
      W.spotsW.pond = [9, 33, 0]; W.perches.push([10, 4, CUBE * 6 + 1]); W.spotsW.slidetop = [10, 4, CUBE * 6];
    },
    dress(W) {
      const P = Pp();
      P.steps(W, 18, 9, 22, 13, CUBE * 6, CUBE * 3, { w: 1.5, col: '#d8e2ee' });
      for (const [u, v, s] of [[2, 14, 1.2], [26, 3, 1.3], [32, 6, 1.0], [44, 4, 1.25], [46, 26, 1.0], [3, 22, 0.9], [40, 36, 0.9], [14, 22, 0.8]]) if (W.free(u, v, 1)) P.pine(W, u, v, s);
      P.snowman(W, 30, 22); P.sled(W, 36, 28); P.iceblock(W, 18, 26, 1); P.iceblock(W, 20, 27.5, 0.7); P.iceblock(W, 44, 40, 1.1);
      P.boulders(W, 30, 40, 2, 0.8, { col: '#d8e2ee', moss: false }); P.lamp(W, 16, 36);
      W.fx.push({ k: 'aurora' }, { k: 'sparkle', n: 14 });
    },
  };

  // ---------- 南极：冰架，前右是深色的海（漂着冰山），后面一层层冰崖；企鹅的冰屋、海豹的冰洞、信天翁在崖顶的窝；考察站的小红屋和旗子 ----------
  MAPS.antarctic = {
    meta: { snowy: true, noIce: true, ground: '#eef2f8', groundMat: 23, cliff: '#b4cce0', cliffMat: 25, noSeason: true, water: '#215272', waves: true, slab: ['#d8e2ee', '#b4cce0', '#94b4d0', '#6a8aa8'] },
    homes: [{ u: 7, v: 40 }, { u: 20, v: 14 }, { u: 10, v: 6 }],
    homeKind: { albatross: 'cliffnest' },
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], (u, v) => (PP.DIO.NZ(u / 6, v / 6, 3) > 0.6 ? '#f4f8fc' : '#e6eef6'), MT.psnow);
      const t1 = [[0, 0], [30, 0], [26, 6], [18, 12], [8, 18], [0, 20]];
      W.raise(['p', t1], CUBE * 3, { side: '#b4cce0', sm: MT.pice, top: '#eef2f8', tm: MT.psnow });
      W.pool(['p', [[32, 0], [D, 0], [D, D], [44, 40], [42, 30], [38, 20], [34, 10]]], { z: -1.2, deep: 4, bed: '#2a4e66' });
      W.wspots.push([38, 8, -1.2], [44, 24, -1.2]); W.spotsW.shore = [36, 24, 0];
    },
    dress(W) {
      const P = Pp();
      P.iceberg(W, 42, 10, 1.2); P.iceberg(W, 45, 32, 0.8); P.iceberg(W, 38, 3, 0.7);
      P.cabin(W, 20, 26, 27, 31, { wall: '#c66252', wallMat: M().pplank, roof: '#5e5650', trim: '#f4f2f6', h: 10, rh: 5, flowers: false });
      { W.mesh.box(29, 30, 0, 29.3, 30.3, 16, '#3c3846', 0); W.fx.push({ k: 'flag', u: 29.2, v: 30.2, z: 16, col: '#4c68b0' }); }
      P.iceblock(W, 14, 30, 1); P.iceblock(W, 4, 26, 1.2); P.iceblock(W, 30, 40, 0.8); P.boulders(W, 16, 44, 2, 0.8, { col: '#d8e2ee', moss: false });
      W.fx.push({ k: 'aurora' }, { k: 'sparkle', n: 10 });
    },
  };

  // ---------- 浮空岛：一块悬在天上的小岛（底下倒挂着岩石和树根），花园、喷泉、小风车、瞭望台和望远镜、鸟屋；旁边漂着几块小石头和一只热气球，云从下面飘过 ----------
  MAPS.skyisle = {
    meta: { float: true, ground: '#80b84e', cliff: '#8a7a6a' },
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], greens(W, '#80b84e', '#6aa848', '#98c65a'));
      W.raise(['e', 10, 8, 10, 7, 0.3], CUBE * 2, { side: '#8a7a6a', sm: MT.pstone }); W.paint(['e', 10, 8, 10, 7, 0.3], greens(W, '#80b84e', '#6aa848'));
      P.path(W, [[24, 40], [24, 30], [22, 22]], 2.6, { col: (u, v) => ((u + v) % 2 ? '#b8ae9e' : '#a0968a'), mat: MT.pstone });
      W.spotsW.lookout = [10, 8, CUBE * 2]; W.perches.push([10, 8, CUBE * 2 + 11]);
    },
    dress(W) {
      const P = Pp();
      P.fountain(W, 22, 18); P.windmill(W, 40, 6, 0.8); P.telescope(W, 9, 8); P.birdhouse(W, 32, 22);
      P.hedge(W, 14, 26, 14, 34); P.hedge(W, 30, 30, 36, 30); P.crops(W, 30, 12, 38, 18, 'carrot'); P.fence(W, 29, 11.5, 39, 11.5, { h: 4 });
      P.blossom(W, 4, 22, 1.1); P.oak(W, 46, 26, 1.0, { fruit: '#f0bc56' }); P.lamp(W, 18, 30); P.bench(W, 26, 12, 'u');
      for (let i = 0; i < 8; i++) P.flowers(W, 4 + R(i) * 40, 4 + R(i + 3) * 40, 6);
      dress(W, { kinds: [['flowers', 5], ['tufts', 4], ['bush', 2]], n: 80 });
      P.floatrock(W, -4, 40, -10, 2.4); P.floatrock(W, 46, -4, 8, 2); P.balloon(W, 50, 30, 30, { col: '#c66252' });
      W.fx.push({ k: 'cloud', fx: 0.1, fy: 0.78, w: 30, sp: 4 }, { k: 'cloud', fx: 0.6, fy: 0.9, w: 24, sp: 3 }, { k: 'cloud', fx: 0.3, fy: 0.15, w: 20, sp: 2, a: 0.7 }, { k: 'butterfly', n: 2 });
    },
    after(W) { W.underside(46); },
  };

  // ---------- 魔法学院：后面是大礼堂（彩色玻璃尖窗），两边高高的尖顶塔楼（蓝瓦、旗子），一座观星塔；中庭铺石板，中间一个发光的魔法阵；
  // 水晶球台座、冒泡的魔药锅、书堆；飘着的书、到处飘的魔法光点；草药温室 ----------
  MAPS.academy = {
    meta: { ground: '#6aa848', cliff: '#8a8076' },
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], greens(W, '#6aa848', '#579642'));
      W.raise(['p', [[0, 0], [D, 0], [D, 14], [0, 14]]], CUBE * 2, { side: '#a0968a', sm: MT.pstone }); W.paint(['p', [[0, 0], [D, 0], [D, 14], [0, 14]]], greens(W, '#6aa848', '#579642'));
      const { X0, X1, Y0, Y1 } = W.walk; W.paint(['r', 0, 14, D, D], (u, v) => { const x = 2 * (u - v), y = u + v; return x > X0 - 6 && x < X1 + 6 && y > Y0 - 8 && y < Y1 + 4 ? ((u + v) % 2 ? '#b8ae9e' : '#a8a092') : null; });
      W.each((u, v, i) => { if (W.top[i] == null) W.top[i] = greens(W, '#6aa848', '#579642')(u, v); else if (W.top[i] === '#b8ae9e' || W.top[i] === '#a8a092') W.tm[i] = MT.pstone; });
      W.spotsW.lookout = [42, 10, CUBE * 2]; W.spotsW.fountain = [26, 30, 0];
    },
    dress(W) {
      const P = Pp(), MT = M();
      P.hall(W, 12, 2, 34, 11, { h: 18, rh: 9, door: 23, roof: '#3a5090' });
      P.tower(W, 6, 6, 3.4, 30, { roof: '#3a5090', flag: '#c66252', wins: 4, door: true }); P.tower(W, 40, 6, 3.2, 26, { roof: '#5a4484', flag: '#f0bc56', wins: 3 }); P.tower(W, 46, 18, 2.4, 20, { roof: '#3a5090', flag: '#40b89c', wins: 2 });
      P.telescope(W, 40, 6); W.perches.push([6, 6, CUBE * 2 + 31]);
      P.wall(W, 0.5, 15, 10, 15, 7); P.wall(W, 0.5, 15, 0.5, 30, 7);
      P.pedestal(W, 14, 22, { col: '#64d4b4' }); P.pedestal(W, 36, 18, { col: '#a688cc' }); P.cauldron(W, 42, 30); P.bookstack(W, 9, 34); P.bookstack(W, 10.5, 32);
      P.lamp(W, 18, 18); P.lamp(W, 32, 16);
      // 草药温室
      { const m = W.mesh, z = 0; m.box(2, 36, z, 10, 46, z + 1, '#8a8076', MT.pstone); m.box(2.2, 36.2, z + 1, 9.8, 45.8, z + 8, '#a0d4d6', MT.glass); m.gable(2.2, 36.2, 9.8, 45.8, z + 8, 4, 'v', '#a0d4d6', MT.glass, 0.1); for (let i = 0; i < 4; i++) m.box(2 + i * 2.6, 36, z, 2.3 + i * 2.6, 46, z + 12, '#3c3846', 0); for (let i = 0; i < 5; i++) P.mushroom(W, 4 + R(i) * 4, 38 + i * 1.6, 0.7, { col: ['#a688cc', '#64d4b4', '#f0bc56'][i % 3], glow: '#9aeccc', dots: false }); }
      P.hedge(W, 20, 14.5, 28, 14.5, { cols: ['#386a37', '#46803c', '#579642'] }); P.blossom(W, 44, 40, 1.0);
      for (let i = 0; i < 6; i++) P.flowers(W, 30 + R(i) * 16, 36 + R(i + 2) * 10, 5, { cols: ['#a688cc', '#c4a8e0', '#88aae0', '#f8d872'] });
      // 魔法阵：画在中庭的地上
      W.fx.push({ k: 'rune', u: 30, v: 30, z: 0.1, r: 16 });
      for (const [u, v, z, c, ph] of [[16, 26, 16, '#90363a', 0], [34, 22, 18, '#3a5090', 1.3], [24, 16, 22, '#22786e', 2.1], [40, 26, 14, '#c87a44', 3.3]]) W.fx.push({ k: 'book', u, v, z, col: c, ph });
      W.fx.push({ k: 'motes', n: 22, cols: ['#fcee9e', '#9aeccc', '#c4a8e0', '#ffffff'], fy0: 0.1, fy1: 0.85, sp: 0.05 });
    },
    after(W) { // 魔法阵的石头圈和刻纹（真的铺在地上）
      const m = W.mesh, MT = M(), u = 30, v = 30;
      for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.283, b = ((i + 1) / 40) * 6.283; for (const [r0, r1, c] of [[5.6, 6.1, '#40b89c'], [3.4, 3.7, '#64d4b4']]) m.quad([u + Math.cos(a) * r0, v + Math.sin(a) * r0, 0.04], [u + Math.cos(b) * r0, v + Math.sin(b) * r0, 0.04], [u + Math.cos(b) * r1, v + Math.sin(b) * r1, 0.04], [u + Math.cos(a) * r1, v + Math.sin(a) * r1, 0.04], c, MT.glow); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283, b = a + 2.094; m.quad([u + Math.cos(a) * 5.6, v + Math.sin(a) * 5.6, 0.05], [u + Math.cos(a) * 5.6 + 0.15, v + Math.sin(a) * 5.6, 0.05], [u + Math.cos(b) * 5.6 + 0.15, v + Math.sin(b) * 5.6, 0.05], [u + Math.cos(b) * 5.6, v + Math.sin(b) * 5.6, 0.05], '#9aeccc', MT.glow); }
    },
  };

  // ---------- 地底森林：没有太阳，巨大的发光蘑菇、发光的水潭、悬着的树根和藤、一簇簇水晶；苔藓地面泛着青光；到处是萤火 ----------
  MAPS.undergrove = {
    meta: { dark: true, ground: '#2c5a4a', cliff: '#3c3846', noSeason: true, noSnow: true, amb: [0.34, 0.42, 0.5], sunCol: [0.48, 0.58, 0.62], gnd: [0.2, 0.24, 0.28], slab: ['#3a3040', '#2e2a38', '#221e2a', '#16141c'] },
    build(W) {
      const P = Pp(), MT = M();
      W.paint(['r', 0, 0, D, D], greens(W, '#2c5a4a', '#22453c', '#386a56'));
      const t1 = [[0, 0], [D, 0], [D, 10], [34, 14], [22, 18], [10, 24], [0, 28]];
      W.raise(['p', t1], CUBE * 3, { side: '#3c3846', sm: MT.prock }); W.paint(['p', t1], greens(W, '#2c5a4a', '#22453c'));
      W.pool(['e', 12, 34, 5, 3.4, 0.4], { z: -0.8, deep: 2, bed: '#1a5a56' }); W.wcol = '#2c9886'; W.wspots.push([12, 34, -0.8]);
    },
    dress(W) {
      const P = Pp();
      P.glowshroom(W, 8, 8, 1.5, '#40b89c'); P.glowshroom(W, 24, 6, 1.1, '#8a6cb4'); P.glowshroom(W, 40, 8, 1.3, '#4c68b0'); P.glowshroom(W, 44, 30, 0.9, '#40b89c'); P.glowshroom(W, 3, 24, 0.8, '#8a6cb4');
      for (const [u, v, c] of [[16, 14, '#88aae0'], [32, 12, '#64d4b4'], [42, 40, '#a688cc'], [4, 40, '#64d4b4']]) P.crystal(W, u, v, { col: c });
      for (let i = 0; i < 10; i++) P.mushroom(W, 4 + R(i) * 40, 6 + R(i + 4) * 38, 0.8, { col: ['#40b89c', '#8a6cb4', '#64d4b4'][i % 3], glow: '#9aeccc', dots: false });
      // 从后面岩壁里钻出来的大树根，拱成门洞，上面挂着发光的藤
      for (const [a, b, h] of [[[2, 16], [16, 4], 26], [[20, 10], [34, 2], 22], [[36, 14], [46, 26], 18]]) { const m = W.mesh, n = 10; let prev = null; for (let i = 0; i <= n; i++) { const t = i / n, u = a[0] + (b[0] - a[0]) * t, v = a[1] + (b[1] - a[1]) * t, z = W.H(u, v) + Math.sin(t * Math.PI) * h, r = 1.3 - Math.sin(t * Math.PI) * 0.4; if (prev) m.box(Math.min(prev[0], u) - r, Math.min(prev[1], v) - r, Math.min(prev[2], z) - r, Math.max(prev[0], u) + r, Math.max(prev[1], v) + r, Math.max(prev[2], z) + r, '#4c3a3a', M().pplank); prev = [u, v, z]; if (i % 3 === 1) m.vine([[u, v, z - 1], [u + 0.3, v + 0.3, z - 8 - (i % 2) * 4]], { seed: i + a[0], cols: ['#386a56', '#2c5a4a', '#64d4b4'], drop: 3, bloom: '#9aeccc' }); } }
      dress(W, { kinds: [['fern', 5], ['tufts', 3], ['rock', 2]], n: 70 });
      W.fx.push({ k: 'motes', n: 26, cols: ['#9aeccc', '#64d4b4', '#c4a8e0'], fy0: 0.15, fy1: 0.9, sp: 0.04 });
    },
  };
  PP.DMAPS = MAPS;
  PP.DMAP_HELP = { dress, greens };
})();
