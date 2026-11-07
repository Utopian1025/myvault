// 存档 + 离线推演（关掉电脑，它们的生活也在继续）
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const KEY = 'pixelpets.save.v1';
  const api = window.petAPI;

  function fresh() {
    return {
      v: 1, savedAt: Date.now(),
      settings: { size: 2, pace: 1, sound: true, quiet: false, care: false, breakMin: 90, names: 'hover', ownerName: '', peek: false, headOnly: false, work: false, mainId: null, bg: 'none', bgH: 2, rem: { water: 60, stretch: 50, list: [] }, pomo: { focus: 25, brk: 5 } },
      pets: [], items: null, diary: {}, collection: {}, eggs: {}, flags: {}, cds: {},
    };
  }

  let timer = null;
  const save = (PP.save = {
    async load() {
      let data = null;
      try {
        const raw = api ? await api.load() : localStorage.getItem(KEY);
        if (raw) data = JSON.parse(raw);
      } catch (e) { console.warn('load failed', e); }
      const s = Object.assign(fresh(), data || {});
      s.settings = Object.assign(fresh().settings, s.settings || {});
      s.settings.rem = Object.assign(fresh().settings.rem, s.settings.rem || {});
      s.settings.pomo = Object.assign(fresh().settings.pomo, s.settings.pomo || {});
      G.save = s;
      return !!data;
    },
    write() {
      const s = G.save;
      s.savedAt = Date.now();
      s.pets = G.all.map((p) => { p.d.x = Math.round(p.x); return p.d; });
      s.items = G.items.filter((i) => !i.dead && ['food', 'water', 'bed', 'litter', 'poop', 'ball', 'gift', 'cup', 'egg'].includes(i.type))
        .map((i) => ({ type: i.type, x: Math.round(i.x), level: i.level, data: i.data }));
      // 只保留最近 90 天日记
      const keys = Object.keys(s.diary).sort();
      while (keys.length > 90) delete s.diary[keys.shift()];
      const json = JSON.stringify(s);
      try { api ? api.save(json) : localStorage.setItem(KEY, json); } catch (e) { console.warn('save failed', e); }
    },
    soon() { clearTimeout(timer); timer = setTimeout(save.write, 800); },
    reset() { try { api ? api.save('') : localStorage.removeItem(KEY); } catch (e) { } location.reload(); },

    // 离线推演：按 10 分钟一步模拟，结果写进日记
    catchUp() {
      const s = G.save;
      const away = Date.now() - (s.savedAt || Date.now());
      if (away < 5 * 60000 || !G.pets.length) return 0;
      const steps = Math.min(Math.floor(away / 600000), 6 * 24 * 3); // 最多推演 3 天
      const food = PP.findItem('food'), water = PP.findItem('water');
      const summary = {};
      for (const p of G.pets) summary[p.d.id] = { ate: 0, slept: 0, starved: 0, poop: 0 };
      for (let i = 0; i < steps; i++) {
        const t = new Date((s.savedAt || Date.now()) + i * 600000);
        const h = t.getHours();
        for (const p of G.pets) {
          const n = p.n, m = 10 * (s.settings.pace || 1);
          const sleepy = p.sp.chrono[h];
          const sleeping = sleepy > 0.5 || n.energy < 30;
          n.hunger -= m * 0.8; n.thirst -= m * 1.0; n.bladder -= m * 0.6;
          n.energy += sleeping ? m * 2.4 : -m * 0.4;
          n.fun -= m * 0.5; n.social -= m * 0.4; n.battery += m * 1.2;
          if (sleeping) summary[p.d.id].slept++;
          if (n.hunger < 50) {
            if (food && food.level > 0.05) { food.level = Math.max(0, food.level - 0.15); n.hunger += 48; summary[p.d.id].ate++; }
            else if (p.d.stash > 0) { p.d.stash--; n.hunger += 35; }
            else summary[p.d.id].starved++;
          }
          if (n.thirst < 50 && water && water.level > 0.05) { water.level = Math.max(0, water.level - 0.1); n.thirst = 100; }
          if (n.bladder < 30) {
            n.bladder = 100;
            const box = PP.findItem('litter');
            if (box && (box.data.dirty || 0) < 4 && Math.random() < 0.7) box.data.dirty = (box.data.dirty || 0) + 1;
            else if (G.items.filter((it) => it.type === 'poop').length < 4) { PP.addItem({ type: 'poop', x: U.rand(40, G.W - 40) }); summary[p.d.id].poop++; }
          }
          // 不会因为你不在而“死掉”，但会想你
          n.fun = Math.max(n.fun, 15); n.social = Math.max(n.social, 10); n.hunger = Math.max(n.hunger, 5); n.thirst = Math.max(n.thirst, 5);
          for (const k in n) n[k] = U.clamp(n[k], 0, 100);
        }
      }
      const owner = s.settings.ownerName || '主人';
      for (const p of G.pets) {
        const su = summary[p.d.id];
        const bits = [];
        if (su.slept > steps * 0.5) bits.push('睡了很久');
        if (su.ate) bits.push(`自己吃了${su.ate}顿饭`);
        if (su.starved > 6) bits.push('后来碗空了，饿着肚子等你');
        if (su.poop) bits.push('在地上留了点“礼物”');
        PP.diary.add(p, `${owner}不在的${U.fmtDur(away)}里，我${bits.length ? bits.join('，') : '一直在等你'}。`, 'away');
        if (away > 6 * 3600e3) p.d.affection = Math.max(0, p.d.affection - Math.min(5, away / 86400e3 * 2));
      }
      return away;
    },
  });
})();
