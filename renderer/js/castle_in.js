// 城堡内部：一座剖开的玩具屋。三层、八个房间，老树干从中间穿上去，楼梯贴着后墙。
// 一层：门厅（通起居室）/ 厨房 / 餐厅；二层：浴室 / 图书室 / 工作间；三层：储藏室 / 阁楼卧室。
// 远处的后墙、左墙是完整的；前面和右边只留矮墙，所以每一层、每一间都看得见。
(function () {
  const PP = (window.PP = window.PP || {});
  const g3 = PP.g3, Mesh = g3.Mesh, M = g3.MAT, K = PP.isleModels.K;
  const R0 = 4, U1 = 52, V1 = 20, FZ = [0, 15, 30], TOP = 45;
  const TIMBER = '#5a3a28', WOOD = '#b88a5a', DARK = '#6a4a36', COPPER = '#b0704a', STONE = '#a8a296';
  // 房间：[层, u0, u1, 名字, 地板色, 墙色, 墙纸材质]
  const ROOMS = [
    [0, 4, 18, '门厅', '#9a8a78', '#e8d8c0', M.plaster], [0, 18, 36, '厨房', '#c8b098', '#f2e2c8', M.wallpaper], [0, 36, 52, '餐厅', '#a87a52', '#f0d8b8', M.wallpaper],
    [1, 4, 18, '浴室', '#d8e8ec', '#cfe6ee', M.tile], [1, 18, 36, '图书室', '#8a5e3c', '#d8c8a8', M.wallpaper], [1, 36, 52, '工作间', '#a8845a', '#e0ccb0', M.plank],
    [2, 4, 22, '储藏室', '#9a7a58', '#d8c4a0', M.plank], [2, 22, 52, '阁楼卧室', '#b88a5a', '#f4e0e8', M.wallpaper],
  ];
  // 楼梯：贴着后墙，沿 u 斜着上去
  const S01 = { u0: 39, u1: 50, v0: 4.6, v1: 7.4, axis: 'u', lo: 39, hi: 50, a: 0, b: 1 };
  const S12 = { u0: 21, u1: 32, v0: 4.6, v1: 7.4, axis: 'u', lo: 21, hi: 32, a: 1, b: 2 };
  const TRUNK = { u: 36, v: 5.6, r: 1.7 };
  // 拾取号（和室外、小屋都不冲突）
  const PK = { exit: K.PICK.exit, living: 140, stove: 141, sink: 142, table: 143, tub: 144, shelf: 145, chair: 146, bench: 147, cabinet: 148, crates: 149, bed: 150, tele: 151, trunk: 152, rack: 153, piano: 154, seat: 155 };
  const PROPS = [
    { id: PK.living, at: [11, 6.6, 0], do: 'living', label: '起居室：进去（床、沙发、你摆的家具都在里面）', cur: 'enter' },
    { id: PK.seat, at: [14.6, 15.2, 0], do: 'sit', label: '门厅长凳：坐一会儿', cur: 'rest', spot: { u: 14.6, v: 18.1, z: 3.1 } },
    { id: PK.stove, at: [24, 9.4, 0], do: 'cookp', label: '灶台：做菜（打开菜谱）', cur: 'cook' },
    { id: PK.sink, at: [30, 9.2, 0], do: 'drink', label: '水槽：喝口水', cur: 'water' },
    { id: PK.table, at: [43.5, 16.6, 0], do: 'dine', label: '餐桌：吃一份做好的菜', cur: 'cook' },
    { id: PK.tub, at: [11, 12.6, 1], do: 'bath', label: '浴缸：洗个泡泡澡', cur: 'use' },
    { id: PK.shelf, at: [33, 12.6, 1], do: 'dex', label: '书架：翻图鉴（植物、特产、钓鱼）', cur: 'use' },
    { id: PK.chair, at: [24.6, 15.6, 1], do: 'read', label: '阅读椅：坐着看书', cur: 'rest' },
    { id: PK.bench, at: [44, 14.6, 1], do: 'craft', label: '工作台：用收成做东西', cur: 'use' },
    { id: PK.cabinet, at: [9.6, 10.4, 2], do: 'store', label: '种子柜：看看背包里的东西', cur: 'use' },
    { id: PK.crates, at: [16.4, 14.6, 2], do: 'rummage', label: '旧木箱：翻一翻（说不定有小鱼干）', cur: 'use' },
    { id: PK.bed, at: [44, 13.4, 2], do: 'sleep', label: '阁楼的大床：睡一觉（回体力）', cur: 'rest' },
    { id: PK.tele, at: [49, 16.6, 2], do: 'tele', label: '望远镜：看看天上', cur: 'use' },
  ];
  // 挡路的东西：[层, u0, v0, u1, v1] 或 [层, 'c', u, v, r]
  const wallObs = (lv, u) => [lv, u - 0.4, R0, u + 0.4, 12.4];
  const OBST = [
    wallObs(0, 18), wallObs(0, 36), wallObs(1, 18), wallObs(1, 36), wallObs(2, 22),
    [0, 'c', TRUNK.u, TRUNK.v, TRUNK.r + 0.3], [1, 'c', TRUNK.u, TRUNK.v, TRUNK.r + 0.3], [2, 'c', TRUNK.u, TRUNK.v, TRUNK.r + 0.3],
    // 门厅：衣帽架、长凳、鞋柜
    [0, 'c', 6.4, 6.4, 0.9], [0, 12.4, 16.8, 16.8, 19.4], [0, 4, 8.6, 6, 12],
    // 厨房：灶台、操作台和水槽、碗柜、中岛
    [0, 18.4, 4, 33.6, 7.6], [0, 33, 8, 35.6, 12],
    // 餐厅：长桌和椅子
    [0, 39.4, 10.2, 48, 14.2], [0, 'c', 51, 17.6, 0.8],
    // 浴室：浴缸、洗手台、毛巾架
    [1, 5, 4.6, 13, 10.6], [1, 14, 4, 17.6, 6.6],
    // 图书室：书架、阅读椅、地球仪
    [1, 33.6, 7.6, 35.6, 12.6], [1, 'c', 24.6, 18, 1.4], [1, 'c', 20.8, 15.6, 0.9],
    // 工作间：工作台、木料架
    [1, 40, 9.4, 48.4, 12.6], [1, 37, 15.4, 39.4, 19.6],
    // 储藏室：种子柜、木箱、麻袋
    [2, 4, 4, 15, 8.6], [2, 14.6, 15.6, 20, 19.6], [2, 'c', 6.4, 16.6, 1.4],
    // 阁楼卧室：大床、衣柜、望远镜
    [2, 40, 8.6, 48.6, 12.4], [2, 32.6, 4, 37, 7.6], [2, 'c', 49.4, 18.6, 0.8],
  ];
  const AREA = {
    z: FZ, floors: [[0, R0, R0, U1, V1], [1, R0, R0, U1, V1], [2, R0, R0, U1, V1]], ramps: [S01, S12],
    obst: () => OBST,
  };
  const ROOM_AT = (u, v, lv) => (ROOMS.find((r) => r[0] === lv && u >= r[1] && u <= r[2]) || [])[3] || '';

  function build(o) {
    const m = new Mesh(), cooking = o && o.cooking;
    // —— 地基和后墙、左墙（整面），右边、前面矮墙 ——
    m.box(R0 - 1, R0 - 1, -3, U1 + 0.6, V1 + 0.6, 0, '#8a7a68', M.stone);
    for (const [lv, u0, u1, , fl, wall, wm] of ROOMS) {
      const z = FZ[lv], zt = lv < 2 ? FZ[lv + 1] - 1 : TOP;
      m.box(u0, R0, z - 0.02, u1, V1, z, fl, lv === 1 && u0 === 4 ? M.tile : M.plank); // 地板
      m.box(u0, R0 - 0.6, z, u1, R0, zt, wall, wm); // 后墙
      if (u0 === R0) m.box(R0 - 0.6, R0, z, R0, V1, zt, wall, wm); // 左墙
      m.box(u0, R0, z, u1, R0 + 0.15, z + 1.6, shade(wall, 0.8), M.plank); // 墙裙
    }
    // 楼板（剖面看得到的厚度 + 一根大梁），楼梯口挖空
    for (const lv of [1, 2]) {
      const z = FZ[lv], hole = lv === 1 ? S01 : S12;
      const parts = [[R0, R0, U1, hole.v0 - 0.4], [R0, hole.v1 + 0.6, U1, V1], [R0, hole.v0 - 0.4, hole.u0 - 1, hole.v1 + 0.6], [hole.u1 + 0.8, hole.v0 - 0.4, U1, hole.v1 + 0.6]];
      for (const [a, b, c, d] of parts) m.box(a, b, z - 1, c, d, z - 0.02, '#8a6040', M.plank);
      m.box(R0 - 0.6, V1 - 0.6, z - 1.6, U1 + 0.4, V1 + 0.3, z - 0.02, TIMBER, 2); // 前面的大梁（剖面）
      m.box(U1 - 0.6, R0, z - 1.6, U1 + 0.3, V1, z - 0.02, TIMBER, 2);
    }
    // 隔墙（只到房间一半深，前面敞开走路）、门框
    for (const [lv, u] of [[0, 18], [0, 36], [1, 18], [1, 36], [2, 22]]) { const z = FZ[lv], zt = lv < 2 ? FZ[lv + 1] - 1 : TOP; m.box(u - 0.35, R0, z, u + 0.35, 12.4, zt, '#d8c4a4', M.plaster); m.box(u - 0.5, 12.2, z, u + 0.5, 12.6, zt, TIMBER, 2); }
    // 右边、前面的矮墙
    m.box(U1, R0, 0, U1 + 0.5, V1, 1.4, STONE, M.stone); m.box(R0, V1, 0, U1 + 0.5, V1 + 0.5, 1.4, STONE, M.stone);
    for (const lv of [1, 2]) { m.box(U1, R0, FZ[lv], U1 + 0.4, V1, FZ[lv] + 1.2, TIMBER, 2); m.box(R0, V1, FZ[lv], U1 + 0.4, V1 + 0.4, FZ[lv] + 1.2, TIMBER, 2); }
    // 屋顶的剖面：两坡的大屋顶，椽子露出来
    m.box(R0 - 0.6, R0 - 0.6, TOP, U1 + 0.6, R0 + 0.6, TOP + 0.8, TIMBER, 2);
    m.quad([R0 - 0.6, R0 - 0.8, TOP + 0.6], [U1 + 0.6, R0 - 0.8, TOP + 0.6], [U1 + 0.6, (R0 + V1) / 2, TOP + 7.6], [R0 - 0.6, (R0 + V1) / 2, TOP + 7.6], '#b8503c', M.tile);
    m.tri([R0 - 0.7, R0 - 0.8, TOP], [R0 - 0.7, (R0 + V1) / 2, TOP + 7.6], [R0 - 0.7, V1, TOP], '#d8c4a0', M.plank);
    // 老树干：从地基一直穿过三层楼板，树根爬在一层地上，枝杈伸进阁楼
    m.pk(PK.trunk); m.cyl(TRUNK.u, TRUNK.v, -2, TOP + 6, TRUNK.r, TRUNK.r * 0.8, '#7a5236', M.plank, 12);
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.4; m.quad([TRUNK.u + Math.cos(a) * 1.4 - 0.3, TRUNK.v + Math.sin(a) * 1.4, 2], [TRUNK.u + Math.cos(a) * 1.4 + 0.3, TRUNK.v + Math.sin(a) * 1.4, 2], [TRUNK.u + Math.cos(a) * 3.2 + 0.15, TRUNK.v + Math.sin(a) * 2.6, 0.05], [TRUNK.u + Math.cos(a) * 3.2 - 0.15, TRUNK.v + Math.sin(a) * 2.6, 0.05], '#7a5236', M.plank); }
    m.quad([TRUNK.u - 0.3, TRUNK.v, TOP - 6], [TRUNK.u + 0.3, TRUNK.v, TOP - 6], [TRUNK.u + 6, TRUNK.v + 3, TOP - 1], [TRUNK.u + 5.6, TRUNK.v + 3, TOP - 1], '#7a5236', M.plank);
    m.foliage(TRUNK.u + 6, TRUNK.v + 3.4, TOP - 1, 1.6, 1.6, ['#4c9a48', '#6fbf5a'], 26, 3, 0.7); m.pk(0);
    // 楼梯（实心的木台阶 + 扶手）
    m.stairs(S01.lo, S01.hi, S01.v0, S01.v1, FZ[0], FZ[1], 'u', '#a8784a', 12); m.rail(S01.lo, S01.v1 + 0.1, S01.hi, S01.v1 + 0.1, 0, 3, '#7a4e30');
    m.stairs(S12.lo, S12.hi, S12.v0, S12.v1, FZ[1], FZ[2], 'u', '#a8784a', 12, true); m.rail(S12.lo, S12.v1 + 0.1, S12.hi, S12.v1 + 0.1, FZ[1], 3, '#7a4e30');
    // ===== 一层 =====
    { const z = 0;
      // 门厅：出门的门（左墙）、通起居室的拱门（后墙）、衣帽架、长凳、鞋柜、门口地垫
      m.pk(PK.exit); m.box(R0, 12.2, z, R0 + 0.3, 16, z + 9.6, '#8a5a3a', M.plank); m.box(R0, 11.8, z, R0 + 0.5, 12.2, z + 10.2, TIMBER, 2); m.box(R0, 16, z, R0 + 0.5, 16.4, z + 10.2, TIMBER, 2); m.box(R0, 11.8, z + 9.6, R0 + 0.5, 16.4, z + 10.2, TIMBER, 2); m.box(R0 + 0.3, 15, z + 4.6, R0 + 0.5, 15.4, z + 5, '#e8b84a', M.metal); m.disc(R0 + 0.35, 14.1, z + 7.6, 0.6, 'u', '#ffe9a8', M.glass, 8); m.pk(0);
      m.box(R0 + 0.5, 12.4, z + 0.02, R0 + 3, 15.8, z + 0.1, '#c8603e', M.cloth);
      m.pk(PK.living); m.box(9, R0 - 0.1, z, 13, R0 + 0.12, z + 9, '#3a2a24', 0); m.box(8.6, R0, z, 9, R0 + 0.4, z + 9, TIMBER, 2); m.box(13, R0, z, 13.4, R0 + 0.4, z + 9, TIMBER, 2); m.box(8.6, R0, z + 9, 13.4, R0 + 0.4, z + 10, TIMBER, 2); m.box(9.6, R0 + 0.02, z + 0.5, 12.4, R0 + 0.14, z + 8, '#f2c070', M.glow); m.pk(0);
      m.cyl(6.4, 6.4, z, z + 8.6, 0.16, 0.16, TIMBER, 2, 6); for (let i = 0; i < 4; i++) { const a = i * 1.57; m.box(6.4 + Math.cos(a) * 0.7 - 0.1, 6.4 + Math.sin(a) * 0.7 - 0.1, z + 7.6, 6.4 + Math.cos(a) * 0.7 + 0.1, 6.4 + Math.sin(a) * 0.7 + 0.1, z + 8, TIMBER, 2); } m.blob(6.9, 6.5, z + 6.6, 0.6, 1.6, '#c86a5a', M.cloth, 2, 3, 6); m.ball(5.9, 6.6, z + 8.6, 0.6, 0.4, '#d8b04a', M.cloth, 4, 8);
      m.pk(PK.seat); m.box(12.6, 17, z + 2.6, 16.6, 19.2, z + 3.1, WOOD, M.plank); for (const u of [12.9, 16.3]) m.box(u - 0.2, 17.2, z, u + 0.2, 19, z + 2.6, DARK, 2); m.box(12.8, 18.4, z + 4.2, 16.4, 18.8, z + 4.6, '#c8603e', M.cloth); m.pk(0);
      m.box(4.2, 8.8, z, 5.8, 11.8, z + 4.2, '#a8784a', M.plank); for (let i = 0; i < 3; i++) m.box(5.8, 9.2 + i * 0.9, z + 0.6 + (i % 2) * 1.6, 6.3, 9.8 + i * 0.9, z + 1.4 + (i % 2) * 1.6, ['#e0604a', '#5a8ac8', '#f6c43a'][i], 0);
      m.box(5, R0 + 0.05, z + 10.4, 7.6, R0 + 0.2, z + 12.4, '#f4ead8', 0); m.box(5.2, R0 + 0.15, z + 10.6, 7.4, R0 + 0.25, z + 12.2, '#8ac8e8', 0); // 墙上一幅小画
      // 厨房：铜锅灶台（亮着火）、操作台 + 水槽、吊柜、挂着的锅铲、中岛
      m.pk(PK.stove); m.box(19, R0, z, 26.4, 7.4, z + 6, '#b8705a', M.stone); m.box(18.8, R0, z + 6, 26.6, 7.6, z + 6.5, '#4a4652', M.metal); m.box(20.2, 7.35, z + 1.2, 25.2, 7.45, z + 4.4, cooking ? '#ff9a4a' : '#2a1a14', cooking ? M.glow : 0);
      for (const [u, r] of [[21, 1], [24.4, 1.2]]) { m.cyl(u, 5.6, z + 6.5, z + 8, r, r, '#b0704a', M.metal, 10); m.cyl(u, 5.6, z + 8, z + 8.2, r + 0.1, r + 0.1, '#8a5a3a', M.metal, 10); }
      m.box(19.4, R0, z + 10, 26, R0 + 2.4, z + 11, '#b8705a', M.stone); m.cyl(22.7, R0 + 1.2, z + 11, TOP, 0.9, 0.9, '#b8705a', M.stone, 8); m.pk(0); // 灶台上的烟囱罩一直通上去
      m.pk(PK.sink); m.box(26.6, R0, z, 33.6, 6.8, z + 5.6, '#e8e0d0', M.plank); m.box(26.4, R0, z + 5.6, 33.8, 7, z + 6.1, '#c8b8a0', M.stone); m.box(28.4, 4.8, z + 5.4, 31.4, 6.4, z + 6.15, '#9fd4f2', M.water); m.cyl(29.9, 4.5, z + 6.1, z + 8, 0.12, 0.12, '#c8c0b0', M.metal, 6); m.pk(0);
      m.box(26.8, R0, z + 9.6, 33.4, R0 + 1.8, z + 12.6, '#e8d8b8', M.plank); for (const u of [28.4, 31.6]) m.box(u - 1.4, R0 + 1.8, z + 9.8, u + 1.4, R0 + 1.9, z + 12.4, '#d8c4a0', 0);
      for (let i = 0; i < 4; i++) { const u = 27.4 + i * 1.6; m.box(u - 0.04, R0 + 0.3, z + 7.4, u + 0.04, R0 + 0.4, z + 9.2, '#4a4652', M.metal); m.cyl(u, R0 + 0.6, z + 6.8, z + 7.4, 0.4, 0.4, i % 2 ? COPPER : '#8a8a96', M.metal, 8); }
      m.box(33.2, 8.2, z, 35.4, 11.8, z + 7.4, '#a8784a', M.plank); for (let i = 0; i < 3; i++) m.ball(34.3, 9 + i * 1.1, z + 7.8, 0.45, 0.4, ['#f08a3a', '#e0402a', '#9ad070'][i], 0, 3, 6);
      m.box(20, 12.6, z, 26, 15.4, z + 5, '#c8a070', M.plank); m.box(19.8, 12.4, z + 5, 26.2, 15.6, z + 5.5, '#e8dcc8', M.plank); m.blob(22, 14, z + 6, 0.7, 0.5, '#f4ead8', 0, 2, 3, 6); m.cyl(24.4, 14, z + 5.5, z + 6.6, 0.4, 0.5, '#e0604a', 0, 8);
      // 餐厅：长桌、六把椅子、桌上的花和面包、墙上的盘子架
      m.pk(PK.table); m.box(39.4, 10.2, z + 4.6, 48, 14.2, z + 5.2, '#8a5a3a', M.plank); for (const [u, v] of [[39.8, 10.6], [47.6, 10.6], [39.8, 13.8], [47.6, 13.8]]) m.box(u - 0.25, v - 0.25, z, u + 0.25, v + 0.25, z + 4.6, DARK, 2);
      m.box(39.6, 11.6, z + 5.2, 47.8, 12.8, z + 5.25, '#f4ead8', M.cloth); m.pot(43.7, 12.2, z + 5.2, 0.4, '#5a8ac8'); m.flower(43.7, 12.2, z + 6.6, 1.6, '#f2a6c2', 3); m.blob(41.2, 12.2, z + 5.6, 0.8, 0.5, '#d8a050', M.cloth, 3, 3, 6); m.pk(0);
      for (const u of [41, 43.7, 46.4]) for (const v of [9.2, 15.2]) { m.box(u - 0.9, v - 0.9, z + 2.6, u + 0.9, v + 0.9, z + 3, '#a8784a', M.plank); m.box(u - 0.9, v < 12 ? v - 0.9 : v + 0.6, z + 3, u + 0.9, v < 12 ? v - 0.6 : v + 0.9, z + 7, '#a8784a', M.plank); }
      m.box(48.6, R0, z + 7, 51.6, R0 + 0.9, z + 7.3, TIMBER, 2); for (let i = 0; i < 3; i++) m.disc(49.2 + i * 1, R0 + 0.6, z + 8.2, 0.42, 'v', ['#f4ead8', '#5a8ac8', '#f4ead8'][i], 0, 10);
      m.cyl(51, 17.6, z, z + 3, 0.7, 0.8, '#c8705a', 0, 8); m.foliage(51, 17.6, z + 5, 1.1, 2, ['#3f8a44', '#5aa64e'], 24, 9, 0.7);
      // 吊灯
      for (const u of [11, 27, 44]) { m.box(u - 0.04, 12 - 0.04, FZ[1] - 4.4, u + 0.04, 12 + 0.04, FZ[1] - 1, '#3a3448', M.metal); m.cyl(u, 12, FZ[1] - 5.4, FZ[1] - 4.4, 1.1, 0.4, '#f4d080', M.glow, 8); }
    }
    // ===== 二层 =====
    { const z = FZ[1];
      // 浴室：猫脚浴缸（满满的泡泡）、洗手台和镜子、毛巾架、小黄鸭、铜管
      m.pk(PK.tub); m.box(5.4, 5, z + 1, 12.6, 10.2, z + 4.4, '#f4f8fc', M.tile); m.box(5.9, 5.5, z + 3.4, 12.1, 9.7, z + 4.3, '#cfeaf8', M.water); for (let i = 0; i < 12; i++) m.ball(6.4 + (i % 6) * 1.1, 6.2 + Math.floor(i / 6) * 2, z + 4.5, 0.6, 0.45, '#ffffff', 0, 4, 6);
      for (const [u, v] of [[5.8, 5.4], [12.2, 5.4], [5.8, 9.8], [12.2, 9.8]]) m.ball(u, v, z + 0.5, 0.35, 0.5, '#e8b84a', M.metal, 3, 5); m.ball(10.6, 8.6, z + 5, 0.4, 0.4, '#ffd36a', 0, 4, 6); m.pk(0);
      m.cyl(12.4, 5.2, z + 4.2, z + 7.6, 0.14, 0.14, COPPER, M.metal, 6); m.box(11.6, 4.9, z + 7.4, 12.6, 5.5, z + 7.7, COPPER, M.metal);
      m.box(14.2, R0, z, 17.4, 6.4, z + 4.6, '#f4ead8', M.plank); m.box(14, R0, z + 4.6, 17.6, 6.6, z + 5, '#c8d8e0', M.tile); m.box(14.6, R0 + 0.05, z + 6, 17, R0 + 0.15, z + 10, '#cfeaf8', M.glass); m.box(14.4, R0, z + 10, 17.2, R0 + 0.25, z + 10.4, COPPER, M.metal);
      m.box(4.1, 11, z + 6, 4.4, 15, z + 6.2, COPPER, M.metal); for (let i = 0; i < 3; i++) m.box(4.3, 11.4 + i * 1.2, z + 3.4, 4.5, 12.3 + i * 1.2, z + 6.1, ['#f2a6c2', '#8ac8e8', '#ffe9a8'][i], M.cloth);
      m.box(4.2, 14, z + 0.02, 9, 18, z + 0.08, '#8ac8e8', M.cloth);
      // 图书室：整面墙的书架、阅读椅、地球仪、落地灯、窗边的植物
      m.pk(PK.shelf); m.box(33.6, 7.6, z, 35.6, 12.6, z + 12.8, '#7a4e30', M.plank); for (let r = 0; r < 5; r++) { m.box(33.4, 7.6, z + 0.2 + r * 2.5, 33.7, 12.6, z + 0.5 + r * 2.5, '#5a3a28', 2); for (let b = 0; b < 8; b++) { const v = 7.9 + b * 0.58, h = 1.5 + ((b * 7 + r * 3) % 4) * 0.2; m.box(33.1, v, z + 0.5 + r * 2.5, 33.6, v + 0.48, z + 0.5 + r * 2.5 + h, ['#c8503c', '#4a7ab0', '#e8b84a', '#5a9a5a', '#8a5ab0', '#f4ead8'][(b + r) % 6], 0); } } m.pk(0);
      m.box(18.6, R0, z, 20.6, 7.6, z + 10, '#7a4e30', M.plank); for (let r = 0; r < 4; r++) for (let b = 0; b < 5; b++) m.box(20.5, 4.4 + b * 0.62, z + 0.6 + r * 2.4, 20.9, 4.9 + b * 0.62, z + 2.2 + r * 2.4, ['#c8503c', '#4a7ab0', '#e8b84a', '#5a9a5a'][(b + r) % 4], 0);
      m.pk(PK.chair); m.box(23.2, 16.6, z, 26, 19.4, z + 2.8, '#5a8a6a', M.cloth); m.box(23.2, 18.8, z + 2.8, 26, 19.4, z + 7, '#4a7a5a', M.cloth); for (const u of [23.2, 25.6]) m.box(u, 16.6, z + 2.8, u + 0.4, 19.4, z + 4.4, '#4a7a5a', M.cloth); m.pk(0);
      m.cyl(20.8, 15.6, z, z + 2.6, 0.6, 0.4, TIMBER, 2, 8); m.ball(20.8, 15.6, z + 4, 1.2, 1.2, '#5a9ad8', 0, 6, 10); m.ball(21.1, 15.4, z + 4.4, 0.6, 0.5, '#7ac35a', 0, 3, 6);
      m.cyl(27.6, 18.2, z, z + 9, 0.14, 0.1, '#4a4652', M.metal, 5); m.cyl(27.6, 18.2, z + 8.4, z + 10.6, 1.1, 0.6, '#ffe9a8', M.glow, 8);
      m.box(18.6, 10.6, z + 0.02, 30, 16, z + 0.08, '#b84a4a', M.cloth);
      // 工作间：工作台（锯、锤子、刨花）、墙上挂的工具、木料架、做到一半的小鸟屋
      m.pk(PK.bench); m.box(40, 9.4, z + 4.4, 48.4, 12.6, z + 5.2, '#c8a070', M.plank); for (const [u, v] of [[40.4, 9.8], [48, 9.8], [40.4, 12.2], [48, 12.2]]) m.box(u - 0.3, v - 0.3, z, u + 0.3, v + 0.3, z + 4.4, DARK, 2);
      m.box(41, 10, z + 5.2, 43.4, 11.4, z + 5.4, '#e8c890', 0); m.box(44.6, 10.4, z + 5.2, 47, 11.6, z + 7.2, '#a8784a', M.plank); m.gable(44.4, 10.2, 47.2, 11.8, z + 7.2, 1.2, 'u', '#c8503c', M.tile, 0.2); m.pk(0);
      m.box(39.6, R0 + 0.05, z + 6, 50, R0 + 0.3, z + 11, '#c8a878', M.plank); for (let i = 0; i < 6; i++) { const u = 40.6 + i * 1.6; m.box(u - 0.1, R0 + 0.3, z + 7, u + 0.1, R0 + 0.5, z + 10, i % 2 ? '#4a4652' : TIMBER, 0); }
      m.box(37, 15.4, z, 39.4, 19.6, z + 1, '#8a5e3c', M.plank); for (let i = 0; i < 4; i++) m.box(37.2, 15.6 + i * 1, z + 1, 39.2, 16.4 + i * 1, z + 1.6 + (i % 2) * 0.6, i % 2 ? '#c8a070' : '#a8784a', M.plank);
      for (let i = 0; i < 8; i++) m.box(41 + (i * 1.3) % 7, 13.6 + (i % 3) * 0.8, z + 0.02, 41.4 + (i * 1.3) % 7, 13.9 + (i % 3) * 0.8, z + 0.1, '#e8c890', 0);
    }
    // ===== 三层 =====
    { const z = FZ[2];
      // 储藏室：种子柜（一格格小抽屉）、木箱、麻袋、腌菜罐、挂着的大蒜和干花
      m.pk(PK.cabinet); m.box(4.4, R0, z, 14.6, 8.2, z + 8.4, '#8a5e3c', M.plank); for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const u = 5 + c * 1.6; m.box(u, 8.2, z + 0.6 + r * 1.9, u + 1.4, 8.35, z + 2.2 + r * 1.9, ['#c8a070', '#b8905a'][(r + c) % 2], M.plank); m.box(u + 0.6, 8.35, z + 1.3 + r * 1.9, u + 0.8, 8.5, z + 1.5 + r * 1.9, '#e8b84a', M.metal); } m.pk(0);
      m.pk(PK.crates); for (const [u, v, h] of [[15.2, 16, 3], [18, 16.2, 2.6], [16.4, 18.4, 2.2], [15.6, 16.6, 5.6]]) m.box(u - 1.3, v - 1.2, z + (h > 5 ? 3 : 0), u + 1.3, v + 1.2, z + h, h > 5 ? '#b8905a' : '#a8784a', M.plank); m.pk(0);
      for (const [u, v, c] of [[6, 16, '#d8c8a0'], [7.4, 17.4, '#c8b890'], [5.6, 18.2, '#e0d0a8']]) m.blob(u, v, z + 1.3, 1.2, 1.6, c, M.cloth, u, 4, 7);
      for (let i = 0; i < 4; i++) { m.cyl(12 + i * 1.6, 12.4, z, z + 2 + (i % 2) * 0.6, 0.6, 0.55, ['#c8705a', '#5a8a6a', '#e8c86a', '#8a5ab0'][i], 0, 8); }
      for (let i = 0; i < 5; i++) { const u = 6 + i * 2.6; m.box(u - 0.03, R0 + 1, TOP - 4, u + 0.03, R0 + 1.06, TOP - 0.5, '#d8c8a0', 0); m.ball(u, R0 + 1, TOP - 4.6, 0.5, 0.7, i % 2 ? '#f4ead8' : '#c8a0f0', 0, 3, 6); }
      // 阁楼卧室：大床（花被子）、床头柜和台灯、衣柜、圆窗、望远镜、地毯
      m.pk(PK.bed); m.box(40, 8.6, z, 48.6, 12.4, z + 2.6, '#a8784a', M.plank); m.box(40.2, 8.8, z + 2.6, 48.4, 12.2, z + 3.8, '#f4ead8', M.cloth); m.box(43, 8.8, z + 3.8, 48.4, 12.2, z + 4.3, '#e88aa8', M.cloth); for (let i = 0; i < 4; i++) m.box(43.4 + i * 1.3, 8.8, z + 4.3, 44 + i * 1.3, 12.2, z + 4.35, '#f4ead8', 0);
      m.box(40, 8.6, z, 40.6, 12.4, z + 7.6, '#8a5a3a', M.plank); m.blob(41.6, 10.5, z + 4.6, 1, 0.7, '#ffffff', M.cloth, 2, 3, 6); m.pk(0);
      m.box(38.4, R0 + 0.2, z, 39.8, 6.6, z + 3, '#8a5a3a', M.plank); m.cyl(39.1, 5.4, z + 3, z + 4.6, 0.12, 0.12, '#4a4652', M.metal, 5); m.cyl(39.1, 5.4, z + 4.4, z + 5.6, 0.8, 0.4, '#ffe9a8', M.glow, 8);
      m.box(32.6, R0, z, 37, 7.6, z + 11.6, '#b88a5a', M.plank); m.box(34.7, 7.6, z + 0.4, 34.9, 7.7, z + 11, TIMBER, 0); for (const u of [33.6, 36]) m.box(u, 7.6, z + 5.6, u + 0.3, 7.75, z + 6.4, '#e8b84a', M.metal);
      m.disc(46, R0 + 0.1, z + 9.6, 1.8, 'v', '#5a3a28', 2, 14); m.disc(46, R0 + 0.2, z + 9.6, 1.5, 'v', '#9fd4f2', M.glass, 14); m.box(44.3, R0 + 0.25, z + 9.5, 47.7, R0 + 0.32, z + 9.7, '#5a3a28', 0);
      m.pk(PK.tele); m.cyl(49.4, 18.6, z, z + 3.4, 0.1, 0.1, '#4a4652', M.metal, 4); for (const a of [0, 2.1, 4.2]) m.quad([49.4, 18.6, z + 3], [49.45, 18.6, z + 3], [49.4 + Math.cos(a) * 0.9, 18.6 + Math.sin(a) * 0.9, z], [49.35 + Math.cos(a) * 0.9, 18.6 + Math.sin(a) * 0.9, z], '#4a4652', M.metal); m.quad([48.6, 18.2, z + 3.2], [48.6, 19, z + 3.2], [50.8, 19, z + 5.6], [50.8, 18.2, z + 5.6], COPPER, M.metal); m.pk(0);
      m.cyl(44.2, 16.4, z + 0.02, z + 0.1, 3.4, 3.4, '#a8c8e8', M.cloth, 16); m.cyl(44.2, 16.4, z + 0.1, z + 0.14, 2.2, 2.2, '#f4ead8', M.cloth, 16);
      for (const u of [14, 40]) { m.box(u - 0.04, 12 - 0.04, TOP - 4.4, u + 0.04, 12 + 0.04, TOP, '#3a3448', M.metal); m.cyl(u, 12, TOP - 5.4, TOP - 4.4, 1, 0.4, '#f4d080', M.glow, 8); }
    }
    // 每一层的房间名牌（小木牌钉在后墙上）
    for (const [lv, u0, u1] of ROOMS) { const u = (u0 + u1) / 2 + (u0 === 18 && lv === 0 ? -4 : 0), z = FZ[lv] + 12.2; m.box(u - 1.6, R0 + 0.05, z, u + 1.6, R0 + 0.3, z + 1.3, '#d8b888', M.plank); m.box(u - 1.7, R0 + 0.05, z + 1.3, u + 1.7, R0 + 0.32, z + 1.45, TIMBER, 0); }
    return m;
  }
  function dyn(o) {
    const m = new Mesh(), t = o.t;
    if (o.cooking) for (let i = 0; i < 5; i++) { const h = 1.4 + Math.sin(t * 9 + i * 2.1) * 0.6; m.cyl(20.6 + i * 1, 7.3, 1.4, 1.4 + h * 1.6, 0.4, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); }
    return m;
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
  K.ORG.castle = [63, 102];
  PP.castleIn = { build, dyn, AREA, PROPS, PK, ROOMS, ROOM_AT, FZ, S01, S12, TRUNK, START: { u: 6.8, v: 14, lv: 0 }, FROM_LIVING: { u: 11, v: 7.4, lv: 0 } };
})();
