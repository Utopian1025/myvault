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
  // ---------- 甲板：不是方的，是一块歪歪扭扭的多边形，外加几条斜着伸出去的栈桥 ----------
  // POLY 在所有模块都摆好之后由 makeDeck() 根据它们的位置算出来（见下面）
  let POLY = [], JETS = [];
  const DK = { v1: 48 };
  const HT = -5; // 船体顶面（土和石头）的高度：比小院、房子的地面低一截
  const inPoly = (u, v, m = 0) => { let ins = false; const n = POLY.length; for (let i = 0, j = n - 1; i < n; j = i++) { const [a, b] = POLY[i], [c, d] = POLY[j]; if ((b > v) !== (d > v) && u < ((c - a) * (v - b)) / (d - b) + a) ins = !ins; } if (!ins || m <= 0) return ins; for (let i = 0, j = n - 1; i < n; j = i++) { const [a, b] = POLY[j], [c, d] = POLY[i], du = c - a, dv = d - b, L = du * du + dv * dv || 1, t = Math.max(0, Math.min(1, ((u - a) * du + (v - b) * dv) / L)); if (Math.hypot(u - a - du * t, v - b - dv * t) < m) return false; } return true; };
  const jetLocal = (J, u, v) => { const du = u - J.u, dv = v - J.v, c = Math.cos(J.a), s = Math.sin(J.a); return [du * c + dv * s, -du * s + dv * c]; };
  const inJet = (u, v, m = 0) => JETS.some((J) => { const [x, y] = jetLocal(J, u, v), mm = Math.min(m, 0.7); return x >= -3 && x <= J.len - mm && Math.abs(y) <= J.w / 2 - mm; });
  const inDeck = (u, v, m = 0) => inPoly(u, v, m) || inJet(u, v, m);
  const polyR = (th) => { const du = Math.cos(th), dv = Math.sin(th); let best = 0; const n = POLY.length; for (let i = 0; i < n; i++) { const [a, b] = POLY[i], [c, d] = POLY[(i + 1) % n], ex = c - a, ey = d - b, den = du * ey - dv * ex; if (Math.abs(den) < 1e-9) continue; const t = ((a - CEN[0]) * ey - (b - CEN[1]) * ex) / den, s2 = ((a - CEN[0]) * dv - (b - CEN[1]) * du) / den; if (t > 0 && s2 >= -1e-6 && s2 <= 1 + 1e-6) best = Math.max(best, t); } return best; };
  const deckEdge = (n = 120, m = 0, wob = true) => { const pts = []; for (let i = 0; i < n; i++) { const th = (i / n) * Math.PI * 2, w = wob ? Math.sin(i * 0.9) * 0.3 + Math.sin(i * 0.23 + 1) * 0.5 : 0, r = polyR(th) - m + w; pts.push([CEN[0] + Math.cos(th) * r, CEN[1] + Math.sin(th) * r]); } return pts; };

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
    R('living', '起居室', 2, { rot: 14, r: [20.6, 9, 30, 18.5], out: C.CREAM2, in: '#f4e4cc', fl: '#b88a5a', shut: '#4a7a6a' }),
    R('bedroom', '卧室', 3, { rot: -20, r: [21.5, 6.5, 31.5, 15], out: '#e8d0b8', in: '#f4e0e8', fl: '#b88a5a', roof: 'steep', ax: 'u', shut: '#b8503c' }),
    R('dining', '餐厅', 1, { rot: -14, r: [29.9, 15.4, 40.4, 23.2], out: C.BRICK, om: M.stone, in: '#f0d8b8', fl: '#a87a52' }),
    R('shed', '柴房', 1, { rot: 20, r: [1.5, 21, 10.5, 30], out: '#8a5e3c', om: M.plank, in: '#c8a878', im: M.plank, fl: '#7a5a3e' }),
    R('library', '图书室', 2, { rot: -4, r: [1.5, 20.5, 11, 29.5], out: C.CREAM, in: '#d8c8a8', fl: '#8a5e3c', shut: '#5a7ab0' }),
    R('attic', '阁楼仓库', 3, { rot: 24, r: [1, 21.5, 11.5, 29], out: '#c8a078', om: M.plank, in: '#d8c4a0', im: M.plank, fl: '#9a7a58', roof: 'steep', ax: 'v' }),
    R('laundry', '洗衣房', 1, { rot: 6, r: [21, 2, 29.4, 8.6], out: '#d8c8b0', om: M.plank, in: '#e8f0f0', im: M.tile, fl: '#9aa8a8', fm: M.tile, roof: 'steep', ax: 'u', shut: '#5a8a9a' }),
    R('green', '花房', 1, { rot: -12, r: [4, 32, 15, 43], glass: true, out: '#e8f0e8', in: '#e8f0e8', fl: '#9a8a70', fm: M.stone, h: 11, roof: 'glass' }),
  ];
  const RM = {}; ROOMS.forEach((r) => { RM[r.id] = r; if (r.rot) r.rot *= Math.PI / 180; });
  const isRound = (r) => !!r.c;
  // ---------- 斜着插的房间：每间房有自己的“局部坐标” ----------
  // 房间、门洞、家具、陈设都按没转之前的坐标写；画的时候整体绕房间中心转 rot，寻路时把世界坐标转回局部再判断
  const FRM = { garden: 'dining', balcony: 'bedroom' };
  const ctr = (r) => [(r.r[0] + r.r[2]) / 2, (r.r[1] + r.r[3]) / 2];
  const frameOf = (id) => { const r = RM[FRM[id] || id] || MD[FRM[id] || id]; if (r && r.fr) return frameOf(r.fr); return r && r.rot ? r : null; };
  const toW = (fr, u, v) => { if (!fr) return [u, v]; const [cu, cv] = ctr(fr), c = Math.cos(fr.rot), s = Math.sin(fr.rot), du = u - cu, dv = v - cv; return [cu + du * c - dv * s, cv + du * s + dv * c]; };
  const toL = (fr, u, v) => { if (!fr) return [u, v]; const [cu, cv] = ctr(fr), c = Math.cos(fr.rot), s = Math.sin(fr.rot), du = u - cu, dv = v - cv; return [cu + du * c + dv * s, cv - du * s + dv * c]; };
  const inFrame = (m, fr, fn) => { const W = P2().warp; if (fr && W) W(m, [...ctr(fr), 0], fr.rot, 0, 0, fn); else fn(); };
  const rotN = (fr, nu, nv) => (fr ? [nu * Math.cos(fr.rot) - nv * Math.sin(fr.rot), nu * Math.sin(fr.rot) + nv * Math.cos(fr.rot)] : [nu, nv]);
  const wBox = (fr, q) => { if (!fr) return q; const P = [[q[0], q[1]], [q[2], q[1]], [q[2], q[3]], [q[0], q[3]]].map(([u, v]) => toW(fr, u, v)); return [Math.min(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[0])), Math.max(...P.map((p) => p[1]))]; };
  // 局部坐标里的一段墙 / 一块挡路的东西 → 世界坐标里的一串小圆（寻路用）
  const segCircles = (fr, lv, a, b, rad) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / (rad * 1.1))), out = []; for (let i = 0; i <= n; i++) { const p = toW(fr, a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n); out.push(lv == null ? ['c', p[0], p[1], rad] : [lv, 'c', p[0], p[1], rad]); } return out; };
  const rectObs = (fr, lv, q) => { if (!fr) return [lv == null ? q.slice() : [lv, ...q]]; const w = q[2] - q[0], h = q[3] - q[1], rad = Math.min(w, h) / 2; return w >= h ? segCircles(fr, lv, [q[0] + rad, q[1] + rad], [q[2] - rad, q[1] + rad], rad) : segCircles(fr, lv, [q[0] + rad, q[1] + rad], [q[0] + rad, q[3] - rad], rad); };
  const bbox = (r) => (r.c ? [r.c[0] - r.c[2], r.c[1] - r.c[2], r.c[0] + r.c[2], r.c[1] + r.c[2]] : wBox(r.rot ? r : null, r.r));
  const inRoom = (r, u, v, m = 0) => { if (r.c) return Math.hypot(u - r.c[0], v - r.c[1]) <= r.c[2] - m; if (r.rot) [u, v] = toL(r, u, v); return u >= r.r[0] + m && u <= r.r[2] - m && v >= r.r[1] + m && v <= r.r[3] - m; };
  const RAMP = { u0: 8, u1: 16, v0: 5.4, v1: 8, axis: 'u', lo: 8, hi: 16 };
  const RAMPS = [0, 1, 2].map((a) => Object.assign({}, RAMP, { a, b: a + 1 }));
  // ---------- 斜插的小屋：都是真的小房间，从大房间的墙上开个门走进去 ----------
  // 地板跟大房间一样平（所以能走），墙和屋顶往外歪着长、整间再斜着转一点，底下用斜撑托着
  // [大房间, 哪面墙 / 圆房间的角度, 墙上的位置 0~1, 宽（沿墙）, 进深（往外）, 高, 往外歪, 往旁边歪, 额外斜转, 墙色, 顶色, 名字, 用途]
  const HUT_SPEC = [
    ['living', 'v0', 0.5, 4.6, 4, 8, 0.1, -0.05, -0.2, '#e8d0b8', C.SHING, '起居室的小凸窗间', 'sit'],
    ['bedroom', 'u1', 0.55, 5, 4.4, 8.4, 0.12, 0.06, 0.24, '#e8d0b8', C.TILE, '卧室的小书房', 'read'],
    ['attic', 'v1', 0.62, 4.6, 4, 7.6, 0.08, 0.12, 0.26, C.CREAM2, C.TILE, '阁楼的观景窗', 'sit'],
    ['library', 'u1', 0.6, 4.6, 4, 7.4, 0.06, 0.1, -0.24, C.CREAM, C.SHING, '图书室的读书角', 'read'],
    ['dining', 'u1', 0.4, 4.8, 4.2, 8, 0.12, -0.06, 0.22, C.BRICK, C.TILE2, '餐厅的茶水间', 'drink'],
    ['workshop', 4.0, 0, 5, 4.4, 8.4, 0.12, 0.06, 0.22, C.CREAM2, C.TILE, '工作间的零件仓', 'rummage'],
    ['workshop', 5.35, 0, 4.4, 4, 7.4, -0.1, -0.06, -0.2, C.CREAM, C.TILE2, '工作间的小画室', 'read'],
    ['cockpit', 2.95, 0, 4.4, 4.2, 9, 0.08, -0.08, 0.2, '#e8d0b8', C.TILE2, '瞭望小屋', 'sit'],
    ['cockpit', 1.15, 0, 4.2, 4, 7.4, -0.1, 0.08, -0.24, C.CREAM2, C.TILE, '海图室', 'read'],
    ['hall', 3.6, 0, 4.8, 4.2, 8, -0.08, 0.06, 0.22, C.CREAM, C.TILE2, '门厅的雨具间', 'rummage'],
    ['bath', -0.7, 0, 4.4, 4, 7.4, -0.1, 0.1, -0.2, C.CREAM, C.SHING, '浴室的蒸汽间', 'sit'],
    ['store', 0.15, 0, 4.6, 4, 7.6, 0.1, 0.06, 0.22, C.CREAM2, C.SHING, '储藏间的腌菜间', 'rummage'],
  ];
  const HUTS = [], HUT_PASS = [];
  HUT_SPEC.forEach(([pid, side, t, w, d, h, lu, lv2, yx, wc, rc, nm, use], k) => {
    const P = RM[pid]; if (!P) return;
    let Pl, nl, pfr = P.rot ? P : null;
    if (P.c) { nl = [Math.cos(side), Math.sin(side)]; Pl = [P.c[0] + nl[0] * P.c[2], P.c[1] + nl[1] * P.c[2]]; }
    else { const [a, b, c, e] = P.r; ({ v1: () => { Pl = [a + (c - a) * t, e]; nl = [0, 1]; }, v0: () => { Pl = [a + (c - a) * t, b]; nl = [0, -1]; }, u1: () => { Pl = [c, b + (e - b) * t]; nl = [1, 0]; }, u0: () => { Pl = [a, b + (e - b) * t]; nl = [-1, 0]; } })[side](); }
    yx = 0; const off = P.c ? d / 2 - 0.5 : d / 2 - 0.1, cl = [Pl[0] + nl[0] * off, Pl[1] + nl[1] * off], cw = toW(pfr, ...cl);
    const yaw = (P.rot || 0) + Math.atan2(nl[1], nl[0]) + yx, id = 'hut' + k;
    const r = R(id, nm, P.lv, { r: [cw[0] - d / 2, cw[1] - w / 2, cw[0] + d / 2, cw[1] + w / 2], h, out: wc, om: wc === '#8a5e3c' ? M.plank : M.plaster, in: '#f2e6d0', fl: '#b88a5a', roof: 'steep', ax: 'u', hut: true, parent: pid, use, rc });
    r.rot = yaw; ROOMS.push(r); RM[id] = r; HUTS.push(r);
    // 门：小屋这边一段（伸进大房间里），大房间那边一段（在大房间的墙上开口）
    HUT_PASS.push([P.lv, [cw[0] - d / 2 - 1.6, cw[1] - 1.1, cw[0] - d / 2 + 1.1, cw[1] + 1.1], null, id]);
    if (!P.c) { const tu = Math.abs(nl[0]) ? [Pl[0] - 1.1 * Math.abs(nl[0]) + nl[0] * 0, 0] : 0; const q = nl[1] ? [Pl[0] - 1.1, Pl[1] - 1, Pl[0] + 1.1, Pl[1] + 1] : [Pl[0] - 1, Pl[1] - 1.1, Pl[0] + 1, Pl[1] + 1.1]; HUT_PASS.push([P.lv, q, null, pfr ? pid : null]); }
  });
  const MODS = [
    { id: 'courtA', name: '门前小院', lv: 1, r: [9.6, 19, 25.5, 28.4], rot: -4, kind: 'court' },
    { id: 'courtB', name: '门前小院', lv: 1, r: [24, 21, 33.4, 28.8], rot: 5, kind: 'court', tone: 1 },
    { id: 'courtC', name: '楼梯口', lv: 1, r: [31.4, 21.6, 39.4, 29.4], rot: -9, kind: 'court', tone: 2 },
    { id: 'farmA', name: '菜园', lv: 1, r: [16.5, 27.2, 34.5, 35.8], rot: 9, kind: 'farm' },
    { id: 'farmB', name: '菜园', lv: 1, r: [14.5, 35.2, 34.4, 43.4], rot: -7, kind: 'farm' },
    { id: 'gplat', name: '花房', lv: 1, r: [2.8, 30.6, 17.6, 44.4], fr: 'green', kind: 'gplat' },
    { id: 'cistern', name: '蓄水池', lv: 0, r: [33, 30.5, 48, 42.5], rot: -8, kind: 'pool' },
    { id: 'hives', name: '蜂箱台', lv: 2, r: [39.4, 15.2, 46.8, 23], fr: 'garden', kind: 'hive' },
    // 半露天的葡萄架茶座：从工作间出去
    { id: 'pergola', name: '葡萄架茶座', lv: 2, r: [-4.6, 6.6, 4.4, 16.4], rot: -10, kind: 'pergola' },
    // 带雨棚的小阳台：wall 是贴着房子的那一边
    { id: 'landL', name: '楼梯平台', lv: 2, r: [18.8, 19.4, 24.6, 26.4], kind: 'landing' },
    { id: 'balcL', name: '起居室阳台', lv: 2, r: [21.6, 18.3, 27.4, 21.6], fr: 'living', kind: 'balc', wall: 'v0', aw: ['#e06a5a', '#f4ead8'] },
    { id: 'balcB', name: '图书室阳台', lv: 2, r: [-1.9, 22.4, 1.6, 27.6], fr: 'library', kind: 'balc', wall: 'u1', aw: ['#5a8ab8', '#f4ead8'] },
    { id: 'balcA', name: '阁楼小阳台', lv: 3, r: [-2.4, 22.8, 1.1, 27.4], fr: 'attic', kind: 'balc', wall: 'u1', aw: ['#6aa060', '#f4ead8'] },
    { id: 'balcS', name: '浴室晾台', lv: 2, r: [42.6, 4.6, 46.8, 10.4], kind: 'balc', wall: 'u0', aw: ['#e8b040', '#fff4dc'] },
  ];
  const MD = {}; MODS.forEach((q) => { MD[q.id] = q; if (q.rot) q.rot *= Math.PI / 180; });
  const mFrame = (q) => (q.fr ? frameOf(q.fr) : q.rot ? q : null);
  const inMod = (q, u, v, m = 0) => { [u, v] = toL(mFrame(q), u, v); return u >= q.r[0] + m && u <= q.r[2] - m && v >= q.r[1] + m && v <= q.r[3] - m; };
  // 门洞 / 走廊：fr 是它所在的房间（跟着那间房一起转）；两间转法不同的房间之间的门，两边各放一段
  const P = (lv, r, walls, fr) => ({ lv, r, walls: walls || null, fr: fr || null });
  const PASS = [
    P(0, [19.6, 8.6, 31.6, 11.4], 'v'), P(0, [33.2, 13, 36, 32.5], 'u'),
    P(1, [19.6, 10, 21.6, 12.6]), P(1, [28, 11.4, 33.4, 13.6], 'v'), P(1, [27.6, 15.8, 29.4, 18.2]), P(1, [28.6, 15.8, 31, 18.2], null, 'dining'),
    P(1, [22.6, 18.4, 25.4, 19.8]), P(1, [28.6, 4, 31.8, 6.2], null, 'laundry'), P(1, [33, 22.6, 35.8, 24], null, 'dining'), P(1, [16.2, 17.2, 18.8, 19.8]), P(1, [10, 24, 11.4, 26.6], null, 'shed'), P(1, [14.4, 36.5, 15.8, 39.2], null, 'green'),
    P(2, [19, 10.4, 21.4, 13], null, 'living'), P(2, [29.6, 9.2, 33.2, 11.6], 'v', 'living'), P(2, [29.4, 15.2, 30.8, 17.6], null, 'living'), P(2, [5.8, 17, 8.4, 21.2], 'u', 'library'),
    P(2, [23.4, 17.4, 25.4, 19.4], null, 'living'), P(2, [0.4, 24, 2.6, 26], null, 'library'), P(2, [2.6, 10.6, 5.6, 13], null, 'pergola'), P(2, [41.4, 6.4, 43.6, 8.6]),
    P(3, [19.2, 9.2, 22.2, 11.8], 'v', 'bedroom'), P(3, [0, 24.2, 2, 26], null, 'attic'), P(3, [24.4, 14.4, 27, 15.8], null, 'bedroom'), P(3, [5.8, 17.6, 8.4, 22.2], 'u', 'attic'),
  ];
  for (const [lv, q, wl, fr] of HUT_PASS) PASS.push(P(lv, q, wl, fr));
  PASS.forEach((p) => (p.F = p.fr ? frameOf(p.fr) : null));
  // 露天的地方：屋顶花园跟着餐厅转，卧室阳台跟着卧室转
  const OPEN = [[2, 29, 14.5, 40, 23, '屋顶花园', 'garden'], [2, 28.5, 18.5, 30, 23, '屋顶花园', 'garden'], [3, 21.5, 15, 30, 18.5, '卧室阳台', 'balcony']];
  const inOpen = (o, u, v) => { [u, v] = toL(frameOf(o[6]), u, v); return u >= o[1] && u <= o[3] && v >= o[2] && v <= o[4]; };
  const inPass = (p, u, v, m = 0) => { [u, v] = toL(p.F, u, v); return u >= p.r[0] - m && u <= p.r[2] + m && v >= p.r[1] - m && v <= p.r[3] + m; };
  const passAt = (lv, u, v, m = 0) => PASS.some((p) => p.lv === lv && inPass(p, u, v, m));
  const roomAt = (u, v, lv) => ROOMS.find((r) => r.lv === lv && inRoom(r, u, v)) || null;
  const roomLv = (id) => (RM[id] ? RM[id].lv : MD[id] ? MD[id].lv : id === 'garden' ? 2 : id === 'balcony' ? 3 : 1);
  const ENTRIES = PASS.filter((p) => !p.walls).map((p) => { const c = [(p.r[0] + p.r[2]) / 2, (p.r[1] + p.r[3]) / 2], w = p.r[2] - p.r[0] < p.r[3] - p.r[1] ? 'u' : 'v', d = 1.6, a = toW(p.F, ...(w === 'u' ? [c[0] - d, c[1]] : [c[0], c[1] - d])), b = toW(p.F, ...(w === 'u' ? [c[0] + d, c[1]] : [c[0], c[1] + d])), ra = roomAt(a[0], a[1], p.lv), rb = roomAt(b[0], b[1], p.lv); return (ra && rb) || (!ra && !rb) ? null : Object.assign({}, p, { r: wBox(p.F, p.r), loc: p.r, room: ra || rb, inP: ra ? a : b, outP: ra ? b : a }); }).filter(Boolean);

  // ---------- 插在城堡上的小模块（不再有一整片甲板） ----------
  // 每块都是一个小平台，有自己的高度（哪一层）、自己的歪法；fr 表示跟着某间房一起转
  const mW = (id, u, v) => toW(mFrame(MD[id]), u, v);
  // 菜园：3×2 块地，按菜园的局部坐标；站位在每块地前面
  const PS = 4.4;
  // 菜园拆成上下两块，各歪各的：[所在的那块, u, v]
  const PLOTS_L = [['farmA', 18.2, 29.4], ['farmA', 23.75, 29.4], ['farmA', 29.3, 29.4], ['farmB', 18.2, 36.5], ['farmB', 23.75, 36.5], ['farmB', 29.3, 36.5]];
  const PLOTS = PLOTS_L.map(([id, u, v]) => mW(id, u, v));
  const plotStand = (i) => mW(PLOTS_L[i][0], PLOTS_L[i][1] + PS / 2, PLOTS_L[i][2] + PS + 1.1);
  const plotC = (i) => [...mW(PLOTS_L[i][0], PLOTS_L[i][1] + PS / 2, PLOTS_L[i][2] + PS / 2), 2.4];
  // 蓄水池：挂在最底下一层，从地下水泵房的隧道或者小院的楼梯下去
  const POOL_L = { u0: 39.5, v0: 32, u1: 47, v1: 41.6 };
  const POOL = { z: Z[0] + 1.1, lv: 0 };
  const FISH = Object.assign({ lv: 0 }, (([u, v]) => ({ u, v }))(mW('cistern', 38.2, 37))), BOB = (([u, v]) => ({ u, v }))(mW('cistern', 42.6, 37.2));
  // 蜂箱：在屋顶花园外面伸出去的小台子上
  const HIVES_L = [[42.4, 17.6], [45.4, 17.4]];
  const HIVES = HIVES_L.map(([u, v]) => toW(frameOf('garden'), u, v)), HIVE_Z = Z[2];
  const hiveStand = () => toW(frameOf('garden'), HIVES_L[0][0] + 1.6, HIVES_L[0][1] + 2.8);
  const MAILB = (([u, v]) => ({ u, v }))(mW('courtC', 37.4, 26.4)), TAP = (([u, v]) => ({ u, v }))(mW('courtB', 32.4, 22.2));
  const mailStand = () => [MAILB.u - 1.6, MAILB.v + 1.2], tapStand = () => [TAP.u - 1.8, TAP.v + 0.6];
  const LAMPS = [mW('courtA', 10.4, 19.8), mW('courtC', 38.6, 22.4), mW('farmA', 33.8, 34.8), mW('farmB', 15.2, 42.6)];
  const SLOTS = [mW('courtA', 14.4, 27.4), mW('courtA', 21.6, 27.4), mW('courtB', 27.6, 27.7), mW('courtB', 27.6, 23.6), mW('farmA', 17.3, 35), mW('farmB', 33.2, 42.4)];
  // 小院 → 蓄水池的露天楼梯
  const STAIR = { u0: 36.4, u1: 38.6, v0: 29.4, v1: 38, axis: 'v', lo: 29.4, hi: 38, a: 1, b: 0, out: true };
  RAMPS.push(STAIR);
  // 外挂楼梯：从门前小院贴着门厅外墙爬上二层，落在起居室阳台旁边的小平台上
  const STAIR2 = { u0: 11.6, u1: 19.4, v0: 23.6, v1: 25.6, axis: 'u', lo: 11.6, hi: 19.4, a: 1, b: 2, out: true };
  RAMPS.push(STAIR2);
  // 屋顶花园上的东西按花园（餐厅）的局部坐标写，BALLOON / NEST 给外面用的是世界坐标
  const BAL_L = { u: 36.8, v: 17.4 }, NEST_L = { u: 39, v: 21.9 };
  const wPt = (id, q) => { const w = toW(frameOf(id), q.u, q.v); return { u: w[0], v: w[1] }; };
  const BALLOON = wPt('garden', BAL_L), NEST = wPt('garden', NEST_L);
  const GPOTS = [[7.5, 36], [11.5, 36], [7.5, 40.4], [11.5, 40.4]];
  const PK = { balloon: 6, fish: 8, mail: 3, tap: 4, hive: 12, plot: 20, deco: 30, lamp: 10, nest: 13 };
  const FIXED = [...PLOTS_L.flatMap(([id, u, v]) => rectObs(mFrame(MD[id]), 1, [u, v, u + PS, v + PS])), ...HIVES.map(([u, v]) => [2, 'c', u, v, 1.2]), [1, 'c', MAILB.u, MAILB.v, 0.6], [1, 'c', TAP.u, TAP.v, 1.1], ...LAMPS.map(([u, v]) => [1, 'c', u, v, 0.35]), [2, 'c', NEST.u, NEST.v, 1.2], ...rectObs(frameOf('garden'), 2, [BAL_L.u - 2.6, BAL_L.v - 2.6, BAL_L.u + 2.6, BAL_L.v + 2.6])];

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
  fx('laundry', 167, [24.6, 5.4], 'wash', '洗衣盆：搓搓洗洗', 'use', [[22.2, 2.5, 26.4, 4.3]]);
  fx('pergola', 168, [1.2, 13.6], 'sit', '葡萄架下的茶座：坐着喝杯茶', 'sit', [[-1.6, 10.2, 1.4, 12.6]], { spot: { u: 1.6, v: 11.4, dz: 1.6 } });
  GPOTS.forEach(([u, v], i) => fx('green', 160 + i, i < 2 ? [u, v + 2.2] : [9.5, v], 'pot', '花盆', 'water', [[u - 1.2, v - 1.2, u + 1.2, v + 1.2]], { i }));
  HUTS.forEach((r, k) => { const [a, b, c, d] = r.r, cv = (b + d) / 2, use = r.use === 'drink' ? 'drink' : r.use; fx(r.id, 110 + k, [c - 1.9, cv], use, r.nm + (use === 'sit' ? '：坐在窗边' : use === 'read' ? '：看看书' : use === 'drink' ? '：喝口水' : '：翻一翻'), use === 'sit' ? 'rest' : 'use', [[c - 1.3, b + 0.4, c - 0.35, d - 0.4]], use === 'sit' ? { spot: { u: c - 0.8, v: cv, dz: 1.6 } } : undefined); });
  FIX.forEach((f) => { f.lv = roomLv(f.room); const fr = frameOf(f.room); f.F = fr; f.obL = f.ob; if (!fr) return; f.atL = f.at; f.at = toW(fr, ...f.at); f.ob = f.ob.flatMap((b) => rectObs(fr, null, b)); if (f.spot) { const w = toW(fr, f.spot.u, f.spot.v); f.spot = Object.assign({}, f.spot, { u: w[0], v: w[1] }); } });

  // ---------- 寻路 ----------
  const WT = 0.5;
  const RSEG = (r) => Math.max(24, Math.round(r.c[2] * 5));
  const ringGap = (r, i) => { const n = RSEG(r), a = ((i + 0.5) / n) * 6.2832, u = r.c[0] + Math.cos(a) * r.c[2], v = r.c[1] + Math.sin(a) * r.c[2]; return passAt(r.lv, u, v, 0.15); };
  function sideSegs(lv, ax, at, a0, a1, fr) {
    let segs = [[a0, a1]];
    for (const p of PASS) { if (p.lv !== lv || p.F !== (fr || null)) continue; const [u0, v0, u1, v1] = p.r; let g0, g1; if (ax === 'v' && at >= v0 - 0.01 && at <= v1 + 0.01) { g0 = u0; g1 = u1; } else if (ax === 'u' && at >= u0 - 0.01 && at <= u1 + 0.01) { g0 = v0; g1 = v1; } else continue;
      segs = segs.flatMap(([s, e]) => { if (g1 <= s || g0 >= e) return [[s, e]]; const o = []; if (g0 > s) o.push([s, g0]); if (g1 < e) o.push([g1, e]); return o; }); }
    return segs;
  }
  const sideHoles = (lv, ax, at, a0, a1, fr) => { const segs = sideSegs(lv, ax, at, a0, a1, fr), out = []; let cur = a0; for (const [s, e] of segs) { if (s > cur + 0.01) out.push([cur, s]); cur = e; } if (cur < a1 - 0.01) out.push([cur, a1]); return out; };
  function wallObs(lv) {
    const out = [];
    for (const r of ROOMS) {
      if (r.lv !== lv) continue;
      if (isRound(r)) { const n = RSEG(r); for (let i = 0; i < n; i++) { if (ringGap(r, i)) continue; const a = ((i + 0.5) / n) * 6.2832; out.push([lv, 'c', r.c[0] + Math.cos(a) * r.c[2], r.c[1] + Math.sin(a) * r.c[2], 0.32]); } continue; }
      const [u0, v0, u1, v1] = r.r, fr = r.rot ? r : null;
      for (const [ax, at, a0, a1] of [['v', v0, u0, u1], ['v', v1, u0, u1], ['u', u0, v0, v1], ['u', u1, v0, v1]]) for (const [s, e] of sideSegs(lv, ax, at, a0, a1, fr)) {
        if (fr) { if (e - s > 0.05) out.push(...(ax === 'v' ? segCircles(fr, lv, [s, at], [e, at], 0.34) : segCircles(fr, lv, [at, s], [at, e], 0.34))); continue; }
        out.push(ax === 'v' ? [lv, s - WT / 2, at - WT / 2, e + WT / 2, at + WT / 2] : [lv, at - WT / 2, s - WT / 2, at + WT / 2, e + WT / 2]);
      }
    }
    for (const p of PASS) { if (p.lv !== lv || !p.walls) continue; const [u0, v0, u1, v1] = p.r, L = p.walls === 'v' ? [[[u0, v0], [u1, v0]], [[u0, v1], [u1, v1]]] : [[[u0, v0], [u0, v1]], [[u1, v0], [u1, v1]]];
      for (const [a, b] of L) { if (p.F) out.push(...segCircles(p.F, lv, a, b, 0.34)); else out.push([lv, Math.min(a[0], b[0]) - (p.walls === 'u' ? WT / 2 : 0), Math.min(a[1], b[1]) - (p.walls === 'v' ? WT / 2 : 0), Math.max(a[0], b[0]) + (p.walls === 'u' ? WT / 2 : 0), Math.max(a[1], b[1]) + (p.walls === 'v' ? WT / 2 : 0)]); } }
    return out;
  }
  function floorAt(lv, u, v) {
    for (const q of MODS) if (q.lv === lv && inMod(q, u, v, 0.45)) { if (q.kind === 'pool') { const [lu, lv2] = toL(mFrame(q), u, v); if (lu > POOL_L.u0 - 0.7 && lu < POOL_L.u1 + 0.7 && lv2 > POOL_L.v0 - 0.7 && lv2 < POOL_L.v1 + 0.7) continue; } return true; }
    for (const r of ROOMS) if (r.lv === lv && inRoom(r, u, v)) return true;
    for (const o of OPEN) if (o[0] === lv && inOpen(o, u, v)) return true;
    return passAt(lv, u, v);
  }
  // 量一圈：每个方向上最远的东西有多远，甲板就伸到那儿再多一点；顶点之间是直边，所以甲板是一块块折出来的
  function makeDeck() {
    const S = [], add = (u, v, pad = 0) => S.push([u, v, pad]);
    for (const r of ROOMS) { if (r.lv > 1 || r.id === 'green') continue; if (r.c) { for (let i = 0; i < 24; i++) add(r.c[0] + Math.cos(i / 24 * 6.2832) * r.c[2], r.c[1] + Math.sin(i / 24 * 6.2832) * r.c[2], 0.6); continue; } const fr = r.rot ? r : null, [a, b, c, d] = r.r; for (let k = 0; k <= 6; k++) { const t = k / 6; for (const q of [[a + (c - a) * t, b], [a + (c - a) * t, d], [a, b + (d - b) * t], [c, b + (d - b) * t]]) add(...toW(fr, ...q), -2.6); } }
    for (const p of PASS) if (p.lv === 1) { const q = wBox(p.F, p.r); add(q[0], q[1], -1.5); add(q[2], q[3], -1.5); add(q[0], q[3], -1.5); add(q[2], q[1], -1.5); }
    for (const id of ['courtA', 'courtB', 'courtC']) { const q = MD[id], [a, b, c, d] = q.r; for (const [u, v] of [[a, b], [c, b], [a, d], [c, d], [(a + c) / 2, d]]) add(...mW(id, u, v), -2.4); }
    const N = 17, V = [];
    for (let k = 0; k < N; k++) {
      const th = ((k + (H(k, 7) - 0.5) * 0.5) / N) * Math.PI * 2; let need = 12;
      for (const [u, v, pad] of S) { const d = Math.atan2(v - CEN[1], u - CEN[0]) - th, dd = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); if (dd < (Math.PI / N) * 1.6) need = Math.max(need, Math.hypot(u - CEN[0], v - CEN[1]) * Math.cos(Math.min(dd, 1.2)) + pad + 1.2); }
      V.push([th, need + H(k, 3) * 1.6 * (k % 3 === 1 ? 1.6 : 1)]);
    }
    for (let it = 0; it < 40; it++) { POLY = V.map(([th, r]) => [CEN[0] + Math.cos(th) * r, CEN[1] + Math.sin(th) * r]); let ok = true; for (const [u, v, pad] of S) if (pad >= 0 && !inPoly(u, v, Math.max(1.5, pad))) { ok = false; const th = Math.atan2(v - CEN[1], u - CEN[0]); V.forEach((q) => { const d = Math.abs(Math.atan2(Math.sin(q[0] - th), Math.cos(q[0] - th))); if (d < (Math.PI * 2 / N) * 1.05) q[1] += 0.5; }); } if (ok) break; }
    POLY = V.map(([th, r]) => [CEN[0] + Math.cos(th) * r, CEN[1] + Math.sin(th) * r]);
    // 斜着伸出去的栈桥：从甲板边上往外，方向故意歪一点
    JETS = [[-1.25, 0.45, 9, 4], [2.75, 0.35, 7, 3.6]].map(([th, tw, len, w]) => { const r = polyR(th) - 1.5; return { u: CEN[0] + Math.cos(th) * r, v: CEN[1] + Math.sin(th) * r, a: th + tw, len: len + 1.5, w }; });
  }
  makeDeck();
  // 栏杆（局部坐标，跟着花园 / 阳台转）
  const PARA = [[2, 46.8, 15.2, 47.3, 23.3, 'garden'], [2, 40.4, 22.8, 47.3, 23.3, 'garden'], [2, 40.4, 14.8, 47.3, 15.3, 'garden'], [2, 28.5, 23, 40.5, 23.5, 'garden'], [2, 28, 18.5, 28.5, 23.5, 'garden'], [3, 21.5, 18.5, 30.5, 19, 'balcony'], [3, 30, 15, 30.5, 19, 'balcony'], [3, 21, 15, 21.5, 19, 'balcony']];
  const PARA_OB = PARA.flatMap((q) => rectObs(frameOf(q[5]), q[0], q.slice(1, 5)));
  const AREA = { z: Z, inF: floorAt, ramps: RAMPS, obst: (extra) => [...wallObs(0), ...wallObs(1), ...wallObs(2), ...wallObs(3), ...PARA_OB, ...FIXED, ...FIX.flatMap((f) => f.ob.map((b) => [f.lv, ...b])), ...(extra || [])] };

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
      if (o === r || o.lv !== r.lv || isRound(o) || (o.rot || 0) !== (r.rot || 0)) continue; const [u0, v0, u1, v1] = o.r; let s, e;
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
    const fr = r.rot ? r : null, fac = (nu, nv) => facing(cut, ...rotN(fr, nu, nv));
    const z = Z[r.lv], [u0, v0, u1, v1] = r.r, cutHere = cut && cut.lv === r.lv, h = roomH(r);
    m.pk(0);
    m.box(u0 - WT / 2, v0 - WT / 2, z - 1, u1 + WT / 2, v1 + WT / 2, z, r.fl, r.fm, r.fl, r.fm);
    if (!r.glass) for (let u = u0 + 1.6; u < u1 - 0.5; u += 1.6) m.box(u - 0.04, v0, z + 0.01, u + 0.04, v1, z + 0.04, shade(r.fl, 0.85), 0);
    for (const [ax, at, a0, a1, nu, nv] of [['v', v0, u0, u1, 0, -1], ['v', v1, u0, u1, 0, 1], ['u', u0, v0, v1, -1, 0], ['u', u1, v0, v1, 1, 0]]) {
      const sg = ax === 'v' ? nv : nu, ext = exteriorParts(r, ax, at, a0, a1), doors = sideHoles(r.lv, ax, at, a0, a1, fr).map(([s, e]) => [s, e, 0, DOOR_H]);
      const wins = r.glass ? [] : ext.flatMap(([s, e]) => windowsOn(r, ax, at, s, e, doors)), holes = doors.concat(wins);
      const back = !fac(nu, nv), lowZ = z + 2.2, fullZ = z + h;
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
    for (const [ax, at, a0, a1, nu, nv] of sides) { const sg = ax === 'v' ? nv : nu, top = cutHere && facing(cut, ...rotN(p.F, nu, nv)) ? z + 2.2 : z + h, win = p.lv > 0 && top > z + 6 ? [[(a0 + a1) / 2 - 0.6, (a0 + a1) / 2 + 0.6, 4.6, 8.6]] : []; wallPiece(m, ax, at, a0, a1, z, top, sg, cOut, mat, win); wallPiece(m, ax, at, a0, a1, z, top, -sg, cIn, mat, win); for (const hh of win) frame(m, ax, at, hh, z, false, { om: M.plank }); }
    if (!cutHere) {
      if (p.lv > 0) m.gable(u0, v0, u1, v1, z + h, 1.8, p.walls === 'v' ? 'u' : 'v', o.snow ? '#e4ecf4' : C.SHING, o.snow ? M.snow : M.tile, 0.3, C.WOOD2, M.plank);
      else m.box(u0, v0, z + h, u1, v1, z + h + 0.6, C.IRON2, M.metal);
    }
    if (p.lv >= 2) { const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2, dv = p.walls === 'v' ? 0 : 1.8, du = p.walls === 'v' ? 0 : 0; m.quad([mu - 0.15, mv, z - 1], [mu + 0.15, mv, z - 1], [mu + 0.15 + du, mv + dv, z - 6], [mu - 0.15 + du, mv + dv, z - 6], C.TIMBER, M.plank); }
  }

  // ---------- 屋顶 ----------
  // 上面一层压在这间房顶上的东西：同一个转角的按局部坐标精确扣掉；转角不一样的只要碰到，就整片做平顶
  const sameFr = (a, b) => (a || null) === (b || null);
  const coverOf = (r) => { const fr = r.rot ? r : null, bb = bbox(r), hit = (q) => q[2] > bb[0] && q[0] < bb[2] && q[3] > bb[1] && q[1] < bb[3]; let mixed = false; const list = [];
    const add = (F, q) => { if (sameFr(F, fr)) list.push(q); else if (hit(wBox(F, q))) mixed = true; };
    for (const q of ROOMS) if (q.lv === r.lv + 1) { if (q.c) { if (hit(bbox(q))) mixed = true; } else add(q.rot ? q : null, q.r); }
    for (const o of OPEN) if (o[0] === r.lv + 1) add(frameOf(o[6]), o.slice(1, 5));
    for (const p of PASS) if (p.lv === r.lv + 1) add(p.F, p.r);
    return { list, mixed }; };
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
      if (r.glass) { inFrame(m, r.rot ? r : null, () => glassRoof(m, r, o)); continue; }
      const cv = r.lv < 3 ? coverOf(r) : { list: [], mixed: false }, left = cv.mixed ? [r.r] : subtract(r.r, cv.list);
      inFrame(m, r.rot ? r : null, () => leanWrap(m, Z[r.lv], r.lean, () => {
        if (!cv.mixed && r.roof && left.length === 1 && Math.abs(left[0][0] - r.r[0]) < 0.01 && Math.abs(left[0][2] - r.r[2]) < 0.01 && Math.abs(left[0][1] - r.r[1]) < 0.01 && Math.abs(left[0][3] - r.r[3]) < 0.01) { tallRoof(m, r, z, o); return; }
        for (const q of left) flatRoof(m, q, z, o);
      }));
    }
  }
  function tallRoof(m, r, z, o) {
    const [u0, v0, u1, v1] = r.r, ax = r.ax || 'u', span = ax === 'u' ? v1 - v0 : u1 - u0, hh = span * (r.roof === 'steep' ? 1.5 : 0.9), col = o.snow ? '#e4ecf4' : r.lv % 2 ? C.TILE : C.TILE2, warp = P2().warp, tilt = (H(r.lv, u0) < 0.5 ? -1 : 1) * 0.14;
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
    for (let v = -6; v < 54; v += 2.2) { let u0 = null; for (let u = -8; u <= 56; u += 0.5) { const inn = inPoly(u, v, 0.8); if (inn && u0 == null) u0 = u; if ((!inn || u >= 56) && u0 != null) { m.box(u0, v, z + 0.02, u, v + 0.12, z + 0.06, '#3a3240', 0); u0 = null; } } }
    // 船肋：沿 u 一道道拱起的弧形木梁（遇到房间就断开）
    for (let u = -7; u < 56; u += 5) for (let v = -8; v < 56; v += 1) { if (!inPoly(u, v, 1) || busy(u, v, 0.8)) continue; const e = Math.abs(v - 24) / 23, h = 1.2 + e * e * 6; m.box(u - 0.35, v, z, u + 0.35, v + 1, z + h, v % 2 ? '#6a4a30' : '#5a3e28', M.plank); }
    // 纵梁
    for (const v of [14, 34]) for (let u = -8; u < 56; u += 1) if (inPoly(u, v, 1) && !busy(u, v, 0.6)) m.box(u, v - 0.3, z + 2.6, u + 1, v + 0.3, z + 3.2, '#4a3424', M.plank);
    // 浮石核心：整座城堡浮着的原因，冷光从底舱里透出来
    const fu = 24, fv = 30;
    m.cyl(fu, fv, z, z + 0.8, 5, 5.4, '#3a3448', M.metal, 14);
    for (let i = 0; i < 9; i++) { const a = i * 0.7, r = i ? 1.4 + (i % 3) * 1.1 : 0, cu = fu + Math.cos(a) * r, cv = fv + Math.sin(a) * r, h = i ? 3 + (i % 4) * 1.6 : 9; m.cyl(cu, cv, z + 0.8, z + 0.8 + h * 1.2, 1.1 - (i ? 0.3 : 0), 0.05, i % 2 ? '#9fe8ff' : '#c8f4ff', M.glow, 5); }
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; m.box(fu + Math.cos(a) * 4.6 - 0.2, fv + Math.sin(a) * 4.6 - 0.2, z, fu + Math.cos(a) * 4.6 + 0.2, fv + Math.sin(a) * 4.6 + 0.2, z + 6, '#3a3448', M.metal); }
    m.cyl(fu, fv, z + 6, z + 6.4, 4.8, 4.8, C.COP, M.metal, 14, false);
    // 水管：水泵 → 储水池底 → 锅炉（铜管贴着地面走）
    const pipe = (pts, col) => { for (let i = 0; i + 1 < pts.length; i++) { const [a, b] = [pts[i], pts[i + 1]], u0 = Math.min(a[0], b[0]) - 0.3, u1 = Math.max(a[0], b[0]) + 0.3, v0 = Math.min(a[1], b[1]) - 0.3, v1 = Math.max(a[1], b[1]) + 0.3; m.box(u0, v0, z + 1.2, u1, v1, z + 1.8, col, M.metal); } for (const q of pts) m.box(q[0] - 0.45, q[1] - 0.45, z + 1.1, q[0] + 0.45, q[1] + 0.45, z + 1.9, '#3a3448', M.metal); };
    pipe([[36.6, 14.2], [36.6, 30.5]], C.COP);
    pipe([[30, 10.8], [21, 10.8]], '#8a9aa8');
    // 杂物：煤堆、木桶、箱子、挂灯
    m.blob ? m.blob(4.5, 22.5, z, 3, 2.4, '#2a2630', M.stone) : m.ball(4.5, 22.5, z, 3, 2.4, '#2a2630', M.stone, 4, 10);
    [[6, 31, 1], [8.4, 32, 0], [41, 22, 1], [43, 24.4, 0], [42, 32, 1], [15, 42, 0]].forEach(([u, v, k]) => { if (busy(u, v, 1)) return; k ? m.cyl(u, v, z, z + 2.6, 1, 1, '#7a5030', M.plank, 10) : m.box(u - 1.1, v - 1.1, z, u + 1.1, v + 1.1, z + 2.2, '#9a7048', M.plank); });
    [[18, 27], [31, 18], [8, 38], [41, 38]].forEach(([u, v]) => { m.cyl(u, v, z + 9, z + 14, 0.05, 0.05, '#3a3448', 0, 4); m.box(u - 0.35, v - 0.35, z + 8, u + 0.35, v + 0.35, z + 9, '#ffcf7a', M.glow); });
  }
  // 栈桥：木板铺的窄平台，从甲板边上斜着伸出去，下面用斜撑顶着；尽头各放一样东西
  function jetties(m, o) {
    const W = P2().warp;
    JETS.forEach((J, k) => { const draw = () => {
      const u0 = J.u - 3, u1 = J.u + J.len, v0 = J.v - J.w / 2, v1 = J.v + J.w / 2;
      m.box(u0, v0, -0.9, u1, v1, -0.05, '#7a5636', M.plank, o.snow ? '#eef4fa' : '#a8784a', o.snow ? M.snow : M.plank);
      for (let u = u0 + 0.6; u < u1; u += 1.1) m.box(u, v0, -0.05, u + 0.08, v1, 0.0, '#6a4a30', 0);
      for (const v of [v0 + 0.2, v1 - 0.2]) { for (let u = J.u + 0.5; u <= u1 - 0.1; u += 2.2) m.box(u - 0.15, v - 0.15, 0, u + 0.15, v + 0.15, 3.2, C.TIMBER, M.plank); m.box(J.u + 0.3, v - 0.1, 3, u1 - 0.1, v + 0.1, 3.3, C.TIMBER, M.plank); }
      for (const u of [J.u + 1, J.u + J.len * 0.6]) for (const v of [v0 + 0.4, v1 - 0.4]) m.quad([u - 0.15, v, -0.9], [u + 0.15, v, -0.9], [J.u - 2.6, v, -7.5], [J.u - 2.9, v, -7.5], C.TIMBER, M.plank);
      const eu = u1 - 1.6;
      if (k === 0) { m.cyl(eu, J.v, 0, 9, 0.2, 0.15, '#3a3448', M.metal, 6); m.box(eu - 0.1, J.v - 0.1, 8.6, eu + 3.2, J.v + 0.1, 9, '#3a3448', M.metal); m.cyl(eu + 3, J.v, 5.4, 8.6, 0.04, 0.04, '#d8c8a8', 0, 4); m.box(eu + 2.5, J.v - 0.5, 4.4, eu + 3.5, J.v + 0.5, 5.4, '#a8784a', M.plank); }
      else if (k === 1) { m.box(eu - 1, J.v - 0.4, 0, eu + 1, J.v + 0.4, 1.4, C.WOOD2, M.plank); if (W) W(m, [eu, J.v, 2], 0.3, -0.6, 0, () => m.cyl(eu, J.v, 2, 5.6, 0.4, 0.28, C.GOLD, M.metal, 8)); m.cyl(eu, J.v, 0, 2, 0.12, 0.12, '#3a3448', M.metal, 5); }
      else { for (let q = 0; q < 3; q++) m.cyl(eu - (q % 2) * 1.2, J.v - 0.8 + q * 0.8, 0, 2.2, 0.6, 0.62, '#8a5a3a', M.plank, 10); m.box(eu - 2.8, J.v - 0.3, 0, eu - 2.4, J.v + 0.3, 6, C.TIMBER, M.plank); m.box(eu - 3.4, J.v - 0.4, 5.6, eu - 1.8, J.v + 0.4, 6, C.TIMBER, M.plank); m.cyl(eu - 2.6, J.v, 4.2, 5.6, 0.2, 0.55, C.GOLD, M.metal, 8); }
    }; if (W) W(m, [J.u, J.v, 0], J.a, 0, 0, draw); else draw(); });
  }
  // 挂在船体外面、比甲板低一截的小平台：堆着箱子和桶
  const LEDGES = [[-2.1, 6, 3.4, -6.5], [0.95, 5, 3, -5], [-0.55, 4.4, 3, -8], [2.2, 5.5, 3.2, -4.5]];
  function ledges(m, o) {
    const W = P2().warp;
    LEDGES.forEach(([th, len, w, z], k) => { const r = polyR(th) - 0.6, u = CEN[0] + Math.cos(th) * r, v = CEN[1] + Math.sin(th) * r, draw = () => {
      m.box(u, v - w / 2, z - 0.6, u + len, v + w / 2, z, '#7a5636', M.plank, '#9a7452', M.plank);
      for (const vv of [v - w / 2 + 0.15, v + w / 2 - 0.15]) { m.box(u + len - 0.3, vv - 0.12, z, u + len, vv + 0.12, z + 2.4, C.TIMBER, M.plank); m.box(u + 0.4, vv - 0.08, z + 2.2, u + len, vv + 0.08, z + 2.45, C.TIMBER, M.plank); }
      m.quad([u + len - 0.6, v - 0.15, z - 0.6], [u + len - 0.3, v + 0.15, z - 0.6], [u + 0.2, v + 0.15, z - 5], [u, v - 0.15, z - 5], C.TIMBER, M.plank);
      m.box(u + 1, v - 0.8, z, u + 2.4, v + 0.6, z + 1.4, '#a8784a', M.plank); m.box(u + 1.2, v - 0.6, z + 1.4, u + 2.2, v + 0.4, z + 2.4, '#c8935e', M.plank); m.cyl(u + len - 1.2, v + 0.4, z, z + 2, 0.55, 0.58, '#8a5a3a', M.plank, 9);
    }; if (W) W(m, [u, v, z], th, 0, 0, draw); else draw(); });
  }
  function deckAndHull(m, cut, o) {
    const pts = deckEdge(120), n = pts.length, snow = o.snow;
    if (!cut) ledges(m, o);
    // 船体顶面不再是一整片铺好的甲板：压低成一层长着苔藓的土和石头，各个房子、小院都是自己一块块立在上面的
    if (showLv(cut, 1)) {
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; m.tri([CEN[0], CEN[1], HT], [a[0], a[1], HT + Math.min(0, Math.sin(i * 1.7) * 0.8 + Math.sin(i * 0.53) * 1.4 - 1.6) * -1 * 0 + Math.min(0, -(Math.sin(i * 1.7) * 0.8 + Math.sin(i * 0.53) * 1.4) + 1.6) * 0], [b[0], b[1], HT], snow ? '#eef4fa' : '#6a7a4a', snow ? M.snow : M.grass); }
      if (!snow) for (let u = -9; u < 57; u += 3.1) for (let v = -9; v < 57; v += 3.1) { const k = H(u * 1.3, v); if (!inPoly(u, v, 0.8) || k > 0.5 || roomAt(u, v, 1) || MODS.some((q) => q.lv === 1 && inMod(q, u, v, -0.5))) continue; const z = HT; if (k < 0.18) m.blob(u, v, z, 0.7 + k * 2, 0.5 + k, ['#7a7268', '#8e8478', '#6a6460'][Math.floor(k * 30) % 3], M.stone, Math.floor(u * 7 + v), 4, 6); else if (k < 0.34) m.tuft(u, v, z, 1.2 + k * 2, 6, k < 0.26 ? '#5aa64e' : '#78b860', Math.floor(u * 3 + v)); else if (k < 0.42) m.foliage(u, v, z + 0.6, 0.8, 0.7, ['#4c8a40', '#5aa64e', '#6aa858'], 14, Math.floor(u + v * 5), 0.55); else m.box(u - 0.9, v - 0.9, z, u + 0.9, v + 0.9, z + 0.08, '#5a6a3a', M.grass); }
      // 每间一层的房子：底下垫一截石头地基，一直插到土里
      for (const r of ROOMS) { if (r.lv !== 1 || r.c) continue; inFrame(m, r.rot ? r : null, () => { const [a, b, c, d] = r.r; m.box(a + 0.2, b + 0.2, -3.4, c - 0.2, d - 0.2, -1, '#8a7e70', M.stone); for (const [u, v] of [[a + 0.6, b + 0.6], [c - 0.6, b + 0.6], [a + 0.6, d - 0.6], [c - 0.6, d - 0.6]]) m.box(u - 0.3, v - 0.3, HT - 6, u + 0.3, v + 0.3, -3.4, C.TIMBER, M.plank); for (let u = a + 0.6; u < c - 0.4; u += 1.9) for (const vv of [b + 0.18, d - 0.18]) m.box(u, vv - 0.06, HT + 0.4 + (u % 2) * 0.6, u + 1.5, vv + 0.06, HT + 1.6 + (u % 2) * 0.6, '#9e917c', M.stone); }); }
    }
    const ring = (k, z, jag) => pts.map(([u, v], i) => [CEN[0] + (u - CEN[0]) * k, CEN[1] + (v - CEN[1]) * k, z - (jag ? (Math.sin(i * 1.7) * 0.8 + Math.sin(i * 0.53) * 1.4) : 0)]);
    const top = ring(1, HT, true).map((q, i) => [q[0], q[1], Math.min(HT, q[2] + 1.6)]), bot = ring(0.97, -18);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, mu = (pts[i][0] + pts[j][0]) / 2 - CEN[0], mv = (pts[i][1] + pts[j][1]) / 2 - CEN[1], low = cut && cut.lv <= 0 && facing(cut, mu, mv), t0 = low ? -15 : HT;
      const k = Math.floor(i / 5) % 4, iron = k === 2, col = iron ? C.IRON : ['#7a6450', '#6e5a48', '#857060', '#7a6450'][k]; m.quad([top[i][0], top[i][1], low ? t0 : top[i][2]], [top[j][0], top[j][1], low ? t0 : top[j][2]], bot[j], bot[i], col, iron ? M.metal : M.stone);
      if (!low && !snow) m.quad([top[i][0], top[i][1], top[i][2]], [top[j][0], top[j][1], top[j][2]], [top[j][0] * 1.0 + (top[j][0] - CEN[0]) * 0.012, top[j][1] + (top[j][1] - CEN[1]) * 0.012, top[j][2] - 1.4], [top[i][0] + (top[i][0] - CEN[0]) * 0.012, top[i][1] + (top[i][1] - CEN[1]) * 0.012, top[i][2] - 1.4], '#5a8a40', M.grass); }
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
  // ---------- 各个小模块：每块自己一块台子、自己的托架 ----------
  const crateAt = (m, u, v, z, s, col) => { m.box(u - s, v - s, z, u + s, v + s, z + s * 2, col || '#a8784a', M.plank); m.box(u - s - 0.05, v - 0.1, z + 0.2, u + s + 0.05, v + 0.1, z + s * 2 - 0.2, '#7a5030', M.plank); };
  const barrelAt = (m, u, v, z, r) => { m.cyl(u, v, z, z + r * 3.4, r, r * 1.05, '#8a5a3a', M.plank, 10); for (const k of [0.25, 0.75]) m.cyl(u, v, z + r * 3.4 * k - 0.15, z + r * 3.4 * k + 0.15, r * 1.08, r * 1.08, '#3a3448', M.metal, 10, false); };
  // 台子：一块板 / 石面，外沿一圈栏杆或路沿，底下是悬挑的梁和斜撑（朝城堡中心撑回去）
  function slab(m, q, o, top, side, mat, opt = {}) {
    const [a, b, c, d] = q.r, z = Z[q.lv], snow = o.snow;
    m.box(a, b, z - (opt.th || 1.2), c, d, z, side, mat, snow ? '#eef4fa' : top, snow ? M.snow : mat);
    if (opt.planks) for (let u = a + 0.9; u < c; u += 1.3) m.box(u, b, z, u + 0.07, d, z + 0.03, '#6a4a30', 0);
    if (opt.beams) { const [cu, cv] = toL(mFrame(q), CEN[0], CEN[1]), du = cu - (a + c) / 2, dv = cv - (b + d) / 2, L = Math.hypot(du, dv) || 1, nu = du / L, nv = dv / L;
      for (const t of [0.18, 0.5, 0.82]) { const pu = Math.abs(nu) > Math.abs(nv) ? (nu > 0 ? a + 0.4 : c - 0.4) : a + (c - a) * t, pv = Math.abs(nu) > Math.abs(nv) ? b + (d - b) * t : (nv > 0 ? b + 0.4 : d - 0.4), qu = pu + nu * 5.5, qv = pv + nv * 5.5;
        m.quad([pu - 0.18, pv - 0.18, z - 1.2], [pu + 0.18, pv + 0.18, z - 1.2], [qu + 0.18, qv + 0.18, z - 8], [qu - 0.18, qv - 0.18, z - 8], C.TIMBER, M.plank); }
      for (let u = a + 1; u < c; u += 3.2) m.box(u, b, z - 2, u + 0.4, d, z - 1.2, '#5a3e28', M.plank); }
  }
  function fence(m, q, sides, h = 2.6) {
    const [a, b, c, d] = q.r, z = Z[q.lv];
    const run = (p0, p1) => { const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), n = Math.max(1, Math.round(L / 2)); for (let i = 0; i <= n; i++) { const u = p0[0] + (p1[0] - p0[0]) * i / n, v = p0[1] + (p1[1] - p0[1]) * i / n; m.box(u - 0.14, v - 0.14, z, u + 0.14, v + 0.14, z + h, C.TIMBER, M.plank); } m.box(Math.min(p0[0], p1[0]) - 0.08, Math.min(p0[1], p1[1]) - 0.08, z + h - 0.35, Math.max(p0[0], p1[0]) + 0.08, Math.max(p0[1], p1[1]) + 0.08, z + h - 0.1, C.TIMBER, M.plank); };
    for (const sd of sides) { if (sd === 'v1') run([a, d - 0.2], [c, d - 0.2]); if (sd === 'v0') run([a, b + 0.2], [c, b + 0.2]); if (sd === 'u0') run([a + 0.2, b], [a + 0.2, d]); if (sd === 'u1') run([c - 0.2, b], [c - 0.2, d]); }
  }
  function modules(m, cut, o) {
    const snow = o.snow, Pt = P2(), WC = snow ? '#cfe2f0' : '#4aa8d8', WM = snow ? M.snow : M.water;
    for (const q of MODS) { if (!showLv(cut, q.lv)) continue; const z = Z[q.lv];
      inFrame(m, mFrame(q), () => {
        const [a, b, c, d] = q.r;
        if (q.kind === 'court') {
          slab(m, q, o, ['#b8ab98', '#c2b29a', '#a89c8a'][q.tone || 0], ['#8a7e70', '#968a78', '#7e7466'][q.tone || 0], M.stone, { th: 3.2 });
          for (let u = a + 0.3; u < c - 0.3; u += 2) for (const vv of [b - 0.03, d + 0.03]) m.box(u, vv - 0.04, -2.8 + (Math.floor(u) % 2) * 0.9, u + 1.6, vv + 0.04, -1.9 + (Math.floor(u) % 2) * 0.9, '#a89a86', M.stone);
          for (const [u, v] of [[a + 0.7, b + 0.7], [c - 0.7, b + 0.7], [a + 0.7, d - 0.7], [c - 0.7, d - 0.7], [(a + c) / 2, d - 0.7]]) m.box(u - 0.3, v - 0.3, HT - 6, u + 0.3, v + 0.3, -3.2, C.TIMBER, M.plank);
          for (let u = a + 0.2; u < c - 0.2; u += 2.1) for (let v = b + 0.2; v < d - 0.2; v += 2.1) if ((u * 7 + v * 3) % 5 < 2.4) m.box(u, v, z, u + 1.9, v + 1.9, z + 0.06, snow ? '#e8eef4' : ['#c4b8a4', '#ad9f8a', '#bfb29c'][Math.floor(u + v) % 3], M.stone);
          for (let u = a; u < c; u += 1.6) m.box(u, d - 0.5, z, u + 1.4, d, z + 0.6, C.STONE2, M.stone);
        }
        if (q.kind === 'farm') {
          slab(m, q, o, q.id === 'farmA' ? '#a8784a' : '#9a7048', '#7a5636', M.plank, { planks: true, beams: true, th: 1.4 });
          fence(m, q, q.id === 'farmA' ? ['u1'] : ['v1', 'u0']);
          PLOTS_L.forEach(([pid, u, v], i) => {
            if (pid !== q.id) return;
            m.pk(PK.plot + i);
            m.box(u, v, z, u + PS, v + PS, z + 1.6, '#6a4a30', M.plank, '#6a4a34', M.soil);
            m.box(u + 0.4, v + 0.4, z + 1.6, u + PS - 0.4, v + PS - 0.4, z + 1.7, o.farm && o.farm[i] && o.farm[i].wet ? '#4a3424' : '#6a4a34', M.soil);
            for (let k = 0; k < 3; k++) m.box(u + 0.7, v + 0.9 + k * 1.2, z + 1.7, u + PS - 0.7, v + 1.1 + k * 1.2, z + 1.78, '#5a3e2c', M.soil);
            const f = o.farm && o.farm[i]; if (f && Pt.crop) for (let ka = 0; ka < 3; ka++) for (let kb = 0; kb < 3; kb++) Pt.crop(m, f.crop, f.stage, u + 0.9 + ka * 1.3, v + 0.9 + kb * 1.3, z + 1.7, i * 9 + ka * 3 + kb);
            m.pk(0);
            m.box(u + 0.2, v - 0.25, z + 1.6, u + PS - 0.2, v - 0.05, z + 1.85, C.COP, M.metal);
          });
          // 浇地用的铜管：从小院的水龙头那边接过来，地里用剩的水从右下角漏到下面的蓄水池
          m.box(a + 0.6, b + 0.6, z, c - 0.6, b + 1, z + 0.4, C.COP, M.metal);
          m.cyl(c - 0.8, d - 0.8, z - 18, z + 0.4, 0.3, 0.3, C.COP, M.metal, 6);
          crateAt(m, a + 1, d - 1.2, z, 0.7); barrelAt(m, c - 2.2, b + 2.2, z, 0.6);
        }
        if (q.kind === 'gplat') { slab(m, q, o, '#9a7452', '#6a4a30', M.plank, { planks: true, beams: true, th: 1.2 }); fence(m, q, ['v1', 'u0'], 2.2); m.pot(c - 1.4, d - 1.4, z, 0.6, '#c8705a', snow ? null : '#5aa64e', 3); }
        if (q.kind === 'pergola') {
          slab(m, q, o, '#b89a78', '#7a5636', M.plank, { planks: true, beams: true, th: 1 });
          // 葡萄架：四根柱子、横梁、斜着搭的木条，藤从柱子爬上去
          const P4 = [[a + 0.6, b + 0.6], [c - 0.6, b + 0.6], [a + 0.6, d - 0.6], [c - 0.6, d - 0.6]];
          for (const [u, v] of P4) { m.box(u - 0.22, v - 0.22, z, u + 0.22, v + 0.22, z + 8, C.TIMBER, M.plank); if (!snow) m.foliage(u, v, z + 3.6, 0.8, 3.6, ['#4c8a40', '#6aa858'], 22, u * 7 + v, 0.5); }
          for (const v of [b + 0.6, d - 0.6]) m.box(a + 0.2, v - 0.18, z + 8, c - 0.2, v + 0.18, z + 8.5, C.TIMBER, M.plank);
          for (let u = a + 1; u < c - 0.5; u += 1.1) m.box(u, b + 0.2, z + 8.5, u + 0.2, d - 0.2, z + 8.8, '#8a6040', M.plank);
          if (!snow) for (let k = 0; k < 9; k++) { const u = a + 1 + H(k, 31) * (c - a - 2), v = b + 1 + H(k, 37) * (d - b - 2); m.foliage(u, v, z + 8.9, 1.3, 0.7, ['#5a9a48', '#78b860', '#4c8a40'], 16, k + 3, 0.55); if (k % 3 === 0) for (let g = 0; g < 4; g++) m.ball(u + (g % 2) * 0.3, v + (g >> 1) * 0.3, z + 7.6 - g * 0.3, 0.22, 0.22, '#7a4a9a', 0, 3, 5); }
          m.cyl(0, 11.4, z, z + 2.6, 0.3, 0.3, C.TIMBER, M.plank, 6); m.cyl(0, 11.4, z + 2.6, z + 2.9, 1.3, 1.3, '#a8784a', M.plank, 12);
          m.cyl(-0.3, 11.2, z + 2.9, z + 3.4, 0.28, 0.24, '#f4ead8', 0, 8); m.cyl(0.4, 11.7, z + 2.9, z + 3.3, 0.28, 0.24, '#f4ead8', 0, 8);
          for (const [u, v] of [[1.6, 11.4], [-1.6, 11.4]]) { m.box(u - 0.5, v - 0.5, z, u + 0.5, v + 0.5, z + 1.5, '#8a5a3a', M.plank); }
          fence(m, q, ['u0', 'v0', 'v1'], 2.2);
          for (const [u, v, col] of [[a + 1.4, d - 1.3, '#c8705a'], [a + 1.3, b + 1.6, '#5a7ab0'], [c - 1.6, d - 1.4, '#c8705a']]) m.pot(u, v, z, 0.6, col, snow ? null : '#5aa64e', u * 3);
        }
        if (q.kind === 'landing') { slab(m, q, o, '#a8784a', '#7a5636', M.plank, { planks: true, th: 0.8 }); fence(m, q, ['v1', 'u1'], 2.4); for (const [u, v] of [[a + 0.4, d - 0.4], [c - 0.4, d - 0.4], [c - 0.4, b + 0.4]]) m.box(u - 0.25, v - 0.25, Z[1], u + 0.25, v + 0.25, z - 0.8, C.TIMBER, M.plank); if (!snow) m.pot(c - 1.2, d - 1.2, z, 0.55, '#c8705a', '#5aa64e', 7); }
        if (q.kind === 'balc') {
          slab(m, q, o, '#a8784a', '#7a5636', M.plank, { planks: true, beams: true, th: 0.8 });
          const W = q.wall, sides = ['u0', 'u1', 'v0', 'v1'].filter((x) => x !== W); fence(m, q, sides, 2.4);
          // 雨棚：从墙上斜下来的条纹布，外沿两根细柱
          const zt = z + 8.6, zl = z + 6.4, n = 7, cols = q.aw;
          for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, col = snow ? '#eef4fa' : cols[i % 2];
            if (W === 'v0') m.quad([a + (c - a) * t0, b, zt], [a + (c - a) * t1, b, zt], [a + (c - a) * t1, d + 0.4, zl], [a + (c - a) * t0, d + 0.4, zl], col, M.cloth);
            else if (W === 'u1') m.quad([c, b + (d - b) * t0, zt], [c, b + (d - b) * t1, zt], [a - 0.4, b + (d - b) * t1, zl], [a - 0.4, b + (d - b) * t0, zl], col, M.cloth);
            else m.quad([a, b + (d - b) * t0, zt], [a, b + (d - b) * t1, zt], [c + 0.4, b + (d - b) * t1, zl], [c + 0.4, b + (d - b) * t0, zl], col, M.cloth); }
          const out = W === 'v0' ? [[a + 0.2, d - 0.2], [c - 0.2, d - 0.2]] : W === 'u1' ? [[a + 0.2, b + 0.2], [a + 0.2, d - 0.2]] : [[c - 0.2, b + 0.2], [c - 0.2, d - 0.2]];
          for (const [u, v] of out) m.box(u - 0.1, v - 0.1, z, u + 0.1, v + 0.1, zl, C.TIMBER, M.plank);
          // 花箱、吊盆、一把小椅子
          const [ou, ov] = out[0], [pu, pv] = out[1]; m.box(Math.min(ou, pu) - 0.1, Math.min(ov, pv) - 0.1, z + 2.4, Math.max(ou, pu) + 0.1, Math.max(ov, pv) + 0.1, z + 3.2, '#8a5a3a', M.plank);
          if (!snow) for (let k = 0; k < 6; k++) { const t = (k + 0.5) / 6, u = ou + (pu - ou) * t, v = ov + (pv - ov) * t; m.flower(u, v, z + 3.2, 1 + (k % 2) * 0.4, ['#f2a6c2', '#ffd95a', '#ffffff', '#e06a5a'][k % 4], k); }
          for (const [u, v] of out) { m.cyl(u, v, zl - 2.4, zl, 0.03, 0.03, '#3a3448', 0, 3); m.cyl(u, v, zl - 3.4, zl - 2.4, 0.5, 0.35, '#c8705a', 0, 8); if (!snow) m.foliage(u, v, zl - 3.8, 0.7, 1.4, ['#4c8a40', '#6aa858'], 14, u + v, 0.5); }
          const mu = (a + c) / 2, mv = (b + d) / 2; m.box(mu - 0.6, mv - 0.6, z, mu + 0.6, mv + 0.6, z + 1.4, '#c8935e', M.plank);
          if (q.id === 'balcS') for (let k = 0; k < 4; k++) { m.cyl(c - 0.4, b + 0.6 + k * 1.4, z + 4.6, z + 4.6, 0.02, 0.02, '#fff', 0, 3); m.box(c - 0.9, b + 0.4 + k * 1.4, z + 2.6, c - 0.2, b + 1.1 + k * 1.4, z + 4.5, ['#fff4dc', '#9fd4f2', '#f2a6c2', '#ffffff'][k], M.cloth); }
        }
        if (q.kind === 'hive') {
          slab(m, q, o, '#a8784a', '#7a5636', M.plank, { planks: true, beams: true, th: 1 });
          HIVES_L.forEach(([u, v]) => { m.pk(PK.hive); m.box(u - 0.15, v - 0.15, z, u + 0.15, v + 0.15, z + 1.2, C.TIMBER, M.plank); for (let k = 0; k < 3; k++) m.box(u - 1, v - 0.9, z + 1.2 + k * 1.5, u + 1, v + 0.9, z + 2.6 + k * 1.5, k % 2 ? '#f4ead8' : '#e8dcc4', M.plank); m.gable(u - 1.2, v - 1.1, u + 1.2, v + 1.1, z + 5.7, 1, 'u', snow ? '#e4ecf4' : C.TILE2, snow ? M.snow : M.tile, 0.2); m.box(u - 0.3, v + 0.88, z + 1.5, u + 0.3, v + 0.95, z + 1.75, '#3a2630', 0); m.pk(0); });
          if (!snow) for (let k = 0; k < 9; k++) m.flower(a + 1 + (k % 5) * 1.3, d - 1 - Math.floor(k / 5) * 1.1, z, 1.4 + (k % 3) * 0.4, ['#f2a6c2', '#ffd95a', '#c8a0f0', '#ffffff'][k % 4], k);
        }
        if (q.kind === 'pool') {
          // 蓄水池：铆接铁皮的大槽子吊在城堡底下，铁链和斜撑往上拉
          const P = POOL_L, zz = z, Q = POOL.z;
          m.box(a, b, zz - 3, c, d, zz, '#4a5866', M.metal, snow ? '#eef4fa' : '#8a8e96', snow ? M.snow : M.stone);
          for (let u = a + 0.4; u < c; u += 2.2) for (const v of [b, d]) m.box(u, v - 0.06, zz - 2.8, u + 0.3, v + 0.06, zz - 0.2, '#3a3448', M.metal);
          m.box(P.u0, P.v0, zz - 0.4, P.u1, P.v1, Q - 0.6, '#2e5a6a', M.stone);
          m.pk(PK.fish); m.box(P.u0, P.v0, Q - 0.6, P.u1, P.v1, Q, WC, WM); m.pk(0);
          for (const [e0, e1, e2, e3] of [[P.u0 - 0.7, P.v0 - 0.7, P.u1 + 0.7, P.v0], [P.u0 - 0.7, P.v1, P.u1 + 0.7, P.v1 + 0.7], [P.u0 - 0.7, P.v0, P.u0, P.v1], [P.u1, P.v0, P.u1 + 0.7, P.v1]]) m.box(e0, e1, zz, e2, e3, Q + 0.7, C.STONE, M.stone, snow ? '#eef4fa' : '#c8bca8', snow ? M.snow : M.stone);
          if (!snow) for (let k = 0; k < 4; k++) { const u = P.u0 + 1.6 + k * 1.8, v = P.v0 + 1.6 + (k % 2) * 5.6; m.cyl(u, v, Q + 0.02, Q + 0.06, 0.8, 0.8, '#5aa64e', 0, 10); if (k % 2) m.ball(u + 0.3, v, Q + 0.6, 0.35, 0.6, '#f2a6c2', 0, 4, 6); }
          // 满了就从外沿流下去
          const wu = (P.u0 + P.u1) / 2; m.box(wu - 1, P.v1 + 0.7, Q - 0.1, wu + 1, d + 0.4, Q + 0.05, WC, WM); m.box(wu - 1, d + 0.1, Q - 6, wu + 1, d + 0.5, Q, WC, WM); m.box(wu - 0.7, d + 0.15, Q - 9, wu + 0.7, d + 0.45, Q - 6, WC, WM); if (!snow) for (let k = 0; k < 7; k++) m.ball(wu + (H(k, 3) - 0.5) * 2.4, d + 0.3 + H(k, 5) * 0.4, Q - 9 - H(k, 7) * 1.6, 0.35 + H(k, 9) * 0.3, 0.3, '#e8f4fa', 0, 3, 6); // 落一小段就散成水雾，不再一直挂到底
          for (const [u, v] of [[a + 0.5, b + 0.5], [c - 0.5, b + 0.5], [a + 0.5, d - 0.5], [c - 0.5, d - 0.5]]) { m.cyl(u, v, zz, Z[1] - 1, 0.07, 0.07, '#3a3448', M.metal, 4); }
          for (const [u, v] of [[a + 2, b + 0.4], [c - 2, b + 0.4]]) m.quad([u - 0.2, v, zz - 2.8], [u + 0.2, v, zz - 2.8], [u + 0.2, v - 6, Z[1] - 3], [u - 0.2, v - 6, Z[1] - 3], '#3a3448', M.metal);
          fence(m, q, ['v1', 'u1'], 2.4);
          barrelAt(m, a + 1.2, d - 1.2, zz, 0.7); crateAt(m, a + 1.2, b + 1.4, zz, 0.7);
          // 水泵抽水的管子
          m.cyl(a + 2.4, b + 1, zz, zz + 6, 0.35, 0.35, C.COP, M.metal, 6);
        }
      });
    }
    // 小院上的东西（世界坐标）
    if (showLv(cut, 1)) {
      m.pk(PK.tap); m.cyl(TAP.u, TAP.v, 0, 3.6, 0.35, 0.3, C.COP2, M.metal, 8); m.box(TAP.u - 0.15, TAP.v - 0.8, 3.2, TAP.u + 0.15, TAP.v, 3.5, C.COP, M.metal); m.cyl(TAP.u, TAP.v - 1, 0, 1, 0.9, 1, '#8a5a3a', M.plank, 10); m.pk(0);
      m.pk(PK.mail); m.box(MAILB.u - 0.14, MAILB.v - 0.14, 0, MAILB.u + 0.14, MAILB.v + 0.14, 5, C.TIMBER, M.plank); m.box(MAILB.u - 0.9, MAILB.v - 0.55, 5, MAILB.u + 0.9, MAILB.v + 0.55, 6.9, '#e0604a', 0); m.box(MAILB.u + 0.9, MAILB.v - 0.1, 6, MAILB.u + 1, MAILB.v + 0.1, 7.6, C.GOLD, M.metal); m.pk(0);
      LAMPS.forEach(([u, v], i) => { m.pk(PK.lamp + i); m.cyl(u, v, 0, 9.5, 0.17, 0.12, '#3a3448', M.metal, 5); m.box(u - 0.42, v - 0.42, 9.5, u + 0.42, v + 0.42, 11.8, '#ffe9a8', M.glow); m.cyl(u, v, 11.8, 13, 0.66, 0.05, '#3a3448', 0, 4); m.pk(0); });
      if (Pt.deco) (o.deco || []).forEach((id, i) => { if (id && SLOTS[i]) Pt.deco(m, id, SLOTS[i][0], SLOTS[i][1], 0, PK.deco + i); });
      crateAt(m, 19.4, 20.4, 0, 0.8); crateAt(m, 19.6, 20.4, 1.6, 0.6, '#b88a5a'); barrelAt(m, 27.4, 22, 0, 0.7); barrelAt(m, 28.6, 22.4, 0, 0.6);
    }
    // 露天楼梯：一段一段，带扶手和立柱
    for (const S of RAMPS) { if (!S.out || !(showLv(cut, S.a) && showLv(cut, S.b))) continue; const za = Z[S.a], zb = Z[S.b], ax = S.axis, [b0, b1] = ax === 'u' ? [S.v0, S.v1] : [S.u0, S.u1];
      m.stairs(S.lo, S.hi, b0, b1, za, zb, ax, '#8a7a6a', 14, true);
      const P3 = (a, b, z) => (ax === 'u' ? [a, b, z] : [b, a, z]);
      for (const b of [b0 - 0.1, b1 + 0.1]) m.quad(P3(S.lo, b, za + 2.6), P3(S.hi, b, zb + 2.6), P3(S.hi, b, zb + 2.3), P3(S.lo, b, za + 2.3), C.TIMBER, M.plank);
      for (let k = 0; k <= 4; k++) { const a = S.lo + (S.hi - S.lo) * k / 4, zz = za + (zb - za) * k / 4; for (const b of [b0 - 0.1, b1 + 0.1]) { const [u, v] = ax === 'u' ? [a, b] : [b, a]; m.box(u - 0.1, v - 0.1, Math.min(za, zb) - 1 + (k ? 0 : 1), u + 0.1, v + 0.1, zz + 2.6, C.TIMBER, M.plank); } } }
    if (showLv(cut, 1)) {
    }
  }
  // ---------- 屋里 ----------
  function interiors(m, cut, o) {
    const show = (id) => showLv(cut, roomLv(id)), z = (id) => Z[roomLv(id)], Pt = P2();
    if (show('hall')) inFrame(m, frameOf('hall'), () => { const Zh = z('hall'); m.pk(140); m.box(9.6, 16.6, Zh, 13.6, 18.6, Zh + 2.6, C.WOOD2, M.plank); m.pk(0); m.cyl(5.2, 13.6, Zh, Zh + 10, 0.25, 0.2, C.TIMBER, M.plank, 6); m.box(4.6, 13, Zh + 6, 5.8, 14.2, Zh + 8.6, '#c86a5a', M.cloth); m.cyl(12, 13, Zh + 0.02, Zh + 0.12, 3.6, 3.6, '#a8484a', M.cloth, 18); m.cyl(12, 13, Zh + 0.12, Zh + 0.16, 2.6, 2.6, '#e8c070', M.cloth, 16); m.cyl(12, 12, Zh + 11, Zh + 14, 0.05, 0.05, '#3a3448', 0, 4); m.cyl(12, 12, Zh + 9.6, Zh + 11, 1.2, 0.3, '#ffe9a8', M.glow, 8); });
    if (show('kitchen')) inFrame(m, frameOf('kitchen'), () => { const Zk = z('kitchen'); m.pk(141); m.box(21, 9.4, Zk, 25, 11.8, Zk + 5, '#4a4450', M.metal, '#2e2a30'); for (const u of [22.2, 24]) m.cyl(u, 10.6, Zk + 5, Zk + 6.4, 0.8, 0.9, '#5a5a66', M.metal, 10); m.cyl(24.4, 9.8, Zk + 5, Zk + WH, 0.5, 0.5, C.COP2, M.metal, 8); m.pk(142); m.box(25, 9.4, Zk, 28.2, 11.8, Zk + 4.8, C.WOOD, M.plank, '#e8e0d0'); m.box(25.6, 9.8, Zk + 4.5, 27.6, 11.2, Zk + 4.85, '#9fc8e0', M.water); m.cyl(26.6, 9.6, Zk + 4.8, Zk + 6.8, 0.14, 0.12, C.COP, M.metal, 5); m.pk(0);
      m.box(25, 9.3, Zk + 8.4, 28.2, 10.6, Zk + 11.6, C.WOOD2, M.plank); for (let k = 0; k < 4; k++) m.box(21.2 + k * 1, 9.35, Zk + 8.4 + (k % 2), 21.5 + k * 1, 9.5, Zk + 10.6, ['#c0c0c8', C.COP, '#c0c0c8', C.GOLD][k], M.metal);
      m.box(22.4, 14.4, Zk + 4.4, 27, 17.4, Zk + 5, C.WOOD, M.plank); for (const [u, v] of [[22.8, 14.8], [26.6, 14.8], [22.8, 17], [26.6, 17]]) m.box(u - 0.18, v - 0.18, Zk, u + 0.18, v + 0.18, Zk + 4.4, C.TIMBER, M.plank); m.ball(23.8, 15.8, Zk + 5.6, 0.7, 1.1, '#e8705a', 0, 4, 8); m.ball(25.6, 15.6, Zk + 5.5, 0.5, 0.9, '#ffd36a', 0, 4, 8); });
    if (show('dining')) inFrame(m, frameOf('dining'), () => { const Zd = z('dining'); m.pk(143); m.box(32, 16.6, Zd + 4.6, 38, 19.6, Zd + 5.3, '#a8784a', M.plank, '#f4ead8', M.cloth); m.pk(0); for (const [u, v] of [[32.4, 17], [37.6, 17], [32.4, 19.2], [37.6, 19.2]]) m.box(u - 0.18, v - 0.18, Zd, u + 0.18, v + 0.18, Zd + 4.6, C.TIMBER, M.plank); for (const u of [33.4, 35, 36.6]) for (const [v, s] of [[15.8, -1], [20.4, 1]]) { m.box(u - 0.6, v - 0.6, Zd + 2.8, u + 0.6, v + 0.6, Zd + 3.2, C.WOOD2, M.plank); m.box(u - 0.6, s > 0 ? v + 0.4 : v - 0.6, Zd + 3.2, u + 0.6, s > 0 ? v + 0.6 : v - 0.4, Zd + 6.4, C.WOOD2, M.plank); }
      m.cyl(35, 18.1, Zd + 9.6, Zd + 14, 0.05, 0.05, '#3a3448', 0, 4); m.cyl(35, 18.1, Zd + 8.6, Zd + 9.8, 1.2, 0.3, '#ffe9a8', M.glow, 8); m.box(38.4, 21, Zd, 39.6, 22.6, Zd + 9, '#8a5a3a', M.plank); });
    if (show('shed')) inFrame(m, frameOf('shed'), () => { const Zs = z('shed'); m.pk(155); for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) for (let q = 0; q < 3; q++) m.cyl(2.6 + q * 1.1, 22.2 + k * 2.6, Zs + 0.8 + j * 1.5, Zs + 0.8 + j * 1.5, 0.75, 0.75, j % 2 ? '#8a5a3a' : '#a8784a', M.plank, 7); m.pk(0); m.box(7.6, 28, Zs, 9.6, 29.6, Zs + 2.4, C.WOOD2, M.plank); m.box(9, 22, Zs + 2, 9.2, 22.2, Zs + 6, C.TIMBER, M.plank); m.box(8.6, 21.8, Zs + 5.4, 9.6, 22.4, Zs + 6.4, '#c0c0c8', M.metal); });
    if (show('green')) inFrame(m, frameOf('green'), () => { const Zg = z('green'); m.pk(157); for (let k = 0; k < 3; k++) m.box(5, 32.4, Zg + 1.6 + k * 2.4, 14, 33.2, Zg + 2 + k * 2.4, C.WOOD2, M.plank); for (let k = 0; k < 9; k++) m.pot(5.6 + (k % 6) * 1.6, 32.8, Zg + 2 + Math.floor(k / 6) * 2.4 + (k >= 6 ? 2.4 : 0), 0.3, '#c8705a', o.snow ? '#6a8a70' : ['#5aa64e', '#86cc6a', '#f2a6c2'][k % 3], k); m.pk(156); m.cyl(14, 42.1, Zg, Zg + 3, 0.7, 0.8, '#8a5a3a', M.plank, 10); m.pk(165); m.cyl(4.7, 42.3, Zg, Zg + 5, 0.25, 0.25, C.COP, M.metal, 6); m.disc(4.7, 42, Zg + 4, 0.6, 'v', '#c03a2a', M.metal, 8); m.pk(0); for (const v of [32.5, 42.6]) m.box(4.6, v - 0.15, Zg + 0.8, 14.4, v + 0.15, Zg + 1.3, C.COP, M.metal);
      GPOTS.forEach(([pu, pv], i) => { const pt = (o.pots || [])[i]; m.pk(160 + i); m.cyl(pu, pv, Zg, Zg + 1.8, 0.9, 1.1, i % 2 ? '#c8705a' : '#b8604a', 0, 12); m.cyl(pu, pv, Zg + 1.8, Zg + 2.1, 1.15, 1.15, '#a8503a', 0, 12); m.cyl(pu, pv, Zg + 2, Zg + 2.05, 1, 1, pt && pt.wet ? '#3a2a20' : '#5a4030', M.soil, 12); if (pt && PP.LIFE && PP.LIFE.PL[pt.id] && Pt.lifePlant) Pt.lifePlant(m, PP.LIFE.PL[pt.id], pt.stage, pu, pv, Zg + 2.05, i * 3 + 1, 1.4); m.pk(0); }); });
    if (show('library')) inFrame(m, frameOf('library'), () => { const Zl = z('library'); m.pk(145); m.box(1.9, 27.4, Zl, 10.6, 29.2, Zl + 12, '#7a5030', M.plank); for (let s = 0; s < 4; s++) { m.box(1.9, 27.3, Zl + 1 + s * 2.8, 10.6, 27.45, Zl + 1.3 + s * 2.8, '#a8784a', M.plank); for (let j = 0; j < 11; j++) m.box(2.3 + j * 0.75, 27.45, Zl + 1.3 + s * 2.8, 2.85 + j * 0.75, 28.1, Zl + 3.4 + s * 2.8 - (j % 3) * 0.3, ['#c85a4a', '#5a8ad8', '#e8c860', '#7fc8a8', '#c8a0f0', '#8a5e3c'][(j + s) % 6], 0); } m.pk(146); m.box(2, 21, Zl, 5.2, 24.4, Zl + 3.2, '#5a7a4a', M.cloth); m.box(2, 21, Zl + 3.2, 2.6, 24.4, Zl + 7.4, '#4a6a3a', M.cloth); m.pk(0); m.cyl(9.4, 22.4, Zl, Zl + 3.6, 0.25, 0.25, C.TIMBER, M.plank, 6); m.ball(9.4, 22.4, Zl + 4.8, 0.9, 1.7, '#5a9ad8', 0, 6, 10); });
    if (show('bath')) inFrame(m, frameOf('bath'), () => { const Zb = z('bath'); m.pk(144); m.cyl(37, 6.1, Zb, Zb + 4, 3, 3, '#e8e4dc', 0, 18); m.cyl(37, 6.1, Zb + 3.4, Zb + 3.9, 2.6, 2.6, '#9fd4f2', M.water, 18); m.cyl(37, 6.1, Zb + 4, Zb + 4.4, 3.1, 3.1, C.COP, M.metal, 18, false); m.pk(0); m.cyl(39.6, 4, Zb + 4, Zb + 8, 0.2, 0.2, C.COP, M.metal, 6); m.box(41.2, 8, Zb, 42.4, 10.4, Zb + 5.4, '#f4f0e8', 0); m.box(32.4, 9.4, Zb + 6, 32.6, 11.4, Zb + 8.6, '#f2a6c2', M.cloth); });
    if (show('workshop')) inFrame(m, frameOf('workshop'), () => { const Zw = z('workshop'); m.pk(147); m.box(8, 17, Zw + 4.4, 16, 19, Zw + 5.2, C.WOOD, M.plank); for (const u of [8.4, 15.6]) m.box(u - 0.2, 17.2, Zw, u + 0.2, 18.8, Zw + 4.4, C.TIMBER, M.plank); m.pk(0); m.box(10, 17.6, Zw + 5.2, 12.4, 18.6, Zw + 7.2, '#c8935e', M.plank); m.gable(10, 17.6, 12.4, 18.6, Zw + 7.2, 1, 'u', C.TILE, M.tile, 0.2); for (let k = 0; k < 5; k++) m.box(4.4 + k * 0.3, 9.4, Zw, 4.6 + k * 0.3, 10, Zw + 9, ['#a8784a', '#c8935e', '#8a5a3a'][k % 3], M.plank); m.box(14, 17.8, Zw + 5.2, 15.6, 18, Zw + 6, '#c0c0c8', M.metal); });
    if (show('store')) inFrame(m, frameOf('store'), () => { const Zt = z('store'); m.pk(148); m.box(33, 2.4, Zt, 41, 5, Zt + 9.6, '#8a5a3a', M.plank); for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { m.box(33.4 + i * 1.25, 5, Zt + 1 + j * 2.1, 34.4 + i * 1.25, 5.1, Zt + 2.7 + j * 2.1, '#b88a5a', M.plank); m.box(33.8 + i * 1.25, 5.1, Zt + 1.7 + j * 2.1, 34 + i * 1.25, 5.2, Zt + 1.9 + j * 2.1, C.GOLD, M.metal); } m.pk(0); for (let k = 0; k < 3; k++) m.ball(32.4 + k * 1.6, 9.6, Zt + 1.3, 0.8, 1.6, '#d8c098', M.cloth, 4, 8); });
    if (show('attic')) inFrame(m, frameOf('attic'), () => { const Za = z('attic'); m.pk(149); m.box(1.6, 22, Za, 5, 25.4, Za + 2.6, '#7a5030', M.plank); m.box(2, 22.4, Za + 2.6, 4.6, 25, Za + 4.2, '#a8784a', M.plank); m.pk(0); for (let k = 0; k < 3; k++) m.ball(9 + (k % 2), 27 - k * 1.4, Za + 1.3, 0.8, 1.6, '#d8c098', M.cloth, 4, 8); m.box(6, 28.2, Za, 10.6, 28.8, Za + 6, '#8a5a3a', M.plank); });
    if (show('cockpit')) inFrame(m, frameOf('cockpit'), () => { const Zc = z('cockpit'); m.pk(151); m.box(10.4, 16, Zc, 13.6, 18, Zc + 4.6, '#5a5466', M.metal); m.pk(0); if (Pt.wheel) Pt.wheel(m, 12, 15.8, Zc + 6.8, 1.3, 0); for (let k = 0; k < 3; k++) m.disc(10.8 + k * 1.2, 15.98, Zc + 3.6, 0.38, 'v', ['#ffe9a8', '#9fe8ff', '#ffb0a0'][k], M.glow, 8); m.cyl(12, 12, Zc + 0.02, Zc + 0.12, 4.6, 4.6, '#8a3a3a', M.cloth, 18);
      m.pk(158); m.cyl(18, 14.2, Zc, Zc + 3.6, 0.15, 0.15, '#3a3448', M.metal, 5); if (Pt.warp) Pt.warp(m, [18, 14.2, Zc + 4], 0.8, -0.5, 0, () => m.cyl(18, 14.2, Zc + 4, Zc + 8.4, 0.45, 0.3, C.GOLD, M.metal, 8)); m.pk(0); });
    if (show('boiler')) inFrame(m, frameOf('boiler'), () => { const Zo = z('boiler'); m.pk(152); m.cyl(12, 15.2, Zo, Zo + 8.6, 2.8, 2.8, C.RUST, M.metal, 16); m.ball(12, 15.2, Zo + 8.6, 2.8, 3.8, C.RUST2, M.metal, 5, 16); for (const zz of [2, 4.6, 7.2]) m.cyl(12, 15.2, Zo + zz, Zo + zz + 0.35, 2.9, 2.9, '#3a3448', M.metal, 16, false); m.box(10.8, 12.36, Zo + 1, 13.2, 12.5, Zo + 3.4, '#ff9a40', M.glow); m.pk(0); m.cyl(12, 15.2, Zo + 12, Zo + 14, 0.6, 0.6, C.COP, M.metal, 8); m.disc(14.6, 13, Zo + 6, 0.7, 'v', '#f4f0e6', 0, 10);
      m.box(3.6, 14.6, Zo + 5.4, 9.2, 15.8, Zo + 6.4, '#c0c0c8', M.metal); m.cyl(5, 15.2, Zo + 3, Zo + 9, 1, 1, C.IRON2, M.metal, 12); for (let k = 0; k < 3; k++) m.cyl(16 + k * 1.1, 17.6 - k * 0.6, Zo, Zo + 14, 0.32, 0.32, k % 2 ? C.COP : C.IRON, M.metal, 6); });
    if (show('pump')) inFrame(m, frameOf('pump'), () => { const Zp = z('pump'); m.pk(153); for (const u of [35, 39]) { m.cyl(u, 5.4, Zp, Zp + 5.4, 1.3, 1.3, C.IRON, M.metal, 12); m.cyl(u, 5.4, Zp + 5.4, Zp + 8.4, 0.4, 0.4, C.COP, M.metal, 6); } m.box(34, 5, Zp + 8.4, 40, 5.8, Zp + 9, C.COP2, M.metal); m.pk(0); m.cyl(41.6, 6, Zp, Zp + 16, 0.55, 0.55, C.COP, M.metal, 8); m.cyl(37, 11, Zp + 0.02, Zp + 0.3, 2, 2, '#3a6a7a', M.water, 14); });
    if (o.furn && PP.FURN) for (const rid of [...new Set(o.furn.map((it) => it.room || 'living'))]) if (show(rid)) inFrame(m, frameOf(rid), () => PP.FURN.build(m, o.furn.filter((it) => (it.room || 'living') === rid && (o.skip == null || o.furn.indexOf(it) !== o.skip)), { S: FS, zOf: (it) => Z[roomLv(it.room || 'living')], pinkBed: o.pinkBed, idx: (it) => o.furn.indexOf(it) }));
    if (show('laundry')) inFrame(m, frameOf('laundry'), () => { const Zl = z('laundry'); m.pk(167);
      m.cyl(23.4, 3.4, Zl, Zl + 2.4, 1.1, 1.2, '#a87a52', M.plank, 14); m.cyl(23.4, 3.4, Zl + 1.9, Zl + 2.1, 1, 1, '#cfeafa', M.water, 14); for (let k = 0; k < 5; k++) m.ball(22.9 + (k % 3) * 0.4, 3.1 + (k >> 1) * 0.3, Zl + 2.2, 0.25, 0.2, '#ffffff', 0, 3, 5);
      m.box(24.9, 2.6, Zl, 26.3, 4.2, Zl + 3.2, '#8a5a3a', M.plank); m.box(25.1, 2.7, Zl + 1, 26.1, 2.8, Zl + 3, '#c0c0c8', M.metal); m.pk(0);
      m.box(27.4, 2.4, Zl, 29, 3.8, Zl + 4.2, '#5a5466', M.metal); for (const zz of [3.2, 3.8]) m.cyl(28.2, 3.1, Zl + zz, Zl + zz + 0.5, 0.5, 0.5, '#c0c0c8', M.metal, 8);
      for (const v of [5.8, 7.4]) { m.cyl(21.6, v, Zl + 9.6, Zl + 9.6, 0.03, 0.03, '#fff', 0, 3); m.box(21.4, v - 0.05, Zl + 9.5, 29, v + 0.05, Zl + 9.6, '#d8c8a8', 0); for (let k = 0; k < 6; k++) m.box(21.8 + k * 1.2, v - 0.08, Zl + 6.8 + (k % 2) * 0.6, 22.7 + k * 1.2, v + 0.08, Zl + 9.5, ['#fff4dc', '#9fd4f2', '#f2a6c2', '#ffffff', '#c8e8a0', '#ffd95a'][k], M.cloth); }
      m.box(21.3, 7.4, Zl, 22.8, 8.3, Zl + 1.8, '#c8935e', M.plank); m.cyl(28.4, 7.4, Zl, Zl + 2.2, 0.6, 0.6, '#c0a070', M.plank, 10); for (let k = 0; k < 3; k++) m.ball(28.2 + k * 0.2, 7.3, Zl + 2.4 + k * 0.3, 0.4, 0.3, ['#f4ead8', '#9fd4f2', '#f2a6c2'][k], M.cloth, 3, 6);
    });
    if (show('bedroom')) inFrame(m, frameOf('bedroom'), () => { const Zr = z('bedroom'); m.pk(166); m.box(22.4, 6.8, Zr, 27.2, 9.4, Zr + 1.2, '#8a5a3a', M.plank); m.box(22.6, 7.0, Zr + 1.2, 27.0, 9.2, Zr + 2.0, '#f4ece0', M.cloth); m.box(23.6, 6.95, Zr + 1.6, 27.05, 9.3, Zr + 2.2, o.pinkBed ? '#f0a8c0' : '#7aa0d8', M.cloth); m.box(22.7, 7.2, Zr + 2.0, 23.5, 9.0, Zr + 2.6, '#ffffff', M.cloth); m.box(22.2, 6.7, Zr, 22.6, 9.5, Zr + 4.2, '#7a4a2e', M.plank); m.box(27.1, 6.7, Zr, 27.4, 9.5, Zr + 2.8, '#7a4a2e', M.plank); m.pk(0); m.box(27.6, 6.8, Zr, 31.2, 8, Zr + 6.6, C.BRICK, M.stone); m.box(28.2, 7.95, Zr + 0.5, 30.6, 8.1, Zr + 3.8, '#2a1a18', 0); m.box(28.4, 7.9, Zr + 0.5, 30.4, 8.05, Zr + 1.8, '#ff9a40', M.glow); });
    if (showLv(cut, 2)) inFrame(m, frameOf('garden'), () => {
      const Zg = Z[2], snow = o.snow;
      m.pk(159); m.box(31.6, 21.8, Zg, 35.6, 22.6, Zg + 2.4, C.WOOD2, M.plank); m.box(31.6, 22.4, Zg + 2.4, 35.6, 22.8, Zg + 5, C.WOOD2, M.plank); m.pk(0);
      for (let k = 0; k < 2; k++) { const u = 39.2 - k * 1.6, v = 20.4 + k * 1.6; m.box(u - 0.6, v - 0.6, Zg, u + 0.6, v + 0.6, Zg + 1.4, '#8a5a3a', M.plank); if (!snow) m.foliage(u, v, Zg + 2.6, 0.8, 1.8, ['#4c9a48', '#6fbf5a', '#86cc6a'], 20, k, 0.7); }
      if (!snow) for (let k = 0; k < 6; k++) m.flower(29.4 + (k % 2) * 0.4, 19.4 + k * 0.6, Zg, 2 + (k % 2), ['#f2a6c2', '#ffd95a', '#c8a0f0'][k % 3], k + 20);
      m.cyl(31, 15, Zg, Zg + 7, 0.12, 0.12, C.TIMBER, M.plank, 5); m.cyl(31, 21, Zg, Zg + 7, 0.12, 0.12, C.TIMBER, M.plank, 5); m.box(30.95, 15, Zg + 6.8, 31.05, 21, Zg + 6.9, '#f4f0e6', 0); for (let k = 0; k < 3; k++) m.box(30.9, 15.8 + k * 1.8, Zg + 4.6, 31.1, 17 + k * 1.8, Zg + 6.8, ['#e0604a', '#5aa6d8', '#ffd36a'][k], M.cloth);
      m.pk(PK.nest); m.cyl(NEST_L.u, NEST_L.v, Zg, Zg + 1.2, 0.9, 1.1, '#a8784a', M.plank, 10); m.cyl(NEST_L.u, NEST_L.v, Zg + 1.2, Zg + 1.6, 1.15, 1, '#8a6a40', M.cloth, 10); if (o.egg) m.ball(NEST_L.u + 0.2, NEST_L.v, Zg + 1.9, 0.36, 0.7, '#f8f0e0', 0, 4, 8); m.pk(0);
      const Bb = BAL_L; m.box(Bb.u - 2.4, Bb.v - 2.4, Zg, Bb.u + 2.4, Bb.v + 2.4, Zg + 0.4, C.PLANK, M.plank);
      if (!o.tripping) { m.pk(PK.balloon); m.box(Bb.u - 1.1, Bb.v - 1.1, Zg + 0.4, Bb.u + 1.1, Bb.v + 1.1, Zg + 3, '#a8784a', M.plank); for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(Bb.u + du - 0.06, Bb.v + dv - 0.06, Zg + 3, Bb.u + du + 0.06, Bb.v + dv + 0.06, Zg + 9, '#5a3a28', 0); m.ball(Bb.u, Bb.v, Zg + 15, 3.6, 7.6, '#e8705a', M.cloth, 8, 16, 0, 3); for (let i = 0; i < 8; i += 2) { const a = (i / 8) * 6.2832; m.quad([Bb.u + Math.cos(a) * 3.62, Bb.v + Math.sin(a) * 3.62, Zg + 13], [Bb.u + Math.cos(a + 0.4) * 3.62, Bb.v + Math.sin(a + 0.4) * 3.62, Zg + 13], [Bb.u + Math.cos(a + 0.4) * 3.62, Bb.v + Math.sin(a + 0.4) * 3.62, Zg + 17], [Bb.u + Math.cos(a) * 3.62, Bb.v + Math.sin(a) * 3.62, Zg + 17], '#ffd36a', M.cloth); } m.pk(0); }
    });
    if (showLv(cut, 3)) inFrame(m, frameOf('balcony'), () => { const Zb = Z[3]; for (let k = 0; k < 4; k++) m.pot(22.4 + k * 2.2, 18, Zb, 0.4, '#c8705a', o.snow ? null : ['#5aa64e', '#f2a6c2'][k % 2], k); });
  }

  // ---------- 外面挂着的东西 ----------
  const WING_ROOTS = [[3.8, 9.2, Math.PI * 0.92], [43.4, 9.4, -0.08]];
  // 斜插在墙上的小房子：从外墙上歪着戳出来，底下两根斜撑。挂在哪间房上就跟着那间房转
  // [房间, 哪面墙 / 圆房间的角度, 墙上的位置 0~1, 离地多高, 宽, 进深, 高, 往外歪多少, 往旁边歪多少, 墙色, 顶色]
  const PERCH = [
    ['living', 'v1', 0.2, 5, 5, 3.8, 6.4, 0.3, 0.1, C.CREAM2, C.TILE2],
    ['living', 'u1', 0.75, 7, 4, 3.2, 5.4, -0.26, -0.12, '#e8d0b8', C.SHING],
    ['bedroom', 'u1', 0.6, 3, 4.6, 4, 6.8, -0.3, 0.12, '#e8d0b8', C.TILE],
    ['bedroom', 'v1', 0.15, 6, 3.6, 3.2, 5, 0.28, -0.16, C.CREAM, C.SHING],
    ['bedroom', 'v0', 0.3, 6, 3.6, 3.2, 5, 0.22, -0.12, C.CREAM, C.SHING],
    ['attic', 'u0', 0.45, 4, 5, 4, 7, 0.32, -0.08, '#c8a078', C.TILE2],
    ['attic', 'v1', 0.7, 6, 4, 3.2, 5.2, -0.28, 0.16, C.CREAM2, C.TILE],
    ['library', 'v1', 0.72, 5.5, 4, 3.4, 5.4, -0.3, 0.08, C.CREAM, C.SHING],
    ['library', 'u0', 0.3, 7, 3.6, 3, 4.8, 0.26, 0.1, '#e8d0b8', C.TILE],
    ['dining', 'u1', 0.35, 6, 4.2, 3.6, 5.8, 0.3, -0.12, C.BRICK, C.TILE2],
    ['kitchen', 'v0', 0.35, 7, 4, 3.2, 5.4, -0.24, 0.12, C.CREAM, C.TILE],
    ['shed', 'v1', 0.6, 6, 3.6, 3, 5, 0.26, 0.1, '#8a5e3c', C.SHING],
    ['workshop', 3.75, 0, 6.5, 4.6, 3.6, 6.2, 0.3, 0.12, C.CREAM2, C.TILE],
    ['workshop', 1.9, 0, 7, 3.8, 3, 5, -0.26, -0.1, C.CREAM, C.TILE2],
    ['bath', -0.7, 0, 4, 3.8, 3.2, 5.4, -0.26, 0.14, C.CREAM, C.SHING],
    ['bath', 0.5, 0, 6.5, 3.4, 3, 4.6, 0.24, -0.1, '#e8d0b8', C.TILE],
    ['cockpit', 2.45, 0, 5, 3.6, 3.4, 7.4, 0.2, -0.16, '#e8d0b8', C.TILE2],
    ['cockpit', 1.2, 0, 6, 3.4, 3, 5, -0.24, 0.12, C.CREAM2, C.TILE],
    ['hall', 3.55, 0, 7, 4.4, 3.4, 5.8, -0.2, 0.1, C.CREAM, C.TILE2],
    ['store', 0.25, 0, 7, 4, 3.2, 5.4, 0.24, 0.1, C.CREAM2, C.SHING],
  ];
  function perches(m, cut, o) {
    const W = P2().warp; if (!W) return;
    for (const [id, side, t, zo, w, d, h, tilt, roll, wc, rc] of PERCH) {
      const r = RM[id]; if (!r || (cut && cut.lv <= r.lv)) continue;
      let P, yaw;
      if (r.c) { yaw = side; P = [r.c[0] + Math.cos(yaw) * (r.c[2] + 0.2), r.c[1] + Math.sin(yaw) * (r.c[2] + 0.2)]; }
      else { const [a, b, c, e] = r.r; P = side === 'v1' ? [a + (c - a) * t, e + 0.25] : side === 'v0' ? [a + (c - a) * t, b - 0.25] : side === 'u1' ? [c + 0.25, b + (e - b) * t] : [a - 0.25, b + (e - b) * t]; yaw = { v1: Math.PI / 2, v0: -Math.PI / 2, u1: 0, u0: Math.PI }[side]; }
      const z = Z[r.lv] + zo, [u, v] = P, snow = o.snow;
      const hut = () => {
        m.box(u, v - w / 2, z, u + d, v + w / 2, z + h, wc, M.plaster);
        m.box(u + d, v - w * 0.22, z + h * 0.35, u + d + 0.06, v + w * 0.22, z + h * 0.72, o.night ? '#ffe9a8' : C.GLASS, o.night ? M.glow : M.glass);
        m.box(u + d - 0.02, v - w * 0.22 - 0.2, z + h * 0.35 - 0.2, u + d + 0.1, v + w * 0.22 + 0.2, z + h * 0.35, C.TIMBER, M.plank);
        for (const vv of [v - w / 2, v + w / 2]) m.box(u + d - 0.25, vv - 0.12, z, u + d + 0.05, vv + 0.12, z + h, C.TIMBER, M.plank);
        m.box(u, v - w / 2 - 0.05, z + h * 0.5, u + d, v + w / 2 + 0.05, z + h * 0.5 + 0.25, C.TIMBER, M.plank);
        m.gable(u - 0.2, v - w / 2, u + d, v + w / 2, z + h, w * 0.55, 'u', snow ? '#e4ecf4' : rc, snow ? M.snow : M.tile, 0.45, wc, M.plaster);
        if (h > 4.4) { m.box(u + d * 0.3, v + w / 2 - 0.9, z + h, u + d * 0.3 + 0.7, v + w / 2 - 0.2, z + h + w * 0.55 + 1.2, C.BRICK, M.stone); }
        for (const vv of [v - w / 2 + 0.3, v + w / 2 - 0.3]) m.quad([u + d - 0.3, vv - 0.12, z], [u + d - 0.3, vv + 0.12, z], [u - 0.05, vv + 0.12, z - 3.4], [u - 0.05, vv - 0.12, z - 3.4], C.TIMBER, M.plank);
        m.box(u, v - w / 2 - 0.1, z - 0.35, u + d + 0.1, v + w / 2 + 0.1, z, '#7a5636', M.plank);
      };
      inFrame(m, r.rot ? r : null, () => W(m, [u, v, z], yaw, 0, 0, () => W(m, [u, v, z], 0, -tilt, roll, () => { const yu = u, yv = v; hut(yu, yv); })));
    }
  }
  // 朝外歪的墙：越往上越往外斜（只歪墙和屋顶，地板不动，所以照样能走）
  function leanWrap(m, z0, k, fn) {
    if (!k) return fn();
    const own = Object.prototype.hasOwnProperty.call(m, 'tri'), o = m.tri;
    m.tri = function (a, b, c, col, mat) { const T = (q) => { const dz = Math.max(0, q[2] - z0); return [q[0] + k[0] * dz, q[1] + k[1] * dz, q[2]]; }; return o.call(this, T(a), T(b), T(c), col, mat); };
    try { fn(); } finally { if (own) m.tri = o; else delete m.tri; }
  }
  // ---------- 植物：城堡和植物长在一起 ----------
  // 爬山虎顺着墙往上爬、小树从台子边上斜着长出来、根和藤从底下垂下去、平屋顶和檐口上长草开花
  const LEAF = (o) => (o.season === 'autumn' ? ['#d8823a', '#c8582e', '#e0a040', '#8a9a3a'] : o.season === 'spring' ? ['#7ac85a', '#9ad86a', '#5aa64e', '#f2c6d2'] : ['#4c8a40', '#5aa64e', '#6aa858', '#3e7a3a']);
  function vine(m, o, pts, seed, r = 0.55) {
    const cols = LEAF(o);
    for (let i = 0; i + 1 < pts.length; i++) { const [a, b] = [pts[i], pts[i + 1]]; m.quad([a[0], a[1], a[2]], [a[0] + 0.08, a[1] + 0.08, a[2]], [b[0] + 0.08, b[1] + 0.08, b[2]], [b[0], b[1], b[2]], '#5a4a2a', 0); }
    // 叶子一片一片贴着藤长，不是一团一团的球：每个节点一小簇，越往上越稀
    pts.forEach((q, i) => { const n = Math.round((5 + r * 8) * (1 - (i / pts.length) * 0.4)); for (let k = 0; k < n; k++) { const h1 = H(seed + i * 7, k), h2 = H(k + 3, seed + i), a = h1 * 6.2832, d = r * (0.3 + h2 * 0.9);
      const c = cols[Math.floor(H(seed, i * 11 + k) * cols.length)], up = H(i, k + seed);
      m.leaf([q[0] + Math.cos(a) * d, q[1] + Math.sin(a) * d, q[2] + (up - 0.5) * r * 1.6], a + (h2 - 0.5), 0.35 + up * 0.7, 0.42 + h1 * 0.22, shade(c, 0.78 + up * 0.35), 0.8); } });
  }
  // 沿着一面墙往上爬：从地面起，左右摆着往上，越往上越散
  function ivyOnWall(m, o, p0, along, out, z0, hh, seed) {
    const pts = []; let x = 0;
    for (let k = 0; k <= 7; k++) { x += (H(seed, k) - 0.5) * 1.6; const t = k / 7; pts.push([p0[0] + along[0] * x + out[0] * 0.35, p0[1] + along[1] * x + out[1] * 0.35, z0 + hh * t]); }
    vine(m, o, pts, seed, 0.85); if (H(seed, 40) < 0.75) vine(m, o, pts.slice(2).map((q, i) => [q[0] + along[0] * (1 + i * 0.4), q[1] + along[1] * (1 + i * 0.4), q[2]]), seed + 5, 0.45);
  }
  function tree(m, o, u, v, z, h, seed, lean = 0.3) {
    // 一棵树：树干分三四根枝，每根枝头一簇叶子，簇和簇之间能看到枝干；根部往外张开扎进土里
    const cols = LEAF(o), bark = '#6a4a2e', bark2 = '#4e3622', R = (k) => H(seed, k), th = h * 0.5, top = [u + lean * 1.2, v, z + th];
    const limb = (a, b, r0, r1) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d), n = 5; for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, rr = r0 + (r1 - r0) * t0; const P0 = [a[0] + d[0] * t0, a[1] + d[1] * t0, a[2] + d[2] * t0], P1 = [a[0] + d[0] * t1, a[1] + d[1] * t1, a[2] + d[2] * t1]; for (let s = 0; s < 4; s++) { const f0 = s * 1.5708, f1 = f0 + 1.5708, e = (P, f, r) => [P[0] + Math.cos(f) * r, P[1] + Math.sin(f) * r, P[2]]; m.quad(e(P0, f0, rr), e(P0, f1, rr), e(P1, f1, rr * 0.92), e(P1, f0, rr * 0.92), s % 2 ? bark : bark2, M.plank); } } return L; };
    limb([u, v, z - 0.3], top, 0.5 * Math.min(1.4, h / 8), 0.34 * Math.min(1.4, h / 8));
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + R(k) * 0.8; m.quad([u, v, z + 0.6], [u + 0.15, v, z + 0.6], [u + Math.cos(a) * 1.5, v + Math.sin(a) * 1.5, z - 0.3], [u + Math.cos(a) * 1.35, v + Math.sin(a) * 1.35, z - 0.3], bark2, 0); }
    const nb = h > 7 ? 4 : 3, tips = [];
    for (let k = 0; k < nb; k++) { const a = (k / nb) * 6.2832 + R(k + 10) * 1.1, out = h * (0.2 + R(k + 20) * 0.12), up = h * (0.22 + R(k + 30) * 0.2), from = [top[0] - lean * 0.4 * (k / nb), top[1], top[2] - h * 0.1 * (k % 2)], tip = [from[0] + Math.cos(a) * out + lean * 0.8, from[1] + Math.sin(a) * out, from[2] + up];
      limb(from, tip, 0.26 * Math.min(1.4, h / 8), 0.1); tips.push(tip); }
    tips.push([top[0] + lean * 0.8, top[1], top[2] + h * 0.42]); limb(top, tips[tips.length - 1], 0.22, 0.1);
    if (o.snow) { for (const t of tips) m.ball(t[0], t[1], t[2] + 0.5, h * 0.1, h * 0.06, '#eef4fa', M.snow, 3, 7); return; }
    tips.forEach((t, k) => { const rr = h * (k === tips.length - 1 ? 0.2 : 0.16 + R(k + 40) * 0.05); m.foliage(t[0], t[1], t[2] + rr * 0.25, rr, rr * 0.8, cols, 40, seed * 3 + k, 0.62); });
  }
  // 垂下去的根 / 藤：从一个点往下荡
  function dangle(m, o, u, v, z, len, seed, green = true) {
    const pts = []; for (let k = 0; k <= 6; k++) pts.push([u + Math.sin(k * 0.9 + seed) * 0.5, v + Math.cos(k * 0.7 + seed) * 0.4, z - len * k / 6]);
    if (green && !o.snow) vine(m, o, pts, seed, 0.38); else for (let i = 0; i + 1 < pts.length; i++) m.quad(pts[i], [pts[i][0] + 0.12, pts[i][1], pts[i][2]], [pts[i + 1][0] + 0.1, pts[i + 1][1], pts[i + 1][2]], pts[i + 1], '#5a4028', 0);
  }
  function plants(m, cut, o) {
    if (o.snow && o.season === 'winter') { /* 冬天只剩光秃秃的枝和根 */ }
    // 墙上的爬藤：每间方房子挑两面朝外的墙
    for (const r of ROOMS) {
      if (cut && cut.lv <= r.lv) continue; if (r.glass || r.hut) continue;
      const z0 = Z[r.lv], hh = (r.h || WH) * (0.55 + H(r.lv, r.id.length) * 0.35);
      if (r.c) { for (let k = 0; k < 3; k++) { const a = H(r.id.length, k) * 6.28, cu = r.c[0] + Math.cos(a) * (r.c[2] + 0.1), cv = r.c[1] + Math.sin(a) * (r.c[2] + 0.1); ivyOnWall(m, o, [cu, cv], [-Math.sin(a), Math.cos(a)], [Math.cos(a), Math.sin(a)], z0, hh, r.id.length * 7 + k); } continue; }
      inFrame(m, r.rot ? r : null, () => { const [a, b, c, d] = r.r;
        const sides = [[[a + (c - a) * 0.2, d], [1, 0], [0, 1]], [[c, b + (d - b) * 0.7], [0, 1], [1, 0]], [[a, b + (d - b) * 0.35], [0, 1], [-1, 0]], [[a + (c - a) * 0.75, b], [1, 0], [0, -1]]];
        sides.forEach(([p0, al, ou], k) => { if (H(r.id.length * 3, k) < 0.75) ivyOnWall(m, o, p0, al, ou, z0, hh, r.id.length * 11 + k); }); });
    }
    if (!showLv(cut, 1)) return;
    // 台子边上斜长出来的小树
    const T = [['courtA', 10.6, 27.6, 10, 0.35], ['farmB', 31.6, 36, 11, -0.3], ['courtC', 38.6, 28.6, 9, 0.4], ['gplat', 3.6, 43.6, 20, -0.55], ['farmA', 33.6, 29, 8, 0.35]];
    for (const [id, u, v, h, l] of T) { const q = MD[id]; if (!showLv(cut, q.lv)) continue; inFrame(m, mFrame(q), () => tree(m, o, u, v, Z[q.lv], h, u * 3 + v, l)); }
    if (showLv(cut, 2) && MD.pergola) inFrame(m, mFrame(MD.pergola), () => tree(m, o, 3.4, 15.4, Z[2], 7, 21, 0.4));
    // 船体边上长出来的树，根垂在外面
    for (const [th, h] of [[2.2, 9], [-0.4, 8], [-2.6, 10]]) { const r = polyR(th) - 1.4, u = CEN[0] + Math.cos(th) * r, v = CEN[1] + Math.sin(th) * r; if (roomAt(u, v, 1) || MODS.some((q) => q.lv === 1 && inMod(q, u, v, -1))) continue; tree(m, o, u, v, HT, h, th * 10 + 40, 0.45); for (let k = 0; k < 4; k++) dangle(m, o, u + Math.cos(th) * 1.2 + (k - 1.5) * 0.7, v + Math.sin(th) * 1.2, -1.5, 5 + H(k, th) * 6, k + th * 3, k % 2 === 0); }
    // 底下垂着的根和藤：船体外沿、各个悬出去的台子外沿
    if (!cut) { const ep = deckEdge(36, -0.2, false); ep.forEach(([u, v], i) => { if (H(i, 17) < 0.45) dangle(m, o, u, v, -3 - H(i, 5) * 3, 4 + H(i, 8) * 8, i, H(i, 2) < 0.5); }); }
    for (const q of MODS) { if (q.kind === 'court' || !showLv(cut, q.lv)) continue; inFrame(m, mFrame(q), () => { const [a, b, c, d] = q.r; for (let k = 0; k < 4; k++) { const t = H(k, q.id.length); const [u, v] = [[a + (c - a) * t, d], [c, b + (d - b) * t], [a + (c - a) * t, b], [a, b + (d - b) * t]][k]; if (H(k, q.id.length + 3) < 0.6) dangle(m, o, u, v, Z[q.lv] - 0.8, 2.5 + H(k, 4) * 4, k * 5 + q.id.length, true); } }); }
    // 檐下、栏杆上的吊盆和花箱，台子角落的灌木
    if (!o.snow) for (const q of MODS) { if (!showLv(cut, q.lv) || q.kind === 'pool') continue; inFrame(m, mFrame(q), () => { const [a, b, c, d] = q.r, z = Z[q.lv]; for (const [u, v, k] of [[a + 0.8, b + 0.8, 0], [c - 0.8, d - 0.8, 1]]) if (H(k, q.id.length * 5) < 0.7) P2().bush ? P2().bush(m, u, v, z, 0.55, LEAF(o), q.id.length + k, true) : m.foliage(u, v, z + 0.9, 0.6, 0.9, LEAF(o), 14, k); }); }
  }
  // 斜插小屋外面的东西：底下两根斜撑、窗台里的小摆设（屋子本身按普通房间画）
  function hutExtras(m, cut, o) {
    for (const r of HUTS) { if (!showLv(cut, r.lv)) continue; inFrame(m, r, () => { const [a, b, c, d] = r.r, z = Z[r.lv];
      for (const v of [b + 0.4, d - 0.4]) m.quad([c - 0.4, v - 0.12, z - 1], [c - 0.4, v + 0.12, z - 1], [a + 0.2, v + 0.12, z - 5.5], [a + 0.2, v - 0.12, z - 5.5], C.TIMBER, M.plank);
      m.box(a, b, z - 1.4, c, d, z - 1, '#7a5636', M.plank);
      const cv = (b + d) / 2, use = r.use;
      if (use === 'sit') { m.box(c - 1.3, b + 0.4, z, c - 0.35, d - 0.4, z + 1.6, '#a8784a', M.plank); m.box(c - 1.2, b + 0.5, z + 1.6, c - 0.4, d - 0.5, z + 2, '#e8a0b0', M.cloth); m.box(c - 1.1, cv - 0.6, z + 2, c - 0.5, cv + 0.6, z + 2.8, '#f6e0a0', M.cloth); }
      else if (use === 'read') { m.box(c - 1.3, b + 0.4, z, c - 0.35, d - 0.4, z + 6, '#7a5030', M.plank); for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) m.box(c - 1.25, b + 0.6 + j * (d - b - 1.2) / 4, z + 1 + i * 2.6, c - 0.5, b + 0.9 + j * (d - b - 1.2) / 4, z + 2.8 + i * 2.6, ['#c85a4a', '#5a8ad8', '#e8c860', '#7fc8a8'][(i + j) % 4], 0); }
      else if (use === 'drink') { m.box(c - 1.3, b + 0.4, z, c - 0.35, d - 0.4, z + 4.4, '#c8a878', M.plank); m.cyl(c - 0.8, cv, z + 4.4, z + 5.6, 0.4, 0.35, '#f4f0e8', 0, 8); m.cyl(c - 0.8, cv + 0.9, z + 4.4, z + 5, 0.3, 0.25, '#e8a0b0', 0, 8); }
      else { m.box(c - 1.3, b + 0.4, z, c - 0.35, d - 0.4, z + 2.6, '#8a5a3a', M.plank); m.box(c - 1.2, b + 0.6, z + 2.6, c - 0.4, cv, z + 4, '#a8784a', M.plank); m.cyl(c - 0.8, d - 1, z + 2.6, z + 4.2, 0.45, 0.45, '#8a5a3a', M.plank, 8); }
    }); }
  }
  // 悬空的部分要有东西托着：转了角度的上层房间，角落如果悬在下面房间外面，就加一根斜撑顶回下面的墙
  // 院子外面的草地：后面一排果树、堆肥箱、柴火垛；水池引一根铜管到花房浇水
  function yard(m, cut, o) {
    if (!showLv(cut, 1)) return;
    for (const [u, v, h, l] of [[12.6, 2.2, 7, 0.3], [16.4, 1.6, 6, -0.25], [19.6, 3.2, 7.5, 0.2], [42.6, 22.4, 6, 0.4]]) {
      tree(m, o, u, v, HT, h, u * 7 + v, l);
      if (!o.snow) for (let k = 0; k < 6; k++) { const a = k * 1.05 + u, r = h * 0.22; m.ball(u + l * 1.4 + Math.cos(a) * r, v + Math.sin(a) * r, HT + h * (0.82 + H(k, u) * 0.18), 0.32, 0.32, o.season === 'autumn' ? '#e8a040' : '#d8483a', 0, 3, 6); }
    }
    // 堆肥箱：三格木条箱
    { const u = 33, v = 0, z = HT; for (let i = 0; i < 3; i++) { const a = u - 2.4 + i * 1.6; m.box(a, v - 0.8, z, a + 1.5, v + 0.8, z + 1.4, i === 1 ? '#7a5636' : '#8a6040', M.plank); m.box(a + 0.15, v - 0.65, z + 1.2, a + 1.35, v + 0.65, z + 1.5, '#4a3424', 0); } }
    // 柴火垛：一排截面朝外的圆木，上面搭个小棚顶
    { const u = 47, v = 13.6, z = HT; for (let j = 0; j < 3; j++) for (let i = 0; i < 5 - j; i++) m.box(u - 2 + i * 0.8 + j * 0.4, v - 0.7, z + j * 0.7, u - 1.3 + i * 0.8 + j * 0.4, v + 0.7, z + j * 0.7 + 0.7, (i + j) % 2 ? '#c89a62' : '#b0844e', M.plank);
      m.quad([u - 2.6, v - 1.1, z + 3.2], [u + 2.4, v - 1.1, z + 3.2], [u + 2.4, v + 1.3, z + 2.4], [u - 2.6, v + 1.3, z + 2.4], C.SHING, M.plank);
      for (const x of [u - 2.4, u + 2.2]) m.box(x - 0.12, v - 1, z, x + 0.12, v - 0.76, z + 3.2, C.TIMBER, M.plank); }
    // 铜管：水池西边 → 沿着菜地下面 → 花房
    if (!cut) { const zp = -2.4, col = C.COP, seg = (a, b) => { const u0 = Math.min(a[0], b[0]) - 0.22, u1 = Math.max(a[0], b[0]) + 0.22, v0 = Math.min(a[1], b[1]) - 0.22, v1 = Math.max(a[1], b[1]) + 0.22, z0 = Math.min(a[2], b[2]) - 0.22, z1 = Math.max(a[2], b[2]) + 0.22; m.box(u0, v0, z0, u1, v1, z1, col, M.metal); };
      const pts = [[33.6, 33.4, Z[0] + 2.5], [33.6, 33.4, zp], [24, 33.4, zp], [24, 37.8, zp], [15.4, 37.8, zp], [15.4, 37.8, 1.2]];
      for (let i = 0; i + 1 < pts.length; i++) seg(pts[i], pts[i + 1]);
      for (const q of pts.slice(1, -1)) m.box(q[0] - 0.36, q[1] - 0.36, q[2] - 0.36, q[0] + 0.36, q[1] + 0.36, q[2] + 0.36, '#3a3448', M.metal);
      m.cyl(33.6, 33.4, -6, -4.8, 0.55, 0.55, C.GOLD, M.metal, 8); }
  }
  // 房子挨着房子（尤其是贴着圆塔转了角度的房间）之间不能留缝：沿着墙往对面那栋投过去，把这条楔形的缝砌实
  // 门洞那一段只砌门楣以上，底下铺地板，变成一小段过道
  let JOINS = null;
  function joinRuns() {
    if (JOINS) return JOINS; JOINS = [];
    const solid = ROOMS.filter((r) => !r.hut && !r.glass);
    const nearOn = (B, u, v) => { if (B.c) { const [cu, cv, rr] = B.c, dd = Math.hypot(u - cu, v - cv); if (dd <= rr) return null; return [[cu + (u - cu) * rr / dd, cv + (v - cv) * rr / dd], dd - rr]; }
      const [x, y] = toL(B.rot ? B : null, u, v), [a, b, c, d] = B.r; if (x > a && x < c && y > b && y < d) return null; const cx = Math.min(c, Math.max(a, x)), cy = Math.min(d, Math.max(b, y)); return [toW(B.rot ? B : null, cx, cy), Math.hypot(x - cx, y - cy)]; };
    const isDoor = (lv, u, v) => PASS.some((p) => { if (p.lv !== lv) return false; const [x, y] = toL(p.F, u, v); return x > p.r[0] - 0.3 && x < p.r[2] + 0.3 && y > p.r[1] - 0.3 && y < p.r[3] + 0.3; });
    for (const A of solid) { if (A.c) continue; const fr = A.rot ? A : null, [a, b, c, d] = A.r;
      for (const B of solid) { if (B === A || B.lv !== A.lv || (!B.c && B.id < A.id)) continue;
        for (const [p0, p1] of [[[a, b], [c, b]], [[c, b], [c, d]], [[c, d], [a, d]], [[a, d], [a, b]]]) {
          const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), n = Math.max(2, Math.round(L / 0.3)); let run = null;
          for (let i = 0; i <= n; i++) { const t = i / n, P = toW(fr, p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t), q = nearOn(B, P[0], P[1]);
            const mm = q && [(P[0] + q[0][0]) / 2, (P[1] + q[0][1]) / 2], dr = q && isDoor(A.lv, ...mm);
            if (q && q[1] > 0.04 && q[1] < 2.9 && (dr || !floorAt(A.lv, ...mm))) { if (!run) { run = { A, B, lv: A.lv, pts: [] }; JOINS.push(run); } run.pts.push([P, q[0], dr]); }
            else run = null; }
        } } }
    JOINS = JOINS.filter((r) => r.pts.length >= 2); return JOINS;
  }
  function joins(m, cut, o) {
    for (const J of joinRuns()) { if (!showLv(cut, J.lv)) continue;
      const z0 = Z[J.lv], top = cut && cut.lv === J.lv ? z0 + 2.2 : z0 + Math.min(roomH(J.A), roomH(J.B)), col = J.A.out, mt = J.A.om, pts = J.pts;
      const side = (P, q, za, zb) => m.quad([P[0], P[1], za], [q[0], q[1], za], [q[0], q[1], zb], [P[0], P[1], zb], col, mt);
      for (let i = 0; i + 1 < pts.length; i++) { const [P0, Q0, d0] = pts[i], [P1, Q1, d1] = pts[i + 1], door = d0 || d1;
        m.quad([P0[0], P0[1], top], [P1[0], P1[1], top], [Q1[0], Q1[1], top], [Q0[0], Q0[1], top], shade(col, 0.8), mt);
        m.quad([P0[0], P0[1], z0 - 1], [Q0[0], Q0[1], z0 - 1], [Q1[0], Q1[1], z0 - 1], [P1[0], P1[1], z0 - 1], shade(col, 0.6), mt);
        if (door) m.quad([P0[0], P0[1], z0 + 0.02], [Q0[0], Q0[1], z0 + 0.02], [Q1[0], Q1[1], z0 + 0.02], [P1[0], P1[1], z0 + 0.02], J.A.fl, J.A.fm);
        if (door && top > z0 + DOOR_H) m.quad([P0[0], P0[1], z0 + DOOR_H], [Q0[0], Q0[1], z0 + DOOR_H], [Q1[0], Q1[1], z0 + DOOR_H], [P1[0], P1[1], z0 + DOOR_H], shade(col, 0.7), mt);
        if (d0 !== d1) { const [P, Q] = d0 ? [P1, Q1] : [P0, Q0]; side(P, Q, z0, Math.min(top, z0 + DOOR_H)); } }
      const [Pa, Qa, da] = pts[0], [Pb, Qb, db] = pts[pts.length - 1];
      side(Pa, Qa, da ? z0 + DOOR_H : z0 - 1, top); side(Pb, Qb, db ? z0 + DOOR_H : z0 - 1, top);
      if (da && top > z0 + DOOR_H) side(Pa, Qa, z0 + DOOR_H, top);
    }
  }
  function supports(m, cut, o) {
    for (const r of ROOMS) { if (r.c || r.lv < 2 || r.hut || !showLv(cut, r.lv)) continue; const fr = r.rot ? r : null, [a, b, c, d] = r.r, z = Z[r.lv];
      for (const [lu, lv2] of [[a + 0.3, b + 0.3], [c - 0.3, b + 0.3], [a + 0.3, d - 0.3], [c - 0.3, d - 0.3], [(a + c) / 2, d - 0.3], [(a + c) / 2, b + 0.3]]) {
        const [u, v] = toW(fr, lu, lv2); if (roomAt(u, v, r.lv - 1) || OPEN.some((q) => q[0] === r.lv - 1 && inOpen(q, u, v))) continue;
        // 往房间中心方向找最近的下层房间的墙
        const [cu, cv] = toW(fr, (a + c) / 2, (b + d) / 2); let tu = u, tv = v, ok = false; for (let k = 1; k <= 12; k++) { tu = u + (cu - u) * k / 12; tv = v + (cv - v) * k / 12; if (roomAt(tu, tv, r.lv - 1)) { ok = true; break; } }
        const zb = ok ? z - 7 : z - 9; m.quad([u - 0.18, v, z - 1], [u + 0.18, v, z - 1], [tu + 0.18, tv, zb], [tu - 0.18, tv, zb], C.TIMBER, M.plank); m.quad([u, v - 0.18, z - 1], [u, v + 0.18, z - 1], [tu, tv + 0.18, zb], [tu, tv - 0.18, zb], C.TIMBER, M.plank);
        m.box(u - 0.3, v - 0.3, z - 1.6, u + 0.3, v + 0.3, z - 0.9, '#3a3448', M.metal);
      } }
    // 斜插小屋：底下三角托架
    for (const r of HUTS) { if (!showLv(cut, r.lv)) continue; inFrame(m, r, () => { const [a, b, c, d] = r.r, z = Z[r.lv]; for (const v of [b + 0.5, (b + d) / 2, d - 0.5]) { m.box(a, v - 0.15, z - 1.6, c + 0.3, v + 0.15, z - 1, C.TIMBER, M.plank); m.quad([c, v - 0.15, z - 1.4], [c, v + 0.15, z - 1.4], [a - 0.3, v + 0.15, z - 1 - (c - a) * 1.1], [a - 0.3, v - 0.15, z - 1 - (c - a) * 1.1], C.TIMBER, M.plank); } }); }
  }
  function extras(m, cut, o) {
    const Pt = P2(), all = !cut;
    hutExtras(m, cut, o);
    supports(m, cut, o); yard(m, cut, o); joins(m, cut, o);
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
    modules(m, cut, o);
    for (const r of ROOMS) if (showLv(cut, r.lv)) { if (isRound(r)) roundRoom(m, r, cut, o); else inFrame(m, r.rot ? r : null, () => leanWrap(m, Z[r.lv], r.lean, () => rectRoom(m, r, cut, o))); }
    for (const p of PASS) if (showLv(cut, p.lv)) inFrame(m, p.F, () => passage(m, p, cut, o));
    for (const op of OPEN) { if (!showLv(cut, op[0])) continue; const z = Z[op[0]]; inFrame(m, frameOf(op[6]), () => { m.box(op[1], op[2], z - 1, op[3], op[4], z, '#8a7e70', M.stone, o.snow ? '#eef4fa' : '#9a8a6e', o.snow ? M.snow : M.stone); for (let a = op[1] + 1.2; a < op[3] - 0.6; a += 2.6) for (const b of [op[2] + 1, op[4] - 1]) m.quad([a, b, z - 1], [a + 0.25, b, z - 1], [a + 0.25 + (a - (op[1] + op[3]) / 2) * 0.12, b, z - 7], [a + (a - (op[1] + op[3]) / 2) * 0.12, b, z - 7], C.TIMBER, M.plank); }); }
    for (const p of PARA) { if (!showLv(cut, p[0])) continue; const [lv, a, b, c, d] = p, z = Z[lv]; inFrame(m, frameOf(p[5]), () => { m.box(a, b, z, c, d, z + 1.4, C.STONE2, M.stone); const L = Math.max(c - a, d - b), n = Math.floor(L / 1.3); for (let i = 0; i < n; i += 2) { const t = i / n, t2 = (i + 1) / n; c - a > d - b ? m.box(a + (c - a) * t, b, z + 1.4, a + (c - a) * t2, d, z + 2.3, C.STONE, M.stone) : m.box(a, b + (d - b) * t, z + 1.4, c, b + (d - b) * t2, z + 2.3, C.STONE, M.stone); } }); }
    for (const r of RAMPS) { if (r.out || !showLv(cut, r.a)) continue; const z0 = Z[r.a], z1 = Z[r.b], part = cut && cut.lv === r.a; m.stairs(r.lo, part ? r.lo + (r.hi - r.lo) * 0.4 : r.hi, r.v0, r.v1, z0, part ? z0 + (z1 - z0) * 0.4 : z1, 'u', '#8a7a6a', part ? 4 : 10, true); if (!part) m.rail(r.lo, r.v1 + 0.1, r.hi, r.v1 + 0.1, z0 + 1, 5, '#3a3448'); }
    roofs(m, cut, o);
    interiors(m, cut, o);
    extras(m, cut, o);
    plants(m, cut, o);
    return m;
  }
  function dyn(o) {
    const m = new Mesh(), t = o.t, cut = o.cut;
    if (!cut || cut.lv >= 2) wings(m, t, o);
    if (showLv(cut, 0)) { const Zo = Z[0]; for (let i = 0; i < 5; i++) { const h = 1.2 + Math.sin(t * 9 + i * 2.1) * 0.6 + (o.fire || 0.6) * 1.2; m.cyl(10.9 + i * 0.55, 12.6, Zo + 1.1, Zo + 1.1 + h, 0.28, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); } const ps = Math.sin(t * (0.5 + (o.power || 0.6) * 1.3)) * 1.2; m.box(1.6 + ps, 14.8, Zo + 5.6, 3.8 + ps, 15.6, Zo + 6.2, '#e0e0e8', M.metal); }
    if (showLv(cut, 1)) { const Zk = Z[1]; if (o.cooking) for (let i = 0; i < 6; i++) { const h = 1.4 + Math.sin(t * 9 + i * 2.1) * 0.5; m.cyl(21.6 + i * 0.6, 10.6, Zk + 6.4, Zk + 6.4 + h, 0.26, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); }
    }
    if (showLv(cut, 0)) inFrame(m, mFrame(MD.cistern), () => { const Q = Object.assign({}, POOL_L, { z: POOL.z }); for (let i = 0; i < 4; i++) { const a = t * (0.35 + i * 0.08) + i * 1.7, cu = (Q.u0 + Q.u1) / 2 + Math.cos(a) * (2.6 - i * 0.5), cv = (Q.v0 + Q.v1) / 2 + Math.sin(a * 1.3) * (3.4 - i * 0.6), du = -Math.sin(a) * 0.9, dv = Math.cos(a * 1.3) * 0.6, l = Math.hypot(du, dv) || 1, ux = du / l, vx = dv / l, z = Q.z + 0.03, col = i === 0 ? '#e8804a' : '#2a5a6a'; m.quad([cu + ux * 0.7, cv + vx * 0.7, z], [cu - vx * 0.22, cv + ux * 0.22, z], [cu - ux * 0.5, cv - vx * 0.5, z], [cu + vx * 0.22, cv - ux * 0.22, z], col, 0); } });
    if (o.drag && PP.FURN) inFrame(m, frameOf(o.drag.room || 'living'), () => PP.FURN.build(m, [o.drag], { S: FS, zOf: (it) => Z[roomLv(it.room || 'living')], pinkBed: o.pinkBed, idx: () => -1 }));
    return m;
  }
  const FALL = mW('cistern', (POOL_L.u0 + POOL_L.u1) / 2, MD.cistern.r[3] + 0.3);
  const DECK = { v1: DK.v1 };
  PP.FORT = { roomH, joinRuns, FALL, MODS, MD, inMod, plotStand, plotC, hiveStand, mailStand, tapStand, HIVE_Z, toW, toL, frameOf, rectObs, wBox, Z, NAME, WH, FS, DECK, CEN, inDeck, ROOMS, RM, OPEN, PASS, ENTRIES, RAMPS, PLOTS, PS, POOL, FISH, BOB, HIVES, MAILB, TAP, LAMPS, SLOTS, BALLOON, NEST, GPOTS, FIX, PK, AREA, WING_ROOTS, build, dyn, roomAt, roomLv, floorAt, inRoom, bbox, C, shade };
})();
