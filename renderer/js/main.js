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
    G.ground = G.bar ? G.H - Math.max(2, Math.round(G.bar.h * 0.1)) : G.H - bar; G._g0 = G.H - bar;
    if (G.isle && PP.isle) { PP.isle.layout(); G.ground = PP.isle.groundY(); }
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
    try { await boot0(); }
    catch (e) {
      // 启动到一半出错：记下来，但画面和按钮照样跑起来，不留一块空白
      oops(e, 'boot');
      try { if (!PP.started) { PP.started = true; PP.syncPets && PP.syncPets(); loop(); } } catch (x) { oops(x, 'boot2'); }
    }
  }
  async function boot0() {
    if (!api) document.body.classList.add('web');
    cv = document.getElementById('stage'); ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    const had = await PP.save.load();
    const s = G.save;
    if (s.items && s.items.length) s.items.filter((o) => !['food', 'water', 'bed', 'litter', 'poop', 'cup'].includes(o.type)).forEach((o) => PP.addItem(o));
    G.all = (s.pets || []).filter((d) => PP.SPECIES[d.species]).map((d) => new PP.Pet(d));
    for (const p of G.all) { p.y = G.ground; if (p.d.lane != null) p.lane = p.d.lane; p.d.hidden = false; p.d.calm = false; p.d.headOnly = false; }
    G.save.settings.work = false; G.save.settings.headOnly = false;
    G.save.settings.allAway = false; // 每次打开大家都在（以前“都回电脑里”会被记住，下次打开就一只都看不见）
    safe(() => PP.wild.populate(), 'wild');
    safe(() => PP.eco && PP.eco.init(), 'eco.init');
    PP.syncPets();
    PP.ui.init();
    PP.modes.init();
    safe(() => PP.update && PP.update.init(), 'update.init');
    PP.bindInput();
    let away = 0; safe(() => { away = PP.save.catchUp(); }, 'catchUp');
    PP.started = true;
    // 打开时：极简模式下主角从小门里走出来；场景里大家本来就在各自的地方过日子
    if (s.settings.mode === 'mini') G.pets.forEach((p, i) => PP.petEmerge(p, p.x, 300 + i * 650));
    else PP.eco && PP.eco.onView(PP.scene.view());
    const emergeT = 300 + G.pets.length * 650 + 2600;
    // 第一次玩：场景稍微放大一点（原来缩在右下角很小），再给一张引导卡片
    if (!PP.mine().length && !s.flags.welcomed) { s.flags.welcomed = 1; if (!s.settings.sceneZ) s.settings.sceneZ = 1.35; PP.onboard ? PP.onboard.start() : setTimeout(() => PP.ui.toast('这里住满了野生动物：指着喜欢的那只，点“认养”就能给它取名字', 'egg'), 1200); }
    else if (PP.onboard && !PP.mine().length) PP.onboard.start()
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
    setInterval(() => { try { guard(); } catch (e) { oops(e, 'guard'); } }, 1000);
    if (api && api.onRescue) api.onRescue((force) => { try { rescue(force); } catch (e) { oops(e, 'rescue'); } });
    loop();
  }

  // ---------- 看门狗：任何情况下主角都不能“凭空消失” ----------
  // 每秒查一遍：坐标坏了 / 跑出屏幕 / 卡在门里 / 极简模式下主角没在画面上（又不是你让它走的）→ 自动纠正，并写进日志
  const LOG = (m) => { try { console.warn('[guard]', m); api && api.log && api.log('[guard] ' + m); } catch (e) {} };
  PP.log = LOG;
  let missing = 0;
  function guard() {
    if (!G.save || !PP.started) return;
    if (cv && (Math.abs(window.innerWidth - G.W) > 1 || Math.abs(window.innerHeight - G.H) > 1)) { LOG(`画布尺寸不对 ${G.W}x${G.H} → ${window.innerWidth}x${window.innerHeight}`); resize(); }
    for (const p of G.pets) {
      if (p.held) continue;
      const bad = !Number.isFinite(p.x) || !Number.isFinite(p.y);
      if (bad || p.x < -60 || p.x > G.W + 60 || p.y < -300 || p.y > G.H + 80) {
        LOG(`${p.name} 位置异常 (${p.x}, ${p.y})，拉回来`);
        p.interrupt(true); p.airborne = false; p.target = null;
        p.x = U.clamp(Number.isFinite(p.x) ? p.x : G.W * 0.7, 40, G.W - 40); p.y = p.floor != null && Number.isFinite(p.floor) ? p.floor : G.ground;
        if (!Number.isFinite(p.y)) p.y = G.H - 2;
      }
    }
    const s = G.save.settings, m = PP.mainPet && PP.mainPet();
    // 极简：主角应该在；不在的正当理由只有：出门探险、被你选成不显示、你让大家都回电脑里、被你拎着
    if (s.mode === 'mini' && m && !s.allAway && !m.d.trip && !m.d.hidden && !m.held && (!G.pets.includes(m) || m.outing)) {
      if (++missing >= 4) {
        missing = 0; LOG(`极简模式主角 ${m.name} 不在画面上（inDoor=${!!m.inDoor} outing=${!!m.outing} inHome=${!!m.d.inHome}），叫回来`);
        m.outing = null; m.d.inHome = false; PP.syncPets();
        if (G.pets.includes(m)) PP.petEmerge(m, U.clamp(m.x, 60, G.W - 60));
      }
    } else missing = 0;
  }
  // 托盘“看不见宠物？点这里找回” / 又双击了一次图标 / 睡眠唤醒（force=0：只做检查）
  function rescue(force) {
    resize();
    if (!force) { guard(); return; }
    const s = G.save.settings;
    LOG('找回宠物：mode=' + s.mode + ' allAway=' + !!s.allAway + ' pets=' + G.pets.map((p) => p.name + '@' + Math.round(p.x) + ',' + Math.round(p.y)).join(' '));
    s.allAway = false;
    document.querySelectorAll('.panel').forEach((e) => e.style.removeProperty('display'));
    PP.summonMain && PP.summonMain();
    PP.refreshInteractive && PP.refreshInteractive();
    PP.ui.toast('在这儿呢～');
  }

  // 30fps 足够像素风，也更省电
  let last = performance.now(), acc = 0, lastBeat = 0;
  const STEP = 1 / 30;
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    acc += Math.min(0.25, (now - last) / 1000); last = now;
    if (api && api.beat && now - lastBeat > 2000) { lastBeat = now; api.beat(); } // 报平安：主进程 15 秒收不到就重新载入页面
    if (acc < STEP) return;
    const dt = Math.min(acc, 0.1); acc = 0;
    try { update(dt); } catch (e) { oops(e, 'update'); }
    try { render(); } catch (e) { oops(e, 'render'); }
  }
  // 某一处出错不能让整个画面停掉：记下来、提示一次、接着跑
  const seen = {};
  function oops(e, where) {
    const msg = where + ': ' + ((e && e.message) || e), k = msg.slice(0, 80);
    seen[k] = (seen[k] || 0) + 1;
    if (seen[k] > 1) return;
    console.error(where, e);
    try { api && api.log && api.log(msg + ' | ' + String((e && e.stack) || '').split('\n').slice(1, 5).join(' | ')); } catch (x) {}
    try { const f = G.save.flags; f.errs = (f.errs || []).slice(-9); f.errs.push({ t: Date.now(), m: msg, s: String((e && e.stack) || '').split('\n').slice(1, 4).join(' | ').slice(0, 300) }); } catch (x) {}
    try { PP.ui.toast('遇到一个小故障，已自动跳过（' + msg.slice(0, 60) + '）'); } catch (x) {}
  }
  PP.oops = oops;
  window.addEventListener('error', (e) => oops(e.error || e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => oops(e.reason, 'promise'));
  const safe = (fn, where) => { try { fn(); } catch (e) { oops(e, where); } };

  function update(dt) {
    G.t += dt;
    for (const p of G.pets) safe(() => p.update(dt), 'pet');
    if (G.bar && PP.barZone) { const [a, b] = PP.barZone(); for (const p of G.pets) if (!p.held && (p.x < a - 6 || p.x > b + 6)) { p.x = U.clamp(p.x, a, b); p.target = U.clamp(p.target != null ? p.target : p.x, a, b); } }
    // 竖着的小场景：大家只在那一块地上活动
    const vz = !G.bar && !G.isle && PP.scene && PP.scene.vzone && PP.scene.vzone();
    if (vz) {
      G.ground = PP.scene.vground() || G._g0 || G.ground;
      for (const p of G.pets) if (!p.held && !p.airborne && !p.edgePeek && !p.inDoor && (p.x < vz[0] - 6 || p.x > vz[1] + 6)) { p.x = U.clamp(p.x, vz[0], vz[1]); if (p.target != null) p.target = U.clamp(p.target, vz[0], vz[1]); }
      for (const it of G.items) if (!it.held && PP.itemShown(it) && (it.x < vz[0] || it.x > vz[1])) it.x = U.clamp(it.x, vz[0], vz[1]);
    } else if (!G.bar && !G.isle && G._g0) G.ground = G._g0;
    separate();
    for (const it of G.items) if (PP.itemHere(it)) it.update(dt);
    safe(() => PP.eco && PP.eco.tick(dt), 'eco');
    G.items = G.items.filter((i) => !i.dead);
    PP.world.updateParticles(dt);
    PP.doorsUpdate(dt);
    safe(() => PP.scene.update(dt), 'scene');
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
    safe(() => PP.scene.render(ctx), 'scene.render');
    const order = { bed: 0, litter: 1, food: 2, water: 2 };
    const items = G.items.filter((i) => PP.itemShown(i)).sort((a, b) => (order[a.type] ?? 5) - (order[b.type] ?? 5) || a.y - b.y);
    for (const it of items) if ((order[it.type] ?? 5) < 5) it.render(ctx);
    for (const it of items) if ((order[it.type] ?? 5) >= 5 && !it.held) it.render(ctx);
    // 远的先画、近的后画（场景里有前后排）；被拎着的最后画
    const pets = G.pets.slice().sort((a, b) => (a.held ? 1 : 0) - (b.held ? 1 : 0) || (a.airborne ? 0 : a.y) - (b.airborne ? 0 : b.y));
    if (G.isle && PP.isle) safe(() => PP.isle.renderBack(ctx), 'isle');
    PP.doorsRenderBack(ctx);
    if (G.bar && PP.barDecor) PP.barDecor(ctx);
    // 任务栏视图：鼠标在任务栏上时动物变淡，不挡你看图标（停在某只身上一会儿它才会亮起来接住点击）
    const fade = G.bar && G.mouse.onScreen && G.mouse.y > G.H - G.bar.h && !G.barDwell;
    if (fade) ctx.globalAlpha = 0.4;
    for (const p of pets) safe(() => p.render(ctx), 'pet.render');
    if (fade) ctx.globalAlpha = 1;
    PP.doorsRenderFront(ctx);
    PP.F.render(ctx);
    for (const it of items) if (it.held) it.render(ctx);
    PP.world.renderAmbient(ctx);
    PP.world.renderParticles(ctx);
    PP.scene.renderFront(ctx);
    if (G.isle && PP.isle) safe(() => PP.isle.renderFront(ctx), 'isle.front');
    for (const p of pets) p.renderOverlay(ctx);
    PP.ui.tick();
  }

  PP.debug = { update, render };
  window.addEventListener('DOMContentLoaded', boot);
})();
