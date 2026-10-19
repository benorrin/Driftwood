/* Driftwood — the archipelago.
 * The second chapter: the voyage ends on the reef of an islet west of the
 * island, within sight of other islands no one could see from the summit.
 * This file holds the wreck, the islands themselves and what is found on
 * them; sailing between them is told in sea.js. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, rand, chance, pick, cap, gainLine, quote, RES, RES_ORDER, view,
    add, gain, log, save, isNight, modal, closeModal, leave,
  } = G;

  /** Days at sea before the reef. */
  const VOYAGE_DAYS = 4;

  /** What the boat is called in the telling. */
  G.boatName = () => (S.boat.kind === 'canoe' ? 'canoe' : 'raft');

  /** Puts the fire out without counting it against the castaway: it was left, not let go. */
  G.leaveFire = function () {
    S.fire = 0;
    S.fireT = 0;
    AU.setFire(0);
  };

  /* ---------------- the reef ---------------- */

  /**
   * The voyage by `kind` ('raft' or 'canoe') ends on the reef of an islet:
   * the sea takes half of what was carried, Bristow goes overboard, and the
   * second chapter begins.
   */
  G.wrecked = function (kind) {
    const lost = [];
    RES_ORDER.forEach((k) => {
      const n = Math.floor((S.res[k] || 0) / 2);
      if (n > 0 && k !== 'shot') {
        add(k, -n);
        lost.push(`${n} ${RES[k]}`);
      }
    });
    const saved = gain({ water: rand(2, 4), food: rand(2, 3), wood: rand(2, 4) });

    S.chapter = 2;
    S.isle = 'islet';
    S.wind = 'trades';
    S.flags.trades = 1;
    S.flags.sailing = 0;
    S.boat = { kind };
    S.charted = { islet: 1 };
    S.landed = { islet: 1 };
    S.day += VOYAGE_DAYS;
    S.n.wreckDay = S.day;
    S.t = 20;
    G.leaveFire();
    const bristow = !!S.items.bristow;
    if (bristow) {
      delete S.items.bristow;
      S.flags.bristowLost = 1;
    }
    view.tab = 'beach';
    view.sceneKey = '';
    view.seenTabs.raft = false;
    AU.sfx('hurt');

    const text = [
      kind === 'canoe'
        ? 'You put the helm over, too late. The float strikes coral and splinters, the canoe rolls, and the surf takes you over the reef in a smother of white water and drops you, at last, on sand.'
        : 'In the dark before dawn the raft strikes. There is a long grinding shriek of coral under the logs, and then the sea picks her up and throws her down again, and again, and you are in the water, and then on sand.',
      `When it is light you find yourself on a scrap of an island: a hump of white sand and coral rubble a few hundred paces across, with a handful of palms and a great many birds. What is left of the ${kind} lies on the reef, ${kind === 'canoe' ? 'her float torn away' : 'her mast snapped off short'}.`,
    ];
    if (S.flags.ally) text.push('Hollis is sitting beside you, soaked, bleeding from a cut over his eye, and grinning like a boy.');
    if (bristow) text.push('Of Bristow there is no sign.');
    text.push(gainLine(`The sea has taken ${lost.length ? lost.join(', ') : 'nothing worth the name'}. From the wreck you save ${saved}.`));
    modal({
      art: ART.scene('islet', { wreck: 1 }),
      title: 'The Reef',
      text,
      choices: [{ label: 'climb the islet', fn: chapterTwo }],
    });
    save();
  };

  /** The second chapter opens: from the top of the islet, the island to the east, and others besides. */
  function chapterTwo() {
    AU.sfx('page');
    S.charted.high = 1;
    modal({
      art: ART.scene('islet'),
      title: 'Chapter Two',
      text: [
        '<p class="dateline">The Archipelago</p>',
        'You climb to the highest point of the islet, which is not high, and turn slowly about.',
        'To the east, low and blue on the horizon, lies a long hump of land with a peak at its northern end. You would know it anywhere. It is your island, and the wind is blowing the wrong way.',
        'And to the south and west, where you had thought there was only sea, there are more: low smudges of palms on the horizon, too low ever to show from the summit, and one high island to the south-west with a cloud sitting on its peak that never moves away. A cloud like that means rain, and rain means water. You were never alone out here. You only could not see.',
      ],
      choices: [{
        label: 'go down to the wreck',
        fn: () => {
          closeModal();
          log(`Day ${S.day}`, 'day');
          log('You are cast away again, on an islet west of your island.', 'lore');
          log(`Patch the ${G.boatName()}, and wait for a westerly to carry you home.`, 'lore');
          G.render();
        },
      }],
    });
  }

  /* ---------------- the islands ---------------- */

  /** A card on an island: scene `art`, `title`, `text`, and choices (by default, back to the beach, logging `line` as lore). */
  function isleCard(art, title, text, line, choices) {
    modal({ art: ART.scene(art), title, text, choices: choices || [leave('back to the beach', line, line ? 'lore' : '')] });
  }

  /**
   * The islands of the archipelago, besides the castaway's own. Each has a
   * name, a position on the sea chart, a `bearing` from the island ('west'
   * runs before the trades, 'east' needs a westerly, 'north' and 'south'
   * cross the wind), the `days` a passage takes, the scene `art` of the
   * islet picture, and what it offers: `palms` to climb, a `stream` to
   * drink from, `timber` to fell. `land()` tells of the first landing and
   * `again()` of the rest. `places` are the things to do there, each with
   * a label, an optional `show()`, a `cd` in seconds, and `run()`. `finds`
   * are what combing its beach turns up: [weight, run]. `far` gives the
   * reason an island can be seen but not reached.
   */
  const ISLES = (G.ISLES = {
    islet: {
      name: 'The Islet', x: 250, y: 176, bearing: 'west', days: 2, palms: 1,
      land: () => {},
      again: () => isleCard('islet', 'The Islet', ['The islet is as you left it: a hump of sand, a few palms, and the birds, who do not remember you.'], null),
      places: [],
    },
    high: {
      name: 'The High Island', x: 120, y: 250, bearing: 'west', days: 3, stream: 1, palms: 1, timber: 1, hill: 1,
      land() {
        isleCard('spring', 'The High Island', [
          'She is the cloud-capped island you saw from the islet: steep, green, loud with water. A stream comes down out of the forest and spreads across the beach in a fan of little channels, and you lie down in it, all of you, and drink like a horse.',
          'On the sand above the stream mouth, among the wrack, lies a broken cask stave. Burned into it, upside down, are the letters <i>MERIDIAN</i>.',
          gainLine(`You fill everything you have: ${gain({ water: 6 })}.`),
        ], 'The Meridian has been to the High Island before you.');
      },
      again: () => isleCard('spring', 'The High Island', ['The stream is still running, and the forest is still loud with birds. Nobody has been here since you.'], null),
      places: [
        {
          id: 'camp', label: 'follow the beach east', cd: 20,
          show: () => !S.flags.meridianCamp,
          run: meridianCamp,
        },
        {
          id: 'grave', label: 'go up to the grave', cd: 20,
          show: () => S.flags.meridianCamp,
          run: () => isleCard('grave', 'The Grave', [
            'The mound above the camp has settled a little since you first saw it. The cross of lashed sticks still stands. Whoever lies here, someone took the trouble.',
            S.flags.ally && !S.flags.hollisHome ? 'Hollis takes off his hat, which you have never seen him do, and stands a while.' : 'You stand a while, and then you go back down.',
          ], null),
        },
        {
          id: 'ridge', label: 'climb the ridge', cd: 30,
          show: () => S.flags.meridianCamp && !S.charted.smoke,
          run: highRidge,
        },
      ],
      finds: [
        [3, () => log(`Wild plantains, over-ripe and sweet: ${gain({ food: 2 })}.`)],
        [2, () => log(`A land crab, too slow to get back into its hole: ${gain({ food: 1 })}.`)],
        [2, () => log(`Vines from the forest's edge, strong as rope: ${gain({ fibre: 3 })}.`)],
        [1, () => log(`${cap(gain({ wood: rand(2, 3) }))} from the stream mouth.`)],
        [1, () => {
          if (S.flags.highFootprint) {
            log(`A land crab, too slow to get back into its hole: ${gain({ food: 1 })}.`);
            return;
          }
          S.flags.highFootprint = 1;
          log('In the wet sand by the stream: a bare footprint, a man\'s, a day old or less. It is not yours.', 'lore');
        }],
      ],
    },
    rock: {
      name: 'The Bird Rock', x: 548, y: 112, bearing: 'east', days: 2, rocky: 1,
      land() {
        isleCard('cliffs', 'The Bird Rock', [
          'It is not an island so much as a tooth: a black rock standing out of the sea, white with the droppings of ten thousand birds, and loud with them. There is one landing place, a shelf of rock on the lee side, and you get ashore wet to the waist.',
          'Jammed into a cleft above the shelf, where some great sea threw her years ago, are the bones of a ship. Not the <i>Calliope</i>: bigger, and older. On a fragment of her stern board, in letters that were once gilt, you can make out <i>…ANT, SALEM</i>.',
          'She had a figurehead, once. The empty bolt-holes are still there at her stem.',
        ], 'A ship from Salem lies broken on the Bird Rock. Her figurehead is on your island\'s bird cliffs.');
      },
      again: () => isleCard('cliffs', 'The Bird Rock', ['The birds rise in a screaming cloud as you come ashore, and settle again when they see it is only you.'], null),
      places: [
        {
          id: 'eggs', label: 'take eggs', cd: 15,
          run() {
            if (chance(0.2)) {
              G.fight('gulls', { onWin: () => { log(`You fight your way to the ledges: ${gain({ food: 4 })}.`); closeModal(); } });
              return;
            }
            log(`From the ledges, warm and speckled: ${gain({ food: rand(2, 4) })}.`);
          },
        },
        {
          id: 'salem', label: 'salvage the Salem ship', cd: 25,
          run() {
            AU.sfx('chop');
            log(`From the old wreck in the cleft you pry ${gain({ iron: rand(1, 2), timber: rand(1, 2) })}.`);
          },
        },
      ],
      finds: [
        [3, () => log(`Shellfish on the landing shelf: ${gain({ food: 1 })}.`)],
        [1, () => log(`Wreckage from the Salem ship, rotten but whole: ${gain({ wood: 2 })}.`)],
        [1, () => log('A seal hauls out on the shelf, looks at you with great wet eyes, and decides you are not worth moving for.')],
      ],
    },
    sandbar: {
      name: 'The Sandbar', x: 400, y: 52, bearing: 'north', days: 1,
      land() {
        isleCard('beach', 'The Sandbar', [
          'A bar of white sand barely higher than the swell, with nothing on it at all but turtle tracks, hundreds of them, coming up out of the sea and going back.',
          'And at the top of the bar, half buried, a whaleboat: clinker-built, thirty feet long, her planks sprung. Cut into her transom is <i>NANTUCKET</i>, and under it, more roughly, a date: <i>1843</i>.',
          'So the whalers come this way. Or one did.',
        ], 'A Nantucket whaleboat lies on the Sandbar. The whalers come this way.');
      },
      again: () => isleCard('beach', 'The Sandbar', ['The turtles have been up the bar again in the night. The whaleboat has not moved.'], null),
      places: [
        {
          id: 'turtles', label: 'dig for turtle eggs', cd: 20,
          run: () => log(`You follow a fresh track up the sand and dig where it ends: ${gain({ food: rand(3, 5) })}.`),
        },
        {
          id: 'whaleboat', label: 'strip the whaleboat', cd: 25,
          show: () => (S.n.whaleboat || 0) < 4,
          run() {
            AU.sfx('chop');
            S.n.whaleboat = (S.n.whaleboat || 0) + 1;
            log(S.n.whaleboat < 4
              ? `You work the planks loose from the whaleboat: ${gain({ timber: 2, iron: 1 })}.`
              : `The last of the whaleboat: ${gain({ timber: 2, rope: 2 })}, and her keel, which you leave to the turtles.`);
          },
        },
      ],
      finds: [
        [2, () => log(`A turtle egg the birds missed: ${gain({ food: 1 })}.`)],
        [1, () => log(`${cap(gain({ wood: rand(1, 2) }))}, washed up on the bar.`)],
      ],
    },
    smoke: {
      name: 'The Island of Fires', x: 330, y: 306, bearing: 'south', days: 5,
      far: 'too far for her: she would never come back against the trades',
    },
  });

  /** The island the castaway is on, or null at home. */
  G.isle = () => ISLES[S.isle] || null;

  /** The Meridian's old camp on the High Island, with a grave above it, and the wreck of a letter. */
  function meridianCamp() {
    S.flags.meridianCamp = 1;
    AU.sfx('page');
    isleCard('sealers', 'A Camp', [
      'Round the point, in the lee of the forest, someone has camped: a ring of fire-blackened stones, the ashes long cold, a bed of cut fern, the stumps of a dozen saplings cut with a ship\'s axe. Empty bread bags. A broken water breaker. They stayed some days, and filled their casks, and went.',
      'In the ashes, a scrap of paper the fire did not quite finish. Most of it is gone. What is left is in a clerk\'s hand:',
      quote('…of pig iron, forty tons, consigned to Messrs Morrow &amp;…'),
      'Morrow. You think of the sealed parcel, and the name on it.',
      'Above the camp, on a little rise looking out to sea, is a grave: a long mound of earth, and a cross of two sticks lashed with spunyarn. There is no name on it.',
    ], 'The Meridian camped on the High Island. Someone is buried there, and her cargo was consigned to someone named Morrow.');
  }

  /** From the High Island's ridge, the island where fires burn at night, far to the south. */
  function highRidge() {
    S.charted.smoke = 1;
    AU.sfx('page');
    isleCard('summit', 'The Ridge', [
      'It takes you half a day to fight your way up through the forest to the ridge, and when you come out above the trees you can see the whole archipelago laid out like a chart: your island to the north-east, the islet, the black tooth of the Bird Rock, and the sea shining between them.',
      'And far to the south, further than any of them, a big island, blue with distance, with a thread of smoke going straight up from it into the still air. Then another. Cookfires. A village.',
      'Too far, and the wrong way. Not with this boat.',
    ], 'Far to the south of the High Island lies an island where people live.');
  }

  /* ---------------- combing other shores ---------------- */

  /**
   * Combs the shore of the island the castaway is on. The islet's first
   * searches turn up what the reef spared of the boat; elsewhere, what each
   * island's `finds` hold, and now and then a happening.
   */
  G.combAway = function () {
    AU.sfx('comb');
    if (S.isle === 'islet') {
      combIslet();
      return;
    }
    if (chance(0.06) && G.awayHappening()) return;
    const finds = G.isle().finds;
    let roll = Math.random() * finds.reduce((t, [w]) => t + w, 0);
    finds.find(([w]) => (roll -= w) < 0)[1]();
  };

  /** Combs the islet: the boat's remains first, then fibre, shellfish, eggs and driftwood. */
  function combIslet() {
    S.n.combIslet = (S.n.combIslet || 0) + 1;
    const c = S.n.combIslet;
    if (c === 1) {
      log(`Along the edge of the reef, what the sea spat back out of the ${G.boatName()}: ${gain({ rope: 2, cloth: 2, wood: 2 })}.`);
    } else if (c === 2) {
      log(`The islet's few palms have shed their dead fronds into the sand: ${gain({ fibre: 3 })}.`);
    } else if (c === 3) {
      log(`Wedged in the coral at the tide line, a broken spar: ${gain({ wood: 4 })}. It might do for a mast.`);
    } else if (chance(0.06) && G.awayHappening()) {
      // something turned up
    } else {
      const roll = Math.random();
      if (roll < 0.35) log(`You gather ${gain({ fibre: rand(1, 2) })} from under the palms.`);
      else if (roll < 0.55) log(`Shellfish, prised off the rocks: ${gain({ food: 1 })}.`);
      else if (roll < 0.7) log(`From the nests of the birds that are too tame to flee you: ${gain({ food: 2 })}. You do not enjoy it.`);
      else if (roll < 0.88) log(`${cap(gain({ wood: rand(1, 3) }))}, bleached and light, from the windward shore.`);
      else log(`A coconut, fallen and whole: ${gain({ food: 1, water: 1 })}.`);
    }
  }

  /** Things that happen away from the island, now and then; `isles` limits one to those islands. */
  const AWAY = [
    {
      id: 'bristowBack', limit: 1, weight: 3, isles: ['islet'],
      when: () => S.flags.bristowLost && S.day > S.n.wreckDay,
      run() {
        delete S.flags.bristowLost;
        S.items.bristow = 1;
        AU.sfx('pickup');
        modal({
          art: ART.scene('beach', { ball: 1 }),
          title: 'Flotsam',
          text: [
            'Something round and pale comes bobbing in through the gap in the reef, turns over once in the shallows, and rolls up the sand to your feet.',
            'Bristow. His face is half washed off, but he is smiling. He has come after you.',
          ],
          choices: [leave('take him up the beach', 'Bristow found his own way across the sea to you. He has never once asked where you are going.', 'lore')],
        });
      },
    },
    {
      id: 'isletRain', limit: 4,
      run: () => log(`A squall comes marching over the sea, and you spread the canvas and catch what you can: ${gain({ water: rand(2, 3) })}.`),
    },
    {
      id: 'isletLog', limit: 2, isles: ['islet', 'sandbar'],
      run: () => log(`A whole tree comes in on the tide, roots and all, from some island upwind: ${gain({ wood: 4 })}.`),
    },
    {
      id: 'isletFire', limit: 1, isles: ['islet'],
      when: () => isNight(),
      run: () => log('Far to the south, low on the horizon, a point of light burns for an hour and goes out. A fire. Somebody else is out here.', 'lore'),
    },
    {
      id: 'highWatched', limit: 2, isles: ['high'],
      run: () => log(pick([
        'At the edge of the forest something moves, and is still, and is gone. A pig, you tell yourself.',
        'You come back to the beach and find your fire has been stirred, and a stick of it taken. Nothing else.',
      ]), 'lore'),
    },
    {
      id: 'isletWeather', weight: 2, isles: ['islet'],
      run: () => log(pick(isNight()
        ? ['The birds settle on the islet in their thousands, and grumble all night.', 'The surf on the reef never stops. You stop hearing it, and then hear it again.']
        : ['The sun comes off the white sand like the heat off an oven door.', 'A shark cruises the lagoon side of the reef, back and forth, patient as a sentry.', 'From the top of the islet you can see your island, blue and far. It does not get any nearer.'])),
    },
    {
      id: 'awayWeather', weight: 2,
      when: () => S.isle !== 'islet',
      run: () => log(pick(isNight()
        ? ['You sleep badly on a strange shore, and wake at every sound.', 'Somewhere across the water, your own island is dark. You hope the camp is standing.']
        : ['A frigate bird hangs over the shore all morning without once moving its wings.', 'The wind hums in the rigging of the boat on the beach, as if she wants to be off.'])),
    },
  ];

  /** Something happens away from the island, if anything can here. */
  G.awayHappening = () => G.happen(AWAY.filter((e) => !e.isles || e.isles.includes(S.isle)));
})();
