// 小门：宠物们住在电脑里，出来/回去都要走屏幕上的一扇小门
// 门从屏幕底边升起 → 打开（里面是发光的“电脑内部”）→ 宠物走出来 / 走进去 → 关门 → 沉回去
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  const doors = (PP.doors = []);

  const DW = 22, DH = 31; // 门的逻辑尺寸（像素格）
  const RISE = 0.35, OPEN = 0.3;

  PP.openDoor = function (x, o = {}) {
    const d = Object.assign({ x: U.clamp(x, 30, G.W - 30), t: 0, phase: 'rise', hold: 0, seed: Math.random() * 99 }, o);
    doors.push(d);
    return d;
  };

  // 宠物从门里出来
  PP.petEmerge = function (p, x, delay = 0) {
    // 小岛上：不用电脑小门，直接从小屋里推门出来
    if (G.isle && PP.isle && PP.isle.doorX) { p.interrupt(true); p.held = false; p.airborne = false; p.inDoor = false; p.x = PP.isle.doorX(); p.y = G.ground; p.run('isleOut', PP.ACTIONS.isleOut); return; }
    p.interrupt(true); p.held = false; p.airborne = false;
    p.x = U.clamp(x != null ? x : U.rand(G.W * 0.25, G.W * 0.75), 40, G.W - 40); p.y = G.ground;
    p.inDoor = true;
    const go = () => p.run('emerge', PP.ACTIONS.emerge);
    if (delay) setTimeout(go, delay); else go();
  };
  // 宠物走回门里
  PP.petEnter = function (p, done) { if (G.isle && PP.isle && PP.isle.doorX && !p.outing) { p.interrupt(true); p.held = false; p.airborne = false; p.y = G.ground; p.run('isleIn', function* () { yield this.goto(PP.isle.doorX()); this.inDoor = true; done && done(); }); return; } if (p.outing) { p.outing = null; p.interrupt(true); p.inDoor = true; done && done(); return; } p.interrupt(true); p.held = false; p.airborne = false; p.y = G.ground; p.run('enterDoor', PP.ACTIONS.enterDoor, done); };

  // 每种动物出门的样子都不一样
  const STYLE = { cat: 'peek', dog: 'burst', rabbit: 'binky', frog: 'leap', hamster: 'scurry', penguin: 'slide', fox: 'pounce', dragon: 'fly', chick: 'tumble', duck: 'waddle', pig: 'sniff', capybara: 'chill', hedgehog: 'roll' };
  const LINES = {
    peek: ['（左看看右看看）', '喵～', '（伸了个懒腰）'], burst: ['汪！我来啦！', '汪汪！！'], binky: ['（开心地蹦了一下）'], leap: ['呱！'], scurry: ['吱！'],
    slide: ['（滑——）', '嘎～'], pounce: ['嘿！', '（猛地一扑）'], fly: ['呼——'], tumble: ['叽叽！', '（摔了个跟头）'], waddle: ['嘎嘎！'], sniff: ['哼哼～', '（闻到了好吃的？）'],
    chill: ['……', '（慢悠悠）'], roll: ['（骨碌碌）', '（探出小脑袋）'],
  };
  // 原地跳一下（用 hopY 抬高身体）
  function* bounce(p, h, dur, anim = 'jump') {
    const n = Math.max(4, Math.round(dur / 0.033));
    for (let k = 1; k <= n; k++) { p.y = G.ground - Math.sin((k / n) * Math.PI) * h * G.S / 2; p.anim = anim; yield dur / n; }
    p.y = G.ground; p.anim = 'idle'; p.jolt(-3, 0);
  }
  // 沿弧线跳/滑到 tx
  function* arc(p, tx, h, dur, anim = 'jump') {
    const sx = p.x, n = Math.max(4, Math.round(dur / 0.033));
    p.facing = Math.sign(tx - sx) || p.facing;
    for (let k = 1; k <= n; k++) { const a = k / n; p.x = sx + (tx - sx) * a; p.y = G.ground - Math.sin(a * Math.PI) * h * G.S / 2; p.anim = anim; yield dur / n; }
    p.y = G.ground; p.anim = 'idle'; p.squash = Math.max(p.squash || 0, 0.6); p.jolt(-2, 0);
  }

  PP.ACTIONS.emerge = function* () {
    const p = this, S = G.S;
    const style = STYLE[p.d.species] || 'walk';
    const door = PP.openDoor(p.x, { slow: style === 'chill' });
    p.facing = U.chance(0.5) ? 1 : -1; p.anim = 'idle'; p.eyes = 'open';
    yield () => door.phase === 'open';
    p.inDoor = false; p.doorClip = door;
    const out = door.x + p.facing * 26 * S;
    const far = door.x + p.facing * 44 * S;
    switch (style) {
      case 'peek': // 猫：先探头左右看，确认安全才出来，坐下伸个懒腰
        p.anim = 'crouch'; p.look = [-p.facing, 0]; yield 0.45; p.look = [p.facing, 0]; yield 0.45; p.eyes = 'wide'; yield 0.25; p.eyes = 'open';
        yield p.goto(out); p.anim = 'sit'; yield 0.4; p.eyes = 'happy'; yield 0.5; p.eyes = 'open'; break;
      case 'burst': // 狗：冲出来，跑一段，跳一下
        yield p.goto(far, true); yield* bounce(p, 10, 0.32); yield* bounce(p, 7, 0.26); break;
      case 'binky': // 兔子：蹦出来，空中一扭
        yield p.goto(out); yield* bounce(p, 14, 0.42); p.jolt(-2, 4); break;
      case 'leap': // 青蛙：蹲下蓄力，一大跳跳出来
        p.anim = 'crouch'; yield 0.45; yield* arc(p, far, 20, 0.55); break;
      case 'scurry': // 仓鼠：飞快探头闻闻，然后一溜烟跑出来
        for (let i = 0; i < 3; i++) { p.look = [i % 2 ? p.facing : -p.facing, 0]; p.anim = 'eat'; yield 0.18; p.anim = 'idle'; yield 0.12; }
        yield p.goto(out, true); break;
      case 'slide': // 企鹅：肚皮着地滑出来
        p.anim = 'crouch'; yield 0.25; yield* arc(p, far, 0, 0.6, 'lie'); p.anim = 'idle'; yield 0.2; break;
      case 'pounce': // 狐狸：压低身子扭扭屁股，扑出来
        p.anim = 'crouch'; for (let i = 0; i < 4; i++) { p.jolt(0, i % 2 ? 2 : -2); yield 0.12; } yield* arc(p, far, 16, 0.42); break;
      case 'fly': // 小龙：飞出来，绕一下落地
        yield* arc(p, far, 34, 0.9); for (let i = 0; i < 4; i++) PP.fx({ kind: 'icon', icon: 'sparkle', x: p.x + U.rand(-14, 14) * S, y: p.y - U.rand(6, 26) * S, vy: -12, life: 0.9, s: 1 }); break;
      case 'tumble': // 小鸡：连滚带爬地跌出来
        yield* arc(p, door.x + p.facing * 12 * S, 5, 0.22, 'roll'); yield* arc(p, out, 4, 0.22, 'roll'); p.anim = 'sit'; yield 0.3; p.eyes = 'dizzy'; yield 0.4; p.eyes = 'open'; yield* bounce(p, 5, 0.2); break;
      case 'waddle': // 鸭子：一摇一摆走出来
        yield p.goto(out); for (let i = 0; i < 3; i++) { p.jolt(0, i % 2 ? 3 : -3); yield 0.15; } break;
      case 'sniff': // 小猪：先用鼻子拱拱门口，再出来
        for (let i = 0; i < 3; i++) { p.anim = 'eat'; yield 0.25; p.anim = 'idle'; yield 0.15; } yield p.goto(out); break;
      case 'chill': // 卡皮巴拉：慢——慢——地走出来，直接坐下
        yield 0.6; yield p.goto(door.x + p.facing * 22 * S); p.anim = 'sit'; p.eyes = 'happy'; yield 1.0; p.eyes = 'open'; break;
      case 'roll': // 刺猬：缩成球滚出来，再慢慢打开
        yield* arc(p, far, 3, 0.75, 'curl'); p.anim = 'curl'; yield 0.5; p.anim = 'idle'; p.jolt(-4, 0); break;
      default: yield p.goto(out);
    }
    p.doorClip = null;
    door.phase = 'close';
    if (style !== 'chill') { p.facing = -p.facing; yield 0.25; p.facing = -p.facing; } // 回头看一眼门
    if (Math.random() < 0.6) { p._forceSay = true; p.say(U.pick(Math.random() < 0.5 ? LINES[style] || ['出来啦！'] : ['出来啦！', '外面好亮', '今天也来陪你']), 2); p._forceSay = false; }
    p.anim = p.anim === 'sit' ? 'sit' : 'idle'; yield 0.6;
  };
  PP.ACTIONS.enterDoor = function* (done) {
    const p = this, S = G.S;
    const side = p.x > G.W - 80 ? -1 : 1;
    const door = PP.openDoor(p.x + side * 28 * S);
    yield () => door.phase === 'open';
    if (Math.random() < 0.6) { p._forceSay = true; p.say(U.pick(['我先回去休息啦', '拜拜～', '回家睡觉咯']), 1.8); p._forceSay = false; }
    p.doorClip = door;
    yield p.goto(door.x);
    p.facing = -side; yield 0.2; // 转身挥挥手
    p.jolt(-2, 0); yield 0.3;
    p.inDoor = true; p.doorClip = null;
    door.phase = 'close';
    yield 0.6;
    done && done(); // 保持 inDoor，直到下次从门里出来
  };

  function update(dt) {
    for (const d of doors) {
      d.t += dt;
      if (d.phase === 'rise' && d.t > RISE) { d.phase = 'opening'; d.t = 0; }
      else if (d.phase === 'opening' && d.t > OPEN * (d.slow ? 3 : 1)) { d.phase = 'open'; d.t = 0; }
      else if (d.phase === 'open' && d.t > 6) { d.phase = 'close'; d.t = 0; } // 保险：别一直开着
      else if (d.phase === 'close') { if (d._c == null) { d._c = 0; } d._c += dt; if (d._c > OPEN) { d.phase = 'sink'; d.t = 0; } }
      else if (d.phase === 'sink' && d.t > RISE) d.dead = true;
    }
    for (let i = doors.length - 1; i >= 0; i--) if (doors[i].dead) doors.splice(i, 1);
  }

  // 0..1：门板打开的程度
  function openness(d) {
    if (d.phase === 'opening') return U.clamp(d.t / (OPEN * (d.slow ? 3 : 1)), 0, 1);
    if (d.phase === 'open') return 1;
    if (d.phase === 'close') return 1 - U.clamp((d._c || 0) / OPEN, 0, 1);
    return 0;
  }
  // 0..1：从地面升起的高度
  function rise(d) {
    if (d.phase === 'rise') return U.clamp(d.t / RISE, 0, 1);
    if (d.phase === 'sink') return 1 - U.clamp(d.t / RISE, 0, 1);
    return 1;
  }
  function geom(d) {
    const S = G.S, w = DW * S, h = DH * S;
    const r = rise(d);
    const e = r < 1 ? 1 - Math.pow(1 - r, 3) : 1;
    return { x: Math.round(d.x - w / 2), y: Math.round(G.ground - h * e), w, h, vis: Math.round(h * e), S };
  }

  // 门洞（门后面的“电脑内部”）——画在宠物下面
  function renderBack(ctx) {
    for (const d of doors) {
      const g = geom(d), S = g.S, o = openness(d);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, G.W, G.ground); ctx.clip();
      // 地上的光
      if (o > 0) { ctx.globalAlpha = 0.35 * o; ctx.fillStyle = '#9fe8ff'; ctx.fillRect(g.x - 4 * S, G.ground - S, g.w + 8 * S, S); ctx.globalAlpha = 1; }
      // 门洞：深色 + 一列列往上滚的“代码”像素
      ctx.fillStyle = '#141a33'; ctx.fillRect(g.x + S, g.y + S, g.w - 2 * S, g.h - S);
      if (o > 0) {
        const cols = DW - 4;
        for (let i = 0; i < cols; i++) {
          const sp = 3 + ((i * 7 + d.seed) % 5);
          for (let k = 0; k < 4; k++) {
            const yy = ((G.t * sp * 6 + k * 6 + i * 3 + d.seed) % (DH - 2));
            const a = (k === 0 ? 0.9 : 0.35) * o;
            ctx.globalAlpha = a; ctx.fillStyle = i % 3 === 0 ? '#7cf0b4' : '#5ad2ff';
            ctx.fillRect(g.x + (i + 2) * S, g.y + g.h - (yy + 2) * S, S, S);
          }
        }
        ctx.globalAlpha = 1;
        // 门洞里的光晕
        ctx.globalAlpha = 0.18 * o; ctx.fillStyle = '#9fe8ff'; ctx.fillRect(g.x + 2 * S, g.y + 2 * S, g.w - 4 * S, g.h - 2 * S); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  // 门框 + 门板 —— 画在宠物上面（宠物站在门洞里时像是从里面走出来）
  function renderFront(ctx) {
    for (const d of doors) {
      const g = geom(d), S = g.S, o = openness(d);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, G.W, G.ground); ctx.clip();
      const K = '#231c20', F = '#ffffff';
      // 白色贴纸描边 + 深色门框
      ctx.fillStyle = F; ctx.fillRect(g.x - 2 * S, g.y - 2 * S, g.w + 4 * S, 2 * S); ctx.fillRect(g.x - 2 * S, g.y, 2 * S, g.h); ctx.fillRect(g.x + g.w, g.y, 2 * S, g.h);
      ctx.fillStyle = K; ctx.fillRect(g.x - S, g.y - S, g.w + 2 * S, S); ctx.fillRect(g.x - S, g.y, S, g.h); ctx.fillRect(g.x + g.w, g.y, S, g.h);
      ctx.fillStyle = '#ffcf5a'; ctx.fillRect(g.x, g.y, g.w, S); ctx.fillRect(g.x, g.y, S, g.h); ctx.fillRect(g.x + g.w - S, g.y, S, g.h);
      // 门板：往外开（越开越窄）
      const pw = Math.round((g.w - 2 * S) * (1 - o) / S) * S;
      if (pw > 0) {
        const px = g.x + S;
        ctx.fillStyle = K; ctx.fillRect(px, g.y + S, pw, g.h - S);
        ctx.fillStyle = '#f2f0f7'; ctx.fillRect(px + (pw > 2 * S ? S : 0), g.y + 2 * S, Math.max(S, pw - (pw > 2 * S ? 2 * S : 0)), g.h - 2 * S);
        if (pw > 6 * S) {
          // 门上的小屏幕窗 + 门把手：住在电脑里的门
          ctx.fillStyle = K; ctx.fillRect(px + 2 * S, g.y + 4 * S, pw - 4 * S, 6 * S);
          ctx.fillStyle = '#5ad2ff'; ctx.fillRect(px + 3 * S, g.y + 5 * S, pw - 6 * S, 4 * S);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(px + 3 * S, g.y + 5 * S, S, S);
          ctx.fillStyle = K; ctx.fillRect(px + pw - 4 * S, g.y + 13 * S, 2 * S, 2 * S);
        }
      }
      ctx.restore();
    }
  }

  PP.doorsUpdate = update;
  PP.doorsRenderBack = renderBack;
  PP.doorsRenderFront = renderFront;
})();
