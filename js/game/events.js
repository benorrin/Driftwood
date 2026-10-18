/* Driftwood — happenings.
 * The small events that befall the castaway between the great ones: things
 * seen from the beach, things the tide brings in, and what turns up while
 * exploring. They are mostly there for the telling, and a few are nods to
 * other castaways. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, rand, chance, pick, quote, gainLine,
    add, gain, log, damage, isNight, modal, leave, closeModal, fight,
  } = G;

  /**
   * Each happening has an `id`, an optional `when()` (whether it can happen
   * now), an optional `limit` on how many times it may ever happen, an
   * optional `weight` (default 1), and `run()`.
   */

  /** Picks one of `list` that can happen now, by weight, and runs it. Returns whether one did. */
  function happen(list) {
    const ok = list.filter((e) => (!e.limit || (S.events[e.id] || 0) < e.limit) && (!e.when || e.when()));
    let roll = Math.random() * ok.reduce((t, e) => t + (e.weight || 1), 0);
    const e = ok.find((x) => (roll -= x.weight || 1) < 0);
    if (!e) return false;
    S.events[e.id] = (S.events[e.id] || 0) + 1;
    e.run();
    return true;
  }

  /** A story card on the beach, with `opts` for the picture (a ship, a ball). */
  function beachCard(title, text, choices, opts) {
    modal({ art: ART.scene('beach', opts), title, text, choices });
  }

  /* ---------------- at camp ---------------- */

  /** A sail passes, and does not see you; `how` is what you did about it. */
  function shipPasses(how) {
    beachCard('Over the Horizon', [
      how,
      'The sail grows no larger. For an hour it hangs on the edge of the world, and then it slips over the horizon and is gone.',
    ], [leave('turn back to camp', 'The ship never saw you. It would take a far bigger fire, and a far higher one.', 'lore')]);
  }

  /** Things that happen around the camp, now and then, as the days go by. */
  const AT_CAMP = [
    {
      id: 'ship', limit: 3, weight: 1.5,
      when: () => S.day >= 3 && !S.built.pyre && !isNight(),
      run() {
        AU.sfx('sail');
        const choices = [{
          label: 'wave and shout',
          fn: () => shipPasses('You tear off your shirt and wave it over your head. You shout until your voice cracks. You run along the sand, waving, waving.'),
        }];
        if (S.fire > 0) {
          choices.push({
            label: 'heap green fronds on the fire',
            fn: () => shipPasses('You pile on green fronds until the fire chokes. A grey smoke rises, thin as a thread, and the wind tears it to nothing long before it is any height at all.'),
          });
        }
        beachCard('A Sail', [
          S.events.ship > 1
            ? 'Another sail. Your heart turns over all the same.'
            : 'You are at the water\'s edge when you see it, and do not believe it, and look again: a fleck of white on the horizon. A ship, under topsails, beating north.',
        ], choices, { ship: 1 });
      },
    },
    {
      id: 'wilson', limit: 1,
      when: () => S.day >= 2,
      run() {
        beachCard('Flotsam', [
          'A small cask has come ashore, its staves stamped <i>WILSON &amp; SONS, CHANDLERS, BRISTOL</i>. Inside is nothing but damp straw — and a leather ball, stitched like a cricket ball but big as a man\'s head.',
          'You cut your palm on the hoops getting it out.',
        ], [
          {
            label: 'give it a face',
            fn: () => {
              S.items.wilson = 1;
              beachCard('Wilson', [
                'Without quite meaning to, you press your bloody hand to the leather. Then, with one finger, you give the print two eyes, a nose, and a mouth.',
                'You name him after the cask. It is good to have someone to talk to.',
              ], [leave('take him back to camp', 'Wilson sits by the fire now. He is a good listener.', 'lore')], { ball: 1 });
            },
          },
          {
            label: 'break up the cask',
            fn: () => {
              beachCard('Flotsam', [
                'You knock the cask apart for its hoops and staves, and kick the ball into the surf. It bobs away on the ebb.',
                gainLine(`You take ${gain({ iron: 1, wood: 3 })}.`),
              ], [leave('return to camp')]);
            },
          },
        ], { ball: 1 });
      },
    },
    {
      id: 'parcel', limit: 1,
      when: () => S.day >= 4,
      run() {
        beachCard('A Parcel', [
          'Tangled in a mat of kelp: a parcel in oilcloth, tied with tarred twine and sealed with wax. The seal is pressed with a pair of wings. It is addressed in a careful hand:',
          quote('Mrs E. Morrow, Calle de la Aduana, Valparaíso.'),
          'Valparaíso. Where the <i>Meridian</i> was bound.',
        ], [
          {
            label: 'open it',
            fn: () => beachCard('A Parcel', [
              'Inside, wrapped in greased paper: a pair of Dutch skates. Skates, in the South Seas. Somebody\'s Christmas present, once.',
              gainLine(`The steel blades will serve: ${gain({ iron: 2 })}.`),
            ], [leave('return to camp')]),
          },
          {
            label: 'keep it sealed',
            fn: () => {
              S.items.parcel = 1;
              log('You set the parcel beside the Bible, its seal unbroken. If you ever leave this place, you will deliver it.', 'lore');
              closeModal();
            },
          },
        ]);
      },
    },
    {
      id: 'crusoe', limit: 1,
      when: () => S.day >= 3,
      run() {
        S.items.crusoe = 1;
        AU.sfx('page');
        beachCard('A Book', [
          'The lid of a sea-chest has washed in, and wedged inside it, swollen with salt, a book. You prise the pages apart and read the title:',
          quote('The Life and Strange Surprizing Adventures of Robinson Crusoe, of York, Mariner: Who lived Eight and Twenty Years, all alone in an un-inhabited Island…'),
          'You laugh until you have to sit down.',
        ], [leave('take it back to camp', 'You have something new to read by firelight.', 'lore')]);
      },
    },
    {
      id: 'parrot', limit: 1,
      when: () => S.day >= 3 && !S.flags.metHollis,
      run: () => log('A green parrot lands on a branch above the fire and fixes you with one eye. "Poor Tom!" it screeches. "Poor Tom! Where are you, Tom?" Then it is gone. Someone taught it that.', 'lore'),
    },
    {
      id: 'whale', limit: 1,
      when: () => !isNight(),
      run: () => log('Far out, a whale breaches, white as a ghost, and falls back in a burst of spray. You have heard whalermen in Bristol taverns tell of such a beast. You had not believed them.', 'lore'),
    },
    {
      id: 'ownBottle', limit: 1,
      when: () => S.flags.bottle,
      run: () => log("You scratch a message of your own on the back of Hale's letter, seal the bottle with pitch, and throw it as far as you can. The tide brings it back the next morning.", 'lore'),
    },
    {
      id: 'turtle', limit: 3,
      when: () => !isNight(),
      run: () => log(`A great turtle hauls herself up the beach to lay her eggs in the sand. You take a few: ${gain({ food: 2 })}.`),
    },
    {
      id: 'squall', limit: 4,
      run: () => log(`A squall blows through. You stand in it with your mouth open, laughing, and fill what you can: ${gain({ water: 2 })}.`),
    },
    {
      id: 'weather', weight: 2,
      run: () => log(pick(isNight()
        ? [
          'The wind gets up in the night and the palms thrash like breakers. By morning it has gone.',
          'Land crabs click and rustle at the edge of the firelight, all night long.',
          'No moon. The stars are so thick the sky looks dusted with salt.',
        ]
        : [
          'Thunderheads stack up over the hills and go nowhere.',
          'Flat calm. The sea lies like oil, and the heat presses down.',
          'Frigate birds hang over the reef without once moving their wings.',
          'The trade wind freshens, and the surf booms on the reef all day.',
        ])),
    },
    {
      id: 'gull', limit: 4,
      when: () => S.res.food > 3,
      run() {
        add('food', -1);
        log('A gull swoops on your stores and makes off with a strip of dried fish. You throw a stone after it, and miss.', 'warn');
      },
    },
    {
      id: 'coconut', limit: 2,
      when: () => !isNight(),
      run: () => log('A coconut drops from the palm and buries itself in the sand an arm\'s length from your head. You move your bed.'),
    },
    {
      id: 'dolphins', limit: 2,
      when: () => !isNight(),
      run: () => log('Dolphins in the bay, leaping and blowing. For a while you forget where you are.'),
    },
    {
      id: 'boot', limit: 1,
      run: () => log('The tide brings in a sea-boot, cracked and empty. You do not like to think whose it was.'),
    },
    {
      id: 'tremor', limit: 1,
      run: () => log('The ground shivers underfoot. Every bird in the jungle bursts into the air at once — and then all is still.', 'lore'),
    },
    {
      id: 'dream', limit: 2,
      when: () => isNight() && S.fire > 0,
      run: () => log('You doze by the fire and dream of Bristol: rain on slate roofs, the bakers in Broad Street, your mother at the door. You wake with wet cheeks.', 'lore'),
    },
    {
      id: 'seafire', limit: 2,
      when: isNight,
      run: () => log('Every breaking wave glows green tonight, as if lit from beneath. The old hands called it the sea-fire.'),
    },
    {
      id: 'star', limit: 2,
      when: isNight,
      run: () => log('A star falls into the sea to the west. You make a wish, and feel foolish, and make it again.'),
    },
    {
      id: 'wilsonTalk', weight: 0.5,
      when: () => S.items.wilson,
      run: () => log(pick([
        'You tell Wilson about your day. He takes it well.',
        'You and Wilson disagree about the weather. You win.',
        "Wilson's face has faded in the sun. You touch it up.",
        'You ask Wilson what he thinks of your chances. He keeps his own counsel.',
      ])),
    },
    {
      id: 'hollisTalk', weight: 0.5,
      when: () => S.flags.ally,
      run: () => log(pick([
        'Hollis sings under his breath while he works: a shanty, the words long gone.',
        'Hollis asks you what year it is. He does not speak again until nightfall.',
        'Hollis shows you how he snares birds. He laughs when you get it wrong.',
      ])),
    },
  ];

  /** Something happens around the camp, if anything can. */
  G.happening = () => happen(AT_CAMP);

  /** Things the tide brings in, found while combing the beach. Returns whether one turned up. */
  G.washedUp = () => happen(AT_CAMP.filter((e) => ['wilson', 'parcel', 'crusoe', 'boot', 'turtle'].includes(e.id)));

  /* ---------------- while exploring ---------------- */

  /** The end of a trip that found no new place: a card of `text`, and what was `got`, if anything. */
  function wanderCard(text, got, art) {
    const g = got ? gain(got) : '';
    modal({
      art: ART.scene(art || 'grove'),
      title: 'Exploring',
      text: [text].concat(g ? [gainLine(`You return with ${g}.`)] : []),
      choices: [leave('return to camp')],
    });
  }

  /** What may turn up on a trip that finds no new place. */
  const EXPLORING = [
    {
      id: 'nothing', weight: 2,
      run: () => wanderCard(pick([
        'You walk until your feet bleed: scrub, rock, and more scrub. Nothing worth putting on the map.',
        'You lose your way among the dunes and come back at dusk, no wiser.',
        'From a rise you see the whole western shore: empty beach, as far as the eye can follow it.',
      ])),
    },
    {
      id: 'forage', weight: 2,
      run: () => wanderCard(pick([
        'Nothing new, but a stand of wild bananas, small and sour.',
        'Nothing new, but sweet roots in a sandy hollow.',
      ]), { food: rand(1, 3) }),
    },
    {
      id: 'vines',
      run: () => wanderCard('Nothing new, but good long vines for cord.', { fibre: rand(2, 4) }),
    },
    {
      id: 'campfire', limit: 1,
      run: () => wanderCard('A ring of blackened stones, long cold, with a rusted tin cup among them. Someone camped here, years ago, and watched the sea as you do.'),
    },
    {
      id: 'goat', limit: 1,
      run: () => wanderCard("The skull of a goat, white as chalk. Sealers sometimes put goats ashore on islands like this, to stock a larder for the next ship to call. None are left now."),
    },
    {
      id: 'numbers', limit: 1,
      run: () => wanderCard('Carved deep into the trunk of a palm, in a hand you do not know: 4 8 15 16 23 42. The numbers mean nothing to you. You find you do not like them.'),
    },
    {
      id: 'cairn', limit: 1,
      run() {
        S.items.dollar = 1;
        wanderCard('A cross scratched on a flat rock, and under it a cairn. You dig like a dog. At the bottom, in a rotten box: a single Spanish dollar, and a scrap of paper. <i>Not here either. — B.G.</i>');
      },
    },
    {
      id: 'ankle',
      when: () => S.health > 3,
      run() {
        AU.sfx('hurt');
        damage(1, 'fall');
        wanderCard('You put your foot in a hole hidden by the grass and wrench your ankle. You limp home empty-handed.');
      },
    },
    {
      id: 'crab', weight: 0.5,
      when: G.armed,
      run: () => fight('crab', { onWin: () => wanderCard('Its meat is sweet as lobster.', { food: 3 }) }),
    },
  ];

  /** Something turns up on a trip that found no new place. */
  G.wander = () => happen(EXPLORING);
})();
