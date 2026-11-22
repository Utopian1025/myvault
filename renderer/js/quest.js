// 每日委托：每天早上信箱里来三张小委托（钓鱼、收菜、浇水、捡蛋……），做完领小鱼干和小礼物。
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U;
  const KINDS = [
    { k: 'fish', n: [2, 4], t: (n) => `钓 ${n} 条鱼`, who: '湖边的老钓手', fish: 6 },
    { k: 'rare', n: [1, 1], t: () => '钓到一条稀有的鱼（★★★ 以上）', who: '图鉴收藏家', fish: 15, gift: 'tuna' },
    { k: 'harvest', n: [1, 2], t: (n) => `收获 ${n} 次菜`, who: '隔壁岛的厨师', fish: 6 },
    { k: 'water', n: [3, 5], t: (n) => `给菜浇 ${n} 次水`, who: '种子铺老板', fish: 4, gift: 's_carrot' },
    { k: 'egg', n: [1, 2], t: (n) => `去鸟巢捡 ${n} 个蛋`, who: '面包店', fish: 5 },
    { k: 'honey', n: [1, 1], t: () => '去蜂箱收一罐蜂蜜', who: '茶馆', fish: 6 },
    { k: 'cook', n: [1, 1], t: () => '在小屋厨房做一次饭', who: '美食杂志', fish: 5 },
    { k: 'feed', n: [1, 2], t: (n) => `亲手喂伙伴吃 ${n} 次东西`, who: '松鼠邮差', fish: 3, gift: 'biscuit' },
    { k: 'pat', n: [3, 6], t: (n) => `摸摸小伙伴 ${n} 次`, who: '你的小伙伴们', fish: 3 },
  ];
  const E = () => PP.econ.E();
  const today = () => new Date().toDateString();
  function list() {
    const e = E();
    if (!e.quest || e.quest.d !== today()) {
      const seed = today().split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
      let r = seed; const rnd = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
      const pool = KINDS.slice(), pick = [];
      while (pick.length < 3 && pool.length) { const i = Math.floor(rnd() * pool.length); const q = pool.splice(i, 1)[0]; const n = q.n[0] + Math.floor(rnd() * (q.n[1] - q.n[0] + 1)); pick.push({ k: q.k, n, got: 0, done: false, claimed: false }); }
      e.quest = { d: today(), list: pick };
    }
    /* 老存档里的「摇老橡树」做不了，换成喂伙伴 */
    for (const q of e.quest.list) if (q.k === 'shake') q.k = 'feed';
    return e.quest.list;
  }
  const meta = (k) => KINDS.find((q) => q.k === k);
  /* 新手任务：一步一步带你认识玩法（喂 → 种 → 摸 → 探险），每步给经验，做完正好能出门 */
  const STARTER = [
    { k: 'feed', n: 1, t: '亲手喂伙伴一次（背包里有饼干）', go: 'feed' },
    { k: 'plant', n: 1, t: '在城堡菜地种下一颗种子（背包里有胡萝卜种子）', go: 'water' },
    { k: 'pat', n: 3, t: '摸摸伙伴 3 次（鼠标在它身上来回蹭）', go: 'pat' },
    { k: 'trip', n: 1, t: '派伙伴出门探险一次（「出门玩 → 探险」）', go: 'trip' },
  ];
  const st = () => { const e = E(); if (!e.starter) e.starter = { i: (PP.mine && PP.mine().length && e.activeMin > 60) ? 9 : 0, got: 0 }; return e.starter; };
  function starterOn(kind) {
    const s0 = st(), q = STARTER[s0.i]; if (!q || q.k !== kind) return;
    s0.got++; if (s0.got < q.n) return;
    s0.i++; s0.got = 0;
    const p = PP.F && PP.F.main && PP.F.main(); const pet = p && !p.d.wild ? p : (PP.mine && PP.mine()[0]);
    if (pet) PP.econ.addXp(pet, 25); PP.econ.addFish(3, '新手任务');
    if (s0.i >= STARTER.length) { PP.econ.give('egg', 1); PP.ui.toast('新手任务全部完成！送你一颗「神秘蛋」：在背包里点「孵蛋」，20 分钟后会出来一只新伙伴', 'gift'); }
    else PP.ui.toast(`新手任务完成一步（+25 经验 +3 小鱼干）。下一步：${STARTER[s0.i].t}`, 'gift');
    PP.econ.badge && PP.econ.badge();
  }
  function starterHtml() {
    const s0 = st(), q = STARTER[s0.i]; if (!q) return '';
    return `<div class="sec">新手任务 ${s0.i + 1}/${STARTER.length}</div><div class="quest starter"><b>${q.t}</b><small>每完成一步：伙伴 +25 经验、3 小鱼干；全部做完送一颗神秘蛋</small><div class="xpbar"><i style="width:${Math.min(100, (s0.got / q.n) * 100)}%"></i></div><span>${s0.got}/${q.n}</span><button class="small" data-qgo="${q.go}">${q.go === 'trip' ? '去探险页' : GO[q.go] || '带我去'}</button></div>`;
  }
  function on(kind, data) {
    try { starterOn(kind); } catch (e) {}
    try {
      for (const q of list()) {
        if (q.done) continue;
        const hit = q.k === kind || (q.k === 'rare' && kind === 'fish' && data && data.rare >= 3);
        if (!hit) continue;
        q.got++; if (q.got >= q.n) { q.done = true; PP.ui.toast(`委托完成：${meta(q.k).t(q.n)}（去「成长 → 出门玩 → 委托」领奖励）`, 'gift'); PP.econ.badge && PP.econ.badge(); }
      }
      PP.save && PP.save.soon && PP.save.soon();
    } catch (e) {}
  }
  const todo = () => { try { return list().filter((q) => q.done && !q.claimed).length; } catch (e) { return 0; } };
  const GO = { fish: '带我去钓鱼', rare: '带我去钓鱼', harvest: '带我去菜地', water: '带我去菜地', egg: '带我去鸟巢', honey: '带我去蜂箱', cook: '带我去厨房', pat: '怎么摸？', feed: '怎么喂？' };
  function html() {
    const L = list();
    return `${starterHtml()}<div class="sec">今天的委托</div><p class="muted">每天早上换三张新的。做完点「领取」。</p>${L.map((q, i) => { const m = meta(q.k); return `<div class="quest ${q.done ? 'done' : ''} ${q.claimed ? 'claimed' : ''}"><b>${m.t(q.n)}</b><small>来自 ${m.who} · 奖励 ${m.fish} 小鱼干${m.gift && PP.econ.ITEMS[m.gift] ? ' + ' + PP.econ.ITEMS[m.gift].name : ''}</small><div class="xpbar"><i style="width:${Math.min(100, (q.got / q.n) * 100)}%"></i></div><span>${Math.min(q.got, q.n)}/${q.n}</span>${q.claimed ? '<i class="ok">已领取</i>' : q.done ? `<button class="small primary" data-claim="${i}">领取</button>` : `<button class="small" data-qgo="${q.k}">${GO[q.k] || '带我去'}</button>`}</div>`; }).join('')}`;
  }
  function bind(root, rerender) {
    root.querySelectorAll('[data-qgo]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation(); const k = b.dataset.qgo;
      if (k === 'pat') { PP.ui.toast('鼠标放在伙伴身上，左右来回蹭几下就是摸摸它（右键它选「摸摸」也行）', 5); return; }
      if (k === 'feed') { PP.ui.toast('在「背包」里点吃的旁边的「喂」，或者右键伙伴选「喂…」', 5); PP.econ.openPanel('bag'); return; }
      if (k === 'trip') { PP.econ.openPanel('trip'); return; }
      PP.ui.closePanel && PP.ui.closePanel(); PP.isle && PP.isle.questGo && PP.isle.questGo(k === 'rare' ? 'fish' : k);
    }));
    root.querySelectorAll('[data-claim]').forEach((b) => b.addEventListener('click', () => {
      const q = list()[+b.dataset.claim]; if (!q || !q.done || q.claimed) return;
      const m = meta(q.k); q.claimed = true; PP.econ.addFish(m.fish, '委托奖励'); if (m.gift && PP.econ.ITEMS[m.gift]) PP.econ.give(m.gift, 1);
      PP.save && PP.save.soon && PP.save.soon(); rerender && rerender(); PP.econ.badge && PP.econ.badge();
    }));
  }
  PP.quest = { on, todo, html, bind, list, starter: () => STARTER[st().i] || null };
})();
