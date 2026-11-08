// 公共工具 & 时间/节日计算
(function () {
  const PP = (window.PP = window.PP || {});

  const U = (PP.U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    chance: (p) => Math.random() < p,
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    // 加权随机：[[item, weight], ...]
    weighted(list) {
      let s = 0;
      for (const [, w] of list) s += Math.max(0, w);
      if (s <= 0) return list.length ? list[0][0] : null;
      let r = Math.random() * s;
      for (const [it, w] of list) {
        r -= Math.max(0, w);
        if (r <= 0) return it;
      }
      return list[list.length - 1][0];
    },
    uid: () => Math.random().toString(36).slice(2, 9),
    now: () => Date.now(),
    dateKey(d = new Date()) {
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    },
    hourF(d = new Date()) {
      return d.getHours() + d.getMinutes() / 60;
    },
    daysBetween(a, b) {
      return Math.floor((b - a) / 86400000);
    },
    fmtDur(ms) {
      const m = Math.round(ms / 60000);
      if (m < 60) return `${m}分钟`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}小时`;
      return `${Math.floor(h / 24)}天`;
    },
  });

  // 月相：0=新月 0.5=满月
  PP.moonPhase = function (d = new Date()) {
    const syn = 29.530588853;
    const ref = Date.UTC(2000, 0, 6, 18, 14); // 已知新月
    const days = (d.getTime() - ref) / 86400000;
    return (((days / syn) % 1) + 1) % 1;
  };
  PP.isFullMoon = (d = new Date()) => Math.abs(PP.moonPhase(d) - 0.5) < 0.035;

  // 农历节日（公历日期表，2025-2032）
  const LUNAR = {
    spring: ['2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11'],
    lantern: ['2025-02-12', '2026-03-03', '2027-02-20', '2028-02-09', '2029-02-27', '2030-02-17', '2031-02-06', '2032-02-25'],
    dragon: ['2025-05-31', '2026-06-19', '2027-06-09', '2028-05-28', '2029-06-16', '2030-06-05', '2031-06-24', '2032-06-12'],
    qixi: ['2025-08-29', '2026-08-19', '2027-08-08', '2028-08-26', '2029-08-16', '2030-08-05', '2031-08-24', '2032-08-12'],
    midautumn: ['2025-10-06', '2026-09-25', '2027-09-15', '2028-10-03', '2029-09-22', '2030-09-12', '2031-10-01', '2032-09-19'],
  };
  function inLunar(key, d, before = 0, after = 0) {
    const t = new Date(U.dateKey(d)).getTime();
    return LUNAR[key].some((s) => {
      const x = new Date(s).getTime();
      return t >= x - before * 86400000 && t <= x + after * 86400000;
    });
  }

  // 返回今天的节日 {id, name, hat, food, deco}
  PP.holiday = function (d = new Date()) {
    const m = d.getMonth() + 1,
      day = d.getDate();
    if (inLunar('spring', d, 1, 6)) return { id: 'spring', name: '春节', hat: 'red', food: 'dumpling', deco: 'lantern', line: '新年快乐！恭喜发财！' };
    if (inLunar('lantern', d)) return { id: 'lantern', name: '元宵节', hat: 'red', food: 'tangyuan', deco: 'lantern', line: '吃汤圆啦～' };
    if (inLunar('dragon', d)) return { id: 'dragon', name: '端午节', hat: null, food: 'zongzi', deco: null, line: '粽子是甜的还是咸的？' };
    if (inLunar('qixi', d)) return { id: 'qixi', name: '七夕', hat: null, food: null, deco: 'hearts', line: '今天要和最喜欢的人在一起' };
    if (inLunar('midautumn', d)) return { id: 'midautumn', name: '中秋节', hat: null, food: 'mooncake', deco: 'moon', line: '月亮好圆…' };
    if (m === 1 && day === 1) return { id: 'newyear', name: '元旦', hat: 'party', food: 'cake', deco: 'confetti', line: '新的一年也要在一起！' };
    if (m === 2 && day === 14) return { id: 'valentine', name: '情人节', hat: null, food: null, deco: 'hearts', line: '♥' };
    if (m === 5 && day === 20) return { id: '520', name: '520', hat: null, food: null, deco: 'hearts', line: '我爱你（小声）' };
    if (m === 10 && day === 24) return { id: '1024', name: '程序员节', hat: 'glasses', food: null, deco: null, line: '今天不写bug！' };
    if (m === 10 && day === 31) return { id: 'halloween', name: '万圣节', hat: 'pumpkin', food: 'candy', deco: 'bats', line: '不给糖就捣蛋！' };
    if (m === 12 && (day === 24 || day === 25)) return { id: 'xmas', name: '圣诞节', hat: 'santa', food: 'cookie', deco: 'snow', line: '圣诞快乐～' };
    if (m === 12 && day === 31) return { id: 'nye', name: '跨年夜', hat: 'party', food: null, deco: 'confetti', line: '一起倒数吧！' };
    return null;
  };

  PP.season = function (d = new Date()) {
    const m = d.getMonth() + 1;
    if (m >= 3 && m <= 5) return 'spring';
    if (m >= 6 && m <= 8) return 'summer';
    if (m >= 9 && m <= 11) return 'autumn';
    return 'winter';
  };

  // ---------- 调色：整体往柔和、温暖的绘本色调靠（参考巫奇魔法学院那种配色） ----------
  // 饱和度降一点、暗部提亮并偏紫、亮部偏暖，所有场景和动物统一用这一套
  (function () {
    const cache = new Map();
    function hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
    function rgb(h, s, l) { if (!s) return [l, l, l].map((v) => Math.round(v * 255)); const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255)); }
    function grade(r, g, b) {
      let [h, s, l] = hsl(r, g, b);
      s = s * (0.84 + 0.1 * (1 - Math.abs(l - 0.55) * 2));
      // 暗部：别太黑，往紫色偏一点
      if (l < 0.4) { const k = (0.4 - l) / 0.4; h = h + ((0.74 - h + (h > 0.24 ? 0 : -1)) % 1) * 0.18 * k; s = Math.min(1, s + 0.06 * k); l = l + 0.05 * k; }
      // 亮部：带一点暖意
      if (l > 0.62) { const k = (l - 0.62) / 0.38; const dh = ((0.1 - h + 1.5) % 1) - 0.5; h = (h + dh * 0.1 * k + 1) % 1; }
      l = 0.03 + l * 0.95;
      let [R, G2, B] = rgb(h, s, l);
      // 一层很淡的暖光
      R = Math.round(R * 0.97 + 255 * 0.03); G2 = Math.round(G2 * 0.975 + 242 * 0.025); B = Math.round(B * 0.98 + 225 * 0.02);
      return [R, G2, B];
    }
    PP.grade = function (r, g, b) { const k = (r << 16) | (g << 8) | b; let v = cache.get(k); if (!v) { v = grade(r, g, b); cache.set(k, v); } return v; };
    PP.gradeHex = function (hex) { const n = parseInt(hex.slice(1, 7), 16); const [r, g, b] = PP.grade(n >> 16, (n >> 8) & 255, n & 255); return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('') + (hex.length > 7 ? hex.slice(7) : ''); };
    // Pix（ABGR 的 Uint32）整张调色
    PP.gradePix = function (d) { const m = new Map(); for (let i = 0; i < d.length; i++) { const v = d[i]; if (!(v >>> 24)) continue; let o = m.get(v); if (o === undefined) { const [r, g, b] = PP.grade(v & 255, (v >>> 8) & 255, (v >>> 16) & 255); o = ((v >>> 24) << 24 | (b << 16) | (g << 8) | r) >>> 0; m.set(v, o); } d[i] = o; } };
  })();
})();
