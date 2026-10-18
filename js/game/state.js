/* Driftwood — game state.
 * The castaway's state, the helpers that change it, and saving.
 *
 * `G.S` is a single object for the life of the page; starting or loading a
 * game replaces its contents in place, so every module can hold on to it. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const { RES, FIRE_NAMES, NIGHT_AT, LOG_MAX, SAVE_KEY } = G;
  const storage = window.DW.storage;

  /** The current game. Empty until a game is started or loaded. */
  const S = (G.S = {});

  /**
   * Whether a game is in progress on screen, and a counter that changes
   * whenever the state is replaced, so delayed callbacks can tell whether
   * the game they belong to is still the current one.
   */
  G.session = { running: false, generation: 0 };

  /** Resources whose amounts changed since the stores were last drawn, to flash them. */
  G.bumps = {};

  /** The state of a castaway newly marooned. */
  G.freshState = function () {
    return {
      v: 1,
      day: 1,
      t: 8,
      health: 10,
      fire: 0,
      fireT: 0,
      res: { water: 3, food: 3, shot: 1 },
      seen: { water: 1, food: 1, shot: 1 },
      items: { pistol: 1, bible: 1 },
      built: {},
      raft: {},
      flags: {},
      visits: {},
      mapped: {},
      events: {},
      log: [],
      n: { comb: 0, salvage: 0, pyreDays: 0 },
      ticks: { catcher: 0, trap: 0, ally: 0, event: 0 },
      ended: false,
    };
  };

  /** Replaces the contents of the state with `next`, starting a new generation. */
  G.replaceState = function (next) {
    Object.keys(S).forEach((k) => delete S[k]);
    Object.assign(S, next);
    G.session.generation++;
  };

  /* ---------------- resources ---------------- */

  /** Whether the stores hold everything in `cost` ({ resource: amount }). */
  G.has = (cost) => Object.keys(cost || {}).every((k) => (S.res[k] || 0) >= cost[k]);

  /** Removes `cost` from the stores. Check `has` first. */
  G.pay = (cost) => {
    for (const k in cost) S.res[k] -= cost[k];
  };

  /** Describes a set of resources, e.g. "2 driftwood, 1 stone". */
  G.costText = (cost) => Object.entries(cost || {}).map(([k, v]) => `${v} ${RES[k]}`).join(', ');

  /** How many of the structure `id` have been built. */
  G.builtCount = (id) => S.built[id] || 0;

  /** Adds `n` (possibly negative) of resource `k`, never going below zero. */
  G.add = function (k, n) {
    if (!n) return;
    S.res[k] = Math.max(0, (S.res[k] || 0) + n);
    if (n > 0) S.seen[k] = 1;
    G.bumps[k] = 1;
  };

  /** Adds several resources at once; returns what was gained, e.g. "2 driftwood, 1 stone". */
  G.gain = function (obj) {
    const parts = [];
    for (const k in obj) {
      if (obj[k] > 0) {
        G.add(k, obj[k]);
        parts.push(`${obj[k]} ${RES[k]}`);
      }
    }
    return parts.join(', ');
  };

  /* ---------------- the castaway ---------------- */

  /** Health is 10, or 12 with a lean-to to sleep under. */
  G.maxHealth = () => 10 + (S.built.leanto ? 2 : 0);

  /** Whether it is night on the clock. */
  G.isNight = () => S.t >= NIGHT_AT;

  /** Adds a line to the top of the log. `cls` may be 'lore', 'warn', or 'day' for a day divider. */
  G.log = function (msg, cls) {
    S.log.unshift({ m: msg, c: cls || '' });
    if (S.log.length > LOG_MAX) S.log.length = LOG_MAX;
    G.renderLog();
  };

  /** Restores up to `n` health. */
  G.heal = function (n) {
    S.health = Math.min(G.maxHealth(), S.health + n);
  };

  /** Takes `n` health; at zero the castaway dies of `cause` (a death key or a foe's name). */
  G.damage = function (n, cause) {
    S.health -= n;
    if (S.health <= 0) G.die(cause);
  };

  /** Sets the fire to `level` (clamped to 0–4) and logs the change unless `quiet`. */
  G.setFire = function (level, quiet) {
    const prev = S.fire;
    S.fire = Math.max(0, Math.min(4, level));
    S.fireT = 0;
    AU.setFire(S.fire);
    if (quiet || prev === S.fire) return;
    if (S.fire === 0) G.log('The fire has gone out.', 'warn');
    else G.log(`The fire is ${FIRE_NAMES[S.fire]}.`);
  };

  /* ---------------- persistence ---------------- */

  /** Saves the game in progress. Finished games, and the title screen, are never saved. */
  G.save = function () {
    if (!G.session.running || S.ended) return;
    storage.setJSON(SAVE_KEY, S);
  };

  /**
   * Brings a game saved before the map and happenings up to date: the places
   * it already knew of are drawn on the map, and the new counters start at zero.
   */
  function upgrade(s) {
    if (!s.mapped) {
      const f = s.flags;
      const v = s.visits;
      s.mapped = {
        grove: f.chart, tidepools: v.grove || f.bottle, spring: v.tidepools, wreck: f.bottle || f.wreckSeen,
        jungle: v.spring, cave: f.caveKnown, hut: f.trail, summit: f.summitKnown,
      };
      if (f.chart) s.items.map = 1;
    }
    s.events = s.events || {};
    // the ball from the cask was once called Wilson
    if (s.items.wilson) s.items.bristow = 1;
    if (s.events.wilson) s.events.bristow = s.events.wilson;
    delete s.items.wilson;
    delete s.events.wilson;
    s.ticks.event = s.ticks.event || 0;
    return s;
  }

  /** Returns the saved game if there is one that can be continued, otherwise null. */
  G.load = function () {
    const s = storage.getJSON(SAVE_KEY, null);
    return s && s.v === 1 && !s.ended ? upgrade(s) : null;
  };

  /** Deletes the saved game. */
  G.clearSave = () => storage.remove(SAVE_KEY);
})();
