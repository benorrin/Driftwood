/* Driftwood — the sea.
 * Sailing in the second chapter: the wind, the boat (patched on the islet
 * and fitted out at home), passages between the island and the others,
 * what happens on the way, and coming home to a camp that was left. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, rand, pick, cap, gainLine, WINDS, PATCH, UPGRADES, ISLES, view,
    has, pay, add, gain, log, damage, setFire, save, modal, leave,
  } = G;

  /** Each dawn's chance that the trades give way to a westerly, or die to a calm. */
  const WESTERLY_CHANCE = 0.18;
  const CALM_CHANCE = 0.1;

  /** Days on the islet before the first westerly comes, whatever the odds. */
  const SURE_WESTERLY = 5;

  /** The longest passage the boat can make without water casks, in days. */
  const CASK_DAYS = 2;

  /** Where the castaway's own island lies on the sea chart. */
  G.HOME_POS = [430, 180];

  /** The way back from each bearing. */
  const OPPOSITE = { west: 'east', east: 'west', north: 'south', south: 'north' };

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
    if (S.isle === 'islet' && !S.flags.homeAgain && !S.n.westerlies && S.day - S.n.wreckDay >= SURE_WESTERLY) next = 'westerly';
    if (next === 'westerly' && was !== 'westerly') S.n.westerlies = (S.n.westerlies || 0) + 1;
    S.wind = next;
    if (next !== was) log(WINDS[next][1], 'lore');
  };

  /* ---------------- the boat ---------------- */

  /** Whether every part of the wrecked boat has been patched. */
  G.boatMended = () => PATCH.every((p) => S.boat[p.id]);

  /** Patches part `p` of the boat (from PATCH) or fits her with upgrade `p` (from UPGRADES), if it can be paid for. */
  G.workBoat = function (p) {
    if (!has(p.cost)) return;
    pay(p.cost);
    AU.sfx('craft');
    S.boat[p.id] = 1;
    log(p.msg);
    save();
  };

  /** The upgrades not yet fitted. */
  G.upgradesLeft = () => UPGRADES.filter((u) => !S.boat[u.id]);

  /* ---------------- passages ---------------- */

  /** Which way a passage to `id` runs: from home, its bearing; from an island, back the other way. */
  const bearingTo = (id) => (id === 'home' ? OPPOSITE[G.isle().bearing] : ISLES[id].bearing);

  /** How many days a passage to `id` takes. */
  const daysTo = (id) => (id === 'home' ? G.isle().days : ISLES[id].days);

  /** The places the boat can make for from here: any charted island from home, and only home from anywhere else. */
  G.destinations = () => (G.atHome() ? Object.keys(ISLES).filter((id) => S.charted[id]) : ['home']);

  /** What a passage to `id` costs: a day's water and a day's food for every day at sea. */
  G.passageCost = (id) => ({ water: daysTo(id), food: daysTo(id) });

  /** How long a passage to `id` takes, for the buttons. */
  G.passageDays = (id) => daysTo(id);

  /** Why the boat can't sail for `id` just now, or null. */
  G.sailBlocked = function (id) {
    if (!G.boatMended()) return `patch the ${G.boatName()} first`;
    if (id !== 'home' && ISLES[id].far) return ISLES[id].far;
    if (daysTo(id) > CASK_DAYS && !S.boat.casks) return 'too far without water casks';
    if (S.wind === 'calm') return 'there is no wind';
    const b = bearingTo(id);
    if (b === 'north' || b === 'south') return S.boat.leeboards ? null : 'she will not sail across the wind: hang leeboards';
    if (b === 'west' && S.wind !== 'trades') return 'the wind is foul: wait for the trades';
    if (b === 'east' && S.wind !== 'westerly') return 'the wind is foul: wait for a westerly';
    return null;
  };

  /** Sets sail for `id`. Leaving home, Hollis must either come or keep the camp. */
  G.setSail = function (id) {
    if (G.sailBlocked(id) || !has(G.passageCost(id))) return;
    if (G.atHome() && S.flags.ally) {
      modal({
        art: ART.scene('beach'),
        title: 'Who Keeps the Fire?',
        text: [
          `Hollis watches you load the ${G.boatName()}, and says nothing for a long time. Then: "Who keeps the fire?"`,
          'If he comes, there is another pair of hands aboard. If he stays, the camp will be kept: the fire fed, the traps emptied, and nothing taken while you are gone.',
        ],
        choices: [
          { label: 'he comes with you', fn: () => depart(id, false) },
          { label: 'he keeps the camp', fn: () => depart(id, true) },
          leave('not yet'),
        ],
      });
      return;
    }
    depart(id, false);
  };

  /** How each kind of passage begins. */
  const SET_OUT = {
    west: 'The trades take her as soon as she clears the reef, and she runs west before them, rolling like a cask.',
    east: 'The westerly fills the sail and she runs east, against the run of this sea, and you feel how soon the wind could change its mind.',
    north: 'With a leeboard down she holds her course across the wind, crabwise, the sea slapping at her side and every lashing complaining.',
  };
  SET_OUT.south = SET_OUT.north;

  /** Puts to sea for `id`; `hollisStays` leaves Hollis to keep the camp. */
  function depart(id, hollisStays) {
    const cost = G.passageCost(id);
    if (!has(cost)) return;
    pay(cost);
    if (G.atHome()) {
      S.n.leftHome = S.day;
      S.flags.hollisHome = hollisStays ? 1 : 0;
    }
    S.n.passage = daysTo(id);
    S.flags.sailing = 1;
    G.leaveFire();
    AU.sfx('splash');
    const aboard = S.flags.ally && !S.flags.hollisHome;
    const text = id === 'home' && !S.flags.homeAgain
      ? [
        `You push off at the top of the tide${aboard ? ', Hollis at the steering oar' : ''}, and the westerly finds the patched sail and leans on it, and the ${G.boatName()} groans in every lashing, and goes. Behind you the islet sinks into the sea like a stone into a pond.`,
        'All that day and all the night the wind holds. You steer by the peak of your island, and then by the stars above where it was, and you do not sleep.',
      ]
      : [SET_OUT[bearingTo(id)], `${id === 'home' ? 'Home' : ISLES[id].name}: ${S.n.passage} day${S.n.passage === 1 ? '' : 's'}, if the wind holds.`];
    if (hollisStays) text.push('Hollis stands at the edge of the surf with his spear, watching you go, until he is too small to see.');
    modal({ art: ART.scene('raft'), title: id === 'home' && !S.flags.homeAgain ? 'Homeward' : 'Under Sail', text, choices: [{ label: 'sail on', fn: () => atSea(id) }] });
  }

  /**
   * What can happen on passage. Each has an `id`, an optional `limit`,
   * `weight` and `when()`, the `title` and `art` of its card, and `run()`,
   * which returns the card's paragraphs.
   */
  const SEA = [
    {
      id: 'flyingFish',
      run: () => ['In the night, flying fish come aboard, slapping onto the logs in the dark. In the morning you gather them up for breakfast.', gainLine(`${cap(gain({ food: rand(2, 3) }))}.`)],
    },
    {
      id: 'seaSquall', weight: 1.5, title: 'A Squall', art: 'tempest',
      run() {
        const water = gain({ water: rand(1, 3) });
        if (S.boat.outrigger) {
          return ['A squall comes down on you out of a clear sky, black and roaring. The outrigger holds her up, and she puts her shoulder into it and goes through.', gainLine(`You catch ${water} in the sail.`)];
        }
        add('food', -2);
        damage(1, 'storm');
        return [
          'A squall comes down on you out of a clear sky, black and roaring. She rolls until the sea comes green over her, and you hang on with both hands while it takes what it wants.',
          gainLine(`You catch ${water} in the sail, and lose 2 provisions and 1 health. An outrigger would hold her up.`),
        ];
      },
    },
    {
      id: 'becalmed', title: 'Becalmed',
      run() {
        S.n.passage++;
        add('water', -1);
        add('food', -1);
        return ['Halfway over, the wind dies. The sail hangs like washing. All day the sea lies flat as oil and the sun stands over you, and you ration the water by the mouthful.', gainLine('A day lost to the calm, and a day\'s water and food with it.')];
      },
    },
    {
      id: 'breakers', limit: 1, weight: 2, title: 'Breakers',
      when: () => !S.charted.sandbar,
      run() {
        S.charted.sandbar = 1;
        return ['At first light there is white water to the north, where there should be nothing: surf breaking on a bar of sand, low and pale, a day\'s sail away across the wind.', gainLine('You mark the Sandbar on your chart.')];
      },
    },
    {
      id: 'dolphins',
      run: () => ['Dolphins come and ride the bow wave all morning, rolling to look up at you. For an hour you forget to be afraid of anything.'],
    },
    {
      id: 'passage', weight: 2,
      run: () => [pick([
        'The wind holds, and the sea is kind, and nothing happens at all. You sleep in snatches at the steering oar.',
        'A whale blows, far off, and blows again. You watch the spouts until they are gone.',
        'You see no land at all for a day, and then all at once, there it is.',
      ])],
    },
  ];

  /** Picks something to happen at sea, by weight, and counts it. */
  function seaEvent() {
    const ok = SEA.filter((e) => (!e.limit || (S.events[e.id] || 0) < e.limit) && (!e.when || e.when()));
    let roll = Math.random() * ok.reduce((t, e) => t + (e.weight || 1), 0);
    const e = ok.find((x) => (roll -= x.weight || 1) < 0) || ok.at(-1);
    S.events[e.id] = (S.events[e.id] || 0) + 1;
    return e;
  }

  /** Something happens on passage; then the landfall. */
  function atSea(id) {
    const e = seaEvent();
    const text = e.run();
    if (S.ended) return;
    modal({ art: ART.scene(e.art || 'raft'), title: e.title || 'At Sea', text, choices: [{ label: 'make for the land', fn: () => landfall(id) }] });
  }

  /** Arrives at `id` when the passage's days are done: the island's landing, or home. */
  function landfall(id) {
    S.day += S.n.passage;
    S.t = 30;
    S.flags.sailing = 0;
    view.tab = 'beach';
    view.sceneKey = '';
    if (id === 'home') {
      homecoming();
      return;
    }
    S.isle = id;
    const first = !S.landed[id];
    S.landed[id] = (S.landed[id] || 0) + 1;
    if (first) ISLES[id].land();
    else ISLES[id].again();
    save();
  }

  /** The chance, for every few days the camp was left untended, that something there is broken. */
  const UNTENDED_DAYS = 3;
  const UNTENDED_HARM = 0.5;

  /** Most that the camp's catchers and traps put by while Hollis kept it. */
  const KEPT_MOST = 12;

  /**
   * Coming home to the camp. If Hollis kept it, the fire is alight and the
   * catchers and traps have been working; if nobody did, things are broken.
   * The first time, the castaway also learns of the Bird Rock.
   */
  function homecoming() {
    const first = !S.flags.homeAgain;
    const away = Math.max(1, S.day - (S.n.leftHome || S.n.wreckDay));
    const kept = S.flags.hollisHome;
    S.isle = 'home';
    S.flags.homeAgain = 1;
    S.flags.hollisHome = 0;
    const text = [];
    let line = 'You are home, and the camp is as you left it, more or less.';
    if (first) {
      text.push(
        `On the second evening the westerly dies, and the trades come back, and for one bad hour you think they will carry you past. Then the swell lifts you over the bar, and the ${G.boatName()} grounds on sand you know.`,
        `Your camp is as you left it, more or less: the fire is cold ash, the gulls have been at everything${S.built.leanto ? ', and a crab has moved into the lean-to' : ''}. But the water is sweet, and the island is yours.`,
      );
      if (S.flags.ally) text.push('Hollis walks up the beach, lies down on his back in the sand, and laughs until he weeps.');
      S.charted.rock = 1;
      text.push(S.flags.ally
        ? 'That evening, by the fire, Hollis points out to sea. "Every dawn the birds go out that way, east," he says, "and every night they come back. There\'s a rock out there. I always wanted to see it."'
        : 'That evening, by the fire, you watch the birds come home out of the east in long lines, as they must every evening. Somewhere out there to the east is a rock where they nest.');
      line = `You are home. West of the island, beyond sight of the summit, lie other islands, and the patched ${G.boatName()} might reach them with the wind behind her.`;
    } else if (kept) {
      setFire(3, true);
      const got = gain({ water: Math.min(KEPT_MOST, (S.built.catcher || 0) * away * 2), food: Math.min(KEPT_MOST, (S.built.trap || 0) * away * 2) });
      text.push(
        'There is smoke going up from the beach as you come in, and a figure on the sand waving a spear over his head. Hollis has kept the camp.',
        gainLine(got ? `The fire is burning, and he has put by ${got}.` : 'The fire is burning, and nothing has been taken.'),
      );
      line = 'You are home, and Hollis has kept the camp.';
    } else {
      const broken = [];
      for (let d = 0; d < away; d += UNTENDED_DAYS) {
        if (Math.random() >= UNTENDED_HARM) continue;
        const k = pick(['catcher', 'trap'].filter((b) => S.built[b] > 0));
        if (!k) break;
        S.built[k]--;
        broken.push(k === 'catcher' ? 'a rain catcher blown down' : 'a fish trap smashed by the surf');
      }
      text.push(
        `The camp has been left ${away} days, and it shows: the fire is cold ash, and the gulls have been at everything.`,
        gainLine(broken.length ? `You find ${broken.join(', and ')}.` : 'Nothing is broken, by some mercy.'),
      );
      if (broken.length) line = `You came home to a cold camp, and ${broken.join(', and ')}.`;
    }
    if (S.flags.jem && !S.flags.jemHome) {
      S.flags.jemHome = 1;
      if (S.flags.ally) text.push('Hollis comes down the beach to meet you, and stops dead when he sees Jem. For a long moment the two of them look at each other: the man who was left, and the man who ran. Then Hollis nods once, and goes back to the fire.');
    }
    if (S.flags.bristowLost) {
      // the tide got him home first
      delete S.flags.bristowLost;
      S.items.bristow = 1;
      text.push('And there above the tide line, half his face washed off, sits Bristow, waiting for you. The sea brought him home before you.');
    }
    modal({ art: ART.scene('beach'), title: 'Home', text, choices: [leave('go up to the camp', line, 'lore')] });
    save();
  }
})();
