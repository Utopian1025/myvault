// 界面：黑白像素风（参考 Comnyang 官网的粗边框 + 硬阴影 + 黄色点缀）
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let root, menuEl = null, panelEl = null, anims = [];

  const ui = (PP.ui = {
    init() {
      root = document.getElementById('ui');
      const dock = $(`<div class="dock" title="宠物菜单"><div class="paw"><canvas width="14" height="12"></canvas></div></div>`);
      root.appendChild(dock);
      drawPaw(dock.querySelector('canvas'));
      dock.addEventListener('click', (e) => { e.stopPropagation(); ui.dockMenu(dock); });
      root.addEventListener('mouseover', PP.refreshInteractive);
      root.addEventListener('mouseout', () => setTimeout(PP.refreshInteractive, 0));
      if (window.petAPI) window.petAPI.onTray((cmd) => ui.command(cmd));
    },
    modalOpen() { return !!panelEl || !!menuEl; },
    closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; PP.refreshInteractive(); } },
    closeAll() { ui.closeMenu(); ui.closePanel(); },
    closePanel() { if (panelEl) { panelEl.remove(); panelEl = null; anims = []; PP.refreshInteractive(); } },

    toast(text, kind = 'info') {
      const el = $(`<div class="toast ${kind}">${kind === 'egg' ? '<b>★</b> ' : kind === 'gift' ? '<b>♥</b> ' : ''}${esc(text)}</div>`);
      root.appendChild(el);
      const olds = root.querySelectorAll('.toast'); if (olds.length > 4) olds[0].remove();
      const all = root.querySelectorAll('.toast');
      all.forEach((t, i) => (t.style.transform = `translateY(${-(all.length - 1 - i) * 44}px)`));
      setTimeout(() => el.classList.add('out'), 3600);
      setTimeout(() => el.remove(), 4100);
    },

    menu(items, x, y) {
      ui.closeMenu();
      const el = $(`<div class="menu"></div>`);
      for (const it of items) {
        if (it === '-') { el.appendChild($('<div class="sep"></div>')); continue; }
        const b = $(`<button ${it.disabled ? 'disabled' : ''}>${esc(it.label)}${it.hint ? `<span>${esc(it.hint)}</span>` : ''}</button>`);
        b.addEventListener('click', (e) => { e.stopPropagation(); ui.closeMenu(); it.fn && it.fn(); });
        el.appendChild(b);
      }
      root.appendChild(el);
      const r = el.getBoundingClientRect();
      el.style.left = U.clamp(x, 6, G.W - r.width - 6) + 'px';
      el.style.top = U.clamp(y - r.height, 6, G.H - r.height - 6) + 'px';
      menuEl = el; PP.refreshInteractive();
    },

    dockMenu(anchor) {
      const r = anchor.getBoundingClientRect();
      const items = [
        { label: '领养新伙伴', hint: `${G.pets.length}/6`, fn: () => ui.adopt(), disabled: G.pets.length >= 6 },
        { label: '大家的状态', fn: () => ui.overview() },
        { label: '日记', fn: () => ui.diaryPanel() },
        { label: '收藏柜', fn: () => ui.collectionPanel() },
        { label: '彩蛋图鉴', hint: `${Object.keys(G.save.eggs).length}/${Object.keys(PP.EGGS).length}`, fn: () => ui.eggPanel() },
        '-',
        PP.F.pomo.phase === 'off' ? { label: '开始番茄钟', hint: `${G.save.settings.pomo.focus} 分钟`, fn: () => PP.F.pomoStart() } : { label: '停止番茄钟', fn: () => PP.F.pomoStop() },
        { label: G.save.settings.peek ? '退出看视频模式' : '看视频模式', hint: '躲到角落', fn: () => { G.save.settings.peek = !G.save.settings.peek; if (G.save.settings.peek) { const m = PP.F.main(); m && m.interrupt(); } PP.save.soon(); } },
        { label: '提醒设置', fn: () => ui.reminders() },
        ...(window.petAPI ? [] : [{ label: '模拟：AI 在思考', fn: () => PP.F.setAgent('thinking') }, { label: '模拟：AI 完成了', fn: () => PP.F.setAgent('done') }]),
        { label: '扔个球', fn: () => throwBall(G.W / 2, G.ground - 200) },
        { label: '添满饭和水', fn: () => { G.items.forEach((i) => { if (i.type === 'food' || i.type === 'water') i.level = 1; }); ui.toast('饭碗和水碗都满了'); } },
        { label: G.save.settings.quiet ? '退出勿扰模式' : '勿扰模式', fn: () => { G.save.settings.quiet = !G.save.settings.quiet; ui.toast(G.save.settings.quiet ? '它们会安静地自己玩' : '欢迎回来'); PP.save.soon(); } },
        { label: '设置', fn: () => ui.settings() },
      ];
      if (window.petAPI) items.push('-', { label: '退出', fn: () => { PP.save.write(); window.petAPI.quit(); } });
      ui.menu(items, r.left, r.top - 4);
    },

    command(cmd) {
      if (cmd === 'adopt') ui.adopt();
      else if (cmd === 'diary') ui.diaryPanel();
      else if (cmd === 'overview') ui.overview();
      else if (cmd === 'settings') ui.settings();
      else if (cmd === 'eggs') ui.eggPanel();
      else if (cmd === 'collection') ui.collectionPanel();
      else if (cmd === 'feed') G.items.forEach((i) => { if (i.type === 'food' || i.type === 'water') i.level = 1; });
      else if (cmd === 'quiet') { G.save.settings.quiet = !G.save.settings.quiet; }
      else if (cmd === 'pomo') { PP.F.pomo.phase === 'off' ? PP.F.pomoStart() : PP.F.pomoStop(); }
      else if (cmd === 'peek') { G.save.settings.peek = !G.save.settings.peek; const m = PP.F.main(); m && m.interrupt(); }
      else if (cmd === 'reminders') ui.reminders();
    },

    petMenu(p, x, y) {
      const sp = p.sp;
      ui.menu([
        { label: `${p.name}`, hint: p.moodName, fn: () => ui.petPanel(p) },
        '-',
        { label: `喂${sp.favName}`, hint: '最爱', fn: () => dropTreat(p.x + p.facing * 40, sp.fav) },
        { label: '喂零食', fn: () => dropTreat(p.x + p.facing * 40, U.pick(['treat_fish', 'treat_bone', 'treat_carrot', 'treat_seed', 'treat_berry'].filter((t) => t !== sp.fav))) },
        { label: '扔球给它', fn: () => throwBall(p.x, p.y - 200) },
        { label: p.sleeping ? '叫醒它' : '哄它睡觉', fn: () => { if (p.sleeping) p.run('poked', PP.ACTIONS.poked); else p.run('sleep', PP.ACTIONS.sleep); } },
        { label: '看看它在想什么', fn: () => thoughts(p) },
        { label: p.d.note ? '撕掉便签' : '贴一张便签', fn: () => { if (p.d.note) { p.d.note = ''; PP.save.soon(); } else ui.notePanel(p); } },
        { label: '换花色', fn: () => ui.coatPanel(p) },
        '-',
        { label: '查看档案', fn: () => ui.petPanel(p) },
      ], x, y);
    },
    itemMenu(it, x, y) {
      const names = { food: '饭碗', water: '水碗', bed: '小窝', litter: '猫砂盆', ball: '球', poop: '便便', gift: '礼物', egg: '神秘的蛋', cup: '杯子', treat: '零食' };
      const items = [{ label: names[it.type] || '东西', disabled: true }];
      if (it.type === 'food' || it.type === 'water') items.push({ label: '添满', fn: () => { it.level = 1; } });
      if (it.type === 'litter') items.push({ label: `清理（${it.data.dirty || 0}）`, fn: () => { it.data.dirty = 0; } });
      if (['ball', 'cup', 'poop', 'treat'].includes(it.type)) items.push({ label: '收起来', fn: () => { it.dead = true; } });
      if (['food', 'water', 'bed', 'litter'].includes(it.type)) items.push({ label: '（可以拖动摆放位置）', disabled: true });
      ui.menu(items, x, y);
    },

    // ---------- 面板 ----------
    panel(title, body, opts = {}) {
      ui.closeAll();
      const el = $(`<div class="panel ${opts.wide ? 'wide' : ''}"><div class="bar"><span>${esc(title)}</span><button class="x">×</button></div><div class="body"></div></div>`);
      el.querySelector('.x').onclick = () => ui.closePanel();
      const b = el.querySelector('.body');
      if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body);
      root.appendChild(el);
      panelEl = el; PP.refreshInteractive();
      // 拖动标题栏
      const bar = el.querySelector('.bar');
      bar.onmousedown = (e) => {
        if (e.target.classList.contains('x')) return;
        const r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
        const mv = (ev) => { el.style.left = ev.clientX - ox + 'px'; el.style.top = ev.clientY - oy + 'px'; el.style.transform = 'none'; };
        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
      };
      return el;
    },

    adopt(preset) {
      const box = $(`<div class="adopt"><p class="lead">选一只回家吧。每一只的性格都是独一无二的，花色之后还可以照着你家的调。</p><div class="grid"></div>
        <div class="form"><label>名字 <input maxlength="8" class="name"></label><button class="dice" title="随机名字">⚄</button></div>
        <div class="coat"></div><div class="desc"></div><button class="primary go">带它回家</button></div>`);
      const grid = box.querySelector('.grid');
      const nameIn = box.querySelector('.name');
      nameIn.value = PP.randomName();
      box.querySelector('.dice').onclick = () => (nameIn.value = PP.randomName());
      let pick = preset || 'cat', coatIdx = 0;
      const list = PP.SPECIES_LIST.slice();
      if (G.save.flags.eggHatched) list.push('dragon');
      const cards = {};
      for (const s of list) {
        const c = $(`<button class="card"><canvas width="96" height="96"></canvas><b>${PP.SPECIES[s].name}</b></button>`);
        c.onclick = () => { pick = s; coatIdx = 0; refresh(); };
        grid.appendChild(c); cards[s] = c;
        const cv = c.querySelector('canvas');
        anims.push(() => { const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, 96, 96); const coats = PP.SPECIES[s].coats; const co = s === pick ? coats[coatIdx] : coats[0];
          PP.SPR.blit(ctx, PP.SPR.drawPet({ species: s, pal: PP.SPR.PAL[s][co], coatKey: co, facing: 1, anim: s === pick ? 'idle' : 'sit', jelly: { sy: 1 + Math.sin(G.t * 2.4) * 0.03, sx: 1, skew: 0, sway: Math.sin(G.t * 1.5) }, t: G.t, eyes: s === pick ? (Math.floor(G.t * 0.5) % 5 === 0 ? 'happy' : 'open') : 'open', look: [Math.sin(G.t * 0.9), Math.cos(G.t * 0.7) * 0.6], mouth: 'w' }), 0, 0, 3); });
      }
      const refresh = () => {
        for (const s in cards) cards[s].classList.toggle('on', s === pick);
        const sp = PP.SPECIES[pick];
        const coatBox = box.querySelector('.coat');
        coatBox.innerHTML = '花色：' + sp.coats.map((c, i) => `<button class="chip ${i === coatIdx ? 'on' : ''}" data-i="${i}">${PP.SPR.PAL[pick][c].name}</button>`).join('');
        coatBox.querySelectorAll('.chip').forEach((b) => (b.onclick = () => { coatIdx = +b.dataset.i; refresh(); }));
        box.querySelector('.desc').textContent = sp.desc;
      };
      refresh();
      box.querySelector('.go').onclick = () => {
        if (G.pets.length >= 6) { ui.toast('最多同时养 6 只'); return; }
        const name = nameIn.value.trim() || PP.randomName();
        const p = PP.Pet.create(pick, PP.SPECIES[pick].coats[coatIdx], name);
        p.x = U.rand(G.W * 0.3, G.W * 0.7); p.y = G.ground - 300; p.airborne = true; p.fallFrom = p.y;
        G.pets.push(p);
        if (!G.save.flags.firstAdopt) G.save.flags.firstAdopt = Date.now();
        PP.diary.add(p, `来到了新家，名字叫${name}。`, 'love');
        if (p.d.shiny) { PP.events.found('shiny'); ui.toast(`哇！${name}是罕见的闪光个体！`, 'egg'); }
        ui.closePanel();
        setTimeout(() => { p._forceSay = true; p.say(U.pick(['这里是哪里？', '你好…', '（好奇地看着你）'])); p._forceSay = false; }, 900);
        PP.save.write();
      };
      ui.panel('领养', box, { wide: true });
    },

    petPanel(p) {
      const box = $(`<div class="profile"><div class="top"><canvas width="128" height="128"></canvas><div class="info"></div></div><div class="needs"></div><div class="more"></div></div>`);
      const cv = box.querySelector('canvas');
      anims.push(() => {
        const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, 128, 128);
        PP.SPR.blit(ctx, PP.SPR.drawPet({ species: p.d.species, pal: p.pal, coatKey: p.d.shiny ? 'shiny' : p.d.coat, facing: 1, anim: p.sleeping ? 'sleep' : 'idle', t: G.t, eyes: p.sleeping ? 'closed' : Math.floor(G.t * 0.4) % 6 === 0 ? 'closed' : 'open', look: [G.mouse.x > cv.getBoundingClientRect().left + 64 ? 1 : -1, G.mouse.y < cv.getBoundingClientRect().top + 30 ? -1 : 0], mouth: 'w', blush: p.affLevel >= 3, lop: p.d.lop }), 0, 0, 4);
      });
      const render = () => {
        const days = U.daysBetween(new Date(U.dateKey(new Date(p.d.born))).getTime(), new Date(U.dateKey()).getTime()) + 1;
        const traits = PP.TRAITS.map(([k, hi, lo]) => { const v = p.tr[k]; return v > 0.68 ? hi : v < 0.32 ? lo : null; }).filter(Boolean).slice(0, 4);
        const hearts = '♥'.repeat(p.affLevel + 1) + '♡'.repeat(4 - p.affLevel);
        box.querySelector('.info').innerHTML = `
          <div class="nm"><b>${esc(p.name)}</b> <button class="rename small">改名</button></div>
          <div>${PP.SPECIES[p.d.species].name} · ${esc(p.pal.name)}${p.d.shiny ? ' <span class="tag gold">闪光</span>' : ''}</div>
          <div>相伴第 <b>${days}</b> 天</div>
          <div class="tags">${traits.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
          <div>对你：<span class="hearts">${hearts}</span> ${p.affName}</div>
          <div>现在：${p.moodName}${p.action ? ` · ${actName(p.action)}` : ''}</div>`;
        box.querySelector('.rename').onclick = () => {
          const nm = box.querySelector('.nm');
          nm.innerHTML = `<input maxlength="8" value="${esc(p.name)}"> <button class="small ok">好</button>`;
          const inp = nm.querySelector('input'); inp.focus(); inp.select();
          const done = () => { const v = inp.value.trim(); if (v) { p.d.name = v.slice(0, 8); PP.diary.add(p, `有了新名字：${p.d.name}。`, 'note'); PP.save.soon(); } render(); };
          nm.querySelector('.ok').onclick = done; inp.onkeydown = (e) => { if (e.key === 'Enter') done(); };
        };
        box.querySelector('.needs').innerHTML = Object.entries(PP.NEED_NAMES).map(([k, nm]) => {
          const v = Math.round(p.n[k]);
          return `<div class="need"><span>${nm}</span><i><em style="width:${v}%" class="${v < 25 ? 'low' : ''}"></em></i></div>`;
        }).join('');
        const rels = G.pets.filter((o) => o !== p).map((o) => { const r = p.relWith(o); return `${esc(o.name)} ${r > 70 ? '好朋友' : r > 45 ? '朋友' : r > 25 ? '一般' : '不太合'}`; });
        box.querySelector('.more').innerHTML = `
          <div>最爱吃：${p.sp.favName} · 才艺：${p.sp.trick}（双击）</div>
          <div>被摸了 ${p.d.stats.pets} 次 · 被戳了 ${p.d.stats.pokes} 次 · 送过你 ${p.d.stats.gifts} 份礼物</div>
          ${rels.length ? `<div>关系：${rels.join('，')}</div>` : ''}
          ${p.d.species === 'hamster' ? `<div>秘密粮仓：${p.d.stash} 颗</div>` : ''}
          <div class="row"><button class="small diary">看它的日记</button><button class="small bye">送养…</button></div>`;
        box.querySelector('.diary').onclick = () => ui.diaryPanel(p);
        box.querySelector('.bye').onclick = (e) => {
          if (e.target.dataset.c !== '1') { e.target.dataset.c = '1'; e.target.textContent = '真的要送走它吗？再点一次'; return; }
          G.pets = G.pets.filter((q) => q !== p);
          PP.diary.add(null, `${p.name}去了新的家。`, 'note');
          ui.closePanel(); PP.save.write();
        };
      };
      render();
      const iv = setInterval(() => { if (!document.body.contains(box)) clearInterval(iv); else if (!box.querySelector('.nm input')) render(); }, 3000);
      ui.panel(`${p.name}的档案`, box);
    },

    overview() {
      if (!G.pets.length) { ui.adopt(); return; }
      const box = $(`<div class="overview"></div>`);
      for (const p of G.pets) {
        const r = $(`<button class="ov"><b>${esc(p.name)}</b><span>${p.moodName}</span><span>${actName(p.action)}</span></button>`);
        r.onclick = () => ui.petPanel(p);
        box.appendChild(r);
      }
      ui.panel('大家的状态', box);
    },

    diaryPanel(only) {
      const keys = Object.keys(G.save.diary).sort();
      let idx = keys.length - 1;
      const box = $(`<div class="diary"><div class="nav"><button class="small prev">‹</button><b class="date"></b><button class="small next">›</button></div><div class="pages"></div></div>`);
      const render = () => {
        const k = keys[idx];
        box.querySelector('.date').textContent = k ? `${k}${k === U.dateKey() ? '（今天）' : ''}` : '还没有日记';
        const pages = box.querySelector('.pages'); pages.innerHTML = '';
        if (!k) return;
        const pets = only ? [only] : G.pets;
        let any = false;
        for (const p of pets) {
          const lines = PP.diary.compose(k, p);
          if (!lines) continue;
          any = true;
          pages.appendChild($(`<div class="page"><h4>${esc(p.name)}的日记</h4>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>`));
        }
        const shared = G.save.diary[k].events.filter((e) => !e.pid && (e.kind === 'egg' || e.kind === 'love' || e.kind === 'note'));
        if (!only && shared.length) { any = true; pages.appendChild($(`<div class="page shared"><h4>这一天</h4>${shared.slice(-8).map((e) => `<p>${PP.timeWord(new Date(e.t))}，${esc(e.text)}</p>`).join('')}</div>`)); }
        if (!any) pages.innerHTML = '<p class="muted">这天它们没写什么。</p>';
        box.querySelector('.prev').disabled = idx <= 0;
        box.querySelector('.next').disabled = idx >= keys.length - 1;
      };
      box.querySelector('.prev').onclick = () => { idx = Math.max(0, idx - 1); render(); };
      box.querySelector('.next').onclick = () => { idx = Math.min(keys.length - 1, idx + 1); render(); };
      render();
      ui.panel(only ? `${only.name}的日记` : '日记', box, { wide: true });
    },

    collectionPanel() {
      const box = $(`<div class="collection"><p class="lead">宠物们送给你的东西。它们足够喜欢你的时候，会去屏幕边上找礼物。</p><div class="shelf"></div></div>`);
      const shelf = box.querySelector('.shelf');
      for (const [k, g] of Object.entries(PP.GIFTS)) {
        const n = G.save.collection[k] || 0;
        const c = $(`<div class="slot ${n ? '' : 'empty'}"><canvas width="48" height="48"></canvas><b>${n ? g.name : '？？？'}</b><span>${n ? `${g.desc}${n > 1 ? ` ×${n}` : ''}` : '还没收到'}</span></div>`);
        if (n) { const ctx = c.querySelector('canvas').getContext('2d'); const [w, h] = PP.SPR.itemSize(k); PP.drawItemWithRim(ctx, k, 24 - w * 2, 24 - h * 2, 4); }
        shelf.appendChild(c);
      }
      ui.panel('收藏柜', box, { wide: true });
    },

    eggPanel() {
      const found = G.save.eggs;
      const box = $(`<div class="eggs"><p class="lead">已发现 ${Object.keys(found).length} / ${Object.keys(PP.EGGS).length}</p><div class="list"></div></div>`);
      const list = box.querySelector('.list');
      for (const [k, e] of Object.entries(PP.EGGS)) {
        list.appendChild($(`<div class="egg ${found[k] ? 'on' : ''}"><b>${found[k] ? '★ ' + esc(e.name) : '？？？'}</b><span>${esc(e.hint)}</span></div>`));
      }
      ui.panel('彩蛋图鉴', box, { wide: true });
    },

    settings() {
      const s = G.save.settings;
      const box = $(`<div class="settings">
        <label>大小 <select class="size"><option value="2">小</option><option value="3">中</option><option value="4">大</option></select></label>
        <label>生活节奏 <select class="pace"><option value="0.6">慢（更贴近真实）</option><option value="1">正常</option><option value="1.6">快</option></select></label>
        <label>名字牌 <select class="names"><option value="hover">鼠标经过时</option><option value="always">一直显示</option></select></label>
        <label>它们怎么称呼你 <input class="owner" maxlength="6" placeholder="主人"></label>
        <label><input type="checkbox" class="sound"> 声音（很小声的叫声和呼噜）</label>
        <label><input type="checkbox" class="care"> 久坐提醒 每 <input class="brk" type="number" min="20" max="240" step="10" style="width:56px"> 分钟</label>
        <label><input type="checkbox" class="quiet"> 勿扰模式（不说话、不来找你）</label>
        ${window.petAPI ? '<label><input type="checkbox" class="autostart"> 开机自动启动</label>' : ''}
        <div class="row"><button class="small reset">清空存档…</button></div></div>`);
      const q = (c) => box.querySelector(c);
      q('.size').value = s.size; q('.pace').value = s.pace; q('.names').value = s.names; q('.owner').value = s.ownerName || '';
      q('.sound').checked = s.sound; q('.care').checked = s.care; q('.quiet').checked = s.quiet; q('.brk').value = s.breakMin;
      q('.size').onchange = (e) => { s.size = +e.target.value; PP.save.soon(); };
      q('.pace').onchange = (e) => { s.pace = +e.target.value; PP.save.soon(); };
      q('.names').onchange = (e) => { s.names = e.target.value; PP.save.soon(); };
      q('.owner').oninput = (e) => { s.ownerName = e.target.value.trim(); PP.save.soon(); };
      q('.sound').onchange = (e) => { s.sound = e.target.checked; if (s.sound) PP.audio.unlock(); PP.save.soon(); };
      q('.care').onchange = (e) => { s.care = e.target.checked; PP.save.soon(); };
      q('.brk').onchange = (e) => { s.breakMin = U.clamp(+e.target.value || 90, 20, 240); PP.save.soon(); };
      q('.quiet').onchange = (e) => { s.quiet = e.target.checked; PP.save.soon(); };
      if (window.petAPI) { const a = q('.autostart'); window.petAPI.getAutostart().then((v) => (a.checked = v)); a.onchange = (e) => window.petAPI.setAutostart(e.target.checked); }
      q('.reset').onclick = (e) => {
        if (e.target.dataset.c !== '1') { e.target.dataset.c = '1'; e.target.textContent = '会删掉所有宠物和日记，再点一次确认'; return; }
        PP.save.reset();
      };
      ui.panel('设置', box);
    },

    notePanel(p) {
      const box = $(`<div class="settings"><label>便签内容 <input class="t" maxlength="14" placeholder="比如：今天要交周报"></label><div class="row"><button class="primary ok">贴上</button></div></div>`);
      const inp = box.querySelector('.t');
      const done = () => { p.d.note = inp.value.trim(); ui.closePanel(); PP.save.soon(); };
      box.querySelector('.ok').onclick = done; inp.onkeydown = (e) => { if (e.key === 'Enter') done(); };
      ui.panel('贴一张便签', box); setTimeout(() => inp.focus(), 50);
    },

    coatPanel(p) {
      const sp = p.d.species, P = PP.SPR.PAL[sp];
      const presets = Object.keys(P).filter((k) => k !== 'shiny');
      const cu = Object.assign({ base: P[presets[0]].base, stripe: P[presets[0]].dark, belly: P[presets[0]].light, pattern: sp === 'cat' ? 'tabby' : 'solid' }, p.d.custom || {});
      const pats = sp === 'cat' ? '<option value="tabby">虎斑</option><option value="mackerel">狸花（白围兜）</option><option value="tux">奶牛（白胸口）</option><option value="point">重点色（暹罗）</option><option value="solid">纯色</option>' : '<option value="solid">默认</option>';
      const box = $(`<div class="coat-ed"><div class="top"><canvas width="144" height="144"></canvas><div class="right">
        <div>现成花色</div><div class="chips"></div>
        <div style="margin-top:8px">或者照着你家的调一个：</div>
        <label>底色 <input type="color" class="base"></label>
        <label>深色/花纹 <input type="color" class="stripe"></label>
        <label>浅色/肚皮 <input type="color" class="belly"></label>
        <label>样式 <select class="pat">${pats}</select></label>
      </div></div><div class="row"><button class="primary ok">就这样</button></div></div>`);
      const cv = box.querySelector('canvas');
      anims.push(() => { const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, 144, 144); PP.SPR.blit(ctx, PP.SPR.drawPet({ species: sp, pal: p.pal, facing: 1, anim: 'idle', t: G.t, eyes: 'open', look: [Math.sin(G.t * 0.8), Math.cos(G.t * 0.6) * 0.6], mouth: 'w', lop: p.d.lop, jelly: { sy: 1 + Math.sin(G.t * 3) * 0.02, sx: 1, skew: 0, sway: 0 } }), 8, 8, 4); });
      const chips = box.querySelector('.chips');
      chips.innerHTML = presets.map((k) => `<button class="chip ${!p.d.custom && p.d.coat === k ? 'on' : ''}" data-k="${k}">${P[k].name}</button>`).join('');
      chips.querySelectorAll('.chip').forEach((b) => (b.onclick = () => { p.d.coat = b.dataset.k; p.d.custom = null; chips.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b)); }));
      const q = (s) => box.querySelector(s);
      q('.base').value = cu.base; q('.stripe').value = cu.stripe; q('.belly').value = cu.belly; q('.pat').value = cu.pattern;
      const upd = () => { p.d.custom = { base: q('.base').value, stripe: q('.stripe').value, belly: q('.belly').value, pattern: q('.pat').value }; chips.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); };
      ['.base', '.stripe', '.belly', '.pat'].forEach((s) => (q(s).oninput = upd));
      q('.ok').onclick = () => { ui.closePanel(); PP.save.soon(); };
      ui.panel(`${p.name}的花色`, box);
    },

    reminders() {
      const s = G.save.settings;
      const box = $(`<div class="settings">
        <label>它怎么叫你 <input class="owner" maxlength="6" placeholder="比如：小王"></label>
        <label>喝水提醒 每 <input type="number" class="water" min="0" max="240" step="5" style="width:64px"> 分钟（0 = 关）</label>
        <label>伸懒腰提醒 每 <input type="number" class="stretch" min="0" max="240" step="5" style="width:64px"> 分钟（0 = 关）</label>
        <label>番茄钟 专注 <input type="number" class="pf" min="5" max="120" style="width:56px"> 分钟，休息 <input type="number" class="pb" min="1" max="60" style="width:56px"> 分钟</label>
        <div><b>每天定时提醒</b></div><div class="list"></div>
        <div class="row"><input class="nt" type="time" value="15:00"><input class="nx" maxlength="16" placeholder="提醒内容，比如：开会"><button class="small add">添加</button></div>
        <div class="muted">提醒时猫会跳出来喵一声，并叫你的名字。番茄钟专注期间不会打扰你。</div>
        ${window.petAPI ? `<div style="margin-top:8px"><b>AI 状态联动（Claude Code）</b></div><div class="muted">把下面这段加到 ~/.claude/settings.json，AI 思考时猫会托腮，做完会跳起来喵一声。</div><textarea class="hook" readonly rows="5" style="width:100%;font-size:11px"></textarea><div class="row"><button class="small copy">复制</button></div>` : ''}
      </div>`);
      const q = (c) => box.querySelector(c);
      q('.owner').value = s.ownerName || ''; q('.water').value = s.rem.water; q('.stretch').value = s.rem.stretch; q('.pf').value = s.pomo.focus; q('.pb').value = s.pomo.brk;
      q('.owner').oninput = (e) => { s.ownerName = e.target.value.trim(); PP.save.soon(); };
      q('.water').onchange = (e) => { s.rem.water = U.clamp(+e.target.value || 0, 0, 240); PP.F.lastWater = Date.now(); PP.save.soon(); };
      q('.stretch').onchange = (e) => { s.rem.stretch = U.clamp(+e.target.value || 0, 0, 240); PP.F.lastStretch = Date.now(); PP.save.soon(); };
      q('.pf').onchange = (e) => { s.pomo.focus = U.clamp(+e.target.value || 25, 5, 120); PP.save.soon(); };
      q('.pb').onchange = (e) => { s.pomo.brk = U.clamp(+e.target.value || 5, 1, 60); PP.save.soon(); };
      const renderList = () => {
        const L = q('.list');
        L.innerHTML = (s.rem.list || []).map((r, i) => `<div class="row" style="margin:2px 0"><label><input type="checkbox" data-i="${i}" ${r.on ? 'checked' : ''}> ${esc(r.time)} ${esc(r.text)}</label><button class="small del" data-i="${i}">删除</button></div>`).join('') || '<div class="muted">还没有</div>';
        L.querySelectorAll('input[type=checkbox]').forEach((c) => (c.onchange = () => { s.rem.list[+c.dataset.i].on = c.checked; PP.save.soon(); }));
        L.querySelectorAll('.del').forEach((b) => (b.onclick = () => { s.rem.list.splice(+b.dataset.i, 1); renderList(); PP.save.soon(); }));
      };
      renderList();
      q('.add').onclick = () => { const t = q('.nt').value, x = q('.nx').value.trim(); if (!t || !x) return; s.rem.list.push({ time: t, text: x, on: true }); q('.nx').value = ''; renderList(); PP.save.soon(); };
      if (window.petAPI) {
        window.petAPI.hookConfig().then((txt) => (q('.hook').value = txt));
        q('.copy').onclick = () => { q('.hook').select(); document.execCommand('copy'); ui.toast('已复制'); };
      }
      ui.panel('提醒 & 番茄钟', box, { wide: true });
    },

    tick() { for (const f of anims) f(); },
  });

  function actName(a) {
    return ({ idle: '发呆', wander: '闲逛', explore: '到处闻闻', eat: '吃饭', drink: '喝水', toilet: '上厕所', sleep: '睡觉', play: '自己玩', cursor_play: '和你玩', seek_user: '想你了', social: '和朋友玩', with: '和朋友玩', alone: '独处', groom: '理毛', bug: '追蝴蝶', ball: '玩球', treat: '吃零食', gift: '找礼物', special: '玩耍', dirty: '嫌弃便便', stash: '藏粮食', knock: '干坏事', petted: '被摸摸', poked: '被戳了', trick: '表演', greet: '迎接你', knead: '陪你打字', kneadSolo: '踩奶', hunt: '狩猎中', agentThink: '陪 AI 一起想', agentDone: '庆祝', rollPaper: '扒卷纸', bigStretch: '伸大懒腰', remindDrink: '提醒你喝水', remind: '提醒你', peekIdle: '偷看', handNap: '在你手心睡觉', lateNight: '催你睡觉', breakCare: '提醒你休息', dance: '跳舞', howl: '对月亮嚎叫', lookUp: '看天上', zoomies: '跑酷', landing: '落地', holiday_food: '过节' })[a] || (a ? '忙' : '发呆');
  }

  function thoughts(p) {
    const n = p.n;
    const lows = Object.entries(n).filter(([k, v]) => v < 35).map(([k]) => k);
    const map = { hunger: 'bowl', thirst: 'drop', bladder: 'poop', energy: 'zzz', fun: 'ball', social: 'heart', battery: 'cloud' };
    if (p.sleeping && p.d.memories.length) { p.think(U.pick(p.d.memories), 3); PP.events.found('dream'); return; }
    if (lows.length) p.think(map[U.pick(lows)], 3);
    else { p._forceSay = true; PP.events.musing(p); p._forceSay = false; }
  }

  function dropTreat(x, sprite) {
    PP.addItem({ type: 'treat', x: U.clamp(x, 30, G.W - 30), y: G.ground - 220, data: { sprite } });
  }
  function throwBall(x, y) {
    const old = PP.findItem('ball'); if (old) old.dead = true;
    PP.addItem({ type: 'ball', x: U.clamp(x, 30, G.W - 30), y, vx: U.rand(-300, 300), vy: -200 });
  }
  PP.throwBall = throwBall;

  function drawPaw(cv) {
    const ctx = cv.getContext('2d');
    const rows = ['.kk...kk.', '.kk...kk.', '.........', 'kk.kkk.kk', '..kkkkk..', '..kkkkk..', '...kkk...'];
    ctx.fillStyle = '#111';
    rows.forEach((r, j) => [...r].forEach((c, i) => { if (c === 'k') ctx.fillRect(i * 1.5 + 0.2, j * 1.6, 1.5, 1.6); }));
  }

  // ---------- 声音（WebAudio 合成，默认关闭） ----------
  let ac = null;
  PP.audio = {
    unlock() { if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } },
    chirp(p) {
      if (!G.save.settings.sound) return;
      PP.audio.unlock(); if (!ac) return;
      const o = ac.createOscillator(), g = ac.createGain();
      const f0 = p.sp.pitch * U.rand(0.9, 1.1);
      o.type = 'triangle'; o.frequency.setValueAtTime(f0, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(f0 * U.rand(1.15, 1.5), ac.currentTime + 0.08);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.8, ac.currentTime + 0.22);
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.05, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.25);
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.3);
    },
    meow(p, sad) {
      if (!G.save.settings.sound) return;
      PP.audio.unlock(); if (!ac) return;
      // 合成一声“喵”：音高先升后降，加一点颤音
      const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      const base = sad ? 520 : 640 + Math.random() * 80;
      o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.4;
      o.frequency.setValueAtTime(base * 0.8, t0);
      o.frequency.linearRampToValueAtTime(base * 1.35, t0 + 0.12);
      o.frequency.linearRampToValueAtTime(base * (sad ? 0.7 : 0.95), t0 + 0.45);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.connect(f).connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + 0.55);
    },
    purr(p) {
      if (!G.save.settings.sound || p.d.species !== 'cat') return;
      PP.audio.unlock(); if (!ac) return;
      const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = 55; lfo.frequency.value = 24; lg.gain.value = 0.02;
      lfo.connect(lg).connect(g.gain);
      g.gain.value = 0.015;
      o.connect(g).connect(ac.destination); o.start(); lfo.start(); o.stop(ac.currentTime + 0.5); lfo.stop(ac.currentTime + 0.5);
    },
    pour() {
      if (!G.save.settings.sound) return;
      PP.audio.unlock(); if (!ac) return;
      for (let i = 0; i < 5; i++) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'square'; o.frequency.value = U.rand(900, 1600);
        const t = ac.currentTime + i * 0.05;
        g.gain.setValueAtTime(0.012, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.05);
      }
    },
  };
})();
