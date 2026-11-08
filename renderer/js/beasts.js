// 新伙伴：外形（挂在 sprites.js 的通用身体上，只画各自不一样的部分）+ 花色 + 物种资料
// 每个物种一组钩子：as（借用已有物种的画法）/ geo（调整比例）/ ears / back（身体后面）/ body / behindHead / head / coat（轮廓里的花纹）/ mouth / custom（完全自己画）
(function () {
  const PP = (window.PP = window.PP || {});
  const H = () => PP.SPR.HP;
  const X = {};
  const ear2 = (b, h, cx, cy, rx, ry, c1, c2) => { h.ell(b, cx, cy, rx, ry, c1); if (c2) h.ell(b, cx, cy + 0.4, rx * 0.5, ry * 0.5, c2); };
  // 侧面横着的耳朵（牛、鹿、羚羊、羊）
  const sideEars = (b, C, g, h, len = 3.4, up = 0) => {
    const { hx, hy, hrx } = g, dn = g.ear === 'down' || g.lie ? 1.2 : 0;
    h.ell(b, hx - hrx - 0.6, hy - 2.6 - up + dn, len, 1.5, C.base); h.ell(b, hx - hrx - 0.4, hy - 2.4 - up + dn, len * 0.55, 0.7, C.inner);
    h.ell(b, hx + hrx + 0.6, hy - 2.6 - up + dn, len, 1.5, C.base); h.ell(b, hx + hrx + 0.4, hy - 2.4 - up + dn, len * 0.55, 0.7, C.inner);
  };
  // 圆圆的小耳朵（猫科、熊、河马）
  const roundEars = (b, C, g, h, r = 2, dx = 5.6, dy = 5.6, inner = true) => {
    const { hx, hy } = g; ear2(b, h, hx - dx, hy - dy, r, r * 0.95, C.base, inner ? C.inner : null); ear2(b, h, hx + dx, hy - dy, r, r * 0.95, C.base, inner ? C.inner : null);
  };
  const bellyLight = (b, C, g, h, k = 1) => h.ell(b, g.bx + g.f * 0.4, g.by + 1.2, g.brx - 2.8 * k, g.bry - 2 * k, C.light, true);
  const muzzle = (b, C, g, h, w = 3.6, hh = 2.4, dy = 3.2, col) => h.ell(b, g.hx + g.f * 0.8, g.hy + dy, w, hh, col || C.light, true);
  const thinTail = (b, C, g, h, tuft) => {
    const side = -g.f, w = Math.sin(g.t * g.wag) + (g.sway || 0);
    if (g.tailMode === 'lie') { h.rect(b, Math.round(g.bx + side * 4), Math.round(g.by + 3), 7 * (side > 0 ? 1 : 1), 1, C.base); return; }
    const x0 = Math.round(g.bx + side * (g.brx - 0.5)), y0 = Math.round(g.by - 1);
    for (let k = 0; k < 6; k++) h.rect(b, x0 + side * Math.round(k * 0.6 + (k > 3 ? w * 0.5 : 0)), y0 + k, 1, 1, C.base);
    if (tuft) h.ell(b, x0 + side * (4 + w * 0.5), y0 + 6.5, 1.4, 1.8, tuft);
  };
  // 角：一根从头顶往上弯的线
  const horn = (b, h, x, y, dir, len, curl, col, ring) => {
    let cx = x, cy = y;
    for (let k = 0; k < len; k++) { h.rect(b, Math.round(cx), Math.round(cy), 1, 1, ring && k % 2 ? ring : col); h.rect(b, Math.round(cx) + (dir > 0 ? -1 : 1), Math.round(cy), k < len - 2 ? 1 : 0, 1, col); cy -= 1; cx += dir * curl * (k / len); }
  };

  // ---------- 大猫们 ----------
  X.lion = {
    geo(g) { g.hrx -= 0.4; },
    ears(b, C, g, h) { if (C.mane) roundEars(b, C, g, h, 1.8, 6.4, 7.4); else roundEars(b, C, g, h, 2.1, 5.6, 5.6); },
    behindHead(b, C, g, h, p) {
      if (!C.mane) return;
      const { hx, hy, hrx, hry, t } = g, sw = Math.sin(t * 1.3) * 0.3;
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, r = hrx + 2.6 + (k % 2) * 1.2; h.ell(b, hx + Math.cos(a) * r * 0.92 + sw, hy + 1 + Math.sin(a) * (hry + 2.4 + (k % 2)), 2.4, 2.4, k % 3 ? C.mane : C.mane2); }
      h.ell(b, hx, hy + 1, hrx + 2.6, hry + 2.8, C.mane);
    },
    tail(b, C, g, h) { thinTail(b, C, g, h, C.dark); },
    coat(b, C, g, h) { bellyLight(b, C, g, h); muzzle(b, C, g, h, 3.6, 2.4, 3.2); },
    mouth(b, p, g, h, mx, my) { h.rect(b, mx - 1, my - 1, 3, 1, p.pal.nose); b.set(mx, my, p.pal.nose); return false; },
  };
  X.tiger = {
    ears(b, C, g, h) { roundEars(b, C, g, h, 2.2, 5.8, 5.6); b.setOn && 0; },
    tail(b, C, g, h) {
      const side = -g.f, w = Math.sin(g.t * g.wag) + (g.sway || 0);
      if (g.tailMode === 'lie') { h.ell(b, g.bx + side * 4, g.by + 3.2, 7, 1.3, C.base); return; }
      const x0 = g.bx + side * (g.brx - 1);
      for (let k = 0; k < 9; k++) h.rect(b, Math.round(x0 + side * (2 + k * 0.5) + (k > 5 ? w * 0.4 * side : 0)), Math.round(g.by + 3 - k * 1.1), 2, 1, k === 8 ? C.dark : k % 3 === 1 ? C.dark : C.base);
    },
    coat(b, C, g, h) {
      const { hx, hy, hry, bx, by, bry, brx, f } = g, d = C.dark, fx = hx + f * 0.8;
      bellyLight(b, C, g, h);
      h.ell(b, fx - 3.6, hy + 2.6, 2.8, 2, C.light, true); h.ell(b, fx + 3.6, hy + 2.6, 2.8, 2, C.light, true); muzzle(b, C, g, h, 3, 2.2, 3.2);
      const top = Math.round(hy - hry + 1.2);
      for (const dx of [-2, 0, 2]) { b.setOn(fx + dx, top, d); b.setOn(fx + dx, top + 1, d); } b.setOn(fx, top + 2, d);
      for (const s of [-1, 1]) for (const yy of [-1, 1.2]) { const cx = Math.round(hx + s * (g.hrx - 1)); b.setOn(cx, hy + yy, d); b.setOn(cx - s, hy + yy, d); b.setOn(cx - 2 * s, hy + yy + 0.6, d); }
      if (!g.lie) for (let k = 0; k < 3; k++) { const yy = Math.round(by - bry + 1.8 + k * 2.2); for (const s of [-1, 1]) { const ex = Math.round(bx + s * (brx - 0.5)); b.setOn(ex, yy, d); b.setOn(ex - s, yy, d); b.setOn(ex - 2 * s, yy + 1, d); } }
      else for (let k = -3; k <= 3; k += 2) { const xx = Math.round(bx + k * 1.6); b.setOn(xx, by - bry + 1, d); b.setOn(xx, by - bry + 2, d); }
      // 耳背的白点
      b.setOn(hx - 5.6, hy - 5.8, C.light); b.setOn(hx + 5.6, hy - 5.8, C.light);
    },
    mouth: X.lion.mouth,
  };
  X.snowleopard = {
    ears(b, C, g, h) { roundEars(b, C, g, h, 1.9, 5.4, 5.4); },
    tail(b, C, g, h) {
      const side = -g.f, w = Math.sin(g.t * g.wag * 0.6) + (g.sway || 0);
      if (g.tailMode === 'lie') { h.ell(b, g.bx + side * 3.6, g.by + 2.8, 8, 2.2, C.base); return; }
      h.ell(b, g.bx + side * (g.brx + 1.5) + w * 0.4, g.by - 1.4, 2.4, 6, C.base);
      h.ell(b, g.bx + side * (g.brx + 1.8) + w * 0.6, g.by - 6.6, 2.2, 2, C.base);
    },
    coat(b, C, g, h) {
      const { hx, hy, bx, by, brx, bry } = g, d = C.dark;
      bellyLight(b, C, g, h); muzzle(b, C, g, h, 3.2, 2.2, 3.2);
      for (const [x, y] of [[-4.5, -3.5], [4.4, -3.2], [-6, 0.5], [6, 0.8], [0, -5]]) { b.setOn(hx + x, hy + y, d); b.setOn(hx + x + 1, hy + y, d); }
      for (const [x, y] of [[-brx + 1.5, -bry + 2], [brx - 1.5, -bry + 2.4], [-brx + 1, 0.6], [brx - 1.2, 1], [-2.4, -bry + 1.2], [2.6, -bry + 1.4]]) { const X0 = Math.round(bx + x), Y0 = Math.round(by + y); b.setOn(X0, Y0, d); b.setOn(X0 + 1, Y0, d); b.setOn(X0, Y0 + 1, d); }
    },
    mouth: X.lion.mouth,
  };
  X.polarbear = {
    geo(g) { g.hrx += 0.6; g.brx += 1; g.bry += 0.4; },
    ears(b, C, g, h) { roundEars(b, C, g, h, 2.3, 6, 6.4, true); },
    tail(b, C, g, h) { h.ell(b, g.bx - g.f * (g.brx - 0.4), g.by + 1, 1.6, 1.6, C.base); },
    coat(b, C, g, h) { muzzle(b, C, g, h, 3.4, 2.4, 3.2, C.light); },
    mouth(b, p, g, h, mx, my) { h.rect(b, mx - 1, my - 1, 3, 2, p.pal.nose); return false; },
  };

  // ---------- 狐狸家族（借用狐狸的画法） ----------
  X.arcticfox = { as: 'fox' };
  X.fennec = {
    as: 'fox',
    ears(b, C, g, h) {
      const { hx, hy, hrx } = g, dn = g.ear === 'down' ? 3 : g.ear === 'back' ? 1.6 : 0;
      for (const s of [-1, 1]) {
        h.poly(b, [[hx + s * (hrx - 2.6), hy - 2.4], [hx + s * (hrx + 3.6 + dn), hy - 13 + dn * 1.6], [hx + s * 1.6, hy - 5.4]], C.base);
        h.poly(b, [[hx + s * (hrx - 3.2), hy - 3.6], [hx + s * (hrx + 2.4 + dn), hy - 11.2 + dn * 1.6], [hx + s * 2.6, hy - 5.4]], C.inner);
      }
    },
  };

  // ---------- 有蹄子的 ----------
  X.zebra = {
    geo(g) { g.hry += 0.4; },
    ears(b, C, g, h) {
      const { hx, hy } = g, back = g.ear === 'back' || g.ear === 'down' ? 1.6 : 0;
      for (const s of [-1, 1]) { h.poly(b, [[hx + s * 2.4, hy - 5.2], [hx + s * (4.6 + back), hy - 12 + back * 2], [hx + s * 5.8, hy - 4.4]], C.base); h.poly(b, [[hx + s * 3.4, hy - 6], [hx + s * (4.6 + back), hy - 10 + back * 2], [hx + s * 5, hy - 5.4]], C.inner); }
    },
    behindHead(b, C, g, h) { const { hx, hy, hry } = g; for (let k = -2; k <= 2; k++) h.rect(b, Math.round(hx + k), Math.round(hy - hry - 2 + Math.abs(k) * 0.4), 1, 3, k % 2 ? C.dark : C.base); },
    tail(b, C, g, h) { thinTail(b, C, g, h, C.dark); },
    coat(b, C, g, h) {
      const { hx, hy, hry, bx, by, bry, brx, f } = g, d = C.dark;
      for (let yy = Math.round(hy - hry + 1.5); yy < hy - 1; yy += 2) for (let xx = -7; xx <= 7; xx++) if (Math.abs(xx) > 4 || yy < hy - hry + 3) b.setOn(hx + xx, yy + Math.round(Math.abs(xx) * 0.3), d);
      for (let xx = -Math.round(brx) + 1; xx < brx; xx += 2) for (let yy = Math.round(by - bry + 1); yy < by + bry - 1; yy++) if ((yy + Math.abs(xx)) % 5 !== 0) b.setOn(bx + xx, yy, d);
      h.ell(b, hx + f * 0.8, hy + 3.4, 3.6, 2.4, C.muzzle, true);
      b.setOn(hx + f * 0.8 - 1.6, hy + 2.6, '#000000'); b.setOn(hx + f * 0.8 + 1.6, hy + 2.6, '#000000');
    },
    mouth(b, p, g, h, mx, my) { b.set(mx - 1, my + 1, h.K); b.set(mx, my + 1, h.K); b.set(mx + 1, my + 1, h.K); return true; },
  };
  const hoofy = (extra) => Object.assign({
    ears(b, C, g, h) { sideEars(b, C, g, h, 3.2); },
    tail(b, C, g, h) { const side = -g.f; h.ell(b, g.bx + side * (g.brx - 0.3), g.by - 2.6 + Math.sin(g.t * 4) * 0.3, 1.4, 1.8, C.light); },
  }, extra);
  X.antelope = hoofy({
    behindHead(b, C, g, h) { const { hx, hy, hry } = g; horn(b, h, hx - 2.2, hy - hry + 1.2, -1, 8, 1.8, C.horn, C.dark); horn(b, h, hx + 2.2, hy - hry + 1.2, 1, 8, 1.8, C.horn, C.dark); },
    coat(b, C, g, h) {
      bellyLight(b, C, g, h); const { hx, hy, bx, by, brx, f } = g;
      h.ell(b, hx + f * 0.8, hy + 2.6, 2.2, 3.2, C.light, true);
      for (let xx = -Math.round(brx) + 1; xx < brx - 1; xx++) b.setOn(bx + xx, by + 0.4, C.dark);
    },
  });
  X.deer = hoofy({
    behindHead(b, C, g, h) {
      if (!C.antler) return; const { hx, hy, hry } = g;
      for (const s of [-1, 1]) { const x0 = hx + s * 2.6, y0 = hy - hry + 1; for (let k = 0; k < 5; k++) h.rect(b, Math.round(x0 + s * k * 0.5), Math.round(y0 - k), 1, 1, C.antler); h.rect(b, Math.round(x0 + s * 1.4), Math.round(y0 - 3), 1, 1, C.antler); h.rect(b, Math.round(x0 + s * 0.2) - (s < 0 ? 1 : 0), Math.round(y0 - 3), 1, 1, C.antler); h.rect(b, Math.round(x0 + s * 3), Math.round(y0 - 5), 1, 1, C.antler); }
    },
    coat(b, C, g, h) {
      bellyLight(b, C, g, h); muzzle(b, C, g, h, 2.6, 1.8, 3.6);
      const { bx, by, brx, bry } = g;
      if (C.spots) for (const [x, y] of [[-3, -2.4], [0, -3], [3, -2.2], [-1.6, -0.6], [1.8, -0.4], [-4, 0.6], [4, 0.8]]) b.setOn(bx + x * brx / 6, by + y * bry / 5.6, '#ffffff');
    },
  });
  X.cow = hoofy({
    geo(g) { g.hrx += 0.4; g.brx += 0.8; },
    ears(b, C, g, h) { sideEars(b, C, g, h, 3.4, 0.4); },
    behindHead(b, C, g, h) { const { hx, hy, hrx } = g; for (const s of [-1, 1]) { h.rect(b, Math.round(hx + s * (hrx - 2.5)) - (s < 0 ? 1 : 0), Math.round(hy - 7.6), 2, 2, C.horn); h.rect(b, Math.round(hx + s * (hrx - 1.5)) - (s < 0 ? 0 : 0), Math.round(hy - 8.6), 1, 1, C.horn); } },
    tail(b, C, g, h) { thinTail(b, C, g, h, C.dark); },
    coat(b, C, g, h) {
      const { hx, hy, bx, by, brx, bry } = g;
      if (C.patch) { h.ell(b, hx - 4.6, hy - 2.6, 2.8, 2.4, C.patch, true); h.ell(b, hx + 5.4, hy - 0.2, 1.8, 2, C.patch, true); h.ell(b, bx - brx + 2.4, by - 1, 2.6, 2.4, C.patch, true); h.ell(b, bx + brx - 2, by + 1.4, 2.2, 2, C.patch, true); h.ell(b, bx + 1, by - bry + 1.4, 1.6, 1.2, C.patch, true); }
      else bellyLight(b, C, g, h);
    },
    mouth(b, p, g, h, mx, my) {
      const C = p.pal; h.ell(b, mx + 0.5, my + 0.6, 4.4, 2.6, C.muzzle, true);
      b.set(mx - 2, my, '#a8606a'); b.set(mx + 2, my, '#a8606a');
      if (p.mouth === 'chew' && Math.floor((p.t || 0) * 8) % 2) h.rect(b, mx - 1, my + 2, 3, 1, h.K); else { b.set(mx - 1, my + 2, h.K); b.set(mx + 1, my + 2, h.K); }
      return true;
    },
  });
  X.yak = hoofy({
    geo(g) { g.brx += 1.4; g.bry += 0.6; g.hrx += 0.4; },
    ears(b, C, g, h) { sideEars(b, C, g, h, 2.4, -0.6); },
    behindHead(b, C, g, h) { const { hx, hy, hrx } = g; for (const s of [-1, 1]) { const x0 = hx + s * (hrx - 1); for (let k = 0; k < 6; k++) h.rect(b, Math.round(x0 + s * Math.min(k, 3)), Math.round(hy - 4 - Math.max(0, k - 2) * 1.2), 2, 1, C.horn); } },
    body(b, C, g, h) {
      const { bx, by, brx, bry } = g;
      for (let x = Math.round(bx - brx - 1); x <= bx + brx + 1; x++) { const len = 3 + ((x * 7) % 3); h.rect(b, x, Math.round(by + bry - 2), 1, len, x % 2 ? C.base : C.dark); }
    },
    head(b, C, g, h) { const { hx, hy, hry } = g; for (let k = -4; k <= 4; k++) h.rect(b, Math.round(hx + k), Math.round(hy - hry), 1, 2 + ((k * 5) & 1) + (Math.abs(k) < 2 ? 1 : 0), k % 2 ? C.base : C.dark); },
    coat(b, C, g, h) { muzzle(b, C, g, h, 3.4, 2.2, 3.4, C.light); },
    tail(b, C, g, h) { thinTail(b, C, g, h, C.dark); },
  });
  X.alpaca = {
    geo(g) { if (!g.lie) { g.hy -= 2.6; } g.hrx -= 1.4; g.hry -= 0.2; },
    ears(b, C, g, h) {
      const { hx, hy } = g, bk = g.ear === 'back' || g.ear === 'down' ? 1.4 : 0;
      for (const s of [-1, 1]) { h.ell(b, hx + s * (3.8 + bk), hy - 7.6 + bk, 1.3, 3, C.base); h.ell(b, hx + s * (3.8 + bk), hy - 7.2 + bk, 0.5, 1.8, C.inner); }
    },
    back(b, C, g, h) { if (!g.lie) h.rect(b, Math.round(g.hx - 3), Math.round(g.hy + 2), 6, Math.max(1, Math.round(g.by - g.bry - g.hy)), C.base); },
    head(b, C, g, h) { const { hx, hy, hry } = g; for (const [x, y, r] of [[-3, -1, 2], [0, -1.8, 2.4], [3, -1, 2], [-1.6, 0.6, 1.8], [1.6, 0.6, 1.8]]) h.ell(b, hx + x, hy - hry + y, r, r * 0.85, C.light); },
    body(b, C, g, h) { const { bx, by, brx, bry } = g; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; h.ell(b, bx + Math.cos(a) * (brx - 0.4), by + Math.sin(a) * (bry - 0.6), 2, 1.8, C.base); } },
    tail(b, C, g, h) { h.ell(b, g.bx - g.f * (g.brx + 0.2), g.by - 2, 1.6, 2, C.base); },
    coat(b, C, g, h) { const { bx, by, brx, bry } = g; for (let y = Math.round(by - bry); y < by + bry; y += 2) for (let x = Math.round(bx - brx); x < bx + brx; x += 3) b.setOn(x + (y % 4 ? 1 : 0), y, C.dark); muzzle(b, C, g, h, 2.6, 1.8, 3, C.light); },
  };
  X.sheep = {
    geo(g) { g.hrx -= 1.6; g.hry -= 0.4; g.brx += 1.6; g.bry += 0.6; },
    ears(b, C, g, h) { const { hx, hy, hrx } = g, dn = g.lie || g.ear === 'down' ? 1 : 0; for (const s of [-1, 1]) h.ell(b, hx + s * (hrx + 1.6), hy - 1.6 + dn, 2.4, 1.2, C.base); },
    body(b, C, g, h) { const { bx, by, brx, bry } = g; h.ell(b, bx, by - 0.4, brx + 0.6, bry + 0.4, C.wool); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; h.ell(b, bx + Math.cos(a) * (brx + 0.2), by - 0.4 + Math.sin(a) * (bry + 0.2), 2, 1.8, C.wool); } },
    head(b, C, g, h) { const { hx, hy, hry } = g; for (const [x, y, r] of [[-3.4, 0, 2.2], [0, -0.8, 2.6], [3.4, 0, 2.2]]) h.ell(b, hx + x, hy - hry + y, r, r * 0.8, C.wool); },
    tail(b, C, g, h) { h.ell(b, g.bx - g.f * (g.brx + 1.6), g.by - 1, 1.6, 1.6, C.wool); },
    coat(b, C, g, h) { const { bx, by, brx, bry } = g; for (let k = 0; k < 9; k++) b.setOn(bx - brx + 1.5 + k * (brx * 2 - 3) / 8, by - bry + 1.4 + (k % 3), C.woolShade); },
  };
  X.hippo = {
    geo(g) { g.hrx += 1.4; g.hry += 0.6; g.hy += 0.8; g.brx += 1.2; g.bry += 0.4; },
    ears(b, C, g, h) { roundEars(b, C, g, h, 1.3, 5.6, 6.8); },
    coat(b, C, g, h) { bellyLight(b, C, g, h); },
    mouth(b, p, g, h, mx, my) {
      const C = p.pal; h.ell(b, mx + 0.5, my + 1.2, 5.6, 3.2, C.muzzle, true);
      b.set(mx - 2, my - 0.6, C.dark); b.set(mx + 3, my - 0.6, C.dark);
      if (p.mouth === 'open' || p.mouth === 'yawn') { h.rect(b, mx - 3, my + 2, 8, 2, '#6e2434'); b.set(mx - 2, my + 2, '#ffffff'); b.set(mx + 3, my + 2, '#ffffff'); }
      else { h.rect(b, mx - 2, my + 2, 6, 1, h.K); }
      return true;
    },
    tail(b, C, g, h) { const side = -g.f; h.rect(b, Math.round(g.bx + side * (g.brx - 0.3)), Math.round(g.by - 1), 1, 3, C.base); },
  };
  // 骆驼：侧面站着——长腿、驼峰、往前伸的长脖子和长嘴巴，一眼就认得出来
  X.camel = {
    custom(b, p, g, h) {
      const C = p.pal, f = g.f, t = g.t, anim = g.anim, lie = anim === 'sleep' || anim === 'lie';
      const walk = ['walk', 'run'].includes(anim), st = walk ? Math.floor(t * (anim === 'run' ? 10 : 6)) % 2 : 0;
      const cx = 15 - f * 1, cy = lie ? 24 : 18.6 + (anim === 'jump' ? -2 : 0);
      const leg = (x, ph) => { const lift = walk && ph === st ? 1 : 0; h.rect(b, Math.round(x), Math.round(cy + 2), 2, Math.max(1, 29 - Math.round(cy + 2) - lift), C.base); h.rect(b, Math.round(x), 29 - lift, 2, 1, C.dark); h.rect(b, Math.round(x), Math.round(cy + 6), 2, 1, C.dark); };
      // 尾巴
      const tx = cx - f * 8.4; for (let k = 0; k < 5; k++) b.set(Math.round(tx - f * (k > 2 ? 1 : 0)), Math.round(cy - 1 + k), C.dark);
      if (!lie) { leg(cx - f * 6, 0); leg(cx + f * 4, 1); }
      h.ell(b, cx, cy, 8.4, lie ? 3.8 : 4.6, C.base);
      if (!lie) { leg(cx - f * 4.4 - (f > 0 ? 0 : 1), 1); leg(cx + f * 5.6 - (f > 0 ? 1 : 0), 0); }
      else { h.ell(b, cx - f * 4, cy + 3, 3, 1.4, C.base); h.ell(b, cx + f * 4, cy + 3, 3, 1.4, C.base); }
      // 驼峰（一个或两个）
      if (C.humps === 2) { h.ell(b, cx - f * 3.4, cy - 4, 3.2, 3.4, C.base); h.ell(b, cx + f * 2.2, cy - 4, 3, 3.2, C.base); h.ell(b, cx - f * 3.4, cy - 6.2, 2, 1, C.light, true); h.ell(b, cx + f * 2.2, cy - 6.2, 1.8, 1, C.light, true); }
      else { h.ell(b, cx - f * 0.6, cy - 4.4, 4.4, 4, C.base); h.ell(b, cx - f * 1.2, cy - 6.8, 2.6, 1.2, C.light, true); }
      // 脖子：从胸前弯上去，再往前伸
      const nx0 = cx + f * 6.4, ny0 = cy - 1.6, hx = cx + f * (lie ? 10.6 : 10), hy = lie ? cy - 9 : cy - 10.6;
      for (let k = 0; k <= 8; k++) { const a = k / 8, x = nx0 + (hx - f * 1.2 - nx0) * Math.pow(a, 1.4), y = ny0 + (hy + 1.4 - ny0) * a; h.ell(b, x, y, 1.9, 1.9, C.base); }
      h.ell(b, hx, hy, 3.6, 3, C.base);
      h.ell(b, hx + f * 3.6, hy + 1.2, 2.6, 2, C.light);
      // 小耳朵
      h.rect(b, Math.round(hx - f * 2.4) - (f > 0 ? 1 : 0), Math.round(hy - 3.6), 1, 2, C.dark);
      g.hx = hx; g.hy = hy;
      p.__geo = { kind: 'camel', hx, hy, f, lie, hatX: hx, hatY: hy - 2 };
    },
    face(b, p, g, h) {
      const C = p.pal, q = p.__geo, eyes = p.eyes || 'open', f = q.f;
      const ex = Math.round(q.hx + f * 0.6), ey = Math.round(q.hy - 0.6);
      const closed = ['closed', 'sleepy', 'happy'].includes(eyes);
      if (closed) { b.set(ex - 1, ey, h.K); b.set(ex, ey + (eyes === 'happy' ? -1 : 0), h.K); b.set(ex + 1, ey, h.K); }
      else { h.rect(b, ex - 1, ey - 1, 2, 3, h.K); b.set(ex - (f > 0 ? 1 : 0), ey - 1, '#ffffff'); h.rect(b, ex - 1, ey - 2, 3, 1, C.dark); }
      // 长睫毛
      b.set(ex + f * 2, ey - 2, h.K);
      const mx = Math.round(q.hx + f * 5.2), my = Math.round(q.hy + 1.4);
      b.set(mx, my - 1, C.dark); // 鼻孔
      if (p.mouth === 'chew' && Math.floor((p.t || 0) * 8) % 2) h.rect(b, mx - f * 2, my + 1, 2, 1, h.K); else b.set(mx - f, my + 1, h.K);
      return true;
    },
  };
  X.monkey = {
    ears(b, C, g, h) { const { hx, hy, hrx } = g; for (const s of [-1, 1]) ear2(b, h, hx + s * (hrx + 0.8), hy, 2, 2.4, C.base, C.inner); },
    tail(b, C, g, h) {
      const side = -g.f, w = Math.sin(g.t * 2) * 0.6;
      if (g.tailMode === 'lie') { h.ell(b, g.bx + side * 5, g.by + 3, 6, 1, C.base); return; }
      const x0 = g.bx + side * (g.brx - 1);
      for (let k = 0; k < 10; k++) h.rect(b, Math.round(x0 + side * (1 + k * 0.4)), Math.round(g.by + 2 - k * 1.1), 1, 1, C.base);
      for (let a = 0; a < 5; a++) h.rect(b, Math.round(x0 + side * (5 + Math.cos(a * 1.2) * 1.6 + w)), Math.round(g.by - 9 - Math.sin(a * 1.2) * 1.6), 1, 1, C.base);
    },
    coat(b, C, g, h) {
      const { hx, hy, f } = g, fx = hx + f * 0.8;
      h.ell(b, fx - 2.4, hy - 0.2, 3, 3.2, C.light, true); h.ell(b, fx + 2.4, hy - 0.2, 3, 3.2, C.light, true); h.ell(b, fx, hy + 2.6, 4.4, 2.8, C.light, true);
      bellyLight(b, C, g, h, 1.2);
    },
  };
  X.meerkat = {
    geo(g) { if (!g.lie) { g.hy -= 1.4; g.by -= 0.8; g.bry += 1; } g.hrx -= 1.6; g.hry -= 0.6; g.brx -= 1.2; },
    ears(b, C, g, h) { const { hx, hy, hrx } = g; for (const s of [-1, 1]) h.ell(b, hx + s * (hrx - 0.4), hy - 2.8, 1.2, 1.4, C.dark); },
    tail(b, C, g, h) { const side = -g.f; if (g.tailMode === 'lie') { h.rect(b, Math.round(g.bx + side * 4), Math.round(g.by + 3), 6, 1, C.base); return; } const x0 = Math.round(g.bx + side * (g.brx + 0.5)); for (let k = 0; k < 7; k++) h.rect(b, x0 + side * Math.round(k * 0.3), Math.round(g.by + 4 - k), 1, 1, k > 5 ? C.dark : C.base); },
    coat(b, C, g, h) { bellyLight(b, C, g, h, 0.9); const { hx, hy, f } = g, fx = Math.round(hx + f * 0.8); for (const s of [-1, 1]) h.ell(b, fx + s * 3.4, hy - 0.2, 1.8, 1.6, C.dark, true); muzzle(b, C, g, h, 2, 1.6, 3); },
  };

  // ---------- 完全自己画的 ----------
  // 海豹：一个圆滚滚的灰色团子，前鳍拍拍，后鳍在后面
  X.seal = {
    custom(b, p, g, h) {
      const C = p.pal, f = g.f, t = g.t, anim = g.anim, lie = anim === 'sleep' || anim === 'lie';
      let [cy, ry, rx] = h.blobFit(g, p, lie ? 23.6 : 21.4, lie ? 5.6 : 7.2, lie ? 11 : 9.4);
      const cx = 16 + (g.jsk || 0) * 0.5, flap = ['walk', 'run'].includes(anim) ? Math.floor(t * 6) % 2 : 0;
      h.ell(b, cx - f * (rx + 1), cy + ry - 1.6, 3, 1.4, C.dark);
      h.ell(b, cx - rx + 1, cy + 3 - flap, 1.6, 3, C.dark); h.ell(b, cx + rx - 1, cy + 3 - (1 - flap), 1.6, 3, C.dark);
      h.ell(b, cx, cy, rx, ry, C.base);
      g.hx = cx + f * 0.6; g.hy = cy - ry * 0.4; g.hrx = rx - 1; g.hry = 4;
      p.__geo = { kind: 'seal', cx, cy, rx, ry, hatX: cx, hatY: cy - ry + 5.5 };
    },
    face(b, p, g, h) {
      const C = p.pal, q = p.__geo, lx = h.lookX(p), eyes = p.eyes || 'open', look = p.look || [0, 0];
      h.ell(b, q.cx, q.cy + 2.4, q.rx - 3, q.ry - 2.6, C.light, true);
      for (const [x, y] of [[-3, -2], [3.4, -3], [-5, 1.4], [5, 2]]) b.setOn(q.cx + x, q.cy + y, C.dark);
      const ey = Math.round(g.hy), mx = Math.round(g.hx) + lx;
      h.drawEye(b, mx - 3, ey, eyes, look, true, C, C.base); h.drawEye(b, mx + 3, ey, eyes, look, false, C, C.base);
      b.set(mx, ey + 2, C.nose); b.set(mx - 1, ey + 2, C.nose); b.set(mx, ey + 3, h.K);
      for (const s of [-1, 1]) for (const dy of [2, 3]) { b.setOn(mx + s * 2, ey + dy, '#ffffff'); b.setOn(mx + s * 3, ey + dy + (dy === 3 ? 0 : -0), '#ffffff'); }
      return true;
    },
  };
  // 鸟：借用小鸡的脸（眼睛 + 小嘴），身体自己画（翅膀、尾巴）
  function bird(opt) {
    return {
      custom(b, p, g, h) {
        const C = p.pal, f = g.f, t = g.t, anim = g.anim, lie = anim === 'sleep' || anim === 'lie';
        let [cy, ry, rx] = h.blobFit(g, p, lie ? 22.6 : 20.4, lie ? 6.4 : 7.6, lie ? 8.6 : 7.4);
        const cx = 16 + (g.jsk || 0) * 0.5, fly = ['jump', 'fall'].includes(anim) || p.struggle || p.flying;
        const flap = fly || ['walk', 'run', 'dance'].includes(anim) ? Math.floor(t * 10) % 2 : 0;
        // 尾羽
        const side = -f;
        for (let k = 0; k < opt.tail; k++) h.rect(b, Math.round(cx + side * (rx - 2 + k * 0.6)), Math.round(cy + ry - 3 + k), 2, 1, k % 2 ? C.tail || C.dark : C.tail2 || C.tail || C.dark);
        // 翅膀
        if (fly) { h.poly(b, [[cx - rx + 1, cy - 1], [cx - rx - 6, cy - 6 + flap * 5], [cx - rx + 1, cy + 3]], C.dark); h.poly(b, [[cx + rx - 1, cy - 1], [cx + rx + 6, cy - 6 + flap * 5], [cx + rx - 1, cy + 3]], C.dark); }
        h.ell(b, cx, cy, rx, ry, C.base);
        if (opt.wing && !fly) for (const sd of [-1, 1]) h.ell(b, cx + sd * (rx - 1.4), cy + 1.2, 2.4, ry * 0.62, C.wing || C.dark, true);
        if (opt.crest) for (let k = 0; k < 3; k++) h.rect(b, Math.round(cx - 1 + k), Math.round(cy - ry - 1 - (k === 1 ? 1 : 0)), 1, 2, C.crest || C.base);
        if (!lie) { const fy = Math.round(Math.min(cy + ry + 1, 28)); h.rect(b, Math.round(cx - 3), fy - 1, 1, 2, C.paw); h.rect(b, Math.round(cx - 4), fy + 1, 3, 1, C.paw); h.rect(b, Math.round(cx + 2), fy - 1, 1, 2, C.paw); h.rect(b, Math.round(cx + 1), fy + 1, 3, 1, C.paw); }
        p.__geo = { kind: 'chick', cx, cy, rx, ry, hx: cx + f * 0.6, hy: cy - 1.8, lie, hatX: cx, hatY: cy - ry + 5 };
      },
    };
  }
  X.seagull = bird({ tail: 3, wing: true });
  X.parrot = bird({ tail: 6, crest: true });
  // 花园鳗：从沙子的小洞里探出细细的身体，随水流左右摆
  // 花园鳗：从沙洞里探出一截弯弯的身子，脸朝着水流，随水摇摆；睡觉 / 害羞时缩回洞里只露个头
  X.gardeneel = {
    custom(b, p, g, h) {
      const C = p.pal, t = g.t, anim = g.anim, f = g.f, lie = anim === 'sleep' || anim === 'lie';
      const len = lie ? 4 : anim === 'held' ? 22 : anim === 'eat' ? 17 : 15 + Math.sin(t * 0.7) * 1.2;
      const base = 29, pts = [];
      for (let k = 0; k <= len; k += 0.5) {
        const a = k / len, sw = Math.sin(t * 1.7 - k * 0.22) * a * (lie ? 0.4 : 2.2);
        // 上半截向着脸的方向弯（问号形）
        const lean = Math.pow(a, 2.2) * (anim === 'eat' ? 6 : 3.6) * f;
        pts.push([16 + sw + lean, base - k + Math.pow(a, 3) * 2.2]);
      }
      // 沙洞
      h.ell(b, 16, base + 0.8, 5.2, 1.6, C.sand); h.ell(b, 16, base + 0.9, 3, 0.9, C.sandDark);
      // 身体：越往上越细一点
      pts.forEach(([x, y], i) => { const a = i / (pts.length - 1); h.ell(b, x, y, 1.9 - a * 0.3, 1, C.base); });
      const [hx0, hy0] = pts[pts.length - 1], hx = hx0 + f * 1.2, hy = hy0 - 0.4;
      h.ell(b, hx, hy, 2.8, 2.2, C.base); h.ell(b, hx + f * 2.2, hy + 0.6, 1.6, 1.2, C.base);
      // 斑点
      pts.forEach(([x, y], i) => { if (i % 5 === 2 && i > 3) b.setOn(Math.round(x + ((i * 3) % 2 ? 0.6 : -0.6)), Math.round(y), C.dark); });
      h.ell(b, 16, base + 1.2, 2.6, 0.7, C.sandDark);
      g.hx = hx; g.hy = hy;
      p.__geo = { kind: 'eel', hx, hy, f, hatX: hx, hatY: hy + 3 };
    },
    face(b, p, g, h) {
      const q = p.__geo, f = q.f || 1, ex = Math.round(q.hx + f * 0.6), ey = Math.round(q.hy - 0.6), closed = ['closed', 'sleepy', 'happy'].includes(p.eyes) || g.anim === 'sleep';
      if (closed) { b.set(ex - 1, ey, h.K); b.set(ex, ey + 0.4, h.K); b.set(ex + 1, ey, h.K); }
      else { h.rect(b, ex - 1, ey - 1, 3, 3, '#ffffff'); h.rect(b, ex - (f > 0 ? 0 : 1), ey - 1, 2, 2, h.K); b.set(ex + (f > 0 ? 1 : -1), ey - 1, '#ffffff'); }
      const mx = Math.round(q.hx + f * 3.4), my = Math.round(q.hy + 1.2);
      b.set(mx, my, p.mouth === 'open' || p.mouth === 'chew' ? '#6e2434' : h.K); b.set(mx - f, my, h.K);
      return true;
    },
  };
  // 鲨鱼：圆滚滚的灰团子，头顶一片背鳍，浮在水里上下飘
  X.shark = {
    custom(b, p, g, h) {
      const C = p.pal, f = g.f, t = g.t, anim = g.anim, lie = anim === 'sleep' || anim === 'lie';
      const bob = anim === 'held' ? 0 : Math.round(Math.sin(t * 1.6) * 1.2) - 2;
      let [cy, ry, rx] = h.blobFit(g, p, (lie ? 22 : 18.4) + bob, lie ? 6.4 : 7.6, lie ? 11 : 10);
      const cx = 16 + (g.jsk || 0) * 0.5, side = -f, sw = Math.sin(t * 3) * 1.2;
      // 尾鳍
      h.poly(b, [[cx + side * (rx - 2), cy + 1], [cx + side * (rx + 5), cy - 4 + sw], [cx + side * (rx + 3.4), cy + 2], [cx + side * (rx + 5), cy + 6 + sw]], C.dark);
      // 胸鳍
      h.poly(b, [[cx - rx + 2, cy + 2], [cx - rx - 3, cy + 6], [cx - rx + 3, cy + 5]], C.dark); h.poly(b, [[cx + rx - 2, cy + 2], [cx + rx + 3, cy + 6], [cx + rx - 3, cy + 5]], C.dark);
      // 背鳍
      h.poly(b, [[cx - 2.6 - f, cy - ry + 1.6], [cx + side * 1.4, cy - ry - 5], [cx + 2.6 - f, cy - ry + 1.4]], C.dark);
      h.ell(b, cx, cy, rx, ry, C.base);
      g.hx = cx + f * 0.8; g.hy = cy - 1.4;
      p.__geo = { kind: 'shark', cx, cy, rx, ry, hatX: cx, hatY: cy - ry + 4 };
    },
    face(b, p, g, h) {
      const C = p.pal, q = p.__geo, lx = h.lookX(p), eyes = p.eyes || 'open', look = p.look || [0, 0];
      h.ell(b, q.cx, q.cy + 3, q.rx - 2.6, q.ry - 3.2, C.light, true);
      const ey = Math.round(g.hy), mx = Math.round(g.hx) + lx;
      h.drawEye(b, mx - 4, ey, eyes, look, true, C, C.base); h.drawEye(b, mx + 4, ey, eyes, look, false, C, C.base);
      const my = ey + 3;
      if (p.mouth === 'open' || p.mouth === 'yawn') { h.rect(b, mx - 3, my, 7, 2, '#6e2434'); for (let x = -3; x <= 3; x += 2) b.set(mx + x, my, '#ffffff'); }
      else { for (let x = -3; x <= 3; x++) b.set(mx + x, my + (Math.abs(x) === 3 ? -1 : 0), h.K); b.set(mx - 1, my + 1, '#ffffff'); b.set(mx + 1, my + 1, '#ffffff'); }
      for (const s of [-1, 1]) { b.setOn(mx + s * 6, ey + 1, C.dark); b.setOn(mx + s * 6, ey + 2, C.dark); }
      return true;
    },
  };

  // ---------- 新来的：借用相近的画法 ----------
  X.arctichare = { as: 'rabbit' };
  X.marmot = { as: 'hamster', geo(g) { if (!g.lie) { g.hy -= 1.2; g.by -= 0.4; g.bry += 0.8; } } };
  // 豪猪：刺猬的身体，背上竖着又长又粗的黑白长刺
  X.porcupine = { as: 'hedgehog' };
  X.brownbear = X.polarbear;
  X.albatross = bird({ tail: 3, wing: true });
  // 海獭：小圆耳朵、白白的脸、粗尾巴
  X.otter = {
    geo(g) { g.hrx -= 0.4; },
    ears(b, C, g, h) { roundEars(b, C, g, h, 1.4, 6, 4.6, false); },
    tail(b, C, g, h) { const side = -g.f; if (g.tailMode === 'lie') { h.ell(b, g.bx + side * 6, g.by + 3, 5, 1.4, C.base); return; } h.ell(b, g.bx + side * (g.brx + 2), g.by + 2.4, 4, 1.8, C.base); },
    coat(b, C, g, h) { const { hx, hy, f } = g; h.ell(b, hx + f * 0.6, hy + 1.4, g.hrx - 1.6, g.hry - 1.8, C.light, true); bellyLight(b, C, g, h, 0.8); for (const s2 of [-1, 1]) { b.setOn(hx + f * 0.8 + s2 * 4, hy + 3, C.dark); b.setOn(hx + f * 0.8 + s2 * 5, hy + 3.6, C.dark); } },
  };
  // 蝙蝠：一团小毛球 + 两只尖耳朵；飞的时候张开翅膀，在家里倒挂着、用翅膀裹住自己
  X.bat = {
    custom(b, p, g, h) {
      const C = p.pal, t = g.t, anim = g.anim, hang = !p.held && (p.hang || anim === 'hang' || !!(p.surf && p.surf.perch));
      const fly = !hang && (['jump', 'fall', 'walk', 'run'].includes(anim) || p.struggle || p.flying);
      const flap = Math.floor(t * 12) % 2;
      const cx = 16, cy = hang ? 12 : fly ? 17 + flap : 22, rx = 5.6, ry = 5.4;
      if (fly) {
        for (const s2 of [-1, 1]) { h.poly(b, [[cx + s2 * 3, cy - 2], [cx + s2 * 14, cy - 6 + flap * 6], [cx + s2 * 12, cy + 2 + flap * 3], [cx + s2 * 8, cy + 1], [cx + s2 * 5, cy + 3]], C.wing); for (let k = 0; k < 3; k++) h.rect(b, Math.round(cx + s2 * (5 + k * 3)), Math.round(cy - 2 + (flap ? k : -k) * 0.6), 1, 3, C.dark); }
      } else {
        // 收起来的翅膀裹在身体两边
        h.ell(b, cx - rx + 0.6, cy + 0.6, 2.2, ry, C.wing); h.ell(b, cx + rx - 0.6, cy + 0.6, 2.2, ry, C.wing);
      }
      h.ell(b, cx, cy, rx, ry, C.base);
      const ed = hang ? 1 : -1; // 倒挂时耳朵朝下
      for (const s2 of [-1, 1]) { h.poly(b, [[cx + s2 * 1.2, cy + ed * 3.6], [cx + s2 * 5, cy + ed * 10], [cx + s2 * 5.2, cy + ed * 2.4]], C.base); h.poly(b, [[cx + s2 * 2.4, cy + ed * 4], [cx + s2 * 4.6, cy + ed * 8.4], [cx + s2 * 4.6, cy + ed * 3.6]], C.inner); }
      if (hang) { h.rect(b, cx - 2, cy - ry - 3, 1, 3, C.dark); h.rect(b, cx + 1, cy - ry - 3, 1, 3, C.dark); }
      g.hx = cx; g.hy = cy + (hang ? 1 : -0.6);
      p.__geo = { kind: 'bat', cx, cy, rx, ry, hang, hatX: cx, hatY: hang ? cy + ry : cy - ry + 3 };
    },
    face(b, p, g, h) {
      const C = p.pal, q = p.__geo, eyes = p.eyes || 'open', look = p.look || [0, 0], ey = Math.round(g.hy), mx = Math.round(g.hx);
      h.drawEye(b, mx - 2, ey, eyes, look, true, C, C.base); h.drawEye(b, mx + 2, ey, eyes, look, false, C, C.base);
      const my = q.hang ? ey - 2 : ey + 2; b.set(mx, my, C.nose); b.set(mx + 1, my + (q.hang ? -1 : 1), '#ffffff');
      return true;
    },
  };

  PP.BEASTS = X;

  // ---------- 花色 ----------
  const P = (o) => Object.assign({ inner: '#f2a0a8', nose: '#3a2a2a', paw: o.base }, o);
  Object.assign(PP.SPR.PAL, {
    arctichare: { white: P({ base: '#f6f8fb', dark: '#c8d0dc', light: '#ffffff', paw: '#ffffff', inner: '#2a2a32', nose: '#e8a0ac', pattern: 'solid', name: '北极兔' }), shiny: P({ base: '#e8f4ff', dark: '#a8c8e8', light: '#ffffff', paw: '#ffffff', inner: '#7ab8e8', nose: '#e8a0c0', pattern: 'solid', name: '冰晶兔' }) },
    marmot: { brown: P({ base: '#a8804e', dark: '#6a4a2a', light: '#e8d0a8', paw: '#5a3a24', inner: '#c8907a', nose: '#3a2a1a', pattern: 'bib', name: '土拨鼠' }), shiny: P({ base: '#e8c8f0', dark: '#a880b8', light: '#fff4ff', paw: '#a880b8', inner: '#f0a8c8', nose: '#6a3a6a', pattern: 'bib', name: '香芋土拨鼠' }) },
    porcupine: { crested: P({ base: '#b0988a', dark: '#231c20', light: '#e0d0c4', spine: '#2a2420', tip: '#f4f0e8', paw: '#5a4a42', inner: '#c89090', nose: '#231c20', name: '豪猪' }), shiny: P({ base: '#d8c8f0', dark: '#1a1430', light: '#f4f0ff', spine: '#4a3a8a', tip: '#ffd84a', paw: '#8a7ab8', inner: '#e8a0c8', nose: '#1a1430', name: '金刺豪猪' }) },
    brownbear: { brown: P({ base: '#8a5a34', dark: '#5a3a22', light: '#c89a6a', paw: '#5a3a22', inner: '#a87050', nose: '#231c20', name: '棕熊' }), honey: P({ base: '#b8804a', dark: '#7a5030', light: '#e0b884', paw: '#7a5030', inner: '#c8906a', nose: '#231c20', name: '蜂蜜熊' }), shiny: P({ base: '#d8d8e0', dark: '#8a8a98', light: '#ffffff', paw: '#8a8a98', inner: '#e8b8c8', nose: '#3a3a48', name: '银熊' }) },
    albatross: { wandering: P({ base: '#fbfaf6', wing: '#4a4a52', dark: '#4a4a52', light: '#ffffff', paw: '#f0b8b0', nose: '#f0c8a0', tail: '#4a4a52', tail2: '#fbfaf6', name: '信天翁' }), shiny: P({ base: '#fff0d0', dark: '#8a6a3a', light: '#ffffff', paw: '#f0b8b0', nose: '#ffa860', tail: '#8a6a3a', name: '金翅信天翁' }) },
    otter: { sea: P({ base: '#7a5a42', dark: '#4a3424', light: '#e8dccb', paw: '#4a3424', inner: '#a87a60', nose: '#231c20', name: '海獭' }), shiny: P({ base: '#c8e0d8', dark: '#6a8a80', light: '#ffffff', paw: '#6a8a80', inner: '#e0b8c0', nose: '#2a3a36', name: '薄荷海獭' }) },
    bat: { brown: P({ base: '#6a5048', dark: '#2a1e1c', light: '#a88a7a', wing: '#3a2a2a', inner: '#c89090', nose: '#e8a0a8', name: '小蝙蝠' }), fruit: P({ base: '#c8783a', dark: '#4a2a1a', light: '#f0b878', wing: '#5a3424', inner: '#e0a080', nose: '#3a2018', name: '果蝠' }), shiny: P({ base: '#b8a8f0', dark: '#3a2a6a', light: '#e8e0ff', wing: '#5a4a9a', inner: '#f0b8e0', nose: '#ff9ac8', name: '星光蝙蝠' }) },
    lion: { male: P({ base: '#e0a85a', dark: '#6a3a1a', light: '#f8e2b8', paw: '#d89a4e', inner: '#c8784a', nose: '#5a3020', mane: '#a8582a', mane2: '#c8743a', name: '雄狮' }), lioness: P({ base: '#e4b46a', dark: '#6a3a1a', light: '#faead0', paw: '#dca45a', inner: '#c8784a', nose: '#5a3020', name: '母狮' }), shiny: P({ base: '#f4f0e6', dark: '#8a7a6a', light: '#ffffff', inner: '#f0b0a8', nose: '#6a4a3a', mane: '#e8d8b0', mane2: '#fff2d0', name: '白狮' }) },
    tiger: { bengal: P({ base: '#f0903a', dark: '#2a1a14', light: '#fff4e4', paw: '#f0a050', inner: '#f2b0a0', nose: '#d86a6a', name: '孟加拉虎' }), white: P({ base: '#f2f0ea', dark: '#3a3438', light: '#ffffff', paw: '#e8e6e0', inner: '#f2b8c0', nose: '#e08a9a', name: '白虎' }), shiny: P({ base: '#ffd84a', dark: '#6a3a10', light: '#fff8d0', inner: '#ffb0a0', nose: '#d86a6a', name: '金虎' }) },
    snowleopard: { snow: P({ base: '#d8d6cc', dark: '#4a4a52', light: '#f6f6f0', paw: '#e0ded4', inner: '#e8b8c0', nose: '#c88a9a', name: '雪豹' }), shiny: P({ base: '#c8d8ff', dark: '#4a5aa8', light: '#f0f4ff', inner: '#e8b8e0', nose: '#a88ad0', name: '星豹' }) },
    polarbear: { white: P({ base: '#f4f2ea', dark: '#c8c4b4', light: '#ffffff', paw: '#e8e4d8', inner: '#d8d0c0', nose: '#231c20', name: '北极熊' }), shiny: P({ base: '#ffe8f0', dark: '#e0a8c0', light: '#ffffff', inner: '#f8c8d8', nose: '#5a2a3a', name: '樱花熊' }) },
    arcticfox: { white: P({ base: '#f4f6fa', dark: '#c8d0dc', light: '#ffffff', paw: '#e0e6ee', socks: '#c8d0dc', inner: '#ffc4cc', nose: '#231c20', name: '北极狐' }), blue: P({ base: '#8a8a98', dark: '#5a5a6a', light: '#c8c8d4', paw: '#7a7a8a', socks: '#5a5a6a', inner: '#e8b0b8', nose: '#231c20', name: '蓝狐' }), shiny: P({ base: '#d8f0ff', dark: '#8ab8e0', light: '#ffffff', socks: '#8ab8e0', inner: '#ffc4dc', nose: '#3a4a6a', name: '极光狐' }) },
    fennec: { sand: P({ base: '#f0d6a8', dark: '#c8a070', light: '#fff4e0', paw: '#e8c890', socks: '#e0b880', inner: '#ffb8a8', nose: '#231c20', name: '耳廓狐' }), shiny: P({ base: '#ffe0ec', dark: '#e0a0b8', light: '#fff8fb', socks: '#e8b0c8', inner: '#ffb0c8', nose: '#5a2a3a', name: '樱花耳廓狐' }) },
    zebra: { plains: P({ base: '#f6f6f6', dark: '#231c20', light: '#ffffff', paw: '#3a3238', inner: '#c8a0a8', nose: '#231c20', muzzle: '#4a4248', name: '斑马' }), shiny: P({ base: '#fff6d0', dark: '#4a3a8a', light: '#ffffff', paw: '#4a3a8a', inner: '#e0a8c0', nose: '#231c20', muzzle: '#6a5aa8', name: '彩虹斑马' }) },
    antelope: { tan: P({ base: '#d8a060', dark: '#8a5a30', light: '#fbeedd', paw: '#6a4a30', horn: '#4a3a30', inner: '#f0b8a0', name: '羚羊' }), tibet: P({ base: '#e8d0b0', dark: '#a8805a', light: '#fff8ee', paw: '#8a6a4a', horn: '#3a3028', inner: '#f0c0b0', name: '藏羚羊' }), shiny: P({ base: '#c8e0ff', dark: '#5a7ab8', light: '#ffffff', paw: '#5a7ab8', horn: '#e8d080', inner: '#f0c0d8', name: '星羚' }) },
    deer: { fawn: P({ base: '#c8844a', dark: '#8a5230', light: '#fbecd8', paw: '#5a3a24', inner: '#f0b8a0', spots: true, name: '梅花鹿' }), buck: P({ base: '#b8743a', dark: '#7a4a28', light: '#f6e2c8', paw: '#5a3a24', inner: '#f0b8a0', antler: '#ecdcb8', name: '公鹿' }), shiny: P({ base: '#f4f0ff', dark: '#b8a8e0', light: '#ffffff', paw: '#b8a8e0', inner: '#f0c8e0', antler: '#ffe08a', spots: true, name: '月光鹿' }) },
    cow: { holstein: P({ base: '#ffffff', dark: '#231c20', light: '#ffffff', paw: '#3a3238', inner: '#ffb8c0', patch: '#2a2428', muzzle: '#ffb8c0', horn: '#f0e6c8', name: '奶牛' }), brown: P({ base: '#a86a3a', dark: '#5a3a20', light: '#f0dcc4', paw: '#4a3020', inner: '#ffb8c0', muzzle: '#f4d0c0', horn: '#f0e6c8', name: '黄牛' }), jersey: P({ base: '#c89a62', dark: '#6a4a2a', light: '#f4e4cc', paw: '#4a3424', inner: '#ffb8c0', muzzle: '#3a3238', horn: '#f0e6c8', name: '娟姗牛' }), shiny: P({ base: '#ffffff', dark: '#e05a9a', light: '#ffffff', paw: '#e05a9a', inner: '#ffb8d8', patch: '#ff8ac0', muzzle: '#ffd0e0', horn: '#ffe08a', name: '草莓奶牛' }) },
    yak: { black: P({ base: '#3a2e2a', dark: '#231c20', light: '#6a5a50', paw: '#231c20', horn: '#e8dcc0', inner: '#8a6a60', nose: '#120c0c', name: '黑牦牛' }), white: P({ base: '#ece6dc', dark: '#b8ae9e', light: '#ffffff', paw: '#8a8070', horn: '#c8b890', inner: '#e8c0b0', nose: '#5a4a40', name: '白牦牛' }), shiny: P({ base: '#4a3a8a', dark: '#2a2058', light: '#8a7ac8', paw: '#2a2058', horn: '#ffe08a', inner: '#b8a0e0', name: '星空牦牛' }) },
    alpaca: { cream: P({ base: '#f4ead8', dark: '#d8c6aa', light: '#fffaf0', paw: '#c8b494', inner: '#e8c8b0', nose: '#5a4a40', name: '奶油羊驼' }), brown: P({ base: '#b88a5a', dark: '#8a6440', light: '#e8cfa8', paw: '#6a4a30', inner: '#e8b8a0', nose: '#3a2a20', name: '棕羊驼' }), shiny: P({ base: '#ffd8ec', dark: '#f0b0d0', light: '#fff4fa', paw: '#e0a0c0', inner: '#ffc0d8', nose: '#6a3a50', name: '粉红羊驼' }) },
    sheep: { white: P({ base: '#f0e2d0', dark: '#c8b4a0', light: '#fff6ec', paw: '#5a4a44', wool: '#fbf8f0', woolShade: '#e4dccc', inner: '#f0b8b0', nose: '#6a4a48', name: '绵羊' }), blackface: P({ base: '#4a4046', dark: '#2a2428', light: '#6a6066', paw: '#2a2428', wool: '#f6f2e8', woolShade: '#dcd4c4', inner: '#8a6a70', nose: '#120c0c', name: '黑脸羊' }), shiny: P({ base: '#f0e2d0', dark: '#c8b4a0', light: '#fff6ec', paw: '#5a4a44', wool: '#d8f0ff', woolShade: '#a8d0f0', inner: '#f0b8b0', nose: '#6a4a48', name: '云朵羊' }) },
    hippo: { gray: P({ base: '#9a8aa8', dark: '#6a5a78', light: '#e8b8c0', paw: '#7a6a88', inner: '#e8a0b0', muzzle: '#b8a0bc', nose: '#3a2a3a', name: '河马' }), pygmy: P({ base: '#5a5a62', dark: '#3a3a42', light: '#c8a0a8', paw: '#4a4a52', inner: '#d8a0a8', muzzle: '#7a7078', nose: '#231c20', name: '倭河马' }), shiny: P({ base: '#ffb8d0', dark: '#e07a9a', light: '#fff0f4', paw: '#e08aa8', inner: '#ff8ab0', muzzle: '#ffd0e0', nose: '#8a2a4a', name: '粉红河马' }) },
    camel: { single: P({ base: '#d8a868', dark: '#a87840', light: '#f0d4a8', paw: '#a87840', inner: '#e0a890', nose: '#5a3a24', humps: 1, name: '单峰驼' }), bactrian: P({ base: '#a87a4a', dark: '#6a4a2a', light: '#d8b88a', paw: '#6a4a2a', inner: '#d8a088', nose: '#3a2418', humps: 2, name: '双峰驼' }), shiny: P({ base: '#fff0c8', dark: '#e0b860', light: '#ffffff', paw: '#e0b860', inner: '#f0c8a8', nose: '#8a5a20', humps: 2, name: '金骆驼' }) },
    monkey: { brown: P({ base: '#a8703a', dark: '#6a4220', light: '#f4d0b0', paw: '#8a5a2a', inner: '#e8a890', nose: '#6a4220', name: '小猴子' }), golden: P({ base: '#e8a03a', dark: '#a8601a', light: '#a8c0e8', paw: '#c8802a', inner: '#e8a890', nose: '#5a7aa8', name: '金丝猴' }), shiny: P({ base: '#f4f4f4', dark: '#a8a8a8', light: '#ffd8e0', paw: '#d8d8d8', inner: '#ffb0c0', nose: '#e08aa0', name: '雪猴' }) },
    meerkat: { sand: P({ base: '#c8a878', dark: '#5a4030', light: '#ecdcc0', paw: '#8a6a48', inner: '#e0b0a0', nose: '#231c20', name: '狐獴' }), shiny: P({ base: '#d8f0d0', dark: '#4a7a4a', light: '#f4fff0', paw: '#8ab88a', inner: '#e0c0c0', nose: '#231c20', name: '薄荷狐獴' }) },
    seal: { harbor: P({ base: '#9aa4ae', dark: '#6a7480', light: '#d8dee4', paw: '#6a7480', nose: '#231c20', name: '斑海豹' }), pup: P({ base: '#f6f6f2', dark: '#d0d4d8', light: '#ffffff', paw: '#c8ccd0', nose: '#231c20', name: '小白海豹' }), shiny: P({ base: '#b8a8f0', dark: '#7a6ac8', light: '#e8e0ff', paw: '#7a6ac8', nose: '#231c20', name: '紫海豹' }) },
    seagull: { gull: P({ base: '#ffffff', dark: '#a8b0bc', light: '#ffffff', paw: '#f0a040', nose: '#ffcf33', tail: '#4a4a52', tail2: '#a8b0bc', name: '海鸥' }), shiny: P({ base: '#fff4d0', dark: '#e0b860', light: '#ffffff', paw: '#f0a040', nose: '#ff8a5a', tail: '#a87a30', name: '金海鸥' }) },
    parrot: { macaw: P({ base: '#e8402a', dark: '#2a6ad0', light: '#ffd84a', paw: '#5a5a62', nose: '#f4f0e8', tail: '#2a6ad0', tail2: '#ffd84a', crest: '#e8402a', name: '金刚鹦鹉' }), green: P({ base: '#4ab84a', dark: '#2a7a3a', light: '#c8f07a', paw: '#8a8a92', nose: '#ff8a3a', tail: '#2a7ad0', tail2: '#4ab84a', crest: '#ffd84a', name: '绿鹦鹉' }), blue: P({ base: '#3a8ae0', dark: '#1a4aa8', light: '#ffd84a', paw: '#5a5a62', nose: '#231c20', tail: '#1a4aa8', tail2: '#3a8ae0', crest: '#3a8ae0', name: '蓝黄鹦鹉' }), shiny: P({ base: '#ff8ac8', dark: '#a85ae0', light: '#fff4a0', paw: '#8a8a92', nose: '#ffffff', tail: '#5ad1ff', tail2: '#ffcf33', crest: '#ffcf33', name: '彩虹鹦鹉' }) },
    gardeneel: { spotted: P({ base: '#f4f2ea', dark: '#231c20', light: '#ffffff', paw: '#f4f2ea', sand: '#d8c49a', sandDark: '#8a7a5a', name: '花园鳗' }), orange: P({ base: '#ff9a4a', dark: '#ffffff', light: '#ffd0a8', paw: '#ff9a4a', sand: '#d8c49a', sandDark: '#8a7a5a', name: '橙花园鳗' }), shiny: P({ base: '#c8f0ff', dark: '#5a8ae0', light: '#ffffff', paw: '#c8f0ff', sand: '#d8c49a', sandDark: '#8a7a5a', name: '星光花园鳗' }) },
    shark: { reef: P({ base: '#8a9cb0', dark: '#5a6c82', light: '#f0f4f8', paw: '#5a6c82', nose: '#231c20', name: '小鲨鱼' }), whale: P({ base: '#4a6a8a', dark: '#2a4a6a', light: '#e8f0f8', paw: '#2a4a6a', nose: '#231c20', name: '鲸鲨' }), shiny: P({ base: '#ff9ac0', dark: '#d85a8a', light: '#fff0f6', paw: '#d85a8a', nose: '#231c20', name: '粉红鲨' }) },
  });

  // ---------- 物种资料 ----------
  const CH = PP.CHRONO;
  const night = CH.noctur, day = CH.diurnal, dusk = CH.crepus, lazyCat = CH.curve((h) => (h >= 9 && h < 17 ? 0.75 : h >= 0 && h < 5 ? 0.5 : 0.12)); // 大猫：白天大半时间在睡
  const S = (name, coats, fav, favName, favIcon, chrono, speed, desc, sig, trick, lines, extra) => Object.assign({ name, coats, fav, favName, favIcon, chrono, speed, run: speed * 3.2, pitch: 600, roam: 0.6, bias: {}, trick, desc, sig, lines }, extra || {});
  const L = (greet, hungry, happy, idle, alone) => ({ greet, hungry, happy, idle, alone });
  Object.assign(PP.SPECIES, {
    lion: S('狮子', ['male', 'lioness'], 'treat_meat', '肉', 'meat', lazyCat, 30, '草原之王，其实一天要睡二十个小时', '白天在大石头上睡觉 · 傍晚巡视领地 · 吼一声整个草原都听得见', '吼一声', L(['（懒洋洋地抬头）', '嗷呜～', '来啦'], ['肚子咕咕叫', '想吃肉…'], ['呼噜…', '（打滚）'], ['这片草原都是我的', '好困…', '太阳真舒服', '（甩甩鬃毛）'], ['别吵，王在睡觉']), { pitch: 180, bias: { lazy: 0.5, extro: 0.1 } }),
    tiger: S('老虎', ['bengal', 'white'], 'treat_meat', '肉', 'meat', CH.foxy, 34, '雨林里独来独往的大猫，其实很喜欢泡水', '在雨林河边泡澡 · 悄悄埋伏 · 在大树上磨爪子', '扑一下', L(['嗷～', '（悄悄靠近）', '你好'], ['好饿…', '要去打猎了'], ['呼噜呼噜', '（翻肚皮）'], ['河水真凉快', '嘘…有东西', '这棵树好挠', '（舔爪子）'], ['让我一个人待会儿']), { pitch: 200, bias: { extro: -0.3, curious: 0.2 } }),
    snowleopard: S('雪豹', ['snow'], 'treat_meat', '肉', 'meat', CH.crepus, 34, '住在高山岩壁上的灰色幽灵，尾巴又长又蓬', '在岩壁上跳来跳去 · 用大尾巴盖住鼻子睡觉', '跳岩壁', L(['（从岩石后探头）', '…你好'], ['饿了…'], ['（尾巴卷卷）', '呼噜'], ['山上的风好大', '那只岩羊…', '尾巴好暖和'], ['（缩进尾巴里）']), { pitch: 260, bias: { timid: 0.4, extro: -0.4 } }),
    polarbear: S('北极熊', ['white'], 'treat_fish', '鱼', 'fish', CH.diurnal, 26, '雪原上最大的毛团子，游泳一流', '在冰窟窿边等鱼 · 在雪地里打滚 · 冬天窝在冰洞里', '雪地打滚', L(['（摇摇晃晃走过来）', '嗷～'], ['想吃鱼', '肚子空空'], ['（打滚）', '嘿嘿'], ['冰好凉快', '雪真软', '我好像又胖了'], ['我去冰洞里坐坐']), { pitch: 220, bias: { lazy: 0.3, playful: 0.3 } }),
    arcticfox: S('北极狐', ['white', 'blue'], 'treat_fish', '鱼', 'fish', CH.foxy, 40, '冬天一身白毛，在雪地里几乎看不见', '跟着北极熊捡剩饭 · 一头扎进雪里抓旅鼠', '扎雪堆', L(['（竖起耳朵）', '嘿～'], ['饿了'], ['（甩尾巴）'], ['雪下面有声音', '好冷但我不怕', '（蹦一下）'], ['我去雪洞里']), { pitch: 900, bias: { curious: 0.4, playful: 0.3 } }),
    fennec: S('耳廓狐', ['sand'], 'treat_berry', '浆果', 'berry', CH.noctur, 40, '耳朵比脸还大，能听见沙子底下的虫子', '白天躲在沙洞里 · 夜里出来听虫子 · 跳得特别高', '大耳朵转转', L(['（耳朵转过来）', '嘻～'], ['想吃浆果'], ['（原地跳）', '嘿嘿'], ['沙子底下有虫', '好热…', '月亮出来了'], ['我回洞里凉快']), { pitch: 1400, bias: { playful: 0.4, timid: 0.2 } }),
    zebra: S('斑马', ['plains'], 'treat_hay', '嫩草', 'hay', CH.diurnal, 40, '每一只的条纹都不一样，喜欢一大群待在一起', '在草原上吃草 · 去水塘喝水 · 站着睡觉', '甩尾巴', L(['嘶～', '（甩甩尾巴）'], ['想吃嫩草'], ['（踢踢腿）'], ['草好香', '大家都在哪', '那边有狮子吗'], ['我站着歇会儿']), { pitch: 500, bias: { extro: 0.3, timid: 0.3 } }),
    antelope: S('羚羊', ['tan', 'tibet'], 'treat_hay', '嫩草', 'hay', CH.diurnal, 50, '跑得飞快，一蹦能跳很高', '在草原上吃草 · 一受惊就蹦着跑 · 去水塘喝水', '弹跳', L(['（竖起耳朵）', '你好～'], ['饿了'], ['（原地蹦）'], ['风里有什么味道', '跑一圈去', '草真嫩'], ['（警惕地看看四周）']), { pitch: 800, bias: { timid: 0.5, playful: 0.2 } }),
    hippo: S('河马', ['gray', 'pygmy'], 'treat_melon', '西瓜', 'melon', CH.noctur, 22, '白天泡在水塘里只露鼻子，晚上上岸吃草', '泡在水里打哈欠 · 夜里上岸吃草 · 张大嘴巴', '大嘴巴', L(['（咕噜噜吐泡泡）', '哈～'], ['想吃西瓜'], ['（张大嘴）', '嘿嘿'], ['水里最舒服', '（打哈欠）', '晒一会儿就够了'], ['我泡着呢']), { pitch: 160, roam: 0.3, bias: { lazy: 0.5 } }),
    cow: S('奶牛', ['holstein', 'brown', 'jersey'], 'treat_hay', '干草', 'hay', CH.diurnal, 22, '慢悠悠的好脾气，嚼东西能嚼一整天', '在牧场吃草 · 躺下反刍 · 在牛棚里晒太阳', '哞一声', L(['哞～', '（慢慢走过来）'], ['哞…想吃草'], ['哞～～', '（甩尾巴）'], ['草真好吃', '（嚼嚼嚼）', '今天天气不错'], ['让我慢慢嚼']), { pitch: 200, roam: 0.35, bias: { lazy: 0.4, extro: 0.2 } }),
    yak: S('牦牛', ['black', 'white'], 'treat_hay', '干草', 'hay', CH.diurnal, 22, '高山上披着长毛的大块头，越冷越精神', '在高山草甸吃草 · 下雪也照样出门 · 长毛拖到地上', '甩长毛', L(['哞～', '（呼出白气）'], ['想吃草'], ['（甩甩毛）'], ['山上的草最香', '冷？不冷', '（呼——）'], ['我去避风的地方']), { pitch: 170, bias: { lazy: 0.2 } }),
    alpaca: S('羊驼', ['cream', 'brown'], 'treat_hay', '干草', 'hay', CH.diurnal, 30, '毛茸茸的高山居民，不高兴了会吐口水', '在高山上吃草 · 和大家挤在一起 · 生气会吐口水', '歪头', L(['（歪头）', '嗯～？'], ['饿饿'], ['（蹦一下）', '嘿～'], ['我的毛好蓬', '（歪头）', '那是什么'], ['哼']), { pitch: 700, bias: { curious: 0.4, extro: 0.2 } }),
    deer: S('小鹿', ['fawn', 'buck'], 'treat_berry', '浆果', 'berry', CH.crepus, 44, '森林里最轻的脚步，耳朵一直在转', '早晚出来吃嫩叶 · 去小溪喝水 · 一受惊就竖起白尾巴跑', '竖耳朵', L(['（耳朵转过来）', '…你好'], ['想吃浆果'], ['（轻轻蹦一下）'], ['树叶沙沙响', '小溪在那边', '（竖起耳朵）'], ['（躲进灌木丛）']), { pitch: 1000, bias: { timid: 0.5, curious: 0.2 } }),
    sheep: S('绵羊', ['white', 'blackface'], 'treat_hay', '嫩草', 'hay', CH.diurnal, 26, '一团会走路的云，喜欢跟着大家走', '在草地上吃草 · 挤成一团睡觉 · 跟着别人走', '咩一声', L(['咩～', '（蹭过来）'], ['咩…饿了'], ['咩咩～'], ['云和我一样白', '草真香', '大家去哪我去哪'], ['咩…']), { pitch: 900, bias: { extro: 0.3, timid: 0.2 } }),
    camel: S('骆驼', ['single', 'bactrian'], 'treat_hay', '干草', 'hay', CH.diurnal, 24, '沙漠里的老司机，驼峰里存着能量', '在绿洲喝水 · 嚼仙人掌 · 慢悠悠地走', '眨长睫毛', L(['（慢慢眨眼）', '你好～'], ['想喝水…'], ['（嚼嚼）'], ['沙子好烫', '再走一会儿就到绿洲了', '（嚼嚼嚼）'], ['我歇会儿']), { pitch: 240, bias: { lazy: 0.3 } }),
    monkey: S('猴子', ['brown', 'golden'], 'treat_banana', '香蕉', 'banana', CH.diurnal, 42, '雨林里最闹腾的家伙，一刻也停不下来', '在大树上荡来荡去 · 摘果子 · 给同伴理毛', '翻跟头', L(['吱吱！', '嘿嘿嘿'], ['香蕉！我要香蕉！'], ['吱吱吱！', '（翻跟头）'], ['那个果子是我的', '（挠挠头）', '树上好玩'], ['吱…']), { pitch: 1300, bias: { playful: 0.6, extro: 0.4, curious: 0.3 } }),
    parrot: S('鹦鹉', ['macaw', 'green', 'blue'], 'treat_seed', '坚果', 'seed', CH.earlyBird, 34, '雨林里最吵也最聪明的鸟，会学你说话', '在树上嗑坚果 · 学别的动物叫 · 天一亮就开始唱', '学说话', L(['你好你好！', '（歪头）'], ['坚果！坚果！'], ['嘎嘎！', '你好棒！'], ['嘎？', '你好你好', '（学猴子叫）'], ['嘎…']), { pitch: 1800, bias: { extro: 0.5, curious: 0.4 } }),
    meerkat: S('狐獴', ['sand'], 'treat_seed', '虫子', 'seed', CH.diurnal, 36, '沙漠里的哨兵，总有一只站岗放哨', '站起来放哨 · 挖洞 · 早上晒太阳取暖', '站岗', L(['（站起来看你）', '嘀！'], ['饿了'], ['（蹦一下）'], ['我来放哨', '沙子底下有虫', '太阳暖暖的'], ['（钻进洞里）']), { pitch: 1500, bias: { curious: 0.4, timid: 0.3, extro: 0.2 } }),
    seal: S('海豹', ['harbor', 'pup'], 'treat_fish', '鱼', 'fish', CH.chill, 20, '在海滩礁石上晒太阳的胖团子，下水就变灵活', '趴在礁石上晒太阳 · 下海抓鱼 · 拍肚子', '拍肚子', L(['（拍拍鳍）', '嗷～'], ['想吃鱼'], ['（拍肚子）', '嗷嗷'], ['太阳好暖', '（翻个身）', '海水真舒服'], ['我晒着呢']), { pitch: 500, bias: { lazy: 0.4, extro: 0.2 } }),
    seagull: S('海鸥', ['gull'], 'treat_fish', '鱼', 'fish', CH.earlyBird, 40, '海边的常客，看到吃的眼睛就亮', '在海浪边找吃的 · 站在木桩上 · 跟着渔船飞', '抢吃的', L(['嘎！', '（盯着你手里）'], ['有吃的吗'], ['嘎嘎！'], ['那是鱼吗', '风真大', '嘎？'], ['嘎…']), { pitch: 1600, bias: { greedy: 0.5, extro: 0.3 } }),
    gardeneel: S('花园鳗', ['spotted', 'orange'], 'treat_shrimp', '小虾', 'shrimp', CH.diurnal, 6, '一群住在沙子里的细长家伙，一害羞就缩回洞里', '从沙洞里探出身子吃浮游生物 · 一有动静就缩回去', '缩回去', L(['（探出头）', '…嗨'], ['想吃小虾'], ['（摇摆）'], ['水流好舒服', '（摇摆摇摆）', '那边有什么'], ['（缩回洞里）']), { pitch: 1700, roam: 0.05, bias: { timid: 0.6, extro: -0.2 } }),
    arctichare: S('北极兔', ['white'], 'treat_hay', '苔藓', 'hay', CH.noctur, 46, '冬天一身雪白，只有耳朵尖是黑的', '躲在雪窝里 · 刨开雪吃苔藓 · 一蹦好远', '蹦一下', L(['（耳朵转过来）', '你好～'], ['想吃东西'], ['（蹦）'], ['雪下面有吃的', '（竖耳朵）', '好冷但我有毛'], ['（缩进雪窝）']), { pitch: 1300, bias: { timid: 0.5 } }),
    albatross: S('信天翁', ['wandering'], 'treat_fish', '鱼', 'fish', CH.diurnal, 34, '翅膀张开比人还长，能在海上滑翔好几天', '在草巢里孵蛋 · 贴着海面滑翔 · 跳求偶舞', '展翅', L(['嘎——', '（张开大翅膀）'], ['想吃鱼'], ['（摇头晃脑）'], ['风真好', '我去海上转一圈', '（理羽毛）'], ['我在巢里']), { pitch: 700, bias: { lazy: 0.2 } }),
    marmot: S('土拨鼠', ['brown'], 'treat_seed', '嫩草', 'seed', CH.diurnal, 30, '站起来像根小柱子，会吹口哨放哨', '站在洞口放哨 · 吃嫩草 · 冬天冬眠', '吹口哨', L(['（站起来）', '啾——！'], ['饿了'], ['（打滚）'], ['我来放哨', '太阳好舒服', '啊——！'], ['（钻回洞里）']), { pitch: 1200, bias: { lazy: 0.3, curious: 0.2 } }),
    bat: S('蝙蝠', ['brown', 'fruit'], 'treat_berry', '果子', 'berry', CH.noctur, 40, '白天倒挂着睡觉，晚上出去抓飞虫', '倒挂在洞顶 · 夜里飞出去 · 天亮前回来', '倒挂', L(['（倒挂着眨眼）', '吱'], ['想吃虫子'], ['（扑扇翅膀）'], ['天黑了吗', '（倒过来看世界）', '外面有好多虫'], ['（用翅膀裹住自己）']), { pitch: 2000, roam: 0.5, bias: { timid: 0.3, curious: 0.3 } }),
    brownbear: S('棕熊', ['brown', 'honey'], 'treat_berry', '浆果', 'berry', CH.diurnal, 26, '冬天在洞里睡一整个冬天，春天醒来饿坏了', '在溪里等鱼 · 摘浆果 · 冬眠', '站起来', L(['（站起来看你）', '嗷～'], ['饿……'], ['（蹭蹭树）'], ['浆果在哪', '（嗅嗅）', '好困'], ['让我再睡会儿']), { pitch: 180, bias: { lazy: 0.4 } }),
    porcupine: S('豪猪', ['crested'], 'treat_berry', '果子', 'berry', CH.noctur, 22, '满身长刺，一紧张就竖起来沙沙响', '夜里出去啃树皮 · 在石缝里睡觉', '竖刺', L(['（抖抖刺）', '沙沙'], ['饿了'], ['（刺放下来）'], ['别摸我的刺', '（啃啃）', '洞里好凉快'], ['（竖起刺）']), { pitch: 900, bias: { timid: 0.4, extro: -0.2 } }),
    otter: S('海獭', ['sea'], 'treat_shrimp', '贝壳', 'shrimp', CH.diurnal, 34, '仰面漂在海上，用石头敲贝壳吃', '在浪里漂着 · 敲贝壳 · 抓着海带睡觉', '敲贝壳', L(['（漂过来）', '嘿～'], ['想吃贝壳'], ['（拍肚子）'], ['这块石头是我的', '（梳毛）', '浪好舒服'], ['（抓着海带睡）']), { pitch: 1100, bias: { playful: 0.5, extro: 0.3 } }),
    shark: S('鲨鱼', ['reef', 'whale'], 'treat_fish', '鱼', 'fish', CH.crepus, 36, '看起来凶，其实是个爱巡游的老实人', '在礁石边巡游 · 傍晚出来找吃的 · 绕着沉船转圈', '露背鳍', L(['（游过来）', '嗨～'], ['饿了…'], ['（转个圈）'], ['我不咬人的', '游一圈去', '（露出背鳍）'], ['我去深一点的地方']), { pitch: 260, bias: { curious: 0.3 } }),
  });
  const extra = ['lion', 'tiger', 'snowleopard', 'polarbear', 'arcticfox', 'fennec', 'zebra', 'antelope', 'hippo', 'cow', 'yak', 'alpaca', 'deer', 'sheep', 'camel', 'monkey', 'parrot', 'meerkat', 'seal', 'seagull', 'gardeneel', 'shark', 'arctichare', 'albatross', 'marmot', 'bat', 'brownbear', 'porcupine', 'otter'];
  for (const k of extra) if (!PP.SPECIES_LIST.includes(k)) PP.SPECIES_LIST.push(k);
  // 鸟、鳗、鲨鱼的走路方式
  PP.SPECIES.parrot.gait = 'hop'; PP.SPECIES.parrot.hopH = 8; PP.SPECIES.parrot.hopT = 0.3;
  PP.SPECIES.seagull.gait = 'hop'; PP.SPECIES.seagull.hopH = 6; PP.SPECIES.seagull.hopT = 0.3;
  PP.SPECIES.albatross.gait = 'hop'; PP.SPECIES.albatross.hopH = 5; PP.SPECIES.albatross.hopT = 0.3;
  PP.SPECIES.arctichare.gait = 'hop'; PP.SPECIES.arctichare.hopH = 7; PP.SPECIES.arctichare.hopT = 0.26;
  PP.SPECIES.meerkat.gait = 'hop'; PP.SPECIES.meerkat.hopH = 4; PP.SPECIES.meerkat.hopT = 0.22;
  // ---------- 动作风格：不同的动物能做的动作不一样 ----------
  // fixed：一直待在原地（花园鳗只会在洞里摇摆、缩回去）；swim：只会游；fly：会飞；heavy：大块头，不扑不跳不追球
  PP.MOTION = {
    gardeneel: 'fixed',
    shark: 'swim', turtle: 'swim', octopus: 'swim',
    bat: 'fly', albatross: 'fly', seagull: 'fly', parrot: 'fly',
    hippo: 'heavy', cow: 'heavy', yak: 'heavy', camel: 'heavy', brownbear: 'heavy', polarbear: 'heavy', sheep: 'heavy', alpaca: 'heavy', capybara: 'heavy', lion: 'heavy', seal: 'heavy', porcupine: 'heavy',
  };
  PP.motionOf = (sp) => PP.MOTION[sp] || 'normal';
  // 谁能跳上高处（石头、栅栏、屋顶、树屋）：小个子、猫科、会飞的；牛羊骆驼河马这些大块头不行
  const CLIMB = new Set(['cat', 'fox', 'arcticfox', 'fennec', 'snowleopard', 'tiger', 'monkey', 'parrot', 'seagull', 'albatross', 'bat', 'chick', 'dragon', 'meerkat', 'hamster', 'marmot', 'lion', 'penguin', 'turtle', 'otter', 'dog', 'rabbit', 'arctichare', 'deer', 'antelope']);
  PP.canClimb = (sp) => CLIMB.has(sp);
  // 谁会原地蹦起来（扑东西、开心跳）
  PP.canJump = (sp) => { const m = PP.motionOf(sp); return m === 'normal' || m === 'fly'; };
  // 每种风格不做的事
  PP.MOTION_NO = {
    fixed: ['wander', 'explore', 'play', 'cursor_play', 'seek_user', 'social', 'bug', 'ball', 'treat', 'holiday_food', 'gift', 'follow', 'zoomies'],
    swim: ['ball', 'bug', 'cursor_play', 'gift'],
    fly: ['ball'],
    heavy: ['ball', 'bug', 'cursor_play'],
    normal: [],
  };
})();