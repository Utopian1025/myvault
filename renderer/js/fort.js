// 城堡 2.0：整座岛就是一座东拼西凑的移动城堡。只建一次——外面看到的每一栋歪房子、每一坨铁身子，就是里面的一间屋。
// 外部视角：全部画出来。内部视角（剖切）：选一层，这层以上拿掉，这层朝镜头那边的墙压矮，就能看进屋里。转视角时压矮的墙跟着换。
// 结构（从下往上）：
//   铁身子 A（左后，圆的，四层）：锅炉房 → 门厅 → 工作间 → 驾驶室（顶上扣着铁圆顶），楼梯就在它肚子里一路往上
//   铁身子 B（右后，圆的，三层）：水泵间 → 储藏间 → 浴室（顶上架着铜水塔）
//   中间叠着的木头房子：厨房 → 起居室（左右悬出去）→ 卧室（再错一截，尖顶）
//   左边叠着的：柴房 → 图书室 → 阁楼仓库
//   餐厅一层，屋顶是屋顶花园（热气球停在这儿）；花房是甲板上的玻璃屋
//   甲板就是城堡的一层：田、蓄水池、蜂箱、信箱都在甲板上；甲板下面是铆钉铁皮的船体和发蓝光的浮岩
(function () {
  const PP = (window.PP = window.PP || {});
  const g3 = PP.g3, Mesh = g3.Mesh, M = g3.MAT;
  const H = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = Math.min(255, Math.round(((n >> 16) & 255) * k)), g = Math.min(255, Math.round(((n >> 8) & 255) * k)), b = Math.min(255, Math.round((n & 255) * k)); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); };
  const P2 = () => (PP.isleModels && PP.isleModels.parts) || {};

  // ---------- 尺寸 ----------
  const Z = [-16, 0, 15, 30], NAME = ['地下层', '甲板层', '二层', '三层'];
  const WH = 14, FS = 0.8, DOOR_H = 10;
  const CEN = [24, 24];
  const DK = { u0: -1, v0: 0, u1: 49, v1: 48, r: 9 };
  const inDeck = (u, v, m = 0) => { const { u0, v0, u1, v1, r } = DK; const a = u0 + m, b = v0 + m, c = u1 - m, d = v1 - m, rr = Math.max(0.1, r - m); if (u < a || u > c || v < b || v > d) return false; const cu = Math.min(Math.max(u, a + rr), c - rr), cv = Math.min(Math.max(v, b + rr), d - rr); return Math.hypot(u - cu, v - cv) <= rr; };
  const deckEdge = (n = 120, m = 0, wob = true) => { const { u0, v0, u1, v1, r } = DK, pts = [], C4 = [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, 1], [u0 + r, v0 + r, 2], [u1 - r, v0 + r, 3]]; for (const [cu, cv, q] of C4) for (let i = 0; i <= n / 4; i++) { const a = (q + i / (n / 4)) * Math.PI / 2, k = pts.length, w = wob ? Math.sin(k * 0.9) * 0.35 + Math.sin(k * 0.23 + 1) * 0.6 : 0; pts.push([cu + Math.cos(a) * (r - m + w), cv + Math.sin(a) * (r - m + w)]); } return pts; };

  // ---------- 配色 ----------
  const C = {
    CREAM: '#ecdcbc', CREAM2: '#dcc8a0', STONE: '#b0a694', STONE2: '#8e8476', BRICK: '#b4664c', IRON: '#6a6470', IRON2: '#565060', RUST: '#9a5a3a', RUST2: '#7c4632', COP: '#b06a42', COP2: '#8a5034',
    TILE: '#c0543a', TILE2: '#a8442e', SHING: '#b8683e', TIMBER: '#5a3a28', WOOD: '#b88a5a', WOOD2: '#a8784a', GOLD: '#c8a050', GLASS: '#bfe6f6', WING: '#9a2e2a', WING2: '#5a2a2e', PLANK: '#9a7452', MOSS: '#6f9a4a',
  };

  // ---------- 房间 ----------
  const R = (id, nm, lv, o) => Object.assign({ id, nm, lv, out: C.CREAM, om: M.plaster, in: '#efe0c4', im: M.wallpaper, fl: C.WOOD, fm: M.plank, h: WH }, o);
  const A = [12, 12], B = [37, 7.5];
  const ROOMS = [
    R('boiler', '锅炉房', 0, { c: [A[0], A[1], 8.6], out: C.RUST, om: M.metal, in: '#9a6a52', im: M.stone, fl: '#6a6470', fm: M.metal, iron: true }),
    R('hall', '门厅', 1, { c: [A[0], A[1], 8.6], out: C.IRON, om: M.metal, in: '#e8d8c0', im: M.plaster, fl: '#9a8a78', fm: M.stone, iron: true }),
    R('workshop', '工作间', 2, { c: [A[0], A[1], 8.3], out: C.RUST, om: M.metal, in: '#e0ccb0', im: M.plank, fl: '#a8845a', iron: true }),
    R('cockpit', '驾驶室', 3, { c: [A[0], A[1], 8], out: C.RUST2, om: M.metal, in: '#8a7a6a', im: M.metal, fl: '#7a5a3e', iron: true, roof: 'dome' }),
    R('pump', '水泵间', 0, { c: [B[0], B[1], 6.6], out: C.IRON, om: M.metal, in: '#8a9aa0', im: M.tile, fl: '#7a8288', fm: M.metal, iron: true }),
    R('store', '储藏间', 1, { c: [B[0], B[1], 6.6], out: C.RUST, om: M.metal, in: '#d8c4a0', im: M.plank, fl: '#9a7a58', iron: true }),
    R('bath', '浴室', 2, { c: [B[0], B[1], 6.2], out: C.COP2, om: M.metal, in: '#cfe6ee', im: M.tile, fl: '#d8e8ec', fm: M.tile, iron: true, roof: 'tank' }),
    R('kitchen', '厨房', 1, { r: [20.5, 9, 28.5, 19], out: C.CREAM, in: '#f2e2c8', fl: '#c8b098', fm: M.tile }),
    R('living', '起居室', 2, { r: [20.6, 9, 30, 18.5], out: C.CREAM2, in: '#f4e4cc', fl: '#b88a5a', shut: '#4a7a6a' }),
    R('bedroom', '卧室', 3, { r: [21.5, 6.5, 31.5, 15], out: '#e8d0b8', in: '#f4e0e8', fl: '#b88a5a', roof: 'steep', ax: 'u', shut: '#b8503c' }),
    R('dining', '餐厅', 1, { r: [28.5, 14.5, 40, 23], out: C.BRICK, om: M.stone, in: '#f0d8b8', fl: '#a87a52' }),
    R('shed', '柴房', 1, { r: [1.5, 21, 10.5, 30], out: '#8a5e3c', om: M.plank, in: '#c8a878', im: M.plank, fl: '#7a5a3e' }),
    R('library', '图书室', 2, { r: [1.5, 20.5, 11, 29.5], out: C.CREAM, in: '#d8c8a8', fl: '#8a5e3c', shut: '#5a7ab0' }),
    R('attic', '阁楼仓库', 3, { r: [1, 21.5, 11.5, 29], out: '#c8a078', om: M.plank, in: '#d8c4a0', im: M.plank, fl: '#9a7a58', roof: 'steep', ax: 'v' }),
    R('green', '花房', 1, { r: [4, 32, 15, 43], glass: true, out: '#e8f0e8', in: '#e8f0e8', fl: '#9a8a70', fm: M.stone, h: 11, roof: 'glass' }),
  ];
  const RM = {}; ROOMS.forEach((r) => (RM[r.id] = r));
  const isRound = (r) => !!r.c;
  const bbox = (r) => (r.c ? [r.c[0] - r.c[2], r.c[1] - r.c[2], r.c[0] + r.c[2], r.c[1] + r.c[2]] : r.r);
  const inRoom = (r, u, v, m = 0) => (r.c ? Math.hypot(u - r.c[0], v - r.c[1]) <= r.c[2] - m : u >= r.r[0] + m && u <= r.r[2] - m && v >= r.r[1] + m && v <= r.r[3] - m);
  const RAMP = { u0: 8, u1: 16, v0: 5.4, v1: 8, axis: 'u', lo: 8, hi: 16 };
  const RAMPS = [0, 1, 2].map((a) => Object.assign({}, RAMP, { a, b: a + 1 }));
  const P = (lv, r, walls) => ({ lv, r, walls: walls || null });
  const PASS = [
    P(0, [19.6, 8.6, 31.6, 11.4], 'v'),
    P(1, [19.6, 10, 21.6, 12.6]), P(1, [28, 11.4, 33.4, 13.6], 'v'), P(1, [27.6, 15.6, 29.4, 18.2]),
    P(1, [22.6, 18.4, 25.4, 19.8]), P(1, [33, 22.4, 35.8, 23.8]), P(1, [16.2, 17.2, 18.8, 19.8]), P(1, [10, 24, 11.4, 26.6]), P(1, [14.4, 36.5, 15.8, 39.2]),
    P(2, [19.6, 10.4, 21.4, 13]), P(2, [29.6, 9.2, 31.6, 11.6], 'v'), P(2, [29.4, 15.2, 30.8, 17.6]), P(2, [5.8, 17.8, 8.4, 21.2], 'u'),
    P(3, [19.2, 9.2, 22.2, 11.8], 'v'), P(3, [24.4, 14.4, 27, 15.8]), P(3, [5.8, 17.6, 8.4, 22.2], 'u'),
  ];
  const OPEN = [[2, 30, 14.5, 40, 23, '屋顶花园'], [2, 28.5, 18.5, 30, 23, '屋顶花园'], [3, 21.5, 15, 30, 18.5, '卧室阳台']];
  const passAt = (lv, u, v, m = 0) => PASS.some((p) => p.lv === lv && u >= p.r[0] - m && u <= p.r[2] + m && v >= p.r[1] - m && v <= p.r[3] + m);
  const roomAt = (u, v, lv) => ROOMS.find((r) => r.lv === lv && inRoom(r, u, v)) || null;
  const roomLv = (id) => (RM[id] ? RM[id].lv : id === 'garden' ? 2 : id === 'balcony' ? 3 : 1);
  const ENTRIES = PASS.filter((p) => !p.walls).map((p) => { const c = [(p.r[0] + p.r[2]) / 2, (p.r[1] + p.r[3]) / 2], w = p.r[2] - p.r[0] < p.r[3] - p.r[1] ? 'u' : 'v', d = 1.6, a = w === 'u' ? [c[0] - d, c[1]] : [c[0], c[1] - d], b = w === 'u' ? [c[0] + d, c[1]] : [c[0], c[1] + d], ra = roomAt(a[0], a[1], p.lv), rb = roomAt(b[0], b[1], p.lv); return ra && rb ? null : Object.assign({}, p, { room: ra || rb, inP: ra ? a : b, outP: ra ? b : a }); }).filter(Boolean);

  // ---------- 甲板上的模块 ----------
  const PS = 4.4;
  const PLOTS = [[19.5, 25.6], [25, 25.6], [30.5, 25.6], [19.5, 32.2], [25, 32.2], [30.5, 32.2]];
  const POOL = { u0: 22, v0: 39.4, u1: 38, v1: 46, z: 1.1 };
  const FISH = { u: 30, v: 37.9 }, BOB = { u: 31, v: 42.8 };
  const HIVES = [[41, 28], [44.2, 28.6]];
  const MAILB = { u: 44.5, v: 37.5 }, TAP = { u: 40.6, v: 39.8 };
  const LAMPS = [[18, 23.6], [42.4, 25], [17.6, 37.4], [41.6, 44]];
  const SLOTS = [[38.4, 33], [45.6, 33.6], [12.6, 31.2], [43.4, 41.6], [18, 45], [31, 47]];
  const BALLOON = { u: 36.8, v: 17.4 };
  const NEST = { u: 39, v: 21.9 };
  const GPOTS = [[7.5, 36], [11.5, 36], [7.5, 40.4], [11.5, 40.4]];
  const PK = { balloon: 6, fish: 8, mail: 3, tap: 4, hive: 12, plot: 20, deco: 30, lamp: 10, nest: 13 };
  const FIXED = [...PLOTS.map(([u, v]) => [1, u, v, u + PS, v + PS]), [1, POOL.u0 - 0.7, POOL.v0 - 0.7, POOL.u1 + 0.7, POOL.v1 + 0.7], ...HIVES.map(([u, v]) => [1, 'c', u, v, 1.2]), [1, 'c', MAILB.u, MAILB.v, 0.6], [1, 'c', TAP.u, TAP.v, 1.1], ...LAMPS.map(([u, v]) => [1, 'c', u, v, 0.35]), [2, 'c', NEST.u, NEST.v, 1.2], [2, BALLOON.u - 2.6, BALLOON.v - 2.6, BALLOON.u + 2.6, BALLOON.v + 2.6]];

  // ---------- 屋里的固定陈设 ----------
  const FIX = [];
  const fx = (room, id, at, d, label, cur, ob, o) => FIX.push(Object.assign({ room, id, at, do: d, label, cur, ob: ob || [] }, o));
  fx('hall', 140, [14.4, 15.4], 'sit', '门厅长凳：坐一会儿', 'rest', [[9.6, 16.6, 13.6, 18.6]], { spot: { u: 11.6, v: 17.6, dz: 2.8 } });
  fx('kitchen', 141, [23, 13.2], 'cookp', '灶台：做菜（打开菜谱）', 'cook', [[21, 9.4, 25, 11.8]]);
  fx('kitchen', 142, [26.6, 13.2], 'drink', '水槽：喝口水', 'water', [[25, 9.4, 28.2, 11.2]]);
  fx('dining', 143, [35, 21], 'dine', '餐桌：吃一份做好的菜', 'cook', [[32, 16.6, 38, 19.6]]);
  fx('library', 145, [6.4, 26.6], 'dex', '书架：翻图鉴（植物、特产、钓鱼）', 'use', [[1.9, 27.4, 10.6, 29.2]]);
  fx('library', 146, [8.6, 23.6], 'read', '阅读椅：坐着看书', 'rest', [[2, 21, 5.2, 24.4]]);
  fx('bath', 144, [37, 10.6], 'bath', '浴缸：洗个泡泡澡', 'use', [[34, 4, 40, 8.2]]);
  fx('workshop', 147, [12, 15.6], 'craft', '工作台：用收成做东西', 'use', [[8, 17, 16, 19]]);
  fx('store', 148, [37, 11], 'store', '种子柜：看看背包里的东西', 'use', [[33, 2.4, 41, 5]]);
  fx('attic', 149, [6.2, 24.6], 'rummage', '旧木箱：翻一翻（说不定有小鱼干）', 'use', [[1.6, 22, 5, 25.4]]);
  fx('cockpit', 151, [12, 14.6], 'helm', '舵轮：看看城堡往哪飘', 'use', [[10.4, 16, 13.6, 18]]);
  fx('cockpit', 158, [16, 12.4], 'tele', '望远镜：看看天上', 'use', [[17.2, 13.4, 18.8, 15]]);
  fx('boiler', 152, [12, 11], 'stoke', '锅炉：添柴（蒸汽给翅膀、热水和暖气）', 'use', [[9, 12.4, 15, 18.2]]);
  fx('pump', 153, [37, 11.4], 'pump', '水泵：看看水塔里还有多少水', 'look', [[33.6, 3.4, 40.4, 7.6]]);
  fx('shed', 155, [7.4, 25.6], 'wood', '柴堆：抱一捆柴去锅炉房', 'use', [[1.9, 21.4, 5.4, 29.6]]);
  fx('green', 156, [12.6, 42.2], 'drink', '花房的水桶：喝口水', 'water', [[13.4, 41.6, 14.6, 42.6]]);
  fx('green', 157, [9.5, 33.9], 'tend', '花架：照看花草', 'water', [[5, 32.4, 14, 33.2]]);
  fx('green', 165, [6, 42.2], 'valve', '暖气阀门（点开调）', 'use', [[4.4, 41.8, 5, 42.6]]);
  fx('garden', 159, [33.6, 20.6], 'sit', '屋顶花园的长椅：晒太阳', 'rest', [[31.6, 21.8, 35.6, 22.6]], { spot: { u: 33.6, v: 22.2, dz: 2.6 } });
  fx('garden', PK.nest, [37.6, 21], 'nest', '鸟巢：野鸟偶尔会留下一个蛋', 'use', []);
  fx('bedroom', 166, [24.8, 10.6], 'sleep', '卧室的床：睡一觉', 'rest', [[22.4, 6.8, 27.2, 9.4]], { spot: { u: 24.6, v: 8.0, dz: 2.2 } });
  GPOTS.forEach(([u, v], i) => fx('green', 160 + i, i < 2 ? [u, v + 2.2] : [9.5, v], 'pot', '花盆', 'water', [[u - 1.2, v - 1.2, u + 1.2, v + 1.2]], { i }));
  FIX.forEach((f) => { f.lv = roomLv(f.room); });

  // ---------- 寻路 ----------
  const WT = 0.5;
  const RSEG = (r) => Math.max(24, Math.round(r.c[2] * 5));
  const ringGap = (r, i) => { const n = RSEG(r), a = ((i + 0.5) / n) * 6.2832, u = r.c[0] + Math.cos(a) * r.c[2], v = r.c[1] + Math.sin(a) * r.c[2]; return passAt(r.lv, u, v, 0.15); };
  function sideSegs(lv, ax, at, a0, a1) {
    let segs = [[a0, a1]];
    for (const p of PASS) { if (p.lv !== lv) continue; const [u0, v0, u1, v1] = p.r; let g0, g1; if (ax === 'v' && at >= v0 - 0.01 && at <= v1 + 0.01) { g0 = u0; g1 = u1; } else if (ax === 'u' && at >= u0 - 0.01 && at <= u1 + 0.01) { g0 = v0; g1 = v1; } else continue;
      segs = segs.flatMap(([s, e]) => { if (g1 <= s || g0 >= e) return [[s, e]]; const o = []; if (g0 > s) o.push([s, g0]); if (g1 < e) o.push([g1, e]); return o; }); }
    return segs;
  }
  const sideHoles = (lv, ax, at, a0, a1) => { const segs = sideSegs(lv, ax, at, a0, a1), out = []; let cur = a0; for (const [s, e] of segs) { if (s > cur + 0.01) out.push([cur, s]); cur = e; } if (cur < a1 - 0.01) out.push([cur, a1]); return out; };
  function wallObs(lv) {
    const out = [];
    for (const r of ROOMS) {
      if (r.lv !== lv) continue;
      if (isRound(r)) { const n = RSEG(r); for (let i = 0; i < n; i++) { if (ringGap(r, i)) continue; const a = ((i + 0.5) / n) * 6.2832; out.push([lv, 'c', r.c[0] + Math.cos(a) * r.c[2], r.c[1] + Math.sin(a) * r.c[2], 0.32]); } continue; }
      const [u0, v0, u1, v1] = r.r;
      for (const [ax, at, a0, a1] of [['v', v0, u0, u1], ['v', v1, u0, u1], ['u', u0, v0, v1], ['u', u1, v0, v1]]) for (const [s, e] of sideSegs(lv, ax, at, a0, a1)) out.push(ax === 'v' ? [lv, s - WT / 2, at - WT / 2, e + WT / 2, at + WT / 2] : [lv, at - WT / 2, s - WT / 2, at + WT / 2, e + WT / 2]);
    }
    for (const p of PASS) { if (p.lv !== lv || !p.walls) continue; const [u0, v0, u1, v1] = p.r; if (p.walls === 'v') out.push([lv, u0, v0 - WT / 2, u1, v0 + WT / 2], [lv, u0, v1 - WT / 2, u1, v1 + WT / 2]); else out.push([lv, u0 - WT / 2, v0, u0 + WT / 2, v1], [lv, u1 - WT / 2, v0, u1 + WT / 2, v1]); }
    return out;
  }
  function floorAt(lv, u, v) {
    if (lv === 1 && inDeck(u, v, 1.4) && !(u > POOL.u0 - 0.7 && u < POOL.u1 + 0.7 && v > POOL.v0 - 0.7 && v < POOL.v1 + 0.7)) return true;
    for (const r of ROOMS) if (r.lv === lv && inRoom(r, u, v)) return true;
    for (const o of OPEN) if (o[0] === lv && u >= o[1] && u <= o[3] && v >= o[2] && v <= o[4]) return true;
    return passAt(lv, u, v);
  }
  const PARA = [[2, 40, 14.5, 40.5, 23.5], [2, 28.5, 23, 40.5, 23.5], [2, 28, 18.5, 28.5, 23.5], [3, 21.5, 18.5, 30.5, 19], [3, 30, 15, 30.5, 19], [3, 21, 15, 21.5, 19]];
  const AREA = { z: Z, inF: floorAt, ramps: RAMPS, obst: (extra) => [...wallObs(0), ...wallObs(1), ...wallObs(2), ...wallObs(3), ...PARA, ...FIXED, ...FIX.flatMap((f) => f.ob.map((b) => [f.lv, ...b])), ...(extra || [])] };

  // ---------- 画 ----------
  const showLv = (cut, lv) => !cut || lv <= cut.lv;
  const facing = (cut, nu, nv) => !!cut && nu * cut.vu + nv * cut.vv > 0.01;
  const roomH = (r) => (r.h || WH);
  function wallPiece(m, ax, at, a0, a1, z0, z1, side, col, mat, holes) {
    const w0 = side > 0 ? at : at - WT / 2, w1 = side > 0 ? at + WT / 2 : at;
    const Bx = (s, e, zz0, zz1) => { if (e - s < 0.01 || zz1 - zz0 < 0.01) return; if (ax === 'v') m.box(s, w0, zz0, e, w1, zz1, col, mat); else m.box(w0, s, zz0, w1, e, zz1, col, mat); };
    const hs = (holes || []).filter((h) => h[1] > a0 && h[0] < a1).sort((p, q) => p[0] - q[0]);
    let cur = a0;
    for (const h of hs) { const s = Math.max(a0, h[0]), e = Math.min(a1, h[1]); Bx(cur, s, z0, z1); if (h[2] > 0) Bx(s, e, z0, Math.min(z1, z0 + h[2])); if (z0 + h[3] < z1) Bx(s, e, Math.max(z0, z0 + h[3]), z1); cur = Math.max(cur, e); }
    Bx(cur, a1, z0, z1);
  }
  function exteriorParts(r, ax, at, a0, a1) {
    let segs = [[a0, a1]];
    for (const o of ROOMS) {
      if (o === r || o.lv !== r.lv || isRound(o)) continue; const [u0, v0, u1, v1] = o.r; let s, e;
      if (ax === 'v' && (Math.abs(v0 - at) < 0.01 || Math.abs(v1 - at) < 0.01)) { s = u0; e = u1; } else if (ax === 'u' && (Math.abs(u0 - at) < 0.01 || Math.abs(u1 - at) < 0.01)) { s = v0; e = v1; } else continue;
      segs = segs.flatMap(([p, q]) => { if (e <= p || s >= q) return [[p, q]]; const out = []; if (s > p) out.push([p, s]); if (e < q) out.push([e, q]); return out; });
    }
    return segs;
  }
  function windowsOn(r, ax, at, a0, a1, doors) {
    const L = a1 - a0, n = Math.max(1, Math.floor(L / 3.8)), out = [], tall = roomH(r) >= 13;
    for (let i = 0; i < n; i++) { const c = a0 + (L * (i + 0.5)) / n; if (doors.some((d) => c > d[0] - 1.6 && c < d[1] + 1.6)) continue; const w = (i + r.lv + Math.round(at)) % 3 === 0 ? 0.7 : 0.95, top = tall ? (i % 2 ? 10.4 : 11) : 9; out.push([c - w, c + w, 4.4, top]); }
    return out;
  }
  function rectRoom(m, r, cut, o) {
    const z = Z[r.lv], [u0, v0, u1, v1] = r.r, cutHere = cut && cut.lv === r.lv, h = roomH(r);
    m.pk(0);
    m.box(u0 - WT / 2, v0 - WT / 2, z - 1, u1 + WT / 2, v1 + WT / 2, z, r.fl, r.fm, r.fl, r.fm);
    if (!r.glass) for (let u = u0 + 1.6; u < u1 - 0.5; u += 1.6) m.box(u - 0.04, v0, z + 0.01, u + 0.04, v1, z + 0.04, shade(r.fl, 0.85), 0);
    for (const [ax, at, a0, a1, nu, nv] of [['v', v0, u0, u1, 0, -1], ['v', v1, u0, u1, 0, 1], ['u', u0, v0, v1, -1, 0], ['u', u1, v0, v1, 1, 0]]) {
      const sg = ax === 'v' ? nv : nu, ext = exteriorParts(r, ax, at, a0, a1), doors = sideHoles(r.lv, ax, at, a0, a1).map(([s, e]) => [s, e, 0, DOOR_H]);
      const wins = r.glass ? [] : ext.flatMap(([s, e]) => windowsOn(r, ax, at, s, e, doors)), holes = doors.concat(wins);
      const back = !facing(cut, nu, nv), lowZ = z + 2.2, fullZ = z + h;
      if (r.glass) { glassWall(m, ax, at, a0, a1, z, cutHere && !back ? lowZ : z + h, doors); continue; }
      const allExt = ext.length === 1 && ext[0][0] <= a0 + 0.01 && ext[0][1] >= a1 - 0.01;
      const topIn = cutHere && !(allExt && back) ? lowZ : fullZ;
      wallPiece(m, ax, at, a0 - (ax === 'v' ? WT / 2 : 0), a1 + (ax === 'v' ? WT / 2 : 0), z, topIn, -sg, r.in, r.im, holes);
      for (const [s, e] of ext) { const top = cutHere && !back ? lowZ : fullZ; wallPiece(m, ax, at, s - (ax === 'v' ? WT / 2 : 0), e + (ax === 'v' ? WT / 2 : 0), z, top, sg, r.out, r.om, holes); if (top === fullZ) facade(m, r, ax, at, s, e, sg, z, wins, doors, o); }
      for (const hh of holes) { if (cutHere && z + hh[3] > topIn) continue; frame(m, ax, at, hh, z, hh[2] === 0, r); }
      if (!cutHere || back) for (const hh of wins) if (r.shut && (Math.round(hh[0] * 7) % 2)) shutters(m, ax, at + sg * (WT / 2 + 0.02), hh, z, sg, r.shut);
    }
    if (!r.glass) for (const [cu, cv] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) { const tall = cutHere ? 2.2 : h; for (let k = 0.5; k < tall - 0.6; k += 1.5) m.box(cu - 0.4, cv - 0.4, z + k, cu + 0.4, cv + 0.4, z + k + 0.85, shade(r.om === M.plaster ? r.out : C.STONE, 0.82), M.stone); }
    if (!r.glass) { m.box(u0 + 0.25, v0 + 0.25, z, u1 - 0.25, v0 + 0.35, z + 0.6, shade(r.in, 0.7), 0); m.box(u0 + 0.25, v0 + 0.25, z, u0 + 0.35, v1 - 0.25, z + 0.6, shade(r.in, 0.7), 0); }
  }
  function roundRoom(m, r, cut, o) {
    const z = Z[r.lv], [cu, cv, rad] = r.c, cutHere = cut && cut.lv === r.lv, h = roomH(r), n = RSEG(r);
    m.pk(0);
    const fl = (a, rr) => [cu + Math.cos(a) * rr, cv + Math.sin(a) * rr];
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832, b = ((i + 1) / n) * 6.2832, p0 = fl(a, rad + WT / 2), p1 = fl(b, rad + WT / 2); m.tri([cu, cv, z], [p0[0], p0[1], z], [p1[0], p1[1], z], r.fl, r.fm); m.quad([p0[0], p0[1], z - 1], [p1[0], p1[1], z - 1], [p1[0], p1[1], z], [p0[0], p0[1], z], shade(r.out, 0.8), M.metal); }
    for (let k = -3; k <= 3; k++) { const hw = Math.sqrt(Math.max(0, rad * rad - (k * 1.6) ** 2)) - 0.3; if (hw > 0) m.box(cu + k * 1.6 - 0.04, cv - hw, z + 0.01, cu + k * 1.6 + 0.04, cv + hw, z + 0.04, shade(r.fl, 0.85), 0); }
    if (r.lv > 0 && cu === A[0]) m.box(RAMP.u0, RAMP.v0, z - 0.02, RAMP.u1, RAMP.v1, z + 0.03, '#1e1a22', 0);
    const pi = (t, rr) => [cu + Math.cos(t) * rr, cv + Math.sin(t) * rr];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.2832, b = ((i + 1) / n) * 6.2832, am = (a + b) / 2, nu = Math.cos(am), nv = Math.sin(am), fc = cutHere && facing(cut, nu, nv);
      if (ringGap(r, i)) { if (!fc) { const p = pi(am, rad); m.box(p[0] - 0.3, p[1] - 0.3, z + DOOR_H, p[0] + 0.3, p[1] + 0.3, z + h, r.out, r.om); } continue; }
      const top = fc ? z + 2.2 : z + h;
      const ri = rad - WT / 2, ro = rad + WT / 2, A0 = pi(a, ri), A1 = pi(b, ri), B0 = pi(a, ro), B1 = pi(b, ro);
      m.quad([A0[0], A0[1], z], [A1[0], A1[1], z], [A1[0], A1[1], top], [A0[0], A0[1], top], r.in, r.im);
      m.quad([B0[0], B0[1], z], [B1[0], B1[1], z], [B1[0], B1[1], top], [B0[0], B0[1], top], i % 3 ? r.out : shade(r.out, 0.88), r.om);
      m.quad([A0[0], A0[1], top], [A1[0], A1[1], top], [B1[0], B1[1], top], [B0[0], B0[1], top], shade(r.out, 0.75), r.om);
      if (top - z > 6) {
        for (const zz of [3.4, 8, 12.6]) if (zz < h - 0.5) { const q0 = pi(a, ro + 0.06), q1 = pi(b, ro + 0.06); m.quad([q0[0], q0[1], z + zz], [q1[0], q1[1], z + zz], [q1[0], q1[1], z + zz + 0.35], [q0[0], q0[1], z + zz + 0.35], shade(r.out, 0.68), M.metal); const rv = pi(am, ro + 0.1); m.box(rv[0] - 0.07, rv[1] - 0.07, z + zz + 0.45, rv[0] + 0.07, rv[1] + 0.07, z + zz + 0.6, '#e0b070', M.metal); }
        if (i % 3 === 1 && !ringGap(r, (i + 1) % n) && !ringGap(r, (i + n - 1) % n)) { const pp = pi(am, ro + 0.05), face = Math.abs(nu) > Math.abs(nv) ? 'u' : 'v'; m.disc(pp[0], pp[1], z + 7.2, 0.95, face, '#3a3448', M.metal, 12); m.disc(pp[0] + nu * 0.04, pp[1] + nv * 0.04, z + 7.2, 0.7, face, o.night ? '#ffe9a8' : C.GLASS, o.night ? M.glow : M.glass, 12); const pq = pi(am, ri - 0.05); m.disc(pq[0], pq[1], z + 7.2, 0.7, face, C.GLASS, M.glass, 12); }
      }
    }
    for (let i = 0; i < n; i++) if (ringGap(r, i) !== ringGap(r, (i + n - 1) % n)) { const a = (i / n) * 6.2832, pp = pi(a, rad); if (!(cutHere && facing(cut, Math.cos(a), Math.sin(a)))) m.box(pp[0] - 0.35, pp[1] - 0.35, z, pp[0] + 0.35, pp[1] + 0.35, z + DOOR_H + 0.4, '#3a3448', M.metal); }
  }
  function frame(m, ax, at, h, z, isDoor, r) {
    const [s, e, zb, zt] = h, w0 = at - WT / 2 - 0.08, w1 = at + WT / 2 + 0.08, col = r.om === M.metal ? '#3a3448' : C.TIMBER, mt = r.om === M.metal ? M.metal : M.plank;
    const Bx = (a, b, zz0, zz1, cl, mm) => (ax === 'v' ? m.box(a, w0, z + zz0, b, w1, z + zz1, cl, mm) : m.box(w0, a, z + zz0, w1, b, z + zz1, cl, mm));
    Bx(s - 0.3, s, zb, zt + 0.3, col, mt); Bx(e, e + 0.3, zb, zt + 0.3, col, mt); Bx(s - 0.3, e + 0.3, zt, zt + 0.45, col, mt);
    if (!isDoor) { Bx(s - 0.4, e + 0.4, zb - 0.4, zb, '#d8ccb4', 0); const g0 = at - 0.04, g1 = at + 0.04; ax === 'v' ? m.box(s, g0, z + zb, e, g1, z + zt, C.GLASS, M.glass) : m.box(g0, s, z + zb, g1, e, z + zt, C.GLASS, M.glass); const mid = (s + e) / 2; Bx(mid - 0.06, mid + 0.06, zb, zt, col, mt); Bx(s, e, (zb + zt) / 2 - 0.08, (zb + zt) / 2 + 0.08, col, mt); }
  }
  function shutters(m, ax, w, h, z, sg, col) { const [s, e, zb, zt] = h, Bx = (a, b) => (ax === 'v' ? m.box(a, Math.min(w, w + sg * 0.12), z + zb - 0.1, b, Math.max(w, w + sg * 0.12), z + zt + 0.1, col, M.plank) : m.box(Math.min(w, w + sg * 0.12), a, z + zb - 0.1, Math.max(w, w + sg * 0.12), b, z + zt + 0.1, col, M.plank)); Bx(s - 0.75, s - 0.3); Bx(e + 0.3, e + 0.75); }
  function facade(m, r, ax, at, s, e, sg, z, wins, doors, o) {
    const w = at + sg * (WT / 2 + 0.02), h = roomH(r), Bx = (a, b, zz0, zz1, col, mt, d = 0.1) => (ax === 'v' ? m.box(a, Math.min(w, w + sg * d), z + zz0, b, Math.max(w, w + sg * d), z + zz1, col, mt) : m.box(Math.min(w, w + sg * d), a, z + zz0, Math.max(w, w + sg * d), b, z + zz1, col, mt));
    const seed = r.lv * 13 + s, clear = (a) => !wins.some((hh) => a > hh[0] - 0.6 && a < hh[1] + 0.6) && !doors.some((hh) => a > hh[0] - 0.6 && a < hh[1] + 0.6);
    if (r.om === M.plaster) {
      Bx(s, e, h - 0.9, h - 0.4, C.TIMBER, M.plank); Bx(s, e, 0.3, 0.9, shade(r.out, 0.75), M.stone); Bx(s, e, 3.4, 3.7, C.TIMBER, M.plank);
      for (let a = s + 0.1; a < e - 0.2; a += 2.6) if (clear(a)) Bx(a, a + 0.3, 0.9, h - 0.9, C.TIMBER, M.plank);
      for (let k = 0; k < 4; k++) { const a = s + 0.6 + H(seed, k) * (e - s - 2), zz = 1.2 + H(k, seed) * (h - 3.6); if (wins.some((hh) => a + 1 > hh[0] && a < hh[1] && zz + 1 > hh[2] && zz < hh[3])) continue; Bx(a, a + 0.7 + H(k, 3) * 0.8, zz, zz + 0.45, shade(r.out, k % 2 ? 0.9 : 1.06), 0, 0.05); }
    }
    if (r.om === M.stone) for (let k = 0; k < 8; k++) { const a = s + 0.4 + H(seed + 7, k) * (e - s - 1.6), zz = 0.8 + H(k, seed + 7) * (h - 2); if (wins.some((hh) => a + 1 > hh[0] && a < hh[1] && zz + 1 > hh[2] && zz < hh[3])) continue; Bx(a, a + 1.1, zz, zz + 0.55, shade(r.out, k % 2 ? 0.86 : 1.12), M.stone, 0.06); }
    if (r.om === M.plank) for (let a = s + 0.6; a < e - 0.2; a += 1.1) Bx(a, a + 0.08, 0.2, h - 0.2, shade(r.out, 0.75), 0, 0.05);
    if (r.lv >= 1 && !o.snow) for (const hh of wins) { if ((Math.floor(hh[0] * 3) + r.lv) % 3) continue; Bx(hh[0] - 0.2, hh[1] + 0.2, hh[2] - 1.8, hh[2] - 0.8, '#8a5a3a', M.plank, 0.7); for (let i = 0; i < 4; i++) { const t = hh[0] + (i + 0.5) * (hh[1] - hh[0]) / 4, Pp = ax === 'v' ? [t, w + sg * 0.4] : [w + sg * 0.4, t]; m.blob(Pp[0], Pp[1], z + hh[2] - 0.4, 0.3, 0.9, i % 2 ? ['#f2a6c2', '#ffd95a', '#e8705a'][i % 3] : '#5aa64e', 8, i + seed, 3, 5); } }
    if (r.lv >= 1 && e - s > 5) { const a = s + 0.5; Bx(a, a + 0.35, 0, h + 0.4, C.COP, M.metal, 0.4); }
  }
  function glassWall(m, ax, at, a0, a1, z, top, doors) {
    const fr = '#f4f0e6', Bx = (a, b, zz0, zz1, col, mt) => (ax === 'v' ? m.box(a, at - 0.12, zz0, b, at + 0.12, zz1, col, mt) : m.box(at - 0.12, a, zz0, at + 0.12, b, zz1, col, mt));
    let cur0 = a0; for (const d of doors) { if (d[0] > cur0) Bx(cur0, d[0], z, z + 1.4, '#a8a296', M.stone); cur0 = d[1]; } if (cur0 < a1) Bx(cur0, a1, z, z + 1.4, '#a8a296', M.stone);
    const n = Math.max(2, Math.round((a1 - a0) / 2.2));
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; if (doors.some((d) => a > d[0] && a < d[1])) continue; Bx(a - 0.1, a + 0.1, z + 1.4, top, fr, 0); }
    if (top > z + 3) { Bx(a0, a1, top - 0.2, top, fr, 0); let cur = a0; for (const d of doors) { if (d[0] > cur) Bx(cur, d[0], z + 1.4, top - 0.2, C.GLASS, M.glass); Bx(d[0], d[1], z + DOOR_H, top - 0.2, C.GLASS, M.glass); cur = d[1]; } if (cur < a1) Bx(cur, a1, z + 1.4, top - 0.2, C.GLASS, M.glass); }
  }
  function passage(m, p, cut, o) {
    const z = Z[p.lv], [u0, v0, u1, v1] = p.r, cutHere = cut && cut.lv === p.lv;
    if (p.lv === 0 || p.walls) m.box(u0, v0, z - 1, u1, v1, z, p.lv === 0 ? '#5a5466' : C.PLANK, p.lv === 0 ? M.metal : M.plank);
    if (!p.walls) return;
    const sides = p.walls === 'v' ? [['v', v0, u0, u1, 0, -1], ['v', v1, u0, u1, 0, 1]] : [['u', u0, v0, v1, -1, 0], ['u', u1, v0, v1, 1, 0]];
    const h = p.lv === 0 ? 11 : 11.5, cIn = p.lv === 0 ? '#7a7280' : '#d8c4a0', cOut = p.lv === 0 ? C.IRON2 : C.WOOD2, mat = p.lv === 0 ? M.metal : M.plank;
    for (const [ax, at, a0, a1, nu, nv] of sides) { const sg = ax === 'v' ? nv : nu, top = cutHere && facing(cut, nu, nv) ? z + 2.2 : z + h, win = p.lv > 0 && top > z + 6 ? [[(a0 + a1) / 2 - 0.6, (a0 + a1) / 2 + 0.6, 4.6, 8.6]] : []; wallPiece(m, ax, at, a0, a1, z, top, sg, cOut, mat, win); wallPiece(m, ax, at, a0, a1, z, top, -sg, cIn, mat, win); for (const hh of win) frame(m, ax, at, hh, z, false, { om: M.plank }); }
    if (!cutHere) {
      if (p.lv > 0) m.gable(u0, v0, u1, v1, z + h, 1.8, p.walls === 'v' ? 'u' : 'v', o.snow ? '#e4ecf4' : C.SHING, o.snow ? M.snow : M.tile, 0.3, C.WOOD2, M.plank);
      else m.box(u0, v0, z + h, u1, v1, z + h + 0.6, C.IRON2, M.metal);
    }
    if (p.lv >= 2) { const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2, dv = p.walls === 'v' ? 0 : 1.8, du = p.walls === 'v' ? 0 : 0; m.quad([mu - 0.15, mv, z - 1], [mu + 0.15, mv, z - 1], [mu + 0.15 + du, mv + dv, z - 6], [mu - 0.15 + du, mv + dv, z - 6], C.TIMBER, M.plank); }
  }

  // ---------- 屋顶 ----------
  const coverRects = (lv) => [...ROOMS.filter((r) => r.lv === lv).map((r) => bbox(r)), ...OPEN.filter((o) => o[0] === lv).map((o) => o.slice(1, 5)), ...PASS.filter((p) => p.lv === lv).map((p) => p.r)];
  function subtract(rect, list) {
    let out = [rect];
    for (const c of list) out = out.flatMap((r) => { const [a, b, cc, d] = r; if (c[2] <= a || c[0] >= cc || c[3] <= b || c[1] >= d) return [r]; const o = []; if (c[1] > b) o.push([a, b, cc, c[1]]); if (c[3] < d) o.push([a, c[3], cc, d]); const y0 = Math.max(b, c[1]), y1 = Math.min(d, c[3]); if (c[0] > a) o.push([a, y0, c[0], y1]); if (c[2] < cc) o.push([c[2], y0, cc, y1]); return o; });
    return out.filter((r) => r[2] - r[0] > 0.3 && r[3] - r[1] > 0.3);
  }
  function roofs(m, cut, o) {
    for (const r of ROOMS) {
      if (!showLv(cut, r.lv) || (cut && cut.lv === r.lv)) continue;
      const z = Z[r.lv] + roomH(r);
      if (isRound(r)) { roundTop(m, r, cut, o); continue; }
      if (r.glass) { glassRoof(m, r, o); continue; }
      const up = r.lv < 3 && showLv(cut, r.lv + 1) ? coverRects(r.lv + 1) : r.lv < 3 ? coverRects(r.lv + 1) : [], left = subtract(r.r, up);
      if (r.roof && left.length === 1 && Math.abs(left[0][0] - r.r[0]) < 0.01 && Math.abs(left[0][2] - r.r[2]) < 0.01 && Math.abs(left[0][1] - r.r[1]) < 0.01 && Math.abs(left[0][3] - r.r[3]) < 0.01) { tallRoof(m, r, z, o); continue; }
      for (const q of left) flatRoof(m, q, z, o);
    }
  }
  function tallRoof(m, r, z, o) {
    const [u0, v0, u1, v1] = r.r, ax = r.ax || 'u', span = ax === 'u' ? v1 - v0 : u1 - u0, hh = span * (r.roof === 'steep' ? 1.5 : 0.9), col = o.snow ? '#e4ecf4' : r.lv % 2 ? C.TILE : C.TILE2, warp = P2().warp, tilt = (H(r.lv, u0) - 0.5) * 0.08;
    const draw = () => { m.box(u0 - 0.3, v0 - 0.3, z - 0.6, u1 + 0.3, v1 + 0.3, z, C.TIMBER, M.plank); m.gable(u0, v0, u1, v1, z, hh, ax, col, o.snow ? M.snow : M.tile, 0.7, r.out, r.om); tileRows(m, r.r, z, hh, ax, o); };
    if (warp) warp(m, [(u0 + u1) / 2, (v0 + v1) / 2, z], 0, ax === 'u' ? 0 : tilt, ax === 'u' ? tilt : 0, draw); else draw();
    if (ax === 'u') { const cu = (u0 + u1) / 2 + 1.5, wv = v1 - span * 0.28, wz = z + hh * 0.42; m.box(cu - 1.1, wv - 0.6, wz - 1.6, cu + 1.1, wv + 0.6, wz + 1.6, r.out, r.om); m.box(cu - 0.6, wv + 0.6, wz - 0.9, cu + 0.6, wv + 0.65, wz + 1, C.GLASS, M.glass); m.gable(cu - 1.2, wv - 0.8, cu + 1.2, wv + 0.8, wz + 1.6, 1.2, 'v', col, M.tile, 0.2); }
    else { const cv = (v0 + v1) / 2 - 1.2, wu = u1 - span * 0.28, wz = z + hh * 0.42; m.box(wu - 0.6, cv - 1.1, wz - 1.6, wu + 0.6, cv + 1.1, wz + 1.6, r.out, r.om); m.box(wu + 0.6, cv - 0.6, wz - 0.9, wu + 0.65, cv + 0.6, wz + 1, C.GLASS, M.glass); m.gable(wu - 0.8, cv - 1.2, wu + 0.8, cv + 1.2, wz + 1.6, 1.2, 'u', col, M.tile, 0.2); }
    const cu = u0 + 1.4, cv = v0 + 1.4; m.box(cu - 0.55, cv - 0.55, z, cu + 0.55, cv + 0.55, z + hh * 0.8 + 2.5, C.BRICK, M.stone); m.box(cu - 0.7, cv - 0.7, z + hh * 0.8 + 2.5, cu + 0.7, cv + 0.7, z + hh * 0.8 + 3, '#3a3448', M.metal);
  }
  function flatRoof(m, q, z, o) {
    m.box(q[0] - 0.25, q[1] - 0.25, z - 1, q[2] + 0.25, q[3] + 0.25, z, '#8a7e70', M.stone, o.snow ? '#eef4fa' : '#9a8e7e', o.snow ? M.snow : M.stone);
    if (q[2] - q[0] < 1.2 || q[3] - q[1] < 1.2) return;
    m.box(q[0] - 0.25, q[3] - 0.1, z, q[2] + 0.25, q[3] + 0.25, z + 0.9, C.STONE2, M.stone); m.box(q[2] - 0.1, q[1] - 0.25, z, q[2] + 0.25, q[3] + 0.25, z + 0.9, C.STONE2, M.stone);
    m.box(q[0] - 0.3, q[3] + 0.25, z - 0.5, q[2] + 0.3, q[3] + 0.6, z - 0.1, C.COP, M.metal);
  }
  function tileRows(m, q, z, hh, ax, o) { if (o.snow) return; const [u0, v0, u1, v1] = q, dk = '#8a3a26'; for (let t = 0.15; t < 0.95; t += 0.14) { if (ax === 'u') { const vm = (v0 + v1) / 2; for (const [ve, s2] of [[v0 - 0.7, 1], [v1 + 0.7, -1]]) { const vv = ve + (vm - ve) * t, zz = z - 0.7 * hh / ((v1 - v0) / 2) + (hh + 0.7 * hh / ((v1 - v0) / 2)) * t + 0.08; m.quad([u0 - 0.7, vv, zz], [u1 + 0.7, vv, zz], [u1 + 0.7, vv + s2 * 0.16, zz + 0.14], [u0 - 0.7, vv + s2 * 0.16, zz + 0.14], dk, M.tile); } } else { const um = (u0 + u1) / 2; for (const [ue, s2] of [[u0 - 0.7, 1], [u1 + 0.7, -1]]) { const uu = ue + (um - ue) * t, zz = z - 0.7 * hh / ((u1 - u0) / 2) + (hh + 0.7 * hh / ((u1 - u0) / 2)) * t + 0.08; m.quad([uu, v0 - 0.7, zz], [uu, v1 + 0.7, zz], [uu + s2 * 0.16, v1 + 0.7, zz + 0.14], [uu + s2 * 0.16, v0 - 0.7, zz + 0.14], dk, M.tile); } } } }
  function glassRoof(m, r, o) {
    const [u0, v0, u1, v1] = r.r, z = Z[r.lv] + roomH(r), hh = 5.5, mu = (u0 + u1) / 2;
    m.box(u0 - 0.2, v0 - 0.2, z - 0.3, u1 + 0.2, v1 + 0.2, z, '#f4f0e6', 0);
    for (const [a, b] of [[u0 - 0.3, mu], [u1 + 0.3, mu]]) m.quad([a, v0 - 0.3, z], [a, v1 + 0.3, z], [b, v1 + 0.3, z + hh], [b, v0 - 0.3, z + hh], o.snow ? '#eef4fa' : C.GLASS, o.snow ? M.snow : M.glass);
    for (let v = v0; v <= v1 + 0.01; v += (v1 - v0) / 6) { m.quad([u0 - 0.3, v - 0.1, z + 0.05], [u0 - 0.3, v + 0.1, z + 0.05], [mu, v + 0.1, z + hh + 0.05], [mu, v - 0.1, z + hh + 0.05], '#f4f0e6', 0); m.quad([u1 + 0.3, v - 0.1, z + 0.05], [u1 + 0.3, v + 0.1, z + 0.05], [mu, v + 0.1, z + hh + 0.05], [mu, v - 0.1, z + hh + 0.05], '#f4f0e6', 0); }
    for (const v of [v0, v1]) m.tri([u0, v, z], [u1, v, z], [mu, v, z + hh], C.GLASS, M.glass);
    m.box(mu - 0.2, v0 - 0.5, z + hh - 0.1, mu + 0.2, v1 + 0.5, z + hh + 0.4, '#f4f0e6', 0);
  }
  function roundTop(m, r, cut, o) {
    const [cu, cv, rad] = r.c, z = Z[r.lv] + roomH(r), up = ROOMS.find((q) => q.lv === r.lv + 1 && q.c && q.c[0] === cu && q.c[1] === cv), Pt = P2();
    m.cyl(cu, cv, z, z + 1, rad + 0.6, rad + 0.6, C.STONE2, M.stone, 28, true, o.snow ? '#eef4fa' : '#9a8e7e');
    if (up) { const n = Math.round(rad * 4); for (let i = 0; i < n; i += 2) { const a = (i / n) * 6.2832, x = cu + Math.cos(a) * (rad + 0.3), y = cv + Math.sin(a) * (rad + 0.3); m.box(x - 0.4, y - 0.4, z + 1, x + 0.4, y + 0.4, z + 2, C.STONE, M.stone); } return; }
    if (r.roof === 'dome') { if (Pt.dome) Pt.dome(m, cu, cv, z + 1.2, rad - 0.4, 1, [[2.4, 0.4, 3, 0.6], [3.4, 0.55, 2.4, 0.5], [1.2, 0.7, 2, 0.45]]); m.cyl(cu, cv, z + 1 + (rad - 0.4) * 3.6, z + 4 + (rad - 0.4) * 3.6, 0.3, 0.12, C.GOLD, M.metal, 6); return; }
    if (r.roof === 'tank') {
      for (const [du, dv] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) m.box(cu + du - 0.25, cv + dv - 0.25, z + 1, cu + du + 0.25, cv + dv + 0.25, z + 6, C.IRON2, M.metal);
      m.ball(cu, cv, z + 12, 4.2, 9, o.snow ? '#e8eef6' : C.COP, M.metal, 8, 18, 0.03, 5); for (const zz of [7, 12, 17]) { const k = Math.sqrt(Math.max(0, 1 - ((zz - 12) / 9) ** 2)); m.cyl(cu, cv, z + zz, z + zz + 0.4, 4.2 * k + 0.08, 4.2 * k + 0.08, '#3a3448', M.metal, 16, false); }
      m.cyl(cu, cv, z + 20.6, z + 23, 0.5, 0.2, C.GOLD, M.metal, 8); m.box(cu + 3.9, cv - 0.4, z + 9, cu + 4.3, cv + 0.4, z + 14, C.GLASS, M.glass);
    }
  }

  // ---------- 甲板、船体、浮岩 ----------
  // 底舱：船肋、浮石核心、水管、杂物——让地下层不是一块空地
  function hold(m, o) {
    const z = Z[0], busy = (u, v, pad) => ROOMS.some((r) => r.lv === 0 && inRoom(r, u, v, -pad)) || PASS.some((p) => p.lv === 0 && u > p.r[0] - pad && u < p.r[2] + pad && v > p.r[1] - pad && v < p.r[3] + pad);
    // 木地板条
    for (let v = 1; v < 47; v += 2.2) m.box(0, v, z + 0.02, 48, v + 0.12, z + 0.06, '#3a3240', 0);
    // 船肋：沿 u 一道道拱起的弧形木梁（遇到房间就断开）
    for (let u = 3; u < 47; u += 5) for (let v = 1.5; v < 47; v += 1) { if (!inDeck(u, v) || busy(u, v, 0.8)) continue; const e = Math.abs(v - 24) / 23, h = 1.2 + e * e * 6; m.box(u - 0.35, v, z, u + 0.35, v + 1, z + h, v % 2 ? '#6a4a30' : '#5a3e28', M.plank); }
    // 纵梁
    for (const v of [14, 34]) for (let u = 1; u < 47; u += 1) if (inDeck(u, v) && !busy(u, v, 0.6)) m.box(u, v - 0.3, z + 2.6, u + 1, v + 0.3, z + 3.2, '#4a3424', M.plank);
    // 浮石核心：整座城堡浮着的原因，冷光从底舱里透出来
    const fu = 24, fv = 30;
    m.cyl(fu, fv, z, z + 0.8, 5, 5.4, '#3a3448', M.metal, 14);
    for (let i = 0; i < 9; i++) { const a = i * 0.7, r = i ? 1.4 + (i % 3) * 1.1 : 0, cu = fu + Math.cos(a) * r, cv = fv + Math.sin(a) * r, h = i ? 3 + (i % 4) * 1.6 : 9; m.cyl(cu, cv, z + 0.8, z + 0.8 + h * 1.2, 1.1 - (i ? 0.3 : 0), 0.05, i % 2 ? '#9fe8ff' : '#c8f4ff', M.glow, 5); }
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; m.box(fu + Math.cos(a) * 4.6 - 0.2, fv + Math.sin(a) * 4.6 - 0.2, z, fu + Math.cos(a) * 4.6 + 0.2, fv + Math.sin(a) * 4.6 + 0.2, z + 6, '#3a3448', M.metal); }
    m.cyl(fu, fv, z + 6, z + 6.4, 4.8, 4.8, C.COP, M.metal, 14, false);
    // 水管：水泵 → 储水池底 → 锅炉（铜管贴着地面走）
    const pipe = (pts, col) => { for (let i = 0; i + 1 < pts.length; i++) { const [a, b] = [pts[i], pts[i + 1]], u0 = Math.min(a[0], b[0]) - 0.3, u1 = Math.max(a[0], b[0]) + 0.3, v0 = Math.min(a[1], b[1]) - 0.3, v1 = Math.max(a[1], b[1]) + 0.3; m.box(u0, v0, z + 1.2, u1, v1, z + 1.8, col, M.metal); } for (const q of pts) m.box(q[0] - 0.45, q[1] - 0.45, z + 1.1, q[0] + 0.45, q[1] + 0.45, z + 1.9, '#3a3448', M.metal); };
    pipe([[37, 14.2], [37, 26], [33, 26], [33, 39]], C.COP);
    pipe([[30, 39], [30, 33], [17, 33], [17, 22], [12, 22], [12, 21.2]], '#8a9aa8');
    // 储水池的底：池子下面是铆接铁箱
    m.box(22.4, 39.6, z, 37.6, 45.6, z + 14.6, '#4a5866', M.metal); for (let u = 23; u < 37.6; u += 2.4) m.box(u, 39.5, z + 0.5, u + 0.3, 39.62, z + 14, '#3a3448', M.metal);
    m.box(22.3, 39.5, z + 7, 37.7, 39.62, z + 7.5, '#3a3448', M.metal);
    // 杂物：煤堆、木桶、箱子、挂灯
    m.blob ? m.blob(4.5, 22.5, z, 3, 2.4, '#2a2630', M.stone) : m.ball(4.5, 22.5, z, 3, 2.4, '#2a2630', M.stone, 4, 10);
    [[6, 31, 1], [8.4, 32, 0], [41, 22, 1], [43, 24.4, 0], [42, 32, 1], [15, 42, 0]].forEach(([u, v, k]) => { if (busy(u, v, 1)) return; k ? m.cyl(u, v, z, z + 2.6, 1, 1, '#7a5030', M.plank, 10) : m.box(u - 1.1, v - 1.1, z, u + 1.1, v + 1.1, z + 2.2, '#9a7048', M.plank); });
    [[18, 27], [31, 18], [8, 38], [41, 38]].forEach(([u, v]) => { m.cyl(u, v, z + 9, z + 14, 0.05, 0.05, '#3a3448', 0, 4); m.box(u - 0.35, v - 0.35, z + 8, u + 0.35, v + 0.35, z + 9, '#ffcf7a', M.glow); });
  }
  function deckAndHull(m, cut, o) {
    const pts = deckEdge(120), n = pts.length, snow = o.snow;
    if (showLv(cut, 1)) {
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; m.tri([CEN[0], CEN[1], 0], [a[0], a[1], 0], [b[0], b[1], 0], snow ? '#eef4fa' : '#a89a86', snow ? M.snow : M.stone); }
      if (!snow) for (let u = 0; u < 49; u += 3) for (let v = 1; v < 48; v += 3) { if (!inDeck(u + 1.5, v + 1.5, 1.2) || roomAt(u + 1.5, v + 1.5, 1) || (u > POOL.u0 - 2 && u < POOL.u1 + 1 && v > POOL.v0 - 2 && v < POOL.v1 + 1)) continue; const k = H(u, v); m.box(u + 0.05, v + 0.05, 0.005, u + 2.95, v + 2.95, 0.03 + k * 0.03, k < 0.16 ? C.MOSS : k < 0.5 ? '#b2a48e' : '#9e917c', k < 0.16 ? M.grass : M.stone); }
      const ep = deckEdge(72, 0.6, false);
      for (let i = 0; i < ep.length; i++) { const a = ep[i], b = ep[(i + 1) % ep.length], mu = (a[0] + b[0]) / 2, mv = (a[1] + b[1]) / 2; if (roomAt(mu, mv, 1) || roomAt(mu + 1, mv + 1, 1) || roomAt(mu - 1, mv - 1, 1)) continue;
        const dir = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(...dir) || 1, nx = -dir[1] / l * 0.45, ny = dir[0] / l * 0.45;
        m.quad([a[0] - nx, a[1] - ny, 0], [b[0] - nx, b[1] - ny, 0], [b[0] - nx, b[1] - ny, 1.5], [a[0] - nx, a[1] - ny, 1.5], C.STONE2, M.stone);
        m.quad([a[0] + nx, a[1] + ny, 0], [b[0] + nx, b[1] + ny, 0], [b[0] + nx, b[1] + ny, 1.5], [a[0] + nx, a[1] + ny, 1.5], C.STONE, M.stone);
        m.quad([a[0] - nx, a[1] - ny, 1.5], [b[0] - nx, b[1] - ny, 1.5], [b[0] + nx, b[1] + ny, 1.5], [a[0] + nx, a[1] + ny, 1.5], snow ? '#eef4fa' : '#c0b6a4', M.stone);
        if (i % 2 === 0) m.box(mu - 0.5, mv - 0.5, 1.5, mu + 0.5, mv + 0.5, 2.5, C.STONE, M.stone); }
    }
    const ring = (k, z, jag) => pts.map(([u, v], i) => [CEN[0] + (u - CEN[0]) * k, CEN[1] + (v - CEN[1]) * k, z - (jag ? (Math.sin(i * 1.7) * 0.8 + Math.sin(i * 0.53) * 1.4) : 0)]);
    const top = ring(1, 0), bot = ring(0.97, -18);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, mu = (pts[i][0] + pts[j][0]) / 2 - CEN[0], mv = (pts[i][1] + pts[j][1]) / 2 - CEN[1], low = cut && cut.lv <= 0 && facing(cut, mu, mv), t0 = low ? -15 : 0;
      const k = Math.floor(i / 4) % 3, col = k === 0 ? C.RUST : k === 1 ? C.IRON : C.RUST2; m.quad([top[i][0], top[i][1], t0], [top[j][0], top[j][1], t0], bot[j], bot[i], col, M.metal); }
    if (!(cut && cut.lv <= 0)) {
      for (const zz of [-4, -10]) for (let i = 0; i < n; i += 2) { const [u, v] = pts[i]; m.box(u - 0.1, v - 0.1, zz, u + 0.1, v + 0.1, zz + 0.3, '#e0b070', M.metal); }
      for (let i = 4; i < n; i += 11) { const [u, v] = pts[i], d = Math.hypot(u - CEN[0], v - CEN[1]); m.disc(u + (u - CEN[0]) / d * 0.08, v + (v - CEN[1]) / d * 0.08, -8, 0.8, Math.abs(u - CEN[0]) / d > Math.abs(v - CEN[1]) / d ? 'u' : 'v', i % 2 ? '#ffe9a8' : '#3a3448', i % 2 ? M.glow : M.metal, 10); }
    }
    if (cut && cut.lv === 0) { const inner = ring(0.965, -16); for (let i = 0; i < n; i++) m.tri([CEN[0], CEN[1], -16], inner[i], inner[(i + 1) % n], '#4a4450', M.metal); }
    if (cut && cut.lv === 0) hold(m, o);
    const RINGS = [[0.9, -21], [0.76, -25], [0.56, -29], [0.34, -33], [0.14, -36.5]];
    let prev = bot;
    RINGS.forEach(([k, z], ri) => { const rg = ring(k, z, true); for (let i = 0; i < n; i++) { const j = (i + 1) % n; m.quad(prev[i], prev[j], rg[j], rg[i], ['#7a7268', '#8e8478', '#6a6460'][(i + ri) % 3], M.stone); } prev = rg; });
    for (let i = 0; i < n; i++) m.tri(prev[i], prev[(i + 1) % n], [CEN[0], CEN[1], -39], '#6a6460', M.stone);
    for (let i = 0; i < 10; i++) { const a = i * 0.63 + 0.3, rr = 18 - (i % 3) * 3, z = -22 - (i % 4) * 3; m.box(CEN[0] + Math.cos(a) * rr - 0.25, CEN[1] + Math.sin(a) * rr - 0.25, z, CEN[0] + Math.cos(a) * rr + 0.25, CEN[1] + Math.sin(a) * rr + 0.25, z + 2.4, '#9fe8ff', M.glow); }
  }

  // ---------- 甲板上的东西 ----------
  function deckStuff(m, o) {
    const snow = o.snow, Pt = P2();
    PLOTS.forEach(([u, v], i) => {
      m.pk(PK.plot + i);
      m.box(u, v, 0, u + PS, v + PS, 1.6, C.STONE2, M.stone, '#6a4a34', M.soil);
      m.box(u + 0.4, v + 0.4, 1.6, u + PS - 0.4, v + PS - 0.4, 1.7, o.farm && o.farm[i] && o.farm[i].wet ? '#4a3424' : '#6a4a34', M.soil);
      for (let k = 0; k < 3; k++) m.box(u + 0.7, v + 0.9 + k * 1.2, 1.7, u + PS - 0.7, v + 1.1 + k * 1.2, 1.78, '#5a3e2c', M.soil);
      const f = o.farm && o.farm[i]; if (f && Pt.crop) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) Pt.crop(m, f.crop, f.stage, u + 0.9 + a * 1.3, v + 0.9 + b * 1.3, 1.7, i * 9 + a * 3 + b);
      m.pk(0);
      m.box(u + 0.2, v - 0.25, 1.6, u + PS - 0.2, v - 0.05, 1.85, C.COP, M.metal);
    });
    const WC = snow ? '#cfe2f0' : '#4aa8d8', WM = snow ? M.snow : M.water;
    for (const [a, b, c, d] of [[18.6, 23.4, 36.4, 24], [35.8, 24, 36.4, 38.6]]) { m.box(a - 0.2, b - 0.2, 0, c + 0.2, d + 0.2, 0.7, C.STONE2, M.stone); m.box(a, b, 0.4, c, d, 0.6, WC, WM); }
    m.cyl(36.2, 23.6, 0, 15, 0.3, 0.3, C.COP, M.metal, 6);
    const Q = POOL;
    m.box(Q.u0, Q.v0, 0, Q.u1, Q.v1, Q.z - 0.6, '#2e5a6a', M.stone);
    m.pk(PK.fish); m.box(Q.u0, Q.v0, Q.z - 0.6, Q.u1, Q.v1, Q.z, WC, WM); m.pk(0);
    for (const [a, b, c, d] of [[Q.u0 - 0.7, Q.v0 - 0.7, Q.u1 + 0.7, Q.v0], [Q.u0 - 0.7, Q.v1, Q.u1 + 0.7, Q.v1 + 0.7], [Q.u0 - 0.7, Q.v0, Q.u0, Q.v1], [Q.u1, Q.v0, Q.u1 + 0.7, Q.v1]]) m.box(a, b, 0, c, d, Q.z + 0.7, C.STONE, M.stone, snow ? '#eef4fa' : '#c8bca8', snow ? M.snow : M.stone);
    for (let k = 0; k < 10; k++) { const u = Q.u0 - 0.35 + (k % 5) * (Q.u1 - Q.u0 + 0.7) / 4, v = k < 5 ? Q.v0 - 0.35 : Q.v1 + 0.35; m.box(u - 0.4, v - 0.4, Q.z + 0.7, u + 0.4, v + 0.4, Q.z + 1.2, C.STONE2, M.stone); }
    if (!snow) for (let k = 0; k < 5; k++) { const u = Q.u0 + 2.4 + k * 2.9, v = Q.v0 + 1.6 + (k % 2) * 4.2; m.cyl(u, v, Q.z + 0.02, Q.z + 0.06, 0.8, 0.8, '#5aa64e', 0, 10); if (k % 2) m.ball(u + 0.3, v, Q.z + 0.6, 0.35, 0.6, '#f2a6c2', 0, 4, 6); }
    for (let k = 0; k < 6; k++) m.blob(Q.u0 + 0.8 + H(k, 3) * (Q.u1 - Q.u0 - 1.6), Q.v0 + 0.7 + (k % 2) * (Q.v1 - Q.v0 - 1.4), Q.z, 0.45, 1.4, '#4c8a40', 8, k, 3, 5);
    const sx = 30; m.box(sx - 1, Q.v1, Q.z - 0.1, sx + 1, Q.v1 + 0.7, Q.z + 0.05, WC, WM); m.box(sx - 1, Q.v1 + 0.7, 0.3, sx + 1, DK.v1 + 0.3, 0.5, WC, WM);
    for (const d of [-1.4, 1]) m.box(sx + d, Q.v1 + 0.7, 0, sx + d + 0.4, DK.v1 + 0.3, 1.1, C.STONE2, M.stone);
    m.box(sx - 1, DK.v1 + 0.3, -34, sx + 1, DK.v1 + 0.7, 0.5, WC, WM);
    m.pk(PK.tap); m.cyl(TAP.u, TAP.v, 0, 3.6, 0.35, 0.3, C.COP2, M.metal, 8); m.box(TAP.u - 0.15, TAP.v - 0.8, 3.2, TAP.u + 0.15, TAP.v, 3.5, C.COP, M.metal); m.cyl(TAP.u, TAP.v - 1, 0, 1, 0.9, 1, '#8a5a3a', M.plank, 10); m.pk(0);
    HIVES.forEach(([u, v]) => { m.pk(PK.hive); m.box(u - 0.15, v - 0.15, 0, u + 0.15, v + 0.15, 1.2, C.TIMBER, M.plank); for (let k = 0; k < 3; k++) m.box(u - 1, v - 0.9, 1.2 + k * 1.5, u + 1, v + 0.9, 2.6 + k * 1.5, k % 2 ? '#f4ead8' : '#e8dcc4', M.plank); m.gable(u - 1.1, v - 1, u + 1.1, v + 1, 5.7, 1, 'u', snow ? '#e4ecf4' : '#c86a4a', M.tile, 0.2); m.box(u - 0.4, v + 0.9, 1.6, u + 0.4, v + 1, 1.9, '#3a2a20', 0); m.pk(0); });
    if (!snow) for (let k = 0; k < 14; k++) { const a = k * 0.45, u = 42.6 + Math.cos(a) * 3.6, v = 28.4 + Math.sin(a) * 2.4; m.flower(u, v, 0, 1.6 + (k % 3) * 0.4, ['#f2a6c2', '#ffd95a', '#c8a0f0', '#ffffff'][k % 4], k); }
    m.pk(PK.mail); m.box(MAILB.u - 0.14, MAILB.v - 0.14, 0, MAILB.u + 0.14, MAILB.v + 0.14, 5, C.TIMBER, M.plank); m.box(MAILB.u - 0.9, MAILB.v - 0.55, 5, MAILB.u + 0.9, MAILB.v + 0.55, 6.9, '#e0604a', 0); m.box(MAILB.u + 0.9, MAILB.v - 0.1, 6, MAILB.u + 1, MAILB.v + 0.1, 8.4, '#ffd36a', 0); m.pk(0);
    LAMPS.forEach(([u, v], i) => { m.pk(PK.lamp + i); m.cyl(u, v, 0, 9.5, 0.17, 0.12, '#3a3448', M.metal, 5); m.box(u - 0.42, v - 0.42, 9.5, u + 0.42, v + 0.42, 11.8, '#ffe9a8', M.glow); m.cyl(u, v, 11.8, 13, 0.66, 0.05, '#3a3448', 0, 4); m.pk(0); });
    if (Pt.deco) (o.deco || []).forEach((id, i) => { if (id && SLOTS[i]) Pt.deco(m, id, SLOTS[i][0], SLOTS[i][1], 0, PK.deco + i); });
    const crate = (u, v, z, s, col) => { m.box(u - s, v - s, z, u + s, v + s, z + s * 2, col || '#a8784a', M.plank); m.box(u - s - 0.05, v - 0.1, z + 0.2, u + s + 0.05, v + 0.1, z + s * 2 - 0.2, '#7a5030', M.plank); };
    const barrel = (u, v, z, r) => { m.cyl(u, v, z, z + r * 3.4, r, r * 1.05, '#8a5a3a', M.plank, 10); for (const k of [0.25, 0.75]) m.cyl(u, v, z + r * 3.4 * k - 0.15, z + r * 3.4 * k + 0.15, r * 1.08, r * 1.08, '#3a3448', M.metal, 10, false); };
    crate(19.4, 20.4, 0, 0.8); crate(19.6, 20.4, 1.6, 0.6, '#b88a5a'); barrel(27.4, 20.4, 0, 0.7); barrel(28.6, 20.8, 0, 0.6); crate(41.2, 22.6, 0, 0.7); barrel(11.8, 32, 0, 0.7); crate(16.6, 31.4, 0, 0.8); crate(16.4, 31.4, 1.6, 0.6, '#c8935e');
    m.pot(17.2, 41.4, 0, 0.6, '#c8705a', snow ? null : '#5aa64e', 3); m.pot(46, 30.4, 0, 0.5, '#5a7ab0', snow ? null : '#6fbf5a', 4); m.pot(38.4, 46.6, 0, 0.6, '#c8705a', snow ? null : '#86cc6a', 5);
  }

  // ---------- 屋里 ----------
  function interiors(m, cut, o) {
    const show = (id) => showLv(cut, roomLv(id)), z = (id) => Z[roomLv(id)], Pt = P2();
    if (show('hall')) { const Zh = z('hall'); m.pk(140); m.box(9.6, 16.6, Zh, 13.6, 18.6, Zh + 2.6, C.WOOD2, M.plank); m.pk(0); m.cyl(5.2, 13.6, Zh, Zh + 10, 0.25, 0.2, C.TIMBER, M.plank, 6); m.box(4.6, 13, Zh + 6, 5.8, 14.2, Zh + 8.6, '#c86a5a', M.cloth); m.cyl(12, 13, Zh + 0.02, Zh + 0.12, 3.6, 3.6, '#a8484a', M.cloth, 18); m.cyl(12, 13, Zh + 0.12, Zh + 0.16, 2.6, 2.6, '#e8c070', M.cloth, 16); m.cyl(12, 12, Zh + 11, Zh + 14, 0.05, 0.05, '#3a3448', 0, 4); m.cyl(12, 12, Zh + 9.6, Zh + 11, 1.2, 0.3, '#ffe9a8', M.glow, 8); }
    if (show('kitchen')) { const Zk = z('kitchen'); m.pk(141); m.box(21, 9.4, Zk, 25, 11.8, Zk + 5, '#4a4450', M.metal, '#2e2a30'); for (const u of [22.2, 24]) m.cyl(u, 10.6, Zk + 5, Zk + 6.4, 0.8, 0.9, '#5a5a66', M.metal, 10); m.cyl(24.4, 9.8, Zk + 5, Zk + WH, 0.5, 0.5, C.COP2, M.metal, 8); m.pk(142); m.box(25, 9.4, Zk, 28.2, 11.8, Zk + 4.8, C.WOOD, M.plank, '#e8e0d0'); m.box(25.6, 9.8, Zk + 4.5, 27.6, 11.2, Zk + 4.85, '#9fc8e0', M.water); m.cyl(26.6, 9.6, Zk + 4.8, Zk + 6.8, 0.14, 0.12, C.COP, M.metal, 5); m.pk(0);
      m.box(25, 9.3, Zk + 8.4, 28.2, 10.6, Zk + 11.6, C.WOOD2, M.plank); for (let k = 0; k < 4; k++) m.box(21.2 + k * 1, 9.35, Zk + 8.4 + (k % 2), 21.5 + k * 1, 9.5, Zk + 10.6, ['#c0c0c8', C.COP, '#c0c0c8', C.GOLD][k], M.metal);
      m.box(22.4, 14.4, Zk + 4.4, 27, 17.4, Zk + 5, C.WOOD, M.plank); for (const [u, v] of [[22.8, 14.8], [26.6, 14.8], [22.8, 17], [26.6, 17]]) m.box(u - 0.18, v - 0.18, Zk, u + 0.18, v + 0.18, Zk + 4.4, C.TIMBER, M.plank); m.ball(23.8, 15.8, Zk + 5.6, 0.7, 1.1, '#e8705a', 0, 4, 8); m.ball(25.6, 15.6, Zk + 5.5, 0.5, 0.9, '#ffd36a', 0, 4, 8); }
    if (show('dining')) { const Zd = z('dining'); m.pk(143); m.box(32, 16.6, Zd + 4.6, 38, 19.6, Zd + 5.3, '#a8784a', M.plank, '#f4ead8', M.cloth); m.pk(0); for (const [u, v] of [[32.4, 17], [37.6, 17], [32.4, 19.2], [37.6, 19.2]]) m.box(u - 0.18, v - 0.18, Zd, u + 0.18, v + 0.18, Zd + 4.6, C.TIMBER, M.plank); for (const u of [33.4, 35, 36.6]) for (const [v, s] of [[15.8, -1], [20.4, 1]]) { m.box(u - 0.6, v - 0.6, Zd + 2.8, u + 0.6, v + 0.6, Zd + 3.2, C.WOOD2, M.plank); m.box(u - 0.6, s > 0 ? v + 0.4 : v - 0.6, Zd + 3.2, u + 0.6, s > 0 ? v + 0.6 : v - 0.4, Zd + 6.4, C.WOOD2, M.plank); }
      m.cyl(35, 18.1, Zd + 9.6, Zd + 14, 0.05, 0.05, '#3a3448', 0, 4); m.cyl(35, 18.1, Zd + 8.6, Zd + 9.8, 1.2, 0.3, '#ffe9a8', M.glow, 8); m.box(38.4, 21, Zd, 39.6, 22.6, Zd + 9, '#8a5a3a', M.plank); }
    if (show('shed')) { const Zs = z('shed'); m.pk(155); for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) for (let q = 0; q < 3; q++) m.cyl(2.6 + q * 1.1, 22.2 + k * 2.6, Zs + 0.8 + j * 1.5, Zs + 0.8 + j * 1.5, 0.75, 0.75, j % 2 ? '#8a5a3a' : '#a8784a', M.plank, 7); m.pk(0); m.box(7.6, 28, Zs, 9.6, 29.6, Zs + 2.4, C.WOOD2, M.plank); m.box(9, 22, Zs + 2, 9.2, 22.2, Zs + 6, C.TIMBER, M.plank); m.box(8.6, 21.8, Zs + 5.4, 9.6, 22.4, Zs + 6.4, '#c0c0c8', M.metal); }
    if (show('green')) { const Zg = z('green'); m.pk(157); for (let k = 0; k < 3; k++) m.box(5, 32.4, Zg + 1.6 + k * 2.4, 14, 33.2, Zg + 2 + k * 2.4, C.WOOD2, M.plank); for (let k = 0; k < 9; k++) m.pot(5.6 + (k % 6) * 1.6, 32.8, Zg + 2 + Math.floor(k / 6) * 2.4 + (k >= 6 ? 2.4 : 0), 0.3, '#c8705a', o.snow ? '#6a8a70' : ['#5aa64e', '#86cc6a', '#f2a6c2'][k % 3], k); m.pk(156); m.cyl(14, 42.1, Zg, Zg + 3, 0.7, 0.8, '#8a5a3a', M.plank, 10); m.pk(165); m.cyl(4.7, 42.3, Zg, Zg + 5, 0.25, 0.25, C.COP, M.metal, 6); m.disc(4.7, 42, Zg + 4, 0.6, 'v', '#c03a2a', M.metal, 8); m.pk(0); for (const v of [32.5, 42.6]) m.box(4.6, v - 0.15, Zg + 0.8, 14.4, v + 0.15, Zg + 1.3, C.COP, M.metal);
      GPOTS.forEach(([pu, pv], i) => { const pt = (o.pots || [])[i]; m.pk(160 + i); m.cyl(pu, pv, Zg, Zg + 1.8, 0.9, 1.1, i % 2 ? '#c8705a' : '#b8604a', 0, 12); m.cyl(pu, pv, Zg + 1.8, Zg + 2.1, 1.15, 1.15, '#a8503a', 0, 12); m.cyl(pu, pv, Zg + 2, Zg + 2.05, 1, 1, pt && pt.wet ? '#3a2a20' : '#5a4030', M.soil, 12); if (pt && PP.LIFE && PP.LIFE.PL[pt.id] && Pt.lifePlant) Pt.lifePlant(m, PP.LIFE.PL[pt.id], pt.stage, pu, pv, Zg + 2.05, i * 3 + 1, 1.4); m.pk(0); }); }
    if (show('library')) { const Zl = z('library'); m.pk(145); m.box(1.9, 27.4, Zl, 10.6, 29.2, Zl + 12, '#7a5030', M.plank); for (let s = 0; s < 4; s++) { m.box(1.9, 27.3, Zl + 1 + s * 2.8, 10.6, 27.45, Zl + 1.3 + s * 2.8, '#a8784a', M.plank); for (let j = 0; j < 11; j++) m.box(2.3 + j * 0.75, 27.45, Zl + 1.3 + s * 2.8, 2.85 + j * 0.75, 28.1, Zl + 3.4 + s * 2.8 - (j % 3) * 0.3, ['#c85a4a', '#5a8ad8', '#e8c860', '#7fc8a8', '#c8a0f0', '#8a5e3c'][(j + s) % 6], 0); } m.pk(146); m.box(2, 21, Zl, 5.2, 24.4, Zl + 3.2, '#5a7a4a', M.cloth); m.box(2, 21, Zl + 3.2, 2.6, 24.4, Zl + 7.4, '#4a6a3a', M.cloth); m.pk(0); m.cyl(9.4, 22.4, Zl, Zl + 3.6, 0.25, 0.25, C.TIMBER, M.plank, 6); m.ball(9.4, 22.4, Zl + 4.8, 0.9, 1.7, '#5a9ad8', 0, 6, 10); }
    if (show('bath')) { const Zb = z('bath'); m.pk(144); m.cyl(37, 6.1, Zb, Zb + 4, 3, 3, '#e8e4dc', 0, 18); m.cyl(37, 6.1, Zb + 3.4, Zb + 3.9, 2.6, 2.6, '#9fd4f2', M.water, 18); m.cyl(37, 6.1, Zb + 4, Zb + 4.4, 3.1, 3.1, C.COP, M.metal, 18, false); m.pk(0); m.cyl(39.6, 4, Zb + 4, Zb + 8, 0.2, 0.2, C.COP, M.metal, 6); m.box(41.2, 8, Zb, 42.4, 10.4, Zb + 5.4, '#f4f0e8', 0); m.box(32.4, 9.4, Zb + 6, 32.6, 11.4, Zb + 8.6, '#f2a6c2', M.cloth); }
    if (show('workshop')) { const Zw = z('workshop'); m.pk(147); m.box(8, 17, Zw + 4.4, 16, 19, Zw + 5.2, C.WOOD, M.plank); for (const u of [8.4, 15.6]) m.box(u - 0.2, 17.2, Zw, u + 0.2, 18.8, Zw + 4.4, C.TIMBER, M.plank); m.pk(0); m.box(10, 17.6, Zw + 5.2, 12.4, 18.6, Zw + 7.2, '#c8935e', M.plank); m.gable(10, 17.6, 12.4, 18.6, Zw + 7.2, 1, 'u', C.TILE, M.tile, 0.2); for (let k = 0; k < 5; k++) m.box(4.4 + k * 0.3, 9.4, Zw, 4.6 + k * 0.3, 10, Zw + 9, ['#a8784a', '#c8935e', '#8a5a3a'][k % 3], M.plank); m.box(14, 17.8, Zw + 5.2, 15.6, 18, Zw + 6, '#c0c0c8', M.metal); }
    if (show('store')) { const Zt = z('store'); m.pk(148); m.box(33, 2.4, Zt, 41, 5, Zt + 9.6, '#8a5a3a', M.plank); for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { m.box(33.4 + i * 1.25, 5, Zt + 1 + j * 2.1, 34.4 + i * 1.25, 5.1, Zt + 2.7 + j * 2.1, '#b88a5a', M.plank); m.box(33.8 + i * 1.25, 5.1, Zt + 1.7 + j * 2.1, 34 + i * 1.25, 5.2, Zt + 1.9 + j * 2.1, C.GOLD, M.metal); } m.pk(0); for (let k = 0; k < 3; k++) m.ball(32.4 + k * 1.6, 9.6, Zt + 1.3, 0.8, 1.6, '#d8c098', M.cloth, 4, 8); }
    if (show('attic')) { const Za = z('attic'); m.pk(149); m.box(1.6, 22, Za, 5, 25.4, Za + 2.6, '#7a5030', M.plank); m.box(2, 22.4, Za + 2.6, 4.6, 25, Za + 4.2, '#a8784a', M.plank); m.pk(0); for (let k = 0; k < 3; k++) m.ball(9 + (k % 2), 27 - k * 1.4, Za + 1.3, 0.8, 1.6, '#d8c098', M.cloth, 4, 8); m.box(6, 28.2, Za, 10.6, 28.8, Za + 6, '#8a5a3a', M.plank); }
    if (show('cockpit')) { const Zc = z('cockpit'); m.pk(151); m.box(10.4, 16, Zc, 13.6, 18, Zc + 4.6, '#5a5466', M.metal); m.pk(0); if (Pt.wheel) Pt.wheel(m, 12, 15.8, Zc + 6.8, 1.3, 0); for (let k = 0; k < 3; k++) m.disc(10.8 + k * 1.2, 15.98, Zc + 3.6, 0.38, 'v', ['#ffe9a8', '#9fe8ff', '#ffb0a0'][k], M.glow, 8); m.cyl(12, 12, Zc + 0.02, Zc + 0.12, 4.6, 4.6, '#8a3a3a', M.cloth, 18);
      m.pk(158); m.cyl(18, 14.2, Zc, Zc + 3.6, 0.15, 0.15, '#3a3448', M.metal, 5); if (Pt.warp) Pt.warp(m, [18, 14.2, Zc + 4], 0.8, -0.5, 0, () => m.cyl(18, 14.2, Zc + 4, Zc + 8.4, 0.45, 0.3, C.GOLD, M.metal, 8)); m.pk(0); }
    if (show('boiler')) { const Zo = z('boiler'); m.pk(152); m.cyl(12, 15.2, Zo, Zo + 8.6, 2.8, 2.8, C.RUST, M.metal, 16); m.ball(12, 15.2, Zo + 8.6, 2.8, 3.8, C.RUST2, M.metal, 5, 16); for (const zz of [2, 4.6, 7.2]) m.cyl(12, 15.2, Zo + zz, Zo + zz + 0.35, 2.9, 2.9, '#3a3448', M.metal, 16, false); m.box(10.8, 12.36, Zo + 1, 13.2, 12.5, Zo + 3.4, '#ff9a40', M.glow); m.pk(0); m.cyl(12, 15.2, Zo + 12, Zo + 14, 0.6, 0.6, C.COP, M.metal, 8); m.disc(14.6, 13, Zo + 6, 0.7, 'v', '#f4f0e6', 0, 10);
      m.box(3.6, 14.6, Zo + 5.4, 9.2, 15.8, Zo + 6.4, '#c0c0c8', M.metal); m.cyl(5, 15.2, Zo + 3, Zo + 9, 1, 1, C.IRON2, M.metal, 12); for (let k = 0; k < 3; k++) m.cyl(16 + k * 1.1, 17.6 - k * 0.6, Zo, Zo + 14, 0.32, 0.32, k % 2 ? C.COP : C.IRON, M.metal, 6); }
    if (show('pump')) { const Zp = z('pump'); m.pk(153); for (const u of [35, 39]) { m.cyl(u, 5.4, Zp, Zp + 5.4, 1.3, 1.3, C.IRON, M.metal, 12); m.cyl(u, 5.4, Zp + 5.4, Zp + 8.4, 0.4, 0.4, C.COP, M.metal, 6); } m.box(34, 5, Zp + 8.4, 40, 5.8, Zp + 9, C.COP2, M.metal); m.pk(0); m.cyl(41.6, 6, Zp, Zp + 16, 0.55, 0.55, C.COP, M.metal, 8); m.cyl(37, 11, Zp + 0.02, Zp + 0.3, 2, 2, '#3a6a7a', M.water, 14); }
    if (o.furn && PP.FURN) PP.FURN.build(m, o.furn.filter((it) => show(it.room || 'living') && (o.skip == null || o.furn.indexOf(it) !== o.skip)), { S: FS, zOf: (it) => Z[roomLv(it.room || 'living')], pinkBed: o.pinkBed, idx: (it) => o.furn.indexOf(it) });
    if (show('bedroom')) { const Zr = z('bedroom'); m.pk(166); m.box(22.4, 6.8, Zr, 27.2, 9.4, Zr + 1.2, '#8a5a3a', M.plank); m.box(22.6, 7.0, Zr + 1.2, 27.0, 9.2, Zr + 2.0, '#f4ece0', M.cloth); m.box(23.6, 6.95, Zr + 1.6, 27.05, 9.3, Zr + 2.2, o.pinkBed ? '#f0a8c0' : '#7aa0d8', M.cloth); m.box(22.7, 7.2, Zr + 2.0, 23.5, 9.0, Zr + 2.6, '#ffffff', M.cloth); m.box(22.2, 6.7, Zr, 22.6, 9.5, Zr + 4.2, '#7a4a2e', M.plank); m.box(27.1, 6.7, Zr, 27.4, 9.5, Zr + 2.8, '#7a4a2e', M.plank); m.pk(0); m.box(27.6, 6.8, Zr, 31.2, 8, Zr + 6.6, C.BRICK, M.stone); m.box(28.2, 7.95, Zr + 0.5, 30.6, 8.1, Zr + 3.8, '#2a1a18', 0); m.box(28.4, 7.9, Zr + 0.5, 30.4, 8.05, Zr + 1.8, '#ff9a40', M.glow); }
    if (showLv(cut, 2)) {
      const Zg = Z[2], snow = o.snow;
      m.pk(159); m.box(31.6, 21.8, Zg, 35.6, 22.6, Zg + 2.4, C.WOOD2, M.plank); m.box(31.6, 22.4, Zg + 2.4, 35.6, 22.8, Zg + 5, C.WOOD2, M.plank); m.pk(0);
      for (let k = 0; k < 2; k++) { const u = 39.2 - k * 1.6, v = 20.4 + k * 1.6; m.box(u - 0.6, v - 0.6, Zg, u + 0.6, v + 0.6, Zg + 1.4, '#8a5a3a', M.plank); if (!snow) m.foliage(u, v, Zg + 2.6, 0.8, 1.8, ['#4c9a48', '#6fbf5a', '#86cc6a'], 20, k, 0.7); }
      if (!snow) for (let k = 0; k < 6; k++) m.flower(29.4 + (k % 2) * 0.4, 19.4 + k * 0.6, Zg, 2 + (k % 2), ['#f2a6c2', '#ffd95a', '#c8a0f0'][k % 3], k + 20);
      m.cyl(31, 15, Zg, Zg + 7, 0.12, 0.12, C.TIMBER, M.plank, 5); m.cyl(31, 21, Zg, Zg + 7, 0.12, 0.12, C.TIMBER, M.plank, 5); m.box(30.95, 15, Zg + 6.8, 31.05, 21, Zg + 6.9, '#f4f0e6', 0); for (let k = 0; k < 3; k++) m.box(30.9, 15.8 + k * 1.8, Zg + 4.6, 31.1, 17 + k * 1.8, Zg + 6.8, ['#e0604a', '#5aa6d8', '#ffd36a'][k], M.cloth);
      m.pk(PK.nest); m.cyl(NEST.u, NEST.v, Zg, Zg + 1.2, 0.9, 1.1, '#a8784a', M.plank, 10); m.cyl(NEST.u, NEST.v, Zg + 1.2, Zg + 1.6, 1.15, 1, '#8a6a40', M.cloth, 10); if (o.egg) m.ball(NEST.u + 0.2, NEST.v, Zg + 1.9, 0.36, 0.7, '#f8f0e0', 0, 4, 8); m.pk(0);
      const Bb = BALLOON; m.box(Bb.u - 2.4, Bb.v - 2.4, Zg, Bb.u + 2.4, Bb.v + 2.4, Zg + 0.4, C.PLANK, M.plank);
      if (!o.tripping) { m.pk(PK.balloon); m.box(Bb.u - 1.1, Bb.v - 1.1, Zg + 0.4, Bb.u + 1.1, Bb.v + 1.1, Zg + 3, '#a8784a', M.plank); for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(Bb.u + du - 0.06, Bb.v + dv - 0.06, Zg + 3, Bb.u + du + 0.06, Bb.v + dv + 0.06, Zg + 9, '#5a3a28', 0); m.ball(Bb.u, Bb.v, Zg + 15, 3.6, 7.6, '#e8705a', M.cloth, 8, 16, 0, 3); for (let i = 0; i < 8; i += 2) { const a = (i / 8) * 6.2832; m.quad([Bb.u + Math.cos(a) * 3.62, Bb.v + Math.sin(a) * 3.62, Zg + 13], [Bb.u + Math.cos(a + 0.4) * 3.62, Bb.v + Math.sin(a + 0.4) * 3.62, Zg + 13], [Bb.u + Math.cos(a + 0.4) * 3.62, Bb.v + Math.sin(a + 0.4) * 3.62, Zg + 17], [Bb.u + Math.cos(a) * 3.62, Bb.v + Math.sin(a) * 3.62, Zg + 17], '#ffd36a', M.cloth); } m.pk(0); }
    }
    if (showLv(cut, 3)) { const Zb = Z[3]; for (let k = 0; k < 4; k++) m.pot(22.4 + k * 2.2, 18, Zb, 0.4, '#c8705a', o.snow ? null : ['#5aa64e', '#f2a6c2'][k % 2], k); }
  }

  // ---------- 外面挂着的东西 ----------
  const WING_ROOTS = [[3.8, 9.2, Math.PI * 0.92], [43.4, 9.4, -0.08]];
  function extras(m, cut, o) {
    const Pt = P2(), all = !cut;
    if (showLv(cut, 1)) { const top = cut ? Z[Math.min(3, cut.lv)] + WH : Z[3] + WH + 26; m.cyl(16.6, 4.2, Z[0], top, 0.9, 0.85, C.RUST, M.metal, 10); for (let zz = Z[0] + 4; zz < top - 1; zz += 6) m.cyl(16.6, 4.2, zz, zz + 0.6, 1.1, 1.1, '#3a3448', M.metal, 10); if (all) m.cyl(16.6, 4.2, top, top + 1.6, 0.85, 1.4, C.COP2, M.metal, 10, true, '#1e1a22'); }
    if (all || cut.lv >= 2) for (const [u, v, z0, z1, r, col] of [[40.6, 2.2, Z[1], Z[3] + 8, 0.5, C.COP], [41.8, 3, Z[1] + 4, Z[3] + 14, 0.6, C.COP2], [6.4, 4.6, Z[2], Z[3] + 20, 0.5, C.COP], [7.6, 3.8, Z[2] + 4, Z[3] + 24, 0.42, C.RUST], [33.2, 2.6, Z[1], Z[3] + 4, 0.45, C.COP2]]) { const top = cut ? Math.min(z1, Z[cut.lv] + WH) : z1; if (Pt.stack) Pt.stack(m, u, v, z0, top, r, col, u + v); }
    if (Pt.truss && (all || cut.lv >= 2)) { Pt.truss(m, 3.2, 14, Z[2] + 6, Math.PI * 0.95, 6); Pt.truss(m, 43.4, 6, Z[2] + 10, -0.2, 5); }
    if (Pt.wheel && (all || cut.lv >= 1)) { Pt.wheel(m, 4, 16, Z[1] + 6, 1.6, Math.PI / 2 + 0.6); Pt.wheel(m, 43.6, 10.4, Z[2] + 4, 1.3, 0); }
    if (Pt.fin && (all || cut.lv >= 2)) { Pt.fin(m, 1.2, 21, Z[2] - 0.6, Math.PI / 2, 8.5, 8, 1.3); Pt.fin(m, 40.6, 23.2, Z[2] - 0.6, Math.PI, 11, 9, 1.2); }
    if (all || cut.lv >= 2) for (const [u, v] of WING_ROOTS) { m.cyl(u, v, Z[2] + 2, Z[2] + 10, 1.6, 1.6, C.IRON2, M.metal, 12); m.cyl(u, v, Z[2] + 5.4, Z[2] + 6.6, 2, 2, C.GOLD, M.metal, 12); }
    if (all) { m.quad([-2.6, 14.4, Z[2] + 7.6], [-2.6, 15.6, Z[2] + 7.6], [-2.6, 15.6, Z[2] + 1.6], [-2.6, 14.4, Z[2] + 1.6], '#dfe6ea', M.cloth); m.quad([47.8, 5, Z[2] + 11.6], [48.6, 4.8, Z[2] + 11.6], [48.6, 4.8, Z[2] + 5.6], [47.8, 5, Z[2] + 5.6], '#dfe6ea', M.cloth); }
  }
  // 翅膀：一根铜主骨从轴承伸出去，下面一片片红色鳞片像羽毛一样叠着垂下来；蒸汽足扇得有劲
  function wings(m, t, o) {
    const pw = o.power == null ? 0.6 : o.power;
    WING_ROOTS.forEach(([u, v, base], k) => {
      const flap = Math.sin(t * (0.5 + pw * 1.3) + k * 0.4) * (0.05 + pw * 0.16), z0 = Z[2] + 6, ca = Math.cos(base), sa = Math.sin(base), L = 17, N = 9;
      // 主骨上的点：往外伸、往上翘，扇动时绕根部上下转
      const sp = (f) => { const r = L * f, up = (Math.sin(f * 2.4) * 6 + f * 4) + r * Math.sin(flap) / 0.408; return [u + ca * r * Math.cos(flap), v + sa * r * Math.cos(flap), z0 + up]; };
      for (let j = 0; j < 14; j++) { const A0 = sp(j / 14), A1 = sp((j + 1) / 14), w = 0.32 - j * 0.015; m.quad([A0[0] - sa * w, A0[1] + ca * w, A0[2]], [A1[0] - sa * w, A1[1] + ca * w, A1[2]], [A1[0] + sa * w, A1[1] - ca * w, A1[2]], [A0[0] + sa * w, A0[1] - ca * w, A0[2]], C.GOLD, M.metal); m.quad([A0[0], A0[1], A0[2] - 0.5], [A1[0], A1[1], A1[2] - 0.4], [A1[0], A1[1], A1[2] + 0.4], [A0[0], A0[1], A0[2] + 0.5], '#a8803a', M.metal); }
      // 羽片：一根根分开的长羽，从根部的“往下垂”扇形展开到翼尖的“往外伸”
      const feather = (P, dx, dy, dz, len, w0, col, tip) => {
        const nx = -dy, ny = dx, nl = Math.hypot(nx, ny) || 1, wx = nx / nl, wy = ny / nl;
        const E = [P[0] + dx * len, P[1] + dy * len, P[2] + dz * len], Mi = [P[0] + dx * len * 0.72, P[1] + dy * len * 0.72, P[2] + dz * len * 0.72];
        m.quad([P[0] - wx * w0, P[1] - wy * w0, P[2]], [P[0] + wx * w0, P[1] + wy * w0, P[2]], [Mi[0] + wx * w0 * 0.8, Mi[1] + wy * w0 * 0.8, Mi[2]], [Mi[0] - wx * w0 * 0.8, Mi[1] - wy * w0 * 0.8, Mi[2]], col, M.cloth);
        m.tri([Mi[0] - wx * w0 * 0.8, Mi[1] - wy * w0 * 0.8, Mi[2]], [Mi[0] + wx * w0 * 0.8, Mi[1] + wy * w0 * 0.8, Mi[2]], E, tip, M.metal);
        m.quad([P[0], P[1], P[2] + 0.05], [Mi[0], Mi[1], Mi[2] + 0.05], [Mi[0] + 0.08, Mi[1] + 0.08, Mi[2] + 0.05], [P[0] + 0.08, P[1] + 0.08, P[2] + 0.05], '#d8b060', M.metal);
      };
      for (let j = 0; j < N; j++) {
        const f = (j + 0.6) / N, P = sp(f), th = (0.12 + f * 0.62) * Math.PI / 2 + flap * 0.6, back = 0.35;
        // 方向 = 往下 cos(th) + 沿主骨往外 sin(th)，再往后（+v）一点
        let dx = ca * Math.sin(th), dy = sa * Math.sin(th) + back, dz = -Math.cos(th) / 0.408;
        const l = Math.hypot(dx, dy, dz * 0.408); dx /= l; dy /= l; dz /= l;
        const len = 7 + f * 7;
        feather(P, dx, dy, dz, len, 0.85, j % 2 ? '#b8402e' : C.WING, C.GOLD);
        // 覆羽：短一点、深一点，盖在长羽根部
        const P2 = sp(Math.min(1, f + 0.05));
        feather([P2[0], P2[1] - 0.1, P2[2] + 0.2], dx, dy, dz, len * 0.45, 0.7, C.WING2, '#7a2a24');
      }
      // 根部的活塞：一伸一缩
      m.box(u - 0.25, v - 0.25, z0 - 4 + Math.sin(flap * 5) * 0.8, u + 0.25, v + 0.25, z0, '#c0c0c8', M.metal);
    });
  }

  // ---------- 整体 ----------
  function build(o) {
    const m = new Mesh(), cut = o.cut || null;
    deckAndHull(m, cut, o);
    if (showLv(cut, 1)) deckStuff(m, o);
    for (const r of ROOMS) if (showLv(cut, r.lv)) (isRound(r) ? roundRoom : rectRoom)(m, r, cut, o);
    for (const p of PASS) if (showLv(cut, p.lv)) passage(m, p, cut, o);
    for (const op of OPEN) { if (!showLv(cut, op[0])) continue; const z = Z[op[0]]; m.box(op[1], op[2], z - 1, op[3], op[4], z, '#8a7e70', M.stone, o.snow ? '#eef4fa' : '#9a8a6e', o.snow ? M.snow : M.stone); }
    for (const p of PARA) { if (!showLv(cut, p[0])) continue; const [lv, a, b, c, d] = p, z = Z[lv]; m.box(a, b, z, c, d, z + 1.4, C.STONE2, M.stone); const L = Math.max(c - a, d - b), n = Math.floor(L / 1.3); for (let i = 0; i < n; i += 2) { const t = i / n, t2 = (i + 1) / n; c - a > d - b ? m.box(a + (c - a) * t, b, z + 1.4, a + (c - a) * t2, d, z + 2.3, C.STONE, M.stone) : m.box(a, b + (d - b) * t, z + 1.4, c, b + (d - b) * t2, z + 2.3, C.STONE, M.stone); } }
    for (const r of RAMPS) { if (!showLv(cut, r.a)) continue; const z0 = Z[r.a], z1 = Z[r.b], part = cut && cut.lv === r.a; m.stairs(r.lo, part ? r.lo + (r.hi - r.lo) * 0.4 : r.hi, r.v0, r.v1, z0, part ? z0 + (z1 - z0) * 0.4 : z1, 'u', '#8a7a6a', part ? 4 : 10, true); if (!part) m.rail(r.lo, r.v1 + 0.1, r.hi, r.v1 + 0.1, z0 + 1, 5, '#3a3448'); }
    roofs(m, cut, o);
    interiors(m, cut, o);
    extras(m, cut, o);
    return m;
  }
  function dyn(o) {
    const m = new Mesh(), t = o.t, cut = o.cut;
    if (!cut || cut.lv >= 2) wings(m, t, o);
    if (showLv(cut, 0)) { const Zo = Z[0]; for (let i = 0; i < 5; i++) { const h = 1.2 + Math.sin(t * 9 + i * 2.1) * 0.6 + (o.fire || 0.6) * 1.2; m.cyl(10.9 + i * 0.55, 12.6, Zo + 1.1, Zo + 1.1 + h, 0.28, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); } const ps = Math.sin(t * (0.5 + (o.power || 0.6) * 1.3)) * 1.2; m.box(1.6 + ps, 14.8, Zo + 5.6, 3.8 + ps, 15.6, Zo + 6.2, '#e0e0e8', M.metal); }
    if (showLv(cut, 1)) { const Zk = Z[1]; if (o.cooking) for (let i = 0; i < 6; i++) { const h = 1.4 + Math.sin(t * 9 + i * 2.1) * 0.5; m.cyl(21.6 + i * 0.6, 10.6, Zk + 6.4, Zk + 6.4 + h, 0.26, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); }
      const Q = POOL; for (let i = 0; i < 4; i++) { const a = t * (0.35 + i * 0.08) + i * 1.7, cu = (Q.u0 + Q.u1) / 2 + Math.cos(a) * (5 - i), cv = (Q.v0 + Q.v1) / 2 + Math.sin(a * 1.3) * 2.2, du = -Math.sin(a) * 0.9, dv = Math.cos(a * 1.3) * 0.6, l = Math.hypot(du, dv) || 1, ux = du / l, vx = dv / l, z = Q.z + 0.03, col = i === 0 ? '#e8804a' : '#2a5a6a'; m.quad([cu + ux * 0.7, cv + vx * 0.7, z], [cu - vx * 0.22, cv + ux * 0.22, z], [cu - ux * 0.5, cv - vx * 0.5, z], [cu + vx * 0.22, cv - ux * 0.22, z], col, 0); } }
    if (o.drag && PP.FURN) PP.FURN.build(m, [o.drag], { S: FS, zOf: (it) => Z[roomLv(it.room || 'living')], pinkBed: o.pinkBed, idx: () => -1 });
    return m;
  }
  const DECK = { v1: DK.v1 };
  PP.FORT = { Z, NAME, WH, FS, DECK, CEN, inDeck, ROOMS, RM, OPEN, PASS, ENTRIES, RAMPS, PLOTS, PS, POOL, FISH, BOB, HIVES, MAILB, TAP, LAMPS, SLOTS, BALLOON, NEST, GPOTS, FIX, PK, AREA, WING_ROOTS, build, dyn, roomAt, roomLv, floorAt, inRoom, bbox, C, shade };
})();
