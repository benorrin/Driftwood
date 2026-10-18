/* Driftwood — the island.
 * The places on the chart and the journeys to them. What happens at the
 * wreck, the cave and the hut is told in story.js. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, $, el, rand, chance, pick, gainLine,
    has, pay, costText, gain, log, save, session,
    modal, leave, fight, done, wreck, journal, hut,
  } = G;

  /** A `blocked()` check: the place can't be reached without possession `item`. */
  const requires = (item, why) => () => (!S.items[item] ? why : null);

  /**
   * The places on the island. Each has a name, a position on the chart, a
   * cost in supplies to travel there, a journey `time` in seconds, its
   * scene `art`, `known()` (whether it is on the chart yet), an optional
   * `blocked()` that returns the reason it can't be reached, and `first()`
   * and `repeat()` for the first and later visits.
   */
  const LOCS = (G.LOCS = {
    grove: {
      name: 'The Palm Grove', x: 204, y: 232, cost: { water: 1 }, time: 4, art: 'grove',
      known: () => S.flags.chart,
      first() {
        S.flags.climb = 1;
        modal({
          art: ART.scene('grove'),
          title: 'The Palm Grove',
          text: [
            'Beyond the dunes, a hundred coconut palms lean together against the wind. Fallen fronds lie thick as thatch underfoot, and green nuts hang in clusters high overhead.',
            'Fibre. Fruit. Shade. You could climb these, with patience and bark-skinned knees.',
            gainLine(`You gather ${gain({ fibre: 4, food: 2, water: 2 })}.`),
          ],
          choices: [leave('return to camp', 'You can climb the palms for coconuts now.')],
        });
      },
      repeat() {
        if (chance(0.22)) {
          fight('crab', {
            intro: 'Among the fallen nuts, a land crab big as a dinner plate turns to face you, claws raised.',
            onWin: () => done('grove', 'Its meat is sweet as lobster.', { food: 3 }),
          });
          return;
        }
        done('grove', pick(['The palms creak and sigh above you as you work.', 'Wind in the fronds like distant surf.']), {
          fibre: rand(3, 5), food: rand(1, 2), water: rand(1, 2),
        });
      },
    },

    tidepools: {
      name: 'The Tide Pools', x: 446, y: 236, cost: { water: 1, food: 1 }, time: 5, art: 'tidepools',
      known: () => S.visits.grove || S.flags.bottle,
      first() {
        modal({
          art: ART.scene('tidepools'),
          title: 'The Tide Pools',
          text: [
            'Black rock shelves step down into the sea, and at low water each holds a pool: anemones, darting fish, starfish red as wounds. Stone here is plentiful, and the pools are full of life.',
            'Then a scraping, clattering sound — and from a crevice drags something huge.',
          ],
          choices: [{
            label: 'stand your ground',
            fn: () => fight('crab', {
              canFlee: false,
              intro: 'A crab the size of a cartwheel, its shell crusted with barnacles, claws open wide enough to take your hand.',
              onWin: () => {
                S.flags.wreckSeen = 1;
                done('tidepools', 'You sit on the rocks, shaking, and eat crab until you can eat no more. Far out on the reef to the south-east, something that is not rock catches the light: the ribs of a ship.', { food: 4, stone: 4 });
              },
            }),
          }],
        });
      },
      repeat() {
        if (chance(0.25)) {
          fight('crab', { onWin: () => done('tidepools', 'The pools are yours again.', { food: 3, stone: rand(1, 2) }) });
          return;
        }
        done('tidepools', pick(['You pry limpets from the rocks and gather stones.', 'Small fish trapped by the ebb make easy catching.']), {
          food: rand(2, 4), stone: rand(2, 3),
        });
      },
    },

    spring: {
      name: 'The Spring', x: 252, y: 176, cost: { food: 1 }, time: 5, art: 'spring',
      known: () => S.visits.tidepools,
      blocked: requires('knife', 'the thicket is too dense without a blade'),
      first() {
        modal({
          art: ART.scene('spring'),
          title: 'The Spring',
          text: ['You hack through a wall of thorn and vine until your arms ache — and then you hear it: water, falling over stone. A spring wells out of the hillside into a clear, cold pool.'],
          choices: [{
            label: 'drink',
            fn: () => fight('viper', {
              intro: 'As you kneel at the edge of the pool, something on the warm stones uncoils.',
              onWin: () => {
                S.flags.spring = 1;
                S.flags.footprints = 1;
                done('spring', 'You drink until your belly aches. Then you see it, pressed into the mud at the water\'s edge: a footprint. Bare, broad, and not your own.', { water: 5 }, 'The island is not empty.');
              },
              onFlee: () => log('You will have to go back for that water.'),
            }),
          }],
        });
      },
      repeat() {
        // until the viper is beaten, every visit is the first
        if (!S.flags.spring) {
          this.first();
          return;
        }
        if (chance(0.15)) {
          fight('viper', { onWin: () => done('spring', 'You fill up and go.', { water: 5 }) });
          return;
        }
        done('spring', 'The water is cold enough to make your teeth ache.', { water: rand(5, 7) });
      },
    },

    wreck: {
      name: 'The Wreck', x: 540, y: 284, cost: { water: 1, food: 1 }, time: 6, art: 'wreck',
      known: () => S.flags.bottle || S.flags.wreckSeen,
      blocked: () => {
        if (S.flags.wreckCabin && S.flags.wreckHold) return 'picked clean (salvage from camp)';
        return (S.res.rope || 0) < 3 ? 'needs 3 cordage to cross the reef' : null;
      },
      first() {
        wreck(true);
      },
      repeat() {
        wreck(false);
      },
    },

    jungle: {
      name: 'The Jungle', x: 356, y: 158, cost: { water: 2, food: 1 }, time: 6, art: 'jungle',
      known: () => S.visits.spring,
      blocked: requires('axe', 'you need an axe to cut a path'),
      first() {
        modal({
          art: ART.scene('jungle'),
          title: 'The Jungle',
          text: ['The jungle closes over you like deep water. Green light, the shriek of birds you never see, the smell of rot and flowers. Your axe bites into vine after vine.'],
          choices: [{
            label: 'press on',
            fn: () => fight('boar', {
              canFlee: false,
              onWin: () => {
                S.flags.trail = 1;
                S.flags.footprints = 1;
                done('jungle', 'You butcher the boar where it fell. Further on you find a trail: narrow, worn smooth, and blazed with old knife-cuts. It winds north, toward a thread of smoke above the trees.', { food: 5, hide: 2, timber: 2 }, 'Someone else lives on this island.');
              },
            }),
          }],
        });
      },
      repeat() {
        modal({
          art: ART.scene('jungle'),
          title: 'The Jungle',
          text: ['The green closes behind you. What will you look for?'],
          choices: [
            {
              label: 'hunt boar',
              fn: () => fight('boar', { onWin: () => done('jungle', 'Meat, and hide for the curing.', { food: 5, hide: 2 }) }),
            },
            {
              label: 'cut timber',
              fn: () => {
                AU.sfx('chop');
                done('jungle', 'Straight young hardwoods, felled and trimmed.', { timber: rand(4, 6) });
              },
            },
            {
              label: 'forage',
              fn: () => done('jungle', 'Breadfruit, wild yams, vines for cord.', { food: rand(2, 3), fibre: rand(3, 4) }),
            },
          ],
        });
      },
    },

    cave: {
      name: 'The Cave', x: 216, y: 106, cost: { water: 1, food: 1, torch: 1 }, time: 6, art: 'cave',
      known: () => S.flags.caveKnown,
      first() {
        AU.sfx('bats');
        modal({
          art: ART.scene('cave'),
          title: 'The Cave',
          text: [
            'The cave mouth breathes cold air. Your torch throws shadows up the walls, and above you something shifts and squeaks — then the bats come, a thousand of them, pouring past your head into the daylight.',
            'Deeper in, where the floor is dry, eight shapes lie in a row beneath rotted blankets. A ninth sits apart against the wall, a book in its lap.',
          ],
          choices: [{ label: 'take the book', fn: journal }],
        });
      },
      repeat() {
        done('cave', S.flags.buried ? 'The cave is quiet. You do not stay long.' : 'The dead keep their silence.', { stone: rand(3, 5) });
      },
    },

    hut: {
      name: "The Wild Man's Hut", x: 420, y: 124, cost: { water: 1, food: 1 }, time: 6, art: 'hut',
      known: () => S.flags.trail && !S.flags.hollisDone,
      first: hut,
      repeat: hut,
    },

    summit: {
      name: 'The Summit', x: 300, y: 70, cost: { water: 2, food: 2 }, time: 8, art: 'summit',
      known: () => S.flags.summitKnown,
      blocked: requires('waterskin', 'too long a climb without a waterskin'),
      first() {
        S.flags.summit = 1;
        modal({
          art: ART.scene('summit'),
          title: 'The Summit',
          text: [
            'The climb takes the whole of the morning: thorn, scree, a chimney of crumbling rock where only the waterskin keeps you going. Then the top. The whole island beneath you, small as a hand, and all around it the sea. The great empty sea.',
            'To the north the water is darker where a current runs. A sea lane. If ships pass this island at all, they pass here — and from here, a great fire would be seen for thirty miles.',
          ],
          choices: [leave('descend', 'A signal pyre on the summit might be seen by a passing ship.', 'lore')],
        });
      },
      repeat() {
        const msg = S.built.pyre
          ? 'The pyre stands ready. The horizon stays empty. You gather eggs from the cliff nests.'
          : pick(['Whales blow, far to the north.', 'You watch the empty sea, and gather eggs from the cliff nests.']);
        modal({
          art: ART.scene('summit', { pyre: S.built.pyre }),
          title: 'The Summit',
          text: [msg, gainLine(gain({ food: rand(2, 3) }))],
          choices: [leave('descend')],
        });
      },
    },
  });

  /* ---------------- journeys ---------------- */

  /** The reason location `L` can't be reached right now, or null. */
  G.blockedReason = (L) => (L.blocked && L.blocked()) || null;

  /** The locations on the chart, with what the chart needs to draw their markers. */
  G.knownLocs = function () {
    return Object.keys(LOCS).filter((id) => LOCS[id].known()).map((id) => ({
      id,
      name: LOCS[id].name,
      x: LOCS[id].x,
      y: LOCS[id].y,
      visited: !!S.visits[id],
      blocked: !!G.blockedReason(LOCS[id]),
    }));
  };

  /**
   * Sets out for location `id`: pays the supplies, shows a travel bar for
   * the journey's length, then plays the first or a repeat visit.
   */
  G.expedition = function (id) {
    const L = LOCS[id];
    if (!L) return;
    const why = G.blockedReason(L);
    if (why) {
      log(`${L.name}: ${why}.`);
      return;
    }
    if (!has(L.cost)) {
      log(`You lack the supplies for that journey: ${costText(L.cost)}.`);
      return;
    }
    pay(L.cost);
    AU.sfx('step');
    const generation = session.generation;
    modal({ art: ART.scene(L.art), title: L.name, text: [`You set out for ${L.name.toLowerCase()}…`], choices: [] });
    const bar = el('div', 'travel', '<div></div>');
    bar.firstChild.style.animationDuration = `${L.time}s`;
    $('#modal-choices').appendChild(bar);
    const steps = setInterval(() => AU.sfx('step'), 650);
    setTimeout(() => {
      clearInterval(steps);
      // the game may have been restarted, or ended, while travelling
      if (session.generation !== generation || S.ended) return;
      S.visits[id] = (S.visits[id] || 0) + 1;
      if (S.visits[id] === 1) L.first();
      else L.repeat();
      save();
      G.render();
    }, L.time * 1000);
  };
})();
