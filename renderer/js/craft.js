// 加工工坊（0.38）：古城之池东边的一座木棚子。按真实的做法把岛上的东西加工成别的东西——
//   钓鱼用的饵：堆肥箱里翻蚯蚓、玉米面揉面团、玉米粒泡蜂蜜、卷心菜叶揉团、用柴刻小拟饵；
//   吃的：草莓熬果酱、向日葵盘里抠瓜子炒香；
//   留种：熟透的南瓜、西瓜、番茄掏出籽晒干，下一季接着种；
//   送礼：郁金香倒挂晾成干花束。
(function () {
  const PP = (window.PP = window.PP || {});
  const E = () => PP.econ.E();
  const ITEMS_ADD = {
    bait_worm: { kind: 'bait', name: '蚯蚓', icon: 'seed', desc: '钓鱼饵：几乎什么鱼都吃，鲶鱼、黄颡鱼、泥鳅最爱', bait: 'worm' },
    bait_dough: { kind: 'bait', name: '面团', icon: 'bread', desc: '钓鱼饵：鲫鱼、鳑鲏、金鱼、樱花鱼爱吃', bait: 'dough' },
    bait_corn: { kind: 'bait', name: '蜜玉米粒', icon: 'corn', desc: '钓鱼饵：鲤鱼、锦鲤、金鳞鲤闻着就来', bait: 'sweetcorn' },
    bait_leaf: { kind: 'bait', name: '菜叶团', icon: 'leaf', desc: '钓鱼饵：草鱼专吃这个', bait: 'leaf' },
    bait_lure: { kind: 'bait', name: '木头小拟饵', icon: 'fish', desc: '钓鱼饵：追小鱼的鳜鱼、虹鳟会扑上来；一个能用 8 次', bait: 'lure' },
    jam: { kind: 'snack', name: '草莓果酱', icon: 'berry', xp: 70, aff: 3, hunger: 30, desc: '自己熬的果酱，+70 经验，好感涨' },
    seeds: { kind: 'snack', name: '炒瓜子', icon: 'seed', xp: 18, aff: 1, hunger: 10, desc: '向日葵籽炒的，嗑着玩，+18 经验' },
    dryflower: { kind: 'crop', name: '干花束', icon: 'flower', xp: 30, aff: 4, desc: '郁金香晾的干花，送给它好感大涨' },
  };
  /* 配方：in 用掉什么（背包里的东西；fuel 是石炉的柴），out 得到什么，cd 冷却（分钟，堆肥里的蚯蚓要等它们再钻出来），t 做多久（秒） */
  const RECIPES = [
    { id: 'worm', icon: '🪱', name: '翻堆肥找蚯蚓', in: {}, out: { bait_worm: 4 }, cd: 20, t: 2, how: '菜园的烂菜叶都倒进这个堆肥箱，翻一翻就有蚯蚓' },
    { id: 'dough', icon: '🥣', name: '揉面团', in: { corn: 1 }, out: { bait_dough: 5 }, t: 3, how: '玉米磨成面，加水揉成小团' },
    { id: 'sweetcorn', icon: '🌽', name: '泡蜜玉米粒', in: { corn: 1, honeyjar: 1 }, out: { bait_corn: 6 }, t: 3, how: '剥下玉米粒，用蜂蜜泡着' },
    { id: 'leaf', icon: '🥬', name: '揉菜叶团', in: { cabbage: 1 }, out: { bait_leaf: 5 }, t: 2, how: '卷心菜叶撕碎揉成团' },
    { id: 'lure', icon: '🐟', name: '刻小拟饵', in: { fuel: 8 }, out: { bait_lure: 1 }, t: 4, how: '挑一根柴，刻成小鱼的样子、涂上颜色' },
    { id: 'jam', icon: '🍓', name: '熬草莓果酱', in: { berry: 3, fuel: 4 }, out: { jam: 1 }, t: 4, how: '草莓加蜂蜜在小炉子上慢慢熬' },
    { id: 'seeds', icon: '🌻', name: '炒瓜子', in: { sunflower: 1, fuel: 2 }, out: { seeds: 4 }, t: 3, how: '从向日葵花盘里抠出籽，炒香' },
    { id: 'pseed', icon: '🎃', name: '南瓜留种', in: { pumpkin: 1 }, out: { s_pumpkin: 3 }, t: 2, how: '熟透的南瓜掏出籽，洗净晒干' },
    { id: 'mseed', icon: '🍉', name: '西瓜留种', in: { melon: 1 }, out: { s_melon: 3 }, t: 2, how: '吃剩的西瓜籽晒干' },
    { id: 'tseed', icon: '🍅', name: '番茄留种', in: { tomato: 2 }, out: { s_tomato: 3 }, t: 2, how: '番茄籽连着瓤泡几天再晾干' },
    { id: 'dry', icon: '💐', name: '晾干花束', in: { tulip: 2 }, out: { dryflower: 1 }, t: 2, how: '郁金香倒挂在棚子梁上晾干' },
  ];
  const fuelNow = () => { const f = E().fort; return f ? f.fuel : 0; };
  const nameOf = (k) => (k === 'fuel' ? '柴' : (PP.econ.ITEMS[k] || {}).name || k);
  function lack(r) { const e = E(), out = []; for (const k in r.in) { const n = r.in[k], have = k === 'fuel' ? fuelNow() : e.bag[k] || 0; if (have < n) out.push(nameOf(k) + (k === 'fuel' ? '' : ' ×' + (n - have))); } const cd = cdLeft(r); if (cd > 0) out.push(Math.ceil(cd) + ' 分钟后才有新的蚯蚓'); return out; }
  function cdLeft(r) { if (!r.cd) return 0; const t = (E().craftT || {})[r.id] || 0; return (t + r.cd * 60000 - Date.now()) / 60000; }
  function make(r) {
    if (lack(r).length) return false; const e = E();
    for (const k in r.in) { if (k === 'fuel') { if (e.fort) e.fort.fuel = Math.max(0, e.fort.fuel - r.in[k]); } else PP.econ.give(k, -r.in[k]); }
    for (const k in r.out) { PP.econ.give(k, r.out[k]); if (k === 'bait_lure') e.lureUses = (e.lureUses || 0) + 8 * r.out[k]; }
    if (r.cd) { e.craftT = e.craftT || {}; e.craftT[r.id] = Date.now(); }
    PP.save && PP.save.soon && PP.save.soon(); return true;
  }
  const outText = (r) => Object.keys(r.out).map((k) => nameOf(k) + ' ×' + r.out[k]).join('、'), inText = (r) => Object.keys(r.in).length ? Object.keys(r.in).map((k) => nameOf(k) + (k === 'fuel' ? ' ' + r.in[k] : ' ×' + r.in[k])).join(' + ') : '不用材料';
  function install() { if (!PP.econ || !PP.econ.ITEMS) return setTimeout(install, 50); Object.assign(PP.econ.ITEMS, ITEMS_ADD); }
  install();
  PP.CRAFT = { RECIPES, lack, make, outText, inText, cdLeft };
})();
