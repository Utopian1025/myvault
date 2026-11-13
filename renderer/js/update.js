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
    panelBody.innerHTML = `<p class="lead">摸鱼动物园 <b>v${esc(ver || '?')}</b></p>
      <p class="upd-status">${statusLine()}</p>
      ${st.status === 'downloading' ? `<div class="upd-bar"><i style="width:${Math.round((st.progress || 0) * 100)}%"></i></div>` : ''}
      ${latestNotes ? `<div class="upd-notes">${latestNotes}</div>` : ''}
      <div class="row">
        ${st.status === 'ready' ? '<button class="primary" data-a="install">马上更新</button><button class="small" data-a="later">下次启动时更新</button>'
          : st.status === 'available' ? '<button class="primary" data-a="download">下载新版</button>'
          : `<button class="small" data-a="check" ${st.status === 'checking' || st.status === 'downloading' ? 'disabled' : ''}>检查更新</button>`}
        <button class="small" data-a="page">发布页面</button>
      </div>
      <label class="row"><input type="checkbox" data-a="auto" ${s.autoUpdate !== false ? 'checked' : ''}> 自动检查并下载新版（下载好了会问你要不要装）</label>
      <details><summary class="muted">历史更新</summary><div class="upd-notes">${notesHTML(changelog)}</div></details>`;
  }
  function about() {
    if (!api || !api.updateCheck) { PP.ui.toast('试玩版没有检查更新'); return; }
    const box = $('<div class="about"></div>');
    panelBody = box;
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'check') api.updateCheck();
      if (a === 'download') api.updateDownload();
      if (a === 'install') api.updateInstall(false);
      if (a === 'later') { api.updateInstall(true); PP.ui.toast('好的，下次打开时自动换成新版'); PP.ui.closePanel(); }
      if (a === 'page') { // 国内打不开 GitHub 发布页：有新版信息时直接用加速镜像下安装包
        const L = st && st.latest, w = L && L.win, gh = 'https://github.com/Utopian1025/myvault/releases/';
        api.openExternal(w && (w.asset || w.name) && !/Mac/i.test(navigator.platform) ? 'https://gh-proxy.com/' + gh + 'download/v' + L.version + '/' + encodeURIComponent(w.asset || w.name) : gh + 'latest');
      }
      if (a === 'auto') { G.save.settings.autoUpdate = b.checked; PP.save.soon(); }
    });
    PP.ui.panel('关于 & 检查更新', box, { wide: true });
    renderAbout();
    if (st.status === 'idle' || st.status === 'error' || st.status === 'latest') api.updateCheck();
  }

  // 新版下载好了：告诉你更新了什么，问你要不要现在装
  let asked = '';
  function askInstall() {
    if (!st.latest || asked === st.latest.version || document.querySelector('.panel')) return;
    asked = st.latest.version;
    const box = $(`<div class="about"><p class="lead">新版本 <b>v${esc(st.latest.version)}</b> 已经准备好了，几秒钟就能装好，宠物和存档都会保留。</p>
      <div class="upd-notes">${notesHTML(newerThan(ver, st.latest))}</div>
      <div class="row"><button class="primary" data-a="now">马上更新</button><button class="small" data-a="later">下次启动时</button><button class="small" data-a="skip">跳过这个版本</button></div></div>`);
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'now') api.updateInstall(false);
      if (b.dataset.a === 'later') { api.updateInstall(true); PP.ui.closePanel(); }
      if (b.dataset.a === 'skip') { G.save.settings.skipVersion = st.latest.version; PP.save.soon(); PP.ui.closePanel(); }
    });
    PP.ui.panel('有新版本啦', box, { wide: true });
  }

  // 刚更新完：第一次打开时说一下更新了什么
  function whatsNew(from) {
    const list = changelog.filter((v) => cmp(v.version, from) > 0 && cmp(v.version, ver) <= 0);
    if (!list.length) return;
    const box = $(`<div class="about"><p class="lead">已经更新到 <b>v${esc(ver)}</b>，这次有这些变化：</p><div class="upd-notes">${notesHTML(list)}</div><div class="row"><button class="primary" data-a="ok">知道啦</button></div></div>`);
    box.addEventListener('click', (e) => { if (e.target.closest('[data-a=ok]')) PP.ui.closePanel(); });
    PP.ui.panel('更新好了', box, { wide: true });
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
      if (x.status === 'ready' && G.save.settings.autoUpdate !== false && !panelBody) askInstall();
    });
    setTimeout(auto, 25000);
    setInterval(auto, 6 * 3600 * 1000);
  }

  PP.update = { init, about, get version() { return ver; } };
})();
