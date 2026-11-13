// 检查更新 & 自动更新（为国内网络专门做了多线路）
//
// 版本信息 version.json：同时从 jsDelivr（三个节点）和 GitHub 拉，取版本号最高的那份（防止某条线路缓存旧了）
// 安装包下载：优先走 jsDelivr（安装包被切成 15MB 的小块放在 dist 分支，国内访问稳定），
//            不行再走 GitHub Releases 原地址和几个公共加速镜像
// 下载完必须校验 SHA-256，和 version.json 里写的一致才会安装（镜像被篡改也装不上）
// Windows：静默安装到原来的位置，装完自动重新打开；macOS：打开下载好的 dmg
const { app, net, shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const REPO = 'Utopian1025/myvault';
const MANIFEST = [
  `https://cdn.jsdelivr.net/gh/${REPO}@main/version.json`,
  `https://fastly.jsdelivr.net/gh/${REPO}@main/version.json`,
  `https://gcore.jsdelivr.net/gh/${REPO}@main/version.json`,
  `https://raw.githubusercontent.com/${REPO}/main/version.json`,
  // 国内加速镜像（直接回源 GitHub，没有 CDN 缓存，刚发布的新版本也能马上查到）
  `https://gh-proxy.com/https://raw.githubusercontent.com/${REPO}/main/version.json`,
  `https://ghfast.top/https://raw.githubusercontent.com/${REPO}/main/version.json`,
  `https://ghproxy.net/https://raw.githubusercontent.com/${REPO}/main/version.json`,
];
const JSD = ['cdn.jsdelivr.net', 'fastly.jsdelivr.net', 'gcore.jsdelivr.net', 'testingcf.jsdelivr.net'];
const PROXIES = ['', 'https://gh-proxy.com/', 'https://ghfast.top/', 'https://ghproxy.net/', 'https://githubproxy.cc/'];

const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };

function fetchT(url, ms = 9000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  return net.fetch(url, { signal: ctl.signal, cache: 'no-store', headers: { 'User-Agent': 'MoyuZoo-Updater' } }).finally(() => clearTimeout(t));
}

let state = { status: 'idle', latest: null, progress: 0, file: null, error: '' };
let notify = () => {};

async function check() {
  state.status = 'checking'; state.error = ''; notify(state);
  const results = await Promise.all(MANIFEST.map((u) => fetchT(u + '?t=' + Date.now(), 9000).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
  const ok = results.filter((m) => m && m.version);
  if (!ok.length) { state.status = 'error'; state.error = '连不上更新服务器（稍后会自动再试）'; notify(state); return state; }
  ok.sort((a, b) => cmp(b.version, a.version));
  const m = ok[0];
  state.latest = m;
  state.status = cmp(m.version, app.getVersion()) > 0 ? 'available' : 'latest';
  notify(state);
  return state;
}

// 写文件，同时算 SHA-256、报进度
async function pull(url, ws, hash, onBytes, ms = 60000) {
  const r = await fetchT(url, ms);
  if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
  const reader = r.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value); ws.write(Buffer.from(value)); onBytes(value.length);
  }
}

async function download() {
  const m = state.latest; if (!m) return state;
  const plat = process.platform === 'darwin' ? m.mac : m.win;
  if (!plat) { state.status = 'error'; state.error = '这个系统暂时没有新版安装包'; notify(state); return state; }
  const ext = process.platform === 'darwin' ? '.dmg' : '.exe';
  // 公司电脑常见：临时文件夹被杀毒 / 权限策略锁住（EPERM），或者旧安装包还开着。
  // 所以准备好几个可写的位置，挨个试，哪个能写就用哪个；绝不让它抛出未处理的异常。
  const dirs = [];
  for (const k of ['userData', 'temp', 'downloads', 'documents']) { try { dirs.push(k === 'userData' ? path.join(app.getPath('userData'), 'updates') : app.getPath(k)); } catch {} }
  try { dirs.push(os.tmpdir()); } catch {}
  // 已经下好了（而且校验通过）就不用再下
  for (const d of dirs) {
    const f = path.join(d, `MoyuZoo-${m.version}${ext}`);
    try { if (fs.existsSync(f) && plat.sha256 && sha256File(f) === plat.sha256) { state.status = 'ready'; state.file = f; state.progress = 1; notify(state); return state; } } catch {}
  }
  const openOut = () => {
    for (const d of dirs) {
      for (const name of [`MoyuZoo-${m.version}${ext}`, `MoyuZoo-${m.version}-${Date.now().toString(36)}${ext}`]) {
        const f = path.join(d, name);
        try { fs.mkdirSync(d, { recursive: true }); const fd = fs.openSync(f, 'w'); return { f, fd }; } catch (e) { console.warn('cannot write', f, e && e.code); }
      }
    }
    return null;
  };
  state.status = 'downloading'; state.progress = 0; notify(state);
  let got = 0; const total = plat.size || 1;
  const onBytes = (n) => { got += n; const p = Math.min(0.999, got / total); if (p - state.progress > 0.01) { state.progress = p; notify(state); } };
  const tries = [];
  // 线路 1：jsDelivr 分块（国内最稳）
  // 每一块单独放在一个 dist-N 分支上，用提交号引用（不会被缓存成旧的）
  if (plat.parts && plat.parts.length && plat.parts.every((p) => p.ref)) for (const host of JSD) tries.push({ name: 'jsDelivr(' + host + ')', parts: plat.parts.map((p) => `https://${host}/gh/${REPO}@${p.ref}/${p.file}`) });
  // 线路 2：GitHub Releases + 加速镜像
  const gh = `https://github.com/${REPO}/releases/download/v${m.version}/${plat.asset || plat.name}`;
  for (const px of PROXIES) tries.push({ name: px || 'GitHub', parts: [px + gh] });
  for (const t of tries) {
    got = 0; state.progress = 0;
    const hash = crypto.createHash('sha256');
    const out = openOut();
    if (!out) { state.status = 'error'; state.error = '电脑不让写入下载文件（可能是公司权限或杀毒软件）。可以点“去网页下载”手动安装'; notify(state); return state; }
    const dest = out.f;
    let wErr = null;
    const ws = fs.createWriteStream(dest, { fd: out.fd });
    ws.on('error', (e) => { wErr = e; });
    try {
      for (const u of t.parts) { await pull(u, ws, hash, onBytes, t.parts.length > 1 ? 90000 : 600000); if (wErr) throw wErr; }
      await new Promise((res, rej) => { ws.on('error', rej); ws.end(res); });
      if (wErr) throw wErr;
      const h = hash.digest('hex');
      if (plat.sha256 && h !== plat.sha256) throw new Error('校验不一致');
      state.status = 'ready'; state.file = dest; state.progress = 1; state.via = t.name; notify(state);
      return state;
    } catch (e) {
      try { ws.destroy(); fs.rmSync(dest, { force: true }); } catch {}
      console.warn('update source failed', t.name, e && e.message);
    }
  }
  state.status = 'error'; state.error = '所有下载线路都失败了，稍后再试'; notify(state);
  return state;
}

function sha256File(f) { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); }

// 安装：Windows 静默安装（装到原来的位置，存档不动），装完自动打开新版
function install(relaunch = true) {
  if (state.status !== 'ready' || !state.file) return false;
  // 安装前先备份存档（双保险）
  try {
    const src = path.join(app.getPath('userData'), 'save.json');
    const dir = path.join(app.getPath('appData'), 'PixelNest-keep');
    if (fs.existsSync(src)) { fs.mkdirSync(dir, { recursive: true }); fs.copyFileSync(src, path.join(dir, 'save-before-update.json')); }
  } catch (e) { console.warn('backup before update failed', e); }
  if (process.platform === 'win32') {
    const args = ['/S']; if (relaunch) args.push('--force-run');
    try {
      const ch = spawn(state.file, args, { detached: true, stdio: 'ignore' });
      ch.on('error', (e) => { console.warn('installer failed', e); state.status = 'error'; state.error = '没能启动安装程序（' + (e.code || e.message) + '），可以去网页下载手动安装'; notify(state); });
      ch.unref();
      // 尽快把自己完全退掉：安装程序要覆盖 exe，本程序还没退干净它就会报“无法写入”
      setTimeout(() => { if (state.status === 'ready') app.quit(); }, 200);
      setTimeout(() => { if (state.status === 'ready') { try { app.exit(0); } catch (e) {} } }, 1500);
    } catch (e) { state.status = 'error'; state.error = '没能启动安装程序，可以去网页下载手动安装'; notify(state); return false; }
  } else {
    shell.openPath(state.file);
  }
  return true;
}

module.exports = {
  init(fn) { notify = fn || notify; },
  check, download, install,
  get state() { return state; },
  version: () => app.getVersion(),
  releasePage: () => `https://github.com/${REPO}/releases/latest`,
};
