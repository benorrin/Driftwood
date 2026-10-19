/* Driftwood — the archipelago.
 * The second chapter: the voyage ends on the reef of an islet west of the
 * island, within sight of other islands no one could see from the summit.
 * The castaway patches the boat, waits for the wind to come round, and
 * sails home. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, rand, chance, pick, cap, gainLine, RES, RES_ORDER, WINDS, PATCH, SAIL_HOME, view,
    has, pay, add, gain, log, save, isNight, modal, closeModal, leave,
  } = G;

  /** Days at sea before the reef, and on the passage home. */
  const VOYAGE_DAYS = 4;
  const HOMEWARD_DAYS = 2;

  /** Each dawn's chance that the trades give way to a westerly, or die to a calm. */
  const WESTERLY_CHANCE = 0.18;
  const CALM_CHANCE = 0.1;

  /** Days on the islet before the first westerly comes, whatever the odds. */
  const SURE_WESTERLY = 5;

  /** What the boat is called in the telling. */
  const boatName = () => (S.boat.kind === 'canoe' ? 'canoe' : 'raft');

  /** Puts the fire out without counting it against the castaway: it was left, not let go. */
  function leaveFire() {
    S.fire = 0;
    S.fireT = 0;
    AU.setFire(0);
  }

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
    S.day += VOYAGE_DAYS;
    S.n.wreckDay = S.day;
    S.t = 20;
    leaveFire();
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
    modal({
      art: ART.scene('islet'),
      title: 'Chapter Two',
      text: [
        '<p class="dateline">The Archipelago</p>',
        'You climb to the highest point of the islet, which is not high, and turn slowly about.',
        'To the east, low and blue on the horizon, lies a long hump of land with a peak at its northern end. You would know it anywhere. It is your island, and the wind is blowing the wrong way.',
        'And to the south and west, where you had thought there was only sea, there are more: low smudges of palms on the horizon, too low ever to show from the summit. You were never alone out here. You only could not see.',
      ],
      choices: [{
        label: 'go down to the wreck',
        fn: () => {
          closeModal();
          log(`Day ${S.day}`, 'day');
          log('You are cast away again, on an islet west of your island.', 'lore');
          log(`Patch the ${boatName()}, and wait for a westerly to carry you home.`, 'lore');
          G.render();
        },
      }],
    });
  }

  /* ---------------- the wind ---------------- */

  /**
   * At dawn the wind may shift: the trades mostly, now and then a westerly
   * for a day or two, or a calm. The first westerly never keeps a castaway
   * on the islet longer than SURE_WESTERLY days.
   */
  G.shiftWind = function () {
    const was = S.wind;
    const roll = Math.random();
    let next;
    if (was === 'westerly') next = roll < 0.5 ? 'westerly' : 'trades';
    else if (was === 'calm') next = roll < 0.4 ? 'calm' : roll < 0.8 ? 'trades' : 'westerly';
    else next = roll < WESTERLY_CHANCE ? 'westerly' : roll < WESTERLY_CHANCE + CALM_CHANCE ? 'calm' : 'trades';
    if (!G.atHome() && !S.n.westerlies && S.day - S.n.wreckDay >= SURE_WESTERLY) next = 'westerly';
    if (next === 'westerly' && was !== 'westerly') S.n.westerlies = (S.n.westerlies || 0) + 1;
    S.wind = next;
    if (next !== was) log(WINDS[next][1], 'lore');
  };

  /* ---------------- the islet ---------------- */

  /**
   * Combs the islet's beach. The first searches turn up what the reef
   * spared of the boat; after that, fibre, shellfish, eggs and driftwood,
   * and now and then a happening.
   */
  G.combIslet = function () {
    S.n.combIslet = (S.n.combIslet || 0) + 1;
    const c = S.n.combIslet;
    AU.sfx('comb');
    if (c === 1) {
      log(`Along the edge of the reef, what the sea spat back out of the ${boatName()}: ${gain({ rope: 2, cloth: 2, wood: 2 })}.`);
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
  };

  /** Things that happen on the islet, now and then. */
  const AT_ISLET = [
    {
      id: 'bristowBack', limit: 1, weight: 3,
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
      id: 'isletLog', limit: 2,
      run: () => log(`A whole tree comes in on the tide, roots and all, from some island upwind: ${gain({ wood: 4 })}.`),
    },
    {
      id: 'isletFire', limit: 1,
      when: () => isNight(),
      run: () => log('Far to the south, low on the horizon, a point of light burns for an hour and goes out. A fire. Somebody else is out here.', 'lore'),
    },
    {
      id: 'isletWeather', weight: 2,
      run: () => log(pick(isNight()
        ? ['The birds settle on the islet in their thousands, and grumble all night.', 'The surf on the reef never stops. You stop hearing it, and then hear it again.']
        : ['The sun comes off the white sand like the heat off an oven door.', 'A shark cruises the lagoon side of the reef, back and forth, patient as a sentry.', 'From the top of the islet you can see your island, blue and far. It does not get any nearer.'])),
    },
  ];

  /** Something happens away from the island, if anything can. */
  G.awayHappening = () => G.happen(AT_ISLET);

  /* ---------------- the passage home ---------------- */

  /** Whether every part of the boat has been patched. */
  G.boatMended = () => PATCH.every((p) => S.boat[p.id]);

  /** Patches part `p` of the boat, if it can be paid for. */
  G.patchBoat = function (p) {
    if (!has(p.cost)) return;
    pay(p.cost);
    AU.sfx('craft');
    S.boat[p.id] = 1;
    log(p.msg);
    save();
  };

  /** Why the patched boat can't sail for home just now, or null. */
  G.homewardBlocked = function () {
    if (S.wind === 'calm') return 'there is no wind';
    if (S.wind !== 'westerly') return 'the wind is foul: wait for a westerly';
    return null;
  };

  /** Puts to sea for home on the westerly. */
  G.sailHome = function () {
    if (!G.boatMended() || G.homewardBlocked() || !has(SAIL_HOME)) return;
    pay(SAIL_HOME);
    S.flags.sailing = 1;
    leaveFire();
    AU.sfx('splash');
    modal({
      art: ART.scene('raft'),
      title: 'Homeward',
      text: [
        `You push off at the top of the tide${S.flags.ally ? ', Hollis at the steering oar' : ''}, and the westerly finds the patched sail and leans on it, and the ${boatName()} groans in every lashing, and goes. Behind you the islet sinks into the sea like a stone into a pond.`,
        'All that day and all the night the wind holds. You steer by the peak of your island, and then by the stars above where it was, and you do not sleep.',
      ],
      choices: [{ label: 'sail on', fn: homeAgain }],
    });
  };

  /** Landfall on the castaway's own island, and the camp as it was left. */
  function homeAgain() {
    S.day += HOMEWARD_DAYS;
    S.t = 50;
    S.isle = 'home';
    S.flags.sailing = 0;
    S.flags.homeAgain = 1;
    view.tab = 'beach';
    view.sceneKey = '';
    const text = [
      `On the second evening the westerly dies, and the trades come back, and for one bad hour you think they will carry you past. Then the swell lifts you over the bar, and the ${boatName()} grounds on sand you know.`,
      `Your camp is as you left it, more or less: the fire is cold ash, the gulls have been at everything${S.built.leanto ? ', and a crab has moved into the lean-to' : ''}. But the water is sweet, and the island is yours.`,
    ];
    if (S.flags.ally) text.push('Hollis walks up the beach, lies down on his back in the sand, and laughs until he weeps.');
    if (S.flags.bristowLost) {
      // the tide got him home first
      delete S.flags.bristowLost;
      S.items.bristow = 1;
      text.push('And there above the tide line, half his face washed off, sits Bristow, waiting for you. The sea brought him home before you.');
    }
    modal({
      art: ART.scene('beach'),
      title: 'Home',
      text,
      choices: [leave('go up to the camp', `You are home. West of the island, beyond sight of the summit, lie other islands, and the patched ${boatName()} might reach them with the wind behind her.`, 'lore')],
    });
    save();
  }
})();
