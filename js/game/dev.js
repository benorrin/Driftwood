/* Driftwood — developer tools.
 * Hidden unless switched on by opening the game with ?dev in the address
 * (?dev=0 switches them off again). They start a tale at a chosen point in
 * the story, or nudge the tale in progress: stores, health, the hour, the
 * map, the wind. A tale touched by them is marked `dev`, so it earns no
 * achievements and is never written in the ship's log. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, $, RES_ORDER, ITEMS, DAY_LEN, NIGHT_AT, WINDS,
    freshState, replaceState, log, modal, closeModal, leave,
  } = G;

  /** Where the switch is kept. */
  const DEV_KEY = 'driftwood-dev';

  /** Whether the developer tools are switched on in this browser. */
  G.devOn = () => !!DW.storage.get(DEV_KEY);

  /** Reads ?dev from the address: on with ?dev, off with ?dev=0. */
  G.devFromAddress = function () {
    const p = new URLSearchParams(window.location.search);
    if (!p.has('dev')) return;
    if (p.get('dev') === '0') DW.storage.remove(DEV_KEY);
    else DW.storage.set(DEV_KEY, '1');
  };

  /* ---------------- building a tale at a point in the story ---------------- */

  /** Every place on island `isle`'s map (the home island's by default), found and visited once. */
  function mapAll(s, isle) {
    const locs = isle && isle !== 'home' ? G.ISLES[isle].locs || {} : G.LOCS;
    Object.keys(locs).forEach((id) => {
      s.mapped[id] = 1;
      s.visits[id] = s.visits[id] || 1;
    });
  }

  /** `n` of every resource. */
  function stock(s, n) {
    RES_ORDER.forEach((k) => {
      s.res[k] = n;
      s.seen[k] = 1;
    });
    s.res.shot = 3;
  }

  /** A month into Chapter 1: the camp built, the wreck searched, the dead buried, and Hollis at the fire. */
  function settled() {
    const s = freshState();
    Object.assign(s, { day: 10, health: 12, fire: 3 });
    stock(s, 20);
    ['map', 'knife', 'spear', 'axe', 'cutlass', 'waterskin', 'journal'].forEach((k) => (s.items[k] = 1));
    Object.assign(s.built, { leanto: 1, catcher: 2, trap: 1 });
    Object.assign(s.flags, {
      chart: 1, bottle: 1, wreckCabin: 1, wreckHold: 1, raftPlans: 1, buried: 1,
      metHollis: 1, hollisDone: 1, ally: 1,
    });
    s.n.comb = 8;
    mapAll(s);
    return s;
  }

  /** Late in Chapter 1: the trades have turned, the pyre is built and the raft is finished. */
  function leaving() {
    const s = settled();
    Object.assign(s, { day: 16 });
    stock(s, 40);
    s.flags.trades = 1;
    s.built.pyre = 1;
    s.built.rack = 1;
    s.raft = { hull: 1, mast: 1, sail: 1, casks: 1 };
    return s;
  }

  /** Chapter 2, back home: the boat patched and fully fitted, the near islands charted. */
  function homeAgain() {
    const s = leaving();
    Object.assign(s, { day: 30, chapter: 2, isle: 'home', wind: 'trades' });
    s.boat = { kind: 'raft', lash: 1, mast: 1, sail: 1, leeboards: 1, casks: 1, outrigger: 1 };
    s.charted = { islet: 1, high: 1, rock: 1, sandbar: 1 };
    s.landed = { islet: 1, high: 1 };
    s.raft = {};
    delete s.built.pyre;
    Object.assign(s.flags, { homeAgain: 1, bristowLost: 1, raftPlans: 1 });
    s.n.wreckDay = 20;
    return s;
  }

  /** Chapter 2, with Jem Rudd at the fire and four of his five tales told. */
  function withJem() {
    const s = homeAgain();
    s.day = 40;
    mapAll(s, 'high');
    Object.assign(s.flags, { jem: 1, meridianCamp: 1, highFootprint: 1, lookout: 1 });
    Object.assign(s.n, { jemTold: 4, jemToldDay: 39, jemJob: 'gather', jemFood: 3 });
    s.items.bean = 1;
    return s;
  }

  /** Chapter 2, the promise made at the marae; the canoes come back tomorrow to take you south. */
  function promised() {
    const s = withJem();
    s.day = 52;
    s.n.jemTold = 5;
    s.charted.smoke = 1;
    Object.assign(s.flags, { contact: 'warm', promise: 1, invited: 1, idolGiven: 1, shells: 1 });
    Object.assign(s.n, { goodwill: 2, visits: 2, visitDue: 53, visitUntil: 0 });
    return s;
  }

  /** Chapter 2, at the Island of Fires, a wayfinder, with the Perseverance due tomorrow. */
  function atFires() {
    const s = promised();
    s.day = 60;
    s.isle = 'smoke';
    s.landed.smoke = 1;
    s.camp = { wood: 20, food: 10, water: 10 };
    mapAll(s, 'smoke');
    Object.assign(s.flags, { wayfinder: 1, whalerKnown: 1, hollisSawFires: 1 });
    Object.assign(s.n, { lessons: 3, whalerDue: 61, whalerUntil: 0 });
    return s;
  }

  /**
   * The points in the story a tale can be started from: [label, what it
   * builds, and anything to do once the game is on screen].
   */
  const JUMPS = [
    ['the first morning', freshState],
    ['Chapter 1, settled (day 10)', settled],
    ['Chapter 1, ready to leave (day 16)', leaving],
    ['Chapter 2, on the reef of the islet', leaving, () => G.wrecked('raft')],
    ['Chapter 2, home with the boat fitted', homeAgain],
    ['Chapter 2, Jem at the fire', withJem],
    ['Chapter 2, the promise made', promised],
    ['Chapter 2, at the Island of Fires', atFires],
  ];

  /** Starts a tale from jump `j`, marked as a developer's tale. */
  function jump(j) {
    const [label, build, after] = j;
    G.clearSave();
    const s = build();
    s.dev = 1;
    replaceState(s);
    closeModal();
    G.enterGame();
    log(`Day ${S.day}`, 'day');
    log(`Developer: started at ${label}.`, 'warn');
    if (after) after();
    G.render();
  }

  /* ---------------- nudging the tale in progress ---------------- */

  /** Marks the tale in progress as a developer's, then does `fn` and redraws. */
  const nudge = (fn, line) => () => {
    S.dev = 1;
    fn();
    if (line) log(`Developer: ${line}`, 'warn');
    closeModal();
    G.render();
  };

  /** The things that can be done to the tale in progress. */
  const NUDGES = [
    ['fill the stores', () => RES_ORDER.forEach((k) => G.add(k, 20)), 'twenty of everything.'],
    ['heal fully', () => {
      S.health = G.maxHealth();
      S.ail = {};
    }, 'healed.'],
    ['skip to nightfall', () => (S.t = NIGHT_AT - 1), 'it is nearly night.'],
    ['skip to dawn', () => (S.t = DAY_LEN - 1), 'it is nearly dawn.'],
    ['map this island', () => mapAll(S, S.isle), 'every place on the map.'],
    ['every possession', () => Object.keys(ITEMS).forEach((k) => (S.items[k] = 1)), 'every possession.'],
    ['shift the wind', () => {
      const ids = Object.keys(WINDS);
      S.wind = ids[(ids.indexOf(S.wind) + 1) % ids.length];
    }, 'the wind has shifted.'],
    ['a happening', () => G.happening(), null],
  ];

  /** Opens the developer tools: the jumps, and, if a tale is under way, the nudges. */
  G.openDev = function () {
    AU.init();
    const playing = G.session.running && !S.ended;
    const choices = JUMPS.map((j) => ({ label: j[0], fn: () => jump(j) }));
    choices.push({ label: 'the prologue', fn: () => {
      closeModal();
      G.playPrologue(G.toTitle);
    } });
    if (playing) NUDGES.forEach(([label, fn, line]) => choices.push({ label, note: 'this tale', fn: nudge(fn, line) }));
    choices.push(leave('close'));
    modal({
      art: ART.scene('bottle'),
      title: 'Developer',
      text: [
        'Start a tale at a point in the story, or nudge the one under way. A tale touched here earns no achievements and is not written in the ship\'s log.',
        'Starting a tale here replaces any saved game. Open the game with <i>?dev=0</i> to hide these tools.',
      ],
      choices,
    });
  };

  /** Shows the developer links on the title screen and in the game, if the tools are on. */
  G.showDevLinks = function () {
    const on = G.devOn();
    $('#btn-dev').classList.toggle('hidden', !on);
    $('#btn-dev-game').classList.toggle('hidden', !on);
  };
})();
