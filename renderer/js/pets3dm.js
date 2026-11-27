// 3D 场景里的宠物（0.42）：每只宠物有两套形象——极简模式（任务栏）还是原来的 2D 像素画，浮岛、传送门那头这些 3D 场景里是真正的 3D 模型。
// 每个物种按它真实的身体结构搭（四条腿的兽、鸟、圆滚滚的小东西、直立的小人……），耳朵、尾巴、嘴、角、鬃毛按物种来，
// 颜色和花纹（虎斑、狸花、奶牛猫、暹罗的重点色、斑点、条纹）用这只宠物自己的配色；会走路（四条腿交替迈）、坐下、趴下睡觉、喘气。
(function () {
  const PP = (window.PP = window.PP || {});
  const hex = (h) => { const n = parseInt(String(h || '#888888').slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const MAT = () => PP.g3.MAT;
  function T() { return { P: [], N: [], C: [], M: [] }; }
  function push(t, a, b, c, na, nb, nc, ca, cb, cc, m) { t.P.push(a, b, c); t.N.push(na, nb, nc); t.C.push(ca, cb, cc); t.M.push(m); }
  /* 椭球（可以绕 y 轴转一个角 pitch，可以按方向上色）；rot 可选 */
  function ell(t, c, r, cf, m, la = 8, lo = 14, pitch = 0, yaw = 0) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw), R = (v) => { const x1 = v[0] * cp - v[2] * sp, z1 = v[0] * sp + v[2] * cp; return [x1 * cy - v[1] * sy, x1 * sy + v[1] * cy, z1]; };
    const G = []; for (let i = 0; i <= la; i++) { const ph = -Math.PI / 2 + (i / la) * Math.PI, row = []; for (let j = 0; j <= lo; j++) { const th = (j / lo) * 6.2832, d = [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)], q = R([d[0] * r[0], d[1] * r[1], d[2] * r[2]]), n = nrm(R([d[0] / r[0], d[1] / r[1], d[2] / r[2]])); row.push([[c[0] + q[0], c[1] + q[1], c[2] + q[2]], n, cf(d)]); } G.push(row); }
    for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) { const A = G[i][j], B = G[i][j + 1], C = G[i + 1][j + 1], D = G[i + 1][j]; push(t, A[0], B[0], C[0], A[1], B[1], C[1], A[2], B[2], C[2], m); push(t, A[0], C[0], D[0], A[1], C[1], D[1], A[2], C[2], D[2], m); }
  }
  /* 管子（腿、尾巴、脖子）：沿一串点，两头粗细不同，头尾封圆 */
  function tube(t, pts, r0, r1, col, m, n = 8) {
    const rings = pts.map((p, i) => { const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], d = nrm(sub(q, o)), up = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], x = nrm(cross(d, up)), y = cross(d, x), r = r0 + (r1 - r0) * i / (pts.length - 1); return Array.from({ length: n }, (_, k) => { const a = (k / n) * 6.2832, dir = [x[0] * Math.cos(a) + y[0] * Math.sin(a), x[1] * Math.cos(a) + y[1] * Math.sin(a), x[2] * Math.cos(a) + y[2] * Math.sin(a)]; return [[p[0] + dir[0] * r, p[1] + dir[1] * r, p[2] + dir[2] * r], dir]; }); });
    const cc = typeof col === 'function' ? col : () => col; for (let i = 0; i + 1 < rings.length; i++) for (let k = 0; k < n; k++) { const k2 = (k + 1) % n, A = rings[i][k], B = rings[i][k2], C = rings[i + 1][k2], D = rings[i + 1][k], ca = cc(i / (rings.length - 1)), cb = cc((i + 1) / (rings.length - 1)); push(t, A[0], B[0], C[0], A[1], B[1], C[1], ca, ca, cb, m); push(t, A[0], C[0], D[0], A[1], C[1], D[1], ca, cb, cb, m); }
    ell(t, pts[pts.length - 1], [r1, r1, r1], () => cc(1), m, 4, 8); ell(t, pts[0], [r0, r0, r0], () => cc(0), m, 4, 8);
  }
  /* Q 版的大眼睛：黑亮的椭圆，上面两颗白高光（一大一小），闭眼时是一道弯弯的线 */
  const eye = (t, c, r, closed, side = 1, ya = 0) => { const m = MAT().flat, cy = Math.cos(ya), sy = Math.sin(ya), W = (x, y, z) => [c[0] + x * cy - y * sy, c[1] + x * sy + y * cy, c[2] + z]; /* ya：眼睛朝向（贴着圆脸转过去），侧面也看得见 */
    if (closed) { for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.42; ell(t, W(0.01, Math.sin(a) * r * 0.85, -Math.cos(a) * r * 0.4 + r * 0.2), [r * 0.13, r * 0.18, r * 0.13], () => [0.15, 0.1, 0.12], m, 3, 6, 0, ya); } return; }
    ell(t, c, [r * 0.45, r * 0.78, r * 1.05], (d) => (d[2] < -0.45 ? [0.2, 0.13, 0.12] : [0.06, 0.045, 0.07]), m, 10, 16, 0, ya); ell(t, W(r * 0.36, -side * r * 0.22, r * 0.42), [r * 0.16, r * 0.27, r * 0.3], () => [1, 1, 1], MAT().glow, 5, 8, 0, ya); ell(t, W(r * 0.4, side * r * 0.24, -r * 0.4), [r * 0.1, r * 0.13, r * 0.13], () => [1, 1, 1], MAT().glow, 3, 6, 0, ya); };
  /* 尖耳朵：一个圆锥，里面一个小一点的粉色圆锥 */
  function earCone(t, b, tip, r, out, inner, m, fx) { tube(t, [b, [b[0] + (tip[0] - b[0]) * 0.5, b[1] + (tip[1] - b[1]) * 0.5, b[2] + (tip[2] - b[2]) * 0.5], tip], r, r * 0.12, out, m, 12); const o = [fx * r * 0.42, 0, -r * 0.1]; tube(t, [[b[0] + o[0], b[1], b[2] + r * 0.2], [b[0] + o[0] + (tip[0] - b[0]) * 0.45, b[1] + (tip[1] - b[1]) * 0.45, b[2] + (tip[2] - b[2]) * 0.45], [tip[0] + o[0] * 0.5, tip[1] - (tip[1] - b[1]) * 0.18, tip[2] - (tip[2] - b[2]) * 0.18]], r * 0.62, r * 0.08, inner, m, 10); }
  /* 每个物种的身体结构：plan（身形）、ear（耳朵）、tail（尾巴）、snout（嘴多长）、legs（腿多长）、extra（鬃毛、角、驼峰、刺……） */
  const SP = {
    cat: { plan: 'quad', ear: 'point', tail: 'long', snout: 0.1, legs: 0.42, head: 0.3 }, dog: { plan: 'quad', ear: 'droop', tail: 'up', snout: 0.2, legs: 0.48, head: 0.31 }, fox: { plan: 'quad', ear: 'big', tail: 'bushy', snout: 0.24, legs: 0.42, head: 0.28 },
    rabbit: { plan: 'quad', ear: 'long', tail: 'puff', snout: 0.08, legs: 0.28, head: 0.3, fat: 1.25 }, arctichare: { plan: 'quad', ear: 'long', tail: 'puff', snout: 0.08, legs: 0.3, head: 0.28, fat: 1.15 },
    hamster: { plan: 'round', ear: 'round', tail: 'none' }, marmot: { plan: 'round', ear: 'round', tail: 'short' }, pig: { plan: 'quad', ear: 'flop', tail: 'curl', snout: 0.14, disc: 1, legs: 0.3, head: 0.32, fat: 1.35 },
    capybara: { plan: 'quad', ear: 'tiny', tail: 'none', snout: 0.22, legs: 0.3, head: 0.34, fat: 1.3, blunt: 1 }, hedgehog: { plan: 'round', ear: 'round', tail: 'none', quills: 1, snout: 0.16 }, porcupine: { plan: 'round', ear: 'round', tail: 'short', quills: 1.5, snout: 0.14 },
    dragon: { plan: 'quad', ear: 'horn', tail: 'long', snout: 0.22, legs: 0.42, head: 0.3, wings: 1, spikes: 1 }, lion: { plan: 'quad', ear: 'round', tail: 'tuft', snout: 0.16, legs: 0.52, head: 0.34, mane: 1 }, tiger: { plan: 'quad', ear: 'round', tail: 'long', snout: 0.16, legs: 0.5, head: 0.33 },
    snowleopard: { plan: 'quad', ear: 'round', tail: 'bushy', snout: 0.13, legs: 0.46, head: 0.3 }, polarbear: { plan: 'quad', ear: 'round', tail: 'short', snout: 0.22, legs: 0.48, head: 0.32, fat: 1.35 }, brownbear: { plan: 'quad', ear: 'round', tail: 'short', snout: 0.22, legs: 0.48, head: 0.33, fat: 1.35 },
    arcticfox: { plan: 'quad', ear: 'point', tail: 'bushy', snout: 0.2, legs: 0.4, head: 0.28 }, fennec: { plan: 'quad', ear: 'huge', tail: 'bushy', snout: 0.18, legs: 0.4, head: 0.27 }, zebra: { plan: 'quad', ear: 'point', tail: 'tuft', snout: 0.36, legs: 0.85, head: 0.3, neck: 1, stripes: 1, mane: 0.4 },
    antelope: { plan: 'quad', ear: 'point', tail: 'short', snout: 0.3, legs: 0.85, head: 0.26, neck: 0.8, horns: 'long' }, hippo: { plan: 'quad', ear: 'tiny', tail: 'short', snout: 0.34, legs: 0.32, head: 0.42, fat: 1.6, blunt: 1 }, cow: { plan: 'quad', ear: 'side', tail: 'tuft', snout: 0.3, legs: 0.7, head: 0.32, fat: 1.25, horns: 'short' },
    yak: { plan: 'quad', ear: 'side', tail: 'tuft', snout: 0.28, legs: 0.6, head: 0.32, fat: 1.35, horns: 'curve', shag: 1 }, alpaca: { plan: 'quad', ear: 'point', tail: 'short', snout: 0.16, legs: 0.7, head: 0.24, neck: 1.6, wool: 1 }, deer: { plan: 'quad', ear: 'side', tail: 'short', snout: 0.28, legs: 0.85, head: 0.26, neck: 0.9, horns: 'antler' },
    sheep: { plan: 'quad', ear: 'side', tail: 'short', snout: 0.2, legs: 0.42, head: 0.26, wool: 1, fat: 1.3 }, camel: { plan: 'quad', ear: 'tiny', tail: 'tuft', snout: 0.32, legs: 0.95, head: 0.26, neck: 1.3, hump: 1 }, otter: { plan: 'quad', ear: 'tiny', tail: 'thick', snout: 0.12, legs: 0.22, head: 0.26, long: 1.4 },
    meerkat: { plan: 'upright', ear: 'tiny', tail: 'long', snout: 0.14 }, monkey: { plan: 'upright', ear: 'side', tail: 'long', snout: 0.08 }, bat: { plan: 'round', ear: 'big', tail: 'none', wings: 1 }, seal: { plan: 'blob', ear: 'none' }, octopus: { plan: 'octo' },
    chick: { plan: 'bird', beak: 'short', wing: 0.6 }, duck: { plan: 'bird', beak: 'flat', wing: 0.8 }, penguin: { plan: 'bird', beak: 'short', upright: 1, wing: 0.9 }, parrot: { plan: 'bird', beak: 'hook', wing: 0.9, tailf: 1 }, seagull: { plan: 'bird', beak: 'long', wing: 1.1 }, albatross: { plan: 'bird', beak: 'long', wing: 1.3 },
    frog: { aqua: 'frog' }, turtle: { aqua: 'turtle' }, crab: { aqua: 'crab' }, shark: { aqua: 'trout' }, gardeneel: { aqua: 'loach' },
  };
  /* 花纹：按身上的位置（沿身子 s、绕身子一圈 d）决定这一点是什么颜色 */
  function coatColor(P, pat, s, d) { const base = hex(P.base), dark = hex(P.dark), light = hex(P.light); const belly = d[2] < -0.35 || (pat === 'tux' && d[2] < 0.05 && s > 0.55);
    if (belly) return mix(base, light, pat === 'solid' ? 0.15 : 0.85);
    if (pat === 'tabby' || pat === 'mackerel' || pat === 'stripe' || pat === 'tiger') { if (d[2] > -0.1 && Math.sin(s * 34) > 0.35) return mix(base, dark, pat === 'mackerel' ? 0.85 : 0.6); }
    if (pat === 'spot' || pat === 'spots' || pat === 'leopard') { if (Math.sin(s * 23 + d[1] * 9) * Math.sin(s * 17 - d[2] * 8) > 0.42) return mix(base, dark, 0.8); }
    if (pat === 'point' && (s < 0.12 || s > 0.92)) return mix(base, dark, 0.6);
    if (d[2] > 0.75) return mix(base, dark, 0.12); return base; }
  /* Q 版的大脑袋：圆圆的头（比身子还大一点），脸下半部一块白白的口鼻，小鼻头，一双大眼睛，两团粉腮红；耳朵按物种放大夸张 */
  function headModel(t, sp, P, hc, hr, f) { const m = MAT().flat, base = hex(P.base), dark = hex(P.dark), light = hex(P.light), inner = hex(P.inner || '#f2b0b8'), nose = hex(P.nose || P.dark), pat = P.pattern || '';
    const faceC = (d) => { if (pat === 'point') return mix(base, dark, Math.max(0, d[0]) * 0.55); if (pat === 'tux' && d[0] > 0.35 && d[2] < 0.25 && Math.abs(d[1]) < 0.55) return light; if ((pat === 'tabby' || pat === 'mackerel' || pat === 'tiger' || pat === 'stripe') && d[2] > 0.45 && d[0] > -0.2 && Math.sin(d[1] * 11) > 0.3) return mix(base, dark, 0.55); return base; };
    ell(t, hc, [hr * 0.95, hr * 1.02, hr * 0.9], faceC, m, 14, 22);
    const sn = Math.min(0.22, sp.snout || 0.1), mx = hc[0] + hr * 0.66 + sn * 0.2, mz = hc[2] - hr * 0.36; // 口鼻：短短一块，长嘴的动物稍长
    ell(t, [mx, hc[1], mz], [hr * 0.3 + sn * 0.3, hr * (sp.blunt ? 0.56 : 0.44), hr * 0.27], () => (pat === 'solid' || pat === 'point' ? mix(base, light, 0.45) : mix(light, [1, 1, 1], 0.2)), m, 10, 16);
    if (sp.disc) ell(t, [mx + hr * 0.26 + sn * 0.3, hc[1], mz + hr * 0.04], [hr * 0.06, hr * 0.28, hr * 0.2], () => mix(nose, [1, 0.85, 0.88], 0.4), m, 6, 12);
    else ell(t, [mx + hr * 0.26 + sn * 0.3, hc[1], mz + hr * 0.16], [hr * 0.09, hr * 0.14, hr * 0.09], () => nose, m, 6, 10);
    for (const s2 of [-1, 1]) { eye(t, [hc[0] + hr * 0.73, hc[1] + s2 * hr * 0.6, hc[2] + hr * 0.04], hr * 0.24, f.sleep, s2, s2 * 0.66); ell(t, [hc[0] + hr * 0.72, hc[1] + s2 * hr * 0.66, hc[2] - hr * 0.28], [hr * 0.06, hr * 0.17, hr * 0.1], () => [0.98, 0.62, 0.66], m, 5, 8); } // 腮红
    const ear = sp.ear || 'point'; for (const s2 of [-1, 1]) { const by = hc[1] + s2 * hr * 0.55, bz = hc[2] + hr * 0.62;
      if (ear === 'point' || ear === 'big' || ear === 'huge') { const k = ear === 'huge' ? 1.8 : ear === 'big' ? 1.35 : 1, b = [hc[0] - hr * 0.05, by, bz - hr * 0.12], tip = [hc[0] - hr * 0.1, by + s2 * hr * 0.28 * k, bz + hr * 0.62 * k]; earCone(t, b, tip, hr * 0.27 * Math.sqrt(k), (q) => (q > 0.8 && pat !== 'solid' && pat !== '' ? mix(base, dark, 0.45) : base), inner, m, 1); }
      else if (ear === 'long') ell(t, [hc[0] - hr * 0.2, by * 0.95 + s2 * hr * 0.06, bz + hr * 0.85], [hr * 0.17, hr * 0.27, hr * 0.85], (d) => (d[0] > 0.35 ? inner : base), m, 8, 12, -0.2, s2 * 0.15);
      else if (ear === 'droop' || ear === 'flop' || ear === 'side') ell(t, [hc[0] - hr * 0.05, hc[1] + s2 * hr * 0.95, hc[2] + hr * (ear === 'side' ? 0.3 : 0.05)], [hr * 0.2, hr * 0.26, hr * (ear === 'side' ? 0.22 : 0.52)], () => (ear === 'droop' && pat !== 'solid' ? mix(base, dark, 0.35) : base), m, 8, 12, 0, 0);
      else if (ear === 'round') { ell(t, [hc[0] - hr * 0.1, by + s2 * hr * 0.14, bz + hr * 0.08], [hr * 0.13, hr * 0.27, hr * 0.27], (d) => (d[0] > 0.3 ? inner : base), m, 8, 12); }
      else if (ear === 'tiny') ell(t, [hc[0] - hr * 0.15, by, bz - hr * 0.05], [hr * 0.1, hr * 0.15, hr * 0.15], () => base, m, 5, 8);
      else if (ear === 'horn') tube(t, [[hc[0] - hr * 0.1, by, bz], [hc[0] - hr * 0.35, by + s2 * 0.03, bz + hr * 0.55]], hr * 0.12, hr * 0.05, mix(light, [1, 0.95, 0.8], 0.5), m, 8); }
    if (sp.horns) for (const s2 of [-1, 1]) { const b0 = [hc[0] - hr * 0.1, hc[1] + s2 * hr * 0.4, hc[2] + hr * 0.7], hc2 = hex('#efe2c4');
      if (sp.horns === 'antler') { const p1 = [b0[0] - 0.05, b0[1] + s2 * 0.1, b0[2] + 0.22], p2 = [b0[0], b0[1] + s2 * 0.2, b0[2] + 0.4]; tube(t, [b0, p1, p2], 0.04, 0.025, hex('#a07a54'), m, 6); tube(t, [p1, [p1[0] + 0.12, p1[1] + s2 * 0.03, p1[2] + 0.12]], 0.03, 0.02, hex('#a07a54'), m, 6); }
      else if (sp.horns === 'long') tube(t, [b0, [b0[0] - 0.12, b0[1] + s2 * 0.03, b0[2] + 0.25], [b0[0] - 0.18, b0[1] + s2 * 0.04, b0[2] + 0.4]], 0.045, 0.02, hex('#5a4a3a'), m, 6);
      else if (sp.horns === 'curve') tube(t, [b0, [b0[0], b0[1] + s2 * 0.15, b0[2] + 0.03], [b0[0] + 0.08, b0[1] + s2 * 0.18, b0[2] + 0.16]], 0.05, 0.025, hc2, m, 6);
      else tube(t, [b0, [b0[0] + 0.02, b0[1] + s2 * 0.08, b0[2] + 0.1]], 0.04, 0.025, hc2, m, 6); }
    if (sp.mane) ell(t, [hc[0] - hr * 0.3, hc[1], hc[2] - hr * 0.05], [hr * 0.75, hr * (1 + sp.mane * 0.45), hr * (0.95 + sp.mane * 0.4)], (d) => mix(dark, base, 0.25 + 0.15 * Math.sin(d[1] * 7 + d[2] * 5)), m, 12, 18);
  }
  /* 四条腿的兽：身子、脖子、头、四条腿（走路时对角交替迈）、尾巴。f: { phase 走路相位, walk 是否在走, sit 坐, sleep 趴着睡, breath 喘气 } */
  function quad(t, sp, P, f) { const m = MAT().flat, base = hex(P.base), dark = hex(P.dark), paw = hex(P.paw || P.base), pat = P.pattern || '', fat = sp.fat || 1, L = 0.34 * (sp.long || 1), legL = f.sleep ? 0.05 : Math.min(0.34, 0.14 + (sp.legs || 0.42) * 0.28), bh = 0.25 * Math.sqrt(fat), bw = 0.24 * Math.sqrt(fat), sit = f.sit && !f.sleep; /* Q 版：身子短圆、腿短粗 */
    const bz = f.sleep ? bh * 0.85 : legL + bh * 0.75, tilt = sit ? -0.55 : 0, hipZ = sit ? bh * 0.9 : bz, br = f.breath || 0;
    // 身子（坐着时往后仰：前高后低）
    ell(t, [sit ? -0.05 : 0, 0, sit ? bz * 0.75 + 0.12 : bz], [L, bw * (1 + br * 0.03), bh * (1 + br * 0.04)], (d) => coatColor(P, pat, (d[0] + 1) / 2, d), m, 14, 22, tilt);
    if (sp.hump) ell(t, [0, 0, bz + bh * 0.9], [L * 0.4, bw * 0.7, bh * 0.75], () => base, m, 6, 10);
    if (sp.wool) for (let i = 0; i < 9; i++) ell(t, [-L * 0.6 + (i % 3) * L * 0.6, (Math.floor(i / 3) - 1) * bw * 0.6, bz + bh * 0.35], [L * 0.38, bw * 0.55, bh * 0.6], () => mix(hex(P.light), [1, 1, 1], 0.3), m, 5, 8);
    if (sp.shag) ell(t, [0, 0, bz - bh * 0.4], [L * 1.02, bw * 1.08, bh * 0.75], (d) => mix(base, hex(P.dark), 0.3 + 0.2 * Math.sin(d[0] * 20)), m, 6, 14);
    if (sp.stripes) for (let i = 0; i < 9; i++) { const x = -L * 0.8 + i * L * 0.2; ell(t, [x, 0, bz + bh * 0.1], [0.025, bw * 1.02, bh * 1.02], () => [0.1, 0.1, 0.1], m, 4, 12); }
    // 头（坐着抬头，睡觉时搁在前爪上）
    const nk = (sp.neck || 0) * 0.5, hr = 0.3 * (fat > 1.3 ? 1.08 : 1), hx = L * (sit ? 0.55 : 0.75) + hr * 0.35 + nk * 0.06, hz = f.sleep ? hr * 0.85 : (sit ? bz * 0.75 + 0.12 + L * 0.55 + hr * 0.6 : bz + bh * 0.55 + hr * 0.45) + nk * 0.3 + (f.walk ? Math.sin(f.phase * 2) * 0.02 : 0); /* Q 版的大头 */
    if (nk) tube(t, [[L * 0.75, 0, bz + bh * 0.3], [hx - hr * 0.3, 0, hz - hr * 0.3]], bw * 0.55, hr * 0.5, (k) => mix(base, hex(P.light), k * 0.15), m, 8);
    headModel(t, sp, P, [hx, 0, hz], hr, f);
    // 腿
    for (const [fx, sy, ph] of [[1, 1, 0], [1, -1, Math.PI], [-1, 1, Math.PI], [-1, -1, 0]]) { const lx = fx * L * 0.55, ly = sy * bw * 0.55;
      if (f.sleep) { ell(t, [lx + (fx > 0 ? 0.18 : 0), ly * 1.05, 0.06], [0.16, 0.07, 0.06], () => paw, m, 4, 8); continue; }
      if (sit && fx < 0) { ell(t, [lx + 0.12, ly * 1.15, hipZ * 0.55], [0.24, 0.09, 0.15], () => base, m, 5, 10); ell(t, [lx + 0.3, ly * 1.05, 0.05], [0.14, 0.07, 0.05], () => paw, m, 4, 8); continue; }
      const sw = f.walk ? Math.sin(f.phase + ph) * 0.45 : 0, top = [lx, ly, (sit ? bz * 0.75 + 0.12 + 0.2 : bz) - bh * 0.45], knee = [lx + Math.sin(sw) * legL * 0.5, ly, top[2] - legL * 0.5], foot = [lx + Math.sin(sw) * legL * 0.9 + (f.walk ? Math.max(0, Math.cos(f.phase + ph)) * 0.05 : 0), ly, 0.05 + (f.walk ? Math.max(0, -Math.sin(f.phase + ph + 1.57)) * 0.06 : 0)];
      tube(t, [top, knee, foot], bw * 0.36, bw * 0.32, (k) => (k > 0.7 ? paw : base), m, 10); ell(t, [foot[0] + 0.03, foot[1], 0.05], [bw * 0.4, bw * 0.36, 0.06], () => paw, m, 6, 10); }
    // 尾巴
    const tl = sp.tail || 'long', tb = [-L * (sit ? 0.85 : 0.95), 0, sit ? hipZ * 0.6 : bz + bh * 0.2], sway = Math.sin((f.phase || 0) * 0.5 + (f.tt || 0) * 2) * 0.15;
    if (tl === 'long' || tl === 'thick' || tl === 'tuft') { const pts = [tb, [tb[0] - 0.2, sway, tb[2] + (sit ? -0.05 : 0.12)], [tb[0] - 0.38, sway * 1.6, tb[2] + (sit ? -0.08 : 0.32)], [tb[0] - 0.5, sway * 2, tb[2] + (sit ? -0.05 : 0.48)]]; tube(t, pts, tl === 'thick' ? 0.1 : 0.07, tl === 'thick' ? 0.06 : 0.05, (k) => (pat === 'point' || (pat !== 'solid' && k > 0.85) ? mix(base, dark, 0.7) : base), m, 6); if (tl === 'tuft') ell(t, pts[3], [0.07, 0.06, 0.09], () => dark, m, 4, 8); }
    else if (tl === 'bushy') { ell(t, [tb[0] - 0.2, sway, tb[2] + 0.12], [0.3, 0.16, 0.16], (d) => (d[0] < -0.7 ? hex(P.light) : base), m, 7, 12, 0.45); }
    else if (tl === 'up') tube(t, [tb, [tb[0] - 0.12, sway, tb[2] + 0.18], [tb[0] - 0.1, sway * 1.4, tb[2] + 0.34]], 0.05, 0.03, base, m, 6);
    else if (tl === 'curl') tube(t, [tb, [tb[0] - 0.08, 0.04, tb[2] + 0.06], [tb[0] - 0.03, 0.08, tb[2] + 0.12], [tb[0] - 0.1, 0.06, tb[2] + 0.14]], 0.03, 0.02, base, m, 5);
    else if (tl === 'puff') ell(t, [tb[0] + 0.02, 0, tb[2] + 0.05], [0.09, 0.09, 0.09], () => hex(P.light), m, 5, 8);
    else if (tl === 'short') ell(t, [tb[0], 0, tb[2] + 0.02], [0.08, 0.04, 0.05], () => base, m, 4, 6);
    if (sp.wings) for (const s2 of [-1, 1]) { const b0 = [0.05, s2 * bw * 0.8, bz + bh * 0.6], fl = Math.sin((f.tt || 0) * 3) * 0.15; const A = [b0, [b0[0] - 0.3, b0[1] + s2 * 0.5, b0[2] + 0.4 + fl], [b0[0] - 0.55, b0[1] + s2 * 0.35, b0[2] + 0.1 + fl]]; const nn = nrm(cross(sub(A[1], A[0]), sub(A[2], A[0]))), c0 = mix(hex(P.light), hex(P.base), 0.4); push(t, A[0], A[1], A[2], nn, nn, nn, c0, c0, c0, m); push(t, A[0], A[2], A[1], nn.map((x) => -x), nn.map((x) => -x), nn.map((x) => -x), c0, c0, c0, m); }
    if (sp.spikes) for (let i = 0; i < 6; i++) { const x = L * 0.6 - i * L * 0.3; ell(t, [x, 0, bz + bh * 0.95], [0.04, 0.02, 0.08], () => hex(P.light), m, 3, 6); }
  }
  /* 圆滚滚的小东西（仓鼠、旱獭、刺猬、豪猪、蝙蝠）：一个圆身子，小脚，刺猬身上背一层刺 */
  function round(t, sp, P, f) { const m = MAT().flat, base = hex(P.base), light = hex(P.light), paw = hex(P.paw || P.light), br = f.breath || 0, bob = f.walk ? Math.abs(Math.sin(f.phase)) * 0.04 : 0;
    ell(t, [0, 0, 0.3 + bob], [0.32, 0.3 * (1 + br * 0.03), 0.28 * (1 + br * 0.04)], (d) => (d[2] < -0.3 || (d[0] > 0.5 && d[2] < 0.2) ? light : base), m, 14, 20);
    if (sp.quills) for (let i = 0; i < 80 * sp.quills; i++) { const a = (i * 2.399) % 6.2832, e = 0.15 + (i / (80 * sp.quills)) * 1.2, d = [Math.cos(a) * Math.cos(e) * -0.8 - 0.2, Math.sin(a) * Math.cos(e), Math.sin(e)]; if (d[0] > 0.45) continue; const b0 = [d[0] * 0.33, d[1] * 0.28, 0.32 + bob + d[2] * 0.28], tip = [b0[0] + d[0] * 0.15 * sp.quills - 0.05, b0[1] + d[1] * 0.15 * sp.quills, b0[2] + d[2] * 0.15 * sp.quills]; tube(t, [b0, tip], 0.022, 0.004, (k) => mix(hex(P.dark), [0.95, 0.92, 0.85], k), m, 4); }
    headModel(t, Object.assign({ snout: 0.06, head: 0.28 }, sp), P, [0.24, 0, 0.56 + bob], 0.28, f);
    for (const [x, y] of [[0.15, 0.17], [0.15, -0.17], [-0.15, 0.17], [-0.15, -0.17]]) ell(t, [x + (f.walk ? Math.sin(f.phase + (x > 0 ? 0 : 3.14) + (y > 0 ? 0 : 3.14)) * 0.05 : 0), y, 0.05], [0.07, 0.05, 0.05], () => paw, m, 4, 8);
    if (sp.wings) for (const s2 of [-1, 1]) { const fl = Math.sin((f.tt || 0) * 8) * 0.25, A = [[0, s2 * 0.25, 0.4], [-0.15, s2 * 0.75, 0.6 + fl], [0.2, s2 * 0.7, 0.45 + fl]], nn = nrm(cross(sub(A[1], A[0]), sub(A[2], A[0]))), c0 = hex(P.dark); push(t, A[0], A[1], A[2], nn, nn, nn, c0, c0, c0, m); push(t, A[0], A[2], A[1], nn.map((x) => -x), nn.map((x) => -x), nn.map((x) => -x), c0, c0, c0, m); }
    if (sp.tail === 'short') ell(t, [-0.36, 0, 0.25], [0.08, 0.05, 0.05], () => base, m, 4, 6);
  }
  /* 鸟：圆身子、短翅膀（会扇）、喙、细腿；企鹅站直 */
  function bird(t, sp, P, f) { const m = MAT().flat, base = hex(P.base), light = hex(P.light), beakC = hex(P.beak || P.paw || '#f0b040'), up = sp.upright ? 1 : 0, bz = up ? 0.42 : 0.38, hop = f.walk ? Math.abs(Math.sin(f.phase)) * 0.05 : 0;
    ell(t, [0, 0, bz + hop], up ? [0.24, 0.24, 0.34] : [0.3, 0.25, 0.25], (d) => (d[0] > 0.2 && d[2] < 0.3 ? light : base), m, 14, 20, up ? 0 : -0.15);
    const hc = up ? [0.04, 0, bz + 0.46 + hop] : [0.25, 0, bz + 0.3 + hop], hr = 0.23; ell(t, hc, [hr, hr * 0.97, hr * 0.95], (d) => (sp.upright && d[0] > 0.3 && d[2] < 0.3 ? light : base), m, 12, 18);
    for (const s2 of [-1, 1]) { eye(t, [hc[0] + hr * 0.75, hc[1] + s2 * hr * 0.55, hc[2] + hr * 0.12], hr * 0.24, f.sleep, s2, s2 * 0.6); ell(t, [hc[0] + hr * 0.7, hc[1] + s2 * hr * 0.66, hc[2] - hr * 0.2], [hr * 0.06, hr * 0.15, hr * 0.09], () => [0.98, 0.62, 0.66], MAT().flat, 5, 8); }
    const bk = sp.beak; if (bk === 'flat') ell(t, [hc[0] + hr * 1.05, 0, hc[2] - hr * 0.15], [hr * 0.55, hr * 0.38, hr * 0.12], () => beakC, m, 4, 8); else if (bk === 'hook') tube(t, [[hc[0] + hr * 0.8, 0, hc[2]], [hc[0] + hr * 1.2, 0, hc[2] - hr * 0.1], [hc[0] + hr * 1.15, 0, hc[2] - hr * 0.4]], hr * 0.3, hr * 0.05, beakC, m, 6); else tube(t, [[hc[0] + hr * 0.8, 0, hc[2] - hr * 0.1], [hc[0] + hr * (bk === 'long' ? 1.8 : 1.25), 0, hc[2] - hr * 0.15]], hr * 0.22, hr * 0.04, beakC, m, 6);
    const fl = f.walk ? 0.1 : Math.sin((f.tt || 0) * 2) * 0.05; for (const s2 of [-1, 1]) ell(t, [up ? 0 : -0.04, s2 * 0.21, bz + 0.05 + hop], [0.2 * (sp.wing || 1), 0.05, (up ? 0.28 : 0.15) * (sp.wing || 1)], (d) => mix(base, hex(P.dark || P.base), 0.3 + Math.max(0, -d[0]) * 0.3), m, 6, 10, -0.3 - fl, s2 * 0.15);
    if (sp.tailf) tube(t, [[-0.25, 0, bz], [-0.55, 0, bz - 0.15]], 0.07, 0.02, hex(P.dark || P.base), m, 5); else ell(t, [-0.3, 0, bz + 0.05], [0.1, 0.08, 0.05], () => base, m, 4, 8);
    for (const s2 of [-1, 1]) { if (up) { ell(t, [0.08, s2 * 0.1, 0.03], [0.1, 0.06, 0.03], () => beakC, m, 4, 8); continue; } const sw = f.walk ? Math.sin(f.phase + (s2 > 0 ? 0 : 3.14)) * 0.08 : 0; tube(t, [[0, s2 * 0.08, bz - 0.15], [sw, s2 * 0.08, 0.03]], 0.025, 0.02, beakC, m, 5); ell(t, [sw + 0.04, s2 * 0.08, 0.02], [0.07, 0.05, 0.02], () => beakC, m, 4, 6); } }
  function blob(t, sp, P, f) { const m = MAT().flat, base = hex(P.base), light = hex(P.light); ell(t, [0, 0, 0.25], [0.5, 0.25, 0.24], (d) => (d[2] < -0.3 ? light : base), m, 9, 16); ell(t, [0.48, 0, 0.36], [0.2, 0.19, 0.18], () => base, m, 7, 12); for (const s2 of [-1, 1]) { eye(t, [0.62, s2 * 0.09, 0.42], 0.04, f.sleep); ell(t, [0.15, s2 * 0.25, 0.1], [0.16, 0.05, 0.04], () => base, m, 4, 8); } ell(t, [-0.5, 0, 0.12], [0.14, 0.16, 0.04], () => base, m, 4, 8); }
  function octo(t, sp, P, f) { const m = MAT().flat, base = hex(P.base), light = hex(P.light); ell(t, [0, 0, 0.55], [0.3, 0.3, 0.35], () => base, m, 9, 14); for (const s2 of [-1, 1]) eye(t, [0.26, s2 * 0.11, 0.5], 0.06, f.sleep); for (let k = 0; k < 8; k++) { const a = k * 0.785, w = Math.sin((f.tt || 0) * 2 + k) * 0.06; tube(t, [[Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0.3], [Math.cos(a) * 0.35, Math.sin(a) * 0.35 + w, 0.12], [Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.04]], 0.07, 0.025, (k2) => mix(base, light, k2 * 0.4), m, 6); } }
  /* 直立的（猫鼬、猴子、浮岛里站起来的刺猬小人）：上半身立着，两条后腿、两只前爪 */
  function upright(t, sp, P, f) { const m = MAT().flat, base = hex(P.base), light = hex(P.light), paw = hex(P.paw || P.base), bob = f.walk ? Math.abs(Math.sin(f.phase)) * 0.03 : 0, br = f.breath || 0;
    ell(t, [0, 0, 0.6 + bob], [0.23, 0.23 * (1 + br * 0.03), 0.32], (d) => (d[0] > 0.3 ? light : base), m, 14, 20);
    if (sp.quills) for (let i = 0; i < 60; i++) { const a = (i * 2.399) % 6.2832, e = -0.6 + (i / 60) * 1.9, d = [-Math.abs(Math.cos(a)) * Math.cos(e) - 0.1, Math.sin(a) * Math.cos(e), Math.sin(e)], b0 = [d[0] * 0.2, d[1] * 0.2, 0.62 + bob + d[2] * 0.34]; tube(t, [b0, [b0[0] + d[0] * 0.16 - 0.04, b0[1] + d[1] * 0.16, b0[2] + d[2] * 0.12 + 0.04]], 0.02, 0.004, (k) => mix(hex(P.dark), [0.95, 0.92, 0.85], k), m, 4); }
    headModel(t, Object.assign({ snout: 0.08, head: 0.3 }, sp), P, [0.04, 0, 1.16 + bob], 0.3, f);
    for (const s2 of [-1, 1]) { const sw = f.walk ? Math.sin(f.phase + (s2 > 0 ? 0 : 3.14)) * 0.35 : 0; tube(t, [[0, s2 * 0.1, 0.35], [Math.sin(sw) * 0.12, s2 * 0.11, 0.18], [Math.sin(sw) * 0.2, s2 * 0.11, 0.04]], 0.07, 0.05, base, m, 6); ell(t, [Math.sin(sw) * 0.2 + 0.05, s2 * 0.11, 0.03], [0.09, 0.06, 0.04], () => paw, m, 4, 8);
      const aw = f.walk ? -Math.sin(f.phase + (s2 > 0 ? 0 : 3.14)) * 0.3 : 0; tube(t, [[0.05, s2 * 0.19, 0.82 + bob], [0.12 + Math.sin(aw) * 0.1, s2 * 0.23, 0.62 + bob], [0.16 + Math.sin(aw) * 0.15, s2 * 0.2, 0.5 + bob]], 0.045, 0.035, base, m, 6); ell(t, [0.17 + Math.sin(aw) * 0.15, s2 * 0.2, 0.48 + bob], [0.05, 0.045, 0.045], () => paw, m, 4, 6); }
    if (sp.tail === 'long') tube(t, [[-0.18, 0, 0.4], [-0.4, 0, 0.25], [-0.55, 0, 0.35], [-0.62, 0, 0.55]], 0.045, 0.025, base, m, 6); }
  /* ---------- 模板（按 物种+毛色+动作帧 缓存） ---------- */
  const cache = new Map();
  function spec(species) { if (PP.SPR && PP.SPR.HUMAN && PP.SPR.HUMAN.has(species) && PP.G && PP.G.isle) return Object.assign({}, SP[species] || {}, { plan: 'upright', quills: species === 'hedgehog' ? 1 : 0 }); return SP[species] || SP.cat; }
  function poseOf(p) { const a = p.anim || 'idle', sleep = /sleep|nap|lie|dream/.test(a) || p.sleeping, sit = !sleep && /sit|groom|knead|eat|drink|type|think|beg|wash|purr/.test(a), walk = !sleep && !sit && /walk|run|trot|hop|zoom|chase|fetch/.test(a); const ph = walk ? Math.floor(((p.t || 0) * (a === 'run' ? 14 : 9)) % 12) : 0; return { key: (sleep ? 's' : sit ? 'i' : walk ? 'w' + ph : 'd' + (Math.floor((p.t || 0) * 1.5) % 4)), f: { sleep, sit, walk, phase: (ph / 12) * 6.2832, breath: walk ? 0 : Math.sin((p.t || 0) * 3), tt: p.t || 0 } }; }
  function tpl(p) { const sp = spec(p.d.species), P = p.pal || {}, po = poseOf(p), key = p.d.species + '|' + (P.base || '') + (P.pattern || '') + '|' + po.key; let t0 = cache.get(key); if (t0) return t0; if (cache.size > 600) cache.clear();
    if (sp.aqua) return null; const t = T(); const plan = sp.plan || 'quad'; (plan === 'quad' ? quad : plan === 'round' ? round : plan === 'bird' ? bird : plan === 'upright' ? upright : plan === 'octo' ? octo : blob)(t, sp, P, po.f);
    let zmax = 0; for (const q of t.P) zmax = Math.max(zmax, q[2]); t0 = { t, zmax: Math.max(0.3, zmax) }; cache.set(key, t0); return t0; }
  /* 放进当帧的网格：脚在 (u,v,z)，面朝 yaw；height 是它在场景里有多高（竖直格数） */
  const ZK = 2.83 / 1.155;
  function put(m, p, u, v, z, yaw, height) {
    const sp = spec(p.d.species); if (sp.aqua) { if (PP.AQUA) PP.AQUA.put(m, sp.aqua, u, v, z, yaw, height * 0.22, { lod: 1, wag: 0.15, phase: (p.t || 0) * 8 }); return; }
    const T0 = tpl(p); if (!T0) return; const s = (height / ZK) / T0.zmax, cy = Math.cos(yaw), sy = Math.sin(yaw), pk = 32 * (m.pick || 0), t = T0.t, n = t.P.length;
    for (let i = 0; i < n; i++) { const q = t.P[i], nn = t.N[i], c = t.C[i]; m.p.push(u + (q[0] * cy - q[1] * sy) * s, v + (q[0] * sy + q[1] * cy) * s, z + q[2] * s * ZK); m.n.push(nn[0] * cy - nn[1] * sy, nn[0] * sy + nn[1] * cy, nn[2]); m.c.push(c[0], c[1], c[2]); m.m.push(t.M[(i / 3) | 0] + pk); m.w.push(-1); }
  }
  PP.PET3DM = { put, SP, has: (sp) => !!SP[sp] || true };
})();
