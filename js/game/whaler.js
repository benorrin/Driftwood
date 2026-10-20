/* Driftwood — the whaler.
 * The third chapter's loop, aboard the Perseverance on her passage to
 * Valparaíso: the watches, the work of the ship and the castaway's
 * standing with the hands who do it, the ship's allowance and the scurvy,
 * the lay of the oil, the wind and the miles, and the boats lowered for
 * whales. The chapter begins here, from the castaway kept at the end of
 * the second; its story (the statement, the gam, Juan Fernández, the
 * gale, the landfall) is in `passage.js`. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, rand, chance, pick, cap, quote, gainLine,
    add, gain, log, heal, damage, isNight, modal, queueModal, leave, closeModal,
  } = G;

  /** The passage from the Island of Fires to Valparaíso, in miles. */
  const PASSAGE = 2400;

  /** How far short of Valparaíso Juan Fernández lies, in miles. */
  G.JUAN_AT = 360;

  /** Whether the castaway is aboard the Perseverance, in the third chapter. */
  G.aboard = () => S.isle === 'ship';

  /** Days since the Perseverance sailed from the islands. */
  G.daysOut = () => S.day - S.ship.sailed;

  /* ---------------- coming aboard ---------------- */

  /** Possessions left behind on the islands with the boat: the island tools, and the map of an island far astern. */
  const LEFT_BEHIND = ['map', 'knife', 'spear', 'axe', 'waterskin'];

  /**
   * The castaway kept at the end of the second chapter (`carry`), as they
   * come aboard the Perseverance: who sailed with them, what came aboard
   * with them, and the ship's own reckoning of the passage to come.
   */
  G.whalerState = function (carry) {
    const s = JSON.parse(JSON.stringify(carry));
    const withTupa = !!s.flags.metSwain;
    s.ship = {
      miles: PASSAGE, total: PASSAGE, sailed: s.day, wind: 'fair', noons: [], marks: [],
      standing: withTupa ? 4 : 3, scurvy: 0, allowance: 'full', lay: 0, barrels: 0,
      trying: 0, hunts: 0, lastHunt: 0, worked: 0, rested: 0, watchAt: null, idolLuck: 0,
      // Tupa signed on at the Island of Fires; Hollis came if he would; Jem if he was asked, or was at the camp when she was hailed
      tupa: withTupa,
      hollis: !!s.flags.ally && !s.flags.hollisStayed && !s.flags.killedHollis,
      jem: !!(s.flags.jemSails || (!withTupa && s.flags.jem && !s.flags.jemStayed)),
    };
    // what came aboard: provisions for your own mess, and fruit from the islands against the scurvy
    s.res = { food: Math.min(s.res.food || 0, 10), fruit: withTupa ? 8 : 5 };
    s.seen = { food: 1, fruit: 1 };
    LEFT_BEHIND.forEach((k) => delete s.items[k]);
    // Captain Swain keeps the pistol in his cabin until Valparaíso
    if (s.items.pistol) s.flags.pistolSwain = 1;
    delete s.items.pistol;
    Object.assign(s, {
      chapter: 3, isle: 'ship', t: 15, fire: 0, fireT: 0, wind: null, camp: null, boat: {}, built: {},
      ail: {}, log: [], ended: false, health: Math.max(6, Math.min(10, s.health)),
    });
    s.flags.hollisHome = 0;
    s.flags.sailing = 0;
    s.memories = s.memories || {};
    return s;
  };

  /* ---------------- standing with the hands ---------------- */

  /** How the hands think of the castaway, by standing (0–10): the least standing for each word. */
  const STANDING = [[0, 'a Jonah'], [2, 'a stranger'], [4, 'a shipmate'], [6, 'well liked'], [8, 'one of them']];

  /** What the hands think of the castaway, in a word or two. */
  G.standingName = () => STANDING.filter(([n]) => S.ship.standing >= n).pop()[1];

  /** Raises (or lowers) the castaway's standing with the hands by `n`, logging `why` if given. */
  G.regard = function (n, why, cls) {
    S.ship.standing = Math.max(0, Math.min(10, Math.round((S.ship.standing + n) * 10) / 10));
    if (why) log(why, cls);
  };

  /** The most a watch's routine work can raise the castaway's standing: the hands notice a man who works, but only so much. */
  const WORK_MOST = 0.1;

  /** Deck work done this watch, worth `n` standing up to WORK_MOST a watch. */
  function work(n) {
    S.ship.worked = 1;
    const room = Math.max(0, WORK_MOST - (S.ship.watchGain || 0));
    const got = Math.min(n, room);
    S.ship.watchGain = (S.ship.watchGain || 0) + got;
    if (got) G.regard(got);
  }

  /* ---------------- the watches ---------------- */

  /**
   * The ship's day by the clock, in watches: [first tick, name, whether the
   * castaway's watch is on deck]. A day begins at five in the morning; the
   * castaway is in the mate's watch, on deck and below by turns.
   */
  const WATCHES = [
    [0, 'the morning watch', false],
    [15, 'the forenoon watch', true],
    [35, 'the afternoon watch', false],
    [55, 'the dog watches', true],
    [75, 'the first watch', false],
    [95, 'the middle watch', true],
    [115, 'the morning watch', false],
  ];

  /** The watch now being kept. */
  const watchNow = () => WATCHES.filter(([t]) => S.t >= t).pop();

  /** The name of the watch now being kept, e.g. "the middle watch". */
  G.watchName = () => watchNow()[1];

  /** Whether the castaway's watch is on deck; while the try-works burn, all hands are. */
  G.onDeck = () => watchNow()[2] || S.ship.trying > 0;

  /**
   * Each tick aboard: when the watch changes, the bell says so, and if the
   * castaway's watch has just gone below without their doing a hand's turn,
   * the mate marks it.
   */
  G.shipTick = function () {
    const w = watchNow();
    if (S.ship.watchAt === w[0]) return;
    const was = WATCHES.find((x) => x[0] === S.ship.watchAt);
    S.ship.watchAt = w[0];
    if (was && was[2] && !S.ship.worked && !S.ship.trying) {
      G.regard(-0.3, 'Mr Coffin marks you down for idling through your watch. The hands notice it too.', 'warn');
    }
    S.ship.worked = 0;
    S.ship.watchGain = 0;
    if (!was || was[2] === w[2]) return;
    AU.sfx('bell');
    if (w[1] === 'the middle watch') log('Eight bells: midnight, and the middle watch. Your watch on deck, in the dark.');
    else if (w[2]) log(`Eight bells, and ${w[1]}. Your watch on deck.`);
    else log(`Eight bells. Your watch below, until ${WATCHES.slice(WATCHES.indexOf(w) + 1).concat(WATCHES).find((x) => x[2])[1]}.`);
  };

  /* ---------------- the wind and the miles ---------------- */

  /**
   * The winds aboard: [name, the line logged when it sets in, the least and
   * most miles she makes good in a day before it]. The gale comes only once,
   * off the coast, and is the passage's to bring.
   */
  G.SHIP_WINDS = {
    fair: ['a fair wind', 'The wind has come round fair in the night. She leans to it and goes, the water talking under her bow.', [170, 210]],
    foul: ['a head wind', 'The wind has gone into the east, dead foul. She beats against it all day, tack and tack, and makes little enough.', [50, 90]],
    calm: ['a flat calm', 'There is no wind. She lies with her sails hanging, rolling on a long swell, going nowhere.', [0, 10]],
    gale: ['a gale', 'It is blowing a gale, and rising. She runs under close-reefed topsails, and every sea that comes aboard is green.', [110, 150]],
  };

  /** How the wind may change at dawn: for each wind, the chance of each wind the next day. */
  const SHIFTS = {
    fair: { fair: 0.6, foul: 0.25, calm: 0.15 },
    foul: { fair: 0.5, foul: 0.35, calm: 0.15 },
    calm: { fair: 0.6, foul: 0.3, calm: 0.1 },
    gale: { fair: 0.7, foul: 0.3, calm: 0 },
  };

  /** The miles still to run before the passage must have had its calm. */
  const CALM_BY = 1700;

  /** Sets the wind to `w`, logging the change. */
  G.setShipWind = function (w) {
    if (S.ship.wind === w) return;
    S.ship.wind = w;
    log(G.SHIP_WINDS[w][1], 'lore');
  };

  /** At dawn the wind may shift; and once, before the passage is half run, it falls calm. */
  function shiftWind() {
    if (S.ship.wind === 'gale' && !S.ship.galeOver) return;
    const odds = SHIFTS[S.ship.wind];
    let roll = Math.random();
    let next = Object.keys(odds).find((w) => (roll -= odds[w]) < 0) || 'fair';
    if (!S.ship.calmed && S.ship.miles <= CALM_BY) next = 'calm';
    G.setShipWind(next);
    if (next === 'calm' && !S.ship.calmed) {
      S.ship.calmed = 1;
      G.calmFalls();
    }
  }

  /**
   * The day's run, pricked off on the chart at noon: what the wind gave
   * her, or a fraction of it while she lies hove to trying out.
   */
  function dayRun() {
    const [least, most] = G.SHIP_WINDS[S.ship.wind][2];
    let run = rand(least, most);
    if (S.ship.trying > 0) run = Math.round(run * 0.2);
    S.ship.miles = Math.max(0, S.ship.miles - run);
    S.ship.noons.push(S.ship.miles);
    return run;
  }

  /** Adds a mark to the chart where the ship is now, labelled `label`. */
  G.markChart = function (label) {
    S.ship.marks.push({ miles: S.ship.miles, label });
  };

  /* ---------------- the allowance and the scurvy ---------------- */

  /** Dawns without fresh food before the scurvy shows, and before it begins to do harm. */
  const SCURVY_SHOWS = 7;
  const SCURVY_HARMS = 12;

  /** How far the scurvy has gone: null, 'gums' (it shows, and the castaway cannot mend) or 'wounds' (it does harm). */
  G.scurvy = () => (S.ship.scurvy >= SCURVY_HARMS ? 'wounds' : S.ship.scurvy >= SCURVY_SHOWS ? 'gums' : null);

  /** The scurvy as the condition panel shows it. */
  G.SCURVY = { gums: 'the scurvy: soft gums', wounds: 'the scurvy: old wounds open' };

  /**
   * Breakfast aboard. The ship feeds every man, but on short allowance the
   * castaway goes hungry unless they have provisions of their own; and a
   * share of fresh fruit, while it lasts, keeps the scurvy off.
   */
  function eat() {
    let hurt = 0;
    if (S.ship.allowance === 'short') {
      if (S.res.food > 0) {
        add('food', -1);
      } else {
        hurt++;
        log('Short allowance, and nothing of your own to eke it out. You go on deck hungry.', 'warn');
      }
    }
    const was = G.scurvy();
    if (S.res.fruit > 0) {
      add('fruit', -1);
      S.ship.scurvy = Math.max(0, S.ship.scurvy - 2);
    } else {
      S.ship.scurvy++;
    }
    const now = G.scurvy();
    if (now !== was) {
      if (now === 'gums') log('Your gums are soft and bleed when you eat, and a bruise on your arm will not fade. The scurvy. You need fresh food.', 'warn');
      else if (now === 'wounds') log('An old scar on your hand, years healed, has opened in the night. The scurvy has you.', 'warn');
      else if (!now) log('The fruit has done its work. Your gums are firm again.');
    }
    if (now === 'wounds') hurt++;
    return hurt;
  }

  /** One of these follows "Day N." each dawn aboard. */
  const DAWNS = [
    'The decks are washed down at first light, and holystoned, and washed again.',
    'Grey light, and the cook\'s smoke going away to leeward.',
    'Dawn, and the mate on the quarterdeck, looking at the sky as if it owed him money.',
    'The lookouts go up to the mastheads with the sun.',
    'A long swell out of the south-west. She lifts to it like a horse.',
  ];

  /** One of these marks each nightfall aboard. */
  const NIGHTFALLS = [
    'The sun goes down astern. The lamp is lit in the binnacle.',
    'Night. Somebody in the fo\'c\'sle is playing a fiddle, badly, and then stops.',
    'Dark, and the creak of her, and the wake glowing green astern.',
  ];

  /**
   * Daybreak aboard: breakfast (and the scurvy), mending for a castaway who
   * slept, the wind, the day's run on the chart, the try-works, and
   * whatever the passage brings.
   */
  G.shipDawn = function () {
    AU.sfx('bell');
    log(`Day ${S.day}`, 'day');
    log(pick(DAWNS));
    const hurt = eat();
    if (hurt) damage(hurt, G.scurvy() === 'wounds' ? 'scurvy' : 'hunger');
    else if (S.ship.rested && !G.scurvy()) heal(1);
    if (S.ended) return;
    S.ship.rested = 0;
    G.mend();
    const run = dayRun();
    if (run) log(`At noon Mr Coffin pricks off the ship's position: ${run} miles made good. ${S.ship.miles} to run to Valparaíso.`);
    if (S.ship.trying > 0 && --S.ship.trying === 0) {
      log('The last of the oil is stowed down. The try-works are cooled, the decks scrubbed white with the ashes, and she makes sail again.');
    }
    shiftWind();
    if (S.items.idol && chance(IDOL_LUCK)) idolMishap();
    G.passageDawn();
  };

  /** Nightfall aboard: no fire to keep, and no cold to fear. */
  G.shipNight = function () {
    log(pick(NIGHTFALLS));
  };

  /* ---------------- the lay ---------------- */

  /**
   * What each barrel of oil taken is worth to the castaway, in cents: a
   * hundred-and-fiftieth lay, a seaman's share, of sperm oil at near a
   * dollar a gallon, thirty-one and a half gallons to the barrel.
   */
  const LAY_CENTS = 19;

  /** How far the slop chest will let a man run into debt against his lay, in cents. */
  const LAY_DEBT = 200;

  /** A sum in cents as dollars, e.g. "$4.30", or "−$1.50" for a debt to the ship. */
  G.money = (c) => `${c < 0 ? '−' : ''}$${(Math.abs(c) / 100).toFixed(2)}`;

  /** Oil taken: `barrels` stowed down, and the castaway's lay of it. Returns the lay, as money. */
  function takeOil(barrels) {
    S.ship.barrels += barrels;
    S.ship.lay += barrels * LAY_CENTS;
    return G.money(barrels * LAY_CENTS);
  }

  /* ---------------- the boats ---------------- */

  /** The most whales the Perseverance will lower for on this passage, and the dawns between. */
  const HUNTS = 3;
  const HUNT_EVERY = 2;

  /** Whether whales might be raised and the boats lowered for them just now. */
  G.canHunt = () => S.ship.hunts < HUNTS && !S.ship.trying && S.day - S.ship.lastHunt >= HUNT_EVERY &&
    S.ship.wind !== 'gale' && S.ship.miles > G.JUAN_AT && !isNight() && !S.ship.blowing;

  /** Who stands in the bow of the mate's boat with the iron. */
  const harpooner = () => (S.ship.tupa ? 'Tupa' : 'Amos, the Gay Head boatsteerer');

  /** Whales raised from the masthead: man the boat, or keep the ship. */
  G.blows = function () {
    S.ship.blowing = 1;
    AU.sfx('sail');
    queueModal({
      art: ART.scene('hunt'),
      title: 'There She Blows',
      text: [
        'From the masthead, the long cry every man aboard has been waiting for: "Blo-o-ows! There she blo-o-ows!"',
        'A mile to leeward, low bushy spouts, leaning forward, one after another: sperm whales, a pod of them, lazy in the sun. The deck goes mad. Mr Coffin is roaring for his boat\'s crew, and the boats are swung out, and the tubs of line lowered into them.',
        S.ship.tupa ? 'Tupa is already in the bow of the mate\'s boat, sitting on the gunwale, very still, looking at the whales.' : 'Amos, the mate\'s boatsteerer, a Gay Head man who has been whaling since he was twelve, is already in the bow.',
      ],
      choices: [
        { label: 'man the boat', fn: lower },
        { label: 'keep ship', fn: keepShip },
      ],
    });
  };

  /** Ends the hunt, whatever came of it. */
  function huntOver() {
    S.ship.blowing = 0;
    S.ship.hunts++;
    S.ship.lastHunt = S.day;
  }

  /** The boats go without the castaway, who stays aboard with the shipkeepers. */
  function keepShip() {
    huntOver();
    G.regard(-0.3);
    const got = chance(0.45) ? rand(25, 60) : 0;
    const text = ['You stay aboard with the cook and the cooper and the boy, and watch the boats go away over the swell, and the hands left in them do not look back at you.'];
    if (got) {
      S.ship.trying = 2;
      text.push('Toward evening they come back towing a whale, and the cooper says nothing to you all through the cutting-in, which is a way of saying something.', gainLine(`${got} barrels of oil. Your lay of it: ${takeOil(got)}.`));
    } else {
      text.push('Toward evening they come back with nothing but blistered hands. The whale sounded and was not seen again.');
    }
    modal({ art: ART.scene('hunt'), title: 'Shipkeeping', text, choices: [leave('go on', got ? 'The boats took a whale without you.' : 'The boats came back empty.')] });
  }

  /** In the mate's boat: the long pull, the iron, and the whale running. */
  function lower() {
    const text = [
      `You go down into Mr Coffin's boat and take the after oar. ${harpooner()} sits in the bow; the mate stands at the steering oar, talking to his crew in a low steady voice that never stops: "Pull, my lads. Softly now. Pull."`,
      'For an hour you pull, until your back is fire and your hands are raw, and you see nothing but the man in front of you. Then the mate\'s voice drops to a whisper. "Stand up," he says, "and give it to him."',
      `${harpooner()} stands, and the iron goes in, and the second after it, and the whole sea goes white. "Stern all!" The boat comes alive under you, and the line smokes out of the tub and round the loggerhead, and you are being towed across the ocean at a speed nobody would believe.`,
      'Then the line goes slack. He has sounded. Somewhere under you, a whale the length of the ship is coming back up.',
    ];
    if (S.ship.hollis) text.push('Far astern, at the ship\'s rail, you can see Hollis watching.');
    modal({
      art: ART.scene('hunt'),
      title: 'A Nantucket Sleigh Ride',
      text,
      choices: [
        { label: 'haul up for the lance', fn: () => strike(true) },
        { label: 'lie off and wait', fn: () => strike(false) },
      ],
    });
  }

  /**
   * How the hunt ends: the whale killed, the boat stove, or the line cut.
   * Hauling up close (`bold`) kills more often, and stoves more boats. The
   * carved figure, if the castaway carries it, is no help.
   */
  function strike(bold) {
    huntOver();
    G.achieve('sleighRide');
    const idol = S.items.idol ? 0.15 : 0;
    const stove = (bold ? 0.18 : 0.06) + idol / 2;
    const kill = (bold ? 0.6 : 0.45) + (S.ship.tupa ? 0.1 : 0) - idol;
    const roll = Math.random();
    if (roll < stove) {
      G.regard(0.6);
      damage(2, 'whale');
      if (S.ended) return;
      modal({
        art: ART.scene('hunt'),
        title: 'Stove',
        text: [
          'He comes up under the boat. There is a noise like a house falling down, and then you are in the sea, among planks and oars and tubs, with the line snaking round you and somebody shouting your name.',
          'The other boats pick you up. The whale goes away to windward, with two irons in him and the mate\'s boat in pieces, and is not seen again.',
          gainLine('You lose 2 health. The hands saw you keep your head in the water, and do not forget it.'),
        ],
        choices: [leave('go on', 'The whale stove the mate\'s boat, and you with it.', 'warn')],
      });
      return;
    }
    if (roll < stove + kill) {
      const barrels = rand(30, 70);
      const lay = takeOil(barrels);
      S.ship.trying = 2;
      G.regard(bold ? 1 : 0.6);
      G.achieve('greasy');
      modal({
        art: ART.scene('hunt'),
        title: 'Fin Out',
        text: [
          bold
            ? 'He comes up a cable\'s length off, and the mate has you haul up on the line, hand over hand, right in under the hump, and drives the lance in and churns it there, and the spout goes red.'
            : 'He comes up half a mile off, and runs, and tires, and at last the mate has you haul up, and the lance goes in, and the spout goes red.',
          'He dies the way they do, swimming in a great circle, and then he rolls fin out, and the sea is very quiet.',
          'You tow him back to the ship by the flukes, which takes the rest of the day. Then the cutting-in begins, and the try-works are lit, and they burn all night and the next day and the next, and the ship sails through her own black smoke. The cook fries doughnuts in the boiling oil. You have never tasted anything so good.',
          gainLine(`${barrels} barrels of oil. Your lay of it: ${lay}.`),
        ],
        choices: [leave('go on', `The boats took a whale: ${barrels} barrels. The try-works are lit.`, 'lore')],
      });
      return;
    }
    G.regard(0.3);
    modal({
      art: ART.scene('hunt'),
      title: 'Cut',
      text: [
        'He comes up a mile off and goes away to windward like a train of cars, and the line runs out to the last fathom, and the mate looks at it a long moment and then cuts it with his own hand.',
        '"Well," he says. "Pull for the ship." Nobody says anything else all the way back.',
      ],
      choices: [leave('go on', 'The boats lowered for a whale and lost him.')],
    });
  }

  /* ---------------- the carved figure ---------------- */

  /** The chance each dawn that the carved figure, if carried, brings a little ill luck. */
  const IDOL_LUCK = 0.3;

  /** The small misfortunes of a ship with the carved figure aboard: each explicable, and each one more. */
  const MISHAPS = [
    'A new whale-line, never used, parts at the first strain when they are swaying up a cask.',
    'The cook upsets the coppers and scalds his arm to the elbow.',
    'A cask of bread, opened, is found rotten right through, and the one under it.',
    'A man slips on the fore-yard and hangs there by one hand until they get to him.',
    'The ship\'s cat is gone in the night. Nobody saw it go.',
  ];

  /** The figure's ill luck: a mishap, and the hands' mood; after the second, Captain Swain has noticed. */
  function idolMishap() {
    S.ship.idolLuck++;
    G.regard(-0.3, MISHAPS[(S.ship.idolLuck - 1) % MISHAPS.length], 'warn');
    if (S.ship.idolLuck === 2) G.idolNoticed();
  }

  /* ---------------- on deck and below ---------------- */

  /** What the hands talk about in the fo'c'sle: each yarn once, while there are any left, with `when()` if it waits on something. */
  const YARNS = [
    { id: 'swain', text: 'They talk about Captain Swain: a Quaker, who will not have a man flogged, nor a curse spoken on his quarterdeck, and who has filled his ship twice. They are proud of him, and pretend not to be.' },
    { id: 'coffin', text: 'Mr Coffin, they tell you, was stove by a whale in \'38 and spent a night on the bottom of the boat. He has not believed in anything since.' },
    { id: 'island', text: 'They want to hear about your island. You tell them about the boar, and the crab, and the wild man, and they do not believe a word of it, and want to hear it again.' },
    { id: 'gorham', text: 'Gorham the cooper has been three years out, and has a wife in Fairhaven he would not know in the street. He talks about money the way other men talk about women.' },
    { id: 'marooned', text: 'Somebody asks how a bosun\'s mate comes to be marooned. You tell them the story you have told yourself. Nobody says anything for a while, and then somebody asks about the boar again.' },
    { id: 'ports', text: 'The talk is of Talcahuano, and Tumbes, and the price of boots in Paita, and a girl in Lahaina every man present has apparently been engaged to.' },
    { id: 'tupa', when: () => S.ship.tupa, text: 'Two of the old hands sailed with Tupa before. They call him Jack, and he answers to it, and you watch him do it.' },
    { id: 'hollis', when: () => S.ship.hollis, text: 'The hands make Hollis tell them about the twenty years. He tells it better each time, and one evening, telling it, he stops, and goes on deck, and does not come back down.' },
    { id: 'jem', when: () => S.ship.jem, text: 'Jem sits at the edge of the yarning, mending a shirt that does not need it. When anyone asks him where he shipped from, he says Bristol, and nothing else.' },
  ];

  /** A yarn in the fo'c'sle: the next one not yet told, which the hands think the better of you for, or the old talk if they are all told. */
  function yarn() {
    S.n.yarns = S.n.yarns || {};
    const y = YARNS.find((x) => !S.n.yarns[x.id] && (!x.when || x.when()));
    if (y) {
      S.n.yarns[y.id] = 1;
      G.regard(0.2);
      log(y.text);
      return;
    }
    log(pick([
      'The same yarns as last night, told by the same men, a little longer.',
      'They are arguing about whether a whale can swallow a man. The cooper says he has seen one try.',
      'You sit and listen, and somebody passes you a pannikin of cold tea, and you are one of them for an hour.',
    ]));
  }

  /** What the lookout sees from the masthead when it is not whales. */
  const MASTHEAD = [
    'Two hours at the masthead, in the hoops, swaying over the sea. Nothing but the sea.',
    'From the masthead the whole ocean is a plate, with the ship in the middle of it. You see a turtle asleep on the swell, and nothing else.',
    'A shoal of flying fish gets up under the bow and goes skittering away. No spouts.',
  ];

  /** The time at the masthead: whales, perhaps, or what the passage has to show. */
  function lookout() {
    if (G.canHunt() && chance(0.35)) {
      G.blows();
      return;
    }
    if (G.mastheadSees()) return;
    log(pick(MASTHEAD));
  }

  /** Whether action `a` can be done now: deck work in the castaway's watch on deck, and the rest in the watch below. */
  const inWatch = (a) => (a.deck ? G.onDeck() : a.below ? !G.onDeck() : true);

  /**
   * The things to do aboard, as for the camp's ACTIONS: each has an `id`,
   * `label`, cooldown `cd`, optional `cost`, `show()`, `enabled()` and
   * `note()`; `deck` work is done in the watch on deck, and `below`
   * things in the watch below.
   */
  G.SHIP_ACTIONS = [
    {
      id: 'haul', label: 'haul and belay', cd: 6, deck: true,
      run() {
        AU.sfx('gather');
        work(0.1);
        log(pick([
          'You tail on to the main brace with the watch, and haul, and belay.',
          'Sheets and braces, tacks and halliards, all the watch long. Your hands remember it before you do.',
          'Mr Coffin has you set up the lee rigging. He watches you do it, and finds nothing to say.',
          'You stand by the braces while she comes round, and haul when you are told, and are not told twice.',
        ]));
      },
    },
    {
      id: 'wheel', label: 'take a trick at the wheel', cd: 15, deck: true,
      run() {
        work(0.15);
        if (G.watchName() === 'the middle watch' && G.daysOut() >= 2 && !S.memories.helm) {
          G.recall('helm');
          return;
        }
        log(pick([
          'Two hours at the wheel, keeping her full and by, with one eye on the compass and the other on the main-topsail\'s leech.',
          'You steer, and she answers. It is a long time since anything has done what you asked of it.',
        ]));
      },
    },
    {
      id: 'aloft', label: 'go aloft to the masthead', cd: 14, deck: true,
      show: () => !isNight() && S.ship.wind !== 'gale',
      run() {
        work(0.1);
        lookout();
      },
    },
    {
      id: 'try', label: 'feed the try-works', cd: 8,
      show: () => S.ship.trying > 0,
      run() {
        AU.sfx('stoke');
        work(0.2);
        if (chance(0.3)) log(`The cook fries doughnuts in the try-pots and hands them round on the end of a skimmer. You put ${gain({ food: 1 })} by for later.`);
        else log('You feed the fires with scraps of last night\'s blubber, and the oil boils, and the smoke goes up black and stinking.');
      },
    },
    {
      id: 'sleep', label: 'turn in', cd: 15, below: true,
      enabled: () => !S.ship.rested,
      note: () => (S.ship.rested ? 'slept today' : ''),
      run() {
        S.ship.rested = 1;
        log(G.scurvy() ? 'You sleep, after a fashion. The scurvy will not let you mend.' : 'You sleep like the dead in your hammock, with the ship talking to herself all round you.');
      },
    },
    {
      id: 'yarn', label: 'yarn in the fo\'c\'sle', cd: 12, below: true,
      run: yarn,
    },
    {
      id: 'share', label: 'pass round your tobacco', cd: 12, below: true, cost: { tobacco: 1 },
      show: () => S.seen.tobacco,
      enabled: () => S.ship.shared !== S.day,
      note: () => (S.ship.shared === S.day ? 'shared today' : ''),
      run() {
        S.ship.shared = S.day;
        G.regard(0.3, 'You cut your plug and pass it round the fo\'c\'sle. It does not go far, but it goes to everybody.');
      },
    },
    {
      id: 'fish', label: 'fish over the side', cd: 12, below: true,
      show: () => S.ship.wind !== 'gale',
      run() {
        AU.sfx('splash');
        if (chance(0.45)) log(pick(['Nothing bites but the sun.', 'A shark takes your bait and your hook and most of your line.']));
        else log(`${cap(pick(['A bonito', 'An albacore', 'A dolphin, green and gold, going grey as it dies'])) } comes up over the rail: ${gain({ food: rand(1, 2) })}.`);
      },
    },
    {
      id: 'slops', label: 'go to the slop chest', cd: 4, below: true,
      enabled: () => S.ship.lay - 50 >= -LAY_DEBT,
      note: () => (S.ship.lay - 50 >= -LAY_DEBT ? '2 plugs of tobacco, 50 cents against your lay' : 'they will not trust you further'),
      run() {
        S.ship.lay -= 50;
        log(`The steward sells you ${gain({ tobacco: 2 })}, and writes it against your lay at prices that would shame a Bristol crimp.`);
      },
    },
    {
      id: 'write', label: 'write your statement', cd: 2, below: true,
      show: () => S.flags.statementAsked && !S.items.statement,
      run: () => G.writeStatement(),
    },
  ];

  /** The note under an action that is out of its watch. */
  const outOfWatch = (a) => (a.deck ? 'your watch is below' : 'your watch is on deck');

  /**
   * The deck tab's sections: the work of the ship, the statement and what
   * has come back to the castaway, built with the camp's `section` and
   * `button`.
   */
  G.shipSections = function () {
    const { section, fill, button, has, costText, doAction } = G;
    const sec = section('ship', 'The Perseverance', G.onDeck()
      ? (S.ship.trying ? 'All hands at the try-works, day and night, until the oil is stowed down.' : `${cap(G.watchName())}: your watch on deck. Mr Coffin will notice if you do nothing.`)
      : `${cap(G.watchName())}: your watch below. Sleep if you can.`);
    fill(sec.querySelector('.btn-row'), G.SHIP_ACTIONS.filter((a) => !a.show || a.show()).map((a) => {
      const key = { id: `ship:${a.id}`, cd: a.cd, cost: a.cost, run: a.run };
      const ok = inWatch(a);
      const enabled = ok && (!a.cost || has(a.cost)) && (!a.enabled || a.enabled());
      const note = !ok ? outOfWatch(a) : (a.note && a.note()) || (a.cost ? costText(a.cost) : '');
      return button(key.id, a.label, note, enabled, () => doAction(key));
    }));
    const secs = [sec];
    const papers = G.paperButtons();
    if (papers.length) {
      const book = section('book', 'Remembered', 'What you have written down, and what has come back to you.');
      fill(book.querySelector('.btn-row'), papers);
      secs.push(book);
    }
    return secs;
  };

  /** What the deck picture depends on. */
  G.deckState = () => ({
    night: isNight(), trying: S.ship.trying > 0, wind: S.ship.wind, blows: !!S.ship.blowing,
    tupa: S.ship.tupa, hollis: S.ship.hollis, jem: S.ship.jem && !S.flags.jemIrons && !S.flags.jemRan,
  });

  /** What the passage chart depends on. */
  G.passageState = () => ({
    miles: S.ship.miles, total: S.ship.total, noons: S.ship.noons, marks: S.ship.marks,
    juan: !!S.flags.juan, windName: G.SHIP_WINDS[S.ship.wind][0],
  });

  /** The passage tab's section: how far is run, and how far to go. */
  G.passageSections = function () {
    const days = G.daysOut();
    return [G.section('passage', 'The Passage', `${days} day${days === 1 ? '' : 's'} out from the islands, and ${S.ship.miles} miles to run to Valparaíso. The wind is ${G.SHIP_WINDS[S.ship.wind][0]}.${S.ship.trying ? ' She lies hove to while the try-works burn.' : ''}`)];
  };

  /** The ship's rows in the stores column: the watch, the lay, the allowance, and who sailed with the castaway. */
  G.shipRows = function (row) {
    const rows = [
      row('your watch', null, G.onDeck() ? 'on deck' : 'below'),
      row('the hands think you', null, G.standingName()),
      row('your lay', G.money(S.ship.lay), S.ship.lay < 0 ? 'in debt to the ship' : `of ${S.ship.barrels} barrels taken`),
      row('allowance', null, S.ship.allowance === 'short' ? 'short: eke it out' : 'full'),
    ];
    if (S.ship.tupa) rows.push(row('Tupa', null, 'boatsteerer in the mate\'s boat'));
    if (S.ship.hollis) rows.push(row('Tom Hollis', null, 'learning the ropes again'));
    if (S.ship.jem) rows.push(row('Jem Rudd', null, S.flags.jemRan ? 'gone at Juan Fernández' : S.flags.jemIrons ? 'in irons' : 'a hand forward'));
    return rows;
  };

  /* ---------------- happenings aboard ---------------- */

  /**
   * What can happen aboard, as for the camp's AT_CAMP (run by `G.happen`):
   * an `id`, an optional `limit`, `weight` and `when()`, and `run()`.
   */
  G.SHIP_EVENTS = [
    {
      id: 'blows', weight: 1.5,
      when: () => G.canHunt(),
      run: () => G.blows(),
    },
    {
      id: 'albatross', limit: 1,
      when: () => !isNight(),
      run: () => log('An albatross has picked up the ship, and follows her all day without once moving its wings. The hands will not have it harmed. Ezra, the boy, asks you why, and you find you do not want to say.', 'lore'),
    },
    {
      id: 'flyingFishDeck', limit: 2,
      when: isNight,
      run: () => log(`Flying fish come aboard in the dark, drawn by the binnacle lamp, and flap about the deck. ${cap(gain({ food: 2 }))} for breakfast.`),
    },
    {
      id: 'porpoise', limit: 1,
      when: () => !isNight() && S.ship.wind === 'fair',
      run: () => log(`Porpoises under the bow. The boatsteerers strike one from the martingale, and there is fresh meat in the coppers tonight: ${gain({ food: 2 })}.`),
    },
    {
      id: 'swainBible', limit: 1,
      when: () => S.items.bible,
      run() {
        modal({
          art: ART.scene('cabin'),
          title: 'Captain Swain',
          text: [
            'Captain Swain sees the Bible in your hand, and asks if he may look at it. He turns to the flyleaf and reads the inscription, and closes it gently.',
            quote('"Thy captain\'s," he says. "Josiah. And Hannah." He gives it back. "Thee will want to find her, when this is done. Somebody should tell her how he died."'),
            'You say that you do not know how he died. Captain Swain looks at you for a long moment.',
            quote('"No," he says. "But thee will."'),
          ],
          choices: [leave('go on', 'Captain Swain has read the inscription in Ashby\'s Bible. Somebody should tell Hannah how he died.', 'lore')],
        });
      },
    },
    {
      id: 'shipBristow', limit: 1,
      when: () => S.items.bristow,
      run: () => G.regard(0.5, 'Bristow has been discovered in your hammock. By evening he has a cap, a pipe, and a berth in the fo\'c\'sle, and the cooper is talking to him about money.', 'lore'),
    },
    {
      id: 'hollisAloft', limit: 1,
      when: () => S.ship.hollis && !isNight(),
      run: () => log('Hollis goes aloft for the first time in twenty years: slowly up the ratlines, and then faster, and then he is sitting on the main-topsail yard with his legs swinging, laughing like a boy.', 'lore'),
    },
    {
      id: 'ezra', limit: 1,
      run() {
        log(S.ship.hollis
          ? 'Ezra, the ship\'s boy, fourteen and from New Bedford, follows Hollis about like a dog. Hollis was fourteen when the Calliope struck. He looks at the boy sometimes as if he were looking down a well.'
          : 'Ezra, the ship\'s boy, fourteen and from New Bedford, wants to know if you were frightened on your island. You tell him yes. He seems relieved.', 'lore');
      },
    },
    {
      id: 'tupaWhaling', limit: 1,
      when: () => S.ship.tupa,
      run: () => log('Tupa does not like the cutting-in. "My people take a whale when the sea gives one to the beach," he says, "and sing to it. These men take forty in a year, and boil them, and sell the oil to light rooms in America." He shrugs. "But they pay in iron."', 'lore'),
    },
    {
      id: 'sick', limit: 2, weight: 1.2,
      when: () => S.res.fruit >= 2 && G.daysOut() >= 4,
      run() {
        modal({
          art: ART.scene('cabin'),
          title: 'The Sick List',
          text: [
            `${pick(['Jos Briggs', 'Old Manuel'])} is down with the scurvy: his legs are black with bruises and his teeth move when he speaks. Three years out, he says. He has not tasted anything green since Tumbes.`,
            'You have fruit from the islands in your bag.',
          ],
          choices: [
            { label: 'give him some', cost: { fruit: 2 }, fn: () => { G.regard(0.8); closeModal(); log('You give your fruit to a sick man. The fo\'c\'sle hears of it before you are back on deck.'); } },
            leave('keep it', 'You kept your fruit. It may be you will need it.'),
          ],
        });
      },
    },
    {
      id: 'quarrel', limit: 1,
      when: isNight,
      run() {
        modal({
          art: ART.scene('night'),
          title: 'In the Fo\'c\'sle',
          text: ['A quarrel in the fo\'c\'sle over a stolen pair of boots, and then a knife out, and the cooper and a Portuguese boatsteerer circling each other between the sea-chests while the rest sit in their bunks and watch.'],
          choices: [
            {
              label: 'step between them',
              fn: () => {
                G.regard(0.6);
                const cut = chance(0.4);
                if (cut) damage(1, 'a knife in the fo\'c\'sle');
                if (S.ended) return;
                modal({ art: ART.scene('night'), title: 'In the Fo\'c\'sle', text: ['You step in between them, as a bosun\'s mate does, and talk, and keep talking, and in the end the knife goes away.', cut ? gainLine('Not before it has opened your forearm. You lose 1 health.') : gainLine('The hands think better of you for it.')], choices: [leave('turn in', 'You stopped a knife-fight in the fo\'c\'sle.')] });
              },
            },
            leave('keep out of it', 'You kept out of a knife-fight in the fo\'c\'sle. Somebody else stopped it.'),
          ],
        });
      },
    },
    {
      id: 'jonah', limit: 1, weight: 3,
      when: () => S.ship.standing <= 1,
      run: () => G.jonahTalk(),
    },
    {
      id: 'shipTalk', weight: 0.5,
      when: () => S.items.bristow || S.ship.hollis || S.ship.jem,
      run() {
        const lines = [];
        if (S.items.bristow) lines.push('Bristow\'s pipe has gone missing. The cooper denies everything.');
        if (S.ship.hollis) lines.push('Hollis is learning to splice again. His hands are quicker than his memory.');
        if (S.ship.jem && !S.flags.jemIrons && !S.flags.jemRan) lines.push('Jem keeps to the lee side of the deck, out of the mate\'s eye.');
        log(pick(lines));
      },
    },
  ];

  /** Something happening aboard, now and then. */
  G.shipHappening = () => G.happen(G.SHIP_EVENTS);
})();
