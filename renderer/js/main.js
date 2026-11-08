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
    G.ground = G.bar ? G.H - Math.max(2, Math.round(G.bar.h * 0.1)) : G.H - bar;
    for (const p of G.pets) { p.x = U.clamp(p.x, 20, G.W - 20); if (!p.airborne && !p.held) p.y = p.floor; }
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
    if (s.items && s.items.length) s.items.filter((o) => !['food', 'water', 'bed', 'litter', 'poop'].includes(o.type)).forEach((o) => PP.addItem(o));
    G.all = (s.pets || []).filter((d) => PP.SPECIES[d.species]).map((d) => new PP.Pet(d));
    for (const p of G.all) { p.y = G.ground; if (p.d.lane != null) p.lane = p.d.lane; p.d.hidden = false; p.d.calm = false; p.d.headOnly = false; }
    G.save.settings.work = false; G.save.settings.headOnly = false;
    const born = PP.wild.populate(); // 世界里默认住满野生动物
    PP.eco && PP.eco.init();
    PP.syncPets();
    PP.ui.init();
    PP.modes.init();
    PP.update && PP.update.init();
    PP.bindInput();
    const away = PP.save.catchUp();
    PP.started = true;
    // 打开时：极简模式下主角从小门里走出来；场景里大家本来就在各自的地方过日子
    if (s.settings.mode === 'mini') G.pets.forEach((p, i) => PP.petEmerge(p, p.x, 300 + i * 650));
    else PP.eco && PP.eco.onView(PP.scene.view());
    const emergeT = 300 + G.pets.length * 650 + 2600;
    if (!PP.mine().length && !s.flags.welcomed) { s.flags.welcomed = 1; setTimeout(() => PP.ui.toast('这里住满了野生动物：指着喜欢的那只，点“认养”就能给它取名字', 'egg'), 1200); }
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
    if (G.bar && PP.barZone) { const [a, b] = PP.barZone(); for (const p of G.pets) if (!p.held && (p.x < a - 6 || p.x > b + 6)) { p.x = U.clamp(p.x, a, b); p.target = U.clamp(p.target != null ? p.target : p.x, a, b); } }
    separate();
    for (const it of G.items) if (PP.itemHere(it)) it.update(dt);
    PP.eco && PP.eco.tick(dt);
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
      if (a.target != null || b.target != null || a.transit || b.transit || a.surf || b.surf || Math.abs(a.y - b.y) > 8 * S) continue; // 前后排错开的不用挤
      const dx = b.x - a.x;
      if (Math.abs(dx) < 12 * S) { const push = (12 * S - Math.abs(dx)) * 0.05 * (dx >= 0 ? 1 : -1); a.x -= push; b.x += push; }
    }
  }

  function render() {
    ctx.clearRect(0, 0, G.W, G.H);
    PP.scene.render(ctx);
    const order = { bed: 0, litter: 1, food: 2, water: 2 };
    const items = G.items.filter((i) => PP.itemShown(i)).sort((a, b) => (order[a.type] ?? 5) - (order[b.type] ?? 5) || a.y - b.y);
    for (const it of items) if ((order[it.type] ?? 5) < 5) it.render(ctx);
    for (const it of items) if ((order[it.type] ?? 5) >= 5 && !it.held) it.render(ctx);
    // 远的先画、近的后画（场景里有前后排）；被拎着的最后画
    const pets = G.pets.slice().sort((a, b) => (a.held ? 1 : 0) - (b.held ? 1 : 0) || (a.airborne ? 0 : a.y) - (b.airborne ? 0 : b.y));
    PP.doorsRenderBack(ctx);
    if (G.bar && PP.barDecor) PP.barDecor(ctx);
    // 任务栏视图：鼠标在任务栏上时动物变淡，不挡你看图标（停在某只身上一会儿它才会亮起来接住点击）
    const fade = G.bar && G.mouse.onScreen && G.mouse.y > G.H - G.bar.h && !G.barDwell;
    if (fade) ctx.globalAlpha = 0.4;
    for (const p of pets) p.render(ctx);
    if (fade) ctx.globalAlpha = 1;
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
