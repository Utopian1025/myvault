// Electron 主进程：一个覆盖整个工作区的透明、置顶、可点击穿透的窗口
const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, powerMonitor, globalShortcut, desktopCapturer } = require('electron');
const os = require('os');
const path = require('path');
// 全局键盘/滚轮监听（可选的原生模块；装不上也不影响其他功能）。只知道“按了键”，不记录按的是什么。
let uIOhook = null;
try { ({ uIOhook } = require('uiohook-napi')); } catch (e) { console.warn('uiohook-napi 不可用，打字检测改用系统空闲时间推测'); }
const updater = require('./updater');
// 任何意外错误都只记一下，不弹“主进程 JavaScript 错误”吓人的框
process.on('uncaughtException', (e) => { try { console.error('uncaught', e); } catch {} });
process.on('unhandledRejection', (e) => { try { console.error('unhandled', e); } catch {} });
const fs = require('fs');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.disableHardwareAcceleration();
}
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // 环境声音不用先点一下才响
app.setName('PixelNest');
// 存档目录固定为 %APPDATA%\PixelNest，不跟着软件显示名变（改名不会丢存档）
app.setPath('userData', path.join(app.getPath('appData'), 'PixelNest'));
// 备份目录：每隔一段时间、以及每次更新前，都把存档复制一份到这里
const keepDir = () => path.join(app.getPath('appData'), 'PixelNest-keep');
if (process.platform === 'win32') app.setAppUserModelId('com.pixelnest.desktop');
if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null, tray = null, hidden = false;
let area = null;
const savePath = () => path.join(app.getPath('userData'), 'save.json');

function createWindow() {
  area = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    x: area.x, y: area.y, width: area.width, height: area.height,
    transparent: true, frame: false, resizable: false, movable: false, minimizable: false, maximizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, fullscreenable: false, show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, spellcheck: false,
    },
  });
  win.setAlwaysOnTop(true, process.platform === 'darwin' ? 'floating' : 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.showInactive());
  win.on('closed', () => (win = null));
}

let barMode = false, barTimer = null;
function fitToWorkArea() {
  if (!win) return;
  const d = screen.getPrimaryDisplay();
  area = d.workArea;
  const r = barMode ? d.bounds : area;
  win.setBounds({ x: r.x, y: r.y, width: r.width, height: r.height });
}
// 任务栏视图：窗口盖住整块屏幕（含任务栏），动物住在任务栏那一条里；不在底部的任务栏 / 自动隐藏的任务栏就不支持
function taskbarInfo() {
  const d = screen.getPrimaryDisplay(), b = d.bounds, wa = d.workArea;
  const h = (b.y + b.height) - (wa.y + wa.height);
  return { h, top: wa.y + wa.height - b.y, ok: h >= 24 };
}
ipcMain.handle('set-bar-mode', (_e, v) => {
  if (!win) return null;
  const info = taskbarInfo();
  barMode = !!v && info.ok;
  fitToWorkArea();
  clearInterval(barTimer);
  // 点了任务栏以后 Windows 会把任务栏提到最前面，隔一会儿把我们再放回它上面
  if (barMode) barTimer = setInterval(() => { if (win && !win.isDestroyed() && win.isVisible()) { win.setAlwaysOnTop(true, 'screen-saver'); win.moveTop(); } }, 1500);
  return barMode ? info : null;
});

// 找任务栏上的空白：把自己隐藏一下、截一张屏，看任务栏那一条哪些地方有图标（颜色和底色差别大 / 边缘多），
// 返回没有图标的几段（窗口坐标，单位和页面里一样）。动物和按钮只待在空白段里，就不会挡住你的图标。
// 任务栏那一条截图（BGRA）→ 空白段（单位：DIP）。k = 截图像素 / DIP
function barFree(bmp, w, th, k) {
  const at = (x, y) => (y * w + x) * 4;
  // 底色：每一行取中位数（任务栏一般是一种颜色 / 很淡的渐变）
  const rowBg = [];
  for (let y = 0; y < th; y++) {
    const rs = [], gs = [], bs = [];
    for (let x = 0; x < w; x += 7) { const i = at(x, y); bs.push(bmp[i]); gs.push(bmp[i + 1]); rs.push(bmp[i + 2]); }
    const md = (a) => a.sort((p, q) => p - q)[a.length >> 1];
    rowBg.push([md(bs), md(gs), md(rs)]);
  }
  const yA = Math.round(th * 0.12), yB = Math.round(th * 0.88), rows = Math.max(1, yB - yA);
  const busy = new Uint8Array(w);
  for (let x = 1; x < w; x++) {
    let diff = 0, edge = 0;
    for (let y = yA; y < yB; y++) {
      const i = at(x, y), j = at(x - 1, y), bg = rowBg[y];
      const dd = Math.abs(bmp[i] - bg[0]) + Math.abs(bmp[i + 1] - bg[1]) + Math.abs(bmp[i + 2] - bg[2]);
      const ee = Math.abs(bmp[i] - bmp[j]) + Math.abs(bmp[i + 1] - bmp[j + 1]) + Math.abs(bmp[i + 2] - bmp[j + 2]);
      if (dd > 60) diff++; if (ee > 45) edge++;
    }
    if (diff > rows * 0.12 || edge > rows * 0.18) busy[x] = 1;
  }
  // 图标周围留一点余地，再把小缝合起来
  const pad = Math.round(10 * k), dil = new Uint8Array(w);
  for (let x = 0; x < w; x++) if (busy[x]) for (let t = Math.max(0, x - pad); t <= Math.min(w - 1, x + pad); t++) dil[t] = 1;
  const free = []; let st = -1;
  for (let x = 0; x <= w; x++) {
    const f = x < w && !dil[x];
    if (f && st < 0) st = x;
    if (!f && st >= 0) { const a = st / k, z = x / k; if (z - a >= 90) free.push([Math.round(a), Math.round(z)]); st = -1; }
  }
  return free;
}
let scanning = false;
async function scanBar() {
  // 只在 Windows 上看（macOS 截屏要弹“屏幕录制”权限，不值得）
  if (process.platform !== 'win32' || !win || win.isDestroyed() || !barMode || scanning) return null;
  scanning = true;
  try {
    const d = screen.getPrimaryDisplay(), sf = d.scaleFactor || 1, b = d.bounds, info = taskbarInfo();
    const W = Math.round(b.width * sf), H = Math.round(b.height * sf);
    win.setOpacity(0);
    await new Promise((r) => setTimeout(r, 160));
    let src = null;
    try {
      const list = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: W, height: H } });
      src = list.find((x) => String(x.display_id) === String(d.id)) || list[0];
    } finally { if (win && !win.isDestroyed()) win.setOpacity(1); }
    if (!src || !src.thumbnail || src.thumbnail.isEmpty()) return null;
    const img = src.thumbnail, isz = img.getSize(), k = isz.width / b.width; // 截图像素 / DIP
    const th = Math.max(4, Math.round(info.h * k)), y0 = isz.height - th;
    const bmp = img.crop({ x: 0, y: y0, width: isz.width, height: th }).toBitmap(); // BGRA
    const free = barFree(bmp, isz.width, th, k);
    return { free, w: b.width, t: Date.now() };
  } catch (e) { console.warn('scan bar failed', e && e.message); return null; }
  finally { scanning = false; }
}
ipcMain.handle('bar-scan', () => scanBar());

function send(ch, data) { if (win && !win.isDestroyed()) win.webContents.send(ch, data); }

// 托盘菜单：和宠物右键菜单是同一棵树（由页面那边生成，发过来）
let trayModel = null;
function setHidden(v) { hidden = v; if (!win) return; hidden ? win.hide() : win.showInactive(); rebuildTray(); }
function toTemplate(items) {
  return items.map((it) => {
    if (it === '-') return { type: 'separator' };
    const o = { label: it.label, enabled: it.enabled !== false };
    if (it.sub) o.submenu = toTemplate(it.sub);
    else {
      if (it.type) { o.type = 'checkbox'; o.checked = !!it.checked; }
      o.click = () => {
        if (it.id === 'hideWin') { setHidden(true); return; }
        if (it.id === 'quit') { send('tray', 'quit'); setTimeout(() => app.quit(), 600); return; }
        send('tray', it.id);
      };
    }
    return o;
  });
}
function rebuildTray() {
  if (!tray) return;
  const head = hidden ? [{ label: '显示宠物', click: () => setHidden(false) }, { type: 'separator' }] : [];
  const body = trayModel ? toTemplate(trayModel) : [{ label: '退出', click: () => app.quit() }];
  tray.setContextMenu(Menu.buildFromTemplate(head.concat(body)));
}
// ---------- 自定义软件图标（换成喜欢的动物） ----------
const iconPng = () => path.join(app.getPath('userData'), 'appicon.png');
const iconIco = () => path.join(app.getPath('userData'), 'appicon.ico');
function trayImage() {
  if (fs.existsSync(iconPng())) { const im = nativeImage.createFromPath(iconPng()); if (!im.isEmpty()) return im.resize({ width: process.platform === 'darwin' ? 18 : 16, height: process.platform === 'darwin' ? 18 : 16, quality: 'best' }); }
  return nativeImage.createFromPath(path.join(__dirname, 'assets', process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png'));
}
// 把几张 PNG 打包成 .ico（ICO 可以直接装 PNG 数据）
function makeIco(img) {
  const sizes = [256, 48, 32, 16].map((n) => img.resize({ width: n, height: n, quality: 'best' }).toPNG());
  const head = Buffer.alloc(6 + 16 * sizes.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = head.length;
  [256, 48, 32, 16].forEach((n, i) => { const e = 6 + i * 16; head.writeUInt8(n === 256 ? 0 : n, e); head.writeUInt8(n === 256 ? 0 : n, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(sizes[i].length, e + 8); head.writeUInt32LE(off, e + 12); off += sizes[i].length; });
  return Buffer.concat([head, ...sizes]);
}
function shortcutPaths() {
  return [path.join(app.getPath('desktop'), '摸鱼动物园.lnk'), path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', '摸鱼动物园.lnk')].filter((f) => fs.existsSync(f));
}
function applyIcon() {
  try {
    if (tray) tray.setImage(trayImage());
    const custom = fs.existsSync(iconPng());
    if (process.platform === 'darwin' && app.dock) { if (custom) app.dock.setIcon(nativeImage.createFromPath(iconPng())); }
    if (process.platform === 'win32') {
      const { shell } = require('electron');
      for (const f of shortcutPaths()) { try { shell.writeShortcutLink(f, 'update', custom ? { icon: iconIco(), iconIndex: 0 } : { icon: process.execPath, iconIndex: 0 }); } catch (e) { console.warn('shortcut icon', e); } }
    }
  } catch (e) { console.warn('apply icon', e); }
}
ipcMain.handle('set-app-icon', (_e, o) => {
  try {
    if (!o || !o.png) { fs.rmSync(iconPng(), { force: true }); fs.rmSync(iconIco(), { force: true }); applyIcon(); return { ok: true }; }
    const img = nativeImage.createFromDataURL(o.png);
    if (img.isEmpty()) return { ok: false, msg: '图片是空的' };
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(iconPng(), img.toPNG());
    fs.writeFileSync(iconIco(), makeIco(img));
    applyIcon();
    return { ok: true, shortcuts: shortcutPaths().length };
  } catch (e) { return { ok: false, msg: String(e.message || e) }; }
});

function buildTray() {
  const icon = trayImage();
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('摸鱼动物园（Ctrl+Alt+Shift+P 召唤/送回）');
  if (process.platform === 'win32') tray.on('click', () => tray.popUpContextMenu());
  rebuildTray();
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  createWindow();
  buildTray();

  // 全局鼠标位置（让宠物的眼睛跟着你，即使鼠标在别的窗口上）
  let lx = null, ly = null;
  setInterval(() => {
    if (!win || hidden) return;
    const p = screen.getCursorScreenPoint();
    if (p.x !== lx || p.y !== ly) { lx = p.x; ly = p.y; send('cursor', { x: p.x - area.x, y: p.y - area.y }); }
  }, 33);
  // 系统空闲时间：用来判断你在不在、是不是在打字
  setInterval(() => { if (win && !hidden) send('idle', powerMonitor.getSystemIdleTime()); }, 700);

  // 全局键盘 & 滚轮 → 猫拍键盘 / 过热 / 扒卷纸
  if (uIOhook) {
    try {
      let lastKey = 0;
      uIOhook.on('keydown', () => { const t = Date.now(); if (t - lastKey > 30) { lastKey = t; send('key', 1); } });
      uIOhook.on('wheel', (e) => send('wheel', (e.rotation || 1) * 40));
      // 全局鼠标按下：只用来“点别处时收起菜单”，不记录位置
      uIOhook.on('mousedown', () => send('gdown', 1));
      uIOhook.start();
    } catch (e) { console.warn('uIOhook start failed', e); uIOhook = null; }
  }

  // 全局快捷键：召唤 / 送回所有宠物（故意选了一个平时不会按到的组合）
  try {
    globalShortcut.register('CommandOrControl+Alt+Shift+P', () => { if (hidden) { setHidden(false); send('hotkey', 'summon'); } else send('hotkey', 'toggle'); });
  } catch (e) { console.warn('shortcut', e); }

  screen.on('display-metrics-changed', fitToWorkArea);
  screen.on('display-added', fitToWorkArea);
  screen.on('display-removed', fitToWorkArea);
  powerMonitor.on('resume', () => send('idle', 0));
});

app.on('second-instance', () => { if (win) { hidden = false; win.showInactive(); } });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { keepCopy('quit'); try { uIOhook && uIOhook.stop(); } catch {} try { globalShortcut.unregisterAll(); } catch {} });

// ---------- 检查更新 ----------
updater.init((st) => send('update', JSON.parse(JSON.stringify(st))));
let installOnQuit = false;
ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('changelog', () => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'changelog.json'), 'utf8')); } catch (e) { return []; } });
ipcMain.handle('update-check', () => updater.check().then((s) => JSON.parse(JSON.stringify(s))));
ipcMain.handle('update-download', () => updater.download().then((s) => JSON.parse(JSON.stringify(s))));
ipcMain.handle('update-install', (_e, later) => { if (later) { installOnQuit = true; return true; } return updater.install(true); });
ipcMain.on('open-external', (_e, url) => { if (/^https:\/\//.test(url)) require('electron').shell.openExternal(url); });
app.on('will-quit', () => { if (installOnQuit && updater.state.status === 'ready') { installOnQuit = false; updater.install(false); } });

// ---------- IPC ----------
// 全屏场景时临时接管 Esc（退出全屏）；离开全屏马上还给其他程序
let escOn = false;
ipcMain.on('full-mode', (_e, v) => {
  try {
    if (v && !escOn) { escOn = globalShortcut.register('Escape', () => send('hotkey', 'exitFull')); }
    else if (!v && escOn) { globalShortcut.unregister('Escape'); escOn = false; }
  } catch (e) { console.warn('esc', e); }
});
// 置顶：极简模式 / 全屏场景时浮在最前面；小场景默认不置顶——点别的窗口时它会盖在场景上面
ipcMain.on('set-on-top', (_e, v) => {
  if (!win) return;
  if (v) { win.setAlwaysOnTop(true, process.platform === 'darwin' ? 'floating' : 'screen-saver'); }
  else { win.setAlwaysOnTop(false); }
});
ipcMain.on('set-interactive', (_e, v) => {
  if (!win) return;
  win.setIgnoreMouseEvents(!v, { forward: true });
});
let lastKeep = 0;
function keepCopy(tag = 'auto') {
  try {
    if (!fs.existsSync(savePath())) return;
    fs.mkdirSync(keepDir(), { recursive: true });
    fs.copyFileSync(savePath(), path.join(keepDir(), `save-${tag}.json`));
  } catch (err) { console.warn('keep failed', err); }
}
ipcMain.on('save-sync', (e, json) => {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    const tmp = savePath() + '.tmp';
    if (!json) { // 用户主动“重新开始”：连备份一起清掉
      fs.rmSync(savePath(), { force: true }); fs.rmSync(keepDir(), { recursive: true, force: true });
      e.returnValue = true; return;
    }
    fs.writeFileSync(tmp, json);
    fs.renameSync(tmp, savePath());
    if (Date.now() - lastKeep > 10 * 60000) { lastKeep = Date.now(); keepCopy('auto'); }
    e.returnValue = true;
  } catch (err) { console.error(err); e.returnValue = false; }
});
// 读存档：正常存档坏了 / 没了，就从备份和旧目录里找最新的一份
function readSave() {
  const valid = (f) => { try { const t = fs.readFileSync(f, 'utf8'); const j = JSON.parse(t); return j && Array.isArray(j.pets) ? t : null; } catch { return null; } };
  const main = valid(savePath());
  if (main) return main;
  const ad = app.getPath('appData');
  const cands = [];
  try { for (const n of fs.readdirSync(keepDir())) if (n.endsWith('.json')) cands.push(path.join(keepDir(), n)); } catch {}
  for (const d of ['摸鱼动物园', '像素小窝', 'pixel-nest', 'PixelNest']) cands.push(path.join(ad, d, 'save.json'), path.join(ad, d, 'save.json.tmp'));
  const found = cands.filter((f) => fs.existsSync(f)).map((f) => ({ f, t: fs.statSync(f).mtimeMs, txt: valid(f) })).filter((x) => x.txt).sort((a, b) => b.t - a.t)[0];
  if (!found) return null;
  try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(savePath(), found.txt); } catch {}
  console.log('存档已从备份恢复：', found.f);
  return found.txt;
}
ipcMain.handle('load', () => readSave());
ipcMain.on('quit', () => app.quit());
ipcMain.on('tray-menu', (_e, json) => { try { trayModel = JSON.parse(json); rebuildTray(); } catch {} });
ipcMain.on('hide-window', () => setHidden(true));
ipcMain.handle('get-autostart', () => app.getLoginItemSettings({ name: 'PixelNest' }).openAtLogin);
ipcMain.on('set-autostart', (_e, v) => app.setLoginItemSettings({ openAtLogin: !!v, name: 'PixelNest' }));

// ---------- AI 联动已移除：把以前装进 Claude Code 的钩子悄悄清理掉 ----------
function cleanupOldHooks() {
  try {
    const file = path.join(os.homedir(), '.claude', 'settings.json');
    if (!fs.existsSync(file)) return;
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!j || !j.hooks) return;
    const ours = (e) => JSON.stringify(e || {}).includes('127.0.0.1:47231/agent/');
    let changed = false;
    for (const k of Object.keys(j.hooks)) {
      if (!Array.isArray(j.hooks[k])) continue;
      const n = j.hooks[k].filter((e) => !ours(e));
      if (n.length !== j.hooks[k].length) { changed = true; j.hooks[k] = n; if (!n.length) delete j.hooks[k]; }
    }
    if (!changed) return;
    if (!Object.keys(j.hooks).length) delete j.hooks;
    fs.writeFileSync(file, JSON.stringify(j, null, 2));
  } catch (e) { console.warn('cleanup hooks', e); }
}
app.whenReady().then(() => setTimeout(cleanupOldHooks, 3000));
