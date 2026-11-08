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
    const fix = G.save && G.save.settings.seasonFix;
    if (fix) return fix; // 固定季节
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
  PP.WEATHER = [['clear', '晴'], ['partly', '少云'], ['cloudy', '阴天'], ['drizzle', '小雨'], ['rain', '下雨'], ['heavyrain', '大雨'], ['sleet', '雨夹雪'], ['snow', '下雪'], ['heavysnow', '大雪'], ['fog', '起雾'], ['storm', '雷雨'], ['windy', '大风']];
  const WNAME = Object.fromEntries(PP.WEATHER);
  // WMO 天气代码 → 我们的天气（尽量细：毛毛雨、大雨、雨夹雪、大雪……）
  function fromWMO(c) {
    if (c == null) return null;
    if (c === 0) return 'clear';
    if (c === 1 || c === 2) return 'partly';
    if (c === 3) return 'cloudy';
    if (c === 45 || c === 48) return 'fog';
    if (c === 51 || c === 53 || c === 55 || c === 61) return 'drizzle';
    if (c === 63 || c === 80 || c === 81) return 'rain';
    if (c === 65 || c === 82) return 'heavyrain';
    if (c === 56 || c === 57 || c === 66 || c === 67) return 'sleet';
    if (c === 71 || c === 73 || c === 77 || c === 85) return 'snow';
    if (c === 75 || c === 86) return 'heavysnow';
    if (c >= 95) return 'storm';
    return 'cloudy';
  }
  // 风力：0 无风 / 1 微风 / 2 有风 / 3 大风（km/h）
  const windLevel = (v) => (v == null ? null : v < 12 ? 0 : v < 24 ? 1 : v < 38 ? 2 : 3);
  let live = null, liveAt = 0, liveErr = '';
  async function fetchLive(force) {
    const c = G.save && G.save.settings.city;
    if (!c) return;
    if (!force && Date.now() - liveAt < 25 * 60000) return;
    liveAt = Date.now();
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code,is_day,wind_speed_10m&daily=sunrise,sunset&forecast_days=1&timezone=auto`;
      const j = await fetch(url).then((r) => r.json());
      const hr = (s) => { const m = /T(\d+):(\d+)/.exec(s || ''); return m ? +m[1] + m[2] / 60 : null; };
      live = { kind: fromWMO(j.current && j.current.weather_code), temp: j.current && Math.round(j.current.temperature_2m), wind: windLevel(j.current && j.current.wind_speed_10m), rise: hr(j.daily && j.daily.sunrise && j.daily.sunrise[0]), set: hr(j.daily && j.daily.sunset && j.daily.sunset[0]), at: Date.now() };
      liveErr = '';
    } catch (e) { liveErr = '天气获取失败（网络不通？）'; console.warn('weather', e); }
  }
  // 先查内置城市表（中文地名准、离线也能用），再用 Open-Meteo 补充县 / 区 / 国外城市
  const RANK = { PPLC: 0, PPLA: 1, PPLA2: 2, PPLA3: 3, PPLA4: 4 };
  async function searchCity(q) {
    q = (q || '').trim();
    const loc = PP.cities ? PP.cities.local(q) : { list: [], rest: q, prov: null };
    let out = loc.list.slice(0, 24);
    const base = loc.sub || loc.rest || '';
    const name = base.replace(/(市|县|区|镇|乡)$/, '');
    const needOnline = name && (out.length < 3 || !loc.exact || !!loc.sub || /[县区镇乡]$/.test(loc.rest));
    if (needOnline) {
      const tries = [...new Set([base, name, loc.sub ? '' : q].filter(Boolean))];
      let online = [];
      for (const t of tries) {
        try {
          const j = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(t)}&count=20&language=zh&format=json`).then((r) => r.json());
          online = online.concat(j.results || []);
        } catch (e) { if (!out.length) throw e; }
        if (online.length >= 5) break;
      }
      const provKey = loc.prov && loc.prov.slice(0, 2);
      online = online
        .filter((r) => !provKey || (r.admin1 || '').includes(provKey))
        .filter((r) => !out.some((c) => Math.abs(c.lat - r.latitude) < 0.15 && Math.abs(c.lon - r.longitude) < 0.15))
        .sort((a, b) => (RANK[a.feature_code] ?? 9) - (RANK[b.feature_code] ?? 9) || (b.population || 0) - (a.population || 0));
      const seen = new Set();
      for (const r of online) {
        const k = r.name + '|' + (r.admin1 || '') + '|' + (r.admin2 || '');
        if (seen.has(k)) continue; seen.add(k);
        out.push({ name: r.name, area: [r.admin2 !== r.name ? r.admin2 : '', r.admin1, r.country].filter(Boolean).join(' · '), lat: +r.latitude.toFixed(3), lon: +r.longitude.toFixed(3) });
        if (out.length >= 16) break;
      }
    }
    // 写了省但具体地方没找到：把这个省的城市列出来，选最近的就行
    if (!out.length && loc.all && loc.all.length) out = loc.all.map((c) => ({ ...c, area: c.area + ' · 选个离你近的' }));
    return out;
  }
  // 没设城市：按季节“模拟”天气，每半天换一次，同一时段每次打开都一样
  function simWeather(d) {
    const season = PP.season(d);
    const seed = d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate() * 2 + (d.getHours() >= 12 ? 1 : 0);
    let s = seed >>> 0; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    r(); r();
    const table = {
      spring: [['clear', 26], ['partly', 22], ['cloudy', 18], ['drizzle', 18], ['rain', 10], ['windy', 6]],
      summer: [['clear', 34], ['partly', 20], ['cloudy', 10], ['rain', 14], ['heavyrain', 8], ['storm', 10], ['drizzle', 4]],
      autumn: [['clear', 34], ['partly', 22], ['cloudy', 18], ['drizzle', 8], ['rain', 6], ['fog', 6], ['windy', 6]],
      winter: [['clear', 30], ['partly', 18], ['cloudy', 20], ['snow', 12], ['heavysnow', 4], ['sleet', 6], ['fog', 6], ['windy', 4]],
    }[season];
    let x = r() * 100, kind = 'clear';
    for (const [k, w] of table) { if ((x -= w) <= 0) { kind = k; break; } }
    const base = [3, 6, 11, 17, 22, 26, 29, 28, 24, 18, 12, 6][d.getMonth()]; // 按月份的大致气温
    const wet = /rain|snow|sleet|drizzle|storm/.test(kind);
    let temp = Math.round(base + (r() - 0.5) * 8 - (wet ? 3 : 0));
    if (/snow|sleet/.test(kind)) temp = Math.min(temp, 1);
    const wind = kind === 'windy' || kind === 'storm' ? 2 + Math.round(r()) : kind === 'heavyrain' || kind === 'heavysnow' ? 2 : r() < 0.3 ? 1 : 0;
    return { kind, temp, wind };
  }
  function weather(d = new Date()) {
    const s = G.save ? G.save.settings : {};
    const mode = s.weather || 'auto';
    if (mode !== 'auto' && WNAME[mode]) {
      const sim = simWeather(d);
      const wind = mode === 'windy' || mode === 'storm' ? 3 : mode === 'heavyrain' || mode === 'heavysnow' ? 2 : 0;
      return { kind: mode, temp: /snow|sleet/.test(mode) ? Math.min(sim.temp, 0) : sim.temp, wind, source: 'manual' };
    }
    if (s.city && live && live.kind && Date.now() - live.at < 3 * 3600000) {
      let kind = live.kind;
      if ((kind === 'clear' || kind === 'partly' || kind === 'cloudy') && live.wind >= 3) kind = 'windy';
      return { kind, temp: live.temp, wind: live.wind || 0, source: 'live', city: s.city.name };
    }
    const sim = simWeather(d);
    return { kind: sim.kind, temp: sim.temp, wind: sim.wind, source: 'sim' };
  }
  // 画面和声音共用的一组数值：雨量、雪量、云量、雾、雷、风（保证看到的和听到的一致）
  function fx(w) {
    const k = w.kind;
    return {
      rain: { drizzle: 0.3, rain: 0.65, heavyrain: 1, storm: 1, sleet: 0.45 }[k] || 0,
      snow: { snow: 0.6, heavysnow: 1, sleet: 0.4 }[k] || 0,
      cloud: { clear: 0, partly: 0.35, windy: 0.4, cloudy: 0.85, fog: 0.6 }[k] != null ? { clear: 0, partly: 0.35, windy: 0.4, cloudy: 0.85, fog: 0.6 }[k] : 0.95,
      fog: k === 'fog' ? 1 : 0,
      storm: k === 'storm',
      wind: w.wind || 0,
      dark: { cloudy: 0.12, drizzle: 0.14, rain: 0.2, heavyrain: 0.28, storm: 0.32, sleet: 0.2, snow: 0.1, heavysnow: 0.16, fog: 0.08 }[k] || 0,
    };
  }

  // ---------- 汇总（每秒算一次） ----------
  let cur = null, curAt = 0;
  function get() {
    const fixNow = G.save && G.save.settings.seasonFix;
    if (cur && performance.now() - curAt < 1000 && cur.fix === fixNow) return cur;
    const d = new Date();
    const hol = PP.holiday(d);
    const w = weather(d);
    cur = { fix: fixNow, season: PP.season(d), term: termOf(d), holiday: hol, time: phaseOf(d), weather: w, fx: fx(w), date: d };
    curAt = performance.now();
    return cur;
  }
  function label() {
    const e = get(), w = e.weather;
 const sf = G.save && G.save.settings.seasonFix;
    return `${sf ? SEASON_NAME[e.season] + '（固定）' : e.term.name + '·' + SEASON_NAME[e.season]} · ${e.time.name} · ${WNAME[w.kind]}${w.temp != null ? ' ' + w.temp + '°' : ''}${w.source === 'live' ? `（${w.city}）` : w.source === 'sim' ? '（模拟）' : ''}${e.holiday ? ' · ' + e.holiday.name : ''}`;
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
        drizzle: ['飘小雨了', '毛毛雨～'], rain: ['下雨了…', '雨声好好听', '要不要进屋躲躲雨？'], heavyrain: ['好大的雨！', '快进屋！'], sleet: ['雨里夹着雪粒子'],
        snow: ['下雪了！！', '雪！是雪！'], heavysnow: ['好大的雪，可以堆雪人了'], storm: ['打雷了…有点怕', '轰隆隆——'], windy: ['风好大，毛都吹乱了'],
        fog: ['起雾了，看不清远处', '雾蒙蒙的'], cloudy: ['天阴下来了'], partly: ['云飘过来了'], clear: [/rain|storm|drizzle/.test(lastKind) ? '雨停了！' : '出太阳了～'],
      }[k];
      if (lines) say(U.pick(lines), /snow|clear/.test(k) ? 'happy' : null);
      // 鸭子最喜欢下雨
      if (/rain|drizzle/.test(k)) for (const p of G.pets) if (p.d.species === 'duck' && !p.sleeping) { PP.hearts && PP.hearts(p.x, p.y - 30 * G.S, 2); }
    }
    lastKind = k;
    const ph = e.time.phase;
    if (lastPhase && ph !== lastPhase && ph === 'dusk' && Math.random() < 0.6) say(U.pick(['天快黑了', '晚霞好漂亮', '小屋的灯要亮了']));
    lastPhase = ph;
  }
  setInterval(tick, 5000);

  // ---------- 每个地方自己的气候 ----------
  // season：画面上看起来是什么季节；allow：这里会出现的天气。
  // 实时天气不在这个地方的范围里时（比如沙漠下雪），这里就随机换成一种它有的天气（每两小时换一次，不会乱跳）
  const ALL = PP.WEATHER.map((w) => w[0]);
  const CLIMATE = {
    snow: { season: () => 'winter', allow: ['clear', 'partly', 'cloudy', 'snow', 'heavysnow', 'fog', 'windy'], temp: (t) => Math.min(t, -3) },
    mountain: { season: (s) => s, allow: ALL.filter((k) => k !== 'heavyrain'), temp: (t) => t - 8 },
    jungle: { season: () => 'summer', allow: ['clear', 'partly', 'cloudy', 'drizzle', 'rain', 'heavyrain', 'storm', 'fog'], temp: (t) => Math.max(t, 24) },
    desert: { season: () => 'summer', allow: ['clear', 'clear', 'partly', 'windy'], temp: (t) => Math.max(t, 30) },
    savanna: { season: (s) => (s === 'winter' || s === 'autumn' ? 'autumn' : 'summer'), allow: ['clear', 'clear', 'partly', 'cloudy', 'drizzle', 'rain', 'storm', 'windy'], temp: (t) => Math.max(t, 22) },
    beach: { season: (s) => (s === 'winter' ? 'autumn' : s), allow: ['clear', 'partly', 'cloudy', 'drizzle', 'rain', 'heavyrain', 'storm', 'windy', 'fog'], temp: (t) => t + 2 },
    sea: { season: () => 'summer', allow: ['clear'], temp: () => 20 },
    // 你的小天地：浮空岛在云上面，不下大雨；地底森林没有天气
    skyisle: { season: (s) => s, allow: ['clear', 'clear', 'partly', 'cloudy', 'drizzle', 'snow', 'windy', 'fog'], temp: (t) => t - 3 },
    undergrove: { season: (s) => s, allow: ['clear'], temp: () => 16 },
  };
  const atCache = {};
  function at(scene) {
    const e = get(), c = CLIMATE[scene];
    if (!c) return Object.assign({}, e, { realSeason: e.season });
    const k0 = e.weather.kind, slot = Math.floor(Date.now() / 7200000);
    const key = scene + '|' + k0 + '|' + slot + '|' + e.season;
    let w = atCache[key];
    if (!w) {
      let kind = k0;
      if (!c.allow.includes(kind)) {
        let h = 0; for (const ch of scene + slot) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        kind = c.allow[h % c.allow.length];
      }
      w = { kind, temp: e.weather.temp != null ? Math.round(c.temp(e.weather.temp)) : null, wind: kind === 'windy' ? Math.max(3, e.weather.wind) : Math.min(e.weather.wind, kind === 'clear' ? 1 : 9), source: kind === k0 ? e.weather.source : 'local' };
      for (const k in atCache) delete atCache[k];
      atCache[key] = w;
    }
    return Object.assign({}, e, { season: c.season(e.season), realSeason: e.season, weather: w, fx: fx(w) });
  }
  PP.CLIMATE = CLIMATE;

  PP.env = {
    get, at, label, tick, searchCity, refresh: () => fetchLive(true),
    weatherName: (k) => WNAME[k] || k, seasonName: (s) => SEASON_NAME[s],
    get liveError() { return liveErr; },
    TERMS,
  };
})();
