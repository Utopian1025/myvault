// 地图：一颗可以拖着转的像素小地球。每个地方按真实的地理位置放（南极在南极、北极冰原在北边、沙漠在北非……），
// 转到背面的地方旗子会藏起来；你的浮岛绕着地球飘。按住拖动转地球，松手会慢慢停下，没人碰时自己慢慢转。
(function () {
  const PP = (window.PP = window.PP || {});
  // 每个地方的 [纬度, 经度]
  const GEO = { antarctic: [-76, 30], snow: [74, -42], mountain: [31, 86], cave: [27, 92], forest: [50, 12], meadow: [47, 42], farm: [41, -92], lake: [54, -104],
    beach: [19, -74], sea: [-17, 148], desert: [23, 12], savanna: [-3, 36], jungle: [-5, -62], academy: [57, -4], undergrove: [44, 138] };
  // 大陆（粗略的经纬度多边形）
  const LAND = [
    [[-168, 66], [-140, 70], [-100, 72], [-80, 66], [-62, 58], [-55, 50], [-66, 44], [-76, 35], [-81, 26], [-97, 26], [-97, 18], [-88, 15], [-80, 8], [-78, 9], [-92, 15], [-105, 21], [-117, 32], [-124, 40], [-124, 48], [-133, 56], [-150, 60], [-165, 60]], // 北美
    [[-80, 9], [-72, 12], [-60, 8], [-50, 0], [-35, -6], [-38, -14], [-48, -26], [-58, -36], [-66, -46], [-70, -54], [-75, -50], [-73, -38], [-71, -18], [-80, -6]], // 南美
    [[-45, 60], [-22, 70], [-20, 78], [-40, 83], [-62, 80], [-55, 72]], // 格陵兰
    [[-10, 36], [-9, 44], [-2, 48], [-5, 58], [5, 62], [12, 66], [28, 71], [40, 68], [60, 70], [80, 73], [110, 76], [140, 72], [170, 68], [180, 66], [160, 60], [140, 54], [132, 43], [122, 40], [121, 30], [110, 20], [106, 10], [100, 14], [98, 8], [92, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [50, 30], [44, 12], [36, 28], [34, 36], [26, 36], [23, 40], [12, 44], [10, 38], [0, 40]], // 欧亚
    [[-17, 21], [-6, 35], [10, 37], [32, 31], [35, 28], [43, 12], [51, 12], [40, -2], [40, -15], [33, -26], [20, -35], [16, -28], [12, -18], [12, -5], [8, 4], [-8, 5], [-16, 12]], // 非洲
    [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [140, -38], [132, -32], [116, -35], [114, -26]], // 澳洲
    [[-180, -70], [180, -70], [180, -90], [-180, -90]], // 南极
    [[130, 32], [142, 36], [142, 44], [138, 38]], // 日本
    [[-6, 50], [2, 51], [-2, 58], [-6, 56]], // 英国
    [[95, 5], [105, -6], [116, -8], [120, 0], [110, 5]], // 东南亚岛
  ];
  const inPoly = (x, y, P) => { let a = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) a = !a; return a; };
  const NZ = (x, y, s) => PP.DIO ? PP.DIO.NZ(x, y, s) : 0.5;
  // 经纬度 → 地表颜色（低分辨率贴图，算一次）
  const TW = 240, TH = 120; let tex = null;
  function biome(lon, lat) {
    const n = (NZ(lon / 9, lat / 9, 3) - 0.5) * 7, land = LAND.some((P) => inPoly(lon + n * 0.7, lat + n * 0.5, P));
    if (!land) { // 海：近岸浅一点
      const near = LAND.some((P) => inPoly(lon + 4, lat, P) || inPoly(lon - 4, lat, P) || inPoly(lon, lat + 3, P) || inPoly(lon, lat - 3, P));
      if (Math.abs(lat) > 72) return '#c8e0ec';
      return near ? '#4892ae' : NZ(lon / 14, lat / 14, 9) > 0.6 ? '#2f7898' : '#2a6688';
    }
    const a = Math.abs(lat), r = NZ(lon / 6, lat / 6, 5);
    if (a > 66 || (lon < -20 && lon > -75 && lat > 60)) return r > 0.5 ? '#f4f8fc' : '#e6eef6';
    if (a > 58) return r > 0.5 ? '#6a8a6a' : '#5e7e64'; // 苔原
    // 山脉
    const mt = (lon > 75 && lon < 100 && lat > 27 && lat < 36) || (lon > -125 && lon < -105 && lat > 32 && lat < 55) || (lon > -78 && lon < -66 && lat < 5 && lat > -40);
    if (mt) return r > 0.55 ? '#f4f8fc' : r > 0.3 ? '#8c8896' : '#74707e';
    // 沙漠
    if ((lat > 15 && lat < 32 && lon > -15 && lon < 55) || (lat > -30 && lat < -18 && lon > 120 && lon < 140) || (lat > 36 && lat < 46 && lon > 80 && lon < 110)) return r > 0.5 ? '#e8c890' : '#dab682';
    // 雨林
    if (a < 9 && (lon < -45 || (lon > 8 && lon < 30) || lon > 95)) return r > 0.5 ? '#2c5632' : '#386a37';
    // 稀树草原
    if ((lat < 14 && lat > -22 && lon > -10 && lon < 45) || (lat < -15 && lon > 115)) return r > 0.5 ? '#c8b060' : '#b49a50';
    // 草原
    if ((lat > 40 && lat < 52 && lon > 30 && lon < 90) || (lat > 35 && lat < 48 && lon > -105 && lon < -90) || (lat < -25 && lat > -40 && lon < -55)) return r > 0.5 ? '#98c65a' : '#80b84e';
    return r > 0.5 ? '#46803c' : '#579642'; // 温带森林
  }
  function texture() {
    if (tex) return tex;
    tex = new Array(TW * TH);
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const lon = (x / TW) * 360 - 180, lat = 90 - (y / TH) * 180; tex[y * TW + x] = hex(biome(lon, lat)); }
    // 每个地方周围涂上它自己的样子（保证地图上一眼对得上）
    const OWN = { forest: '#386a37', meadow: '#98c65a', farm: '#c8b060', lake: '#4892ae', mountain: '#f4f8fc', cave: '#74707e', desert: '#e8c890', savanna: '#c8b060', jungle: '#22452c', beach: '#f0d8a0', snow: '#f4f8fc', antarctic: '#f4f8fc', academy: '#579642', undergrove: '#2c5a4a' };
    for (const [k, [la, lo]] of Object.entries(GEO)) { const c = OWN[k]; if (!c) continue; const cx = ((lo + 180) / 360) * TW, cy = ((90 - la) / 180) * TH; for (let y = -3; y <= 3; y++) for (let x = -4; x <= 4; x++) if ((x * x) / 16 + (y * y) / 9 <= 1 + (NZ(x, y, k.length) - 0.5)) { const xx = (Math.round(cx + x) + TW) % TW, yy = Math.max(0, Math.min(TH - 1, Math.round(cy + y))); tex[yy * TW + xx] = hex(c); } }
    return tex;
  }
  function hex(h) { const x = parseInt(h.slice(1), 16); return [(x >> 16) & 255, (x >> 8) & 255, x & 255]; }

  // 一个地图实例：挂在 mapwrap 上
  function mount(wrap) {
    const cv = wrap.querySelector('canvas.worldmap'); if (!cv) return;
    const W = cv.width, H = cv.height, ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), d = img.data, T = texture();
    const R = Math.round(H * 0.42), cx = Math.round(W / 2), cy = Math.round(H / 2 + 4);
    const st = mount.state || (mount.state = { yaw: -0.4, pitch: 0.35, vy: 0, vp: 0 });
    // 先转到你现在所在的地方
    const cur = PP.scene && PP.scene.view && PP.scene.view(); if (cur && GEO[cur] && !mount.state.init) { st.yaw = (GEO[cur][1] * Math.PI) / 180; st.pitch = (GEO[cur][0] * Math.PI) / 180 * 0.7; st.init = true; }
    const stars = []; for (let i = 0; i < 70; i++) stars.push([Math.floor(Math.random() * W), Math.floor(Math.random() * H), Math.random()]);
    let drag = null, idle = 0, lastT = performance.now(), alive = true;
    const pins = [...wrap.querySelectorAll('.pin')];
    cv.style.cursor = 'grab';
    const down = (e) => { drag = { x: e.clientX, y: e.clientY, t: performance.now() }; cv.style.cursor = 'grabbing'; e.preventDefault(); };
    const move = (e) => { if (!drag) return; const r = cv.getBoundingClientRect(), k = (W / r.width) / R; const dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k; st.yaw -= dx; st.pitch = Math.max(-1.3, Math.min(1.3, st.pitch + dy)); const dt = Math.max(1, performance.now() - drag.t); st.vy = -dx / dt * 16; st.vp = dy / dt * 16; drag.x = e.clientX; drag.y = e.clientY; drag.t = performance.now(); idle = 0; };
    const up = () => { drag = null; cv.style.cursor = 'grab'; };
    cv.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    wrap.addEventListener('wheel', (e) => { st.yaw += e.deltaY * 0.002; idle = 0; e.preventDefault(); }, { passive: false });
    const sun = [-0.55, -0.45, 0.7], sl = Math.hypot(...sun); sun.forEach((v, i) => (sun[i] = v / sl));
    function frame() {
      if (!alive || !wrap.isConnected) { alive = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); return; }
      const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; idle += dt;
      if (!drag) { st.yaw += st.vy * dt * 3; st.pitch = Math.max(-1.3, Math.min(1.3, st.pitch + st.vp * dt * 3)); st.vy *= 0.92; st.vp *= 0.92; if (idle > 3) st.yaw += dt * 0.08; }
      const cyw = Math.cos(st.yaw), syw = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
      // 背景：夜空 + 星星
      for (let i = 0; i < d.length; i += 4) { d[i] = 22; d[i + 1] = 26; d[i + 2] = 44; d[i + 3] = 255; }
      for (const [x, y, b] of stars) { const k = (y * W + x) * 4, tw = 150 + Math.round(Math.sin(now / 600 + b * 20) * 60 + b * 40); d[k] = d[k + 1] = d[k + 2] = tw; }
      for (let y = -R - 2; y <= R + 2; y++) for (let x = -R - 2; x <= R + 2; x++) {
        const px = cx + x, py = cy + y; if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const rr = (x * x + y * y) / (R * R), k = (py * W + px) * 4;
        if (rr > 1) { if (rr < 1 + 5 / R) { d[k] = 120; d[k + 1] = 170; d[k + 2] = 200; } continue; } // 大气的一圈亮边
        // 屏幕上的点 → 球面（相机看 -z）
        const sx = x / R, sy = -y / R, sz = Math.sqrt(1 - rr);
        // 先绕 x 轴（俯仰）、再绕 y 轴（自转）转回地球坐标
        const y1 = sy * cp + sz * sp, z1 = -sy * sp + sz * cp, x2 = sx * cyw + z1 * syw, z2 = -sx * syw + z1 * cyw;
        const lat = Math.asin(Math.max(-1, Math.min(1, y1))), lon = Math.atan2(x2, z2);
        const tx = Math.floor(((lon / Math.PI + 1) / 2) * TW) % TW, ty = Math.min(TH - 1, Math.floor((0.5 - lat / Math.PI) * TH));
        const c = T[ty * TW + tx];
        // 光：三档（亮 / 中 / 暗），暗面偏蓝紫；边缘一圈更暗
        const L = sx * sun[0] + sy * -sun[1] + sz * sun[2], b = L > 0.45 ? 1.06 : L > 0.05 ? 0.84 : 0.56, edge = rr > 0.9 ? 0.82 : 1;
        d[k] = c[0] * b * edge * (b < 0.6 ? 0.85 : 1); d[k + 1] = c[1] * b * edge * (b < 0.6 ? 0.9 : 1); d[k + 2] = Math.min(255, c[2] * b * edge * (b < 0.6 ? 1.25 : 1) + (b < 0.6 ? 14 : 0));
      }
      // 云：一圈慢慢飘的白块
      for (let i = 0; i < 26; i++) { const lo = (i * 47 + now / 400) % 360 - 180, la = Math.sin(i * 1.7) * 55; const p = proj(la, lo); if (!p || p[2] < 0.15) continue; const k = (Math.round(p[1]) * W + Math.round(p[0])) * 4; for (const [ox, oy] of [[0, 0], [1, 0], [2, 0], [1, -1], [-1, 0]]) { const kk = k + (oy * W + ox) * 4; if (kk >= 0 && kk < d.length) { d[kk] = d[kk + 1] = d[kk + 2] = 240; } } }
      ctx.putImageData(img, 0, 0);
      // 浮岛（就是浮空岛）：绕着地球飘
      const a = now / 4000, ix = cx + Math.cos(a) * (R + 22), iy = cy - R * 0.55 + Math.sin(a) * 10, front = Math.sin(a) > -0.2;
      drawIsle(ctx, ix, iy, now);
      // 旗子跟着转
      const r = cv.getBoundingClientRect(), kx = r.width / W || 1;
      for (const b of pins) {
        const key = b.dataset.s; let p = null;
        if (key === 'castle' || key === 'skyisle') p = [ix, iy - 6, 1]; else if (GEO[key]) p = proj(...GEO[key]);
        if (!p) continue;
        b.style.left = ((p[0] / W) * 100).toFixed(2) + '%'; b.style.top = ((p[1] / H) * 100).toFixed(2) + '%';
        const vis = p[2] > 0.08; b.classList.toggle('back', !vis); b.style.zIndex = vis ? String(2 + Math.round(p[2] * 10)) : '0';
      }
      requestAnimationFrame(frame);
    }
    function proj(la, lo) { // 地球坐标 → 屏幕（反着转）
      const lat = (la * Math.PI) / 180, lon = (lo * Math.PI) / 180, x2 = Math.cos(lat) * Math.sin(lon), z2 = Math.cos(lat) * Math.cos(lon), y1 = Math.sin(lat);
      const sx = x2 * Math.cos(st.yaw) - z2 * Math.sin(st.yaw), z1 = x2 * Math.sin(st.yaw) + z2 * Math.cos(st.yaw);
      const sy = y1 * Math.cos(st.pitch) - z1 * Math.sin(st.pitch), sz = y1 * Math.sin(st.pitch) + z1 * Math.cos(st.pitch);
      return [cx + sx * R, cy - sy * R, sz];
    }
    function drawIsle(c, x, y, now) {
      x = Math.round(x); y = Math.round(y + Math.sin(now / 700) * 1.5);
      const P = (a, b, w, h, col) => { c.fillStyle = col; c.fillRect(x + a, y + b, w, h); };
      P(-7, 0, 14, 2, '#80b84e'); P(-6, -1, 12, 1, '#98c65a'); P(-6, 2, 12, 2, '#886040'); P(-4, 4, 8, 2, '#74707e'); P(-2, 6, 4, 2, '#5e5a6a'); P(-1, 8, 2, 1, '#5e5a6a');
      // 你的浮岛：石墙 + 两座尖顶塔 + 小旗
      P(-5, -5, 10, 4, '#d8c8b0'); P(-5, -2, 10, 1, '#b8a890'); P(-1, -4, 2, 3, '#6a4a32'); P(-4, -4, 1, 1, '#4a6a9a'); P(3, -4, 1, 1, '#4a6a9a');
      P(-6, -9, 3, 5, '#e8dcc4'); P(-6, -10, 3, 1, '#c66252'); P(-5, -11, 1, 1, '#c66252'); P(3, -11, 3, 7, '#e8dcc4'); P(3, -12, 3, 1, '#c66252'); P(4, -13, 1, 1, '#c66252'); P(4, -16, 1, 3, '#5e3e2c'); P(5, -16, 2, 1, '#ffd23f');
      P(-2, -7, 4, 2, '#e8dcc4'); P(-2, -8, 1, 1, '#e8dcc4'); P(1, -8, 1, 1, '#e8dcc4');
    }
    requestAnimationFrame(frame);
  }
  PP.GLOBE = { mount, GEO };
})();
