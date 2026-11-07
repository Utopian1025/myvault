// 桌面猫的功能：追鼠标、摸头呼噜、打字拍键盘/过热、滚动扒卷纸、伸懒腰/喝水提醒、
// 自定义提醒、番茄钟、头顶便签、AI 思考/完成反应、看视频时躲角落偷看
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G, A = PP.ACTIONS;

  const F = (PP.F = {
    keys: [], heat: 0, heatSaid: false,
    roll: { len: 0, last: 0 },
    agent: { state: 'idle', since: 0 },
    pomo: { phase: 'off', end: 0, start: 0 },
    lastWater: Date.now(), lastStretch: Date.now(), firedToday: {},

    main() {
      // 主角：第一只猫（多只时取离鼠标最近、没在睡觉的）
      const cats = G.pets.filter((p) => !p.held);
      if (!cats.length) return null;
      return cats[0];
    },
    S() { return G.save.settings; },
    name() { return (G.save.settings.ownerName || '').trim(); },
    call(text) { const n = F.name(); return n ? `${n}，${text}` : text; },

    // ---------- 输入 ----------
    onKey() {
      const now = Date.now();
      F.keys.push(now);
      if (F.keys.length > 80) F.keys.shift();
      // 开始打字：猫过来拍键盘陪你
      const p = F.main();
      if (p && !p.sleeping && !p.peek && p.action !== 'knead' && !F.busy(p) && !(p.cooldown.type > 0)) {
        const recent = F.keys.filter((t) => now - t < 1500).length;
        if (recent >= 4) { p.cooldown.type = 20; p.run('knead', A.knead); }
      }
    },
    onWheel(dy) {
      const p = F.main();
      if (!p || p.sleeping || p.peek) return;
      F.roll.len = Math.min(F.roll.max(), F.roll.len + Math.min(60, Math.abs(dy) * 0.25 + 4));
      F.roll.last = Date.now();
      if (p.action !== 'rollPaper' && !F.busy(p)) p.run('rollPaper', A.rollPaper);
    },
    setAgent(state, text) {
      F.agent = { state, since: Date.now(), text };
      const p = F.main();
      if (!p) return;
      if (state === 'thinking') { if (p.action !== 'agentThink') { p.peekPop = 1; p.run('agentThink', A.agentThink); } }
      else if (state === 'done') { p.peekPop = 1; p.run('agentDone', A.agentDone, text); PP.diary.add(p, 'AI 帮主人做完了一件事，我跳起来告诉主人了。'); }
      else if (state === 'error') { p.peekPop = 1; p.run('agentDone', A.agentDone, text, true); }
      else if (p.action === 'agentThink') p.interrupt();
    },
    busy(p) { return ['agentThink', 'agentDone', 'bigStretch', 'remind', 'held', 'landing', 'hunt'].includes(p.action) || p.held || p.airborne; },

    // ---------- 每帧 ----------
    tick(dt) {
      const now = Date.now();
      const p = F.main();
      // 打字过热：每秒键数持续很高 → 变红冒烟
      const kps = F.keys.filter((t) => now - t < 3000).length / 3;
      if (kps > 6) F.heat = Math.min(1, F.heat + dt * 0.18 * (kps / 6));
      else F.heat = Math.max(0, F.heat - dt * 0.12);
      if (p) {
        p.heat = F.heat;
        if (F.heat > 0.55 && Math.random() < dt * 6) {
          const [hx, hy] = p.headPos;
          PP.fx({ kind: 'dot', x: hx + U.rand(-8, 8) * G.S / 2, y: hy - 12 * G.S, vx: U.rand(-8, 8), vy: -U.rand(25, 45), life: 1.1, col: '#ffffff', size: G.S * 2 });
        }
        if (F.heat > 0.95 && !F.heatSaid) { F.heatSaid = true; p._forceSay = true; p.say(U.pick(['好烫好烫！打太快啦', '键盘要冒烟了…', '慢一点慢一点']), 3); p._forceSay = false; PP.events.found('overheat'); }
        if (F.heat < 0.3) F.heatSaid = false;
      }
      // 卷纸：停止滚动后慢慢卷回去
      if (now - F.roll.last > 1400) F.roll.len = Math.max(0, F.roll.len - dt * 260);
    },

    // 每秒检查：提醒、番茄钟
    second() {
      const s = F.S(), now = Date.now(), p = F.main();
      if (!p) return;
      const userHere = now - G.user.lastActive < 3 * 60000;
      const quietPomo = F.pomo.phase === 'focus';
      // 喝水
      if (s.rem.water > 0 && userHere && now - F.lastWater > s.rem.water * 60000 && !quietPomo) {
        F.lastWater = now; p.peekPop = 1; p.run('remindDrink', A.remindDrink);
      }
      // 伸懒腰（变大）
      if (s.rem.stretch > 0 && userHere && now - F.lastStretch > s.rem.stretch * 60000 && !quietPomo) {
        F.lastStretch = now; p.peekPop = 1; p.run('bigStretch', A.bigStretch, F.call('起来伸个懒腰吧！'));
      }
      // 自定义提醒（每天 HH:MM）
      const d = new Date(), hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, day = U.dateKey(d);
      for (const r of s.rem.list || []) {
        if (!r.on || r.time !== hm) continue;
        const k = day + r.time + r.text;
        if (F.firedToday[k]) continue;
        F.firedToday[k] = true;
        p.peekPop = 1; p.run('remind', A.remind, F.call(r.text));
      }
      // 番茄钟
      if (F.pomo.phase !== 'off' && now >= F.pomo.end) {
        if (F.pomo.phase === 'focus') {
          F.pomo = { phase: 'break', start: now, end: now + s.pomo.brk * 60000 };
          p.peekPop = 1; p.run('bigStretch', A.bigStretch, F.call('专注结束！休息一下～'));
          PP.diary.add(p, '陪主人专注了一个番茄钟。', 'love');
        } else {
          F.pomo = { phase: 'focus', start: now, end: now + s.pomo.focus * 60000 };
          p.peekPop = 1; p.run('remind', A.remind, F.call('休息结束，继续加油！'));
        }
      }
    },
    pomoStart() { const s = F.S(); F.pomo = { phase: 'focus', start: Date.now(), end: Date.now() + s.pomo.focus * 60000 }; const p = F.main(); if (p) { p._forceSay = true; p.say('开始专注！我在旁边陪你', 2.5); p._forceSay = false; } },
    pomoStop() { F.pomo = { phase: 'off', end: 0, start: 0 }; },

    // ---------- 画 ----------
    render(ctx) {
      const p = F.main();
      const S = G.S;
      // 卷纸
      if (p && F.roll.len > 1) {
        const dir = p.facing || 1;
        const rx = p.x + dir * 3 * S, ry = p.y - 7 * S;
        const len = F.roll.len;
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#2a2026';
        // 从爪子垂到地上，再沿地面铺开
        const drop = Math.min(len, p.y - ry);
        const run = Math.max(0, len - drop);
        const w = 5 * S;
        px(ctx, rx - w / 2, ry, w, drop, '#ffffff');
        px(ctx, dir > 0 ? rx - w / 2 : rx + w / 2 - run, p.y - S * 2, run + (dir > 0 ? 0 : 0), S * 2, '#ffffff');
        // 虚线打孔
        ctx.fillStyle = '#d7d2dc';
        for (let y = ry + 6 * S; y < ry + drop; y += 6 * S) ctx.fillRect(rx - w / 2, y, w, Math.max(1, S / 2));
        for (let i = 6 * S; i < run; i += 6 * S) ctx.fillRect(dir > 0 ? rx - w / 2 + i : rx + w / 2 - i, p.y - S * 2, Math.max(1, S / 2), S * 2);
        // 描边
        ctx.fillStyle = '#2a2026';
        ctx.fillRect(rx - w / 2 - 1, ry, 1, drop); ctx.fillRect(rx + w / 2, ry, 1, drop);
        // 纸卷本体
        px(ctx, rx - 4 * S, ry - 3 * S, 8 * S, 5 * S, '#ffffff', true);
        px(ctx, rx - 1 * S, ry - 1.5 * S, 2 * S, 2 * S, '#c9c4d2');
      }
      // 番茄钟
      if (p && F.pomo.phase !== 'off') {
        const left = Math.max(0, F.pomo.end - Date.now());
        const mm = String(Math.floor(left / 60000)).padStart(2, '0'), ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
        const label = (F.pomo.phase === 'focus' ? '专注 ' : '休息 ') + mm + ':' + ss;
        const x = U.clamp(p.x + (p.x > G.W - 140 ? -60 : 60) * S / 2, 50, G.W - 50), y = p.y - 30 * S;
        const [w] = PP.drawPixelLabel(ctx, label, x, y, { size: 12, bg: F.pomo.phase === 'focus' ? '#ff6b5a' : '#7be0a0', fg: '#111' });
        const total = (F.pomo.phase === 'focus' ? F.S().pomo.focus : F.S().pomo.brk) * 60000;
        const prog = 1 - left / total;
        ctx.fillStyle = '#111'; ctx.fillRect(x - w / 2, y + 23, w, 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - w / 2 + 1, y + 24, (w - 2) * prog, 2);
      }
      // 头顶便签
      for (const q of G.pets) {
        if (!q.d.note) continue;
        const [hx, hy] = q.headPos;
        const top = q.y - (q.scaleMul || 1) * 37 * S - (q.bubble ? 34 : 0) + (q.peek ? 15 * S : 0);
        PP.drawPixelLabel(ctx, q.d.note, Math.round(q.x), Math.round(top), { size: 12, bg: '#fff3a6' });
        // 小图钉
        ctx.fillStyle = '#ff5a5a'; ctx.fillRect(Math.round(q.x) - 2, Math.round(top) - 3, 4, 4);
      }
    },
  });
  F.roll.max = () => Math.max(200, G.W * 0.45);

  function px(ctx, x, y, w, h, col, outline) {
    if (outline) { ctx.fillStyle = '#2a2026'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2); }
    ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // ---------- 行为 ----------
  // 追鼠标：鼠标甩得快，猫压低身子、瞳孔放大、扭屁股，然后扑过去
  A.hunt = function* () {
    const p = this;
    p.hunting = true;
    for (let k = 0; k < 3; k++) {
      const M = G.mouse;
      p.facing = Math.sign(M.x - p.x) || p.facing;
      p.anim = 'crouch'; yield U.rand(0.5, 0.9);
      p.airborne = true; p.thrown = false;
      p.vy = -Math.min(900, 300 + Math.max(0, G.ground - M.y) * 2.6); p.vx = U.clamp((M.x - p.x) * 2.4, -700, 700); p.fallFrom = p.y;
      yield () => !p.airborne;
      p.jolt(-3, 0);
      yield 0.3;
      if (Math.hypot(G.mouse.vx, G.mouse.vy) < 900) break;
    }
    p.hunting = false; p.anim = 'idle';
    if (Math.random() < 0.4) p.say(U.pick(['抓到了！', '差一点…', '（假装没在追）']), 1.8);
    p.n.fun = Math.min(100, p.n.fun + 15);
    PP.events.found('hunt');
  };

  // AI 在思考：托腮、眼睛往上看、头上冒点点点
  A.agentThink = function* () {
    const p = this;
    p.peek = false;
    p.anim = 'think'; p.eyes = 'open'; p.mouth = 'none';
    let t = 0;
    while (F.agent.state === 'thinking' && t < 1800) {
      if (t % 3 === 0) p.think('dots', 2.6);
      yield 1; t += 1;
      if (t % 7 === 0) p.setExpr('closed', 'none', 0.25);
    }
    p.anim = 'idle'; p.mouth = 'w';
  };
  // AI 做完了：开心地跳起来喵一声
  A.agentDone = function* (text, err) {
    const p = this;
    p.peek = false;
    if (err) { p.setExpr('sad', 'frown', 2); p._forceSay = true; p.say(text || '好像出错了…', 3.5); p._forceSay = false; PP.audio.meow(p, true); yield 2.5; return; }
    p.anim = 'idle'; p.eyes = 'happy'; p.mouth = 'open';
    for (let i = 0; i < 2; i++) {
      p.jolt(-2.5, 0); yield 0.12;
      p.airborne = true; p.thrown = false; p.vy = -520; p.vx = 0; p.fallFrom = p.y;
      yield () => !p.airborne; p.jolt(-3.5, 0); yield 0.15;
    }
    PP.audio.meow(p);
    p._forceSay = true; p.say(text || F.call('做完啦！'), 3.5); p._forceSay = false;
    PP.hearts(p.x, p.headPos[1] - 20, 2);
    yield 2; p.eyes = 'open'; p.mouth = 'w';
    F.agent.state = 'idle';
  };

  // 滚动页面：猫抱着卷纸往下扒
  A.rollPaper = function* () {
    const p = this;
    p.anim = 'roll'; p.eyes = 'open'; p.look = [0, 1];
    while (F.roll.len > 1) {
      p.anim = Date.now() - F.roll.last < 500 ? 'roll' : 'idle';
      yield 0.1;
    }
    p.anim = 'idle';
    PP.events.found('roll');
  };

  // 伸懒腰提醒：猫一下子变大，伸个大懒腰
  A.bigStretch = function* (text) {
    const p = this;
    p.peek = false;
    p.scaleMul = 2; p.jolt(4, 0);
    p.anim = 'idle'; p.eyes = 'open';
    PP.audio.meow(p);
    p._forceSay = true; p.say(text || F.call('起来伸个懒腰吧！'), 6); p._forceSay = false;
    yield 1.2;
    p.anim = 'stretch'; p.eyes = 'closed'; p.mouth = 'yawn'; yield 2.2;
    p.anim = 'idle'; p.eyes = 'happy'; p.mouth = 'w'; yield 1.6;
    p.scaleMul = 1; p.jolt(-4, 0);
    p.eyes = 'open'; yield 0.6;
    PP.events.found('break_care');
  };

  // 喝水提醒：自己先去喝，再回头提醒你
  A.remindDrink = function* () {
    const p = this;
    p.peek = false;
    const bowl = PP.findItem('water');
    if (bowl) {
      yield p.goto(bowl.x);
      p.anim = 'drink'; p.eyes = 'closed'; yield 2.4;
      bowl.level = Math.max(0, bowl.level - 0.05); p.n.thirst = 100;
    }
    p.anim = 'idle'; p.eyes = 'open'; p.look = [0, -1];
    PP.audio.meow(p);
    p._forceSay = true; p.say(F.call('该喝水啦～'), 6); p._forceSay = false;
    p.jolt(-2.5, 0);
    yield 4;
  };

  // 通用提醒：跳一下、喵一声、叫你的名字
  A.remind = function* (text) {
    const p = this;
    p.peek = false;
    p.eyes = 'wide'; p.jolt(-3, 0); yield 0.15;
    p.airborne = true; p.thrown = false; p.vy = -420; p.fallFrom = p.y;
    yield () => !p.airborne;
    p.eyes = 'open'; p.look = [0, -1];
    PP.audio.meow(p);
    p._forceSay = true; p.say(text, 8); p._forceSay = false;
    yield 6;
  };

  // 看视频模式：躲到屏幕右下角，只露半个脑袋偷看
  A.peekIdle = function* () {
    const p = this;
    yield p.goto(G.W - 26 * G.S / 2);
    p.facing = -1;
    p.peek = true; p.anim = 'idle';
    while (G.save.settings.peek) { yield 1; if (Math.random() < 0.05) p.setExpr('closed', 'w', 0.2); }
    p.peek = false;
  };

  // 摸头呼噜（在 interact 里调用）
  F.purr = function (p) {
    p.purr = Math.max(p.purr, 1.4);
    if (!(p.cooldown.purrText > 0)) {
      p.cooldown.purrText = 1.2;
      const [hx, hy] = p.headPos;
      PP.fx({ kind: 'text', text: U.pick(['呼噜', '咕噜噜', '呼噜噜']), x: hx + U.rand(-10, 10), y: hy - 18 * G.S, vy: -18, life: 1, style: { size: 10, shadow: false } });
      PP.events.found('purr');
    }
    if (G.save.settings.sound) PP.audio.purr(p);
  };
})();
