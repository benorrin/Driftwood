/* Driftwood — recollections and the statement.
 * What comes back to the castaway of the Meridian, and what they write
 * down. A recollection is one frozen moment of the night or the weeks
 * before: first a few sounds in the dark, then a plan of her deck with
 * numbered figures where men stood, each to be studied. Nobody in one is
 * named unless a voice names him, and none uses the words of the crew
 * page, so knowing who is who takes inference, not lookup (see
 * `docs/dev/roster.md`). The crew page is the castaway's own statement
 * for Captain Swain, written in the third chapter. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const { S, quote, gainLine, log, modal, closeModal, leave } = G;

  /* ---------------- recollections ---------------- */

  /**
   * The recollections, by id. Each has a `title`, `when` (a line of where
   * in the voyage it falls), `sounds` (what is heard in the dark first),
   * `plan` (the deck plan's options: night, light, fire, calm), `figs`
   * (each { n, x, y, at, see, below? }: its number, where it stands on the
   * plan, a short label for its button, and what is seen of it), and
   * `line`, logged the first time it comes back.
   */
  const MEMORIES = {
    glass: {
      title: 'A Sea Like Glass',
      when: 'The calm, after the <i>Ellen Grey</i>. A clear night.',
      sounds: [
        'Whistling: the same four bars, over and over, light and pleased with itself.',
        'The slat of a sail with no wind in it. The creak of the wheel, put over and back for nothing.',
        'Somebody aft singing under his breath, very low, in words you do not know.',
        'Then the whistling stops, in the middle of a bar. A small sound from over the side. Not even a splash.',
      ],
      plan: { night: true, calm: true, light: [70, 120, 90] },
      figs: [
        { n: 1, x: 262, y: 70, at: 'at the rail', see: 'A fair-haired man leaning on the rail, alone, whistling to the flat sea. There is nobody within twenty feet of him. There is nobody near him at all.' },
        { n: 2, x: 74, y: 104, at: 'at the wheel', see: 'The man at the wheel, a dark shape against the binnacle light, singing to himself, the same slow tune over and over, in a tongue that is not English. He does not stop when the whistling does.' },
        { n: 3, x: 348, y: 150, at: 'on the main hatch', see: 'An old man sitting cross-legged on the main hatch with a sail across his knees, stitching by lantern light, a leather strap round his right hand and across the palm. At the sound from over the side he does not so much as look up.' },
        { n: 4, x: 396, y: 156, at: 'by the galley', see: 'Someone coming aft from the galley with a kid of food for the watch, dragging his left foot a little at every step.' },
        { n: 5, x: 232, y: 146, at: 'by the boat', see: 'You. You are lying on the deck in the lee of the longboat, half asleep. When the whistling stops you lift your head, and for a moment you do not know why.' },
      ],
      line: 'You remember the calm: a fair man whistling alone at the rail, and then not. In the morning there was a man missing.',
    },
    helm: {
      title: 'The Helm',
      when: 'The night of the rising.',
      sounds: [
        'Shouting, aft, a great many voices. Feet running on the deck over your head, and then your own feet, running.',
        'Somebody saying "sir, sir", over and over.',
        'A pistol cocked, and not fired.',
        'Close beside you, a man spits, and the spokes creak as he puts the wheel up.',
      ],
      plan: { night: true, light: [62, 120, 80] },
      figs: [
        { n: 1, x: 62, y: 96, at: 'at the wheel', see: 'The man at the wheel. In the binnacle light you can see his hands on the spokes, and both palms are scarred straight across, old white weals, as if a rope had once run out through them. He shifts his quid and spits to leeward, and holds her off the wind, steady, while it is done.' },
        { n: 2, x: 512, y: 98, at: 'below, forward', below: true, see: 'Below, through the open scuttle of the fo\'c\'sle: an old man in his hammock, asleep, his mouth open, while the whole ship shouts over his head.' },
        { n: 3, x: 128, y: 146, at: 'going aft', see: 'You, going aft toward the shouting. You stop by the man at the wheel, and he does not look at you, and you go on.' },
      ],
      line: 'You remember the helm on the night of the rising: a man holding her off the wind while it was done, his palms scarred across.',
    },
    corposants: {
      title: 'Corposants',
      when: 'After the calm. A night of rain.',
      sounds: [
        'A crackling high overhead, like fat in a pan.',
        'Men muttering, a great many of them, coming aft together, and stopping.',
        '"Captain, sir…"',
        'A door banging back on its hinges, and a voice you could hear at the masthead.',
      ],
      plan: { night: true, fire: true, light: [200, 120, 200] },
      figs: [
        { n: 1, x: 174, y: 104, at: 'in the cabin door', see: 'A broad man in the cabin door, grey whiskers lit blue from above, roaring. He will hang the first man that lays a hand on it. He means the crate.' },
        { n: 2, x: 120, y: 84, at: 'on the poop', see: 'A tall man on the poop, above the rest of them, his hands behind his back. He says nothing at all. When he turns his head, the blue light catches something on one of his fingers.' },
        { n: 3, x: 204, y: 132, at: 'in front of the hands', see: 'You. You are in front of the others, nearer the captain than any of them, and it is your own voice saying it: "Put it over the side, sir. Put it over, and have done."' },
        { n: 4, x: 226, y: 154, at: 'at your shoulder', see: 'A fair-haired man at your shoulder, with a band of black stuff sewn round his sleeve.' },
        { n: 5, x: 244, y: 100, at: 'with a handspike', see: 'A huge man, bigger than any other aboard, a handspike in his fist. His beard looks black in the blue light. By day, you think, it is red.' },
        { n: 6, x: 270, y: 142, at: 'at the back', see: 'A big man at the back with a maul in his right hand. His left hand he keeps in his pocket.' },
        { n: 7, x: 210, y: 76, at: 'to one side', see: 'A man to one side of the hands, not with them and not apart from them. Something small and silver hangs at his chest on a lanyard, and catches the blue fire.' },
      ],
      line: 'You remember the corposants: the hands going aft together, the captain in his door, and your own voice asking him to put the crate over the side.',
    },
  };

  /**
   * Shows the plan of recollection `id`, with figure `n` (if any) looked at
   * closely; `then` follows when it is let go.
   */
  function tableau(id, n, then) {
    const M = MEMORIES[id];
    const fig = M.figs.find((g) => g.n === n);
    modal({
      art: ART.deckPlan(M.figs, M.plan),
      title: M.title,
      text: [`<p class="dateline">${M.when}</p>`, fig ? `<p><b class="sc">${fig.n}.</b> ${fig.see}</p>` : 'It is all there, as if it had been waiting. Look closer at any of them.'],
      choices: M.figs.map((g) => ({ label: `${g.n}, ${g.at}`, fn: () => tableau(id, g.n, then) }))
        .concat({ label: 'let it go', fn: then || closeModal }),
    });
  }

  /**
   * Recollection `id` comes back: the sounds in the dark, and then the
   * moment itself, to study. The first time, it is remembered for good,
   * and `then` (if given) follows it. `lead` paragraphs, if given, tell
   * what brought it back.
   */
  G.recall = function (id, then, lead) {
    const M = MEMORIES[id];
    const first = !S.memories[id];
    S.memories[id] = 1;
    AU.sfx('page');
    const after = () => {
      if (first) log(M.line, 'lore');
      if (first) G.achieve('recollection');
      if (then) then();
      else closeModal();
    };
    G.queueModal({
      art: ART.deckPlan([], { night: true, calm: M.plan.calm, light: [0, 0, 0] }),
      title: M.title,
      text: (lead || []).concat('Something comes back to you, all at once, the way a smell does.', M.sounds.map((s) => `<p class="quote">${s}</p>`)),
      choices: [{ label: 'look', fn: () => tableau(id, null, after) }],
    });
  };

  /* ---------------- the statement ---------------- */

  /**
   * The crew page: the ship's company as the castaway writes them down for
   * Captain Swain, every soul, as a shipmate of eleven months knew them.
   * The recollections must be read against it.
   */
  const CREW_PAGE = [
    ['Capt. J. Ashby, master', 'Of Bristol. Thirty years at sea and never let you forget it.'],
    ['Mr N. Crane, first mate', 'Kept himself to himself. Had books in his cabin.'],
    ['Mr D. Lusk, second mate', 'Young for it. Did his best.'],
    ['Abraham Hockin, bosun', 'Of St Ives. Taught me my trade.'],
    ['Samuel Venn, carpenter', 'Lost two fingers to an adze in the Bristol yards.'],
    ['Isaac Dando, cook', 'Lame since a fall. Chapel.'],
    ['Edwin Pask, steward', 'Captain\'s man. Short-sighted.'],
    ['Gideon Marsh, sailmaker', 'The oldest aboard. Deaf as a post.'],
    ['Will and Tom Abel, ABs', 'Brothers, of Bedminster. Will the younger.'],
    ['Jem Rudd, OS', 'The youngest man forward.'],
    ['Elias Pell, AB', 'An American. Was whaling before.'],
    ['Michael Keane, AB', 'Of Cork. Strongest man aboard.'],
    ['Rhys Morgan, AB', 'Of Carmarthen. Chapel, and sang.'],
    ['Kit Fairley, boy', 'Thirteen. Bristol.'],
  ];

  /** What the castaway may write of their own part, by the choice they make: [button label, the entry, Swain's answer]. */
  const OWN_PART = {
    neutral: ['write that you took no side',
      'Took no part in the rising, on either side, and was put ashore for it.',
      'He reads it twice. "Took no part," he says. "Thee is sure of that?" You say that you are. He folds the paper without another word.'],
    honest: ['write that you remember almost nothing',
      'Of the night of the rising I remember lanterns, and shouting, and a hat passed from hand to hand, and no more. I do not know what part I took in it.',
      '"That is an honest statement," he says, "and an honest statement is worth more than a full one. I will tell the consul so."'],
    lots: ['write that the lots were rigged',
      'Was made to draw first from a hat in which every bean was black, and was put ashore as a Jonah. This I have from a man who held the hat.',
      'He reads it twice, and looks at you over his spectacles for a long time. "A man who held the hat," he says. "Thee will want him, in Valparaíso. Keep him safe."'],
  };

  /** The crew page as it is written, ending with the castaway's own entry. */
  function crewPage() {
    return CREW_PAGE.map(([who, what]) => quote(`<b class="sc">${who}.</b> ${what}`))
      .concat(quote(`<b class="sc">Myself, bosun's mate.</b> ${OWN_PART[S.flags.statement][1]}`));
  }

  /** Swain asks for it: the castaway writes out the ship's company, and then has to decide what to say of themselves. */
  G.writeStatement = function () {
    AU.sfx('page');
    const parts = ['neutral', 'honest'].concat((S.n.jemTold || 0) >= 4 ? ['lots'] : []);
    modal({
      art: ART.scene('cabin'),
      title: 'Your Statement',
      text: [
        'Captain Swain has given you the cabin table for the watch, a quire of paper, a pen and his own ink. "Every soul aboard her," he said, "and what thee knows of each. The consul will want it in thy own hand, before he has heard anyone else\'s."',
        'You write the ship\'s company out the way you would muster them, and it is strange how easily it comes, after so long:',
      ].concat(CREW_PAGE.map(([who, what]) => quote(`<b class="sc">${who}.</b> ${what}`)), ['And then you come to yourself, and the pen stops.']),
      choices: parts.map((k) => ({ label: OWN_PART[k][0], fn: () => signed(k) })),
    });
  };

  /** The statement signed, with the castaway's own part written as `part`, and Swain's answer. */
  function signed(part) {
    S.flags.statement = part;
    S.items.statement = 1;
    G.achieve('statement');
    modal({
      art: ART.scene('cabin'),
      title: 'Your Statement',
      text: [
        quote(`<b class="sc">Myself, bosun's mate.</b> ${OWN_PART[part][1]}`),
        'You sign it, and sand it, and take it to Captain Swain.',
        OWN_PART[part][2],
        gainLine('He gives it back to you to keep until Valparaíso. You can read it over from the deck.'),
      ],
      choices: [leave('go on deck', 'You have written your statement for the consul: the Meridian\'s company, every soul, in your own hand.', 'lore')],
    });
  }

  /** Reads the statement over: the crew page, which the recollections must be read against. */
  function readStatement() {
    AU.sfx('page');
    modal({
      art: ART.scene('cabin'),
      title: 'Your Statement',
      text: ['The <i>Meridian</i>\'s company, as you wrote it out for Captain Swain:'].concat(crewPage()),
      choices: [leave('put it away')],
    });
  }

  /** Buttons for the deck tab: reading the statement, and calling back each recollection to study again. */
  G.paperButtons = function () {
    const out = [];
    if (S.items.statement) out.push(G.button('paper:statement', 'read your statement', 'the ship\'s company', true, readStatement));
    Object.keys(MEMORIES).filter((id) => S.memories[id]).forEach((id) => {
      out.push(G.button(`paper:${id}`, MEMORIES[id].title.toLowerCase(), 'study it again', true, () => {
        AU.sfx('page');
        tableau(id, null, closeModal);
      }));
    });
    return out;
  };
})();
