// 启动 & 主循环
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const api = window.petAPI;
  let cv, ctx;

  function resize() {
    G.W = window.innerWidth; G.H = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(G.W * dpr); cv.height = Math.round(G.H * dpr);
    cv.style.width = G.W + 'px'; cv.style.height = G.H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const bar = document.body.classList.contains('web') ? 44 : 2;
    G.ground = G.H - bar;
    for (const p of G.pets) { p.x = U.clamp(p.x, 20, G.W - 20); if (!p.airborne && !p.held) p.y = G.ground; }
    for (const it of G.items) { it.x = U.clamp(it.x, 12, G.W - 12); if (!it.held) it.y = Math.min(it.y, G.ground); }
  }

  function defaultItems() {
    const R = G.W;
    PP.addItem({ type: 'bed', x: R - 330 });
    PP.addItem({ type: 'food', x: R - 230, level: 1 });
    PP.addItem({ type: 'water', x: R - 180, level: 1 });
    PP.addItem({ type: 'litter', x: R - 90, data: { dirty: 0 } });
  }

  async function boot() {
    if (!api) document.body.classList.add('web');
    cv = document.getElementById('stage'); ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    const had = await PP.save.load();
    const s = G.save;
    if (s.items && s.items.length) s.items.forEach((o) => PP.addItem(o)); else defaultItems();
    G.all = (s.pets || []).filter((d) => PP.SPECIES[d.species]).map((d) => new PP.Pet(d));
    for (const p of G.all) p.y = G.ground;
    PP.syncPets();
    PP.ui.init();
    PP.modes.init();
    PP.bindInput();
    const away = PP.save.catchUp();
    PP.started = true;
    // 打开时：大家一个个从电脑里的小门走出来
    G.pets.forEach((p, i) => PP.petEmerge(p, p.x, 300 + i * 650));
    const emergeT = 300 + G.pets.length * 650 + 2600;
    if (!G.all.length) setTimeout(() => PP.ui.adopt(), 400);
    else if (away > 5 * 60000) {
      // 然后发现你回来了
      G.user.lastActive = Date.now() - away;
      setTimeout(() => { G.mouse.onScreen = true; PP.events.onUserReturn(away); G.user.lastActive = Date.now(); }, emergeT);
    }
    G.user.activeSince = Date.now();
    setInterval(() => PP.events.tick(), 5000);
    setInterval(() => PP.F.second(), 1000);
    setInterval(() => PP.save.write(), 20000);
    window.addEventListener('beforeunload', () => PP.save.write());
    PP.events.tick();
    loop();
  }

  // 30fps 足够像素风，也更省电
  let last = performance.now(), acc = 0;
  const STEP = 1 / 30;
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    acc += Math.min(0.25, (now - last) / 1000); last = now;
    if (acc < STEP) return;
    const dt = Math.min(acc, 0.1); acc = 0;
    update(dt);
    render();
  }

  function update(dt) {
    G.t += dt;
    for (const p of G.pets) p.update(dt);
    separate();
    for (const it of G.items) it.update(dt);
    G.items = G.items.filter((i) => !i.dead);
    PP.world.updateParticles(dt);
    PP.doorsUpdate(dt);
    PP.scene.update(dt);
    PP.world.updateAmbient(dt);
    PP.interactTick(dt);
    PP.F.tick(dt);
    PP.typingTick();
    for (const it of G.items) if (it.data && it.data.wobble > 0) it.data.wobble -= dt;
  }

  // 别叠在一起（伙伴、挤着睡的除外）
  function separate() {
    const S = G.S;
    for (let i = 0; i < G.pets.length; i++) for (let j = i + 1; j < G.pets.length; j++) {
      const a = G.pets[i], b = G.pets[j];
      if (a.outing || b.outing || a.held || b.held || a.airborne || b.airborne || a.partner === b || a.sleeping || b.sleeping) continue;
      if (a.target != null || b.target != null) continue;
      const dx = b.x - a.x;
      if (Math.abs(dx) < 12 * S) { const push = (12 * S - Math.abs(dx)) * 0.05 * (dx >= 0 ? 1 : -1); a.x -= push; b.x += push; }
    }
  }

  function render() {
    ctx.clearRect(0, 0, G.W, G.H);
    PP.scene.render(ctx);
    const order = { bed: 0, litter: 1, food: 2, water: 2 };
    const items = (PP.showItems() ? G.items : []).slice().sort((a, b) => (order[a.type] ?? 5) - (order[b.type] ?? 5));
    for (const it of items) if ((order[it.type] ?? 5) < 5) it.render(ctx);
    for (const it of items) if ((order[it.type] ?? 5) >= 5 && !it.held) it.render(ctx);
    const pets = G.pets.slice().sort((a, b) => (a.held ? 1 : 0) - (b.held ? 1 : 0) || (a.sleeping ? -1 : 0) - (b.sleeping ? -1 : 0));
    PP.doorsRenderBack(ctx);
    for (const p of pets) p.render(ctx);
    PP.doorsRenderFront(ctx);
    PP.F.render(ctx);
    for (const it of items) if (it.held) it.render(ctx);
    PP.world.renderAmbient(ctx);
    PP.world.renderParticles(ctx);
    PP.scene.renderFront(ctx);
    for (const p of pets) p.renderOverlay(ctx);
    PP.ui.tick();
  }

  PP.debug = { update, render };
  window.addEventListener('DOMContentLoaded', boot);
})();
