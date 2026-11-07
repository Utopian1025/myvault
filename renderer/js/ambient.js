// 场景白噪音：雨声、风声、林间鸟叫、夜里虫鸣、湖水、壁炉噼啪……
// 全部用滤波后的噪声合成（不用低频振荡器，避免“滋滋”的电流感），音量很小，可以在菜单里关掉
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  let ac = null, master = null, beds = null, noiseBuf = null, brownBuf = null;

  function makeNoise(brown) {
    const len = ac.sampleRate * 4, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } else d[i] = w * 0.5;
    }
    // 首尾做交叉淡化，循环时不会“咔”一声
    const f = Math.floor(ac.sampleRate * 0.05);
    for (let i = 0; i < f; i++) { const a = i / f; d[i] = d[i] * a + d[len - f + i] * (1 - a); }
    return b;
  }
  // 一路持续的噪声床：噪声 → 滤波 → 增益
  function bed(buf, type, freq, q) {
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.loopEnd = buf.duration - 0.05;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = ac.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(master); src.start(0, Math.random() * 3);
    return { src, f, g };
  }
  function init() {
    if (ac) return true;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    master = ac.createGain(); master.gain.value = 0;
    // 柔和一点：整体再过一道低通
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;
    master.connect(lp).connect(ac.destination);
    noiseBuf = makeNoise(false); brownBuf = makeNoise(true);
    beds = {
      rain: bed(noiseBuf, 'bandpass', 2600, 0.5),      // 雨丝
      rainLow: bed(brownBuf, 'lowpass', 900),           // 雨打在地上
      wind: bed(brownBuf, 'bandpass', 500, 0.8),        // 风
      water: bed(brownBuf, 'lowpass', 420),             // 湖水
      fire: bed(brownBuf, 'lowpass', 260),              // 炉火低低的呼呼声
      room: bed(noiseBuf, 'lowpass', 700),              // 屋里听到的闷闷雨声
    };
    return true;
  }
  const set = (b, v, tc = 1.2) => b.g.gain.setTargetAtTime(v, ac.currentTime, tc);

  // ---------- 点缀音：鸟叫、虫鸣、炉火噼啪、远处的雷 ----------
  function chirp(base) {
    const t0 = ac.currentTime, n = U.randi(2, 5), f0 = base * U.rand(0.85, 1.2);
    for (let i = 0; i < n; i++) {
      const o = ac.createOscillator(), g = ac.createGain(), t = t0 + i * U.rand(0.09, 0.16);
      o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * U.rand(1.2, 1.6), t + 0.05); o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + 0.09);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.12);
    }
  }
  function cricket() {
    const t0 = ac.currentTime, f = U.rand(4200, 4800);
    for (let i = 0; i < 3; i++) {
      const o = ac.createOscillator(), g = ac.createGain(), t = t0 + i * 0.07;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.06);
    }
  }
  function crackle() {
    const t = ac.currentTime, src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = U.rand(1500, 3500);
    const g = ac.createGain(); g.gain.setValueAtTime(U.rand(0.05, 0.12), t); g.gain.exponentialRampToValueAtTime(0.0001, t + U.rand(0.015, 0.04));
    src.connect(f).connect(g).connect(master); src.start(t, Math.random() * 3); src.stop(t + 0.05);
  }
  function thunder(near) {
    const t = ac.currentTime + (near ? 0.05 : U.rand(0.3, 1.2)), src = ac.createBufferSource(); src.buffer = brownBuf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = near ? 380 : 180;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(near ? 0.5 : 0.3, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + U.rand(2.2, 3.5));
    src.connect(f).connect(g).connect(master); src.start(t, Math.random()); src.stop(t + 4);
  }
  function drip() {
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), f = U.rand(900, 1500);
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.06);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.02, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.1);
  }
  PP.ambientThunder = (near) => { if (ac && on()) thunder(near); };

  function on() {
    const s = G.save && G.save.settings;
    return !!(s && s.ambient && PP.scene && PP.scene.active());
  }

  // 每 0.25 秒按场景/天气/时间调一次各路音量
  let last = 0;
  function tick() {
    if (!G.save) return;
    const want = on();
    if (!want) { if (ac && master) master.gain.setTargetAtTime(0, ac.currentTime, 0.6); return; }
    if (!init()) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const s = G.save.settings, e = PP.env.get();
    master.gain.setTargetAtTime(0.9 * (s.ambientVol != null ? s.ambientVol : 0.5), ac.currentTime, 0.8);
    const scene = s.scene || 'forest', inside = scene === 'cabin', k = e.weather.kind;
    const rain = k === 'rain' ? 1 : k === 'storm' ? 1.5 : 0;
    const night = e.time.phase === 'night', season = e.season;
    set(beds.rain, inside ? 0 : rain * 0.09);
    set(beds.rainLow, inside ? 0 : rain * 0.12);
    set(beds.room, inside ? rain * 0.1 : 0);
    set(beds.wind, (inside ? 0.25 : 1) * (k === 'snow' ? 0.1 : k === 'storm' ? 0.12 : k === 'fog' ? 0.04 : scene === 'meadow' ? 0.04 : season === 'winter' ? 0.05 : 0.02));
    // 风声慢慢起伏
    beds.wind.f.frequency.setTargetAtTime(380 + Math.sin(G.t * 0.13) * 160 + Math.sin(G.t * 0.31) * 60, ac.currentTime, 1.5);
    set(beds.water, scene === 'lake' && !(season === 'winter') ? 0.11 + Math.sin(G.t * 0.4) * 0.04 : 0, 0.6);
    const fireOn = inside && (season === 'winter' || (e.weather.temp != null && e.weather.temp < 12) || night);
    set(beds.fire, fireOn ? 0.1 : 0);

    const now = performance.now(), dt = Math.min(1, (now - (last || now)) / 1000); last = now;
    const r = Math.random();
    if (!inside) {
      const birds = !night && k !== 'rain' && k !== 'storm' && season !== 'winter';
      if (birds && r < dt * (scene === 'forest' ? 0.22 : 0.12)) chirp(U.pick([2600, 3200, 3800]));
      const bugs = night && (season === 'summer' || season === 'autumn') && rain === 0;
      if (bugs && Math.random() < dt * 1.6) cricket();
      if (scene === 'lake' && season !== 'winter' && Math.random() < dt * 0.25) drip();
    } else {
      if (fireOn && Math.random() < dt * 3) crackle();
      if (!night && season !== 'winter' && rain === 0 && Math.random() < dt * 0.05) chirp(3000); // 窗外的鸟
    }
    if (k === 'storm' && Math.random() < dt * 0.06) thunder(Math.random() < 0.4);
  }
  setInterval(tick, 250);
  // 关了“环境声音”就把声音停掉
  PP.ambient = { tick, stop() { if (ac && master) master.gain.setTargetAtTime(0, ac.currentTime, 0.2); } };
})();
