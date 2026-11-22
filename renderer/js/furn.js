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


  // ---------- 家具库：按房间分类，所有能进去的房间都能摆 ----------
  const PICK0 = 170; // 点选编号：170 起（城堡里的固定陈设用到 168）
  const CATS = [['living', '起居'], ['bedroom', '卧室'], ['kitchen', '厨房'], ['dining', '餐厅'], ['bath', '浴室'], ['study', '书房'], ['work', '工作间'], ['garden', '花草'], ['attic', '阁楼杂物'], ['common', '通用']];
  const CAT0 = { armchair: 'living', rocker0: 'living', flamp: 'living', cattree: 'living', yarn: 'living', cushions: 'living', rug0: 'common', stool: 'common', bed: 'bedroom', desk: 'study', trunk: 'attic', potplant: 'garden', rug: 'common', lamp: 'common', table: 'living', plant: 'garden', shelf: 'study', piano: 'living', rocker: 'living', sofa: 'living', petbed: 'bedroom', beanbag: 'living', gramophone: 'living' };
  for (const k in CAT0) if (D[k]) D[k].cat = CAT0[k];
  const nd = (id, cat, o) => def(id, Object.assign({ cat }, o));
  const LEGS = (t, w, d, h, col = DARK, r = 0.18) => t.posts([[-w / 2 + r, -d / 2 + r], [w / 2 - r, -d / 2 + r], [-w / 2 + r, d / 2 - r], [w / 2 - r, d / 2 - r]], 0, h, col, r);
  // 厨房
  nd('cupboard', 'kitchen', { name: '橱柜', w: 5, d: 2.4, use: 'rummage', build(t) { t.box(-2.5, -1.2, 0, 2.5, 1.2, 6.4, '#c8a878', M.plank, '#e8dcc8', M.stone); for (const x of [-1.25, 1.25]) { t.box(x - 1.1, 1.2, 0.5, x + 1.1, 1.26, 5.6, '#b89060', M.plank); t.box(x - 0.15, 1.26, 3, x + 0.15, 1.36, 3.6, '#e8c860', M.metal); } t.cyl(-1.2, 0, 6.4, 7.4, 0.5, 0.45, '#c8705a', 0, 8); t.box(0.4, -0.6, 6.4, 1.8, 0.6, 6.8, '#a8784a', M.plank); } });
  nd('pantry', 'kitchen', { name: '碗碟柜', w: 4.6, d: 2, use: 'look', act: '数数碗碟', say: ["一、二、三……少了一个碗？", "碟子都擦得亮亮的"], build(t) { t.box(-2.3, -1, 0, 2.3, 1, 13, '#8ab0a0', M.plank); for (let i = 0; i < 3; i++) { t.box(-2.1, 0.4, 5 + i * 2.6, 2.1, 1.05, 5.2 + i * 2.6, '#6a8a7a', M.plank); for (let j = 0; j < 4; j++) t.disc(-1.5 + j, 0.85, 6.2 + i * 2.6, 0.45, 'v', ['#f4f0e8', '#e8a0a0', '#a8c8e8', '#f4f0e8'][(i + j) % 4], 0, 8); } t.box(-2.3, -1, 0, 2.3, 1.05, 4.6, '#7a9a8a', M.plank); } });
  nd('potrack', 'kitchen', { name: '挂锅架', w: 4, d: 1.4, use: 'look', act: '敲敲锅', say: ["当——当——", "这口锅最适合煮汤"], build(t) { t.posts([[-1.8, 0], [1.8, 0]], 0, 9, TIMBER, 0.16); t.box(-2, -0.12, 8.6, 2, 0.12, 9, TIMBER, M.plank); for (let i = 0; i < 4; i++) { const x = -1.4 + i * 0.95; t.cyl(x, 0, 6.4 - (i % 2) * 0.6, 8.6, 0.03, 0.03, '#3a3448', 0, 3); t.cyl(x, 0, 5.6 - (i % 2) * 0.6, 6.6 - (i % 2) * 0.6, 0.55 - (i % 2) * 0.1, 0.5, i % 2 ? '#c0c0c8' : COPPER, M.metal, 10); } } });
  nd('jars', 'kitchen', { name: '腌菜坛子', w: 3.4, d: 2.2, use: 'sniff', build(t) { for (const [x, y, r, c] of [[-0.9, 0, 0.9, '#8a5a3a'], [0.8, -0.2, 0.7, '#a86a4a'], [0.6, 0.7, 0.5, '#6a7a8a']]) { t.cyl(x, y, 0, r * 2.6, r * 0.8, r, c, 0, 10); t.cyl(x, y, r * 2.6, r * 2.9, r * 0.6, r * 0.6, '#e8d8b8', M.cloth, 8); } } });
  nd('flour', 'kitchen', { name: '面粉袋和面包篮', w: 3.6, d: 2.4, use: 'sniff', build(t) { t.ball(-0.8, 0, 1.4, 1.1, 1.5, '#f0e4c8', M.cloth, 4, 8); t.cyl(-0.8, 0, 2.8, 3.3, 0.4, 0.3, '#c8a878', M.cloth, 6); t.cyl(0.9, 0.2, 0, 1.2, 1, 1.1, '#b88a4a', M.plank, 10); for (let i = 0; i < 3; i++) t.ball(0.6 + i * 0.3, 0.2, 1.5, 0.45, 0.3, '#d89a50', 0, 3, 6); } });
  // 餐厅
  nd('longtable', 'dining', { name: '长餐桌', w: 9, d: 4, use: 'table', build(t) { t.box(-4.5, -2, 5, 4.5, 2, 5.7, '#a8784a', M.plank, '#f4ead8', M.cloth); LEGS(t, 9, 4, 5); t.box(-3.5, -0.5, 5.7, 3.5, 0.5, 5.75, '#e06a5a', M.cloth); for (const x of [-2.6, 0, 2.6]) t.disc(x, 1.1, 5.76, 0.6, 'z', '#ffffff', 0, 10); t.cyl(0, 0, 5.7, 6.9, 0.3, 0.25, '#e8c860', M.metal, 6); t.cyl(0, 0, 6.9, 7.8, 0.12, 0.12, '#fff4dc', M.glow, 5); } });
  nd('bench', 'dining', { name: '条凳', w: 7, d: 1.6, use: 'sit', seat: [0, 0, 3.2], build(t) { t.box(-3.5, -0.8, 2.7, 3.5, 0.8, 3.2, '#b88a5a', M.plank); for (const x of [-3, 3]) t.box(x - 0.3, -0.7, 0, x + 0.3, 0.7, 2.7, DARK, M.plank); } });
  nd('teacart', 'dining', { name: '茶点小推车', w: 3.6, d: 2.4, use: 'table', build(t) { for (const z of [1.2, 4.4]) t.box(-1.8, -1.2, z, 1.8, 1.2, z + 0.3, '#c8935e', M.plank); LEGS(t, 3.6, 2.4, 4.4, '#8a6040', 0.12); for (const x of [-1.6, 1.6]) t.cyl(x, -1.2, 0, 1, 0.5, 0.5, '#3a3448', M.metal, 8); t.cyl(-0.6, 0, 4.7, 6, 0.6, 0.5, '#f4f0e8', 0, 10); t.cyl(0.8, 0.3, 4.7, 5.2, 0.8, 0.8, '#e8a0b0', 0, 10); } });
  nd('candle', 'dining', { name: '烛台', w: 1.6, d: 1.6, use: 'lamp', light: [0, 0, 7], build(t) { t.cyl(0, 0, 0, 0.4, 0.7, 0.6, '#e8c860', M.metal, 8); t.cyl(0, 0, 0, 5, 0.15, 0.12, '#e8c860', M.metal, 5); for (const x of [-0.7, 0, 0.7]) { t.cyl(x, 0, 5, 6.2, 0.18, 0.18, '#fff4dc', 0, 5); t.cyl(x, 0, 6.2, 6.8, 0.1, 0.01, '#ffb040', M.glow, 4); } t.box(-0.8, -0.06, 4.9, 0.8, 0.06, 5.1, '#e8c860', M.metal); } });
  // 浴室
  nd('washstand', 'bath', { name: '洗手台', w: 3.6, d: 2.2, use: 'look', act: '洗洗手', say: ["哗啦啦，手洗干净了", "水好凉"], build(t) { t.box(-1.8, -1.1, 0, 1.8, 1.1, 5.2, '#e8e4dc', 0); t.cyl(0, 0, 5.2, 5.8, 1.1, 0.8, '#ffffff', 0, 12); t.cyl(0, 0, 5.4, 5.6, 0.75, 0.75, '#9fd4f2', M.water, 10); t.cyl(0, -0.9, 5.2, 6.6, 0.1, 0.1, '#c0c0c8', M.metal, 5); t.box(-1.5, -1.1, 7.2, 1.5, -0.95, 10, '#d8e8f0', M.glass); t.box(-1.6, -1.15, 7.1, 1.6, -0.95, 7.2, '#e8c860', M.metal); } });
  nd('towel', 'bath', { name: '毛巾架', w: 3, d: 1, use: 'look', act: '擦擦脸', say: ["软软的，香香的", "毛巾晒过太阳的味道"], build(t) { t.posts([[-1.3, 0], [1.3, 0]], 0, 7, '#c0c0c8', 0.1); for (const z of [4, 6.6]) t.box(-1.4, -0.08, z, 1.4, 0.08, z + 0.15, '#c0c0c8', M.metal); t.box(-1, -0.25, 3.4, 0.2, 0.25, 6.7, '#f2a6c2', M.cloth); t.box(0.3, -0.25, 4.2, 1.1, 0.25, 6.7, '#9fd4f2', M.cloth); } });
  nd('tub', 'bath', { name: '木桶浴缸', w: 5.2, d: 5.2, use: 'nap', seat: [0, 0, 2.6], build(t) { t.cyl(0, 0, 0, 3.6, 2.6, 2.6, '#a8784a', M.plank, 16); for (const z of [0.8, 2.8]) t.cyl(0, 0, z, z + 0.3, 2.65, 2.65, '#3a3448', M.metal, 16, false); t.cyl(0, 0, 2.8, 3.1, 2.3, 2.3, '#cfeafa', M.water, 14); for (let i = 0; i < 6; i++) t.ball(Math.cos(i) * 1.4, Math.sin(i) * 1.4, 3.2, 0.4, 0.3, '#ffffff', 0, 3, 5); } });
  nd('mirror', 'bath', { name: '落地镜', w: 2.6, d: 1.2, use: 'look', act: '照照镜子', say: ["今天毛很顺！", "镜子里的我也在看我"], build(t) { t.box(-1.1, -0.2, 0.4, 1.1, 0.2, 9, '#b88a5a', M.plank); t.box(-0.9, 0.2, 0.7, 0.9, 0.26, 8.7, '#d8eef8', M.glass); for (const x of [-0.9, 0.9]) t.box(x - 0.15, -0.6, 0, x + 0.15, 0.6, 0.5, DARK, M.plank); } });
  nd('duck', 'bath', { name: '小黄鸭和肥皂', w: 2, d: 1.6, use: 'play', act: '捏一捏，吱吱叫', build(t) { t.ball(-0.4, 0, 0.6, 0.6, 0.5, '#ffd95a', 0, 4, 8); t.ball(-0.1, 0, 1.2, 0.35, 0.35, '#ffd95a', 0, 4, 6); t.box(0.15, -0.08, 1.1, 0.4, 0.08, 1.25, '#f0904a', 0); t.box(0.3, -0.5, 0, 1, 0.3, 0.4, '#f4b8d0', 0); } });
  // 书房
  nd('globe', 'study', { name: '地球仪', w: 2.4, d: 2.4, use: 'look', act: '转一转地球仪', say: ["转到哪儿就去哪儿玩", "这块绿的是森林吧"], build(t) { t.cyl(0, 0, 0, 0.4, 1, 0.8, DARK, M.plank, 8); t.cyl(0, 0, 0.4, 4, 0.15, 0.15, DARK, M.plank, 5); t.ball(0, 0, 5, 1.2, 1.2, '#5a8ad8', 0, 6, 10); t.ball(0.4, 0.2, 5.3, 0.6, 0.5, '#7ac85a', 0, 3, 6); t.ball(-0.5, -0.3, 4.6, 0.5, 0.4, '#7ac85a', 0, 3, 6); } });
  nd('ladder', 'study', { name: '书梯', w: 2.4, d: 2, use: 'climb', seat: [0, 0, 7], build(t) { for (const x of [-1, 1]) t.quad([x, -0.9, 0], [x + 0.2, -0.9, 0], [x + 0.2, 0.6, 10], [x, 0.6, 10], '#8a5e3c', 2); for (let i = 1; i < 6; i++) t.box(-1, -0.9 + i * 0.25, i * 1.7, 1.2, -0.6 + i * 0.25, i * 1.7 + 0.2, '#a8784a', M.plank); } });
  nd('readlamp', 'study', { name: '阅读灯', w: 2, d: 2, use: 'lamp', light: [0, 0.8, 9], build(t) { t.cyl(0, 0, 0, 0.4, 0.9, 0.8, '#3a5a4a', M.metal, 8); t.cyl(0, 0, 0, 8.4, 0.12, 0.12, '#3a5a4a', M.metal, 5); t.box(-0.1, 0, 8.3, 0.1, 1, 8.5, '#3a5a4a', M.metal); t.cyl(0, 1, 7.6, 8.4, 0.9, 0.4, '#5aa868', M.metal, 8); t.cyl(0, 1, 7.5, 7.6, 0.7, 0.7, '#ffe9a8', M.glow, 8); } });
  nd('bigshelf', 'study', { name: '高书柜', w: 6, d: 2.2, use: 'book', build(t) { t.box(-3, -1.1, 0, 3, 1.1, 18, '#7a5030', M.plank); for (let i = 0; i < 5; i++) { t.box(-2.8, 0.2, 0.6 + i * 3.4, 2.8, 1.12, 0.9 + i * 3.4, '#5a3a24', M.plank); for (let j = 0; j < 8; j++) t.box(-2.6 + j * 0.66, 0.4, 0.9 + i * 3.4, -2.1 + j * 0.66, 1.1, 3.4 + i * 3.4 - (j % 3) * 0.5, ['#c85a4a', '#5a8ad8', '#e8c860', '#7fc8a8', '#c8a0f0', '#e8a060'][(i + j) % 6], 0); } } });
  // 工作间
  nd('toolwall', 'work', { name: '工具墙', w: 5.6, d: 1, use: 'look', act: '挑一把工具', say: ["锤子、扳手、小锯子……", "这把螺丝刀刚好顺手"], build(t) { t.box(-2.8, -0.3, 2, 2.8, 0.1, 10, '#c8a878', M.plank); for (let i = 0; i < 7; i++) { const x = -2.4 + i * 0.8; t.box(x - 0.1, 0.1, 5 + (i % 3), x + 0.1, 0.3, 8.5 - (i % 2), ['#c0c0c8', '#8a5a3a', '#c0c0c8', COPPER][i % 4], M.metal); } t.posts([[-2.6, 0], [2.6, 0]], 0, 2, DARK, 0.15); } });
  nd('vise', 'work', { name: '钳工台', w: 6, d: 3, use: 'write', act: '敲敲打打修东西', build(t) { t.box(-3, -1.5, 4.6, 3, 1.5, 5.6, '#8a5e3c', M.plank); LEGS(t, 6, 3, 4.6, TIMBER, 0.25); t.box(1.6, -1, 5.6, 2.6, 0.2, 6.8, '#5a5466', M.metal); t.box(-2.4, -0.8, 5.6, -0.4, 0.8, 5.9, '#d8c8a8', 0); t.cyl(-1, 0, 5.9, 6.6, 0.4, 0.4, COPPER, M.metal, 8); t.box(-2.8, -1.4, 1, 2.8, 1.4, 1.3, '#7a5030', M.plank); } });
  nd('parts', 'work', { name: '零件箱', w: 3.4, d: 2.4, use: 'rummage', build(t) { t.box(-1.7, -1.2, 0, 1.7, 1.2, 2.4, '#5a7ab0', M.metal); for (let i = 0; i < 6; i++) t.ball(-1.2 + (i % 3) * 1.1, -0.5 + (i >> 1 & 1) * 1, 2.5, 0.35, 0.3, ['#c0c0c8', COPPER, '#e8c860'][i % 3], M.metal, 3, 5); t.cyl(1.2, 0.8, 2.4, 3.6, 0.4, 0.4, '#8a8a92', M.metal, 8); } });
  nd('anvil', 'work', { name: '小铁砧', w: 3, d: 1.8, use: 'look', act: '叮叮当当敲一敲', say: ["叮！叮！", "敲出一个小钉子"], build(t) { t.cyl(0, 0, 0, 2.6, 0.9, 0.9, '#7a5030', M.plank, 10); t.box(-1, -0.5, 2.6, 1, 0.5, 3.6, '#4a4a52', M.metal); t.box(1, -0.3, 3, 1.6, 0.3, 3.6, '#4a4a52', M.metal); t.box(-0.3, -0.1, 3.6, 0.6, 0.1, 3.7, '#c0c0c8', M.metal); } });
  // 花草
  nd('seedrack', 'garden', { name: '育苗架', w: 4.4, d: 1.8, use: 'sniff', build(t) { t.posts([[-2, -0.7], [2, -0.7], [-2, 0.7], [2, 0.7]], 0, 8, '#a8784a', 0.12); for (const z of [2.2, 5]) { t.box(-2.2, -0.9, z, 2.2, 0.9, z + 0.2, '#c8935e', M.plank); for (let i = 0; i < 4; i++) { t.box(-1.9 + i, -0.5, z + 0.2, -1.2 + i, 0.5, z + 0.8, '#6a4a34', M.soil); t.foliage(-1.55 + i, 0, z + 1.2, 0.4, 0.5, ['#7ac85a', '#9ad86a'], 6, i + z, 0.4); } } } });
  nd('flowerstand', 'garden', { name: '三层花架', w: 3.4, d: 1.8, use: 'sniff', build(t) { for (let i = 0; i < 3; i++) { const z = 1.2 + i * 2.6, y = -0.5 + i * 0.4; t.box(-1.7, y - 0.4, z, 1.7, y + 0.4, z + 0.2, '#e8e4dc', M.plank); for (const x of [-1, 0.2, 1.2]) { t.pot(x, y, z + 0.2, 0.3, ['#c8705a', '#5a7ab0', '#e8c860'][i]); t.flower(x, y, z + 1.4, 0.8, ['#f2a6c2', '#ffd95a', '#ffffff', '#c8a0f0'][(i + Math.round(x)) & 3], i); } } t.posts([[-1.6, -0.6], [1.6, -0.6]], 0, 7.4, '#e8e4dc', 0.1); } });
  nd('wcan', 'garden', { name: '铜喷壶', w: 2, d: 1.4, use: 'look', act: '拿起来浇浇花', say: ["花喝饱啦", "水珠亮晶晶的"], build(t) { t.cyl(0, 0, 0, 2, 0.8, 0.7, COPPER, M.metal, 10); t.quad([0.6, -0.1, 1], [0.6, 0.1, 1], [1.8, 0.1, 2.6], [1.8, -0.1, 2.6], COPPER, M.metal); t.box(-0.2, -0.08, 2, 0.2, 0.08, 2.8, COPPER, M.metal); } });
  nd('bonsai', 'garden', { name: '小盆景', w: 2.4, d: 1.8, use: 'sniff', build(t) { t.box(-1.2, -0.8, 0, 1.2, 0.8, 0.8, '#3a5a7a', 0); t.cyl(0, 0, 0.8, 2.6, 0.2, 0.12, '#6a4a2e', 0, 5); t.foliage(0.5, 0, 3, 0.8, 0.5, ['#3e7a3a', '#5aa64e'], 12, 3, 0.5); t.foliage(-0.6, 0, 2.3, 0.6, 0.4, ['#3e7a3a', '#5aa64e'], 9, 5, 0.5); } });
  nd('fern', 'garden', { name: '蕨类大盆', w: 2.6, d: 2.6, use: 'sniff', build(t) { t.pot(0, 0, 0, 0.9, '#c8705a'); t.foliage(0, 0, 5, 2, 1.6, ['#3f8a44', '#5aa64e', '#7ac85a'], 40, 13, 1.1); } });
  // 阁楼
  nd('easel', 'attic', { name: '画架', w: 3, d: 2.4, use: 'write', act: '画一幅画', build(t) { for (const x of [-1, 1]) t.quad([x, -0.6, 0], [x + 0.2, -0.6, 0], [x * 0.3 + 0.1, 0.2, 9], [x * 0.3, 0.2, 9], '#a8784a', 2); t.quad([0, 1, 0], [0.2, 1, 0], [0.1, 0.2, 8], [0, 0.2, 8], '#a8784a', 2); t.box(-1.4, -0.7, 3.6, 1.4, -0.4, 7.6, '#f8f4ec', M.cloth); t.ball(-0.4, -0.75, 5.6, 0.5, 0.5, '#5aa64e', 0, 3, 5); t.ball(0.5, -0.75, 6.4, 0.4, 0.4, '#e06a5a', 0, 3, 5); } });
  nd('horse', 'attic', { name: '旧木马', w: 4.4, d: 1.6, use: 'play', act: '骑上去摇一摇', say: ["驾！驾！", "摇啊摇"], seat: [0, 0, 4], build(t) { for (const x of [-1.6, 1.6]) t.quad([x, -0.8, 0], [x, 0.8, 0], [x * 0.6, 0.6, 2.4], [x * 0.6, -0.6, 2.4], '#c8935e', 2); t.box(-1.6, -0.5, 2.4, 1.4, 0.5, 3.8, '#e8d0a0', M.plank); t.box(1.2, -0.4, 3.4, 2, 0.4, 5.6, '#e8d0a0', M.plank); t.box(1.6, -0.45, 4.6, 2.4, 0.45, 5.4, '#e8d0a0', M.plank); t.box(-0.6, -0.55, 3.8, 0.4, 0.55, 4.2, '#e06a5a', M.cloth); t.box(1.1, -0.46, 4, 1.5, 0.46, 5.8, '#8a5a3a', M.cloth); } });
  nd('clothtrunk', 'attic', { name: '旧衣箱', w: 4, d: 2.4, use: 'rummage', build(t) { t.box(-2, -1.2, 0, 2, 1.2, 2.6, '#5a7a9a', M.plank); t.quad([-2, -1.2, 2.6], [2, -1.2, 2.6], [2, -1.6, 5], [-2, -1.6, 5], '#4a6a8a', M.plank); t.box(-1.6, -1, 2.6, 1.6, 0.6, 3.2, '#f2a6c2', M.cloth); t.box(-0.6, -0.4, 2.6, 1.8, 1.4, 2.9, '#ffd95a', M.cloth); } });
  nd('telescope', 'attic', { name: '黄铜望远镜', w: 2.6, d: 2.6, use: 'look', act: '看看远处', say: ["下面的田像一块块拼布", "那边有一群鸟飞过去"], build(t) { for (let i = 0; i < 3; i++) { const a = i * 2.1; t.quad([0, 0, 5], [0.1, 0, 5], [Math.cos(a) * 1.2 + 0.1, Math.sin(a) * 1.2, 0], [Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0], DARK, 2); } t.cyl(0, 0, 5, 5.4, 0.3, 0.3, '#3a3448', M.metal, 6); t.quad([-1.2, -0.25, 5.2], [-1.2, 0.25, 5.2], [1.6, 0.35, 6.8], [1.6, -0.35, 6.8], '#e8c860', M.metal); t.quad([-1.2, 0.25, 5.2], [-1.2, 0.25, 5.7], [1.6, 0.35, 7.3], [1.6, 0.35, 6.8], '#c8a050', M.metal); } });
  // 通用
  nd('rugsq', 'common', { name: '方格地毯', w: 8, d: 6, walk: true, use: 'rug', flat: true, build(t) { t.box(-4, -3, 0, 4, 3, 0.2, '#8a5a8a', M.cloth); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) t.box(-3.6 + i * 1.8, -2.6 + j * 1.75, 0.2, -2 + i * 1.8, -1 + j * 1.75, 0.24, '#e8c860', M.cloth); } });
  nd('rugrun', 'common', { name: '长条地毯', w: 10, d: 3, walk: true, use: 'rug', flat: true, build(t) { t.box(-5, -1.5, 0, 5, 1.5, 0.2, '#c85a4a', M.cloth); t.box(-4.6, -1.1, 0.2, 4.6, 1.1, 0.24, '#e8a060', M.cloth); for (let i = 0; i < 5; i++) t.box(-3.8 + i * 1.9, -0.4, 0.24, -3 + i * 1.9, 0.4, 0.28, '#5a8ad8', M.cloth); } });
  nd('screen', 'common', { name: '折叠屏风', w: 6, d: 1.6, use: 'look', act: '在后面躲猫猫', say: ["你看不见我～", "嘘——"], build(t) { for (let i = 0; i < 3; i++) { const x = -2 + i * 2, y = (i % 2) * 0.6 - 0.3; t.box(x - 0.95, y - 0.1, 0.3, x + 0.95, y + 0.1, 9, ['#f4ead8', '#e8dcc4', '#f4ead8'][i], M.cloth); t.box(x - 1, y - 0.15, 0, x + 1, y + 0.15, 0.3, DARK, M.plank); t.flower(x, y - 0.15, 3, 3, ['#e06a5a', '#f2a6c2', '#ffd95a'][i], i); } } });
  nd('clock', 'common', { name: '落地钟', w: 2.4, d: 1.8, use: 'look', act: '听听钟声', say: ["嘀嗒、嘀嗒……", "快到吃饭时间了吧"], build(t) { t.box(-1.2, -0.9, 0, 1.2, 0.9, 13, '#7a4a30', M.plank); t.disc(0, 0.92, 11, 0.9, 'v', '#f8f4ec', 0, 12); t.box(-0.05, 0.94, 11, 0.05, 0.98, 11.7, '#231c20', 0); t.box(-0.4, 0.92, 3, 0.4, 0.96, 8, '#d8eef8', M.glass); t.cyl(0, 0.6, 3.6, 7, 0.05, 0.05, '#e8c860', 0, 3); t.cyl(0, 0.6, 3.2, 3.6, 0.35, 0.35, '#e8c860', M.metal, 8); } });
  nd('crates', 'common', { name: '一摞木箱', w: 3.6, d: 3, use: 'rummage', build(t) { t.box(-1.7, -1.4, 0, 0.5, 1, 2.2, '#a8784a', M.plank); t.box(0.6, -1.2, 0, 1.8, 0.2, 1.4, '#c8935e', M.plank); t.box(-1.4, -1, 2.2, 0.3, 0.7, 3.8, '#b88a5a', M.plank); } });
  nd('hangplant', 'common', { name: '吊兰落地架', w: 2.4, d: 2.4, use: 'sniff', build(t) { t.cyl(0, 0, 0, 0.3, 1, 0.9, DARK, M.plank, 8); t.cyl(0, 0, 0, 10, 0.12, 0.12, DARK, M.plank, 5); t.box(-0.1, -0.1, 9.8, 1.4, 0.1, 10, DARK, M.plank); t.cyl(1.2, 0, 7, 9.8, 0.02, 0.02, '#fff', 0, 3); t.cyl(1.2, 0, 6.2, 7.2, 0.7, 0.45, '#c8705a', 0, 8); t.foliage(1.2, 0, 5.8, 1, 1.4, ['#4c8a40', '#6aa858', '#86cc6a'], 22, 4, 0.7); } });
  nd('stove0', 'common', { name: '小铁炉', w: 3, d: 3, use: 'warm', build(t) { t.cyl(0, 0, 0, 4, 1.3, 1.3, '#3a3448', M.metal, 12); t.cyl(0, 0, 4, 4.6, 1.5, 1.5, '#4a4450', M.metal, 12); t.box(-0.6, 1.25, 1, 0.6, 1.35, 2.4, '#ff9a40', M.glow); t.cyl(0, -0.4, 4.6, 14, 0.3, 0.3, '#3a3448', M.metal, 6); } });

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
    if (e.layout.some((it) => !D[it.f])) e.layout = e.layout.filter((it) => D[it.f]);
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
      m.pk(k >= 0 ? PICK0 + k : 0); d.build(new TM(m, it.u, it.v, it.r, o.zOf ? o.zOf(it) : it.lv ? o.LOFT : 0, o.S || 1), o); m.pk(0);
    });
  }
  const setScale = (s) => { SC = s; };
  PP.FURN = { D, TM, STARTER, owned, defaultLayout, layout, rect, front, seat, build, setScale, PICK0, CATS, MAXN: 80 };
})();
