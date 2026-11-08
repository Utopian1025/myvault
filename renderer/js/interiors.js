// 每个家里面长什么样：点开一个家就能进去看看，住在里面的动物在里面过日子
// 和场景一样画在“宠物同样大小的像素”上；只负责画和标出设施（床、粮仓、窗户、门）
(function () {
  const PP = (window.PP = window.PP || {});
  const T = () => PP.ART;

  // ---------- 墙 ----------
  function woodWall(P, lay, base, R) {
    const { shade, hash, noise } = T(), { cols, gy } = lay;
    const pw = 7;
    for (let x = 0; x < cols; x++) {
      const plank = Math.floor(x / pw), edge = x % pw === 0, tone = (hash(plank, 1, 3) - 0.5) * 0.14;
      for (let y = 0; y < gy; y++) {
        let c = shade(base, tone + (noise(x / 2, y / 9, plank) - 0.5) * 0.12);
        if (edge) c = shade(base, -0.35);
        else if (x % pw === 1) c = shade(base, 0.1 + tone);
        if (!edge && hash(plank, Math.floor(y / 23), 7) < 0.12 && Math.abs((y % 23) - 11) < 2 && Math.abs((x % pw) - 3) < 2) c = shade(base, -0.3); // 木节
        if ((y % 23 === 3 || y % 23 === 4) && x % pw === 3 && hash(plank, y, 1) < 0.5) c = '#5a5a60'; // 钉子
        P.set(x, y, c);
      }
    }
    // 横梁 + 踢脚板
    for (const by of [3, Math.round(gy * 0.42)]) { P.rect(0, by, cols, 3, shade(base, -0.28)); P.hl(0, by, cols, shade(base, -0.1)); P.hl(0, by + 3, cols, shade(base, -0.5)); }
    P.rect(0, gy - 3, cols, 3, shade(base, -0.4)); P.hl(0, gy - 3, cols, shade(base, -0.2));
    // 立柱
    for (let x = 40; x < cols; x += 120) { P.rect(x, 0, 5, gy, shade(base, -0.22)); P.vl(x, 0, gy, shade(base, -0.05)); P.vl(x + 4, 0, gy, shade(base, -0.45)); }
  }
  // 土洞：外面是深色土层，里面挖出一间间圆圆的屋子，用隧道连起来
  function earthWall(P, lay, pal, chambers, R) {
    const { noise, hash, mix } = T(), { cols, rows, gy } = lay;
    const [deep, mid, lit, peb] = pal;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const n = noise(x / 6, y / 4, 41);
      let c = n < 0.4 ? deep : mix(deep, mid, 0.35);
      if (hash(x, y, 5) < 0.018) c = peb;
      if (y < 4) c = mix(deep, '#000000', 0.25);
      P.set(x, y, c);
    }
    // 草根从上面垂下来
    for (let x = 3; x < cols; x += 5 + Math.floor(hash(x, 2, 1) * 9)) { const h = 3 + Math.floor(hash(x, 3, 1) * 9); for (let k = 0; k < h; k++) P.set(x + (k > h / 2 && hash(x, k) < 0.5 ? 1 : 0), 4 + k, '#8a6a44'); }
    // 隧道 + 屋子
    const tunTop = gy - 10;
    for (let x = 0; x < cols; x++) for (let y = tunTop; y < gy; y++) { const d = (y - tunTop) / 10; P.set(x, y + Math.round(Math.sin(x / 31) * 1.2), d < 0.15 ? mix(mid, deep, 0.4) : mix(mid, lit, d * 0.6)); }
    for (const [c0, w, h] of chambers) {
      const cx = c0, cy = gy, rx = w / 2, ry = h;
      for (let y = Math.round(cy - ry); y < gy; y++) for (let x = Math.round(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny > 1) continue;
        const rim = nx * nx + ny * ny > 0.82;
        let c = rim ? mix(mid, deep, 0.5) : mix(mid, lit, 0.25 + (1 - Math.abs(nx)) * 0.35 - ny * 0.15);
        if (!rim && hash(x, y, 9) < 0.02) c = peb;
        if (!rim && noise(x / 3, y / 2, 3) < 0.18) c = mix(c, deep, 0.25);
        P.set(x, y, c);
      }
    }
  }
  function stoneWall(P, lay, R) {
    const { noise, hash, mix } = T(), { cols, gy } = lay;
    for (let y = 0; y < gy; y++) for (let x = 0; x < cols; x++) {
      const n = noise(x / 9, y / 6, 61), b = noise(x / 3, y / 3, 62);
      let c = n < 0.35 ? '#4a4652' : n < 0.65 ? '#5c5866' : '#6e6a78';
      if (b < 0.2) c = mix(c, '#2e2a36', 0.5); if (b > 0.85) c = mix(c, '#9a96a6', 0.4);
      if (hash(x, y, 3) < 0.01) c = '#8a86a0';
      P.set(x, y, c);
    }
    // 洞顶的钟乳石
    for (let x = 4; x < cols; x += 9 + Math.floor(hash(x, 4) * 14)) { const h = 3 + Math.floor(hash(x, 5) * 8); for (let k = 0; k < h; k++) { const ww = Math.max(0, Math.round((1 - k / h) * 2)); for (let d = -ww; d <= ww; d++) P.set(x + d, k, d < 0 ? '#7a7688' : '#56526a'); } }
  }
  function iceWall(P, lay) {
    const { hash, mix } = T(), { cols, gy } = lay;
    for (let y = 0; y < gy; y++) for (let x = 0; x < cols; x++) {
      const row = Math.floor(y / 9), off = row % 2 ? 7 : 0, bx = Math.floor((x + off) / 14);
      const seam = y % 9 === 0 || (x + off) % 14 === 0;
      let c = seam ? '#9cc4e0' : mix('#d4ecfa', '#bfe0f4', hash(bx, row, 2) * 0.8);
      if (!seam && (x + off) % 14 === 2 && y % 9 < 4) c = '#f2faff';
      P.set(x, y, c);
    }
  }
  // 湖底：水从上往下越来越深，阳光一束一束照下来
  function waterWall(P, lay) {
    const { mix, dith, hash } = T(), { cols, gy } = lay;
    for (let y = 0; y < gy; y++) for (let x = 0; x < cols; x++) {
      const k = y / gy; let c = mix('#5aa9d6', '#1e4f7a', k);
      const beam = Math.sin(x / 23 + y * 0.18) > 0.86; if (beam && dith(x, y, 0.4 * (1 - k))) c = mix(c, '#bfe6ff', 0.35);
      if (hash(x, y, 8) < 0.004) c = '#d8f0ff';
      P.set(x, y, c);
    }
    P.rect(0, 0, cols, 2, '#9fd8f2'); P.hl(0, 2, cols, '#7ac0e6');
  }
  function reedWall(P, lay, season) {
    const { mix, hash } = T(), { cols, gy } = lay;
    for (let y = 0; y < gy; y++) for (let x = 0; x < cols; x++) P.set(x, y, mix('#7aa86a', '#3e5e3a', y / gy));
    for (let x = 0; x < cols; x += 2) {
      const h = Math.round(gy * (0.7 + hash(x, 1) * 0.3)), col = hash(x, 2) < 0.5 ? '#5a8a4a' : '#6e9a52';
      for (let y = gy - h; y < gy; y++) P.set(x, y, season === 'autumn' ? mix(col, '#b8a050', 0.6) : season === 'winter' ? mix(col, '#c8c0a8', 0.6) : col);
      if (hash(x, 3) < 0.12) P.rect(x, gy - h - 4, 2, 5, '#6a4026');
    }
  }

  // ---------- 地面 ----------
  function floor(P, lay, kind) {
    const { noise, hash, mix, shade } = T(), { cols, rows, gy } = lay;
    for (let y = gy; y < rows; y++) for (let x = 0; x < cols; x++) {
      let c;
      const n = noise(x / 5, y / 3, 71), d = (y - gy) / (rows - gy);
      if (kind === 'plank') { const row = Math.floor((y - gy) / 4), seam = (y - gy) % 4 === 0 || (x + row * 17) % 41 === 0; c = seam ? '#6a4630' : shade('#a87a54', (hash(Math.floor((x + row * 17) / 41), row, 3) - 0.5) * 0.18 + (n - 0.5) * 0.1); }
      else if (kind === 'straw') { c = n < 0.35 ? '#c49a3a' : n < 0.7 ? '#d8b04a' : '#e8c86a'; if (hash(x, y, 2) < 0.08) c = '#f4dc8a'; if (hash(x, y, 3) < 0.04) c = '#a8822a'; }
      else if (kind === 'dirt') { c = n < 0.35 ? '#6a4a30' : n < 0.7 ? '#7a5838' : '#8a6644'; if (hash(x, y, 2) < 0.02) c = '#a8865a'; }
      else if (kind === 'stone') { c = n < 0.4 ? '#4e4a58' : n < 0.75 ? '#5e5a68' : '#6e6a78'; if (hash(x, y, 2) < 0.02) c = '#8a86a0'; }
      else if (kind === 'ice') { c = n < 0.4 ? '#cfe6f5' : n < 0.75 ? '#e2f1fb' : '#f4faff'; if (hash(x, y, 2) < 0.02) c = '#ffffff'; }
      else if (kind === 'mud') { c = n < 0.4 ? '#4a3a2a' : n < 0.75 ? '#5a4632' : '#6a5238'; if (hash(x, y, 2) < 0.02) c = '#3a2c20'; }
      else if (kind === 'sand') { c = n < 0.4 ? '#c8b48a' : n < 0.75 ? '#d8c49a' : '#e4d2aa'; }
      else c = '#888';
      P.set(x, y, mix(c, '#000000', d * 0.12));
    }
    P.hl(0, gy, cols, mix('#000000', '#ffffff', 0.2));
  }

  // ---------- 家具 / 小物件（都是小精灵） ----------
  const S = () => T().spr;
  function window_(w, h, night, frame = '#6a4630') {
    const A = T(), s = A.spr(w, h);
    s.rect(1, 1, w, h, frame);
    const sky = night ? ['#1a2050', '#2a3470'] : ['#8fd0f8', '#d5efff'];
    for (let y = 3; y < h - 1; y++) for (let x = 3; x < w - 1; x++) s.set(x, y, A.mix(sky[0], sky[1], (y - 3) / (h - 4)));
    if (night) { s.set(w - 4, 5, '#fff3b0'); s.set(w - 5, 5, '#fff3b0'); s.set(w - 4, 4, '#fff3b0'); s.set(5, 7, '#ffffff'); }
    else { s.rect(4, h - 5, w - 5, 3, '#6aae54'); s.set(6, 5, '#ffffff'); s.set(7, 5, '#ffffff'); s.set(8, 4, '#ffffff'); }
    s.vl(Math.round(w / 2) + 1, 3, h - 4, frame); s.hl(3, Math.round(h / 2) + 1, w - 3, frame);
    s.hl(0, h + 1, w + 2, A.shade(frame, -0.3));
    return s.outline(A.shade(frame, -0.55));
  }
  function lantern() { const A = T(), s = A.spr(5, 9); s.vl(3, 0, 2, '#3a2a20'); s.rect(1, 2, 5, 1, '#3a2a20'); s.rect(1, 3, 5, 5, '#ffd27a'); s.vl(1, 3, 5, '#3a2a20'); s.vl(5, 3, 5, '#3a2a20'); s.set(3, 5, '#fff6c0'); s.rect(1, 8, 5, 1, '#3a2a20'); return s; }
  function strawBed(w, h, col = '#e8c86a', blanket) {
    const A = T(), s = A.spr(w, h);
    s.ell(w / 2 + 1, h - 1, w / 2, h - 1, (nx, ny, x, y) => (ny < -0.5 ? A.shade(col, 0.2) : (x * 3 + y) % 5 === 0 ? A.shade(col, -0.2) : col));
    s.ell(w / 2 + 1, h - 1, w / 2 - 3, Math.max(1, h - 4), (nx, ny) => (ny < 0 ? A.shade(col, -0.32) : null));
    if (blanket) s.rect(Math.round(w * 0.55), h - 4, Math.round(w * 0.35), 3, blanket);
    return s.outline(A.shade(col, -0.55));
  }
  function bowl(food = '#c8743a', col = '#e05a5a') { const A = T(), s = A.spr(10, 4); s.rect(1, 2, 10, 3, col); s.hl(1, 2, 10, A.shade(col, 0.3)); s.rect(2, 1, 8, 1, food); s.set(3, 0, food); s.set(7, 0, food); return s.outline(A.shade(col, -0.55)); }
  function bone() { const A = T(), s = A.spr(9, 3); s.rect(2, 2, 6, 1, '#f4ead8'); for (const x of [1, 8]) { s.set(x, 1, '#f4ead8'); s.set(x, 3, '#f4ead8'); s.set(x + (x === 1 ? 1 : -1), 2, '#f4ead8'); } return s.outline('#8a7a60'); }
  function ball(col = '#e33b3b') { const A = T(), s = A.spr(5, 5); s.ell(3, 3, 2.5, 2.5, (nx, ny) => (nx + ny < -0.6 ? '#ffffff' : Math.abs(ny) < 0.25 ? '#ffffff' : col)); return s.outline(A.shade(col, -0.55)); }
  function pile(w, h, cols2, dot) { const A = T(), s = A.spr(w, h); s.ell(w / 2 + 1, h, w / 2, h - 0.5, (nx, ny, x, y) => (A.hash(x, y, 4) < 0.3 ? cols2[1] : ny < -0.4 ? cols2[2] || cols2[0] : cols2[0])); if (dot) for (let i = 0; i < w / 2; i++) s.set(2 + ((i * 7) % (w - 2)), h - 1 - (i % Math.max(1, h - 2)), dot); return s.outline(A.shade(cols2[0], -0.55)); }
  function eggs(n = 3) { const A = T(), s = A.spr(4 * n + 2, 5); for (let i = 0; i < n; i++) s.ell(3 + i * 4, 3, 1.8, 2.3, (nx, ny) => (nx < -0.2 && ny < 0 ? '#ffffff' : '#f4ead8')); return s.outline('#a8988a'); }
  function frame(w, h, inner) { const A = T(), s = A.spr(w, h); s.rect(1, 1, w, h, '#c99a6a'); s.rect(2, 2, w - 2, h - 2, inner || '#bfe0f4'); return s.outline('#5a3a24'); }
  function shelf(w) { const A = T(), s = A.spr(w, 8); s.rect(1, 6, w, 2, '#8a5e40'); s.hl(1, 6, w, '#a87a54'); s.rect(3, 8, 1, 1, '#5a3a24'); s.rect(w - 2, 8, 1, 1, '#5a3a24'); const jars = ['#e05a5a', '#ffcf33', '#7ac8ff', '#7be07b']; for (let x = 3; x < w - 3; x += 5) { const c = jars[(x / 5) % 4 | 0]; s.rect(x, 2, 3, 4, c); s.hl(x, 2, 3, A.shade(c, 0.3)); s.rect(x, 1, 3, 1, '#c99a6a'); } return s.outline('#3a2418'); }
  function crystal(col) { const A = T(), s = A.spr(9, 12); const pts = [[2, 6, 3], [5, 10, 4], [7, 5, 2.5]]; for (const [x, h, w] of pts) for (let y = 0; y < h; y++) { const ww = Math.max(0.5, w * (y / h)); for (let d = -Math.floor(ww); d <= Math.floor(ww); d++) s.set(x + d, 12 - h + y, d < 0 ? A.shade(col, 0.4) : d > 0 ? A.shade(col, -0.2) : col); } return s.outline(A.shade(col, -0.6)); }
  function coins(w) { const A = T(), s = A.spr(w, Math.round(w * 0.35)); const h = Math.round(w * 0.35); s.ell(w / 2 + 1, h, w / 2, h - 0.5, (nx, ny, x, y) => (A.hash(x, y, 9) < 0.15 ? '#fff6a0' : (x + y) % 3 === 0 ? '#c89a2a' : '#ffcf33')); s.set(Math.round(w * 0.3), h - 3, '#e05a5a'); s.set(Math.round(w * 0.6), h - 2, '#5ad1ff'); return s.outline('#6a4a10'); }
  function candle() { const A = T(), s = A.spr(3, 8); s.rect(1, 3, 3, 6, '#f4ead8'); s.set(2, 2, '#ffcf33'); s.set(2, 1, '#fff6c0'); return s.outline('#8a7a60'); }
  function bucket(fish) { const A = T(), s = A.spr(10, 8); s.rect(2, 3, 8, 6, '#7a8aa0'); s.hl(2, 3, 8, '#a8b8cc'); s.hl(2, 6, 8, '#5a6a80'); if (fish) { s.rect(4, 1, 2, 3, '#7ab8e8'); s.set(5, 0, '#7ab8e8'); s.rect(7, 2, 2, 2, '#9fd0f2'); } return s.outline('#3a4454'); }
  function trough(w, food) { const A = T(), s = A.spr(w, 6); s.rect(1, 2, w, 5, '#8a5e40'); s.hl(1, 2, w, '#a87a54'); s.rect(2, 3, w - 2, 2, food); s.rect(2, 7, 2, 1, '#5a3a24'); s.rect(w - 2, 7, 2, 1, '#5a3a24'); return s.outline('#3a2418'); }
  function perchBar(w) { const A = T(), s = A.spr(w, 9); s.rect(1, 2, w, 2, '#a87a54'); s.vl(2, 2, 8, '#8a5e40'); s.vl(w - 1, 2, 8, '#8a5e40'); s.rect(1, 6, w, 1, '#8a5e40'); return s.outline('#3a2418'); }
  function nestBox(w) { const A = T(), s = A.spr(w, 9); s.rect(1, 1, w, 9, '#a87a54'); s.rect(3, 3, w - 4, 5, '#6a4630'); s.rect(3, 6, w - 4, 2, '#e8c86a'); s.ell(w / 2 + 1, 6, 2, 1.6, '#f4ead8'); return s.outline('#3a2418'); }
  function leafBed(w, season) { const A = T(), s = A.spr(w, 7), cs = ['#c8642a', '#e8963a', '#a8783a', '#7a9a4a']; s.ell(w / 2 + 1, 6, w / 2, 5, (nx, ny, x, y) => (ny < -0.3 && A.hash(x, y, 5) < 0.5 ? null : cs[Math.floor(A.hash(x, y, 2) * 4)])); return s.outline('#4a2a10'); }
  function mushroomSmall() { return T().mushrooms('autumn'); }
  function plate(label) { const A = T(), s = A.spr(Math.max(16, label.length * 7 + 4), 7); s.rect(1, 1, s.w - 2, 7, '#c99a6a'); s.hl(1, 1, s.w - 2, '#e2c49a'); return s.outline('#5a3a24'); }
  function steamPool(w, h) { const A = T(), s = A.spr(w, h); s.ell(w / 2 + 1, h / 2 + 1, w / 2, h / 2, (nx, ny, x, y) => (nx * nx + ny * ny > 0.72 ? (A.hash(x, y, 2) < 0.5 ? '#8a8a96' : '#a8a8b4') : ny < -0.4 ? '#bfeaf0' : (x + y) % 7 === 0 ? '#e6fbff' : '#8fd8e0')); return s.outline('#4a4a56'); }
  function yuzu() { const A = T(), s = A.spr(4, 4); s.ell(2.5, 2.5, 2, 2, (nx, ny) => (nx + ny < -0.6 ? '#fff0a0' : '#ffcf33')); s.set(3, 0, '#5aa64e'); return s.outline('#a87a10'); }
  function cobweb() { const A = T(), s = new A.Pix(10, 10); for (let k = 0; k < 10; k++) { s.set(k, 0, '#d8d8e0'); s.set(0, k, '#d8d8e0'); s.set(k, k, '#c0c0cc'); } for (const r of [3, 6, 9]) for (let k = 0; k <= r; k++) s.set(k, r - k, '#c0c0cc'); return s; }
  function hayStack(w, h) { const A = T(), s = A.spr(w, h); s.ell(w / 2 + 1, h, w / 2, h, (nx, ny, x, y) => (ny < -0.6 ? '#f0cc6a' : (y * 3 + x) % 4 === 0 ? '#c49a3a' : nx < -0.3 ? '#e8bc52' : '#d4a43a')); for (let i = 0; i < w / 3; i++) s.set(2 + i * 3, 1 + (i % 3) + Math.round(h * 0.2), '#f4dc8a'); return s.outline('#6a4a20'); }
  function rug(w, c1, c2) { const A = T(), s = new A.Pix(w, 3); for (let x = 0; x < w; x++) for (let y = 0; y < 3; y++) s.set(x, y, (Math.floor(x / 3) + y) % 2 ? c1 : c2); return s; }

  // ---------- 小工具 ----------
  function put(lay, s, c, r, extra) { lay.items.push(Object.assign({ s, c: Math.round(c), r: Math.round(r) }, extra || {})); return s; }
  function spot(lay, id, c, r, extra) { lay.spots[id] = Object.assign({ c: Math.round(c), r: Math.round(r) }, extra || {}); }
  const C = (lay, f) => Math.round(lay.cols * f);
  const Z = (lay, n) => Math.round(n * (lay.full ? 1.35 : 1));
  // 每间屋子共同的东西：门（左边，透着外面的光）、名牌
  function door(lay, P, style, label) {
    const A = T(), dc = 22, h = Math.min(lay.gy - 4, Z(lay, 30)), w = Z(lay, 16);
    const top = lay.gy - h;
    for (let y = top; y < lay.gy; y++) for (let x = dc - w / 2; x < dc + w / 2; x++) {
      if (style === 'arch' && y < top + w / 2 && Math.pow((x - dc) / (w / 2), 2) + Math.pow((y - top - w / 2) / (w / 2), 2) > 1) continue;
      P.set(x, y, A.mix('#fff6d0', '#ffe2a0', (y - top) / h));
    }
    lay.lights.push({ x: dc - 3, y: lay.gy - 6, w: 6, h: 4, r: 10, col: '#fff2c0', day: true });
    spot(lay, 'door', dc, lay.base + 2);
    lay.door = { c: dc, top };
  }

  // ---------- 十二个家 ----------
  const I = {};
  const night = (e) => e && (e.time.phase === 'night' || e.time.phase === 'dusk');
  // 猫：谷仓阁楼。木板墙、干草堆、小圆窗、挂着的马灯、老鼠洞、猫抓过的柱子
  I.cat = (P, lay, R, e) => {
    const A = T(); woodWall(P, lay, '#a8553a', R); floor(P, lay, 'plank'); door(lay, P, 'square');
    put(lay, window_(Z(lay, 20), Z(lay, 16), night(e), '#5a3a24'), C(lay, 0.5), Math.round(lay.gy * 0.4));
    put(lay, hayStack(Z(lay, 46), Z(lay, 20)), C(lay, 0.22), lay.base + 2); spot(lay, 'hay', C(lay, 0.22), lay.base + 3);
    put(lay, hayStack(Z(lay, 30), Z(lay, 13)), C(lay, 0.82), lay.base + 1);
    put(lay, strawBed(Z(lay, 22), Z(lay, 6), '#e8c86a', '#c0504a'), C(lay, 0.62), lay.base + 4); spot(lay, 'bed', C(lay, 0.62), lay.base + 5);
    put(lay, bowl('#c8743a', '#5aa0e0'), C(lay, 0.4), lay.base + 5); spot(lay, 'eat', C(lay, 0.4) + 8, lay.base + 6);
    put(lay, ball('#ff8fb0'), C(lay, 0.7), lay.rows - 4); spot(lay, 'play', C(lay, 0.7), lay.rows - 3);
    const mh = new A.Pix(6, 5); mh.ell(3, 5, 3, 4, '#1a1010'); put(lay, mh, C(lay, 0.92), lay.gy);
    spot(lay, 'mousehole', C(lay, 0.9), lay.base + 2);
    put(lay, lantern(), C(lay, 0.36), Math.round(lay.gy * 0.42) + 12, { light: [1, 3, 4, 4] });
    put(lay, cobweb(), 6 + 5, 14);
    put(lay, frame(Z(lay, 12), Z(lay, 10), '#ffd8a0'), C(lay, 0.72), Math.round(lay.gy * 0.36));
  };
  // 狗：狗窝。小木屋里，格子毯子、骨头、球、水碗、挂着的项圈和小奖状
  I.dog = (P, lay, R, e) => {
    const A = T(); woodWall(P, lay, '#b0703a', R); floor(P, lay, 'plank'); door(lay, P, 'arch');
    put(lay, rug(C(lay, 0.36), '#d9534f', '#f4ead8'), C(lay, 0.6), lay.base + 6);
    put(lay, strawBed(Z(lay, 30), Z(lay, 7), '#7aa0d0', '#f4ead8'), C(lay, 0.6), lay.base + 5); spot(lay, 'bed', C(lay, 0.6), lay.base + 6);
    put(lay, bowl('#c8743a', '#e05a5a'), C(lay, 0.32), lay.base + 5); spot(lay, 'eat', C(lay, 0.32) + 8, lay.base + 6);
    put(lay, bowl('#7ac8ff', '#5aa0e0'), C(lay, 0.36), lay.base + 5);
    put(lay, bone(), C(lay, 0.8), lay.rows - 5); put(lay, ball('#ffcf33'), C(lay, 0.48), lay.rows - 3); spot(lay, 'play', C(lay, 0.48), lay.rows - 2);
    put(lay, window_(Z(lay, 18), Z(lay, 14), night(e)), C(lay, 0.3), Math.round(lay.gy * 0.4));
    put(lay, frame(Z(lay, 10), Z(lay, 12), '#ffcf33'), C(lay, 0.75), Math.round(lay.gy * 0.36));
    const leash = new A.Pix(6, 14); for (let k = 0; k < 12; k++) leash.set(2 + Math.round(Math.sin(k / 2)), k, '#d9534f'); leash.ell(3, 12, 2, 1.5, '#d9534f'); put(lay, leash, C(lay, 0.88), Math.round(lay.gy * 0.42) + 16);
    put(lay, lantern(), C(lay, 0.5), Math.round(lay.gy * 0.42) + 12, { light: [1, 3, 4, 4] });
  };
  // 小鸡：鸡舍。一排草窝、栖木、玉米粒槽、蛋
  I.chick = (P, lay, R, e) => {
    const A = T(); woodWall(P, lay, '#d8b07a', R); floor(P, lay, 'straw'); door(lay, P, 'square');
    for (let i = 0; i < 4; i++) put(lay, nestBox(Z(lay, 16)), C(lay, 0.36 + i * 0.1), Math.round(lay.gy * 0.42) + 1);
    put(lay, perchBar(Z(lay, 60)), C(lay, 0.78), lay.base + 1); spot(lay, 'perch', C(lay, 0.78), lay.base - Z(lay, 7), { perch: true });
    put(lay, strawBed(Z(lay, 20), Z(lay, 5)), C(lay, 0.5), lay.base + 4); spot(lay, 'bed', C(lay, 0.5), lay.base + 5);
    put(lay, eggs(3), C(lay, 0.54), lay.base + 3);
    put(lay, trough(Z(lay, 26), '#ffcf33'), C(lay, 0.26), lay.base + 6); spot(lay, 'eat', C(lay, 0.26), lay.base + 7);
    put(lay, window_(Z(lay, 16), Z(lay, 12), night(e)), C(lay, 0.18), Math.round(lay.gy * 0.36));
    put(lay, lantern(), C(lay, 0.62), Math.round(lay.gy * 0.42) + 13, { light: [1, 3, 4, 4] });
  };
  // 小猪：猪圈。稻草堆、泥巴角、大食槽、苹果
  I.pig = (P, lay, R, e) => {
    const A = T(); woodWall(P, lay, '#9a6a44', R); floor(P, lay, 'straw'); door(lay, P, 'square');
    const mud = new A.Pix(C(lay, 0.24), 8); mud.ell(mud.w / 2, 4, mud.w / 2 - 1, 3.5, (nx, ny, x, y) => (ny < -0.4 ? '#7a5a3a' : A.hash(x, y, 2) < 0.05 ? '#8a6a48' : '#5a4230')); put(lay, mud, C(lay, 0.78), lay.base + 9); spot(lay, 'mud', C(lay, 0.78), lay.base + 6);
    put(lay, hayStack(Z(lay, 40), Z(lay, 14)), C(lay, 0.45), lay.base + 2); spot(lay, 'bed', C(lay, 0.45), lay.base + 4);
    put(lay, trough(Z(lay, 34), '#9ac850'), C(lay, 0.24), lay.base + 6); spot(lay, 'eat', C(lay, 0.24), lay.base + 7);
    for (let i = 0; i < 3; i++) { const ap = new A.Pix(4, 4); ap.ell(2, 2, 1.6, 1.6, i % 2 ? '#e33b3b' : '#9ac850'); ap.set(2, 0, '#5a3a24'); put(lay, ap, C(lay, 0.3) + i * 6, lay.base + 8); }
    put(lay, window_(Z(lay, 18), Z(lay, 12), night(e)), C(lay, 0.62), Math.round(lay.gy * 0.36));
    put(lay, lantern(), C(lay, 0.4), Math.round(lay.gy * 0.42) + 12, { light: [1, 3, 4, 4] });
  };
  // 兔子：草地下的兔子洞。几间圆屋：卧室（干草窝）、储藏室（胡萝卜、三叶草）、洞口透光
  I.rabbit = (P, lay, R, e) => {
    const A = T(); earthWall(P, lay, ['#3a2818', '#5a4028', '#8a6a44', '#a8865a'], [[C(lay, 0.32), C(lay, 0.26), lay.gy * 0.8], [C(lay, 0.68), C(lay, 0.3), lay.gy * 0.85]], R); floor(P, lay, 'dirt'); door(lay, P, 'arch');
    put(lay, strawBed(Z(lay, 30), Z(lay, 7), '#d8c070'), C(lay, 0.68), lay.base + 4); spot(lay, 'bed', C(lay, 0.68), lay.base + 5);
    put(lay, pile(Z(lay, 18), Z(lay, 7), ['#ff8a2a', '#e8751a', '#ffa04a'], '#5aa64e'), C(lay, 0.28), lay.base + 3); spot(lay, 'eat', C(lay, 0.3), lay.base + 5);
    put(lay, pile(Z(lay, 14), Z(lay, 5), ['#5aa64e', '#3f8a44', '#86c264'], '#ffffff'), C(lay, 0.38), lay.base + 4);
    put(lay, candle(), C(lay, 0.55), lay.base + 2, { light: [1, 0, 2, 2] });
    put(lay, frame(Z(lay, 10), Z(lay, 8), '#86c264'), C(lay, 0.68), Math.round(lay.gy * 0.45));
  };
  // 仓鼠：向日葵根下的地洞，粮仓里堆着瓜子，卧室铺着棉花，还有一个跑轮
  I.hamster = (P, lay, R, e) => {
    const A = T(); earthWall(P, lay, ['#3e2a1a', '#60442a', '#90704a', '#b09068'], [[C(lay, 0.3), C(lay, 0.24), lay.gy * 0.75], [C(lay, 0.62), C(lay, 0.24), lay.gy * 0.8], [C(lay, 0.86), C(lay, 0.16), lay.gy * 0.6]], R); floor(P, lay, 'dirt'); door(lay, P, 'arch');
    // 向日葵的根从顶上伸下来
    for (const x of [C(lay, 0.3), C(lay, 0.62)]) for (let y = 0; y < lay.gy * 0.3; y++) P.set(x + Math.round(Math.sin(y / 3)), y, '#c8a070');
    put(lay, pile(Z(lay, 30), Z(lay, 10), ['#3a3a3a', '#f4ead8', '#5a5a5a'], '#f4ead8'), C(lay, 0.3), lay.base + 2); spot(lay, 'eat', C(lay, 0.3), lay.base + 4); lay.stash = { c: C(lay, 0.3), r: lay.base + 2 };
    put(lay, pile(Z(lay, 24), Z(lay, 7), ['#ffffff', '#e8eef4', '#ffffff']), C(lay, 0.62), lay.base + 4); spot(lay, 'bed', C(lay, 0.62), lay.base + 5);
    const wheel = new A.Pix(Z(lay, 18), Z(lay, 20)), wr = wheel.w / 2 - 1; wheel.ell(wheel.w / 2, wr, wr, wr, (nx, ny) => (nx * nx + ny * ny > 0.75 ? '#7ac8ff' : (Math.abs(nx) < 0.08 || Math.abs(ny) < 0.08) ? '#5aa0e0' : null)); wheel.rect(wheel.w / 2 - 1, wr, 2, wheel.h - wr, '#5aa0e0'); put(lay, wheel, C(lay, 0.86), lay.base + 2); spot(lay, 'play', C(lay, 0.86), lay.base + 3);
    put(lay, candle(), C(lay, 0.46), lay.base + 2, { light: [1, 0, 2, 2] });
  };
  // 狐狸：大树根下的洞。树根盘在头顶，落叶铺的床，叼回来的浆果和骨头，一根羽毛
  I.fox = (P, lay, R, e) => {
    const A = T(); earthWall(P, lay, ['#2e2014', '#4e3622', '#7a5a3a', '#9a7a5a'], [[C(lay, 0.5), C(lay, 0.6), lay.gy * 0.9]], R); floor(P, lay, 'dirt'); door(lay, P, 'arch');
    for (let i = 0; i < 7; i++) { let x = C(lay, 0.25 + i * 0.08), y = 0; for (let k = 0; k < lay.gy * 0.45; k++) { x += Math.round(Math.sin(k / 4 + i) * 1); y++; P.rect(x, y, 3, 1, k % 5 ? '#6b4630' : '#8a5e40'); } }
    put(lay, leafBed(Z(lay, 34)), C(lay, 0.58), lay.base + 4); spot(lay, 'bed', C(lay, 0.58), lay.base + 5);
    put(lay, pile(Z(lay, 12), Z(lay, 5), ['#c8283a', '#8a1a2a', '#ff5a6a']), C(lay, 0.36), lay.base + 4); spot(lay, 'eat', C(lay, 0.36), lay.base + 5);
    put(lay, bone(), C(lay, 0.76), lay.rows - 4);
    const feather = new A.Pix(10, 4); for (let k = 0; k < 9; k++) { feather.set(k, 2, '#e8e0d0'); if (k > 2) { feather.set(k, 1, '#ffffff'); feather.set(k, 3, '#d8d0c0'); } } put(lay, feather, C(lay, 0.44), lay.rows - 3);
    put(lay, mushroomSmall(), C(lay, 0.82), lay.base + 3);
  };
  // 刺猬：倒木下的落叶窝。头顶是空心的树干，满地落叶、橡果、蜗牛壳，冬眠时缩成球
  I.hedgehog = (P, lay, R, e) => {
    const A = T(); earthWall(P, lay, ['#2a2016', '#463424', '#6e5438', '#8a7050'], [[C(lay, 0.5), C(lay, 0.7), lay.gy * 0.75]], R); floor(P, lay, 'dirt');
    // 头顶的倒木（看得到年轮的切面）
    const ly0 = Math.round(lay.gy * 0.12), lh = Math.round(lay.gy * 0.2);
    P.rect(0, ly0, lay.cols, lh, '#6b4630'); for (let x = 0; x < lay.cols; x += 3) P.vl(x, ly0, lh, (x / 3) % 3 ? '#5a3a24' : '#7a5238'); P.hl(0, ly0 + lh, lay.cols, '#3a2418');
    door(lay, P, 'arch');
    put(lay, leafBed(Z(lay, 40)), C(lay, 0.5), lay.base + 4); spot(lay, 'bed', C(lay, 0.5), lay.base + 5);
    for (let i = 0; i < 5; i++) { const ac = new A.Pix(4, 5); ac.rect(0, 0, 4, 2, '#6b4630'); ac.ell(2, 3, 1.5, 1.6, '#c8943a'); put(lay, ac, C(lay, 0.24) + i * 7, lay.base + 6 + (i % 2)); }
    spot(lay, 'eat', C(lay, 0.26), lay.base + 6);
    const snail = new A.Pix(6, 5); snail.ell(3, 2, 2.5, 2, (nx, ny) => (nx * nx + ny * ny < 0.3 ? '#a8783a' : '#e8c890')); snail.rect(0, 4, 6, 1, '#c8b8a0'); put(lay, snail, C(lay, 0.78), lay.rows - 4);
    put(lay, mushroomSmall(), C(lay, 0.72), lay.base + 2);
  };
  // 小龙：石头山洞。发光水晶、金币堆、蜡烛、刻在墙上的画
  I.dragon = (P, lay, R, e) => {
    const A = T(); stoneWall(P, lay, R); floor(P, lay, 'stone'); door(lay, P, 'arch');
    put(lay, coins(Z(lay, 34)), C(lay, 0.66), lay.base + 3); spot(lay, 'bed', C(lay, 0.66), lay.base + 4);
    for (const [f, col] of [[0.3, '#b98cff'], [0.46, '#5ad1ff'], [0.86, '#ff8fb0']]) { put(lay, crystal(col), C(lay, f), lay.base + 1, { light: [2, 3, 5, 6], col }); }
    put(lay, candle(), C(lay, 0.54), lay.base + 2, { light: [1, 0, 2, 2] }); put(lay, candle(), C(lay, 0.78), lay.base + 2, { light: [1, 0, 2, 2] });
    put(lay, pile(Z(lay, 12), Z(lay, 5), ['#c8283a', '#8a1a2a', '#ff5a6a']), C(lay, 0.38), lay.base + 5); spot(lay, 'eat', C(lay, 0.38), lay.base + 6);
    // 墙上的画：太阳和一只小龙（用刻痕画的）
    const cx = C(lay, 0.6), cy = Math.round(lay.gy * 0.4);
    for (let a = 0; a < 6.28; a += 0.4) P.set(cx + Math.round(Math.cos(a) * 4), cy + Math.round(Math.sin(a) * 4), '#9a96a6');
    for (let k = 0; k < 16; k++) P.set(cx + 10 + k, cy + 4 + Math.round(Math.sin(k / 2.5) * 2), '#9a96a6');
  };
  // 青蛙：大荷叶底下的湖底泥窝。荷叶的茎从上面伸下来，小鱼游过，冒泡泡
  I.frog = (P, lay, R, e) => {
    const A = T(); waterWall(P, lay); floor(P, lay, 'mud');
    const winter = lay.season === 'winter';
    if (winter) { P.rect(0, 0, lay.cols, 4, '#e6f3fb'); P.hl(0, 4, lay.cols, '#b8d8ee'); }
    for (let i = 0; i < 9; i++) { const x = C(lay, 0.08 + i * 0.11); for (let y = winter ? 5 : 3; y < lay.gy; y++) P.set(x + Math.round(Math.sin(y / 7 + i)), y, '#3f8a44'); if (!winter) P.ell(x, 2, 8, 1.5, '#4f9a40'); }
    for (let i = 0; i < 12; i++) { const x = Math.floor(R() * lay.cols), h = 6 + Math.floor(R() * 14); for (let k = 0; k < h; k++) P.set(x + Math.round(Math.sin(k / 2) * 0.7), lay.gy - k, k > h - 3 ? '#7ac06a' : '#4f8a40'); }
    const pad = new A.Pix(Z(lay, 34), Z(lay, 6)); pad.ell(pad.w / 2, 3, pad.w / 2 - 1, 2.5, (nx, ny, x, y) => (ny < -0.4 ? '#6a5238' : A.hash(x, y, 1) < 0.08 ? '#3f8a44' : '#5a4632')); put(lay, pad, C(lay, 0.52), lay.base + 3); spot(lay, 'bed', C(lay, 0.52), lay.base + 4);
    spot(lay, 'eat', C(lay, 0.3), lay.base + 5); spot(lay, 'play', C(lay, 0.75), lay.base + 6);
    lay.bubbles = true; lay.underwater = true;
  };
  // 鸭子：芦苇丛里的窝。芦苇墙、软软的羽毛窝、几颗蛋、水边
  I.duck = (P, lay, R, e) => {
    const A = T(); reedWall(P, lay, lay.season); floor(P, lay, 'mud'); door(lay, P, 'arch');
    const water = new A.Pix(C(lay, 0.3), 7); water.ell(water.w / 2, 3, water.w / 2 - 1, 3, (nx, ny, x, y) => ((x + y) % 7 === 0 ? '#bfe6ff' : ny < -0.3 ? '#7ac0e6' : '#5aa9d6')); put(lay, water, C(lay, 0.8), lay.base + 9); spot(lay, 'play', C(lay, 0.8), lay.base + 6);
    const nest = strawBed(Z(lay, 34), Z(lay, 9), '#b8a070'); put(lay, nest, C(lay, 0.48), lay.base + 4); spot(lay, 'bed', C(lay, 0.48), lay.base + 5);
    put(lay, eggs(2), C(lay, 0.54), lay.base + 2);
    for (let i = 0; i < 6; i++) { const f = new A.Pix(4, 2); f.hl(0, 0, 4, '#ffffff'); f.set(0, 1, '#e8e8e8'); put(lay, f, C(lay, 0.36) + i * 9, lay.rows - 3 - (i % 3)); }
    put(lay, pile(Z(lay, 12), Z(lay, 4), ['#5a8a4a', '#3e6a3a', '#7aa86a']), C(lay, 0.26), lay.base + 5); spot(lay, 'eat', C(lay, 0.26), lay.base + 6);
  };
  // 水豚：湖边温泉。热气腾腾的石头池子、竹子、漂着的柚子、小木桶
  I.capybara = (P, lay, R, e) => {
    const A = T(); stoneWall(P, lay, R);
    for (let y = 0; y < lay.gy; y++) for (let x = 0; x < lay.cols; x++) if ((x + y) % 2 === 0) P.set(x, y, A.mix('#6e6a78', '#a8b4c0', 0.4)); // 雾气
    for (let i = 0; i < 6; i++) { const b = A.bamboo(Math.round(lay.gy * 0.95), lay.season, R); b.stamp(P, C(lay, 0.06 + i * 0.17) + (i % 2) * 8, lay.gy, 0.5, 1); }
    floor(P, lay, 'stone');
    put(lay, steamPool(C(lay, 0.46), Math.round((lay.rows - lay.gy) * 0.7)), C(lay, 0.56), lay.rows - 2); spot(lay, 'bed', C(lay, 0.56), lay.base + 8, { water: true, soak: true });
    for (let i = 0; i < 3; i++) put(lay, yuzu(), C(lay, 0.46 + i * 0.08), lay.base + 9 + (i % 2) * 3);
    put(lay, bucket(false), C(lay, 0.2), lay.base + 5); spot(lay, 'eat', C(lay, 0.24), lay.base + 6);
    put(lay, pile(Z(lay, 14), Z(lay, 5), ['#5aa64e', '#3f8a44', '#86c264']), C(lay, 0.28), lay.base + 5);
    door(lay, P, 'arch'); lay.steam = { c: C(lay, 0.56), r: lay.base + 2, w: C(lay, 0.4) };
  };
  // 企鹅：冰屋。冰砖墙、鱼桶、冰做的床、透进来的蓝光
  I.penguin = (P, lay, R, e) => {
    const A = T(); iceWall(P, lay); floor(P, lay, 'ice'); door(lay, P, 'arch');
    put(lay, bucket(true), C(lay, 0.3), lay.base + 5); spot(lay, 'eat', C(lay, 0.3) + 8, lay.base + 6);
    const bed = new A.Pix(Z(lay, 34), Z(lay, 8)); bed.rect(0, 2, bed.w, bed.h - 2, '#bfe0f4'); bed.hl(0, 2, bed.w, '#f2faff'); bed.rect(3, 0, bed.w - 6, 3, '#7aa8d0'); bed.outline && 0; put(lay, bed, C(lay, 0.6), lay.base + 4); spot(lay, 'bed', C(lay, 0.6), lay.base + 2);
    const snowball = new A.Pix(4, 4); snowball.ell(2, 2, 1.8, 1.8, '#ffffff'); for (let i = 0; i < 4; i++) put(lay, snowball, C(lay, 0.84) + (i % 2) * 4, lay.base + 6 - Math.floor(i / 2) * 3);
    spot(lay, 'play', C(lay, 0.82), lay.base + 7);
    put(lay, frame(Z(lay, 12), Z(lay, 10), '#ffffff'), C(lay, 0.45), Math.round(lay.gy * 0.4));
    lay.lights.push({ x: C(lay, 0.45) - 2, y: 6, w: 4, h: 3, r: 14, col: '#bfe6ff' });
  };

  // 海龟：珊瑚拱门下面。四周是彩色珊瑚墙，地上铺着软软的海草床，小鱼从门口游过
  function reefWall(P, lay, tint) {
    const { noise, hash, mix } = T(), { cols, gy } = lay;
    const cs = ['#c85a6a', '#e8806a', '#d86a7a', '#f4a890', '#b98cff', '#7ad8c8'];
    for (let y = 0; y < gy; y++) for (let x = 0; x < cols; x++) {
      const n = noise(x / 5, y / 5, 121), m = noise(x / 13, y / 9, 122);
      let c = mix(cs[Math.floor(m * 4) % 4], tint, 0.35 + y / gy * 0.25);
      if (n < 0.28) c = mix(c, '#2a2a4a', 0.35); if (n > 0.8) c = mix(c, '#ffffff', 0.2);
      if (hash(x, y, 5) < 0.006) c = cs[4 + (x % 2)];
      P.set(x, y, c);
    }
  }
  I.turtle = (P, lay, R, e) => {
    const A = T(); reefWall(P, lay, '#2a5a8a'); floor(P, lay, 'sand'); door(lay, P, 'arch');
    const bed = new A.Pix(Z(lay, 44), Z(lay, 9)); for (let x = 0; x < bed.w; x++) { const h = 3 + Math.round(A.hash(x, 1, 3) * (bed.h - 3)); for (let y = 0; y < h; y++) bed.set(x + (y % 3 === 2 ? 1 : 0), bed.h - 1 - y, x % 3 ? '#4f9a40' : '#6aae54'); }
    put(lay, bed, C(lay, 0.56), lay.base + 4); spot(lay, 'bed', C(lay, 0.56), lay.base + 5);
    put(lay, pile(Z(lay, 16), Z(lay, 6), ['#3f7a3a', '#2f6a2e', '#5a9a4a']), C(lay, 0.3), lay.base + 4); spot(lay, 'eat', C(lay, 0.3), lay.base + 5);
    for (let i = 0; i < 4; i++) { const eg = new A.Pix(4, 4); eg.ell(2, 2, 1.7, 1.7, (nx, ny) => (nx + ny < -0.5 ? '#ffffff' : '#f0eadc')); put(lay, eg, C(lay, 0.78) + i * 4, lay.base + 6 - (i % 2)); }
    spot(lay, 'play', C(lay, 0.8), lay.base + 7);
    lay.bubbles = true; lay.underwater = true;
  };
  // 螃蟹：海螺里面。一圈一圈的粉色螺壁，捡来的亮晶晶小石子摆在架子上
  I.crab = (P, lay, R, e) => {
    const A = T(), { cols, gy } = lay;
    for (let y = 0; y < gy; y++) for (let x = 0; x < cols; x++) { const k = Math.sin(x / 9 + y / 14) * 0.5 + 0.5; P.set(x, y, A.mix('#f4d8c4', '#e8a8a0', k * 0.7 + y / gy * 0.2)); if ((x + Math.round(y * 1.6)) % 22 === 0) P.set(x, y, '#d8968e'); }
    floor(P, lay, 'sand'); door(lay, P, 'arch');
    put(lay, pile(Z(lay, 26), Z(lay, 6), ['#e4d2aa', '#d8c49a', '#f4e2c0']), C(lay, 0.6), lay.base + 4); spot(lay, 'bed', C(lay, 0.6), lay.base + 5);
    put(lay, shelf(Z(lay, 36)), C(lay, 0.4), Math.round(lay.gy * 0.5));
    for (let i = 0; i < 6; i++) { const g = new A.Pix(3, 3); g.ell(1.5, 1.5, 1.3, 1.3, ['#5ad1ff', '#ffcf33', '#ff8fb0', '#b98cff', '#ffffff', '#7be07b'][i]); put(lay, g, C(lay, 0.74) + i * 5, lay.base + 5 + (i % 2)); }
    spot(lay, 'play', C(lay, 0.78), lay.base + 6);
    put(lay, pile(Z(lay, 12), Z(lay, 5), ['#ff8a6a', '#e8604a', '#ffb09a']), C(lay, 0.26), lay.base + 4); spot(lay, 'eat', C(lay, 0.26), lay.base + 5);
    lay.bubbles = true; lay.underwater = true;
  };
  // 章鱼：沉船船舱。斜斜的木板、圆舷窗、一排收集来的贝壳和瓶子，角落里是它睡觉的陶罐
  I.octopus = (P, lay, R, e) => {
    const A = T(); woodWall(P, lay, '#5a4a3a', R);
    for (let y = 0; y < lay.gy; y++) for (let x = 0; x < lay.cols; x++) if (A.hash(x, y, 77) < 0.05) P.set(x, y, '#4a7a5a'); // 青苔
    floor(P, lay, 'plank'); door(lay, P, 'square');
    for (const f of [0.34, 0.66]) { const pw = new A.Pix(14, 14); pw.ell(7, 7, 6.5, 6.5, (nx, ny) => (nx * nx + ny * ny > 0.6 ? '#c8a050' : ny < -0.2 ? '#7ac8f0' : '#3a7ab8')); pw.set(5, 5, '#ffffff'); put(lay, pw, C(lay, f), Math.round(lay.gy * 0.42)); }
    const jar = new A.Pix(Z(lay, 22), Z(lay, 20)), jw = jar.w; jar.ell(jw / 2, jar.h * 0.6, jw / 2 - 1, jar.h * 0.4 - 1, (nx, ny) => (nx < -0.4 ? '#e09a6a' : nx > 0.5 ? '#a8603a' : '#c8784a')); jar.rect(jw / 2 - 4, 1, 8, Math.round(jar.h * 0.25), '#c8784a'); jar.rect(jw / 2 - 5, 0, 10, 2, '#a8603a'); jar.hl(3, Math.round(jar.h * 0.55), jw - 6, '#8a4a2a');
    put(lay, jar, C(lay, 0.72), lay.base + 3); spot(lay, 'bed', C(lay, 0.72), lay.base + 4);
    for (let i = 0; i < 5; i++) { const sh = new A.Pix(5, 4); sh.ell(2.5, 3, 2.4, 2, (nx) => (Math.abs(Math.round(nx * 4)) % 2 ? '#ffd0c8' : '#ffb0a8')); put(lay, sh, C(lay, 0.42) + i * 7, lay.base + 6); }
    put(lay, bottle(), C(lay, 0.52), lay.base + 2); spot(lay, 'play', C(lay, 0.48), lay.base + 7);
    put(lay, pile(Z(lay, 12), Z(lay, 5), ['#ff8a6a', '#e8604a', '#ffb09a']), C(lay, 0.26), lay.base + 4); spot(lay, 'eat', C(lay, 0.26), lay.base + 5);
    put(lay, coins(Z(lay, 14)), C(lay, 0.88), lay.base + 4);
    lay.bubbles = true; lay.underwater = true;
  };
  function bottle() { const A = T(), s = A.spr(5, 10); s.rect(2, 1, 2, 3, '#7ac8a0'); s.rect(1, 4, 4, 6, '#5aae84'); s.vl(2, 5, 4, '#b8f0d0'); s.rect(2, 6, 2, 2, '#f4ead8'); return s.outline('#2a5a3a'); }

  // 新来的住户：借用相近的屋子
  Object.assign(I, { polarbear: I.penguin, arcticfox: I.fox, fennec: I.rabbit, meerkat: I.hamster, snowleopard: I.dragon, yak: I.pig, alpaca: I.pig, cow: I.cat, monkey: I.dog, parrot: I.chick, seagull: I.chick });
  PP.INTERIOR = I;
  PP.INTERIOR_SPOTS = ['bed', 'eat', 'play'];
})();
