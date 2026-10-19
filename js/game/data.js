/* Driftwood — game data.
 * Constants, names and the fixed prose of the tale. Tables whose entries
 * depend on the game state (actions, recipes, places) live beside the code
 * that uses them. */
(function () {
  'use strict';

  const G = window.DW.game;

  G.SAVE_KEY = 'driftwood-save-v1';

  /** Where the last castaway to die on the island is remembered, for the next to find. */
  G.REMAINS_KEY = 'driftwood-remains-v1';

  /** Where the ship's log of every tale told is kept. */
  G.RECORDS_KEY = 'driftwood-records-v1';

  /** Where the achievements earned in this browser are kept. */
  G.ACHIEVEMENTS_KEY = 'driftwood-achievements-v1';

  /** Length of a day, in clock ticks (seconds). */
  G.DAY_LEN = 120;

  /** The tick at which night falls. */
  G.NIGHT_AT = 84;

  /**
   * The tide: two in a day, each low for half its length, and coming in a
   * little later each day, as tides do.
   */
  G.TIDE_LEN = 60;
  G.TIDE_LATER = 8;

  /** Ticks before an untended fire burns down a level. */
  G.FIRE_DECAY = 40;

  /** Most entries kept in the log. */
  G.LOG_MAX = 25;

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

  /**
   * What Hollis can be set to do, once he has joined you: [button label,
   * what he is doing (shown in the camp list), the line logged on setting
   * him to it]. He gathers until told otherwise.
   */
  G.HOLLIS_JOBS = {
    gather: ['gather wood', 'gathering wood', 'Hollis goes off into the palms with a rope over his shoulder, after wood and fibre.'],
    fish: ['fish the reef', 'fishing the reef', 'Hollis takes his spear down to the reef. He fishes like a heron: still, and then very fast.'],
    watch: ['keep watch', 'keeping watch', 'Hollis sits down by the stores with his spear across his knees, and feeds the fire, and watches.'],
  };

  /** What Jem can be set to do: [button label, what he is doing, the line logged on setting him to it]. */
  G.JEM_JOBS = {
    gather: ['gather wood', 'gathering wood', 'Jem goes along the tide line after wood, keeping well clear of Hollis.'],
    fish: ['fish the shallows', 'fishing', 'Jem takes a line down to the rocks. He fishes like a Bristol boy, patient and cursing.'],
  };

  /**
   * Ailments that linger: [name in the condition panel, how many dawns
   * they last, the line logged when they pass]. A turned ankle keeps you
   * out of the palms and makes every trip thirstier; a fever stops you
   * healing, doubles your thirst, and may do worse.
   */
  G.AILMENTS = {
    ankle: ['a turned ankle', 2, 'Your ankle will bear your weight again.'],
    fever: ['a fever', 3, 'The fever breaks in the night. You wake weak, clear-headed, and ravenous.'],
  };

  /** Where the camp sits on the chart. */
  G.CAMP_POS = [310, 258];

  /** Supplies needed to put to sea on the finished raft. */
  G.LAUNCH_COST = { water: 16, food: 16 };

  /**
   * Mending the old outrigger canoe at the lagoon, in order: each part has
   * a label, a cost, and the line logged once it is done.
   */
  G.CANOE = [
    { id: 'hull', label: 'pay the hull with gum', cost: { gum: 4, timber: 4 }, msg: 'You scrape the old hull clean, patch the split strakes, and pay every seam with gum. She will float.' },
    { id: 'booms', label: 'lash new booms', cost: { timber: 6, rope: 8 }, msg: 'You shape new booms with the axe and lash the outrigger float to them, the way the old lashings went.' },
    { id: 'sail', label: 'rig a sail', cost: { cloth: 4, rope: 4 }, msg: 'A mast, a yard, and a crab-claw sail of sailcloth. She looks like what she is: a boat that was made to go somewhere.' },
  ];

  /** Supplies needed to put to sea in the mended canoe: less than the raft can carry, and less than is wise. */
  G.CANOE_LAUNCH = { water: 8, food: 8 };

  /**
   * The day the trade winds turn. Only then, as Hale wrote, do ships pass
   * close enough to the north headland to see a fire on the summit.
   */
  G.TRADE_WINDS_DAY = 12;

  /** The chapters of the tale, by number. */
  G.CHAPTERS = { 1: 'The Island', 2: 'The Archipelago' };

  /**
   * The winds of the second chapter: [name in the clock, the line logged
   * when it sets in]. A crude raft can only run before the wind, so the
   * trades carry it west and only a westerly brings it back.
   */
  G.WINDS = {
    trades: ['the trades', 'The wind is back in the south-east: the trades, steady and warm, blowing away from home.'],
    westerly: ['a westerly', 'The wind has backed into the west in the night: a soft, gusty wind, blowing east. It will not last.'],
    calm: ['a flat calm', 'There is no wind at all. The sea lies flat as oil under a white sky.'],
  };

  /** Patching the boat the reef broke, in order: like the raft, each part may need another first. */
  G.PATCH = [
    { id: 'lash', label: 're-lash the hull', cost: { wood: 8, rope: 4 }, note: 'what the reef left of her', msg: 'You drag the wreck up the sand and lash her together again with fresh rope, and stuff the gaps with weed. She is uglier than she was. She floats.' },
    { id: 'mast', label: 'step a jury mast', cost: { wood: 8, rope: 2 }, needs: 'lash', note: 'a spar from the tide line', msg: 'The straightest spar on the islet, stepped and stayed. It will carry a sail if you do not ask too much of it.' },
    { id: 'sail', label: 'patch the sail', cost: { cloth: 3, fibre: 4 }, needs: 'mast', note: 'canvas eked out with woven fibre', msg: 'Rags of canvas stitched to a mat of woven fibre. It is more hole than sail, but it will catch a wind.' },
  ];

  /**
   * Fitting out the patched boat at home, for passages she could not make
   * as she is: crossing the wind, longer than two days, or in foul weather.
   */
  G.UPGRADES = [
    { id: 'leeboards', label: 'hang leeboards', cost: { timber: 6, rope: 4, iron: 2 }, note: 'so she will sail across the wind', msg: 'Two broad boards on iron pins, one over each side, to be let down into the sea. With one down she will hold a course across the wind, crabwise and complaining, but she will hold it.' },
    { id: 'casks', label: 'build water casks', cost: { timber: 5, iron: 6 }, note: 'water for passages of more than two days', msg: 'Two casks again, tight enough, lashed down amidships. You can go further now.' },
    { id: 'outrigger', label: 'rig an outrigger', cost: { timber: 8, rope: 6, gum: 2 }, note: 'so she will not roll so easily in a blow', msg: 'A float on two booms, the way the old canoe had it. She sits up in the water now like a duck, and a squall that would have rolled her only shoves.' },
  ];

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
    jem: {
      name: 'Jem Rudd', art: 'jem', hp: 9, dmg: 1, hit: 0.6,
      verbs: ['claws at your face', 'gets his teeth into your arm', 'cuts at you with a broken knife'],
      tell: 'He backs against a rock, the broken knife held low, gathering himself.',
      heavy: 'flies at you with the knife',
      intro: 'He comes up off the ground with a broken knife in his fist, and his eyes are white all round.',
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

  /** The ways a tale can end well, or at least end: [title, a line for the ship's log]. */
  G.ENDINGS = {
    rescue: ['Rescue', 'taken off by the whaler <i>Perseverance</i>'],
    landfall: ['Landfall', 'sailed the raft to the Society Islands'],
    pitcairn: ["Pitcairn's Island", "paddled the old canoe to Pitcairn's Island"],
    stay: ['The Island', 'stayed, and made the island home'],
  };

  /** Endings no longer in the tale, as old tales in the ship's log still name them. */
  G.RETIRED_ENDINGS = {
    articles: 'signed on with the mutineers',
  };

  /** How each way of dying that isn't a creature reads in the ship's log. */
  G.DEATH_NOTES = {
    thirst: 'died of hunger and thirst',
    cold: 'died of the cold',
    fall: 'died of a fall',
    fever: 'died of a fever',
    storm: 'lost in a storm',
  };

  /** Epitaphs for each way of dying that isn't a creature. */
  G.DEATHS = {
    thirst: 'Thirst and hunger did what the mutineers would not. Your bones whiten above the tide line beside a fire long gone out.',
    cold: 'The night was long, and cold, and in the end it was enough.',
    fall: 'A fall. Such a small thing, after all the sea had done.',
    fever: 'The fever burned for three days, and on the fourth you did not wake.',
    storm: 'The storm took the raft, and you with it. The sea keeps what it is given.',
  };
})();
