// 环境：节气 / 季节 / 节日 / 一天中的时刻 / 天气（可接所在城市的实时天气）
// 场景画面、宠物的台词都从这里取数
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;

  // 二十四节气（公历日期每年只差一两天，取常见日期）
  const TERMS = [
    [1, 5, '小寒', '小寒了，多穿点'], [1, 20, '大寒', '一年最冷的时候，大家抱团取暖'],
    [2, 4, '立春', '立春啦，冬天要走了'], [2, 19, '雨水', '雨水，草要冒芽了'],
    [3, 5, '惊蛰', '惊蛰！虫子都醒了'], [3, 20, '春分', '春分，白天和黑夜一样长'],
    [4, 4, '清明', '清明，出去踏青吧'], [4, 20, '谷雨', '谷雨，雨生百谷'],
    [5, 5, '立夏', '立夏！西瓜季要来了'], [5, 21, '小满', '小满，麦子快熟了'],
    [6, 5, '芒种', '芒种，大家都好忙'], [6, 21, '夏至', '夏至，一年里白天最长的一天'],
    [7, 7, '小暑', '小暑，热起来了'], [7, 22, '大暑', '大暑…好想泡在水里'],
    [8, 7, '立秋', '立秋，贴秋膘！'], [8, 23, '处暑', '处暑，热快过去了'],
    [9, 7, '白露', '白露，早上草叶上有露珠'], [9, 23, '秋分', '秋分，叶子开始变色了'],
    [10, 8, '寒露', '寒露，晚上凉了'], [10, 23, '霜降', '霜降，柿子红了'],
    [11, 7, '立冬', '立冬，要吃饺子！'], [11, 22, '小雪', '小雪，今年会下雪吗？'],
    [12, 7, '大雪', '大雪，想堆雪人'], [12, 21, '冬至', '冬至，一年里夜最长的一天'],
  ];
  const md = (d) => (d.getMonth() + 1) * 100 + d.getDate();
  function termOf(d = new Date()) {
    const k = md(d);
    let cur = TERMS[TERMS.length - 1], today = null;
    for (const t of TERMS) { const tk = t[0] * 100 + t[1]; if (tk <= k) cur = t; if (tk === k) today = t; }
    return { name: cur[2], today: today ? { name: today[2], line: today[3] } : null };
  }
  // 按节气分四季：立春 / 立夏 / 立秋 / 立冬
  PP.season = function (d = new Date()) {
    const k = md(d);
    if (k >= 204 && k < 505) return 'spring';
    if (k >= 505 && k < 807) return 'summer';
    if (k >= 807 && k < 1107) return 'autumn';
    return 'winter';
  };
  const SEASON_NAME = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

  // 日出日落（没设城市时用一张大致的表）
  const RISE = [7.6, 7.3, 6.7, 6.0, 5.4, 5.1, 5.3, 5.7, 6.1, 6.5, 7.0, 7.5];
  const SET = [17.4, 18.0, 18.4, 18.8, 19.2, 19.5, 19.5, 19.1, 18.4, 17.8, 17.2, 17.0];
  function sunTimes(d) {
    const w = live && live.rise != null ? live : null;
    return w ? [w.rise, w.set] : [RISE[d.getMonth()], SET[d.getMonth()]];
  }
  // 时刻：dawn 清晨 / day 白天 / dusk 傍晚 / night 夜里；light 0~1 用来给画面调色
  function phaseOf(d = new Date()) {
    const h = d.getHours() + d.getMinutes() / 60;
    const [r, s] = sunTimes(d);
    let phase = 'day';
    if (h < r - 0.6 || h > s + 0.7) phase = 'night';
    else if (h < r + 0.8) phase = 'dawn';
    else if (h > s - 0.9) phase = 'dusk';
    const light = U.clamp(Math.min((h - (r - 0.8)) / 1.6, ((s + 0.9) - h) / 1.8), 0, 1);
    const name = h < 5 ? '深夜' : h < 8 ? '清晨' : h < 11 ? '上午' : h < 13 ? '中午' : h < 17 ? '下午' : h < 19.5 ? '傍晚' : h < 23 ? '晚上' : '深夜';
    return { phase, light, name, hour: h };
  }

  // ---------- 天气 ----------
  // kind: clear 晴 / cloudy 多云 / rain 雨 / snow 雪 / fog 雾 / storm 雷雨
  PP.WEATHER = [['clear', '晴'], ['cloudy', '多云'], ['rain', '下雨'], ['snow', '下雪'], ['fog', '起雾'], ['storm', '雷雨']];
  const WNAME = Object.fromEntries(PP.WEATHER);
  function fromWMO(c) {
    if (c == null) return null;
    if (c === 0 || c === 1) return 'clear';
    if (c === 2 || c === 3) return 'cloudy';
    if (c === 45 || c === 48) return 'fog';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    if (c >= 95) return 'storm';
    if (c >= 51 && c <= 82) return 'rain';
    return 'cloudy';
  }
  let live = null, liveAt = 0, liveErr = '';
  async function fetchLive(force) {
    const c = G.save && G.save.settings.city;
    if (!c) return;
    if (!force && Date.now() - liveAt < 25 * 60000) return;
    liveAt = Date.now();
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&forecast_days=1&timezone=auto`;
      const j = await fetch(url).then((r) => r.json());
      const hr = (s) => { const m = /T(\d+):(\d+)/.exec(s || ''); return m ? +m[1] + m[2] / 60 : null; };
      live = { kind: fromWMO(j.current && j.current.weather_code), temp: j.current && Math.round(j.current.temperature_2m), rise: hr(j.daily && j.daily.sunrise && j.daily.sunrise[0]), set: hr(j.daily && j.daily.sunset && j.daily.sunset[0]), at: Date.now() };
      liveErr = '';
    } catch (e) { liveErr = '天气获取失败（网络不通？）'; console.warn('weather', e); }
  }
  async function searchCity(q) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=zh&format=json`;
    const j = await fetch(url).then((r) => r.json());
    return (j.results || []).map((r) => ({ name: r.name, area: [r.admin1, r.country].filter(Boolean).join(' · '), lat: +r.latitude.toFixed(3), lon: +r.longitude.toFixed(3) }));
  }
  // 没设城市：按季节“模拟”天气，每半天换一次，同一时段每次打开都一样
  function simWeather(d) {
    const season = PP.season(d);
    const seed = d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate() * 2 + (d.getHours() >= 12 ? 1 : 0);
    let s = seed >>> 0; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    r(); r();
    const table = {
      spring: [['clear', 45], ['cloudy', 30], ['rain', 25]],
      summer: [['clear', 50], ['cloudy', 20], ['rain', 20], ['storm', 10]],
      autumn: [['clear', 52], ['cloudy', 30], ['rain', 10], ['fog', 8]],
      winter: [['clear', 45], ['cloudy', 28], ['snow', 18], ['fog', 9]],
    }[season];
    let x = r() * 100, kind = 'clear';
    for (const [k, w] of table) { if ((x -= w) <= 0) { kind = k; break; } }
    const base = { spring: 15, summer: 29, autumn: 17, winter: 2 }[season];
    return { kind, temp: Math.round(base + (r() - 0.5) * 8 - (kind === 'rain' || kind === 'snow' ? 3 : 0)) };
  }
  function weather(d = new Date()) {
    const s = G.save ? G.save.settings : {};
    const mode = s.weather || 'auto';
    if (mode !== 'auto' && WNAME[mode]) { const sim = simWeather(d); return { kind: mode, temp: sim.temp, source: 'manual' }; }
    if (s.city && live && live.kind && Date.now() - live.at < 3 * 3600000) return { kind: live.kind, temp: live.temp, source: 'live', city: s.city.name };
    const sim = simWeather(d);
    return { kind: sim.kind, temp: sim.temp, source: 'sim' };
  }

  // ---------- 汇总（每秒算一次） ----------
  let cur = null, curAt = 0;
  function get() {
    if (cur && performance.now() - curAt < 1000) return cur;
    const d = new Date();
    const hol = PP.holiday(d);
    cur = { season: PP.season(d), term: termOf(d), holiday: hol, time: phaseOf(d), weather: weather(d), date: d };
    curAt = performance.now();
    return cur;
  }
  function label() {
    const e = get(), w = e.weather;
    return `${e.term.name}·${SEASON_NAME[e.season]} · ${e.time.name} · ${WNAME[w.kind]}${w.temp != null ? ' ' + w.temp + '°' : ''}${w.source === 'live' ? `（${w.city}）` : w.source === 'sim' ? '（模拟）' : ''}${e.holiday ? ' · ' + e.holiday.name : ''}`;
  }

  // ---------- 变化时让主角说一声 ----------
  let lastKind = null, lastTermDay = '', lastPhase = null;
  function say(text, mood) {
    const p = PP.F && PP.F.main();
    if (!p || p.sleeping || G.save.settings.quiet) return;
    p.say(text, 4);
    if (mood === 'happy' && p.setExpr) p.setExpr('happy', 'smile', 2);
  }
  function tick() {
    if (!G.save) return;
    fetchLive(false);
    const e = get();
    const dk = U.dateKey(e.date);
    if (e.term.today && lastTermDay !== dk) {
      if (lastTermDay) say(e.term.today.line, 'happy');
      else setTimeout(() => say(e.term.today.line, 'happy'), 9000);
      if (!G.save.flags['term:' + dk]) { G.save.flags['term:' + dk] = 1; PP.ui && PP.ui.toast(`今天${e.term.today.name}`); }
      lastTermDay = dk;
    }
    const k = e.weather.kind;
    if (lastKind && k !== lastKind) {
      const lines = {
        rain: ['下雨了…', '雨声好好听', '要不要进屋躲躲雨？'], snow: ['下雪了！！', '雪！是雪！'], storm: ['打雷了…有点怕', '轰隆隆——'],
        fog: ['起雾了，看不清远处', '雾蒙蒙的'], cloudy: ['云好厚', '天阴下来了'], clear: [lastKind === 'rain' || lastKind === 'storm' ? '雨停了！' : '出太阳了～'],
      }[k];
      if (lines) say(U.pick(lines), k === 'snow' || k === 'clear' ? 'happy' : null);
      // 鸭子最喜欢下雨
      if (k === 'rain') for (const p of G.pets) if (p.d.species === 'duck' && !p.sleeping) { PP.hearts && PP.hearts(p.x, p.y - 30 * G.S, 2); }
    }
    lastKind = k;
    const ph = e.time.phase;
    if (lastPhase && ph !== lastPhase && ph === 'dusk' && Math.random() < 0.6) say(U.pick(['天快黑了', '晚霞好漂亮', '小屋的灯要亮了']));
    lastPhase = ph;
  }
  setInterval(tick, 5000);

  PP.env = {
    get, label, tick, searchCity, refresh: () => fetchLive(true),
    weatherName: (k) => WNAME[k] || k, seasonName: (s) => SEASON_NAME[s],
    get liveError() { return liveErr; },
    TERMS,
  };
})();
