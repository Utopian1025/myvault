// 行为脚本：每一个都是生成器，可以被打断（被拎起、被戳、主人回来…）
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const A = (PP.ACTIONS = {});

  const S = () => G.S;
  const hour = () => new Date().getHours();
  const userHere = () => Date.now() - G.user.lastActive < 60000 && G.mouse.onScreen;

  function* sitFor(p, sec, eyes = 'open', mouth = 'w') { p.anim = 'idle'; p.eyes = eyes; p.mouth = mouth; yield sec; }

  // 小动作：伸懒腰、打哈欠、挠痒、打喷嚏、张望 —— 让它看起来“在活着”
  function* fidget(p) {
    const r = Math.random();
    if (r < 0.18) {
      p.anim = 'stretch'; p.eyes = 'closed'; p.mouth = 'open'; yield 1.4;
      p.anim = 'idle'; p.eyes = 'open'; p.mouth = 'w';
    } else if (r < 0.34) {
      yield* yawn(p);
    } else if (r < 0.46) {
      p.anim = 'groom'; p.eyes = 'closed'; yield U.rand(1.5, 3); p.anim = 'idle'; p.eyes = 'open';
    } else if (r < 0.52) {
      p.eyes = 'strain'; p.mouth = 'o'; yield 0.5; p.squash = 0.6; p.eyes = 'closed'; p.mouth = 'open';
      p.emote('sweat'); yield 0.4; p.eyes = 'open'; p.mouth = 'w';
      for (const o of G.pets) if (o !== p && !o.sleeping && Math.abs(o.x - p.x) < 300) { o.setExpr('wide', 'o', 0.8); o.facing = Math.sign(p.x - o.x) || 1; }
    } else if (r < 0.7) {
      p.facing = -p.facing; yield U.rand(0.8, 1.6); p.facing = -p.facing; yield U.rand(0.6, 1.2);
    } else if (r < 0.8) {
      p.anim = 'look_up'; yield U.rand(1, 2.5); p.anim = 'idle';
    } else {
      p.anim = 'idle'; p.eyes = 'sleepy'; yield U.rand(1, 2.5); p.eyes = 'open';
    }
  }

  function* yawn(p) {
    p.eyes = 'closed'; p.mouth = 'yawn'; yield 1.2; p.mouth = 'w'; p.eyes = 'sleepy'; yield 0.6; p.eyes = 'open';
    // 哈欠会传染
    for (const o of G.pets) {
      if (o === p || o.sleeping || o.held || Math.abs(o.x - p.x) > 260 * S() / 2) continue;
      if (Math.random() < 0.55) setTimeout(() => {
        if (o.sleeping || o.held) return;
        o.setExpr('closed', 'yawn', 1.2);
        PP.events.found('yawn');
      }, U.rand(900, 1800));
    }
  }
  A.yawn = function* () { yield* yawn(this); };

  A.idle = function* () {
    const p = this;
    p.anim = 'idle'; p.eyes = 'open'; p.mouth = 'w';
    const dur = U.rand(3, 9) * (0.6 + p.tr.lazy);
    let t = 0;
    while (t < dur) {
      const s = U.rand(1.5, 3.5); yield s; t += s;
      if (Math.random() < 0.45) yield* fidget(p);
      if (Math.random() < 0.06 && userHere()) PP.events.musing(p);
    }
  };

  A.wander = function* () {
    const p = this;
    const range = 120 + p.tr.curious * 380;
    yield p.goto(Math.random() < 0.3 ? U.rand(40, G.W - 40) : p.x + U.rand(-range, range));
    yield* sitFor(p, U.rand(1, 3));
    p.n.fun = Math.min(100, p.n.fun + 3);
    if (Math.random() < 0.3) yield* fidget(p);
  };

  A.explore = function* () {
    const p = this;
    const pois = G.items.filter((i) => !i.dead && !i.carriedBy);
    const tx = pois.length && Math.random() < 0.6 ? U.pick(pois).x + U.rand(-30, 30) : U.chance(0.3) ? U.pick([30, G.W - 30]) : U.rand(40, G.W - 40);
    yield p.goto(tx);
    p.anim = 'eat'; p.mouth = 'w'; p.eyes = 'open'; yield U.rand(1, 2); // 闻一闻
    p.anim = 'idle';
    if (Math.random() < 0.4) p.think(U.pick(['q', 'excl', 'dots']));
    p.n.fun = Math.min(100, p.n.fun + 6);
    yield U.rand(1, 2.5);
  };

  function bowlFor(type) { return PP.findItem(type); }

  function* askOwner(p, icon, key, until) {
    // 东西没了：去找主人要
    p.line(key);
    let t = 0;
    while (t < 25 && !until()) {
      if (userHere() && p.affLevel >= 1) {
        yield p.goto(G.mouse.x + U.rand(-20, 20));
        p.anim = 'idle'; p.look = [0, -1];
      }
      p.think(icon, 2.2);
      yield 2.5; t += 2.5;
      if (Math.random() < 0.25) p.line(key);
    }
  }

  A.eat = function* () {
    const p = this;
    let bowl = bowlFor('food');
    if (!bowl || bowl.level < 0.05) {
      if (p.d.species === 'hamster' && p.d.stash > 0) {
        p.say('幸好我有存粮！'); p.d.stash--; p.cheeks = true; yield 1;
        p.anim = 'eat'; p.mouth = 'chew'; yield 3; p.cheeks = false;
        p.n.hunger = Math.min(100, p.n.hunger + 35); p.anim = 'idle'; p.mouth = 'w';
        PP.events.found('stash'); p.log('碗空了，偷偷吃了一颗藏起来的存粮。');
        return;
      }
      yield* askOwner(p, 'bowl', 'hungry', () => (bowl = bowlFor('food')) && bowl.level > 0.05);
      if (!bowl || bowl.level < 0.05) { p.d.needs.fun -= 5; p.cooldown.ask = 240; p.setExpr('sad', 'w', 3); return; }
      if (p.affLevel >= 1) { p.addAff(0.5); p.say(U.pick(['谢谢！', '开饭啦', '♪'])); }
    }
    // 碗边有别人？
    const other = G.pets.find((o) => o !== p && o.action === 'eat' && Math.abs(o.x - bowl.x) < 30 * S() / 2);
    let off = 0;
    if (other) {
      const rel = p.relWith(other);
      if (rel > 55) off = (p.x < bowl.x ? -1 : 1) * 12 * S();
      else {
        yield p.goto(bowl.x + (p.x < bowl.x ? -1 : 1) * 28 * S());
        p.think('dots'); p.anim = 'idle';
        if (rel < 30 && Math.random() < 0.5) { p.setExpr('angry', 'frown', 1.5); p.emote('anger'); other.setExpr('wide', 'o', 1); p.addRel(other, -2); }
        yield () => other.action !== 'eat';
      }
    }
    yield p.goto(bowl.x + off);
    p.facing = off ? -Math.sign(off) : p.facing;
    p.anim = 'eat'; p.mouth = 'chew'; p.eyes = 'closed';
    if (other && off) { p.addRel(other, 1.5); PP.hearts(p.x, p.headPos[1] - 20, 1); }
    const dur = U.rand(3.5, 6);
    yield dur;
    bowl.level = Math.max(0, bowl.level - 0.085);
    p.n.hunger = Math.min(100, p.n.hunger + 48);
    p.n.bladder -= 6;
    p.anim = 'idle'; p.mouth = 'tongue'; p.eyes = 'happy'; yield 1;
    p.mouth = 'w'; p.eyes = 'open';
    p.count('ate'); p.remember('bowl');
    if (Math.random() < 0.3) yield* fidget(p);
  };

  A.drink = function* () {
    const p = this;
    let bowl = bowlFor('water');
    if (!bowl || bowl.level < 0.05) {
      yield* askOwner(p, 'drop', 'thirsty', () => (bowl = bowlFor('water')) && bowl.level > 0.05);
      if (!bowl || bowl.level < 0.05) { p.cooldown.ask = 240; return; }
    }
    yield p.goto(bowl.x + U.rand(-4, 4));
    p.anim = 'drink'; p.eyes = 'closed';
    // 舔水时溅起小水滴
    for (let k = 0, n = Math.floor(U.rand(5, 8)); k < n; k++) {
      yield 0.45;
      PP.fx({ kind: 'dot', x: p.x + U.rand(-6, 6), y: p.y - 6 * G.S, vx: U.rand(-30, 30), vy: U.rand(-90, -50), grav: 400, life: 0.5, col: '#8fd0ff', size: Math.max(1, G.S - 1) });
    }
    bowl.level = Math.max(0, bowl.level - 0.07);
    p.n.thirst = 100; p.n.bladder -= 8;
    p.anim = 'idle'; p.mouth = 'w'; p.eyes = 'open';
    p.count('drank');
    // 喝水提醒：顺便关心一下主人
    if (userHere() && G.save.settings.care && Math.random() < 0.15 && !(PP.events.cd('water') > 0)) { PP.events.setCd('water', 1800); p.say('你也喝口水吧～'); }
  };

  A.toilet = function* () {
    const p = this;
    const box = PP.findItem('litter');
    const useBox = box && (box.data.dirty || 0) < 4 && (p.tr.neat > 0.3 || ['cat', 'rabbit'].includes(p.d.species));
    if (useBox) yield p.goto(box.x);
    else {
      // 找个离别人远一点的地方
      yield p.goto(U.rand(30, G.W - 30));
    }
    p.facing = U.chance(0.5) ? 1 : -1;
    p.anim = 'poop'; p.eyes = 'strain'; p.mouth = 'none';
    yield U.rand(2, 3);
    p.n.bladder = 100;
    if (useBox) {
      box.data.dirty = (box.data.dirty || 0) + 1;
      if (p.tr.neat > 0.5) { p.anim = 'groom'; p.eyes = 'open'; yield 1.2; } // 刨砂
    } else {
      PP.addItem({ type: 'poop', x: p.x - p.facing * 8 * S(), y: G.ground });
      if (box && (box.data.dirty || 0) >= 4) { p.think('poop'); }
    }
    p.anim = 'idle'; p.eyes = 'happy'; p.mouth = 'w'; yield 0.8; p.eyes = 'open';
    p.count('poop');
    if (!useBox) { p.anim = 'run'; yield p.goto(p.x + p.facing * 80, true); } // 拉完就跑
  };

  A.dirty = function* () {
    const p = this;
    const poop = PP.findItem('poop');
    if (!poop) return;
    p.cooldown.dirty = 300;
    yield p.goto(poop.x + (p.x < poop.x ? -26 : 26) * S() / 2);
    p.anim = 'eat'; yield 1; p.anim = 'idle';
    p.setExpr('strain', 'frown', 1.2); yield 1.2;
    p.think('poop', 2.5);
    if (userHere()) { p.line('dirty'); p.facing = Math.sign(G.mouse.x - p.x) || 1; }
    yield 2;
  };

  A.sleep = function* () {
    const p = this;
    // 找床、或者找好朋友挤着睡
    const bed = PP.findItem('bed');
    const buddy = G.pets.find((o) => o !== p && o.sleeping && p.relWith(o) > 68);
    let tx;
    if (buddy) tx = buddy.x + (p.x < buddy.x ? -1 : 1) * 16 * S();
    else if (bed && G.pets.filter((o) => o.sleeping && Math.abs(o.x - bed.x) < 30 * S()).length < 2) {
      const n = G.pets.filter((o) => o.sleeping && Math.abs(o.x - bed.x) < 30 * S()).length;
      tx = bed.x + (n ? 12 * S() : -4 * S());
    } else tx = p.x + U.rand(-100, 100);
    yield p.goto(tx);
    if (Math.random() < 0.6) yield* yawn(p);
    // 原地转一圈再趴下
    p.facing = -p.facing; yield 0.35; p.facing = -p.facing; yield 0.35;
    p.anim = 'lie'; p.eyes = 'sleepy'; yield U.rand(1.5, 3);
    p.anim = 'sleep'; p.eyes = 'closed'; p.mouth = 'w'; p.sleeping = true;
    if (buddy) { PP.hearts(p.x, p.y - 20 * S(), 2); PP.events.found('cuddle'); p.log(`和${buddy.name}挤在一起睡了一觉，很暖和。`); p.addRel(buddy, 3); }
    p.count('sleep');
    let t = 0, zz = 0;
    const napMax = U.rand(300, 1200);
    while (true) {
      yield 1; t += 1; zz += 1;
      if (zz > 2.4) { zz = 0; PP.fx({ x: p.x + p.facing * 6 * S(), y: p.y - 18 * S(), vx: 10, vy: -16, icon: 'zzz', life: 2.2, s: Math.max(1, S() - 1) }); }
      // 做梦：梦到今天发生的事
      if (Math.random() < 0.03 && p.d.memories.length) { p.think(U.pick(p.d.memories), 3); if (G.hoverPet === p) PP.events.found('dream'); }
      if (Math.random() < 0.01) p.setExpr('closed', 'smile', 2);
      const sleepy = p.sleepiness();
      if (p.n.energy >= 98 && (sleepy < 0.55 || t > 3600)) break;
      if (sleepy < 0.7 && t > napMax && p.n.energy > 60) break; // 白天的盹不会太长
      if (p.n.bladder < 15 || p.n.hunger < 12) break;
      if (t > 60 && p.n.energy > 70 && sleepy < 0.3 && Math.random() < 0.02) break;
    }
    p.sleeping = false;
    p.anim = 'lie'; p.eyes = 'sleepy'; yield 1.2;
    p.anim = 'stretch'; p.eyes = 'closed'; p.mouth = 'open'; yield 1.5;
    p.anim = 'idle'; p.eyes = 'open'; p.mouth = 'w';
    const h = hour();
    if (userHere() && h >= 6 && h < 11 && !(PP.events.cd('morning_' + p.d.id) > 0)) { PP.events.setCd('morning_' + p.d.id, 6 * 3600); p.say(U.pick(PP.LINES.morning)); }
    p.log(`睡醒了，${t > 1800 ? '睡了好长一觉' : '小睡了一会儿'}。`, 'sleep');
  };

  A.play = function* () {
    const p = this;
    const sp = p.d.species;
    const r = Math.random();
    if (r < 0.3) {
      // 追自己的尾巴
      p.wag = 12;
      for (let i = 0; i < U.randi(5, 9); i++) { p.facing = -p.facing; p.anim = 'run'; p.x += p.facing * 4; yield 0.18; }
      p.anim = 'idle'; p.dizzy = Math.random() < 0.3 ? 2 : 0; p.eyes = 'happy'; yield 1;
    } else if (r < 0.55) {
      // 撒欢跑
      for (let i = 0; i < U.randi(2, 4); i++) { yield p.goto(U.rand(40, G.W - 40), true); p.anim = 'crouch'; yield 0.6; }
    } else if (r < 0.8) {
      yield* A.special.call(p);
    } else {
      // 扑落叶 / 扑空气
      p.anim = 'crouch'; yield U.rand(1, 2);
      p.airborne = true; p.vy = -520; p.vx = p.facing * 160; p.fallFrom = p.y;
      yield () => !p.airborne;
      p.eyes = 'happy'; yield 0.8;
    }
    p.n.fun = Math.min(100, p.n.fun + 28);
    p.anim = 'idle'; p.eyes = 'open'; p.wag = null;
    p.count('played');
  };

  // 物种特色动作
  A.special = function* () {
    const p = this, sp = p.d.species;
    if (sp === 'cat') {
      if (Math.random() < 0.5) { p.anim = 'knead'; p.eyes = 'happy'; p.purr = 3; yield U.rand(3, 5); }
      else { p.anim = 'groom'; p.eyes = 'closed'; yield 3; p.anim = 'lie'; p.eyes = 'sleepy'; yield 3; }
    } else if (sp === 'dog') {
      for (let i = 0; i < 6; i++) { p.facing = -p.facing; p.anim = 'run'; yield 0.15; }
      p.anim = 'idle'; p.mouth = 'tongue'; p.eyes = 'happy'; yield 1.2;
    } else if (sp === 'rabbit') {
      // binky：开心时原地起跳扭身
      for (let i = 0; i < U.randi(1, 3); i++) {
        p.airborne = true; p.vy = -560; p.vx = 0; p.fallFrom = p.y;
        setTimeout(() => (p.facing = -p.facing), 150);
        yield () => !p.airborne; yield 0.3;
      }
      p.eyes = 'happy'; yield 1;
    } else if (sp === 'hamster') {
      // 洗脸
      p.anim = 'groom'; p.eyes = 'closed'; yield 1.2; p.anim = 'knead'; yield 1.5; p.anim = 'groom'; yield 1.2;
    } else if (sp === 'penguin') {
      // 肚皮滑行
      p.anim = 'run'; yield 0.6;
      p.transform = p.facing > 0 ? 'rotR' : 'rotL'; p.eyes = 'happy';
      const tx = U.clamp(p.x + p.facing * U.rand(150, 320), 30, G.W - 30);
      while (Math.abs(p.x - tx) > 4) { p.x += Math.sign(tx - p.x) * 220 * dtGuess(); yield 0; }
      p.transform = null; p.anim = 'idle'; yield 0.6;
    } else if (sp === 'fox') {
      // 竖耳朵听 → 一头扎进“雪”里
      p.anim = 'idle'; p.ears = 'up'; p.look = [0, 1]; p.eyes = 'open';
      p.think('excl', 1.2); yield 1.5;
      p.anim = 'crouch'; yield 0.8;
      p.airborne = true; p.vy = -620; p.vx = p.facing * 120; p.fallFrom = p.y;
      yield () => p.vy > 0;
      p.transform = 'flipV';
      yield () => !p.airborne;
      p.transform = 'buried'; p.anim = 'idle'; p.wag = 10; PP.puff(p.x, p.y, 8);
      yield U.rand(1.5, 2.5);
      p.transform = null; p.wag = null; p.squash = 0.6; p.eyes = 'happy'; yield 1;
    } else if (sp === 'dragon') {
      p.mouth = 'open'; p.eyes = 'closed'; yield 0.6;
      for (let i = 0; i < 8; i++) PP.fx({ kind: 'dot', x: p.x + p.facing * 10 * S(), y: p.headPos[1] + 6 * S(), vx: p.facing * U.rand(60, 140), vy: U.rand(-30, 10), life: 0.6, col: U.pick(['#ff9a3a', '#ffcf33', '#ff5a3a']), size: S() * 2 });
      yield 0.8; p.mouth = 'smile'; p.eyes = 'happy'; yield 1;
    }
    p.anim = 'idle'; p.eyes = 'open'; p.mouth = 'w'; p.transform = null;
  };
  function dtGuess() { return 1 / 60; }

  // 跟鼠标玩：盯 → 压低身子扭屁股 → 扑！
  A.cursor_play = function* () {
    const p = this;
    let t = 0, bored = 0;
    p.line('playAsk');
    while (t < U.rand(10, 18)) {
      const M = G.mouse;
      if (!M.onScreen) break;
      const near = Math.abs(M.x - p.x) < 140;
      const low = M.y > G.ground - 160;
      if (!near) { yield p.goto(M.x - Math.sign(M.x - p.x) * 40, Math.abs(M.x - p.x) > 250); t += 0.5; continue; }
      p.facing = Math.sign(M.x - p.x) || p.facing;
      if (low && Date.now() - M.lastMove > 400) {
        p.anim = 'crouch'; p.eyes = 'open'; yield U.rand(0.8, 1.6);
        if (Date.now() - M.lastMove > 300) {
          p.airborne = true; p.vy = -Math.min(900, 260 + (G.ground - M.y) * 4.2); p.vx = (M.x - p.x) * 2.2; p.fallFrom = p.y;
          yield () => !p.airborne;
          if (Math.abs(M.x - p.x) < 30 && Math.abs(M.y - (p.y - 20 * S())) < 40) { p.eyes = 'happy'; p.emote('star'); p.n.fun += 8; p.addAff(0.3); }
          t += 1.5;
        }
      } else {
        p.anim = 'idle'; yield 0.4; t += 0.4;
        bored += Date.now() - M.lastMove > 3000 ? 0.4 : 0;
        if (bored > 6) { p.say(U.pick(['不陪我玩吗…', '哼', '…'])); break; }
      }
    }
    p.n.fun = Math.min(100, p.n.fun + 25); p.n.social = Math.min(100, p.n.social + 12);
    p.anim = 'idle'; p.eyes = 'open';
    p.count('playedYou'); p.remember('cursor');
  };

  // 想你了：跑到鼠标下面，抬头看着你
  A.seek_user = function* () {
    const p = this;
    yield p.goto(G.mouse.x + U.rand(-30, 30), p.tr.clingy > 0.7);
    p.anim = 'idle'; p.look = [0, -1];
    if (Math.random() < 0.5) p.think('heart'); else p.line(p.n.social < 30 ? 'lonely' : 'greet');
    let t = 0;
    const start = p.d.stats.pets;
    while (t < 14) {
      yield 0.5; t += 0.5;
      if (p.d.stats.pets > start) break;
      if (Math.abs(G.mouse.x - p.x) > 160 && userHere()) yield p.goto(G.mouse.x, false);
    }
    if (p.d.stats.pets > start) { p.eyes = 'happy'; p.say(U.pick(['嘿嘿', '就是想你了', '♪'])); yield 2; }
    else { p.setExpr('sad', 'w', 2); p.n.social += 4; yield 2; }
    p.n.social = Math.min(100, p.n.social + 10);
    p.eyes = 'open';
  };

  // 社交：找朋友玩
  A.social = function* () {
    const p = this;
    const cands = G.pets.filter((o) => o !== p && !o.held && !o.airborne && !o.sleeping && !o.partner && !['eat', 'drink', 'toilet', 'treat', 'landing'].includes(o.action) && o.n.battery > 25);
    if (!cands.length) return;
    const o = U.weighted(cands.map((c) => [c, p.relWith(c) + 10]));
    yield p.goto(o.x + (p.x < o.x ? -1 : 1) * 22 * S());
    if (o.sleeping || o.held || o.partner) return;
    // 把对方拉进来
    o.interrupt(); o.partner = p; p.partner = o;
    o.action = 'with'; o.gen = (function* () { yield () => !o.partner; })(); o.step();
    p.facing = Math.sign(o.x - p.x) || 1; o.facing = -p.facing; o.anim = 'idle'; p.anim = 'idle';
    const rel = p.relWith(o);
    // 先闻闻
    p.anim = 'eat'; o.anim = 'eat'; yield 1.2; p.anim = 'idle'; o.anim = 'idle';
    const r = Math.random();
    if (rel < 25 && Math.random() < 0.5) {
      o.setExpr('angry', 'frown', 1.5); o.emote('anger'); p.setExpr('wide', 'o', 1.2);
      p.addRel(o, -1); yield 1.5;
      p.anim = 'run'; yield p.goto(p.x - p.facing * 120, true);
      p.log(`想找${o.name}玩，结果被凶了。`);
    } else if (r < 0.4) {
      // 聊天（聊吃的、聊天气、聊你）
      const topics = ['note', 'q', 'excl', 'heart', 'fish', 'cursor', 'sun', 'moon', 'ball', 'star', 'cloud'];
      for (let i = 0; i < U.randi(2, 4); i++) {
        const s = i % 2 ? o : p;
        s.think(U.pick(topics), 1.6); s.mouth = 'open'; yield 0.5; s.mouth = 'w'; yield 1.2;
      }
      if (Math.random() < 0.5) { p.eyes = 'happy'; o.eyes = 'happy'; yield 1; }
      p.log(`和${o.name}聊了一会儿天。`);
    } else if (r < 0.7 && p.n.energy > 30 && o.n.energy > 30) {
      // 追逐游戏
      p.say(U.pick(PP.LINES.friend), 1.6); yield 0.8;
      for (let i = 0; i < U.randi(2, 4); i++) {
        const runner = i % 2 ? p : o, chaser = i % 2 ? o : p;
        const tx = U.rand(40, G.W - 40);
        runner.target = tx; runner.running = true; chaser.target = U.clamp(tx - Math.sign(tx - runner.x) * 30, 20, G.W - 20); chaser.running = true;
        yield () => runner.target == null && chaser.target == null;
        yield 0.4;
      }
      p.eyes = 'happy'; o.eyes = 'happy'; p.mouth = 'open'; o.mouth = 'open'; yield 1.2;
      p.n.fun += 20; o.n.fun += 20;
      p.log(`和${o.name}玩了追逐游戏！`); p.remember('friend');
    } else {
      // 互相蹭蹭 / 舔毛
      p.blush = true; o.blush = true; p.eyes = 'happy'; o.eyes = 'closed';
      p.anim = 'groom'; yield 2.5;
      PP.hearts((p.x + o.x) / 2, p.headPos[1] - 10, 2);
      p.addRel(o, 2);
      p.log(`帮${o.name}舔了舔毛。`);
    }
    p.addRel(o, 3); o.addRel(p, 3);
    p.n.social = Math.min(100, p.n.social + 35); o.n.social = Math.min(100, o.n.social + 30);
    p.count('social');
    p.eyes = 'open'; o.eyes = 'open'; p.mouth = 'w'; o.mouth = 'w'; p.blush = false; o.blush = false; p.anim = 'idle';
    o.partner = null; p.partner = null;
  };

  // 独处：走到角落背对大家，充一会儿电
  A.alone = function* () {
    const p = this;
    const others = G.pets.filter((o) => o !== p);
    let tx;
    if (others.length) {
      const avg = others.reduce((s, o) => s + o.x, 0) / others.length;
      tx = avg > G.W / 2 ? U.rand(30, G.W * 0.2) : U.rand(G.W * 0.8, G.W - 30);
    } else tx = U.pick([U.rand(30, 120), U.rand(G.W - 120, G.W - 30)]);
    yield p.goto(tx);
    p.facing = tx < G.W / 2 ? -1 : 1;
    p.anim = U.chance(0.5) ? 'lie' : 'idle'; p.eyes = 'sleepy';
    if (Math.random() < 0.5) p.line('alone'); else p.think(U.pick(['dots', 'cloud', 'music']));
    const dur = U.rand(20, 45);
    let t = 0;
    while (t < dur) {
      yield 2; t += 2;
      p.facing = tx < G.W / 2 ? -1 : 1;
      if (Math.random() < 0.08) p.think(U.pick(['dots', 'music', 'cloud', 'star']));
      if (p.n.battery > 90 && p.sulk <= 0) break;
    }
    p.n.battery = Math.min(100, p.n.battery + 30);
    p.anim = 'idle'; p.eyes = 'open';
    p.count('alone');
  };

  A.groom = function* () {
    const p = this;
    p.anim = 'groom'; p.eyes = 'closed'; yield U.rand(2, 4);
    p.anim = 'idle'; p.eyes = 'happy'; yield 0.6; p.eyes = 'open';
  };

  A.bug = function* () {
    const p = this;
    let t = 0;
    while (G.ambient.bug && t < 14) {
      const b = G.ambient.bug;
      yield p.goto(b.x, Math.abs(b.x - p.x) > 120); t += 0.4;
      if (!G.ambient.bug) break;
      if (Math.abs(b.x - p.x) < 40) {
        p.anim = 'crouch'; yield 0.7; t += 0.7;
        p.airborne = true; p.vy = -Math.min(900, 300 + (G.ground - b.y) * 3.5); p.vx = (b.x - p.x) * 2; p.fallFrom = p.y;
        yield () => !p.airborne; t += 1;
        if (G.ambient.bug && Math.random() < 0.3) { G.ambient.bug.flee = true; G.ambient.bug.leaving = true; p.say(U.pick(['差一点！', '飞走了…', '下次一定'])); break; }
      }
    }
    p.n.fun = Math.min(100, p.n.fun + 20);
    p.anim = 'idle';
    p.remember('butterfly');
    p.log('追了一只蝴蝶，没追上。');
  };

  A.ball = function* () {
    const p = this;
    const ball = PP.findItem('ball');
    if (!ball) return;
    p.cooldown.ball = U.rand(90, 240);
    if (p.d.species === 'dog' || (p.tr.clingy > 0.6 && Math.random() < 0.4)) {
      // 捡球：叼回来给主人
      yield p.goto(ball.x, true);
      yield () => Math.abs(ball.vx) < 30 || true;
      if (ball.dead || ball.carriedBy) return;
      p.carry = ball; ball.carriedBy = p; p.eyes = 'happy';
      const tx = G.mouse.onScreen ? G.mouse.x : G.W / 2;
      yield p.goto(tx, true);
      p.carry = null; ball.carriedBy = null; ball.vx = 0; ball.vy = 0; ball.y = G.ground;
      p.anim = 'idle'; p.look = [0, -1]; p.mouth = 'tongue'; p.wag = 10;
      p.d.stats.fetch++; p.count('fetch');
      if (p.d.stats.fetch >= 3) PP.events.found('fetch');
      p.think('ball', 2); yield 3;
      p.n.fun = Math.min(100, p.n.fun + 25);
    } else {
      // 拍球玩
      for (let i = 0; i < U.randi(2, 4); i++) {
        yield p.goto(ball.x - p.facing * 10, true);
        if (ball.carriedBy) return;
        p.anim = 'crouch'; yield 0.4;
        ball.vx = p.facing * U.rand(180, 380); ball.vy = -U.rand(100, 300); ball.y -= 1;
        p.anim = 'idle'; yield 0.6;
      }
      p.n.fun = Math.min(100, p.n.fun + 22);
    }
    p.wag = null; p.mouth = 'w'; p.eyes = 'open';
    p.remember('ball');
  };

  A.treat = function* () {
    const p = this;
    const it = PP.findItem('treat', (i) => !i.carriedBy);
    if (!it) return;
    yield p.goto(it.x, true);
    if (it.dead || it.carriedBy) return;
    p.anim = 'eat'; p.mouth = 'chew'; p.eyes = 'closed';
    it.carriedBy = p; yield 2;
    it.dead = true;
    const fav = it.data.sprite === p.sp.fav;
    p.n.hunger = Math.min(100, p.n.hunger + 20);
    p.anim = 'idle';
    if (fav) {
      p.eyes = 'heart'; p.say(U.pick(PP.LINES.fav)); PP.hearts(p.x, p.headPos[1] - 20, 3);
      p.addAff(3); p.n.fun = Math.min(100, p.n.fun + 25);
      p.log(`主人给了我${p.sp.favName}，是我最爱吃的！`);
      if (p.d.species === 'rabbit' || p.d.species === 'dog') { yield 1; yield* A.special.call(p); }
    } else {
      p.eyes = 'happy'; p.addAff(1.2); p.n.fun = Math.min(100, p.n.fun + 10);
      p.log('吃到了零食。');
    }
    p.count('treat'); p.remember(p.sp.favIcon);
    yield 1.5; p.eyes = 'open'; p.mouth = 'w';
  };

  A.holiday_food = function* () {
    const p = this;
    const it = PP.findItem('holiday');
    if (!it) return;
    yield p.goto(it.x, true);
    if (it.dead) return;
    p.anim = 'eat'; p.mouth = 'chew'; p.eyes = 'closed'; yield 2.5;
    it.data.bites = (it.data.bites || 0) + 1;
    if (it.data.bites >= 3) it.dead = true;
    p.anim = 'idle'; p.eyes = 'happy'; p.n.hunger = Math.min(100, p.n.hunger + 25);
    const hol = PP.holiday();
    if (hol) { p.say(hol.line); p.log(`今天是${hol.name}，吃到了节日的食物！`); }
    yield 1.5; p.eyes = 'open'; p.mouth = 'w';
  };

  // 送礼物：去屏幕边找东西 → 叼回来放在你的鼠标下面
  A.gift = function* () {
    const p = this;
    p.cooldown.gift = U.rand(2400, 5400);
    const edge = p.x < G.W / 2 ? 24 : G.W - 24;
    yield p.goto(edge);
    p.anim = 'eat'; yield 1.5; p.anim = 'idle';
    p.think('excl', 1.2); yield 1.2;
    const g = PP.events.rollGift(p);
    const it = PP.addItem({ type: 'gift', x: p.x, data: { gift: g, from: p.d.id } });
    p.carry = it; it.carriedBy = p;
    p.eyes = 'happy';
    yield p.goto(G.mouse.onScreen ? G.mouse.x : G.W / 2);
    p.carry = null; it.carriedBy = null; it.y = G.ground;
    p.anim = 'idle'; p.look = [0, -1];
    p.line('gift');
    PP.events.found('gift');
    p.log(`找到了${PP.GIFTS[g].name}，送给主人了。`, 'gift');
    yield 3;
    p.eyes = 'open';
  };

  A.stash = function* () {
    const p = this;
    const bowl = PP.findItem('food');
    if (!bowl) return;
    yield p.goto(bowl.x);
    p.anim = 'eat'; p.mouth = 'chew'; yield 2;
    p.cheeks = true; bowl.level = Math.max(0, bowl.level - 0.08);
    p.anim = 'idle'; p.mouth = 'w'; p.eyes = 'happy'; yield 0.6;
    const spot = p.d.stashX || (p.d.stashX = U.pick([U.rand(20, 80), U.rand(G.W - 80, G.W - 20)]));
    yield p.goto(spot);
    p.anim = 'groom'; p.eyes = 'closed'; yield 1.5;
    p.cheeks = false; p.d.stash++; p.cooldown.stash = 900;
    p.anim = 'idle'; p.eyes = 'happy'; p.think('seed', 1.6); yield 1.2;
    p.eyes = 'open';
    p.log('偷偷往秘密基地里藏了一点粮食。');
  };

  A.knock = function* () {
    const p = this;
    const cup = PP.findItem('cup', (c) => !c.data.pushed);
    if (!cup) return;
    const side = cup.x < G.W / 2 ? 1 : -1; // 从里侧往外推
    yield p.goto(cup.x + side * 18 * S());
    p.facing = -side;
    p.anim = 'idle'; p.look = [-side, 0];
    yield 1.2;
    // 盯着你，然后……
    if (G.mouse.onScreen) { p.look = [Math.sign(G.mouse.x - p.x), -1]; yield 1.2; }
    p.anim = 'groom'; yield 0.4;
    cup.data.pushed = true; cup.vx = -side * 260; cup.vy = -60; cup.y -= 1;
    p.anim = 'idle'; p.eyes = 'happy'; p.mouth = 'w';
    yield 1.4;
    p.say(U.pick(['（无辜）', '不是我', '…喵？']));
    PP.events.found('knock_off');
    p.log('把主人的杯子推下去了。（嘿嘿）');
    yield 2; p.eyes = 'open';
  };

  // —— 落地 ——
  A.land = function* () { const p = this; p.anim = 'land'; yield 0.18; p.anim = 'idle'; };
  A.perfectLanding = function* () {
    const p = this;
    p.anim = 'land'; yield 0.2; p.anim = 'idle'; p.eyes = 'open';
    PP.fx({ kind: 'text', text: '10.0', x: p.x, y: p.y - 46 * S(), vy: -12, life: 2.2, style: { size: 14, bg: '#ffcf33' } });
    p.say(U.pick(['完美落地', '哼，小意思', '（甩甩尾巴）']));
    PP.events.found('perfect_landing');
    yield 2;
  };
  A.flop = function* (h) {
    const p = this;
    p.anim = 'land'; p.eyes = 'dizzy'; p.mouth = 'open'; yield 0.5;
    p.anim = 'lie'; yield 1.2;
    p.d.trust = Math.max(0, p.d.trust - (h > 400 ? 4 : 2));
    p.setExpr('sad', 'frown', 2); p.say(U.pick(['好痛…', '呜…', '不要摔我']));
    p.anim = 'idle'; p.mouth = 'w'; yield 2;
  };

  // —— 互动反应 ——
  A.poked = function* () {
    const p = this;
    p.jolt(-4.2, (Math.random() - 0.5) * 5);
    if (p.sleeping || p.anim === 'sleep') {
      p.sleeping = false; p.anim = 'lie'; p.eyes = 'sleepy'; p.line('wakeGrumpy'); p.n.fun -= 3;
      yield 1.5;
      if (p.n.energy < 70 && Math.random() < 0.6) { p.anim = 'sleep'; p.eyes = 'closed'; yield* A.sleep.call(p); return; }
      p.anim = 'idle'; p.eyes = 'open'; return;
    }
    const n = p.pokeTimes.length;
    if (n >= 10) {
      p.sulk = 40; p.say(U.pick(PP.LINES.pokeAnnoyed)); p.emote('anger');
      p.addAff(-2); PP.events.found('poke_rage');
      p.log('主人一直戳我，生气了！', 'bad');
      yield 1; p.facing = -Math.sign(G.mouse.x - p.x) || 1; yield* A.alone.call(p); return;
    }
    if (n >= 5 || (p.n.battery < 25 && p.tr.extro < 0.5)) {
      p.setExpr('angry', 'frown', 1.5); if (Math.random() < 0.5) p.say(U.pick(PP.LINES.pokeAnnoyed));
      yield 1.2;
    } else {
      p.anim = 'jump'; p.airborne = true; p.vy = -260; p.vx = 0; p.fallFrom = p.y;
      p.setExpr(p.affLevel >= 2 ? 'happy' : 'wide', 'o', 0.8);
      if (Math.random() < 0.4) p.say(U.pick(PP.LINES.pokeOk), 1.5);
      yield () => !p.airborne;
      if (p.tr.playful > 0.5 && Math.random() < 0.4) { p.eyes = 'happy'; yield 0.6; }
    }
    p.anim = 'idle';
  };

  A.petted = function* () {
    // 被摸摸：眯眼、呼噜、冒爱心
    const p = this;
    const sleepingBefore = p.sleeping;
    p.anim = sleepingBefore ? 'sleep' : p.anim === 'lie' ? 'lie' : 'idle';
    p.sleeping = sleepingBefore;
    p.eyes = sleepingBefore ? 'closed' : 'happy'; p.mouth = sleepingBefore ? 'smile' : 'w'; p.blush = true;
    if (p.d.species === 'cat' || p.d.species === 'dog') p.ears = 'down';
    yield () => p.petting <= 0;
    p.blush = false; p.ears = 'up';
    if (sleepingBefore) { yield* A.sleep.call(p); return; }
    p.eyes = 'open'; p.mouth = 'w';
    yield 0.8;
  };

  // 双击：才艺表演
  A.trick = function* () {
    const p = this;
    p.d.stats.tricks++;
    PP.events.found('trick');
    const sp = p.d.species;
    if (sp === 'cat') { p.anim = 'lie'; p.transform = 'flipV'; p.eyes = 'happy'; p.mouth = 'w'; p.wag = 4; yield 2.5; }
    else if (sp === 'hamster') { p.transform = 'flipV'; p.eyes = 'dizzy'; p.mouth = 'tongue'; yield 2.5; p.transform = null; p.eyes = 'open'; p.think('excl', 1); p.say('骗你的～'); yield 1.2; }
    else if (sp === 'dog') { for (let i = 0; i < 8; i++) { p.facing = -p.facing; yield 0.12; } p.anim = 'dance'; p.mouth = 'tongue'; yield 1.5; }
    else yield* A.special.call(p);
    p.transform = null; p.anim = 'idle'; p.eyes = 'open'; p.mouth = 'w'; p.wag = null;
    p.n.fun = Math.min(100, p.n.fun + 10);
  };

  // 主人回来了
  A.greet = function* (long) {
    const p = this;
    if (p.sleeping && !(long && p.tr.clingy > 0.6)) { p.setExpr('closed', 'smile', 2); return; }
    p.sleeping = false;
    p.anim = 'idle'; p.eyes = 'wide'; p.think('excl', 1); yield 0.6;
    yield p.goto(G.mouse.x + U.rand(-40, 40), true);
    p.look = [0, -1]; p.eyes = 'happy';
    if (long) p.say(U.pick(p.sp.lines.greet.concat(PP.LINES.backLong)));
    else p.say(U.pick(p.sp.lines.greet));
    PP.hearts(p.x, p.headPos[1] - 20, long ? 3 : 1);
    if (p.d.species === 'dog' || p.d.species === 'rabbit') { yield 0.6; yield* A.special.call(p); }
    p.n.social = Math.min(100, p.n.social + 20);
    yield 2; p.eyes = 'open';
  };

  A.breakCare = function* () {
    const p = this;
    p._forceSay = true;
    yield p.goto(G.mouse.onScreen ? G.mouse.x : G.W / 2);
    p.look = [0, -1];
    p.say(U.pick(PP.LINES.breakTime), 5);
    p._forceSay = false;
    yield 1.5;
    p.anim = 'stretch'; p.eyes = 'closed'; p.mouth = 'open'; yield 1.8;
    p.anim = 'idle'; p.eyes = 'happy'; p.mouth = 'w'; yield 2;
    p.eyes = 'open';
  };

  A.lateNight = function* () {
    const p = this;
    p.sleeping = false;
    p.anim = 'lie'; p.eyes = 'sleepy'; yield 1;
    yield p.goto(G.mouse.onScreen ? G.mouse.x : G.W / 2);
    p.anim = 'idle'; p.eyes = 'sleepy'; p.look = [0, -1];
    p._forceSay = true; p.say(U.pick(PP.LINES.lateNight), 5); p._forceSay = false;
    yield 2; yield* yawn(p); yield 1;
  };

  A.lookUp = function* (icon, text, dur = 4) {
    const p = this;
    if (p.sleeping) return;
    p.anim = 'look_up'; p.look = [0, -1]; p.eyes = 'wide';
    yield 0.8;
    if (icon) p.think(icon, 2.5);
    if (text) p.say(text, 3);
    p.eyes = icon === 'star' ? 'star' : 'open';
    yield dur;
    p.anim = 'idle'; p.eyes = 'open';
  };

  A.howl = function* () {
    const p = this;
    p.anim = 'look_up'; p.look = [0, -1]; p.eyes = 'closed'; p.mouth = 'o'; yield 0.6;
    p.mouth = 'open'; p._forceSay = true; p.say('嗷呜～～', 3); p._forceSay = false; yield 2.5;
    p.mouth = 'w'; p.eyes = 'open'; p.anim = 'idle';
  };

  A.dance = function* (dur = 8) {
    const p = this;
    p.anim = 'dance'; p.eyes = 'happy'; p.mouth = 'smile';
    let t = 0;
    while (t < dur) { yield 0.8; t += 0.8; if (Math.random() < 0.4) p.emote('music'); }
    p.anim = 'idle'; p.eyes = 'open'; p.mouth = 'w';
    p.n.fun = Math.min(100, p.n.fun + 20);
  };

  A.zoomies = function* () {
    const p = this;
    p.eyes = 'wide'; p.ears = 'back';
    for (let i = 0; i < 7; i++) { yield p.goto(i % 2 ? U.rand(20, G.W * 0.3) : U.rand(G.W * 0.7, G.W - 20), true); }
    p.ears = 'up'; p.anim = 'idle'; p.eyes = 'happy'; p.mouth = 'tongue'; yield 1.5;
    p.mouth = 'w'; p.eyes = 'open';
    PP.events.found('zoomies');
    p.log('半夜突然好精神，跑了好多圈！');
  };

  A.knead = function* () {
    // 主人在打字时：猫会搬个小键盘过来一起“打字”，别的宠物就在旁边踩奶陪着
    const p = this;
    const typing = true; // 所有小伙伴都会搬键盘来陪你打字
    p.anim = typing ? 'type' : 'knead'; p.eyes = typing ? 'open' : 'happy'; p.purr = 1;
    if (typing) p.look = [0, 1];
    let t = 0;
    while (G.user.typing && t < 120) {
      yield 0.5; t += 0.5;
      if (typing && Math.random() < 0.3) PP.fx({ kind: 'text', text: U.pick(['哒', '嗒', '咔']), x: p.x + U.rand(-14, 14), y: p.y - 20 * G.S, vy: -20, life: 0.6, style: { size: 10, shadow: false } });
      if (typing && Math.random() < 0.05) { p.setExpr('closed', 'w', 0.4); }
    }
    p.anim = 'idle'; p.eyes = 'open';
    if (typing && Math.random() < 0.4) p.say(U.pick(['今天也辛苦了', '我也写完了！', '（伸懒腰）']));
  };
  // 偶尔自己踩奶（舒服的时候）
  A.kneadSolo = function* () { const p = this; p.anim = 'knead'; p.eyes = 'happy'; p.purr = 2; yield U.rand(3, 6); p.anim = 'idle'; p.eyes = 'open'; };

  A.handNap = function* () {
    // 鼠标停在它身上不动：在你手心里睡着
    const p = this;
    p.eyes = 'sleepy'; p.blush = true; p.say(U.pick(PP.LINES.sleepNear), 2.5); yield 2;
    p.anim = 'lie'; yield 1.2; p.anim = 'sleep'; p.eyes = 'closed'; p.sleeping = true;
    PP.events.found('hand_nap');
    p.log('在主人的手心里睡着了。', 'love');
    yield () => Date.now() - G.mouse.lastMove < 200 || !p.hit(G.mouse.x, G.mouse.y);
    p.sleeping = false; p.anim = 'lie'; p.eyes = 'sleepy'; yield 1;
    p.anim = 'idle'; p.eyes = 'open'; p.blush = false;
  };

  A.hatch = function* () {
    const p = this;
    p.anim = 'idle'; p.eyes = 'wide'; p.mouth = 'o';
    yield 1.5;
    p.eyes = 'open'; p.mouth = 'w';
    p.say(U.pick(PP.SPECIES.dragon.lines.greet), 3);
    yield 2;
  };
})();
