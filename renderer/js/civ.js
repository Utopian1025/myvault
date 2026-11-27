// 浮岛文明（0.41）：浮岛是一个微缩的人类社会，要靠自己活下去。按现实世界的规律：
//   · 守恒：吃的、水、柴都不会凭空冒出来——吃的要种、要钓、要采；水靠屋顶接雨存进水窖；柴靠捡枯枝、修剪树枝；
//   · 消耗：住在岛上的每一位每天都要吃、要喝，天冷还要烧柴取暖；没了就饿、就渴、就冷；
//   · 腐烂（熵）：新鲜的东西会坏，天越热坏得越快；熏、腌、晒、做成果酱才放得住；地窖、陶罐、冰窖能让东西坏得慢；
//   · 地力：同一块地一直种会把土种薄，收成越来越差；歇一歇、堆肥能养回来，换着种（轮作）收得更多；
//   · 知识：很多本事岛上原来没有，要去别的地方（风景）看、派伙伴去探险，才学得会——学会了岛就更能自给自足。
// 每天按现实的日子结算一次（没开的那些天在 ecology.js 补算时一起算），正在玩的时候也随时在消耗、在坏。
(function () {
  const PP = (window.PP = window.PP || {});
  const E = () => PP.econ.E(), G = () => PP.G;
  /* 知识：在哪儿学（风景的 id），学会了能干什么 */
  const KNOW = {
    smoke: { name: '烟熏', where: ['forest'], how: '在温带森林看见猎人的小木屋里挂着熏肉', does: '工坊里能把鲜鱼熏成熏鱼，放几个月都不坏' },
    drying: { name: '晒鱼干', where: ['sea', 'beach'], how: '在海边看见渔家把鱼剖开晾在竹架上', does: '晴天能把鲜鱼晒成鱼干' },
    salt: { name: '晒盐和腌制', where: ['beach'], how: '在海岸看见盐田里一格格的白盐', does: '探险能从海边带回盐；能做咸鱼、腌菜' },
    ferment: { name: '发酵', where: ['jungle', 'lake'], how: '雨林里的人把菜叶埋进坛子里，几天后酸香扑鼻', does: '能把卷心菜做成能放很久的酸菜' },
    mill: { name: '石磨', where: ['mountain'], how: '高山村子里的水磨坊把谷子磨成面', does: '玉米能磨成面粉，再烤成饼' },
    pottery: { name: '陶罐', where: ['cave', 'desert'], how: '洞穴里的老陶窑、沙漠集市上一排排陶罐', does: '东西装进陶罐，坏得慢一半' },
    icehouse: { name: '冰窖', where: ['snow', 'antarctic'], how: '冰原上的人冬天切冰块，埋在地窖里用到夏天', does: '冬天自动存冰，夏天地窖里的东西坏得慢很多' },
    rotation: { name: '轮作', where: ['meadow', 'farm'], how: '草原上的农人今年种这个、明年换那个', does: '一块地换着种不同的菜，收成多两成' },
    compost: { name: '堆肥养地', where: ['farm', 'forest'], how: '农场的堆肥坑，落叶和菜渣烂成黑土', does: '工坊能翻堆肥养地，把种薄了的菜地养回来' },
    cistern: { name: '集雨水窖', where: ['savanna', 'desert'], how: '干旱的地方家家都有大水窖接雨', does: '水窖从 400 升扩到 1500 升' },
    drip: { name: '滴灌', where: ['desert'], how: '沙漠里的人用竹管一滴一滴地浇', does: '浇一次地只用 1.5 升水（原来 5 升）' },
    stocking: { name: '放养鱼苗', where: ['lake'], how: '湖泊湿地的渔人春天往湖里撒鱼苗', does: '池里的鱼长回来快一倍' },
    almanac: { name: '节气', where: ['academy'], how: '魔法学院的书里写着二十四节气什么时候种什么', does: '顺着季节种菜，收成多一成半' },
    logshroom: { name: '段木种菇', where: ['undergrove'], how: '地底森林的倒木上长满了蘑菇', does: '岛上的倒木每周能收一次蘑菇' },
  };
  /* 每样吃的有多少「顿」（1 顿 = 一位居民半天的口粮）、会不会坏、一天坏多少（热天） */
  const FOOD = { carrot: [1, 0.03], berry: [0.6, 0.15], corn: [1.4, 0.01], tomato: [0.8, 0.08], cabbage: [1.2, 0.03], pumpkin: [2.5, 0.01], melon: [2, 0.04], apple: [0.6, 0.03], henegg: [0.8, 0.06], honeyjar: [1, 0], mushroom: [0.6, 0.2], fish_fresh: [1.5, 0.5], smoked_fish: [1.5, 0], dried_fish: [1.2, 0], salted_fish: [1.5, 0], pickle: [0.8, 0], flour: [1.5, 0.005], flatbread: [1.4, 0.1], jam: [1.2, 0], seeds: [0.4, 0], biscuit: [0.6, 0], jerky: [1, 0], tuna: [1.5, 0], cake: [1.5, 0.15], treefruit: [2, 0.05] };
  const ADD_ITEMS = {
    fish_fresh: { kind: 'snack', name: '鲜鱼', icon: 'fish', xp: 30, hunger: 35, desc: '刚钓上来的鱼，很鲜——但热天一两天就坏，要尽快吃、或者熏、晒、腌起来' },
    smoked_fish: { kind: 'snack', name: '熏鱼', icon: 'fish', xp: 40, hunger: 40, desc: '柴火熏过的鱼，放几个月都不坏' },
    dried_fish: { kind: 'snack', name: '鱼干', icon: 'fish', xp: 30, hunger: 30, desc: '晴天晒干的鱼，不坏' },
    salted_fish: { kind: 'snack', name: '咸鱼', icon: 'fish', xp: 35, hunger: 40, desc: '盐腌的鱼，不坏' },
    salt: { kind: 'crop', name: '盐', icon: 'drop', desc: '从海边带回来的盐，腌东西用（岛上不产盐）' },
    pickle: { kind: 'snack', name: '酸菜', icon: 'leaf', xp: 20, hunger: 25, desc: '坛子里发酵的卷心菜，放一冬都不坏' },
    flour: { kind: 'crop', name: '玉米面', icon: 'corn', desc: '石磨磨的玉米面，能烤饼、揉面团' },
    flatbread: { kind: 'snack', name: '玉米饼', icon: 'bread', xp: 35, hunger: 45, desc: '玉米面烤的饼，顶饱' },
  };
  const DEP = { carrot: 0.12, berry: 0.1, corn: 0.22, tomato: 0.15, cabbage: 0.18, pumpkin: 0.2, melon: 0.25, sunflower: 0.18, tulip: 0.08 }; // 每种菜收一茬，把地力吃掉多少
  const FAMILY = { carrot: 'root', berry: 'berry', corn: 'grain', tomato: 'night', cabbage: 'leaf', pumpkin: 'gourd', melon: 'gourd', sunflower: 'flower', tulip: 'flower' };
  const SEASONAL = { spring: ['carrot', 'cabbage', 'berry', 'tulip'], summer: ['tomato', 'corn', 'melon', 'sunflower'], autumn: ['pumpkin', 'cabbage', 'carrot'], winter: ['cabbage'] };
  const PLACE = { forest: '温带森林', jungle: '热带雨林', beach: '海岸', sea: '珊瑚礁', lake: '湖泊湿地', mountain: '高山', cave: '洞穴', desert: '沙漠', snow: '北极冰原', antarctic: '南极', meadow: '温带草原', savanna: '稀树草原', farm: '农场', academy: '魔法学院', undergrove: '地底森林' };
  function st() { const e = E(); if (!e.civ) e.civ = { know: {}, seen: {}, water: 300, ice: 0, soil: {}, last: {}, made: [], ate: [], buy: [], logT: 0 }; return e.civ; }
  const has = (k) => !!st().know[k];
  const note = (m) => PP.ECO && PP.ECO.note(m);
  function learn(k, via) { const s = st(); if (s.know[k] || !KNOW[k]) return false; s.know[k] = Date.now(); note(`学会了「${KNOW[k].name}」——${KNOW[k].how}。${KNOW[k].does}`); PP.ui && PP.ui.toast(`🎓 学会了「${KNOW[k].name}」：${KNOW[k].does}`, 4); PP.save && PP.save.soon && PP.save.soon(); return true; }
  /* 谁住在岛上（每天要吃要喝的） */
  function residents() { return (G().all || []).filter((p) => p.d && !p.d.wild); } // 主角和认养的伙伴都住在浮岛上
  const cap = () => (has('cistern') ? 1500 : 400);
  /* 统计：最近 7 天自己产的（顿）和买的 */
  function tally(kind, n) { const s = st(), d = Math.floor(Date.now() / 86400000), L = s[kind]; const last = L[L.length - 1]; if (last && last[0] === d) last[1] += n; else L.push([d, n]); while (L.length && L[0][0] < d - 7) L.shift(); }
  const sum7 = (kind) => st()[kind].reduce((a, [, n]) => a + n, 0);
  /* 每天结算（ecology.js 的 step 里调）：喝水、取暖、腐烂、地力恢复、冰窖存冰、离线时伙伴自己吃饭 */
  function day(dt, T, rain, snow, m, live, mm) {
    const s = st(), e = E(), R = residents(), n = Math.max(1, R.length);
    // 水：屋顶接雨（约 40 平方米，下 1 毫米 = 1 升/平方米，收得到八成），热天水窖蒸发一点；每位每天喝、做饭用 2 升
    const rainMM = mm != null ? mm : rain ? 10 : snow ? 4 : 0; s.water = Math.max(0, Math.min(cap(), s.water + rainMM * 40 * 0.8 * dt - n * 2 * dt - (T > 25 ? s.water * 0.005 * dt : 0)));
    // 柴：天冷要烧火取暖（每低 1 度多烧一点）
    const f = e.fort; if (f && T < 12) f.fuel = Math.max(0, f.fuel - (12 - T) * 0.5 * dt);
    // 冰窖：会这门手艺的话，冬天冻得结实的日子自动切冰存起来；夏天慢慢化
    if (has('icehouse')) { if (T < -2) s.ice = Math.min(100, s.ice + 8 * dt); else if (T > 10) s.ice = Math.max(0, s.ice - (T - 10) * 0.25 * dt); }
    // 腐烂：越热坏得越快；地窖里本来就凉一点，陶罐、冰窖更慢
    const heat = T < 5 ? 0.25 : T < 15 ? 0.5 : T < 25 ? 1 : 1.5, keep = 0.75 * (has('pottery') ? 0.55 : 1) * (s.ice > 5 && T > 10 ? 0.35 : 1); let rot = [];
    for (const k in FOOD) { const q = e.bag[k] || 0, r = FOOD[k][1]; if (!q || !r) continue; s.rotAcc = s.rotAcc || {}; s.rotAcc[k] = (s.rotAcc[k] || 0) + q * r * heat * keep * dt; const lose = Math.min(q, Math.floor(s.rotAcc[k])); if (lose > 0) { s.rotAcc[k] -= lose; PP.econ.give(k, -lose); rot.push(PP.econ.ITEMS[k].name + ' ' + lose); } }
    if (rot.length && (live || dt >= 1)) note('天' + (T > 25 ? '热' : '暖') + '，放坏了：' + rot.join('、') + (has('pottery') ? '' : '（学会做陶罐、冰窖能放得久些；熏、晒、腌过的不会坏）'));
    // 地力：没种东西的地慢慢恢复（休耕）
    for (let i = 0; i < 6; i++) { if (!(e.farm || [])[i]) s.soil[i] = Math.min(1, (s.soil[i] == null ? 1 : s.soil[i]) + 0.008 * dt); }
    // 不在的时候：大家自己从存粮里拿东西吃（每位每天两顿）；吃不上就饿着
    if (!live) { let need = n * 2 * dt; const order = Object.keys(FOOD).filter((k) => e.bag[k] > 0).sort((a, b) => FOOD[b][1] - FOOD[a][1]); const ate = []; for (const k of order) { while (need > 0 && e.bag[k] > 0) { PP.econ.give(k, -1); need -= FOOD[k][0]; ate.push(k); } if (need <= 0) break; } if (ate.length) tally('ate', ate.reduce((a, k) => a + FOOD[k][0], 0)); if (need > 0.5) { s.hungry = (s.hungry || 0) + 1; for (const p of R) { p.n.hunger = Math.max(0, p.n.hunger - 20); } } }
    // 段木种菇：岛上的倒木每周出一次蘑菇
    if (has('logshroom') && PP.ECO) { const dead = (PP.ECO.st().grove || []).filter((g) => g.dead).length; if (dead && Math.random() < dt / 7) { PP.econ.give('mushroom', dead); note(`倒木上的蘑菇冒出来了，收了 ${dead} 朵`); } }
  }
  /* 正在玩的时候：伙伴饿了、渴了就自己去拿吃的、去水窖打水（不再是凭空吃饱） */
  function liveTick() {
    const s = st(), e = E(); for (const p of residents()) { if (!p.n) continue;
      if (p.n.hunger < 35) { const order = Object.keys(FOOD).filter((k) => e.bag[k] > 0).sort((a, b) => FOOD[b][1] - FOOD[a][1]); if (order.length) { PP.econ.feedItem(p, order[0]); tally('ate', FOOD[order[0]][0]); } }
      if (p.n.thirst < 35 && s.water >= 1) { s.water -= 0.5; p.n.thirst = Math.min(100, p.n.thirst + 40); } }
    // 在看哪个风景：待满 3 分钟，就从那儿学会一门本事
    try { const S = G().save.settings; if (S.dest || (S.mode === 'band' && PP.scene)) { const v = S.dest || PP.scene.view(); s.seen[v] = (s.seen[v] || 0) + 1; if (s.seen[v] >= 3) for (const k in KNOW) if (KNOW[k].where.includes(v) && learn(k)) break; } } catch (er) {}
  }
  /* 探险回来：从去的地方学本事、带回当地的东西（海边带盐） */
  function onTrip(p, t, rew) { rew.extra = rew.extra || []; for (const k in KNOW) if (KNOW[k].where.includes(t.to) && !has(k)) { learn(k); rew.extra.push('学会了「' + KNOW[k].name + '」'); break; } if (t.to === 'beach' || t.to === 'sea') { const n = 2 + Math.floor(Math.random() * 3); PP.econ.give('salt', n); rew.extra.push('盐 ×' + n); } }
  /* 菜地：地力、轮作、节气 → 收成倍数 */
  function soil(i) { const v = st().soil[i]; return v == null ? 1 : v; }
  function yieldK(i, crop) { const s = st(), k = 0.45 + 0.55 * soil(i), rot = has('rotation') && s.last[i] && FAMILY[s.last[i]] !== FAMILY[crop] ? 1.2 : 1, se = PP.ECO ? PP.ECO.seasonOf(new Date().getMonth()) : 'summer', alm = has('almanac') && (SEASONAL[se] || []).includes(crop) ? 1.15 : 1; return k * rot * alm; }
  function onHarvest(i, crop, n) { const s = st(); s.soil[i] = Math.max(0.1, soil(i) - (DEP[crop] || 0.15)); s.last[i] = crop; tally('made', n * ((FOOD[crop] || [1])[0])); }
  function waterCost() { return has('drip') ? 1.5 : 5; }
  function useWater(L) { const s = st(); if (s.water < L) return false; s.water -= L; return true; }
  function compost() { const s = st(); for (let i = 0; i < 6; i++) s.soil[i] = Math.min(1.15, soil(i) + 0.35); note('翻了堆肥，把黑土撒到菜地里：每块地的地力都养回来一些'); }
  function prune() { const eco = PP.ECO && PP.ECO.st(), G2 = (eco && eco.grove) || [], big = G2.filter((g) => g.on && g.age > 6); if (!big.length) return 0; const g = big[Math.floor(Math.random() * big.length)]; g.age = Math.max(4, g.age - 0.4); const n = Math.round(4 + big.length * 0.6); const f = E().fort; if (f) f.fuel = Math.min(100, f.fuel + n); return n; }
  function selfRate() { const made = sum7('made') + 0.01, ate = sum7('ate'), buy = sum7('buy'); return { made, ate, buy, rate: Math.min(1, made / Math.max(made + buy, ate, 0.01)) }; }
  /* 面板「浮岛文明」 */
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bar = (k, col) => `<i class="pbar" style="width:90px"><i style="width:${Math.round(Math.max(0, Math.min(1, k)) * 100)}%;background:${col}"></i></i>`;
  function html() {
    const s = st(), e = E(), R = residents(), n = Math.max(1, R.length), meals = Object.keys(FOOD).reduce((a, k) => a + (e.bag[k] || 0) * FOOD[k][0], 0), days = meals / (n * 2), sr = selfRate(), fuel = e.fort ? e.fort.fuel : 0, sc = (k) => PLACE[k] || k;
    const perish = Object.keys(FOOD).filter((k) => e.bag[k] > 0 && FOOD[k][1] > 0.05).map((k) => PP.econ.ITEMS[k].name + ' ' + e.bag[k]);
    return `<div class="sec">浮岛文明</div>
      <p>浮岛是一个微缩的小社会，要靠自己活下去：吃的要种、要钓、要采，水靠屋顶接雨存进水窖，柴靠捡和修剪；新鲜东西会坏，地会种薄；很多本事要去别的地方看了、学了才会。</p>
      <div class="ecorow"><b>住在岛上：${n} 位</b>（${R.map((p) => esc(p.name)).join('、') || '—'}）　每天要吃 ${n * 2} 顿、喝 ${n * 2} 升水${fuel != null ? '，天冷还要烧柴' : ''}</div>
      <div class="ecorow">存粮 ${bar(days / 14, days < 2 ? '#e0604a' : '#7ab85a')} 够吃 <b>${days < 1 ? '不到一天' : Math.floor(days) + ' 天'}</b>${perish.length ? `　<small>会坏的：${esc(perish.join('、'))}</small>` : ''}</div>
      <div class="ecorow">水窖 ${bar(s.water / cap(), '#5aa8d8')} ${Math.round(s.water)} / ${cap()} 升 <small>屋顶接雨：下 10 毫米能存 300 多升；浇一次地 ${waterCost()} 升</small></div>
      <div class="ecorow">柴堆 ${bar(fuel / 100, '#c8a84a')} ${Math.round(fuel)} <small>暴风雨吹断的枯枝、修剪林子的树枝（工坊）</small>${has('icehouse') ? `　冰窖 ${bar(s.ice / 100, '#a8d8f0')}` : ''}</div>
      <div class="ecorow">最近 7 天：自己产出 ${Math.round(sr.made)} 顿、吃掉 ${Math.round(sr.ate)} 顿、从货郎那买 ${Math.round(sr.buy)} 件　<b>自给率 ${Math.round(sr.rate * 100)}%</b></div>
      <div class="sec2">菜地的地力</div><div class="ecorow">${[0, 1, 2, 3, 4, 5].map((i) => `${i + 1} 号 ${bar(soil(i) / 1.15, soil(i) < 0.5 ? '#c08040' : '#7a5a3a')}`).join('　')}<br><small>同一块地一直种会变薄（收成少），空着歇一歇会慢慢恢复；学会「堆肥养地」能在工坊翻堆肥养回来；学会「轮作」后换着种收成多两成。</small></div>
      <div class="sec2">学会的本事（${Object.keys(s.know).length} / ${Object.keys(KNOW).length}）</div>
      <div class="ecorow">${Object.keys(KNOW).map((k) => { const K = KNOW[k]; return s.know[k] ? `✓ <b>${K.name}</b>：${esc(K.does)}` : `<span class="muted">？ ${K.name}——去${K.where.map(sc).join('或')}看看（在那个风景待一会儿，或者派伙伴去探险）</span>`; }).join('<br>')}</div>`;
  }
  function init() { if (!PP.econ || !G().save || !PP.ECO) return setTimeout(init, 400); st(); Object.assign(PP.econ.ITEMS, ADD_ITEMS); if (PP.econTabs && !PP.econTabs.some((t) => t.k === 'civ')) PP.econTabs.push({ k: 'civ', n: '浮岛文明', html: () => html() }); setInterval(() => { try { liveTick(); } catch (er) {} }, 60000); }
  setTimeout(init, 900);
  PP.CIV = { PLACE, KNOW, FOOD, st, has, learn, day, onTrip, yieldK, onHarvest, waterCost, useWater, compost, prune, soil, selfRate, tally, html, residents };
})();
