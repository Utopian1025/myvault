// 背景：屏幕底部的一条小场景（草地 / 森林 / 海边 / 雪地 / 星空 / 木地板），可以随时开关
// 只画在最底下一条，不挡你干活；鼠标照样能点穿过去
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  let cache = null, key = '';

  // 固定种子的伪随机：同一个屏幕宽度每次画出来都一样
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  function height() { const h = [0, 70, 120, 180][G.save.settings.bgH || 2]; return Math.round(h * U.clamp(G.S / 2, 0.75, 1.5)); }

  function build(theme, W, H, u) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const R = rng(W * 31 + H);
    const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(Math.round(x) * u, Math.round(y) * u, w * u, h * u); };
    const cols = Math.ceil(W / u), rows = Math.ceil(H / u);
    // 顶部用棋盘格抖动渐隐，和桌面自然衔接
    const fadeRows = 4;
    const band = (y0, col, dither) => {
      for (let y = y0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (dither && y - y0 < fadeRows && ((x + y) % (fadeRows - (y - y0) + 1)) !== 0) continue;
        px(x, y, typeof col === 'function' ? col(x, y) : col);
      }
    };
    const top = 0;
    if (theme === 'grass' || theme === 'forest' || theme === 'snow') {
      const snow = theme === 'snow';
      if (theme === 'forest' || snow) {
        // 远处两层松树
        for (const [layer, colr, hmin, hmax, step] of [[0, snow ? '#b9c9dd' : '#5f8a64', 0.45, 0.8, 9], [1, snow ? '#8fa6c2' : '#3f6b4a', 0.55, 0.95, 13]]) {
          for (let x = -4; x < cols + 4; x += step + Math.floor(R() * 6)) {
            const th = Math.round(rows * (hmin + R() * (hmax - hmin)));
            const base = rows - Math.round(rows * 0.18);
            for (let k = 0; k < th; k++) {
              const half = Math.max(0, Math.round((k / th) * 5 + (k % 4 === 0 ? 1 : 0)));
              for (let dx = -half; dx <= half; dx++) px(x + dx, base - th + k, colr);
              if (snow && k % 4 === 1) for (let dx = -half; dx <= half; dx += 2) px(x + dx, base - th + k, '#ffffff');
            }
            px(x, base, layer ? '#4a3a30' : '#5a4a3a'); px(x, base + 1, layer ? '#4a3a30' : '#5a4a3a');
          }
        }
      }
      const gy = Math.round(rows * (theme === 'grass' ? 0.25 : 0.68));
      const g1 = snow ? '#f4f8ff' : '#7cc35a', g2 = snow ? '#dbe6f5' : '#5fae4a', g3 = snow ? '#c3d2e8' : '#4c9640';
      band(gy, (x, y) => (y - gy < 2 ? g1 : (x * 7 + y * 13) % 11 === 0 ? g3 : g2), theme === 'grass');
      // 草叶 / 雪堆
      for (let x = 0; x < cols; x += 2 + Math.floor(R() * 3)) {
        if (snow) { if (R() < 0.3) { px(x, gy - 1, '#ffffff', 3, 1); } continue; }
        const h = 1 + Math.floor(R() * 3);
        for (let k = 0; k < h; k++) px(x + (k === h - 1 && R() < 0.5 ? 1 : 0), gy - 1 - k, k === h - 1 ? '#a5df7a' : '#7cc35a');
      }
      if (!snow) for (let i = 0; i < cols / 14; i++) {
        const x = Math.floor(R() * cols), y = gy + 2 + Math.floor(R() * Math.max(1, rows - gy - 4));
        const f = U.pick(['#ffffff', '#ffd84a', '#ff8fb0', '#b98cff']);
        px(x, y - 1, f); px(x - 1, y, f); px(x + 1, y, f); px(x, y + 1, f); px(x, y, '#ffcf33');
      }
      for (let i = 0; i < cols / 30; i++) { const x = Math.floor(R() * cols), y = gy + 3 + Math.floor(R() * Math.max(1, rows - gy - 5)); px(x, y, snow ? '#a8b8cc' : '#9a9aa6', 2, 1); px(x, y - 1, snow ? '#ffffff' : '#c0c0ca', 1, 1); }
    } else if (theme === 'beach') {
      const wy = Math.round(rows * 0.2), sy = Math.round(rows * 0.55);
      band(wy, (x, y) => (y < sy ? ((y - wy) % 3 === 0 && (x + y * 3) % 9 < 3 ? '#9fe0ff' : '#4fb0e8') : '#f2d79a'), true);
      for (let x = 0; x < cols; x++) { px(x, sy, (x % 6) < 3 ? '#ffffff' : '#e6f6ff'); px(x, sy + 1, '#f8e6b8'); }
      for (let i = 0; i < cols / 10; i++) { const x = Math.floor(R() * cols), y = sy + 3 + Math.floor(R() * Math.max(1, rows - sy - 4)); px(x, y, (x + y) % 2 ? '#e2c27a' : '#d8b468'); }
      for (let i = 0; i < cols / 40; i++) { const x = Math.floor(R() * cols), y = sy + 4 + Math.floor(R() * Math.max(1, rows - sy - 6)); px(x, y, '#ffb0b8', 2, 1); px(x, y - 1, '#ffd0d4', 1, 1); }
    } else if (theme === 'night') {
      band(top, (x, y) => (y < rows * 0.5 ? '#1a1f45' : y < rows * 0.8 ? '#232a5a' : '#2c3568'), true);
      // 山丘剪影
      for (let x = 0; x < cols; x++) { const h = Math.round(rows * 0.22 + Math.sin(x / 17) * 3 + Math.sin(x / 7) * 1.5); for (let y = rows - h; y < rows; y++) px(x, y, y === rows - h ? '#3a4a78' : '#202850'); }
    } else if (theme === 'room') {
      const wy = Math.round(rows * 0.15), fy = Math.round(rows * 0.45);
      band(wy, (x, y) => (y < fy ? ((x % 10 === 0) ? '#e8d6c0' : '#f4e6d4') : y === fy ? '#8a5a3a' : ((Math.floor(x / 24) + Math.floor((y - fy) / 4)) % 2 ? '#c88a5a' : '#bd7f50')), true);
      for (let x = 0; x < cols; x++) { px(x, fy - 1, '#ffffff'); px(x, fy - 2, '#d8c2a8'); }
      for (let y = fy + 1; y < rows; y += 4) for (let x = 0; x < cols; x++) if ((x + (y >> 2) * 11) % 24 === 0) px(x, y, '#9a6440', 1, 4);
      // 一块小地毯
      const rx = Math.floor(cols * 0.35), rw = Math.floor(cols * 0.3);
      for (let x = rx; x < rx + rw; x++) for (let y = fy + 3; y < rows - 1; y++) px(x, y, (x + y) % 4 === 0 ? '#ffd0dc' : (y === fy + 3 || y === rows - 2) ? '#e88aa8' : '#f5a8be');
    }
    return cv;
  }

  function render(ctx) {
    const theme = G.save && G.save.settings.bg;
    if (!theme || theme === 'none') return;
    const u = Math.max(2, G.S), H = height(), W = G.W;
    const k = [theme, W, H, u].join('|');
    if (k !== key) { cache = build(theme, W, H, u); key = k; }
    const y0 = G.H - H;
    ctx.drawImage(cache, 0, y0);
    // 动态的小细节
    const t = G.t;
    if (theme === 'night') {
      const R = rng(W + 7);
      for (let i = 0; i < W / 26; i++) {
        const x = Math.floor(R() * W), y = y0 + Math.floor(R() * H * 0.55) + 4 * u, ph = R() * 9;
        if (Math.sin(t * (1 + R()) + ph) > 0.2) { ctx.fillStyle = '#fff6c2'; ctx.fillRect(x, y, u, u); }
      }
      // 月亮
      const mx = W - 60 * u / 2, my = y0 + 10 * u;
      ctx.fillStyle = '#fff3b0'; ctx.fillRect(mx, my, 6 * u, 6 * u); ctx.fillRect(mx - u, my + u, u, 4 * u); ctx.fillRect(mx + 6 * u, my + u, u, 4 * u);
      ctx.fillStyle = '#1a1f45'; ctx.fillRect(mx + 3 * u, my, 3 * u, 3 * u);
    } else if (theme === 'beach') {
      const sy = y0 + Math.round(H / u * 0.55) * u;
      ctx.fillStyle = '#ffffff';
      for (let x = 0; x < W; x += 9 * u) { const o = Math.round(Math.sin(t * 1.4 + x / 40) * 2) * u; ctx.fillRect(x + o, sy - u, 4 * u, u); }
    } else if (theme === 'forest' && (new Date().getHours() >= 19 || new Date().getHours() < 5)) {
      const R = rng(W + 3);
      for (let i = 0; i < 8; i++) { const x = (R() * W + Math.sin(t * 0.4 + i) * 30) | 0, y = y0 + (R() * H * 0.6) | 0; if (Math.sin(t * 2 + i) > 0) { ctx.fillStyle = '#f6ff8a'; ctx.fillRect(x, y, u, u); } }
    }
    // 晚上整体暗一点（星空和木地板除外）
    const h = new Date().getHours();
    if ((h >= 20 || h < 6) && theme !== 'night' && theme !== 'room') { ctx.globalAlpha = 0.28; ctx.fillStyle = '#1a1f45'; ctx.fillRect(0, y0 + 4 * u, W, H); ctx.globalAlpha = 1; }
  }

  PP.bg = { render, height };
})();
