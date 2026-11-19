// 小屋的家具：每件都是 3D 模型（和房子同一套方块 / 圆柱 / 布料材质），可以自由摆放、转向、收起来。
// 摆放存在 econ 数据里：E().layout = [{ f: 家具种类, u, v, r: 朝向 0~3, lv: 0 楼下 / 1 阁楼 }]
// 朝向：r=0 正面朝 +v（朝门那边），r=1 朝 -u，r=2 朝 -v（朝里墙），r=3 朝 +u
(function () {
  const PP = (window.PP = window.PP || {});
  const g3 = PP.g3, M = g3.MAT;
  const WOOD = '#b88a5a', WOOD2 = '#a8784a', DARK = '#8a5a3a', TIMBER = '#5a3a28', COPPER = '#b0704a';

  // 把“家具自己的坐标”（中心在原点，正面朝 +y）转成房间里的坐标
  class TM {
    constructor(m, u, v, r, z, s = 1) { this.m = m; this.u = u; this.v = v; this.r = ((r % 4) + 4) % 4; this.z0 = z; this.s = s; }
    get z() { return this.z0; }
    p(x, y) { const r = this.r, s = this.s; x *= s; y *= s; const [a, b] = r === 0 ? [x, y] : r === 1 ? [-y, x] : r === 2 ? [-x, -y] : [y, -x]; return [this.u + a, this.v + b]; }
    q(pt) { const [a, b] = this.p(pt[0], pt[1]); return [a, b, this.z0 + pt[2] * this.s]; }
    box(x0, y0, z0, x1, y1, z1, ...a) { const A = this.p(x0, y0), B = this.p(x1, y1), s = this.s; this.m.box(Math.min(A[0], B[0]), Math.min(A[1], B[1]), this.z0 + z0 * s, Math.max(A[0], B[0]), Math.max(A[1], B[1]), this.z0 + z1 * s, ...a); return this; }
    cyl(x, y, z0, z1, r0, r1, ...a) { const P = this.p(x, y), s = this.s; this.m.cyl(P[0], P[1], this.z0 + z0 * s, this.z0 + z1 * s, r0 * s, r1 * s, ...a); return this; }
    ball(x, y, z, r, rz, ...a) { const P = this.p(x, y), s = this.s; this.m.ball(P[0], P[1], this.z0 + z * s, r * s, rz * s, ...a); return this; }
    pot(x, y, z, r, ...a) { const P = this.p(x, y), s = this.s; this.m.pot(P[0], P[1], this.z0 + z * s, r * s, ...a); return this; }
    foliage(x, y, z, r, rz, ...a) { const P = this.p(x, y), s = this.s; this.m.foliage(P[0], P[1], this.z0 + z * s, r * s, rz * s, ...a); return this; }
    flower(x, y, z, h, ...a) { const P = this.p(x, y), s = this.s; this.m.flower(P[0], P[1], this.z0 + z * s, h * s, ...a); return this; }
    quad(a, b, c, d, ...x) { this.m.quad(this.q(a), this.q(b), this.q(c), this.q(d), ...x); return this; }
    tri(a, b, c, ...x) { this.m.tri(this.q(a), this.q(b), this.q(c), ...x); return this; }
    disc(x, y, z, rad, face, ...a) { const P = this.p(x, y), f = this.r % 2 ? (face === 'u' ? 'v' : face === 'v' ? 'u' : face) : face; this.m.disc(P[0], P[1], this.z0 + z * this.s, rad * this.s, f, ...a); return this; }
    posts(list, z0, h, col, w) { for (const [x, y] of list) this.box(x - w, y - w, z0, x + w, y + w, z0 + h, col, M.plank); return this; }
  }

  // ---------- 家具清单 ----------
  // w,d：占地（家具自己的 x / y 方向）；lv：能放在哪层；walk：能踩上去（地毯、靠垫）；use：宠物拿它干嘛；seat：坐上去的高度和位置
  // shop：商店里的物品 id（没有 = 本来就有的）
  const D = {};
  const def = (id, o) => (D[id] = Object.assign({ id, lv: [0], use: 'look' }, o));
  def('armchair', { name: '扶手椅', w: 4.4, d: 4, use: 'sit', seat: [0, 0.4, 3.6], build(t) {
    t.box(-2.2, -2, 0, 2.2, 2, 3.6, '#c86a5a', M.cloth); t.box(-2.2, -2, 3.6, 2.2, -1, 9.4, '#b85a4c', M.cloth); t.box(-2.2, -2, 3.6, -1.4, 2, 6, '#b85a4c', M.cloth); t.box(1.4, -2, 3.6, 2.2, 2, 6, '#b85a4c', M.cloth);
    t.box(-1.3, -0.9, 3.6, 1.3, 1.8, 4.3, '#e88a7a', M.cloth); for (const x of [-1.9, 1.9]) for (const y of [-1.7, 1.7]) t.box(x - 0.2, y - 0.2, -0.01, x + 0.2, y + 0.2, 0.5, TIMBER, M.plank); } });
  def('rocker0', { name: '摇摇椅（带垫子）', w: 3.4, d: 3, use: 'rock', seat: [0, 0.2, 3.4], build(t) {
    t.box(-1.7, -1.5, 2.8, 1.7, 1.5, 3.4, '#c8935e', M.plank); t.box(-1.7, -1.5, 3.4, 1.7, -0.8, 9.4, WOOD2, M.plank); t.box(-1.3, -0.8, 3.4, 1.3, 1.1, 4, '#e8a0b0', M.cloth);
    for (const x of [-1.5, 1.5]) t.quad([x, -2.1, 0.8], [x, 2.5, 0.8], [x, 2.1, 0], [x, -1.7, 0], '#7a4e30', 2); t.posts([[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]], 0.5, 2.4, DARK, 0.14); } });
  def('flamp', { name: '落地灯', w: 1.8, d: 1.8, use: 'lamp', light: [0, 0, 14], build(t) { t.cyl(0, 0, 0, 0.5, 0.8, 0.7, '#5a5466', M.metal, 8); t.cyl(0, 0, 0, 13, 0.2, 0.14, '#5a5466', M.metal, 5); t.cyl(0, 0, 12.4, 16, 1.4, 0.8, '#ffe9a8', M.glow, 9); } });
  def('cattree', { name: '猫爬架', w: 3.6, d: 3.6, use: 'climb', seat: [0, 0, 9.6], build(t) {
    t.cyl(0, 0, 0, 9, 0.5, 0.5, '#d8c4a0', M.cloth, 8); t.box(-1.8, -1.8, 0, 1.8, 1.8, 0.6, '#c86a5a', M.cloth); t.box(-1.6, -1.6, 5, 1.6, 1.6, 5.6, '#c86a5a', M.cloth); t.box(-1.4, -1.4, 9, 1.4, 1.4, 9.6, '#c86a5a', M.cloth);
    t.ball(1.2, 0, 4.4, 0.4, 0.4, '#f0c040', 0, 4, 6); t.box(1.15, -0.04, 4.8, 1.25, 0.04, 5.6, '#3a3448', 0); } });
  def('yarn', { name: '毛线筐', w: 3, d: 3, use: 'play', build(t) { t.cyl(0, 0, 0, 2, 1.4, 1.6, '#b4884a', M.plank, 12); for (let i = 0; i < 4; i++) t.ball(Math.cos(i * 1.6) * 0.7, Math.sin(i * 1.6) * 0.7, 2.3, 0.6, 0.6, ['#e86a6a', '#7ab0d8', '#f0c040', '#9ad070'][i], M.cloth, 4, 6); } });
  def('cushions', { name: '一堆靠垫', w: 5.6, d: 3, walk: true, use: 'warm', lv: [0, 1], build(t) { for (const [x, y, c] of [[0, -1, '#f2c6d2'], [2, 0.2, '#a8c8e8'], [-2, 0.6, '#f6e0a0']]) { t.box(x - 1, y - 1, 0.3, x + 1, y + 1, 1.3, c, M.cloth); t.box(x - 0.3, y - 0.3, 1.3, x + 0.3, y + 0.3, 1.4, '#ffffff', M.cloth); } } });
  def('rug0', { name: '彩色圆地毯', w: 10, d: 10, walk: true, use: 'rug', flat: true, build(t) { t.cyl(0, 0, 0, 0.2, 5, 5, '#c8a0d8', M.cloth, 18); t.cyl(0, 0, 0.2, 0.24, 3.8, 3.8, '#f2dcae', M.cloth, 16); t.cyl(0, 0, 0.24, 0.28, 2.2, 2.2, '#a8c8e8', M.cloth, 14); } });
  def('stool', { name: '木墩', w: 3, d: 3, use: 'sit', seat: [0, 0, 4.4], build(t) { t.cyl(0, 0, 0, 4.4, 1.5, 1.5, '#8a5e3c', M.plank, 10); t.cyl(0, 0, 4.4, 4.5, 1.2, 1.2, '#c8935e', M.plank, 10); } });
  def('bed', { name: '小床', w: 9.9, d: 5.6, lv: [1, 0], use: 'sleep', seat: [0.2, 0, 4.4], build(t, o) {
    const pink = o.pinkBed;
    t.box(-4.75, -2.8, 0, 4.75, 2.8, 2.6, '#a8784a', M.plank); t.box(-4.45, -2.5, 2.6, 4.45, 2.5, 4.2, pink ? '#f2c6d2' : '#e8dcc8', M.cloth); t.box(-4.45, -2.5, 4.2, -1.75, 2.5, 5.2, '#fff6ea', M.cloth);
    t.box(-5.15, -2.8, 0, -4.75, 2.8, 8, DARK, M.plank); if (pink) t.box(-0.75, -2.5, 4.2, 4.45, 2.5, 4.8, '#e88aa0', M.cloth); else t.box(0.2, -2.5, 4.2, 4.45, 2.5, 4.5, '#c8b8e0', M.cloth); } });
  def('desk', { name: '写字台', w: 5, d: 3, lv: [1, 0], use: 'write', build(t) {
    t.box(-2.5, -1.5, 5.4, 2.5, 1.5, 6.2, WOOD, M.plank); t.posts([[-2.2, 1.2], [2.2, 1.2], [-2.2, -1.2], [2.2, -1.2]], 0, 5.4, DARK, 0.2); t.box(-1.5, -1.1, 6.2, 0.5, 0.5, 6.5, '#f8f4ec', 0); t.cyl(1.7, -0.7, 6.2, 9, 0.3, 0.6, '#7fc8a8', M.glow, 7); } });
  def('trunk', { name: '旧箱子', w: 3.6, d: 2.6, lv: [1, 0], use: 'rummage', build(t) { t.box(-1.7, -1.2, 0, 1.7, 1.2, 2.8, DARK, M.plank); t.box(-1.8, -1.3, 2.8, 1.8, 1.3, 3.4, COPPER, M.metal); t.box(-0.3, 1.25, 1.6, 0.3, 1.35, 2.6, '#f0c040', M.metal); } });
  def('potplant', { name: '小盆栽', w: 2, d: 2, lv: [1, 0], use: 'sniff', build(t) { t.pot(0, 0, 0, 0.8, '#c8705a'); t.foliage(0, 0, 6, 1.3, 3, ['#4c9a48', '#6fbf5a', '#86cc6a'], 34, 9, 0.8); } });
  // —— 商店买的 ——
  def('rug', { shop: 'rug', name: '圆地毯', w: 10.8, d: 10.8, walk: true, use: 'rug', flat: true, build(t) { t.cyl(0, 0, 0, 0.25, 5.4, 5.4, '#e8a0b0', M.cloth, 16); t.cyl(0, 0, 0.25, 0.3, 3.6, 3.6, '#f8e0c8', M.cloth, 14); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; t.cyl(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 0.25, 0.32, 0.4, 0.4, '#ffffff', M.cloth, 6); } } });
  def('lamp', { shop: 'lamp', name: '暖光台灯', w: 2, d: 2, use: 'lamp', light: [0, 0, 14], build(t) { t.cyl(0, 0, 0, 0.6, 0.9, 0.8, '#5a5466', M.metal, 8); t.cyl(0, 0, 0, 12, 0.2, 0.14, '#5a5466', M.metal, 5); t.cyl(0, 0, 11.4, 15, 1.3, 0.8, '#ffe9a8', M.glow, 9); } });
  def('table', { shop: 'table', name: '小书桌', w: 6, d: 4.6, use: 'table', build(t) { t.box(-3, -2.3, 5.4, 3, 2.3, 6.2, '#c8935e', M.plank); t.posts([[-2.6, -1.9], [2.6, -1.9], [-2.6, 1.9], [2.6, 1.9]], 0, 5.4, DARK, 0.2); t.cyl(0, 0, 6.2, 7.6, 0.5, 0.5, '#f8f4ec', 0, 7); t.cyl(0, 0, 7.4, 7.6, 0.35, 0.35, '#7a4a30', 0, 7); t.box(-2.4, 0.6, 6.2, -0.8, 1.8, 6.5, '#e8d0a8', 0); } });
  def('plant', { shop: 'plant', name: '大盆栽', w: 2.4, d: 2.4, use: 'sniff', build(t) { t.pot(0, 0, 0, 1, '#5a7ab0'); t.foliage(0, 0, 7.4, 1.6, 3.6, ['#3f8a44', '#5aa64e', '#86cc6a'], 40, 8, 0.9); } });
  def('shelf', { shop: 'shelf', name: '小书架', w: 4.4, d: 2.2, use: 'book', build(t) {
    t.box(-2.2, -1.1, 0, 2.2, 1.1, 15, '#a8784a', M.plank); t.box(-1.9, 1.1, 0.8, 1.9, 1.12, 14.4, '#7a5030', M.plank);
    for (let i = 0; i < 3; i++) { t.box(-2.2, 1.1, 0.6 + i * 4.6, 2.2, 1.2, 1 + i * 4.6, '#a8784a', M.plank); for (let j = 0; j < 5; j++) t.box(-1.8 + j * 0.76, 0.4, 1 + i * 4.6, -1.2 + j * 0.76, 1.15, 4 + i * 4.6 - (j % 2) * 0.6, ['#c85a4a', '#5a8ad8', '#e8c860', '#7fc8a8', '#c8a0f0'][(i + j) % 5], 0); } } });
  def('piano', { shop: 'piano', name: '小钢琴', w: 8, d: 6.4, use: 'piano', seat: [0, 2.4, 3.4], build(t) {
    t.box(-4, -3.2, 0, 4, -0.4, 10.4, '#5a3428', M.plank); t.box(-3.6, -0.4, 5.6, 3.6, 1, 6.4, '#f8f4ec', M.cloth); for (let i = 0; i < 10; i++) t.box(-3.3 + i * 0.7, 0.2, 6.4, -3.0 + i * 0.7, 0.9, 6.6, '#231c20', 0);
    t.box(-1.4, 1.6, 0, 1.4, 3.2, 3.4, '#7a4a38', M.plank); t.box(-3.4, -3.2, 10.4, -1.4, -2, 11, '#e8c860', M.metal); } });
  def('rocker', { shop: 'rocker', name: '摇椅', w: 3.6, d: 3.2, use: 'rock', seat: [0, 0.2, 3.6], build(t) {
    t.box(-1.8, -1.6, 2.8, 1.8, 1.6, 3.6, '#c8935e', M.plank); t.box(-1.8, -1.6, 3.6, 1.8, -0.8, 10, WOOD2, M.plank);
    for (const x of [-1.6, 1.6]) t.quad([x, -2.4, 0.8], [x, 2.6, 0.8], [x, 2.2, 0], [x, -2, 0], '#7a4e30', 2); t.posts([[-1.5, -1.3], [1.5, -1.3], [-1.5, 1.3], [1.5, 1.3]], 0.5, 2.4, DARK, 0.14); } });
  // —— 新家具 ——
  def('sofa', { shop: 'sofa', name: '双人沙发', w: 8, d: 3.8, use: 'sit', seat: [0, 0.4, 3.4], build(t) {
    t.box(-4, -1.9, 0.5, 4, 1.9, 3.4, '#6a9ad0', M.cloth); t.box(-4, -1.9, 3.4, 4, -0.9, 8.4, '#5a88c0', M.cloth); t.box(-4, -1.9, 3.4, -3.2, 1.9, 5.6, '#5a88c0', M.cloth); t.box(3.2, -1.9, 3.4, 4, 1.9, 5.6, '#5a88c0', M.cloth);
    for (const x of [-1.6, 1.6]) t.box(x - 1.5, -0.8, 3.4, x + 1.5, 1.8, 4.1, '#86b4e0', M.cloth); t.box(-2.4, -0.9, 4.1, -0.6, -0.5, 6.4, '#f6e0a0', M.cloth);
    for (const x of [-3.7, 3.7]) for (const y of [-1.6, 1.6]) t.box(x - 0.2, y - 0.2, 0, x + 0.2, y + 0.2, 0.5, TIMBER, M.plank); } });
  def('petbed', { shop: 'petbed', name: '宠物窝', w: 4, d: 4, use: 'nap', seat: [0, 0, 1.2], build(t) {
    t.cyl(0, 0, 0, 1.6, 2, 2, '#c8935e', M.cloth, 14); t.cyl(0, 0, 0.6, 1.2, 1.5, 1.5, '#f2c6d2', M.cloth, 14); t.ball(-0.6, 0.4, 1.4, 0.5, 0.4, '#ffffff', M.cloth, 4, 6); } });
  def('beanbag', { shop: 'beanbag', name: '懒人沙发', w: 3.8, d: 3.8, use: 'sit', seat: [0, 0.4, 2.6], build(t) { t.ball(0, 0, 1.4, 1.9, 1.4, '#f0a860', M.cloth, 6, 12); t.ball(0, -1, 2.6, 1.5, 1.4, '#e89850', M.cloth, 6, 12); } });
  def('gramophone', { shop: 'gramophone', name: '留声机', w: 2.6, d: 2.6, use: 'music', build(t) {
    t.box(-1.3, -1.3, 0, 1.3, 1.3, 5, WOOD2, M.plank); t.box(-1.4, -1.4, 5, 1.4, 1.4, 6.6, '#7a4a30', M.plank); t.cyl(0, 0, 6.6, 6.75, 1.1, 1.1, '#231c20', 0, 12);
    t.cyl(0.6, -0.6, 6.6, 9, 0.12, 0.12, '#c8a050', M.metal, 5); t.cyl(0.6, -0.6, 9, 11.4, 0.3, 1.6, '#e8c050', M.metal, 10); } });

  // 本来就有的家具 + 买了的家具里能摆进屋的
  const STARTER = ['armchair', 'rocker0', 'flamp', 'cattree', 'yarn', 'cushions', 'rug0', 'stool', 'bed', 'desk', 'trunk', 'potplant'];
  function owned(e) { return Object.keys(D).filter((k) => !D[k].shop || (e.owned && e.owned[D[k].shop])); }
  // 第一次：照着原来固定的摆法摆好（老存档里选过的书桌 / 书架 / 钢琴…也照原样放）
  function defaultLayout(e) {
    const rm = e.room || {}, L = [];
    const add = (f, u, v, r = 0, lv = 0) => L.push({ f, u, v, r, lv });
    add(rm.rug ? 'rug' : 'rug0', rm.rug ? 24 : 22, 21);
    add('armchair', 29.2, 13); add('rocker0', 21.1, 13.1, 3); add('flamp', 14, 27.6); add('cattree', 7.6, 29.2); add('yarn', 11.8, 30.4); add('cushions', 25.6, 28.4); add('stool', 18, 6.4);
    add('bed', 15.75, 7.8, 0, 1); add('desk', 7.5, 6.1, 0, 1); add('trunk', 19.1, 15.2, 0, 1); add('potplant', 5.6, 15.6, 0, 1);
    if (rm.c1 === 'table') add('table', 12.6, 23.3); else if (rm.c1 === 'lamp') add('lamp', 11, 23);
    if (rm.c2 === 'plant') add('plant', 34.4, 15.4); else if (rm.c2 === 'shelf') add('shelf', 34.8, 8.3);
    if (!rm.c3 || rm.c3 === 'piano') add('piano', 31, 27.2); else if (rm.c3 === 'rocker') add('rocker', 30.8, 26.6, 3);
    return L;
  }
  function layout(e) {
    if (!Array.isArray(e.layout)) e.layout = defaultLayout(e);
    // 没有了的（比如存档里有、但物品被移除）就去掉
    e.layout = e.layout.filter((it) => D[it.f]);
    return e.layout;
  }
  // 世界里的占地矩形 [u0, v0, u1, v1]
  let SC = 1; // 城堡里的家具比原来的小屋小一号
  function rect(it, pad = 0) { const d = D[it.f], odd = it.r % 2; const hw = (odd ? d.d : d.w) / 2 * SC + pad, hd = (odd ? d.w : d.d) / 2 * SC + pad; return [it.u - hw, it.v - hd, it.u + hw, it.v + hd]; }
  // 正面前面站的位置（宠物走到这儿再用它）
  function front(it, dist) { const d = D[it.f], k = d.d / 2 + (dist == null ? 1.8 : dist) / SC; return new TM(null, it.u, it.v, it.r, 0, SC).p(0, k); }
  function seat(it) { const d = D[it.f]; if (!d.seat) return null; const [x, y, z] = d.seat; const p = new TM(null, it.u, it.v, it.r, 0, SC).p(x, y); return { u: p[0], v: p[1], z: z * SC }; }
  function build(m, list, o = {}) {
    list.forEach((it, i) => {
      if (o.skip === i) return;
      const d = D[it.f]; if (!d) return; const k = o.idx ? o.idx(it) : i;
      m.pk(k >= 0 ? 100 + k : 0); d.build(new TM(m, it.u, it.v, it.r, o.zOf ? o.zOf(it) : it.lv ? o.LOFT : 0, o.S || 1), o); m.pk(0);
    });
  }
  const setScale = (s) => { SC = s; };
  PP.FURN = { D, TM, STARTER, owned, defaultLayout, layout, rect, front, seat, build, setScale, PICK0: 100 };
})();
