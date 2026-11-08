// 场景白噪音：和画面严格对应（看到下雨才有雨声，看到风才有风声）
// 声音设计原则：只用柔和的粉噪 / 褐噪 + 平滑的音量变化，不用锯齿波、不出尖锐的咔哒声
// 进到小屋里：外面的声音整体变闷、变小（像隔着墙和窗户），屋里有轻轻的炉火声
(function () {
  const PP = (window.PP = window.PP || {});
  const U = PP.U, G = PP.G;
  let ac = null, echo = null, echoBus = null, nextWave = 0, nextLap = 0, master = null, outBus = null, outLP = null, inBus = null, beds = null, pinkBuf = null, brownBuf = null;

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
      // ---- 各个地方自己的底噪（都是随机生成的长噪声 + 慢慢起伏，不会听出循环） ----
      leaves: bed(P(), outBus, 'bandpass', 2600, 0.6, 'lowpass', 5200),     // 树叶沙沙
      grass: bed(P(), outBus, 'bandpass', 1300, 0.5),                       // 草被风吹
      stream: bed(P(), outBus, 'bandpass', 1500, 1.4, 'highpass', 600),      // 溪水哗哗
      streamLow: bed(B(), outBus, 'lowpass', 380, 0.7),                      // 溪水低沉的底
      under: bed(B(), outBus, 'lowpass', 260, 0.8),                          // 水下嗡嗡的闷声
      roomTone: bed(B(), outBus, 'lowpass', 160, 0.7),                       // 洞穴里低低的空气声
      sand: bed(P(), outBus, 'highpass', 3200, 0.4, 'lowpass', 7000),        // 风卷细沙
      whistle: bed(P(), outBus, 'bandpass', 700, 9),                         // 冰原上的风哨
      insects: bed(P(), outBus, 'bandpass', 5200, 6),                        // 雨林 / 夏夜的虫鸣底
      surf: bed(B(), outBus, 'lowpass', 520, 0.6),                           // 海浪（音量由下面的浪头一波一波推）
      surfHiss: bed(P(), outBus, 'highpass', 1800, 0.5, 'lowpass', 6000),    // 浪退时的沙沙
    };
    // 虫鸣：给音量加一个很快的颤动（像一大片知了 / 纺织娘）
    { const o = ac.createOscillator(); o.frequency.value = 23; const a = ac.createGain(); a.gain.value = 0.5; o.connect(a).connect(beds.insects.g.gain); o.start(); beds.insects.trem = o; }
    // 洞穴回声：一段自己生成的衰减混响
    { const len = ac.sampleRate * 2.8, ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      echo = ac.createConvolver(); echo.buffer = ir; echoBus = ac.createGain(); echoBus.gain.value = 0; echoBus.connect(echo).connect(outBus); }
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
  // 洞里的水滴：清脆一声 + 长长的回声
  function caveDrip() { const f = U.rand(1100, 1900), t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.05); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(g); g.connect(outBus); g.connect(echoBus); o.start(t); o.stop(t + 0.15); }
  function batSqueak() { const f = U.rand(5200, 6800); for (let i = 0; i < U.randi(2, 4); i++) tone(echoBus, f, f * 0.8, 0.03, 0.006, 'sine', i * 0.05); }
  // 一个浪头：慢慢涌上来、拍一下、再沙沙地退回去（每个浪的大小和间隔都不一样）
  function wave(big) {
    const t = ac.currentTime, up = U.rand(2.5, 4.5), hold = U.rand(0.3, 0.8), down = U.rand(3.5, 6.5), pk = (big ? 0.12 : 0.08) * U.rand(0.7, 1.15);
    const g = beds.surf.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(pk, t + up); g.linearRampToValueAtTime(pk * 0.8, t + up + hold); g.linearRampToValueAtTime(pk * 0.18, t + up + hold + down);
    const h = beds.surfHiss.g.gain; h.cancelScheduledValues(t); h.setValueAtTime(h.value, t); h.linearRampToValueAtTime(0.004, t + up); h.linearRampToValueAtTime(pk * 0.32, t + up + hold + 0.6); h.linearRampToValueAtTime(0.002, t + up + hold + down);
    return up + hold + down * U.rand(0.55, 0.95);
  }
  // 湖边：小小的水波拍岸
  function lap() { burst(outBus, brownBuf, 'lowpass', U.rand(380, 600), 0.8, U.rand(0.02, 0.04), U.rand(0.5, 1.1)); }
  function gullCall() { const f = U.rand(1500, 1900); tone(outBus, f, f * 0.7, 0.28, 0.012); tone(outBus, f * 0.95, f * 0.65, 0.22, 0.01, 'sine', 0.32); }
  function cowbell() { const f = U.rand(560, 640); for (const [m, v] of [[1, 0.012], [2.7, 0.006], [5.4, 0.003]]) tone(outBus, f * m, f * m, 1.4, v, 'sine', 0); }
  function hen() { for (let i = 0; i < U.randi(2, 4); i++) burst(outBus, pinkBuf, 'bandpass', U.rand(700, 900), 5, 0.02, 0.08, i * 0.14); }
  function bubbles() { for (let i = 0; i < U.randi(2, 5); i++) { const f = U.rand(300, 700); tone(outBus, f, f * 2.2, 0.08, 0.01, 'sine', i * U.rand(0.08, 0.2)); } }
  function woodpecker() { for (let i = 0; i < U.randi(6, 12); i++) burst(outBus, pinkBuf, 'bandpass', 1400, 4, 0.03, 0.025, i * 0.06); }
  function parrotCall() { const f = U.rand(1800, 2600); tone(outBus, f, f * 1.4, 0.12, 0.012, 'triangle'); tone(outBus, f * 1.3, f * 0.9, 0.16, 0.01, 'triangle', 0.16); }
  function iceCreak() { burst(outBus, brownBuf, 'bandpass', U.rand(160, 260), 8, 0.04, U.rand(0.6, 1.2)); }
  function penguinCall() { const f = U.rand(500, 700); for (let i = 0; i < 3; i++) tone(outBus, f, f * 1.15, 0.14, 0.012, 'sawtooth', i * 0.18); }
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
    set(beds.water, under ? 0.08 + Math.sin(G.t * 0.25) * 0.02 : scene === 'beach' ? 0.015 : scene === 'lake' && season !== 'winter' ? 0.05 + Math.sin(G.t * 0.35) * 0.015 : scene === 'forest' && season !== 'winter' ? 0.022 : 0, 0.8);
    set(beds.snowHush, F.snow ? 0.008 + F.snow * 0.01 : 0);
    const fireOn = inside && !under && (season === 'winter' || (e.weather.temp != null && e.weather.temp < 12) || night || F.rain > 0.6);
    set(beds.fire, fireOn ? 0.035 : 0);

    // ---- 每个地方自己的声音景观 ----
    const cave = scene === 'cave' || scene === 'undergrove', sea = under, calm = !F.rain && !F.storm;
    const windK = 1 + (F.wind || 0) * 0.6, summerish = season === 'summer' || season === 'spring', green = season !== 'winter';
    const SC = {
      forest: { leaves: green ? 0.02 : 0.008, stream: 0.012, streamLow: 0.02 },
      jungle: { leaves: 0.024, insects: night ? 0.012 : 0.008, stream: 0.016, streamLow: 0.03 },
      meadow: { grass: 0.018, leaves: 0.006 },
      savanna: { grass: 0.022, insects: summerish ? 0.004 : 0, sand: 0.004 },
      desert: { sand: 0.012, grass: 0.006 },
      mountain: { stream: 0.014, streamLow: 0.03, whistle: 0.004 },
      cave: { roomTone: 0.05 },
      snow: { whistle: 0.008, snowHush: 0.006 },
      antarctic: { whistle: 0.01, snowHush: 0.005 },
      farm: { grass: 0.012, leaves: 0.008 },
      lake: { leaves: green ? 0.006 : 0, stream: 0.004 },
      beach: { grass: 0.004 },
      sea: { under: 0.09 },
      skyisle: { grass: 0.014, whistle: 0.005 },
      academy: { leaves: 0.01, grass: 0.006 },
      undergrove: { roomTone: 0.035, stream: 0.006, streamLow: 0.016 },
    }[scene] || {};
    for (const k of ['leaves', 'grass', 'stream', 'streamLow', 'under', 'roomTone', 'sand', 'whistle', 'insects']) set(beds[k], (SC[k] || 0) * (k === 'leaves' || k === 'grass' || k === 'sand' || k === 'whistle' ? windK : 1) * (k === 'stream' || k === 'streamLow' ? (season === 'winter' && scene !== 'jungle' ? 0.3 : 1) : 1), 2.5);
    if (night && summerish && !cave && !sea && calm) set(beds.insects, Math.max(SC.insects || 0, 0.006), 3);
    beds.whistle.f.frequency.setTargetAtTime(600 + Math.sin(G.t * 0.07) * 260 + Math.sin(G.t * 0.19) * 90, ac.currentTime, 2);
    if (echoBus) echoBus.gain.setTargetAtTime(cave ? 0.9 : 0, ac.currentTime, 0.8);
    // 海浪：海岸和南极冰架边一波一波地来
    const waves = scene === 'beach' || scene === 'antarctic';
    if (waves) { if (ac.currentTime > nextWave) nextWave = ac.currentTime + wave(F.wind >= 2 || F.storm); }
    else { set(beds.surf, 0, 1.5); set(beds.surfHiss, 0, 1.5); nextWave = 0; }
    const now = performance.now(), dt = Math.min(1, (now - (last || now)) / 1000); last = now;
    const quietWx = F.rain || F.snow || F.storm;
    const dawn = e.time.phase === 'dawn';
    if (!under && !cave && scene !== 'antarctic' && !quietWx && !night && season !== 'winter' && Math.random() < dt * (scene === 'forest' || scene === 'jungle' ? 0.18 : 0.1) * (dawn ? 2.5 : 1)) bird();
    if (night && scene === 'forest' && !quietWx && Math.random() < dt * 0.025) owl();
    if (!under && !cave && night && (season === 'summer' || season === 'autumn') && !F.rain && Math.random() < dt * 1.2) cricket();
    if (night && season === 'summer' && scene === 'lake' && !F.rain && Math.random() < dt * 0.15) frog();
    if ((scene === 'lake' || under) && Math.random() < dt * (under ? 0.5 : season !== 'winter' ? 0.2 : 0.08)) drip(); // 湖水 / 温泉咕嘟
    if (F.rain && F.rain < 0.6 && Math.random() < dt * 6) rainTick();
    if (fireOn && Math.random() < dt * 2.2) crackle();
    if (cave) { if (Math.random() < dt * 0.6) caveDrip(); if (night && Math.random() < dt * 0.15) batSqueak(); }
    if (scene === 'lake' && season !== 'winter' && ac.currentTime > nextLap) { lap(); nextLap = ac.currentTime + U.rand(1.2, 3.5); }
    if ((scene === 'beach') && !night && calm && Math.random() < dt * 0.03) gullCall();
    if (scene === 'farm' && !night && calm && Math.random() < dt * 0.02) (Math.random() < 0.5 ? cowbell : hen)();
    if (scene === 'academy' && Math.random() < dt * 0.006) { const f = 330; for (const [m, v] of [[1, 0.014], [2.4, 0.006], [3.9, 0.003]]) tone(outBus, f * m, f * m, 3, v, 'sine', 0); }
    if (sea && Math.random() < dt * 0.25) bubbles();
    if (scene === 'forest' && !night && green && calm && Math.random() < dt * 0.012) woodpecker();
    if (scene === 'jungle' && !night && calm && Math.random() < dt * 0.05) parrotCall();
    if ((scene === 'snow' || scene === 'antarctic') && Math.random() < dt * 0.01) iceCreak();
    if (scene === 'antarctic' && !night && Math.random() < dt * 0.03) penguinCall();
    if (F.storm && Math.random() < dt * 0.03) thunder(false);
  }
  setInterval(tick, 250);
  PP.ambient = { tick, stop() { if (ac && master) master.gain.setTargetAtTime(0, ac.currentTime, 0.2); } };
})();
