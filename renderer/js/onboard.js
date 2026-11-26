// 第一次玩的引导：一张一直挂着的小卡片（可以关掉），跟着你的进度走三步
//   1. 指着一只野生动物：点它 → 认养
//   2. 认养以后：它是你的伙伴了，摸摸它、拖着它走
//   3. 它的新家是浮岛：带你去看看
// 做完（或关掉）就不再出现；进度记在存档 flags.onboard 里
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  let card = null, timer = 0, target = null, pet = null;
  const F = () => G.save.flags || (G.save.flags = {});
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function show(html, buttons) {
    if (!card) { card = document.createElement('div'); card.className = 'guide'; document.getElementById('ui').appendChild(card);
      card.addEventListener('mousedown', (e) => e.stopPropagation());
      card.addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (!b) return; const a = b.dataset.g; if (a === 'close') finish(true); else if (a === 'castle') { finish(); PP.setView && PP.setView('isle'); setTimeout(() => PP.ui.toast('这是你的浮岛：左上角那列小按钮能剖开看每一层、进房间；按 F 用主角的眼睛走进去', 6), 1500); } else if (a === 'next') go(3); }); }
    card.innerHTML = `<button class="x" data-g="close" title="不用引导了">×</button><div class="t">${html}</div>${buttons || ''}<i class="arrow"></i>`;
    place();
  }
  // 卡片跟着指着的那只动物（在它头顶上方）；没有就放在右下角场景上面
  function place() {
    if (!card) return;
    const w = card.offsetWidth || 260, h = card.offsetHeight || 90;
    let x, y, arrow = true;
    const p = target && G.pets.includes(target) ? target : null;
    if (p) { x = p.x - w / 2; y = p.y - 40 * G.S * (p.scaleMul || 1) - h - 14; }
    else { x = G.W - w - 40; y = G.H * 0.45; arrow = false; }
    x = U.clamp(x, 8, G.W - w - 8); y = U.clamp(y, 8, G.H - h - 60);
    card.style.left = Math.round(x) + 'px'; card.style.top = Math.round(y) + 'px';
    card.classList.toggle('noarrow', !arrow);
    if (p) card.style.setProperty('--ax', Math.round(U.clamp(p.x - x, 16, w - 16)) + 'px');
  }
  function go(step) {
    F().onboard = step; PP.save.soon();
    if (step === 1) {
      // 找一只看得见、离你近、性格温和的野生动物
      const cand = G.pets.filter((p) => p.d.wild && !p.inDen && !p.isleHide && p.x > 0 && p.x < G.W);
      target = cand.sort((a, b) => b.x - a.x)[0] || null;
      show(`<b>欢迎来到桌面乌托邦！</b><br>这里住着很多野生动物。${target ? `右键点这只<b>${esc(target.sp.name)}</b>` : '右键点一只你喜欢的动物'}，选「❤ 认养」，给它取个名字吧。`);
    } else if (step === 2) {
      target = pet;
      show(`<b>${esc(pet ? pet.name : '它')}现在是你的伙伴了！</b><br>它会一直陪着你。试试：鼠标在它身上来回蹭蹭（摸摸）、按住拖着它走、双击它。`, '<div class="row"><button class="primary small" data-g="next">知道了，下一步</button></div>');
    } else if (step === 3) {
      target = pet;
      show(`<b>它的新家在浮岛</b><br>浮岛里有菜园、厨房、卧室……它会在家里过日子。右键它或者左下角的爪子，能打开所有功能（番茄钟、提醒、商店、地图）。`, '<div class="row"><button class="primary small" data-g="castle">带我去浮岛看看</button><button class="small" data-g="close">以后再说</button></div>');
    }
  }
  function finish(skipped) { F().onboard = 9; PP.save.soon(); clearInterval(timer); timer = 0; if (card) { card.remove(); card = null; } target = null; PP.refreshInteractive && PP.refreshInteractive(); if (skipped) PP.ui.toast('好的，有需要可以右键动物或者点左下角的爪子', 2.5); }
  PP.onboard = {
    // 开机时调用：还没认养过、没做完引导 → 从第 1 步开始
    start() { const f = F(); if ((f.onboard || 0) >= 9 || PP.mine().length) { if (!f.onboard) f.onboard = 9; return; } setTimeout(() => { go(1); timer = setInterval(() => { if (F().onboard === 1 && (!target || !G.pets.includes(target))) go(1); else place(); }, 250); }, 1500); },
    step(ev, p) { if ((F().onboard || 0) >= 9 || !card) return; if (ev === 'adopted') { pet = p; go(2); } },
    active: () => !!card,
  };
})();
