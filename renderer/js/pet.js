// 宠物：需求 → 动机 → 行为。每只都有自己的性格、记忆、作息和关系。
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;

  const NEED_KEYS = ['hunger', 'thirst', 'bladder', 'energy', 'fun', 'social', 'battery'];
  PP.NEED_NAMES = { hunger: '饱腹', thirst: '口渴', bladder: '如厕', energy: '精力', fun: '快乐', social: '陪伴', battery: '独处电量' };

  function randomTraits(species) {
    const bias = PP.SPECIES[species].bias;
    const t = {};
    for (const [k] of PP.TRAITS) t[k] = U.clamp(0.5 + bias[k] + U.rand(-0.32, 0.32), 0.02, 0.98);
    return t;
  }

  const NAMES = ['团子', '豆包', '麻薯', '年糕', '布丁', '奶盖', '芝麻', '可乐', '土豆', '饭团', '咕噜', '橘子', '小满', '栗子', '雪球', '汤圆', '奶酪', '花卷', '馒头', '蛋挞', '西米', '糯米', '核桃', '芋圆'];
  PP.randomName = () => { const used = new Set(PP.G.pets.map((p) => p.d.name)); const free = NAMES.filter((n) => !used.has(n)); return U.pick(free.length ? free : NAMES); };

  class Pet {
    static create(species, coat, name, opts = {}) {
      const sp = PP.SPECIES[species];
      const shiny = opts.shiny != null ? opts.shiny : Math.random() < 1 / 40;
      const d = {
        id: U.uid(), species, coat: coat || U.pick(sp.coats), name: name || PP.randomName(), shiny,
        lop: species === 'rabbit' && Math.random() < 0.25,
        born: Date.now(), traits: randomTraits(species),
        needs: { hunger: 75, thirst: 75, bladder: 85, energy: 92, fun: 60, social: 50, battery: 90 },
        affection: 5, trust: 50, rel: {}, stats: { pets: 0, pokes: 0, feeds: 0, gifts: 0, fetch: 0, tricks: 0 },
        memories: [], adapt: new Array(24).fill(0), stash: 0, x: null,
      };
      return new Pet(d);
    }
    constructor(d) {
      this.d = d;
      // 运行时状态
      this.x = d.x != null ? d.x : U.rand(G.W * 0.2, G.W * 0.8);
      this.y = G.ground; this.vx = 0; this.vy = 0;
      this.facing = U.chance(0.5) ? 1 : -1;
      this.t = U.rand(0, 10);
      this.anim = 'idle'; this.eyes = 'open'; this.mouth = 'w'; this.look = [0, 0];
      this.blush = false; this.ears = 'up'; this.cheeks = false; this.wag = null;
      this.transform = null; this.squash = 0; this.stretch = 0; this.struggle = false;
      this.blinkT = U.rand(2, 5); this.blinking = 0;
      this.gen = null; this.action = null; this.waitT = 0; this.waitFn = null;
      this.target = null; this.running = false;
      this.bubble = null;
      this.held = false; this.airborne = false; this.fallFrom = 0;
      this.expr = null; // 临时表情 {eyes,mouth,until}
      this.petting = 0; this.lastPetFx = 0;
      this.pokeTimes = []; this.sulk = 0;
      this.dizzy = 0; this.carry = null;
      this.lookTarget = null; this.attention = 0;
      this.sleeping = false; this.lastDecision = 0;
      this.partner = null;
      this.purr = 0;
      this.cooldown = {};
      // 果冻弹簧：jy 拉伸量（+拉长 -压扁），jsk 左右摇晃，tsw 尾巴摆动
      this.jy = 0; this.jvy = 0; this.jsk = 0; this.jvsk = 0; this.tsw = 0; this.tvs = 0;
    }
    jolt(vy = -3, vsk = 0) { this.jvy += vy; this.jvsk += vsk; }
    updateJelly(dt) {
      const steps = Math.ceil(dt / 0.008), h = dt / steps;
      for (let i = 0; i < steps; i++) {
        // 欠阻尼弹簧：会回弹两三下，Q 弹的来源
        this.jvy += (-260 * this.jy - 9 * this.jvy) * h; this.jy += this.jvy * h;
        this.jvsk += (-200 * this.jsk - 7 * this.jvsk) * h; this.jsk += this.jvsk * h;
        const target = (this.anim === 'sleep' ? 0 : Math.sin(this.t * (this.wag || 1.6)) * 0.9) - (this.target != null ? Math.sign(this.target - this.x) * 1.2 : 0);
        this.tvs += (60 * (target - this.tsw) - 6 * this.tvs) * h; this.tsw += this.tvs * h;
      }
      this.jy = Math.max(-0.45, Math.min(0.6, this.jy)); this.jsk = Math.max(-4, Math.min(4, this.jsk));
    }
    get sp() { return PP.SPECIES[this.d.species]; }
    get name() { return this.d.name; }
    get pal() {
      if (this.d.custom) return PP.SPR.customPal(this.d.species, this.d.custom);
      const P = PP.SPR.PAL[this.d.species];
      if (this.d.shiny && P.shiny) return P.shiny;
      return P[this.d.coat] || P[Object.keys(P)[0]];
    }
    get tr() { return this.d.traits; }
    get n() { return this.d.needs; }
    get affLevel() {
      const a = this.d.affection;
      return a < 20 ? 0 : a < 60 ? 1 : a < 150 ? 2 : a < 300 ? 3 : 4;
    }
    get affName() { return ['陌生', '熟悉', '喜欢你', '很亲近', '形影不离'][this.affLevel]; }
    get mood() {
      const n = this.n;
      let m = (n.hunger * 1.2 + n.thirst + n.bladder * 0.6 + n.energy * 0.7 + n.fun * 1.1 + n.social * 0.8 + n.battery * 0.5) / 5.9;
      const dirt = G.items.filter((i) => i.type === 'poop').length;
      m -= dirt * 6 * (0.5 + this.tr.neat);
      if (this.sulk > 0) m -= 20;
      return U.clamp(m, 0, 100);
    }
    get moodName() {
      const m = this.mood;
      if (this.sleeping) return '睡得正香';
      if (this.sulk > 0) return '在生你的气';
      return m > 80 ? '超开心' : m > 62 ? '心情不错' : m > 45 ? '还行' : m > 28 ? '有点低落' : '很难过';
    }
    get headPos() { const S = G.S * (this.scaleMul || 1); return [this.x + this.facing * S, this.y - (this.anim === 'sleep' || this.anim === 'lie' ? 13 : 19) * S + (this.peek ? 15 * G.S : 0)]; }
    get busy() { return this.held || this.airborne; }

    hit(mx, my) {
      const S = G.S * (this.scaleMul || 1);
      const top = (this.anim === 'sleep' || this.anim === 'lie' ? 21 : 28) * S - (this.peek ? 15 * G.S : 0);
      return mx > this.x - 10 * S && mx < this.x + 10 * S && my > this.y - top && my < this.y + G.S;
    }
    hitHead(mx, my) {
      const S = G.S; const [hx, hy] = this.headPos;
      return Math.abs(mx - hx) < 9 * S && Math.abs(my - hy) < 8 * S;
    }

    // ---------- 说话 / 表情 ----------
    say(text, dur = 3.2, kind = 'say') {
      if (G.save.settings.quiet && kind === 'say' && !this._forceSay) return;
      this.bubble = { text, icon: null, t: 0, dur, kind };
      PP.audio && PP.audio.chirp(this);
    }
    think(icon, dur = 2.4) { this.bubble = { text: null, icon, t: 0, dur, kind: 'think' }; }
    line(key, dur) {
      const arr = (this.sp.lines && this.sp.lines[key]) || PP.LINES[key];
      if (arr) this.say(U.pick(arr), dur);
    }
    setExpr(eyes, mouth, dur = 1.5) { this.expr = { eyes, mouth, until: this.t + dur }; }
    emote(icon) { const [hx, hy] = this.headPos; PP.fx({ x: hx + U.rand(-4, 4), y: hy - 14 * G.S, vy: -24, icon, life: 1.4, s: Math.max(1, G.S - 1) }); }
    remember(icon) { this.d.memories.push(icon); if (this.d.memories.length > 12) this.d.memories.shift(); }
    log(text, kind) { PP.diary.add(this, text, kind); }
    count(key, n = 1) { PP.diary.count(this, key, n); }
    addAff(v) {
      this.d.affection = Math.max(0, this.d.affection + v);
      PP.diary.count(this, 'aff', v);
    }
    relWith(other) { return this.d.rel[other.d.id] != null ? this.d.rel[other.d.id] : (this.d.rel[other.d.id] = PP.initialRel(this, other)); }
    addRel(other, v) { this.d.rel[other.d.id] = U.clamp(this.relWith(other) + v, 0, 100); }

    // ---------- 行为调度 ----------
    run(name, genFn, ...args) {
      if (this.gen) { try { this.gen.return(); } catch (e) { } }
      this.cleanupAction();
      this.action = name; this.gen = genFn.call(this, ...args);
      this.waitT = 0; this.waitFn = null;
      this.step();
    }
    interrupt() {
      if (this.gen) { try { this.gen.return(); } catch (e) { } }
      this.cleanupAction();
      this.gen = null; this.action = null; this.waitT = 0; this.waitFn = null; this.target = null;
    }
    cleanupAction() {
      this.sleeping = false; this.transform = null; this.cheeks = this.cheeks && this.action === 'stash';
      if (this.partner && this.partner.partner === this) this.partner.partner = null;
      this.partner = null;
      this.ears = 'up'; this.wag = null; this.blush = false;
      if (this.carry && this.carry.type !== 'ball') { this.carry.carriedBy = null; this.carry = null; }
    }
    step() {
      if (!this.gen) return;
      let r;
      try { r = this.gen.next(); } catch (e) { console.error(e); r = { done: true }; }
      if (r.done) { this.gen = null; this.action = null; this.anim = this.anim === 'walk' || this.anim === 'run' ? 'idle' : this.anim; return; }
      const v = r.value;
      if (typeof v === 'number') this.waitT = v;
      else if (typeof v === 'function') this.waitFn = v;
      else this.waitT = 0;
    }

    // 走路
    goto(x, run = false) {
      this.target = U.clamp(x, 20, G.W - 20); this.running = run;
      return () => this.target == null;
    }

    // ---------- 每帧 ----------
    update(dt) {
      this.t += dt;
      this.decay(dt);
      if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }
      if (this.sulk > 0) this.sulk -= dt;
      if (this.dizzy > 0) this.dizzy -= dt;
      if (this.expr && this.t > this.expr.until) this.expr = null;
      this.squash = Math.max(0, this.squash - dt * 4);
      this.updateJelly(dt);
      for (const k in this.cooldown) this.cooldown[k] -= dt;

      // 眨眼（生命感的来源之一）
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blinking = 0.12; this.blinkT = U.rand(2.2, 6) * (Math.random() < 0.15 ? 0.15 : 1); }
      if (this.blinking > 0) this.blinking -= dt;

      if (this.held) { this.updateHeld(dt); return; }
      if (this.airborne) { this.updateAir(dt); return; }

      // 走路
      if (this.target != null) {
        const dx = this.target - this.x;
        const spd = (this.running ? this.sp.run : this.sp.speed) * G.S / 2 * (this.dizzy > 0 ? 0.5 : 1) * (this.mood < 30 ? 0.75 : 1);
        if (Math.abs(dx) < 3) { this.target = null; if (this.anim === 'walk' || this.anim === 'run') this.anim = 'idle'; }
        else {
          this.facing = dx > 0 ? 1 : -1;
          this.x += Math.sign(dx) * Math.min(Math.abs(dx), spd * dt);
          this.anim = this.running ? 'run' : 'walk';
          if (this.dizzy > 0) this.x += Math.sin(this.t * 9) * 0.8;
        }
      }

      // 行为生成器
      if (this.gen) {
        if (this.waitT > 0) { this.waitT -= dt; if (this.waitT <= 0) this.step(); }
        else if (this.waitFn) { if (this.waitFn()) { this.waitFn = null; this.step(); } }
        else this.step();
      } else {
        this.decide();
      }

      // 视线：看鼠标 / 看伙伴 / 看蝴蝶
      this.updateLook(dt);
      // 带着的东西
      if (this.carry) { const [hx, hy] = this.headPos; this.carry.x = hx + this.facing * 5 * G.S; this.carry.y = hy + 9 * G.S; }
    }

    decay(dt) {
      const m = (dt / 60) * (G.save.settings.pace || 1);
      const n = this.n, tr = this.tr;
      n.hunger -= m * 0.9 * (0.8 + tr.greedy * 0.5);
      n.thirst -= m * 1.2;
      n.bladder -= m * 0.7;
      if (this.sleeping) {
        n.energy += m * 2.6;
        n.battery += m * 1.5;
      } else {
        n.energy -= m * 0.45 * (0.7 + tr.lazy * 0.7) * (this.anim === 'run' ? 3 : 1);
        n.fun -= m * 0.9 * (0.5 + tr.playful);
        n.social -= m * 0.6 * (0.5 + tr.extro * 0.8 + tr.clingy * 0.4);
        n.battery += m * (this.partner || this.petting > 0 ? -1.2 : 1.0);
      }
      for (const k of NEED_KEYS) n[k] = U.clamp(n[k], 0, 100);
    }

    sleepiness() {
      const h = new Date().getHours();
      const base = this.sp.chrono[h];
      // 宠物会慢慢适应主人的作息：主人经常不在的时段，它更容易睡
      const ad = this.d.adapt[h] || 0;
      return U.clamp(base * 0.7 + ad * 0.3 + this.tr.lazy * 0.15, 0, 1);
    }

    // ---------- 决策：效用 AI + 随机性 ----------
    decide() {
      if (G.save.settings.peek && PP.F && PP.F.main() === this) { this.run('peekIdle', PP.ACTIONS.peekIdle); return; }
      const n = this.n, tr = this.tr, now = this.t;
      const userActive = Date.now() - G.user.lastActive < 60000 && G.mouse.onScreen;
      const quiet = G.save.settings.quiet;
      const others = G.pets.filter((p) => p !== this && !p.held);
      const sleepy = this.sleepiness();
      const sc = [];
      const add = (name, s) => { if (s > 0.001) sc.push([name, s]); };

      const asked = this.cooldown.ask > 0 ? 0.15 : 1; // 刚要过饭没人理，先去做别的
      add('eat', n.hunger < 62 ? Math.pow((62 - n.hunger) / 62, 0.8) * 1.6 * (0.8 + tr.greedy * 0.6) * asked : 0);
      add('drink', n.thirst < 60 ? ((60 - n.thirst) / 60) * 1.6 * asked : 0);
      add('toilet', n.bladder < 38 ? ((38 - n.bladder) / 38) * 2.4 : 0);
      // 夜里是真困；白天只是偶尔打个盹，而且别人都在睡时自己更想醒着
      const napping = others.filter((o) => o.sleeping).length;
      add('sleep', (n.energy < 30 ? (30 - n.energy) / 30 * 1.6 : 0) + sleepy * sleepy * 1.5 * (n.energy < 75 || sleepy > 0.7 ? 1 : 0.25) * (sleepy < 0.7 && napping >= 2 ? 0.4 : 1) - (userActive && tr.clingy > 0.6 ? 0.2 : 0));
      add('play', n.fun < 78 ? ((78 - n.fun) / 78) * (0.4 + tr.playful) * (n.energy > 25 ? 1 : 0.2) : 0);
      add('cursor_play', !quiet && userActive && n.fun < 72 && n.energy > 30 ? ((72 - n.fun) / 72) * (0.3 + tr.playful) * [0.2, 0.6, 1, 1.2, 1.3][this.affLevel] : 0);
      add('seek_user', !quiet && userActive && n.social < 65 ? ((65 - n.social) / 65) * (0.3 + tr.clingy) * [0.2, 0.6, 1, 1.2, 1.4][this.affLevel] : 0);
      add('social', others.length && n.social < 80 && n.battery > 30 ? ((80 - n.social) / 80) * (0.35 + tr.extro) : 0);
      add('alone', n.battery < 50 ? ((50 - n.battery) / 50) * (1.5 - tr.extro) : 0);
      add('groom', 0.06 + tr.neat * 0.12);
      add('wander', 0.22 + tr.curious * 0.25);
      add('idle', 0.28 + tr.lazy * 0.25);
      add('explore', tr.curious * 0.18);
      add('bug', G.ambient.bug && !G.ambient.bug.leaving ? (0.3 + tr.curious) * (0.3 + tr.playful) * 1.3 : 0);
      add('ball', PP.findItem('ball') && n.energy > 30 && !(this.cooldown.ball > 0) ? (0.2 + tr.playful) * 0.5 : 0);
      add('treat', PP.findItem('treat', (i) => !i.carriedBy) ? 2.5 : 0);
      add('holiday_food', PP.findItem('holiday') ? 1.2 : 0);
      add('gift', this.affLevel >= 2 && n.fun > 30 && !(this.cooldown.gift > 0) && G.items.filter((i) => i.type === 'gift').length < 2 ? 0.03 * this.affLevel : 0);
      add('special', 0.06 + tr.curious * 0.05);
      add('dirty', G.items.filter((i) => i.type === 'poop').length >= 2 && tr.neat > 0.55 && !(this.cooldown.dirty > 0) ? 0.4 : 0);
      if (this.d.species === 'hamster') add('stash', PP.findItem('food', (b) => b.level > 0.4) && n.hunger > 60 && this.d.stash < 6 && !(this.cooldown.stash > 0) ? 0.15 : 0);
      if (this.d.species === 'cat') add('knock', PP.findItem('cup', (c) => !c.data.pushed) ? 0.8 : 0);
      if (this.sulk > 0) { sc.length = 0; add('alone', 1); add('idle', 0.5); }

      // 平方放大紧急需求，同时保留随机性
      const choice = U.weighted(sc.map(([a, s]) => [a, s * s + 0.02]));
      const A = PP.ACTIONS[choice] || PP.ACTIONS.idle;
      this.run(choice, A);
    }

    updateLook(dt) {
      // 目标：鼠标 > 伙伴 > 蝴蝶 > 自己随便看看（扫视）
      const S = G.S;
      let tx = null, ty = null;
      const [hx, hy] = this.headPos;
      if (this.partner) { tx = this.partner.x; ty = this.partner.headPos[1]; }
      else if (G.ambient.bug && Math.abs(G.ambient.bug.x - this.x) < 300 && this.tr.curious > 0.4) { tx = G.ambient.bug.x; ty = G.ambient.bug.y; }
      else if (G.mouse.onScreen && Date.now() - G.mouse.lastMove < 8000) {
        if (Math.hypot(G.mouse.x - hx, G.mouse.y - hy) < 900) { tx = G.mouse.x; ty = G.mouse.y; }
      }
      const E = this.eyeS || (this.eyeS = { x: 0, y: 0, vx: 0, vy: 0, gx: 0, gy: 0, next: 0 });
      if (tx != null) {
        const dx = tx - hx, dy = ty - hy, d = Math.hypot(dx, dy) || 1;
        // 离得越远眼珠越靠边；很近时几乎居中（像在盯着你看）
        const k = Math.min(1, d / (60 * S / 2));
        E.gx = (dx / d) * k * 1.15; E.gy = (dy / d) * k * 1.15;
        if (!this.target && Math.abs(dx) > 60 * S && this.anim !== 'sleep' && Math.random() < dt * 0.5) this.facing = Math.sign(dx);
      } else {
        // 没东西可看：隔一会儿扫一眼别处
        E.next -= dt;
        if (E.next <= 0) { E.next = U.rand(0.8, 3.5); const a = Math.random() * Math.PI * 2, r = Math.random() < 0.4 ? 0 : U.rand(0.5, 1.1); E.gx = Math.cos(a) * r; E.gy = Math.sin(a) * r * 0.7; }
      }
      if (this.action === 'agentThink') { E.gx = -0.9; E.gy = -1; }
      // 眼球弹簧：快速但有一点点过冲，转动看起来是“滑”过去的
      const k = 160, c = 20;
      E.vx += (k * (E.gx - E.x) - c * E.vx) * dt; E.vy += (k * (E.gy - E.y) - c * E.vy) * dt;
      E.x += E.vx * dt; E.y += E.vy * dt;
      this.look = [E.x, E.y];
    }

    // ---------- 被拎起来 ----------
    pickUp() {
      this.interrupt();
      this.held = true; this.airborne = false; this.anim = 'held';
      this.heldT = 0; this.shake = 0; this.lastVx = 0;
      this.struggle = this.d.trust < 30 || (this.tr.timid > 0.7 && this.affLevel < 2);
      this.liftFrom = this.y; this.jolt(2.5, 0);
      if (this.struggle) this.line('heldDislike'); else if (U.chance(0.4)) this.line('heldLike');
      this.count('held');
    }
    updateHeld(dt) {
      const S = G.S, M = G.mouse;
      this.heldT += dt;
      // 头被鼠标拎着，身体像麻薯一样往下垂
      this.x = M.x; this.y = M.y + 21 * S;
      const vy = M.vy;
      this.stretch = U.clamp(this.stretch + (U.clamp(-vy / 900, -0.4, 0.6) + 0.35 - this.stretch) * dt * 6, 0, 1);
      // 晃动检测
      if (Math.sign(M.vx) !== Math.sign(this.lastVx) && Math.abs(M.vx) > 400) { this.shake += 1; this.lastVx = M.vx; }
      if (Math.abs(M.vx) > 400) this.lastVx = M.vx;
      this.shake = Math.max(0, this.shake - dt * 1.5);
      if (this.shake > 6) {
        this.dizzy = 6; this.shake = 0;
        this.say(U.pick(PP.LINES.dizzy));
        PP.events.found('dizzy');
        this.d.trust = Math.max(0, this.d.trust - 3);
      }
      if (this.heldT > 6 && !this.struggle && this.affLevel < 3) { this.struggle = true; this.line('heldDislike'); }
      this.jvsk += (-M.vx / 260 - this.jsk) * dt * 30; // 被甩的时候身体会晃
      this.anim = 'held';
      this.eyes = this.dizzy > 0 ? 'dizzy' : this.struggle ? 'strain' : this.affLevel >= 2 ? 'happy' : 'wide';
      this.mouth = this.struggle ? 'open' : 'w';
      this.facing = M.vx > 50 ? 1 : M.vx < -50 ? -1 : this.facing;
    }
    drop(vx, vy) {
      this.held = false; this.airborne = true;
      this.vx = U.clamp(vx, -1400, 1400) * 0.6; this.vy = U.clamp(vy, -1200, 1200) * 0.6;
      this.fallFrom = this.y; this.stretch = 0; this.thrown = true;
      this.anim = 'fall';
      if (Math.abs(vx) > 900 || vy < -900) { this.d.trust = Math.max(0, this.d.trust - 2); }
    }
    updateAir(dt) {
      this.vy += 2000 * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.fallFrom = Math.min(this.fallFrom, this.y);
      if (this.x < 20) { this.x = 20; this.vx = Math.abs(this.vx) * 0.5; }
      if (this.x > G.W - 20) { this.x = G.W - 20; this.vx = -Math.abs(this.vx) * 0.5; }
      this.anim = this.vy < 0 ? 'jump' : 'fall';
      this.eyes = this.vy > 300 ? 'wide' : this.eyes;
      if (this.y >= G.ground) {
        const h = G.ground - this.fallFrom;
        this.y = G.ground; this.airborne = false; this.vx = 0; this.vy = 0;
        this.squash = 0; this.jolt(-Math.min(7, 1.5 + h / 70), (Math.random() - 0.5) * 6);
        PP.puff(this.x, this.y, 4);
        if (!this.thrown) { this.anim = 'idle'; return; }
        this.thrown = false;
        if (h > 160 * G.S / 2) {
          if (this.d.species === 'cat') {
            this.run('landing', PP.ACTIONS.perfectLanding);
          } else this.run('landing', PP.ACTIONS.flop, h);
        } else {
          this.run('landing', PP.ACTIONS.land);
        }
      }
    }

    // ---------- 渲染 ----------
    render(ctx) {
      const S = G.S;
      let eyes = this.eyes, mouth = this.mouth;
      if (this.expr) { eyes = this.expr.eyes || eyes; mouth = this.expr.mouth || mouth; }
      if (this.dizzy > 0 && !this.sleeping) eyes = 'dizzy';
      if (this.blinking > 0 && (eyes === 'open' || eyes === 'wide' || eyes === 'angry')) eyes = this.blinking > 0.09 || this.blinking < 0.03 ? 'sleepy' : 'closed'; // 眨眼：半闭→闭→半闭
      const hol = PP.holiday();
      const hat = this.hat || (hol && hol.hat) || null;
      const buf = PP.SPR.drawPet({
        species: this.d.species, pal: this.pal, coatKey: this.d.shiny ? 'shiny' : this.d.coat, facing: this.facing, anim: this.anim, t: this.t,
        eyes, mouth, look: this.look, blush: this.blush || this.petting > 0, ears: this.ears, wag: this.wag,
        hat, cheeks: this.cheeks, squash: this.squash, stretch: this.stretch, struggle: this.struggle,
        transform: this.transform, lop: this.d.lop,
        jelly: { sy: 1 + this.jy, sx: 1 - this.jy * 0.55, skew: this.jsk + (this.purr > 0 ? Math.sin(this.t * 55) * 0.25 : 0), sway: this.tsw },
        heat: this.heat || 0, hunting: this.hunting, custom: this.d.custom || null,
      });
      const SS = S * (this.scaleMul || 1);
      const sink = this.peek ? 15 * S : 0; // 偷看模式：沉到屏幕底下，只露出半个脑袋
      const px = Math.round(this.x - 16 * SS), py = Math.round(this.y - 31 * SS + sink);
      if (sink) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, G.W, G.ground + 1); ctx.clip(); }
      PP.SPR.blit(ctx, buf, px, py, SS);
      if (sink) ctx.restore();
      if (this.d.shiny && Math.random() < 0.03) PP.fx({ x: this.x + U.rand(-12, 12) * S, y: this.y - U.rand(4, 26) * S, vy: -10, icon: 'sparkle', life: 0.8, s: 1 });
    }
    renderOverlay(ctx) {
      // 气泡 & 名字牌
      const S = G.S;
      const [hx, hy] = this.headPos;
      if (this.bubble) {
        const b = this.bubble;
        const a = U.clamp(Math.min(b.t / 0.12, (b.dur - b.t) / 0.3), 0, 1);
        const pop = b.t < 0.12 ? -4 * (1 - b.t / 0.12) : 0;
        ctx.globalAlpha = a;
        const by = this.y - 34 * S * (this.scaleMul || 1) + pop + (this.peek ? 15 * S : 0) - (this.d.note ? 30 : 0);
        if (b.icon) {
          const [iw, ih] = PP.SPR.iconSize(b.icon);
          const s = Math.max(2, S);
          const w = iw * s + 14, h = ih * s + 12;
          const x = Math.round(hx - w / 2), y = Math.round(by - h);
          bubbleBox(ctx, x, y, w, h, b.kind === 'think', hx);
          PP.SPR.drawIcon(ctx, b.icon, x + 7, y + 6, s);
        } else if (b.text) {
          ctx.font = PP.FONT(13);
          const w = Math.min(240, Math.ceil(ctx.measureText(b.text).width) + 18), h = 26;
          const x = Math.round(U.clamp(hx - w / 2, 4, G.W - w - 4)), y = Math.round(by - h);
          bubbleBox(ctx, x, y, w, h, false, hx);
          ctx.fillStyle = '#111'; ctx.textBaseline = 'middle';
          ctx.fillText(b.text, x + 9, y + h / 2 + 1, w - 18);
        }
        ctx.globalAlpha = 1;
      }
      const showName = G.save.settings.names === 'always' || (G.hoverPet === this && !this.held);
      if (showName) PP.drawPixelLabel(ctx, this.d.name, Math.round(this.x), Math.round(this.y + 6), { size: 12 });
    }
  }

  function bubbleBox(ctx, x, y, w, h, think, tx) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 2, y, w - 4, 2); ctx.fillRect(x + 2, y + h - 2, w - 4, 2);
    ctx.fillRect(x, y + 2, 2, h - 4); ctx.fillRect(x + w - 2, y + 2, 2, h - 4);
    const cx = Math.round(U.clamp(tx, x + 8, x + w - 8));
    if (think) {
      ctx.fillStyle = '#111'; ctx.fillRect(cx - 3, y + h + 2, 6, 6); ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1, y + h + 4, 2, 2);
      ctx.fillStyle = '#111'; ctx.fillRect(cx + 1, y + h + 10, 4, 4);
    } else {
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - 4, y + h - 2, 8, 2);
      ctx.fillStyle = '#111';
      ctx.fillRect(cx - 6, y + h - 2, 2, 4); ctx.fillRect(cx - 4, y + h + 2, 2, 2); ctx.fillRect(cx - 2, y + h + 4, 2, 2);
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - 4, y + h, 4, 2); ctx.fillRect(cx - 2, y + h + 2, 2, 2);
      ctx.fillStyle = '#111'; ctx.fillRect(cx, y + h, 2, 4);
    }
  }

  PP.initialRel = function (a, b) {
    const pair = [a.d.species, b.d.species].sort().join('-');
    const table = { 'cat-hamster': 30, 'fox-rabbit': 30, 'hamster-penguin': 55, 'dog-penguin': 60, 'cat-dog': 40 };
    const base = table[pair] != null ? table[pair] : 45;
    return U.clamp(base + (a.tr.extro + b.tr.extro - 1) * 20 + U.rand(-8, 8), 5, 80);
  };

  PP.Pet = Pet;
})();
