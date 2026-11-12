// 发布用的小脚本（只在 GitHub Actions 里跑）
//   node scripts/publish.js prepare <产物目录>   → release/ 里放好英文文件名的安装包、分块、notes.md、info.json
//   node scripts/publish.js manifest <各分块所在分支的提交号 JSON>  → 写 version.json
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const V = pkg.version;
const changelog = JSON.parse(fs.readFileSync(path.join(root, 'changelog.json'), 'utf8'));
const REL = path.join(root, 'release');
const PART = 15 * 1024 * 1024; // jsDelivr 单文件上限 20MB，切成 15MB 一块

function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])); }
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'prepare') {
  fs.mkdirSync(path.join(REL, 'parts'), { recursive: true });
  const files = walk(arg);
  const exe = files.find((f) => f.endsWith('.exe')), dmg = files.find((f) => f.endsWith('.dmg'));
  const info = { version: V };
  if (exe) {
    const buf = fs.readFileSync(exe), name = `MoyuZoo-Setup-${V}.exe`;
    fs.writeFileSync(path.join(REL, name), buf);
    fs.writeFileSync(path.join(REL, 'MoyuZoo-Setup.exe'), buf); // 固定名字：README 里的“最新版”链接一直有效
    const parts = [];
    for (let i = 0, k = 0; i < buf.length; i += PART, k++) { const p = `${name}.${String(k).padStart(3, '0')}`; fs.writeFileSync(path.join(REL, 'parts', p), buf.subarray(i, i + PART)); parts.push(p); }
    info.win = { name, asset: name, size: buf.length, sha256: sha(buf), parts };
  }
  if (dmg) {
    const buf = fs.readFileSync(dmg), name = `MoyuZoo-${V}.dmg`;
    fs.writeFileSync(path.join(REL, name), buf);
    fs.writeFileSync(path.join(REL, 'MoyuZoo.dmg'), buf);
    info.mac = { name, asset: name, size: buf.length, sha256: sha(buf) };
  }
  fs.writeFileSync(path.join(REL, 'info.json'), JSON.stringify(info, null, 2));
  const cur = changelog.find((c) => c.version === V) || { notes: [] };
  const repo = process.env.GITHUB_REPOSITORY || 'Utopian1025/myvault';
  const gh = (f) => `https://github.com/${repo}/releases/download/v${V}/${f}`;
  fs.writeFileSync(path.join(REL, 'notes.md'), [
    `## ${cur.title || '摸鱼动物园 v' + V}`, '', ...(cur.notes || []).map((n) => `- ${n}`), '',
    '### 下载', '',
    '| | Windows |', '|---|---|',
    `| GitHub | [安装包](${gh('MoyuZoo-Setup-' + V + '.exe')}) |`,
    `| 国内加速 1 | [安装包](https://gh-proxy.com/${gh('MoyuZoo-Setup-' + V + '.exe')}) |`,
    `| 国内加速 2 | [安装包](https://ghfast.top/${gh('MoyuZoo-Setup-' + V + '.exe')}) |`,
    '', '已经装过的话不用重新下载：程序会自动更新。',
  ].join('\n'));
  console.log(JSON.stringify(info));
} else if (cmd === 'manifest') {
  const info = JSON.parse(fs.readFileSync(path.join(REL, 'info.json'), 'utf8'));
  const refs = JSON.parse(arg || '{}'); // { "MoyuZoo-Setup-x.exe.000": "<sha>", ... }
  if (info.win) info.win.parts = info.win.parts.map((p) => ({ file: p, ref: refs[p] })).filter((p) => p.ref);
  const cur = changelog.find((c) => c.version === V) || {};
  const out = {
    version: V, date: cur.date || new Date().toISOString().slice(0, 10), title: cur.title || '', notes: cur.notes || [],
    history: changelog, win: info.win, mac: info.mac,
  };
  fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('version.json ->', V);
}
