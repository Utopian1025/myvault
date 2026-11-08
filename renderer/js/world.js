// 世界：全局状态、物品、粒子、环境（季节、虫子、流星）
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U;

  const G = (PP.G = {
    W: 800, H: 600, ground: 590,
    t: 0,
    pets: [], // 正在显示的
    all: [],  // 所有宠物（包括“放假中”不显示的）
    items: [],
    particles: [],
    ambient: { bug: null, nextBug: 120, nextStar: 60, nextCup: 900 },
    mouse: { x: -999, y: -999, vx: 0, vy: 0, down: false, moved: 0, lastMove: 0, still: 0, onScreen: false },
    user: { lastActive: Date.now(), activeSince: Date.now(), typing: false, typingSince: 0, lastKey: 0, away: false, awayFrom: 0 },
    save: null, // 持久化数据（见 save.js）
    get S() { return (G.save && G.save.settings.size) || 2; },
  });

  // ---------- 物品 ----------
  PP.Item = class Item {
    constructor(o) {
      Object.assign(this, { id: U.uid(), type: 'ball', x: 100, y: 0, vx: 0, vy: 0, level: 1, held: false, carriedBy: null, life: Infinity, data: {} }, o);
      if (!this.y) this.y = PP.itemFloor ? PP.itemFloor(this) : G.ground;
    }
    get sprite() {
      switch (this.type) {
        case 'food': return 'bowl_food';
        case 'water': return 'bowl_water';
        case 'bed': return 'bed';
        case 'litter': return 'litter';
        case 'poop': return 'poop';
        case 'ball': return 'ball';
        case 'treat': return this.data.sprite || 'treat_fish';
        case 'gift': return this.data.gift || 'leaf';
        case 'cup': return 'cup';
        case 'egg': return this.data.crack ? 'egg_crack' : 'egg';
        case 'holiday': return this.data.sprite;
        case 'cake': return 'cake';
        default: return this.type;
      }
    }
    size() {
      const [w, h] = PP.SPR.itemSize(this.sprite, this.level);
      return [w * G.S, h * G.S];
    }
    hit(mx, my) {
      const [w, h] = this.size();
      const pad = 6;
      return mx >= this.x - w / 2 - pad && mx <= this.x + w / 2 + pad && my >= this.y - h - pad && my <= this.y + pad;
    }
    update(dt) {
      if (this.held || this.carriedBy) return;
      const physical = ['ball', 'treat', 'gift', 'cup', 'holiday', 'poop'].includes(this.type);
      const fl = PP.itemFloor ? PP.itemFloor(this) : G.ground;
      if (!physical) { this.y = fl; return; }
      if (this.y < fl || this.vy !== 0 || this.vx !== 0) {
        this.vy += 1400 * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.y >= fl) {
          this.y = fl;
          if (Math.abs(this.vy) > 120 && this.type === 'ball') { this.vy = -this.vy * 0.55; }
          else this.vy = 0;
          this.vx *= this.type === 'ball' ? 0.92 : 0.6;
          if (Math.abs(this.vx) < 6) this.vx = 0;
        }
        // 墙
        if (this.type === 'cup' && this.data.pushed) {
          // 被推下屏幕的杯子：越界就消失
          if (this.x < -40 || this.x > G.W + 40) this.dead = true;
        } else {
          if (this.x < 12) { this.x = 12; this.vx = Math.abs(this.vx) * 0.6; }
          if (this.x > G.W - 12) { this.x = G.W - 12; this.vx = -Math.abs(this.vx) * 0.6; }
        }
      }
      if (this.life !== Infinity) { this.life -= dt; if (this.life <= 0) this.dead = true; }
    }
    render(ctx) {
      if (this.carriedBy) return;
      const S = G.S;
      const name = this.sprite;
      const [w, h] = PP.SPR.itemSize(name, this.level);
      let x = this.x - (w * S) / 2, y = this.y - h * S;
      if (this.type === 'egg' && this.data.wobble > 0) x += Math.sin(G.t * 40) * 2;
      // 白色贴纸描边（跟宠物一致）
      ctx.save();
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
      drawItemWithRim(ctx, name, x, y, S, this.level);
      if ((this.type === 'food' || this.type === 'water') && this.level < 0.05 && Math.floor(G.t * 2) % 2 === 0) {
        PP.SPR.drawIcon(ctx, 'excl', this.x - 2 * S, y - 9 * S, S);
      }
    }
  };

  // 物品也画一圈白描边
  const rimCache = new Map();
  function drawItemWithRim(ctx, name, x, y, S, lvl) {
    const key = name + '|' + (typeof lvl === 'number' ? Math.round(lvl * 3) : '') + '|' + S;
    let cv = rimCache.get(key);
    if (!cv) {
      const [w, h] = PP.SPR.itemSize(name, lvl);
      cv = document.createElement('canvas');
      cv.width = (w + 2) * S; cv.height = (h + 2) * S;
      const c = cv.getContext('2d');
      // 先画白色轮廓
      const tmp = document.createElement('canvas');
      tmp.width = cv.width; tmp.height = cv.height;
      const tc = tmp.getContext('2d');
      PP.SPR.drawItem(tc, name, S, S, S, lvl);
      for (const [dx, dy] of [[-S, 0], [S, 0], [0, -S], [0, S]]) c.drawImage(tmp, dx, dy);
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, cv.width, cv.height);
      c.globalCompositeOperation = 'source-over';
      c.drawImage(tmp, 0, 0);
      rimCache.set(key, cv);
    }
    ctx.drawImage(cv, Math.round(x - S), Math.round(y - S));
  }
  PP.drawItemWithRim = drawItemWithRim;

  PP.syncPets = () => {
    for (const p of G.all) if (p.d.hidden && G.pets.includes(p)) { p.interrupt(); p.held = false; p.airborne = false; p.y = G.ground; }
    const s = G.save && G.save.settings;
    if (s && s.allAway) { G.pets = []; return; }
    const vis = G.all.filter((p) => !p.d.hidden);
    if (s && s.mode === 'mini') {
      // 极简：只留主角（正在走回门里的也先留着，等它进去）
      const main = vis.find((p) => p.d.id === s.miniMain) || vis.find((p) => p.d.id === s.mainId) || vis.find((p) => !p.d.wild) || vis[0];
      G.pets = vis.filter((p) => p === main || (p.action === 'enterDoor' && G.pets.includes(p)));
    } else if (PP.eco) {
      // 场景里：只显示正在这个场景、没在家里、没在路上的（刚叫回电脑的也等它走进门）
      G.pets = vis.filter((p) => PP.eco.visible(p) || (p.action === 'enterDoor' && G.pets.includes(p)));
    } else G.pets = vis;
  };
  // 新来的 / 从电脑里叫出来的：先出现在你正在看的这个场景，之后自己回家
  PP.hereNow = (p) => { if (PP.scene && G.save && G.save.settings.mode !== 'mini') { p.d.scene = PP.scene.view(); p.d.inHome = false; p.eco = null; p._shown = true; } };
  PP.addPet = (p) => { PP.hereNow(p); G.all.push(p); PP.syncPets(); };
  PP.removePet = (p) => { G.all = G.all.filter((q) => q !== p); PP.syncPets(); };
  // 物品属于某个地方：极简模式（mini）或者某个场景；只在那个地方看得到、用得到
  PP.place = () => (G.save && G.save.settings.mode === 'mini' ? 'mini' : (PP.scene && PP.scene.view()) || 'forest');
  const HOMEY = new Set(['food', 'water', 'bed', 'litter']); // 家里用的东西：只在极简模式
  PP.itemHere = (i) => HOMEY.has(i.type) || (i.scene || 'mini') === PP.place();
  // 画出来的：饭碗水碗这些“家里的东西”不画（场景里大家在野外吃喝）
  PP.itemShown = (i) => !HOMEY.has(i.type) && (i.scene || 'mini') === PP.place();
  // 物品落在哪：场景里落在地面的某一排
  PP.itemFloor = (i) => {
    if (!G.save || G.save.settings.mode === 'mini' || !PP.scene) return G.ground;
    const l = PP.scene.layout(); if (!l) return G.ground;
    const back = l.g.y0 + (l.L.base + 1) * l.g.u;
    return Math.round(back + (G.ground - back) * (i.lane != null ? i.lane : (i.lane = 0.6 + Math.random() * 0.35)));
  };
  PP.findItem = (type, pred) => G.items.find((i) => i.type === type && !i.dead && PP.itemHere(i) && (!pred || pred(i)));
  PP.addItem = (o) => { const it = new PP.Item(o); if (!it.scene && !HOMEY.has(it.type)) it.scene = PP.place(); G.items.push(it); return it; };

  // ---------- 粒子 ----------
  // kind: icon | text | dot | leaf | snow | firefly | star | confetti | score
  PP.fx = function (o) {
    const p = Object.assign({ x: 0, y: 0, vx: 0, vy: -30, life: 1.2, max: 1.2, kind: 'icon', icon: 'heart', s: G.S, grav: 0 }, o);
    p.max = p.life;
    G.particles.push(p);
    return p;
  };
  PP.hearts = function (x, y, n = 1) {
    for (let i = 0; i < n; i++) PP.fx({ x: x + U.rand(-10, 10), y: y - U.rand(0, 8), vx: U.rand(-12, 12), vy: U.rand(-45, -30), icon: 'heart', life: 1.3, s: Math.max(1, G.S - 1) });
  };
  PP.puff = function (x, y, n = 5) {
    for (let i = 0; i < n; i++) PP.fx({ kind: 'dot', x: x + U.rand(-14, 14), y: y - 2, vx: U.rand(-40, 40), vy: U.rand(-40, -10), life: 0.5, col: '#ffffff', size: G.S * 2 });
  };

  function updateParticles(dt) {
    for (const p of G.particles) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'leaf') { p.vx = Math.sin(G.t * 1.5 + p.seed) * 25; if (p.y > G.ground - 2) { p.y = G.ground - 2; p.vy = 0; p.vx = 0; } }
      if (p.kind === 'snow') { p.vx = Math.sin(G.t + p.seed) * 12; if (p.y > G.ground - 2) { p.y = G.ground - 2; p.vy = 0; } }
      if (p.kind === 'firefly') { p.vx += U.rand(-30, 30) * dt; p.vy += U.rand(-30, 30) * dt; p.vx *= 0.98; p.vy *= 0.98; }
    }
    G.particles = G.particles.filter((p) => p.life > 0);
  }

  function renderParticles(ctx) {
    for (const p of G.particles) {
      const a = U.clamp(p.life / Math.min(0.4, p.max), 0, 1);
      if (p.kind === 'icon') {
        const [w] = PP.SPR.iconSize(p.icon);
        PP.SPR.drawIcon(ctx, p.icon, Math.round(p.x - (w * p.s) / 2), Math.round(p.y), p.s, a);
      } else if (p.kind === 'dot' || p.kind === 'confetti') {
        ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); ctx.globalAlpha = 1;
      } else if (p.kind === 'leaf') {
        ctx.globalAlpha = a; ctx.fillStyle = p.col;
        const s = G.S; ctx.fillRect(p.x, p.y, s * 2, s); ctx.fillRect(p.x + s, p.y - s, s, s); ctx.globalAlpha = 1;
      } else if (p.kind === 'snow') {
        ctx.globalAlpha = a * 0.9; ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x, p.y, G.S, G.S); ctx.globalAlpha = 1;
      } else if (p.kind === 'firefly') {
        const on = Math.sin(G.t * 3 + p.seed) > 0;
        ctx.globalAlpha = a * (on ? 1 : 0.25); ctx.fillStyle = '#f6ff8a'; ctx.fillRect(p.x, p.y, G.S, G.S); ctx.globalAlpha = 1;
      } else if (p.kind === 'star') {
        ctx.fillStyle = '#fff6c2';
        for (let i = 0; i < 8; i++) { ctx.globalAlpha = (1 - i / 8) * a; ctx.fillRect(p.x - p.vx * i * 0.012, p.y - p.vy * i * 0.012, G.S * (i < 2 ? 2 : 1), G.S * (i < 2 ? 2 : 1)); }
        ctx.globalAlpha = 1;
      } else if (p.kind === 'text') {
        ctx.globalAlpha = a; drawPixelLabel(ctx, p.text, p.x, p.y, p.style); ctx.globalAlpha = 1;
      }
    }
  }

  // 黑白像素风标签（Comnyang 的名字牌风格）
  function drawPixelLabel(ctx, text, cx, y, style = {}) {
    ctx.font = PP.FONT(style.size || 12);
    const w = Math.ceil(ctx.measureText(text).width) + 12, h = (style.size || 12) + 8;
    const x = Math.round(cx - w / 2);
    ctx.fillStyle = style.bg || '#ffffff';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = style.border || '#111';
    ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
    if (style.shadow !== false) { ctx.fillRect(x + 3, y + h, w - 1, 2); ctx.fillRect(x + w, y + 3, 2, h - 1); }
    ctx.fillStyle = style.fg || '#111';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(text, cx, y + h / 2 + 1);
    ctx.textAlign = 'left';
    return [w, h];
  }
  PP.drawPixelLabel = drawPixelLabel;
  PP.FONT = (px) => `${px}px "Fusion Pixel 12px Proportional SC","Zpix","Ark Pixel 12px Proportional zh_cn","PingFang SC","Microsoft YaHei",monospace`;

  // ---------- 环境：季节粒子、蝴蝶、流星 ----------
  function updateAmbient(dt) {
    const A = G.ambient;
    const season = PP.season();
    const h = new Date().getHours();
    const night = h >= 20 || h < 5;
    const hol = PP.holiday();
    const lowFx = G.save && G.save.settings.quiet;
    if (!lowFx) {
      // 季节粒子（很稀疏，不打扰工作）
      // 有场景时，天气粒子（雨雪落叶）全部交给场景来画，这里不再重复
      const sceneOn = PP.scene && PP.scene.active();
      // 极简模式：天气只在动物身边下（一小片），不铺满全屏
      const mp = !sceneOn && PP.F && PP.F.main && PP.F.main();
      const pe = mp && PP.env && (PP.env.at ? PP.env.at(mp.d.scene) : PP.env.get());
      const efx = pe && pe.fx;
      const rate = !mp ? 0 : dt * (efx && efx.snow ? 0.9 : 0.25);
      const rx = () => (mp ? mp.x : G.W / 2) + U.rand(-90, 90) * G.S / 2;
      if (Math.random() < rate) {
        if (efx && efx.snow)
          PP.fx({ kind: 'snow', x: rx(), y: G.ground - U.rand(90, 150), vy: U.rand(18, 30), life: 4, seed: Math.random() * 9 });
        else if ((pe.season || season) === 'autumn')
          PP.fx({ kind: 'leaf', x: rx(), y: G.ground - U.rand(90, 150), vy: U.rand(20, 34), life: 4, seed: Math.random() * 9, col: U.pick(['#e8913a', '#d9662a', '#c9a23a', '#b8552a']) });
        else if ((pe.season || season) === 'spring')
          PP.fx({ kind: 'leaf', x: rx(), y: G.ground - U.rand(90, 150), vy: U.rand(16, 26), life: 5, seed: Math.random() * 9, col: U.pick(['#ffc4d8', '#ffb0c8', '#fff0f4']) });
        else if ((pe.season || season) === 'summer' && night)
          PP.fx({ kind: 'firefly', x: rx(), y: G.ground - U.rand(10, 80), life: 10, vy: 0, seed: Math.random() * 9 });
      }
      if (hol && (hol.deco === 'hearts') && Math.random() < dt * 0.3)
        PP.fx({ kind: 'icon', icon: 'heart', x: rx(), y: G.ground - 10, vy: -U.rand(15, 30), life: 6, s: 2 });
      if (hol && hol.deco === 'confetti' && Math.random() < dt * 0.6)
        PP.fx({ kind: 'confetti', x: rx(), y: G.ground - 150, vy: U.rand(40, 80), vx: U.rand(-20, 20), life: 7, col: U.pick(['#ffcf33', '#ff3d6e', '#56c2ff', '#7be07b']), size: G.S * 2 });
    }

    // 蝴蝶：偶尔飞过，好奇的宠物会去追
    A.nextBug -= dt;
    if (!A.bug && A.nextBug <= 0 && !(h >= 22 || h < 6)) {
      const fromLeft = Math.random() < 0.5;
      A.bug = { x: fromLeft ? -10 : G.W + 10, y: G.ground - U.rand(60, 140), vx: fromLeft ? 40 : -40, t: 0, life: U.rand(40, 80), caught: false };
      A.nextBug = U.rand(600, 1500);
    }
    if (A.bug) {
      const b = A.bug;
      b.t += dt; b.life -= dt;
      b.vy = Math.sin(b.t * 2.2) * 40 + Math.sin(b.t * 0.7) * 20;
      if (b.flee) { b.vy -= 60; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.y = U.clamp(b.y, G.ground - 220, G.ground - 30);
      if (b.life < 0 && !b.leaving) { b.leaving = true; }
      if (!b.leaving && (b.x < 40 || b.x > G.W - 40)) b.vx = -b.vx;
      if (b.leaving && (b.x < -30 || b.x > G.W + 30)) A.bug = null;
    }

    // 流星（深夜）
    A.nextStar -= dt;
    if (A.nextStar <= 0) {
      A.nextStar = 60;
      if ((h >= 21 || h < 4) && Math.random() < 1 / 60) {
        PP.fx({ kind: 'star', x: U.rand(G.W * 0.3, G.W), y: G.ground - U.rand(300, 420), vx: -420, vy: 130, life: 1.4 });
        PP.events && PP.events.shootingStar();
      }
    }
  }

  function renderAmbient(ctx) {
    const b = G.ambient.bug;
    if (b) {
      const flap = Math.floor(G.t * 10) % 2;
      const s = Math.max(1, G.S - 1);
      const rows = flap ? ['p...p', 'pp.pp', '.pkp.', 'pp.pp'] : ['.....', 'ppkpp', '.pkp.', '.p.p.'];
      ctx.fillStyle = '#ffffff';
      for (let j = 0; j < rows.length; j++) for (let i = 0; i < 5; i++) if (rows[j][i] !== '.') ctx.fillRect(b.x + (i - 1) * s, b.y + (j - 1) * s, s * 3, s * 3);
      for (let j = 0; j < rows.length; j++) for (let i = 0; i < 5; i++) {
        const c = rows[j][i]; if (c === '.') continue;
        ctx.fillStyle = c === 'k' ? '#231c20' : '#ffb347';
        ctx.fillRect(b.x + i * s, b.y + j * s, s, s);
      }
    }
  }

  PP.world = { updateParticles, renderParticles, updateAmbient, renderAmbient };
})();
