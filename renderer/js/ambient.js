// 场景白噪音：和画面严格对应（看到下雨才有雨声，看到风才有风声）
// 声音设计原则：只用柔和的粉噪 / 褐噪 + 平滑的音量变化，不用锯齿波、不出尖锐的咔哒声
// 进到小屋里：外面的声音整体变闷、变小（像隔着墙和窗户），屋里有轻轻的炉火声
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  let ac = null, master = null, outBus = null, outLP = null, inBus = null, beds = null, pinkBuf = null, brownBuf = null;

  // 粉噪（比白噪音柔和很多）/ 褐噪（低沉）
  function makeNoise(kind) {
    // 30 秒一段（以前 6 秒，循环太短能听出重复）
    const len = ac.sampleRate * 30, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      else {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      }
    }
    // 首尾交叉淡化，循环时听不出接缝
    const f = Math.floor(ac.sampleRate * 1.5);
    for (let i = 0; i < f; i++) { const a = i / f; d[i] = d[i] * a + d[len - f + i] * (1 - a); }
    return b;
  }
  function bed(buf, bus, type, freq, q, type2, freq2) {
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.loopStart = 0; src.loopEnd = buf.duration - 1.5;
    src.playbackRate.value = 0.94 + Math.random() * 0.12;
    // 慢慢起伏：音色和音量各有一个很慢的、互不同步的变化（几十秒一个周期），听起来像真的风雨而不是录音循环
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.013 + Math.random() * 0.03;
    const lfoAmt = ac.createGain(); lfoAmt.gain.value = freq * 0.18;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    let tail = f;
    if (type2) { const f2 = ac.createBiquadFilter(); f2.type = type2; f2.frequency.value = freq2; f.connect(f2); tail = f2; }
    const g = ac.createGain(); g.gain.value = 0;
    const swell = ac.createGain(); swell.gain.value = 1;
    const lfo2 = ac.createOscillator(); lfo2.frequency.value = 0.021 + Math.random() * 0.04;
    const lfo2Amt = ac.createGain(); lfo2Amt.gain.value = 0.22;
    lfo.connect(lfoAmt).connect(f.frequency); lfo2.connect(lfo2Amt).connect(swell.gain);
    lfo.start(); lfo2.start();
    src.connect(f); tail.connect(swell).connect(g).connect(bus); src.start(0, Math.random() * (buf.duration - 3));
    return { src, f, g };
  }
  function init() {
    if (ac) return true;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    master = ac.createGain(); master.gain.value = 0;
    // 整体：柔和的低通 + 轻压缩，避免任何刺耳的峰值
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 3; comp.attack.value = 0.05; comp.release.value = 0.4;
    master.connect(lp).connect(comp).connect(ac.destination);
    // 户外的声音都走 outBus：在屋里时被低通 + 压小
    outLP = ac.createBiquadFilter(); outLP.type = 'lowpass'; outLP.frequency.value = 12000;
    outBus = ac.createGain(); outBus.connect(outLP).connect(master);
    inBus = ac.createGain(); inBus.connect(master);
    // 每种声音用自己的一段噪声（不共用），从随机位置开始，互相之间不会“同步”重复
    const P = () => makeNoise('pink'), B = () => makeNoise('brown');
    pinkBuf = P(); brownBuf = B(); const brown2 = B(), brown3 = B(), pink2 = P();
    beds = {
      rain: bed(pinkBuf, outBus, 'highpass', 500, 0.5, 'lowpass', 4200),   // 雨丝：沙沙
      rainBody: bed(brown2, outBus, 'lowpass', 700, 0.6),                // 雨落地：厚一点的底
      wind: bed(brown3, outBus, 'bandpass', 420, 0.7),                    // 风：慢慢起伏
      water: bed(brownBuf, outBus, 'lowpass', 520, 0.5),                   // 湖水
      snowHush: bed(pink2, outBus, 'lowpass', 900, 0.4),                 // 下雪时很轻的“嘶——”
      fire: bed(brownBuf, inBus, 'lowpass', 320, 0.6),                     // 炉火低低的呼呼声
    };
    return true;
  }
  const set = (b, v, tc = 1.6) => b.g.gain.setTargetAtTime(Math.max(0, v), ac.currentTime, tc);

  // ---------- 点缀音 ----------
  function tone(bus, f0, f1, dur, vol, type = 'sine', at = 0) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.25)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  function burst(bus, buf, type, freq, q, vol, dur, at = 0) {
    const t = ac.currentTime + at, src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus); src.start(t, Math.random() * 4); src.stop(t + dur + 0.05);
  }
  // 几种不同的鸟叫，轻轻的
  function bird() {
    const kind = Math.floor(Math.random() * 3), base = U.rand(2400, 3600);
    if (kind === 0) for (let i = 0; i < U.randi(2, 4); i++) tone(outBus, base, base * 1.3, 0.09, 0.018, 'sine', i * 0.13);
    else if (kind === 1) { tone(outBus, base * 1.2, base * 0.8, 0.22, 0.016); tone(outBus, base * 0.9, base * 1.1, 0.16, 0.014, 'sine', 0.28); }
    else for (let i = 0; i < 5; i++) tone(outBus, base * (1 + i * 0.05), base * (1.1 + i * 0.05), 0.05, 0.012, 'sine', i * 0.07);
  }
  function owl() { tone(outBus, 390, 360, 0.35, 0.02); tone(outBus, 370, 340, 0.5, 0.018, 'sine', 0.55); }
  function cricket() { const f = U.rand(4300, 4700); for (let i = 0; i < 3; i++) tone(outBus, f, f, 0.04, 0.005, 'sine', i * 0.07); }
  function frog() { for (let i = 0; i < 2; i++) burst(outBus, brownBuf, 'bandpass', U.rand(380, 520), 6, 0.05, 0.12, i * 0.16); }
  function drip() { tone(outBus, U.rand(900, 1300), U.rand(1500, 1900), 0.07, 0.012); }
  function rainTick() { burst(outBus, pinkBuf, 'bandpass', U.rand(1800, 3200), 3, U.rand(0.008, 0.016), 0.04); }
  function crackle() { burst(inBus, pinkBuf, 'bandpass', U.rand(900, 1700), 1.6, U.rand(0.012, 0.028), U.rand(0.02, 0.05)); }
  function thunder(near) {
    const at = near ? 0.05 : U.rand(0.4, 1.4);
    burst(outBus, brownBuf, 'lowpass', near ? 260 : 150, 0.7, near ? 0.32 : 0.2, U.rand(2.4, 3.6), at);
  }
  PP.ambientThunder = (near) => { if (ac && on()) thunder(near); };

  function on() {
    const s = G.save && G.save.settings;
    return !!(s && s.ambient && PP.scene && PP.scene.active() && !(PP.sleepTime && PP.sleepTime()));
  }

  let last = 0, wasInside = null;
  function tick() {
    if (!G.save) return;
    if (!on()) { if (ac && master) master.gain.setTargetAtTime(0, ac.currentTime, 0.6); return; }
    if (!init()) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const s = G.save.settings;
    const scene = (PP.scene && PP.scene.view()) || 'forest', e = PP.scene && PP.scene.active() ? PP.env.at(scene) : PP.env.get(), under = scene === 'sea', inside = !!(PP.scene && PP.scene.inside && PP.scene.inside()) || under;
    // 雪原在山上：下雨在这里是下雪（和画面一致）
    const F = under ? Object.assign({}, e.fx, { rain: 0, snow: 0, storm: 0, wind: 0 }) : scene === 'snow' ? Object.assign({}, e.fx, { snow: Math.max(e.fx.snow, e.fx.rain), rain: 0, storm: 0 }) : e.fx;
    // 你在打字工作的时候，环境声自动调小一些
    const duck = PP.F && PP.F.working && PP.F.working() ? 0.45 : 1;
    master.gain.setTargetAtTime(0.9 * (s.ambientVol != null ? s.ambientVol : 0.5) * duck, ac.currentTime, 0.8);
    const night = e.time.phase === 'night', season = e.season;
    // 屋里：外面的声音隔着墙，闷一点、小一点
    if (inside !== wasInside) {
      outLP.frequency.setTargetAtTime(inside ? 650 : 12000, ac.currentTime, 0.6);
      outBus.gain.setTargetAtTime(inside ? 0.35 : 1, ac.currentTime, 0.6);
      wasInside = inside;
    }
    // 雨：雨量决定音量和亮度（毛毛雨是细细的沙沙声，大雨更厚）
    set(beds.rain, F.rain * 0.075);
    beds.rain.f.frequency.setTargetAtTime(700 - F.rain * 250, ac.currentTime, 2);
    set(beds.rainBody, F.rain > 0.5 ? (F.rain - 0.4) * 0.09 : 0);
    // 风：只有画面上有风（雨斜、叶子飘、风车转）才有风声，风越大越响
    const wind = F.wind >= 1 ? [0, 0.018, 0.04, 0.065][F.wind] : 0;
    set(beds.wind, wind * (1 + Math.sin(G.t * 0.21) * 0.35), 1.2);
    beds.wind.f.frequency.setTargetAtTime(330 + Math.sin(G.t * 0.13) * 120 + F.wind * 40, ac.currentTime, 1.5);
    // 湖水：结冰就没声音
    set(beds.water, under ? 0.08 + Math.sin(G.t * 0.25) * 0.02 : scene === 'beach' ? 0.06 + Math.sin(G.t * 0.5) * 0.03 : scene === 'lake' && season !== 'winter' ? 0.05 + Math.sin(G.t * 0.35) * 0.015 : scene === 'forest' && season !== 'winter' ? 0.022 : 0, 0.8);
    set(beds.snowHush, F.snow ? 0.008 + F.snow * 0.01 : 0);
    const fireOn = inside && !under && (season === 'winter' || (e.weather.temp != null && e.weather.temp < 12) || night || F.rain > 0.6);
    set(beds.fire, fireOn ? 0.035 : 0);

    const now = performance.now(), dt = Math.min(1, (now - (last || now)) / 1000); last = now;
    const quietWx = F.rain || F.snow || F.storm;
    const dawn = e.time.phase === 'dawn';
    if (!under && !quietWx && !night && season !== 'winter' && Math.random() < dt * (scene === 'forest' || scene === 'jungle' ? 0.18 : 0.1) * (dawn ? 2.5 : 1)) bird();
    if (night && scene === 'forest' && !quietWx && Math.random() < dt * 0.025) owl();
    if (!under && night && (season === 'summer' || season === 'autumn') && !F.rain && Math.random() < dt * 1.2) cricket();
    if (night && season === 'summer' && scene === 'lake' && !F.rain && Math.random() < dt * 0.15) frog();
    if ((scene === 'lake' || under) && Math.random() < dt * (under ? 0.5 : season !== 'winter' ? 0.2 : 0.08)) drip(); // 湖水 / 温泉咕嘟
    if (F.rain && F.rain < 0.6 && Math.random() < dt * 6) rainTick();
    if (fireOn && Math.random() < dt * 2.2) crackle();
    if (F.storm && Math.random() < dt * 0.03) thunder(false);
  }
  setInterval(tick, 250);
  PP.ambient = { tick, stop() { if (ac && master) master.gain.setTargetAtTime(0, ac.currentTime, 0.2); } };
})();
