/* Driftwood — endings.
 * Rescue by a passing whaler, the voyages by raft and by canoe, staying
 * for good, and death. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, chance, gainLine, DEATHS, LAUNCH_COST,
    has, pay, add, log, damage, clearSave, modal, closeModal, leave, fight,
  } = G;

  /** The choice that closes a finished tale and returns to the title screen. */
  const BEGIN_AGAIN = {
    label: 'begin again',
    fn: () => {
      closeModal();
      G.toTitle();
    },
  };

  /** Marks the game over, deletes the save, and sets the music to `mood`. */
  function endGame(mood) {
    S.ended = true;
    G.clearQueue();
    clearSave();
    AU.setMood(mood);
    AU.setFire(0);
  }

  Object.assign(G, { endGame, BEGIN_AGAIN });

  /** The closing paragraphs, shaped by what the castaway did on the island. */
  function epilogue() {
    const lines = [];
    if (S.flags.ally) lines.push('Tom Hollis stands at the rail long after the island has sunk from sight. You do not disturb him.');
    if (S.flags.jem) lines.push('Jem Rudd signs on with the whalermen as a hand, and works his passage, and never once looks back at the islands.');
    if (S.flags.jemDead) lines.push('You do not speak of Jem Rudd. There is a grave by a stream on an island no one will ever find, and that is the end of it.');
    if (S.flags.killedHollis) lines.push('You never speak of the man in the jungle. But you count the notches, some nights, when you cannot sleep.');
    if (S.items.bristow) lines.push('Bristow comes aboard with you. The whalermen think you mad, and they are not altogether wrong.');
    if (S.flags.buriedStranger) lines.push('Some nights you think of the bones in the scrub, and the boots that fitted you so well. You are glad you buried them.');
    if (S.flags.buried) lines.push('Captain Hale\'s journal you send to his widow in Liverpool, if she still lives. You never learn whether it reaches her.');
    if (S.items.locket) {
      lines.push(S.flags.buried
        ? 'With the journal goes his locket, the one from the drowned longboat. Months later a letter finds you, in a careful old hand: <i>Thank you. — M.H.</i>'
        : 'Hale\'s locket you send to Liverpool, to M.H., whoever she was. Months later a letter finds you, in a careful old hand: <i>Thank you.</i>');
    }
    lines.push('In Valparaíso, months later, you give your testimony before the British consul. The <i>Meridian</i> was taken off Callao, and her men are to be sent home to England in irons, and they say Mr Crane will hang. You are asked if you have anything to add. You think of the surf, the fire, the long nights. "No," you say. "Nothing."');
    if (S.flags.drowned === 'buried') lines.push('You tell the consul about the drowned man in the steward\'s jacket, and where you buried him. He writes it down, and asks you the man\'s name, and you find that you know it.');
    if (S.items.parcel) lines.push('Then you walk up to the Calle de la Aduana with an oilcloth parcel under your arm, its seal of wings unbroken, and leave it on Mrs Morrow\'s doorstep. It was the one promise you made on the island, and you have kept it.');
    if (S.items.idol) lines.push('You never did take the little carved figure home. It sits on your mantel in Bristol, facing the wall. Every morning, it is facing the room.');
    lines.push(gainLine(`${S.day} days upon the island.`));
    return lines;
  }

  /** Ends the game by ENDINGS `id`: a final card of `text`, followed by the epilogue. */
  function finish(id, art, text) {
    G.recordTale(id);
    const title = G.ENDINGS[id][0];
    endGame('ending');
    modal({
      art,
      title,
      text: text.concat(epilogue(), ['<p class="dateline">THE END</p>']),
      choices: [BEGIN_AGAIN],
    });
  }

  /** Death, by `cause`: one of the DEATHS keys, or the name of what killed you. */
  G.die = function (cause) {
    if (S.ended) return;
    S.health = 0;
    G.leaveRemains(cause);
    G.recordTale('death', cause);
    endGame('silent');
    AU.sfx('death');
    const why = DEATHS[cause] || `You fell to ${cause}. The island is patient; it was always going to win.`;
    modal({
      art: ART.scene('grave'),
      title: 'Here Lies a Sailor',
      text: [why, gainLine(`You survived ${S.day} day${S.day === 1 ? '' : 's'} upon the island.`)],
      choices: [BEGIN_AGAIN],
    });
  };

  /* ---------------- rescue ---------------- */

  /** The pyre is lit as a sail passes: the ship comes about, and the castaway is saved. */
  G.rescueEnding = function () {
    AU.sfx('fire');
    modal({
      art: ART.scene('summit', { ship: 1, pyre: 1, lit: 1 }),
      title: 'The Pyre',
      text: [
        'You run. Up the loose stones, up the narrow crack, lungs on fire, and put a burning stick to the pyre. It goes up with a roar you feel in your teeth: a pillar of smoke a mile high.',
        'For an hour the ship holds her course. Then, slowly, she comes about.',
      ],
      choices: [{
        label: 'go down to the beach',
        fn: () => (S.chapter >= 2 ? G.rescueChapterTwo() : finish('rescue', ART.scene('rescue'), [
          'She is the whaler <i>Perseverance</i>, of New Bedford, three years out. Her captain, a lean Nantucket Quaker named Eli Swain, hears your story without a word, and then says only: "Thee had better come aboard."',
        ])),
      }],
    });
  };

  /* ---------------- the voyage ---------------- */

  /** Loads the finished raft and puts to sea, if the supplies for the voyage are in store. */
  G.launch = function () {
    if (!has(LAUNCH_COST)) return;
    G.provision(LAUNCH_COST, G.boatRoom('raft', true), (load) => {
      G.stow(load);
      pay(LAUNCH_COST);
      putToSea();
    });
  };

  /** The raft goes out over the bar. */
  function putToSea() {
    S.flags.sailing = 1;
    AU.sfx('splash');
    const companion = S.flags.ally ? ', Hollis pushing beside you, laughing like a boy' : '';
    modal({
      art: ART.scene('raft'),
      title: 'Put to Sea',
      text: [
        `You and the raft go down to the water at the top of the tide${companion}. The surf lifts you, drops you, lifts you — and then you are over the sandbar and the sail fills.`,
        'The island falls behind: green, then grey, then gone. The raft rides better than you dared to hope.',
      ],
      choices: [{ label: 'sail on', fn: storm }],
    });
  }

  /** A storm on the fourth day: endure it at the mast, or cut the sail away and lose supplies. */
  function storm() {
    modal({
      art: ART.scene('storm'),
      title: 'The Fourth Day',
      text: ['The western sky turns the colour of a bruise. By noon the swells are taller than the mast, and the raft climbs each one like a cart on a hill and plunges down the far side.'],
      choices: [
        {
          label: 'lash yourself to the mast',
          fn: () => {
            AU.sfx('hurt');
            damage(3, 'storm');
            if (!S.ended) afterStorm('The sea beats you black and blue through the night, but the raft holds, and so do you.');
          },
        },
        {
          label: 'cut the sail loose',
          fn: () => {
            add('food', -4);
            add('water', -2);
            afterStorm('The sail goes whirling away into the dark, and the raft rides easier. You will be slower now, and hungrier.');
          },
        },
      ],
    });
  }

  /** The calm after the storm, and the shark beneath the logs. */
  function afterStorm(text) {
    modal({
      art: ART.scene('raft'),
      title: 'Calm',
      text: [text, 'Dawn comes up pale and still. Something grey moves beneath the logs.'],
      choices: [{
        label: 'take up your weapon',
        fn: () => fight('shark', { canFlee: false, ally: S.flags.ally, onWin: () => G.wrecked('raft') }),
      }],
    });
  }

  /* ---------------- staying ---------------- */

  /** The first day the island may feel like home, and how long before the thought comes back if put aside. */
  const STAY_DAY = 30;
  const STAY_AGAIN = 10;

  /**
   * Whether the castaway has made their peace with the island: a month
   * ashore, a roof overhead, the Calliope's dead buried, and the carved
   * figure not in their keeping.
   */
  const atPeace = () => G.atHome() && S.day >= STAY_DAY && S.built.leanto && S.flags.buried && !S.items.idol &&
    !S.flags.sailing && (!S.n.stayOffered || S.day - S.n.stayOffered >= STAY_AGAIN);

  /** The castaway stays, and grows old on the island. */
  function stay() {
    G.recordTale('stay');
    endGame('ending');
    const text = ['You stop cutting the notches. After a while you stop looking at the sea, except for the pleasure of it.'];
    if (S.flags.ally) text.push('Hollis teaches you the names he has given to the birds, and you teach him his letters from the Bible. You quarrel about the fire, and about the weather, and about nothing, like brothers.');
    if (S.items.bristow) text.push('Bristow gets a new face every spring.');
    const found = S.flags.ally
      ? ['two grey-bearded men who ask them, very politely, to leave them be', 'He does not note their names. They would not give them.']
      : ['a grey-bearded man who asks them, very politely, to leave him be', 'He does not note the man\'s name. The man would not give it.'];
    text.push(
      `Many years later a survey ship of the Royal Navy puts a boat ashore on an island not on her charts, and finds a garden, a hut of stone, a row of old graves above the tide line, and ${found[0]}.`,
      `Her captain notes it in his log. ${found[1]}`,
      gainLine(`${S.day} days upon the island, and then you stopped counting.`),
      '<p class="dateline">THE END</p>',
    );
    modal({ art: ART.scene('night'), title: G.ENDINGS.stay[0], text, choices: [BEGIN_AGAIN] });
  }

  /** At dawn, once the castaway is at peace with the island, they may choose to stay. */
  G.offerStay = function () {
    if (!atPeace()) return;
    S.n.stayOffered = S.day;
    G.queueModal({
      art: ART.scene('beach'),
      title: 'The Notches',
      text: [
        'You go to cut the morning\'s notch in the palm by the fire, and find you have lost count. You cannot remember when you last looked for a sail.',
        'The fire is burning. The water is sweet. The dead are in their graves, and no one on this island wishes you harm.',
        'You could stop waiting for a sail. You could stay here, and let the island be the end of your story.',
      ],
      choices: [
        { label: 'stay here for good', note: 'this ends your tale', fn: stay },
        leave('not yet', 'You cut the notch, and look at the sea for a long while.', 'lore'),
      ],
    });
  };

  /* ---------------- the canoe ---------------- */

  /**
   * The chance the canoe capsizes running before the squall: less with
   * Hollis aboard to handle her, and less again if the carved figure was
   * taken home to the marae.
   */
  function capsizeChance() {
    return 0.45 - (S.flags.ally ? 0.2 : 0) - (S.flags.idolReturned ? 0.2 : 0);
  }

  /** Loads the mended canoe and puts to sea, if the supplies for the voyage are in store. */
  G.launchCanoe = function () {
    if (!has(G.CANOE_LAUNCH)) return;
    G.provision(G.CANOE_LAUNCH, G.boatRoom('canoe'), (load) => {
      G.stow(load);
      pay(G.CANOE_LAUNCH);
      paddleOut();
    });
  };

  /** The canoe goes out through the gap in the reef. */
  function paddleOut() {
    S.flags.sailing = 1;
    AU.sfx('splash');
    const companion = S.flags.ally ? ' Hollis kneels in the bow with a paddle, and sets the stroke without a word, as if he has done this all his life.' : '';
    modal({
      art: ART.scene('lagoon'),
      title: 'The Outrigger',
      text: [
        `You paddle out across the lagoon at first light and through the gap in the reef, and the swell lifts the canoe and she rides it like a gull.${companion}`,
        'Then the sail fills, and the island goes astern faster than you would have believed. Whoever made her knew what they were about.',
      ],
      choices: [{ label: 'sail on', fn: squall }],
    });
  }

  /** A squall on the third day: run before it and risk capsizing, or drop the sail and bail. */
  function squall() {
    modal({
      art: ART.scene('tempest'),
      title: 'The Third Day',
      text: ['A squall comes down on you out of a clear sky: a black wall of rain with white water at its foot. The canoe heels until the float lifts clear of the sea.'],
      choices: [
        {
          label: 'run before it',
          fn: () => {
            if (chance(capsizeChance())) {
              AU.sfx('hurt');
              add('food', -Math.ceil(S.res.food / 2));
              add('water', -Math.ceil(S.res.water / 2));
              damage(4, 'storm');
              if (!S.ended) afterSquall('She goes over in a gust, all at once, and you are in the sea with the hull above you. It takes you an hour to right her and bail her out, and half your stores are gone to the bottom.');
            } else {
              afterSquall('You let her run, and she flies, the float hissing through the crests, and an hour later you come out of the far side of the squall into sunshine, laughing like a fool.');
            }
          },
        },
        {
          label: 'drop the sail and bail',
          fn: () => {
            AU.sfx('hurt');
            add('food', -2);
            add('water', -3);
            damage(1, 'storm');
            if (!S.ended) afterSquall('You get the sail down and bail all night, numb and soaked, while the squall drives you off your course. You will be days making it up, and the spray has spoiled some of your food.');
          },
        },
      ],
    });
  }

  /** After the squall: if the stores ran out, the last days of the voyage take their toll. */
  function afterSquall(text) {
    const short = !S.res.food || !S.res.water;
    if (short) damage(3, 'thirst');
    if (S.ended) return;
    modal({
      art: ART.scene('tempest'),
      title: 'Calm',
      text: [text, short
        ? 'The days after are the worst of your life: no food, then no water, and the sun like a hammer. On the fifth night you hear surf ahead in the dark, and do not believe it.'
        : 'Two more days of steady wind. On the fifth night, running blind under a sky without stars, you hear surf ahead: close, and much too close.'],
      choices: [{ label: 'put the helm over', fn: () => G.wrecked('canoe') }],
    });
  }
})();
