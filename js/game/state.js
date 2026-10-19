/* Driftwood — game state.
 * The castaway's state, the helpers that change it, and saving.
 *
 * `G.S` is a single object for the life of the page; starting or loading a
 * game replaces its contents in place, so every module can hold on to it. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const { RES, FIRE_NAMES, NIGHT_AT, TIDE_LEN, TIDE_LATER, LOG_MAX, SAVE_KEY, REMAINS_KEY, RECORDS_KEY } = G;
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
      canoe: {},
      flags: {},
      ail: {},
      visits: {},
      mapped: {},
      events: {},
      log: [],
      n: { comb: 0, salvage: 0, pyreDays: 0 },
      ticks: { catcher: 0, trap: 0, ally: 0, event: 0, jem: 0 },
      chapter: 1,
      isle: 'home',
      wind: null,
      boat: {},
      camp: null,
      charted: {},
      landed: {},
      ended: false,
    };
  };

  /** Whether the castaway is on their own island, where the camp is, rather than cast away from it. */
  G.atHome = () => S.isle === 'home';

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

  /** What Hollis is doing, once he has joined you: a HOLLIS_JOBS key. */
  G.hollisJob = () => (G.withHollis() ? S.n.hollisJob || 'gather' : null);

  /** Whether Hollis, once befriended, is where the castaway is, and not left keeping the camp. */
  G.withHollis = () => !!S.flags.ally && (G.atHome() || !S.flags.hollisHome);

  /** Sets Hollis to `job`. */
  G.setHollisJob = function (job) {
    S.n.hollisJob = job;
    G.log(G.HOLLIS_JOBS[job][2]);
    G.save();
  };

  /** Afflicts the castaway with ailment `kind` for its full course, starting again if they have it already. */
  G.afflict = function (kind) {
    S.ail[kind] = G.AILMENTS[kind][1];
  };

  /** Whether the castaway has any ailment. */
  G.ailing = () => Object.keys(S.ail).length > 0;

  /** Takes a day off every ailment, logging those that pass. */
  G.mend = function () {
    Object.keys(S.ail).forEach((k) => {
      if (--S.ail[k] <= 0) {
        delete S.ail[k];
        G.log(G.AILMENTS[k][2]);
      }
    });
  };

  /** Whether the tide is out, baring the reef and the rock pools. */
  G.lowTide = () => (S.t + S.day * TIDE_LATER) % TIDE_LEN < TIDE_LEN / 2;

  /** Whether the tide matters yet: once there is a place on the map that only the ebb uncovers. */
  G.tideKnown = () => !!(S.mapped.wreck || S.mapped.tidepools);

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
    if (S.fire === 0 && S.flags.fireLit) S.flags.fireOut = 1;
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
    s.ail = s.ail || {};
    s.canoe = s.canoe || {};
    // the ball from the cask was once called Wilson
    if (s.items.wilson) s.items.bristow = 1;
    if (s.events.wilson) s.events.bristow = s.events.wilson;
    delete s.items.wilson;
    delete s.events.wilson;
    s.ticks.event = s.ticks.event || 0;
    s.ticks.jem = s.ticks.jem || 0;
    // kept from when the log was longer
    s.log = (s.log || []).slice(0, LOG_MAX);
    // saved before there were chapters
    s.chapter = s.chapter || 1;
    s.isle = s.isle || 'home';
    s.boat = s.boat || {};
    s.landed = s.landed || (s.chapter > 1 ? { islet: 1 } : {});
    s.charted = s.charted || (s.chapter > 1 ? { islet: 1, high: 1, rock: s.flags.homeAgain ? 1 : 0 } : {});
    // saved before the other islands had places of their own: put on the map what was already found there
    const been = (ids) => ids.forEach((id) => {
      s.mapped[id] = 1;
      s.visits[id] = s.visits[id] || 1;
    });
    if (s.flags.meridianCamp) been(['hiCamp', 'hiGrave']);
    if (s.flags.meridianCamp && s.charted.smoke) been(['hiRidge']);
    if (s.n.jemFood || s.flags.jem || s.flags.jemDead || s.flags.jemGone) been(['hiPool']);
    if (s.landed && s.landed.rock) been(['brCleft', 'brLedges']);
    if (s.landed && s.landed.smoke) been(['ifVillage', 'ifSheds', 'ifTavake']);
    if (s.flags.whalerKnown) been(['ifAnchorage']);
    return s;
  }

  /** Returns the saved game if there is one that can be continued, otherwise null. */
  G.load = function () {
    const s = storage.getJSON(SAVE_KEY, null);
    return s && s.v === 1 && !s.ended ? upgrade(s) : null;
  };

  /** Deletes the saved game. */
  G.clearSave = () => storage.remove(SAVE_KEY);

  /* ---------------- the ship's log ---------------- */

  /** How many of the latest tales the ship's log keeps in full. */
  const RECENT = 6;

  /**
   * Every tale told in this browser: how many, the longest on the island,
   * which endings have been reached, and the latest few in full.
   */
  G.records = () => storage.getJSON(RECORDS_KEY, null) || { tales: 0, best: 0, found: {}, recent: [] };

  /** Writes the tale just ended into the ship's log: `end` is an ENDINGS key, or 'death' by `cause`. */
  G.recordTale = function (end, cause) {
    const r = G.records();
    r.tales++;
    r.best = Math.max(r.best, S.day);
    if (end !== 'death') r.found[end] = 1;
    const t = cause ? { end, day: S.day, cause } : { end, day: S.day };
    if (S.chapter > 1) t.chapter = S.chapter;
    r.recent.unshift(t);
    r.recent.length = Math.min(r.recent.length, RECENT);
    storage.setJSON(RECORDS_KEY, r);
    G.taleAchievements(end, cause);
  };

  /* ---------------- the last castaway ---------------- */

  /** Stores a castaway's bones may still hold for the next, and the most of each they keep. */
  const KEPT = { rope: 4, stone: 4, iron: 4, cloth: 3, gum: 3, torch: 2, shot: 1 };

  /**
   * Remembers the castaway who has just died of `cause`, for the next to
   * find: the day they died, whether at sea, half of what they kept that
   * would last, and whether Bristow was with them.
   */
  G.leaveRemains = function (cause) {
    const keep = {};
    for (const k in KEPT) {
      const n = Math.min(KEPT[k], Math.ceil((S.res[k] || 0) / 2));
      if (n > 0) keep[k] = n;
    }
    storage.setJSON(REMAINS_KEY, {
      // dying away from the island, they can only come back to it on the tide
      day: S.day, cause, sea: !!S.flags.sailing || !G.atHome(), keep, bristow: !!S.items.bristow,
    });
  };

  /** The last castaway to die here, if no one has found them yet; otherwise null. */
  G.remains = () => storage.getJSON(REMAINS_KEY, null);

  /** Forgets the last castaway, once they have been found. */
  G.clearRemains = () => storage.remove(REMAINS_KEY);
})();
