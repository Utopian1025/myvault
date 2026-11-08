// 你自己的小天地：认养的动物住在这里
// 浮空岛（云海上漂着的草地小岛，补丁摞补丁的风车小屋、热气球）
// 魔法学院（尖塔城堡、飘着的蜡烛、药草温室、冒泡的大锅、猫头鹰塔）
// 地底森林（大地深处：发光的巨蘑菇、垂下来的树根、一道望不见底的大裂谷和吊桥、篝火上咕嘟的蘑菇汤）
(function () {
  const PP = (window.PP = window.PP || {});
  const G = PP.G;
  const BH = () => PP.BIOME_H;

  // 住在某个小天地里的认养动物（按物种，不重复，按认养先后）
  PP.ownSpecies = function (scene) {
    const out = [];
    for (const p of G.all || []) if (!p.d.wild && p.d.ownHome === scene && !out.includes(p.d.species)) out.push(p.d.species);
    return out;
  };

  // ---------- 小房子：给认养的动物住（每种动物一间，颜色、屋顶不一样） ----------
  const ROOF = ['#d9624a', '#5a8ad8', '#e0a83a', '#8a5ac8', '#4aa86a', '#e07aa0', '#3a8a9a', '#c8783a'];
  function cottage(A, h, i, style) {
    const w = Math.round(h * 1.15), s = A.spr(w, h), roof = ROOF[i % ROOF.length];
    const wallC = style === 'stone' ? ['#b8b0c0', '#a49cb0'] : style === 'shroom' ? ['#f0e6d0', '#e0d0b4'] : ['#f2e4c8', '#e2d0ac'];
    const top = Math.round(h * 0.45);
    if (style === 'shroom') {
      // 蘑菇屋：圆圆的伞盖当屋顶
      s.ell(w / 2 + 1, top, w / 2, top, (nx, ny) => (ny > 0.55 ? null : ny < -0.5 ? A.mix(roof, '#ffffff', 0.25) : roof));
      for (let k = 0; k < 4; k++) s.ell(4 + k * (w - 6) / 3, top - 2 - (k % 2) * 2, 1.2, 1, '#fff6e8');
    } else {
      for (let y = 0; y <= top; y++) { const half = Math.round((y / top) * (w / 2 + 1)); s.hl(Math.round(w / 2 + 1 - half), y + 1, half * 2, y % 3 === 0 ? A.mix(roof, '#000000', 0.18) : roof); }
    }
    s.rect(3, top + 1, w - 4, h - top, wallC[0]); s.rect(3, h - 1, w - 4, 2, wallC[1]);
    for (let y = top + 3; y < h; y += 3) s.hl(3, y, w - 4, wallC[1]);
    // 圆门 + 小窗
    const dx = Math.round(w / 2 - 1);
    s.ell(dx + 1.5, h - 2, 2.4, 3.4, (nx, ny) => (ny > 0.6 ? null : '#6a4228')); s.rect(dx, h - 3, 3, 3, '#6a4228'); s.set(dx + 2, h - 3, '#ffcf5a');
    s.rect(w - 6, top + 3, 3, 3, '#ffe9a0'); s.set(w - 5, top + 4, '#c89a3a');
    if (style !== 'shroom') { s.rect(Math.round(w * 0.7), 1, 2, Math.round(top * 0.6), '#8a6a5a'); }
    return { s: s.outline('#3a2630'), door: { x: dx + 2 } };
  }
  function placeHomes(lay, slots, style) {
    const A = PP.ART, { home, SZ } = BH();
    PP.ownSpecies(lay.scene).forEach((sp, i) => {
      const sl = slots[i % slots.length], h = SZ(lay, 15 + (i % 3) * 2);
      const c = cottage(A, h, i, style);
      home(lay, sp, c.s, Math.round(lay.cols * sl[0]) + (i >= slots.length ? 10 : 0), lay.base + sl[1], c.door);
    });
  }
  // 云（一团团的，底下暗一点）
  function cloud(P, cx, cy, w, h, top, bot) {
    const A = PP.ART;
    for (let k = 0; k < 5; k++) { const x = cx + (k - 2) * w * 0.22, r = h * (0.55 + (k % 2) * 0.25 + (k === 2 ? 0.25 : 0)); P.ell(x, cy, w * 0.2 + r * 0.4, r, (nx, ny) => (ny > 0.35 ? bot : ny < -0.4 ? '#ffffff' : top)); }
  }

  // ---------- 浮空岛 ----------
  function skyisle(P, lay, R) {
    const A = PP.ART, { put, spot, C, SZ, ground, GROUND, PATH, BLADES } = BH(), { cols, rows, gy } = lay;
    lay.noScatter = true;
    const s = lay.season, w = s === 'winter';
    // 远处的云海和几座小浮岛
    for (let i = 0; i < 7; i++) cloud(P, C(lay, 0.07 + i * 0.15), gy - 6 - (i % 3) * 3, SZ(lay, 40), SZ(lay, 7), '#fbf1ff', '#e4d4f2');
    for (const [f, ww, hh] of [[0.22, 22, 6], [0.58, 14, 4], [0.86, 26, 7]]) {
      const cx = C(lay, f), cy = Math.round(gy * 0.38 + (f * 13) % 6), W2 = SZ(lay, ww), H2 = SZ(lay, hh);
      P.ell(cx, cy, W2 / 2, H2 * 0.45, (nx, ny) => (ny < -0.3 ? (w ? '#ffffff' : '#8fd06a') : ny < 0.1 ? '#6a9a5a' : '#8a7060'));
      for (let k = 0; k < H2 * 1.4; k++) P.set(cx - W2 * 0.12 + ((k * 7) % 5), cy + H2 * 0.3 + k, '#7a6050');
      if (f !== 0.58) { P.rect(cx - 2, cy - H2 * 0.6 - 3, 4, 4, '#f2e4c8'); P.rect(cx - 3, cy - H2 * 0.6 - 5, 6, 2, '#d9624a'); }
    }
    ground(P, lay, GROUND[s], { path: PATH[s], blades: BLADES[s] });
    // 岛的两头：地面变成悬空的边，底下是垂下来的土和树根，再下面是云
    for (let x = 0; x < cols; x++) {
      const e = Math.min(x, cols - 1 - x), edge = C(lay, 0.06);
      if (e < edge) {
        const cut = gy + Math.round(((edge - e) / edge) * (rows - gy) * 1.3);
        for (let y = cut; y < rows; y++) P.set(x, y, 0);
        for (let y = cut; y < Math.min(rows, cut + 3); y++) P.set(x, y, y === cut ? '#7a5a40' : '#5a4030');
      }
    }
    for (let x = 0; x < cols; x++) { const e = Math.min(x, cols - 1 - x); if (e < C(lay, 0.06) && A.hash(x, 3) < 0.25) { const len = 3 + Math.floor(A.hash(x, 4) * 8); const top = gy + Math.round(((C(lay, 0.06) - e) / C(lay, 0.06)) * (rows - gy) * 1.3); for (let k = 0; k < len; k++) P.set(x, top + 2 + k, k > len - 2 ? '#7cc35a' : '#6a4a32'); } }
    for (let i = 0; i < 6; i++) cloud(P, i < 3 ? C(lay, 0.01 + i * 0.03) : C(lay, 0.93 + (i - 3) * 0.03), rows - 3 - (i % 2) * 2, SZ(lay, 16), SZ(lay, 4), '#ffffff', '#e8dcf4');
    // 补丁摞补丁的风车小屋（主角的家）
    const hh = SZ(lay, 44), hw = Math.round(hh * 0.62), hs = A.spr(hw + 16, hh + 6);
    const rooms = [[2, hh - 14, hw - 2, 14, '#f2e4c8', '#c8784a'], [6, hh - 25, hw - 12, 12, '#d8c8e8', '#5a8ad8'], [10, hh - 34, hw - 18, 10, '#f6d8b0', '#4aa86a']];
    for (const [x, y, ww, h2, wall, roof] of rooms) {
      hs.rect(x, y, ww, h2, wall); for (let yy = y + 2; yy < y + h2; yy += 3) hs.hl(x, yy, ww, A.mix(wall, '#000000', 0.08));
      hs.rect(x - 1, y - 2, ww + 2, 2, roof); hs.hl(x - 1, y - 2, ww + 2, A.mix(roof, '#ffffff', 0.3));
      hs.ell(x + ww * 0.35, y + h2 * 0.5, 1.6, 1.6, '#ffe9a0'); hs.set(x + ww * 0.35, y + h2 * 0.5, '#c8a050');
      hs.rect(x + ww * 0.7, y + h2 * 0.35, 3, 3, '#a8d8f0');
    }
    hs.ell(Math.round(hw / 2), hh - 3, 2.6, 3.6, (nx, ny) => (ny > 0.6 ? null : '#7a4a2a')); hs.rect(Math.round(hw / 2) - 2, hh - 3, 5, 3, '#7a4a2a');
    // 烟囱 + 风车
    hs.rect(hw - 9, hh - 42, 3, 9, '#8a6a5a'); hs.rect(hw - 10, hh - 43, 5, 2, '#5a4040');
    const mx = 14, my = hh - 38;
    for (let a = 0; a < 4; a++) { const ang = a * Math.PI / 2 + 0.4; for (let k = 2; k < 10; k++) { hs.set(mx + Math.cos(ang) * k, my + Math.sin(ang) * k, k > 3 ? '#f6f0e4' : '#8a6a4a'); hs.set(mx + Math.cos(ang + 0.18) * k, my + Math.sin(ang + 0.18) * k, k > 4 ? '#e4d8c4' : null); } }
    hs.ell(mx, my, 1.4, 1.4, '#6a4a3a');
    // 小旗子
    for (let k = 0; k < 6; k++) hs.set(hw + 1 + k, hh - 30 + Math.round(k * 0.5), ['#e05a5a', '#f2c84a', '#5ab0e0'][k % 3]);
    hs.outline('#3a2630');
    put(lay, hs, C(lay, 0.47), lay.base + 1, { light: [Math.round(hw * 0.35) - 1, hh - 9, 4, 3] });
    lay.smoke = { c: C(lay, 0.47) - Math.round((hw + 16) / 2) + hw - 8, r: lay.base - hh - 1 };
    lay.hearth = lay.smoke;
    // 拴在地上的热气球
    const bh = SZ(lay, 30), bs = A.spr(Math.round(bh * 0.7), bh);
    const bw2 = bs.w;
    bs.ell(bw2 / 2 + 1, bh * 0.36, bw2 / 2 - 1, bh * 0.36, (nx, ny) => { const band = Math.floor((nx + 1) * 3) % 2; return ny < -0.6 ? '#ffe0a0' : band ? '#e86a5a' : '#f6c85a'; });
    for (let y = Math.round(bh * 0.7); y < bh - 5; y++) { bs.set(Math.round(bw2 * 0.32), y, '#6a4a3a'); bs.set(Math.round(bw2 * 0.72), y, '#6a4a3a'); }
    bs.rect(Math.round(bw2 * 0.3), bh - 6, Math.round(bw2 * 0.45), 5, '#a8784a'); bs.hl(Math.round(bw2 * 0.3), bh - 6, Math.round(bw2 * 0.45), '#c8985a');
    bs.outline('#3a2630'); put(lay, bs, C(lay, 0.8), lay.base - 2);
    // 野餐垫 + 食盆（吃饭的地方）、小井（喝水）、悬崖边的长椅（晒太阳看云）
    const pic = A.spr(24, 5); for (let y = 0; y < 4; y++) for (let x = 0; x < 24; x++) pic.set(x + 1, y + 1, (Math.floor(x / 3) + y) % 2 ? '#f6f0e4' : '#e86a7a'); pic.ell(8, 1, 2.4, 1.2, '#c8a07a'); pic.ell(16, 1, 2.4, 1.2, '#7ab0d8'); pic.outline('#5a3a3a');
    put(lay, pic, C(lay, 0.3), lay.base + 8); spot(lay, 'feeder', C(lay, 0.3), lay.base + 8);
    const well = A.spr(12, 12); well.rect(1, 6, 12, 6, '#a8a0b0'); for (let x = 1; x < 13; x += 3) well.vl(x, 6, 6, '#8a8296'); well.rect(2, 6, 10, 1, '#4a90c8'); well.rect(1, 1, 1, 5, '#7a5a40'); well.rect(12, 1, 1, 5, '#7a5a40'); well.rect(0, 0, 14, 2, '#c8784a'); well.outline('#3a2630');
    put(lay, well, C(lay, 0.63), lay.base + 3); spot(lay, 'fountain', C(lay, 0.63), lay.base + 4);
    put(lay, A.bench(w), C(lay, 0.93), lay.base + 2); spot(lay, 'sunspot', C(lay, 0.93), lay.base + 3); spot(lay, 'lookout', C(lay, 0.085), lay.base + 3);
    spot(lay, 'lawn', C(lay, 0.55), lay.base + 9);
    // 花丛和小树
    for (const f of [0.12, 0.38, 0.72]) put(lay, A.broadleaf(SZ(lay, 30), s, R, f === 0.38 ? 'apple' : 'oak'), C(lay, f), lay.base, { lantern: true });
    for (let i = 0; i < 14; i++) put(lay, A.flower(s, R), C(lay, 0.1 + R() * 0.8), lay.base + 4 + Math.floor(R() * Math.max(2, rows - lay.base - 6)));
    placeHomes(lay, [[0.2, 1], [0.27, 2], [0.36, 1], [0.66, 1], [0.72, 2], [0.86, 1], [0.15, 3], [0.9, 3]], 'wood');
  }

  // ---------- 魔法学院 ----------
  function academy(P, lay, R) {
    const A = PP.ART, { put, spot, C, SZ, ground, GROUND, PATH, BLADES, mountains } = BH(), { cols, rows, gy } = lay;
    lay.noScatter = true;
    const s = lay.season, w = s === 'winter';
    mountains(P, lay, [[0.55, w ? '#c8cce0' : '#8a9ab8', w, 0.6]], 210);
    // 城堡：一排高低不一的尖塔（越远越淡），亮着暖黄的窗
    const towers = [[0.08, 0.5, 9], [0.16, 0.78, 12], [0.25, 0.6, 10], [0.36, 0.95, 14], [0.44, 0.7, 11], [0.52, 1.0, 16], [0.6, 0.72, 10], [0.68, 0.88, 13], [0.78, 0.6, 9], [0.88, 0.8, 12], [0.95, 0.55, 8]];
    const wall = w ? '#a8a4b8' : '#9a96a8', wallD = '#7a7690', roof = '#4a4a78';
    const base0 = gy - 2, hall = Math.round(gy * 0.32);
    P.rect(C(lay, 0.05), base0 - hall, C(lay, 0.92), hall, wall);
    for (let x = C(lay, 0.05); x < C(lay, 0.97); x += 6) { P.rect(x, base0 - hall - 2, 3, 2, wall); if (A.hash(x, 1) < 0.5) P.rect(x + 1, base0 - hall + 4, 2, 3, A.hash(x, 2) < 0.7 ? '#ffd877' : '#3a3a58'); }
    for (const [f, hf, tw] of towers) {
      const cx = C(lay, f), th = Math.round(gy * 0.62 * hf), w2 = SZ(lay, tw), top = base0 - th;
      P.rect(cx - w2 / 2, top, w2, th, wall); P.vl(cx + w2 / 2 - 1, top, th, wallD);
      for (let y = top; y < base0; y += 3) for (let x = cx - w2 / 2; x < cx + w2 / 2; x += 4) P.set(x + ((y / 3) % 2) * 2, y, wallD);
      const rh = Math.round(w2 * 1.3);
      for (let k = 0; k < rh; k++) { const half = Math.round((k / rh) * (w2 / 2 + 1)); P.hl(cx - half, top - rh + k, half * 2 + 1, k < 2 ? '#6a6aa8' : roof); }
      if (w) for (let k = Math.round(rh * 0.5); k < rh; k++) P.set(cx - Math.round((k / rh) * (w2 / 2)), top - rh + k, '#ffffff');
      P.vl(cx, top - rh - 4, 4, '#5a4a3a'); for (let k = 0; k < 3; k++) P.set(cx + 1 + k, top - rh - 4 + Math.round(k * 0.4), ['#c84a4a', '#e8c84a', '#4a8ac8'][Math.floor(f * 10) % 3]);
      for (let y = top + 4; y < base0 - 4; y += 7) { P.rect(cx - 1, y, 2, 3, '#ffd877'); lay.lights.push({ x: cx - 1, y, w: 2, h: 3, r: 3, col: '#ffd877', win: true }); }
    }
    ground(P, lay, GROUND[s], { path: ['#b8b0c4', '#a49cb0', '#8a8296'], blades: BLADES[s] });
    // 石板路
    if (lay.path) for (let x = 0; x < cols; x += 4) P.vl(x, lay.path - 2, 4, '#9890a6');
    // 飘着的蜡烛（白天也亮着）
    for (let i = 0; i < 22; i++) { const x = Math.round(C(lay, 0.04) + R() * cols * 0.92), y = Math.round(gy * (0.12 + R() * 0.38)); P.rect(x, y, 1, 3, '#f6f0e4'); P.set(x, y - 1, '#ffcf5a'); lay.lights.push({ x, y: y - 1, w: 1, h: 1, r: 3, col: '#ffcf5a', glow: true, always: true }); }
    lay.dark = false;
    // 药草温室（玻璃屋，里面的植物在发光）
    const gh = SZ(lay, 22), gs = A.spr(Math.round(gh * 1.5), gh);
    for (let y = 0; y < gh; y++) { const half = y < gh * 0.4 ? Math.round((y / (gh * 0.4)) * gs.w / 2) : Math.round(gs.w / 2) - 1; for (let x = Math.round(gs.w / 2 - half); x < gs.w / 2 + half; x++) gs.set(x + 1, y + 1, (x + y) % 5 === 0 ? '#5a6a7a' : y > gh * 0.65 ? '#7ac87a' : '#c8ecf0'); }
    for (let k = 0; k < 6; k++) gs.ell(6 + k * (gs.w - 10) / 5, gh - 4, 1.6, 2.4, k % 2 ? '#a8f0a0' : '#f0a8e0');
    gs.outline('#3a4a5a'); put(lay, gs, C(lay, 0.18), lay.base + 2); spot(lay, 'garden', C(lay, 0.18), lay.base + 4);
    // 冒绿泡泡的大锅（吃饭的地方）
    const cs = A.spr(12, 10); cs.ell(7, 6, 6, 4, (nx, ny) => (ny < -0.45 ? '#7af06a' : '#3a3440')); cs.rect(2, 9, 2, 2, '#3a3440'); cs.rect(10, 9, 2, 2, '#3a3440'); cs.set(5, 2, '#b8ff9a'); cs.set(8, 1, '#b8ff9a'); cs.outline('#1a1620');
    put(lay, cs, C(lay, 0.33), lay.base + 6); spot(lay, 'feeder', C(lay, 0.33), lay.base + 7); lay.cauldron = { c: C(lay, 0.33), r: lay.base - 4 };
    lay.lights.push({ x: C(lay, 0.33) - 3, y: lay.base - 2, w: 6, h: 2, r: 6, col: '#7af06a', glow: true, always: true });
    // 喷泉（中间有颗发光的水晶）
    const fs = A.spr(22, 14); fs.ell(12, 11, 10, 3.4, (nx, ny) => (nx * nx + ny * ny > 0.6 ? '#b8b0c4' : '#5aa8e0')); fs.rect(10, 3, 4, 8, '#b8b0c4'); fs.ell(12, 2, 2, 2.6, '#a8f0ff'); fs.set(11, 1, '#ffffff'); fs.outline('#4a4660');
    put(lay, fs, C(lay, 0.57), lay.base + 4); spot(lay, 'fountain', C(lay, 0.57), lay.base + 5);
    lay.lights.push({ x: C(lay, 0.57) - 2, y: lay.base - 12, w: 3, h: 3, r: 7, col: '#a8f0ff', glow: true });
    // 扫帚架、书堆、猫头鹰站的架子
    const br = A.spr(14, 14); br.rect(1, 13, 14, 2, '#6a4a3a'); for (let k = 0; k < 3; k++) { br.vl(3 + k * 4, 2, 11, '#8a6a4a'); br.rect(2 + k * 4, 0, 3, 3, '#d8b05a'); } br.outline('#3a2630'); put(lay, br, C(lay, 0.74), lay.base + 2);
    const bk = A.spr(10, 8); const BC = ['#c84a4a', '#4a7ac8', '#e8c84a', '#6aa84a', '#8a5ac8']; for (let k = 0; k < 5; k++) bk.rect(1 + (k % 2), 7 - k * 1.5, 9, 1.5, BC[k]); bk.outline('#2a2030'); put(lay, bk, C(lay, 0.41), lay.base + 9);
    spot(lay, 'lawn', C(lay, 0.47), lay.base + 9); spot(lay, 'sunspot', C(lay, 0.84), lay.base + 3); spot(lay, 'lookout', C(lay, 0.74), lay.base + 3);
    for (const f of [0.03, 0.97]) put(lay, A.pine(SZ(lay, 40), s, R, w), C(lay, f), lay.base);
    placeHomes(lay, [[0.25, 1], [0.48, 1], [0.66, 1], [0.8, 1], [0.9, 2], [0.12, 2], [0.38, 2], [0.6, 3]], 'stone');
  }

  // ---------- 地底森林 ----------
  function undergrove(P, lay, R) {
    const A = PP.ART, { put, spot, C, SZ, ground } = BH(), { cols, rows, gy } = lay;
    lay.noScatter = true; lay.cave = true;
    // 岩壁 + 中间一道望不见底的大裂谷（越深越蓝越暗，有雾）
    const ch0 = C(lay, 0.45), ch1 = C(lay, 0.62);
    for (let y = 0; y < gy; y++) for (let x = 0; x < cols; x++) {
      const n = A.noise(x / 7, y / 5, 301);
      let c = n < 0.35 ? '#2a2236' : n < 0.7 ? '#33293e' : '#3e3248';
      const inC = x > ch0 + Math.sin(y / 5) * 3 && x < ch1 + Math.sin(y / 6 + 1) * 3;
      if (inC) {
        // 越往下越深越暗，几层淡淡的雾
        const k = y / gy; c = A.mix('#3e5e86', '#0c1426', Math.min(1, k * 1.1));
        const mist = Math.sin(y / 3.2 + x / 17) > 0.86 || (y % 11 < 2 && A.dith(x, y, 0.35));
        if (mist) c = A.mix(c, '#9ac0e0', 0.22);
        const e0 = ch0 + Math.sin(y / 5) * 3, e1 = ch1 + Math.sin(y / 6 + 1) * 3;
        if (x < e0 + 1.5 || x > e1 - 1.5) c = '#1e1828';
      }
      P.set(x, y, c);
    }
    // 裂谷里一层层的小崖台、远处的小光点
    for (let k = 0; k < 5; k++) { const y = Math.round(gy * (0.25 + k * 0.15)), x0 = k % 2 ? ch0 + 2 : ch1 - SZ(lay, 14) - 2; P.rect(x0, y, SZ(lay, 14), 2, '#4a3e58'); P.hl(x0, y, SZ(lay, 14), '#6a8a5a'); lay.lights.push({ x: x0 + 4, y: y - 1, w: 1, h: 1, r: 2, col: '#ffc86a', glow: true }); }
    // 垂下来的树根和发光的晶簇
    for (let x = 3; x < cols; x += 3 + Math.floor(R() * 7)) { const len = 3 + Math.floor(R() * Math.min(18, gy * 0.35)); for (let k = 0; k < len; k++) P.set(x + Math.round(Math.sin(k / 3) * 0.6), k, k === len - 1 ? '#8a7a5a' : '#5a4a3a'); }
    for (let i = 0; i < 7; i++) { const x = C(lay, 0.05 + R() * 0.9), y = Math.floor(R() * 4); for (let k = 0; k < 4; k++) P.rect(x + k - 1, y, 1, 4 - Math.abs(k - 1.5) * 1.5, k % 2 ? '#9ae8ff' : '#c8a8ff'); lay.lights.push({ x, y: y + 1, w: 2, h: 2, r: 4, col: '#9ae8ff', glow: true }); }
    ground(P, lay, ['#3e5a3a', '#344e32', '#4a6a44', '#7af0c8'], {});
    // 裂谷边的吊桥（画在地面后面一点）
    const by = gy - 1;
    for (let x = ch0 - 2; x < ch1 + 2; x++) { P.set(x, by, (x % 3) ? '#a8784a' : '#7a5232'); P.set(x, by - 4 + Math.round(Math.pow((x - (ch0 + ch1) / 2) / ((ch1 - ch0) / 2), 2) * 2), '#c8a87a'); }
    // 发光的巨蘑菇（当树）
    const shroom = (h, cap, spotC) => {
      const s = A.spr(Math.round(h * 0.9), h), cw = s.w;
      s.rect(Math.round(cw / 2) - 1, Math.round(h * 0.35), 3, h - Math.round(h * 0.35), '#e8dcc8'); s.vl(Math.round(cw / 2) + 1, Math.round(h * 0.35), h - Math.round(h * 0.35), '#c8b8a4');
      s.ell(cw / 2 + 1, h * 0.32, cw / 2 - 1, h * 0.28, (nx, ny) => (ny > 0.55 ? null : ny > 0.3 ? A.mix(cap, '#000000', 0.25) : ny < -0.5 ? A.mix(cap, '#ffffff', 0.3) : cap));
      for (let k = 0; k < 6; k++) s.ell(4 + (k * 5.3) % (cw - 6), h * 0.18 + (k % 3) * 2, 1.1, 0.9, spotC);
      return s.outline('#1e1828');
    };
    for (const [f, hh, cap, sc] of [[0.06, 46, '#4a7ac8', '#a8f0ff'], [0.2, 34, '#8a5ac8', '#ffd0ff'], [0.33, 52, '#3aa88a', '#c8ffe8'], [0.74, 44, '#c85a8a', '#ffe0f0'], [0.9, 38, '#4a7ac8', '#a8f0ff']]) {
      const hh2 = SZ(lay, hh), sh = shroom(hh2, cap, sc); put(lay, sh, C(lay, f), lay.base, { lantern: true });
      lay.lights.push({ x: C(lay, f) - 4, y: lay.base - Math.round(hh2 * 0.62), w: 8, h: 3, r: 9, col: sc, glow: true });
    }
    // 古老的石柱遗迹
    for (const f of [0.27, 0.83]) { const ph = SZ(lay, 24), ps = A.spr(8, ph); ps.rect(1, 2, 8, ph, '#7a7088'); for (let y = 4; y < ph; y += 4) ps.hl(1, y, 8, '#6a6078'); ps.rect(0, 0, 10, 3, '#8a8098'); for (let k = 0; k < ph; k += 3) ps.set(2 + (k % 5), k, '#5a8a4a'); ps.outline('#2a2236'); put(lay, ps, C(lay, f), lay.base + 1); }
    // 篝火 + 一锅咕嘟咕嘟的蘑菇汤（吃饭的地方）
    const pot = A.spr(14, 14); pot.vl(1, 0, 12, '#5a4a3a'); pot.vl(13, 0, 12, '#5a4a3a'); pot.hl(1, 0, 13, '#5a4a3a'); pot.ell(7, 8, 4.5, 3, (nx, ny) => (ny < -0.4 ? '#e8b05a' : '#3a3440')); pot.set(6, 5, '#c84a4a'); pot.set(8, 5, '#f0e8d0');
    for (let k = 0; k < 5; k++) pot.set(3 + k * 2, 13, k % 2 ? '#ffb03a' : '#ff6a3a'); pot.outline('#1a1418');
    put(lay, pot, C(lay, 0.52) - 0, lay.base + 8); spot(lay, 'feeder', C(lay, 0.52), lay.base + 9);
    lay.lights.push({ x: C(lay, 0.52) - 3, y: lay.base + 6, w: 6, h: 2, r: 10, col: '#ffb03a', glow: true });
    lay.smoke = { c: C(lay, 0.52), r: lay.base - 4 };
    // 地下泉（喝水）
    P.ell(C(lay, 0.12), lay.base + 6, cols * 0.04, 2.6, (nx, ny) => (nx * nx + ny * ny > 0.7 ? '#3e5a3a' : '#3a8ab0'));
    spot(lay, 'fountain', C(lay, 0.12), lay.base + 5);
    // 发光苔藓和孢子
    for (let i = 0; i < 40; i++) { const x = Math.floor(R() * cols), y = lay.base + Math.floor(R() * (rows - lay.base - 1)); P.set(x, y, '#7af0c8'); if (i % 4 === 0) lay.lights.push({ x, y, w: 1, h: 1, r: 2, col: '#7af0c8', glow: true }); }
    spot(lay, 'lawn', C(lay, 0.6), lay.base + 9); spot(lay, 'sunspot', C(lay, 0.44), lay.base + 2); spot(lay, 'lookout', C(lay, 0.55), lay.base + 1);
    placeHomes(lay, [[0.14, 2], [0.24, 1], [0.38, 2], [0.7, 1], [0.79, 2], [0.95, 1], [0.6, 3], [0.3, 3]], 'shroom');
  }

  Object.assign(PP.BIOMES, { skyisle, academy, undergrove });
})();
