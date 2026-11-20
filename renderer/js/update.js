// 版本号、检查更新、更新内容提示
(function () {
  const PP = (window.PP = window.PP || {});
  const G = PP.G;
  const api = window.petAPI;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
  let ver = '', st = { status: 'idle' }, panelBody = null, changelog = [], sysIdle = 0;

  // 把若干个版本的更新内容排成列表
  function notesHTML(list) {
    return list.map((v) => `<div class="ver"><b>v${esc(v.version)}</b> <span class="muted">${esc(v.date || '')}</span>${v.title ? ` · ${esc(v.title)}` : ''}<ul>${(v.notes || []).map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`).join('');
  }
  function newerThan(cur, latest) {
    const hist = (latest.history && latest.history.length ? latest.history : [{ version: latest.version, date: latest.date, title: latest.title, notes: latest.notes }]);
    // 只看最新这一版写了什么（以前的版本不再列出来）
    return hist.filter((v) => v.version === latest.version).slice(0, 1);
  }

  function statusLine() {
    switch (st.status) {
      case 'checking': return '正在检查…';
      case 'latest': return `已经是最新版 v${esc(ver)}`;
      case 'available': return `发现新版本 v${esc(st.latest.version)}`;
      case 'downloading': return `正在下载 v${esc(st.latest.version)}… ${Math.round((st.progress || 0) * 100)}%${st.route > 1 ? `（第一条线路不通，换线路 ${st.route} 重新下）` : ''}`;
      case 'verifying': return `下载完了，正在检查安装包是否完整…`;
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
      ${st.status === 'downloading' || st.status === 'verifying' ? `<div class="upd-bar"><i style="width:${Math.round((st.progress || 0) * 100)}%"></i></div>` : ''}
      ${latestNotes ? `<div class="upd-notes">${latestNotes}</div>` : ''}
      <div class="row">
        ${st.status === 'ready' ? `<button class="primary" data-a="install" title="画面马上消失，装好自己回来">立即更新</button>${quiet() ? '' : '<button class="small" data-a="later">下次启动时更新</button>'}<button class="small" data-a="stop">这次不更新</button>`
          : st.status === 'available' ? '<button class="primary" data-a="download">下载新版</button>'
          : `<button class="small" data-a="check" ${st.status === 'checking' || st.status === 'downloading' || st.status === 'verifying' ? 'disabled' : ''}>检查更新</button>`}
        ${busy() ? '<button class="small" data-a="bg">收起，在后台继续</button>' : ''}${st.status === 'downloading' ? '<button class="small" data-a="stop">停止更新</button>' : ''}<button class="small" data-a="page">发布页面</button>
      </div>
      ${st.status === 'ready' && quiet() && !st.skip ? '<p class="muted">不点也行：你锁屏、离开电脑 15 分钟、或者退出程序时，会自动悄悄装好。</p>' : ''}
      <label class="row"><input type="checkbox" data-a="auto" ${s.autoUpdate !== false ? 'checked' : ''}> 自动检查并在后台下载新版</label>
      <label class="row" ${s.autoUpdate === false ? 'style="opacity:.45"' : ''}><input type="checkbox" data-a="quiet" ${s.quietUpdate !== false ? 'checked' : ''} ${s.autoUpdate === false ? 'disabled' : ''}> 悄悄更新：不弹任何提示，等你锁屏、离开电脑 15 分钟或退出时自动装好</label>`;
  }
  // 迷你更新条：右下角半透明小条（能拖到别处，位置记住）。按钮：文字（点开详情）· 立即更新（下好以后才有）· －（缩成一根细线）· ×（停止更新）
  let bg = false, manual = false; // manual：这次检查 / 下载是你自己点的（不是开机自动的）
  let hushed = false, stoppedRun = false; // hushed：按了老板键，这次先别冒出来；stoppedRun：你点了 × 停止，这次运行不再自动下
  let asked = '', chip = null, chipT = 0;
  const S = () => G.save.settings;
  const quiet = () => S().autoUpdate !== false && S().quietUpdate !== false;
  const busy = () => st.status === 'checking' || st.status === 'downloading' || st.status === 'verifying';
  function bgText() { const pc = Math.round((st.progress || 0) * 100); return st.status === 'downloading' ? `更新 ${pc}%` : st.status === 'verifying' ? '更新：校验中' : st.status === 'ready' ? `v${st.latest.version} 已下好` : '检查更新…'; }
  function bgChip() {
    bg = true; if (hushed) return;
    const pc = st.status === 'downloading' ? Math.round((st.progress || 0) * 100) : st.status === 'checking' ? 0 : 100;
    if (chip && chip.classList.contains('bgc') && !!chip.querySelector('.now') === (st.status === 'ready')) { chip.querySelector('.go').textContent = bgText(); chip.querySelector('.pg').style.width = pc + '%'; return; }
    showChip(bgText(), about, 0, { now: st.status === 'ready', pg: pc, onX: stopUpd, xTip: st.status === 'ready' ? '这次先不更新' : '停止更新' });
    if (chip) chip.classList.add('bgc');
  }
  // × 停止：正在下就掐断（下好的部分留着，下次接着下）；已经下好的就这次不装
  function stopUpd() {
    const was = st.status; bg = false; manual = false; stoppedRun = true; hideChip();
    if (api && api.updateStop) api.updateStop();
    PP.ui.toast(was === 'ready' ? '好的，这次不更新' : '已停止更新（下好的部分留着，下次接着下）', 1.8);
  }
  // 立即更新：先把整个画面瞬间藏掉，再交给后台静默安装（装完自己打开，存档不动）
  function installNow() {
    try { document.body.style.transition = 'none'; document.body.style.opacity = '0'; } catch (e) {}
    try { PP.save && PP.save.write && PP.save.write(); } catch (e) {}
    Promise.resolve(api.updateInstall(false)).then((ok) => { if (ok === false) { document.body.style.opacity = ''; PP.ui.toast('没能开始安装，可以去“关于 & 检查更新”里点“发布页面”手动装'); } });
    setTimeout(() => { document.body.style.opacity = ''; }, 15000); // 万一没装成，别让宠物一直隐身
  }
  function showChip(text, onClick, ttl, o = {}) {
    hideChip();
    chip = $(`<div class="updchip${S().updMin ? ' min' : ''}"><button class="go" title="点开看详情">${esc(text)}</button>${o.now ? '<button class="now" title="现在就装：画面马上消失，装好自己回来">立即更新</button>' : ''}<button class="mn" title="缩成一根细线">－</button><button class="x" title="${esc(o.xTip || '收起')}">×</button><i class="pg" style="width:${o.pg != null ? o.pg : 0}%"></i></div>`);
    const p = S().updChip; if (p && isFinite(p.r) && isFinite(p.b)) { chip.style.right = Math.max(0, Math.min(innerWidth - 40, p.r)) + 'px'; chip.style.bottom = Math.max(0, Math.min(innerHeight - 16, p.b)) + 'px'; }
    // 拖动：按住任何地方拖就走；拖过了就不算点击
    let drag = null, dragged = false;
    chip.addEventListener('mousedown', (e) => {
      e.stopPropagation(); if (e.button !== 0) return;
      const r = chip.getBoundingClientRect(); drag = { x: e.clientX, y: e.clientY, r: innerWidth - r.right, b: innerHeight - r.bottom }; dragged = false;
      const mv = (ev) => { if (!drag) return; const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y; if (!dragged && Math.hypot(dx, dy) < 4) return; dragged = true; G.uiDrag = true;
        chip.style.right = Math.max(0, Math.min(innerWidth - chip.offsetWidth, drag.r - dx)) + 'px'; chip.style.bottom = Math.max(0, Math.min(innerHeight - chip.offsetHeight, drag.b - dy)) + 'px'; };
      const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); if (dragged && chip) { S().updChip = { r: parseFloat(chip.style.right), b: parseFloat(chip.style.bottom) }; PP.save.soon(); } drag = null; G.uiDrag = false; PP.refreshInteractive && PP.refreshInteractive(); };
      window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    });
    chip.addEventListener('click', (e) => {
      if (dragged) { dragged = false; e.stopPropagation(); return; }
      const b = e.target.closest('button');
      if (chip.classList.contains('min')) { chip.classList.remove('min'); S().updMin = false; PP.save.soon(); return; } // 缩着的时候点哪儿都是展开
      if (!b) return;
      if (b.classList.contains('go')) { hideChip(); onClick(); }
      else if (b.classList.contains('now')) { hideChip(); installNow(); }
      else if (b.classList.contains('mn')) { chip.classList.add('min'); S().updMin = true; PP.save.soon(); }
      else if (b.classList.contains('x')) { if (o.onX) o.onX(); else hideChip(); }
    });
    document.getElementById('ui').appendChild(chip);
    if (ttl) chipT = setTimeout(hideChip, ttl);
  }
  function hideChip() { clearTimeout(chipT); if (chip) { chip.remove(); chip = null; PP.refreshInteractive && PP.refreshInteractive(); } }
  // 老板键：小条一起藏起来（后台照样下载 / 下好了照样悄悄装），等你自己去“关于 & 检查更新”看
  function hush() { if (chip) { hushed = true; hideChip(); } }
  function about() {
    bg = false; hushed = false; hideChip();
    if (!api || !api.updateCheck) { PP.ui.toast('试玩版没有检查更新'); return; }
    const box = $('<div class="about"></div>');
    panelBody = box;
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'check') { manual = true; stoppedRun = false; api.updateCheck(); }
      if (a === 'bg') { PP.ui.closePanel(); panelBody = null; bgChip(); }
      if (a === 'download') { stoppedRun = false; api.updateDownload(); manual = true; PP.ui.closePanel(); panelBody = null; bgChip(); return; } // 一点下载就自动收到右下角，不挡着你干活
      if (a === 'stop') { PP.ui.closePanel(); panelBody = null; stopUpd(); return; }
      if (a === 'install') { PP.ui.closePanel(); panelBody = null; installNow(); return; }
      if (a === 'later') { api.updateInstall(true); PP.ui.toast('好的，下次打开时自动换成新版'); PP.ui.closePanel(); }
      if (a === 'page') { // 国内打不开 GitHub 发布页：有新版信息时直接用加速镜像下安装包
        const L = st && st.latest, w = L && L.win, gh = 'https://github.com/Utopian1025/myvault/releases/';
        api.openExternal(w && (w.asset || w.name) && !/Mac/i.test(navigator.platform) ? 'https://gh-proxy.com/' + gh + 'download/v' + L.version + '/' + encodeURIComponent(w.asset || w.name) : gh + 'latest');
      }
      if (a === 'auto') { S().autoUpdate = b.checked; PP.save.soon(); sendQuiet(); renderAbout(); }
      if (a === 'quiet') { S().quietUpdate = b.checked; PP.save.soon(); sendQuiet(); renderAbout(); }
    });
    PP.ui.panel('关于 & 检查更新', box, { wide: true, corner: true, onMin: () => { panelBody = null; if (busy() || st.status === 'ready') bgChip(); else showChip('关于 & 更新', about); } });
    manual = true;
    renderAbout();
    if (st.status === 'idle' || st.status === 'error' || st.status === 'latest') api.updateCheck();
  }
  function sendQuiet() { try { api && api.updateQuiet && api.updateQuiet(quiet()); } catch (e) {} }

  // 新版下好了（自己点的、或者没开“悄悄更新”）：右下角小条，带“立即更新”
  function askInstall() {
    if (!st.latest || asked === st.latest.version) return;
    asked = st.latest.version; bgChip();
  }

  // 刚更新完：第一次打开时说一下更新了什么
  function whatsNew(from) {
    const list = cmp(ver, from) > 0 ? changelog.filter((v) => v.version === ver).slice(0, 1) : [];
    if (!list.length) return;
    const open = () => {
      const box = $(`<div class="about"><p class="lead">已经更新到 <b>v${esc(ver)}</b>，这次有这些变化：</p><div class="upd-notes">${notesHTML(list)}</div><div class="row"><button class="primary" data-a="ok">知道啦</button></div></div>`);
      box.addEventListener('click', (e) => { if (e.target.closest('[data-a=ok]')) PP.ui.closePanel(); });
      PP.ui.panel('更新好了', box, { wide: true, corner: true, onMin: () => showChip(`已更新 v${ver} · 看看`, open) });
    };
    // 悄悄更新多半是你不在的时候装的：等你回到电脑前（动了鼠标键盘）再冒出来，30 秒后自己消失
    const go = () => { if (!hushed) showChip(`已更新 v${ver} · 看看`, open, 30000); };
    if (sysIdle > 20) { const t = setInterval(() => { if (sysIdle < 3) { clearInterval(t); go(); } }, 1000); } else go();
  }

  function auto() {
    const s = G.save && G.save.settings;
    if (!s || s.autoUpdate === false || stoppedRun || !api || !api.updateCheck) return;
    api.updateCheck().then((r) => {
      if (r && r.status === 'available' && s.skipVersion !== r.latest.version) api.updateDownload();
      else if (r && r.status === 'ready' && !quiet()) askInstall();
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
    sendQuiet();
    if (api.onIdle) api.onIdle((x) => { sysIdle = +x || 0; });
    api.onUpdate((x) => {
      st = x; renderAbout();
      const open = panelBody && panelBody.isConnected;
      // 面板被关掉了（点了 ×、或者开了别的面板）但还在检查 / 下载：自动转到后台小条，不用专门去点“收起”
      if (!open && !bg && manual && (x.status === 'checking' || x.status === 'downloading' || x.status === 'verifying')) bgChip();
      if (x.status === 'latest' || x.status === 'ready' || x.status === 'error') manual = manual && open;
      if (x.stopped) return;
      if (bg && !open) { if (x.status === 'verifying' || x.status === 'downloading') { bgChip(); } else if (x.status === 'ready') { asked = ''; askInstall(); } else if (x.status === 'error') { bg = false; showChip('更新没下完 · 重试', about); } else if (x.status === 'latest') { bg = false; showChip('已经是最新版', () => {}, 6000); } else if (x.status === 'available') { bg = false; showChip(`有新版 v${x.latest.version}`, about); } }
      else if (x.status === 'ready' && G.save.settings.autoUpdate !== false && !quiet() && !open) askInstall();
    });
    setTimeout(auto, 25000);
    setInterval(auto, 6 * 3600 * 1000);
  }

  PP.update = { init, about, hush, get version() { return ver; } };
})();
