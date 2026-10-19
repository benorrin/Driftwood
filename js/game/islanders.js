/* Driftwood — the people of the Island of Fires.
 * The descendants of those who built the marae. They left the island
 * generations ago, but still come back once a moon to lay shells around
 * the plinth their god was stolen from. In the second chapter the castaway
 * may meet them there by night; how they are received depends on what the
 * castaway has done. Their names and the word etua (god) follow Mangarevan,
 * the nearest real language; everything else is told in English. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, rand, pick, quote, gainLine, isNight, ISLES,
    gain, log, save, modal, leave, done,
  } = G;

  /** How many days a visit lasts, and how long until the next, at the next moon. */
  const VISIT_DAYS = 3;
  const NEXT_MOON = 12;

  /** A gift of iron nails, valued all over the Pacific. */
  const NAILS = { iron: 3 };

  /** How well they think of the castaway at which they will talk, and below which they will not stay. */
  const WARM = 2;
  const WARY = 0;

  /** Whether the islanders are at the marae just now, and the castaway on the island to meet them. */
  G.islandersHere = () => G.atHome() && S.n.visitUntil >= S.day;

  /** Whether the castaway knows what was in the Meridian's crate, from Jem's telling. */
  const knowsCrate = () => (S.n.jemTold || 0) >= 3;

  /** The scene at the marae while they are there. */
  const marae = () => ART.scene('platform', { people: 1 });

  /* ---------------- when they come ---------------- */

  /**
   * At dawn in the second chapter, once the castaway is home: the visit
   * comes due a few days after the first homecoming and every moon after;
   * it lasts VISIT_DAYS, and if the castaway is away when it falls due, it
   * passes them by.
   */
  G.islandersDawn = function () {
    if (S.chapter < 2 || !S.flags.homeAgain) return;
    if (!S.n.visitDue) S.n.visitDue = S.day + rand(3, 6);
    if (S.n.visitUntil && S.day > S.n.visitUntil) {
      S.n.visitUntil = 0;
      S.n.visitDue = S.day + NEXT_MOON;
      log('The lights on the marae are gone, and the sails with them.', 'lore');
      return;
    }
    if (S.n.visitUntil || S.day < S.n.visitDue) return;
    if (!G.atHome()) {
      S.n.visitDue = S.day + NEXT_MOON;
      return;
    }
    S.n.visitUntil = S.day + VISIT_DAYS - 1;
    AU.sfx('sail');
    G.queueModal({
      art: ART.scene('beach'),
      title: 'Sails',
      text: [
        S.n.visits ? 'The canoes are back.' : 'At first light there are sails off the north headland: not a ship\'s, but three crab-claw sails, low on the water, coming in fast before the wind.',
        'By the time you have climbed high enough to see, they are gone behind the headland, toward the north side of the island, where the marae stands in the trees.',
      ],
      choices: [leave('go on', S.n.visits ? 'The canoes are back, at the marae.' : 'Canoes have come to the north side of the island, near the marae.', 'lore')],
    });
    S.n.visits = (S.n.visits || 0) + 1;
  };

  /** At nightfall during a visit, the lights on the hill. */
  G.islandersNight = function () {
    if (G.islandersHere()) log('On the hill to the north, where the marae stands, there are lights moving among the trees.', 'lore');
  };

  /** Ends the visit early: they go, and come again at the next moon. */
  function sendAway() {
    S.n.visitUntil = 0;
    S.n.visitDue = S.day + NEXT_MOON;
  }

  /** They leave the marae with the castaway following. */
  G.islandersLeave = sendAway;

  /* ---------------- how they receive the castaway ---------------- */

  /**
   * How well they think of the castaway, from what the castaway has done:
   * the carved figure given back or still carried; the dead buried; Hollis,
   * whose fires they have watched for twenty years; and goodwill earned by
   * gifts and patience.
   */
  function standing() {
    let n = S.n.goodwill || 0;
    if (S.flags.idolReturned || S.flags.idolGiven) n += 2;
    if (S.items.idol) n -= 2;
    if (S.flags.buried) n += 1;
    if (S.flags.buriedStranger) n += 1;
    if (S.flags.ally) n += 1;
    if (S.flags.killedHollis) n -= 2;
    if (S.flags.jemDead) n -= 1;
    return n;
  }

  /**
   * A visit to the marae: by day, signs of them; by night, the people
   * themselves. Returns whether it handled the visit.
   */
  G.maraeVisited = function () {
    if (!G.islandersHere()) return false;
    if (!isNight()) {
      done('platform', 'There are canoe tracks in the sand below the hill, and a fire\'s ashes still warm on the lowest step, and fresh shells around the empty plinth. But there is nobody. Whoever they are, they keep to the trees by day. They will be here after dark.', null,
        'The people from the canoes keep to the trees by day. They are at the marae after dark.');
      return true;
    }
    if (S.flags.contact === 'warm') {
      welcomeBack();
      return true;
    }
    const choices = [
      { label: 'walk into the light', fn: () => received() },
      {
        label: 'leave nails on the lowest step', cost: NAILS,
        fn: () => {
          S.n.goodwill = (S.n.goodwill || 0) + 1;
          received('You set the nails on the lowest step, where the torchlight falls, and step back.');
        },
      },
    ];
    if (S.items.idol) {
      choices.push({
        label: 'hold out the carved figure',
        fn: () => {
          delete S.items.idol;
          S.flags.idolGiven = 1;
          received('You walk into the light with the little carved figure held out in both hands. A murmur goes up the steps. The old woman comes down and takes it from you, and holds it against her breast.');
        },
      });
    }
    if (!S.flags.watchedIslanders) choices.push({ label: 'watch from the trees', fn: watch });
    choices.push(leave('go back to camp'));
    modal({
      art: marae(),
      title: 'The Marae, by Night',
      text: ['You come up through the trees toward the lights, and stop at the edge of the clearing.', 'There are people on the marae: a dozen or more, with torches. Canoe people.'],
      choices,
    });
    return true;
  };

  /** Watching them from the trees, unseen. */
  function watch() {
    S.flags.watchedIslanders = 1;
    modal({
      art: marae(),
      title: 'The Marae, by Night',
      text: [
        'From the edge of the trees you watch. There are a dozen of them: men and women, and a few children who should be asleep. An old woman goes up the steps with a basket of shells and lays them one by one around the empty plinth, talking under her breath the whole while, as if to someone who is not there.',
        'A young man stands below her with a torch. He has a sailor\'s knife at his belt, and a sailor\'s way of standing.',
      ],
      choices: [
        { label: 'walk into the light', fn: () => received() },
        leave('go back to camp', 'You watched the canoe people at the marae from the trees. An old woman laid shells around the empty plinth, talking to someone who was not there.', 'lore'),
      ],
    });
  }

  /** They see the castaway, and receive them as their deeds deserve. `first` opens the telling. */
  function received(first) {
    const n = standing();
    const text = [first || 'You walk out of the trees into the torchlight with your hands open. The talking stops. Every face on the steps turns to you.'];
    if (n >= WARM) {
      S.flags.contact = 'warm';
      welcome(text);
    } else if (n >= WARY) {
      S.flags.contact = 'wary';
      S.n.goodwill = (S.n.goodwill || 0) + 1;
      sendAway();
      text.push(
        'The young man with the sailor\'s knife comes down the steps and stops an arm\'s length from you. He looks at you for a long time.',
        quote('"You," he says, in English, a whaler\'s English. "Fire on the beach. Many days. We see you." He jerks his head at the trees. "Go back to your fire."'),
        'You go. In the morning the canoes are gone. But he spoke, and they did not run.',
      );
      modal({ art: marae(), title: 'The Marae, by Night', text, choices: [leave('go back to camp', 'The canoe people sent you away from the marae, but a young man spoke to you in English. They may come again at the next moon.', 'lore')] });
    } else {
      S.flags.contact = 'hostile';
      sendAway();
      const why = S.items.idol
        ? ['The old woman looks at you, and then at the carved figure you carry, for a long moment.', 'They saw the figure you carry. To them you are one more thief.']
        : S.flags.killedHollis
          ? ['The old woman looks at you for a long moment, and you understand that she knows about the man in the jungle.', 'They knew about the wild man. Whatever they had heard of you, it was not good.']
          : ['The old woman looks at you for a long moment, and does not like what she sees.', 'They want nothing to do with you. Not yet.'];
      text.push('Spears come up all along the steps. Nobody throws one.', why[0], 'She says one word, and they go, down the far side of the hill, taking the light with them. By morning the canoes are gone.');
      modal({ art: ART.scene('platform', { shells: 1 }), title: 'The Marae, by Night', text, choices: [leave('go back to camp', why[1], 'warn')] });
    }
    save();
  }

  /** The first welcome: Tupa, who speaks a whaler's English, and Tavake, who tells of the stolen etua. */
  function welcome(text) {
    text.push(
      'Then the young man with the sailor\'s knife laughs, and comes down the steps, and taps his own chest. "Jack," he says. Then he shakes his head. "On the ship, Jack. Here, Tupa." Two seasons on a Nantucket whaler, he tells you, and he did not like it.',
      'The old woman on the top step is Tavake. She does not come down. You are called up, and she speaks, and Tupa puts it into English as he goes, leaving out what he cannot.',
    );
    if (S.flags.idolGiven) text.push('She is still holding the little figure you gave her. She sets it on the step beside the empty plinth, facing the sea.');
    modal({ art: marae(), title: 'Tupa and Tavake', text, choices: [{ label: 'listen', fn: etua }] });
  }

  /** Tavake's story of the etua taken from the empty plinth, and of the hungry island. */
  function etua() {
    AU.sfx('page');
    const text = [
      quote('"In my mother\'s time a ship came, with a wooden woman on her bow. In the night her men came up here and took our <i>etua</i> off its stone, and carried it down to the sea."'),
      quote('"That ship broke on the black rock where the birds are. But the <i>etua</i> was not in her when we looked. Her men had put it in a boat, and the boat went away over the sea."'),
      quote('"Since then we do not live here. We come, we lay the shells, we go. And the island is hungry. Every ship that comes near, it takes, to look inside her for its <i>etua</i>. The ship of the men in the cave. Your ship, nearly."'),
    ];
    if (S.flags.ally) text.push('Then Tavake asks after "the boy who stayed". She has seen his fires on the hill for twenty years, she says, and laid an extra shell for him every time.');
    modal({ art: marae(), title: 'The Etua', text, choices: crateChoices() });
    log('A ship with a wooden woman on her bow stole the canoe people\'s etua from the empty plinth. Since then, Tavake says, the island takes every ship that comes near, to look for it.', 'lore');
  }

  /** What the castaway can say of the crate, if Jem has told them; otherwise Tupa's parting words. */
  function crateChoices() {
    if (knowsCrate()) return [{ label: 'tell them about the crate', fn: tellCrate }];
    const hiding = !S.flags.jem && !S.flags.jemDead && !S.flags.jemGone;
    return [{
      label: 'say nothing',
      fn: () => modal({
        art: marae(),
        title: 'Tupa',
        text: [
          quote(`"If you learn where it went," Tupa says, "come up here when the moon is like this. We will be here."${hiding ? ' He hesitates. "There is a man on the island with the cloud. A white man, hiding. Our fishermen see him at night, by the stream. Maybe he knows things."' : ''}`),
        ],
        choices: [leave('go back to camp', hiding ? 'Tupa says there is a white man hiding by the stream on the High Island.' : 'If you learn where the etua went, Tupa says, come to the marae at the full moon.', 'lore')],
      }),
    }];
  }

  /** Telling them where their etua is: aboard the Meridian, bound for Valparaíso. Then, the promise. */
  function tellCrate() {
    modal({
      art: marae(),
      title: 'The Crate',
      text: [
        'You tell them about the <i>Ellen Grey</i>, drifting with her table laid, and the crate with <i>MORROW</i> painted on its lid, and what Jem and Tom Abel found in the straw: a face of black stone, with eyes of shell.',
        'Tupa stops putting it into English halfway through. He does not need to. Tavake is already on her feet.',
        quote('"Where is it now?" Tupa says, for her.'),
        'Aboard the <i>Meridian</i>, you tell them, bound for Valparaíso, and a man named Morrow who will pay for it. Tavake is quiet for a long time. Then she says something, and Tupa looks at you, and does not translate it at once.',
        quote('"She says: then you will bring it home."'),
      ],
      choices: [
        { label: 'promise', fn: promise },
        leave('promise nothing', 'You told the canoe people where their etua is, and promised nothing.', 'lore'),
      ],
    });
  }

  /** The promise, and the invitation south. */
  function promise() {
    S.flags.promise = 1;
    S.flags.invited = 1;
    AU.sfx('pickup');
    modal({
      art: marae(),
      title: 'A Promise',
      text: [
        'Tavake takes your hand in both of hers. Her hands are hard and dry as rope.',
        quote('"Then come to us," Tupa says. "South. Where the fires are. When the wind goes round, we go home, and you follow the canoes. Bring your boat. Bring your people." He grins. "Bring nails."'),
      ],
      choices: [leave('go back to camp', 'You promised Tavake to bring her people\'s etua home. When the wind goes round, they will lead you south to the Island of Fires.', 'lore')],
    });
    save();
  }

  /** Coming back to the marae after the welcome: by the fire with them, and the promise if it is still to make. */
  function welcomeBack() {
    if (knowsCrate() && !S.flags.promise) {
      modal({ art: marae(), title: 'Tupa and Tavake', text: ['They make room for you by the fire on the lowest step. Tavake looks at you, waiting. You know something now that you did not before.'], choices: [{ label: 'tell them about the crate', fn: tellCrate }, leave('go back to camp')] });
      return;
    }
    if (S.flags.promise) {
      modal({
        art: marae(),
        title: 'Tupa and Tavake',
        text: [
          'They make room for you by the fire on the lowest step. Tupa wants to know about Valparaíso, and whether it is like Nantucket.',
          quote('"The wind is going round," he says, and points his chin at the sky, where you can see nothing at all. "We go home at first light. You come?"'),
        ],
        choices: [
          { label: 'sail south with them', fn: () => G.setSail('smoke', true) },
          leave('not this time', 'The canoes will go home without you. They will be back at the next moon.', 'lore'),
        ],
      });
      return;
    }
    done('platform', 'They make room for you by the fire on the lowest step, and give you fish baked in leaves, and Tupa asks you about Bristol and does not believe a word of it.', null);
  }

  /* ---------------- the Island of Fires ---------------- */

  /** Lessons in reading the sea from Tavake: one a day, and on the last, the castaway can find their own way. */
  const LESSONS = [
    'Tavake has you lie on your back in the bottom of a canoe in the mouth of the lagoon, with your eyes shut, until you can feel it: not one swell but three, crossing, each from its own quarter of the world, and the island bending them as a rock bends a stream.',
    'At dawn Tavake takes you out beyond the reef to watch the terns go out to their fishing, and at dusk to watch them come home, and makes you point each time to where the land must be. Then she shows you a cloud over a far island, and how it is greener underneath, from the lagoon below.',
    'All one night on the beach, Tavake names the stars as they come up out of the sea, one after another, each over its own island, and makes you say them back to her, again and again, until you do not get one wrong.',
  ];

  /** A lesson with Tavake, one a day; the last makes the castaway a wayfinder. */
  function lesson() {
    S.n.lessonDay = S.day;
    S.n.lessons = (S.n.lessons || 0) + 1;
    const text = [LESSONS[S.n.lessons - 1]];
    let line = 'Tavake is teaching you to read the sea, one lesson a day.';
    if (S.n.lessons >= LESSONS.length) {
      S.flags.wayfinder = 1;
      text.push(quote('"Now you will not get lost," Tupa says, for her. "Not easily."'), gainLine('The longer passages are a day shorter for you now, and you can find your own way back to the Island of Fires.'));
      line = 'Tavake has taught you to read the sea. You can find your own way to the Island of Fires.';
    }
    modal({ art: ART.scene('night'), title: 'Tavake', text, choices: [leave('go back to camp', line, 'lore')] });
  }

  /** Tupa on the whalers: the Perseverance, which calls once a year, and goes on to Valparaíso. */
  function whalers() {
    S.flags.whalerKnown = 1;
    modal({
      art: ART.scene('rescue'),
      title: 'The Anchorage',
      text: [
        'Round the eastern point is a deep bay, still as a pond, where a ship could lie safe in any weather. On the beach above it stand rotted water casks, and a whaleboat\'s broken oar, and on a flat rock a dozen ships\' names have been cut by bored men waiting for a boat.',
        quote('"Once a year, when the trades blow hardest, a whale-ship comes here for water and wood," Tupa says. "Always the same one. The <i>Perseverance</i>. The captain says \'thee\' and does not drink. He pays in nails."'),
        quote('"When she comes again, she goes on to your Valparaíso." He looks at you. "When she goes, I go with her. And you, I think. To bring back the <i>etua</i>."'),
      ],
      choices: [leave('go back to camp', 'The whaler Perseverance calls at the Island of Fires once a year for water, and goes on to Valparaíso. Tupa means to sail in her, and so do you.', 'lore')],
    });
  }

  /** The Night Reef can only be fished after dark. */
  const byNight = () => (isNight() ? null : 'they fish the reef by night');

  Object.assign(ISLES.smoke, {
    camp: [300, 262],
    land() {
      AU.sfx('page');
      G.hollisAtFires();
      S.mapped.ifVillage = 1;
      modal({
        art: ART.scene('landfall'),
        title: 'The Island of Fires',
        text: [
          'On the last morning the island stands up out of the sea ahead: high and green, cloud on its peaks, smoke going up from a dozen places along the shore. The canoes run in through a gap in the reef with the surf behind them, and you follow, and somehow you do not drown.',
          'The whole beach is people. Children wade out to grab at your gunwale. Tupa jumps out of the lead canoe into the shallows and shouts something that makes everyone laugh, and you suspect it was about you.',
          'He tells you the island\'s name, and laughs at the way you say it, and after that you call it what the whalers call it: the Island of Fires. You see why the first night, when the torches of the fishing canoes go out along the reef, as many as the stars, and stay there till dawn.',
          ...(G.withHollis() ? ['An old man comes down the beach and stands in front of Hollis, and looks at him for a long time, and then puts his nose to Hollis\'s nose and his hands on his shoulders, and does not let go.'] : []),
          gainLine('You mark the village on your map.'),
        ],
        choices: [leave('go up the beach', 'You have come to the Island of Fires, behind Tavake\'s canoes. Its village is on your map.', 'lore')],
      });
    },
    again() {
      G.hollisAtFires();
      modal({
        art: ART.scene('landfall'),
        title: 'The Island of Fires',
        text: [pick([
          'Children run down the beach to meet you, shouting for nails.',
          'Tupa is on the beach before your keel touches, asking what you have brought.',
          'The canoes come out through the reef to meet you, and race you in, and win.',
        ])],
        choices: [leave('go up the beach')],
      });
    },
    locs: {
      ifVillage: {
        name: 'The Village', x: 268, y: 226, cost: {}, time: 3, art: 'landfall',
        findable: () => true,
        sees: [
          ['ifSheds', 1, 'Along the beach to the west, long open sheds, and canoes drawn up under them.'],
          ['ifTavake', 1, 'Tupa points out Tavake\'s house, set a little apart under a breadfruit tree.'],
        ],
        first() {
          done('ifVillage', [
            'The houses stand along the top of the beach under the palms: long and low, thatched to the ground, open at the sides for the breeze. There are gardens behind them, taro in wet beds and breadfruit and plantains, and pigs, and children, and dogs, and smoke.',
            'Everybody wants to see your nails. Everybody wants to touch your hair. Tupa\'s mother feeds you until you cannot move.',
            'There is a marae here too, somewhere up in the trees. Nobody takes you to it, and you do not ask.',
          ], { food: 3 }, 'The village on the Island of Fires will trade food and water for iron nails.');
        },
        repeat: () => done('ifVillage', pick([
          'Somebody\'s grandmother gives you breadfruit baked in the ashes, and watches you eat it.',
          'The children have made a raft of sticks, and are sailing it on a puddle, and wrecking it, over and over, and laughing.',
          'Tupa\'s mother asks, through Tupa, whether you have a wife. You say no. She looks at you with deep pity.',
        ]), { food: 2 }),
      },
      ifSheds: {
        name: 'The Canoe Sheds', x: 196, y: 252, cost: {}, time: 3, art: 'lagoon',
        findable: () => !!S.visits.ifVillage,
        sighted: 'Along the beach to the west, long open sheds, and canoes drawn up under them.',
        first: () => canoeSheds(true),
        repeat: () => canoeSheds(false),
      },
      ifTavake: {
        name: 'Tavake\'s House', x: 336, y: 206, cost: {}, time: 3, art: 'grove',
        findable: () => !!S.visits.ifVillage,
        sighted: 'Set a little apart under a breadfruit tree, Tavake\'s house.',
        first: () => tavakesHouse(),
        repeat: () => tavakesHouse(),
      },
      ifReef: {
        name: 'The Night Reef', x: 420, y: 296, cost: {}, time: 4, art: 'glow',
        blocked: byNight,
        findable: () => !!S.visits.ifVillage,
        clue: 'At dusk the canoes go out to the reef with torches. You will have to be here after dark to go with them.',
        sighted: 'Every night the torches go out along the reef to the south, as many as the stars.',
        first: () => done('ifReef', 'They take you out with them in a canoe, a torch in the bow, and the fish come up to the light like moths, and Tupa spears them, and laughs at you when you miss. You miss a great deal. It is the best night you have had in a year.', { food: rand(4, 6) }, 'The people of the Island of Fires fish the reef by torchlight, and will take you with them.'),
        repeat: () => done('ifReef', pick(['You fish the reef by torchlight with Tupa and his cousins, and spear a fish of your own, at last.', 'The torches go out along the reef, and you go with them, and come back with more than you can carry.']), { food: rand(3, 5) }),
      },
      ifAnchorage: {
        name: 'The Anchorage', x: 478, y: 214, cost: { food: 1 }, time: 4, art: 'rescue',
        findable: () => !!S.visits.ifVillage,
        clue: 'Tupa says there is a bay round the eastern point where the whale-ships come. It is a long walk, and the day is already hot.',
        sighted: 'Round the eastern point, a deep, still bay where a ship could anchor.',
        first: whalers,
        repeat() {
          if (G.whalerIn()) {
            G.goAboard();
            return;
          }
          done('ifAnchorage', 'The bay is empty and still. You read the ships\' names cut into the rock, and wonder which of them are still afloat.');
        },
      },
    },
    trail: [
      [2, 'A crowd of children follows you along the shore, copying the way you walk.', null, 'landfall'],
      [2, 'You walk up into the gardens, and come back with your arms full of breadfruit somebody insisted you take.', { food: 3 }, 'grove'],
      [1, 'Up a valley you are not meant to go up, an old man stops you, kindly and firmly, and turns you round.', null, 'grove'],
    ],
    lead: () => 'You have seen what the Island of Fires has to show a stranger. The rest is theirs.',
    places: [
      {
        id: 'food', label: 'trade nails for food', cd: 15, cost: { iron: 2 },
        show: () => !!S.visits.ifVillage,
        run: () => log(`Two nails buy ${gain({ food: 6 })}: breadfruit, fish baked in leaves, and a bunch of plantains as long as your arm.`),
      },
      {
        id: 'water', label: 'trade a nail for water', cd: 15, cost: { iron: 1 },
        show: () => !!S.visits.ifVillage,
        run: () => log(`A nail buys ${gain({ water: 6 })}, in gourds, from the stream above the village.`),
      },
    ],
    finds: [
      [3, () => log(`Somebody's grandmother gives you ${gain({ food: 2 })} wrapped in a leaf, and will not be refused.`)],
      [2, () => log(pick(['A crowd of children follows you along the beach, copying the way you walk.', 'Children bring you shells, one each, and wait to see what you will give them back.']))],
      [1, () => log(`On the reef at low water: ${gain({ food: 1 })}.`)],
    ],
  });

  /** The canoe sheds: the builders, and an outrigger for six nails. */
  function canoeSheds(first) {
    const text = [first
      ? 'The canoes lie under long open sheds, on rollers: the big double voyaging canoes, and the little outriggers for the lagoon. The builders are old men with adzes of stone and of iron, and they stop work to look at your boat, and then they laugh at her for a long time.'
      : 'The builders are at work on a new hull, and do not stop for you.'];
    if (S.boat.outrigger) {
      text.push(`Your ${G.boatName()} has her float and booms already. The builders look at them, and say something, and laugh again.`);
      done('ifSheds', text);
      return;
    }
    text.push(`For six nails, Tupa says, they will give your ${G.boatName()} a float and booms, lashed the way they lash their own. She would not roll then.`);
    modal({
      art: ART.scene('lagoon'),
      title: 'The Canoe Sheds',
      text,
      choices: [
        {
          label: 'trade six nails for an outrigger', cost: { iron: 6 },
          fn: () => {
            S.boat.outrigger = 1;
            AU.sfx('craft');
            done('ifSheds', `The builders fit your ${G.boatName()} with a float and booms, and laugh at her the whole time they are doing it. She will not roll now.`, null, `Your ${G.boatName()} has an outrigger now, from the canoe-builders of the Island of Fires.`);
          },
        },
        leave('go back to camp'),
      ],
    });
  }

  /** Tavake's house: a lesson in reading the sea, once a day, until there is nothing more she will teach. */
  function tavakesHouse() {
    if (S.flags.wayfinder) {
      done('ifTavake', 'Tavake gives you a fish baked in leaves, and asks you, through Tupa, which star rises over the Bird Rock. You tell her. She nods, and does not say well done.');
      return;
    }
    if (S.n.lessonDay === S.day) {
      done('ifTavake', 'Tavake is asleep in the shade. One lesson a day, Tupa says. The sea is not in a hurry.');
      return;
    }
    modal({
      art: ART.scene('grove'),
      title: 'Tavake\'s House',
      text: [S.n.lessons ? 'Tavake is waiting for you under the breadfruit tree.' : 'Tavake sits in the shade under her breadfruit tree, mending a net. She looks at you for a long time, and then says something to Tupa, who grins. "She says you sail like a pig swims," he says. "She says, sit down."'],
      choices: [{ label: 'sit with her', fn: lesson }, leave('go back to camp')],
    });
  }
})();
