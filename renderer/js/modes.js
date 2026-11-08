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
    if (m === 'bar') { s.taskbar = true; if (old === 'mini') { applyBar(); drawOrb(); placeOrb(); PP.save.soon(); return; } m = 'mini'; }
    if (!MODE_NAME[m] || old === m) return;
    if (m === 'mini') {
      // 主角：你指定的那只；没指定就挑一只醒着、在外面的
      const main = (s.mainId && G.all.find((p) => p.d.id === s.mainId)) || G.all.find((p) => !p.d.wild && G.pets.includes(p)) || G.all.find((p) => !p.d.wild) || PP.F.main() || G.all[0];
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
    if (!quiet) PP.ui.toast({ full: '全屏场景（Esc 退出，开始打字会自动收起）', band: '小场景', mini: s.taskbar ? '任务栏：主角住进任务栏里（停在它身上一会儿才能点它，其他时候点击都给任务栏）' : '极简：只留主角在右下角' }[m]);
    drawOrb(); placeOrb(); setFullFlag(); applyBar(); PP.refreshInteractive(); PP.save.soon(); PP.syncTray && PP.syncTray(true);
  };
  function setFullFlag() { if (api && api.setFullMode) api.setFullMode(S().mode === 'full'); applyOnTop(); }
  // 置顶：极简 / 全屏时在最前面；小场景默认不置顶（你点别的窗口，那个窗口就会盖到场景上面），可以在地图的“设置”里改
  let onTopNow = null;
  function applyOnTop() { if (!G.save || !api || !api.setOnTop) return; const s = S(), v = s.mode !== 'band' || !!s.bandOnTop; if (v !== onTopNow) { onTopNow = v; api.setOnTop(v); } }
  PP.applyOnTop = applyOnTop;
  setInterval(applyOnTop, 1500);
  PP.exitFull = () => { if (S().mode === 'full') PP.setMode('band'); };
  // 极简模式里，主角只在右下角这一小块活动（不跑到你干活的地方去）
  PP.miniZone = () => G.bar ? barZone() : [Math.max(20, G.W - 300 * Math.max(1, G.S) / 2), G.W - 70];
  // 任务栏视图：动物只在任务栏一侧的空白处活动（默认左边，Win11 图标在中间、托盘在右边）
  function barZone() { return S().barSide === 'right' ? [G.W * 0.6, G.W * 0.8] : [G.W * 0.012 + 20, G.W * 0.3]; }
  PP.barZone = barZone;
  // 进 / 出任务栏视图：窗口要盖住任务栏那一条
  let barBusy = false;
  async function applyBar() {
    const want = S().mode === 'mini' && !!S().taskbar;
    if (want === !!G.bar || barBusy || !api || !api.setBarMode) { if (want && !api) PP.ui.toast('任务栏视图只在桌面版里有'); return; }
    barBusy = true;
    const info = await api.setBarMode(want);
    barBusy = false;
    if (want && !info) { S().taskbar = false; PP.ui.toast('你的任务栏不在屏幕底部（或者设成了自动隐藏），任务栏视图用不了'); }
    G.bar = want && info ? { h: info.h } : null;
    setTimeout(() => { window.dispatchEvent(new Event('resize')); for (const p of G.pets) { p.y = G.ground; const [a, b] = PP.miniZone(); p.x = U.clamp(p.x, a, b); } placeOrb(); }, 120);
  }
  PP.applyBar = applyBar;
  setInterval(applyBar, 2000);
  // 任务栏里的小花园：一溜草叶和小花，只在动物活动的那一段
  PP.barDecor = (ctx) => {
    const [a, b] = barZone(), u = Math.max(1, Math.round(G.S)), y = G.H;
    for (let x = Math.round(a - 14); x < b + 14; x += u * 2) {
      const n = Math.sin(x * 12.9898) * 43758.5453, r = n - Math.floor(n);
      const edge = Math.min(1, Math.min(x - (a - 14), b + 14 - x) / 30);
      const h = Math.round((1 + r * 3) * edge) * u; if (h <= 0) continue;
      ctx.fillStyle = r < 0.5 ? 'rgba(106,170,88,.85)' : 'rgba(140,198,104,.85)'; ctx.fillRect(x, y - h, u, h);
      if (r > 0.93) { ctx.fillStyle = ['#f2a6c2', '#ffd36a', '#a8c8ff'][Math.floor(r * 1000) % 3]; ctx.fillRect(x - u, y - h - u * 2, u * 3, u * 2); ctx.fillStyle = '#fff6d8'; ctx.fillRect(x, y - h - u, u, u); }
    }
  };
  PP.toggleMini = () => PP.setMode(S().mode === 'mini' ? (S().lastMode && S().lastMode !== 'mini' ? S().lastMode : 'band') : 'mini');
  PP.showItems = () => true;

  // ---------- 悬浮小按钮：平时几乎透明，可以拖到任何地方 ----------
  let orb = null, pop = null, popT = 0;
  function initOrb() {
    orb = $(`<div class="orb" title="显示视图&#10;点一下：极简 ↔ 场景&#10;鼠标停留：选小场景还是全屏场景&#10;拖动：换个位置"><canvas width="12" height="12"></canvas></div>`);
    document.getElementById('ui').appendChild(orb);
    initSceneBtn();
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
        if (down.moved) { S().orb = { x: U.clamp(down.ox + ev.clientX - down.x, 4, G.W - 106) / G.W, y: U.clamp(down.oy + ev.clientY - down.y, 2, G.H - 34) / G.H }; placeOrb(); }
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
    const x = o ? U.clamp(o.x * G.W, 4, G.W - 106) : G.W - 114;
    const y = o ? U.clamp(o.y * G.H, 2, G.H - 34) : G.H - sh + 8;
    if (G.bar) { const [, zb] = barZone(); const bx = Math.round(zb + 16), by = Math.round(G.H - G.bar.h / 2 - 15); orb.style.left = bx + 'px'; orb.style.top = by + 'px'; if (scBtn) { scBtn.style.left = bx + 36 + 'px'; scBtn.style.top = by + 'px'; scBtn.classList.add('mini'); drawSceneBtn(); } const dk = document.querySelector('.dock'); if (dk) { dk.style.left = bx + 72 + 'px'; dk.style.top = by + 'px'; dk.style.bottom = 'auto'; dk.style.right = 'auto'; } return; }
    orb.style.left = x + 'px'; orb.style.top = y + 'px';
    if (scBtn) { scBtn.style.left = x + 36 + 'px'; scBtn.style.top = y + 'px'; scBtn.classList.toggle('mini', S().mode === 'mini'); drawSceneBtn(); }
    const dock = document.querySelector('.dock');
    if (dock) { dock.style.left = x + 72 + 'px'; dock.style.top = y + 'px'; dock.style.bottom = 'auto'; dock.style.right = 'auto'; }
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
  // 每个地方现在有谁：按地方列出来（同一种合在一起），点地方名就过去
  function whereList() {
    if (!PP.wild) return '';
    const c = PP.wild.census();
    const rows = Object.keys(PP.SCENES).map((k) => { const t = PP.wild.censusText(k, c[k]); return `<div class="w"><button class="small" data-s="${k}">${esc(PP.SCENES[k].name)}</button><span title="${esc(t)}">${t ? esc(t) : '<i class="muted">现在没人</i>'}</span></div>`; }).join('');
    return `<div class="where"><span>每个地方都有谁</span>${rows}</div>`;
  }
  // 视图按钮悬停：只选“大场景”用哪一种（小场景 / 全屏场景）；点按钮本身在极简和它之间切换
  function showPop() {
    hidePop();
    const s = S(), big = s.mode === 'mini' ? (s.lastMode && s.lastMode !== 'mini' ? s.lastMode : 'band') : s.mode;
    const small = s.taskbar ? '任务栏' : '极简';
    pop = $(`<div class="orb-pop view-pop"><span class="muted">点按钮：${small} ↔ ${MODE_NAME[big]}</span><div class="modes">${PP.MODES.filter(([k]) => k !== 'mini' && k !== 'bar').map(([k, n, d]) => `<button class="small ${big === k ? 'on' : ''}" data-m="${k}" title="${d}">${n}</button>`).join('')}</div>
      <span class="muted">收起时</span><div class="modes"><button class="small ${!s.taskbar ? 'on' : ''}" data-small="0" title="主角待在屏幕右下角、任务栏上方">极简</button><button class="small ${s.taskbar ? 'on' : ''}" data-small="1" title="主角住进任务栏里：不挡图标，点击都穿透给任务栏">任务栏</button></div>
      ${s.taskbar ? `<span class="muted">住在任务栏的</span><div class="modes"><button class="small ${s.barSide !== 'right' ? 'on' : ''}" data-side="left">左边</button><button class="small ${s.barSide === 'right' ? 'on' : ''}" data-side="right">右边</button></div>` : ''}</div>`);
    openPop(orb);
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.small != null) { S().taskbar = b.dataset.small === '1'; PP.save.soon(); if (S().mode !== 'mini') PP.setMode('mini'); else { applyBar(); drawOrb(); placeOrb(); } hidePop(); showPop(); return; }
      if (b.dataset.side) { S().barSide = b.dataset.side; PP.save.soon(); for (const p of G.pets) { const [a, c] = barZone(); p.x = U.clamp(p.x, a, c); } placeOrb(); hidePop(); showPop(); return; }
      if (S().mode === 'mini') { S().lastMode = b.dataset.m; PP.save.soon(); }
      PP.setMode(b.dataset.m); hidePop();
    });
  }
  function openPop(anchor) {
    document.getElementById('ui').appendChild(pop);
    const r = anchor.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    pop.style.left = U.clamp(r.left + r.width / 2 - pr.width / 2, 4, G.W - pr.width - 4) + 'px';
    pop.style.top = (r.top - pr.height - 6 > 4 ? r.top - pr.height - 6 : r.bottom + 6) + 'px';
    pop.addEventListener('mouseleave', () => setTimeout(() => { if (pop && !pop.matches(':hover') && !anchor.matches(':hover')) hidePop(); }, 300));
    PP.refreshInteractive();
  }

  // ---------- 场景按钮：按主场景分组的场景切换 + 场景设置 ----------
  // 10x10 像素小图标：k 黑 w 白 y 黄 r 红 g 绿 G 深绿 b 蓝 B 深蓝 c 浅蓝 o 橙 p 粉 n 棕 N 深棕 s 沙 e 灰 E 深灰 v 紫
  const PAL = { k: '#231c20', w: '#ffffff', y: '#ffcf33', r: '#e0453a', g: '#6cc04a', G: '#2f7a3a', b: '#4a9ad8', B: '#1e4a7a', c: '#bfe6f8', o: '#f08a3a', p: '#ff9ab8', n: '#a8703a', N: '#5a3a20', s: '#f0d090', e: '#9a9aa8', E: '#5a5a68', v: '#9a6ad8' };
  const SICON = {
    isleIco: ['..........', '..w.....w.', '.www..ww..', '....rr....', '...rwwr...', '..gggggg..', '.gGgggGgg.', '..nnnnnn..', '...nnnn...', '....nn....'],
    castleIco: ['..v....v..', '..e....e..', '.eee..eee.', '.eye..eye.', '.eee..eee.', 'eeeeeeeeee', 'eyeeyyeeye', 'eeeeNNeeee', 'eeeeNNeeee', 'gggggggggg'],
    shroomIco: ['..........', '..pppppp..', '.pwpppwpp.', 'pppppppppp', '..kwwwwk..', '....ww..c.', '....ww.ccc', '....ww..c.', 'GGGGwwGGGG', 'NNNNNNNNNN'],
    penguinIco: ['...kkkk...', '..kkkkkk..', '..kwkkwk..', '..kwwwwk..', '.kkwyywkk.', '.kkwwwwkk.', '..kwwwwk..', '..kwwwwk..', '...kwwk...', '..yy..yy..'],
    ice: ['..........', '....w.....', '...wwc....', '..wwwcc...', '.wwwwwcc..', 'wwwwwwccc.', 'bbbbbbbbbb', 'bBbbbBbbbb', 'BBbBBBbBBB', 'BBBBBBBBBB'],
    peak: ['....w.....', '...www....', '..wweew...', '..eeeeee..', '.eeEeeeee.', '.eEEEeeEe.', 'eeEEEEeEEe', 'eEEEEEEEEe', 'GGGGGGGGGG', 'GGGGGGGGGG'],
    caveIco: ['EEEEEEEEEE', 'EeeeeeeeeE', 'Eek.k.keeE', 'Eekkkkkkee', 'eekkkkkkee', 'eekkcckkee', 'eekkkkkkee', 'eekkkkkkee', 'EEkkkkkkEE', 'EEEEEEEEEE'],
    tree: ['....G.....', '...GgG....', '...GgG....', '..GggGG...', '..GgggG...', '.GgggggG..', '.GggggggG.', 'GGGGGGGGG.', '....N.....', '....N.....'],
    palmIco: ['.GG...GG..', 'GggG.GggG.', '...GgG....', '..GgGgG...', '.G..n..G..', '....n.....', '....n.....', '...n......', '...n......', '..nnn.....'],
    flowerIco: ['..........', '...pp.....', '..pyyp....', '..pyyp....', '...pp..y..', '....g.yoy.', '.g..g..y..', '..g.g.gg..', 'ggggggggg.', 'GGGGGGGGGG'],
    acaciaIco: ['..........', '.GGGGGGGG.', 'GggggggggG', '.GGGGGGGG.', '...N..N...', '....NN....', '....N.....', '....N.....', 'ssssNsssss', 'ssssssssss'],
    cactusIco: ['....g.....', '...gGg....', '.g.gGg....', '.g.gGg.g..', '.ggggGgg..', '...gGg....', '...gGg....', '...gGg....', 'ssssssssss', 'ssssssssss'],
    barnIco: ['....rr....', '...rrrr...', '..rrrrrr..', '.rrrrrrrr.', 'wwwwwwwwww', '.rrwwwwrr.', '.rrwrrwrr.', '.rrwrrwrr.', '.rrwrrwrr.', 'gggggggggg'],
    lakeIco: ['..........', '..........', '..gg......', '.gGgg..p..', '..gg..ggg.', 'bbbbbbbbbb', 'bccbbbbccb', 'bbbbbbbbbb', 'BbbBbbbBbb', 'BBBBBBBBBB'],
    shellIco: ['..........', '...ppp....', '..pwpwp...', '.pwpwpwp..', '.pwpwpwp..', '.pppppppp.', '..pppppp..', '...pppp...', 'ssssssssss', 'ssssssssss'],
    coralIco: ['B.r....v.B', 'B.r.r.vv.B', 'Brrr.r.v.B', 'B.rrr.vvvB', 'B..r..v..B', 'B..r..v.yB', 'Bb.r..v.yB', 'BbbbbbbbbB', 'sssssssss', 'ssssssssss'],
  };
  function icon(name, px) {
    const cv = document.createElement('canvas'); cv.width = 10; cv.height = 10; cv.className = 'sico'; if (px) cv.style.width = cv.style.height = px + 'px';
    const c = cv.getContext('2d'), rows = SICON[name] || SICON.tree;
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (PAL[ch]) { c.fillStyle = PAL[ch]; c.fillRect(x, y, 1, 1); } }));
    return cv;
  }
  PP.sceneIcon = (k, px) => icon((PP.SCENE_ICON || {})[k], px);
  let scBtn = null;
  function initSceneBtn() {
    scBtn = $(`<div class="orb scenebtn" title="场景&#10;点一下：藏起 / 显示场景&#10;鼠标停留：地图（去别的地方）、季节、环境声"><canvas width="10" height="10"></canvas></div>`);
    document.getElementById('ui').appendChild(scBtn);
    let t = 0;
    // 点一下：藏起 / 显示场景画面（动物还在）；极简模式下点一下就回到场景
    scBtn.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; e.stopPropagation(); clearTimeout(t); hidePop();
      const s = S();
      if (s.mode === 'mini') { s.sceneHidden = false; PP.setMode(s.lastMode && s.lastMode !== 'mini' ? s.lastMode : 'band'); }
      else { s.sceneHidden = !s.sceneHidden; PP.ui && PP.ui.toast(s.sceneHidden ? '场景藏起来了，动物还在（再点一下显示）' : '场景回来了'); }
      PP.save.soon(); scBtn.dataset.k = ''; drawSceneBtn(); PP.refreshInteractive();
    });
    scBtn.addEventListener('mouseenter', () => { t = setTimeout(showScenePop, 350); });
    scBtn.addEventListener('mouseleave', () => { clearTimeout(t); setTimeout(() => { if (pop && !pop.matches(':hover') && !scBtn.matches(':hover')) hidePop(); }, 350); });
  }
  function drawSceneBtn() {
    if (!scBtn) return;
    const k = PP.scene.view(), key = k + '|' + S().mode; if (scBtn.dataset.k === key) return; scBtn.dataset.k = key;
    const c = scBtn.querySelector('canvas').getContext('2d'); c.clearRect(0, 0, 10, 10);
    c.drawImage(icon((PP.SCENE_ICON || {})[k]), 0, 0);
  }
  // ---------- 地图：一张手绘感的像素世界地图，每个地方插一面小旗，点一下就过去 ----------
  // 位置（地图上的比例坐标）：北边冰原、南边南极，中间一块大陆，东边海岸和珊瑚礁，右上角云上是「我的」
  // 位置按真实的地理来排：最北是北极冰原；大陆北半部是温带（高山 + 山里的洞穴、湖泊、森林、草原、农场）；
  // 往南是副热带的沙漠（东边，靠近回归线）、赤道一带的热带雨林（西边，多雨）和稀树草原（中间）；东岸是海岸，外海是热带的珊瑚礁；最南边隔着大海是南极
  const MAP_POS = { snow: [0.5, 0.07], mountain: [0.26, 0.24], cave: [0.33, 0.32], lake: [0.5, 0.27], forest: [0.15, 0.4], meadow: [0.36, 0.43], farm: [0.52, 0.41],
    desert: [0.64, 0.5], jungle: [0.22, 0.63], savanna: [0.44, 0.62], beach: [0.77, 0.6], sea: [0.88, 0.72], antarctic: [0.5, 0.93],
    skyisle: [0.79, 0.11], academy: [0.92, 0.2], undergrove: [0.78, 0.27] };
  const MAP_W = 300, MAP_H = 190;
  let mapCache = null;
  function drawWorldMap() {
    if (mapCache) return mapCache;
    const A = PP.ART, cv = document.createElement('canvas'); cv.width = MAP_W; cv.height = MAP_H;
    const c = cv.getContext('2d'), img = c.createImageData(MAP_W, MAP_H), d = new Uint32Array(img.data.buffer);
    const hex = (h) => { const n = parseInt(h.slice(1), 16); return (255 << 24 | (n & 255) << 16 | ((n >> 8) & 255) << 8 | (n >> 16)) >>> 0; };
    const LAND = ['forest', 'jungle', 'meadow', 'farm', 'savanna', 'desert', 'mountain', 'cave', 'lake'];
    const COL = { forest: ['#5e9a5a', '#3f7a48', '#7cbc6a'], jungle: ['#3f8a52', '#2c6a40', '#5aa868'], meadow: ['#9ad07a', '#82bc66', '#f0b0c8'], farm: ['#c8d87a', '#e0c878', '#a8c86a'], savanna: ['#d8cc7a', '#b8a85a', '#e8dc98'], desert: ['#ecd49a', '#d8b878', '#f6e4b8'], mountain: ['#b4a8c4', '#a89cb8', '#c4b8d2'], cave: ['#b4a8c4', '#a89cb8', '#c4b8d2'], lake: ['#9ad07a', '#82bc66', '#f0b0c8'] };
    const land = (x, y) => { const nx = (x / MAP_W - 0.46) / 0.37, ny = (y / MAP_H - 0.47) / 0.33, n = A.noise(x / 18, y / 18, 41) * 0.5 + A.noise(x / 7, y / 7, 42) * 0.18; return nx * nx + ny * ny < 0.78 + n; };
    const ice = (x, y) => y < MAP_H * (0.1 + A.noise(x / 14, 1, 43) * 0.06) || y > MAP_H * (0.885 - A.noise(x / 14, 2, 44) * 0.04);
    const sky = (x, y) => { const dx = (x / MAP_W - 0.85) / 0.16, dy = (y / MAP_H - 0.19) / 0.17; return dx * dx + dy * dy < 1 + A.noise(x / 6, y / 6, 45) * 0.35; };
    const near = (x, y) => { let best = null, bd = 1e9; for (const k of LAND) { const [px, py] = MAP_POS[k]; const dd = (x - px * MAP_W) ** 2 + (y - py * MAP_H) ** 2 + A.noise(x / 9, y / 9, 46) * 900; if (dd < bd) { bd = dd; best = k; } } return best; };
    const T = new Array(MAP_W * MAP_H);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) T[y * MAP_W + x] = sky(x, y) ? 'sky' : ice(x, y) ? 'ice' : land(x, y) ? near(x, y) : 'sea';
    // 湖：大陆北边一块水
    const [lx, ly] = MAP_POS.lake;
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) { const dx = (x - lx * MAP_W) / 13, dy = (y - ly * MAP_H) / 7; if (dx * dx + dy * dy < 1 + A.noise(x / 5, y / 5, 47) * 0.4 && T[y * MAP_W + x] !== 'sky') T[y * MAP_W + x] = 'lakew'; }
    // 一条河：从高山流下来，经过湖，弯弯曲曲往东流进海
    { const pts = [MAP_POS.mountain, [0.4, 0.3], MAP_POS.lake, [0.6, 0.33], [0.7, 0.42], [0.84, 0.45]];
      for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; for (let t = 0; t <= 1; t += 0.004) { const x = Math.round((ax + (bx - ax) * t) * MAP_W + Math.sin(t * 9 + i) * 2), y = Math.round((ay + (by - ay) * t) * MAP_H + Math.cos(t * 7 + i) * 1.5); for (const [dx, dy] of [[0, 0], [1, 0]]) { const k = (y + dy) * MAP_W + x + dx; if (T[k] && T[k] !== 'sky' && T[k] !== 'ice') T[k] = 'lakew'; } } } }
    const at = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? 'sea' : T[y * MAP_W + x]);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const t = T[y * MAP_W + x], h = A.hash(x, y, 48);
      let col;
      if (t === 'sea' || t === 'lakew') {
        const coast = [at(x - 2, y), at(x + 2, y), at(x, y - 2), at(x, y + 2)].some((v) => v !== 'sea' && v !== 'lakew' && v !== 'sky');
        col = coast ? '#b8e2ea' : t === 'lakew' ? '#7cc0e0' : A.noise(x / 12, y / 12, 49) > 0.6 ? '#7ab8d4' : '#8cc6dc';
        if (!coast && (x + y * 3) % 23 === 0 && h < 0.5) col = '#d8f0f6';
      } else if (t === 'ice') col = h < 0.06 ? '#c8dcec' : A.noise(x / 6, y / 6, 50) > 0.65 ? '#e2eef8' : '#f4f9fd';
      else if (t === 'sky') { const e = !sky(x - 1, y) || !sky(x + 1, y) || !sky(x, y - 1) || !sky(x, y + 1); col = e ? '#c8b8e4' : A.noise(x / 8, y / 8, 51) > 0.6 ? '#f6f0fc' : '#ebe2f6'; }
      else {
        const P = COL[t]; col = P[0];
        if (t === 'farm') col = P[(Math.floor(x / 7) + Math.floor(y / 5)) % 3]; else if (h < 0.12) col = P[1]; else if (h > 0.96) col = P[2];
        if (t === 'desert' && Math.sin(x / 4 + y / 2.5) > 0.86) col = P[1];
        const shore = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((v) => v === 'sea' || v === 'lakew');
        if (shore) col = '#f0dca8';
      }
      d[y * MAP_W + x] = hex(col);
    }
    c.putImageData(img, 0, 0);
    // 地形的小符号：山（雪顶）、树、仙人掌、合欢树、田埂
    const px = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
    for (let i = 0; i < 400; i++) {
      const x = Math.floor(A.hash(i, 1, 52) * MAP_W), y = Math.floor(A.hash(i, 2, 52) * MAP_H), t = T[y * MAP_W + x];
      if ((t === 'mountain' || t === 'cave') && i % 3 === 0) { for (let k = 0; k < 4; k++) for (let j = -k; j <= k; j++) px(x + j, y + k, k < 2 ? '#f6f4fb' : j < 0 ? '#b8acc8' : '#8a7ea0'); }
      else if (t === 'forest') { px(x, y, '#2e6a3c'); px(x - 1, y + 1, '#3f7a48'); px(x, y + 1, '#3f7a48'); px(x + 1, y + 1, '#2e6a3c'); px(x, y - 1, '#5e9a5a'); px(x, y + 2, '#6a4a32'); }
      else if (t === 'jungle') { px(x, y, '#2c6a40'); px(x + 1, y, '#5aa868'); px(x - 1, y, '#2c6a40'); px(x, y + 1, '#6a4a32'); }
      else if (t === 'savanna' && i % 3 === 0) { px(x - 1, y, '#6a9a4a'); px(x, y, '#6a9a4a'); px(x + 1, y, '#6a9a4a'); px(x, y + 1, '#7a5a3a'); }
      else if (t === 'desert' && i % 4 === 0) { px(x, y, '#5aa04e'); px(x, y + 1, '#5aa04e'); px(x - 1, y, '#5aa04e'); }
      else if (t === 'meadow' && i % 2 === 0) px(x, y, ['#f0b0c8', '#fff4b0', '#ffffff'][i % 3]);
      else if (t === 'ice' && i % 5 === 0) { px(x, y, '#c8dcec'); px(x + 1, y, '#c8dcec'); }
    }
    // 罗盘和图框
    c.fillStyle = '#6a5a78'; c.fillRect(10, MAP_H - 22, 1, 13); c.fillRect(4, MAP_H - 16, 13, 1); c.fillStyle = '#d86a6a'; c.fillRect(10, MAP_H - 22, 1, 5);
    mapCache = cv; return cv;
  }
  let popTab = 'map';
  const SRC_NAME = { scene: '场景本身', weather: '天气', creature: '小动物', indoor: '屋里' };
  function showScenePop() {
    hidePop();
    const s = S(), cur = PP.scene.active() ? PP.scene.view() : null, c = PP.wild ? PP.wild.census() : {};
    const regionOf = {}; (PP.REGIONS || []).forEach((r) => r.subs.forEach(([k]) => (regionOf[k] = r)));
    const all = []; (PP.REGIONS || []).forEach((r) => r.subs.forEach(([k, n]) => all.push([k, n, r])));
    const pins = all.map(([k, n]) => { const p = MAP_POS[k] || [0.5, 0.5], cnt = c[k] ? Object.values(c[k]).reduce((a, b) => a + (b.n || 0), 0) : 0; return `<button class="pin ${cur === k ? 'on' : ''}" data-s="${k}" style="left:${(p[0] * 100).toFixed(1)}%;top:${(p[1] * 100).toFixed(1)}%"><i data-ico="${k}"></i><span>${esc(n)}</span>${cnt ? `<em>${cnt}</em>` : ''}</button>`; }).join('');
    const tabs = [['map', '地图'], ['sound', '声音'], ['set', '设置']].map(([k, n]) => `<button class="tab ${popTab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('');
    let body = '';
    if (popTab === 'map') body = `<div class="mapwrap"><canvas class="worldmap" width="${MAP_W}" height="${MAP_H}"></canvas><div class="mine-tag">我的</div>${pins}<div class="pv"></div></div><div class="hint">点旗子就过去 · 鼠标停在旗子上先看一眼 · 点场景按钮本身：${s.sceneHidden ? '显示场景' : '藏起场景'}</div>`;
    else if (popTab === 'sound') {
      const off = s.ambOff || {};
      body = `<div class="sndtop"><button class="small ${s.ambient ? 'on' : ''}" data-a="amb">${s.ambient ? '♪ 环境声：开' : '♪ 环境声：关'}</button>${[[0.25, '轻'], [0.5, '中'], [0.8, '响']].map(([v, n]) => `<button class="small ${s.ambient && (s.ambientVol != null ? s.ambientVol : 0.5) === v ? 'on' : ''}" data-vol="${v}" ${s.ambient ? '' : 'disabled'}>${n}</button>`).join('')}</div>
        <div class="srcs">${(PP.ambient && PP.ambient.SOURCES || []).map(([k, n, tip]) => `<div class="src" data-src="${k}"><button class="small ${off[k] ? '' : 'on'}" data-off="${k}">${off[k] ? '关' : '开'}</button><div><b>${n}</b><span class="now"></span><small>${esc(tip)}</small></div></div>`).join('')}</div>`;
    } else {
      body = `<div class="seasons"><span>季节</span>${[['auto', '跟随日历'], ['spring', '春'], ['summer', '夏'], ['autumn', '秋'], ['winter', '冬']].map(([k, n]) => `<button class="small ${(s.seasonFix || 'auto') === k ? 'on' : ''}" data-season="${k}">${n}</button>`).join('')}</div>
        <div class="sound"><button class="small ${s.bandOnTop ? 'on' : ''}" data-a="top">${s.bandOnTop ? '小场景：总在最前面' : '小场景：不挡其他窗口'}</button><button class="small ${s.sceneInfo ? 'on' : ''}" data-a="info">${s.sceneInfo ? '场景信息：显示' : '场景信息：不显示'}</button><button class="small" data-a="decor">布置这个场景…</button></div>
        <div class="env">${esc(PP.env.label())}</div>`;
    }
    pop = $(`<div class="orb-pop scene-pop map2"><div class="maphead"><b>${cur && PP.SCENES[cur] ? esc(PP.SCENES[cur].name) : '地图'}</b><div class="tabs">${tabs}</div></div>${body}</div>`);
    pop.querySelectorAll('i[data-ico]').forEach((el) => el.replaceWith(icon((PP.SCENE_ICON || {})[el.dataset.ico], 14)));
    const cvs = pop.querySelector('canvas.worldmap'); if (cvs) cvs.getContext('2d').drawImage(drawWorldMap(), 0, 0);
    // 鼠标停在旗子上：小预览（那边现在的样子 + 谁在那儿）
    const pv = pop.querySelector('.pv');
    if (pv) pop.querySelectorAll('.pin').forEach((b) => {
      b.addEventListener('mouseenter', () => {
        const k = b.dataset.s; pv.innerHTML = '';
        try { const t = PP.scene.thumb(k, 156, 46), im = document.createElement('canvas'); im.width = 156; im.height = 46; im.getContext('2d').drawImage(t, 0, 0); pv.appendChild(im); } catch (err) {}
        const r = regionOf[k], nm = PP.SCENES[k] ? PP.SCENES[k].name : k, who = PP.wild ? PP.wild.censusText(k, c[k]) : '';
        pv.insertAdjacentHTML('beforeend', `<div><b>${esc((r && r.subs.length > 1 ? r.name + ' · ' : '') + nm)}</b>${PP.NEST && PP.NEST[k] ? '<small>（在' + esc(PP.SCENES[PP.NEST[k]].name) + '里）</small>' : ''}<br><span>${esc(who || '现在没人')}</span></div>`);
        pv.style.left = b.style.left; pv.style.top = b.style.top; pv.classList.add('show'); pv.classList.toggle('up', parseFloat(b.style.top) > 55); pv.classList.toggle('left', parseFloat(b.style.left) > 60);
      });
      b.addEventListener('mouseleave', () => pv.classList.remove('show'));
    });
    // 声音：每个来源现在在响什么
    if (popTab === 'sound') { const upd = () => { const L = PP.ambient && PP.ambient.layers ? PP.ambient.layers() : []; pop && pop.querySelectorAll('.src').forEach((el) => { const k = el.dataset.src, list = L.filter((x) => x.src === k).map((x) => x.name); el.querySelector('.now').textContent = !s.ambient ? '' : (s.ambOff || {})[k] ? '：已关掉' : list.length ? '：' + list.join('、') : '：现在没有'; }); }; upd(); const iv = setInterval(() => { if (!pop || !pop.isConnected || popTab !== 'sound') return clearInterval(iv); upd(); }, 1000); }
    openPop(scBtn);
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tab) { popTab = b.dataset.tab; showScenePop(); return; }
      if (b.dataset.s) { S().sceneHidden = false; if (PP.scene.inside()) PP.scene.leave(); if (S().mode === 'mini') PP.setMode(S().lastMode && S().lastMode !== 'mini' ? S().lastMode : 'band'); PP.scene.go(b.dataset.s); hidePop(); return; }
      if (b.dataset.season) { S().seasonFix = b.dataset.season === 'auto' ? null : b.dataset.season; PP.save.soon(); PP.syncTray && PP.syncTray(true); showScenePop(); return; }
      if (b.dataset.off) { const o = S().ambOff = S().ambOff || {}; o[b.dataset.off] = !o[b.dataset.off]; PP.save.soon(); showScenePop(); return; }
      if (b.dataset.a === 'amb') { PP.menuRun('ambient'); showScenePop(); return; }
      if (b.dataset.a === 'top') { S().bandOnTop = !S().bandOnTop; PP.save.soon(); applyOnTop(); showScenePop(); return; }
      if (b.dataset.a === 'info') { S().sceneInfo = !S().sceneInfo; PP.save.soon(); showScenePop(); return; }
      if (b.dataset.a === 'decor') { hidePop(); if (S().mode === 'mini') PP.setMode('band'); PP.scene.edit(true); return; }
      if (b.dataset.vol) { S().ambientVol = +b.dataset.vol; PP.save.soon(); showScenePop(); return; }
    });
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
    water: ['....kk....', '...kbbk...', '..kbbbbk..', '..kbbbbk..', '.kbbbwbbk.', '.kbbbbwbk.', '.kbbbbbbk.', '..kbbbbk..', '...kkkk...', '..........'],
    adopt: ['..........', '.kk....kk.', 'kppk..kppk', 'kpppkkpppk', 'kppwwwwppk', '.kppwwppk.', '..kpwwpk..', '...kppk...', '....kk....', '..........'],
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
  // 每只动物都一样：档案、喂吃的、喂水、摸摸；野生的可以认养，认养的可以让它陪着你
  const btnsFor = (p) => [['info', '档案'], ['fav', `喂${p.sp.favName}`], ['water', '喂水'], ['pet', '摸摸'], p.d.wild ? ['adopt', '认养它'] : ['main', '让它陪着我'], ['menu', '更多']];
  Object.defineProperty(PP, 'ringPet', { get: () => ringPet });
  // 极简模式：小门和爪子两个按钮平时藏起来（免得误点），指着宠物时才出现
  let revealUntil = 0;
  function miniButtons(hp) {
    const mini = G.save.settings.mode === 'mini', now = performance.now();
    if (hp || (ring && ring.matches(':hover')) || pop) revealUntil = now + 2500;
    const dock = document.querySelector('.dock');
    const hovered = (orb && orb.matches(':hover')) || (dock && dock.matches(':hover')) || (scBtn && scBtn.matches(':hover'));
    const hide = mini && !hovered && now > revealUntil && !document.querySelector('.menu');
    if (orb) orb.classList.toggle('peekhide', hide);
    if (dock) dock.classList.toggle('peekhide', hide);
    if (scBtn) scBtn.classList.toggle('peekhide', hide);
  }
  function barTick() {
    if (!G.save) return;
    const hp = G.hoverPet;
    miniButtons(hp);
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
      const nearL = cx < R + bs * 1.2, nearR = cx > G.W - R - bs * 1.2;
      if (nearL || nearR) {
        // 贴着屏幕左右边：弧会被切掉一半，改成在它朝里的一侧竖着排一列
        const side = nearR ? -1 : 1, gap = bs * 1.15, colX = U.clamp(cx + side * (10 * S + bs * 0.9), bs / 2 + 2, G.W - bs / 2 - 2);
        const top = U.clamp(cy - ((n - 1) * gap) / 2, bs / 2 + 2, G.H - bs / 2 - 2 - (n - 1) * gap);
        btns.forEach((b, i) => { b.style.left = colX - bs / 2 + 'px'; b.style.top = top + i * gap - bs / 2 + 'px'; });
      } else {
        // 默认在头顶一圈；太靠上就转到下面
        const mid = cy - R < bs ? Math.PI / 2 : -Math.PI / 2;
        btns.forEach((b, i) => {
          const a = mid - span / 2 + (span * i) / (n - 1);
          const x = U.clamp(cx + Math.cos(a) * R, bs / 2 + 2, G.W - bs / 2 - 2), y = U.clamp(cy + Math.sin(a) * R, bs / 2 + 2, G.H - bs / 2 - 2);
          b.style.left = x - bs / 2 + 'px'; b.style.top = y - bs / 2 + 'px';
        });
      }
      const mb = ring.querySelector('[data-c=main]'); if (mb) mb.classList.toggle('on', G.save.settings.mainId === ringPet.d.id);
    }
  }
  function showBar(p) {
    hideBar();
    ringPet = p;
    ring = $(`<div class="hoverbar petring">${btnsFor(p).map(([c, tip]) => `<button data-c="${c}" title="${tip}"><canvas width="20" height="20"></canvas></button>`).join('')}</div>`);
    ring.querySelectorAll('button').forEach((b) => drawIconTo(b.querySelector('canvas'), b.dataset.c, p));
    document.getElementById('ui').appendChild(ring);
    barTick();
    requestAnimationFrame(() => ring && ring.classList.add('in'));
    ring.addEventListener('mousedown', (e) => e.stopPropagation());
    ring.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !ringPet) return;
      const id = ringPet.d.id, c = b.dataset.c;
      if (c === 'info') { const p = ringPet; hideBar(); PP.ui.petPanel(p); }
      else if (c === 'menu') { const r = b.getBoundingClientRect(); const p = ringPet; hideBar(); PP.ui.petMenu(p, r.left, r.top); }
      else if (c === 'adopt') { const p = ringPet; hideBar(); PP.wild.adoptPanel(p); }
      else {
        const cmd = { fav: 'feed', water: 'water', pet: 'pat', main: 'main' }[c] || c;
        PP.menuRun(`pet:${id}:${cmd}`); b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 250);
        if (c === 'main') { const r2 = ring; setTimeout(() => r2 === ring && barTick(), 30); }
      }
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
  PP.pickPets = () => PP.ui.overview();

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
