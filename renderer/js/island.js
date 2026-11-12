// 小岛视图：极简模式的“家”——右下角漂着一座 3D 斜视（等距）的浮空小岛，画风是我们自己的像素风，世界观接「我的」浮空岛：
//   院子：能进去的小屋、小风车（叶片会转）、蜂箱和花圃、晾衣绳、六块菜地、带木栈道和小船的池塘（钓鱼 = 小鱼干）、
//         篝火和树桩（烤东西吃）、信箱、拴在岛边的热气球（伙伴去探险就是坐它飞走的，回来才落回来）、路灯、篱笆、大树
//   屋里：剖面小屋——壁炉（做饭）、窗、床、地毯、书架、桌子、钢琴 / 摇椅、盆栽、挂画
//   主角在岛上过日子：浇菜、钓鱼、烤火、去池塘边喝水、看信、坐长椅、进屋睡觉、在壁炉边做点心
// 做法：一个小小的“体素”渲染器——岛面、房子、风车塔、池塘都是一根根有高度的柱子，按远近画出来，
//       所以有真正的侧面和遮挡；树、信箱、路灯这些是立着的像素小精灵。动物走到房子 / 大树后面会被挡住。
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const A = PP.ACTIONS;

  // ---------- 等距坐标 ----------
  // 格子 (u, v)：u 往右下、v 往左下。一格画成 4×2 像素的菱形；z 是高度（像素）
  const N = 56, HG = 6;                 // 岛面 56×56 格，地面高 6
  const IW = 240, IH = 196, OX = 118, OY = 34;
  const cx = (u, v) => OX + 2 * (u - v) + 2, cy = (u, v, z = 0) => OY + u + v - z;
  const inIsle = (u, v) => Math.pow(Math.abs(u - 28) / 27.5, 3) + Math.pow(Math.abs(v - 28) / 27.5, 3) <= 1;
  // 场地
  const HOUSE = { u0: 11, v0: 11, u1: 21, v1: 20, wall: 20, roof: 13 };
  const DOOR = { u: 16 };                 // 门在房子朝左下的那面（v = v1 那面）
  const MILL = { u: 34, v: 9 };           // 风车塔
  const POND = { u: 41, v: 30, r: 9 };
  const DOCK = { u0: 30, u1: 36, v: 30 }; // 栈道：从岸边伸进池塘
  const PLOTS = [[17, 31], [21, 31], [25, 31], [17, 36], [21, 36], [25, 36]]; // 每块 3×3 格
  const FIRE = { u: 34, v: 43 };
  const MAILB = { u: 44, v: 44 };
  const BALLOON = { u: 8, v: 40 };
  const SLOTS = [[24, 22], [9, 24], [46, 18], [13, 46], [50, 34], [40, 49]];
  const SLOT_NAME = ['门口', '屋旁', '风车下', '菜地前', '池塘边', '篝火旁'];
  // 屋里
  const RN = 44, RH0 = 4, WALLH = 46;

  let L = null, inside = false, cache = null, roomCache = null, hover = null, dirtyK = 0, smoke = [], cooking = false;
  const S = () => G.save.settings;
  const E = () => PP.econ.E();
  const K = () => PP.WORLD_KIT, ART = () => PP.ART;
  function want() { const s = G.save && S(); return !!(s && s.mode === 'mini' && s.isle && !s.taskbar); }
  const season = () => (PP.season ? PP.season() : 'summer');
  const night = () => { const h = new Date().getHours(); return h >= 19 || h < 6; };
  const tripping = () => G.all.some((p) => p.d.trip);

  // ---------- 体素渲染 ----------
  // col: { u, v, h, b?, top: (i, row, u, v) => color, lf: (z, i, u, v) => color, rf: (z, i, u, v) => color }
  // bill: { u, v, spr, dy? } —— 立着的小精灵，脚底在这一格的地面上
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
        const b = it.b, bb = b.spr.stamp(P, cx(b.u, b.v), cy(b.u, b.v, HG) + 1 + (b.dy || 0));
        if (rec) for (let x = bb.x0; x < bb.x1; x++) rec(x, it.d);
      }
    }
  }
  // 一个东西单独画一张（拿来挡住走到它后面的动物）
  function occluder(cols, bills) {
    const a = ART(), P = new a.Pix(IW, IH), dAt = new Float32Array(IW).fill(-1);
    vox(P, cols, bills, (x, d) => { if (x >= 0 && x < IW) dAt[x] = Math.max(dAt[x], d); });
    let x0 = IW, x1 = 0, y0 = IH, y1 = 0;
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) if (P.d[y * IW + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < x0) return null;
    const cv = document.createElement('canvas'); cv.width = x1 - x0 + 1; cv.height = y1 - y0 + 1;
    const big = P.canvas(); cv.getContext('2d').drawImage(big, -x0, -y0);
    return { cv, x0, y0, x1, y1, dAt };
  }
  const H = (s, n) => ART().hash(s, n, 7);
  const pick = (arr, s) => arr[Math.floor(s * arr.length) % arr.length];
  const solid = (c) => () => c;

  // ---------- 色板 ----------
  const GRASS = {
    spring: ['#5a9a44', '#6aaa54', '#7cbc62', '#94d070', '#b4e48a'],
    summer: ['#4a8a3e', '#5a9a44', '#6aaa50', '#82c062', '#a0d47a'],
    autumn: ['#9a6a2e', '#b4843a', '#c89a48', '#dab05a', '#ecc870'],
    winter: ['#b8c8dc', '#d0dcec', '#e4ecf6', '#f2f6fc', '#ffffff'],
  };
  const ROOF = ['#c8604a', '#a8483a', '#e07a5a', '#8a3a30'];

  // ---------- 院子 ----------
  function terrainCols(se) {
    const a = ART(), GC = GRASS[se] || GRASS.summer, snow = se === 'winter', cols = [];
    const onPath = (u, v) => (Math.abs(v - (HOUSE.v1 + 2)) <= 1 && u >= HOUSE.u0 + 3 && u <= MAILB.u) || (Math.abs(u - DOOR.u) <= 1 && v > HOUSE.v1 && v <= HOUSE.v1 + 3) || (Math.abs(u - (MAILB.u - 1)) <= 1 && v > HOUSE.v1 && v <= MAILB.v) || (Math.abs(v - DOCK.v) <= 0 && u >= DOCK.u0 - 6 && u < DOCK.u0);
    const inPond = (u, v) => (u - POND.u) ** 2 + (v - POND.v) ** 2 <= POND.r * POND.r;
    const nearPond = (u, v) => (u - POND.u) ** 2 + (v - POND.v) ** 2 <= (POND.r + 1.3) ** 2;
    const inPlot = (u, v) => PLOTS.some(([pu, pv]) => u >= pu && u < pu + 3 && v >= pv && v < pv + 3);
    const dirtL = (z, i, u, v) => (z < HG - 1 ? (H(u * 3 + i, z) < 0.5 ? '#7a5038' : '#6a4430') : GC[0]);
    const dirtR = (z, i, u, v) => (z < HG - 1 ? (H(v * 3 + i, z + 9) < 0.5 ? '#5a3a28' : '#4a3020') : a.mix(GC[0], '#2a1a14', 0.2));
    for (let u = 0; u < N; u++) for (let v = 0; v < N; v++) {
      if (!inIsle(u, v)) continue;
      if (inPond(u, v)) { const deep = (u - POND.u) ** 2 + (v - POND.v) ** 2 < (POND.r - 2.5) ** 2; cols.push({ u, v, h: HG - 2, lf: dirtL, rf: dirtR, top: (i, r) => (snow ? (r ? '#e4eef8' : '#d0e0f0') : deep ? (H(u * 4 + i, v + r) < 0.06 ? '#7ab8e0' : '#4a86b8') : (H(u * 4 + i, v + r) < 0.08 ? '#8ac8ea' : '#5a9ac8')) }); continue; }
      if (nearPond(u, v)) { cols.push({ u, v, h: HG + 1, lf: (z, i) => (z >= HG ? '#a8a0b4' : dirtL(z, i, u, v)), rf: (z, i) => (z >= HG ? '#7a7090' : dirtR(z, i, u, v)), top: (i, r) => (H(u + i, v * 2 + r) < 0.5 ? '#c4bcd0' : '#b0a8c0') }); continue; }
      if (inPlot(u, v)) { cols.push({ u, v, h: HG, lf: dirtL, rf: dirtR, top: (i, r) => ((u + v) % 2 === 0 && r === 0 ? '#8a5a36' : i === 0 ? '#5a3420' : '#6a4026') }); continue; }
      if (onPath(u, v)) { cols.push({ u, v, h: HG, lf: dirtL, rf: dirtR, top: (i, r) => (snow ? (r ? '#e4ecf6' : '#c8d0e0') : (i === 0 && (u + v) % 2 ? '#8a8278' : r ? '#d4ccc0' : H(u * 4 + i, v) < 0.5 ? '#c0b8ac' : '#b4ac9e')) }); continue; }
      cols.push({ u, v, h: HG, lf: dirtL, rf: dirtR, top: (i, r) => { const n = H(u * 4 + i, v * 2 + r); if (se === 'autumn' && n < 0.04) return ['#e8703a', '#f0a040', '#c8443a'][(u + i) % 3]; return n < 0.08 ? GC[4] : n < 0.4 ? GC[2] : n < 0.85 ? GC[3] : GC[1]; } });
    }
    return cols;
  }
  // 房子：石头地基、白墙木梁、两面坡瓦顶、烟囱、窗、门
  function houseCols(snow) {
    const cols = [], h = HOUSE, vc = (h.v0 + h.v1) / 2, half = (h.v1 - h.v0) / 2 + 0.5, top = HG + h.wall, nt = night();
    const glass = (z, s) => (nt ? (s ? '#ffe9a8' : '#ffd36a') : (s ? '#cfeafa' : '#8ac8f0'));
    const wallL = (z, i, u) => { // 朝左下那面（v = v1）：门、两扇窗
      const zz = z - HG;
      if (zz < 3) return H(u * 2 + i, z) < 0.5 ? '#a8a0b4' : '#9890a8';
      if (u >= DOOR.u && u <= DOOR.u + 1 && zz < 12) return zz === 11 || (u === DOOR.u && i === 0) ? '#4a3022' : (zz === 7 && u === DOOR.u + 1 && i === 0 ? '#ffd36a' : '#8a5236');
      if ((u === 12 || u === 13 || u === 19 || u === 20) && zz >= 7 && zz < 13) return zz === 7 || zz === 12 ? '#6a4430' : glass(zz, (u + i) % 2 === 0 && zz > 9);
      if (zz === 13 || zz === h.wall - 1 || (u % 4 === 1 && i === 0)) return '#6a4430';
      return '#f4ead6';
    };
    const wallR = (z, i, u, v) => { // 朝右下那面（u = u1）：山墙
      const zz = z - HG;
      if (zz < 3) return H(v * 2 + i, z + 3) < 0.5 ? '#8a8298' : '#7a7290';
      if (zz >= h.wall) { const k = (zz - h.wall) / h.roof, need = Math.abs(v + 0.5 - vc) / half; if (need > 1 - k) return null; return (v === Math.round(vc) && i === 0) ? '#6a4430' : '#e4d8c2'; }
      if ((v === 14 || v === 15 || v === 17) && zz >= 7 && zz < 13 && v !== 16) return zz === 7 || zz === 12 ? '#5a3a28' : glass(zz, i === 0);
      if (zz === 13 || (v % 4 === 0 && i === 1)) return '#5a3a28';
      return '#e0d4be';
    };
    for (let u = h.u0; u <= h.u1; u++) for (let v = h.v0; v <= h.v1; v++) {
      const rh = Math.round(top + h.roof * (1 - Math.abs(v + 0.5 - vc) / half));
      const edgeV = v === h.v1, edgeU = u === h.u1;
      cols.push({ u, v, h: rh,
        lf: (z, i) => (z < top ? (edgeV ? wallL(z, i, u) : '#c8bca8') : (z >= rh - 1 ? ROOF[1] : (u + Math.floor(z / 2)) % 3 === 0 ? ROOF[3] : ROOF[1])),
        rf: (z, i) => (edgeU ? wallR(z, i, u, v) : (z < top ? '#b8ac98' : ROOF[3])),
        top: (i, r) => (snow ? (r ? '#ffffff' : '#e8f0f8') : v === Math.round(vc - 0.5) || v === Math.round(vc + 0.5) && false ? '#e8846a' : ((u + (v % 2)) % 2 === 0 && i === 1) ? ROOF[2] : (z => ROOF[0])()) });
    }
    // 烟囱
    for (let u = 18; u <= 19; u++) for (let v = 12; v <= 13; v++) cols.push({ u, v, h: top + h.roof + 3, lf: (z) => (z % 3 === 0 ? '#7a3a34' : '#b8584a'), rf: (z) => (z % 3 === 0 ? '#5a2a24' : '#94463a'), top: () => '#3a2a2a' });
    // 门前台阶
    for (let u = DOOR.u - 1; u <= DOOR.u + 2; u++) cols.push({ u, v: h.v1 + 1, h: HG + 1, lf: () => '#a8a0b4', rf: () => '#8a8298', top: (i) => (i === 0 ? '#b8b0c4' : '#ccc4d8') });
    return cols;
  }
  // 小风车：石砌圆塔 + 小尖顶（叶片单独画，会转）
  function millCols(snow) {
    const cols = [], m = MILL;
    for (let u = m.u - 2; u <= m.u + 2; u++) for (let v = m.v - 2; v <= m.v + 2; v++) {
      const r = Math.hypot(u - m.u, v - m.v); if (r > 2.4) continue;
      const hh = HG + 30 + Math.round((2.4 - r) * 4);
      cols.push({ u, v, h: hh,
        lf: (z, i) => (z > HG + 29 ? (z % 2 ? '#5a6aa8' : '#4a5a98') : z < HG + 3 ? '#9890a8' : ((z >> 2) + u) % 2 ? '#e8e0cc' : '#d8ceb8'),
        rf: (z, i) => (z > HG + 29 ? '#3a4a80' : z < HG + 3 ? '#7a7290' : ((z >> 2) + v) % 2 ? '#c8bea8' : '#b8ae98'),
        top: () => (snow ? '#ffffff' : '#6a7ab8') });
    }
    return cols;
  }
  function wellOfLight() {}
  // 立着的小精灵
  function campfire(a) { const s = a.spr(14, 8); for (const [x, y, c] of [[2, 6, '#8a5a3a'], [5, 7, '#7a4e30'], [9, 7, '#8a5a3a'], [12, 6, '#7a4e30']]) s.rect(x, y, 3, 2, c); s.ell(7.5, 6.5, 6, 2, (nx) => (Math.abs(nx) > 0.75 ? '#9890a8' : null)); return s; }
  function stump(a) { const s = a.spr(8, 6); s.rect(1, 2, 7, 5, '#8a5a3a'); s.ell(4.5, 2, 3.5, 1.2, '#d8b080'); s.set(4, 2, '#a8784a'); s.vl(2, 3, 4, '#a8784a'); return s.outline('#3a2630'); }
  function rowboat(a) { const s = a.spr(18, 7); for (let x = 0; x < 18; x++) { const d = Math.abs(x - 8.5) / 9; const top = 1 + Math.round(d * 2), bot = 6 - Math.round(d * d * 3); for (let y = top; y <= bot; y++) s.set(x + 1, y, y === top ? '#e0b07a' : y === bot ? '#5a3a28' : '#a8784a'); } s.hl(6, 3, 7, '#7a4e30'); return s.outline('#3a2630'); }
  function balloon(a, se) {
    const s = a.spr(26, 46);
    const C = ['#e8705a', '#ffd36a', '#5a8ad8', '#7cbc62'];
    s.ell(13, 13, 12, 13, (nx, ny, x, y) => { const band = Math.floor((Math.atan2(ny, nx * 0.9) + Math.PI) / (Math.PI / 5)); let c = C[band % 4]; if (nx < -0.5 && ny < 0) c = a.mix(c, '#ffffff', 0.3); else if (nx > 0.5) c = a.mix(c, '#2a1a34', 0.25); if (ny > 0.85) c = a.mix(c, '#2a1a34', 0.3); return c; });
    for (let y = 26; y < 36; y++) { s.set(7 + Math.round((y - 26) * 0.3), y, '#8a7a6a'); s.set(19 - Math.round((y - 26) * 0.3), y, '#8a7a6a'); }
    s.rect(9, 36, 9, 7, '#a8784a'); s.hl(9, 36, 9, '#c8935e'); s.hl(9, 39, 9, '#8a5a3a'); s.vl(9, 36, 7, '#7a4e30');
    return s.outline('#3a2630');
  }
  function stakeSign(a) { const s = a.spr(14, 12); s.vl(7, 5, 7, '#7a5a40'); s.rect(1, 1, 13, 5, '#c8935e'); s.hl(1, 1, 13, '#e0b07a'); s.hl(3, 3, 9, '#7a4e30'); return s.outline('#3a2630'); }
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
  function fenceCols() {
    // 只在岛的前沿一圈（靠近我们这边的两条边）围矮木篱笆，留出路口
    const cols = [];
    for (let u = 0; u < N; u++) for (let v = 0; v < N; v++) {
      if (!inIsle(u, v) || inIsle(u + 1, v) && inIsle(u, v + 1)) continue;
      if (u + v < 58) continue;
      if (Math.abs(u - MAILB.u) < 3 && v > 48) continue;           // 路口
      if ((u - POND.u) ** 2 + (v - POND.v) ** 2 < (POND.r + 3) ** 2) continue;
      const post = (u + v) % 3 === 0;
      cols.push({ u, v, b: HG, h: HG + (post ? 7 : 5), lf: (z) => (post ? (z === HG + 6 ? '#d8a868' : '#a8784a') : z === HG + 1 || z === HG + 4 ? '#c8935e' : null), rf: (z) => (post ? '#7a5236' : z === HG + 1 || z === HG + 4 ? '#8a6040' : null), top: post ? () => '#d8a868' : null });
    }
    return cols;
  }
  function build() {
    const a = ART(), k = K(), se = season(), snow = se === 'winter', R = a.rng(77), e = E();
    const key = [se, (e.isleDeco || []).join(','), tripping() ? 1 : 0, night() ? 1 : 0, dirtyK].join('|');
    if (cache && cache.key === key) return cache;
    const P = new a.Pix(IW, IH);
    // 云
    k.puffCloud(P, 50, IH - 26, 40, 8, false); k.puffCloud(P, 186, IH - 22, 50, 9, false); k.puffCloud(P, 120, IH - 6, 34, 6, true);
    // 岛底：倒过来的一大块岩石（越往下越尖）
    const terr = terrainCols(se);
    rockUnder(P, terr, snow);
    // 池塘漫出来的小瀑布（从岛前沿流下去）
    const wfx = cx(POND.u + 7, POND.v + 6), wfy = cy(POND.u + 7, POND.v + 6, HG) + 2;
    for (let j = 0; j < 34; j++) for (let q = 0; q < 3; q++) P.set(wfx + q, wfy + j, (j + q * 2) % 4 === 0 ? '#ffffff' : q === 1 ? '#c8e8fa' : '#a8d8f6');
    k.puffCloud(P, wfx + 1, wfy + 34, 10, 3, true);
    // 地面 + 所有东西，按远近一次画完
    const house = houseCols(snow), mill = millCols(snow), fence = fenceCols();
    const bills = [], occl = [];
    const bill = (u, v, spr, occ, dy) => { const b = { u, v, spr, dy }; bills.push(b); if (occ) occl.push({ cols: [], bills: [b] }); return b; };
    const tree = (u, v, h, kind) => bill(u, v, a.broadleaf(h, se, R, kind), true);
    // 后排
    tree(4, 20, 30, 'birch'); tree(8, 14, 34, 'oak'); tree(25, 5, 28, 'birch'); tree(44, 8, 44, se === 'spring' ? 'apple' : 'oak'); tree(52, 22, 30, 'oak');
    bill(6, 27, k.beehive(), true); bill(9, 30, k.flowerBush(6, se, '#f2a6c2')); bill(11, 28, k.flowerBush(5, se, '#ffd36a'));
    bill(26, 15, k.laundry(16), true);
    bill(23, 24, a.lamp(snow), true);
    bill(40, 18, k.barrel(7), true); bill(42, 20, k.crate(7), true);
    // 菜地边的小木牌
    bill(16, 30, stakeSign(a), false);
    // 篝火 + 树桩
    bill(FIRE.u, FIRE.v, campfire(a), false); bill(FIRE.u - 3, FIRE.v + 2, stump(a), true); bill(FIRE.u + 3, FIRE.v - 2, stump(a), true);
    // 栈道 + 小船
    const dock = [];
    for (let u = DOCK.u0; u <= DOCK.u1; u++) for (let v = DOCK.v - 1; v <= DOCK.v; v++) dock.push({ u, v, b: HG - 2, h: HG, lf: (z) => (z === HG - 1 ? '#c8935e' : '#7a4e30'), rf: () => '#5a3a28', top: (i) => ((u + i) % 3 === 0 ? '#8a5a3a' : i % 2 ? '#d8a868' : '#c8935e') });
    bill(POND.u + 3, POND.v + 4, rowboat(a), false, 3);
    // 信箱
    bill(MAILB.u, MAILB.v, k.mailbox(), true);
    // 热气球：伙伴出门探险时飞走了，只剩木桩和牌子
    if (!tripping()) { bill(BALLOON.u, BALLOON.v, balloon(a, se), true); } else bill(BALLOON.u, BALLOON.v, stakeSign(a), true);
    // 花草
    for (let i = 0; i < 46; i++) {
      const u = 4 + Math.floor(a.hash(i, 1, 51) * 48), v = 4 + Math.floor(a.hash(i, 2, 51) * 48);
      if (!inIsle(u, v) || busy(u, v)) continue;
      const r = a.hash(i, 3, 51);
      bill(u, v, r < 0.4 ? a.flower(se, R) : r < 0.92 ? a.grassTuft(se, R, false) : a.mushrooms(se));
    }
    // 买来的摆设
    const slots = [];
    (e.isleDeco || []).forEach((id, i) => { if (!id || !SLOTS[i]) return; const d = decoSpr(id, snow, se, R); if (!d) return; const [u, v] = SLOTS[i]; bill(u, v, d, true); slots.push({ id, i, u, v }); });
    occl.push({ cols: house, bills: [] }, { cols: mill, bills: [] }, { cols: fence, bills: [] });
    vox(P, terr.concat(house, mill, fence, dock), bills);
    PP.gradePix && PP.gradePix(P.d);
    const door = { u: DOOR.u + 0.5, v: HOUSE.v1 + 1 };
    cache = { key, cv: P.canvas(), occ: occl.map((o) => occluder(o.cols, o.bills)).filter(Boolean), door, slots, chimney: { x: cx(18.5, 12.5), y: cy(18.5, 12.5, HG + HOUSE.wall + HOUSE.roof + 4) }, lights: [[cx(12.5, HOUSE.v1 + 1), cy(12.5, HOUSE.v1 + 1, HG + 10)], [cx(19.5, HOUSE.v1 + 1), cy(19.5, HOUSE.v1 + 1, HG + 10)], [cx(HOUSE.u1 + 1, 15), cy(HOUSE.u1 + 1, 15, HG + 10)]] };
    return cache;
  }
  function rockUnder(P, terr, snow) {
    const a = ART();
    const lowY = new Int16Array(IW).fill(-1);
    for (const c of terr) { const x = OX + 2 * (c.u - c.v), y = OY + c.u + c.v; for (let i = 0; i < 4; i++) if (x + i >= 0 && x + i < IW) lowY[x + i] = Math.max(lowY[x + i], y + 1); }
    let xa = IW, xb = 0; for (let x = 0; x < IW; x++) if (lowY[x] >= 0) { xa = Math.min(xa, x); xb = Math.max(xb, x); }
    const mid = (xa + xb) / 2, halfW = (xb - xa) / 2, DEEP = 40;
    for (let x = xa; x <= xb; x++) {
      const t = Math.abs(x - mid) / halfW, yb = lowY[x] + 2 + Math.round(DEEP * Math.pow(Math.max(0, 1 - t * t), 1.4)) + Math.round(Math.sin(x * 0.31) * 2 + a.hash(x >> 2, 9, 3) * 3);
      for (let y = lowY[x] - 1; y <= yb; y++) {
        const ox = Math.round(Math.sin(y * 0.2) * 2), cx_ = Math.floor((x + ox + Math.floor(y / 6) * 5) / 11), cy_ = Math.floor((y + Math.round(Math.sin(x * 0.4) * 1.5)) / 6), cell = a.hash(cx_, cy_, 13);
        const cR = a.hash(Math.floor((x + 1 + ox + Math.floor(y / 6) * 5) / 11), cy_, 13), cD = a.hash(cx_, Math.floor((y + 1 + Math.round(Math.sin(x * 0.4) * 1.5)) / 6), 13);
        let c = cell < 0.33 ? '#a89cb8' : cell < 0.66 ? '#9488a8' : '#867a9a';
        if (cR !== cell || cD !== cell) c = a.mix(c, '#4a4060', 0.4);
        const nx = (x - mid) / halfW, dy = (y - lowY[x]) / DEEP;
        if (nx < -0.4) c = a.mix(c, '#ffffff', 0.1); else if (nx > 0.35) c = a.mix(c, '#2a1a34', 0.28);
        c = a.mix(c, '#3a3050', Math.max(0, dy) * 0.35);
        if (y >= yb - 1) c = '#4a4060';
        P.set(x, y, c);
      }
      if (a.hash(x, 3, 11) < 0.25) { const len = 3 + Math.floor(a.hash(x, 4, 11) * 12); for (let j = 0; j < len; j++) P.set(x, yb + j, j === len - 1 && !snow && a.hash(x, 5) < 0.5 ? '#f0a8c0' : j % 3 ? '#6a4a32' : '#5a9a4e'); }
    }
  }
  function busy(u, v) {
    if (u >= HOUSE.u0 - 1 && u <= HOUSE.u1 + 1 && v >= HOUSE.v0 - 1 && v <= HOUSE.v1 + 3) return true;
    if ((u - POND.u) ** 2 + (v - POND.v) ** 2 <= (POND.r + 2) ** 2) return true;
    if (PLOTS.some(([pu, pv]) => u >= pu - 1 && u < pu + 4 && v >= pv - 1 && v < pv + 4)) return true;
    if (Math.hypot(u - MILL.u, v - MILL.v) < 4 || Math.hypot(u - FIRE.u, v - FIRE.v) < 4 || Math.hypot(u - BALLOON.u, v - BALLOON.v) < 5) return true;
    if (Math.abs(u - DOOR.u) <= 1 && v > HOUSE.v1) return true;
    return false;
  }

  // ---------- 屋里（剖面） ----------
  function buildRoom() {
    const a = ART(), e = E(), nt = night(), se = season(), R = a.rng(91);
    const key = [JSON.stringify(e.room), nt ? 1 : 0, se, dirtyK].join('|');
    if (roomCache && roomCache.key === key) return roomCache;
    const P = new a.Pix(IW, IH), cols = [], bills = [], occl = [];
    const ROX = 22, ROV = 22; // 把屋子放在岛的中间（格子平移）
    const at = (u, v) => [u + ROX - 8, v + ROV - 8];
    const room = e.room || {};
    k_puffs(P);
    // 地板（人字拼）+ 前沿的地板厚度
    for (let u = 0; u < RN; u++) for (let v = 0; v < RN; v++) {
      const [U_, V_] = [u + 6, v + 6];
      cols.push({ u: U_, v: V_, h: RH0, lf: (z) => (z === RH0 - 1 ? '#8a5a36' : '#6a4026'), rf: () => '#4a2e1c', top: (i, r) => { const s = ((u >> 1) + (v >> 1)) % 2; return (i === 0 && r === 0) ? '#7a4e30' : s ? (i % 2 ? '#b8885a' : '#a8784a') : (r ? '#c8985e' : '#b08050'); } });
    }
    // 两面后墙：左后墙（u=6..7，朝右下）、右后墙（v=6..7，朝左下）
    const wallTex = (t, z, i, side) => {
      // t: 沿墙的位置（格），z：高度
      const zz = z - RH0;
      if (zz < 0) return '#6a4026';
      if (zz < 4) return side ? '#7a5038' : '#8a5a3a'; // 踢脚线
      if (zz === WALLH - RH0 - 1) return '#5a3a28';
      const row = Math.floor(zz / 4), cell = Math.floor((t * 2 + i + (row % 2) * 2) / 5);
      let c = a.hash(cell, row, side ? 71 : 72) < 0.5 ? '#ecdcb8' : '#f4e6c6';
      if (zz % 4 === 0 || (t * 2 + i + (row % 2) * 2) % 5 === 0) c = '#d8c49c';
      return side ? a.mix(c, '#3a2a20', 0.12) : c;
    };
    // 右后墙上的窗（v=6..7 那面，朝左下 → lf），左后墙上的挂画位
    const WIN = { t0: 22, t1: 31, z0: RH0 + 16, z1: RH0 + 32 };
    const winTex = (t, z, i) => {
      if (t < WIN.t0 || t > WIN.t1 || z < WIN.z0 || z > WIN.z1) return null;
      if (t === WIN.t0 || t === WIN.t1 || z === WIN.z0 || z === WIN.z1 || t === Math.round((WIN.t0 + WIN.t1) / 2) && i === 0) return '#6a4430';
      const sky = nt ? (z > WIN.z0 + 8 ? '#2a3a6a' : '#3a4a7a') : (z > WIN.z0 + 8 ? '#a8d8f6' : '#cfeafa');
      if (!nt && z < WIN.z0 + 5) return se === 'winter' ? '#ffffff' : se === 'autumn' ? '#d8a050' : '#7cbc62';
      return sky;
    };
    for (let u = 6; u < 6 + RN; u++) for (let v = 4; v < 6; v++) cols.push({ u, v, h: WALLH, lf: (z, i) => (v === 5 ? (winTex(u - 6, z, i) || wallTex(u - 6, z, i, 0)) : '#c8b48c'), rf: () => '#b8a47c', top: () => '#8a5a3a' });
    for (let v = 6; v < 6 + RN; v++) for (let u = 4; u < 6; u++) cols.push({ u, v, h: WALLH, lf: () => '#a89470', rf: (z, i) => (u === 5 ? wallTex(v - 6, z, i, 1) : '#a89470'), top: () => '#8a5a3a' });
    cols.push({ u: 4, v: 4, h: WALLH, lf: () => '#a89470', rf: () => '#a89470', top: () => '#8a5a3a' }, { u: 5, v: 5, h: WALLH, lf: () => '#c8b48c', rf: () => '#b8a47c', top: () => '#8a5a3a' }, { u: 4, v: 5, h: WALLH, lf: () => '#c8b48c', rf: () => '#b8a47c', top: () => '#8a5a3a' }, { u: 5, v: 4, h: WALLH, lf: () => '#c8b48c', rf: () => '#b8a47c', top: () => '#8a5a3a' });
    // 壁炉（固定，靠左后墙）：石头砌的，里面有火
    const box = (u0, v0, du, dv, hh, f) => { const out = []; for (let u = u0; u < u0 + du; u++) for (let v = v0; v < v0 + dv; v++) out.push(Object.assign({ u, v, h: RH0 + hh }, f(u, v))); return out; };
    const fire = box(6, 14, 4, 8, 22, (u, v) => ({
      lf: (z, i) => (v === 21 ? '#9890a8' : '#8a8298'),
      rf: (z, i) => { const zz = z - RH0; if (u !== 9) return '#7a7290'; if (zz >= 2 && zz < 10 && v >= 16 && v <= 19) return zz < 4 ? (nt || cooking ? '#ffb040' : '#e8703a') : zz < 7 ? (H(v + i, zz) < 0.5 ? '#f0903a' : '#3a2a2a') : '#2a2026'; if (zz === 10 || zz === 21) return '#6a6278'; return H(v * 2 + i, zz >> 1) < 0.5 ? '#b0a8bc' : '#9c94aa'; },
      top: () => '#8a5a3a' }));
    cols.push(...fire); occl.push({ cols: fire, bills: [] });
    // 家具
    const spots = {};
    const add = (k, list, u, v, occ = true) => { cols.push(...list); if (occ) occl.push({ cols: list, bills: [] }); spots[k] = { u, v }; };
    if (room.bed === 'bed') add('bed', box(30, 7, 10, 7, 7, (u, v) => ({ lf: (z) => (z - RH0 < 3 ? '#7a4e30' : v === 13 ? (u > 33 ? '#7aa07a' : '#ffffff') : '#e8e0c8'), rf: (z) => (z - RH0 < 3 ? '#5a3a28' : '#d8d0b8'), top: (i, r) => (u < 33 ? '#ffffff' : ((u + v + i) % 2 ? '#7aa07a' : '#e8e0c8')) })).concat(box(30, 7, 1, 7, 13, () => ({ lf: () => '#7a4e30', rf: () => '#5a3a28', top: () => '#a8784a' }))), 35, 15);
    if (room.rug === 'rug') { const rug = []; for (let u = 18; u < 32; u++) for (let v = 22; v < 34; v++) { const d = ((u - 25) / 7) ** 2 + ((v - 28) / 6) ** 2; if (d > 1) continue; rug.push({ u, v, h: RH0, lf: () => null, rf: () => null, top: () => (d > 0.75 ? '#5a8a8a' : d > 0.45 ? '#a8d0c8' : d > 0.2 ? '#e8f0e0' : '#a8d0c8') }); } add('rug', rug, 25, 28, false); }
    const shelf = (u0, v0) => box(u0, v0, 6, 2, 30, (u, v) => ({ lf: (z, i) => { const zz = z - RH0; if (v !== v0 + 1) return '#3a5a3a'; if (zz % 8 === 0 || u === u0 || u === u0 + 5) return '#5a7a5a'; return ['#e8705a', '#5a8ad8', '#ffd36a', '#7cbc62', '#b08af0'][(u * 2 + i + (zz >> 3)) % 5]; }, rf: () => '#3a5a3a', top: () => '#7a9a7a' }));
    const table = (u0, v0) => box(u0, v0, 6, 5, 10, (u, v) => ({ lf: (z) => (z - RH0 >= 8 ? '#a8784a' : (u === u0 || u === u0 + 5) ? '#8a5a3a' : null), rf: (z) => (z - RH0 >= 8 ? '#8a5a3a' : (v === v0 || v === v0 + 4) ? '#6a4026' : null), top: (i, r) => ((u === u0 + 2 && v === v0 + 2) ? '#f4ead8' : '#c8935e') }));
    const piano = (u0, v0) => box(u0, v0, 9, 3, 18, (u, v) => ({ lf: (z, i) => { const zz = z - RH0; if (v !== v0 + 2) return '#4a2a20'; if (zz >= 9 && zz < 11) return (u * 2 + i) % 3 === 0 ? '#2a2a3a' : '#f8f4ec'; return zz > 15 ? '#7a4a38' : '#5a3428'; }, rf: () => '#3a2018', top: () => '#7a4a38' }));
    const plant = (u0, v0) => box(u0, v0, 2, 2, 6, () => ({ lf: () => '#c8705a', rf: () => '#a85a48', top: () => '#4a3020' }));
    const MAKE = { table: table, shelf: shelf, piano: piano, plant: plant };
    if (room.c1 && MAKE[room.c1]) add('c1', MAKE[room.c1](14, 24), 16, 27);
    if (room.c1 === 'lamp') { spots.c1 = { u: 16, v: 26 }; }
    if (room.c2 && MAKE[room.c2]) add('c2', MAKE[room.c2](42, 6), 44, 9);
    if (room.c3 === 'piano') add('c3', piano(13, 6), 17, 10);
    if (room.c3 === 'rocker') spots.c3 = { u: 36, v: 36 };
    // 立着的：台灯、盆栽的叶子、摇椅、挂画由墙面贴图负责
    if (room.c1 === 'lamp') bills.push({ u: 16, v: 26, spr: lampSpr(a, nt) });
    if (room.c2 === 'plant') bills.push({ u: 43, v: 7, spr: leafy(a), dy: -6 });
    if (room.c3 === 'rocker') { const b = { u: 36, v: 36, spr: rockerSpr(a) }; bills.push(b); occl.push({ cols: [], bills: [b] }); }
    bills.push({ u: 8, v: 44, spr: leafy(a), dy: 0 });
    // 门（前面的出口）：前沿的两级石阶
    const exitCols = box(26, 50, 4, 2, 0, () => ({ lf: () => '#a8a0b4', rf: () => '#8a8298', top: (i) => (i ? '#ccc4d8' : '#b8b0c4') }));
    cols.push(...exitCols.map((c) => Object.assign(c, { h: RH0 - 1 })));
    rockUnder(P, cols.filter((c) => c.h === RH0 && c.u >= 6 && c.v >= 6), se === 'winter');
    vox(P, cols, bills);
    // 挂画（贴在左后墙上）
    if (room.wall === 'painting') { const pv = 30, pz = RH0 + 24; for (let t = 0; t < 8; t++) for (let z = 0; z < 10; z++) { const x = OX + 2 * (5 - (6 + pv - 6 + t)) + 2, y = OY + 5 + 6 + pv - 6 + t - pz - z; const edge = t === 0 || t === 7 || z === 0 || z === 9; P.set(x, y, edge ? '#8a5a3a' : z < 4 ? '#7cbc62' : z < 6 ? '#a8d8f6' : '#cfeafa'); P.set(x + 1, y, edge ? '#6a4026' : z < 4 ? '#6aaa54' : '#a8d8f6'); } spots.wall = { u: 6, v: 30 }; }
    PP.gradePix && PP.gradePix(P.d);
    roomCache = { key, cv: P.canvas(), occ: occl.map((o) => occluder(o.cols, o.bills)).filter(Boolean), spots, stove: { u: 11, v: 18 }, exit: { u: 28, v: 50 }, win: [cx(32, 5), cy(32, 5, WIN.z0 + 8)], lamp: room.c1 === 'lamp' ? spots.c1 : null };
    return roomCache;
  }
  function k_puffs(P) { const k = K(); k.puffCloud(P, 60, IH - 6, 46, 9, false); k.puffCloud(P, 170, IH - 4, 60, 10, false); }
  function lampSpr(a, nt) { const l = a.spr(7, 16); l.rect(2, 13, 4, 3, '#8a5a3a'); l.vl(4, 6, 7, '#5a5466'); l.rect(1, 1, 7, 5, nt ? '#ffe9a8' : '#f6d27a'); l.hl(1, 1, 7, '#fff2c8'); return l.outline('#3a2630'); }
  function leafy(a) { const p = a.spr(12, 14); p.ell(6.5, 7, 5.5, 6.5, (nx, ny) => (ny < -0.4 || nx < -0.5 ? '#86cc6a' : ny > 0.4 ? '#3f8a44' : '#5aa64e')); p.rect(4, 11, 5, 4, '#c8705a'); return p.outline('#2a3a2a'); }
  function rockerSpr(a) { const r = a.spr(16, 16); r.rect(3, 1, 3, 10, '#a8784a'); r.rect(3, 8, 10, 3, '#c8935e'); r.vl(4, 1, 9, '#d8a868'); r.rect(11, 6, 2, 6, '#8a5a3a'); for (let x = 1; x < 16; x++) r.set(x, 14 - Math.round(Math.abs(x - 8) / 4), '#7a4e30'); r.vl(4, 11, 3, '#8a5a3a'); r.vl(12, 11, 3, '#8a5a3a'); return r.outline('#3a2630'); }

  // ---------- 位置 ----------
  function layout() {
    const u = Math.max(1, Math.min(3, Math.round(G.S || 2)));
    const x1 = G.W - 8, y1 = G.H - 2;
    L = { u, x0: x1 - IW * u, y0: y1 - IH * u, x1, y1 };
    return L;
  }
  const sx = (x) => L.x0 + x * L.u, sy = (y) => L.y0 + y * L.u;
  const scrU = (u, v) => sx(cx(u, v)), scrV = (u, v, z = HG) => sy(cy(u, v, z));
  // 屏幕点 → 格子（地面高度上）
  function toUV(x, y, z) { const X = (x - L.x0) / L.u - OX - 2, Y = (y - L.y0) / L.u - OY + z; return [(Y + X / 2) / 2, (Y - X / 2) / 2]; }
  // “排”：d = u + v（越大越靠前）；动物的 lane 0..1 对应能走的最远一排到最近一排
  const D0 = 36, D1 = 92, RD0 = 26, RD1 = 84;
  function blocked(u, v) {
    if (inside) return u < 8 || v < 8 || u > RN + 4 || v > RN + 4 || (u < 11 && v >= 13 && v <= 22) || (E().room.bed === 'bed' && u >= 29 && u <= 40 && v <= 14);
    if (!inIsle(u, v) || !inIsle(u + 1.5, v + 1.5) || !inIsle(u - 1.5, v - 1.5)) return true;
    if (u >= HOUSE.u0 - 0.5 && u <= HOUSE.u1 + 1 && v >= HOUSE.v0 - 0.5 && v <= HOUSE.v1 + 0.5) return true;
    if ((u - POND.u) ** 2 + (v - POND.v) ** 2 <= (POND.r + 1.5) ** 2) return true;
    if (PLOTS.some(([pu, pv]) => u >= pu - 0.5 && u < pu + 3.5 && v >= pv - 0.5 && v < pv + 3.5)) return true;
    if (Math.hypot(u - MILL.u, v - MILL.v) < 3.5 || Math.hypot(u - FIRE.u, v - FIRE.v) < 2.5 || Math.hypot(u - BALLOON.u, v - BALLOON.v) < 4) return true;
    return false;
  }
  function floorY(p) {
    if (!L) layout();
    const z = inside ? RH0 : HG;
    if (p.isleSpot) return Math.round(sy(cy(p.isleSpot.u, p.isleSpot.v, p.isleSpot.z != null ? p.isleSpot.z : z)));
    const d0 = inside ? RD0 : D0, d1 = inside ? RD1 : D1;
    const want = d0 + U.clamp(p.lane != null ? p.lane : 0.4, 0, 1) * (d1 - d0);
    const X = (p.x - L.x0) / L.u - OX - 2, du = X / 2; // u - v
    // 从想去的那一排开始，往前后找一排没被挡住的
    for (let k = 0; k < 60; k++) {
      for (const sgn of k ? [1, -1] : [1]) {
        const d = want + sgn * k;
        if (d < d0 - 6 || d > d1 + 6) continue;
        const u = (d + du) / 2, v = (d - du) / 2;
        if (!blocked(u, v)) return Math.round(sy(OY + d - z));
      }
    }
    return Math.round(sy(OY + want - z));
  }
  function groundY() { if (!L) layout(); return Math.round(sy(OY + (inside ? (RD0 + RD1) / 2 : (D0 + D1) / 2) - (inside ? RH0 : HG))); }
  function zone() { if (!L) layout(); return inside ? [sx(cx(8, 50)), sx(cx(50, 8))] : [sx(cx(6, 46)), sx(cx(46, 6))]; }
  function sync() {
    const w = want();
    if (w && !G.isle) { G.isle = {}; inside = false; layout(); fit(true); }
    else if (!w && G.isle) { G.isle = null; inside = false; for (const p of G.all) { p.isleSpot = null; p.lane = null; p.fishing = null; } window.dispatchEvent(new Event('resize')); }
    bar();
  }
  function fit(moveIn) {
    layout(); G.ground = groundY();
    const [a, b] = zone();
    for (const p of G.pets) {
      if (moveIn || p.x < a || p.x > b) { p.interrupt(true); p.x = U.clamp(moveIn ? scrU(DOOR.u + 3, HOUSE.v1 + 4) : p.x, a, b); }
      if (moveIn) { p.lane = 0.35; p.isleSpot = null; }
      if (!p.held) { p.y = p.floor; p.airborne = false; }
    }
    PP.placeOrb && PP.placeOrb();
  }
  window.addEventListener('resize', () => { if (G.isle) setTimeout(() => fit(false), 0); });

  // ---------- 菜 ----------
  const cropCache = {};
  function cropSpr(crop, stage) {
    const key = crop + stage; if (cropCache[key]) return cropCache[key];
    const a = ART(), s = a.spr(9, 16), L1 = '#5aa64e', L2 = '#86cc6a', L0 = '#3f8a44';
    if (stage === 0) { s.set(3, 15, '#3a2410'); s.set(6, 15, '#3a2410'); s.set(4, 14, L2); }
    else if (stage === 1) { s.vl(5, 12, 4, L1); s.set(4, 11, L2); s.set(6, 11, L2); s.set(3, 12, L1); s.set(7, 12, L1); }
    else {
      const big = stage === 3;
      if (crop === 'corn' || crop === 'sunflower') {
        const h = big ? 15 : 10; s.vl(5, 16 - h, h, L0); for (let y = 16 - h + 2; y < 15; y += 3) { s.set(4, y, L1); s.set(3, y + 1, L2); s.set(6, y + 1, L1); s.set(7, y + 2, L2); }
        if (big && crop === 'corn') { s.rect(6, 6, 2, 5, '#ffd36a'); s.set(6, 6, '#fff0a0'); s.vl(8, 7, 3, L2); }
        if (big && crop === 'sunflower') s.ell(5, 2, 3, 2.6, (nx, ny) => (nx * nx + ny * ny < 0.25 ? '#7a4a2a' : ny < -0.3 ? '#ffe27a' : '#f6c43a'));
      } else {
        s.ell(5, 12, big ? 4 : 3, big ? 3 : 2.5, (nx, ny) => (ny < -0.3 ? L2 : ny > 0.4 ? L0 : L1));
        if (big && crop === 'carrot') { s.rect(4, 14, 3, 2, '#f08a3a'); s.set(4, 14, '#ffb070'); }
        if (big && crop === 'berry') for (const [x, y] of [[2, 13], [7, 12], [4, 15], [6, 14]]) { s.set(x, y, '#e8405a'); s.set(x, y - 1, '#ff8a9a'); }
        if (big && crop === 'pumpkin') s.ell(5, 13, 4.2, 3, (nx, ny) => (Math.abs(nx) < 0.15 ? '#c9601a' : ny < -0.4 ? '#ffa850' : '#f2832a'));
      }
    }
    return (cropCache[key] = s.outline('#2a3a22').canvas());
  }

  // ---------- 画 ----------
  function glow(ctx, x, y, r, col = 'rgba(255,214,140,') {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col + '0.45)'); g.addColorStop(1, col + '0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function drawArt(ctx, cv, ax, ay) { ctx.drawImage(cv, Math.round(sx(ax)), Math.round(sy(ay)), cv.width * L.u, cv.height * L.u); }
  function renderBack(ctx) {
    if (!G.isle) return;
    if (!L) layout();
    const u = L.u, nt = night(), now = performance.now();
    ctx.save(); ctx.imageSmoothingEnabled = false;
    // 岛轻轻地上下漂
    if (inside) {
      const r = buildRoom();
      ctx.drawImage(r.cv, L.x0, L.y0, IW * u, IH * u);
      if (nt && r.lamp) glow(ctx, scrU(r.lamp.u, r.lamp.v), scrV(r.lamp.u, r.lamp.v, RH0 + 14), 30 * u);
      glow(ctx, scrU(10, 18), scrV(10, 18, RH0 + 6), (cooking ? 30 : nt ? 24 : 14) * u, 'rgba(255,170,90,');
      if (cooking && Math.random() < 0.2) smoke.push({ x: cx(8, 18) + U.rand(-2, 2), y: cy(8, 18, RH0 + 22), t: 0 });
    } else {
      const c = build();
      ctx.drawImage(c.cv, L.x0, L.y0, IW * u, IH * u);
      const e = E();
      // 菜
      PLOTS.forEach(([pu, pv], i) => {
        const inf = PP.econ.plotInfo(i); if (!inf) return;
        const cv = cropSpr(inf.crop, inf.stage);
        for (const [du, dv] of [[0.5, 0.5], [2, 0.5], [0.5, 2], [2, 2]]) { const x = cx(pu + du, pv + dv), y = cy(pu + du, pv + dv, HG); ctx.drawImage(cv, Math.round(sx(x - cv.width / 2)), Math.round(sy(y - cv.height + 2)), cv.width * u, cv.height * u); }
        if (e.farm[i] && e.farm[i].water) { ctx.fillStyle = 'rgba(160,210,255,.5)'; ctx.fillRect(sx(cx(pu + 1.5, pv + 3)) - u, sy(cy(pu + 1.5, pv + 3, HG)) - u, 2 * u, u); }
        if (inf.stage === 3 && Math.floor(now / 600) % 2) { ctx.fillStyle = '#fff6c8'; ctx.fillRect(sx(cx(pu + 2, pv)), sy(cy(pu + 2, pv, HG + 16)), u, u); }
      });
      // 风车叶片（转）
      const mx = sx(cx(MILL.u + 2.2, MILL.v)), my = sy(cy(MILL.u + 2.2, MILL.v, HG + 26)), ang = now / 1600;
      ctx.fillStyle = '#e8dcc0'; ctx.strokeStyle = '#7a5a40';
      for (let k = 0; k < 4; k++) { const t = ang + k * Math.PI / 2; ctx.save(); ctx.translate(mx, my); ctx.rotate(t); ctx.fillStyle = '#7a5a40'; ctx.fillRect(-u / 2, 0, u, 16 * u); ctx.fillStyle = k % 2 ? '#f4ead6' : '#e8dcc0'; ctx.fillRect(u / 2, 4 * u, 4 * u, 11 * u); ctx.restore(); }
      ctx.fillStyle = '#5a3a28'; ctx.fillRect(mx - u, my - u, 2 * u, 2 * u);
      // 篝火
      const fx = sx(cx(FIRE.u, FIRE.v)), fy = sy(cy(FIRE.u, FIRE.v, HG)) - 2 * u;
      const fl = [['#ffe27a', 2, 5], ['#f6a03a', 3, 4], ['#e8604a', 4, 3]];
      for (const [col, w, h] of fl.reverse()) { const j = Math.sin(now / 90 + w) * u; ctx.fillStyle = col; ctx.fillRect(fx - w * u + j, fy - h * u * (1 + 0.25 * Math.sin(now / 120 + h)), w * 2 * u, h * u * (1 + 0.25 * Math.sin(now / 120 + h))); }
      if (nt) glow(ctx, fx, fy - 4 * u, 34 * u, 'rgba(255,170,90,');
      if (Math.random() < 0.05) smoke.push({ x: cx(FIRE.u, FIRE.v), y: cy(FIRE.u, FIRE.v, HG + 6), t: 0 });
      // 池塘的波光、鱼漂
      if (season() !== 'winter') { ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 5; i++) { const t = now / 1400 + i * 1.7, pu = POND.u + Math.sin(t * 0.7 + i) * POND.r * 0.55, pv = POND.v + Math.cos(t * 0.5 + i * 2) * POND.r * 0.55; if (Math.sin(t * 3) > 0.2) ctx.fillRect(scrU(pu, pv), scrV(pu, pv, HG - 2), 2 * u, u); } }
      for (const p of G.pets) if (p.fishing) { const bu = DOCK.u1 + 3, bv = DOCK.v, bx = scrU(bu, bv), by = scrV(bu, bv, HG - 2) + (p.fishing.bite ? u : 0) + Math.sin(now / 300) * u * 0.6; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x + p.facing * 10 * G.S, p.y - 18 * G.S); ctx.lineTo(bx, by); ctx.stroke(); ctx.fillStyle = '#e8405a'; ctx.fillRect(bx - u, by - u, 2 * u, u); ctx.fillStyle = '#fff'; ctx.fillRect(bx - u, by, 2 * u, u); }
      // 烟囱冒烟
      if (Math.random() < (cooking || G.all.some((p) => p.inHouse) ? 0.12 : 0.03)) smoke.push({ x: c.chimney.x, y: c.chimney.y, t: 0 });
      if (nt) { for (const [x, y] of c.lights) glow(ctx, sx(x), sy(y), 10 * u); glow(ctx, scrU(23, 24), scrV(23, 24, HG + 14), 20 * u); for (const sl of c.slots) if (sl.id === 'lampPost' || sl.id === 'lantern') glow(ctx, scrU(sl.u, sl.v), scrV(sl.u, sl.v, HG + 12), 20 * u); }
      if (nt && season() === 'summer') { ctx.fillStyle = '#fff6a0'; for (let i = 0; i < 7; i++) { const t = now / 1000 + i * 3.1; if (Math.sin(t * 2.3 + i) > 0) { const pu = 10 + ((i * 13 + Math.sin(t) * 4) % 36), pv = 10 + ((i * 7 + Math.cos(t * 0.8) * 4) % 36); ctx.fillRect(scrU(pu, pv), scrV(pu, pv, HG + 8 + Math.sin(t * 2) * 3), u, u); } } }
    }
    smoke = smoke.filter((m) => (m.t += 1 / 60) < 3);
    for (const m of smoke) { const a = 1 - m.t / 3; ctx.fillStyle = `rgba(240,240,248,${(a * 0.6).toFixed(2)})`; const r = (1 + m.t * 1.4) * u; ctx.fillRect(sx(m.x + Math.sin(m.t * 2) * 2 + m.t * 3) - r, sy(m.y - m.t * 9) - r, r * 2, r * 2); }
    ctx.restore();
  }
  // 动物走到东西后面：把那个东西再画一遍盖住它
  function renderFront(ctx) {
    if (!G.isle || !L) return;
    const u = L.u, data = inside ? buildRoom() : build(), z = inside ? RH0 : HG;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    const drawn = new Set();
    for (const p of G.pets) {
      if (p.held) continue;
      const fx = (p.x - L.x0) / u, fy = (p.y - L.y0) / u, d = fy - OY + z, half = 12 * G.S / u, top = fy - 30 * G.S / u;
      for (const o of data.occ) {
        if (drawn.has(o) || fx + half < o.x0 || fx - half > o.x1 || fy < o.y0 || top > o.y1) continue;
        let od = -1; for (let x = Math.max(o.x0, Math.floor(fx - half)); x <= Math.min(o.x1, Math.ceil(fx + half)); x++) od = Math.max(od, o.dAt[x]);
        if (od > d + 0.5) { drawn.add(o); ctx.drawImage(o.cv, Math.round(sx(o.x0)), Math.round(sy(o.y0)), o.cv.width * u, o.cv.height * u); }
      }
    }
    if (!inside && PP.econ.unread()) {
      // 信箱上的“信”气泡
      const bob = Math.sin(performance.now() / 400) * 1.5, x = scrU(MAILB.u, MAILB.v) - 5 * u, y = scrV(MAILB.u, MAILB.v, HG + 22 + bob);
      ctx.fillStyle = '#3a2630'; ctx.fillRect(x - u, y - u, 12 * u, 10 * u); ctx.fillStyle = '#fffaf0'; ctx.fillRect(x, y, 10 * u, 8 * u); ctx.fillStyle = '#3a2630'; ctx.fillRect(x + 4 * u, y + 9 * u, 2 * u, u);
      ctx.fillStyle = '#e8705a'; ctx.fillRect(x + 2 * u, y + 2 * u, 6 * u, u); ctx.fillRect(x + 2 * u, y + 2 * u, u, 4 * u); ctx.fillRect(x + 7 * u, y + 2 * u, u, 4 * u); ctx.fillRect(x + 2 * u, y + 5 * u, 6 * u, u);
    }
    ctx.restore();
    if (hover && !G.hoverPet) { const t = hoverText(hover); if (t) PP.drawPixelLabel(ctx, t, Math.round(hover.lx), Math.round(Math.max(10, hover.ly)), { size: 12 }); }
  }
  const fmtLeft = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} 小时 ${m % 60} 分` : `${m} 分钟`; };
  function hoverText(h) {
    if (h.k === 'door') return '进小屋';
    if (h.k === 'exit') return '出门';
    if (h.k === 'stove') return '在壁炉边做点心';
    if (h.k === 'mail') return PP.econ.unread() ? `信箱：${PP.econ.unread()} 封新信` : '信箱';
    if (h.k === 'pond') return '去钓鱼';
    if (h.k === 'fire') return '烤火 / 烤点吃的';
    if (h.k === 'balloon') { const t = G.all.find((p) => p.d.trip); return t ? `${t.name} 坐热气球去${PP.SCENES[t.d.trip.to] ? PP.SCENES[t.d.trip.to].name : '远方'}了` : '热气球：派伙伴去探险'; }
    if (h.k === 'plot') { const inf = PP.econ.plotInfo(h.i); if (!inf) return '空地：点一下种菜'; const n = PP.econ.ITEMS[PP.econ.CROPS[inf.crop].item].name; return inf.stage === 3 ? `${n}成熟啦！点一下收获` : `${n}：还有 ${fmtLeft(inf.left)}`; }
    return '';
  }

  // ---------- 点 ----------
  function hot(x, y) {
    hover = null;
    if (!G.isle || !L || G.editing) return null;
    if (x < L.x0 || x > L.x1 || y < L.y0 || y > L.y1) return null;
    let h = null;
    const near = (u, v, z, rx, ry) => { const X = scrU(u, v), Y = scrV(u, v, z); return Math.abs(x - X) <= rx * L.u && y >= Y - ry * L.u && y <= Y + 3 * L.u; };
    if (inside) {
      if (near(28, 51, RH0, 8, 6)) h = { k: 'exit' };
      else if (near(9, 18, RH0, 8, 22)) h = { k: 'stove' };
    } else {
      const [gu, gv] = toUV(x, y, HG);
      if (near(DOOR.u + 0.5, HOUSE.v1 + 1, HG, 4, 13)) h = { k: 'door' };
      else if (near(MAILB.u, MAILB.v, HG, 5, 12)) h = { k: 'mail' };
      else if (near(BALLOON.u, BALLOON.v, HG, 13, 46)) h = { k: 'balloon' };
      else if (near(FIRE.u, FIRE.v, HG, 8, 8)) h = { k: 'fire' };
      else if ((gu - POND.u) ** 2 + (gv - POND.v) ** 2 <= POND.r * POND.r || (gu >= DOCK.u0 && gu <= DOCK.u1 + 1 && Math.abs(gv - DOCK.v) < 1.5)) h = { k: 'pond' };
      else PLOTS.forEach(([pu, pv], i) => { if (!h && gu >= pu - 0.5 && gu < pu + 3.5 && gv >= pv - 0.5 && gv < pv + 3.5) h = { k: 'plot', i }; });
    }
    if (!h) return null;
    h.isle = true; h.lx = x; h.ly = y - 22; hover = h;
    return h;
  }
  function mainP() { const p = PP.F.main(); return p && G.pets.includes(p) && !p.held ? p : null; }
  function click(h, x, y) {
    if (!h) return;
    const p = mainP(), go = (name, fn, ...args) => { if (p) { p.interrupt(true); p.run(name, fn, ...args); } };
    if (h.k === 'door') { if (p) go('isleHouse', A.isleHouse, true); else setInside(true); return; }
    if (h.k === 'exit') { if (p) go('isleHouse', A.isleHouse, false); else setInside(false); return; }
    if (h.k === 'mail') { PP.econ.openPanel('mail'); return; }
    if (h.k === 'stove') { go('isleCook', A.isleCook); return; }
    if (h.k === 'pond') { go('isleFish', A.isleFish); return; }
    if (h.k === 'fire') { go('isleFire', A.isleFire); return; }
    if (h.k === 'balloon') { PP.econ.openPanel('trip'); return; }
    if (h.k === 'plot') {
      const inf = PP.econ.plotInfo(h.i);
      if (inf && inf.stage === 3) { PP.econ.harvest(h.i); if (p) p.think('heart', 1.5); return; }
      if (inf) { if (p && !p.sleeping && (PP.econ.E().farm[h.i].water || 0) < 3) go('isleWater', A.isleWater, h.i); else PP.ui.toast(hoverText(h)); return; }
      const e = PP.econ.E(), seeds = Object.keys(e.bag).filter((k) => PP.econ.ITEMS[k] && PP.econ.ITEMS[k].kind === 'seed' && e.bag[k] > 0);
      if (!seeds.length) { PP.ui.toast('背包里没有种子：去商店买几颗（2 小鱼干起）'); PP.econ.openPanel('shop', { sub: 'seed' }); return; }
      PP.ui.menu([{ label: '种点什么？', enabled: false }, '-', ...seeds.map((k) => ({ id: `isle:plant:${h.i}:${k}`, label: `${PP.econ.ITEMS[k].name} ×${e.bag[k]}`, hint: PP.econ.ITEMS[k].desc }))], x, y - 10);
    }
  }
  function cmd(a, b, c) {
    if (a === 'plant' && PP.econ.plant(+b, c)) { PP.ui.toast(`种下了${PP.econ.ITEMS[c].name.replace('种子', '')}`); const p = mainP(); if (p && !p.sleeping) { p.interrupt(true); p.run('isleWater', A.isleWater, +b); } }
  }
  function setInside(v) {
    if (inside === v) return;
    inside = v; hover = null; smoke = [];
    layout(); G.ground = groundY();
    for (const q of G.pets) { q.interrupt(true); q.held = false; q.airborne = false; q.isleSpot = null; q.fishing = null; q.inHouse = v; q.lane = v ? 0.95 : 0.05; q.x = v ? scrU(28, 46) : scrU(DOOR.u + 1, HOUSE.v1 + 3); q.y = q.floor; q.facing = v ? -1 : 1; }
    roomT = 0;
    PP.placeOrb && PP.placeOrb();
  }

  // ---------- 主角在岛上过日子 ----------
  let roomT = 0;
  const day = () => { const e = E(); const d = new Date().toDateString(); if (!e.isleDay || e.isleDay.d !== d) e.isleDay = { d, fish: 0, cook: 0 }; return e.isleDay; };
  // 走到某一格（先换到那一排，再横着走过去）
  function* walkTo(p, u, v) {
    p.isleSpot = null;
    const d0 = inside ? RD0 : D0, d1 = inside ? RD1 : D1;
    yield p.goto(scrU(u, v), false, U.clamp((u + v - d0) / (d1 - d0), 0, 1));
  }
  A.isleOut = function* () { const p = this; p.facing = 1; p.anim = 'idle'; p.eyes = 'happy'; p.jolt(0, -3); yield 0.5; yield* walkTo(p, DOOR.u + 3, HOUSE.v1 + 5); p.eyes = 'open'; };
  A.isleWater = function* (i) {
    const p = this, [pu, pv] = PLOTS[i];
    yield* walkTo(p, pu + 1.5, pv - 1.5); p.facing = -1; p.anim = 'idle'; p.eyes = 'happy';
    for (let k = 0; k < 6; k++) { PP.fx({ x: scrU(pu + 1 + (k % 3), pv + 1), y: scrV(pu + 1, pv + 1, HG + 10), vy: 22, icon: 'drop', life: 0.6, s: 1 }); yield 0.22; }
    if (PP.econ.waterPlot(i)) p.think('heart', 1);
    yield 0.6;
  };
  A.isleMail = function* () { const p = this; yield* walkTo(p, MAILB.u - 3, MAILB.v - 2); p.facing = 1; p.think('excl', 1.5); yield 1.2; p._forceSay = true; p.say('信箱里有信哦～', 3); p._forceSay = false; yield 2; };
  A.isleDrink = function* () { const p = this; yield* walkTo(p, POND.u - POND.r - 1, POND.v + 4); p.facing = 1; p.anim = 'eat'; yield 2; p.n.thirst = 100; p.anim = 'idle'; p.eyes = 'happy'; p.think('heart', 1); yield 1; };
  A.isleFire = function* () { const p = this; yield* walkTo(p, FIRE.u - 3, FIRE.v); p.facing = 1; p.anim = 'sit'; p.think(U.pick(['meat', 'bread', 'corn']), 2.5); yield 3; p.anim = 'eat'; yield 1.5; p.n.hunger = Math.min(100, p.n.hunger + 25); p.n.fun = Math.min(100, p.n.fun + 8); p.anim = 'sit'; p.eyes = night() ? 'sleepy' : 'happy'; yield U.rand(3, 7); p.anim = 'idle'; p.eyes = 'open'; };
  A.isleFish = function* () {
    const p = this;
    yield* walkTo(p, DOCK.u0 - 2, DOCK.v);
    p.isleSpot = { u: DOCK.u1 - 1, v: DOCK.v - 0.5, z: HG };
    const tx = scrU(DOCK.u1 - 1, DOCK.v - 0.5); p.target = tx; p.tLane = null; yield () => p.target == null;
    p.facing = 1; p.anim = 'sit'; p.fishing = { bite: false };
    yield U.rand(4, 10);
    p.fishing.bite = true; p.eyes = 'wide'; p.think('excl', 0.8); yield 0.8;
    p.anim = 'jump'; p.jolt(0, -4); p.fishing = null;
    const d = day(), got = Math.random() < 0.55;
    if (got && d.fish < 12 && Math.random() < 0.6) { d.fish++; PP.econ.addFish(1, `${p.name}钓到一条鱼`); }
    else if (got) { PP.fx({ x: p.x + 12 * G.S, y: p.y - 30 * G.S, vy: -30, icon: 'fish', life: 1.2, s: Math.max(1, G.S - 1) }); p._forceSay = true; p.say(U.pick(['钓到啦！太小了，放回去～', '小鱼小鱼，回家吧', '嘿嘿，又一条']), 2.5); p._forceSay = false; }
    else { p._forceSay = true; p.say(U.pick(['跑掉了……', '哎呀，只钓到一根水草', '下次一定！']), 2.5); p._forceSay = false; }
    yield 0.6; p.anim = 'idle'; p.eyes = 'happy'; p.n.fun = Math.min(100, p.n.fun + 15); yield 1.4;
    p.target = scrU(DOCK.u0 - 2, DOCK.v); yield () => p.target == null; p.isleSpot = null;
  };
  A.isleCook = function* () {
    const p = this;
    yield* walkTo(p, 13, 19); p.facing = -1; p.anim = 'idle'; cooking = true; p.think(U.pick(['cake', 'bowl', 'bread']), 3);
    for (let k = 0; k < 8; k++) { if (k % 3 === 0) PP.fx({ x: scrU(10, 18), y: scrV(10, 18, RH0 + 10), vy: -14, icon: 'sparkle', life: 0.8, s: 1 }); p.jolt(k % 2 ? 1 : -1, 0); yield 0.5; }
    cooking = false;
    const d = day();
    if (d.cook < 4 && Math.random() < 0.5) { d.cook++; PP.econ.give('biscuit', 1); PP.ui.toast(`${p.name}烤了一块小饼干，放进背包了`); }
    else { p.n.hunger = Math.min(100, p.n.hunger + 30); p._forceSay = true; p.say('做了点好吃的，自己先吃啦～', 2.5); p._forceSay = false; p.anim = 'eat'; yield 1.5; }
    p.anim = 'idle'; p.eyes = 'happy'; yield 1;
  };
  A.isleSit = function* (sl) {
    const p = this; yield* walkTo(p, sl.u + 1, sl.v + 1); p.facing = Math.random() < 0.5 ? 1 : -1;
    if (sl.id === 'hay') { p.anim = 'lie'; yield U.rand(5, 10); }
    else if (sl.id === 'swing') { p.anim = 'sit'; const x0 = p.x; for (let t = 0; t < 8; t += 0.1) { p.x = x0 + Math.sin(t * 2.4) * 3 * L.u; p.facing = Math.cos(t * 2.4) > 0 ? 1 : -1; yield 0.1; } p.x = x0; }
    else { p.anim = 'sit'; p.eyes = Math.random() < 0.5 ? 'happy' : 'open'; yield U.rand(5, 9); }
    p.anim = 'idle';
  };
  A.isleHouse = function* (go) {
    const p = this;
    if (go) { yield* walkTo(p, DOOR.u + 0.5, HOUSE.v1 + 2); p.facing = -1; yield 0.3; setInside(true); }
    else { yield* walkTo(p, 28, 48); p.facing = 1; yield 0.3; setInside(false); }
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
  // 小岛上不用电脑的小门：进出都走小屋的门
  const baseEnter = A.enterDoor, baseEmerge = A.emerge;
  A.enterDoor = function* (done) {
    if (!G.isle) { yield* baseEnter.call(this, done); return; }
    const p = this;
    if (!inside) { yield* walkTo(p, DOOR.u + 0.5, HOUSE.v1 + 2); p.facing = -1; yield 0.2; }
    p.inDoor = true; done && done();
  };
  A.emerge = function* () {
    if (!G.isle) { yield* baseEmerge.call(this); return; }
    const p = this; p.inDoor = false; p.x = doorX(); p.y = p.floor; yield* A.isleOut.call(p);
  };
  const baseDecide = PP.Pet.prototype.decide;
  PP.Pet.prototype.decide = function () {
    if (G.isle && G.pets.includes(this) && !this.held && !(G.save.settings.quiet) && Math.random() < 0.45) {
      const e = E(), p = this;
      if (inside) {
        roomT++;
        const r = buildRoom(), ks = Object.keys(r.spots).filter((k) => k !== 'wall');
        if (ks.includes('bed') && p.n.energy < 65 && Math.random() < 0.6) { p.run('isleFurn', A.isleFurn, 'bed'); return; }
        if (roomT > 4 && Math.random() < 0.35) { p.run('isleHouse', A.isleHouse, false); return; }
        if (Math.random() < 0.25) { p.run('isleCook', A.isleCook); return; }
        if (ks.length && Math.random() < 0.6) { p.run('isleFurn', A.isleFurn, U.pick(ks)); return; }
      } else {
        const grow = PLOTS.map((_, i) => i).filter((i) => { const inf = PP.econ.plotInfo(i); return inf && inf.stage < 3 && (e.farm[i].water || 0) < 3; });
        if (grow.length && Math.random() < 0.3) { p.run('isleWater', A.isleWater, U.pick(grow)); return; }
        if (PP.econ.unread() && Math.random() < 0.25) { p.run('isleMail', A.isleMail); return; }
        if (p.n.thirst < 60 && Math.random() < 0.5) { p.run('isleDrink', A.isleDrink); return; }
        if ((p.n.hunger < 60 || night()) && Math.random() < 0.35) { p.run('isleFire', A.isleFire); return; }
        const sl = build().slots.filter((s) => ['bench', 'swing', 'hay'].includes(s.id));
        if (sl.length && Math.random() < 0.3) { p.run('isleSit', A.isleSit, U.pick(sl)); return; }
        if (Math.random() < 0.22) { p.run('isleFish', A.isleFish); return; }
        if ((night() || p.n.energy < 40) && Math.random() < 0.5 || Math.random() < 0.1) { p.run('isleHouse', A.isleHouse, true); return; }
      }
    }
    return baseDecide.call(this);
  };

  // ---------- 小岛旁边的一列圆按钮（背包 / 商店 / 探险 / 图鉴 / 信箱 / 布置） ----------
  let barEl = null, barNear = 0;
  const BAR = [['bag', '背包', 'gift'], ['shop', '商店', 'fish'], ['trip', '探险', 'star'], ['book', '图鉴', 'book'], ['mail', '信箱', 'note'], ['home', '布置', 'heart']];
  function bar() {
    if (!G.isle) { if (barEl) { barEl.remove(); barEl = null; PP.refreshInteractive && PP.refreshInteractive(); } return; }
    if (!barEl) {
      barEl = document.createElement('div'); barEl.className = 'isle-bar far';
      for (const [k, n, ic] of BAR) {
        const b = document.createElement('button'); b.title = n; b.dataset.k = k;
        const [w, h] = PP.SPR.iconSize(ic) || [8, 8], cv = document.createElement('canvas'), s = Math.max(1, Math.floor(16 / Math.max(w, h)));
        cv.width = w * s; cv.height = h * s; PP.SPR.drawIcon(cv.getContext('2d'), ic, 0, 0, s); b.appendChild(cv);
        b.onclick = () => PP.econ.openPanel(k);
        barEl.appendChild(b);
      }
      document.body.appendChild(barEl);
    }
  }
  function placeBar() {
    if (!barEl || !L) return;
    barEl.style.left = Math.round(L.x0 + 4) + 'px'; barEl.style.top = Math.round(sy(OY + 20)) + 'px';
    const M = G.mouse, near = M.onScreen && M.x > L.x0 - 40 && M.x < L.x1 && M.y > sy(OY) && M.y < L.y1;
    if (near || barEl.matches(':hover') || document.querySelector('.ecopanel')) barNear = performance.now() + 1500;
    const show = performance.now() < barNear, was = !barEl.classList.contains('far');
    if (show !== was) { barEl.classList.toggle('far', !show); PP.refreshInteractive && PP.refreshInteractive(); }
    const mb = barEl.querySelector('[data-k="mail"]'); if (mb) mb.classList.toggle('new', PP.econ.unread() > 0);
  }
  (function loop() { try { if (G.isle) placeBar(); } catch (e) {} requestAnimationFrame(loop); })();

  function dirty() { dirtyK++; cache = null; roomCache = null; }
  setInterval(() => { if (PP.started && G.save) sync(); }, 1500);
  const doorX = () => { if (!L) layout(); return inside ? scrU(28, 48) : scrU(DOOR.u + 0.5, HOUSE.v1 + 2); };
  PP.isle = { doorX, floorY, sync, layout, groundY, zone, renderBack, renderFront, hot, click, cmd, dirty, inside: () => inside, setInside, rect: () => L, SLOT_NAME };
})();
