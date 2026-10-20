/* Driftwood — Jem Rudd.
 * The deserter: an ordinary seaman of the Meridian who ran from Crane at
 * the High Island, and has been hiding there since. Coaxed out with food,
 * he joins the castaway, works for his keep, and over the evenings tells
 * what happened aboard: the derelict, the crate, and the lots. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, quote, gainLine, JEM_JOBS,
    add, gain, log, save, modal, queueModal, closeModal, leave, fight,
  } = G;

  /** What a meal left out for him costs. */
  const OFFERING = { food: 3 };

  /** Hungry dawns in a row before he walks away. */
  const HUNGER_LIMIT = 2;

  /** Whether Jem has joined the castaway, and not since left. */
  G.withJem = () => !!S.flags.jem;

  /** What Jem is set to do: one of JEM_JOBS, or null if he isn't with the castaway. */
  G.jemJob = () => (G.withJem() ? S.n.jemJob || 'gather' : null);

  /** Sets Jem to job `job` (a JEM_JOBS key). */
  G.setJemJob = function (job) {
    S.n.jemJob = job;
    log(JEM_JOBS[job][2]);
  };

  /* ---------------- finding him ---------------- */

  /**
   * The Waterfall Pool on the High Island, where Jem hides: what is there
   * on a visit (`first` or not), and, until he has been found, a meal to
   * leave for him on the flat stone, once a day.
   */
  G.jemPool = function (first) {
    if (S.flags.jem || S.flags.jemDead || S.flags.jemGone) {
      G.done('hiPool', S.flags.jem ? 'Behind the falls is the hollow where Jem slept for weeks, with the fish bones of his suppers still in it. He does not like to come up here.'
        : S.flags.jemDead ? 'The pool is very quiet. On the rise above the camp there are two graves now.'
          : 'His fern bed behind the falls is cold. He has gone deeper into the forest, where you will not find him.');
      return;
    }
    const fed = S.n.jemFedDay === S.day;
    const seen = [
      'Nobody comes.',
      'The food you left is gone, every crumb, and the stone wiped clean.',
      'The food you left is gone again.',
    ][Math.min(S.n.jemFood || 0, 2)];
    modal({
      art: ART.scene('falls'),
      title: 'The Waterfall Pool',
      text: first
        ? ['A waterfall drops into a deep green pool. And behind the curtain of the falls, in a hollow of the rock: a bed of cut fern, fish bones, a fire\'s ashes, a sailor\'s knife with a broken blade. Somebody lives here. Nobody is at home.', 'By the pool is a flat stone, worn smooth. A good place to leave something.']
        : [seen, fed ? 'You have left food on the stone today. There is nothing to do but wait.' : 'The flat stone by the pool is empty.'],
      choices: (fed ? [] : [{ label: 'leave food on the stone', cost: OFFERING, fn: offer }]).concat([leave('go back to camp')]),
    });
  };

  /**
   * Leaving food on the stone by the pool. The first time it is only left;
   * the next it has gone, and he is glimpsed; the third he is there, and
   * will talk, unless Hollis is with the castaway.
   */
  function offer() {
    S.n.jemFedDay = S.day;
    S.n.jemFood = (S.n.jemFood || 0) + 1;
    if (S.n.jemFood === 1) {
      closeModal();
      log('You leave food on the flat stone by the pool, and go back down to the beach without looking round.', 'lore');
    } else if (S.n.jemFood === 2) {
      closeModal();
      log('You leave more food on the stone, and wait in the ferns. Near dusk a man comes down out of the forest, thin as a rake, in the rags of a sailor\'s slops. He sees you, and is gone.', 'lore');
    } else if (G.withHollis()) {
      S.n.jemFood = 2;
      closeModal();
      log('He is there by the stone when you come, crouched over the food, and you are nearly up to him when he sees Hollis behind you: the hair, the spear. He is gone into the trees like a deer. He will not come near while Hollis is with you.', 'warn');
    } else {
      meet();
    }
  }

  /** The meeting: he knows the castaway, and thought them dead. Sit down with him, or seize him. */
  function meet() {
    AU.sfx('page');
    modal({
      art: ART.scene('falls'),
      title: 'The Deserter',
      text: [
        'He is crouched by the stone, eating with both hands. When he sees you he does not run. He stares at you the way a man stares at a ghost.',
        quote('"You\'re dead," he says. "We put you ashore. You\'re meant to be dead."'),
        'You know him, under the beard and the dirt: Jem Rudd, ordinary seaman, nineteen years old, off the Bristol docks, who bit his nails to the quick and could never keep his hat on in a blow.',
      ],
      choices: [
        { label: 'sit down, slowly', fn: trusted },
        {
          label: 'seize him',
          fn: () => fight('jem', {
            canFlee: true,
            onWin: jemKilled,
            onFlee: () => {
              S.flags.jemGone = 1;
              log('You let go of him, and he is gone into the forest. You will not see Jem Rudd again.', 'warn');
            },
          }),
        },
      ],
    });
  }

  /** Jem trusts the castaway, tells why he ran, and comes with them. */
  function trusted() {
    S.flags.jem = 1;
    S.n.jemTold = 0;
    S.n.jemToldDay = S.day;
    AU.sfx('pickup');
    modal({
      art: ART.scene('falls'),
      title: 'Jem Rudd',
      text: [
        'You sit down on the other side of the stone, and after a long while he goes on eating, watching you all the time.',
        quote('"I ran," he says at last. "Here, at the watering. The night they buried Tom Abel up on the rise. I wasn\'t staying aboard her. Not with that thing in the hold."'),
        'He will not say what thing. Not yet. But when you go back down to the beach, he follows you, a few paces behind, like a dog that has been kicked.',
      ],
      choices: [leave('go back to the beach', 'Jem Rudd, a seaman of the Meridian, has joined you. He ran from her here, and he is afraid of something she carries.', 'lore')],
    });
    save();
  }

  /** Jem dies in the struggle. */
  function jemKilled() {
    S.flags.jemDead = 1;
    modal({
      art: ART.scene('grave'),
      title: 'The Stream',
      text: [
        'He fights like a cornered cat, and then all at once he does not fight at all. He lies in the stream with the water running over his hands.',
        'You bury him on the rise, beside the other grave. Whatever he knew, he has taken with him.',
      ],
      choices: [leave('go back to the beach', 'You killed Jem Rudd by the stream on the High Island. Whatever he knew, he took with him.', 'lore')],
    });
  }

  /* ---------------- by the fire ---------------- */

  /**
   * What Jem tells, one evening at a time: the paragraphs of the telling
   * (or a function returning them, where they depend on the tale so far),
   * and the line it leaves in the log.
   */
  const TALES = [
    [[
      'Tonight, by the fire, Jem talks. He starts in the middle, the way frightened men do.',
      quote('"The <i>Ellen Grey</i>," he says. "You remember her."'),
      'You do, now he says the name: a brig off the Horn, drifting under all plain sail with not a soul aboard, and the boat pulling across to her, with you at the tiller. After that, the weeks before the island run together like wet ink.',
      quote('"You saw her cabin," Jem says. "Table laid. Galley stove still warm. And you brought the crate back across yourself."'),
      quote('"Lead-sealed, it was, and heavy as sin. <i>MORROW</i> painted on it. The old man had it swung across and stowed under his own cabin. He reckoned it was treasure. Lima gold, he said. He\'d heard the stories."'),
    ], 'Off the Horn the Meridian found the brig Ellen Grey adrift with no one aboard, and Ashby took a crate from her hold, marked MORROW.'],
    [[
      quote('"After that, there wasn\'t a breath of wind for nineteen days," Jem says. "Not a breath. The water went green in the casks. Then Will Abel went over the side on a clear night with the sea like glass, and nobody heard him go."'),
      quote('"And then the corposants. Blue fire, on every yard, all night, and not a cloud. The men said there was a Jonah aboard. The men said it was the crate. You went aft with them, and you did the asking: over the side with it, sir, or we\'ll put it there ourselves. And he said he\'d hang the first man who touched it."'),
    ], 'After the crate came aboard: nineteen days of calm, Will Abel lost overboard, and St Elmo\'s fire on the yards. You asked Ashby to put the crate over the side, and he would not.'],
    [[
      'Jem is a long while starting tonight. He keeps his eyes on the fire.',
      quote('"Me and Tom Abel opened it. Will\'s brother. Tom said if it was gold we\'d have a fistful each and nobody the wiser, and if it wasn\'t, we\'d know. So we went down in the middle watch with a bar, and we got the lid off."'),
      quote('"It wasn\'t gold. There was straw, and in the straw, a face. Black stone, with eyes of shell. Looking up. Not at us. Past us. Like it was waiting for somebody."'),
      quote('"Tom was took sick the next night. Four days, and he was dead. Old Marsh sewed him into his hammock, deaf as a post and crying like a child, and we buried him at the watering. I ran."'),
    ], 'Jem and Tom Abel opened the crate. Inside was a figure of black stone with eyes of shell. Tom sickened and died; he lies on the High Island.'],
    [() => [
      quote('"You don\'t remember the lots," Jem says. It is not a question.'),
      quote('"The night they took the ship, they cast lots for the Jonah. The old man had forbidden it, so they took the ship first. I held the hat. Beans in it, white for clear and one black for the Jonah. And you drew first."'),
      'He is quiet a while.',
      ...(S.items.bean ? ['Without meaning to, you put your hand to your jacket pocket, and feel the bean in the lining, small and hard.'] : []),
      'Something comes back to you, just for a moment: a hand on your shoulder, and a voice close to your ear, saying something kind. Then it is gone, and the back of your head aches where it has always ached.',
      quote('"Every bean in that hat was black. I know, because I put them in. I was told to. You were always going to draw it." He will not say who told him. "Not here," he says, and looks out at the dark water. "He\'d know."'),
    ], 'The night of the mutiny the crew cast lots for a Jonah, and the lot fell to you. Jem held the hat: every bean was black. Someone made sure of it.'],
    [[
      quote('"The old man was alive when I ran," Jem says. "Locked in his cabin. They passed his food in through the skylight."'),
      quote('"And the crate\'s aboard her still. Mr Crane had it nailed up again and stowed under the cabin floor. He sleeps on top of it, they say. He hasn\'t slept well since."'),
    ], 'Ashby was alive and locked in his cabin when Jem ran. The crate is still aboard the Meridian, under Crane\'s floor.'],
  ];

  /** At nightfall, if there is a fire and Jem is by it with more to tell, he tells the next part. */
  G.jemTale = function () {
    if (!G.withJem() || !S.fire || S.n.jemTold >= TALES.length || S.n.jemToldDay === S.day) return;
    const [told, line] = TALES[S.n.jemTold];
    const text = typeof told === 'function' ? told() : told;
    S.n.jemTold++;
    S.n.jemToldDay = S.day;
    queueModal({ art: ART.scene('night'), title: 'By the Fire', text, choices: [leave('go on', line, 'lore')] });
  };

  /* ---------------- his keep ---------------- */

  /** At dawn Jem eats a share of the provisions; with none for him too long, he walks away. */
  G.jemDawn = function () {
    if (!G.withJem()) return;
    if (S.res.food > 0) {
      add('food', -1);
      S.n.jemHungry = 0;
      return;
    }
    S.n.jemHungry = (S.n.jemHungry || 0) + 1;
    if (S.n.jemHungry < HUNGER_LIMIT) {
      log('There is nothing for Jem to eat this morning. He says nothing, which is worse.', 'warn');
      return;
    }
    delete S.flags.jem;
    S.flags.jemGone = 1;
    G.notice('Jem', ['In the morning Jem is gone, and his bed of fern is cold. A man who has been hungry as long as he has will not go hungry again for anyone.'],
      'Jem Rudd walked away hungry. He did not say where.', ART.scene('beach'));
  };

  /** What Jem's work brings in, every so often: wood and fibre, or fish. */
  G.jemWorks = function () {
    if (G.jemJob() === 'fish') add('food', 1);
    else gain({ wood: 1, fibre: 1 });
  };
})();
