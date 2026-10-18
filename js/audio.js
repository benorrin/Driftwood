/* Driftwood — audio.
 * Everything is synthesised with the Web Audio API: the surf, the fire,
 * a slow fiddle lament in D dorian, and the sound effects. No audio files. */
(function () {
  'use strict';

  const A = (window.DWAudio = {});
  const PREFS_KEY = 'driftwood-audio';

  let ctx = null;
  let master, musicBus, ambBus, sfxBus, reverb, noiseBuf;
  let fireRumble = null;
  let fireLevel = 0;
  let musicOn = true;
  let sfxOn = true;

  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (p.music === false) musicOn = false;
    if (p.sfx === false) sfxOn = false;
  } catch (e) { /* storage unavailable */ }

  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ music: musicOn, sfx: sfxOn })); } catch (e) { /* ignore */ }
  }

  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  A.init = function () {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = impulse(3.2, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    reverb.connect(wet);
    wet.connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? 0.55 : 0;
    musicBus.connect(master);
    musicBus.connect(reverb);

    ambBus = ctx.createGain();
    ambBus.gain.value = musicOn ? 0.7 : 0;
    ambBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxOn ? 0.8 : 0;
    sfxBus.connect(master);
    const sfxWet = ctx.createGain();
    sfxWet.gain.value = 0.18;
    sfxBus.connect(sfxWet);
    sfxWet.connect(reverb);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    startSurf();
    startFire();
    seqStart = ctx.currentTime + 1.5;
    setInterval(scheduler, 90);
  };

  A.music = () => musicOn;
  A.sound = () => sfxOn;

  A.toggleMusic = function () {
    musicOn = !musicOn;
    savePrefs();
    if (ctx) {
      const t = ctx.currentTime;
      musicBus.gain.setTargetAtTime(musicOn ? 0.55 : 0, t, 0.3);
      ambBus.gain.setTargetAtTime(musicOn ? 0.7 : 0, t, 0.3);
    }
    return musicOn;
  };

  A.toggleSfx = function () {
    sfxOn = !sfxOn;
    savePrefs();
    if (ctx) sfxBus.gain.setTargetAtTime(sfxOn ? 0.8 : 0, ctx.currentTime, 0.1);
    return sfxOn;
  };

  /* ---------------- ambience: surf ---------------- */

  function startSurf() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    lp.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = 0.02;
    src.connect(lp);
    lp.connect(g);
    g.connect(ambBus);
    src.start();

    // a constant low swell under the breakers
    const src2 = ctx.createBufferSource();
    src2.buffer = noiseBuf;
    src2.loop = true;
    src2.playbackRate.value = 0.7;
    const lp2 = ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = 140;
    const g2 = ctx.createGain();
    g2.gain.value = 0.09;
    src2.connect(lp2);
    lp2.connect(g2);
    g2.connect(ambBus);
    src2.start();

    (function wave() {
      const t = ctx.currentTime;
      const rise = 1.4 + Math.random() * 2.2;
      const fall = 3 + Math.random() * 3.5;
      const peak = 0.07 + Math.random() * 0.13;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(0.012, g.gain.value), t);
      g.gain.linearRampToValueAtTime(peak, t + rise);
      g.gain.exponentialRampToValueAtTime(0.012, t + rise + fall);
      lp.frequency.cancelScheduledValues(t);
      lp.frequency.setValueAtTime(Math.max(250, lp.frequency.value), t);
      lp.frequency.linearRampToValueAtTime(800 + Math.random() * 1000, t + rise);
      lp.frequency.exponentialRampToValueAtTime(280, t + rise + fall);
      setTimeout(wave, (rise + fall - 0.8 + Math.random() * 2.5) * 1000);
    })();
  }

  /* ---------------- ambience: fire ---------------- */

  function startFire() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    fireRumble = ctx.createGain();
    fireRumble.gain.value = 0;
    src.connect(lp);
    lp.connect(fireRumble);
    fireRumble.connect(sfxBus);
    src.start();

    (function crackle() {
      setTimeout(crackle, 50 + Math.random() * (450 / Math.max(1, fireLevel)));
      if (!fireLevel || !sfxOn) return;
      if (Math.random() < 0.18 * fireLevel) {
        noise(ctx.currentTime, 0.008 + Math.random() * 0.025, {
          type: 'highpass', f: 1800 + Math.random() * 3500, g: 0.04 + Math.random() * 0.1 * fireLevel / 4, a: 0.001,
        });
      }
    })();
  }

  A.setFire = function (level) {
    fireLevel = level;
    if (ctx) fireRumble.gain.setTargetAtTime(level * 0.022, ctx.currentTime, 0.8);
  };

  /* ---------------- music ---------------- */

  const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) {
    const m = /^([A-G])(b|#)?(\d)$/.exec(name);
    return 12 * (+m[3] + 1) + STEP[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const phrase = (s) => s.trim().split(/\s+/).map((tok) => {
    const [n, d] = tok.split(':');
    return [n === 'r' ? null : midi(n), +d];
  });

  // Four bars of 6/8 each (24 eighths). An original lament in D dorian.
  const PHRASES = {
    a: phrase('D4:2 F4:1 G4:2 A4:1  A4:3 C5:2 A4:1  G4:2 F4:1 E4:2 C4:1  D4:6'),
    b: phrase('A4:2 C5:1 D5:3  C5:2 A4:1 G4:3  F4:2 G4:1 A4:2 F4:1  E4:6'),
    c: phrase('F4:2 E4:1 D4:2 C4:1  D4:2 F4:1 A4:3  G4:2 E4:1 C4:2 E4:1  D4:6'),
    d: phrase('D5:3 C5:2 A4:1  G4:3 A4:3  F4:2 E4:1 D4:2 E4:1  F4:3 E4:3'),
  };
  const BASS = {
    a: ['D2', 'F2', 'C2', 'D2'],
    b: ['D2', 'C2', 'F2', 'A1'],
    c: ['D2', 'D2', 'C2', 'D2'],
    d: ['D2', 'G2', 'Bb1', 'A1'],
  };
  const TUNES = [['a', 'b', 'a', 'c'], ['d', 'c', 'b', 'a'], ['a', 'c'], ['b', 'd', 'c'], ['c', 'a']];
  const EIGHTH = 0.42;

  let mood = 'calm';
  let events = [];
  let evIdx = 0;
  let seqStart = 0;
  let seqLen = 0;
  let playedTune = false;

  A.setMood = function (m) {
    if (m === mood) return;
    mood = m;
    if (!ctx) return;
    events = [];
    evIdx = 0;
    seqLen = 0;
    seqStart = ctx.currentTime + (m === 'calm' ? 2.5 : 0.2);
    playedTune = m === 'calm';
  };

  function buildSeq() {
    events = [];
    evIdx = 0;
    if (mood === 'silent') {
      seqLen = 2;
      return;
    }
    if (mood === 'tense') {
      // a heartbeat drum and a low pulsing drone
      const beat = 0.5;
      for (let i = 0; i < 16; i++) {
        events.push({ t: i * beat, kind: 'drum', accent: i % 4 === 0 });
        if (i % 4 === 0) events.push({ t: i * beat, kind: 'bass', m: midi(i % 8 === 0 ? 'D2' : 'Eb2'), dur: beat * 4 });
      }
      seqLen = 16 * beat;
      return;
    }
    if (playedTune && mood !== 'ending' && Math.random() < 0.55) {
      // a long rest: only a soft drone under the surf
      seqLen = 14 + Math.random() * 20;
      events.push({ t: 0, kind: 'bass', m: midi('D2'), dur: seqLen * 0.8, soft: true });
      playedTune = false;
      return;
    }
    const tune = TUNES[Math.floor(Math.random() * TUNES.length)];
    let t = 0;
    tune.forEach((k) => {
      BASS[k].forEach((b, i) => events.push({ t: t + i * 6 * EIGHTH, kind: 'bass', m: midi(b), dur: 6 * EIGHTH }));
      let bt = t;
      PHRASES[k].forEach(([m, d]) => {
        if (m != null) events.push({ t: bt, kind: 'lead', m: mood === 'ending' ? m + 12 : m, dur: d * EIGHTH });
        bt += d * EIGHTH;
      });
      t += 24 * EIGHTH;
    });
    events.sort((x, y) => x.t - y.t);
    seqLen = t + 3;
    playedTune = true;
  }

  function scheduler() {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (evIdx >= events.length && now + 0.3 >= seqStart + seqLen) {
      seqStart = Math.max(seqStart + seqLen, now + 0.1);
      buildSeq();
    }
    const ahead = now + 0.3;
    while (evIdx < events.length && seqStart + events[evIdx].t < ahead) {
      const ev = events[evIdx++];
      const t = Math.max(now, seqStart + ev.t);
      if (ev.kind === 'lead') lead(ev.m, t, ev.dur);
      else if (ev.kind === 'bass') bass(ev.m, t, ev.dur, ev.soft);
      else if (ev.kind === 'drum') drum(t, ev.accent);
    }
  }

  // reedy fiddle: saw + detuned square through a lowpass, with delayed vibrato
  function lead(m, t, dur) {
    const f = mtof(m);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'square';
    o1.frequency.value = f;
    o2.frequency.value = f * 1.004;
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.3;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(dur * 0.7, 0.6));
    vib.connect(vg);
    vg.connect(o1.frequency);
    vg.connect(o2.frequency);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(1700, t + 0.15);
    lp.Q.value = 1.2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.09);
    g.gain.setTargetAtTime(0.075, t + 0.12, 0.3);
    g.gain.setTargetAtTime(0.0001, t + dur - 0.04, 0.09);
    o1.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    lp.connect(g);
    g.connect(musicBus);
    const end = t + dur + 0.6;
    [o1, o2, vib].forEach((o) => { o.start(t); o.stop(end); });
  }

  // soft pad: root and fifth, sine + triangle
  function bass(m, t, dur, soft) {
    const peak = soft ? 0.05 : 0.085;
    [[m, 'sine', 1], [m + 7, 'triangle', 0.35], [m + 12, 'sine', 0.2]].forEach(([n, type, lvl]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = mtof(n);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * lvl, t + Math.min(0.8, dur * 0.3));
      g.gain.setTargetAtTime(0.0001, t + dur * 0.85, dur * 0.12 + 0.1);
      o.connect(g);
      g.connect(musicBus);
      o.start(t);
      o.stop(t + dur + 1.5);
    });
  }

  function drum(t, accent) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(accent ? 90 : 70, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.28, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + 0.5);
  }

  /* ---------------- sound effects ---------------- */

  function noise(t, dur, o) {
    o = o || {};
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = o.type || 'bandpass';
    fl.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    fl.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.g || 0.3, t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl);
    fl.connect(g);
    g.connect(sfxBus);
    s.start(t, Math.random() * 3);
    s.stop(t + dur + 0.05);
  }

  function tone(t, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f || 440, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.g || 0.2, t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) {
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = o.lp;
      osc.connect(fl);
      node = fl;
    }
    node.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function bell(t, f) {
    [[1, 0.25, 2.6], [2.01, 0.12, 1.8], [2.76, 0.09, 1.3], [4.1, 0.05, 0.9], [5.43, 0.03, 0.6]].forEach(([r, g, d]) => {
      tone(t, d, { f: f * r, g, a: 0.002 });
    });
  }

  const SFX = {
    click(t) { tone(t, 0.03, { f: 1400, g: 0.03 }); },
    gather(t) {
      noise(t, 0.14, { f: 2600, q: 0.8, g: 0.12 });
      noise(t + 0.12, 0.18, { f: 1800, q: 0.8, g: 0.1 });
      tone(t + 0.1, 0.12, { type: 'triangle', f: 220, f2: 150, g: 0.08 });
    },
    comb(t) {
      noise(t, 0.35, { f: 3000, f2: 1500, q: 0.6, g: 0.08 });
      noise(t + 0.25, 0.3, { type: 'lowpass', f: 600, g: 0.1 });
    },
    chop(t) {
      for (let i = 0; i < 2; i++) {
        const s = t + i * 0.28;
        noise(s, 0.09, { f: 900, q: 3, g: 0.35 });
        tone(s, 0.12, { type: 'triangle', f: 190, f2: 80, g: 0.25 });
      }
    },
    stone(t) {
      tone(t, 0.05, { type: 'square', f: 1100, g: 0.06, lp: 3000 });
      noise(t, 0.05, { type: 'highpass', f: 3000, g: 0.15 });
      tone(t + 0.15, 0.05, { type: 'square', f: 900, g: 0.05, lp: 3000 });
      noise(t + 0.15, 0.05, { type: 'highpass', f: 3000, g: 0.12 });
    },
    fire(t) {
      noise(t, 0.9, { type: 'lowpass', f: 200, f2: 2400, g: 0.25, a: 0.25 });
      noise(t + 0.3, 0.7, { type: 'bandpass', f: 600, q: 0.5, g: 0.12 });
    },
    stoke(t) {
      noise(t, 0.12, { type: 'lowpass', f: 500, g: 0.25 });
      noise(t + 0.1, 0.6, { type: 'lowpass', f: 300, f2: 1600, g: 0.12, a: 0.2 });
    },
    splash(t) {
      noise(t, 0.55, { f: 1400, f2: 350, q: 0.7, g: 0.3, a: 0.01 });
      noise(t + 0.08, 0.3, { type: 'highpass', f: 3000, g: 0.08 });
    },
    water(t) {
      for (let i = 0; i < 5; i++) tone(t + i * 0.09, 0.08, { f: 500 + Math.random() * 500, f2: 900 + Math.random() * 600, g: 0.06 });
      noise(t, 0.5, { f: 900, q: 0.6, g: 0.06 });
    },
    craft(t) {
      [0, 0.2, 0.4].forEach((d, i) => {
        tone(t + d, 0.07, { type: 'triangle', f: 520 - i * 40, g: 0.18 });
        noise(t + d, 0.05, { f: 2200, q: 1.5, g: 0.15 });
      });
    },
    pickup(t) {
      tone(t, 0.25, { type: 'triangle', f: 660, g: 0.12 });
      tone(t + 0.09, 0.4, { type: 'triangle', f: 990, g: 0.1 });
    },
    page(t) { noise(t, 0.3, { type: 'highpass', f: 3500, f2: 6000, g: 0.07, a: 0.08 }); },
    step(t) { noise(t, 0.09, { type: 'lowpass', f: 450, g: 0.18 }); },
    hit(t) {
      tone(t, 0.22, { f: 140, f2: 45, g: 0.6 });
      noise(t, 0.12, { type: 'lowpass', f: 1200, g: 0.3 });
    },
    swing(t) { noise(t, 0.18, { f: 900, f2: 2600, q: 1.2, g: 0.15, a: 0.06 }); },
    hurt(t) {
      tone(t, 0.3, { type: 'sawtooth', f: 200, f2: 90, g: 0.18, lp: 900 });
      noise(t, 0.15, { type: 'lowpass', f: 700, g: 0.3 });
    },
    shot(t) {
      noise(t, 0.08, { type: 'highpass', f: 2000, g: 0.4 });
      noise(t, 0.9, { type: 'lowpass', f: 4000, f2: 150, g: 0.7, a: 0.002 });
      tone(t, 0.5, { f: 90, f2: 30, g: 0.6 });
    },
    growl(t) {
      noise(t, 0.7, { f: 160, q: 6, g: 0.35, a: 0.08 });
      tone(t, 0.7, { type: 'sawtooth', f: 75, f2: 60, g: 0.12, lp: 300, a: 0.1 });
    },
    hiss(t) { noise(t, 0.9, { type: 'highpass', f: 4000, g: 0.12, a: 0.2 }); },
    bats(t) { for (let i = 0; i < 18; i++) tone(t + Math.random() * 1.4, 0.04, { f: 3000 + Math.random() * 3000, g: 0.025 }); },
    bell(t) { bell(t, 760); bell(t + 0.45, 760); },
    victory(t) {
      ['D4', 'F4', 'A4', 'D5'].forEach((n, i) => tone(t + i * 0.14, 0.6, { type: 'triangle', f: mtof(midi(n)), g: 0.1 }));
    },
    death(t) {
      tone(t, 3.5, { type: 'sine', f: 147, f2: 55, g: 0.25, a: 0.3 });
      tone(t, 3.5, { type: 'triangle', f: 220, f2: 82, g: 0.1, a: 0.3 });
    },
    sail(t) { bell(t, 760); bell(t + 0.45, 760); bell(t + 1.2, 760); bell(t + 1.65, 760); },
  };

  A.sfx = function (name) {
    if (!ctx || !sfxOn || !SFX[name]) return;
    SFX[name](ctx.currentTime + 0.01);
  };
})();
