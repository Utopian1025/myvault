// 小岛视图 = 一整座浮空浮岛（模型 fort.js，引擎 isle3d.js）。这里是玩法：
//   外部视角：整座浮岛；点任何一扇门 → 剖切进那一层（同一个模型，上面拿掉、朝镜头的墙压矮），能转能缩放
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
  // 俯仰角：可以转到底下看浮岛的底部；水平附近（看不出前后）跳过
  const pitchOK = (v) => { v = U.clamp(v, -72, 80); return Math.abs(v) < 10 ? (v < 0 ? -10 : 10) : v; };
  const cam = () => { if (!G.save) return { c: 1, s: 0, A: 1, B: 1, yaw: 0 }; const y = +S().isleYaw || 0, ph = pitchOK(+S().islePitch || 45) * Math.PI / 180; return { c: Math.cos(y), s: Math.sin(y), A: Math.SQRT2 * Math.sin(ph), B: Math.SQRT2 * Math.cos(ph), yaw: y }; };
  const rotUV = (u, v, k = cam()) => { const du = u - CEN[0], dv = v - CEN[1]; return [du * k.c - dv * k.s + CEN[0], du * k.s + dv * k.c + CEN[1]]; };
  const depth = (u, v) => { const r = rotUV(u, v); return r[0] + r[1]; };
  const IWf = () => (bnd() || { IW: 200 }).IW, IHf = () => (bnd() || { IH: 200 }).IH;
  const cx = (u, v) => { const k = cam(), [ru, rv] = rotUV(u, v, k), x = org()[0] + 2 * (ru - rv); return mir() ? IWf() - x : x; }, cy = (u, v, z = 0) => { const k = cam(), [ru, rv] = rotUV(u, v, k); return org()[1] + ((ru + rv) * k.A - z * k.B); };
  // 剖切：朝镜头的方向（世界坐标）
  const cutO = () => { if (cut == null || fp) return null; /* 第一人称：永远看完整的浮岛（剖开会把屋顶切掉、碰撞也跟着变） */ const k = cam(); return { lv: cut, vu: k.c + k.s, vv: k.c - k.s, low: focus ? 0.3 : 2.2 }; };
  const quad = () => { const k = cam(); return (k.c + k.s > 0 ? 1 : 0) + (k.c - k.s > 0 ? 2 : 0); };
  // 外面的画框：按整座浮岛（外部）算，进屋剖切时画框不跳
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
  // 详细视图里放大多少倍：让画框和看整座浮岛时差不多大
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
  // 浮岛的“身体”：锅炉的柴（0~100）。柴够，翅膀扇得有劲、有热水、花房暖和；没柴了慢慢扇，洗澡水是凉的
  const fort = () => { const e = E(); if (!e.fort) e.fort = { fuel: 70, t: Date.now(), egg: '' }; const f = e.fort, now = Date.now(); if (now - f.t > 60000) { f.fuel = Math.max(0, f.fuel - ((now - f.t) / 60000) * 0.12); f.t = now; } return f; };
  const power = () => { const f = fort().fuel; return f <= 0 ? 0.08 : 0.25 + 0.75 * Math.min(1, f / 60); };

  // ---------- 地面：每层的地板、墙（门洞）、陈设、家具 ----------
  const furnObs = () => FURN.layout(E()).filter((it) => !FURN.D[it.f].walk && (fdrag ? it !== fdrag.it : true)).flatMap((it) => F.rectObs(F.frameOf(it.room || 'living'), F.roomLv(it.room || 'living'), FURN.rect(it, 0.3)));
  const extraObs = () => furnObs().concat((E().isleDeco || []).map((id, i) => (id && SLOTS[i] ? [1, 'c', SLOTS[i][0], SLOTS[i][1], id === 'lampPost' ? 0.4 : 1.5] : null)).filter(Boolean));
  const AREA = { z: Z, inF: F.AREA.inF, ramps: F.AREA.ramps, obst: () => F.AREA.obst(extraObs()), solid: () => F.AREA.solid(extraObs()) };
  const area = () => AREA;
  const Zf = (a, lv) => a.z[lv];
  const rampT = (r, u, v) => (r.spiral ? 0 : U.clamp(((r.axis === 'u' ? u : v) - r.lo) / (r.hi - r.lo), 0, 1));
  /* 螺旋楼梯（树心里的）：沿着弧线的一串点，每个点带自己的高度；两头是树干外面门口的一点 */
  const spPt = (r, f) => { const ang = r.ang0 + (r.ang1 - r.ang0) * f, rr = (r.r0 + r.r1) / 2; return { u: r.cu + Math.cos(ang) * rr, v: r.cv + Math.sin(ang) * rr, z: Z[r.a] + (Z[r.b] - Z[r.a]) * f }; };
  function rampArc(r, up) { if (!r.spiral) return []; const n = 30, out = [up ? r.landA : r.landB]; for (let k = 0; k <= n; k++) out.push(spPt(r, up ? k / n : 1 - k / n)); out.push(up ? r.landB : r.landA); return out.map((q) => ({ u: q.u != null ? q.u : q[0], v: q.v != null ? q.v : q[1], z: q.z != null ? q.z : Z[up ? (q === r.landA ? r.a : r.b) : (q === r.landB ? r.b : r.a)] })); }
  const endsRaw = (S2) => { if (S2.spiral) return [S2.doorA, S2.doorB]; const mid = S2.axis === 'u' ? (S2.v0 + S2.v1) / 2 : (S2.u0 + S2.u1) / 2; return S2.axis === 'u' ? [[S2.lo, mid], [S2.hi, mid]] : [[mid, S2.lo], [mid, S2.hi]]; };
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
  const rampEnds = (r) => { if (r.spiral) return [r.doorA, r.doorB]; const mid = r.axis === 'u' ? (r.v0 + r.v1) / 2 : (r.u0 + r.u1) / 2, sg = Math.sign(r.lo - r.hi), P = (e, s) => (r.axis === 'u' ? [e + s * 0.9, mid] : [mid, e + s * 0.9]); return [P(r.lo, sg), P(r.hi, -sg)]; };
  function plan(a, ip, u, v, lv) {
    const pts = []; let cur = [ip.u, ip.v], cl = ip.lv;
    if (cl !== lv) for (const [r, to] of route(a, cl, lv)) {
      const [lo, hi] = rampEnds(r), [en, ex] = to === r.b ? [lo, hi] : [hi, lo];
      for (const q of pathIn(a, cl, cur, en)) pts.push({ u: q[0], v: q[1], lv: cl });
      for (const q of rampArc(r, to === r.b)) pts.push({ u: q.u, v: q.v, z: q.z, lv: to, ramp: r }); // 螺旋楼梯：沿着弧线一圈圈走
      pts.push({ u: ex[0], v: ex[1], lv: to, ramp: r.spiral ? null : r }); cur = ex; cl = to;
    }
    if (cl === lv) for (const q of pathIn(a, cl, cur, [u, v])) pts.push({ u: q[0], v: q[1], lv: cl });
    return pts;
  }

  // ---------- 位置、缩放 ----------
  function safeB() { let b = G.H - (document.body.classList.contains('web') ? 44 : 0); try { const sc = window.screen; if (sc && sc.availHeight) { const v = (sc.availTop || 0) + sc.availHeight - (window.screenY || 0); if (v > 200 && v < b) b = v; } } catch (e) {} return b; }
  PP.safeB = safeB;
  // 缩放不再被屏幕大小卡住：放大到比屏幕还大时，浮岛框伸出屏幕外，只渲染看得见的那一块（像放大镜），拖动空白处平移
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
    /* 第一人称小窗口：拖边框自由缩放（0.37），大小记在 fpBox（占屏幕的比例） */
    else if (fp && S().fpBox) { const b = S().fpBox; L.vx0 = Math.round(U.clamp(b.x0, 0, 0.95) * G.W); L.vy0 = Math.round(U.clamp(b.y0, 0, 0.95) * sb); L.vx1 = Math.round(U.clamp(b.x1, b.x0 + 0.05, 1) * G.W); L.vy1 = Math.round(U.clamp(b.y1, b.y0 + 0.05, 1) * sb); L.vw = Math.max(160, L.vx1 - L.vx0); L.vh = Math.max(120, L.vy1 - L.vy0); L.vx1 = L.vx0 + L.vw; L.vy1 = L.vy0 + L.vh; }
    const rs = document.documentElement.style; rs.setProperty('--isk', U.clamp(u / Z0, 0.4, 2.6).toFixed(3)); rs.setProperty('--isR', Math.max(4, G.W - L.x1) + 'px'); rs.setProperty('--isB', Math.max(4, G.H - L.y0 + 6) + 'px');
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
  const HALL_OUT = { u: 25, v: 49.5, lv: 1 }; // 门厅南门外面的码头（客人、出门回来的伙伴都从码头上岸）
  function groundY() { if (!L) layout(); return Math.round(scrV(HALL_OUT.u, HALL_OUT.v, 0)); }
  function zone() { if (!L) layout(); return [L.vx0 + 4, L.vx1 - 4]; }
  const start = () => HALL_OUT;
  function setIp(p, u, v, lv) { const a = area(); lv = a.z[lv] != null ? lv : 1; p.ip = { u, v, lv, z: Zf(a, lv) }; p.isleLv = lv; p.x = scrU(u, v); }
  function ipOf(p) { if (!p.ip) { const s = start(); setIp(p, s.u + U.rand(-1, 1), s.v + U.rand(0, 1), s.lv); } return p.ip; }
  /* 0.38：浮岛里的动物画成 3D（把像素画吹鼓成立体，跟场景一起画：有光照、会被墙和家具挡住）。right / toward：精灵往右、朝镜头的方向 */
  const ZK3 = 2.83 / 1.155;
  function pets3d(dm, right, toward, skip, inFp) {
    for (const p of G.all) p._3d = false; if (!PP.PET3D || S().pet3d === false) return;
    for (const p of G.pets) { if (p.held || (!inFp && p.isleHide) || p.inDoor || p.outing || p.inDen || (skip && skip(p))) continue;
      const me = fp && p === fp.p, sp = p.isleSpot, q = me ? fp.q : sp ? { u: sp.u, v: sp.v, z: sp.z != null ? sp.z : (p.ip ? p.ip.z : 0) } : ipOf(p); if (!q) continue;
      const z = q.z != null ? q.z : Z[q.lv || 1]; let buf; const bv = p._backView; p._backView = !!me; try { buf = p.frameBuf(); } catch (e) { p._backView = bv; continue; } p._backView = bv;
      const human = PP.SPR.HUMAN && PP.SPR.HUMAN.has(p.d.species), k = (PH / (human ? 37 : 28)) / ZK3 * (p.scale3d || 1); try { PP.PET3D.put(dm, buf, [q.u, q.v, z], right, toward, k); p._3d = true; } catch (e) {} } }
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
      if (d <= left) { du += t.u - q.u; dv += t.v - q.v; q.u = t.u; q.v = t.v; q.lv = t.lv; p.isleLv = t.lv; q.z = t.z != null ? t.z : Zf(a, t.lv); left -= d; moved += d; w.i++; }
      else { const k = left / d; du += (t.u - q.u) * k; dv += (t.v - q.v) * k; q.u += (t.u - q.u) * k; q.v += (t.v - q.v) * k; moved += left; left = 0; if (t.z != null) q.z += (t.z - q.z) * k; else if (t.ramp) { const r = t.ramp; q.z = a.z[r.a] + (a.z[r.b] - a.z[r.a]) * rampT(r, q.u, q.v); } else q.z = Zf(a, q.lv); }
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
    else if (!w && G.isle) { if (fp) { lookFree(); fp = null; PP.fpOn = false; if (fpBarEl) { fpBarEl.remove(); fpBarEl = null; } if (hotEl) { hotEl.remove(); hotEl = null; } document.body.classList.remove('fpon'); } G.isle = null; cut = null; focus = null; fbC = null; cBar(); for (const p of G.all) { p.isleSpot = null; p.ip = null; p.iw = null; p.lane = null; p.fishing = null; p.isleLv = 0; p.tool = null; p.isleHide = false; } document.body.style.cursor = 'default'; if (petBarEl) { petBarEl.remove(); petBarEl = null; petBarK = ''; } PP.syncPets && PP.syncPets(); window.dispatchEvent(new Event('resize')); }
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
    if (!quiet) PP.ui.toast(`浮岛大小 ${Math.round(L.u / Z0 * 100)}%（在浮岛上滚滚轮也能缩放）`);
  }
  const SIZES = [0, 2.2, 3, 4.2], setSize = (n) => setZoom(SIZES[n] || Z0);
  function resetPos() { S().islePos = null; PP.save.soon(); fit(false); }
  function setMirror(v) { S().isleMirror = !!v; PP.save.soon(); layout(); for (const p of G.pets) { const [u, w] = uvOf(p); p.x = scrU(u, w); } PP.ui.toast(v ? '浮岛朝右' : '浮岛朝左'); }
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
  function opts(c) { const e = E(); return { eco: PP.ECO ? PP.ECO.snap() : null, cut: c, focus: c ? focus : null, season: season(), snow: snowy(), deco: e.isleDeco, tripping: tripping(), farm: PLOTS.map((_, i) => { const inf = PP.econ.plotInfo(i); return inf ? { crop: inf.crop, stage: inf.stage, wet: (e.farm[i].water || 0) > 0 } : null; }), furn: FURN.layout(e), skip: fdrag ? fdrag.i : undefined, pinkBed: !!(e.room || {}).bed, egg: eggOut(), pots: potList() }; }
  function baseKey() { const e = E(); return [PP.ECO ? PP.ECO.key() : '', season(), snowy() ? 1 : 0, (e.isleDeco || []).join(','), farmKey(), tripping() ? 1 : 0, JSON.stringify(FURN.layout(e)), fdrag ? fdrag.i : '', eggOut() ? 1 : 0, JSON.stringify(potList()), dirtyK].join('|'); }
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
    const key = [fp ? null : cut, cut == null || fp ? '' : focus ? focus + ':' + Math.round((+S().isleYaw || 0) / (Math.PI / 12)) : quad(), baseKey()].join('#'); // 详细视图：边转边换（每 15° 重算一次哪几面墙朝着你）
    const s = meshes.main;
    if (s && s.key === key) return s;
    const m = F.build(opts(cutO()));
    const r = (meshes.main = { key, gpu: g3.upload(m, s && s.gpu), cpu: m }); // cpu：第一人称拿它当碰撞（看得见的才挡）
    return r;
  }
  // ---------- 屋里的灯 ----------
  /* 设置：S().lightMode = 'auto'（天一暗就开，默认）/ 'time'（S().lightFrom～S().lightTo 点）/ 'on' / 'off'。
     每间房门边有个开关：按一下就跟自动的反过来；等自动那边自己变了（比如天亮了、到点了），开关的手动设定就作废，回到自动 */
  const lightK = [];
  let lightT = 0;
  function autoLight(r) {
    const s = S(), md = s.lightMode || 'auto';
    if (md === 'on') return true; if (md === 'off') return false;
    if (md === 'time') { const h = new Date().getHours() + new Date().getMinutes() / 60, a = +(s.lightFrom != null ? s.lightFrom : 18), b = +(s.lightTo != null ? s.lightTo : 24); return a <= b ? h >= a && h < b : h >= a || h < b; }
    const ph = phase(), fx = wfx(); if (r && r.id === 'bedroom' && ph === 'night' && G.pets.some((p) => p.inBed)) return false; // 有人在床上睡：卧室的灯自己关
    return ph !== 'day' || (fx.dark || 0) > 0.4 || !!fx.storm;
  }
  function lightOn(i) { const r = F.ROOMS[i], a = autoLight(r), sw = (E().lightSw || {})[r.id]; if (sw && sw.base === a) return sw.on; if (sw) delete E().lightSw[r.id]; return a; }
  function toggleLight(i) { const e = E(), r = F.ROOMS[i], a = autoLight(r), now = lightOn(i); e.lightSw = e.lightSw || {}; e.lightSw[r.id] = { on: !now, base: a }; PP.save.soon(); if (PP.audio && PP.audio.sfx) try { PP.audio.sfx('click'); } catch (x) {} PP.ui.toast((now ? '关灯了' : '开灯了') + '：' + r.nm, 1.2); }
  function lightState() { const now = performance.now(), dt = Math.min(0.2, (now - (lightT || now)) / 1000); lightT = now; const B = F.lightBoxes(); for (let i = 0; i < B.length; i++) { const tg = lightOn(i) ? 1 : 0, c = lightK[i] == null ? tg : lightK[i]; lightK[i] = c + (tg - c) * Math.min(1, dt * 5); } return lightK; }
  function rlights() { const K = lightState(), B = F.lightBoxes(), dayK = phase() === 'night' ? 1 : phase() === 'day' ? 0.4 : 0.75, out = [], bounce = phase() === 'day' ? 0.36 : phase() === 'night' ? 0 : 0.2; /* 白天屋里有从窗户进来的暖光（原神的室内是暖的，不是阴影里的灰蓝） */ for (let i = 0; i < B.length; i++) { const k = Math.max(K[i] * dayK, bounce); out.push({ a: B[i].a, b: B[i].b, k }); /* 关着的灯也传：着色器靠这些范围判断「屋里」（屋里不长苔） */ } return out.slice(0, 40); }
  function lightOpts() {
    const ph = phase(), fx = wfx(), dim = Math.min(1, (fx.cloud || 0) * 0.5 + (fx.rain ? 0.35 : 0) + (fx.snow ? 0.25 : 0) + (fx.dark || 0));
    let sun = [1.02, 0.96, 0.86], sky = [0.58, 0.63, 0.74], gnd = [0.5, 0.47, 0.4], lit = 0, dir = [-0.55, 0.42, 0.72], top = [0.38, 0.62, 0.88], bot = [0.8, 0.9, 0.97]; /* 天空之城 / 原神的白天：很蓝很透的天、暖暖的太阳，阴影是带蓝的而不是灰的 */
    if (ph === 'night') { sun = [0.26, 0.34, 0.62]; sky = [0.2, 0.27, 0.5]; gnd = [0.12, 0.14, 0.26]; lit = 1; dir = [0.4, 0.5, 0.7]; top = [0.04, 0.08, 0.24]; bot = [0.12, 0.2, 0.42]; }
    else if (ph === 'dusk') { sun = [1.08, 0.6, 0.32]; sky = [0.48, 0.42, 0.62]; gnd = [0.36, 0.26, 0.3]; lit = 0.8; dir = [-0.8, 0.5, 0.36]; top = [0.3, 0.32, 0.64]; bot = [1.0, 0.66, 0.42]; }
    else if (ph === 'dawn') { sun = [1.04, 0.8, 0.66]; sky = [0.52, 0.54, 0.74]; gnd = [0.38, 0.32, 0.34]; lit = 0.3; dir = [0.2, 0.75, 0.42]; top = [0.42, 0.6, 0.9]; bot = [1.0, 0.8, 0.7]; }
    if (dim > 0) { sun = sun.map((x) => x * (1 - 0.7 * dim)); sky = sky.map((x, i) => x * (1 - 0.25 * dim) + [0.5, 0.52, 0.58][i] * 0.2 * dim); top = top.map((x, i) => x + ([0.55, 0.58, 0.64][i] - x) * dim * 0.8); bot = bot.map((x, i) => x + ([0.66, 0.68, 0.72][i] - x) * dim * 0.8); lit = Math.max(lit, dim * 0.6); }
    if (cut != null) { sky = sky.map((x, i) => x * 0.85 + [0.12, 0.1, 0.06][i]); if (ph === 'night') { sun = [0.42, 0.36, 0.3]; sky = [0.36, 0.3, 0.28]; } }
    // 夜里有人在床上睡觉：屋里关灯，只剩一点月光（不会看起来像天亮了）
    if (ph === 'night' && G.pets.some((p) => p.inBed)) { sun = [0.16, 0.18, 0.3]; sky = [0.14, 0.15, 0.24]; lit = 1; }
    return { sun: dir, sunCol: sun, sky, gnd, lit, skyTop: top, skyBot: bot, rain: fx.rain || 0, wind: Math.min(1, (fx.wind || 0) + (fx.storm ? 0.5 : 0)), inside: false, time: performance.now() / 1000, center: [28, 26, cut == null ? 10 : Z[cut] + 4], radius: 125, rlights: rlights() };
  }
  const hidden = (p) => ((fp || (+S().islePitch || 45) < 0) ? !p.held : false) || cut != null && p.ip && !p.held && (p.ip.lv > cut || (focus && RM[focus] && (p.ip.lv !== RM[focus].lv || !F.inRoom(RM[focus], p.ip.u, p.ip.v, -0.8))));
  function petCuts() {
    const out = [];
    for (const p of G.pets) { if (p.held || p.isleSpot || p.inDoor || p.inDen || p.isleHide) continue; const q = p.ip; if (!q) continue; const h = 30 * G.S * (p.scaleMul || 1); const pq = pixK(); out.push([(p.x - L.vx0) / pq, (p.y - L.vy0 - (p.hopY || 0)) / pq, h / pq, depth(q.u, q.v), q.z]); }
    return out;
  }
  const DPR = () => window.devicePixelRatio || 1;
  // 像素块最多 2 个屏幕点：放大时看得清细节，不会越放越糊
  const pixOn = () => !!(G.save && S().islePix === true), /* 0.32：默认精细（按屏幕实际像素画、平滑光照），像素风要自己在设置里打开 */ pixD = () => (pixOn() ? Math.min(Math.max(2, Math.round(DPR() * 2)), Math.max(1, Math.round(L.u * DPR() * 0.3))) : 1), pixK = () => pixD() / DPR();
  function clipOf() {
    const r = focus && RM[focus]; if (!r) return null; const top = Z[r.lv] + F.roomH(r) + 0.6;
    const lo = Z[r.lv] - 1.2; if (r.c) return [r.c[0], r.c[1], 1, 0, 1, 1, top, r.c[2] + 0.9, lo];
    const a = r.rot || 0, [x0, y0, x1, y1] = r.r, c = r.rot ? F.toW(r, (x0 + x1) / 2, (y0 + y1) / 2) : [(x0 + x1) / 2, (y0 + y1) / 2];
    return [c[0], c[1], Math.cos(a), Math.sin(a), (x1 - x0) / 2 + 0.9, (y1 - y0) / 2 + 0.9, top, 0, lo];
  }
  let voxSent = null;
  function viewOpts() { if (vox && vox !== voxSent && g3.setVox) { voxSent = vox; try { g3.setVox(vox, VX, VZ); } catch (e) { console.warn(e); } try { relicFit(); } catch (e) {} }
    const k = cam(), q = pixK(), W = Math.ceil(L.w / q), Wv = Math.ceil(L.vw / q), dx = L.vx0 - L.x0, dy = L.vy0 - L.y0, kk = L.u / q;
    const ox = mir() ? org()[0] - (W - Wv) / kk + dx / L.u : org()[0] - dx / L.u;
    return Object.assign({ w: Wv, h: Math.ceil(L.vh / q), ox, oy: org()[1] - dy / L.u, k: kk, mirror: mir(), yaw: k.yaw, pitch: [k.A, k.B], camC: CEN, posterize: pixOn() ? 26 : 0, cel: pixOn(), msaa: !pixOn(), clip: clipOf(), lake: F.LAKE ? [F.LAKE.u, F.LAKE.v, Math.max(F.LAKE.rx, F.LAKE.ry) * (PP.CITY && PP.CITY.POND ? 0.99 : 1.12), F.LAKE.z] : null, /* 0.36：水下的光只在水洞里，岛外面的岩壁不算 */ pond: PP.CITY && PP.CITY.POND ? [PP.CITY.POND.u0, PP.CITY.POND.v0, PP.CITY.POND.u1, PP.CITY.POND.v1] : null, day: phase() === 'night' ? 0 : phase() === 'day' ? 1 : 0.5, stone: PP.CITY ? [PP.CITY.CEN[0] + Math.cos(PP.CITY.CRACK.t) * PP.CITY.CRACK.r, PP.CITY.CEN[1] + Math.sin(PP.CITY.CRACK.t) * PP.CITY.CRACK.r, PP.CITY.STONE.z] : null }, lastLO); } // lake：湖水半透明、湖底光斑
  function render3d() {
    const s = scene(), t = performance.now() / 1000;
    const dm = F.dyn({ t, cut: cutO(), cooking, fire: fort().fuel / 100, power: power(), drag: fdrag ? fdrag.it : null, pinkBed: !!(E().room || {}).bed, lights: lightK.map((k) => (k > 0.5 ? 1 : 0)), relics: E().relics || {}, incense: Date.now() - ((E().shrine || {}).incense || 0) < 30 * 60000 });
    try { const X0 = L.x0 + L.w / 2, Y0 = L.y0 + L.h / 2, a = toUV(X0, Y0, 0), b = toUV(X0 + 10, Y0, 0), c = toUV(X0, Y0 + 10, 0), nr = (d) => { const l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; }; pets3d(dm, nr([b[0] - a[0], b[1] - a[1]]), nr([c[0] - a[0], c[1] - a[1]])); } catch (e) {}
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
  // 古树水城只有一根真烟囱：地窖石炉的烟道，伸出地窖屋顶的平台
  const CHIMS = (() => { const r = F.RM.store; if (!r || !r.c) return []; const a = r.deg * Math.PI / 180, f = 4.35, s2 = -2.4; return [[r.c[0] + Math.cos(a) * f - Math.sin(a) * s2, r.c[1] + Math.sin(a) * f + Math.cos(a) * s2, Z[1] + 14.5]]; })();

  // ---------- 画 ----------
  // ---------- 俯视时的天空和远方（一整幅画：渐变的天、太阳光束或星月、远远在下面的田野、三层慢慢飘的积云） ----------
  const hs2 = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  function animeCloud(ctx, cx, cy, R, seed, night, al) {
    const base = night ? 'rgba(64,72,112,' : 'rgba(168,190,232,', body = night ? 'rgba(118,128,168,' : 'rgba(255,255,255,', hl = night ? 'rgba(150,160,200,' : 'rgba(255,253,244,', n = 6 + Math.floor(hs2(seed, 1) * 5), P = [];
    for (let k = 0; k < n; k++) { const t = k / (n - 1), up = Math.sin(t * Math.PI) * R * (0.7 + hs2(k, seed) * 0.6), rr = R * (0.42 + Math.sin(t * Math.PI) * 0.45 + hs2(seed, k) * 0.15); P.push([cx + (t - 0.5) * R * 3.4, cy - up * 0.6, rr]); }
    ctx.fillStyle = base + al + ')'; for (const [x, y, r] of P) { ctx.beginPath(); ctx.arc(x, y + r * 0.2, r, 0, 6.283); ctx.fill(); } ctx.fillRect(cx - R * 1.95, cy, R * 3.9, R * 0.3);
    ctx.fillStyle = body + al + ')'; for (const [x, y, r] of P) { ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = hl + al * 0.95 + ')'; for (const [x, y, r] of P) { ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.25, r * 0.58, 0, 6.283); ctx.fill(); }
  }
  function drawIsoSky(ctx, now) {
    ctx.save(); ctx.beginPath(); ctx.rect(L.vx0, L.vy0, L.vw, L.vh); ctx.clip(); try { drawIsoSky0(ctx, now); } finally { ctx.restore(); }
  }
  function drawIsoSky0(ctx, now) {
    const x0 = L.vx0, y0 = L.vy0, w = L.vw, h = L.vh, lo = lightOpts(), ph = phase(), ngt = ph === 'night', c3 = (a) => `rgb(${a.map((v) => Math.round(v * 255)).join(',')})`, t = now / 1000, K = Math.min(w, h) / 500;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, c3(lo.skyTop)); g.addColorStop(0.62, c3(lo.skyBot)); g.addColorStop(1, c3(lo.skyBot.map((v) => v * 0.92))); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
    if (ngt) { for (let i = 0; i < 120; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + i); ctx.globalAlpha = (0.3 + hs2(i, 3) * 0.7) * tw; ctx.fillStyle = '#fff8e8'; const r = (hs2(i, 4) < 0.1 ? 1.6 : 0.9) * K; ctx.fillRect(x0 + hs2(i, 1) * w, y0 + hs2(i, 2) * h * 0.6, r * 2, r * 2); }
      ctx.globalAlpha = 1; const mx = x0 + w * 0.82, my = y0 + h * 0.16, mr = 16 * K, mg = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 5); mg.addColorStop(0, 'rgba(230,236,255,.35)'); mg.addColorStop(1, 'rgba(230,236,255,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10); ctx.fillStyle = '#f4f2e8'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill(); ctx.fillStyle = c3(lo.skyTop); ctx.beginPath(); ctx.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.85, 0, 6.283); ctx.fill(); }
    else { const sx = x0 + w * 0.85, sy = y0 + h * (ph === 'dusk' || ph === 'dawn' ? 0.42 : 0.12), sr = h * 0.5, sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr); sg.addColorStop(0, 'rgba(255,250,228,.95)'); sg.addColorStop(0.06, 'rgba(255,240,200,.7)'); sg.addColorStop(0.3, 'rgba(255,230,190,.16)'); sg.addColorStop(1, 'rgba(255,230,190,0)'); ctx.fillStyle = sg; ctx.fillRect(x0, y0, w, h);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const a = 2.2 + i * 0.12 + Math.sin(t * 0.1 + i) * 0.02, len = h * 1.6, wd = h * (0.03 + hs2(i, 7) * 0.05); ctx.fillStyle = `rgba(255,240,200,${0.05 + hs2(i, 8) * 0.04})`; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - 0.02) * len, sy + Math.sin(a - 0.02) * len); ctx.lineTo(sx + Math.cos(a + 0.02) * len + wd, sy + Math.sin(a + 0.02) * len); ctx.closePath(); ctx.fill(); } ctx.restore(); }
    // 远远在下面的田野：一条一条往后退，被雾盖住一大半
    const gy = y0 + h * 0.74, pal = BIOME[underScene()] || BIOME_DEF; for (let r = 0; r < 7; r++) { const yy = gy + r * r * h * 0.006 + r * h * 0.02, hh = h * (0.012 + r * 0.008), off = t * (0.05 + r * 0.035), base = Math.floor(off), shift = off - base; /* 一块块田慢慢往后退，每块田颜色固定跟着走（以前每隔几秒全部换一次颜色，还跑得飞快，看着一直闪） */
      for (let k = -1; k < 14; k++) { const xx = x0 + ((k + shift) / 12) * w, col = pal[2 + Math.floor(hs2(k - base + r * 31, r * 7) * 3)] || pal[0]; ctx.globalAlpha = 0.25 + r * 0.08; ctx.fillStyle = col; ctx.fillRect(xx, yy, w / 12 - 2, hh); } }
    ctx.globalAlpha = 1; const fogG = ctx.createLinearGradient(0, gy - h * 0.06, 0, y0 + h); fogG.addColorStop(0, c3(lo.skyBot)); fogG.addColorStop(0.35, `rgba(${lo.skyBot.map((v) => Math.round(v * 255)).join(',')},.55)`); fogG.addColorStop(1, `rgba(${lo.skyBot.map((v) => Math.round(v * 255)).join(',')},.15)`); ctx.fillStyle = fogG; ctx.fillRect(x0, gy - h * 0.06, w, y0 + h - gy + h * 0.06);
    // 三层积云：远处小而淡、慢；浮岛背后大一点；最下面一片云海
    for (const [ly, cnt, sz, sp, al] of [[0.28, 5, 0.07, 3, 0.55], [0.5, 4, 0.11, 6, 0.8], [0.86, 7, 0.13, 10, 0.92]]) for (let i = 0; i < cnt; i++) { const R = h * sz * (0.8 + hs2(i, ly * 10) * 0.5), span = w + R * 8, xx = x0 - R * 4 + ((hs2(i, ly * 7) * span + t * sp * K) % span), yy = y0 + h * ly + (hs2(i, ly * 3) - 0.5) * h * 0.08; animeCloud(ctx, xx, yy, R, i * 13 + ly * 100, ngt, al * (ngt ? 0.38 : 1)); }
  }
  /* 伙伴状态栏（0.36）：浮岛里一直在画面上方显示每个伙伴的饱腹、口渴、精力、快乐（一格一格的小条），
     下面一行写清楚能不能出门探险、不能的话差什么；点「喂」直接打开背包喂它 */
  let petBarEl = null, petBarK = '', petBarT = 0;
  function petBar() {
    const show = G.isle && L && S().petBar !== false, now = performance.now();
    if (!show) { if (petBarEl) { petBarEl.remove(); petBarEl = null; petBarK = ''; } return; }
    if (now - petBarT < 500 && petBarEl) return; petBarT = now;
    const pets = G.pets.filter((p) => !p.d.wild).slice(0, 4); if (!pets.length) return;
    const bar = (v, c) => `<i class="pbar"><i style="width:${Math.max(0, Math.min(100, v))}%;background:${v < 25 ? '#e0604a' : v < 45 ? '#e8b040' : c}"></i></i>`;
    const rows = pets.map((p) => { const n = p.n, why = PP.econ.canTrip ? PP.econ.canTrip(p) : null, lv = PP.econ.lvOf ? PP.econ.lvOf(p) : '';
      return `<div class="prow"><b>${esc(p.name)}</b><small>Lv${lv}</small><span title="饱腹">🍙${bar(n.hunger, '#7ab85a')}</span><span title="口渴">💧${bar(n.thirst, '#5aa8d8')}</span><span title="精力">⚡${bar(n.energy, '#c8a84a')}</span><span title="快乐">😊${bar(n.fun, '#e88ab0')}</span>
        <button data-feed="${p.uid != null ? p.uid : esc(p.name)}">喂</button><em class="${why ? 'no' : 'ok'}">${why ? '探险：' + esc(why) : p.d.trip ? '在外面探险' : '探险：✓ 可以出门'}</em></div>`; }).join('');
    const sc = U.clamp(Math.min(L.vw, L.vh) / 560, 0.4, 2.6), k = rows + (fp ? 'f' : 'i') + [L.vx0, L.vy0, L.vw, sc.toFixed(3)].join(',');
    if (!petBarEl) { petBarEl = document.createElement('div'); petBarEl.className = 'petbar'; document.getElementById('ui').appendChild(petBarEl);
      petBarEl.addEventListener('mousedown', (ev) => ev.stopPropagation());
      petBarEl.addEventListener('click', (ev) => { const b = ev.target.closest('button[data-feed]'); if (!b) return; const p = G.pets.find((q) => String(q.uid != null ? q.uid : q.name) === b.dataset.feed); if (fp) lookFree(); PP.econ.openPanel('bag', { pet: p }); }); }
    if (k !== petBarK) { petBarK = k; petBarEl.innerHTML = rows; petBarEl.style.left = (L.vx0 + L.vw / 2) + 'px'; petBarEl.style.top = (L.vy0 + (fp ? 8 : 6)) + 'px'; petBarEl.style.transformOrigin = 'center top'; petBarEl.style.transform = `translateX(-50%) scale(${sc.toFixed(3)})`; petBarEl.style.maxWidth = Math.round(L.vw * 0.96 / sc) + 'px'; PP.refreshInteractive && PP.refreshInteractive(); }
  }
  function renderBack(ctx) {
    try { petBar(); } catch (e) {}
    for (const p of G.all) { if (p.inDen && (p.action !== 'isleUse' || !G.isle)) p.inDen = false; p.isleHide = !!G.isle && hidden(p); }
    if (G.isle) { followTick(); watchdog(); }
    if (!G.isle) return;
    if (!fp && !warm.on && !PP.noWarm) { warm.on = true; setTimeout(warmLoop, 400); }
    if (!L) layout();
    if (fp) { try { fpFrame(ctx); } catch (e) { console.error(e); } return; }
    const u = L.u, nt = night(), now = performance.now(), fx = wfx(), wind = fx.wind || 0, pw = power();
    ctx.save();
    const cv = glOK && g3.ok() && render3d();
    const bgOn = S().isleBg !== false; /* 浮岛视图可以隐藏背景，只显示浮岛（左上角 🖼） */
    if (cut == null && !focus && bgOn) { try { drawIsoSky(ctx, now); } catch (e) {} }
    /* 浮岛底下飘着几朵小云：它是浮在天上的（只在看整座浮岛时画） */
    if (cut == null && !focus && bgOn) { const tt = now / 1000, cu2 = L.u, by = L.vy0 + L.vh * 0.82;
      for (let i = 0; i < 6; i++) { const r1 = (Math.sin(i * 12.99) * 43758.5) % 1, sp2 = 6 + Math.abs(r1) * 8, xx = L.vx0 + ((Math.abs(r1) * L.vw + tt * sp2 * cu2 * 0.3) % (L.vw + 60 * cu2)) - 30 * cu2, yy = by + (i % 3) * 5 * cu2 - 6 * cu2, R = (5 + (i % 3) * 2) * cu2;
        ctx.globalAlpha = nt ? 0.35 : 0.6; ctx.fillStyle = nt ? '#9aa4c0' : '#ffffff';
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(xx + (k - 1) * R * 0.8, yy - (k === 1 ? R * 0.35 : 0), R * 0.7, R * 0.42, 0, 0, 6.283); ctx.fill(); } }
      ctx.globalAlpha = 1; }
    if (cv) { ctx.imageSmoothingEnabled = false; const q = pixK(), d = DPR(); ctx.drawImage(cv, Math.round(L.vx0 * d) / d, Math.round(L.vy0 * d) / d, cv.width * q, cv.height * q); }
    if (cv) { try { lifeLayer(ctx); } catch (e) {} }
    else { glOK = false; ctx.fillStyle = 'rgba(40,30,50,.8)'; ctx.fillRect(L.x0 + L.w * 0.1, L.y0 + L.h * 0.45, L.w * 0.8, 40); ctx.fillStyle = '#fff'; ctx.font = PP.FONT(12); ctx.fillText('这台电脑没法开启 3D 渲染（WebGL2），浮岛画不出来', L.x0 + L.w * 0.12, L.y0 + L.h * 0.45 + 24); }
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
  const doorKeep = (rid) => { const r = RM[rid], B = rbox(rid); return F.PASS.filter((p) => p.lv === r.lv && p.F === F.frameOf(rid) && p.r[2] > B[0] - 0.5 && p.r[0] < B[2] + 0.5 && p.r[3] > B[1] - 0.5 && p.r[1] < B[3] + 0.5).map((p) => [p.r[0] - 1.5, p.r[1] - 1.5, p.r[2] + 1.5, p.r[3] + 1.5]); } // 门口留 1.5 格空地：人是真实身高，不能指望从灯头、书梯底下钻过去; // 门洞外面留 0.7 格通道就够了（以前 1.3，小房间几乎全被划成通道，家具摆不进来）
  function fOK(it, i) {
    const d = FURN.D[it.f], rid = it.room || 'living', r = FURN.rect(it);
    if (!RM[rid] || !inRoomL(rid, r)) return (fOK.why = '出了房间', false);
    for (const q of F.RAMPS) if (!q.out && (q.a === RM[rid].lv || q.b === RM[rid].lv) && !F.frameOf(rid) && ovl(r, q.axis === 'u' ? [q.u0 - 3.5, q.v0 - 1.2, q.u1 + 3.5, q.v1 + 1.2] : [q.u0 - 1.2, q.v0 - 3.5, q.u1 + 1.2, q.v1 + 3.5])) return (fOK.why = '楼梯', false); // 楼梯两头的平台也要空着
    if (d.walk) return true;
    for (const f of F.FIX) if (f.room === rid) for (const b of f.obL || f.ob) if (ovl(r, b)) return (fOK.why = '固定陈设 ' + f.do, false);
    if (rid === 'bedroom' && ovl(r, [27.4, 6.5, 31.4, 8.4])) return (fOK.why = '壁炉', false); // 壁炉
    for (const b of doorKeep(rid)) if (ovl(r, b)) return (fOK.why = '门口', false);
    const L0 = FURN.layout(E());
    for (let j = 0; j < L0.length; j++) { if (j === i) continue; const o = L0[j]; if ((o.room || 'living') !== rid) continue; if (FURN.D[o.f].walk) { if (ovl(r, [o.u - 1.2, o.v - 1.2, o.u + 1.2, o.v + 1.2])) return (fOK.why = '地毯中心 ' + o.f, false); continue; } if (ovl(r, FURN.rect(o, -0.05))) return (fOK.why = '家具 ' + o.f, false); }
    return true;
  }
  function fFree(it, i) {
    const rid = it.room || 'living', R0 = rbox(rid), cu = (R0[0] + R0[2]) / 2, cv = (R0[1] + R0[3]) / 2, c = Object.assign({}, it);
    for (let rad = 0; rad < 14; rad += 0.5) for (let a = 0; a < 16; a++) { c.u = Math.round((cu + Math.cos(a / 8 * Math.PI) * rad) * 2) / 2; c.v = Math.round((cv + Math.sin(a / 8 * Math.PI) * rad) * 2) / 2; for (const r of [it.r, (it.r + 1) % 4]) { c.r = r; if (fOK(c, i)) return Object.assign({}, c); } }
    return null;
  }
  // 老存档：原来的小屋（楼下 + 阁楼）→ 浮岛的起居室和卧室，按比例搬过去，放不下的收起来
  function migrateFurn() {
    const e = E(); if (!e || e.layoutV >= 9) return; /* 9：古树水城（房间都是围着大树的圆屋子了），家具重新检查一遍 */ if (e.layoutV >= 4) { repairFurn(e); return; } if (e.layoutV === 3) { furnish2(e); return; } if (e.layoutV === 2) { furnishRooms(e); return; }
    const L0 = FURN.layout(e), out = [];
    const map = (it) => { const bed = !!it.lv, rid = bed ? 'bedroom' : 'living', R0 = RM[rid].r, src = bed ? [4, 4, 22, 18] : [4, 4, 37.8, 32.6]; return Object.assign({}, it, { room: rid, lv: undefined, u: R0[0] + 1 + ((it.u - src[0]) / (src[2] - src[0])) * (R0[2] - R0[0] - 2), v: R0[1] + 1 + ((it.v - src[1]) / (src[3] - src[1])) * (R0[3] - R0[1] - 2) }); };
    e.layout = []; for (const it of L0) { const n = map(it); delete n.lv; e.layout.push(n); const i = e.layout.length - 1; if (!fOK(n, i)) { const f = fFree(n, i); if (f) e.layout[i] = f; else e.layout.pop(); } }
    e.layoutV = 2; furnishRooms(e); dirty(); PP.save.soon();
  }
  // 第一次进到浮岛 2.0：给每间房先摆上一套合适的家具（之后随你挪、收、换）
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
    e.layoutV = 3; furnish2(e);
  }
  /* 第二批：让家像家（沙发、茶几、餐椅、衣柜、书架、插花……）；大件靠墙放、面朝屋里，不堆在房间正中间 */
  const WALL_F = new Set(['sofa', 'wardrobe', 'dresser', 'lowshelf', 'nightstand', 'vase', 'sidetable', 'bigshelf', 'pantry', 'cupboard', 'clock', 'toolwall', 'seedrack', 'flowerstand', 'hangplant', 'screen']);
  const ROOM_SET2 = { living: ['sofa', 'coffeetable', 'lowshelf', 'vase', 'sidetable'], bedroom: ['wardrobe', 'nightstand', 'dresser'], dining: ['vase'], library: ['lowshelf', 'lowshelf', 'sidetable'], hall: ['vase', 'lowshelf'], kitchen: ['vase'] };
  function placeWall(e, it) {
    const r = RM[it.room]; if (!r || r.c) return placeReach(e, it);
    const R0 = rbox(it.room), L0 = FURN.layout(e), k0 = FURN.rect({ f: it.f, u: 0, v: 0, r: 0 }), hw = (k0[2] - k0[0]) / 2, hd = (k0[3] - k0[1]) / 2, pad = 0.75;
    const walls = [['v0', 0], ['u0', 3], ['v1', 2], ['u1', 1]], h = Math.abs([...it.f].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)) % 4;
    for (let w = 0; w < 4; w++) { const [side, rot] = walls[(w + h) % 4], alongV = side[0] === 'u', lo = (alongV ? R0[1] : R0[0]) + hw + pad, hi = (alongV ? R0[3] : R0[2]) - hw - pad; if (hi < lo) continue;
      const mid = (lo + hi) / 2;
      for (let k = 0; k <= Math.ceil((hi - lo) / 0.5); k++) { const x = mid + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5; if (x < lo || x > hi) continue;
        const c = Object.assign({}, it, { r: rot }); if (side === 'v0') { c.u = x; c.v = R0[1] + hd + pad; } else if (side === 'v1') { c.u = x; c.v = R0[3] - hd - pad; } else if (side === 'u0') { c.v = x; c.u = R0[0] + hd + pad; } else { c.v = x; c.u = R0[2] - hd - pad; }
        if (!fOK(c, -1)) continue; L0.push(c); if (reachOK(it.room)) return true; L0.pop(); } }
    return placeReach(e, it);
  }
  function furnish2(e) {
    for (const rid in ROOM_SET2) { if (!RM[rid]) continue; for (const f of ROOM_SET2[rid]) { if (!FURN.D[f] || FURN.layout(e).length >= FURN.MAXN) continue; (WALL_F.has(f) ? placeWall : placeReach)(e, { f, u: 0, v: 0, r: 0, room: rid }); } }
    /* 餐桌两边各两把椅子，面朝桌子 */
    if (RM.dining && FURN.D.chair) { const L0 = FURN.layout(e); for (const [u, v, r] of [[33.6, 20.7, 2], [36.4, 20.7, 2], [30.9, 18.1, 3], [39.1, 18.1, 1]]) { const c = { f: 'chair', u, v, r, room: 'dining' }; if (L0.length < FURN.MAXN && fOK(c, -1)) { L0.push(c); if (!reachOK('dining')) L0.pop(); } } }
    e.layoutV = 4; repairFurn(e);
  }
  /* 浮岛改了结构（比如塔楼楼梯挪了位置）：放不下的家具挪到附近空地，实在没地方就收进仓库 */
  function repairFurn(e) {
    const L0 = FURN.layout(e);
    for (let i = L0.length - 1; i >= 0; i--) { if (fOK(L0[i], i)) continue; const f = fFree(L0[i], i); if (f) L0[i] = f; else L0.splice(i, 1); }
    // 哪间屋有门走不到（家具挡在门口，以前是从桌子底下钻过去的）：把挡路的那件挪到能走通的地方
    for (const rid of Object.keys(RM)) { if (RM[rid].hut || reachOK(rid)) continue;
      const idx = L0.map((it, i) => [it, i]).filter(([it]) => it.room === rid).sort((A, B) => { const ra = FURN.rect(A[0], 0), rb = FURN.rect(B[0], 0); return (rb[2] - rb[0]) * (rb[3] - rb[1]) - (ra[2] - ra[0]) * (ra[3] - ra[1]); });
      for (const [it] of idx) { const i = L0.indexOf(it); L0.splice(i, 1); if (!reachOK(rid)) { L0.splice(i, 0, it); continue; } (WALL_F.has(it.f) ? placeWall : placeReach)(e, Object.assign({}, it)); break; } }
    e.layoutV = 9; dirty(); PP.save.soon();
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
    if (fp && lv != null) return; // 第一人称里不剖切
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
    if (fp) return;
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
      for (const S2 of F.RAMPS) { const [e0, e1] = endsRaw(S2), near = (p0, lv) => { for (const d of [0, 0.8, 1.6, 2.4]) for (let k = 0; k < 8; k++) { const r2 = F.roomAt(p0[0] + Math.cos(k * 0.785) * d, p0[1] + Math.sin(k * 0.785) * d, lv); if (r2) return r2; } return null; };
        add(near(e0, S2.a), near(e1, S2.b), 'stair'); } }
    return [...(nbC[id] || new Map())].map(([k, how]) => ({ id: k, how, r: RM[k] }));
  }
  function goRoom(id) { const p = mainP(), r = RM[id]; setFocus(id); if (p && r) { p.interrupt(true); p.inDoor = false; p.fishing = null; p.tool = null; const q = roomSpot(id); p.run('isleGo', A.isleGo, q.u, q.v, q.lv); p._byYou = true; p._stayUntil = performance.now() + 25000; } }
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
        + B('god', '上帝视角', '从天上看整座浮岛：Ctrl+左键拖动转，滚轮缩放', !fp ? 'class="on wide"' : 'class="wide"')
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
  // 剖切条：在浮岛框的左下角：第几层、上一层 / 下一层 / 回到外面
  function cBar() {
    if (!G.isle || !L || fp) { if (cbar) { cbar.remove(); cbar = null; PP.refreshInteractive(); } placeTags(); return; }
    if (!cbar) {
      cbar = document.createElement('div'); cbar.className = 'cutbar'; document.getElementById('ui').appendChild(cbar); S().cbarSeen = (S().cbarSeen || 0) + 1; PP.save.soon();
      cbar.addEventListener('mousedown', (ev) => ev.stopPropagation());
      cbar.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; const a = b.dataset.a; if (a === 'up') setCut(Math.min(3, cut + 1)); else if (a === 'down') setCut(cut - 1); else if (a === 'out') setCut(null); else if (a === 'furn') furnEdit(!fedit); else if (a === 'room') { if (b.dataset.go) goRoom(b.dataset.r); else setFocus(b.dataset.r); } else if (a === 'level') setCut(cut); else if (a === 'in') setCut(1); else if (a === 'bg') { S().isleBg = S().isleBg === false; PP.save.soon(); cBar(); } else viewAct(a, b); });
    }
    const k = [cut, fedit, focus, vKey(), S().isleBg !== false].join('|');
    // 竖着的一列小方块按钮，贴在浮岛框里面的左上角：不占浮岛外面的地方
    if (cbar.dataset.k !== k) { cbar.dataset.k = k; const r = focus && RM[focus], B = (a, t, tip, x = '') => `<button data-a="${a}" title="${tip}" ${x}>${t}</button>`;
      cbar.innerHTML = cut == null ? `<span class="lv" title="浮岛外观">浮岛</span>` + viewHTML() + B('in', '▤', '剖开看每一层（里面）') + B('bg', S().isleBg === false ? '🌤' : '🖼', S().isleBg === false ? '显示背景（天空和云）' : '隐藏背景，只看浮岛', S().isleBg === false ? 'class="on"' : '') : `<span class="lv" title="${r ? esc(r.nm) + ' · ' + F.NAME[r.lv] : F.NAME[cut]}">${r ? esc(r.nm.slice(-3)) : F.NAME[cut]}</span>`
        + (r ? '' : B('up', '▲', '上一层', cut >= 3 ? 'disabled' : '') + B('down', '▼', '下一层', cut <= 0 ? 'disabled' : ''))
        + ((r ? r.lv : cut) >= 1 ? B('furn', '✎', fedit ? '布置中（再点一下结束）' : '布置家具', fedit ? 'class="on"' : '') : '')
        + viewHTML()
        + (r ? B('level', '▦', '看这一整层') : '')
        + B('out', '✕', '回到外面看整座浮岛', 'class="primary"'); }
    cbar.classList.add('vert');
    /* 按钮旁边的文字：前几次进浮岛一直显示，之后鼠标停上去才显示 */
    cbar.querySelectorAll('button[title]').forEach((b) => { if (!b.dataset.l) b.dataset.l = b.title.split('（')[0]; });
    cbar.classList.toggle('tips', (S().cbarSeen || 0) < 4);
    const sc = U.clamp(Math.min(L.vw, L.vh) / 560, 0.4, 2.6);
    /* 每一帧都会来这里：只有按钮内容或位置真的变了才动 DOM，不然按钮一直被重建 → 点不动、一直闪 */
    const pk = [cbar.dataset.k, sc.toFixed(3), L.vx0, L.vy0, cbar.classList.contains('tips')].join('|');
    if (cbar.dataset.pk !== pk) { cbar.dataset.pk = pk; cbar.style.transformOrigin = 'left top'; cbar.style.transform = `scale(${sc.toFixed(3)})`;
      cbar.style.left = Math.max(2, L.vx0 + 6) + 'px'; cbar.style.top = Math.max(2, L.vy0 + 6) + 'px'; tagsKey = ''; PP.refreshInteractive(); }
    placeTags();
  }
  // 画面里的标签：整层看时每个房间头上一个名牌（点了进去）；详细视图里每个门口 / 楼梯口一个门牌（点了走过去）
  let tagsEl = null, tagsKey = '';
  function tagList() {
    if (cut == null || fedit) return [];
    if (focus && RM[focus]) { const r = RM[focus], out = [], seen = new Set();
      for (const P of F.PASS) { if (P.lv !== r.lv) continue; const c = P.F ? F.toW(P.F, (P.r[0] + P.r[2]) / 2, (P.r[1] + P.r[3]) / 2) : [(P.r[0] + P.r[2]) / 2, (P.r[1] + P.r[3]) / 2]; if (!F.inRoom(r, c[0], c[1], -1.6)) continue;
        for (const n of neighbours(r.id)) { if (n.how !== 'door' || seen.has(n.id) || !F.inRoom(n.r, c[0], c[1], -1.6)) continue; seen.add(n.id); out.push({ u: c[0], v: c[1], z: Z[r.lv] + 4.5, t: '→ ' + n.r.nm, go: n.id }); } }
      for (const S2 of F.RAMPS) {
        for (const n of neighbours(r.id)) { if (n.how !== 'stair' || seen.has(n.id)) continue; const [lo, hi] = endsRaw(S2);
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
      /* 按下就生效（不等 click）：镜头在动、牌子在挪时，click 常常落不到按钮上 → 以前点了没反应 */
      tagsEl.addEventListener('mousedown', (ev) => { ev.stopPropagation(); if (ev.button !== 0) return; const b = ev.target.closest('button'); if (!b) return; ev.preventDefault(); if (b.dataset.go) goRoom(b.dataset.go); else if (b.dataset.room) setFocus(b.dataset.room); }); }
    const fs = U.clamp(Math.min(L.vw, L.vh) / 42, 6, 40), list = tagList(); let spare = 0;
    /* 牌子还是那几块：只挪位置，不重建按钮（镜头在动时重建会让按下去的按钮消失 → 点不动、一直闪） */
    const ck = list.map((t) => (t.go || t.room) + ':' + t.t).join('|') + '|' + fs.toFixed(1);
    const pos = list.map((t) => { let x, y; if (t.u == null) { x = L.vx1 - 10; y = L.vy0 + 10 + (spare++) * (fs + 14); } else { x = scrU(t.u, t.v); y = scrV(t.u, t.v, t.z); } return [x, y, !(x < L.vx0 - 20 || x > L.vx1 + 20 || y < L.vy0 - 10 || y > L.vy1 + 10)]; });
    if (tagsEl.dataset.ck !== ck) { tagsEl.dataset.ck = ck;
      tagsEl.innerHTML = list.map((t) => `<button class="${t.go ? 'go' : 'rm'}" style="font-size:${fs.toFixed(1)}px;${t.u == null ? 'transform:translate(-100%,0)' : ''}" ${t.go ? `data-go="${t.go}" title="走过去"` : `data-room="${t.room}" title="进到${esc(t.t)}里面看"`}>${esc(t.t)}</button>`).join(''); }
    [...tagsEl.children].forEach((b, i) => { const q = pos[i]; if (!q) return; b.style.left = Math.round(q[0]) + 'px'; b.style.top = Math.round(q[1]) + 'px'; b.style.display = q[2] ? '' : 'none'; });
    PP.refreshInteractive();
  }

  // ---------- 第一人称：用主角的眼睛在浮岛里走 ----------
  // 方向键 / WASD 走，Shift 跑，空格跳；按住鼠标拖动转头；E 或单击 = 跟准星（或点到的东西）互动；Q 退出；Esc 老板键（直接收成极简）
  // ======================= 第一人称 / 第三人称 =======================
  // 操作像 CS / 我的世界：WASD 走（A 左 D 右）、鼠标看、空格跳、Shift 跑、E 用、Tab 地图、滚轮拉远拉近（拉远就是第三人称）
  // 走路按“真的地面”算：脚下最高的那个面（楼板、楼梯的坡面、能站上去的家具），墙挡路，栏杆跳起来能翻过去，踩空就往下掉
  let fpBarEl = null, fpMenu = false, bigMap = null, fpHintT = 0;
  const SWH = 1.3, SWE = 0.75; /* 0.38：在水里是平着游的，身子只有这么高（钻得进水下古城的门和房间） */
  const PH = 8, EYE = 7.2, BODYH = 7.8, CROUCH = 4.2, FOV = 1.12, STEP = 1.0, BODY = 0.3, GRAV = 44, JUMP = 17.5; // 主角在世界里多高、眼睛多高：按真人的比例（门 10、桌面 5.3、天花板 14）
  const fpQ = () => (S().fpQ === 'pixel' ? 'pixel' : 'fine');
  const fpK = () => (fpQ() === 'pixel' ? pixK() : 1 / Math.min(3, Math.max(1.5, DPR()))); // 0.38：精细画质按屏幕像素的 1.5 倍以上画再缩小（超采样），边缘和细节都更干净 // 精细：按屏幕实际像素画（高分屏最多 2 倍）
  const fpDist = () => U.clamp(+S().fpDist || 0, 0, 14);
  // 视野（看得多广）：滚轮调，50°～110°，默认 78°
  const fpFovD = () => U.clamp(+S().fpFov || 78, 50, 110), fpFov = () => fpFovD() * Math.PI / 180;
  const fpSens = () => U.clamp(+S().fpSens || 1, 0.3, 3);
  const SENS = [0.4, 0.6, 0.8, 1, 1.25, 1.5, 2, 2.5];
  // ---- 碰撞：直接用画出来的模型 ----
  // 把浮岛的每个三角面撒点，落进 0.25 格的小方块里：有东西的方块就是实心的（像我的世界）。
  // 看得见的才挡人，看不见的不挡；会随风摆的（树叶、草丛、灌木）和水面能穿过去
  const VX = 0.25, VZ = 0.25, MAT_SKIP = new Set([g3.MAT.water, g3.MAT.pwater, g3.MAT.glow, g3.MAT.lake]); // 水面不算实心（湖里能游泳、潜水）
  let vox = null, voxB = null;
  // 第一次当场生成（约一秒）；之后浮岛有变化（菜长了、挪了家具……）就在后台一点点生成新的，生成好之前继续用旧的
  function voxels() {
    const sc = scene(), m = sc.cpu; if (!m) return vox; if (vox && vox.m === m) return vox;
    if (!vox) { const B = voxStart(m); voxStep(B, null); vox = B.res; return vox; }
    if (!voxB || voxB.m !== m) voxB = voxStart(m);
    const now = performance.now(); if (now - (voxB.lastT || 0) > 12) { voxB.lastT = now; voxStep(voxB, 5); if (voxB.res) { vox = voxB.res; voxB = null; } }
    return vox;
  }
  /* 在浮岛里平时就在后台一点点把碰撞和地图算好：按 F 进第一人称时不卡、地图马上能用 */
  function warm() {
    const m = scene().cpu; if (!m) return false;
    if (!vox) { if (!voxB) voxB = voxStart(m); voxStep(voxB, 6); if (voxB.res) { vox = voxB.res; voxB = null; } return true; }
    return !navReady();
  }
  /* 每 20 毫秒算 6 毫秒，算好就停；浮岛变了（菜长了、挪了家具）下次进来再接着算 */
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
    stampUnder(V);
    B.res = V;
  }
  /* 桌子、工作台、柜子这些东西底下是空的：身子矮（3.6）能钻进去，可眼睛在 7.2，一钻镜头就穿进桌面。
     把它们占的地方从离地 1 格往上、到碰到它自己为止填实，第一人称就钻不进去了（跟伙伴们找路时的规矩一样） */
  const UNDER_F = new Set(['desk', 'table', 'longtable', 'coffeetable', 'sidetable', 'teacart', 'vise', 'washstand', 'bench', 'piano']); // 底下是空的、人能钻进去的那些
  function stampUnder(V) {
    const { g, u0, v0, z0, nx, ny, nz } = V, list = [];
    try { for (const f of F.FIX) if (f.id === 143 || f.id === 147) for (const b of f.ob) /* 固定摆设里只有餐桌、工作台底下是空的 */ list.push(Object.assign([f.lv, ...b], { src: 'FIX' + f.id })); for (const it of FURN.layout(E())) { if (!UNDER_F.has(it.f)) continue; list.push(...F.rectObs(F.frameOf(it.room || 'living'), F.roomLv(it.room || 'living'), FURN.rect(it, 0)).map((q) => Object.assign(q, { src: it.f }))); } } catch (e) { return; }
    const col = (u, v, lv) => { const i = Math.floor((u - u0) / VX), j = Math.floor((v - v0) / VX); if (i < 0 || j < 0 || i >= nx || j >= ny) return; const ka = Math.floor((Z[lv] + 1.05 - z0) / VZ), kb = Math.floor((Z[lv] + 3.4 - z0) / VZ);
      const ta = Math.floor((Z[lv] + 3.5 - z0) / VZ), tb = Math.floor((Z[lv] + 6 - z0) / VZ); let over = false; for (let k = Math.max(0, ta); k <= tb && k < nz; k++) if (g[(k * ny + j) * nx + i] === 1) { over = true; break; }
      if (!over) return; // 头顶 3.5～6 高处没有桌面一类的东西（细的灯杆、地球仪旁边的空当）：不填，照样能走
      if (window.__stampDbg) window.__stampDbg.push([lv, +u.toFixed(2), +v.toFixed(2), col.src]);
      for (let k = Math.max(0, ka); k <= kb && k < nz; k++) { const n = (k * ny + j) * nx + i; if (g[n] === 1) break; g[n] = 1; } };
    for (const o of list) { const lv = o[0]; if (Z[lv] == null) continue; col.src = o.src;
      if (o[1] === 'c') { const [, , cu, cv, r0] = o, r = r0 - 0.3; if (r <= 0) continue; for (let u = cu - r; u <= cu + r; u += VX) for (let v = cv - r; v <= cv + r; v += VX) if (Math.hypot(u - cu, v - cv) <= r) col(u, v, lv); }
      else { const [, a0, b0, c0, d0] = o, a = a0 + 0.3, b = b0 + 0.3, c = c0 - 0.3, d = d0 - 0.3; for (let u = a + VX / 2; u < c; u += VX) for (let v = b + VX / 2; v < d; v += VX) col(u, v, lv); } } // 外框往里收一点：外框通常比看得见的东西大一圈
  }
  const vAt = (V, u, v, z) => { const i = Math.floor((u - V.u0) / VX), j = Math.floor((v - V.v0) / VX), k = Math.floor((z - V.z0) / VZ); return i >= 0 && j >= 0 && k >= 0 && i < V.nx && j < V.ny && k < V.nz && V.g[(k * V.ny + j) * V.nx + i] === 1; };
  // ---- 地面、墙 ----
  let solidC = null;
  function solids() { const k = 's' + dirtyK; if (!solidC || solidC.k !== k) { const by = Z.map(() => []); for (const s of area().solid()) (by[s.o[0]] || []).push(s); solidC = { k, by }; } return solidC.by; }
  const hitO = (o, u, v, r) => (o[1] === 'c' ? Math.hypot(u - o[2], v - o[3]) < o[4] + r : u > o[1] - r && u < o[3] + r && v > o[2] - r && v < o[4] + r);
  const inRampF = (r, u, v) => (r.spiral ? (() => { const d = Math.hypot(u - r.cu, v - r.cv); return d >= r.r0 - 0.2 && d <= r.r1 + 0.2; })() : u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1);
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
  /* 自动跳之前看看落脚处够不够宽：前后左右都得是差不多高的平面（箱子、台阶），墙上的压条、窗台这种窄边不算，免得被「跳」到墙上去 */
  function wideTop(u, v, z, du, dv) { const L = Math.hypot(du, dv) || 1, a = du / L, b = dv / L; for (const [x, y] of [[0.3, 0], [-0.1, 0], [0.1, 0.3], [0.1, -0.3]]) { const g = surf(u + a * x - b * y, v + b * x + a * y, z + 0.4); if (!isFinite(g.z) || Math.abs(g.z - z) > 0.35) return false; } return true; }
  let bodyNow = BODYH; // 第一人称蹲着的时候身子矮（只在第一人称每一帧里临时改，算地图的时候还是站着的高度）
  function blocked(u, v, z) {
    const V = voxels();
    if (V) {
      const st = stepAt(u, v);
      for (const [du, dv] of BODYC) { const i = Math.floor((u + du - V.u0) / VX), j = Math.floor((v + dv - V.v0) / VX); if (i < 0 || j < 0 || i >= V.nx || j >= V.ny) continue;
        for (let k = Math.max(0, Math.floor((z + st - V.z0) / VZ)), k1 = Math.min(V.nz - 1, Math.floor((z + bodyNow - V.z0) / VZ)); k <= k1; k++) if (V.g[(k * V.ny + j) * V.nx + i] === 1) return true; } // 只算身子（脚到肩）；头顶低就弯腰钻过去
      return false;
    }
    const by = solids();
    for (let L = 0; L < by.length; L++) { const zb = Z[L]; if (z + PH < zb || z > zb + 16) continue; for (const s of by[L]) { if (z + STEP >= zb + s.h || z + PH <= zb) continue; if (hitO(s.o, u, v, BODY)) return true; } }
    for (const r of area().ramps) if (!r.spiral && inRampF(r, u, v)) { const rz = rampZ(r, u, v); if (rz > z + STEP && rz < z + PH) return true; } // 楼梯的侧面
    return false;
  }
  // ---- 第一人称的“能站的地图”：每层每个 0.5 格，按真实模型算能不能站、会不会撞（自动走路、大地图都用它）----
  // 算一遍要一秒多：平时在后台分批算（每帧几毫秒），算好之前地图先用上一份；要自动走路时才当场算完
  let navC = null, navB = null;
  function navRow(B) { const a = area(), { lv, j } = B; for (let i = 0; i < GN; i++) navCell(a, B.g, B.h, lv, i, j); }
  function navAdvance(B, budget) { const t0 = performance.now(); while (B.lv < Z.length) { navRow(B); if (++B.j >= GN) { B.j = 0; B.lv++; } if (budget != null && performance.now() - t0 > budget) break; } if (B.lv >= Z.length) { navC = { V: B.V, g: B.g, h: B.h }; navB = null; mapC = null; } }
  function navReady() { const V = voxels(); if (navC && navC.V === V) return navC; if (!navB || navB.V !== V) navB = { V, lv: 0, j: 0, g: Z.map(() => new Uint8Array(GN * GN)), h: Z.map(() => new Float32Array(GN * GN)) }; navAdvance(navB, fp ? 8 : 4); return navC && navC.V === V ? navC : null; }
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
    if (cl !== lv) for (const [r, to] of route(a, cl, lv)) { const [lo, hi] = rampEnds(r), [en, ex] = to === r.b ? [lo, hi] : [hi, lo]; const p1 = navPath(cl, cur, en); if (!p1) return null; for (const q of p1) pts.push({ u: q[0], v: q[1], lv: cl }); for (const q of rampArc(r, to === r.b)) pts.push({ u: q.u, v: q.v, lv: to, ramp: r }); pts.push({ u: ex[0], v: ex[1], lv: to, ramp: r.spiral ? null : r }); cur = ex; cl = to; }
    const p2 = navPath(cl, cur, [u, v]); if (!p2) return null; for (const q of p2) pts.push({ u: q[0], v: q[1], lv: cl });
    return pts;
  }
  // 脚底一小圈（站得住）、身体一圈（撞不撞）
  const FOOT = (() => { const o = [[0, 0]]; for (let a = 0; a < 12; a++) o.push([Math.cos(a / 12 * 6.283) * 0.15, Math.sin(a / 12 * 6.283) * 0.15]); return o; })(); /* 和身子那一圈同方向、往里收一点：墙上的薄护墙板先碰到身子，脚就踩不上去（以前会顺着墙「爬台阶」爬上楼板） */ // 脚底 = 整个身体底面：身子有一部分在箱子上方，就算站在箱子上（不会落到箱子旁边、被箱子夹住）
  // 检测半径比身子小一点：方块会把表面往外“撑”出最多一格（0.25），扣掉一半，贴墙走时不会比看上去更早撞到
  const BODYC = (() => { const R = 0.2, o = []; for (let a = 0; a < 12; a++) o.push([Math.cos(a / 12 * 6.283) * R, Math.sin(a / 12 * 6.283) * R]); o.push([0, 0]); return o; })();
  // 头顶还有多高的空（身子正上方一小圈里最近的实心方块）：门框、雨棚、横梁低了就弯腰
  function headroom(u, v, z) { const V = voxels(); if (!V) return 99; let best = 99; for (const [du, dv] of FOOT) { const i = Math.floor((u + du - V.u0) / VX), j = Math.floor((v + dv - V.v0) / VX); if (i < 0 || j < 0 || i >= V.nx || j >= V.ny) continue; for (let k = Math.max(0, Math.floor((z + BODYH - V.z0) / VZ)), k1 = Math.min(V.nz - 1, Math.floor((z + PH + 1 - V.z0) / VZ)); k <= k1; k++) if (V.g[(k * V.ny + j) * V.nx + i] === 1) { best = Math.min(best, V.z0 + k * VZ - z); break; } } return best; }
  // 能迈上去多高：平地 1 格（一级台阶），楼梯上 1.75（浮岛里的楼梯一级比较高）
  const stepAt = (u, v) => (area().ramps.some((r) => u > r.u0 - 0.4 && u < r.u1 + 0.4 && v > r.v0 - 0.4 && v < r.v1 + 0.4) ? 1.75 : STEP);
  const lvAt = (z) => { let lv = 0; for (let L = 0; L < Z.length; L++) if (Z[L] <= z + STEP) lv = L; return lv; };
  // ---- 开始 / 结束 ----
  /* 3D 手：进第一人称时在后台把 9 种握拳程度的手先算好（每种第一次要算 0.3 秒），之后只查表，不卡 */
  function handWarm() { const HS = PP.HANDS; if (!HS || !fp) return; const C = fp.p.pal || {}, pal = [C.base || '#d9a066', C.light || '#f4dcb8', C.dark || '#8a5a3a']; let i = 0; const step = () => { if (!fp || i > 8) return; try { HS.hand(i / 8, pal); } catch (e) {} i++; setTimeout(step, 350); }; setTimeout(step, 600); }
  function fpStart() { setTimeout(handWarm, 0);
    if (!G.isle) { PP.setView && PP.setView('isle'); setTimeout(fpStart, 300); return; }
    const p = mainP(); if (!p) { PP.ui.toast('主角现在不在浮岛里'); return; }
    if (fedit) furnEdit(false);
    if (cut != null || focus) setCut(null, true);
    // 位置是连续的：主角现在在哪儿（菜地边、床上、正在走的路上），第一人称就从哪儿开始
    const m = S().fpLast, mOK = m && [0, 1, 2, 3].includes(m.lv) && isFinite(m.u) && isFinite(m.v);
    /* 按 Esc（老板键）或 Q 出去，再进来：回到上次第一人称站的地方、朝着上次的方向（像游戏读档），不跟着主角后来自己溜达到哪儿 */
    const recent = mOK && m.t && Date.now() - m.t < 12 * 3600e3;
    const q0 = recent ? m : p.isleSpot ? { u: p.isleSpot.u, v: p.isleSpot.v, lv: p.isleLv != null ? p.isleLv : 1 } : p.ip ? { u: p.ip.u, v: p.ip.v, lv: p.ip.lv } : mOK ? m : ipOf(p);
    p.interrupt(true); p.iw = null; p.fishing = null; p.tool = null; p.isleSpot = null;
    const lv = q0.lv != null ? q0.lv : 1;
    let at = nearFree(area(), q0.u, q0.v, lv), g = surf(at[0], at[1], Z[lv] + STEP);
    if (recent) { const g0 = surf(m.u, m.v, (isFinite(m.z) ? m.z : Z[lv]) + 0.5); if (isFinite(g0.z) && !blocked(m.u, m.v, g0.z)) { at = [m.u, m.v]; g = g0; } } // 原地原样：连站在箱子上、楼梯上也一样
    const same = mOK && m.lv === lv && Math.hypot(m.u - at[0], m.v - at[1]) < 4;
    fp = { p, q: { u: at[0], v: at[1], lv, z: isFinite(g.z) ? g.z : Z[lv] }, yaw: same && isFinite(m.yaw) ? m.yaw : Math.atan2(CEN[1] - at[1], CEN[0] - at[0]), pitch: same && isFinite(m.pitch) ? U.clamp(m.pitch, -1.3, 1.3) : -0.12,
      keys: new Set(), last: performance.now(), t0: performance.now(), vz: 0, air: false, bob: 0, aim: null, aimT: 0, saveT: 0, safe: null, auto: null, camD: fpDist(), fallZ: 0 };
    fpSync(); p.run('fp', A.fpCtl);
    PP.fpOn = true; fpMenu = false; bigMap = null; fpHintT = performance.now();
    try { window.petAPI && window.petAPI.focusWin && window.petAPI.focusWin(); } catch (e) {}
    document.body.classList.add('fpon'); layout(); fpBar(); PP.refreshInteractive();
    /* 默认锁住鼠标：移动鼠标就转向，准星对准东西单击就用；按住 Alt 放出鼠标 */
    if (lookPref() && lastPT !== 'touch') lookGrab();
  }
  /* 拖第一人称小窗口的边框改大小：鼠标没锁住时，靠近边框 7 像素内出现双箭头，按住拖 */
  let fpRz = null;
  function fpEdge(x, y) {
    if (!fp || S().fpFull || document.pointerLockElement || !L) return '';
    const d = 7, inX = x > L.vx0 - d && x < L.vx1 + d, inY = y > L.vy0 - d && y < L.vy1 + d; if (!inX || !inY) return '';
    let e = ''; if (Math.abs(y - L.vy0) < d) e += 'n'; else if (Math.abs(y - L.vy1) < d) e += 's'; if (Math.abs(x - L.vx0) < d) e += 'w'; else if (Math.abs(x - L.vx1) < d) e += 'e';
    return e;
  }
  window.addEventListener('mousedown', (ev) => { if (ev.button !== 0) return; const e = fpEdge(ev.clientX, ev.clientY); if (!e) return; ev.stopImmediatePropagation(); ev.preventDefault(); fpRz = { e, x: ev.clientX, y: ev.clientY, r: [L.vx0, L.vy0, L.vx1, L.vy1] }; G.uiDrag = true; }, true);
  window.addEventListener('mousemove', (ev) => {
    if (!fpRz) { if (fp && !document.pointerLockElement) { const e = fpEdge(ev.clientX, ev.clientY); if (e) document.body.style.cursor = (e === 'n' || e === 's' ? 'ns' : e === 'e' || e === 'w' ? 'ew' : e === 'nw' || e === 'se' ? 'nwse' : 'nesw') + '-resize'; else if (/resize/.test(document.body.style.cursor)) document.body.style.cursor = 'default'; } return; }
    ev.stopImmediatePropagation(); const sb = safeB(), dx = ev.clientX - fpRz.x, dy = ev.clientY - fpRz.y; let [x0, y0, x1, y1] = fpRz.r;
    if (fpRz.e.includes('w')) x0 = U.clamp(x0 + dx, 0, x1 - 200); if (fpRz.e.includes('e')) x1 = U.clamp(x1 + dx, x0 + 200, G.W);
    if (fpRz.e.includes('n')) y0 = U.clamp(y0 + dy, 0, y1 - 150); if (fpRz.e.includes('s')) y1 = U.clamp(y1 + dy, y0 + 150, sb);
    S().fpBox = { x0: x0 / G.W, y0: y0 / sb, x1: x1 / G.W, y1: y1 / sb }; layout();
  }, true);
  window.addEventListener('mouseup', () => { if (!fpRz) return; fpRz = null; G.uiDrag = false; document.body.style.cursor = 'default'; camChanged(); PP.save.soon(); if (fp) fpBar(); PP.refreshInteractive(); }, true);
  function fpFullToggle() { S().fpFull = !S().fpFull; PP.save.soon(); layout(); camChanged(); if (fp) fpBar(); PP.refreshInteractive(); PP.ui.toast(S().fpFull ? '全屏（再点右上角 ⛶ 回到小窗口）' : '小窗口（右上角 ⛶ 全屏）', 1.4); }
  function fpStop(quiet) {
    if (!fp) return; lookFree(); fpRemember(); const p = fp.p, q = fp.q; fp = null; PP.fpOn = false; vOpen = false; fpMenu = false; bigMap = null;
    if (p && G.pets.includes(p)) { if (p.action === 'fp') p.interrupt(true); if (!p.iw) { const at = nearFree(area(), q.u, q.v, q.lv); setIp(p, at[0], at[1], q.lv); } }
    if (fpBarEl) { fpBarEl.remove(); fpBarEl = null; }
    if (hotEl) { hotEl.remove(); hotEl = null; }
    document.body.classList.remove('fpon'); layout(); camChanged(); try { window.petAPI && window.petAPI.blurWin && window.petAPI.blurWin(); } catch (e) {} PP.refreshInteractive(); if (!quiet) PP.ui.toast('回到上帝视角');
  }
  // 主角的位置跟着镜头走（屏幕坐标也一起改，不然别的地方会按旧的屏幕位置把它“吸”回去）
  function fpSync() { const p = fp.p, q = fp.q; p.ip = { u: q.u, v: q.v, lv: q.lv, z: q.z }; p.isleLv = q.lv; if (L) p.x = scrU(q.u, q.v); }
  function fpRemember() { if (!fp || fp.air) return; const q = fp.q; S().fpLast = { u: +q.u.toFixed(2), v: +q.v.toFixed(2), lv: q.lv, z: +q.z.toFixed(2), yaw: +fp.yaw.toFixed(3), pitch: +fp.pitch.toFixed(3), t: Date.now() }; PP.save.soon(); }
  PP.fpOwns = (p) => !!fp && fp.p === p;
  A.fpCtl = function* () { const p = this; p.anim = 'idle'; while (fp && fp.p === p) yield 0.25; };
  // ---- 按钮：左上角一列三个小方块（☰ 菜单 / 🗺 地图 / ✕ 退出），菜单展开在画面里，不占外面的地方 ----
  function fpBar() {
    if (!fpBarEl) { fpBarEl = document.createElement('div'); fpBarEl.className = 'cutbar fpbar fphud'; document.getElementById('ui').appendChild(fpBarEl);
      fpBarEl.addEventListener('mousedown', (ev) => ev.stopPropagation());
      fpBarEl.addEventListener('click', (ev) => { const b = ev.target.closest('[data-a]'); if (b) fpAct(b.dataset.a, b); }); }
    const s = S(), on = (v) => (v ? 'class="on"' : ''), sp = fpSpd(), si = SPDS.indexOf(sp), d = fpDist(), se = fpSens();
    const fk = [s.fpHands, s.fpAutoJump, s.fpFull, fpMenu, !!bigMap, sp, d, fpFovD(), se, lookPref(), s.fpInvX, s.fpInvY, s.fpDrag, fpQ(), s.fpMap !== false].join(',');
    if (fpBarEl.dataset.k !== fk) { fpBarEl.dataset.k = fk;
      const I = (a, ic, key, tip, x = '') => `<button data-a="${a}" ${x} title="${tip}"><i>${ic}</i><small>${key}</small></button>`; /* 像原神：右上角一排圆图标，下面标着按键；小地图在左上角，点一下打开大地图 */
      fpBarEl.innerHTML = I('map', '🗺', 'Tab', '大地图：点哪儿就自动走过去', on(bigMap)) + I('menu', '⚙', 'P', '设置：视角、镜头、鼠标、画质', on(fpMenu)) + I('full', s.fpFull ? '🗗' : '⛶', '全屏', s.fpFull ? '回到小窗口' : '铺满整个窗口', on(s.fpFull)) + I('out', '✕', 'Q', '回到上帝视角', 'class="primary"')
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
          <div class="r"><span>显示手</span><button data-a="hands" ${on(s.fpHands !== false)}>${s.fpHands !== false ? '开' : '关'}</button><small>关掉时只显示手里拿的东西</small></div>
          <div class="r"><span>自动跳</span><button data-a="ajump" ${on(s.fpAutoJump !== false)}>${s.fpAutoJump !== false ? '开' : '关'}</button><small>碰到矮东西自己跳上去</small></div>
          <div class="help">按键和常见游戏一样（GTA / 我的世界 / 原神）：WASD 走 · 鼠标转向 · 空格 跳（跑起来跳更高；在空中再按一下打开叶子滑翔伞）· Shift 跑 · 按住 Ctrl 或按 C 蹲下（矮的门、缝要蹲着过）· 准星对着东西 E / F / 单击，自动做对的事（种菜、浇水、收菜、钓鱼、摸摸伙伴）· 滚轮 镜头远近 · B 自己吃点东西 · M 或 Tab 地图 · P 设置 · V 切换第一 / 第三人称（近、远）· Z 坐下 / 躺下 · 按住 Alt 放出鼠标 · R 跑到屋顶下不来时回到地面 · 右上角 ⛶ 全屏 · H 显示 / 隐藏左下角的按键说明 · Q 退出 · Esc 老板键</div>
        </div>` : '');
    }
    const sc = U.clamp(Math.min(L.vw, L.vh) / 560, 0.4, 2.6), pk = [sc.toFixed(3), L.vx0, L.vy0, L.vw].join('|');
    if (fpBarEl.dataset.pk !== pk) { fpBarEl.dataset.pk = pk; fpBarEl.style.transformOrigin = 'right top'; fpBarEl.style.transform = `scale(${sc.toFixed(3)})`; fpBarEl.style.left = 'auto';
      fpBarEl.style.right = Math.max(2, window.innerWidth - (L.vx0 + L.vw) + 8) + 'px'; fpBarEl.style.top = Math.max(2, L.vy0 + 8) + 'px'; }
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
    else if (a === 'hands') { s.fpHands = s.fpHands === false; sv(); }
    else if (a === 'ajump') { s.fpAutoJump = s.fpAutoJump === false; sv(); }
    if (fp) fpBar();
  }
  // ---- 键盘 ----
  // A 往左、D 往右（横着走）；←→ 转身；W/↑ 往前；S/↓ 往后
  const fpKeyMap = { ArrowUp: 'f', KeyW: 'f', ArrowDown: 'b', KeyS: 'b', KeyA: 'l', KeyD: 'r', ArrowLeft: 'tl', ArrowRight: 'tr', ShiftLeft: 'run', ShiftRight: 'run', ControlLeft: 'crouch', ControlRight: 'crouch' };
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (!fp && G.isle && e.code === 'KeyF' && !e.ctrlKey && !e.altKey && !e.metaKey && !fedit) { fpStart(); e.preventDefault(); return; }
    if (!fp) return;
    if (e.key === 'Alt') { lookFree(); e.preventDefault(); return; } // Alt：先把鼠标放出来点按钮
    { const k = fpKeyMap[e.code]; if (k && !e.altKey && !e.metaKey) { fp.keys.add(k); if (k !== 'run' && k !== 'crouch') fp.auto = null; e.preventDefault(); return; } } // 按住 Ctrl 蹲着也能走
    if (e.code === 'Space' && !e.altKey && !e.metaKey) { if (!e.repeat) fpGlideKey(); fp.keys.add('up'); fpJump(); e.preventDefault(); return; }
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    /* 按键照成熟游戏来：E / F 互动（GTA / 原神）、M 或 Tab 地图、按住 Alt 放出鼠标（原神）、Ctrl / C 蹲（GTA）、V 视角、滚轮镜头远近（原神）；没有快捷栏，看着东西点一下就做对的事、H 或 F1 按键说明 */
    if (e.code === 'Tab' || e.code === 'KeyM') { toggleMap(); e.preventDefault(); return; }
    if (e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Enter') { fpUse(null); e.preventDefault(); return; }
    if (e.code === 'KeyP') { fpAct('menu'); fpBar(); e.preventDefault(); return; } // P：设置（视角、镜头、画质）
    if (e.code === 'KeyH' || e.code === 'F1') { S().fpKeysHide = !S().fpKeysHide; PP.save.soon(); e.preventDefault(); return; }
    if (e.code === 'KeyR') { fpRescue(); e.preventDefault(); return; }
    if (e.code === 'KeyV') { const s = S(), d = fpDist(); s.fpDist = d < 0.5 ? 6 : d < 9 ? 11 : 0; PP.save.soon(); fpBar(); PP.ui.toast(s.fpDist === 0 ? '第一人称' : s.fpDist === 6 ? '第三人称（近）· 再按 V 拉远' : '第三人称（远）· 再按 V 回第一人称', 1.2); e.preventDefault(); return; }
    if (fp.swim && (e.code === 'KeyC' || e.code === 'KeyX')) { fp.keys.add('sink'); e.preventDefault(); return; } /* 水里：按住 C 往下沉（不是蹲） */
    if (e.code === 'KeyC' || e.code === 'KeyX') { fp.crouchT = !fp.crouchT; PP.ui.toast(fp.crouchT ? '蹲下了（再按 C 站起来；按住 Ctrl 也能蹲）' : '站起来了', 1.2); e.preventDefault(); return; }
    if (e.code === 'KeyZ') { fp.pose = !fp.pose ? 'sit' : fp.pose === 'sit' ? 'lie' : null; fp.auto = null; PP.ui.toast(fp.pose === 'sit' ? '坐下歇会儿（慢慢回体力，走一步就起来）' : fp.pose === 'lie' ? '躺下（回体力更快，走一步就起来）' : '起来了', 1.4); e.preventDefault(); return; }
    if (e.code === 'KeyB') { foodPop(fp.p, L.vx0 + L.vw / 2, L.vy0 + L.vh / 2, true); e.preventDefault(); return; } // B：自己吃点东西（像原神的背包里点食物）
    if (e.code === 'KeyQ') { fpStop(); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { if (!fp) return; if (e.code === 'Space') fp.keys.delete('up'); if (e.code === 'KeyC' || e.code === 'KeyX') fp.keys.delete('sink'); const k = fpKeyMap[e.code]; if (k) fp.keys.delete(k); if (e.key === 'Alt' && lookPref() && !fp.freeMouse && !fpMenu && !bigMap && !uiOpen()) { e.preventDefault(); lookGrab(); } }); // 松开 Alt：鼠标重新锁回画面（像原神）
  window.addEventListener('blur', () => { if (fp) fp.keys.clear(); });
  // 滚轮：拉远（第三人称）/ 拉近（第一人称）
  window.addEventListener('wheel', (e) => {
    if (!fp || (e.target && e.target.closest && e.target.closest('.panel,.menu,.fpmenu'))) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (bigMap) { bigMap.z = U.clamp((bigMap.z || 1) * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 4); return; }
    // 滚轮拉近 / 拉远镜头（像原神）：拉到最近就是第一人称
    { const s2 = S(), d0 = fpDist(), d1 = U.clamp(d0 + (e.deltaY > 0 ? 1.5 : -1.5), 0, 14); s2.fpDist = d1 < 2 ? 0 : Math.max(4, d1); if ((d0 < 0.5) !== (s2.fpDist < 0.5)) fpBar(); PP.save.soon(); }
  }, { capture: true, passive: false });
  /* 跳：站着起跳是普通高度；跑起来再跳更高（助跑越快跳得越高，最快时高出六成） */
  /* 叶子滑翔伞（像原神的风之翼、塞尔达的滑翔伞）：在空中、离地面有点高时按空格打开，慢慢往下飘、往看着的方向飞；再按一次收起；落地、掉进水里自动收起 */
  function fpGlideKey() { if (!fp || fp.swim || !fp.air) return; if (fp.glide) { fp.glide = false; return; } const g = surf(fp.q.u, fp.q.v, fp.q.z); if (isFinite(g.z) && fp.q.z - g.z < 3) return; fp.glide = true; fp.glideT = performance.now(); if (!S().glideKnown) { S().glideKnown = true; PP.save.soon(); PP.ui.toast('打开了叶子滑翔伞：WASD 控制方向，再按空格收起', 2.4); } }
  const onFloorish = (u, v, g) => g.z > -0.5 && !blocked(u, v, g.z) && headroom(u, v, g.z) > BODYH - 0.5; // 上岸的落脚点：够高、站得下
  function fpJump() { if (!fp || fp.swim || fp.air || fp.p.action !== 'fp') return; const k = U.clamp((fp.spd || 0) / RUN, 0, 1); fp.vz = JUMP * (fp.crouch ? 0.7 : 1 + 0.18 * k * k); fp.air = true; fp.fallZ = fp.q.z; }
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
  /* 第一人称里弹出了要点的东西（选种子、菜单、面板）：先把鼠标松开让你点，点完关掉再锁回去 */
  const uiOpen = () => !!document.querySelector('.seedpick,.orb-pop,.menu,.panel');
  function popCheck() {
    if (!fp) return; const o = uiOpen();
    if (o && lookOn()) { fp.popFree = true; lookFree(); }
    else if (!o && fp.popFree) { fp.popFree = false; if (lookPref() && !fp.freeMouse && lastPT !== 'touch') lookGrab(); }
  }
  window.addEventListener('click', () => { if (fp && fp.popFree) setTimeout(popCheck, 0); });
  window.addEventListener('keydown', () => { if (fp && fp.popFree) setTimeout(popCheck, 0); });
  function lookFree() { if (document.pointerLockElement) { lookBye = true; try { document.exitPointerLock(); } catch (e) {} } }
  /* M：锁住 / 松开鼠标（锁住时移动鼠标就转头；松开时按住鼠标拖动转头，或者用 ← → 键） */
  function lookToggle() {
    if (lookOn()) { fp && (fp.freeMouse = true); lookFree(); PP.ui.toast('鼠标松开了：移到画面边上也能转头，点东西就用；单击画面锁回去', 2.4); }
    else { if (fp) fp.freeMouse = false; S().fpMouse = true; lookGrab(); }
    PP.save.soon(); if (fp) fpBar();
  }
  document.addEventListener('pointerlockchange', () => {
    const on = lookOn(), self = lookBye; lookBye = false;
    if (document.pointerLockElement && (!fp || !lookPref() || fp.freeMouse || fpMenu || bigMap || uiOpen())) { if (fp && uiOpen()) fp.popFree = true; lookFree(); return; } // 刚锁上时已经关掉 / 退出 / 开了菜单
    if (on) { lookT = performance.now(); PP.ui.toast('鼠标锁在画面里了：移动鼠标转向 · 按住 Alt 放出鼠标', 2.4); } else if (!self && fp) { lookLostT = performance.now(); if (performance.now() - (PP.lastEscTap || -1e9) < 600 && PP.panic) PP.panic(); } // 锁着鼠标时按 Esc：浏览器先吃掉这一下，用全局按键听到的那次来当老板键 // 锁着鼠标时按 Esc：浏览器先吃掉这一下，用全局按键听到的那次来当老板键
    PP.refreshInteractive && PP.refreshInteractive(); if (fp) fpBar();
  });
  PP.lookLostRecently = () => performance.now() - lookLostT < 600;
  /* 不锁鼠标时：记住鼠标在哪（指着什么、要不要在边上转头） */
  window.addEventListener('mousemove', (e) => { if (!fp || lookOn()) return; fp.mx = e.clientX; fp.my = e.clientY; fp.overUI = !!(e.target && e.target.closest && e.target.closest('.fphot,.fpbar,.cutbar,.panel,.orb-pop,.menu,.seedpick,.toast')); }, true);
  document.addEventListener('mouseleave', () => { if (fp) fp.mx = null; });
  window.addEventListener('blur', () => { if (fp) fp.mx = null; });
  const turnBy = (dx, dy, k) => { const s = S(); fp.yaw += dx * k * (s.fpInvX ? -1 : 1); fp.pitch = U.clamp(fp.pitch - dy * k * (s.fpInvY ? -1 : 1), -1.3, 1.3); };
  window.addEventListener('mousemove', (e) => {
    if (!lookOn()) return;
    turnBy(U.clamp(e.movementX || 0, -150, 150), U.clamp(e.movementY || 0, -150, 150), 0.0024 * fpSens());
  }, true);
  for (const t of ['mousedown', 'mouseup', 'click', 'dblclick']) window.addEventListener(t, (e) => {
    if (!lookOn() || fp.popFree) return; e.stopImmediatePropagation(); e.preventDefault();
    if (t === 'mousedown' && e.button === 0) fpUse(null);
    if (t === 'mousedown' && e.button === 2) fpUse(null); // 右键也是用（像我的世界）
  }, true);
  function fpDown(x, y) {
    if (bigMap) { mapClick(x, y); return; }
    if (fpMenu) { fpMenu = false; fpBar(); return; }
    if (miniHit(x, y)) { toggleMap(); return; }
    if (lookPref() && !fp.freeMouse && !lookOn() && lastPT !== 'touch') { lookGrab(); return; } // 锁定模式下鼠标被放开了（切窗口回来）：点一下画面重新锁上
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
    const g = surf(nu, nv, q.z + st); if (!isFinite(g.z)) return false; // 脚下什么都没有（浮岛外面的天空）：过不去
    q.u = nu; q.v = nv;
    if (!fp.air) { if (q.z - g.z > st) { fp.air = true; fp.vz = 0; fp.fallZ = q.z; } else { q.z = g.z; q.lv = g.lv; } }
    return true;
  }
  function fpMove(du, dv) { const q = fp.q, n = Math.max(1, Math.ceil(Math.hypot(du, dv) / 0.3)); for (let i = 0; i < n; i++) { const a = du / n, b = dv / n; if (!fpStepTo(q.u + a, q.v + b) && !fpStepTo(q.u + a, q.v) && !fpStepTo(q.u, q.v + b)) return false; } return true; }
  /* 站在楼层地面上（不是屋顶、外沿、树上）：只有这种地方才记成「上次站稳的地方」 */
  function onFloor(q) { if (!navC) return true; const i = gi(q.u), j = gi(q.v); if (i < 0 || j < 0 || i >= GN || j >= GN) return false; const k = j * GN + i; return !!navC.g[q.lv] && navC.g[q.lv][k] === 1 && Math.abs(navC.h[q.lv][k] - q.z) < 0.8; }
  /* 脚下这层有地板、只是站在箱子桌子上（不高）：不算跑出去了 */
  function overFloor(q) { if (!navC) return true; const i = gi(q.u), j = gi(q.v); if (i < 0 || j < 0 || i >= GN || j >= GN) return false; const k = j * GN + i, g = navC.g[q.lv]; return !!g && g[k] > 0 && q.z - navC.h[q.lv][k] < 6; }
  function fpRescue() { if (!fp || !fp.safe) return; Object.assign(fp.q, fp.safe); fp.air = false; fp.vz = 0; fp.auto = null; fp.offT = 0; fp._cam = null; PP.ui.toast('回到刚才站的地面了', 1.4); }
  /* 每一帧：记下水平速度（助跑跳用），蹲着的身高只在这一帧里生效 */
  function fpTick(dt) { if (!fp) return; const u0 = fp.q.u, v0 = fp.q.v; try { fpTick0(dt); } finally { bodyNow = BODYH; } if (fp && dt > 0) { const s1 = Math.hypot(fp.q.u - u0, fp.q.v - v0) / dt; fp.spd = fp.air ? fp.spd : (fp.spd || 0) + (s1 - (fp.spd || 0)) * Math.min(1, dt * 10); } }
  function fpTick0(dt) {
    const p = fp.p; if (!G.pets.includes(p) || p.held) { fpStop(true); return; }
    if (lookOn() && uiOpen()) popCheck();
    const K = fp.keys, q = fp.q;
    /* 蹲下：按住 Ctrl 或按 X 切换。身子矮到 2.2，能钻矮门、桌子底下；头顶太低时松开也先不站起来 */
    { const want = K.has('crouch') || !!fp.crouchT, hr = headroom(q.u, q.v, q.z); fp.crouch = want || (fp.crouch && hr < BODYH + 0.3); bodyNow = fp.swim ? SWH : fp.crouch ? CROUCH : BODYH; } // 站着是真实身高；矮的地方要自己蹲（不会自动蹲），蹲着的时候头顶太低就先站不起来
    let mv = (K.has('f') ? 1 : 0) - (K.has('b') ? 1 : 0), st = (K.has('r') ? 1 : 0) - (K.has('l') ? 1 : 0); const tn = (K.has('tr') ? 1 : 0) - (K.has('tl') ? 1 : 0);
    // 主角被派去干别的事（你点了床、菜地……）：镜头跟着它；你一按方向键就收回来
    if (p.action !== 'fp' && !p.action) { fp.q = Object.assign({}, fp.q, (() => { const q0 = ipOf(p); return { u: q0.u, v: q0.v, lv: q0.lv, z: q0.z != null ? q0.z : Z[q0.lv] }; })()); p.isleSpot = null; p.run('fp', A.fpCtl); }
    if (p.action !== 'fp') {
      if (mv || st) { p.interrupt(true); p.iw = null; p.isleSpot = null; const q0 = ipOf(p); fp.q = { u: q0.u, v: q0.v, lv: q0.lv, z: q0.z != null ? q0.z : Z[q0.lv] }; fp.air = false; p.run('fp', A.fpCtl); }
      else { const q0 = p.isleSpot || ipOf(p); fp.q = { u: q0.u, v: q0.v, lv: p.isleLv != null ? p.isleLv : q.lv, z: q0.z != null ? q0.z : Z[p.isleLv || 1] }; fp.air = false; fp.vz = 0; return; }
    }
    fp.yaw += tn * 2.4 * dt; // → 往右转，← 往左转
    /* 不锁鼠标：鼠标移到画面左右边上就一直转头，上下边上抬头低头（越靠边转得越快） */
    if (!lookOn() && fp.mx != null && !fp.overUI && !fpMenu && !bigMap && !G.uiDrag && L) { const bx = L.vw * 0.12, by = L.vh * 0.12, mx = fp.mx - L.vx0, my = fp.my - L.vy0;
      if (mx >= 0 && mx <= L.vw && my >= 0 && my <= L.vh) { const kx = mx < bx ? -(1 - mx / bx) : mx > L.vw - bx ? 1 - (L.vw - mx) / bx : 0, ky = my < by ? 1 - my / by : my > L.vh - by ? -(1 - (L.vh - my) / by) : 0;
        fp.yaw += kx * 2.2 * dt * fpSens(); fp.pitch = U.clamp(fp.pitch + ky * 1.1 * dt * fpSens(), -1.3, 1.3); } }
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
          if (!fp.air && Math.hypot(q.u - u0, q.v - v0) < sp * 0.3) { const nu = q.u + du / d * 0.45, nv = q.v + dv / d * 0.45, g2 = surf(nu, nv, q.z + 3.2); if (isFinite(g2.z) && g2.z > q.z + STEP && !blocked(nu, nv, g2.z) && wideTop(nu, nv, g2.z, du / d, dv / d)) fpJump(); }
          au.prog = (au.prog || 0) + Math.hypot(q.u - u0, q.v - v0); au.t = (au.t || 0) + dt; if (au.t > 1.2) { if (au.prog < 0.6) { /* 卡住了：先往左或右让开半步（擦着家具边的时候），再重新找路 */ { const tt = au.pts[au.i] || au.pts[au.pts.length - 1], ddu = tt.u - q.u, ddv = tt.v - q.v, dl = Math.hypot(ddu, ddv) || 1; for (const sd of [1, -1]) { const nu = q.u - ddv / dl * 0.6 * sd, nv = q.v + ddu / dl * 0.6 * sd, gg = surf(nu, nv, q.z + STEP); if (isFinite(gg.z) && Math.abs(gg.z - q.z) <= STEP && !blocked(nu, nv, gg.z)) { q.u = nu; q.v = nv; q.z = gg.z; break; } } } const last = au.pts[au.pts.length - 1], np = (au.retry || 0) < 3 && fpPlan(q, last.u, last.v, last.lv); if (np && np.length) fp.auto = { pts: np, i: 0, retry: (au.retry || 0) + 1 }; else { fp.auto = null; PP.ui.toast('前面过不去了，换个地方试试', 1.6); } } else { au.t = 0; au.prog = 0; } } } }
    }
    if (mv || st) {
      const sp = (fp.glide ? 6.5 : fp.crouch ? SPEED * 0.4 : K.has('run') ? RUN : SPEED * 0.8) * fpSpd() * dt, c = Math.cos(fp.yaw), s2 = Math.sin(fp.yaw), n = Math.hypot(mv, st) || 1;
      // 往前 = (cos, sin)；往右 = (-sin, cos)
      const u0 = q.u, v0 = q.v, du = (c * mv - s2 * st) / n, dv = (s2 * mv + c * st) / n;
      fpMove(du * sp, dv * sp); if (!fp.air) fp.bob += dt * (K.has('run') ? 14 : 9);
      /* 自动跳（像我的世界）：被不高的东西（花盆边、长凳、箱子……不到 3 格）挡住、上面又站得下，就自己跳上去 */
      if (!fp.air && S().fpAutoJump !== false && Math.hypot(q.u - u0, q.v - v0) < sp * 0.3) { const nu = q.u + du * 0.45, nv = q.v + dv * 0.45, g2 = surf(nu, nv, q.z + 3.2); if (isFinite(g2.z) && g2.z > q.z + stepAt(q.u, q.v) && !blocked(nu, nv, g2.z) && headroom(nu, nv, g2.z) > bodyNow + 0.3 && wideTop(nu, nv, g2.z, du, dv)) fpJump(); }
    }
    // ---- 游泳 / 潜水：在林中湖里（身子泡在水面以下） ----
    const LK = F.LAKE, inWater = !!(LK && F.inLake(q.u, q.v, 0.2) && q.z < LK.z - 0.25); /* 脚一泡进水里就是在游泳（以前要比水面低 1.2，踩在浅处的屋顶上半泡在水里，既不能游也不能潜） */
    if (inWater && !fp.swim) { fp.glide = false; fp.swim = true; fp.air = false; fp.vz = Math.max(fp.vz || 0, -6); fp.crouchT = false; PP.ui.toast('掉进湖里啦——在游泳：方向键游，按住空格往上浮，按住 C / Ctrl 往下沉', 3); }
    if (fp.swim && !inWater && !(LK && F.inLake(q.u, q.v, -0.4))) fp.swim = false;
    if (fp.swim) {
      const floatZ = LK.z - SWE + 0.35, down = K.has('crouch') || K.has('sink'), up = K.has('up'), g0 = surf(q.u, q.v, q.z + 1.2);
      /* 0.38：水下只用方向键前后左右游，上浮 / 下沉用单独的键（空格 / C 或 Ctrl），抬头低头不再带着上下 */
      fp.vz += ((up ? 26 : 0) - (down ? 22 : 0) + (q.z < floatZ ? 6 : -14)) * dt; fp.vz *= Math.pow(0.12, dt); // 水里有浮力、有阻力
      let nz = q.z + fp.vz * dt; if (nz > floatZ) { nz = Math.min(nz, floatZ + (up ? 0.5 : 0.15)); if (fp.vz > 0) fp.vz *= 0.5; } // 浮到水面就停（头露出水面），按住空格也只是冒个头
      if (isFinite(g0.z) && nz < g0.z) { nz = g0.z; fp.vz = Math.max(0, fp.vz); }
      const CY2 = PP.CITY, underPond = !CY2 || !CY2.POND || CY2.inPond(q.u, q.v, -0.4); /* 0.36：古城在地面底下的水洞里，头顶是洞顶；只有游到池塘底下才能浮上去 */
      if (!underPond) { const cap = (CY2.CEIL || -1.25) - 0.15 - SWH; if (nz > cap) { nz = cap; if (fp.vz > 0) fp.vz = 0; } }
      fp.atPond = underPond && q.z > floatZ - 1.2; // 浮在池塘水面：可以按 E 上岸
      if (fp.atPond && !fp.pondHint) { fp.pondHint = true; PP.ui.toast('浮到池塘水面了：按 E 上岸', 2.4); } if (!fp.atPond) fp.pondHint = false;
      q.z = nz; q.lv = 1; fp.air = false; fp.under = q.z + SWE < LK.z; fp.bob += dt * 3;
      p.anim = 'walk'; fpSync(); return;
    }
    fp.under = false;
    if (!fp.air && fp.glide) { fp.glide = false; fp.glideT = performance.now(); } // 落地收起滑翔伞
    // 竖直方向：跳起来 / 掉下去 / 落地
    const stH = stepAt(q.u, q.v), g = surf(q.u, q.v, q.z + stH);
    if (fp.air) {
      if (fp.glide) { fp.vz = Math.max(-4.5, fp.vz - GRAV * dt * 0.4); if (fp.vz > 0) fp.vz *= 0.9; } else fp.vz = Math.max(-70, fp.vz - GRAV * dt); let nz = q.z + fp.vz * dt; /* 叶子滑翔伞：慢慢往下飘 */
      if (!fp.glide && !fp.glideTold && fp.vz < -8 && !S().glideKnown) { const gb = surf(q.u, q.v, q.z); if (!isFinite(gb.z) || q.z - gb.z > 8) { fp.glideTold = true; PP.ui.toast('在往下掉——按一下空格，打开叶子滑翔伞慢慢飘下去', 2.6); } }
      /* 往上跳时头顶碰到天花板 / 楼板就停住往下掉（以前会穿过天花板，落到楼上或屋顶上，镜头卡在楼板里看着像屋顶消失、乱闪） */
      if (fp.vz > 0) { const hr = headroom(q.u, q.v, q.z); if (hr < 99) { const lim = q.z + Math.max(0, hr - (bodyNow + 0.2)); if (nz > lim) { nz = lim; fp.vz = 0; } } }
      const g2 = surf(q.u, q.v, Math.max(nz, q.z) + STEP);
      if (fp.vz <= 0 && isFinite(g2.z) && nz <= g2.z && blocked(q.u, q.v, g2.z) && fp.okUV) { /* 落下来会嵌进东西里（空中往前飘进了窗台、桌边底下）：退回上一个能站的地方再落 */ q.u = fp.okUV[0]; q.v = fp.okUV[1]; }
      const g3b = fp.vz <= 0 ? surf(q.u, q.v, Math.max(nz, q.z) + STEP) : g2;
      if (fp.vz <= 0 && isFinite(g3b.z) && nz <= g3b.z) { q.z = g3b.z; q.lv = g3b.lv; fp.air = false; const h = fp.fallZ - q.z; fp.vz = 0; if (h > 8) { fp.land = performance.now(); p.jolt && p.jolt(0, -3); } }
      else if (!isFinite(g2.z) || nz < Z[0] - 30) { const s = fp.safe; if (s) { q.u = s.u; q.v = s.v; q.z = s.z; q.lv = s.lv; } fp.air = false; fp.vz = 0; PP.ui.toast('差点掉下去！回到刚才站的地方', 1.6); }
      else { q.z = nz; q.lv = lvAt(q.z); }
    } else if (isFinite(g.z)) { if (q.z - g.z > stH) { fp.air = true; fp.vz = 0; fp.fallZ = q.z; } else { q.z = g.z; q.lv = g.lv;
        // 卡在缝里（站着却被墙夹住）超过半秒：回到刚才站稳的地方
        const want = mv || st || fp.auto, movedNow = fp.lastP ? Math.hypot(q.u - fp.lastP[0], q.v - fp.lastP[1]) : 1; fp.lastP = [q.u, q.v];
        if (blocked(q.u, q.v, q.z) && want && movedNow < 0.01) { fp.stuckT = (fp.stuckT || 0) + dt; if (fp.stuckT > 1 && fp.safe) { Object.assign(q, fp.safe); fp.stuckT = 0; fp.auto = null; PP.ui.toast('卡住了，回到刚才站的地方', 1.4); } } // 想走却一动不动 1 秒才救
        else if (!blocked(q.u, q.v, q.z)) { fp.stuckT = 0; if (!g.ramp && q.z > Z[0] - 1 && onFloor(q) && (!fp.safeT || performance.now() - fp.safeT > 300)) { fp.safe = { u: q.u, v: q.v, z: q.z, lv: q.lv }; fp.safeT = performance.now(); } } } }
    if (!blocked(q.u, q.v, q.z)) fp.okUV = [q.u, q.v];
    /* 跑到屋顶、外沿上下不来：在地面以外待了一会儿、又不是在楼梯上，就提示按 R 回去 */
    if (!fp.air && !fp.pose && !onFloor(q) && !overFloor(q) && !area().ramps.some((r) => inRampF(r, q.u, q.v))) { fp.offT = (fp.offT || 0) + dt; if (fp.offT > 4 && !fp.offTold) { fp.offTold = true; PP.ui.toast('下不来了？按 R 回到刚才站的地面', 4); } } else { fp.offT = 0; fp.offTold = false; }
    p.anim = fp.air ? (fp.vz > 0 ? 'jump' : 'fall') : fp.pose ? fp.pose : (mv || st || fp.auto) ? (K.has('run') || fp.auto ? 'run' : 'walk') : 'idle';
    fpSync();
    if ((fp.saveT += dt) > 3) { fp.saveT = 0; fpRemember(); }
  }
  // ---- 镜头 ----
  function fpCam() { if (fp._camT === fp.last && fp._cam) return fp._cam; fp._camT = fp.last; return (fp._cam = fpCam1()); }
  function fpCam1() {
    const q = fp.q, walking = !fp.air && (fp.keys.has('f') || fp.keys.has('b') || fp.keys.has('l') || fp.keys.has('r') || fp.auto), b = Math.sin(fp.bob) * 0.16 * (fp._cba = (fp._cba || 0) + ((walking ? 1 : 0) - (fp._cba || 0)) * 0.12);
    const land = fp.land ? (() => { const k = (performance.now() - fp.land) / 420; return k >= 1 ? 0 : -0.9 * Math.sin(Math.min(1, k * 3) * Math.PI / 2) * (1 - k) * (1 - k); })() : 0; /* 落地：往下一沉再慢慢起来，不是一下弹回 */
    // 弯腰：头顶空间不够就把眼睛放低（慢慢低下去、慢慢直起来）
    const want = fp.swim ? SWE : fp.pose === 'sit' ? 4.4 : fp.pose === 'lie' ? 2.0 : fp.crouch ? 3.6 : EYE; /* 眼睛高度只看你是站着、蹲着还是坐着躺着，不再碰到低处就自己矮下去 */ fp.eyeH = fp.eyeH == null ? want : fp.eyeH + (want - fp.eyeH) * 0.25;
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
  function fpOpts(extra) { const k = fpK(), pix = fpQ() === 'pixel'; return Object.assign({}, viewOpts(), { msaa: !pix, w: Math.ceil(L.vw / k), h: Math.ceil(L.vh / k), posterize: pix ? 26 : 0, cel: pix, fp: fpCam(), cut: null, clip: null, mirror: false, pets: [], rips: rips.filter((r) => performance.now() / 1000 - r[2] < 4).slice(-4) }, extra || {}); }
  // 准星 / 点到的地方是什么
  function hotFromId(id) {
    if (id == null || id < 0) return null;
    if (F.RELICS && id >= PK.relic && id < PK.relic + F.RELICS.length) { const r = F.RELICS[id - PK.relic]; return (E().relics || {})[r.id] ? null : { k: 'relic', r, label: `古城遗物：${r.nm}（游过去点一下捡起来）` }; }
    if (FIXK[id]) return Object.assign({}, FIXK[id]);
    if (id >= F.SW_PK && id < F.SW_PK + F.ROOMS.length) { const i = id - F.SW_PK, r = F.ROOMS[i]; return { k: 'switch', i, label: (lightOn(i) ? '电灯开关：关灯' : '电灯开关：开灯') + '（' + r.nm + '）' }; }
    if (id >= PK.plot && id < PK.plot + 6) { const i = id - PK.plot, inf = PP.econ.plotInfo(i); return { k: 'plot', i, label: !inf ? '菜地：播种' : inf.stage === 3 ? '菜地：收获' : '菜地：浇水' }; }
    if (id >= PK.deco && id < PK.deco + 6) { const i = id - PK.deco, d = (E().isleDeco || [])[i]; if (['bench', 'swing', 'hay'].includes(d)) return { k: 'deco', i, id: d, label: { bench: '长椅：坐一会儿', swing: '秋千：荡一荡', hay: '干草垛：趴一会儿' }[d] }; return null; }
    const pr = props().find((q) => q.id === id); return pr ? { k: 'prop', pr, label: propLabel(pr) } : null;
  }
  function fpPick(x, y) { try { const k = fpK(); return glOK ? g3.draw(lastScenes, fpOpts({ pickAt: [x / k, y / k] })) : -1; } catch (e) { return -1; } }
  // ---------- 第一人称钓鱼（像我的世界 / 原神）：对准水面点一下抛竿，浮漂落到你瞄的地方；咬钩时浮漂一沉、溅起水花，这时点一下就钓上来；随时都能收竿 ----------
  function castPoint() {
    const cam = fpCam(), P0 = F.pondFrame(), PL = F.POOL_L, y = cam.yaw, pt = cam.pitch; let x, v2;
    const ez = isFinite(cam.eye[2]) ? cam.eye[2] : fp.q.z + EYE; if (pt < -0.03) { const t = (POOL.z - ez) * 1.155 / Math.sin(pt); x = cam.eye[0] + Math.cos(pt) * Math.cos(y) / 2.83 * t; v2 = cam.eye[1] + Math.cos(pt) * Math.sin(y) / 2.83 * t; }
    else { x = cam.eye[0] + Math.cos(y) * 5; v2 = cam.eye[1] + Math.sin(y) * 5; }
    const l = F.toL(P0, x, v2), lu = U.clamp(l[0], PL.u0 + 1.2, PL.u1 - 1.2), lv = U.clamp(l[1], PL.v0 + 1.2, PL.v1 - 1.2); return F.toW(P0, lu, lv);
  }
  /* 钓鱼（0.38）：先选饵再抛竿。按饵挑出这一竿会来的鱼——它真的从远处游过来（水里看得见），在钩边转一转、
     试探着啄几下（浮漂轻轻点水），然后一口咬住（浮漂猛地往下沉）：这时候收竿才钓得上；每种鱼来得快慢、啄几下、
     给你多长时间收竿都不一样。没收住它就带着饵跑了，过一会儿再来下一条 */
  function fpFish() {
    const f = fp.fish, now = performance.now(), p = fp.p;
    if (f) { // 收竿
      if (f.ph === 'bite') { const d = day(); let got = null; if (PP.FISHDEX) { got = PP.FISHDEX.caught(p, f.sp); if (got.eff !== 'junk' && d.fish < 14) d.fish++; } else { PP.econ.addFish(1, '钓到一条鱼'); d.fish++; }
        fp.catchShow = { id: got && got.id, name: got ? got.name : '小鱼', t: now }; gain(p, got ? '钓到了 ' + got.name + '！' : '钓到一条鱼！'); if (got && (got.id === 'minnow' || got.id === 'medaka')) { PP.econ.give('bait_minnow', 1); setTimeout(() => PP.ui.toast('小' + got.name + '放进了活饵桶——能当活饵钓鳜鱼、鲶鱼', 2.2), 1200); } }
      else if (f.ph === 'nibble') PP.ui.toast('太早了——它还在试探，鱼吓跑了', 1.6);
      else if (f.ph === 'fly' || f.ph === 'wait' || f.ph === 'come') PP.ui.toast('收竿了——还没咬钩呢，再耐心等等', 1.4);
      ripple(f.u, f.v); fp.fish = null; p.tool = null; return;
    }
    if (fp.q.lv !== FISH.lv || Math.hypot(fp.q.u - BOB.u, fp.q.v - BOB.v) > 10) { PP.ui.toast('走到古城之池边上，对准水面再点一下抛竿', 1.6); return; }
    baitPop((bait) => { if (!fp || fp.fish) return; const pt = castPoint(); fp.fish = { ph: 'fly', u: pt[0], v: pt[1], t0: now, bait }; nextFish(fp.fish, performance.now() + 600); p.tool = { k: 'rod', t0: now }; });
  }
  // 安排下一条鱼：挑种类、从哪个方向游过来、多久到、啄几下、咬住给多长时间
  function nextFish(f, from) { const D = PP.FISHDEX, sp = D ? D.rollBait(f.bait) : null, B = (D && sp && D.BITE[sp.id]) || [4, 10, 2, 1.2], slow = f.bait ? 1 : 2.2, a = Math.random() * 6.2832;
    f.sp = sp; f.come = from + U.rand(B[0], B[1]) * 1000 * slow * 0.55; f.arrive = f.come + U.rand(2500, 4500); f.nibN = B[2]; f.win = B[3] * 1000; f.from = [f.u + Math.cos(a) * 5, f.v + Math.sin(a) * 5]; f.len = sp ? U.clamp(((sp.size[0] + sp.size[1]) / 2) / 22, 0.28, 2.4) : 0.6; }
  function fishTick(now) {
    const f = fp && fp.fish; if (!f) return;
    if (f.ph === 'fly' && now - f.t0 > 600) { f.ph = 'wait'; ripple(f.u, f.v); }
    else if (f.ph === 'wait' && now > f.come) f.ph = 'come';
    else if (f.ph === 'come' && now > f.arrive) { f.ph = f.nibN > 0 ? 'nibble' : 'bite'; f.nib = 0; f.nibT = now; if (f.ph === 'bite') { f.biteEnd = now + f.win; ripple(f.u, f.v); PP.ui.toast('咬钩了！快收竿（单击 / E）', 1.2); } }
    else if (f.ph === 'nibble' && now - f.nibT > 900 + Math.random() * 600) { f.nib++; f.nibT = now; ripple(f.u, f.v); if (f.nib >= f.nibN) { f.ph = 'bite'; f.biteEnd = now + f.win; ripple(f.u, f.v); PP.ui.toast('咬钩了！快收竿（单击 / E）', 1.2); } }
    else if (f.ph === 'bite' && now > f.biteEnd) { f.ph = 'flee'; f.fleeT = now; if (f.bait) { const it = BAIT_ITEM[f.bait]; if (f.bait === 'lure') { E().lureUses = Math.max(0, (E().lureUses || 8) - 1); if (!E().lureUses) PP.econ.give(it, -1); } else PP.econ.give(it, -1); } PP.ui.toast((f.sp ? f.sp.name : '鱼') + '把饵叼跑了……' + (f.bait && !(E().bag[BAIT_ITEM[f.bait]] > 0) ? '饵用完了' : '再等下一条'), 1.6); }
    else if (f.ph === 'flee' && now - f.fleeT > 2200) { if (f.bait && !(E().bag[BAIT_ITEM[f.bait]] > 0)) f.bait = null; f.ph = 'wait'; nextFish(f, now); }
    if (Math.hypot(fp.q.u - f.u, fp.q.v - f.v) > 16 || fp.q.lv !== FISH.lv) { fp.fish = null; fp.p.tool = null; PP.ui.toast('走远了，鱼线收回来了', 1.2); }
  }
  /* 当帧那条鱼在哪儿：游过来（越近越浅）、在钩边打转啄饵、咬住时头朝下扯着、跑掉时一甩尾巴游走 */
  function fishBite(now) { const f = fp && fp.fish; if (!f || !f.sp || !['come', 'nibble', 'bite', 'flee'].includes(f.ph)) return null; const zW = F.LAKE.z;
    if (f.ph === 'come') { const k = U.clamp(1 - (f.arrive - now) / Math.max(1, f.arrive - f.come), 0, 1), e = k * k * (3 - 2 * k), u = f.from[0] + (f.u - f.from[0]) * e, v = f.from[1] + (f.v - f.from[1]) * e + Math.sin(k * 9) * 0.3 * (1 - k); return { id: f.sp.id, u, v, z: zW - 2.6 + e * 1.6, yaw: Math.atan2(f.v - f.from[1], f.u - f.from[0]), len: f.len, wag: 0.22 }; }
    if (f.ph === 'flee') { const k = (now - f.fleeT) / 2200, a = Math.atan2(f.from[1] - f.v, f.from[0] - f.u) + 0.6; return { id: f.sp.id, u: f.u + Math.cos(a) * k * 7, v: f.v + Math.sin(a) * k * 7, z: zW - 1.1 - k * 2.5, yaw: a, len: f.len, wag: 0.4 }; }
    const a = now / 900, dart = f.ph === 'nibble' ? Math.max(0, Math.sin((now - f.nibT) / 140)) * 0.25 : 0, r = f.ph === 'bite' ? 0.15 : 0.45 - dart, u = f.u - Math.cos(a) * r * (1 + f.len * 0.4) - Math.cos(a) * f.len * 0.45, v = f.v - Math.sin(a) * r * (1 + f.len * 0.4) - Math.sin(a) * f.len * 0.45;
    return { id: f.sp.id, u, v, z: zW - 1.0 - (f.ph === 'bite' ? 0.3 + Math.sin(now / 70) * 0.1 : 0), yaw: a, len: f.len, wag: f.ph === 'bite' ? 0.45 : 0.18, pitch: f.ph === 'bite' ? -0.35 : 0 }; }
  function bobNow(now) { const f = fp && fp.fish; if (!f || f.ph === 'fly') return null; const dip = f.ph === 'bite' ? 0.32 + Math.sin(now / 60) * 0.08 : f.ph === 'nibble' ? Math.max(0, 1 - (now - f.nibT) / 250) * 0.12 : Math.max(0, Math.sin(now / 420)) * 0.04; return { u: f.u, v: f.v, dip }; }
  let hotEl = null;
  function fpSlot() { S().fpSlot = 1; }
  /* 快捷栏去掉了（看着东西点一下就做对的事，像原神 / 塞尔达）：这里只负责把旧存档里留下的快捷栏收掉 */
  function fpHot() { if (hotEl) { hotEl.remove(); hotEl = null; } }
  /* 看不看得见：从眼睛到它身子中间连一条线，路上碰到墙、地板（实心的方块）就看不见。每只 0.15 秒算一次 */
  function sees(o, eye, q) {
    const now = performance.now(); if (o._seeT && now - o._seeT < 150) return o._see; o._seeT = now;
    const V = voxels(), tz = (q.z != null ? q.z : Z[q.lv]) + 3, du = q.u - eye[0], dv = q.v - eye[1], dz = tz - eye[2], d = Math.hypot(du, dv, dz / 2.45);
    if (d > 45) return (o._see = false);
    if (!V) return (o._see = (F.roomAt(q.u, q.v, q.lv) || null) === (F.roomAt(fp.q.u, fp.q.v, fp.q.lv) || null));
    /* 身子中间、左边、右边、头顶四条视线都没被挡才画（伙伴是一张平的图，半个身子在墙后面时整张画在墙前面就像穿模；宁可等它整个走出来再出现） */
    const L0 = Math.hypot(du, dv) || 1, px = -dv / L0 * 0.7, py = du / L0 * 0.7, ray = (tu, tv, tz2) => { const a = tu - eye[0], b = tv - eye[1], c = tz2 - eye[2], dd = Math.hypot(a, b, c / 2.45), n = Math.ceil(dd / 0.2); for (let i = 2; i < n - 3; i++) { const k = i / n; if (vAt(V, eye[0] + a * k, eye[1] + b * k, eye[2] + c * k)) return false; } return true; };
    const z0 = (q.z != null ? q.z : Z[q.lv]);
    return (o._see = ray(q.u, q.v, tz) && ray(q.u + px, q.v + py, tz) && ray(q.u - px, q.v - py, tz) && ray(q.u, q.v, z0 + 5.5));
  }
  /* 准星对着的伙伴（画在画面上的纸片人：按屏幕位置和远近判断） */
  function aimPet(x, y) {
    let best = null;
    for (const v of fp.vis || []) { if (v.me) continue; const o = v.o, q = o.isleSpot ? { u: o.isleSpot.u, v: o.isleSpot.v } : o.ip; if (!q || Math.hypot(q.u - fp.q.u, q.v - fp.q.v) > REACH + 3) continue;
      if (Math.abs(x - v.sx) < Math.max(14, v.px * 0.4) && y < v.sy + 4 && y > v.sy - Math.max(24, v.px * 1.1) && (!best || v.d < best.d)) best = v; }
    return best && best.o;
  }
  const FOODS = () => { const e = E(), I = PP.econ.ITEMS; return Object.keys(e.bag).filter((k) => e.bag[k] > 0 && I[k] && ['snack', 'dish', 'crop'].includes(I[k].kind)); };
  /* 对着伙伴点一下：摸摸 / 喂它吃的；按 B 是给自己吃 */
  function foodPop(o, x, y, self) {
    const I = PP.econ.ITEMS, e = E(), fs = FOODS().slice(0, 6);
    if (self && !fs.length) { PP.ui.toast('背包里没有吃的（商店能买零食，菜地能收菜）', 2); return; }
    const el = document.createElement('div'); el.className = 'seedpick';
    el.innerHTML = `<div class="sp-head"><b>${self ? '吃点什么？' : (o.d.name || '小伙伴')}</b></div><div class="sp-list">${self ? '' : '<button class="sp" data-a="pat">✋<b>摸摸它</b></button>'}${fs.map((k) => `<button class="sp" data-a="feed" data-k="${k}">${I[k].icon || '🍪'}<b>${self ? '' : '喂它'}${I[k].name}</b><small>还有 ${e.bag[k]}</small></button>`).join('')}${!self && !fs.length ? '<div class="muted">背包里没有吃的</div>' : ''}</div>`;
    el.addEventListener('click', (ev) => { const b = ev.target.closest('button.sp'); if (!b) return; PP.hud && PP.hud.close();
      if (b.dataset.a === 'pat') { o.run('petted', PP.ACTIONS.petted); if (PP.quest && !o.d.wild) PP.quest.on('pat'); } else PP.econ.feedItem(o, b.dataset.k); });
    if (PP.hud) PP.hud.pop(el, { x, y }); popCheck();
  }
  /* 吊篮：挂在树干外面，每层回廊一站；点一下选去哪层，画面淡一下就到了（第一人称）；上帝视角里点它就让主角走过去坐 */
  /* 古城遗物要游得过去、看得见：体素建好后，被房子、桥、根压着的就往旁边挪到最近的空地方 */
  function relicFit() { for (const r of F.RELICS || []) { if (r.fit) continue; r.fit = true; if (!blocked(r.u, r.v, r.z + 2.5) && !blocked(r.u, r.v, r.z + 0.6)) continue;
      outer: for (let rad = 1; rad <= 7; rad += 0.75) for (let k = 0; k < 16; k++) { const a = k / 16 * 6.2832, u = r.u + Math.cos(a) * rad, v = r.v + Math.sin(a) * rad; if (!F.inLake(u, v, 1)) continue; const g = surf(u, v, r.z + 4); if (!isFinite(g.z) || g.z > F.LAKE.z - 3) continue; if (blocked(u, v, g.z + 2.5) || blocked(u, v, g.z + 0.6)) continue; r.u = u; r.v = v; r.z = g.z + 0.4; break outer; } }
    glowKey = ''; }
  function relicGet(r) {
    const e = E(), got = (e.relics = e.relics || {}); if (got[r.id]) return; got[r.id] = true; const n = F.RELICS.filter((q) => got[q.id]).length, all = F.RELICS.length;
    PP.econ.addFish(30, '找到古城遗物'); gain(fp.p, '+30 小鱼干'); fp.relicShow = { r, t: performance.now(), n, all }; PP.sfx && PP.sfx('pop'); PP.save.soon();
    if (n === all) setTimeout(() => { PP.econ.addFish(200, '古城的秘密都找齐了'); PP.ui.toast('八件古城遗物都找齐了！+200 小鱼干——这座城的故事，你都知道了', 4); }, 2600);
  }
  /* 光晕和逆光（0.31）：会发光的东西（码头灯笼、楼梯门灯笼、古城遗物、开着的屋里灯、地窖石炉）在画面上叠一圈柔和的光（看得见才画，用体素视线判断），夜里更亮；
     对着太阳看、太阳没被挡住时，画面上有一团耀光、几道光芒和一串淡淡的镜头光斑（像原神里抬头看太阳） */
  let glowPts = null, glowKey = '';
  function fpGlow(ctx, x0, y0, w, h, now, cam, cyw, syw, cp, sp, f) {
    const V = voxels(), ph = phase(), nightK = ph === 'night' ? 1 : ph === 'dusk' || ph === 'dawn' ? 0.6 : 0.18;
    const P = (u, v, z) => { const mx = (u - cam.eye[0]) * 2.83, my = (v - cam.eye[1]) * 2.83, mz = (z - cam.eye[2]) * 1.155, rx = -mx * syw + my * cyw, fw = mx * cyw + my * syw, u2 = mz * cp - fw * sp, f2 = mz * sp + fw * cp; return f2 < 1 ? null : [x0 + w / 2 + (rx * f / (w / h)) / f2 * (w / 2), y0 + h / 2 - (u2 * f) / f2 * (h / 2), f2]; };
    const seen = (u, v, z) => { if (!V) return true; const du = u - cam.eye[0], dv = v - cam.eye[1], dz = z - cam.eye[2], d = Math.hypot(du, dv, dz / 2.45), n = Math.ceil(d / 0.3); for (let i = 2; i < n - 2; i++) { const k = i / n; if (vAt(V, cam.eye[0] + du * k, cam.eye[1] + dv * k, cam.eye[2] + dz * k)) return false; } return true; };
    const K = lightK, got = E().relics || {}, key = K.map((k) => (k > 0.5 ? 1 : 0)).join('') + Object.keys(got).join(',');
    if (!glowPts || glowKey !== key) { glowKey = key; glowPts = [];
      for (const [u, v] of F.LAMPS) glowPts.push([u, v + 0.5, 5.1, [255, 214, 140], 1]);
      if (F.GAL_LAMPS) for (const [u, v, z] of F.GAL_LAMPS()) glowPts.push([u, v, z, [255, 210, 140], 0.7]);
      for (const [lv, deg] of [[1, 90], [2, 180], [3, 270]]) for (const sg of [-1, 1]) { const a = deg * Math.PI / 180 + sg * 0.3; glowPts.push([24 + Math.cos(a) * 8.7, 24 + Math.sin(a) * 8.7, Z[lv] + 7, [255, 206, 130], 0.8]); }
      for (const r of F.RELICS || []) if (!got[r.id]) { const n2 = parseInt(r.col.slice(1), 16); glowPts.push([r.u, r.v, r.z + 1.6, [(n2 >> 16) & 255, (n2 >> 8) & 255, n2 & 255], 1.3, true]); }
      F.lightBoxes().forEach((b, i) => { if (K[i] > 0.5) { const c2 = b.a; glowPts.push([c2[0], c2[1], b.b[3] - 2.6, [255, 220, 160], 1.1]); } });
      const st = F.RM.store; if (st && st.c) { const a = st.deg * Math.PI / 180, fu = st.c[0] + Math.cos(a) * 3.2, fv = st.c[1] + Math.sin(a) * 3.2; glowPts.push([fu, fv, Z[1] + 1.5, [255, 150, 70], 1.2]); } }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const S0 = Math.min(w, h);
    for (const [u, v, z, col, pw, under] of glowPts) { const q = P(u, v, z); if (!q || q[2] > 260) continue; if (q[0] < x0 - 80 || q[0] > x0 + w + 80 || q[1] < y0 - 80 || q[1] > y0 + h + 80) continue; if (!seen(u, v, z)) continue;
      const dist = q[2] / 2.83, R2 = U.clamp(S0 * 0.9 / (dist + 4), 6, S0 * 0.22) * pw, al = (under ? 0.55 : 0.18 + 0.5 * nightK) * pw; const gr = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], R2);
      gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${Math.min(0.9, al)})`); gr.addColorStop(0.25, `rgba(${col[0]},${col[1]},${col[2]},${al * 0.35})`); gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`); ctx.fillStyle = gr; ctx.fillRect(q[0] - R2, q[1] - R2, R2 * 2, R2 * 2); }
    // 逆光：太阳的方向和天上画的太阳一致（方位 0.9、仰角 0.42）
    if (nightK < 0.5 && !fp.under) { const az = 0.9, el = 0.42, dx = Math.cos(az) * Math.cos(el), dy = Math.sin(az) * Math.cos(el), dz = Math.sin(el) / 1.155 * 2.83, q = P(cam.eye[0] + dx * 4000, cam.eye[1] + dy * 4000, cam.eye[2] + dz * 4000);
      if (q && q[0] > x0 - w * 0.3 && q[0] < x0 + w * 1.3 && q[1] > y0 - h * 0.3 && q[1] < y0 + h * 1.3) { let clear = true; if (V) for (let d = 1.5; d < 60; d += 0.5) if (vAt(V, cam.eye[0] + dx * d, cam.eye[1] + dy * d, cam.eye[2] + dz * d * 0.41)) { clear = false; break; }
        fp._sunK = (fp._sunK || 0) + ((clear ? 1 : 0) - (fp._sunK || 0)) * 0.15; const k = fp._sunK * (1 - Math.min(1, Math.hypot(q[0] - (x0 + w / 2), q[1] - (y0 + h / 2)) / (w * 0.75)));
        if (k > 0.02) { const R3 = S0 * 0.5, g2 = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], R3); g2.addColorStop(0, `rgba(255,250,230,${0.85 * k})`); g2.addColorStop(0.12, `rgba(255,236,190,${0.4 * k})`); g2.addColorStop(1, 'rgba(255,230,180,0)'); ctx.fillStyle = g2; ctx.fillRect(q[0] - R3, q[1] - R3, R3 * 2, R3 * 2);
          for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.2, L2 = S0 * (0.2 + (i % 2) * 0.14); ctx.strokeStyle = `rgba(255,244,214,${0.18 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + Math.cos(a) * L2, q[1] + Math.sin(a) * L2); ctx.stroke(); }
          const cx = x0 + w / 2, cy = y0 + h / 2; for (const [t2, r2, c3] of [[0.55, 0.05, '200,230,255'], [0.9, 0.025, '255,220,180'], [1.3, 0.07, '180,255,220'], [1.6, 0.035, '255,200,230']]) { const gx = q[0] + (cx - q[0]) * t2 * 1.4, gy = q[1] + (cy - q[1]) * t2 * 1.4, rr = S0 * r2; const g3b = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr); g3b.addColorStop(0, `rgba(${c3},${0.16 * k})`); g3b.addColorStop(1, `rgba(${c3},0)`); ctx.fillStyle = g3b; ctx.fillRect(gx - rr, gy - rr, rr * 2, rr * 2); } } } }
    ctx.restore();
  }
  /* ---- 第一人称的手：3D 模型（0.33）----
     袖子（青绿针织）+ 奶白罗纹袖口 + 圆润的手掌 + 四根两节的手指 + 拇指，颜色跟着主角的毛色；
     手腕在屏幕上的位置、转角、握拳程度都来自 drawHands 里的弹簧（fp._vmPose），换算到镜头前 2.2 的地方 */
  let vmGpu = null;
  function buildVM() {
    const ps = fp._vmPose, HS = PP.HANDS; if (!ps || !ps.R || ps.R.x == null || !HS) return null;
    const cam = fpCam(), MU = 2.83, MZ = 1.155, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const Fv = [cy * cp, sy * cp, sp], Uv = [-cy * sp, -sy * sp, cp], Rv = [-sy, cy, 0], E = [cam.eye[0] * MU, cam.eye[1] * MU, cam.eye[2] * MZ];
    const f = 1 / Math.tan(cam.fov / 2), asp = ps.w / ps.h, D = 2.3, K = 1.9, m = new g3.Mesh();
    // 局部（a 右、b 上、c 前）→ 世界：先绕横轴往前倾一点、再按弹簧给的转角转，最后放到手腕在屏幕上的那个点（镜头前 D 远）
    const frame = (st, mir, tilt = 0.45) => { const xn = (st.x / 100) * 2 - 1, yn = 1 - (st.y / 100) * 2, rx0 = xn * D * asp / f, uy0 = yn * D / f, cr = Math.cos(st.r), sr = Math.sin(st.r), k = (st.k || 1) * K, ct = Math.cos(tilt), stt = Math.sin(tilt);
      const rot = (a, b, c) => { a *= mir; const b2 = b * ct - c * stt, c2 = b * stt + c * ct; return [a * cr + b2 * sr, -a * sr + b2 * cr, c2]; };
      const pos = (p) => { const [a, b, c] = rot(p[0], p[1], p[2]), X = rx0 + a * k, Y = uy0 + b * k, Zf = D + c * k; return [(E[0] + Rv[0] * X + Uv[0] * Y + Fv[0] * Zf) / MU, (E[1] + Rv[1] * X + Uv[1] * Y + Fv[1] * Zf) / MU, (E[2] + Rv[2] * X + Uv[2] * Y + Fv[2] * Zf) / MZ]; };
      const nor = (n) => { const [a, b, c] = rot(n[0], n[1], n[2]); return [Rv[0] * a + Uv[0] * b + Fv[0] * c, Rv[1] * a + Uv[1] * b + Fv[1] * c, Rv[2] * a + Uv[2] * b + Fv[2] * c]; };
      const scr = (p) => { const [a, b, c] = rot(p[0], p[1], p[2]), X = rx0 + a * k, Y = uy0 + b * k, Zf = D + c * k; return [ps.x0 + ps.w / 2 + X * f / asp / Zf * (ps.w / 2), ps.y0 + ps.h / 2 - Y * f / Zf * (ps.h / 2)]; };
      return { pos, nor, scr }; };
    const emit = (geo, fr) => { for (let i = 0; i + 2 < geo.length; i += 3) { const a = geo[i], b = geo[i + 1], c = geo[i + 2]; m.triN(fr.pos(a[0]), fr.pos(b[0]), fr.pos(c[0]), fr.nor(a[1]), fr.nor(b[1]), fr.nor(c[1]), a[2], b[2], c[2], a[3] || 0); } };
    const kind = ps.kind, R = ps.R, Lh = ps.L, frR = frame(R, 1), showL = ps.twoL && Lh && Lh.x != null && Lh.y < 125, frL = showL ? frame(Lh, -1) : null;
    emit(HS.hand(R.g || 0, ps.pal), frR); if (showL) emit(HS.hand(Lh.g || 0, ps.pal), frL);
    // 手里的东西
    fp._tip = null;
    if (kind === 'can' || kind === 'water') emit(HS.item('can'), frR);
    else if (kind === 'rod' || kind === 'fish') { emit(HS.item('rod'), frR); fp._tip = frR.scr(HS.rodTip()); }
    else if (kind === 'snack') emit(HS.item('bun'), frame({ x: R.x - 4, y: R.y - 12, r: 0, k: R.k }, 1, 0.2));
    if (showL && (kind === 'seed' || kind === 'sow')) emit(HS.item('pouch'), frL);
    if (showL && kind === 'harvest') emit(HS.item('basket'), frL);
    if (showL && (kind === 'wood' || kind === 'eat')) { const mid = { x: (R.x + Lh.x) / 2, y: Math.min(R.y, Lh.y) - (kind === 'eat' ? 16 : 10), r: 0, k: (R.k + Lh.k) / 2 }; emit(HS.item(kind === 'wood' ? 'logs' : 'bun'), frame(mid, 1, kind === 'eat' ? 0.2 : 0.1)); }
    return m;
  }
  /* 神龛（0.36）：上香（一炷香烧半小时，烟袅袅；全家心情变好，每天第一次上香得一点福气）、许愿（写下来挂在许愿架上）、还愿（愿望实现了回来谢一谢） */
  const shrineE = () => { const e = E(); return (e.shrine = e.shrine || { incense: 0, day: '', wishes: [] }); };
  function shrinePop(x, y) {
    const sh = shrineE(), lit = Date.now() - (sh.incense || 0) < 30 * 60000, open2 = sh.wishes.filter((w) => !w.done), done = sh.wishes.filter((w) => w.done).length;
    const el = document.createElement('div'); el.className = 'seedpick shrinepop';
    el.innerHTML = `<div class="sp-head"><b>神龛</b><small>${lit ? '香还在烧，青烟袅袅' : '香炉里是凉的'}</small></div>
      <div class="sp-list"><button class="sp" data-a="incense" ${lit ? 'disabled' : ''}>🪔<b>上香</b></button><button class="sp" data-a="wish">🙏<b>许愿</b></button></div>
      <div class="wishform" style="display:none"><input class="wishin" maxlength="40" placeholder="写下你的心愿（40 字以内）"><button class="sp small" data-a="wishok">挂上许愿牌</button></div>
      ${open2.length ? `<div class="sp-sub">还没还的愿（实现了就点「还愿」）：</div>` + open2.slice(-6).map((w) => `<div class="wishrow"><span>「${esc(w.text)}」<small>${new Date(w.t).toLocaleDateString()}</small></span><button class="sp small" data-a="repay" data-id="${w.id}">还愿</button></div>`).join('') : ''}
      ${done ? `<div class="sp-sub">已经还了 ${done} 个愿 ✓</div>` : ''}`;
    el.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; const a = b.dataset.a, pets = G.pets.filter((q) => !q.d.wild);
      if (a === 'incense') { sh.incense = Date.now(); const today = new Date().toDateString(), first = sh.day !== today; sh.day = today; for (const q of pets) q.n.fun = Math.min(100, q.n.fun + 10); if (first) PP.econ.addFish(10, '上香得到的福气'); PP.save.soon(); PP.hud && PP.hud.close(); PP.ui.toast(`点上三炷香，青烟慢慢飘起来…（全家心情 +10${first ? '，今天的福气 +10 小鱼干' : ''}）`, 3); if (fp) gain(fp.p, '心情 +10'); dirtyK++; return; }
      if (a === 'wish') { const f = el.querySelector('.wishform'); f.style.display = 'flex'; el.querySelector('.wishin').focus(); return; }
      if (a === 'wishok') { const t = (el.querySelector('.wishin').value || '').trim(); if (!t) { PP.ui.toast('先写下心愿', 1.2); return; } sh.wishes.push({ id: Date.now().toString(36), text: t, t: Date.now(), done: false }); PP.save.soon(); PP.hud && PP.hud.close(); PP.ui.toast(`许下心愿：「${t}」——写在木牌上挂好了。愿望实现了记得回来还愿`, 3.4); return; }
      if (a === 'repay') { const w = sh.wishes.find((q) => q.id === b.dataset.id); if (!w) return; w.done = true; w.doneT = Date.now(); for (const q of pets) q.n.fun = Math.min(100, q.n.fun + 15); PP.econ.addFish(20, '还愿'); PP.save.soon(); PP.hud && PP.hud.close(); PP.ui.toast(`还愿：「${w.text}」✓ 谢谢保佑（全家心情 +15，+20 小鱼干）`, 3.4); if (fp) gain(fp.p, '心情 +15'); } });
    el.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { const b = el.querySelector('[data-a=wishok]'); b && b.click(); } }, true);
    if (PP.hud) PP.hud.pop(el, { x, y }); popCheck(); lookFree && fp && lookFree();
  }
  function liftPop(from, x, y) {
    const el = document.createElement('div'); el.className = 'seedpick';
    el.innerHTML = `<div class="sp-head"><b>吊篮去哪层？</b></div><div class="sp-list">${[1, 2, 3].map((lv) => `<button class="sp" data-lv="${lv}" ${lv === from ? 'disabled' : ''}>${['', '🌊', '🌿', '🌳'][lv]}<b>${F.NAME[lv]}</b></button>`).join('')}</div>`;
    el.addEventListener('click', (ev) => { const b = ev.target.closest('button.sp'); if (!b || b.disabled) return; PP.hud && PP.hud.close(); liftGo(+b.dataset.lv); });
    if (PP.hud) PP.hud.pop(el, { x, y }); popCheck();
  }
  function liftGo(lv) {
    if (!fp) return; const LF = F.LIFT; let a = (LF.deg + 9) * Math.PI / 180, u = 24 + Math.cos(a) * 10, v = 24 + Math.sin(a) * 10, g = surf(u, v, Z[lv] + 2); /* 下篮子站到回廊上（吊篮旁边一步），不是站进篮子里或树皮里 */
    for (const dd of [9, -9, 15, -15, 22]) { a = (LF.deg + dd) * Math.PI / 180; u = 24 + Math.cos(a) * 10; v = 24 + Math.sin(a) * 10; g = surf(u, v, Z[lv] + 2); if (isFinite(g.z) && Math.abs(g.z - Z[lv]) < 0.6 && !blocked(u, v, g.z)) break; }
    fp.fade = performance.now(); fp.q.u = u; fp.q.v = v; fp.q.lv = lv; fp.q.z = isFinite(g.z) ? g.z : Z[lv]; fp.air = false; fp.vz = 0; fp.swim = false; fp.auto = null; fp._cam = null; fp.camZ = null; fp.yaw = a + Math.PI; fpSync();
    PP.ui.toast(`吊篮嘎吱嘎吱地把你送到了${F.NAME[lv]}`, 1.6); PP.sfx && PP.sfx('pop');
  }
  /* 古城之池（0.36）：唯一的入口。站在池边点水面 → 选「钓鱼」还是「下潜」；在水下游回池塘底下、浮到水面 → 按 E「上岸」 */
  function pondOut() { const P0 = PP.CITY && PP.CITY.POND; if (!P0 || !fp) return; const cu = (P0.u0 + P0.u1) / 2, g = surf(cu - 1, P0.v1 + 1.6, 3); fp.q.u = cu - 1; fp.q.v = P0.v1 + 1.6; fp.q.z = isFinite(g.z) ? g.z : 0; fp.q.lv = 1; fp.swim = false; fp.under = false; fp.atPond = false; fp.vz = 0; fp.air = false; fp.fade = performance.now(); fp.yaw = -Math.PI / 2; fp._cam = null; fp.camZ = null; fpSync(); PP.ui.toast('爬上岸了，抖一抖身上的水', 1.6); }
  function pondDive() { const P0 = PP.CITY && PP.CITY.POND; if (!P0 || !fp) return; if (fp.fish) fpFish(); fp.q.u = (P0.u0 + P0.u1) / 2 + 1.5; fp.q.v = (P0.v0 + P0.v1) / 2 + 2.2; fp.q.z = F.LAKE.z - SWE - 2; fp.q.lv = 1; fp.swim = true; fp.air = false; fp.vz = -8; fp.pitch = -0.9; fp.fade = performance.now(); fp._cam = null; fp.camZ = null; fpSync(); PP.ui.toast('扑通——下潜！空格往上浮，Ctrl / C 往下潜；游回池塘底下浮上来就能上岸', 3.2); }
  /* 加工工坊的工作台：列出能做的东西（缺什么就灰掉、写清楚差什么），点一下（或按数字键）就做 */
  function workshopPop(x, y) {
    const CR = PP.CRAFT; if (!CR) return; const e = E(), I = PP.econ.ITEMS;
    const el = document.createElement('div'); el.className = 'seedpick craftpick';
    el.innerHTML = `<div class="sp-head"><b>加工工坊</b><span class="muted">找鱼饵 · 做东西 · 柴 ${Math.round(fort().fuel)}</span></div><div class="sp-list">${CR.FIND.filter((f) => f.where === 'work').map((f) => { const ls = CR.findLack(f); return `<button class="sp find" data-f="${f.id}" ${ls.length ? 'disabled' : ''} title="${esc(f.how)}"><img class="bico" src="${CR.iconURL(f.icon)}"><b>${esc(f.name)}</b><small>${ls.length ? esc(ls.join('、')) : '现在' + (PP.ECO ? ['很少', '不多', '挺多', '很多'][Math.min(3, Math.floor(PP.ECO.st().pop[f.pop] * 4))] : '')}</small><em>岛上找的</em></button>`; }).join('')}${CR.RECIPES.map((r) => { const ls = CR.lack(r); const ok = Object.keys(r.out)[0]; return `<button class="sp" data-r="${r.id}" ${ls.length ? 'disabled' : ''} title="${esc(r.how)}">${/^bait_/.test(ok) ? `<img class="bico" src="${CR.iconURL(ok)}">` : `<span class="ico">${r.icon}</span>`}<b>${esc(r.name)}</b><small>${esc(CR.inText(r))}</small><em>→ ${esc(CR.outText(r))}</em>${ls.length ? `<small class="lack">还差：${esc(ls.join('、'))}</small>` : ''}</button>`; }).join('')}</div><div class="sp-foot">方向键选 · 回车做 · Esc 关　　背包里的鱼饵：${Object.keys(I).filter((k) => I[k].kind === 'bait' && e.bag[k]).map((k) => I[k].name + ' ' + e.bag[k]).join(' · ') || '还没有'}</div>`;
    el.addEventListener('click', (ev) => { const b = ev.target.closest('button.sp'); if (!b || b.disabled) return; if (b.dataset.f) { PP.hud && PP.hud.close(); const f = CR.FIND.find((q) => q.id === b.dataset.f), p2 = mainP(); if (fp) fp.work = { t0: performance.now(), dur: f.t * 1000, label: '正在' + f.name }; setTimeout(() => { const r2 = CR.findDo(f); if (r2) { if (p2) gain(p2, r2); else PP.ui.toast(r2, 2); } }, f.t * 1000); return; } const r = CR.RECIPES.find((q) => q.id === b.dataset.r); PP.hud && PP.hud.close(); if (!r) return;
      const p = mainP(); if (p) { p.tool = { k: 'work', t0: performance.now() }; } if (fp) fp.work = { t0: performance.now(), dur: r.t * 1000, label: '正在' + r.name };
      setTimeout(() => { if (p && p.tool && p.tool.k === 'work') p.tool = null; if (CR.make(r)) { if (p) gain(p, '做好了：' + CR.outText(r)); else PP.ui.toast('做好了：' + CR.outText(r), 2); } else PP.ui.toast('材料不够了', 1.4); }, r.t * 1000); });
    if (PP.hud) PP.hud.pop(el, { x, y }); popCheck();
  }
  /* 抛竿前选鱼饵：背包里有的鱼饵一个个列出来（写着哪些鱼爱吃），上次用的排第一；也能不挂饵（很难有鱼来） */
  const BAIT_ITEM = { worm: 'bait_worm', blood: 'bait_blood', shrimp: 'bait_shrimp', hopper: 'bait_hopper', cricket: 'bait_cricket', duck: 'bait_duck', minnow: 'bait_minnow', dough: 'bait_dough', sweetcorn: 'bait_corn', leaf: 'bait_leaf', jerky: 'jerky', lure: 'bait_lure' };
  function baitPop(go) {
    const e = E(), D = PP.FISHDEX, have = Object.keys(BAIT_ITEM).filter((k) => (e.bag[BAIT_ITEM[k]] || 0) > 0).sort((a, b) => (b === S().bait) - (a === S().bait));
    if (!have.length) { PP.ui.toast('没有鱼饵：空钩很难有鱼来咬。池边能捞红虫、浮萍、放虾笼；工坊能翻蚯蚓、捉虫、做面团', 3.2); go(null); return; }
    const fans = (k) => D.FISH.filter((f) => (D.PREF[f.id] || []).includes(k)).sort((a, b) => (D.PREF[a.id].indexOf(k)) - (D.PREF[b.id].indexOf(k))).map((f) => f.name).slice(0, 4).join('、');
    const el = document.createElement('div'); el.className = 'seedpick baitpick';
    el.innerHTML = `<div class="sp-head"><b>挂什么饵？</b><span class="muted">不同的鱼爱吃不同的饵</span></div><div class="sp-list">${have.map((k) => `<button class="sp" data-b="${k}"><img class="bico" src="${PP.CRAFT ? PP.CRAFT.iconURL(BAIT_ITEM[k]) : ''}"><b>${esc(D.BAIT[k].name)}</b><small>有 ${k === 'lure' ? (e.lureUses || 8) + ' 次' : e.bag[BAIT_ITEM[k]] + ' 个'}</small><em>${esc(fans(k) || '杂鱼')} 爱吃</em></button>`).join('')}<button class="sp" data-b=""><b>不挂饵</b><small>空钩</small><em>很少有鱼来</em></button></div><div class="sp-foot">方向键选 · 回车抛竿 · Esc 不钓了</div>`;
    el.addEventListener('click', (ev) => { const b = ev.target.closest('button.sp'); if (!b) return; PP.hud && PP.hud.close(); const k = b.dataset.b || null; if (k) S().bait = k; go(k); });
    if (PP.hud) PP.hud.pop(el, { x: L.vx0 + L.vw / 2, y: L.vy0 + L.vh / 2 }); popCheck();
  }
  function pondPop(x, y) {
    const el = document.createElement('div'); el.className = 'seedpick';
    const CR = PP.CRAFT, tr = CR && CR.trap(), th = tr ? (Date.now() - tr.t) / 3600000 : 0, F2 = CR ? CR.FIND.filter((f) => f.where === 'pond') : [];
    el.innerHTML = `<div class="sp-head"><b>古城之池</b><span class="muted">池边找鱼饵</span></div><div class="sp-list"><button class="sp" data-a="fish">🎣<b>钓鱼</b><small>先选鱼饵</small></button><button class="sp" data-a="dive">🤿<b>下潜</b><small>水下古城</small></button>${F2.map((f) => { const ls = CR.findLack(f); return `<button class="sp" data-f="${f.id}" ${ls.length ? 'disabled' : ''} title="${esc(f.how)}"><img class="bico" src="${CR.iconURL(f.icon)}"><b>${esc(f.name)}</b><small>${ls.length ? esc(ls.join('、')) : '现在' + (PP.ECO ? ['很少', '不多', '挺多', '很多'][Math.min(3, Math.floor(PP.ECO.st().pop[f.pop] * 4))] : '')}</small></button>`; }).join('')}<button class="sp" data-a="trap" title="${esc(CR ? CR.SHRIMP.how : '')}"><img class="bico" src="${CR ? CR.iconURL('bait_shrimp') : ''}"><b>${tr ? '收虾笼' : '放虾笼'}</b><small>${tr ? '放了 ' + (th < 1 ? Math.round(th * 60) + ' 分钟' : th.toFixed(1) + ' 小时') : '过几个小时来收'}</small></button></div>`;
    el.addEventListener('click', (ev) => { const b = ev.target.closest('button.sp'); if (!b || b.disabled) return; PP.hud && PP.hud.close(); const p = mainP();
      if (b.dataset.f) { const f = CR.FIND.find((q) => q.id === b.dataset.f); if (fp) fp.work = { t0: performance.now(), dur: f.t * 1000, label: '正在' + f.name }; setTimeout(() => { const r = CR.findDo(f); if (r) { if (p) gain(p, r); else PP.ui.toast(r, 2); } }, f.t * 1000); return; }
      if (b.dataset.a === 'trap') { if (!CR.trap()) { CR.trapSet(); PP.ui.toast('虾笼放进池子里了，挂了点菜叶——过几个小时再来收', 2.4); } else { const r = CR.trapGet(); PP.ui.toast(r.n ? `收虾笼：小河虾 ×${r.n}` : '笼子放得太短，还没有虾进去', 2.2); } return; }
      if (b.dataset.a === 'fish') fpFish(); else pondDive(); });
    if (PP.hud) PP.hud.pop(el, { x, y }); popCheck();
  }
  function fpUse(at) {
    fp.useT = performance.now();
    const x = at ? at[0] - L.vx0 : L.vw / 2, y = at ? at[1] - L.vy0 : L.vh / 2;
    if (fp.fish) { fpFish(); return; } // 正在钓鱼：点哪儿都是收竿（随时都能收）
    if (fp.swim) { if (fp.atPond) pondOut(); else PP.ui.toast(PP.CITY && PP.CITY.POND ? '这里头顶是水洞的顶——游回池塘底下（顶上透光的那个方口）再浮上去' : '', 2.2); return; }
    { const o = aimPet(L.vx0 + x, L.vy0 + y); if (o) { foodPop(o, L.vx0 + x, L.vy0 + y); return; } }
    const h = hotFromId(fpPick(x, y));
    if (h && h.k === 'fish') { const P0 = PP.CITY && PP.CITY.POND; if (P0 && Math.hypot(fp.q.u - (P0.u0 + P0.u1) / 2, fp.q.v - (P0.v0 + P0.v1) / 2) > 9) { PP.ui.toast('走到池边再用', 1.4); return; } pondPop(at ? at[0] : L.vx0 + x, at ? at[1] : L.vy0 + y); return; } // 对着池塘点一下：钓鱼还是下潜
    if (!h) { if (!at) PP.ui.toast('准星对着能用的东西（床、椅子、菜地、鱼塘……）再按 E', 1.6); return; }
    if (h.k === 'relic') { const r = h.r; if (Math.hypot(r.u - fp.q.u, r.v - fp.q.v) > REACH + 2.5 || Math.abs(r.z - fp.q.z) > 9) { PP.ui.toast('游近一点再捡', 1.4); return; } relicGet(r); return; }
    if (h.k === 'workshop') { const WS = F.WORKSHOP; if (WS && Math.hypot(WS.bench[0] - fp.q.u, WS.bench[1] - fp.q.v) > REACH + 3.5) { PP.ui.toast('走到工作台跟前再做', 1.4); return; } workshopPop(at ? at[0] : L.vx0 + x, at ? at[1] : L.vy0 + y); return; }
    if (h.k === 'shrine') { const S2 = F.SHRINE; if (S2 && Math.hypot(S2.u + 1.3 - fp.q.u, S2.v - fp.q.v) > REACH + 3) { PP.ui.toast('走到神龛前面再拜', 1.4); return; } shrinePop(at ? at[0] : L.vx0 + x, at ? at[1] : L.vy0 + y); return; }
    if (h.k === 'lift') { const LF = F.LIFT; if (Math.hypot(LF.u - fp.q.u, LF.v - fp.q.v) > REACH + 2) { PP.ui.toast('走到吊篮跟前再坐', 1.4); return; } liftPop(h.lv, at ? at[0] : L.vx0 + x, at ? at[1] : L.vy0 + y); return; }
    if (h.k === 'plot' && !nearPlot(fp.q.u, fp.q.v, h.i)) { PP.ui.toast('离菜地远了点，走到菜地边上再用', 1.4); return; }
    if (h.k === 'switch') { const w = F.switches()[h.i], p0 = w && (w.round ? [w.u, w.v] : F.toW(w.fr, w.ax === 'v' ? w.s : w.at, w.ax === 'v' ? w.at : w.s)); if (p0 && Math.hypot(p0[0] - fp.q.u, p0[1] - fp.q.v) > REACH + 1) { PP.ui.toast('够不着开关，走到门边再按', 1.4); return; } toggleLight(h.i); return; }
    const where = h.pr ? h.pr.at : null;
    if (where && Math.hypot(where[0] - fp.q.u, where[1] - fp.q.v) > REACH) { PP.ui.toast('够不着，走到跟前再用', 1.4); return; }
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
    if (lv >= 1) { out.push({ u: 24, v: 24, t: '树心楼梯' }); if (F.LIFT) out.push({ u: F.LIFT.u, v: F.LIFT.v, t: '吊篮' }); } // 楼梯和吊篮在大地图上标出来
    for (const q of F.MODS) { if (q.lv !== lv || !q.name || q.kind === 'court' || out.some((o) => o.t === q.name)) continue; const [a, b, c, d] = q.r, w = F.toW ? (q.fr ? F.toW(F.frameOf(q.fr), (a + c) / 2, (b + d) / 2) : [(a + c) / 2, (b + d) / 2]) : [(a + c) / 2, (b + d) / 2]; out.push({ u: w[0], v: w[1], t: q.name, soft: 1 }); }
    return out;
  };
  function drawMap(ctx, x, y, w, h, lv, big) {
    const md = mapData();
    if (!md) { ctx.fillStyle = 'rgba(28,24,40,.62)'; ctx.beginPath(); if (big) ctx.rect(x, y, w, h); else ctx.arc(x + w / 2, y + h / 2, w / 2, 0, 6.2832); ctx.fill(); ctx.fillStyle = '#fff6d8'; ctx.font = PP.FONT(12); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('地图准备中…', x + w / 2, y + h / 2); return null; }
    const [u0, v0, u1, v1] = md.box, sc = Math.min(w / (u1 - u0), h / (v1 - v0)) * (big && bigMap ? bigMap.z || 1 : 1);
    let cu = (u0 + u1) / 2, cv = (v0 + v1) / 2; if (big && bigMap && (bigMap.z || 1) > 1) { cu = fp.q.u; cv = fp.q.v; }
    const X = (u) => x + w / 2 + (u - cu) * sc, Y = (v) => y + h / 2 + (v - cv) * sc;
    ctx.save(); ctx.beginPath(); if (big) ctx.rect(x, y, w, h); else ctx.arc(x + w / 2, y + h / 2, w / 2, 0, 6.2832); ctx.clip();
    ctx.fillStyle = big ? 'rgba(28,24,40,.86)' : 'rgba(22,28,44,.66)'; ctx.fillRect(x, y, w, h);
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
    if (!big && fp.q.lv === lv) { const px = X(fp.q.u), py = Y(fp.q.v), R0 = w * 0.42, hf = fpFov() / 2, g = ctx.createRadialGradient(px, py, 0, px, py, R0); g.addColorStop(0, 'rgba(255,246,200,.32)'); g.addColorStop(1, 'rgba(255,246,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, R0, fp.yaw - hf, fp.yaw + hf); ctx.closePath(); ctx.fill(); } // 看着的方向：一片淡淡的扇形
    ctx.restore();
    if (big) { ctx.strokeStyle = 'rgba(255,246,216,.7)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
    else { const cx = x + w / 2, cy = y + h / 2, r = w / 2; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(236,214,160,.95)'; ctx.beginPath(); ctx.arc(cx, cy, r - 1.5, 0, 6.2832); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(70,56,40,.8)'; ctx.beginPath(); ctx.arc(cx, cy, r - 3.5, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = 'rgba(236,214,160,1)'; ctx.beginPath(); ctx.moveTo(cx, y - 5); ctx.lineTo(cx - 5, y + 4); ctx.lineTo(cx + 5, y + 4); ctx.closePath(); ctx.fill(); ctx.font = PP.FONT(9); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3a2c20'; ctx.fillText('北', cx, y + 1); } // 圆框 + 北
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
  /* 第一人称的手：右下角一直画着主角的爪子，手里拿什么看正在干什么；干活时有动作，准星上面显示「正在……」和进度条，做完闪一下 */
  const WORK_KIND = { isleWater: ['water', '正在浇水', 3.2], isleSow: ['sow', '正在播种', 3.5], isleHarvest: ['harvest', '正在收菜', 2.6], isleFish: ['fish', '正在钓鱼', 10], isleHive: ['use', '正在收蜂蜜', 3], isleDrink: ['use', '正在喝水', 3], isleMail: ['use', '正在看信箱', 2], isleUse: ['use', '正在用', 4], fed: ['eat', '正在吃', 2.5], isleStoke: ['use', '正在添柴', 6] };
  const SLOT_KIND = [null, 'hand', 'can', 'seed', 'rod', 'snack'];
  function drawHands(ctx, x0, y0, w, h, now) {
    const p = fp.p, a = p.action, fw = fp.work && now - fp.work.t0 < fp.work.dur ? fp.work : null, wk = WORK_KIND[a] || (fw ? ['hand', fw.label, fw.dur / 1000] : null), t = now / 1000; /* 加工工坊做东西时准星上方也有进度 */
    if (fp._wa !== a) { if (fp._wa && WORK_KIND[fp._wa] && (!a || a === 'fp')) fp._done = { t: now, tx: WORK_KIND[fp._wa][1].replace('正在', '') + '完成' }; fp._wa = a; fp._wt = now; }
    let kind = wk ? wk[0] : fp.wood ? 'wood' : fp.fish ? 'rod' : 'hand'; /* 手里拿什么看正在干什么（钓鱼拿鱼竿、浇水拿水壶），不用自己切 */ const el = wk ? (now - (WORK_KIND[a] ? fp._wt : fw.t0)) / 1000 : 0;
    if (wk && p.tool && p.tool.k === 'can') kind = 'water'; else if (wk && p.tool && p.tool.k === 'basket') kind = 'harvest';
    /* 手是矢量画的（圆润的掌心、四根指头、肉垫、明暗和轮廓光），每个姿势都是一个「目标」，手用弹簧慢慢追过去：
       走路是 8 字形的轻晃、转头时手稍微落后、落地往下一沉、跳起来往上提；双手的活（抱柴、捧着吃、挎篮子、撒种）左手才从下面伸上来 */
    const s = Math.min(w, h) / 82, sx = w / 100, sy = h / 100, C = p.pal || {}, base = C.base || '#d9a066', light = C.light || '#f4dcb8', dark = C.dark || '#8a5a3a';
    const dt = U.clamp((now - (fp._hn || now)) / 1000, 0, 0.1); fp._hn = now;
    const sm = (k) => 1 - Math.exp(-dt * k), ease = (x) => { x = U.clamp(x, 0, 1); return x * x * (3 - 2 * x); }, wave = (x) => 0.5 - 0.5 * Math.cos(x * Math.PI * 2);
    const moving = fp.keys.has('f') || fp.keys.has('b') || fp.keys.has('l') || fp.keys.has('r') || !!fp.auto, walking = !fp.air && !fp.swim && moving;
    fp._hwk = (fp._hwk || 0) + ((walking ? (fp.keys.has('run') ? 1.4 : 1) : 0) - (fp._hwk || 0)) * sm(6); // 走 / 停：晃动幅度慢慢起、慢慢收
    // 转头时手稍微落后（惯性）
    const yv = fp._hyaw == null ? 0 : (((fp.yaw - fp._hyaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) / Math.max(dt, 1e-3), pv = fp._hpit == null ? 0 : (fp.pitch - fp._hpit) / Math.max(dt, 1e-3); fp._hyaw = fp.yaw; fp._hpit = fp.pitch;
    fp._hlx = (fp._hlx || 0) + (U.clamp(-yv * 2.2, -9, 9) - (fp._hlx || 0)) * sm(8); fp._hly = (fp._hly || 0) + (U.clamp(pv * 2.2, -7, 7) - (fp._hly || 0)) * sm(8);
    // 跳起 / 落地
    if (fp._hair && !fp.air) fp._hvy = (fp._hvy || 0) + 55; fp._hair = fp.air;
    fp._hvy = fp._hvy || 0; fp._hdy = fp._hdy || 0; { const tgt = fp.air ? -4 : 0, a3 = 160 * (tgt - fp._hdy) - 16 * fp._hvy; fp._hvy += a3 * dt; fp._hdy += fp._hvy * dt; }
    const bobA = fp._hwk, ph = fp.bob || 0, br = Math.sin(t * 1.6) * 0.7; // br：站着时呼吸
    const ofs = { x: Math.sin(ph * 0.5) * 2.2 * bobA + fp._hlx, y: Math.abs(Math.sin(ph * 0.5)) * 2.6 * bobA - 1.3 * bobA + br * (1 - Math.min(1, bobA)) + fp._hly + fp._hdy };
    const tap = fp.useT ? U.clamp((now - fp.useT) / 420, 0, 1) : 1, tapK = tap < 1 ? Math.sin(tap * Math.PI) * (1 - tap * 0.4) : 0; // 刚点了一下：往前探一下再收回
    // 右手、左手的目标姿势（屏幕上的位置按 s = 短边的 1%；r 转角；k 远近缩放；g 握着东西 / 张开）
    const R0 = { x: 78, y: 91, r: -0.25, k: 1.05, g: 0.35 }, Lout = { x: 18, y: 135, r: 0.2, k: 1, g: 0 };
    let RT = { ...R0 }, LT = { ...Lout };
    const sit = fp.pose === 'sit' || fp.pose === 'lie'; if (sit) { RT.y += 6; RT.r -= 0.1; }
    if (fp.crouch) RT.y += 3;
    if (kind === 'hand' && fp.swim) { const k = moving ? (t * 1.3) % 1 : 0.15 + Math.sin(t * 1.2) * 0.1, sw = Math.sin(k * Math.PI * 2), out = wave(k);
      RT = { x: 64 + out * 22, y: 80 - sw * 8, r: -0.6 + out * 0.9, k: 0.95, g: 0 }; LT = { x: 100 - (64 + out * 22), y: 80 - sw * 8, r: 0.6 - out * 0.9, k: 0.95, g: 0 }; }
    else if (kind === 'can') { RT = { x: 74, y: 90, r: -0.12, k: 1, g: 1 }; }
    else if (kind === 'water') { const k = ease(el / 0.6); RT = { x: 74 - 12 * k, y: 90 - 10 * k + Math.sin(t * 2.2) * 1.2 * k, r: -0.12 - 0.72 * k + Math.sin(t * 2.2) * 0.05 * k, k: 1, g: 1 }; }
    else if (kind === 'seed' || kind === 'sow') { LT = { x: 30, y: 92, r: 0.25, k: 1, g: 1 };
      if (kind === 'sow') { const c = (el * 0.95) % 1, dip = ease(c / 0.35), fling = ease((c - 0.45) / 0.3), back = ease((c - 0.8) / 0.2);
        RT = { x: 70 - 26 * dip * (1 - fling) - 4 * fling + 0 * back, y: 92 - 2 * dip - 22 * fling * (1 - back), r: -0.22 + 0.5 * dip - 0.9 * fling * (1 - back), k: 1 - 0.12 * fling * (1 - back), g: dip > 0.5 && fling < 0.5 ? 1 : 0 }; fp._sowF = fling > 0.05 && back < 0.9 ? c : null; } }
    else if (kind === 'harvest') { LT = { x: 28, y: 96, r: 0.15, k: 1, g: 1 }; const c = (el * 0.8) % 1, down = ease(c / 0.4), up = ease((c - 0.45) / 0.35), drop = ease((c - 0.82) / 0.18);
      RT = { x: 66 - 30 * up * (1 - drop) * 0 - 34 * drop + 10 * down * (1 - up), y: 88 + 14 * down * (1 - up) - 12 * up + 6 * drop, r: -0.22 + 0.4 * down * (1 - up) - 0.3 * up, k: 1 - 0.15 * down * (1 - up), g: down > 0.6 || (up > 0 && drop < 0.6) ? 1 : 0 }; fp._hv = up > 0.1 && drop < 0.6; }
    else if (kind === 'use') { const k = ease(el / 0.4), j = Math.sin(t * 7) * (0.5 + 0.5 * Math.sin(t * 2.3)); RT = { x: 64 + j * 1.5, y: 74 + j * 2, r: -0.45 + j * 0.12, k: 0.85, g: 0.6 }; RT.x = R0.x + (RT.x - R0.x) * k; RT.y = R0.y + (RT.y - R0.y) * k; RT.k = 1 + (RT.k - 1) * k; }
    else if (kind === 'eat') { const k = ease(el / 0.5), bite = Math.max(0, Math.sin(el * Math.PI * 2 / 0.8)) ** 3; RT = { x: 78 - 22 * k, y: 92 - 4 * k - 8 * bite * k, r: -0.22 + 0.35 * k, k: 1 + 0.12 * k, g: 1 }; LT = { x: 22 + 20 * k, y: 120 - 30 * k - 8 * bite * k, r: 0.22 - 0.35 * k, k: 1 + 0.12 * k, g: 1 }; }
    else if (kind === 'snack') { RT = { x: 74, y: 90, r: -0.12, k: 1, g: 1 }; }
    else if (kind === 'rod' || kind === 'fish') { const f2 = p.fishing || fp.fish, phs = f2 && f2.ph, bite = phs === 'bite' || phs === 'nibble', reel = phs === 'reel';
      RT = { x: 72, y: 92, r: -0.38 + (reel ? -0.25 : 0) + (bite ? Math.sin(t * 34) * 0.05 : 0), k: 1, g: 1 }; if (kind === 'fish' && el < 0.7) { const c = el / 0.7; RT.r += -0.9 * Math.sin(ease(c / 0.45) * Math.PI / 2) * (1 - ease((c - 0.45) / 0.55)) + 0.25 * ease((c - 0.45) / 0.55) * (1 - c); } // 刚抛竿：往后一扬、往前一甩
      if (reel) { RT.x -= 1.5; LT = { x: 56 + Math.cos(t * 12) * 2.5, y: 98 + Math.sin(t * 12) * 2.5, r: 0.5, k: 1, g: 1 }; } }
    else if (kind === 'wood') { RT = { x: 64, y: 98, r: -0.5, k: 1, g: 1 }; LT = { x: 36, y: 98, r: 0.5, k: 1, g: 1 }; }
    if (fp.glide) { const sw = Math.sin(t * 1.7) * 1.2; RT = { x: 63, y: 50 + sw, r: 0.35, k: 1, g: 1 }; LT = { x: 37, y: 50 - sw, r: -0.35, k: 1, g: 1 }; } // 滑翔：两只手举起来握着横杆
    if (tapK && !wk) { RT.x -= 6 * tapK; RT.y -= 12 * tapK; RT.k -= 0.12 * tapK; RT.r -= 0.25 * tapK; }
    // 弹簧追目标（稍微欠阻尼：停下时有一点点回弹，不硬）
    const spring = (st, tg, kk) => { for (const key of ['x', 'y', 'r', 'k', 'g']) { if (st[key] == null) { st[key] = tg[key]; st['v' + key] = 0; } const n = Math.max(1, Math.ceil(dt / 0.016)), h2 = dt / n; for (let i = 0; i < n; i++) { const a3 = kk * (tg[key] - st[key]) - 2 * Math.sqrt(kk) * 0.78 * st['v' + key]; st['v' + key] += a3 * h2; st[key] += st['v' + key] * h2; } } };
    fp._hR = fp._hR || {}; fp._hL = fp._hL || { ...Lout }; spring(fp._hR, RT, kind === 'sow' || kind === 'harvest' || kind === 'eat' ? 260 : 150); spring(fp._hL, LT, 120);
    // 画在一张离屏画布上：最后整体按光线（夜里、黄昏、水下）染一层色，不会染到别的东西
    const cv = fp._hc = fp._hc || document.createElement('canvas'); if (cv.width !== Math.ceil(w) || cv.height !== Math.ceil(h)) { cv.width = Math.ceil(w); cv.height = Math.ceil(h); }
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.lineJoin = g.lineCap = 'round';
    const hx2 = (c) => { const n = parseInt(String(c).replace('#', '').slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }, mix = (a, b, k) => { const A2 = hx2(a), B2 = hx2(b); return `rgb(${A2.map((x, i) => Math.round(x + (B2[i] - x) * k)).join(',')})`; };
    const fur = mix(base, light, 0.15), furD = mix(base, dark, 0.3), furL = mix(base, '#ffffff', 0.45), line = mix(dark, '#2a1c24', 0.55), pad = mix(light, '#f0a0a0', 0.35);
    const blob = (pts) => { g.beginPath(); const n = pts.length; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (!i) g.moveTo(m[0], m[1]); else g.quadraticCurveTo(a[0], a[1], m[0], m[1]); } const a = pts[0], b = pts[1]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); g.closePath(); };
    const shade = (x1, y1, x2, y2, c0, c1, c2) => { const gr = g.createLinearGradient(x1, y1, x2, y2); gr.addColorStop(0, c0); gr.addColorStop(0.55, c1); gr.addColorStop(1, c2); return gr; };
    const ol = (wid) => { g.strokeStyle = line; g.lineWidth = wid * s; g.stroke(); };
    // 一只手：手腕在 (0,0)，胳膊往下伸出画面；mir = -1 是左手
    /* 0.30 重画：袖子（针织袖口）盖住前臂，只露出一只圆圆的小爪子；两档平涂的明暗 + 一道亮边（像原神的卡通光），
       平时看到的是手背（自己的手从第一人称看就是手背），握东西时四个指头卷过来盖在东西前面 */
    const SLV = '#6fa7b4', SLV_D = '#4f8796', SLV_L = '#9cc9d2', CUFF = '#f3ead6', CUFF_D = '#d8ccb0';
    const showPaw = false; /* 0.33：手改成 3D 模型（buildVM），这里只画手里拿的东西 */
    fp._vmPose = { R: Object.assign({}, fp._hR), L: Object.assign({}, fp._hL), twoL: LT !== Lout || fp._hL.y < 128, w, h, pal: [base, light, dark], kind, el, x0, y0 };
    function arm(st, mir, under) { if (!showPaw) return; g.save(); g.translate(st.x * sx, st.y * sy); g.rotate(st.r); g.scale(st.k * mir, st.k);
      // 袖子：微微张开的筒，暗面在外侧
      g.beginPath(); g.moveTo(-7.4 * s, 5 * s); g.bezierCurveTo(-8.6 * s, 22 * s, -10.5 * s, 40 * s, -12 * s, 64 * s); g.lineTo(12.5 * s, 64 * s); g.bezierCurveTo(10.6 * s, 40 * s, 8.8 * s, 22 * s, 7.6 * s, 5 * s); g.closePath();
      g.fillStyle = SLV; g.fill(); g.save(); g.clip(); g.fillStyle = SLV_D; g.beginPath(); g.moveTo(2.5 * s, 5 * s); g.bezierCurveTo(4 * s, 24 * s, 5 * s, 44 * s, 5.5 * s, 64 * s); g.lineTo(14 * s, 64 * s); g.lineTo(14 * s, 0); g.closePath(); g.fill();
      g.strokeStyle = SLV_L; g.lineWidth = 1.1 * s; g.beginPath(); g.moveTo(-6.2 * s, 12 * s); g.bezierCurveTo(-7 * s, 26 * s, -8.2 * s, 40 * s, -9 * s, 58 * s); g.stroke();
      g.strokeStyle = 'rgba(40,70,80,.25)'; g.lineWidth = 0.5 * s; for (const yy of [22, 38, 52]) { g.beginPath(); g.moveTo(-10 * s, yy * s); g.quadraticCurveTo(0, (yy + 2.5) * s, 11 * s, yy * s); g.stroke(); } g.restore();
      g.strokeStyle = line; g.lineWidth = 0.6 * s; g.beginPath(); g.moveTo(-7.4 * s, 5 * s); g.bezierCurveTo(-8.6 * s, 22 * s, -10.5 * s, 40 * s, -12 * s, 64 * s); g.moveTo(7.6 * s, 5 * s); g.bezierCurveTo(8.8 * s, 22 * s, 10.6 * s, 40 * s, 12.5 * s, 64 * s); g.stroke();
      // 爪子（手背）：一个圆润的「连指手套」形状
      paw(st); 
      // 针织袖口：一圈奶白色的罗纹，盖在手腕上
      g.beginPath(); g.moveTo(-7.9 * s, 1.2 * s); g.quadraticCurveTo(0, 3.4 * s, 8.1 * s, 1.2 * s); g.lineTo(8.5 * s, 7.4 * s); g.quadraticCurveTo(0, 9.8 * s, -8.3 * s, 7.4 * s); g.closePath(); g.fillStyle = CUFF; g.fill();
      g.save(); g.clip(); g.fillStyle = CUFF_D; g.fillRect(3 * s, 0, 8 * s, 12 * s); g.strokeStyle = 'rgba(150,130,100,.45)'; g.lineWidth = 0.45 * s; for (let i = -7; i <= 7; i += 1.4) { g.beginPath(); g.moveTo(i * s, 1 * s); g.lineTo(i * 1.04 * s, 9.5 * s); g.stroke(); } g.restore();
      g.strokeStyle = line; g.lineWidth = 0.6 * s; g.stroke();
      if (!under) fingers(st, false); g.restore(); }
    function paw(st) { const gr = st.g;
      g.beginPath(); g.moveTo(-6.3 * s, 3 * s); g.bezierCurveTo(-7.2 * s, -2 * s, -7 * s, -6.5 * s, -5.6 * s, -8.5 * s - (1 - gr) * 1.2 * s); g.bezierCurveTo(-3 * s, -11.5 * s, 3.2 * s, -11.8 * s, 5.8 * s, -8.6 * s - (1 - gr) * 1 * s); g.bezierCurveTo(7.2 * s, -6.5 * s, 7.4 * s, -2 * s, 6.5 * s, 3 * s); g.closePath();
      g.fillStyle = fur; g.fill(); g.save(); g.clip(); g.fillStyle = furD; g.beginPath(); g.ellipse(8.2 * s, 0.5 * s, 4.2 * s, 10 * s, -0.2, 0, 6.283); g.fill(); g.fillStyle = furL; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(-3.4 * s, -6.6 * s, 2.6 * s, 1.5 * s, -0.5, 0, 6.283); g.fill(); g.globalAlpha = 1; g.restore();
      g.strokeStyle = line; g.lineWidth = 0.6 * s; g.stroke(); }
    function fingers(st, front) { if (!showPaw) return; const gr = st.g; // 四个圆圆的指头：张开时在爪子顶上（指缝两道浅线），握东西时卷到前面一排
      const top = -8.6 * s + gr * 4.2 * s, ry = (2.3 - gr * 0.5) * s;
      for (let i = 0; i < 4; i++) { const fx = (-4.3 + i * 2.9) * s, fy = top - (i === 1 || i === 2 ? 0.7 * s : 0) * (1 - gr) - ry * 0.4 * (1 - gr);
        g.beginPath(); g.ellipse(fx, fy, 1.75 * s, ry, (i - 1.5) * 0.1 * (1 - gr), 0, 6.283); g.fillStyle = i === 3 ? furD : fur; g.fill(); g.strokeStyle = line; g.lineWidth = 0.55 * s; g.stroke();
        if (!gr) { g.fillStyle = furL; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(fx - 0.4 * s, fy - ry * 0.4, 0.7 * s, 0.45 * s, 0, 0, 6.283); g.fill(); g.globalAlpha = 1; } }
      if (gr) { g.save(); g.translate(6.2 * s, -3.6 * s); g.rotate(-0.5); g.beginPath(); g.ellipse(0, -1.8 * s, 1.7 * s, 2.6 * s, 0, 0, 6.283); g.fillStyle = furD; g.fill(); g.strokeStyle = line; g.lineWidth = 0.55 * s; g.stroke(); g.restore(); } }
    /* 叶子滑翔伞：一片大叶子撑在头顶（叶脉、亮边、往下卷的叶缘），两根藤绳垂到横杆上；打开时从上面展开下来 */
    function glider(k) { const W = w * 0.62 * (0.6 + 0.4 * k), cx = w / 2 + Math.sin(t * 1.3) * w * 0.01, cy = -h * 0.12 + h * 0.16 * k, rot = Math.sin(t * 1.1) * 0.025 + (fp._hlx || 0) * 0.004;
      g.save(); g.translate(cx, cy); g.rotate(rot); g.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
      const L2 = fp._hL, Rr = fp._hR, bar = [toScreen(L2, -1, 0, -10 * s), toScreen(Rr, 1, 0, -10 * s)];
      g.strokeStyle = '#7a5a30'; g.lineWidth = 1.4 * s; g.beginPath(); for (const [i, p2] of bar.entries()) { const ex = (i ? 1 : -1) * W * 0.42; g.moveTo(ex, h * 0.1); g.lineTo(p2[0] - cx, p2[1] - cy); } g.stroke();
      g.beginPath(); g.moveTo(-W / 2, h * 0.11); g.bezierCurveTo(-W * 0.4, -h * 0.12, W * 0.4, -h * 0.12, W / 2, h * 0.11); g.bezierCurveTo(W * 0.25, h * 0.04, -W * 0.25, h * 0.04, -W / 2, h * 0.11); g.closePath();
      const gr = g.createLinearGradient(0, -h * 0.1, 0, h * 0.12); gr.addColorStop(0, '#9ad860'); gr.addColorStop(0.6, '#5cae3e'); gr.addColorStop(1, '#3f8a34'); g.fillStyle = gr; g.fill(); g.strokeStyle = '#2f6a2a'; g.lineWidth = 0.8 * s; g.stroke();
      g.strokeStyle = 'rgba(230,255,190,.55)'; g.lineWidth = 0.9 * s; g.beginPath(); g.moveTo(0, -h * 0.05); g.lineTo(0, h * 0.07); for (let i = -3; i <= 3; i++) { if (!i) continue; const xx = i * W * 0.12; g.moveTo(0, -h * 0.03 + Math.abs(i) * h * 0.012); g.quadraticCurveTo(xx * 0.6, -h * 0.05 + Math.abs(i) * h * 0.015, xx, h * 0.0 + Math.abs(i) * h * 0.022); } g.stroke();
      g.restore(); g.globalAlpha = 1;
      g.strokeStyle = '#8a6038'; g.lineWidth = 2.2 * s; g.beginPath(); g.moveTo(bar[0][0] - 6 * s, bar[0][1]); g.lineTo(bar[1][0] + 6 * s, bar[1][1]); g.stroke();
      if (fp.glide) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.2; for (let i = 0; i < 7; i++) { const ph = (t * 1.6 + i / 7) % 1, side = i % 2 ? 1 : -1, xx = w / 2 + side * w * (0.32 + (i % 3) * 0.05), yy = h * (0.2 + (i * 0.11) % 0.6) + ph * h * 0.25; g.globalAlpha = Math.sin(ph * Math.PI) * 0.7; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + side * w * 0.02, yy + h * 0.1); g.stroke(); } g.globalAlpha = 1; } } // 风从身边往后刮
    const inHand = (st, mir, fn) => { g.save(); g.translate(st.x * sx, st.y * sy); g.rotate(st.r); g.scale(st.k * mir, st.k); fn(); fingers(st, true); g.restore(); };
    const toScreen = (st, mir, lx, ly) => { const c = Math.cos(st.r), sn = Math.sin(st.r), X = lx * st.k * mir, Y = ly * st.k; return [st.x * sx + X * c - Y * sn, st.y * sy + X * sn + Y * c]; };
    // —— 手里的东西 ——
    const can = () => { g.save(); g.translate(-13 * s, -10 * s); // 铜绿色的旧水壶：壶身、壶嘴、莲蓬头、提手
      g.beginPath(); g.moveTo(-7 * s, -6 * s); g.lineTo(-17 * s, -15 * s); g.lineTo(-18.5 * s, -13.4 * s); g.lineTo(-7 * s, -1 * s); g.closePath(); g.fillStyle = shade(0, -15 * s, 0, 0, '#9cc9b9', '#5f9c8c', '#3f6f68'); g.fill(); ol(0.6);
      g.save(); g.translate(-18.4 * s, -15 * s); g.rotate(-0.75); g.beginPath(); g.ellipse(0, 0, 1.6 * s, 3 * s, 0, 0, 6.283); g.fillStyle = '#c8a050'; g.fill(); ol(0.5); g.restore();
      g.beginPath(); g.moveTo(-8 * s, -8 * s); g.lineTo(8 * s, -8 * s); g.quadraticCurveTo(9.5 * s, 2 * s, 7.5 * s, 7 * s); g.lineTo(-7.5 * s, 7 * s); g.quadraticCurveTo(-9.5 * s, 2 * s, -8 * s, -8 * s); g.closePath(); g.fillStyle = shade(-9 * s, 0, 9 * s, 0, '#3f6f68', '#6aa898', '#a8d8c4'); g.fill(); ol(0.7);
      g.beginPath(); g.ellipse(0, -8 * s, 8 * s, 2 * s, 0, 0, 6.283); g.fillStyle = '#2f5650'; g.fill(); ol(0.5); g.fillStyle = 'rgba(200,160,80,.9)'; g.fillRect(-8.6 * s, 1.5 * s, 17.2 * s, 1.6 * s);
      g.globalAlpha = 0.45; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(4.4 * s, -1.5 * s, 1 * s, 4.5 * s, 0.05, 0, 6.283); g.fill(); g.globalAlpha = 1;
      g.beginPath(); g.moveTo(-4 * s, -8.5 * s); g.bezierCurveTo(-2 * s, -17 * s, 12 * s, -16 * s, 13 * s, 0); g.strokeStyle = line; g.lineWidth = 3 * s; g.stroke(); g.strokeStyle = '#5f9c8c'; g.lineWidth = 1.8 * s; g.stroke(); g.restore(); };
    const pouch = () => { g.save(); g.translate(0, -12 * s); // 麻布种子袋，口上扎着绳，袋口露出几颗种子
      blob([[-8 * s, 8 * s], [-9 * s, -2 * s], [-4 * s, -7 * s], [4 * s, -7 * s], [9 * s, -2 * s], [8 * s, 8 * s], [0, 10 * s]]); g.fillStyle = shade(-9 * s, 0, 9 * s, 0, '#9a7448', '#c9a46c', '#e2c590'); g.fill(); ol(0.7);
      g.strokeStyle = 'rgba(120,90,50,.35)'; g.lineWidth = 0.4 * s; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 2.2 * s, -5 * s); g.lineTo(i * 2.4 * s, 8 * s); g.stroke(); }
      g.beginPath(); g.ellipse(0, -7 * s, 4.5 * s, 1.6 * s, 0, 0, 6.283); g.fillStyle = '#5a4026'; g.fill(); for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#e8d090' : '#a8743a'; g.beginPath(); g.ellipse((-2.6 + i * 1.3) * s, -7.4 * s + (i % 2) * 0.5 * s, 0.7 * s, 0.5 * s, i, 0, 6.283); g.fill(); }
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 0.9 * s; g.beginPath(); g.moveTo(-5 * s, -5 * s); g.quadraticCurveTo(0, -3.5 * s, 5 * s, -5 * s); g.stroke(); g.restore(); };
    const basket = () => { g.save(); g.translate(2 * s, -14 * s); // 藤编小篮子，收的菜一样样堆进去
      const n = Math.min(4, Math.floor(el / 0.75 + 0.6)), veg = [['#f08a3a', '#4c9a48'], ['#e04a3a', '#3f8a40'], ['#f0c040', '#5aa050'], ['#a04aa0', '#4c9a48']];
      for (let i = 0; i < n; i++) { const vx = (-5 + i * 3.4) * s, vy = -5.5 * s - (i % 2) * 1.2 * s; g.fillStyle = veg[i][0]; g.beginPath(); g.ellipse(vx, vy, 2.6 * s, 2.3 * s, 0, 0, 6.283); g.fill(); ol(0.45); g.fillStyle = veg[i][1]; g.beginPath(); g.ellipse(vx, vy - 2.6 * s, 0.9 * s, 1.5 * s, 0.3, 0, 6.283); g.fill(); }
      g.beginPath(); g.moveTo(-10 * s, -5 * s); g.lineTo(10 * s, -5 * s); g.lineTo(7.5 * s, 7 * s); g.lineTo(-7.5 * s, 7 * s); g.closePath(); g.fillStyle = shade(0, -5 * s, 0, 7 * s, '#d8a868', '#b8844a', '#8a5a30'); g.fill(); ol(0.7);
      g.strokeStyle = 'rgba(90,56,26,.6)'; g.lineWidth = 0.5 * s; for (let i = 0; i < 3; i++) { const yy = (-2 + i * 3) * s; g.beginPath(); g.moveTo(-9.4 * s + i * 0.6 * s, yy); g.lineTo(9.4 * s - i * 0.6 * s, yy); g.stroke(); } for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 2.2 * s, -5 * s); g.lineTo(i * 1.7 * s, 7 * s); g.stroke(); }
      g.beginPath(); g.ellipse(0, -5 * s, 10 * s, 1.6 * s, 0, 0, 6.283); g.strokeStyle = line; g.lineWidth = 1.6 * s; g.stroke(); g.strokeStyle = '#d8a868'; g.lineWidth = 0.9 * s; g.stroke(); g.restore(); };
    const rod = () => { // 鱼竿：软木握把、绕线轮、细长的竿身（越往上越细），竿尖的位置记下来给鱼线用
      g.fillStyle = shade(-1.8 * s, 0, 1.8 * s, 0, '#a07448', '#d8b088', '#e8c8a0'); g.beginPath(); g.ellipse(0, -6 * s, 1.9 * s, 7 * s, 0, 0, 6.283); g.fill(); ol(0.5);
      g.beginPath(); g.moveTo(-1.1 * s, -12 * s); g.lineTo(-0.25 * s, -78 * s); g.lineTo(0.25 * s, -78 * s); g.lineTo(1.1 * s, -12 * s); g.closePath(); g.fillStyle = shade(-1 * s, 0, 1 * s, 0, '#5a3a22', '#8a5a34', '#b88a5a'); g.fill(); ol(0.4);
      for (let i = 0; i < 4; i++) { const yy = (-24 - i * 14) * s; g.strokeStyle = '#c8c8c8'; g.lineWidth = 0.4 * s; g.beginPath(); g.arc(-1.2 * s, yy, 0.9 * s, 0, 6.283); g.stroke(); }
      g.save(); g.translate(-3.2 * s, -1 * s); g.beginPath(); g.arc(0, 0, 3 * s, 0, 6.283); g.fillStyle = shade(-3 * s, 0, 3 * s, 0, '#5a6a70', '#9aaab0', '#cfd8dc'); g.fill(); ol(0.5); g.rotate(t * (p.fishing && p.fishing.ph === 'reel' ? 14 : 0)); g.strokeStyle = '#3a3a40'; g.lineWidth = 0.8 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(-3.5 * s, 0); g.stroke(); g.restore(); };
    const logs = () => { g.save(); g.translate(0, -5 * s); for (let i = 0; i < 3; i++) { const yy = (-i * 4.6 + (i === 2 ? 0 : 0)) * s, xx = (i === 2 ? 0 : (i ? 3 : -3)) * s; // 两只手抱着的三根柴
        g.beginPath(); g.rect(xx - 13 * s, yy - 2.4 * s, 24 * s, 4.8 * s); g.fillStyle = shade(0, yy - 2.4 * s, 0, yy + 2.4 * s, '#a87a4a', '#7a5030', '#4f321e'); g.fill(); ol(0.5);
        g.strokeStyle = 'rgba(40,24,12,.4)'; g.lineWidth = 0.4 * s; g.beginPath(); g.moveTo(xx - 10 * s, yy - 0.6 * s); g.lineTo(xx + 6 * s, yy - 0.9 * s); g.stroke();
        g.beginPath(); g.ellipse(xx + 11 * s, yy, 1.5 * s, 2.4 * s, 0, 0, 6.283); g.fillStyle = '#e2bc88'; g.fill(); ol(0.45); g.strokeStyle = 'rgba(140,90,50,.7)'; g.lineWidth = 0.35 * s; g.beginPath(); g.ellipse(xx + 11 * s, yy, 0.8 * s, 1.3 * s, 0, 0, 6.283); g.stroke(); } g.restore(); };
    const bun = (bites) => { g.save(); g.translate(-2 * s, -14 * s); // 小圆面包：咬一口少一块
      g.beginPath(); g.rect(-20 * s, -20 * s, 40 * s, 40 * s); for (let i = 0; i < bites; i++) { const a = -1.2 + i * 0.75; g.moveTo(Math.cos(a) * 8 * s + 3 * s, Math.sin(a) * 6 * s); g.arc(Math.cos(a) * 8 * s, Math.sin(a) * 6 * s, 3 * s, 0, 6.283, true); } g.clip('evenodd');
      g.beginPath(); g.ellipse(0, 0, 8 * s, 6 * s, 0, 0, 6.283); g.fillStyle = shade(0, -6 * s, 0, 6 * s, '#f0c070', '#d8984a', '#a8682a'); g.fill(); ol(0.6);
      g.globalAlpha = 0.5; g.fillStyle = '#fff4d0'; g.beginPath(); g.ellipse(-2.4 * s, -3 * s, 3 * s, 1.3 * s, -0.3, 0, 6.283); g.fill(); g.globalAlpha = 1; g.fillStyle = '#f8ecd0'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse((-4 + i * 2) * s, (-1.5 + (i % 2) * 2) * s, 0.5 * s, 0.3 * s, i, 0, 6.283); g.fill(); } g.restore(); };
    const veg1 = () => { g.fillStyle = '#f08a3a'; g.beginPath(); g.ellipse(0, -13 * s, 2.6 * s, 2.3 * s, 0, 0, 6.283); g.fill(); ol(0.45); g.fillStyle = '#4c9a48'; g.beginPath(); g.ellipse(0.4 * s, -15.8 * s, 1 * s, 1.6 * s, 0.3, 0, 6.283); g.fill(); };
    const twoL = LT !== Lout || fp._hL.y < 128;
    if (fp.glide || (fp.glideT && now - fp.glideT < 350)) { const k = fp.glide ? Math.min(1, (now - fp.glideT) / 300) : 1 - (now - fp.glideT) / 350; glider(k); } // 左手在画面里
    // 画的先后：先左手（远一点），再右手；握着的东西夹在掌心和卷起的指头之间
    g.shadowColor = 'rgba(20,10,30,.28)'; g.shadowBlur = 3 * s; g.shadowOffsetY = 1.2 * s;
    const L = fp._hL, Rh = fp._hR, Lheld = kind === 'seed' || kind === 'sow' ? pouch : kind === 'harvest' ? basket : null;
    if (!PP.HANDS || S().fpHands === false) { /* 关掉手的时候还用平面的手持物；开着时手和手里的东西都是 3D（buildVM） */
    if (twoL) { arm(L, -1, true); g.shadowColor = 'transparent'; inHand(L, -1, Lheld || (() => {})); g.shadowColor = 'rgba(20,10,30,.28)'; }
    if (kind === 'wood') { arm(Rh, 1, true); g.shadowColor = 'transparent'; const mx = (L.x + Rh.x) / 2 * sx, my = Math.min(L.y, Rh.y) * sy; g.save(); g.translate(mx, my); logs(); g.restore(); inHand(L, -1, () => {}); inHand(Rh, 1, () => {}); }
    else if (kind === 'eat') { arm(Rh, 1, true); g.shadowColor = 'transparent'; const mx = (L.x + Rh.x) / 2 * sx, my = Math.min(L.y, Rh.y) * sy + 2 * s; g.save(); g.translate(mx, my); bun(Math.min(4, Math.floor(el / 0.8))); g.restore(); inHand(L, -1, () => {}); inHand(Rh, 1, () => {}); }
    else { const held = kind === 'can' || kind === 'water' ? can : kind === 'rod' || kind === 'fish' ? rod : kind === 'snack' ? () => bun(0) : kind === 'harvest' && fp._hv ? veg1 : null;
      arm(Rh, 1, !!held || Rh.g > 0.3); g.shadowColor = 'transparent'; if (held || Rh.g > 0.3) inHand(Rh, 1, held || (() => {})); }
    }
    g.shadowColor = 'transparent';
    // 浇水：从莲蓬头洒下来的一串水（屏幕上往下落）
    if (kind === 'water' && el > 0.45) { const [tx, ty] = toScreen(Rh, 1, -31.4 * s, -25 * s); for (let i = 0; i < 26; i++) { const k = ((t * 1.7 + i / 26) % 1), spread = (i % 5 - 2) * 1.4 * s; const px = tx - k * 4 * s + spread * k * 2, py = ty + k * k * 40 * s + k * 6 * s; g.globalAlpha = 0.75 * (1 - k); g.fillStyle = '#bfe6ff'; g.beginPath(); g.ellipse(px, py, 0.6 * s, 1.4 * s, 0, 0, 6.283); g.fill(); } g.globalAlpha = 1; }
    // 撒种：甩手那一下，种子划着弧线往前下方飞出去
    if (kind === 'sow' && fp._sowF != null) { const c = fp._sowF, [tx, ty] = toScreen(Rh, 1, 0, -12 * s); for (let i = 0; i < 9; i++) { const k = U.clamp((c - 0.5) / 0.4 + i * 0.03, 0, 1); if (k <= 0) continue; const px = tx - k * (18 + i * 3) * s, py = ty - Math.sin(k * Math.PI) * (6 + i % 3) * s + k * k * 26 * s; g.globalAlpha = 1 - k * 0.7; g.fillStyle = i % 2 ? '#e8d090' : '#a8743a'; g.beginPath(); g.ellipse(px, py, 0.7 * s, 0.5 * s, i, 0, 6.283); g.fill(); } g.globalAlpha = 1; }
    if (!PP.HANDS || S().fpHands === false) fp._tip = kind === 'rod' || kind === 'fish' ? toScreen(Rh, 1, 0, -78 * s).map((v, i) => v + (i ? y0 : x0)) : null;
    // 按光线染色：夜里偏蓝暗、黄昏偏暖、水下偏青
    const ph2 = phase(), tint = fp.under ? 'rgba(30,110,140,.38)' : ph2 === 'night' ? 'rgba(28,36,80,.42)' : ph2 === 'dusk' ? 'rgba(255,140,90,.16)' : null;
    if (tint) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = 'source-over'; }
    ctx.drawImage(cv, x0, y0);
    // 正在干什么 + 进度条（准星上方）；做完闪一下
    const cx = x0 + w / 2, cy = y0 + h / 2, fs = U.clamp(Math.min(w, h) / 34, 11, 18);
    ctx.font = PP.FONT(fs); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    if (wk) { const k = Math.min(1, el / wk[2]), tx = wk[1] + '…', tw = Math.max(ctx.measureText(tx).width + 20, 120), by = cy - fs * 2.6;
      ctx.fillStyle = 'rgba(30,24,40,.7)'; ctx.fillRect(cx - tw / 2, by - fs - 6, tw, fs + 16); ctx.fillStyle = '#fff6d8'; ctx.fillText(tx, cx, by + 1);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(cx - tw / 2 + 6, by + 4, tw - 12, 4); ctx.fillStyle = '#ffd84a'; ctx.fillRect(cx - tw / 2 + 6, by + 4, (tw - 12) * k, 4); }
    /* 主角自己说的话（看书、闻花、看望远镜时的那句）：第一人称看不到它头顶的气泡，就当字幕显示在下面 */
    const bb = p.bubble, said = bb && (bb.text || bb.label);
    if (said) { const a3 = U.clamp(Math.min(bb.t / 0.15, (bb.dur - bb.t) / 0.4), 0, 1), tx = `${p.name}：${said}`, tw = ctx.measureText(tx).width + 24, sy = y0 + h - fs * 5.2;
      ctx.globalAlpha = a3; ctx.fillStyle = 'rgba(30,24,40,.78)'; ctx.fillRect(cx - tw / 2, sy - fs - 8, tw, fs + 14); ctx.fillStyle = '#fff6d8'; ctx.fillText(tx, cx, sy + 2); ctx.globalAlpha = 1; }
    /* 第一人称：「+体力」「心情变好」这类小字从准星下面往上飘 */
    if (fp.pops && fp.pops.length) { fp.pops = fp.pops.filter((q) => now - q.t < 1600); fp.pops.forEach((q, i) => { const k = (now - q.t) / 1600, tw = ctx.measureText(q.tx).width + 16, py = cy + fs * 3 - k * fs * 3 - i * (fs + 8);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = 'rgba(70,150,80,.9)'; ctx.fillRect(cx - tw / 2, py - fs - 4, tw, fs + 10); ctx.fillStyle = '#fff'; ctx.fillText(q.tx, cx, py + 3); ctx.globalAlpha = 1; }); }
    if (wk) {} else if (fp._done && now - fp._done.t < 1300) { const a2 = 1 - (now - fp._done.t) / 1300, tx = '✓ ' + fp._done.tx, tw = ctx.measureText(tx).width + 20, by = cy - fs * 2.6 - (1 - a2) * 10;
      ctx.globalAlpha = a2; ctx.fillStyle = 'rgba(40,120,60,.85)'; ctx.fillRect(cx - tw / 2, by - fs - 6, tw, fs + 12); ctx.fillStyle = '#fff'; ctx.fillText(tx, cx, by + 1); ctx.globalAlpha = 1; }
  }
  /* 浮岛是飘在天上的：第一人称往下看是下面那片风景的大地（跟着你最近去的地方），身边有云，远处一圈山；地面慢慢往后退，像在飞 */
  const BIOME = {
    forest: ['#4f7a3c', '#6a9a48', '#3e6a34', '#8aa85a', '#c8b060'], meadow: ['#7ab04e', '#98c65a', '#c8c060', '#5f9a44', '#e0d080'], farm: ['#c8b060', '#9ac058', '#e0c870', '#7aa048', '#b08a50'],
    lake: ['#4f8a50', '#3f7aa8', '#6aa060', '#3f7aa8', '#8ab060'], desert: ['#e0c088', '#d4b070', '#e8cc98', '#c8a060', '#e0c088'], savanna: ['#c8b060', '#b8a050', '#a8a858', '#d0bc70', '#8a9a50'],
    jungle: ['#2f5a34', '#3f7040', '#24482a', '#4f8048', '#2f5a34'], beach: ['#3f8ab8', '#4f9ac0', '#e8d8a0', '#3f8ab8', '#6aaa60'], sea: ['#2f6a9a', '#3f7aa8', '#2f6a9a', '#4f8ab0', '#e0d0a0'],
    snow: ['#eef2f6', '#dfe6ee', '#cfd8e2', '#eef2f6', '#8aa0b0'], antarctic: ['#f2f6fa', '#e0e8f0', '#d0dce8', '#f2f6fa', '#4f7aa0'], mountain: ['#8a9a7a', '#6a8a5a', '#a8b0b8', '#eef2f6', '#5f7a4a'],
  };
  const BIOME_DEF = BIOME.meadow;
  function underScene() { const sc = S().scene; return PP.SCENES && PP.SCENES[sc] ? sc : 'meadow'; }
  function drawBelow(ctx, x0, y0, w, h, now, lo) {
    const cam = fpCam(), cyw = Math.cos(cam.yaw), syw = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), f = 1 / Math.tan(cam.fov / 2);
    const P = (u, v, z) => { const mx = (u - cam.eye[0]) * 2.83, my = (v - cam.eye[1]) * 2.83, mz = (z - cam.eye[2]) * 1.155, rx = -mx * syw + my * cyw, fw = mx * cyw + my * syw, u2 = mz * cp - fw * sp, f2 = mz * sp + fw * cp; return f2 < 1 ? null : [x0 + w / 2 + (rx * f / (w / h)) / f2 * (w / 2), y0 + h / 2 - (u2 * f) / f2 * (h / 2), f2]; };
    const sc = underScene(), pal = BIOME[sc] || BIOME[(PP.SCENES[sc] && PP.SCENES[sc].biome) || ''] || BIOME_DEF, nightK = phase() === 'night' ? 1 : phase() === 'dusk' ? 0.35 : 0; // 按真的白天黑夜（阴天不算夜里）
    const horizon = y0 + h / 2 + Math.tan(cam.pitch) * f * (h / 2), K = h / 400;
    const fogA = (lo && lo.skyBot) ? lo.skyBot.map((v) => Math.round(v * 255)) : [207, 226, 240], fog = `rgb(${fogA.join(',')})`;
    const hx = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const mixF = (c, t) => { const a = hx(c); t = Math.max(0, Math.min(1, t)); return `rgb(${a.map((x, i) => Math.round(x + (fogA[i] - x) * t)).join(',')})`; };
    const dark = (c, k) => { const a = hx(c); return '#' + a.map((x) => Math.max(0, Math.min(255, Math.round(x * k))).toString(16).padStart(2, '0')).join(''); };
    const hs = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
    // 0) 太阳 / 月亮和星星：方向固定在天上，跟着视线转
    const far = (az, el) => P(cam.eye[0] + Math.cos(az) * Math.cos(el) * 4000, cam.eye[1] + Math.sin(az) * Math.cos(el) * 4000, cam.eye[2] + Math.sin(el) * 4000 / 1.155 * 2.83);
    if (nightK < 0.5) { const s0 = far(0.9, 0.42); if (s0) { const R = h * 0.32, g = ctx.createRadialGradient(s0[0], s0[1], 0, s0[0], s0[1], R); g.addColorStop(0, 'rgba(255,250,225,0.95)'); g.addColorStop(0.08, 'rgba(255,240,190,0.75)'); g.addColorStop(0.35, 'rgba(255,230,180,0.18)'); g.addColorStop(1, 'rgba(255,230,180,0)'); ctx.fillStyle = g; ctx.fillRect(s0[0] - R, s0[1] - R, R * 2, R * 2); } }
    else { for (let i = 0; i < 90; i++) { const st = far(hs(i, 1) * 6.283, 0.08 + hs(i, 2) * 1.2); if (!st || st[1] > horizon) continue; ctx.globalAlpha = (0.35 + hs(i, 3) * 0.65) * nightK * (0.75 + 0.25 * Math.sin(now / 900 + i)); ctx.fillStyle = '#fff8e8'; const r = (hs(i, 4) < 0.15 ? 1.6 : 0.9) * K; ctx.fillRect(st[0] - r, st[1] - r, r * 2, r * 2); }
      const mo = far(2.4, 0.5); if (mo) { ctx.globalAlpha = 0.9 * nightK; const R = 10 * K, g = ctx.createRadialGradient(mo[0], mo[1], R * 0.6, mo[0], mo[1], R * 4); g.addColorStop(0, 'rgba(240,240,255,0.35)'); g.addColorStop(1, 'rgba(240,240,255,0)'); ctx.fillStyle = g; ctx.fillRect(mo[0] - R * 4, mo[1] - R * 4, R * 8, R * 8); ctx.fillStyle = '#f4f2e8'; ctx.beginPath(); ctx.arc(mo[0], mo[1], R, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(200,200,215,0.5)'; ctx.beginPath(); ctx.arc(mo[0] - R * 0.3, mo[1] - R * 0.2, R * 0.25, 0, 6.283); ctx.arc(mo[0] + R * 0.35, mo[1] + R * 0.3, R * 0.18, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1; }
    // 0.5) 远处一圈大积云（二次元那种）：底部偏蓝紫的阴影、中间雪白、顶上被太阳照亮的一道亮边；离得很远，跟着视线转
    { const CL = 14; for (let i = 0; i < CL; i++) { const az = hs(i, 91) * 6.283 + now / 1000 * 0.004, el = 0.05 + hs(i, 92) * 0.16, c0 = far(az, el); if (!c0 || c0[1] < y0 - h * 0.3 || c0[1] > y0 + h * 1.2) continue;
        const R = h * (0.09 + hs(i, 93) * 0.1), night = nightK > 0.5, base = night ? [70, 80, 120] : [170, 192, 234], body = night ? [120, 130, 170] : [255, 255, 255], hl = night ? [150, 160, 200] : [255, 253, 244];
        const n2 = 7 + Math.floor(hs(i, 94) * 5); ctx.globalAlpha = night ? 0.55 : 0.92;
        for (let k = 0; k < n2; k++) { const ox = (k / (n2 - 1) - 0.5) * R * 3.2, up = Math.sin((k / (n2 - 1)) * Math.PI) * R * (0.8 + hs(k, i) * 0.6), rr = R * (0.45 + Math.sin((k / (n2 - 1)) * Math.PI) * 0.45 + hs(i, k) * 0.15), cx = c0[0] + ox, cy = c0[1] - up * 0.6;
          ctx.fillStyle = `rgb(${base.join(',')})`; ctx.beginPath(); ctx.arc(cx, cy + rr * 0.18, rr, 0, 6.283); ctx.fill(); }
        for (let k = 0; k < n2; k++) { const ox = (k / (n2 - 1) - 0.5) * R * 3.2, up = Math.sin((k / (n2 - 1)) * Math.PI) * R * (0.8 + hs(k, i) * 0.6), rr = R * (0.45 + Math.sin((k / (n2 - 1)) * Math.PI) * 0.45 + hs(i, k) * 0.15), cx = c0[0] + ox, cy = c0[1] - up * 0.6;
          ctx.fillStyle = `rgb(${body.join(',')})`; ctx.beginPath(); ctx.arc(cx, cy, rr * 0.92, 0, 6.283); ctx.fill(); ctx.fillStyle = `rgb(${hl.join(',')})`; ctx.beginPath(); ctx.arc(cx - rr * 0.12, cy - rr * 0.22, rr * 0.62, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = `rgb(${base.join(',')})`; ctx.beginPath(); ctx.ellipse(c0[0], c0[1] + R * 0.12, R * 1.75, R * 0.2, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; } } // 云底：压扁的椭圆（原来是一块方条，看着像天上贴了一条长方形）
    // 1) 地面底色：地平线那儿雾蒙蒙的，越往下越清楚
    if (horizon < y0 + h) { const g = ctx.createLinearGradient(0, Math.max(y0, horizon), 0, y0 + h); g.addColorStop(0, fog); g.addColorStop(0.18, mixF(pal[0], 0.5)); g.addColorStop(1, pal[1]); ctx.fillStyle = g; ctx.fillRect(x0, Math.max(y0, horizon), w, y0 + h - Math.max(y0, horizon)); }
    // 2) 远山：三层，越远越淡越蓝；高的山尖上有雪
    const snowy = sc === 'snow' || sc === 'antarctic', sandy = sc === 'desert' || sc === 'savanna', mcol = snowy ? '#c8d4e0' : sandy ? '#b89868' : sc === 'jungle' ? '#3f6a4a' : '#5f7a6a';
    for (let L2 = 0; L2 < 3; L2++) { const amp = (10 + L2 * 7) * K, base = horizon + 1 + L2 * 2 * K, top = [], seed = L2 * 3.7;
      for (let px = 0; px <= w + 6; px += 5) { const a = cam.yaw + Math.atan((px / w * 2 - 1) * (w / h) / f), r1 = 1 - Math.abs(Math.sin(a * (2.3 + L2) + seed)), r2 = 1 - Math.abs(Math.sin(a * (5.9 + L2 * 1.7) + seed * 2.1)), n = r1 * r1 * 0.65 + r2 * r2 * 0.35 + Math.sin(a * 17 + seed) * 0.04; top.push([x0 + px, base - amp * (0.25 + n), n]); }
      ctx.fillStyle = mixF(mcol, 0.72 - L2 * 0.2); ctx.beginPath(); ctx.moveTo(x0, base + 2); for (const [x, y] of top) ctx.lineTo(x, y); ctx.lineTo(x0 + w + 6, base + 2); ctx.closePath(); ctx.fill();
      if (L2 < 2 && !sandy) { ctx.fillStyle = mixF('#f4f8fc', 0.35 - L2 * 0.1); for (let i = 0; i + 1 < top.length; i++) { const [xa, ya, na] = top[i], [xb, yb, nb] = top[i + 1]; if (na < 0.72 && nb < 0.72) continue; const ca = Math.max(0, na - 0.72) * amp * 1.6, cb = Math.max(0, nb - 0.72) * amp * 1.6; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.lineTo(xb, yb + cb); ctx.lineTo(xa, ya + ca); ctx.closePath(); ctx.fill(); } } }
    // 3) 地面：田（一垄一垄）、林子（一团团树冠）、草地、湖、村子（小房子），远的被雾吃掉；浮岛在飞，地面慢慢往后退
    const GZ = Z[0] - 400, T = 90, drift = (now / 1000) * 1.2, tiles = [];
    const cu = Math.floor(cam.eye[0] / T), cv = Math.floor((cam.eye[1] + drift) / T), water = sc === 'desert' ? '#6aa8b8' : '#4a8ab8';
    for (let a = -9; a <= 9; a++) for (let b = -9; b <= 9; b++) { const iu = cu + a, iv = cv + b, hsh = hs(iu, iv);
      const u0 = iu * T, v0 = iv * T - drift, ins = T * 0.04;
      const C4 = [[u0 + ins, v0 + ins], [u0 + T - ins, v0 + ins], [u0 + T - ins, v0 + T - ins], [u0 + ins, v0 + T - ins]], q = C4.map(([u, v]) => P(u, v, GZ)); if (q.some((x) => !x)) continue;
      const kind = snowy ? (hsh < 0.15 ? 'forest' : hsh < 0.22 ? 'lake' : 'meadow') : sandy ? (hsh < 0.08 ? 'lake' : hsh < 0.2 ? 'village' : 'meadow') : hsh < 0.3 ? 'field' : hsh < 0.55 ? 'forest' : hsh < 0.62 ? 'lake' : hsh < 0.7 ? 'village' : 'meadow';
      tiles.push({ q, C4, kind, col: pal[2 + Math.floor(hs(iv, iu) * 3)] || pal[0], d: (q[0][2] + q[2][2]) / 2, iu, iv }); }
    tiles.sort((A, B) => B.d - A.d);
    const at = (C4, s, t) => { const u = C4[0][0] + (C4[1][0] - C4[0][0]) * s, v = C4[0][1] + (C4[3][1] - C4[0][1]) * t; return P(u, v, GZ); };
    const poly = (pts) => { ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); };
    for (const t of tiles) { const fz = Math.min(0.92, t.d / 2600), near = t.d < 1500, sz = (T / t.d) * f * (h / 2) * 2.83; // sz：这块地在画面上大概多宽
      ctx.fillStyle = mixF(t.kind === 'lake' ? pal[0] : t.col, fz); poly(t.q);
      if (sz < 6) continue;
      if (t.kind === 'field') { ctx.strokeStyle = mixF(dark(t.col, 0.78), fz); ctx.lineWidth = Math.max(0.6, sz / 90); const n = 7; ctx.beginPath(); for (let i = 1; i < n; i++) { const a2 = at(t.C4, i / n, 0.04), b2 = at(t.C4, i / n, 0.96); if (a2 && b2) { ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); } } ctx.stroke(); }
      else if (t.kind === 'forest') { const n = near ? 16 : 7; for (let i = 0; i < n; i++) { const p0 = at(t.C4, 0.1 + hs(t.iu * 7 + i, t.iv) * 0.8, 0.1 + hs(t.iv * 5 + i, t.iu) * 0.8); if (!p0) continue; const r = sz * (0.07 + hs(i, t.iu) * 0.05); ctx.fillStyle = mixF(dark(pal[0], 0.72), fz); ctx.beginPath(); ctx.ellipse(p0[0], p0[1], r, r * 0.7, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = mixF(dark(pal[0], 1.05), fz); ctx.beginPath(); ctx.ellipse(p0[0] - r * 0.25, p0[1] - r * 0.2, r * 0.55, r * 0.38, 0, 0, 6.283); ctx.fill(); } }
      else if (t.kind === 'lake') { const L3 = []; for (let k = 0; k < 14; k++) { const a2 = (k / 14) * 6.283, rr = 0.3 + 0.06 * Math.sin(a2 * 3 + t.iu); const p0 = at(t.C4, 0.5 + Math.cos(a2) * rr, 0.5 + Math.sin(a2) * rr); if (p0) L3.push(p0); } if (L3.length > 3) { ctx.fillStyle = mixF(water, fz); poly(L3); ctx.strokeStyle = `rgba(255,255,255,${0.25 * (1 - fz)})`; ctx.lineWidth = Math.max(0.6, sz / 120); const a2 = at(t.C4, 0.35, 0.45), b2 = at(t.C4, 0.6, 0.45); if (a2 && b2) { ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke(); } } }
      else if (t.kind === 'village' && near) { for (let i = 0; i < 6; i++) { const p0 = at(t.C4, 0.25 + hs(i, t.iv) * 0.5, 0.25 + hs(t.iu, i) * 0.5); if (!p0) continue; const r = sz * 0.035; ctx.fillStyle = mixF('#e8dcc8', fz); ctx.fillRect(p0[0] - r, p0[1] - r * 0.6, r * 2, r * 1.2); ctx.fillStyle = mixF(['#b85a48', '#8a5a3a', '#5a6a8a'][i % 3], fz); ctx.beginPath(); ctx.moveTo(p0[0] - r * 1.2, p0[1] - r * 0.6); ctx.lineTo(p0[0], p0[1] - r * 1.5); ctx.lineTo(p0[0] + r * 1.2, p0[1] - r * 0.6); ctx.closePath(); ctx.fill(); } }
      else if (t.kind === 'meadow' && near && !snowy) { ctx.fillStyle = mixF(dark(t.col, 1.12), fz); for (let i = 0; i < 4; i++) { const p0 = at(t.C4, hs(i, t.iu + 3), hs(t.iv + 3, i)); if (p0) { const r = sz * 0.05; ctx.beginPath(); ctx.ellipse(p0[0], p0[1], r * 1.6, r, 0, 0, 6.283); ctx.fill(); } } } }
    // 一条弯弯的河从远处流过来
    if (!sandy || sc === 'savanna') { ctx.strokeStyle = mixF(water, 0.25); ctx.lineCap = 'round'; let prev = null; for (let k = -24; k <= 24; k++) { const v = Math.round((cam.eye[1] + drift) / 40) * 40 + k * 40 - drift, u = CEN[0] + 260 + Math.sin((v + drift) / 330) * 160 + Math.sin((v + drift) / 97) * 30, p0 = P(u, v, GZ + 0.5); if (p0 && prev) { ctx.globalAlpha = Math.max(0.1, 1 - p0[2] / 2600); ctx.lineWidth = Math.max(1, (16 / p0[2]) * f * (h / 2) * 2.83); ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p0[0], p0[1]); ctx.stroke(); } prev = p0; } ctx.globalAlpha = 1; ctx.lineCap = 'butt'; }
    // 地平线上一层薄雾
    if (horizon > y0 - 40 && horizon < y0 + h + 40) { const g = ctx.createLinearGradient(0, horizon - 24 * K, 0, horizon + 30 * K); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, `rgba(${fogA.join(',')},0.55)`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x0, horizon - 24 * K, w, 54 * K); }
    // 4) 云：一团团的，上面亮下面带一点灰蓝的影子；有的在脚下、有的在头顶，跟着风慢慢飘
    const clouds = [];
    for (let i = 0; i < 30; i++) { const r1 = hs(i, 11), r2 = hs(i, 12), r3 = hs(i, 13);
      const ang = r1 * 6.283, dist = 90 + r2 * 300, u = CEN[0] + Math.cos(ang) * dist, v = CEN[1] + Math.sin(ang) * dist + ((now / 1000) * 2 + i * 37) % 600 - 300, z = Z[0] - 140 + r3 * 280;
      const pp = P(u, v, z); if (pp) clouds.push([pp, 0.8 + r2 * 1.4, i]); }
    clouds.sort((A, B) => B[0][2] - A[0][2]);
    const lit = nightK > 0.5 ? [150, 160, 185] : [255, 255, 255], shd = nightK > 0.5 ? [95, 105, 135] : [200, 212, 230];
    for (const [pp, sz, i] of clouds) { const R = Math.min(w, (sz * 1800) / pp[2] * K); if (R < 2) continue; const al = Math.max(0.25, Math.min(0.9, 1.25 - pp[2] / 1500));
      for (let k = 0; k < 7; k++) { const ox = (hs(i, k) - 0.5) * R * 1.9, oy = -Math.abs(hs(k, i) - 0.5) * R * 0.45 - (k === 3 ? R * 0.2 : 0), rr = R * (0.35 + hs(i + 9, k) * 0.3), cx = pp[0] + ox, cy = pp[1] + oy;
        const g = ctx.createRadialGradient(cx - rr * 0.2, cy - rr * 0.35, rr * 0.1, cx, cy, rr); g.addColorStop(0, `rgba(${lit.join(',')},${al})`); g.addColorStop(0.7, `rgba(${lit.map((x, j) => Math.round((x + shd[j]) / 2)).join(',')},${al * 0.95})`); g.addColorStop(1, `rgba(${shd.join(',')},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, rr * 1.25, rr * 0.8, 0, 0, 6.283); ctx.fill(); } }
    // 5) 偶尔一小群鸟飞过
    if (nightK < 0.5) { const tt = (now / 1000) % 40; if (tt < 16) { ctx.strokeStyle = 'rgba(40,40,60,0.6)'; ctx.lineWidth = Math.max(1, K); for (let k = 0; k < 5; k++) { const b0 = P(CEN[0] - 160 + tt * 18 + k * 5, CEN[1] + 120 + (k % 2) * 6 + k * 3, Z[2] + 20 + Math.sin(tt * 2 + k) * 2); if (!b0) continue; const s2 = Math.max(2, 300 / b0[2]) * K, fl = Math.sin(now / 120 + k * 1.3) * 0.6; ctx.beginPath(); ctx.moveTo(b0[0] - s2, b0[1] - s2 * fl); ctx.quadraticCurveTo(b0[0] - s2 * 0.4, b0[1] - s2 * 0.5, b0[0], b0[1]); ctx.quadraticCurveTo(b0[0] + s2 * 0.4, b0[1] - s2 * 0.5, b0[0] + s2, b0[1] - s2 * fl); ctx.stroke(); } } }
    ctx.globalAlpha = 1;
  }
  function fpFrame(ctx) {
    const now = performance.now(), dt = Math.min(0.05, (now - fp.last) / 1000); fp.last = now;
    fpTick(dt); if (!fp) return;
    if (PP.ECO && now - (fp._pickT || 0) > 400) { fp._pickT = now; try { const msg = PP.ECO.nearPick(fp.q.u, fp.q.v); if (msg) gain(fp.p, msg); } catch (e) {} } /* 走到陨石、蘑菇圈、熟了的野草莓、神树的果子、野蜂窝底下：自动捡起来 */
    const lo = lightOpts(), x0 = L.vx0, y0 = L.vy0, w = L.vw, h = L.vh, c3 = (a) => `rgb(${a.map((v) => Math.round(v * 255)).join(',')})`;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    // 天空
    const sg = ctx.createLinearGradient(0, y0, 0, y0 + h); sg.addColorStop(0, c3(lo.skyTop || [0.48, 0.72, 0.91])); sg.addColorStop(1, c3(lo.skyBot || [0.81, 0.92, 0.98])); ctx.fillStyle = sg; ctx.fillRect(x0, y0, w, h);
    try { drawBelow(ctx, x0, y0, w, h, now, lo); } catch (e) {}
    try { const E0 = PP.ECO && PP.ECO.st(); if (E0 && E0.rainbow > Date.now()) { /* 雨后的彩虹：挂在东边的天上，走着转身才看得到 */ const cm = fpCam(), d = Math.atan2(Math.sin(0.4 - cm.yaw), Math.cos(0.4 - cm.yaw)), cxr = x0 + w / 2 + d / (cm.fov * 0.9) * w, hy = y0 + h * 0.5 + cm.pitch * h * 0.9, R = h * 0.75, k = Math.min(1, (E0.rainbow - Date.now()) / 300000);
      if (Math.abs(d) < 2.2) { ctx.save(); ctx.globalAlpha = 0.28 * k; ctx.lineWidth = R * 0.028; ['#ff5050', '#ffa040', '#ffe060', '#60d060', '#50a0ff', '#6060e0', '#a060d0'].forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cxr, hy, R - i * ctx.lineWidth, Math.PI, 0); ctx.stroke(); }); ctx.restore(); } } } catch (e) {}
    const s = scene(), t = now / 1000, dm = F.dyn({ t, cut: null, cooking, fire: fort().fuel / 100, power: power(), pinkBed: !!(E().room || {}).bed, lights: lightK.map((k) => (k > 0.5 ? 1 : 0)), bob: (fishTick(now), bobNow(now)), eye: [fp.q.u, fp.q.v, fp.q.z + (fp.swim ? SWE : EYE)], under: !!fp.under, bite: fishBite(now), relics: E().relics || {}, incense: Date.now() - ((E().shrine || {}).incense || 0) < 30 * 60000 });
    try { const cm = fpCam(), cy0 = Math.cos(cm.yaw), sy0 = Math.sin(cm.yaw); pets3d(dm, [-sy0, cy0], [-cy0, -sy0], (o) => o === fp.p && cm.third < 0.6, true); } catch (e) {}
    dynMesh = dm.p.length ? Object.assign(g3.upload(dm, dynMesh), { noShadow: true }) : null; lastScenes = [s.gpu, dynMesh]; lastLO = lo;
    const pix = fpQ() === 'pixel'; let vmM = null; try { const hm = S().fpHands !== false && fpCam().third < 0.6 ? buildVM() : null; vmM = hm && hm.p.length ? (vmGpu = g3.upload(hm, vmGpu)) : null; } catch (e) { vmM = null; fp._herr = String(e && e.stack || e); }
    let cv = g3.draw(lastScenes, fpOpts(vmM ? { vm: vmM } : null)); if (cv && pix && pixOn()) cv = outline(cv);
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
    vis.sort((a, b) => b.d - a.d); fp.vis = vis; // 留给「准星对着哪个伙伴」用
    for (const v of vis) { const o = v.o, keep = [o.x, o.y, o.scaleMul, o.isleHide, o.hopY]; o.x = v.sx; o.y = v.sy; o.hopY = 0; o._backView = v.me; /* 第三人称：主角背对着镜头 */ o.scaleMul = U.clamp(v.px / ((PP.SPR.HUMAN && PP.SPR.HUMAN.has(o.d.species) ? 37 : 28) * G.S), 0.15, 10); o.isleHide = false; try { if (!o._3d) o.render(ctx); if (!v.me && v.d < 60 && (o.bubble || o.d.note)) { o._fpDraw = true; o.renderOverlay(ctx); } } catch (e) {} o._fpDraw = false; o._backView = false; [o.x, o.y, o.scaleMul, o.isleHide, o.hopY] = keep; }
    try { fpGlow(ctx, x0, y0, w, h, now, cam, cyw, syw, cp, sp, f); } catch (e) {}
    if (fp.under) try { /* 水下：整个画面泛蓝绿、越往下越暗；头顶斜斜的几道光；小气泡往上冒 */
      const LK = F.LAKE, dep = U.clamp((LK.z - (fp.q.z + (fp.swim ? SWE : EYE))) / 18, 0, 1), gr = ctx.createLinearGradient(0, y0, 0, y0 + h);
      gr.addColorStop(0, `rgba(40,120,135,${0.22 + dep * 0.25})`); gr.addColorStop(1, `rgba(8,40,52,${0.4 + dep * 0.38})`); /* 越深越暗 */ ctx.fillStyle = gr; ctx.fillRect(x0, y0, w, h);
      const PD = PP.CITY && PP.CITY.POND, nearP = !PD ? 1 : U.clamp(1 - (Math.hypot(fp.q.u - (PD.u0 + PD.u1) / 2, fp.q.v - (PD.v0 + PD.v1) / 2) - 4) / 8, 0, 1) * (phase() === 'night' ? 0.35 : 1); /* 光束只在池口附近（水洞别处头顶是洞顶） */
      if (nearP > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const xx = x0 + w * (0.15 + i * 0.18) + Math.sin(now / 1500 + i) * w * 0.04, ww = w * (0.04 + 0.02 * Math.sin(now / 900 + i * 2)); const g2 = ctx.createLinearGradient(0, y0, 0, y0 + h * 0.8); g2.addColorStop(0, `rgba(190,240,230,${0.12 * (1 - dep) * nearP})`); g2.addColorStop(1, 'rgba(190,240,230,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx + ww, y0); ctx.lineTo(xx + ww * 3 + w * 0.08, y0 + h * 0.8); ctx.lineTo(xx + w * 0.08, y0 + h * 0.8); ctx.closePath(); ctx.fill(); } ctx.restore(); }
      const B = fp.bub = fp.bub || Array.from({ length: 18 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.5, s: 0.05 + Math.random() * 0.12 }));
      ctx.strokeStyle = 'rgba(230,250,255,.7)'; ctx.lineWidth = 1; for (const b of B) { b.y -= b.s * 0.016; b.x += Math.sin(now / 400 + b.r * 3) * 0.0006; if (b.y < -0.05) { b.y = 1.05; b.x = Math.random(); } ctx.beginPath(); ctx.arc(x0 + b.x * w, y0 + b.y * h, b.r * (h / 400), 0, 6.283); ctx.stroke(); }
    } catch (e) {}
    try { /* 空中飘的东西：白天是花瓣（风吹着斜斜地飘），晚上是一闪一闪的萤火虫；转头时跟着画面挪，像真的在空气里 */
      const lo2 = lightOpts(), ngt = (lo2.lit || 0) > 0.6, P2 = fp.air2 = fp.air2 || Array.from({ length: 46 }, (_, i) => ({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28 }));
      const dyaw = (fp._lastYaw == null ? 0 : fp.yaw - fp._lastYaw), dpit = (fp._lastPit == null ? 0 : fp.pitch - fp._lastPit); fp._lastYaw = fp.yaw; fp._lastPit = fp.pitch; const indoor = !!F.roomAt(fp.q.u, fp.q.v, fp.q.lv);
      for (const a of (fp.under ? [] : P2)) { /* 水下不飘花瓣 */ a.x -= dyaw * 0.35 * a.z; a.y += dpit * 0.35 * a.z; if (ngt) { a.x += Math.sin(now / 1300 + a.ph) * 0.0006; a.y += Math.cos(now / 1700 + a.ph) * 0.0005; } else { a.x += 0.0009 * a.z; a.y += 0.0011 * a.z; }
        a.x = ((a.x % 1) + 1) % 1; a.y = ((a.y % 1) + 1) % 1; }
      const nShow = fp.under ? 0 : indoor ? (ngt ? 6 : 28) : P2.length; /* 水下不飘花瓣 */ // 屋里白天：空气里漂着一点点被阳光照亮的灰尘
      for (let i = 0; i < nShow; i++) { const a = P2[i], px = x0 + a.x * w, py = y0 + a.y * h, sz = (2 + a.z * 5) * Math.min(w, h) / 500;
        if (ngt) { const tw = 0.5 + 0.5 * Math.sin(now / 300 + a.ph * 3); if (tw < 0.15) continue; const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 3); g.addColorStop(0, `rgba(230,255,150,${0.9 * tw})`); g.addColorStop(1, 'rgba(230,255,150,0)'); ctx.fillStyle = g; ctx.fillRect(px - sz * 3, py - sz * 3, sz * 6, sz * 6); }
        else if (indoor) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(now / 900 + a.ph * 2)), r2 = sz * 0.35; ctx.fillStyle = `rgba(255,236,190,${0.55 * tw})`; ctx.beginPath(); ctx.arc(px + Math.sin(now / 2200 + a.ph) * 6, py + Math.cos(now / 2600 + a.ph) * 5, r2, 0, 6.283); ctx.fill(); }
        else { ctx.save(); ctx.translate(px, py); ctx.rotate(now / 600 + a.ph); ctx.scale(1, 0.55 + 0.45 * Math.sin(now / 300 + a.ph)); ctx.fillStyle = i % 3 ? 'rgba(255,196,214,.85)' : 'rgba(255,240,246,.9)'; ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.6, 0, 0, 6.283); ctx.fill(); ctx.restore(); } } } catch (e) {}
    if (fp.fade) { const k = (now - fp.fade) / 700; if (k < 1) { ctx.fillStyle = `rgba(16,12,24,${(1 - k) * (1 - k)})`; ctx.fillRect(x0, y0, w, h); } else fp.fade = 0; } // 坐吊篮：画面黑一下再亮起来
    if (cam.third < 0.6) { try { drawHands(ctx, x0, y0, w, h, now); } catch (e) { fp._herr = String(e && e.stack || e); } }
    try { /* 鱼线：从右下角手里的鱼竿尖拉到浮漂；咬钩时浮漂那儿一圈圈水花 */ const bb = bobNow(now); if (bb) { const mx = (bb.u - cam.eye[0]) * 2.83, my = (bb.v - cam.eye[1]) * 2.83, mz = (POOL.z + 0.3 - bb.dip - cam.eye[2]) * 1.155, rx = -mx * syw + my * cyw, fw = mx * cyw + my * syw, u2 = mz * cp - fw * sp, f2 = mz * sp + fw * cp;
        if (f2 > 1) { const bx = x0 + w / 2 + (rx * f / (w / h)) / f2 * (w / 2), by = y0 + h / 2 - (u2 * f) / f2 * (h / 2); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); const tp = fp._tip || [x0 + w * 0.7, y0 + h * 0.46]; ctx.moveTo(tp[0], tp[1]); ctx.quadraticCurveTo((tp[0] + bx) / 2, Math.max(tp[1], by) + h * 0.06, bx, by); ctx.stroke();
          if (fp.fish && fp.fish.ph === 'bite') { const k = (now % 500) / 500; ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(bx, by + 4, 8 + k * 26, (8 + k * 26) * 0.35, 0, 0, 6.283); ctx.stroke(); } } }
      /* 钓上来了：那条鱼拿在手里给你看两秒半（图鉴里那张像素画），旁边写着名字 */
      const cs = fp.catchShow; if (cs && now - cs.t < 2600 && PP.FISHDEX && cs.id) { const im = PP.AQUA ? PP.AQUA.paint(cs.id, 480, 270, { yaw: 0.35 }) : PP.FISHDEX.sprite(cs.id), k = Math.min(1, (now - cs.t) / 250), sw = Math.min(w, h) * 0.5 * k, sh = sw * im.height / im.width, cx = x0 + w * 0.6, cy = y0 + h * 0.6 + Math.sin(now / 90) * 3; ctx.save(); ctx.imageSmoothingEnabled = true; /* 0.38：钓上来的鱼是立体的、有鳞有鳍的样子，在手里扑腾 */ ctx.translate(cx, cy); ctx.rotate(-0.25 + Math.sin(now / 120) * 0.06); ctx.drawImage(im, -sw / 2, -sh / 2, sw, sh); ctx.restore(); ctx.font = PP.FONT(Math.min(w, h) / 22); ctx.textAlign = 'center'; ctx.fillStyle = '#fff6d8'; ctx.strokeStyle = 'rgba(30,24,40,.8)'; ctx.lineWidth = 4; ctx.strokeText(cs.name, cx, cy + sh / 2 + 8); ctx.fillText(cs.name, cx, cy + sh / 2 + 8); } } catch (e) {}
    // 准星 + 准星指着的东西
    const cur = !lookOn() && fp.mx != null && !fp.overUI && fp.mx >= x0 && fp.mx <= x0 + w && fp.my >= y0 && fp.my <= y0 + h ? [fp.mx - x0, fp.my - y0] : null;
    if (now - fp.aimT > 160) { fp.aimT = now; const hh = hotFromId(fpPick(cur ? cur[0] : w / 2, cur ? cur[1] : h / 2)), po = aimPet(x0 + (cur ? cur[0] : w / 2), y0 + (cur ? cur[1] : h / 2)); fp.aim = po ? (po.d.name || '小伙伴') + '：摸摸 / 喂点吃的' : fp.fish ? '收竿' : hh && hh.label ? hh.label : null; fp.aimAt = cur; }
    const cx0 = x0 + w / 2, cy0 = y0 + h / 2, us = Math.max(1, Math.round(Math.min(w, h) / 260));
    if (lookOn() || !cur) { /* 准星：锁着鼠标时才用；不锁时鼠标本身就是指针 */
    ctx.fillStyle = 'rgba(20,16,30,.55)'; ctx.fillRect(cx0 - 7 * us, cy0 - us * 1.5, 14 * us, 3 * us); ctx.fillRect(cx0 - us * 1.5, cy0 - 7 * us, 3 * us, 14 * us); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(cx0 - 6 * us, cy0 - us / 2, 4 * us, us); ctx.fillRect(cx0 + 2 * us, cy0 - us / 2, 4 * us, us); ctx.fillRect(cx0 - us / 2, cy0 - 6 * us, us, 4 * us); ctx.fillRect(cx0 - us / 2, cy0 + 2 * us, us, 4 * us); }
    const fs = U.clamp(Math.min(w, h) / 34, 11, 18); ctx.font = PP.FONT(fs); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    let ty = cy0 + 12 * us; const pill = (tx, a = 0.72) => { const tw = ctx.measureText(tx).width; ctx.fillStyle = `rgba(30,24,40,${a})`; ctx.fillRect(cx0 - tw / 2 - 8, ty, tw + 16, fs + 10); ctx.fillStyle = '#fff6d8'; ctx.fillText(tx, cx0, ty + 5); ty += fs + 16; };
    if (fp.aim && fp.aimAt) { const tx = '单击：' + fp.aim, tw = ctx.measureText(tx).width, ax = U.clamp(x0 + fp.aimAt[0] + 16, x0 + 4, x0 + w - tw - 20), ay = U.clamp(y0 + fp.aimAt[1] + 14, y0 + 4, y0 + h - fs - 14); ctx.save(); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(30,24,40,.78)'; ctx.fillRect(ax, ay, tw + 16, fs + 10); ctx.fillStyle = '#fff6d8'; ctx.fillText(tx, ax + 8, ay + 5); ctx.restore(); }
    else if (fp.aim) { /* 互动提示：像原神 / GTA，前面一个按键方块 */ const tx = fp.aim, kw = fs * 1.5, tw = ctx.measureText(tx).width, bx = cx0 + 22 * us, by = cy0 - fs / 2 - 5; ctx.save(); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(30,24,40,.72)'; ctx.fillRect(bx, by, kw + tw + 22, fs + 10); ctx.fillStyle = '#fff6d8'; ctx.fillRect(bx + 4, by + 3, kw, fs + 4); ctx.fillStyle = '#2a2030'; ctx.textAlign = 'center'; ctx.fillText('E', bx + 4 + kw / 2, by + 5); ctx.textAlign = 'left'; ctx.fillStyle = '#fff6d8'; ctx.fillText(tx, bx + kw + 14, by + 5); ctx.restore(); }
    if (!lookOn() && !fpMenu && !bigMap && lastPT !== 'touch') pill(lookPref() && !fp.freeMouse ? '单击画面锁定鼠标（移动鼠标转向）' : '鼠标没锁：移到画面边上转头，点东西就用', 0.6);
    if (false) { const t2 = '', fs2 = fs * 0.85; ctx.save(); ctx.font = PP.FONT(fs2); ctx.textBaseline = 'top'; const tw2 = ctx.measureText(t2).width; ctx.fillStyle = 'rgba(30,24,40,.6)'; ctx.fillRect(cx0 - tw2 / 2 - 8, y0 + 8, tw2 + 16, fs2 + 8); ctx.fillStyle = '#fff6d8'; ctx.fillText(t2, cx0, y0 + 12); ctx.restore(); }
    // 刚进来：一行操作提示，6 秒后淡掉（菜单 ☰ 里有完整说明）
    // 按键说明：默认一直显示在左下角（像很多游戏的按键提示），按 H 收起 / 展开
    if (!bigMap) { const KS = fp.swim ? [['WASD / 方向键', '前后左右游'], ['空格（按住）', '往上浮'], ['C / Ctrl（按住）', '往下沉'], ['Shift', '游快一点'], ['E / 单击', '捡东西 · 看鱼'], ['E（浮在池面）', '上岸'], ['头灯', '天黑或深处自动亮'], ['M / Tab', '地图'], ['P', '设置'], ['V', '切换视角'], ['Q', '退出第一人称'], ['H', '隐藏说明']] : [['WASD', '移动'], ['空格', '跳 · 空中再按：滑翔伞'], ['Shift', '跑'], ['Ctrl / C', '蹲下'], ['E / F / 单击', '互动'], ['滚轮', '镜头远近'], ['B', '自己吃点东西'], ['M / Tab', '地图'], ['P', '设置'], ['V', '切换视角'], ['Z', '坐下 / 躺下'], ['按住 Alt', '放出鼠标'], ['R', '回到地面'], ['Q', '退出第一人称'], ['Esc', '老板键'], ['H', '隐藏说明']];
      const f3 = fs * 0.72; ctx.save(); ctx.font = PP.FONT(f3); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      if (S().fpKeysHide) { const t3 = 'H 显示按键说明', tw3 = ctx.measureText(t3).width; ctx.fillStyle = 'rgba(30,24,40,.5)'; ctx.fillRect(x0 + 8, y0 + h - f3 - 18, tw3 + 14, f3 + 10); ctx.fillStyle = '#fff6d8'; ctx.fillText(t3, x0 + 15, y0 + h - f3 / 2 - 13); }
      else { const lh = f3 + 7, rows = Math.ceil(KS.length / 2), kwid = Math.max(...KS.map(([k]) => ctx.measureText(k).width)) + 12, twid = Math.max(...KS.map(([, t]) => ctx.measureText(t).width)), colW = kwid + twid + 18, bh = rows * lh + 10, bx = x0 + 8, by = y0 + h - bh - 8;
        ctx.fillStyle = 'rgba(30,24,40,.42)'; ctx.fillRect(bx, by, colW * 2 + 8, bh);
        KS.forEach(([k, t], i) => { const col = Math.floor(i / rows), row = i % rows, xx = bx + col * colW, yy = by + 5 + row * lh + lh / 2, kw2 = ctx.measureText(k).width + 8; ctx.fillStyle = 'rgba(255,246,216,.9)'; ctx.fillRect(xx + 6, yy - lh / 2 + 2, kw2, lh - 4); ctx.fillStyle = '#2a2030'; ctx.fillText(k, xx + 10, yy); ctx.fillStyle = '#fff6d8'; ctx.fillText(t, xx + kwid + 12, yy); }); }
      ctx.restore(); }
    const age = 99;
    if (age < 6) { ctx.globalAlpha = Math.min(1, 6 - age); ctx.textBaseline = 'bottom'; const tx = 'WASD 走 · 移动鼠标转向 · 准星对准东西单击 · M 松开鼠标· 空格跳 · E 用 · 滚轮 镜头远近 · Tab 地图 · F 全屏 · Q 退出', tw = ctx.measureText(tx).width; ctx.fillStyle = 'rgba(30,24,40,.7)'; ctx.fillRect(cx0 - tw / 2 - 10, y0 + h - fs - 22, tw + 20, fs + 12); ctx.fillStyle = '#fff6d8'; ctx.fillText(tx, cx0, y0 + h - 14); ctx.globalAlpha = 1; }
    // 走进一个房间：屏幕上方淡入房间名字（像原神进入新地方），两三秒后淡掉
    { const rr = F.roomAt(fp.q.u, fp.q.v, fp.q.lv), md = !rr && F.MODS.find((q) => q.lv === fp.q.lv && F.inMod(q, fp.q.u, fp.q.v)), key = fp.under ? 'under' : rr ? rr.id : md ? 'm:' + md.id : 'out:' + fp.q.lv; if (fp._roomK !== key) { if (fp._roomK != null) fp.roomPop = { nm: fp.under ? '水下古城' : rr ? rr.nm : md ? md.name : '浮岛外面', sub: F.NAME[fp.q.lv], t: now }; fp._roomK = key; }
      const rp = fp.roomPop; if (rp && now - rp.t < 2800) { const k = now - rp.t, al = k < 400 ? k / 400 : k > 2200 ? (2800 - k) / 600 : 1, fz = Math.min(w, h) / 16; ctx.save(); ctx.globalAlpha = al; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const yy = y0 + h * 0.16;
        ctx.font = PP.FONT(fz); const tw = ctx.measureText(rp.nm).width; ctx.strokeStyle = 'rgba(255,246,216,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx0 - tw / 2 - fz * 2.2, yy); ctx.lineTo(cx0 - tw / 2 - fz * 0.5, yy); ctx.moveTo(cx0 + tw / 2 + fz * 0.5, yy); ctx.lineTo(cx0 + tw / 2 + fz * 2.2, yy); ctx.stroke();
        ctx.fillStyle = 'rgba(30,24,40,.5)'; ctx.fillText(rp.nm, cx0 + 2, yy + 2); ctx.fillStyle = '#fff6d8'; ctx.fillText(rp.nm, cx0, yy); ctx.font = PP.FONT(fz * 0.42); ctx.fillStyle = 'rgba(255,246,216,.85)'; ctx.fillText(rp.sub, cx0, yy + fz * 0.85); ctx.restore(); } }
    /* 捡到古城遗物：屏幕中间偏上弹一张卡片（像原神拿到宝箱）——名字、它的小故事、找到几件了 */
    { const rs = fp.relicShow; if (rs && now - rs.t < 5200) { const k = now - rs.t, al = k < 300 ? k / 300 : k > 4500 ? (5200 - k) / 700 : 1, cw = Math.min(w * 0.7, 460), ch = fs * 6.4, bx = cx0 - cw / 2, by = y0 + h * 0.2 + (1 - Math.min(1, k / 300)) * 12;
        ctx.save(); ctx.globalAlpha = al; const gr = ctx.createLinearGradient(bx, by, bx, by + ch); gr.addColorStop(0, 'rgba(36,40,60,.88)'); gr.addColorStop(1, 'rgba(24,28,44,.88)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, cw, ch, 10) : ctx.rect(bx, by, cw, ch); ctx.fill();
        ctx.strokeStyle = 'rgba(236,214,160,.9)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = rs.r.col; ctx.beginPath(); ctx.arc(bx + fs * 1.8, by + fs * 1.9, fs * 0.9, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(bx + fs * 1.55, by + fs * 1.6, fs * 0.3, 0, 6.283); ctx.fill();
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ecd6a0'; ctx.font = PP.FONT(fs * 0.8); ctx.fillText(`找到古城遗物  ${rs.n} / ${rs.all}`, bx + fs * 3.3, by + fs * 0.7); ctx.fillStyle = '#fff8e8'; ctx.font = PP.FONT(fs * 1.15); ctx.fillText(rs.r.nm, bx + fs * 3.3, by + fs * 1.75);
        ctx.font = PP.FONT(fs * 0.78); ctx.fillStyle = 'rgba(255,248,232,.85)'; const words = [...rs.r.desc]; let line = '', ly = by + fs * 3.6; for (const ch2 of words) { if (ctx.measureText(line + ch2).width > cw - fs * 4.3) { ctx.fillText(line, bx + fs * 3.3, ly); line = ''; ly += fs * 1.05; } line += ch2; } ctx.fillText(line, bx + fs * 3.3, ly); ctx.restore(); } }
    if (fp.under && F.RELICS) { const got = E().relics || {}, n = F.RELICS.filter((q) => got[q.id]).length; ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = PP.FONT(fs * 0.8); const tx = `◆ 古城遗物 ${n} / ${F.RELICS.length}`, tw = ctx.measureText(tx).width + 20; ctx.fillStyle = 'rgba(16,40,52,.55)'; ctx.fillRect(cx0 - tw / 2, y0 + 10, tw, fs * 0.8 + 10); ctx.fillStyle = '#bfefff'; ctx.fillText(tx, cx0, y0 + 15); ctx.restore(); } // 水下：顶上显示找到几件了
    // 小地图（右上角）+ 在哪儿
    const rm = F.roomAt(fp.q.u, fp.q.v, fp.q.lv), under = PP.SCENES && PP.SCENES[underScene()] ? PP.SCENES[underScene()].name : '', where = `${F.NAME[fp.q.lv]} · ${fp.under ? '古城之池 · 水下古城' : rm ? rm.nm : '外面'}${under ? ' · 飘在' + under + '上空' : ''}`;
    if (S().fpMap !== false && !bigMap) { const ms = Math.round(U.clamp(Math.min(w, h) * 0.24, 92, 190)), mx = x0 + 12, my = y0 + 12; drawMap(ctx, mx, my, ms, ms, fp.q.lv, false); miniR = [mx, my, ms, ms]; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = PP.FONT(fs * 0.78); const tw = ctx.measureText(where).width + 16; ctx.fillStyle = 'rgba(20,24,36,.45)'; ctx.fillRect(mx, my + ms + 6, tw, fs * 0.78 + 8); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillText(where, mx + 8, my + ms + 10); }
    else if (!bigMap) { miniR = null; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = PP.FONT(fs * 0.85); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(where, x0 + 12, y0 + 12); }
    // 大地图
    if (bigMap) { miniR = null; const m = bigMap, lft = 10, bw = Math.min(w - lft - 10, h * 1.15), bh = Math.min(h - 70, w * 0.85), bx = x0 + lft + (w - lft - 10 - bw) / 2, by = y0 + 46;
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
    const fur = L0.map((it, i) => { const d = FURN.D[it.f], lv = F.roomLv(it.room || 'living'), R0 = rbox(it.room || 'living'), f0 = FURN.front(it), fr = d.walk ? [U.clamp(it.u, R0[0] + 1.2, R0[2] - 1.2), U.clamp(it.v, R0[1] + 1.2, R0[3] - 1.2)] : [U.clamp(f0[0], R0[0] + 1, R0[2] - 1), U.clamp(f0[1], R0[1] + 1, R0[3] - 1)], st = FURN.seat(it), ffr = F.frameOf(it.room || 'living'), fw = F.toW(ffr, fr[0], fr[1]), sw = st ? F.toW(ffr, st.u, st.v) : null; return { id: FURN.PICK0 + i, f: it.f, it, room: it.room || 'living', at: [fw[0], fw[1], lv], spot: st ? { u: sw[0], v: sw[1], z: Z[lv] + st.z } : undefined, do: d.use, label: d.name + '：' + (d.act || USE_LABEL[d.use] || '看一看'), say: d.say, cur: ['sit', 'rock', 'warm', 'sleep', 'nap', 'rug'].includes(d.use) ? 'rest' : 'use' }; });
    return (propList = fix.concat(fur));
  }
  // 花房的花盆、阀门：标签跟着花盆里的情况变
  /* 花房里一株植物的小卡片：画、名字、简介、长到哪一步（进度条）、还要多久、浇水 / 温度 / 授粉的情况，下面是能做的事 */
  function potCard(i) {
    const LF = PP.LIFE, f = LF.potInfo(i), box = document.createElement('div'); box.className = 'potcard';
    if (!f) { box.innerHTML = '<p>这个花盆还空着。</p><p class="muted">在花房面板里挑一颗珍稀种子种下去吧。</p><div class="row"><button class="btn" data-a="open">打开花房面板</button></div>'; }
    else { const P = LF.PL[f.id], e = E(), pt = e.gh.pots[i], TN = LF.TEMPN, ST = ['种子', '发芽', '开花', '结果，可以收了'], pct = Math.round(Math.min(1, pt.g) * 100);
      const sp = (f.wet ? 1 : 0.25) * (f.tempOk ? 1 : 0.5), left = f.stage >= 3 ? 0 : f.stage === 2 && !f.pol ? -1 : Math.ceil(((f.stage < 2 ? 0.55 : 1) - pt.g) * (P.min || 60) / sp);
      box.innerHTML = `<div class="pc-top"><canvas width="96" height="96"></canvas><div><b class="pc-name">${f.name}</b><div class="muted">${P.about || ''}</div></div></div>
        <div class="pc-bar"><i style="width:${pct}%"></i>${[0, 15, 55, 100].map((x, k) => `<span style="left:${x}%">${['播种', '发芽', '开花', '成熟'][k]}</span>`).join('')}</div>
        <ul class="pc-st"><li>现在：<b>${ST[f.stage]}</b>${left > 0 ? `（还要大约 ${left >= 60 ? Math.round(left / 6) / 10 + ' 小时' : left + ' 分钟'}）` : left < 0 ? '（等授粉：蜜蜂会飞进来帮忙，你也可以自己授粉）' : ''}</li>
        <li>浇水：${f.wet ? '土是湿的 💧' : '<b class="bad">干了，该浇水了</b>（不浇水长得慢四倍）'}</li><li>温度：${f.tempOk ? '正合适' : `<b class="bad">它想要「${TN[f.temp]}」</b>（去调暖气阀门，长得快一倍）`}</li></ul>
        <div class="row">${!f.wet ? '<button class="btn" data-a="water">浇水</button>' : ''}${f.stage === 2 && !f.pol ? '<button class="btn" data-a="pol">授粉</button>' : ''}${f.stage >= 3 ? '<button class="btn" data-a="harv">收获</button>' : ''}<button class="btn ghost" data-a="open">花房面板</button></div>`;
      const c = box.querySelector('canvas').getContext('2d'); c.imageSmoothingEnabled = false; const im = LF.art(f.id, f.stage); c.drawImage(im, 0, 0, 96, 96); }
    box.addEventListener('click', (ev) => { const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'open') { PP.econ.openPanel('gh'); return; } if (a === 'water' && LF.potWater(i)) PP.ui.toast('浇好水了'); if (a === 'pol' && LF.potPollinate(i)) PP.ui.toast('用小刷子授好粉了'); if (a === 'harv' && LF.potHarvest(i)) PP.ui.toast('收获啦！'); dirty(); potCard(i); });
    PP.ui.panel(f ? '花房 · ' + f.name : '花房 · 空花盆', box);
  }
  function propLabel(pr) {
    const L0 = PP.LIFE, TN = L0 ? L0.TEMPN : {};
    if (pr.do === 'pot') { const f = L0 && L0.potInfo(pr.i); return f ? `${f.name}：${['种子', '发芽了', '开花了', '可以收获了'][f.stage]}${f.wet ? '' : ' · 该浇水了'}${f.stage === 2 && !f.pol ? ' · 等授粉' : ''}${f.tempOk ? '' : ' · 想要' + TN[f.temp]}（点开花房面板）` : `花盆 ${pr.i + 1}：空着，种一颗稀有种子`; }
    if (pr.do === 'valve') { const e = E(), t = e && e.gh ? e.gh.temp : 'mild'; return `暖气阀门：现在是「${TN[t] || '温和'}」${fort().fuel < 10 ? '（锅炉没柴了，暖气不热）' : ''}（点开调）`; }
    if (pr.do === 'stoke') return `石炉：柴还剩 ${Math.round(fort().fuel)}%（点一下去柴房抱柴来添）`;
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
  const FIXK = { [PK.mail]: { k: 'mail', label: '信箱：看信', cur: 'mail' }, [PK.tap]: { k: 'tap', label: '水龙头：打水喝（解渴）', cur: 'water' }, [PK.balloon]: { k: 'balloon', label: '热气球：出门探险', cur: 'trip' }, [PK.fish]: { k: 'fish', label: '古城之池：钓鱼 / 下潜（往下看，水底是一整座古城）', cur: 'fish' }, [PK.hive]: { k: 'hive', label: '蜂箱：收蜂蜜', cur: 'use' }, [PK.shrine]: { k: 'shrine', label: '神龛：上香 · 许愿 · 还愿', cur: 'use' }, [PK.workshop]: { k: 'workshop', label: '加工工坊：做鱼饵、熬果酱、留种、晾干花', cur: 'use' }, [PK.lift + 1]: { k: 'lift', lv: 1, label: '吊篮：坐上去，到二层、三层', cur: 'use' }, [PK.lift + 2]: { k: 'lift', lv: 2, label: '吊篮站：去一层、三层', cur: 'use' }, [PK.lift + 3]: { k: 'lift', lv: 3, label: '吊篮站：去一层、二层', cur: 'use' } };
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
    const p = mainP(), go = (name, fn, ...args) => { if (p) { p.interrupt(true); p.inDoor = false; p.fishing = null; p.tool = null; p.run(name, fn, ...args); p._byYou = true; p._stayUntil = performance.now() + 25000; } };
    /* 它正在干你让它干的活（种菜、浇水、收菜、钓鱼……）：点到地面不打断它，免得一不小心就跑走了 */
    const WORK = ['isleSow', 'isleWater', 'isleHarvest', 'isleFish', 'isleHive', 'isleUse', 'isleDrink', 'isleMail'];
    if (h.k === 'ground' && p && WORK.includes(p.action) && p._byYou) { PP.ui.toast(`${p.name}正在忙，等它做完再走（点地面不会打断它）`, 1.6); return; }
    if (h.k === 'ground') { mark = { u: h.u, v: h.v, z: h.z, t: performance.now() }; go('isleGo', A.isleGo, h.u, h.v, h.lv); return; }
    if (h.k === 'hull') return;
    if (h.k === 'door' && !h.d) { setFocus('living', true); if (p) go('isleHouse', A.isleHouse, 'house'); return; } // 菜单里的“进屋”：去起居室
    if (h.k === 'door') { const d = h.d, r = d.room, c = r.c ? [r.c[0] + (d.inP[0] - r.c[0]) * 0.6, r.c[1] + (d.inP[1] - r.c[1]) * 0.6] : [d.inP[0] + (d.inP[0] - d.outP[0]) * 0.8, d.inP[1] + (d.inP[1] - d.outP[1]) * 0.8]; setCut(d.lv); go('isleGo', A.isleGo, c[0], c[1], d.lv); return; }
    if (h.k === 'exit') { setCut(null); return; } // 兼容：菜单里的“出门”
    if (h.k === 'prop' && h.pr.do === 'pot' && PP.LIFE) { potCard(h.pr.i != null ? h.pr.i : h.pr.id - 160); return; } // 花盆：弹出这株植物自己的卡片
    if (h.k === 'prop') { const pk = { cookp: 'cook', dex: 'plant', craft: 'craft', store: 'bag', pot: 'gh', valve: 'gh' }[h.pr.do]; if (pk) PP.econ.openPanel(pk); if (cut == null && h.pr.at[2] !== 1) setCut(h.pr.at[2], true); go('isleUse', A.isleUse, h.pr); return; }
    if (h.k === 'deco') { go('isleSit', A.isleSit, { id: h.id, i: h.i, u: SLOTS[h.i][0], v: SLOTS[h.i][1] }); return; }
    if (h.k === 'shrine') { shrinePop(x, y); return; }
    if (h.k === 'workshop') { workshopPop(x, y); return; }
    if (h.k === 'lift') { if (fp) liftPop(h.lv, x, y); else PP.ui.toast('吊篮：进第一人称（👁 → 第一人称）后点它，就能直接去别的楼层', 2.4); return; }
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
    popCheck();
  }
  function cmd(a, b, c) { if (a === 'plant') { const p = mainP(); if (p) { p.interrupt(true); PP.fpAllow = true; try { p.run('isleSow', A.isleSow, +b, c); } finally { PP.fpAllow = false; } p._byYou = true; p._stayUntil = performance.now() + 25000; } else if (PP.econ.plant(+b, c)) PP.ui.toast('种下了'); } }
  // 兼容老接口：setInside('house') = 进起居室；false = 回到外面
  function setInside(v) {  if (v === 'house' || v === true) setFocus('living', true); else if (v === 'gh') setCut(1); else if (typeof v === 'number') setCut(v); else setCut(null); }

  // ---------- 主角在浮岛里过日子 ----------
  const day = () => { const e = E(); const d = today(); if (!e.isleDay || e.isleDay.d !== d) e.isleDay = { d, fish: 0, cook: 0 }; return e.isleDay; };
  const say = (p, t, d = 2.6) => { p._forceSay = true; p.say(Array.isArray(t) ? U.pick(t) : t, d); p._forceSay = false; };
  const bubble = (u, v, z) => PP.fx({ kind: 'dot', x: scrU(u, v), y: scrV(u, v, z), vx: U.rand(-8, 8), vy: U.rand(-30, -16), life: 1.4, col: U.pick(['#ffffff', '#cfeaf8', '#e8f6ff']), size: Math.max(2, L.u * 0.8) });
  const face = (p, u, v) => { const [a, b] = uvOf(p), r1 = rotUV(a, b), r2 = rotUV(u, v), d = ((r2[0] - r1[0]) - (r2[1] - r1[1])) * (mir() ? -1 : 1); if (Math.abs(d) > 0.05) p.facing = d > 0 ? 1 : -1; };
  const gain = (p, txt) => { if (fp && fp.p === p) { (fp.pops = fp.pops || []).push({ t: performance.now(), tx: txt }); return; } PP.fx({ kind: 'text', text: txt, x: p.x, y: p.y - 30 * G.S, vy: -28, life: 1.5, style: { size: 11, bg: '#bff0c0' } }); };
  const fxAt = (u, v, z, o) => PP.fx(Object.assign({ x: scrU(u, v), y: scrV(u, v, z), s: 1 }, o));
  /* 第一人称时主角是你在操控：从不自己走路，够得着就原地用，够不着就提示 */
  const REACH = 4.5;
  function* walkTo(p, u, v, run, lv = 1) { if (fp && fp.p === p) { const ok = Math.hypot(fp.q.u - u, fp.q.v - v) < REACH; if (!ok) PP.ui.toast('离得有点远，走近一些再用', 1.4); return ok; }
    if (walkPlan(p, u, v, lv, run)) yield () => !p.iw; const q = p.ip; return !!q && (q.lv || 0) === lv && Math.hypot(q.u - u, q.v - v) < 2.2; }
  const stuck = (p) => { p.tool = null; p.fishing = null; say(p, U.pick(['过不去……', '那边走不过去', '咦，路被挡住了']), 2); p.anim = 'idle'; };
  function* hop(p, to, T = 0.34) {
    const [u0, v0] = uvOf(p), z0 = p.isleSpot ? p.isleSpot.z : ipOf(p).z, hh = 2.2 + Math.abs(to.z - z0) * 0.25; face(p, to.u, to.v);
    p.anim = 'idle'; p.jolt(0, 2); yield 0.1;
    for (let t = 0; t < T; t += 1 / 60) { const k = t / T; p.isleSpot = { u: u0 + (to.u - u0) * k, v: v0 + (to.v - v0) * k, z: z0 + (to.z - z0) * k + Math.sin(k * Math.PI) * hh }; p.x = scrU(p.isleSpot.u, p.isleSpot.v); p.anim = k < 0.5 ? 'jump' : 'fall'; yield 1 / 60; }
    p.isleSpot = { u: to.u, v: to.v, z: to.z }; p.x = scrU(to.u, to.v); p.anim = 'land'; p.jolt(0, 2.4); yield 0.12; p.anim = 'idle';
  }
  function* hopOff(p, at) { const lv = at[2] != null ? at[2] : 1; yield* hop(p, { u: at[0], v: at[1], z: Z[lv] }); p.isleSpot = null; setIp(p, at[0], at[1], lv); }
  A.isleWait = function* () { const p = this; p.anim = 'idle'; p.look = [0, 1]; if (Math.random() < 0.3) p.think(U.pick(['heart', 'note']), 1.2); yield U.rand(2.5, 4); };
  A.isleGo = function* (u, v, lv) { const p = this; yield* walkTo(p, u, v, null, lv == null ? 1 : lv); p.anim = 'idle'; p.look = [0, 1]; if (Math.random() < 0.3) p.think(U.pick(['heart', 'note', 'sparkle']), 1.2); yield U.rand(2, 4); };
  A.isleOut = function* () { const p = this; p.anim = 'idle'; p.eyes = 'happy'; p.jolt(0, -3); yield 0.4; yield* walkTo(p, HALL_OUT.u + U.rand(-2, 3), HALL_OUT.v + U.rand(1, 4)); p.eyes = 'open'; };
  const plotStand = (i) => F.plotStand(i);
  /* 去菜地：第一人称时站在菜地任意一边、够得着就行（不用走到固定的那个位置） */
  function nearPlot(u, v, i) { const [cu, cv] = F.plotC(i); return Math.hypot(u - cu, v - cv) < PS * 0.72 + 2.4; }
  function* goPlot(p, i) {
    if (fp && fp.p === p) { if (!nearPlot(fp.q.u, fp.q.v, i)) { PP.ui.toast('离菜地远了点，走到菜地边上再用', 1.4); return false; } return true; }
    const [su, sv] = plotStand(i); return yield* walkTo(p, su, sv);
  }
  const plotC = (i) => F.plotC(i);
  A.isleWater = function* (i) {
    const p = this, [su, sv] = plotStand(i), [cu, cv, cz] = plotC(i);
    p.tool = { k: 'can', t0: performance.now() }; if (!(yield* goPlot(p, i))) { p.tool = null; if (!fp) stuck(p); return; } face(p, cu, cv - 2); p.anim = 'idle'; p.eyes = 'happy'; yield 0.2;
    p.tool = { k: 'can', t0: performance.now(), pour: true };
    for (let k = 0; k < 14; k++) { fxAt(cu + U.rand(-1.2, 1.2), cv + U.rand(-1.2, 1.2), cz + 4.5, { vy: 46, icon: 'drop', life: 0.45 }); if (k % 4 === 0) p.jolt(0, 1); yield 0.11; }
    if (PP.econ.waterPlot(i)) p.think('heart', 1); p.tool = null; p.jolt(0, -2); yield 0.5;
  };
  A.isleSow = function* (i, seed) {
    const p = this, [su, sv] = plotStand(i), [cu, cv, cz] = plotC(i);
    if (!(yield* goPlot(p, i))) { if (!fp) stuck(p); return; } face(p, cu, cv - 2); p.anim = 'eat';
    for (let k = 0; k < 4; k++) { p.jolt(k % 2 ? 1.5 : -1.5, 1); fxAt(cu + U.rand(-1, 1), cv + 0.6, cz + 1, { vx: U.rand(-30, 30), vy: -50, icon: 'leaf', life: 0.4 }); yield 0.22; }
    if (PP.econ.plant(i, seed)) { for (let k = 0; k < 5; k++) fxAt(cu + U.rand(-1, 1), cv + U.rand(-1, 1), cz + 3, { vy: 30, icon: 'sparkle', life: 0.5 }); PP.ui.toast(`种下了${PP.econ.ITEMS[seed].name.replace('种子', '').replace('球茎', '')}`); }
    p.anim = 'idle'; p.jolt(0, 2); yield 0.3; p.jolt(0, 2); yield 0.3;
    yield* A.isleWater.call(p, i);
  };
  A.isleHarvest = function* (i) {
    const p = this, [su, sv] = plotStand(i), [cu, cv, cz] = plotC(i), inf = PP.econ.plotInfo(i), col = inf && CROP_COL[inf.crop];
    p.tool = { k: 'basket', t0: performance.now(), col }; if (!(yield* goPlot(p, i))) { p.tool = null; if (!fp) stuck(p); return; } face(p, cu, cv - 2);
    for (let k = 0; k < 3; k++) { p.anim = 'eat'; p.jolt(k % 2 ? 2 : -2, 1.5); yield 0.28; p.anim = 'idle'; p.jolt(0, -2.5); fxAt(cu + (k - 1), cv, cz + 3, { vy: -70, vx: (p.x - scrU(cu, cv)) * 1.5, icon: 'sparkle', life: 0.5 }); yield 0.22; }
    PP.econ.harvest(i); fort().fuel = Math.min(100, fort().fuel + 4); p.tool.full = true; p.anim = 'jump'; p.jolt(0, -4); p.eyes = 'happy'; p.think('heart', 1.4); yield 0.5; p.anim = 'idle'; yield 0.9; p.tool = null;
  };
  A.isleMail = function* () { const p = this; if (!(yield* walkTo(p, ...F.mailStand()))) { stuck(p); return; } face(p, MAILB.u, MAILB.v); p.anim = 'jump'; p.jolt(0, -3); yield 0.35; p.anim = 'idle'; p.think('excl', 1.5); yield 1; if (PP.econ.unread()) say(p, '信箱里有信哦～', 3); yield 1.5; };
  A.isleDrink = function* () { const p = this; if (!(yield* walkTo(p, ...F.tapStand()))) { stuck(p); return; } face(p, TAP.u, TAP.v); p.anim = 'idle'; p.jolt(0, -2); yield 0.3; p.anim = 'eat'; for (let k = 0; k < 6; k++) { fxAt(TAP.u, TAP.v - 0.9, 3, { vy: 30, icon: 'drop', life: 0.3 }); yield 0.3; } p.n.thirst = 100; gain(p, '不渴了'); p.anim = 'idle'; p.eyes = 'happy'; p.think('heart', 1); yield 1; p.eyes = 'open'; };
  A.isleFish = function* () {
    const p = this;
    if (fp && fp.p === p) { if (Math.hypot(fp.q.u - BOB.u, fp.q.v - BOB.v) > 8 || fp.q.lv !== FISH.lv) { PP.ui.toast('走到湖边再钓', 1.4); return; } } /* 第一人称：池边哪儿都能钓 */
    else if (!(yield* walkTo(p, FISH.u, FISH.v, null, FISH.lv))) { stuck(p); return; } face(p, BOB.u, BOB.v); p.anim = 'sit';
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
  /* 找个地方睡：床只有一张，几只伙伴各睡各的——床、宠物窝、懒人沙发、沙发、摇椅、扶手椅、靠垫；都被占了就在暖和的房间里找块空地趴着。
     不再全挤到卧室那一张床上 */
  const NAP_F = ['petbed', 'beanbag', 'sofa', 'cushions', 'rocker0', 'rocker', 'armchair'];
  function sleepSpot(p) {
    const busy = (u, v, lv) => G.pets.some((o) => o !== p && ((o._sleepAt && o._sleepAt.lv === lv && Math.hypot(o._sleepAt.u - u, o._sleepAt.v - v) < 2.2) || (o.sleeping && o.ip && o.ip.lv === lv && Math.hypot(o.ip.u - u, o.ip.v - v) < 2.2)));
    const bed = props().find((x) => x.do === 'sleep');
    if (bed && !busy(bed.at[0], bed.at[1], bed.at[2]) && !G.pets.some((o) => o !== p && o._usePr === bed)) return { bed, u: bed.at[0], v: bed.at[1], lv: bed.at[2] };
    const fur = []; try { for (const it of FURN.layout(E())) { if (!NAP_F.includes(it.f)) continue; const rid = it.room || 'living', lv = F.roomLv(rid), w = F.toW(F.frameOf(rid), it.u, it.v), c = nearFree(area(), w[0], w[1], lv); if (c && !busy(c[0], c[1], lv)) fur.push({ u: c[0], v: c[1], lv }); } } catch (e) {}
    if (fur.length) return U.pick(fur);
    for (let k = 0; k < 12; k++) { const rid = U.pick(['living', 'library', 'hall', 'attic', 'bedroom', 'dining'].filter((r) => RM[r])), q = roomSpot(rid), c = nearFree(area(), q.u + U.rand(-2.5, 2.5), q.v + U.rand(-2.5, 2.5), q.lv); if (c && !busy(c[0], c[1], q.lv)) return { u: c[0], v: c[1], lv: q.lv }; }
    return null;
  }
  A.isleSleep = function* () { const p = this, s = sleepSpot(p); if (!s) { yield* A.isleBedSleep.call(p, {}); return; } p._sleepAt = { u: s.u, v: s.v, lv: s.lv };
    try { if (s.bed) yield* A.isleUse.call(p, s.bed); else { yield* walkTo(p, s.u, s.v, null, s.lv); yield* A.isleBedSleep.call(p, {}); } } finally { p._sleepAt = null; } };
  A.isleBed = function* () { yield* A.isleSleep.call(this); };
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
  // 抱柴：去柴房抱一捆，到地窖的石炉添进去
  function* fetchWood(p) {
    const wood = props().find((q) => q.do === 'wood'), boiler = props().find((q) => q.do === 'stoke');
    /* 第一人称：你自己走。在柴堆旁 → 抱起一捆（手里拿着）；在石炉旁 → 手里有柴就添进去 */
    if (fp && fp.p === p) {
      const near = (pr) => pr && Math.hypot(fp.q.u - pr.at[0], fp.q.v - pr.at[1]) < REACH + 1;
      if (near(boiler)) { if (!fp.wood) { PP.ui.toast('手里没有柴：先去柴堆（甲板层）抱一捆', 2.2); return false; }
        fp.wood = false; p.tool = null; for (let i = 0; i < 4; i++) { p.jolt(0, i % 2 ? -2 : 2); yield 0.3; }
        const f = fort(); f.fuel = Math.min(100, f.fuel + 35); say(p, ['火旺起来了！', '屋里要暖和了', '热水马上就好'], 2); PP.ui.toast(`锅炉 ${Math.round(f.fuel)}%`, 1.6); yield 1; return true; }
      if (near(wood)) { p.anim = 'eat'; for (let i = 0; i < 3; i++) { p.jolt(i % 2 ? 1.5 : -1.5, 1); yield 0.3; } p.anim = 'idle'; fp.wood = true; say(p, ['抱一捆柴！拿去地窖的石炉', '嘿咻'], 2); yield 0.4; return true; }
      PP.ui.toast('离得有点远，走近一些再用', 1.4); return false;
    }
    if (!(yield* walkTo(p, wood.at[0], wood.at[1], null, 1))) { stuck(p); return false; }
    face(p, wood.at[0], wood.at[1]); p.anim = 'eat'; for (let i = 0; i < 3; i++) { p.jolt(i % 2 ? 1.5 : -1.5, 1); yield 0.3; } p.anim = 'idle'; p.tool = { k: 'wood', t0: performance.now() }; say(p, ['抱一捆柴！', '嘿咻'], 1.4); yield 0.4;
    if (!(yield* walkTo(p, boiler.at[0], boiler.at[1], null, boiler.lv != null ? boiler.lv : 1))) { stuck(p); return false; }
    face(p, boiler.at[0], boiler.at[1]); p.tool = null; for (let i = 0; i < 4; i++) { p.jolt(0, i % 2 ? -2 : 2); fxAt(boiler.at[0] + U.rand(-1, 1), boiler.at[1], Z[1] + 3, { vy: -40, icon: 'sparkle', life: 0.5 }); yield 0.3; }
    const f = fort(); f.fuel = Math.min(100, f.fuel + 35); gain(p, `石炉 ${Math.round(f.fuel)}%`); say(p, ['火旺起来了！', '屋里要暖和了', '热水马上就好'], 2); yield 1;
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
    else if (k === 'helm') { face(p, ...(F.RM.cockpit ? F.RM.cockpit.c : [12, 18])); p.anim = 'idle'; for (let i = 0; i < 6; i++) { p.jolt(i % 2 ? 2 : -2, 0); yield 0.35; } const pw = power(); say(p, wfx().rain > 0.3 ? ['帆收起一半，雨天慢慢飘', '往云少的地方转一点舵'] : ['风正好，帆鼓起来了！', '往那片云的方向转一点', '慢慢飘～']); p.n.fun = Math.min(100, p.n.fun + 10); yield 2; }
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
  A.sleep = function* (...args) { const p = this; if (G.isle && G.pets.includes(p) && !p.d.trip) { p._bedSleep = true; try { yield* A.isleSleep.call(p); } finally { p._bedSleep = false; } return; } yield* baseSleep.apply(p, args); };
  A.enterDoor = function* (done) { if (!G.isle) { yield* baseEnter.call(this, done); return; } const p = this; yield* walkTo(p, HALL_OUT.u - 1, HALL_OUT.v - 1); yield 0.2; p.inDoor = true; done && done(); };
  A.emerge = function* () { if (!G.isle) { yield* baseEmerge.call(this); return; } const p = this; p.inDoor = false; p.ip = null; p.iw = null; p.isleSpot = null; setIp(p, HALL_OUT.u - 1, HALL_OUT.v - 1, 1); p.y = p.floor; yield* A.isleOut.call(p); };
  // 自己决定做什么：整座浮岛就是家。下雨下雪往屋里躲；晚上、累了去卧室睡；锅炉没柴了去抱柴
  /* 挑一件家务：别的伙伴正在干的同一件不挑 */
  function chore(p, wet) {
    const e = E(), PR = props(), mine = (k) => G.pets.some((o) => o !== p && o._chore === k && o.action && o.action !== 'fp');
    const free = (k) => !mine(k), out = [];
    PLOTS.forEach((_, i) => { const inf = PP.econ.plotInfo(i), k = 'plot' + i; if (!free(k)) return;
      if (inf && inf.stage === 3) out.push([3, { key: k, name: 'isleHarvest', fn: A.isleHarvest, args: [i] }]);
      else if (inf && !wet && (e.farm[i].water || 0) < 2) out.push([1.6, { key: k, name: 'isleWater', fn: A.isleWater, args: [i] }]);
      else if (!inf) { const seed = Object.keys(e.bag).find((id) => e.bag[id] > 0 && PP.econ.ITEMS[id] && PP.econ.ITEMS[id].kind === 'seed'); if (seed) out.push([1.4, { key: k, name: 'isleSow', fn: A.isleSow, args: [i, seed] }]); } });
    if (fort().fuel < 45 && free('wood')) out.push([1.5, { key: 'wood', name: 'isleStoke', fn: A.isleStoke, args: [] }]);
    if (eggOut() && free('nest')) { const pr = PR.find((x) => x.do === 'nest'); if (pr) out.push([1.2, { key: 'nest', name: 'isleUse', fn: A.isleUse, args: [pr] }]); }
    if (!day().honey && free('hive') && !wet) out.push([1, { key: 'hive', name: 'isleHive', fn: A.isleHive, args: [] }]);
    if (free('fish') && !G.pets.some((o) => o !== p && (o.action === 'isleFish' || o.fishing)) && (day().fish || 0) < 6) out.push([0.5, { key: 'fish', name: 'isleFish', fn: A.isleFish, args: [] }]);
    { const pr = PR.find((x) => x.do === 'cookp'); if (pr && free('cook') && (day().cook || 0) < 4) out.push([0.4, { key: 'cook', name: 'isleUse', fn: A.isleUse, args: [pr] }]); }
    if (!out.length) return null;
    return U.weighted(out.map(([w, c]) => [c, w]));
  }
  /* 浮岛里的串门：走到对方身边聊几句（不去拉你正在操控的主角，也不玩风景里那种横着跑的追逐） */
  const baseSocial = A.social;
  A.social = function* () {
    if (!G.isle || !G.pets.includes(this)) { yield* baseSocial.call(this); return; }
    const p = this, cands = G.pets.filter((o) => o !== p && o.ip && !o.held && !o.sleeping && !(PP.fpOwns && PP.fpOwns(o)) && o.ip.lv === ipOf(p).lv);
    if (!cands.length) return; const o = U.pick(cands), at = nearFree(area(), o.ip.u + U.rand(-1.5, 1.5), o.ip.v + 1.6, o.ip.lv);
    if (!(yield* walkTo(p, at[0], at[1], null, o.ip.lv))) return;
    face(p, o.ip.u, o.ip.v); const topics = ['note', 'heart', 'fish', 'sun', 'moon', 'star', 'q', 'excl'];
    for (let i = 0; i < U.randi(2, 4); i++) { const s2 = i % 2 && !o.gen ? o : p; s2.think(U.pick(topics), 1.6, '聊天'); yield 1.6; }
    p.addRel && p.addRel(o, 0.5); p.n.social = Math.min(100, p.n.social + 20);
  };
  /* 看门狗：浮岛里一个动作卡太久（等不到的东西）就结束它，换下一件事。睡觉、你让它干的、你正在操控的不管 */
  function watchdog() {
    const now = performance.now();
    for (const p of G.pets) { if (p._wdA !== p.action || p._wdG !== p.gen) { p._wdA = p.action; p._wdG = p.gen; p._wdT = now; continue; }
      if (!p.action || p.sleeping || p.held || (PP.fpOwns && PP.fpOwns(p)) || p._byYou) continue;
      const lim = p.action === 'isleUse' && p._usePr && p._usePr.do === 'sleep' ? 600000 : ['social', 'with', 'idle', 'wander'].includes(p.action) ? 30000 : 90000;
      if (now - p._wdT > lim) { p.interrupt(true); p._wdT = now; } }
    /* 第二道保险：醒着的伙伴 45 秒原地一步没挪（不管在干什么）→ 起来找点事做 */
    for (const p of G.pets) { if (p.held || p.sleeping || (PP.fpOwns && PP.fpOwns(p)) || p._byYou || !p.ip) { p._stillT = now; continue; }
      const k = Math.round(p.ip.u * 4) + ',' + Math.round(p.ip.v * 4) + ',' + p.ip.lv; if (k !== p._stillK) { p._stillK = k; p._stillT = now; continue; }
      if (now - (p._stillT || now) > 45000 && !(p.action === 'isleUse' && p._usePr && p._usePr.do === 'sleep')) { p._stillT = now; p.interrupt(true); const ch = chore(p, wfx().rain > 0.3); if (ch) { p._chore = ch.key; p.run(ch.name, ch.fn, ...ch.args); } else { const cs = cellList(); if (cs.length) { const c = U.pick(cs); p.run('isleGo', A.isleGo, c[2], c[3], c[4]); } } } }
  }
  const baseDecide = PP.Pet.prototype.decide;
  PP.Pet.prototype.decide = function () {
    if (G.isle && this.isleSpot && !this.sleeping && !this.fishing) { const s = this.isleSpot, a = area(), q = ipOf(this); this.isleSpot = null; if (Math.hypot(s.u - q.u, s.v - q.v) > 6) { const c = nearFree(a, s.u, s.v, q.lv); setIp(this, c[0], c[1], q.lv); } }
    if (G.isle && this.tool && !this.gen) this.tool = null;
    this._byYou = false;
    /* 你刚让它干完活：在原地待一会儿（你可能还要接着种、接着浇），不马上自己跑开 */
    if (G.isle && G.pets.includes(this) && this._stayUntil && performance.now() < this._stayUntil && !(PP.sleepTime && PP.sleepTime())) { this.run('isleWait', A.isleWait); return; }
    // 睡觉时间：回卧室的床上睡，不在甲板上随地一躺
    if (G.isle && G.pets.includes(this) && !this.held && PP.sleepTime && PP.sleepTime() && !this.sleeping) { this.run('isleSleep', A.isleSleep); return; }
    if (G.isle && G.pets.includes(this) && !this.held && Math.random() < 0.93) { /* 工作模式也照样在浮岛里过日子（只是不说话、不来找你） */
      const e = E(), p = this, q = ipOf(p), fx = wfx(), wet = fx.rain > 0.3 || fx.snow > 0.5 || fx.storm, R = (n, f, ...a) => { p.run(n, f, ...a); return true; }, PR = props();
      // 别的伙伴正在用 / 站在旁边的东西先不挑：几只住在一起时各干各的，不挤成一堆
      const taken = (x) => x && x.at && G.pets.some((o) => o !== p && o.ip && (o._usePr === x || Math.hypot(o.ip.u - x.at[0], o.ip.v - x.at[1]) < 2.5));
      const indoor = !!F.roomAt(q.u, q.v, q.lv), use = (list, ch) => { const L2 = list.filter((x) => !taken(x)); return L2.length && Math.random() < ch ? R('isleUse', A.isleUse, U.pick(L2)) : false; };
      const roam = (lv) => { const cs = cellList().filter((c) => lv == null || c[4] === lv); if (!cs.length) return false; const c = U.pick(cs); return R('isleGo', A.isleGo, c[2], c[3], c[4]); };
      if (p.n.energy < 35 || (night() && p.n.energy < 70 && Math.random() < 0.2)) return R('isleSleep', A.isleSleep); // 晚上也不是一到天黑就全去睡：累了才睡，各睡各的地方
      if (fort().fuel < 15 && Math.random() < 0.35) return R('isleStoke', A.isleStoke);
      /* 家务：浮岛里有活就先干活（收菜、种菜、浇水、添柴、捡蛋、收蜂蜜、钓鱼、做饭），几只分着干，不抢同一块地 */
      { const ch = chore(p, wet); if (ch && Math.random() < 0.8) { p._chore = ch.key; return R(ch.name, ch.fn, ...ch.args); } }
      if (wet && !indoor && Math.random() < 0.6) return R('isleHouse', A.isleHouse, U.pick(['house', 'house', 'gh']));
      if (!wet) {
        const grow = PLOTS.map((_, i) => i).filter((i) => { const inf = PP.econ.plotInfo(i); return inf && inf.stage < 3 && (e.farm[i].water || 0) < 3; });
        if (grow.length && !fx.rain && Math.random() < 0.25) return R('isleWater', A.isleWater, U.pick(grow));
        if (PP.econ.unread() && Math.random() < 0.2) return R('isleMail', A.isleMail);
        if (p.n.thirst < 60 && Math.random() < 0.5) return R('isleDrink', A.isleDrink);
        const sl = (e.isleDeco || []).map((id, i) => ({ id, i, u: SLOTS[i] && SLOTS[i][0], v: SLOTS[i] && SLOTS[i][1] })).filter((s) => ['bench', 'swing', 'hay'].includes(s.id));
        if (sl.length && Math.random() < 0.15) return R('isleSit', A.isleSit, U.pick(sl));
        if (Math.random() < 0.08 && !G.pets.some((o) => o !== p && (o.action === 'isleFish' || o.fishing))) return R('isleFish', A.isleFish); // 池边一次只坐一只，别都挤到蓄水池去
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
  const fpDebug = { A: () => A, cpu: () => scene().cpu, fok: (it) => [fOK(it, -1), fOK.why],  reach: (rid) => reachOK(rid), rbox, placeWall: (it) => placeWall(E(), it), warmSt: () => ({ on: !!warm.on, vox: !!vox, voxT: voxB && voxB.t, nav: !!navC, navB: navB && navB.lv + ":" + navB.j }), tick: (dt) => fp && fpTick(dt), surf, blocked, cam: () => fp && fpCam(),
    slice: (u0, v0, u1, v1, z) => { const V = voxels(), o = []; for (let v = v0; v < v1; v += VX) { let r = ''; for (let u = u0; u < u1; u += VX) r += vAt(V, u + 0.01, v + 0.01, z) ? '#' : '.'; o.push(r); } return o; },
    why: (u, v, z) => { const V = voxels(), o = []; for (const [du, dv] of BODYC) for (let zz = z + STEP; zz <= z + BODYH; zz += VZ) if (vAt(V, u + du, v + dv, zz)) { o.push([+du.toFixed(2), +dv.toFixed(2), +zz.toFixed(2)]); break; } return o; },
    tris: (u, v, z, r = 0.3) => { const m = scene().cpu, P = m.p, out = {}; for (let t = 0; t < P.length; t += 9) { let hit = false; const cu = (P[t] + P[t + 3] + P[t + 6]) / 3, cv = (P[t + 1] + P[t + 4] + P[t + 7]) / 3, cz = (P[t + 2] + P[t + 5] + P[t + 8]) / 3; if (Math.abs(cu - u) < r + 1 && Math.abs(cv - v) < r + 1 && Math.abs(cz - z) < 1.5) hit = true; if (!hit) continue; const vi = t / 3, k = m.c.slice(vi * 3, vi * 3 + 3).map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('') + ' 材质' + m.m[vi] + ' 摆' + (m.w ? m.w[vi] : 0); out[k] = (out[k] || 0) + 1; } return out; },
    who: (u0, v0, u1, v1, z0, z1) => { const cpu = scene().cpu, proto = Object.getPrototypeOf(cpu), orig = proto.tri, hits = new Map(); proto.tri = function (a, b, c, ...r) { for (let fa = 0; fa <= 1.001; fa += 0.1) for (let fb = 0; fb <= 1.001 - fa; fb += 0.1) { const x = a[0] + (b[0] - a[0]) * fa + (c[0] - a[0]) * fb + this.ox, y = a[1] + (b[1] - a[1]) * fa + (c[1] - a[1]) * fb + this.oy, z = a[2] + (b[2] - a[2]) * fa + (c[2] - a[2]) * fb + this.oz; if (x > u0 && x < u1 && y > v0 && y < v1 && z > z0 && z < z1) { const st = new Error().stack.split('\n').slice(2, 9).map((l) => l.trim().replace(/^at /, '').replace(/\(?file:.*\/js\//, '(').replace(/\)$/, '')).join(' < '); hits.set(st, (hits.get(st) || 0) + 1); fa = 9; break; } } return orig.call(this, a, b, c, ...r); }; try { F.build(opts(null)); } finally { proto.tri = orig; } return [...hits.entries()].map(([k, n]) => n + '× ' + k); },
    triIn: (u0, v0, u1, v1, z0, z1) => { const m = scene().cpu, P = m.p, out = {}; for (let t = 0; t < P.length; t += 9) { let hit = false; for (let fa = 0; fa <= 1.001 && !hit; fa += 0.1) for (let fb = 0; fb <= 1.001 - fa; fb += 0.1) { const x = P[t] + (P[t + 3] - P[t]) * fa + (P[t + 6] - P[t]) * fb, y = P[t + 1] + (P[t + 4] - P[t + 1]) * fa + (P[t + 7] - P[t + 1]) * fb, z = P[t + 2] + (P[t + 5] - P[t + 2]) * fa + (P[t + 8] - P[t + 2]) * fb; if (x > u0 && x < u1 && y > v0 && y < v1 && z > z0 && z < z1) { hit = true; break; } } if (!hit) continue; const vi = t / 3, k = m.c.slice(vi * 3, vi * 3 + 3).map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('') + ' 材质' + (m.m[vi] % 32) + ' 点选' + Math.floor(m.m[vi] / 32) + ' 摆' + m.w[vi] + ' 三角[' + [0, 1, 2].map((q) => P.slice(t + q * 3, t + q * 3 + 3).map((x) => x.toFixed(1)).join(',')).join(' ') + ']'; out[k] = (out[k] || 0) + 1; } return out; },
    rebuild: () => { vox = null; voxB = null; navC = null; navB = null; const t0 = performance.now(); voxels(); const t1 = performance.now(); return [Math.round(t1 - t0)]; },
    col: (u, v, z0, z1) => { const V = voxels(), o = []; for (let z = z0; z <= z1; z += VZ) if (vAt(V, u, v, z + 0.01)) o.push(+z.toFixed(2)); return o; },
    // 画一帧，数一数“什么都没画到”（透出去）的像素占多少
    holes: () => { if (!fp) return -1; fp._cam = null; fp.last = performance.now(); const s0 = scene(); lastScenes = [s0.gpu, dynMesh]; lastLO = lightOpts(); const cv = g3.draw(lastScenes, fpOpts()); if (!cv) return -1; const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d'); x.drawImage(cv, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] < 10) n++; return n / (d.length / 16); },
    nav: () => nav(), navFree, go: (u, v, lv) => { if (!fp) return false; const pts = fpPlan(fp.q, u, v, lv); if (!pts || !pts.length) return false; fp.auto = { pts, i: 0 }; return true; } };
  /* 委托里的「带我去」：进浮岛，主角自己走过去做 */
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
  Object.assign(fpDebug, { dive: () => pondDive(), out: () => pondOut(), shrine: () => shrinePop(300, 200), liftGo: (lv) => liftGo(lv), glide: () => fpGlideKey(), hot: () => (fp ? hotFromId(fpPick(L.vw / 2, L.vh / 2)) : null), use: () => fpUse(null), relicGet: (i) => relicGet(F.RELICS[i]), props: () => props(), fish: () => fpFish(), workshop: () => workshopPop(300, 200), fishState: () => fp && fp.fish, fishTick: (t) => fishTick(t) }); // 试玩脚本用
  PP.isle = { questGo, fpDebug, fpStart, fpStop, fpOn: () => !!fp, looking: lookOn, fpState: () => fp, camChanged, setFocus, focus: () => focus, neighbours, cookAnim, furnEdit, furnAdd, furnEditing: () => fedit, resetCam, props, doorX, floorY, sync, layout, groundY, zone, renderBack, renderFront, hot, click, down, cmd, dirty, inside: insideV, setInside, setCut, cut: () => cut, rect: () => L, scale: () => (L ? L.u : zoomOf()) * 0.34 * F.FS, zoom: () => (L ? L.u : zoomOf()), setSize, setZoom, resetPos, setMirror, mirror: mir, SIZES, Z0, safeB, SLOT_NAME, seedPicker, pressing: () => !!press, uvOf, walking: (p) => !!p.iw, step, gotoX, cells: cellList, areas: { fort: AREA }, free: (u, v, lv) => free(area(), u, v, lv), fort, power };
})();
