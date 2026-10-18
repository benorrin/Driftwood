/* Driftwood — the island.
 * The places on the map, exploring to find them, and the journeys to them.
 * What happens at the wreck, the cave and the hut is told in story.js. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, $, el, rand, chance, pick, gainLine, CAMP_POS,
    has, pay, costText, gain, log, damage, heal, save, session, isNight,
    modal, leave, fight, armed, done, wreck, journal, hut,
  } = G;

  /** A `blocked()` check: the place can't be reached without possession `item`. */
  const requires = (item, why) => () => (!S.items[item] ? why : null);

  /**
   * The places on the island. Each has a name, a position on the map, a
   * cost in supplies to travel there, a journey `time` in seconds, its
   * scene `art`, an optional `blocked()` that returns the reason it can't
   * be reached, and `first()` and `repeat()` for the first and later visits.
   *
   * A place is on the map once `S.mapped[id]` is set. Those with
   * `findable()` can be found by exploring, or spotted from elsewhere, once
   * the story has given reason to look for them (the bottle tells of the
   * wreck, Hale's log of the cave, and so on), and are announced with their
   * `sighted` text; a trip that misses one may bring back its `clue`. The
   * story leads the castaway to the rest. `sees` lists places that may be
   * spotted from this one on a visit: [id, chance, what is seen].
   */
  const LOCS = (G.LOCS = {
    grove: {
      name: 'The Palm Grove', x: 204, y: 232, cost: { water: 1 }, time: 4, art: 'grove',
      findable: () => true,
      clue: 'From the dunes you can see a darker green inland. Trees, perhaps.',
      sighted: 'Inland, past the dunes, you push through sea-grape and scrub until the ground firms underfoot and the light turns green: a grove of coconut palms, a hundred strong.',
      sees: [
        ['spring', 0.3, 'From the crown of a palm you catch a glint of falling water, high in the hills to the north.'],
        ['cave', 0.2, 'From the crown of a palm you notice a dark gap in the cliffs beneath the north headland.'],
        ['lagoon', 0.35, 'From the crown of a palm you see still, pale water to the west, behind a line of surf.'],
      ],
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
        if (armed() && chance(0.22)) {
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
      findable: () => S.mapped.wreck,
      clue: 'Along the eastern shore the sand gives way to black rock, and the surf there sounds different.',
      sighted: 'You follow the shore east until the sand gives out and black rock begins, stepping down into the sea in shelves. At low water every shelf holds a pool, bright with life.',
      sees: [
        ['summit', 0.25, "From the rocks the island's highest peak stands plain, and you can make out a way up its eastern shoulder."],
        ['blowhole', 0.35, 'Along the shore to the west a plume of spray stands up out of the rocks, and falls, and stands up again.'],
      ],
      first() {
        if (!armed()) {
          done('tidepools', 'Black rock shelves step down into the sea, and at low water each holds a pool: anemones, darting fish, starfish red as wounds. From a crevice, a crab the size of a cartwheel watches you gather stones. You have nothing to fight it with, and keep your distance.', { food: 2, stone: 3 });
          return;
        }
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
              onWin: () => done('tidepools', 'You sit on the rocks, shaking, and eat crab until you can eat no more.', { food: 4, stone: 4 }),
            }),
          }],
        });
      },
      repeat() {
        if (armed() && chance(0.25)) {
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
      sees: [['jungle', 0.4, "From the ridge above the spring you look down on a sea of green: jungle, dense and dark, filling the island's heart."]],
      findable: () => S.mapped.wreck,
      clue: 'In a gully choked with thorn the ground is soft and green underfoot. There is water somewhere near.',
      sighted: 'Pushing up a gully choked with thorn, you stop dead. Under the din of the insects: running water. Fresh water, somewhere beyond the thicket. You will need a blade to cut your way through.',
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
      findable: () => S.mapped.grove && S.flags.bottle,
      clue: 'Far out on the eastern reef, at the bottom of the tide, something catches the light and is gone.',
      sighted: "You pick your way east along the rocks, as Hale's letter said, until the reef comes clear of the water. And there on it, heeled over and black with weed, lie the ribs of a ship. The <i>Calliope</i>.",
      sees: [
        ['tidepools', 0.5, "From the Calliope's tilted deck you look back at the island, and see black rock shelves along the shore to the west, glittering with pools."],
        ['cliffs', 0.25, 'Northward along the coast, cliffs stand white with birds.'],
      ],
      blocked: () => {
        if (S.flags.wreckCabin && S.flags.wreckHold) return 'picked clean (salvage from camp)';
        return (S.res.rope || 0) < 3 ? 'needs 3 rope to cross the reef' : null;
      },
      first() {
        wreck(true, sightings('wreck'));
      },
      repeat() {
        wreck(false, sightings('wreck'));
      },
    },

    jungle: {
      name: 'The Jungle', x: 356, y: 158, cost: { water: 2, food: 1 }, time: 6, art: 'jungle',
      // only once the footprint at the spring has been seen
      findable: () => S.flags.spring,
      clue: 'Past the spring the hills fall away into deep green, loud with birds you never see.',
      sighted: "From a ridge in the hills you look down on a sea of green: jungle, dense and dark, filling the island's heart. There is no way in without an axe to cut one.",
      sees: [
        ['summit', 0.3, 'Through a gap in the canopy you see the island\'s peak, close and clear, and a track winding up toward it.'],
        ['platform', 0.35, 'To the north, through the trees, a line of black stone runs too straight and too square to be natural.'],
        ['gumwood', 0.3, 'On the east wind comes a sharp, clean smell, like turpentine.'],
      ],
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
                S.mapped.hut = 1;
                S.flags.footprints = 1;
                done('jungle', 'You butcher the boar where it fell. Further on you find a trail: narrow, worn smooth, and marked by old knife-cuts in the trees. It winds north, toward a thread of smoke above the trees.', { food: 5, hide: 2, timber: 2 }, 'Someone else lives on this island. You draw the trail, and the smoke, on your map.');
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
      findable: () => S.flags.wreckCabin,
      clue: 'At dusk the bats pour out of the north headland in a thin black stream. They come out of something.',
      sighted: 'Under the north headland, half hidden by a fall of rock, a black mouth breathes cold air at you. A cave. You will want a torch to go in.',
      first() {
        AU.sfx('bats');
        modal({
          art: ART.scene('cave'),
          title: 'The Cave',
          text: [
            'The cave mouth breathes cold air. Your torch throws shadows up the walls, and above you something shifts and squeaks — then the bats come, a thousand of them, pouring past your head into the daylight.',
            'Deeper in, where the floor is dry, seven shapes lie in a row beneath rotted blankets. An eighth sits apart against the wall, a book in its lap.',
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
      gone: () => S.flags.hollisDone,
      first: hut,
      repeat: hut,
    },

    summit: {
      name: 'The Summit', x: 300, y: 70, cost: { water: 2, food: 2 }, time: 8, art: 'summit',
      findable: () => S.items.journal,
      clue: 'From the hills you can see the peak plainly, and what might be a way up.',
      sees: [
        ['cliffs', 0.4, 'From the top you can see the north-east coast, where the cliffs are white with birds.'],
        ['platform', 0.4, 'Below you, half lost in the jungle, a square of black stone stands out among the trees.'],
        ['gumwood', 0.4, 'In a fold of the eastern hills stands a grove of pale trees, unlike any you know.'],
      ],
      sighted: 'A track, faint as a crease in cloth, winds up from the scrub toward the highest peak. A long climb, and a dry one: you will want a waterskin.',
      blocked: requires('waterskin', 'too long a climb without a waterskin'),
      first() {
        S.flags.summit = 1;
        modal({
          art: ART.scene('summit'),
          title: 'The Summit',
          text: [
            'The climb takes the whole of the morning: thorns, loose stones, a narrow crack of crumbling rock where only the waterskin keeps you going. Then the top. The whole island beneath you, small as a hand, and all around it the sea. The great empty sea.',
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
    lagoon: {
      name: 'The Lagoon', x: 150, y: 166, cost: { water: 1 }, time: 4, art: 'lagoon',
      findable: () => S.mapped.grove,
      clue: 'West of the grove the air is full of the smell of still salt water.',
      sighted: 'West of the grove the land drops to a lagoon, still as glass behind its reef, the water so clear that the fish seem to hang in the air.',
      first() {
        done('lagoon', 'Drawn up above the water, half swallowed by sand, lies the hull of an outrigger canoe, far older than the <i>Calliope</i>. Its prow is carved with a face worn almost smooth. Others found this island long before Hale did — and went away again.',
          { food: 3, fibre: 2 }, 'Someone came to this island by canoe, long ago, and went away again.');
      },
      repeat() {
        done('lagoon', pick(['You wade the warm shallows for clams.', 'Fish hang in the clear water, slow and fat, easy to take.', 'You sit by the old canoe a while. Whoever made it knew the sea better than you.']), {
          food: rand(2, 3), fibre: rand(0, 2),
        });
      },
    },

    sealers: {
      name: "The Sealers' Camp", x: 140, y: 216, cost: { water: 1, food: 1 }, time: 5, art: 'sealers',
      findable: () => S.mapped.wreck,
      clue: 'On the western point a pole stands against the sky, too straight to have grown there.',
      sighted: 'On the western point, among the rocks where seals must once have hauled out, stand the ruins of a camp: a fallen roof, a rusted try-pot, a cross.',
      first() {
        done('sealers', 'Their tally board hangs by one nail: <i>2,140 skins. Sydney, 1811.</i> The cross says only <i>J. Mudge, aged 19, drowned.</i> There are no seals here now. They took them all, and then they went home.',
          { iron: 3, cloth: 1 }, 'Sealers worked this island once, until there was nothing left to kill.');
      },
      repeat() {
        done('sealers', pick(['You pick over the ruins. The sealers left little behind.', 'Wind whistles through the fallen roof.']), {
          iron: chance(0.4) ? 1 : 0, wood: rand(1, 3),
        });
      },
    },

    cliffs: {
      name: 'The Bird Cliffs', x: 474, y: 150, cost: { water: 1, food: 1 }, time: 6, art: 'cliffs',
      findable: () => S.mapped.wreck,
      clue: 'Gulls and frigate birds wheel by the thousand over the north-east, and the wind brings their cries.',
      sighted: 'On the north-east coast the land ends in cliffs white with birds — boobies, terns, frigate birds — and a din like market day.',
      first() {
        done('cliffs', "High on the cliff, wedged in a crack where some great sea threw it, is a carved wooden woman: a ship's figurehead, her paint long gone, her hands crossed on her breast. Not the <i>Calliope</i>'s; Hale's brig had a plain stem. Some other ship, then, and some other crew.",
          { food: 4 }, 'The Calliope was not the first ship this island has taken.');
      },
      repeat() {
        if (chance(0.12)) {
          AU.sfx('hurt');
          damage(1, 'fall');
          if (S.ended) return;
          done('cliffs', 'A ledge crumbles under your foot and you slide, clutching at nothing, until a root stops you. You climb down with what you have.', { food: 1 });
          return;
        }
        done('cliffs', pick(['You climb the lower ledges and fill your shirt with eggs.', 'The birds scream at you from every side as you take their eggs.']), { food: rand(3, 4) });
      },
    },

    gumwood: {
      name: 'The Gum Wood', x: 470, y: 198, cost: { water: 1, food: 1 }, time: 5, art: 'gumwood',
      // once there is a raft or a pyre to think of
      findable: () => S.flags.raftPlans || S.flags.summit,
      clue: 'On the east wind comes a sharp, clean smell, like turpentine, from somewhere inland.',
      sighted: 'In a fold of the eastern hills grows a stand of tall, pale-barked trees, their trunks weeping a golden gum that smells of turpentine.',
      blocked: requires('knife', 'you need a blade to tap the trees'),
      first() {
        done('gumwood', 'The old trunks are scored with herringbone cuts, long healed, where someone tapped them before you. The gum is sticky as honey, and burns with a thick black smoke. It would pay the seams of a hull. It would make a fire seen for miles.',
          { gum: 4 }, 'Tree gum: for caulking seams, or for smoke.');
      },
      repeat() {
        done('gumwood', pick(['You cut fresh channels and wait for the gum to run.', 'Your hands are black and sticky to the wrist.']), { gum: rand(3, 5) });
      },
    },

    blowhole: {
      name: 'The Blowhole', x: 392, y: 262, cost: { water: 1 }, time: 4, art: 'blowhole',
      findable: () => S.flags.wreckCabin,
      clue: 'Along the shore to the east you hear it again: a long, low groan, like something breathing.',
      sighted: 'Following the shore east of camp, you come on a shelf of black rock where the sea has bored a tunnel. With every swell it booms, and a plume of spray stands up out of the stone.',
      first() {
        done('blowhole', 'You wait for the tide to turn, and then you hear it. As each swell drains away the blowhole sighs, and moans, and mutters, very like a voice. So this is what young Hollis heard in the night. <i>The island is watching us.</i> It was only the sea, breathing.',
          { stone: 2 }, 'The groaning in the night was only the blowhole.');
      },
      repeat() {
        done('blowhole', pick(['The rock booms under your feet, and the spray falls on you like rain.', 'You time the swells, and gather stones from the shelf between them.']), { stone: rand(1, 2) });
      },
    },

    platform: {
      name: 'The Stone Platform', x: 372, y: 98, cost: { water: 2, food: 1 }, time: 6, art: 'platform',
      findable: () => S.mapped.jungle,
      clue: 'North of the jungle you glimpse, through the trees, a line of black stone too straight to be natural.',
      sighted: 'North of the jungle, swallowed by vines, the ground rises in steps: a great platform of fitted black stones, with upright slabs along its top.',
      blocked: requires('axe', 'the vines are too thick without an axe'),
      first() {
        done('platform', 'It is a temple platform, of the kind the missionaries call a <i>marae</i>: the work of the people whose canoe lies by the lagoon, perhaps. Long abandoned, its upright stones still face the sea. You take nothing, and leave as quietly as you came.',
          null, 'Long before any European ship, this island had its own people, and its own gods.');
      },
      repeat() {
        if (S.items.idol) {
          modal({
            art: ART.scene('platform'),
            title: 'The Stone Platform',
            text: ['You climb to the top step with the little carved figure in your hands. The upright stones look down at you, and at it.'],
            choices: [{
              label: 'return the figure',
              fn: () => {
                delete S.items.idol;
                S.flags.idolReturned = 1;
                heal(3);
                done('platform', 'You set the figure on the top step, facing the sea, as the great stones do. The clearing seems to let go of a breath it has been holding. On the way home, for the first time in days, nothing goes wrong.', null, 'The carved figure is home, and its ill luck with it.');
              },
            }],
          });
          return;
        }
        heal(1);
        done('platform', pick(['You sit a while on the lowest step. It is the most peaceful place on the island.', 'Someone has laid a ring of white shells on the top step. Hollis, you suppose.']), null);
      },
    },
  });

  /* ---------------- journeys ---------------- */

  /** What exploring costs in supplies, and how long it takes, in seconds. */
  const SCOUT_COST = { water: 1, food: 1 };
  const SCOUT_TIME = 6;

  /**
   * The chance that exploring finds a new place: FIRST_FIND for the first,
   * less by FIND_DROP for each place already on the map, but never below MIN_FIND.
   */
  const FIRST_FIND = 0.4;
  const FIND_DROP = 0.03;
  const MIN_FIND = 0.15;

  /**
   * The chance that a fruitless trip brings back a clue to a place that can
   * be found, and how much likelier the clue makes the next trip, which
   * finds that place first.
   */
  const CLUE_CHANCE = 0.5;
  const CLUE_BONUS = 0.2;

  /** Why no trip can be made just now, or null: at night, there must be a torch to light the way. */
  G.darkness = () => (isNight() && !S.res.torch ? 'too dark to go without a torch' : null);

  /** What a trip costing `cost` costs just now: at night, a torch as well, unless one is needed anyway. */
  G.tripCost = (cost) => (isNight() && !cost.torch ? Object.assign({}, cost, { torch: 1 }) : cost);

  /** The reason location `L` can't be reached right now, or null. */
  G.blockedReason = (L) => (L.blocked && L.blocked()) || G.darkness();

  /** Whether location `id` is on the map: drawn there, and not since gone. */
  const onMap = (id) => !!S.mapped[id] && !(LOCS[id].gone && LOCS[id].gone());

  /** The locations on the map, with what the map needs to draw their markers. */
  G.knownLocs = function () {
    return Object.keys(LOCS).filter(onMap).map((id) => ({
      id,
      name: LOCS[id].name,
      x: LOCS[id].x,
      y: LOCS[id].y,
      visited: !!S.visits[id],
      blocked: !!G.blockedReason(LOCS[id]),
    }));
  };

  /** The map as it now stands, for a story card. */
  G.mapArt = () => ART.chart(G.knownLocs(), CAMP_POS);

  /**
   * A journey: pays `cost`, shows `text` above a travel bar for `time`
   * seconds, then calls `arrive`, unless the game has moved on meanwhile.
   */
  function journey(title, art, text, cost, time, arrive) {
    pay(cost);
    AU.sfx('step');
    const generation = session.generation;
    modal({ art, title, text: [text], choices: [] });
    const bar = el('div', 'travel', '<div></div>');
    bar.firstChild.style.animationDuration = `${time}s`;
    $('#modal-choices').appendChild(bar);
    const steps = setInterval(() => AU.sfx('step'), 650);
    setTimeout(() => {
      clearInterval(steps);
      // the game may have been restarted, or ended, while travelling
      if (session.generation !== generation || S.ended) return;
      arrive();
      save();
      G.render();
    }, time * 1000);
  }

  /** Sets out for location `id`, then plays the first or a repeat visit. */
  G.expedition = function (id) {
    const L = LOCS[id];
    if (!L) return;
    const why = G.blockedReason(L);
    if (why) {
      log(`${L.name}: ${why}.`);
      return;
    }
    const cost = G.tripCost(L.cost);
    if (!has(cost)) {
      log(`You lack the supplies for that journey: ${costText(cost)}.`);
      return;
    }
    const lit = cost.torch && !L.cost.torch ? ' by torchlight' : '';
    journey(L.name, ART.scene(L.art), `You set out for ${L.name.toLowerCase()}${lit}…`, cost, L.time, () => {
      S.visits[id] = (S.visits[id] || 0) + 1;
      if (S.visits[id] === 1) L.first();
      else L.repeat();
    });
  };

  /** Whether place `id` can be found yet, by exploring or by sighting it. */
  const canFind = (id) => !S.mapped[id] && !!LOCS[id].findable && !!LOCS[id].findable();

  /** The chance that a trip exploring finds a new place. */
  const findChance = () => Math.max(MIN_FIND, FIRST_FIND - FIND_DROP * Object.values(S.mapped).filter(Boolean).length);

  /**
   * On a visit to `id`, each place that can be seen from it may be spotted,
   * and is drawn on the map. Returns paragraphs telling of it, for the card
   * that ends the visit.
   */
  function sightings(id) {
    const seen = (LOCS[id].sees || []).filter(([other, p]) => canFind(other) && chance(p));
    seen.forEach(([other]) => {
      S.mapped[other] = 1;
    });
    return seen.flatMap(([other, , text]) => [text, gainLine(`You mark ${LOCS[other].name.toLowerCase()} on your map.`)]);
  }
  G.sightings = sightings;

  /** Exploring finds place `id`: it is drawn on the map, and shown there. */
  function discover(id) {
    const L = LOCS[id];
    S.mapped[id] = 1;
    AU.sfx('page');
    modal({
      art: G.mapArt(),
      title: L.name,
      text: [L.sighted, gainLine(`You mark ${L.name.toLowerCase()} on your map.`)],
      choices: [leave('return to camp', `${L.name} is on your map now.`, 'lore')],
    });
  }

  /** A fruitless trip brings back a clue to place `id`, to be followed up next time. */
  function followClue(id) {
    modal({
      art: ART.scene('grove'),
      title: 'Exploring',
      text: [LOCS[id].clue, gainLine('You find nothing yet, but it is worth another look.')],
      choices: [leave('return to camp', `${LOCS[id].clue} You mean to look again.`, 'lore')],
    });
  }

  /**
   * Sets out to explore. A trip may find one of the places that can be found
   * yet, though the more of the island is mapped the harder that gets;
   * otherwise something else happens along the way.
   */
  G.scout = function () {
    const dark = G.darkness();
    if (dark) {
      log(`It is ${dark}.`);
      return;
    }
    const cost = G.tripCost(SCOUT_COST);
    if (!has(cost)) {
      log(`You lack the supplies to go exploring: ${costText(cost)}.`);
      return;
    }
    const how = isNight() ? 'You set out by torchlight' : 'You set out with your map';
    journey('Exploring', G.mapArt(), `${how}, into the parts of the island it does not show…`, cost, SCOUT_TIME, () => {
      const found = Object.keys(LOCS).filter(canFind);
      if (!found.includes(S.clue)) S.clue = null;
      if (found.length && chance(findChance() + (S.clue ? CLUE_BONUS : 0))) {
        discover(S.clue || pick(found));
        S.clue = null;
      } else if (found.length && !S.clue && chance(CLUE_CHANCE)) {
        S.clue = pick(found);
        followClue(S.clue);
      } else {
        G.wander();
      }
    });
  };

  G.SCOUT_COST = SCOUT_COST;
})();
