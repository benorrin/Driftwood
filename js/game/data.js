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
    torch: 'torches',
    shot: 'powder & shot',
  };

  /** The order resources are listed in the stores. */
  G.RES_ORDER = ['water', 'food', 'wood', 'fibre', 'rope', 'stone', 'timber', 'cloth', 'iron', 'hide', 'torch', 'shot'];

  /** Possessions: [name, note shown beside it]. */
  G.ITEMS = {
    pistol: ['flintlock pistol', 'one ball, one choice'],
    bible: ["the ship's Bible", 'a chart inside its cover'],
    knife: ['stone knife', ''],
    spear: ['fishing spear', ''],
    axe: ['stone axe', ''],
    cutlass: ['cutlass', 'from the Calliope'],
    waterskin: ['waterskin', ''],
    journal: ["Hale's journal", ''],
  };

  /** Where the camp sits on the chart. */
  G.CAMP_POS = [310, 258];

  /** Supplies needed to put to sea on the finished raft. */
  G.LAUNCH_COST = { water: 12, food: 12 };

  /**
   * The island's creatures: hp, damage per hit, seconds between attacks,
   * chance to hit, the verbs of their attacks, an introduction, and an
   * optional sound effect when the fight begins.
   */
  G.FOES = {
    crab: {
      name: 'the land crab', art: 'crab', hp: 7, dmg: 1, speed: 2.4, hit: 0.7,
      verbs: ['clamps a claw on your leg', 'nips your hand to the bone'],
      intro: 'It rears up on its legs, claws wide, big as a dinner plate and twice as hard.',
    },
    boar: {
      name: 'the boar', art: 'boar', hp: 12, dmg: 2, speed: 2.2, hit: 0.65,
      verbs: ['gores your thigh', 'slams into you', 'rakes you with a tusk'],
      intro: 'A grunt, a crash of undergrowth, and a boar bursts onto the path, tusked and furious.',
      sound: 'growl',
    },
    viper: {
      name: 'the viper', art: 'viper', hp: 4, dmg: 3, speed: 3, hit: 0.5,
      verbs: ['strikes', 'sinks its fangs into your wrist'],
      intro: 'Something on the warm stones uncoils, and lifts its flat head.',
      sound: 'hiss',
    },
    hollis: {
      name: 'the wild man', art: 'hollis', hp: 15, dmg: 2, speed: 2, hit: 0.7,
      verbs: ['jabs with his spear', 'screams and lunges', 'catches you with the spear-butt'],
      intro: 'He howls, and comes at you with the spear.',
    },
    shark: {
      name: 'the shark', art: 'shark', hp: 14, dmg: 3, speed: 2.6, hit: 0.6,
      verbs: ['tears at the logs, and at you', 'lunges from the water'],
      intro: 'It rises. Its jaws close on the logs at your feet.',
    },
  };

  /* ---------------- prose ---------------- */

  /** The opening, shown one paragraph at a time. */
  G.INTRO = [
    '<p class="dateline">The South Pacific. The Year of Our Lord 1846.</p>',
    'You were bosun\'s mate aboard the barque <i>Meridian</i>, eleven months out of Bristol, carrying iron for Valparaíso and a captain whose temper was harder than his cargo.',
    'When the crew rose against Captain Ashby, you would not stand with them. Nor would you stand against them. Mr Crane, the first mate, said that a man who would choose no side might have an island all to himself.',
    'They rowed you ashore at first light, as the old custom demands: a flintlock with a single ball, a flask of water, a tin of ship\'s biscuit — and the Bible, so that you might make your peace.',
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
    fall: 'A fall from a palm. Such a small thing, after all the sea had done.',
    storm: 'The storm took the raft, and you with it. The sea keeps what it is given.',
  };
})();
