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
    S, rand, quote, isNight,
    log, save, modal, leave, done,
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
    done('platform', S.flags.promise
      ? 'They make room for you by the fire on the lowest step. Tupa wants to know about Valparaíso, and whether it is like Nantucket. "When the wind goes round," he says. "Soon."'
      : 'They make room for you by the fire on the lowest step, and give you fish baked in leaves, and Tupa asks you about Bristol and does not believe a word of it.', null);
  }
})();
