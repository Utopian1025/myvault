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
      // 主角：你指定的那只；没指定就挑一只醒着、在外面的
      const main = (s.mainId && G.all.find((p) => p.d.id === s.mainId && !p.d.hidden)) || PP.F.main() || G.all.find((p) => !p.d.hidden);
      s.miniMain = main ? main.d.id : null;
      // 场景里的动物继续在后台过日子，只有主角跟你来
      for (const p of G.pets) if (p !== main) PP.eco.toOffscreen(p);
      s.mode = 'mini';
      if (main) {
        const wasShown = G.pets.includes(main);
        if (main.d.inHome) { main.d.inHome = false; main.eco = null; }
        main.eco = null; main.surf = null; main.wade = 0; main.interrupt(true);
        PP.syncPets();
        if (!wasShown) PP.petEmerge(main, G.W - 120, 200);
        else { main.y = G.ground; main.run('trail', PP.ACTIONS.cornerWalk); }
      } else PP.syncPets();
    } else {
      s.lastMode = m; s.mode = m;
      if (old === 'mini') {
        // 主角回到你正在看的这个场景，其他动物原本就在各自的地方
        const main = G.all.find((p) => p.d.id === s.miniMain);
        if (main) { main.d.scene = PP.scene.view(); main.d.inHome = false; main.eco = null; main.lane = 0.8; }
      }
      PP.eco.onView(PP.scene.view());
    }
    if (!quiet) PP.ui.toast({ full: '全屏场景（Esc 退出，开始打字会自动收起）', band: '小场景', mini: '极简：只留主角在右下角' }[m]);
    drawOrb(); placeOrb(); setFullFlag(); PP.refreshInteractive(); PP.save.soon(); PP.syncTray && PP.syncTray(true);
  };
  function setFullFlag() { if (api && api.setFullMode) api.setFullMode(S().mode === 'full'); }
  PP.exitFull = () => { if (S().mode === 'full') PP.setMode('band'); };
  // 极简模式里，主角只在右下角这一小块活动（不跑到你干活的地方去）
  PP.miniZone = () => [Math.max(20, G.W - 300 * Math.max(1, G.S) / 2), G.W - 70];
  PP.toggleMini = () => PP.setMode(S().mode === 'mini' ? (S().lastMode && S().lastMode !== 'mini' ? S().lastMode : 'band') : 'mini');
  PP.showItems = () => true;

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
        if (down.moved) { S().orb = { x: U.clamp(down.ox + ev.clientX - down.x, 4, G.W - 70) / G.W, y: U.clamp(down.oy + ev.clientY - down.y, 2, G.H - 34) / G.H }; placeOrb(); }
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
  // 小门按钮 + 爪子菜单 放在一起：默认在场景右上角（场景里），没有场景时在右下角
  function placeOrb() {
    if (!orb) return;
    const o = S().orb, sh = PP.scene.bandHeight();
    // 爪子菜单按钮固定在切换按钮的右边，所以切换按钮最多放到离右边 70 像素
    const x = o ? U.clamp(o.x * G.W, 4, G.W - 70) : G.W - 78;
    const y = o ? U.clamp(o.y * G.H, 2, G.H - 34) : G.H - sh + 8;
    orb.style.left = x + 'px'; orb.style.top = y + 'px';
    const dock = document.querySelector('.dock');
    if (dock) { dock.style.left = x + 36 + 'px'; dock.style.top = y + 'px'; dock.style.bottom = 'auto'; dock.style.right = 'auto'; }
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
      <div class="seasons"><span>季节</span>${[['auto', '跟随日历'], ['spring', '春'], ['summer', '夏'], ['autumn', '秋'], ['winter', '冬']].map(([k, n]) => `<button class="small ${(s.seasonFix || 'auto') === k ? 'on' : ''}" data-season="${k}">${n}</button>`).join('')}</div>
      <div class="sound"><button class="small ${s.ambient ? 'on' : ''}" data-a="amb">${s.ambient ? '♪ 环境声：开' : '♪ 环境声：关'}</button>${[[0.25, '轻'], [0.5, '中'], [0.8, '响']].map(([v, n]) => `<button class="small ${s.ambient && (s.ambientVol != null ? s.ambientVol : 0.5) === v ? 'on' : ''}" data-vol="${v}" ${s.ambient ? '' : 'disabled'}>${n}</button>`).join('')}</div>
      <div class="env">${esc(PP.env.label())}</div></div>`);
    document.getElementById('ui').appendChild(pop);
    const r = orb.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    pop.style.left = U.clamp(r.left + r.width / 2 - pr.width / 2, 4, G.W - pr.width - 4) + 'px';
    pop.style.top = (r.top - pr.height - 6 > 4 ? r.top - pr.height - 6 : r.bottom + 6) + 'px';
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.m) PP.setMode(b.dataset.m);
      if (b.dataset.s) PP.scene.go(b.dataset.s);
      if (b.dataset.season) { S().seasonFix = b.dataset.season === 'auto' ? null : b.dataset.season; PP.save.soon(); PP.syncTray && PP.syncTray(true); showPop(); return; }
      if (b.dataset.a === 'amb') { PP.menuRun('ambient'); showPop(); return; }
      if (b.dataset.vol) { S().ambientVol = +b.dataset.vol; PP.save.soon(); showPop(); return; }
      hidePop();
    });
    pop.addEventListener('mouseleave', () => setTimeout(() => { if (pop && !pop.matches(':hover') && !orb.matches(':hover')) hidePop(); }, 300));
    PP.refreshInteractive();
  }
  function hidePop() { if (pop) { pop.remove(); pop = null; PP.refreshInteractive(); } }

  // ---------- 指着宠物时：一圈像素小图标环绕着它（不用文字，一眼就懂） ----------
  // 图标：10x10 像素图，k=黑 w=白 y=黄 r=红 g=绿 b=蓝 o=橙 p=粉
  const ICON = {
    hide: ['....kk....', '...kyyk...', '..kyyyyk..', '.kyyyyyyk.', 'kkkkkkkkkk', '.kwwwwwwk.', '.kwkkwwwk.', '.kwkkwkwk.', '.kwkkwwwk.', '.kkkkkkkk.'],
    calm: ['....kk....', '...k..k...', '...k..k...', '....kk....', '.kkkkkkkk.', '....kk....', 'k...kk...k', 'kk..kk..kk', '.kk.kk.kk.', '..kkkkkk..'],
    head: ['..........', '..........', '...kkkk...', '..kwwwwk..', '.kwkwwkwk.', '.kwkwwkwk.', 'bbbbbbbbbb', 'bbbbbbbbbb', '.b.b.b.b.b', '..........'],
    main: ['..........', 'k...kk...k', 'kk.kyyk.kk', 'kykyyyykyk', 'kyyyyyyyyk', 'kyyryyryyk', 'kyyyyyyyyk', 'kkkkkkkkkk', '..........', '..........'],
    menu: ['..........', '..........', '..........', '..........', 'kk..kk..kk', 'kk..kk..kk', '..........', '..........', '..........', '..........'],
    pick: ['kkkk......', 'kgwk.kkkkk', 'kkgk......', 'kkkk......', '..........', 'kkkk......', 'kgwk.kkkkk', 'kkgk......', 'kkkk......', '..........'],
    pet: ['..........', '.kk....kk.', 'kppk..kppk', 'kpppkkpppk', 'kppppppppk', '.kppppppk.', '..kppppk..', '...kppk...', '....kk....', '..........'],
    info: ['kkkkkkkkkk', 'kwwwwwwwwk', 'kwbbwwwwwk', 'kbbbbwkkwk', 'kwbbwwwwwk', 'kbbbbwkkwk', 'kwwwwwwwwk', 'kwkkkkkkwk', 'kwwwwwwwwk', 'kkkkkkkkkk'],
  };
  const ICOL = { k: '#231c20', w: '#ffffff', y: '#ffcf33', r: '#e33b3b', g: '#3fa34d', b: '#4b9bcc', o: '#ff8a2a', p: '#ff7aa0' };
  function drawIconTo(cv, name, p) {
    const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
    if (name === 'fav' && p) {
      // 喂：画它最爱吃的东西
      try {
        const [w, h] = PP.SPR.iconSize(p.sp.favIcon); const s = Math.max(1, Math.floor(16 / Math.max(w, h)));
        const x = Math.round((20 - w * s) / 2), y = Math.round((20 - h * s) / 2);
        // 先画一圈深色描边（白色的骨头、鱼之类在白按钮上也看得见）
        const t = document.createElement('canvas'); t.width = t.height = 20; const tc = t.getContext('2d'); tc.imageSmoothingEnabled = false;
        PP.SPR.drawIcon(tc, p.sp.favIcon, x, y, s);
        const o = document.createElement('canvas'); o.width = o.height = 20; const oc = o.getContext('2d');
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) oc.drawImage(t, dx, dy);
        oc.globalCompositeOperation = 'source-in'; oc.fillStyle = '#231c20'; oc.fillRect(0, 0, 20, 20);
        c.drawImage(o, 0, 0); c.drawImage(t, 0, 0); return;
      } catch (e) { name = 'pet'; }
    }
    const m = ICON[name] || ICON.menu;
    m.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { c.fillStyle = ICOL[ch]; c.fillRect(x * 2, y * 2, 2, 2); } }));
  }
  let ring = null, ringPet = null, hoverSince = 0, lastHover = null, hideT = 0;
  const BTN = [['info', '档案'], ['fav', '喂它'], ['main', '设为主角'], ['calm', '乖乖待着'], ['head', '只露个头'], ['hide', '回电脑里'], ['pick', '选择谁在桌面上'], ['menu', '更多']];
  Object.defineProperty(PP, 'ringPet', { get: () => ringPet });
  function barTick() {
    if (!G.save) return;
    const hp = G.hoverPet;
    const over = ring && ring.matches(':hover');
    if (hp !== lastHover) { lastHover = hp; hoverSince = performance.now(); }
    const menuOpen = !!document.querySelector('.menu');
    if (hp && !G.editing && !menuOpen && performance.now() - hoverSince > 250 && hp !== ringPet) showBar(hp);
    if (ring && !hp && !over) { if (!hideT) hideT = performance.now(); if (performance.now() - hideT > 800) hideBar(); } else hideT = 0;
    if (ring && ringPet) {
      if (!G.pets.includes(ringPet) || ringPet.inDoor || ringPet.held) { hideBar(); return; }
      const S = G.S * (ringPet.scaleMul || 1);
      const btns = ring.querySelectorAll('button'), n = btns.length;
      // 按钮大小跟着宠物大小走：宠物小（或者极简模式）按钮也小
      const bs = Math.round(U.clamp(16 + S * 4, 20, 30) * (G.save.settings.mode === 'mini' ? 0.85 : 1));
      ring.style.setProperty('--bs', bs + 'px');
      const cx = ringPet.x, cy = ringPet.y - 13 * S + ringPet.sinkPx() + (ringPet.wade || 0);
      // 弧的半径：保证按钮之间不挤在一起
      const span = Math.PI * 0.9;
      const R = Math.max(12 * S + bs * 0.9, ((n - 1) * bs * 1.12) / span);
      // 弧的方向：默认在头顶；贴着屏幕右边 / 左边 / 上边时往里转
      let mid = -Math.PI / 2;
      if (cx > G.W - R - bs) mid = -Math.PI * 0.78; else if (cx < R + bs) mid = -Math.PI * 0.22;
      if (cy - R < bs) mid = cx > G.W / 2 ? Math.PI : 0;
      btns.forEach((b, i) => {
        const a = mid - span / 2 + (span * i) / (n - 1);
        const x = U.clamp(cx + Math.cos(a) * R, bs / 2 + 2, G.W - bs / 2 - 2), y = U.clamp(cy + Math.sin(a) * R, bs / 2 + 2, G.H - bs / 2 - 2);
        b.style.left = x - bs / 2 + 'px'; b.style.top = y - bs / 2 + 'px';
      });
      const d = ringPet.d;
      ring.querySelector('[data-c=calm]').classList.toggle('on', !!d.calm);
      ring.querySelector('[data-c=head]').classList.toggle('on', !!d.headOnly);
      ring.querySelector('[data-c=main]').classList.toggle('on', PP.F.main() === ringPet);
    }
  }
  function showBar(p) {
    hideBar();
    ringPet = p;
    ring = $(`<div class="hoverbar petring">${BTN.map(([c, tip]) => `<button data-c="${c}" title="${tip}"><canvas width="20" height="20"></canvas></button>`).join('')}</div>`);
    ring.querySelectorAll('button').forEach((b) => drawIconTo(b.querySelector('canvas'), b.dataset.c, p));
    document.getElementById('ui').appendChild(ring);
    barTick();
    requestAnimationFrame(() => ring && ring.classList.add('in'));
    ring.addEventListener('mousedown', (e) => e.stopPropagation());
    ring.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !ringPet) return;
      const id = ringPet.d.id, c = b.dataset.c;
      if (c === 'hide') { PP.menuRun(`pet:${id}:show`); hideBar(); }
      else if (c === 'info') { const p = ringPet; hideBar(); PP.ui.petPanel(p); }
      else if (c === 'menu') { const r = b.getBoundingClientRect(); const p = ringPet; hideBar(); PP.ui.petMenu(p, r.left, r.top); }
      else if (c === 'pick') { hideBar(); pickPets(); }
      else { PP.menuRun(`pet:${id}:${c}`); b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 250); }
    });
    PP.refreshInteractive();
  }
  function hideBar() { if (ring) { ring.remove(); ring = null; ringPet = null; PP.refreshInteractive(); } }

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
    toShow.forEach((p) => { p.d.hidden = false; PP.hereNow(p); });
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
      <div class="row"><input class="q" placeholder="城市名，比如：泰安、山东泰安、杭州西湖区" value="${esc(s.city ? s.city.name : '')}" style="flex:1"><button class="small" data-a="s">搜索</button></div>
      <div class="res"></div>
      <p class="now muted">现在：${esc(PP.env.label())}</p>
      <div class="row"><button class="small" data-a="clear" ${s.city ? '' : 'disabled'}>不用实时天气（按季节模拟）</button></div></div>`);
    const res = body.querySelector('.res'), q = body.querySelector('.q');
    const search = async () => {
      res.innerHTML = '<p class="muted">搜索中…</p>';
      try {
        const list = await PP.env.searchCity(q.value.trim());
        res.innerHTML = list.length ? '' : '<p class="muted">没找到，试试只写城市名，比如「泰安」</p>';
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
  PP.MENU_SCALES = [[0.62, '很小'], [0.7, '小'], [0.8, '适中'], [0.9, '标准'], [1.05, '大']];
  function applyMenuScale() { document.documentElement.style.setProperty('--ms', String(S().menuScale || 0.8)); }
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
    init() { applyMenuScale(); initOrb(); setInterval(barTick, 50); setInterval(menuWatch, 300); setInterval(placeOrb, 1000); setFullFlag(); },
    drawOrb, hideBar, placeOrb,
  };
})();
