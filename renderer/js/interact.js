// 鼠标互动：摸摸、戳、拎起、扔、画圈、停在它身上…
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const api = window.petAPI;

  let press = null, dragPet = null, dragItem = null;
  let lastClick = { pet: null, t: 0 };
  const rub = { pet: null, dir: 0, flips: [], lastX: 0 };
  const circ = { pet: null, ang: null, total: 0, t: 0 };
  let interactive = null;
  const vel = [];
  let konami = [];
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  let barK = null, barSince = 0;
  function setInteractive(v) {
    if (v === interactive) return;
    interactive = v;
    if (api) api.setInteractive(v);
    document.body.style.cursor = v && (G.hoverPet || G.hoverItem || G.hoverHot) ? 'pointer' : 'default';
  }
  PP.refreshInteractive = () => {
    // 只有鼠标真的在宠物 / 东西 / 面板上时才接住点击；其他地方一律穿透到你的窗口
    const overUI = !!document.querySelector('.panel:hover, .menu:hover, .hud:hover, .orb-pop:hover, .homepop:hover, .hoverbar:hover, .editbar:hover');
    // 任务栏视图：鼠标得在某只动物身上停一小会儿（0.45 秒）才接住点击，平时一律穿透给任务栏
    let petHot = !!(G.hoverPet || G.hoverItem || G.hoverHot);
    if (G.bar) { const k = G.hoverPet || G.hoverItem; if (k !== barK) { barK = k; barSince = performance.now(); } G.barDwell = !!k && performance.now() - barSince > 450; petHot = G.barDwell; }
    setInteractive(!!(petHot || dragPet || dragItem || overUI || G.uiDrag || G.editing));
  };

  function markActive() {
    const now = Date.now();
    const U_ = G.user;
    if (now - U_.lastActive > 5 * 60000) {
      const away = now - U_.lastActive;
      U_.activeSince = now;
      if (PP.started) PP.events.onUserReturn(away);
    }
    U_.lastActive = now;
  }
  PP.markActive = markActive;

  function topPet(x, y) {
    // 近处（画在上面）的优先
    const order = G.pets.slice().sort((a, b) => b.y - a.y);
    for (const p of order) if (p.hit(x, y)) return p;
    return null;
  }
  function topItem(x, y) {
    for (let i = G.items.length - 1; i >= 0; i--) { const it = G.items[i]; if (!it.dead && !it.carriedBy && PP.itemShown(it) && it.hit(x, y)) return it; }
    return null;
  }

  function onMove(x, y) {
    const M = G.mouse, now = performance.now();
    vel.push([x, y, now]);
    while (vel.length > 6) vel.shift();
    // 用最近 ~50ms 的样本算速度（太长的窗口会把来回晃动抵消掉）
    let a = vel[vel.length - 2] || vel[0];
    for (let i = vel.length - 2; i >= 0; i--) { a = vel[i]; if (now - vel[i][2] > 50) break; }
    const dt = (now - a[2]) / 1000;
    if (dt > 0.004) { M.vx = (x - a[0]) / dt; M.vy = (y - a[1]) / dt; }
    const moved = Math.hypot(x - M.x, y - M.y);
    M.x = x; M.y = y; M.onScreen = true;
    if (moved > 0.5) { M.lastMove = Date.now(); markActive(); }

    if (press && !dragPet && !dragItem && Math.hypot(x - press.x, y - press.y) > 7) {
      if (press.pet) { dragPet = press.pet; dragPet.pickUp(); }
      else if (press.item && ['food', 'water', 'bed', 'litter', 'ball', 'gift', 'treat', 'cup'].includes(press.item.type)) { dragItem = press.item; dragItem.held = true; }
    }
    if (dragItem) { dragItem.x = U.clamp(x, 10, G.W - 10); dragItem.y = Math.min(G.ground, y + 8); }

    G.hoverPet = dragPet ? null : topPet(x, y);
    G.hoverItem = G.hoverPet ? null : topItem(x, y);
    G.hoverHot = G.hoverPet || G.hoverItem || dragPet || dragItem ? (PP.scene.hot(-9, -9), null) : (G.isle && PP.isle && PP.isle.hot(x, y)) || PP.scene.hot(x, y);
    if (G.editing) PP.scene.editMove(x, y);
    PP.refreshInteractive();
    if (interactive) document.body.style.cursor = G.hoverPet || G.hoverItem || G.hoverHot ? 'pointer' : 'default';

    detectEdgeWiggle(x, y);
    if (!press) {
      detectRub(x, y);
      detectCircle(x, y);
      detectStartle(x, y);
    }
  }

  // 召唤手势：在屏幕最底边快速左右来回晃鼠标（≥5 次折返 / 1.2 秒）。平时几乎不可能误触
  const wig = { dir: 0, last: 0, flips: [] };
  function detectEdgeWiggle(x, y) {
    if (y < G.H - 6) { wig.flips = []; wig.dir = 0; return; }
    const dx = x - wig.last; wig.last = x;
    if (Math.abs(dx) < 6) return;
    const d = Math.sign(dx), now = performance.now();
    if (wig.dir && d !== wig.dir) wig.flips.push(now);
    wig.dir = d;
    wig.flips = wig.flips.filter((t) => now - t < 1200);
    if (wig.flips.length >= 5) { wig.flips = []; PP.toggleAll(); PP.events.found('summon'); }
  }

  // 来回蹭 = 摸摸
  function detectRub(x, y) {
    const p = G.hoverPet;
    const now = performance.now();
    if (!p || p.held) { rub.pet = null; rub.flips = []; return; }
    if (rub.pet !== p) { rub.pet = p; rub.flips = []; rub.dir = 0; rub.lastX = x; return; }
    const dx = x - rub.lastX;
    if (Math.abs(dx) < 2) return;
    const d = Math.sign(dx);
    if (rub.dir && d !== rub.dir) rub.flips.push(now);
    rub.dir = d; rub.lastX = x;
    rub.flips = rub.flips.filter((t) => now - t < 1400);
    if (rub.flips.length >= 2 && Math.abs(G.mouse.vx) < 3500) stroke(p, d !== 0 && rub.flips[rub.flips.length - 1] === now);
  }

  function stroke(p, newStroke) {
    const wasPetting = p.petting > 0;
    p.petting = 0.7;
    if (!newStroke) return;
    const today = (PP.diary.day().counts[p.d.id] || {}).pets || 0;
    p.d.stats.pets++; p.count('pets');
    // 被摸太多也会累（尤其是社恐）
    if (p.n.battery < 12 && p.tr.extro < 0.55 && !p.sleeping) {
      if (!(p.cooldown.enough > 0)) {
        p.cooldown.enough = 60; p.petting = 0;
        p.say(U.pick(['够了够了', '让我静一静', '（躲开）']));
        p.run('alone', PP.ACTIONS.alone);
      }
      return;
    }
    if (p.sulk > 0) {
      p.sulk -= 4;
      if (p.sulk <= 0) { p.sulk = 0; p.say(U.pick(PP.LINES.forgive)); p.interrupt(); }
      return;
    }
    p.addAff(0.15 / (1 + today / 120));
    p.n.social = Math.min(100, p.n.social + 2.2);
    p.n.fun = Math.min(100, p.n.fun + 0.8);
    p.n.battery = Math.max(0, p.n.battery - 0.5 * (1.3 - p.tr.extro));
    p.purr = 1.2;
    if (p.hitHead(G.mouse.x, G.mouse.y) && PP.F) PP.F.purr(p); // 摸头 → 呼噜
    p.jolt(-0.9, rub.dir * 2.2); // 被摸的方向，身体跟着软软地歪一下
    if (!wasPetting && !['petted', 'landing', 'greet', 'handNap'].includes(p.action)) p.run('petted', PP.ACTIONS.petted);
    if (Math.random() < 0.35) { const [hx, hy] = p.headPos; PP.hearts(hx, hy - 6 * G.S, 1); }
    if (p.d.stats.pets % 100 === 0) { p.log(`主人已经摸了我 ${p.d.stats.pets} 次了。`, 'love'); }
    if (Math.random() < 0.04) p.line('happy');
    p.remember('heart');
  }

  // 绕着它画圈
  function detectCircle(x, y) {
    const now = performance.now();
    let near = null, best = 1e9;
    for (const p of G.pets) {
      const [hx, hy] = p.headPos; const d = Math.hypot(x - hx, y - hy);
      if (d > 30 && d < 220 && d < best) { best = d; near = p; }
    }
    if (!near || near.sleeping || near.held) { circ.pet = null; return; }
    const [hx, hy] = near.headPos;
    const ang = Math.atan2(y - hy, x - hx);
    if (circ.pet !== near || now - circ.t > 1200) { circ.pet = near; circ.ang = ang; circ.total = 0; circ.t = now; return; }
    let da = ang - circ.ang;
    if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
    circ.total += da; circ.ang = ang; circ.t = now;
    near.facing = x > hx ? 1 : -1; // 视线跟着转
    if (Math.abs(circ.total) > Math.PI * 2 * 3) {
      circ.total = 0;
      near.dizzy = 4; near.say(U.pick(PP.LINES.dizzy));
      near.interrupt(); near.anim = 'idle';
      PP.events.found('circle');
    }
  }

  // 鼠标突然甩得很快：猫的狩猎本能被点燃，压低身子准备扑
  function detectStartle(x, y) {
    const sp = Math.hypot(G.mouse.vx, G.mouse.vy);
    if (sp < 1300) return;
    for (const p of G.pets) {
      if (p.held || p.airborne || p.sleeping || p.peek || p.cooldown.hunt > 0 || (PP.F && PP.F.busy(p))) continue;
      const [hx, hy] = p.headPos;
      if (Math.hypot(x - hx, y - hy) < 320) {
        p.cooldown.hunt = 12;
        if (p.d.species === 'hedgehog') { p.curlT = 3; p.interrupt(); continue; } // 刺猬：被吓到缩成球
        if (p.calm || ['capybara', 'frog', 'pig'].includes(p.d.species) || (PP.F && PP.F.working())) continue;
        p.run('hunt', PP.ACTIONS.hunt);
        return;
      }
    }
  }

  function onDown(e) {
    markActive();
    const x = e.clientX, y = e.clientY;
    if (e.target.closest && e.target.closest('.panel,.menu,.hud,.orb-pop,.homepop,.hoverbar,.editbar')) return;
    PP.ui.closeMenu();
    if (G.editing) { PP.scene.editDown(x, y, e.button); return; }
    const pet = topPet(x, y), item = pet ? null : topItem(x, y);
    if (e.button === 0 && G.hoverHot && !pet && !item) { if (G.hoverHot.isle) { PP.hud && PP.hud.close(); PP.isle.down(G.hoverHot, x, y); } else PP.scene.click(G.hoverHot); return; }
    if (e.button === 2) {
      if (pet) PP.ui.petMenu(pet, x, y);
      else if (item) PP.ui.itemMenu(item, x, y);
      return;
    }
    if (e.button !== 0) return;
    press = { x, y, pet, item, t: performance.now() };
  }

  function onUp(e) {
    const x = e.clientX, y = e.clientY;
    if (G.editing) PP.scene.editUp();
    if (dragPet) {
      const p = dragPet; dragPet = null;
      p.drop(G.mouse.vx, G.mouse.vy);
      press = null; PP.refreshInteractive(); return;
    }
    if (dragItem) {
      const it = dragItem; dragItem = null; it.held = false;
      if (it.type === 'ball' || it.type === 'cup' || it.type === 'treat' || it.type === 'gift') { it.vx = G.mouse.vx * 0.5; it.vy = G.mouse.vy * 0.5; }
      press = null; PP.save.soon(); PP.refreshInteractive(); return;
    }
    if (!press) return;
    const pr = press; press = null;
    if (pr.pet) {
      const now = performance.now();
      if (lastClick.pet === pr.pet && now - lastClick.t < 320) {
        lastClick.pet = null;
        pr.pet.pokeTimes.pop(); // 双击不算两次戳
        if (!pr.pet.sleeping && pr.pet.sulk <= 0) pr.pet.run('trick', PP.ACTIONS.trick);
        return;
      }
      lastClick = { pet: pr.pet, t: now };
      poke(pr.pet);
    } else if (pr.item) clickItem(pr.item);
  }

  function poke(p) {
    if (p.edgePeek) { p.edgePeek = null; return; } // 点一下躲着的小家伙：它就出来了
    const now = Date.now();
    p.pokeTimes = p.pokeTimes.filter((t) => now - t < 6000);
    p.pokeTimes.push(now);
    p.d.stats.pokes++; p.count('pokes');
    if (p.action === 'handNap') return;
    if (p.d.species === 'hedgehog' && !p.sleeping && (p.affLevel < 3 || Math.random() < 0.5)) { p.run('curl', PP.ACTIONS.curl, U.rand(2, 4)); return; }
    p.run('poked', PP.ACTIONS.poked);
  }

  function clickItem(it) {
    const S = G.S;
    switch (it.type) {
      case 'food': case 'water':
        if (it.level > 0.95) { PP.ui.toast(it.type === 'food' ? '饭碗是满的' : '水碗是满的', 'info'); break; }
        it.level = 1;
        for (let i = 0; i < 6; i++) PP.fx({ kind: 'dot', x: it.x + U.rand(-10, 10), y: it.y - 8 * S, vx: U.rand(-40, 40), vy: U.rand(-120, -60), grav: 500, life: 0.6, col: it.type === 'food' ? '#c98a4a' : '#7cc8ff', size: S });
        PP.diary.add(null, it.type === 'food' ? '添了猫粮。' : '换了新的水。', 'care');
        G.pets.forEach((p) => { if (!p.sleeping && Math.abs(p.x - it.x) < 400) { p.look = [Math.sign(it.x - p.x), 1]; if (p.action === 'eat' || p.action === 'drink') p.addAff(1); } });
        PP.audio && PP.audio.pour();
        break;
      case 'litter':
        if (it.data.dirty) { it.data.dirty = 0; PP.puff(it.x, it.y, 6); PP.ui.toast('猫砂盆干净了', 'info'); G.pets.forEach((p) => p.n.fun = Math.min(100, p.n.fun + 2)); }
        break;
      case 'poop':
        it.dead = true; PP.puff(it.x, it.y, 5);
        PP.diary.add(null, '有人帮我们打扫了便便。', 'care');
        break;
      case 'gift': {
        it.dead = true;
        const g = it.data.gift;
        G.save.collection[g] = (G.save.collection[g] || 0) + 1;
        const from = G.pets.find((p) => p.d.id === it.data.from);
        PP.ui.toast(`收到了${PP.GIFTS[g].name}${from ? `（来自${from.name}）` : ''}`, 'gift');
        if (from) { from.addAff(2); PP.hearts(from.x, from.headPos[1] - 20, 2); from.d.stats.gifts++; }
        PP.hearts(it.x, it.y - 20, 2);
        PP.save.soon();
        break;
      }
      case 'egg': PP.events.warmEgg(it); break;
      case 'ball': it.vx = U.rand(-1, 1) > 0 ? 420 : -420; it.vy = -380; it.y -= 1; break;
      case 'cup': it.vx = (it.x < G.W / 2 ? 1 : -1) * 120; break;
      case 'bed':
        G.pets.forEach((p) => { if (!p.sleeping && p.n.energy < 70) p.run('sleep', PP.ACTIONS.sleep); });
        break;
    }
  }

  // ---------- 每帧：摸摸衰减、停在身上不动 ----------
  PP.interactTick = function (dt) {
    if (G.bar) PP.refreshInteractive();
    for (const p of G.pets) {
      if (p.petting > 0) p.petting -= dt;
      if (p.purr > 0) { p.purr -= dt; if (G.save.settings.sound && Math.random() < dt * 2) PP.audio.purr(p); }
    }
    // 鼠标静止停在它身上 → 手心里睡着
    const p = G.hoverPet;
    if (p && !press && Date.now() - G.mouse.lastMove > 15000 && p.affLevel >= 3 && !p.sleeping && !['handNap', 'eat', 'drink', 'toilet'].includes(p.action) && p.n.energy < 85) {
      p.run('handNap', PP.ACTIONS.handNap);
    }
  };

  // ---------- 绑定 ----------
  PP.bindInput = function () {
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => { markActive(); if (!api && PP.F && !e.target.closest('.panel,.menu')) PP.F.onWheel(e.deltaY); }, { passive: true });
    document.addEventListener('mouseleave', () => { G.mouse.onScreen = false; G.hoverPet = null; });
    window.addEventListener('blur', () => { if (dragPet) { dragPet.drop(0, 0); dragPet = null; } press = null; });
    window.addEventListener('keydown', (e) => {
      markActive();
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      G.user.lastKey = Date.now();
      if (!G.user.typing) { G.user.typing = true; G.user.typingSince = Date.now(); }
      if (!api && PP.F) PP.F.onKey();
      konami.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      konami = konami.slice(-10);
      if (konami.join(',') === KONAMI.join(',')) { konami = []; PP.events.konami(); }
      if (e.key === 'Escape') { PP.ui.closeAll(); PP.exitFull && PP.exitFull(); if (G.editing) PP.scene.edit(false); }
    });
    // 桌面版：主进程转发全局鼠标位置、系统空闲时间（推测是否在打字）
    if (api) {
      api.onCursor((pt) => { if (!press && !dragPet) onMove(pt.x, pt.y); });
      if (api.onKey) api.onKey(() => { markActive(); G.user.lastKey = Date.now(); if (!G.user.typing) { G.user.typing = true; G.user.typingSince = Date.now(); } PP.F && PP.F.onKey(); });
      if (api.onWheel) api.onWheel((dy) => { markActive(); PP.F && PP.F.onWheel(dy); });
      api.onIdle((sec) => {
        const now = Date.now();
        if (sec < 1) {
          markActive();
          // 键鼠在活动，但鼠标没动 → 多半在打字
          if (now - G.mouse.lastMove > 1500) { G.user.lastKey = now; if (!G.user.typing) { G.user.typing = true; G.user.typingSince = now; } }
        }
      });
    }
  };
  PP.typingTick = function () {
    if (G.user.typing && Date.now() - G.user.lastKey > 2500) G.user.typing = false;
  };
})();
