// 显示模式 + 悬浮小按钮 + 宠物头顶的快捷工具条 + 多选显示/隐藏 + 天气城市设置
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const api = window.petAPI;
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = () => G.save.settings;
  const MODE_NAME = Object.assign(Object.fromEntries(PP.MODES.map((m) => [m[0], m[1]])), { full: '全屏风景' });

  // ---------- 显示模式 ----------
  PP.setMode = function (m, quiet, refresh) {
    const s = S(), old = s.mode;
    // 收起时的三种样子：极简（右下角）/ 任务栏 / 小岛
    if (m === 'bar' || m === 'isle') {
      s.taskbar = m === 'bar'; s.isle = m === 'isle';
      if (old === 'mini') { applyBar(); PP.isle && PP.isle.sync(); drawOrb(); placeOrb(); PP.save.soon(); PP.syncTray && PP.syncTray(true); if (!quiet && m === 'isle') PP.ui.toast('城堡：点地面让主角走过去，点菜箱选种子，点门进屋；按住城堡可以拖动'); return; }
      m = 'mini';
    }
    if (refresh && old === 'mini') { applyBar(); PP.isle && PP.isle.sync(); drawOrb(); placeOrb(); PP.save.soon(); PP.syncTray && PP.syncTray(true); return; }
    if (!MODE_NAME[m] || old === m) return;
    if (m === 'mini') {
      // 主角：你指定的那只；没指定就挑一只醒着、在外面的
      const main = (PP.mainPet && (s.miniMain = null, PP.mainPet())) || (s.mainId && G.all.find((p) => p.d.id === s.mainId)) || G.all.find((p) => !p.d.wild && G.pets.includes(p)) || G.all.find((p) => !p.d.wild) || PP.F.main() || G.all[0];
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
    if (!quiet) PP.ui.toast({ full: '全屏场景（Esc 退出，开始打字会自动收起）', band: '风景', mini: s.taskbar ? '任务栏中：主角住进任务栏里，只待在没有图标的空白处（停在它身上一会儿才能点它）' : s.isle ? '城堡：点地面让主角走过去，点菜箱选种子，点门进屋；按住城堡可以拖动' : '极简：只留主角在右下角' }[m]);
    drawOrb(); placeOrb(); setFullFlag(); applyBar(); PP.isle && PP.isle.sync(); PP.refreshInteractive(); PP.save.soon(); PP.syncTray && PP.syncTray(true); hideBar();
  };
  function setFullFlag() { if (api && api.setFullMode) api.setFullMode(S().mode === 'full'); applyOnTop(); }
  // 置顶：极简 / 全屏时在最前面；小场景默认也置顶（以前不置顶，点别的窗口它就被盖住，看起来像莫名其妙消失了），可以在场景的设置里改
  let onTopNow = null;
  function applyOnTop() { if (!G.save || !api || !api.setOnTop) return; const s = S(), v = s.mode !== 'band' || !s.bandBehind; if (v !== onTopNow) { onTopNow = v; api.setOnTop(v); } }
  PP.applyOnTop = applyOnTop;
  setInterval(applyOnTop, 1500);
  PP.exitFull = () => { if (S().mode === 'full') PP.setMode('band'); };
  // 极简模式里，主角只在右下角这一小块活动（不跑到你干活的地方去）
  PP.miniZone = () => G.bar ? barZone() : G.isle ? PP.isle.zone() : [Math.max(20, G.W - 300 * Math.max(1, G.S) / 2), G.W - 70];
  // 任务栏视图：动物只在任务栏一侧的空白处活动（默认左边，Win11 图标在中间、托盘在右边）
  // 扫描过任务栏，就在真正空着的那几段里挑一段（够放动物 + 三个按钮的）；左 / 右 偏好决定挑最左边还是最右边那段
  function barZone() {
    const fr = G.bar && G.bar.free;
    if (fr && fr.length) {
      const ok = fr.filter(([a, b]) => b - a >= 190), list = ok.length ? ok : fr.slice().sort((p, q) => (q[1] - q[0]) - (p[1] - p[0])).slice(0, 1);
      const pick = S().barSide === 'right' ? list[list.length - 1] : list[0];
      const a = pick[0] + 18, b = Math.max(pick[0] + 40, Math.min(pick[1] - 18, pick[0] + 520));
      return S().barSide === 'right' ? [Math.max(a, pick[1] - 18 - 520), pick[1] - 18] : [a, b];
    }
    return S().barSide === 'right' ? [G.W * 0.6, G.W * 0.8] : [G.W * 0.012 + 20, G.W * 0.3];
  }
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
    G.bar = want && info ? { h: info.h, free: null } : null;
    if (G.bar) scanBar();
    setTimeout(() => { window.dispatchEvent(new Event('resize')); for (const p of G.pets) { p.y = G.ground; const [a, b] = PP.miniZone(); p.x = U.clamp(p.x, a, b); } placeOrb(); }, 120);
  }
  PP.applyBar = applyBar;
  // 看一眼任务栏哪里是空的（开新软件 / 关软件，图标会变，所以隔几分钟再看一次）
  async function scanBar() {
    if (!G.bar || !api || !api.barScan) return;
    const r = await api.barScan().catch(() => null);
    if (!G.bar || !r || !r.free) return;
    G.bar.free = r.free.map(([a, b]) => [a * G.W / (r.w || G.W), b * G.W / (r.w || G.W)]);
    const [a, b] = barZone();
    for (const p of G.pets) if (p.x < a || p.x > b) { p.interrupt(true); p.x = U.clamp(p.x, a, b); }
    placeOrb();
  }
  PP.scanBar = scanBar;
  setInterval(() => { if (G.bar && !G.hoverPet && !G.uiDrag) scanBar(); }, 3 * 60000);
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
  // 现在在哪一种：极简（任务栏上 top / 任务栏中 in）或场景（小屋 house / 小岛 isle / 风景 band）
  function curView() { const s = S(); if (s.mode === 'mini' && !s.isle) return s.taskbar ? 'in' : 'top'; if (s.mode === 'mini' && s.isle) return PP.isle && PP.isle.inside && PP.isle.inside() === 'house' ? 'house' : 'isle'; return 'band'; }
  PP.curView = curView;
  const isMini = () => { const v = curView(); return v === 'top' || v === 'in'; };
  function setView(v) {
    const s = S();
    if (v === 'top' || v === 'in') { s.taskbar = v === 'in'; s.isle = false; if (s.mode === 'mini') PP.setMode('mini', true, true); else PP.setMode('mini', true); s.lastMini = v; }
    else if (v === 'isle' || v === 'house') {
      s.isle = true; s.taskbar = false; if (s.mode === 'mini') PP.setMode('mini', true, true); else PP.setMode('mini', true);
      const want = v === 'house' ? 'house' : false;
      const t0 = performance.now(), go = () => { try { if (performance.now() - t0 < 1500 && G.isle && PP.isle.inside && (PP.isle.inside() === 'house' ? 'house' : false) !== want) PP.isle.setInside(want); } catch (e) {} };
      go(); setTimeout(go, 60); s.lastScene = v;
    } else { s.lastScene = 'band'; PP.setMode('band'); }
    PP.save.soon(); hudKey = ''; hideBar();
  }
  PP.setView = setView;
  // 极简 ⇄ 场景：一键切换，回到上次用的那一种
  PP.toggleMinimal = () => { const s = S(); if (isMini()) setView(s.lastScene || (s.lastMode === 'band' || s.lastMode === 'full' ? 'band' : 'isle')); else setView(s.lastMini || 'top'); };
  PP.toggleMini = PP.toggleMinimal;
  PP.showItems = () => true;
  const isPure = isMini;
  PP.isMinimal = isMini;
  // 菜单 / 托盘里的“视图”也走这里
  const setMode0 = PP.setMode;
  PP.setMode = function (m, quiet, refresh) {
    if (m === 'house' || (m === 'isle' && !refresh)) { setView(m); return; }
    setMode0(m, quiet, refresh);
  };

  // ---------- HUD：一条小工具栏，所有按钮都在这里（不再到处冒小按钮） ----------
  // 视图 / 地图 / 背包 / （小岛上）进出小屋 / 菜单。点一下打开它的小窗，再点一下或点别处就关；同一时间只开一个。
  // 出现的规则只有一条：鼠标在“它管的那块地方”（小岛、宠物身边、场景里）或者在工具栏上 → 出现；离开 1.2 秒 → 淡出。
  // 位置：小岛 → 岛的正上方；极简 / 任务栏 → 主角旁边；小场景 / 全屏 → 场景右上角（可以拖动换位置）
  let hud = null, pop = null, popKind = null, nearUntil = 0, lastNear = '';
  const HICON = {
    view: ['..kkkkkk..', '..kyyyyk..', '..kyyyyk..', '..kygyyk..', '..kgggyk..', '..kggggk..', '..kggyok..', '..kggggk..', '..kggggk..', '.kkkkkkkk.'],
    bag: ['...kkkk...', '..k....k..', '.kkkkkkkk.', 'koooooooOk', 'koooyyooOk', 'kooykkyoOk', 'koooyyooOk', 'koooooooOk', '.kOOOOOOk.', '..kkkkkk..'],
    home: ['....kk....', '...krrk...', '..krrrrk..', '.krrrrrrk.', 'kkkkkkkkkk', '.kwwwwwwk.', '.kwbkkwwk.', '.kwwkykwk.', '.kwwkkkwk.', '.kkkkkkkk.'],
    out: ['kkkkk.....', 'kwwwk.....', 'kwwwk..k..', 'kwwyk..kk.', 'kwwwkkkkkk', 'kwwwkkkkkk', 'kwwwk..kk.', 'kwwwk..k..', 'kwwwk.....', 'kkkkk.....'],
    mini: ['..........', '..........', '..k....k..', '.kok..kok.', '.kook.kook', '.koookoook', '.kowooowok', '.kooooooook'.slice(0, 10), '..kkkkkkk.', '..........'],
    expand: ['kkkk..kkkk', 'kyy....yyk', 'ky......yk', 'k...kk...k', '...kyyk...', '...kyyk...', 'k...kk...k', 'ky......yk', 'kyy....yyk', 'kkkk..kkkk'],
    menu: ['..........', '.kk....kk.', 'kook..kook', 'kook..kook', '.kk.kk.kk.', '...kook...', '..kooook..', '..kooook..', '...kkkk...', '..........'],
  };
  HICON.furn = ['..........', '.kkkkkkk..', '.kOOOOOk..', '.kOOOOOk..', '.kkkkkkkkk', '.koooooook', '.kkkkkkkkk', '.kO.....Ok', '.kO.....Ok', '.kk.....kk'];
  HICON.call = ['..........', '.k......k.', '.kk....kk.', '.kwkkkkwk.', '.kwwwwwwk.', 'kwkwwwwkwk', 'kwwwrrwwwk', '.kwwwwwwk.', '..kkkkkk..', '..........'];
  const HCOL = { k: '#231c20', y: '#ffcf33', g: '#7cc35a', o: '#e8a060', O: '#b8703a', r: '#e0604a', w: '#fff6e0', b: '#8ac8f0' };
  function hIcon(cv, name) {
    const c = cv.getContext('2d'); c.clearRect(0, 0, 20, 20); c.imageSmoothingEnabled = false;
    if (name === 'map') { c.drawImage(icon((PP.SCENE_ICON || {})[PP.scene.view()]), 0, 0, 10, 10, 0, 0, 20, 20); return; }
    (HICON[name] || HICON.menu).forEach((row, y) => [...row].forEach((ch, x) => { if (HCOL[ch]) { c.fillStyle = HCOL[ch]; c.fillRect(x * 2, y * 2, 2, 2); } }));
  }
  // 兜底按钮：只有主角不在画面上（回窝了、出门了、进了电脑）超过 2.5 秒才出现，就一个“叫主角出来”
  function hudButtons() { const p = PP.mainPet && PP.mainPet(); return [['call', p ? `叫${p.name}出来` : '叫主角出来']]; }
  let hudKey = '';
  function buildHud() {
    const btns = hudButtons(), key = btns.map((b) => b.join(':')).join('|') + '|' + PP.scene.view() + '|' + (PP.econ && PP.econ.unread() ? 1 : 0);
    if (hud && key === hudKey) return;
    hudKey = key;
    if (!hud) {
      hud = $(`<div class="hud far"></div>`);
      document.getElementById('ui').appendChild(hud);
      hud.addEventListener('mousedown', (e) => e.stopPropagation());
      hud.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) hudClick(b.dataset.h, b); });
      hud.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); hidePop(); const r = hud.getBoundingClientRect(); PP.ui.menu(PP.menuModel(null), r.left, r.top - 4); });
    }
    hud.innerHTML = btns.map(([k, tip]) => `<button data-h="${k}" class="callbtn"><canvas width="20" height="20"></canvas>${esc(tip)}</button>`).join('');
    hud.querySelectorAll('button').forEach((b) => hIcon(b.querySelector('canvas'), b.dataset.h));
    PP.refreshInteractive();
  }
  // 把主角叫回画面上
  function summonMain() {
    const p = PP.mainPet && PP.mainPet(); if (!p) return;
    if (p.d.trip) { PP.ui.toast(`${p.name}出门旅行了，回来会给你写信`); return; }
    // 叫它出来：不管它是回窝了、在冬眠、躲雨，还是大家都被收回电脑里，都直接出来
    if (S().allAway) S().allAway = false;
    p.outing = null; p.d.hidden = false; p.d.inHome = false; p.eco = null; p.homeEco = null; p.ecoTask = null; p.sleeping = false;
    if (S().mode !== 'mini') PP.hereNow(p);
    PP.syncPets();
    if (!G.pets.includes(p) && S().mode !== 'mini' && PP.eco && PP.eco.onView) { PP.eco.onView(PP.scene.view()); }
    if (!G.pets.includes(p)) { PP.ui.toast(`${p.name}暂时出不来`); return; }
    if (G.pets.includes(p) && !p.held) PP.petEmerge(p, PP.miniZone ? (PP.miniZone()[0] + PP.miniZone()[1]) / 2 : G.W - 120);
  }
  PP.summonMain = summonMain;
  function hudClick(k, b) {
    if (k === 'call') { summonMain(); absentSince = 0; setNear(false); return; }
    if (k === 'view' || k === 'map') { if (popKind === k) { hidePop(); return; } PP.ui.closeMenu(); k === 'view' ? showPop() : showScenePop(); return; }
    hidePop();
    if (k === 'bag') { PP.econ.openPanel('bag'); return; }
    if (k === 'furn') { PP.isle.furnEdit(!PP.isle.furnEditing()); return; }
    if (k === 'home' || k === 'out') { PP.isle.click({ k: k === 'home' ? 'door' : 'exit', isle: true }); setTimeout(buildHud, 50); return; }
    if (k === 'menu') { const r = b.getBoundingClientRect(); PP.ui.menu(PP.menuModel(null), r.left, r.top - 4); }
  }
  // 小场景 / 全屏：按住工具栏空白处（右边的小竖条）拖动换位置
  function dragHud(e) {
    if (G.isle || S().mode === 'mini') return;
    const d = { x: e.clientX, y: e.clientY, ox: hud.offsetLeft, oy: hud.offsetTop }; G.uiDrag = true; hidePop();
    const mv = (ev) => { S().orb = { x: U.clamp(d.ox + ev.clientX - d.x, 4, G.W - hud.offsetWidth - 4) / G.W, y: U.clamp(d.oy + ev.clientY - d.y, 2, G.H - 40) / G.H }; placeHud(); };
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); G.uiDrag = false; PP.save.soon(); PP.refreshInteractive(); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }
  function anchorPet() {
    const p = PP.mainPet && PP.mainPet();
    return p && G.pets.includes(p) && !p.inDoor && !p.outing && !p.held ? p : null;
  }
  function setNear(v) {
    const k = v ? '1' : '0'; if (k === lastNear) return; lastNear = k;
    hud.classList.toggle('far', !v); PP.refreshInteractive();
  }
  const rectsHit = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  let absentSince = 0;
  function placeHud() {
    if (!hud || !G.save) return;
    buildHud();
    const p = PP.mainPet && PP.mainPet(), now = performance.now();
    // 主角在画面上（或者正被你拎着）：所有按钮都在它身边那一圈里，这里什么都不显示
    if (anchorPet() || (p && p.held) || G.uiDrag || G.editing || dockOn()) { absentSince = 0; setNear(false); if (pop) placePop(); return; }
    if (!absentSince) absentSince = now;
    const W = hud.offsetWidth || 120, Hh = hud.offsetHeight || 32, sb = PP.safeB ? PP.safeB() : G.H;
    let x, y;
    if (G.isle && PP.isle.rect()) { const L = PP.isle.rect(); x = L.x1 - W - 8; y = L.y0 - Hh - 6; if (y < 4) y = L.y0 + 4; }
    else if (S().mode === 'band' && PP.scene.vrect && PP.scene.vrect()) { const r = PP.scene.vrect(); x = r.x1 - W - 6; y = r.y0 - Hh - 8; }
    else if (G.bar) { const [a, b] = barZone(); x = (a + b) / 2 - W / 2; y = G.H - G.bar.h / 2 - Hh / 2; }
    else { x = G.W - W - 16; y = sb - Hh - 24; }
    hud.style.left = Math.round(U.clamp(x, 4, G.W - W - 4)) + 'px'; hud.style.top = Math.round(U.clamp(y, 2, sb - Hh - 2)) + 'px';
    setNear(now - absentSince > 2500);
    if (pop) placePop();
  }
  // ---------- 框旁边的按钮条（小场景 / 小岛）：鼠标进框才浮出来 ----------
  function dockRect() { if (G.isle && PP.isle && PP.isle.rect()) return PP.isle.rect(); if (S().mode === 'band' && PP.scene.vrect) return PP.scene.vrect(); return null; }
  function dockOn() { return !!(G.save && dockRect()); }
  PP.dockOn = dockOn;
  let dock = null, dockKey = '', dockUntil = 0;
  function dockBtns() {
    const s = S(), isle = !!G.isle, inside = isle && PP.isle.inside(), n = PP.econ && PP.econ.unread(), p = PP.mainPet && PP.mainPet();
    return [
      ['mini', '极简：只留主角（任务栏上 / 任务栏中）'],
      ['view', '换一种：小屋 / 城堡 / 风景'],
      ['map', '地图：去别的地方看风景'],
      ['bag', n ? `背包 · 商店（${n} 封新信）` : '背包 · 商店 · 探险'],
      ...(isle ? [[inside ? 'out' : 'home', inside ? '回到外面看整座城堡' : '进屋（起居室）']] : []),
      ...(isle ? [['cam', '回到默认视角（按住 Ctrl + 左键拖动转视角，滚轮缩放）']] : []),
      ...(isle && inside === 'house' ? [['furn', '布置家具：拖动、转向、收起、添加']] : []),
      ...(p && !anchorPet() && !p.held ? [['call', `叫${p.name}出来`]] : []),
    ];
  }
  HICON.cam = ['...kkkk...', '..k....k..', '.k..kk..k.', 'k..kyyk..k', 'k..kyyk..k', '.k..kk..k.', '..k....kk.', '...kkkk.kk', '.........k', '..........'];
  function placeDock() {
    if (!G.save) return;
    const r = dockRect();
    if (!r) { if (dock) { dock.remove(); dock = null; dockKey = ''; PP.refreshInteractive(); } return; }
    const btns = dockBtns(), key = btns.map((b) => b.join(':')).join('|') + (PP.econ && PP.econ.unread() ? 1 : 0);
    if (!dock) {
      dock = $(`<div class="sdock far"></div>`); document.getElementById('ui').appendChild(dock);
      dock.addEventListener('mousedown', (e) => e.stopPropagation());
      dock.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.h, br = b.getBoundingClientRect();
        if (k === 'mini') { PP.toggleMinimal(); return; } if (k === 'call') { summonMain(); return; } if (k === 'cam') { PP.isle.resetCam && PP.isle.resetCam(); return; }
        pendAt = { x: br.left + br.width / 2, y: br.top + br.height / 2 }; hudClick(k, b); pendAt = null; });
    }
    if (key !== dockKey) { dockKey = key; dock.innerHTML = btns.map(([k, tip]) => `<button data-h="${k}" title="${esc(tip)}" class="${k === 'mini' ? 'key' : ''} ${k === 'bag' && PP.econ && PP.econ.unread() ? 'new' : ''}"><canvas width="20" height="20"></canvas></button>`).join(''); dock.querySelectorAll('button').forEach((b) => hIcon(b.querySelector('canvas'), b.dataset.h)); }
    // 按钮跟着框一起放大缩小（小岛 / 小场景缩放时）
    const zs = U.clamp((r.x1 - r.x0) / 420, 0.8, 1.7); dock.style.setProperty('--zs', zs);
    const M = G.mouse, bw = 26 * zs, H2 = btns.length * 28 * zs, left = r.x0 - bw - 6 < 4 ? r.x1 + 6 : r.x0 - bw - 6, top = U.clamp(r.y1 - H2 - 6, 4, (PP.safeB ? PP.safeB() : G.H) - H2 - 4);
    dock.style.left = Math.round(left) + 'px'; dock.style.top = Math.round(top) + 'px';
    const near = M.onScreen && M.x > Math.min(r.x0, left) - 24 && M.x < Math.max(r.x1, left + bw) + 24 && M.y > Math.min(r.y0, top) - 24 && M.y < r.y1 + 10;
    const now = performance.now(); if (near || pop || dock.matches(':hover')) dockUntil = now + 900;
    const vis = now < dockUntil && !G.editing; if (dock.classList.contains('far') === vis) { dock.classList.toggle('far', !vis); PP.refreshInteractive(); }
  }
  (function dockLoop() { try { placeDock(); } catch (e) {} requestAnimationFrame(dockLoop); })();
  const placeOrb = placeHud, drawOrb = () => { hudKey = ''; buildHud(); };
  PP.placeOrb = placeHud;
  (function follow() { try { if (G.save && hud) placeHud(); } catch (e) {} requestAnimationFrame(follow); })();
  // 每个地方现在有谁：按地方列出来（同一种合在一起），点地方名就过去
  function whereList() {
    if (!PP.wild) return '';
    const c = PP.wild.census();
    const rows = Object.keys(PP.SCENES).map((k) => { const t = PP.wild.censusText(k, c[k]); return `<div class="w"><button class="small" data-s="${k}">${esc(PP.SCENES[k].name)}</button><span title="${esc(t)}">${t ? esc(t) : '<i class="muted">现在没人</i>'}</span></div>`; }).join('');
    return `<div class="where"><span>每个地方都有谁</span>${rows}</div>`;
  }
  // 视图小窗：收起（极简 / 小岛 / 任务栏）、展开（小场景 / 全屏）、小岛大小
  function showPop() {
    hidePop();
    const s = S(), v = curView();
    const B = (on, attrs, txt, tip) => `<button class="small ${on ? 'on' : ''}" ${attrs} title="${tip || ''}">${txt}</button>`;
    pop = $(`<div class="orb-pop view-pop">
      <div class="vrow"><span>极简</span>${B(v === 'top', 'data-v="top"', '任务栏上', '主角在任务栏上面溜达，别的都收起来')}${B(v === 'in', 'data-v="in"', '任务栏中', '主角住进任务栏里：只待在没有图标的空白处，点击都穿透给任务栏')}</div>
      <div class="vrow"><span>场景</span>${B(v === 'house', 'data-v="house"', '小屋', '只看起居室：镜头推近，像以前的小屋')}${B(v === 'isle', 'data-v="isle"', '城堡', '上帝视角：整座城堡能转能剖开，进每个房间，种地、钓鱼')}${B(false, 'data-fp="1"', '第一人称', '用主角的眼睛在城堡里走：方向键走，鼠标拖动转头，E 互动')}${B(v === 'band', 'data-v="band"', '风景', '各地的风景，点地图换地方')}</div>
      ${s.isle && s.mode === 'mini' ? `<div class="vrow"><span>城堡大小</span><button class="small" data-izo="-1" title="缩小">－</button>${[[1, '小'], [2, '中'], [3, '大']].map(([z, n]) => B(Math.abs((s.isleZ || PP.isle.Z0) - PP.isle.SIZES[z]) < 0.05, `data-isz="${z}"`, n)).join('')}<button class="small" data-izo="1" title="放大">＋</button><button class="small" data-ipos="1" title="拖动城堡可以放到任何地方">放回右下角</button></div><div class="vrow"><span>朝向</span>${B(!s.isleMirror, 'data-imir="0"', '朝左', '放在屏幕右边时用')}${B(!!s.isleMirror, 'data-imir="1"', '朝右（镜像）', '放在屏幕左边时用')}<button class="small" data-icam="1" title="回到默认的斜上方视角">回到默认视角</button></div><div class="hint">滚轮缩放；按住按住 Ctrl + 左键拖动转视角；按住城堡拖动可以挪位置</div>` : ''}
      ${v === 'band' ? `<div class="hint">在风景上滚滚轮可以放大缩小</div>` : ''}
      ${v === 'in' ? `<div class="vrow"><span>住在</span>${B(s.barSide !== 'right', 'data-side="left"', '左边')}${B(s.barSide === 'right', 'data-side="right"', '右边')}</div>` : ''}</div>`);
    openPop('view');
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.v) { hidePop(); setView(d.v); return; }
      if (d.fp) { hidePop(); if (curView() !== 'isle') setView('isle'); setTimeout(() => PP.isle.fpStart(), 200); return; }
      if (d.side) { hidePop(); S().barSide = d.side; PP.save.soon(); for (const p of G.pets) { const [a, c] = barZone(); p.x = U.clamp(p.x, a, c); } return; }
      if (d.isz) { PP.isle.setSize(+d.isz); showPop(); return; }
      if (d.izo) { PP.isle.setZoom((S().isleZ || PP.isle.Z0) * (d.izo > 0 ? 1.15 : 1 / 1.15), true); showPop(); return; }
      if (d.imir != null) { PP.isle.setMirror(d.imir === '1'); showPop(); return; }
      if (d.ipos) { PP.isle.resetPos(); showPop(); return; }
      if (d.m) { hidePop(); if (S().mode === 'mini') { S().lastMode = d.m; PP.save.soon(); } PP.setMode(d.m); }
      if (d.icam) { PP.isle.resetCam && PP.isle.resetCam(); showPop(); return; }
    });
  }
  // 一次只开一个小窗：贴着工具栏（或者点的位置）摆，放不下就翻到另一边
  let popAt = null, pendAt = null;
  function openPop(kind, at) {
    popKind = kind; popAt = at || pendAt || null; pendAt = null;
    document.getElementById('ui').appendChild(pop);
    pop.addEventListener('mousedown', (e) => e.stopPropagation());
    placePop(); hudKey = ''; buildHud(); PP.refreshInteractive();
  }
  function placePop() {
    if (!pop) return;
    const pr = pop.getBoundingClientRect(), sb = PP.safeB ? PP.safeB() : G.H;
    let ax, ay0, ay1;
    if (popAt) { ax = popAt.x; ay0 = popAt.y - 8; ay1 = popAt.y + 8; }
    else { const b = (hud && hud.querySelector(`[data-h="${popKind}"]`)) || hud, r = b.getBoundingClientRect(); ax = r.left + r.width / 2; ay0 = r.top; ay1 = r.bottom; }
    pop.style.left = Math.round(U.clamp(ax - pr.width / 2, 4, G.W - pr.width - 4)) + 'px';
    pop.style.top = Math.round(ay0 - pr.height - 8 > 4 ? ay0 - pr.height - 8 : Math.min(ay1 + 8, sb - pr.height - 4)) + 'px';
  }
  PP.hud = {
    pop(el, at) { hidePop(); PP.ui.closeMenu(); pop = el; pop.classList.add('orb-pop'); openPop('custom', at); },
    close: () => hidePop(), isOpen: () => !!pop, refresh: () => { hudKey = ''; buildHud(); },
  };
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
  PP.sceneIcon = PP.sceneIcon;
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
    const castlePin = (() => { const p = MAP_POS.skyisle, on = !!(G.isle); return `<button class="pin castle ${on ? 'on' : ''}" data-s="castle" style="left:${(p[0] * 100).toFixed(1)}%;top:${(p[1] * 100).toFixed(1)}%"><i data-ico="castle"></i><span>飞行城堡</span></button>`; })();
    const pins = castlePin + all.map(([k, n]) => { const p = MAP_POS[k] || [0.5, 0.5], cnt = c[k] ? Object.values(c[k]).reduce((a, b) => a + (b.n || 0), 0) : 0; return `<button class="pin ${cur === k ? 'on' : ''}" data-s="${k}" style="left:${(p[0] * 100).toFixed(1)}%;top:${(p[1] * 100).toFixed(1)}%"><i data-ico="${k}"></i><span>${esc(n)}</span>${cnt ? `<em>${cnt}</em>` : ''}</button>`; }).join('');
    const tabs = [['map', '地图'], ['sound', '声音'], ['set', '设置']].map(([k, n]) => `<button class="tab ${popTab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('');
    let body = '';
    if (popTab === 'map') body = `<div class="mapwrap"><canvas class="worldmap" width="${MAP_W}" height="${MAP_H}"></canvas>${pins}<div class="pv"></div></div><div class="hint">按住地球拖动可以转 · 点旗子就过去 · 鼠标停在旗子上先看一眼 <button class="small" data-a="hide">${s.sceneHidden ? '显示场景画面' : '藏起场景画面'}</button></div>`;
    else if (popTab === 'sound') {
      const off = s.ambOff || {};
      body = `<div class="sndtop"><button class="small ${s.ambient ? 'on' : ''}" data-a="amb">${s.ambient ? '♪ 环境声：开' : '♪ 环境声：关'}</button>${[[0.25, '轻'], [0.5, '中'], [0.8, '响']].map(([v, n]) => `<button class="small ${s.ambient && (s.ambientVol != null ? s.ambientVol : 0.5) === v ? 'on' : ''}" data-vol="${v}" ${s.ambient ? '' : 'disabled'}>${n}</button>`).join('')}</div>
        <div class="srcs">${(PP.ambient && PP.ambient.SOURCES || []).map(([k, n, tip]) => `<div class="src" data-src="${k}"><button class="small ${off[k] ? '' : 'on'}" data-off="${k}">${off[k] ? '关' : '开'}</button><div><b>${n}</b><span class="now"></span><small>${esc(tip)}</small></div></div>`).join('')}</div>`;
    } else {
      body = `<div class="seasons"><span>季节</span>${[['auto', '跟随日历'], ['spring', '春'], ['summer', '夏'], ['autumn', '秋'], ['winter', '冬']].map(([k, n]) => `<button class="small ${(s.seasonFix || 'auto') === k ? 'on' : ''}" data-season="${k}">${n}</button>`).join('')}</div>
        <div class="sound"><button class="small ${!s.bandBehind ? 'on' : ''}" data-a="top">${!s.bandBehind ? '风景：总在最前面' : '风景：可被其他窗口盖住'}</button><button class="small ${s.sceneInfo ? 'on' : ''}" data-a="info">${s.sceneInfo ? '场景信息：显示' : '场景信息：不显示'}</button><button class="small" data-a="decor">布置这个场景…</button></div>
        <div class="env">${esc(PP.env.label())}</div>`;
    }
    const sz = s.popSize || 'S', sizes = [['S', '小'], ['M', '中'], ['L', '大']].map(([k, n]) => `<button class="tab ${sz === k ? 'on' : ''}" data-size="${k}" title="弹窗大小">${n}</button>`).join('');
    pop = $(`<div class="orb-pop scene-pop map2 size-${sz}"><div class="maphead"><b>${cur && PP.SCENES[cur] ? esc(PP.SCENES[cur].name) : '地图'}</b><div class="tabs">${tabs}</div><div class="tabs sizes">${sizes}</div></div>${body}</div>`);
    pop.querySelectorAll('i[data-ico]').forEach((el) => el.replaceWith(icon((PP.SCENE_ICON || {})[el.dataset.ico], 14)));
    const cvs = pop.querySelector('canvas.worldmap'); if (cvs) { if (PP.GLOBE) PP.GLOBE.mount(pop.querySelector('.mapwrap')); else cvs.getContext('2d').drawImage(drawWorldMap(), 0, 0); }
    // 鼠标停在旗子上：小预览（那边现在的样子 + 谁在那儿）
    const pv = pop.querySelector('.pv');
    if (pv) pop.querySelectorAll('.pin').forEach((b) => {
      b.addEventListener('mouseenter', () => {
        const k = b.dataset.s; pv.innerHTML = '';
        if (k === 'castle') { pv.innerHTML = '<div><b>飞行城堡</b><br><span>你的家：一座飘在天上的城堡（就是浮空岛）。点一下进去</span></div>'; pv.style.left = b.style.left; pv.style.top = b.style.top; pv.classList.add('show'); pv.classList.toggle('up', false); pv.classList.toggle('left', true); return; }
        try { const t = PP.scene.thumb(k, 132, 120), im = document.createElement('canvas'); im.width = 132; im.height = 120; im.getContext('2d').drawImage(t, 0, 0); pv.appendChild(im); } catch (err) {}
        const r = regionOf[k], nm = PP.SCENES[k] ? PP.SCENES[k].name : k, who = PP.wild ? PP.wild.censusText(k, c[k]) : '';
        pv.insertAdjacentHTML('beforeend', `<div><b>${esc((r && r.subs.length > 1 ? r.name + ' · ' : '') + nm)}</b>${PP.NEST && PP.NEST[k] ? '<small>（在' + esc(PP.SCENES[PP.NEST[k]].name) + '里）</small>' : ''}<br><span>${esc(who || '现在没人')}</span></div>`);
        pv.style.left = b.style.left; pv.style.top = b.style.top; pv.classList.add('show'); pv.classList.toggle('up', parseFloat(b.style.top) > 55); pv.classList.toggle('left', parseFloat(b.style.left) > 60);
      });
      b.addEventListener('mouseleave', () => pv.classList.remove('show'));
    });
    // 声音：每个来源现在在响什么
    if (popTab === 'sound') { const upd = () => { const L = PP.ambient && PP.ambient.layers ? PP.ambient.layers() : []; pop && pop.querySelectorAll('.src').forEach((el) => { const k = el.dataset.src, list = L.filter((x) => x.src === k).map((x) => x.name); el.querySelector('.now').textContent = !s.ambient ? '' : (s.ambOff || {})[k] ? '：已关掉' : list.length ? '：' + list.join('、') : '：现在没有'; }); }; upd(); const iv = setInterval(() => { if (!pop || !pop.isConnected || popTab !== 'sound') return clearInterval(iv); upd(); }, 1000); }
    openPop('map');
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tab) { popTab = b.dataset.tab; showScenePop(); return; }
      if (b.dataset.size) { S().popSize = b.dataset.size; PP.save.soon(); showScenePop(); return; }
      if (b.dataset.s === 'castle') { hidePop(); setView('isle'); return; }
      if (b.dataset.s) { S().sceneHidden = false; if (PP.scene.inside()) PP.scene.leave(); if (S().mode === 'mini') PP.setMode(S().lastMode && S().lastMode !== 'mini' ? S().lastMode : 'band'); PP.scene.go(b.dataset.s); hidePop(); return; }
      if (b.dataset.season) { S().seasonFix = b.dataset.season === 'auto' ? null : b.dataset.season; PP.save.soon(); PP.syncTray && PP.syncTray(true); showScenePop(); return; }
      if (b.dataset.off) { const o = S().ambOff = S().ambOff || {}; o[b.dataset.off] = !o[b.dataset.off]; PP.save.soon(); showScenePop(); return; }
      if (b.dataset.a === 'amb') { PP.menuRun('ambient'); showScenePop(); return; }
      if (b.dataset.a === 'top') { S().bandBehind = !S().bandBehind; PP.save.soon(); applyOnTop(); showScenePop(); return; }
      if (b.dataset.a === 'hide') { S().sceneHidden = !S().sceneHidden; PP.save.soon(); PP.ui.toast(S().sceneHidden ? '场景藏起来了，动物还在' : '场景回来了'); showScenePop(); return; }
      if (b.dataset.a === 'info') { S().sceneInfo = !S().sceneInfo; PP.save.soon(); showScenePop(); return; }
      if (b.dataset.a === 'decor') { hidePop(); if (S().mode === 'mini') PP.setMode('band'); PP.scene.edit(true); return; }
      if (b.dataset.vol) { S().ambientVol = +b.dataset.vol; PP.save.soon(); showScenePop(); return; }
    });
  }
  function hidePop() { if (pop) { pop.remove(); pop = null; popKind = null; popAt = null; hudKey = ''; buildHud(); PP.refreshInteractive(); } }

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
  const miniBar = (p) => S().mode === 'mini' && PP.mainPet && PP.mainPet() === p && !p.d.wild && !dockOn();
  const btnsFor = (p) => miniBar(p) ? [['fav', `喂${p.sp.favName}`], ['water', '喂水'], ['pet', '摸摸'], ['menu', '更多']]
    : [['info', '档案'], ['fav', `喂${p.sp.favName}`], ['water', '喂水'], ['pet', '摸摸'], p.d.wild ? ['adopt', '认养它'] : ['main', '让它陪着我'], ['menu', '更多']];
  // 主角身边还有外面一圈：极简开关（最常用，排第一个）、视图、地图、背包、进出小屋。
  // 不同视图给的不一样：极简 / 任务栏里没有场景，就不放地图；小岛上多一个进屋 / 出门
  function sysFor(p) {
    if (!(PP.mainPet && PP.mainPet() === p) || p.d.wild) return [];
    if (dockOn()) return []; // 小场景 / 小岛：这些按钮在框旁边那一条里
    const s = S(), isle = !!G.isle, inside = isle && PP.isle.inside(), n = PP.econ && PP.econ.unread();
    // 极简：换场景放最前面（最常用），其余只留背包、视图、退出极简
    if (miniBar(p)) return [['view', '换到场景：小屋 / 城堡 / 风景'], ['map', '地图：去别的地方看风景'], ['bag', n ? `背包（${n} 封新信）` : '背包 · 商店']];
    return [
      [isPure() ? 'expand' : 'mini', isPure() ? '退出极简（回到刚才的样子）' : '极简：只留主角'],
      ['view', '视图：任务栏上 / 任务栏中 · 小屋 / 城堡 / 风景'],
      ...(s.mode !== 'mini' ? [['map', '地图 · 季节 · 声音']] : []),
      ['bag', n ? `背包 · 商店（${n} 封新信）` : '背包 · 商店 · 探险'],
      ...(isle ? [[inside ? 'out' : 'home', inside ? '回到外面' : '进屋']] : []),
    ];
  }
  Object.defineProperty(PP, 'ringPet', { get: () => ringPet });
  function barTick() {
    if (!G.save) return;
    const hp = G.hoverPet;
    const over = ring && (ring.matches(':hover') || (G.mouse.onScreen !== false && PP.ringZone(G.mouse.x, G.mouse.y)));
    if (hp !== lastHover) { lastHover = hp; hoverSince = performance.now(); }
    const menuOpen = !!document.querySelector('.menu');
    if (hp && !G.editing && !menuOpen && !pop && !(hud && hud.matches(':hover')) && !(PP.isle && PP.isle.pressing && PP.isle.pressing()) && performance.now() - hoverSince > 250 && hp !== ringPet) showBar(hp);
    if (ring && !hp && !over) { if (!hideT) hideT = performance.now(); if (performance.now() - hideT > 450) hideBar(); } else hideT = 0;
    if (ring && ringPet) {
      if (!G.pets.includes(ringPet) || ringPet.inDoor || ringPet.held) { hideBar(); return; }
      const S = G.S * (ringPet.scaleMul || 1);
      const mini = G.save.settings.mode === 'mini';
      if (ring.classList.contains('mbar')) {
        // 极简：头顶一条小胶囊，不绕圈
        const zs = U.clamp(G.S / 2, 0.75, 1.8); ring.style.transformOrigin = '0 0'; ring.style.transform = `scale(${zs})`;
        const w = (ring.offsetWidth || 220) * zs, h = (ring.offsetHeight || 32) * zs, top0 = ringPet.y - ringPet.bodyH() - 8;
        let top = top0 - h; if (top < 4) top = ringPet.y + 6;
        ring.style.left = Math.round(U.clamp(ringPet.x - w / 2, 4, G.W - w - 4)) + 'px'; ring.style.top = Math.round(top) + 'px';
        return;
      }
      const bs = Math.round(U.clamp(16 + S * 4, 20, 30) * (mini ? 0.85 : 1));
      ring.style.setProperty('--bs', bs + 'px');
      const bh = ringPet.bodyH ? ringPet.bodyH() : 26 * S, cx = ringPet.x, cy = mini ? ringPet.y - bh * 0.5 : ringPet.y - 13 * S + ringPet.sinkPx() + (ringPet.wade || 0), span = Math.PI * 0.9;
      const groups = [[...ring.querySelectorAll('button:not(.sys)')], [...ring.querySelectorAll('button.sys')]].filter((g) => g.length);
      let R = 0;
      groups.forEach((btns, gi) => {
        const n = btns.length;
        // 弧的半径：保证按钮之间不挤在一起；外圈在里圈外面一个按钮远
        R = Math.max(gi ? R + bs * 1.22 : (mini ? bh * 0.62 + bs * 0.7 : 12 * S + bs * 0.9), ((n - 1) * bs * 1.12) / span); // 极简：按着动物身子大小绕，不压到脸
        const nearL = cx < R + bs * 1.2, nearR = cx > G.W - R - bs * 1.2;
        if (mini && (nearL || nearR)) {
          // 极简贴着屏幕边：改成朝里的四分之一圈（从侧面绕到头顶），还是围着它
          const q = Math.PI / 2;
          R = Math.max(R, ((n - 1) * bs * 1.12) / q);
          const a0 = nearR ? Math.PI : -q;
          btns.forEach((b, i) => {
            const a = n === 1 ? a0 + q / 2 : a0 + (q * (nearR ? i : n - 1 - i)) / (n - 1);
            const x = U.clamp(cx + Math.cos(a) * R, bs / 2 + 2, G.W - bs / 2 - 2), y = U.clamp(cy + Math.sin(a) * R, bs / 2 + 2, G.H - bs / 2 - 2);
            b.style.left = x - bs / 2 + 'px'; b.style.top = y - bs / 2 + 'px';
          });
        } else if (nearL || nearR) {
          // 贴着屏幕左右边：弧会被切掉一半，改成在它朝里的一侧竖着排（外圈再往里一列）
          const side = nearR ? -1 : 1, gap = bs * 1.15, colX = U.clamp(cx + side * (10 * S + bs * 0.9 + gi * bs * 1.22), bs / 2 + 2, G.W - bs / 2 - 2);
          const top = U.clamp(cy - ((n - 1) * gap) / 2, bs / 2 + 2, G.H - bs / 2 - 2 - (n - 1) * gap);
          btns.forEach((b, i) => { b.style.left = colX - bs / 2 + 'px'; b.style.top = top + i * gap - bs / 2 + 'px'; });
        } else {
          const mid = cy - R < bs ? Math.PI / 2 : -Math.PI / 2;
          btns.forEach((b, i) => {
            const a = n === 1 ? mid : mid - span / 2 + (span * i) / (n - 1);
            const x = U.clamp(cx + Math.cos(a) * R, bs / 2 + 2, G.W - bs / 2 - 2), y = U.clamp(cy + Math.sin(a) * R, bs / 2 + 2, G.H - bs / 2 - 2);
            b.style.left = x - bs / 2 + 'px'; b.style.top = y - bs / 2 + 'px';
          });
        }
      });
      const mb = ring.querySelector('[data-c=main]'); if (mb) mb.classList.toggle('on', G.save.settings.mainId === ringPet.d.id);
    }
  }
  function showBar(p) {
    hideBar();
    ringPet = p;
    if (miniBar(p)) {
      // 极简：还是绕着动物一圈。里圈：喂 / 水 / 摸 / 更多；外圈：场景（最常用，高亮）/ 地图 / 背包
      const sys = sysFor(p), care = btnsFor(p);
      ring = $(`<div class="hoverbar petring">${care.slice(0, 4).map(([c, tip]) => `<button data-c="${c}" title="${esc(tip)}"><canvas width="20" height="20"></canvas></button>`).join('')}${sys.map(([c, tip]) => `<button class="sys ${c === 'view' ? 'key' : ''} ${c === 'bag' && PP.econ && PP.econ.unread() ? 'new' : ''}" data-h="${c}" title="${esc(tip)}"><canvas width="20" height="20"></canvas></button>`).join('')}</div>`);
    } else
    ring = $(`<div class="hoverbar petring">${btnsFor(p).map(([c, tip]) => `<button data-c="${c}" title="${tip}"><canvas width="20" height="20"></canvas></button>`).join('')}${sysFor(p).map(([c, tip]) => `<button class="sys ${c === 'mini' || c === 'expand' ? 'key' : ''} ${c === 'bag' && PP.econ && PP.econ.unread() ? 'new' : ''}" data-h="${c}" title="${esc(tip)}"><canvas width="20" height="20"></canvas></button>`).join('')}</div>`);
    ring.querySelectorAll('button').forEach((b) => (b.dataset.h ? hIcon(b.querySelector('canvas'), b.dataset.h) : drawIconTo(b.querySelector('canvas'), b.dataset.c, p)));
    document.getElementById('ui').appendChild(ring);
    barTick();
    requestAnimationFrame(() => ring && ring.classList.add('in'));
    ring.addEventListener('mousedown', (e) => e.stopPropagation());
    ring.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !ringPet) return;
      if (b.dataset.h) { const k = b.dataset.h, r = b.getBoundingClientRect(); if (k === 'mini' || k === 'expand') { PP.toggleMinimal(); return; } pendAt = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; hideBar(); hudClick(k, b); pendAt = null; return; }
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
  // 鼠标在“动物 + 这圈按钮”的范围里：按钮不消失，窗口也一直接住鼠标（不然从动物移到按钮的路上会穿透、按钮跟着消失）
  PP.ringZone = (x, y) => {
    if (!ring || !ringPet || x == null) return false;
    let x0 = ringPet.x - 20 * G.S, x1 = ringPet.x + 20 * G.S, y0 = ringPet.y - ringPet.bodyH() - 6, y1 = ringPet.y + 4;
    for (const b of ring.querySelectorAll('button')) { const r = b.getBoundingClientRect(); if (!r.width) continue; x0 = Math.min(x0, r.left); x1 = Math.max(x1, r.right); y0 = Math.min(y0, r.top); y1 = Math.max(y1, r.bottom); }
    return x > x0 - 10 && x < x1 + 10 && y > y0 - 10 && y < y1 + 10;
  };

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
      if (pop && !pop.matches(':hover') && !(hud && hud.matches(':hover'))) hidePop();
    }, 30);
  });

  PP.modes = {
    init() { applyMenuScale(); buildHud(); window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePop(); }); setInterval(barTick, 50); setInterval(menuWatch, 300); setFullFlag(); },
    drawOrb, hideBar, placeOrb, showMap: () => showScenePop(),
  };
})();
