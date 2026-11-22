// 小岛视图 = 一整座浮空城堡（模型 fort.js，引擎 isle3d.js）。这里是玩法：
//   外部视角：整座城堡；点任何一扇门 → 剖切进那一层（同一个模型，上面拿掉、朝镜头的墙压矮），能转能缩放
//   宠物在“世界坐标”里走路：一层一层的地板、墙上的门洞、楼梯塔里的楼梯；室内室外用同一套寻路
//   鼠标指到的东西按模型精确判定（拾取），鼠标变成对应的手型
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G, A = PP.ACTIONS, g3 = PP.g3, F = PP.FORT, FURN = PP.FURN;
  FURN.setScale(F.FS);
  const { Z, PLOTS, PS, POOL, FISH, BOB, HIVES, MAILB, TAP, LAMPS, SLOTS, NEST, GPOTS, PK, CEN, ROOMS, RM } = F;
  const SLOT_NAME = ['田边', '信箱旁', '花房门口', '池子东边', '池子西边', '池子前面'];
  const S = () => G.save.settings, E = () => PP.econ.E();
  let beeBoost = 0;
  let fedit = false, fsel = -1, fdrag = null, fbar = null, cbar = null;
  let fp = null; // 第一人称
  let focus = null; // 详细视图：只看一个房间（房间 id），镜头推近、别的都不画
  let L = null, cut = null, hover = null, dirtyK = 0, smoke = [], cooking = false, mark = null, drops = [], flash = 0, press = null, rips = [];
  let meshes = {}, dynMesh = null, glOK = true, lastScenes = null, lastLO = null;
  const mir = () => !!(G.save && S().isleMirror), org = () => (bnd() || { org: [0, 0] }).org;
  // 俯仰角：可以转到底下看城堡的底部；水平附近（看不出前后）跳过
  const pitchOK = (v) => { v = U.clamp(v, -72, 80); return Math.abs(v) < 10 ? (v < 0 ? -10 : 10) : v; };
  const cam = () => { if (!G.save) return { c: 1, s: 0, A: 1, B: 1, yaw: 0 }; const y = +S().isleYaw || 0, ph = pitchOK(+S().islePitch || 45) * Math.PI / 180; return { c: Math.cos(y), s: Math.sin(y), A: Math.SQRT2 * Math.sin(ph), B: Math.SQRT2 * Math.cos(ph), yaw: y }; };
  const rotUV = (u, v, k = cam()) => { const du = u - CEN[0], dv = v - CEN[1]; return [du * k.c - dv * k.s + CEN[0], du * k.s + dv * k.c + CEN[1]]; };
  const depth = (u, v) => { const r = rotUV(u, v); return r[0] + r[1]; };
  const IWf = () => (bnd() || { IW: 200 }).IW, IHf = () => (bnd() || { IH: 200 }).IH;
  const cx = (u, v) => { const k = cam(), [ru, rv] = rotUV(u, v, k), x = org()[0] + 2 * (ru - rv); return mir() ? IWf() - x : x; }, cy = (u, v, z = 0) => { const k = cam(), [ru, rv] = rotUV(u, v, k); return org()[1] + ((ru + rv) * k.A - z * k.B); };
  // 剖切：朝镜头的方向（世界坐标）
  const cutO = () => { if (cut == null) return null; const k = cam(); return { lv: cut, vu: k.c + k.s, vv: k.c - k.s, low: focus ? 0.3 : 2.2 }; };
  const quad = () => { const k = cam(); return (k.c + k.s > 0 ? 1 : 0) + (k.c - k.s > 0 ? 2 : 0); };
  // 外面的画框：按整座城堡（外部）算，进屋剖切时画框不跳
  let bndC = null, extPos = null, extKey = '';
  // 详细视图的画框：按这个房间（连墙、到屋顶）算
  let fbC = null;
  function bndFocus() {
    const r = RM[focus], k = cam(), key = [focus, k.yaw.toFixed(3), k.A.toFixed(3)].join('|'); if (fbC && fbC.key === key) return fbC;
    const z0 = Z[r.lv] - 1.5, z1 = Z[r.lv] + F.roomH(r) + 1, pts = [];
    if (r.c) for (let a = 0; a < 6.28; a += 0.4) pts.push([r.c[0] + Math.cos(a) * (r.c[2] + 1), r.c[1] + Math.sin(a) * (r.c[2] + 1)]);
    else { const [a, b, c, d] = r.r; for (const q of [[a - 1, b - 1], [c + 1, b - 1], [a - 1, d + 1], [c + 1, d + 1]]) pts.push(r.rot ? F.toW(r, ...q) : q); }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [u, v] of pts) for (const z of [z0, z1]) { const du = u - CEN[0], dv = v - CEN[1], ru = du * k.c - dv * k.s + CEN[0], rv = du * k.s + dv * k.c + CEN[1], X = 2 * (ru - rv), Y = (ru + rv) * k.A - z * k.B; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
    return (fbC = { key, IW: Math.ceil(x1 - x0 + 8), IH: Math.ceil(y1 - y0 + 6), org: [-x0 + 4, -y0 + 3] });
  }
  function bnd() { if (focus && RM[focus]) return bndFocus(); return bndExt(); }
  // 详细视图里放大多少倍：让画框和看整座城堡时差不多大
  function focusK() { if (!focus || !RM[focus]) return 1; const e = bndExt(), f = bndFocus(); return e && f ? U.clamp(Math.min(e.IW / f.IW, e.IH / f.IH), 1, 8) : 1; }
  function bndExt() {
    if (!extPos) return null; const k = cam(), key = [k.yaw.toFixed(3), k.A.toFixed(3), extKey].join('|');
    if (bndC && bndC.key === key) return bndC;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const P = extPos;
    for (let i = 0; i < P.length; i += 3) { const du = P[i] - CEN[0], dv = P[i + 1] - CEN[1], ru = du * k.c - dv * k.s + CEN[0], rv = du * k.s + dv * k.c + CEN[1], X = 2 * (ru - rv), Y = (ru + rv) * k.A - P[i + 2] * k.B; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
    y0 -= 26; // 上面留点地方（热气球、烟）
    return (bndC = { key, IW: Math.ceil(x1 - x0 + 8), IH: Math.ceil(y1 - y0 + 4), org: [-x0 + 4, -y0 + 2] });
  }
  function want() { const s = G.save && S(); return !!(s && s.mode === 'mini' && s.isle && !s.taskbar); }
  const env = () => PP.env.get(), season = () => (PP.season ? PP.season() : 'summer'), phase = () => env().time.phase, night = () => phase() === 'night', wfx = () => env().fx;
  const snowy = () => season() === 'winter' || wfx().snow > 0.3, tripping = () => G.all.some((p) => p.d.trip);
  const today = () => new Date().toDateString();
  // 城堡的“身体”：锅炉的柴（0~100）。柴够，翅膀扇得有劲、有热水、花房暖和；没柴了慢慢扇，洗澡水是凉的
  const fort = () => { const e = E(); if (!e.fort) e.fort = { fuel: 70, t: Date.now(), egg: '' }; const f = e.fort, now = Date.now(); if (now - f.t > 60000) { f.fuel = Math.max(0, f.fuel - ((now - f.t) / 60000) * 0.12); f.t = now; } return f; };
  const power = () => { const f = fort().fuel; return f <= 0 ? 0.08 : 0.25 + 0.75 * Math.min(1, f / 60); };

  // ---------- 地面：每层的地板、墙（门洞）、陈设、家具 ----------
  const furnObs = () => FURN.layout(E()).filter((it) => !FURN.D[it.f].walk && (fdrag ? it !== fdrag.it : true)).flatMap((it) => F.rectObs(F.frameOf(it.room || 'living'), F.roomLv(it.room || 'living'), FURN.rect(it, 0.3)));
  const extraObs = () => furnObs().concat((E().isleDeco || []).map((id, i) => (id && SLOTS[i] ? [1, 'c', SLOTS[i][0], SLOTS[i][1], id === 'lampPost' ? 0.4 : 1.5] : null)).filter(Boolean));
  const AREA = { z: Z, inF: F.AREA.inF, ramps: F.AREA.ramps, obst: () => F.AREA.obst(extraObs()), solid: () => F.AREA.solid(extraObs()) };
  const area = () => AREA;
  const Zf = (a, lv) => a.z[lv];
  const rampT = (r, u, v) => U.clamp(((r.axis === 'u' ? u : v) - r.lo) / (r.hi - r.lo), 0, 1);
  const GS = 0.5, GN = 144, G0 = -10; // 网格从 -10 开始：伸出去的阳台、葡萄架也在格子里
  const gi = (u) => Math.round((u - G0) / GS), gu = (i) => i * GS + G0;
  let grids = {}, cells = {};
  function grid(a) {
    const key = 'f' + dirtyK;
    if (grids.key !== key) { grids = { key }; cells = {}; }
    if (grids.g) return grids.g;
    const ob = a.obst(), g = a.z.map(() => new Uint8Array(GN * GN));
    for (let lv = 0; lv < a.z.length; lv++) for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
      const u = gu(i), v = gu(j); let ok = a.inF(lv, u, v) && a.inF(lv, u + 0.45, v) && a.inF(lv, u - 0.45, v) && a.inF(lv, u, v + 0.45) && a.inF(lv, u, v - 0.45);
      if (ok) for (const r of a.ramps) if (u > r.u0 - 0.3 && u < r.u1 + 0.3 && v > r.v0 - 0.3 && v < r.v1 + 0.3) { ok = false; break; }
      if (ok) for (const o of ob) { if (o[0] !== lv) continue; if (o[1] === 'c' ? Math.hypot(u - o[2], v - o[3]) < o[4] + 0.3 : u > o[1] - 0.45 && u < o[3] + 0.45 && v > o[2] - 0.45 && v < o[4] + 0.45) { ok = false; break; } }
      g[lv][j * GN + i] = ok ? 1 : 0;
    }
    return (grids.g = g);
  }
  const free = (a, u, v, lv) => { const i = gi(u), j = gi(v); return i >= 0 && j >= 0 && i < GN && j < GN && !!(grid(a)[lv] || [])[j * GN + i]; };
  function nearFree(a, u, v, lv) {
    if (free(a, u, v, lv)) return [u, v];
    const g = grid(a)[lv], i0 = gi(u), j0 = gi(v); let best = null, bd = 1e9;
    for (let r = 1; r < 60 && (!best || r * GS < bd + 1); r++) for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) { if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r || i < 0 || j < 0 || i >= GN || j >= GN || !g[j * GN + i]) continue; const d = Math.hypot(gu(i) - u, gu(j) - v); if (d < bd) { bd = d; best = [gu(i), gu(j)]; } }
    return best || [u, v];
  }
  const los = (a, lv, p, q) => { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.3); for (let k = 1; k < n; k++) if (!free(a, p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n, lv)) return false; return true; };
  function pathIn(a, lv, s, t) {
    s = nearFree(a, s[0], s[1], lv); t = nearFree(a, t[0], t[1], lv);
    if (los(a, lv, s, t)) return [t];
    const g = grid(a)[lv], si = gi(s[0]) + gi(s[1]) * GN, ti = gi(t[0]) + gi(t[1]) * GN;
    const cost = new Float32Array(GN * GN).fill(1e9), from = new Int32Array(GN * GN).fill(-1), fsc = new Float32Array(GN * GN), inOpen = new Uint8Array(GN * GN), open = [si]; cost[si] = 0; inOpen[si] = 1; const hh = (k) => Math.hypot((k % GN) - (ti % GN), Math.floor(k / GN) - Math.floor(ti / GN));
    fsc[si] = hh(si); let found = false, guard = 0, bestN = si, bestH = hh(si);
    while (open.length && guard++ < 40000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (fsc[open[k]] < fsc[open[bi]]) bi = k;
      const c = open[bi]; open[bi] = open[open.length - 1]; open.pop(); inOpen[c] = 0; if (c === ti) { found = true; break; } { const h0 = hh(c); if (h0 < bestH) { bestH = h0; bestN = c; } }
      const ci = c % GN, cj = Math.floor(c / GN);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GN || nj >= GN) continue; const n = nj * GN + ni; if (!g[n] || (di && dj && (!g[cj * GN + ni] || !g[nj * GN + ci]))) continue; const nc = cost[c] + (di && dj ? 1.414 : 1); if (nc < cost[n]) { cost[n] = nc; from[n] = c; fsc[n] = nc + hh(n); if (!inOpen[n]) { open.push(n); inOpen[n] = 1; } } }
    }
    const end = found ? ti : bestN; if (end === si) return [];
    const raw = []; for (let c = end; c !== -1 && c !== si; c = from[c]) raw.unshift([gu(c % GN), gu(Math.floor(c / GN))]);
    if (found) raw[raw.length - 1] = t;
    const out = []; let cur = s, k = 0;
    while (k < raw.length) { let far = k; for (let q = raw.length - 1; q > k; q--) if (los(a, lv, cur, raw[q])) { far = q; break; } out.push(raw[far]); cur = raw[far]; k = far + 1; }
    return out;
  }
  function route(a, from, to) {
    const prev = { [from]: null }, q = [from];
    while (q.length) { const c = q.shift(); if (c === to) break; for (const r of a.ramps) { const n = r.a === c ? r.b : r.b === c ? r.a : null; if (n != null && !(n in prev)) { prev[n] = [c, r]; q.push(n); } } }
    const out = []; let c = to; while (prev[c]) { out.unshift([prev[c][1], c]); c = prev[c][0]; } return out;
  }
  const rampEnds = (r) => { const mid = r.axis === 'u' ? (r.v0 + r.v1) / 2 : (r.u0 + r.u1) / 2, sg = Math.sign(r.lo - r.hi), P = (e, s) => (r.axis === 'u' ? [e + s * 0.9, mid] : [mid, e + s * 0.9]); return [P(r.lo, sg), P(r.hi, -sg)]; };
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
  // 缩放不再被屏幕大小卡住：放大到比屏幕还大时，城堡框伸出屏幕外，只渲染看得见的那一块（像放大镜），拖动空白处平移
  const ZMIN = 1.4, ZMAX = 18, Z0 = 3, zoomOf = () => U.clamp(+(G.save && S().isleZ) || Z0, ZMIN, ZMAX);
  function layout() {
    if (!extPos) ensureExt();
    const u = zoomOf() * focusK(), w = Math.round(IWf() * u), h = Math.round(IHf() * u), pos = G.save && S().islePos, sb = safeB();
    let x1 = pos ? pos.x * G.W : G.W - 4, y1 = pos ? pos.y * sb : sb - 2;
    x1 = U.clamp(x1, Math.min(w + 2, G.W - 2), Math.max(w + 2, G.W - 2)); y1 = U.clamp(y1, Math.min(h + 2, sb - 2), Math.max(h + 2, sb - 2));
    L = { u, x0: Math.round(x1 - w), y0: Math.round(y1 - h), x1: Math.round(x1), y1: Math.round(y1), w, h };
    // 看得见的那一块（屏幕坐标）
    L.vx0 = Math.max(0, L.x0); L.vy0 = Math.max(0, L.y0); L.vx1 = Math.min(G.W, L.x1); L.vy1 = Math.min(G.H, L.y1); L.vw = Math.max(1, L.vx1 - L.vx0); L.vh = Math.max(1, L.vy1 - L.vy0);
    /* 第一人称全屏（F）：画面铺满整个屏幕 */
    if (fp && S().fpFull) { L.vx0 = 0; L.vy0 = 0; L.vx1 = G.W; L.vy1 = sb; L.vw = G.W; L.vh = sb; }
    const rs = document.documentElement.style; rs.setProperty('--isk', U.clamp(u / Z0, 0.55, 1.5).toFixed(3)); rs.setProperty('--isR', Math.max(4, G.W - L.x1) + 'px'); rs.setProperty('--isB', Math.max(4, G.H - L.y0 + 6) + 'px');
    try { if (cbar) setTimeout(cBar, 0); else if (tagsEl) setTimeout(placeTags, 0); } catch (e) {}
    return L;
  }
  const sx = (x) => L.x0 + x * L.u, sy = (y) => L.y0 + y * L.u;
  const scrU = (u, v) => sx(cx(u, v)), scrV = (u, v, z = 0) => sy(cy(u, v, z));
  function toUV(x, y, z) {
    const k = cam(); let X = (x - L.x0) / L.u; if (mir()) X = IWf() - X; X = X - org()[0]; const Y = ((y - L.y0) / L.u - org()[1] + z * k.B) / k.A;
    const ru = (Y + X / 2) / 2, rv = (Y - X / 2) / 2, du = ru - CEN[0], dv = rv - CEN[1];
    return [du * k.c + dv * k.s + CEN[0], -du * k.s + dv * k.c + CEN[1]];
  }
  const HALL_OUT = { u: 20.6, v: 21.6, lv: 1 }; // 门厅（铁身子 A）的大门外面
  function groundY() { if (!L) layout(); return Math.round(scrV(HALL_OUT.u, HALL_OUT.v, 0)); }
  function zone() { if (!L) layout(); return [L.vx0 + 4, L.vx1 - 4]; }
  const start = () => HALL_OUT;
  function setIp(p, u, v, lv) { const a = area(); lv = a.z[lv] != null ? lv : 1; p.ip = { u, v, lv, z: Zf(a, lv) }; p.isleLv = lv; p.x = scrU(u, v); }
  function ipOf(p) { if (!p.ip) { const s = start(); setIp(p, s.u + U.rand(-1, 1), s.v + U.rand(0, 1), s.lv); } return p.ip; }
  function uvOf(p) { if (p.isleSpot) return [p.isleSpot.u, p.isleSpot.v]; const q = ipOf(p); return [q.u, q.v]; }
  const seenLv = (lv) => cut == null ? lv >= 1 : lv <= cut;
  function cellList() {
    const a = area(), g = grid(a), ck = L.u + '|' + L.x0 + '|' + L.y0 + '|' + mir() + '|' + (+S().isleYaw || 0) + ':' + (S().islePitch || 45) + '|' + cut; if (cells.list && cells.k === ck) return cells.list;
    const list = []; for (let lv = 0; lv < g.length; lv++) { if (!seenLv(lv) || (cut == null && lv === 0)) continue; for (let j = 0; j < GN; j += 2) for (let i = 0; i < GN; i += 2) if (g[lv][j * GN + i]) { const r = F.roomAt(gu(i), gu(j), lv); if (cut == null && r) continue; list.push([scrU(gu(i), gu(j)), scrV(gu(i), gu(j), Z[lv]), gu(i), gu(j), lv]); } }
    cells.k = ck; cells.minX = null; return (cells.list = list);
  }
  function placeAt(p, x, y, below) {
    let best = null, bd = 1e9; for (const c of cellList()) { const dy = c[1] - y, d = Math.abs(c[0] - x) * (below ? 3 : 1) + (dy >= 0 || !below ? Math.abs(dy) : -dy * 4); if (d < bd) { bd = d; best = c; } }
    if (best) { p.ip = { u: best[2], v: best[3], lv: best[4], z: Z[best[4]] }; p.isleLv = best[4]; }
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
  // ---------- 走路 ----------
  const SPEED = 8.5, RUN = 15;
  function walkPlan(p, u, v, lv, run) {
    const a = area(), q = ipOf(p); p.isleSpot = null;
    const pts = plan(a, q, u, v, a.z[lv] != null ? lv : 1);
    if (!pts.length) { p.iw = null; return false; }
    let len = 0, c = q; for (const t of pts) { len += Math.hypot(t.u - c.u, t.v - c.v); c = t; }
    p.iw = { pts, i: 0, run: run != null ? run : len > 30, gen: p.gen, d: 0, t: 0 }; p.target = p.x; return true;
  }
  function step(p, dt) {
    const w = p.iw, a = area(), q = ipOf(p);
    if (!w || w.gen !== p.gen) { p.iw = null; p.target = null; p.hopY = 0; return; }
    w.t += dt;
    let left = (w.run ? RUN : SPEED) * (p.dizzy > 0 ? 0.5 : 1) * Math.min(1, 0.35 + w.t * 3) * dt, moved = 0, du = 0, dv = 0, onRamp = false;
    while (left > 0 && w.i < w.pts.length) {
      const t = w.pts[w.i], d = Math.hypot(t.u - q.u, t.v - q.v); onRamp = !!t.ramp; if (onRamp) left *= 0.8;
      if (d <= left) { du += t.u - q.u; dv += t.v - q.v; q.u = t.u; q.v = t.v; q.lv = t.lv; p.isleLv = t.lv; q.z = Zf(a, t.lv); left -= d; moved += d; w.i++; }
      else { const k = left / d; du += (t.u - q.u) * k; dv += (t.v - q.v) * k; q.u += (t.u - q.u) * k; q.v += (t.v - q.v) * k; moved += left; left = 0; if (t.ramp) { const r = t.ramp; q.z = a.z[r.a] + (a.z[r.b] - a.z[r.a]) * rampT(r, q.u, q.v); } else q.z = Zf(a, q.lv); }
    }
    w.d += moved;
    const rd = rotUV(CEN[0] + du, CEN[1] + dv), sdx = ((rd[0] - CEN[0]) - (rd[1] - CEN[1])) * (mir() ? -1 : 1); if (Math.abs(sdx) > 0.02) p.facing = sdx > 0 ? 1 : -1;
    p.x = scrU(q.u, q.v);
    const sp = p.sp || {}, S2 = G.S;
    if (sp.gait === 'hop') { p.hopP = (p.hopP || 0) + moved / 2.2; const ph = p.hopP % 1; if (ph < 0.66) { p.hopY = -Math.sin((ph / 0.66) * Math.PI) * (sp.hopH || 8) * S2 / 2 * (onRamp ? 1.25 : 1); p.anim = ph < 0.33 ? 'jump' : 'fall'; p._landed = false; } else { p.hopY = 0; p.anim = 'land'; if (!p._landed) { p._landed = true; p.jolt(-1.2, 0); } } }
    else { p.anim = w.run ? 'run' : 'walk'; p.hopY = -Math.abs(Math.sin(w.d * 2.6)) * (w.run ? 1.6 : 0.9) * S2 * (onRamp ? 1.5 : 1); }
    if (w.i >= w.pts.length) { p.iw = null; p.target = null; p.hopY = 0; p.hopP = 0; if (['walk', 'run', 'jump', 'fall', 'land'].includes(p.anim)) p.anim = 'idle'; }
    p.y = Math.round(scrV(q.u, q.v, q.z)) + (p.hopY || 0);
  }
  function gotoX(p, x, run) {
    if (p.iw && p.iw.gen === p.gen && Math.abs((p.iw.gx || 1e9) - x) < 6) return;
    const q = ipOf(p), cs = cellList().filter((c) => c[4] === q.lv), near = cs.filter((c) => Math.abs(c[0] - x) < 5 * L.u), c = near.length ? U.pick(near) : cs.sort((m, n) => Math.abs(m[0] - x) - Math.abs(n[0] - x))[0];
    if (!c) { p.target = null; return; }
    if (walkPlan(p, c[2], c[3], c[4], run)) p.iw.gx = x; else p.target = null;
  }
  function sync() {
    const w = want();
    document.body.classList.toggle('isle', !!w);
    if (w && !G.isle) { G.isle = {}; cut = null; migrateFurn(); layout(); fit(true); for (const ms of [250, 700, 1500]) setTimeout(() => { if (G.isle) fit(false); }, ms); }
    else if (!w && G.isle) { if (fp) { lookFree(); fp = null; PP.fpOn = false; if (fpBarEl) { fpBarEl.remove(); fpBarEl = null; } if (hotEl) { hotEl.remove(); hotEl = null; } } G.isle = null; cut = null; focus = null; fbC = null; cBar(); for (const p of G.all) { p.isleSpot = null; p.ip = null; p.iw = null; p.lane = null; p.fishing = null; p.isleLv = 0; p.tool = null; p.isleHide = false; } document.body.style.cursor = 'default'; window.dispatchEvent(new Event('resize')); }
  }
  function fit(moveIn) {
    layout(); G.ground = groundY();
    for (const p of G.pets) {
      if (moveIn) { p.interrupt(true); p.ip = null; p.iw = null; p.isleSpot = null; }
      const q = ipOf(p); p.x = scrU(q.u, q.v);
      if (!p.held) { p.y = p.floor; p.airborne = false; }
    }
    PP.placeOrb && PP.placeOrb(); cBar();
  }
  window.addEventListener('resize', () => { if (G.isle) setTimeout(() => fit(false), 0); });
  function setZoom(z, quiet, ax, ay) {
    const o = L ? { x0: L.x0, y0: L.y0, u: L.u } : null; z = U.clamp(z, ZMIN, ZMAX);
    // 以鼠标所指的地方为中心缩放：那一点缩放前后在屏幕上不动
    if (o && ax != null) { const r = (z * focusK()) / o.u, nx0 = ax - (ax - o.x0) * r, ny0 = ay - (ay - o.y0) * r; S().islePos = { x: (nx0 + IWf() * z * focusK()) / G.W, y: (ny0 + IHf() * z * focusK()) / safeB() }; }
    S().isleZ = z; PP.save.soon(); layout(); G.ground = groundY();
    for (const p of G.pets) { if (p.held) continue; const [u, v] = uvOf(p); p.x = scrU(u, v); p.y = p.floor; }
    PP.placeOrb && PP.placeOrb(); cBar();
    if (!quiet) PP.ui.toast(`城堡大小 ${Math.round(L.u / Z0 * 100)}%（在城堡上滚滚轮也能缩放）`);
  }
  const SIZES = [0, 2.2, 3, 4.2], setSize = (n) => setZoom(SIZES[n] || Z0);
  function resetPos() { S().islePos = null; PP.save.soon(); fit(false); }
  function setMirror(v) { S().isleMirror = !!v; PP.save.soon(); layout(); for (const p of G.pets) { const [u, w] = uvOf(p); p.x = scrU(u, w); } PP.ui.toast(v ? '城堡朝右' : '城堡朝左'); }
  function resetCam() { S().isleYaw = 0; S().islePitch = 45; PP.save.soon(); camChanged(); PP.ui.toast('回到默认视角'); }
  function camChanged() { bndC = null; cells = {}; layout(); G.ground = groundY(); for (const p of G.pets) { if (p.held) continue; const q = p.isleSpot || ipOf(p); p.x = scrU(q.u, q.v); p.y = p.floor; } PP.placeOrb && PP.placeOrb(); cBar(); }
  let camDrag = null;
  window.addEventListener('mousedown', (e) => {
    // 转视角：按住 Ctrl + 鼠标左键拖
    if (!G.isle || !L || e.button !== 0 || !e.ctrlKey || fp) return;
    if (e.clientX < L.vx0 || e.clientX > L.vx1 || e.clientY < L.vy0 || e.clientY > L.vy1) return;
    e.preventDefault(); e.stopPropagation();
    camDrag = { x: e.clientX, y: e.clientY, yaw: +S().isleYaw || 0, pitch: +S().islePitch || 45, moved: false }; G.uiDrag = true; PP.refreshInteractive();
    const mv = (ev) => { if (!camDrag) return; const dx = ev.clientX - camDrag.x, dy = ev.clientY - camDrag.y; if (Math.hypot(dx, dy) > 4) camDrag.moved = true; if (!camDrag.moved) return; S().isleYaw = camDrag.yaw + dx * 0.012; S().islePitch = pitchOK(camDrag.pitch - dy * 0.25); camChanged(); document.body.style.cursor = 'grabbing'; };
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); if (camDrag && camDrag.moved) { PP.save.soon(); window.__noCtx = performance.now(); } camDrag = null; G.uiDrag = false; document.body.style.cursor = 'default'; PP.refreshInteractive(); };
    const upC = (ev) => { window.removeEventListener('mouseup', upC, true); ev.stopPropagation(); ev.preventDefault(); up(); window.__noClick = performance.now(); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', upC, true);
  }, true);
  window.addEventListener('click', (e) => { if (window.__noClick && performance.now() - window.__noClick < 400) { e.preventDefault(); e.stopPropagation(); } }, true);
  window.addEventListener('contextmenu', (e) => { if (window.__noCtx && performance.now() - window.__noCtx < 400) { e.preventDefault(); e.stopPropagation(); } }, true);
  window.addEventListener('wheel', (e) => { if (!G.isle || !L || !hover) return; if (e.target && e.target.closest && e.target.closest('.panel,.menu,.orb-pop,.hud,.cutbar,.furnbar,.rtags')) return; e.preventDefault(); const dy = U.clamp(e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY, -240, 240); setZoom(zoomOf() * Math.exp(-dy * 0.0011), true, e.clientX, e.clientY); }, { passive: false });

  // ---------- 3D 场景 ----------
  function farmKey() { return PLOTS.map((_, i) => { const inf = PP.econ.plotInfo(i); return inf ? inf.crop + inf.stage + ((E().farm[i].water || 0) > 0 ? 'w' : '') : '-'; }).join(','); }
  const potList = () => [0, 1, 2, 3].map((i) => { const f = PP.LIFE && PP.LIFE.potInfo(i); return f ? { id: f.id, stage: f.stage, wet: f.wet } : null; });
  const eggOut = () => fort().egg !== today() && new Date().getHours() >= 6;
  function opts(c) { const e = E(); return { cut: c, focus: c ? focus : null, season: season(), snow: snowy(), deco: e.isleDeco, tripping: tripping(), farm: PLOTS.map((_, i) => { const inf = PP.econ.plotInfo(i); return inf ? { crop: inf.crop, stage: inf.stage, wet: (e.farm[i].water || 0) > 0 } : null; }), furn: FURN.layout(e), skip: fdrag ? fdrag.i : undefined, pinkBed: !!(e.room || {}).bed, egg: eggOut(), pots: potList() }; }
  function baseKey() { const e = E(); return [season(), snowy() ? 1 : 0, (e.isleDeco || []).join(','), farmKey(), tripping() ? 1 : 0, JSON.stringify(FURN.layout(e)), fdrag ? fdrag.i : '', eggOut() ? 1 : 0, JSON.stringify(potList()), dirtyK].join('|'); }
  // 外部的轮廓（算画框用）：只在季节、摆设变了的时候重算一次
  function ensureExt() {
    if (!G.save || !PP.econ) return;
    const k = [season(), snowy() ? 1 : 0, tripping() ? 1 : 0].join('|'); if (extPos && extKey === k) return;
    const m = F.build(opts(null)), pos = m.p.filter((_, i) => i % 9 < 3);
    for (const [u, v] of F.WING_ROOTS) pos.push(u + (u < 20 ? -14 : 14), v - 4, Z[2] + 32, u + (u < 20 ? -12 : 12), v - 3, Z[2] - 8);
    extPos = pos; extKey = k; bndC = null;
  }
  function scene() {
    ensureExt();
    const key = [cut, cut == null ? '' : focus ? focus + ':' + Math.round((+S().isleYaw || 0) / (Math.PI / 12)) : quad(), baseKey()].join('#'); // 详细视图：边转边换（每 15° 重算一次哪几面墙朝着你）
    const s = meshes.main;
    if (s && s.key === key) return s;
    const m = F.build(opts(cutO()));
    const r = (meshes.main = { key, gpu: g3.upload(m, s && s.gpu), cpu: m }); // cpu：第一人称拿它当碰撞（看得见的才挡）
    return r;
  }
  function lightOpts() {
    const ph = phase(), fx = wfx(), dim = Math.min(1, (fx.cloud || 0) * 0.5 + (fx.rain ? 0.35 : 0) + (fx.snow ? 0.25 : 0) + (fx.dark || 0));
    let sun = [1.0, 0.94, 0.8], sky = [0.5, 0.55, 0.68], gnd = [0.36, 0.33, 0.37], lit = 0, dir = [-0.55, 0.42, 0.72], top = [0.48, 0.72, 0.91], bot = [0.81, 0.92, 0.98];
    if (ph === 'night') { sun = [0.22, 0.28, 0.5]; sky = [0.2, 0.24, 0.42]; gnd = [0.13, 0.13, 0.24]; lit = 1; dir = [0.4, 0.5, 0.7]; top = [0.07, 0.09, 0.2]; bot = [0.15, 0.19, 0.36]; }
    else if (ph === 'dusk') { sun = [1.0, 0.56, 0.3]; sky = [0.5, 0.42, 0.56]; gnd = [0.34, 0.26, 0.32]; lit = 0.8; dir = [-0.8, 0.5, 0.36]; top = [0.42, 0.36, 0.6]; bot = [0.95, 0.63, 0.44]; }
    else if (ph === 'dawn') { sun = [1.0, 0.76, 0.66]; sky = [0.54, 0.5, 0.62]; gnd = [0.36, 0.3, 0.36]; lit = 0.3; dir = [0.2, 0.75, 0.42]; top = [0.54, 0.66, 0.85]; bot = [0.97, 0.78, 0.72]; }
    if (dim > 0) { sun = sun.map((x) => x * (1 - 0.7 * dim)); sky = sky.map((x, i) => x * (1 - 0.25 * dim) + [0.5, 0.52, 0.58][i] * 0.2 * dim); top = top.map((x, i) => x + ([0.55, 0.58, 0.64][i] - x) * dim * 0.8); bot = bot.map((x, i) => x + ([0.66, 0.68, 0.72][i] - x) * dim * 0.8); lit = Math.max(lit, dim * 0.6); }
    if (cut != null) { sky = sky.map((x, i) => x * 0.85 + [0.12, 0.1, 0.06][i]); if (ph === 'night') { sun = [0.42, 0.36, 0.3]; sky = [0.36, 0.3, 0.28]; } }
    // 夜里有人在床上睡觉：屋里关灯，只剩一点月光（不会看起来像天亮了）
    if (ph === 'night' && G.pets.some((p) => p.inBed)) { sun = [0.16, 0.18, 0.3]; sky = [0.14, 0.15, 0.24]; lit = 1; }
    return { sun: dir, sunCol: sun, sky, gnd, lit, skyTop: top, skyBot: bot, rain: fx.rain || 0, wind: Math.min(1, (fx.wind || 0) + (fx.storm ? 0.5 : 0)), inside: false, time: performance.now() / 1000, center: [28, 26, cut == null ? 10 : Z[cut] + 4], radius: 125 };
  }
  const hidden = (p) => ((fp || (+S().islePitch || 45) < 0) ? !p.held : false) || cut != null && p.ip && !p.held && (p.ip.lv > cut || (focus && RM[focus] && (p.ip.lv !== RM[focus].lv || !F.inRoom(RM[focus], p.ip.u, p.ip.v, -0.8))));
  function petCuts() {
    const out = [];
    for (const p of G.pets) { if (p.held || p.isleSpot || p.inDoor || p.inDen || p.isleHide) continue; const q = p.ip; if (!q) continue; const h = 30 * G.S * (p.scaleMul || 1); const pq = pixK(); out.push([(p.x - L.vx0) / pq, (p.y - L.vy0 - (p.hopY || 0)) / pq, h / pq, depth(q.u, q.v), q.z]); }
    return out;
  }
  const DPR = () => window.devicePixelRatio || 1;
  // 像素块最多 2 个屏幕点：放大时看得清细节，不会越放越糊
  const pixOn = () => !(G.save && S().islePix === false), pixD = () => (pixOn() ? Math.min(Math.max(2, Math.round(DPR() * 2)), Math.max(1, Math.round(L.u * DPR() * 0.3))) : 1), pixK = () => pixD() / DPR();
  function clipOf() {
    const r = focus && RM[focus]; if (!r) return null; const top = Z[r.lv] + F.roomH(r) + 0.6;
    const lo = Z[r.lv] - 1.2; if (r.c) return [r.c[0], r.c[1], 1, 0, 1, 1, top, r.c[2] + 0.9, lo];
    const a = r.rot || 0, [x0, y0, x1, y1] = r.r, c = r.rot ? F.toW(r, (x0 + x1) / 2, (y0 + y1) / 2) : [(x0 + x1) / 2, (y0 + y1) / 2];
    return [c[0], c[1], Math.cos(a), Math.sin(a), (x1 - x0) / 2 + 0.9, (y1 - y0) / 2 + 0.9, top, 0, lo];
  }
  function viewOpts() { const k = cam(), q = pixK(), W = Math.ceil(L.w / q), Wv = Math.ceil(L.vw / q), dx = L.vx0 - L.x0, dy = L.vy0 - L.y0, kk = L.u / q;
    const ox = mir() ? org()[0] - (W - Wv) / kk + dx / L.u : org()[0] - dx / L.u;
    return Object.assign({ w: Wv, h: Math.ceil(L.vh / q), ox, oy: org()[1] - dy / L.u, k: kk, mirror: mir(), yaw: k.yaw, pitch: [k.A, k.B], camC: CEN, posterize: pixOn() ? 26 : 0, cel: pixOn(), clip: clipOf() }, lastLO); }
  function render3d() {
    const s = scene(), t = performance.now() / 1000;
    const dm = F.dyn({ t, cut: cutO(), cooking, fire: fort().fuel / 100, power: power(), drag: fdrag ? fdrag.it : null, pinkBed: !!(E().room || {}).bed });
    dynMesh = dm.p.length ? Object.assign(g3.upload(dm, dynMesh), { noShadow: true }) : null;
    lastScenes = [s.gpu, dynMesh]; lastLO = lightOpts();
    rips = rips.filter((r) => t - r[2] < 4);
    const vo = viewOpts(), cv = g3.draw(lastScenes, Object.assign({}, vo, { pets: [], rips: rips.slice(-4) }));
    if (!cv || !pixOn()) return cv;
    const out = outline(cv), em = edges(s, vo);
    if (em) out.getContext('2d').drawImage(em, 0, 0);
    return out;
  }
  let edgeKey = '', edgeCv = null;
  function edges(s, vo) {
    const key = [vo.w, vo.h, vo.ox.toFixed(2), vo.oy.toFixed(2), vo.k.toFixed(3), vo.yaw, vo.pitch.join(','), vo.mirror, s.key].join('|');
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

  // ---------- 天气 ----------
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
  // 烟囱、排气管的顶（外部视角冒烟；锅炉柴越足冒得越多）
  const CHIMS = [[16.6, 4.2, Z[3] + F.WH + 27.6], [22.9, 7.9, Z[3] + F.WH + 21], [6.4, 4.6, Z[3] + 21], [41.8, 3, Z[3] + 15], [2.4, 22.9, Z[3] + F.WH + 18]];

  // ---------- 画 ----------
  function renderBack(ctx) {
    for (const p of G.all) { if (p.inDen && (p.action !== 'isleUse' || !G.isle)) p.inDen = false; p.isleHide = !!G.isle && hidden(p); }
    if (G.isle) followTick();
    if (!G.isle) return;
    if (!fp && !warm.on && !PP.noWarm) { warm.on = true; setTimeout(warmLoop, 400); }
    if (!L) layout();
    if (fp) { try { fpFrame(ctx); } catch (e) { console.error(e); } return; }
    const u = L.u, nt = night(), now = performance.now(), fx = wfx(), wind = fx.wind || 0, pw = power();
    ctx.save();
    const cv = glOK && g3.ok() && render3d();
    if (cv) { ctx.imageSmoothingEnabled = false; const q = pixK(), d = DPR(); ctx.drawImage(cv, Math.round(L.vx0 * d) / d, Math.round(L.vy0 * d) / d, cv.width * q, cv.height * q); }
    if (cv) { try { lifeLayer(ctx); } catch (e) {} }
    else { glOK = false; ctx.fillStyle = 'rgba(40,30,50,.8)'; ctx.fillRect(L.x0 + L.w * 0.1, L.y0 + L.h * 0.45, L.w * 0.8, 40); ctx.fillStyle = '#fff'; ctx.font = PP.FONT(12); ctx.fillText('这台电脑没法开启 3D 渲染（WebGL2），城堡画不出来', L.x0 + L.w * 0.12, L.y0 + L.h * 0.45 + 24); }
    if (cut == null) {
      CHIMS.forEach(([a, b, c], i) => { if (Math.random() < (i === 0 ? 0.04 + pw * 0.1 : cooking && i === 1 ? 0.12 : 0.02)) smoke.push({ x: cx(a, b), y: cy(a, b, c), t: 0 }); });
      if (Math.random() < 0.5) smoke.push({ x: cx(F.FALL[0] + U.rand(-0.8, 0.8), F.FALL[1]), y: cy(F.FALL[0], F.FALL[1], Z[0] - 8), t: 0, mist: true }); // 瀑布落下去散成雾
      for (const [a, b] of F.WING_ROOTS) if (Math.random() < pw * 0.06) smoke.push({ x: cx(a, b), y: cy(a, b, Z[2] + 13), t: 0 });
      if (nt || phase() === 'dusk') { for (const [a, b] of LAMPS) glow(ctx, scrU(a, b), scrV(a, b, 10.6), 16 * u, 'rgba(255,214,140,', 0.34); (E().isleDeco || []).forEach((id, i) => { if (id === 'lampPost' || id === 'lantern') glow(ctx, scrU(SLOTS[i][0], SLOTS[i][1]), scrV(SLOTS[i][0], SLOTS[i][1], id === 'lampPost' ? 11 : 2), 18 * u); }); }
      if (nt && season() === 'summer' && !fx.rain) { ctx.fillStyle = '#fff6a0'; for (let i = 0; i < 9; i++) { const t = now / 1000 + i * 3.1; if (Math.sin(t * 2.3 + i) > 0) { const pu = 18 + ((i * 13 + Math.sin(t) * 4) % 30), pv = 24 + ((i * 7 + Math.cos(t * 0.8) * 4) % 22); ctx.beginPath(); ctx.arc(scrU(pu, pv), scrV(pu, pv, 4 + Math.sin(t * 2) * 3), u * 0.6, 0, 6.3); ctx.fill(); } } }
    } else {
      if (cut === 0) glow(ctx, scrU(12, 13), scrV(12, 13, Z[0] + 3), (18 + fort().fuel / 6) * u, 'rgba(255,150,70,', 0.32 + Math.sin(now / 150) * 0.04);
      if (cut === 1 && cooking) glow(ctx, scrU(23, 10.6), scrV(23, 10.6, 7), 26 * u, 'rgba(255,170,90,', 0.36);
      if (nt || phase() === 'dusk') for (const it of FURN.layout(E())) { const d = FURN.D[it.f]; if (d.light && F.roomLv(it.room || 'living') === cut) glow(ctx, scrU(it.u, it.v), scrV(it.u, it.v, Z[cut] + d.light[2] * F.FS), 22 * u); }
      if (cut >= 1 && !focus && (nt || phase() === 'dusk')) for (const [a, b] of LAMPS) glow(ctx, scrU(a, b), scrV(a, b, 10.6), 14 * u, 'rgba(255,214,140,', 0.28);
    }
    if (mark && now - mark.t < 700) { const k = (now - mark.t) / 700, x = scrU(mark.u, mark.v), y = scrV(mark.u, mark.v, mark.z); ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = u; ctx.beginPath(); ctx.ellipse(x, y, (2 + k * 5) * u, (1 + k * 2.5) * u, 0, 0, Math.PI * 2); ctx.stroke(); }
    smoke = smoke.filter((m) => (m.t += 1 / 60) < (m.mist ? 1.6 : 3));
    for (const m of smoke) {
      if (m.mist) { ctx.fillStyle = `rgba(225,242,255,${((1 - m.t / 1.6) * 0.35).toFixed(2)})`; ctx.beginPath(); ctx.arc(sx(m.x + Math.sin(m.t * 4 + m.x) * 1.5), sy(m.y + m.t * 5), (1 + m.t * 2.4) * u, 0, 6.3); ctx.fill(); continue; }
      ctx.fillStyle = `rgba(240,240,248,${((1 - m.t / 3) * 0.5).toFixed(2)})`; ctx.beginPath(); ctx.arc(sx(m.x + Math.sin(m.t * 2) * 2 + m.t * (3 + wind * 4) * (mir() ? -1 : 1)), sy(m.y - m.t * 8), (1 + m.t * 1.3) * u, 0, 6.3); ctx.fill();
    }
    ctx.restore();
  }
  function rodTip(p) {
    const S2 = G.S, f = p.fishing, t = (performance.now() - f.t0) / 1000; let a = 0.6;
    if (f.ph === 'cast') a = t < 0.35 ? 0.6 + t * 4 : Math.max(0.5, 2 - (t - 0.35) * 6); else if (f.ph === 'bite') a = 0.4 + Math.sin(t * 30) * 0.1; else if (f.ph === 'reel') a = 1.3;
    const bx = p.x + p.facing * 5 * S2, by = p.y - 11 * S2, len = 20 * S2;
    return [bx, by, bx + p.facing * Math.cos(a) * len, by - Math.sin(a) * len];
  }
  function drawFishing(ctx, p, now) {
    const u = L.u, f = p.fishing, t = (now - f.t0) / 1000, [bx0, by0, tx, ty] = rodTip(p), bobX = scrU(BOB.u, BOB.v), bobY0 = scrV(BOB.u, BOB.v, POOL.z);
    let bobY = bobY0 + Math.sin(now / 400) * u * 0.4, cst = 1;
    if (f.ph === 'cast') cst = U.clamp((t - 0.35) / 0.45, 0, 1); if (f.ph === 'nibble') bobY += (Math.sin(t * 18) > 0.6 ? 1.2 * u : 0); if (f.ph === 'bite') bobY += 2 * u;
    ctx.lineCap = 'round'; ctx.strokeStyle = '#6a4430'; ctx.lineWidth = Math.max(1.5, u * 0.6); ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(tx, ty); ctx.stroke();
    if (cst <= 0) return;
    const ex = tx + (bobX - tx) * cst, ey = ty + (bobY - ty) * cst - Math.sin(cst * Math.PI) * 14 * u;
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
  function drawTool(ctx, p, now) {
    const S2 = G.S, t = (now - p.tool.t0) / 1000, hx = p.x + p.facing * 8 * S2, hy = p.y - 9 * S2, f = p.facing;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(f * S2, S2);
    if (p.tool.k === 'can') { const tilt = Math.min(0.7, t * 2) * (p.tool.pour ? 1 : 0.2); ctx.rotate(tilt); ctx.fillStyle = '#7fb8d8'; ctx.strokeStyle = '#2a3a4a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.rect(-3, -3, 6, 5); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(3, -1); ctx.lineTo(7, -4); ctx.lineTo(7.6, -3.2); ctx.lineTo(3, 0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(-3.4, -0.6, 2, 1.2, 5); ctx.stroke(); }
    else if (p.tool.k === 'basket') { ctx.fillStyle = '#c89a5a'; ctx.strokeStyle = '#5a3a28'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(4, -1); ctx.lineTo(3, 3); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -1, 3.6, Math.PI, 0); ctx.stroke(); if (p.tool.full) { ctx.fillStyle = p.tool.col || '#f08a3a'; for (const [a, b] of [[-2, -2], [0.4, -2.6], [2, -1.8]]) { ctx.beginPath(); ctx.arc(a, b, 1.4, 0, 6.3); ctx.fill(); } } }
    else if (p.tool.k === 'wood') { ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 0.6; for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#a8784a' : '#8a5a3a'; ctx.beginPath(); ctx.rect(-4 + (i % 2), -3 + i * 1.5, 8, 1.6); ctx.fill(); ctx.stroke(); } }
    else if (p.tool.k === 'egg') { ctx.fillStyle = '#f8f0e0'; ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(0, -1, 2, 2.6, 0, 0, 6.3); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  // ---------- 会动的小东西：蜜蜂、萤火虫、花瓣 ----------
  const FCU = PLOTS.reduce((a, q) => a + q[0], 0) / PLOTS.length + PS / 2, FCV = PLOTS.reduce((a, q) => a + q[1], 0) / PLOTS.length + PS / 2;
  function lifeLayer(ctx) {
    if (focus) return; // 详细视图只看屋里
    const now = performance.now(), t = now / 1000, s = Math.max(1, Math.round(L.u * 0.42)), e = E();
    if (cut == null || cut >= 2) {
      const nb = now - beeBoost < 4000 ? 9 : 4, [hu, hv] = HIVES[0], hx = scrU(hu, hv), hy = scrV(hu, hv, F.HIVE_Z + 4);
      for (let i = 0; i < nb; i++) { const a = t * (1.6 + i * 0.13) + i * 1.7, r = (6 + (i % 3) * 4) * L.u * 0.5, x = hx + Math.cos(a) * r * 1.3, y = hy + Math.sin(a * 1.4) * r * 0.6 - 2 * L.u; ctx.fillStyle = '#2a1a20'; ctx.fillRect(Math.round(x), Math.round(y), s, s); ctx.fillStyle = '#f6c43a'; ctx.fillRect(Math.round(x) + s, Math.round(y), s, s); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(Math.round(x), Math.round(y) - s, s, s); }
    }
    if (cut == null) {
      if ((e.glowUntil || 0) > Date.now()) for (let i = 0; i < 22; i++) { const a = t * 0.3 + i * 2.39, u = FCU + Math.cos(a * 0.7 + i) * (4 + (i % 5) * 1.4), v = FCV + Math.sin(a * 0.9 + i * 1.3) * (3.5 + (i % 4) * 1.3), z = 3 + Math.sin(t * 1.3 + i) * 2, k = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); if (k < 0.2) continue; const x = scrU(u, v), y = scrV(u, v, z); ctx.fillStyle = `rgba(200,255,140,${0.25 * k})`; ctx.fillRect(x - 2 * s, y - 2 * s, 5 * s, 5 * s); ctx.fillStyle = `rgba(240,255,170,${k})`; ctx.fillRect(x, y, s, s); }
      if ((e.petalUntil || 0) > Date.now()) for (let i = 0; i < 26; i++) { const k = (t * 0.12 + i * 0.137) % 1, x = L.x0 + ((i * 97) % 100) / 100 * L.w + Math.sin(t + i) * 10, y = L.y0 + k * L.h; ctx.fillStyle = i % 3 ? '#f8c8d4' : '#ffe8ee'; ctx.fillRect(Math.round(x), Math.round(y), 2 * s, s); }
    }
  }
  function quilt(ctx, p) {
    const S2 = G.S * (p.scaleMul || 1), w = 30 * S2, h = 9 * S2, x = p.x - w / 2, y = p.y - h - S2 + Math.sin(performance.now() / 700) * S2 * 0.4;
    ctx.fillStyle = '#3a2630'; ctx.fillRect(Math.round(x - S2), Math.round(y - S2), Math.round(w + 2 * S2), Math.round(h + 2 * S2));
    for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) { ctx.fillStyle = (i + j) % 2 ? '#f2c6d2' : '#fbe4ec'; ctx.fillRect(Math.round(x + i * w / 6), Math.round(y + j * h / 3), Math.ceil(w / 6), Math.ceil(h / 3)); }
    ctx.fillStyle = '#fffaf2'; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(2 * S2));
  }

  // ---------- 家具：起居室和卧室里，你摆的 ----------
  // 每间能进去的房间都能摆家具（家具坐标是那间房自己的局部坐标）
  const fname = (rid) => (RM[rid] ? RM[rid].nm : rid);
  const rbox = (rid) => { const r = RM[rid]; return r.c ? [r.c[0] - r.c[2], r.c[1] - r.c[2], r.c[0] + r.c[2], r.c[1] + r.c[2]] : r.r; };
  const inRoomL = (rid, q, m = 0.35) => { const r = RM[rid]; if (r.c) return [[q[0], q[1]], [q[2], q[1]], [q[0], q[3]], [q[2], q[3]]].every(([u, v]) => Math.hypot(u - r.c[0], v - r.c[1]) <= r.c[2] - m - 0.2); return q[0] >= r.r[0] + m && q[1] >= r.r[1] + m && q[2] <= r.r[2] - m && q[3] <= r.r[3] - m; };
  const roomsHere = () => F.ROOMS.filter((r) => r.lv === cut).map((r) => r.id);
  let froom = 'living', fcat = 'living';
  const ovl = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  // 门口要留出来：每扇门往屋里 2.8 格
  const doorKeep = (rid) => { const r = RM[rid], B = rbox(rid); return F.PASS.filter((p) => p.lv === r.lv && p.F === F.frameOf(rid) && p.r[2] > B[0] - 0.5 && p.r[0] < B[2] + 0.5 && p.r[3] > B[1] - 0.5 && p.r[1] < B[3] + 0.5).map((p) => [p.r[0] - 1.3, p.r[1] - 1.3, p.r[2] + 1.3, p.r[3] + 1.3]); };
  function fOK(it, i) {
    const d = FURN.D[it.f], rid = it.room || 'living', r = FURN.rect(it);
    if (!RM[rid] || !inRoomL(rid, r)) return false;
    for (const q of F.RAMPS) if (!q.out && (q.a === RM[rid].lv || q.b === RM[rid].lv) && !F.frameOf(rid) && ovl(r, [q.u0 - 0.6, q.v0 - 0.6, q.u1 + 0.6, q.v1 + 0.6])) return false;
    if (d.walk) return true;
    for (const f of F.FIX) if (f.room === rid) for (const b of f.obL || f.ob) if (ovl(r, b)) return false;
    if (rid === 'bedroom' && ovl(r, [27.4, 6.5, 31.4, 8.4])) return false; // 壁炉
    for (const b of doorKeep(rid)) if (ovl(r, b)) return false;
    const L0 = FURN.layout(E());
    for (let j = 0; j < L0.length; j++) { if (j === i) continue; const o = L0[j]; if ((o.room || 'living') !== rid) continue; if (FURN.D[o.f].walk) { if (ovl(r, [o.u - 1.2, o.v - 1.2, o.u + 1.2, o.v + 1.2])) return false; continue; } if (ovl(r, FURN.rect(o, -0.05))) return false; }
    return true;
  }
  function fFree(it, i) {
    const rid = it.room || 'living', R0 = rbox(rid), cu = (R0[0] + R0[2]) / 2, cv = (R0[1] + R0[3]) / 2, c = Object.assign({}, it);
    for (let rad = 0; rad < 14; rad += 0.5) for (let a = 0; a < 16; a++) { c.u = Math.round((cu + Math.cos(a / 8 * Math.PI) * rad) * 2) / 2; c.v = Math.round((cv + Math.sin(a / 8 * Math.PI) * rad) * 2) / 2; for (const r of [it.r, (it.r + 1) % 4]) { c.r = r; if (fOK(c, i)) return Object.assign({}, c); } }
    return null;
  }
  // 老存档：原来的小屋（楼下 + 阁楼）→ 城堡的起居室和卧室，按比例搬过去，放不下的收起来
  function migrateFurn() {
    const e = E(); if (!e || e.layoutV >= 3) return; if (e.layoutV === 2) { furnishRooms(e); return; }
    const L0 = FURN.layout(e), out = [];
    const map = (it) => { const bed = !!it.lv, rid = bed ? 'bedroom' : 'living', R0 = RM[rid].r, src = bed ? [4, 4, 22, 18] : [4, 4, 37.8, 32.6]; return Object.assign({}, it, { room: rid, lv: undefined, u: R0[0] + 1 + ((it.u - src[0]) / (src[2] - src[0])) * (R0[2] - R0[0] - 2), v: R0[1] + 1 + ((it.v - src[1]) / (src[3] - src[1])) * (R0[3] - R0[1] - 2) }); };
    e.layout = []; for (const it of L0) { const n = map(it); delete n.lv; e.layout.push(n); const i = e.layout.length - 1; if (!fOK(n, i)) { const f = fFree(n, i); if (f) e.layout[i] = f; else e.layout.pop(); } }
    e.layoutV = 2; furnishRooms(e); dirty(); PP.save.soon();
  }
  // 第一次进到城堡 2.0：给每间房先摆上一套合适的家具（之后随你挪、收、换）
  const ROOM_SET = { kitchen: ['cupboard', 'potrack', 'jars', 'flour'], dining: ['bench', 'pantry', 'candle', 'teacart'], bath: ['washstand', 'towel', 'mirror', 'duck'], hall: ['clock', 'rugrun', 'hangplant', 'screen'], workshop: ['toolwall', 'vise', 'parts', 'anvil'], library: ['globe', 'ladder', 'readlamp', 'bigshelf'], green: ['seedrack', 'flowerstand', 'wcan', 'bonsai'], attic: ['easel', 'horse', 'clothtrunk', 'telescope'], store: ['crates', 'jars'], shed: ['crates'], laundry: ['towel', 'hangplant'], cockpit: ['telescope', 'rugsq'], living: ['fern', 'hangplant'], bedroom: ['screen', 'stove0'] };
  // 摆了这件之后，这间房的门、固定陈设、其他家具是不是都还走得到（只在这间房附近做一次小范围的寻路）
  function reachOK(rid) {
    const r = RM[rid], lv = r.lv, B0 = rbox(rid), fr = F.frameOf(rid), C4 = [[B0[0], B0[1]], [B0[2], B0[1]], [B0[0], B0[3]], [B0[2], B0[3]]].map(([u, v]) => F.toW(fr, u, v));
    const sn = (x) => Math.floor((x - G0) / GS) * GS + G0, B = [sn(Math.min(...C4.map((q) => q[0])) - 3), sn(Math.min(...C4.map((q) => q[1])) - 3), Math.max(...C4.map((q) => q[0])) + 3, Math.max(...C4.map((q) => q[1])) + 3];
    const ob = AREA.obst().filter((o) => o[0] === lv && (o[1] === 'c' ? o[2] > B[0] - 2 && o[2] < B[2] + 2 && o[3] > B[1] - 2 && o[3] < B[3] + 2 : o[3] > B[0] - 2 && o[1] < B[2] + 2 && o[4] > B[1] - 2 && o[2] < B[3] + 2));
    const a = AREA, okc = (u, v) => { if (!(a.inF(lv, u, v) && a.inF(lv, u + 0.45, v) && a.inF(lv, u - 0.45, v) && a.inF(lv, u, v + 0.45) && a.inF(lv, u, v - 0.45))) return false; for (const q of a.ramps) if (u > q.u0 - 0.3 && u < q.u1 + 0.3 && v > q.v0 - 0.3 && v < q.v1 + 0.3) return false; for (const o of ob) if (o[1] === 'c' ? Math.hypot(u - o[2], v - o[3]) < o[4] + 0.3 : u > o[1] - 0.45 && u < o[3] + 0.45 && v > o[2] - 0.45 && v < o[4] + 0.45) return false; return true; };
    const W = Math.ceil((B[2] - B[0]) / GS), Hh = Math.ceil((B[3] - B[1]) / GS), seen = new Uint8Array(W * Hh), q = [];
    const cell = (u, v) => [Math.round((u - B[0]) / GS), Math.round((v - B[1]) / GS)];
    const ovB = (p) => { const q = F.wBox(p.F, p.r); return q[2] > B[0] + 2 && q[0] < B[2] - 2 && q[3] > B[1] + 2 && q[1] < B[3] - 2; }, doors = F.PASS.filter((p) => p.lv === lv && ovB(p)).map((p) => F.toW(p.F, (p.r[0] + p.r[2]) / 2, (p.r[1] + p.r[3]) / 2));
    const seed = (u, v) => { let best = null, bd = 9; for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const uu = u + i * GS, vv = v + j * GS; if (okc(uu, vv)) { const d = Math.hypot(i, j); if (d < bd) { bd = d; best = cell(uu, vv); } } } return best; };
    const s0 = doors.length ? seed(...doors[0]) : seed(...F.toW(fr, (B0[0] + B0[2]) / 2, (B0[1] + B0[3]) / 2)); if (!s0) return false;
    seen[s0[1] * W + s0[0]] = 1; q.push(s0);
    while (q.length) { const [i, j] = q.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= Hh || seen[nj * W + ni]) continue; if (!okc(B[0] + ni * GS, B[1] + nj * GS)) { seen[nj * W + ni] = 2; continue; } seen[nj * W + ni] = 1; q.push([ni, nj]); } }
    const hit = (u, v) => { const [ci, cj] = cell(u, v); for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const ni = ci + i, nj = cj + j; if (ni >= 0 && nj >= 0 && ni < W && nj < Hh && seen[nj * W + ni] === 1 && Math.hypot(i, j) * GS < 2) return true; } return false; };
    for (const d of doors) if (!hit(...d)) return false;
    propKey = ''; for (const pr of props()) if (pr.room === rid && !hit(pr.at[0], pr.at[1])) return false;
    return true;
  }
  // 找一个放得下、又不挡路的位置
  function placeReach(e, it) {
    const R0 = rbox(it.room), cu = (R0[0] + R0[2]) / 2, cv = (R0[1] + R0[3]) / 2, c = Object.assign({}, it), L0 = FURN.layout(e), tried = new Set();
    for (let rad = 0; rad < 12; rad += 0.5) for (let k = 0; k < 16; k++) { c.u = Math.round((cu + Math.cos(k / 8 * Math.PI) * rad) * 2) / 2; c.v = Math.round((cv + Math.sin(k / 8 * Math.PI) * rad) * 2) / 2; for (const r of [0, 1, 2, 3]) { c.r = r; const key = c.u + ',' + c.v + ',' + r; if (tried.has(key)) continue; tried.add(key); if (!fOK(c, -1)) continue; L0.push(Object.assign({}, c)); if (reachOK(it.room)) return true; L0.pop(); } }
    return false;
  }
  function furnishRooms(e) {
    for (const rid in ROOM_SET) { if (!RM[rid]) continue; for (const f of ROOM_SET[rid]) { if (!FURN.D[f] || FURN.layout(e).length >= FURN.MAXN) continue; placeReach(e, { f, u: 0, v: 0, r: 0, room: rid }); } }
    e.layoutV = 3; dirty(); PP.save.soon();
  }
  function fChanged() { dirty(); PP.save.soon(); for (const p of G.pets) if (p.ip && !p.held && !p.isleSpot) { const a = area(); if (!free(a, p.ip.u, p.ip.v, p.ip.lv)) { const c = nearFree(a, p.ip.u, p.ip.v, p.ip.lv); setIp(p, c[0], c[1], p.ip.lv); p.y = p.floor; } } }
  function fStart(i, x, y) {
    const L0 = FURN.layout(E()), it = L0[i]; if (!it) return;
    fsel = i; const z = Z[F.roomLv(it.room || 'living')], ffr = F.frameOf(it.room || 'living'), [gu, gv] = F.toL(ffr, ...toUV(x, y, z));
    fdrag = { i, it: Object.assign({}, it), orig: Object.assign({}, it), du: it.u - gu, dv: it.v - gv, ok: true };
    G.uiDrag = true; PP.refreshInteractive(); fBar();
    const mv = (ev) => { if (!fdrag) return; const [u, v] = F.toL(ffr, ...toUV(ev.clientX, ev.clientY, z)); fdrag.it.u = Math.round((u + fdrag.du) * 2) / 2; fdrag.it.v = Math.round((v + fdrag.dv) * 2) / 2; fdrag.ok = fOK(fdrag.it, i); document.body.style.cursor = 'grabbing'; };
    const up = () => {
      window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up);
      const d = fdrag; fdrag = null; G.uiDrag = false; document.body.style.cursor = 'default';
      if (d && d.ok) { const tgt = FURN.layout(E())[i], old = { u: tgt.u, v: tgt.v }; Object.assign(tgt, { u: d.it.u, v: d.it.v }); dirty(); if (!reachOK(tgt.room || 'living')) { Object.assign(tgt, old); PP.ui.toast('放这儿会把路堵住（门口或者别的东西走不过去了）'); } } else if (d) PP.ui.toast('这儿放不下（压到墙边的东西 / 别的家具 / 门口了）');
      fChanged(); fBar(); PP.refreshInteractive();
    };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }
  function fAct(a, arg) {
    const e = E(), L0 = FURN.layout(e), it = L0[fsel], here = froom;
    if (a === 'room') { froom = arg; if (it && (it.room || 'living') !== froom) fsel = -1; }
    if (a === 'cat') fcat = arg;
    if (a === 'rot' && it) { const c = Object.assign({}, it, { r: (it.r + 1) % 4 }); if (fOK(c, fsel)) it.r = c.r; else { const f = fFree(c, fsel); if (f) Object.assign(it, f); else PP.ui.toast('转不过来，旁边太挤了'); } }
    if (a === 'stash' && it) { L0.splice(fsel, 1); fsel = -1; }
    if (a === 'mv' && it) { const f = fFree(Object.assign({}, it, { room: arg }), fsel); if (f) { Object.assign(it, f); froom = arg; setCut(F.roomLv(arg)); } else PP.ui.toast(fname(arg) + '没地方了'); }
    if (a === 'add') { if (L0.length >= FURN.MAXN) PP.ui.toast('家具太多啦，先收起几件吧'); else { if (placeReach(e, { f: arg, u: 0, v: 0, r: 0, room: here })) fsel = FURN.layout(e).length - 1; else PP.ui.toast(fname(here) + '没地方了，先收起一件吧'); } }
    if (a === 'reset') { e.layout = FURN.defaultLayout(e); e.layoutV = 0; migrateFurn(); fsel = -1; }
    fChanged(); fBar();
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function fBar() {
    if (!fedit || cut == null) { if (fbar) { fbar.remove(); fbar = null; PP.refreshInteractive(); } return; }
    const rs = roomsHere(); if (!rs.includes(froom)) froom = rs.includes('living') ? 'living' : rs.includes('bedroom') ? 'bedroom' : rs[0];
    const e = E(), L0 = FURN.layout(e), it = L0[fsel], own = FURN.owned(e), here = fname(froom);
    if (!fbar) {
      fbar = document.createElement('div'); fbar.className = 'furnbar'; document.getElementById('ui').appendChild(fbar);
      fbar.addEventListener('mousedown', (ev) => ev.stopPropagation());
      fbar.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; if (b.dataset.a === 'done') { furnEdit(false); return; } fAct(b.dataset.a, b.dataset.f); });
    }
    const d = it && FURN.D[it.f], lib = own.filter((k) => (FURN.D[k].cat || 'common') === fcat);
    fbar.innerHTML = `<div class="frow"><b>布置</b>${rs.map((id) => `<button data-a="room" data-f="${id}" class="${id === froom ? 'on' : ''}">${esc(fname(id))}</button>`).join('')}<span class="sp"></span><button data-a="reset" title="回到最开始的摆法">恢复默认</button><button data-a="done" class="primary">完成</button></div>`
      + `<div class="frow"><span class="muted">${it ? '选中：' + esc(d.name) : '按住家具拖到想放的地方；从下面的库里挑一件放进' + esc(here)}</span>`
      + (it ? `<button data-a="rot" title="转 90°">转向</button><button data-a="stash">收起</button>${(it.room || 'living') !== froom ? `<button data-a="mv" data-f="${froom}">搬到${esc(here)}</button>` : ''}` : '') + `</div>`
      + `<div class="frow cats">${FURN.CATS.map(([k, n]) => `<button data-a="cat" data-f="${k}" class="${k === fcat ? 'on' : ''}">${n}</button>`).join('')}</div>`
      + `<div class="frow lib">${lib.length ? lib.map((k) => `<button data-a="add" data-f="${k}" title="放一件到${esc(here)}">＋${esc(FURN.D[k].name)}</button>`).join('') : '<span class="muted">这一类还没有可以摆的</span>'}</div>`;
    fbPlace(); PP.refreshInteractive();
  }
  function fbPlace() { if (!fbar || !L) return; fbar.style.left = Math.max(4, L.x0) + 'px'; fbar.style.top = Math.max(4, L.y0 - fbar.offsetHeight - 6) + 'px'; fbar.style.maxWidth = Math.max(260, L.w) + 'px'; }
  function furnEdit(on) {
    if (on && !G.isle) return;
    if (on && cut == null) setCut(2);
    fedit = !!on; fsel = -1; fdrag = null; fBar(); cBar();
    if (on) PP.ui.toast('布置家具：上面选房间，下面的库里挑家具放进去；按住家具拖动'); else PP.save.soon();
  }
  function fOverlay(ctx) {
    if (!fedit || cut == null) return;
    fbPlace();
    const L0 = FURN.layout(E()), u = L.u, rid = froom;
    const draw = (it, col, w) => { const r = FURN.rect(it), z = Z[F.roomLv(it.room || 'living')]; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]].map(([a, b]) => F.toW(F.frameOf(it.room || 'living'), a, b)).forEach(([a, b], k) => { const X = scrU(a, b), Y = scrV(a, b, z + 0.1); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); ctx.stroke(); };
    ctx.save();
    /* 只给选中的家具画框；其它家具只在中间点一个小圆点（表示能拖），不再有一堆白色菱形框 */
    L0.forEach((it, i) => { if ((it.room || 'living') !== rid || (fdrag && fdrag.i === i)) return;
      if (i === fsel) { draw(it, 'rgba(255,230,120,.95)', u * 0.5); return; }
      const r = FURN.rect(it), z = Z[F.roomLv(it.room || 'living')], c = F.toW(F.frameOf(it.room || 'living'), (r[0] + r[2]) / 2, (r[1] + r[3]) / 2), X = scrU(c[0], c[1]), Y = scrV(c[0], c[1], z + 0.1);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = 'rgba(42,30,48,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X, Y, Math.max(2.5, u * 0.45), 0, 6.3); ctx.fill(); ctx.stroke(); });
    if (fdrag) draw(fdrag.it, fdrag.ok ? 'rgba(120,230,120,.95)' : 'rgba(255,90,90,.95)', u * 0.6);
    ctx.restore();
  }

  // ---------- 剖切：进到哪一层 ----------
  function setCut(lv, quiet, keepFocus) {
    lv = lv == null ? null : U.clamp(lv, 0, 3);
    if (!keepFocus && focus) { focus = null; fbC = null; bndC = null; if (cut === lv) { cells = {}; for (const p of G.pets) if (!p.held) p.isleHide = hidden(p); layout(); camFix(); cBar(); return; } }
    if (cut === lv) return;
    cut = lv; hover = null; smoke = []; drops = []; cells = {};
    if ((lv !== 2 && lv !== 3) && fedit) { fedit = false; fsel = -1; fdrag = null; fBar(); }
    if (lv != null && G.save.flags) G.save.flags.isleIn = 1;
    for (const p of G.pets) { if (p.held) continue; p.isleHide = hidden(p); }
    layout(); camFix(); cBar(); PP.placeOrb && PP.placeOrb();
    if (!quiet && lv != null) PP.ui.toast(`${F.NAME[lv]}：${roomsOn(lv)}`, 1.6);
  }
  const roomsOn = (lv) => [...new Set(ROOMS.filter((r) => r.lv === lv).map((r) => r.nm).concat(F.OPEN.filter((o) => o[0] === lv).map((o) => o[5])))].join(' · ');
  // 详细视图：进到一个房间。镜头推近到这个房间，别的房间都不画；从门、走廊、楼梯走到隔壁，镜头跟过去
  function camFix() { for (const p of G.pets) { if (p.held) continue; const q = p.isleSpot || ipOf(p); p.x = scrU(q.u, q.v); p.y = p.floor; } PP.placeOrb && PP.placeOrb(); }
  function setFocus(id, quiet) {
    const r = id && RM[id]; if (!r) { setCut(cut, true); return; }
    if (focus === id) return;
    focus = id; fbC = null; bndC = null; cells = {}; hover = null;
    if (cut !== r.lv) setCut(r.lv, true, true); else { for (const p of G.pets) if (!p.held) p.isleHide = hidden(p); }
    layout(); camFix(); cBar();
    if (!quiet) PP.ui.toast(r.nm, 1.2);
  }
  const roomOfP = (p) => { const q = p && p.ip; return q ? F.roomAt(q.u, q.v, q.lv) : null; };
  // 隔壁：门洞、走廊连着的房间（同一层），楼梯连着的房间（上下层）
  let nbC = null;
  function neighbours(id) {
    if (!nbC) { nbC = {}; const add = (a, b, how) => { if (!a || !b || a === b) return; (nbC[a.id] = nbC[a.id] || new Map()).set(b.id, how); (nbC[b.id] = nbC[b.id] || new Map()).set(a.id, how); };
      for (const P of F.PASS) { const hit = new Set(); for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const x = P.r[0] - 0.6 + (P.r[2] - P.r[0] + 1.2) * i / 6, y = P.r[1] - 0.6 + (P.r[3] - P.r[1] + 1.2) * j / 6, w = P.F ? F.toW(P.F, x, y) : [x, y], r = F.roomAt(w[0], w[1], P.lv); if (r) hit.add(r); } const L2 = [...hit]; for (let i = 0; i < L2.length; i++) for (let j = i + 1; j < L2.length; j++) add(L2[i], L2[j], 'door'); }
      for (const S2 of F.RAMPS) { const mid = S2.axis === 'u' ? (S2.v0 + S2.v1) / 2 : (S2.u0 + S2.u1) / 2, at = (t, lv) => { const P = S2.axis === 'u' ? [t, mid] : [mid, t]; return F.roomAt(P[0], P[1], lv); };
        const ra = at(S2.lo - 0.8, S2.a) || at(S2.lo + 0.5, S2.a), rb = at(S2.hi + 0.8, S2.b) || at(S2.hi - 0.5, S2.b); add(ra, rb, 'stair'); } }
    return [...(nbC[id] || new Map())].map(([k, how]) => ({ id: k, how, r: RM[k] }));
  }
  function goRoom(id) { const p = mainP(), r = RM[id]; setFocus(id); if (p && r) { p.interrupt(true); p.inDoor = false; p.fishing = null; p.tool = null; const q = roomSpot(id); p.run('isleGo', A.isleGo, q.u, q.v, q.lv); } }
  // 主角从你正在看的房间走到隔壁，镜头跟过去
  function followTick() {
    if (!focus) return; const p = mainP(); if (!p || p.held) return; const r = roomOfP(p), was = p._rm; p._rm = r ? r.id : null;
    if (r && was && was !== r.id && was === focus) setFocus(r.id, true);
  }
  // 视角按钮：竖排里的 👁，点开向右横着展开：上帝视角（转过了可以一键回默认）/ 第一人称 / 第一人称走路速度
  let vOpen = false;
  const SPDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5];
  function fpSpd() { const v = +S().fpSpeed; return SPDS.includes(v) ? v : 1; }
  function rotated() { return Math.abs(S().isleYaw || 0) > 0.5 || Math.abs((S().islePitch != null ? S().islePitch : 45) - 45) > 0.5; }
  function vKey() { return [vOpen, fpSpd(), rotated(), !!fp].join(','); }
  function viewHTML() {
    const B = (a, t, tip, x = '') => `<button data-a="${a}" title="${tip}" ${x}>${t}</button>`, sp = fpSpd(), i = SPDS.indexOf(sp);
    return B('view', '👁', '切换视角', vOpen ? 'class="on"' : '')
      + (vOpen ? `<div class="vfly">`
        + B('god', '上帝视角', '从天上看整座城堡：Ctrl+左键拖动转，滚轮缩放', !fp ? 'class="on wide"' : 'class="wide"')
        + (!fp && rotated() ? B('reset', '⟲ 恢复默认', '转回最开始的角度', 'class="wide"') : '')
        + B('fp', '第一人称', '用主角的眼睛走进去（F）：回到上次离开的地方', fp ? 'class="on wide"' : 'class="wide"')
        + B('third', '第三人称', '镜头在主角身后（滚轮拉远拉近）', 'class="wide"')
        + `<div class="row"><span class="spd" title="第一人称里主角走路的速度">速度</span>`
        + B('slow', '−', '慢一点', i <= 0 ? 'disabled' : '') + `<span class="spd v">×${sp}</span>` + B('fast', '+', '快一点', i >= SPDS.length - 1 ? 'disabled' : '') + `</div>`
        + `</div>` : '');
  }
  function viewAct(a) {
    if (a === 'view') vOpen = !vOpen;
    else if (a === 'god') { vOpen = false; if (fp) fpStop(); }
    else if (a === 'reset') { vOpen = false; resetCam(); }
    else if (a === 'fp' || a === 'third') { vOpen = false; S().fpDist = a === 'third' ? (fpDist() >= 0.5 ? fpDist() : 8) : 0; PP.save.soon(); if (!fp) fpStart(); }
    else if (a === 'slow' || a === 'fast') { const i = SPDS.indexOf(fpSpd()) + (a === 'fast' ? 1 : -1); S().fpSpeed = SPDS[U.clamp(i, 0, SPDS.length - 1)]; PP.save.soon(); }
    else return;
    if (fp) fpBar(); else cBar();
  }
  document.addEventListener('mousedown', (ev) => { if (vOpen && !(ev.target.closest && ev.target.closest('.cutbar'))) { vOpen = false; if (fp) fpBar(); else cBar(); } }, true);
  // 剖切条：在城堡框的左下角：第几层、上一层 / 下一层 / 回到外面
  function cBar() {
    if (!G.isle || !L || fp) { if (cbar) { cbar.remove(); cbar = null; PP.refreshInteractive(); } placeTags(); return; }
    if (!cbar) {
      cbar = document.createElement('div'); cbar.className = 'cutbar'; document.getElementById('ui').appendChild(cbar); S().cbarSeen = (S().cbarSeen || 0) + 1; PP.save.soon();
      cbar.addEventListener('mousedown', (ev) => ev.stopPropagation());
      cbar.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; const a = b.dataset.a; if (a === 'up') setCut(Math.min(3, cut + 1)); else if (a === 'down') setCut(cut - 1); else if (a === 'out') setCut(null); else if (a === 'furn') furnEdit(!fedit); else if (a === 'room') { if (b.dataset.go) goRoom(b.dataset.r); else setFocus(b.dataset.r); } else if (a === 'level') setCut(cut); else if (a === 'in') setCut(1); else viewAct(a, b); });
    }
    const k = [cut, fedit, focus, vKey()].join('|');
    // 竖着的一列小方块按钮，贴在城堡框里面的左上角：不占城堡外面的地方
    if (cbar.dataset.k !== k) { cbar.dataset.k = k; const r = focus && RM[focus], B = (a, t, tip, x = '') => `<button data-a="${a}" title="${tip}" ${x}>${t}</button>`;
      cbar.innerHTML = cut == null ? `<span class="lv" title="城堡外观">城堡</span>` + viewHTML() + B('in', '▤', '剖开看每一层（里面）') : `<span class="lv" title="${r ? esc(r.nm) + ' · ' + F.NAME[r.lv] : F.NAME[cut]}">${r ? esc(r.nm.slice(-3)) : F.NAME[cut]}</span>`
        + (r ? '' : B('up', '▲', '上一层', cut >= 3 ? 'disabled' : '') + B('down', '▼', '下一层', cut <= 0 ? 'disabled' : ''))
        + ((r ? r.lv : cut) >= 1 ? B('furn', '✎', fedit ? '布置中（再点一下结束）' : '布置家具', fedit ? 'class="on"' : '') : '')
        + viewHTML()
        + (r ? B('level', '▦', '看这一整层') : '')
        + B('out', '✕', '回到外面看整座城堡', 'class="primary"'); }
    cbar.classList.add('vert');
    /* 按钮旁边的文字：前几次进城堡一直显示，之后鼠标停上去才显示 */
    cbar.querySelectorAll('button[title]').forEach((b) => { if (!b.dataset.l) b.dataset.l = b.title.split('（')[0]; });
    cbar.classList.toggle('tips', (S().cbarSeen || 0) < 4);
    const sc = U.clamp(Math.min(L.vw, L.vh) / 560, 0.75, 1.5); cbar.style.transformOrigin = 'left top'; cbar.style.transform = `scale(${sc.toFixed(3)})`;
    const h = cbar.offsetHeight * sc;
    cbar.style.left = Math.max(2, L.vx0 + 6) + 'px'; cbar.style.top = Math.max(2, L.vy0 + 6) + 'px';
    void h; tagsKey = ''; placeTags(); PP.refreshInteractive();
  }
  // 画面里的标签：整层看时每个房间头上一个名牌（点了进去）；详细视图里每个门口 / 楼梯口一个门牌（点了走过去）
  let tagsEl = null, tagsKey = '';
  function tagList() {
    if (cut == null || fedit) return [];
    if (focus && RM[focus]) { const r = RM[focus], out = [], seen = new Set();
      for (const P of F.PASS) { if (P.lv !== r.lv) continue; const c = P.F ? F.toW(P.F, (P.r[0] + P.r[2]) / 2, (P.r[1] + P.r[3]) / 2) : [(P.r[0] + P.r[2]) / 2, (P.r[1] + P.r[3]) / 2]; if (!F.inRoom(r, c[0], c[1], -1.6)) continue;
        for (const n of neighbours(r.id)) { if (n.how !== 'door' || seen.has(n.id) || !F.inRoom(n.r, c[0], c[1], -1.6)) continue; seen.add(n.id); out.push({ u: c[0], v: c[1], z: Z[r.lv] + 4.5, t: '→ ' + n.r.nm, go: n.id }); } }
      for (const S2 of F.RAMPS) { const mid = S2.axis === 'u' ? (S2.v0 + S2.v1) / 2 : (S2.u0 + S2.u1) / 2;
        for (const n of neighbours(r.id)) { if (n.how !== 'stair' || seen.has(n.id)) continue; const lo = S2.axis === 'u' ? [S2.lo, mid] : [mid, S2.lo], hi = S2.axis === 'u' ? [S2.hi, mid] : [mid, S2.hi];
          const here = r.lv === S2.a ? lo : r.lv === S2.b ? hi : null, there = n.r.lv === S2.a ? lo : n.r.lv === S2.b ? hi : null; if (!here || !there || !F.inRoom(r, here[0], here[1], -1.5) || !F.inRoom(n.r, there[0], there[1], -1.5)) continue;
          seen.add(n.id); out.push({ u: here[0], v: here[1], z: Z[r.lv] + 5, t: (n.r.lv > r.lv ? '↑ ' : '↓ ') + n.r.nm, go: n.id }); } }
      for (const n of neighbours(r.id)) if (!seen.has(n.id)) out.push({ u: null, t: (n.how === 'stair' ? (n.r.lv > r.lv ? '↑ ' : '↓ ') : '→ ') + n.r.nm, go: n.id });
      return out; }
    return ROOMS.filter((r) => r.lv === cut && !r.hut).map((r) => { const c = r.c ? [r.c[0], r.c[1]] : r.rot ? F.toW(r, (r.r[0] + r.r[2]) / 2, (r.r[1] + r.r[3]) / 2) : [(r.r[0] + r.r[2]) / 2, (r.r[1] + r.r[3]) / 2]; return { u: c[0], v: c[1], z: Z[r.lv] + 6, t: r.nm, room: r.id }; });
  }
  function placeTags() {
    if (!G.isle || !L || cut == null) { if (tagsEl) { tagsEl.remove(); tagsEl = null; } return; }
    const k = [cut, focus, fedit, L.x0, L.y0, L.u, S().isleYaw, S().islePitch, mir()].join('|'); if (k === tagsKey && tagsEl) return; tagsKey = k;
    if (!tagsEl) { tagsEl = document.createElement('div'); tagsEl.className = 'rtags'; document.getElementById('ui').appendChild(tagsEl);
      tagsEl.addEventListener('mousedown', (ev) => ev.stopPropagation());
      tagsEl.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; if (b.dataset.go) goRoom(b.dataset.go); else if (b.dataset.room) setFocus(b.dataset.room); }); }
    const fs = U.clamp(Math.min(L.vw, L.vh) / 42, 10, 18), list = tagList(); let spare = 0;
    tagsEl.innerHTML = list.map((t) => { let x, y; if (t.u == null) { x = L.vx1 - 10; y = L.vy0 + 10 + (spare++) * (fs + 14); } else { x = scrU(t.u, t.v); y = scrV(t.u, t.v, t.z); }
      if (x < L.vx0 - 20 || x > L.vx1 + 20 || y < L.vy0 - 10 || y > L.vy1 + 10) return '';
      return `<button class="${t.go ? 'go' : 'rm'}" style="left:${Math.round(x)}px;top:${Math.round(y)}px;font-size:${fs.toFixed(1)}px;${t.u == null ? 'transform:translate(-100%,0)' : ''}" ${t.go ? `data-go="${t.go}" title="走过去"` : `data-room="${t.room}" title="进到${esc(t.t)}里面看"`}>${esc(t.t)}</button>`; }).join('');
    PP.refreshInteractive();
  }

  // ---------- 第一人称：用主角的眼睛在城堡里走 ----------
  // 方向键 / WASD 走，Shift 跑，空格跳；按住鼠标拖动转头；E 或单击 = 跟准星（或点到的东西）互动；Q 退出；Esc 老板键（直接收成极简）
  // ======================= 第一人称 / 第三人称 =======================
  // 操作像 CS / 我的世界：WASD 走（A 左 D 右）、鼠标看、空格跳、Shift 跑、E 用、Tab 地图、滚轮拉远拉近（拉远就是第三人称）
  // 走路按“真的地面”算：脚下最高的那个面（楼板、楼梯的坡面、能站上去的家具），墙挡路，栏杆跳起来能翻过去，踩空就往下掉
  let fpBarEl = null, fpMenu = false, bigMap = null, fpHintT = 0;
  const PH = 8, EYE = 7.2, BODYH = 4.3, CROUCH = 3.9, FOV = 1.12, STEP = 1.0, BODY = 0.3, GRAV = 44, JUMP = 17.5; // 主角在世界里多高、眼睛多高：按真人的比例（门 10、桌面 5.3、天花板 14）
  const fpQ = () => (S().fpQ === 'pixel' ? 'pixel' : 'fine');
  const fpK = () => (fpQ() === 'pixel' ? pixK() : 1 / Math.min(2, DPR())); // 精细：按屏幕实际像素画（高分屏最多 2 倍）
  const fpDist = () => U.clamp(+S().fpDist || 0, 0, 14);
  // 视野（看得多广）：滚轮调，50°～110°，默认 78°
  const fpFovD = () => U.clamp(+S().fpFov || 78, 50, 110), fpFov = () => fpFovD() * Math.PI / 180;
  const fpSens = () => U.clamp(+S().fpSens || 1, 0.3, 3);
  const SENS = [0.4, 0.6, 0.8, 1, 1.25, 1.5, 2, 2.5];
  // ---- 碰撞：直接用画出来的模型 ----
  // 把城堡的每个三角面撒点，落进 0.25 格的小方块里：有东西的方块就是实心的（像我的世界）。
  // 看得见的才挡人，看不见的不挡；会随风摆的（树叶、草丛、灌木）和水面能穿过去
  const VX = 0.25, VZ = 0.25, MAT_SKIP = new Set([g3.MAT.water, g3.MAT.pwater, g3.MAT.glow]);
  let vox = null, voxB = null;
  // 第一次当场生成（约一秒）；之后城堡有变化（菜长了、挪了家具……）就在后台一点点生成新的，生成好之前继续用旧的
  function voxels() {
    const sc = scene(), m = sc.cpu; if (!m) return vox; if (vox && vox.m === m) return vox;
    if (!vox) { const B = voxStart(m); voxStep(B, null); vox = B.res; return vox; }
    if (!voxB || voxB.m !== m) voxB = voxStart(m);
    const now = performance.now(); if (now - (voxB.lastT || 0) > 12) { voxB.lastT = now; voxStep(voxB, 5); if (voxB.res) { vox = voxB.res; voxB = null; } }
    return vox;
  }
  /* 在城堡里平时就在后台一点点把碰撞和地图算好：按 F 进第一人称时不卡、地图马上能用 */
  function warm() {
    const m = scene().cpu; if (!m) return false;
    if (!vox) { if (!voxB) voxB = voxStart(m); voxStep(voxB, 6); if (voxB.res) { vox = voxB.res; voxB = null; } return true; }
    return !navReady();
  }
  /* 每 20 毫秒算 6 毫秒，算好就停；城堡变了（菜长了、挪了家具）下次进来再接着算 */
  function warmLoop() { let more = false; try { more = G.isle && !fp && warm(); } catch (e) { more = false; } if (more) setTimeout(warmLoop, 20); else warm.on = false; }
  function voxStart(m) {
    const P = m.p; let u0 = 1e9, v0 = 1e9, z0 = 1e9, u1 = -1e9, v1 = -1e9, z1 = -1e9;
    for (let i = 0; i < P.length; i += 3) { const u = P[i], v = P[i + 1], z = P[i + 2]; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; if (z < z0) z0 = z; if (z > z1) z1 = z; }
    u0 = Math.floor((Math.max(u0, -20) - 1) / VX) * VX; v0 = Math.floor((Math.max(v0, -20) - 1) / VX) * VX; z0 = Math.floor((Math.max(z0, -40) - 1) / VZ) * VZ; // 对齐到格子，边界不会平白多出半格
    u1 = Math.min(u1, 80) + 1; v1 = Math.min(v1, 80) + 1; z1 = Math.min(z1, 70) + 1;
    const nx = Math.ceil((u1 - u0) / VX), ny = Math.ceil((v1 - v0) / VX), nz = Math.ceil((z1 - z0) / VZ);
    return { m, t: 0, res: null, V: { m, g: new Uint8Array(nx * ny * nz), u0, v0, z0, nx, ny, nz } };
  }
  function voxStep(B, budget) {
    const { m, V } = B, P = m.p, W = m.w, MT = m.m, { g, u0, v0, z0, nx, ny, nz } = V, t0 = performance.now(), sp = VX * 0.6;
    let val = 1; // 1 = 实心（挡人也挡镜头）；2 = 软的（树叶、草丛：人能穿过，镜头不往里钻）
    const put = (u, v, z) => { const i = Math.floor((u - u0) / VX), j = Math.floor((v - v0) / VX), k = Math.floor((z - z0) / VZ); if (i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz) { const n = (k * ny + j) * nx + i; if (g[n] !== 1) g[n] = val; } };
    for (let t = B.t; t < P.length; t += 9) {
      if (budget != null && ((t / 9) & 255) === 0 && performance.now() - t0 > budget) { B.t = t; return; }
      const vi = t / 3; if (MT && MAT_SKIP.has(MT[vi] % 32)) continue; val = W && (W[vi] > 0 || W[vi + 1] > 0 || W[vi + 2] > 0) ? 2 : 1;
      const ax = P[t], ay = P[t + 1], az = P[t + 2] - 0.001, bx = P[t + 3] - ax, by = P[t + 4] - ay, bz = P[t + 5] - 0.001 - az, cx = P[t + 6] - ax, cy = P[t + 7] - ay, cz = P[t + 8] - 0.001 - az;
      if (az < -40 || az > 70) continue;
      const n = Math.min(400, Math.ceil(Math.max(Math.hypot(bx, by, bz), Math.hypot(cx, cy, cz), Math.hypot(bx - cx, by - cy, bz - cz)) / sp));
      for (let a = 0; a <= n; a++) for (let b = 0; b <= n - a; b++) { const fa = a / n, fb = b / n; put(ax + bx * fa + cx * fb, ay + by * fa + cy * fb, az + bz * fa + cz * fb); }
    }
    B.res = V;
  }
  const vAt = (V, u, v, z) => { const i = Math.floor((u - V.u0) / VX), j = Math.floor((v - V.v0) / VX), k = Math.floor((z - V.z0) / VZ); return i >= 0 && j >= 0 && k >= 0 && i < V.nx && j < V.ny && k < V.nz && V.g[(k * V.ny + j) * V.nx + i] === 1; };
  // ---- 地面、墙 ----
  let solidC = null;
  function solids() { const k = 's' + dirtyK; if (!solidC || solidC.k !== k) { const by = Z.map(() => []); for (const s of area().solid()) (by[s.o[0]] || []).push(s); solidC = { k, by }; } return solidC.by; }
  const hitO = (o, u, v, r) => (o[1] === 'c' ? Math.hypot(u - o[2], v - o[3]) < o[4] + r : u > o[1] - r && u < o[3] + r && v > o[2] - r && v < o[4] + r);
  const inRampF = (r, u, v) => u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1;
  const rampZ = (r, u, v) => Z[r.a] + (Z[r.b] - Z[r.a]) * rampT(r, u, v);
  // 脚下最高的面（不高过 zmax）：{ z, lv, ramp }；什么都没有 → z = -Infinity
  function surf(u, v, zmax) {
    const a = area(); let z = -Infinity, lv = -1, ramp = null;
    const V = voxels(); // 楼梯也是真的台阶（楼梯上能迈的高度放宽，见 stepAt）
    if (V) { // 脚下（身子中间一小圈）最高的实心方块的顶
      const kmax = Math.min(V.nz - 1, Math.floor((zmax - V.z0) / VZ - 1 + 1e-6)); // 顶不高过 zmax 的那一格往下找
      for (const [du, dv] of FOOT) { const i = Math.floor((u + du - V.u0) / VX), j = Math.floor((v + dv - V.v0) / VX); if (i < 0 || j < 0 || i >= V.nx || j >= V.ny) continue;
        for (let k = kmax; k >= 0; k--) { const top = V.z0 + (k + 1) * VZ; if (top <= z) break; if (V.g[(k * V.ny + j) * V.nx + i] === 1) { if (top <= zmax + 1e-6) { z = top; ramp = null; } break; } } }
      if (isFinite(z) && !ramp) lv = lvAt(z);
    } else for (let L = 0; L < Z.length; L++) if (Z[L] <= zmax && Z[L] > z && a.inF(L, u, v)) { z = Z[L]; lv = L; }
    return { z, lv, ramp };
  }
  // 身体（脚在 z，高 PH）放在 (u, v) 会不会撞到东西
  function blocked(u, v, z) {
    const V = voxels();
    if (V) {
      const st = stepAt(u, v);
      for (const [du, dv] of BODYC) { const i = Math.floor((u + du - V.u0) / VX), j = Math.floor((v + dv - V.v0) / VX); if (i < 0 || j < 0 || i >= V.nx || j >= V.ny) continue;
        for (let k = Math.max(0, Math.floor((z + st - V.z0) / VZ)), k1 = Math.min(V.nz - 1, Math.floor((z + BODYH - V.z0) / VZ)); k <= k1; k++) if (V.g[(k * V.ny + j) * V.nx + i] === 1) return true; } // 只算身子（脚到肩）；头顶低就弯腰钻过去
      return false;
    }
    const by = solids();
    for (let L = 0; L < by.length; L++) { const zb = Z[L]; if (z + PH < zb || z > zb + 16) continue; for (const s of by[L]) { if (z + STEP >= zb + s.h || z + PH <= zb) continue; if (hitO(s.o, u, v, BODY)) return true; } }
    for (const r of area().ramps) if (inRampF(r, u, v)) { const rz = rampZ(r, u, v); if (rz > z + STEP && rz < z + PH) return true; } // 楼梯的侧面
    return false;
  }
  // ---- 第一人称的“能站的地图”：每层每个 0.5 格，按真实模型算能不能站、会不会撞（自动走路、大地图都用它）----
  // 算一遍要一秒多：平时在后台分批算（每帧几毫秒），算好之前地图先用上一份；要自动走路时才当场算完
  let navC = null, navB = null;
  function navRow(B) { const a = area(), { lv, j } = B; for (let i = 0; i < GN; i++) navCell(a, B.g, B.h, lv, i, j); }
  function navAdvance(B, budget) { const t0 = performance.now(); while (B.lv < Z.length) { navRow(B); if (++B.j >= GN) { B.j = 0; B.lv++; } if (budget != null && performance.now() - t0 > budget) break; } if (B.lv >= Z.length) { navC = { V: B.V, g: B.g, h: B.h }; navB = null; mapC = null; } }
  function navReady() { const V = voxels(); if (navC && navC.V === V) return navC; if (!navB || navB.V !== V) navB = { V, lv: 0, j: 0, g: Z.map(() => new Uint8Array(GN * GN)), h: Z.map(() => new Float32Array(GN * GN)) }; navAdvance(navB, 4); return navC && navC.V === V ? navC : null; }
  function nav() {
    const V = voxels(); if (navC && navC.V === V) return navC;
    if (!navB || navB.V !== V) navB = { V, lv: 0, j: 0, g: Z.map(() => new Uint8Array(GN * GN)), h: Z.map(() => new Float32Array(GN * GN)) };
    navAdvance(navB, null); return navC;
  }
  function navCell(a, g, h, lv, i, j) {
    { const u = gu(i), v = gu(j); if (a.ramps.some((r) => u > r.u0 - 0.3 && u < r.u1 + 0.3 && v > r.v0 - 0.3 && v < r.v1 + 0.3)) return;
      const sf = surf(u, v, Z[lv] + STEP); if (!isFinite(sf.z) || sf.z < Z[lv] - 1 || sf.z > Z[lv] + STEP) return; // 只算贴着这层地面的（箱子顶、桌面不算路）
      // 1 能站 2 有东西挡着：按中心点算（拉直路线时会沿线逐点查真实碰撞，不会擦着角走）
      h[lv][j * GN + i] = sf.z; g[lv][j * GN + i] = blocked(u, v, sf.z) ? 2 : 1;
    }
  }
  const navFree = (lv, u, v) => { const n = nav(), i = gi(u), j = gi(v); return i >= 0 && j >= 0 && i < GN && j < GN && n.g[lv] && n.g[lv][j * GN + i] === 1; };
  function navNear(lv, u, v) { if (navFree(lv, u, v)) return [u, v]; let best = null, bd = 1e9; for (let r = 1; r < 30 && !best; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const uu = u + di * GS, vv = v + dj * GS; if (navFree(lv, uu, vv)) { const d = Math.hypot(di, dj); if (d < bd) { bd = d; best = [gu(gi(uu)), gu(gi(vv))]; } } } return best; }
  const navH = (lv, u, v) => nav().h[lv][gi(v) * GN + gi(u)];
  // 两点之间能不能直着走过去：沿线每 0.2 用真实的碰撞查一遍（不只看格子，免得擦着家具的角走）
  const navLos = (lv, p, q) => { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.2); let z = null; for (let k = 0; k <= n; k++) { const u = p[0] + (q[0] - p[0]) * k / n, v = p[1] + (q[1] - p[1]) * k / n; if (k > 0 && k < n && !navFree(lv, u, v)) return false; const g = surf(u, v, (z == null ? Z[lv] : z) + stepAt(u, v)); if (!isFinite(g.z) || (z != null && z - g.z > STEP + 0.01)) return false; if (blocked(u, v, g.z)) return false; z = g.z; } return true; };
  function navPath(lv, s, t) {
    s = navNear(lv, s[0], s[1]); t = navNear(lv, t[0], t[1]); if (!s || !t) return null; if (navLos(lv, s, t)) return [t];
    const g = nav().g[lv], H = nav().h[lv], si = gi(s[0]) + gi(s[1]) * GN, ti = gi(t[0]) + gi(t[1]) * GN, cost = new Float32Array(GN * GN).fill(1e9), from = new Int32Array(GN * GN).fill(-1), done = new Uint8Array(GN * GN);
    const hh = (k) => Math.hypot((k % GN) - (ti % GN), Math.floor(k / GN) - Math.floor(ti / GN)); const open = [si]; cost[si] = 0; let found = false, guard = 0, best = si, bestH = hh(si);
    while (open.length && guard++ < 60000) { let bi = 0; for (let k = 1; k < open.length; k++) if (cost[open[k]] + hh(open[k]) < cost[open[bi]] + hh(open[bi])) bi = k; const c = open[bi]; open[bi] = open[open.length - 1]; open.pop(); if (done[c]) continue; done[c] = 1; if (c === ti) { found = true; break; } if (hh(c) < bestH) { bestH = hh(c); best = c; }
      const ci = c % GN, cj = Math.floor(c / GN); for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GN || nj >= GN) continue; const n = nj * GN + ni; if (g[n] !== 1 || done[n] || (di && dj && (g[cj * GN + ni] !== 1 || g[nj * GN + ci] !== 1)) || Math.abs(H[n] - H[c]) > STEP) continue; /* 一步迈不上去的不连 */ const nc = cost[c] + (di && dj ? 1.414 : 1); if (nc < cost[n]) { cost[n] = nc; from[n] = c; open.push(n); } } }
    // 到不了（终点在家具后面、被围住了）：走到能到的离它最近的地方
    const end = found ? ti : best; if (end === si) return found ? [t] : null; const raw = []; for (let c = end; c !== -1 && c !== si; c = from[c]) raw.unshift([gu(c % GN), gu(Math.floor(c / GN))]); if (found) raw[raw.length - 1] = t;
    const out = []; let cur = s, k = 0; while (k < raw.length) { let far = k; for (let q = raw.length - 1; q > k; q--) if (navLos(lv, cur, raw[q])) { far = q; break; } out.push(raw[far]); cur = raw[far]; k = far + 1; } return out;
  }
  // 从这儿走到 (u,v,lv)：同一层直接找路；换层就先走到楼梯口、走楼梯、再接着走
  function fpPlan(from, u, v, lv) {
    const a = area(), pts = []; let cur = [from.u, from.v], cl = from.lv;
    if (cl !== lv) for (const [r, to] of route(a, cl, lv)) { const [lo, hi] = rampEnds(r), [en, ex] = to === r.b ? [lo, hi] : [hi, lo]; const p1 = navPath(cl, cur, en); if (!p1) return null; for (const q of p1) pts.push({ u: q[0], v: q[1], lv: cl }); pts.push({ u: ex[0], v: ex[1], lv: to, ramp: r }); cur = ex; cl = to; }
    const p2 = navPath(cl, cur, [u, v]); if (!p2) return null; for (const q of p2) pts.push({ u: q[0], v: q[1], lv: cl });
    return pts;
  }
  // 脚底一小圈（站得住）、身体一圈（撞不撞）
  const FOOT = (() => { const o = [[0, 0]]; for (let a = 0; a < 8; a++) o.push([Math.cos(a / 8 * 6.283) * 0.2, Math.sin(a / 8 * 6.283) * 0.2]); return o; })(); // 脚底 = 整个身体底面：身子有一部分在箱子上方，就算站在箱子上（不会落到箱子旁边、被箱子夹住）
  // 检测半径比身子小一点：方块会把表面往外“撑”出最多一格（0.25），扣掉一半，贴墙走时不会比看上去更早撞到
  const BODYC = (() => { const R = 0.2, o = []; for (let a = 0; a < 12; a++) o.push([Math.cos(a / 12 * 6.283) * R, Math.sin(a / 12 * 6.283) * R]); o.push([0, 0]); return o; })();
  // 头顶还有多高的空（身子正上方一小圈里最近的实心方块）：门框、雨棚、横梁低了就弯腰
  function headroom(u, v, z) { const V = voxels(); if (!V) return 99; let best = 99; for (const [du, dv] of FOOT) { const i = Math.floor((u + du - V.u0) / VX), j = Math.floor((v + dv - V.v0) / VX); if (i < 0 || j < 0 || i >= V.nx || j >= V.ny) continue; for (let k = Math.max(0, Math.floor((z + BODYH - V.z0) / VZ)), k1 = Math.min(V.nz - 1, Math.floor((z + PH + 1 - V.z0) / VZ)); k <= k1; k++) if (V.g[(k * V.ny + j) * V.nx + i] === 1) { best = Math.min(best, V.z0 + k * VZ - z); break; } } return best; }
  // 能迈上去多高：平地 1 格（一级台阶），楼梯上 1.75（城堡里的楼梯一级比较高）
  const stepAt = (u, v) => (area().ramps.some((r) => u > r.u0 - 0.4 && u < r.u1 + 0.4 && v > r.v0 - 0.4 && v < r.v1 + 0.4) ? 1.75 : STEP);
  const lvAt = (z) => { let lv = 0; for (let L = 0; L < Z.length; L++) if (Z[L] <= z + STEP) lv = L; return lv; };
  // ---- 开始 / 结束 ----
  function fpStart() {
    if (!G.isle) { PP.setView && PP.setView('isle'); setTimeout(fpStart, 300); return; }
    const p = mainP(); if (!p) { PP.ui.toast('主角现在不在城堡里'); return; }
    if (fedit) furnEdit(false);
    if (cut != null || focus) setCut(null, true);
    // 位置是连续的：主角现在在哪儿（菜地边、床上、正在走的路上），第一人称就从哪儿开始
    const m = S().fpLast, mOK = m && [0, 1, 2, 3].includes(m.lv) && isFinite(m.u) && isFinite(m.v);
    const q0 = p.isleSpot ? { u: p.isleSpot.u, v: p.isleSpot.v, lv: p.isleLv != null ? p.isleLv : 1 } : p.ip ? { u: p.ip.u, v: p.ip.v, lv: p.ip.lv } : mOK ? m : ipOf(p);
    p.interrupt(true); p.iw = null; p.fishing = null; p.tool = null; p.isleSpot = null;
    const lv = q0.lv != null ? q0.lv : 1, at = nearFree(area(), q0.u, q0.v, lv), g = surf(at[0], at[1], Z[lv] + STEP);
    const same = mOK && m.lv === lv && Math.hypot(m.u - at[0], m.v - at[1]) < 4;
    fp = { p, q: { u: at[0], v: at[1], lv, z: isFinite(g.z) ? g.z : Z[lv] }, yaw: same && isFinite(m.yaw) ? m.yaw : Math.atan2(CEN[1] - at[1], CEN[0] - at[0]), pitch: same && isFinite(m.pitch) ? U.clamp(m.pitch, -1.3, 1.3) : -0.12,
      keys: new Set(), last: performance.now(), t0: performance.now(), vz: 0, air: false, bob: 0, aim: null, aimT: 0, saveT: 0, safe: null, auto: null, camD: fpDist(), fallZ: 0 };
    fpSync(); p.run('fp', A.fpCtl);
    PP.fpOn = true; fpMenu = false; bigMap = null; fpHintT = performance.now();
    try { window.petAPI && window.petAPI.focusWin && window.petAPI.focusWin(); } catch (e) {}
    layout(); fpBar(); PP.refreshInteractive();
    if (lookPref() && lastPT !== 'touch') lookGrab();
  }
  function fpFullToggle() { S().fpFull = !S().fpFull; PP.save.soon(); layout(); camChanged(); if (fp) fpBar(); PP.refreshInteractive(); PP.ui.toast(S().fpFull ? '全屏（再按 F 回到小窗口）' : '小窗口（按 F 全屏）', 1.4); }
  function fpStop(quiet) {
    if (!fp) return; lookFree(); fpRemember(); const p = fp.p, q = fp.q; fp = null; PP.fpOn = false; vOpen = false; fpMenu = false; bigMap = null;
    if (p && G.pets.includes(p)) { if (p.action === 'fp') p.interrupt(true); if (!p.iw) { const at = nearFree(area(), q.u, q.v, q.lv); setIp(p, at[0], at[1], q.lv); } }
    if (fpBarEl) { fpBarEl.remove(); fpBarEl = null; }
    if (hotEl) { hotEl.remove(); hotEl = null; }
    layout(); camChanged(); PP.refreshInteractive(); if (!quiet) PP.ui.toast('回到上帝视角');
  }
  // 主角的位置跟着镜头走（屏幕坐标也一起改，不然别的地方会按旧的屏幕位置把它“吸”回去）
  function fpSync() { const p = fp.p, q = fp.q; p.ip = { u: q.u, v: q.v, lv: q.lv, z: q.z }; p.isleLv = q.lv; if (L) p.x = scrU(q.u, q.v); }
  function fpRemember() { if (!fp || fp.air) return; const q = fp.q; S().fpLast = { u: +q.u.toFixed(2), v: +q.v.toFixed(2), lv: q.lv, yaw: +fp.yaw.toFixed(3), pitch: +fp.pitch.toFixed(3) }; PP.save.soon(); }
  PP.fpOwns = (p) => !!fp && fp.p === p;
  A.fpCtl = function* () { const p = this; p.anim = 'idle'; while (fp && fp.p === p) yield 0.25; };
  // ---- 按钮：左上角一列三个小方块（☰ 菜单 / 🗺 地图 / ✕ 退出），菜单展开在画面里，不占外面的地方 ----
  function fpBar() {
    if (!fpBarEl) { fpBarEl = document.createElement('div'); fpBarEl.className = 'cutbar fpbar vert'; document.getElementById('ui').appendChild(fpBarEl);
      fpBarEl.addEventListener('mousedown', (ev) => ev.stopPropagation());
      fpBarEl.addEventListener('click', (ev) => { const b = ev.target.closest('[data-a]'); if (b) fpAct(b.dataset.a, b); }); }
    const s = S(), on = (v) => (v ? 'class="on"' : ''), sp = fpSpd(), si = SPDS.indexOf(sp), d = fpDist(), se = fpSens();
    const fk = [s.fpFull, fpMenu, !!bigMap, sp, d, fpFovD(), se, lookPref(), s.fpInvX, s.fpInvY, s.fpDrag, fpQ(), s.fpMap !== false].join(',');
    if (fpBarEl.dataset.k !== fk) { fpBarEl.dataset.k = fk;
      fpBarEl.innerHTML = `<button data-a="menu" ${on(fpMenu)} title="菜单：视角、镜头、鼠标、画质（Alt 先松开鼠标）">☰</button><button data-a="map" ${on(bigMap)} title="大地图（Tab）：点哪儿就自动走过去">🗺</button><button data-a="full" ${on(s.fpFull)} title="${s.fpFull ? '回到小窗口（F）' : '全屏（F）'}">⛶</button><button data-a="out" class="primary" title="回到上帝视角（Q）">✕</button>`
        + (fpMenu ? `<div class="fpmenu">
          <div class="r"><span>视角</span><button data-a="god">上帝</button><button data-a="first" ${on(d < 0.5)}>第一人称</button><button data-a="third" ${on(d >= 0.5)}>第三人称</button><small>V 切换</small></div>
          <div class="r"><span>视野</span><button data-a="fovn" ${fpFovD() <= 50 ? 'disabled' : ''}>窄</button><b>${fpFovD()}°</b><button data-a="fovp" ${fpFovD() >= 110 ? 'disabled' : ''}>广</button><small>第一人称滚轮</small></div>
          ${d >= 0.5 ? `<div class="r"><span>镜头距离</span><button data-a="dn" ${d <= 2 ? 'disabled' : ''}>近</button><b>${d.toFixed(0)}</b><button data-a="dp" ${d >= 14 ? 'disabled' : ''}>远</button><small>第三人称滚轮</small></div>` : ''}
          <div class="r"><span>走路速度</span><button data-a="slow" ${si <= 0 ? 'disabled' : ''}>−</button><b>×${sp}</b><button data-a="fast" ${si >= SPDS.length - 1 ? 'disabled' : ''}>+</button></div>
          <div class="r"><span>鼠标转头 (M)</span><button data-a="mouse" ${on(lookPref())}>${lookPref() ? '开' : '关'}</button><small>${lookPref() ? '动鼠标就转头' : '按住拖动才转'}</small></div>
          <div class="r"><span>灵敏度</span><button data-a="sn" ${se <= SENS[0] ? 'disabled' : ''}>−</button><b>${se}</b><button data-a="sp" ${se >= SENS[SENS.length - 1] ? 'disabled' : ''}>+</button></div>
          <div class="r"><span>左右反过来</span><button data-a="invx" ${on(s.fpInvX)}>${s.fpInvX ? '开' : '关'}</button><span>上下反过来</span><button data-a="invy" ${on(s.fpInvY)}>${s.fpInvY ? '开' : '关'}</button></div>
          <div class="r"><span>拖动 / 触屏滑</span><button data-a="drag" class="wide">${s.fpDrag === 'grab' ? '拽画面：往左拖 → 往右看' : '转镜头：往左滑 → 往左看'}</button></div>
          <div class="r"><span>画质</span><button data-a="qfine" ${on(fpQ() === 'fine')}>精细</button><button data-a="qpix" ${on(fpQ() === 'pixel')}>像素风</button><span>小地图</span><button data-a="mini" ${on(s.fpMap !== false)}>${s.fpMap !== false ? '开' : '关'}</button></div>
          <div class="help">WASD / 方向键 走（A 左、D 右，←→ 转身）· 鼠标 看 · 空格 跳（能翻过栏杆、从阳台跳下去）· Shift 跑 · E 或单击 用准星对着的东西 · Tab 大地图 · F 全屏 · 1～5 快捷栏 · C 坐下 · Z 躺下 · V 第一 / 第三人称 · 滚轮 视野宽窄（第三人称时是远近） · Alt 松开鼠标 · Q 退出 · Esc 老板键</div>
        </div>` : '');
    }
    const sc = U.clamp(Math.min(L.vw, L.vh) / 560, 0.75, 1.4); fpBarEl.style.transformOrigin = 'left top'; fpBarEl.style.transform = `scale(${sc.toFixed(3)})`;
    fpBarEl.style.left = Math.max(2, L.vx0 + 6) + 'px'; fpBarEl.style.top = Math.max(2, L.vy0 + 6) + 'px';
    fpHot();
  }
  function fpAct(a) {
    const s = S(), sv = () => PP.save.soon();
    if (a === 'menu') { fpMenu = !fpMenu; bigMap = null; if (fpMenu) lookFree(); }
    else if (a === 'map') { toggleMap(); }
    else if (a === 'full') { fpFullToggle(); return; }
    else if (a === 'out' || a === 'god') { fpStop(); return; }
    else if (a === 'first') { s.fpDist = 0; sv(); }
    else if (a === 'third') { s.fpDist = fpDist() >= 0.5 ? fpDist() : 8; sv(); }
    else if (a === 'dn' || a === 'dp') { s.fpDist = U.clamp(fpDist() + (a === 'dp' ? 2 : -2), 2, 14); sv(); }
    else if (a === 'fovn' || a === 'fovp') { s.fpFov = U.clamp(fpFovD() + (a === 'fovp' ? 10 : -10), 50, 110); sv(); }
    else if (a === 'slow' || a === 'fast') { const i = SPDS.indexOf(fpSpd()) + (a === 'fast' ? 1 : -1); s.fpSpeed = SPDS[U.clamp(i, 0, SPDS.length - 1)]; sv(); }
    else if (a === 'mouse') { lookToggle(); return; }
    else if (a === 'sn' || a === 'sp') { const cur = SENS.reduce((b, x) => (Math.abs(x - fpSens()) < Math.abs(b - fpSens()) ? x : b), 1), i = SENS.indexOf(cur) + (a === 'sp' ? 1 : -1); s.fpSens = SENS[U.clamp(i, 0, SENS.length - 1)]; sv(); }
    else if (a === 'invx') { s.fpInvX = !s.fpInvX; sv(); }
    else if (a === 'invy') { s.fpInvY = !s.fpInvY; sv(); }
    else if (a === 'drag') { s.fpDrag = s.fpDrag === 'grab' ? 'look' : 'grab'; sv(); }
    else if (a === 'qfine' || a === 'qpix') { s.fpQ = a === 'qpix' ? 'pixel' : 'fine'; sv(); }
    else if (a === 'mini') { s.fpMap = s.fpMap === false; sv(); }
    if (fp) fpBar();
  }
  // ---- 键盘 ----
  // A 往左、D 往右（横着走）；←→ 转身；W/↑ 往前；S/↓ 往后
  const fpKeyMap = { ArrowUp: 'f', KeyW: 'f', ArrowDown: 'b', KeyS: 'b', KeyA: 'l', KeyD: 'r', ArrowLeft: 'tl', ArrowRight: 'tr', ShiftLeft: 'run', ShiftRight: 'run' };
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (!fp && G.isle && e.code === 'KeyF' && !e.ctrlKey && !e.altKey && !e.metaKey && !fedit) { fpStart(); e.preventDefault(); return; }
    if (!fp) return;
    if (e.key === 'Alt') { lookFree(); e.preventDefault(); return; } // Alt：先把鼠标放出来点按钮
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const k = fpKeyMap[e.code]; if (k) { fp.keys.add(k); if (k !== 'run') fp.auto = null; e.preventDefault(); return; }
    if (e.code === 'Space') { fpJump(); e.preventDefault(); return; }
    if (e.code === 'Tab') { toggleMap(); e.preventDefault(); return; }
    if (e.code === 'KeyE' || e.code === 'Enter') { fpUse(null); e.preventDefault(); return; }
    if (e.code === 'KeyM') { lookToggle(); e.preventDefault(); return; }
    if (e.code === 'KeyV') { const s = S(); if (fpDist() >= 0.5) { s.fpDist3 = fpDist(); s.fpDist = 0; } else s.fpDist = s.fpDist3 || 8; PP.save.soon(); fpBar(); PP.ui.toast(fpDist() >= 0.5 ? '第三人称（滚轮拉远拉近，V 切回来）' : '第一人称（滚轮调视野，V 切第三人称）', 1.4); e.preventDefault(); return; }
    if (e.code === 'KeyF') { fpFullToggle(); e.preventDefault(); return; }
    if (e.code === 'KeyC' || e.code === 'KeyZ') { const w = e.code === 'KeyC' ? 'sit' : 'lie'; fp.pose = fp.pose === w ? null : w; fp.auto = null; PP.ui.toast(fp.pose === 'sit' ? '坐下歇会儿（慢慢回体力，走一步就起来）' : fp.pose === 'lie' ? '躺下（回体力更快，走一步就起来）' : '起来了', 1.4); e.preventDefault(); return; }
    if (/^Digit[1-5]$/.test(e.code)) { fpSlot(+e.code.slice(5)); e.preventDefault(); return; }
    if (e.code === 'KeyQ') { fpStop(); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { if (!fp) return; const k = fpKeyMap[e.code]; if (k) fp.keys.delete(k); });
  window.addEventListener('blur', () => { if (fp) fp.keys.clear(); });
  // 滚轮：拉远（第三人称）/ 拉近（第一人称）
  window.addEventListener('wheel', (e) => {
    if (!fp || (e.target && e.target.closest && e.target.closest('.panel,.menu,.fpmenu'))) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (bigMap) { bigMap.z = U.clamp((bigMap.z || 1) * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 4); return; }
    // 第一人称：滚轮调视野（往下滚看得更广）；第三人称：滚轮拉远拉近（像原神）
    if (fpDist() >= 0.5) S().fpDist = U.clamp(fpDist() + (e.deltaY > 0 ? 1 : -1), 2, 14); else S().fpFov = U.clamp(fpFovD() + (e.deltaY > 0 ? 5 : -5), 50, 110);
    PP.save.soon(); fpBar();
  }, { capture: true, passive: false });
  function fpJump() { if (!fp || fp.air || fp.p.action !== 'fp') return; fp.vz = JUMP; fp.air = true; fp.fallZ = fp.q.z; }
  // ---- 鼠标：锁住（转头）/ 拖动 / 触屏滑 ----
  // 鼠标转头：把鼠标锁在画面里（光标藏起来），移动鼠标 = 转头，单击 = 用准星对着的东西；M 或菜单开关；Alt 先松开鼠标；Esc 是老板键
  let lookBye = false, lookT = 0, lookLostT = -1e9, lastPT = 'mouse';
  window.addEventListener('pointerdown', (e) => { lastPT = e.pointerType || 'mouse'; }, true);
  function stageEl() { return document.getElementById('stage'); }
  function lookPref() { return S().fpMouse !== false; }
  function lookOn() { return !!fp && !!document.pointerLockElement && document.pointerLockElement === stageEl(); }
  function lookGrab() {
    if (!fp || lookOn() || fpMenu || bigMap) return; const el = stageEl(); if (!el || !el.requestPointerLock) return;
    try { window.petAPI && window.petAPI.focusWin && window.petAPI.focusWin(); } catch (e) {}
    try { const r = el.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  }
  function lookFree() { if (document.pointerLockElement) { lookBye = true; try { document.exitPointerLock(); } catch (e) {} } }
  function lookToggle() {
    S().fpMouse = !lookPref(); PP.save.soon();
    if (lookPref()) lookGrab(); else lookFree();
    if (fp) fpBar(); PP.ui.toast(lookPref() ? '鼠标转头：开（移动鼠标看四周，单击用东西，Alt 松开鼠标）' : '鼠标转头：关（按住鼠标拖动转头）', 2);
  }
  document.addEventListener('pointerlockchange', () => {
    const on = lookOn(), self = lookBye; lookBye = false;
    if (document.pointerLockElement && (!fp || !lookPref() || fpMenu || bigMap)) { lookFree(); return; } // 刚锁上时已经关掉 / 退出 / 开了菜单
    if (on) lookT = performance.now(); else if (!self && fp) { lookLostT = performance.now(); if (performance.now() - (PP.lastEscTap || -1e9) < 600 && PP.panic) PP.panic(); } // 锁着鼠标时按 Esc：浏览器先吃掉这一下，用全局按键听到的那次来当老板键
    PP.refreshInteractive && PP.refreshInteractive(); if (fp) fpBar();
  });
  PP.lookLostRecently = () => performance.now() - lookLostT < 600;
  const turnBy = (dx, dy, k) => { const s = S(); fp.yaw += dx * k * (s.fpInvX ? -1 : 1); fp.pitch = U.clamp(fp.pitch - dy * k * (s.fpInvY ? -1 : 1), -1.3, 1.3); };
  window.addEventListener('mousemove', (e) => {
    if (!lookOn()) return;
    turnBy(U.clamp(e.movementX || 0, -150, 150), U.clamp(e.movementY || 0, -150, 150), 0.0024 * fpSens());
  }, true);
  for (const t of ['mousedown', 'mouseup', 'click', 'dblclick']) window.addEventListener(t, (e) => {
    if (!lookOn()) return; e.stopImmediatePropagation(); e.preventDefault();
    if (t === 'mousedown' && e.button === 0) fpUse(null);
    if (t === 'mousedown' && e.button === 2) fpJump();
  }, true);
  function fpDown(x, y) {
    if (bigMap) { mapClick(x, y); return; }
    if (fpMenu) { fpMenu = false; fpBar(); return; }
    if (miniHit(x, y)) { toggleMap(); return; }
    if (lookPref() && !lookOn() && lastPT !== 'touch') { lookGrab(); return; }
    // 拖动 / 触屏滑：默认“转镜头”（往左滑 → 往左看）；菜单里能改成“拽画面”
    const st = { x, y, yaw: fp.yaw, pitch: fp.pitch, moved: false }; G.uiDrag = true;
    const mv = (ev) => { const dx = ev.clientX - st.x, dy = ev.clientY - st.y; if (Math.hypot(dx, dy) > 6) st.moved = true; if (!st.moved) return; const g = S().fpDrag === 'grab' ? -1 : 1; fp.yaw = st.yaw; fp.pitch = st.pitch; turnBy(dx * g, dy * g, 0.006 * fpSens()); document.body.style.cursor = 'grabbing'; };
    const up = (ev) => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); G.uiDrag = false; document.body.style.cursor = 'default'; if (!st.moved && fp) fpUse([ev.clientX, ev.clientY]); PP.refreshInteractive(); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    try { window.petAPI && window.petAPI.focusWin && window.petAPI.focusWin(); } catch (e) {}
  }
  // ---- 走路、跳、掉 ----
  function fpStepTo(nu, nv) {
    const q = fp.q, st = stepAt(nu, nv); if (blocked(nu, nv, q.z)) return false;
    const g = surf(nu, nv, q.z + st); if (!isFinite(g.z)) return false; // 脚下什么都没有（城堡外面的天空）：过不去
    q.u = nu; q.v = nv;
    if (!fp.air) { if (q.z - g.z > st) { fp.air = true; fp.vz = 0; fp.fallZ = q.z; } else { q.z = g.z; q.lv = g.lv; } }
    return true;
  }
  function fpMove(du, dv) { const q = fp.q, n = Math.max(1, Math.ceil(Math.hypot(du, dv) / 0.3)); for (let i = 0; i < n; i++) { const a = du / n, b = dv / n; if (!fpStepTo(q.u + a, q.v + b) && !fpStepTo(q.u + a, q.v) && !fpStepTo(q.u, q.v + b)) return false; } return true; }
  function fpTick(dt) {
    const p = fp.p; if (!G.pets.includes(p) || p.held) { fpStop(true); return; }
    const K = fp.keys, q = fp.q;
    let mv = (K.has('f') ? 1 : 0) - (K.has('b') ? 1 : 0), st = (K.has('r') ? 1 : 0) - (K.has('l') ? 1 : 0); const tn = (K.has('tr') ? 1 : 0) - (K.has('tl') ? 1 : 0);
    // 主角被派去干别的事（你点了床、菜地……）：镜头跟着它；你一按方向键就收回来
    if (p.action !== 'fp' && !p.action) { fp.q = Object.assign({}, fp.q, (() => { const q0 = ipOf(p); return { u: q0.u, v: q0.v, lv: q0.lv, z: q0.z != null ? q0.z : Z[q0.lv] }; })()); p.isleSpot = null; p.run('fp', A.fpCtl); }
    if (p.action !== 'fp') {
      if (mv || st) { p.interrupt(true); p.iw = null; p.isleSpot = null; const q0 = ipOf(p); fp.q = { u: q0.u, v: q0.v, lv: q0.lv, z: q0.z != null ? q0.z : Z[q0.lv] }; fp.air = false; p.run('fp', A.fpCtl); }
      else { const q0 = p.isleSpot || ipOf(p); fp.q = { u: q0.u, v: q0.v, lv: p.isleLv != null ? p.isleLv : q.lv, z: q0.z != null ? q0.z : Z[p.isleLv || 1] }; fp.air = false; fp.vz = 0; return; }
    }
    fp.yaw += tn * 2.4 * dt; // → 往右转，← 往左转
    /* 坐下（C）/ 躺下（Z）：一动就起来；坐着、躺着慢慢回体力 */
    if (fp.pose && (mv || st || fp.auto || fp.air)) { fp.pose = null; }
    if (fp.pose) { mv = 0; st = 0; p.n.energy = Math.min(100, p.n.energy + dt * (fp.pose === 'lie' ? 0.6 : 0.25)); }
    // 地图上点了个地方：自己走过去（按方向键就停）
    if (fp.auto && !mv && !st) {
      const au = fp.auto, t = au.pts[au.i];
      if (!t) { fp.auto = null; PP.ui.toast('到啦', 1); }
      else { const du = t.u - q.u, dv = t.v - q.v, d = Math.hypot(du, dv);
        if (d < 0.5) au.i++;
        else { const want = Math.atan2(dv, du); let dy = Math.atan2(Math.sin(want - fp.yaw), Math.cos(want - fp.yaw)); fp.yaw += U.clamp(dy, -6 * dt, 6 * dt);
          const sp = RUN * 0.8 * fpSpd() * dt, k = Math.min(1, sp / d), u0 = q.u, v0 = q.v; fpMove(du * k, dv * k); fp.bob += dt * 10;
          // 自动跳：被矮东西（低于 3 格，比如菜地的木框、箱子）挡住走不动，就跳过去（像我的世界）
          if (!fp.air && Math.hypot(q.u - u0, q.v - v0) < sp * 0.3) { const nu = q.u + du / d * 0.45, nv = q.v + dv / d * 0.45, g2 = surf(nu, nv, q.z + 3.2); if (isFinite(g2.z) && g2.z > q.z + STEP && !blocked(nu, nv, g2.z)) fpJump(); }
          au.prog = (au.prog || 0) + Math.hypot(q.u - u0, q.v - v0); au.t = (au.t || 0) + dt; if (au.t > 1.2) { if (au.prog < 0.6) { const last = au.pts[au.pts.length - 1], np = (au.retry || 0) < 3 && fpPlan(q, last.u, last.v, last.lv); if (np && np.length) fp.auto = { pts: np, i: 0, retry: (au.retry || 0) + 1 }; else { fp.auto = null; PP.ui.toast('前面过不去了，换个地方试试', 1.6); } } else { au.t = 0; au.prog = 0; } } } }
    }
    if (mv || st) {
      const sp = (K.has('run') ? RUN : SPEED * 0.8) * fpSpd() * dt, c = Math.cos(fp.yaw), s2 = Math.sin(fp.yaw), n = Math.hypot(mv, st) || 1;
      // 往前 = (cos, sin)；往右 = (-sin, cos)
      fpMove((c * mv - s2 * st) / n * sp, (s2 * mv + c * st) / n * sp); if (!fp.air) fp.bob += dt * (K.has('run') ? 14 : 9);
    }
    // 竖直方向：跳起来 / 掉下去 / 落地
    const stH = stepAt(q.u, q.v), g = surf(q.u, q.v, q.z + stH);
    if (fp.air) {
      fp.vz = Math.max(-70, fp.vz - GRAV * dt); const nz = q.z + fp.vz * dt, g2 = surf(q.u, q.v, Math.max(nz, q.z) + STEP);
      if (fp.vz <= 0 && isFinite(g2.z) && nz <= g2.z) { q.z = g2.z; q.lv = g2.lv; fp.air = false; const h = fp.fallZ - q.z; fp.vz = 0; if (h > 8) { fp.land = performance.now(); p.jolt && p.jolt(0, -3); } }
      else if (!isFinite(g2.z) || nz < Z[0] - 30) { const s = fp.safe; if (s) { q.u = s.u; q.v = s.v; q.z = s.z; q.lv = s.lv; } fp.air = false; fp.vz = 0; PP.ui.toast('差点掉下去！回到刚才站的地方', 1.6); }
      else { q.z = nz; q.lv = lvAt(q.z); }
    } else if (isFinite(g.z)) { if (q.z - g.z > stH) { fp.air = true; fp.vz = 0; fp.fallZ = q.z; } else { q.z = g.z; q.lv = g.lv;
        // 卡在缝里（站着却被墙夹住）超过半秒：回到刚才站稳的地方
        const want = mv || st || fp.auto, movedNow = fp.lastP ? Math.hypot(q.u - fp.lastP[0], q.v - fp.lastP[1]) : 1; fp.lastP = [q.u, q.v];
        if (blocked(q.u, q.v, q.z) && want && movedNow < 0.01) { fp.stuckT = (fp.stuckT || 0) + dt; if (fp.stuckT > 1 && fp.safe) { Object.assign(q, fp.safe); fp.stuckT = 0; fp.auto = null; PP.ui.toast('卡住了，回到刚才站的地方', 1.4); } } // 想走却一动不动 1 秒才救
        else if (!blocked(q.u, q.v, q.z)) { fp.stuckT = 0; if (!g.ramp && q.z > Z[0] - 1 && (!fp.safeT || performance.now() - fp.safeT > 300)) { fp.safe = { u: q.u, v: q.v, z: q.z, lv: q.lv }; fp.safeT = performance.now(); } } } }
    p.anim = fp.air ? (fp.vz > 0 ? 'jump' : 'fall') : fp.pose ? fp.pose : (mv || st || fp.auto) ? (K.has('run') || fp.auto ? 'run' : 'walk') : 'idle';
    fpSync();
    if ((fp.saveT += dt) > 3) { fp.saveT = 0; fpRemember(); }
  }
  // ---- 镜头 ----
  function fpCam() { if (fp._camT === fp.last && fp._cam) return fp._cam; fp._camT = fp.last; return (fp._cam = fpCam1()); }
  function fpCam1() {
    const q = fp.q, walking = !fp.air && (fp.keys.has('f') || fp.keys.has('b') || fp.keys.has('l') || fp.keys.has('r') || fp.auto), b = walking ? Math.sin(fp.bob) * 0.16 : 0;
    const land = fp.land ? Math.max(0, 1 - (performance.now() - fp.land) / 260) * -0.9 : 0;
    // 弯腰：头顶空间不够就把眼睛放低（慢慢低下去、慢慢直起来）
    const want = Math.min(U.clamp(headroom(q.u, q.v, q.z) - 0.7, CROUCH, EYE), fp.pose === 'sit' ? 4.4 : fp.pose === 'lie' ? 2.0 : EYE); fp.eyeH = fp.eyeH == null ? want : fp.eyeH + (want - fp.eyeH) * 0.25;
    fp.camZ = fp.camZ == null || Math.abs(fp.camZ - q.z) > 4 ? q.z : fp.camZ + (q.z - fp.camZ) * 0.3;
    const head = [q.u, q.v, fp.camZ + fp.eyeH + b + land];
    // 第三人称：镜头往后拉，碰到墙、天花板就停在墙前面
    fp.camD += (fpDist() - fp.camD) * 0.2; const D = fp.camD;
    if (D < 0.3) return { eye: head, yaw: fp.yaw, pitch: fp.pitch, fov: fpFov(), third: 0 };
    const cp = Math.cos(fp.pitch), du = -Math.cos(fp.yaw) * cp, dv = -Math.sin(fp.yaw) * cp, dz = -Math.sin(fp.pitch) * 2.45; // 距离按地面的格子算（竖直方向换算成同样长）
    let k = 0; const step = 0.25, lv = q.lv, ceil = ceilAt(q.u, q.v, lv);
    while (k < D) { const n = k + step, u = head[0] + du * n, v = head[1] + dv * n, z = head[2] + dz * n + 1.2 * (n / Math.max(D, 1));
      if (z < surfTop(u, v, z) + 0.8 || z > Math.min(ceil, ceilAt(u, v, lv)) - 0.6 || wallAt(u, v, z)) break; k = n; }
    return { eye: [head[0] + du * k, head[1] + dv * k, head[2] + dz * k + 1.2 * (k / Math.max(D, 1))], yaw: fp.yaw, pitch: fp.pitch, fov: fpFov(), third: k };
  }
  const surfTop = (u, v, z) => { const g = surf(u, v, z); return isFinite(g.z) ? g.z : -1e9; };
  const vAny = (V, u, v, z) => { const i = Math.floor((u - V.u0) / VX), j = Math.floor((v - V.v0) / VX), k = Math.floor((z - V.z0) / VZ); return i >= 0 && j >= 0 && k >= 0 && i < V.nx && j < V.ny && k < V.nz && V.g[(k * V.ny + j) * V.nx + i] > 0; };
  const wallAt = (u, v, z) => { const V = voxels(); if (V) return vAny(V, u, v, z) || vAny(V, u, v, z + 0.4) || vAny(V, u, v, z - 0.4); /* 镜头：树叶也算（不钻进树冠） */ const by = solids(); for (let L = 0; L < by.length; L++) { const zb = Z[L]; if (z < zb || z > zb + 15) continue; for (const s of by[L]) if (s.wall && hitO(s.o, u, v, 0.25)) return true; } return false; };
  function ceilAt(u, v, lv) { const r = F.roomAt(u, v, lv); let c = r ? Z[lv] + F.roomH(r) : 1e9; for (let L = lv + 1; L < Z.length; L++) if (area().inF(L, u, v)) { c = Math.min(c, Z[L]); break; } return c; }
  function fpOpts(extra) { const k = fpK(), pix = fpQ() === 'pixel'; return Object.assign({}, viewOpts(), { w: Math.ceil(L.vw / k), h: Math.ceil(L.vh / k), posterize: pix ? 26 : 0, cel: pix, fp: fpCam(), cut: null, clip: null, mirror: false, pets: [], rips: [] }, extra || {}); }
  // 准星 / 点到的地方是什么
  function hotFromId(id) {
    if (id == null || id < 0) return null;
    if (FIXK[id]) return Object.assign({}, FIXK[id]);
    if (id >= PK.plot && id < PK.plot + 6) { const i = id - PK.plot, inf = PP.econ.plotInfo(i); return { k: 'plot', i, label: !inf ? '菜地：播种' : inf.stage === 3 ? '菜地：收获' : '菜地：浇水' }; }
    if (id >= PK.deco && id < PK.deco + 6) { const i = id - PK.deco, d = (E().isleDeco || [])[i]; if (['bench', 'swing', 'hay'].includes(d)) return { k: 'deco', i, id: d, label: { bench: '长椅：坐一会儿', swing: '秋千：荡一荡', hay: '干草垛：趴一会儿' }[d] }; return null; }
    const pr = props().find((q) => q.id === id); return pr ? { k: 'prop', pr, label: propLabel(pr) } : null;
  }
  function fpPick(x, y) { try { const k = fpK(); return glOK ? g3.draw(lastScenes, fpOpts({ pickAt: [x / k, y / k] })) : -1; } catch (e) { return -1; } }
  /* 快捷栏（1～5）：手 / 水壶 / 种子 / 鱼竿 / 零食。选好再按 E 或单击 */
  const SLOTS5 = [['手', '✋', '用准星对着的东西'], ['水壶', '💧', '对着菜地浇水'], ['种子', '🌱', '对着空菜地种下'], ['鱼竿', '🎣', '对着蓄水池钓鱼'], ['零食', '🍪', '按 E 自己吃一口零食']];
  let hotEl = null;
  function fpSlot(i) { S().fpSlot = U.clamp(i, 1, 5); PP.save.soon(); fpHot(); }
  function fpHot() {
    if (!fp) { if (hotEl) { hotEl.remove(); hotEl = null; } return; }
    if (!hotEl) { hotEl = document.createElement('div'); hotEl.className = 'fphot'; document.getElementById('ui').appendChild(hotEl);
      hotEl.addEventListener('mousedown', (ev) => ev.stopPropagation()); hotEl.addEventListener('click', (ev) => { const b = ev.target.closest('[data-s]'); if (b) fpSlot(+b.dataset.s); }); }
    const cur = S().fpSlot || 1, k = cur + '|' + L.vx0 + '|' + L.vw + '|' + L.vy1;
    if (hotEl.dataset.k !== k) { hotEl.dataset.k = k; hotEl.innerHTML = SLOTS5.map(([n, ic, tip], i) => `<button data-s="${i + 1}" class="${cur === i + 1 ? 'on' : ''}" title="${tip}"><i>${i + 1}</i>${ic}<small>${n}</small></button>`).join('');
      hotEl.style.left = Math.round(L.vx0 + L.vw / 2) + 'px'; hotEl.style.top = Math.round(L.vy1 - 8) + 'px'; }
  }
  /* 看不看得见：从眼睛到它身子中间连一条线，路上碰到墙、地板（实心的方块）就看不见。每只 0.15 秒算一次 */
  function sees(o, eye, q) {
    const now = performance.now(); if (o._seeT && now - o._seeT < 150) return o._see; o._seeT = now;
    const V = voxels(), tz = (q.z != null ? q.z : Z[q.lv]) + 3, du = q.u - eye[0], dv = q.v - eye[1], dz = tz - eye[2], d = Math.hypot(du, dv, dz / 2.45);
    if (d > 45) return (o._see = false);
    if (!V) return (o._see = (F.roomAt(q.u, q.v, q.lv) || null) === (F.roomAt(fp.q.u, fp.q.v, fp.q.lv) || null));
    const n = Math.ceil(d / 0.2); let ok = true;
    for (let i = 2; i < n - 3; i++) { const k = i / n; if (vAt(V, eye[0] + du * k, eye[1] + dv * k, eye[2] + dz * k)) { ok = false; break; } }
    return (o._see = ok);
  }
  function fpUse(at) {
    const x = at ? at[0] - L.vx0 : L.vw / 2, y = at ? at[1] - L.vy0 : L.vh / 2, slot = S().fpSlot || 1;
    if (slot === 5) { const e = E(), id = Object.keys(e.bag).find((k) => e.bag[k] > 0 && PP.econ.ITEMS[k] && ['snack', 'dish', 'crop'].includes(PP.econ.ITEMS[k].kind)); if (!id) { PP.ui.toast('背包里没有吃的了（商店能买零食，菜地能收菜）', 2); return; } PP.econ.feedItem(fp.p, id); return; }
    const h = hotFromId(fpPick(x, y));
    const need = { 2: (h) => h && h.k === 'plot' && PP.econ.plotInfo(h.i), 3: (h) => h && h.k === 'plot' && !PP.econ.plotInfo(h.i), 4: (h) => h && h.k === 'fish' }[slot];
    if (need && !need(h)) { PP.ui.toast(SLOTS5[slot - 1][0] + '：' + SLOTS5[slot - 1][2] + '（按 1 换回手）', 1.8); return; }
    if (!h) { if (!at) PP.ui.toast('准星对着能用的东西（床、椅子、菜地、鱼塘……）再按 E', 1.6); return; }
    const where = h.pr ? h.pr.at : h.k === 'plot' ? F.plotStand(h.i) : null;
    if (where && Math.hypot(where[0] - fp.q.u, where[1] - fp.q.v) > 5.5) { PP.ui.toast('够不着，走到跟前再用', 1.4); return; }
    fp.auto = null; fpSync(); h.isle = true; PP.fpAllow = true; try { click(h, at ? at[0] : L.vx0 + x, at ? at[1] : L.vy0 + y); } finally { PP.fpAllow = false; }
  }
  // ---- 地图：右上角小地图（点一下打开大地图）；大地图上点哪儿，主角自己走过去 ----
  let mapC = null;
  function mapData() {
    const n = navReady(); if (!n) return null; if (mapC && mapC.n === n) return mapC;
    const N = GN, lvl = Z.map(() => new Uint8Array(N * N)); let u0 = 1e9, v0 = 1e9, u1 = -1e9, v1 = -1e9;
    // 地图 = 第一人称真实能走的地方：浅色能站，深色有东西挡着（墙、家具、树……），楼梯另外画
    for (let L = 0; L < Z.length; L++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const c = n.g[L][j * N + i]; if (!c) continue; const u = gu(i), v = gu(j); lvl[L][j * N + i] = c === 2 ? 3 : F.roomAt(u, v, L) ? 2 : 1; if (L >= 1) { u0 = Math.min(u0, u); v0 = Math.min(v0, v); u1 = Math.max(u1, u); v1 = Math.max(v1, v); } }
    const imgs = lvl.map((g, L) => { const c = document.createElement('canvas'); c.width = N; c.height = N; const x = c.getContext('2d'), d = x.createImageData(N, N); const col = { 1: [196, 214, 160, 235], 2: [238, 222, 192, 245], 3: [70, 58, 74, 255], 4: [150, 120, 90, 255] };
      for (let n = 0; n < N * N; n++) { const cc = col[g[n]]; if (!cc) continue; d.data.set(cc, n * 4); } x.putImageData(d, 0, 0); return c; });
    const pad = 2; return (mapC = { n, imgs, box: [u0 - pad, v0 - pad, u1 + pad, v1 + pad] });
  }
  const mapLabels = (lv) => {
    const out = [];
    for (const r of ROOMS) { if (r.lv !== lv || r.hut) continue; const c = r.c ? [r.c[0], r.c[1]] : r.rot ? F.toW(r, (r.r[0] + r.r[2]) / 2, (r.r[1] + r.r[3]) / 2) : [(r.r[0] + r.r[2]) / 2, (r.r[1] + r.r[3]) / 2]; out.push({ u: c[0], v: c[1], t: r.nm || r.name || '' }); }
    for (const q of F.MODS) { if (q.lv !== lv || !q.name || q.kind === 'court' || out.some((o) => o.t === q.name)) continue; const [a, b, c, d] = q.r, w = F.toW ? (q.fr ? F.toW(F.frameOf(q.fr), (a + c) / 2, (b + d) / 2) : [(a + c) / 2, (b + d) / 2]) : [(a + c) / 2, (b + d) / 2]; out.push({ u: w[0], v: w[1], t: q.name, soft: 1 }); }
    return out;
  };
  function drawMap(ctx, x, y, w, h, lv, big) {
    const md = mapData();
    if (!md) { ctx.fillStyle = 'rgba(28,24,40,.62)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#fff6d8'; ctx.font = PP.FONT(12); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('地图准备中…', x + w / 2, y + h / 2); return null; }
    const [u0, v0, u1, v1] = md.box, sc = Math.min(w / (u1 - u0), h / (v1 - v0)) * (big && bigMap ? bigMap.z || 1 : 1);
    let cu = (u0 + u1) / 2, cv = (v0 + v1) / 2; if (big && bigMap && (bigMap.z || 1) > 1) { cu = fp.q.u; cv = fp.q.v; }
    const X = (u) => x + w / 2 + (u - cu) * sc, Y = (v) => y + h / 2 + (v - cv) * sc;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = big ? 'rgba(28,24,40,.86)' : 'rgba(28,24,40,.62)'; ctx.fillRect(x, y, w, h);
    if (lv > 0) { ctx.globalAlpha = 0.28; ctx.imageSmoothingEnabled = false; ctx.drawImage(md.imgs[lv - 1], X(gu(0) - GS / 2), Y(gu(0) - GS / 2), GN * GS * sc, GN * GS * sc); ctx.globalAlpha = 1; }
    ctx.imageSmoothingEnabled = false; ctx.drawImage(md.imgs[lv], X(gu(0) - GS / 2), Y(gu(0) - GS / 2), GN * GS * sc, GN * GS * sc);
    // 楼梯
    for (const r of area().ramps) if (r.a === lv || r.b === lv) { ctx.fillStyle = 'rgba(255,214,120,.9)'; ctx.fillRect(X(r.u0), Y(r.v0), (r.u1 - r.u0) * sc, (r.v1 - r.v0) * sc); if (big) { ctx.fillStyle = '#2a2030'; ctx.font = PP.FONT(Math.max(10, sc * 2)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('楼梯', X((r.u0 + r.u1) / 2), Y((r.v0 + r.v1) / 2)); } }
    // 菜地
    if (lv === 1) for (let i = 0; i < 6; i++) { const s = F.plotStand(i); ctx.fillStyle = '#5aa64e'; ctx.fillRect(X(s[0]) - sc * 1.2, Y(s[1]) - sc * 2.6, sc * 2.4, sc * 1.6); }
    if (big) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (const l of mapLabels(lv)) { const fs = Math.max(10, Math.min(16, sc * 1.6)); ctx.font = PP.FONT(fs); const tw = ctx.measureText(l.t).width; ctx.fillStyle = l.soft ? 'rgba(40,36,30,.55)' : 'rgba(40,30,40,.75)'; ctx.fillRect(X(l.u) - tw / 2 - 3, Y(l.v) - fs / 2 - 2, tw + 6, fs + 4); ctx.fillStyle = '#fff6d8'; ctx.fillText(l.t, X(l.u), Y(l.v)); } }
    // 别的动物
    for (const o of G.pets) { if (o === fp.p || o.held) continue; const qq = o.isleSpot ? { u: o.isleSpot.u, v: o.isleSpot.v } : o.ip; if (!qq || (o.isleLv != null ? o.isleLv : qq.lv) !== lv) continue; ctx.fillStyle = '#ffb0c8'; ctx.beginPath(); ctx.arc(X(qq.u), Y(qq.v), Math.max(2.5, sc * 0.7), 0, 6.3); ctx.fill(); }
    // 自动走的路线
    if (fp.auto) { ctx.strokeStyle = 'rgba(255,233,140,.9)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(fp.q.u), Y(fp.q.v)); for (let i = fp.auto.i; i < fp.auto.pts.length; i++) { const t = fp.auto.pts[i]; if (t.lv === lv) ctx.lineTo(X(t.u), Y(t.v)); } ctx.stroke(); ctx.setLineDash([]); }
    // 我：箭头（朝向 = 镜头的朝向）
    if (fp.q.lv === lv) { const px = X(fp.q.u), py = Y(fp.q.v), r = big ? 9 : 6, c = Math.cos(fp.yaw), s = Math.sin(fp.yaw); ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#2a2030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + c * r * 1.4, py + s * r * 1.4); ctx.lineTo(px - c * r * 0.8 - s * r * 0.9, py - s * r * 0.8 + c * r * 0.9); ctx.lineTo(px - c * r * 0.3, py - s * r * 0.3); ctx.lineTo(px - c * r * 0.8 + s * r * 0.9, py - s * r * 0.8 - c * r * 0.9); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    ctx.restore(); ctx.strokeStyle = 'rgba(255,246,216,.7)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    return { X, Y, sc, cu, cv, x, y, w, h };
  }
  let miniR = null;
  const miniHit = (x, y) => !!(miniR && x >= miniR[0] && x <= miniR[0] + miniR[2] && y >= miniR[1] && y <= miniR[1] + miniR[3]);
  function toggleMap() { if (!fp) return; bigMap = bigMap ? null : { lv: fp.q.lv, z: 1 }; fpMenu = false; if (bigMap) lookFree(); fpBar(); }
  function mapClick(x, y) {
    const m = bigMap; if (!m || !m.r) return;
    for (const t of m.tabs || []) if (x >= t[0] && x <= t[0] + t[2] && y >= t[1] && y <= t[1] + t[3]) { m.lv = t[4]; return; }
    if (m.close && x >= m.close[0] && x <= m.close[0] + m.close[2] && y >= m.close[1] && y <= m.close[1] + m.close[3]) { toggleMap(); return; }
    const r = m.r; if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) { toggleMap(); return; }
    const u = r.cu + (x - r.x - r.w / 2) / r.sc, v = r.cv + (y - r.y - r.h / 2) / r.sc, a = area();
    if (!a.inF(m.lv, u, v)) { PP.ui.toast('那儿没有地面，点有颜色的地方', 1.4); return; }
    const pts = fpPlan(fp.q, u, v, m.lv);
    if (!pts || !pts.length) { PP.ui.toast('那儿走不过去（被东西挡住了），换个地方试试', 1.6); return; }
    fp.auto = { pts, i: 0 }; if (fp.p.action !== 'fp') { fp.p.interrupt(true); fp.p.iw = null; fp.p.isleSpot = null; fp.p.run('fp', A.fpCtl); }
    bigMap = null; fpBar(); PP.ui.toast('自己走过去啦（按方向键可以停下）', 1.6);
  }
  // ---- 每一帧 ----
  function fpFrame(ctx) {
    const now = performance.now(), dt = Math.min(0.05, (now - fp.last) / 1000); fp.last = now;
    fpTick(dt); if (!fp) return;
    const lo = lightOpts(), x0 = L.vx0, y0 = L.vy0, w = L.vw, h = L.vh, c3 = (a) => `rgb(${a.map((v) => Math.round(v * 255)).join(',')})`;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    // 天空
    const sg = ctx.createLinearGradient(0, y0, 0, y0 + h); sg.addColorStop(0, c3(lo.skyTop || [0.48, 0.72, 0.91])); sg.addColorStop(1, c3(lo.skyBot || [0.81, 0.92, 0.98])); ctx.fillStyle = sg; ctx.fillRect(x0, y0, w, h);
    const s = scene(), t = now / 1000, dm = F.dyn({ t, cut: null, cooking, fire: fort().fuel / 100, power: power(), pinkBed: !!(E().room || {}).bed });
    dynMesh = dm.p.length ? Object.assign(g3.upload(dm, dynMesh), { noShadow: true }) : null; lastScenes = [s.gpu, dynMesh]; lastLO = lo;
    const pix = fpQ() === 'pixel'; let cv = g3.draw(lastScenes, fpOpts()); if (cv && pix && pixOn()) cv = outline(cv);
    if (cv) { ctx.imageSmoothingEnabled = !pix; const k = fpK(); ctx.drawImage(cv, x0, y0, cv.width * k, cv.height * k); ctx.imageSmoothingEnabled = false; }
    // 动物：同一个房间（或者都在外面）才看得见，按远近画成立着的纸片；第三人称时也画出主角自己
    const cam = fpCam(), cyw = Math.cos(cam.yaw), syw = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), f = 1 / Math.tan(cam.fov / 2), myRoom = F.roomAt(fp.q.u, fp.q.v, fp.q.lv);
    const vis = [];
    for (const o of G.pets) { if (o.held) continue; const me = o === fp.p; if (me && cam.third < 0.6) continue;
      const q = me ? fp.q : o.isleSpot ? { u: o.isleSpot.u, v: o.isleSpot.v, z: o.isleSpot.z, lv: o.isleLv } : o.ip; if (!q) continue;
      if (!me && !sees(o, cam.eye, q)) continue;
      const mx = (q.u - cam.eye[0]) * 2.83, my = (q.v - cam.eye[1]) * 2.83, mz = ((q.z != null ? q.z : Z[q.lv]) - cam.eye[2]) * 1.155;
      const rx = -mx * syw + my * cyw, fw = mx * cyw + my * syw, u2 = mz * cp - fw * sp, f2 = mz * sp + fw * cp; if (f2 < 1) continue;
      vis.push({ o, me, d: f2, sx: x0 + w / 2 + (rx * f / (w / h)) / f2 * (w / 2), sy: y0 + h / 2 - (u2 * f) / f2 * (h / 2), px: (PH * 1.155 * f / f2) * (h / 2) }); }
    vis.sort((a, b) => b.d - a.d);
    for (const v of vis) { const o = v.o, keep = [o.x, o.y, o.scaleMul, o.isleHide, o.hopY]; o.x = v.sx; o.y = v.sy; o.hopY = 0; o._backView = v.me; /* 第三人称：主角背对着镜头 */ o.scaleMul = U.clamp(v.px / ((PP.SPR.HUMAN && PP.SPR.HUMAN.has(o.d.species) ? 37 : 28) * G.S), 0.15, 10); o.isleHide = false; try { o.render(ctx); } catch (e) {} o._backView = false; [o.x, o.y, o.scaleMul, o.isleHide, o.hopY] = keep; }
    // 准星 + 准星指着的东西
    if (now - fp.aimT > 160) { fp.aimT = now; const hh = hotFromId(fpPick(w / 2, h / 2)); fp.aim = hh && hh.label ? hh.label : null; }
    const cx0 = x0 + w / 2, cy0 = y0 + h / 2, us = Math.max(1, Math.round(Math.min(w, h) / 260));
    ctx.fillStyle = 'rgba(20,16,30,.55)'; ctx.fillRect(cx0 - 7 * us, cy0 - us * 1.5, 14 * us, 3 * us); ctx.fillRect(cx0 - us * 1.5, cy0 - 7 * us, 3 * us, 14 * us); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(cx0 - 6 * us, cy0 - us / 2, 4 * us, us); ctx.fillRect(cx0 + 2 * us, cy0 - us / 2, 4 * us, us); ctx.fillRect(cx0 - us / 2, cy0 - 6 * us, us, 4 * us); ctx.fillRect(cx0 - us / 2, cy0 + 2 * us, us, 4 * us);
    const fs = U.clamp(Math.min(w, h) / 34, 11, 18); ctx.font = PP.FONT(fs); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    let ty = cy0 + 12 * us; const pill = (tx, a = 0.72) => { const tw = ctx.measureText(tx).width; ctx.fillStyle = `rgba(30,24,40,${a})`; ctx.fillRect(cx0 - tw / 2 - 8, ty, tw + 16, fs + 10); ctx.fillStyle = '#fff6d8'; ctx.fillText(tx, cx0, ty + 5); ty += fs + 16; };
    if (fp.aim) pill('[E] ' + fp.aim);
    if (lookPref() && !lookOn() && !fpMenu && !bigMap && lastPT !== 'touch') pill('单击画面：用鼠标转头', 0.55);
    // 刚进来：一行操作提示，6 秒后淡掉（菜单 ☰ 里有完整说明）
    const age = (now - fpHintT) / 1000;
    if (age < 6) { ctx.globalAlpha = Math.min(1, 6 - age); ctx.textBaseline = 'bottom'; const tx = 'WASD 走 · 鼠标看 · 空格跳 · Shift 跑 · E 用 · Tab 地图 · V 第三人称 · 滚轮 视野 · Q 退出', tw = ctx.measureText(tx).width; ctx.fillStyle = 'rgba(30,24,40,.7)'; ctx.fillRect(cx0 - tw / 2 - 10, y0 + h - fs - 22, tw + 20, fs + 12); ctx.fillStyle = '#fff6d8'; ctx.fillText(tx, cx0, y0 + h - 14); ctx.globalAlpha = 1; }
    // 小地图（右上角）+ 在哪儿
    const rm = F.roomAt(fp.q.u, fp.q.v, fp.q.lv), where = `${F.NAME[fp.q.lv]} · ${rm ? rm.nm : '外面'}`;
    if (S().fpMap !== false && !bigMap) { const ms = Math.round(U.clamp(Math.min(w, h) * 0.26, 96, 200)), mx = x0 + w - ms - 8, my = y0 + 8; drawMap(ctx, mx, my, ms, ms, fp.q.lv, false); miniR = [mx, my, ms, ms]; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = PP.FONT(fs * 0.8); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(where, x0 + w - 10, my + ms + 4); }
    else if (!bigMap) { miniR = null; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = PP.FONT(fs * 0.85); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(where, x0 + w - 10, y0 + 10); }
    // 大地图
    if (bigMap) { miniR = null; const m = bigMap, lft = 54 * U.clamp(Math.min(w, h) / 560, 0.75, 1.4), bw = Math.min(w - lft - 10, h * 1.15), bh = Math.min(h - 70, w * 0.85), bx = x0 + lft + (w - lft - 10 - bw) / 2, by = y0 + 46;
      m.r = drawMap(ctx, bx, by, bw, bh, m.lv, true); m.tabs = []; ctx.font = PP.FONT(fs * 0.9); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      let tx = bx; for (let L2 = Z.length - 1; L2 >= 0; L2--) { const t2 = F.NAME[L2] + (L2 === fp.q.lv ? '（我在这）' : ''), tw = ctx.measureText(t2).width + 18; ctx.fillStyle = L2 === m.lv ? '#ffd84a' : 'rgba(255,250,236,.92)'; ctx.fillRect(tx, by - 34, tw, 28); ctx.strokeStyle = '#2a2030'; ctx.strokeRect(tx + 0.5, by - 33.5, tw - 1, 27); ctx.fillStyle = '#2a2030'; ctx.fillText(t2, tx + tw / 2, by - 20); m.tabs.push([tx, by - 34, tw, 28, L2]); tx += tw + 4; }
      const cw = 30; m.close = [bx + bw - cw, by - 34, cw, 28]; ctx.fillStyle = '#ffd84a'; ctx.fillRect(...m.close); ctx.fillStyle = '#2a2030'; ctx.fillText('✕', bx + bw - cw / 2, by - 20);
      ctx.textBaseline = 'bottom'; ctx.fillStyle = '#fff6d8'; ctx.font = PP.FONT(fs * 0.85); ctx.fillText('点地图上的地方，主角自己走过去 · 滚轮放大 · Tab 关', bx + bw / 2, by + bh - 6); }
    ctx.restore();
    fpBar();
  }
  // ---------- 遮挡、前景 ----------
  let occCv = null;
  function occlude(ctx) {
    if (!glOK || !lastScenes || !g3.ok()) return;
    const cuts = petCuts(); if (!cuts.length) return;
    const vo = viewOpts(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of cuts) { x0 = Math.min(x0, q[0] - q[2] * 0.7); x1 = Math.max(x1, q[0] + q[2] * 0.7); y0 = Math.min(y0, q[1] - q[2] * 1.25); y1 = Math.max(y1, q[1] + q[2] * 0.2); }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(vo.w, Math.ceil(x1)); y1 = Math.min(vo.h, Math.ceil(y1)); if (x1 <= x0 || y1 <= y0) return;
    const cv = g3.draw(lastScenes, Object.assign({}, vo, { pets: cuts, occ: true, cutPass: true, rips: [], scissor: [x0, y0, x1 - x0, y1 - y0] })); if (!cv) return;
    const q = pixK(), d = DPR(); ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, x0, y0, x1 - x0, y1 - y0, Math.round(L.vx0 * d) / d + x0 * q, Math.round(L.vy0 * d) / d + y0 * q, (x1 - x0) * q, (y1 - y0) * q); ctx.restore();
  }
  function renderFront(ctx) {
    if (fp) return;
    if (!G.isle || !L) return;
    try { occlude(ctx); } catch (e) { PP.oops && PP.oops(e, 'isle.occ'); }
    try { fOverlay(ctx); } catch (e) { PP.oops && PP.oops(e, 'isle.furn'); }
    const u = L.u, now = performance.now();
    ctx.save();
    for (const p of G.pets) { if (p.isleHide) continue; if (p.fishing) drawFishing(ctx, p, now); if (p.tool) drawTool(ctx, p, now); if (p.inBed) { if (p.action !== 'isleUse') p.inBed = null; else quilt(ctx, p); } }
    const fx = wfx(); if (cut == null && (fx.rain || fx.snow || flash > 0)) weatherTick(ctx, { x: L.vx0, y: L.vy0, w: L.vw, h: L.vh });
    if ((cut == null || cut >= 1) && !focus && PP.econ.unread()) { const x = scrU(MAILB.u, MAILB.v), y = scrV(MAILB.u, MAILB.v, 11 + Math.sin(now / 400) * 0.8); ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#3a2630'; ctx.lineWidth = u * 0.4; ctx.beginPath(); ctx.rect(x - 2.6 * u, y - 2 * u, 5.2 * u, 4 * u); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#e8705a'; ctx.beginPath(); ctx.moveTo(x - 2.6 * u, y - 2 * u); ctx.lineTo(x, y + 0.3 * u); ctx.lineTo(x + 2.6 * u, y - 2 * u); ctx.stroke(); }
    ctx.restore();
    if (hover && hover.k !== 'ground' && hover.k !== 'hull' && !G.hoverPet && !press) { const t = hoverText(hover); if (t) PP.drawPixelLabel(ctx, t, Math.round(hover.lx), Math.round(Math.max(10, hover.ly)), { size: 12 }); }
    if (cbar) cBar();
  }
  const fmtLeft = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} 小时 ${m % 60} 分` : `${m} 分钟`; };
  function hoverText(h) {
    if (h.label) return h.label;
    if (h.k === 'plot') { const inf = PP.econ.plotInfo(h.i); if (!inf) return '空种植箱：点一下选种子'; const n = PP.econ.ITEMS[PP.econ.CROPS[inf.crop].item].name; return inf.stage === 3 ? `${n}熟了：点一下收（秸秆会拿去当柴）` : `${n}：还有 ${fmtLeft(inf.left)}${(E().farm[h.i].water || 0) < 3 ? '（点一下浇水）' : ''}`; }
    return '';
  }

  // ---------- 鼠标手型 ----------
  const HAND = ['....kk......', '...kwwk.....', '...kwwk.....', '...kwwk.....', '...kwwkkk...', '...kwwkwwkk.', '.kkkwwkwwkwk', 'kwwkwwwwwwwk', 'kwwwwwwwwwwk', '.kwwwwwwwwwk', '..kwwwwwwwk.', '..kwwwwwwwk.', '...kkkkkkk..'];
  const OPENH = ['...k.k.k....', '..kwkwkwk.k.', '..kwkwkwkkwk', '..kwkwkwkwwk', 'k.kwwwwwwwwk', 'kwkwwwwwwwwk', 'kwwwwwwwwwwk', '.kwwwwwwwwwk', '.kwwwwwwwwk.', '..kwwwwwwwk.', '..kwwwwwwwk.', '...kkkkkkk..'];
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
    px(kind === 'grab' ? OPENH : HAND, 0, 0, 2);
    const b = BADGE[kind]; if (b) { x.fillStyle = '#fff6e0'; x.strokeStyle = '#231c20'; x.lineWidth = 1.5; x.beginPath(); x.arc(23, 23, 8.2, 0, 6.3); x.fill(); x.stroke(); px(b, 16, 16, 2); }
    return (curCache[kind] = `url(${c.toDataURL()}) ${kind === 'grab' ? '12 12' : '9 1'}, pointer`);
  }

  // ---------- 能互动的东西 ----------
  // 固定陈设（fort.js 的 FIX）+ 你摆的家具（每件一个），宠物站在 at 用它
  const USE_LABEL = { sit: '坐一会儿（回体力）', rock: '摇一摇，打个盹', lamp: '摸一摸', climb: '爬上去看看', play: '玩毛线', warm: '窝一会儿', rug: '在上面打滚', sleep: '睡一觉（回体力）', write: '写日记', rummage: '翻一翻（说不定有小鱼干）', sniff: '闻一闻', table: '坐一坐，喝口热可可', book: '看书', piano: '弹一曲（心情变好）', nap: '窝进去打个盹', music: '放一张唱片，跳个舞', look: '看一看' };
  let propKey = '', propList = null;
  function props() {
    const L0 = FURN.layout(E()), k = JSON.stringify(L0) + dirtyK; if (k === propKey && propList) return propList;
    propKey = k;
    const fix = F.FIX.map((f) => { const o = { id: f.id, at: [f.at[0], f.at[1], f.lv], do: f.do, label: f.label, cur: f.cur, room: f.room, i: f.i }; if (f.spot) o.spot = { u: f.spot.u, v: f.spot.v, z: Z[f.lv] + f.spot.dz }; return o; });
    const fur = L0.map((it, i) => { const d = FURN.D[it.f], lv = F.roomLv(it.room || 'living'), R0 = rbox(it.room || 'living'), f0 = FURN.front(it), fr = d.walk ? [U.clamp(it.u, R0[0] + 1.2, R0[2] - 1.2), U.clamp(it.v, R0[1] + 1.2, R0[3] - 1.2)] : [U.clamp(f0[0], R0[0] + 1, R0[2] - 1), U.clamp(f0[1], R0[1] + 1, R0[3] - 1)], st = FURN.seat(it), ffr = F.frameOf(it.room || 'living'), fw = F.toW(ffr, fr[0], fr[1]), sw = st ? F.toW(ffr, st.u, st.v) : null; return { id: FURN.PICK0 + i, f: it.f, it, room: it.room || 'living', at: [fw[0], fw[1], lv], spot: st ? { u: sw[0], v: sw[1], z: Z[lv] + st.z } : undefined, do: d.use, label: d.name + '：' + (USE_LABEL[d.use] || '看一看'), cur: ['sit', 'rock', 'warm', 'sleep', 'nap', 'rug'].includes(d.use) ? 'rest' : 'use' }; });
    return (propList = fix.concat(fur));
  }
  // 花房的花盆、阀门：标签跟着花盆里的情况变
  function propLabel(pr) {
    const L0 = PP.LIFE, TN = L0 ? L0.TEMPN : {};
    if (pr.do === 'pot') { const f = L0 && L0.potInfo(pr.i); return f ? `${f.name}：${['种子', '发芽了', '开花了', '可以收获了'][f.stage]}${f.wet ? '' : ' · 该浇水了'}${f.stage === 2 && !f.pol ? ' · 等授粉' : ''}${f.tempOk ? '' : ' · 想要' + TN[f.temp]}（点开花房面板）` : `花盆 ${pr.i + 1}：空着，种一颗稀有种子`; }
    if (pr.do === 'valve') { const e = E(), t = e && e.gh ? e.gh.temp : 'mild'; return `暖气阀门：现在是「${TN[t] || '温和'}」${fort().fuel < 10 ? '（锅炉没柴了，暖气不热）' : ''}（点开调）`; }
    if (pr.do === 'stoke') return `锅炉：柴还剩 ${Math.round(fort().fuel)}%（点一下去柴房抱柴来添）`;
    if (pr.do === 'nest') return eggOut() ? '鸟巢：里面有一个蛋！' : '鸟巢：今天的蛋已经捡过了';
    return pr.label;
  }
  // 门：外部视角点门 → 剖切进那一层
  const doorFor = (u, v, lv) => F.ENTRIES.find((d) => d.lv === lv && u > d.r[0] - 0.8 && u < d.r[2] + 0.8 && v > d.r[1] - 0.8 && v < d.r[3] + 0.8);
  const doorName = (d) => (d.room ? d.room.nm : '屋里');
  let pickC = { x: -1, y: -1, t: 0, id: 0 };
  function pickAt(x, y) {
    const now = performance.now(); if (pickC.x === x && pickC.y === y && now - pickC.t < 120) return pickC.id;
    let id = 0; try { id = glOK && lastScenes ? g3.draw(lastScenes, Object.assign(viewOpts(), { pickAt: [(x - L.vx0) / pixK(), (y - L.vy0) / pixK()], pets: petCuts() })) : 0; } catch (e) { id = 0; }
    pickC = { x, y, t: now, id }; return id;
  }
  function groundAt(x, y) { // 鼠标底下是哪块能走的地（先看高的）
    const a = area(), order = a.z.map((z, i) => i).filter((lv) => seenLv(lv)).sort((m, n) => n - m);
    for (const lv of order) { const [gu, gv] = toUV(x, y, a.z[lv]); if (!free(a, gu, gv, lv)) continue; if (cut == null && F.roomAt(gu, gv, lv)) continue; return { k: 'ground', u: gu, v: gv, z: a.z[lv], lv }; }
    return null;
  }
  const FIXK = { [PK.mail]: { k: 'mail', label: '信箱：看信', cur: 'mail' }, [PK.tap]: { k: 'tap', label: '水龙头：打水喝（解渴）', cur: 'water' }, [PK.balloon]: { k: 'balloon', label: '热气球：出门探险', cur: 'trip' }, [PK.fish]: { k: 'fish', label: '蓄水池：钓鱼（钓到的鱼会记进图鉴）', cur: 'fish' }, [PK.hive]: { k: 'hive', label: '蜂箱：收蜂蜜', cur: 'use' } };
  function hot(x, y) {
    hover = null;
    if (fp) { if (L && x >= L.vx0 && x <= L.vx1 && y >= L.vy0 && y <= L.vy1) return (hover = { k: 'fp', isle: true, cur: 'crosshair' }); return null; }
    if (!G.isle || !L || G.editing || !want()) return null;
    if (x < L.x0 || x > L.x1 || y < L.y0 || y > L.y1) return null;
    if (fedit && cut != null) {
      if (fdrag) { hover = { k: 'furn', i: fdrag.i, cur: 'grabbing', isle: true }; return hover; }
      const id = pickAt(x, y), i = id - FURN.PICK0, it = FURN.layout(E())[i];
      hover = it && F.roomLv(it.room || 'living') === cut ? { k: 'furn', i, label: FURN.D[it.f].name + '：按住拖动', cur: 'grab', isle: true, lx: x, ly: y - 12 * Math.min(2.5, L.u) } : { k: 'hull', cur: 'default', isle: true };
      return hover;
    }
    let h = null; const p = mainP();
    if (p && p.fishing && p.fishing.ph === 'bite' && Math.hypot(x - scrU(BOB.u, BOB.v), y - scrV(BOB.u, BOB.v, POOL.z)) < 16 * L.u) h = { k: 'fish', label: '快点！收竿', cur: 'fish' };
    if (!h) {
      const id = pickAt(x, y);
      if (id < 0) return null;
      if (FIXK[id]) h = Object.assign({}, FIXK[id]);
      else if (id >= PK.plot && id < PK.plot + 6) { const i = id - PK.plot, inf = PP.econ.plotInfo(i); h = { k: 'plot', i, cur: !inf ? 'sow' : inf.stage === 3 ? 'harvest' : 'water' }; }
      else if (id >= PK.deco && id < PK.deco + 6) { const i = id - PK.deco, d = (E().isleDeco || [])[i]; if (['bench', 'swing', 'hay'].includes(d)) h = { k: 'deco', i, id: d, label: { bench: '长椅：坐一会儿', swing: '秋千：荡一荡', hay: '干草垛：趴一会儿' }[d], cur: 'rest' }; }
      else { const pr = props().find((q) => q.id === id); if (pr && seenLv(pr.at[2]) && (cut != null || pr.room === 'garden')) h = { k: 'prop', pr, label: propLabel(pr), cur: pr.cur }; }
      if (!h && cut == null) { // 外部视角：指到门 → 进去
        for (const lv of [3, 2, 1]) { for (const dz of [5, 3, 7]) { const [gu, gv] = toUV(x, y, Z[lv] + dz), d = doorFor(gu, gv, lv); if (d) { h = { k: 'door', d, label: `进${doorName(d)}（${F.NAME[lv]}）`, cur: 'enter' }; break; } } if (h) break; }
      }
      if (!h) h = groundAt(x, y) || { k: 'hull' };
    }
    h.isle = true; h.lx = x; h.ly = y - 12 * Math.min(2.5, L.u);
    h.cur = h.k === 'ground' || h.k === 'hull' ? 'default' : cursor(h.cur || 'use');
    hover = h; return h;
  }
  function mainP() { const p = PP.F.main(); return p && G.pets.includes(p) && !p.held ? p : null; }
  function down(h, x, y) {
    if (fp) { fpDown(x, y); return; }
    if (fedit && cut != null) { if (h && h.k === 'furn') { fStart(h.i, x, y); const it = FURN.layout(E())[h.i]; if (it) froom = it.room || 'living'; } else { fsel = -1; fBar(); } return; }
    press = { h, x, y, moved: false, ox: L.x1, oy: L.y1 };
    G.uiDrag = true; PP.refreshInteractive();
    const mv = (ev) => {
      if (!press) return;
      if (!press.moved && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > 6) press.moved = true;
      if (press.moved) { const dx = L.x0, dy = L.y0; S().islePos = { x: (press.ox + ev.clientX - press.x) / G.W, y: (press.oy + ev.clientY - press.y) / safeB() }; layout(); G.ground = groundY(); for (const p of G.pets) if (!p.held) { p.x += L.x0 - dx; p.y += L.y0 - dy; } PP.placeOrb && PP.placeOrb(); cBar(); document.body.style.cursor = 'grabbing'; }
    };
    const up = (ev) => {
      window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up);
      const pr = press; press = null; G.uiDrag = false;
      if (pr && pr.moved) { layout(); S().islePos = { x: L.x1 / G.W, y: L.y1 / safeB() }; PP.save.soon(); } else if (pr) click(pr.h, ev.clientX, ev.clientY);
      document.body.style.cursor = 'default'; PP.refreshInteractive();
    };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }
  // 房间中心附近一个能站的点
  // 房间里随便一个空位（几只一起去同一个房间时不会叠在一起）
  const roomSpot = (rid) => { const r = RM[rid];
    for (let k = 0; k < 12; k++) { let m; if (r.c) { const a = Math.random() * 6.283, d = Math.random() * (r.c[2] - 1.6); m = [r.c[0] + Math.cos(a) * d, r.c[1] + Math.sin(a) * d]; } else { const lu = r.r[0] + 1.2 + Math.random() * (r.r[2] - r.r[0] - 2.4), lv2 = r.r[1] + 1.2 + Math.random() * (r.r[3] - r.r[1] - 2.4); m = r.rot ? F.toW(r, lu, lv2) : [lu, lv2]; }
      if (free(area(), m[0], m[1], r.lv) && !G.pets.some((q) => q.ip && q.ip.lv === r.lv && Math.hypot(q.ip.u - m[0], q.ip.v - m[1]) < 2.2)) return { u: m[0], v: m[1], lv: r.lv }; }
    const m = r.c ? [r.c[0], r.c[1] + 1] : r.rot ? F.toW(r, (r.r[0] + r.r[2]) / 2, (r.r[1] + r.r[3]) / 2) : [(r.r[0] + r.r[2]) / 2, (r.r[1] + r.r[3]) / 2 + 1]; const c = nearFree(area(), m[0], m[1], r.lv); return { u: c[0], v: c[1], lv: r.lv }; };
  function click(h, x, y) {
    if (!h) return;
    const p = mainP(), go = (name, fn, ...args) => { if (p) { p.interrupt(true); p.inDoor = false; p.fishing = null; p.tool = null; p.run(name, fn, ...args); } };
    if (h.k === 'ground') { mark = { u: h.u, v: h.v, z: h.z, t: performance.now() }; go('isleGo', A.isleGo, h.u, h.v, h.lv); return; }
    if (h.k === 'hull') return;
    if (h.k === 'door' && !h.d) { setFocus('living', true); if (p) go('isleHouse', A.isleHouse, 'house'); return; } // 菜单里的“进屋”：去起居室
    if (h.k === 'door') { const d = h.d, r = d.room, c = r.c ? [r.c[0] + (d.inP[0] - r.c[0]) * 0.6, r.c[1] + (d.inP[1] - r.c[1]) * 0.6] : [d.inP[0] + (d.inP[0] - d.outP[0]) * 0.8, d.inP[1] + (d.inP[1] - d.outP[1]) * 0.8]; setCut(d.lv); go('isleGo', A.isleGo, c[0], c[1], d.lv); return; }
    if (h.k === 'exit') { setCut(null); return; } // 兼容：菜单里的“出门”
    if (h.k === 'prop') { const pk = { cookp: 'cook', dex: 'plant', craft: 'craft', store: 'bag', pot: 'gh', valve: 'gh' }[h.pr.do]; if (pk) PP.econ.openPanel(pk); if (cut == null && h.pr.at[2] !== 1) setCut(h.pr.at[2], true); go('isleUse', A.isleUse, h.pr); return; }
    if (h.k === 'deco') { go('isleSit', A.isleSit, { id: h.id, i: h.i, u: SLOTS[h.i][0], v: SLOTS[h.i][1] }); return; }
    if (h.k === 'mail') { go('isleMail', A.isleMail); PP.econ.openPanel('mail'); return; }
    if (h.k === 'fish') { if (p && p.fishing) { if (p.fishing.ph === 'bite') p.fishing.helped = true; return; } go('isleFish', A.isleFish); return; }
    if (h.k === 'balloon') { PP.econ.openPanel('trip'); return; }
    if (h.k === 'hive') { go('isleHive', A.isleHive); return; }
    if (h.k === 'tap') { go('isleDrink', A.isleDrink); return; }
    if (h.k === 'door0' || h.k === 'home') { setFocus('living', true); if (p) go('isleGo', A.isleGo, ...Object.values(roomSpot('living'))); return; } // 菜单里的“进屋”：去起居室
    if (h.k === 'plot') {
      const inf = PP.econ.plotInfo(h.i);
      if (inf && inf.stage === 3) { if (p) go('isleHarvest', A.isleHarvest, h.i); else { PP.econ.harvest(h.i); fort().fuel = Math.min(100, fort().fuel + 4); } return; }
      if (inf) { if (p && (E().farm[h.i].water || 0) < 3) go('isleWater', A.isleWater, h.i); else PP.ui.toast(hoverText(h)); return; }
      seedPicker(h.i, x, y);
    }
  }
  const cropCache = {}, CROP_COL = { carrot: '#f08a3a', berry: '#e8405a', corn: '#ffd36a', sunflower: '#f6c43a', pumpkin: '#f2832a', tomato: '#e0402a', cabbage: '#9ad070', melon: '#3f8a44', tulip: '#f2a6c2' };
  function cropSpr(crop) {
    if (PP.LIFE && PP.LIFE.PL[crop]) return PP.LIFE.art(crop, 3);
    if (cropCache[crop]) return cropCache[crop];
    const a = PP.ART, s = a.spr(13, 13), C = CROP_COL[crop] || '#f08a3a';
    s.ell(6.5, 9, 5, 3.4, (nx, ny) => (ny < -0.3 ? '#86cc6a' : '#5aa64e')); s.vl(6, 2, 6, '#3f8a44');
    if (crop === 'corn') { s.rect(5, 1, 3, 8, C); s.vl(5, 1, 8, '#fff0a0'); } else if (crop === 'sunflower') { s.ell(6.5, 3.5, 3.6, 3.2, (nx, ny) => (nx * nx + ny * ny < 0.25 ? '#7a4a2a' : C)); } else if (crop === 'tulip') { s.rect(5, 1, 3, 3, C); s.rect(2, 3, 2, 3, '#ffd36a'); s.rect(9, 3, 2, 3, '#e8705a'); }
    else if (crop === 'carrot') { s.rect(3, 9, 3, 3, C); s.rect(8, 9, 3, 3, C); } else s.ell(6.5, 8.5, crop === 'berry' || crop === 'tomato' ? 2.6 : 4.6, crop === 'berry' || crop === 'tomato' ? 2.6 : 3.4, (nx, ny) => (ny < -0.4 ? PP.ART.mix(C, '#ffffff', 0.35) : C));
    return (cropCache[crop] = s.outline('#2a3a22').canvas());
  }
  PP.cropSpr = cropSpr;
  function seedPicker(i, x, y) {
    const e = E(), I = PP.econ.ITEMS, seeds = Object.keys(I).filter((k) => I[k].kind === 'seed').map((k) => [k, (e.bag[k] ? 2 : 0) + (PP.cropSpeed && PP.cropSpeed(I[k].crop) < 1 ? 1 : 0)]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
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
  // 兼容老接口：setInside('house') = 进起居室；false = 回到外面
  function setInside(v) {  if (v === 'house' || v === true) setFocus('living', true); else if (v === 'gh') setCut(1); else if (typeof v === 'number') setCut(v); else setCut(null); }

  // ---------- 主角在城堡里过日子 ----------
  const day = () => { const e = E(); const d = today(); if (!e.isleDay || e.isleDay.d !== d) e.isleDay = { d, fish: 0, cook: 0 }; return e.isleDay; };
  const say = (p, t, d = 2.6) => { p._forceSay = true; p.say(Array.isArray(t) ? U.pick(t) : t, d); p._forceSay = false; };
  const bubble = (u, v, z) => PP.fx({ kind: 'dot', x: scrU(u, v), y: scrV(u, v, z), vx: U.rand(-8, 8), vy: U.rand(-30, -16), life: 1.4, col: U.pick(['#ffffff', '#cfeaf8', '#e8f6ff']), size: Math.max(2, L.u * 0.8) });
  const face = (p, u, v) => { const [a, b] = uvOf(p), r1 = rotUV(a, b), r2 = rotUV(u, v), d = ((r2[0] - r1[0]) - (r2[1] - r1[1])) * (mir() ? -1 : 1); if (Math.abs(d) > 0.05) p.facing = d > 0 ? 1 : -1; };
  const gain = (p, txt) => PP.fx({ kind: 'text', text: txt, x: p.x, y: p.y - 30 * G.S, vy: -28, life: 1.5, style: { size: 11, bg: '#bff0c0' } });
  const fxAt = (u, v, z, o) => PP.fx(Object.assign({ x: scrU(u, v), y: scrV(u, v, z), s: 1 }, o));
  function* walkTo(p, u, v, run, lv = 1) { if (walkPlan(p, u, v, lv, run)) yield () => !p.iw; const q = p.ip; return !!q && (q.lv || 0) === lv && Math.hypot(q.u - u, q.v - v) < 2.2; }
  const stuck = (p) => { p.tool = null; p.fishing = null; say(p, U.pick(['过不去……', '那边走不过去', '咦，路被挡住了']), 2); p.anim = 'idle'; };
  function* hop(p, to, T = 0.34) {
    const [u0, v0] = uvOf(p), z0 = p.isleSpot ? p.isleSpot.z : ipOf(p).z, hh = 2.2 + Math.abs(to.z - z0) * 0.25; face(p, to.u, to.v);
    p.anim = 'idle'; p.jolt(0, 2); yield 0.1;
    for (let t = 0; t < T; t += 1 / 60) { const k = t / T; p.isleSpot = { u: u0 + (to.u - u0) * k, v: v0 + (to.v - v0) * k, z: z0 + (to.z - z0) * k + Math.sin(k * Math.PI) * hh }; p.x = scrU(p.isleSpot.u, p.isleSpot.v); p.anim = k < 0.5 ? 'jump' : 'fall'; yield 1 / 60; }
    p.isleSpot = { u: to.u, v: to.v, z: to.z }; p.x = scrU(to.u, to.v); p.anim = 'land'; p.jolt(0, 2.4); yield 0.12; p.anim = 'idle';
  }
  function* hopOff(p, at) { const lv = at[2] != null ? at[2] : 1; yield* hop(p, { u: at[0], v: at[1], z: Z[lv] }); p.isleSpot = null; setIp(p, at[0], at[1], lv); }
  A.isleGo = function* (u, v, lv) { const p = this; yield* walkTo(p, u, v, null, lv == null ? 1 : lv); p.anim = 'idle'; p.look = [0, 1]; if (Math.random() < 0.3) p.think(U.pick(['heart', 'note', 'sparkle']), 1.2); yield U.rand(2, 4); };
  A.isleOut = function* () { const p = this; p.anim = 'idle'; p.eyes = 'happy'; p.jolt(0, -3); yield 0.4; yield* walkTo(p, HALL_OUT.u + U.rand(-2, 3), HALL_OUT.v + U.rand(1, 4)); p.eyes = 'open'; };
  const plotStand = (i) => F.plotStand(i);
  const plotC = (i) => F.plotC(i);
  A.isleWater = function* (i) {
    const p = this, [su, sv] = plotStand(i), [cu, cv, cz] = plotC(i);
    p.tool = { k: 'can', t0: performance.now() }; if (!(yield* walkTo(p, su, sv))) { stuck(p); return; } face(p, cu, cv - 2); p.anim = 'idle'; p.eyes = 'happy'; yield 0.2;
    p.tool = { k: 'can', t0: performance.now(), pour: true };
    for (let k = 0; k < 14; k++) { fxAt(cu + U.rand(-1.2, 1.2), cv + U.rand(-1.2, 1.2), cz + 4.5, { vy: 46, icon: 'drop', life: 0.45 }); if (k % 4 === 0) p.jolt(0, 1); yield 0.11; }
    if (PP.econ.waterPlot(i)) p.think('heart', 1); p.tool = null; p.jolt(0, -2); yield 0.5;
  };
  A.isleSow = function* (i, seed) {
    const p = this, [su, sv] = plotStand(i), [cu, cv, cz] = plotC(i);
    if (!(yield* walkTo(p, su, sv))) { stuck(p); return; } face(p, cu, cv - 2); p.anim = 'eat';
    for (let k = 0; k < 4; k++) { p.jolt(k % 2 ? 1.5 : -1.5, 1); fxAt(cu + U.rand(-1, 1), cv + 0.6, cz + 1, { vx: U.rand(-30, 30), vy: -50, icon: 'leaf', life: 0.4 }); yield 0.22; }
    if (PP.econ.plant(i, seed)) { for (let k = 0; k < 5; k++) fxAt(cu + U.rand(-1, 1), cv + U.rand(-1, 1), cz + 3, { vy: 30, icon: 'sparkle', life: 0.5 }); PP.ui.toast(`种下了${PP.econ.ITEMS[seed].name.replace('种子', '').replace('球茎', '')}`); }
    p.anim = 'idle'; p.jolt(0, 2); yield 0.3; p.jolt(0, 2); yield 0.3;
    yield* A.isleWater.call(p, i);
  };
  A.isleHarvest = function* (i) {
    const p = this, [su, sv] = plotStand(i), [cu, cv, cz] = plotC(i), inf = PP.econ.plotInfo(i), col = inf && CROP_COL[inf.crop];
    p.tool = { k: 'basket', t0: performance.now(), col }; if (!(yield* walkTo(p, su, sv))) { stuck(p); return; } face(p, cu, cv - 2);
    for (let k = 0; k < 3; k++) { p.anim = 'eat'; p.jolt(k % 2 ? 2 : -2, 1.5); yield 0.28; p.anim = 'idle'; p.jolt(0, -2.5); fxAt(cu + (k - 1), cv, cz + 3, { vy: -70, vx: (p.x - scrU(cu, cv)) * 1.5, icon: 'sparkle', life: 0.5 }); yield 0.22; }
    PP.econ.harvest(i); fort().fuel = Math.min(100, fort().fuel + 4); p.tool.full = true; p.anim = 'jump'; p.jolt(0, -4); p.eyes = 'happy'; p.think('heart', 1.4); yield 0.5; p.anim = 'idle'; yield 0.9; p.tool = null;
  };
  A.isleMail = function* () { const p = this; if (!(yield* walkTo(p, ...F.mailStand()))) { stuck(p); return; } face(p, MAILB.u, MAILB.v); p.anim = 'jump'; p.jolt(0, -3); yield 0.35; p.anim = 'idle'; p.think('excl', 1.5); yield 1; if (PP.econ.unread()) say(p, '信箱里有信哦～', 3); yield 1.5; };
  A.isleDrink = function* () { const p = this; if (!(yield* walkTo(p, ...F.tapStand()))) { stuck(p); return; } face(p, TAP.u, TAP.v); p.anim = 'idle'; p.jolt(0, -2); yield 0.3; p.anim = 'eat'; for (let k = 0; k < 6; k++) { fxAt(TAP.u, TAP.v - 0.9, 3, { vy: 30, icon: 'drop', life: 0.3 }); yield 0.3; } p.n.thirst = 100; gain(p, '不渴了'); p.anim = 'idle'; p.eyes = 'happy'; p.think('heart', 1); yield 1; p.eyes = 'open'; };
  A.isleFish = function* () {
    const p = this;
    if (!(yield* walkTo(p, FISH.u, FISH.v, null, FISH.lv))) { stuck(p); return; } face(p, BOB.u, BOB.v); p.anim = 'sit';
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
  function* cookJiggle(p) { p.anim = 'idle'; cooking = true; p.think(U.pick(['cake', 'bowl', 'bread']), 3); for (let k = 0; k < 9; k++) { p.jolt(k % 2 ? 1.5 : -1.5, k % 3 ? 0 : -1); yield 0.42; } cooking = false; }
  // 在菜谱里点「做」：主角跑到厨房灶台前做菜
  function cookAnim(p, name) {
    if (!G.isle || !p || !G.pets.includes(p) || p.held) return;
    const pr = Object.assign({}, props().find((q) => q.do === 'cookp'), { user: true });
    p.interrupt(true); p.fishing = null; p.tool = null;
    p.run('isleCookDish', function* () { if (!(yield* walkTo(p, pr.at[0], pr.at[1], null, pr.at[2]))) { stuck(p); return; } face(p, pr.at[0], 0); yield* cookJiggle(p); say(p, `「${name}」做好啦！`, 2.5); p.eyes = 'happy'; yield 1.2; p.eyes = 'open'; });
  }
  A.isleHive = function* () {
    const p = this, d = day(), [hu, hv] = HIVES[0], hs = F.hiveStand(); if (!(yield* walkTo(p, hs[0], hs[1], null, 2))) { stuck(p); return; } face(p, hu, hv);
    beeBoost = performance.now(); p.eyes = 'wide'; yield 0.6;
    for (let k = 0; k < 4; k++) { p.jolt(k % 2 ? 2 : -2, 0); yield 0.3; }
    if (!d.honey) { d.honey = 1; PP.econ.give('honeyjar', 1); p.anim = 'jump'; p.jolt(0, -4); say(p, ['一罐金黄的蜂蜜！', '好香好甜'], 2.2); if (PP.quest) PP.quest.on('honey'); yield 0.5; p.anim = 'idle'; }
    else { say(p, ['蜜蜂还在酿，明天再来', '嗡嗡嗡……先不打扰它们'], 2.2); }
    p.eyes = 'happy'; yield 1; p.eyes = 'open';
  };
  A.isleBedSleep = function* (pr) {
    const p = this;
    p.eyes = 'sleepy'; say(p, ['困了……', '要睡觉觉了', '呼——好困'], 1.6); p.anim = 'idle'; yield 1;
    if (pr.spot) yield* hop(p, pr.spot);
    p.facing = -p.facing; yield 0.3; p.facing = -p.facing; yield 0.3;
    p.anim = 'lie'; yield 0.6; p.anim = 'sleep'; p.eyes = 'closed'; p.sleeping = true; p.inBed = { t0: performance.now() };
    let t = 0, zz = 0; const dur = U.rand(18, 34);
    while ((t < dur && p.n.energy < 100) || (PP.sleepTime && PP.sleepTime())) { yield 0.5; t += 0.5; zz += 0.5; p.n.energy = Math.min(100, p.n.energy + 2.5); if (zz >= 2) { zz = 0; PP.fx({ x: p.x + p.facing * 6 * G.S, y: p.y - 14 * G.S, vx: 10, vy: -16, icon: 'zzz', life: 2.2, s: Math.max(1, G.S - 1) }); } }
    p.inBed = null; p.sleeping = false; p.anim = 'lie'; p.eyes = 'sleepy'; yield 0.8;
    p.anim = 'idle'; p.eyes = 'open'; p.jolt(0, -2); yield 0.3; p.jolt(0, -3);
    // 醒来说什么看现在真实的钟点：早上才说早上好，夜里只是打了个盹
    { const hr = new Date().getHours(); say(p, hr >= 5 && hr < 10 ? ['早上好～', '睡饱啦！天亮了'] : night() || hr >= 22 || hr < 5 ? ['打了个盹……天还黑着呢', '小睡了一会儿，精神多了'] : ['午觉睡得真香', '小睡了一会儿，精神满满'], 2); } p.eyes = 'happy';
    gain(p, '体力满了'); yield 1; p.eyes = 'open';
  };
  const propUse = (uses) => U.pick(props().filter((q) => uses.includes(q.do))) || null;
  A.isleBed = function* () { const pr = propUse(['sleep']) || propUse(['nap', 'warm']); if (pr) yield* A.isleUse.call(this, pr); };
  A.isleChair = function* () { const pr = propUse(['sit', 'rock']); if (pr) yield* A.isleUse.call(this, pr); };
  A.isleGarden = function* () { const pr = propUse(['tend']); if (pr) yield* A.isleUse.call(this, pr); };
  A.isleSit = function* (sl) {
    const p = this, lv = 1, z = 0, at = [sl.u + 0.4, sl.v + 2, lv];
    if (!(yield* walkTo(p, at[0], at[1], null, lv))) { stuck(p); return; }
    if (sl.id === 'hay') { yield* hop(p, { u: sl.u, v: sl.v, z: z + 3.2 }); p.anim = 'lie'; p.eyes = 'sleepy'; yield U.rand(5, 10); p.n.energy = Math.min(100, p.n.energy + 12); gain(p, '+体力'); p.eyes = 'open'; yield* hopOff(p, at); }
    else if (sl.id === 'swing') { p.n.fun = Math.min(100, p.n.fun + 4); yield* hop(p, { u: sl.u, v: sl.v + 0.1, z: z + 3.4 }); p.anim = 'sit'; const x0 = p.x; for (let t = 0; t < 8; t += 1 / 30) { p.x = x0 + Math.sin(t * 2.4) * 2.4 * L.u; p.isleSpot.z = z + 3.4 + (1 - Math.cos(t * 4.8)) * 0.5; p.facing = Math.cos(t * 2.4) > 0 ? 1 : -1; yield 1 / 30; } p.x = x0; p.n.fun = Math.min(100, p.n.fun + 12); gain(p, '+心情'); yield* hopOff(p, at); }
    else { yield* hop(p, { u: sl.u, v: sl.v + 0.1, z: z + 2.6 }); p.anim = 'sit'; p.eyes = Math.random() < 0.5 ? 'happy' : 'open'; yield U.rand(5, 9); p.n.energy = Math.min(100, p.n.energy + 10); gain(p, '+体力'); p.eyes = 'open'; yield* hopOff(p, at); }
    p.anim = 'idle';
  };
  // 兼容：去某个地方（'house' 起居室 / 'gh' 花房 / false 庭院）
  A.isleHouse = function* (go) { const p = this; const t = go === 'house' || go === true ? roomSpot('living') : go === 'gh' ? roomSpot('green') : go === 'bed' ? roomSpot('bedroom') : { u: HALL_OUT.u + U.rand(-2, 4), v: HALL_OUT.v + U.rand(1, 5), lv: 1 }; if (!(yield* walkTo(p, t.u, t.v, null, t.lv))) { stuck(p); return; } yield U.rand(1, 3); };
  A.isleFurn = function* (k) { const pr = props().find((q) => q.f === k); if (pr) yield* A.isleUse.call(this, pr); };
  // 抱柴：去柴房抱一捆，下楼到锅炉房添进去
  function* fetchWood(p) {
    const wood = props().find((q) => q.do === 'wood'), boiler = props().find((q) => q.do === 'stoke');
    if (!(yield* walkTo(p, wood.at[0], wood.at[1], null, 1))) { stuck(p); return false; }
    face(p, 2, 25); p.anim = 'eat'; for (let i = 0; i < 3; i++) { p.jolt(i % 2 ? 1.5 : -1.5, 1); yield 0.3; } p.anim = 'idle'; p.tool = { k: 'wood', t0: performance.now() }; say(p, ['抱一捆柴！', '嘿咻'], 1.4); yield 0.4;
    if (!(yield* walkTo(p, boiler.at[0], boiler.at[1], null, 0))) { stuck(p); return false; }
    face(p, 12, 15); p.tool = null; for (let i = 0; i < 4; i++) { p.jolt(0, i % 2 ? -2 : 2); fxAt(12 + U.rand(-1, 1), 12.6, Z[0] + 3, { vy: -40, icon: 'sparkle', life: 0.5 }); yield 0.3; }
    const f = fort(); f.fuel = Math.min(100, f.fuel + 35); gain(p, `锅炉 ${Math.round(f.fuel)}%`); say(p, ['火旺起来了！', '翅膀要扇得有劲啦', '热水马上就好'], 2); yield 1;
    return true;
  }
  A.isleStoke = function* () { yield* fetchWood(this); };
  A.isleUse = function* (pr) { this._usePr = pr;
    const p = this, d = day(), S2 = () => G.S, k = pr.do;
    const spark = (ic, n = 4, up = 20) => { for (let i = 0; i < n; i++) PP.fx({ x: p.x + U.rand(-12, 12) * S2(), y: p.y - up * S2(), vy: -30, icon: ic, life: 0.9, s: 1 }); };
    if (k === 'stoke' || k === 'wood') { yield* fetchWood(p); return; }
    if (!(yield* walkTo(p, pr.at[0], pr.at[1], null, pr.at[2] != null ? pr.at[2] : 1))) { stuck(p); return; }
    if (pr.spot) yield* hop(p, pr.spot);
    p.anim = 'idle';
    if (k === 'sleep') { yield* A.isleBedSleep.call(p, {}); }
    else if (k === 'cookp') { face(p, pr.at[0], 0); yield* cookJiggle(p); if (!pr.user && d.cook < 4 && Math.random() < 0.5) { d.cook++; PP.econ.give('biscuit', 1); PP.ui.toast(`${p.name}在厨房烤了一块小饼干，放进背包了`); } else if (!pr.user) { p.n.hunger = Math.min(100, p.n.hunger + 25); say(p, '偷吃了一口锅里的～'); } }
    else if (k === 'dine') { const ds = Object.keys(E().bag).filter((id) => PP.econ.ITEMS[id] && PP.econ.ITEMS[id].kind === 'dish' && E().bag[id] > 0); p.anim = 'sit'; yield 0.5; if (ds.length) { PP.econ.feedItem(p, ds[0]); return; } say(p, ['肚子饿了……厨房还没做菜', '想吃好吃的！（去灶台做菜）']); p.think('bowl', 2); yield 2.5; }
    else if (k === 'bath') { face(p, pr.at[0], pr.at[1] - 3); p.anim = 'sit'; const hot = fort().fuel > 8; for (let i = 0; i < 12; i++) { bubble(pr.at[0] + U.rand(-3, 3), pr.at[1] - 4, ipOf(p).z + 5); if (i % 3 === 0) p.jolt(i % 2 ? 1 : -1, 0); yield 0.45; } p.anim = 'idle'; p.jolt(2, 0); yield 0.25; p.jolt(-2, 0); say(p, hot ? ['洗得香喷喷！', '热水好舒服～', '甩甩水！'] : ['水是凉的……锅炉没柴了', '冷冷冷！快去添柴']); p.n.fun = Math.min(100, p.n.fun + (hot ? 10 : 2)); yield 1.2; }
    else if (k === 'dex' || k === 'read') { p.anim = 'sit'; p.think('book', 3); yield U.rand(3.5, 6); say(p, U.pick(['原来月光蕨在森林最深处', '这本书里有好多鱼', '记下来：雪绒花喜欢凉快', '下次去探险带种子回来！'])); p.n.fun = Math.min(100, p.n.fun + 8); yield 1.5; }
    else if (k === 'wash') { face(p, pr.at[0] - 1.2, pr.at[1] - 2); for (let i = 0; i < 10; i++) { p.anim = i % 2 ? 'idle' : 'eat'; p.jolt(i % 2 ? 1.2 : -1.2, 0.6); PP.fx({ x: p.x + p.facing * 10, y: p.y - 12 * G.S, vx: U.rand(-20, 20), vy: U.rand(-50, -20), icon: i % 2 ? 'drop' : 'sparkle', life: 0.6 }); yield 0.24; } say(p, ['洗得香喷喷', '晾起来啦', '搓搓搓～'], 1.6); p.anim = 'idle'; yield 0.4; }
    else if (k === 'craft') { face(p, pr.at[0], pr.at[1] - 3); for (let i = 0; i < 8; i++) { p.anim = i % 2 ? 'idle' : 'crouch'; p.jolt(0, i % 2 ? -1.5 : 1); PP.fx({ kind: 'dot', x: p.x + p.facing * 10, y: p.y - 14 * G.S, vx: U.rand(-30, 30), vy: U.rand(-40, -10), life: 0.5, col: '#e8c890', size: 2 }); yield 0.3; } p.anim = 'idle'; say(p, ['叮叮当当～', '做好一个小鸟屋！', '锯木头真好玩']); p.n.fun = Math.min(100, p.n.fun + 10); yield 1.2; }
    else if (k === 'store') { p.anim = 'eat'; for (let i = 0; i < 5; i++) { p.jolt(i % 2 ? 1.5 : -1.5, 0); yield 0.3; } p.anim = 'idle'; say(p, ['种子都分好格子了', '这个抽屉里是向日葵种子']); yield 1.5; }
    else if (k === 'tele') { p.look = [0, -1]; p.anim = 'sit'; const fx = wfx(); yield 1.5; say(p, night() ? ['看到好多星星！', '那颗最亮的是什么星？', '月亮好圆'] : fx.rain ? ['云好厚……'] : ['看到远处的热气球了', '那边的云像一条鱼', '天好蓝']); p.n.fun = Math.min(100, p.n.fun + 10); yield 2.5; }
    else if (k === 'helm') { face(p, 12, 18); p.anim = 'idle'; for (let i = 0; i < 6; i++) { p.jolt(i % 2 ? 2 : -2, 0); yield 0.35; } const pw = power(); say(p, pw > 0.7 ? ['翅膀扇得好有劲！', '往云少的地方飘一点'] : pw > 0.2 ? ['慢慢飘～', '锅炉的柴还够'] : ['翅膀没劲了……得去添柴', '蒸汽不够了']); p.n.fun = Math.min(100, p.n.fun + 10); yield 2; }
    else if (k === 'pump') { face(p, 37, 4); p.look = [0, -1]; yield 1.4; const wet = wfx().rain > 0.3; say(p, wet ? ['下雨了，屋顶的水槽在往水塔里灌水', '水塔满满的'] : ['水泵咕嘟咕嘟，把池子的水抽上去烧', '水塔的水是雨水和云里的雾接来的']); yield 2.4; }
    else if (k === 'nest') { face(p, NEST.u, NEST.v); p.anim = 'eat'; yield 0.6; if (eggOut()) { fort().egg = today(); dirty(); PP.econ.give('henegg', 1); p.tool = { k: 'egg', t0: performance.now() }; p.anim = 'jump'; p.jolt(0, -3); say(p, ['鸟巢里有个蛋！', '野鸟留下一个蛋～'], 2); if (PP.quest) PP.quest.on('egg'); yield 1.2; p.tool = null; } else { say(p, ['今天的蛋已经捡过了', '小鸟飞走了'], 2); yield 1; } p.anim = 'idle'; }
    else if (k === 'pot' || k === 'valve') { p.tool = { k: 'can', t0: performance.now(), pour: true }; for (let i = 0; i < 6; i++) { PP.fx({ x: p.x + p.facing * 14 * S2(), y: p.y - 12 * S2(), vy: 30, icon: 'drop', life: 0.4, s: 1 }); yield 0.25; } p.tool = null; if (k === 'pot' && pr.i != null && PP.LIFE) { const f = PP.LIFE.potInfo(pr.i); if (f && !f.wet) { PP.LIFE.potWater(pr.i); dirty(); gain(p, '浇好水了'); } else if (f && f.stage === 2 && !f.pol) { PP.LIFE.potPollinate(pr.i); gain(p, '授粉了'); } } p.think('flower', 1.4); yield 0.8; }
    else if (k === 'sit') { p.anim = 'sit'; p.eyes = 'sleepy'; p.think(U.pick(['book', 'note', 'heart']), 2.5); yield U.rand(5, 9); p.n.energy = Math.min(100, p.n.energy + 15); gain(p, '+体力'); p.eyes = 'open'; }
    else if (k === 'piano') { p.anim = 'sit'; for (let i = 0; i < 10; i++) { PP.fx({ x: p.x + U.rand(-10, 10), y: p.y - 24 * S2(), vy: -24, icon: 'note', life: 1, s: 1 }); p.jolt(0, i % 2 ? -1 : 1); yield 0.4; } p.n.fun = Math.min(100, p.n.fun + 15); gain(p, '+心情'); }
    else if (k === 'lamp') { p.anim = 'jump'; p.jolt(0, -4); spark('sparkle', 3, 26); yield 0.5; p.anim = 'idle'; say(p, night() ? ['亮晶晶的', '有它就不怕黑'] : ['晚上它会亮哦']); yield 1.4; }
    else if (k === 'warm') { p.anim = 'sit'; p.eyes = 'happy'; spark('heart', 1); yield U.rand(5, 8); p.n.energy = Math.min(100, p.n.energy + 6); p.eyes = 'open'; }
    else if (k === 'write') { p.anim = 'sit'; p.think('book', 2.5); for (let i = 0; i < 6; i++) { p.jolt(i % 2 ? 0.8 : -0.8, 0); yield 0.4; } say(p, ['今天也是开心的一天', '写下：钓到一条鱼', '日记：主人今天摸了我']); yield 2; }
    else if (k === 'rummage') { p.anim = 'eat'; for (let i = 0; i < 6; i++) { p.jolt(i % 2 ? 1.5 : -1.5, i % 3 ? 0 : -1); yield 0.3; } p.anim = 'idle'; if ((d.rum || 0) < 3 && Math.random() < 0.5) { d.rum = (d.rum || 0) + 1; PP.econ.addFish(1, `${p.name}翻到一条小鱼干`); spark('sparkle', 3); say(p, '翻到一条小鱼干！'); } else say(p, ['只有灰尘……', '找到一只旧袜子', '空的']); yield 1.6; }
    else if (k === 'water' || k === 'tend') { p.tool = { k: 'can', t0: performance.now(), pour: true }; for (let i = 0; i < 8; i++) { PP.fx({ x: p.x + p.facing * 14 * S2(), y: p.y - 12 * S2(), vy: 30, icon: 'drop', life: 0.4, s: 1 }); yield 0.25; } p.tool = null; p.think('flower', 1.4); p.n.fun = Math.min(100, p.n.fun + 8); if (k === 'tend' && !d.gh && Math.random() < 0.35) { d.gh = 1; PP.econ.give('tulip', 1); PP.ui.toast(`${p.name}在花房里剪了一朵郁金香，放进背包了`); } yield 1; }
    else if (k === 'look') { p.look = [0, -1]; p.anim = 'sit'; const fx = wfx(); p.think(fx.rain ? 'drop' : fx.snow ? 'sparkle' : night() ? 'moon' : 'note', 2.2); yield 2.4; say(p, pr.say || ['风景真好']); p.n.fun = Math.min(100, p.n.fun + 8); yield 2.4; }
    else if (k === 'drink') { p.anim = 'eat'; yield 2; p.n.thirst = 100; gain(p, '不渴了'); spark('heart', 1); p.anim = 'idle'; yield 0.8; }
    else if (k === 'sniff') { p.look = [0, -1]; p.think('flower', 2); yield 2.4; p.eyes = 'happy'; yield 1; p.eyes = 'open'; }
    else if (k === 'rock') { p.anim = 'sit'; p.eyes = 'sleepy'; for (let t = 0; t < 7; t += 0.2) { p.jolt(Math.sin(t * 3) * 1.5, 0); yield 0.2; } p.n.energy = Math.min(100, p.n.energy + 12); gain(p, '+体力'); p.eyes = 'open'; }
    else if (k === 'book') { p.anim = 'sit'; p.think('book', 3); yield 4; p.n.fun = Math.min(100, p.n.fun + 8); }
    else if (k === 'table') { p.anim = 'sit'; p.think('cake', 2.5); yield 3; p.n.thirst = Math.min(100, p.n.thirst + 10); }
    else if (k === 'rug') { p.anim = Math.random() < 0.5 ? 'knead' : 'roll'; yield U.rand(3, 6); p.n.fun = Math.min(100, p.n.fun + 6); }
    else if (k === 'play') { for (let i = 0; i < 4; i++) { p.anim = i % 2 ? 'roll' : 'crouch'; p.jolt(i % 2 ? 2 : -2, 0); yield 0.6; } p.eyes = 'happy'; spark('heart', 2); p.n.fun = Math.min(100, p.n.fun + 12); gain(p, '+心情'); yield 0.8; p.eyes = 'open'; }
    else if (k === 'climb') { p.look = [0, -1]; p.anim = 'sit'; say(p, ['好高！', '这里看得好远', '我是山大王']); yield 3; p.n.fun = Math.min(100, p.n.fun + 8); }
    else if (k === 'nap') { p.anim = 'sleep'; p.eyes = 'closed'; p.think('zzz', 2.5); yield U.rand(6, 10); p.n.energy = Math.min(100, p.n.energy + 20); gain(p, '+体力'); p.eyes = 'open'; }
    else if (k === 'music') { p.anim = 'dance'; for (let i = 0; i < 12; i++) { PP.fx({ x: p.x + U.rand(-14, 14), y: p.y - 26 * S2(), vy: -24, icon: 'note', life: 1, s: 1 }); yield 0.35; } p.n.fun = Math.min(100, p.n.fun + 15); gain(p, '+心情'); }
    else { p.look = [0, -1]; yield 2; }
    if (pr.spot) yield* hopOff(p, pr.at);
    p.anim = 'idle'; p.eyes = 'open'; p.look = [0, 0];
  };
  const baseEnter = A.enterDoor, baseEmerge = A.emerge;
  const baseSleep = A.sleep;
  A.sleep = function* (...args) { const p = this; if (G.isle && G.pets.includes(p) && !p.d.trip) { const bed = props().find((x) => x.do === 'sleep'); if (bed) { p._bedSleep = true; try { yield* A.isleUse.call(p, bed); } finally { p._bedSleep = false; } return; } } yield* baseSleep.apply(p, args); };
  A.enterDoor = function* (done) { if (!G.isle) { yield* baseEnter.call(this, done); return; } const p = this; yield* walkTo(p, HALL_OUT.u - 1, HALL_OUT.v - 1); yield 0.2; p.inDoor = true; done && done(); };
  A.emerge = function* () { if (!G.isle) { yield* baseEmerge.call(this); return; } const p = this; p.inDoor = false; p.ip = null; p.iw = null; p.isleSpot = null; setIp(p, HALL_OUT.u - 1, HALL_OUT.v - 1, 1); p.y = p.floor; yield* A.isleOut.call(p); };
  // 自己决定做什么：整座城堡就是家。下雨下雪往屋里躲；晚上、累了去卧室睡；锅炉没柴了去抱柴
  const baseDecide = PP.Pet.prototype.decide;
  PP.Pet.prototype.decide = function () {
    if (G.isle && this.isleSpot && !this.sleeping && !this.fishing) { const s = this.isleSpot, a = area(), q = ipOf(this); this.isleSpot = null; if (Math.hypot(s.u - q.u, s.v - q.v) > 6) { const c = nearFree(a, s.u, s.v, q.lv); setIp(this, c[0], c[1], q.lv); } }
    if (G.isle && this.tool && !this.gen) this.tool = null;
    // 睡觉时间：回卧室的床上睡，不在甲板上随地一躺
    if (G.isle && G.pets.includes(this) && !this.held && PP.sleepTime && PP.sleepTime() && !this.sleeping) { const bed = props().find((x) => x.do === 'sleep'); if (bed) { this.run('isleUse', A.isleUse, bed); return; } }
    if (G.isle && G.pets.includes(this) && !this.held && !(G.save.settings.quiet) && Math.random() < 0.7) {
      const e = E(), p = this, q = ipOf(p), fx = wfx(), wet = fx.rain > 0.3 || fx.snow > 0.5 || fx.storm, R = (n, f, ...a) => { p.run(n, f, ...a); return true; }, PR = props();
      // 别的伙伴正在用 / 站在旁边的东西先不挑：几只住在一起时各干各的，不挤成一堆
      const taken = (x) => x && x.at && G.pets.some((o) => o !== p && o.ip && (o._usePr === x || Math.hypot(o.ip.u - x.at[0], o.ip.v - x.at[1]) < 2.5));
      const indoor = !!F.roomAt(q.u, q.v, q.lv), use = (list, ch) => { const L2 = list.filter((x) => !taken(x)); return L2.length && Math.random() < ch ? R('isleUse', A.isleUse, U.pick(L2)) : false; };
      const roam = (lv) => { const cs = cellList().filter((c) => lv == null || c[4] === lv); if (!cs.length) return false; const c = U.pick(cs); return R('isleGo', A.isleGo, c[2], c[3], c[4]); };
      if (p.n.energy < 40 || (night() && Math.random() < 0.5)) { const bed = PR.find((x) => x.do === 'sleep'); if (bed && Math.random() < 0.7) return R('isleUse', A.isleUse, bed); }
      if (fort().fuel < 15 && Math.random() < 0.35) return R('isleStoke', A.isleStoke);
      if (wet && !indoor && Math.random() < 0.6) return R('isleHouse', A.isleHouse, U.pick(['house', 'house', 'gh']));
      if (!wet) {
        const grow = PLOTS.map((_, i) => i).filter((i) => { const inf = PP.econ.plotInfo(i); return inf && inf.stage < 3 && (e.farm[i].water || 0) < 3; });
        if (grow.length && !fx.rain && Math.random() < 0.25) return R('isleWater', A.isleWater, U.pick(grow));
        if (PP.econ.unread() && Math.random() < 0.2) return R('isleMail', A.isleMail);
        if (p.n.thirst < 60 && Math.random() < 0.5) return R('isleDrink', A.isleDrink);
        const sl = (e.isleDeco || []).map((id, i) => ({ id, i, u: SLOTS[i] && SLOTS[i][0], v: SLOTS[i] && SLOTS[i][1] })).filter((s) => ['bench', 'swing', 'hay'].includes(s.id));
        if (sl.length && Math.random() < 0.15) return R('isleSit', A.isleSit, U.pick(sl));
        if (Math.random() < 0.15) return R('isleFish', A.isleFish);
        if (eggOut() && Math.random() < 0.1) return R('isleUse', A.isleUse, PR.find((x) => x.do === 'nest'));
      }
      if (p.n.thirst < 50 && Math.random() < 0.5) return R('isleUse', A.isleUse, PR.find((x) => x.do === 'drink'));
      if (use(PR.filter((x) => !['stoke', 'wood', 'sleep', 'nest', 'pot', 'valve'].includes(x.do)), wet ? 0.6 : 0.4)) return true;
      if (Math.random() < 0.6) return roam(wet ? q.lv : null);
    }
    return baseDecide.call(this);
  };
  setInterval(() => { try { if (!G.save || !PP.econ) return; if (wfx().rain > 0.3) (E().farm || []).forEach((pl) => { if (pl && (pl.water || 0) < 3) pl.water = (pl.water || 0) + 1; }); } catch (err) {} }, 10 * 60000);

  function dirty() { dirtyK++; propKey = ''; }
  setInterval(() => { if (PP.started && G.save) sync(); if (G.isle) for (const p of G.pets) if (p.action === 'sleep' && !p._bedSleep && !p.held && !p.d.trip) { p.interrupt(true); p.run('sleep', A.sleep); } }, 1500);
  const doorX = () => { if (!L) layout(); return scrU(HALL_OUT.u - 1, HALL_OUT.v - 1); };
  function furnAdd(f) { const e = E(), L0 = FURN.layout(e); if (!FURN.D[f] || L0.some((q) => q.f === f)) return false; const q = fFree({ f, u: 0, v: 0, r: 0, room: 'living' }, -1) || fFree({ f, u: 0, v: 0, r: 0, room: 'bedroom' }, -1); if (!q) return false; L0.push(q); fChanged(); return true; }
  const insideV = () => (cut == null ? false : focus === 'living' ? 'house' : 'in'); // 「小屋」视图 = 起居室的详细视图
  // 测试用：直接推着第一人称跑几帧、叫它自己走到某个地方
  const fpDebug = { warmSt: () => ({ on: !!warm.on, vox: !!vox, voxT: voxB && voxB.t, nav: !!navC, navB: navB && navB.lv + ":" + navB.j }), tick: (dt) => fp && fpTick(dt), surf, blocked, cam: () => fp && fpCam(),
    slice: (u0, v0, u1, v1, z) => { const V = voxels(), o = []; for (let v = v0; v < v1; v += VX) { let r = ''; for (let u = u0; u < u1; u += VX) r += vAt(V, u + 0.01, v + 0.01, z) ? '#' : '.'; o.push(r); } return o; },
    why: (u, v, z) => { const V = voxels(), o = []; for (const [du, dv] of BODYC) for (let zz = z + STEP; zz <= z + BODYH; zz += VZ) if (vAt(V, u + du, v + dv, zz)) { o.push([+du.toFixed(2), +dv.toFixed(2), +zz.toFixed(2)]); break; } return o; },
    tris: (u, v, z, r = 0.3) => { const m = scene().cpu, P = m.p, out = {}; for (let t = 0; t < P.length; t += 9) { let hit = false; const cu = (P[t] + P[t + 3] + P[t + 6]) / 3, cv = (P[t + 1] + P[t + 4] + P[t + 7]) / 3, cz = (P[t + 2] + P[t + 5] + P[t + 8]) / 3; if (Math.abs(cu - u) < r + 1 && Math.abs(cv - v) < r + 1 && Math.abs(cz - z) < 1.5) hit = true; if (!hit) continue; const vi = t / 3, k = m.c.slice(vi * 3, vi * 3 + 3).map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('') + ' 材质' + m.m[vi] + ' 摆' + (m.w ? m.w[vi] : 0); out[k] = (out[k] || 0) + 1; } return out; },
    who: (u0, v0, u1, v1, z0, z1) => { const cpu = scene().cpu, proto = Object.getPrototypeOf(cpu), orig = proto.tri, hits = new Map(); proto.tri = function (a, b, c, ...r) { for (let fa = 0; fa <= 1.001; fa += 0.1) for (let fb = 0; fb <= 1.001 - fa; fb += 0.1) { const x = a[0] + (b[0] - a[0]) * fa + (c[0] - a[0]) * fb + this.ox, y = a[1] + (b[1] - a[1]) * fa + (c[1] - a[1]) * fb + this.oy, z = a[2] + (b[2] - a[2]) * fa + (c[2] - a[2]) * fb + this.oz; if (x > u0 && x < u1 && y > v0 && y < v1 && z > z0 && z < z1) { const st = new Error().stack.split('\n').slice(2, 7).map((l) => l.trim().replace(/^at /, '').replace(/\(?file:.*\/js\//, '(').replace(/\)$/, '')).join(' < '); hits.set(st, (hits.get(st) || 0) + 1); fa = 9; break; } } return orig.call(this, a, b, c, ...r); }; try { F.build(opts(null)); } finally { proto.tri = orig; } return [...hits.entries()].map(([k, n]) => n + '× ' + k); },
    triIn: (u0, v0, u1, v1, z0, z1) => { const m = scene().cpu, P = m.p, out = {}; for (let t = 0; t < P.length; t += 9) { let hit = false; for (let fa = 0; fa <= 1.001 && !hit; fa += 0.1) for (let fb = 0; fb <= 1.001 - fa; fb += 0.1) { const x = P[t] + (P[t + 3] - P[t]) * fa + (P[t + 6] - P[t]) * fb, y = P[t + 1] + (P[t + 4] - P[t + 1]) * fa + (P[t + 7] - P[t + 1]) * fb, z = P[t + 2] + (P[t + 5] - P[t + 2]) * fa + (P[t + 8] - P[t + 2]) * fb; if (x > u0 && x < u1 && y > v0 && y < v1 && z > z0 && z < z1) { hit = true; break; } } if (!hit) continue; const vi = t / 3, k = m.c.slice(vi * 3, vi * 3 + 3).map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('') + ' 材质' + (m.m[vi] % 32) + ' 点选' + Math.floor(m.m[vi] / 32) + ' 摆' + m.w[vi] + ' 三角[' + [0, 1, 2].map((q) => P.slice(t + q * 3, t + q * 3 + 3).map((x) => x.toFixed(1)).join(',')).join(' ') + ']'; out[k] = (out[k] || 0) + 1; } return out; },
    rebuild: () => { vox = null; voxB = null; navC = null; navB = null; const t0 = performance.now(); voxels(); const t1 = performance.now(); return [Math.round(t1 - t0)]; },
    col: (u, v, z0, z1) => { const V = voxels(), o = []; for (let z = z0; z <= z1; z += VZ) if (vAt(V, u, v, z + 0.01)) o.push(+z.toFixed(2)); return o; },
    // 画一帧，数一数“什么都没画到”（透出去）的像素占多少
    holes: () => { if (!fp) return -1; fp._cam = null; fp.last = performance.now(); const s0 = scene(); lastScenes = [s0.gpu, dynMesh]; lastLO = lightOpts(); const cv = g3.draw(lastScenes, fpOpts()); if (!cv) return -1; const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d'); x.drawImage(cv, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] < 10) n++; return n / (d.length / 16); },
    nav: () => nav(), navFree, go: (u, v, lv) => { if (!fp) return false; const pts = fpPlan(fp.q, u, v, lv); if (!pts || !pts.length) return false; fp.auto = { pts, i: 0 }; return true; } };
  /* 委托里的「带我去」：进城堡，主角自己走过去做 */
  function questGo(k) {
    const run = () => {
      const P = props(), pr = (d) => P.find((q) => q.do === d);
      if (k === 'fish') return click({ k: 'fish' });
      if (k === 'honey') return click({ k: 'hive' });
      if (k === 'egg' && pr('nest')) return click({ k: 'prop', pr: pr('nest') });
      if (k === 'cook' && pr('cookp')) return click({ k: 'prop', pr: pr('cookp') });
      if (k === 'water' || k === 'harvest') {
        const inf = PLOTS.map((_, i) => PP.econ.plotInfo(i));
        let i = k === 'harvest' ? inf.findIndex((x) => x && x.stage === 3) : -1;
        if (i < 0) i = inf.findIndex((x, j) => x && x.stage < 3 && (E().farm[j].water || 0) < 3);
        if (i >= 0) return click({ k: 'plot', i });
        const empty = inf.findIndex((x) => !x);
        if (empty >= 0) { PP.ui.toast(k === 'harvest' ? '菜还没种：先选一种种子种下，长好了再来收' : '先种点东西，才能浇水', 4); return seedPicker(empty, G.W / 2, G.H / 2); }
        PP.ui.toast('菜地都种满了，等它们长一会儿', 3); return;
      }
    };
    if (!G.isle) { PP.setView && PP.setView('isle'); setTimeout(run, 1400); } else run();
  }
  PP.isle = { questGo, fpDebug, fpStart, fpStop, fpOn: () => !!fp, looking: lookOn, fpState: () => fp, camChanged, setFocus, focus: () => focus, neighbours, cookAnim, furnEdit, furnAdd, furnEditing: () => fedit, resetCam, props, doorX, floorY, sync, layout, groundY, zone, renderBack, renderFront, hot, click, down, cmd, dirty, inside: insideV, setInside, setCut, cut: () => cut, rect: () => L, scale: () => (L ? L.u : zoomOf()) * 0.34 * F.FS, zoom: () => (L ? L.u : zoomOf()), setSize, setZoom, resetPos, setMirror, mirror: mir, SIZES, Z0, safeB, SLOT_NAME, seedPicker, pressing: () => !!press, uvOf, walking: (p) => !!p.iw, step, gotoX, cells: cellList, areas: { fort: AREA }, free: (u, v, lv) => free(area(), u, v, lv), fort, power };
})();
