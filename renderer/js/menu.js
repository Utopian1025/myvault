// 统一菜单：托盘图标右键、左下角爪子、宠物右键 —— 都是同一棵菜单树
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const api = window.petAPI;

  const PRESETS = [0, 20, 30, 45, 60, 90, 120];
  PP.SIZES = [[1, '迷你', '32 像素'], [2, '小', '64 像素'], [3, '中', '96 像素'], [4, '大', '128 像素'], [5, '特大', '160 像素'], [6, '巨大', '192 像素']];

  function petSub(p, full) {
    const d = p.d, id = d.id, hid = !!d.hidden, sp = p.sp;
    const main = PP.F && PP.F.main() === p;
    const wild = !!d.wild, here = G.pets.includes(p);
    const items = [
      { id: `pet:${id}:feed`, label: `喂${sp.favName}`, hint: full ? '最爱' : null },
      { id: `pet:${id}:water`, label: '喂水' },
      ...(wild ? [] : [{ id: `pet:${id}:snack`, label: '喂零食 / 装扮…', hint: full && PP.econ ? `Lv${PP.econ.lvOf(p)}` : null }, { id: `pet:${id}:trip`, label: d.trip ? '在外面探险…' : '派它去探险…' }]),
      { id: `pet:${id}:pat`, label: '摸摸它', enabled: here },
      { id: `pet:${id}:ball`, label: '扔球给它', enabled: here },
      { id: `pet:${id}:sleep`, label: p.sleeping ? '叫醒它' : '哄它睡觉', enabled: here },
      { id: `pet:${id}:think`, label: '看看它在想什么', enabled: here },
      '-',
      wild ? { id: `pet:${id}:adopt`, label: '认养它（取个名字）…' } : { id: `pet:${id}:main`, label: '让它陪着我（极简模式、提醒、陪打字）', type: 'radio', checked: main },
      ...(wild ? [] : [{ id: `pet:${id}:note`, label: d.note ? '撕掉头顶便签' : '贴一张头顶便签' }, { id: `pet:${id}:coat`, label: '换花色' }, { id: `pet:${id}:rename`, label: '改名字…' }]),
      { id: `pet:${id}:goto`, label: `去它在的地方看看（${PP.SCENES[d.scene] ? PP.SCENES[d.scene].name : ''}）`, enabled: !here },
      '-',
      { id: `pet:${id}:profile`, label: '查看档案' },
      ...(wild || !PP.canMoveIn(p) ? [] : [{ id: `pet:${id}:move`, label: '搬家…' }]),
      ...(wild ? [] : [{ id: `pet:${id}:release`, label: '放回野外…' }]),
    ];
    return items;
  }

  function intervalSub(key) {
    const v = G.save.settings.rem[key] || 0;
    const list = PRESETS.map((m) => ({ id: `rem:${key}:${m}`, label: m ? `每 ${m} 分钟` : '关闭', type: 'radio', checked: v === m }));
    if (!PRESETS.includes(v)) list.push({ id: `rem:${key}:${v}`, label: `每 ${v} 分钟（自定义）`, type: 'radio', checked: true });
    list.push('-', { id: 'reminders', label: '自定义间隔…' });
    return list;
  }

  PP.menuModel = function (focus, forTray) {
    const s = G.save.settings;
    const T = (v) => (forTray ? null : v); // 托盘菜单不显示右侧小字
    const items = [];
    if (focus) items.push({ label: `${focus.name}`, hint: T(focus.moodName), sub: petSub(focus, true) }, '-');
    const curMode = s.mode === 'mini' && s.taskbar ? 'bar' : s.mode === 'mini' && s.isle ? 'isle' : s.mode, modeName = (PP.MODES.find((m) => m[0] === curMode) || ['', ''])[1];
    const mineList = G.all.filter((p) => !p.d.wild);
    const pets = mineList.map((p) => ({ label: p.name + `（${p.sp.name}）` + (G.save.settings.mainId === p.d.id ? ' ★' : ''), sub: petSub(p) }));
    const petsMenu = { label: '我认养的', hint: T(`${mineList.length} 只`), sub: [
      ...pets, ...(pets.length ? ['-'] : [{ label: '还没有认养：指着喜欢的动物点“认养”', enabled: false }, '-']),
      { id: 'adopt', label: '再领养一只新的…' },
      { id: 'feedAll', label: '给认养的都喂点吃的喝的', enabled: mineList.length > 0 },
      { id: 'overview', label: '每个地方都有谁' },
    ] };
    const modes = PP.MODES.map(([k, n, d]) => ({ id: `mode:${k}`, label: forTray ? n : `${n}（${d}）`, type: 'radio', checked: curMode === k }));
    const quiet = { label: '勿扰', hint: T(s.quiet ? '开' : s.autoQuiet !== false ? '自动' : ''), sub: [
      { id: 'autoQuiet', label: '工作时自动安静（打字时不说话、不来找你、声音调小）', type: 'checkbox', checked: s.autoQuiet !== false },
      { id: 'quiet', label: '工作模式（不说话、不找你、不乱动，只跟着你的操作动）', type: 'checkbox', checked: !!s.quiet },
      { label: '睡眠时间（不出声、大家都去睡）', hint: T(s.sleepMode && s.sleepMode.on ? `${s.sleepMode.from}:00–${s.sleepMode.to}:00` : '关'), sub: [
        { id: 'sleep:off', label: '关闭', type: 'radio', checked: !(s.sleepMode && s.sleepMode.on) },
        ...[[22, 7], [23, 7], [0, 8], [12, 14]].map(([a, b]) => ({ id: `sleep:${a}:${b}`, label: `${a}:00 – ${b}:00${a === 12 ? '（午休）' : ''}`, type: 'radio', checked: !!(s.sleepMode && s.sleepMode.on && s.sleepMode.from === a && s.sleepMode.to === b) })),
        { id: 'sleepCustom', label: '自定义时间…' },
      ] },
      '-', { id: 'toggleAll', label: s.allAway ? '把大家叫出来' : '让大家都回电脑里', hint: T('Ctrl+Alt+Shift+P') },
    ] };
    const remind = { label: '提醒', sub: [
      { label: '喝水提醒', hint: T(s.rem.water ? `${s.rem.water} 分钟` : '关'), sub: intervalSub('water') },
      { label: '站立提醒', hint: T(s.rem.stretch ? `${s.rem.stretch} 分钟` : '关'), sub: intervalSub('stretch') },
      '-',
      PP.F && PP.F.pomo.phase !== 'off' ? { id: 'pomo', label: '停止番茄钟' } : { id: 'pomo', label: `开始番茄钟（${s.pomo.focus} 分钟）` },
      { id: 'reminders', label: '定时提醒（每天 / 每周）& 番茄钟…' },
    ] };
    const settingsMenu = { label: '设置', sub: [
      { label: '宠物大小', sub: PP.SIZES.map(([v, n, d]) => ({ id: `size:${v}`, label: `${n}（${d}）`, type: 'radio', checked: (s.size || 2) === v })) },
      { label: '菜单大小', sub: PP.MENU_SCALES.map(([v, n]) => ({ id: `ms:${v}`, label: n, type: 'radio', checked: (s.menuScale || 0.8) === v })) },
      { label: '托盘菜单', sub: [{ id: 'tray:simple', label: '精简（常用的几项）', type: 'radio', checked: s.trayMenu !== 'full' }, { id: 'tray:full', label: '完整', type: 'radio', checked: s.trayMenu === 'full' }] },
      { id: 'appIcon', label: '软件图标（换成喜欢的动物）…' },
      { id: 'settings', label: '更多设置…' },
      { id: 'about', label: `关于 & 检查更新${PP.APP_VERSION ? '（v' + PP.APP_VERSION + '）' : ''}` },
    ] };
    // 托盘菜单（精简）：只放最常用的
    if (forTray && s.trayMenu !== 'full') {
      items.push(...modes, '-', petsMenu, quiet, remind, settingsMenu);
      if (api) items.push('-', { id: 'hideWin', label: '暂时隐藏全部' }, { id: 'quit', label: '退出' });
      return items;
    }
    const counts = (k) => (PP.eco ? PP.eco.countAt(k) : 0);
    const ec = PP.econ && PP.econ.E();
    const econMenu = ec ? { label: '小鱼干 · 成长', hint: T(`${ec.fish} 条${PP.econ.unread() ? ' · 有信' : ''}`), sub: [
      { id: 'econ:bag', label: '背包（零食、收成、装扮）' }, { id: 'econ:shop', label: '商店' }, { id: 'econ:trip', label: '探险' },
      { id: 'econ:book', label: '图鉴 & 明信片' }, { id: 'econ:mail', label: `信箱${PP.econ.unread() ? `（${PP.econ.unread()} 封新信）` : ''}` }, { id: 'econ:home', label: '布置小屋和小岛' },
      '-', { id: 'mode:isle', label: '去小岛（种地、进小屋）' },
    ] } : null;
    if (forTray && s.trayMenu !== 'full' && econMenu) econMenu.sub = econMenu.sub.slice(0, 6);
    items.push(
      petsMenu, ...(econMenu ? [econMenu] : []),
      { label: '显示', hint: T(PP.scene.active() ? `${modeName} · ${PP.SCENES[PP.scene.view()].name}` : modeName), sub: [
        ...modes, '-',
        ...Object.entries(PP.SCENES).map(([k, v]) => ({ id: `scene:${k}`, label: `去${v.name}` + (counts(k) ? `（${counts(k)} 只在这儿）` : ''), type: 'radio', checked: PP.scene.active() && PP.scene.view() === k })),
        '-',
        { label: '场景高度', sub: [[1, '矮一点'], [2, '适中'], [3, '高一点']].map(([h, n]) => ({ id: `bgh:${h}`, label: n, type: 'radio', checked: (s.bgH || 2) === h })) },
        { id: 'decorate', label: '布置这个场景…', enabled: PP.scene.active() },
      ] },
      { label: '天气和季节', hint: T(PP.env.weatherName(PP.env.get().weather.kind)), sub: [
        { id: 'weather:auto', label: s.city ? `跟随实时天气（${s.city.name}）` : '按季节模拟（还没设城市）', type: 'radio', checked: (s.weather || 'auto') === 'auto' },
        { label: '固定天气', sub: PP.WEATHER.map(([k, n]) => ({ id: `weather:${k}`, label: `一直${n}`, type: 'radio', checked: s.weather === k })) },
        { id: 'city', label: s.city ? `换城市…（现在：${s.city.name}）` : '设置所在城市（实时天气）…' },
        '-',
        ...[['auto', '季节跟随日历和节气'], ['spring', '一直是春天'], ['summer', '一直是夏天'], ['autumn', '一直是秋天'], ['winter', '一直是冬天']].map(([k, n]) => ({ id: `season:${k}`, label: n, type: 'radio', checked: (s.seasonFix || 'auto') === k })),
        '-', { label: PP.env.label(), enabled: false },
      ] },
      { label: '声音', hint: T(s.ambient ? '开' : '关'), sub: [
        { id: 'ambient', label: '环境声音（雨声、鸟叫、溪水…）', type: 'checkbox', checked: !!s.ambient },
        ...[[0.25, '很轻'], [0.5, '适中'], [0.8, '大一点']].map(([v, n]) => ({ id: `avol:${v}`, label: `音量：${n}`, type: 'radio', checked: (s.ambientVol != null ? s.ambientVol : 0.5) === v, enabled: !!s.ambient })),
      ] },
      quiet, remind,
      { label: '照顾 & 回忆', sub: [
        { id: 'ball', label: '扔个球' },
        { id: 'feedAll', label: '给认养的都喂点吃的喝的' },
        '-',
        { id: 'diary', label: '日记' },
        { id: 'collection', label: '收藏柜' },
        { id: 'eggs', label: '彩蛋图鉴', hint: T(`${Object.keys(G.save.eggs).length}/${Object.keys(PP.EGGS).length}`) },
      ] },
      settingsMenu,
    );
    if (api) items.push('-', { id: 'hideWin', label: '暂时隐藏全部' }, { id: 'quit', label: '退出' });
    return items;
  };

  PP.menuRun = function (id) {
    const s = G.save.settings, ui = PP.ui;
    const [a, b, c] = id.split(':');
    if (a === 'pet') { petCmd(G.all.find((p) => p.d.id === b), c); PP.save.soon(); syncTray(true); return; }
    if (a === 'rem') { s.rem[b] = +c; if (b === 'water') PP.F.lastWater = Date.now(); else PP.F.lastStretch = Date.now(); ui.toast(+c ? `${b === 'water' ? '喝水' : '站立'}提醒：每 ${c} 分钟` : `${b === 'water' ? '喝水' : '站立'}提醒已关闭`); PP.save.soon(); syncTray(true); return; }
    if (a === 'size') { s.size = +b; G.pets.forEach((p) => { p.y = G.ground; }); PP.save.soon(); syncTray(true); return; }
    if (a === 'mode') { if (b === 'mini') { const was = s.isle || s.taskbar; s.taskbar = false; s.isle = false; if (s.mode === 'mini') { PP.applyBar(); was && PP.setMode('mini', false, true); return; } } PP.setMode(b); return; }
    if (a === 'econ') { PP.econ.openPanel(b); return; }
    if (a === 'isle') { PP.isle && PP.isle.cmd(b, c, id.split(':')[3]); return; }
    if (a === 'scene') { PP.scene.go(b); return; }
    if (a === 'weather') { s.weather = b; if (b === 'auto' && !s.city) PP.ui.toast('还没设城市：天气会按季节模拟'); PP.save.soon(); syncTray(true); return; }
    if (a === 'season') { s.seasonFix = b === 'auto' ? null : b; PP.save.soon(); syncTray(true); return; }
    if (a === 'avol') { s.ambientVol = +b; PP.save.soon(); syncTray(true); return; }
    if (a === 'ms') { s.menuScale = +b; PP.applyMenuScale(); PP.save.soon(); syncTray(true); return; }
    if (a === 'bgh') { s.bgH = +b; PP.save.soon(); syncTray(true); return; }
    if (a === 'tray') { s.trayMenu = b; PP.save.soon(); syncTray(true); ui.toast(b === 'full' ? '托盘菜单：完整' : '托盘菜单：精简'); return; }
    if (a === 'sleep') { s.sleepMode = b === 'off' ? Object.assign({}, s.sleepMode || {}, { on: false }) : { on: true, from: +b, to: +c }; ui.toast(b === 'off' ? '睡眠时间：关' : `睡眠时间：${b}:00–${c}:00，这段时间大家都去睡觉，不出声`); PP.save.soon(); syncTray(true); return; }
    if (a === 'calmAll') { G.all.forEach((p) => (p.d.calm = false)); PP.save.soon(); syncTray(true); return; }
    switch (id) {
      case 'adopt': ui.adopt(); break;
      case 'sleepCustom': PP.sleepPanel(); break;
      case 'city': PP.cityPanel(); break;
      case 'decorate': PP.scene.edit(true); break;
      case 'ambient': s.ambient = !s.ambient; if (!s.ambient) PP.ambient.stop(); ui.toast(s.ambient ? '环境声音开了（音量在“场景”菜单里调）' : '环境声音关了'); break;
      case 'toggleAll': PP.toggleAll(); break;
      case 'overview': ui.overview(); break;
      case 'showAll': { const back = G.all.filter((p) => p.d.hidden); back.forEach((p) => { p.d.hidden = false; PP.hereNow(p); }); PP.syncPets(); back.forEach((p, i) => PP.petEmerge(p, U.rand(G.W * 0.2, G.W * 0.8), i * 600)); break; }
      case 'work': s.work = !s.work; ui.toast(s.work ? '工作模式：大家会乖乖待着，不乱跑不乱跳' : '下班啦，大家可以随便玩了'); if (s.work) G.pets.forEach((p) => { if (['wander', 'explore', 'play', 'cursor_play', 'seek_user', 'social', 'bug', 'ball', 'zoomies', 'special', 'follow', 'root', 'forage'].includes(p.action)) p.interrupt(); }); break;
      case 'autoQuiet': s.autoQuiet = s.autoQuiet === false; ui.toast(s.autoQuiet ? '工作时自动安静：开（你打字时它们不说话、不来找你）' : '工作时自动安静：关'); break;
      case 'appIcon': ui.appIconPanel && ui.appIconPanel(); break;
      case 'quiet': s.quiet = !s.quiet; ui.toast(s.quiet ? '工作模式：不说话、不找你、不乱动，只跟着你的打字和滚动动一动' : '下班啦，大家可以随便玩了'); if (s.quiet) G.pets.forEach((p) => { p.bubble = null; if (!['sleep', 'knead', 'rollPaper', 'held', 'landing'].includes(p.action) && !p.held && !p.airborne) p.interrupt(); }); break;
      case 'pomo': PP.F.pomo.phase === 'off' ? PP.F.pomoStart() : PP.F.pomoStop(); break;
      case 'reminders': ui.reminders(); break;
      case 'feedAll': { const L2 = G.all.filter((p) => !p.d.wild); L2.forEach((p) => PP.feedPet(p, 'both')); ui.toast(L2.length ? `${L2.length} 只都吃饱喝足了` : '还没有认养的伙伴'); break; }
      case 'ball': PP.throwBall(G.W / 2, G.ground - 200); break;
      case 'diary': ui.diaryPanel(); break;
      case 'collection': ui.collectionPanel(); break;
      case 'eggs': ui.eggPanel(); break;
      case 'settings': ui.settings(); break;
      case 'about': PP.update.about(); break;
      case 'hideWin': api && api.hideWindow(); break;
      case 'quit': PP.save.write(); api && api.quit(); break;
    }
    PP.save.soon(); syncTray(true);
  };

  function petCmd(p, c) {
    if (!p) return;
    const d = p.d, ui = PP.ui;
    switch (c) {
      case 'main': G.save.settings.mainId = d.id; if (G.save.settings.mode === 'mini') { G.save.settings.miniMain = d.id; PP.syncPets(); } else if (PP.eco && PP.eco.onView && !PP.scene.inside()) PP.eco.onView(PP.scene.view()); ui.toast(`${p.name}会陪着你：极简模式里待在右下角，提醒、陪打字都由它来`); break;
      case 'feed': case 'fav': PP.feedPet(p, 'food'); break;
      case 'snack': PP.econ.openPanel('bag', { pet: d.id }); break;
      case 'trip': PP.econ.openPanel('trip', { pet: d.id }); break;
      case 'water': PP.feedPet(p, 'water'); break;
      case 'pat': if (G.pets.includes(p)) p.run('petted', PP.ACTIONS.petted); break;
      case 'adopt': PP.wild.adoptPanel(p); break;
      case 'move': PP.moveHome(p); break;
      case 'release': if (confirm(`让${p.name}回到野外吗？它还会在${PP.SCENES[PP.HAB[d.species].home].name}生活，只是不再是你认养的了。`)) PP.wild.release(p); break;
      case 'rename': PP.renamePanel(p); break;
      case 'goto': if (PP.scene.inside()) PP.scene.leave(); if (G.save.settings.mode === 'mini') PP.setMode(G.save.settings.lastMode && G.save.settings.lastMode !== 'mini' ? G.save.settings.lastMode : 'band'); PP.scene.go(d.inHome ? d.scene : d.scene); break;
      case 'ball': PP.throwBall(p.x, p.y - 200); break;
      case 'sleep': if (p.sleeping) p.run('poked', PP.ACTIONS.poked); else p.run('sleep', PP.ACTIONS.sleep); break;
      case 'think': ui.thoughts(p); break;
      case 'note': if (d.note) d.note = ''; else ui.notePanel(p); break;
      case 'coat': ui.coatPanel(p); break;
      case 'profile': ui.petPanel(p); break;
    }
  }

  // 一键召唤 / 送回：所有（没在放假的）宠物走进小门，或者从小门里出来
  let toggling = false;
  PP.toggleAll = function (want) {
    const s = G.save.settings;
    if (toggling) return;
    const away = !!s.allAway;
    if (want === 'summon' && !away) return;
    if (!away) {
      const list = G.pets.slice();
      if (!list.length) { s.allAway = true; return; }
      toggling = true; let left = list.length;
      list.forEach((p, i) => setTimeout(() => PP.petEnter(p, () => { if (--left <= 0) { s.allAway = true; PP.syncPets(); toggling = false; PP.save.soon(); syncTray(true); } }), i * 250));
      setTimeout(() => { if (toggling) { s.allAway = true; PP.syncPets(); toggling = false; } }, 9000);
    } else {
      s.allAway = false; PP.syncPets();
      G.pets.forEach((p, i) => PP.petEmerge(p, U.rand(G.W * 0.2, G.W * 0.8), i * 500));
      PP.save.soon(); syncTray(true);
    }
  };
  if (api && api.onHotkey) api.onHotkey((k) => {
    if (k === 'exitFull') { PP.exitFull && PP.exitFull(); return; }
    else PP.toggleAll(k === 'summon' ? 'summon' : null);
  });

  // 托盘菜单：把菜单树（不含函数）发给主进程，变了才发
  let lastTray = '';
  function syncTray(force) {
    if (!api || !api.setTrayMenu || !G.save) return;
    const json = JSON.stringify(PP.menuModel(null, true));
    if (!force && json === lastTray) return;
    if (json === lastTray) return;
    lastTray = json; api.setTrayMenu(json);
  }
  PP.syncTray = syncTray;
  setInterval(() => { if (PP.started) syncTray(); }, 1500);
})();
