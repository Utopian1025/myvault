// 钓鱼图鉴：小岛鱼塘里能钓到的鱼。不同季节、时段、天气出现的鱼不一样，越稀有越难钓。
// 每种鱼都有自己的“效果”：加心情、加体力、加经验、让菜长得快、好运气（更容易钓到稀有的）、夜里引来萤火虫、放进屋里的鱼缸……
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  // rare: 1 常见 / 2 少见 / 3 稀有 / 4 传说；when: day / night / dawn（清晨 5~8 点）/ dusk（傍晚 17~19 点）；season 空 = 四季都有；rain = 下雨天更多
  // look: [身体, 肚子, 鳍, 花纹类型, 形状] 形状：n 普通 / r 圆 / l 长 / e 鳗 / p 河豚 / c 虾 / b 靴子 / o 瓶子
  const FISH = [
    { id: 'crucian', name: '小鲫鱼', rare: 1, size: [8, 16], look: ['#9aa8a0', '#d8dccc', '#7a8a84', '', 'n'], eff: 'gold', n: 1, say: '最常见的小鱼，煎着吃香香的', tip: '一年四季都有' },
    { id: 'minnow', name: '麦穗鱼', rare: 1, size: [5, 9], when: 'day', look: ['#b8a878', '#e8e0c4', '#8a7a58', 'dot', 'l'], eff: 'fun', n: 6, say: '白天在浅水里一群一群地游', tip: '白天' },
    { id: 'bitterling', name: '鳑鲏', rare: 1, size: [4, 7], season: ['spring', 'summer'], look: ['#a8b8c8', '#f0d0d8', '#e07a8a', 'stripe', 'r'], eff: 'fun', n: 8, say: '身上有一抹粉色，像害羞的小姑娘', tip: '春天、夏天' },
    { id: 'loach', name: '泥鳅', rare: 1, size: [10, 18], rain: 1, look: ['#8a7a5a', '#c8b88a', '#6a5a3a', 'dot', 'e'], eff: 'grow', n: 10, say: '滑溜溜的，钻进菜地里松了松土', tip: '下雨天多' },
    { id: 'crayfish', name: '小龙虾', rare: 1, size: [8, 12], season: ['summer'], look: ['#d8483a', '#f08a6a', '#a8302a', '', 'c'], eff: 'cook', n: 1, say: '夏天的夜宵！做成了一份小龙虾', tip: '夏天' },
    { id: 'medaka', name: '青鳉', rare: 1, size: [3, 4], look: ['#c8d8c0', '#f4f4e8', '#9ab0a0', '', 'n'], eff: 'tank', say: '小小一条，放进屋里的鱼缸了', tip: '一年四季都有' },
    { id: 'boot', name: '旧靴子', rare: 1, size: [25, 30], look: ['#6a4a34', '#8a6a4a', '#3a2a20', '', 'b'], eff: 'junk', say: '……这是谁的靴子？', tip: '运气不好的时候' },
    { id: 'carp', name: '鲤鱼', rare: 2, size: [25, 50], look: ['#c8a050', '#f0d890', '#b07830', 'scale', 'n'], eff: 'energy', n: 40, say: '有劲儿的大鲤鱼，吃了浑身是力气', tip: '一年四季都有' },
    { id: 'grass', name: '草鱼', rare: 2, size: [30, 60], season: ['summer', 'autumn'], look: ['#8a9a5a', '#d8dca8', '#6a7a3a', '', 'l'], eff: 'xp', n: 60, say: '吃水草长大的，很有营养', tip: '夏天、秋天' },
    { id: 'yellowcat', name: '黄颡鱼', rare: 2, size: [12, 22], when: 'night', look: ['#d8a838', '#f0d070', '#6a4a20', 'band', 'n'], eff: 'xp', n: 40, say: '晚上出来，会“嘎嘎”地叫', tip: '晚上' },
    { id: 'mandarin', name: '鳜鱼', rare: 2, size: [20, 35], season: ['spring'], look: ['#a8a060', '#e8e0b0', '#5a5030', 'spot', 'n'], eff: 'cook', n: 2, say: '桃花流水鳜鱼肥，做成了两罐鱼罐头', tip: '春天' },
    { id: 'goldfish', name: '金鱼', rare: 2, size: [6, 12], look: ['#f08a2a', '#ffc070', '#f06a3a', '', 'r'], eff: 'tank', say: '拖着大尾巴，放进鱼缸了', tip: '一年四季都有' },
    { id: 'puffer', name: '河豚', rare: 2, size: [10, 18], season: ['summer'], look: ['#c8c070', '#f8f4d8', '#8a8040', 'spot', 'p'], eff: 'puff', n: 20, say: '一碰就鼓成一个球，把大家都逗笑了', tip: '夏天' },
    { id: 'catfish', name: '鲶鱼', rare: 2, size: [30, 70], when: 'night', rain: 1, look: ['#5a5a6a', '#9a9aa8', '#3a3a48', '', 'l'], eff: 'grow', n: 30, say: '大胡子鲶鱼，翻了翻塘底的泥，菜长得更快了', tip: '晚上、下雨天' },
    { id: 'trout', name: '虹鳟', rare: 3, size: [25, 45], season: ['autumn', 'winter'], when: 'dawn', look: ['#8aa0a8', '#f0e8e0', '#e07a8a', 'rainbow', 'l'], eff: 'funAll', n: 20, say: '身上一道彩虹，大家看了都好开心', tip: '秋冬的清晨' },
    { id: 'glowfish', name: '萤光鱼', rare: 3, size: [6, 10], when: 'night', look: ['#6ad8c8', '#d8fff8', '#3aa8a0', 'glow', 'n'], eff: 'glow', n: 30, say: '会发光的小鱼！今晚浮岛上飞满了萤火虫', tip: '晚上' },
    { id: 'koi', name: '锦鲤', rare: 3, size: [30, 60], look: ['#f4f0e8', '#ffffff', '#e04a3a', 'koi', 'n'], eff: 'luck', n: 30, say: '锦鲤！接下来半小时运气超好', tip: '一年四季都有，很少见' },
    { id: 'icefish', name: '冰鱼', rare: 3, size: [8, 14], season: ['winter'], look: ['#d8eef8', '#ffffff', '#a8d0e8', 'clear', 'l'], eff: 'energyAll', n: 50, say: '透明得像冰一样，大家都精神了', tip: '冬天' },
    { id: 'sakura', name: '樱花鱼', rare: 3, size: [8, 14], season: ['spring'], when: 'day', look: ['#f4b8c8', '#fff0f4', '#e88aa8', 'petal', 'r'], eff: 'petal', n: 25, say: '花瓣一样的鱼，浮岛下了一场花瓣雨', tip: '春天的白天' },
    { id: 'bottle', name: '漂流瓶', rare: 3, size: [20, 22], look: ['#9ad4c8', '#e8fff8', '#5a8a7a', '', 'o'], eff: 'letter', n: 8, say: '瓶子里有一封信！', tip: '偶尔会漂过来' },
    { id: 'goldcarp', name: '金鳞鲤', rare: 4, size: [40, 80], when: 'dawn', look: ['#f0c030', '#fff0a0', '#d89020', 'scale', 'n'], eff: 'gold', n: 30, say: '传说中的金鳞鲤！闪闪发光', tip: '传说：清晨' },
    { id: 'mooneel', name: '月光鳗', rare: 4, size: [60, 100], when: 'night', look: ['#3a4a8a', '#a8b8f0', '#d8e0ff', 'glow', 'e'], eff: 'xpGlow', n: 150, say: '月光一样的鳗鱼，游过的地方都亮了', tip: '传说：深夜' },
  ];
  const BY = Object.fromEntries(FISH.map((f) => [f.id, f]));
  /* 0.38 鱼饵和咬钩：每种鱼爱吃什么饵（like 很爱、ok 也吃），从游过来到咬钩要多久（wait 秒）、先试探着啄几下（nib）、
     真咬住的时候给你多长时间收竿（win 秒）——鲤鱼谨慎、要啄好几下；虹鳟、鳜鱼是一口猛冲；小龙虾慢吞吞夹住不放 */
  const BAIT = {
    worm: { name: '蚯蚓', item: 'bait_worm' }, blood: { name: '红虫', item: 'bait_blood' }, shrimp: { name: '小河虾', item: 'bait_shrimp' }, hopper: { name: '蚱蜢', item: 'bait_hopper' }, cricket: { name: '蟋蟀', item: 'bait_cricket' },
    duck: { name: '浮萍', item: 'bait_duck' }, minnow: { name: '活麦穗鱼', item: 'bait_minnow' }, dough: { name: '面团', item: 'bait_dough' }, sweetcorn: { name: '蜜玉米粒', item: 'bait_corn' }, leaf: { name: '菜叶团', item: 'bait_leaf' }, lure: { name: '木头小拟饵', item: 'bait_lure' }, jerky: { name: '肉干', item: 'jerky' },
  };
  /* 每种鱼爱吃什么（第一个最爱）：按真的食性——鲫鱼杂食、鲤鱼爱甜香、草鱼吃草、鳜鱼只吃活鱼虾、虹鳟追水面的虫子、鲶鱼黄颡夜里找荤的 */
  const PREF = { crucian: ['dough', 'blood', 'worm'], minnow: ['blood', 'worm', 'dough'], bitterling: ['dough', 'blood'], loach: ['worm', 'blood'], crayfish: ['jerky', 'shrimp'], medaka: ['blood', 'dough'], boot: [], carp: ['sweetcorn', 'dough', 'worm'], grass: ['leaf', 'duck', 'hopper'], yellowcat: ['worm', 'shrimp', 'minnow'], mandarin: ['minnow', 'shrimp', 'lure'], goldfish: ['blood', 'dough'], puffer: ['shrimp', 'jerky'], catfish: ['minnow', 'worm', 'jerky'], trout: ['hopper', 'cricket', 'lure'], glowfish: ['blood', 'worm'], koi: ['sweetcorn', 'dough'], icefish: ['blood', 'worm'], sakura: ['dough', 'blood'], bottle: [], goldcarp: ['sweetcorn'], mooneel: ['minnow', 'worm'] };
  const BITE = { crucian: [3, 8, 2, 1.3], minnow: [2, 5, 3, 0.9], bitterling: [3, 7, 2, 1.0], loach: [4, 10, 1, 1.4], crayfish: [6, 14, 2, 3.0], medaka: [2, 6, 3, 0.8], boot: [6, 12, 0, 2.5], carp: [10, 24, 4, 1.5], grass: [8, 18, 3, 1.4], yellowcat: [5, 12, 2, 1.2], mandarin: [5, 12, 0, 0.8], goldfish: [4, 9, 2, 1.2], puffer: [5, 11, 3, 1.3], catfish: [8, 20, 2, 1.8], trout: [2, 6, 0, 0.7], glowfish: [4, 9, 2, 1.0], koi: [12, 26, 4, 1.4], icefish: [4, 9, 1, 1.0], sakura: [4, 9, 2, 1.0], bottle: [8, 16, 0, 2.5], goldcarp: [15, 30, 5, 1.2], mooneel: [12, 26, 2, 1.6] };
  /* 这一竿：按鱼饵挑一条鱼（爱吃的 ×4，也吃的 ×1.5，不对胃口的 ×0.25；空钩只有很少的鱼来、来得也慢） */
  function rollBait(bait) { const P = pool().map(([f, w]) => { const pr = PREF[f.id] || []; let k = !bait ? (f.eff === 'junk' ? 2 : 0.35) : pr[0] === bait ? 4 : pr.includes(bait) ? 1.5 : pr.length ? 0.25 : 0.6; if (bait === 'lure' && !pr.includes('lure')) k *= 0.3; return [f, w * k * (PP.ECO ? PP.ECO.fishK(f.id) : 1)]; }).filter(([, w]) => w > 0); /* 水里这种鱼多不多也算进去（钓得多了会少） */ const tot = P.reduce((a, [, w]) => a + w, 0); let r = Math.random() * tot; for (const [f, w] of P) if ((r -= w) <= 0) return f; return P[0][0]; }
  const RARE = ['', '常见', '少见', '稀有', '传说'], RCOL = ['', '#8a9a8a', '#4a90c8', '#a060c8', '#e0a020'];
  const E = () => PP.econ.E();
  const D = () => { const e = E(); e.dex = e.dex || {}; return e.dex; };
  function phase() { const h = new Date().getHours(); return h >= 5 && h < 8 ? 'dawn' : h >= 17 && h < 19 ? 'dusk' : h >= 19 || h < 5 ? 'night' : 'day'; }
  function season() { try { return (PP.env && PP.env.at && PP.env.at('forest').season) || 'summer'; } catch (e) { return 'summer'; } }
  function raining() { try { const f = PP.env.at('forest').fx; return (f.rain || 0) > 0.2 || (f.storm || 0) > 0; } catch (e) { return false; } }
  const lucky = () => (E().luckUntil || 0) > Date.now();
  // 现在能钓到哪些、各自的机会
  function pool() {
    const ph = phase(), se = season(), rn = raining(), L = lucky();
    return FISH.map((f) => {
      if (f.season && !f.season.includes(se)) return [f, 0];
      if (f.when && f.when !== ph && !(f.when === 'night' && ph === 'dusk')) return [f, 0];
      let w = [0, 30, 10, 2.6, 0.5][f.rare];
      if (f.rain && rn) w *= 3;
      if (f.id === 'boot') w = L ? 1 : 6;
      if (L && f.rare >= 3) w *= 2.5;
      return [f, w];
    }).filter(([, w]) => w > 0);
  }
  function roll() { const P = pool(), tot = P.reduce((a, [, w]) => a + w, 0); let r = Math.random() * tot; for (const [f, w] of P) if ((r -= w) <= 0) return f; return P[0][0]; }

  // ---------- 鱼的样子（像素小图，画一次存起来） ----------
  const cache = {};
  function sprite(id, unknown) {
    const k = id + (unknown ? '?' : ''); if (cache[k]) return cache[k];
    const f = BY[id], [body, belly, fin, pat, shape] = f.look, W = 22, H = 12, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), px = [];
    const set = (x, y, col) => { if (x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = col; };
    const cx = 10, cy = 6;
    if (shape === 'b') { // 靴子
      for (let y = 1; y < 9; y++) for (let x = 6; x < 11; x++) set(x, y, body); for (let y = 7; y < 11; y++) for (let x = 6; x < 17; x++) set(x, y, y === 10 ? fin : body); for (let x = 7; x < 10; x++) set(x, 2, belly);
    } else if (shape === 'o') { // 瓶子
      for (let y = 3; y < 10; y++) for (let x = 4; x < 15; x++) set(x, y, (y === 4 && x < 13) ? belly : body); for (let y = 5; y < 8; y++) for (let x = 15; x < 18; x++) set(x, y, body); set(18, 6, '#a8784a'); set(18, 5, '#a8784a'); for (let x = 6; x < 11; x++) set(x, 7, '#f4ead8');
    } else if (shape === 'c') { // 虾
      for (let i = 0; i < 12; i++) { const a = i / 11, x = 4 + i, y = Math.round(7 - Math.sin(a * 3) * 2); set(x, y, body); set(x, y + 1, i % 3 ? body : fin); set(x, y - 1, i > 7 ? body : null); }
      set(16, 3, body); set(17, 2, body); set(16, 2, fin); set(15, 4, body); set(15, 3, '#2a1a20'); set(3, 7, fin); set(2, 6, fin); set(2, 8, fin);
    } else {
      const rx = shape === 'e' ? 9 : shape === 'l' ? 8 : shape === 'r' ? 5.5 : shape === 'p' ? 5.5 : 7, ry = shape === 'e' ? 1.6 : shape === 'l' ? 2.4 : shape === 'r' ? 3.6 : shape === 'p' ? 4.6 : 3;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy > 1) continue;
        let col = dy > 0.25 ? belly : body;
        if (pat === 'stripe' && Math.abs(dy) < 0.25 && dx > -0.7) col = fin;
        if (pat === 'band' && (x % 4 === 0) && dy < 0.3) col = fin;
        if (pat === 'dot' && (x * 7 + y * 3) % 5 === 0 && dy < 0.4) col = fin;
        if (pat === 'spot' && (x * 5 + y * 11) % 7 === 0) col = fin;
        if (pat === 'scale' && (x + y) % 2 === 0 && dy < 0.3) col = PP.DIO ? PP.DIO.shade(body, 0.86) : body;
        if (pat === 'rainbow' && Math.abs(dy) < 0.35) col = dx < -0.3 ? '#e07a8a' : dx < 0.2 ? '#f0b060' : '#8ac0e0';
        if (pat === 'koi' && ((x * 3 + y * 5) % 9 < 3) && dy < 0.5) col = fin;
        if (pat === 'petal' && (x + y * 2) % 5 === 0) col = '#ffffff';
        if (pat === 'clear' && dx > -0.5 && dx < 0.5 && Math.abs(dy) < 0.4) col = '#f4fbff';
        if (pat === 'glow' && dy < 0 && x % 3 === 0) col = belly;
        set(x, y, col);
      }
      // 尾巴、背鳍、眼睛
      const tx = Math.round(cx - rx);
      if (shape !== 'e') for (let k = 0; k < 4; k++) { set(tx - k, cy - 1 - k, fin); set(tx - k, cy + k, fin); if (k < 3) set(tx - k, cy, fin); }
      else { set(tx, cy, fin); set(tx - 1, cy, fin); }
      if (shape !== 'p') for (let k = -2; k <= 1; k++) set(cx + k, Math.round(cy - ry) - 1, fin);
      if (shape === 'p') for (let a = 0; a < 10; a++) { const t = a * 0.63; set(Math.round(cx + Math.cos(t) * (rx + 1)), Math.round(cy + Math.sin(t) * (ry + 1)), fin); }
      const ex = Math.round(cx + rx * 0.55), ey = Math.round(cy - ry * 0.25); set(ex, ey, '#ffffff'); set(ex + 1, ey, '#1a1420');
    }
    // 描边（外面一圈深色）+ 没钓到过的是黑影
    const out = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!px[y * W + x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => px[(y + b) * W + x + a] && x + a >= 0 && x + a < W)) out.push([x, y]);
    for (const [x, y] of out) set(x, y, unknown ? '#3a3448' : PP.DIO ? PP.DIO.shade(fin, 0.5) : '#2a2026');
    for (let i = 0; i < W * H; i++) if (px[i]) { c.fillStyle = unknown ? '#3a3448' : px[i]; c.fillRect(i % W, (i / W) | 0, 1, 1); }
    return (cache[k] = cv);
  }

  // ---------- 钓到以后 ----------
  function apply(f, p, size) {
    const e = E(), main = p || (PP.F && PP.F.main()), all = G.pets.filter((q) => !q.d.wild);
    const fx = (icon, n = 6) => { if (!main) return; for (let i = 0; i < n; i++) PP.fx({ x: main.x + U.rand(-24, 24) * G.S, y: main.y - U.rand(10, 36) * G.S, vy: -U.rand(16, 40), icon, life: 1.2, s: 1 }); };
    switch (f.eff) {
      case 'gold': PP.econ.addFish(f.n + (f.rare >= 4 ? 0 : 0), `钓到${f.name}`); if (f.rare >= 4) { e.luckUntil = Date.now() + 20 * 60000; fx('sparkle', 10); } break;
      case 'fun': if (main) main.n.fun = Math.min(100, main.n.fun + f.n); fx('note', 3); break;
      case 'funAll': for (const q of all) q.n.fun = Math.min(100, q.n.fun + f.n); fx('heart', 6); break;
      case 'energy': if (main) main.n.energy = Math.min(100, main.n.energy + f.n); fx('sparkle', 4); break;
      case 'energyAll': for (const q of all) q.n.energy = Math.min(100, q.n.energy + f.n); fx('sparkle', 8); break;
      case 'xp': if (main) PP.econ.addXp(main, f.n); break;
      case 'xpGlow': if (main) PP.econ.addXp(main, f.n); e.glowUntil = Date.now() + 40 * 60000; fx('sparkle', 12); break;
      case 'grow': (e.farm || []).forEach((pl) => { if (pl && pl.t0) pl.t0 -= f.n * 60000; }); fx('sparkle', 4); break;
      case 'cook': PP.econ.give('tuna', f.n); break;
      case 'tank': { e.tank = (e.tank || []).filter((x) => BY[x]); e.tank.push(f.id); if (e.tank.length > 6) e.tank.shift(); break; }
      case 'puff': for (const q of all) q.n.fun = Math.min(100, q.n.fun + f.n); if (main) { main.think('heart', 1.5); } break;
      case 'luck': e.luckUntil = Date.now() + 30 * 60000; fx('sparkle', 8); break;
      case 'glow': e.glowUntil = Date.now() + 40 * 60000; fx('sparkle', 6); break;
      case 'petal': e.petalUntil = Date.now() + 10 * 60000; for (const q of all) q.n.fun = Math.min(100, q.n.fun + f.n); break;
      case 'letter': PP.econ.addFish(f.n, '漂流瓶里夹着小鱼干'); if (PP.econ.mail) PP.econ.mail('漂流瓶', U.pick(['你好呀，捡到这个瓶子的人！我在很远很远的海边，今天看到了好大的月亮。', '不知道这封信会漂到哪里。祝你每天都有好吃的。', '如果你看到这封信，请替我摸摸你的小动物。'])); break;
      case 'junk': break;
    }
  }
  const fmtEff = {
    gold: (f) => `换 ${f.n} 条小鱼干${f.rare >= 4 ? '，接下来 20 分钟好运' : ''}`, fun: (f) => `主角心情 +${f.n}`, funAll: (f) => `所有小伙伴心情 +${f.n}`, energy: (f) => `主角体力 +${f.n}`, energyAll: (f) => `所有小伙伴体力 +${f.n}`,
    xp: (f) => `主角经验 +${f.n}`, xpGlow: (f) => `经验 +${f.n}，浮岛上萤火虫飞 40 分钟`, grow: (f) => `菜地里的菜提前 ${f.n} 分钟长好`, cook: (f) => `得到 ${f.n} 个鱼罐头（放进背包）`, tank: () => '放进小屋的鱼缸里养着',
    puff: (f) => `大家被逗笑，心情 +${f.n}`, luck: () => '30 分钟内更容易钓到稀有的鱼', glow: () => '今晚浮岛上飞满萤火虫（40 分钟）', petal: (f) => `下一场花瓣雨，大家心情 +${f.n}`, letter: (f) => `${f.n} 条小鱼干 + 一封漂流来的信`, junk: () => '没什么用……但也算一种收藏',
  };
  // 钓到：记进图鉴、给效果、弹一张小卡片
  function caught(p, forced) {
    const f = forced || roll(), d = D(), size = Math.round(U.rand(f.size[0], f.size[1])), rec = d[f.id] || { n: 0, best: 0, first: Date.now() }, isNew = !rec.n;
    /* 0.40 罕见的个体：每条鱼都是独一无二的，偶尔会钓到金色的、白化的、特别大的（世界本来就有这样的随机） */
    let vr = null; if (PP.ECO && f.eff !== 'junk' && f.look[4] !== 'o') { const r = PP.ECO.rng(); vr = r < 0.012 ? 'gold' : r < 0.025 ? 'albino' : r < 0.05 ? 'giant' : null; }
    const size2 = vr === 'giant' ? Math.round(size * 1.7) : size; if (vr) { rec.vars = rec.vars || {}; rec.vars[vr] = (rec.vars[vr] || 0) + 1; }
    rec.n++; if (size2 > rec.best) rec.best = size2; d[f.id] = rec; if (PP.ECO) PP.ECO.caught(f.id); f._var = vr; f._size = size2;
    apply(f, p, size2);
    if (PP.econ && f.eff !== 'junk' && f.eff !== 'tank' && f.id !== 'bottle') { PP.econ.give('fish_fresh', 1); if (PP.CIV) PP.CIV.tally('made', 1.5); } /* 0.41 钓上来的鱼也是吃的（鲜鱼，会坏） */
    card(f, size2, isNew, size2 >= rec.best && rec.n > 1, vr);
    PP.save && PP.save.soon && PP.save.soon();
    if (PP.quest) PP.quest.on('fish', f);
    return f;
  }
  let cardEl = null, cardT = 0;
  function card(f, size, isNew, record, vr) {
    if (cardEl) cardEl.remove(); clearTimeout(cardT);
    cardEl = document.createElement('div'); cardEl.className = 'fishcard r' + f.rare;
    cardEl.innerHTML = `<canvas width="264" height="144" style="width:132px;height:72px"></canvas><div><b>${f.name}</b>${vr ? `<i class="new">罕见！${({ gold: '金色个体', albino: '白化个体', giant: '巨型个体' })[vr]}</i>` : isNew ? '<i class="new">新！</i>' : record ? '<i class="new">最大纪录</i>' : ''}<small style="color:${RCOL[f.rare]}">${'★'.repeat(f.rare)} ${RARE[f.rare]} · ${size} 厘米</small><p>${f.say}</p><small class="eff">${fmtEff[f.eff](f)}</small></div>`;
    const cvv = cardEl.querySelector('canvas'); if (vr === 'gold') cvv.style.filter = 'sepia(1) saturate(3) hue-rotate(-12deg) brightness(1.15)'; else if (vr === 'albino') cvv.style.filter = 'grayscale(1) brightness(1.45) sepia(.25) hue-rotate(-30deg)'; const c = cvv.getContext('2d'); c.drawImage(PP.AQUA ? PP.AQUA.paint(f.id, 264, 144) : sprite(f.id), 0, 0, 264, 144);
    document.getElementById('ui').appendChild(cardEl); requestAnimationFrame(() => cardEl && cardEl.classList.add('in'));
    cardT = setTimeout(() => { if (cardEl) { cardEl.classList.remove('in'); const el = cardEl; setTimeout(() => el.remove(), 300); cardEl = null; } }, isNew ? 6500 : 4500);
  }
  // 图鉴页面（背包里的「钓鱼」那一页）
  function html() {
    const d = D(), got = FISH.filter((f) => d[f.id]).length;
    const L = lucky() ? `<span class="good">好运中：还有 ${Math.ceil((E().luckUntil - Date.now()) / 60000)} 分钟</span>` : '';
    return `<div class="sec">钓鱼图鉴 ${got}/${FISH.length} ${L}</div><p class="muted">在浮岛的鱼塘钓鱼（点鱼塘，咬钩时点一下浮漂帮它收竿）。不同季节、时间、天气能钓到的鱼不一样。现在：${({ dawn: '清晨', day: '白天', dusk: '傍晚', night: '晚上' })[phase()]} · ${({ spring: '春', summer: '夏', autumn: '秋', winter: '冬' })[season()] || ''}${raining() ? ' · 下雨' : ''}</p>
      <div class="fishdex">${FISH.map((f) => { const r = d[f.id]; return `<div class="fd ${r ? '' : 'unk'}" title="${r ? f.say : '还没钓到过'}"><canvas data-fish="${f.id}" data-unk="${r ? '' : 1}" width="200" height="110" style="width:100px;height:55px"></canvas><b>${r ? f.name : '？？？'}</b><small style="color:${RCOL[f.rare]}">${'★'.repeat(f.rare)}</small><small>${r ? `钓到 ${r.n} 次 · 最大 ${r.best} 厘米` : f.tip}</small>${r ? `<small class="eff">${fmtEff[f.eff](f)}</small>` : ''}</div>`; }).join('')}</div>`;
  }
  function bind(root) { root.querySelectorAll('canvas[data-fish]').forEach((cv) => { const c = cv.getContext('2d'); if (PP.AQUA) c.drawImage(PP.AQUA.paint(cv.dataset.fish, cv.width, cv.height, { dark: !!cv.dataset.unk }), 0, 0); else { c.imageSmoothingEnabled = false; c.drawImage(sprite(cv.dataset.fish, !!cv.dataset.unk), 0, 0, cv.width, cv.height); } }); }
  PP.FISHDEX = { FISH, BY, BAIT, PREF, BITE, rollBait, caught, html, bind, sprite, lucky, phase, pool };
})();
