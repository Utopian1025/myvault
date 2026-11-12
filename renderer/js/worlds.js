// 「我的」：认养的动物住在这里（三处原创的小世界）
// 浮空岛：云海上漂着的草地小岛——风车磨坊小屋、拴着的热气球、菜园、野餐、岛边垂下去的瀑布
// 魔法学院：山谷里的尖塔学院——石砌城墙、拱窗、玫瑰窗、旗帜、观星塔、猫头鹰塔、飘着的蜡烛、温室、坩埚
// 地底森林：大地深处——发光巨蘑菇、垂下来的树根和光球、望不见底的裂谷和吊桥、古老的石拱门、地下泉
(function () {
  const PP = (window.PP = window.PP || {});
  const G = PP.G;
  const BH = () => PP.BIOME_H;

  // 住在某个地方的认养动物（按物种，不重复，按认养先后）
  PP.ownSpecies = function (scene) {
    const out = [];
    for (const p of G.all || []) if (!p.d.wild && p.d.ownHome === scene && !out.includes(p.d.species)) out.push(p.d.species);
    return out;
  };

  // =====================================================================
  // 小工具
  // =====================================================================
  const A = () => PP.ART;
  const dk = (c, k) => A().mix(c, '#2a1a34', k); // 往紫褐色的暗部走（不是死黑）
  const lt = (c, k) => A().mix(c, '#fff6e0', k); // 往暖白的亮部走
  const WARM = '#ffd98a', WARM2 = '#ffefb8';

  // 带窗框、十字窗棂、窗台花箱的窗户（x, y 左上角）
  function window_(s, x, y, w, h, trim, opt = {}) {
    s.rect(x - 1, y - 1, w + 2, h + 2, trim);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.set(x + i, y + j, j < h / 2 ? (i + j < 2 ? WARM2 : WARM) : A().mix(WARM, '#e8a050', 0.35));
    if (opt.arch) { s.set(x, y, trim); s.set(x + w - 1, y, trim); }
    if (w >= 4) s.vl(x + Math.floor(w / 2), y, h, trim);
    if (h >= 4) s.hl(x, y + Math.floor(h / 2), w, trim);
    if (opt.curtain) { s.vl(x, y, h - 1, opt.curtain); s.vl(x + w - 1, y, h - 1, opt.curtain); }
    if (opt.box) {
      s.rect(x - 1, y + h + 1, w + 2, 2, '#8a5a3a'); s.hl(x - 1, y + h + 1, w + 2, '#a8784a');
      for (let i = 0; i < w + 2; i++) s.set(x - 1 + i, y + h, i % 2 ? '#5aa64e' : ['#f07a9a', '#ffd25a', '#f0f0ff', '#b08af0'][(i >> 1) % 4]);
    }
  }
  // 拱门：木板门、门框、金色门把手、门前一级石阶
  function door_(s, x, y, w, h, wood, trim) {
    s.rect(x - 1, y - 1, w + 2, h + 1, trim);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.set(x + i, y + j, i % 2 ? dk(wood, 0.12) : wood);
    s.set(x - 1, y - 1, null); s.set(x + w, y - 1, null);
    s.set(x, y, trim); s.set(x + w - 1, y, trim);
    s.set(x + w - 2, y + Math.floor(h / 2) + 1, '#ffd25a');
    s.rect(x - 2, y + h, w + 4, 1, '#a8a0b0');
  }
  // 一屋顶的瓦片：一行一行，有鱼鳞纹，屋檐下一道阴影
  function roofRows(s, cx, top, h, w0, w1, col, opt = {}) {
    for (let y = 0; y < h; y++) {
      const half = Math.round(w0 / 2 + (w1 - w0) / 2 * (y / Math.max(1, h - 1)));
      for (let x = -half; x <= half; x++) {
        let c = col;
        if (y % 3 === 2) c = dk(col, 0.22);
        else if ((x + (Math.floor(y / 3) % 2) * 2) % 4 === 0) c = dk(col, 0.1);
        if (x < -half + 2) c = lt(c, 0.12);
        if (y === 0) c = lt(col, 0.3);
        s.set(cx + x, top + y, c);
      }
    }
    if (opt.snow) for (let y = 0; y < Math.min(3, h); y++) { const half = Math.round(w0 / 2 + (w1 - w0) / 2 * (y / Math.max(1, h - 1))); for (let x = -half; x <= half; x++) if (y < 2 || A().hash(x, y, 9) < 0.5) s.set(cx + x, top + y, '#ffffff'); }
  }
  // 墙面：木板 / 石块 / 白墙配木梁
  function wall_(s, x, y, w, h, kind, col) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let c = col;
      if (kind === 'plank') { if (i % 3 === 0) c = dk(col, 0.16); else if (A().hash(x + i, y + j, 3) < 0.04) c = dk(col, 0.1); }
      else if (kind === 'stone') { const row = Math.floor(j / 3), off = (row % 2) * 3; if (j % 3 === 2 || (i + off) % 6 === 0) c = dk(col, 0.22); else c = A().hash(Math.floor((i + off) / 6), row, 7) < 0.3 ? lt(col, 0.08) : A().hash(Math.floor((i + off) / 6), row, 8) < 0.25 ? dk(col, 0.07) : col; }
      else if (kind === 'plaster') { if (A().hash(x + i, y + j, 5) < 0.05) c = dk(col, 0.05); }
      s.set(x + i, y + j, c);
    }
    if (kind === 'plaster') { const beam = '#7a5038'; s.vl(x, y, h, beam); s.vl(x + w - 1, y, h, beam); s.hl(x, y, w, beam); s.hl(x, y + Math.floor(h / 2), w, beam); }
  }
  // 小屋：认养的动物一种一间（墙、屋顶、窗、门、烟囱都不一样）
  const ROOF = ['#c8604e', '#5a7ac8', '#d89a3a', '#8a62b8', '#4f9a6a', '#d8709a', '#3e8a98', '#b8743e'];
  function cottage(h, i, style, snow) {
    // 精修小屋：石头地基、木板 / 石块 / 白墙木梁的墙、一排排错开的瓦片屋顶和封檐板、老虎窗、砖砌烟囱、
    // 带窗台花箱的亮窗、木门门框和门前石阶、门边小灯、墙角爬藤、门口的花盆
    const a = A(), B = a.BLD, w = Math.round(h * 1.15), s = a.spr(w + 2, h + 2), roof = ROOF[i % ROOF.length], cx = Math.round((w + 2) / 2) + 1;
    const lights = [], R4 = (c) => [dk(c, 0.45), dk(c, 0.18), c, lt(c, 0.3)];
    const FL = [['#f07a9a', '#ffd25a'], ['#b08af0', '#fff6e0'], ['#ffd25a', '#f07a9a']][i % 3];
    if (style === 'shroom') {
      // 蘑菇屋：伞盖屋顶（大白点带高光、伞下一圈菌褶）、奶油色的茎墙（竖纹）、圆窗、拱门和小台阶、门边挂着发光的小灯
      const capH = Math.round(h * 0.52), wallTop = capH - 3;
      for (let y = wallTop; y < h - 1; y++) for (let x = 5; x < w - 2; x++) { const nx = (x - 5) / (w - 7); s.set(x, y, nx < 0.2 ? '#fbf2dc' : nx > 0.8 ? '#d8c6a4' : (x % 4 === 0 ? '#e6d6b6' : '#f2e6cc')); }
      s.ell(cx, capH - 1, w / 2 + 1, capH - 1, (nx, ny, x, y) => { if (ny > 0.62) return null; let c = ny > 0.42 ? dk(roof, 0.3) : ny < -0.55 ? lt(roof, 0.35) : nx < -0.45 ? lt(roof, 0.14) : nx > 0.55 ? dk(roof, 0.14) : roof; if (a.hash(x, y, 40) < 0.06) c = dk(c, 0.1); return c; });
      for (let x = 2; x < w + 1; x++) { s.set(x, capH, x % 2 ? '#c8b088' : '#a8906a'); s.set(x, capH + 1, x % 2 ? '#8a7454' : null); }
      for (const [px, py, r] of [[0.22, 0.42, 1.8], [0.5, 0.2, 2.2], [0.75, 0.45, 1.6], [0.36, 0.7, 1.2], [0.62, 0.66, 1.3]]) { const X = 2 + px * (w - 2), Y = 1 + py * (capH - 3); s.ell(X, Y, r, r * 0.8, (nx, ny) => (ny < -0.3 && nx < 0 ? '#ffffff' : nx > 0.4 ? '#e8dcc8' : '#fff6e6')); }
      s.ell(w - 6, wallTop + 6, 2.2, 2.2, '#8a5a3a'); s.ell(w - 6, wallTop + 6, 1.4, 1.4, WARM); s.set(w - 7, wallTop + 5, WARM2); lights.push([w - 8, wallTop + 4, 4, 4]);
      B.door(s, cx - 3, h - 9, 5, 8, '#8a5a3a', '#5a3a28', { round: true });
      s.rect(cx - 4, h - 1, 7, 1, '#a8a0b0'); s.hl(cx - 3, h, 5, '#8a8298');
      s.set(cx + 4, h - 8, '#5a3a28'); s.rect(cx + 3, h - 7, 3, 3, '#8af0e0'); s.set(cx + 4, h - 6, '#e8fffa');
      for (let x = 4; x < w - 1; x++) if (a.hash(x, 41) < 0.5) s.set(x, h, '#4a8a5a');
    } else {
      const roofH = Math.round(h * 0.44), wallH = h - roofH, kind = style === 'stone' ? 'stone' : i % 2 ? 'plank' : 'plaster';
      const wallCol = kind === 'stone' ? '#b8b0c4' : kind === 'plank' ? ['#d8b48a', '#c89a78', '#e0c49a'][i % 3] : '#f4ead6';
      const rc = style === 'stone' ? ['#5a5a8a', '#4a6a8a', '#7a5a7a'][i % 3] : roof;
      // 墙
      if (kind === 'plank') B.planks(s, 3, roofH + 1, w - 4, wallH - 3, R4(wallCol), false);
      else wall_(s, 3, roofH + 1, w - 4, wallH - 3, kind, wallCol);
      if (kind === 'plaster') { const beam = '#6a4430'; for (let j = 0; j < wallH - 3; j++) { s.set(3 + Math.round(j * 0.5) + 4, roofH + 1 + j, j < (wallH - 3) / 2 ? beam : null); } }
      for (let x = 3; x < w - 1; x++) { s.set(x, roofH + 1, dk(wallCol, 0.4)); s.set(x, roofH + 2, dk(wallCol, 0.2)); } // 檐下阴影
      B.stones(s, 2, h - 2, w - 1, 3);
      // 屋顶 + 老虎窗
      B.gable(s, cx, 1, roofH, Math.round(w / 2), R4(rc), snow, 1);
      if (w > 22) { const dx = Math.round(cx - w * 0.22); s.rect(dx - 2, roofH - 6, 7, 5, wallCol); s.hl(dx - 3, roofH - 7, 9, dk(rc, 0.3)); s.hl(dx - 2, roofH - 8, 7, rc); s.hl(dx - 1, roofH - 9, 5, lt(rc, 0.2)); window_(s, dx, roofH - 5, 3, 3, '#6a4632'); lights.push([dx, roofH - 5, 3, 3]); }
      // 砖烟囱
      const chx = Math.round(w * 0.74), chH = Math.round(roofH * 0.6);
      for (let y = 0; y < chH; y++) for (let x = 0; x < 4; x++) s.set(chx + x, y + 1, y % 2 === 0 ? '#7a3a34' : (x + (y >> 1)) % 2 ? '#b8584a' : '#a04a40');
      s.hl(chx - 1, 0, 6, '#5a4a52'); s.hl(chx - 1, 1, 6, '#8a7a82');
      // 窗、门、门边灯、爬藤、花盆
      const wy = roofH + 4;
      B.window(s, 6, wy, 4, 4, '#5a3a28', { lit: true, box: wallH > 12 ? FL : null }); lights.push([6, wy, 4, 4]);
      if (w > 17) { B.window(s, w - 9, wy, 4, 4, '#5a3a28', { lit: true, box: wallH > 12 ? FL : null }); lights.push([w - 9, wy, 4, 4]); }
      const dh = Math.min(9, wallH - 4);
      B.door(s, cx - 2, h - 2 - dh, 5, dh, ['#7a4a2e', '#4a5a8a', '#6a7a3a'][i % 3], '#4a3022', { round: true });
      s.rect(cx - 3, h - 2, 7, 1, '#c8c0d0'); s.hl(cx - 2, h - 1, 5, '#a8a0b0');
      s.set(cx + 4, h - 3 - dh + 2, '#3a2a2a'); s.rect(cx + 4, h - 2 - dh + 2, 2, 2, '#ffcf5a'); s.set(cx + 4, h - 2 - dh + 2, '#fff2c0');
      if (!snow) { for (let y = h - 3; y > roofH + 3; y--) { const x = 3 + (y % 3 === 0 ? 1 : 0); s.set(x, y, y % 2 ? '#4f8a46' : '#6aaa54'); } s.rect(cx - 6, h - 4, 3, 2, '#b8644a'); s.set(cx - 5, h - 5, FL[0]); s.set(cx - 6, h - 5, '#5aa04e'); s.set(cx - 4, h - 5, '#5aa04e'); }
    }
    return { s: s.outline('#3a2630'), door: { x: cx }, lights };
  }
  function placeHomes(lay, slots, style) {
    const { home, SZ } = BH();
    PP.ownSpecies(lay.scene).forEach((sp, i) => {
      const sl = slots[i % slots.length], h = SZ(lay, 24 + (i % 3) * 3), c = cottage(h, i, style, lay.season === 'winter');
      const cc = Math.round(lay.cols * sl[0]) + (i >= slots.length ? 10 : 0), rr = lay.base + sl[1];
      home(lay, sp, c.s, cc, rr, c.door);
      const x0 = cc - Math.round(c.s.w / 2), y0 = rr + 1 - c.s.h;
      for (const [x, y, ww, hh] of c.lights) lay.lights.push({ x: x0 + x + 1, y: y0 + y + 1, w: ww, h: hh, r: 4, col: WARM, glow: true });
    });
  }
  // 软软的一团云：三层（暗、中、亮），底边平一点
  function cloudBank(P, cx, cy, w, h, cols3) {
    const a = A(), [c0, c1, c2] = cols3;
    for (let k = 0; k < 7; k++) {
      const x = cx + (k - 3) * w * 0.14, r = h * (0.45 + 0.35 * Math.sin(k * 1.7 + cx) ** 2);
      P.ell(x, cy - r * 0.3, w * 0.12 + r * 0.6, r, (nx, ny) => (ny > 0.55 ? null : ny > 0.2 ? c0 : ny < -0.45 || nx < -0.6 ? c2 : a.dith(Math.round(x + nx * 9), Math.round(cy + ny * 9), 0.5 + ny) ? c1 : c2));
    }
  }
  // 小路灯（铁杆 + 暖光灯笼）
  function lampPost(h, col = '#3a3448') {
    const a = A(), s = a.spr(5, h);
    s.vl(3, 3, h - 2, col); s.hl(2, h, 3, col); s.rect(1, 1, 5, 4, col); s.rect(2, 2, 3, 2, WARM); s.set(2, 2, WARM2); s.hl(1, 0, 5, dk(col, 0.2));
    return s.outline('#231c28');
  }
  // 灌木 + 小花
  function flowerBush(r, season, col) {
    const a = A(), s = a.spr(r * 2 + 1, r + 2), leaf = season === 'winter' ? '#8aa094' : season === 'autumn' ? '#b8843a' : '#5aa04e';
    s.ell(r + 1, r + 1, r, r * 0.75, (nx, ny) => (ny < -0.5 || nx < -0.6 ? lt(leaf, 0.25) : ny > 0.4 ? dk(leaf, 0.25) : leaf));
    if (season !== 'winter') for (let k = 0; k < r; k++) s.set(2 + ((k * 5) % (r * 2 - 2)), 2 + ((k * 3) % r), col);
    return s.outline(dk(leaf, 0.6));
  }


  // =====================================================================
  // 精修用的小物件：让画面“满”起来、有前中后景（星露谷 / 巫奇那种一草一木都有）
  // =====================================================================
  // 一簇高草（长短不一，叶尖亮、根部暗）
  function tallGrass(h, base, tip, seed) {
    const a = A(), s = a.spr(7, h + 1);
    for (let k = 0; k < 6; k++) { const hh = Math.max(2, Math.round(h * (0.45 + a.hash(k, seed, 3) * 0.55))), x0 = 1 + k, lean = a.hash(k, seed, 5) < 0.5 ? -1 : 1; for (let j = 0; j < hh; j++) s.set(x0 + (j > hh * 0.6 ? lean : 0), h - j, j > hh - 2 ? tip : j < 2 ? dk(base, 0.25) : base); }
    return s.outline(dk(base, 0.6), (x, y) => y > h - 2);
  }
  // 蕨：几片往两边弯下去的羽状叶
  function fern(h, col) {
    const a = A(), s = a.spr(h * 2 + 1, h + 1), cx = h;
    for (const dir of [-1, 1]) for (let f = 0; f < 3; f++) { const len = h - f; for (let k = 0; k < len; k++) { const x = cx + dir * Math.round(k * (0.5 + f * 0.25)), y = h - Math.round(Math.sin((k / len) * Math.PI * 0.85) * (h - f * 1.5)); s.set(x, y, k > len - 3 ? lt(col, 0.25) : f === 2 ? dk(col, 0.15) : col); if (k % 2 && k < len - 1) s.set(x, y - 1, lt(col, 0.1)); } }
    s.vl(cx, h - 2, 3, dk(col, 0.3));
    return s.outline(dk(col, 0.55));
  }
  // 长苔的石头
  function mossRock(w, stone, moss) {
    const a = A(), h = Math.round(w * 0.6), s = a.spr(w, h);
    s.ell(w / 2, h, w / 2, h - 0.5, (nx, ny) => (ny < -0.45 ? moss : nx < -0.4 ? lt(stone, 0.18) : nx > 0.45 ? dk(stone, 0.2) : stone));
    return s.outline(dk(stone, 0.55));
  }
  // 木箱 / 木桶
  function crate(n) { const a = A(), s = a.spr(n, n); s.rect(1, 1, n - 1, n - 1, '#b07a4a'); s.hl(1, 1, n - 1, '#c8935e'); s.hl(1, Math.round(n / 2), n - 1, '#8a5a36'); s.vl(1, 1, n - 1, '#8a5a36'); s.vl(n - 1, 1, n - 1, '#7a4e2e'); for (let k = 1; k < n - 1; k++) s.set(k, k, '#8a5a36'); return s.outline('#3a2630'); }
  function barrel(n) { const a = A(), s = a.spr(n, n + 2); s.ell(n / 2 + 0.5, (n + 2) / 2 + 0.5, n / 2 - 0.5, (n + 2) / 2 - 0.5, (nx) => (nx < -0.4 ? '#c08a56' : nx > 0.45 ? '#7a4e2e' : '#a06e40')); s.hl(1, 3, n, '#5a5466'); s.hl(1, n - 1, n, '#5a5466'); return s.outline('#3a2630'); }
  // 蜂箱：一层层的木格子 + 小屋顶
  function beehive() { const a = A(), s = a.spr(9, 12); for (let j = 0; j < 3; j++) { s.rect(1, 4 + j * 3, 8, 3, j % 2 ? '#e8c070' : '#f2d28a'); s.hl(1, 4 + j * 3, 8, '#fff0c0'); } s.rect(0, 2, 10, 2, '#a8584a'); s.hl(1, 1, 8, '#c8705a'); s.rect(4, 11, 2, 1, '#3a2630'); return s.outline('#3a2630'); }
  // 晾衣绳：两根小木杆 + 一串衣服
  function laundry(w) { const a = A(), s = a.spr(w, 12); s.vl(1, 1, 12, '#8a6040'); s.vl(w, 1, 12, '#8a6040'); const C2 = ['#f2a6c2', '#a8d0f0', '#fff6e0', '#b8e09a', '#ffd36a']; for (let x = 1; x <= w; x++) { const y = 2 + Math.round(Math.sin(((x - 1) / (w - 1)) * Math.PI) * 2); s.set(x, y, '#d8d0c0'); if (x > 2 && x < w - 1 && x % 5 === 0) { const c = C2[(x / 5) % C2.length | 0]; s.rect(x - 1, y + 1, 4, 4, c); s.hl(x - 1, y + 1, 4, lt(c, 0.3)); } } return s.outline('#3a2630', (x, y) => y > 1); }
  // 向日葵
  function sunflower(h) { const a = A(), s = a.spr(7, h); s.vl(4, 4, h - 3, '#4a8a3e'); s.set(3, Math.round(h * 0.6), '#6aaa4e'); s.set(5, Math.round(h * 0.7), '#6aaa4e'); s.ell(4, 3, 2.6, 2.6, (nx, ny) => (nx * nx + ny * ny < 0.25 ? '#7a4a2a' : ny < -0.3 ? '#ffe27a' : '#f6c43a')); return s.outline('#4a3022'); }
  // 信箱
  function mailbox() { const a = A(), s = a.spr(6, 10); s.vl(3, 4, 7, '#7a5a40'); s.rect(1, 1, 5, 4, '#7ab0e0'); s.hl(1, 1, 5, '#a8d0f0'); s.set(6, 2, '#e8705a'); s.set(6, 1, '#e8705a'); return s.outline('#3a2630'); }
  // 一大团有体积的积云：底部带淡紫的阴影，顶上暖白亮边（只画在空的地方）
  function puffCloud(P, cx, cy, w, h, warm) {
    const a = A();
    for (let k = 0; k < 6; k++) {
      const x = cx + (k - 2.5) * w * 0.16, r = h * (0.5 + 0.45 * Math.sin(k * 2.1 + cx * 0.3) ** 2), yy = cy - r * 0.35;
      for (let y = Math.floor(-r); y <= r; y++) for (let xx = Math.floor(-r * 1.3); xx <= r * 1.3; xx++) {
        const nx = xx / (r * 1.3), ny = y / r; if (nx * nx + ny * ny > 1 || yy + y > cy + 1) continue;
        const X = Math.round(x + xx), Y = Math.round(yy + y); if (P.get(X, Y)) continue;
        const lit = ny < -0.55 || (nx < -0.5 && ny < 0.2);
        P.set(X, Y, lit ? (warm ? '#fff4ea' : '#ffffff') : ny > 0.35 ? (a.dith(X, Y, 0.5) ? '#d6c6ec' : '#e2d6f2') : '#f1eafa');
      }
    }
  }
  // 前景的一排花草（画面最下面一排，挡住一点点，像从草丛后面看过去）
  function fringe(lay, R, cols2, flowers, skip) {
    const { put } = BH(), a = A();
    for (let c = 2; c < lay.cols - 2; c += 4 + Math.floor(R() * 7)) {
      if (skip && skip(c)) continue;
      const r = lay.rows - 1 - Math.floor(R() * 2), k = R();
      if (k < 0.6 || !flowers) put(lay, flowers ? a.grassTuft(lay.season, R, true) : fern(3 + Math.floor(R() * 2), cols2[0]), c, r);
      else put(lay, a.flower(lay.season, R), c, r);
    }
  }


  // 石板小路：一块块圆润的石板（上亮下暗、带一点青苔），石板之间露出草
  function stonePath(P, lay, snow, cols4) {
    // 踏脚石小路：一块块扁平的石板沿着原来的小路走，石板之间露出草；每块上沿亮、下沿暗、偶尔一点青苔
    const a = A(), { cols, rows } = lay, py = lay.path; if (py == null) return;
    const ST = cols4 || ['#7e7466', '#a29886', '#bfb5a0', '#dcd3bf'], G0 = snow ? '#e6eef6' : '#6aaa54', G1 = snow ? '#ffffff' : '#7cbc62';
    const yAt = (x) => py + Math.round(Math.sin(x / 47) * 2 + Math.sin(x / 13) * 0.7);
    for (let x = 0; x < cols; x++) for (let k = -4; k <= 4; k++) { const y = yAt(x) + k; if (y > lay.gy && y < rows) P.set(x, y, a.hash(x, y, 51) < 0.55 ? G0 : G1); }
    for (let x = 1; x < cols; ) {
      const sw = 5 + Math.floor(a.hash(x, 1, 52) * 3), sh = 4, y0 = yAt(x) - 2 + (a.hash(x, 2, 52) < 0.5 ? 0 : 1);
      for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
        if ((i === 0 || i === sw - 1) && (j === 0 || j === sh - 1)) continue;
        const X = x + i, Y = y0 + j;
        let c = j === 0 ? ST[3] : j === sh - 1 ? ST[0] : i === 0 ? ST[2] : i === sw - 1 ? ST[1] : (a.hash(X, Y, 53) < 0.15 ? ST[1] : ST[2]);
        if (!snow && j > 0 && a.hash(X, Y, 56) < 0.05) c = '#7a9a5a';
        if (snow && j === 0) c = '#ffffff';
        P.set(X, Y, c);
      }
      P.hl(x + 1, y0 + sh, sw - 2, snow ? '#c8d4e4' : '#4f8a46');
      x += sw + 2 + Math.floor(a.hash(x, 3, 54) * 2);
    }
  }
  // 一片一片的花：同一种颜色聚在一起开（像真的野花地），花之间夹着小叶子
  function flowerPatches(P, lay, R, colors, n) {
    const a = A(), { cols, rows, gy } = lay;
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(R() * cols), cy = gy + 3 + Math.floor(R() * Math.max(2, rows - gy - 6)), col = colors[i % colors.length], rad = 3 + Math.floor(R() * 4);
      if (lay.path != null && Math.abs(cy - lay.path) < 6) continue;
      for (let k = 0; k < rad * 3; k++) {
        const x = cx + Math.round((R() - 0.5) * rad * 2.4), y = cy + Math.round((R() - 0.5) * rad * 0.9);
        if (y <= gy || y >= rows - 1) continue;
        P.set(x, y + 1, '#4f8a46'); P.set(x, y, col); if (R() < 0.4) P.set(x + 1, y, a.mix(col, '#3a1a3a', 0.2)); if (R() < 0.3) P.set(x, y - 1, a.mix(col, '#ffffff', 0.5));
      }
    }
  }

  // =====================================================================
  // 浮空岛
  // =====================================================================
  function skyisle(P, lay, R) {
    const a = A(), { put, spot, C, SZ, ground, GROUND, PATH, BLADES } = BH(), { cols, rows, gy } = lay;
    lay.noScatter = true;
    const s = lay.season, w = s === 'winter';
    // 远处：一层层的云海（淡紫 → 粉 → 白），云里漂着几座小浮岛
    cloudBank(P, C(lay, 0.5), gy + 2, cols * 1.1, SZ(lay, 14), ['#cbb8e4', '#dfcdf0', '#efe4fa']);
    // 远处的小浮岛：越远越淡越小；岩底一层层的土和石（左边受光），垂下来的树根和藤蔓，岛顶草皮上有小树、小屋、瀑布
    const ISL = [[0.06, 30, 8, 'pine', 0.55], [0.2, 16, 5, 0, 0.75], [0.36, 22, 6, 'house', 0.62], [0.555, 13, 4, 0, 0.8], [0.66, 26, 7, 'fall', 0.5], [0.83, 18, 5, 'oak', 0.7], [0.95, 32, 9, 'pine', 0.45]];
    for (const [f, ww, hh, deco, fade] of ISL) {
      const cx = C(lay, f), cy = Math.round(gy * (0.3 + fade * 0.25) + ((f * 37) % 5)), W2 = SZ(lay, ww), H2 = SZ(lay, hh);
      const haze = (c) => a.mix(c, '#e6dcf2', fade * 0.55);
      const isl = a.spr(W2 + 4, Math.round(H2 * 2.3) + 6), ic = Math.round((W2 + 6) / 2), it = 4;
      for (let k = 0; k < H2 * 1.9; k++) {
        const half = Math.round((W2 / 2) * Math.pow(1 - k / (H2 * 1.9), 0.75) + Math.sin(k * 1.7 + f * 9) * 0.8);
        for (let x = -half; x <= half; x++) {
          const band = Math.floor((k + Math.floor(x / 4)) / 3) % 3, nx = x / Math.max(1, half);
          let c = k < 2 ? '#7a5238' : band === 0 ? '#a898b2' : band === 1 ? '#8a7a96' : '#9a8aa4';
          if (nx < -0.5) c = a.mix(c, '#ffffff', 0.15); else if (nx > 0.55) c = a.mix(c, '#2a1a34', 0.2);
          if (a.hash(x, k, f * 100) < 0.05) c = '#6a5a78';
          isl.set(ic + x, it + k, haze(c));
        }
      }
      for (let x = -W2 / 2; x <= W2 / 2; x++) { isl.set(ic + x, it - 1, haze(w ? '#ffffff' : '#9ad07a')); isl.set(ic + x, it - 2, haze(w ? '#eef4fb' : (Math.round(x) % 3 ? '#7cbc62' : '#a8de86'))); if (a.hash(x, 3, f * 7) < 0.3) isl.set(ic + x, it - 3, haze(w ? '#ffffff' : '#8ad468')); }
      for (let x = -W2 / 2 + 1; x < W2 / 2; x += 2) if (a.hash(x, 9, f * 11) < 0.45) { const len = 2 + Math.floor(a.hash(x, 10, f) * H2 * 1.6); for (let k = 0; k < len; k++) isl.set(ic + x + (k > len * 0.6 ? 1 : 0), it + 1 + k, haze(k === len - 1 && !w ? '#f0a8c0' : k % 3 ? '#6a4a32' : '#5a9a4e')); }
      if (deco === 'pine' || deco === 'oak') { const tr = deco === 'pine' ? a.pine(H2 * 2, s, R, w) : a.broadleaf(H2 * 2, s, R, 'oak'); tr.stamp(isl, ic - Math.round(W2 * 0.18), it - 1); }
      if (deco === 'house') { const hs = cottage(H2 * 2 + 2, 3, 'wood', w).s; hs.stamp(isl, ic + Math.round(W2 * 0.1), it - 1); }
      if (deco === 'fall') for (let k = 0; k < H2 * 2.2; k++) for (let q = 0; q < 2; q++) isl.set(ic + Math.round(W2 * 0.28) + q, it - 1 + k, (k + q) % 3 === 0 ? '#ffffff' : '#a8d8f6');
      for (let i = 0; i < isl.d.length; i++) if (isl.d[i]) { const v = isl.d[i], r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255, k = fade * 0.45; isl.d[i] = ((255 << 24) | (Math.round(b + (240 - b) * k) << 16) | (Math.round(g + (228 - g) * k) << 8) | Math.round(r + (236 - r) * k)) >>> 0; }
      isl.stamp(P, cx, cy + Math.round(H2 * 2.3), 0.5, 1);
      if (deco === 'fall') puffCloud(P, cx + Math.round(W2 * 0.28), cy + Math.round(H2 * 2.6), SZ(lay, 10), SZ(lay, 3), true);
    }
    ground(P, lay, w ? GROUND.winter : ['#7cbc62', '#6aaa54', '#8fcc6e', '#f0a8c0'], { path: PATH[s], blades: BLADES[s] });
    stonePath(P, lay, w);
    if (!w) flowerPatches(P, lay, R, ['#f2a6c2', '#ffd36a', '#ffffff', '#b8a0f0', '#ff8a7a'], 16);
    // 岛的两头：草皮断开，露出一层层的土和石头，树根、藤蔓垂下去
    const edge = C(lay, 0.07);
    for (let x = 0; x < cols; x++) {
      const e = Math.min(x, cols - 1 - x); if (e >= edge) continue;
      const cut = gy + Math.round(((edge - e) / edge) ** 1.3 * (rows - gy) * 1.15);
      for (let y = gy; y < rows; y++) {
        if (y < cut) continue;
        const d = y - cut;
        if (d < 2) P.set(x, y, d === 0 ? (w ? '#ffffff' : '#7cbc62') : '#8a6040');
        else if (d < 5) P.set(x, y, a.hash(x, y, 4) < 0.15 ? '#a8a0b0' : '#7a5238');
        else P.set(x, y, 0);
      }
    }
    for (let x = 0; x < cols; x++) {
      const e = Math.min(x, cols - 1 - x); if (e >= edge || a.hash(x, 3) > 0.3) continue;
      const top = gy + Math.round(((edge - e) / edge) ** 1.3 * (rows - gy) * 1.15) + 4, len = 3 + Math.floor(a.hash(x, 4) * 9);
      for (let k = 0; k < len; k++) P.set(x + (k > 4 && a.hash(x, k) < 0.3 ? 1 : 0), top + k, k === len - 1 && a.hash(x, 6) < 0.5 ? '#f0a8c0' : k % 4 === 3 ? '#6aa84e' : '#6a4a32');
    }
    // 右边岛沿的瀑布：从草地边流下去，底下是水雾
    const wf = cols - edge + 2;
    for (let y = gy + 1; y < rows; y++) for (let k = 0; k < 3; k++) P.set(wf + k, y, (y + k * 2) % 4 === 0 ? '#ffffff' : k === 1 ? '#9fd6f6' : '#7cc0ea');
    for (let i = 0; i < 6; i++) cloudBank(P, i < 3 ? C(lay, 0.015 + i * 0.025) : C(lay, 0.935 + (i - 3) * 0.025), rows - 1, SZ(lay, 18), SZ(lay, 5), ['#e2d4f2', '#f2eafc', '#ffffff']);

    // ---- 风车磨坊小屋：石砌的风车塔（一块块错缝的石头、拱形亮窗、一圈木栏小阳台、锥形鳞片瓦尖顶）
    //      + 贴着它的木梁白墙小屋（交叉木梁、带花箱的亮窗、老虎窗、砖烟囱、圆顶木门和石阶）+ 彩旗、爬藤、门口的花盆和木桶
    const B = a.BLD, hh = SZ(lay, 60), tw = Math.round(hh * 0.3), hw = Math.round(hh * 0.66), ms = a.spr(tw + hw + 6, hh + 4);
    const tx = 2, tTop = Math.round(hh * 0.3), tcx = Math.round(tx + tw / 2 + 1);
    for (let y = tTop; y < hh; y++) {
      const half = Math.round(tw / 2 - 1 + (y - tTop) / (hh - tTop) * 2.5), row = Math.floor((y - tTop) / 3), off = (row % 2) * 2;
      for (let x = -half; x <= half; x++) {
        const nx = x / half; let c = nx < -0.45 ? '#e4dcea' : nx > 0.5 ? '#b0a4bc' : '#cec4d8';
        if ((y - tTop) % 3 === 2 || (x + 40 + off) % 4 === 0) c = a.mix(c, '#4a3a5a', 0.3);
        else if (a.hash(Math.floor((x + 40 + off) / 4), row, 61) < 0.2) c = a.mix(c, '#ffffff', 0.12);
        if (!w && nx > 0.3 && y > hh - 10 && a.hash(x, y, 62) < 0.35) c = '#6aa04e';
        ms.set(tcx + x, y, c);
      }
    }
    roofRows(ms, tcx, tTop - Math.round(tw * 1.0), Math.round(tw * 1.0) + 1, 1, tw + 5, '#8a5a3a', { snow: w });
    ms.set(tcx, tTop - Math.round(tw * 1.0) - 1, '#d8b85a'); ms.set(tcx, tTop - Math.round(tw * 1.0) - 2, '#d8b85a');
    for (const yy of [tTop + 7, tTop + 19]) { B.window(ms, tcx - 1, yy, 3, 4, '#5a3a28', { lit: true }); ms.set(tcx - 1, yy, '#5a3a28'); ms.set(tcx + 1, yy, '#5a3a28'); }
    // 小阳台：一圈木栏
    const by = tTop + 14; for (let x = -Math.round(tw / 2) - 2; x <= Math.round(tw / 2) + 2; x++) { ms.set(tcx + x, by, '#6a4630'); ms.set(tcx + x, by - 2, '#b08458'); if (x % 2 === 0) ms.set(tcx + x, by - 1, '#8a6040'); }
    lay.windmill = null;
    const hubLocal = [tcx, tTop + 3];
    // 小屋
    const hx = tx + tw + 1, hTop = Math.round(hh * 0.48), hWall = hh - hTop - 3;
    wall_(ms, hx, hTop + 1, hw - 1, hWall, 'plaster', '#f6ecd8');
    for (let j = 0; j < hWall; j++) { const k = j / hWall; ms.set(hx + Math.round(k * (hw / 2 - 2)), hTop + 1 + j, '#7a5038'); ms.set(hx + hw - 2 - Math.round(k * (hw / 2 - 2)), hTop + 1 + j, j < hWall / 2 ? '#7a5038' : null); }
    for (let x = hx; x < hx + hw - 1; x++) { ms.set(x, hTop + 1, '#5a3a28'); ms.set(x, hTop + 2, a.mix('#f6ecd8', '#3a2630', 0.3)); }
    B.stones(ms, hx - 1, hh - 3, hw + 1, 3);
    B.gable(ms, hx + Math.round(hw / 2), 1 + hTop - Math.round(hw * 0.44), Math.round(hw * 0.44), Math.round(hw / 2) + 1, ['#7a2a20', '#a8443a', '#c8604e', '#e08070'], w, 1);
    // 老虎窗
    const dx2 = hx + Math.round(hw * 0.3); ms.rect(dx2 - 2, hTop - 7, 7, 6, '#f6ecd8'); ms.hl(dx2 - 3, hTop - 8, 9, '#7a2a20'); ms.hl(dx2 - 2, hTop - 9, 7, '#c8604e'); ms.hl(dx2 - 1, hTop - 10, 5, '#e08070'); B.window(ms, dx2, hTop - 6, 3, 3, '#5a3a28', { lit: true });
    // 砖烟囱
    const chx = hx + hw - 9, chT = hTop - Math.round(hw * 0.44) - 3;
    for (let y = chT; y < hTop - 6; y++) for (let x = 0; x < 4; x++) ms.set(chx + x, y, (y - chT) % 2 === 0 ? '#7a3a34' : (x + ((y - chT) >> 1)) % 2 ? '#b8584a' : '#a04a40');
    ms.hl(chx - 1, chT - 1, 6, '#5a4a52'); ms.hl(chx - 1, chT, 6, '#8a7a82');
    B.window(ms, hx + 3, hTop + 6, 5, 5, '#5a3a28', { lit: true, box: ['#f07a9a', '#ffd25a'] });
    B.window(ms, hx + hw - 10, hTop + 6, 5, 5, '#5a3a28', { lit: true, box: ['#b08af0', '#fff6e0'] });
    const dX = hx + Math.round(hw / 2) - 3; B.door(ms, dX, hh - 13, 6, 10, '#7a4a2e', '#4a3022', { round: true });
    ms.rect(dX - 2, hh - 3, 10, 1, '#c8c0d0'); ms.hl(dX - 1, hh - 2, 8, '#a8a0b0');
    ms.set(dX + 7, hh - 11, '#3a2a2a'); ms.rect(dX + 7, hh - 10, 2, 2, '#ffcf5a'); ms.set(dX + 7, hh - 10, '#fff2c0');
    if (!w) { ms.rect(dX - 5, hh - 5, 3, 2, '#b8644a'); ms.set(dX - 4, hh - 6, '#f07a9a'); ms.set(dX - 5, hh - 6, '#5aa04e'); ms.set(dX - 3, hh - 6, '#5aa04e'); for (let y = hh - 4; y > hTop + 3; y--) ms.set(hx + hw - 2 + (y % 3 ? 0 : -1), y, y % 2 ? '#4f8a46' : '#6aaa54'); }
    // 彩旗从塔挂到屋檐
    for (let k = 0; k < hw; k++) { const y = Math.round(tTop + 9 + Math.sin(k / hw * Math.PI) * 4); ms.set(tx + tw + k, y, '#8a6a5a'); if (k % 3 === 1) { const fc = ['#f07a7a', '#ffd25a', '#7ac0f0', '#a8e07a'][(k / 3 | 0) % 4]; ms.set(tx + tw + k, y + 1, fc); ms.set(tx + tw + k, y + 2, a.mix(fc, '#3a1a2a', 0.2)); } }
    const hTopRoof = hTop - Math.round(hw * 0.44);
    ms.outline('#3a2630');
    const mc = C(lay, 0.47), mr = lay.base + 1;
    put(lay, ms, mc, mr);
    const mx0 = mc - Math.round(ms.w / 2), my0 = mr + 1 - ms.h;
    lay.windmill = [mx0 + hubLocal[0], my0 + hubLocal[1]];
    lay.smoke = { c: mx0 + chx + 1, r: my0 + chT - 2 }; lay.hearth = lay.smoke;
    for (const [wx, wy, ww2] of [[hx + 3, hTop + 6, 5], [hx + hw - 10, hTop + 6, 5], [dx2, hTop - 6, 3], [tcx - 1, tTop + 7, 3], [tcx - 1, tTop + 19, 3]]) lay.lights.push({ x: mx0 + wx, y: my0 + wy, w: ww2, h: ww2, r: 5, col: WARM, glow: true });
    void hTopRoof;

    // ---- 拴着的热气球：拼布气囊、藤编吊篮、沙袋、绳子 ----
    const bh = SZ(lay, 34), bw = Math.round(bh * 0.72), bs = a.spr(bw + 6, bh + 4), bcx = Math.round((bw + 6) / 2) + 1, er = Math.round(bh * 0.36);
    const PATCH = ['#e8705a', '#f6c85a', '#7ab0e0', '#f2a0b8', '#8ac86a'];
    bs.ell(bcx, er + 1, bw / 2, er, (nx, ny, x, y) => { const band = Math.floor((Math.asin(Math.max(-1, Math.min(1, nx))) / Math.PI + 0.5) * 6); const row = Math.floor((ny + 1) * 2.5); let c = PATCH[(band + row * 2) % PATCH.length]; if (nx < -0.55 || ny < -0.7) c = lt(c, 0.3); else if (nx > 0.55 || ny > 0.6) c = dk(c, 0.22); if ((x + y) % 7 === 0 && Math.abs(nx) < 0.9) c = dk(c, 0.12); return c; });
    bs.ell(bcx - Math.round(bw * 0.18), Math.round(er * 0.55), 1.5, 2.5, '#fff8e8');
    const by0 = er * 2 + 1, bby = bh - 6;
    for (let y = by0; y < bby; y++) { bs.set(bcx - Math.round(bw * 0.28) + Math.round((y - by0) * 0.25), y, '#6a4a3a'); bs.set(bcx + Math.round(bw * 0.28) - Math.round((y - by0) * 0.25), y, '#6a4a3a'); }
    for (let j = 0; j < 5; j++) for (let i = 0; i < Math.round(bw * 0.42); i++) bs.set(bcx - Math.round(bw * 0.21) + i, bby + j, j === 0 ? '#d8a868' : (i + j) % 2 ? '#a8783e' : '#c0905a');
    bs.rect(bcx - Math.round(bw * 0.21) - 2, bby + 2, 2, 3, '#c8b088'); bs.rect(bcx + Math.round(bw * 0.21) + 1, bby + 3, 2, 2, '#c8b088');
    bs.outline('#3a2630'); put(lay, bs, C(lay, 0.79), lay.base - 1);
    // 拴气球的木桩和绳
    const peg = a.spr(10, 6); peg.rect(1, 2, 2, 5, '#7a5a40'); for (let k = 0; k < 8; k++) peg.set(2 + k, 2 - Math.floor(k / 3), '#c8b088'); peg.outline('#3a2630'); put(lay, peg, C(lay, 0.775), lay.base + 2);

    // ---- 野餐：格子布、藤篮、茶壶和小点心（吃饭的地方） ----
    const pic = a.spr(26, 6);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 26; x++) pic.set(x + 1, y + 3, (Math.floor(x / 3) + y) % 2 ? '#fbf3e6' : '#e87a8a');
    pic.rect(3, 0, 6, 3, '#c0905a'); pic.hl(3, 0, 6, '#d8a868'); pic.set(5, 1, '#a8783e'); // 藤篮
    pic.ell(15, 2, 2, 1.6, '#f6f2ff'); pic.set(17, 1, '#f6f2ff'); pic.set(15, 0, '#8a6aa8'); // 茶壶
    pic.ell(21, 3, 1.6, 1, '#f6c85a'); pic.set(21, 2, '#e8705a'); // 小蛋糕
    pic.outline('#5a3a3a'); put(lay, pic, C(lay, 0.3), lay.base + 8); spot(lay, 'feeder', C(lay, 0.3), lay.base + 8);
    // ---- 石井（喝水）：圆石井沿、小木顶、吊桶 ----
    const wl = a.spr(14, 16);
    wall_(wl, 1, 9, 13, 7, 'stone', '#b8b0c4'); wl.hl(2, 9, 11, '#5aa0d8'); wl.set(4, 9, '#bfe6ff');
    wl.vl(2, 3, 6, '#7a5a40'); wl.vl(12, 3, 6, '#7a5a40'); roofRows(wl, 7, 0, 3, 8, 14, '#8a5a3a', { snow: w }); wl.hl(3, 4, 9, '#5a4030');
    wl.vl(8, 5, 3, '#c8b088'); wl.rect(7, 7, 3, 2, '#8a6a4a');
    wl.outline('#3a2630'); put(lay, wl, C(lay, 0.635), lay.base + 3); spot(lay, 'fountain', C(lay, 0.635), lay.base + 4);
    // ---- 小菜园：一垄垄的胡萝卜和卷心菜 ----
    const gd = a.spr(22, 6);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 22; x++) gd.set(x + 1, y + 1, y % 2 ? '#7a5238' : '#8a6044');
    if (!w) for (let x = 2; x < 22; x += 3) { gd.set(x, 1, '#6ab84e'); gd.set(x + 1, 0, '#8ad86a'); gd.ell(x + 1, 4, 1.2, 0.9, s === 'autumn' ? '#e8903a' : '#9ad07a'); }
    gd.outline('#4a3022'); put(lay, gd, C(lay, 0.555), lay.base + 9); spot(lay, 'garden', C(lay, 0.555), lay.base + 9);
    // ---- 悬崖边的长椅（晒太阳看云）、看风景的地方 ----
    put(lay, a.bench(w), C(lay, 0.915), lay.base + 2); spot(lay, 'sunspot', C(lay, 0.915), lay.base + 3); spot(lay, 'lookout', C(lay, 0.09), lay.base + 3);
    spot(lay, 'lawn', C(lay, 0.42), lay.base + 9);
    // 路灯、树、开花的灌木、小花
    for (const f of [0.215, 0.69]) { put(lay, lampPost(SZ(lay, 16)), C(lay, f), lay.base + 1); lay.lights.push({ x: C(lay, f) - 1, y: lay.base - SZ(lay, 16) + 3, w: 3, h: 2, r: 7, col: WARM, glow: true }); }
    for (const [f, kind] of [[0.12, 'oak'], [0.39, 'apple'], [0.85, 'oak']]) put(lay, a.broadleaf(SZ(lay, kind === 'apple' ? 28 : 32), s, R, kind), C(lay, f), lay.base, { lantern: true });
    for (const [f, col] of [[0.17, '#f07a9a'], [0.25, '#ffd25a'], [0.52, '#b08af0'], [0.71, '#f07a9a'], [0.82, '#ffffff']]) put(lay, flowerBush(SZ(lay, 4), s, col), C(lay, f), lay.base + 3);
    for (let i = 0; i < 18; i++) put(lay, a.flower(s, R), C(lay, 0.1 + R() * 0.8), lay.base + 4 + Math.floor(R() * Math.max(2, rows - lay.base - 6)));
    // ---- 精修：背后一大朵一大朵的积云、岛中间断开一道缝（看得见下面的云海）+ 木栈桥、更多生活小物件、前景花草 ----
    for (const [f, ww, hh] of [[0.06, 40, 9], [0.24, 30, 7], [0.43, 46, 11], [0.66, 34, 8], [0.9, 44, 10]]) puffCloud(P, C(lay, f), gy - SZ(lay, 6), SZ(lay, ww), SZ(lay, hh), s !== 'winter');
    put(lay, beehive(), C(lay, 0.245), lay.base + 2);
    put(lay, laundry(SZ(lay, 22)), C(lay, 0.535), lay.base + 1);
    put(lay, crate(SZ(lay, 5)), C(lay, 0.415), lay.base + 2); put(lay, barrel(SZ(lay, 5)), C(lay, 0.43), lay.base + 3); put(lay, crate(SZ(lay, 4)), C(lay, 0.405), lay.base + 3);
    put(lay, mailbox(), C(lay, 0.512), lay.base + 4);
    for (const f of [0.58, 0.588, 0.597]) put(lay, sunflower(SZ(lay, 11) + Math.round(f * 100) % 3), C(lay, f), lay.base + 2);
    for (const f of [0.18, 0.46, 0.84]) put(lay, mossRock(SZ(lay, 6), '#b8b0c4', w ? '#ffffff' : '#7cbc62'), C(lay, f), lay.base + 6);
    fringe(lay, R, w ? ['#c8d4e4', '#ffffff'] : ['#5aa04e', '#a8de86'], !w);
    placeHomes(lay, [[0.2, 1], [0.27, 2], [0.36, 1], [0.6, 1], [0.665, 2], [0.885, 1], [0.15, 3], [0.94, 3]], 'wood');
  }

  // =====================================================================
  // 魔法学院
  // =====================================================================
  function academy(P, lay, R) {
    const a = A(), { put, spot, C, SZ, ground, GROUND, BLADES, mountains } = BH(), { cols, rows, gy } = lay;
    lay.noScatter = true;
    const s = lay.season, w = s === 'winter';
    // 山谷：远山（淡紫，有雾）
    mountains(P, lay, [[0.62, w ? '#c8cce0' : '#9a9cc0', w, 0.7], [0.4, w ? '#b8bcd4' : '#8a8cb4', w, 0.5]], 210);
    const stone = w ? '#c4c0d2' : '#b4aec4', stoneD = dk(stone, 0.25), slate = '#4e4a7e', base0 = gy - 1;
    // ---- 城墙后面的主楼：陡峭的石板瓦大屋顶（一排排瓦 + 老虎窗 + 烟囱）、一层层亮着的高拱窗、扶壁；更远处还有几座淡淡的塔 ----
    for (const [f, hf, tw0] of [[0.2, 0.92, 7], [0.4, 1.08, 6], [0.58, 1.12, 7], [0.8, 0.95, 6]]) {
      const cx = C(lay, f), th = Math.round(gy * 0.62 * hf), half = Math.floor(SZ(lay, tw0) / 2), top = gy - 1 - th, hz = '#c8c0dc';
      for (let y = top; y < gy - 1; y++) for (let x = -half; x <= half; x++) P.set(cx + x, y, x < -half / 2 ? A().mix(stone, hz, 0.55) : A().mix(stoneD, hz, 0.55));
      const rh = Math.round(half * 3.2); for (let k = 0; k < rh; k++) { const hw2 = Math.round((k / rh) * (half + 1)); for (let x = -hw2; x <= hw2; x++) P.set(cx + x, top - rh + k, A().mix(x < 0 ? lt(slate, 0.15) : slate, hz, 0.5)); }
      for (let y = top + 4; y < gy - 8; y += 7) P.set(cx, y, A().mix(WARM, hz, 0.3));
    }
    {
      const kc = C(lay, 0.47), kw = SZ(lay, 96), kH = Math.round(gy * 0.5), kTop = gy - 1 - kH;
      for (let y = kTop; y < gy - 1; y++) for (let x = -kw / 2; x <= kw / 2; x++) {
        const row = Math.floor(y / 3), off = (row & 1) * 3; let c = (y % 3 === 0 || (x + off + 60) % 6 === 0) ? dk(stone, 0.32) : a.hash(Math.floor((x + off + 60) / 6), row, 71) < 0.25 ? lt(stone, 0.06) : dk(stone, 0.08);
        if ((Math.round(x) + 200) % 16 < 2) c = lt(stone, 0.12); // 扶壁
        P.set(kc + x, y, c);
      }
      const rH = Math.round(kH * 0.75);
      for (let k = 0; k < rH; k++) {
        const hw2 = Math.round(kw / 2 * (0.55 + 0.45 * k / rH)), r = Math.floor(k / 2), sub = k % 2;
        for (let x = -hw2; x <= hw2; x++) { const tx = (x + 200 + (r % 2) * 2) % 4; let c = sub ? (tx === 0 ? dk(slate, 0.3) : dk(slate, 0.1)) : tx === 0 ? slate : lt(slate, 0.12); if (x > hw2 * 0.4) c = dk(c, 0.12); if (w && sub === 0 && x < hw2 * 0.5) c = '#ffffff'; P.set(kc + x, kTop - rH + k, c); }
      }
      P.hl(kc - Math.round(kw * 0.28), kTop - rH, Math.round(kw * 0.56), '#d8b85a');
      // 老虎窗 + 烟囱
      for (const fx of [-0.3, -0.1, 0.1, 0.3]) { const dx = kc + Math.round(kw * fx), dy = kTop - Math.round(rH * 0.45); P.rect(dx - 2, dy, 5, 5, lt(stone, 0.1)); for (let k = 0; k < 3; k++) P.hl(dx - 2 + k, dy - 1 - k, 5 - k * 2, dk(slate, 0.2)); P.rect(dx - 1, dy + 1, 3, 3, WARM); P.set(dx - 1, dy + 1, WARM2); lay.lights.push({ x: dx - 1, y: dy + 1, w: 3, h: 3, r: 4, col: WARM, glow: true }); }
      for (const fx of [-0.38, 0.22]) { const chx = kc + Math.round(kw * fx); P.rect(chx, kTop - rH - 3, 4, Math.round(rH * 0.5), dk(stone, 0.18)); P.hl(chx - 1, kTop - rH - 4, 6, dk(stone, 0.4)); }
      // 一层层的高拱窗（亮着）
      for (let row = 0; row < 2; row++) for (let x = -kw / 2 + 5; x < kw / 2 - 4; x += 8) {
        const y = kTop + 3 + row * 9; P.rect(kc + x - 1, y - 1, 5, 7, dk(stone, 0.4));
        for (let j = 0; j < 6; j++) for (let i = 0; i < 3; i++) P.set(kc + x + i, y + j, j < 2 ? WARM2 : j > 4 ? A().mix(WARM, '#e8a050', 0.35) : WARM);
        P.set(kc + x, y, dk(stone, 0.4)); P.set(kc + x + 2, y, dk(stone, 0.4)); P.vl(kc + x + 1, y + 1, 5, '#8a6a4a');
        lay.lights.push({ x: kc + x, y, w: 3, h: 6, r: 4, col: WARM, glow: true });
      }
    }
    // ---- 城墙（石块砌的，带垛口），中间是大礼堂 ----
    const wallH = Math.round(gy * 0.3), wx0 = C(lay, 0.04), wx1 = C(lay, 0.96);
    for (let y = base0 - wallH; y < base0; y++) for (let x = wx0; x < wx1; x++) {
      const row = Math.floor((y - base0) / 3), off = (row & 1) * 3;
      const c = (y - base0) % 3 === 0 || (x + off) % 6 === 0 ? stoneD : a.hash(Math.floor((x + off) / 6), row, 3) < 0.25 ? lt(stone, 0.08) : stone;
      P.set(x, y, c);
    }
    for (let x = wx0; x < wx1; x += 5) { P.rect(x, base0 - wallH - 3, 3, 3, stone); P.hl(x, base0 - wallH - 3, 3, lt(stone, 0.2)); }
    P.hl(wx0, base0 - wallH, wx1 - wx0, lt(stone, 0.15));
    // 城墙的扶壁（往外凸，左面受光）、一片片的常春藤、窄箭窗
    for (let x = wx0 + 10; x < wx1 - 6; x += 22) { for (let y = base0 - wallH + 2; y < base0; y++) { P.set(x, y, lt(stone, 0.22)); P.set(x + 1, y, lt(stone, 0.1)); P.set(x + 2, y, dk(stone, 0.28)); } for (let k = 0; k < 3; k++) P.hl(x - 1 + k, base0 - wallH + 1 - k, 4 - k, lt(stone, 0.15)); }
    if (!w) for (let x = wx0 + 4; x < wx1; x += 37) { const ih = 4 + Math.floor(a.hash(x, 5) * wallH * 0.7); for (let k = 0; k < ih; k++) for (let q = -2; q <= 2; q++) if (a.hash(x + q, k, 72) < 0.55 - Math.abs(q) * 0.12) P.set(x + q, base0 - 1 - k, a.hash(x + q, k, 73) < 0.3 ? '#7ab868' : '#4a8a4a'); }
    // 墙上的拱窗（亮着暖光）
    for (let x = wx0 + 6; x < wx1 - 6; x += 11) {
      if (a.hash(x, 7) < 0.25) continue;
      const y = base0 - wallH + 4; P.rect(x - 1, y - 1, 5, 7, stoneD);
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) P.set(x + i, y + j, j < 2 ? WARM2 : WARM);
      P.set(x, y, stoneD); P.set(x + 2, y, stoneD); P.vl(x + 1, y + 1, 4, '#8a6a4a');
    }
    // ---- 尖塔：圆柱体（左亮右暗）、石块纹、窄长拱窗、鳞片瓦的尖顶、金色塔尖和三角旗 ----
    const towers = [[0.07, 0.55, 8], [0.15, 0.82, 11], [0.25, 0.62, 9], [0.33, 0.95, 12, 'owl'], [0.6, 0.7, 10], [0.69, 1.0, 13, 'dome'], [0.79, 0.62, 9], [0.88, 0.86, 11], [0.95, 0.52, 8]];
    const banner = ['#7a3a6a', '#3a5a8a', '#8a6a2a'];
    for (const [f, hf, tw0, kind] of towers) {
      const cx = C(lay, f), th = Math.round(gy * 0.68 * hf), tw = SZ(lay, tw0), top = base0 - th, half = Math.floor(tw / 2);
      for (let y = top; y < base0; y++) for (let x = -half; x <= half; x++) {
        const nx = x / half, row = Math.floor(y / 3), off = (row & 1) * 2;
        let c = nx < -0.5 ? lt(stone, 0.18) : nx > 0.45 ? dk(stone, 0.22) : stone;
        if (y % 3 === 0 || (x + off + 20) % 4 === 0) c = dk(c, 0.14);
        P.set(cx + x, y, c);
      }
      for (let x = -half - 1; x <= half + 1; x++) P.set(cx + x, top, dk(stone, 0.3));
      // 尖顶
      if (kind === 'dome') {
        // 观星塔：圆顶 + 伸出来的望远镜
        P.ell(cx, top - 1, half + 1, half, (nx, ny) => (ny > 0.1 ? null : nx < -0.4 ? '#8a9ad8' : nx > 0.5 ? '#4a5a98' : '#6a7ac0'));
        for (let k = 0; k < half; k++) P.set(cx + k, top - half - 1 + Math.round(k * 0.4), '#d8b85a');
        P.set(cx + half, top - Math.round(half * 0.6) - 1, '#fff2b0');
      } else {
        const rh = Math.round(tw * 1.5);
        for (let k = 0; k < rh; k++) {
          const hw2 = Math.round((k / rh) * (half + 2));
          for (let x = -hw2; x <= hw2; x++) { let c = (k % 3 === 2) ? dk(slate, 0.25) : x < -hw2 / 3 ? lt(slate, 0.2) : x > hw2 / 2 ? dk(slate, 0.15) : slate; if (w && k > rh * 0.45 && x < 0 && a.hash(x, k, 5) < 0.6) c = '#ffffff'; P.set(cx + x, top - rh + k, c); }
        }
        P.vl(cx, top - rh - 3, 3, '#d8b85a'); P.set(cx, top - rh - 4, '#fff2b0');
        const bc = banner[Math.floor(f * 10) % 3]; for (let k = 0; k < 4; k++) { P.set(cx + 1 + k, top - rh - 3 + Math.round(k * 0.3), bc); if (k < 3) P.set(cx + 1 + k, top - rh - 2 + Math.round(k * 0.3), dk(bc, 0.2)); }
      }
      // 窄长拱窗（亮着）+ 猫头鹰塔的圆洞
      for (let y = top + 4; y < base0 - 6; y += 8) {
        if (kind === 'owl') { P.ell(cx, y + 1, 1.4, 1.4, '#2a2236'); if ((y >> 3) % 2) { P.set(cx, y + 1, '#c8a878'); P.set(cx - 1, y, '#c8a878'); P.set(cx + 1, y, '#c8a878'); P.set(cx, y + 1, '#ffe08a'); } continue; }
        P.rect(cx - 1, y, 2, 4, WARM); P.set(cx - 1, y, WARM2); P.hl(cx - 2, y + 4, 4, dk(stone, 0.3));
        lay.lights.push({ x: cx - 1, y, w: 2, h: 3, r: 3, col: WARM, glow: true });
      }
    }
    // ---- 大礼堂正面：尖拱大门、玫瑰窗、两边垂下的旗帜 ----
    const hc = C(lay, 0.47), hwid = SZ(lay, 30), hH = Math.round(gy * 0.58), hTop = base0 - hH;
    for (let y = hTop; y < base0; y++) for (let x = -hwid / 2; x <= hwid / 2; x++) { const row = Math.floor(y / 3), off = (row & 1) * 3; P.set(hc + x, y, y % 3 === 0 || (x + off + 30) % 6 === 0 ? stoneD : x < -hwid / 3 ? lt(stone, 0.12) : stone); }
    // 山墙尖顶
    for (let k = 0; k < Math.round(hwid * 0.45); k++) { const hw2 = Math.round(k * (hwid / 2 + 2) / (hwid * 0.45)); for (let x = -hw2; x <= hw2; x++) P.set(hc + x, hTop - Math.round(hwid * 0.45) + k, k % 3 === 2 ? dk(slate, 0.25) : x < 0 ? lt(slate, 0.15) : slate); }
    P.vl(hc, hTop - Math.round(hwid * 0.45) - 4, 4, '#d8b85a'); P.set(hc, hTop - Math.round(hwid * 0.45) - 5, '#fff2b0');
    // 玫瑰窗（彩色玻璃）
    const rw = Math.max(3, Math.round(hwid * 0.16)), ry = hTop + rw + 2;
    P.ell(hc, ry, rw + 1, rw + 1, stoneD);
    P.ell(hc, ry, rw, rw, (nx, ny) => { const ang = Math.atan2(ny, nx), seg = Math.floor((ang + Math.PI) / (Math.PI / 4)); return nx * nx + ny * ny < 0.12 ? '#fff2b0' : ['#e86a7a', '#6a9ae8', '#f6c85a', '#8ad87a'][seg % 4]; });
    lay.lights.push({ x: hc - rw, y: ry - rw, w: rw * 2, h: rw * 2, r: rw + 4, col: '#f6c8ff', glow: true });
    // 尖拱大门
    const gw = Math.round(hwid * 0.28), gh2 = Math.round(hH * 0.45);
    for (let y = 0; y < gh2; y++) { const ww2 = y < gw / 2 ? Math.round(Math.sqrt(Math.max(0, (gw / 2) ** 2 - (gw / 2 - y) ** 2))) : Math.round(gw / 2); for (let x = -ww2; x <= ww2; x++) P.set(hc + x, base0 - gh2 + y, Math.abs(x) === ww2 ? dk(stone, 0.4) : x === 0 ? '#3a2418' : x % 2 ? '#7a4a2e' : '#8a5a38'); }
    P.set(hc - 2, base0 - Math.round(gh2 * 0.45), '#ffd25a'); P.set(hc + 2, base0 - Math.round(gh2 * 0.45), '#ffd25a');
    // 旗帜
    for (const sx of [-1, 1]) { const bx = hc + sx * Math.round(hwid * 0.33), bc = sx < 0 ? '#7a3a6a' : '#3a5a8a'; for (let y = 0; y < Math.round(hH * 0.42); y++) for (let x = -1; x <= 1; x++) P.set(bx + x, hTop + 3 + y, y === Math.round(hH * 0.42) - 1 && x === 0 ? null : x === -1 ? lt(bc, 0.15) : bc); P.set(bx, hTop + 3 + Math.round(hH * 0.18), '#f6d25a'); P.hl(bx - 2, hTop + 2, 5, '#d8b85a'); }
    // ---- 地面：石板庭院 ----
    ground(P, lay, w ? GROUND.winter : ['#7cb862', '#6aa654', '#8ec870', '#f0c0d8'], { path: ['#c8c0d4', '#b0a8c0', '#948ca8'], blades: BLADES[s] });
    stonePath(P, lay, w, ['#6e6a80', '#8e8aa0', '#aaa6bc', '#cac6da']);
    if (!w) flowerPatches(P, lay, R, ['#f0b0d8', '#ffffff', '#c8a0ff', '#ffd36a'], 12);
    // 飘着的蜡烛（白天也亮着，轻轻有光晕）
    for (let i = 0; i < 26; i++) { const x = Math.round(C(lay, 0.04) + R() * cols * 0.92), y = Math.round(gy * (0.1 + R() * 0.42)); P.rect(x, y, 1, 3, '#f6f0e4'); P.set(x, y + 2, '#e0d8c8'); P.set(x, y - 1, '#ffcf5a'); lay.lights.push({ x, y: y - 1, w: 1, h: 1, r: 3, col: '#ffcf5a', glow: true, always: true }); }
    lay.dark = false;
    // ---- 药草温室：铁框玻璃屋，里面的植物在发光 ----
    const ghH = SZ(lay, 22), ghW = Math.round(ghH * 1.6), gs = a.spr(ghW, ghH);
    for (let y = 0; y < ghH; y++) { const roofY = Math.round(ghH * 0.38), half = y < roofY ? Math.round((y / roofY) * ghW / 2) : Math.round(ghW / 2) - 1; for (let x = Math.round(ghW / 2 - half); x < ghW / 2 + half; x++) { const frame = (x % 5 === 0) || y === roofY || y === ghH - 1; let c = frame ? '#4a5a6a' : y > ghH * 0.62 ? (a.hash(x, y, 4) < 0.3 ? '#a8f0a0' : '#5aa86a') : (x + y) % 9 < 2 ? '#f4fcff' : '#c8eaf0'; gs.set(x + 1, y + 1, c); } }
    for (let k = 0; k < 5; k++) gs.ell(5 + k * (ghW - 8) / 4, ghH - 4, 1.4, 2.2, k % 2 ? '#c8f0a0' : '#f0b0e8');
    gs.outline('#2e3a48'); put(lay, gs, C(lay, 0.17), lay.base + 2); spot(lay, 'garden', C(lay, 0.17), lay.base + 4);
    lay.lights.push({ x: C(lay, 0.17) - 4, y: lay.base - 4, w: 8, h: 3, r: 8, col: '#b8f0a0', glow: true });
    // ---- 坩埚（吃饭的地方）：三脚铁锅、绿泡泡、底下的火 ----
    const cs = a.spr(14, 12); cs.ell(7, 6, 6, 4, (nx, ny) => (ny < -0.45 ? (nx < 0 ? '#9af08a' : '#6ad05a') : nx < -0.5 ? '#5a5268' : '#3a3446')); cs.hl(1, 3, 13, '#5a5268');
    cs.rect(2, 10, 2, 2, '#3a3446'); cs.rect(10, 10, 2, 2, '#3a3446'); cs.set(5, 1, '#c8ffb0'); cs.set(9, 0, '#c8ffb0'); cs.set(7, 2, '#ffffff');
    for (let k = 0; k < 4; k++) cs.set(5 + k, 11, k % 2 ? '#ffb03a' : '#ff6a3a');
    cs.outline('#1a1620'); put(lay, cs, C(lay, 0.33), lay.base + 6); spot(lay, 'feeder', C(lay, 0.33), lay.base + 7); lay.cauldron = { c: C(lay, 0.33), r: lay.base - 4 };
    lay.lights.push({ x: C(lay, 0.33) - 3, y: lay.base - 2, w: 6, h: 2, r: 7, col: '#7af06a', glow: true, always: true });
    // ---- 水晶喷泉（喝水）：八角石池、水面高光、中间发光的水晶 ----
    const fs = a.spr(24, 15); fs.ell(12, 12, 11, 3.4, (nx, ny) => (nx * nx + ny * ny > 0.62 ? (ny < 0 ? '#d4cce0' : '#a8a0b8') : ny < -0.2 ? '#8ad0f6' : '#5aa8e0')); fs.set(7, 11, '#ffffff'); fs.set(15, 12, '#d8f4ff');
    fs.rect(11, 4, 3, 7, '#c4bcd2'); fs.vl(13, 4, 7, '#a8a0b8'); fs.ell(12, 3, 2, 3, (nx) => (nx < 0 ? '#e0fcff' : '#8ae0ff')); fs.set(11, 1, '#ffffff');
    fs.outline('#4a4660'); put(lay, fs, C(lay, 0.565), lay.base + 4); spot(lay, 'fountain', C(lay, 0.565), lay.base + 5);
    lay.lights.push({ x: C(lay, 0.565) - 2, y: lay.base - 13, w: 3, h: 4, r: 8, col: '#a8f0ff', glow: true, always: true });
    // ---- 修剪成圆球的树篱、铁灯柱、书堆、扫帚架、南瓜（秋天） ----
    for (const f of [0.085, 0.42, 0.715, 0.93]) put(lay, flowerBush(SZ(lay, 5), s, '#f0b0d0'), C(lay, f), lay.base + 2);
    for (const f of [0.26, 0.65, 0.84]) { put(lay, lampPost(SZ(lay, 17)), C(lay, f), lay.base + 1); lay.lights.push({ x: C(lay, f) - 1, y: lay.base - SZ(lay, 17) + 3, w: 3, h: 2, r: 7, col: WARM, glow: true }); }
    const bk = a.spr(11, 9); const BC = ['#c84a5a', '#4a6ac8', '#e8b84a', '#5a9a5a', '#8a5ac8']; for (let k = 0; k < 5; k++) { bk.rect(1 + (k % 2), 8 - k * 1.6, 9, 1.6, BC[k]); bk.set(2 + (k % 2), 8 - k * 1.6, '#f6eedc'); } bk.outline('#2a2030'); put(lay, bk, C(lay, 0.4), lay.base + 9);
    const br = a.spr(14, 14); br.rect(1, 13, 14, 2, '#6a4a3a'); for (let k = 0; k < 3; k++) { br.vl(3 + k * 4, 2, 11, '#8a6a4a'); for (let j = 0; j < 3; j++) br.hl(2 + k * 4, j, 3, j % 2 ? '#c8a04a' : '#e0c06a'); } br.outline('#3a2630'); put(lay, br, C(lay, 0.755), lay.base + 2);
    if (s === 'autumn') for (const f of [0.3, 0.52, 0.8]) put(lay, a.pumpkin(), C(lay, f), lay.base + 7);
    spot(lay, 'lawn', C(lay, 0.47), lay.base + 9); spot(lay, 'sunspot', C(lay, 0.86), lay.base + 3); spot(lay, 'lookout', C(lay, 0.755), lay.base + 3);
    for (const f of [0.025, 0.975]) put(lay, a.pine(SZ(lay, 40), s, R, w), C(lay, f), lay.base);
    // ---- 精修：城墙脚下一溜修剪过的树篱、几棵大树和松树、南瓜地、晾着的魔法书、前景花草 ----
    const hedge = w ? '#8aa094' : '#4f8a46';
    for (let x = C(lay, 0.04); x < C(lay, 0.96); x++) { const hh2 = 3 + Math.round(Math.abs(Math.sin(x / 5)) * 1.5); for (let k = 0; k < hh2; k++) P.set(x, gy - 1 - k, k === hh2 - 1 ? lt(hedge, 0.3) : k === hh2 - 2 ? lt(hedge, 0.12) : a.dith(x, k, 0.3) ? dk(hedge, 0.15) : hedge); }
    for (const [f, kind] of [[0.035, 'pine'], [0.285, 'oak'], [0.54, 'oak'], [0.975, 'pine']]) put(lay, kind === 'pine' ? a.pine(SZ(lay, 34), s, R) : a.broadleaf(SZ(lay, 30), s === 'summer' ? 'autumn' : s, R, 'oak'), C(lay, f), lay.base, { lantern: true });
    if (!w) for (let i = 0; i < 3; i++) put(lay, a.pumpkin(), C(lay, 0.43 + i * 0.014), lay.base + 3 + (i % 2) * 2);
    put(lay, crate(SZ(lay, 5)), C(lay, 0.735), lay.base + 2); put(lay, barrel(SZ(lay, 5)), C(lay, 0.745), lay.base + 3);
    for (const f of [0.17, 0.66, 0.86]) put(lay, mossRock(SZ(lay, 6), '#a8a2b8', w ? '#ffffff' : '#6aa04e'), C(lay, f), lay.base + 7);
    fringe(lay, R, w ? ['#c8d4e4', '#ffffff'] : ['#4f8a46', '#9ad07a'], !w);
    placeHomes(lay, [[0.22, 1], [0.37, 1], [0.62, 1], [0.8, 1], [0.9, 2], [0.12, 2], [0.5, 2], [0.7, 3]], 'stone');
  }

  // =====================================================================
  // 地底森林
  // =====================================================================
  function undergrove(P, lay, R) {
    const a = A(), { put, spot, C, SZ, ground } = BH(), { cols, rows, gy } = lay;
    lay.noScatter = true; lay.cave = true;
    const ch0 = C(lay, 0.45), ch1 = C(lay, 0.62);
    // ---- 岩壁：一层层的岩层纹路，越往上越暗；远处有雾里的石柱 ----
    for (let y = 0; y < gy; y++) for (let x = 0; x < cols; x++) {
      const n = a.noise(x / 9, y / 5, 301), strata = Math.sin(y / 2.6 + a.noise(x / 30, 1, 7) * 4) > 0.82;
      let c = n < 0.35 ? '#2c2440' : n < 0.7 ? '#362c4a' : '#413654';
      if (strata) c = '#4a3e5e';
      c = a.mix(c, '#151021', Math.max(0, 1 - y / (gy * 0.7)) * 0.45);
      P.set(x, y, c);
    }
    for (const f of [0.1, 0.27, 0.36, 0.72, 0.84, 0.95]) { const cx = C(lay, f), pw = SZ(lay, 6) + Math.round(f * 7) % 3; for (let y = 0; y < gy; y++) for (let x = -pw; x <= pw; x++) if (a.hash(cx + x, y, 2) < 0.92) P.set(cx + x, y, a.mix(x < 0 ? '#5a5478' : '#4a4468', '#8a9ad0', 0.18 + 0.2 * (y / gy))); }
    // 石柱重画：带竖向凹槽（亮暗相间）的柱身、上下两块方石（柱头 / 柱础）、裂缝、缠着的树根和苔藓
    for (const f of [0.1, 0.27, 0.36, 0.72, 0.84, 0.95]) {
      const cx = C(lay, f), pw = SZ(lay, 5) + Math.round(f * 7) % 2, top = Math.round(gy * 0.12);
      for (let y = top; y < gy; y++) for (let x = -pw; x <= pw; x++) {
        const nx = x / pw, groove = (x + pw) % 3 === 0;
        let c = nx < -0.6 ? '#6a5e80' : nx < -0.1 ? '#5a4e70' : nx < 0.5 ? '#4a4060' : '#3a3250';
        if (groove) c = a.mix(c, '#1a1428', 0.35);
        if (a.hash(x, y, 81) < 0.04) c = '#2a2238';
        c = a.mix(c, '#151021', Math.max(0, 1 - y / (gy * 0.8)) * 0.35);
        P.set(cx + x, y, c);
      }
      for (const [yy, hgt] of [[top, 3], [gy - 4, 4]]) for (let y = yy; y < yy + hgt; y++) for (let x = -pw - 2; x <= pw + 2; x++) P.set(cx + x, y, y === yy ? '#7a6e92' : x < 0 ? '#5a4e72' : '#3e3456');
      let x = cx + 1, y = top + 6; for (let k = 0; k < SZ(lay, 10); k++) { P.set(x, y, '#1e182c'); y++; if (a.hash(k, f * 10, 82) < 0.4) x += a.hash(k, 2, 83) < 0.5 ? -1 : 1; }
      for (let y = top + 3; y < gy - 4; y++) { const rx = cx - pw + Math.round((Math.sin(y / 4 + f * 9) + 1) * pw); if (a.hash(y, f * 3, 84) < 0.7) P.set(rx, y, y % 5 ? '#5a4834' : '#7a6248'); if (y > gy * 0.55 && a.hash(y, f, 85) < 0.5) P.set(cx - pw + Math.floor(a.hash(y, 1, 86) * pw * 2), y, '#3e7a5a'); }
    }
    // ---- 裂谷：越深越蓝越暗，几层薄雾，两边是带亮边的崖面，深处有小光点 ----
    for (let y = 0; y < gy; y++) {
      const e0 = Math.round(ch0 + Math.sin(y / 5) * 3), e1 = Math.round(ch1 + Math.sin(y / 6 + 1) * 3);
      for (let x = e0; x <= e1; x++) {
        let c = a.mix('#4a6a9a', '#0a1022', Math.min(1, (y / gy) * 1.05));
        if (Math.sin(y / 3.2 + x / 17) > 0.85 || (y % 11 < 2 && a.dith(x, y, 0.35))) c = a.mix(c, '#a8c8ec', 0.2);
        if (x < e0 + 2) c = x === e0 ? '#1a1428' : '#6a5a88';
        if (x > e1 - 2) c = x === e1 ? '#1a1428' : '#3a3058';
        P.set(x, y, c);
      }
    }
    for (let k = 0; k < 6; k++) { const y = Math.round(gy * (0.2 + k * 0.13)), x0 = k % 2 ? ch0 + 2 : ch1 - SZ(lay, 12) - 2, lw = SZ(lay, 12); P.rect(x0, y, lw, 2, '#4a3e62'); P.hl(x0, y, lw, '#7a9a6a'); if (k % 2 === 0) { P.set(x0 + 3, y - 1, '#ffc86a'); lay.lights.push({ x: x0 + 3, y: y - 1, w: 1, h: 1, r: 2, col: '#ffc86a', glow: true }); } }
    // ---- 钟乳石：从顶上垂下，左边受光 ----
    for (let x = 2; x < cols; x += 4 + Math.floor(R() * 8)) { if (x > ch0 - 2 && x < ch1 + 2) continue; const len = 2 + Math.floor(R() * Math.min(12, gy * 0.22)); for (let k = 0; k < len; k++) { const ww = Math.max(0, Math.round((1 - k / len) * 2)); for (let d = -ww; d <= ww; d++) P.set(x + d, k, d < 0 ? '#6a5e80' : d > 0 ? '#2e2640' : '#4e4466'); } }
    // ---- 垂下来的树根，末端挂着发光的小光球 ----
    for (let x = 5; x < cols; x += 6 + Math.floor(R() * 10)) {
      const len = 4 + Math.floor(R() * Math.min(20, gy * 0.42));
      for (let k = 0; k < len; k++) { const xx = x + Math.round(Math.sin(k / 3 + x) * 0.8); P.set(xx, k, k % 5 === 4 ? '#7a6248' : '#5a4834'); if (k > 3 && k % 6 === 0) P.set(xx + 1, k, '#6a8a5a'); }
      if (R() < 0.6) { const bx = x + Math.round(Math.sin(len / 3 + x) * 0.8), col = R() < 0.5 ? '#9af0d0' : '#ffd6f0'; P.set(bx, len, col); P.set(bx, len + 1, a.mix(col, '#ffffff', 0.4)); lay.lights.push({ x: bx, y: len, w: 1, h: 2, r: 4, col, glow: true }); }
    }
    // ---- 墙上的晶簇（多面，亮面 + 暗面） ----
    const crystal = (x, y, sz, col) => { for (let k = 0; k < 3; k++) { const cx = x + (k - 1) * Math.round(sz * 0.7), hgt = Math.round(sz * (k === 1 ? 1.6 : 1)); for (let j = 0; j < hgt; j++) { const ww = Math.max(0, Math.round((j / hgt) * sz * 0.5)); for (let d = -ww; d <= ww; d++) P.set(cx + d, y - hgt + j, d < 0 ? a.mix(col, '#ffffff', 0.45) : d === 0 ? col : a.mix(col, '#20183a', 0.35)); } } lay.lights.push({ x: x - 1, y: y - sz, w: 3, h: sz, r: sz + 3, col, glow: true }); };
    for (let i = 0; i < 6; i++) { const x = C(lay, 0.06 + R() * 0.88); if (x > ch0 - 4 && x < ch1 + 4) continue; crystal(x, Math.round(gy * (0.35 + R() * 0.45)), SZ(lay, 3), R() < 0.5 ? '#8ae0ff' : '#c8a0ff'); }
    // ---- 地面：深绿的苔藓，夹着会发光的小点 ----
    ground(P, lay, ['#3a5a46', '#304e3e', '#48705a', '#5a9a7a'], { blades: ['#2e5a42', '#5ab08a'] });
    // 苔藓地精修：一块块深浅不同的苔藓垫、横穿地面的老树根（上亮下暗）、几条暗色石板路，发光小点只在苔藓垫上
    for (let i = 0; i < 30; i++) { const cx = Math.floor(R() * cols), cy = gy + 2 + Math.floor(R() * (rows - gy - 3)), rx = 4 + R() * 10, ry = 1.5 + R() * 2.5, col = R() < 0.5 ? '#46705a' : '#2a463a'; P.ell(cx, cy, rx, ry, (nx, ny, x, y) => (a.dith(cx + x, cy + y, 1 - (nx * nx + ny * ny)) ? col : null)); }
    for (let k = 0; k < 5; k++) { let x = Math.floor(R() * cols), y = gy + 2 + Math.floor(R() * 4); const len = 20 + Math.floor(R() * 40), dir = R() < 0.5 ? -1 : 1; for (let i = 0; i < len; i++) { P.set(x, y, '#8a6a4c'); P.set(x, y + 1, '#4a3424'); if (i % 9 === 4) P.set(x, y - 1, '#a8885e'); x += dir; if (R() < 0.18) y += R() < 0.6 ? 1 : -1; y = Math.max(gy + 1, Math.min(rows - 3, y)); } }
    // ---- 吊桥：两边木桩 + 下垂的绳索扶手 + 木板 ----
    const by = gy - 1, mid = (ch0 + ch1) / 2, span = (ch1 - ch0) / 2 + 3;
    for (let x = ch0 - 3; x <= ch1 + 3; x++) { const sag = Math.round((1 - ((x - mid) / span) ** 2) * 2); P.set(x, by + sag, x % 2 ? '#a8784a' : '#c8945a'); P.set(x, by + sag + 1, '#5a3a24'); P.set(x, by - 4 + sag, '#d8b888'); if (x % 3 === 0) for (let k = 1; k < 4; k++) P.set(x, by - 4 + sag + k, '#a8906a'); }
    for (const px of [ch0 - 4, ch1 + 4]) { P.rect(px, by - 6, 2, 7, '#6a4a32'); P.set(px, by - 7, '#ffcf6a'); lay.lights.push({ x: px, y: by - 7, w: 2, h: 1, r: 6, col: '#ffcf6a', glow: true }); }
    // ---- 发光的巨蘑菇：茎上有菌环，伞盖有渐变和斑点，底下有菌褶 ----
    const shroom = (h, cap, spotC) => {
      const s = a.spr(Math.round(h * 0.95), h), cw = s.w, sx = Math.round(cw / 2), capY = Math.round(h * 0.34);
      for (let y = capY; y < h; y++) { const ww = 1 + (y > h - 4 ? 1 : 0) + (y > h - 2 ? 1 : 0); for (let d = -ww; d <= ww + 1; d++) { let c = d < 0 ? '#fff4e0' : d > ww - 1 ? '#c8b49a' : '#ecdcc2'; if ((y + d * 3) % 7 === 0) c = a.mix(c, '#a8907a', 0.4); if (y > h - 5 && a.hash(d, y, 87) < 0.4) c = '#5aa07a'; s.set(sx + d, y, c); } }
      s.hl(sx - 3, capY + Math.round(h * 0.18), 8, '#f6ead4'); s.hl(sx - 2, capY + Math.round(h * 0.18) + 1, 6, '#c8b49a'); // 菌环
      s.ell(sx + 1, capY, cw / 2 - 1, h * 0.3, (nx, ny) => (ny > 0.5 ? null : ny > 0.28 ? (Math.round(nx * 20) % 2 ? a.mix(cap, '#1a1428', 0.4) : a.mix(cap, '#ffffff', 0.15)) : ny < -0.55 || nx < -0.55 ? a.mix(cap, '#ffffff', 0.35) : nx > 0.5 ? a.mix(cap, '#1a1428', 0.18) : cap));
      for (let k = 0; k < 7; k++) s.ell(4 + (k * 5.3) % (cw - 6), capY - h * 0.16 + (k % 3) * 2, 1.2, 0.9, spotC);
      return s.outline('#1a1428');
    };
    for (const [f, hh, cap, sc] of [[0.055, 48, '#4a7ad0', '#b8f4ff'], [0.19, 34, '#9a5ad0', '#ffd8ff'], [0.32, 56, '#2ea88a', '#c8ffe8'], [0.735, 46, '#d05a8a', '#ffe0f0'], [0.905, 38, '#4a7ad0', '#b8f4ff']]) {
      const hh2 = SZ(lay, hh), sh = shroom(hh2, cap, sc); put(lay, sh, C(lay, f), lay.base, { lantern: true });
      lay.lights.push({ x: C(lay, f) - 5, y: lay.base - Math.round(hh2 * 0.66), w: 10, h: 3, r: 11, col: sc, glow: true });
    }
    // ---- 古老的石拱门（长满苔藓） ----
    const ah = SZ(lay, 26), aw = Math.round(ah * 0.9), as = a.spr(aw, ah);
    for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) { const dx = x - aw / 2, inner = Math.sqrt(dx * dx + Math.max(0, (ah * 0.45 - y)) ** 2 * 1.4); const inArch = y > ah * 0.25 && Math.abs(dx) < aw * 0.3 || inner < aw * 0.3 && y <= ah * 0.45; if (inArch) continue; const row = Math.floor(y / 3); let c = y % 3 === 0 || (x + (row & 1) * 2) % 5 === 0 ? '#5e5674' : x < aw * 0.2 ? '#9a92b0' : '#7e7696'; if (a.hash(x, y, 8) < (y < 4 ? 0.5 : 0.12)) c = '#5a9a5a'; as.set(x + 1, y + 1, c); }
    as.outline('#231c30'); put(lay, as, C(lay, 0.265), lay.base + 1);
    put(lay, as, C(lay, 0.825), lay.base + 1, { flip: true });
    // ---- 篝火 + 一锅咕嘟咕嘟的蘑菇汤（吃饭的地方） ----
    const pot = a.spr(16, 15); pot.vl(1, 0, 13, '#6a4a32'); pot.vl(15, 0, 13, '#6a4a32'); pot.hl(1, 0, 15, '#6a4a32'); pot.vl(8, 1, 3, '#3a2a22');
    pot.ell(8, 8, 5, 3.4, (nx, ny) => (ny < -0.4 ? (nx < 0 ? '#f0c06a' : '#d89a4a') : nx < -0.5 ? '#5a5268' : '#3a3446')); pot.set(6, 5, '#d05a5a'); pot.set(9, 5, '#f6eedc'); pot.set(10, 6, '#7ac05a');
    for (let k = 0; k < 6; k++) { pot.set(3 + k * 2, 14, k % 2 ? '#ffb03a' : '#ff6a3a'); pot.set(4 + k * 2, 13, '#ffe08a'); } pot.hl(2, 14, 13, '#5a3a24');
    pot.outline('#1a1418'); put(lay, pot, C(lay, 0.535), lay.base + 8); spot(lay, 'feeder', C(lay, 0.535), lay.base + 9);
    lay.lights.push({ x: C(lay, 0.535) - 3, y: lay.base + 6, w: 6, h: 2, r: 11, col: '#ffb03a', glow: true });
    lay.smoke = { c: C(lay, 0.535), r: lay.base - 4 };
    // ---- 地下泉（喝水）：深浅两层水，水面上有发光的倒影 ----
    P.ell(C(lay, 0.12), lay.base + 6, cols * 0.045, 2.8, (nx, ny) => (nx * nx + ny * ny > 0.72 ? '#5a7a6a' : ny < -0.2 ? '#4aa0c8' : '#2e7aa8'));
    for (let k = 0; k < 4; k++) P.set(C(lay, 0.1) + k * 3, lay.base + 5 + (k % 2), '#b8f4ff');
    spot(lay, 'fountain', C(lay, 0.12), lay.base + 5);
    // ---- 地上的小晶簇和发光苔藓、孢子 ----
    for (const f of [0.15, 0.42, 0.68, 0.96]) { const cs2 = a.spr(7, 7); for (let k = 0; k < 3; k++) { const hgt = 3 + (k === 1 ? 3 : 1); for (let j = 0; j < hgt; j++) cs2.set(2 + k * 2, 7 - j, k === 0 ? '#e0f8ff' : k === 1 ? '#8ae0ff' : '#5a9ad8'); } cs2.outline('#1a2440'); put(lay, cs2, C(lay, f), lay.base + 3); lay.lights.push({ x: C(lay, f) - 1, y: lay.base - 3, w: 3, h: 3, r: 5, col: '#8ae0ff', glow: true }); }
    for (let i = 0; i < 46; i++) { const x = Math.floor(R() * cols), y = lay.base + Math.floor(R() * (rows - lay.base - 1)); P.set(x, y, i % 3 ? '#7af0c8' : '#ffd6f0'); if (i % 4 === 0) lay.lights.push({ x, y, w: 1, h: 1, r: 2, col: '#7af0c8', glow: true }); }
    spot(lay, 'lawn', C(lay, 0.6), lay.base + 9); spot(lay, 'sunspot', C(lay, 0.44), lay.base + 2); spot(lay, 'lookout', C(lay, 0.555), lay.base + 1);
    // ---- 精修：前景的蕨和发光小花、长苔藓的石头、一串串挂着的小灯笼 ----
    for (const f of [0.08, 0.27, 0.52, 0.73, 0.88]) put(lay, mossRock(SZ(lay, 7), '#5a5068', '#4a8a5a'), C(lay, f), lay.base + 5 + Math.round(f * 10) % 4);
    for (let i = 0; i < 26; i++) { const gl = a.spr(3, 4), col = ['#8af0e0', '#c8a0ff', '#ffb0d8'][i % 3]; gl.vl(2, 2, 3, '#3a6a4a'); gl.set(2, 1, col); gl.set(1, 1, lt(col, 0.3)); gl.set(3, 1, col); gl.set(2, 0, lt(col, 0.5)); put(lay, gl, C(lay, 0.03 + R() * 0.94), lay.base + 3 + Math.floor(R() * Math.max(2, rows - lay.base - 4))); }
    for (const [f0, f1] of [[0.16, 0.26], [0.79, 0.9]]) { const x0 = C(lay, f0), x1 = C(lay, f1); for (let x = x0; x <= x1; x++) { const y = Math.round(gy * 0.22 + Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * SZ(lay, 6)); P.set(x, y, '#6a5040'); if ((x - x0) % 6 === 3) { P.set(x, y + 1, '#6a5040'); P.rect(x - 1, y + 2, 3, 3, '#ffcf7a'); P.set(x, y + 3, '#fff0c0'); lay.lights.push({ x: x - 1, y: y + 2, w: 3, h: 3, r: 5, col: '#ffcf7a', glow: true, always: true }); } } }
    fringe(lay, R, ['#3e7a5a', '#7ad0a0'], true);
    placeHomes(lay, [[0.135, 2], [0.235, 1], [0.39, 2], [0.69, 1], [0.78, 2], [0.95, 1], [0.6, 3], [0.3, 3]], 'shroom');
  }

  Object.assign(PP.BIOMES, { skyisle, academy, undergrove });
  // 给小岛视图用的同一套小部件（风格和「我的」三处一致）
  PP.WORLD_KIT = { cottage, mailbox, sunflower, crate, barrel, beehive, laundry, puffCloud, tallGrass, flowerBush, lampPost, window_, door_, dk, lt };
})();
