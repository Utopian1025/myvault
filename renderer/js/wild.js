// 野生动物 & 认养：世界里默认住满了野生动物，喜欢哪只就认养它、给它取名字（不限数量）
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 每种动物在世界里大概有几只（喜欢成群的多一点）
  const TARGET = { bat: 3, penguin: 3, zebra: 3, antelope: 3, sheep: 3, meerkat: 3, gardeneel: 4, chick: 3, duck: 2, parrot: 2, seagull: 2, cow: 2, monkey: 2, deer: 2, yak: 2, alpaca: 2, hippo: 2, lion: 2 };
  const SKIP = new Set(['dragon']); // 小龙只能从蛋里孵出来
  const mine = (p) => p && !p.d.wild;
  PP.isMine = mine;
  PP.mine = () => G.all.filter(mine);

  // 以前认养的：搬进小天地（离不开水的除外）
  function moveInOld() { for (const p of G.all) if (!p.d.wild && !p.d.ownHome && PP.canMoveIn && PP.canMoveIn(p)) { p.d.ownHome = 'skyisle'; p.d.scene = 'skyisle'; p.d.inHome = false; } }
  function populate() {
    moveInOld();
    let made = 0;
    for (const sp of PP.SPECIES_LIST) {
      if (SKIP.has(sp) || !PP.HAB || !PP.HAB[sp]) continue;
      const want = TARGET[sp] || 1, have = G.all.filter((p) => p.d.species === sp).length;
      for (let i = have; i < want; i++) {
        const p = PP.Pet.create(sp, null, PP.SPECIES[sp].name, { shiny: Math.random() < 1 / 60 });
        p.d.wild = true;
        G.all.push(p);
        PP.eco && PP.eco.adopted(p);
        made++;
      }
    }
    return made;
  }

  // 认养：给它取个名字，从此它就是你的了（还是住在自己的家里、过自己的日子）
  function adoptPanel(p) {
    const ui = PP.ui;
    const box = $(`<div class="adopt-wild"><div class="top"><canvas width="96" height="96"></canvas><div><p><b>${esc(p.sp.name)}</b>${p.d.shiny ? ' ✨罕见花色' : ''}<br><span class="muted">${esc(PP.SPR.PAL[p.d.species][p.d.coat] ? PP.SPR.PAL[p.d.species][p.d.coat].name : '')} · 住在${esc(PP.SCENES[PP.HAB[p.d.species].home].name)}的${esc(PP.HOME_NAME[p.d.species] || '家')}</span></p>
      <p class="muted" style="line-height:1.5">${PP.canMoveIn(p) ? '认养以后它会搬进「我的」，住进一间属于它的小屋。选一个地方：' : '它离不开水，认养以后还是住在原来的家；你给它取名字，它会更亲近你。'}</p>
      ${PP.canMoveIn(p) ? `<div class="row homes">${PP.MINE.map((k, i) => `<button class="small ${i === 0 ? 'on' : ''}" data-h="${k}">${esc(PP.SCENES[k].name)}</button>`).join('')}</div>` : ''}</div></div>
      <div class="row"><input class="nm" maxlength="12" placeholder="给它取个名字"><button class="small dice" title="随机一个">🎲</button></div>
      <div class="row"><button class="primary go">认养</button></div></div>`);
    const nm = box.querySelector('.nm'); nm.value = PP.randomName();
    box.querySelector('.dice').onclick = () => (nm.value = PP.randomName());
    try { const c = box.querySelector('canvas').getContext('2d'); c.imageSmoothingEnabled = false; PP.SPR.blit(c, PP.SPR.drawPet({ species: p.d.species, pal: p.pal, coatKey: p.d.coat, facing: 1, anim: 'idle', t: 0, eyes: 'happy', look: [0, 0], mouth: 'smile' }), 0, 0, 3); } catch (e) { }
    let where = PP.MINE[0];
    box.querySelectorAll('.homes button').forEach((b) => (b.onclick = () => { where = b.dataset.h; box.querySelectorAll('.homes button').forEach((x) => x.classList.toggle('on', x === b)); }));
    box.querySelector('.go').onclick = () => {
      const name = nm.value.trim() || PP.randomName();
      p.d.wild = false; p.d.name = name; p.d.adoptedAt = Date.now();
      if (PP.canMoveIn(p)) { p.d.ownHome = where; p.d.scene = where; PP.eco.adopted(p); if (G.pets.includes(p) && PP.scene.view() !== where) p.hidden = false; }
      p.d.affection = Math.max(p.d.affection, 15); p.d.trust = Math.max(p.d.trust, 60);
      if (!G.save.flags.firstAdopt) G.save.flags.firstAdopt = Date.now();
      PP.diary.add(p, `今天被认养了，名字叫${name}。`, 'love');
      if (G.pets.includes(p)) { PP.hearts(p.x, p.y - 30 * G.S, 4); p._forceSay = true; p.say(U.pick(['以后就叫我' + name + '啦', '（开心地转圈）', '你好呀～']), 2.5); p._forceSay = false; }
      // 没有指定陪伴你的那只：就是它了
      if (!G.save.settings.mainId || !G.all.some((q) => q.d.id === G.save.settings.mainId && mine(q))) G.save.settings.mainId = p.d.id;
      ui.closePanel(); ui.toast(p.d.ownHome ? `认养了${name}（${p.sp.name}），它搬去了你的${PP.SCENES[p.d.ownHome].name}` : `认养了${name}（${p.sp.name}）`);
      PP.save.write(); PP.syncTray && PP.syncTray(true);
    };
    ui.panel('认养', box);
    setTimeout(() => { nm.focus(); nm.select(); }, 50);
  }
  // 放生：回到野外（名字和日记留着）
  function release(p) {
    p.d.wild = true; p.d.name = p.sp.name; if (p.d.ownHome) { p.d.ownHome = null; PP.eco.adopted(p); }
    if (G.save.settings.mainId === p.d.id) G.save.settings.mainId = (PP.mine()[0] || {}).d ? PP.mine()[0].d.id : null;
    PP.ui.toast(`${p.sp.name}回到了野外`); PP.save.soon(); PP.syncTray && PP.syncTray(true);
  }

  // 搬家：在你的几个小天地之间换地方住
  PP.moveHome = function (p) {
    if (!PP.canMoveIn(p)) { PP.ui.toast('它离不开水，没法搬进「我的」'); return; }
    const box = $(`<div class="adopt-wild"><p>让${esc(p.name)}搬到哪里住？</p><div class="row homes">${PP.MINE.map((k) => `<button class="small ${p.d.ownHome === k ? 'on' : ''}" data-h="${k}">${esc(PP.SCENES[k].name)}</button>`).join('')}</div></div>`);
    box.querySelectorAll('.homes button').forEach((b) => (b.onclick = () => { p.d.ownHome = b.dataset.h; p.d.scene = b.dataset.h; PP.eco.adopted(p); PP.ui.closePanel(); PP.ui.toast(`${p.name}搬去了${PP.SCENES[b.dataset.h].name}`); PP.save.soon(); }));
    PP.ui.panel('搬家', box);
  };
  // 现在每个地方都有谁（按物种合在一起，认养的写名字）
  function census() {
    const out = {};
    for (const k of Object.keys(PP.SCENES)) out[k] = {};
    for (const p of G.all) {
      if (p.d.hidden) continue;
      const sc = p.d.scene || PP.HOME_SCENE[p.d.species];
      if (!sc || !out[sc]) continue;
      const k = p.d.species, o = (out[sc][k] = out[sc][k] || { n: 0, names: [], home: 0 });
      o.n++; if (mine(p)) o.names.push(p.name); if (p.d.inHome) o.home++;
    }
    return out;
  }
  function censusText(sc, c) {
    const parts = Object.entries(c || census()[sc] || {}).map(([k, o]) => `${PP.SPECIES[k].name}${o.n > 1 ? '×' + o.n : ''}${o.names.length ? '（' + o.names.join('、') + '）' : ''}`);
    return parts.join(' · ');
  }

  // ---------- 喂食 / 喂水：直接喂到它嘴边（不用你去添碗） ----------
  PP.feedPet = function (p, what) {
    const food = what !== 'water', water = what !== 'food';
    if (food) p.n.hunger = 100;
    if (water) p.n.thirst = 100;
    p.d.stats.feeds = (p.d.stats.feeds || 0) + 1;
    p.addAff && p.addAff(food ? 1.5 : 0.8);
    p.d.trust = Math.min(100, (p.d.trust || 50) + 1);
    if (G.pets.includes(p) && !p.held) { p.interrupt(true); p.run('fed', A.fed, what); }
    PP.save.soon();
  };
  const A = PP.ACTIONS;
  A.fed = function* (what) {
    const p = this;
    if (p.sleeping) { p.sleeping = false; p.eyes = 'open'; yield 0.4; }
    const icon = what === 'water' ? 'drop' : p.sp.favIcon || 'heart';
    const hx = p.x + p.facing * 6 * G.S, hy = p.y - 30 * G.S;
    PP.fx({ kind: 'icon', icon, x: hx, y: hy - 40, vx: 0, vy: 60, life: 0.7, s: Math.max(1, G.S) });
    yield 0.6;
    p.anim = what === 'water' ? 'drink' : 'eat'; p.mouth = 'chew'; p.eyes = 'closed';
    yield what === 'both' ? 2.6 : 1.8;
    p.anim = 'idle'; p.mouth = 'w'; p.eyes = 'happy';
    PP.hearts(p.x, p.y - 30 * G.S, what === 'water' ? 1 : 2);
    if (Math.random() < 0.6) { p._forceSay = true; p.say(what === 'water' ? U.pick(['咕嘟咕嘟', '好解渴！', '（舔舔嘴）']) : U.pick(PP.LINES.fav || ['好吃！']), 2); p._forceSay = false; }
    yield 1.2; p.eyes = 'open';
  };

  // ---------- 改名字 ----------
  PP.renamePanel = function (p) {
    const box = $(`<div class="settings"><div class="row"><input class="t" maxlength="12" value="${esc(p.name)}"><button class="small dice">🎲</button></div><div class="row"><button class="primary ok">好了</button></div></div>`);
    const inp = box.querySelector('.t');
    box.querySelector('.dice').onclick = () => (inp.value = PP.randomName());
    const done = () => { const v = inp.value.trim(); if (v) { p.d.name = v; PP.save.soon(); PP.syncTray && PP.syncTray(true); } PP.ui.closePanel(); };
    box.querySelector('.ok').onclick = done; inp.onkeydown = (e) => { if (e.key === 'Enter') done(); };
    PP.ui.panel(`给${p.sp.name}改名字`, box); setTimeout(() => inp.focus(), 50);
  };
  // ---------- 睡眠时间（自定义） ----------
  PP.sleepPanel = function () {
    const s = G.save.settings, sm = s.sleepMode || { from: 23, to: 7 };
    const opt = (v) => Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${h === v ? 'selected' : ''}>${h}:00</option>`).join('');
    const box = $(`<div class="settings"><p class="lead">在这段时间里：大家都回去睡觉，不说话、不出声（环境声也关掉），极简模式的伙伴也趴下睡着。</p>
      <div class="row">从 <select class="a">${opt(sm.from)}</select> 到 <select class="b">${opt(sm.to)}</select></div>
      <div class="row"><button class="primary ok">开启</button><button class="small off">关闭</button></div></div>`);
    box.querySelector('.ok').onclick = () => { s.sleepMode = { on: true, from: +box.querySelector('.a').value, to: +box.querySelector('.b').value }; PP.save.soon(); PP.syncTray && PP.syncTray(true); PP.ui.closePanel(); PP.ui.toast(`睡眠时间：${s.sleepMode.from}:00–${s.sleepMode.to}:00`); };
    box.querySelector('.off').onclick = () => { s.sleepMode = Object.assign({}, sm, { on: false }); PP.save.soon(); PP.syncTray && PP.syncTray(true); PP.ui.closePanel(); };
    PP.ui.panel('睡眠时间', box);
  };
  // 现在是不是睡眠时间
  PP.sleepTime = function () {
    const sm = G.save && G.save.settings.sleepMode;
    if (!sm || !sm.on) return false;
    const h = new Date().getHours();
    return sm.from <= sm.to ? h >= sm.from && h < sm.to : h >= sm.from || h < sm.to;
  };

  PP.wild = { populate, adoptPanel, release, census, censusText, TARGET };
})();
