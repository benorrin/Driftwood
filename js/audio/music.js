/* Driftwood — music.
 * An original fiddle lament in D dorian over a soft pad, broken by long
 * rests; a heartbeat drum for fights; an octave-raised air for the ending.
 * A look-ahead scheduler queues notes slightly ahead of time so playback
 * stays steady even when the main thread is busy. */
(function () {
  'use strict';

  const DW = window.DW;
  const synth = DW.synth;
  const { midi, mtof } = synth;

  /** Parses a phrase like "D4:2 r:1 A4:3" into [midiNote | null, eighths] pairs. */
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

  // one bass note per bar of each phrase
  const BASS = {
    a: ['D2', 'F2', 'C2', 'D2'],
    b: ['D2', 'C2', 'F2', 'A1'],
    c: ['D2', 'D2', 'C2', 'D2'],
    d: ['D2', 'G2', 'Bb1', 'A1'],
  };

  // the phrase orders the lament may be played in
  const TUNES = [['a', 'b', 'a', 'c'], ['d', 'c', 'b', 'a'], ['a', 'c'], ['b', 'd', 'c'], ['c', 'a']];

  /** Length of an eighth note, in seconds. */
  const EIGHTH = 0.42;
  const BAR = 6 * EIGHTH;

  /** How far ahead of the clock the scheduler queues notes, in seconds. */
  const LOOKAHEAD = 0.3;

  let mood = 'calm';
  let events = [];
  let evIdx = 0;
  let seqStart = 0;
  let seqLen = 0;
  let playedTune = false;

  /**
   * Changes the music's mood: 'calm', 'tense' (combat), 'ending' or 'silent'.
   * The current sequence is dropped and a new one begins shortly.
   */
  DW.audio.setMood = function (m) {
    if (m === mood) return;
    mood = m;
    if (!synth.ctx) return;
    events = [];
    evIdx = 0;
    seqLen = 0;
    seqStart = synth.ctx.currentTime + (m === 'calm' ? 2.5 : 0.2);
    playedTune = m === 'calm';
  };

  /** Fills `events` with a heartbeat drum and a low pulsing drone. */
  function buildTense() {
    const beat = 0.5;
    for (let i = 0; i < 16; i++) {
      events.push({ t: i * beat, kind: 'drum', accent: i % 4 === 0 });
      if (i % 4 === 0) {
        events.push({ t: i * beat, kind: 'bass', m: midi(i % 8 === 0 ? 'D2' : 'Eb2'), dur: beat * 4 });
      }
    }
    seqLen = 16 * beat;
  }

  /** Fills `events` with a long rest: only a soft drone under the surf. */
  function buildRest() {
    seqLen = 14 + Math.random() * 20;
    events.push({ t: 0, kind: 'bass', m: midi('D2'), dur: seqLen * 0.8, soft: true });
    playedTune = false;
  }

  /** Fills `events` with a randomly chosen arrangement of the lament. */
  function buildTune() {
    const tune = TUNES[Math.floor(Math.random() * TUNES.length)];
    let t = 0;
    tune.forEach((k) => {
      BASS[k].forEach((b, i) => events.push({ t: t + i * BAR, kind: 'bass', m: midi(b), dur: BAR }));
      let noteT = t;
      PHRASES[k].forEach(([m, d]) => {
        if (m != null) events.push({ t: noteT, kind: 'lead', m: mood === 'ending' ? m + 12 : m, dur: d * EIGHTH });
        noteT += d * EIGHTH;
      });
      t += 4 * BAR;
    });
    events.sort((x, y) => x.t - y.t);
    seqLen = t + 3;
    playedTune = true;
  }

  /** Builds the next sequence of events to suit the current mood. */
  function buildSeq() {
    events = [];
    evIdx = 0;
    if (mood === 'silent') seqLen = 2;
    else if (mood === 'tense') buildTense();
    else if (playedTune && mood !== 'ending' && Math.random() < 0.55) buildRest();
    else buildTune();
  }

  /** Runs every 90ms: starts a new sequence when one ends, and queues upcoming notes. */
  function scheduler() {
    const now = synth.ctx.currentTime;
    if (evIdx >= events.length && now + LOOKAHEAD >= seqStart + seqLen) {
      seqStart = Math.max(seqStart + seqLen, now + 0.1);
      buildSeq();
    }
    while (evIdx < events.length && seqStart + events[evIdx].t < now + LOOKAHEAD) {
      const ev = events[evIdx++];
      const t = Math.max(now, seqStart + ev.t);
      if (ev.kind === 'lead') lead(ev.m, t, ev.dur);
      else if (ev.kind === 'bass') bass(ev.m, t, ev.dur, ev.soft);
      else if (ev.kind === 'drum') drum(t, ev.accent);
    }
  }

  synth.onStart(() => {
    seqStart = synth.ctx.currentTime + 1.5;
    setInterval(scheduler, 90);
  });

  /* ---------------- instruments ---------------- */

  /** A reedy fiddle: saw plus detuned square through a lowpass, with vibrato that swells in. */
  function lead(m, t, dur) {
    const { ctx } = synth;
    const f = mtof(m);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'square';
    o1.frequency.value = f;
    o2.frequency.value = f * 1.004;

    const vib = ctx.createOscillator();
    vib.frequency.value = 5.3;
    const vibDepth = ctx.createGain();
    vibDepth.gain.setValueAtTime(0, t);
    vibDepth.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(dur * 0.7, 0.6));
    vib.connect(vibDepth);
    vibDepth.connect(o1.frequency);
    vibDepth.connect(o2.frequency);

    const lp = synth.filter('lowpass', 900, 1.2);
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(1700, t + 0.15);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.09);
    g.gain.setTargetAtTime(0.075, t + 0.12, 0.3);
    g.gain.setTargetAtTime(0.0001, t + dur - 0.04, 0.09);

    o1.connect(lp);
    synth.chain(o2, synth.gain(0.35), lp);
    synth.chain(lp, g, synth.bus.music);

    const end = t + dur + 0.6;
    [o1, o2, vib].forEach((o) => {
      o.start(t);
      o.stop(end);
    });
  }

  /** A soft pad: root, fifth and octave in sine and triangle. `soft` plays it quieter. */
  function bass(m, t, dur, soft) {
    const peak = soft ? 0.05 : 0.085;
    const voices = [[m, 'sine', 1], [m + 7, 'triangle', 0.35], [m + 12, 'sine', 0.2]];
    voices.forEach(([note, type, level]) => {
      const o = synth.ctx.createOscillator();
      o.type = type;
      o.frequency.value = mtof(note);
      const g = synth.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * level, t + Math.min(0.8, dur * 0.3));
      g.gain.setTargetAtTime(0.0001, t + dur * 0.85, dur * 0.12 + 0.1);
      synth.chain(o, g, synth.bus.music);
      o.start(t);
      o.stop(t + dur + 1.5);
    });
  }

  /** A low drum thump with a falling pitch; accented beats are louder and higher. */
  function drum(t, accent) {
    const o = synth.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(accent ? 90 : 70, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    synth.chain(o, synth.envelope(t, accent ? 0.5 : 0.28, 0.01, t + 0.4, synth.bus.music));
    o.start(t);
    o.stop(t + 0.5);
  }
})();
