// Electron 主进程：一个覆盖整个工作区的透明、置顶、可点击穿透的窗口
const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, powerMonitor, globalShortcut } = require('electron');
const os = require('os');
const path = require('path');
const http = require('http');
// 全局键盘/滚轮监听（可选的原生模块；装不上也不影响其他功能）。只知道“按了键”，不记录按的是什么。
let uIOhook = null;
try { ({ uIOhook } = require('uiohook-napi')); } catch (e) { console.warn('uiohook-napi 不可用，打字检测改用系统空闲时间推测'); }
const AGENT_PORT = 47231;
const updater = require('./updater');
const fs = require('fs');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.disableHardwareAcceleration();
}
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // 环境声音不用先点一下才响
app.setName('PixelNest'); // 存档目录：%APPDATA%\PixelNest（卸载时一并删除）
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

function fitToWorkArea() {
  if (!win) return;
  area = screen.getPrimaryDisplay().workArea;
  win.setBounds({ x: area.x, y: area.y, width: area.width, height: area.height });
}

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
function buildTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png'));
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

  // 本地接口：给 Claude Code 等 AI 工具的 hooks 用（只监听本机）
  // GET /agent/thinking | /agent/done | /agent/error | /agent/idle   可选 ?text=要说的话
  http.createServer((req, res) => {
    try {
      const u = new URL(req.url, 'http://127.0.0.1');
      const m2 = u.pathname.match(/^\/agent\/(thinking|done|error|idle|waiting)$/);
      if (m2) { send('agent', { state: m2[1], text: u.searchParams.get('text') || '' }); res.writeHead(200); res.end('ok'); return; }
      res.writeHead(404); res.end();
    } catch { res.writeHead(400); res.end(); }
  }).on('error', (e) => console.warn('agent server', e.message)).listen(AGENT_PORT, '127.0.0.1');

  // 全局快捷键：召唤 / 送回所有宠物（故意选了一个平时不会按到的组合）
  try {
    globalShortcut.register('CommandOrControl+Alt+Shift+P', () => { if (hidden) { setHidden(false); send('hotkey', 'summon'); } else send('hotkey', 'toggle'); });
    globalShortcut.register('CommandOrControl+Alt+Shift+W', () => send('hotkey', 'work'));
  } catch (e) { console.warn('shortcut', e); }

  screen.on('display-metrics-changed', fitToWorkArea);
  screen.on('display-added', fitToWorkArea);
  screen.on('display-removed', fitToWorkArea);
  powerMonitor.on('resume', () => send('idle', 0));
});

app.on('second-instance', () => { if (win) { hidden = false; win.showInactive(); } });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { try { uIOhook && uIOhook.stop(); } catch {} try { globalShortcut.unregisterAll(); } catch {} });

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
ipcMain.on('set-interactive', (_e, v) => {
  if (!win) return;
  win.setIgnoreMouseEvents(!v, { forward: true });
});
ipcMain.on('save-sync', (e, json) => {
  try {
    const tmp = savePath() + '.tmp';
    if (!json) { fs.rmSync(savePath(), { force: true }); e.returnValue = true; return; }
    fs.writeFileSync(tmp, json);
    fs.renameSync(tmp, savePath());
    e.returnValue = true;
  } catch (err) { console.error(err); e.returnValue = false; }
});
ipcMain.handle('load', () => {
  try { return fs.existsSync(savePath()) ? fs.readFileSync(savePath(), 'utf8') : null; } catch { return null; }
});
ipcMain.on('quit', () => app.quit());
ipcMain.on('tray-menu', (_e, json) => { try { trayModel = JSON.parse(json); rebuildTray(); } catch {} });
ipcMain.on('hide-window', () => setHidden(true));
ipcMain.handle('get-autostart', () => app.getLoginItemSettings({ name: 'PixelNest' }).openAtLogin);
ipcMain.on('set-autostart', (_e, v) => app.setLoginItemSettings({ openAtLogin: !!v, name: 'PixelNest' }));

// ---------- AI 联动：给 Claude Code 装 / 卸 hooks ----------
// Claude Code 在你提问、它干完活、它需要你确认时，会执行这些命令；命令只是戳一下本机的小接口
const HOOK_MARK = '127.0.0.1:' + AGENT_PORT + '/agent/';
const hookCmd = (s) => process.platform === 'win32'
  ? `curl -s -m 1 http://${HOOK_MARK}${s} > NUL 2>&1 || exit 0`
  : `curl -s -m 1 http://${HOOK_MARK}${s} >/dev/null 2>&1 || true`;
const HOOKS = { UserPromptSubmit: 'thinking', Stop: 'done', Notification: 'waiting' };
const claudeSettings = () => path.join(os.homedir(), '.claude', 'settings.json');
function readClaude() { try { return JSON.parse(fs.readFileSync(claudeSettings(), 'utf8')); } catch { return null; } }
function ours(entry) { return JSON.stringify(entry || {}).includes(HOOK_MARK); }
ipcMain.handle('hook-config', () => JSON.stringify({ hooks: Object.fromEntries(Object.entries(HOOKS).map(([k, s]) => [k, [{ hooks: [{ type: 'command', command: hookCmd(s) }] }]])) }, null, 2));
ipcMain.handle('hook-status', () => {
  const j = readClaude();
  const installed = !!(j && j.hooks && Object.keys(HOOKS).every((k) => (j.hooks[k] || []).some(ours)));
  return { installed, hasClaudeDir: fs.existsSync(path.dirname(claudeSettings())), file: claudeSettings() };
});
ipcMain.handle('hook-install', () => {
  try {
    const file = claudeSettings();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let j = {};
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      try { j = JSON.parse(raw); } catch { return { ok: false, msg: 'settings.json 格式有问题，没有改动它' }; }
      fs.writeFileSync(file + '.bak-pixelnest', raw); // 先备份
    }
    j.hooks = j.hooks || {};
    for (const [k, s] of Object.entries(HOOKS)) {
      j.hooks[k] = (j.hooks[k] || []).filter((e) => !ours(e));
      j.hooks[k].push({ hooks: [{ type: 'command', command: hookCmd(s) }] });
    }
    fs.writeFileSync(file, JSON.stringify(j, null, 2));
    return { ok: true, msg: '已接入：' + file };
  } catch (e) { return { ok: false, msg: String(e.message || e) }; }
});
ipcMain.handle('hook-uninstall', () => {
  try {
    const file = claudeSettings(); const j = readClaude();
    if (!j || !j.hooks) return { ok: true, msg: '本来就没有接入' };
    for (const k of Object.keys(HOOKS)) { if (j.hooks[k]) { j.hooks[k] = j.hooks[k].filter((e) => !ours(e)); if (!j.hooks[k].length) delete j.hooks[k]; } }
    if (!Object.keys(j.hooks).length) delete j.hooks;
    fs.writeFileSync(file, JSON.stringify(j, null, 2));
    return { ok: true, msg: '已断开' };
  } catch (e) { return { ok: false, msg: String(e.message || e) }; }
});
