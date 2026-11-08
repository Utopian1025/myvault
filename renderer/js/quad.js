// 四条腿的动物：侧身、四条腿着地走路（不再用同一个“站着的猫”模型）
// 大家共用一套画法（圆润、大头、大眼睛），但每种按自己的体型来：身长、腿长、脖子、头型、口鼻、耳朵、角、尾巴、花纹都不一样
// 坐标：朝右画，地面在 y=31，身体中心大约在 x=16；朝左时整体镜像
(function () {
  const PP = (window.PP = window.PP || {});
  const SPR = PP.SPR, HP = SPR.HP, T = SPR.tone, Hh = SPR._h;
  const K = HP.K, OUT = HP.OUT, RIM = HP.RIM;
  const GND = 31;

  // ---------- 每种动物的体型 ----------
  // body: [半长, 半高]  leg: 腿长  lw: 腿粗  neck: [长, 角度°(0=水平,90=竖直)]  head: [半宽, 半高]  snout: [长, 高]
  // ear: tri 尖耳 / round 圆耳 / long 长耳 / droop 下垂 / side 横着的 / small 小尖耳 / none
  // tail: long / bushy / tuft / short / curl / puff / thick / thin / none   hoof: 蹄子颜色键
  const D = {
    cat:        { body: [6.5, 3.6], leg: 5, lw: 2, neck: [2, 55], head: [4.8, 4.3], snout: [0.6, 2], ear: 'tri', earS: 3, tail: 'long', sit: 1, whisk: 1 },
    dog:        { body: [6.8, 3.8], leg: 5.5, lw: 2, neck: [2.4, 55], head: [4.6, 4.2], snout: [2.6, 2.6], ear: 'tri', earS: 2.6, tail: 'curl', sit: 1 },
    fox:        { body: [7, 3.4], leg: 5, lw: 2, neck: [2.4, 50], head: [4.4, 4], snout: [3, 2.2], ear: 'tri', earS: 3.6, tail: 'bushy', tailL: 9, sit: 1, socks: 1 },
    arcticfox:  { body: [6.4, 3.6], leg: 4.5, lw: 2, neck: [2, 50], head: [4.4, 4], snout: [2.4, 2.2], ear: 'small', earS: 2.4, tail: 'bushy', tailL: 8, sit: 1 },
    fennec:     { body: [5.8, 3.2], leg: 4.5, lw: 2, neck: [2, 55], head: [4.2, 3.8], snout: [2.4, 2], ear: 'tri', earS: 6.5, earW: 3.6, tail: 'bushy', tailL: 7, sit: 1 },
    lion:       { body: [8.6, 4.4], leg: 6, lw: 3, neck: [2.6, 45], head: [5, 4.6], snout: [2.6, 3], ear: 'round', earS: 1.8, tail: 'tuft', tailL: 9, sit: 1, mane: 1 },
    tiger:      { body: [9, 4.2], leg: 5.5, lw: 3, neck: [2.4, 40], head: [5, 4.4], snout: [2.4, 3], ear: 'round', earS: 1.8, tail: 'long', tailL: 10, sit: 1, stripes: 'tiger', whisk: 1 },
    snowleopard:{ body: [8.4, 3.8], leg: 5, lw: 3, neck: [2.4, 40], head: [4.6, 4.2], snout: [2, 2.6], ear: 'round', earS: 1.6, tail: 'thick', tailL: 13, sit: 1, spots: 'rosette', whisk: 1 },
    polarbear:  { body: [9.4, 5], leg: 5.5, lw: 3.4, neck: [3, 30], head: [4.6, 4.2], snout: [3, 2.8], ear: 'round', earS: 1.8, tail: 'short', sit: 1 },
    brownbear:  { body: [9.2, 5.2], leg: 5.5, lw: 3.4, neck: [2.4, 30], head: [5, 4.6], snout: [2.8, 2.8], ear: 'round', earS: 2.2, tail: 'short', sit: 1, hump: 1 },
    zebra:      { body: [8.6, 4.2], leg: 8, lw: 2, neck: [5.5, 62], head: [3.8, 3.6], snout: [4.2, 2.8], ear: 'small', earS: 3.2, tail: 'tuft', tailL: 8, hoof: 1, maneC: 1, stripes: 'zebra' },
    antelope:   { body: [7.6, 3.6], leg: 8.5, lw: 1.6, neck: [4.4, 62], head: [3.4, 3.2], snout: [3.2, 2.2], ear: 'small', earS: 2.8, tail: 'short', hoof: 1, horn: 'spike', belly: 1 },
    deer:       { body: [7.4, 3.8], leg: 8, lw: 1.8, neck: [4.4, 64], head: [3.6, 3.4], snout: [3, 2.2], ear: 'side', earS: 3.4, tail: 'short', hoof: 1, spotsC: 'fawn', horn: 'antler' },
    cow:        { body: [9.6, 5.2], leg: 6, lw: 2.6, neck: [2.6, 28], head: [4.2, 4], snout: [3, 3.2], ear: 'side', earS: 3, tail: 'tuft', tailL: 9, hoof: 1, horn: 'small', patches: 1, udder: 1 },
    yak:        { body: [9.6, 5.6], leg: 5, lw: 2.8, neck: [2.2, 18], head: [4.4, 4.2], snout: [2.8, 3], ear: 'side', earS: 2.4, tail: 'tuft', tailL: 8, hoof: 1, horn: 'yak', skirt: 1, hump: 1 },
    alpaca:     { body: [6.6, 4.2], leg: 7, lw: 2, neck: [7.5, 82], head: [3.6, 3.6], snout: [2.2, 2.4], ear: 'small', earS: 3.6, tail: 'puff', hoof: 1, wool: 1 },
    sheep:      { body: [7.4, 4.8], leg: 5, lw: 1.8, neck: [1.6, 30], head: [3.6, 3.6], snout: [2.4, 2.6], ear: 'side', earS: 2.6, tail: 'puff', hoof: 1, wool: 1, faceDark: 1 },
    camel:      { body: [8.4, 4.4], leg: 9, lw: 2, neck: [7, 40], neckBow: 1, head: [3.6, 3.2], snout: [3.6, 2.8], ear: 'small', earS: 2, tail: 'thin', tailL: 7, hoof: 1, humps: 1 },
    hippo:      { body: [10.4, 5.8], leg: 3.6, lw: 3.6, neck: [1.2, 10], head: [5, 4.6], snout: [4.6, 4.6], ear: 'round', earS: 1.4, tail: 'thin', tailL: 4, hoof: 0, bigMouth: 1 },
    pig:        { body: [7.6, 4.6], leg: 3.8, lw: 2.4, neck: [1.2, 20], head: [4.4, 4.2], snout: [2.2, 2.8], ear: 'tri', earS: 2.6, earFlop: 1, tail: 'curl', hoof: 1, pigNose: 1, sit: 1 },
    capybara:   { body: [8.4, 4.8], leg: 3.6, lw: 2.6, neck: [1.4, 20], head: [4.6, 4.2], snout: [3.6, 3.8], ear: 'round', earS: 1.4, tail: 'none', sit: 1, blunt: 1 },
    otter:      { body: [8.2, 3], leg: 3, lw: 2.2, neck: [2, 30], head: [3.8, 3.4], snout: [1.8, 2.4], ear: 'round', earS: 1.2, tail: 'thick', tailL: 9, sit: 1, whisk: 1, belly: 1 },
    rabbit:     { body: [5.6, 4.4], leg: 2.6, lw: 2.4, neck: [1.4, 70], head: [4, 3.8], snout: [1.2, 2.2], ear: 'long', earS: 8, tail: 'puff', hop: 1, sit: 1, bigHind: 1 },
    arctichare: { body: [5.8, 4.4], leg: 3, lw: 2.4, neck: [1.6, 70], head: [4, 3.8], snout: [1.2, 2.2], ear: 'long', earS: 8.5, earTip: 1, tail: 'puff', hop: 1, sit: 1, bigHind: 1 },
    hamster:    { body: [5.6, 4.6], leg: 1.6, lw: 2, neck: [0.6, 20], head: [4.4, 4.2], snout: [1.2, 2.2], ear: 'round', earS: 1.8, tail: 'none', sit: 1, round: 1, belly: 1 },
    marmot:     { body: [6.8, 4.8], leg: 2.4, lw: 2.4, neck: [1.2, 40], head: [4.2, 3.8], snout: [1.8, 2.6], ear: 'round', earS: 1.4, tail: 'bushy', tailL: 5, sit: 1, belly: 1 },
    hedgehog:   { body: [6.8, 4.4], leg: 1.6, lw: 2, neck: [0.4, 10], head: [3.4, 3.2], snout: [2.6, 2], ear: 'round', earS: 1.2, tail: 'none', spines: 'hedgehog', round: 1 },
    porcupine:  { body: [7.6, 4.6], leg: 2.2, lw: 2.2, neck: [0.6, 10], head: [3.4, 3.2], snout: [2.4, 2.2], ear: 'round', earS: 1.2, tail: 'short', spines: 'porcupine', round: 1 },
    meerkat:    { body: [5.6, 2.8], leg: 4, lw: 1.8, neck: [2, 55], head: [3.4, 3], snout: [2.4, 1.8], ear: 'round', earS: 1.2, tail: 'thin', tailL: 8, sit: 1, stand: 1, mask: 1 },
    monkey:     { body: [5.6, 3.8], leg: 5.5, lw: 2, neck: [1.6, 60], head: [4.4, 4.2], snout: [1.2, 2.6], ear: 'round', earS: 2, tail: 'long', tailL: 12, tailUp: 1, sit: 1, monkeyFace: 1 },
  };
  // 整体放大：和原来的大头小可爱差不多大（太大的动物放大少一点，免得出画）
  for (const [k, d] of Object.entries(D)) {
    const z = d.body[0] > 9 ? 1.18 : d.body[0] > 7.5 ? 1.26 : 1.34;
    d.body = d.body.map((v) => v * z); d.leg *= z; d.lw = Math.round(d.lw * (z > 1.25 ? 1.2 : 1.1) * 2) / 2; d.neck = [d.neck[0] * z, d.neck[1]];
    d.head = d.head.map((v) => v * z); d.snout = d.snout.map((v) => v * z); d.earS = (d.earS || 2) * z; if (d.earW) d.earW *= z; if (d.tailL) d.tailL *= z;
    d.z = z;
  }
  PP.QUAD = { has: (sp) => !!(PP.QUAD_ON && D[sp]), def: D };

  // ---------- 小工具 ----------
  function mk() { const b = new SPR.Buf(56, 34, 10); b.tx = 12; return b; }
  // 画在朝右的局部坐标里，朝左时 x 镜像（x' = 32 - x）
  function painter(b, f) {
    // 存储时整体右移 12 格（缓冲区左边多留 12 格给尾巴），显示时 blit 会用 tx 挪回来
    const X = (x) => (f > 0 ? x : 32 - x) + 12;
    return {
      X,
      ell(cx, cy, rx, ry, c, on) { HP.ell(b, X(cx) - 0.5 + 0.5, cy, rx, ry, c, on); },
      rect(x, y, w, h, c, on) { const x0 = (f > 0 ? x : 32 - x - w) + 12; HP.rect(b, Math.round(x0), Math.round(y), Math.round(w), Math.round(h), c, on); },
      poly(pts, c, on) { HP.poly(b, pts.map(([x, y]) => [X(x), y]), c, on); },
      set(x, y, c) { b.set(Math.round(X(x)), Math.round(y), c); },
      on(x, y, c) { b.setOn(Math.round(X(x)), Math.round(y), c); },
      get(x, y) { return b.get(Math.round(X(x)), Math.round(y)); },
      line(x0, y0, x1, y1, w, c) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)); for (let i = 0; i <= n; i++) { const a = i / n; HP.ell(b, X(x0 + (x1 - x0) * a), y0 + (y1 - y0) * a, w / 2, w / 2, c); } },
    };
  }

  const LIGHTMUZ = new Set(['cat', 'dog', 'fox', 'tiger', 'lion', 'snowleopard', 'brownbear', 'otter', 'marmot', 'deer', 'antelope', 'meerkat', 'fennec', 'arcticfox']);
  const hrxOf = (d) => d.head[0], hryOf = (d) => d.head[1];
  // ---------- 主函数 ----------
  function draw(p) {
    const sp = p.species, d = D[sp], C = p.pal, f = p.facing >= 0 ? 1 : -1, t = p.t || 0;
    let anim = p.anim || 'idle';
    const map = { knead: 'sit', groom: 'sit', type: 'sit', roll: 'sit', think: 'sit', dance: 'idle', look_up: 'idle', land: 'crouch', fall: 'jump', yawn: 'sit', stretch: 'bow', curl: 'lie', drink: 'eat', swim: 'swim', hang: 'idle', walk: 'walk', run: 'run' };
    if (map[anim]) anim = map[anim];
    if (anim === 'sit' && !d.sit) anim = 'idle';
    if (anim === 'bow' && d.hoof) anim = 'idle';
    const b = mk(), P = painter(b, f);
    const shade = C.shade || T(C.base, -0.2), hi = T(C.base, 0.25), dark = C.dark || T(C.base, -0.4);
    const legC = d.hoof ? C.base : C.paw || C.base;
    const footC = d.hoof ? (C.hoof || T(C.dark || C.base, -0.35)) : (C.socks && d.socks ? C.socks : C.paw || C.base);

    // ---- 身体姿态 ----
    let [brx, bry] = d.body, legH = d.leg;
    const lie = anim === 'lie' || anim === 'sleep', sit = anim === 'sit', crouch = anim === 'crouch', eat = anim === 'eat';
    const breathe = Math.sin(t * 2.1) > 0.2 ? 0.4 : 0;
    let bob = 0, ph = 0, stride = 0, lift = 0;
    if (anim === 'walk') { ph = t * (d.hoof ? 6.5 : 8); stride = Math.min(2.2, legH * 0.32 + 0.6); lift = 1.2; bob = Math.abs(Math.sin(ph)) * 0.5; }
    if (anim === 'run') { ph = t * 13; stride = Math.min(3.2, legH * 0.45 + 0.8); lift = 2; bob = Math.abs(Math.sin(ph)) * 1.2; }
    if (crouch) legH *= 0.55;
    if (anim === 'swim') legH = 1;
    const bx = 16 - (d.neck[0] * Math.cos(d.neck[1] * Math.PI / 180)) * 0.35;
    let by = GND - legH - bry + 0.6 - bob + (lie ? legH + 0.5 : 0);
    if (anim === 'jump') by -= 1;
    if (d.hop && anim === 'walk') { const hp = Math.max(0, Math.sin(t * 9)); by -= hp * 3; }
    const front = bx + brx * 0.62, back = bx - brx * 0.62;
    // 头和脖子
    let nAng = d.neck[1], nLen = d.neck[0];
    if (eat) nAng = d.neck[1] - 75 - (d.neck[0] > 4 ? 10 : 0);
    if (lie) nAng = anim === 'sleep' ? Math.min(nAng, 8) - 12 : Math.min(nAng, 35);
    if (anim === 'run') nAng = Math.max(0, nAng - 20);
    if (anim === 'swim') nAng = 15;
    const nRad = nAng * Math.PI / 180;
    const nx0 = bx + brx * 0.78, ny0 = by - bry * 0.35;
    let hx = nx0 + Math.cos(nRad) * (nLen + d.head[0] * 0.55), hy = ny0 - Math.sin(nRad) * (nLen + d.head[1] * 0.4) + breathe * 0.5;
    if (sit) { const h2 = brx * 0.95; hx = bx + brx * 0.15 + 1.6 + hrxOf(d) * 0.35; hy = GND - bry - h2 * 1.25 - hryOf(d) * 0.55 + breathe * 0.5; }
    if (eat) { hy = Math.max(hy, GND - d.head[1] - 0.5); }
    if (lie) hy = Math.max(hy, GND - d.head[1] - (anim === 'sleep' ? 0.4 : 2.4));
    const [hrx, hry] = d.head;

    // ---- 画：远侧的腿 → 尾巴 → 身体 → 近侧的腿 → 脖子和头 ----
    const legsAt = (near) => {
      const out = [];
      // 对角线两条腿同步：前近+后远 一组，前远+后近 一组
      const pairs = [[front + (near ? 0 : 1.2), near ? 0 : Math.PI], [back + (near ? 0 : 1.2), near ? Math.PI : 0]];
      for (const [lx, phase] of pairs) out.push([lx, phase]);
      return out;
    };
    const drawLeg = (lx, phase, near, isFront) => {
      const col = near ? legC : T(legC, -0.22), fc = near ? footC : T(footC, -0.2);
      let top = by + bry * 0.4, x0 = lx, len = GND - top;
      let sw = 0, up = 0;
      if (anim === 'walk' || anim === 'run') {
        const s = Math.sin(ph + phase); sw = s * stride; up = Math.max(0, Math.cos(ph + phase)) * lift;
        if (anim === 'run') { const g = Math.sin(ph); sw = (isFront ? 1 : -1) * g * stride + (near ? 0.4 : -0.4); up = Math.max(0, -g * (isFront ? 1 : -1)) * lift; }
      }
      if (anim === 'jump') { sw = isFront ? 2.4 : -2.4; up = 1.5; }
      if (p.anim === 'held') { sw = isFront ? 0.6 : -0.6; up = -1; }
      if (crouch) sw = isFront ? 0.8 : -0.8;
      const w = d.lw;
      // 腿：上粗下细一点，膝盖处微微弯
      const ex = x0 + sw, ey = GND - up;
      P.line(x0, top, (x0 + ex) / 2 + (isFront ? -0.3 : 0.4), (top + ey) / 2, w + 0.4, col);
      P.line((x0 + ex) / 2 + (isFront ? -0.3 : 0.4), (top + ey) / 2, ex, ey - 1, w, col);
      P.rect(ex - w / 2 - (d.hoof ? 0 : 0.3), ey - (d.hoof ? 1.6 : 1.2), w + (d.hoof ? 0 : 0.8), d.hoof ? 2 : 1.6, fc);
    };
    const drawLegs = (near) => {
      if (lie) { // 趴着：前爪伸在前面
        if (near) { P.rect(front + 0.5, GND - 1.6, 3.4, 1.8, footC); }
        return;
      }
      if (sit) {
        // 坐着：前腿直直撑着，后腿收成一团
        const cx = bx + brx * 0.15, flx = cx + bry * 0.75 + (near ? 0 : 1.2);
        P.line(flx, GND - bry * 1.6, flx + 0.3, GND - 1, d.lw + 0.2, near ? legC : T(legC, -0.22)); P.rect(flx - d.lw / 2, GND - 1.4, d.lw + 1, 1.6, near ? footC : T(footC, -0.2));
        if (near) { P.ell(cx - bry * 0.5, GND - 2.2, Math.min(4.2, bry * 0.85), 2.4, T(C.base, -0.08)); P.rect(cx - bry * 0.2, GND - 1.3, 3.4, 1.5, footC); }
        return;
      }
      for (const [lx, phase] of legsAt(near)) drawLeg(lx, phase, near, lx > bx);
    };

    drawLegs(false);
    // 尾巴（在身体后面）
    drawTail(P, d, C, sp, sit ? bx + brx * 0.15 - d.body[1] * 1.1 : back - brx * 0.3, sit ? GND - 2 : by - bry * 0.3, anim, t, lie, sit, dark, shade);
    // 身体
    if (sit) {
      // 坐着：身体斜着，前高后低
      // 身体竖起来：屁股坐在地上，胸口抬高
      const cx = bx + brx * 0.15, h2 = brx * 0.95;
      P.ell(cx - 0.5, GND - bry * 0.95, bry * 1.15, bry * 0.95, C.base);
      P.ell(cx + 1.2, GND - bry * 0.9 - h2 * 0.75, bry * 0.95, h2 * 0.62, C.base);
      P.poly([[cx - bry * 1.1, GND - bry], [cx + 0.2 - bry * 0.6, GND - bry - h2 * 1.1], [cx + 2.2 + bry * 0.8, GND - bry - h2 * 1.0], [cx + 1.6 + bry, GND - 1]], C.base);
      P.ell(cx + 1.6, GND - bry - h2 * 0.5, bry * 0.55, h2 * 0.5, C.light || C.base, false);
    } else {
      P.ell(bx, by, brx, bry + (lie ? 0.2 : 0) + breathe * 0.3, C.base);
      if (d.round) P.ell(bx - brx * 0.1, by - bry * 0.25, brx * 0.9, bry * 1.05, C.base);
    }
    if (d.hump) P.ell(front - 1, by - bry * 0.75, brx * 0.42, bry * 0.55, C.base);
    if (d.humps) { P.ell(bx - 2.2, by - bry - 1.2, 2.6, 2.8, C.base); P.ell(bx + 2.6, by - bry - 1.2, 2.6, 2.8, C.base); }
    if (d.wool || d.skirt) woolEdge(P, bx, by, brx, bry, C, d, sit || lie);
    if (d.spines && !sit) spineDome(P, d, C, bx, by, brx, bry, lie);
    if (d.udder && !lie && !sit) P.ell(back + 2.2, by + bry - 0.2, 1.6, 1.2, C.inner || '#f2a0a8');
    // 明暗：只画在身体上（这时近侧的腿和头还没画）
    if (!sit) { P.ell(bx, by + bry * 0.95, brx * 1.1, bry * 0.5, shade, true); P.ell(bx - brx * 0.1, by - bry * 0.66, brx * 0.6, bry * 0.22, hi, true); }
    if (d.belly && !lie && !sit) P.ell(bx + brx * 0.1, by + bry * 0.5, brx * 0.66, bry * 0.4, C.light, true);
    drawLegs(true);
    // 脖子：从肩膀连到头
    if (nLen > 0.5) {
      const nw = Math.max(d.lw + 1, Math.min(hry * 1.4, bry * 1.1)) + (d.wool ? 1.6 : 0);
      const ax = d.neckBow ? 2.2 : 0;
      const mx = (nx0 + hx) / 2 + (d.neckBow ? -ax : 0), my = (ny0 + hy) / 2 + (d.neckBow ? ax : 0);
      P.line(nx0 - 0.5, ny0, mx, my, nw, d.wool ? (C.wool || C.light || C.base) : C.base); P.line(mx, my, hx - hrx * 0.25, hy + hry * 0.2, nw * 0.9, d.wool ? (C.wool || C.light || C.base) : C.base);
      if (d.maneC) for (let k = 0.15; k < 0.95; k += 0.12) { const xx = nx0 + (hx - nx0) * k - Math.sin(nRad) * nw * 0.45, yy = ny0 + (hy - ny0) * k - Math.cos(nRad) * nw * 0.45; P.rect(xx - 0.5, yy - 1.6, 1.6, 2, k > 0.5 ? K : C.dark || K); }
    }
    // 鬃毛（狮子）：头后面一大圈
    if (d.mane) { P.ell(hx - 1.2, hy + 0.4, hrx + 2.4, hry + 2.4, C.mane || T(C.base, -0.3)); P.ell(hx - 1.6, hy + 0.2, hrx + 1.4, hry + 1.4, C.mane2 || T(C.base, -0.18)); }
    // 耳朵（后面那只先画）
    drawEars(P, d, C, hx, hy, hrx, hry, false, p, anim);
    // 头 + 口鼻
    P.ell(hx, hy, hrx, hry, d.wool && C.face ? C.face : C.base);
    const sx = hx + hrx * 0.7 + d.snout[0] * 0.45, sy = hy + hry * 0.35;
    if (d.snout[0] > 0) P.ell(sx, sy, d.snout[0] * 0.8 + 0.6, d.snout[1] * 0.55 + 0.4, d.faceDark ? C.face || C.base : d.blunt ? C.base : (C.muzzle || (LIGHTMUZ.has(sp) ? C.light : C.base)));
    drawEars(P, d, C, hx, hy, hrx, hry, true, p, anim);
    // 角
    drawHorns(P, d, C, hx, hy, hrx, hry, p);

    // ---- 轮廓 ----
    Hh.outlineSel(b);

    // ---- 轮廓里面的细节：明暗、花纹、肚皮、脸 ----
    // 下半身暗一点，背上亮一点（立体感）
    pattern(P, d, C, sp, bx, by, brx, bry, hx, hy, hrx, hry, sit, lie, t);
    if (d.spines && !sit) spineTex(P, d, C, bx, by, brx, bry);
    // 脸
    face(P, b, p, d, C, hx, hy, hrx, hry, sx, sy, f, anim);
    if (p.hat) Hh.drawHat(b, p.hat, P.X(hx), hy - hry + 5.5, f);

    // 白色外描边：贴纸感
    HP.outline(b, RIM);
    b.head = [P.X(hx) - 12, hy - 1];
    let out = b;
    if (p.transform === 'flipV') out = Hh.shift(Hh.flipV(b), 0, -2);
    else if (p.transform === 'buried') out = Hh.buried(Hh.flipV(b));
    if (out !== b) out.head = [b.head[0], 31 - b.head[1]];
    return out;
  }

  // ---------- 尾巴 ----------
  function drawTail(P, d, C, sp, x, y, anim, t, lie, sit, dark, shade) {
    const L = d.tailL || 5, sway = Math.sin(t * (anim === 'walk' || anim === 'run' ? 7 : 2.4)) * 1.2;
    const tc = C.tail || C.base;
    switch (d.tail) {
      case 'long': {
        const up = d.tailUp ? 1 : 0;
        let px = x, py = y;
        for (let i = 1; i <= L; i++) { const a = i / L; const nx = x - a * L * 0.55 - (sit ? -a * 2 : 0), ny = y - Math.sin(a * Math.PI * (up ? 0.9 : 0.6)) * L * (up ? 0.9 : 0.55) + (lie ? a * 2 : 0) + sway * a; P.line(px, py, nx, ny, 1.8, tc); px = nx; py = ny; }
        if (d.stripes === 'tiger') P.rect(px - 1, py - 1, 2, 2, K);
        break;
      }
      case 'bushy': { const cx = x - L * 0.45, cy = y - L * 0.1 + sway * 0.5 + (lie ? 2 : 0); P.ell(cx, cy, L * 0.55, L * 0.32, tc); P.ell(cx - L * 0.38, cy - 0.3, L * 0.22, L * 0.2, C.tip || C.light || '#ffffff'); break; }
      case 'thick': { let px = x, py = y; for (let i = 1; i <= L; i++) { const a = i / L, nx = x - a * L * 0.8, ny = y + a * 2.5 - Math.sin(a * 3) * 1.2 + sway * a * 0.6; P.line(px, py, nx, ny, 3.2 - a * 1.2, tc); px = nx; py = ny; } break; }
      case 'tuft': { let px = x, py = y; for (let i = 1; i <= L; i++) { const a = i / L, nx = x - 1 - a * 1.6 + sway * a * 0.4, ny = y + a * L * 0.9; P.line(px, py, nx, ny, 1.1, tc); px = nx; py = ny; } P.ell(px, py + 0.6, 1.2, 1.6, C.tuft || dark); break; }
      case 'thin': { let px = x, py = y; for (let i = 1; i <= L; i++) { const a = i / L, nx = x - a * 1.4 + sway * a * 0.5, ny = y + a * L * 0.85; P.line(px, py, nx, ny, 1, tc); px = nx; py = ny; } break; }
      case 'short': P.ell(x - 0.6, y - 0.6, 1.6, 1.4, d.horn === 'antler' || sp === 'antelope' ? C.light || '#ffffff' : tc); break;
      case 'puff': P.ell(x - 0.6, y - 0.4, 2, 1.8, C.tailPuff || C.light || '#ffffff'); break;
      case 'curl': { const cx = x - 0.8, cy = y - 1.6; P.ell(cx, cy, 1.6, 1.6, tc); P.set(cx, cy, null); if (sp === 'dog') P.ell(cx - 0.2, cy - 0.6, 2.2, 1.8, tc); break; }
    }
  }
  // ---------- 耳朵 ----------
  function drawEars(P, d, C, hx, hy, hrx, hry, near, p, anim) {
    const S = d.earS || 2, ex = hx + (near ? 0.4 : -1.6), ey = hy - hry + 0.8, back = p.ears === 'back' || anim === 'run';
    const c = near ? C.base : T(C.base, -0.18), ic = C.inner || '#f2a0a8';
    switch (d.ear) {
      case 'tri': case 'small': {
        const w = d.earW || (d.ear === 'small' ? 1.6 : 2.2), lean = back ? -S * 0.5 : d.earFlop && near ? S * 0.6 : 0;
        const tip = [ex + lean, ey - S + (d.earFlop && near ? S * 0.5 : 0)];
        P.poly([[ex - w, ey + 1], [ex + w, ey + 1], tip], c);
        if (near && S > 2) P.poly([[ex - w + 1, ey + 0.6], [ex + w - 1, ey + 0.6], [tip[0], tip[1] + 1.4]], ic);
        break;
      }
      case 'round': P.ell(ex, ey + 0.2, S * 0.85, S * 0.75, c); if (near) P.ell(ex, ey + 0.4, S * 0.4, S * 0.35, ic); break;
      case 'long': {
        const lean = back ? -2.2 : -0.8 + (near ? 0.2 : -0.6), droop = p.lop ? 1 : 0;
        if (droop) { P.poly([[ex - 1, ey + 1], [ex + 1.4, ey + 1], [ex - 2 + lean, ey + S * 0.75], [ex - 3.4 + lean, ey + S * 0.6]], c); break; }
        P.poly([[ex - 1.4, ey + 1.2], [ex + 1.4, ey + 1.2], [ex + 1 + lean, ey - S], [ex - 1.2 + lean, ey - S + 0.6]], c);
        if (near) P.poly([[ex - 0.4, ey], [ex + 0.6, ey], [ex + 0.4 + lean, ey - S + 1.6], [ex - 0.4 + lean, ey - S + 1.8]], ic);
        if (d.earTip) P.rect(ex - 1 + lean, ey - S, 2.4, 1.2, '#231c20');
        break;
      }
      case 'side': { const y = hy - hry * 0.3, x = hx - hrx * 0.55 + (near ? 0.8 : -0.8); P.poly([[x + 1, y - 1], [x + 1, y + 1.2], [x - S, y + 0.6], [x - S + 0.6, y - 1]], c); if (near) P.rect(x - S + 1, y - 0.2, S - 1.2, 0.8, ic); break; }
    }
  }
  // ---------- 角 ----------
  function drawHorns(P, d, C, hx, hy, hrx, hry, p) {
    const hc = C.horn || '#ece0c4', top = hy - hry + 0.6;
    switch (d.horn) {
      case 'small': P.poly([[hx - 0.5, top + 1], [hx + 1.2, top + 1], [hx + 1.8, top - 1.8]], hc); break;
      case 'yak': P.line(hx - 0.6, top + 0.6, hx + 1.4, top - 1.6, 1.6, hc); P.line(hx + 1.4, top - 1.6, hx + 0.4, top - 3.6, 1.2, hc); break;
      case 'spike': P.line(hx - 0.4, top + 0.8, hx - 3.2, top - 5.2, 1.3, hc); P.line(hx + 0.6, top + 0.8, hx - 2, top - 5.6, 1.1, T(hc, -0.15)); break;
      case 'antler': if (p.coatKey === 'buck' || (p.pal && p.pal.antler)) { const ac = p.pal.antler || hc; P.line(hx - 0.4, top + 0.6, hx - 1.6, top - 5, 1, ac); P.line(hx - 1.2, top - 2.2, hx + 1.6, top - 4, 1, ac); P.line(hx - 1.4, top - 3.8, hx - 4, top - 5.4, 1, ac); } break;
    }
  }
  // ---------- 羊毛 / 长毛 ----------
  function woolEdge(P, bx, by, brx, bry, C, d, low) {
    const wc = C.wool || C.light || C.base;
    if (d.wool) { for (let a = 0; a < Math.PI * 2; a += 0.55) P.ell(bx + Math.cos(a) * brx * 0.92, by + Math.sin(a) * bry * 0.88, 1.8, 1.6, wc); P.ell(bx, by, brx, bry, wc); }
    if (d.skirt && !low) for (let x = -brx + 1; x < brx; x += 1.6) P.rect(bx + x - 0.6, by + bry * 0.6, 1.4, 2.6 + ((x * 7) % 2), T(C.base, -0.12));
  }
  // ---------- 花纹 ----------
  function pattern(P, d, C, sp, bx, by, brx, bry, hx, hy, hrx, hry, sit, lie, t) {
    const dk = C.dark || K;
    if (d.stripes === 'tiger') { for (let x = -brx + 2; x < brx - 1; x += 2.6) { P.on(bx + x, by - bry + 1, K); P.on(bx + x + 0.4, by - bry + 2, K); P.on(bx + x - 0.2, by - bry + 3, K); } P.on(hx - 1, hy - hry + 1.2, K); P.on(hx + 0.6, hy - hry + 1.6, K); P.on(hx - 2.4, hy - 0.4, K); }
    if (d.stripes === 'zebra') { for (let x = -brx + 1; x < brx; x += 2) for (let y = -bry; y < bry; y++) P.on(bx + x + (y % 2 ? 0.3 : 0), by + y, K); for (let y = -hry + 1; y < hry; y += 2) P.on(hx - hrx + 1.4, hy + y, K); }
    if (d.spots === 'rosette') { for (let i = 0; i < 9; i++) { const x = bx - brx + 2 + ((i * 3.7) % (brx * 2 - 3)), y = by - bry + 1 + ((i * 2.3) % (bry * 1.6)); P.on(x, y, dk); P.on(x + 1, y, dk); P.on(x, y + 1, dk); } P.on(hx - 1, hy - hry + 1.4, dk); P.on(hx + 1, hy - hry + 2, dk); }
    if (d.spotsC === 'fawn' && C.spots) for (let i = 0; i < 6; i++) P.on(bx - brx + 2 + i * 2.2, by - bry + 1.4 + (i % 2), '#fff4e0');
    if (d.patches) { P.ell(bx - 2, by - 1, 2.6, 2, K, true); P.ell(bx + 4, by + 1.2, 1.8, 1.4, K, true); P.ell(hx - 1, hy - 1, 1.4, 1.4, K, true); }
    if (d.mask) { P.on(hx + 0.4, hy - 0.2, K); P.on(hx + 1.4, hy - 0.2, K); P.on(hx + 0.4, hy + 0.8, K); }
    if (d.monkeyFace) P.ell(hx + hrx * 0.45, hy + 0.4, hrx * 0.62, hry * 0.7, C.light || '#f6d8b8', true);
  }
  // 刺：背上一整片深色的刺，边缘一根根支出来（豪猪的刺更长，尖是白的）
  function spineDome(P, d, C, bx, by, brx, bry, lie) {
    const sc = C.spine || C.dark, long = d.spines === 'porcupine', R = long ? 1.5 : 0.8;
    const cut = by + bry * (lie ? 0.5 : 0.25);
    for (let y = Math.floor(by - bry - 3); y <= cut; y++) for (let x = Math.floor(bx - brx - 3); x <= bx + brx * 0.75; x++) {
      const dx = (x + 0.5 - (bx - 0.6)) / (brx + 0.9), dy = (y + 0.5 - by) / (bry + 0.9);
      if (dx * dx + dy * dy <= 1) P.set(x, y, sc);
    }
    for (let a = 0.12; a < Math.PI * 0.95; a += long ? 0.2 : 0.26) {
      const x0 = bx - 0.6 - Math.cos(a) * (brx + 0.6), y0 = by - Math.sin(a) * (bry + 0.6);
      const x1 = bx - 0.6 - Math.cos(a) * (brx + R + 1.4) - (long ? 1.6 : 0.8), y1 = by - Math.sin(a) * (bry + R + 1.2);
      P.line(x0, y0, x1, y1, 1, sc);
    }
  }
  function spineTex(P, d, C, bx, by, brx, bry) {
    const tip = C.tip || '#ffffff', long = d.spines === 'porcupine';
    for (let y = Math.floor(by - bry - 2); y < by + bry * 0.2; y += 2) for (let x = Math.floor(bx - brx - 2); x < bx + brx * 0.7; x += 2) {
      const dx = (x - bx) / (brx + 0.5), dy = (y - by) / (bry + 0.5); if (dx * dx + dy * dy > 1) continue;
      if (((x + y) & 3) === 0) { P.on(x, y, tip); if (long) P.on(x - 1, y - 1, tip); }
    }
  }
  function spines(P, d, C, bx, by, brx, bry, hx, low, t) {
    const sc = C.spine || C.dark, tip = C.tip || '#ffffff', long = d.spines === 'porcupine';
    for (let a = 0.25; a < Math.PI * 0.98; a += 0.18) {
      const r = long ? 1.55 : 1.15, x0 = bx - Math.cos(a) * brx * 0.95, y0 = by - Math.sin(a) * bry * 0.9;
      const x1 = bx - Math.cos(a) * brx * (r + 0.1) - (long ? 1.2 : 0.6), y1 = by - Math.sin(a) * bry * r - 0.4;
      P.line(x0, y0, x1, y1, 1, sc); P.set(x1, y1, long ? tip : C.tip || tip);
    }
  }
  // ---------- 脸（侧脸偏 3/4：一只大眼睛 + 口鼻） ----------
  function face(P, b, p, d, C, hx, hy, hrx, hry, sx, sy, f, anim) {
    const eyes = p.eyes || 'open', look = p.look || [0, 0];
    const ex = hx + hrx * 0.28, ey = hy - hry * 0.18;
    // 眼睛：用原来那套表情（睁 / 闭 / 笑眼 / 困 / 星星眼…），朝向自动对上
    const ox = Math.round(P.X(ex)), oy = Math.round(ey);
    HP.drawEye(b, ox, oy, anim === 'sleep' ? 'closed' : eyes, [look[0] * f, look[1]], f < 0, C, C.base);
    if (p.blush) { P.on(ex + 1, ey + 3, '#ff8fa8'); P.on(ex + 2, ey + 3, '#ff8fa8'); }
    // 鼻子在口鼻最前端，嘴在下面
    const nx = sx + d.snout[0] * 0.8, ny = sy - d.snout[1] * 0.3;
    const nose = C.nose || K;
    if (d.pigNose) { P.ell(nx, ny + 0.6, 1.2, 1.6, nose); P.on(nx + 0.2, ny + 0.2, C.inner || K); P.on(nx + 0.2, ny + 1.2, C.inner || K); }
    else if (d.bigMouth) { P.on(nx, ny, nose); P.on(nx - 0.8, ny, nose); }
    else { P.on(nx, ny, nose); P.on(nx - 1, ny, nose); if (d.snout[1] > 2.4) P.on(nx, ny + 1, nose); }
    const my = sy + d.snout[1] * 0.4, mx = sx + d.snout[0] * 0.2;
    const m = p.mouth || 'w';
    if (m === 'open' || m === 'yawn') { P.on(mx, my, '#6e2434'); P.on(mx + 1, my, '#6e2434'); P.on(mx, my + 1, '#ff8fa0'); }
    else if (m === 'chew') { if (Math.floor((p.t || 0) * 10) % 2) { P.on(mx, my, K); P.on(mx + 1, my, K); } else P.on(mx + 1, my, K); }
    else if (m === 'tongue') { P.on(mx + 1, my, '#ff6f8a'); P.on(mx + 1, my + 1, '#ff8fa0'); }
    else if (m === 'smile') { P.on(mx - 1, my - 1, K); P.on(mx, my, K); P.on(mx + 1, my, K); }
    else if (m !== 'none') { P.on(mx, my, K); P.on(mx + 1, my - 0.2, K); }
  }

  PP.QUAD.draw = draw;
})();
