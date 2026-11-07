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
    const items = [
      { id: `pet:${id}:show`, label: '显示在桌面上', type: 'checkbox', checked: !hid },
      { id: `pet:${id}:calm`, label: '乖乖待着（不乱跑不乱跳）', type: 'checkbox', checked: !!d.calm, enabled: !hid },
      { id: `pet:${id}:head`, label: '只露个头', type: 'checkbox', checked: !!d.headOnly, enabled: !hid },
      { id: `pet:${id}:main`, label: '设为主角（提醒 / 陪打字）', type: 'radio', checked: main && !hid, enabled: !hid },
      '-',
      { id: `pet:${id}:fav`, label: `喂${sp.favName}`, enabled: !hid },
      { id: `pet:${id}:treat`, label: '喂零食', enabled: !hid },
      { id: `pet:${id}:ball`, label: '扔球给它', enabled: !hid },
      { id: `pet:${id}:sleep`, label: p.sleeping ? '叫醒它' : '哄它睡觉', enabled: !hid },
      { id: `pet:${id}:think`, label: '看看它在想什么', enabled: !hid },
      { id: `pet:${id}:note`, label: d.note ? '撕掉头顶便签' : '贴一张头顶便签', enabled: !hid },
      { id: `pet:${id}:coat`, label: '换花色' },
      '-',
      { id: `pet:${id}:profile`, label: '查看档案' },
    ];
    if (full) items[5].hint = '最爱';
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
    const modeName = (PP.MODES.find((m) => m[0] === s.mode) || ['', ''])[1];
    const pets = G.all.map((p) => ({ label: p.name + (p.d.hidden ? '（回电脑了）' : '') + (PP.F && PP.F.main() === p ? ' ★' : ''), sub: petSub(p) }));
    const petsMenu = { label: '宠物们', hint: T(`${G.all.length} 只`), sub: [
      ...pets, ...(pets.length ? ['-'] : []),
      { id: 'pickPets', label: '选择谁在桌面上（多选）…', enabled: G.all.length > 0 },
      { id: 'showAll', label: '全部叫出来', enabled: G.all.some((p) => p.d.hidden) },
      { id: 'adopt', label: '领养新伙伴', hint: T(`${G.all.length}/12`), enabled: G.all.length < 12 },
      { id: 'overview', label: '大家在干嘛' },
    ] };
    const modes = PP.MODES.map(([k, n, d]) => ({ id: `mode:${k}`, label: forTray ? n : `${n}（${d}）`, type: 'radio', checked: s.mode === k }));
    const quiet = { label: '勿扰', hint: T(s.quiet ? '开' : s.autoQuiet !== false ? '自动' : ''), sub: [
      { id: 'autoQuiet', label: '工作时自动安静（打字时不说话、不来找你、声音调小）', type: 'checkbox', checked: s.autoQuiet !== false },
      { id: 'quiet', label: '一直安静（不说话、不来找你）', type: 'checkbox', checked: !!s.quiet },
      { id: 'work', label: '大家都乖乖待着（不乱跑）', hint: T('Ctrl+Alt+Shift+W'), type: 'checkbox', checked: !!s.work },
      { id: 'headOnly', label: '只露个头（全部）', type: 'checkbox', checked: !!s.headOnly },
      { id: 'peek', label: '看视频模式（主角躲到右下角）', type: 'checkbox', checked: !!s.peek },
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
    items.push(
      petsMenu,
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
        { id: 'clean', label: '打扫干净' },
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
    if (a === 'mode') { PP.setMode(b); return; }
    if (a === 'scene') { PP.scene.go(b); return; }
    if (a === 'weather') { s.weather = b; if (b === 'auto' && !s.city) PP.ui.toast('还没设城市：天气会按季节模拟'); PP.save.soon(); syncTray(true); return; }
    if (a === 'season') { s.seasonFix = b === 'auto' ? null : b; PP.save.soon(); syncTray(true); return; }
    if (a === 'avol') { s.ambientVol = +b; PP.save.soon(); syncTray(true); return; }
    if (a === 'ms') { s.menuScale = +b; PP.applyMenuScale(); PP.save.soon(); syncTray(true); return; }
    if (a === 'bgh') { s.bgH = +b; PP.save.soon(); syncTray(true); return; }
    if (a === 'tray') { s.trayMenu = b; PP.save.soon(); syncTray(true); ui.toast(b === 'full' ? '托盘菜单：完整' : '托盘菜单：精简'); return; }
    if (a === 'calmAll') { G.all.forEach((p) => (p.d.calm = false)); PP.save.soon(); syncTray(true); return; }
    switch (id) {
      case 'adopt': ui.adopt(); break;
      case 'pickPets': PP.pickPets(); break;
      case 'city': PP.cityPanel(); break;
      case 'decorate': PP.scene.edit(true); break;
      case 'ambient': s.ambient = !s.ambient; if (!s.ambient) PP.ambient.stop(); ui.toast(s.ambient ? '环境声音开了（音量在“场景”菜单里调）' : '环境声音关了'); break;
      case 'toggleAll': PP.toggleAll(); break;
      case 'overview': ui.overview(); break;
      case 'showAll': { const back = G.all.filter((p) => p.d.hidden); back.forEach((p) => { p.d.hidden = false; PP.hereNow(p); }); PP.syncPets(); back.forEach((p, i) => PP.petEmerge(p, U.rand(G.W * 0.2, G.W * 0.8), i * 600)); break; }
      case 'work': s.work = !s.work; ui.toast(s.work ? '工作模式：大家会乖乖待着，不乱跑不乱跳' : '下班啦，大家可以随便玩了'); if (s.work) G.pets.forEach((p) => { if (['wander', 'explore', 'play', 'cursor_play', 'seek_user', 'social', 'bug', 'ball', 'zoomies', 'special', 'follow', 'root', 'forage'].includes(p.action)) p.interrupt(); }); break;
      case 'headOnly': s.headOnly = !s.headOnly; break;
      case 'peek': s.peek = !s.peek; { const m = PP.F.main(); m && m.interrupt(); } break;
      case 'autoQuiet': s.autoQuiet = s.autoQuiet === false; ui.toast(s.autoQuiet ? '工作时自动安静：开（你打字时它们不说话、不来找你）' : '工作时自动安静：关'); break;
      case 'appIcon': ui.appIconPanel && ui.appIconPanel(); break;
      case 'quiet': s.quiet = !s.quiet; ui.toast(s.quiet ? '它们会安静地自己玩' : '欢迎回来'); break;
      case 'pomo': PP.F.pomo.phase === 'off' ? PP.F.pomoStart() : PP.F.pomoStop(); break;
      case 'reminders': ui.reminders(); break;
      case 'feed': G.items.forEach((i) => { if (i.type === 'food' || i.type === 'water') i.level = 1; }); ui.toast('饭碗和水碗都满了'); break;
      case 'clean': G.items.forEach((i) => { if (i.type === 'poop') i.dead = true; if (i.type === 'litter') i.data.dirty = 0; }); ui.toast('打扫干净了'); break;
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
      case 'show':
        if (d.hidden) { d.hidden = false; PP.hereNow(p); PP.syncPets(); PP.petEmerge(p, U.rand(G.W * 0.3, G.W * 0.7)); }
        else if (p.action !== 'enterDoor') { PP.petEnter(p, () => { d.hidden = true; PP.syncPets(); PP.save.soon(); syncTray(true); }); ui.toast(`${p.name}回电脑里休息了（菜单里随时可以叫出来）`); }
        break;
      case 'calm': d.calm = !d.calm; if (d.calm) p.interrupt(); ui.toast(d.calm ? `${p.name}会乖乖待着` : `${p.name}可以到处玩了`); break;
      case 'head': d.headOnly = !d.headOnly; break;
      case 'main': G.save.settings.mainId = d.id; ui.toast(`${p.name}是主角了：提醒、陪你打字都由它来`); break;
      case 'fav': ui.dropTreat(p.x + p.facing * 40, p.sp.fav); break;
      case 'treat': ui.dropTreat(p.x + p.facing * 40, U.pick(['treat_fish', 'treat_bone', 'treat_carrot', 'treat_seed', 'treat_berry', 'treat_apple', 'treat_corn'].filter((t) => t !== p.sp.fav))); break;
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
    if (k === 'work') PP.menuRun('work');
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
