// 小岛视图：一艘拼拼凑凑的「浮空花园船」——木头船身上长满了草和藤蔓，甲板上挤着几栋不一样的房子：
//   带二楼出挑的小屋（能进去）、尖顶圆塔（塔顶小风轮会转）、玻璃花房、铁皮顶小棚，一根打补丁的帆，
//   船底挂着一颗发光的浮空水晶（它让整艘船飘着），船尾的螺旋桨慢慢转。
//   甲板上：六块菜地（点空地选种子种）、雨水桶（喝水）、船头篝火、信箱、伸出船舷的钓鱼板（往云海里钓鱼）、
//           系在船尾的热气球（派伙伴去探险）
//   屋里：剖面小屋——壁炉、两扇窗（窗外就是此刻小岛外面的天色和天气）、床、地毯、书架、钢琴 / 摇椅……
// 做法：一个小小的“体素”渲染器——每一格是一根有高度的柱子，按远近画，所以有侧面、遮挡和投影；
//       树、信箱这些是立着的像素小精灵。光从左上来：顶面亮、朝左的面中、朝右的面暗，高的东西往右下投影。
// 玩法：点甲板上的空地，主角走过去；按住拖动可以把整座岛挪到屏幕别处；大小在“视图”里选（小 / 中 / 大）。
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const A = PP.ACTIONS;

  // ---------- 等距坐标 ----------
  const N = 60, HG = 6;
  const IW = 240, IH = 226, OX = 120, OY = 62;
  const cx = (u, v) => OX + 2 * (u - v) + 2, cy = (u, v, z = 0) => OY + u + v - z;
  // 甲板：沿 u 方向长长的船形（船头在 u 大的那头，船尾是平的）
  function deckW(u) {
    const t = (u - 29) / 27; if (t < -1 || t > 1) return 0;
    let w = 19;
    if (t > 0.3) w *= Math.sqrt(Math.max(0, 1 - ((t - 0.3) / 0.7) ** 2));
    if (t < -0.82) w *= 1 - ((-0.82 - t) / 0.18) ** 2 * 0.35;
    return w;
  }
  const inDeck = (u, v) => { const w = deckW(u + 0.5); return w > 0.6 && Math.abs(v + 0.5 - 28) <= w; };
  // 场地
  const COT = { u0: 8, v0: 22, u1: 18, v1: 32, w1: 16, w2: 12, roof: 12 }; // 小屋：一楼 16 高，二楼 12 高（往前挑出一格），坡顶 12
  const UP = { u0: 9, v0: 22, u1: 19, v1: 33 };
  const DOOR = { u: 12 };          // 门在一楼朝左下的那面（v = 32），占 u 12..13
  const TOWER = { u: 8, v: 16, r: 3.4, h: 50 };
  const GREEN = { u0: 12, v0: 13, u1: 19, v1: 19, h: 12 };
  const SHED = { u0: 3, v0: 24, u1: 6, v1: 31, h: 11 };
  const MAST = { u: 33, v: 11 };
  const TREE = { u: 23, v: 14 };
  const PLOTS = [[24, 27], [29, 27], [34, 27], [24, 32], [29, 32], [34, 32]]; // 每块 4×4 格
  const FIRE = { u: 44, v: 37 };
  const MAILB = { u: 49, v: 32 };
  const BARREL = { u: 21, v: 39 };
  const PLANK = { u0: 44, u1: 45, v0: 4, v1: 10 };
  const FISH = { u: 44.8, v: 5.4 };
  const BALLOON = { u: 6, v: 41 };   // 系热气球的木桩
  const SLOTS = [[17, 37], [9, 37], [30, 13], [30, 41], [50, 24], [40, 43]];
  const SLOT_NAME = ['门口', '屋旁', '桅杆下', '菜地前', '船头', '篝火旁'];
  // 屋里
  const RN = 50, RH0 = 4, WALLH = 54, R0 = 6, R1 = R0 + RN; // 地板 u, v ∈ [R0, R1)
  const RWIN = [{ t0: 10, t1: 19 }, { t0: 31, t1: 40 }], RWZ0 = RH0 + 18, RWZ1 = RH0 + 36; // 右后墙上的两扇窗
  const RDOOR = { u: 30 };

  let L = null, inside = false, cache = null, roomCache = null, hover = null, dirtyK = 0, smoke = [], cooking = false;
  let mark = null, drops = [], flash = 0, press = null;
  const S = () => G.save.settings;
  const E = () => PP.econ.E();
  const K = () => PP.WORLD_KIT, ART = () => PP.ART;
  function want() { const s = G.save && S(); return !!(s && s.mode === 'mini' && s.isle && !s.taskbar); }
  const env = () => PP.env.get();
  const season = () => (PP.season ? PP.season() : 'summer');
  const phase = () => env().time.phase;
  const night = () => phase() === 'night';
  const wfx = () => env().fx;
  const snowy = () => season() === 'winter' || wfx().snow > 0.3;
  const tripping = () => G.all.some((p) => p.d.trip);

  // ---------- 体素渲染 ----------
  function vox(P, cols, bills, rec) {
    const items = [];
    for (const c of cols) items.push({ d: c.u + c.v, k: c.u, c });
    for (const b of bills) items.push({ d: b.u + b.v + 0.5, k: 1e9, b });
    items.sort((a, b) => a.d - b.d || a.k - b.k);
    for (const it of items) {
      if (it.c) {
        const c = it.c, x = OX + 2 * (c.u - c.v), y = OY + c.u + c.v, b0 = c.b || 0;
        for (let z = b0; z < c.h; z++) {
          const row = y - z;
          for (let i = 0; i < 2; i++) { const l = c.lf(z, i, c.u, c.v); if (l) { P.set(x + i, row, l); rec && rec(x + i, it.d); } const r = c.rf(z, 1 - i, c.u, c.v); if (r) { P.set(x + 2 + i, row, r); rec && rec(x + 2 + i, it.d); } }
        }
        if (c.top) { for (let i = 0; i < 4; i++) { const t = c.top(i, 0, c.u, c.v); if (t) { P.set(x + i, y - c.h, t); rec && rec(x + i, it.d); } } for (let i = 1; i < 3; i++) { const t = c.top(i, 1, c.u, c.v); if (t) P.set(x + i, y - c.h - 1, t); } }
      } else {
        const b = it.b, bb = b.spr.stamp(P, cx(b.u, b.v), cy(b.u, b.v, b.z != null ? b.z : HG) + 1 + (b.dy || 0));
        if (rec) for (let x = bb.x0; x < bb.x1; x++) rec(x, it.d);
      }
    }
  }
  function occluder(cols, bills) {
    const a = ART(), P = new a.Pix(IW, IH), dAt = new Float32Array(IW).fill(-1);
    vox(P, cols, bills, (x, d) => { if (x >= 0 && x < IW) dAt[x] = Math.max(dAt[x], d); });
    PP.gradePix && PP.gradePix(P.d);
    let x0 = IW, x1 = 0, y0 = IH, y1 = 0;
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) if (P.d[y * IW + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < x0) return null;
    const cv = document.createElement('canvas'); cv.width = x1 - x0 + 1; cv.height = y1 - y0 + 1;
    cv.getContext('2d').drawImage(P.canvas(), -x0, -y0);
    return { cv, x0, y0, x1, y1, dAt };
  }
  const H = (s, n, k = 7) => ART().hash(s, n, k);
  const mix = (a, b, k) => ART().mix(a, b, k);
  // 投影：光从 -u（屏幕左上）斜照下来，高的柱子往 +u 方向投影
  function shadowMap(cols) {
    const hm = new Map();
    for (const c of cols) { const k = c.u * 100 + c.v; if ((hm.get(k) || 0) < c.h) hm.set(k, c.h); }
    return (u, v, z) => { for (let k = 1; k < 30; k++) { const h = Math.max(hm.get((u - k) * 100 + v) || 0, k > 1 ? hm.get((u - k) * 100 + v - 1) || 0 : 0); if (h - z > k * 1.35) return Math.min(1, 0.55 + (h - z - k * 1.35) / 30); } return 0; };
  }
  const SH = '#3a2a5a';

  // ---------- 色板 ----------
  const GRASS = {
    spring: ['#5a9a44', '#6aaa54', '#7cbc62', '#94d070', '#b4e48a'],
    summer: ['#4a8a3e', '#5a9a44', '#6aaa50', '#82c062', '#a0d47a'],
    autumn: ['#8a7a34', '#a8903e', '#bca04a', '#cdb25a', '#e2c870'],
    winter: ['#b8c8dc', '#d0dcec', '#e4ecf6', '#f2f6fc', '#ffffff'],
  };
  const ROOF = ['#c8604a', '#a8483a', '#e07a5a', '#8a3a30'];
  const SLATE = ['#5a7ab0', '#46649a', '#7a9ac8', '#384e80'];
  const TIN = ['#8a9ab0', '#6a7a94', '#aab8c8', '#58667e'];
  const WOOD = ['#a8784a', '#8a5a3a', '#c8935e', '#6a4430'];

  // ---------- 甲板 ----------
  function onPath(u, v) {
    return (v >= 33 && v <= 35 && u >= 10 && u <= 52 && !(v === 33 && u < 19)) || (u >= 39 && u <= 41 && v >= 11 && v <= 34) || (u >= 12 && u <= 13 && v >= 32 && v <= 35) || (u >= 42 && u <= 45 && v >= 9 && v <= 12);
  }
  const inPlot = (u, v) => PLOTS.some(([pu, pv]) => u >= pu && u < pu + 4 && v >= pv && v < pv + 4);
  const nearFire = (u, v) => Math.hypot(u - FIRE.u, v - FIRE.v) < 3.2;
  function deckCols(se, snow) {
    const GC = GRASS[se] || GRASS.summer, cols = [];
    const isEdge = (u, v) => !inDeck(u + 1, v) || !inDeck(u, v + 1) || !inDeck(u - 1, v) || !inDeck(u, v - 1);
    // 船舷：最上一条金色描边、下面一圈蓝绿漆
    const side = (z, i, u, v, dark) => { const zz = HG - 1 - z; const c = zz === 0 ? '#e0b070' : zz <= 3 ? (H(u + v + i, z) < 0.5 ? '#3a7a8a' : '#347282') : '#8a5a3a'; return dark ? mix(c, '#1a1028', 0.3) : c; };
    for (let u = 0; u < N; u++) for (let v = 0; v < N; v++) {
      if (!inDeck(u, v)) continue;
      const lf = (z, i) => side(z, i, u, v, false), rf = (z, i) => side(z, i, u, v, true);
      let top;
      if (inPlot(u, v)) top = (i, r) => (snow ? (r ? '#e8eef6' : '#d4dce8') : (u + v) % 2 === 0 && r === 0 ? '#8a5a36' : i === 0 ? '#5a3420' : H(u * 4 + i, v + r) < 0.2 ? '#7a4a2a' : '#6a4026');
      else if (nearFire(u, v)) top = (i, r) => (H(u * 4 + i, v * 2 + r, 9) < 0.5 ? '#a8a0b4' : '#9890a8');
      else if (onPath(u, v)) top = (i, r) => { if (snow && H(u * 4 + i, v + r) < 0.7) return r ? '#eef2f8' : '#dce4ee'; const seam = (v + (r ? 0 : 0)) % 2 === 0 && r === 1; const nail = (u % 5 === 0 && i === 0); return nail ? '#5a3a28' : seam ? '#9a6a42' : H(u * 4 + i, v, 3) < 0.5 ? '#c8935e' : '#bc8854'; };
      else top = (i, r) => { const n = H(u * 4 + i, v * 2 + r); if (snow) return n < 0.1 ? '#d8e0ec' : n < 0.5 ? '#f2f6fc' : '#ffffff'; if (se === 'autumn' && n < 0.05) return ['#e8703a', '#f0a040', '#c8443a'][(u + i) % 3]; return n < 0.07 ? GC[4] : n < 0.4 ? GC[2] : n < 0.85 ? GC[3] : GC[1]; };
      cols.push({ u, v, h: HG, lf, rf, top, deck: true, edge: isEdge(u, v) });
    }
    return cols;
  }
  // 栏杆：围着船舷，留出钓鱼板和系气球的地方
  function railCols() {
    const cols = [];
    for (let u = 0; u < N; u++) for (let v = 0; v < N; v++) {
      if (!inDeck(u, v) || (inDeck(u + 1, v) && inDeck(u, v + 1) && inDeck(u - 1, v) && inDeck(u, v - 1))) continue;
      if (u >= PLANK.u0 - 1 && u <= PLANK.u1 + 1 && v < 14) continue;
      if (Math.hypot(u - BALLOON.u, v - BALLOON.v) < 4) continue;
      if (u >= SHED.u0 - 1 && u <= SHED.u1 + 1 && v >= SHED.v0 && v <= SHED.v1) continue;
      const post = (u * 3 + v) % 4 === 0;
      cols.push({ u, v, b: HG, h: HG + (post ? 8 : 6), lf: (z) => (post ? (z === HG + 7 ? '#e0b070' : '#a8784a') : z === HG + 5 ? '#c8935e' : z === HG + 2 ? '#a8784a' : null), rf: (z) => (post ? '#6a4430' : z === HG + 5 ? '#8a6040' : z === HG + 2 ? '#7a5236' : null), top: post ? () => '#e0b070' : (i) => (i % 2 ? '#d8a868' : null) });
    }
    return cols;
  }
  // 钓鱼板：伸出船舷的一条木板，下面有斜撑
  function plankCols() {
    const cols = [];
    for (let u = PLANK.u0; u <= PLANK.u1; u++) for (let v = PLANK.v0; v <= PLANK.v1; v++) {
      if (inDeck(u, v)) continue;
      cols.push({ u, v, b: HG - 2, h: HG, lf: (z) => (z === HG - 1 ? '#d8a868' : '#8a5a3a'), rf: () => '#5a3a28', top: (i) => (i === 0 ? '#a8784a' : '#d8a868') });
    }
    cols.push({ u: PLANK.u0, v: PLANK.v0 + 2, b: HG - 9, h: HG - 2, lf: () => '#6a4430', rf: () => '#4a2e1c', top: null });
    return cols;
  }

  // ---------- 房子 ----------
  const glass = (on, hi) => (on ? (hi ? '#fff2b8' : '#ffd36a') : (hi ? '#d8f0fc' : '#8ac8f0'));
  function cottageCols(snow, lit, shade) {
    const cols = [], c = COT, top1 = HG + c.w1, top2 = top1 + c.w2;
    // 一楼：石头墙脚 + 木板墙（爬山虎），前面门和两扇窗
    for (let u = c.u0; u <= c.u1; u++) for (let v = c.v0; v <= c.v1; v++) {
      const fV = v === c.v1, fU = u === c.u1;
      cols.push({ u, v, b: HG, h: top1,
        lf: (z, i) => {
          if (!fV) return '#b8a890'; const zz = z - HG;
          if (zz < 3) return H(u * 2 + i, z) < 0.5 ? '#a8a0b4' : '#9890a8';
          if (u >= DOOR.u && u <= DOOR.u + 1 && zz < 12) { if (zz === 11 || (u === DOOR.u && i === 0) || (u === DOOR.u + 1 && i === 1)) return '#4a3022'; if (zz === 6 && u === DOOR.u + 1 && i === 0) return '#ffd36a'; if (zz === 9 && u === DOOR.u && i === 1) return lit ? '#ffe9a8' : '#8ac8f0'; return (zz + (u * 2 + i)) % 4 === 0 ? '#7a4a2e' : '#8a5236'; }
          if ((u === 15 || u === 16) && zz >= 6 && zz < 12) return zz === 6 || zz === 11 ? '#6a4430' : (u === 15 && i === 1 ? '#6a4430' : glass(lit, zz > 8 && i === 0));
          if (zz === 5 && (u === 15 || u === 16)) return (u + i) % 2 ? '#e8705a' : '#7cbc62'; // 窗下花箱
          if ((u === 9 || u === 10) && zz >= 6 && zz < 12) return zz === 6 || zz === 11 ? '#6a4430' : glass(lit, zz > 8 && i === 0);
          if (H(u * 2 + i, zz, 5) < 0.18 + (zz < 8 ? 0.3 : 0) * (u < 11 ? 1 : 0)) return H(u + i, zz, 6) < 0.5 ? '#5a9a4e' : '#3f7a44'; // 爬山虎
          return (u * 2 + i) % 5 === 0 ? '#c8a878' : zz % 4 === 3 ? '#d8b88a' : '#e4c89a';
        },
        rf: (z, i) => {
          if (!fU) return '#a89878'; const zz = z - HG;
          if (zz < 3) return H(v * 2 + i, z + 3) < 0.5 ? '#8a8298' : '#7a7290';
          if ((v === 25 || v === 26 || v === 29 || v === 30) && zz >= 6 && zz < 12) return zz === 6 || zz === 11 ? '#5a3a28' : glass(lit, i === 0 && zz > 8);
          return (v * 2 + i) % 5 === 0 ? '#a8885a' : zz % 4 === 3 ? '#b8986a' : '#c4a678';
        },
        top: () => '#8a7058' });
    }
    // 二楼：往前、往右各挑出一格，白灰泥墙 + 深色木梁（跟一楼不一样的材料，像后来加盖的）
    const vc = (UP.v0 + UP.v1) / 2, half = (UP.v1 - UP.v0) / 2 + 0.5;
    for (let u = UP.u0; u <= UP.u1; u++) for (let v = UP.v0; v <= UP.v1; v++) {
      const fV = v === UP.v1, fU = u === UP.u1, rh = Math.round(top2 + c.roof * (1 - Math.abs(v + 0.5 - vc) / half));
      cols.push({ u, v, b: top1, h: rh,
        lf: (z, i) => {
          if (z >= top2) return (z >= rh - 1 ? ROOF[1] : (u + Math.floor(z / 2)) % 3 === 0 ? ROOF[3] : ROOF[1]);
          if (!fV) return '#d8ccb4'; const zz = z - top1;
          if (zz === 0) return '#4a3022';
          if ((u === 11 || u === 12 || u === 16 || u === 17) && zz >= 3 && zz < 9) return zz === 3 || zz === 8 ? '#4a3022' : glass(lit, i === 0 && zz > 5);
          if (u === 14 && zz >= 4 && zz < 9) return zz === 4 || zz === 8 || i === 1 ? '#4a3022' : glass(lit, false); // 圆窗
          if (zz === c.w2 - 1 || u % 3 === 0 && i === 0 || (zz === 5 && u % 3 !== 0)) return '#5a3a28';
          return '#f4ead6';
        },
        rf: (z, i) => {
          if (!fU) return z >= top2 ? ROOF[3] : '#c8bca4'; const zz = z - top1;
          if (zz >= c.w2) { const k = (zz - c.w2) / c.roof, need = Math.abs(v + 0.5 - vc) / half; if (need > 1 - k) return null; if (v === Math.round(vc) && zz > c.w2 + 3 && zz < c.w2 + 8) return zz === c.w2 + 4 || zz === c.w2 + 7 || i === 1 ? '#4a3022' : glass(lit, false); return (v + i) % 3 === 0 ? '#5a3a28' : '#e4d8c2'; }
          if (zz === 0) return '#3a2418';
          if ((v === 25 || v === 26 || v === 29 || v === 30) && zz >= 3 && zz < 9) return zz === 3 || zz === 8 ? '#4a3022' : glass(lit, i === 0 && zz > 5);
          if (zz === c.w2 - 1 || (v % 3 === 0 && i === 1)) return '#4a3022';
          return '#e0d4be';
        },
        top: (i, r) => (snow ? (r ? '#ffffff' : '#e8f0f8') : (Math.abs(v + 0.5 - vc) < 0.6 ? '#8a3a30' : ((u + (v % 2)) % 2 === 0 && i === 1) ? ROOF[2] : ROOF[0])) });
    }
    // 歪歪的砖烟囱 + 铁皮烟管
    for (let u = 16; u <= 17; u++) for (let v = 23; v <= 24; v++) cols.push({ u, v, b: top2, h: top2 + c.roof + 6, lf: (z) => (z % 3 === 0 ? '#7a3a34' : '#b8584a'), rf: (z) => (z % 3 === 0 ? '#5a2a24' : '#94463a'), top: () => '#2a2026' });
    cols.push({ u: 10, v: 30, b: top2, h: top2 + c.roof + 4, lf: () => '#8a9ab0', rf: () => '#5a667e', top: () => '#2a2026' });
    // 门前台阶 + 门垫
    for (let u = DOOR.u - 1; u <= DOOR.u + 2; u++) cols.push({ u, v: c.v1 + 1, h: HG + 1, lf: () => '#a8a0b4', rf: () => '#8a8298', top: (i) => (u >= DOOR.u && u <= DOOR.u + 1 ? (i % 2 ? '#c8604a' : '#e07a5a') : i === 0 ? '#b8b0c4' : '#ccc4d8') });
    return cols;
  }
  // 圆塔：石头塔身、一圈小阳台、尖尖的蓝色石板顶（塔顶有个小风轮，单独画，会转）
  function towerCols(snow, lit) {
    const cols = [], t = TOWER, top = HG + t.h;
    for (let u = Math.floor(t.u - t.r); u <= Math.ceil(t.u + t.r); u++) for (let v = Math.floor(t.v - t.r); v <= Math.ceil(t.v + t.r); v++) {
      const r = Math.hypot(u - t.u, v - t.v); if (r > t.r) continue;
      const cone = Math.round(top + (t.r + 0.6 - r) * 5.2);
      cols.push({ u, v, b: HG, h: cone,
        lf: (z, i) => { const zz = z - HG; if (z >= top) return (z >> 1) % 2 ? SLATE[0] : SLATE[1]; if (zz === t.h - 12 || zz === t.h - 11) return '#6a4430'; if (zz >= 26 && zz < 33 && Math.abs(u - t.u) < 1.2) return zz === 26 || zz === 32 ? '#4a3022' : glass(lit, i === 0 && zz > 29); if (zz >= 10 && zz < 16 && Math.abs(u - t.u + 1) < 1) return zz === 10 || zz === 15 ? '#4a3022' : glass(lit, zz > 12); const row = zz >> 2, br = ((u * 2 + i + row * 3) % 6 === 0); return br ? '#8a8298' : H(u + row, i, 11) < 0.5 ? '#d8d0dc' : '#c8c0d0'; },
        rf: (z, i) => { const zz = z - HG; if (z >= top) return SLATE[3]; if (zz === t.h - 12 || zz === t.h - 11) return '#4a2e1c'; const row = zz >> 2, br = ((v * 2 + i + row * 3) % 6 === 0); return br ? '#6a6278' : H(v + row, i, 12) < 0.5 ? '#aaa2b8' : '#9c94aa'; },
        top: (i) => (snow ? '#ffffff' : i % 2 ? SLATE[2] : SLATE[0]) });
    }
    // 阳台：一圈木头
    for (let u = Math.floor(t.u - t.r - 1); u <= Math.ceil(t.u + t.r + 1); u++) for (let v = Math.floor(t.v - t.r - 1); v <= Math.ceil(t.v + t.r + 1); v++) {
      const r = Math.hypot(u - t.u, v - t.v); if (r <= t.r || r > t.r + 1.3) continue;
      cols.push({ u, v, b: HG + t.h - 14, h: HG + t.h - 12, lf: () => '#a8784a', rf: () => '#6a4430', top: () => '#c8935e' });
    }
    return cols;
  }
  // 玻璃花房：白框 + 浅蓝玻璃，里面隐约是绿植
  function greenCols(snow) {
    const cols = [], g = GREEN, vc = (g.v0 + g.v1) / 2, half = (g.v1 - g.v0) / 2 + 0.5;
    const inside = (k, z) => (z - HG < 7 && H(k, z, 31) < 0.55 ? (H(k, z, 32) < 0.5 ? '#5aa64e' : '#3f8a44') : H(k, z >> 1, 33) < 0.06 ? '#f2a6c2' : '#b8e0ee');
    for (let u = g.u0; u <= g.u1; u++) for (let v = g.v0; v <= g.v1; v++) {
      const fV = v === g.v1, fU = u === g.u1, rh = Math.round(HG + g.h + 6 * (1 - Math.abs(v + 0.5 - vc) / half));
      cols.push({ u, v, b: HG, h: rh,
        lf: (z, i) => { const zz = z - HG; if (zz < 2) return '#8a8298'; if (zz >= g.h) return (u + i) % 3 === 0 ? '#f4f4f4' : '#cfeafa'; if (!fV) return '#a8d0e0'; if (zz === 2 || zz === g.h - 1 || ((u * 2 + i) % 6 === 0)) return '#f4f4f4'; return inside(u * 2 + i, z); },
        rf: (z, i) => { const zz = z - HG; if (zz < 2) return '#6a6278'; if (zz >= g.h) { if (!fU) return '#a8c8d8'; const k = (zz - g.h) / 6, need = Math.abs(v + 0.5 - vc) / half; if (need > 1 - k) return null; return (v + i) % 3 === 0 ? '#e0e0e0' : '#a8d0e0'; } if (!fU) return '#90b8c8'; if (zz === 2 || zz === g.h - 1 || ((v * 2 + i) % 6 === 0)) return '#d8d8d8'; return mix(inside(v * 2 + i + 50, z), '#2a3a5a', 0.15); },
        top: (i, r) => (snow ? '#ffffff' : (u + i) % 3 === 0 ? '#ffffff' : '#d8f0fc') });
    }
    return cols;
  }
  // 小棚：歪一点的木板 + 铁皮斜顶
  function shedCols(snow) {
    const cols = [], s = SHED;
    for (let u = s.u0; u <= s.u1; u++) for (let v = s.v0; v <= s.v1; v++) {
      const fV = v === s.v1, fU = u === s.u1, rh = HG + s.h + (s.u1 - u) * 2;
      cols.push({ u, v, b: HG, h: rh,
        lf: (z, i) => { const zz = z - HG; if (zz >= s.h - 1) return TIN[(u + (z >> 1)) % 2 ? 0 : 1]; if (!fV) return '#8a6040'; if (u === 4 && zz < 8) return zz === 7 || i === 0 ? '#3a2418' : '#5a3a28'; return (u * 2 + i) % 3 === 0 ? '#7a5236' : H(u * 2 + i, zz >> 2, 41) < 0.5 ? '#a8784a' : '#98683e'; },
        rf: (z, i) => { const zz = z - HG; if (zz >= s.h - 1) return TIN[3]; if (!fU) return '#6a4430'; return (v * 2 + i) % 3 === 0 ? '#5a3a28' : '#7a5236'; },
        top: (i) => (snow ? '#ffffff' : i % 2 ? TIN[2] : TIN[0]) });
    }
    return cols;
  }
  function boxCols(u0, v0, du, dv, b, h, L_, R_, T_) { const out = []; for (let u = u0; u < u0 + du; u++) for (let v = v0; v < v0 + dv; v++) out.push({ u, v, b, h, lf: (z, i) => L_(z, i, u, v), rf: (z, i) => R_(z, i, u, v), top: (i, r) => T_(i, r, u, v) }); return out; }

  // ---------- 立着的小精灵 ----------
  function campfire(a) { const s = a.spr(14, 8); for (const [x, y, c] of [[2, 6, '#8a5a3a'], [5, 7, '#7a4e30'], [9, 7, '#8a5a3a'], [12, 6, '#7a4e30']]) s.rect(x, y, 3, 2, c); s.ell(7.5, 6.5, 6, 2, (nx) => (Math.abs(nx) > 0.75 ? '#9890a8' : null)); return s; }
  function stump(a) { const s = a.spr(8, 6); s.rect(1, 2, 7, 5, '#8a5a3a'); s.ell(4.5, 2, 3.5, 1.2, '#d8b080'); s.set(4, 2, '#a8784a'); s.vl(2, 3, 4, '#a8784a'); return s.outline('#3a2630'); }
  function balloon(a) {
    const s = a.spr(26, 44), C = ['#e8705a', '#ffd36a', '#5a8ad8', '#7cbc62', '#f2a6c2'];
    s.ell(13, 13, 12, 13, (nx, ny) => { const band = Math.floor((Math.atan2(ny, nx * 0.9) + Math.PI) / (Math.PI / 5)); let c = C[band % 5]; if (H(band, Math.floor(ny * 4), 21) < 0.25) c = C[(band + 2) % 5]; if (nx < -0.5 && ny < 0) c = mix(c, '#ffffff', 0.3); else if (nx > 0.45) c = mix(c, '#2a1a34', 0.28); if (ny > 0.8) c = mix(c, '#2a1a34', 0.3); return c; });
    for (let y = 26; y < 35; y++) { s.set(7 + Math.round((y - 26) * 0.3), y, '#8a7a6a'); s.set(19 - Math.round((y - 26) * 0.3), y, '#8a7a6a'); }
    s.rect(9, 35, 9, 7, '#a8784a'); s.hl(9, 35, 9, '#c8935e'); s.hl(9, 38, 9, '#8a5a3a'); s.vl(9, 35, 7, '#7a4e30'); s.set(12, 34, '#5aa64e'); s.set(14, 33, '#5aa64e');
    return s.outline('#3a2630');
  }
  function post(a, h) { const s = a.spr(4, h); s.rect(1, 1, 3, h, '#8a5a3a'); s.vl(1, 1, h, '#a8784a'); s.hl(1, 1, 3, '#c8935e'); return s.outline('#3a2630'); }
  function stakeSign(a) { const s = a.spr(14, 12); s.vl(7, 5, 7, '#7a5a40'); s.rect(1, 1, 13, 5, '#c8935e'); s.hl(1, 1, 13, '#e0b07a'); s.hl(3, 3, 9, '#7a4e30'); return s.outline('#3a2630'); }
  function homeSign(a) { const s = a.spr(12, 8); s.rect(1, 2, 11, 6, '#c8935e'); s.hl(1, 2, 11, '#e8c08a'); s.hl(1, 7, 11, '#8a5a3a'); s.set(4, 0, '#5a3a28'); s.set(9, 0, '#5a3a28'); s.set(4, 1, '#5a3a28'); s.set(9, 1, '#5a3a28'); for (const [x, y] of [[5, 4], [6, 4], [8, 4], [9, 4], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [6, 6], [7, 6], [8, 6]]) s.set(x, y, '#e8405a'); s.set(7, 4, '#e8405a'); return s.outline('#3a2630'); }
  // 打补丁的帆 + 桅杆 + 瞭望斗
  function mastSpr(a) {
    const s = a.spr(34, 78), PAT = ['#f4ead6', '#e8c8a8', '#a8d0c8', '#f2c4c4', '#ffe0a0'];
    s.rect(16, 6, 3, 72, '#8a5a3a'); s.vl(16, 6, 72, '#a8784a');
    s.rect(13, 4, 9, 4, '#7a4e30'); s.hl(13, 4, 9, '#a8784a'); // 瞭望斗
    s.rect(2, 14, 31, 2, '#7a4e30'); // 横杆
    for (let y = 16; y < 50; y++) { const bulge = Math.round(Math.sin(((y - 16) / 34) * Math.PI) * 3); for (let x = 3 + (y > 44 ? (y - 44) : 0) - bulge; x < 32 - (y > 44 ? (y - 44) : 0) + bulge; x++) { if (x >= 15 && x <= 19) continue; const pi = Math.floor((x + 40) / 7) + Math.floor((y - 16) / 9) * 3; let c = PAT[pi % 5]; if ((x + 40) % 7 === 0 || (y - 16) % 9 === 0) c = (x + y) % 2 ? '#8a7a6a' : c; if (x > 24) c = mix(c, '#3a2a4a', 0.18); else if (x < 8) c = mix(c, '#ffffff', 0.2); s.set(x, y, c); } }
    s.rect(2, 50, 31, 2, '#7a4e30');
    return s.outline('#3a2630');
  }
  function planterTree(a, se, R) { return a.broadleaf(36, se, R, se === 'spring' ? 'apple' : 'oak'); }
  function lantern(a) { const s = a.spr(5, 7); s.hl(2, 0, 2, '#3a3448'); s.rect(1, 1, 4, 5, '#3a3448'); s.rect(2, 2, 2, 3, '#ffd36a'); return s; }
  function decoSpr(id, snow, se, R) {
    const a = ART(), k = K();
    if (id === 'bench') return a.bench(snow);
    if (id === 'lampPost') return a.lamp(snow);
    if (id === 'hay') return a.hayBale(snow);
    if (id === 'lantern') { const s = a.pumpkin(); s.set(Math.floor(s.w / 2) - 1, Math.floor(s.h / 2), '#ffd25a'); s.set(Math.floor(s.w / 2) + 1, Math.floor(s.h / 2), '#ffd25a'); return s; }
    if (id === 'flowers') return k.flowerBush(6, se, ['#f2a6c2', '#ffd36a', '#b8a0f0'][Math.floor(R() * 3)]);
    if (id === 'scarecrow') {
      const s = a.spr(15, 24);
      s.vl(8, 6, 18, '#8a6040'); s.hl(2, 10, 13, '#8a6040');
      s.ell(8, 4, 3.2, 3.2, '#f2d28a'); s.set(7, 4, '#3a2630'); s.set(9, 4, '#3a2630'); s.hl(7, 6, 3, '#c8705a');
      s.rect(4, 0, 9, 2, '#c8a050'); s.rect(6, -1, 5, 2, '#b08a40');
      s.rect(5, 9, 7, 8, '#5a8ad8'); s.hl(5, 9, 7, '#7aa8f0'); s.set(6, 12, '#ffd36a'); s.set(10, 14, '#e8705a');
      return s.outline('#3a2630');
    }
    if (id === 'swing') {
      const s = a.spr(20, 30);
      for (let y = 0; y < 31; y++) { s.set(1 + Math.round(y / 10), y, '#8a6040'); s.set(19 - Math.round(y / 10), y, '#8a6040'); }
      s.hl(1, 0, 19, '#a8784a'); for (let y = 1; y < 22; y++) { s.set(5, y, '#d8c8a0'); s.set(15, y, '#d8c8a0'); }
      s.rect(4, 22, 13, 2, '#a8784a'); s.hl(4, 22, 13, '#c8935e');
      return s.outline('#4a3022');
    }
    return null;
  }

  // ---------- 船身（甲板下面）----------
  function hullUnder(P, deck, lit) {
    const a = ART();
    const lowY = new Int16Array(IW).fill(-1);
    for (const c of deck) { const x = OX + 2 * (c.u - c.v), y = OY + c.u + c.v; for (let i = 0; i < 4; i++) if (x + i >= 0 && x + i < IW) lowY[x + i] = Math.max(lowY[x + i], y); }
    let xa = IW, xb = 0; for (let x = 0; x < IW; x++) if (lowY[x] >= 0) { xa = Math.min(xa, x); xb = Math.max(xb, x); }
    // 龙骨深度：船中间最深，船头翘起来，船尾平
    const yb = new Float32Array(IW);
    for (let x = xa; x <= xb; x++) {
      const uc = (x - OX - 2) / 2 + 28, t = U.clamp((uc - 29) / 27, -1.2, 1.2);
      const prof = t > 0 ? Math.max(0, 1 - t ** 1.6) : t > -0.85 ? 1 - (t / 0.85) ** 4 * 0.45 : Math.max(0, 0.55 - (-0.85 - t) * 2.5);
      yb[x] = Math.max(lowY[x] + 4, OY + uc + 28 + 60 * prof);
    }
    const ys = yb.slice(); for (let x = xa + 2; x <= xb - 2; x++) ys[x] = (yb[x - 2] + yb[x - 1] + yb[x] + yb[x + 1] + yb[x + 2]) / 5;
    const mid = (xa + xb) / 2, halfW = (xb - xa) / 2, keel = [];
    for (let x = xa; x <= xb; x++) {
      const y0 = lowY[x] + 1, y1 = Math.round(ys[x]), depth = Math.max(1, y1 - y0), nx = (x - mid) / halfW;
      for (let y = y0; y <= y1; y++) {
        const d = y - y0, k = d / depth;
        let c;
        if (d < 3) c = d === 0 ? '#2a5a6a' : H(x, d, 3) < 0.5 ? '#347282' : '#2e6a7a';
        else if (d === 3) c = '#d8a868';
        else if (k > 0.72) { const n = a.noise(x / 4, y / 3, 17); c = n > 0.62 ? '#5a9a82' : n > 0.45 ? '#6aaa8a' : (x + y) % 5 === 0 ? '#8a4a2a' : '#b8703a'; if ((y - y0 - Math.round(depth * 0.72)) % 4 === 0) c = mix(c, '#3a2018', 0.35); } // 铜皮（有铜绿）
        else { const row = Math.floor((d - 4) / 3); c = ['#8a5a3a', '#7a4e30', '#9a6a42'][(row + Math.floor(H(Math.floor((x + row * 7) / 23), row, 5) * 3)) % 3]; if ((d - 4) % 3 === 2) c = '#5a3a28'; if ((x + row * 7) % 23 === 0) c = '#4a2e1c'; }
        if (nx < -0.35) c = mix(c, '#fff4e0', 0.12 * (1 - k)); else if (nx > 0.3) c = mix(c, '#1a1028', 0.32);
        c = mix(c, '#20142e', Math.max(0, k - 0.2) * 0.5);
        if (y >= y1 - 1) c = '#2a1a24';
        P.set(x, y, c);
      }
      // 舷窗
      if (depth > 18 && x > xa + 10 && x < xb - 10 && x % 26 === 13 && nx < 0.5) {
        const py = y0 + 8;
        for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const r = Math.hypot(i, j); if (r > 3.2) continue; P.set(x + i, py + j, r > 2.2 ? (i + j < 0 ? '#f0c888' : '#a87838') : lit ? (j < 0 ? '#ffe9a8' : '#ffc860') : (i + j < -1 ? '#a8d8f6' : '#3a4a7a')); }
      }
      keel.push([x, y1]);
      // 藤蔓、垂下来的花
      if (H(x, 3, 11) < 0.2) { const len = 3 + Math.floor(H(x, 4, 11) * 14); for (let j = 0; j < len; j++) { const sx = x + (j > len / 2 && H(x, 9) < 0.5 ? 1 : 0); P.set(sx, y0 + j, j === len - 1 && H(x, 5) < 0.5 ? ['#f2a6c2', '#ffd36a', '#ffffff'][Math.floor(H(x, 6) * 3)] : j % 3 === 1 ? '#7cbc62' : '#4a8a3e'); if (j % 4 === 2) P.set(sx + (H(x, j) < 0.5 ? -1 : 1), y0 + j, '#86cc6a'); } }
    }
    let low = keel[0]; for (const k of keel) if (k[1] > low[1]) low = k;
    return { low, xa, xb, lowY };
  }

  // ---------- 拼起来 ----------
  function build() {
    const a = ART(), k = K(), se = season(), snow = snowy(), R = a.rng(77), e = E(), lit = night() || phase() === 'dusk';
    const key = [se, snow ? 1 : 0, (e.isleDeco || []).join(','), tripping() ? 1 : 0, lit ? 1 : 0, dirtyK].join('|');
    if (cache && cache.key === key) return cache;
    const P = new a.Pix(IW, IH);
    // 下面的云海（钓鱼就钓这里）
    k.puffCloud(P, 40, IH - 30, 50, 9, false); k.puffCloud(P, 200, IH - 24, 56, 10, false); k.puffCloud(P, 118, IH - 6, 60, 7, true);
    const bob = [cx(FISH.u, FISH.v) + 16, cy(FISH.u, FISH.v, HG) + 44];
    k.puffCloud(P, bob[0], bob[1] + 4, 30, 6, true);
    const deck = deckCols(se, snow), hull = hullUnder(P, deck, lit);
    const cot = cottageCols(snow, lit), tow = towerCols(snow, lit), gr = greenCols(snow), sh = shedCols(snow), rail = railCols(), plank = plankCols();
    // 船头篝火的石圈、菜地的木框
    const frames = [];
    PLOTS.forEach(([pu, pv]) => { for (let u = pu - 1; u <= pu + 4; u++) for (const v of [pv - 1, pv + 4]) if (inDeck(u, v)) frames.push({ u, v, b: HG, h: HG + 1, lf: () => '#a8784a', rf: () => '#7a5236', top: (i) => (i % 2 ? '#c8935e' : '#b8834e') }); for (let v = pv; v < pv + 4; v++) for (const u of [pu - 1, pu + 4]) frames.push({ u, v, b: HG, h: HG + 1, lf: () => '#a8784a', rf: () => '#7a5236', top: (i) => (i % 2 ? '#c8935e' : '#b8834e') }); });
    const planter = boxCols(TREE.u - 1, TREE.v - 1, 3, 3, HG, HG + 4, () => '#a8784a', () => '#6a4430', (i) => (i % 2 ? '#5a3420' : '#6a4026'));
    const bills = [], occl = [];
    const bill = (u, v, spr, occ, dy, z) => { const b = { u, v, spr, dy, z }; bills.push(b); if (occ) occl.push({ cols: [], bills: [b] }); return b; };
    bill(TREE.u, TREE.v, planterTree(a, se, R), true, 0, HG + 4);
    bill(MAST.u, MAST.v, mastSpr(a), true);
    bill(GREEN.u1 + 2, GREEN.v1 + 1, k.beehive(), true); bill(20, 23, k.flowerBush(6, se, '#f2a6c2')); bill(22, 24, k.flowerBush(5, se, '#ffd36a'));
    bill(SHED.u0 + 1, SHED.v1 + 2, k.crate(7), true); bill(SHED.u0 + 3, SHED.v1 + 2, k.barrel(6), true); bill(SHED.u0 + 2, SHED.v1 + 3, k.crate(5), false);
    bill(BARREL.u, BARREL.v, k.barrel(9), true);
    bill(DOOR.u + 0.5, COT.v1 + 0.5, homeSign(a), false, -24, HG);
    bill(PLOTS[0][0] - 1.5, PLOTS[0][1] + 1, stakeSign(a), false);
    bill(FIRE.u, FIRE.v, campfire(a), false); bill(FIRE.u - 3, FIRE.v + 2, stump(a), true); bill(FIRE.u + 2, FIRE.v - 3, stump(a), true);
    bill(MAILB.u, MAILB.v, k.mailbox(), true);
    bill(54, 28, a.lamp(snow), true); // 船头灯
    bill(BALLOON.u, BALLOON.v, post(a, 12), true);
    if (tripping()) bill(BALLOON.u + 2, BALLOON.v, stakeSign(a), false);
    // 花草
    for (let i = 0; i < 70; i++) {
      const u = 2 + Math.floor(a.hash(i, 1, 51) * 54), v = 8 + Math.floor(a.hash(i, 2, 51) * 42);
      if (!inDeck(u, v) || busy(u, v) || onPath(u, v)) continue;
      const r = a.hash(i, 3, 51);
      bill(u, v, r < 0.4 ? a.flower(se, R) : r < 0.9 ? a.grassTuft(se, R, r > 0.75) : a.mushrooms(se));
    }
    const slots = [];
    (e.isleDeco || []).forEach((id, i) => { if (!id || !SLOTS[i]) return; const d = decoSpr(id, snow, se, R); if (!d) return; const [u, v] = SLOTS[i]; bill(u, v, d, true); slots.push({ id, i, u, v }); });
    const blds = cot.concat(tow, gr, sh, planter);
    occl.push({ cols: cot, bills: [] }, { cols: tow, bills: [] }, { cols: gr, bills: [] }, { cols: sh, bills: [] }, { cols: rail.filter((c) => c.u + c.v > 50), bills: [] });
    // 投影：把高处的东西挡住的甲板顶面压暗
    const shadow = shadowMap(blds.concat(rail.filter(() => false)));
    for (const c of deck) { const s = shadow(c.u, c.v, HG); if (s) { const t0 = c.top; c.top = (i, r, u, v) => { const col = t0(i, r, u, v); return col && mix(col, SH, 0.38 * s); }; } }
    // 墙脚的接触阴影（房子周围一圈压暗一点）
    const near = new Set(blds.map((c) => c.u * 100 + c.v));
    for (const c of deck) { if (!near.has(c.u * 100 + c.v) && (near.has((c.u - 1) * 100 + c.v) || near.has(c.u * 100 + c.v - 1))) { const t0 = c.top; c.top = (i, r, u, v) => { const col = t0(i, r, u, v); return col && mix(col, SH, 0.22); }; } }
    vox(P, deck.concat(plank, frames, rail, blds), bills);
    // 投影到立着的小精灵后面（树、帆在甲板上的一抹影子）
    PP.gradePix && PP.gradePix(P.d);
    const mask = new Uint8Array(IW * IH); for (let i = 0; i < P.d.length; i++) mask[i] = P.d[i] >>> 24 ? 1 : 0;
    const top2 = HG + COT.w1 + COT.w2 + COT.roof;
    cache = { key, cv: P.canvas(), mask, occ: occl.map((o) => occluder(o.cols, o.bills)).filter(Boolean), slots, hull, bob,
      chimney: [cx(17, 24), cy(17, 24, top2 + 6)], pipe: [cx(10.5, 30.5), cy(10.5, 30.5, top2 + 4)], rotor: [cx(TOWER.u, TOWER.v), cy(TOWER.u, TOWER.v, HG + TOWER.h + 20)],
      flag: [cx(MAST.u, MAST.v) + 1, cy(MAST.u, MAST.v, HG) - 78], peak: [cx(19.5, 27.5), cy(19.5, 27.5, HG + COT.w1 + COT.w2 + COT.roof)],
      lights: [[cx(15.5, 33), cy(15.5, 33, HG + 9)], [cx(9.5, 33), cy(9.5, 33, HG + 9)], [cx(12, 34), cy(12, 34, HG + 13)], [cx(14, 34), cy(14, 34, HG + COT.w1 + 6)], [cx(8, 19.6), cy(8, 19.6, HG + 29)]],
      prop: [cx(1, 30), cy(1, 30, 0) + 12] };
    return cache;
  }
  function busy(u, v) {
    if (u >= COT.u0 - 1 && u <= COT.u1 + 2 && v >= COT.v0 - 1 && v <= COT.v1 + 2) return true;
    if (Math.hypot(u - TOWER.u, v - TOWER.v) < TOWER.r + 2) return true;
    if (u >= GREEN.u0 - 1 && u <= GREEN.u1 + 2 && v >= GREEN.v0 - 1 && v <= GREEN.v1 + 2) return true;
    if (u >= SHED.u0 - 1 && u <= SHED.u1 + 2 && v >= SHED.v0 - 1 && v <= SHED.v1 + 4) return true;
    if (PLOTS.some(([pu, pv]) => u >= pu - 2 && u < pu + 6 && v >= pv - 2 && v < pv + 6)) return true;
    if (Math.hypot(u - MAST.u, v - MAST.v) < 4 || Math.hypot(u - TREE.u, v - TREE.v) < 4 || Math.hypot(u - FIRE.u, v - FIRE.v) < 5 || Math.hypot(u - BALLOON.u, v - BALLOON.v) < 4 || Math.hypot(u - BARREL.u, v - BARREL.v) < 3 || Math.hypot(u - MAILB.u, v - MAILB.v) < 3) return true;
    if (SLOTS.some(([su, sv]) => Math.hypot(u - su, v - sv) < 3)) return true;
    return false;
  }

  // ---------- 屋里（剖面） ----------
  function buildRoom() {
    const a = ART(), e = E(), lit = night() || phase() === 'dusk', se = season(), R = a.rng(91);
    const key = [JSON.stringify(e.room), lit ? 1 : 0, se, dirtyK].join('|');
    if (roomCache && roomCache.key === key) return roomCache;
    const P = new a.Pix(IW, IH), cols = [], bills = [], occl = [];
    const room = e.room || {};
    // 地板：人字拼木地板，前沿露出地板的厚度（木梁 + 石头地基），下面没有岛
    for (let u = R0; u < R1; u++) for (let v = R0; v < R1; v++) {
      const front = u === R1 - 1 || v === R1 - 1;
      cols.push({ u, v, b: front ? -3 : 0, h: RH0,
        lf: (z) => (z === RH0 - 1 ? '#8a5a36' : z >= 0 ? '#6a4026' : z === -1 ? '#5a3a28' : H(u, z, 3) < 0.5 ? '#9890a8' : '#8a8298'),
        rf: (z) => (z >= 0 ? (z === RH0 - 1 ? '#6a4026' : '#4a2e1c') : '#6a6278'),
        top: (i, r) => { const s = ((u >> 1) + (v >> 1)) % 2; return (i === 0 && r === 0) ? '#7a4e30' : s ? (i % 2 ? '#c09060' : '#b08050') : (r ? '#d0a068' : '#bc8c58'); } });
    }
    // 墙纸：竖条小花，下半截是木护墙板，顶上一道深色木梁
    const wallTex = (t, z, i, side) => {
      const zz = z - RH0;
      if (zz < 0) return '#6a4026';
      if (zz >= WALLH - RH0 - 2) return zz === WALLH - RH0 - 1 ? '#6a4430' : '#4a3022';
      if (zz < 12) return zz === 11 ? '#c8935e' : zz === 0 ? '#5a3a28' : (t * 2 + i) % 6 === 0 ? '#7a4e30' : side ? '#8a5a3a' : '#9a6a42';
      if (!side && t >= 24 && t <= 26 && zz >= 30 && zz <= 36) { const cc = (t - 25) * 2 + i - 0.5, cz = zz - 33, r = Math.hypot(cc, cz * 0.9); if (r < 3.4) return r > 2.5 ? '#6a4430' : (Math.abs(cc) < 0.6 && cz >= 0) || (cz === 0 && cc > 0) ? '#3a2630' : '#fff8e8'; }
      let c = (t * 2 + i) % 8 < 4 ? '#f4e2c4' : '#ecd6b2';
      if ((t * 2 + i) % 8 === 2 && zz % 7 === 3) c = '#e89a8a'; else if ((t * 2 + i) % 8 === 6 && zz % 7 === 0) c = '#8ac0a0';
      return side ? mix(c, '#3a2a40', 0.14) : c;
    };
    const winAt = (t, z) => RWIN.find((w) => t >= w.t0 && t <= w.t1 && z >= RWZ0 && z <= RWZ1);
    const holes = [];
    const winTex = (t, z, i) => {
      const w = winAt(t, z); if (!w) return null;
      if (t === w.t0 || t === w.t1 || z === RWZ0 || z === RWZ1 || (t === Math.round((w.t0 + w.t1) / 2) && i === 0) || z === Math.round((RWZ0 + RWZ1) / 2)) return '#6a4430';
      if (t === w.t0 + 1 || t === w.t1 - 1) return z > RWZ0 + 4 ? (z % 3 ? '#e8705a' : '#c8504a') : null; // 窗帘
      return 'HOLE';
    };
    // 右后墙（沿 u，v = R0-2..R0-1，lf 朝里）
    for (let u = R0; u < R1; u++) for (let v = R0 - 2; v < R0; v++) cols.push({ u, v, h: WALLH, lf: (z, i) => { if (v !== R0 - 1) return winAt(u - R0, z) ? null : '#c8b48c'; const t = u - R0, w = winTex(t, z, i); if (w === 'HOLE') { holes.push([u, z, i]); return null; } return w || wallTex(t, z, i, 0); }, rf: (z) => (winAt(u - R0, z) ? null : '#b8a47c'), top: (i) => (i % 2 ? '#6a4430' : '#8a5a3a') });
    // 左后墙（沿 v，u = R0-2..R0-1，rf 朝里）
    for (let v = R0; v < R1; v++) for (let u = R0 - 2; u < R0; u++) cols.push({ u, v, h: WALLH, lf: () => '#a89470', rf: (z, i) => (u === R0 - 1 ? wallTex(v - R0, z, i, 1) : '#a89470'), top: (i) => (i % 2 ? '#6a4430' : '#8a5a3a') });
    for (const [u, v] of [[R0 - 2, R0 - 2], [R0 - 1, R0 - 1], [R0 - 2, R0 - 1], [R0 - 1, R0 - 2]]) cols.push({ u, v, h: WALLH, lf: () => '#c8b48c', rf: () => '#b8a47c', top: () => '#6a4430' });
    // 壁炉（左后墙）：石头砌的，壁炉台上摆着东西
    const box = (u0, v0, du, dv, hh, f, b = RH0) => { const out = []; for (let u = u0; u < u0 + du; u++) for (let v = v0; v < v0 + dv; v++) out.push(Object.assign({ u, v, b, h: b + hh }, f(u, v))); return out; };
    const FV0 = 16, FV1 = 26, fire = box(R0, FV0, 4, FV1 - FV0, 26, (u, v) => ({
      lf: (z) => (v === FV1 - 1 ? (H(u + z, v, 4) < 0.5 ? '#a8a0b4' : '#9890a8') : '#8a8298'),
      rf: (z, i) => { const zz = z - RH0; if (u !== R0 + 3) return '#7a7290'; if (zz >= 2 && zz < 12 && v >= FV0 + 2 && v <= FV1 - 3) return zz < 4 ? (lit || cooking ? '#ffb040' : '#e8703a') : zz < 8 ? (H(v + i, zz) < 0.5 ? '#f0903a' : '#3a2a2a') : '#2a2026'; if (zz === 12 || zz === 13) return '#6a4430'; if (zz === 25) return '#5a5266'; return (H(v * 2 + i, zz >> 1) < 0.5 ? '#b0a8bc' : '#9c94aa'); },
      top: () => '#8a8298' }));
    cols.push(...fire); occl.push({ cols: fire, bills: [] });
    bills.push({ u: R0 + 2, v: FV0 + 2, spr: candle(a), z: RH0 + 14 }, { u: R0 + 2, v: FV1 - 3, spr: potSpr(a), z: RH0 + 14 });
    // 固定的：碗柜、猫窝、盆栽、落地灯
    const cup = box(R0, 34, 3, 8, 34, (u, v) => ({ lf: (z, i) => { const zz = z - RH0; if (v !== 41) return '#6a4026'; if (zz % 11 === 0 || u === R0) return '#5a3420'; if (zz > 22) return ['#f4f0e8', '#a8d0f0', '#f4f0e8', '#f2c4c4'][(u * 2 + i + zz) % 4]; return zz > 11 ? ((u * 2 + i) % 3 === 0 ? '#ffd36a' : '#8a5a3a') : '#7a4a2e'; }, rf: (z) => (u === R0 + 2 ? '#5a3420' : '#4a2a18'), top: () => '#8a5a3a' }));
    cols.push(...cup); occl.push({ cols: cup, bills: [] });
    const chair = box(R0 + 9, 27, 4, 4, 9, (u, v) => ({ lf: (z) => { const zz = z - RH0; if (zz < 2) return '#5a3a28'; return v === 30 ? (zz > 6 ? '#7aa07a' : '#5a8a6a') : '#4a7a5a'; }, rf: (z) => (z - RH0 < 2 ? '#3a2418' : '#3a6a4a'), top: (i, r) => (u === R0 + 9 ? '#8ab88a' : (i + r) % 2 ? '#7aa07a' : '#86ac86') })).concat(box(R0 + 9, 27, 1, 4, 15, () => ({ lf: () => '#5a8a6a', rf: () => '#3a6a4a', top: () => '#8ab88a' })));
    cols.push(...chair); occl.push({ cols: chair, bills: [] });
    bills.push({ u: R0 + 2, v: 48, spr: leafy(a, 14), dy: 0 }, { u: 48, v: R0 + 2, spr: leafy(a, 12) }, { u: 22, v: R0 + 1, spr: floorLamp(a, lit) });
    // 家具
    const spots = {};
    const add = (k, list, u, v, occ = true) => { cols.push(...list); if (occ) occl.push({ cols: list, bills: [] }); spots[k] = { u, v }; };
    if (room.bed === 'bed') add('bed', box(36, R0, 12, 8, 7, (u, v) => ({ lf: (z) => (z - RH0 < 3 ? '#7a4e30' : v === R0 + 7 ? (u > 39 ? ['#e8705a', '#7aa07a', '#ffd36a', '#a8c8f0'][Math.floor((u - 40) / 2) % 4] : '#ffffff') : '#e8e0c8'), rf: (z) => (z - RH0 < 3 ? '#5a3a28' : '#d8d0b8'), top: (i, r) => (u < 40 ? (r ? '#ffffff' : '#f0ece4') : ['#e8705a', '#7aa07a', '#ffd36a', '#a8c8f0'][(Math.floor((u - 40) / 2) + Math.floor((v - R0) / 2)) % 4]) })).concat(box(36, R0, 1, 8, 15, () => ({ lf: () => '#7a4e30', rf: () => '#5a3a28', top: () => '#a8784a' }))), 42, 17);
    if (room.rug === 'rug') { const rug = []; for (let u = 18; u < 36; u++) for (let v = 24; v < 40; v++) { const d = ((u - 27) / 9) ** 2 + ((v - 32) / 8) ** 2; if (d > 1) continue; rug.push({ u, v, h: RH0, lf: () => null, rf: () => null, top: () => (d > 0.78 ? '#5a8a8a' : d > 0.5 ? '#a8d0c8' : d > 0.22 ? '#f0e8d0' : '#e8a090') }); } add('rug', rug, 27, 32, false); }
    const shelf = (u0, v0) => box(u0, v0, 7, 2, 32, (u, v) => ({ lf: (z, i) => { const zz = z - RH0; if (v !== v0 + 1) return '#3a5a3a'; if (zz % 8 === 0 || u === u0 || u === u0 + 6) return '#5a7a5a'; return ['#e8705a', '#5a8ad8', '#ffd36a', '#7cbc62', '#b08af0'][(u * 2 + i + (zz >> 3)) % 5]; }, rf: () => '#3a5a3a', top: () => '#7a9a7a' }));
    const table = (u0, v0) => box(u0, v0, 6, 5, 10, (u, v) => ({ lf: (z) => (z - RH0 >= 8 ? '#a8784a' : (u === u0 || u === u0 + 5) ? '#8a5a3a' : null), rf: (z) => (z - RH0 >= 8 ? '#8a5a3a' : (v === v0 || v === v0 + 4) ? '#6a4026' : null), top: (i) => ((u === u0 + 2 && v === v0 + 2) ? '#f4ead8' : (u + v + i) % 7 === 0 ? '#e8705a' : '#c8935e') }));
    const piano = (u0, v0) => box(u0, v0, 9, 3, 18, (u, v) => ({ lf: (z, i) => { const zz = z - RH0; if (v !== v0 + 2) return '#4a2a20'; if (zz >= 9 && zz < 11) return (u * 2 + i) % 3 === 0 ? '#2a2a3a' : '#f8f4ec'; return zz > 15 ? '#7a4a38' : '#5a3428'; }, rf: () => '#3a2018', top: () => '#7a4a38' }));
    const plant = (u0, v0) => box(u0, v0, 2, 2, 6, () => ({ lf: () => '#c8705a', rf: () => '#a85a48', top: () => '#4a3020' }));
    const MAKE = { table, shelf, piano, plant };
    if (room.c1 && MAKE[room.c1]) add('c1', MAKE[room.c1](14, 30), 16, 33);
    if (room.c1 === 'lamp') spots.c1 = { u: 16, v: 32 };
    if (room.c2 && MAKE[room.c2]) add('c2', MAKE[room.c2](48, R0), 50, R0 + 3);
    if (room.c3 === 'piano') add('c3', piano(23, R0), 27, R0 + 4);
    if (room.c3 === 'rocker') spots.c3 = { u: 42, v: 42 };
    if (room.c1 === 'lamp') bills.push({ u: 16, v: 32, spr: lampSpr(a, lit) });
    if (room.c2 === 'plant') bills.push({ u: 49, v: R0 + 1, spr: leafy(a, 12), dy: -6 });
    if (room.c3 === 'rocker') { const b = { u: 42, v: 42, spr: rockerSpr(a) }; bills.push(b); occl.push({ cols: [], bills: [b] }); }
    // 出口：前沿的门框（门开着）+ 门垫
    const ex = RDOOR.u, exv = R1 - 1;
    const dk = () => ({ lf: () => '#6a4430', rf: () => '#4a2e1c', top: () => '#8a5a3a' });
    const frame = box(ex - 1, exv, 1, 1, 26, dk).concat(box(ex + 3, exv, 1, 1, 26, dk), box(ex - 1, exv, 5, 1, 3, dk, RH0 + 24));
    cols.push(...frame); occl.push({ cols: frame, bills: [] });
    for (let u = ex; u < ex + 3; u++) for (let v = exv - 3; v < exv; v++) cols.push({ u, v, h: RH0, b: RH0 - 1, lf: () => null, rf: () => null, top: (i) => ((u + v + i) % 3 === 0 ? '#c8604a' : '#e07a5a') });
    vox(P, cols, bills);
    // 挂画（左后墙）
    if (room.wall === 'painting') { const pv = 32, pz = RH0 + 30; for (let t = 0; t < 9; t++) for (let z = 0; z < 11; z++) { const x = OX + 2 * ((R0 - 1) - (pv + t)) + 2, y = OY + (R0 - 1) + pv + t - pz - z; const edge = t === 0 || t === 8 || z === 0 || z === 10; P.set(x, y, edge ? '#c8935e' : z < 4 ? '#7cbc62' : z < 6 ? '#a8d8f6' : '#cfeafa'); P.set(x + 1, y, edge ? '#8a5a3a' : z < 4 ? '#6aaa54' : '#a8d8f6'); } spots.wall = { u: R0, v: 36 }; }
    // 地板上的影子：家具往右下拖一点暗
    PP.gradePix && PP.gradePix(P.d);
    // 窗洞（透明，后面画窗外的景色）
    const hole = new a.Pix(IW, IH); for (const [u, z, i] of holes) hole.set(OX + 2 * (u - (R0 - 1)) + i, OY + u + R0 - 1 - z, '#ffffff');
    let wx0 = IW, wy0 = IH, wx1 = 0, wy1 = 0; for (const [u, z, i] of holes) { const x = OX + 2 * (u - (R0 - 1)) + i, y = OY + u + R0 - 1 - z; wx0 = Math.min(wx0, x); wx1 = Math.max(wx1, x); wy0 = Math.min(wy0, y); wy1 = Math.max(wy1, y); }
    // 两个窗台上照进来的光斑（白天）
    const mask = new Uint8Array(IW * IH); for (let i = 0; i < P.d.length; i++) mask[i] = P.d[i] >>> 24 ? 1 : 0;
    roomCache = { key, mask, cv: P.canvas(), hole: hole.canvas(), win: [wx0, wy0, wx1 + 1, wy1 + 1], occ: occl.map((o) => occluder(o.cols, o.bills)).filter(Boolean), spots, stove: { u: R0 + 6, v: 21 }, exit: { u: ex + 1.5, v: exv - 1 }, lamp: room.c1 === 'lamp' ? spots.c1 : null, fireXY: [cx(R0 + 3, 21), cy(R0 + 3, 21, RH0 + 6)] };
    return roomCache;
  }
  function candle(a) { const s = a.spr(3, 6); s.rect(1, 2, 2, 4, '#f4ead6'); s.set(1, 1, '#ffd36a'); s.set(2, 0, '#ffb040'); return s; }
  function potSpr(a) { const s = a.spr(6, 6); s.ell(3.5, 3.5, 2.5, 2.5, (nx) => (nx < -0.3 ? '#86cc6a' : '#4a8a3e')); s.rect(2, 4, 4, 3, '#c8705a'); return s.outline('#3a2630'); }
  function floorLamp(a, lit) { const s = a.spr(8, 26); s.rect(3, 22, 4, 2, '#5a5466'); s.vl(4, 7, 16, '#5a5466'); s.rect(1, 1, 8, 6, lit ? '#ffe9a8' : '#f2c88a'); s.hl(1, 1, 8, '#fff2c8'); s.hl(1, 6, 8, '#c8935e'); return s.outline('#3a2630'); }
  function lampSpr(a, lit) { const l = a.spr(7, 16); l.rect(2, 13, 4, 3, '#8a5a3a'); l.vl(4, 6, 7, '#5a5466'); l.rect(1, 1, 7, 5, lit ? '#ffe9a8' : '#f6d27a'); l.hl(1, 1, 7, '#fff2c8'); return l.outline('#3a2630'); }
  function leafy(a, n = 12) { const p = a.spr(n, n + 2); p.ell(n / 2 + 0.5, n / 2 + 1, n / 2 - 0.5, n / 2 + 0.5, (nx, ny) => (ny < -0.4 || nx < -0.5 ? '#86cc6a' : ny > 0.4 ? '#3f8a44' : '#5aa64e')); p.rect(n / 2 - 2, n - 1, 5, 4, '#c8705a'); p.hl(n / 2 - 2, n - 1, 5, '#e08a6a'); return p.outline('#2a3a2a'); }
  function rockerSpr(a) { const r = a.spr(16, 16); r.rect(3, 1, 3, 10, '#a8784a'); r.rect(3, 8, 10, 3, '#c8935e'); r.vl(4, 1, 9, '#d8a868'); r.rect(11, 6, 2, 6, '#8a5a3a'); for (let x = 1; x < 16; x++) r.set(x, 14 - Math.round(Math.abs(x - 8) / 4), '#7a4e30'); r.vl(4, 11, 3, '#8a5a3a'); r.vl(12, 11, 3, '#8a5a3a'); return r.outline('#3a2630'); }

  // ---------- 位置、大小 ----------
  const scaleOf = () => { const z = U.clamp(+(G.save && S().isleSize) || 2, 1, 3); let u = z; while (u > 1 && (IH * u > safeB() - 10 || IW * u > G.W - 10)) u--; return u; };
  // 能看见的最下面（避开任务栏）：窗口本来就是工作区；保险起见再用屏幕的可用区域算一次
  function safeB() { let b = G.H - (document.body.classList.contains('web') ? 44 : 0); try { const sc = window.screen; if (sc && sc.availHeight) { const v = (sc.availTop || 0) + sc.availHeight - (window.screenY || 0); if (v > 200 && v < b) b = v; } } catch (e) {} return b; }
  PP.safeB = safeB;
  function layout() {
    const u = scaleOf(), w = IW * u, h = IH * u, pos = G.save && S().islePos, sb = safeB();
    let x1 = pos ? pos.x * G.W : G.W - 8, y1 = pos ? pos.y * sb : sb - 2;
    x1 = U.clamp(x1, w + 2, G.W - 2); y1 = U.clamp(y1, h + 2, sb - 2);
    L = { u, x0: Math.round(x1 - w), y0: Math.round(y1 - h), x1: Math.round(x1), y1: Math.round(y1) };
    return L;
  }
  const sx = (x) => L.x0 + x * L.u, sy = (y) => L.y0 + y * L.u;
  const scrU = (u, v) => sx(cx(u, v)), scrV = (u, v, z = HG) => sy(cy(u, v, z));
  function toUV(x, y, z) { const X = (x - L.x0) / L.u - OX - 2, Y = (y - L.y0) / L.u - OY + z; return [(Y + X / 2) / 2, (Y - X / 2) / 2]; }
  const D0 = 18, D1 = 88, RD0 = R0 * 2 + 4, RD1 = R1 * 2 - 6;
  function blocked(u, v) {
    if (inside) {
      if (u < R0 + 1 || v < R0 + 1 || u > R1 - 1.5 || v > R1 - 1.5) return true;
      if (u < R0 + 5 && v >= FV0r() - 1 && v <= 26) return true;
      if (u < R0 + 4 && v >= 33 && v <= 42) return true;
      if (u >= R0 + 8.5 && u <= R0 + 13.5 && v >= 26.5 && v <= 31.5) return true;
      const r = E().room;
      if (r.bed === 'bed' && u >= 35 && u <= 48 && v <= R0 + 8.5) return true;
      if (r.c3 === 'piano' && u >= 22 && u <= 32 && v <= R0 + 3.5) return true;
      if ((r.c1 === 'table' || r.c1 === 'shelf') && u >= 13 && u <= 20 && v >= 29 && v <= 35) return true;
      return false;
    }
    if (!inDeck(u, v) || !inDeck(u + 1.2, v + 1.2) || !inDeck(u - 1.2, v - 1.2)) return !(u >= PLANK.u0 - 0.5 && u <= PLANK.u1 + 1 && v >= PLANK.v0 && v < 12);
    if (u >= COT.u0 - 0.5 && u <= UP.u1 + 1 && v >= COT.v0 - 0.5 && v <= COT.v1 + 0.6) return true;
    if (Math.hypot(u - TOWER.u, v - TOWER.v) < TOWER.r + 1.4) return true;
    if (u >= GREEN.u0 - 0.5 && u <= GREEN.u1 + 1 && v >= GREEN.v0 - 0.5 && v <= GREEN.v1 + 0.8) return true;
    if (u >= SHED.u0 - 0.5 && u <= SHED.u1 + 1 && v >= SHED.v0 - 0.5 && v <= SHED.v1 + 0.6) return true;
    if (PLOTS.some(([pu, pv]) => u >= pu - 1 && u < pu + 4.6 && v >= pv - 1 && v < pv + 4.6)) return true;
    if (Math.hypot(u - MAST.u, v - MAST.v) < 2 || Math.hypot(u - TREE.u, v - TREE.v) < 2.5 || Math.hypot(u - FIRE.u, v - FIRE.v) < 2.2 || Math.hypot(u - BARREL.u, v - BARREL.v) < 1.6) return true;
    return false;
  }
  const FV0r = () => 16;
  function floorY(p) {
    if (!L) layout();
    const z = inside ? RH0 : HG;
    if (p.isleSpot) return Math.round(sy(cy(p.isleSpot.u, p.isleSpot.v, p.isleSpot.z != null ? p.isleSpot.z : z)));
    const d0 = inside ? RD0 : D0, d1 = inside ? RD1 : D1;
    const want = d0 + U.clamp(p.lane != null ? p.lane : 0.4, 0, 1) * (d1 - d0);
    const X = (p.x - L.x0) / L.u - OX - 2, du = X / 2;
    for (let k = 0; k < 70; k++) for (const sgn of k ? [1, -1] : [1]) {
      const d = want + sgn * k; if (d < d0 - 8 || d > d1 + 8) continue;
      const u = (d + du) / 2, v = (d - du) / 2;
      if (!blocked(u, v)) return Math.round(sy(OY + d - z));
    }
    return Math.round(sy(OY + want - z));
  }
  function groundY() { if (!L) layout(); return Math.round(sy(OY + (inside ? (RD0 + RD1) / 2 : (D0 + D1) / 2) - (inside ? RH0 : HG))); }
  function zone() { if (!L) layout(); return inside ? [sx(cx(R0 + 2, R1 - 3)), sx(cx(R1 - 3, R0 + 2))] : [sx(cx(5, 40)), sx(cx(52, 14))]; }
  function sync() {
    const w = want();
    if (w && !G.isle) { G.isle = {}; inside = false; layout(); fit(true); }
    else if (!w && G.isle) { G.isle = null; inside = false; for (const p of G.all) { p.isleSpot = null; p.lane = null; p.fishing = null; } window.dispatchEvent(new Event('resize')); }
  }
  function fit(moveIn) {
    layout(); G.ground = groundY();
    const [a, b] = zone();
    for (const p of G.pets) {
      if (moveIn || p.x < a || p.x > b) { p.interrupt(true); p.x = U.clamp(moveIn ? scrU(DOOR.u + 3, COT.v1 + 4) : p.x, a, b); }
      if (moveIn) { p.lane = (DOOR.u + 3 + COT.v1 + 4 - D0) / (D1 - D0); p.isleSpot = null; }
      if (!p.held) { p.y = p.floor; p.airborne = false; }
    }
    PP.placeOrb && PP.placeOrb();
  }
  window.addEventListener('resize', () => { if (G.isle) setTimeout(() => fit(false), 0); });
  function setSize(z) { S().isleSize = z; PP.save.soon(); cache = null; fit(false); PP.ui.toast(`小岛：${['', '小', '中', '大'][z]}${scaleOf() < z ? '（屏幕放不下，先用小一号）' : ''}`); }
  function resetPos() { S().islePos = null; PP.save.soon(); fit(false); }

  // ---------- 菜（大一点、看得清：四个生长阶段） ----------
  const cropCache = {};
  const CROP_COL = { carrot: ['#f08a3a', '#ffb070'], berry: ['#e8405a', '#ff8a9a'], corn: ['#ffd36a', '#fff0a0'], sunflower: ['#f6c43a', '#ffe27a'], pumpkin: ['#f2832a', '#ffa850'], tomato: ['#e0402a', '#ff7a5a'], cabbage: ['#9ad070', '#c8ec9a'], melon: ['#3f8a44', '#7cbc62'], tulip: ['#f2a6c2', '#ffd0e0'] };
  function cropSpr(crop, stage) {
    const key = crop + stage; if (cropCache[key]) return cropCache[key];
    const a = ART(), s = a.spr(13, 22), L1 = '#5aa64e', L2 = '#86cc6a', L0 = '#3f8a44', [C, C2] = CROP_COL[crop] || CROP_COL.carrot;
    const B = 21;
    s.ell(7, B, 5, 1.6, (nx, ny) => (ny < 0 ? '#7a4a2a' : '#5a3420')); // 小土堆
    if (stage === 0) { s.set(5, B - 2, '#3a2410'); s.set(8, B - 2, '#3a2410'); s.vl(7, B - 4, 3, L1); s.set(6, B - 5, L2); s.set(8, B - 5, L2); }
    else if (stage === 1) { s.vl(7, B - 8, 7, L1); for (const [x, y] of [[5, B - 6], [4, B - 7], [9, B - 6], [10, B - 7], [6, B - 9], [8, B - 9]]) s.set(x, y, L2); s.set(5, B - 4, L0); s.set(9, B - 4, L0); }
    else {
      const big = stage === 3;
      if (crop === 'corn' || crop === 'sunflower') {
        const h = big ? 20 : 13; s.vl(7, B - h, h, L0); s.vl(6, B - h + 2, h - 3, L1);
        for (let y = B - h + 3; y < B - 1; y += 3) { s.set(5, y, L1); s.set(4, y + 1, L2); s.set(3, y + 2, L2); s.set(8, y + 1, L1); s.set(9, y + 2, L2); s.set(10, y + 3, L2); }
        if (big && crop === 'corn') { s.rect(8, B - 13, 3, 7, C); s.vl(8, B - 13, 6, C2); s.vl(11, B - 12, 4, L2); s.set(9, B - 14, '#c8a050'); }
        if (big && crop === 'sunflower') s.ell(7, B - h + 1, 4.2, 3.6, (nx, ny) => (nx * nx + ny * ny < 0.25 ? '#7a4a2a' : ny < -0.3 ? C2 : C));
      } else if (crop === 'tulip') {
        for (const x of [3, 7, 11]) { const h = big ? 11 + (x % 4) : 8; s.vl(x, B - h, h, L0); s.set(x - 1, B - 4, L2); if (big) { s.rect(x - 1, B - h - 3, 3, 3, C); s.set(x, B - h - 4, C2); s.set(x - 1, B - h - 3, C2); } }
      } else {
        const w = big ? 5.5 : 4, h = big ? 4.5 : 3.5;
        s.ell(7, B - 5, w, h, (nx, ny) => (ny < -0.3 ? L2 : ny > 0.4 ? L0 : (nx > 0.4 ? L0 : L1)));
        for (const x of [4, 7, 10]) s.vl(x, B - 11 + (x === 7 ? -1 : 1), 3, L1);
        if (big && crop === 'carrot') { for (const x of [4, 8]) { s.rect(x, B - 3, 3, 3, C); s.set(x, B - 3, C2); } }
        if (big && crop === 'berry') for (const [x, y] of [[3, B - 5], [10, B - 6], [6, B - 2], [9, B - 3], [5, B - 8]]) { s.set(x, y, C); s.set(x + 1, y, C); s.set(x, y - 1, C2); }
        if (big && crop === 'tomato') for (const [x, y] of [[3, B - 6], [9, B - 7], [6, B - 3]]) s.ell(x + 1, y, 1.6, 1.6, (nx, ny) => (nx < -0.3 && ny < 0 ? C2 : C));
        if (big && crop === 'pumpkin') s.ell(7, B - 3, 5.5, 3.6, (nx, ny) => (Math.abs(nx) < 0.12 || Math.abs(Math.abs(nx) - 0.55) < 0.1 ? '#c9601a' : ny < -0.4 ? C2 : C));
        if (big && crop === 'cabbage') s.ell(7, B - 4, 5.2, 4, (nx, ny) => (nx * nx + ny * ny < 0.3 ? C2 : ny < -0.2 ? C : '#7ab85a'));
        if (big && crop === 'melon') s.ell(7, B - 3, 5.8, 3.6, (nx, ny) => (Math.floor((nx + 1) * 4) % 2 ? '#2c6a34' : ny < -0.4 ? C2 : C));
      }
    }
    return (cropCache[key] = s.outline('#2a3a22').canvas());
  }
  PP.cropSpr = cropSpr;

  // ---------- 天色、天气 ----------
  // 整体光照：白天不改；黄昏偏橙、夜里偏蓝暗、阴雨天灰一点（画在岛的形状上，不染到透明处）
  function tint() {
    const ph = phase(), fx = wfx();
    let col = null, k = 0;
    if (ph === 'night') { col = '#1a2050'; k = 0.42; } else if (ph === 'dusk') { col = '#e0603a'; k = 0.2; } else if (ph === 'dawn') { col = '#f0a0a8'; k = 0.14; }
    if (fx.dark) { const g = '#4a5068'; col = col ? col : g; k = Math.max(k, fx.dark * 1.2); }
    if (inside && col) { if (ph === 'night') { col = '#3a2040'; k = 0.24; } else k *= 0.5; }
    return col ? [col, Math.min(0.55, k)] : null;
  }
  let tintCv = null, tintKey = '';
  function tinted(cv, key) {
    const t = tint(); if (!t) return cv;
    const k2 = key + '|' + t.join(','); if (tintKey === k2 && tintCv) return tintCv;
    tintCv = document.createElement('canvas'); tintCv.width = cv.width; tintCv.height = cv.height;
    const c = tintCv.getContext('2d'); c.drawImage(cv, 0, 0); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = t[1]; c.fillStyle = t[0]; c.fillRect(0, 0, cv.width, cv.height);
    tintKey = k2; return tintCv;
  }
  function skyCols() {
    const ph = phase(), fx = wfx();
    let top = '#7ab8e8', bot = '#cfeafa';
    if (ph === 'night') { top = '#141a3a'; bot = '#2a3460'; } else if (ph === 'dusk') { top = '#6a5a9a'; bot = '#f0a070'; } else if (ph === 'dawn') { top = '#8aa8d8'; bot = '#f8c8b8'; }
    if (fx.cloud > 0.6 || fx.rain || fx.snow) { const g = ph === 'night' ? '#2a2e40' : '#9aa2b4'; top = mix(top, g, 0.6); bot = mix(bot, g, 0.5); }
    if (fx.fog) { top = mix(top, '#d8dce4', 0.6); bot = mix(bot, '#e8eaf0', 0.7); }
    return [top, bot];
  }
  // 雨 / 雪：在岛的范围里落（打在甲板上会溅一下）
  function weatherTick(ctx, area) {
    const fx = wfx(), u = L.u, n = Math.round((fx.rain * 90 + fx.snow * 60) * (area.w * area.h) / (480 * 420));
    const wind = (fx.wind || 0) * 18;
    while (drops.length < n) drops.push({ x: area.x + Math.random() * (area.w + 60) - 30, y: area.y + Math.random() * area.h * 0.3, snow: fx.snow > 0 && (fx.rain === 0 || Math.random() < 0.5), v: 0.6 + Math.random() * 0.6 });
    if (drops.length > n) drops.length = n;
    const dt = 1 / 60;
    for (const d of drops) {
      if (d.snow) { d.y += 40 * d.v * dt * u; d.x += (Math.sin(d.y * 0.05 + d.v * 9) * 12 + wind) * dt * u; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(Math.round(d.x), Math.round(d.y), u, u); }
      else { d.y += 300 * d.v * dt * u; d.x += wind * 3 * dt * u; ctx.fillStyle = 'rgba(200,220,255,.55)'; ctx.fillRect(Math.round(d.x), Math.round(d.y), Math.max(1, u / 2), 4 * u); }
      if (d.y > area.y + area.h || (inside === false && hitDeck(d) && Math.random() < 0.08)) {
        if (!d.snow && d.y < area.y + area.h) { ctx.fillStyle = 'rgba(220,235,255,.7)'; ctx.fillRect(Math.round(d.x) - u, Math.round(d.y), u, u); ctx.fillRect(Math.round(d.x) + u, Math.round(d.y), u, u); }
        d.x = area.x + Math.random() * (area.w + 60) - 30; d.y = area.y - Math.random() * 30;
      }
    }
    if (fx.storm) { if (flash <= 0 && Math.random() < 0.003) flash = 0.25; }
    if (flash > 0) { flash -= dt; ctx.fillStyle = `rgba(255,255,240,${(flash * 1.6).toFixed(2)})`; ctx.fillRect(area.x, area.y, area.w, area.h); }
  }
  function hitDeck(d) { const lx = Math.floor((d.x - L.x0) / L.u), ly = Math.floor((d.y - L.y0) / L.u); const c = cache; return c && lx >= 0 && ly >= 0 && lx < IW && ly < IH && c.mask[ly * IW + lx]; }

  // ---------- 画 ----------
  function glow(ctx, x, y, r, col = 'rgba(255,214,140,', a = 0.45) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col + a + ')'); g.addColorStop(1, col + '0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const fishSpr = (() => { let c = null; return () => { if (c) return c; const a = ART(), s = a.spr(11, 7); s.ell(5, 3.5, 4.5, 2.6, (nx, ny) => (ny < -0.3 ? '#cfeafa' : ny > 0.4 ? '#7a9ad8' : '#a8c8f8')); s.set(2, 3, '#2a2026'); s.rect(9, 1, 2, 5, '#f2a6c2'); s.set(5, 0, '#f2a6c2'); s.set(5, 6, '#f2a6c2'); return (c = s.outline('#3a3a6a').canvas()); }; })();
  function renderBack(ctx0) {
    let ctx = ctx0;
    if (!G.isle) return;
    if (!L) layout();
    const u = L.u, nt = night(), now = performance.now(), fx = wfx(), wind = fx.wind || 0;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (inside) {
      const r = buildRoom();
      // 窗外：此刻外面的天色、云、天气，远处是自家的帆和栏杆上的花
      const [wx0, wy0, wx1, wy1] = r.win, W = (wx1 - wx0) * u, Hh = (wy1 - wy0) * u;
      if (!viewCv || viewCv.width !== W || viewCv.height !== Hh) { viewCv = document.createElement('canvas'); viewCv.width = W; viewCv.height = Hh; }
      const real = ctx; ctx = viewCv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, Hh);
      const X0 = 0, Y0 = 0;
      const [top, bot] = skyCols(), g = ctx.createLinearGradient(0, Y0, 0, Y0 + Hh); g.addColorStop(0, top); g.addColorStop(1, bot);
      ctx.fillStyle = g; ctx.fillRect(X0, Y0, W, Hh);
      if (nt) { ctx.fillStyle = '#fff6d0'; for (let i = 0; i < 14; i++) { if (Math.sin(now / 700 + i * 3) > -0.3) ctx.fillRect(X0 + ((i * 53) % W), Y0 + ((i * 29) % (Hh * 0.6)), u, u); } ctx.fillStyle = '#fff2c8'; ctx.fillRect(X0 + W * 0.78, Y0 + Hh * 0.15, 4 * u, 4 * u); }
      else if (phase() === 'day' && fx.cloud < 0.5 && !fx.rain) { ctx.fillStyle = '#fff4c0'; ctx.fillRect(X0 + W * 0.15, Y0 + Hh * 0.12, 5 * u, 5 * u); }
      const drift = (now / 140) % (W + 60);
      ctx.fillStyle = fx.cloud > 0.6 ? 'rgba(220,224,236,.9)' : 'rgba(255,255,255,.9)';
      for (let i = 0; i < 3 + Math.round(fx.cloud * 4); i++) { const x = X0 + ((drift * (0.6 + i * 0.15) + i * 97) % (W + 60)) - 30, y = Y0 + Hh * (0.25 + (i % 3) * 0.18); ctx.fillRect(x, y, 22 * u, 4 * u); ctx.fillRect(x + 5 * u, y - 3 * u, 12 * u, 3 * u); }
      ctx.fillStyle = mix('#ffffff', bot, 0.3); ctx.fillRect(X0, Y0 + Hh - 6 * u, W, 6 * u); // 云海
      ctx.fillStyle = '#7a4e30'; ctx.fillRect(X0, Y0 + Hh - 9 * u, W, u); for (let x = 0; x < W; x += 6 * u) ctx.fillRect(X0 + x, Y0 + Hh - 9 * u, u, 9 * u); // 栏杆
      ctx.fillStyle = season() === 'winter' ? '#ffffff' : '#5aa64e'; for (let x = 0; x < W; x += 3 * u) if (Math.sin(x * 0.7) > 0) ctx.fillRect(X0 + x, Y0 + Hh - 11 * u, 2 * u, 2 * u);
      // 远处的帆（在左边那扇窗里能看到一角）
      ctx.fillStyle = '#e8c8a8'; ctx.fillRect(X0 + W * 0.08, Y0 + Hh * 0.2, 10 * u, Hh * 0.45); ctx.fillStyle = '#8a5a3a'; ctx.fillRect(X0 + W * 0.08 + 4 * u, Y0, u * 2, Hh);
      // 窗外的雨雪
      if (fx.rain || fx.snow) { ctx.fillStyle = fx.snow ? 'rgba(255,255,255,.9)' : 'rgba(210,225,255,.7)'; for (let i = 0; i < 40; i++) { const x = X0 + ((i * 37 + now / (fx.snow ? 60 : 8) * (1 + (i % 3) * 0.2) + wind * now / 40) % W), y = Y0 + ((i * 23 + now / (fx.snow ? 30 : 3)) % Hh); ctx.fillRect(x, y, u, fx.snow ? u : 3 * u); } }
      if (fx.fog) { ctx.fillStyle = 'rgba(230,232,240,.45)'; ctx.fillRect(X0, Y0, W, Hh); }
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,240,${flash * 2})`; ctx.fillRect(X0, Y0, W, Hh); }
      if (fx.storm && flash <= 0 && Math.random() < 0.003) flash = 0.25; if (flash > 0) flash -= 1 / 60;
      ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(r.hole, wx0, wy0, wx1 - wx0, wy1 - wy0, 0, 0, W, Hh); ctx.globalCompositeOperation = 'source-over';
      ctx = real; ctx.drawImage(viewCv, sx(wx0), sy(wy0));
      // 屋子本身（窗洞是透明的）
      const cv = tinted(r.cv, r.key);
      ctx.drawImage(cv, L.x0, L.y0, IW * u, IH * u);
      // 窗外的光照进来：白天在地板上投两块斜斜的光斑；夜里屋里暖光
      if (!nt && !fx.rain && fx.cloud < 0.7) { ctx.fillStyle = `rgba(255,240,190,${phase() === 'day' ? 0.16 : 0.1})`; for (const w of RWIN) { ctx.beginPath(); const p = (uu, vv) => [scrU(uu, vv), scrV(uu, vv, RH0)]; const pts = [p(R0 + w.t0 + 2, R0 + 6), p(R0 + w.t1 + 3, R0 + 6), p(R0 + w.t1 + 9, R0 + 16), p(R0 + w.t0 + 8, R0 + 16)]; ctx.moveTo(...pts[0]); for (const q of pts.slice(1)) ctx.lineTo(...q); ctx.fill(); } }
      if (nt && r.lamp) glow(ctx, scrU(r.lamp.u, r.lamp.v), scrV(r.lamp.u, r.lamp.v, RH0 + 14), 34 * u);
      if (nt) glow(ctx, scrU(22, R0 + 1), scrV(22, R0 + 1, RH0 + 22), 40 * u, 'rgba(255,214,140,', 0.35);
      glow(ctx, sx(r.fireXY[0]), sy(r.fireXY[1]), (cooking ? 34 : nt ? 30 : 18) * u, 'rgba(255,170,90,', 0.4 + Math.sin(now / 130) * 0.05);
      if (cooking && Math.random() < 0.2) smoke.push({ x: cx(R0 + 2, 21) + U.rand(-2, 2), y: cy(R0 + 2, 21, RH0 + 26), t: 0 });
      // 出口提示：门框里一个上下跳的小箭头
      const ex = scrU(RDOOR.u + 1.5, R1 - 1), ey = scrV(RDOOR.u + 1.5, R1 - 1, RH0 + 28) + Math.sin(now / 260) * 2 * u;
      arrow(ctx, ex, ey, u, '#ffd36a');
    } else {
      const c = build();
      // 船底的浮空水晶：一上一下，发着光，掉下一点点亮晶晶
      const [kx, ky] = c.hull.low, hb = Math.sin(now / 900) * 2;
      glow(ctx, sx(kx), sy(ky + 12 + hb), 40 * u, 'rgba(160,220,255,', 0.4);
      crystal(ctx, sx(kx), sy(ky + 6 + hb), u, now);
      if (Math.random() < 0.08) smoke.push({ x: kx + U.rand(-4, 4), y: ky + 14 + hb, t: 0, spark: true });
      // 船尾的螺旋桨
      const [px, py] = c.prop, pa = now / (wind > 1 ? 70 : 140);
      ctx.fillStyle = '#5a5466'; ctx.fillRect(sx(px) - 3 * u, sy(py) - u, 4 * u, 2 * u);
      for (let k = 0; k < 3; k++) { const t = pa + k * 2.094, len = Math.cos(t) * 9 * u; ctx.fillStyle = Math.sin(t) > 0 ? '#c8935e' : '#8a5a3a'; ctx.fillRect(sx(px) - 4 * u, Math.min(sy(py), sy(py) + len), 2 * u, Math.abs(len)); }
      ctx.fillStyle = '#d8a868'; ctx.fillRect(sx(px) - 5 * u, sy(py) - u, 2 * u, 2 * u);
      // 甲板 + 房子（随时间 / 天气调光）
      ctx.drawImage(tinted(c.cv, c.key), L.x0, L.y0, IW * u, IH * u);
      const e = E();
      // 菜（按远近画）
      const plants = [];
      PLOTS.forEach(([pu, pv], i) => {
        const inf = PP.econ.plotInfo(i); if (!inf) return;
        for (const [du, dv] of [[1, 1], [3, 1], [1, 3], [3, 3]]) plants.push({ d: pu + du + pv + dv, u: pu + du, v: pv + dv, cv: cropSpr(inf.crop, inf.stage) });
        if (e.farm[i] && e.farm[i].water) { ctx.fillStyle = 'rgba(90,60,40,.35)'; for (const [du, dv] of [[1, 2], [2.5, 1.5], [2, 3]]) ctx.fillRect(scrU(pu + du, pv + dv) - 2 * u, scrV(pu + du, pv + dv), 4 * u, u); }
      });
      plants.sort((a, b) => a.d - b.d);
      const sway = Math.sin(now / 700) * (wind > 1 ? 1 : 0.4);
      for (const pl of plants) { const x = cx(pl.u, pl.v), y = cy(pl.u, pl.v, HG); ctx.drawImage(pl.cv, Math.round(sx(x - pl.cv.width / 2 + sway * 0.5)), Math.round(sy(y - pl.cv.height + 2)), pl.cv.width * u, pl.cv.height * u); }
      PLOTS.forEach(([pu, pv], i) => { const inf = PP.econ.plotInfo(i); if (inf && inf.stage === 3) { const x = scrU(pu + 2, pv + 2), y = scrV(pu + 2, pv + 2, HG + 26) + Math.sin(now / 300 + i) * 2 * u; ctx.fillStyle = '#3a2630'; ctx.fillRect(x - 3 * u, y - 3 * u, 6 * u, 6 * u); ctx.fillStyle = '#ffd36a'; ctx.fillRect(x - 2 * u, y - 2 * u, 4 * u, 4 * u); ctx.fillStyle = '#3a2630'; ctx.fillRect(x - u / 2, y - 2 * u, u, 2 * u); ctx.fillRect(x - u / 2, y + u, u, u); } });
      // 塔顶的小风轮
      const [rx, ry] = c.rotor, ang = now / (wind > 1 ? 300 : 900);
      for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(sx(rx), sy(ry)); ctx.rotate(ang + k * Math.PI / 2); ctx.fillStyle = '#6a4430'; ctx.fillRect(-u / 2, 0, u, 9 * u); ctx.fillStyle = k % 2 ? '#f4ead6' : '#e8c8a8'; ctx.fillRect(u / 2, 2 * u, 3 * u, 7 * u); ctx.restore(); }
      ctx.fillStyle = '#3a2418'; ctx.fillRect(sx(rx) - u, sy(ry) - u, 2 * u, 2 * u);
      // 桅杆顶的三角旗（风越大飘得越厉害）+ 从桅杆拉到屋顶的一串彩旗
      const [fxp, fyp] = c.flag, fl = 1 + wind * 0.4;
      for (let i = 0; i < 9; i++) { const yy = Math.sin(now / 160 - i * 0.7) * (0.6 + i * 0.15) * fl; ctx.fillStyle = i % 3 === 2 ? '#ffd36a' : '#e8405a'; ctx.fillRect(sx(fxp + 2 + i), sy(fyp + yy) - u, u, Math.max(u, (4 - i * 0.4) * u)); }
      const [ax, ay] = [sx(c.flag[0]), sy(c.flag[1] + 26)], [bx, by] = [sx(c.peak[0]), sy(c.peak[1])];
      ctx.strokeStyle = 'rgba(60,40,40,.8)'; ctx.lineWidth = Math.max(1, u / 2); ctx.beginPath(); ctx.moveTo(ax, ay);
      const sag = (t) => [ax + (bx - ax) * t, ay + (by - ay) * t + Math.sin(t * Math.PI) * 10 * u];
      for (let t = 0.05; t <= 1.001; t += 0.05) ctx.lineTo(...sag(t)); ctx.stroke();
      const BC = ['#e8705a', '#ffd36a', '#5a8ad8', '#7cbc62', '#f2a6c2'];
      for (let i = 1; i < 10; i++) { const [x, y] = sag(i / 10), w2 = Math.sin(now / 300 + i) * u * (wind > 1 ? 1 : 0.4); ctx.fillStyle = BC[i % 5]; ctx.beginPath(); ctx.moveTo(x - 2 * u, y); ctx.lineTo(x + 2 * u, y); ctx.lineTo(x + w2, y + 4 * u); ctx.fill(); }
      // 热气球：系在船尾的木桩上，轻轻晃；伙伴出门时它飞走了
      if (!tripping()) {
        const bxp = scrU(BALLOON.u - 4, BALLOON.v + 6), byp = scrV(BALLOON.u - 4, BALLOON.v + 6, HG + 30) + Math.sin(now / 1100) * 3 * u + Math.sin(now / 1800) * wind * u;
        ctx.strokeStyle = 'rgba(120,100,80,.9)'; ctx.beginPath(); ctx.moveTo(scrU(BALLOON.u, BALLOON.v), scrV(BALLOON.u, BALLOON.v, HG + 11)); ctx.quadraticCurveTo(bxp - 4 * u, byp + 20 * u, bxp, byp + 2 * u); ctx.stroke();
        const bc = balloonCv(); ctx.drawImage(bc, Math.round(bxp - bc.width * u / 2), Math.round(byp - bc.height * u + 4 * u), bc.width * u, bc.height * u);
      }
      // 篝火
      const fxx = scrU(FIRE.u, FIRE.v), fyy = scrV(FIRE.u, FIRE.v) - 2 * u, rainy = fx.rain > 0.5;
      const fl2 = [['#ffe27a', 2, 5], ['#f6a03a', 3, 4], ['#e8604a', 4, 3]];
      for (const [col, w, h] of fl2.slice().reverse()) { const j = Math.sin(now / 90 + w) * u + wind * u * 0.6, hh = h * u * (1 + 0.25 * Math.sin(now / 120 + h)) * (rainy ? 0.6 : 1); ctx.fillStyle = col; ctx.fillRect(fxx - w * u + j, fyy - hh, w * 2 * u, hh); }
      glow(ctx, fxx, fyy - 4 * u, (nt ? 40 : 18) * u, 'rgba(255,170,90,', nt ? 0.45 : 0.25);
      if (Math.random() < 0.05) smoke.push({ x: cx(FIRE.u, FIRE.v), y: cy(FIRE.u, FIRE.v, HG + 6), t: 0 });
      // 烟囱冒烟（屋里有人 / 在做饭冒得多），铁皮管也偶尔冒一口
      if (Math.random() < (cooking || G.all.some((p) => p.inHouse) ? 0.12 : 0.03)) smoke.push({ x: c.chimney[0], y: c.chimney[1], t: 0 });
      if (Math.random() < 0.015) smoke.push({ x: c.pipe[0], y: c.pipe[1], t: 0 });
      // 灯光
      if (nt || phase() === 'dusk') { for (const [x, y] of c.lights) glow(ctx, sx(x), sy(y), 12 * u); glow(ctx, scrU(54, 28), scrV(54, 28, HG + 14), 22 * u); for (const sl of c.slots) if (sl.id === 'lampPost' || sl.id === 'lantern') glow(ctx, scrU(sl.u, sl.v), scrV(sl.u, sl.v, HG + 12), 20 * u); }
      if (nt && season() === 'summer' && !fx.rain) { ctx.fillStyle = '#fff6a0'; for (let i = 0; i < 8; i++) { const t = now / 1000 + i * 3.1; if (Math.sin(t * 2.3 + i) > 0) { const pu = 20 + ((i * 13 + Math.sin(t) * 4) % 30), pv = 14 + ((i * 7 + Math.cos(t * 0.8) * 4) % 26); ctx.fillRect(scrU(pu, pv), scrV(pu, pv, HG + 8 + Math.sin(t * 2) * 3), u, u); } } }
      // 钓鱼的鱼线、浮漂、跳起来的鱼
      for (const p of G.pets) if (p.fishing) drawFishing(ctx, p, c, now);
      // 点了一下地面：一个小圈
      if (mark && now - mark.t < 700) { const k = (now - mark.t) / 700, x = scrU(mark.u, mark.v), y = scrV(mark.u, mark.v); ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = u; ctx.beginPath(); ctx.ellipse(x, y, (4 + k * 8) * u, (2 + k * 4) * u, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    smoke = smoke.filter((m) => (m.t += 1 / 60) < 3);
    for (const m of smoke) {
      if (m.spark) { ctx.fillStyle = `rgba(200,240,255,${(1 - m.t / 3).toFixed(2)})`; ctx.fillRect(sx(m.x + Math.sin(m.t * 3) * 2), sy(m.y + m.t * 10), u, u); continue; }
      const a = 1 - m.t / 3; ctx.fillStyle = `rgba(240,240,248,${(a * 0.6).toFixed(2)})`; const r = (1 + m.t * 1.4) * u; ctx.fillRect(sx(m.x + Math.sin(m.t * 2) * 2 + m.t * (3 + wind * 4)) - r, sy(m.y - m.t * 9) - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  let viewCv = null;
  let balloonC = null; const balloonCv = () => balloonC || (balloonC = (() => { const s = balloon(ART()); PP.gradePix && PP.gradePix(s.d); return s.canvas(); })());
  function crystal(ctx, x, y, u, now) {
    const rows = [[0, 1], [-1, 3], [-2, 5], [-2, 5], [-2, 5], [-1, 3], [-1, 3], [0, 1]];
    rows.forEach(([o, w], j) => { for (let i = 0; i < w; i++) { ctx.fillStyle = i + o < 0 ? '#e8fbff' : i + o > 0 ? '#6ab8e8' : '#a8e0fa'; ctx.fillRect(x + (o + i) * u * 1.5, y + j * u * 1.5, u * 1.5, u * 1.5); } });
    if (Math.sin(now / 400) > 0.6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3 * u, y + 2 * u, u, u); }
  }
  function arrow(ctx, x, y, u, col) {
    ctx.fillStyle = '#3a2630'; ctx.fillRect(x - 4 * u, y - 7 * u, 8 * u, 5 * u); ctx.fillRect(x - 6 * u, y - 3 * u, 12 * u, 2 * u); ctx.fillRect(x - 4 * u, y - u, 8 * u, 2 * u); ctx.fillRect(x - 2 * u, y + u, 4 * u, 2 * u);
    ctx.fillStyle = col; ctx.fillRect(x - 3 * u, y - 6 * u, 6 * u, 4 * u); ctx.fillRect(x - 5 * u, y - 2 * u, 10 * u, u); ctx.fillRect(x - 3 * u, y - u, 6 * u, u); ctx.fillRect(x - u, y + u, 2 * u, u);
  }
  // 钓鱼：甩竿 → 等 → 浮漂轻轻点两下 → 猛地一沉（这时候点一下就是你帮它收竿！）→ 鱼从云里跳出来
  function rodTip(p) {
    const S2 = G.S, f = p.fishing, t = (performance.now() - f.t0) / 1000;
    let a = 0.6; // 竿子抬起的角度（0 水平朝前，π/2 竖直）
    if (f.ph === 'cast') a = t < 0.35 ? 0.6 + t * 4 : Math.max(0.5, 2 - (t - 0.35) * 6);
    else if (f.ph === 'bite') a = 0.4 + Math.sin(t * 30) * 0.1;
    else if (f.ph === 'reel') a = 1.3;
    const bx = p.x + p.facing * 5 * S2, by = p.y - 11 * S2, len = 20 * S2;
    return [bx, by, bx + p.facing * Math.cos(a) * len, by - Math.sin(a) * len];
  }
  function drawFishing(ctx, p, c, now) {
    const u = L.u, f = p.fishing, t = (now - f.t0) / 1000;
    const [bx0, by0, tx, ty] = rodTip(p);
    const bobX = sx(c.bob[0]), bobY0 = sy(c.bob[1]);
    let bobY = bobY0 + Math.sin(now / 400) * u * 0.8, cast = 1;
    if (f.ph === 'cast') cast = U.clamp((t - 0.35) / 0.45, 0, 1);
    if (f.ph === 'nibble') bobY += (Math.sin(t * 18) > 0.6 ? 2 * u : 0);
    if (f.ph === 'bite') bobY += 4 * u;
    // 竿
    ctx.strokeStyle = '#6a4430'; ctx.lineWidth = Math.max(1, u * 0.8); ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(tx, ty); ctx.stroke();
    if (cast <= 0) return;
    const ex = tx + (bobX - tx) * cast, ey = ty + (bobY - ty) * cast - Math.sin(cast * Math.PI) * 30 * u;
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, ty);
    if (f.ph === 'reel' || f.ph === 'bite') ctx.lineTo(ex, ey); else ctx.quadraticCurveTo((tx + ex) / 2, Math.max(ty, ey) + 10 * u, ex, ey);
    ctx.stroke();
    if (f.ph !== 'reel') { ctx.fillStyle = '#e8405a'; ctx.fillRect(ex - u, ey - 2 * u, 2 * u, 2 * u); ctx.fillStyle = '#fff'; ctx.fillRect(ex - u, ey, 2 * u, f.ph === 'bite' ? 0 : u); }
    if (f.ph === 'cast' && cast >= 1 && t < 1.2 || f.ph === 'bite') { const k = f.ph === 'bite' ? (t * 3) % 1 : (t - 0.8) * 2.5; ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - k)})`; ctx.beginPath(); ctx.ellipse(bobX, bobY0 + u, (3 + k * 8) * u, (1 + k * 3) * u, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (f.ph === 'bite' && f.help !== false) { ctx.font = PP.FONT(11); PP.drawPixelLabel(ctx, '快点我！收竿', bobX, bobY0 - 26 * u, { size: 11, bg: '#ffd36a' }); }
    if (f.ph === 'reel') {
      const k = U.clamp(t / 0.8, 0, 1), fxp = bobX + (p.x - bobX) * k, fyp = bobY0 + (p.y - 20 * G.S - bobY0) * k - Math.sin(k * Math.PI) * 40 * u;
      if (f.got) { const fc = fishSpr(); ctx.save(); ctx.translate(fxp, fyp); ctx.rotate(k * 6); ctx.drawImage(fc, -fc.width * u / 2, -fc.height * u / 2, fc.width * u, fc.height * u); ctx.restore(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(fxp, fyp); ctx.stroke(); }
      else if (k < 0.5) { const fc = fishSpr(); ctx.drawImage(fc, bobX - fc.width * u / 2, bobY0 - k * 30 * u, fc.width * u, fc.height * u); }
      if (t < 0.3) for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(bobX + Math.cos(i * 1.3) * t * 40 * u, bobY0 - Math.abs(Math.sin(i * 1.3)) * t * 30 * u, u, u); }
    }
  }
  function renderFront(ctx) {
    if (!G.isle || !L) return;
    const u = L.u, data = inside ? buildRoom() : build(), z = inside ? RH0 : HG, now = performance.now();
    ctx.save(); ctx.imageSmoothingEnabled = false;
    const drawn = new Set(), tc = tint();
    for (const p of G.pets) {
      if (p.held) continue;
      const fx = (p.x - L.x0) / u, fy = (p.y - L.y0) / u, d = fy - OY + z, half = 12 * G.S / u, top = fy - 30 * G.S / u;
      for (const o of data.occ) {
        if (drawn.has(o) || fx + half < o.x0 || fx - half > o.x1 || fy < o.y0 || top > o.y1) continue;
        let od = -1; for (let x = Math.max(o.x0, Math.floor(fx - half)); x <= Math.min(o.x1, Math.ceil(fx + half)); x++) od = Math.max(od, o.dAt[x]);
        if (od > d + 0.5) { drawn.add(o); ctx.drawImage(tc ? tintOcc(o, tc) : o.cv, Math.round(sx(o.x0)), Math.round(sy(o.y0)), o.cv.width * u, o.cv.height * u); }
      }
    }
    // 雨雪下在最前面
    const fx = wfx(); if (!inside && (fx.rain || fx.snow || flash > 0)) weatherTick(ctx, { x: L.x0, y: L.y0, w: L.x1 - L.x0, h: L.y1 - L.y0 });
    if (fx.fog && !inside) { ctx.fillStyle = 'rgba(232,234,242,.22)'; ctx.fillRect(L.x0, L.y0 + (L.y1 - L.y0) * 0.5, L.x1 - L.x0, (L.y1 - L.y0) * 0.5); }
    if (!inside) {
      if (PP.econ.unread()) {
        const bob = Math.sin(now / 400) * 1.5, x = scrU(MAILB.u, MAILB.v) - 5 * u, y = scrV(MAILB.u, MAILB.v, HG + 22 + bob);
        ctx.fillStyle = '#3a2630'; ctx.fillRect(x - u, y - u, 12 * u, 10 * u); ctx.fillStyle = '#fffaf0'; ctx.fillRect(x, y, 10 * u, 8 * u); ctx.fillStyle = '#3a2630'; ctx.fillRect(x + 4 * u, y + 9 * u, 2 * u, u);
        ctx.fillStyle = '#e8705a'; ctx.fillRect(x + 2 * u, y + 2 * u, 6 * u, u); ctx.fillRect(x + 2 * u, y + 2 * u, u, 4 * u); ctx.fillRect(x + 7 * u, y + 2 * u, u, 4 * u); ctx.fillRect(x + 2 * u, y + 5 * u, 6 * u, u);
      }
      // 小屋入口：鼠标在岛上（或者还没进过屋）时，门上方一个上下跳的箭头 + 门口一圈暖光
      const M = G.mouse, overIsle = M.onScreen && M.x > L.x0 && M.x < L.x1 && M.y > L.y0 && M.y < L.y1;
      if (overIsle || !(G.save.flags && G.save.flags.isleIn)) {
        const dx = scrU(DOOR.u + 1, COT.v1 + 0.5), dy = scrV(DOOR.u + 1, COT.v1 + 0.5, HG + 32) + Math.sin(now / 260) * 2 * u;
        glow(ctx, scrU(DOOR.u + 1, COT.v1 + 1), scrV(DOOR.u + 1, COT.v1 + 1, HG + 6), 14 * u, 'rgba(255,214,120,', 0.35 + Math.sin(now / 300) * 0.12);
        arrow(ctx, dx, dy, u, hover && hover.k === 'door' ? '#ffffff' : '#ffd36a');
      }
      if (hover && hover.k === 'ground') { const x = scrU(hover.u, hover.v), y = scrV(hover.u, hover.v); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = u; ctx.beginPath(); ctx.moveTo(x - 4 * u, y); ctx.lineTo(x, y - 2 * u); ctx.lineTo(x + 4 * u, y); ctx.lineTo(x, y + 2 * u); ctx.closePath(); ctx.stroke(); }
    }
    ctx.restore();
    if (hover && !G.hoverPet && !press) { const t = hoverText(hover); if (t) PP.drawPixelLabel(ctx, t, Math.round(hover.lx), Math.round(Math.max(10, hover.ly)), { size: 12 }); }
  }
  const occTint = new WeakMap();
  function tintOcc(o, t) { const k = t.join(','); let m = occTint.get(o); if (m && m.k === k) return m.cv; const cv = document.createElement('canvas'); cv.width = o.cv.width; cv.height = o.cv.height; const c = cv.getContext('2d'); c.drawImage(o.cv, 0, 0); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = t[1]; c.fillStyle = t[0]; c.fillRect(0, 0, cv.width, cv.height); occTint.set(o, { k, cv }); return cv; }
  const fmtLeft = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} 小时 ${m % 60} 分` : `${m} 分钟`; };
  function hoverText(h) {
    if (h.k === 'door') return '进小屋';
    if (h.k === 'exit') return '出门';
    if (h.k === 'stove') return '在壁炉边做点心';
    if (h.k === 'mail') return PP.econ.unread() ? `信箱：${PP.econ.unread()} 封新信` : '信箱';
    if (h.k === 'fish') { const p = mainP(); return p && p.fishing && p.fishing.ph === 'bite' ? '收竿！' : '去钓鱼（往云海里甩一竿）'; }
    if (h.k === 'fire') return '烤火 / 烤点吃的';
    if (h.k === 'barrel') return '雨水桶：去喝水';
    if (h.k === 'balloon') { const t = G.all.find((p) => p.d.trip); return t ? `${t.name} 坐热气球去${PP.SCENES[t.d.trip.to] ? PP.SCENES[t.d.trip.to].name : '远方'}了` : '热气球：派伙伴去探险'; }
    if (h.k === 'plot') { const inf = PP.econ.plotInfo(h.i); if (!inf) return '空地：点一下选种子'; const n = PP.econ.ITEMS[PP.econ.CROPS[inf.crop].item].name; return inf.stage === 3 ? `${n}成熟啦！点一下收获` : `${n}：还有 ${fmtLeft(inf.left)}${(E().farm[h.i].water || 0) < 3 ? '（点一下浇水）' : ''}`; }
    return '';
  }

  // ---------- 点 / 拖 ----------
  function hot(x, y) {
    hover = null;
    if (!G.isle || !L || G.editing) return null;
    if (x < L.x0 || x > L.x1 || y < L.y0 || y > L.y1) return null;
    const lx = Math.floor((x - L.x0) / L.u), ly = Math.floor((y - L.y0) / L.u);
    let h = null;
    const near = (u, v, z, rx, ry) => { const X = scrU(u, v), Y = scrV(u, v, z); return Math.abs(x - X) <= rx * L.u && y >= Y - ry * L.u && y <= Y + 3 * L.u; };
    if (inside) {
      const r = buildRoom();
      if (near(RDOOR.u + 1.5, R1 - 1, RH0, 9, 30)) h = { k: 'exit' };
      else if (near(R0 + 3, 21, RH0, 10, 26)) h = { k: 'stove' };
      else { const [gu, gv] = toUV(x, y, RH0); if (gu >= R0 && gv >= R0 && gu < R1 && gv < R1) h = blocked(gu, gv) ? { k: 'room' } : { k: 'ground', u: gu, v: gv }; else if (ly >= 0 && ly < IH && lx >= 0 && lx < IW && r.mask[ly * IW + lx]) h = { k: 'room' }; }
    } else {
      const c = build();
      const [gu, gv] = toUV(x, y, HG);
      const onArt = lx >= 0 && ly >= 0 && lx < IW && ly < IH && c.mask[ly * IW + lx];
      const p = mainP();
      if (p && p.fishing && p.fishing.ph === 'bite' && Math.hypot(x - sx(c.bob[0]), y - sy(c.bob[1])) < 30 * L.u) h = { k: 'fish' };
      else if (near(DOOR.u + 1, COT.v1 + 1, HG, 6, 20)) h = { k: 'door' };
      else if (near(MAILB.u, MAILB.v, HG, 5, 12)) h = { k: 'mail' };
      else if (!tripping() && near(BALLOON.u - 4, BALLOON.v + 6, HG + 30, 14, 40) || near(BALLOON.u, BALLOON.v, HG, 4, 14)) h = { k: 'balloon' };
      else if (near(FIRE.u, FIRE.v, HG, 8, 9)) h = { k: 'fire' };
      else if (near(BARREL.u, BARREL.v, HG, 5, 13)) h = { k: 'barrel' };
      else if ((gu >= PLANK.u0 - 0.5 && gu <= PLANK.u1 + 1 && gv >= PLANK.v0 - 1 && gv < 12) || Math.hypot(x - sx(c.bob[0]), y - sy(c.bob[1])) < 18 * L.u) h = { k: 'fish' };
      else PLOTS.forEach(([pu, pv], i) => { if (!h && gu >= pu - 0.5 && gu < pu + 4.5 && gv >= pv - 0.5 && gv < pv + 4.5) h = { k: 'plot', i }; });
      if (!h && onArt) h = inDeck(gu, gv) && !blocked(gu, gv) ? { k: 'ground', u: gu, v: gv } : { k: 'hull' };
    }
    if (!h) return null;
    h.isle = true; h.lx = x; h.ly = y - 22 * Math.min(2, L.u); hover = h;
    return h;
  }
  function mainP() { const p = PP.F.main(); return p && G.pets.includes(p) && !p.held ? p : null; }
  // 按下：先不动作，看是拖还是点
  function down(h, x, y) {
    press = { h, x, y, moved: false, ox: L.x1, oy: L.y1 };
    G.uiDrag = true; PP.refreshInteractive();
    const mv = (ev) => {
      if (!press) return;
      if (!press.moved && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > 6) press.moved = true;
      if (press.moved) { const sb = safeB(); S().islePos = { x: (press.ox + ev.clientX - press.x) / G.W, y: (press.oy + ev.clientY - press.y) / sb }; fit(false); document.body.style.cursor = 'grabbing'; }
    };
    const up = (ev) => {
      window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up);
      const pr = press; press = null; G.uiDrag = false;
      if (pr && pr.moved) { PP.save.soon(); layout(); S().islePos = { x: L.x1 / G.W, y: L.y1 / safeB() }; }
      else if (pr) click(pr.h, ev.clientX, ev.clientY);
      document.body.style.cursor = 'default'; PP.refreshInteractive();
    };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }
  function click(h, x, y) {
    if (!h) return;
    const p = mainP(), go = (name, fn, ...args) => { if (p) { p.interrupt(true); p.run(name, fn, ...args); } };
    if (h.k === 'ground') { mark = { u: h.u, v: h.v, t: performance.now() }; if (p && !p.sleeping) go('isleGo', A.isleGo, h.u, h.v); else if (p && p.sleeping) PP.ui.toast(`${p.name}睡着了`); return; }
    if (h.k === 'hull' || h.k === 'room') return;
    if (h.k === 'door') { if (p) go('isleHouse', A.isleHouse, true); else setInside(true); return; }
    if (h.k === 'exit') { if (p) go('isleHouse', A.isleHouse, false); else setInside(false); return; }
    if (h.k === 'mail') { go('isleMail', A.isleMail); PP.econ.openPanel('mail'); return; }
    if (h.k === 'stove') { go('isleCook', A.isleCook); return; }
    if (h.k === 'fish') { if (p && p.fishing) { if (p.fishing.ph === 'bite') p.fishing.helped = true; return; } go('isleFish', A.isleFish); return; }
    if (h.k === 'fire') { go('isleFire', A.isleFire); return; }
    if (h.k === 'barrel') { go('isleDrink', A.isleDrink); return; }
    if (h.k === 'balloon') { PP.econ.openPanel('trip'); return; }
    if (h.k === 'plot') {
      const inf = PP.econ.plotInfo(h.i);
      if (inf && inf.stage === 3) { if (p) go('isleHarvest', A.isleHarvest, h.i); else PP.econ.harvest(h.i); return; }
      if (inf) { if (p && !p.sleeping && (E().farm[h.i].water || 0) < 3) go('isleWater', A.isleWater, h.i); else PP.ui.toast(hoverText(h)); return; }
      seedPicker(h.i, x, y);
    }
  }
  // 选种子：所有能种的都列出来；背包里有就直接种，没有就“买一颗 + 种下”
  function seedPicker(i, x, y) {
    const e = E(), I = PP.econ.ITEMS, seeds = Object.keys(I).filter((k) => I[k].kind === 'seed');
    const el = document.createElement('div'); el.className = 'seedpick';
    el.innerHTML = `<div class="sp-head"><b>种点什么？</b><span class="muted">小鱼干 ${e.fish}</span></div><div class="sp-list">${seeds.map((k) => { const it = I[k], c = PP.econ.CROPS[it.crop], crop = I[c.item], have = e.bag[k] || 0; return `<button class="sp" data-k="${k}" ${!have && e.fish < it.price ? 'disabled' : ''}><canvas data-crop="${it.crop}"></canvas><b>${crop.name}</b><small>${c.min >= 60 ? c.min / 60 + ' 小时' : c.min + ' 分钟'} · 卖 ${crop.sell}</small><em>${have ? '有 ' + have + ' 颗' : it.price + ' 小鱼干'}</em></button>`; }).join('')}</div>`;
    el.querySelectorAll('canvas[data-crop]').forEach((cv) => { const s = cropSpr(cv.dataset.crop, 3); cv.width = s.width * 2; cv.height = s.height * 2; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(s, 0, 0, s.width * 2, s.height * 2); });
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button.sp'); if (!b || b.disabled) return;
      const k = b.dataset.k;
      if (!(E().bag[k] > 0)) { const it = I[k]; if (E().fish < it.price) return; E().fish -= it.price; PP.econ.give(k, 1); }
      PP.hud && PP.hud.close(); cmd('plant', i, k);
    });
    if (PP.hud) PP.hud.pop(el, { x, y });
  }
  function cmd(a, b, c) {
    if (a === 'plant' && PP.econ.plant(+b, c)) { PP.ui.toast(`种下了${PP.econ.ITEMS[c].name.replace('种子', '')}`); const p = mainP(); if (p && !p.sleeping) { p.interrupt(true); p.run('isleWater', A.isleWater, +b); } }
  }
  function setInside(v) {
    if (inside === v) return;
    inside = v; hover = null; smoke = []; drops = [];
    if (v && G.save.flags) G.save.flags.isleIn = 1;
    layout(); G.ground = groundY();
    for (const q of G.pets) { q.interrupt(true); q.held = false; q.airborne = false; q.isleSpot = null; q.fishing = null; q.inHouse = v; q.lane = v ? 0.92 : (DOOR.u + 1 + COT.v1 + 3 - D0) / (D1 - D0); q.x = v ? scrU(RDOOR.u + 1.5, R1 - 4) : scrU(DOOR.u + 1, COT.v1 + 3); q.y = q.floor; q.facing = v ? -1 : 1; }
    roomT = 0;
    PP.placeOrb && PP.placeOrb();
  }

  // ---------- 主角在岛上过日子 ----------
  let roomT = 0;
  const day = () => { const e = E(); const d = new Date().toDateString(); if (!e.isleDay || e.isleDay.d !== d) e.isleDay = { d, fish: 0, cook: 0 }; return e.isleDay; };
  function* walkTo(p, u, v, run) {
    p.isleSpot = null;
    const d0 = inside ? RD0 : D0, d1 = inside ? RD1 : D1, far = Math.abs(scrU(u, v) - p.x) > 120 * L.u / 2;
    yield p.goto(scrU(u, v), run != null ? run : far, U.clamp((u + v - d0) / (d1 - d0), 0, 1));
  }
  A.isleGo = function* (u, v) { const p = this; yield* walkTo(p, u, v); p.anim = 'idle'; p.look = [0, 1]; if (Math.random() < 0.3) p.think(U.pick(['heart', 'note', 'sparkle']), 1.2); yield U.rand(2, 4); };
  A.isleOut = function* () { const p = this; p.facing = 1; p.anim = 'idle'; p.eyes = 'happy'; p.jolt(0, -3); yield 0.5; yield* walkTo(p, DOOR.u + 3, COT.v1 + 5); p.eyes = 'open'; };
  A.isleWater = function* (i) {
    const p = this, [pu, pv] = PLOTS[i];
    yield* walkTo(p, pu + 2, pv - 1.8); p.facing = -1; p.anim = 'idle'; p.eyes = 'happy';
    for (let k = 0; k < 7; k++) { PP.fx({ x: scrU(pu + 1 + (k % 3), pv + 1.5), y: scrV(pu + 1, pv + 1, HG + 12), vy: 30, icon: 'drop', life: 0.6, s: Math.max(1, L.u - 1) }); yield 0.2; }
    if (PP.econ.waterPlot(i)) p.think('heart', 1);
    yield 0.5;
  };
  A.isleHarvest = function* (i) { const p = this, [pu, pv] = PLOTS[i]; yield* walkTo(p, pu + 2, pv - 1.8); p.facing = -1; p.anim = 'jump'; p.jolt(0, -4); yield 0.4; PP.econ.harvest(i); for (let k = 0; k < 4; k++) PP.fx({ x: scrU(pu + 2, pv + 2) + U.rand(-10, 10), y: scrV(pu + 2, pv + 2, HG + 14), vy: -50, icon: 'sparkle', life: 0.9, s: Math.max(1, L.u - 1) }); p.anim = 'idle'; p.eyes = 'happy'; p.think('heart', 1.5); yield 1.2; };
  A.isleMail = function* () { const p = this; yield* walkTo(p, MAILB.u - 2, MAILB.v - 3); p.facing = 1; p.think('excl', 1.5); yield 1.2; if (PP.econ.unread()) { p._forceSay = true; p.say('信箱里有信哦～', 3); p._forceSay = false; } yield 1.5; };
  A.isleDrink = function* () { const p = this; yield* walkTo(p, BARREL.u + 2.5, BARREL.v); p.facing = -1; p.anim = 'eat'; yield 2; p.n.thirst = 100; p.anim = 'idle'; p.eyes = 'happy'; p.think('heart', 1); yield 1; };
  A.isleFire = function* () { const p = this; yield* walkTo(p, FIRE.u - 3.5, FIRE.v); p.facing = 1; p.anim = 'sit'; p.think(U.pick(['meat', 'bread', 'corn']), 2.5); yield 3; p.anim = 'eat'; yield 1.5; p.n.hunger = Math.min(100, p.n.hunger + 25); p.n.fun = Math.min(100, p.n.fun + 8); p.anim = 'sit'; p.eyes = night() ? 'sleepy' : 'happy'; yield U.rand(3, 7); p.anim = 'idle'; p.eyes = 'open'; };
  A.isleFish = function* () {
    const p = this;
    yield* walkTo(p, PLANK.u0 + 0.5, 13);
    p.isleSpot = { u: FISH.u, v: FISH.v, z: HG };
    p.target = scrU(FISH.u, FISH.v); p.tLane = null; p.running = false; yield () => p.target == null;
    p.facing = 1; p.anim = 'sit';
    const set = (ph) => { p.fishing = Object.assign(p.fishing || {}, { ph, t0: performance.now() }); };
    set('cast'); yield 1.2;
    set('wait'); yield U.rand(3, 7);
    set('nibble'); yield U.rand(0.9, 1.6);
    set('bite'); p.eyes = 'wide'; p.think('excl', 0.8);
    yield () => p.fishing.helped || performance.now() - p.fishing.t0 > 1300;
    const helped = !!p.fishing.helped, d = day(), got = helped || Math.random() < 0.55;
    p.fishing.got = got; set('reel'); p.anim = 'jump'; p.jolt(0, -3);
    yield 0.85;
    p.fishing = null; p.anim = 'idle';
    if (got && d.fish < 14 && (helped || Math.random() < 0.6)) { d.fish++; PP.econ.addFish(helped ? 2 : 1, helped ? `你帮${p.name}收竿，钓到一条云鱼` : `${p.name}钓到一条云鱼`); PP.fx({ kind: 'text', text: `+${helped ? 2 : 1} 小鱼干`, x: p.x, y: p.y - 40 * G.S, vy: -30, life: 1.4, style: { size: 11, bg: '#ffd36a' } }); }
    else if (got) { p._forceSay = true; p.say(U.pick(['钓到啦！太小了，放回去～', '小云鱼，回家吧', '嘿嘿，又一条']), 2.5); p._forceSay = false; }
    else { p._forceSay = true; p.say(U.pick(['跑掉了……', '哎呀，只钓到一团云', '下次一定！']), 2.5); p._forceSay = false; }
    p.eyes = 'happy'; p.n.fun = Math.min(100, p.n.fun + 15); yield 1.6;
    p.isleSpot = null; p.target = scrU(PLANK.u0 + 0.5, 13); yield () => p.target == null;
  };
  A.isleCook = function* () {
    const p = this;
    yield* walkTo(p, R0 + 7, 21); p.facing = -1; p.anim = 'idle'; cooking = true; p.think(U.pick(['cake', 'bowl', 'bread']), 3);
    for (let k = 0; k < 8; k++) { if (k % 3 === 0) PP.fx({ x: scrU(R0 + 4, 21), y: scrV(R0 + 4, 21, RH0 + 12), vy: -14, icon: 'sparkle', life: 0.8, s: 1 }); p.jolt(k % 2 ? 1 : -1, 0); yield 0.5; }
    cooking = false;
    const d = day();
    if (d.cook < 4 && Math.random() < 0.5) { d.cook++; PP.econ.give('biscuit', 1); PP.ui.toast(`${p.name}烤了一块小饼干，放进背包了`); }
    else { p.n.hunger = Math.min(100, p.n.hunger + 30); p._forceSay = true; p.say('做了点好吃的，自己先吃啦～', 2.5); p._forceSay = false; p.anim = 'eat'; yield 1.5; }
    p.anim = 'idle'; p.eyes = 'happy'; yield 1;
  };
  A.isleSit = function* (sl) {
    const p = this; yield* walkTo(p, sl.u + 1.5, sl.v + 1.5); p.facing = Math.random() < 0.5 ? 1 : -1;
    if (sl.id === 'hay') { p.anim = 'lie'; yield U.rand(5, 10); }
    else if (sl.id === 'swing') { p.anim = 'sit'; const x0 = p.x; for (let t = 0; t < 8; t += 0.1) { p.x = x0 + Math.sin(t * 2.4) * 3 * L.u; p.facing = Math.cos(t * 2.4) > 0 ? 1 : -1; yield 0.1; } p.x = x0; }
    else { p.anim = 'sit'; p.eyes = Math.random() < 0.5 ? 'happy' : 'open'; yield U.rand(5, 9); }
    p.anim = 'idle';
  };
  A.isleHouse = function* (go) {
    const p = this;
    if (go) { yield* walkTo(p, DOOR.u + 1, COT.v1 + 2); p.facing = -1; yield 0.25; setInside(true); }
    else { yield* walkTo(p, RDOOR.u + 1.5, R1 - 3); p.facing = 1; yield 0.25; setInside(false); }
  };
  A.isleFurn = function* (k) {
    const p = this, r = buildRoom(), sp = r.spots[k]; if (!sp) return;
    yield* walkTo(p, sp.u + 3, sp.v + 3); p.anim = 'idle'; p.facing = -1;
    if (k === 'bed') { yield* A.sleep.call(p); return; }
    const id = E().room[k];
    if (k === 'rug') { p.anim = Math.random() < 0.5 ? 'knead' : 'roll'; yield U.rand(3, 6); }
    else if (id === 'shelf') { p.anim = 'sit'; p.think('book', 3); yield 4; }
    else if (id === 'table') { p.anim = 'sit'; p.think('cake', 2.5); yield 3; }
    else if (id === 'piano') { p.anim = 'sit'; for (let i = 0; i < 10; i++) { PP.fx({ x: p.x + U.rand(-10, 10), y: p.y - 30 * G.S, vy: -24, icon: 'note', life: 1, s: 1 }); p.jolt(0, i % 2 ? -1 : 1); yield 0.4; } }
    else if (id === 'rocker') { p.anim = 'sit'; p.eyes = 'sleepy'; for (let t = 0; t < 6; t += 0.2) { p.jolt(Math.sin(t * 3), 0); yield 0.2; } }
    else { p.look = [0, -1]; yield 2; }
    p.anim = 'idle';
  };
  A.isleWindow = function* () { const p = this, w = U.pick(RWIN); yield* walkTo(p, R0 + (w.t0 + w.t1) / 2, R0 + 3); p.facing = -1; p.anim = 'sit'; p.look = [0, -1]; const fx = wfx(); p.think(fx.rain ? 'drop' : fx.snow ? 'sparkle' : night() ? 'moon' : 'note', 2.5); yield U.rand(4, 8); p.anim = 'idle'; };
  const baseEnter = A.enterDoor, baseEmerge = A.emerge;
  A.enterDoor = function* (done) {
    if (!G.isle) { yield* baseEnter.call(this, done); return; }
    const p = this;
    if (!inside) { yield* walkTo(p, DOOR.u + 1, COT.v1 + 2); p.facing = -1; yield 0.2; }
    p.inDoor = true; done && done();
  };
  A.emerge = function* () {
    if (!G.isle) { yield* baseEmerge.call(this); return; }
    const p = this; p.inDoor = false; p.x = doorX(); p.y = p.floor; yield* A.isleOut.call(p);
  };
  const baseDecide = PP.Pet.prototype.decide;
  PP.Pet.prototype.decide = function () {
    if (G.isle && G.pets.includes(this) && !this.held && !(G.save.settings.quiet) && Math.random() < 0.5) {
      const e = E(), p = this, fx = wfx(), wet = fx.rain > 0.3 || fx.snow > 0.5 || fx.storm;
      if (inside) {
        roomT++;
        const r = buildRoom(), ks = Object.keys(r.spots).filter((k) => k !== 'wall');
        if (ks.includes('bed') && p.n.energy < 65 && Math.random() < 0.6) { p.run('isleFurn', A.isleFurn, 'bed'); return; }
        if (roomT > (wet ? 9 : 4) && Math.random() < (wet ? 0.12 : 0.35)) { p.run('isleHouse', A.isleHouse, false); return; }
        if (Math.random() < (wet ? 0.3 : 0.15)) { p.run('isleWindow', A.isleWindow); return; }
        if (Math.random() < 0.22) { p.run('isleCook', A.isleCook); return; }
        if (ks.length && Math.random() < 0.6) { p.run('isleFurn', A.isleFurn, U.pick(ks)); return; }
      } else {
        if (wet && Math.random() < 0.45) { p.run('isleHouse', A.isleHouse, true); return; } // 下雨了，回屋
        const grow = PLOTS.map((_, i) => i).filter((i) => { const inf = PP.econ.plotInfo(i); return inf && inf.stage < 3 && (e.farm[i].water || 0) < 3; });
        if (grow.length && !fx.rain && Math.random() < 0.3) { p.run('isleWater', A.isleWater, U.pick(grow)); return; }
        if (PP.econ.unread() && Math.random() < 0.25) { p.run('isleMail', A.isleMail); return; }
        if (p.n.thirst < 60 && Math.random() < 0.5) { p.run('isleDrink', A.isleDrink); return; }
        if ((p.n.hunger < 60 || night()) && !fx.rain && Math.random() < 0.35) { p.run('isleFire', A.isleFire); return; }
        const sl = build().slots.filter((s) => ['bench', 'swing', 'hay'].includes(s.id));
        if (sl.length && Math.random() < 0.3) { p.run('isleSit', A.isleSit, U.pick(sl)); return; }
        if (Math.random() < 0.25) { p.run('isleFish', A.isleFish); return; }
        if ((night() || p.n.energy < 40) && Math.random() < 0.5 || Math.random() < 0.08) { p.run('isleHouse', A.isleHouse, true); return; }
        if (Math.random() < 0.4) { let u, v, k = 0; do { u = U.rand(8, 52); v = U.rand(12, 44); } while ((blocked(u, v) || !inDeck(u, v)) && ++k < 20); if (k < 20) { p.run('isleGo', A.isleGo, u, v); return; } }
      }
    }
    return baseDecide.call(this);
  };
  // 下雨天自己浇菜：每 10 分钟雨给每块地 +1 水
  setInterval(() => { try { if (!G.save || !PP.econ) return; const fx = wfx(); if (fx.rain > 0.3) { const e = E(); (e.farm || []).forEach((pl, i) => { if (pl && (pl.water || 0) < 3) pl.water = (pl.water || 0) + 1; }); } } catch (err) {} }, 10 * 60000);

  function dirty() { dirtyK++; cache = null; roomCache = null; tintCv = null; }
  setInterval(() => { if (PP.started && G.save) sync(); }, 1500);
  const doorX = () => { if (!L) layout(); return inside ? scrU(RDOOR.u + 1.5, R1 - 3) : scrU(DOOR.u + 1, COT.v1 + 2); };
  PP.isle = { doorX, floorY, sync, layout, groundY, zone, renderBack, renderFront, hot, click, down, cmd, dirty, inside: () => inside, setInside, rect: () => L, scale: () => (L ? L.u : scaleOf()), setSize, resetPos, safeB, SLOT_NAME, seedPicker, pressing: () => !!press };
})();
