/* Driftwood — audio engine.
 * Everything is synthesised with the Web Audio API: no audio files. This
 * file owns the AudioContext, the mixing buses and the user's preferences,
 * and provides the building blocks (tones, noise bursts, bells) that the
 * ambience, music and sound-effect modules play with. */
(function () {
  'use strict';

  const DW = window.DW;
  const PREFS_KEY = 'driftwood-audio';

  /** Bus volumes when switched on. */
  const LEVEL = { music: 0.55, ambience: 0.7, sfx: 0.8 };

  const prefs = DW.storage.getJSON(PREFS_KEY, null) || {};

  /**
   * Shared engine state. `ctx` and the buses stay null until `DW.audio.init`
   * runs, which browsers only allow after a user gesture.
   */
  const synth = (DW.synth = {
    ctx: null,
    bus: { music: null, ambience: null, sfx: null },
    noiseBuf: null,
    musicOn: prefs.music !== false,
    sfxOn: prefs.sfx !== false,
  });

  const startHooks = [];

  /** Registers `fn` to run once the AudioContext has been created. */
  synth.onStart = (fn) => startHooks.push(fn);

  /** Persists the music and sound toggles. */
  function savePrefs() {
    DW.storage.setJSON(PREFS_KEY, { music: synth.musicOn, sfx: synth.sfxOn });
  }

  /* ---------------- node helpers ---------------- */

  /** Converts a MIDI note number to its frequency in Hz. */
  synth.mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  /** Converts a note name such as "D4", "Bb1" or "F#3" to a MIDI note number. */
  synth.midi = function (name) {
    const m = /^([A-G])(b|#)?(\d)$/.exec(name);
    const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    return 12 * (+m[3] + 1) + STEP[m[1]] + accidental;
  };

  /** Creates a gain node set to `value` and connected to each of `outputs`. */
  synth.gain = function (value, ...outputs) {
    const g = synth.ctx.createGain();
    g.gain.value = value;
    outputs.forEach((out) => g.connect(out));
    return g;
  };

  /** Creates a biquad filter of `type` at `freq` Hz, with an optional Q. */
  synth.filter = function (type, freq, q) {
    const fl = synth.ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = freq;
    if (q != null) fl.Q.value = q;
    return fl;
  };

  /** Creates a looping source over the shared white-noise buffer. */
  synth.noiseLoop = function (rate) {
    const src = synth.ctx.createBufferSource();
    src.buffer = synth.noiseBuf;
    src.loop = true;
    if (rate) src.playbackRate.value = rate;
    return src;
  };

  /** Connects `nodes` one after another and returns the last. */
  synth.chain = function (...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes[nodes.length - 1];
  };

  /**
   * Creates a gain node with a percussive envelope: silent at `t`, rising
   * exponentially to `peak` over `attack` seconds, and dying away by `end`.
   */
  synth.envelope = function (t, peak, attack, end, output) {
    const g = synth.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    g.connect(output);
    return g;
  };

  /**
   * Plays a filtered burst of noise at time `t` for `dur` seconds.
   * Options: type (filter type), f / f2 (start / end frequency), q,
   * g (peak gain) and a (attack time).
   */
  synth.noise = function (t, dur, o) {
    o = o || {};
    const { ctx } = synth;
    const src = ctx.createBufferSource();
    src.buffer = synth.noiseBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = o.type || 'bandpass';
    fl.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    fl.Q.value = o.q || 1;
    const env = synth.envelope(t, o.g || 0.3, o.a || 0.005, t + dur, synth.bus.sfx);
    synth.chain(src, fl, env);
    src.start(t, Math.random() * 3);
    src.stop(t + dur + 0.05);
  };

  /**
   * Plays an oscillator tone at time `t` for `dur` seconds.
   * Options: type (waveform), f / f2 (start / end frequency), g (peak gain),
   * a (attack time), lp (optional lowpass cutoff) and bus (output bus).
   */
  synth.tone = function (t, dur, o) {
    o = o || {};
    const osc = synth.ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f || 440, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const env = synth.envelope(t, o.g || 0.2, o.a || 0.005, t + dur, o.bus || synth.bus.sfx);
    if (o.lp) synth.chain(osc, synth.filter('lowpass', o.lp), env);
    else synth.chain(osc, env);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  };

  /** Strikes a bell at `f` Hz: a stack of inharmonic partials, each decaying at its own rate. */
  synth.bell = function (t, f) {
    const partials = [[1, 0.25, 2.6], [2.01, 0.12, 1.8], [2.76, 0.09, 1.3], [4.1, 0.05, 0.9], [5.43, 0.03, 0.6]];
    partials.forEach(([ratio, g, decay]) => {
      synth.tone(t, decay, { f: f * ratio, g, a: 0.002 });
    });
  };

  /** Builds a stereo reverb impulse response of decaying noise. */
  function impulse(seconds, decay) {
    const { ctx } = synth;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  /** Fills the four-second white-noise buffer that every noise source plays from. */
  function makeNoise() {
    const { ctx } = synth;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /**
   * Builds the mixing graph:
   *   music ─┬─────────► master ► compressor ► speakers
   *          └► reverb ►┘   ▲
   *   ambience ─────────────┤
   *   sfx ─┬────────────────┘
   *        └► (a little) reverb
   */
  function buildGraph() {
    const { ctx } = synth;
    const master = synth.gain(0.85);
    synth.chain(master, ctx.createDynamicsCompressor(), ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(3.2, 2.6);
    reverb.connect(synth.gain(0.32, master));

    synth.bus.music = synth.gain(synth.musicOn ? LEVEL.music : 0, master, reverb);
    synth.bus.ambience = synth.gain(synth.musicOn ? LEVEL.ambience : 0, master);
    synth.bus.sfx = synth.gain(synth.sfxOn ? LEVEL.sfx : 0, master);
    synth.bus.sfx.connect(synth.gain(0.18, reverb));
  }

  /* ---------------- public API ---------------- */

  const audio = (DW.audio = DW.audio || {});

  /**
   * Starts the audio engine, or resumes it if the browser suspended it.
   * Safe to call repeatedly; call it from a user gesture.
   */
  audio.init = function () {
    if (synth.ctx) {
      if (synth.ctx.state === 'suspended') synth.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    synth.ctx = new AC();
    buildGraph();
    synth.noiseBuf = makeNoise();
    startHooks.forEach((fn) => fn());
  };

  /** Whether music (and the ambience that goes with it) is switched on. */
  audio.music = () => synth.musicOn;

  /** Whether sound effects are switched on. */
  audio.sound = () => synth.sfxOn;

  /** Toggles music and ambience, fading the buses; returns the new setting. */
  audio.toggleMusic = function () {
    synth.musicOn = !synth.musicOn;
    savePrefs();
    if (synth.ctx) {
      const t = synth.ctx.currentTime;
      synth.bus.music.gain.setTargetAtTime(synth.musicOn ? LEVEL.music : 0, t, 0.3);
      synth.bus.ambience.gain.setTargetAtTime(synth.musicOn ? LEVEL.ambience : 0, t, 0.3);
    }
    return synth.musicOn;
  };

  /** Toggles sound effects; returns the new setting. */
  audio.toggleSfx = function () {
    synth.sfxOn = !synth.sfxOn;
    savePrefs();
    if (synth.ctx) synth.bus.sfx.gain.setTargetAtTime(synth.sfxOn ? LEVEL.sfx : 0, synth.ctx.currentTime, 0.1);
    return synth.sfxOn;
  };
})();
