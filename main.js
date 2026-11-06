// Electron 主进程：一个覆盖整个工作区的透明、置顶、可点击穿透的窗口
const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, powerMonitor } = require('electron');
const path = require('path');
const http = require('http');
// 全局键盘/滚轮监听（可选的原生模块；装不上也不影响其他功能）。只知道“按了键”，不记录按的是什么。
let uIOhook = null;
try { ({ uIOhook } = require('uiohook-napi')); } catch (e) { console.warn('uiohook-napi 不可用，打字检测改用系统空闲时间推测'); }
const AGENT_PORT = 47231;
const fs = require('fs');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.disableHardwareAcceleration();
}
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

function buildTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('像素小窝');
  const menu = Menu.buildFromTemplate([
    { label: '领养新宠物', click: () => send('tray', 'adopt') },
    { label: '大家的状态', click: () => send('tray', 'overview') },
    { label: '日记', click: () => send('tray', 'diary') },
    { label: '收藏柜', click: () => send('tray', 'collection') },
    { label: '彩蛋图鉴', click: () => send('tray', 'eggs') },
    { type: 'separator' },
    { label: '开始/停止番茄钟', click: () => send('tray', 'pomo') },
    { label: '看视频模式（躲到角落）', type: 'checkbox', click: () => send('tray', 'peek') },
    { label: '提醒设置', click: () => send('tray', 'reminders') },
    { label: '添满饭和水', click: () => send('tray', 'feed') },
    { label: '勿扰模式', type: 'checkbox', click: () => send('tray', 'quiet') },
    { label: '暂时隐藏', type: 'checkbox', click: (mi) => { hidden = mi.checked; hidden ? win.hide() : win.showInactive(); } },
    { label: '设置', click: () => send('tray', 'settings') },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
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
      uIOhook.start();
    } catch (e) { console.warn('uIOhook start failed', e); uIOhook = null; }
  }

  // 本地接口：给 Claude Code 等 AI 工具的 hooks 用（只监听本机）
  // GET /agent/thinking | /agent/done | /agent/error | /agent/idle   可选 ?text=要说的话
  http.createServer((req, res) => {
    try {
      const u = new URL(req.url, 'http://127.0.0.1');
      const m2 = u.pathname.match(/^\/agent\/(thinking|done|error|idle)$/);
      if (m2) { send('agent', { state: m2[1], text: u.searchParams.get('text') || '' }); res.writeHead(200); res.end('ok'); return; }
      res.writeHead(404); res.end();
    } catch { res.writeHead(400); res.end(); }
  }).on('error', (e) => console.warn('agent server', e.message)).listen(AGENT_PORT, '127.0.0.1');

  screen.on('display-metrics-changed', fitToWorkArea);
  screen.on('display-added', fitToWorkArea);
  screen.on('display-removed', fitToWorkArea);
  powerMonitor.on('resume', () => send('idle', 0));
});

app.on('second-instance', () => { if (win) { hidden = false; win.showInactive(); } });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { try { uIOhook && uIOhook.stop(); } catch {} });

// ---------- IPC ----------
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
ipcMain.handle('get-autostart', () => app.getLoginItemSettings({ name: 'PixelNest' }).openAtLogin);
ipcMain.on('set-autostart', (_e, v) => app.setLoginItemSettings({ openAtLogin: !!v, name: 'PixelNest' }));

ipcMain.handle('hook-config', () => {
  const cmd = (s) => process.platform === 'win32'
    ? `curl -s -m 1 http://127.0.0.1:${AGENT_PORT}/agent/${s} > NUL 2>&1 || exit 0`
    : `curl -s -m 1 http://127.0.0.1:${AGENT_PORT}/agent/${s} >/dev/null 2>&1 || true`;
  return JSON.stringify({ hooks: {
    UserPromptSubmit: [{ hooks: [{ type: 'command', command: cmd('thinking') }] }],
    Stop: [{ hooks: [{ type: 'command', command: cmd('done') }] }],
  } }, null, 2);
});
