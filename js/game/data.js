/* Driftwood — game data.
 * Constants, names and the fixed prose of the tale. Tables whose entries
 * depend on the game state (actions, recipes, places) live beside the code
 * that uses them. */
(function () {
  'use strict';

  const G = window.DW.game;

  G.SAVE_KEY = 'driftwood-save-v1';

  /** Length of a day, in clock ticks (seconds). */
  G.DAY_LEN = 120;

  /** The tick at which night falls. */
  G.NIGHT_AT = 84;

  /** Ticks before an untended fire burns down a level. */
  G.FIRE_DECAY = 40;

  /** Most entries kept in the log. */
  G.LOG_MAX = 50;

  /** The fire's description at each level, 0–4. */
  G.FIRE_NAMES = ['cold', 'smouldering', 'flickering', 'burning', 'roaring'];

  /** Display names of the resources. */
  G.RES = {
    water: 'fresh water',
    food: 'provisions',
    wood: 'driftwood',
    fibre: 'palm fibre',
    rope: 'rope',
    stone: 'stone',
    timber: 'timber',
    cloth: 'sailcloth',
    iron: 'iron nails',
    hide: 'boar hide',
    gum: 'tree gum',
    torch: 'torch',
    shot: 'powder & shot',
  };

  /** The order resources are listed in the stores. */
  G.RES_ORDER = ['water', 'food', 'wood', 'fibre', 'rope', 'stone', 'timber', 'cloth', 'iron', 'hide', 'gum', 'torch', 'shot'];

  /** Possessions: [name, note shown beside it]. */
  G.ITEMS = {
    pistol: ['flintlock pistol', 'one shot, one choice'],
    bible: ["the ship's Bible", 'the Authorised Version'],
    map: ['a makeshift map', 'drawn on its flyleaf'],
    knife: ['stone knife', ''],
    spear: ['fishing spear', ''],
    axe: ['stone axe', ''],
    cutlass: ['cutlass', 'from the Calliope'],
    waterskin: ['waterskin', ''],
    journal: ["Hale's journal", ''],
    crusoe: ['Robinson Crusoe', 'of York, Mariner'],
    bristow: ['Bristow', 'a good listener'],
    parcel: ['a sealed parcel', 'for Valparaíso'],
    locket: ["Hale's locket", 'J.H. from M.H.'],
    idol: ['a carved figure', 'it is watching you'],
    dollar: ['a Spanish dollar', 'of no use at all'],
  };

  /** Where the camp sits on the chart. */
  G.CAMP_POS = [310, 258];

  /** Supplies needed to put to sea on the finished raft. */
  G.LAUNCH_COST = { water: 16, food: 16 };

  /**
   * The day the trade winds turn. Only then, as Hale wrote, do ships pass
   * close enough to the north headland to see a fire on the summit.
   */
  G.TRADE_WINDS_DAY = 12;

  /**
   * The island's creatures: hp, damage per hit, chance to hit, the verbs
   * of their attacks, the `tell` that warns of a heavy blow and the `heavy`
   * blow itself, an introduction, an optional sound effect when the fight
   * begins, and optional `miss` and `dead` lines for foes that are not one
   * creature.
   */
  G.FOES = {
    crab: {
      name: 'the land crab', art: 'crab', hp: 9, dmg: 1, hit: 0.7,
      verbs: ['clamps a claw on your leg', 'nips your hand to the bone'],
      tell: 'The crab rears up on its back legs, both claws spread wide.',
      heavy: 'brings both claws down on you',
      intro: 'It rears up on its legs, claws wide, big as a dinner plate and twice as hard.',
    },
    boar: {
      name: 'the boar', art: 'boar', hp: 14, dmg: 2, hit: 0.6,
      verbs: ['gores your thigh', 'slams into you', 'rakes you with a tusk'],
      tell: 'The boar backs off a pace, pawing the ground, and drops its tusks.',
      heavy: 'charges, and throws you off your feet',
      intro: 'A grunt, a crash of undergrowth, and a boar bursts onto the path, tusked and furious.',
      sound: 'growl',
    },
    viper: {
      name: 'the viper', art: 'viper', hp: 6, dmg: 2, hit: 0.55,
      verbs: ['strikes', 'sinks its fangs into your wrist'],
      tell: 'The viper draws its head back into a tight, trembling S.',
      heavy: 'strikes like a whip',
      intro: 'Something on the warm stones uncoils, and lifts its flat head.',
      sound: 'hiss',
    },
    hollis: {
      name: 'the wild man', art: 'hollis', hp: 18, dmg: 2, hit: 0.65,
      verbs: ['jabs with his spear', 'screams and lunges', 'catches you with the spear-butt'],
      tell: 'He crouches low, spear drawn back, to throw his whole weight behind it.',
      heavy: 'drives the spear in with all his weight',
      intro: 'He howls, and comes at you with the spear.',
    },
    shark: {
      name: 'the shark', art: 'shark', hp: 20, dmg: 2, hit: 0.6,
      verbs: ['tears at the logs, and at you', 'lunges from the water'],
      tell: 'The shark swings away in a wide circle, then turns straight for the raft.',
      heavy: 'heaves itself half onto the logs and bites',
      intro: 'It rises. Its jaws close on the logs at your feet.',
    },
    reefshark: {
      name: 'the reef shark', art: 'shark', hp: 10, dmg: 2, hit: 0.55,
      verbs: ['snaps at your legs', 'tears your calf'],
      tell: 'The fin turns, and comes straight at you through the shallows.',
      heavy: 'hits you like a log in a flood',
      intro: 'A fin cuts the shallows between you and the shore.',
    },
    gulls: {
      name: 'the gulls', art: 'gulls', hp: 8, dmg: 1, hit: 0.7,
      verbs: ['peck at your face', 'beat about your head', 'rake your hands'],
      tell: 'The whole flock rises at once, screaming, and wheels to come at you together.',
      heavy: 'come down on you all at once',
      intro: 'A screaming cloud of gulls descends on your stores, and will not be driven off.',
      miss: 'The gulls wheel away, screaming.',
      dead: 'The last of the gulls flaps away over the sea, and the beach is yours again.',
    },
  };

  /* ---------------- prose ---------------- */

  /** The opening, shown one paragraph at a time. */
  G.INTRO = [
    '<p class="dateline">The South Pacific. The Year of Our Lord 1846.</p>',
    'You were bosun\'s mate aboard the barque <i>Meridian</i>, eleven months out of Bristol, carrying iron for Valparaíso and a captain whose temper was harder than his cargo.',
    'When the crew rose against Captain Ashby, you would not stand with them. Nor would you stand against them. Mr Crane, the first mate, said that a man who would choose no side might have an island all to himself.',
    'They rowed you ashore at first light, as the old custom demands: a flintlock with a single shot, a flask of water, a tin of ship\'s biscuit — and the Bible, so that you might make your peace.',
    'The <i>Meridian</i>\'s sails grow small against the sun. Behind you the island waits, green and silent. The tide is coming in.',
  ];

  /** Verses read by firelight. */
  G.VERSES = [
    'They that go down to the sea in ships, that do business in great waters; these see the works of the LORD, and his wonders in the deep.',
    'The waters compassed me about, even to the soul: the depth closed me round about, the weeds were wrapped about my head.',
    'If I take the wings of the morning, and dwell in the uttermost parts of the sea; even there shall thy hand lead me.',
    'The LORD on high is mightier than the noise of many waters, yea, than the mighty waves of the sea.',
    'And so it came to pass, that they escaped all safe to land.',
    'He maketh the storm a calm, so that the waves thereof are still.',
  ];

  /** Lines from Robinson Crusoe (1719), read by firelight once the book has washed up. */
  G.CRUSOE = [
    'It is never too late to be wise.',
    'Thus fear of danger is ten thousand times more terrifying than danger itself.',
    'I learned to look more upon the bright side of my condition, and less upon the dark side.',
    'All our discontents about what we want appeared to me to spring from the want of thankfulness for what we have.',
  ];

  /** One of these follows "Day N." each dawn. */
  G.DAWNS = [
    'Grey light over grey water.',
    'The gulls wake before you.',
    'You cut another notch in the palm by the fire.',
    'Dawn, and the same empty horizon.',
    'The tide is out. The sand is cold.',
    'A pink sky. Sailors would call it a warning.',
  ];

  /** One of these marks each nightfall. */
  G.NIGHTFALLS = [
    'Night falls quickly in these latitudes.',
    'The sun drops into the sea. Darkness.',
    'Night. The stars are strange here.',
  ];

  /** Epitaphs for each way of dying that isn't a creature. */
  G.DEATHS = {
    thirst: 'Thirst and hunger did what the mutineers would not. Your bones whiten above the tide line beside a fire long gone out.',
    cold: 'The night was long, and cold, and in the end it was enough.',
    fall: 'A fall. Such a small thing, after all the sea had done.',
    fever: 'The fever burned for three days, and on the fourth you did not wake.',
    storm: 'The storm took the raft, and you with it. The sea keeps what it is given.',
  };
})();
