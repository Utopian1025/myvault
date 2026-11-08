// 时间事件、彩蛋、日记、礼物
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;

  // ---------- 日记 ----------
  const diary = (PP.diary = {
    day() {
      const k = U.dateKey();
      const D = G.save.diary;
      if (!D[k]) D[k] = { events: [], counts: {} };
      return D[k];
    },
    add(pet, text, kind = 'note') {
      if (pet && pet.d && pet.d.wild) return; // 野生的不记日记
      const d = diary.day();
      const h = new Date();
      d.events.push({ t: h.getTime(), pid: pet ? pet.d.id : null, text, kind });
      if (d.events.length > 160) d.events.splice(0, d.events.length - 160);
    },
    count(pet, key, n = 1) {
      const d = diary.day();
      const c = (d.counts[pet.d.id] = d.counts[pet.d.id] || {});
      c[key] = (c[key] || 0) + n;
    },
    // 用第一人称把一天“写”出来
    compose(dateKey, pet) {
      const d = G.save.diary[dateKey];
      if (!d) return null;
      const c = d.counts[pet.d.id] || {};
      const evs = d.events.filter((e) => e.pid === pet.d.id);
      if (!Object.keys(c).length && !evs.length) return null;
      const lines = [];
      const owner = G.save.settings.ownerName || '主人';
      const parts = [];
      if (c.ate) parts.push(`吃了${c.ate}顿饭`);
      if (c.drank) parts.push(`喝了${c.drank}次水`);
      if (c.sleep) parts.push(c.sleep > 2 ? `睡了好几觉` : `睡了${c.sleep}觉`);
      if (c.played) parts.push(`自己玩了${c.played}次`);
      if (parts.length) lines.push('今天' + parts.join('，') + '。');
      if (c.pets) lines.push(c.pets > 30 ? `${owner}摸了我好多好多下，${c.pets > 80 ? '头毛都被摸乱了' : '好幸福'}。` : `${owner}摸了我${c.pets}下。`);
      if (c.playedYou) lines.push(`和${owner}的鼠标玩了${c.playedYou}次，${c.playedYou > 2 ? '超开心' : '还想玩'}！`);
      if (c.pokes) lines.push(c.pokes > 15 ? `被戳了${c.pokes}下……${owner}是不是太无聊了。` : `被戳了${c.pokes}下。`);
      if (c.treat) lines.push(`吃到了${c.treat}次零食。`);
      if (c.social) lines.push(`和朋友们玩了${c.social}次。`);
      if (c.alone) lines.push(`自己安静地待了一会儿。`);
      if (c.held && c.held > 3) lines.push(`被拎起来${c.held}次，${pet.affLevel >= 2 ? '飞高高也不错' : '有点害怕'}。`);
      const notable = evs.filter((e) => e.kind !== 'sleep').slice(-6);
      for (const e of notable) {
        const t = new Date(e.t);
        lines.push(`${PP.timeWord(t)}，${e.text}`);
      }
      const aff = c.aff || 0;
      if (aff > 8) lines.push(`感觉今天更喜欢${owner}了。`);
      else if (aff < -2) lines.push(`今天有点不开心。`);
      return lines;
    },
  });

  PP.timeWord = function (d) {
    const h = d.getHours();
    const w = h < 5 ? '半夜' : h < 8 ? '清晨' : h < 11 ? '上午' : h < 13 ? '中午' : h < 17 ? '下午' : h < 19 ? '傍晚' : '晚上';
    return `${w}${h % 12 || 12}点`;
  };

  // ---------- 彩蛋 ----------
  const E = (PP.events = {
    found(id) {
      const eggs = G.save.eggs;
      if (eggs[id]) return false;
      eggs[id] = Date.now();
      const e = PP.EGGS[id];
      if (e) PP.ui.toast(`发现彩蛋：${e.name}`, 'egg');
      diary.add(null, `【彩蛋】${e ? e.name : id}`, 'egg');
      PP.save.soon();
      return true;
    },
    cd(k) { return (G.save.cds[k] || 0) - Date.now() / 1000; },
    setCd(k, sec) { G.save.cds[k] = Date.now() / 1000 + sec; },

    rollGift(p) {
      const h = new Date().getHours();
      const pool = [];
      for (const [k, g] of Object.entries(PP.GIFTS)) {
        if (k === 'starfrag' && !(G.save.flags.starSeen && h >= 20 || h < 5)) continue;
        pool.push([k, 1 / g.rare]);
      }
      if (G.save.flags.starSeen && Date.now() - G.save.flags.starSeen < 12 * 3600e3 && Math.random() < 0.4) return 'starfrag';
      return U.weighted(pool);
    },

    musing(p) {
      const d = new Date(), wd = d.getDay(), h = d.getHours();
      let pool = PP.MUSINGS.any.concat(PP.MUSINGS[PP.season()], p.sp.lines.idle);
      if (wd === 1) pool = pool.concat(PP.MUSINGS.monday);
      if (wd === 5) pool = pool.concat(PP.MUSINGS.friday);
      if (wd === 0 || wd === 6) pool = pool.concat(PP.MUSINGS.weekend);
      if (h >= 11 && h < 13) pool = pool.concat(PP.LINES.noon);
      if (h >= 18 && h < 21) pool = pool.concat(PP.LINES.evening);
      const hol = PP.holiday();
      if (hol) pool.push(hol.line, hol.line);
      p.say(U.pick(pool), 3.5);
    },

    shootingStar() {
      G.save.flags.starSeen = Date.now();
      let any = false;
      for (const p of G.pets) {
        if (p.sleeping || p.held) continue;
        any = true;
        p.run('lookUp', PP.ACTIONS.lookUp, 'star', U.chance(0.5) ? '许个愿吧' : null, 3);
      }
      if (any) E.found('shooting_star');
    },

    // 每 5 秒检查一次的时间事件
    tick() {
      const d = new Date(), h = d.getHours(), m = d.getMinutes();
      const awake = G.pets.filter((p) => !p.sleeping && !p.held && !p.airborne);
      const userActive = Date.now() - G.user.lastActive < 60000;

      // 11:11 许愿
      if ((h === 11 || h === 23) && m === 11 && E.cd('1111') <= 0) {
        E.setCd('1111', 3600);
        if (awake.length) { awake.forEach((p) => p.run('lookUp', PP.ACTIONS.lookUp, 'star', null, 4)); E.found('wish_1111'); awake[0].say('11:11，许个愿！'); }
      }
      // 熬夜被抓
      if (h >= 1 && h < 4 && userActive && E.cd('latenight') <= 0) {
        E.setCd('latenight', 5 * 3600);
        const p = U.pick(G.pets.filter((q) => !q.held) || []);
        if (p) { p.run('lateNight', PP.ACTIONS.lateNight); E.found('late_night'); p.log('主人半夜还没睡，去提醒了一下。'); }
      }
      // 满月嚎叫
      if ((h >= 20 || h < 2) && PP.isFullMoon(d) && E.cd('moon') <= 0) {
        E.setCd('moon', 8 * 3600);
        const howlers = awake.filter((p) => ['fox', 'dog'].includes(p.d.species));
        (howlers.length ? howlers : awake.slice(0, 1)).forEach((p) => p.run('howl', PP.ACTIONS.howl));
        if (howlers.length) E.found('full_moon');
        else if (awake[0]) awake[0].say('今天的月亮好圆…');
      }
      // 周五之舞
      if (d.getDay() === 5 && h >= 17 && h < 21 && userActive && E.cd('friday') <= 0) {
        E.setCd('friday', 20 * 3600);
        if (awake.length) { awake.forEach((p) => p.run('dance', PP.ACTIONS.dance, 8)); awake[0].say('周末快乐！'); E.found('friday'); }
      }
      // 午夜跑酷
      if (h >= 2 && h < 4 && E.cd('zoom') <= 0 && Math.random() < 0.01) {
        E.setCd('zoom', 20 * 3600);
        const z = awake.find((p) => ['cat', 'dog', 'hamster', 'hedgehog'].includes(p.d.species) && p.n.energy > 50 && !p.calm);
        if (z) z.run('zoomies', PP.ACTIONS.zoomies);
      }
      // 小鸡：天亮了打鸣
      if (h >= 6 && h < 8 && userActive && E.cd('chickDawn') <= 0) {
        const c = awake.find((p) => p.d.species === 'chick');
        if (c) { E.setCd('chickDawn', 20 * 3600); c._forceSay = true; c.say('叽叽叽——天亮啦！', 4); c._forceSay = false; c.jolt(-3, 0); }
      }
      // 青蛙：夜里呱呱
      if ((h >= 20 || h < 1) && E.cd('frogNight') <= 0 && Math.random() < 0.02) {
        const f = awake.find((p) => p.d.species === 'frog' && ['idle', 'wander', 'groom'].includes(p.action));
        if (f) { E.setCd('frogNight', 3600); f.run('special', PP.ACTIONS.special); }
      }
      // 连续工作太久 → 关心一下
      const activeFor = (Date.now() - G.user.activeSince) / 60000;
      if (false && G.save.settings.care && userActive && activeFor > (G.save.settings.breakMin || 90) && E.cd('break') <= 0) {
        E.setCd('break', (G.save.settings.breakMin || 90) * 60);
        G.user.activeSince = Date.now();
        const p = U.pick(G.pets.filter((q) => !q.held)) || null;
        if (p) { p.run('breakCare', PP.ACTIONS.breakCare); E.found('break_care'); }
      }
      // 主人在打字 → 找一只在发呆的来踩奶陪着
      if (false && G.user.typing && Date.now() - G.user.typingSince > 6000 && E.cd('knead') <= 0) {
        E.setCd('knead', 180);
        const p = awake.find((q) => q.d.species === 'cat' && ['idle', 'wander', 'explore', 'groom'].includes(q.action)) || awake.find((q) => (q.action === 'idle' || q.action === 'wander') && q.affLevel >= 1);
        if (p) p.run('knead', PP.ACTIONS.knead);
      }
      // 杯子（给猫推的）
      G.ambient.nextCup -= 5;
      if (G.ambient.nextCup <= 0 && G.pets.some((p) => p.d.species === 'cat') && !PP.findItem('cup')) {
        G.ambient.nextCup = U.rand(1800, 5400);
        const side = Math.random() < 0.5;
        PP.addItem({ type: 'cup', x: side ? 34 : G.W - 34 });
      }
      // 节日食物
      const hol = PP.holiday(d);
      if (hol) {
        if (hol.food && G.save.flags.holFood !== U.dateKey(d)) {
          G.save.flags.holFood = U.dateKey(d);
          PP.addItem({ type: 'holiday', x: U.rand(G.W * 0.3, G.W * 0.7), y: G.ground - 300, data: { sprite: ['mooncake', 'zongzi', 'dumpling', 'candy', 'cookie', 'cake'].includes(hol.food) ? hol.food : 'cake' } });
          PP.ui.toast(`今天是${hol.name}`, 'info');
        }
        if (E.found('holiday')) { /* first time */ }
      }
      // 记录主人的作息（宠物会慢慢适应）
      E.trackOwner();
      // 纪念日
      E.anniversary();
      // 神秘的蛋
      E.mysteryEgg();
    },

    trackOwner() {
      const d = new Date(), h = d.getHours();
      const key = U.dateKey(d) + ':' + h;
      if (G.save.flags.lastTrack === key) return;
      G.save.flags.lastTrack = key;
      const active = Date.now() - G.user.lastActive < 10 * 60000;
      for (const p of G.pets) {
        // 主人不在的时段 → 那个小时更容易睡；主人在的时段 → 更清醒
        p.d.adapt[h] = U.clamp((p.d.adapt[h] || 0) * 0.92 + (active ? 0 : 0.08), 0, 1);
      }
    },

    anniversary() {
      if (!G.pets.length) return;
      const first = Math.min(...G.pets.map((p) => p.d.born), G.save.flags.firstAdopt || Infinity);
      const days = U.daysBetween(new Date(U.dateKey(new Date(first))).getTime(), new Date(U.dateKey()).getTime());
      for (const n of [7, 30, 100, 200, 365, 520, 1000]) {
        if (days === n && !G.save.flags['ann' + n]) {
          G.save.flags['ann' + n] = true;
          PP.addItem({ type: 'cake', x: G.W / 2, y: G.ground - 300 });
          G.pets.forEach((p) => { p.hat = 'party'; if (!p.sleeping) p.run('dance', PP.ACTIONS.dance, 6); });
          G.pets[0] && (G.pets[0]._forceSay = true, G.pets[0].say(`我们在一起${n}天啦！`, 6), G.pets[0]._forceSay = false);
          diary.add(null, `在一起第 ${n} 天。`, 'love');
          E.found('anniversary');
          for (let i = 0; i < 60; i++) PP.fx({ kind: 'confetti', x: U.rand(0, G.W), y: G.ground - U.rand(200, 400), vy: U.rand(40, 90), vx: U.rand(-30, 30), life: 6, col: U.pick(['#ffcf33', '#ff3d6e', '#56c2ff', '#7be07b']), size: G.S * 2 });
        }
      }
    },

    mysteryEgg() {
      const F = G.save.flags;
      if (F.eggHatched || PP.findItem('egg')) return;
      if (!G.pets.length || G.all.length >= 13) return;
      const first = F.firstAdopt || Date.now();
      const days = (Date.now() - first) / 86400000;
      const totalAff = G.pets.reduce((s, p) => s + p.d.affection, 0);
      if (days >= 3 && totalAff >= 120 && (F.eggWarm || 0) >= 0) {
        const bed = PP.findItem('bed');
        PP.addItem({ type: 'egg', x: bed ? bed.x - 40 : G.W / 2, data: { warm: F.eggWarm || 0 } });
        if (!F.eggSeen) { F.eggSeen = Date.now(); PP.ui.toast('床边出现了一颗神秘的蛋…', 'egg'); diary.add(null, '床边出现了一颗蛋，大家围着它看了好久。', 'egg'); }
      }
    },

    warmEgg(it) {
      const F = G.save.flags;
      const now = Date.now();
      if (F.lastWarm && now - F.lastWarm < 20 * 60000) {
        it.data.wobble = 0.3; PP.ui.toast('它在里面睡觉，过一会儿再来摸摸吧', 'info'); return;
      }
      F.lastWarm = now;
      F.eggWarm = (F.eggWarm || 0) + 1;
      it.data.wobble = 1.2;
      PP.hearts(it.x, it.y - 30, 2);
      if (F.eggWarm >= 4) it.data.crack = true;
      PP.ui.toast(F.eggWarm >= 7 ? '蛋壳裂开了！' : `蛋变暖了一点（${F.eggWarm}/7）`, 'egg');
      if (F.eggWarm >= 7) {
        it.dead = true; F.eggHatched = true;
        for (let i = 0; i < 12; i++) PP.fx({ kind: 'dot', x: it.x, y: it.y - 12, vx: U.rand(-120, 120), vy: U.rand(-260, -80), grav: 600, life: 1, col: '#ffffff', size: G.S * 2 });
        const pet = PP.Pet.create('dragon', 'mint', '小龙');
        pet.x = it.x; PP.addPet(pet);
        pet.d.affection = 40;
        pet.run('hatch', PP.ACTIONS.hatch);
        E.found('mystery_egg');
        diary.add(pet, '从蛋里出来了！第一眼看到的就是你。', 'love');
        PP.save.soon();
      }
    },

    // 主人离开/回来
    onUserReturn(awayMs) {
      const long = awayMs > 60 * 60000;
      diary.add(null, `${G.save.settings.ownerName || '主人'}离开了${U.fmtDur(awayMs)}，回来了。`, 'note');
      const greeters = G.pets.filter((p) => !p.held && p.affLevel >= 1 && (!p.sleeping || (long && p.tr.clingy > 0.55)));
      greeters.forEach((p, i) => setTimeout(() => p.run('greet', PP.ACTIONS.greet, long), i * 400));
    },

    konami() {
      E.found('konami');
      G.pets.forEach((p) => { if (!p.sleeping) { p.hat = 'crown'; p.run('dance', PP.ACTIONS.dance, 6); } });
      for (let i = 0; i < 80; i++) PP.fx({ kind: 'confetti', x: U.rand(0, G.W), y: G.ground - U.rand(200, 420), vy: U.rand(40, 90), vx: U.rand(-30, 30), life: 6, col: U.pick(['#ffcf33', '#ff3d6e', '#56c2ff', '#7be07b']), size: G.S * 2 });
    },
  });
})();
