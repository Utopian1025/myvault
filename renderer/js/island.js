// 小岛视图：一座东拼西凑的浮空小城堡，真 3D（引擎 isle3d.js，模型 isle_models.js）。这里是玩法：
//   每个模块有自己的地面高度（院子、树台、石头露台、鱼塘台、屋顶露台、舱顶），之间用台阶 / 楼梯连着
//   宠物在“世界坐标”里走路：匀速、会绕开房子和菜箱（寻路）、上下楼梯；被挡住时把挡它的东西挖开
//   鼠标指到的东西按模型精确判定（拾取），鼠标变成对应的手型：进门 / 钓鱼 / 播种 / 浇水 / 收获 / 使用 / 休息 / 看
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G, A = PP.ACTIONS, g3 = PP.g3, MD = PP.isleModels, K = MD.K;
  const { ORG, R0, HOUSE, GH, PICK, HU1, HV1, GU1, GV1, LOFT, Z, DOOR, GDOOR, TREE, TANK, MAILB, BALLOON, POND, FISH, BOB, PLOTS, PS, PH, SLOTS, LAMPS, RDOOR, GRDOOR, COOP, HIVE } = K, T = K.T;
  const SLOT_NAME = ['门口', '桥那边的草坪', '塘边', '水井旁', '大树下', '小河边'];
  const S = () => G.save.settings, E = () => PP.econ.E();
  let chickT = 0, beeBoost = 0;
  let L = null, inside = false, hover = null, dirtyK = 0, smoke = [], cooking = false, mark = null, drops = [], flash = 0, press = null, rips = [];
  let meshes = {}, dynMesh = null, glOK = true, lastScenes = null, lastLO = null;
  const mir = () => !!(G.save && S().isleMirror), org = () => (inside ? ORG[inside] : (bnd() || { org: ORG.deck }).org);
  const SCL = { gh: 1.45 }, scl = () => SCL[inside] || 1; // 花房小，进去以后放大一点看
  // 相机：外面可以转（绕岛中心转 yaw）、可以调俯视角（pitch）；屋里固定
  const cam = () => { if (inside || !G.save) return { c: 1, s: 0, A: 1, B: 1, yaw: 0 }; const y = +S().isleYaw || 0, ph = U.clamp(+S().islePitch || 45, 22, 72) * Math.PI / 180; return { c: Math.cos(y), s: Math.sin(y), A: Math.SQRT2 * Math.sin(ph), B: Math.SQRT2 * Math.cos(ph), yaw: y }; };
  const rotUV = (u, v, k = cam()) => { const du = u - T.CEN[0], dv = v - T.CEN[1]; return [du * k.c - dv * k.s + T.CEN[0], du * k.s + dv * k.c + T.CEN[1]]; };
  const depth = (u, v) => { const r = rotUV(u, v); return r[0] + r[1]; };
  const IWf = () => (inside ? K.IW : (bnd() || K).IW), IHf = () => (inside ? K.IH : (bnd() || K).IH);
  const cx = (u, v) => { const k = cam(), [ru, rv] = rotUV(u, v, k), x = org()[0] + 2 * (ru - rv) * scl(); return mir() ? IWf() - x : x; }, cy = (u, v, z = 0) => { const k = cam(), [ru, rv] = rotUV(u, v, k); return org()[1] + ((ru + rv) * k.A - z * k.B) * scl(); };
  // 外面的画框：按现在的视角把整座岛框住（转视角时岛的轮廓会变）
  let bndC = null;
  function bnd() {
    const ms = meshes.deck; if (!ms || !ms.pos) return null; const k = cam(), key = [k.yaw.toFixed(3), k.A.toFixed(3), ms.key].join('|');
    if (bndC && bndC.key === key) return bndC;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const P = ms.pos;
    for (let i = 0; i < P.length; i += 3) { const du = P[i] - T.CEN[0], dv = P[i + 1] - T.CEN[1], ru = du * k.c - dv * k.s + T.CEN[0], rv = du * k.s + dv * k.c + T.CEN[1], X = 2 * (ru - rv), Y = (ru + rv) * k.A - P[i + 2] * k.B; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
    y0 = Math.min(y0, y1 - 40) - 34; // 上面留点地方（热气球、树梢、冒出来的烟）
    return (bndC = { key, IW: Math.ceil(x1 - x0 + 8), IH: Math.ceil(y1 - y0 + 4), org: [-x0 + 4, -y0 + 2] });
  }
  function want() { const s = G.save && S(); return !!(s && s.mode === 'mini' && s.isle && !s.taskbar); }
  const env = () => PP.env.get(), season = () => (PP.season ? PP.season() : 'summer'), phase = () => env().time.phase, night = () => phase() === 'night', wfx = () => env().fx;
  const snowy = () => season() === 'winter' || wfx().snow > 0.3, tripping = () => G.all.some((p) => p.d.trip);
  const mix = (a, b, k) => PP.ART.mix(a, b, k);
  const fu = R0 + HOUSE.fire * (HU1 - R0), ku = R0 + 0.85 * (HU1 - R0);

  // ---------- 地面：每块有自己的高度 ----------
  // floors: [层, u0, v0, u1, v1]；obst: 挡路的东西 [层, u0, v0, u1, v1] 或 [层, 'c', u, v, r]；ramps: 楼梯 / 台阶，把 a 层和 b 层连起来
  const rc = (o, r) => [o.lv || 0, 'c', o.u, o.v, r];
  const AREAS = {
    deck: {
      z: [0], zf: (u, v) => T.zAt(u, v), ok: (u, v) => T.walkable(u, v),
      floors: [[0, 0, 0, 50, 50]], ramps: [],
      obst: () => [[0, HOUSE.u0 - 0.4, HOUSE.v0 - 0.4, HOUSE.u1 + 0.4, HOUSE.v1 + 0.4], [0, GH.u0 - 0.4, GH.v0 - 0.4, GH.u1 + 0.4, GH.v1 + 0.3], [0, 25.4, 10, 27.4, 19.6],
        [0, 'c', TANK.u, TANK.v, 1.8], [0, 'c', MAILB.u, MAILB.v, 0.6], [0, 'c', TREE.u, TREE.v, 1.7], [0, 'c', BALLOON.u, BALLOON.v, 1.4], [0, 3.4, 27.4, 6.4, 30.4],
        ...PLOTS.map(([u, v]) => [0, u, v, u + PS, v + PS]), ...LAMPS.map(([u, v]) => [0, 'c', u, v, 0.35]), [0, 26, 26, 39.8, 26.4], [0, 39.4, 26, 39.8, 35.8],
        ...(E().isleDeco || []).map((id, i) => (id && SLOTS[i] ? [0, 'c', SLOTS[i][0], SLOTS[i][1], id === 'lampPost' ? 0.4 : 1.5] : null)).filter(Boolean)],
    },
    house: {
      z: [0, LOFT], floors: [[0, R0, R0, HU1, HV1], [1, R0, R0, 22, 18]],
      ramps: [{ u0: 4.4, u1: 7.6, v0: 18, v1: 30, axis: 'v', lo: 30, hi: 18, a: 0, b: 1 }],
      obst: () => { const r = E().room || {}; return [[0, fu - 5, R0, fu + 5, R0 + 3.6], [0, ku - 5.4, R0, HU1, R0 + 3], [0, 27, 11, 31.4, 15], [0, R0, R0, 10, 7], [0, 'c', 18, 6.4, 1.6], [0, 'c', 21.6, 17.6, 0.5], [0, 18.8, 11.2, 23.2, 15], [0, 33.4, 16.8, HU1, 22.2], [0, RDOOR.u + 3.8, HV1 - 2.8, RDOOR.u + 8.2, HV1],
        ...(r.c1 === 'table' ? [[0, 9.6, 21, 15.6, 25.6]] : r.c1 === 'lamp' ? [[0, 'c', 11, 23, 0.5]] : []), ...(r.c2 === 'plant' ? [[0, 'c', 34.4, 15.4, 1.1]] : r.c2 === 'shelf' ? [[0, 32.6, R0 + 3, 37, R0 + 5.6]] : []), ...(!r.c3 || r.c3 === 'piano' ? [[0, 27, 24, 35, 30.4]] : r.c3 === 'rocker' ? [[0, 28.4, 25, 33.4, 28.2]] : []),
        [1, 10.6, 5, 20.5, 10.6], [1, 5, 4.6, 10, 7.6], [1, 17.4, 14, 20.8, 16.4], [1, 'c', 5.6, 15.6, 1]]; },
    },
    gh: { z: [0], floors: [[0, R0, R0, GU1, GV1]], ramps: [], obst: () => [[0, R0 + 3.4, R0, GU1, R0 + 2.8], [0, R0, R0 + 3, R0 + 2.8, GV1 - 1.8], [0, 'c', 20.4, 12, 2], [0, 'c', 24.6, 18.6, 1.5], [0, 'c', 9.2, 20, 1.5]] },
  };
  const area = () => AREAS[inside || 'deck'];
  const Zf = (a, lv, u, v) => (a.zf ? a.zf(u, v) : a.z[lv]);
  const inRamp = (r, u, v) => u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1;
  const rampT = (r, u, v) => U.clamp(((r.axis === 'u' ? u : v) - r.lo) / (r.hi - r.lo), 0, 1);
  // 寻路用的格子（半格一个点）：某一层的这个点能不能站
  const GS = 0.5, GN = 100;
  let grids = {}, cells = {};
  function grid(a) {
    const key = (inside || 'deck') + dirtyK;
    if (grids.key !== key) { grids = { key }; cells = {}; }
    if (grids.g) return grids.g;
    const ob = a.obst(), g = a.z.map(() => new Uint8Array(GN * GN));
    const inF = a.ok ? (lv, u, v) => a.ok(u, v) : (lv, u, v) => a.floors.some((f) => f[0] === lv && u >= f[1] && u <= f[3] && v >= f[2] && v <= f[4]);
    for (let lv = 0; lv < a.z.length; lv++) for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
      const u = i * GS, v = j * GS; let ok = inF(lv, u, v) && inF(lv, u + 0.45, v) && inF(lv, u - 0.45, v) && inF(lv, u, v + 0.45) && inF(lv, u, v - 0.45);
      if (ok) for (const r of a.ramps) if (u > r.u0 - 0.3 && u < r.u1 + 0.3 && v > r.v0 - 0.3 && v < r.v1 + 0.3) { ok = false; break; }
      if (ok) for (const o of ob) { if (o[0] !== lv) continue; if (o[1] === 'c' ? Math.hypot(u - o[2], v - o[3]) < o[4] + 0.3 : u > o[1] - 0.45 && u < o[3] + 0.45 && v > o[2] - 0.45 && v < o[4] + 0.45) { ok = false; break; } }
      g[lv][j * GN + i] = ok ? 1 : 0;
    }
    return (grids.g = g);
  }
  const free = (a, u, v, lv) => { const i = Math.round(u / GS), j = Math.round(v / GS); return i >= 0 && j >= 0 && i < GN && j < GN && !!(grid(a)[lv] || [])[j * GN + i]; };
  // 离 (u,v) 最近的能站的点
  function nearFree(a, u, v, lv) {
    if (free(a, u, v, lv)) return [u, v];
    const g = grid(a)[lv], i0 = Math.round(u / GS), j0 = Math.round(v / GS); let best = null, bd = 1e9;
    for (let r = 1; r < 60 && (!best || r * GS < bd + 1); r++) for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) { if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r || i < 0 || j < 0 || i >= GN || j >= GN || !g[j * GN + i]) continue; const d = Math.hypot(i * GS - u, j * GS - v); if (d < bd) { bd = d; best = [i * GS, j * GS]; } }
    return best || [u, v];
  }
  const los = (a, lv, p, q) => { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.3); for (let k = 1; k < n; k++) if (!free(a, p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n, lv)) return false; return true; };
  // 同一层里从 s 走到 t：A* 寻路，再把拐弯拉直
  function pathIn(a, lv, s, t) {
    s = nearFree(a, s[0], s[1], lv); t = nearFree(a, t[0], t[1], lv);
    if (los(a, lv, s, t)) return [t];
    const g = grid(a)[lv], si = Math.round(s[0] / GS) + Math.round(s[1] / GS) * GN, ti = Math.round(t[0] / GS) + Math.round(t[1] / GS) * GN;
    const cost = new Float32Array(GN * GN).fill(1e9), from = new Int32Array(GN * GN).fill(-1), open = [si]; cost[si] = 0; const fsc = new Float32Array(GN * GN); const hh = (k) => Math.hypot((k % GN) - (ti % GN), Math.floor(k / GN) - Math.floor(ti / GN));
    fsc[si] = hh(si); let found = false, guard = 0, bestN = si, bestH = hh(si);
    while (open.length && guard++ < 20000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (fsc[open[k]] < fsc[open[bi]]) bi = k;
      const c = open.splice(bi, 1)[0]; if (c === ti) { found = true; break; } { const h0 = hh(c); if (h0 < bestH) { bestH = h0; bestN = c; } }
      const ci = c % GN, cj = Math.floor(c / GN);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GN || nj >= GN) continue; const n = nj * GN + ni; if (!g[n] || (di && dj && (!g[cj * GN + ni] || !g[nj * GN + ci]))) continue; const nc = cost[c] + (di && dj ? 1.414 : 1); if (nc < cost[n]) { cost[n] = nc; from[n] = c; fsc[n] = nc + hh(n); if (!open.includes(n)) open.push(n); } }
    }
    // 走不到（被围住了）：走到能到的、离目标最近的地方，绝不穿墙
    const end = found ? ti : bestN; if (end === si) return [];
    const raw = []; for (let c = end; c !== -1 && c !== si; c = from[c]) raw.unshift([(c % GN) * GS, Math.floor(c / GN) * GS]);
    if (found) raw[raw.length - 1] = t;
    const out = []; let cur = s, k = 0;
    while (k < raw.length) { let far = k; for (let q = raw.length - 1; q > k; q--) if (los(a, lv, cur, raw[q])) { far = q; break; } out.push(raw[far]); cur = raw[far]; k = far + 1; }
    return out;
  }
  function route(a, from, to) { // 楼层之间走哪几段楼梯
    const prev = { [from]: null }, q = [from];
    while (q.length) { const c = q.shift(); if (c === to) break; for (const r of a.ramps) { const n = r.a === c ? r.b : r.b === c ? r.a : null; if (n != null && !(n in prev)) { prev[n] = [c, r]; q.push(n); } } }
    const out = []; let c = to; while (prev[c]) { out.unshift([prev[c][1], c]); c = prev[c][0]; } return out;
  }
  const rampEnds = (r) => { const mid = r.axis === 'u' ? (r.v0 + r.v1) / 2 : (r.u0 + r.u1) / 2, sg = Math.sign(r.lo - r.hi), P = (e, s) => (r.axis === 'u' ? [e + s * 0.9, mid] : [mid, e + s * 0.9]); return [P(r.lo, sg), P(r.hi, -sg)]; };
  // 排出一条完整的路：[{u,v,lv,ramp}]
  function plan(a, ip, u, v, lv) {
    const pts = []; let cur = [ip.u, ip.v], cl = ip.lv;
    if (cl !== lv) for (const [r, to] of route(a, cl, lv)) {
      const [lo, hi] = rampEnds(r), [en, ex] = to === r.b ? [lo, hi] : [hi, lo];
      for (const q of pathIn(a, cl, cur, en)) pts.push({ u: q[0], v: q[1], lv: cl });
      pts.push({ u: ex[0], v: ex[1], lv: to, ramp: r }); cur = ex; cl = to;
    }
    if (cl === lv) for (const q of pathIn(a, cl, cur, [u, v])) pts.push({ u: q[0], v: q[1], lv: cl });
    return pts;
  }

  // ---------- 位置、缩放 ----------
  function safeB() { let b = G.H - (document.body.classList.contains('web') ? 44 : 0); try { const sc = window.screen; if (sc && sc.availHeight) { const v = (sc.availTop || 0) + sc.availHeight - (window.screenY || 0); if (v > 200 && v < b) b = v; } } catch (e) {} return b; }
  PP.safeB = safeB;
  const Z0 = 3.4, zoomOf = () => { const z = U.clamp(+(G.save && S().isleZ) || Z0, 1.6, 8); return Math.min(z, (safeB() - 8) / IHf(), (G.W - 8) / IWf()); };
  function layout() {
    const u = zoomOf(), w = Math.round(IWf() * u), h = Math.round(IHf() * u), pos = G.save && S().islePos, sb = safeB();
    let x1 = pos ? pos.x * G.W : G.W - 4, y1 = pos ? pos.y * sb : sb - 2;
    x1 = U.clamp(x1, w + 2, G.W - 2); y1 = U.clamp(y1, h + 2, sb - 2);
    return (L = { u, x0: Math.round(x1 - w), y0: Math.round(y1 - h), x1: Math.round(x1), y1: Math.round(y1), w, h });
  }
  const sx = (x) => L.x0 + x * L.u, sy = (y) => L.y0 + y * L.u;
  const scrU = (u, v) => sx(cx(u, v)), scrV = (u, v, z = 0) => sy(cy(u, v, z));
  function toUV(x, y, z) {
    const k = cam(); let X = (x - L.x0) / L.u; if (mir()) X = IWf() - X; X = (X - org()[0]) / scl(); const Y = (((y - L.y0) / L.u - org()[1]) / scl() + z * k.B) / k.A;
    const ru = (Y + X / 2) / 2, rv = (Y - X / 2) / 2, du = ru - T.CEN[0], dv = rv - T.CEN[1];
    return inside ? [ru, rv] : [du * k.c + dv * k.s + T.CEN[0], -du * k.s + dv * k.c + T.CEN[1]];
  }
  function groundY() { if (!L) layout(); return Math.round(inside ? scrV(18, 18, 0) : scrV(DOOR.u, HOUSE.v1 + 4, 0)); }
  function zone() { if (!L) layout(); return [L.x0 + 4, L.x1 - 4]; }
  // 宠物在世界里的位置 p.ip = {u, v, z, lv}
  const start = () => (inside === 'house' ? { u: RDOOR.u, v: HV1 - 2.4, lv: 0 } : inside === 'gh' ? { u: GRDOOR.u, v: GV1 - 2.2, lv: 0 } : { u: DOOR.u + 1, v: HOUSE.v1 + 3, lv: 0 });
  function setIp(p, u, v, lv) { const a = area(); lv = a.z[lv] != null ? lv : 0; p.ip = { u, v, lv, z: Zf(a, lv, u, v) }; p.isleLv = lv; p.x = scrU(u, v); }
  function ipOf(p) { if (!p.ip || p.ip.sc !== (inside || 'deck')) { const s = start(); setIp(p, s.u + U.rand(-1, 1), s.v + U.rand(0, 1), s.lv); p.ip.sc = inside || 'deck'; } return p.ip; }
  function uvOf(p) { if (p.isleSpot) return [p.isleSpot.u, p.isleSpot.v]; const q = ipOf(p); return [q.u, q.v]; }
  // 所有能站的点在屏幕上的位置（被拖着放下、被别的代码挪了位置时，用它找落脚点）
  function cellList() {
    const a = area(), g = grid(a), ck = L.u + '|' + L.x0 + '|' + L.y0 + '|' + mir() + '|' + (inside ? '' : (+S().isleYaw || 0) + ':' + (S().islePitch || 45)); if (cells.list && cells.k === ck) return cells.list;
    const list = []; for (let lv = 0; lv < g.length; lv++) for (let j = 0; j < GN; j += 2) for (let i = 0; i < GN; i += 2) if (g[lv][j * GN + i]) list.push([scrU(i * GS, j * GS), scrV(i * GS, j * GS, Zf(a, lv, i * GS, j * GS)), i * GS, j * GS, lv]);
    cells.k = ck; cells.minX = null; return (cells.list = list);
  }
  function placeAt(p, x, y, below) {
    let best = null, bd = 1e9; for (const c of cellList()) { const dy = c[1] - y, d = Math.abs(c[0] - x) * (below ? 3 : 1) + (dy >= 0 || !below ? Math.abs(dy) : -dy * 4); if (d < bd) { bd = d; best = c; } }
    if (best) { const a = area(); p.ip = { u: best[2], v: best[3], lv: best[4], z: Zf(a, best[4], best[2], best[3]), sc: inside || 'deck' }; p.isleLv = best[4]; }
    return best;
  }
  function floorY(p) {
    if (!L) layout();
    if (p.isleSpot) return Math.round(scrV(p.isleSpot.u, p.isleSpot.v, p.isleSpot.z || 0));
    const q = ipOf(p);
    if (p.held) return Math.round(scrV(q.u, q.v, q.z));
    if (p.airborne) { const cl = cellList(); if (cl.length) { if (cells.minX == null) { cells.minX = Math.min(...cl.map((c) => c[0])); cells.maxX = Math.max(...cl.map((c) => c[0])); } p.x = U.clamp(p.x, cells.minX, cells.maxX); } const c = placeAt(p, p.x, p.y, true); return c ? Math.round(c[1]) : Math.round(scrV(q.u, q.v, q.z)); }
    if (!p.iw && Math.abs(scrU(q.u, q.v) - p.x) > 2.5) { placeAt(p, p.x, scrV(q.u, q.v, q.z), false); p.x = scrU(p.ip.u, p.ip.v); }
    return Math.round(scrV(p.ip.u, p.ip.v, p.ip.z));
  }
  // ---------- 走路：在世界里匀速走，沿着排好的路，上下楼梯时高度跟着变 ----------
  const SPEED = 8.5, RUN = 15;
  function walkPlan(p, u, v, lv, run) {
    const a = area(), q = ipOf(p); p.isleSpot = null;
    const pts = plan(a, q, u, v, a.z[lv] != null ? lv : 0);
    if (!pts.length) { p.iw = null; return false; }
    let len = 0, c = q; for (const t of pts) { len += Math.hypot(t.u - c.u, t.v - c.v); c = t; }
    p.iw = { pts, i: 0, run: run != null ? run : len > 26, gen: p.gen, d: 0, t: 0 }; p.target = p.x; return true;
  }
  function step(p, dt) {
    const w = p.iw, a = area(), q = ipOf(p);
    if (!w || w.gen !== p.gen) { p.iw = null; p.target = null; p.hopY = 0; return; }
    w.t += dt;
    let left = (w.run ? RUN : SPEED) * (p.dizzy > 0 ? 0.5 : 1) * Math.min(1, 0.35 + w.t * 3) * dt, moved = 0, du = 0, dv = 0, onRamp = false;
    while (left > 0 && w.i < w.pts.length) {
      const t = w.pts[w.i], d = Math.hypot(t.u - q.u, t.v - q.v); onRamp = !!t.ramp; if (onRamp) left *= 0.8;
      if (d <= left) { du += t.u - q.u; dv += t.v - q.v; q.u = t.u; q.v = t.v; q.lv = t.lv; p.isleLv = t.lv; q.z = Zf(a, t.lv, q.u, q.v); left -= d; moved += d; w.i++; }
      else { const k = left / d; du += (t.u - q.u) * k; dv += (t.v - q.v) * k; q.u += (t.u - q.u) * k; q.v += (t.v - q.v) * k; moved += left; left = 0; if (t.ramp) { const r = t.ramp; q.z = a.z[r.a] + (a.z[r.b] - a.z[r.a]) * rampT(r, q.u, q.v); } else q.z = Zf(a, q.lv, q.u, q.v); }
    }
    w.d += moved;
    const rd = rotUV(T.CEN[0] + du, T.CEN[1] + dv), sdx = ((rd[0] - T.CEN[0]) - (rd[1] - T.CEN[1])) * (mir() ? -1 : 1); if (Math.abs(sdx) > 0.02) p.facing = sdx > 0 ? 1 : -1;
    p.x = scrU(q.u, q.v);
    const sp = p.sp || {}, S2 = G.S;
    if (sp.gait === 'hop') { p.hopP = (p.hopP || 0) + moved / 2.2; const ph = p.hopP % 1; if (ph < 0.66) { p.hopY = -Math.sin((ph / 0.66) * Math.PI) * (sp.hopH || 8) * S2 / 2 * (onRamp ? 1.25 : 1); p.anim = ph < 0.33 ? 'jump' : 'fall'; p._landed = false; } else { p.hopY = 0; p.anim = 'land'; if (!p._landed) { p._landed = true; p.jolt(-1.2, 0); } } }
    else { p.anim = w.run ? 'run' : 'walk'; p.hopY = -Math.abs(Math.sin(w.d * 2.6)) * (w.run ? 1.6 : 0.9) * S2 * (onRamp ? 1.5 : 1); }
    if (w.i >= w.pts.length) { p.iw = null; p.target = null; p.hopY = 0; p.hopP = 0; if (['walk', 'run', 'jump', 'fall', 'land'].includes(p.anim)) p.anim = 'idle'; }
    p.y = Math.round(scrV(q.u, q.v, q.z)) + (p.hopY || 0);
  }
  // 别的行为叫它“走到屏幕上 x 这个位置”：在岛上就换成走到那一列附近一个能站的地方
  function gotoX(p, x, run) {
    if (p.iw && p.iw.gen === p.gen && Math.abs((p.iw.gx || 1e9) - x) < 6) return;
    const q = ipOf(p), cs = cellList().filter((c) => c[4] === q.lv), near = cs.filter((c) => Math.abs(c[0] - x) < 5 * L.u), c = near.length ? U.pick(near) : cs.sort((m, n) => Math.abs(m[0] - x) - Math.abs(n[0] - x))[0];
    if (!c) { p.target = null; return; }
    if (walkPlan(p, c[2], c[3], c[4], run)) p.iw.gx = x; else p.target = null;
  }
  function sync() {
    const w = want();
    if (w && !G.isle) { G.isle = {}; inside = false; layout(); fit(true); for (const ms of [250, 700, 1500]) setTimeout(() => { if (G.isle) fit(false); }, ms); } // 窗口铺满以后再按记住的大小摆一次
    else if (!w && G.isle) { G.isle = null; inside = false; for (const p of G.all) { p.isleSpot = null; p.ip = null; p.iw = null; p.lane = null; p.fishing = null; p.isleLv = 0; p.tool = null; } document.body.style.cursor = 'default'; window.dispatchEvent(new Event('resize')); }
  }
  function fit(moveIn) {
    layout(); G.ground = groundY();
    for (const p of G.pets) {
      if (moveIn) { p.interrupt(true); p.ip = null; p.iw = null; p.isleSpot = null; }
      const q = ipOf(p); p.x = scrU(q.u, q.v);
      if (!p.held) { p.y = p.floor; p.airborne = false; }
    }
    PP.placeOrb && PP.placeOrb();
  }
  window.addEventListener('resize', () => { if (G.isle) setTimeout(() => fit(false), 0); });
  function setZoom(z, quiet) {
    S().isleZ = U.clamp(z, 1.6, 8); PP.save.soon(); layout(); G.ground = groundY();
    for (const p of G.pets) { if (p.held) continue; const [u, v] = uvOf(p); p.x = scrU(u, v); p.y = p.floor; }
    PP.placeOrb && PP.placeOrb();
    if (!quiet) PP.ui.toast(`小岛大小 ${Math.round(L.u / Z0 * 100)}%（在小岛上滚滚轮也能缩放）`);
  }
  const SIZES = [0, 2.6, 3.4, 4.6], setSize = (n) => setZoom(SIZES[n] || Z0);
  function resetPos() { S().islePos = null; PP.save.soon(); fit(false); }
  function setMirror(v) { S().isleMirror = !!v; PP.save.soon(); layout(); for (const p of G.pets) { const [u, w] = uvOf(p); p.x = scrU(u, w); } PP.ui.toast(v ? '城堡朝右' : '城堡朝左'); }
  // 转视角：在岛上按住右键（或滚轮键）拖动。左右转一圈，上下调俯视的角度
  function resetCam() { S().isleYaw = 0; S().islePitch = 45; PP.save.soon(); camChanged(); PP.ui.toast('回到默认视角'); }
  function camChanged() { bndC = null; cells = {}; layout(); G.ground = groundY(); for (const p of G.pets) { if (p.held) continue; const q = p.isleSpot || ipOf(p); p.x = scrU(q.u, q.v); p.y = p.floor; } PP.placeOrb && PP.placeOrb(); }
  let camDrag = null;
  window.addEventListener('mousedown', (e) => {
    if (!G.isle || inside || !L || (e.button !== 2 && e.button !== 1) || G.hoverPet) return;
    if (e.clientX < L.x0 || e.clientX > L.x1 || e.clientY < L.y0 || e.clientY > L.y1) return;
    camDrag = { x: e.clientX, y: e.clientY, yaw: +S().isleYaw || 0, pitch: +S().islePitch || 45, moved: false }; G.uiDrag = true; PP.refreshInteractive();
    const mv = (ev) => { if (!camDrag) return; const dx = ev.clientX - camDrag.x, dy = ev.clientY - camDrag.y; if (Math.hypot(dx, dy) > 4) camDrag.moved = true; if (!camDrag.moved) return; S().isleYaw = camDrag.yaw + dx * 0.012; S().islePitch = U.clamp(camDrag.pitch - dy * 0.25, 22, 72); camChanged(); document.body.style.cursor = 'grabbing'; };
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); if (camDrag && camDrag.moved) { PP.save.soon(); window.__noCtx = performance.now(); } camDrag = null; G.uiDrag = false; document.body.style.cursor = 'default'; PP.refreshInteractive(); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }, true);
  window.addEventListener('contextmenu', (e) => { if (window.__noCtx && performance.now() - window.__noCtx < 400) { e.preventDefault(); e.stopPropagation(); } }, true);
  window.addEventListener('wheel', (e) => { if (!G.isle || !L || !hover) return; if (e.target && e.target.closest && e.target.closest('.panel,.menu,.orb-pop,.hud')) return; e.preventDefault(); setZoom((S().isleZ || Z0) * (e.deltaY < 0 ? 1.08 : 1 / 1.08), true); }, { passive: false });

  // ---------- 3D 场景 ----------
  function farmKey() { return PLOTS.map((_, i) => { const inf = PP.econ.plotInfo(i); return inf ? inf.crop + inf.stage + ((E().farm[i].water || 0) > 0 ? 'w' : '') : '-'; }).join(','); }
  function scene() {
    const name = inside || 'deck', e = E();
    const key = name === 'deck' ? [season(), snowy() ? 1 : 0, (e.isleDeco || []).join(','), farmKey(), tripping() ? 1 : 0, dirtyK].join('|') : name === 'house' ? JSON.stringify(e.room) + dirtyK : name + dirtyK;
    const s = meshes[name];
    if (s && s.key === key) return s;
    let m;
    if (name === 'deck') m = MD.deck({ season: season(), snow: snowy(), deco: e.isleDeco, tripping: tripping(), busy: null, farm: PLOTS.map((_, i) => { const inf = PP.econ.plotInfo(i); return inf ? { crop: inf.crop, stage: inf.stage, wet: (e.farm[i].water || 0) > 0 } : null; }) });
    else if (name === 'house') m = MD.room({ room: e.room }); else m = MD.green({});
    const pos = name === 'deck' ? m.p.filter((_, i) => i % 9 < 3) : null; // 留一部分顶点，用来算画框
    const r = (meshes[name] = { key, gpu: g3.upload(m, s && s.gpu), pos });
    if (name === 'deck') { bndC = null; setTimeout(() => { if (G.isle && !inside) { const ox = L && L.x1, oy = L && L.y1; fit(false); } }, 0); }
    return r;
  }
  function lightOpts() {
    const ph = phase(), fx = wfx(), dim = Math.min(1, (fx.cloud || 0) * 0.5 + (fx.rain ? 0.35 : 0) + (fx.snow ? 0.25 : 0) + (fx.dark || 0));
    let sun = [1.0, 0.94, 0.8], sky = [0.5, 0.55, 0.68], gnd = [0.36, 0.33, 0.37], lit = 0, dir = [-0.55, 0.42, 0.72], top = [0.48, 0.72, 0.91], bot = [0.81, 0.92, 0.98];
    if (ph === 'night') { sun = [0.22, 0.28, 0.5]; sky = [0.2, 0.24, 0.42]; gnd = [0.13, 0.13, 0.24]; lit = 1; dir = [0.4, 0.5, 0.7]; top = [0.07, 0.09, 0.2]; bot = [0.15, 0.19, 0.36]; }
    else if (ph === 'dusk') { sun = [1.0, 0.56, 0.3]; sky = [0.5, 0.42, 0.56]; gnd = [0.34, 0.26, 0.32]; lit = 0.8; dir = [-0.8, 0.5, 0.36]; top = [0.42, 0.36, 0.6]; bot = [0.95, 0.63, 0.44]; }
    else if (ph === 'dawn') { sun = [1.0, 0.76, 0.66]; sky = [0.54, 0.5, 0.62]; gnd = [0.36, 0.3, 0.36]; lit = 0.3; dir = [0.2, 0.75, 0.42]; top = [0.54, 0.66, 0.85]; bot = [0.97, 0.78, 0.72]; }
    if (dim > 0) { sun = sun.map((x) => x * (1 - 0.7 * dim)); sky = sky.map((x, i) => x * (1 - 0.25 * dim) + [0.5, 0.52, 0.58][i] * 0.2 * dim); top = top.map((x, i) => x + ([0.55, 0.58, 0.64][i] - x) * dim * 0.8); bot = bot.map((x, i) => x + ([0.66, 0.68, 0.72][i] - x) * dim * 0.8); lit = Math.max(lit, dim * 0.6); }
    if (inside) { sky = sky.map((x, i) => x * 0.75 + [0.2, 0.16, 0.1][i]); gnd = gnd.map((x, i) => x + [0.1, 0.07, 0.04][i]); dir = [0.5, 0.62, 0.9]; if (ph === 'night') { sun = [0.5, 0.4, 0.28]; sky = [0.42, 0.34, 0.3]; } }
    return { sun: dir, sunCol: sun, sky, gnd, lit, skyTop: top, skyBot: bot, rain: fx.rain || 0, wind: Math.min(1, (fx.wind || 0) + (fx.storm ? 0.5 : 0)), inside: !!inside, time: performance.now() / 1000, center: inside ? [20, 18, 18] : [25, 22, 4], radius: inside ? 95 : 115 };
  }
  // 宠物被挡住时要挖开的位置（坐着 / 躺着 / 被拎着的不挖）
  function petCuts() {
    const out = [];
    for (const p of G.pets) { if (p.held || p.isleSpot || p.inDoor) continue; const q = p.ip; if (!q) continue; const h = 30 * G.S * (p.scaleMul || 1); const pq = pixK(); out.push([(p.x - L.x0) / pq, (p.y - L.y0 - (p.hopY || 0)) / pq, h / pq, inside ? q.u + q.v : depth(q.u, q.v), q.z]); }
    return out;
  }
  // 像素化：3D 画在一张小一号的画布上，再按整数倍放大（不平滑）——真光照 + 像素画的颗粒感
  // 按屏幕的真实像素来算：每个像素画格子正好是整数个物理像素（Windows 缩放 125% / 150% 时不再糊、不再一格大一格小）
  const DPR = () => window.devicePixelRatio || 1;
  const pixOn = () => !(G.save && S().islePix === false), pixD = () => (pixOn() ? Math.max(1, Math.round(L.u * DPR() * 0.3)) : 1), pixK = () => pixD() / DPR();
  function viewOpts() { const k = cam(), q = pixK(); return Object.assign({ w: Math.ceil(L.w / q), h: Math.ceil(L.h / q), ox: org()[0] / scl(), oy: org()[1] / scl(), k: (L.u * scl()) / q, mirror: mir(), yaw: k.yaw, pitch: [k.A, k.B], camC: T.CEN, posterize: pixOn() ? 26 : 0, cel: pixOn() }, lastLO); }
  function render3d() {
    const s = scene(), t = performance.now() / 1000;
    const dm = MD.dyn({ scene: inside || 'deck', t, cooking });
    dynMesh = dm.p.length ? Object.assign(g3.upload(dm, dynMesh), { noShadow: true }) : null;
    lastScenes = [s.gpu, dynMesh]; lastLO = lightOpts();
    rips = rips.filter((r) => t - r[2] < 4);
    if (!inside && Math.floor(t * 1.2) !== Math.floor((t - 1 / 60) * 1.2)) rips.push([16.6 + Math.random() * 0.4, 36 + Math.random() * 0.4, t]); // 小河流进塘的地方一直有涟漪
    const vo = viewOpts(), cv = g3.draw(lastScenes, Object.assign({}, vo, { pets: petCuts(), rips: rips.slice(-4) }));
    if (!cv || !pixOn()) return cv;
    const out = outline(cv), em = edges(s, vo);
    if (em) out.getContext('2d').drawImage(em, 0, 0);
    return out;
  }
  // 像素画的内描边：物体前后叠着的地方（树冠压在房子上、屋檐压在墙上……）描一条深色细线。
  // 只在视角 / 大小 / 场景变了的时候算一次（要多渲染一遍深度），平时直接叠上去
  let edgeKey = '', edgeCv = null;
  function edges(s, vo) {
    const key = [inside || 'deck', vo.w, vo.h, vo.ox.toFixed(2), vo.oy.toFixed(2), vo.k.toFixed(3), vo.yaw, vo.pitch.join(','), vo.mirror, s.key].join('|');
    if (key === edgeKey) return edgeCv;
    edgeKey = key;
    const ic = g3.draw([s.gpu], Object.assign({}, vo, { mode: 2, shadow: false })); if (!ic) return null;
    const w = ic.width, h = ic.height, tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; const tx = tmp.getContext('2d'); tx.drawImage(ic, 0, 0);
    const f = tx.getImageData(0, 0, w, h).data, N = w * h, dep = new Float32Array(N), has = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (f[i * 4 + 3] > 128) { has[i] = 1; dep[i] = f[i * 4] / 255 + f[i * 4 + 1] / 65025; }
    if (!edgeCv) edgeCv = document.createElement('canvas'); edgeCv.width = w; edgeCv.height = h;
    const ex = edgeCv.getContext('2d'), im = ex.createImageData(w, h), o = im.data, TH = 0.0016;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (!has[i]) continue; for (const j of [i + 1, i - 1, i + w, i - w]) if (has[j] && dep[i] - dep[j] > TH) { o[i * 4] = 26; o[i * 4 + 1] = 22; o[i * 4 + 2] = 38; o[i * 4 + 3] = 170; break; } }
    ex.putImageData(im, 0, 0); return edgeCv;
  }
  // 轮廓：岛的外沿、房子、树的剪影外面描一圈深色的像素边
  let olCv = null, tintCv = null;
  function outline(cv) {
    const w = cv.width, h = cv.height;
    if (!olCv) { olCv = document.createElement('canvas'); tintCv = document.createElement('canvas'); }
    if (olCv.width !== w || olCv.height !== h) { olCv.width = tintCv.width = w; olCv.height = tintCv.height = h; }
    const t = tintCv.getContext('2d'); t.clearRect(0, 0, w, h); t.globalCompositeOperation = 'source-over'; t.drawImage(cv, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = night() ? '#141022' : '#2a2030'; t.fillRect(0, 0, w, h);
    const c = olCv.getContext('2d'); c.clearRect(0, 0, w, h); c.imageSmoothingEnabled = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.drawImage(tintCv, dx, dy);
    c.drawImage(cv, 0, 0);
    return olCv;
  }
  const ripple = (u, v) => rips.push([u, v, performance.now() / 1000]);

  // ---------- 天气（2D 叠在最上面）----------
  function weatherTick(ctx, ar) {
    const fx = wfx(), u = Math.max(1, L.u / 1.5), n = Math.round((fx.rain * 90 + fx.snow * 60) * (ar.w * ar.h) / (480 * 420)), wind = (fx.wind || 0) * 18;
    while (drops.length < n) drops.push({ x: ar.x + Math.random() * (ar.w + 60) - 30, y: ar.y + Math.random() * ar.h, snow: fx.snow > 0 && (fx.rain === 0 || Math.random() < 0.5), v: 0.6 + Math.random() * 0.6 });
    if (drops.length > n) drops.length = n;
    const dt = 1 / 60;
    for (const d of drops) {
      if (d.snow) { d.y += 40 * d.v * dt * u; d.x += (Math.sin(d.y * 0.05 + d.v * 9) * 12 + wind) * dt * u; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(d.x, d.y, u * 0.7, 0, 6.3); ctx.fill(); }
      else { d.y += 320 * d.v * dt * u; d.x += wind * 3 * dt * u; ctx.strokeStyle = 'rgba(205,225,255,.5)'; ctx.lineWidth = Math.max(1, u * 0.5); ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - wind * 0.05 * u, d.y - 5 * u); ctx.stroke(); }
      if (d.y > ar.y + ar.h) { d.x = ar.x + Math.random() * (ar.w + 60) - 30; d.y = ar.y - Math.random() * 30; }
    }
    if (fx.storm && flash <= 0 && Math.random() < 0.003) flash = 0.25;
    if (flash > 0) { flash -= dt; ctx.fillStyle = `rgba(255,255,240,${(flash * 1.2).toFixed(2)})`; ctx.fillRect(ar.x, ar.y, ar.w, ar.h); }
  }
  function glow(ctx, x, y, r, col = 'rgba(255,214,140,', a = 0.45) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col + a + ')'); g.addColorStop(1, col + '0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  const fishSpr = (() => { let c = null; return () => { if (c) return c; const a = PP.ART, s = a.spr(11, 7); s.ell(5, 3.5, 4.5, 2.6, (nx, ny) => (ny < -0.3 ? '#cfeafa' : ny > 0.4 ? '#7a9ad8' : '#a8c8f8')); s.set(2, 3, '#2a2026'); s.rect(9, 1, 2, 5, '#f2a6c2'); s.set(5, 0, '#f2a6c2'); s.set(5, 6, '#f2a6c2'); return (c = s.outline('#3a3a6a').canvas()); }; })();

  // ---------- 画 ----------
  function renderBack(ctx) {
    if (!G.isle) return;
    if (!L) layout();
    const u = L.u, nt = night(), now = performance.now(), fx = wfx(), wind = fx.wind || 0;
    ctx.save();
    const cv = glOK && g3.ok() && render3d();
    if (cv) { ctx.imageSmoothingEnabled = false; const q = pixK(), d = DPR(); ctx.drawImage(cv, Math.round(L.x0 * d) / d, Math.round(L.y0 * d) / d, cv.width * q, cv.height * q); }
    if (cv) { try { lifeLayer(ctx); } catch (e) {} }
    else { glOK = false; ctx.fillStyle = 'rgba(40,30,50,.8)'; ctx.fillRect(L.x0 + L.w * 0.1, L.y0 + L.h * 0.45, L.w * 0.8, 40); ctx.fillStyle = '#fff'; ctx.font = PP.FONT(12); ctx.fillText('这台电脑没法开启 3D 渲染（WebGL2），小岛画不出来', L.x0 + L.w * 0.12, L.y0 + L.h * 0.45 + 24); }
    if (inside === 'house') {
      glow(ctx, scrU(fu, R0 + 4), scrV(fu, R0 + 4, 5), (cooking ? 40 : nt ? 36 : 22) * u, 'rgba(255,170,90,', 0.38 + Math.sin(now / 130) * 0.05);
      if (nt || phase() === 'dusk') glow(ctx, scrU(14, 27.6), scrV(14, 27.6, 14), 26 * u);
      if (cooking && Math.random() < 0.2) smoke.push({ x: cx(ku + 2.8, R0 + 1.5) + U.rand(-1, 1), y: cy(ku + 2.8, R0 + 1.5, 10), t: 0 });
    } else if (!inside) {
      const e = E();
      const CH = K.CHIMNEY || [20.15, 10.2, 37], VT = K.VENT, FL = K.FALL;
      if (Math.random() < (cooking || G.all.some((p) => p.inHouse) ? 0.12 : 0.03)) smoke.push({ x: cx(CH[0], CH[1]), y: cy(CH[0], CH[1], CH[2]), t: 0 });
      if (VT && Math.random() < 0.04) smoke.push({ x: cx(VT[0], VT[1]), y: cy(VT[0], VT[1], VT[2]), t: 0 });
      if (FL && Math.random() < 0.5) smoke.push({ x: cx(FL[0] + U.rand(-0.6, 0.6), FL[1]), y: cy(FL[0], FL[1], FL[2] + 1), t: 0, mist: true }); // 瀑布落下去散成雾
      if (nt || phase() === 'dusk') { for (const [a, b] of LAMPS) glow(ctx, scrU(a, b), scrV(a, b, T.zAt(a, b) + 10.6), 16 * u, 'rgba(255,214,140,', 0.34); glow(ctx, scrU(DOOR.u + 1.8, 20.5), scrV(DOOR.u + 1.8, 20.5, 7), 12 * u, 'rgba(255,214,140,', 0.3); (e.isleDeco || []).forEach((id, i) => { if (id === 'lampPost' || id === 'lantern') glow(ctx, scrU(SLOTS[i][0], SLOTS[i][1]), scrV(SLOTS[i][0], SLOTS[i][1], T.zAt(SLOTS[i][0], SLOTS[i][1]) + (id === 'lampPost' ? 11 : 2)), 18 * u); }); }
      if (nt && season() === 'summer' && !fx.rain) { ctx.fillStyle = '#fff6a0'; for (let i = 0; i < 9; i++) { const t = now / 1000 + i * 3.1; if (Math.sin(t * 2.3 + i) > 0) { const pu = 10 + ((i * 13 + Math.sin(t) * 4) % 30), pv = 10 + ((i * 7 + Math.cos(t * 0.8) * 4) % 22); ctx.beginPath(); ctx.arc(scrU(pu, pv), scrV(pu, pv, T.zAt(pu, pv) + 4 + Math.sin(t * 2) * 3), u * 0.6, 0, 6.3); ctx.fill(); } } }
    }
    if (mark && now - mark.t < 700) { const k = (now - mark.t) / 700, x = scrU(mark.u, mark.v), y = scrV(mark.u, mark.v, mark.z); ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = u; ctx.beginPath(); ctx.ellipse(x, y, (2 + k * 5) * u, (1 + k * 2.5) * u, 0, 0, Math.PI * 2); ctx.stroke(); }
    smoke = smoke.filter((m) => (m.t += 1 / 60) < (m.mist ? 1.6 : 3));
    for (const m of smoke) {
      if (m.spark) { ctx.fillStyle = `rgba(200,240,255,${(1 - m.t / 3).toFixed(2)})`; ctx.beginPath(); ctx.arc(sx(m.x + Math.sin(m.t * 3) * 2), sy(m.y + m.t * 6), u * 0.5, 0, 6.3); ctx.fill(); continue; }
      if (m.mist) { ctx.fillStyle = `rgba(225,242,255,${((1 - m.t / 1.6) * 0.35).toFixed(2)})`; ctx.beginPath(); ctx.arc(sx(m.x + Math.sin(m.t * 4 + m.x) * 1.5), sy(m.y + m.t * 5), (1 + m.t * 2.4) * u, 0, 6.3); ctx.fill(); continue; }
      ctx.fillStyle = `rgba(240,240,248,${((1 - m.t / 3) * 0.5).toFixed(2)})`; ctx.beginPath(); ctx.arc(sx(m.x + Math.sin(m.t * 2) * 2 + m.t * (3 + wind * 4) * (mir() ? -1 : 1)), sy(m.y - m.t * 8), (1 + m.t * 1.3) * u, 0, 6.3); ctx.fill();
    }
    ctx.restore();
  }
  // 钓鱼：甩竿 → 等 → 浮漂点两下 → 猛地一沉（这时点一下帮它收竿）→ 鱼被甩上来
  function rodTip(p) {
    const S2 = G.S, f = p.fishing, t = (performance.now() - f.t0) / 1000; let a = 0.6;
    if (f.ph === 'cast') a = t < 0.35 ? 0.6 + t * 4 : Math.max(0.5, 2 - (t - 0.35) * 6); else if (f.ph === 'bite') a = 0.4 + Math.sin(t * 30) * 0.1; else if (f.ph === 'reel') a = 1.3;
    const bx = p.x + p.facing * 5 * S2, by = p.y - 11 * S2, len = 20 * S2;
    return [bx, by, bx + p.facing * Math.cos(a) * len, by - Math.sin(a) * len];
  }
  function drawFishing(ctx, p, now) {
    const u = L.u, f = p.fishing, t = (now - f.t0) / 1000, [bx0, by0, tx, ty] = rodTip(p), bobX = scrU(BOB.u, BOB.v), bobY0 = scrV(BOB.u, BOB.v, POND.z);
    let bobY = bobY0 + Math.sin(now / 400) * u * 0.4, cast = 1;
    if (f.ph === 'cast') cast = U.clamp((t - 0.35) / 0.45, 0, 1); if (f.ph === 'nibble') bobY += (Math.sin(t * 18) > 0.6 ? 1.2 * u : 0); if (f.ph === 'bite') bobY += 2 * u;
    ctx.lineCap = 'round'; ctx.strokeStyle = '#6a4430'; ctx.lineWidth = Math.max(1.5, u * 0.6); ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(tx, ty); ctx.stroke();
    if (cast <= 0) return;
    const ex = tx + (bobX - tx) * cast, ey = ty + (bobY - ty) * cast - Math.sin(cast * Math.PI) * 14 * u;
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1, u * 0.25); ctx.beginPath(); ctx.moveTo(tx, ty);
    if (f.ph === 'reel' || f.ph === 'bite') ctx.lineTo(ex, ey); else ctx.quadraticCurveTo((tx + ex) / 2, Math.max(ty, ey) + 4 * u, ex, ey); ctx.stroke();
    if (f.ph !== 'reel') { ctx.fillStyle = '#e8405a'; ctx.beginPath(); ctx.arc(ex, ey - u * 0.6, 1.1 * u, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey - u * 0.6, 1.1 * u, 0, Math.PI); ctx.fill(); }
    if (f.ph === 'bite') PP.drawPixelLabel(ctx, '快点我！收竿', bobX, bobY0 - 10 * u, { size: 11, bg: '#ffd36a' });
    if (f.ph === 'reel') {
      const k = U.clamp(t / 0.8, 0, 1), fxp = bobX + (p.x - bobX) * k, fyp = bobY0 + (p.y - 20 * G.S - bobY0) * k - Math.sin(k * Math.PI) * 26 * u, fc = fishSpr(), fs = Math.max(1, Math.round(u * 0.6));
      if (f.got) { ctx.imageSmoothingEnabled = false; ctx.save(); ctx.translate(fxp, fyp); ctx.rotate(k * 6); ctx.drawImage(fc, -fc.width * fs / 2, -fc.height * fs / 2, fc.width * fs, fc.height * fs); ctx.restore(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(fxp, fyp); ctx.stroke(); }
      if (t < 0.4) for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(bobX + Math.cos(i * 0.9) * t * 24 * u, bobY0 - Math.abs(Math.sin(i * 0.9)) * t * 22 * u + t * t * 40 * u, u * 0.5, 0, 6.3); ctx.fill(); }
    }
  }
  // 手里的工具：水壶（会倾斜、出水）、篮子
  function drawTool(ctx, p, now) {
    const S2 = G.S, t = (now - p.tool.t0) / 1000, hx = p.x + p.facing * 8 * S2, hy = p.y - 9 * S2, f = p.facing;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(f * S2, S2);
    if (p.tool.k === 'can') { const tilt = Math.min(0.7, t * 2) * (p.tool.pour ? 1 : 0.2); ctx.rotate(tilt); ctx.fillStyle = '#7fb8d8'; ctx.strokeStyle = '#2a3a4a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.rect(-3, -3, 6, 5); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(3, -1); ctx.lineTo(7, -4); ctx.lineTo(7.6, -3.2); ctx.lineTo(3, 0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(-3.4, -0.6, 2, 1.2, 5); ctx.stroke(); }
    else if (p.tool.k === 'basket') { ctx.fillStyle = '#c89a5a'; ctx.strokeStyle = '#5a3a28'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(4, -1); ctx.lineTo(3, 3); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -1, 3.6, Math.PI, 0); ctx.stroke(); if (p.tool.full) { ctx.fillStyle = p.tool.col || '#f08a3a'; for (const [a, b] of [[-2, -2], [0.4, -2.6], [2, -1.8]]) { ctx.beginPath(); ctx.arc(a, b, 1.4, 0, 6.3); ctx.fill(); } } }
    ctx.restore();
  }
  // ---------- 会动的小东西（画在模型上面、动物下面）：鸡、蜜蜂、鱼缸里的鱼、萤火虫、花瓣 ----------
  const CHK = [['....rr..', '...wwwr.', '..wwkwwo', 'wwwwwww.', 'wwwwwww.', '.wwwww..', '..y.y...'], ['....rr..', '...wwwr.', '..wwkwwo', 'wwwwwww.', 'wwwwwww.', '.wwwww..', '.y...y..']];
  const CHC = { r: '#e0403a', w: '#fbf6ec', k: '#2a1a20', o: '#f0a020', y: '#e8a020', b: '#c8a070' };
  function sprite(ctx, rows, x, y, s, flip, cols) { for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const ch = rows[j][i]; if (ch === '.') continue; ctx.fillStyle = cols[ch]; ctx.fillRect(Math.round(x + (flip ? rows[j].length - 1 - i : i) * s), Math.round(y + j * s), s, s); } }
  function lifeLayer(ctx) {
    const now = performance.now(), t = now / 1000, s = Math.max(1, Math.round(L.u * 0.42)), e = E();
    if (!inside) {
      // 鸡：三只在小院里溜达、啄地；刚捡完蛋会扑腾一下
      const fl = now - chickT < 1500;
      for (let i = 0; i < 3; i++) {
        const ph = t * 0.23 + i * 2.1, u = COOP.u + 0.6 + Math.sin(ph) * 2.2 + Math.sin(ph * 2.7 + i) * 0.6, v = COOP.v + 3.2 + Math.cos(ph * 1.3 + i) * 1.4, z = T.zAt(u, v);
        const peck = Math.sin(t * 5 + i * 3) > 0.7 ? 1 : 0, hop = fl ? Math.abs(Math.sin(t * 12 + i)) * 2 * s : 0;
        const x = scrU(u, v) - 4 * s, y = scrV(u, v, z) - 7 * s - hop + peck * s, dir = Math.cos(ph) < 0;
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + s, scrV(u, v, z) - s, 6 * s, s);
        sprite(ctx, CHK[peck], x, y, s, dir, CHC);
      }
      // 蜜蜂：绕着蜂箱和花飞
      const nb = now - beeBoost < 4000 ? 9 : 4, hx = scrU(HIVE.u, HIVE.v), hy = scrV(HIVE.u, HIVE.v, T.zAt(HIVE.u, HIVE.v) + 3);
      for (let i = 0; i < nb; i++) { const a = t * (1.6 + i * 0.13) + i * 1.7, r = (6 + (i % 3) * 4) * L.u * 0.5, x = hx + Math.cos(a) * r * 1.3, y = hy + Math.sin(a * 1.4) * r * 0.6 - 2 * L.u; ctx.fillStyle = '#2a1a20'; ctx.fillRect(Math.round(x), Math.round(y), s, s); ctx.fillStyle = '#f6c43a'; ctx.fillRect(Math.round(x) + s, Math.round(y), s, s); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(Math.round(x), Math.round(y) - s, s, s); }
      // 萤火虫（钓到萤光鱼 / 月光鳗之后）
      if ((e.glowUntil || 0) > Date.now()) for (let i = 0; i < 22; i++) { const a = t * 0.3 + i * 2.39, u = 24 + Math.cos(a * 0.7 + i) * (8 + (i % 5) * 2.4), v = 23 + Math.sin(a * 0.9 + i * 1.3) * (7 + (i % 4) * 2.6), z = T.zAt(u, v) + 3 + Math.sin(t * 1.3 + i) * 2, k = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); if (k < 0.2) continue; const x = scrU(u, v), y = scrV(u, v, z); ctx.fillStyle = `rgba(200,255,140,${0.25 * k})`; ctx.fillRect(x - 2 * s, y - 2 * s, 5 * s, 5 * s); ctx.fillStyle = `rgba(240,255,170,${k})`; ctx.fillRect(x, y, s, s); }
      // 花瓣雨（钓到樱花鱼之后）
      if ((e.petalUntil || 0) > Date.now()) for (let i = 0; i < 26; i++) { const k = (t * 0.12 + i * 0.137) % 1, x = L.x0 + ((i * 97) % 100) / 100 * L.w + Math.sin(t + i) * 10, y = L.y0 + k * L.h; ctx.fillStyle = i % 3 ? '#f8c8d4' : '#ffe8ee'; ctx.fillRect(Math.round(x), Math.round(y), 2 * s, s); }
    } else if (inside === 'house' && K.TANKIN) {
      // 鱼缸里游着钓到过的小鱼（最多 6 条）
      const [uf, v0, v1, z0, z1] = K.TANKIN, list = (e.tank || []).length ? e.tank : [];
      list.forEach((id, i) => { if (!PP.FISHDEX || !PP.FISHDEX.BY[id]) return; const k = (Math.sin(t * 0.4 + i * 1.9) + 1) / 2, v = v0 + k * (v1 - v0), z = z0 + ((i * 0.37) % 1) * (z1 - z0) + Math.sin(t * 1.2 + i) * 0.3, dir = Math.cos(t * 0.4 + i * 1.9) < 0, sp = PP.FISHDEX.sprite(id), sc = Math.max(1, Math.round(L.u * 0.22)), x = scrU(uf, v), y = scrV(uf, v, z);
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (!dir) ctx.scale(-1, 1); ctx.imageSmoothingEnabled = false; ctx.drawImage(sp, -sp.width * sc / 2, -sp.height * sc / 2, sp.width * sc, sp.height * sc); ctx.restore(); });
      if (Math.random() < 0.05) { const v = v0 + Math.random() * (v1 - v0); fxs2.push({ x: scrU(uf, v), y: scrV(uf, v, z0), t: 0 }); }
      for (const b of fxs2) { b.t += 1 / 60; ctx.fillStyle = 'rgba(230,248,255,.8)'; ctx.fillRect(Math.round(b.x), Math.round(b.y - b.t * 18 * L.u * 0.3), s, s); }
      for (let i = fxs2.length - 1; i >= 0; i--) if (fxs2[i].t > 1.4) fxs2.splice(i, 1);
    }
  }
  const fxs2 = [];
  // 被窝：睡觉时被子盖在身上（画在动物上面）
  function quilt(ctx, p) {
    const S2 = G.S * (p.scaleMul || 1), w = 30 * S2, h = 9 * S2, x = p.x - w / 2, y = p.y - h - S2 + Math.sin(performance.now() / 700) * S2 * 0.4;
    ctx.fillStyle = '#3a2630'; ctx.fillRect(Math.round(x - S2), Math.round(y - S2), Math.round(w + 2 * S2), Math.round(h + 2 * S2));
    for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) { ctx.fillStyle = (i + j) % 2 ? '#f2c6d2' : '#fbe4ec'; ctx.fillRect(Math.round(x + i * w / 6), Math.round(y + j * h / 3), Math.ceil(w / 6), Math.ceil(h / 3)); }
    ctx.fillStyle = '#fffaf2'; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(2 * S2));
  }
  function renderFront(ctx) {
    if (!G.isle || !L) return;
    const u = L.u, now = performance.now();
    ctx.save();
    for (const p of G.pets) { if (p.fishing) drawFishing(ctx, p, now); if (p.tool) drawTool(ctx, p, now); if (p.inBed) { if (p.action !== 'isleUse') p.inBed = null; else quilt(ctx, p); } }
    const fx = wfx(); if (!inside && (fx.rain || fx.snow || flash > 0)) weatherTick(ctx, { x: L.x0, y: L.y0, w: L.w, h: L.h });
    if (!inside && PP.econ.unread()) { const x = scrU(MAILB.u, MAILB.v), y = scrV(MAILB.u, MAILB.v, T.zAt(MAILB.u, MAILB.v) + 11 + Math.sin(now / 400) * 0.8); ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#3a2630'; ctx.lineWidth = u * 0.4; ctx.beginPath(); ctx.rect(x - 2.6 * u, y - 2 * u, 5.2 * u, 4 * u); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#e8705a'; ctx.beginPath(); ctx.moveTo(x - 2.6 * u, y - 2 * u); ctx.lineTo(x, y + 0.3 * u); ctx.lineTo(x + 2.6 * u, y - 2 * u); ctx.stroke(); }
    ctx.restore();
    if (hover && hover.k !== 'ground' && hover.k !== 'hull' && !G.hoverPet && !press) { const t = hoverText(hover); if (t) PP.drawPixelLabel(ctx, t, Math.round(hover.lx), Math.round(Math.max(10, hover.ly)), { size: 12 }); }
  }
  const fmtLeft = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} 小时 ${m % 60} 分` : `${m} 分钟`; };
  function hoverText(h) {
    if (h.label) return h.label;
    if (h.k === 'plot') { const inf = PP.econ.plotInfo(h.i); if (!inf) return '空菜箱：点一下选种子'; const n = PP.econ.ITEMS[PP.econ.CROPS[inf.crop].item].name; return inf.stage === 3 ? `${n}熟了：点一下收` : `${n}：还有 ${fmtLeft(inf.left)}${(E().farm[h.i].water || 0) < 3 ? '（点一下浇水）' : ''}`; }
    return '';
  }

  // ---------- 鼠标手型：不同的事不同的手 ----------
  const HAND = ['....kk......', '...kwwk.....', '...kwwk.....', '...kwwk.....', '...kwwkkk...', '...kwwkwwkk.', '.kkkwwkwwkwk', 'kwwkwwwwwwwk', 'kwwwwwwwwwwk', '.kwwwwwwwwwk', '..kwwwwwwwk.', '..kwwwwwwwk.', '...kkkkkkk..'];
  const OPEN = ['...k.k.k....', '..kwkwkwk.k.', '..kwkwkwkkwk', '..kwkwkwkwwk', 'k.kwwwwwwwwk', 'kwkwwwwwwwwk', 'kwwwwwwwwwwk', '.kwwwwwwwwwk', '.kwwwwwwwwk.', '..kwwwwwwwk.', '..kwwwwwwwk.', '...kkkkkkk..'];
  const BADGE = {
    enter: ['kkkkkkk', 'knnnnnk', 'knnnnnk', 'knnnynk', 'knnnnnk', 'knnnnnk', 'kkkkkkk'], fish: ['...k...', '...k...', '...k...', '...k...', 'k..k...', 'k..k...', '.kk....'], sow: ['.......', '..g.g..', '..ggg..', '...g...', '.nnnnn.', 'nnnnnnn', '.......'],
    water: ['.......', '..b....', '..b....', '.bbb...', '.bbb...', 'bbbbb..', '.bbb...'], harvest: ['..rr...', '.rrrr..', '.rrrr..', '..rr...', 'kkkkkk.', 'koooook', '.kkkkk.'], rest: ['kkkk...', '..k....', '.k.....', 'kkkk...', '...kkk.', '....k..', '...kkk.'],
    look: ['.kkk...', 'k...k..', 'k...k..', 'k...k..', '.kkk...', '....kk.', '.....kk'], fire: ['...r...', '..rr...', '.rror..', '.rooor.', 'rooyor.', '.royor.', '..rrr..'], mail: ['kkkkkkk', 'kwwwwwk', 'kkwwwkk', 'kwkwkwk', 'kwwkwwk', 'kwwwwwk', 'kkkkkkk'], trip: ['..rrr..', '.ryryr.', '.ryryr.', '..rrr..', '...k...', '..kkk..', '..kkk..'], cook: ['.......', 'k.....k', 'kkkkkkk', 'keeeeek', 'keeeeek', '.kkkkk.', '.......'],
  };
  const CCOL = { k: '#231c20', w: '#ffffff', n: '#a8703a', y: '#ffcf33', g: '#4cae4c', b: '#4a9ad8', r: '#e0453a', o: '#f08a3a', e: '#9a9aa8' };
  const curCache = {};
  function cursor(kind) {
    if (curCache[kind]) return curCache[kind];
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), px = (rows, ox, oy, s, pad) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') { x.fillStyle = CCOL[ch]; x.fillRect(ox + i * s - (pad || 0), oy + j * s - (pad || 0), s + 2 * (pad || 0), s + 2 * (pad || 0)); } }));
    px(kind === 'grab' ? OPEN : HAND, 0, 0, 2);
    const b = BADGE[kind]; if (b) { x.fillStyle = '#fff6e0'; x.strokeStyle = '#231c20'; x.lineWidth = 1.5; x.beginPath(); x.arc(23, 23, 8.2, 0, 6.3); x.fill(); x.stroke(); px(b, 16, 16, 2); }
    return (curCache[kind] = `url(${c.toDataURL()}) ${kind === 'grab' ? '12 12' : '9 1'}, pointer`);
  }

  // ---------- 能互动的东西 ----------
  // id: 模型上的拾取号；at: 站哪儿 [u, v, 层]；spot: 跳上去的位置；cur: 手型
  const P = (id, o) => Object.assign({ id }, o);
  // 只留做了有结果的事：做饭（得到饼干 / 吃饱）、睡觉（体力）、坐一会儿（体力）、弹琴（心情）、花房的水桶（喝水）、照看花草（每天一朵郁金香）
  const PROPS = {
    deck: [],
    house: [
      P(PICK.kitchen, { at: [ku - 0.6, R0 + 4.6, 0], do: 'kitchen', label: '厨房：做点吃的', cur: 'cook' }),
      P(PICK.chair, { at: [24.2, 16.6, 0], spot: { u: 21.4, v: 13, z: 3.4 }, do: 'sit', label: '摇椅：坐一会儿（回体力）', cur: 'rest' }),
      P(PICK.bed, { at: [15.5, 12.2, 1], spot: { u: 15.6, v: 7.8, z: LOFT + 4.4 }, do: 'sleep', label: '上阁楼睡一觉', cur: 'rest' }),
      P(PICK.piano, { at: [31, 31.2, 0], do: 'piano', label: '钢琴：弹一曲（心情变好）', cur: 'use' }),
    ],
    gh: [
      P(PICK.gbarrel, { at: [22.4, 19.8, 0], do: 'drink', label: '水桶：喝口水', cur: 'water' }), P(PICK.bench, { at: [14, R0 + 4.4, 0], do: 'tend', label: '花架：照看花草', cur: 'water' }),
    ],
  };
  const FURN_LABEL = { table: '小书桌：坐一坐', lamp: '台灯：摸一摸', plant: '大盆栽：看一看', shelf: '书架：看书', piano: '钢琴：弹一曲', rocker: '摇椅：摇一摇' };
  const FIX = { // 固定的东西：拾取号 → 是什么、什么手
    [PICK.door]: { k: 'door', label: '进小屋', cur: 'enter' }, [PICK.green]: { k: 'green', label: '进玻璃花房', cur: 'enter' }, [PICK.exit]: { k: 'exit', label: '出门', cur: 'enter' },
    [PICK.mail]: { k: 'mail', label: '信箱：看信', cur: 'mail' }, [PICK.barrel]: { k: 'barrel', label: '水井：打水喝（解渴）', cur: 'water' },
    [PICK.balloon]: { k: 'balloon', label: '热气球：出门探险', cur: 'trip' }, [PICK.fish]: { k: 'fish', label: '水塘：钓鱼（钓到的鱼会记进图鉴）', cur: 'fish' },
    [PICK.tree]: { k: 'tree', label: '老橡树：摇一摇（会掉果子）', cur: 'use' }, [PICK.coop]: { k: 'coop', label: '鸡舍：捡鸡蛋', cur: 'use' }, [PICK.hive]: { k: 'hive', label: '蜂箱：收蜂蜜', cur: 'use' },
  };
  let pickC = { x: -1, y: -1, t: 0, id: 0 };
  function pickAt(x, y) {
    const now = performance.now(); if (pickC.x === x && pickC.y === y && now - pickC.t < 120) return pickC.id;
    let id = 0; try { id = glOK && lastScenes ? g3.draw(lastScenes, Object.assign(viewOpts(), { pickAt: [(x - L.x0) / pixK(), (y - L.y0) / pixK()], pets: petCuts() })) : 0; } catch (e) { id = 0; }
    pickC = { x, y, t: now, id }; return id;
  }
  function groundAt(x, y) { // 鼠标底下是哪块能走的地（先看高的）
    const a = area(), order = a.z.map((z, i) => i).sort((m, n) => a.z[n] - a.z[m]);
    if (a.zf) { let z = 0, gu = 0, gv = 0; for (let it = 0; it < 4; it++) { [gu, gv] = toUV(x, y, z); z = a.zf(gu, gv); } return free(a, gu, gv, 0) ? { k: 'ground', u: gu, v: gv, z, lv: 0 } : null; }
    for (const lv of order) { const [gu, gv] = toUV(x, y, a.z[lv]); if (free(a, gu, gv, lv)) return { k: 'ground', u: gu, v: gv, z: a.z[lv], lv }; }
    return null;
  }
  function hot(x, y) {
    hover = null;
    if (!G.isle || !L || G.editing || !want()) return null;
    if (x < L.x0 || x > L.x1 || y < L.y0 || y > L.y1) return null;
    let h = null; const p = mainP();
    if (!inside && p && p.fishing && p.fishing.ph === 'bite' && Math.hypot(x - scrU(BOB.u, BOB.v), y - scrV(BOB.u, BOB.v, POND.z)) < 16 * L.u) h = { k: 'fish', label: '快点！收竿', cur: 'fish' };
    if (!h) {
      const id = pickAt(x, y);
      if (id < 0) return null; // 这一点上什么都没有：鼠标穿过去
      if (FIX[id]) h = Object.assign({}, FIX[id]);
      else if (id >= PICK.plot && id < PICK.plot + 6) { const i = id - PICK.plot, inf = PP.econ.plotInfo(i); h = { k: 'plot', i, cur: !inf ? 'sow' : inf.stage === 3 ? 'harvest' : 'water' }; }
      else if (id >= PICK.deco && id < PICK.deco + 6) { const i = id - PICK.deco, d = (E().isleDeco || [])[i]; if (['bench', 'swing', 'hay'].includes(d)) h = { k: 'deco', i, id: d, label: { bench: '长椅：坐一会儿', swing: '秋千：荡一荡', hay: '干草垛：趴一会儿' }[d], cur: 'rest' }; }
      else { const pr = (PROPS[inside || 'deck'] || []).find((q) => q.id === id); if (pr) { const f = pr.f && (E().room || {})[pr.f]; h = { k: 'prop', pr, label: pr.f && pr.f !== 'rug' ? FURN_LABEL[f] || '' : pr.label, cur: pr.cur }; } }
      if (!h) h = groundAt(x, y) || { k: 'hull' };
    }
    h.isle = true; h.lx = x; h.ly = y - 12 * Math.min(2.5, L.u);
    h.cur = h.k === 'ground' || h.k === 'hull' ? 'default' : cursor(h.cur || 'use'); // 只有能互动的东西才变手；空地和墙还是普通箭头（按住照样能拖）
    hover = h; return h;
  }
  function mainP() { const p = PP.F.main(); return p && G.pets.includes(p) && !p.held ? p : null; }
  function down(h, x, y) {
    press = { h, x, y, moved: false, ox: L.x1, oy: L.y1 };
    G.uiDrag = true; PP.refreshInteractive();
    const mv = (ev) => {
      if (!press) return;
      if (!press.moved && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > 6) press.moved = true;
      if (press.moved) { const dx = L.x0, dy = L.y0; S().islePos = { x: (press.ox + ev.clientX - press.x) / G.W, y: (press.oy + ev.clientY - press.y) / safeB() }; layout(); G.ground = groundY(); for (const p of G.pets) if (!p.held) { p.x += L.x0 - dx; p.y += L.y0 - dy; } PP.placeOrb && PP.placeOrb(); document.body.style.cursor = 'grabbing'; }
    };
    const up = (ev) => {
      window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up);
      const pr = press; press = null; G.uiDrag = false;
      if (pr && pr.moved) { layout(); S().islePos = { x: L.x1 / G.W, y: L.y1 / safeB() }; PP.save.soon(); } else if (pr) click(pr.h, ev.clientX, ev.clientY);
      document.body.style.cursor = 'default'; PP.refreshInteractive();
    };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }
  function click(h, x, y) {
    if (!h) return;
    const p = mainP(), go = (name, fn, ...args) => { if (p) { p.interrupt(true); p.inDoor = false; p.fishing = null; p.tool = null; p.run(name, fn, ...args); } };
    if (h.k === 'ground') { mark = { u: h.u, v: h.v, z: h.z, t: performance.now() }; go('isleGo', A.isleGo, h.u, h.v, h.lv); return; }
    if (h.k === 'hull') return;
    if (h.k === 'prop') { go('isleUse', A.isleUse, h.pr); return; }
    if (h.k === 'deco') { go('isleSit', A.isleSit, { id: h.id, i: h.i, u: SLOTS[h.i][0], v: SLOTS[h.i][1] }); return; }
    if (h.k === 'door' || h.k === 'green') { const w = h.k === 'door' ? 'house' : 'gh'; if (p) go('isleHouse', A.isleHouse, w); else setInside(w); return; }
    if (h.k === 'exit') { if (p) go('isleHouse', A.isleHouse, false); else setInside(false); return; }
    if (h.k === 'mail') { go('isleMail', A.isleMail); PP.econ.openPanel('mail'); return; }
    if (h.k === 'fish') { if (p && p.fishing) { if (p.fishing.ph === 'bite') p.fishing.helped = true; return; } go('isleFish', A.isleFish); return; }
    if (h.k === 'balloon') { PP.econ.openPanel('trip'); return; }
    if (h.k === 'tree') { go('isleUse', A.isleUse, { do: 'shake', at: [TREE.u - 2.6, TREE.v + 3.4, 0] }); return; }
    if (h.k === 'coop') { go('isleCoop', A.isleCoop); return; }
    if (h.k === 'hive') { go('isleHive', A.isleHive); return; }
    const ACT = { barrel: 'isleDrink' };
    if (ACT[h.k]) { go(ACT[h.k], A[ACT[h.k]]); return; }
    if (h.k === 'plot') {
      const inf = PP.econ.plotInfo(h.i);
      if (inf && inf.stage === 3) { if (p) go('isleHarvest', A.isleHarvest, h.i); else PP.econ.harvest(h.i); return; }
      if (inf) { if (p && (E().farm[h.i].water || 0) < 3) go('isleWater', A.isleWater, h.i); else PP.ui.toast(hoverText(h)); return; }
      seedPicker(h.i, x, y);
    }
  }
  // 作物小图标（选种子的小窗用）
  const cropCache = {}, CROP_COL = { carrot: '#f08a3a', berry: '#e8405a', corn: '#ffd36a', sunflower: '#f6c43a', pumpkin: '#f2832a', tomato: '#e0402a', cabbage: '#9ad070', melon: '#3f8a44', tulip: '#f2a6c2' };
  function cropSpr(crop) {
    if (cropCache[crop]) return cropCache[crop];
    const a = PP.ART, s = a.spr(13, 13), C = CROP_COL[crop] || '#f08a3a';
    s.ell(6.5, 9, 5, 3.4, (nx, ny) => (ny < -0.3 ? '#86cc6a' : '#5aa64e')); s.vl(6, 2, 6, '#3f8a44');
    if (crop === 'corn') { s.rect(5, 1, 3, 8, C); s.vl(5, 1, 8, '#fff0a0'); } else if (crop === 'sunflower') { s.ell(6.5, 3.5, 3.6, 3.2, (nx, ny) => (nx * nx + ny * ny < 0.25 ? '#7a4a2a' : C)); } else if (crop === 'tulip') { s.rect(5, 1, 3, 3, C); s.rect(2, 3, 2, 3, '#ffd36a'); s.rect(9, 3, 2, 3, '#e8705a'); }
    else if (crop === 'carrot') { s.rect(3, 9, 3, 3, C); s.rect(8, 9, 3, 3, C); } else s.ell(6.5, 8.5, crop === 'berry' || crop === 'tomato' ? 2.6 : 4.6, crop === 'berry' || crop === 'tomato' ? 2.6 : 3.4, (nx, ny) => (ny < -0.4 ? mix(C, '#ffffff', 0.35) : C));
    return (cropCache[crop] = s.outline('#2a3a22').canvas());
  }
  PP.cropSpr = cropSpr;
  function seedPicker(i, x, y) {
    const e = E(), I = PP.econ.ITEMS, seeds = Object.keys(I).filter((k) => I[k].kind === 'seed');
    const el = document.createElement('div'); el.className = 'seedpick';
    el.innerHTML = `<div class="sp-head"><b>种点什么？</b><span class="muted">小鱼干 ${e.fish}</span></div><div class="sp-list">${seeds.map((k) => { const it = I[k], c = PP.econ.CROPS[it.crop], crop = I[c.item], have = e.bag[k] || 0; return `<button class="sp" data-k="${k}" ${!have && e.fish < it.price ? 'disabled' : ''}><canvas data-crop="${it.crop}"></canvas><b>${crop.name}</b><small>${c.min >= 60 ? c.min / 60 + ' 小时' : c.min + ' 分钟'} · 卖 ${crop.sell}</small><em>${have ? '有 ' + have + ' 颗' : it.price + ' 小鱼干'}</em></button>`; }).join('')}</div>`;
    el.querySelectorAll('canvas[data-crop]').forEach((cv) => { const s = cropSpr(cv.dataset.crop); cv.width = s.width * 3; cv.height = s.height * 3; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(s, 0, 0, cv.width, cv.height); });
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button.sp'); if (!b || b.disabled) return;
      const k = b.dataset.k; if (!(E().bag[k] > 0)) { const it = I[k]; if (E().fish < it.price) return; E().fish -= it.price; PP.econ.give(k, 1); }
      PP.hud && PP.hud.close(); cmd('plant', i, k);
    });
    if (PP.hud) PP.hud.pop(el, { x, y });
  }
  function cmd(a, b, c) { if (a === 'plant') { const p = mainP(); if (p) { p.interrupt(true); p.run('isleSow', A.isleSow, +b, c); } else if (PP.econ.plant(+b, c)) PP.ui.toast('种下了'); } }
  function setInside(v) {
    v = v === true ? 'house' : v || false;
    if (inside === v) return;
    const from = inside; inside = v; hover = null; smoke = []; drops = []; rips = [];
    if (v && G.save.flags) G.save.flags.isleIn = 1;
    layout(); G.ground = groundY();
    const at = v ? start() : from === 'gh' ? { u: GDOOR.u, v: GDOOR.v + 2.8, lv: 0 } : { u: DOOR.u, v: HOUSE.v1 + 1.8, lv: 0 };
    for (const q of G.pets) { q.interrupt(true); q.held = false; q.airborne = false; q.isleSpot = null; q.fishing = null; q.tool = null; q.iw = null; q.inHouse = !!v; setIp(q, at.u + U.rand(-0.4, 0.4), at.v, at.lv); q.ip.sc = inside || 'deck'; q.y = q.floor; q.facing = mir() ? -1 : 1; }
    roomT = 0; PP.placeOrb && PP.placeOrb();
  }

  // ---------- 主角在岛上过日子 ----------
  let roomT = 0;
  const day = () => { const e = E(); const d = new Date().toDateString(); if (!e.isleDay || e.isleDay.d !== d) e.isleDay = { d, fish: 0, cook: 0 }; return e.isleDay; };
  const say = (p, t, d = 2.6) => { p._forceSay = true; p.say(Array.isArray(t) ? U.pick(t) : t, d); p._forceSay = false; };
  const face = (p, u, v) => { const [a, b] = uvOf(p), d = ((u - a) - (v - b)) * (mir() ? -1 : 1); if (Math.abs(d) > 0.05) p.facing = d > 0 ? 1 : -1; };
  const gain = (p, txt) => PP.fx({ kind: 'text', text: txt, x: p.x, y: p.y - 30 * G.S, vy: -28, life: 1.5, style: { size: 11, bg: '#bff0c0' } });
  const fxAt = (u, v, z, o) => PP.fx(Object.assign({ x: scrU(u, v), y: scrV(u, v, z), s: 1 }, o));
  function* walkTo(p, u, v, run, lv = 0) { if (walkPlan(p, u, v, lv, run)) yield () => !p.iw; }
  // 跳上去 / 跳下来：一道小弧线，落地时身子一压（不再是平移）
  function* hop(p, to, T = 0.34) {
    const [u0, v0] = uvOf(p), z0 = p.isleSpot ? p.isleSpot.z : ipOf(p).z, hh = 2.2 + Math.abs(to.z - z0) * 0.25; face(p, to.u, to.v);
    p.anim = 'idle'; p.jolt(0, 2); yield 0.1;
    for (let t = 0; t < T; t += 1 / 60) { const k = t / T; p.isleSpot = { u: u0 + (to.u - u0) * k, v: v0 + (to.v - v0) * k, z: z0 + (to.z - z0) * k + Math.sin(k * Math.PI) * hh }; p.x = scrU(p.isleSpot.u, p.isleSpot.v); p.anim = k < 0.5 ? 'jump' : 'fall'; yield 1 / 60; }
    p.isleSpot = { u: to.u, v: to.v, z: to.z }; p.x = scrU(to.u, to.v); p.anim = 'land'; p.jolt(0, 2.4); yield 0.12; p.anim = 'idle';
  }
  function* hopOff(p, at) { const a = area(), lv = at[2] || 0; yield* hop(p, { u: at[0], v: at[1], z: Zf(a, lv, at[0], at[1]) }); p.isleSpot = null; setIp(p, at[0], at[1], lv); p.ip.sc = inside || 'deck'; }
  A.isleGo = function* (u, v, lv) { const p = this; yield* walkTo(p, u, v, null, lv || 0); p.anim = 'idle'; p.look = [0, 1]; if (Math.random() < 0.3) p.think(U.pick(['heart', 'note', 'sparkle']), 1.2); yield U.rand(2, 4); };
  A.isleOut = function* () { const p = this; p.anim = 'idle'; p.eyes = 'happy'; p.jolt(0, -3); yield 0.4; yield* walkTo(p, DOOR.u + U.rand(-2, 3), HOUSE.v1 + U.rand(4, 7)); p.eyes = 'open'; };
  const plotStand = (i) => [PLOTS[i][0] + PS / 2, PLOTS[i][1] + PS + 0.85];
  const plotC = (i) => [PLOTS[i][0] + PS / 2, PLOTS[i][1] + PS / 2, (K.PLOTZ ? K.PLOTZ[i] : 0) + PH[i] * 0.6];
  // 浇水：提着水壶走过去 → 壶一歪，水一道弧线洒到土里 → 土变深色
  A.isleWater = function* (i) {
    const p = this, [su, sv] = plotStand(i), [cu, cv, cz] = plotC(i);
    p.tool = { k: 'can', t0: performance.now() }; yield* walkTo(p, su, sv); face(p, cu, cv - 2); p.anim = 'idle'; p.eyes = 'happy'; yield 0.2;
    p.tool = { k: 'can', t0: performance.now(), pour: true };
    for (let k = 0; k < 14; k++) { fxAt(cu + U.rand(-1.2, 1.2), cv + U.rand(-1.2, 1.2), cz + 4.5, { vy: 46, icon: 'drop', life: 0.45 }); if (k % 4 === 0) p.jolt(0, 1); yield 0.11; }
    if (PP.econ.waterPlot(i)) p.think('heart', 1); p.tool = null; p.jolt(0, -2); yield 0.5;
  };
  // 播种：蹲下刨两下土 → 撒种子 → 拍一拍 → 浇水
  A.isleSow = function* (i, seed) {
    const p = this, [su, sv] = plotStand(i), [cu, cv, cz] = plotC(i);
    yield* walkTo(p, su, sv); face(p, cu, cv - 2); p.anim = 'eat';
    for (let k = 0; k < 4; k++) { p.jolt(k % 2 ? 1.5 : -1.5, 1); fxAt(cu + U.rand(-1, 1), cv + 0.6, cz + 1, { vx: U.rand(-30, 30), vy: -50, icon: 'leaf', life: 0.4 }); yield 0.22; }
    if (PP.econ.plant(i, seed)) { for (let k = 0; k < 5; k++) fxAt(cu + U.rand(-1, 1), cv + U.rand(-1, 1), cz + 3, { vy: 30, icon: 'sparkle', life: 0.5 }); PP.ui.toast(`种下了${PP.econ.ITEMS[seed].name.replace('种子', '').replace('球茎', '')}`); }
    p.anim = 'idle'; p.jolt(0, 2); yield 0.3; p.jolt(0, 2); yield 0.3;
    yield* A.isleWater.call(p, i);
  };
  // 收获：挎着篮子过去 → 弯腰拔三下 → 菜飞进篮子
  A.isleHarvest = function* (i) {
    const p = this, [su, sv] = plotStand(i), [cu, cv, cz] = plotC(i), inf = PP.econ.plotInfo(i), col = inf && CROP_COL[inf.crop];
    p.tool = { k: 'basket', t0: performance.now(), col }; yield* walkTo(p, su, sv); face(p, cu, cv - 2);
    for (let k = 0; k < 3; k++) { p.anim = 'eat'; p.jolt(k % 2 ? 2 : -2, 1.5); yield 0.28; p.anim = 'idle'; p.jolt(0, -2.5); fxAt(cu + (k - 1), cv, cz + 3, { vy: -70, vx: (p.x - scrU(cu, cv)) * 1.5, icon: 'sparkle', life: 0.5 }); yield 0.22; }
    PP.econ.harvest(i); p.tool.full = true; p.anim = 'jump'; p.jolt(0, -4); p.eyes = 'happy'; p.think('heart', 1.4); yield 0.5; p.anim = 'idle'; yield 0.9; p.tool = null;
  };
  A.isleMail = function* () { const p = this; yield* walkTo(p, MAILB.u, MAILB.v + 1.5); face(p, MAILB.u, MAILB.v - 2); p.anim = 'jump'; p.jolt(0, -3); yield 0.35; p.anim = 'idle'; p.think('excl', 1.5); yield 1; if (PP.econ.unread()) say(p, '信箱里有信哦～', 3); yield 1.5; };
  A.isleDrink = function* () { const p = this, wz = T.zAt(TANK.u, TANK.v); yield* walkTo(p, TANK.u, TANK.v + 2.4); face(p, TANK.u, TANK.v); p.anim = 'idle'; p.jolt(0, -2); yield 0.3; p.anim = 'eat'; for (let k = 0; k < 6; k++) { fxAt(TANK.u, TANK.v + 1, wz + 3, { vy: 30, icon: 'drop', life: 0.3 }); yield 0.3; } p.n.thirst = 100; gain(p, '不渴了'); p.anim = 'idle'; p.eyes = 'happy'; p.think('heart', 1); yield 1; p.eyes = 'open'; };
  A.isleFish = function* () {
    const p = this;
    yield* walkTo(p, FISH.u, FISH.v, null, 3); face(p, BOB.u, BOB.v + 6); p.anim = 'sit';
    const set = (ph) => { p.fishing = Object.assign(p.fishing || {}, { ph, t0: performance.now() }); };
    set('cast'); p.jolt(0, -2); yield 0.8; ripple(BOB.u, BOB.v); yield 0.6; set('wait'); yield U.rand(3, 7); set('nibble'); ripple(BOB.u, BOB.v); yield U.rand(0.9, 1.6);
    set('bite'); ripple(BOB.u, BOB.v); p.eyes = 'wide'; p.think('excl', 0.8); yield () => !p.fishing || p.fishing.helped || performance.now() - p.fishing.t0 > 1500;
    if (!p.fishing) return;
    const helped = !!p.fishing.helped, d = day(), got = helped || Math.random() < (PP.FISHDEX && PP.FISHDEX.lucky() ? 0.75 : 0.55);
    p.fishing.got = got; set('reel'); ripple(BOB.u, BOB.v); p.anim = 'jump'; p.jolt(0, -3); yield 0.85;
    p.fishing = null; p.anim = 'idle';
    if (got && PP.FISHDEX) {
      const f = PP.FISHDEX.caught(p);
      if (d.fish < 14 && f.eff !== 'junk') { d.fish++; if (helped) PP.econ.addFish(1, `你帮${p.name}收竿`, true); }
      p.think(f.rare >= 3 ? 'sparkle' : 'heart', 1.6); if (f.rare >= 3) { p.anim = 'jump'; p.jolt(0, -5); yield 0.4; p.anim = 'idle'; }
      if (f.eff === 'puff') { say(p, ['噗——鼓成球了！', '哈哈哈哈'], 2.2); }
      if (f.id === 'boot') say(p, '……靴子？', 2);
    } else if (got && d.fish < 14 && (helped || Math.random() < 0.6)) { d.fish++; PP.econ.addFish(helped ? 2 : 1, helped ? `你帮${p.name}收竿，钓到一条鱼` : `${p.name}钓到一条鱼`); }
    else say(p, ['跑掉了……', '哎呀，只钓到一根水草', '下次一定！'], 2.5);
    p.eyes = 'happy'; p.n.fun = Math.min(100, p.n.fun + 15); yield 1.6; p.eyes = 'open';
  };
  A.isleCook = function* () {
    const p = this;
    yield* walkTo(p, ku - 0.6, R0 + 4.6); face(p, ku, R0 - 2); p.anim = 'idle'; cooking = true; p.think(U.pick(['cake', 'bowl', 'bread']), 3);
    for (let k = 0; k < 9; k++) { p.jolt(k % 2 ? 1.5 : -1.5, k % 3 ? 0 : -1); yield 0.42; }
    cooking = false; const d = day(); if (PP.quest) PP.quest.on('cook');
    if (d.cook < 4 && Math.random() < 0.5) { d.cook++; PP.econ.give('biscuit', 1); PP.ui.toast(`${p.name}烤了一块小饼干，放进背包了`); }
    else { p.n.hunger = Math.min(100, p.n.hunger + 30); say(p, '做了点好吃的，自己先吃啦～', 2.5); p.anim = 'eat'; yield 1.5; }
    p.anim = 'idle'; p.eyes = 'happy'; yield 1; p.eyes = 'open';
  };
  // 鸡舍：走到小梯子前，弯腰摸一摸，捡到今天的鸡蛋（一天最多 3 个）
  A.isleCoop = function* () {
    const p = this, d = day(); yield* walkTo(p, COOP.u + 0.4, COOP.v + 4.8); face(p, COOP.u, COOP.v);
    for (let k = 0; k < 3; k++) { p.anim = 'eat'; p.jolt(k % 2 ? 1.5 : -1.5, 1); yield 0.3; p.anim = 'idle'; yield 0.2; }
    chickT = performance.now();
    if ((d.egg || 0) < 3) { d.egg = (d.egg || 0) + 1; PP.econ.give('henegg', 1); p.think('heart', 1.4); say(p, ['热乎乎的鸡蛋！', '捡到一个蛋～', '母鸡咯咯哒'], 2); if (PP.quest) PP.quest.on('egg'); }
    else say(p, ['今天的蛋都捡完啦', '母鸡说明天再来'], 2);
    p.eyes = 'happy'; yield 1.2; p.eyes = 'open';
  };
  // 蜂箱：戴上小网兜，掀开盖子，蜜蜂绕着飞；收一罐蜂蜜（一天 1 罐）
  A.isleHive = function* () {
    const p = this, d = day(); yield* walkTo(p, HIVE.u - 0.4, HIVE.v + 3); face(p, HIVE.u, HIVE.v);
    beeBoost = performance.now(); p.eyes = 'wide'; yield 0.6;
    for (let k = 0; k < 4; k++) { p.jolt(k % 2 ? 2 : -2, 0); yield 0.3; }
    if (!d.honey) { d.honey = 1; PP.econ.give('honeyjar', 1); p.anim = 'jump'; p.jolt(0, -4); say(p, ['一罐金黄的蜂蜜！', '好香好甜'], 2.2); if (PP.quest) PP.quest.on('honey'); yield 0.5; p.anim = 'idle'; }
    else { say(p, ['蜜蜂还在酿，明天再来', '嗡嗡嗡……先不打扰它们'], 2.2); }
    p.eyes = 'happy'; yield 1; p.eyes = 'open';
  };
  // 上床睡觉：打个哈欠 → 爬上床 → 原地转一圈 → 钻进被窝（被子盖到身上）→ 冒 zZ → 睡饱了伸个懒腰跳下床
  A.isleBedSleep = function* (pr) {
    const p = this;
    p.eyes = 'sleepy'; say(p, ['困了……', '要睡觉觉了', '呼——好困'], 1.6); p.anim = 'idle'; yield 1;
    if (pr.spot) yield* hop(p, pr.spot);
    p.facing = -p.facing; yield 0.3; p.facing = -p.facing; yield 0.3;
    p.anim = 'lie'; yield 0.6; p.anim = 'sleep'; p.eyes = 'closed'; p.sleeping = true; p.inBed = { t0: performance.now() };
    let t = 0, zz = 0; const dur = U.rand(18, 34);
    while (t < dur && p.n.energy < 100) { yield 0.5; t += 0.5; zz += 0.5; p.n.energy = Math.min(100, p.n.energy + 2.5); if (zz >= 2) { zz = 0; PP.fx({ x: p.x + p.facing * 6 * G.S, y: p.y - 14 * G.S, vx: 10, vy: -16, icon: 'zzz', life: 2.2, s: Math.max(1, G.S - 1) }); } }
    p.inBed = null; p.sleeping = false; p.anim = 'lie'; p.eyes = 'sleepy'; yield 0.8;
    p.anim = 'idle'; p.eyes = 'open'; p.jolt(0, -2); yield 0.3; p.jolt(0, -3); say(p, ['睡饱啦！', '早上好～', '精神满满'], 2); p.eyes = 'happy';
    gain(p, '体力满了'); yield 1; p.eyes = 'open';
  };
  const prop = (sc, id) => PROPS[sc].find((q) => q.id === id);
  A.isleBed = function* () { yield* A.isleUse.call(this, prop('house', PICK.bed)); };
  A.isleChair = function* () { yield* A.isleUse.call(this, prop('house', PICK.chair)); };
  A.isleGarden = function* () { yield* A.isleUse.call(this, prop('gh', PICK.bench)); };
  A.isleSit = function* (sl) {
    const p = this, lv = 0, z = T.zAt(sl.u, sl.v), at = [sl.u + 0.4, sl.v + 2, lv];
    yield* walkTo(p, at[0], at[1], null, lv);
    if (sl.id === 'hay') { yield* hop(p, { u: sl.u, v: sl.v, z: z + 3.2 }); p.anim = 'lie'; p.eyes = 'sleepy'; yield U.rand(5, 10); p.n.energy = Math.min(100, p.n.energy + 12); gain(p, '+体力'); p.eyes = 'open'; yield* hopOff(p, at); }
    else if (sl.id === 'swing') { p.n.fun = Math.min(100, p.n.fun + 4); yield* hop(p, { u: sl.u, v: sl.v + 0.1, z: z + 3.4 }); p.anim = 'sit'; const x0 = p.x; for (let t = 0; t < 8; t += 1 / 30) { p.x = x0 + Math.sin(t * 2.4) * 2.4 * L.u; p.isleSpot.z = z + 3.4 + (1 - Math.cos(t * 4.8)) * 0.5; p.facing = Math.cos(t * 2.4) > 0 ? 1 : -1; yield 1 / 30; } p.x = x0; p.n.fun = Math.min(100, p.n.fun + 12); gain(p, '+心情'); yield* hopOff(p, at); }
    else { yield* hop(p, { u: sl.u, v: sl.v + 0.1, z: z + 2.6 }); p.anim = 'sit'; p.eyes = Math.random() < 0.5 ? 'happy' : 'open'; yield U.rand(5, 9); p.n.energy = Math.min(100, p.n.energy + 10); gain(p, '+体力'); p.eyes = 'open'; yield* hopOff(p, at); }
    p.anim = 'idle';
  };
  A.isleHouse = function* (go) {
    const p = this;
    if (go === true) go = 'house';
    if (go === 'house') { yield* walkTo(p, DOOR.u, HOUSE.v1 + 1.6); face(p, DOOR.u, 0); yield 0.2; setInside('house'); }
    else if (go === 'gh') { yield* walkTo(p, GDOOR.u, GDOOR.v + 2.6, null, 0); face(p, GDOOR.u, 0); yield 0.2; setInside('gh'); }
    else { const s = start(); yield* walkTo(p, s.u, s.v + 1, null, 0); yield 0.2; setInside(false); }
  };
  A.isleFurn = function* (k) { const pr = PROPS.house.find((q) => q.f === k); if (pr && (E().room || {})[k]) yield* A.isleUse.call(this, pr); };
  A.isleUse = function* (pr) {
    const p = this, d = day(), S2 = () => G.S, k = pr.do, a = area();
    const spark = (ic, n = 4, up = 20) => { for (let i = 0; i < n; i++) PP.fx({ x: p.x + U.rand(-12, 12) * S2(), y: p.y - up * S2(), vy: -30, icon: ic, life: 0.9, s: 1 }); };
    yield* walkTo(p, pr.at[0], pr.at[1], null, pr.at[2] || 0);
    if (pr.spot) yield* hop(p, pr.spot);
    p.anim = 'idle';
    if (k === 'sleep') { yield* A.isleBedSleep.call(p, {}); }
    else if (k === 'sit') { p.anim = 'sit'; p.eyes = 'sleepy'; p.think(U.pick(['book', 'note', 'heart']), 2.5); yield U.rand(5, 9); p.n.energy = Math.min(100, p.n.energy + 15); gain(p, '+体力'); p.eyes = 'open'; }
    else if (k === 'piano') { p.anim = 'sit'; for (let i = 0; i < 10; i++) { PP.fx({ x: p.x + U.rand(-10, 10), y: p.y - 24 * S2(), vy: -24, icon: 'note', life: 1, s: 1 }); p.jolt(0, i % 2 ? -1 : 1); yield 0.4; } p.n.fun = Math.min(100, p.n.fun + 15); gain(p, '+心情'); }
    else if (k === 'shake') { face(p, TREE.u, TREE.v); for (let i = 0; i < 6; i++) { p.jolt(i % 2 ? 2.5 : -2.5, 0); fxAt(TREE.u + U.rand(-2.6, 2.6), TREE.v + U.rand(-2.6, 2.6), 17, { vy: 50, vx: U.rand(-10, 10), icon: 'leaf', life: 1 }); yield 0.22; } if ((d.tree || 0) < 3 && season() !== 'winter' && Math.random() < 0.7) { d.tree = (d.tree || 0) + 1; const it = U.pick(['apple', 'apple', 'berry']); PP.econ.give(it, 1); fxAt(TREE.u - 1, TREE.v + 1, 14, { vy: 60, icon: it === 'apple' ? 'apple' : 'berry', life: 0.9 }); say(p, it === 'apple' ? '掉下来一个苹果！' : '掉下来一颗浆果！'); if (PP.quest) PP.quest.on('shake'); } else say(p, d.tree >= 3 ? ['今天的果子都摇完啦'] : ['掉了一头叶子', '树上的鸟被吓跑了']); yield 1.6; }
    else if (k === 'lamp') { p.anim = 'jump'; p.jolt(0, -4); spark('sparkle', 3, 26); yield 0.5; p.anim = 'idle'; say(p, night() ? ['亮晶晶的', '有它就不怕黑'] : ['晚上它会亮哦']); yield 1.4; }
    else if (k === 'clock') { const t = new Date(); p.look = [0, -1]; yield 0.8; say(p, `现在是 ${t.getHours()} 点 ${String(t.getMinutes()).padStart(2, '0')} 分`); yield 2; }
    else if (k === 'warm') { p.anim = 'sit'; p.eyes = 'happy'; spark('heart', 1); yield U.rand(5, 8); p.n.energy = Math.min(100, p.n.energy + 6); p.eyes = 'open'; }
    else if (k === 'kitchen') { yield* A.isleCook.call(p); }
    else if (k === 'write') { p.anim = 'sit'; p.think('book', 2.5); for (let i = 0; i < 6; i++) { p.jolt(i % 2 ? 0.8 : -0.8, 0); yield 0.4; } say(p, ['今天也是开心的一天', '写下：钓到一条鱼', '日记：主人今天摸了我']); yield 2; }
    else if (k === 'rummage') { p.anim = 'eat'; for (let i = 0; i < 6; i++) { p.jolt(i % 2 ? 1.5 : -1.5, i % 3 ? 0 : -1); yield 0.3; } p.anim = 'idle'; if ((d.rum || 0) < 3 && Math.random() < 0.5) { d.rum = (d.rum || 0) + 1; PP.econ.addFish(1, `${p.name}翻到一条小鱼干`); spark('sparkle', 3); say(p, '翻到一条小鱼干！'); } else say(p, ['只有灰尘……', '找到一只旧袜子', '空的']); yield 1.6; }
    else if (k === 'water' || k === 'tend') { p.tool = { k: 'can', t0: performance.now(), pour: true }; for (let i = 0; i < 8; i++) { PP.fx({ x: p.x + p.facing * 14 * S2(), y: p.y - 12 * S2(), vy: 30, icon: 'drop', life: 0.4, s: 1 }); yield 0.25; } p.tool = null; p.think('flower', 1.4); p.n.fun = Math.min(100, p.n.fun + 8); if (k === 'tend' && !d.gh && Math.random() < 0.35) { d.gh = 1; PP.econ.give('tulip', 1); PP.ui.toast(`${p.name}在花房里剪了一朵郁金香，放进背包了`); } yield 1; }
    else if (k === 'look') { p.look = [0, -1]; p.anim = 'sit'; const fx = wfx(); p.think(fx.rain ? 'drop' : fx.snow ? 'sparkle' : night() ? 'moon' : 'note', 2.2); yield 2.4; say(p, pr.say || ['风景真好']); p.n.fun = Math.min(100, p.n.fun + 8); yield 2.4; }
    else if (k === 'pick') { p.anim = 'jump'; p.jolt(0, -4); yield 0.45; p.anim = 'eat'; yield 1.2; p.n.thirst = Math.min(100, p.n.thirst + 30); say(p, ['柠檬好酸！', '酸得眼睛都眯起来了']); p.eyes = 'closed'; p.anim = 'idle'; yield 1.5; p.eyes = 'open'; }
    else if (k === 'drink') { p.anim = 'eat'; yield 2; p.n.thirst = 100; gain(p, '不渴了'); spark('heart', 1); p.anim = 'idle'; yield 0.8; }
    else if (k === 'sniff') { p.look = [0, -1]; p.think('flower', 2); yield 2.4; p.eyes = 'happy'; yield 1; p.eyes = 'open'; }
    else if (k === 'furn') {
      const id = (E().room || {})[pr.f];
      if (pr.f === 'rug') { p.anim = Math.random() < 0.5 ? 'knead' : 'roll'; yield U.rand(3, 6); }
      else if (id === 'shelf') { p.anim = 'sit'; p.think('book', 3); yield 4; } else if (id === 'table') { p.anim = 'sit'; p.think('cake', 2.5); yield 3; }
      else if (id === 'piano') { p.anim = 'sit'; for (let i = 0; i < 10; i++) { PP.fx({ x: p.x + U.rand(-10, 10), y: p.y - 24 * S2(), vy: -24, icon: 'note', life: 1, s: 1 }); p.jolt(0, i % 2 ? -1 : 1); yield 0.4; } }
      else if (id === 'rocker') { p.anim = 'sit'; p.eyes = 'sleepy'; for (let t = 0; t < 6; t += 0.2) { p.jolt(Math.sin(t * 3) * 1.5, 0); yield 0.2; } }
      else { p.look = [0, -1]; yield 2; }
    }
    if (pr.spot) yield* hopOff(p, pr.at);
    p.anim = 'idle'; p.eyes = 'open'; p.look = [0, 0];
  };
  const baseEnter = A.enterDoor, baseEmerge = A.emerge;
  A.enterDoor = function* (done) { if (!G.isle) { yield* baseEnter.call(this, done); return; } const p = this; if (!inside) { yield* walkTo(p, DOOR.u, HOUSE.v1 + 1.6); yield 0.2; } p.inDoor = true; done && done(); };
  A.emerge = function* () { if (!G.isle) { yield* baseEmerge.call(this); return; } const p = this; p.inDoor = false; p.ip = null; p.iw = null; p.isleSpot = null; ipOf(p); p.y = p.floor; if (!inside) yield* A.isleOut.call(p); };
  const baseDecide = PP.Pet.prototype.decide;
  PP.Pet.prototype.decide = function () {
    if (G.isle && this.isleSpot && !this.sleeping && !this.fishing) { const s = this.isleSpot, a = area(), q = ipOf(this); this.isleSpot = null; if (Math.hypot(s.u - q.u, s.v - q.v) > 6) { const c = nearFree(a, s.u, s.v, q.lv); setIp(this, c[0], c[1], q.lv); this.ip.sc = inside || 'deck'; } }
    if (G.isle && this.tool && !this.gen) this.tool = null;
    if (G.isle && G.pets.includes(this) && !this.held && !(G.save.settings.quiet) && Math.random() < 0.7) {
      const e = E(), p = this, PR = (PROPS[inside || 'deck'] || []).filter((q) => !q.f || (e.room || {})[q.f]), useAny = (ch) => (PR.length && Math.random() < ch ? (p.run('isleUse', A.isleUse, U.pick(PR)), true) : false), fx = wfx(), wet = fx.rain > 0.3 || fx.snow > 0.5 || fx.storm, R = (n, f, ...a) => { p.run(n, f, ...a); return true; };
      const roam = () => { const cs = cellList(); if (!cs.length) return false; const c = U.pick(cs); return R('isleGo', A.isleGo, c[2], c[3], c[4]); };
      if (inside === 'house') {
        roomT++;
        if (p.n.energy < 55 && Math.random() < 0.6) return R('isleBed', A.isleBed);
        if (roomT > (wet ? 9 : 4) && Math.random() < (wet ? 0.12 : 0.35)) return R('isleHouse', A.isleHouse, false);
        if (useAny(0.6)) return true;
        return roam();
      } else if (inside === 'gh') {
        roomT++;
        if (roomT > 3 && Math.random() < 0.4) return R('isleHouse', A.isleHouse, false);
        if (useAny(0.6)) return true;
        return roam();
      } else {
        if (wet && Math.random() < 0.45) return R('isleHouse', A.isleHouse, Math.random() < 0.75 ? 'house' : 'gh');
        const grow = PLOTS.map((_, i) => i).filter((i) => { const inf = PP.econ.plotInfo(i); return inf && inf.stage < 3 && (e.farm[i].water || 0) < 3; });
        if (grow.length && !fx.rain && Math.random() < 0.3) return R('isleWater', A.isleWater, U.pick(grow));
        if (PP.econ.unread() && Math.random() < 0.25) return R('isleMail', A.isleMail);
        if (p.n.thirst < 60 && Math.random() < 0.5) return R('isleDrink', A.isleDrink);
        const sl = (e.isleDeco || []).map((id, i) => ({ id, i, u: SLOTS[i] && SLOTS[i][0], v: SLOTS[i] && SLOTS[i][1] })).filter((s) => ['bench', 'swing', 'hay'].includes(s.id));
        if (sl.length && Math.random() < 0.25) return R('isleSit', A.isleSit, U.pick(sl));
        if (Math.random() < 0.2) return R('isleFish', A.isleFish);
        if (useAny(0.2)) return true;
        if (Math.random() < 0.1) return R('isleHouse', A.isleHouse, 'gh');
        if (((night() || p.n.energy < 40) && Math.random() < 0.5) || Math.random() < 0.08) return R('isleHouse', A.isleHouse, 'house');
        if (Math.random() < 0.6) return roam();
      }
    }
    return baseDecide.call(this);
  };
  setInterval(() => { try { if (!G.save || !PP.econ) return; if (wfx().rain > 0.3) (E().farm || []).forEach((pl) => { if (pl && (pl.water || 0) < 3) pl.water = (pl.water || 0) + 1; }); } catch (err) {} }, 10 * 60000);

  function dirty() { dirtyK++; }
  setInterval(() => { if (PP.started && G.save) sync(); }, 1500);
  const doorX = () => { if (!L) layout(); const s = start(); return scrU(s.u, s.v); };
  PP.isle = { resetCam, props: () => PROPS, doorX, floorY, sync, layout, groundY, zone, renderBack, renderFront, hot, click, down, cmd, dirty, inside: () => inside, setInside, rect: () => L, scale: () => (L ? L.u : zoomOf()) * 0.34, zoom: () => (L ? L.u : zoomOf()), setSize, setZoom, resetPos, setMirror, mirror: mir, SIZES, Z0, safeB, SLOT_NAME, seedPicker, pressing: () => !!press, uvOf, walking: (p) => !!p.iw, step, gotoX, cells: cellList, areas: AREAS, free: (u, v, lv) => free(area(), u, v, lv) };
})();
