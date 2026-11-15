// 版本号、检查更新、更新内容提示
(function () {
  const PP = (window.PP = window.PP || {});
  const G = PP.G;
  const api = window.petAPI;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
  let ver = '', st = { status: 'idle' }, panelBody = null, changelog = [];

  // 把若干个版本的更新内容排成列表
  function notesHTML(list) {
    return list.map((v) => `<div class="ver"><b>v${esc(v.version)}</b> <span class="muted">${esc(v.date || '')}</span>${v.title ? ` · ${esc(v.title)}` : ''}<ul>${(v.notes || []).map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`).join('');
  }
  function newerThan(cur, latest) {
    const hist = (latest.history && latest.history.length ? latest.history : [{ version: latest.version, date: latest.date, title: latest.title, notes: latest.notes }]);
    return hist.filter((v) => cmp(v.version, cur) > 0 && cmp(v.version, latest.version) <= 0);
  }

  function statusLine() {
    switch (st.status) {
      case 'checking': return '正在检查…';
      case 'latest': return `已经是最新版 v${esc(ver)}`;
      case 'available': return `发现新版本 v${esc(st.latest.version)}`;
      case 'downloading': return `正在下载 v${esc(st.latest.version)}… ${Math.round((st.progress || 0) * 100)}%`;
      case 'ready': return `v${esc(st.latest.version)} 已经下载好了${st.via ? `（线路：${esc(st.via)}）` : ''}`;
      case 'error': return esc(st.error || '出错了');
      default: return '';
    }
  }
  function renderAbout() {
    if (!panelBody || !panelBody.isConnected) { panelBody = null; return; }
    const s = G.save.settings;
    const latestNotes = st.latest && cmp(st.latest.version, ver) > 0 ? notesHTML(newerThan(ver, st.latest)) : '';
    panelBody.innerHTML = `<p class="lead">Desktopia 桌面乌托邦 <b>v${esc(ver || '?')}</b></p>
      <p class="upd-status">${statusLine()}</p>
      ${st.status === 'downloading' ? `<div class="upd-bar"><i style="width:${Math.round((st.progress || 0) * 100)}%"></i></div>` : ''}
      ${latestNotes ? `<div class="upd-notes">${latestNotes}</div>` : ''}
      <div class="row">
        ${st.status === 'ready' ? '<button class="primary" data-a="install">马上更新</button><button class="small" data-a="later">下次启动时更新</button>'
          : st.status === 'available' ? '<button class="primary" data-a="download">下载新版</button>'
          : `<button class="small" data-a="check" ${st.status === 'checking' || st.status === 'downloading' ? 'disabled' : ''}>检查更新</button>`}
        ${st.status === 'checking' || st.status === 'downloading' ? '<button class="small" data-a="bg">收起，在后台继续</button>' : ''}<button class="small" data-a="page">发布页面</button>
      </div>
      <label class="row"><input type="checkbox" data-a="auto" ${s.autoUpdate !== false ? 'checked' : ''}> 自动检查并下载新版（下载好了会问你要不要装）</label>
      <details><summary class="muted">历史更新</summary><div class="upd-notes">${notesHTML(changelog)}</div></details>`;
  }
  // 收起以后：右下角一个小条显示进度，下好了变成“点这里更新”
  let bg = false, manual = false; // manual：这次检查 / 下载是你自己点的（不是开机自动的）
  function bgChip() { bg = true; showChip(st.status === 'downloading' ? `正在后台下载新版 ${Math.round((st.progress || 0) * 100)}%` : '正在后台检查更新…', about); }
  function about() {
    bg = false; hideChip();
    if (!api || !api.updateCheck) { PP.ui.toast('试玩版没有检查更新'); return; }
    const box = $('<div class="about"></div>');
    panelBody = box;
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'check') { manual = true; api.updateCheck(); }
      if (a === 'bg') { PP.ui.closePanel(); panelBody = null; bgChip(); }
      if (a === 'download') { api.updateDownload(); manual = true; PP.ui.closePanel(); bgChip(); return; } // 一点下载就自动收到右下角，不挡着你干活
      if (a === 'install') api.updateInstall(false);
      if (a === 'later') { api.updateInstall(true); PP.ui.toast('好的，下次打开时自动换成新版'); PP.ui.closePanel(); }
      if (a === 'page') { // 国内打不开 GitHub 发布页：有新版信息时直接用加速镜像下安装包
        const L = st && st.latest, w = L && L.win, gh = 'https://github.com/Utopian1025/myvault/releases/';
        api.openExternal(w && (w.asset || w.name) && !/Mac/i.test(navigator.platform) ? 'https://gh-proxy.com/' + gh + 'download/v' + L.version + '/' + encodeURIComponent(w.asset || w.name) : gh + 'latest');
      }
      if (a === 'auto') { G.save.settings.autoUpdate = b.checked; PP.save.soon(); }
    });
    PP.ui.panel('关于 & 检查更新', box, { wide: true });
    // 标题栏上的“－”：收到右下角的小条，检查 / 下载在后台继续
    const bar = box.closest('.panel') && box.closest('.panel').querySelector('.bar');
    if (bar) { const mn = $('<button class="x" title="收到右下角，在后台继续" style="margin-left:auto;margin-right:2px">－</button>'); mn.onclick = () => { PP.ui.closePanel(); if (st.status === 'checking' || st.status === 'downloading') bgChip(); else if (st.status === 'ready') { asked = ''; askInstall(); } else if (st.status === 'available') showChip(`发现新版 v${st.latest.version} · 点这里`, about, 60000); }; bar.insertBefore(mn, bar.querySelector('.x')); }
    manual = true;
    renderAbout();
    if (st.status === 'idle' || st.status === 'error' || st.status === 'latest') api.updateCheck();
  }

  // 新版下载好了：告诉你更新了什么，问你要不要现在装
  // 不再弹窗打断你：右下角出一个小条，点它才打开；点 × 就收起，这次不再提
  let asked = '', chip = null, chipT = 0;
  function showChip(text, onClick, ttl) {
    hideChip();
    chip = $(`<div class="updchip"><button class="go">${esc(text)}</button><button class="x" title="收起">×</button></div>`);
    chip.addEventListener('mousedown', (e) => e.stopPropagation());
    chip.querySelector('.go').addEventListener('click', () => { hideChip(); onClick(); });
    chip.querySelector('.x').addEventListener('click', hideChip);
    document.getElementById('ui').appendChild(chip);
    if (ttl) chipT = setTimeout(hideChip, ttl);
  }
  function hideChip() { clearTimeout(chipT); if (chip) { chip.remove(); chip = null; PP.refreshInteractive && PP.refreshInteractive(); } }
  function askInstall() {
    if (!st.latest || asked === st.latest.version) return;
    asked = st.latest.version;
    showChip(`新版 v${st.latest.version} 已下载好 · 点这里更新`, about);
  }

  // 刚更新完：第一次打开时说一下更新了什么
  function whatsNew(from) {
    const list = changelog.filter((v) => cmp(v.version, from) > 0 && cmp(v.version, ver) <= 0);
    if (!list.length) return;
    showChip(`已更新到 v${ver} · 看看更新了什么`, () => {
      const box = $(`<div class="about"><p class="lead">已经更新到 <b>v${esc(ver)}</b>，这次有这些变化：</p><div class="upd-notes">${notesHTML(list)}</div><div class="row"><button class="primary" data-a="ok">知道啦</button></div></div>`);
      box.addEventListener('click', (e) => { if (e.target.closest('[data-a=ok]')) PP.ui.closePanel(); });
      PP.ui.panel('更新好了', box, { wide: true });
    }, 45000);
  }

  function auto() {
    const s = G.save && G.save.settings;
    if (!s || s.autoUpdate === false || !api || !api.updateCheck) return;
    api.updateCheck().then((r) => {
      if (r && r.status === 'available' && s.skipVersion !== r.latest.version) api.updateDownload();
      else if (r && r.status === 'ready') askInstall();
    }).catch(() => {});
  }

  async function init() {
    if (!api || !api.appVersion) return;
    ver = await api.appVersion();
    PP.APP_VERSION = ver;
    changelog = (await api.changelog()) || [];
    const s = G.save.settings;
    if (s.lastVersion && cmp(ver, s.lastVersion) > 0) setTimeout(() => whatsNew(s.lastVersion), 7000);
    s.lastVersion = ver; PP.save.soon();
    api.onUpdate((x) => {
      st = x; renderAbout();
      const open = panelBody && panelBody.isConnected;
      // 面板被关掉了（点了 ×、或者开了别的面板）但还在检查 / 下载：自动转到后台小条，不用专门去点“收起”
      if (!open && !bg && manual && (x.status === 'checking' || x.status === 'downloading')) bgChip();
      if (x.status === 'latest' || x.status === 'ready' || x.status === 'error') manual = manual && open;
      if (bg && !open) { if (x.status === 'downloading') { const g = chip && chip.querySelector('.go'); if (g) g.textContent = `正在后台下载新版 ${Math.round((x.progress || 0) * 100)}%`; else bgChip(); } else if (x.status === 'ready') { bg = false; asked = ''; askInstall(); } else if (x.status === 'error') { bg = false; showChip('更新没下完（点这里再试）', about); } else if (x.status === 'latest') { bg = false; showChip('已经是最新版', () => {}, 6000); } else if (x.status === 'available') { bg = false; showChip(`发现新版 v${x.latest.version} · 点这里下载`, about); } }
      else if (x.status === 'ready' && G.save.settings.autoUpdate !== false && !open) askInstall();
    });
    setTimeout(auto, 25000);
    setInterval(auto, 6 * 3600 * 1000);
  }

  PP.update = { init, about, get version() { return ver; } };
})();
