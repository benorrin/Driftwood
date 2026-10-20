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
   * cross the wind), the `days` a passage takes, and what its shore offers:
   * `palms` to climb, a `stream` to drink from, `timber` to fell. `land()`
   * tells of the first landing and `again()` of the rest. `finds` are what
   * combing its beach turns up: [weight, run]. `far()` gives the reason an
   * island can be seen but not reached, if it can't.
   *
   * The larger islands have a chart of their own: `camp`, where the
   * castaway lands, on it, and `locs`, places to find and visit, just as on
   * the castaway's own island (see LOCS); every place id is unique across
   * all the islands. `trail` is what a trip exploring there may turn up
   * instead: [weight, text, gains, scene]. `lead()` points the way on when
   * there is nothing left to find yet. `places` are things to do from the
   * beach, once the place they belong to has been found: each with a label,
   * a `show()`, a `cd` in seconds, an optional `cost`, `enabled()` and
   * `note()`, and `run()`.
   */
  const ISLES = (G.ISLES = {
    islet: {
      name: 'The Islet', x: 250, y: 176, bearing: 'west', days: 2, palms: 1,
      land: () => {},
      again: () => isleCard('islet', 'The Islet', ['The islet is as you left it: a hump of sand, a few palms, and the birds, who do not remember you.'], null),
      places: [],
    },
    high: {
      name: 'The High Island', x: 120, y: 250, bearing: 'west', days: 3, stream: 1, palms: 1, timber: 1,
      camp: [440, 212],
      land() {
        isleCard('spring', 'The High Island', [
          'She is the cloud-capped island you saw from the islet: steep, green, loud with water. A stream comes down out of the forest and spreads across the beach in a fan of little channels, and you lie down in it, all of you, and drink like a horse.',
          'On the sand above the stream mouth, among the wrack, lies a broken cask stave. Burned into it, upside down, are the letters <i>MERIDIAN</i>.',
          gainLine(`You fill everything you have: ${gain({ water: 6 })}.`),
        ], 'The Meridian has been to the High Island before you. Explore it to see what she left.');
      },
      again: () => isleCard('spring', 'The High Island', ['The stream is still running, and the forest is still loud with birds.'], null),
      locs: {
        hiCamp: {
          name: 'The Watering Camp', x: 400, y: 258, cost: { food: 1 }, time: 4, art: 'sealers',
          findable: () => true,
          clue: 'Along the beach to the east, the stumps of saplings cut with an axe. Somebody camped near here.',
          sighted: 'East along the beach, round a point of rock, there is a scar in the trees where somebody has been cutting saplings.',
          sees: [['hiGrave', 1, 'Above the camp, on a little rise looking out to sea, there is a long mound of earth.']],
          first: meridianCamp,
          repeat: () => G.done('hiCamp', 'The fire-ring is cold, and the fern beds are flattened by the rain. They are not coming back.'),
        },
        hiGrave: {
          name: 'The Grave on the Rise', x: 356, y: 230, cost: { food: 1 }, time: 3, art: 'grave',
          findable: () => !!S.visits.hiCamp,
          sighted: 'Above the watering camp, on a little rise looking out to sea, a long mound of earth.',
          first() {
            G.done('hiGrave', [
              'It is a grave: a long mound of earth, and a cross of two sticks lashed together with spunyarn. Someone took the trouble to dig it deep, and to face it toward the sea, as sailors like.',
              (S.n.jemTold || 0) >= 3 ? 'Tom Abel. Who opened the crate, and sickened, and was dead in four days.' : 'There is no name on it.',
            ], null, 'Above the Meridian\'s watering camp on the High Island is a sailor\'s grave.');
          },
          repeat: () => G.done('hiGrave', [
            'The mound has settled a little. The cross of lashed sticks still stands.',
            G.withHollis() ? 'Hollis takes off his hat, which you have never seen him do, and stands a while.' : 'You stand a while, and then you go back down.',
          ]),
        },
        hiForest: {
          name: 'The Forest', x: 246, y: 206, cost: { water: 1 }, time: 5, art: 'jungle',
          findable: () => true,
          clue: 'Inland the forest comes right down to the stream, and there are pig tracks in the mud. You turn back before it gets dark.',
          sighted: 'Inland, behind the beach, the forest: tall, dark, and full of birds.',
          sees: [['hiPool', 0.6, 'Somewhere upstream, beyond the trees, you can hear water falling.']],
          first() {
            G.done('hiForest', [
              'The forest is old and tall, and the light under it is green. There are wild plantains, and breadfruit gone to seed, and the wallows of pigs everywhere.',
              'And a snare: a noose of plaited vine set across a pig run, by somebody who knew what they were about. It is not yours. The vine is fresh.',
            ], { food: 3 }, 'Somebody has been setting snares in the forest on the High Island.');
          },
          repeat() {
            if (chance(0.2)) {
              G.fight('boar', { canFlee: true, onWin: () => G.done('hiForest', 'You drag the pig back to the beach on a pole.', { food: 6 }) });
              return;
            }
            G.done('hiForest', 'You come back with your arms full of plantains.', { food: rand(2, 3) });
          },
        },
        hiPool: {
          name: 'The Waterfall Pool', x: 330, y: 150, cost: { food: 1 }, time: 5, art: 'spring',
          findable: () => !!(S.flags.highFootprint || S.visits.hiForest),
          clue: 'Following the stream inland, you hear falling water; but the way is choked with fern, and you turn back.',
          sighted: 'Up the stream, under a wall of fern, a waterfall drops into a deep green pool.',
          first: () => G.jemPool(true),
          repeat: () => G.jemPool(false),
        },
        hiRidge: {
          name: 'The Ridge', x: 290, y: 108, cost: { water: 2, food: 1 }, time: 7, art: 'summit',
          findable: () => !!(S.visits.hiCamp || S.visits.hiForest),
          clue: 'A path of sorts goes up from the stream toward the heights, but the cloud comes down on it, and you turn back.',
          sighted: 'Above the forest, a ridge of bare rock runs along the island\'s spine. From up there you could see everything.',
          sees: [['hiLookout', 1, 'Out on the western headland, below you, a heap of stones too regular to be natural, and a pole standing up from it.']],
          first: highRidge,
          repeat: () => G.done('hiRidge', 'You can see the whole archipelago from here: your island, the islet, the Bird Rock, and far to the south, the smoke of the Island of Fires.'),
        },
        hiLookout: {
          name: 'The Old Lookout', x: 172, y: 170, cost: { water: 1, food: 1 }, time: 6, art: 'cliffs',
          findable: () => !!S.visits.hiRidge,
          sighted: 'Out on the western headland, a heap of stones too regular to be natural, and a pole standing up from it.',
          first() {
            S.flags.lookout = 1;
            G.done('hiLookout', [
              'It is a lookout: a cairn of stones with a spar lashed upright in it for a flagstaff, and a bed of fern in its lee. Somebody kept watch here, day and night, while the <i>Meridian</i> lay at the watering. Watching for what, you wonder. A sail coming after them?',
              'The spar is carved all over, the way bored men carve things on a long watch: initials, a dozen sets of them. <i>J.R.</i> <i>T.A.</i> Others you half know.',
              'And below them, cut deeper than the rest, a circle with a dozen little round marks inside it. Every one of them has been gouged out black. Under the circle, smaller, is a word you cannot read: <i>MADDEUANT</i>.',
            ].concat(lookoutJem()), null, 'At the Meridian\'s old lookout on the High Island, someone carved a circle of beans into the flagstaff, every one of them black.');
          },
          repeat: () => G.done('hiLookout', ['The spar still stands in its cairn. You do not look at the circle of beans for long.'].concat(lookoutJem())),
        },
      },
      trail: [
        [2, 'You follow a pig run for an hour and come out exactly where you went in.', null, 'jungle'],
        [2, 'The forest\'s edge is heavy with wild plantains.', { food: 2 }, 'jungle'],
        [1, 'In the long grass by the stream, an empty bottle with the stamp of a Bristol brewery. The <i>Meridian</i>\'s, without a doubt.', null, 'spring'],
        [1, 'Vines as thick as your wrist hang from the trees by the stream. You cut what you can carry.', { fibre: 4 }, 'jungle'],
      ],
      lead() {
        if (!S.visits.hiCamp) return 'Somebody cut saplings along the beach to the east. Follow it, and see.';
        if (!S.visits.hiPool) return 'Somebody is living rough on this island. The stream, and the forest, may lead you to them.';
        return 'You have walked every path on the High Island you can find. For now, it has shown you all it will.';
      },
      places: [
        {
          id: 'forage', label: 'forage at the forest edge', cd: 20,
          show: () => !!S.visits.hiForest,
          run: () => log(`At the edge of the forest: ${gain({ food: rand(1, 2), fibre: 1 })}.`),
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
          log('In the wet sand by the stream: a bare footprint, a man\'s, a day old or less. It is not yours. It goes upstream.', 'lore');
        }],
      ],
    },
    rock: {
      name: 'The Bird Rock', x: 548, y: 112, bearing: 'east', days: 2, rocky: 1,
      camp: [300, 244],
      land() {
        isleCard('birdrock', 'The Bird Rock', [
          'It is not an island so much as a tooth: a black rock standing out of the sea, white with the droppings of ten thousand birds, and loud with them. There is one landing place, a shelf of rock on the lee side, and you get ashore wet to the waist.',
          'Above the shelf, wedged in the rock, something that is not rock: timbers. The ribs of a ship.',
        ], 'There are the bones of a ship on the Bird Rock.');
      },
      again: () => isleCard('birdrock', 'The Bird Rock', ['The birds rise in a screaming cloud as you come ashore, and settle again when they see it is only you.'], null),
      locs: {
        brCleft: {
          name: 'The Cleft', x: 250, y: 178, cost: { water: 1 }, time: 3, art: 'salem',
          findable: () => true,
          sighted: 'Above the landing shelf, jammed into a cleft in the rock, the ribs of a ship.',
          sees: [['brTop', 1, 'Behind the wreck, a way up: steps, cut into the rock by hand.']],
          first() {
            G.done('brCleft', [
              'Jammed into the cleft, where some great sea threw her years ago, are the bones of a ship. Not the <i>Calliope</i>: bigger, and older. On a fragment of her stern board, in letters that were once gilt, you can make out <i>…ANT, SALEM</i>.',
              'She had a figurehead, once. The empty bolt-holes are still there at her stem. You know where it went: it is on your own island\'s bird cliffs, her carved woman with her hands crossed on her breast.',
            ], null, 'A ship from Salem lies broken in the cleft on the Bird Rock. Her figurehead is on your island\'s bird cliffs.');
          },
          repeat: () => G.done('brCleft', 'The old ship groans when the wind gets into her, as if she would still be off, if she could.'),
        },
        brLedges: {
          name: 'The Ledges', x: 368, y: 148, cost: { water: 1 }, time: 3, art: 'birdrock',
          findable: () => true,
          sighted: 'Up the seaward face of the rock, ledge after ledge of nesting birds.',
          first: () => G.done('brLedges', 'Ledge after ledge of birds, so many that the rock moves. They scream at you, and you take their eggs anyway.', { food: rand(3, 4) }, 'The ledges on the Bird Rock are thick with eggs, if you will brave the birds.'),
          repeat: () => G.done('brLedges', 'The birds have laid again.', { food: rand(2, 4) }),
        },
        brTop: {
          name: 'The Top of the Rock', x: 300, y: 126, cost: { water: 1, food: 1 }, time: 4, art: 'birdrock',
          findable: () => !!S.visits.brCleft,
          clue: 'Behind the old wreck, steps go up the rock: cut by hand. They are slick with droppings, and you do not trust them yet.',
          sighted: 'Behind the wreck, steps cut by hand go up to the top of the rock.',
          first: salemMessage,
          repeat: () => G.done('brTop', 'The wind is never still up here. The words in the rock are wearing away.'),
        },
      },
      trail: [
        [3, 'You scramble about the rock for an hour, and find nothing but birds, and more birds.', null, 'birdrock'],
        [1, 'In a crack in the rock, a rusted iron spike from the Salem ship.', { iron: 1 }, 'salem'],
        [1, 'A seal hauls out on the shelf below you, looks up at you with great wet eyes, and decides you are not worth moving for.', null, 'birdrock'],
      ],
      places: [
        {
          id: 'eggs', label: 'take eggs', cd: 15,
          show: () => !!S.visits.brLedges,
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
          show: () => !!S.visits.brCleft,
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
      stream: 1, palms: 1,
      far: () => (S.flags.wayfinder ? null
        : S.flags.promise ? 'only Tavake\'s people know the way: follow their canoes'
          : 'too far for her: she would never come back against the trades'),
    },
  });

  /** The island the castaway is on, or null at home. */
  G.isle = () => ISLES[S.isle] || null;

  /** What Jem says at the lookout, the first time he is there with the castaway: as little as he can. */
  function lookoutJem() {
    if (!G.withJem() || S.flags.lookoutJem) return [];
    S.flags.lookoutJem = 1;
    return [
      'Jem will not come up to the cairn. He stands off in the grass, looking at the word under the beans, and looking away.',
      quote('"Whose watch was it?" you ask him. "Everybody\'s," he says. "Mine, some nights." That is all he will say, and he says it too quickly.'),
    ];
  }

  /** The Meridian's old watering camp on the High Island, and the wreck of a letter. */
  function meridianCamp() {
    S.flags.meridianCamp = 1;
    AU.sfx('page');
    G.done('hiCamp', [
      'Round the point, in the lee of the forest, somebody has camped: a ring of fire-blackened stones, the ashes long cold, a bed of cut fern, the stumps of a dozen saplings cut with a ship\'s axe. Empty bread bags. A broken water breaker. They stayed some days, and filled their casks, and went.',
      'In the ashes, a scrap of paper the fire did not quite finish. Most of it is gone. What is left is in a clerk\'s hand:',
      quote('…of pig iron, forty tons, consigned to Messrs Morrow &amp;…'),
      'Morrow. You think of the sealed parcel, and the name on it.',
    ], null, 'The Meridian camped on the High Island, and her papers name someone called Morrow.');
  }

  /** From the High Island's ridge: the whole archipelago, and the island where fires burn, far to the south. */
  function highRidge() {
    S.charted.smoke = 1;
    AU.sfx('page');
    G.done('hiRidge', [
      'It takes you half a day to fight your way up through the forest to the ridge, and when you come out above the trees you can see the whole archipelago laid out like a chart: your island to the north-east, the islet, the black tooth of the Bird Rock, and the sea shining between them.',
      'And far to the south, further than any of them, a big island, blue with distance, with a thread of smoke going straight up from it into the still air. Then another. Cookfires. A village.',
      'Too far, and the wrong way. Not with this boat.',
    ], null, 'Far to the south of the High Island lies an island where people live.');
  }

  /** At the top of the Bird Rock, the Salem crew's last words, cut into the stone: the god went away in their boat. */
  function salemMessage() {
    S.flags.salemMessage = 1;
    AU.sfx('page');
    const text = [
      'The top of the rock is a flat place no bigger than a cabin floor, swept by the wind. Somebody lived up here once: there is a ring of stones for a fire, and a gutter cut to catch the rain.',
      'And words, cut into the rock with a knife, letter by letter, by somebody who had a long time to do it:',
      quote('<i>…ANT</i> OF SALEM WRECKED HERE MARCH 1809. 9 OF US. THE MATE TOOK THE LONGBOAT &amp; 3 MEN &amp; THE HEATHEN GOD WE TOOK FROM THE ISLAND FOR HELP. HE HAS NOT COME BACK. GOD FORGIVE US. J.P.'),
      'Below it, a column of notches. It stops.',
    ];
    if (!S.charted.sandbar) {
      S.charted.sandbar = 1;
      text.push('From up here you can see a long way. To the north, there is a line of white water where there should be nothing: a sandbar.', gainLine('You mark the Sandbar on your chart.'));
    }
    G.done('brTop', text, null, 'On the Bird Rock, the Salem crew cut their last words into the stone: their mate took the heathen god away in the longboat, and never came back.');
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

  /** Combs the islet: the boat's remains first (enough canvas to patch her sail), then fibre, shellfish, eggs, driftwood and now and then canvas. */
  function combIslet() {
    S.n.combIslet = (S.n.combIslet || 0) + 1;
    const c = S.n.combIslet;
    if (c === 1) {
      log(`Along the edge of the reef, what the sea spat back out of the ${G.boatName()}, her torn sail among it: ${gain({ rope: 2, cloth: 3, wood: 2 })}.`);
    } else if (c === 2) {
      log(`The islet's few palms have shed their dead fronds into the sand: ${gain({ fibre: 3 })}.`);
    } else if (c === 3) {
      log(`Wedged in the coral at the tide line, a broken spar: ${gain({ wood: 4 })}. It might do for a mast.`);
    } else if (chance(0.06) && G.awayHappening()) {
      // something turned up
    } else {
      const roll = Math.random();
      if (roll < 0.08) log(`A rag of canvas tangled in the weed at the tide line, from your own sail or somebody else's: ${gain({ cloth: 1 })}.`);
      else if (roll < 0.35) log(`You gather ${gain({ fibre: rand(1, 2) })} from under the palms.`);
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

  /** A trip exploring another island that finds no new place: something from its `trail`. */
  G.awayWander = function () {
    const trail = G.isle().trail || [[1, 'You walk until your feet are sore, and find nothing you have not seen before.', null]];
    let roll = Math.random() * trail.reduce((t, [w]) => t + w, 0);
    const [, text, got, art] = trail.find(([w]) => (roll -= w) < 0);
    G.wanderCard(text, got, art);
  };

  /** Something happens away from the island, if anything can here. */
  G.awayHappening = () => G.happen(AWAY.filter((e) => !e.isles || e.isles.includes(S.isle)));
})();
