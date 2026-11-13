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

// 拉一个地址写进文件。不限总时长，只看“卡住”：连续 stallMs 没收到数据才算失败（网速慢不再被掐断）
async function pullTo(url, file, onBytes, stallMs = 30000) {
  const ctl = new AbortController(); let timer = null, n = 0;
  const kick = () => { clearTimeout(timer); timer = setTimeout(() => ctl.abort(), stallMs); };
  kick();
  const fd = fs.openSync(file, 'w');
  try {
    const r = await net.fetch(url, { signal: ctl.signal, cache: 'no-store', headers: { 'User-Agent': 'MoyuZoo-Updater' } });
    if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
    const want = Number(r.headers.get('content-length')) || 0, enc = r.headers.get('content-encoding');
    const reader = r.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      kick(); fs.writeSync(fd, value); n += value.length; onBytes(value.length);
    }
    if (want && !enc && n !== want) throw new Error('没下完整');
    return n;
  } catch (e) { onBytes(-n); throw e; } finally { clearTimeout(timer); try { fs.closeSync(fd); } catch {} }
}

let downloading = null;
function download() { if (!downloading) downloading = download1().finally(() => { downloading = null; }); return downloading; }
async function download1() {
  const m = state.latest; if (!m) return state;
  const plat = process.platform === 'darwin' ? m.mac : m.win;
  if (!plat) { state.status = 'error'; state.error = '这个系统暂时没有新版安装包'; notify(state); return state; }
  const ext = process.platform === 'darwin' ? '.dmg' : '.exe';
  // 公司电脑常见：临时文件夹被杀毒 / 权限策略锁住（EPERM），或者旧安装包还开着。准备好几个可写的位置，挨个试
  const dirs = [];
  for (const k of ['userData', 'temp', 'downloads', 'documents']) { try { dirs.push(k === 'userData' ? path.join(app.getPath('userData'), 'updates') : app.getPath(k)); } catch {} }
  try { dirs.push(os.tmpdir()); } catch {}
  const base = `MoyuZoo-${m.version}`;
  // 已经下好了（而且校验通过）就不用再下
  for (const d of dirs) {
    const f = path.join(d, base + ext);
    try { if (fs.existsSync(f) && plat.sha256 && sha256File(f) === plat.sha256) { state.status = 'ready'; state.file = f; state.progress = 1; notify(state); return state; } } catch {}
  }
  let dir = null;
  for (const d of dirs) { try { fs.mkdirSync(d, { recursive: true }); const t = path.join(d, '.w' + Date.now().toString(36)); fs.writeFileSync(t, ''); fs.rmSync(t, { force: true }); dir = d; break; } catch (e) { console.warn('cannot write', d, e && e.code); } }
  if (!dir) { state.status = 'error'; state.error = '电脑不让写入下载文件（可能是公司权限或杀毒软件）。可以点“去网页下载”手动安装'; notify(state); return state; }
  // 清掉以前版本留下的安装包和分块
  try { for (const f of fs.readdirSync(dir)) if (/^MoyuZoo-\d/.test(f) && !f.startsWith(base)) fs.rmSync(path.join(dir, f), { force: true }); } catch {}
  state.status = 'downloading'; state.progress = 0; state.error = ''; notify(state);
  const total = plat.size || 1; let got = 0, lastN = 0;
  const onBytes = (n) => { got += n; const p = Math.max(0, Math.min(0.999, got / total)); if (Math.abs(p - lastN) > 0.005) { lastN = p; state.progress = p; notify(state); } };
  const finish = (dest, via) => { state.status = 'ready'; state.file = dest; state.progress = 1; state.via = via; notify(state); return state; };
  const dest = path.join(dir, base + ext);

  // 线路 1：jsDelivr 分块。每块 15MB，三块同时下；每一块在几个节点之间轮着试，下好的块留在硬盘上，
  // 中途失败 / 关掉程序，下次接着下没完成的块，不用从头来
  if (plat.parts && plat.parts.length && plat.parts.every((p) => p.ref)) {
    const N = plat.parts.length, pf = (i) => path.join(dir, `${base}.part${i}`);
    const todo = [];
    for (let i = 0; i < N; i++) { try { got += fs.statSync(pf(i)).size; } catch { todo.push(i); } }
    onBytes(0);
    let hostAt = 0; const bad = {};
    const worker = async () => {
      while (todo.length) {
        const i = todo.shift(), p = plat.parts[i]; let ok = false;
        for (let k = 0; k < JSD.length * 3 && !ok; k++) {
          const hosts = JSD.slice().sort((a, b) => (bad[a] || 0) - (bad[b] || 0)), host = hosts[(k + hostAt++) % (k < 2 ? 2 : hosts.length)];
          try { await pullTo(`https://${host}/gh/${REPO}@${p.ref}/${p.file}`, pf(i) + '.tmp', onBytes); fs.renameSync(pf(i) + '.tmp', pf(i)); ok = true; }
          catch (e) { bad[host] = (bad[host] || 0) + 1; console.warn('part failed', i, host, e && e.message); try { fs.rmSync(pf(i) + '.tmp', { force: true }); } catch {} }
        }
        if (!ok) throw new Error('part ' + i);
      }
    };
    try {
      await Promise.all([0, 1, 2].map(() => worker()));
      const hash = crypto.createHash('sha256'), fd = fs.openSync(dest, 'w');
      try { for (let i = 0; i < N; i++) { const b = fs.readFileSync(pf(i)); hash.update(b); fs.writeSync(fd, b); } } finally { fs.closeSync(fd); }
      if (plat.sha256 && hash.digest('hex') !== plat.sha256) { for (let i = 0; i < N; i++) fs.rmSync(pf(i), { force: true }); fs.rmSync(dest, { force: true }); throw new Error('校验不一致'); }
      for (let i = 0; i < N; i++) { try { fs.rmSync(pf(i), { force: true }); } catch {} }
      return finish(dest, 'jsDelivr');
    } catch (e) { console.warn('jsDelivr route failed', e && e.message); todo.length = 0; }
  }
  // 线路 2：GitHub Releases + 加速镜像（整个文件）
  const gh = `https://github.com/${REPO}/releases/download/v${m.version}/${plat.asset || plat.name}`;
  for (const px of PROXIES) {
    got = 0; onBytes(0);
    try {
      await pullTo(px + gh, dest, onBytes, 30000);
      if (plat.sha256 && sha256File(dest) !== plat.sha256) throw new Error('校验不一致');
      return finish(dest, px || 'GitHub');
    } catch (e) { try { fs.rmSync(dest, { force: true }); } catch {} console.warn('update source failed', px || 'GitHub', e && e.message); }
  }
  state.status = 'error'; state.error = '网络太慢或线路不通，这次没下完。已经下好的部分留着了，再点一次会接着下'; notify(state);
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
