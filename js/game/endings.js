/* Driftwood — endings.
 * Rescue by a passing whaler, the voyage by raft, the Meridian's return,
 * and death. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, gainLine, DEATHS, LAUNCH_COST, RES,
    has, pay, add, gain, log, damage, clearSave, modal, closeModal, leave, fight,
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

  /** The closing paragraphs, shaped by what the castaway did on the island. */
  function epilogue() {
    const lines = [];
    if (S.flags.ally) lines.push('Tom Hollis stands at the rail long after the island has sunk from sight. You do not disturb him.');
    if (S.flags.killedHollis) lines.push('You never speak of the man in the jungle. But you count the notches, some nights, when you cannot sleep.');
    if (S.items.bristow) {
      lines.push(S.flags.sailing
        ? 'Somewhere in the storm, Bristow went over the side. You still say sorry to him, some nights.'
        : 'Bristow comes aboard with you. The whalermen think you mad, and they are not altogether wrong.');
    }
    if (S.flags.buriedStranger) lines.push('Some nights you think of the bones in the scrub, and the boots that fitted you so well. You are glad you buried them.');
    if (S.flags.buried) lines.push('Captain Hale\'s journal you send to his widow in Liverpool, if she still lives. You never learn whether it reaches her.');
    if (S.items.locket) {
      lines.push(S.flags.buried
        ? 'With the journal goes his locket, the one from the drowned longboat. Months later a letter finds you, in a careful old hand: <i>Thank you. — M.H.</i>'
        : 'Hale\'s locket you send to Liverpool, to M.H., whoever she was. Months later a letter finds you, in a careful old hand: <i>Thank you.</i>');
    }
    const crane = S.flags.killedCrane
      ? 'The <i>Meridian</i> was captured off Callao, short of a first mate: Mr Crane lies on the island where he fell.'
      : 'The <i>Meridian</i> was captured off Callao, and Mr Crane was hanged.';
    lines.push(`In Valparaíso, months later, you give your testimony before the British consul. ${crane} You are asked if you have anything to add. You think of the surf, the fire, the long nights. "No," you say. "Nothing."`);
    if (S.items.parcel) lines.push('Then you walk up to the Calle de la Aduana with an oilcloth parcel under your arm, its seal of wings unbroken, and leave it on Mrs Morrow\'s doorstep. It was the one promise you made on the island, and you have kept it.');
    if (S.items.idol) lines.push('You never did take the little carved figure home. It sits on your mantel in Bristol, facing the wall. Every morning, it is facing the room.');
    lines.push(gainLine(`${S.day} days upon the island.`));
    return lines;
  }

  /** Ends the game happily: a final card of `text`, followed by the epilogue. */
  function finish(art, title, text) {
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
        fn: () => finish(ART.scene('rescue'), 'Rescue', [
          'She is the whaler <i>Perseverance</i>, of New Bedford, three years out. Her captain, a lean Nantucket Quaker named Eli Swain, hears your story without a word, and then says only: "Thee had better come aboard."',
        ]),
      }],
    });
  };

  /* ---------------- the Meridian ---------------- */

  /** What the mutineers carry off from an undefended camp: half of each. */
  const PLUNDER = ['water', 'food', 'rope', 'iron', 'cloth', 'timber', 'shot'];

  /** The mutineers strip the camp and row back to their ship. */
  function plundered(text) {
    const lost = [];
    PLUNDER.forEach((k) => {
      const n = Math.ceil((S.res[k] || 0) / 2);
      if (n > 0) {
        add(k, -n);
        lost.push(`${n} ${RES[k]}`);
      }
    });
    modal({
      art: ART.scene('beach', { ship: 1 }),
      title: 'Plundered',
      text: [text, 'By evening the boat is pulling back to the ship, low in the water, and the <i>Meridian</i> stands away into the south.',
        gainLine(lost.length ? `They have taken ${lost.join(', ')}.` : 'There was nothing worth taking.')],
      choices: [leave('go down to the camp', 'The mutineers stripped the camp. The pyre is ash, and must be built again.', 'warn')],
    });
  }

  /** Crane is beaten in the surf, and his men leave without him. */
  function craneBeaten() {
    S.flags.killedCrane = 1;
    const got = gain({ shot: 2, iron: 2 });
    modal({
      art: ART.scene('beach', { ship: 1 }),
      title: 'The Surf',
      text: [
        'Crane goes down in the shallows, and does not get up. The men in the boat look at him, and at you, and then they back water, and pull for the ship without a word. Not one of them liked him.',
        'By evening the <i>Meridian</i> is a sail on the southern horizon, and then nothing.',
        gainLine(`On the beach where he dropped them: his powder flask and a pouch of nails. You take ${got}.`),
      ],
      choices: [leave('go down to the camp', 'Mr Crane lies in the surf. The pyre is ash, and must be built again.', 'lore')],
    });
  }

  /** The castaway signs on with the mutineers, and shares their fate. */
  function signOn() {
    endGame('ending');
    const text = [
      'You sign the articles with the rest of them, under a name that is not yours, and pull an oar out to the ship, and do not look back at the island.',
      'Five weeks later the <i>Meridian</i> is taken off Callao by a British sloop of war. At the court in Valparaíso no one speaks for you, and you do not speak for yourself. Mr Crane is hanged. You are transported for life to Van Diemen\'s Land, and the judge says it is a mercy.',
      'Some nights, in the hulks at Hobart Town, you dream of a fire on a beach, and of the long green island that was yours.',
    ];
    if (S.flags.ally) text.splice(1, 0, 'Hollis would not come. The last you see of him he is standing in the surf with his spear, watching the boat go.');
    text.push(gainLine(`${S.day} days upon the island.`), '<p class="dateline">THE END</p>');
    modal({ art: ART.scene('rescue'), title: 'The Articles', text, choices: [BEGIN_AGAIN] });
  }

  /**
   * The pyre is lit for the Meridian, come back with the mutineers aboard,
   * and Crane lands with a boat's crew for water and hands. `known` is
   * whether the castaway knew her before lighting it. The pyre burns away
   * either way, and must be built again.
   */
  G.meridianLands = function (known) {
    AU.sfx('fire');
    S.built.pyre = 0;
    S.n.pyreDays = 0;
    const ally = S.flags.ally;
    modal({
      art: ART.scene('summit', { ship: 1, pyre: 1, lit: 1 }),
      title: 'The Pyre',
      text: known
        ? ['You know what she is, and you light it all the same. It goes up with a roar you feel in your teeth: a pillar of smoke a mile high.', 'For an hour she holds her course. Then, slowly, she comes about.']
        : ['You run. Up the loose stones, up the narrow crack, lungs on fire, and put a burning stick to the pyre. It goes up with a roar you feel in your teeth: a pillar of smoke a mile high.',
          'For an hour the ship holds her course. Then, slowly, she comes about, and as she comes on you see the patch in her fore-topsail, which you sewed yourself off the Horn. She is the <i>Meridian</i>.'],
      choices: [{
        label: 'go down to the beach',
        fn: () => modal({
          art: ART.scene('rescue'),
          title: 'The Meridian',
          text: [
            'A boat comes in through the surf with six men at the oars, and Mr Crane in the stern with a cutlass across his knees. He steps out into the shallows and looks you up and down.',
            '"The bosun\'s mate," he says. "Alive. We\'ve had a hard passage, and we\'re short of water and shorter of hands. Sign the articles and you can come aboard. Or don\'t, and we\'ll take the water anyway."',
            ally ? 'Behind you, in the trees, Hollis is waiting with his spear.' : 'The men at the oars will not meet your eye.',
          ],
          choices: [
            { label: 'sign on with them', fn: signOn },
            { label: 'run for the trees', fn: () => plundered('You run, and they let you. From the edge of the trees you watch them strip the camp, laughing, and fill their casks at your water.') },
            {
              label: 'stand your ground',
              fn: () => fight('crane', {
                ally,
                onWin: craneBeaten,
                onFlee: () => plundered('You break away and run for the trees, and Crane does not follow. He has what he came for.'),
              }),
            },
          ],
        }),
      }],
    });
  };

  /* ---------------- the voyage ---------------- */

  /** Puts to sea on the finished raft, if the supplies for the voyage are in store. */
  G.launch = function () {
    if (!has(LAUNCH_COST)) return;
    pay(LAUNCH_COST);
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
  };

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
        fn: () => fight('shark', { canFlee: false, ally: S.flags.ally, onWin: landfall }),
      }],
    });
  }

  /** Landfall in the Society Islands, and the end of the voyage. */
  function landfall() {
    finish(ART.scene('landfall'), 'Landfall', [
      'On the eleventh day, gulls. Then a smudge on the horizon that does not move as clouds move.',
      'The people of the island wade out to meet you, laughing, and haul the raft up through the surf. You are in the Society Islands, they tell you, in a mixture of French, English and signs. A mission schooner calls at Papeete within the month.',
    ]);
  }
})();
