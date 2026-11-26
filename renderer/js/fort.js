// 城堡 2.0：整座岛就是一座东拼西凑的移动城堡。只建一次——外面看到的每一栋歪房子、每一坨铁身子，就是里面的一间屋。
// 外部视角：全部画出来。内部视角（剖切）：选一层，这层以上拿掉，这层朝镜头那边的墙压矮，就能看进屋里。转视角时压矮的墙跟着换。
// 结构（从下往上）：
//   铁身子 A（左后，圆的，四层）：锅炉房 → 门厅 → 工作间 → 驾驶室（顶上扣着铁圆顶），楼梯就在它肚子里一路往上
//   铁身子 B（右后，圆的，三层）：水泵间 → 储藏间 → 浴室（顶上架着铜水塔）
//   中间叠着的木头房子：厨房 → 起居室（左右悬出去）→ 卧室（再错一截，尖顶）
//   左边叠着的：柴房 → 图书室 → 阁楼仓库
//   餐厅一层，屋顶是屋顶花园（热气球停在这儿）；花房是甲板上的玻璃屋
//   甲板就是城堡的一层：田、林中湖（湖底是一座被遗弃的古城）、蜂箱、信箱都在甲板上；甲板下面是铆钉铁皮的船体和发蓝光的浮岩
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
  /* 配色「林间白石城」：石灰白的墙、浅色石头的圆塔（长着苔藓）、石板蓝和苔绿的屋顶、生了铜绿的铜件、深胡桃木、白色的翅膀。
     整体是森林里的淡色石头房子：颜色不抢，靠绿植、暖灯、花点缀 */
  const C = {
    CREAM: '#f7ebd0', CREAM2: '#ecd8b4', STONE: '#dcc9a2', STONE2: '#b59c74', BRICK: '#c49478', IRON: '#9a978c', IRON2: '#7e7c74', RUST: '#9a8268', RUST2: '#857058', COP: '#78a89a', COP2: '#628f84',
    TILE: '#6283a0', TILE2: '#56758f', SHING: '#c08066', TIMBER: '#5c3b26', WOOD: '#c29a6c', WOOD2: '#a9845c', GOLD: '#d8bc78', GLASS: '#cce6ee', WING: '#f4f0e6', WING2: '#d6cfbf', PLANK: '#a8805a', MOSS: '#86a868',
    TOWER: '#e8d8b4', TOWER2: '#d6c39c',
  };

  // ---------- 房间 ----------
  const R = (id, nm, lv, o) => Object.assign({ id, nm, lv, out: C.CREAM, om: M.plaster, in: '#efe0c4', im: M.wallpaper, fl: C.WOOD, fm: M.plank, h: WH }, o);
  // ---------- 古树水城：房间（施工图 docs/古树水城-施工图.md） ----------
  // 房间都是圆的木头小屋，围着大树，贴着树腰回廊；有的一摞摞叠起来（下面那间的屋顶就是上面那间的地板）
  const D2R = Math.PI / 180, TC = [24, 24], polarW = (deg, rc) => [TC[0] + Math.cos(deg * D2R) * rc, TC[1] + Math.sin(deg * D2R) * rc];
  const A = TC, B = TC; // 老代码里的塔心：现在就是树心
  const GAL = { 1: 11.5, 2: 11, 3: 11 }; // 树腰回廊的外半径（L1 树脚平台、L2、L3）
  const TRUNK = { r: 8, hole: 6, post: 1.6 };
  const POD = (id, nm, lv, deg, rad, o = {}) => { const rc = o.rc != null ? o.rc : GAL[lv] + rad - 0.6, [u, v] = polarW(deg, rc); return R(id, nm, lv, Object.assign({ c: [u, v, rad], r: [u - rad, v - rad, u + rad, v + rad] /* 外接正方形：给按长方形算的家具代码用 */, deg, rc, pod: true, out: '#f7ebd0', om: M.plaster, in: '#f0d6a8', im: M.plaster, fl: '#b88a5a', fm: M.plank, roof: 'cone', h: 11 }, o)); };
  const ROOMS = [
    POD('hall', '门厅', 1, 90, 5.5, { fl: '#9a8a78', fm: M.stone }),
    POD('kitchen', '厨房', 1, 36, 5, { rc: 15.9, h: WH, fl: '#c8b098', fm: M.tile }),
    POD('dining', '餐厅', 1, 0, 5, { rc: 15.9 }),
    POD('laundry', '洗衣房', 1, -54, 4.5, { in: '#e8f0f0', im: M.tile, fl: '#9aa8a8', fm: M.tile }),
    POD('store', '地窖', 1, -126, 5.5, { h: WH, flat: true, out: '#c8bea6', om: M.stone, in: '#d8c8a8', im: M.stone, fl: '#8a7e6a', fm: M.stone }),
    POD('shed', '柴房', 1, 143, 4.5, { rc: 15.4, out: '#9a7652', om: M.plank, in: '#c8a878', im: M.plank, fl: '#7a5a3e' }),
    POD('workshop', '工坊', 1, 180, 6, { rc: 16.9, h: WH, in: '#e0ccb0', im: M.plank, fl: '#a8845a' }),
    POD('green', '温室', 1, 115, 5.5, { rc: 23.5, glass: true, noShell: true, fl: '#9a8a70', fm: M.stone, h: 9.5 }),
    POD('living', '起居室', 2, 180, 6, { rc: 16.9, shut: '#4a7a6a' }),
    POD('library', '图书室', 2, 36, 5, { rc: 15.9, h: WH, in: '#d9b98a', fl: '#8a5e3c' }),
    POD('bedroom', '卧室', 3, -90, 6, { in: '#f3d8c4' }),
    POD('bath', '浴室', 3, -126, 5.5, { rc: 16.4, stilts: true, in: '#cfe6ee', im: M.tile, fl: '#d8e8ec', fm: M.tile }),
    POD('attic', '阁楼', 3, 36, 5, { rc: 15.9, out: '#d8c4a0', om: M.plank, in: '#d8c4a0', im: M.plank, fl: '#9a7a58' }),
    POD('cockpit', '驾驶室', 3, 135, 5, { rc: 15.4, in: '#e6cfa4', fl: '#7a5a3e' }),
  ];
  const RM = {}; ROOMS.forEach((r) => { RM[r.id] = r; if (r.rot) r.rot *= Math.PI / 180; });
  const TERRACE = { lv: 2, c: RM.store.c.slice(0, 2), r0: 0, r1: RM.store.c[2] + 0.2 }; // 地窖的平屋顶 = 二层的小平台（蜂箱、长椅、鸟巢）
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
  const RAMP = null; // 塔楼直楼梯没有了
  /* 树心螺旋楼梯：踏步在半径 1.8～5.6 的环带里，一层转 450°（坡度约 27°），两头各留 ±12° 的平台；门开在平台那个方向的树干壁上 */
  const spiral = (a, b, deg0) => { const a0 = (deg0 + 12) * D2R, a1 = (deg0 + 438) * D2R, mid = 3.7, P2 = (deg, r) => polarW(deg, r);
    return { spiral: true, a, b, cu: TC[0], cv: TC[1], r0: 1.8, r1: 5.6, ang0: a0, ang1: a1, deg0, u0: TC[0] - 5.6, v0: TC[1] - 5.6, u1: TC[0] + 5.6, v1: TC[1] + 5.6,
      landA: P2(deg0, mid), landB: P2(deg0 + 450, mid), doorA: P2(deg0, 9.6), doorB: P2(deg0 + 450, 9.6) }; };
  const RAMPS = [spiral(1, 2, 90), spiral(2, 3, 180)];
  // 环形 / 圆形的地面：三层树腰回廊；地窖屋顶的平台（L2）
  const RINGS = [TERRACE, { lv: 1, c: TC, r0: TRUNK.r - 0.1, r1: GAL[1] }, { lv: 2, c: TC, r0: TRUNK.r - 0.1, r1: GAL[2] }, { lv: 3, c: TC, r0: TRUNK.r - 0.1, r1: GAL[3] }];
  // ---------- 斜插的小屋：都是真的小房间，从大房间的墙上开个门走进去 ----------
  // 地板跟大房间一样平（所以能走），墙和屋顶往外歪着长、整间再斜着转一点，底下用斜撑托着
  // [大房间, 哪面墙 / 圆房间的角度, 墙上的位置 0~1, 宽（沿墙）, 进深（往外）, 高, 往外歪, 往旁边歪, 额外斜转, 墙色, 顶色, 名字, 用途]
  const HUT_SPEC = [ // 圆房间：第二项是朝外的角度（弧度）
    ['living', 220 * D2R, 0, 4.6, 4, 8, 0, 0, 0, '#e8d0b8', C.SHING, '起居室的小凸窗间', 'sit'],
    ['bedroom', -48 * D2R, 0, 5, 4.4, 8.4, 0, 0, 0, '#e8d0b8', C.TILE, '卧室的小书房', 'read'],
    ['attic', 80 * D2R, 0, 4.6, 4, 7.6, 0, 0, 0, C.CREAM2, C.TILE, '阁楼的观景窗', 'sit'],
    ['library', -6 * D2R, 0, 4.6, 4, 7.4, 0, 0, 0, C.CREAM, C.SHING, '图书室的读书角', 'read'],
    ['dining', -60 * D2R, 0, 4.8, 4.2, 8, 0, 0, 0, '#e2cdb0', C.TILE2, '餐厅的茶水间', 'drink'],
    ['workshop', 218 * D2R, 0, 5, 4.4, 8.4, 0, 0, 0, C.CREAM2, C.TILE, '工作间的零件仓', 'rummage'],
    ['cockpit', 180 * D2R, 0, 4.4, 4, 7.4, 0, 0, 0, C.CREAM, C.TILE2, '驾驶室的小画室', 'read'],
    ['cockpit', 135 * D2R, 0, 4.4, 4.2, 9, 0, 0, 0, '#e8d0b8', C.TILE2, '瞭望小屋', 'sit'],
    ['cockpit', 92 * D2R, 0, 4.2, 4, 7.4, 0, 0, 0, C.CREAM2, C.TILE, '海图室', 'read'],
    ['hall', 28 * D2R, 0, 4.8, 4.2, 8, 0, 0, 0, C.CREAM, C.TILE2, '门厅的雨具间', 'rummage'],
    ['bath', -166 * D2R, 0, 4.4, 4, 7.4, 0, 0, 0, C.CREAM, C.SHING, '浴室的蒸汽间', 'sit'],
    ['store', -84 * D2R, 0, 4.6, 4, 7.6, 0, 0, 0, C.CREAM2, C.SHING, '储藏间的腌菜间', 'rummage'],
  ];
  const HUTS = [], HUT_PASS = [];
  /* 贴在大房间外墙上的 12 个小隔间：每一间按名字单独布置（见 hutInterior），想临时关掉哪些就把要留的名字放进 HUT_KEEP */
  const HUT_KEEP = null; // null = 全部都要（小隔间是城堡的灵魂：凌乱、别有洞天）
  HUT_SPEC.filter((h) => !HUT_KEEP || HUT_KEEP.has(h[11])).forEach(([pid, side, t, w, d, h, lu, lv2, yx, wc, rc, nm, use], k) => {
    h = Math.max(h, 10.4); // 小隔间至少 10.4 高：人站着（7.8）能进去，屋檐也高过从外面走过的人的头
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
  // 室外的台子：码头（门厅南边，伸过水面搭到岩顶上）、两块梯田菜地（东南，在古城的台阶街上，沿着树的方向转）
  const rectAt = (deg, rc, hl, hw) => { const [u, v] = polarW(deg, rc); return [u - hl, v - hw, u + hl, v + hw]; };
  const MODS = [
    { id: 'dock', name: '码头', lv: 1, r: [22.2, 45.4, 25.8, 56.5], kind: 'dock' },
    { id: 'farmA', name: '梯田菜地', lv: 1, r: rectAt(7, 24.6, 6.95, 3.6), rot: 97, kind: 'farm' },
    { id: 'farmB', name: '梯田菜地', lv: 1, r: rectAt(42, 24.6, 6.95, 3.6), rot: 132, kind: 'farm' },
    /* 菜园栈道（0.30）：从码头往东一条木栈道直通菜地，出门几步就到（以前要从厨房、餐厅后门绕） */
    { id: 'walk1', name: '菜园栈道', lv: 1, r: [25.6, 48.4, 37.4, 50.6], kind: 'walk', rails: ['v1'] },
    { id: 'walk2', name: '菜园栈道', lv: 1, r: [33.6, 42.6, 38.2, 50.6], kind: 'walk', rails: ['u1'], railFrom: 47.4 }, // 北头接到菜地靠树那一侧的小路口
  ];
  const MD = {}; MODS.forEach((q) => { MD[q.id] = q; if (q.rot) q.rot *= Math.PI / 180; });
  const mFrame = (q) => (q.fr ? frameOf(q.fr) : q.rot ? q : null);
  const inMod = (q, u, v, m = 0) => { [u, v] = toL(mFrame(q), u, v); return u >= q.r[0] + m && u <= q.r[2] - m && v >= q.r[1] + m && v <= q.r[3] - m; };
  // 门洞 / 走廊：fr 是它所在的房间（跟着那间房一起转）；两间转法不同的房间之间的门，两边各放一段
  const P = (lv, r, walls, fr) => ({ lv, r, walls: walls || null, fr: fr || null });
  // 门：树干上三扇（每层楼梯平台那个方向）；每间小屋朝树的那一面一扇（通回廊）；挨着的两间之间一扇；门厅南门通码头
  const sq = ([u, v], h = 1.3) => [u - h, v - h, u + h, v + h];
  const mid2 = (a, b) => [(RM[a].c[0] + RM[b].c[0]) / 2, (RM[a].c[1] + RM[b].c[1]) / 2];
  const PASS = [
    P(1, [22.7, 29.4, 25.3, 32.6]), P(2, [15.4, 22.7, 18.6, 25.3]), P(3, [22.7, 15.4, 25.3, 18.6]),
    ...ROOMS.filter((r) => r.pod && !r.noShell).map((r) => P(r.lv, sq(polarW(r.deg, r.rc - r.c[2] + 0.1), 1.35))),
    P(1, sq(mid2('kitchen', 'dining'))), P(3, sq(mid2('bedroom', 'bath'))), P(1, sq(mid2('hall', 'green'), 1.4)),
    P(1, [22.7, 44.8, 25.3, 47.2]),
    P(1, sq(polarW(40, 20.9), 1.35)), P(1, sq(polarW(6, 20.9), 1.35)), // 厨房、餐厅的后门：直通梯田（摘了菜就进厨房）
  ];
  for (const [lv, q, wl, fr] of HUT_PASS) PASS.push(P(lv, q, wl, fr));
  PASS.forEach((p) => (p.F = p.fr ? frameOf(p.fr) : null));
  // 露天的地方：屋顶花园跟着餐厅转，卧室阳台跟着卧室转
  const OPEN = []; // 屋顶花园、卧室阳台都没有了（现在是树腰回廊和地窖屋顶的平台）
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
  const CROP_TAG = { carrot: '#f08a3a', berry: '#e8405a', corn: '#ffd36a', sunflower: '#f6c43a', pumpkin: '#f2832a', tomato: '#e0402a', cabbage: '#9ad070', melon: '#3f8a44', tulip: '#f2a6c2' };
  const PLOTS_L = [0, 1, 2].map((k) => { const q = MODS[1]; return ['farmA', q.r[0] + 0.25 + k * 4.5, q.r[1] + 0.2]; }).concat([0, 1, 2].map((k) => { const q = MODS[2]; return ['farmB', q.r[0] + 0.25 + k * 4.5, q.r[1] + 0.2]; })); // 两块梯田，每块 3 格，站位在靠树的那边
  const PLOTS = PLOTS_L.map(([id, u, v]) => mW(id, u, v));
  const plotStand = (i) => mW(PLOTS_L[i][0], PLOTS_L[i][1] + PS / 2, PLOTS_L[i][2] + PS + 1.1);
  const plotC = (i) => [...mW(PLOTS_L[i][0], PLOTS_L[i][1] + PS / 2, PLOTS_L[i][2] + PS / 2), 2.4];
  // 林中湖（模块 id 还叫 cistern，老存档、伙伴的去处都认这个名字）
  // 林中湖：形状是一圈不规则的圆，水面比岸低一点，湖底 19 格深
  // 古树水城：水 = 整个盆地（第①步底层在 fort_city.js）
  const CITY = PP.CITY, LAKE = CITY ? { u: CITY.CEN[0], v: CITY.CEN[1], rx: CITY.RB, ry: CITY.RB, z: CITY.WL, bot: CITY.FLOOR } : { u: 42.4, v: 37.9, rx: 6.8, ry: 7.0, z: -0.8, bot: -19 };
  const lakeR = (a) => 1 + 0.07 * Math.sin(3 * a + 1.3) + 0.05 * Math.sin(5 * a + 0.4);
  const inLake = CITY ? (u, v, m = 0) => CITY.inBasin(u, v, m) : (u, v, m = 0) => { const x = (u - LAKE.u) / LAKE.rx, y = (v - LAKE.v) / LAKE.ry; return Math.hypot(x, y) < lakeR(Math.atan2(y, x)) - m / 7; };
  // 每间圆屋子自己的方向：f 往外（背对大树），s 往右；家具、陈设都按这个摆
  const lp = (id, f, s2) => { const r = RM[id], a = r.deg * D2R; return [r.c[0] + Math.cos(a) * f - Math.sin(a) * s2, r.c[1] + Math.sin(a) * f + Math.cos(a) * s2]; };
  const lb = (id, f, s2, hf, hs) => { const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => lp(id, f + x * hf, s2 + y * hs)); return [Math.min(...P.map((q) => q[0])), Math.min(...P.map((q) => q[1])), Math.max(...P.map((q) => q[0])), Math.max(...P.map((q) => q[1]))]; };
  // 钓鱼：码头东边的水面（岸边那段码头上站着，往东抛）
  const POOL_L = CITY ? { u0: CITY.POND.u0, v0: CITY.POND.v0, u1: CITY.POND.u1, v1: CITY.POND.v1 } : { u0: 26.6, v0: 40.5, u1: 33.5, v1: 49 }; // 0.36：只有古城之池能钓鱼
  const POOL = { z: LAKE.z, lv: 1 };
  const FISH = CITY ? { lv: 1, u: 22.6, v: 9.6 } : { lv: 1, u: 25.4, v: 47.4 }, BOB = CITY ? { u: 22.8, v: 6.2 } : { u: 29.6, v: 46.8 };
  // 蜂箱：地窖屋顶上的平台（L2，挨着回廊）
  const HIVES_L = [lp('store', 3.0, -2.4), lp('store', 3.0, 2.0)];
  const HIVES = HIVES_L, HIVE_Z = Z[2];
  const hiveStand = () => lp('store', 0.2, -1.2);
  const MAILB = (([u, v]) => ({ u, v }))([22.6, 52.6]), TAP = (([u, v]) => ({ u, v }))([25.5, 53.6]);
  const mailStand = () => [MAILB.u + 1.4, MAILB.v - 0.6], tapStand = () => [TAP.u - 1.4, TAP.v - 0.6];
  const LAMPS = [[22.4, 49.2], [25.6, 49.2], polarW(64, 11.1), polarW(-152, 11.1)];
  const SLOTS = [20, 62, 124, 160, -30, -100].map((d) => polarW(d, 10.1));
  // 热气球停在码头尽头；鸟巢在地窖屋顶平台的角上
  const BAL_L = { u: 24, v: 55.2 }, NEST_L = (([u, v]) => ({ u, v }))(lp('store', -1.6, -3.4));
  const BALLOON = { u: BAL_L.u, v: BAL_L.v }, NEST = { u: NEST_L.u, v: NEST_L.v };
  const GPOTS = [lp('green', 1.8, 2.6), lp('green', -0.6, 2.6), lp('green', 1.8, -0.4), lp('green', -0.6, 0.2)];
  const PK = { balloon: 6, fish: 8, mail: 3, tap: 4, hive: 12, plot: 20, deco: 30, lamp: 10, nest: 13, lift: 170, relic: 180, shrine: 175 };
  /* 吊篮：挂在树干外面（θ72°，楼梯门旁边），一、二、三层回廊上各一站；坐上去直接到别的层（从高处掉下来不用绕一大圈走回去） */
  /* 古城遗物：八件东西散在水下古城的地标前面，发着微光，潜下去才拿得到（像原神的宝箱、塞尔达的呀哈哈）；拿了就记进 E().relics */
  const RELICS = (() => { if (!PP.CITY) return []; const Cc = PP.CITY, L2 = Cc.LM, at = (deg, r) => { const u = TC[0] + Math.cos(deg * D2R) * r, v = TC[1] + Math.sin(deg * D2R) * r; return [u, v, Cc.groundZ(u, v) + 0.4]; };
    return [['candle', '教堂的银烛台', '烛台底下刻着一行小字：「愿灯火替我们守着这座城。」', 'cath', '#e8eef8'], ['seal', '市政厅的铜印章', '印章上是一棵大树——原来这座城的城徽就是头顶这棵古树。', 'hall', '#e0a050'],
      ['shield', '领主的家徽盾', '盾上画着一块浮在云上的石头，下面写着「它托起了我们」。', 'keep', '#c8504a'], ['jar', '集市的钱罐', '罐子里是一枚枚刻着鱼的小铜币——那时候大家也拿小鱼干当钱吗？', 'mkt', '#d8b050'],
      ['bell', '圆殿里的钟锤', '钟锤上缠着水草。据说城沉下去那天，钟一直响到最后——后来有人把它搬进了圆殿，放在正中间。', 'rotunda', '#b0a080'], ['astro', '天文台的星盘', '星盘上的星星连起来，正好是今晚头顶的那几颗。', 'obs', '#90c0f0'],
      ['boat', '桥下的船铃', '小船早就朽了，只剩一个铃。摇一下，声音在水里传得很远。', 'bridge', '#a0d0c0'], ['shard', '浮石的碎片', '一小块会发光的石头，轻得像羽毛——就是它让整座岛浮在天上。', null, '#7fd8ff']].map(([id, nm, desc, lmK, col], i) => {
      const p = lmK === 'rotunda' ? [Cc.ROTUNDA.u, Cc.ROTUNDA.v, Cc.groundZ(Cc.ROTUNDA.u, Cc.ROTUNDA.v) + 3.2] : lmK ? at(L2[lmK][0], L2[lmK][1] - (lmK === 'obs' ? 9.5 : lmK === 'mkt' ? 0 : 4)) : at(Cc.CRACK.t, Cc.CRACK.r - 2.4); return { i, id, nm, desc, col, u: p[0], v: p[1], z: p[2] }; }); })();
  const GAL_LAMPS = () => { const out = []; for (const lv of [1, 2, 3]) { const R1 = GAL[lv], gaps = ROOMS.filter((q) => q.pod && q.lv === lv && !q.noShell).map((q) => q.deg * D2R).concat(lv === 2 ? [RM.store.deg * D2R] : []).concat([72 * D2R]);
      for (let i = 4; i < 48; i += 8) { const am = ((i + 0.5) / 48) * 6.2832; if (gaps.some((g) => Math.abs(Math.atan2(Math.sin(am - g), Math.cos(am - g))) < 0.24)) continue; out.push([TC[0] + Math.cos(am) * (R1 - 0.15), TC[1] + Math.sin(am) * (R1 - 0.15), Z[lv] + 4.85]); } } return out; };
  /* 神龛（0.36）：岛西边草地上一座小小的石台神龛，朝着大树；里面供着一尊小佛像，前面一张供桌、一只铜香炉、一块挂许愿牌的木架。
     平时来这里上香、许愿，愿望实现了回来还愿（互动在 island.js 的 shrinePop） */
  const SHRINE = { u: 4.2, v: 31.4 };
  const LIFT = { deg: 72, r: 9.55, stops: [1, 2, 3] }; LIFT.u = TC[0] + Math.cos(LIFT.deg * D2R) * LIFT.r; LIFT.v = TC[1] + Math.sin(LIFT.deg * D2R) * LIFT.r;
  const TREES_L = [];
  const PLOT_OB = PLOTS_L.flatMap(([id, u, v]) => rectObs(mFrame(MD[id]), 1, [u, v, u + PS, v + PS]));
  const FIXED = [...PLOT_OB, ...HIVES.map(([u, v]) => [2, 'c', u, v, 1.2]), [1, 'c', MAILB.u, MAILB.v, 0.6], [1, 'c', TAP.u, TAP.v, 0.8], ...LAMPS.map(([u, v]) => [1, 'c', u, v, 0.35]), [2, 'c', NEST.u, NEST.v, 1.2], [1, BAL_L.u - 1.6, BAL_L.v - 1.4, BAL_L.u + 1.6, BAL_L.v + 1.4]];

  // ---------- 屋里的固定陈设 ----------
  const FIX = [];
  const fx = (room, id, at, d, label, cur, ob, o) => FIX.push(Object.assign({ room, id, at, do: d, label, cur, ob: ob || [] }, o));
  fx('hall', 140, lp('hall', 0, -2.6), 'sit', '门厅长凳：坐一会儿', 'rest', [lb('hall', 0, -4.3, 2, 0.6)], { spot: (([u, v]) => ({ u, v, dz: 2.8 }))(lp('hall', 0, -4.3)) });
  fx('kitchen', 141, lp('kitchen', 1.9, -1.5), 'cookp', '灶台：做菜（打开菜谱）', 'cook', [lb('kitchen', 3.7, -1.5, 0.8, 1.2)]);
  fx('kitchen', 142, lp('kitchen', 1.9, 1.5), 'drink', '水槽：喝口水', 'water', [lb('kitchen', 3.7, 1.5, 0.8, 1.0)]);
  fx('dining', 143, lp('dining', -1.6, 0), 'dine', '餐桌：吃一份做好的菜', 'cook', [lb('dining', 0.8, 0, 1.3, 2.4)]);
  fx('library', 145, lp('library', 2.2, 0), 'dex', '书架：翻图鉴（植物、特产、钓鱼）', 'use', [lb('library', 4.1, 0, 0.6, 2.8)]);
  fx('library', 146, lp('library', 0.6, 2.0), 'read', '阅读椅：坐着看书', 'rest', [lb('library', 1.0, 3.2, 0.9, 0.9)]);
  fx('bath', 144, lp('bath', -0.4, 0), 'bath', '浴缸：洗个泡泡澡（水是树冠里接的雨水）', 'use', [lb('bath', 2.4, 0, 1.6, 2.2)]);
  fx('workshop', 147, lp('workshop', 2.8, 0), 'craft', '工作台：用收成做东西', 'use', [lb('workshop', 4.5, 0, 0.8, 2.6)]);
  fx('store', 148, lp('store', 2.6, 1.8), 'store', '种子柜：看看背包里的东西', 'use', [lb('store', 4.3, 1.8, 0.6, 1.5)]);
  fx('store', 152, lp('store', 2.0, -2.0), 'stoke', '石炉：添柴（全屋的热水和暖气都靠它）', 'use', [lb('store', 3.7, -2.4, 0.9, 1.0)]);
  fx('attic', 149, lp('attic', 1.6, 1.4), 'rummage', '旧木箱：翻一翻（说不定有小鱼干）', 'use', [lb('attic', 3.3, 1.4, 0.9, 1.3)]);
  fx('cockpit', 151, lp('cockpit', 0.4, 0), 'helm', '舵轮：看看城堡往哪飘', 'use', [lb('cockpit', 2.2, 0, 0.8, 1.2)]);
  fx('cockpit', 158, lp('cockpit', 2.0, -2.0), 'tele', '望远镜：看看天上', 'use', [lb('cockpit', 3.3, -2.5, 0.5, 0.5)]);
  fx('shed', 155, lp('shed', 0.5, 0), 'wood', '柴堆：抱一捆柴去地窖的石炉', 'use', [lb('shed', 2.5, 0, 1.2, 2.6)]);
  fx('green', 156, lp('green', 2.4, -2.4), 'drink', '温室的水桶：喝口水', 'water', [lb('green', 3.4, -2.8, 0.5, 0.5)]);
  fx('green', 157, lp('green', 2.8, 1.0), 'tend', '花架：照看花草', 'water', [lb('green', 4.3, 1.0, 0.45, 1.8)]);
  fx('green', 165, lp('green', 0.6, -3.6), 'valve', '暖气阀门（点开调）', 'use', [lb('green', 0.6, -4.7, 0.3, 0.3)]);
  fx('garden', 159, lp('store', 1.0, 3.2), 'sit', '平台长椅：晒太阳', 'rest', [lb('store', 1.0, 4.4, 1.8, 0.4)], { spot: (([u, v]) => ({ u, v, dz: 2.6 }))(lp('store', 1.0, 4.4)) });
  fx('garden', PK.nest, lp('store', -0.8, -2.4), 'nest', '鸟巢：野鸟偶尔会留下一个蛋', 'use', []);
  fx('bedroom', 166, lp('bedroom', 1.6, -1.2), 'sleep', '卧室的床：睡一觉', 'rest', [lb('bedroom', 3.7, 0, 1.3, 2.4)], { spot: (([u, v]) => ({ u, v, dz: 2.2 }))(lp('bedroom', 3.6, 0)) });
  fx('laundry', 167, lp('laundry', 1.0, 0), 'wash', '洗衣盆：搓搓洗洗', 'use', [lb('laundry', 2.7, 0, 0.9, 1.3)]);
  GPOTS.forEach(([u, v], i) => fx('green', 160 + i, [u - 1.4, v], 'pot', '花盆', 'water', [[u - 0.9, v - 0.9, u + 0.9, v + 0.9]], { i }));
  const HUT_ACT = {
    '起居室的小凸窗间': { act: '窝在窗台上看云' }, '卧室的小书房': { act: '在书桌前写写画画' }, '阁楼的观景窗': { act: '抱着毯子窝在窗台上，数星星' }, '图书室的读书角': { act: '窝进扶手椅看书' },
    '餐厅的茶水间': { act: '泡一壶茶' }, '工作间的零件仓': { act: '在零件盒里找螺丝' }, '驾驶室的小画室': { act: '画一幅画' }, '瞭望小屋': { act: '拿望远镜看看远处' },
    '海图室': { act: '看看海图，城堡飘到哪儿了' }, '门厅的雨具间': { act: '穿雨衣、拿把伞' }, '浴室的蒸汽间': { act: '蒸一蒸，暖洋洋' }, '储藏间的腌菜间': { act: '尝一口腌菜' },
  };
  HUTS.forEach((r, k) => { const [a, b, c, d] = r.r, cv = (b + d) / 2, use = r.use === 'drink' ? 'drink' : r.use; fx(r.id, 110 + k, [a + 1.3, cv], use, r.nm + '：' + ((HUT_ACT[r.nm] || {}).act || (use === 'sit' ? '坐在窗边' : use === 'read' ? '看看书' : use === 'drink' ? '喝口水' : '翻一翻')), use === 'sit' ? 'rest' : 'use', [[c - 1.4, b + 0.3, c - 0.3, d - 0.3]], use === 'sit' ? { spot: { u: c - 0.8, v: cv, dz: 2.0 } } : undefined); });
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
    for (const q of MODS) if (q.lv === lv && inMod(q, u, v, 0.45)) { if (q.kind === 'pool' && inLake(u, v, -0.7)) continue; return true; } // 湖里不算地面（伙伴不往水里走）
    for (const r of ROOMS) if (r.lv === lv && inRoom(r, u, v)) return true;
    for (const o of OPEN) if (o[0] === lv && inOpen(o, u, v)) return true;
    for (const g of RINGS) if (g.lv === lv) { const d = Math.hypot(u - g.c[0], v - g.c[1]); if (d >= g.r0 && d <= g.r1) return true; } // 树腰回廊、地窖屋顶平台、树心楼梯的落脚台
    if (CITY && lv === 1 && CITY.inBasin(u, v, 0.4) && !CITY.inPond(u, v, 1.1) && Math.hypot(u - TC[0], v - TC[1]) > 7.6) return true; // 0.36：盆地填成地面了，伙伴也能在地上走
    return passAt(lv, u, v);
  }
  // 量一圈：每个方向上最远的东西有多远，甲板就伸到那儿再多一点；顶点之间是直边，所以甲板是一块块折出来的
  function makeDeck() {
    if (CITY) { POLY = []; for (let k = 0; k < 120; k++) { const t = (k / 120) * Math.PI * 2, r = CITY.rimR(t); POLY.push([CEN[0] + Math.cos(t) * r, CEN[1] + Math.sin(t) * r]); } JETS = []; return; } // 古树水城：甲板的边就是岛的岩顶外沿
    const S = [], add = (u, v, pad = 0) => S.push([u, v, pad]);
    for (const r of ROOMS) { if (r.lv > 1 || r.id === 'green') continue; if (r.c) { for (let i = 0; i < 24; i++) add(r.c[0] + Math.cos(i / 24 * 6.2832) * r.c[2], r.c[1] + Math.sin(i / 24 * 6.2832) * r.c[2], 0.6); continue; } const fr = r.rot ? r : null, [a, b, c, d] = r.r; for (let k = 0; k <= 6; k++) { const t = k / 6; for (const q of [[a + (c - a) * t, b], [a + (c - a) * t, d], [a, b + (d - b) * t], [c, b + (d - b) * t]]) add(...toW(fr, ...q), -2.6); } }
    for (const p of PASS) if (p.lv === 1) { const q = wBox(p.F, p.r); add(q[0], q[1], -1.5); add(q[2], q[3], -1.5); add(q[0], q[3], -1.5); add(q[2], q[1], -1.5); }
    { const [a, b, c, d] = MD.cistern.r; for (const [u, v] of [[a, b], [c, b], [a, d], [c, d], [(a + c) / 2, d], [c, (b + d) / 2]]) add(u, v, -1.2); } // 湖也在甲板上
    add(4.2, -4.6, 4); // 守护树的树脚也要落在船体上
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
    JETS = []; // 栈桥早就不画了，原来还偷偷算作能走的地方（宠物会走到半空）：不再算
  }
  makeDeck();
  // 栏杆（局部坐标，跟着花园 / 阳台转）
  const PARA = []; // 老的屋顶花园 / 卧室阳台的石栏杆都没有了
  const PARA_OB = PARA.flatMap((q) => rectObs(frameOf(q[5]), q[0], q.slice(1, 5)));
  // 第一人称用：每个挡路的东西有多高（墙挡死；栏杆跳起来能翻过去；菜地、家具这类能跳上去站着）
  const SOLID_H = (o) => (o[1] === 'c' && o[4] < 0.5 ? 9 : 3);
  const solid = (extra) => [
    ...[0, 1, 2, 3].flatMap((l) => wallObs(l).map((o) => ({ o, h: WH - 0.2, wall: 1 }))),
    ...PARA_OB.map((o) => ({ o, h: 2.4, rail: 1 })),
    ...FIXED.map((o, i) => ({ o, h: i < PLOT_OB.length ? 1.1 : SOLID_H(o) })),
    ...FIX.flatMap((f) => f.ob.map((b) => ({ o: [f.lv, ...b], h: 3 }))),
    ...TREES_L.map(([id, u, v]) => { const w = mW(id, u, v); return { o: [MD[id].lv, 'c', w[0], w[1], 0.75], h: 12, wall: 1 }; }),
    ...(MD.pergola ? [{ o: [2, 'c', ...mW('pergola', -3.4, 15.2), 0.6], h: 7, wall: 1 }] : []),
    ...(extra || []).map((o) => ({ o, h: SOLID_H(o) })),
  ];
  const AREA = { z: Z, inF: floorAt, ramps: RAMPS, solid, obst: (extra) => [...wallObs(0), ...wallObs(1), ...wallObs(2), ...wallObs(3), ...PARA_OB, ...FIXED, ...FIX.flatMap((f) => f.ob.map((b) => [f.lv, ...b])), ...(extra || [])] };

  // ---------- 画 ----------
  const showLv = (cut, lv) => !cut || lv <= cut.lv;
  const LOW = (cut) => (cut && cut.low != null ? cut.low : 2.2); // 朝镜头那面墙压到多高（详细视图里几乎全拆掉）
  const facing = (cut, nu, nv) => !!cut && nu * cut.vu + nv * cut.vv > 0.01;
  const roomH = (r) => (r.h || WH);
  // ---------- 温暖、塞得满满的手工小屋风格：每面墙没门窗的空段（放壁炉、置物架用） ----------
  const SPANS = {};
  function wallSpans(r, noWin) {
    const key = r.id + (noWin ? '#' : ''); if (SPANS[key]) return SPANS[key]; const out = []; if (r.c || r.glass) return (SPANS[key] = out);
    const fr = r.rot ? r : null, [u0, v0, u1, v1] = r.r;
    const minus = (lo, hi, cuts) => { let segs = [[lo, hi]]; for (const [s0, e0] of cuts) segs = segs.flatMap(([x, y]) => (e0 <= x || s0 >= y ? [[x, y]] : [[x, s0], [e0, y]].filter(([p0, q0]) => q0 - p0 > 0.05))); return segs; };
    for (const [ax, at, a0, a1, nu, nv] of [['v', v0, u0, u1, 0, -1], ['v', v1, u0, u1, 0, 1], ['u', u0, v0, v1, -1, 0], ['u', u1, v0, v1, 1, 0]]) {
      const sg = ax === 'v' ? nv : nu, doors = sideHoles(r.lv, ax, at, a0, a1, fr), ext = exteriorParts(r, ax, at, a0, a1), wins = noWin ? [] : ext.flatMap(([a, b]) => windowsOn(r, ax, at, a, b, doors.map(([s0, e0]) => [s0, e0, 0, DOOR_H])));
      for (const [s0, e0] of minus(a0 + 0.6, a1 - 0.6, doors.map(([a, b]) => [a - 1.1, b + 1.1]).concat(wins.map((w) => [w[0] - 0.2, w[1] + 0.2])))) if (e0 - s0 > 1.3) out.push({ ax, at, sg, s: s0, e: e0, f: at - sg * (WT / 2) });
    }
    return (SPANS[key] = out);
  }
  // 壁炉：起居室、卧室各一个，砌在最长的一段空墙上
  const HEARTH = {};
  for (const id of ['living', 'bedroom']) { const r = RM[id]; if (!r || r.c) continue; for (const sp of wallSpans(r, true).filter((q) => q.e - q.s >= 3.6).sort((a, b) => (b.e - b.s) - (a.e - a.s))) { if (HEARTH[id]) break;
    const W2 = id === 'living' ? 2.5 : 1.5, d = 1.5, near = sp.f, far = sp.f - sp.sg * d, P = (a, b) => (sp.ax === 'v' ? [a, b] : [b, a]);
    /* 在这段墙上挑一个不碰到房间里固定摆设（床、桌子……）的位置 */
    const obs = FIX.filter((f) => f.room === id).flatMap((f) => f.obL || f.ob), hit = (cc) => obs.some((o) => { const rc2 = sp.ax === 'v' ? [cc - W2 - 0.2, Math.min(near, far) - 0.2, cc + W2 + 0.2, Math.max(near, far) + 0.2] : [Math.min(near, far) - 0.2, cc - W2 - 0.2, Math.max(near, far) + 0.2, cc + W2 + 0.2]; if (o[0] === 'c') return o[2] > rc2[0] - o[4] && o[2] < rc2[2] + o[4] && o[3] > rc2[1] - o[4] && o[3] < rc2[3] + o[4]; return o[2] > rc2[0] && o[0] < rc2[2] && o[3] > rc2[1] && o[1] < rc2[3]; });
    let c = null; for (let cc = sp.e - W2 - 0.2; cc >= sp.s + W2 + 0.2; cc -= 0.25) if (!hit(cc)) { c = cc; break; } if (c == null) continue;
    const rc = sp.ax === 'v' ? [c - W2, Math.min(near, far), c + W2, Math.max(near, far)] : [Math.min(near, far), c - W2, Math.max(near, far), c + W2];
    HEARTH[id] = { sp, c, W2, d, front: P(c, sp.f - sp.sg * (d + 1.4)), fire: P(c, sp.f - sp.sg * (d * 0.45)), rc };
    fx(id, id === 'living' ? 170 : 171, HEARTH[id].front, 'warm', '壁炉：烤烤火，暖和一下', 'rest', [rc]); const f = FIX[FIX.length - 1], fr = frameOf(id); f.lv = roomLv(id); f.F = fr; f.obL = f.ob; if (fr) { f.atL = f.at; f.at = toW(fr, ...f.at); f.ob = f.ob.flatMap((q) => rectObs(fr, null, q)); } } }
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
    const hr = typeof HEARTH !== 'undefined' && HEARTH[r.id] && HEARTH[r.id].sp.ax === ax && Math.abs(HEARTH[r.id].sp.at - at) < 0.01 ? HEARTH[r.id] : null;
    for (let i = 0; i < n; i++) { const c = a0 + (L * (i + 0.5)) / n; if (doors.some((d) => c > d[0] - 1.6 && c < d[1] + 1.6)) continue; if (hr && c > hr.c - hr.W2 - 1.2 && c < hr.c + hr.W2 + 1.2) continue; /* 壁炉那一段不开窗 */ const w = (i + r.lv + Math.round(at)) % 3 === 0 ? 0.7 : 0.95, top = tall ? (i % 2 ? 10.4 : 11) : 9; out.push([c - w, c + w, 4.4, top]); }
    return out;
  }
  /* 室内收边：踢脚线（门口断开）、腰线、顶角线、窗帘、挂画——让房间看起来精致一点 */
  const LAMP_ROOMS = { living: '#e8c890', bedroom: '#f0c8d0', library: '#c8d8a8', hall: '#e8d8b0', kitchen: '#f0e0b0', bath: '#d0e4ec' };
  const ART_ROOMS = new Set(['living', 'bedroom', 'dining', 'library', 'hall', 'kitchen']);
  const CURT = { living: '#8a5a4a', bedroom: '#c87a8a', dining: '#6a8a5a', library: '#5a6a8a', hall: '#8a6a4a', kitchen: '#c8a060', bath: '#7aaab8', laundry: '#9ab0b0', store: '#8a7a5a', shed: '#7a6a4a' };
  const ARTS = [['#a8d0e8', '#7aa860', '#4f7a4a'], ['#f0c8a0', '#d89060', '#8a5a4a'], ['#c8d8f0', '#e8eef4', '#7a8aa0'], ['#f4e0a8', '#e8b860', '#6a8a4a'], ['#b8c8e8', '#3f6a9a', '#e8d8a0']];
  function interiorTrim(m, r, ax, at, a0, a1, sg, holes, z, top, full) {
    if (r.glass || r.c) return;
    const f = at - sg * WT / 2;
    const B = (s, e, z0, z1, d, col, mat) => { if (e - s < 0.05 || z1 - z0 < 0.02) return; const p1 = f - sg * d, w0 = Math.min(f, p1), w1 = Math.max(f, p1); if (ax === 'v') m.box(s, w0, z0, e, w1, z1, col, mat); else m.box(w0, s, z0, w1, e, z1, col, mat); };
    const minus = (lo, hi, cuts) => { let segs = [[lo, hi]]; for (const [s0, e0] of cuts) segs = segs.flatMap(([x, y]) => (e0 <= x || s0 >= y ? [[x, y]] : [[x, s0], [e0, y]].filter(([p0, q0]) => q0 - p0 > 0.05))); return segs; };
    const wood = shade(r.fl, 0.68), lo = a0 + WT / 2 + 0.05, hi = a1 - WT / 2 - 0.05;
    const doorCuts = holes.filter((hh) => hh[2] < 0.7).map((hh) => [hh[0] - 0.34, hh[1] + 0.34]);
    const wain = !r.hut && top > z + 3.6, pan = shade(r.in, 0.86), stile = shade(r.in, 0.76), winCuts = holes.filter((hh) => hh[2] >= 0.7 && hh[2] < 3.2).map((hh) => [hh[0] - 0.1, hh[1] + 0.1]);
    for (const [s0, e0] of minus(lo, hi, doorCuts)) { B(s0, e0, z, z + 0.55, 0.14, wood, M.plank); if (top > z + 3.6) B(s0, e0, z + 3.05, z + 3.3, 0.09, wood, M.plank);
      // 护墙板：踢脚线到腰线之间一块漆过的木板，竖着一格一格分开，每格中间一圈细压条
      if (wain) for (const [s1, e1] of minus(s0, e0, winCuts)) { B(s1, e1, z + 0.55, z + 3.05, 0.04, pan, 0); const n = Math.max(1, Math.round((e1 - s1) / 1.6)), wd = (e1 - s1) / n;
        for (let k = 0; k <= n; k++) { const c = s1 + k * wd; B(Math.max(s1, c - 0.07), Math.min(e1, c + 0.07), z + 0.55, z + 3.05, 0.07, stile, 0); }
        for (let k = 0; k < n; k++) { const a = s1 + k * wd + 0.32, b = s1 + (k + 1) * wd - 0.32; if (b - a < 0.3) continue; B(a, b, z + 0.95, z + 1.02, 0.06, stile, 0); B(a, b, z + 2.58, z + 2.65, 0.06, stile, 0); B(a, a + 0.07, z + 0.95, z + 2.65, 0.06, stile, 0); B(b - 0.07, b, z + 0.95, z + 2.65, 0.06, stile, 0); } } }
    if (full) for (const [s0, e0] of minus(lo, hi, holes.filter((hh) => hh[3] > top - z - 0.5).map((hh) => [hh[0] - 0.1, hh[1] + 0.1]))) B(s0, e0, top - 0.42, top, 0.22, shade(r.in, 0.9), 0); // 顶角线遇到比墙还高的门（小隔间的门）就断开，不横穿门洞
    if (top > z + 9.5) for (const hh of holes) if (hh[2] > 1) { const col = CURT[r.id] || '#8a7a6a', zb = z + hh[2] - 0.7, zt = z + hh[3] + 0.3;
      B(hh[0] - 0.95, hh[0] - 0.35, zb, zt, 0.16, col, M.cloth); B(hh[1] + 0.35, hh[1] + 0.95, zb, zt, 0.16, col, M.cloth); B(hh[0] - 1.1, hh[1] + 1.1, zt + 0.05, zt + 0.2, 0.22, '#5a4030', M.metal); }
    if (ART_ROOMS.has(r.id) && top > z + 8.2) { const free = minus(lo + 0.5, hi - 0.5, holes.map((hh) => [hh[0] - 1.2, hh[1] + 1.2])).sort((p0, q0) => (q0[1] - q0[0]) - (p0[1] - p0[0]))[0];
      if (free && free[1] - free[0] > 2.8) { const c = (free[0] + free[1]) / 2, w = Math.min(1.5, (free[1] - free[0]) / 2 - 0.4), A = ARTS[Math.abs(Math.round(at * 7 + c * 3)) % ARTS.length];
        B(c - w, c + w, z + 4.8, z + 7.4, 0.1, '#5a3a24', M.plank); B(c - w + 0.18, c + w - 0.18, z + 6.0, z + 7.22, 0.13, A[0], 0); B(c - w + 0.18, c + w - 0.18, z + 5.5, z + 6.05, 0.135, A[1], 0); B(c - w + 0.18, c + w - 0.18, z + 4.98, z + 5.55, 0.14, A[2], 0); } }
  }
  // 哪几间房要「塞满」：架子上放什么、梁上挂什么
  const COZY = { living: { shelf: 'mix', hang: 'flowers' }, kitchen: { shelf: 'jars', hang: 'kitchen' }, bedroom: { shelf: 'mix', hang: 'flowers' }, library: { shelf: 'books', hang: 'flowers' }, dining: { shelf: 'jars', hang: 'herbs' }, attic: { shelf: 'mix', hang: 'herbs' }, store: { shelf: 'jars', hang: 'herbs' } };
  function cozy(m, r, z, h, o) {
    const cfg = COZY[r.id], [u0, v0, u1, v1] = r.r, R = (a, b) => H(a + r.id.length * 7, b), hr = HEARTH[r.id];
    const JAR = ['#c8e0d8', '#e8d0a0', '#d8a878', '#a8c8a0', '#f0e4c8', '#b8a0c8', '#e8b8a0'], BOOK = ['#8a3a3a', '#3a5a8a', '#4a7a4a', '#8a6a2a', '#5a3a6a', '#a85a3a', '#2a4a5a', '#c8a050'];
    // 壁炉：石头砌的炉膛、木头炉台、往上收的烟囱；炉台上摆着蜡烛、小钟、瓶子
    if (hr) { const { sp, c, W2, d } = hr, B = (a, b, za, zb, din, dout, col, mt) => { const p0 = sp.f - sp.sg * din, p1 = sp.f - sp.sg * dout, w0 = Math.min(p0, p1), w1 = Math.max(p0, p1); if (sp.ax === 'v') m.box(a, w0, z + za, b, w1, z + zb, col, mt); else m.box(w0, a, z + za, w1, b, z + zb, col, mt); };
      const stone = '#9a8a7a', stone2 = '#b0a090';
      B(c - W2, c - W2 + 0.9, 0, 4.6, 0, d, stone, M.stone); B(c + W2 - 0.9, c + W2, 0, 4.6, 0, d, stone, M.stone); B(c - W2 + 0.9, c + W2 - 0.9, 3.2, 4.6, 0, d, stone2, M.stone); B(c - W2 + 0.9, c + W2 - 0.9, 0, 0.35, 0, d, '#3a2a24', M.stone);
      B(c - W2 + 0.9, c + W2 - 0.9, 0.35, 3.2, 0, 0.25, '#2a1e1a', 0); B(c - W2 - 0.3, c + W2 + 0.3, 4.6, 5.0, 0, d + 0.35, '#7a5030', M.plank); B(c - W2 + 0.3, c + W2 - 0.3, 5.0, h - 0.8, 0, d * 0.7, stone, M.stone);
      B(c - W2 - 0.5, c + W2 + 0.5, 0, 0.2, d, d + 1.0, '#8a7a6a', M.stone);
      for (let k = 0; k < 5; k++) { const a = c - W2 + 0.2 + k * (W2 * 2 - 0.4) / 4, P = sp.ax === 'v' ? [a, sp.f - sp.sg * (d + 0.15)] : [sp.f - sp.sg * (d + 0.15), a]; if (k === 2) continue; if (k % 2) m.cyl(P[0], P[1], z + 5.0, z + 5.0 + 0.6 + R(k, 1) * 0.5, 0.14, 0.14, k === 1 ? '#f4ecd8' : '#e8d8b0', 0, 6); else m.cyl(P[0], P[1], z + 5.0, z + 5.6 + R(k, 2) * 0.6, 0.2, 0.12, JAR[k % JAR.length], 0, 8); }
      for (let k = 0; k < 6; k++) { const a = c - W2 + 1.1 + k * 0.42, P = sp.ax === 'v' ? [a, sp.f - sp.sg * 0.12] : [sp.f - sp.sg * 0.12, a]; m.box(P[0] - 0.12, P[1] - 0.12, z + 0.35, P[0] + 0.12, P[1] + 0.12, z + 0.6 + (k % 2) * 0.2, '#6a4a2e', M.plank); } }
    // 墙上的置物架：没门窗的空段钉两层木架子，摆满东西
    let nSh = 0;
    for (const sp of wallSpans(r)) { if (nSh >= 4) break; let segs = [[sp.s, sp.e]]; if (hr && hr.sp === sp) segs = [[sp.s, hr.c - hr.W2 - 0.6], [hr.c + hr.W2 + 0.6, sp.e]].filter(([a, b]) => b - a > 1.8);
      for (const [s0, e0] of segs) { if (nSh >= 4) break; const L = Math.min(e0 - s0, 4.5), a0 = (s0 + e0) / 2 - L / 2, a1 = a0 + L; nSh++;
        const B = (a, b, za, zb, din, dout, col, mt) => { const p0 = sp.f - sp.sg * din, p1 = sp.f - sp.sg * dout, w0 = Math.min(p0, p1), w1 = Math.max(p0, p1); if (sp.ax === 'v') m.box(a, w0, z + za, b, w1, z + zb, col, mt); else m.box(w0, a, z + za, w1, b, z + zb, col, mt); };
        for (const zz of [7.4, 8.9]) { B(a0, a1, zz - 0.12, zz, 0, 0.6, '#8a5a36', M.plank); for (const a of [a0 + 0.25, a1 - 0.35]) B(a, a + 0.1, zz - 0.7, zz - 0.12, 0, 0.45, '#6a4428', M.plank);
          let a = a0 + 0.12; let k = 0; while (a < a1 - 0.3) { const kind = cfg.shelf === 'books' ? 'b' : cfg.shelf === 'jars' ? (R(k, zz) < 0.8 ? 'j' : 'b') : ['b', 'b', 'j', 'x', 'j'][Math.floor(R(k, zz * 3) * 5)];
            if (kind === 'b') { const n = 3 + Math.floor(R(k, 4) * 5); for (let q = 0; q < n && a < a1 - 0.2; q++) { const wb = 0.12 + R(q, k) * 0.08, hb = 0.7 + R(k, q) * 0.45, tilt = q === n - 1 && R(q, 9) < 0.4; B(a, a + wb, zz, zz + hb - (tilt ? 0.15 : 0), 0.06, 0.5, BOOK[(q + k) % BOOK.length], 0); a += wb + 0.02; } a += 0.15; }
            else if (kind === 'j') { const P = sp.ax === 'v' ? [a + 0.2, sp.f - sp.sg * 0.3] : [sp.f - sp.sg * 0.3, a + 0.2], hj = 0.45 + R(k, 5) * 0.5; m.cyl(P[0], P[1], z + zz, z + zz + hj, 0.18, 0.15, JAR[k % JAR.length], 0, 8); m.cyl(P[0], P[1], z + zz + hj, z + zz + hj + 0.1, 0.12, 0.12, '#8a5a36', 0, 6); a += 0.45; }
            else { B(a, a + 0.5, zz, zz + 0.35, 0.08, 0.5, ['#c8a070', '#7a8a6a', '#a8604a'][k % 3], M.plank); a += 0.6; } k++; } } } }
    // 梁上挂下来的东西：厨房是铜锅、一串串蒜和辣椒、一把把香草；别的房间挂干花束
    const alongU = (u1 - u0) <= (v1 - v0), Lb = alongU ? v1 - v0 : u1 - u0, nb = Math.max(2, 2 * Math.round(Lb / 6.8)), zt = z + h - 0.75;
    for (let k = 1; k <= nb; k++) { const cb = (alongU ? v0 : u0) + (Lb * k) / (nb + 1), span = alongU ? u1 - u0 : v1 - v0, st = alongU ? u0 : v0;
      for (let q = 1; q < 6; q++) { if (R(k * 7, q) < 0.35) continue; const a = st + span * q / 6 + (R(q, k) - 0.5) * 0.6, [pu, pv] = alongU ? [a, cb] : [cb, a], len = 1.1 + R(k, q * 3) * 0.8, kind = cfg.hang === 'kitchen' ? ['pot', 'garlic', 'chili', 'herb'][Math.floor(R(q, k * 5) * 4)] : cfg.hang === 'herbs' ? 'herb' : (R(q, k) < 0.6 ? 'flower' : 'herb');
        m.box(pu - 0.02, pv - 0.02, zt - len * 0.5, pu + 0.02, pv + 0.02, zt, '#5a4a3a', 0);
        if (kind === 'pot') { m.cyl(pu, pv, zt - len - 0.5, zt - len * 0.5, 0.45, 0.4, '#c87a4a', M.metal, 10); m.box(pu - 0.04, pv - 0.6, zt - len * 0.5 - 0.1, pu + 0.04, pv - 0.4, zt - len * 0.5, '#5a3a24', 0); }
        else if (kind === 'garlic' || kind === 'chili') { for (let g = 0; g < 6; g++) m.ball(pu + (g % 2 ? 0.08 : -0.08), pv, zt - len * 0.5 - 0.2 - g * 0.22, kind === 'garlic' ? 0.15 : 0.08, kind === 'garlic' ? 0.13 : 0.16, kind === 'garlic' ? '#f0e8d8' : '#c8302a', 0, 3, 6); }
        else { const fc = kind === 'flower' ? ['#e8a0b8', '#f0d070', '#b8a0e0', '#f4f0e8'][Math.floor(R(q, 11) * 4)] : '#7a9a5a'; for (let g = 0; g < 7; g++) { const an = g * 0.9, rr = 0.12 + (g % 3) * 0.05; m.box(pu + Math.cos(an) * rr - 0.025, pv + Math.sin(an) * rr - 0.025, zt - len * 0.5 - 0.9, pu + Math.cos(an) * rr + 0.025, pv + Math.sin(an) * rr + 0.025, zt - len * 0.5, kind === 'flower' ? '#6a8a4a' : '#5a7a3a', 0); m.ball(pu + Math.cos(an) * rr, pv + Math.sin(an) * rr, zt - len * 0.5 - 0.95, 0.12, 0.12, fc, 0, 3, 5); }
          m.box(pu - 0.08, pv - 0.08, zt - len * 0.5 - 0.1, pu + 0.08, pv + 0.08, zt - len * 0.5 + 0.05, '#c8503a', 0); } } }
  }
  function rectRoom(m, r, cut, o) {
    const fr = r.rot ? r : null, fac = (nu, nv) => facing(cut, ...rotN(fr, nu, nv));
    const z = Z[r.lv], [u0, v0, u1, v1] = r.r, cutHere = cut && cut.lv === r.lv, h = roomH(r);
    m.pk(0);
    m.box(u0 - WT / 2, v0 - WT / 2, z - 1, u1 + WT / 2, v1 + WT / 2, z, r.fl, r.fm, r.fl, r.fm);
    if (!r.glass) for (let u = u0 + 1.6; u < u1 - 0.5; u += 1.6) m.box(u - 0.04, v0, z + 0.01, u + 0.04, v1, z + 0.04, shade(r.fl, 0.85), 0);
    for (const [ax, at, a0, a1, nu, nv] of [['v', v0, u0, u1, 0, -1], ['v', v1, u0, u1, 0, 1], ['u', u0, v0, v1, -1, 0], ['u', u1, v0, v1, 1, 0]]) {
      const sg = ax === 'v' ? nv : nu, ext = r.hut && ax === 'u' && at === u0 ? [] /* 小隔间正面那堵墙在大房间里：不是外墙，不画外墙装饰 */ : exteriorParts(r, ax, at, a0, a1), doors = sideHoles(r.lv, ax, at, a0, a1, fr).map(([s, e]) => [s, e, 0, DOOR_H]);
      const wins = r.glass ? [] : ext.flatMap(([s, e]) => windowsOn(r, ax, at, s, e, doors)), holes = doors.concat(wins);
      const back = !fac(nu, nv), lowZ = z + LOW(cut), fullZ = z + h;
      if (r.glass) { glassWall(m, ax, at, a0, a1, z, cutHere && !back ? lowZ : z + h, doors); continue; }
      const allExt = ext.length === 1 && ext[0][0] <= a0 + 0.01 && ext[0][1] >= a1 - 0.01;
      const topIn = cutHere && !(allExt && back) ? lowZ : fullZ;
      wallPiece(m, ax, at, a0 - (ax === 'v' ? WT / 2 : 0), a1 + (ax === 'v' ? WT / 2 : 0), z, topIn, -sg, r.in, r.im, holes);
      for (const [s, e] of ext) { const top = cutHere && !back ? lowZ : fullZ; wallPiece(m, ax, at, s - (ax === 'v' ? WT / 2 : 0), e + (ax === 'v' ? WT / 2 : 0), z, top, sg, r.out, r.om, holes); if (top === fullZ) facade(m, r, ax, at, s, e, sg, z, wins, doors, o); }
      for (const hh of holes) { if (cutHere && z + hh[3] > topIn) continue; frame(m, ax, at, hh, z, hh[2] === 0, r); }
      interiorTrim(m, r, ax, at, a0, a1, sg, holes, z, topIn, topIn === fullZ);
      if (!cutHere || back) for (const hh of wins) if (r.shut && (Math.round(hh[0] * 7) % 2)) shutters(m, ax, at + sg * (WT / 2 + 0.02), hh, z, sg, r.shut);
    }
    // 天花板上几根木梁（顺着短边搭过去），屋里看着更像有人住
    if (!r.hut && !r.glass && !cutHere && h >= 10) { const alongU = (u1 - u0) <= (v1 - v0), L = alongU ? v1 - v0 : u1 - u0, n = Math.max(2, 2 * Math.round(L / 6.8)), bw = shade(r.fl, 0.62); // 双数根：正中间留给吊灯
      for (let k = 1; k <= n; k++) { const c = (alongU ? v0 : u0) + (L * k) / (n + 1); if (alongU) m.box(u0 + WT / 2, c - 0.22, z + h - 0.75, u1 - WT / 2, c + 0.22, z + h - 0.03, bw, M.plank); else m.box(c - 0.22, v0 + WT / 2, z + h - 0.75, c + 0.22, v1 - WT / 2, z + h - 0.03, bw, M.plank); } }
    if (!cutHere && COZY[r.id]) cozy(m, r, z, h, o);
    if (!r.glass) for (const [cu, cv] of r.hut ? [[u1, v0], [u1, v1]] /* 小隔间前面两个角在大房间里面 */ : [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) { const tall = cutHere ? LOW(cut) : h; for (let k = 0.5; k < tall - 0.6; k += 1.5) m.box(cu - 0.4, cv - 0.4, z + k, cu + 0.4, cv + 0.4, z + k + 0.85, shade(r.om === M.plaster ? r.out : C.STONE, 0.82), M.stone); }
    // 吊灯：住人的房间天花板中间垂一盏（剖开看的时候不画，免得飘在半空）
    if (!r.glass && LAMP_ROOMS[r.id] && !cutHere && h >= 10.5) { const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, top = z + h, lo = Math.max(z + 8.6, top - 2.2); /* 灯罩底边不低于 8.6，站着的眼睛（7.2）不会钻进灯里 */ m.cyl(cu, cv, top - 0.18, top - 0.02, 0.38, 0.3, '#c8a060', M.metal, 10); m.box(cu - 0.04, cv - 0.04, lo + 1.0, cu + 0.04, cv + 0.04, top - 0.18, '#3a2a20', M.metal); m.cyl(cu, cv, lo + 0.95, lo + 1.12, 0.22, 0.16, '#c8a060', M.metal, 8);
      m.cyl(cu, cv, lo, lo + 1.0, 1.0, 0.36, LAMP_ROOMS[r.id], M.cloth, 14, false); m.cyl(cu, cv, lo - 0.06, lo + 0.06, 1.03, 1.03, '#c8a060', M.metal, 14, false); } // 吊灯：铜灯座、布灯罩带铜边；里面的灯泡在 dyn() 里画（跟着开关亮灭）
  }
  function roundRoom(m, r, cut, o) {
    const z = Z[r.lv], [cu, cv, rad] = r.c, cutHere = cut && cut.lv === r.lv, h = roomH(r), n = RSEG(r);
    m.pk(0);
    const fl = (a, rr) => [cu + Math.cos(a) * rr, cv + Math.sin(a) * rr];
    // 塔里的楼梯井：楼梯正上方的楼板是真的开洞（原来是画一块深色冒充，人走楼梯会顶到楼板）
    const hole = r.lv > 0 && cu === A[0] ? RAMP : null;
    if (hole) { const R0 = rad + WT / 2, cuts = [hole.v0, hole.v1]; for (let v = cv - R0; v < cv + R0; v += 0.5) cuts.push(v); cuts.push(cv + R0); cuts.sort((x, y) => x - y);
      for (let k = 0; k + 1 < cuts.length; k++) { const va = cuts[k], vb = cuts[k + 1]; if (vb - va < 0.01) continue; const vm = (va + vb) / 2, hw = Math.sqrt(Math.max(0, R0 * R0 - (vm - cv) ** 2)); if (hw <= 0) continue;
        let segs = [[cu - hw, cu + hw]]; if (vm > hole.v0 && vm < hole.v1) segs = [[cu - hw, Math.min(cu + hw, hole.u0)], [Math.max(cu - hw, hole.u1), cu + hw]].filter(([x, y]) => y - x > 0.01);
        for (const [x, y] of segs) m.quad([x, va, z], [y, va, z], [y, vb, z], [x, vb, z], r.fl, r.fm); } }
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832, b = ((i + 1) / n) * 6.2832, p0 = fl(a, rad + WT / 2), p1 = fl(b, rad + WT / 2); if (!hole) m.tri([cu, cv, z], [p0[0], p0[1], z], [p1[0], p1[1], z], r.fl, r.fm); m.quad([p0[0], p0[1], z - 1], [p1[0], p1[1], z - 1], [p1[0], p1[1], z], [p0[0], p0[1], z], shade(r.out, 0.8), M.metal); }
    for (let k = -3; k <= 3; k++) { const hw = Math.sqrt(Math.max(0, rad * rad - (k * 1.6) ** 2)) - 0.3, x = cu + k * 1.6; if (hw <= 0) continue;
      const L = (a, b) => { if (b - a > 0.05) m.box(x - 0.04, a, z + 0.01, x + 0.04, b, z + 0.04, shade(r.fl, 0.85), 0); };
      if (hole && x > hole.u0 && x < hole.u1) { L(cv - hw, Math.min(cv + hw, hole.v0)); L(Math.max(cv - hw, hole.v1), cv + hw); } else L(cv - hw, cv + hw); }
    const pi = (t, rr) => [cu + Math.cos(t) * rr, cv + Math.sin(t) * rr];
    if (r.noShell) return; // 温室：墙和穹顶是古城天文台的玻璃罩（fort_city.js 画）
    if (r.stilts) for (let k = 0; k < 4; k++) { const a = k * 1.5708 + 0.785, p = pi(a, rad - 0.6); m.cyl(p[0], p[1], z - 14.6, z - 1, 0.32, 0.32, C.TIMBER, M.plank, 8); } // 浴室架在地窖屋顶平台上方：四根木柱
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.2832, b = ((i + 1) / n) * 6.2832, am = (a + b) / 2, nu = Math.cos(am), nv = Math.sin(am), fc = cutHere && facing(cut, nu, nv);
      if (ringGap(r, i)) { if (!fc) { const p = pi(am, rad); m.box(p[0] - 0.3, p[1] - 0.3, z + DOOR_H, p[0] + 0.3, p[1] + 0.3, z + h, r.out, r.om); } continue; }
      const top = fc ? z + LOW(cut) : z + h;
      const ri = rad - WT / 2, ro = rad + WT / 2, A0 = pi(a, ri), A1 = pi(b, ri), B0 = pi(a, ro), B1 = pi(b, ro);
      m.quad([A0[0], A0[1], z], [A1[0], A1[1], z], [A1[0], A1[1], top], [A0[0], A0[1], top], r.in, r.im);
      m.quad([B0[0], B0[1], z], [B1[0], B1[1], z], [B1[0], B1[1], top], [B0[0], B0[1], top], i % 3 ? r.out : shade(r.out, 0.88), r.om);
      m.quad([A0[0], A0[1], top], [A1[0], A1[1], top], [B1[0], B1[1], top], [B0[0], B0[1], top], shade(r.out, 0.75), r.om);
      if (r.pod && !fc && !r.glass) { /* 屋里（0.31）：下半截一圈木护墙板 + 一道木线，每隔几段一根木柱；外面开窗的地方屋里也有一扇亮窗（白天透进天光、夜里是深蓝的夜色），带窗框窗台——屋里不再是一圈光秃秃的白墙 */
        const W0 = pi(a, ri - 0.04), W1 = pi(b, ri - 0.04), wz = Math.min(3.2, top - z - 0.5); m.quad([W0[0], W0[1], z], [W1[0], W1[1], z], [W1[0], W1[1], z + wz], [W0[0], W0[1], z + wz], i % 2 ? '#b88350' : '#ad784a', M.plank);
        const R0 = pi(a, ri - 0.1), R1 = pi(b, ri - 0.1); m.quad([R0[0], R0[1], z + wz], [R1[0], R1[1], z + wz], [R1[0], R1[1], z + wz + 0.28], [R0[0], R0[1], z + wz + 0.28], '#6e4a2c', M.plank);
        if (i % 3 === 0) { const pp = pi(a, ri - 0.14); m.box(pp[0] - 0.14, pp[1] - 0.14, z, pp[0] + 0.14, pp[1] + 0.14, top, '#7a5432', M.plank); }
        if (i % 4 === 2 && !ringGap(r, (i + 1) % n) && !ringGap(r, (i + n - 1) % n) && top - z > 6) { const g0 = pi(a + (b - a) * 0.14, ri - 0.08), g1 = pi(b - (b - a) * 0.14, ri - 0.08);
          m.quad([g0[0], g0[1], z + 5.4], [g1[0], g1[1], z + 5.4], [g1[0], g1[1], z + 7.6], [g0[0], g0[1], z + 7.6], o.night ? '#33406a' : '#e2f2fa', o.night ? M.metal : M.glow);
          const f0 = pi(a + (b - a) * 0.1, ri - 0.16), f1 = pi(b - (b - a) * 0.1, ri - 0.16), fm2 = pi(am, ri - 0.18), bx = (pp, z0, z1, w2) => m.box(pp[0] - w2, pp[1] - w2, z0, pp[0] + w2, pp[1] + w2, z1, '#7a5432', M.plank);
          bx(f0, z + 5.2, z + 7.8, 0.12); bx(f1, z + 5.2, z + 7.8, 0.12); bx(fm2, z + 5.4, z + 7.6, 0.06); const tq = (zz, hh, c2) => m.quad([f0[0], f0[1], zz], [f1[0], f1[1], zz], [f1[0], f1[1], zz + hh], [f0[0], f0[1], zz + hh], c2, M.plank); tq(z + 7.6, 0.25, '#7a5432'); tq(z + 6.44, 0.12, '#7a5432');
          const s0 = pi(a + (b - a) * 0.08, ri - 0.5), s1 = pi(b - (b - a) * 0.08, ri - 0.5); m.quad([f0[0], f0[1], z + 5.25], [f1[0], f1[1], z + 5.25], [s1[0], s1[1], z + 5.25], [s0[0], s0[1], z + 5.25], '#a87448', M.plank); } }
      if (r.pod) { /* 木头小屋：每隔几段一根木柱、半腰一圈木带、开几扇方窗（窗台上有花） */ const ro2 = rad + WT / 2;
        if (i % 3 === 0) { const p = pi(a, ro2 + 0.05); m.box(p[0] - 0.16, p[1] - 0.16, z, p[0] + 0.16, p[1] + 0.16, top, C.TIMBER, M.plank); }
        if (!fc) { const q0 = pi(a, ro2 + 0.04), q1 = pi(b, ro2 + 0.04); m.quad([q0[0], q0[1], z + 4.6], [q1[0], q1[1], z + 4.6], [q1[0], q1[1], z + 4.9], [q0[0], q0[1], z + 4.9], C.TIMBER, M.plank); }
        if (i % 4 === 2 && !ringGap(r, (i + 1) % n) && !ringGap(r, (i + n - 1) % n) && top - z > 6) { const g0 = pi(a + (b - a) * 0.14, ro2 + 0.12), g1 = pi(b - (b - a) * 0.14, ro2 + 0.12); /* 窗：玻璃离墙 0.12（不再贴着墙闪），外面一圈木窗框、中间十字窗棂；第一人称里也是不透明的（墙后面本来就是屋里） */ m.quad([g0[0], g0[1], z + 5.4], [g1[0], g1[1], z + 5.4], [g1[0], g1[1], z + 7.6], [g0[0], g0[1], z + 7.6], o.night ? '#ffe9a8' : '#7fa9c4', o.night ? M.glow : M.metal);
          { const f0 = pi(a + (b - a) * 0.1, ro2 + 0.18), f1 = pi(b - (b - a) * 0.1, ro2 + 0.18), fm = pi(am, ro2 + 0.2), bx = (p, z0, z1, w) => m.box(p[0] - w, p[1] - w, z0, p[0] + w, p[1] + w, z1, C.TIMBER, M.plank);
            bx(f0, z + 5.2, z + 7.8, 0.13); bx(f1, z + 5.2, z + 7.8, 0.13); bx(fm, z + 5.4, z + 7.6, 0.07); const tq = (zz, hh) => m.quad([f0[0], f0[1], zz], [f1[0], f1[1], zz], [f1[0], f1[1], zz + hh], [f0[0], f0[1], zz + hh], C.TIMBER, M.plank); tq(z + 7.6, 0.25); tq(z + 6.42, 0.14); } const sp = pi(am, ro2 + 0.4); m.box(sp[0] - 0.4, sp[1] - 0.4, z + 5.0, sp[0] + 0.4, sp[1] + 0.4, z + 5.4, '#8a5a3a', M.plank); if (!o.snow) m.flower(sp[0], sp[1], z + 5.4, 0.8, ['#f2a6c2', '#ffd95a', '#ffffff'][i % 3], i); }
      } else if (top - z > 6) {
        for (const zz of [3.4, 8, 12.6]) if (zz < h - 0.5) { const q0 = pi(a, ro + 0.06), q1 = pi(b, ro + 0.06); m.quad([q0[0], q0[1], z + zz], [q1[0], q1[1], z + zz], [q1[0], q1[1], z + zz + 0.35], [q0[0], q0[1], z + zz + 0.35], shade(r.out, 0.68), M.metal); const rv = pi(am, ro + 0.1); m.box(rv[0] - 0.07, rv[1] - 0.07, z + zz + 0.45, rv[0] + 0.07, rv[1] + 0.07, z + zz + 0.6, '#e0b070', M.metal); }
        if (i % 3 === 1 && !ringGap(r, (i + 1) % n) && !ringGap(r, (i + n - 1) % n)) { const pp = pi(am, ro + 0.05), face = Math.abs(nu) > Math.abs(nv) ? 'u' : 'v'; m.disc(pp[0], pp[1], z + 7.2, 0.95, face, '#3a3448', M.metal, 12); m.disc(pp[0] + nu * 0.04, pp[1] + nv * 0.04, z + 7.2, 0.7, face, o.night ? '#ffe9a8' : C.GLASS, o.night ? M.glow : M.glass, 12); const pq = pi(am, ri - 0.05); m.disc(pq[0], pq[1], z + 7.2, 0.7, face, C.GLASS, M.glass, 12); }
      }
    }
    for (let i = 0; i < n; i++) if (ringGap(r, i) !== ringGap(r, (i + n - 1) % n)) { const a = (i / n) * 6.2832, pp = pi(a, rad); if (passAt(r.lv, pp[0], pp[1], -0.05)) continue; /* 门柱落在门洞里就不立：不挡门 */ if (!(cutHere && facing(cut, Math.cos(a), Math.sin(a)))) m.box(pp[0] - 0.2, pp[1] - 0.2, z, pp[0] + 0.2, pp[1] + 0.2, z + DOOR_H + 0.4, '#3a3448', M.metal); } // 门柱细一点（原来把门挤得只剩一格宽）
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
    // 横着的一条（墙脚、木梁）遇到门就断开，不横穿门洞
    const Band = (a, b, zz0, zz1, col, mt) => { let cur = a; for (const hh of [...doors].sort((p, q) => p[0] - q[0])) { if (hh[1] <= cur || hh[0] >= b) continue; Bx(cur, Math.max(cur, hh[0] - 0.3), zz0, zz1, col, mt); cur = Math.max(cur, hh[1] + 0.3); } if (cur < b) Bx(cur, b, zz0, zz1, col, mt); };
    const seed = r.lv * 13 + s, clear = (a) => !wins.some((hh) => a > hh[0] - 0.6 && a < hh[1] + 0.6) && !doors.some((hh) => a > hh[0] - 0.6 && a < hh[1] + 0.6);
    if (r.om === M.plaster) {
      Bx(s, e, h - 0.9, h - 0.4, C.TIMBER, M.plank); Band(s, e, 0.3, 0.9, shade(r.out, 0.75), M.stone); Band(s, e, 3.4, 3.7, C.TIMBER, M.plank);
      for (let a = s + 0.1; a < e - 0.2; a += 2.6) if (clear(a)) Bx(a, a + 0.3, 0.9, h - 0.9, C.TIMBER, M.plank);
      for (let k = 0; k < 4; k++) { const a = s + 0.6 + H(seed, k) * (e - s - 2), zz = 1.2 + H(k, seed) * (h - 3.6); if (wins.concat(doors).some((hh) => a + 1.6 > hh[0] - 0.3 && a < hh[1] + 0.3 && zz + 1 > hh[2] && zz < hh[3])) continue; Bx(a, a + 0.7 + H(k, 3) * 0.8, zz, zz + 0.45, shade(r.out, k % 2 ? 0.9 : 1.06), 0, 0.05); }
    }
    if (r.om === M.stone) for (let k = 0; k < 8; k++) { const a = s + 0.4 + H(seed + 7, k) * (e - s - 1.6), zz = 0.8 + H(k, seed + 7) * (h - 2); if (wins.some((hh) => a + 1 > hh[0] && a < hh[1] && zz + 1 > hh[2] && zz < hh[3])) continue; Bx(a, a + 1.1, zz, zz + 0.55, shade(r.out, k % 2 ? 0.86 : 1.12), M.stone, 0.06); }
    if (r.om === M.plank) for (let a = s + 0.6; a < e - 0.2; a += 1.1) if (clear(a)) Bx(a, a + 0.08, 0.2, h - 0.2, shade(r.out, 0.75), 0, 0.05); // 木板墙的竖条：避开门窗
    if (r.lv >= 1 && !o.snow) for (const hh of wins) { if ((Math.floor(hh[0] * 3) + r.lv) % 3) continue; Bx(hh[0] - 0.2, hh[1] + 0.2, hh[2] - 1.8, hh[2] - 0.8, '#8a5a3a', M.plank, 0.7); for (let i = 0; i < 4; i++) { const t = hh[0] + (i + 0.5) * (hh[1] - hh[0]) / 4, Pp = ax === 'v' ? [t, w + sg * 0.4] : [w + sg * 0.4, t]; m.blob(Pp[0], Pp[1], z + hh[2] - 0.4, 0.3, 0.9, i % 2 ? ['#f2a6c2', '#ffd95a', '#e8705a'][i % 3] : '#5aa64e', 8, i + seed, 3, 5); } }
    if (r.lv >= 1 && e - s > 5) { const a = s + 0.5; if (!doors.some((hh) => a + 0.8 > hh[0] && a - 0.4 < hh[1])) Bx(a, a + 0.35, 0, h + 0.4, C.COP, M.metal, 0.4); } // 落水管避开门
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
    for (const [ax, at, a0, a1, nu, nv] of sides) { const sg = ax === 'v' ? nv : nu, top = cutHere && facing(cut, ...rotN(p.F, nu, nv)) ? z + LOW(cut) : z + h, win = p.lv > 0 && top > z + 6 ? [[(a0 + a1) / 2 - 0.6, (a0 + a1) / 2 + 0.6, 4.6, 8.6]] : []; wallPiece(m, ax, at, a0, a1, z, top, sg, cOut, mat, win); wallPiece(m, ax, at, a0, a1, z, top, -sg, cIn, mat, win); for (const hh of win) frame(m, ax, at, hh, z, false, { om: M.plank }); }
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
    /* 屋顶上长着一块块苔藓和小草（林子里的老房子） */
    const mossOn = () => { if (o.snow) return; const n = r.hut ? 2 : 6; for (let k = 0; k < n; k++) { const a1 = H(k + r.id.length, 3.3), b1 = H(k * 2 + 1, r.id.length + 7), half = span / 2;
        const [mu, mv] = ax === 'u' ? [u0 + 0.6 + a1 * (u1 - u0 - 1.2), (v0 + v1) / 2 + (b1 - 0.5) * span * 0.85] : [(u0 + u1) / 2 + (b1 - 0.5) * span * 0.85, v0 + 0.6 + a1 * (v1 - v0 - 1.2)], off = ax === 'u' ? Math.abs(mv - (v0 + v1) / 2) : Math.abs(mu - (u0 + u1) / 2);
        m.blob(mu, mv, z + hh * (1 - off / half) - 0.1, 0.7 + a1 * 0.7, 0.28, ['#6f9a4a', '#7fa85a', '#5f8a44'][k % 3], M.grass, k); } };
    const fr0 = r.hut ? 0 : 0.3, draw = () => { mossOn(); if (r.hut) { /* 小隔间：屋顶下面只是一圈梁，不封顶（不然就是一块 6.8 高的天花板，人得弯腰） */ m.box(u0, v0 - 0.3, z - 0.6, u1 + 0.3, v0 + 0.25, z, C.TIMBER, M.plank); m.box(u0, v1 - 0.25, z - 0.6, u1 + 0.3, v1 + 0.3, z, C.TIMBER, M.plank); m.box(u1 - 0.25, v0 + 0.25, z - 0.6, u1 + 0.3, v1 - 0.25, z, C.TIMBER, M.plank); } else m.box(u0 - fr0, v0 - 0.3, z - 0.6, u1 + 0.3, v1 + 0.3, z, C.TIMBER, M.plank); m.gable(u0, v0, u1, v1, z, hh, ax, col, o.snow ? M.snow : M.tile, 0.7, r.out, r.om, r.hut ? 0 : undefined); tileRows(m, r.r, z, hh, ax, o, r.hut ? 0 : 0.7); }; // 小隔间：前面（贴着大房间那头）不出檐，不然屋檐、木梁会伸进大房间里
    if (warp) warp(m, [(u0 + u1) / 2, (v0 + v1) / 2, z], 0, ax === 'u' ? 0 : tilt, ax === 'u' ? tilt : 0, draw); else draw();
    if (ax === 'u') { const cu = (u0 + u1) / 2 + 1.5, wv = v1 - span * 0.28, wz = z + hh * 0.42; m.box(cu - 1.1, wv - 0.6, wz - 1.6, cu + 1.1, wv + 0.6, wz + 1.6, r.out, r.om); m.box(cu - 0.6, wv + 0.6, wz - 0.9, cu + 0.6, wv + 0.65, wz + 1, C.GLASS, M.glass); m.gable(cu - 1.2, wv - 0.8, cu + 1.2, wv + 0.8, wz + 1.6, 1.2, 'v', col, M.tile, 0.2); }
    else { const cv = (v0 + v1) / 2 - 1.2, wu = u1 - span * 0.28, wz = z + hh * 0.42; m.box(wu - 0.6, cv - 1.1, wz - 1.6, wu + 0.6, cv + 1.1, wz + 1.6, r.out, r.om); m.box(wu + 0.6, cv - 0.6, wz - 0.9, wu + 0.65, cv + 0.6, wz + 1, C.GLASS, M.glass); m.gable(wu - 0.8, cv - 1.2, wu + 0.8, cv + 1.2, wz + 1.6, 1.2, 'u', col, M.tile, 0.2); }
    if (r.id === 'laundry') { /* 只有洗衣房（烧水煮衣服）有烟囱；别的屋顶下面没有炉子，就不画烟囱 */ const cu = u0 + 1.4, cv = v0 + 1.4; m.box(cu - 0.55, cv - 0.55, z, cu + 0.55, cv + 0.55, z + hh * 0.8 + 2.5, C.BRICK, M.stone); m.box(cu - 0.7, cv - 0.7, z + hh * 0.8 + 2.5, cu + 0.7, cv + 0.7, z + hh * 0.8 + 3, '#3a3448', M.metal); }
  }
  function flatRoof(m, q, z, o) {
    m.box(q[0] - 0.25, q[1] - 0.25, z - 1, q[2] + 0.25, q[3] + 0.25, z, '#8a7e70', M.stone, o.snow ? '#eef4fa' : '#9a8e7e', o.snow ? M.snow : M.stone);
    if (q[2] - q[0] < 1.2 || q[3] - q[1] < 1.2) return;
    m.box(q[0] - 0.25, q[3] - 0.1, z, q[2] + 0.25, q[3] + 0.25, z + 0.9, C.STONE2, M.stone); m.box(q[2] - 0.1, q[1] - 0.25, z, q[2] + 0.25, q[3] + 0.25, z + 0.9, C.STONE2, M.stone);
    m.box(q[0] - 0.3, q[3] + 0.25, z - 0.5, q[2] + 0.3, q[3] + 0.6, z - 0.1, C.COP, M.metal);
  }
  function tileRows(m, q, z, hh, ax, o, fo = 0.7) { if (o.snow) return; const [u0, v0, u1, v1] = q, dk = '#8a3a26'; for (let t = 0.15; t < 0.95; t += 0.14) { if (ax === 'u') { const vm = (v0 + v1) / 2; for (const [ve, s2] of [[v0 - 0.7, 1], [v1 + 0.7, -1]]) { const vv = ve + (vm - ve) * t, zz = z - 0.7 * hh / ((v1 - v0) / 2) + (hh + 0.7 * hh / ((v1 - v0) / 2)) * t + 0.08; m.quad([u0 - fo, vv, zz], [u1 + 0.7, vv, zz], [u1 + 0.7, vv + s2 * 0.16, zz + 0.14], [u0 - fo, vv + s2 * 0.16, zz + 0.14], dk, M.tile); } } else { const um = (u0 + u1) / 2; for (const [ue, s2] of [[u0 - 0.7, 1], [u1 + 0.7, -1]]) { const uu = ue + (um - ue) * t, zz = z - 0.7 * hh / ((u1 - u0) / 2) + (hh + 0.7 * hh / ((u1 - u0) / 2)) * t + 0.08; m.quad([uu, v0 - 0.7, zz], [uu, v1 + 0.7, zz], [uu + s2 * 0.16, v1 + 0.7, zz + 0.14], [uu + s2 * 0.16, v0 - 0.7, zz + 0.14], dk, M.tile); } } } }
  function glassRoof(m, r, o) {
    const [u0, v0, u1, v1] = r.r, z = Z[r.lv] + roomH(r), hh = 5.5, mu = (u0 + u1) / 2;
    m.box(u0 - 0.2, v0 - 0.2, z - 0.3, u1 + 0.2, v1 + 0.2, z, '#f4f0e6', 0);
    for (const [a, b] of [[u0 - 0.3, mu], [u1 + 0.3, mu]]) m.quad([a, v0 - 0.3, z], [a, v1 + 0.3, z], [b, v1 + 0.3, z + hh], [b, v0 - 0.3, z + hh], o.snow ? '#eef4fa' : C.GLASS, o.snow ? M.snow : M.glass);
    for (let v = v0; v <= v1 + 0.01; v += (v1 - v0) / 6) { m.quad([u0 - 0.3, v - 0.1, z + 0.05], [u0 - 0.3, v + 0.1, z + 0.05], [mu, v + 0.1, z + hh + 0.05], [mu, v - 0.1, z + hh + 0.05], '#f4f0e6', 0); m.quad([u1 + 0.3, v - 0.1, z + 0.05], [u1 + 0.3, v + 0.1, z + 0.05], [mu, v + 0.1, z + hh + 0.05], [mu, v - 0.1, z + hh + 0.05], '#f4f0e6', 0); }
    for (const v of [v0, v1]) m.tri([u0, v, z], [u1, v, z], [mu, v, z + hh], C.GLASS, M.glass);
    m.box(mu - 0.2, v0 - 0.5, z + hh - 0.1, mu + 0.2, v1 + 0.5, z + hh + 0.4, '#f4f0e6', 0);
  }
  function roundTop(m, r, cut, o) {
    const [cu, cv, rad] = r.c, z = Z[r.lv] + roomH(r), up = ROOMS.find((q) => q.lv === r.lv + 1 && q.c && Math.hypot(q.c[0] - cu, q.c[1] - cv) < 1), Pt = P2();
    if (r.pod) { if (r.noShell) return; const snow = o.snow;
      if (up || r.flat) { m.cyl(cu, cv, z, Z[r.lv + 1], rad + WT / 2, rad + WT / 2, r.out, r.om, 28, false); // 楼板：上面那间的地板 / 地窖屋顶平台
        if (r.flat && !up) { m.cyl(cu, cv, Z[r.lv + 1] - 0.35, Z[r.lv + 1], rad + WT / 2 + 0.15, rad + WT / 2 + 0.15, '#9a7452', M.plank, 28, true, '#b88a5a'); /* 地窖的平屋顶（= 二层的小平台）以前没封顶，从上面看就是一个敞口的筒 */ const n = 40, gate = (r.deg + 180) * D2R; for (let k = 0; k < n; k++) { const a = (k / n) * 6.2832; if (Math.abs(Math.atan2(Math.sin(a - gate), Math.cos(a - gate))) < 0.42) continue; const p = [cu + Math.cos(a) * (rad - 0.1), cv + Math.sin(a) * (rad - 0.1)]; if (k % 2 === 0) m.box(p[0] - 0.1, p[1] - 0.1, Z[r.lv + 1], p[0] + 0.1, p[1] + 0.1, Z[r.lv + 1] + 3.2, C.TIMBER, M.plank); const q = [cu + Math.cos(a + 6.2832 / n) * (rad - 0.1), cv + Math.sin(a + 6.2832 / n) * (rad - 0.1)]; m.quad([p[0], p[1], Z[r.lv + 1] + 3.0], [q[0], q[1], Z[r.lv + 1] + 3.0], [q[0], q[1], Z[r.lv + 1] + 3.3], [p[0], p[1], Z[r.lv + 1] + 3.3], C.TIMBER, M.plank); } } // 平台四周一圈栏杆（朝回廊那边开口）
        return; }
      // 锥形的木瓦屋顶：出檐一圈，屋面上几块苔藓，顶上一根小木尖
      const ov = rad + 0.9, hR = rad * 1.25;
      m.cyl(cu, cv, z, z + 0.4, ov, ov, C.TIMBER, M.plank, 28); m.cyl(cu, cv, z + 0.4, z + 0.4 + hR, ov, 0.2, snow ? '#e8eef4' : (r.lv === 2 ? C.TILE : C.SHING), snow ? M.snow : M.tile, 28);
      if (!snow) for (let k = 0; k < 4; k++) { const a = k * 1.7 + rad, f = 0.35 + H(k, rad) * 0.4; m.blob(cu + Math.cos(a) * ov * (1 - f), cv + Math.sin(a) * ov * (1 - f), z + 0.4 + hR * f, 0.8, 0.3, ['#86a868', '#9cb878'][k % 2], M.grass, k); }
      m.cyl(cu, cv, z + 0.4 + hR, z + 1.8 + hR, 0.12, 0.05, C.TIMBER, M.plank, 5); return; }
    m.cyl(cu, cv, z, z + 1, rad + 0.6, rad + 0.6, C.STONE2, M.stone, 28, !up, o.snow ? '#eef4fa' : '#9a8e7e'); // 上面还有房间：不封口（楼上的地板就是顶，楼梯井那儿是空的）
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
    /* 柴堆：柴房就在正上方，劈好的柴从地板上的活板口滑下来，堆在这儿，锅炉就近添 */
    for (let k = 0; k < 14; k++) { const row = Math.floor(k / 5), u = 3.2 + (k % 5) * 0.62 + (row % 2) * 0.3, zz = z + 0.32 + row * 0.56; m.box(u - 0.24, 21.34, zz - 0.24, u + 0.24, 21.4, zz + 0.24, '#d8aa70', M.plank); m.box(u - 0.28, 21.4, zz - 0.28, u + 0.28, 23.8, zz + 0.28, k % 3 ? '#7a5030' : '#8a5e3a', M.plank); }
    m.box(2.6, 20.8, z, 6.6, 21.1, z + 2.0, C.TIMBER, M.plank); m.box(2.6, 24.1, z, 6.6, 24.4, z + 2.0, C.TIMBER, M.plank);
    [[6, 31, 1], [8.4, 32, 0], [41, 22, 1], [43, 24.4, 0], [42, 32, 1], [15, 42, 0]].forEach(([u, v, k]) => { if (busy(u, v, 1)) return; k ? m.cyl(u, v, z, z + 2.6, 1, 1, '#7a5030', M.plank, 10) : m.box(u - 1.1, v - 1.1, z, u + 1.1, v + 1.1, z + 2.2, '#9a7048', M.plank); });
    [[18, 27], [31, 18], [8, 38], [41, 38]].forEach(([u, v]) => { m.cyl(u, v, z + 9, z + 14, 0.05, 0.05, '#3a3448', 0, 4); m.box(u - 0.35, v - 0.35, z + 8, u + 0.35, v + 0.35, z + 9, '#ffcf7a', M.glow); });
  }
  function deckAndHull(m, cut, o) {
    const pts = deckEdge(120), n = pts.length, snow = o.snow;
    // 船体顶面不再是一整片铺好的甲板：压低成一层长着苔藓的土和石头，各个房子、小院都是自己一块块立在上面的
    if (showLv(cut, 1)) {
      // 船体顶面：地下室的房间、去地下室的楼梯正上方要留洞（原来整块铺过去，地下室半腰多出一层板，楼梯也下不去）
      const holeAt = (u, v) => inLake(u, v, -0.6) || ROOMS.some((r) => r.lv === 0 && inRoom(r, u, v, -0.3)) || RAMPS.some((r) => (r.a === 0 || r.b === 0) && u > r.u0 - 0.3 && u < r.u1 + 0.3 && v > r.v0 - 0.3 && v < r.v1 + 0.3);
      const col = snow ? '#eef4fa' : '#6a7a4a', mt = snow ? M.snow : M.grass, K = 18;
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], c0 = CEN, P = (x, y) => [c0[0] + (a[0] - c0[0]) * x + (b[0] - c0[0]) * y, c0[1] + (a[1] - c0[1]) * x + (b[1] - c0[1]) * y, HT];
        for (let x = 0; x < K; x++) for (let y = 0; y < K - x; y++) {
          const p0 = P(x / K, y / K), p1 = P((x + 1) / K, y / K), p2 = P(x / K, (y + 1) / K); if (!holeAt((p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3)) m.tri(p0, p1, p2, col, mt);
          if (x + y + 1 < K) { const p3 = P((x + 1) / K, (y + 1) / K); if (!holeAt((p1[0] + p3[0] + p2[0]) / 3, (p1[1] + p3[1] + p2[1]) / 3)) m.tri(p1, p3, p2, col, mt); } } }
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
    const [a, b, c, d] = q.r, z = Z[q.lv], snow = o.snow, hl = opt.hole; // hole：楼梯穿上来的地方开个口
    const sb = (a1, b1, c1, d1) => { if (c1 - a1 > 0.01 && d1 - b1 > 0.01) m.box(a1, b1, z - (opt.th || 1.2), c1, d1, z, side, mat, snow ? '#eef4fa' : top, snow ? M.snow : mat); };
    if (!hl) sb(a, b, c, d); else { sb(a, b, c, hl[1]); sb(a, hl[3], c, d); sb(a, hl[1], hl[0], hl[3]); sb(hl[2], hl[1], c, hl[3]); }
    if (opt.planks) for (let u = a + 0.9; u < c; u += 1.3) { if (hl && u > hl[0] - 0.1 && u < hl[2]) { m.box(u, b, z, u + 0.07, hl[1], z + 0.03, '#6a4a30', 0); m.box(u, hl[3], z, u + 0.07, d, z + 0.03, '#6a4a30', 0); continue; } m.box(u, b, z, u + 0.07, d, z + 0.03, '#6a4a30', 0); }
    if (opt.beams) { const [cu, cv] = toL(mFrame(q), CEN[0], CEN[1]), du = cu - (a + c) / 2, dv = cv - (b + d) / 2, L = Math.hypot(du, dv) || 1, nu = du / L, nv = dv / L;
      for (const t of [0.18, 0.5, 0.82]) { const pu = Math.abs(nu) > Math.abs(nv) ? (nu > 0 ? a + 0.4 : c - 0.4) : a + (c - a) * t, pv = Math.abs(nu) > Math.abs(nv) ? b + (d - b) * t : (nv > 0 ? b + 0.4 : d - 0.4), fr0 = mFrame(q), below = (u, v) => { const [x, y] = toW(fr0, u, v); return q.lv > 0 && (roomAt(x, y, q.lv - 1) || roomAt(x, y, q.lv)); };
        /* 斜撑顶到下面那间房的外墙上就停（房子扶正以后，原来的斜撑会直接穿进楼下的屋里） */ if (below(pu, pv)) continue; let f = 1; for (let k = 1; k <= 22; k++) if (below(pu + nu * 5.5 * k / 22, pv + nv * 5.5 * k / 22)) { f = (k - 1) / 22; break; } if (f < 0.25) continue;
        const qu = pu + nu * 5.5 * f, qv = pv + nv * 5.5 * f, zq = z - 1.2 - 6.8 * f;
        m.quad([pu - 0.18, pv - 0.18, z - 1.2], [pu + 0.18, pv + 0.18, z - 1.2], [qu + 0.18, qv + 0.18, zq], [qu - 0.18, qv - 0.18, zq], C.TIMBER, M.plank); }
      for (let u = a + 1; u < c; u += 3.2) m.box(u, b, z - 2, u + 0.4, d, z - 1.2, '#5a3e28', M.plank); }
  }
  function fence(m, q, sides, h = 2.6) {
    const [a, b, c, d] = q.r, z = Z[q.lv];
    // 门口留开口：哪扇门的门口（门里、门外两点）离这段栅栏很近，就在那儿断开 2.6 宽
    const fr = mFrame(q), gaps = [];
    for (const e of ENTRIES) if (e.lv === q.lv) for (const P0 of [e.outP, e.inP]) gaps.push(toL(fr, P0[0], P0[1]));
    const run = (p0, p1) => {
      const L0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), du = (p1[0] - p0[0]) / L0, dv = (p1[1] - p0[1]) / L0, cut2 = [];
      for (const g of gaps) { const t = (g[0] - p0[0]) * du + (g[1] - p0[1]) * dv, off = Math.abs((g[0] - p0[0]) * dv - (g[1] - p0[1]) * du); if (t > -1 && t < L0 + 1 && off < 1.6) cut2.push([t - 1.3, t + 1.3]); }
      if (cut2.length) { cut2.sort((x, y) => x[0] - y[0]); let cur = 0; for (const [g0, g1] of cut2) { if (g0 > cur + 0.3) run0([p0[0] + du * cur, p0[1] + dv * cur], [p0[0] + du * g0, p0[1] + dv * g0]); cur = Math.max(cur, g1); } if (cur < L0 - 0.3) run0([p0[0] + du * cur, p0[1] + dv * cur], p1); return; }
      run0(p0, p1);
    };
    const run0 = (p0, p1) => { const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), n = Math.max(1, Math.round(L / 2)); for (let i = 0; i <= n; i++) { const u = p0[0] + (p1[0] - p0[0]) * i / n, v = p0[1] + (p1[1] - p0[1]) * i / n; m.box(u - 0.14, v - 0.14, z, u + 0.14, v + 0.14, z + h, C.TIMBER, M.plank); } m.box(Math.min(p0[0], p1[0]) - 0.08, Math.min(p0[1], p1[1]) - 0.08, z + h - 0.35, Math.max(p0[0], p1[0]) + 0.08, Math.max(p0[1], p1[1]) + 0.08, z + h - 0.1, C.TIMBER, M.plank); };
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
          for (const [u, v] of [[a + 0.7, b + 0.7], [c - 0.7, b + 0.7], [a + 0.7, d - 0.7], [c - 0.7, d - 0.7], [(a + c) / 2, d - 0.7]]) { if (roomAt(...toW(mFrame(q), u, v), 0)) continue; /* 下面是地下层的房间就不往下插桩 */ m.box(u - 0.3, v - 0.3, HT - 6, u + 0.3, v + 0.3, -3.2, C.TIMBER, M.plank); }
          for (let u = a + 0.2; u < c - 0.2; u += 2.1) for (let v = b + 0.2; v < d - 0.2; v += 2.1) if ((u * 7 + v * 3) % 5 < 2.4) m.box(u, v, z, u + 1.9, v + 1.9, z + 0.06, snow ? '#e8eef4' : ['#c4b8a4', '#ad9f8a', '#bfb29c'][Math.floor(u + v) % 3], M.stone);
          for (let u = a; u < c; u += 1.6) m.box(u, d - 0.5, z, u + 1.4, d, z + 0.6, C.STONE2, M.stone);
        }
        if (q.kind === 'dock') { // 码头：木板铺面，桩子插进水里 / 岩顶，两边栏杆（钓鱼的地方东边断开），西边一道石阶下水
          slab(m, q, o, '#a8784a', '#7a5636', M.plank, { planks: true, th: 0.6 });
          for (let v = b + 1; v < d; v += 2.6) for (const u of [a + 0.25, c - 0.25]) m.cyl(u, v, -14, z - 0.6, 0.28, 0.28, '#5a4030', M.plank, 8);
          for (const [u, sd] of [[a + 0.12, -1], [c - 0.12, 1]]) for (let v = b + 1.6; v < d - 0.2; v += 1.1) { if (sd > 0 && v > FISH.v - 1.6 && v < FISH.v + 1.6) continue; if (sd > 0 && v > 48.1 && v < 50.9) continue; /* 菜园栈道的路口 */ if (sd < 0 && v > 47 && v < 49.6) continue; m.box(u - 0.08, v - 0.08, z, u + 0.08, v + 0.08, z + 3.1, C.TIMBER, M.plank); m.box(u - 0.1, v - 0.55, z + 2.9, u + 0.1, v + 0.55, z + 3.2, C.TIMBER, M.plank); }
          for (let k = 0; k < 9; k++) m.box(a - 1.2 - k * 0.0, 47.2 + 0.0, z - 0.6 - k * 1.1, a, 49.6, z - 0.2 - k * 1.1, k % 2 ? '#bdb39d' : '#b3a992', M.stone); // 下水的石阶
          for (let k = 0; k < 3; k++) { const v = d - 0.8 - k * 0.9; m.cyl(c - 0.6, v, z, z + 1.1, 0.35, 0.38, '#8a5a3a', M.plank, 8); }
        }
        if (q.kind === 'walk') { slab(m, q, o, '#b8885a', '#7a5636', M.plank, { planks: true, th: 0.5 }); const [a, b, c, d] = q.r, z = Z[q.lv];
          for (let u = a + 0.6; u < c; u += 2.4) for (const v of [b + 0.3, d - 0.3]) m.cyl(u, v, -8, z - 0.5, 0.22, 0.22, '#5a4030', M.plank, 7);
          for (const sd of q.rails || []) { const b2 = q.railFrom || b, L2 = sd[0] === 'v' ? c - a : d - b2, n = Math.floor(L2 / 1.2); for (let k = 0; k <= n; k++) { const t = k / n, x = sd === 'v1' ? a + (c - a) * t : sd === 'u1' ? c - 0.12 : a, y = sd === 'v1' ? d - 0.12 : b2 + (d - b2) * t; m.box(x - 0.08, y - 0.08, z, x + 0.08, y + 0.08, z + 2.6, C.TIMBER, M.plank); }
            sd === 'v1' ? m.box(a, d - 0.22, z + 2.5, c, d - 0.02, z + 2.75, C.TIMBER, M.plank) : m.box(c - 0.22, b2, z + 2.5, c - 0.02, d, z + 2.75, C.TIMBER, M.plank); }
          if (q.id === 'walk2') { const p = [c - 0.5, b + 0.6]; m.box(p[0] - 0.08, p[1] - 0.08, z, p[0] + 0.08, p[1] + 0.08, z + 4, C.TIMBER, M.plank); m.box(p[0] - 1.4, p[1] - 0.06, z + 3.0, p[0] - 0.08, p[1] + 0.06, z + 3.8, '#c89a5a', M.plank); } // 路牌：菜园
        }
        if (q.kind === 'farm') {
          slab(m, q, o, q.id === 'farmA' ? '#a8784a' : '#9a7048', '#7a5636', M.plank, { planks: true, beams: true, th: 1.4 });
          fence(m, q, q.id === 'farmA' ? ['u1'] : ['v1', 'u0']);
          PLOTS_L.forEach(([pid, u, v], i) => {
            if (pid !== q.id) return;
            m.pk(PK.plot + i);
            // 菜畦：四边木板（深浅不一）、四角小木桩、土里三条圆鼓鼓的垄、角上一块小木牌、前面几块踏脚石
            const wet = o.farm && o.farm[i] && o.farm[i].wet, soil = wet ? '#4a3424' : '#6a4a34', ridge = wet ? '#5a3e2a' : '#7a5a3e', furrow = wet ? '#3a2818' : '#54382a';
            m.box(u + 0.25, v + 0.25, z, u + PS - 0.25, v + PS - 0.25, z + 1.45, '#5a3e2c', M.soil, soil, M.soil);
            const bd = ['#8a6040', '#7a5436', '#946a46', '#80583a'];
            m.box(u, v, z, u + PS, v + 0.25, z + 1.7, bd[i % 4], M.plank); m.box(u, v + PS - 0.25, z, u + PS, v + PS, z + 1.7, bd[(i + 1) % 4], M.plank);
            m.box(u, v + 0.25, z, u + 0.25, v + PS - 0.25, z + 1.7, bd[(i + 2) % 4], M.plank); m.box(u + PS - 0.25, v + 0.25, z, u + PS, v + PS - 0.25, z + 1.7, bd[(i + 3) % 4], M.plank);
            for (const [pu, pv] of [[u + 0.28, v + 0.28], [u + PS - 0.28, v + 0.28], [u + 0.28, v + PS - 0.28], [u + PS - 0.28, v + PS - 0.28]]) { /* 木桩收在菜畦边沿里面：不往外凸，菜地后面那条窄走道还走得过去 */ m.box(pu - 0.22, pv - 0.22, z, pu + 0.22, pv + 0.22, z + 2.1, '#5a3a24', M.plank); m.box(pu - 0.28, pv - 0.28, z + 2.1, pu + 0.28, pv + 0.28, z + 2.25, '#3a2618', M.plank); }
            for (let k = 0; k < 3; k++) { const rv = v + 0.75 + k * ((PS - 1.5) / 2); m.box(u + 0.5, rv - 0.32, z + 1.45, u + PS - 0.5, rv + 0.32, z + 1.62, ridge, M.soil); m.box(u + 0.55, rv - 0.18, z + 1.62, u + PS - 0.55, rv + 0.18, z + 1.72, ridge, M.soil); }
            for (let k = 0; k < 2; k++) { const fv = v + 0.75 + (k + 0.5) * ((PS - 1.5) / 2); m.box(u + 0.5, fv - 0.14, z + 1.45, u + PS - 0.5, fv + 0.14, z + 1.48, furrow, M.soil); }
            { const f0 = o.farm && o.farm[i], tag = f0 ? (CROP_TAG[f0.crop] || '#e0b060') : '#d8c4a0'; m.box(u + PS - 0.75, v + PS - 0.42, z + 1.45, u + PS - 0.63, v + PS - 0.32, z + 3.0, '#6a4a30', M.plank); m.box(u + PS - 1.05, v + PS - 0.44, z + 2.4, u + PS - 0.33, v + PS - 0.3, z + 3.1, '#e8d8b8', M.plank); m.box(u + PS - 0.95, v + PS - 0.46, z + 2.5, u + PS - 0.43, v + PS - 0.28, z + 3.0, tag, 0); }
            m.pk(0); for (let k = 0; k < 3; k++) m.box(u + 0.4 + k * (PS - 1.4) / 2, v + PS + 0.35, z, u + 1.0 + k * (PS - 1.4) / 2, v + PS + 0.95, z + 0.06, ['#9a948a', '#a8a298', '#8e887e'][k], M.stone); m.pk(PK.plot + i);
            const f = o.farm && o.farm[i]; if (f && Pt.crop) for (let ka = 0; ka < 3; ka++) for (let kb = 0; kb < 3; kb++) Pt.crop(m, f.crop, f.stage, u + 0.9 + ka * 1.3, v + 0.9 + kb * 1.3, z + 1.7, i * 9 + ka * 3 + kb);
            m.pk(0);
            m.box(u + 0.2, v - 0.25, z + 1.6, u + PS - 0.2, v - 0.05, z + 1.85, C.COP, M.metal);
          });
          // 浇地用的铜管：从小院的水龙头那边接过来，地里用剩的水流进林中湖
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
        if (q.kind === 'landing') { slab(m, q, o, '#a8784a', '#7a5636', M.plank, { planks: true, th: 0.8, hole: [Math.max(a, STAIR2.u0), STAIR2.v0 - 0.1, Math.min(c, STAIR2.u1), STAIR2.v1 + 0.1] }); fence(m, q, ['v1', 'u1'], 2.4); for (const [u, v] of [[a + 0.4, d - 0.4], [c - 0.4, d - 0.4]]) m.box(u - 0.25, v - 0.25, Z[1], u + 0.25, v + 0.25, z - 0.8, C.TIMBER, M.plank); m.box(a, b - 0.1, z - 1.6, c, b + 0.3, z - 0.8, C.TIMBER, M.plank); /* 靠墙那边钉一根横梁托着就行（原来那根柱子正好立在厨房门口） */ if (!snow) m.pot(c - 1.2, d - 1.2, z, 0.55, '#c8705a', '#5aa64e', 7); }
        if (q.kind === 'balc') {
          slab(m, q, o, '#a8784a', '#7a5636', M.plank, { planks: true, beams: true, th: 0.8 });
          const W = q.wall, sides = ['u0', 'u1', 'v0', 'v1'].filter((x) => x !== W); fence(m, q, sides, 2.4);
          // 雨棚：从墙上斜下来的条纹布，外沿两根细柱
          const zt = z + 11.2, zl = z + 9.4, n = 7, cols = q.aw; // 外沿要比人高（眼睛 7.2、头 8），不然一出门就像一根横杠挡在眼前
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
          const mu = (q.wall === 'u1' ? a + 1.2 : c - 1.2), mv = (q.wall === 'v0' ? d - 1.0 : b + 1.0); m.box(mu - 0.6, mv - 0.6, z, mu + 0.6, mv + 0.6, z + 1.4, '#c8935e', M.plank); // 小凳子放在角上（原来在正中间，挡着门）
          if (q.id === 'balcS') for (let k = 0; k < 4; k++) { m.cyl(c - 0.4, b + 0.6 + k * 1.4, z + 4.6, z + 4.6, 0.02, 0.02, '#fff', 0, 3); m.box(c - 0.9, b + 0.4 + k * 1.4, z + 2.6, c - 0.2, b + 1.1 + k * 1.4, z + 4.5, ['#fff4dc', '#9fd4f2', '#f2a6c2', '#ffffff'][k], M.cloth); }
        }
        if (q.kind === 'hive') {
          slab(m, q, o, '#a8784a', '#7a5636', M.plank, { planks: true, beams: true, th: 1 });
          HIVES_L.forEach(([u, v]) => { m.pk(PK.hive); m.box(u - 0.15, v - 0.15, z, u + 0.15, v + 0.15, z + 1.2, C.TIMBER, M.plank); for (let k = 0; k < 3; k++) m.box(u - 1, v - 0.9, z + 1.2 + k * 1.5, u + 1, v + 0.9, z + 2.6 + k * 1.5, k % 2 ? '#f4ead8' : '#e8dcc4', M.plank); m.gable(u - 1.2, v - 1.1, u + 1.2, v + 1.1, z + 5.7, 1, 'u', snow ? '#e4ecf4' : C.TILE2, snow ? M.snow : M.tile, 0.2); m.box(u - 0.3, v + 0.88, z + 1.5, u + 0.3, v + 0.95, z + 1.75, '#3a2630', 0); m.pk(0); });
          if (!snow) for (let k = 0; k < 9; k++) m.flower(a + 1 + (k % 5) * 1.3, d - 1 - Math.floor(k / 5) * 1.1, z, 1.4 + (k % 3) * 0.4, ['#f2a6c2', '#ffd95a', '#c8a0f0', '#ffffff'][k % 4], k);
        }
        if (q.kind === 'pool' && !CITY) lakeScene(m, q, o);
      });
    }
    // 小院上的东西（世界坐标）
    if (showLv(cut, 1)) {
      m.pk(PK.tap); m.cyl(TAP.u, TAP.v, 0, 3.6, 0.35, 0.3, C.COP2, M.metal, 8); m.box(TAP.u - 0.15, TAP.v - 0.8, 3.2, TAP.u + 0.15, TAP.v, 3.5, C.COP, M.metal); m.cyl(TAP.u, TAP.v - 1, 0, 1, 0.9, 1, '#8a5a3a', M.plank, 10); m.pk(0);
      m.pk(PK.mail); m.box(MAILB.u - 0.14, MAILB.v - 0.14, 0, MAILB.u + 0.14, MAILB.v + 0.14, 5, C.TIMBER, M.plank); m.box(MAILB.u - 0.9, MAILB.v - 0.55, 5, MAILB.u + 0.9, MAILB.v + 0.55, 6.9, '#e0604a', 0); m.box(MAILB.u + 0.9, MAILB.v - 0.1, 6, MAILB.u + 1, MAILB.v + 0.1, 7.6, C.GOLD, M.metal); m.pk(0);
      LAMPS.forEach(([u, v], i) => { m.pk(PK.lamp + i); m.cyl(u, v, 0, 5.6, 0.12, 0.1, '#3a3448', M.metal, 5); m.box(u - 0.04, v - 0.04, 5.6, u + 0.04, v + 0.5, 5.7, '#3a3448', M.metal); m.box(u - 0.26, v + 0.24, 4.7, u + 0.26, v + 0.76, 5.5, '#ffe9a8', M.glow); m.cyl(u, v + 0.5, 5.5, 5.9, 0.4, 0.05, '#3a3448', 0, 4); m.pk(0); }); // 小提灯：灯柱顶上挑出一盏，不再是一大块发光的方块
      if (Pt.deco) (o.deco || []).forEach((id, i) => { if (id && SLOTS[i]) Pt.deco(m, id, SLOTS[i][0], SLOTS[i][1], 0, PK.deco + i); });
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
  /* 屋里的陈设：每间圆屋子按自己的方向画（f 往外 = 背对大树的那面墙，s 往右），位置和 FIX 的占地一一对上 */
  function interiors(m, cut, o) {
    const show = (id) => showLv(cut, roomLv(id)) && RM[id], Pt = P2();
    const pod = (id, fn) => { if (!show(id)) return; const r = RM[id], z = Z[r.lv], [cu, cv] = r.c, W = Pt.warp;
      const B = (f0, s0, f1, s1, z0, z1, col, mat, tc, tm) => m.box(cu + Math.min(f0, f1), cv + Math.min(s0, s1), z + z0, cu + Math.max(f0, f1), cv + Math.max(s0, s1), z + z1, col, mat, tc, tm);
      const CY = (f, s2, z0, z1, r0, r1, col, mat, n, cap) => m.cyl(cu + f, cv + s2, z + z0, z + z1, r0, r1, col, mat, n, cap);
      const go = () => fn({ B, CY, z, cu, cv, R: r.c[2], at: (f, s2) => [cu + f, cv + s2] }); if (W) W(m, [cu, cv, z], r.deg * D2R, 0, 0, go); else go(); };
    const books = (B, f0, f1, s0, s1, z0, h, n) => { for (let k = 0; k < n; k++) { const t = s0 + (s1 - s0) * k / n, w = (s1 - s0) / n * 0.8; B(f0, t, f1, t + w, z0, z0 + h * (0.7 + H(k, f0 + s0) * 0.3), ['#a83a3a', '#3a6a8a', '#c8a050', '#5a8a4a', '#8a5a9a', '#d8cfc0'][k % 6], M.cloth); } };
    pod('hall', ({ B, CY, z }) => { m.pk(140); B(-2, -4.9, 2, -3.7, 0, 1.6, C.WOOD2, M.plank); B(-2, -4.95, 2, -4.75, 1.6, 4.2, C.WOOD2, M.plank); m.pk(0); // 长凳
      for (let k = 0; k < 4; k++) B(-1.2 + k * 0.8, -5.0, -1.0 + k * 0.8, -4.8, 4.8, 5.4, '#6a4a2e', 0); for (let k = 0; k < 3; k++) B(-1.1 + k * 0.9, -5.0, -0.5 + k * 0.9, -4.6, 3.6, 4.6, ['#8a5a4a', '#5a6a8a', '#6a8a5a'][k], M.cloth); // 挂钩上的外套
      B(-1.6, 3.9, 1.6, 4.9, 0, 3.2, '#8a5a3a', M.plank); for (let k = 0; k < 4; k++) B(-1.4 + k * 0.75, 4.0, -0.9 + k * 0.75, 4.6, 0.4, 0.9, ['#6a4030', '#3a3448', '#8a6040', '#5a3a2a'][k], 0); // 鞋柜
      CY(0, 0, 0.02, 0.05, 2.6, 2.6, '#a8584a', M.cloth, 18); CY(0, 0, 0.05, 0.07, 2.0, 2.0, '#d8b870', M.cloth, 18); // 圆地毯
      CY(0, 0, 9.2, 10.6, 0.05, 0.05, '#3a3448', 0, 4); CY(0, 0, 8.6, 9.2, 1.3, 1.3, '#8a6a3a', M.metal, 10, false); for (let k = 0; k < 6; k++) { const a = k * 1.047; CY(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 9.2, 9.7, 0.08, 0.08, '#f4ecd8', 0, 5); } });
    pod('kitchen', ({ B, CY }) => { m.pk(141); B(2.9, -2.7, 4.5, -0.3, 0, 3.0, '#4a4450', M.metal, '#2e2a30'); m.pk(0); CY(3.5, -2.0, 3.0, 3.8, 0.55, 0.55, '#c0c0c8', M.metal, 10); CY(3.6, -0.9, 3.0, 3.5, 0.45, 0.45, '#6a4a3a', M.metal, 10); B(4.3, -1.7, 4.6, -1.1, 3.0, 9, '#3a3448', M.metal); // 灶、锅、烟管
      m.pk(142); B(2.9, 0.5, 4.5, 2.5, 0, 3.2, '#b8a890', M.stone, '#d8d0c0'); B(3.2, 0.9, 4.2, 2.1, 2.7, 3.21, '#8ac8e0', M.water); m.pk(0); CY(4.3, 1.5, 3.2, 4.4, 0.06, 0.06, '#c0c0c8', M.metal, 5);
      B(-1.0, -1.2, 1.0, 1.2, 2.8, 3.2, C.WOOD, M.plank); for (const [f, s2] of [[-0.8, -1.0], [0.8, -1.0], [-0.8, 1.0], [0.8, 1.0]]) B(f - 0.12, s2 - 0.12, f + 0.12, s2 + 0.12, 0, 2.8, C.WOOD2, M.plank); // 当中的案板桌
      B(-1.6, -4.7, 1.6, -4.3, 5.6, 5.8, C.WOOD2, M.plank); for (let k = 0; k < 6; k++) CY(-1.3 + k * 0.52, -4.5, 5.8, 6.4 + H(k, 3) * 0.4, 0.2, 0.18, ['#e8d8b0', '#c8705a', '#9ad070', '#f0c040'][k % 4], 0, 8); // 罐子架
      for (let k = 0; k < 5; k++) CY(-1.2 + k * 0.6, 4.2, 6.6, 8.2, 0.08, 0.08, k % 2 ? '#7a9a4a' : '#c8a060', M.leaf, 4); }); // 挂着的干香草
    pod('dining', ({ B, CY }) => { m.pk(143); B(-0.5, -2.4, 2.1, 2.4, 2.6, 3.0, '#a8784a', M.plank, '#f4ead8', M.cloth); m.pk(0); for (const [f, s2] of [[-0.3, -2.2], [1.9, -2.2], [-0.3, 2.2], [1.9, 2.2]]) B(f - 0.12, s2 - 0.12, f + 0.12, s2 + 0.12, 0, 2.6, '#8a5a3a', M.plank);
      for (const s2 of [-1.2, 0, 1.2]) for (const f of [-1.3, 2.9]) { B(f - 0.45, s2 - 0.45, f + 0.45, s2 + 0.45, 1.6, 1.8, '#a8784a', M.plank); B(f + (f < 0 ? -0.45 : 0.35), s2 - 0.45, f + (f < 0 ? -0.35 : 0.45), s2 + 0.45, 1.8, 3.6, '#a8784a', M.plank); }
      CY(0.8, -1, 3.0, 3.6, 0.25, 0.2, '#f4f0e6', 0, 8); m.flower && m.flower(0.8 + RM.dining.c[0], 1 + RM.dining.c[1], Z[1] + 3, 1.1, '#f2a6c2', 3);
      CY(0.8, 0, 7.6, 10.6, 0.04, 0.04, '#3a3448', 0, 4); CY(0.8, 0, 7.0, 7.7, 1.1, 0.35, '#ffe9a8', M.glow, 10); B(-1.4, 3.9, 1.6, 4.8, 0, 3.4, '#7a5030', M.plank); for (let k = 0; k < 4; k++) CY(-1 + k * 0.8, 4.3, 3.4, 3.9, 0.22, 0.25, '#e8e0d0', 0, 8); });
    pod('library', ({ B, CY }) => { m.pk(145); B(3.5, -2.8, 4.7, 2.8, 0, 9.6, '#7a5030', M.plank); for (let q = 0; q < 4; q++) { B(3.4, -2.7, 3.55, 2.7, 0.6 + q * 2.3, 0.75 + q * 2.3, '#6a4428', M.plank); books(B, 3.55, 4.4, -2.6, 2.6, 0.75 + q * 2.3, 1.6, 10); } m.pk(0);
      m.pk(146); B(0.1, 2.3, 1.9, 4.1, 0.8, 1.8, '#5a7a9a', M.cloth); B(1.5, 2.3, 1.9, 4.1, 1.8, 4.0, '#4a6a8a', M.cloth); m.pk(0); CY(-0.6, 3.6, 0, 2.6, 0.4, 0.4, '#7a5030', M.plank, 10); CY(-0.6, 3.6, 2.6, 3.2, 0.12, 0.12, '#c8a060', M.metal, 6); CY(-0.6, 3.6, 3.2, 3.9, 0.55, 0.3, '#ffe9a8', M.glow, 8);
      CY(0.5, 0, 0.02, 0.05, 2.4, 2.4, '#5a6a4a', M.cloth, 16); });
    pod('bath', ({ B, CY }) => { m.pk(144); CY(2.4, 0, 0, 2.4, 2.1, 2.1, '#e8e4dc', 0, 18); CY(2.4, 0, 2.0, 2.2, 1.8, 1.8, '#9fd4f2', M.water, 18); m.pk(0); for (let k = 0; k < 6; k++) m.ball(RM.bath.c[0] + 2 + (k % 3) * 0.5, RM.bath.c[1] - 0.6 + Math.floor(k / 3) * 0.9, Z[3] + 2.4, 0.3, 0.22, '#ffffff', 0, 3, 6);
      B(4.0, -0.3, 4.6, 0.3, 4.4, 9.0, '#c0c0c8', M.metal); CY(3.6, 0, 8.6, 9.2, 0.6, 0.6, '#c0c0c8', M.metal, 10); // 接雨水的管子从屋顶下来
      B(-1, -4.3, 1, -3.9, 3, 6, '#c8e8f4', M.glass); B(-1.1, -4.35, 1.1, -4.2, 2.8, 6.2, '#a8784a', M.plank); for (let k = 0; k < 3; k++) B(-1.2 + k * 0.9, 3.9, -0.6 + k * 0.9, 4.3, 3.2, 5, ['#f4f0e6', '#9fd4f2', '#f2a6c2'][k], M.cloth); });
    pod('workshop', ({ B, CY }) => { m.pk(147); B(3.7, -2.6, 5.3, 2.6, 2.8, 3.4, C.WOOD, M.plank); for (const s2 of [-2.3, 2.3]) B(4.2, s2 - 0.15, 4.8, s2 + 0.15, 0, 2.8, C.WOOD2, M.plank); m.pk(0);
      B(5.4, -2.6, 5.6, 2.6, 4.0, 7.6, '#8a6a4a', M.plank); for (let k = 0; k < 7; k++) B(5.3, -2.2 + k * 0.65, 5.4, -1.95 + k * 0.65, 4.6, 6.4 + (k % 2) * 0.6, ['#c0c0c8', '#8a5a3a', '#3a3448'][k % 3], M.metal); // 工具墙
      CY(4.4, -1.6, 3.4, 4.0, 0.3, 0.3, '#5a5466', M.metal, 8); B(-3.6, -4.4, -0.6, -3.2, 0, 1.0, '#c8935e', M.plank); B(-3.4, -4.3, -0.8, -3.3, 1.0, 1.9, '#b8834e', M.plank); CY(-1.6, 3.6, 0, 1.6, 0.6, 0.65, '#7a5030', M.plank, 10); });
    pod('store', ({ B, CY }) => { m.pk(148); B(3.8, 0.3, 4.8, 3.3, 0, 8.6, '#8a5a3a', M.plank); for (let q = 0; q < 4; q++) { B(3.7, 0.4, 3.8, 3.2, 0.8 + q * 2, 0.95 + q * 2, '#6a4428', M.plank); for (let k = 0; k < 5; k++) CY(4.2, 0.7 + k * 0.55, 0.95 + q * 2, 1.6 + q * 2 + H(k, q) * 0.4, 0.22, 0.2, ['#e8d8b0', '#c8705a', '#9ad070', '#f0c040', '#a86a9a'][(k + q) % 5], 0, 8); } m.pk(0);
      m.pk(152); B(2.8, -3.4, 4.6, -1.4, 0, 3.2, '#8a8070', M.stone); B(3.0, -3.0, 3.1, -1.8, 0.6, 2.2, '#2a1e1a', 0); m.pk(0); B(4.1, -2.9, 4.6, -1.9, 3.2, 14, '#8a8070', M.stone); // 石炉 + 烟道一直通到屋顶平台上
      for (let k = 0; k < 4; k++) CY(-2 + k * 1.2, -4.3, 0, 2.4, 0.6, 0.65, k % 2 ? '#7a5030' : '#8a5a3a', M.plank, 10); for (let k = 0; k < 6; k++) CY(-2.4 + k * 0.8, 4.2, 9.6, 11.6, 0.15, 0.08, k % 2 ? '#e8d8b0' : '#8a4a2a', M.leaf, 5); }); // 酒桶、挂着的大蒜和腊肉
    pod('attic', ({ B, CY }) => { m.pk(149); B(2.4, 0.5, 4.2, 2.3, 0, 2.6, '#7a5030', M.plank); B(2.5, 0.6, 4.1, 2.2, 2.6, 3.0, '#c8a060', M.metal); m.pk(0); for (let k = 0; k < 5; k++) B(-3 + k * 0.9, -4 + (k % 2) * 0.6, -2.2 + k * 0.9, -3.2 + (k % 2) * 0.6, 0, 1 + (k % 3) * 0.8, ['#a8784a', '#c8935e', '#8a5a3a'][k % 3], M.plank); CY(-1, 3.4, 0, 3.4, 0.7, 0.5, '#8a6a4a', M.cloth, 8); });
    pod('cockpit', ({ B, CY }) => { m.pk(151); B(1.4, -1.2, 3.0, 1.2, 0, 3.6, '#7a5a3e', M.plank); m.pk(0); if (Pt.wheel) Pt.wheel(m, RM.cockpit.c[0] + 2.2, RM.cockpit.c[1], Z[3] + 4.6, 1.3, RM.cockpit.deg * D2R);
      B(-1.6, -1.4, 0.6, 1.4, 2.6, 2.9, '#a8784a', M.plank, '#e8dcb8', M.cloth); for (const [f, s2] of [[-1.4, -1.2], [0.4, -1.2], [-1.4, 1.2], [0.4, 1.2]]) B(f - 0.1, s2 - 0.1, f + 0.1, s2 + 0.1, 0, 2.6, '#7a5030', M.plank); // 海图桌
      m.pk(158); for (let k = 0; k < 3; k++) { const a = k * 2.1; m.quad([RM.cockpit.c[0], RM.cockpit.c[1], Z[3] + 3.4], [RM.cockpit.c[0] + 0.1, RM.cockpit.c[1], Z[3] + 3.4], [RM.cockpit.c[0] + Math.cos(a) * 0.7, RM.cockpit.c[1] + Math.sin(a) * 0.7, Z[3]], [RM.cockpit.c[0] + Math.cos(a) * 0.7 - 0.1, RM.cockpit.c[1] + Math.sin(a) * 0.7, Z[3]], '#3a3448', 0); } m.pk(0);
      B(3.0, -2.8, 3.6, -2.2, 3.4, 3.8, C.GOLD, M.metal); B(3.6, -2.7, 4.6, -2.3, 3.8, 4.4, C.GOLD, M.metal); });
    pod('shed', ({ B, CY }) => { m.pk(155); for (let q = 0; q < 4; q++) for (let k = 0; k < 6 - q; k++) B(1.4, -2.5 + k * 0.85 + q * 0.42, 3.6, -1.75 + k * 0.85 + q * 0.42, q * 0.8, q * 0.8 + 0.8, k % 2 ? '#8a5a3a' : '#a8784a', M.plank); m.pk(0); CY(-1.6, 2.6, 0, 1.4, 0.8, 0.9, '#a8784a', M.plank, 10); B(-1.7, 2.5, -1.5, 2.7, 1.4, 2.6, '#6a4a2e', M.plank); B(-1.9, 2.45, -1.3, 2.75, 2.4, 2.8, '#c0c0c8', M.metal); });
    pod('green', ({ B, CY, z }) => { m.pk(157); for (let k = 0; k < 3; k++) B(3.9, -0.8, 4.7, 2.8, 1.2 + k * 2.2, 1.5 + k * 2.2, C.WOOD2, M.plank); for (let k = 0; k < 6; k++) m.pot && m.pot(RM.green.c[0] + 4.3, RM.green.c[1] - 0.5 + (k % 3) * 1.1, z + 1.5 + Math.floor(k / 3) * 2.2, 0.35, '#c8705a', o.snow ? null : ['#5aa64e', '#f2a6c2', '#ffd95a'][k % 3], k); m.pk(0);
      m.pk(156); CY(3.4, -2.8, 0, 1.4, 0.5, 0.45, '#8a6a4a', M.plank, 10); CY(3.4, -2.8, 1.2, 1.25, 0.42, 0.42, '#8ac8e0', M.water, 10); m.pk(0); m.pk(165); CY(0.6, -4.7, 0, 3.2, 0.12, 0.12, C.COP, M.metal, 6); CY(0.6, -4.7, 3.2, 3.4, 0.4, 0.4, '#c84a3a', M.metal, 8); m.pk(0); });
    if (show('green')) { const Zg = Z[1];
      GPOTS.forEach(([pu, pv], i) => { const pt = (o.pots || [])[i]; m.pk(160 + i); m.cyl(pu, pv, Zg, Zg + 1.8, 0.9, 1.1, i % 2 ? '#c8705a' : '#b8604a', 0, 12); m.cyl(pu, pv, Zg + 1.8, Zg + 2.1, 1.15, 1.15, '#a8503a', 0, 12); m.cyl(pu, pv, Zg + 2, Zg + 2.05, 1, 1, pt && pt.wet ? '#3a2a20' : '#5a4030', M.soil, 12); if (pt && PP.LIFE && PP.LIFE.PL[pt.id] && Pt.lifePlant) Pt.lifePlant(m, PP.LIFE.PL[pt.id], pt.stage, pu, pv, Zg + 2.05, i * 3 + 1, 1.4); m.pk(0); }); }
    pod('bedroom', ({ B, CY }) => { m.pk(166); B(2.4, -2.4, 5.0, 2.4, 0, 1.2, '#8a5a3a', M.plank); B(2.5, -2.3, 4.9, 2.3, 1.2, 1.8, '#f4ead8', M.cloth); B(2.5, -2.3, 3.9, 2.3, 1.8, 2.0, '#d86a7a', M.cloth); B(4.3, -2.0, 4.9, -0.2, 1.8, 2.3, '#ffffff', M.cloth); B(4.3, 0.2, 4.9, 2.0, 1.8, 2.3, '#ffffff', M.cloth); B(5.0, -2.4, 5.3, 2.4, 0, 4.2, '#7a5030', M.plank); m.pk(0);
      for (const s2 of [-3.3, 3.3]) { B(4.0, s2 - 0.6, 5.0, s2 + 0.6, 0, 2.2, '#a8784a', M.plank); CY(4.5, s2, 2.2, 2.8, 0.1, 0.1, '#c8a060', M.metal, 5); CY(4.5, s2, 2.8, 3.4, 0.45, 0.3, '#ffe9a8', M.glow, 8); }
      B(-1.6, -5.2, 1.6, -4.2, 0, 7.6, '#9a6a44', M.plank); B(-1.5, -4.25, -0.05, -4.2, 0.5, 7.2, '#b88a5a', M.plank); B(0.05, -4.25, 1.5, -4.2, 0.5, 7.2, '#b88a5a', M.plank); CY(0.8, 0, 0.02, 0.05, 2.6, 2.6, '#c8a0a8', M.cloth, 18); });
    pod('laundry', ({ B, CY }) => { m.pk(167); CY(2.7, 0, 0, 2.2, 1.1, 1.2, '#a87a52', M.plank, 14); CY(2.7, 0, 1.8, 2.0, 1.0, 1.0, '#cfeafa', M.water, 14); m.pk(0); for (let k = 0; k < 5; k++) m.ball(RM.laundry.c[0] + (k % 3) * 0.4 - 0.4, RM.laundry.c[1] + 0.2 * k, Z[1] + 2.1, 0.25, 0.2, '#ffffff', 0, 3, 6);
      B(-3.4, -0.05, 3.4, 0.05, 8.8, 8.9, '#d8c8a8', 0); for (let k = 0; k < 6; k++) B(-3 + k * 1.1, -0.04, -2.3 + k * 1.1, 0.04, 6.8, 8.8, ['#f4f0e6', '#9fd4f2', '#f2a6c2', '#ffffff', '#c8e0a0', '#f0d080'][k], M.cloth); B(0.6, -3.6, 1.8, -2.8, 0, 3.2, '#8a5a3a', M.plank); });
    // 地窖屋顶的平台（L2）：长椅、两个蜂箱、鸟巢、几盆花
    if (showLv(cut, 2)) { const Zg = Z[2], snow = o.snow, [bu, bv] = lp('store', 1.0, 4.4), [b2u, b2v] = lp('store', 1.0, 4.9);
      m.pk(159); m.box(bu - 1.8 * Math.abs(Math.cos(RM.store.deg * D2R)) - 0.4, bv - 1.8 * Math.abs(Math.sin(RM.store.deg * D2R)) - 0.4, Zg, bu + 1.8 * Math.abs(Math.cos(RM.store.deg * D2R)) + 0.4, bv + 1.8 * Math.abs(Math.sin(RM.store.deg * D2R)) + 0.4, Zg + 2.4, C.WOOD2, M.plank); void b2u; void b2v; m.pk(0);
      HIVES.forEach(([u, v]) => { m.pk(PK.hive); m.box(u - 0.15, v - 0.15, Zg, u + 0.15, v + 0.15, Zg + 1.2, C.TIMBER, M.plank); for (let k = 0; k < 3; k++) m.box(u - 1, v - 0.9, Zg + 1.2 + k * 1.5, u + 1, v + 0.9, Zg + 2.6 + k * 1.5, k % 2 ? '#f4ead8' : '#e8dcc4', M.plank); m.gable(u - 1.2, v - 1.1, u + 1.2, v + 1.1, Zg + 5.7, 0.9, 'u', C.SHING, M.tile, 0.2); m.pk(0); });
      m.pk(PK.nest); m.cyl(NEST.u, NEST.v, Zg, Zg + 1.2, 0.9, 1.1, '#a8784a', M.plank, 10); m.cyl(NEST.u, NEST.v, Zg + 1.2, Zg + 1.6, 1.15, 1, '#8a6a40', M.cloth, 10); if (o.egg) m.ball(NEST.u, NEST.v, Zg + 1.7, 0.3, 0.38, '#f4ead8', 0, 4, 8); m.pk(0);
      if (!snow) for (let k = 0; k < 5; k++) { const [u, v] = lp('store', -2.6 + k * 0.9, 4.6); m.flower(u, v, Zg, 1.6 + (k % 2) * 0.5, ['#f2a6c2', '#ffd95a', '#c8a0f0', '#ffffff'][k % 4], k + 30); } }
    // 码头：热气球
    if (showLv(cut, 1)) { const Bb = BAL_L, Zd = Z[1]; m.box(Bb.u - 1.8, Bb.v - 1.6, Zd, Bb.u + 1.8, Bb.v + 1.6, Zd + 0.3, C.PLANK, M.plank);
      if (!o.tripping) { m.pk(PK.balloon); m.box(Bb.u - 1.1, Bb.v - 1.1, Zd + 0.3, Bb.u + 1.1, Bb.v + 1.1, Zd + 2.8, '#a8784a', M.plank); for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(Bb.u + du - 0.05, Bb.v + dv - 0.05, Zd + 2.8, Bb.u + du * 0.9 + 0.05, Bb.v + dv * 0.9 + 0.05, Zd + 6.4, '#5a4030', 0); m.ball(Bb.u, Bb.v, Zd + 10, 3.4, 4.2, '#d8604a', M.cloth, 8, 14, 0.02, 3); for (let k = 0; k < 6; k++) { const a = k * 1.047; m.box(Bb.u + Math.cos(a) * 3.3 - 0.06, Bb.v + Math.sin(a) * 3.3 - 0.06, Zd + 7.4, Bb.u + Math.cos(a) * 3.3 + 0.06, Bb.v + Math.sin(a) * 3.3 + 0.06, Zd + 12.6, '#f4e6c8', M.cloth); } m.pk(0); } }
    if (o.furn && PP.FURN) for (const rid of [...new Set(o.furn.map((it) => it.room || 'living'))]) if (show(rid)) inFrame(m, frameOf(rid), () => PP.FURN.build(m, o.furn.filter((it) => (it.room || 'living') === rid), { S: FS, zOf: (it) => Z[roomLv(it.room || 'living')], pinkBed: o.pinkBed, idx: (it) => o.furn.indexOf(it) }));
  }
  // ---------- 外面挂着的东西 ----------
  const WING_ROOTS = [[2.4, 8.2, Math.PI * 0.92], [44.4, 10.8, -0.08]]; // 东边那根往外挪一格，不戳进浴室 // 西边那根原来正好挡在工作间去葡萄架的门口
  // 朝外歪的墙：越往上越往外斜（只歪墙和屋顶，地板不动，所以照样能走）
  function leanWrap(m, z0, k, fn) {
    if (!k) return fn();
    const own = Object.prototype.hasOwnProperty.call(m, 'tri'), o = m.tri;
    m.tri = function (a, b, c, col, mat) { const T = (q) => { const dz = Math.max(0, q[2] - z0); return [q[0] + k[0] * dz, q[1] + k[1] * dz, q[2]]; }; return o.call(this, T(a), T(b), T(c), col, mat); };
    try { fn(); } finally { if (own) m.tri = o; else delete m.tri; }
  }
  // ---------- 植物：城堡和植物长在一起 ----------
  // 爬山虎顺着墙往上爬、小树从台子边上斜着长出来、根和藤从底下垂下去、平屋顶和檐口上长草开花
  const LEAF = (o) => (o.season === 'autumn' ? ['#d8823a', '#c8582e', '#e0a040', '#8a9a3a'] : o.season === 'spring' ? ['#8cc06a', '#a8cc7c', '#74ac5e', '#f2cad6'] : ['#5f9a4c', '#78b25a', '#94c46a', '#548c46']);
  /* 这个点在不在某间屋子里面（爬藤、树叶不能长进屋里：墙外贴着别的房间或小隔间的地方，藤就不长） */
  const inAnyRoom = (x, y, z) => ROOMS.some((r) => z > Z[r.lv] + 0.2 && z < Z[r.lv] + roomH(r) + 0.5 && inRoom(r, x, y, 0.1));
  function vine(m, o, pts, seed, r = 0.55) {
    const cols = LEAF(o), W0 = (x, y) => [x + (m.ox || 0), y + (m.oy || 0)], bad = (q) => { const [x, y] = W0(q[0], q[1]); return inAnyRoom(x, y, q[2] + (m.oz || 0)); };
    pts = pts.filter((q) => !bad(q)); if (pts.length < 2) return;
    const sw0 = m.sway; m.sway = Math.max(sw0, 0.15); // 藤和叶子都轻轻摆（人能从垂下来的藤里穿过去）
    for (let i = 0; i + 1 < pts.length; i++) { const [a, b] = [pts[i], pts[i + 1]]; m.quad([a[0], a[1], a[2]], [a[0] + 0.08, a[1] + 0.08, a[2]], [b[0] + 0.08, b[1] + 0.08, b[2]], [b[0], b[1], b[2]], '#5a4a2a', 0); }
    // 叶子一片一片贴着藤长，不是一团一团的球：每个节点一小簇，越往上越稀
    pts.forEach((q, i) => { const n = Math.round((5 + r * 8) * (1 - (i / pts.length) * 0.4)); for (let k = 0; k < n; k++) { const h1 = H(seed + i * 7, k), h2 = H(k + 3, seed + i), a = h1 * 6.2832, d = r * (0.3 + h2 * 0.9);
      const c = cols[Math.floor(H(seed, i * 11 + k) * cols.length)], up = H(i, k + seed);
      const lp = [q[0] + Math.cos(a) * d, q[1] + Math.sin(a) * d, q[2] + (up - 0.5) * r * 1.6]; if (bad(lp)) continue;
      m.leaf(lp, a + (h2 - 0.5), 0.35 + up * 0.7, 0.42 + h1 * 0.22, shade(c, 0.78 + up * 0.35), 0.8); } });
    m.sway = sw0;
  }
  // 沿着一面墙往上爬：从地面起，左右摆着往上，越往上越散
  function ivyOnWall(m, o, p0, along, out, z0, hh, seed) {
    const pts = []; let x = 0;
    for (let k = 0; k <= 7; k++) { x += (H(seed, k) - 0.5) * 1.6; const t = k / 7; pts.push([p0[0] + along[0] * x + out[0] * 0.35, p0[1] + along[1] * x + out[1] * 0.35, z0 + hh * t]); }
    vine(m, o, pts, seed, 0.85); if (H(seed, 40) < 0.75) vine(m, o, pts.slice(2).map((q, i) => [q[0] + along[0] * (1 + i * 0.4), q[1] + along[1] * (1 + i * 0.4), q[2]]), seed + 5, 0.45);
  }
  function tree(m, o, u, v, z, h, seed, lean = 0.3) {
    // 一棵树：树干分三四根枝，每根枝再分两根小枝；叶子一簇一簇包住枝头（簇压在枝上，不会飘在空中）；冬天是光秃秃的枝，雪积在枝的上面
    const cols = LEAF(o), bark = '#6a4a2e', bark2 = '#4e3622', R = (k) => H(seed, k), th = Math.max(h * 0.48, 10) /* 最低的枝杈要比人头高，走到树下不会被枝挡住 */, top = [u + lean * 1.2, v, z + th], g = Math.min(1.3, h / 8);
    const limb = (a, b, r0, r1, c1 = bark, c2 = bark2) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], n = 4; for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, rr = r0 + (r1 - r0) * t0, rr1 = r0 + (r1 - r0) * t1; const P0 = [a[0] + d[0] * t0, a[1] + d[1] * t0, a[2] + d[2] * t0], P1 = [a[0] + d[0] * t1, a[1] + d[1] * t1, a[2] + d[2] * t1]; for (let s2 = 0; s2 < 5; s2++) { const f0 = s2 * 1.2566, f1 = f0 + 1.2566, e = (P, f, r) => [P[0] + Math.cos(f) * r, P[1] + Math.sin(f) * r, P[2]]; m.quad(e(P0, f0, rr), e(P0, f1, rr), e(P1, f1, rr1), e(P1, f0, rr1), s2 % 2 ? c1 : c2, M.plank); } } };
    limb([u, v, z - 0.3], top, 0.5 * g, 0.3 * g);
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + R(k) * 0.8; m.quad([u, v, z + 0.6], [u + 0.15, v, z + 0.6], [u + Math.cos(a) * 1.3 * g, v + Math.sin(a) * 1.3 * g, z - 0.3], [u + Math.cos(a) * 1.15 * g, v + Math.sin(a) * 1.15 * g, z - 0.3], bark2, 0); }
    const nb = h > 7 ? 4 : 3, tips = [], snow = !!o.snow, segs = [];
    for (let k = 0; k < nb; k++) { const a = (k / nb) * 6.2832 + R(k + 10) * 1.1, out = h * (0.15 + R(k + 20) * 0.08), up = h * (0.18 + R(k + 30) * 0.14), from = [top[0] - lean * 0.3 * (k / nb), top[1], top[2] - h * 0.08 * (k % 2)], mid = [from[0] + Math.cos(a) * out, from[1] + Math.sin(a) * out, from[2] + up];
      limb(from, mid, 0.24 * g, 0.12 * g); segs.push([from, mid]);
      for (const s2 of [-0.6, 0.6]) { const b2 = a + s2 + (R(k + 40) - 0.5) * 0.4, tip = [mid[0] + Math.cos(b2) * h * 0.1, mid[1] + Math.sin(b2) * h * 0.1, mid[2] + h * (0.06 + R(k + 50) * 0.08)]; limb(mid, tip, 0.11 * g, 0.05 * g); segs.push([mid, tip]); tips.push(tip); } }
    const crown = [top[0] + lean * 0.6, top[1], top[2] + h * 0.42]; limb(top, crown, 0.22 * g, 0.08 * g); segs.push([top, crown]); tips.push(crown);
    if (snow) { // 雪积在每根枝的上面一条，枝杈里窝一小团
      for (const [a, b] of segs) limb([a[0], a[1], a[2] + 0.16 * g], [b[0], b[1], b[2] + 0.12 * g], 0.12 * g, 0.05 * g, '#eef4fa', '#dfe8f2');
      for (const [a] of segs) m.ball(a[0], a[1], a[2] + 0.18 * g, 0.26 * g, 0.16 * g, '#eef4fa', M.snow, 3, 6);
      return tips.map((t) => [t[0], t[1], t[2], 0]); }
    // 叶簇：中心压在枝头往下一点，半径盖过小枝，所以簇和枝连在一起
    return tips.map((t, k) => { const last = k === tips.length - 1, rr = h * (last ? 0.2 : 0.14 + R(k + 60) * 0.04); m.foliage(t[0], t[1], t[2] - rr * 0.15, rr, rr * 0.82, cols, 40, seed * 3 + k, 0.5); return [t[0], t[1], t[2] - rr * 0.15, rr]; });
  }
  // 垂下去的根 / 藤：从一个点往下荡
  function dangle(m, o, u, v, z, len, seed, green = true) {
    const pts = []; for (let k = 0; k <= 6; k++) pts.push([u + Math.sin(k * 0.9 + seed) * 0.5, v + Math.cos(k * 0.7 + seed) * 0.4, z - len * k / 6]);
    if (green && !o.snow) vine(m, o, pts, seed, 0.38); else { const sw0 = m.sway; m.sway = Math.max(sw0, 0.15); /* 垂下来的根：会摆，人能穿过去 */ for (let i = 0; i + 1 < pts.length; i++) m.quad(pts[i], [pts[i][0] + 0.12, pts[i][1], pts[i][2]], [pts[i + 1][0] + 0.1, pts[i + 1][1], pts[i + 1][2]], pts[i + 1], '#5a4028', 0); m.sway = sw0; }
  }
  /* 守护树：城堡背后（西北角）一棵很老很老的大树，城堡就是贴着它长起来的——
     几股树干拧在一起往上长，树冠撑在屋顶上面；粗根抓着船体边沿翻下去，一直垂到岛底下的云里；
     有两条根顺着地面爬到圆塔脚下，又绕着塔壁往上爬（像《天空之城》里树和城长在一起，但这是我们自己的树） */
  const GTREE = { u: 4.2, v: -4.6, z: HT };
  function giantTree(m, cut, o) {
    const { u, v, z } = GTREE, snow = o.snow, cols = LEAF(o), bark = '#6b5442', bark2 = '#57432f', mossC = '#6f8f4e', R = (k) => H(k * 1.7 + 3, 9.1);
    const seg = (a, b, r0, r1, col) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]) || 1, n = Math.max(2, Math.ceil(L / 1.6)); for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, P0 = [a[0] + d[0] * t0, a[1] + d[1] * t0, a[2] + d[2] * t0], P1 = [a[0] + d[0] * t1, a[1] + d[1] * t1, a[2] + d[2] * t1], rr = r0 + (r1 - r0) * t0;
      if (Math.abs(d[2]) / L > 0.7) m.cyl((P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2, Math.min(P0[2], P1[2]), Math.max(P0[2], P1[2]) + rr * 0.3, rr, rr * 0.96, k % 3 ? col : bark2, M.plank, 9, false);
      else { const ux = -d[1] / L, uy = d[0] / L; m.quad([P0[0] - ux * rr, P0[1] - uy * rr, P0[2] + rr * 0.6], [P0[0] + ux * rr, P0[1] + uy * rr, P0[2] + rr * 0.6], [P1[0] + ux * rr, P1[1] + uy * rr, P1[2] + rr * 0.6], [P1[0] - ux * rr, P1[1] - uy * rr, P1[2] + rr * 0.6], col, M.plank); for (const sd of [-1, 1]) m.quad([P0[0] + sd * ux * rr, P0[1] + sd * uy * rr, P0[2] + rr * 0.6], [P1[0] + sd * ux * rr, P1[1] + sd * uy * rr, P1[2] + rr * 0.6], [P1[0] + sd * ux * rr * 0.8, P1[1] + sd * uy * rr * 0.8, P1[2] - rr * 0.5], [P0[0] + sd * ux * rr * 0.8, P0[1] + sd * uy * rr * 0.8, P0[2] - rr * 0.5], bark2, M.plank); } } };
    const curve = (pts, r0, r1, col = bark) => { for (let i = 0; i + 1 < pts.length; i++) seg(pts[i], pts[i + 1], r0 + (r1 - r0) * i / (pts.length - 1), r0 + (r1 - r0) * (i + 1) / (pts.length - 1), col); };
    // 三股树干拧着往上
    const TOP = z + 56;
    for (let s2 = 0; s2 < 3; s2++) { const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12, a = s2 * 2.094 + t * 2.6, r = 2.0 * (1 - t * 0.55); pts.push([u + Math.cos(a) * r - t * 2.2, v + Math.sin(a) * r - t * 2.6, z + t * (TOP - z)]); } curve(pts, 2.1, 0.8, s2 === 1 ? '#735b47' : bark); }
    if (!snow) for (let k = 0; k < 14; k++) { const a = k * 1.3, zz = z + 2 + k * 2.2; m.blob(u + Math.cos(a) * 2.2 - (zz - z) * 0.055, v + Math.sin(a) * 2.2 - (zz - z) * 0.065, zz, 0.6, 0.35, mossC, M.grass, k); } // 树皮上一块块苔藓
    // 板根：树脚往四周撑开
    for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.3, L = 4 + R(k) * 3; curve([[u + Math.cos(a) * 1.2, v + Math.sin(a) * 1.2, z + 3.5], [u + Math.cos(a) * L * 0.6, v + Math.sin(a) * L * 0.6, z + 1.2], [u + Math.cos(a) * L, v + Math.sin(a) * L, z - 0.6]], 0.9, 0.35); }
    // 大枝：往外、往上撑开，枝头是一团团叶子（树冠在屋顶上面，不往塔和烟囱那边伸）
    const tips = [];
    for (let k = 0; k < 9; k++) { const a = -2.9 + k * 0.62 + R(k + 5) * 0.3, z0 = z + 34 + k * 2.2, L = 12 + R(k + 7) * 6, base = [u - (z0 - z) / (TOP - z) * 2.2, v - (z0 - z) / (TOP - z) * 2.6, z0], mid = [base[0] + Math.cos(a) * L * 0.55, base[1] + Math.sin(a) * L * 0.55, z0 + 4 + R(k) * 3], tip = [base[0] + Math.cos(a) * L, base[1] + Math.sin(a) * L, z0 + 7 + R(k + 2) * 5];
      curve([base, mid, tip], 0.75, 0.25); tips.push(tip, mid); }
    tips.push([u - 2.2, v - 2.6, TOP + 3]);
    if (!snow) tips.forEach((t, k) => { const rr = k === tips.length - 1 ? 9 : k % 2 ? 5.6 : 7.4; m.foliage(t[0], t[1], t[2], rr, rr * 0.7, o.season === 'autumn' ? cols : ['#4f8a44', '#5e9a4c', '#6aa858', '#3f7a3c'], 70, k * 7 + 3, 0.9); });
    // 粗根：顺着船体顶面爬到边上，翻下去，一路垂到岛底下
    const edge = (a) => { let r = 2; while (r < 30 && inPoly(u + Math.cos(a) * r, v + Math.sin(a) * r, 0)) r += 0.5; return r; };
    for (let k = 0; k < 6; k++) { const a = -2.9 + k * 0.5, e = edge(a) + 0.6, x = u + Math.cos(a) * e, y = v + Math.sin(a) * e, len = 18 + R(k + 30) * 16;
      curve([[u + Math.cos(a) * 1.4, v + Math.sin(a) * 1.4, z + 1], [x - Math.cos(a) * 1.2, y - Math.sin(a) * 1.2, z + 0.2], [x, y, z - 2], [x + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2, z - 9], [x + Math.cos(a) * 1.6 + Math.sin(k) * 1.4, y + Math.sin(a) * 1.6, z - 9 - len * 0.5], [x + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2 + Math.cos(k) * 1.2, z - 9 - len]], 0.75, 0.2);
      for (let j = 0; j < 3; j++) dangle(m, o, x + Math.cos(a) * 1.4 + (j - 1) * 0.7, y + Math.sin(a) * 1.4, z - 12 - j * 4, 10 + R(k + j) * 12, k * 3 + j, j === 1); }
    // 两条根爬到圆塔（门厅）脚下，绕着塔壁往上爬（避开门洞那一侧）
    for (const [a0, turn] of [[-2.36, 0.9], [-1.75, -0.5]]) { const pts = [[u, v, z + 1.5]]; const A0 = [12 + Math.cos(a0) * 8.9, 12 + Math.sin(a0) * 8.9]; pts.push([(u + A0[0]) / 2, (v + A0[1]) / 2, z + 0.4]); for (let k = 0; k <= 8; k++) { const t = k / 8, a = a0 + turn * t; pts.push([12 + Math.cos(a) * 8.95, 12 + Math.sin(a) * 8.95, z + 1 + t * 15]); } /* 爬到二层楼板下面为止，不钻进二层的小隔间 */ curve(pts, 0.6, 0.22); }
  }
  /* 林子：岛的外沿一圈种上树（后面那半圈多、前面少，不挡着看城堡），树下有蕨和小灌木 */
  function forest(m, cut, o) {
    const pts = deckEdge(64, 0, true);
    pts.forEach(([pu, pv], i) => { const a = Math.atan2(pv - CEN[1], pu - CEN[0]), u = CEN[0] + (pu - CEN[0]) * 0.93, v = CEN[1] + (pv - CEN[1]) * 0.93, back = Math.sin(a + 0.8) < 0.25; if (!back && i % 3) return;
      if (ROOMS.some((r) => r.lv <= 2 && inRoom(r, u, v, -3)) || MODS.some((q) => inMod(q, u, v, -2.2)) || inLake(u, v, -3) || PASS.some((p) => { const b = wBox(p.F, p.r); return u > b[0] - 3 && u < b[2] + 3 && v > b[1] - 3 && v < b[3] + 3; }) || Math.hypot(u - GTREE.u, v - GTREE.v) < 8) return;
      if (H(i, 41) < 0.35) return; const h = 9 + H(i, 42) * 6; if (ROOMS.some((r) => r.lv <= 2 && inRoom(r, u, v, -(h * 0.5 + 1.5)))) return; /* 树冠不伸进房子 */ tree(m, o, u, v, HT, h, i * 13 + 5, (H(i, 43) - 0.5) * 0.6);
      if (!o.snow) for (let k = 0; k < 3; k++) { const x = u + (H(i, k + 50) - 0.5) * 4, y = v + (H(k, i + 50) - 0.5) * 4; if (!inPoly(x, y, 0.5) || roomAt(x, y, 1)) continue; P2().bush ? P2().bush(m, x, y, HT, 0.5 + H(i, k) * 0.4, LEAF(o), i + k, true) : m.foliage(x, y, HT + 0.6, 0.7, 0.6, LEAF(o), 12, k); } });
  }
  /* 植物：岩顶外沿一圈林子（避开码头、梯田、出水口和树根），小屋墙上的爬藤，回廊外沿垂下来的藤 */
  function plants(m, cut, o) {
    if (cut && cut.lv < 1) return;
    if (CITY && !cut) for (let k = 0; k < 40; k++) { const t = (k / 40) * 6.2832 + H(k, 3) * 0.08, deg = t / D2R, r = (CITY.basR(t) + CITY.rimR(t)) / 2 + 0.3, [u, v] = [TC[0] + Math.cos(t) * r, TC[1] + Math.sin(t) * r];
      const near = (d0, w) => Math.abs(((deg - d0) % 360 + 540) % 360 - 180) < w; if (near(90, 10) || near(4, 18) || near(40, 18) || near(-8, 8) || ROOT_DEG.some((d) => near(d, 5)) || H(k, 41) < 0.25) continue;
      if (ROOMS.some((q) => q.lv === 1 && inRoom(q, u, v, -2))) continue; tree(m, o, u, v, 0.4, 8 + H(k, 42) * 6, k * 13 + 5, (H(k, 43) - 0.5) * 0.5);
      if (!o.snow && H(k, 44) < 0.6) P2().bush ? P2().bush(m, u + 1.4, v - 0.8, 0.4, 0.6, LEAF(o), k, true) : null; }
    for (const r of ROOMS) { if (!r.pod || r.noShell || (cut && cut.lv < r.lv)) continue; const z0 = Z[r.lv]; for (let k = 0; k < 2; k++) { const a = (r.deg + (k ? 50 : -50)) * D2R, cu = r.c[0] + Math.cos(a) * (r.c[2] + 0.15), cv = r.c[1] + Math.sin(a) * (r.c[2] + 0.15); ivyOnWall(m, o, [cu, cv], [-Math.sin(a), Math.cos(a)], [Math.cos(a), Math.sin(a)], z0, 7 + H(k, r.id.length) * 3, r.id.length * 7 + k); } }
    if (!o.snow) for (const lv of [2, 3]) { if (cut && cut.lv < lv) continue; for (let k = 0; k < 10; k++) { const a = k * 0.63 + lv, rr = GAL[lv] - 0.2; dangle(m, o, TC[0] + Math.cos(a) * rr, TC[1] + Math.sin(a) * rr, Z[lv] - 0.8, 3 + H(k, lv) * 5, k + lv * 10, true); } }
  }
  // 斜插小屋外面的东西：底下两根斜撑、窗台里的小摆设（屋子本身按普通房间画）
  function hutExtras(m, cut, o) {
    for (const r of HUTS) { if (!showLv(cut, r.lv)) continue; inFrame(m, r, () => { const [a, b, c, d] = r.r, z = Z[r.lv];
      for (const v of [b + 0.4, d - 0.4]) m.quad([c - 0.4, v - 0.12, z - 1], [c - 0.4, v + 0.12, z - 1], [a + 0.2, v + 0.12, z - 5.5], [a + 0.2, v - 0.12, z - 5.5], C.TIMBER, M.plank);
      m.box(a, b, z - 1.4, c, d, z - 1, '#7a5636', M.plank);
      const cv = (b + d) / 2, use = r.use;
      if (hutInterior(m, r, z, a, b, c, d)) return;
      if (use === 'sit') { m.box(c - 1.3, b + 0.4, z, c - 0.35, d - 0.4, z + 1.6, '#a8784a', M.plank); m.box(c - 1.2, b + 0.5, z + 1.6, c - 0.4, d - 0.5, z + 2, '#e8a0b0', M.cloth); m.box(c - 1.1, cv - 0.6, z + 2, c - 0.5, cv + 0.6, z + 2.8, '#f6e0a0', M.cloth); }
      else if (use === 'read') { m.box(c - 1.3, b + 0.4, z, c - 0.35, d - 0.4, z + 6, '#7a5030', M.plank); for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) m.box(c - 1.25, b + 0.6 + j * (d - b - 1.2) / 4, z + 1 + i * 2.6, c - 0.5, b + 0.9 + j * (d - b - 1.2) / 4, z + 2.8 + i * 2.6, ['#c85a4a', '#5a8ad8', '#e8c860', '#7fc8a8'][(i + j) % 4], 0); }
      else if (use === 'drink') { m.box(c - 1.3, b + 0.4, z, c - 0.35, d - 0.4, z + 4.4, '#c8a878', M.plank); m.cyl(c - 0.8, cv, z + 4.4, z + 5.6, 0.4, 0.35, '#f4f0e8', 0, 8); m.cyl(c - 0.8, cv + 0.9, z + 4.4, z + 5, 0.3, 0.25, '#e8a0b0', 0, 8); }
      else { m.box(c - 1.3, b + 0.4, z, c - 0.35, d - 0.4, z + 2.6, '#8a5a3a', M.plank); m.box(c - 1.2, b + 0.6, z + 2.6, c - 0.4, cv, z + 4, '#a8784a', M.plank); m.cyl(c - 0.8, d - 1, z + 2.6, z + 4.2, 0.45, 0.45, '#8a5a3a', M.plank, 8); }
    }); }
  }
  /* 每个小隔间按名字单独布置：东西都靠尽头墙（c 那边）和两侧墙的后半段，门口（a 那边）进来的路空着；外面窗下挂花箱、门边一盏小灯 */
  function hutInterior(m, r, z, a, b, c, d) {
    const cv = (b + d) / 2, W = d - b, nm = r.nm, B = (...x) => m.box(...x), CY = (...x) => m.cyl(...x);
    const WOODc = '#a8784a', DK = '#5a3a24', CL = ['#e86a6a', '#7ab0d8', '#f0c040', '#9ad070', '#c8a0e8', '#f0a060'];
    // 外面：尽头墙外的花箱 + 门边小灯（从屋里看不到，从外面看小屋更精致）
    B(c + 0.25, cv - 1.1, z + 3.6, c + 0.75, cv + 1.1, z + 4.2, '#8a5a3a', M.plank); for (let i = 0; i < 5; i++) m.flower(c + 0.5, cv - 0.9 + i * 0.45, z + 4.2, 0.7, CL[i % CL.length]);
    CY(a + 0.6, d + 0.35, z + 6.2, z + 6.9, 0.22, 0.22, '#ffd88a', M.glow, 6); B(a + 0.55, d + 0.3, z + 6.9, a + 0.65, d + 0.4, z + 7.3, DK, M.metal);
    const shelf = (u0, u1, v0, v1, n, fn) => { B(u0, v0, z, u1, v1, z + 0.2, DK, M.plank); for (let k = 0; k < n; k++) { const zz = z + 1.4 + k * 1.6; B(u0, v0, zz, u1, v1, zz + 0.12, WOODc, M.plank); fn && fn(zz + 0.12, k); } for (const uu of [u0, u1 - 0.12]) B(uu, v0, z, uu + 0.12, v1, z + 1.5 + n * 1.6, DK, M.plank); };
    switch (nm) {
      case '起居室的小凸窗间': { B(c - 1.4, b + 0.3, z, c - 0.3, d - 0.3, z + 1.8, '#c8a07a', M.plank); B(c - 1.35, b + 0.35, z + 1.8, c - 0.35, d - 0.35, z + 2.2, '#f2c6d2', M.cloth);
        for (const [vv, cc] of [[b + 0.8, '#a8c8e8'], [d - 0.8, '#f6e0a0'], [cv, '#ffffff']]) B(c - 0.95, vv - 0.4, z + 2.2, c - 0.45, vv + 0.4, z + 2.9, cc, M.cloth);
        m.pot(c - 0.55, b + 0.6, z + 2.2, 0.3, '#c86a5a', '#5aa64e', 2); CY(c - 2.4, d - 0.8, z, z + 2.2, 0.12, 0.12, DK, M.plank, 5); CY(c - 2.4, d - 0.8, z + 2.2, z + 2.35, 0.6, 0.6, WOODc, M.plank, 10); CY(c - 2.3, d - 0.75, z + 2.35, z + 2.7, 0.18, 0.15, '#ffffff', 0, 8); return true; }
      case '卧室的小书房': { B(c - 1.4, cv - 1.4, z + 2.8, c - 0.3, cv + 1.4, z + 3.1, WOODc, M.plank); for (const [uu, vv] of [[c - 1.3, cv - 1.3], [c - 0.4, cv - 1.3], [c - 1.3, cv + 1.3], [c - 0.4, cv + 1.3]]) B(uu - 0.08, vv - 0.08, z, uu + 0.08, vv + 0.08, z + 2.8, DK, M.plank);
        CY(c - 0.7, cv + 0.9, z + 3.1, z + 4.6, 0.06, 0.06, '#5a5466', M.metal, 5); CY(c - 0.8, cv + 0.9, z + 4.4, z + 4.9, 0.45, 0.2, '#ffe9a8', M.glow, 8); B(c - 1.1, cv - 0.6, z + 3.1, c - 0.6, cv + 0.1, z + 3.15, '#f8f4ec', 0);
        for (let i = 0; i < 4; i++) B(c - 1.2, cv - 1.25, z + 3.1 + i * 0.22, c - 0.6, cv - 0.75, z + 3.3 + i * 0.22, CL[i], M.cloth);
        B(c - 2.6, cv - 0.5, z + 1.8, c - 1.8, cv + 0.5, z + 2.0, '#c86a5a', M.cloth); B(c - 2.6, cv - 0.5, z, c - 2.5, cv + 0.5, z + 1.8, DK, M.plank); B(c - 2.0, cv - 0.5, z, c - 1.9, cv + 0.5, z + 1.8, DK, M.plank);
        shelf(c - 2.2, c - 0.3, d - 0.6, d - 0.25, 3, (zz, k) => { for (let i = 0; i < 5; i++) B(c - 2.1 + i * 0.35, d - 0.55, zz, c - 1.85 + i * 0.35, d - 0.3, zz + 0.9 + (i % 2) * 0.2, CL[(i + k) % CL.length], M.cloth); }); return true; }
      case '阁楼的观景窗': case '瞭望小屋': { B(c - 1.2, b + 0.4, z, c - 0.3, d - 0.4, z + 1.7, WOODc, M.plank); B(c - 1.15, b + 0.45, z + 1.7, c - 0.35, d - 0.45, z + 2.0, '#7ab0d8', M.cloth);
        if (nm === '瞭望小屋') { /* 只有瞭望小屋放望远镜（驾驶室已经有一架看天的）；阁楼的观景窗是窝着数星星的地方 */
        const tu = c - 2.0, tv = d - 1.0; for (let i = 0; i < 3; i++) { const an = i * 2.1; m.quad([tu, tv, z + 3.6], [tu + 0.1, tv, z + 3.6], [tu + Math.cos(an) * 0.8, tv + Math.sin(an) * 0.8, z], [tu + Math.cos(an) * 0.8 - 0.1, tv + Math.sin(an) * 0.8, z], DK, M.plank); }
        m.cyl(tu, tv, z + 3.6, z + 3.8, 0.25, 0.25, C.COP, M.metal, 8); m.quad([tu - 0.2, tv - 0.12, z + 3.8], [tu + 0.2, tv - 0.12, z + 3.8], [tu + 1.4, tv - 0.12, z + 5.0], [tu + 1.0, tv - 0.12, z + 5.0], C.COP, M.metal); m.quad([tu - 0.2, tv + 0.12, z + 3.8], [tu + 0.2, tv + 0.12, z + 3.8], [tu + 1.4, tv + 0.12, z + 5.0], [tu + 1.0, tv + 0.12, z + 5.0], C.COP, M.metal); }
        else { B(c - 1.1, b + 0.5, z + 2.0, c - 0.4, b + 1.9, z + 2.5, '#e8a0a8', M.cloth); B(c - 1.1, d - 1.9, z + 2.0, c - 0.4, d - 0.5, z + 2.3, '#f4ead8', M.cloth); CY(c - 1.9, d - 0.9, z, z + 1.6, 0.45, 0.45, WOODc, M.plank, 8); CY(c - 1.9, d - 0.9, z + 1.6, z + 2.1, 0.16, 0.14, '#e8e0d0', 0, 8); B(c - 2.2, d - 1.3, z + 1.6, c - 1.6, d - 0.5, z + 1.8, '#5a7ab0', 0); }
        B(c - 2.6, b + 0.2, z + 3.6, c - 1.2, b + 0.3, z + 5.4, nm === '瞭望小屋' ? '#e8d8b0' : '#2a3a5a', 0); if (nm !== '瞭望小屋') for (let i = 0; i < 7; i++) B(c - 2.5 + (i * 0.37) % 1.3, b + 0.31, z + 3.8 + ((i * 0.53) % 1.4), c - 2.45 + (i * 0.37) % 1.3, b + 0.33, z + 3.85 + ((i * 0.53) % 1.4), '#fff6c0', M.glow); else { B(c - 2.3, b + 0.31, z + 4.0, c - 1.9, b + 0.33, z + 4.6, '#7ab060', 0); B(c - 1.8, b + 0.31, z + 4.3, c - 1.5, b + 0.33, z + 4.9, '#7ab0d8', 0); } return true; }
      case '图书室的读书角': { B(c - 1.6, b + 0.3, z + 0.4, c - 0.3, b + 1.7, z + 1.9, '#5a7a9a', M.cloth); B(c - 0.7, b + 0.3, z + 1.9, c - 0.3, b + 1.7, z + 4.6, '#4a6a8a', M.cloth); B(c - 1.6, b + 0.3, z + 1.9, c - 0.3, b + 0.6, z + 3.0, '#4a6a8a', M.cloth); B(c - 1.6, b + 1.4, z + 1.9, c - 0.3, b + 1.7, z + 3.0, '#4a6a8a', M.cloth);
        CY(c - 1.0, b + 2.4, z, z + 5.8, 0.08, 0.08, '#5a5466', M.metal, 5); CY(c - 1.0, b + 2.4, z + 5.6, z + 6.6, 0.6, 0.3, '#ffe9a8', M.glow, 8);
        shelf(c - 0.75, c - 0.3, cv, d - 0.3, 3, (zz, k) => { for (let i = 0; i < 6; i++) B(c - 0.7, cv + 0.1 + i * ((d - cv - 0.5) / 6), zz, c - 0.35, cv + 0.35 + i * ((d - cv - 0.5) / 6), zz + 0.9 + (i % 3) * 0.15, CL[(i + k * 2) % CL.length], M.cloth); }); return true; }
      case '餐厅的茶水间': { B(c - 1.2, b + 0.3, z, c - 0.3, d - 0.3, z + 3.4, '#c8a878', M.plank); B(c - 1.25, b + 0.25, z + 3.4, c - 0.25, d - 0.25, z + 3.6, '#e8dcc8', M.stone);
        CY(c - 0.8, cv - 0.5, z + 3.6, z + 4.5, 0.4, 0.3, C.COP, M.metal, 10); CY(c - 0.8, cv - 0.5, z + 4.5, z + 4.7, 0.12, 0.12, C.COP, M.metal, 6); for (let i = 0; i < 3; i++) CY(c - 0.75, cv + 0.4 + i * 0.5, z + 3.6, z + 3.95, 0.16, 0.14, ['#ffffff', '#f2c6d2', '#a8c8e8'][i], 0, 8);
        B(c - 0.6, b + 0.4, z + 5.4, c - 0.3, d - 0.4, z + 5.5, WOODc, M.plank); for (let i = 0; i < 5; i++) CY(c - 0.45, b + 0.7 + i * ((W - 1.4) / 4), z + 5.5, z + 6.2, 0.18, 0.18, CL[i], 0, 8); return true; }
      case '工作间的零件仓': case '储藏间的腌菜间': { const jar = nm === '储藏间的腌菜间';
        for (const [v0, v1] of [[b + 0.25, b + 0.8], [d - 0.8, d - 0.25]]) shelf(a + 2.1, c - 0.3, v0, v1, 3, (zz, k) => { for (let i = 0; i < 3; i++) { const uu = a + 2.25 + i * ((c - a - 2.7) / 3); if (jar) CY(uu + 0.3, (v0 + v1) / 2, zz, zz + 0.9, 0.25, 0.22, ['#d8e8a0', '#f0c080', '#e89890', '#c8e0c8'][(i + k) % 4], M.glass, 8); else B(uu, v0 + 0.05, zz, uu + 0.6, v1 - 0.05, zz + 0.6, CL[(i + k * 2) % CL.length], 0); } });
        if (jar) for (let i = 0; i < 2; i++) CY(c - 0.8, cv - 0.6 + i * 1.2, z, z + 1.6, 0.5, 0.42, '#8a5a3a', 0, 10); else { CY(c - 0.35, cv, z + 4.2, z + 4.4, 0.9, 0.9, '#8a8a96', M.metal, 10); CY(c - 0.35, cv, z + 4.4, z + 4.5, 0.4, 0.4, '#5a5466', M.metal, 8); } return true; }
      case '驾驶室的小画室': { const eu = c - 1.1, ev = cv - 0.4; for (const dv of [-0.6, 0.6]) m.quad([eu, ev + dv, z], [eu + 0.12, ev + dv, z], [eu + 0.4, ev + dv * 0.3, z + 5.8], [eu + 0.28, ev + dv * 0.3, z + 5.8], DK, M.plank);
        B(eu + 0.15, ev - 0.9, z + 2.4, eu + 0.25, ev + 0.9, z + 4.8, '#f8f4ec', 0); B(eu + 0.26, ev - 0.7, z + 3.0, eu + 0.3, ev + 0.2, z + 4.4, '#7ab0d8', 0); B(eu + 0.26, ev - 0.2, z + 2.7, eu + 0.31, ev + 0.7, z + 3.6, '#9ad070', 0);
        B(c - 0.9, d - 1.4, z + 2.4, c - 0.3, d - 0.3, z + 2.6, WOODc, M.plank); B(c - 0.85, d - 1.35, z, c - 0.35, d - 0.35, z + 2.4, DK, M.plank); for (let i = 0; i < 4; i++) CY(c - 0.6, d - 1.2 + i * 0.25, z + 2.6, z + 3.0, 0.1, 0.1, CL[i], 0, 6);
        CY(c - 1.0, b + 0.7, z, z + 2.4, 0.5, 0.5, WOODc, M.plank, 8); return true; }
      case '海图室': { B(c - 1.9, cv - 1.1, z + 3.0, c - 0.35, cv + 1.1, z + 3.3, DK, M.plank); for (const [uu, vv] of [[c - 1.8, cv - 1.0], [c - 0.45, cv - 1.0], [c - 1.8, cv + 1.0], [c - 0.45, cv + 1.0]]) B(uu - 0.1, vv - 0.1, z, uu + 0.1, vv + 0.1, z + 3, DK, M.plank);
        B(c - 1.75, cv - 0.95, z + 3.3, c - 0.5, cv + 0.95, z + 3.35, '#e8d8b0', 0); B(c - 1.5, cv - 0.6, z + 3.35, c - 0.9, cv + 0.2, z + 3.37, '#7ab0d8', 0); B(c - 1.3, cv + 0.3, z + 3.35, c - 0.8, cv + 0.75, z + 3.37, '#9ad070', 0); CY(c - 0.9, cv - 0.8, z + 3.35, z + 3.5, 0.3, 0.3, C.COP, M.metal, 10);
        CY(c - 0.6, d - 0.45, z, z + 2.4, 0.35, 0.35, '#8a5a3a', M.plank, 8); for (let i = 0; i < 4; i++) CY(c - 0.6 + (i % 2 - 0.5) * 0.25, d - 0.45 + (i > 1 ? 0.15 : -0.15), z + 1.0, z + 3.4, 0.1, 0.1, '#f0e4c8', 0, 6); return true; }
      case '门厅的雨具间': { CY(c - 0.8, b + 0.8, z, z + 1.8, 0.45, 0.4, '#5a7a9a', M.metal, 10); for (let i = 0; i < 3; i++) { const uu = c - 0.8 + (i - 1) * 0.2; CY(uu, b + 0.8 + (i - 1) * 0.15, z + 0.5, z + 3.4, 0.06, 0.06, DK, 0, 4); CY(uu, b + 0.8 + (i - 1) * 0.15, z + 1.6, z + 3.0, 0.3, 0.12, CL[i], M.cloth, 8); }
        B(c - 0.35, b + 1.6, z + 5.0, c - 0.25, d - 0.4, z + 5.2, DK, M.plank); for (let i = 0; i < 2; i++) { const vv = b + 2.2 + i * 1.3; B(c - 0.8, vv - 0.45, z + 2.4, c - 0.3, vv + 0.45, z + 5.0, ['#f0c040', '#e86a6a'][i], M.cloth); }
        for (const uu of [c - 2.2, c - 1.7]) { B(uu - 0.2, d - 0.9, z, uu + 0.2, d - 0.3, z + 0.3, '#3a5a3a', M.cloth); B(uu - 0.2, d - 0.55, z + 0.3, uu + 0.2, d - 0.3, z + 1.2, '#3a5a3a', M.cloth); } B(a + 1.0, cv - 0.8, z, a + 2.0, cv + 0.8, z + 0.08, '#a8784a', M.cloth); return true; }
      case '浴室的蒸汽间': { for (let k = 0; k < 2; k++) B(c - 1.0 - k * 0.9, b + 0.3, z, c - 0.3 - k * 0.9, d - 0.3, z + 1.6 + (1 - k) * 1.4, '#c8935e', M.plank);
        CY(c - 2.4, b + 0.6, z, z + 1.0, 0.5, 0.42, '#5a5466', M.stone, 10); for (let i = 0; i < 5; i++) m.ball(c - 2.4 + Math.cos(i * 1.3) * 0.2, b + 0.6 + Math.sin(i * 1.3) * 0.2, z + 1.1, 0.2, 0.15, '#ff9a60', M.glow, 4, 5);
        CY(c - 2.4, d - 0.55, z, z + 0.9, 0.35, 0.4, '#a8784a', M.plank, 10); CY(c - 2.4, d - 0.55, z + 0.9, z + 1.6, 0.05, 0.05, DK, 0, 4); return true; }
    }
    return false;
  }
  // 悬空的部分要有东西托着：转了角度的上层房间，角落如果悬在下面房间外面，就加一根斜撑顶回下面的墙
  // 院子外面的草地：后面一排果树、堆肥箱、柴火垛；水池引一根铜管到花房浇水
  function yard(m, cut, o) {
    if (!showLv(cut, 1)) return;
    for (const [u, v, h, l] of [[11.6, -1.6, 7, 0.3], [15.8, -2.4, 6, -0.25], [19.4, -1.4, 7.5, 0.2], [46.2, 26.4, 6, 0.4]]) { /* 果树种在空地上，离墙远一点：原来贴着墙，树冠长进了门厅、洗衣房和餐厅的茶水间 */
      const cl = tree(m, o, u, v, HT, h, u * 7 + v, l);
      // 果子挂在叶簇的表面上（下半圈），不会飘在外面
      if (!o.snow && cl) cl.forEach((c, j) => { for (let k = 0; k < 2; k++) { const a = H(j, k + u) * 6.28, e = -0.15 - H(k, j + v) * 0.5, r = c[3] * 0.92; m.ball(c[0] + Math.cos(a) * r * Math.cos(e), c[1] + Math.sin(a) * r * Math.cos(e), c[2] + Math.sin(e) * c[3] * 0.8, 0.3, 0.3, o.season === 'autumn' ? '#e8a040' : '#d8483a', 0, 3, 6); } });
    }
    // 堆肥箱：三格木条箱
    { const u = 33, v = 0, z = HT; for (let i = 0; i < 3; i++) { const a = u - 2.4 + i * 1.6; m.box(a, v - 0.8, z, a + 1.5, v + 0.8, z + 1.4, i === 1 ? '#7a5636' : '#8a6040', M.plank); m.box(a + 0.15, v - 0.65, z + 1.2, a + 1.35, v + 0.65, z + 1.5, '#4a3424', 0); } }
    // 柴火垛：靠着柴房北墙外面晾着（新劈的柴先在这儿晾干，再搬进柴房），上面搭个小棚顶
    { const u = 5.2, v = 19.3, z = HT; for (let j = 0; j < 3; j++) for (let i = 0; i < 5 - j; i++) m.box(u - 2 + i * 0.8 + j * 0.4, v - 0.7, z + j * 0.7, u - 1.3 + i * 0.8 + j * 0.4, v + 0.7, z + j * 0.7 + 0.7, (i + j) % 2 ? '#c89a62' : '#b0844e', M.plank);
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
    for (const r of HUTS) { if (!showLv(cut, r.lv) || roomAt(...ctr(r), r.lv - 1)) continue; /* 底下正好是别的房间（坐在它屋顶上）就不用三角托架 */ inFrame(m, r, () => { const [a, b, c, d] = r.r, z = Z[r.lv]; for (const v of [b + 0.5, (b + d) / 2, d - 0.5]) { m.box(a, v - 0.15, z - 1.6, c + 0.3, v + 0.15, z - 1, C.TIMBER, M.plank); m.quad([c, v - 0.15, z - 1.4], [c, v + 0.15, z - 1.4], [a - 0.3, v + 0.15, z - 1 - (c - a) * 1.1], [a - 0.3, v - 0.15, z - 1 - (c - a) * 1.1], C.TIMBER, M.plank); } }); }
  }
  function extras(m, cut, o) { hutExtras(m, cut, o); } // 铁塔、烟囱、桁架、尾鳍、翅膀根都没有了（古树水城靠浮石浮着）
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
        feather(P, dx, dy, dz, len, 0.85, j % 2 ? '#e8e2d4' : C.WING, '#c8bea8');
        // 覆羽：短一点、深一点，盖在长羽根部
        const P2 = sp(Math.min(1, f + 0.05));
        feather([P2[0], P2[1] - 0.1, P2[2] + 0.2], dx, dy, dz, len * 0.45, 0.7, C.WING2, '#b8ae98');
      }
      // 根部的活塞：一伸一缩
      m.box(u - 0.25, v - 0.25, z0 - 4 + Math.sin(flap * 5) * 0.8, u + 0.25, v + 0.25, z0, '#c0c0c8', M.metal);
    });
  }

  // ---------- 整体 ----------
  /* ---------- 古树：空心的树干（里面是螺旋楼梯）、五条大根、三层树腰回廊、树冠 ---------- */
  const ROOT_DEG = [-33, 62, 120, 207]; // 0.36：北边那条根去掉了（那儿是古城之池） // 五条大根都从两间小屋之间的空档拱出水面，不顶着谁的墙和门
  function treeHome(m, cut, o) {
    const [cx, cy] = TC, snow = o.snow, bark = '#7d5b3e', bark2 = '#664730', inner = '#c09060', N = 36, top = 46;
    const rOut = (z) => (z < -2 ? 8 + Math.min(4, (-2 - z) * 0.16) : z > 32 ? 8 - (z - 32) * 0.16 : 8); // 水下越往下越粗，30 往上慢慢收
    const DOORS = [[1, 90], [2, 180], [3, 270]].map(([lv, deg]) => ({ z0: Z[lv], z1: Z[lv] + 10, a: deg * D2R }));
    const isDoor = (a, z) => DOORS.some((d) => z >= d.z0 - 0.01 && z < d.z1 && Math.abs(Math.atan2(Math.sin(a - d.a), Math.cos(a - d.a))) < 0.2);
    const lim = cut ? Z[cut.lv] + WH : 1e9, MB = M.bark != null ? M.bark : M.plank, MS = M.moss != null ? M.moss : M.grass;
    const MOSS = ['#5f8a3e', '#6e9846', '#557e38', '#7aa04e'], HANGC = ['#9aae78', '#8aa46a', '#a6b884', '#94aa70'], pk4 = (A, i) => A[((Math.floor(i) % 4) + 4) % 4];
    /* 0.37 树干不再是一根圆柱：一道道板根似的竖棱（大的 7 道、小的 11 道）顺着树干慢慢拧着往上长，树脚往外鼓成板根；门洞那一圈收平 */
    const ang = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    const flute = (a, z) => { const tw = a + z * 0.012; let f = 0.36 * Math.pow(Math.max(0, Math.cos(tw * 7 + 0.6)), 2) + 0.2 * Math.pow(Math.max(0, Math.cos(tw * 11 + 2.1 + Math.sin(z * 0.07) * 0.6)), 3) + 0.06 * Math.sin(a * 23 + z * 0.31) + 0.07;
      if (z < 3) f += Math.min(1.3, (3 - z) * 0.1) * Math.pow(Math.max(0, Math.cos(tw * 5 + 0.3)), 1.5);
      if (z > 34) f *= 1 + (z - 34) * 0.05;
      for (const d of DOORS) if (z > d.z0 - 2 && z < d.z1 + 2.5) { const da = ang(a, d.a); f *= Math.min(1, Math.max(0, (da - 0.24) / 0.3)); }
      return Math.max(0, f); };
    const rr = (a, z) => rOut(z) + flute(a, z), pt3 = (a, r, z) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z];
    /* 光滑的枝 / 根：Catmull-Rom 曲线上套圆环；flat 把断面压扁（根是扁的）；朝上的那几面按 moss 的概率长苔；flare 让起点（长出来的地方）鼓一点 */
    const tubeP = (pts0, r0, r1, col, op = {}) => { const pts = []; for (let i = 0; i + 1 < pts0.length; i++) { const p0 = pts0[Math.max(0, i - 1)], p1 = pts0[i], p2 = pts0[i + 1], p3 = pts0[Math.min(pts0.length - 1, i + 2)]; const ns = op.seg || 4; for (let k = 0; k < ns; k++) { const t = k / ns, t2 = t * t, t3 = t2 * t; pts.push([0, 1, 2].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } } pts.push(pts0[pts0.length - 1]);
      const n = op.n || 8, fl = op.flat || 1, mo = snow ? 0 : op.moss != null ? op.moss : 0.45, sd = op.seed || (pts0[0][0] * 7.1 + pts0[0][1] * 3.3), last = pts.length - 1;
      const rings = pts.map((p, i) => { const q = pts[Math.min(last, i + 1)], o2 = pts[Math.max(0, i - 1)], d = [q[0] - o2[0], q[1] - o2[1], q[2] - o2[2]], L = Math.hypot(...d) || 1, t = d.map((x) => x / L), up = Math.abs(t[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]; let x = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]]; const xl = Math.hypot(...x); x = x.map((v) => v / xl); const y = [t[1] * x[2] - t[2] * x[1], t[2] * x[0] - t[0] * x[2], t[0] * x[1] - t[1] * x[0]], tt = i / last; let r = r0 + (r1 - r0) * tt; if (op.flare && tt < 0.2) r *= 1 + op.flare * (1 - tt / 0.2) ** 2;
        return Array.from({ length: n }, (_, k) => { const a2 = (k / n) * 6.2832, wb = 1 + 0.07 * Math.sin(k * 2.3 + i * 0.9 + sd), dx = x.map((v) => v * Math.cos(a2)), dy = y.map((v) => v * Math.sin(a2) * fl); return [p[0] + (dx[0] + dy[0]) * r * wb, p[1] + (dx[1] + dy[1]) * r * wb, p[2] + (dx[2] + dy[2]) * r * wb]; }); });
      for (let i = 0; i + 1 < rings.length; i++) for (let k = 0; k < n; k++) { const A = rings[i][k], B = rings[i][(k + 1) % n], Cc = rings[i + 1][(k + 1) % n], Dd = rings[i + 1][k], cz = (A[2] + B[2] + Cc[2] + Dd[2]) / 4, pz = (pts[i][2] + pts[i + 1][2]) / 2, rrr = Math.max(0.05, r0 + (r1 - r0) * i / last);
        const topF = (cz - pz) / rrr, mossy = mo > 0 && topF > 0.35 && H(i * 3 + sd, k * 7 + 1) < mo * (0.55 + topF * 0.5), cl = mossy ? pk4(MOSS, i + k) : H(i + sd, k * 5) < 0.6 ? col : H(i * 2, k + sd) < 0.5 ? bark2 : '#86634a';
        m.quad(A, B, Cc, Dd, cl, mossy ? MS : MB); } return pts; };
    /* 一缕垂下来的苔（松萝）：几段细长的面一节节往下垂，有点随风晃；人能从里面穿过 */
    const hang = (p, len, sd) => { const sw0 = m.sway; m.sway = 0.7; const nS = 5 + Math.floor(H(sd, 4) * 3);
      for (let j = 0; j < nS; j++) { const a = H(sd, j + 2) * 6.2832, ca = Math.cos(a), sa = Math.sin(a), off = H(sd, j + 30) * 0.35, ln = len * (0.45 + H(sd, j + 40) * 0.55), segs = Math.max(2, Math.round(ln / 0.6)); let x = p[0] + ca * off, y = p[1] + sa * off, z = p[2] + H(sd, j + 50) * 0.2;
        for (let k = 0; k < segs; k++) { const z1 = z - ln / segs, dx = (H(sd * 3 + j, k + 3) - 0.5) * 0.14, x1 = x + dx * ca, y1 = y + dx * sa, w = 0.05 * (1 - (k / segs) * 0.75), w1 = 0.05 * (1 - ((k + 1) / segs) * 0.75), col = pk4(HANGC, k + j + sd);
          m.tri([x - sa * w, y + ca * w, z], [x + sa * w, y - ca * w, z], [x1 + sa * w1, y1 - ca * w1, z1], col, M.leaf); m.tri([x - sa * w, y + ca * w, z], [x1 + sa * w1, y1 - ca * w1, z1], [x1 - sa * w1, y1 + ca * w1, z1], col, M.leaf); x = x1; y = y1; z = z1; } }
      m.sway = sw0; };
    /* 贴在树皮上的一块苔：两三个半埋进树干的扁球挤在一起，只露出鼓鼓的一层 */
    const cushion = (a, z, k, sd) => { for (let j = 0; j < 3; j++) { const aj = a + (H(sd, j + 11) - 0.5) * 0.12, zj = z + (H(sd, j + 21) - 0.5) * 1.1, r0 = rr(aj, zj), rad = (0.42 + H(sd, j + 31) * 0.3) * k; m.blob(cx + Math.cos(aj) * (r0 - rad * 0.55), cy + Math.sin(aj) * (r0 - rad * 0.55), zj, rad, rad * (1.3 + H(sd, j) * 0.5), pk4(MOSS, j + sd), MS, sd + j); } };
    const zs = [-26, -22, -18, -14, -10, -7, -4, -2, -1, 0]; for (let z = 1.5; z < top; z += 1.5) zs.push(z); zs.push(top); const N2 = 72;
    for (let k = 0; k < zs.length - 1; k++) { const z0 = zs[k], z1 = zs[k + 1]; if (z0 >= lim) break;
      for (let i = 0; i < N2; i++) { const a0 = (i / N2) * 6.2832, a1 = ((i + 1) / N2) * 6.2832, am = (a0 + a1) / 2; if (isDoor(am, z0)) continue;
        const sk = Math.floor(i / 3 + H(i, 3) * 2), cr = H(sk, Math.floor(z0 / 6) + 40), col = cr < 0.45 ? bark : cr < 0.7 ? '#86634a' : cr < 0.9 ? bark2 : '#5e4430'; /* 一条条竖着的深浅（不是一格一格的） */
        m.quad(pt3(a0, rr(a0, z0), z0), pt3(a1, rr(a1, z0), z0), pt3(a1, rr(a1, z1), z1), pt3(a0, rr(a0, z1), z1), col, MB); }
      if (z0 >= -1 && z1 <= 40) for (let i = 0; i < N; i++) { const a0 = (i / N) * 6.2832, a1 = ((i + 1) / N) * 6.2832, am = (a0 + a1) / 2; if (isDoor(am, z0)) continue; const ri = TRUNK.hole; m.quad([cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri, z0], [cx + Math.cos(a1) * ri, cy + Math.sin(a1) * ri, z0], [cx + Math.cos(a1) * ri, cy + Math.sin(a1) * ri, z1], [cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri, z1], i % 2 ? inner : '#a8825a', M.plank); }
    }
    /* 树皮：28 道弯弯的厚皮棱（三角形断面，一面亮一面暗），贴着有起伏的树干、顺着它拧着往上长；门洞那儿断开 */
    if (!snow) for (let q = 0; q < 28; q++) { const a0 = (q / 28) * 6.2832 + H(q, 71) * 0.15, wob = 0.08 + H(q, 72) * 0.12, dl = 0.05 + H(q, 73) * 0.05, out = 0.18 + H(q, 74) * 0.2;
      const A = (z) => a0 + Math.sin(z * 0.11 + q) * wob + z * 0.012, light = '#9a7450', dk = '#5a4130';
      for (let z = -2; z < Math.min(top - 2, lim); z += 2) { const z1 = Math.min(z + 2, top - 2, lim), aa = A(z), ab = A(z1); if (isDoor(aa, z) || isDoor(ab, z1 - 0.01) || isDoor(aa + dl, z) || isDoor(aa - dl, z) || H(q * 5, Math.floor(z / 4)) < 0.12) continue;
        const ra = rr(aa, z) - 0.06, rb = rr(ab, z1) - 0.06, ka = rr(aa, z) - 0.06; void ka; m.quad(pt3(aa - dl, ra, z), pt3(aa, ra + out, z), pt3(ab, rb + out, z1), pt3(ab - dl, rb, z1), light, MB); m.quad(pt3(aa, ra + out, z), pt3(aa + dl, ra, z), pt3(ab + dl, rb, z1), pt3(ab, rb + out, z1), dk, MB); } }
    /* 树瘤：几处鼓起来的老疤，中间一个黑黑的树洞眼（都在人头顶上，不挡路） */
    if (!snow && !cut) for (const [deg, z] of [[150, 10.5], [330, 11.5], [30, 25.5], [250, 26], [110, 41], [300, 42.5]]) { const a = deg * D2R; if (isDoor(a, z)) continue; const r0 = rr(a, z); m.ball(cx + Math.cos(a) * (r0 - 0.2), cy + Math.sin(a) * (r0 - 0.2), z, 0.95, 1.25, '#6c4e36', MB, 6, 10, 0.18, deg); m.ball(cx + Math.cos(a) * (r0 + 0.5), cy + Math.sin(a) * (r0 + 0.5), z - 0.1, 0.36, 0.5, '#2e2218', M.flat, 5, 8); m.blob(cx + Math.cos(a) * (r0 + 0.25), cy + Math.sin(a) * (r0 + 0.25), z + 1.0, 0.5, 0.3, pk4(MOSS, deg), MS, deg); }
    /* 苔藓（0.37）：树干背阴的北面一大片、树脚一圈、每层回廊底下（照不到太阳、雨水顺着往下淌）一块块鼓鼓的苔 */
    if (!snow && !cut) { let id = 0; const spots = [];
      for (let q = 0; q < 44; q++) spots.push([Math.PI * 1.5 + (H(q, 91) - 0.5) * 2.6, 0.4 + H(q, 92) * 4.2, 1.1]);
      for (let q = 0; q < 26; q++) spots.push([H(q, 93) * 6.2832, 0.3 + H(q, 94) * 2.2, 1.2]);
      for (const lv of [2, 3]) for (let q = 0; q < 16; q++) spots.push([H(q + lv * 40, 95) * 6.2832, Z[lv] - 1.4 - H(q, 96) * 3.5, 0.9]);
      for (let q = 0; q < 30; q++) spots.push([Math.PI * 1.5 + (H(q, 97) - 0.5) * 1.8, 5 + H(q, 98) * 36, 0.8]);
      for (const [a, z, k] of spots) { if (isDoor(a, z) || isDoor(a, z + 1) || isDoor(a, z - 1)) continue; cushion(a, z, k, id++ * 3.7 + 1); }
      /* 树脚和回廊相接的地方长一圈蕨（叶子能穿过去） */
      for (let q = 0; q < 14; q++) { const a = (q / 14) * 6.2832 + H(q, 99) * 0.3; if (isDoor(a, 0.5) || ROOMS.some((r) => r.pod && r.lv === 1 && ang(a, r.deg * D2R) < 0.3)) continue; const r0 = rr(a, 0.5) + 0.5; m.foliage(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, 0.7, 0.85, 0.6, ['#4e7a34', '#5e8a3e', '#6a9446'], 16, q * 13 + 5, 0.55); }
      /* 回廊底下垂着的苔 */
      for (const lv of [2, 3]) { const R1 = GAL[lv], gaps = ROOMS.filter((r) => r.pod && r.lv === lv).map((r) => r.deg * D2R).concat([LIFT.deg * D2R]); for (let q = 0; q < 34; q++) { const a = H(q + lv * 70, 101) * 6.2832; if (gaps.some((g) => ang(a, g) < 0.3)) continue; const r0 = R1 - 0.3 - H(q, 102) * 1.6; hang([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, Z[lv] - 0.85], 1.2 + H(q, 103) * 2.4, q * 5.3 + lv); } } }
    // 门洞：门槛（树干壁那么厚的一段地板）、门框、门洞两侧的树干厚度
    for (const d of DOORS) { if (d.z0 >= lim) continue; for (let k = 0; k < 4; k++) { const a0 = d.a - 0.22 + k * 0.11, a1 = a0 + 0.11, P1 = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r], [p0, p1, p2, p3] = [P1(a0, 5.4), P1(a1, 5.4), P1(a1, 8.3), P1(a0, 8.3)]; m.quad([p0[0], p0[1], d.z0], [p1[0], p1[1], d.z0], [p2[0], p2[1], d.z0], [p3[0], p3[1], d.z0], '#a07a52', M.plank); m.quad([p0[0], p0[1], d.z0 - 0.6], [p3[0], p3[1], d.z0 - 0.6], [p2[0], p2[1], d.z0 - 0.6], [p1[0], p1[1], d.z0 - 0.6], '#6a4a30', M.plank); } for (const s2 of [-1, 1]) { const a = d.a + s2 * 0.2; for (const rr of [TRUNK.hole, 7.9]) void rr; m.quad([cx + Math.cos(a) * TRUNK.hole, cy + Math.sin(a) * TRUNK.hole, d.z0], [cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, d.z0], [cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, d.z1], [cx + Math.cos(a) * TRUNK.hole, cy + Math.sin(a) * TRUNK.hole, d.z1], inner, M.plank); }
      for (const rr of [TRUNK.hole, 8]) { const A0 = [cx + Math.cos(d.a - 0.2) * rr, cy + Math.sin(d.a - 0.2) * rr], A1 = [cx + Math.cos(d.a + 0.2) * rr, cy + Math.sin(d.a + 0.2) * rr]; m.quad([A0[0], A0[1], d.z1], [A1[0], A1[1], d.z1], [A1[0], A1[1], d.z1 + 0.6], [A0[0], A0[1], d.z1 + 0.6], C.TIMBER, M.plank); } }
    // 楼梯门好找：门两边一对暖黄的灯笼，门楣上挂一块木牌（上面刻着往上的箭头）
    for (const d of DOORS) { if (d.z0 >= lim) continue; const P1 = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      for (const sg of [-1, 1]) { const p = P1(d.a + sg * 0.3, 8.7); m.box(p[0] - 0.05, p[1] - 0.05, d.z0 + 7.45, p[0] + 0.05, p[1] + 0.05, d.z0 + 8.4, C.TIMBER, M.metal); m.cyl(p[0], p[1], d.z0 + 6.7, d.z0 + 7.0, 0.14, 0.22, '#f2c070', M.glow, 8, false); m.cyl(p[0], p[1], d.z0 + 7.0, d.z0 + 7.3, 0.22, 0.14, '#f2c070', M.glow, 8, false); m.box(p[0] - 0.27, p[1] - 0.27, d.z0 + 7.3, p[0] + 0.27, p[1] + 0.27, d.z0 + 7.45, C.TIMBER, M.metal); m.box(p[0] - 0.25, p[1] - 0.25, d.z0 + 6.55, p[0] + 0.25, p[1] + 0.25, d.z0 + 6.7, C.TIMBER, M.metal); }
      const s0 = P1(d.a - 0.17, 8.55), s1 = P1(d.a + 0.17, 8.55); m.quad([s0[0], s0[1], d.z1 + 0.6], [s1[0], s1[1], d.z1 + 0.6], [s1[0], s1[1], d.z1 + 2.0], [s0[0], s0[1], d.z1 + 2.0], '#c89a5a', M.plank);
      const am = P1(d.a, 8.6), up = (zz, w) => { const q0 = P1(d.a - w, 8.6), q1 = P1(d.a + w, 8.6); m.quad([q0[0], q0[1], zz], [q1[0], q1[1], zz], [q1[0], q1[1], zz + 0.22], [q0[0], q0[1], zz + 0.22], '#5a3a22', M.plank); };
      up(d.z1 + 1.55, 0.03); up(d.z1 + 1.25, 0.07); up(d.z1 + 0.95, 0.1); m.box(am[0] - 0.05, am[1] - 0.05, d.z1 + 0.75, am[0] + 0.05, am[1] + 0.05, d.z1 + 1.6, '#5a3a22', M.plank); }
    // 吊篮：顶上一根横梁伸出来挂着滑轮，两根绳子垂到一楼；每层回廊外沿一个小站台（栏杆开个口、挂一个小铃铛），篮子停在一楼
    { const a = LIFT.deg * D2R, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, P2 = (r, w) => [cx + ux * r + nx * w, cy + uy * r + ny * w], c0 = P2(LIFT.r, 0), zTop = Z[3] + 13;
      if (!cut) { const b0 = P2(7.6, 0); m.box(Math.min(b0[0], c0[0]) - 0.2, Math.min(b0[1], c0[1]) - 0.2, zTop, Math.max(b0[0], c0[0]) + 0.2, Math.max(b0[1], c0[1]) + 0.2, zTop + 0.5, C.TIMBER, M.plank); m.cyl(c0[0], c0[1], zTop - 0.9, zTop - 0.1, 0.55, 0.55, '#8a7a6a', M.metal, 10); }
      for (const sg of [-0.55, 0.55]) { const q = P2(LIFT.r, sg); m.box(q[0] - 0.04, q[1] - 0.04, Z[1] + 4.2, q[0] + 0.04, q[1] + 0.04, Math.min(zTop - 0.5, lim), '#c8b088', M.cloth); }
      m.pk(PK.lift + 1); { const z = Z[1] + 0.3; m.box(c0[0] - 0.75, c0[1] - 0.75, z, c0[0] + 0.75, c0[1] + 0.75, z + 0.25, '#8a5a30', M.plank);
        for (let k = 0; k < 4; k++) { const zz = z + 0.25 + k * 0.5; m.box(c0[0] - 0.8, c0[1] - 0.8, zz, c0[0] + 0.8, c0[1] + 0.8, zz + 0.42, k % 2 ? '#c8945a' : '#b88048', M.plank, k === 3 ? '#a8743a' : null); }
        m.box(c0[0] - 0.62, c0[1] - 0.62, z + 0.3, c0[0] + 0.62, c0[1] + 0.62, z + 2.3, '#e8d8b0', M.cloth); m.box(c0[0] - 0.82, c0[1] - 0.82, z + 2.25, c0[0] + 0.82, c0[1] + 0.82, z + 2.5, '#7a5030', M.plank);
        for (const sg of [-0.55, 0.55]) { const q = P2(LIFT.r, sg); m.box(q[0] - 0.05, q[1] - 0.05, z + 2.5, q[0] + 0.05, q[1] + 0.05, z + 4.2, '#c8b088', M.cloth); } }
      for (const lv of [2, 3]) { if (Z[lv] >= lim) continue; m.pk(PK.lift + lv); const z = Z[lv], bp = P2(LIFT.r + 1.2, 0.9); m.box(bp[0] - 0.08, bp[1] - 0.08, z, bp[0] + 0.08, bp[1] + 0.08, z + 4.2, C.TIMBER, M.plank); m.box(bp[0] - 0.5, bp[1] - 0.08, z + 4.0, bp[0] + 0.08, bp[1] + 0.08, z + 4.2, C.TIMBER, M.plank); m.cyl(bp[0] - 0.4, bp[1], z + 3.2, z + 3.9, 0.3, 0.12, C.GOLD, M.metal, 8);
        const pl = P2(LIFT.r, 0); m.box(pl[0] - 0.9, pl[1] - 0.9, z - 0.05, pl[0] + 0.9, pl[1] + 0.9, z + 0.06, '#c49a6a', M.plank); }
      m.pk(0); }
    // 树心里：一楼的地板、心柱、楼梯每层到达的平台、顶上的天花板
    if (Z[1] < lim) for (let i = 0; i < N; i++) { const a0 = (i / N) * 6.2832, a1 = ((i + 1) / N) * 6.2832; m.tri([cx, cy, 0], [cx + Math.cos(a0) * TRUNK.hole, cy + Math.sin(a0) * TRUNK.hole, 0], [cx + Math.cos(a1) * TRUNK.hole, cy + Math.sin(a1) * TRUNK.hole, 0], '#9a7a58', M.plank); }
    m.cyl(cx, cy, -1, Math.min(40, lim), TRUNK.post, TRUNK.post, '#8a6a4a', M.plank, 12);
    if (!cut) for (let i = 0; i < N; i++) { const a0 = (i / N) * 6.2832, a1 = ((i + 1) / N) * 6.2832; m.tri([cx, cy, 40], [cx + Math.cos(a1) * TRUNK.hole, cy + Math.sin(a1) * TRUNK.hole, 40], [cx + Math.cos(a0) * TRUNK.hole, cy + Math.sin(a0) * TRUNK.hole, 40], inner, M.plank); }
    // 螺旋楼梯：一级 0.6 高，木踏板下面有一道托梁；两头 ±12° 的平台
    const wedge = (a0, a1, z, th, col) => { const P1 = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; const [p0, p1, p2, p3] = [P1(a0, 1.8), P1(a1, 1.8), P1(a1, 5.6), P1(a0, 5.6)];
      m.quad([p0[0], p0[1], z], [p1[0], p1[1], z], [p2[0], p2[1], z], [p3[0], p3[1], z], col, M.plank); m.quad([p0[0], p0[1], z - th], [p3[0], p3[1], z - th], [p3[0], p3[1], z], [p0[0], p0[1], z], '#7a5a3e', M.plank); m.quad([p1[0], p1[1], z], [p2[0], p2[1], z], [p2[0], p2[1], z - th], [p1[0], p1[1], z - th], '#7a5a3e', M.plank); m.quad([p3[0], p3[1], z - th], [p2[0], p2[1], z - th], [p2[0], p2[1], z], [p3[0], p3[1], z], '#7a5a3e', M.plank); m.quad([p0[0], p0[1], z - th], [p1[0], p1[1], z - th], [p2[0], p2[1], z - th], [p3[0], p3[1], z - th], '#6a4a30', M.plank); };
    for (const r of RAMPS) { if (!r.spiral || Z[r.a] >= lim) continue; const za = Z[r.a], zb = Z[r.b], n = 25, rise = (zb - za) / n;
      for (let i = 0; i < n; i++) { const t0 = r.ang0 + (r.ang1 - r.ang0) * i / n, t1 = r.ang0 + (r.ang1 - r.ang0) * (i + 1) / n, z = za + rise * (i + 1); if (z > lim) break; wedge(t0, t1, z, 0.9, i % 2 ? '#c49a6a' : '#b88e60'); }
      const d = r.deg0 * D2R; if (r.b !== 1 && zb < lim) wedge(r.ang1, r.ang1 + 24 * D2R, zb, 0.9, '#c49a6a'); // 楼上到达的平台
      for (let i = 0; i <= 12; i++) { const t = r.ang0 + (r.ang1 - r.ang0) * i / 12, z = za + (zb - za) * i / 12 + 3.2, p = [cx + Math.cos(t) * 2.0, cy + Math.sin(t) * 2.0]; if (z < lim) m.box(p[0] - 0.08, p[1] - 0.08, z - 3.2 + rise, p[0] + 0.08, p[1] + 0.08, z, '#6a4a30', M.plank); } void d; } // 内侧一排小扶手柱
    // 五条大根：从树脚钻进水里，在两间小屋之间拱出水面，再潜下去，翻过岩顶垂下峭壁
    for (const deg of ROOT_DEG) { const a = deg * D2R, P1 = (r, z, w = 0) => [cx + Math.cos(a) * r - Math.sin(a) * w, cy + Math.sin(a) * r + Math.cos(a) * w, z];
      const pts = [P1(8.5, -3), P1(13, -2.2), P1(16, 1.4, 0.6), P1(19, 2.2, -0.4), P1(22, -1.6, 0.3), P1(25, -3), P1(27.6, 1.2), P1(30.6, 0.4), P1(31.6, -8), P1(32, -20, 0.8)];
      tubeP(pts, 1.6, 0.42, '#6b5442', { n: 10, flat: 0.72, moss: 0.75, flare: 0.7, seg: 5, seed: deg });
      tubeP([P1(8.4, -4), P1(10, -14), P1(9.6, -24)], 1.7, 1.0, '#5f4a38', { n: 10, moss: 0.9, flare: 0.5, seed: deg + 1 });
      /* 0.37：大根拱出地面的地方再分出几条侧根，扭着钻回地里；拱顶上一块块苔 */
      if (!cut && CITY) { const GTz = CITY.GT, busy = (q) => (CITY.BUSY || []).some(([bu, bv, br]) => Math.hypot(q[0] - bu, q[1] - bv) < br + 0.6) || (CITY.FLAT || []).some(([a0, b0, a1, b1]) => q[0] > a0 && q[0] < a1 && q[1] > b0 && q[1] < b1) || (CITY.inPond && CITY.inPond(q[0], q[1], 1.2));
        for (const [r0, z0, j] of [[14.2, 0.2, 1], [18.6, 1.2, 2], [27.2, 0.4, 3]]) for (const sg of [-1, 1]) { if (H(deg + j, sg + 5) > 0.8) continue; const w = sg * (2.2 + H(deg, j + sg) * 2.2), st = P1(r0, z0 - 0.35, sg * 0.4), mid = P1(r0 + 1.1, z0 - 0.15, w * 0.55), en = P1(r0 + 2.2 + H(deg, j) * 1.6, GTz - 0.7, w); if (busy(mid) || busy(en)) continue; tubeP([st, mid, en], 0.62, 0.2, '#6b5442', { n: 8, flat: 0.7, moss: 0.7, seed: deg * 3 + j + sg }); }
        if (!snow) for (const [r0, z0] of [[16, 1.4], [19, 2.2], [27.6, 1.2], [30.6, 0.4]]) { const q = P1(r0, z0 + 1.05); if (!busy(q)) for (let j = 0; j < 3; j++) m.blob(q[0] + (H(deg, j + 40) - 0.5) * 1.4, q[1] + (H(deg, j + 41) - 0.5) * 1.4, q[2] - 0.15 - j * 0.12, 0.7 + H(deg, j) * 0.4, 0.32, MOSS[j], MS, deg + j); } } }
    // 树腰回廊：三层，一圈木板（往外的板缝），外沿栏杆（小屋门口断开），下面一圈斜撑顶着树干
    for (const lv of [1, 2, 3]) { if (Z[lv] >= lim + 0.01 && !(cut && cut.lv === lv)) continue; if (cut && cut.lv < lv) continue; const z = Z[lv], R1 = GAL[lv], R0 = TRUNK.r - 0.75; /* 回廊铺进树皮底下：树皮有起伏，以前最凹的地方和回廊之间漏一条缝，从缝里看得到下面 */
      const gaps = ROOMS.filter((q) => q.pod && q.lv === lv && !q.noShell).map((q) => q.deg * D2R).concat(lv === 2 ? [RM.store.deg * D2R] : []).concat([LIFT.deg * D2R]);
      for (let i = 0; i < 48; i++) { const a0 = (i / 48) * 6.2832, a1 = ((i + 1) / 48) * 6.2832, am = (a0 + a1) / 2, P1 = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
        const [p0, p1, p2, p3] = [P1(a0, R0), P1(a1, R0), P1(a1, R1), P1(a0, R1)];
        m.quad([p0[0], p0[1], z], [p1[0], p1[1], z], [p2[0], p2[1], z], [p3[0], p3[1], z], snow ? '#eef4fa' : i % 2 ? '#b88a5a' : '#a87a4a', snow ? M.snow : M.plank); m.quad([p3[0], p3[1], z - 0.8], [p2[0], p2[1], z - 0.8], [p2[0], p2[1], z], [p3[0], p3[1], z], '#7a5a3e', M.plank); m.quad([p0[0], p0[1], z - 0.8], [p1[0], p1[1], z - 0.8], [p2[0], p2[1], z - 0.8], [p3[0], p3[1], z - 0.8], '#6a4a30', M.plank);
        const gap = gaps.some((g) => Math.abs(Math.atan2(Math.sin(am - g), Math.cos(am - g))) < 0.24);
        if (!gap && i % 8 === 4 && !cut) { const q = P1(am, R1 - 0.15); m.box(q[0] - 0.07, q[1] - 0.07, z + 3.3, q[0] + 0.07, q[1] + 0.07, z + 5.3, C.TIMBER, M.metal); m.cyl(q[0], q[1], z + 4.5, z + 4.85, 0.16, 0.24, '#f2c070', M.glow, 8, false); m.cyl(q[0], q[1], z + 4.85, z + 5.2, 0.24, 0.16, '#f2c070', M.glow, 8, false); m.cyl(q[0], q[1], z + 5.2, z + 5.32, 0.18, 0.18, C.TIMBER, M.metal, 8); m.cyl(q[0], q[1], z + 4.4, z + 4.5, 0.17, 0.17, C.TIMBER, M.metal, 8); } // 回廊栏杆上隔一段一盏小灯笼
        if (!gap) { const q0 = P1(a0, R1 - 0.15), q1 = P1(a1, R1 - 0.15); m.quad([q0[0], q0[1], z + 3.0], [q1[0], q1[1], z + 3.0], [q1[0], q1[1], z + 3.3], [q0[0], q0[1], z + 3.3], C.TIMBER, M.plank); if (i % 2 === 0) m.box(q0[0] - 0.1, q0[1] - 0.1, z, q0[0] + 0.1, q0[1] + 0.1, z + 3.1, C.TIMBER, M.plank); }
        if (i % 6 === 0 && lv > 1) { const b0 = P1(am, R1 - 1.6), b1 = P1(am, R0 + 0.2); /* 斜撑从回廊外沿往里收一格多：站在栏杆上不会顶到头 */ m.quad([b0[0] - 0.15, b0[1] - 0.15, z - 0.8], [b0[0] + 0.15, b0[1] + 0.15, z - 0.8], [b1[0] + 0.15, b1[1] + 0.15, z - 4.5], [b1[0] - 0.15, b1[1] - 0.15, z - 4.5], C.TIMBER, M.plank); } } }
    /* 树托着房子（0.34）：每间圆木屋底下，从树干长出一根粗枝，到屋子下面分成三根「手指」，往上捧住屋子的底边，指尖冒出一小撮叶子——
       房子是长在树上的，不是挂在回廊上的 */
    if (!cut) for (const r of ROOMS) { if (!r.pod || r.noShell || !r.c) continue; if (ROOMS.some((q) => q !== r && q.c && q.lv === r.lv - 1 && Math.hypot(q.c[0] - r.c[0], q.c[1] - r.c[1]) < 1)) continue; // 叠在别的屋子上面的不用托
      const z0 = Z[r.lv], a = r.deg * D2R, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, rc = r.rc, rad = r.c[2], P1 = (rr, z, w = 0) => [cx + ux * rr + nx * w, cy + uy * rr + ny * w, z];
      const hub = P1(rc - rad * 0.15, z0 - 1.9); tubeP([P1(7.4, z0 - 7), P1(9.5, z0 - 5.2), P1(rc - rad * 0.7, z0 - 2.8), hub], 0.95, 0.5, bark, { n: 10, moss: 0.6, flare: 0.8, seed: r.deg });
      if (!snow && r.lv > 1) for (let j = 0; j < 4; j++) { const q = P1(9.2 + j * (rc - rad * 0.4 - 9.2) / 3, z0 - 5.2 + j * 1.0 - 0.8, (H(r.deg, j) - 0.5) * 0.6); hang(q, 1.0 + H(r.deg, j + 9) * 1.8, r.deg + j * 7); }
      for (const ph of [-0.95, 0, 0.95]) { const e = P1(rc + Math.cos(ph) * (rad + 0.3), z0 + 0.15, Math.sin(ph) * (rad + 0.3)), mid = P1(rc + Math.cos(ph) * rad * 0.62, z0 - 1.25, Math.sin(ph) * rad * 0.62); tubeP([hub, mid, e], 0.42, 0.15, bark, { n: 8, moss: 0.5, seed: r.deg + ph * 10 });
        if (!snow) m.foliage(e[0] + ux * 0.4, e[1] + uy * 0.4, z0 + 0.7, 0.85, 0.55, LEAF(o), 14, Math.round(r.deg * 7 + ph * 10), 0.55); } }
    if (!cut && CITY) { const { u, v } = SHRINE, z0 = CITY.GT, RED = '#a8423a', WD = '#7a4a30';
      m.box(u - 2.6, v - 2.4, z0 - 0.2, u + 2.6, v + 2.4, z0 + 0.35, '#bdb39c', M.stone); m.box(u - 2.2, v - 2.0, z0 + 0.35, u + 2.2, v + 2.0, z0 + 0.7, '#c8bea8', M.stone); m.box(u + 2.2, v - 0.8, z0 - 0.2, u + 3.0, v + 0.8, z0 + 0.35, '#b3a992', M.stone); // 两级石台 + 前面一级踏步
      for (const [du, dv] of [[-1.9, -1.6], [-1.9, 1.6], [0.1, -1.6], [0.1, 1.6]]) m.cyl(u + du, v + dv, z0 + 0.7, z0 + 4.6, 0.16, 0.16, RED, M.plank, 8); // 四根红漆柱
      m.box(u - 2.1, v - 1.7, z0 + 0.7, u - 1.85, v + 1.7, z0 + 4.4, WD, M.plank); for (const sg of [-1, 1]) m.box(u - 1.95, v + sg * 1.6 - 0.07, z0 + 0.7, u + 0.05, v + sg * 1.6 + 0.07, z0 + 4.4, WD, M.plank); // 后墙、两边的板墙
      m.box(u - 2.0, v - 1.7, z0 + 4.4, u + 0.2, v + 1.7, z0 + 4.7, RED, M.plank); m.gable(u - 2.6, v - 2.3, u + 0.8, v + 2.3, z0 + 4.7, 1.9, 'v', '#5e6670', M.tile, 0.4, '#7a4a30', M.plank); // 檐枋 + 两坡的瓦顶
      for (const sg of [-1, 1]) m.box(u - 2.7, v + sg * 2.3 - 0.12, z0 + 4.55, u + 0.9, v + sg * 2.3 + 0.12, z0 + 4.8, '#4e565e', M.tile); m.box(u - 0.95, v - 0.15, z0 + 6.5, u - 0.75, v + 0.15, z0 + 6.9, '#c8a858', M.metal); // 檐口、屋脊上的小宝珠
      m.cyl(u - 1.4, v, z0 + 0.7, z0 + 1.2, 0.75, 0.6, '#e8a8b8', M.flat, 12); m.cyl(u - 1.4, v, z0 + 1.2, z0 + 2.4, 0.5, 0.36, '#c8a858', M.metal, 12); m.ball(u - 1.4, v, z0 + 2.75, 0.34, 0.36, '#c8a858', M.metal, 8, 12); // 莲花座上的小佛像
      m.box(u - 0.7, v - 1.0, z0 + 0.7, u - 0.1, v + 1.0, z0 + 1.7, '#8a2a24', M.cloth); for (let k = 0; k < 4; k++) m.ball(u - 0.4, v - 0.6 + k * 0.4, z0 + 1.85, 0.16, 0.15, ['#f0a040', '#f4c8a0', '#e85a4a', '#f0a040'][k], M.flat, 5, 8); // 供桌和果子
      m.pk(PK.shrine); m.cyl(u + 1.3, v, z0 + 0.7, z0 + 1.2, 0.18, 0.18, '#7a5a3a', M.metal, 6); m.cyl(u + 1.3, v, z0 + 1.2, z0 + 1.9, 0.55, 0.62, '#9a7a4a', M.metal, 12); m.cyl(u + 1.3, v, z0 + 1.9, z0 + 2.05, 0.66, 0.66, '#b8985a', M.metal, 12); m.cyl(u + 1.3, v, z0 + 2.05, z0 + 2.1, 0.5, 0.5, '#d8d0c0', M.soil, 12); m.pk(0); // 铜香炉（点它）
      m.box(u + 1.5, v + 2.0, z0 + 0.7, u + 1.65, v + 2.15, z0 + 3.2, WD, M.plank); m.box(u - 0.3, v + 2.0, z0 + 0.7, u - 0.15, v + 2.15, z0 + 3.2, WD, M.plank); m.box(u - 0.4, v + 1.98, z0 + 3.0, u + 1.75, v + 2.17, z0 + 3.2, WD, M.plank);
      for (let k = 0; k < 5; k++) m.box(u - 0.15 + k * 0.32, v + 2.04, z0 + 2.2, u + 0.05 + k * 0.32, v + 2.11, z0 + 2.95, ['#e8d8b0', '#f0c8c8', '#e8d8b0', '#d8e8c8', '#e8d8b0'][k], M.plank); // 挂着许愿木牌的架子
      if (!o.snow) { m.foliage(u - 3.2, v - 2.6, z0 + 2.2, 1.6, 1.4, LEAF(o), 26, 51, 0.6); m.foliage(u - 3.0, v + 2.8, z0 + 1.6, 1.3, 1.1, LEAF(o), 20, 52, 0.6); m.blob(u + 2.6, v - 1.9, z0 + 0.3, 0.6, 0.3, '#6a9a4a', M.grass, 5); } } // 旁边两丛灌木
    // 白帆：两根横桅从树干上伸出去，挂着两面帆（替代原来的翅膀：岛靠浮石浮着，帆借风转向，舵台拉绳）
    if (!cut) for (const [deg, zTop, zBot, len] of [[0, 46, 24, 25], [205, 46, 35, 23]]) { const a = deg * D2R, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, P1 = (r, z, w = 0) => [cx + ux * r + nx * w, cy + uy * r + ny * w, z];
      if (CITY) CITY.rootLine(m, [P1(7, zTop - 1), P1(16, zTop + 0.5), P1(len, zTop)], 0.5, 0.25, '#6a5040');
      const N2 = 6; for (let k = 0; k < N2; k++) { const r0 = 10 + (len - 11) * k / N2, r1 = 10 + (len - 11) * (k + 1) / N2, b0 = Math.sin((k / N2) * Math.PI) * 1.4, b1 = Math.sin(((k + 1) / N2) * Math.PI) * 1.4, d0 = zBot + (zTop - zBot) * (k / N2) * 0.35, d1 = zBot + (zTop - zBot) * ((k + 1) / N2) * 0.35;
        m.quad(P1(r0, zTop - 0.5, 0), P1(r1, zTop - 0.5, 0), P1(r1, d1, b1), P1(r0, d0, b0), snow ? '#eef2f4' : k % 2 ? '#f4efe2' : '#ece4d2', M.cloth); }
      m.quad(P1(len - 1, zTop - 0.5), P1(len - 0.6, zTop - 0.5), P1(len - 0.6, zBot + (zTop - zBot) * 0.35), P1(len - 1, zBot + (zTop - zBot) * 0.35), '#8a7a5a', 0); }
    /* 树冠（0.37 重做）：树干顶上分出七根大枝，每根大枝半路再分出两根侧枝、侧枝头上再分小枝；叶子长在枝头上一团一团的，团与团之间看得见枝干；
       大枝朝上的那面长着苔、挂着一缕缕松萝，枝杈的窝里长着蕨 */
    if (!cut) { const cols = LEAF(o), FERN = ['#4e7a34', '#5e8a3e', '#6a9446'];
      for (let k = 0; k < 7; k++) { const a = (25 + k * 51.4 + (H(k, 61) - 0.5) * 14) * D2R, len = 15 + H(k, 62) * 6, rise = 6 + H(k, 63) * 5, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, P = (r, z, w = 0) => [cx + ux * r + nx * w, cy + uy * r + ny * w, z];
        const w1 = (H(k, 64) - 0.5) * 3, w2 = (H(k, 65) - 0.5) * 5, b0 = P(2.5, top - 4), b1 = P(6.8, top + 0.6, w1 * 0.3), b2 = P(len * 0.55, top + rise * 0.7, w1), tip = P(len, top + rise, w2);
        const path = tubeP([b0, b1, b2, tip], 2.4, 0.65, bark, { n: 12, moss: 0.7, flare: 0.5, seg: 5, seed: k * 11 + 3 });
        if (!snow) { m.foliage(tip[0], tip[1], tip[2] + 1.4, 5.6, 3.6, cols, 60, k * 9 + 1, 1.12); for (let j = 0; j < 4; j++) { const q = path[4 + j * Math.floor((path.length - 6) / 4)]; if (q) hang([q[0], q[1], q[2] - 1.2], 2.0 + H(k, j + 70) * 3.5, k * 13 + j); } m.foliage(b1[0], b1[1], b1[2] + 1.3, 1.3, 0.8, FERN, 18, k * 7 + 40, 0.6); }
        for (const sg of [-1, 1]) { const tt = 0.45 + H(k, sg + 66) * 0.2, st = path[Math.floor(path.length * tt)], aa = a + sg * (0.55 + H(k, sg + 67) * 0.4), L2 = 6 + H(k, sg + 68) * 3.5, up = 3 + H(k, sg + 69) * 2.5, dx = Math.cos(aa), dy = Math.sin(aa);
          const mid = [st[0] + dx * L2 * 0.5, st[1] + dy * L2 * 0.5, st[2] + up * 0.35], en = [st[0] + dx * L2, st[1] + dy * L2, st[2] + up];
          tubeP([st, mid, en], 0.85, 0.28, bark, { n: 8, moss: 0.6, seed: k * 17 + sg });
          for (const s3 of [-1, 1]) { const a3 = aa + s3 * 0.7, e3 = [en[0] + Math.cos(a3) * 2.2, en[1] + Math.sin(a3) * 2.2, en[2] + 1.4]; tubeP([en, e3], 0.28, 0.1, bark, { n: 6, moss: 0, seed: k * 19 + sg * 3 + s3 }); }
          if (!snow) { m.foliage(en[0], en[1], en[2] + 1.5, 4.2, 2.8, cols, 46, k * 9 + 4 + sg, 1.05); hang([mid[0], mid[1], mid[2] - 0.5], 1.5 + H(k, sg + 80) * 2.5, k * 23 + sg); } } }
      if (!snow) m.foliage(cx, cy, top + 12, 8.5, 5.2, cols, 80, 77, 1.15); }
  }
  function build(o) {
    if (CITY) CITY.BUSY = ROOMS.filter((r) => r.c && r.lv === 1).map((r) => [r.c[0], r.c[1], r.c[2] + 1.2]).concat([[TC[0], TC[1], 12.2], [SHRINE.u, SHRINE.v, 3.6]]);
    if (CITY) CITY.FLAT = MODS.filter((q) => q.kind === 'dock' || q.kind === 'walk' || q.kind === 'farm').map((q) => { const fr = mFrame(q), [a, b, c, d] = q.r, P4 = [[a, b], [c, b], [c, d], [a, d]].map(([x, y]) => toW(fr, x, y)); return [Math.min(...P4.map((p) => p[0])) - 0.8, Math.min(...P4.map((p) => p[1])) - 0.8, Math.max(...P4.map((p) => p[0])) + 0.8, Math.max(...P4.map((p) => p[1])) + 0.8]; });
    const m = new Mesh(), cut = o.cut || null;
    // 详细视图：只看一个房间，外面的船体、甲板模块、植物都不用建（反正也被裁掉），转视角时重建得快
    const F1 = o.focus && RM[o.focus];
    if (!F1) { if (CITY) CITY.build(m, o, { pkFish: PK.fish }); else deckAndHull(m, cut, o); if (o.cityOnly || PP.CITY_ONLY) return m; treeHome(m, cut, o); modules(m, cut, o); } // 底层：古树水城的岩体、浮石、水下古城、水面
    for (const r of ROOMS) if (showLv(cut, r.lv) && (!F1 || r === F1)) { if (isRound(r)) roundRoom(m, r, cut, o); else inFrame(m, r.rot ? r : null, () => leanWrap(m, Z[r.lv], r.lean, () => rectRoom(m, r, cut, o))); }
    for (const p of PASS) if (showLv(cut, p.lv)) inFrame(m, p.F, () => passage(m, p, cut, o));
    for (const op of OPEN) { if (!showLv(cut, op[0])) continue; const z = Z[op[0]]; inFrame(m, frameOf(op[6]), () => { m.box(op[1], op[2], z - 1, op[3], op[4], z, '#8a7e70', M.stone, o.snow ? '#eef4fa' : '#9a8a6e', o.snow ? M.snow : M.stone); for (let a = op[1] + 1.2; a < op[3] - 0.6; a += 2.6) for (const b of [op[2] + 1, op[4] - 1]) if (!roomAt(...toW(frameOf(op[6]), a, b), op[0] - 1)) /* 底下就是房间（屋顶花园在餐厅顶上）就不用斜撑 */ m.quad([a, b, z - 1], [a + 0.25, b, z - 1], [a + 0.25 + (a - (op[1] + op[3]) / 2) * 0.12, b, z - 7], [a + (a - (op[1] + op[3]) / 2) * 0.12, b, z - 7], C.TIMBER, M.plank); }); }
    for (const p of PARA) { if (!showLv(cut, p[0])) continue; const [lv, a, b, c, d] = p, z = Z[lv]; inFrame(m, frameOf(p[5]), () => { m.box(a, b, z, c, d, z + 1.4, C.STONE2, M.stone); const L = Math.max(c - a, d - b), n = Math.floor(L / 1.3); for (let i = 0; i < n; i += 2) { const t = i / n, t2 = (i + 1) / n; c - a > d - b ? m.box(a + (c - a) * t, b, z + 1.4, a + (c - a) * t2, d, z + 2.3, C.STONE, M.stone) : m.box(a, b + (d - b) * t, z + 1.4, c, b + (d - b) * t2, z + 2.3, C.STONE, M.stone); } }); }
    for (const r of RAMPS) { if (r.out || r.spiral || !showLv(cut, r.a)) continue; const z0 = Z[r.a], z1 = Z[r.b], part = cut && cut.lv === r.a; m.stairs(r.lo, part ? r.lo + (r.hi - r.lo) * 0.4 : r.hi, r.v0, r.v1, z0, part ? z0 + (z1 - z0) * 0.4 : z1, 'u', '#8a7a6a', part ? 8 : 20, true); if (!part) stairRails(m, r, cut); }
    roofs(m, cut, o);
    interiors(m, cut, o);
    extras(m, cut, o);
    if (!F1) plants(m, cut, o);
    carveDoors(m);
    return m;
  }
  // 门洞一定是通的：完全落在门洞里（离地 0.45 以上、门楣以下）的东西都拿掉——
  // 墙上的木筋、横梁、垂下来的装饰偶尔会画到门洞里，人走不过去，看着也像门被堵死了
  /* 池塘：池岸是圆润、有点不规整的一圈，水从边上的浅色慢慢变到中间的深色；岸上一圈大小不一的石头和青苔，
     角上长芦苇和香蒲，水面漂着带缺口的睡莲叶和小花；西边一个伸进水里的小木栈台，站在上面能钓鱼 */
  /* 林中湖：岸是草地和圆石头，水清得能看见底；湖底是一座被遗弃的古城——石柱、拱门、塌了一半的房子、一座斜斜的小塔，长满水草。
     北边一道石阶从岸上一路伸进水里，往下走就到古城广场；东边水满了从缺口流出去，挂成瀑布落到船体外面 */
  function lakeScene(m, q, o) {
    const snow = o.snow, [a, b, c, d] = q.r, L = LAKE, N = 64, zb = L.bot, H2 = (x, y) => H(x * 3.1 + 7, y * 1.7 + 2);
    const P = (k, f, zz) => { const t = (k / N) * 6.2832, w = lakeR(t) * f; return [L.u + Math.cos(t) * L.rx * w, L.v + Math.sin(t) * L.ry * w, zz]; };
    const angOf = (u, v) => Math.atan2((v - L.v) / L.ry, (u - L.u) / L.rx);
    const STEP_A = -Math.PI / 2, OUT_A = 0.05, FISH_A = angOf(FISH.u, FISH.v), near = (t, a0, w) => Math.abs(Math.atan2(Math.sin(t - a0), Math.cos(t - a0))) < w;
    // 岸：湖外面那圈草地（一条条拼起来，不压到水上）
    const gt = snow ? '#eef4fa' : '#7e9e5a', gm = snow ? M.snow : M.grass;
    for (let v = b; v < d - 0.01; v += 0.5) { const v1 = Math.min(d, v + 0.5); let u0 = null; for (let u = a; u < c + 0.25; u += 0.5) { const out = u < c - 0.01 && !inLake(u + 0.25, v + 0.25, -0.2); if (out && u0 == null) u0 = u; if ((!out || u >= c - 0.01) && u0 != null) { m.box(u0, v, -1.2, Math.min(u, c), v1, 0, '#6a5a48', M.stone, gt, gm); u0 = null; } } }
    // 湖壁：上半截长着苔藓的土石，下面是古城的旧城墙（一块块大石砖）；越往下越收
    for (let k = 0; k < N; k++) { const A0 = P(k, 1.04, 0), A1 = P(k + 1, 1.04, 0), M0 = P(k, 0.99, -4), M1 = P(k + 1, 0.99, -4), B0 = P(k, 0.8, zb), B1 = P(k + 1, 0.8, zb);
      m.quad(A0, A1, M1, M0, snow ? '#dfe8ee' : (k % 2 ? '#5f7a4e' : '#6a8452'), M.grass); m.quad(M0, M1, B1, B0, ['#6e7a78', '#66726e', '#727e76'][k % 3], M.stone); }
    for (let k = 0; k < N; k++) m.tri([L.u, L.v, zb], P(k, 0.8, zb), P(k + 1, 0.8, zb), '#b6ac8c', M.stone); // 湖底的细沙
    // 水面（能点：对着水面点一下就抛竿）
    m.pk(PK.fish); for (let k = 0; k < N; k++) m.tri([L.u, L.v, L.z], P(k, 1.0, L.z), P(k + 1, 1.0, L.z), snow ? '#7fb8c8' : '#3f9aa8', M.lake); /* 冬天也不结冰（湖底有发光的石头，水是温的），照样能潜水 */ m.pk(0);
    // 岸边：一圈圆石头、芦苇、几片睡莲（石阶、出水口、钓鱼的位置空着）
    for (let k = 0; k < N; k += 2) { const t = (k / N) * 6.2832; if (near(t, STEP_A, 0.32) || near(t, OUT_A, 0.2) || near(t, FISH_A, 0.22)) continue; const [u, v] = P(k + H2(k, 1), 1.06, 0), r = 0.38 + H2(k, 2) * 0.45; m.blob(u, v, -0.25, r, r * 0.6, snow ? '#e8eef4' : ['#9a9488', '#8a857a', '#a8a090'][k % 3], M.stone, k);
      if (!snow && H2(k, 3) < 0.4) { const sw0 = m.sway; m.sway = 0.35; for (let j = 0; j < 5; j++) { const ru = u + (H2(k, j + 5) - 0.5) * 1.2, rv = v + (H2(j, k) - 0.5) * 1.2, h = 2 + H2(j, k + 9) * 1.6; m.cyl(ru, rv, -0.6, h - 0.6, 0.06, 0.03, '#6a8a3a', M.leaf, 4, false); m.cyl(ru, rv, h - 1.3, h - 0.5, 0.11, 0.08, '#7a5030', M.leaf, 5); } m.sway = sw0; } }
    if (!snow) { const sw0 = m.sway; m.sway = 0.3; for (let i = 0; i < 9; i++) { const t = i * 0.83 + 0.4; if (near(t, STEP_A, 0.4) || near(t, OUT_A, 0.3)) continue; const f = 0.62 + H2(i, 4) * 0.26, [u, v] = P((t / 6.2832) * N, f, 0); m.cyl(u, v, L.z + 0.02, L.z + 0.06, 0.55 + H2(i, 6) * 0.3, 0.55, '#4f8a44', M.leaf, 9, true); if (i % 3 === 0) { m.ball(u + 0.2, v, L.z + 0.2, 0.18, 0.14, '#f4b8c8', 0, 3, 6); m.ball(u + 0.2, v, L.z + 0.28, 0.07, 0.07, '#ffe9a8', 0, 3, 5); } } m.sway = sw0; }
    // 北边的石阶：从岸上一级级伸进水里，一直通到湖底古城的广场（潜水下去的路）
    { const [su, sv] = P((STEP_A / 6.2832) * N, 1.05, 0); for (let i = 0; i < 16; i++) { const v0 = sv + i * 0.62, zt = -0.6 - i * 1.15; if (zt < zb + 0.4) break; m.box(su - 1.6, v0, Math.max(zb, zt - 1.4), su + 1.6, v0 + 0.62, zt, i % 2 ? '#c2b8a4' : '#b4ab98', M.stone); if (i % 4 === 1) for (const x of [su - 1.75, su + 1.75]) m.box(x - 0.22, v0, zt, x + 0.22, v0 + 0.5, zt + (i < 3 ? 1.6 : 0.6 + H2(i, x) * 1.6), '#a8a090', M.stone); } }
    // ---- 湖底的古城 ----
    const ST = '#cfc6b4', ST2 = '#b8b0a0', MOSS = '#5f8a52', cu = L.u, cv = L.v;
    m.cyl(cu, cv, zb, zb + 0.4, 4.4, 4.4, ST2, M.stone, 20, true); // 广场
    for (let i = 0; i < 9; i++) { const a2 = i * 0.7 + 0.2, r = 1.2 + (i % 3) * 1.1, u = cu + Math.cos(a2) * r, v = cv + Math.sin(a2) * r; m.box(u - 0.6, v - 0.6, zb + 0.4, u + 0.6, v + 0.6, zb + 0.5 + H2(i, 1) * 0.25, i % 2 ? '#c8c0ae' : '#a8a090', M.stone); } // 翘起来的石板
    const HS = [7.5, 3.6, 10, 2.2, 8.6, 5, 2.8];
    HS.forEach((h, i) => { const a2 = (i / HS.length) * 6.2832 + 0.3, u = cu + Math.cos(a2) * 4.7, v = cv + Math.sin(a2) * 4.7; m.box(u - 0.7, v - 0.7, zb + 0.4, u + 0.7, v + 0.7, zb + 1.1, ST2, M.stone); m.cyl(u, v, zb + 1.1, zb + 1.1 + h, 0.46, 0.42, ST, M.stone, 10);
      if (h > 6) { m.box(u - 0.66, v - 0.66, zb + 1.1 + h, u + 0.66, v + 0.66, zb + 1.6 + h, ST2, M.stone); m.box(u - 0.5, v - 0.5, zb + 1.6 + h, u + 0.5, v + 0.5, zb + 1.75 + h, MOSS, M.grass); } else m.blob(u, v, zb + 1.1 + h, 0.42, 0.25, MOSS, M.grass, i); });
    { const a2 = 2.7, u0 = cu + Math.cos(a2) * 2.6, v0 = cv + Math.sin(a2) * 2.6; for (let k = 0; k < 6; k++) m.box(u0 + k * 0.62 - 0.32, v0 - 0.38 + k * 0.1, zb + 0.4, u0 + k * 0.62 + 0.32, v0 + 0.38 + k * 0.1, zb + 1.1, k % 2 ? ST : '#c4bcaa', M.stone); } // 倒下的一根柱子
    // 拱门：两根方柱 + 一圈拱券
    { const u = cu + 0.4, v = cv + 5.6; for (const x of [-1.9, 1.9]) m.box(u + x - 0.5, v - 0.5, zb, u + x + 0.5, v + 0.5, zb + 6.4, ST, M.stone); for (let k = 0; k <= 8; k++) { const t = (k / 8) * Math.PI, x = -Math.cos(t) * 1.9, zz = zb + 6.4 + Math.sin(t) * 1.6; m.box(u + x - 0.42, v - 0.5, zz - 0.3, u + x + 0.42, v + 0.5, zz + 0.45, k % 2 ? ST : ST2, M.stone); } m.box(u - 0.6, v - 0.55, zb + 7.9, u + 0.6, v + 0.55, zb + 8.4, MOSS, M.grass); }
    // 塌了一半的房子：两面墙，墙上有窗洞
    { const u = cu - 4.4, v = cv + 1.4, W = '#d6ccb6';
      m.box(u - 0.3, v - 2.2, zb, u + 0.3, v - 0.6, zb + 6.2, W, M.stone); m.box(u - 0.3, v + 0.6, zb, u + 0.3, v + 2.2, zb + 4.4, W, M.stone); m.box(u - 0.3, v - 0.6, zb, u + 0.3, v + 0.6, zb + 1.6, W, M.stone); m.box(u - 0.3, v - 0.6, zb + 3.6, u + 0.3, v + 0.6, zb + 4.4, W, M.stone);
      m.box(u - 0.3, v - 2.2, zb, u + 2.8, v - 1.6, zb + 5.0, W, M.stone); m.box(u + 0.9, v - 2.25, zb + 1.6, u + 1.9, v - 1.55, zb + 3.4, '#3a4a50', 0);
      m.box(u - 0.4, v - 2.3, zb + 6.2, u + 0.4, v - 1.0, zb + 6.5, MOSS, M.grass); }
    // 一座小塔：圆的，顶上塌了一圈，里面还亮着一块会发光的蓝石头
    { const u = cu + 3.4, v = cv - 3.0, top = zb + 12.6; m.cyl(u, v, zb, top, 1.9, 1.7, '#c4baa6', M.stone, 14, false);
      for (let k = 0; k < 10; k++) { const t = (k / 10) * 6.2832, hh = 0.4 + H2(k, 7) * 1.6; m.box(u + Math.cos(t) * 1.55 - 0.3, v + Math.sin(t) * 1.55 - 0.3, top, u + Math.cos(t) * 1.55 + 0.3, v + Math.sin(t) * 1.55 + 0.3, top + hh, k % 3 ? '#c4baa6' : MOSS, k % 3 ? M.stone : M.grass); }
      for (const [t, zz] of [[0.4, 3], [2.4, 6.4], [4.2, 9.4]]) m.box(u + Math.cos(t) * 1.75 - 0.35, v + Math.sin(t) * 1.75 - 0.35, zb + zz, u + Math.cos(t) * 1.75 + 0.35, v + Math.sin(t) * 1.75 + 0.35, zb + zz + 1.4, '#2e3a40', 0);
      m.cyl(u, v, top - 1.2, top + 0.9, 0.45, 0.05, '#9fe8ff', M.glow, 6); }
    // 半埋在沙里的石像的头
    { const u = cu - 1.6, v = cv - 4.6; m.ball(u, v, zb + 0.9, 1.15, 1.0, '#d0c6b0', M.stone, 6, 10); for (const x of [-0.4, 0.4]) m.box(u + x - 0.12, v + 0.95, zb + 1.2, u + x + 0.12, v + 1.1, zb + 1.4, '#5a5048', 0); m.blob(u, v, zb + 1.8, 0.6, 0.3, MOSS, M.grass, 3); }
    // 水草：一丛丛从湖底往上长，轻轻摆
    if (!snow) { const sw0 = m.sway; m.sway = 0.5; for (let i = 0; i < 22; i++) { const t = i * 0.97 + 0.5, f = 0.35 + H2(i, 11) * 0.42, [u, v] = P((t / 6.2832) * N, f, 0), h = 4 + H2(i, 12) * 7; if (Math.hypot(u - (cu + 3.4), v - (cv - 3.0)) < 2.6 || Math.hypot(u - (cu - 4.4), v - (cv + 1.4)) < 2.2 || Math.hypot(u - (cu + 0.4), v - (cv + 5.6)) < 2.4) continue;
      for (let j = 0; j < 3; j++) { const x = u + (H2(i, j) - 0.5) * 0.8, y = v + (H2(j, i) - 0.5) * 0.8; let px = x, py = y, pz = zb + 0.3; for (let k = 0; k < 6; k++) { const nx = x + Math.sin(k * 0.9 + i) * 0.35, ny = y + Math.cos(k * 0.7 + j) * 0.3, nz = zb + 0.3 + h * (k + 1) / 6; m.quad([px - 0.13, py, pz], [px + 0.13, py, pz], [nx + 0.1, ny, nz], [nx - 0.1, ny, nz], k % 2 ? '#3f7a4a' : '#4a8a52', M.leaf); px = nx; py = ny; pz = nz; } } } m.sway = sw0; }
    // 出水口：东边岸上开一道缺口，水顺着石槽流到甲板边上，挂成瀑布落下去
    { const [u0, v0] = P((OUT_A / 6.2832) * N, 0.96, 0); let u1 = u0; while (u1 < 60 && inPoly(u1, v0, 0)) u1 += 0.25; u1 = Math.max(u1, c);
      m.box(u0, v0 - 1.0, -1.6, u1 + 0.2, v0 + 1.0, -1.0, '#8a8478', M.stone); m.box(u0, v0 - 0.75, -1.05, u1 + 0.3, v0 + 0.75, L.z - 0.1, snow ? '#cfe2f0' : '#4aa8d8', snow ? M.snow : M.water);
      for (const y of [v0 - 1.05, v0 + 0.75]) m.box(u0, y, -1.6, u1 + 0.2, y + 0.3, -0.2, '#9a9488', M.stone);
      if (!snow) { m.box(u1 + 0.2, v0 - 0.75, -30, u1 + 0.6, v0 + 0.75, L.z - 0.1, '#7ac8e8', M.water); for (let k = 0; k < 9; k++) m.ball(u1 + 0.4 + (H2(k, 1) - 0.5) * 1.6, v0 + (H2(k, 2) - 0.5) * 2.6, -30 + H2(k, 3) * 2, 0.6 + H2(k, 4) * 0.6, 0.4, '#f4f8fc', 0, 3, 6); } }
  }
  function pond(m, P, zz, Q, WC, WM, snow) {
    const cu = (P.u0 + P.u1) / 2, cv = (P.v0 + P.v1) / 2, hu = (P.u1 - P.u0) / 2 - 0.35, hv = (P.v1 - P.v0) / 2 - 0.35, N = 44, DOCK = [P.v0 + 1.0, P.v0 + 3.0], wu = cu;
    const keep = (u, v) => !(u < cu && v > DOCK[0] - 0.6 && v < DOCK[1] + 0.6) && !(v > cv && Math.abs(u - wu) < 1.1); // 栈台和出水口那儿不摆石头
    const edge = (k, f = 1) => { const a = (k / N) * 6.2832, c = Math.cos(a), s2 = Math.sin(a), w = 1 + 0.05 * Math.sin(3 * a + 1.3) + 0.035 * Math.sin(5 * a + 0.4);
      return [cu + hu * f * w * Math.sign(c) * Math.pow(Math.abs(c), 0.55), cv + hv * f * w * Math.sign(s2) * Math.pow(Math.abs(s2), 0.55)]; };
    const mix = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), ch = (x, sh) => (x >> sh) & 255, r = (sh) => Math.round(ch(A, sh) + (ch(B, sh) - ch(A, sh)) * t); return '#' + ((1 << 24) | (r(16) << 16) | (r(8) << 8) | r(0)).toString(16).slice(1); };
    // 池底（从岸边往下斜进去，看水边时不会看到直上直下的槽）
    m.box(P.u0, P.v0, zz - 0.4, P.u1, P.v1, Q - 1.3, '#23414c', M.stone);
    for (let k = 0; k < N; k++) { const a0 = edge(k), a1 = edge(k + 1), b0 = edge(k, 0.82), b1 = edge(k + 1, 0.82); m.quad([a0[0], a0[1], Q - 0.05], [a1[0], a1[1], Q - 0.05], [b1[0], b1[1], Q - 1.25], [b0[0], b0[1], Q - 1.25], '#5a6a50', M.stone); }
    // 水面：四圈，边上浅（透出沙底的黄绿）中间深
    const deep = snow ? '#b8d4e8' : '#2f7f9e', shallow = snow ? '#dceaf4' : '#6cc0c8', F4 = [0, 0.38, 0.66, 0.86, 1];
    m.pk(PK.fish);
    for (let r = 0; r + 1 < F4.length; r++) { const col = mix(deep, shallow, (r + 0.5) / (F4.length - 1));
      for (let k = 0; k < N; k++) { const p0 = edge(k, F4[r]), p1 = edge(k + 1, F4[r]), q0 = edge(k, F4[r + 1]), q1 = edge(k + 1, F4[r + 1]);
        if (r === 0) m.tri([cu, cv, Q], [q0[0], q0[1], Q], [q1[0], q1[1], Q], col, WM); else m.quad([p0[0], p0[1], Q], [q0[0], q0[1], Q], [q1[0], q1[1], Q], [p1[0], p1[1], Q], col, WM); } }
    m.pk(0);
    // 岸：水边到外框之间铺一圈草地（比水面高一点），外沿是一圈叠起来的圆石
    const bankZ = Q + 0.3, grass = snow ? '#eef4fa' : '#6a9a4e', R0 = [P.u0 - 0.7, P.v0 - 0.7, P.u1 + 0.7, P.v1 + 0.7];
    const onRect = (k) => { const a = (k / N) * 6.2832, c = Math.cos(a), s2 = Math.sin(a), tu = c ? ((c > 0 ? R0[2] : R0[0]) - cu) / c : 1e9, tv = s2 ? ((s2 > 0 ? R0[3] : R0[1]) - cv) / s2 : 1e9, t = Math.min(Math.abs(tu), Math.abs(tv)); return [cu + c * t, cv + s2 * t]; };
    for (let k = 0; k < N; k++) { const a0 = edge(k), a1 = edge(k + 1), o0 = onRect(k), o1 = onRect(k + 1); m.quad([a0[0], a0[1], bankZ], [o0[0], o0[1], bankZ], [o1[0], o1[1], bankZ], [a1[0], a1[1], bankZ], k % 3 ? grass : shade(grass, 0.92), snow ? M.snow : 0);
      m.quad([a0[0], a0[1], Q - 0.05], [a0[0], a0[1], bankZ], [a1[0], a1[1], bankZ], [a1[0], a1[1], Q - 0.05], '#6a5a44', M.stone); }
    for (const [e0, e1, e2, e3] of [[R0[0], R0[1], R0[2], P.v0 - 0.45], [R0[0], P.v1 + 0.45, R0[2], R0[3]], [R0[0], R0[1], P.u0 - 0.45, R0[3]], [P.u1 + 0.45, R0[1], R0[2], R0[3]]]) m.box(e0, e1, zz, e2, e3, bankZ - 0.02, '#8a8070', M.stone);
    const SC = ['#9a948a', '#a8a298', '#8e887e', '#b0a898', '#857e74'];
    { let k = 0; const per = 2 * (R0[2] - R0[0] + R0[3] - R0[1]); for (let d = 0; d < per; d += 0.9, k++) { let u, v; const W = R0[2] - R0[0], Hh = R0[3] - R0[1];
        if (d < W) { u = R0[0] + d; v = R0[1]; } else if (d < W + Hh) { u = R0[2]; v = R0[1] + d - W; } else if (d < 2 * W + Hh) { u = R0[2] - (d - W - Hh); v = R0[3]; } else { u = R0[0]; v = R0[3] - (d - 2 * W - Hh); }
        const r = 0.42 + H(k, 61) * 0.2; if (keep(u, v)) m.ball(u, v, zz + 0.55 + H(k, 62) * 0.3, r, r * 0.8, SC[k % 5], M.stone, 4, 7, 0.12, k); } }
    // 水边一圈半泡在水里的石头，有的顶上长着青苔
    for (let k = 0; k < N; k += 2) { const e = edge(k + H(k, 71) * 0.8, 1.02), r = 0.3 + H(k, 72) * 0.25; if (!keep(e[0], e[1])) continue; m.ball(e[0], e[1], Q + 0.12, r, r * 0.7, SC[(k / 2) % 5], M.stone, 4, 7, 0.15, k + 3); if (!snow && H(k, 73) < 0.45) m.ball(e[0], e[1], Q + 0.12 + r * 0.45, r * 0.75, r * 0.3, '#6f9a4a', 0, 3, 7, 0.2, k, true); }
    if (snow) return;
    // 芦苇、香蒲：一丛一丛长在三个角上
    for (const [k0, n] of [[4, 7], [17, 6], [31, 8]]) for (let i = 0; i < n; i++) { const e = edge(k0 + i * 0.45, 0.93 + H(i, k0) * 0.12), hh = 2.2 + H(i, k0 + 1) * 1.6, lu = e[0] + (H(i, 5) - 0.5) * 0.3, lv = e[1] + (H(i, 6) - 0.5) * 0.3;
      m.tuft(lu, lv, Q, hh, 3, '#5f8f42', i + k0); if (i % 2 === 0) { m.box(lu - 0.03, lv - 0.03, Q, lu + 0.03, lv + 0.03, Q + hh + 0.3, '#6a8a40', 0); m.box(lu - 0.09, lv - 0.09, Q + hh - 0.25, lu + 0.09, lv + 0.09, Q + hh + 0.3, '#6a4228', 0); } }
    // 睡莲：叶子是带一个缺口的圆片，有几片上开着花
    for (let i = 0; i < 9; i++) { const a = H(i, 81) * 6.2832, f = 0.25 + H(i, 82) * 0.5, lu = cu + Math.cos(a) * hu * f, lv = cv + Math.sin(a) * hv * f, r = 0.45 + H(i, 83) * 0.35, gap = H(i, 84) * 6.2832, col = i % 3 ? '#4f9a48' : '#5fae52';
      if (Math.hypot(lu - (P.u0 + 2.2), lv - (DOCK[0] + DOCK[1]) / 2) < 1.8) continue; // 栈台前面留出来
      for (let j = 0; j < 9; j++) { const b0 = gap + 0.35 + (j / 9) * (6.2832 - 0.7), b1 = gap + 0.35 + ((j + 1) / 9) * (6.2832 - 0.7); m.tri([lu, lv, Q + 0.04], [lu + Math.cos(b0) * r, lv + Math.sin(b0) * r, Q + 0.04], [lu + Math.cos(b1) * r, lv + Math.sin(b1) * r, Q + 0.04], col, 0); }
      if (i % 3 === 1) { const fc = i % 2 ? '#f6f0f4' : '#f4a8c4'; for (let j = 0; j < 6; j++) { const b = j * 1.047 + i; m.ball(lu + Math.cos(b) * 0.16, lv + Math.sin(b) * 0.16, Q + 0.22, 0.13, 0.18, fc, 0, 3, 5); } m.ball(lu, lv, Q + 0.3, 0.09, 0.09, '#ffd95a', 0, 3, 5); } }
    // 小木栈台：从岸上伸进水里，两根木桩撑着，头上挂一盏小灯
    const du0 = P.u0 - 0.9, du1 = P.u0 + 2.4, dv0 = DOCK[0], dv1 = DOCK[1], dz = Q + 0.55;
    for (let k = 0; k < 6; k++) { const v0 = dv0 + k * (dv1 - dv0) / 6; m.box(du0, v0 + 0.02, dz - 0.2, du1, v0 + (dv1 - dv0) / 6 - 0.02, dz, ['#a8784a', '#9a6a40', '#b08250'][k % 3], M.plank); }
    for (const [u, v] of [[du1 - 0.2, dv0 + 0.2], [du1 - 0.2, dv1 - 0.2], [P.u0 + 0.6, dv0 + 0.2], [P.u0 + 0.6, dv1 - 0.2]]) m.box(u - 0.14, v - 0.14, Q - 1.2, u + 0.14, v + 0.14, dz - 0.2, '#6a4a2e', M.plank);
    m.box(du0 - 0.7, dv0 + 0.2, zz, du0, dv1 - 0.2, zz + 0.8, '#9a8e7e', M.stone); // 上栈台的一级石阶
    m.cyl(du1 - 0.2, dv1 - 0.2, dz, dz + 2.6, 0.08, 0.08, '#3a3448', M.metal, 5); m.box(du1 - 0.2, dv1 - 0.24, dz + 2.5, du1 + 0.4, dv1 - 0.16, dz + 2.6, '#3a3448', M.metal); m.cyl(du1 + 0.4, dv1 - 0.2, dz + 1.9, dz + 2.5, 0.2, 0.16, '#ffe9a8', M.glow, 6);
  }
  // 塔楼楼梯两边的扶手（顺着台阶斜上去），楼上楼梯井三面围一圈栏杆（到达那头敞开）
  function stairRails(m, r, cut) {
    const z0 = Z[r.a], z1 = Z[r.b], col = '#3a3448', wood = '#8a5a3a', zAt = (u) => z0 + (z1 - z0) * Math.min(1, Math.max(0, (u - r.lo) / (r.hi - r.lo)));
    for (const vv of [r.v0 + 0.12, r.v1 - 0.12]) {
      for (let i = 0; i <= 8; i++) { const u = r.lo + 0.15 + (r.hi - r.lo - 0.3) * i / 8, zt = zAt(u + 0.2); m.box(u - 0.07, vv - 0.07, zt, u + 0.07, vv + 0.07, zt + 3.3, col, M.metal); }
      const a = r.lo + 0.15, b = r.hi - 0.15, za = zAt(a + 0.2) + 3.3, zb = zAt(b + 0.2) + 3.3, w = 0.11, h = 0.22;
      m.quad([a, vv - w, za + h], [b, vv - w, zb + h], [b, vv + w, zb + h], [a, vv + w, za + h], wood, M.plank);
      m.quad([a, vv - w, za], [a, vv + w, za], [b, vv + w, zb], [b, vv - w, zb], wood, M.plank);
      m.quad([a, vv - w, za], [b, vv - w, zb], [b, vv - w, zb + h], [a, vv - w, za + h], wood, M.plank);
      m.quad([a, vv + w, za], [a, vv + w, za + h], [b, vv + w, zb + h], [b, vv + w, zb], wood, M.plank);
    }
    if (cut && cut.lv < r.b) return;
    const top = !RAMPS.some((q) => !q.out && q.a === r.b);
    for (const vv of [r.v0 - 0.28, r.v1 + 0.28]) m.rail(r.lo + 0.4, vv, r.hi, vv, z1, 3.2, col);
    if (top) m.rail(r.lo, r.v0 - 0.28, r.lo, r.v1 + 0.28, z1, 3.2, col);
  }
  function carveDoors(m) {
    const B = PASS.map((p) => { const bb = wBox(p.F, p.r); return { p, bb, z0: Z[p.lv] + 0.45, z1: Z[p.lv] + DOOR_H - 0.05 }; });
    const P = m.p, N = P.length / 9, kill = new Uint8Array(N); let k = 0;
    const inside = (b, x, y, z) => { if (z <= b.z0 || z >= b.z1 || x < b.bb[0] || x > b.bb[2] || y < b.bb[1] || y > b.bb[3]) return false; const [u, v] = toL(b.p.F, x, y), r = b.p.r; return u > r[0] + 0.05 && u < r[2] - 0.05 && v > r[1] + 0.05 && v < r[3] - 0.05; };
    // 横穿门洞的小块装饰（爬藤、树叶、角石、墙上的石块……）：中心落在门洞空间里（往里缩 0.2）就删；走廊（两边有墙的）只删树叶爬藤
    const inner = (b, x, y, z) => { if (z <= b.z0 || z >= b.z1 - 0.3 || x < b.bb[0] || x > b.bb[2] || y < b.bb[1] || y > b.bb[3]) return false; const [u, v] = toL(b.p.F, x, y), r = b.p.r; return u > r[0] + 0.2 && u < r[2] - 0.2 && v > r[1] + 0.2 && v < r[3] - 0.2; };
    const W = m.w;
    for (let t = 0; t < N; t++) { const i = t * 9; const inAny = (x, y, z) => B.some((b) => inside(b, x, y, z)); // 一扇门可能由两段拼成（两边房间转法不同）：三个角各落在哪一段都算
      if (inAny(P[i], P[i + 1], P[i + 2]) && inAny(P[i + 3], P[i + 4], P[i + 5]) && inAny(P[i + 6], P[i + 7], P[i + 8])) { kill[t] = 1; k++; continue; }
      const cx = (P[i] + P[i + 3] + P[i + 6]) / 3, cy = (P[i + 1] + P[i + 4] + P[i + 7]) / 3, cz = (P[i + 2] + P[i + 5] + P[i + 8]) / 3;
      const leaf = W && (W[t * 3] > 0 || W[t * 3 + 1] > 0 || W[t * 3 + 2] > 0), e = Math.max(Math.hypot(P[i + 3] - P[i], P[i + 4] - P[i + 1], P[i + 5] - P[i + 2]), Math.hypot(P[i + 6] - P[i], P[i + 7] - P[i + 1], P[i + 8] - P[i + 2]), Math.hypot(P[i + 6] - P[i + 3], P[i + 7] - P[i + 4], P[i + 8] - P[i + 5]));
      if (B.some((b) => inner(b, cx, cy, cz) && (leaf || (!b.p.walls && e < 3)))) { kill[t] = 1; k++; } }
    if (!k) return;
    const keep = (arr, per) => { const out = []; for (let t = 0; t < N; t++) if (!kill[t]) for (let q = t * 3 * per; q < (t + 1) * 3 * per; q++) out.push(arr[q]); return out; };
    m.p = keep(m.p, 3); m.n = keep(m.n, 3); m.c = keep(m.c, 3); m.m = keep(m.m, 1); m.w = keep(m.w, 1);
  }
  // ---------- 屋里的灯：每间房一盏（范围就是这间房），门边墙上一个开关 ----------
  const SW_PK = 220; // 开关的点选编号：220 + 房间序号
  const lampLo = (r) => { const z = Z[r.lv], top = z + roomH(r); return Math.max(z + 8.6, top - 2.2); };
  const hasPendant = (r) => !r.glass && !r.c && LAMP_ROOMS[r.id] && roomH(r) >= 10.5;
  let LBOX = null;
  function lightBoxes() {
    if (LBOX) return LBOX;
    LBOX = ROOMS.map((r, i) => { const z0 = Z[r.lv], z1 = z0 + roomH(r);
      if (r.c) return { i, id: r.id, nm: r.nm, a: [r.c[0], r.c[1], 1, 0], b: [-r.c[2], 0, z0, z1] };
      const fr = r.rot ? r : null, [u0, v0, u1, v1] = r.r, c = toW(fr, (u0 + u1) / 2, (v0 + v1) / 2), th = r.rot || 0;
      return { i, id: r.id, nm: r.nm, a: [c[0], c[1], Math.cos(th), Math.sin(th)], b: [(u1 - u0) / 2, (v1 - v0) / 2, z0, z1] }; });
    return LBOX;
  }
  // 开关装在这间房第一个门的旁边（墙的里面那一面，离地 4 格，伸手就够得着）
  let SWS = null;
  function switches() {
    if (SWS) return SWS;
    SWS = ROOMS.map((r, i) => { const z = Z[r.lv];
      if (r.c) { const [cu, cv, rad] = r.c, n = RSEG(r); for (let k = 0; k < n; k++) if (ringGap(r, k) && !ringGap(r, (k + n - 1) % n)) { const a = (k / n) * 6.2832 - 0.17, rr = rad - WT / 2 - 0.1; return { i, fr: null, u: cu + Math.cos(a) * rr, v: cv + Math.sin(a) * rr, z, round: true }; } return null; }
      const fr = r.rot ? r : null, [u0, v0, u1, v1] = r.r;
      for (const [ax, at, a0, a1, nu, nv] of [['v', v0, u0, u1, 0, -1], ['v', v1, u0, u1, 0, 1], ['u', u0, v0, v1, -1, 0], ['u', u1, v0, v1, 1, 0]]) {
        const sg = ax === 'v' ? nv : nu, doors = sideHoles(r.lv, ax, at, a0, a1, fr); if (!doors.length) continue; const hh = doors[0];
        const gap = r.hut ? 0.62 : 0.75, edge = r.hut ? 0.15 : 0.7; let sAt = hh[1] + gap; if (sAt > a1 - edge) sAt = hh[0] - gap; if (sAt < a0 + edge) continue; // 小隔间窄：开关贴着门框
        return { i, fr, ax, at: at - sg * (WT / 2), sg, s: sAt, z }; }
      return null; });
    return SWS;
  }
  function drawLights(m, o) {
    const L = o.lights || [], cut = o.cut; switches().forEach((w, i) => { const r = ROOMS[i]; if (!w || !showLv(cut, r.lv)) return; const on = (L[i] || 0) > 0.5;
      inFrame(m, w.fr, () => { m.pk(SW_PK + i);
        if (w.round) { m.box(w.u - 0.2, w.v - 0.2, w.z + 4.0, w.u + 0.2, w.v + 0.2, w.z + 4.6, '#f4efe4', 0); m.box(w.u - 0.07, w.v - 0.07, on ? w.z + 4.32 : w.z + 4.12, w.u + 0.07, w.v + 0.07, on ? w.z + 4.48 : w.z + 4.28, on ? '#e8b040' : '#8a8070', 0); }
        else { const f = w.at, d1 = f - w.sg * 0.07, d2 = f - w.sg * 0.14, B = (a, b, z0, z1, p, q, col) => (w.ax === 'v' ? m.box(a, Math.min(p, q), z0, b, Math.max(p, q), z1, col, 0) : m.box(Math.min(p, q), a, z0, Math.max(p, q), b, z1, col, 0));
          B(w.s - 0.22, w.s + 0.22, w.z + 4.0, w.z + 4.6, f, d1, '#f4efe4'); B(w.s - 0.06, w.s + 0.06, on ? w.z + 4.32 : w.z + 4.12, on ? w.z + 4.48 : w.z + 4.28, d1, d2, on ? '#e8b040' : '#8a8070'); }
        m.pk(0); });
      // 灯泡 / 蜡烛火苗：开着才发光
      if (cut && cut.lv < r.lv) return; const k = L[i] || 0;
      if (hasPendant(r)) inFrame(m, r.rot ? r : null, () => { const [u0, v0, u1, v1] = r.r; m.ball((u0 + u1) / 2, (v0 + v1) / 2, lampLo(r) + 0.2, 0.26, 0.32, k > 0.5 ? '#fff3c4' : '#d8d2c0', k > 0.5 ? M.glow : 0, 4, 8); });
      if (r.id === 'hall') { const Zh = Z[r.lv]; for (let q = 0; q < 8; q++) { const a = q * 0.7854 + 0.2, x = 12 + Math.cos(a) * 1.7, y = 12 + Math.sin(a) * 1.7; if (k > 0.5) m.ball(x, y, Zh + 11.22 + Math.sin(o.t * 7 + q) * 0.02, 0.07, 0.13, '#ffd88a', M.glow, 3, 5); else m.box(x - 0.02, y - 0.02, Zh + 11.1, x + 0.02, y + 0.02, Zh + 11.2, '#3a3448', 0); } } });
  }
  function dyn(o) {
    const m = new Mesh(), t = o.t, cut = o.cut;
    if (showLv(cut, 1)) { const Zo = Z[1]; for (let i = 0; i < 4; i++) { const h = 0.9 + Math.sin(t * 9 + i * 2.1) * 0.4 + (o.fire || 0.6) * 0.8, [fu, fv] = lp('store', 3.2, -2.9 + i * 0.4); m.cyl(fu, fv, Zo + 0.6, Zo + 0.6 + h, 0.22, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); } } // 地窖石炉里的火
    if (showLv(cut, 1)) { const Zk = Z[1]; if (o.cooking) for (let i = 0; i < 6; i++) { const h = 1.4 + Math.sin(t * 9 + i * 2.1) * 0.5, [ku, kv] = lp('kitchen', 3.5, -2.4 + i * 0.3); m.cyl(ku, kv, Zk + 3.0, Zk + 3.0 + h, 0.26, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); }
    }
    if (o.incense && showLv(cut, 1) && CITY) { const { u, v } = SHRINE, z0 = CITY.GT + 2.05; /* 香炉里三炷香在烧：亮着的香头，一缕缕青烟往上飘、慢慢散开 */
      for (let k = 0; k < 3; k++) { const x = u + 1.3 + (k - 1) * 0.16; m.box(x - 0.025, v - 0.025, z0, x + 0.025, v + 0.025, z0 + 1.1, '#a8523a', M.plank); m.box(x - 0.045, v - 0.045, z0 + 1.1, x + 0.045, v + 0.045, z0 + 1.2, '#ff7a30', M.glow);
        for (let j = 0; j < 6; j++) { const ph = (t * 0.25 + j / 6 + k * 0.33) % 1, zz = z0 + 1.25 + ph * 3.2, dx = Math.sin(t * 0.9 + j + k) * 0.3 * ph, sz = 0.06 + ph * 0.22; m.box(x + dx - sz, v - sz * 0.5, zz, x + dx + sz, v + sz * 0.5, zz + 0.12, ph < 0.5 ? '#d8d8dc' : '#e8e8ec', M.flat); } } }
    if (showLv(cut, 1)) for (const r of RELICS) { if (o.relics && o.relics[r.id]) continue; /* 古城遗物：一个小石台，上面浮着一件发光的东西，慢慢转、慢慢上下飘 */
      m.pk(PK.relic + r.i); m.box(r.u - 0.7, r.v - 0.7, r.z - 0.4, r.u + 0.7, r.v + 0.7, r.z + 0.4, '#8a9a98', M.stone); m.box(r.u - 0.55, r.v - 0.55, r.z + 0.4, r.u + 0.55, r.v + 0.55, r.z + 0.6, '#c8a860', M.metal);
      const zz = r.z + 1.6 + Math.sin(t * 1.3 + r.i) * 0.25, a = t * 0.6 + r.i, c = Math.cos(a) * 0.45, s2 = Math.sin(a) * 0.45;
      m.tri([r.u + c, r.v + s2, zz], [r.u - s2, r.v + c, zz], [r.u, r.v, zz + 0.75], r.col, M.glow); m.tri([r.u - s2, r.v + c, zz], [r.u - c, r.v - s2, zz], [r.u, r.v, zz + 0.75], r.col, M.glow); m.tri([r.u - c, r.v - s2, zz], [r.u + s2, r.v - c, zz], [r.u, r.v, zz + 0.75], r.col, M.glow); m.tri([r.u + s2, r.v - c, zz], [r.u + c, r.v + s2, zz], [r.u, r.v, zz + 0.75], r.col, M.glow);
      m.tri([r.u - s2, r.v + c, zz], [r.u + c, r.v + s2, zz], [r.u, r.v, zz - 0.75], r.col, M.glow); m.tri([r.u - c, r.v - s2, zz], [r.u - s2, r.v + c, zz], [r.u, r.v, zz - 0.75], r.col, M.glow); m.tri([r.u + s2, r.v - c, zz], [r.u - c, r.v - s2, zz], [r.u, r.v, zz - 0.75], r.col, M.glow); m.tri([r.u + c, r.v + s2, zz], [r.u + s2, r.v - c, zz], [r.u, r.v, zz - 0.75], r.col, M.glow);
      m.pk(0); }
    if (showLv(cut, 1)) for (let i = 0; i < 7; i++) { /* 湖里的锦鲤：在古城的柱子之间转圈，有深有浅 */
      const L = LAKE, a = t * (0.22 + i * 0.05) * (i % 2 ? 1 : -1) + i * 1.9, r = 13 + (i % 4) * 2.6, cu = L.u + Math.cos(a) * r, cv = L.v + Math.sin(a) * r, z = L.z - 0.6 - [0.2, 3, 6.5, 1.2, 10, 4.5, 13][i] + Math.sin(t * 0.7 + i) * 0.4;
      const du = -Math.sin(a) * (i % 2 ? 1 : -1), dv = Math.cos(a) * (i % 2 ? 1 : -1), l = Math.hypot(du, dv) || 1, ux = du / l, vx = dv / l, col = ['#f07a3a', '#f4f0e6', '#e8b040', '#d8484a', '#f4f0e6', '#f07a3a', '#e8b040'][i], spot = ['#f4f0e6', '#e84a3a', '#f4f0e6', '#2a2030', '#e84a3a', '#2a2030', '#f4f0e6'][i];
      m.ball(cu, cv, z, 0.42, 0.16, col, 0, 3, 8); m.ball(cu + ux * 0.36, cv + vx * 0.36, z + 0.06, 0.18, 0.09, spot, 0, 3, 6);
      const sw = Math.sin(t * 6 + i * 2) * 0.35, tx = cu - ux * 0.5, ty = cv - vx * 0.5; m.tri([tx, ty, z], [tx - ux * 0.42 - vx * (0.3 + sw * 0.25), ty - vx * 0.42 + ux * (0.3 + sw * 0.25), z + 0.02], [tx - ux * 0.42 + vx * (0.3 - sw * 0.25), ty - vx * 0.42 - ux * (0.3 - sw * 0.25), z + 0.02], col, 0); }
    drawLights(m, o);
    // 壁炉里的火（一直在跳）；炉台正中一座座钟，指着现在的时间
    for (const id in HEARTH) { const r = RM[id], hr = HEARTH[id]; if (!showLv(cut, r.lv) || (cut && cut.lv > r.lv && false)) continue; inFrame(m, r.rot ? r : null, () => { const zz = Z[r.lv], [fu, fv] = hr.fire, along = hr.sp.ax === 'v';
      for (let i = 0; i < 6; i++) { const off = (i - 2.5) * 0.42, hh = 1.0 + Math.sin(t * 8 + i * 1.7) * 0.35 + Math.sin(t * 13 + i) * 0.2, [x, y] = along ? [fu + off, fv] : [fu, fv + off]; m.cyl(x, y, zz + 0.6, zz + 0.6 + hh, 0.32, 0.02, i % 2 ? '#ffb040' : '#ff7a30', M.glow, 5); }
      for (let i = 0; i < 3; i++) { const off = (i - 1) * 0.5, [x, y] = along ? [fu + off, fv] : [fu, fv + off]; m.box(x - 0.45, y - 0.12, zz + 0.35, x + 0.45, y + 0.12, zz + 0.6, '#5a3a24', 0); m.box(x - 0.3, y - 0.08, zz + 0.38, x + 0.3, y + 0.08, zz + 0.55, '#ff8a3a', M.glow); }
      if (id === Object.keys(HEARTH)[0]) { /* 炉台上的座钟：指针就是现在的真实时间（睡前看一眼几点了） */ const sp = hr.sp, P = (a, b) => (along ? [a, b] : [b, a]), f0 = sp.f - sp.sg * (hr.d * 0.7 + 0.45), cz = zz + 5.15, d0 = new Date(), hh = (d0.getHours() % 12 + d0.getMinutes() / 60) / 12 * 6.283, mm = d0.getMinutes() / 60 * 6.283;
        const bx = (a0, a1, w0, w1, z0, z1, col, mat) => { const [x0, y0] = P(hr.c + a0, f0 + w0), [x1, y1] = P(hr.c + a1, f0 + w1); m.box(Math.min(x0, x1), Math.min(y0, y1), z0, Math.max(x0, x1), Math.max(y0, y1), z1, col, mat); };
        bx(-0.7, 0.7, -0.35, 0.35, cz, cz + 1.7, '#6a3e26', M.plank); bx(-0.55, 0.55, -0.4 * sp.sg, -0.36 * sp.sg, cz + 0.45, cz + 1.55, '#f4ead0', 0);
        const hand = (a, len, w, col) => { const ca = Math.cos(a), sa = Math.sin(a), fz = f0 - 0.42 * sp.sg; for (let q = 0; q < 6; q++) { const t2 = q / 6 * len, cc = hr.c + Math.sin(a) * t2 * (sp.sg > 0 ? -1 : 1), zc = cz + 1.0 + ca * t2, [x, y] = P(cc, fz); m.box(x - w, y - w, zc - w, x + w, y + w, zc + w, col, 0); } void sa; };
        hand(hh, 0.32, 0.05, '#2a2030'); hand(mm, 0.45, 0.035, '#2a2030'); { const [x, y] = P(hr.c, f0 - 0.43 * sp.sg); m.box(x - 0.05, y - 0.05, cz + 0.95, x + 0.05, y + 0.05, cz + 1.05, C.GOLD, M.metal); } } }); }

    if (o.bob && showLv(cut, 1)) { const b = o.bob, z = POOL.z + 0.12 - (b.dip || 0); m.ball(b.u, b.v, z + 0.18, 0.16, 0.16, '#e84a3a', 0, 4, 8); m.ball(b.u, b.v, z - 0.02, 0.17, 0.12, '#f4f0e6', 0, 3, 8); m.box(b.u - 0.025, b.v - 0.025, z + 0.3, b.u + 0.025, b.v + 0.025, z + 0.62, '#2a2030', 0); } // 浮漂：红白两截，咬钩时往下一沉
    if (o.drag && PP.FURN) inFrame(m, frameOf(o.drag.room || 'living'), () => PP.FURN.build(m, [o.drag], { S: FS, zOf: (it) => Z[roomLv(it.room || 'living')], pinkBed: o.pinkBed, idx: () => -1 }));
    return m;
  }
  const FALL = CITY ? (([u, v]) => [u, v])(polarW(-8, 31)) : [50, 38]; // 东边的瀑布
  const DECK = { v1: DK.v1 };
  PP.FORT = { SHRINE, GAL_LAMPS, RELICS, LIFT, LAKE, inLake, wallSpans, HEARTH, POOL_L, pondFrame: () => null, lightBoxes, switches, SW_PK, _tree: (m, o, u, v, z, h, seed, l) => tree(m, o, u, v, z, h, seed, l), roomH, joinRuns, FALL, MODS, MD, inMod, plotStand, plotC, hiveStand, mailStand, tapStand, HIVE_Z, toW, toL, frameOf, rectObs, wBox, Z, NAME, WH, FS, DECK, CEN, inDeck, ROOMS, RM, OPEN, PASS, ENTRIES, RAMPS, PLOTS, PS, POOL, FISH, BOB, HIVES, MAILB, TAP, LAMPS, SLOTS, BALLOON, NEST, GPOTS, FIX, PK, AREA, WING_ROOTS, build, dyn, roomAt, roomLv, floorAt, inRoom, bbox, C, shade };
})();
