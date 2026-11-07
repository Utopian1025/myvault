// 显示模式 + 悬浮小按钮 + 宠物头顶的快捷工具条 + 多选显示/隐藏 + 天气城市设置
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const api = window.petAPI;
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = () => G.save.settings;
  const MODE_NAME = Object.fromEntries(PP.MODES.map((m) => [m[0], m[1]]));

  // ---------- 显示模式 ----------
  PP.setMode = function (m, quiet) {
    const s = S(), old = s.mode;
    if (!MODE_NAME[m] || old === m) return;
    if (m === 'mini') {
      const main = PP.F && PP.F.main();
      s.miniMain = main ? main.d.id : null;
      s.mode = 'mini';
      // 其他小伙伴走进小门里，只留主角
      for (const p of G.pets) if (p !== main && !p.outing) PP.petEnter(p, () => PP.syncPets());
      for (const p of G.pets) if (p.outing) p.outing = null;
      PP.syncPets();
      setTimeout(() => PP.syncPets(), 5000);
    } else {
      s.lastMode = m; s.mode = m;
      if (old === 'mini') {
        const before = new Set(G.pets);
        PP.syncPets();
        G.pets.filter((p) => !before.has(p)).forEach((p, i) => PP.petEmerge(p, U.rand(G.W * 0.15, G.W * 0.85), 200 + i * 380));
      }
    }
    if (!quiet) PP.ui.toast({ full: '全屏场景：整块屏幕都是森林（随时点小按钮收起）', band: '小场景：只在任务栏上方一条', clear: '透明：只有宠物，没有场景', mini: '极简：只留主角陪着你，再点一下小按钮恢复' }[m]);
    drawOrb(); PP.refreshInteractive(); PP.save.soon(); PP.syncTray && PP.syncTray(true);
  };
  PP.toggleMini = () => PP.setMode(S().mode === 'mini' ? (S().lastMode && S().lastMode !== 'mini' ? S().lastMode : 'band') : 'mini');
  PP.showItems = () => S().mode !== 'mini';

  // ---------- 悬浮小按钮：平时几乎透明，可以拖到任何地方 ----------
  let orb = null, pop = null, popT = 0;
  function initOrb() {
    orb = $(`<div class="orb" title="点一下：收起 / 展开（只留主角）&#10;拖动：换个位置&#10;鼠标停留：切换显示模式"><canvas width="12" height="12"></canvas></div>`);
    document.getElementById('ui').appendChild(orb);
    placeOrb();
    let down = null;
    orb.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      down = { x: e.clientX, y: e.clientY, ox: orb.offsetLeft, oy: orb.offsetTop, moved: false };
      G.uiDrag = true;
      const mv = (ev) => {
        if (!down) return;
        if (Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 4) { down.moved = true; hidePop(); }
        if (down.moved) { orb.style.left = U.clamp(down.ox + ev.clientX - down.x, 2, G.W - 34) + 'px'; orb.style.top = U.clamp(down.oy + ev.clientY - down.y, 2, G.H - 34) + 'px'; }
      };
      const up = () => {
        window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up);
        G.uiDrag = false;
        if (down && down.moved) { S().orb = { x: orb.offsetLeft / G.W, y: orb.offsetTop / G.H }; PP.save.soon(); }
        else if (down) { hidePop(); PP.toggleMini(); }
        down = null; PP.refreshInteractive();
      };
      window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    });
    orb.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); const r = orb.getBoundingClientRect(); PP.ui.menu(PP.menuModel(null), r.left, r.top - 4); });
    orb.addEventListener('mouseenter', () => { popT = setTimeout(showPop, 450); });
    orb.addEventListener('mouseleave', () => { clearTimeout(popT); setTimeout(() => { if (pop && !pop.matches(':hover') && !orb.matches(':hover')) hidePop(); }, 350); });
    window.addEventListener('resize', placeOrb);
    drawOrb();
  }
  function placeOrb() {
    if (!orb) return;
    const o = S().orb;
    orb.style.left = (o ? U.clamp(o.x * G.W, 2, G.W - 34) : G.W - 46) + 'px';
    orb.style.top = (o ? U.clamp(o.y * G.H, 2, G.H - 34) : G.H - 46 - Math.max(120, PP.scene.height())) + 'px';
  }
  // 小图标：一扇小门（极简模式下门是关着的）
  function drawOrb() {
    if (!orb) return;
    const c = orb.querySelector('canvas').getContext('2d');
    const m = S().mode;
    c.clearRect(0, 0, 12, 12);
    const P = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    P(2, 1, '#111', 8, 11); P(3, 2, m === 'mini' ? '#c48a52' : '#2a3550', 6, 10);
    if (m !== 'mini') { P(3, 2, '#ffcf33', 2, 10); P(5, 5, '#7cc35a', 3, 7); P(6, 3, '#4c9640', 1, 2); }
    else { P(7, 7, '#ffd84a'); for (let y = 3; y < 12; y += 2) P(3, y, '#b07a46', 6, 1); }
    orb.classList.toggle('mini', m === 'mini');
  }
  function showPop() {
    hidePop();
    const s = S();
    pop = $(`<div class="orb-pop"><div class="modes">${PP.MODES.map(([k, n, d]) => `<button class="small ${s.mode === k ? 'on' : ''}" data-m="${k}" title="${d}">${n}</button>`).join('')}</div>
      <div class="scenes">${Object.entries(PP.SCENES).map(([k, v]) => `<button class="small ${s.scene === k && PP.scene.active() ? 'on' : ''}" data-s="${k}">${v.name}</button>`).join('')}</div>
      <div class="env">${esc(PP.env.label())}</div></div>`);
    document.getElementById('ui').appendChild(pop);
    const r = orb.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    pop.style.left = U.clamp(r.left + r.width / 2 - pr.width / 2, 4, G.W - pr.width - 4) + 'px';
    pop.style.top = (r.top - pr.height - 6 > 4 ? r.top - pr.height - 6 : r.bottom + 6) + 'px';
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.m) PP.setMode(b.dataset.m);
      if (b.dataset.s) PP.scene.go(b.dataset.s);
      hidePop();
    });
    pop.addEventListener('mouseleave', () => setTimeout(() => { if (pop && !pop.matches(':hover') && !orb.matches(':hover')) hidePop(); }, 300));
    PP.refreshInteractive();
  }
  function hidePop() { if (pop) { pop.remove(); pop = null; PP.refreshInteractive(); } }

  // ---------- 指着宠物时，头顶冒出一排小按钮 ----------
  let bar = null, barPet = null, hoverSince = 0, lastHover = null, hideT = 0;
  const BTN = [
    ['hide', '回', '回电脑里（隐藏它）'], ['calm', '乖', '乖乖待着（不乱跑不乱跳）'], ['head', '头', '只露个头'], ['main', '★', '设为主角'],
    ['fav', '喂', '喂它最爱吃的'], ['menu', '☰', '更多…'], ['pick', '选', '选择谁在桌面上（多选）'],
  ];
  function barTick() {
    if (!G.save) return;
    const hp = G.hoverPet;
    const over = bar && bar.matches(':hover');
    if (hp !== lastHover) { lastHover = hp; hoverSince = performance.now(); }
    const menuOpen = !!document.querySelector('.menu');
    if (hp && !G.editing && !menuOpen && performance.now() - hoverSince > 280 && hp !== barPet) showBar(hp);
    if (bar && !hp && !over) { if (!hideT) hideT = performance.now(); if (performance.now() - hideT > 650) hideBar(); } else hideT = 0;
    if (bar && barPet) {
      if (!G.pets.includes(barPet) || barPet.inDoor || barPet.outing || barPet.held) { hideBar(); return; }
      const [hx, hy] = barPet.headPos, r = bar.getBoundingClientRect();
      bar.style.left = U.clamp(hx - r.width / 2, 4, G.W - r.width - 4) + 'px';
      bar.style.top = U.clamp(hy - 22 * G.S - r.height, 4, G.H - r.height - 4) + 'px';
      const d = barPet.d;
      bar.querySelector('[data-c=calm]').classList.toggle('on', !!d.calm);
      bar.querySelector('[data-c=head]').classList.toggle('on', !!d.headOnly);
      bar.querySelector('[data-c=main]').classList.toggle('on', PP.F.main() === barPet);
    }
  }
  function showBar(p) {
    hideBar();
    barPet = p;
    const favScene = PP.SCENES[PP.scene.fav(p)].name;
    bar = $(`<div class="hoverbar"><i>${esc(p.name)} · 爱去${favScene}</i>${BTN.map(([c, t, tip]) => `<button data-c="${c}" title="${tip}">${t}</button>`).join('')}</div>`);
    document.getElementById('ui').appendChild(bar);
    bar.addEventListener('mousedown', (e) => e.stopPropagation());
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !barPet) return;
      const id = barPet.d.id, c = b.dataset.c;
      if (c === 'hide') { PP.menuRun(`pet:${id}:show`); hideBar(); }
      else if (c === 'menu') { const r = b.getBoundingClientRect(); const p = barPet; hideBar(); PP.ui.petMenu(p, r.left, r.top); }
      else if (c === 'pick') { hideBar(); pickPets(); }
      else PP.menuRun(`pet:${id}:${c}`);
    });
    PP.refreshInteractive();
  }
  function hideBar() { if (bar) { bar.remove(); bar = null; barPet = null; PP.refreshInteractive(); } }

  // ---------- 一次选好谁在桌面上 ----------
  function pickPets() {
    const body = $(`<div class="pick"><p class="lead">勾上的留在桌面，没勾的回电脑里休息（存档还在，随时叫出来）。</p>
      <div class="row tools"><button class="small" data-a="all">全选</button><button class="small" data-a="none">全不选</button><button class="small" data-a="inv">反选</button><button class="small" data-a="main">只留主角</button><button class="small" data-a="fav">只留喜欢这里的</button></div>
      <div class="list"></div><div class="row"><button class="primary" data-a="ok">好了</button></div></div>`);
    const list = body.querySelector('.list');
    const main = PP.F.main();
    for (const p of G.all) {
      const sp = p.sp, here = PP.scene.fav(p) === S().scene;
      const row = $(`<label class="pick-row"><input type="checkbox" ${p.d.hidden ? '' : 'checked'} data-id="${p.d.id}"><canvas width="72" height="72"></canvas><span><b>${esc(p.name)}</b>${main === p ? ' ★' : ''}<br><small class="muted">${esc(sp.name)} · 爱去${PP.SCENES[PP.scene.fav(p)].name}${here ? '（就是这儿）' : ''}</small></span></label>`);
      try { const c = row.querySelector('canvas').getContext('2d'); c.imageSmoothingEnabled = false; PP.SPR.blit(c, PP.SPR.drawPet({ species: p.d.species, pal: p.pal, coatKey: p.d.coat, facing: 1, anim: 'idle', t: 0, eyes: 'open', look: [0, 0], mouth: 'w', lop: p.d.lop }), 4, 4, 2); } catch (e) { row.querySelector('canvas').remove(); }
      list.appendChild(row);
    }
    const boxes = () => [...list.querySelectorAll('input')];
    body.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'all') boxes().forEach((x) => (x.checked = true));
      if (a === 'none') boxes().forEach((x) => (x.checked = false));
      if (a === 'inv') boxes().forEach((x) => (x.checked = !x.checked));
      if (a === 'main') { const m = PP.F.main() || G.all.find((p) => p.d.id === S().mainId); boxes().forEach((x) => (x.checked = m && x.dataset.id === m.d.id)); }
      if (a === 'fav') boxes().forEach((x) => { const p = G.all.find((q) => q.d.id === x.dataset.id); x.checked = PP.scene.fav(p) === S().scene; });
      if (a === 'ok') { apply(Object.fromEntries(boxes().map((x) => [x.dataset.id, x.checked]))); PP.ui.closePanel(); }
    });
    PP.ui.panel('谁在桌面上', body);
  }
  function apply(want) {
    const s = S();
    if (s.allAway) { s.allAway = false; }
    const toShow = G.all.filter((p) => want[p.d.id] && p.d.hidden);
    const toHide = G.all.filter((p) => !want[p.d.id] && !p.d.hidden);
    if (s.mode === 'mini' && toShow.length + G.all.filter((p) => want[p.d.id] && !p.d.hidden).length > 1) { s.mode = s.lastMode && s.lastMode !== 'mini' ? s.lastMode : 'band'; drawOrb(); }
    toHide.forEach((p) => { if (G.pets.includes(p)) PP.petEnter(p, () => { p.d.hidden = true; PP.syncPets(); PP.save.soon(); }); else p.d.hidden = true; });
    const before = new Set(G.pets);
    toShow.forEach((p) => (p.d.hidden = false));
    PP.syncPets();
    G.pets.filter((p) => !before.has(p)).forEach((p, i) => PP.petEmerge(p, U.rand(G.W * 0.15, G.W * 0.85), 150 + i * 400));
    PP.ui.toast(`桌面上：${G.all.filter((p) => want[p.d.id]).length} 只，回电脑休息：${G.all.filter((p) => !want[p.d.id]).length} 只`);
    PP.save.soon(); PP.syncTray && PP.syncTray(true);
  }
  PP.pickPets = pickPets;

  // ---------- 天气：设置所在城市 ----------
  function cityPanel() {
    const s = S();
    const body = $(`<div class="city"><p class="lead">场景里的天气、日出日落会跟着这个城市实时变化（数据来自 Open-Meteo，免费、不需要账号，只发送城市坐标）。</p>
      <div class="row"><input class="q" placeholder="城市名，比如：杭州" value="${esc(s.city ? s.city.name : '')}" style="flex:1"><button class="small" data-a="s">搜索</button></div>
      <div class="res"></div>
      <p class="now muted">现在：${esc(PP.env.label())}</p>
      <div class="row"><button class="small" data-a="clear" ${s.city ? '' : 'disabled'}>不用实时天气（按季节模拟）</button></div></div>`);
    const res = body.querySelector('.res'), q = body.querySelector('.q');
    const search = async () => {
      res.innerHTML = '<p class="muted">搜索中…</p>';
      try {
        const list = await PP.env.searchCity(q.value.trim());
        res.innerHTML = list.length ? '' : '<p class="muted">没找到，换个写法试试（中文或拼音都行）</p>';
        list.forEach((c) => { const b = $(`<button class="small city-pick">${esc(c.name)} <span class="muted">${esc(c.area)}</span></button>`); b.onclick = async () => { s.city = c; s.weather = 'auto'; PP.save.soon(); res.innerHTML = '<p class="muted">获取天气…</p>'; await PP.env.refresh(); body.querySelector('.now').textContent = '现在：' + PP.env.label(); res.innerHTML = `<p>已设为 <b>${esc(c.name)}</b>${PP.env.liveError ? '（' + esc(PP.env.liveError) + '）' : ''}</p>`; PP.syncTray && PP.syncTray(true); }; res.appendChild(b); });
      } catch (e) { res.innerHTML = '<p class="muted">网络不通，稍后再试</p>'; }
    };
    body.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.a === 's') search(); if (b.dataset.a === 'clear') { s.city = null; PP.save.soon(); PP.ui.closePanel(); PP.ui.toast('天气改为按季节模拟'); } });
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
    PP.ui.panel('天气与位置', body);
    setTimeout(() => q.focus(), 50);
  }
  PP.cityPanel = cityPanel;

  // ---------- 菜单大小 ----------
  PP.MENU_SCALES = [[0.75, '小'], [0.85, '适中'], [1, '标准'], [1.15, '大']];
  function applyMenuScale() { document.documentElement.style.setProperty('--ms', String(S().menuScale || 0.85)); }
  PP.applyMenuScale = applyMenuScale;

  // ---------- 菜单：点别处就收起（点击会穿透到你的其他窗口） ----------
  let outsideSince = 0;
  function menuWatch() {
    const menus = document.querySelectorAll('.menu');
    if (!menus.length) { outsideSince = 0; return; }
    const over = [...menus].some((m) => m.matches(':hover'));
    if (over) { outsideSince = 0; return; }
    if (!outsideSince) outsideSince = performance.now();
    if (performance.now() - outsideSince > 2500) { PP.ui.closeMenu(); outsideSince = 0; }
  }
  if (api && api.onGlobalDown) api.onGlobalDown(() => {
    setTimeout(() => {
      if (document.querySelector('.menu') && ![...document.querySelectorAll('.menu')].some((m) => m.matches(':hover'))) PP.ui.closeMenu();
      if (pop && !pop.matches(':hover') && !orb.matches(':hover')) hidePop();
    }, 30);
  });

  PP.modes = {
    init() { applyMenuScale(); initOrb(); setInterval(barTick, 60); setInterval(menuWatch, 300); },
    drawOrb, hideBar, placeOrb,
  };
})();
