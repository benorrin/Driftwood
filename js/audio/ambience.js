/* Driftwood — ambience.
 * The endless surf on the beach, and the camp fire's rumble and crackle,
 * which grow with the size of the fire. */
(function () {
  'use strict';

  const DW = window.DW;
  const synth = DW.synth;

  let fireRumble = null;
  let fireLevel = 0;

  /**
   * Starts the surf: a low constant swell, plus a brighter wash whose volume
   * and brightness rise and fall at random, like breakers on the sand.
   */
  function startSurf() {
    const lp = synth.filter('lowpass', 400, 0.4);
    const g = synth.gain(0.02, synth.bus.ambience);
    const src = synth.noiseLoop();
    synth.chain(src, lp, g);
    src.start();

    // a constant low swell under the breakers
    const swell = synth.noiseLoop(0.7);
    synth.chain(swell, synth.filter('lowpass', 140), synth.gain(0.09, synth.bus.ambience));
    swell.start();

    /** Schedules one breaker, then queues the next. */
    (function wave() {
      const t = synth.ctx.currentTime;
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

  /** Starts the fire: a filtered-noise rumble and a stream of random crackles. */
  function startFire() {
    const src = synth.noiseLoop();
    fireRumble = synth.gain(0, synth.bus.sfx);
    synth.chain(src, synth.filter('lowpass', 320), fireRumble);
    src.start();

    /** Plays the occasional crackle; a bigger fire crackles more often and louder. */
    (function crackle() {
      setTimeout(crackle, 50 + Math.random() * (450 / Math.max(1, fireLevel)));
      if (!fireLevel || !synth.sfxOn) return;
      if (Math.random() < 0.18 * fireLevel) {
        synth.noise(synth.ctx.currentTime, 0.008 + Math.random() * 0.025, {
          type: 'highpass',
          f: 1800 + Math.random() * 3500,
          g: 0.04 + Math.random() * 0.1 * fireLevel / 4,
          a: 0.001,
        });
      }
    })();
  }

  synth.onStart(startSurf);
  synth.onStart(startFire);

  /** Sets the fire's loudness, from 0 (out) to 4 (roaring). */
  DW.audio.setFire = function (level) {
    fireLevel = level;
    if (synth.ctx) fireRumble.gain.setTargetAtTime(level * 0.022, synth.ctx.currentTime, 0.8);
  };
})();
