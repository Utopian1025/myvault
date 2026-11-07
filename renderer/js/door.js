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
    p.interrupt(); p.held = false; p.airborne = false;
    p.x = U.clamp(x != null ? x : U.rand(G.W * 0.25, G.W * 0.75), 40, G.W - 40); p.y = G.ground;
    p.inDoor = true;
    const go = () => p.run('emerge', PP.ACTIONS.emerge);
    if (delay) setTimeout(go, delay); else go();
  };
  // 宠物走回门里
  PP.petEnter = function (p, done) { p.interrupt(); p.held = false; p.airborne = false; p.y = G.ground; p.run('enterDoor', PP.ACTIONS.enterDoor, done); };

  PP.ACTIONS.emerge = function* () {
    const p = this, S = G.S;
    const door = PP.openDoor(p.x);
    p.facing = U.chance(0.5) ? 1 : -1; p.anim = 'idle'; p.eyes = 'open';
    yield () => door.phase === 'open';
    p.inDoor = false; p.doorClip = door;
    p.eyes = 'wide'; p.look = [p.facing, 0]; yield 0.35;
    p.eyes = 'open';
    yield p.goto(door.x + p.facing * 26 * S / 2 * 2);
    p.doorClip = null;
    door.phase = 'close';
    p.facing = -p.facing; yield 0.25; p.facing = -p.facing; // 回头看一眼门
    p.jolt(-2, 0);
    if (Math.random() < 0.5) { p._forceSay = true; p.say(U.pick(['出来啦！', '外面好亮', '（伸懒腰）', '今天也来陪你']), 2); p._forceSay = false; }
    p.anim = 'idle'; yield 0.6;
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
      else if (d.phase === 'opening' && d.t > OPEN) { d.phase = 'open'; d.t = 0; }
      else if (d.phase === 'open' && d.t > 6) { d.phase = 'close'; d.t = 0; } // 保险：别一直开着
      else if (d.phase === 'close') { if (d._c == null) { d._c = 0; } d._c += dt; if (d._c > OPEN) { d.phase = 'sink'; d.t = 0; } }
      else if (d.phase === 'sink' && d.t > RISE) d.dead = true;
    }
    for (let i = doors.length - 1; i >= 0; i--) if (doors[i].dead) doors.splice(i, 1);
  }

  // 0..1：门板打开的程度
  function openness(d) {
    if (d.phase === 'opening') return U.clamp(d.t / OPEN, 0, 1);
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
