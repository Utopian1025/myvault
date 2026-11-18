// 动物的小窝（进门以后看到的屋里）：和小场景同一套微缩模型画风。
// 按“家的种类”分几种屋子：土洞 / 岩洞 / 树洞、木屋、冰屋、水边 / 海里的窝；每种动物再按习性加几样自己的东西。
// 屋子是一块剖开的地：后面两面墙（左后、右后），前面敞开；动物在前面那条走。
(function () {
  const PP = (window.PP = window.PP || {});
  const D = 48, CUBE = 2.45;
  const Pp = () => PP.DPROPS, M = () => PP.g3.MAT;
  // 把一组东西按中心放大 k 倍（屋子很大，家具按场景比例做得太小会显得空）
  const SM = (m, cu, cv, k) => ({
    box: (a, b, c, d, e, f, col, mat) => m.box(cu + (a - cu) * k, cv + (b - cv) * k, c * k, cu + (d - cu) * k, cv + (e - cv) * k, f * k, col, mat),
    cyl: (u, v, z0, z1, r0, r1, col, mat, n, ...x) => m.cyl(cu + (u - cu) * k, cv + (v - cv) * k, z0 * k, z1 * k, r0 * k, r1 * k, col, mat, n, ...x),
    ball: (u, v, z, r, rz, col, mat, a, b, ...x) => m.ball(cu + (u - cu) * k, cv + (v - cv) * k, z * k, r * k, rz * k, col, mat, a, b, ...x),
  });
  const K = 2.1;
  const R = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const STYLE = {
    burrow: 'den', sandburrow: 'sand', snowburrow: 'snowden', rockden: 'rock', cave: 'rock', icecave: 'icecave', hollow: 'hollow', mudhut: 'den', sandmound: 'sand', eelbed: 'sea',
    cottage: 'house', kennel: 'house', coop: 'barn', sty: 'barn', shed: 'barn', barn: 'barn', stonehut: 'stone', treehouse: 'tree', leafhut: 'tree', grasshut: 'hut', duckhouse: 'house', tent: 'hut',
    lilyhut: 'pond', reedhut: 'pond', lodge: 'lodge', shellhouse: 'sea', wreck: 'sea', jar: 'sea', nestpost: 'hut', cliffnest: 'rock', igloo: 'igloo', icehole: 'igloo',
  };
  // 每种屋子的样子：地面、墙、墙顶、灯光
  const LOOK = {
    den:     { floor: ['#8a6644', '#7a5838'], fm: 'pdirt', wall: '#6a4a34', wm: 'pdirt', top: '#5a9a48', tmm: 'pgrass', roots: true, amb: [0.5, 0.42, 0.36], sun: [0.98, 0.8, 0.6] },
    sand:    { floor: ['#e0c494', '#d4b484'], fm: 'psand', wall: '#c89e6c', wm: 'psand', top: '#e8cc9c', tmm: 'psand', roots: false, amb: [0.56, 0.48, 0.38], sun: [1, 0.86, 0.66] },
    snowden: { floor: ['#e8eef6', '#d8e2ee'], fm: 'psnow', wall: '#b4cce0', wm: 'psnow', top: '#f4f8fc', tmm: 'psnow', amb: [0.5, 0.54, 0.62], sun: [0.92, 0.9, 0.86] },
    rock:    { floor: ['#6a6476', '#5e5a6a'], fm: 'prock', wall: '#4c4858', wm: 'prock', top: '#3c3846', tmm: 'prock', amb: [0.38, 0.36, 0.44], sun: [0.95, 0.75, 0.55], dark: true },
    icecave: { floor: ['#cfe6f5', '#b8d8ee'], fm: 'pice', wall: '#94b4d0', wm: 'pice', top: '#e2f1fb', tmm: 'psnow', amb: [0.48, 0.56, 0.66], sun: [0.86, 0.92, 1] },
    hollow:  { floor: ['#9a6a44', '#8a5e3c'], fm: 'pplank', wall: '#6a4630', wm: 'pplank', top: '#4f8c46', tmm: 'pleaf', roots: true, amb: [0.46, 0.4, 0.34], sun: [1, 0.8, 0.56] },
    house:   { floor: ['#b4845a', '#a87a54'], fm: 'pplank', wall: '#efe0c8', wm: 'pstone', top: '#8a5a3a', tmm: 'pplank', house: true, amb: [0.56, 0.5, 0.44], sun: [1, 0.86, 0.66] },
    barn:    { floor: ['#d8b04a', '#c49a3a'], fm: 'pthatch', wall: '#a8603e', wm: 'pplank', top: '#7a3a2e', tmm: 'pplank', house: true, amb: [0.54, 0.46, 0.38], sun: [1, 0.84, 0.6] },
    stone:   { floor: ['#8a8076', '#7a7266'], fm: 'pstone', wall: '#a89e92', wm: 'pstone', top: '#6a6470', tmm: 'pstone', house: true, amb: [0.5, 0.48, 0.46], sun: [1, 0.8, 0.58] },
    tree:    { floor: ['#a87a54', '#9a6c48'], fm: 'pplank', wall: '#7a5238', wm: 'pplank', top: '#46803c', tmm: 'pleaf', house: true, amb: [0.5, 0.48, 0.38], sun: [1, 0.88, 0.62] },
    hut:     { floor: ['#d8c49a', '#c8b48a'], fm: 'psand', wall: '#c8a860', wm: 'pthatch', top: '#b4904a', tmm: 'pthatch', house: true, amb: [0.56, 0.5, 0.4], sun: [1, 0.86, 0.62] },
    pond:    { floor: ['#7a8a5a', '#6a7a4e'], fm: 'pdirt', wall: '#5a6a3e', wm: 'pdirt', top: '#5aa64e', tmm: 'pgrass', roots: true, water: true, amb: [0.46, 0.5, 0.44], sun: [0.92, 0.94, 0.8] },
    lodge:   { floor: ['#7a5838', '#6a4a30'], fm: 'pdirt', wall: '#6a4630', wm: 'pplank', top: '#5a9a48', tmm: 'pgrass', water: true, amb: [0.44, 0.42, 0.4], sun: [1, 0.82, 0.6] },
    sea:     { floor: ['#e0cc9c', '#d4bc8c'], fm: 'psand', wall: '#8a7a8a', wm: 'prock', top: '#6a8a9a', tmm: 'prock', sea: true, amb: [0.4, 0.54, 0.64], sun: [0.7, 0.86, 1] },
    igloo:   { floor: ['#b8d8ee', '#a6cce6'], fm: 'pice', wall: '#dce9f4', wm: 'psnow', top: '#f8fbff', tmm: 'psnow', blocks: true, amb: [0.52, 0.58, 0.68], sun: [0.9, 0.94, 1] },
  };
  // 屋里的几样：床、吃饭的地方、玩的东西（按物种挑）
  const FOOD = { cat: 'fish', dog: 'bone', fox: 'berries', hedgehog: 'berries', rabbit: 'carrot', hamster: 'seeds', marmot: 'seeds', squirrel: 'seeds', bear: 'honey', brownbear: 'honey', polarbear: 'fish', penguin: 'fish', seal: 'fish', otter: 'fish', duck: 'seeds', chick: 'seeds', pig: 'apple', cow: 'hay', sheep: 'hay', yak: 'hay', alpaca: 'hay', camel: 'hay', deer: 'apple', zebra: 'hay', antelope: 'hay', monkey: 'banana', parrot: 'banana', frog: 'bugs', capybara: 'apple', crab: 'shell', octopus: 'shell', shark: 'fish', turtle: 'apple', lion: 'bone', tiger: 'bone', snowleopard: 'bone', dragon: 'gem' };
  function food(W, u, v, kind) {
    const m = SM(W.mesh, u, v, K), P = Pp(), z = W.H(u, v) > 0 ? W.H(u, v) / 1 : 0, MT = M();
    // 小木碗 + 碗里的东西
    m.cyl(u, v, 0, 0.9, 1.3, 1.5, '#8a5a3a', MT.pplank, 10); m.cyl(u, v, 0.9, 1.0, 1.15, 1.15, '#4a3024', 0, 10);
    const pile = { fish: ['#9ac4d8', '#c8dce8'], bone: ['#f4e2bc', '#e4d0a4'], berries: ['#c8384a', '#7a3a8a'], carrot: ['#f08a2a', '#58a040'], seeds: ['#d8b06a', '#a87a44'], honey: ['#f0b030', '#ffd36a'], apple: ['#d84a3a', '#f0c040'], hay: ['#e8c86a', '#d8b04a'], banana: ['#f8d84a', '#e8c030'], bugs: ['#5a8a4a', '#3a3446'], shell: ['#f8d4c4', '#e8b4a4'], gem: ['#64d4b4', '#a688cc'] }[kind] || ['#d8b06a', '#a87a44'];
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + u, r = 0.55 * R(i + u); m.ball(u + Math.cos(a) * r, v + Math.sin(a) * r, 1.15 + (i % 2) * 0.25, 0.42, 0.5, pile[i % 2], 0, 3, 6); }
    if (kind === 'carrot') { m.cyl(u + 1.6, v + 0.6, 0, 0.5, 0.25, 0.35, '#f08a2a', 0, 6); m.box(u + 1.4, v + 0.4, 0.5, u + 1.8, v + 0.8, 1.1, '#58a040', 0); }
    if (kind === 'fish') { m.ball(u + 1.8, v + 0.4, 0.4, 0.4, 1, '#9ac4d8', 0, 3, 6); }
  }
  function bed(W, u, v, look, sp) {
    const m = SM(W.mesh, u, v, K * 0.9), MT = M();
    if (look.house) { // 篮子窝 + 软垫 + 小毯子
      m.cyl(u, v, 0, 1.6, 3.2, 3.4, '#b4884a', MT.pthatch, 14); m.cyl(u, v, 1.2, 2.0, 2.7, 2.7, '#e8a0a8', 0, 14); m.ball(u - 0.6, v - 0.4, 2.0, 2.1, 0.8, '#f4c0c4', 0, 4, 10);
      m.box(u + 0.8, v - 2.4, 1.6, u + 2.4, v + 1.6, 1.9, '#7ab0d8', 0); m.box(u + 1.0, v - 2.2, 1.9, u + 1.3, v + 1.4, 2.0, '#f4f0e0', 0);
    } else if (look.sea) { // 海里：海草垫 + 贝壳边
      m.cyl(u, v, 0, 0.6, 3.2, 3.4, '#6a9a5a', 0, 14); for (let i = 0; i < 14; i++) { const a = i * 0.45; Pp().shell(W, u + Math.cos(a) * 3.4 * K * 0.9, v + Math.sin(a) * 3.4 * K * 0.9, i % 2 ? '#f8d4c4' : '#e8c0d0'); }
    } else if (look.blocks || sp === 'penguin' || sp === 'seal' || sp === 'polarbear') { // 冰屋：一张厚厚的毛皮垫
      m.cyl(u, v, 0, 0.7, 3.4, 3.2, '#c8b08a', 0, 14); m.cyl(u, v, 0.7, 0.9, 2.8, 2.6, '#e8d8b8', 0, 14);
    } else { // 洞里：干草 + 落叶堆成的窝
      for (let i = 0; i < 18; i++) { const a = i * 0.35, r = 2.6 + 0.5 * R(i + v); m.ball(u + Math.cos(a) * r, v + Math.sin(a) * r, 0.7, 1.1, 0.9, ['#d8b04a', '#c49a3a', '#e8c86a', look.floor[0]][i % 4], MT.pthatch, 3, 7); }
      m.cyl(u, v, 0, 0.8, 2.6, 2.6, '#c49a3a', MT.pthatch, 12);
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3; m.ball(u + Math.cos(a) * 1.2, v + Math.sin(a) * 1.2, 1.0, 0.7, 0.3, ['#d86a3a', '#e8a040', '#b4483a'][i % 3], 0, 3, 6); }
    }
  }
  function toy(W, u, v, sp, look) {
    const m = SM(W.mesh, u, v, K), P = Pp();
    if (sp === 'cat') { m.ball(u, v, 0.9, 0.9, 0.9, '#e86a6a', 0, 5, 8); for (let i = 0; i < 6; i++) m.box(u + 0.8 + i * 0.4, v + Math.sin(i) * 0.4, 0.1, u + 1.1 + i * 0.4, v + Math.sin(i) * 0.4 + 0.12, 0.2, '#e86a6a', 0); m.cyl(u - 3, v + 2, 0, 6, 0.6, 0.6, '#c8a878', M().pthatch, 8); m.box(u - 4.2, v + 0.8, 6, u - 1.8, v + 3.2, 6.6, '#a87a54', M().pplank); return; }
    if (sp === 'dog') { m.ball(u, v, 0.9, 0.9, 0.9, '#f0c040', 0, 5, 8); P.bones(W, u + 2.4, v - 1); return; }
    if (look.sea) { P.anemone(W, u, v); P.starfish(W, u + 2.4, v - 0.6); return; }
    if (look.water) { m.cyl(u, v, 0, 0.4, 1.6, 1.6, '#5aa64e', 0, 10); m.ball(u + 2.2, v, 0.5, 0.6, 0.6, '#f4f0e0', 0, 4, 6); return; }
    if (look.house) { m.ball(u, v, 0.9, 0.9, 0.9, '#7ab0d8', 0, 5, 8); for (let i = 0; i < 3; i++) m.box(u + 1.6, v - 1 + i * 0.1, 0, u + 2.6, v + 0 + i * 0.1, 0.5 + i * 0.5, ['#e86a6a', '#f0c040', '#7ab0d8'][i], 0); return; }
    // 洞里：松果、小石头、一根羽毛
    for (let i = 0; i < 4; i++) m.ball(u + i * 0.9 - 1.3, v + (i % 2) * 0.8, 0.5, 0.5, 0.7, ['#8a5a3a', '#a8a0a8', '#7a4a2a', '#c8a060'][i], 0, 3, 6);
  }
  // 墙：两面后墙 + 墙头（洞是长草的土坡顶，屋是房梁）
  function walls(W, look) {
    const MT = M(), H = CUBE * 12, sm = MT[look.wm], tm = MT[look.tmm];
    const back = (pts) => W.raise(['p', pts], H, { side: look.wall, sm, top: look.top, tm, force: true });
    if (look.house || look.blocks) {
      back([[0, 0], [D, 0], [D, 2.4], [0, 2.4]]); back([[0, 0], [2.4, 0], [2.4, D], [0, D]]);
    } else { // 洞：不规则的弧形墙，越往两边越低
      back([[0, 0], [D, 0], [D, 3], [38, 5], [26, 6], [14, 8], [7, 13], [5, 24], [4, 36], [3, D], [0, D]]);
      W.raise(['p', [[0, 0], [D, 0], [D, 1.6], [0, 1.6]]], H + CUBE * 2, { side: look.wall, sm, top: look.top, tm, force: true });
      W.raise(['p', [[0, 0], [1.6, 0], [1.6, D], [0, D]]], H + CUBE * 2, { side: look.wall, sm, top: look.top, tm, force: true });
    }
  }
  function decorWalls(W, look, sp) {
    const m = W.mesh, P = Pp(), MT = M(), H = CUBE * 12;
    if (look.house || look.blocks) {
      // 右后墙（v≈2.4）：窗户、画、架子；左后墙（u≈2.4）：门、挂钩
      const win = (u0, u1, z0, z1) => { m.box(u0 - 0.4, 2.3, z0 - 0.4, u1 + 0.4, 2.6, z1 + 0.4, '#6a4630', MT.pplank); m.box(u0, 2.45, z0, u1, 2.7, z1, look.blocks ? '#bfe4ff' : '#bfe4ff', MT.glow); m.box((u0 + u1) / 2 - 0.15, 2.5, z0, (u0 + u1) / 2 + 0.15, 2.8, z1, '#6a4630', 0); m.box(u0, 2.5, (z0 + z1) / 2 - 0.15, u1, 2.8, (z0 + z1) / 2 + 0.15, '#6a4630', 0); m.box(u0 - 0.6, 2.4, z0 - 0.9, u1 + 0.6, 3.4, z0 - 0.5, '#8a5a3a', MT.pplank); };
      if (!look.blocks) {
        win(14, 22, 11, 19); win(30, 36, 11, 17);
        m.box(25, 2.4, 13, 28, 2.7, 17, '#c87a44', 0); m.box(25.4, 2.6, 13.4, 27.6, 2.8, 16.6, '#7ab0d8', 0); // 小画
        m.box(39, 2.4, 9, 46, 4.2, 9.4, '#8a5a3a', MT.pplank); P.bookstack(W, 40.5, 3.2); // 架子
        for (const [u, c] of [[42.5, '#e86a6a'], [44.5, '#5aa64e']]) m.cyl(u, 3.3, 9.4, 11, 0.6, 0.5, c, 0, 8);
        // 左后墙：门（出去）+ 墙脚线
        m.box(2.3, 6, 0, 2.7, 12, 15, '#8a5a3a', MT.pplank); m.box(2.6, 6.4, 0, 2.9, 11.6, 14.6, '#a87a54', MT.pplank); m.box(2.8, 10.6, 7, 3.1, 11.0, 7.6, '#f0c040', MT.metal);
        m.box(2.4, 2.4, 0, D, 2.7, 1, '#8a5a3a', 0); m.box(2.4, 2.4, 0, 2.7, D, 1, '#8a5a3a', 0);
        // 地毯
        m.box(16, 20, 0.02, 32, 30, 0.12, '#c86a6a', 0); m.box(17, 21, 0.12, 31, 29, 0.16, '#e8a0a0', 0);
        // 吊灯
        m.box(24, 14, 22, 24.2, 14.2, H, '#3a3448', 0); m.cyl(24.1, 14.1, 19.5, 22, 1.4, 0.4, '#f0c040', MT.metal, 8); W.lights.push({ u: 24.1, v: 14.1, z: 19, r: 22, col: '#ffcf80', always: true });
      } else { // 冰屋：冰砖墙缝
        for (let k = 0; k < 6; k++) { const z = k * 4.6; m.box(2.4, 2.38, z, D, 2.42, z + 0.25, '#b4cce0', 0); m.box(2.38, 2.4, z, 2.42, D, z + 0.25, '#b4cce0', 0); }
        m.box(20, 2.3, 8, 26, 2.6, 13, '#9ad4f4', MT.glow);
      }
    } else {
      // 洞：顶上垂下来的根须，墙上嵌着的石头，一盏挂灯
      if (look.roots) for (let i = 0; i < 14; i++) { const t = i / 14, u = 6 + t * 38, v = 3.2 + 3 * Math.sin(t * 3), len = 6 + 7 * R(i); for (let k = 0; k < 4; k++) m.box(u + Math.sin(k + i) * 0.3 - 0.12, v - 0.12, H - len * (k + 1) / 4, u + Math.sin(k + i) * 0.3 + 0.12, v + 0.12, H - len * k / 4, '#5a3e2c', 0); }
      for (let i = 0; i < 10; i++) { const u = 4 + R(i * 3) * 40; m.ball(u, 3.6 + R(i) * 1.5, 3 + R(i + 9) * 18, 0.9, 0.8, '#8a8076', M().prock, 3, 6); }
      P.lantern(W, 18, 6.5, H - 2); W.lights.push({ u: 18, v: 6.5, z: H - 4, r: 24, col: '#ffcf80', always: true });
    }
  }
  function make(sp) {
    const kind = (PP.DIO.HOMEKIND || {})[sp] || 'burrow', st = STYLE[kind] || 'den', look = LOOK[st];
    return {
      meta: { ground: look.floor[0], groundMat: 0, cliff: look.wall, noSeason: true, noSnow: true, inside: true, amb: look.amb, sunCol: look.sun, dark: !!look.dark,
        slab: [look.wall, PP.DIO.shade(look.wall, 0.85), PP.DIO.shade(look.wall, 0.7), PP.DIO.shade(look.wall, 0.55)] },
      homes: [],
      signAt: look.house || look.blocks ? [3.4, 9, 0, 3.2, 15] : [8, 10, 0, 4, 12],
      build(W) {
        const MT = M(), fm = MT[look.fm];
        W.paint(['r', 0, 0, D, D], (u, v) => (PP.DIO.NZ(u / 4, v / 4, 5) > 0.5 ? look.floor[0] : look.floor[1]), fm);
        if (look.fm === 'pplank') W.paint(['r', 0, 0, D, D], (u, v) => (((u | 0) % 6 === 0) ? PP.DIO.shade(look.floor[0], 0.86) : (((u / 6) | 0) + (v | 0) % 2) % 2 ? look.floor[0] : look.floor[1]), fm);
        walls(W, look);
        if (look.water) { W.pool(['e', 38, 16, 7, 4.5, 0.4], { z: -0.6, deep: 2, bed: '#4a6a5a' }); W.wspots.push([38, 16, -0.6]); }
        if (look.sea) { W.pool(['e', 36, 14, 6, 4, 0.4], { z: -0.4, deep: 2, bed: '#2a6688' }); }
        // 设施点：都在前面能走的那条上
        W.spotsW.bed = [17, 33, 0]; W.spotsW.eat = [30, 30, 0]; W.spotsW.play = [36, 26, 0];
      },
      dress(W) {
        const P = Pp(), m = W.mesh;
        bed(W, 13, 22, look, sp); food(W, 26, 18, FOOD[sp] || 'seeds'); toy(W, 34, 12, sp, look);
        decorWalls(W, look, sp);
        // 屋里的小摆设：洞里堆点存粮和蘑菇，屋里放桶和箱子
        const mm = W.mesh, MT = M();
        const table = (u, v) => { const t = SM(mm, u, v, 1); t.box(u - 2.6, v - 2, 4.6, u + 2.6, v + 2, 5.2, '#a87a54', MT.pplank); for (const [a, b] of [[-2.2, -1.6], [2.2, -1.6], [-2.2, 1.6], [2.2, 1.6]]) t.box(u + a - 0.25, v + b - 0.25, 0, u + a + 0.25, v + b + 0.25, 4.6, '#7a5238', 0); t.cyl(u + 0.8, v - 0.4, 5.2, 6.4, 0.5, 0.4, '#f4f0e0', 0, 8); t.cyl(u + 0.8, v - 0.4, 6.4, 6.9, 0.15, 0.15, '#ffd36a', MT.glow, 5); t.box(u - 1.6, v - 0.2, 5.2, u - 0.2, v + 1.2, 5.5, '#e8a0a0', 0); };
        const stool = (u, v) => { mm.cyl(u, v, 0, 3, 0.5, 0.5, '#7a5238', 0, 6); mm.cyl(u, v, 3, 3.5, 1.2, 1.2, '#a87a54', MT.pplank, 10); };
        const plant = (u, v, s = 1) => { mm.cyl(u, v, 0, 2.2 * s, 1.0 * s, 1.3 * s, '#c87a44', 0, 10); for (let i = 0; i < 6; i++) { const a = i * 1.05; mm.ball(u + Math.cos(a) * 0.9 * s, v + Math.sin(a) * 0.9 * s, 3.4 * s + (i % 2) * 0.8 * s, 1.2 * s, 1.6 * s, i % 2 ? '#4f8c46' : '#6aa848', MT.pleaf, 4, 7); } };
        if (look.house) {
          table(9, 32); stool(13, 35); stool(6, 28);
          P.barrel(W, 42, 7); P.crate(W, 46, 10, 1.1); P.crate(W, 7, 42, 1); plant(44, 18, 1.2); plant(6, 14, 1); P.pot(W, 30, 5, '#5a9ac8');
          // 炉子：靠左后墙，冒着暖光
          mm.box(3, 18, 0, 7, 24, 9, '#5a4a52', MT.pbrick); mm.box(6.9, 19.4, 1.5, 7.2, 22.6, 5, '#ff9a3a', MT.glow); mm.box(4, 20, 9, 5.6, 21.6, 22, '#4a3e48', MT.pbrick); W.lights.push({ u: 7.3, v: 21, z: 3, r: 18, col: '#ffa860', always: true }); W.fires.push([7.4, 21, 2]);
        } else if (look.blocks) { mm.cyl(26, 30, 0.02, 0.14, 7, 6, '#c8b08a', 0, 18); mm.cyl(26, 30, 0.14, 0.2, 5.6, 4.8, '#e8d8b8', 0, 18); P.iceblock(W, 42, 8, 1.2); P.iceblock(W, 8, 38, 1.1); P.iceblock(W, 44, 13, 0.8); for (let i = 0; i < 7; i++) mm.ball(30 + (i % 3) * 1.2, 6 + ((i / 3) | 0) * 1.1, 0.6 + ((i / 3) | 0) * 0.6, 0.7, 1.6, '#9ac4d8', 0, 3, 6); P.lantern(W, 20, 6, 14); W.lights.push({ u: 20, v: 6, z: 12, r: 22, col: '#ffcf80', always: true }); }
        else if (look.sea) { P.coral(W, 8, 30, { col: '#e88aa0' }); P.coral(W, 43, 30, { col: '#f0b060' }); P.chest && P.chest(W, 42, 10); P.kelpstem(W, 42, 6, 20); P.kelpstem(W, 6, 40, 16); P.shell(W, 20, 8); P.starfish(W, 10, 14); for (const [fx, fy, n] of [[0.2, 0.7, 5], [0.7, 0.66, 6]]) W.fx.push({ k: 'bubbles', fx, fy, n, fh: 0.5, sp: 0.15, ph: fx }); }
        else {
          // 洞里：一丛蘑菇、存粮堆、干草捆、树桩小桌上点着蜡烛、几块石头
          for (const [u, v, s2, c] of [[8, 30, 1.6, '#c66252'], [10.5, 32.5, 1.1, '#e8a040'], [7, 34, 0.9, '#c66252'], [42, 30, 1.3, '#e8a040']]) P.mushroom(W, u, v, s2, { col: c });
          for (let i = 0; i < 16; i++) { const a = i * 0.7, r = 1.6 * Math.sqrt(i / 16); mm.ball(40 + Math.cos(a) * r * 2, 10 + Math.sin(a) * r * 2, 0.6 + (16 - i) * 0.12, 0.8, 0.8, ['#8a5a3a', '#7a4a2a', '#c8a060', '#a86a3a'][i % 4], 0, 3, 6); }
          P.hay(W, 44, 18); P.stump(W, 30, 7, 1.1); mm.cyl(30, 7, 3.4, 4.8, 0.45, 0.45, '#f4f0e0', 0, 8); mm.cyl(30, 7, 4.8, 5.3, 0.12, 0.12, '#ffd36a', MT.glow, 5); W.lights.push({ u: 30, v: 7, z: 5, r: 14, col: '#ffcf80', always: true });
          P.rock(W, 44, 40, 1.1); P.rock(W, 6, 42, 0.9); P.log(W, 38, 40, 7, 'v');
          if (st === 'rock' || st === 'icecave') { P.crystal(W, 9, 38, { col: st === 'icecave' ? '#bfe4ff' : '#a688cc', s: 1.3 }); P.crystal(W, 44, 26, { col: st === 'icecave' ? '#e2f1fb' : '#88aae0', s: 1 }); }
          if (st === 'den' || st === 'hollow' || st === 'pond' || st === 'lodge') { P.glowshroom(W, 11, 16, 0.45); W.lights.push({ u: 11, v: 16, z: 5, r: 12, col: '#64d4b4', always: true }); }
        }
      },
    };
  }
  PP.DHOMES = { make, style: (sp) => STYLE[(PP.DIO.HOMEKIND || {})[sp] || 'burrow'] || 'den' };
})();
