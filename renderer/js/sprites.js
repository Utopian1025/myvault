// 像素渲染引擎：所有宠物外形都是程序化“画”出来的，
// 这样每只宠物的每个表情、姿势、视线都能实时组合，而不是死板的帧动画。
(function () {
  const PP = (window.PP = window.PP || {});
  const W = 32, H = 32;

  // ty：顶部留白（逻辑坐标 y=0 在存储的第 ty 行），防止长耳朵、跳起时被裁掉
  const PAD = 4;
  class Buf {
    constructor(w = W, h = H, ty = 0) {
      this.w = w; this.h = h + ty; this.ty = ty;
      this.d = new Array(w * this.h).fill(null);
    }
    clone0() { const o = new Buf(this.w, this.h - this.ty, this.ty); o.tx = this.tx; return o; }
    set(x, y, c) {
      x = Math.round(x); y = Math.round(y) + this.ty;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.d[y * this.w + x] = c;
    }
    get(x, y) {
      y += this.ty;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
      return this.d[y * this.w + x];
    }
    raw(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
      return this.d[y * this.w + x];
    }
    // 只在已有像素上绘制（用于花纹、肚皮）
    setOn(x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (this.get(x, y) != null) this.set(x, y, c);
    }
  }

  function ell(b, cx, cy, rx, ry, c, onlyOn) {
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) onlyOn ? b.setOn(x, y, c) : b.set(x, y, c);
      }
  }
  function rect(b, x, y, w, h, c, onlyOn) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) onlyOn ? b.setOn(x + i, y + j, c) : b.set(x + i, y + j, c);
  }
  function poly(b, pts, c, onlyOn) {
    let x0 = 99, x1 = -99, y0 = 99, y1 = -99;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const px = x + 0.5, py = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) onlyOn ? b.setOn(x, y, c) : b.set(x, y, c);
      }
  }
  function outline(b, col) {
    const out = b.d.slice();
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w; x++) {
        if (b.raw(x, y) != null) continue;
        if (b.raw(x - 1, y) != null || b.raw(x + 1, y) != null || b.raw(x, y - 1) != null || b.raw(x, y + 1) != null)
          out[y * b.w + x] = col;
      }
    b.d = out;
  }
  // 以下变换都在逻辑坐标（32x32 方格）里做
  function flipV(b) {
    const o = b.clone0();
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const v = b.d[y * b.w + x]; if (v == null) continue;
      o.set(x, H - 1 - (y - b.ty), v);
    }
    return o;
  }
  function rot90(b, dir) {
    const o = b.clone0();
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w; x++) {
        const v = b.d[y * b.w + x];
        if (v == null) continue;
        const ly = y - b.ty;
        if (dir > 0) o.set(H - 1 - ly, x, v);
        else o.set(ly, W - 1 - x, v);
      }
    return o;
  }
  function shift(b, dx, dy) {
    const o = b.clone0();
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const v = b.d[y * b.w + x];
      if (v != null) o.set(x + dx, y - b.ty + dy, v);
    }
    return o;
  }

  // ---------- 调色板（写实毛色，参考 Comnyang 的自然花色） ----------
  const OUT = '#231c20';
  const RIM = '#ffffff';
  // pattern: solid | tabby | mackerel | point | tux | patches
  const PAL = {
    cat: {
      orange:   { base: '#e8893c', dark: '#b8592a', light: '#f9d7ad', paw: '#f3b77c', inner: '#f2a3a0', nose: '#e2747c', pattern: 'tabby', name: '橘猫' },
      mackerel: { base: '#968a80', dark: '#4a413c', light: '#ffffff', paw: '#ffffff', inner: '#e8a8ae', nose: '#f08a9a', pattern: 'mackerel', name: '狸花' },
      siamese:  { base: '#f1e7da', dark: '#5b4239', light: '#fbf6ef', paw: '#5b4239', inner: '#7a5a50', nose: '#3c2c28', pattern: 'point', name: '暹罗' },
      black:    { base: '#2b2830', dark: '#1c1a20', light: '#3a3640', paw: '#2b2830', inner: '#6a5060', nose: '#4a3a44', pattern: 'solid', name: '小黑' },
      tux:      { base: '#2e2b33', dark: '#1c1a20', light: '#ffffff', paw: '#ffffff', inner: '#d89aa6', nose: '#f08a9a', pattern: 'tux', name: '奶牛猫' },
      shiny:    { base: '#b9a6f4', dark: '#7d63d6', light: '#f6f0ff', paw: '#f6f0ff', inner: '#ffc2dd', nose: '#ff8ec2', pattern: 'tabby', name: '星云猫' },
    },
    dog: {
      red:   { base: '#d98a46', dark: '#b06a32', light: '#fbefdf', paw: '#fbefdf', inner: '#f0c49a', nose: '#231c20', pattern: 'urajiro', name: '赤柴' },
      black: { base: '#34303a', dark: '#24212a', light: '#f3e4cf', paw: '#f3e4cf', inner: '#6e6270', nose: '#16131a', pattern: 'urajiro', brows: '#d9a46a', name: '黑柴' },
      white: { base: '#f6efe4', dark: '#dccbb2', light: '#ffffff', paw: '#ffffff', inner: '#efcfb0', nose: '#231c20', pattern: 'solid', name: '白柴' },
      shiny: { base: '#79c4f0', dark: '#4b92c8', light: '#effaff', paw: '#effaff', inner: '#ffe08a', nose: '#203a66', pattern: 'urajiro', name: '天空柴' },
    },
    rabbit: {
      white: { base: '#f7f3ef', dark: '#d9d0c8', light: '#ffffff', paw: '#ffffff', inner: '#f2a9b6', nose: '#ea8396', pattern: 'solid', name: '小白兔' },
      gray:  { base: '#a59c97', dark: '#7a716d', light: '#ece6e2', paw: '#ece6e2', inner: '#e7a9b2', nose: '#d97f8e', pattern: 'bib', name: '灰兔' },
      dutch: { base: '#5e4a40', dark: '#3e302a', light: '#ffffff', paw: '#ffffff', inner: '#d9a0a6', nose: '#e08a96', pattern: 'dutch', name: '熊猫兔' },
      shiny: { base: '#ffcfe6', dark: '#ef98c4', light: '#fff6fb', paw: '#fff6fb', inner: '#a9ddff', nose: '#ff78b0', pattern: 'solid', name: '樱花兔' },
    },
    hamster: {
      gold:    { base: '#e3a65e', dark: '#b97b3c', light: '#fff5e8', paw: '#f6c8b8', inner: '#f2a6a6', nose: '#e8818f', pattern: 'bib', name: '金丝熊' },
      silver:  { base: '#a9a6b6', dark: '#76738a', light: '#fbfaff', paw: '#f6c8c8', inner: '#eeb0bc', nose: '#e0889a', pattern: 'bib', name: '银狐' },
      pudding: { base: '#f0cf72', dark: '#cfa848', light: '#fffbe6', paw: '#f6c8b8', inner: '#f2aea2', nose: '#e88b90', pattern: 'bib', name: '布丁' },
      shiny:   { base: '#98e6bd', dark: '#5fbf8e', light: '#f2fff7', paw: '#ffc8d8', inner: '#ffb8d0', nose: '#ff86ac', pattern: 'bib', name: '薄荷鼠' },
    },
    penguin: {
      classic: { base: '#2c3548', dark: '#1d2433', light: '#fbfcff', paw: '#f0963a', inner: '#f0963a', nose: '#f0963a', name: '小企鹅' },
      emperor: { base: '#363f54', dark: '#222838', light: '#fbfcff', paw: '#f0a03a', inner: '#f0a03a', nose: '#f0a03a', neck: '#ffcf5a', name: '帝企鹅' },
      fluffy:  { base: '#8f8c94', dark: '#6a6770', light: '#d8d6dc', paw: '#4a4650', inner: '#4a4650', nose: '#2a2630', name: '毛球企鹅宝宝', baby: true },
      shiny:   { base: '#f39572', dark: '#d0654a', light: '#fff8ee', paw: '#ffd24a', inner: '#ffd24a', nose: '#ffd24a', name: '晚霞企鹅' },
    },
    fox: {
      red:    { base: '#e2793a', dark: '#b8582a', light: '#fdf3e8', paw: '#3c2a2c', inner: '#f7cfa6', nose: '#231c20', socks: '#3c2a2c', name: '赤狐' },
      arctic: { base: '#f1f3f8', dark: '#cfd5e2', light: '#ffffff', paw: '#e2e6ef', inner: '#e3d4e3', nose: '#33303a', socks: '#dde2ec', name: '北极狐' },
      silver: { base: '#5e5868', dark: '#403b48', light: '#e6e3eb', paw: '#25212a', inner: '#9a8ca2', nose: '#17141b', socks: '#25212a', name: '银狐' },
      shiny:  { base: '#f7c33e', dark: '#d8941c', light: '#fffae4', paw: '#c4642a', inner: '#ff9acc', nose: '#6a3210', socks: '#c4642a', name: '金狐' },
    },
    dragon: {
      mint:  { base: '#74cfa0', dark: '#45a476', light: '#fff0b0', paw: '#45a476', inner: '#ffd17a', nose: '#2f6a50', name: '小龙' },
      shiny: { base: '#f58aa4', dark: '#d35676', light: '#fff0b0', paw: '#d35676', inner: '#ffe07a', nose: '#842c46', name: '樱龙' },
    },
  };

  const K = OUT;

  // ---------- 主绘制 ----------
  // p = {species, pal, facing, anim, t, eyes, look:[x,y], mouth, blush, ears, wag, hat, cheeks, stretch, knead}
  function mirrorX(b) {
    const o = b.clone0();
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) o.d[y * b.w + (b.w - 1 - x)] = b.d[y * b.w + x];
    return o;
  }

  // 手绘猫
  function drawCatHand(p) {
    if (p.transform === 'flipV' && (p.anim === 'lie' || p.anim === 'sleep')) p = Object.assign({}, p, { anim: 'idle' }); // 翻肚皮：四脚朝天
    const r = PP.CAT.draw(Buf, p);
    let b = r.b; const C = r.C;
    const f = p.facing >= 0 ? 1 : -1;
    if (f < 0) b = mirrorX(b);
    const X = (x) => (f < 0 ? 31 - x : x);
    const fullH = b.h;
    const res = (k) => { let v = C[k]; if (v && v.length === 1) v = C[v]; if (v && v.length === 1) v = C[v]; return v; };
    const fur = C.f && res('f') !== res('l') ? res('f') : res('b');
    const ey = r.face.e1[1];
    const e1 = X(r.face.e1[0]), e2 = X(r.face.e2[0]);
    const look = p.look || [0, 0];
    const eyes = p.eyes || 'open';
    const lx = Math.round(look[0] * 0.6);
    const L = Math.min(e1, e2), R = Math.max(e1, e2);
    drawEye(b, L + lx, ey, eyes, look, true, {}, fur);
    drawEye(b, R + lx, ey, eyes, look, false, {}, fur);
    // 鼻子 + ㅅ 形的嘴（两像素宽的中线）
    const mx = (f < 0 ? 30 - r.face.mx : r.face.mx) + lx, my = r.face.my;
    const N = res('n'), M = K;
    b.set(mx, my, N); b.set(mx + 1, my, N);
    switch (p.mouth || 'w') {
      case 'w': b.set(mx, my + 1, M); b.set(mx + 1, my + 1, M); b.set(mx - 1, my + 2, M); b.set(mx + 2, my + 2, M); break;
      case 'smile': b.set(mx, my + 1, M); b.set(mx + 1, my + 1, M); b.set(mx - 1, my + 1, M); b.set(mx + 2, my + 1, M); b.set(mx - 2, my, M); b.set(mx + 3, my, M); break;
      case 'open': case 'yawn': rect(b, mx - 1, my + 1, 4, p.mouth === 'yawn' ? 3 : 2, '#6e2434'); b.set(mx, my + (p.mouth === 'yawn' ? 3 : 2), '#ff8fa0'); b.set(mx + 1, my + (p.mouth === 'yawn' ? 3 : 2), '#ff8fa0'); break;
      case 'o': b.set(mx, my + 2, M); b.set(mx + 1, my + 2, M); break;
      case 'frown': b.set(mx, my + 1, M); b.set(mx + 1, my + 1, M); b.set(mx - 1, my + 2, M); b.set(mx + 2, my + 2, M); b.set(mx - 1, my + 1, null); break;
      case 'chew': { const c = Math.floor((p.t || 0) * 10) % 2; b.set(mx, my + 1, M); b.set(mx + 1, my + 1, M); if (c) { b.set(mx - 1, my + 1, M); b.set(mx + 2, my + 1, M); } else { b.set(mx - 1, my + 2, M); b.set(mx + 2, my + 2, M); } break; }
      case 'tongue': b.set(mx, my + 1, M); b.set(mx + 1, my + 1, M); b.set(mx, my + 2, '#ff6f8a'); b.set(mx + 1, my + 2, '#ff8fa0'); break;
    }
    if (p.blush || p.anim === 'knead') {
      const BL = '#ff8fa8';
      b.set(L - 2, ey + 3, BL); b.set(L - 1, ey + 3, BL); b.set(R + 1, ey + 3, BL); b.set(R + 2, ey + 3, BL);
    }
    if (p.hat) drawHat(b, p.hat, 16, ey - 5 + 7, f);
    outline(b, RIM);
    let out = b;
    if (p.transform === 'flipV') out = shift(flipV(b), 0, 1);
    else if (p.transform === 'rotR') out = shift(rot90(b, 1), 0, 4);
    else if (p.transform === 'rotL') out = shift(rot90(b, -1), 0, 4);
    else if (p.transform === 'buried') out = buried(flipV(b));
    return out;
  }

  function drawPet(p) {
    // 新动作映射到第一版的姿势上
    let keyboard = false;
    if (p.anim === 'type' || p.anim === 'roll') { keyboard = p.anim === 'type'; p = Object.assign({}, p, { anim: 'knead' }); }
    else if (p.anim === 'drink') p = Object.assign({}, p, { anim: 'eat', mouth: Math.floor((p.t || 0) * 6) % 2 ? 'tongue' : 'w' });
    else if (p.anim === 'think') p = Object.assign({}, p, { anim: 'groom', thinking: true });
    let b = new Buf(W, H, PAD);
    const C = p.pal, f = p.facing >= 0 ? 1 : -1, sp = p.species, t = p.t || 0;
    const anim = p.anim || 'idle';
    // 默认：正面坐姿，大头
    let g = {
      hx: 16 + f * 0.6, hy: 12.5, hrx: 9, hry: 6.8,
      bx: 16 - f * 0.4, by: 22.6, brx: 6.4, bry: 5.6,
      pawY: 27, pawL: 0, pawR: 0, pawSpread: 3.2, paws: true, hind: false,
      ear: p.ears || 'up', wag: p.wag != null ? p.wag : 1.6, lie: false, tailMode: 'sit',
    };
    const breathe = Math.sin(t * 2.1) > 0.15 ? 0 : 0.5;
    switch (anim) {
      case 'idle': case 'sit':
        g.hy += breathe; g.by += breathe * 0.4;
        break;
      case 'walk': {
        const s = Math.floor(t * 7) % 4;
        g.pawL = s === 1 ? 1 : 0; g.pawR = s === 3 ? 1 : 0;
        g.hy += s % 2 ? 0.6 : 0; g.by += s % 2 ? 0.3 : 0; g.hx += f * 0.8; g.bx -= f * 0.4;
        g.wag = Math.max(g.wag, 3.5); g.tailMode = 'walk';
        break;
      }
      case 'run': {
        const s = Math.floor(t * 12) % 4;
        g.pawL = s < 2 ? 2 : 0; g.pawR = s >= 2 ? 2 : 0;
        g.hx += f * 2; g.hy += 1.5 + (s % 2) * 0.5; g.bx -= f * 1; g.brx += 1; g.bry -= 0.6; g.by += 0.6;
        if (g.ear === 'up') g.ear = 'back'; g.wag = 9; g.tailMode = 'walk';
        break;
      }
      case 'lie': case 'sleep': {
        g.lie = true;
        g.hx = 16 + f * 3.6; g.hy = 18.6 + breathe * 0.6; g.hry = 6.4;
        g.bx = 16 - f * 2.2; g.by = 24.2; g.brx = 9; g.bry = 4.4 + breathe * 0.3;
        g.paws = anim === 'lie'; g.pawY = 27; g.pawSpread = 2;
        if (anim === 'sleep' && g.ear === 'up') g.ear = 'relax';
        g.wag = anim === 'sleep' ? 0.3 : 1.2; g.tailMode = 'lie';
        break;
      }
      case 'eat': {
        const bob = Math.sin(t * 11) > 0 ? 1 : 0;
        g.hy = 16 + bob; g.hx = 16 + f * 2.4; g.by += 0.4;
        break;
      }
      case 'knead': {
        const s = Math.floor(t * 5) % 2;
        g.pawL = s ? 2 : 0; g.pawR = s ? 0 : 2; g.hy += 0.5;
        break;
      }
      case 'jump':
        g.bry += 0.8; g.by -= 0.6; g.hy -= 0.8; g.pawY = 28; g.pawSpread = 2.4; g.ear = 'back';
        g.hind = true; g.tailMode = 'up';
        break;
      case 'fall':
        g.brx += 0.6; g.pawY = 25; g.pawSpread = 6; g.hind = true; g.tailMode = 'up';
        break;
      case 'land':
        g.hy += 2.4; g.by += 1.3; g.brx += 1.6; g.bry -= 1.1; g.pawSpread = 4.2; g.hrx += 0.6;
        break;
      case 'held': {
        // 被拎起来：像麻薯一样被拉长
        const st = p.stretch != null ? p.stretch : 0.5;
        const kick = p.struggle ? Math.floor(t * 10) % 2 : 0;
        g.hx = 16; g.hy = 9.5; g.hrx = 8.6 - st * 0.4;
        g.bx = 16; g.bry = 5.6 + st * 9; g.brx = 6 - st * 1.2; g.by = 13 + g.bry;
        g.pawY = Math.round(g.by + g.bry - 1); g.pawSpread = 2.6;
        g.extra = Math.max(0, Math.ceil(g.by + g.bry + 4 - 32)); // 拉得太长时画布往下加高
        g.pawL = kick ? -1 : 0; g.pawR = kick ? 0 : -1; g.hind = true;
        if (p.struggle) g.ear = 'back'; g.wag = p.struggle ? 9 : 1; g.tailMode = 'hang';
        break;
      }
      case 'poop': {
        const sh = Math.floor(t * 14) % 2;
        g.hy += 1.6; g.hx += sh * 0.5; g.by += 1; g.brx += 1;
        g.tailMode = 'up';
        break;
      }
      case 'crouch': {
        const w = Math.floor(t * 6) % 2;
        g.hy += 3; g.by += 1.2; g.bx += w ? 0.7 : -0.7; g.brx += 0.8; g.bry -= 0.4; g.pawSpread = 4.4;
        g.wag = 11; g.tailMode = 'up';
        break;
      }
      case 'stretch':
        g.hy += 4; g.hx += f * 3; g.bx -= f * 1.6; g.by -= 0.4; g.brx += 1.8; g.bry -= 0.8; g.pawSpread = 5; g.tailMode = 'up';
        break;
      case 'groom': {
        const s = p.thinking ? 0 : Math.floor(t * 4) % 2;
        g.pawL = 3 + s; g.hy += 0.6; g.hx -= f * 0.5;
        break;
      }
      case 'dance': {
        const s = Math.floor(t * 4) % 2;
        g.hx += s ? 1.2 : -1.2; g.hy += Math.floor(t * 8) % 2 ? 0 : 0.6; g.pawL = s * 2; g.pawR = (1 - s) * 2;
        g.wag = 6;
        break;
      }
      case 'look_up':
        g.hy -= 0.8;
        break;
    }
    if (p.squash) { g.by += p.squash; g.hy += p.squash * 1.4; g.brx += p.squash; g.hrx += p.squash * 0.4; }
    // 果冻弹簧：整体以脚底为锚点压扁/拉长，头比身体晃得更多
    const J = p.jelly;
    if (J && anim !== 'held') {
      const G0 = 29.5, sy = J.sy || 1, sx = J.sx || 1, sk = J.skew || 0;
      const ty = (y) => G0 - (G0 - y) * sy;
      g.hy = ty(g.hy); g.by = ty(g.by); g.hry *= sy; g.bry *= sy; g.hrx *= sx; g.brx *= sx;
      g.hx += sk * 0.9; g.bx += sk * 0.35;
      g.jsy = sy; g.jsx = sx; g.jsk = sk;
    }
    if (J) g.sway = (J.sway || 0) * 0.8;
    if ((sp === 'hamster' || sp === 'penguin') && anim === 'held') g.extra = Math.ceil((p.stretch || 0.5) * 9);
    if (g.extra) b = new Buf(W, H + g.extra, PAD);
    if (sp === 'rabbit') { g.hy += anim === 'held' ? 3.5 : 2; } // 兔子耳朵长，头放低一点免得被裁掉
    g.f = f; g.t = t; g.anim = anim;

    if (sp === 'penguin') drawPenguin(b, p, g);
    else if (sp === 'hamster') drawHamster(b, p, g);
    else {
      drawTail(b, sp, C, g);
      if (sp === 'dragon') {
        const flap = Math.sin(t * (anim === 'jump' || anim === 'fall' ? 16 : 2)) > 0 ? 1 : 0;
        poly(b, [[g.bx - 3, g.by - 3], [g.bx - 10.5, g.by - 8.5 - flap * 2], [g.bx - 9, g.by - 1.5], [g.bx - 6, g.by + 0.5]], C.dark);
        poly(b, [[g.bx + 3, g.by - 3], [g.bx + 10.5, g.by - 8.5 - flap * 2], [g.bx + 9, g.by - 1.5], [g.bx + 6, g.by + 0.5]], C.dark);
      }
      drawEars(b, sp, C, g, p);
      ell(b, g.bx, g.by, g.brx, g.bry, C.base);
      // 后脚（跳跃/悬空时）
      if (g.hind) {
        rect(b, Math.round(g.bx - g.pawSpread - 1.5), g.pawY + 1 - g.pawL, 3, 2, C.paw);
        rect(b, Math.round(g.bx + g.pawSpread - 1.5), g.pawY + 1 - g.pawR, 3, 2, C.paw);
      }
      // 头
      ell(b, g.hx, g.hy, g.hrx, g.hry, C.base);
      if (sp === 'fox') {
        // 狐狸蓬松的腮毛
        poly(b, [[g.hx - g.hrx + 0.5, g.hy - 0.5], [g.hx - g.hrx - 1.8, g.hy + 3.5], [g.hx - g.hrx + 3, g.hy + 4.5]], C.light);
        poly(b, [[g.hx + g.hrx - 0.5, g.hy - 0.5], [g.hx + g.hrx + 1.8, g.hy + 3.5], [g.hx + g.hrx - 3, g.hy + 4.5]], C.light);
      }
      // 胡须（画在轮廓之前 → 自带深色描边，像 Comnyang 那样伸出脸外）
      if (sp === 'cat' || sp === 'fox') drawWhiskers(b, g, '#ffffff');
    }

    outline(b, OUT);

    // ===== 轮廓内的细节 =====
    if (sp !== 'penguin' && sp !== 'hamster') {
      drawCoat(b, sp, C, g);
      // 前爪
      if (g.paws && !g.hind) {
        const py = g.pawY;
        const pc = sp === 'fox' ? C.socks : C.paw;
        const xl = Math.round(g.bx - g.pawSpread - 1.5), xr = Math.round(g.bx + g.pawSpread - 1.5);
        rect(b, xl, py - g.pawL, 3, 2, pc); rect(b, xr, py - g.pawR, 3, 2, pc);
        // 爪子之间的分隔线
        b.set(xl + 3, py + 1, K); b.set(xr - 1, py + 1, K);
        b.set(xl - 1, py - g.pawL, K); b.set(xl - 1, py + 1 - g.pawL, K); b.set(xr + 3, py - g.pawR, K); b.set(xr + 3, py + 1 - g.pawR, K);
        rect(b, xl, py + 2 - g.pawL, 3, 1, K); rect(b, xr, py + 2 - g.pawR, 3, 1, K);
        if (g.pawL > 0) rect(b, xl, py - g.pawL - 1, 3, 1, K);
        if (g.pawR > 0) rect(b, xr, py - g.pawR - 1, 3, 1, K);
      }
    }

    drawFace(b, p, g);
    if (p.hat) drawHat(b, p.hat, g.hx, g.hy - g.hry + 6.5, f);

    // 陪你打字：身前放一个小键盘，按下去的键亮一下
    if (keyboard) {
      const ky = 27;
      rect(b, 7, ky, 18, 1, K); rect(b, 6, ky + 1, 20, 3, '#c9c4d2'); rect(b, 7, ky + 1, 18, 1, '#e9e6ee'); rect(b, 6, ky + 4, 20, 1, K);
      b.set(5, ky + 1, K); b.set(5, ky + 2, K); b.set(5, ky + 3, K); b.set(26, ky + 1, K); b.set(26, ky + 2, K); b.set(26, ky + 3, K);
      for (let x = 7; x <= 24; x += 2) b.set(x, ky + 2, '#8f889c');
      const s2 = Math.floor((p.t || 0) * 9) % 4;
      if (s2 === 1) b.set(11, ky + 2, '#ffcf33'); if (s2 === 3) b.set(20, ky + 2, '#ffcf33');
    }
    // 打字太快：整只变红（过热）
    if (p.heat > 0.05) {
      const k = Math.min(1, p.heat) * 0.6;
      for (let i = 0; i < b.d.length; i++) {
        const v = b.d[i]; if (!v || v === OUT || v === '#ffffff' || v === '#2a2026') continue;
        const n = parseInt(v.slice(1), 16);
        const r = Math.round((n >> 16) * (1 - k) + 255 * k), gg = Math.round(((n >> 8) & 255) * (1 - k) + 80 * k), bb = Math.round((n & 255) * (1 - k) + 70 * k);
        b.d[i] = '#' + [r, gg, bb].map((x) => x.toString(16).padStart(2, '0')).join('');
      }
    }

    // 白色外描边：贴纸感，任何壁纸上都清楚
    outline(b, RIM);

    let out = b;
    if (p.transform === 'flipV') out = shift(flipV(b), 0, -2);
    else if (p.transform === 'rotR') out = shift(rot90(b, 1), 0, 4);
    else if (p.transform === 'rotL') out = shift(rot90(b, -1), 0, 4);
    else if (p.transform === 'buried') out = buried(flipV(b));
    return out;
  }

  function drawWhiskers(b, g, col) {
    const y = Math.round(g.hy + 3.2);
    const l = Math.round(g.hx - g.hrx), r = Math.round(g.hx + g.hrx);
    for (let i = -2; i <= 1; i++) { b.set(l + i, y, col); b.set(r - i, y, col); }
    for (let i = -2; i <= 0; i++) { b.set(l + i, y + 2, col); b.set(r - i, y + 2, col); }
  }

  function drawCoat(b, sp, C, g) {
    const { hx, hy, hrx, hry, bx, by, brx, bry, f } = g;
    const pat = C.pattern || 'solid';
    const fx = hx + f * 0.8;
    if (sp === 'cat') {
      if (pat === 'tabby' || pat === 'mackerel') {
        const d = C.dark;
        // 额头 M 纹
        const top = Math.round(hy - hry + 1.2);
        b.setOn(fx - 2, top, d); b.setOn(fx - 2, top + 1, d);
        b.setOn(fx, top, d); b.setOn(fx, top + 1, d); b.setOn(fx, top + 2, d);
        b.setOn(fx + 2, top, d); b.setOn(fx + 2, top + 1, d);
        // 脸颊横纹
        for (const s of [-1, 1]) {
          const cx = Math.round(hx + s * (hrx - 1.2));
          b.setOn(cx, hy + 0.5, d); b.setOn(cx - s, hy + 0.5, d);
          b.setOn(cx, hy - 1.5, d);
        }
        // 身体横纹
        if (!g.lie) {
          for (let k = 0; k < 3; k++) {
            const yy = Math.round(by - bry + 2.2 + k * 2.2);
            for (const s of [-1, 1]) {
              const ex = Math.round(bx + s * (brx - 0.6));
              b.setOn(ex, yy, d); b.setOn(ex - s, yy, d); if (k === 1) b.setOn(ex - 2 * s, yy, d);
            }
          }
        } else {
          for (let k = -3; k <= 3; k += 2) { const xx = Math.round(bx + k * 1.6); b.setOn(xx, by - bry + 1, d); b.setOn(xx, by - bry + 2, d); }
        }
        if (pat === 'mackerel') {
          // 白围兜 + 白嘴套
          poly(b, [[fx - 3.6, hy + 2.6], [fx + 3.6, hy + 2.6], [fx, hy + 9]], C.light, true);
          ell(b, fx, hy + 3.4, 3.4, 2.1, C.light, true);
          ell(b, bx + f * 0.4, by + 1, brx - 3, bry - 2.2, C.light, true);
        } else {
          ell(b, fx, hy + 3.4, 3.2, 2, C.light, true);
          ell(b, bx + f * 0.4, by + 1.4, brx - 3.4, bry - 2.6, C.light, true);
        }
      } else if (pat === 'point') {
        // 暹罗：脸部重点色
        ell(b, fx, hy + 1.6, 4.6, 3.8, '#a38170', true);
        ell(b, fx, hy + 2.2, 3.4, 2.8, C.dark, true);
      } else if (pat === 'tux') {
        poly(b, [[fx - 2.2, hy - 3], [fx + 2.2, hy - 3], [fx + 4.2, hy + 6], [fx - 4.2, hy + 6]], C.light, true);
        ell(b, bx + f * 0.4, by + 0.6, brx - 2.6, bry - 1.4, C.light, true);
      } else if (pat === 'solid') {
        ell(b, bx + f * 0.4, by + 1.4, brx - 3.4, bry - 2.6, C.light, true);
      }
    } else if (sp === 'dog') {
      if (pat === 'urajiro') {
        // 柴犬的“里白”：白脸颊、白嘴套、白胸
        ell(b, fx - 3.6, hy + 2.6, 3, 2.2, C.light, true);
        ell(b, fx + 3.6, hy + 2.6, 3, 2.2, C.light, true);
        ell(b, fx, hy + 3.2, 3.2, 2.4, C.light, true);
        if (C.brows) { b.setOn(fx - 4, hy - 3.2, C.brows); b.setOn(fx - 3, hy - 3.2, C.brows); b.setOn(fx + 3, hy - 3.2, C.brows); b.setOn(fx + 4, hy - 3.2, C.brows); }
      } else ell(b, fx, hy + 3.2, 3.2, 2.2, C.light, true);
      ell(b, bx + f * 0.4, by + 0.8, brx - 2.6, bry - 1.6, C.light, true);
    } else if (sp === 'fox') {
      poly(b, [[fx - 5, hy + 0.5], [fx + 5, hy + 0.5], [fx + 1.5, hy + 6.5], [fx - 1.5, hy + 6.5]], C.light, true);
      ell(b, bx + f * 0.4, by + 0.4, brx - 3, bry - 1.4, C.light, true);
    } else if (sp === 'rabbit') {
      if (pat === 'dutch') {
        poly(b, [[fx - 1.2, hy - 6], [fx + 1.2, hy - 6], [fx + 4, hy + 7], [fx - 4, hy + 7]], C.light, true);
        ell(b, bx, by + 0.4, brx + 1, bry - 1.6, C.light, true);
        ell(b, bx, by + 2.4, brx + 1, 2.6, C.light, true);
      } else if (pat === 'bib') {
        ell(b, fx, hy + 3, 3.4, 2.4, C.light, true);
        ell(b, bx + f * 0.4, by + 1, brx - 2.8, bry - 1.8, C.light, true);
      } else {
        ell(b, bx + f * 0.4, by + 1.4, brx - 3.4, bry - 2.6, C.light, true);
      }
    } else if (sp === 'dragon') {
      ell(b, bx + f * 0.4, by + 0.8, brx - 2.6, bry - 1.4, C.light, true);
      for (let i = -1; i <= 2; i++) b.setOn(bx + f * 0.4 - 2, by - 1 + i * 1.6, C.dark), b.setOn(bx + f * 0.4 + 2, by - 1 + i * 1.6, C.dark);
    }
  }

  function buried(b) {
    const o = shift(b, 0, 13);
    for (let y = 29; y < 32; y++) for (let x = 0; x < 32; x++) o.set(x, y, null);
    return o;
  }

  function drawTail(b, sp, C, g) {
    const { f, t, bx, by, brx, bry, tailMode } = g;
    const side = -f;
    const w = Math.sin(t * g.wag) + (g.sway || 0);
    const tc = C.pattern === 'point' ? C.dark : C.base;
    if (sp === 'cat') {
      if (tailMode === 'lie') { ell(b, bx + side * 4, by + 3.2, 7.5, 1.4, tc); ell(b, bx - side * 3.5, by + 3.4, 2.5, 1.3, tc); return; }
      if (tailMode === 'hang') { rect(b, Math.round(bx + side * 1.5 + w), Math.round(by + bry - 1), 2, 6, tc); return; }
      if (tailMode === 'up') {
        rect(b, Math.round(bx + side * (brx - 1)), Math.round(by - 3), 2, 5, tc);
        rect(b, Math.round(bx + side * (brx) + w), Math.round(by - 9), 2, 7, tc);
        return;
      }
      // 坐着：尾巴沿地面绕到身侧再翘起来（Comnyang 的经典姿势）
      const x0 = bx + side * (brx - 1.5);
      const gy = by + bry - 1.2;
      const sw = Math.round(w * 0.7);
      ell(b, x0 + side * 2.4, gy, 3.6, 1.3, tc);                 // 贴地的一段
      rect(b, Math.round(x0 + side * 5.2) - 1, Math.round(gy - 4), 2, 4, tc); // 向上翘
      rect(b, Math.round(x0 + side * 5.2) - 1 - side + sw * side, Math.round(gy - 5), 2, 2, tc); // 尾尖往里卷
      if (C.pattern === 'tabby' || C.pattern === 'mackerel') {
        b.set(x0 + side * 2.4, gy - 1, C.dark); b.set(x0 + side * 2.4, gy, C.dark);
        rect(b, Math.round(x0 + side * 5.2) - 1, Math.round(gy - 3), 2, 1, C.dark);
      }
    } else if (sp === 'dog') {
      const tx = bx + side * (brx - 0.5);
      ell(b, tx + w * 0.4, by - 4.5, 2.8, 2.6, C.base);
      b.set(tx + w * 0.4, by - 4.5, C.light); b.set(tx + w * 0.4 + side, by - 4.5, C.light);
    } else if (sp === 'rabbit') {
      ell(b, bx + side * (brx - 0.2), by + bry - 2.4, 2.3, 2.1, C.light);
    } else if (sp === 'fox') {
      if (tailMode === 'lie') { ell(b, bx + side * 3, by + 2.6, 8.5, 2.4, C.base); ell(b, bx - side * 5.5, by + 2.6, 2, 1.8, C.light); return; }
      if (tailMode === 'hang') { ell(b, bx + side * 2 + w, by + bry + 1, 2.6, 4, C.base); ell(b, bx + side * 2 + w, by + bry + 4, 1.6, 1.4, C.light); return; }
      const tx = bx + side * (brx + 1.2);
      ell(b, tx + w * 0.7, by - 2.4, 3.6, 5.8, C.base);
      ell(b, tx + w * 1.0, by - 7.2, 2.4, 1.9, C.light);
    } else if (sp === 'dragon') {
      const tx = bx + side * (brx - 1);
      poly(b, [[tx, by - 1], [tx + side * 6, by + 2 + w * 0.6], [tx, by + 3.5]], C.base);
      poly(b, [[tx + side * 5, by + 1 + w * 0.6], [tx + side * 8, by - 1 + w], [tx + side * 7, by + 3 + w * 0.6]], C.inner);
    }
  }

  function drawEars(b, sp, C, g, p) {
    const { hx, hy, hrx, t, f } = g;
    const mode = g.ear;
    const twitch = (Math.floor(t * 0.7) % 9 === 0 && Math.floor(t * 10) % 2 === 0) ? 1 : 0;
    const down = mode === 'down', back = mode === 'back', relax = mode === 'relax';
    const ec = C.pattern === 'point' ? C.dark : C.base;
    if (sp === 'cat' || sp === 'fox' || sp === 'dog') {
      const big = sp === 'fox' ? 2.6 : sp === 'dog' ? 0.2 : 0;
      const narrow = sp === 'dog' ? 0.8 : 0;
      const tipY = hy - 10.6 - big + (down ? 4.5 : back ? 2.2 : relax ? 1.2 : 0);
      const spread = down ? 3.5 : back ? 2 : 0;
      const L = [[hx - hrx + 0.4, hy - 1.8], [hx - hrx + 2.2 - spread + narrow, tipY + twitch], [hx - 2.2 + narrow, hy - 5.8]];
      const R = [[hx + hrx - 0.4, hy - 1.8], [hx + hrx - 2.2 + spread - narrow, tipY], [hx + 2.2 - narrow, hy - 5.8]];
      poly(b, L, ec); poly(b, R, ec);
      const il = [[hx - hrx + 2.6, hy - 4.4], [hx - hrx + 2.6 - spread + narrow, tipY + 2.6 + twitch], [hx - 3.8, hy - 5.6]];
      const ir = [[hx + hrx - 2.6, hy - 4.4], [hx + hrx - 2.6 + spread - narrow, tipY + 2.6], [hx + 3.8, hy - 5.6]];
      poly(b, il, C.inner); poly(b, ir, C.inner);
      if (sp === 'fox') {
        rect(b, Math.round(hx - hrx + 2.2 - spread) - 1, Math.round(tipY + twitch), 2, 2, C.socks, true);
        rect(b, Math.round(hx + hrx - 2.2 + spread) - 1, Math.round(tipY), 2, 2, C.socks, true);
      }
    } else if (sp === 'rabbit') {
      const ic = C.pattern === 'dutch' ? C.inner : C.inner;
      if (relax || g.lie) {
        ell(b, hx - f * 7.5, hy - 3.6, 5.6, 1.9, C.base); ell(b, hx - f * 8, hy - 3.6, 3.8, 0.7, ic);
        ell(b, hx - f * 6.4, hy - 5.6, 5.0, 1.8, C.base);
        return;
      }
      if (down) {
        ell(b, hx - hrx + 0.5, hy - 1, 2, 5.2, C.base);
        ell(b, hx + hrx - 0.5, hy - 1, 2, 5.2, C.base);
        return;
      }
      const sway = Math.round(Math.sin(t * 1.3) * 0.6);
      ell(b, hx - 3.4, hy - 8.6 + twitch, 2.1, 4.9, C.base);
      ell(b, hx - 3.4, hy - 8.2 + twitch, 0.8, 3.5, ic);
      if (p.lop) {
        ell(b, hx + hrx - 0.8, hy - 2.5, 2.1, 5, C.base);
      } else {
        ell(b, hx + 3.4 + sway * (back ? 1 : 0.5), hy - 8.6 + (back ? 1 : 0), 2.1, 4.9, C.base);
        ell(b, hx + 3.4 + sway * 0.5, hy - 8.2, 0.8, 3.5, ic);
      }
    } else if (sp === 'dragon') {
      poly(b, [[hx - 4.5, hy - 4.8], [hx - 6.2, hy - 10.2], [hx - 2.4, hy - 5.8]], C.light);
      poly(b, [[hx + 4.5, hy - 4.8], [hx + 6.2, hy - 10.2], [hx + 2.4, hy - 5.8]], C.light);
      ell(b, hx - hrx - 0.2, hy - 0.6, 1.6, 1.2, C.dark);
      ell(b, hx + hrx + 0.2, hy - 0.6, 1.6, 1.2, C.dark);
    }
  }

  function drawHamster(b, p, g) {
    const C = p.pal, f = g.f;
    const lie = g.anim === 'sleep' || g.anim === 'lie';
    const held = g.anim === 'held';
    let hx = 16 + f * 0.5;
    let bodyY = lie ? 23.5 : held ? 19 : 21.4, bodyRX = lie ? 10.4 : 9.6, bodyRY = lie ? 5.8 : held ? 8.6 : 7.6;
    let hy = lie ? 20 : held ? 11 : 14.2;
    if (held) { const st = p.stretch || 0.5; bodyRY += st * 4.5; bodyY += st * 4.5; }
    if (g.jsy) { const G0 = 29.5, T = (y) => G0 - (G0 - y) * g.jsy; bodyY = T(bodyY); hy = T(hy); bodyRY *= g.jsy; bodyRX *= g.jsx; hx += g.jsk * 0.8; }
    if (g.anim === 'walk' || g.anim === 'run') hy += Math.floor(g.t * 7) % 2 ? 0.5 : 0;
    if (g.anim === 'eat') hy += 1.4;
    hy += g.anim === 'idle' || g.anim === 'sit' ? (Math.sin(g.t * 2.1) > 0.15 ? 0 : 0.5) : 0;
    const er = g.ear === 'down' || lie ? 1.6 : 2.4;
    ell(b, hx - 6, hy - 5.2, er, er, C.base);
    ell(b, hx + 6, hy - 5.2, er, er, C.base);
    ell(b, 16, bodyY, bodyRX, bodyRY, C.base);
    ell(b, hx, hy, 8.4, 6.4, C.base);
    if (p.cheeks) {
      ell(b, hx - 7.2, hy + 2.4, 3, 2.6, C.base);
      ell(b, hx + 7.2, hy + 2.4, 3, 2.6, C.base);
    }
    if (!lie) {
      rect(b, 16 - 5, 27 - g.pawL, 3, 2, C.paw);
      rect(b, 16 + 3, 27 - g.pawR, 3, 2, C.paw);
    }
    ell(b, hx - 6, hy - 5.2, er - 1, er - 1, C.inner);
    ell(b, hx + 6, hy - 5.2, er - 1, er - 1, C.inner);
    p.__geo = { kind: 'hamster', hx, hy, bodyY, bodyRX, bodyRY, lie };
  }

  function drawPenguin(b, p, g) {
    const C = p.pal, f = g.f, t = g.t;
    const lie = g.anim === 'sleep' || g.anim === 'lie';
    const held = g.anim === 'held';
    let cy = lie ? 22.4 : held ? 17 : 18.6, ry = lie ? 7.6 : held ? 11.5 : 10.2, rx = lie ? 10 : 9;
    if (held) { const st = p.stretch || 0.5; ry += st * 4.5; cy += st * 4.5; }
    if (g.jsy) { const G0 = 29.5; cy = G0 - (G0 - cy) * g.jsy; ry *= g.jsy; rx *= g.jsx; }
    const flap = ['walk', 'run', 'dance', 'jump', 'fall'].includes(g.anim) || p.struggle ? Math.floor(t * 8) % 2 : 0;
    const bob = g.anim === 'walk' ? Math.round(Math.sin(t * 7)) : 0; // 企鹅走路左右摇摆
    const cx = 16 + bob * 0.6;
    poly(b, [[cx - rx + 1.4, cy - 2], [cx - rx - 2.4 - flap * 1.6, cy + 4.5 - flap * 3], [cx - rx + 2.4, cy + 3.6]], C.base);
    poly(b, [[cx + rx - 1.4, cy - 2], [cx + rx + 2.4 + flap * 1.6, cy + 4.5 - flap * 3], [cx + rx - 2.4, cy + 3.6]], C.base);
    ell(b, cx, cy, rx, ry, C.base);
    if (!lie) {
      const fy = Math.min(28 + (g.extra || 0), Math.round(cy + ry - 1));
      rect(b, cx - 5, fy - (bob > 0 ? 1 : 0), 4, 2, C.paw);
      rect(b, cx + 1, fy - (bob < 0 ? 1 : 0), 4, 2, C.paw);
    }
    p.__geo = { kind: 'penguin', cx, cy, ry, rx, lie, f };
  }

  // 眼睛：白眼白 + 深色眼圈 + 会动的瞳孔（Comnyang 的灵魂）
  function drawEye(b, cx, cy, kind, look, left, C, furCol) {
    const x0 = cx - 2, y0 = cy - 2;
    const W = '#ffffff';
    const ring = () => {
      rect(b, x0 + 1, y0, 3, 1, K); rect(b, x0 + 1, y0 + 4, 3, 1, K);
      rect(b, x0, y0 + 1, 1, 3, K); rect(b, x0 + 4, y0 + 1, 1, 3, K);
      rect(b, x0 + 1, y0 + 1, 3, 3, C.eyeWhite || W);
    };
    const lx = look[0], ly = look[1];
    // 瞳孔位置 0/1
    const px = lx > 0.3 ? 1 : lx < -0.3 ? 0 : left ? 1 : 0;
    const py = ly < -0.3 ? 0 : 1;
    switch (kind) {
      case 'open':
        ring(); rect(b, x0 + 1 + px, y0 + 1 + py, 2, 2, C.pupil || K);
        break;
      case 'wide':
        ring(); b.set(x0 + 2, y0 + 2, K);
        break;
      case 'sleepy':
        ring(); rect(b, x0 + 1, y0 + 1, 3, 1, furCol); rect(b, x0, y0 + 1, 5, 1, K);
        rect(b, x0 + 1 + px, y0 + 2 + (py ? 1 : 0) * 0, 2, 2, K);
        rect(b, x0 + 1, y0, 3, 1, furCol);
        break;
      case 'closed':
        b.set(x0, cy, K); b.set(x0 + 1, cy + 1, K); b.set(x0 + 2, cy + 1, K); b.set(x0 + 3, cy + 1, K); b.set(x0 + 4, cy, K);
        break;
      case 'happy':
        b.set(x0, cy + 1, K); b.set(x0 + 1, cy, K); b.set(x0 + 2, cy - 1, K); b.set(x0 + 3, cy, K); b.set(x0 + 4, cy + 1, K);
        break;
      case 'heart': {
        const R = '#ff3d6e';
        b.set(x0 + 1, y0, R); b.set(x0 + 3, y0, R);
        rect(b, x0, y0 + 1, 5, 1, R); rect(b, x0 + 1, y0 + 2, 3, 1, R); b.set(x0 + 2, y0 + 3, R);
        b.set(x0 + 1, y0 + 1, '#ffb3c6');
        break;
      }
      case 'angry':
        ring(); rect(b, x0 + 1 + (left ? 1 : 0), y0 + 2, 2, 2, K);
        if (left) { b.set(x0 + 3, y0 + 1, furCol); b.set(x0 + 2, y0 + 1, furCol); b.set(x0 + 4, y0 + 1, K); b.set(x0 + 3, y0 + 0, K); b.set(x0 + 4, y0, K); }
        else { b.set(x0 + 1, y0 + 1, furCol); b.set(x0 + 2, y0 + 1, furCol); b.set(x0, y0 + 1, K); b.set(x0 + 1, y0, K); b.set(x0, y0, K); }
        break;
      case 'sad':
        ring(); rect(b, x0 + 1 + (left ? 0 : 1), y0 + 1, 2, 2, K);
        b.set(left ? x0 + 1 : x0 + 3, y0 + 4, '#7cc8ff'); b.set(left ? x0 + 1 : x0 + 3, y0 + 5, '#7cc8ff');
        break;
      case 'dizzy':
        ring(); b.set(x0 + 1, y0 + 1, K); b.set(x0 + 3, y0 + 1, K); b.set(x0 + 2, y0 + 2, K); b.set(x0 + 1, y0 + 3, K); b.set(x0 + 3, y0 + 3, K);
        break;
      case 'strain':
        if (left) { b.set(x0 + 1, y0 + 1, K); b.set(x0 + 2, y0 + 1, K); b.set(x0 + 3, y0 + 2, K); b.set(x0 + 2, y0 + 3, K); b.set(x0 + 1, y0 + 3, K); }
        else { b.set(x0 + 3, y0 + 1, K); b.set(x0 + 2, y0 + 1, K); b.set(x0 + 1, y0 + 2, K); b.set(x0 + 2, y0 + 3, K); b.set(x0 + 3, y0 + 3, K); }
        break;
      case 'star': {
        const Y = '#ffcf33';
        b.set(x0 + 2, y0, Y); rect(b, x0 + 1, y0 + 1, 3, 2, Y); rect(b, x0, y0 + 1, 5, 1, Y); b.set(x0 + 1, y0 + 3, Y); b.set(x0 + 3, y0 + 3, Y);
        break;
      }
    }
  }

  function drawFace(b, p, g) {
    const C = p.pal, sp = p.species, f = g.f;
    let hx = g.hx, hy = g.hy, gap = 4;
    let fur = C.base;
    if (p.__geo && p.__geo.kind === 'hamster') {
      const q = p.__geo;
      ell(b, 16 + f * 0.4, q.bodyY + 1.6, q.bodyRX - 3.4, q.bodyRY - 2.6, C.light, true);
      ell(b, q.hx + f * 0.6, q.hy + 3, 5, 2.8, C.light, true);
      rect(b, Math.round(q.hx) - 1, Math.round(q.hy - 6.2), 2, 3, C.dark, true);
      hx = q.hx; hy = q.hy - 0.6; gap = 4;
    }
    if (p.__geo && p.__geo.kind === 'penguin') {
      const q = p.__geo;
      ell(b, q.cx + f * 0.6, q.cy + 3.2, q.rx - 2.8, q.ry - 2.6, C.light, true);
      const fy = q.lie ? q.cy - 2 : q.cy - 5;
      ell(b, q.cx + f * 0.8 - 3, fy, 3.4, 3, C.light, true);
      ell(b, q.cx + f * 0.8 + 3, fy, 3.4, 3, C.light, true);
      ell(b, q.cx + f * 0.8, fy + 2, 4.2, 2.2, C.light, true);
      if (C.neck) { for (const dx of [-7, 6]) { b.setOn(q.cx + dx, fy + 3, C.neck); b.setOn(q.cx + dx, fy + 4, C.neck); b.setOn(q.cx + dx + (dx < 0 ? 1 : -1), fy + 4, C.neck); } }
      hx = q.cx; hy = fy; gap = 3.6; fur = C.light;
    }
    const cx0 = Math.round(hx + f * 0.8);
    const ey = Math.round(hy - 0.2);
    const look = p.look || [0, 0];
    const lx = Math.round(look[0] * 0.6);
    if (sp === 'cat' && C.pattern === 'point') fur = C.dark;
    if (sp === 'rabbit' && C.pattern === 'dutch') fur = C.base;
    const eyes = p.eyes || 'open';
    const e1 = cx0 - Math.round(gap) + (f < 0 ? 0 : 0), e2 = cx0 + Math.round(gap);
    drawEye(b, e1 + lx, ey, eyes, look, true, C, fur);
    drawEye(b, e2 + lx, ey, eyes, look, false, C, fur);

    if (p.blush) {
      const BL = '#ff8fa8';
      b.setOn(e1 - 2 + lx, ey + 3, BL); b.setOn(e1 - 1 + lx, ey + 3, BL);
      b.setOn(e2 + 2 + lx, ey + 3, BL); b.setOn(e2 + 1 + lx, ey + 3, BL);
    }

    const mx = cx0 + lx, my = ey + 3;
    const M = K;
    if (sp === 'penguin') {
      rect(b, mx - 1, my - 1, 3, 1, C.nose); b.set(mx, my, C.nose);
      if (p.mouth === 'open' || p.mouth === 'yawn') { b.set(mx - 1, my, '#a0402a'); b.set(mx + 1, my, '#a0402a'); }
      return;
    }
    const nose = C.nose;
    if (sp === 'dog' || sp === 'fox') { b.set(mx - 1, my - 1, nose); b.set(mx, my - 1, nose); b.set(mx + 1, my - 1, nose); b.set(mx, my, nose); }
    else if (sp === 'dragon') { b.set(mx - 1, my - 1, C.nose); b.set(mx + 1, my - 1, C.nose); }
    else b.set(mx, my - 1, nose);
    const dy = sp === 'dog' || sp === 'fox' ? 1 : 0;
    switch (p.mouth || 'w') {
      case 'w':
        b.set(mx - 1, my + dy, M); b.set(mx + 1, my + dy, M);
        if (sp === 'cat') { b.set(mx - 2, my - 1 + dy, M); b.set(mx + 2, my - 1 + dy, M); }
        break;
      case 'smile':
        b.set(mx - 2, my + dy, M); b.set(mx - 1, my + 1 + dy, M); b.set(mx, my + 1 + dy, M); b.set(mx + 1, my + 1 + dy, M); b.set(mx + 2, my + dy, M);
        break;
      case 'open':
        rect(b, mx - 1, my + dy, 3, 2, '#6e2434'); b.set(mx, my + 1 + dy, '#ff8fa0');
        break;
      case 'o':
        b.set(mx, my + 1 + dy, M);
        break;
      case 'frown':
        b.set(mx - 1, my + 1 + dy, M); b.set(mx, my + dy, M); b.set(mx + 1, my + 1 + dy, M);
        break;
      case 'chew': {
        const c = Math.floor((p.t || 0) * 10) % 2;
        if (c) { b.set(mx - 1, my + dy, M); b.set(mx, my + dy, M); b.set(mx + 1, my + dy, M); }
        else { b.set(mx - 1, my + dy, M); b.set(mx + 1, my + dy, M); }
        break;
      }
      case 'yawn':
        rect(b, mx - 1, my + dy, 3, 3, '#6e2434'); b.set(mx, my + 2 + dy, '#ff8fa0');
        break;
      case 'tongue':
        b.set(mx - 1, my + dy, M); b.set(mx + 1, my + dy, M);
        b.set(mx, my + 1 + dy, '#ff6f8a'); b.set(mx + 1, my + 1 + dy, '#ff8fa0');
        break;
      case 'none':
        break;
    }
  }

  function drawHat(b, hat, hx, hy, f) {
    const top = Math.round(hy - 7);
    const x = Math.round(hx);
    if (hat === 'santa') {
      poly(b, [[x - 5, top + 2], [x + 4 - f, top - 5], [x + 5, top + 2]], '#d93545');
      rect(b, x - 5, top + 1, 11, 2, '#ffffff');
      ell(b, x + 4.5 - f, top - 5, 1.3, 1.3, '#ffffff');
    } else if (hat === 'party') {
      poly(b, [[x - 3, top + 2], [x, top - 6], [x + 3, top + 2]], '#ffcf33');
      b.set(x - 1, top - 1, '#231c20'); b.set(x + 1, top, '#231c20'); b.set(x, top - 3, '#231c20');
      ell(b, x + 0.5, top - 6, 1.2, 1.2, '#ff3d6e');
    } else if (hat === 'pumpkin') {
      ell(b, x + 0.5, top, 4.5, 2.8, '#f2832a');
      rect(b, x - 1, top - 1, 1, 3, '#c9601a'); rect(b, x + 2, top - 1, 1, 3, '#c9601a');
      rect(b, x, top - 4, 2, 2, '#4f8a3a');
    } else if (hat === 'red') {
      ell(b, x + 0.5, top + 1, 4, 2, '#d93545');
      b.set(x, top - 1, '#ffcf33'); b.set(x + 1, top - 1, '#ffcf33');
    } else if (hat === 'glasses') {
      const y = Math.round(hy - 0.2) - 2;
      for (const dx of [-7, 1]) { rect(b, x + dx + f, y - 1, 6, 1, '#231c20'); }
      rect(b, x - 1 + f, y - 1, 2, 1, '#231c20');
    } else if (hat === 'crown') {
      rect(b, x - 3, top, 7, 2, '#ffcf33');
      b.set(x - 3, top - 1, '#ffcf33'); b.set(x, top - 2, '#ffcf33'); b.set(x + 3, top - 1, '#ffcf33'); b.set(x, top - 1, '#ffcf33');
      b.set(x, top, '#ff3d6e');
    } else if (hat === 'flower') {
      const fx = x + 5;
      b.set(fx, top + 1, '#ff8fb8'); b.set(fx - 1, top + 2, '#ff8fb8'); b.set(fx + 1, top + 2, '#ff8fb8'); b.set(fx, top + 3, '#ff8fb8'); b.set(fx, top + 2, '#ffcf33');
    } else if (hat === 'leaf') {
      b.set(x + 4, top + 1, '#e8913a'); b.set(x + 5, top + 1, '#d9662a'); b.set(x + 4, top + 2, '#d9662a'); b.set(x + 6, top, '#8a4a2a');
    }
  }

  // ---------- 小图标（气泡里用） ----------
  const ICONS = {
    heart: ['.rr.rr.', 'rRrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
    zzz: ['kkkk.....', '..k......', '.k..kkk..', 'kkkk..k..', '.....k...', '....kkk..'],
    excl: ['.kk.', '.kk.', '.kk.', '.kk.', '....', '.kk.'],
    q: ['.kkk.', 'k...k', '...k.', '..k..', '.....', '..k..'],
    note: ['...kkk', '...k.k', '...k.k', '...k..', 'kkkk..', 'kkk...'],
    anger: ['r.r.r', '.r.r.', 'rr.rr', '.r.r.', 'r.r.r'],
    sweat: ['..b..', '.bbb.', 'bbBbb', 'bbbbb', '.bbb.'],
    bowl: ['.oooooo.', 'oyyyyyyo', '.oooooo.', '..oooo..'],
    drop: ['...b...', '..bbb..', '.bbbbb.', 'bbBbbbb', 'bbbbbbb', '.bbbbb.'],
    star: ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'],
    ball: ['.rrrr.', 'rWrrrr', 'rrrwrr', 'wwwwww', 'rrrrrr', '.rrrr.'],
    sun: ['y..y..y', '.yyyyy.', '.yyyyy.', 'yyyyyyy', '.yyyyy.', '.yyyyy.', 'y..y..y'],
    moon: ['..yyy', '.yy..', 'yy...', 'yy...', '.yy..', '..yyy'],
    gift: ['.r..r.', '..rr..', 'pppppp', 'pprrpp', 'pprrpp', 'pprrpp'],
    poop: ['...o...', '..ooo..', '.ooooo.', 'ooooooo'],
    cloud: ['..www..', '.wwwww.', 'wwwwwww'],
    fish: ['.bb...b', 'bbbb.bb', 'bkbbbbb', 'bbbb.bb', '.bb...b'],
    bone: ['w.....w', 'ww...ww', '.wwwww.', 'ww...ww', 'w.....w'],
    carrot: ['....gg', '...og.', '..oo..', '.oo...', 'oo....'],
    seed: ['.kk.', 'kwwk', 'kwwk', 'kwwk', '.kk.'],
    berry: ['..g..', '.rrr.', 'rrWrr', 'rrrrr', '.rrr.'],
    chili: ['...g', '..rg', '.rr.', 'rr..', 'r...'],
    cursor: ['k....', 'kk...', 'kwk..', 'kwwk.', 'kwwwk', 'kwkk.', 'k.k..'],
    music: ['..kk', '..k.', '..k.', 'kkk.', 'kkk.'],
    dots: ['.......', '.k.k.k.', '.......'],
    sparkle: ['..y..', '..y..', 'yyWyy', '..y..', '..y..'],
    book: ['oooooo', 'owwwwo', 'owwwwo', 'owwwwo', 'oooooo'],
    sleepy_moon: ['..yy', '.y..', 'y...', 'y...', '.y..', '..yy'],
    leaf: ['...gg', '..ggg', '.ggg.', 'ggg..', 'g....'],
    butterfly: ['p...p', 'pp.pp', '.pkp.', 'pp.pp'],
    friend: ['.k.k.', 'kkkkk', 'kwkwk', 'kkkkk', '.kkk.'],
    egg: ['..ww..', '.wwww.', 'wwwwbw', 'wwbwww', 'wwwwww', '.wwww.'],
    cake: ['..r..', '.www.', 'ppppp', 'wwwww', 'ppppp'],
  };
  const ICOL = { r: '#ff4f7a', R: '#ffb3c6', k: '#3b2a2e', b: '#57b4ff', B: '#d2ecff', o: '#9a6a46', y: '#ffc93c', w: '#ffffff', W: '#ffffff', p: '#b98cff', g: '#5fbf5a' };

  function drawIcon(ctx, name, x, y, s, alpha = 1) {
    const ic = ICONS[name];
    if (!ic) return;
    ctx.globalAlpha = alpha;
    for (let j = 0; j < ic.length; j++)
      for (let i = 0; i < ic[j].length; i++) {
        const ch = ic[j][i];
        if (ch === '.') continue;
        ctx.fillStyle = ICOL[ch] || '#000';
        ctx.fillRect(x + i * s, y + j * s, s, s);
      }
    ctx.globalAlpha = 1;
  }
  function iconSize(name) {
    const ic = ICONS[name];
    return ic ? [ic[0].length, ic.length] : [0, 0];
  }

  // ---------- 物品精灵 ----------
  const ITEM = {
    bowl_food: (lvl) => [
      lvl > 0.66 ? '..yyyyyy..' : '..........',
      lvl > 0.33 ? '.yyyyyyyy.' : '..........',
      lvl > 0.02 ? 'kyyyyyyyyk' : 'k........k',
      'krrrrrrrrk', 'krrRRrrrrk', '.krrrrrrk.', '..kkkkkk..',
    ],
    bowl_water: (lvl) => [
      lvl > 0.5 ? 'kbbbbbbbbk' : 'k........k',
      lvl > 0.02 ? 'kBbbbbbbbk' : 'k........k',
      'kttttttttk', 'kttTTttttk', '.kttttttk.', '..kkkkkk..',
    ],
    bed: () => [
      '...pppppppppp...', '.pppppppppppppp.', 'pPPPPPPPPPPPPPPp', 'pPPPPPPPPPPPPPPp', 'ppppppppppppppp', '.pppppppppppppp.',
    ],
    poop: () => ['...o...', '..ooo..', '.oOooo.', 'ooooooo'],
    ball: () => ['.rrrr.', 'rWrrrr', 'rrrwrr', 'wwwwww', 'rrrrrr', '.rrrr.'],
    treat_fish: () => ['.bb...b', 'bbbb.bb', 'bkbbbbb', 'bbbb.bb', '.bb...b'],
    treat_bone: () => ['w.....w', 'ww...ww', '.wwwww.', 'ww...ww', 'w.....w'],
    treat_carrot: () => ['....gg', '...og.', '..oo..', '.oo...', 'oo....'],
    treat_seed: () => ['.kk.', 'kwwk', 'kwwk', '.kk.'],
    treat_berry: () => ['..g..', '.rrr.', 'rrWrr', '.rrr.'],
    treat_chili: () => ['...g', '..rg', '.rr.', 'rr..'],
    treat_cake: () => ['..y..', '..r..', '.www.', 'ppppp', 'wwwww', 'ppppp'],
    cake: () => ['..y..y..', '..r..r..', '.wwwwww.', 'pppppppp', 'wwwwwwww', 'pppppppp'],
    cup: () => ['kkkkkk.', 'kwwwwkk', 'kwoowk.k', 'kwwwwkk', '.kkkk..'],
    litter: () => ['kkkkkkkkkkkkkk', 'kbyyyyyyyyyyBk', 'kbbbbbbbbbbbbk', '.kbbbbbbbbbbk.', '..kkkkkkkkkk..'],
    mooncake: () => ['.oooo.', 'oyyyyo', 'oyOOyo', 'oyyyyo', '.oooo.'],
    zongzi: () => ['..g..', '.ggg.', 'gwgwg', 'ggggg'],
    dumpling: () => ['.www.', 'wwwww', 'WwwwW'],
    candy: () => ['p.rrr.p', 'pprrrpp', 'p.rrr.p'],
    cookie: () => ['.ooo.', 'okoOo', 'ooook', '.ooo.'],
    egg: () => ['...ww...', '..wwww..', '.wwwwbw.', '.wwbwwww', 'wwwwwwbw', 'wbwwwwww', '.wwwwww.', '..wwww..'],
    egg_crack: () => ['...ww...', '..wkww..', '.wwkkbw.', '.wwbwkww', 'wwkwwwbw', 'wbwkwwww', '.wwwwww.', '..wwww..'],
    leaf: () => ['...gg', '..ggg', '.ggg.', 'ggg..', 'g....'],
    pebble: () => ['.ss.', 'ssSs', 'ssss'],
    feather: () => ['....w', '...ww', '..ww.', '.ww..', 'k....'],
    flower: () => ['.p.', 'pyp', '.p.', '.g.', '.g.'],
    shell: () => ['.ooo.', 'oOoOo', 'ooooo', '.o.o.'],
    starfrag: () => ['..y..', '.yyy.', 'yyWyy', '.yyy.', '..y..'],
    acorn: () => ['.oo.', 'oooo', 'yyyy', 'yyyy', '.yy.'],
    button: () => ['.rrr.', 'rkrkr', 'rrrrr', 'rkrkr', '.rrr.'],
  };
  const ITEMCOL = Object.assign({}, ICOL, { t: '#7aa7c7', T: '#c7e3f5', P: '#ffd0e4', O: '#c08a5e', s: '#9a9aa6', S: '#d0d0da' });
  ITEMCOL.p = '#e88db4';

  function drawItem(ctx, name, x, y, s, arg) {
    const f = ITEM[name];
    if (!f) return [0, 0];
    const rows = f(arg);
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < rows[j].length; i++) {
        const ch = rows[j][i];
        if (ch === '.') continue;
        ctx.fillStyle = ITEMCOL[ch] || '#000';
        ctx.fillRect(Math.round(x + i * s), Math.round(y + j * s), s, s);
      }
    return [rows[0].length, rows.length];
  }
  function itemSize(name, arg) {
    const f = ITEM[name];
    if (!f) return [0, 0];
    const r = f(arg);
    return [r[0].length, r.length];
  }

  // Buf -> canvas
  const _cache = new Map();
  let _tmp;
  function blit(ctx, buf, x, y, s, flip) {
    if (!_tmp) _tmp = document.createElement('canvas');
    if (_tmp.width !== buf.w || _tmp.height !== buf.h) { _tmp.width = buf.w; _tmp.height = buf.h; }
    const tctx = _tmp.getContext('2d');
    const img = tctx.createImageData(buf.w, buf.h);
    for (let i = 0; i < buf.d.length; i++) {
      const c = buf.d[i];
      if (c == null) continue;
      let rgb = _cache.get(c);
      if (!rgb) { rgb = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; _cache.set(c, rgb); }
      const k = i * 4;
      img.data[k] = rgb[0]; img.data[k + 1] = rgb[1]; img.data[k + 2] = rgb[2]; img.data[k + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    y -= (buf.ty || 0) * s; x -= (buf.tx || 0) * s;
    if (flip) {
      ctx.save(); ctx.translate(x + buf.w * s, y); ctx.scale(-1, 1); ctx.drawImage(_tmp, 0, 0, buf.w * s, buf.h * s); ctx.restore();
    } else ctx.drawImage(_tmp, x, y, buf.w * s, buf.h * s);
  }

    // 自定义花色（照着自家宠物调）：底色 / 花纹 / 肚皮 + 花纹样式
  const _cp = new Map();
  function tone(hex, k) {
    const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  function customPal(sp, cu) {
    const key = sp + JSON.stringify(cu);
    if (_cp.has(key)) return _cp.get(key);
    const base = cu.base || '#ee9a4c', dark = cu.stripe || tone(base, -0.3), light = cu.belly || tone(base, 0.75);
    const pal = { base, dark, light, paw: cu.pattern === 'point' ? dark : light, inner: '#f2a3a0', nose: '#e2747c', pattern: cu.pattern || 'tabby', socks: dark, name: '自定义' };
    if (sp === 'dog' && pal.pattern === 'tabby') pal.pattern = 'urajiro';
    if (sp === 'penguin') { pal.inner = '#f0963a'; pal.nose = '#f0963a'; pal.paw = '#f0963a'; }
    _cp.set(key, pal);
    return pal;
  }

  PP.SPR = { customPal, tone, _h: { outline, ell, rect, poly, flipV, shift, rot90, mirrorX, buried, drawHat }, W, H, PAD, Buf, PAL, drawPet, blit, drawIcon, iconSize, drawItem, itemSize, ICONS };
})();
