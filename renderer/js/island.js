// 小岛视图：一艘「浮空花园船」，真 3D（模型、光照、阴影见 isle3d.js / isle_models.js），这里是玩法：
//   甲板：点空地走过去；六块菜地（点空地选种子）、雨水桶、篝火、信箱、钓鱼板、热气球（探险）
//   多层：走楼梯上船尾甲板（望远镜、舵轮）；小屋里走楼梯上阁楼（床在阁楼）
//   能进去的房子：小屋（客厅 + 厨房 + 阁楼）、玻璃花房
//   滚轮缩放（或“视图”里选大小），按住空白处拖动整座岛；天气、天色跟外面同步
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G, A = PP.ACTIONS, g3 = PP.g3, MD = PP.isleModels, K = MD.K;
  const { N, HG, QD, QH, IW, IH, OX, OY, COT, DOOR, WING, TOWER, GREEN, GDOOR, CABIN, MAST, TREE, PLOTS, FIRE, MAILB, BARREL, PLANK, FISH, BALLOON, SCOPE, RAMP, SLOTS, R0, R1, RH0, LOFT, LOFTV, RDOOR, RRAMP, GV0, inDeck, LAND, RAMP2, GAL, RAMP3, DOCK, HDOOR, HAMMOCK, GZ, DZ, galV } = K;
  const SLOT_NAME = ['门口', '屋旁', '桅杆下', '菜地前', '船头', '篝火旁'];
  const cx = (u, v) => OX + 2 * (u - v) + 2, cy = (u, v, z = 0) => OY + u + v - z;

  let L = null, inside = false, hover = null, dirtyK = 0, smoke = [], cooking = false, mark = null, drops = [], flash = 0, press = null;
  let meshes = {}, dynMesh = null, glOK = true;
  const S = () => G.save.settings, E = () => PP.econ.E();
  function want() { const s = G.save && S(); return !!(s && s.mode === 'mini' && s.isle && !s.taskbar); }
  const env = () => PP.env.get(), season = () => (PP.season ? PP.season() : 'summer'), phase = () => env().time.phase, night = () => phase() === 'night', wfx = () => env().fx;
  const snowy = () => season() === 'winter' || wfx().snow > 0.3, tripping = () => G.all.some((p) => p.d.trip);
  const mix = (a, b, k) => PP.ART.mix(a, b, k);

  // ---------- 哪里能走、多高 ----------
  // 每个场景：ramp（楼梯）把 0 层和 1 层连起来；blocked(u,v,lv) 说这一层这个点能不能站；h(u,v,lv) 是地面高度
  function busy(u, v) {
    if (u >= COT.u0 - 1.5 && u <= WING.u1 + 1.5 && v >= COT.v0 - 1 && v <= COT.v1 + 3.6) return true;
    if (Math.hypot(u - TOWER.u, v - TOWER.v) < 6.8) return true;
    if (u >= GREEN.u0 - 1 && u <= GREEN.u1 + 2.6 && v >= GREEN.v0 - 1 && v <= GREEN.v1 + 1.2) return true;
    if (u < 12 || (v > 32.4 && v < 36.4) || (u > 38.2 && u < 42.3 && v < 34) || (v > 14.4 && v < 17.6 && u > 20 && u < 40) || (u > 34 && u < 40 && v > 19.4 && v < 22.4)) return true;
    if (PLOTS.some(([pu, pv]) => u >= pu - 2 && u < pu + 6 && v >= pv - 2 && v < pv + 6)) return true;
    for (const [o, r] of [[MAST, 3], [TREE, 3.6], [FIRE, 5], [BARREL, 2.6], [MAILB, 2.4], [{ u: 45, v: 9 }, 4], [{ u: 54, v: 28 }, 2], [{ u: 22.5, v: 34.3 }, 2], [{ u: 38.2, v: 17.4 }, 2]]) if (Math.hypot(u - o.u, v - o.v) < r) return true;
    return SLOTS.some(([su, sv]) => Math.hypot(u - su, v - sv) < 3);
  }
  const AREAS = {
    deck: {
      lvs: [1, 0, 2, 3], z: [HG, HG + QH, GZ, DZ], d0: 14, d1: 106,
      ramps: [{ ...RAMP, axis: 'u', lo: RAMP.u1, hi: RAMP.u0, a: 0, b: 1 }, { ...RAMP2, axis: 'u', lo: RAMP2.u0, hi: RAMP2.u1, a: 0, b: 2 }, { ...RAMP3, axis: 'u', lo: RAMP3.u0, hi: RAMP3.u1, a: 2, b: 3 }],
      blocked(u, v, lv) {
        if (lv === 3) return Math.hypot(u - DOCK.u, v - DOCK.v) > DOCK.r - 0.9;
        if (lv === 2) return u < GAL.u0 || u > GAL.u1 || v < galV(u) + 0.2 || v > galV(u) + 2.3;
        if (lv === 0 && u >= LAND.u0 + 0.5 && u <= LAND.u1 && v >= 43 && v <= LAND.v1 - 0.9) return false;
        if (!inDeck(u, v) || !inDeck(u + 1, v + 1) || !inDeck(u - 1, v - 1) || !inDeck(u + 1, v - 1)) return true;
        if (lv) return u > QD - 0.5 || (u >= CABIN.u0 - 0.6 && u <= CABIN.u1 + 0.6 && v >= CABIN.v0 - 0.6 && v <= CABIN.v1 + 0.6);
        if (u < QD + 0.6) return true;
        if (u >= RAMP.u0 && u <= RAMP.u1 + 0.3 && v >= RAMP.v0 - 0.8 && v <= RAMP.v1 + 0.8) return true;
        if (u >= COT.u0 - 1.2 && u <= COT.u1 + 1.2 && v >= COT.v0 - 1 && v <= COT.v1 + 1.2) return true;
        if (u >= WING.u0 && u <= WING.u1 + 0.8 && v >= WING.v0 - 0.6 && v <= WING.v1 + 0.6) return true;
        if (Math.hypot(u - TOWER.u, v - TOWER.v) < 5.6) return true;
        if (u >= GREEN.u0 - 0.6 && u <= GREEN.u1 + 0.5 && v >= GREEN.v0 - 0.6 && v <= GREEN.v1 + 0.8) return true;
        if (PLOTS.some(([pu, pv]) => u >= pu - 1 && u < pu + 5 && v >= pv - 1 && v < pv + 5)) return true;
        return Math.hypot(u - MAST.u, v - MAST.v) < 1.6 || Math.hypot(u - TREE.u, v - TREE.v) < 2.6 || Math.hypot(u - FIRE.u, v - FIRE.v) < 2 || Math.hypot(u - BARREL.u, v - BARREL.v) < 1.6;
      },
    },
    house: {
      lvs: [1, 0], z: [RH0, RH0 + LOFT], ramps: [{ ...RRAMP, axis: 'v', lo: RRAMP.v1, hi: RRAMP.v0, a: 0, b: 1 }], d0: R0 * 2 + 3, d1: R1 * 2 - 4,
      blocked(u, v, lv) {
        if (u < R0 + 1 || v < R0 + 1.2 || u > R1 - 1.5 || v > R1 - 1.5) return true;
        const r = E().room || {};
        if (lv) return v > LOFTV - 1.2 || u > 32.6 || (u >= 20.4 && v <= 17) || (u >= 11.4 && u <= 20.4 && v <= R0 + 5) || (u >= 12.6 && u <= 17.4 && v >= 16.8);
        if (u < RRAMP.u1 + 0.8 && v >= LOFTV - 1 && v <= RRAMP.v1 + 0.5) return true;
        if (u < 35 && v < LOFTV + 0.6) return true; // 阁楼底下
        if (u >= 40.6 && v <= R0 + 5.6) return true;
        if (u >= 36 && u <= 42.5 && v >= 10.6 && v <= 17.6) return true;
        if (u < R0 + 5 && v >= 41) return true;
        if (r.c1 === 'table' && u >= 15 && u <= 29 && v >= 43 && v <= 50.5) return true;
        if (r.c1 === 'shelf' && u >= 15 && u <= 26 && v >= 49) return true;
        if (r.c3 === 'piano' && u >= 43 && v >= 37 && v <= 46.5) return true;
        return false;
      },
    },
    gh: { lvs: [0], z: [RH0], ramps: [], d0: R0 + GV0 + 12, d1: R1 * 2 - 4, blocked: (u, v) => u < R0 + 5.5 || v < GV0 + 5.5 || u > R1 - 1.5 || v > R1 - 1.5 || (u >= 24 && u <= 38 && v >= 32 && v <= 42) || (Math.hypot(u - 49, v - 28) < 2.6) },
    hold: { lvs: [0], z: [RH0], ramps: [], d0: R0 * 2 + 3, d1: R1 * 2 - 4, blocked: (u, v) => u < R0 + 1.2 || v < R0 + 1.2 || u > R1 - 1.5 || v > R1 - 1.5 || Math.hypot(u - 40, v - 22) < 6.6 || (u < R0 + 5.6 && v > 11 && v < 27) || (u > 10.5 && u < 21 && v < 16) || (u > 22 && u < 33 && v < 11.4) || (u < R0 + 4 && v > 31 && v < 43) || (u > 10 && u < 18 && v > 42 && v < 50) || (u > 46 && u < 52 && v > 25 && v < 28) || (u > 43.5 && u < 46.5 && v > 39 && v < 53.5) },
  };
  for (const a of Object.values(AREAS)) a.h = (u, v, lv) => a.z[lv || 0];
  const area = () => AREAS[inside || 'deck'];
  const inRamp = (r, u, v) => r && u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1;
  const rampT = (r, u, v) => U.clamp(((r.axis === 'u' ? u : v) - r.lo) / (r.hi - r.lo), 0, 1);
  // 宠物在世界里的位置（由屏幕 x + 纵深 lane 反推）
  function uvOf(p) {
    if (p.isleSpot) return [p.isleSpot.u, p.isleSpot.v];
    const a = area(), d = a.d0 + U.clamp(p.lane != null ? p.lane : 0.4, 0, 1) * (a.d1 - a.d0), du = ((p.x - L.x0) / L.u - OX - 2) / 2;
    return [(d + du) / 2, (d - du) / 2];
  }
  function floorY(p) {
    if (!L) layout();
    const a = area();
    if (p.isleSpot) return Math.round(sy(cy(p.isleSpot.u, p.isleSpot.v, p.isleSpot.z != null ? p.isleSpot.z : a.z[0])));
    const wantD = a.d0 + U.clamp(p.lane != null ? p.lane : 0.4, 0, 1) * (a.d1 - a.d0), du = ((p.x - L.x0) / L.u - OX - 2) / 2, lv = a.z[p.isleLv] != null ? p.isleLv : 0;
    for (let k = 0; k < 80; k++) for (const sgn of k ? [1, -1] : [1]) {
      const d = wantD + sgn * k * 0.7; if (d < a.d0 - 8 || d > a.d1 + 8) continue;
      const u = (d + du) / 2, v = (d - du) / 2;
      for (const r of a.ramps) if ((r.a === lv || r.b === lv) && inRamp(r, u, v)) { const t = rampT(r, u, v); p.isleLv = t > 0.5 ? r.b : r.a; return (p._isleY = Math.round(sy(OY + d - (a.z[r.a] + (a.z[r.b] - a.z[r.a]) * t)))); }
      if (!a.blocked(u, v, lv)) return (p._isleY = Math.round(sy(OY + d - a.z[lv])));
    }
    return p._isleY != null ? p._isleY : Math.round(sy(OY + wantD - a.z[lv]));
  }
  const laneOf = (u, v) => { const a = area(); return U.clamp((u + v - a.d0) / (a.d1 - a.d0), 0, 1); };

  // ---------- 位置、缩放 ----------
  function safeB() { let b = G.H - (document.body.classList.contains('web') ? 44 : 0); try { const sc = window.screen; if (sc && sc.availHeight) { const v = (sc.availTop || 0) + sc.availHeight - (window.screenY || 0); if (v > 200 && v < b) b = v; } } catch (e) {} return b; }
  PP.safeB = safeB;
  const zoomOf = () => { let z = U.clamp(+(G.save && S().isleZoom) || 2.6, 1.2, 6); return Math.min(z, (safeB() - 8) / IH, (G.W - 8) / IW); };
  function layout() {
    const u = zoomOf(), w = Math.round(IW * u), h = Math.round(IH * u), pos = G.save && S().islePos, sb = safeB();
    let x1 = pos ? pos.x * G.W : G.W - 8, y1 = pos ? pos.y * sb : sb - 2;
    x1 = U.clamp(x1, w + 2, G.W - 2); y1 = U.clamp(y1, h + 2, sb - 2);
    L = { u, x0: Math.round(x1 - w), y0: Math.round(y1 - h), x1: Math.round(x1), y1: Math.round(y1), w, h };
    return L;
  }
  const sx = (x) => L.x0 + x * L.u, sy = (y) => L.y0 + y * L.u;
  const scrU = (u, v) => sx(cx(u, v)), scrV = (u, v, z = HG) => sy(cy(u, v, z));
  function toUV(x, y, z) { const X = (x - L.x0) / L.u - OX - 2, Y = (y - L.y0) / L.u - OY + z; return [(Y + X / 2) / 2, (Y - X / 2) / 2]; }
  function groundY() { if (!L) layout(); const a = area(); return Math.round(sy(OY + (a.d0 + a.d1) / 2 - a.h(0, 0, 0))); }
  function zone() { if (!L) layout(); return inside ? [sx(cx(R0 + 4, R1 - 8)), sx(cx(R1 - 6, (inside === 'gh' ? GV0 + 8 : R0 + 4)))] : [sx(cx(3, 42)), sx(cx(52, 16))]; }
  function sync() {
    const w = want();
    if (w && !G.isle) { G.isle = {}; inside = false; layout(); fit(true); }
    else if (!w && G.isle) { G.isle = null; inside = false; for (const p of G.all) { p.isleSpot = null; p.lane = null; p.fishing = null; p.isleLv = 0; } window.dispatchEvent(new Event('resize')); }
  }
  function fit(moveIn) {
    layout(); G.ground = groundY();
    const [a, b] = zone();
    for (const p of G.pets) {
      if (moveIn || p.x < a || p.x > b) { p.interrupt(true); p.x = U.clamp(moveIn ? scrU(DOOR.u + 3, COT.v1 + 5) : p.x, a, b); }
      if (moveIn) { p.lane = laneOf(DOOR.u + 3, COT.v1 + 5); p.isleSpot = null; p.isleLv = 0; }
      if (!p.held) { p.y = p.floor; p.airborne = false; }
    }
    PP.placeOrb && PP.placeOrb();
  }
  window.addEventListener('resize', () => { if (G.isle) setTimeout(() => fit(false), 0); });
  // 缩放：保持宠物在世界里的位置不变
  function setZoom(z, quiet) {
    const ps = G.pets.map((p) => [p, uvOf(p), p.isleLv]);
    S().isleZoom = U.clamp(z, 1.2, 6); PP.save.soon(); layout(); G.ground = groundY();
    for (const [p, [u, v]] of ps) { if (p.held) continue; p.x = scrU(u, v); if (p.target != null) p.target = null; p.y = p.floor; }
    PP.placeOrb && PP.placeOrb();
    if (!quiet) PP.ui.toast(`小岛大小 ${Math.round(L.u / 2.6 * 100)}%（在小岛上滚滚轮也能缩放）`);
  }
  const setSize = (n) => setZoom([0, 1.9, 2.6, 3.6][n] || 2.6);
  function resetPos() { S().islePos = null; PP.save.soon(); fit(false); }
  window.addEventListener('wheel', (e) => { if (!G.isle || !L || !hover) return; if (e.target && e.target.closest && e.target.closest('.panel,.menu,.orb-pop,.hud')) return; e.preventDefault(); setZoom((S().isleZoom || 2.6) * (e.deltaY < 0 ? 1.08 : 1 / 1.08), true); }, { passive: false });

  // ---------- 3D 场景 ----------
  function farmKey() { return PLOTS.map((_, i) => { const inf = PP.econ.plotInfo(i); return inf ? inf.crop + inf.stage + ((E().farm[i].water || 0) > 0 ? 'w' : '') : '-'; }).join(','); }
  function scene() {
    const name = inside || 'deck', e = E();
    const key = name === 'deck' ? [season(), snowy() ? 1 : 0, (e.isleDeco || []).join(','), farmKey(), dirtyK].join('|') : name === 'house' ? JSON.stringify(e.room) + dirtyK : name + dirtyK;
    let s = meshes[name];
    if (s && s.key === key) return s;
    let m;
    if (name === 'deck') m = MD.deck({ season: season(), snow: snowy(), deco: e.isleDeco, busy, farm: PLOTS.map((_, i) => { const inf = PP.econ.plotInfo(i); return inf ? { crop: inf.crop, stage: inf.stage, wet: (e.farm[i].water || 0) > 0 } : null; }) });
    else if (name === 'house') m = MD.room({ room: e.room }); else if (name === 'hold') m = MD.hold({}); else m = MD.green({});
    const up = g3.upload(m, s && s.gpu);
    return (meshes[name] = { key, gpu: up });
  }
  function lightOpts() {
    const ph = phase(), fx = wfx(), dim = Math.min(1, (fx.cloud || 0) * 0.5 + (fx.rain ? 0.35 : 0) + (fx.snow ? 0.25 : 0) + (fx.dark || 0));
    let sun = [1.0, 0.94, 0.8], sky = [0.5, 0.55, 0.68], gnd = [0.36, 0.33, 0.37], lit = 0, dir = [-0.55, 0.42, 0.72], top = [0.48, 0.72, 0.91], bot = [0.81, 0.92, 0.98];
    if (ph === 'night') { sun = [0.22, 0.28, 0.5]; sky = [0.2, 0.24, 0.42]; gnd = [0.13, 0.13, 0.24]; lit = 1; dir = [0.4, 0.5, 0.7]; top = [0.07, 0.09, 0.2]; bot = [0.15, 0.19, 0.36]; }
    else if (ph === 'dusk') { sun = [1.0, 0.56, 0.3]; sky = [0.5, 0.42, 0.56]; gnd = [0.34, 0.26, 0.32]; lit = 0.8; dir = [-0.8, 0.5, 0.36]; top = [0.42, 0.36, 0.6]; bot = [0.95, 0.63, 0.44]; }
    else if (ph === 'dawn') { sun = [1.0, 0.76, 0.66]; sky = [0.54, 0.5, 0.62]; gnd = [0.36, 0.3, 0.36]; lit = 0.3; dir = [0.2, 0.75, 0.42]; top = [0.54, 0.66, 0.85]; bot = [0.97, 0.78, 0.72]; }
    if (dim > 0) { sun = sun.map((x) => x * (1 - 0.7 * dim)); sky = sky.map((x, i) => x * (1 - 0.25 * dim) + [0.5, 0.52, 0.58][i] * 0.2 * dim); top = top.map((x, i) => x + ([0.55, 0.58, 0.64][i] - x) * dim * 0.8); bot = bot.map((x, i) => x + ([0.66, 0.68, 0.72][i] - x) * dim * 0.8); lit = Math.max(lit, dim * 0.6); }
    if (inside) { sky = sky.map((x, i) => x * 0.75 + [0.2, 0.16, 0.1][i]); gnd = gnd.map((x, i) => x + [0.1, 0.07, 0.04][i]); dir = [0.5, 0.62, 0.9]; if (ph === 'night') { sun = [0.5, 0.4, 0.28]; sky = [0.42, 0.34, 0.3]; } }
    return { sun: dir, sunCol: sun, sky, gnd, lit, skyTop: top, skyBot: bot, rain: wfx().rain || 0, inside: !!inside, time: performance.now() / 1000, center: inside ? [31, 31, 25] : [28, 28, 20], radius: inside ? 135 : 165 };
  }
  let lastLO = null, lastScenes = null;
  function render3d(extra) {
    const s = scene(), t = performance.now() / 1000;
    const dm = MD.dyn({ scene: inside || 'deck', t, wind: wfx().wind || 0, rain: wfx().rain > 0.5, tripping: tripping(), cooking });
    dynMesh = dm.p.length ? Object.assign(g3.upload(dm, dynMesh), { noShadow: true }) : null;
    lastScenes = [s.gpu, dynMesh]; lastLO = lightOpts();
    return g3.draw(lastScenes, Object.assign({ w: L.w, h: L.h, ox: OX + 2, oy: OY, k: L.u }, lastLO, extra));
  }

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
  function arrow(ctx, x, y, u, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u); ctx.beginPath(); ctx.moveTo(-2.4, -8); ctx.lineTo(2.4, -8); ctx.lineTo(2.4, -3); ctx.lineTo(5.4, -3); ctx.lineTo(0, 3); ctx.lineTo(-5.4, -3); ctx.lineTo(-2.4, -3); ctx.closePath();
    ctx.fillStyle = col; ctx.strokeStyle = '#3a2630'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.fill(); ctx.stroke(); ctx.restore();
  }
  const fishSpr = (() => { let c = null; return () => { if (c) return c; const a = PP.ART, s = a.spr(11, 7); s.ell(5, 3.5, 4.5, 2.6, (nx, ny) => (ny < -0.3 ? '#cfeafa' : ny > 0.4 ? '#7a9ad8' : '#a8c8f8')); s.set(2, 3, '#2a2026'); s.rect(9, 1, 2, 5, '#f2a6c2'); s.set(5, 0, '#f2a6c2'); s.set(5, 6, '#f2a6c2'); return (c = s.outline('#3a3a6a').canvas()); }; })();
  const BOB = [cx(FISH.u, FISH.v) + 9, cy(FISH.u, FISH.v, DZ) + 15];
  const CHIM = [cx(16.6, 23.1), cy(16.6, 23.1, HG + 56)];

  // ---------- 画 ----------
  function renderBack(ctx) {
    if (!G.isle) return;
    if (!L) layout();
    const u = L.u, nt = night(), now = performance.now(), fx = wfx(), wind = fx.wind || 0;
    ctx.save();
    // 船底水晶的光晕（在船身后面）
    if (!inside) glow(ctx, scrU(27, 28), scrV(27, 28, -47), 46 * u, 'rgba(150,220,255,', 0.5);
    const cv = glOK && g3.ok() && render3d();
    if (cv) { ctx.imageSmoothingEnabled = true; ctx.drawImage(cv, L.x0, L.y0); }
    else { glOK = false; ctx.fillStyle = 'rgba(40,30,50,.8)'; ctx.fillRect(L.x0 + L.w * 0.2, L.y0 + L.h * 0.45, L.w * 0.6, 40); ctx.fillStyle = '#fff'; ctx.font = PP.FONT(12); ctx.fillText('这台电脑没法开启 3D 渲染（WebGL2），小岛画不出来', L.x0 + L.w * 0.22, L.y0 + L.h * 0.45 + 24); }
    if (inside === 'house') {
      glow(ctx, scrU(49.5, R0 + 5), scrV(49.5, R0 + 5, RH0 + 6), (cooking ? 44 : nt ? 40 : 26) * u, 'rgba(255,170,90,', 0.38 + Math.sin(now / 130) * 0.05);
      if (nt || phase() === 'dusk') { glow(ctx, scrU(36, 19), scrV(36, 19, RH0 + 17), 34 * u); glow(ctx, scrU(18.2, R0 + 1.6), scrV(18.2, R0 + 1.6, RH0 + LOFT + 9), 22 * u, 'rgba(160,240,200,', 0.35); }
      if (cooking && Math.random() < 0.2) smoke.push({ x: cx(R0 + 2, 51) + U.rand(-2, 2), y: cy(R0 + 2, 51, RH0 + 14), t: 0 });
      arrow(ctx, scrU(RDOOR.u, R1 - 0.4), scrV(RDOOR.u, R1 - 0.4, RH0 + 31) + Math.sin(now / 260) * 2 * u, u, '#ffd36a');
    } else if (inside) {
      if (inside === 'hold') glow(ctx, scrU(40, 22), scrV(40, 22, RH0 + 14), 46 * u, 'rgba(150,220,255,', 0.45);
      arrow(ctx, scrU(RDOOR.u, R1 - 0.4), scrV(RDOOR.u, R1 - 0.4, RH0 + 31) + Math.sin(now / 260) * 2 * u, u, '#ffd36a');
    } else {
      const e = E();
      PLOTS.forEach(([pu, pv], i) => { const inf = PP.econ.plotInfo(i); if (inf && inf.stage === 3) { const x = scrU(pu + 2, pv + 2), y = scrV(pu + 2, pv + 2, HG + 20) + Math.sin(now / 300 + i) * 2 * u; ctx.fillStyle = '#ffd36a'; ctx.strokeStyle = '#3a2630'; ctx.lineWidth = u * 0.6; ctx.beginPath(); ctx.arc(x, y, 3.4 * u, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#3a2630'; ctx.fillRect(x - u * 0.4, y - 2 * u, u * 0.8, 2.2 * u); ctx.fillRect(x - u * 0.4, y + 0.9 * u, u * 0.8, u * 0.8); } });
      glow(ctx, scrU(FIRE.u, FIRE.v), scrV(FIRE.u, FIRE.v, HG + 3), (nt ? 44 : 20) * u, 'rgba(255,170,90,', nt ? 0.45 : 0.22);
      if (Math.random() < 0.05) smoke.push({ x: cx(FIRE.u, FIRE.v), y: cy(FIRE.u, FIRE.v, HG + 7), t: 0 });
      if (Math.random() < (cooking || G.all.some((p) => p.inHouse) ? 0.12 : 0.03)) smoke.push({ x: CHIM[0], y: CHIM[1], t: 0 });
      if (Math.random() < 0.02) smoke.push({ x: cx(20.6, 24.6), y: cy(20.6, 24.6, HG + 23), t: 0 });
      if (Math.random() < 0.1) smoke.push({ x: cx(27, 28) + U.rand(-3, 3), y: cy(27, 28, -52), t: 0, spark: true });
      if (nt || phase() === 'dusk') { for (const [a, b, z] of [[54, 28, 12], [22.5, 34.3, 12], [38.2, 17.4, 12], [14.7, 32.4, 11], [13, 33, 8], [16.6, 33, 10], [9.6, 33, 10], [TOWER.u + 1, TOWER.v + 3.3, 15], [GDOOR.u + 0.5, GDOOR.v, 6]]) glow(ctx, scrU(a, b), scrV(a, b, HG + z), 16 * u, 'rgba(255,214,140,', 0.3); (e.isleDeco || []).forEach((id, i) => { if (id === 'lampPost' || id === 'lantern') glow(ctx, scrU(SLOTS[i][0], SLOTS[i][1]), scrV(SLOTS[i][0], SLOTS[i][1], HG + (id === 'lampPost' ? 14 : 2)), 22 * u); }); }
      if (nt && season() === 'summer' && !fx.rain) { ctx.fillStyle = '#fff6a0'; for (let i = 0; i < 9; i++) { const t = now / 1000 + i * 3.1; if (Math.sin(t * 2.3 + i) > 0) { const pu = 20 + ((i * 13 + Math.sin(t) * 4) % 30), pv = 14 + ((i * 7 + Math.cos(t * 0.8) * 4) % 26); ctx.beginPath(); ctx.arc(scrU(pu, pv), scrV(pu, pv, HG + 8 + Math.sin(t * 2) * 3), u * 0.6, 0, 6.3); ctx.fill(); } } }
      { const bx = sx(BOB[0]), by = sy(BOB[1]) + 3 * u, dr = Math.sin(now / 2600) * 3 * u; for (const [dx, dy, r] of [[-12, 2, 9], [0, 0, 12], [12, 3, 9], [-5, 6, 10], [7, 7, 9]]) { const g = ctx.createRadialGradient(bx + dx * u + dr, by + dy * u, 0, bx + dx * u + dr, by + dy * u, r * u); g.addColorStop(0, nt ? 'rgba(170,185,230,.95)' : 'rgba(255,255,255,.98)'); g.addColorStop(0.6, nt ? 'rgba(150,165,215,.8)' : 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx + dx * u + dr, by + dy * u, r * u, r * u * 0.62, 0, 0, 6.3); ctx.fill(); } }
      for (const p of G.pets) if (p.fishing) drawFishing(ctx, p, now);
      if (mark && now - mark.t < 700) { const k = (now - mark.t) / 700, x = scrU(mark.u, mark.v), y = scrV(mark.u, mark.v, mark.z); ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = u; ctx.beginPath(); ctx.ellipse(x, y, (3 + k * 7) * u, (1.5 + k * 3.5) * u, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    if (inside && mark && now - mark.t < 700) { const k = (now - mark.t) / 700, x = scrU(mark.u, mark.v), y = scrV(mark.u, mark.v, mark.z); ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = u; ctx.beginPath(); ctx.ellipse(x, y, (3 + k * 7) * u, (1.5 + k * 3.5) * u, 0, 0, Math.PI * 2); ctx.stroke(); }
    smoke = smoke.filter((m) => (m.t += 1 / 60) < 3);
    for (const m of smoke) {
      if (m.spark) { ctx.fillStyle = `rgba(200,240,255,${(1 - m.t / 3).toFixed(2)})`; ctx.beginPath(); ctx.arc(sx(m.x + Math.sin(m.t * 3) * 2), sy(m.y + m.t * 8), u * 0.5, 0, 6.3); ctx.fill(); continue; }
      ctx.fillStyle = `rgba(240,240,248,${((1 - m.t / 3) * 0.5).toFixed(2)})`; ctx.beginPath(); ctx.arc(sx(m.x + Math.sin(m.t * 2) * 2 + m.t * (3 + wind * 4)), sy(m.y - m.t * 9), (1.2 + m.t * 1.5) * u, 0, 6.3); ctx.fill();
    }
    ctx.restore();
  }
  // 钓鱼：甩竿 → 等 → 浮漂点两下 → 猛地一沉（这时点一下帮它收竿）→ 鱼从云里被甩上来
  function rodTip(p) {
    const S2 = G.S, f = p.fishing, t = (performance.now() - f.t0) / 1000; let a = 0.6;
    if (f.ph === 'cast') a = t < 0.35 ? 0.6 + t * 4 : Math.max(0.5, 2 - (t - 0.35) * 6); else if (f.ph === 'bite') a = 0.4 + Math.sin(t * 30) * 0.1; else if (f.ph === 'reel') a = 1.3;
    const bx = p.x + p.facing * 5 * S2, by = p.y - 11 * S2, len = 22 * S2;
    return [bx, by, bx + p.facing * Math.cos(a) * len, by - Math.sin(a) * len];
  }
  function drawFishing(ctx, p, now) {
    const u = L.u, f = p.fishing, t = (now - f.t0) / 1000, [bx0, by0, tx, ty] = rodTip(p), bobX = sx(BOB[0]), bobY0 = sy(BOB[1]);
    let bobY = bobY0 + Math.sin(now / 400) * u * 0.8, cast = 1;
    if (f.ph === 'cast') cast = U.clamp((t - 0.35) / 0.45, 0, 1); if (f.ph === 'nibble') bobY += (Math.sin(t * 18) > 0.6 ? 2 * u : 0); if (f.ph === 'bite') bobY += 4 * u;
    ctx.lineCap = 'round'; ctx.strokeStyle = '#6a4430'; ctx.lineWidth = Math.max(1.5, u * 0.7); ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(tx, ty); ctx.stroke();
    if (cast <= 0) return;
    const ex = tx + (bobX - tx) * cast, ey = ty + (bobY - ty) * cast - Math.sin(cast * Math.PI) * 30 * u;
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1, u * 0.3); ctx.beginPath(); ctx.moveTo(tx, ty);
    if (f.ph === 'reel' || f.ph === 'bite') ctx.lineTo(ex, ey); else ctx.quadraticCurveTo((tx + ex) / 2, Math.max(ty, ey) + 10 * u, ex, ey); ctx.stroke();
    if (f.ph !== 'reel') { ctx.fillStyle = '#e8405a'; ctx.beginPath(); ctx.arc(ex, ey - u, 1.5 * u, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey - u, 1.5 * u, 0, Math.PI); ctx.fill(); }
    if ((f.ph === 'cast' && cast >= 1 && t < 1.4) || f.ph === 'bite' || f.ph === 'nibble') { const k = f.ph === 'cast' ? (t - 0.8) * 1.8 : (t * (f.ph === 'bite' ? 3 : 1.5)) % 1; ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - k)})`; ctx.lineWidth = u * 0.6; ctx.beginPath(); ctx.ellipse(bobX, bobY0 + u, (3 + k * 9) * u, (1 + k * 3.4) * u, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (f.ph === 'bite') PP.drawPixelLabel(ctx, '快点我！收竿', bobX, bobY0 - 12 * u, { size: 11, bg: '#ffd36a' });
    if (f.ph === 'reel') {
      const k = U.clamp(t / 0.8, 0, 1), fxp = bobX + (p.x - bobX) * k, fyp = bobY0 + (p.y - 20 * G.S - bobY0) * k - Math.sin(k * Math.PI) * 40 * u, fc = fishSpr(), fs = Math.max(1, Math.round(u * 0.8));
      if (f.got) { ctx.imageSmoothingEnabled = false; ctx.save(); ctx.translate(fxp, fyp); ctx.rotate(k * 6); ctx.drawImage(fc, -fc.width * fs / 2, -fc.height * fs / 2, fc.width * fs, fc.height * fs); ctx.restore(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(fxp, fyp); ctx.stroke(); }
      if (t < 0.4) for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(bobX + Math.cos(i * 0.9) * t * 46 * u, bobY0 - Math.abs(Math.sin(i * 0.9)) * t * 40 * u + t * t * 60 * u, u * 0.8, 0, 6.3); ctx.fill(); }
    }
  }
  function renderFront(ctx) {
    if (!G.isle || !L) return;
    const u = L.u, now = performance.now();
    ctx.save();
    // 遮挡：站在房子、树、栏杆后面的宠物，要被它们挡住——对每只宠物，把“比它更靠前”的那部分场景再画一遍盖上去
    if (glOK && lastScenes) for (const p of G.pets) {
      if (p.held) continue;
      const [pu, pv] = uvOf(p), S2 = G.S * (p.scaleMul || 1), w = 34 * S2, h = 40 * S2, x0 = Math.max(0, p.x - w / 2 - L.x0), y0 = Math.max(0, p.y - h - L.y0), x1 = Math.min(L.w, x0 + w), y1 = Math.min(L.h, p.y - L.y0 + 1);
      if (x1 - x0 < 2 || y1 - y0 < 2) continue;
      const cv = g3.draw(lastScenes, Object.assign({ w: L.w, h: L.h, ox: OX + 2, oy: OY, k: L.u }, lastLO, { cut: pu + pv + 0.9, cutPass: true, scissor: [x0, y0, x1 - x0, y1 - y0] }));
      if (cv) ctx.drawImage(cv, x0, y0, x1 - x0, y1 - y0, L.x0 + x0, L.y0 + y0, x1 - x0, y1 - y0);
    }
    const fx = wfx(); if (!inside && (fx.rain || fx.snow || flash > 0)) weatherTick(ctx, { x: L.x0, y: L.y0, w: L.w, h: L.h });
    if (!inside) {
      if (PP.econ.unread()) { const x = scrU(MAILB.u, MAILB.v), y = scrV(MAILB.u, MAILB.v, HG + 17 + Math.sin(now / 400) * 1.5); ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#3a2630'; ctx.lineWidth = u * 0.5; ctx.beginPath(); ctx.rect(x - 4 * u, y - 3 * u, 8 * u, 6 * u); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#e8705a'; ctx.beginPath(); ctx.moveTo(x - 4 * u, y - 3 * u); ctx.lineTo(x, y + 0.5 * u); ctx.lineTo(x + 4 * u, y - 3 * u); ctx.stroke(); }
      const M = G.mouse, over = M.onScreen && M.x > L.x0 && M.x < L.x1 && M.y > L.y0 && M.y < L.y1;
      if (over || !(G.save.flags && G.save.flags.isleIn)) {
        const b = Math.sin(now / 260) * 2 * u;
        arrow(ctx, scrU(DOOR.u, COT.v1 + 0.5), scrV(DOOR.u, COT.v1 + 0.5, HG + 26) + b, u, hover && hover.k === 'door' ? '#ffffff' : '#ffd36a');
        arrow(ctx, scrU(GDOOR.u + 0.4, GDOOR.v), scrV(GDOOR.u + 0.4, GDOOR.v, HG + 19) - b, u * 0.85, hover && hover.k === 'green' ? '#ffffff' : '#9fe8c8');
        arrow(ctx, scrU(HDOOR.u, galV(HDOOR.u)), scrV(HDOOR.u, galV(HDOOR.u), GZ + 17) + b, u * 0.85, hover && hover.k === 'hdoor' ? '#ffffff' : '#a8e8ff');
      }
    }
    if (hover && hover.k === 'ground' && !press) { const x = scrU(hover.u, hover.v), y = scrV(hover.u, hover.v, hover.z); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(1, u * 0.5); ctx.beginPath(); ctx.ellipse(x, y, 3 * u, 1.5 * u, 0, 0, 6.3); ctx.stroke(); }
    ctx.restore();
    if (hover && !G.hoverPet && !press) { const t = hoverText(hover); if (t) PP.drawPixelLabel(ctx, t, Math.round(hover.lx), Math.round(Math.max(10, hover.ly)), { size: 12 }); }
  }
  const fmtLeft = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} 小时 ${m % 60} 分` : `${m} 分钟`; };
  function hoverText(h) {
    const T = { door: '进小屋', green: '进玻璃花房', exit: '出门', stove: '在壁炉边做点心', fire: '烤火 / 烤点吃的', barrel: '雨水桶：去喝水', scope: '上船尾甲板看望远镜', bed: '上阁楼睡一觉', stairs: inside ? '上阁楼' : '上船尾甲板', plants: '照看花草', window: '看看窗外', chair: '坐一会儿' };
    if (h.k === 'prop') return h.pr.label;
    if (h.k === 'stairs') { const r = h.r, to = p && p.isleLv === r.b ? r.a : r.b, e = to === r.b ? r.hi : r.lo, sg = Math.sign(r.hi - r.lo) * (to === r.b ? 1 : -1), mid = r.axis === 'u' ? (r.v0 + r.v1) / 2 : (r.u0 + r.u1) / 2, q = r.axis === 'u' ? [e + sg * 2.6, mid] : [mid, e + sg * 2.6]; go('isleGo', A.isleGo, q[0], q[1], to); return; }
    if (h.k === 'plot') { const inf = PP.econ.plotInfo(h.i); if (!inf) return '空地：点一下选种子'; const n = PP.econ.ITEMS[PP.econ.CROPS[inf.crop].item].name; return inf.stage === 3 ? `${n}成熟啦！点一下收获` : `${n}：还有 ${fmtLeft(inf.left)}${(E().farm[h.i].water || 0) < 3 ? '（点一下浇水）' : ''}`; }
    return '';
  }

  // ---------- 点 / 拖 ----------
  function groundAt(x, y) { // 鼠标底下是哪块能走的地（先看高的那层）
    const a = area();
    for (const lv of a.lvs) { const z = a.z[lv], [gu, gv] = toUV(x, y, z); if (!a.ramps.some((r) => inRamp(r, gu, gv)) && !a.blocked(gu, gv, lv)) return { k: 'ground', u: gu, v: gv, z, lv }; }
    return null;
  }
  // ---------- 能互动的东西 ----------
  // a: 鼠标感应的位置 [u, v, z, 半宽, 高]；at: 站哪儿 [u, v, 层]；spot: 坐 / 躺上去的位置；climb: 爬上去的路线
  const spiral = []; for (let i = 6; i <= 20; i++) { const an = 2.6 - i * 0.155; spiral.push([TOWER.u + Math.cos(an) * 4.25, TOWER.v + Math.sin(an) * 4.25, HG + 1.6 + i * 1.62]); } spiral.push([TOWER.u + 4.5, TOWER.v + 1.2, HG + 33.6]);
  const PROPS = {
    deck: [
      { id: 'wheel', a: [5.4, 33, HG + QH, 3, 9], at: [4.2, 33.8, 1], do: 'steer', label: '舵轮：转一转' },
      { id: 'cabin', a: [3.8, 25.5, HG + QH, 4, 12], at: [5.6, 25.4, 1], do: 'nap', label: '小舱房：打个盹' },
      { id: 'crates', a: [3.3, 35.8, HG + QH, 3.5, 5], at: [5, 36.2, 1], do: 'rummage', label: '木箱：翻翻看' },
      { id: 'tower', a: [TOWER.u + 2, TOWER.v + 2, HG + 30, 9, 34], at: [5.4, 19.4, 1], climb: spiral, do: 'look', label: '圆塔：爬上塔顶阳台', say: ['塔顶的风好大！', '整座城堡都在脚下', '能看到好远的云'] },
      { id: 'mast', a: [MAST.u, MAST.v, HG + 14, 3, 50], at: [MAST.u + 0.3, MAST.v + 2, 0], climb: [[MAST.u + 0.3, MAST.v + 0.9, HG + 2], [MAST.u + 0.3, MAST.v + 0.9, HG + 66]], do: 'look', label: '桅杆：爬上瞭望台', say: ['瞭望台报告：前方全是云！', '好高好高～'] },
      { id: 'balcony', a: [17, 33.6, HG + 17, 5, 9], at: [DOOR.u, COT.v1 + 2.4, 0], spot: { u: 17, v: 33.8, z: HG + 17.6 }, do: 'look', label: '二楼阳台：上去吹吹风', say: ['阳台的花开了', '从这儿能看到菜地'] },
      { id: 'tree', a: [TREE.u, TREE.v, HG + 6, 5, 22], at: [TREE.u + 2.3, TREE.v + 2.3, 0], do: 'shake', label: '树：摇一摇' },
      { id: 'hammock', a: [HAMMOCK.u, galV(HAMMOCK.u) + 0.4, GZ, 5, 8], at: [HAMMOCK.u, galV(HAMMOCK.u) + 1.7, 2], spot: { u: HAMMOCK.u, v: galV(HAMMOCK.u) + 0.4, z: GZ + 3.4 }, do: 'nap', label: '回廊吊床：躺一会儿' },
      { id: 'gbox', a: [26.8, galV(26) + 0.3, GZ, 2.5, 4], at: [28.6, galV(28.6) + 1.2, 2], do: 'rummage', label: '回廊的木箱：翻翻看' },
      { id: 'bell', a: [DOCK.u - 1.9, DOCK.v - 2.5, DZ + 4, 3, 7], at: [DOCK.u - 0.6, DOCK.v - 1.2, 3], do: 'ring', label: '小码头的铃：敲一下' },
      ...[[54, 28], [22.5, 34.3], [38.2, 17.4]].map(([u, v], i) => ({ id: 'lamp' + i, a: [u, v, HG, 2, 15], at: [u - 1.2, v + 1.4, 0], do: 'lamp', label: '路灯：摸一摸' })),
    ],
    house: [
      { id: 'fire', a: [49.5, R0 + 4, RH0, 13, 24], at: [49.5, R0 + 8, 0], do: 'warm', label: '壁炉：烤烤火' },
      { id: 'kitchen', a: [R0 + 2, 48, RH0, 12, 14], at: [R0 + 6.4, 48, 0], do: 'kitchen', label: '厨房：做点吃的' },
      { id: 'clock', a: [38.7, R0 + 0.5, RH0 + 31, 3, 5], at: [38.6, R0 + 3, 0], do: 'clock', label: '挂钟：看看几点了' },
      { id: 'lamp', a: [36, 19, RH0, 3, 20], at: [34.6, 21, 0], do: 'lamp', label: '落地灯：摸一摸' },
      { id: 'desk', a: [15.7, R0 + 2, RH0 + LOFT + 6, 8, 6], at: [15.7, 12.6, 1], do: 'write', label: '书桌：写写日记' },
      { id: 'trunk', a: [15, 18.8, RH0 + LOFT, 4, 5], at: [18.8, 19, 1], do: 'rummage', label: '箱子：翻翻看' },
      { id: 'pot', a: [9, 9.5, RH0 + LOFT, 2.5, 8], at: [10.2, 12.4, 1], do: 'water', label: '盆栽：浇点水' },
    ],
    gh: [
      { id: 'lemon', a: [31, 37, RH0, 13, 34], at: [22, 37, 0], do: 'pick', label: '柠檬树：摘一个' },
      { id: 'barrel', a: [49, 28, RH0, 5, 8], at: [46.2, 29.6, 0], do: 'drink', label: '水桶：喝口水' },
      { id: 'basket', a: [16, GV0 + 6, RH0 + 26, 5, 12], at: [17, GV0 + 8.6, 0], do: 'sniff', label: '吊篮：闻闻花' },
      { id: 'sacks', a: [50, 47, RH0, 6, 6], at: [46, 46.4, 0], do: 'rummage', label: '麻袋：翻翻看' },
    ],
    hold: [
      { id: 'engine', a: [40, 22, RH0, 16, 30], at: [33, 26.6, 0], do: 'tune', label: '水晶引擎：给它充充能' },
      { id: 'bench', a: [R0 + 2, 19, RH0 + 4, 12, 10], at: [R0 + 6.6, 19, 0], do: 'tinker', label: '工作台：敲敲打打' },
      { id: 'barrels', a: [15.6, 12, RH0, 9, 11], at: [22.2, 14.6, 0], do: 'rummage', label: '酒桶：翻翻看' },
      { id: 'shelf', a: [R0 + 2, 37, RH0, 10, 22], at: [R0 + 5.2, 37, 0], do: 'eat', label: '腌菜架：偷吃一罐' },
      { id: 'hammock', a: [45, 46, RH0 + 4, 10, 9], at: [48.6, 46, 0], spot: { u: 45, v: 46.3, z: RH0 + 7 }, do: 'nap', label: '吊床：睡个午觉' },
      { id: 'port', a: [30, R0, RH0 + 20, 6, 8], at: [30, 12.4, 0], do: 'look', label: '舷窗：看看外面', say: ['窗外全是云', '有只鸟飞过去了'] },
      { id: 'ladder', a: [R0 + 0.6, 51.3, RH0, 5, 36], at: [R0 + 2.6, 51.3, 0], do: 'ladder', label: '梯子：爬回花园' },
    ],
  };
  function* glide(p, pts, sp = 26) { // 沿一条路线爬（楼梯、桅杆）
    for (let i = 1; i < pts.length; i++) { const A0 = pts[i - 1], B0 = pts[i], n = Math.max(2, Math.ceil(Math.hypot((B0[0] - A0[0]) * 2.8, (B0[1] - A0[1]) * 2.8, B0[2] - A0[2]) / sp * 12)); for (let k = 1; k <= n; k++) { const t = k / n, u = A0[0] + (B0[0] - A0[0]) * t, v = A0[1] + (B0[1] - A0[1]) * t; p.isleSpot = { u, v, z: A0[2] + (B0[2] - A0[2]) * t }; const x = scrU(u, v); if (Math.abs(x - p.x) > 0.5) p.facing = x > p.x ? 1 : -1; p.x = x; p.anim = k % 4 < 2 ? 'walk' : 'idle'; yield 1 / 12; } }
    p.anim = 'idle';
  }
  A.isleUse = function* (pr) {
    const p = this, say = (t, d = 2.6) => { p._forceSay = true; p.say(Array.isArray(t) ? U.pick(t) : t, d); p._forceSay = false; }, d = day(), S2 = () => G.S;
    const spark = (ic, n = 4, up = 20) => { for (let i = 0; i < n; i++) PP.fx({ x: p.x + U.rand(-12, 12) * S2(), y: p.y - up * S2(), vy: -30, icon: ic, life: 0.9, s: 1 }); };
    const back = () => { p.isleSpot = null; p.lane = laneOf(pr.at[0], pr.at[1]); p.x = scrU(pr.at[0], pr.at[1]); p.isleLv = pr.at[2] || 0; };
    yield* walkTo(p, pr.at[0], pr.at[1], null, pr.at[2] || 0);
    if (pr.climb) { const a0 = area(), st = [pr.at[0], pr.at[1], a0.z[pr.at[2] || 0]]; yield* glide(p, [st, ...pr.climb]); }
    if (pr.spot) { p.isleSpot = pr.spot; p.x = scrU(pr.spot.u, pr.spot.v); }
    p.anim = 'idle'; const k = pr.do;
    if (k === 'steer') { for (let i = 0; i < 8; i++) { p.jolt(i % 2 ? 2 : -2, 0); p.facing = i % 4 < 2 ? 1 : -1; yield 0.3; } spark('note', 2); say(['左满舵！', '全速前进～', '船长就是我']); p.n.fun = Math.min(100, p.n.fun + 10); yield 1.5; }
    else if (k === 'nap') { p.anim = 'lie'; p.eyes = 'sleepy'; say(['呼……', '眯一会儿'], 1.6); yield U.rand(6, 10); p.n.energy = Math.min(100, p.n.energy + 20); p.eyes = 'open'; }
    else if (k === 'rummage') { for (let i = 0; i < 6; i++) { p.jolt(i % 2 ? 1 : -1, i % 3 ? 0 : -1); yield 0.3; } if ((d.rum || 0) < 3 && Math.random() < 0.5) { d.rum = (d.rum || 0) + 1; PP.econ.addFish(1, `${p.name}翻到一条小鱼干`); spark('sparkle', 3); say('翻到一条小鱼干！'); } else say(['只有灰尘……', '找到一只旧袜子', '空的']); yield 1.6; }
    else if (k === 'look') { p.look = [0, -1]; p.eyes = 'happy'; spark(night() ? 'moon' : 'sparkle', 1, 28); yield 1.5; say(pr.say || ['风景真好']); p.n.fun = Math.min(100, p.n.fun + 10); yield 3; p.eyes = 'open'; }
    else if (k === 'shake') { for (let i = 0; i < 6; i++) { p.jolt(i % 2 ? 2 : -2, 0); PP.fx({ x: scrU(TREE.u, TREE.v) + U.rand(-16, 16) * L.u, y: scrV(TREE.u, TREE.v, HG + 22), vy: 50, icon: 'sparkle', life: 1, s: 1 }); yield 0.25; } if (!d.tree && season() !== 'winter' && Math.random() < 0.6) { d.tree = 1; PP.econ.give('berry', 1); say('掉下来一颗果子！放进背包了'); } else say(['掉了一头叶子', '树上的鸟被吓跑了']); yield 1.6; }
    else if (k === 'lamp') { p.anim = 'jump'; p.jolt(0, -4); spark('sparkle', 3, 26); yield 0.6; p.anim = 'idle'; say(night() ? ['亮晶晶的', '有它就不怕黑'] : ['晚上它会亮哦']); yield 1.4; }
    else if (k === 'ring') { for (let i = 0; i < 3; i++) { p.jolt(1, -1); spark('note', 1, 26); yield 0.5; } say(['当——当——', '开饭啦！']); yield 1.4; }
    else if (k === 'clock') { const t = new Date(); p.look = [0, -1]; yield 0.8; say(`现在是 ${t.getHours()} 点 ${String(t.getMinutes()).padStart(2, '0')} 分`); yield 2; }
    else if (k === 'warm') { p.anim = 'sit'; p.eyes = 'happy'; spark('heart', 1); yield U.rand(5, 8); p.n.energy = Math.min(100, p.n.energy + 6); p.eyes = 'open'; }
    else if (k === 'kitchen') { yield* A.isleCook.call(p); }
    else if (k === 'write') { p.anim = 'sit'; p.think('book', 2.5); yield 2.6; say(['今天也是开心的一天', '写下：钓到一条云鱼', '日记：主人今天摸了我']); yield 2; }
    else if (k === 'water') { for (let i = 0; i < 5; i++) { PP.fx({ x: p.x - 8 * S2(), y: p.y - 14 * S2(), vy: 26, icon: 'drop', life: 0.6, s: 1 }); yield 0.3; } spark('heart', 1); yield 0.8; }
    else if (k === 'pick') { p.anim = 'jump'; p.jolt(0, -4); yield 0.5; p.anim = 'eat'; yield 1.2; p.n.thirst = Math.min(100, p.n.thirst + 30); say(['柠檬好酸！', '酸得眼睛都眯起来了']); p.anim = 'idle'; yield 1.5; }
    else if (k === 'drink') { p.anim = 'eat'; yield 2; p.n.thirst = 100; spark('heart', 1); p.anim = 'idle'; yield 0.8; }
    else if (k === 'sniff') { p.look = [0, -1]; p.think('flower', 2); yield 2.4; p.eyes = 'happy'; yield 1; p.eyes = 'open'; }
    else if (k === 'tune') { for (let i = 0; i < 6; i++) { PP.fx({ x: scrU(40, 22) + U.rand(-14, 14) * L.u, y: scrV(40, 22, RH0 + 16), vy: -30, icon: 'sparkle', life: 0.9, s: 1 }); p.jolt(i % 2 ? 1 : -1, 0); yield 0.35; } if (!d.engine) { d.engine = 1; PP.econ.addFish(2, `${p.name}给水晶引擎充了能`); say('水晶充好能了！城堡飞得更稳了'); } else say(['嗡——运转正常', '今天已经充过啦']); yield 1.8; }
    else if (k === 'tinker') { for (let i = 0; i < 7; i++) { p.jolt(i % 2 ? 1 : -1, i % 2 ? -1 : 0); if (i % 3 === 0) spark('sparkle', 1, 14); yield 0.3; } say(['修好了一个小齿轮', '叮叮当当']); p.n.fun = Math.min(100, p.n.fun + 8); yield 1.4; }
    else if (k === 'eat') { p.anim = 'eat'; yield 2; p.n.hunger = Math.min(100, p.n.hunger + 20); p.anim = 'idle'; say(['腌萝卜真脆', '嘘，别告诉别人']); yield 1.4; }
    else if (k === 'ladder') { yield* glide(p, [[R0 + 2.6, 51.3, RH0], [R0 + 1.6, 51.3, RH0 + 30]]); p.isleSpot = null; setInside(false, [14.8, 44, 0]); return; }
    if (pr.climb) { const a0 = area(), st = [pr.at[0], pr.at[1], a0.z[pr.at[2] || 0]]; yield* glide(p, [...pr.climb].reverse().concat([st]), 40); }
    back(); p.anim = 'idle'; p.look = [0, 0];
  };
  function hot(x, y) {
    hover = null;
    if (!G.isle || !L || G.editing) return null;
    if (x < L.x0 || x > L.x1 || y < L.y0 || y > L.y1) return null;
    let h = null;
    const near = (u, v, z, rx, ry) => { const X = scrU(u, v), Y = scrV(u, v, z); return Math.abs(x - X) <= rx * L.u && y >= Y - ry * L.u && y <= Y + 3 * L.u; };
    const prop = () => { const pr = (PROPS[inside || 'deck'] || []).find((q) => near(...q.a)); return pr ? { k: 'prop', pr } : null; };
    if (inside === 'house') {
      if (near(RDOOR.u, R1 - 0.4, RH0, 9, 28)) h = { k: 'exit' };
      else if (near(27.5, 12, RH0 + LOFT, 15, 11)) h = { k: 'bed' };
      else if (near(39.2, 14.5, RH0, 6, 12)) h = { k: 'chair' };
      else if (near(9, 31, RH0 + 15, 6, 16)) h = { k: 'stairs', r: AREAS.house.ramps[0] };
      else h = prop() || groundAt(x, y) || { k: 'room' };
    } else if (inside === 'gh') {
      if (near(RDOOR.u, R1 - 0.4, RH0, 9, 28)) h = { k: 'exit' };
      else h = prop() || (near(30, GV0 + 2, RH0 + 7, 60, 14) ? { k: 'plants' } : null) || groundAt(x, y) || { k: 'room' };
    } else if (inside === 'hold') {
      if (near(RDOOR.u, R1 - 0.4, RH0, 9, 28)) h = { k: 'exit' };
      else h = prop() || groundAt(x, y) || { k: 'room' };
    } else {
      const p = mainP(), [gu, gv] = toUV(x, y, HG), bobD = Math.hypot(x - sx(BOB[0]), y - sy(BOB[1]));
      if (p && p.fishing && p.fishing.ph === 'bite' && bobD < 34 * L.u) h = { k: 'fish' };
      else if (near(DOOR.u, COT.v1 + 0.6, HG, 5, 16)) h = { k: 'door' };
      else if (near(GDOOR.u + 0.3, GDOOR.v, HG, 5, 14)) h = { k: 'green' };
      else if (near(HDOOR.u, galV(HDOOR.u), GZ, 4, 13)) h = { k: 'hdoor' };
      else if (near(MAILB.u, MAILB.v, HG, 4, 11)) h = { k: 'mail' };
      else if ((!tripping() && near(BALLOON.u - 3.2, BALLOON.v + 5.4, HG + QH + 22, 12, 30)) || near(BALLOON.u, BALLOON.v, HG + QH, 3, 10)) h = { k: 'balloon' };
      else if (near(SCOPE.u, SCOPE.v, HG + QH, 5, 12)) h = { k: 'scope' };
      else if (near(FIRE.u, FIRE.v, HG, 8, 8)) h = { k: 'fire' };
      else if (near(BARREL.u, BARREL.v, HG, 4, 9)) h = { k: 'barrel' };
      else if (near(FISH.u, FISH.v, DZ, 4, 8) || bobD < 14 * L.u) h = { k: 'fish' };
      else { const a = AREAS.deck, r = a.ramps.find((q) => inRamp(q, ...toUV(x, y, (a.z[q.a] + a.z[q.b]) / 2))); if (r) h = { k: 'stairs', r }; }
      if (!h) h = prop();
      if (!h) PLOTS.forEach(([pu, pv], i) => { if (!h && gu >= pu - 0.5 && gu < pu + 4.5 && gv >= pv - 0.5 && gv < pv + 4.5) h = { k: 'plot', i }; });
      if (!h) h = groundAt(x, y);
      if (!h) { const on = [HG, HG - 14, HG - 28].some((z, i) => { const [a, b] = toUV(x, y, z), s = [1, 0.9, 0.6][i]; return inDeck(27 + (a - 27) / s, 28 + (b - 28) / s); }) || (glOK && g3.alpha(x - L.x0, y - L.y0) > 40); if (on) h = { k: 'hull' }; }
    }
    if (!h) return null;
    h.isle = true; h.lx = x; h.ly = y - 14 * Math.min(2.5, L.u); hover = h;
    return h;
  }
  function mainP() { const p = PP.F.main(); return p && G.pets.includes(p) && !p.held ? p : null; }
  function down(h, x, y) {
    press = { h, x, y, moved: false, ox: L.x1, oy: L.y1 };
    G.uiDrag = true; PP.refreshInteractive();
    const mv = (ev) => {
      if (!press) return;
      if (!press.moved && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > 6) press.moved = true;
      if (press.moved) { const dx = L.x0, dy = L.y0; S().islePos = { x: (press.ox + ev.clientX - press.x) / G.W, y: (press.oy + ev.clientY - press.y) / safeB() }; layout(); G.ground = groundY(); for (const p of G.pets) if (!p.held) { p.x += L.x0 - dx; p.y += L.y0 - dy; if (p.target != null) p.target += L.x0 - dx; } PP.placeOrb && PP.placeOrb(); document.body.style.cursor = 'grabbing'; }
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
    const p = mainP(), go = (name, fn, ...args) => { if (p) { p.interrupt(true); p.run(name, fn, ...args); } };
    if (h.k === 'ground') { mark = { u: h.u, v: h.v, z: h.z, t: performance.now() }; if (p && !p.sleeping) go('isleGo', A.isleGo, h.u, h.v, h.lv); else if (p) PP.ui.toast(`${p.name}睡着了`); return; }
    if (h.k === 'hull' || h.k === 'room') return;
    if (h.k === 'prop') { go('isleUse', A.isleUse, h.pr); return; }
    if (h.k === 'door' || h.k === 'green' || h.k === 'hdoor') { const w = h.k === 'door' ? 'house' : h.k === 'green' ? 'gh' : 'hold'; if (p) go('isleHouse', A.isleHouse, w); else setInside(w); return; }
    if (h.k === 'exit') { if (p) go('isleHouse', A.isleHouse, false); else setInside(false); return; }
    if (h.k === 'mail') { go('isleMail', A.isleMail); PP.econ.openPanel('mail'); return; }
    if (h.k === 'fish') { if (p && p.fishing) { if (p.fishing.ph === 'bite') p.fishing.helped = true; return; } go('isleFish', A.isleFish); return; }
    if (h.k === 'balloon') { PP.econ.openPanel('trip'); return; }
    const ACT = { fire: 'isleFire', barrel: 'isleDrink', scope: 'isleScope', bed: 'isleBed', chair: 'isleChair', plants: 'isleGarden' };
    if (ACT[h.k]) { go(ACT[h.k], A[ACT[h.k]]); return; }
    if (h.k === 'stairs') { const lv = p && p.isleLv ? 0 : 1; go('isleGo', A.isleGo, ...(inside ? (lv ? [18, 19.5] : [18, 32]) : (lv ? [4.6, 37] : [14, 37])), lv); return; }
    if (h.k === 'plot') {
      const inf = PP.econ.plotInfo(h.i);
      if (inf && inf.stage === 3) { if (p) go('isleHarvest', A.isleHarvest, h.i); else PP.econ.harvest(h.i); return; }
      if (inf) { if (p && !p.sleeping && (E().farm[h.i].water || 0) < 3) go('isleWater', A.isleWater, h.i); else PP.ui.toast(hoverText(h)); return; }
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
  function cmd(a, b, c) { if (a === 'plant' && PP.econ.plant(+b, c)) { PP.ui.toast(`种下了${PP.econ.ITEMS[c].name.replace('种子', '').replace('球茎', '')}`); const p = mainP(); if (p && !p.sleeping) { p.interrupt(true); p.run('isleWater', A.isleWater, +b); } } }
  function setInside(v, to) {
    v = v === true ? 'house' : v || false;
    if (inside === v) return;
    const from = inside; inside = v; hover = null; smoke = []; drops = [];
    if (v && G.save.flags) G.save.flags.isleIn = 1;
    layout(); G.ground = groundY();
    const at = to || (v ? [RDOOR.u, R1 - 4, 0] : from === 'gh' ? [GDOOR.u + 2.4, GDOOR.v, 0] : from === 'hold' ? [HDOOR.u, galV(HDOOR.u) + 1.5, 2] : [DOOR.u, COT.v1 + 3.6, 0]);
    for (const q of G.pets) { q.interrupt(true); q.held = false; q.airborne = false; q.isleSpot = null; q.fishing = null; q.isleLv = at[2] || 0; q._isleY = null; q.inHouse = !!v; q.lane = laneOf(at[0], at[1]); q.x = scrU(at[0], at[1]); q.y = q.floor; q.facing = v ? -1 : 1; }
    roomT = 0; PP.placeOrb && PP.placeOrb();
  }

  // ---------- 主角在岛上过日子 ----------
  let roomT = 0;
  const day = () => { const e = E(); const d = new Date().toDateString(); if (!e.isleDay || e.isleDay.d !== d) e.isleDay = { d, fish: 0, cook: 0 }; return e.isleDay; };
  const goXY = (p, u, v, run) => p.goto(scrU(u, v), run != null ? run : Math.abs(scrU(u, v) - p.x) > 60 * L.u, laneOf(u, v));
  // 走到 (u,v)，在第 lv 层；不在同一层就先走楼梯
  function route(a, from, to) { // 楼层之间走哪几段楼梯
    const prev = { [from]: null }, q = [from];
    while (q.length) { const c = q.shift(); if (c === to) break; for (const r of a.ramps) { const n = r.a === c ? r.b : r.b === c ? r.a : null; if (n != null && !(n in prev)) { prev[n] = [c, r]; q.push(n); } } }
    const out = []; let c = to; while (prev[c]) { out.unshift([prev[c][1], c]); c = prev[c][0]; } return out;
  }
  function* walkTo(p, u, v, run, lv = 0) {
    p.isleSpot = null;
    const a = area(), cur = a.z[p.isleLv] != null ? p.isleLv : 0;
    if (cur !== lv) for (const [r, to] of route(a, cur, lv)) {
      const mid = r.axis === 'u' ? (r.v0 + r.v1) / 2 : (r.u0 + r.u1) / 2, out = (e, s) => (r.axis === 'u' ? [e + s * 1.6, mid] : [mid, e + s * 1.6]), sg = Math.sign(r.lo - r.hi);
      const A0 = out(r.lo, sg), B0 = out(r.hi, -sg), path = to === r.b ? [A0, B0] : [B0, A0];
      for (const q of path) yield goXY(p, q[0], q[1], false);
      p.isleLv = to;
    }
    yield goXY(p, u, v, run);
  }
  A.isleGo = function* (u, v, lv) { const p = this; yield* walkTo(p, u, v, null, lv || 0); p.anim = 'idle'; p.look = [0, 1]; if (Math.random() < 0.3) p.think(U.pick(['heart', 'note', 'sparkle']), 1.2); yield U.rand(2, 4); };
  A.isleOut = function* () { const p = this; p.facing = 1; p.anim = 'idle'; p.eyes = 'happy'; p.jolt(0, -3); yield 0.5; yield* walkTo(p, DOOR.u + 3, COT.v1 + 6); p.eyes = 'open'; };
  A.isleWater = function* (i) {
    const p = this, [pu, pv] = PLOTS[i];
    yield* walkTo(p, pu + 2, pv - 1.8); p.facing = -1; p.anim = 'idle'; p.eyes = 'happy';
    for (let k = 0; k < 8; k++) { PP.fx({ x: scrU(pu + 1 + (k % 3), pv + 1.5), y: scrV(pu + 1, pv + 1, HG + 10), vy: 40, icon: 'drop', life: 0.6, s: Math.max(1, Math.round(L.u / 2)) }); p.jolt(0, k % 2 ? 1 : -1); yield 0.2; }
    if (PP.econ.waterPlot(i)) p.think('heart', 1); yield 0.5;
  };
  A.isleHarvest = function* (i) { const p = this, [pu, pv] = PLOTS[i]; yield* walkTo(p, pu + 2, pv - 1.8); p.facing = -1; p.anim = 'jump'; p.jolt(0, -4); yield 0.4; PP.econ.harvest(i); for (let k = 0; k < 6; k++) PP.fx({ x: scrU(pu + 2, pv + 2) + U.rand(-14, 14), y: scrV(pu + 2, pv + 2, HG + 10), vy: -60, icon: 'sparkle', life: 0.9, s: Math.max(1, Math.round(L.u / 2)) }); p.anim = 'idle'; p.eyes = 'happy'; p.think('heart', 1.5); yield 1.2; };
  A.isleMail = function* () { const p = this; yield* walkTo(p, MAILB.u - 2, MAILB.v - 2.5); p.facing = 1; p.think('excl', 1.5); yield 1.2; if (PP.econ.unread()) { p._forceSay = true; p.say('信箱里有信哦～', 3); p._forceSay = false; } yield 1.5; };
  A.isleDrink = function* () { const p = this; yield* walkTo(p, BARREL.u + 2.5, BARREL.v); p.facing = -1; p.anim = 'eat'; yield 2; p.n.thirst = 100; p.anim = 'idle'; p.eyes = 'happy'; p.think('heart', 1); yield 1; };
  A.isleFire = function* () { const p = this; yield* walkTo(p, FIRE.u - 3.4, FIRE.v + 0.6); p.facing = 1; p.anim = 'sit'; p.think(U.pick(['meat', 'bread', 'corn']), 2.5); yield 3; p.anim = 'eat'; yield 1.5; p.n.hunger = Math.min(100, p.n.hunger + 25); p.n.fun = Math.min(100, p.n.fun + 8); p.anim = 'sit'; p.eyes = night() ? 'sleepy' : 'happy'; yield U.rand(3, 7); p.anim = 'idle'; p.eyes = 'open'; };
  A.isleScope = function* () { const p = this; yield* walkTo(p, SCOPE.u + 1.2, SCOPE.v - 1.8, null, 1); p.facing = -1; p.anim = 'idle'; p.look = [-1, -1]; p.think(night() ? 'moon' : U.pick(['sparkle', 'note', 'excl']), 2.5); yield 3; p.eyes = 'happy'; p.n.fun = Math.min(100, p.n.fun + 10); p._forceSay = true; p.say(night() ? U.pick(['星星好多呀', '看到月亮上的兔子了！']) : U.pick(['远处有一群鸟！', '底下的云像棉花糖', '看到好远好远的地方']), 2.6); p._forceSay = false; yield 2; p.eyes = 'open'; };
  A.isleFish = function* () {
    const p = this;
    yield* walkTo(p, DOCK.u + 0.8, DOCK.v + 0.6, null, 3);
    p.isleSpot = { u: FISH.u, v: FISH.v, z: DZ }; p.target = scrU(FISH.u, FISH.v); p.tLane = null; p.running = false; yield () => p.target == null;
    p.facing = 1; p.anim = 'sit';
    const set = (ph) => { p.fishing = Object.assign(p.fishing || {}, { ph, t0: performance.now() }); };
    set('cast'); yield 1.4; set('wait'); yield U.rand(3, 7); set('nibble'); yield U.rand(0.9, 1.6);
    set('bite'); p.eyes = 'wide'; p.think('excl', 0.8); yield () => p.fishing.helped || performance.now() - p.fishing.t0 > 1500;
    const helped = !!p.fishing.helped, d = day(), got = helped || Math.random() < 0.55;
    p.fishing.got = got; set('reel'); p.anim = 'jump'; p.jolt(0, -3); yield 0.85;
    p.fishing = null; p.anim = 'idle';
    if (got && d.fish < 14 && (helped || Math.random() < 0.6)) { d.fish++; PP.econ.addFish(helped ? 2 : 1, helped ? `你帮${p.name}收竿，钓到一条云鱼` : `${p.name}钓到一条云鱼`); PP.fx({ kind: 'text', text: `+${helped ? 2 : 1} 小鱼干`, x: p.x, y: p.y - 30 * G.S, vy: -30, life: 1.4, style: { size: 11, bg: '#ffd36a' } }); }
    else { p._forceSay = true; p.say(got ? U.pick(['钓到啦！太小了，放回去～', '小云鱼，回家吧']) : U.pick(['跑掉了……', '哎呀，只钓到一团云', '下次一定！']), 2.5); p._forceSay = false; }
    p.eyes = 'happy'; p.n.fun = Math.min(100, p.n.fun + 15); yield 1.6;
    p.isleSpot = null; p.isleLv = 3; p.lane = laneOf(DOCK.u + 0.8, DOCK.v + 0.6); p.target = scrU(DOCK.u + 0.8, DOCK.v + 0.6); yield () => p.target == null;
  };
  A.isleCook = function* () {
    const p = this;
    yield* walkTo(p, R0 + 6.4, 48); p.facing = -1; p.anim = 'idle'; cooking = true; p.think(U.pick(['cake', 'bowl', 'bread']), 3);
    for (let k = 0; k < 8; k++) { if (k % 3 === 0) PP.fx({ x: scrU(R0 + 2, 51), y: scrV(R0 + 2, 51, RH0 + 16), vy: -14, icon: 'sparkle', life: 0.8, s: 1 }); p.jolt(k % 2 ? 1 : -1, 0); yield 0.5; }
    cooking = false; const d = day();
    if (d.cook < 4 && Math.random() < 0.5) { d.cook++; PP.econ.give('biscuit', 1); PP.ui.toast(`${p.name}烤了一块小饼干，放进背包了`); }
    else { p.n.hunger = Math.min(100, p.n.hunger + 30); p._forceSay = true; p.say('做了点好吃的，自己先吃啦～', 2.5); p._forceSay = false; p.anim = 'eat'; yield 1.5; }
    p.anim = 'idle'; p.eyes = 'happy'; yield 1;
  };
  A.isleBed = function* () { const p = this; yield* walkTo(p, 26, 19, null, 1); p.isleSpot = { u: 28, v: 12, z: RH0 + LOFT + 5.5 }; p.target = scrU(28, 12); p.tLane = null; yield () => p.target == null; yield* A.sleep.call(p); p.isleSpot = null; p.lane = laneOf(26, 19); };
  A.isleChair = function* () { const p = this; yield* walkTo(p, 44, 19); p.isleSpot = { u: 39.7, v: 14.3, z: RH0 + 4.9 }; p.target = scrU(39.7, 14.3); p.tLane = null; yield () => p.target == null; p.facing = 1; p.anim = 'sit'; p.eyes = 'sleepy'; p.think(U.pick(['book', 'note', 'heart']), 2.5); yield U.rand(5, 9); p.eyes = 'open'; p.isleSpot = null; p.lane = laneOf(44, 19); p.anim = 'idle'; };
  A.isleWindow = function* () { const p = this, up = Math.random() < 0.5; if (up) yield* walkTo(p, U.pick([18, 28]), 19.6, null, 1); else yield* walkTo(p, 38.6, R0 + 3, null, 0); p.facing = -1; p.anim = 'sit'; p.look = [0, -1]; const fx = wfx(); p.think(fx.rain ? 'drop' : fx.snow ? 'sparkle' : night() ? 'moon' : 'note', 2.5); yield U.rand(4, 8); p.anim = 'idle'; };
  A.isleGarden = function* () { const p = this, sp = U.pick([[22, 37], [40, 37], [31, 44], [14, GV0 + 7], [36, GV0 + 7], [R0 + 7, 40]]); yield* walkTo(p, sp[0], sp[1]); p.facing = sp[0] < 31 ? 1 : -1; p.anim = 'idle'; p.eyes = 'happy'; for (let k = 0; k < 7; k++) { PP.fx({ x: p.x + p.facing * 12 * G.S + U.rand(-6, 6), y: p.y - 16 * G.S, vy: 26, icon: 'drop', life: 0.6, s: 1 }); p.jolt(0, k % 2 ? 1 : -1); yield 0.3; } PP.fx({ x: p.x + p.facing * 12 * G.S, y: p.y - 24 * G.S, vy: -30, icon: 'sparkle', life: 1, s: 1 }); p.think('flower', 1.6); p.n.fun = Math.min(100, p.n.fun + 10); const d = day(); if (!d.gh && Math.random() < 0.35) { d.gh = 1; PP.econ.give('tulip', 1); PP.ui.toast(`${p.name}在花房里摘了一朵郁金香，放进背包了`); } yield 1.4; p.eyes = 'open'; };
  A.isleSit = function* (sl) {
    const p = this; yield* walkTo(p, sl.u + 1.5, sl.v + 1.5); p.facing = Math.random() < 0.5 ? 1 : -1;
    if (sl.id === 'hay') { p.anim = 'lie'; yield U.rand(5, 10); }
    else if (sl.id === 'swing') { p.isleSpot = { u: sl.u, v: sl.v, z: HG + 3.6 }; p.target = scrU(sl.u, sl.v); p.tLane = null; yield () => p.target == null; p.anim = 'sit'; const x0 = p.x; for (let t = 0; t < 8; t += 0.1) { p.x = x0 + Math.sin(t * 2.4) * 3 * L.u; p.facing = Math.cos(t * 2.4) > 0 ? 1 : -1; yield 0.1; } p.x = x0; p.isleSpot = null; p.lane = laneOf(sl.u + 1.5, sl.v + 1.5); }
    else { p.anim = 'sit'; p.eyes = Math.random() < 0.5 ? 'happy' : 'open'; yield U.rand(5, 9); }
    p.anim = 'idle';
  };
  A.isleHouse = function* (go) {
    const p = this;
    if (go === true) go = 'house';
    if (go === 'house') { yield* walkTo(p, DOOR.u, COT.v1 + 2.4); p.facing = -1; yield 0.25; setInside('house'); }
    else if (go === 'gh') { yield* walkTo(p, GDOOR.u + 2, GDOOR.v); p.facing = -1; yield 0.25; setInside('gh'); }
    else if (go === 'hold') { yield* walkTo(p, HDOOR.u, galV(HDOOR.u) + 1.2, null, 2); p.facing = -1; yield 0.25; setInside('hold'); }
    else { yield* walkTo(p, RDOOR.u, R1 - 3); p.facing = 1; yield 0.25; setInside(false); }
  };
  A.isleFurn = function* (k) {
    const p = this, id = (E().room || {})[k], SP = { rug: [33, 30], c1: [23, 41.5], c2: [50, 28], c3: id === 'piano' ? [48, 47.5] : [50, 46], wall: [14, 33] }[k]; if (!SP || !id) return;
    yield* walkTo(p, SP[0], SP[1]); p.anim = 'idle'; p.facing = -1;
    if (k === 'rug') { p.anim = Math.random() < 0.5 ? 'knead' : 'roll'; yield U.rand(3, 6); }
    else if (id === 'shelf') { p.anim = 'sit'; p.think('book', 3); yield 4; }
    else if (id === 'table') { p.anim = 'sit'; p.think('cake', 2.5); yield 3; }
    else if (id === 'piano') { p.anim = 'sit'; for (let i = 0; i < 10; i++) { PP.fx({ x: p.x + U.rand(-10, 10), y: p.y - 24 * G.S, vy: -24, icon: 'note', life: 1, s: 1 }); p.jolt(0, i % 2 ? -1 : 1); yield 0.4; } }
    else if (id === 'rocker') { p.anim = 'sit'; p.eyes = 'sleepy'; for (let t = 0; t < 6; t += 0.2) { p.jolt(Math.sin(t * 3), 0); yield 0.2; } }
    else { p.look = [0, -1]; yield 2; }
    p.anim = 'idle'; p.eyes = 'open';
  };
  const baseEnter = A.enterDoor, baseEmerge = A.emerge;
  A.enterDoor = function* (done) { if (!G.isle) { yield* baseEnter.call(this, done); return; } const p = this; if (!inside) { yield* walkTo(p, DOOR.u, COT.v1 + 2.4); p.facing = -1; yield 0.2; } p.inDoor = true; done && done(); };
  A.emerge = function* () { if (!G.isle) { yield* baseEmerge.call(this); return; } const p = this; p.inDoor = false; p.isleLv = 0; p.x = doorX(); p.lane = inside ? laneOf(RDOOR.u, R1 - 3) : laneOf(DOOR.u, COT.v1 + 2.4); p.y = p.floor; if (!inside) yield* A.isleOut.call(p); };
  const baseDecide = PP.Pet.prototype.decide;
  PP.Pet.prototype.decide = function () {
    if (G.isle && this.isleSpot && !this.sleeping && !this.fishing) { this.isleSpot = null; this._isleY = null; }
    if (G.isle && G.pets.includes(this) && !this.held && !(G.save.settings.quiet) && Math.random() < 0.6) {
      const e = E(), p = this, PR = PROPS[inside || 'deck'] || [], useAny = (ch) => (PR.length && Math.random() < ch ? (p.run('isleUse', A.isleUse, U.pick(PR.filter((q) => q.do !== 'ladder'))), true) : false), fx = wfx(), wet = fx.rain > 0.3 || fx.snow > 0.5 || fx.storm, R = (n, f, ...a) => { p.run(n, f, ...a); return true; };
      if (inside === 'house') {
        roomT++; const rm = e.room || {};
        if (p.n.energy < 55 && Math.random() < 0.6) return R('isleBed', A.isleBed);
        if (roomT > (wet ? 9 : 4) && Math.random() < (wet ? 0.12 : 0.35)) return R('isleHouse', A.isleHouse, false);
        if (Math.random() < (wet ? 0.3 : 0.18)) return R('isleWindow', A.isleWindow);
        if (useAny(0.4)) return true;
        if (Math.random() < 0.2) return R('isleChair', A.isleChair);
        const ks = ['rug', 'c1', 'c2', 'c3'].filter((k) => rm[k]); if (ks.length && Math.random() < 0.5) return R('isleFurn', A.isleFurn, U.pick(ks));
        if (Math.random() < 0.3) return R('isleGo', A.isleGo, U.rand(9, 31), U.rand(12, 20), 1);
      } else if (inside === 'gh') {
        roomT++;
        if (roomT > 3 && Math.random() < 0.4) return R('isleHouse', A.isleHouse, false);
        if (useAny(0.45)) return true;
        return R('isleGarden', A.isleGarden);
      } else if (inside === 'hold') {
        roomT++;
        if (roomT > 3 && Math.random() < 0.4) return R('isleHouse', A.isleHouse, false);
        if (useAny(0.8)) return true;
      } else {
        if (wet && Math.random() < 0.45) return R('isleHouse', A.isleHouse, Math.random() < 0.75 ? 'house' : 'gh');
        const grow = PLOTS.map((_, i) => i).filter((i) => { const inf = PP.econ.plotInfo(i); return inf && inf.stage < 3 && (e.farm[i].water || 0) < 3; });
        if (grow.length && !fx.rain && Math.random() < 0.3) return R('isleWater', A.isleWater, U.pick(grow));
        if (PP.econ.unread() && Math.random() < 0.25) return R('isleMail', A.isleMail);
        if (p.n.thirst < 60 && Math.random() < 0.5) return R('isleDrink', A.isleDrink);
        if ((p.n.hunger < 60 || night()) && !fx.rain && Math.random() < 0.3) return R('isleFire', A.isleFire);
        const sl = (e.isleDeco || []).map((id, i) => ({ id, i, u: SLOTS[i] && SLOTS[i][0], v: SLOTS[i] && SLOTS[i][1] })).filter((s) => ['bench', 'swing', 'hay'].includes(s.id));
        if (sl.length && Math.random() < 0.25) return R('isleSit', A.isleSit, U.pick(sl));
        if (Math.random() < 0.2) return R('isleFish', A.isleFish);
        if (Math.random() < 0.1) return R('isleScope', A.isleScope);
        if (useAny(0.3)) return true;
        if (Math.random() < 0.08) return R('isleHouse', A.isleHouse, 'hold');
        if (Math.random() < 0.1) return R('isleHouse', A.isleHouse, 'gh');
        if (((night() || p.n.energy < 40) && Math.random() < 0.5) || Math.random() < 0.08) return R('isleHouse', A.isleHouse, 'house');
        if (Math.random() < 0.45) { let u, v, k = 0; const a = AREAS.deck; do { u = U.rand(8, 52); v = U.rand(11, 45); } while (a.blocked(u, v, 0) && ++k < 30); if (k < 30) return R('isleGo', A.isleGo, u, v, 0); }
      }
    }
    return baseDecide.call(this);
  };
  setInterval(() => { try { if (!G.save || !PP.econ) return; if (wfx().rain > 0.3) (E().farm || []).forEach((pl) => { if (pl && (pl.water || 0) < 3) pl.water = (pl.water || 0) + 1; }); } catch (err) {} }, 10 * 60000);

  function dirty() { dirtyK++; }
  setInterval(() => { if (PP.started && G.save) sync(); }, 1500);
  const doorX = () => { if (!L) layout(); return inside ? scrU(RDOOR.u, R1 - 3) : scrU(DOOR.u, COT.v1 + 2.4); };
  PP.isle = { props: () => PROPS,  doorX, floorY, sync, layout, groundY, zone, renderBack, renderFront, hot, click, down, cmd, dirty, inside: () => inside, setInside, rect: () => L, scale: () => (L ? L.u : zoomOf()) * 0.5, zoom: () => (L ? L.u : zoomOf()), setSize, setZoom, resetPos, safeB, SLOT_NAME, seedPicker, pressing: () => !!press, uvOf };
})();
