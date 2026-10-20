/* Driftwood — the Perseverance.
 * The end of the second chapter. The whaler that calls at the Island of
 * Fires once a year comes in for water, and the castaway sails in her for
 * Valparaíso, with Tupa and whoever else will come: but first the
 * farewells. A whaler hailed from the summit ends the chapter too, without
 * them. What the castaway carries on to the third chapter is kept. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const storage = window.DW.storage;
  const {
    S, rand, quote, gainLine, CARRY_KEY,
    log, modal, queueModal, leave,
  } = G;

  /** Days after Tupa tells of her until she comes, and how long she lies at anchor. */
  const DUE_AFTER = [8, 12];
  const AT_ANCHOR = 6;

  /** If she sails without the castaway, the days until she calls again on her way north. */
  const CALLS_AGAIN = 20;

  /** Whether the Perseverance is lying off the Island of Fires just now. */
  G.whalerIn = () => S.n.whalerUntil >= S.day;

  /* ---------------- her coming ---------------- */

  /**
   * At dawn, once Tupa has told of her: she comes in, and Tupa comes to
   * find the castaway wherever they are; or, if she has waited long enough,
   * she sails, to call again on her way north.
   */
  G.whalerDawn = function () {
    if (!S.flags.whalerKnown || S.ended) return;
    if (!S.n.whalerDue) S.n.whalerDue = S.day + rand(DUE_AFTER[0], DUE_AFTER[1]);
    if (S.n.whalerUntil && S.day > S.n.whalerUntil) {
      S.n.whalerUntil = 0;
      S.n.whalerDue = S.day + CALLS_AGAIN;
      log('The <i>Perseverance</i> has sailed for the whaling grounds without you. Tupa says she will call again on her way north.', 'warn');
      return;
    }
    if (S.n.whalerUntil || S.day < S.n.whalerDue) return;
    S.n.whalerUntil = S.day + AT_ANCHOR - 1;
    // everybody on the island knows where she is lying
    S.mapped.ifAnchorage = 1;
    AU.sfx('sail');
    if (S.isle === 'smoke') {
      queueModal({
        art: ART.scene('rescue'),
        title: 'A Sail',
        text: ['At first light the whole village is on the beach, pointing. A ship is standing in toward the reef under topsails, deep-laden, her boats in their davits and a smudge of try-works smoke hanging over her deck.', quote('"<i>Perseverance</i>," Tupa says. "She is here."')],
        choices: [leave('go on', 'The Perseverance is lying in the anchorage on the Island of Fires. She will sail in a few days.', 'lore')],
      });
      return;
    }
    queueModal({
      art: ART.scene('beach'),
      title: 'Tupa',
      text: [
        'A canoe comes in through the surf with one man in it, paddling as if the sea were on fire. Tupa.',
        quote('"She is here," he says, before he is out of the canoe. "The <i>Perseverance</i>. Five days, six. Then she goes. Come."'),
      ],
      choices: [
        { label: 'sail south with him', fn: () => G.setSail('smoke', true) },
        leave('not yet', 'The Perseverance is lying off the Island of Fires, and will sail in a few days. Tupa\'s canoe will lead you south.', 'lore'),
      ],
    });
  };

  /* ---------------- the farewells ---------------- */

  /** Whether Hollis will stay with Tavake's people: once he has been among them, he has somewhere to belong. */
  const hollisStays = () => !!S.flags.hollisSawFires;

  /** Going out to the Perseverance: Captain Swain, and the farewells before the morning tide. */
  function goAboard() {
    S.flags.metSwain = 1;
    modal({
      art: ART.scene('rescue'),
      title: 'The Perseverance',
      text: [
        'She is the whaler <i>Perseverance</i>, of New Bedford, three years out. Her captain is on the beach, trading nails for water casks: a lean Nantucket Quaker named Eli Swain, in a black coat in all this heat.',
        'He hears your story without a word. When you come to the crate, and the god in it, and Valparaíso, he looks at Tupa for a long while.',
        quote('"Thee had better come aboard," he says. "We sail on the morning tide."'),
      ],
      choices: [
        { label: 'say your farewells', fn: farewellTavake },
        leave('not yet', 'Captain Swain of the Perseverance will take you to Valparaíso. She sails in a few days.', 'lore'),
      ],
    });
  }

  /** Tavake's farewell, and what she gives the castaway to carry. */
  function farewellTavake() {
    S.items.shell = 1;
    AU.sfx('pickup');
    modal({
      art: ART.scene('platform', { shells: 1 }),
      title: 'Tavake',
      text: [
        'Tavake does not come down to the beach. You go up to her, and she puts something into your hand and closes your fingers over it: a white shell, worn smooth, from the ring around the empty plinth.',
        quote('"For the <i>etua</i>," Tupa says, for her. "So it knows who you are."'),
        gainLine('You carry Tavake\'s shell.'),
      ],
      choices: [{ label: 'go on', fn: farewellHollis }],
    });
  }

  /** Hollis decides for himself: stay with Tavake's people, or see what the world became. */
  function farewellHollis() {
    if (!S.flags.ally) {
      farewellJem();
      return;
    }
    const stays = hollisStays();
    S.flags[stays ? 'hollisStayed' : 'hollisSails'] = 1;
    // if he was keeping the camp, the canoes have fetched him
    const fetched = S.flags.hollisHome ? ['A canoe went north for Hollis two days ago, and he is here, looking at the ship as if it might bite.'] : [];
    modal({
      art: ART.scene('beach'),
      title: 'Tom Hollis',
      text: fetched.concat(stays
        ? [
          'You ask Hollis if he will come. He is a long time answering. He looks up the beach, to where the old man who greeted him is sitting in the shade with a child on his knee.',
          quote('"Twenty years I watched their fires from the hill," he says. "Thought they were the ghosts of my shipmates." He laughs. "I\'ll stay. Somebody ought to keep the shells on that plinth till you bring it home."'),
          'He shakes your hand like a sailor, and then, as if he has just remembered how, he puts his arms round you.',
        ]
        : [
          'You ask Hollis if he will come. He looks at the ship a long time.',
          quote('"Twenty years," he says. "I\'d like to see a city before I die. And I\'d like to see what\'s become of England. And I\'d like," he says, "to see Mr Crane\'s face."'),
        ]),
      choices: [{ label: 'go on', fn: farewellJem }],
    });
  }

  /** Jem: the one witness to the rigged lots, who may hang if he says so in court. */
  function farewellJem() {
    if (!G.withJem()) {
      board();
      return;
    }
    modal({
      art: ART.scene('night'),
      title: 'Jem Rudd',
      text: [
        'Jem has not slept. He sits by the fire with his knees drawn up, watching the ship\'s riding light out on the dark water.',
        quote('"They\'ll hang me," he says. "If I go. I held the hat. I ran. They\'ll hang me alongside of him." He is quiet a while. "But nobody else knows about the beans. Only me. If I don\'t say it, nobody will."'),
      ],
      choices: [
        {
          label: 'ask him to come, and speak',
          fn: () => {
            S.flags.jemSails = 1;
            jemAnswer('He looks at you for a long time. Then he nods, once, the way a man nods when he has been told the ship is sinking. "All right," he says. "All right. Somebody ought to."', 'Jem Rudd is coming to Valparaíso, to say the lots were rigged. He may hang for it.');
          },
        },
        {
          label: 'tell him to stay',
          fn: () => {
            S.flags.jemStayed = 1;
            jemAnswer('"Stay," you tell him. "Live." He weeps then, for the first time since you found him, and says nothing at all.', 'Jem Rudd stays on the Island of Fires. Nobody in Valparaíso will hear about the beans from him.');
          },
        },
      ],
    });
  }

  /** Jem's answer, and on to the ship. */
  function jemAnswer(text, line) {
    log(line, 'lore');
    modal({ art: ART.scene('night'), title: 'Jem Rudd', text: [text], choices: [{ label: 'go aboard', fn: board }] });
  }

  /** Aboard the Perseverance on the morning tide. */
  function board() {
    const text = [
      'In the morning the canoes take you out to the ship, and you go up her side on a rope ladder, with Tupa behind you already calling the mate by name.',
      'The anchor comes up. The yards come round. The Island of Fires goes astern, its people still on the beach, and then, a day later, your own island goes by to the north: the long green hump of it, the peak, the north headland. You look for your camp, and cannot find it.',
    ];
    endChapter(text, true);
  }

  G.goAboard = goAboard;

  /* ---------------- the end of the chapter ---------------- */

  /**
   * The end of the second chapter, by the Island of Fires (`withTupa`) or
   * from the summit: who is aboard, what the castaway carries to
   * Valparaíso, and the game kept for the third chapter.
   */
  function endChapter(text, withTupa) {
    const aboard = [];
    if (withTupa) aboard.push('Tupa, signed on as a hand, who has a promise of his own to keep');
    if (S.flags.ally && !S.flags.hollisStayed && !S.flags.killedHollis) aboard.push('Tom Hollis, who has not stood on a deck in twenty years');
    if (S.flags.jemSails || (!withTupa && G.withJem())) aboard.push('Jem Rudd, who may hang for what he means to say');
    if (S.items.bristow) aboard.push('Bristow');
    const carried = [];
    if (S.items.shell) carried.push('Tavake\'s shell');
    if (S.items.parcel) carried.push('the sealed parcel for Mrs Morrow');
    if (S.items.journal) carried.push('Captain Hale\'s journal');
    if (S.items.locket) carried.push('the locket');
    if (S.items.bean) carried.push('a black bean');
    if (S.items.idol) carried.push('the little carved figure, facing the sea');
    const told = (S.n.jemTold || 0) >= 5;
    text.push(
      aboard.length ? `Aboard with you: ${aboard.join('; ')}.` : 'You go alone.',
      carried.length ? `You carry ${carried.join(', ')}.` : 'You carry nothing but what you know.',
      S.flags.promise
        ? (withTupa ? 'And you carry a promise: to bring the <i>etua</i> home.' : 'And you carry a promise you are no longer in a position to keep: you think of Tavake, at the marae, waiting.')
        : 'Somewhere ahead, in Valparaíso, there is a crate with a god in it, and a man named Crane.',
      !told ? 'You still do not know who made you the Jonah.'
        : S.flags.jemSails || (!withTupa && G.withJem()) ? 'Jem knows who rigged the lots. In Valparaíso, he means to say the name out loud.'
          : 'Jem knows who rigged the lots, and Jem is not coming. Whatever you prove in Valparaíso, you will have to prove without him.',
      gainLine(`${S.day} days in the islands.`),
      '<p class="dateline">End of Chapter Two</p>',
      '<p class="dateline">Chapter Three, The Whaler, is to come</p>',
    );
    // keep the castaway as they are, for the chapter still to come
    storage.setJSON(CARRY_KEY, Object.assign({}, S, { chapter: 3, isle: 'sea', ended: false, carriedAt: S.day }));
    G.recordTale('valparaiso');
    G.endGame('ending');
    modal({ art: ART.scene('rescue'), title: 'Bound for Valparaíso', text, choices: [G.BEGIN_AGAIN] });
  }

  /** The summit's pyre hails the Perseverance in the second chapter: the chapter ends, with whoever is at the camp. */
  G.rescueChapterTwo = function () {
    endChapter([
      'She is the whaler <i>Perseverance</i>, of New Bedford, three years out. Her captain, a lean Nantucket Quaker named Eli Swain, hears your story without a word, and then says only: "Thee had better come aboard."',
      'She is bound for Valparaíso.',
    ], false);
  };

  /** Whether a castaway has been kept for the third chapter. */
  G.carried = () => storage.getJSON(CARRY_KEY, null);

  /** Hollis has been among Tavake's people, when he lands with the castaway on the Island of Fires. */
  G.hollisAtFires = function () {
    if (G.withHollis()) S.flags.hollisSawFires = 1;
  };
})();
