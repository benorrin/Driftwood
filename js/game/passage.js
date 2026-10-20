/* Driftwood — the passage.
 * The story of the third chapter, aboard the Perseverance from the
 * islands to Valparaíso: coming aboard, Captain Swain's request for a
 * statement, short allowance, the gam with the Catherine and the man in
 * her fo'c'sle with the scarred palms, the reward for the Meridian's men,
 * Juan Fernández, the gale off the coast and the blue fire on the yards,
 * and the landfall. What the castaway carries ashore is kept for the
 * fourth chapter. Each beat is reached by the miles run or the days out,
 * at dawn (`passageDawn`). */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const storage = window.DW.storage;
  const {
    S, chance, quote, gainLine, CARRY_KEY,
    gain, log, damage, save, modal, queueModal, leave,
  } = G;

  /** Miles from Valparaíso at which the Catherine is met, if the lookout has not raised her already, and from which he may. */
  const GAM_AT = 1400;
  const GAM_SEEN = 1650;

  /** Miles out at which Juan Fernández is raised, and the gale comes on once she has left it. */
  const JUAN_RAISED = 450;
  const GALE_AT = 250;

  /** Days out on which Captain Swain asks for a statement, and on which he puts the ship on short allowance. */
  const ASKS_ON = 1;
  const SHORT_ON = 5;

  /** Dawns after the gam until the hands have worked out what the Catherine's news is worth. */
  const REWARD_AFTER = 2;

  /* ---------------- coming aboard ---------------- */

  /** The chapter's opening, page by page on the intro screen (shaped like the prologue's pages), for whoever came aboard. */
  G.whalerOpening = function () {
    const sh = S.ship;
    const company = [];
    if (sh.tupa) company.push('Tupa is entered in the articles as a boatsteerer, at the ninetieth lay, and two of the old hands shake his hand and call him Jack.');
    if (sh.hollis) company.push('Hollis signs his name in the articles very slowly, like a man remembering how. Thomas Hollis, of Liverpool. Ordinary seaman. He looks at it a long while after.');
    if (sh.jem) company.push('Jem signs as James Rudd, of Bristol, and nobody asks him what ship he came out in. Yet.');
    return [
      {
        art: 'rescue', mood: 'calm',
        text: [
          '<p class="dateline">Chapter Three</p>',
          '<p class="dateline">The Whaler</p>',
          'The <i>Perseverance</i>, of New Bedford, is three years out and deep with oil. She is bound for Valparaíso to ship it home, two thousand four hundred miles to the east and south, and she will lower for whales on the way if whales are offered.',
          'Your island goes down astern on the first evening. You watch it from the taffrail until it is a cloud, and then until it is nothing.',
        ],
      },
      {
        art: 'cabin', mood: 'calm',
        text: [
          'Captain Swain signs you on as a hand, at the hundred and fiftieth lay of whatever oil is taken between here and Valparaíso. "Thee will stand thy watch like any other man," he says. "There is no idleness on this ship, and no cursing, and no flogging."',
        ].concat(S.flags.pistolSwain ? ['He holds out his hand for the pistol, and locks it in his desk. "Thee shall have it back in Valparaíso," he says. "There are no firearms in my fo\'c\'sle."'] : [], [
          'His mate, Mr Coffin, a long grey Nantucket man with a face like a shut door, hears your story through, and says only: "Marooned." He says it as if it were a trade.',
        ], company, [
          'They put you in the mate\'s watch. You have not stood a watch since the <i>Meridian</i>.',
        ]),
      },
    ];
  };

  /* ---------------- the beats of the passage ---------------- */

  /** At dawn: whatever the passage has come to. */
  G.passageDawn = function () {
    const d = G.daysOut();
    if (d >= ASKS_ON && !S.flags.statementAsked) askStatement();
    if (d >= SHORT_ON && !S.flags.shortAllowance && !S.flags.juan) shortAllowance();
    if (S.ship.miles <= GAM_AT && !S.flags.gam) gam();
    if (S.flags.gam && !S.flags.reward && S.day >= S.n.gamDay + REWARD_AFTER) reward();
    if (S.ship.miles <= JUAN_RAISED && !S.flags.juan) landHo();
    if (S.flags.gale && !S.ship.galeOver && S.day > S.n.galeDay) {
      S.ship.galeOver = 1;
      G.setShipWind('fair');
    }
    if (S.flags.juan && !S.flags.gale && S.ship.miles <= GALE_AT) gale();
    if (S.ship.miles <= 0) arrive();
  };

  /** What the lookout may see from the masthead before the passage brings it: the Catherine, or the loom of Juan Fernández. */
  G.mastheadSees = function () {
    if (!S.flags.gam && S.ship.miles <= GAM_SEEN) {
      gam();
      return true;
    }
    if (!S.flags.juan && S.ship.miles <= JUAN_RAISED + 150 && !S.flags.juanLoom) {
      S.flags.juanLoom = 1;
      log('Far off the larboard bow, a cloud that does not move with the others. Land, by tomorrow or the day after. Mr Coffin says it is Juan Fernández.', 'lore');
      return true;
    }
    return false;
  };

  /** Captain Swain asks for a written statement, to give the consul at Valparaíso. */
  function askStatement() {
    S.flags.statementAsked = 1;
    queueModal({
      art: ART.scene('cabin'),
      title: 'Captain Swain',
      text: [
        'Captain Swain sends for you in the afternoon watch. He has his Bible on the table, and the ship\'s log beside it, and his spectacles pushed up on his forehead.',
        quote('"When we come to Valparaíso," he says, "thee will go before the British consul, and he will ask thee what happened aboard thy ship. I would have it written down before then, while we have the time. Every soul aboard her, and what thee knows of each, and of thyself. I will give thee paper."'),
        quote('"A written statement is a thing a man can stand on," he says. "Or hang by. Write it true."'),
      ],
      choices: [leave('go on', 'Captain Swain wants a written statement for the consul: every soul aboard the Meridian. Write it in your watch below.', 'lore')],
    });
  }

  /** The ship's bread is going, and every man's allowance is cut until she can water and provision at Juan Fernández. */
  function shortAllowance() {
    S.flags.shortAllowance = 1;
    S.ship.allowance = 'short';
    queueModal({
      art: ART.scene('cabin'),
      title: 'Short Allowance',
      text: [
        'The steward has been into the bread-room, and come out with a face. Three years out: the bread is weevilled to dust, two casks of beef have gone bad, and the water in the after hold tastes of the casks.',
        'Captain Swain has all hands aft, and tells them plainly. Short allowance, a third off every man\'s bread and beef, until Juan Fernández. Nobody grumbles where he can hear it.',
        gainLine('Each dawn on short allowance, eat a provision of your own or go hungry. Fish, and save what the try-works give.'),
      ],
      choices: [leave('go on', 'The ship is on short allowance until Juan Fernández.', 'warn')],
    });
  }

  /* ---------------- the calm ---------------- */

  /** The first calm of the passage, and what the sea like glass brings back. */
  G.calmFalls = function () {
    G.recall('glass', null, [
      'All day she lies on a sea as flat as glass, her sails hanging, the pitch soft in the deck seams. The hands lie about in what shade there is. Somebody forward starts to whistle, and stops when the mate looks at him.',
      'You are at the rail, looking at nothing, when it comes.',
    ]);
  };

  /* ---------------- the gam ---------------- */

  /** A sail, and then a whaler bearing down to gam: Captain Swain goes across, and her boat comes to the Perseverance. */
  function gam() {
    S.flags.gam = 1;
    S.n.gamDay = S.day;
    G.markChart('gam with the Catherine');
    AU.sfx('sail');
    queueModal({
      art: ART.scene('gam'),
      title: 'A Gam',
      text: [
        '"Sail ho!" from the masthead, and by noon she is near enough to read: a whaler, deep and dirty, the <i>Catherine</i> of Nantucket, two years out on the offshore ground. She bears down on you and backs her main-yard within hail, and Captain Swain has his boat lowered at once.',
        'A gam, the hands call it: two whalers met at sea, the captains visiting in one ship and the mates in the other, the boats\' crews passing the afternoon in each other\'s fo\'c\'sles, newspapers and letters and lies changing hands.',
      ],
      choices: [
        { label: 'pull an oar in the captain\'s boat', fn: () => voice(true) },
        { label: 'stay aboard to meet her boat', fn: () => voice(false) },
      ],
    });
  }

  /** In the Catherine's fo'c'sle, or among her boat's crew: a Nantucket voice the castaway knows. */
  function voice(across) {
    const text = [
      across
        ? 'You go across with the captain\'s boat, and while Captain Swain is in the <i>Catherine</i>\'s cabin her hands take you down into the fo\'c\'sle for the news.'
        : 'Her mate\'s boat comes across, and her crew come down into your fo\'c\'sle for the news, and one of them is a long lean man with a Nantucket voice, chewing tobacco.',
      'He calls himself Ned Gardner, and he signed on at Callao, they say. When he takes off his hat to wipe his face you see his hands: both palms scarred straight across, in old white weals, as if a rope had once run out through them.',
    ];
    if (S.memories.helm) text.push('You have seen those hands before, on the spokes of the <i>Meridian</i>\'s wheel, in the dark, holding her off.');
    text.push(
      'He knows you before you know him. He goes white under his tan, and does not look at you again all afternoon.',
      'At dusk, when the boats are being called away, he catches your arm at the rail where nobody can hear.',
    );
    modal({ art: ART.scene('gam'), title: 'A Voice You Know', text, choices: [{ label: 'hear him out', fn: pellTells }] });
  }

  /** Elias Pell, who held the Meridian's wheel: how she was taken, and what Crane wrote of the castaway. */
  function pellTells() {
    G.achieve('gam');
    modal({
      art: ART.scene('night'),
      title: 'Elias Pell',
      text: [
        quote('"Don\'t," he says. "Don\'t say my name. I\'m Gardner here, and Gardner I\'ll stay." His grip on your arm is hard enough to hurt. "She was took, mate. Off Callao. A British sloop of war come down on us, and we hadn\'t the hands to run, and I seen her coming and went over the side and swum two mile. Signed on here a week after. They\'ll have took her to Valparaíso, her and the rest of them, and that crate."'),
        quote('"And you." He laughs, and it is not a kind laugh. "Crane wrote it all down, in the log, fair and neat. Captain died of a fever and was buried at sea. Pask lost overboard in a squall. And the bosun\'s mate run, at a watering place, after stirring up the hands. That\'s you, mate. In writing. There\'s paper up at Callao: the consul wants every man of the <i>Meridian</i> he can lay hands on, and the deserter worst of all."'),
        quote('"Morgan went up to the fore-yard alone one night off the Galápagos and didn\'t hold on. Log says he fell." He spits over the side. "Keep your mouth shut about me, and I\'ll keep mine shut about you. That\'s fair."'),
      ],
      choices: pellChoices(true),
    });
  }

  /** What may be said to Pell: keep his secret, ask him to swear, or give him up. `ask` offers asking him. */
  function pellChoices(ask) {
    const out = [{ label: 'keep his secret', fn: sparePell }];
    if (ask) out.push({ label: 'ask him to swear to it in Valparaíso', fn: pellRefuses });
    out.push({ label: 'give him up to Captain Swain', fn: givePell });
    return out;
  }

  /** He will not swear to anything. */
  function pellRefuses() {
    modal({
      art: ART.scene('night'),
      title: 'Elias Pell',
      text: [quote('"Swear?" He stares at you. "I held the wheel, mate. I held her off while it was done. They\'d hang me alongside of Crane, and you know it." The boat is calling for him. "Well?"')],
      choices: pellChoices(false),
    });
  }

  /** Pell goes back to the Catherine as Ned Gardner. */
  function sparePell() {
    S.flags.pell = 'spared';
    G.achieve('pellSpared');
    modal({
      art: ART.scene('gam'),
      title: 'Ned Gardner',
      text: [
        '"Go on, then, Ned Gardner," you say. He lets go of your arm, and looks at you a moment as if he would say something else, and then he is over the side and into the <i>Catherine</i>\'s boat, and pulling away into the dusk.',
        'By morning she is hull down to the westward, and you have only his word for what Crane wrote.',
      ],
      choices: [leave('go on', 'Pell, who held the Meridian\'s wheel, says she was taken off Callao, and that Crane\'s log names you a deserter who stirred up the hands. You kept his secret.', 'lore')],
    });
  }

  /** Pell is given up: Captain Swain tells the Catherine's master, and she carries him to Valparaíso in irons. */
  function givePell() {
    S.flags.pell = 'given';
    G.achieve('pellGiven');
    G.regard(-1);
    modal({
      art: ART.scene('gam'),
      title: 'Elias Pell',
      text: [
        'You go aft to Captain Swain before the boats are hoisted, and tell him. He hears you without a word, and then he is a long while at the rail, looking at the other ship.',
        quote('"Thee is sure," he says. You say you are. He goes across himself.'),
        'They take Pell below in irons in the <i>Catherine</i>, to be carried to Valparaíso and given to the consul. As they take him he looks across the water at you, and you cannot see his face, only that he is looking.',
        'Your own fo\'c\'sle heard all of it. Nobody says anything. Nobody needs to.',
      ],
      choices: [leave('go on', 'Pell says the Meridian was taken off Callao, and Crane\'s log names you a deserter. You gave him up; he goes to Valparaíso in irons.', 'lore')],
    });
  }

  /* ---------------- the reward ---------------- */

  /** The hands have heard the Catherine's news, and Gorham the cooper has done the sums. */
  function reward() {
    S.flags.reward = 1;
    if (!S.ship.jem || S.flags.jemIrons) {
      const st = S.ship.standing;
      queueModal({
        art: ART.scene('night'),
        title: 'The Reward',
        text: [
          'The <i>Catherine</i>\'s men brought the news from Callao into your fo\'c\'sle: the British consul at Valparaíso is paying for the <i>Meridian</i>\'s men. Gorham the cooper has been working it out on his fingers ever since.',
          quote('"Bosun\'s mate," he says one night, to nobody. "A deserter, they say. I wonder what a deserter fetches."'),
          st >= 4
            ? 'Somebody throws a boot at him, and the fo\'c\'sle laughs, and that is the end of it.'
            : 'Nobody laughs. The next morning you see him at the mate\'s elbow on the quarterdeck, and Mr Coffin looking forward at you. When Captain Swain hears of it he says, so that the whole deck can hear him, that the man came aboard of his own will and will go ashore the same way. But Mr Coffin keeps looking.',
        ],
        choices: [leave('go on', 'Gorham the cooper has heard there is money for the Meridian\'s men.', st >= 4 ? '' : 'warn')],
      });
      return;
    }
    const st = S.ship.standing;
    const text = [
      'The <i>Catherine</i>\'s men brought the news from Callao into your fo\'c\'sle: the British consul at Valparaíso is paying for the <i>Meridian</i>\'s men, fifty dollars a head. Gorham the cooper has been working it out on his fingers ever since.',
      quote('"Rudd," he says, one night, looking at nothing. "James Rudd, of Bristol. Shipped from the islands, same as the bosun\'s mate. I knew a Rudd in a Bristol ship once." Jem goes on mending his shirt. His hands are shaking.'),
    ];
    if (st >= 6) {
      S.flags.jemSafe = 1;
      text.push(
        'It is the old hands who answer, not you. "There\'s no Bristol man aboard this ship," one of them says, "is there, lads?" And nobody says there is. Gorham looks round the fo\'c\'sle, and shuts his mouth, and does not open it on the subject again.',
        gainLine('The hands have closed ranks around Jem, for your sake.'),
      );
      queueModal({ art: ART.scene('night'), title: 'The Reward', text, choices: [leave('go on', 'Gorham the cooper knows what Jem is worth to the consul. The hands have closed ranks around him.', 'lore')] });
      return;
    }
    if (st < 3) {
      S.flags.jemIrons = 1;
      text.push(
        'Nobody says anything at all. In the morning Gorham is at the mate\'s elbow, and by the forenoon watch Jem is in irons in the after hold, and Mr Coffin has entered him in the log as a deserter from a British ship, to be given to the consul.',
        'Captain Swain will not have him ill-used. That is all he can promise.',
      );
      queueModal({ art: ART.scene('night'), title: 'The Reward', text, choices: [leave('go on', 'Gorham the cooper gave Jem up to the mate. He is in irons, to be handed to the consul at Valparaíso.', 'warn')] });
      return;
    }
    text.push('Nobody laughs. Later, on deck, Jem finds you in the dark. "He\'ll go to the mate," he whispers. "He\'ll go to the mate, and they\'ll hang me in Valparaíso before I\'ve opened my mouth."');
    queueModal({
      art: ART.scene('night'),
      title: 'The Reward',
      text,
      choices: [
        {
          label: 'take him to Captain Swain',
          fn: () => {
            S.flags.jemSwain = 1;
            G.achieve('witness');
            modal({ art: ART.scene('cabin'), title: 'Captain Swain', text: ['You take Jem aft yourself, and he tells Captain Swain who he is, and what he held, and why he is going to Valparaíso.', quote('"Then he is my witness," Captain Swain says, "and not the consul\'s prize, and no man aboard this ship will lay a hand on him for money." He writes it in the log, and has Mr Coffin sign it. Mr Coffin signs it.')], choices: [leave('go on', 'Captain Swain has entered Jem in the log as a witness under his protection.', 'lore')] });
          },
        },
        {
          label: 'tell him to keep his head down',
          fn: () => {
            const caught = chance(0.5);
            if (caught) S.flags.jemIrons = 1;
            else S.flags.jemSafe = 1;
            modal({ art: ART.scene('night'), title: 'The Reward', text: [caught ? 'He keeps his head down. It does no good. By the next forenoon watch Gorham has been to the mate, and Jem is in irons in the after hold, to be given to the consul.' : 'He keeps his head down, and Gorham watches him, and does nothing, for now. Perhaps the cooper is not as sure as he talks.'], choices: [leave('go on', caught ? 'Jem is in irons, given up by the cooper.' : 'Jem is keeping his head down.', caught ? 'warn' : '')] });
          },
        },
        {
          label: 'tell him to run at Juan Fernández',
          fn: () => {
            S.flags.jemRun = 1;
            modal({ art: ART.scene('night'), title: 'The Reward', text: ['"Juan Fernández," you tell him. "She waters there. Go ashore with the watering party, and stay ashore." He looks at you for a long moment, the way he looked at you by the fire on the Island of Fires. "And the beans?" he says. You have no answer to that.'], choices: [leave('go on', 'Jem means to run at Juan Fernández.', 'lore')] });
          },
        },
      ],
    });
  }

  /* ---------------- Juan Fernández ---------------- */

  /** Land ho: Juan Fernández, and a day at anchor in its bay for wood and water. */
  function landHo() {
    S.flags.juan = 1;
    S.ship.miles = G.JUAN_AT;
    S.ship.allowance = 'full';
    G.markChart('Juan Fernández');
    AU.sfx('sail');
    queueModal({
      art: ART.scene('juan'),
      title: 'Juan Fernández',
      text: [
        'Land at dawn: sheer green peaks going up into a cap of cloud, and a bay under them where the water is so clear you can see the anchor all the way down. Juan Fernández. Captain Swain means to wood and water here, and shoot goats, and give the hands a day ashore.',
        'The Chileans kept convicts here once. The caves they lived in are still cut into the hill above the bay, empty now but for goats. And somewhere up on the ridge, they say, is the place where a Scotchman named Selkirk climbed every day for four years to watch for a sail.',
        gainLine('The ship goes back on full allowance.'),
      ],
      choices: [
        { label: 'go with the watering party', fn: watering },
        { label: 'climb to the lookout', fn: selkirk },
      ],
    });
  }

  /** Ashore with the watering party: fruit run wild, crayfish, goats, and casks to fill. */
  function watering() {
    const got = gain({ fruit: 8, food: 4 });
    G.regard(0.3);
    modal({
      art: ART.scene('juan'),
      title: 'The Watering Party',
      text: [
        'All day you roll casks up and down the beach, and fill them from a stream so cold it makes your teeth ache. Somebody planted peaches and quinces here once, a long time ago, and they have run wild all up the valley; the hands eat them until they are sick, and then eat more. The crayfish in the shallows are as long as your arm.',
        gainLine(`You bring off ${got}.`),
      ].concat(jemRuns()),
      choices: [leave('go aboard', 'The Perseverance has wooded and watered at Juan Fernández.')],
    });
  }

  /** Up to the saddle of the ridge where Selkirk kept his watch. */
  function selkirk() {
    const got = gain({ fruit: 3 });
    G.achieve('selkirk');
    modal({
      art: ART.scene('juan'),
      title: 'The Lookout',
      text: [
        'You climb all morning, up through tree ferns and wet scrub, to a saddle of rock between two peaks where the wind comes over from the other side of the island. There is no mark there. There is only the view: the sea on both sides, to the end of the world.',
        'Four years, they say he sat here. You think about your notches, and the summit of your own island, and the pyre, and you sit where he sat until the ship fires a gun to call the boats.',
        S.items.crusoe ? 'You had his story in a book, once, on your island. Robinson Crusoe, of York, Mariner. The man who wrote it never came here.' : 'He went home in the end, they say. He did not like it.',
        gainLine(`On the way down you fill your shirt with wild peaches: ${got}.`),
      ].concat(jemRuns()),
      choices: [leave('go aboard', 'You sat where Selkirk kept his watch, on Juan Fernández.', 'lore')],
    });
  }

  /** If Jem means to run, he goes ashore at Juan Fernández and does not come back: returns the lines that tell it. */
  function jemRuns() {
    if (!S.flags.jemRun || !S.ship.jem || S.flags.jemIrons) return [];
    S.flags.jemRan = 1;
    return ['When the boats are called away, Jem is not in any of them. The mate sends men up the valley after him, and they come back at dusk with goats and nothing else. In the morning the <i>Perseverance</i> sails without him.', 'Nobody in Valparaíso will hear about the beans from him.'];
  }

  /* ---------------- the gale ---------------- */

  /** Off the coast it comes on to blow: lay aloft to reef, or man the pumps; and at night the corposants. */
  function gale() {
    S.flags.gale = 1;
    S.n.galeDay = S.day;
    G.setShipWind('gale');
    queueModal({
      art: ART.scene('tempest'),
      title: 'A Gale',
      text: [
        'Two days out from Juan Fernández it comes on to blow out of the north-west, the worst quarter on this coast, and by the afternoon watch it is a whole gale and rising. She is under close-reefed topsails, and they must come in.',
        '"Lay aloft and furl the main-topsail!" Mr Coffin\'s voice, from somewhere in the spray.',
      ],
      choices: [
        { label: 'lay aloft', fn: () => aloft() },
        { label: 'man the pumps', fn: pumps },
      ],
    });
  }

  /** Out on the yard in a whole gale. */
  function aloft() {
    const fall = chance(0.15 + (S.items.idol ? 0.1 : 0));
    if (fall) damage(3, 'aloft');
    if (S.ended) return;
    G.regard(fall ? 0.5 : 1);
    modal({
      art: ART.scene('corposants'),
      title: 'Aloft',
      text: fall
        ? ['Out on the yard, with the sail trying to tear you off it, a sea lays her over and your foot-rope goes slack. You fall the height of the topmast and fetch up in the main-rigging, half your ribs stove in, and somebody drags you down.', gainLine('You lose 3 health.')]
        : ['Out on the yard, with the sail trying to tear you off it and the sea a hundred feet straight down when she rolls, you fist the canvas in with the rest of them, and pass the gaskets, and come down. Mr Coffin watches you come down, and says nothing, which is a great deal for him.', gainLine('The hands saw you on the yard.')],
      choices: [{ label: 'go on', fn: corposants }],
    });
  }

  /** At the pumps all the afternoon, while she makes water through her strained seams. */
  function pumps() {
    G.regard(0.3);
    modal({
      art: ART.scene('tempest'),
      title: 'The Pumps',
      text: ['She is making water through her strained seams, and you take your turn at the pumps with the rest, two hours on and two off, until you cannot feel your arms. Somebody else goes aloft.'],
      choices: [{ label: 'go on', fn: corposants }],
    });
  }

  /** The middle watch of the gale, and blue fire on every yard: what the hands say, and what comes back. */
  function corposants() {
    const st = S.ship.standing;
    const talk = st < 3
      ? ['Somebody forward says the word, quietly: Jonah. Nobody says it again, but nobody looks at you, either.']
      : st >= 6
        ? ['The hands stand in the waist looking up at it, and the word you are afraid of is not said. Somebody says it is lucky, and somebody else says it is the Lord\'s lantern, and Ezra asks you, of all people, if it means you will see home again.']
        : ['The hands stand in the waist looking up at it, and mutter, and one or two of them look at you.'];
    if (st < 3) G.regard(-0.5);
    // the gale's card gives way to the recollection
    G.closeModal();
    G.recall('corposants', galeNight, [
      'In the middle watch the blue fire comes: on every yard-arm, and on the trucks of the masts, and running along the stays in beads, burning without heat and without a sound.',
    ].concat(talk, [
      quote('"It is the electrical fluid," Captain Swain says, beside you. "Dr Franklin explained it." He looks up at it a long while all the same.'),
    ]));
  }

  /** By morning the worst is over. */
  function galeNight() {
    modal({
      art: ART.scene('corposants'),
      title: 'Corposants',
      text: ['Toward dawn the blue fire goes out, yard by yard, and the wind begins to take off, and the sea goes down. Somewhere ahead, under the cloud to the east, is the coast.'],
      choices: [leave('go on', 'The gale has blown itself out, and the corposants with it.')],
    });
  }

  /* ---------------- the carved figure ---------------- */

  /** After the second mishap, Captain Swain has noticed: give the figure to Tupa, throw it over, or keep it. */
  G.idolNoticed = function () {
    const choices = [];
    if (S.ship.tupa) {
      choices.push({
        label: 'give it to Tupa to take home',
        fn: () => {
          delete S.items.idol;
          S.flags.idolGiven = 1;
          S.flags.idolTupa = 1;
          G.regard(0.5);
          modal({ art: ART.scene('cabin'), title: 'Tupa', text: ['Tupa takes it from you in both hands, and looks at it, and says something to it in his own tongue that he does not translate. He wraps it in a cloth and puts it in his sea-chest. "It goes home with the other one," he says.', 'Whether it is the figure or not, nothing else goes wrong aboard the <i>Perseverance</i> on this passage. The hands believe it is. That is almost the same thing.'], choices: [leave('go on', 'Tupa has the carved figure. It goes home with the god.', 'lore')] });
        },
      });
    }
    choices.push(
      {
        label: 'throw it over the side',
        fn: () => {
          S.flags.idolThrownShip = 1;
          modal({ art: ART.scene('night'), title: 'The Carved Figure', text: ['You go to the lee rail in the middle watch and throw it as far as you can, and it does not even splash.', 'In the morning Ezra brings it to you, dripping. He found it in the lee scuppers, he says. A sea must have washed it back aboard. He holds it out at arm\'s length, and he does not look at its face.'], choices: [leave('go on', 'You threw the carved figure over the side. A sea washed it back aboard.', 'warn')] });
        },
      },
      leave('keep it', 'Captain Swain knows you carry something that is not yours.', 'warn'),
    );
    queueModal({
      art: ART.scene('cabin'),
      title: 'Captain Swain',
      text: [
        'Captain Swain sends for you. He does not ask you to sit.',
        quote('"I have been at sea forty years," he says, "and I am not a superstitious man. I do not hold with Jonahs. But the hands say thee carries something in thy bag that is not thine, and that it looks at them." He is quiet a moment. "Is it thine?"'),
        'You think of the little carved figure, and its face, and the way it is always turned to the room.',
      ],
      choices,
    });
  };

  /* ---------------- the Jonah ---------------- */

  /** The hands have learned why the Meridian put the castaway ashore, and the castaway's standing is low enough for it to matter. */
  G.jonahTalk = function () {
    G.achieve('jonah');
    const choices = [];
    if ((S.n.jemTold || 0) >= 4 || S.flags.statement === 'lots') {
      choices.push({
        label: 'tell them about the beans',
        fn: () => {
          G.regard(1.5);
          modal({ art: ART.scene('night'), title: 'Jonah', text: ['You sit down on a sea-chest in the middle of the fo\'c\'sle and tell them: the hat, and the beans in it, and every bean black, and who drew first. Nobody says anything for a long time.', quote('"Rigged," Gorham says at last. "The whole of it." He sounds almost respectful. "Well, then, you\'re no more a Jonah than I am."'), 'Somebody slings your hammock again.'], choices: [leave('turn in', 'You told the fo\'c\'sle the lots were rigged. They believe you.', 'lore')] });
        },
      });
    }
    choices.push({
      label: 'say nothing, and sling it again',
      fn: () => {
        G.regard(0.5);
        modal({ art: ART.scene('night'), title: 'Jonah', text: ['You sling your hammock again, and turn in, and say nothing. A man who says nothing is hard to go on hating. By the end of the week somebody passes you the tea.'], choices: [leave('turn in', 'You said nothing, and slung your hammock again.')] });
      },
    });
    queueModal({
      art: ART.scene('night'),
      title: 'Jonah',
      text: [
        'It has got about the fo\'c\'sle, from the mate\'s table by way of the steward, why the <i>Meridian</i> put you ashore. They drew lots for a Jonah, and it was you.',
        'When you come below at the end of the first watch your hammock has been cut down, and your bag is in the bilge, and nobody has seen anything.',
      ].concat(S.ship.tupa ? ['Tupa gets down from his bunk and hangs your bag up to drip, without a word, and looks round the fo\'c\'sle until the nearest men look away.'] : []),
      choices,
    });
  };

  /* ---------------- landfall ---------------- */

  /** The Perseverance comes into Valparaíso Bay, and the Meridian is lying there. */
  function arrive() {
    if (S.flags.arrived) return;
    S.flags.arrived = 1;
    AU.sfx('sail');
    queueModal({
      art: ART.scene('valparaiso'),
      title: 'Valparaíso',
      text: [
        'Land at first light: a long blue wall along the whole of the eastern sky, with snow on it, and under it the brown hills of the coast. By noon you are standing into a wide bay, and there is a town climbing its hills all round it, white and red and crowded, and the bay crowded with shipping.',
        'A British frigate lies under the town with an admiral\'s flag at her mizzen, and men-of-war about her. And among the merchantmen, under the frigate\'s guns, a barque with her yards squared and her sails sent down, a guard boat pulling slowly round her, and a marine at her gangway.',
        'You know her by the patch in her fore-topsail, which you sewed yourself off the Horn, and which somebody has left bent to the yard. She is the <i>Meridian</i>.',
      ],
      choices: [{ label: 'go aft to be paid off', fn: payOff }],
    });
  }

  /** Captain Swain pays the castaway off, and gives back the pistol; and what Mr Coffin thinks of them now. */
  function payOff() {
    const lay = S.ship.lay;
    S.purse = Math.max(0, lay);
    const won = S.ship.standing >= 6;
    S.flags.coffin = won ? 'for' : 'against';
    if (S.flags.pistolSwain) {
      S.items.pistol = 1;
      delete S.flags.pistolSwain;
    }
    const text = [
      lay > 0
        ? `Captain Swain pays you off in his cabin, as he would any hand: your lay of the ${S.ship.barrels} barrels taken since the islands, less the slop chest. It comes to ${G.money(lay)}. He counts it into your hand in Spanish silver.`
        : lay < 0
          ? `Captain Swain pays you off in his cabin, as he would any hand. Your lay of the ${S.ship.barrels} barrels taken does not cover the slop chest, and you owe the ship ${G.money(-lay).slice(1)}. He writes it off with a stroke of his pen, and does not mention it again.`
          : 'Captain Swain pays you off in his cabin, as he would any hand. There is nothing to pay: the ship has taken no oil since the islands. He gives you a dollar of his own, and will not hear a word about it.',
      S.items.pistol ? 'He unlocks his desk and gives you back the pistol, with its single shot. "I would rather thee did not need it," he says.' : '',
      quote('"I will go with thee to the consul," he says, "and tell him how thee came to us, and how thee bore thyself aboard. What thee tells him is thy own affair."'),
      won
        ? 'Mr Coffin comes to the side as you go down into the boat, and holds out his hand. "I did not believe a word of it," he says. "I believe some of it now." From him, it is a testimonial.'
        : 'Mr Coffin does not come to the side. You know what he will tell the consul if he is asked: that he did not believe a word of it, and does not now.',
    ].filter(Boolean);
    modal({ art: ART.scene('cabin'), title: 'Paid Off', text, choices: [{ label: 'go ashore', fn: G.endChapterThree }] });
  }

  /**
   * The end of the third chapter: who came ashore, what the castaway
   * carries into Valparaíso, and the game kept for the fourth chapter.
   */
  G.endChapterThree = function () {
    const sh = S.ship;
    const text = [];
    const ashore = [];
    if (sh.tupa) ashore.push('Tupa, who looks up at the town on its hills and says only, "Now. Where is it?"');
    if (sh.hollis) ashore.push('Tom Hollis, who stands on the mole with his hands in his pockets and stares at a city for the first time in twenty years');
    if (sh.jem && S.flags.jemRan) text.push('Jem Rudd is somewhere on Juan Fernández, among the goats, and the beans are with him.');
    else if (sh.jem && S.flags.jemIrons) text.push('Jem Rudd is taken ashore in irons, between two marines, and does not look back at you.');
    else if (sh.jem) ashore.push(S.flags.jemSwain ? 'Jem Rudd, under Captain Swain\'s protection, white to the lips' : 'Jem Rudd, his cap pulled down, keeping to the back');
    if (S.items.bristow) ashore.push('Bristow, in a cap the cooper gave him');
    text.unshift(ashore.length ? `Ashore with you: ${ashore.join('; ')}.` : 'You go ashore alone.');
    if (S.flags.pell === 'given') text.push('The <i>Catherine</i> came in two days before you. Elias Pell is in the gaol, with the rest of the <i>Meridian</i>\'s men.');
    else if (S.flags.pell === 'spared') text.push('Somewhere to the westward, a man who calls himself Ned Gardner is cutting in a whale, and you have only his word for what Crane wrote.');
    text.push(
      S.items.statement ? 'In your jacket is your statement, the <i>Meridian</i>\'s company in your own hand. And in Mr Crane\'s log, by Pell\'s account, you are a deserter.' : 'You have written nothing down. And in Mr Crane\'s log, by Pell\'s account, you are a deserter.',
      S.items.idol ? 'In your bag the little carved figure is facing the town.' : S.flags.idolTupa ? 'In Tupa\'s sea-chest, wrapped in a cloth, the little carved figure goes ashore with him.' : '',
      S.flags.promise ? 'Somewhere in this town, in a crate with a god in it, is the thing you promised to bring home.' : 'Somewhere in this town is a crate with a god in it, and a man named Crane.',
      gainLine(`${G.daysOut()} days from the islands. ${G.money(S.purse || 0)} in your pocket.`),
      '<p class="dateline">End of Chapter Three</p>',
      '<p class="dateline">Chapter Four, Valparaíso, is to come</p>',
    );
    // keep the castaway as they are, for the chapter still to come
    storage.setJSON(CARRY_KEY, Object.assign({}, S, { chapter: 4, isle: 'valparaiso', ended: false, carriedAt: S.day }));
    G.recordTale('arrived');
    G.endGame('ending');
    modal({ art: ART.scene('valparaiso'), title: 'Ashore', text: text.filter(Boolean), choices: [G.BEGIN_AGAIN] });
  };

  /* ---------------- starting the chapter ---------------- */

  /** Begins the third chapter from the castaway kept at the end of the second: the opening pages, then the deck. */
  G.beginChapterThree = function () {
    const carry = G.carried();
    if (!carry || carry.chapter !== 3) return;
    G.clearSave();
    G.replaceState(G.whalerState(carry));
    G.playPages(G.whalerOpening(), () => {
      G.enterGame();
      log(`Day ${S.day}`, 'day');
      log('You wake in a hammock, in a fo\'c\'sle that stinks of oil and tobacco and men, and for a moment you do not know where you are.');
      log('The <i>Perseverance</i> is two thousand four hundred miles from Valparaíso.', 'lore');
      log('The forenoon watch is called. Your watch on deck.');
      save();
    });
  };
})();
