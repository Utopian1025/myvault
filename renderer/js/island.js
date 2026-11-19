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
  let L = null, cut = null, hover = null, dirtyK = 0, smoke = [], cooking = false, mark = null, drops = [], flash = 0, press = null, rips = [];
  let meshes = {}, dynMesh = null, glOK = true, lastScenes = null, lastLO = null;
  const mir = () => !!(G.save && S().isleMirror), org = () => (bnd() || { org: [0, 0] }).org;
  const cam = () => { if (!G.save) return { c: 1, s: 0, A: 1, B: 1, yaw: 0 }; const y = +S().isleYaw || 0, ph = U.clamp(+S().islePitch || 45, 22, 72) * Math.PI / 180; return { c: Math.cos(y), s: Math.sin(y), A: Math.SQRT2 * Math.sin(ph), B: Math.SQRT2 * Math.cos(ph), yaw: y }; };
  const rotUV = (u, v, k = cam()) => { const du = u - CEN[0], dv = v - CEN[1]; return [du * k.c - dv * k.s + CEN[0], du * k.s + dv * k.c + CEN[1]]; };
  const depth = (u, v) => { const r = rotUV(u, v); return r[0] + r[1]; };
  const IWf = () => (bnd() || { IW: 200 }).IW, IHf = () => (bnd() || { IH: 200 }).IH;
  const cx = (u, v) => { const k = cam(), [ru, rv] = rotUV(u, v, k), x = org()[0] + 2 * (ru - rv); return mir() ? IWf() - x : x; }, cy = (u, v, z = 0) => { const k = cam(), [ru, rv] = rotUV(u, v, k); return org()[1] + ((ru + rv) * k.A - z * k.B); };
  // 剖切：朝镜头的方向（世界坐标）
  const cutO = () => { if (cut == null) return null; const k = cam(); return { lv: cut, vu: k.c + k.s, vv: k.c - k.s }; };
  const quad = () => { const k = cam(); return (k.c + k.s > 0 ? 1 : 0) + (k.c - k.s > 0 ? 2 : 0); };
  // 外面的画框：按整座城堡（外部）算，进屋剖切时画框不跳
  let bndC = null, extPos = null, extKey = '';
  function bnd() {
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
  const AREA = { z: Z, inF: F.AREA.inF, ramps: F.AREA.ramps, obst: () => F.AREA.obst(furnObs().concat((E().isleDeco || []).map((id, i) => (id && SLOTS[i] ? [1, 'c', SLOTS[i][0], SLOTS[i][1], id === 'lampPost' ? 0.4 : 1.5] : null)).filter(Boolean))) };
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
    const u = zoomOf(), w = Math.round(IWf() * u), h = Math.round(IHf() * u), pos = G.save && S().islePos, sb = safeB();
    let x1 = pos ? pos.x * G.W : G.W - 4, y1 = pos ? pos.y * sb : sb - 2;
    x1 = U.clamp(x1, Math.min(w + 2, G.W - 2), Math.max(w + 2, G.W - 2)); y1 = U.clamp(y1, Math.min(h + 2, sb - 2), Math.max(h + 2, sb - 2));
    L = { u, x0: Math.round(x1 - w), y0: Math.round(y1 - h), x1: Math.round(x1), y1: Math.round(y1), w, h };
    // 看得见的那一块（屏幕坐标）
    L.vx0 = Math.max(0, L.x0); L.vy0 = Math.max(0, L.y0); L.vx1 = Math.min(G.W, L.x1); L.vy1 = Math.min(G.H, L.y1); L.vw = Math.max(1, L.vx1 - L.vx0); L.vh = Math.max(1, L.vy1 - L.vy0);
    const rs = document.documentElement.style; rs.setProperty('--isk', U.clamp(u / Z0, 0.55, 1.5).toFixed(3)); rs.setProperty('--isR', Math.max(4, G.W - L.x1) + 'px'); rs.setProperty('--isB', Math.max(4, G.H - L.y0 + 6) + 'px');
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
    else if (!w && G.isle) { G.isle = null; cut = null; cBar(); for (const p of G.all) { p.isleSpot = null; p.ip = null; p.iw = null; p.lane = null; p.fishing = null; p.isleLv = 0; p.tool = null; p.isleHide = false; } document.body.style.cursor = 'default'; window.dispatchEvent(new Event('resize')); }
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
    if (o && ax != null) { const r = z / o.u, nx0 = ax - (ax - o.x0) * r, ny0 = ay - (ay - o.y0) * r; S().islePos = { x: (nx0 + IWf() * z) / G.W, y: (ny0 + IHf() * z) / safeB() }; }
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
    if (!G.isle || !L || (e.button !== 2 && e.button !== 1) || G.hoverPet) return;
    if (e.clientX < L.x0 || e.clientX > L.x1 || e.clientY < L.y0 || e.clientY > L.y1) return;
    camDrag = { x: e.clientX, y: e.clientY, yaw: +S().isleYaw || 0, pitch: +S().islePitch || 45, moved: false }; G.uiDrag = true; PP.refreshInteractive();
    const mv = (ev) => { if (!camDrag) return; const dx = ev.clientX - camDrag.x, dy = ev.clientY - camDrag.y; if (Math.hypot(dx, dy) > 4) camDrag.moved = true; if (!camDrag.moved) return; S().isleYaw = camDrag.yaw + dx * 0.012; S().islePitch = U.clamp(camDrag.pitch - dy * 0.25, 22, 72); camChanged(); document.body.style.cursor = 'grabbing'; };
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); if (camDrag && camDrag.moved) { PP.save.soon(); window.__noCtx = performance.now(); } camDrag = null; G.uiDrag = false; document.body.style.cursor = 'default'; PP.refreshInteractive(); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }, true);
  window.addEventListener('contextmenu', (e) => { if (window.__noCtx && performance.now() - window.__noCtx < 400) { e.preventDefault(); e.stopPropagation(); } }, true);
  window.addEventListener('wheel', (e) => { if (!G.isle || !L || !hover) return; if (e.target && e.target.closest && e.target.closest('.panel,.menu,.orb-pop,.hud,.cutbar,.furnbar')) return; e.preventDefault(); const dy = U.clamp(e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY, -240, 240); setZoom(zoomOf() * Math.exp(-dy * 0.0011), true, e.clientX, e.clientY); }, { passive: false });

  // ---------- 3D 场景 ----------
  function farmKey() { return PLOTS.map((_, i) => { const inf = PP.econ.plotInfo(i); return inf ? inf.crop + inf.stage + ((E().farm[i].water || 0) > 0 ? 'w' : '') : '-'; }).join(','); }
  const potList = () => [0, 1, 2, 3].map((i) => { const f = PP.LIFE && PP.LIFE.potInfo(i); return f ? { id: f.id, stage: f.stage, wet: f.wet } : null; });
  const eggOut = () => fort().egg !== today() && new Date().getHours() >= 6;
  function opts(c) { const e = E(); return { cut: c, season: season(), snow: snowy(), deco: e.isleDeco, tripping: tripping(), farm: PLOTS.map((_, i) => { const inf = PP.econ.plotInfo(i); return inf ? { crop: inf.crop, stage: inf.stage, wet: (e.farm[i].water || 0) > 0 } : null; }), furn: FURN.layout(e), skip: fdrag ? fdrag.i : undefined, pinkBed: !!(e.room || {}).bed, egg: eggOut(), pots: potList() }; }
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
    const key = [cut, cut == null ? '' : quad(), baseKey()].join('#');
    const s = meshes.main;
    if (s && s.key === key) return s;
    const m = F.build(opts(cutO()));
    const r = (meshes.main = { key, gpu: g3.upload(m, s && s.gpu) });
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
    return { sun: dir, sunCol: sun, sky, gnd, lit, skyTop: top, skyBot: bot, rain: fx.rain || 0, wind: Math.min(1, (fx.wind || 0) + (fx.storm ? 0.5 : 0)), inside: false, time: performance.now() / 1000, center: [28, 26, cut == null ? 10 : Z[cut] + 4], radius: 125 };
  }
  const hidden = (p) => cut != null && p.ip && !p.held && p.ip.lv > cut;
  function petCuts() {
    const out = [];
    for (const p of G.pets) { if (p.held || p.isleSpot || p.inDoor || p.inDen || p.isleHide) continue; const q = p.ip; if (!q) continue; const h = 30 * G.S * (p.scaleMul || 1); const pq = pixK(); out.push([(p.x - L.vx0) / pq, (p.y - L.vy0 - (p.hopY || 0)) / pq, h / pq, depth(q.u, q.v), q.z]); }
    return out;
  }
  const DPR = () => window.devicePixelRatio || 1;
  // 像素块最多 2 个屏幕点：放大时看得清细节，不会越放越糊
  const pixOn = () => !(G.save && S().islePix === false), pixD = () => (pixOn() ? Math.min(Math.max(2, Math.round(DPR() * 2)), Math.max(1, Math.round(L.u * DPR() * 0.3))) : 1), pixK = () => pixD() / DPR();
  function viewOpts() { const k = cam(), q = pixK(), W = Math.ceil(L.w / q), Wv = Math.ceil(L.vw / q), dx = L.vx0 - L.x0, dy = L.vy0 - L.y0, kk = L.u / q;
    const ox = mir() ? org()[0] - (W - Wv) / kk + dx / L.u : org()[0] - dx / L.u;
    return Object.assign({ w: Wv, h: Math.ceil(L.vh / q), ox, oy: org()[1] - dy / L.u, k: kk, mirror: mir(), yaw: k.yaw, pitch: [k.A, k.B], camC: CEN, posterize: pixOn() ? 26 : 0, cel: pixOn() }, lastLO); }
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
    if (!G.isle) return;
    if (!L) layout();
    const u = L.u, nt = night(), now = performance.now(), fx = wfx(), wind = fx.wind || 0, pw = power();
    ctx.save();
    const cv = glOK && g3.ok() && render3d();
    if (cv) { ctx.imageSmoothingEnabled = false; const q = pixK(), d = DPR(); ctx.drawImage(cv, Math.round(L.vx0 * d) / d, Math.round(L.vy0 * d) / d, cv.width * q, cv.height * q); }
    if (cv) { try { lifeLayer(ctx); } catch (e) {} }
    else { glOK = false; ctx.fillStyle = 'rgba(40,30,50,.8)'; ctx.fillRect(L.x0 + L.w * 0.1, L.y0 + L.h * 0.45, L.w * 0.8, 40); ctx.fillStyle = '#fff'; ctx.font = PP.FONT(12); ctx.fillText('这台电脑没法开启 3D 渲染（WebGL2），城堡画不出来', L.x0 + L.w * 0.12, L.y0 + L.h * 0.45 + 24); }
    if (cut == null) {
      CHIMS.forEach(([a, b, c], i) => { if (Math.random() < (i === 0 ? 0.04 + pw * 0.1 : cooking && i === 1 ? 0.12 : 0.02)) smoke.push({ x: cx(a, b), y: cy(a, b, c), t: 0 }); });
      if (Math.random() < 0.5) smoke.push({ x: cx(F.FALL[0] + U.rand(-0.8, 0.8), F.FALL[1]), y: cy(F.FALL[0], F.FALL[1], -40), t: 0, mist: true }); // 瀑布落下去散成雾
      for (const [a, b] of F.WING_ROOTS) if (Math.random() < pw * 0.06) smoke.push({ x: cx(a, b), y: cy(a, b, Z[2] + 13), t: 0 });
      if (nt || phase() === 'dusk') { for (const [a, b] of LAMPS) glow(ctx, scrU(a, b), scrV(a, b, 10.6), 16 * u, 'rgba(255,214,140,', 0.34); (E().isleDeco || []).forEach((id, i) => { if (id === 'lampPost' || id === 'lantern') glow(ctx, scrU(SLOTS[i][0], SLOTS[i][1]), scrV(SLOTS[i][0], SLOTS[i][1], id === 'lampPost' ? 11 : 2), 18 * u); }); }
      if (nt && season() === 'summer' && !fx.rain) { ctx.fillStyle = '#fff6a0'; for (let i = 0; i < 9; i++) { const t = now / 1000 + i * 3.1; if (Math.sin(t * 2.3 + i) > 0) { const pu = 18 + ((i * 13 + Math.sin(t) * 4) % 30), pv = 24 + ((i * 7 + Math.cos(t * 0.8) * 4) % 22); ctx.beginPath(); ctx.arc(scrU(pu, pv), scrV(pu, pv, 4 + Math.sin(t * 2) * 3), u * 0.6, 0, 6.3); ctx.fill(); } } }
    } else {
      if (cut === 0) glow(ctx, scrU(12, 13), scrV(12, 13, Z[0] + 3), (18 + fort().fuel / 6) * u, 'rgba(255,150,70,', 0.32 + Math.sin(now / 150) * 0.04);
      if (cut === 1 && cooking) glow(ctx, scrU(23, 10.6), scrV(23, 10.6, 7), 26 * u, 'rgba(255,170,90,', 0.36);
      if (nt || phase() === 'dusk') for (const it of FURN.layout(E())) { const d = FURN.D[it.f]; if (d.light && F.roomLv(it.room || 'living') === cut) glow(ctx, scrU(it.u, it.v), scrV(it.u, it.v, Z[cut] + d.light[2] * F.FS), 22 * u); }
      if (cut >= 1 && (nt || phase() === 'dusk')) for (const [a, b] of LAMPS) glow(ctx, scrU(a, b), scrV(a, b, 10.6), 14 * u, 'rgba(255,214,140,', 0.28);
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
    L0.forEach((it, i) => { if ((it.room || 'living') !== rid || (fdrag && fdrag.i === i)) return; draw(it, i === fsel ? 'rgba(255,230,120,.95)' : 'rgba(255,255,255,.35)', i === fsel ? u * 0.5 : u * 0.25); });
    if (fdrag) draw(fdrag.it, fdrag.ok ? 'rgba(120,230,120,.95)' : 'rgba(255,90,90,.95)', u * 0.6);
    ctx.restore();
  }

  // ---------- 剖切：进到哪一层 ----------
  function setCut(lv, quiet) {
    lv = lv == null ? null : U.clamp(lv, 0, 3);
    if (cut === lv) return;
    cut = lv; hover = null; smoke = []; drops = []; cells = {};
    if ((lv !== 2 && lv !== 3) && fedit) { fedit = false; fsel = -1; fdrag = null; fBar(); }
    if (lv != null && G.save.flags) G.save.flags.isleIn = 1;
    for (const p of G.pets) { if (p.held) continue; p.isleHide = hidden(p); }
    layout(); cBar(); PP.placeOrb && PP.placeOrb();
    if (!quiet && lv != null) PP.ui.toast(`${F.NAME[lv]}：${roomsOn(lv)}`, 1.6);
  }
  const roomsOn = (lv) => [...new Set(ROOMS.filter((r) => r.lv === lv).map((r) => r.nm).concat(F.OPEN.filter((o) => o[0] === lv).map((o) => o[5])))].join(' · ');
  // 剖切条：在城堡框的左下角：第几层、上一层 / 下一层 / 回到外面
  function cBar() {
    if (!G.isle || cut == null || !L) { if (cbar) { cbar.remove(); cbar = null; PP.refreshInteractive(); } return; }
    if (!cbar) {
      cbar = document.createElement('div'); cbar.className = 'cutbar'; document.getElementById('ui').appendChild(cbar);
      cbar.addEventListener('mousedown', (ev) => ev.stopPropagation());
      cbar.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; const a = b.dataset.a; if (a === 'up') setCut(Math.min(3, cut + 1)); else if (a === 'down') setCut(cut - 1); else if (a === 'out') setCut(null); else if (a === 'furn') furnEdit(!fedit); });
    }
    const k = [cut, fedit].join('|');
    if (cbar.dataset.k !== k) { cbar.dataset.k = k; cbar.innerHTML = `<button data-a="up" ${cut >= 3 ? 'disabled' : ''} title="上一层">▲</button><span class="lv"><b>${F.NAME[cut]}</b><small>${esc(roomsOn(cut))}</small></span><button data-a="down" ${cut <= 0 ? 'disabled' : ''} title="下一层">▼</button>${cut != null ? `<button data-a="furn" class="${fedit ? 'on' : ''}">${fedit ? '布置中' : '布置家具'}</button>` : ''}<button data-a="out" class="primary" title="回到外面看整座城堡">看外面</button>`; }
    cbar.style.left = Math.max(4, L.x0 + 4) + 'px'; cbar.style.top = Math.min(G.H - 40, safeB() - 40, L.y1 - 34) + 'px'; PP.refreshInteractive();
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
    if (!G.isle || !L) return;
    try { occlude(ctx); } catch (e) { PP.oops && PP.oops(e, 'isle.occ'); }
    try { fOverlay(ctx); } catch (e) { PP.oops && PP.oops(e, 'isle.furn'); }
    const u = L.u, now = performance.now();
    ctx.save();
    for (const p of G.pets) { if (p.isleHide) continue; if (p.fishing) drawFishing(ctx, p, now); if (p.tool) drawTool(ctx, p, now); if (p.inBed) { if (p.action !== 'isleUse') p.inBed = null; else quilt(ctx, p); } }
    const fx = wfx(); if (cut == null && (fx.rain || fx.snow || flash > 0)) weatherTick(ctx, { x: L.vx0, y: L.vy0, w: L.vw, h: L.vh });
    if ((cut == null || cut >= 1) && PP.econ.unread()) { const x = scrU(MAILB.u, MAILB.v), y = scrV(MAILB.u, MAILB.v, 11 + Math.sin(now / 400) * 0.8); ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#3a2630'; ctx.lineWidth = u * 0.4; ctx.beginPath(); ctx.rect(x - 2.6 * u, y - 2 * u, 5.2 * u, 4 * u); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#e8705a'; ctx.beginPath(); ctx.moveTo(x - 2.6 * u, y - 2 * u); ctx.lineTo(x, y + 0.3 * u); ctx.lineTo(x + 2.6 * u, y - 2 * u); ctx.stroke(); }
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
  const roomSpot = (rid) => { const r = RM[rid]; const c = nearFree(area(), (r.r[0] + r.r[2]) / 2, (r.r[1] + r.r[3]) / 2 + 1, r.lv); return { u: c[0], v: c[1], lv: r.lv }; };
  function click(h, x, y) {
    if (!h) return;
    const p = mainP(), go = (name, fn, ...args) => { if (p) { p.interrupt(true); p.inDoor = false; p.fishing = null; p.tool = null; p.run(name, fn, ...args); } };
    if (h.k === 'ground') { mark = { u: h.u, v: h.v, z: h.z, t: performance.now() }; go('isleGo', A.isleGo, h.u, h.v, h.lv); return; }
    if (h.k === 'hull') return;
    if (h.k === 'door' && !h.d) { setCut(2); if (p) go('isleHouse', A.isleHouse, 'house'); return; } // 菜单里的“进屋”：去起居室
    if (h.k === 'door') { const d = h.d, r = d.room, c = r.c ? [r.c[0] + (d.inP[0] - r.c[0]) * 0.6, r.c[1] + (d.inP[1] - r.c[1]) * 0.6] : [d.inP[0] + (d.inP[0] - d.outP[0]) * 0.8, d.inP[1] + (d.inP[1] - d.outP[1]) * 0.8]; setCut(d.lv); go('isleGo', A.isleGo, c[0], c[1], d.lv); return; }
    if (h.k === 'exit') { setCut(null); return; } // 兼容：菜单里的“出门”
    if (h.k === 'prop') { const pk = { cookp: 'cook', dex: 'plant', craft: 'craft', store: 'bag', pot: 'gh', valve: 'gh' }[h.pr.do]; if (pk) PP.econ.openPanel(pk); if (cut == null && h.pr.at[2] !== 1) setCut(h.pr.at[2], true); go('isleUse', A.isleUse, h.pr); return; }
    if (h.k === 'deco') { go('isleSit', A.isleSit, { id: h.id, i: h.i, u: SLOTS[h.i][0], v: SLOTS[h.i][1] }); return; }
    if (h.k === 'mail') { go('isleMail', A.isleMail); PP.econ.openPanel('mail'); return; }
    if (h.k === 'fish') { if (p && p.fishing) { if (p.fishing.ph === 'bite') p.fishing.helped = true; return; } go('isleFish', A.isleFish); return; }
    if (h.k === 'balloon') { PP.econ.openPanel('trip'); return; }
    if (h.k === 'hive') { go('isleHive', A.isleHive); return; }
    if (h.k === 'tap') { go('isleDrink', A.isleDrink); return; }
    if (h.k === 'door0' || h.k === 'home') { setCut(2); if (p) go('isleGo', A.isleGo, ...Object.values(roomSpot('living'))); return; } // 菜单里的“进屋”：去起居室
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
  function setInside(v) { if (v === 'house' || v === true) setCut(2); else if (v === 'gh') setCut(1); else if (typeof v === 'number') setCut(v); else setCut(null); }

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
    p.anim = 'idle'; p.eyes = 'open'; p.jolt(0, -2); yield 0.3; p.jolt(0, -3); say(p, ['睡饱啦！', '早上好～', '精神满满'], 2); p.eyes = 'happy';
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
  A.isleUse = function* (pr) {
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
      const indoor = !!F.roomAt(q.u, q.v, q.lv), use = (list, ch) => (list.length && Math.random() < ch ? R('isleUse', A.isleUse, U.pick(list)) : false);
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
  const insideV = () => (cut == null ? false : cut === 2 ? 'house' : 'in');
  PP.isle = { cookAnim, furnEdit, furnAdd, furnEditing: () => fedit, resetCam, props, doorX, floorY, sync, layout, groundY, zone, renderBack, renderFront, hot, click, down, cmd, dirty, inside: insideV, setInside, setCut, cut: () => cut, rect: () => L, scale: () => (L ? L.u : zoomOf()) * 0.34 * F.FS, zoom: () => (L ? L.u : zoomOf()), setSize, setZoom, resetPos, setMirror, mirror: mir, SIZES, Z0, safeB, SLOT_NAME, seedPicker, pressing: () => !!press, uvOf, walking: (p) => !!p.iw, step, gotoX, cells: cellList, areas: { fort: AREA }, free: (u, v, lv) => free(area(), u, v, lv), fort, power };
})();
