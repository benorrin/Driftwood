/* Driftwood — the camp.
 * The things to do on the beach, the things to make, and the raft. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, rand, chance, pick, cap, quote, gainLine, VERSES, CRUSOE,
    has, pay, add, gain, log, heal, damage, setFire, isNight, save,
    modal, leave, startCooldown, BTNS, cooldowns,
  } = G;

  /* ---------------- camp actions ---------------- */

  /**
   * Actions on the beach. Each has a cooldown `cd` in seconds, an optional
   * `cost`, `show()` (whether it is offered yet), an optional `enabled()`
   * with a `note()` saying why not, and `run()`, which does the deed.
   */
  G.ACTIONS = [
    {
      id: 'rest', label: 'rest', cd: 20,
      show: () => G.ailing(),
      enabled: () => S.n.rested !== S.day,
      note: () => (S.n.rested === S.day ? 'rested today' : ''),
      run() {
        S.n.rested = S.day;
        heal(1);
        log('You lie in the shade all morning and let the island go on without you. It does you good.');
        G.mend();
      },
    },
    {
      id: 'gather', label: 'gather driftwood', cd: 5,
      show: () => true,
      run() {
        const n = rand(1, 3) + (S.items.axe ? 1 : 0);
        add('wood', n);
        AU.sfx('gather');
        if (!S.flags.firstWood) {
          S.flags.firstWood = 1;
          log('Bleached wood, light as bone. The sea gives it up grudgingly.');
        } else {
          log(pick([`You drag ${n} driftwood above the tide line.`, `${n} driftwood, salt-white and dry.`, `The tide line yields ${n} driftwood.`]));
        }
      },
    },
    {
      id: 'light', label: 'light a fire', cd: 3, cost: { wood: 3 },
      show: () => S.fire === 0 && S.seen.wood,
      run() {
        AU.sfx('fire');
        if (!S.flags.fireLit) {
          S.flags.fireLit = 1;
          log("You prime the pistol's pan with a pinch of powder and strike the flint over dry fronds. A spark. Another. Then smoke, and flame.", 'lore');
          log('Light, and warmth. The night will be kinder now.');
        }
        setFire(2);
      },
    },
    {
      id: 'stoke', label: 'stoke the fire', cd: 4, cost: { wood: 1 },
      show: () => S.fire > 0,
      enabled: () => S.fire < 4,
      run() {
        AU.sfx('stoke');
        setFire(S.fire + 1);
      },
    },
    {
      id: 'comb', label: 'comb the beach', cd: 8,
      show: () => S.flags.fireLit,
      run: () => (G.atHome() ? comb() : G.combAway()),
    },
    {
      id: 'climb', label: 'climb a palm', cd: 12,
      show: () => (G.atHome() ? S.flags.climb : G.isle().palms),
      enabled: () => !S.ail.ankle,
      note: () => (S.ail.ankle ? 'not on that ankle' : ''),
      run() {
        AU.sfx('gather');
        if (chance(0.08)) {
          AU.sfx('hurt');
          G.achieve('palm');
          damage(1, 'fall');
          if (!S.ended) {
            G.notice('A Fall', ['Halfway up, a frond gives way in your hand, and you fall the height of a man onto the roots.', gainLine('You lose 1 health.')],
              'You fell from a palm.', ART.scene('grove'));
          }
          return;
        }
        log(`From the crown of the palm: ${gain({ food: rand(1, 2), water: 1, fibre: rand(1, 2) })}.`);
      },
    },
    {
      id: 'water', label: 'fetch water', cd: 15,
      show: () => (G.atHome() ? S.flags.spring : G.isle().stream),
      run() {
        AU.sfx('water');
        log(`You carry ${gain({ water: rand(3, 5) + (S.items.waterskin ? 2 : 0) })} back from the ${G.atHome() ? 'spring' : 'stream'}.`);
      },
    },
    {
      id: 'fish', label: 'spear fish', cd: 12,
      show: () => S.items.spear,
      run() {
        AU.sfx('splash');
        if (chance(0.07)) {
          G.fight('reefshark', {
            onWin: () => {
              log(`You drag the shark up the beach: ${gain({ food: 6 })}, and a good deal of nerve.`);
              G.closeModal();
            },
            onFlee: () => log('You splash ashore and do not go back in today.'),
          });
          return;
        }
        if (chance(0.25)) {
          log(pick(['The fish are wiser than you today.', 'A flash of silver, and nothing on the spear.', 'You stand in the shallows until your legs go numb. Nothing.']));
        } else {
          log(`You wade back with ${gain({ food: rand(2, 3) })}.`);
        }
      },
    },
    {
      id: 'fell', label: 'fell timber', cd: 10,
      show: () => S.items.axe && (G.atHome() || G.isle().timber),
      run() {
        AU.sfx('chop');
        log(`The stone axe bites slowly. ${cap(gain({ timber: rand(2, 3) }))}.`);
      },
    },
    {
      id: 'salvage', label: 'salvage the wreck', cd: 25,
      show: () => S.flags.wreckHold && G.atHome(),
      enabled: () => G.lowTide(),
      note: () => (G.lowTide() ? '' : 'wait for low water'),
      run() {
        AU.sfx('chop');
        S.n.salvage++;
        const got = { iron: rand(1, 2), cloth: chance(0.5) ? 1 : 0, timber: chance(0.5) ? 1 : 0 };
        // every sixth trip turns up a little dry powder
        if (S.n.salvage % 6 === 0) got.shot = 1;
        log(`Out on the reef at low water, you pry loose ${gain(got)}.`);
      },
    },
    {
      id: 'read', label: 'read by firelight', cd: 45,
      show: () => S.items.bible && S.fire > 0 && isNight(),
      run() {
        AU.sfx('page');
        S.n.read = (S.n.read || 0) + 1;
        if (S.items.crusoe && chance(0.5)) log(`From Crusoe: "${pick(CRUSOE)}"`, 'lore');
        else log(`"${pick(VERSES)}"`, 'lore');
        heal(1);
      },
    },
  ];

  /**
   * Combs the beach. The first few searches each turn up something new
   * (fibre, stone, the lie of the land, canvas). From the fifth on, once
   * the grove is on the map, the next finds the bottle; otherwise finds are
   * random, with now and then a happening.
   */
  function comb() {
    S.n.comb++;
    const c = S.n.comb;
    AU.sfx('comb');
    if (c === 1) {
      add('fibre', 3);
      log('Dead palm fronds tangled in the seaweed at the tide line. Their fibres could be twisted into rope.');
    } else if (c === 2) {
      add('stone', 2);
      log('Smooth grey stones, heavy in the hand. Some are flint-hard and hold an edge.');
    } else if (c === 3) {
      makeshiftMap();
    } else if (c === 4) {
      add('cloth', 1);
      log("A rag of canvas half-buried in the sand. Somebody else's sail, once.");
    } else if (c >= 5 && !S.flags.bottle && S.mapped.grove) {
      bottle();
    } else if (c > 6 && chance(0.15) && G.washedUp()) {
      // a happening washed up with the tide
    } else {
      combRandom();
      // the ebb leaves shellfish in the wet sand
      if (G.tideKnown() && G.lowTide() && chance(0.4)) log(`At low water, in the wet sand: ${gain({ food: 1 })}.`);
    }
  }

  /** From a dune the castaway sees the lie of the land, and draws a map on a page of the Bible. */
  function makeshiftMap() {
    S.flags.chart = 1;
    S.items.map = 1;
    AU.sfx('page');
    modal({
      art: G.mapArt(),
      title: 'A Makeshift Map',
      text: [
        'Whilst combing the beach you climb the crest of a high dune, and for the first time see the shape of the land: a long green hump of an island, hills to the north, and inland, past the dunes, a darker green that might be trees.',
        "You tear the blank flyleaf from the back of the Bible, beg its pardon, and with a charred stick from the fire draw a makeshift map: the coast, the hills, your camp. The rest is empty paper.",
        gainLine('To fill it in, you will have to go exploring.'),
      ],
      choices: [leave('fold it into the Bible', 'Your map is kept in the Bible. Explore the island to add to it.', 'lore')],
    });
  }

  /** A random find from the beach. */
  function combRandom() {
    const roll = Math.random();
    if (roll < 0.36) log(`You gather ${gain({ fibre: rand(2, 3) })} from the dune grass.`);
    else if (roll < 0.58) log(`${cap(gain({ stone: rand(1, 2) }))}, worn smooth by the surf.`);
    else if (roll < 0.76) log(`A fallen coconut: ${gain({ food: 1, water: 1 })}.`);
    else if (roll < 0.88) log(`A crab, too slow: ${gain({ food: 1 })}.`);
    else if (roll < 0.96) log(`A strip of canvas, washed up from somewhere: ${gain({ cloth: 1 })}.`);
    else log(`${cap(gain({ wood: rand(2, 4) }))} — a broken spar, by the look of it.`);
  }

  /** The message in a bottle from Captain Hale, which points the way to the wreck. */
  function bottle() {
    S.flags.bottle = 1;
    AU.sfx('pickup');
    modal({
      art: ART.scene('bottle'),
      title: 'A Message',
      text: [
        'Something glints at the water\'s edge: a bottle of green glass, washed ashore on the morning tide. Its neck is sealed with wax gone grey with age. Inside, a curl of paper.',
        quote('To any Christian soul who finds this. The brig <i>Calliope</i>, of Liverpool, struck upon a reef off this island the 9th of March, 1826. Eleven of us came ashore. We are camped by the eastern rocks. God send a ship. — J. Hale, Captain.'),
        'Twenty years ago. You look east, toward the rocks.',
      ],
      choices: [leave('look east', 'Somewhere off the eastern rocks lies the wreck of the Calliope. If you go exploring, you may find her.', 'lore')],
    });
  }

  /** Performs camp action `a`: pays its cost, starts its cooldown and runs it. */
  G.doAction = function (a) {
    if (a.cost && !has(a.cost)) return;
    if (a.cost) pay(a.cost);
    cooldowns[a.id] = performance.now() + a.cd * 1000;
    startCooldown(BTNS.get(a.id), a.cd);
    setTimeout(G.render, a.cd * 1000 + 30);
    a.run();
    G.render();
  };

  /* ---------------- making things ---------------- */

  /**
   * Things to make. Each gives resources (`gives`), a possession (`item`)
   * or else a structure, of which at most `max` may be built. Only those
   * marked `anywhere` can be made away from the island.
   */
  G.RECIPES = [
    {
      id: 'rope', label: 'twist rope', cost: { fibre: 3 }, gives: { rope: 1 }, anywhere: true,
      show: () => S.seen.fibre,
      msg: 'You roll palm fibre against your thigh until it becomes rope.',
    },
    {
      id: 'leanto', label: 'lean-to', cost: { wood: 8, fibre: 6 }, max: 1,
      show: () => S.flags.fireLit && S.seen.fibre,
      msg: 'A roof of fronds over a ridge-pole. It is not much, but the dew no longer finds you.',
    },
    {
      id: 'knife', label: 'stone knife', cost: { stone: 2, rope: 1 }, item: 'knife',
      show: () => S.seen.stone && S.seen.rope,
      msg: 'You chip a flake of stone to a sharp edge and bind on a handle. A tool. A weapon.',
    },
    {
      id: 'spear', label: 'fishing spear', cost: { wood: 4, rope: 1 }, item: 'spear',
      show: () => S.items.knife,
      msg: 'A long straight pole, its point split four ways and spread with a wedge. For fish. Or worse.',
    },
    {
      id: 'axe', label: 'stone axe', cost: { stone: 3, wood: 3, rope: 2 }, item: 'axe',
      show: () => S.items.knife,
      msg: 'Heavy, ugly, and it will fell a tree — eventually.',
    },
    {
      id: 'catcher', label: 'rain catcher', cost: { cloth: 2, wood: 4, rope: 1 }, max: 3,
      show: () => S.seen.cloth && S.seen.rope,
      msg: 'Canvas stretched between two posts, sagging to a shell. When it rains, you will drink.',
    },
    {
      id: 'trap', label: 'fish trap', cost: { wood: 6, rope: 2 }, max: 3,
      show: () => S.items.knife,
      msg: 'A crescent of stakes in the shallows. The tide brings the fish in and forgets to take them out.',
    },
    {
      id: 'rack', label: 'smoking rack', cost: { timber: 4, rope: 2 }, max: 1,
      show: () => S.seen.timber && S.built.trap,
      msg: 'Fish split and hung over a smoky fire will keep for weeks. The fish traps now feed you twice over.',
    },
    {
      id: 'torch', label: 'torch', cost: { wood: 1, fibre: 2 }, gives: { torch: 1 }, anywhere: true,
      show: () => S.flags.chart,
      msg: 'Fibre bound tight about a stick. It will burn an hour, perhaps.',
    },
    {
      id: 'waterskin', label: 'waterskin', cost: { hide: 2, rope: 1 }, item: 'waterskin',
      show: () => S.seen.hide,
      msg: 'Hide sewn into a bag and sealed with fat. You can go further now.',
    },
    {
      id: 'pyre', label: 'signal pyre', cost: { wood: 40, timber: 15, fibre: 15, gum: 6 }, max: 1,
      show: () => S.flags.summit,
      msg: 'You haul it all up the headland, armful by armful, and build a pyre taller than a man, its heart packed with gum for a black smoke. Now you watch the north, and wait for the trade winds to turn.',
    },
  ];

  /** The raft, built in parts; a part with `needs` must wait for that part first. */
  G.RAFT = [
    {
      id: 'hull', label: 'lash the hull', cost: { timber: 20, rope: 10, gum: 6 },
      note: 'twelve logs, bound, pinned and caulked',
      msg: 'Twelve logs, lashed with rope, pinned with wooden pegs, and every seam paid with gum. It floats. It actually floats.',
    },
    {
      id: 'mast', label: 'raise the mast', cost: { timber: 8, iron: 5, rope: 4 }, needs: 'hull',
      note: 'a mast and yard, iron-banded',
      msg: 'The mast stands. You lean on it and it does not give.',
    },
    {
      id: 'sail', label: 'sew the sail', cost: { cloth: 10, rope: 5 }, needs: 'mast',
      note: 'a square of patched canvas',
      msg: "You sew the Calliope's canvas into a sail with a bone needle. Her ghost will carry you.",
    },
    {
      id: 'casks', label: 'build water casks', cost: { timber: 5, iron: 8 }, needs: 'hull',
      note: 'staves and hoops from the wreck',
      msg: 'Two casks, tight enough. Water for a fortnight, if you are careful.',
    },
  ];

  /**
   * The common shape of all making: if `cost` can be paid, pays it, runs
   * `effect`, logs `msg` and saves. Does nothing if it can't be afforded.
   */
  function craft(cost, msg, effect) {
    if (!has(cost)) return;
    pay(cost);
    AU.sfx('craft');
    effect();
    log(msg);
    save();
  }

  /** Makes recipe `rc`. */
  G.make = function (rc) {
    craft(rc.cost, rc.msg, () => {
      if (rc.gives) gain(rc.gives);
      else if (rc.item) S.items[rc.item] = 1;
      else S.built[rc.id] = G.builtCount(rc.id) + 1;
      if (rc.id === 'leanto') heal(2);
      if (rc.id === 'pyre') {
        S.n.pyreDays = 0;
        G.queueModal({
          art: ART.scene('summit', { pyre: 1 }),
          title: 'The Signal Pyre',
          text: [
            'It stands on the summit, taller than a man, its heart packed with gum for a black smoke that will show by day. It is not to be lit yet: a fire lit for nobody burns out for nobody.',
            S.flags.trades
              ? 'The trade winds have turned. Any morning now, a sail may come past the north headland, and then you will light it. You might keep watch from the summit, too.'
              : 'Hale wrote that the whalers pass the north headland only when the trade winds turn. Until then, no ship will come close enough to see it. When the winds turn, watch for a sail.',
          ],
          choices: [G.leave('go on')],
        });
      }
    });
  };

  /** Builds raft part `p`. */
  G.buildRaft = function (p) {
    craft(p.cost, p.msg, () => {
      S.raft[p.id] = 1;
    });
  };
})();
