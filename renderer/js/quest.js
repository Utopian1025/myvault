// 每日委托：每天早上信箱里来三张小委托（钓鱼、收菜、浇水、捡蛋……），做完领小鱼干和小礼物。
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U;
  const KINDS = [
    { k: 'fish', n: [2, 4], t: (n) => `钓 ${n} 条鱼`, who: '湖边的老钓手', fish: 6 },
    { k: 'rare', n: [1, 1], t: () => '钓到一条稀有的鱼（★★★ 以上）', who: '图鉴收藏家', fish: 15, gift: 'tuna' },
    { k: 'harvest', n: [1, 2], t: (n) => `收获 ${n} 次菜`, who: '隔壁岛的厨师', fish: 6 },
    { k: 'water', n: [3, 5], t: (n) => `给菜浇 ${n} 次水`, who: '种子铺老板', fish: 4, gift: 's_carrot' },
    { k: 'egg', n: [1, 2], t: (n) => `去鸡舍捡 ${n} 个鸡蛋`, who: '面包店', fish: 5 },
    { k: 'honey', n: [1, 1], t: () => '去蜂箱收一罐蜂蜜', who: '茶馆', fish: 6 },
    { k: 'cook', n: [1, 1], t: () => '在小屋厨房做一次饭', who: '美食杂志', fish: 5 },
    { k: 'shake', n: [1, 2], t: (n) => `摇 ${n} 次老橡树`, who: '松鼠邮差', fish: 3, gift: 'biscuit' },
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
    return e.quest.list;
  }
  const meta = (k) => KINDS.find((q) => q.k === k);
  function on(kind, data) {
    try {
      for (const q of list()) {
        if (q.done) continue;
        const hit = q.k === kind || (q.k === 'rare' && kind === 'fish' && data && data.rare >= 3);
        if (!hit) continue;
        q.got++; if (q.got >= q.n) { q.done = true; PP.ui.toast(`委托完成：${meta(q.k).t(q.n)}（去「背包 → 委托」领奖励）`, 'gift'); PP.econ.badge && PP.econ.badge(); }
      }
      PP.save && PP.save.soon && PP.save.soon();
    } catch (e) {}
  }
  const todo = () => { try { return list().filter((q) => q.done && !q.claimed).length; } catch (e) { return 0; } };
  function html() {
    const L = list();
    return `<div class="sec">今天的委托</div><p class="muted">每天早上换三张新的。做完点「领取」。</p>${L.map((q, i) => { const m = meta(q.k); return `<div class="quest ${q.done ? 'done' : ''} ${q.claimed ? 'claimed' : ''}"><b>${m.t(q.n)}</b><small>来自 ${m.who} · 奖励 ${m.fish} 小鱼干${m.gift && PP.econ.ITEMS[m.gift] ? ' + ' + PP.econ.ITEMS[m.gift].name : ''}</small><div class="xpbar"><i style="width:${Math.min(100, (q.got / q.n) * 100)}%"></i></div><span>${Math.min(q.got, q.n)}/${q.n}</span>${q.claimed ? '<i class="ok">已领取</i>' : q.done ? `<button class="small primary" data-claim="${i}">领取</button>` : ''}</div>`; }).join('')}`;
  }
  function bind(root, rerender) {
    root.querySelectorAll('[data-claim]').forEach((b) => b.addEventListener('click', () => {
      const q = list()[+b.dataset.claim]; if (!q || !q.done || q.claimed) return;
      const m = meta(q.k); q.claimed = true; PP.econ.addFish(m.fish, '委托奖励'); if (m.gift && PP.econ.ITEMS[m.gift]) PP.econ.give(m.gift, 1);
      PP.save && PP.save.soon && PP.save.soon(); rerender && rerender(); PP.econ.badge && PP.econ.badge();
    }));
  }
  PP.quest = { on, todo, html, bind, list };
})();
