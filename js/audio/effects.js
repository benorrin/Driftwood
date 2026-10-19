/* Driftwood — sound effects.
 * Each effect is a short recipe of noise bursts and tones, played at time t. */
(function () {
  'use strict';

  const DW = window.DW;
  const synth = DW.synth;
  const { noise, tone, bell, midi, mtof } = synth;

  /** Rings the ship's bell at each offset (in seconds) from `t`. */
  const peal = (t, offsets) => offsets.forEach((dt) => bell(t + dt, 760));

  const SFX = {
    click(t) {
      tone(t, 0.03, { f: 1400, g: 0.03 });
    },
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
      for (let i = 0; i < 5; i++) {
        tone(t + i * 0.09, 0.08, { f: 500 + Math.random() * 500, f2: 900 + Math.random() * 600, g: 0.06 });
      }
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
    page(t) {
      noise(t, 0.3, { type: 'highpass', f: 3500, f2: 6000, g: 0.07, a: 0.08 });
    },
    step(t) {
      noise(t, 0.09, { type: 'lowpass', f: 450, g: 0.18 });
    },
    hit(t) {
      tone(t, 0.22, { f: 140, f2: 45, g: 0.6 });
      noise(t, 0.12, { type: 'lowpass', f: 1200, g: 0.3 });
    },
    swing(t) {
      noise(t, 0.18, { f: 900, f2: 2600, q: 1.2, g: 0.15, a: 0.06 });
    },
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
    hiss(t) {
      noise(t, 0.9, { type: 'highpass', f: 4000, g: 0.12, a: 0.2 });
    },
    bats(t) {
      for (let i = 0; i < 18; i++) {
        tone(t + Math.random() * 1.4, 0.04, { f: 3000 + Math.random() * 3000, g: 0.025 });
      }
    },
    bell(t) {
      peal(t, [0, 0.45]);
    },
    victory(t) {
      ['D4', 'F4', 'A4', 'D5'].forEach((n, i) => {
        tone(t + i * 0.14, 0.6, { type: 'triangle', f: mtof(midi(n)), g: 0.1 });
      });
    },
    death(t) {
      tone(t, 3.5, { type: 'sine', f: 147, f2: 55, g: 0.25, a: 0.3 });
      tone(t, 3.5, { type: 'triangle', f: 220, f2: 82, g: 0.1, a: 0.3 });
    },
    sail(t) {
      peal(t, [0, 0.45, 1.2, 1.65]);
    },
    honour(t) {
      ['A4', 'D5'].forEach((n, i) => {
        tone(t + i * 0.16, 0.7, { type: 'triangle', f: mtof(midi(n)), g: 0.09 });
      });
    },
  };

  /** Plays the named sound effect, if sound is on and the engine has started. */
  DW.audio.sfx = function (name) {
    if (!synth.ctx || !synth.sfxOn || !SFX[name]) return;
    SFX[name](synth.ctx.currentTime + 0.01);
  };
})();
