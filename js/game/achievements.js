/* Driftwood — achievements.
 * Deeds, feats, follies and secrets, earned across every tale told in this
 * browser. Most are noticed from the state of the game as it is drawn; the
 * rest are awarded where they happen, by name, with `G.achieve`. A small
 * card in the corner of the screen announces each one. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const storage = window.DW.storage;
  const { S, $, el, ACHIEVEMENTS_KEY } = G;

  /**
   * The kinds of achievement, in the order the list shows them: [heading,
   * the word on the card that announces one]. Deeds come in the ordinary
   * course of a tale, feats take some doing, follies are best not aimed
   * for, and secrets are hidden until found.
   */
  const KINDS = {
    deed: ['Deeds', 'A Deed'],
    feat: ['Feats', 'A Feat'],
    folly: ['Follies', 'A Folly'],
    secret: ['Secrets', 'A Secret'],
  };

  /** The endings that take the castaway home. */
  const HOMEWARD = ['rescue', 'valparaiso'];

  /** Days within which a castaway must get home for "Fair Winds". */
  const FAIR_WINDS_DAYS = 15;

  /** Days within which a castaway must die for "Brief Candle". */
  const BRIEF_DAYS = 10;

  /** Boar to kill, over every tale, for "Swineherd". */
  const BOARS = 10;

  /**
   * Every achievement: an id, its kind, a name, what earns it and, for those
   * read from the game's state, a `test()`. The rest are awarded by name
   * where they happen.
   */
  const LIST = [
    { id: 'fire', kind: 'deed', name: 'First Light', desc: 'Light a fire.', test: () => S.flags.fireLit },
    { id: 'leanto', kind: 'deed', name: 'A Roof Overhead', desc: 'Build a lean-to.', test: () => S.built.leanto },
    { id: 'map', kind: 'deed', name: 'The Flyleaf', desc: 'Draw a map of the island.', test: () => S.flags.chart },
    { id: 'bottle', kind: 'deed', name: 'Message in a Bottle', desc: 'Find Captain Hale\'s letter.', test: () => S.flags.bottle },
    { id: 'wreck', kind: 'deed', name: 'Her Bones', desc: 'Board the wreck of the <i>Calliope</i>.', test: () => S.visits.wreck },
    { id: 'week', kind: 'deed', name: 'A Week of Notches', desc: 'Live to see the seventh day.', test: () => S.day >= 7 },
    { id: 'comb', kind: 'deed', name: 'Beachcomber', desc: 'Comb the beach fifty times in one tale.', test: () => S.n.comb >= 50 },
    { id: 'read', kind: 'deed', name: 'Chapter and Verse', desc: 'Read by firelight ten times in one tale.', test: () => S.n.read >= 10 },
    { id: 'torch', kind: 'deed', name: 'By Torchlight', desc: 'Set out on a journey after dark.' },
    { id: 'stocked', kind: 'deed', name: 'Well Found', desc: 'Hold thirty provisions and thirty fresh water at once.', test: () => S.res.food >= 30 && S.res.water >= 30 },
    { id: 'storms', kind: 'deed', name: 'Weathered', desc: 'Come through three storms in one tale.', test: () => S.n.storms >= 3 },
    { id: 'brace', kind: 'deed', name: 'Turned Aside', desc: 'Brace for a heavy blow, and turn it.' },
    { id: 'unhurt', kind: 'deed', name: 'Not a Scratch', desc: 'Win a fight without losing any health.' },
    { id: 'reefshark', kind: 'deed', name: 'Something in the Shallows', desc: 'Kill a reef shark while fishing.' },
    { id: 'journal', kind: 'deed', name: 'Hale\'s Journal', desc: 'Read the captain\'s last words.', test: () => S.items.journal },
    { id: 'buried', kind: 'deed', name: 'Above the Tide Line', desc: 'Bury the <i>Calliope</i>\'s dead.', test: () => S.flags.buried },
    { id: 'ally', kind: 'deed', name: 'Man Friday', desc: 'Befriend the wild man.', test: () => S.flags.ally },
    { id: 'pyre', kind: 'deed', name: 'A Great Fire', desc: 'Build the signal pyre on the summit.', test: () => S.built.pyre },
    { id: 'raft', kind: 'deed', name: 'Shipwright', desc: 'Finish the raft.', test: () => G.RAFT.every((p) => S.raft[p.id]) },
    { id: 'shark', kind: 'deed', name: 'A Bigger Raft', desc: 'Fight off the shark at sea.' },
    { id: 'reef', kind: 'deed', name: 'The Reef', desc: 'Reach the second chapter.', test: () => S.chapter >= 2 },
    { id: 'homeAgain', kind: 'deed', name: 'Home Waters', desc: 'Sail the patched boat home from the islet.', test: () => S.flags.homeAgain },
    { id: 'jem', kind: 'deed', name: 'Bread on the Waters', desc: 'Coax the deserter out of hiding.', test: () => S.flags.jem },
    { id: 'beans', kind: 'deed', name: 'Every Bean Was Black', desc: 'Hear all that Jem has to tell.', test: () => S.n.jemTold >= 5 },
    { id: 'tupa', kind: 'deed', name: 'Tupa and Tavake', desc: 'Be welcomed by the people who tend the marae.', test: () => S.flags.contact === 'warm' },
    { id: 'promise', kind: 'deed', name: 'A Promise', desc: 'Promise to bring their god home.', test: () => S.flags.promise },
    { id: 'fires', kind: 'deed', name: 'The Island of Fires', desc: 'Follow the canoes south.', test: () => S.landed && S.landed.smoke },
    { id: 'wayfinder', kind: 'deed', name: 'Three Swells', desc: 'Learn to read the sea from Tavake.', test: () => S.flags.wayfinder },
    { id: 'valparaiso', kind: 'deed', name: 'Bound for Valparaíso', desc: 'Sail in the <i>Perseverance</i>.' },
    { id: 'witness', kind: 'deed', name: 'A Witness', desc: 'Persuade Jem to come to Valparaíso and speak.', test: () => S.flags.jemSails },
    { id: 'consigned', kind: 'deed', name: 'Consigned', desc: 'Find where the <i>Meridian</i> took on water.', test: () => S.flags.meridianCamp },
    { id: 'rescue', kind: 'deed', name: 'Thee Had Better Come Aboard', desc: 'Be taken off by a whaler.' },

    { id: 'cartographer', kind: 'feat', name: 'Cartographer', desc: 'Put every place on the island on your map.', test: () => Object.keys(G.LOCS).every((id) => S.mapped[id]) },
    { id: 'forty', kind: 'feat', name: 'Forty Days and Forty Nights', desc: 'Live to see the fortieth day.', test: () => S.day >= 40 },
    { id: 'fairWinds', kind: 'feat', name: 'Fair Winds', desc: `Get home within ${FAIR_WINDS_DAYS} days.` },
    { id: 'flame', kind: 'feat', name: 'Keeper of the Flame', desc: 'Get home without once letting the fire go out.' },
    { id: 'lastShot', kind: 'feat', name: 'The Last Shot', desc: 'Finish a foe with your last powder and shot.' },
    { id: 'boars', kind: 'feat', name: 'Swineherd', desc: `Kill ${BOARS} boar, over all your tales.` },
    { id: 'parcel', kind: 'feat', name: 'Special Delivery', desc: 'Carry the sealed parcel to Valparaíso.' },
    { id: 'stay', kind: 'feat', name: 'Monarch of All I Survey', desc: 'Make the island your home.' },
    { id: 'charts', kind: 'feat', name: 'Charts of the Islands', desc: 'Put every place on the islands of the archipelago on your maps.', test: () => S.chapter > 1 && Object.values(G.ISLES).every((i) => Object.keys(i.locs || {}).every((id) => S.mapped[id])) },
    { id: 'isles', kind: 'feat', name: 'Before the Wind', desc: 'Land on every island your boat can reach.', test: () => ['islet', 'high', 'rock', 'sandbar'].every((id) => S.landed && S.landed[id]) },
    { id: 'endings', kind: 'feat', name: 'Every Way Home', desc: 'Find every ending.' },
    { id: 'all', kind: 'feat', name: 'The Whole Log', desc: 'Earn every other achievement.' },

    { id: 'died', kind: 'folly', name: 'Here Lies a Sailor', desc: 'Die on the island.' },
    { id: 'brief', kind: 'folly', name: 'Brief Candle', desc: `Die within ${BRIEF_DAYS} days.` },
    { id: 'crab', kind: 'folly', name: 'Crabbed', desc: 'Be killed by a land crab.' },
    { id: 'pecked', kind: 'folly', name: 'Pecked to Death', desc: 'Be killed by the gulls.' },
    { id: 'routed', kind: 'folly', name: 'Routed', desc: 'Run from a flock of gulls.' },
    { id: 'palm', kind: 'folly', name: 'What Goes Up', desc: 'Fall out of a palm tree.' },
    { id: 'bristow', kind: 'folly', name: 'A Good Listener', desc: 'Keep a ball for company.', test: () => S.items.bristow },
    { id: 'crusoe', kind: 'folly', name: 'Required Reading', desc: 'Find a book about a castaway.', test: () => S.items.crusoe },
    { id: 'friday', kind: 'folly', name: 'Footprints', desc: 'Count the notches to a Friday.', test: () => S.events.friday },
    { id: 'skates', kind: 'folly', name: 'Curiosity', desc: 'Open a parcel that was not yours to open.' },
    { id: 'hullDown', kind: 'folly', name: 'Hull Down', desc: 'Study a whaler until she sails out of sight.' },
    { id: 'hoard', kind: 'folly', name: 'Kindling', desc: 'Hoard a hundred driftwood.', test: () => S.res.wood >= 100 },
    { id: 'abandon', kind: 'folly', name: 'Second Thoughts', desc: 'Abandon a life and begin again.' },
    { id: 'styles', kind: 'folly', name: 'A Change of Scene', desc: 'See the island in every visual style.' },

    { id: 'numbers', kind: 'secret', name: 'The Numbers', desc: 'Find six numbers carved in a palm.', test: () => S.events.numbers },
    { id: 'dollar', kind: 'secret', name: 'Not Here Either', desc: 'Dig up a buried treasure.', test: () => S.items.dollar },
    { id: 'parrot', kind: 'secret', name: 'Poor Tom!', desc: 'Hear the parrot.', test: () => S.events.parrot },
    { id: 'blowhole', kind: 'secret', name: 'Only the Sea', desc: 'Find what groans in the night.', test: () => S.visits.blowhole },
    { id: 'locket', kind: 'secret', name: 'The Light in the Sea', desc: 'Wade out to the light beyond the reef.', test: () => S.items.locket },
    { id: 'widow', kind: 'secret', name: 'M.H.', desc: 'Bury Hale\'s crew and take his locket home.' },
    { id: 'idolHome', kind: 'secret', name: 'It Wants to Go Home', desc: 'Return the carved figure to its people.', test: () => S.flags.idolReturned },
    { id: 'idolKept', kind: 'secret', name: 'Facing the Room', desc: 'Take the carved figure home with you.' },
    { id: 'remains', kind: 'secret', name: 'The Boots Fit', desc: 'Find what is left of the last castaway.', test: () => S.events.bones || S.events.lastRaft },
    { id: 'overboard', kind: 'secret', name: 'Bristow!', desc: 'Lose your companion at sea.', test: () => S.flags.bristowLost },
    { id: 'meridian', kind: 'secret', name: 'Good Riddance', desc: 'Know the <i>Meridian</i>, and let her sail on.' },
    { id: 'glass', kind: 'secret', name: 'Through a Glass', desc: 'Light the pyre for the <i>Meridian</i>, and be watched.', test: () => S.flags.meridianClose },
    { id: 'jemDead', kind: 'secret', name: 'Taken With Him', desc: 'Kill the deserter.', test: () => S.flags.jemDead },
    { id: 'notches', kind: 'secret', name: 'Thousands of Notches', desc: 'Kill the wild man.', test: () => S.flags.killedHollis },
    { id: 'boyStayed', kind: 'secret', name: 'The Boy Who Stayed', desc: 'Leave Hollis with the people of the Island of Fires.', test: () => S.flags.hollisStayed },
    { id: 'greybeards', kind: 'secret', name: 'Two Grey Beards', desc: 'Grow old on the island with Hollis.' },
  ];

  const BY_ID = Object.fromEntries(LIST.map((a) => [a.id, a]));

  /**
   * What has been earned in this browser (id → the date), and the tallies
   * that run across tales: boar killed, and visual styles seen.
   */
  const record = () => {
    const r = storage.getJSON(ACHIEVEMENTS_KEY, null) || {};
    return { got: r.got || {}, boars: r.boars || 0, styles: r.styles || {} };
  };

  /** Changes the record with `fn`, then stores it. */
  function update(fn) {
    const r = record();
    fn(r);
    storage.setJSON(ACHIEVEMENTS_KEY, r);
  }

  /** Whether achievement `id` has been earned. */
  G.achieved = (id) => !!record().got[id];

  /** Awards achievement `id`, announcing it, unless it was earned before. */
  G.achieve = function (id) {
    // a tale started or nudged with the developer tools earns nothing
    if (S.dev || !BY_ID[id] || G.achieved(id)) return;
    update((r) => {
      r.got[id] = new Date().toISOString().slice(0, 10);
    });
    announce(BY_ID[id]);
    if (id !== 'all' && LIST.every((a) => a.id === 'all' || G.achieved(a.id))) G.achieve('all');
  };

  /** Awards every achievement read from the state whose test now passes. Runs whenever the game is drawn. */
  G.checkAchievements = function () {
    const got = record().got;
    LIST.forEach((a) => {
      if (a.test && !got[a.id] && a.test()) G.achieve(a.id);
    });
  };

  /**
   * A fight is won against foe `key`. `fight` says how: `hurt` if the
   * castaway lost health, `lastShot` if the pistol's last shot finished it.
   */
  G.foeBeaten = function (key, fight) {
    if (!fight.hurt) G.achieve('unhurt');
    if (fight.lastShot) G.achieve('lastShot');
    if (key === 'reefshark' || key === 'shark') G.achieve(key);
    if (key === 'boar') {
      update((r) => {
        r.boars++;
      });
      if (record().boars >= BOARS) G.achieve('boars');
    }
  };

  /** Notes that visual style `id` has been seen, and whether every one now has. */
  G.styleSeen = function (id) {
    update((r) => {
      r.styles[id] = 1;
    });
    const seen = record().styles;
    if (window.DW.styles.list.every((st) => seen[st.id])) G.achieve('styles');
  };

  /** The tale has ended by `end` (an ENDINGS key, or 'death' by `cause`): awards what that earns. */
  G.taleAchievements = function (end, cause) {
    const home = HOMEWARD.includes(end);
    if (end === 'death') {
      G.achieve('died');
      if (S.day < BRIEF_DAYS) G.achieve('brief');
      if (cause === G.FOES.crab.name) G.achieve('crab');
      if (cause === G.FOES.gulls.name) G.achieve('pecked');
    } else {
      G.achieve(end);
    }
    if (home) {
      if (S.day <= FAIR_WINDS_DAYS) G.achieve('fairWinds');
      if (S.flags.fireLit && !S.flags.fireOut) G.achieve('flame');
      if (S.items.parcel) G.achieve('parcel');
      if (S.items.locket && S.flags.buried) G.achieve('widow');
      if (S.items.idol) G.achieve('idolKept');
    }
    if (end === 'stay' && S.flags.ally) G.achieve('greybeards');
    const found = G.records().found;
    if (Object.keys(G.ENDINGS).every((id) => found[id])) G.achieve('endings');
  };

  /* ---------------- announcing ---------------- */

  /** How long each card stays on screen, and the most that may wait before the rest are summed up. */
  const SHOW_FOR = 5000;
  const MOST_WAITING = 3;

  /** Achievements waiting to be announced, and whether a card is on screen. */
  const waiting = [];
  let showing = false;

  /** Queues a card announcing achievement `a`. */
  function announce(a) {
    waiting.push(a);
    if (!showing) showNext();
  }

  /** Shows the next card, summing up the rest in one if too many are waiting. */
  function showNext() {
    const box = $('#toasts');
    if (!waiting.length) {
      showing = false;
      return;
    }
    showing = true;
    let card;
    if (waiting.length > MOST_WAITING) {
      const n = waiting.length;
      waiting.length = 0;
      card = el('div', 'toast', `<span class="kind">Achievements</span><b>${n} achievements earned</b><span class="desc">See the list for them all.</span>`);
    } else {
      const a = waiting.shift();
      card = el('div', 'toast', `<span class="kind">${KINDS[a.kind][1]}</span><b>${a.name}</b><span class="desc">${a.desc}</span>`);
    }
    AU.sfx('honour');
    box.appendChild(card);
    setTimeout(() => {
      card.classList.add('leaving');
      setTimeout(() => {
        card.remove();
        showNext();
      }, 400);
    }, SHOW_FOR);
  }

  /* ---------------- the list ---------------- */

  /** One achievement in the list: its name and what earns it, or a hidden secret. */
  function line(a, got) {
    if (a.kind === 'secret' && !got[a.id]) return '<p class="deed">? ? ?</p>';
    return `<p class="deed${got[a.id] ? ' got' : ''}"><b class="sc">${a.name}.</b> ${a.desc}</p>`;
  }

  /** Opens the list of every achievement, by kind, with those earned marked. */
  G.openAchievements = function () {
    AU.sfx('page');
    const got = record().got;
    const total = LIST.filter((a) => got[a.id]).length;
    const text = [`<p class="endings">${total} of ${LIST.length} earned in this browser.</p>`];
    Object.keys(KINDS).forEach((kind) => {
      const all = LIST.filter((a) => a.kind === kind);
      const n = all.filter((a) => got[a.id]).length;
      text.push(`<p class="dateline">${KINDS[kind][0]}: ${n} of ${all.length}</p>`);
      all.forEach((a) => text.push(line(a, got)));
    });
    G.modal({ art: window.DW.art.scene('bottle'), title: 'Achievements', text, choices: [G.leave('back')] });
  };
})();
