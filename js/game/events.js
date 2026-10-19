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
    S, rand, chance, pick, cap, quote, gainLine, RES,
    add, gain, log, damage, setFire, maxHealth, isNight, modal, queueModal, notice, leave, closeModal, fight,
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

  /* ---------------- the storm ---------------- */

  /**
   * Storms: the first day one can come, the least number of days between
   * them, the chance of one on any afternoon that may have one, and the day
   * by which the first is sure to have come.
   */
  const FIRST_STORM = 3;
  const STORM_GAP = 4;
  const STORM_CHANCE = 0.3;
  const SURE_STORM = 5;

  /** Stores the sea and the wind can take; water, iron and powder are kept safe. */
  const STORM_STORES = ['food', 'wood', 'fibre', 'rope', 'stone', 'timber', 'cloth', 'hide', 'gum', 'torch'];

  /**
   * The storm has passed. `held` says whether the castaway stayed to hold
   * the camp (losing less) or retreated inland. Each store loses a random
   * share, the camp's works may be wrecked, and the catchers fill.
   */
  function afterStorm(held) {
    const share = held ? [0.1, 0.25] : [0.2, 0.5];
    const lost = [];
    STORM_STORES.forEach((k) => {
      const n = Math.floor((S.res[k] || 0) * (share[0] + Math.random() * (share[1] - share[0])));
      if (n > 0) {
        add(k, -n);
        lost.push(`${n} ${RES[k]}`);
      }
    });
    const odds = held ? 0.2 : 0.5;
    if (S.built.leanto && chance(odds)) {
      S.built.leanto = 0;
      S.health = Math.min(S.health, maxHealth());
      lost.push('the lean-to');
    }
    if (S.built.catcher && chance(odds)) {
      S.built.catcher--;
      lost.push('a rain catcher');
    }
    if (S.built.trap) {
      const n = rand(0, held ? 1 : S.built.trap);
      S.built.trap -= n;
      if (n) lost.push(n > 1 ? `${n} fish traps` : 'a fish trap');
    }
    if (S.built.rack && chance(odds * 0.6)) {
      S.built.rack = 0;
      lost.push('the smoking rack');
    }
    setFire(held ? S.fire - 2 : 0, true);
    const caught = S.built.catcher ? gain({ water: S.built.catcher * 3 }) : '';
    const text = [held
      ? 'You spend the night flat behind a dune with your arms around what you can hold, and the sea comes up the beach to meet you. At dawn the wind drops all at once.'
      : 'You spend the night in the lee of the hills, soaked and shaking, listening to the island being torn apart. At dawn the wind drops all at once, and you go down to see what is left.'];
    text.push(gainLine(lost.length ? `The storm has taken ${lost.join(', ')}.` : 'By some miracle, the storm has taken nothing.'));
    if (caught) text.push(gainLine(`The rain catchers are brimming: ${caught}.`));
    if (Object.keys(S.raft).length) text.push('The raft, lashed down above the tide line, has come through.');
    modal({
      art: ART.scene('beach'),
      title: 'After the Storm',
      text,
      choices: [leave('begin again', 'The storm has passed. You set about putting the camp to rights.', 'lore')],
    });
  }

  /** A storm comes in from the west: retreat inland, or stay and hold the camp at some cost. */
  function storm() {
    S.n.lastStorm = S.day;
    S.n.storms = (S.n.storms || 0) + 1;
    AU.sfx('hurt');
    queueModal({
      art: ART.scene('tempest'),
      title: 'A Storm',
      text: [
        'By noon the western sky has gone the colour of a bruise, and the birds have all gone inland. Then the wind comes, and the rain behind it like a wall, and the sea gets up and starts to climb the beach.',
        S.flags.ally ? 'Hollis is already running for the hills. "Leave it!" he shouts. "Leave it all!"' : 'The camp will not stand this. Neither, perhaps, will you.',
      ],
      choices: [
        { label: 'retreat inland', fn: () => afterStorm(false) },
        {
          label: 'stay and hold the camp',
          fn: () => {
            AU.sfx('hurt');
            damage(rand(2, 3), 'storm');
            if (!S.ended) afterStorm(true);
          },
        },
      ],
    });
  }

  /** Each afternoon, a storm may come in: never too early or too soon after the last, and the first by day SURE_STORM. */
  G.stormCheck = function () {
    if (S.day < FIRST_STORM || (S.n.lastStorm && S.day - S.n.lastStorm < STORM_GAP)) return;
    if (chance(STORM_CHANCE) || (!S.n.lastStorm && S.day >= SURE_STORM)) storm();
  };

  /* ---------------- the light in the sea ---------------- */

  /** Wading out to the light: a sunken longboat of the Calliope, and Hale's locket. */
  function wadeToLight() {
    S.items.locket = 1;
    if (S.health > 2) damage(1, 'fall');
    modal({
      art: ART.scene('glow'),
      title: 'The Light in the Sea',
      text: [
        'You go out along the reef at the bottom of the tide, the water to your chest, and the light grows up around you: thousands of tiny glowing creatures, drifting in a slow ring over something dark on the sand.',
        'A boat. A ship\'s longboat, stove in and half buried, the name on her transom still just readable: <i>CALLIOPE</i>. Torn from the wreck when she struck, and never found.',
        'Under a thwart, wrapped in oilcloth, your fingers close on something small and hard: a gold locket. Inside is a painted face, a woman\'s, and a curl of brown hair. On the back: <i>J.H. from M.H., 1819.</i>',
        gainLine('Something stings your legs all the way back to the beach.'),
      ],
      choices: [leave('return to camp', "You have Captain Hale's locket. Someone, somewhere, gave it to him.", 'lore')],
    });
  }

  /* ---------------- the carved figure ---------------- */

  /** The carved figure brings ill luck to whoever keeps it. */
  function curse() {
    /** A misfortune, told on a card of its own. */
    const ill = (text, cost) => notice('Ill Luck', [text, gainLine(cost)], 'Ill luck dogs you while you keep the carved figure.', ART.scene('beach'));
    const ills = [() => log('You turned the little figure to face the wall last night. This morning it is facing you.', 'lore')];
    if (S.fire > 0) ills.push(() => {
      setFire(S.fire - 1, true);
      ill('A gust from nowhere, on a still day, flattens the fire.', 'The fire burns down.');
    });
    if (S.res.food > 0) ills.push(() => {
      add('food', -1);
      ill('The fish you put by yesterday is crawling with maggots.', 'You lose 1 provisions.');
    });
    if (S.health > 3) ills.push(() => {
      damage(1, 'fever');
      ill('You dream of drowning, and wake on the tide line with no memory of walking there, your hands torn and bleeding.', 'You lose 1 health.');
    });
    pick(ills)();
  }

  /** Throwing the figure into the sea: it will not stay there. */
  function throwFigure() {
    delete S.items.idol;
    S.flags.idolThrown = 1;
    log('You throw the little figure as far out as you can. It does not sink. It floats, face up, watching you, until the dark takes it.', 'lore');
    closeModal();
  }

  /* ---------------- the last castaway ---------------- */

  /** How the last castaway lies, by what killed them; a creature leaves its marks. */
  const LAID = {
    thirst: 'curled in the thin shade of a rock, as if they had crawled there out of the sun',
    cold: 'lying on their side beside a ring of long-cold ashes, knees drawn up to the chest',
    fall: 'at the foot of a little cliff, one leg folded under in a way no leg should go',
    fever: 'under a rough shelter of fronds, arms folded, as if they knew and had made ready',
    storm: 'half buried in a drift of weed and sand, flung far above the tide line by some great sea',
  };

  /** The bones of the last castaway, found while exploring: take what they had, or bury them with it. */
  function strangerBones(last) {
    const laid = LAID[last.cause] || `scattered across a clearing. There are marks on the bones. ${cap(last.cause)}, you think, or something like it`;
    const text = [
      `In a hollow of the scrub, a man's bones, ${laid}.`,
      `Beside them, notches cut in the rock: ${last.day} of them. A seaman's jacket, Bristol-made, its buttons stamped with an anchor. The boots, you notice, are your size.`,
    ];
    if (last.bristow) text.push('Propped against the rock sits a leather ball, the charcoal face on it rubbed almost away.');
    const things = Object.keys(last.keep).length || (last.bristow && !S.items.bristow);
    const choices = [];
    if (things) {
      choices.push({
        label: 'take what they had',
        fn: () => {
          const got = gain(last.keep);
          const lines = got ? [gainLine(`You take ${got}.`)] : [];
          if (last.bristow && !S.items.bristow) {
            S.items.bristow = 1;
            S.events.bristow = 1;
            lines.push('And the ball. You cannot leave him here alone. You will call him Bristow, though you could not say why.');
          }
          modal({
            art: ART.scene('grove'),
            title: 'Exploring',
            text: ['They have no more need of it, and you do.'].concat(lines),
            choices: [leave('return to camp', 'You found a castaway\'s bones in the scrub, and took what they had.', 'lore')],
          });
        },
      });
    }
    choices.push({
      label: things ? 'bury them, and their things with them' : 'bury them',
      fn: () => {
        S.flags.buriedStranger = 1;
        G.heal(2);
        modal({
          art: ART.scene('grave'),
          title: 'A Stranger',
          text: [
            'You scrape a grave in the sand with your hands and a flat stone, and lay them in it with everything that was theirs, and mark it with a driftwood cross. You do not know the words, so you say the ones from the back of the Bible.',
            gainLine('You walk home lighter than you came, and rest well that night.'),
          ],
          choices: [leave('return to camp', 'You buried a stranger in the scrub. Whoever they were, they were here before you.', 'lore')],
        });
      },
    });
    modal({ art: ART.scene('grove'), title: 'Bones', text, choices });
  }

  /** What the sea has left of the last castaway's raft, washed up on the beach. */
  function strangerRaft(last) {
    const salvage = { timber: rand(3, 5), rope: 2 };
    for (const k in last.keep) salvage[k] = (salvage[k] || 0) + last.keep[k];
    const got = gain(salvage);
    const text = [
      'Wreckage on the tide line: logs lashed together with rope, a broken mast, a rag of sail. A raft, or what the sea has left of one.',
      'Somebody else tried to sail from here. The lashings are knotted the way you knot them.',
    ];
    const ball = last.bristow && !S.items.bristow;
    if (ball) {
      S.items.bristow = 1;
      S.events.bristow = 1;
      text.push('Wedged between two logs is a leather ball with a face drawn on it in charcoal, grinning at you as if he has been waiting. You call him Bristow, though you could not say why.');
    }
    text.push(gainLine(`You salvage ${got}.`));
    beachCard('Wreckage', text, [leave('return to camp', 'The wreck of somebody else\'s raft came ashore. They did not get far.', 'lore')], { ball });
  }

  /** Whether Hollis is keeping watch over the camp, so nothing dares raid it. */
  const watched = () => G.hollisJob() === 'watch';

  /** Things that happen around the camp, now and then, as the days go by. */
  const AT_CAMP = [
    {
      id: 'glow', limit: 1,
      when: () => isNight() && S.day >= 3,
      run() {
        S.flags.glow = 1;
        log('Far out beyond the reef a patch of the sea is glowing: a soft green light, steady as a lamp, nothing like the sea-fire in the surf. In the morning there is nothing there.', 'lore');
      },
    },
    {
      id: 'glowAgain', limit: 3, weight: 1.5,
      when: () => isNight() && S.flags.glow && !S.items.locket,
      run() {
        modal({
          art: ART.scene('glow'),
          title: 'The Light in the Sea',
          text: ['It is there again tonight, in the same place beyond the reef: a green glow, as steady as a lamp left burning in a window. The tide is low. You could wade out to it, along the reef.'],
          choices: [
            { label: 'wade out to the light', fn: wadeToLight },
            leave('leave it be', 'You watch the light until it fades. Some things are better left alone.', 'lore'),
          ],
        });
      },
    },
    {
      id: 'curse', weight: 2.5,
      when: () => S.items.idol,
      run: curse,
    },
    {
      id: 'idolSea', limit: 1,
      when: () => S.items.idol,
      run() {
        modal({
          art: ART.scene('beach'),
          title: 'The Carved Figure',
          text: ['You are sure of it now. Since you took the little figure from its cleft in the rock, nothing has gone right. It sits by the fire with its shell eyes, and watches.'],
          choices: [
            { label: 'throw it into the sea', fn: throwFigure },
            leave('keep it', 'You wrap the figure in a rag. It does not help.'),
          ],
        });
      },
    },
    {
      id: 'idolBack', weight: 8,
      when: () => S.flags.idolThrown,
      run() {
        S.flags.idolThrown = 0;
        S.items.idol = 1;
        log('In the morning the little figure is lying beside the fire, bone dry, facing you. Perhaps it does not want the sea. Perhaps it wants to go home.', 'lore');
      },
    },
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
      id: 'bristow', limit: 1,
      when: () => S.day >= 2,
      run() {
        beachCard('Flotsam', [
          'A small cask has come ashore, its staves stamped <i>BRISTOW &amp; SONS, CHANDLERS, BRISTOL</i>. Inside is nothing but damp straw — and a leather ball, stitched like a cricket ball but big as a man\'s head.',
                  ], [
          {
            label: 'give it a face',
            fn: () => {
              S.items.bristow = 1;
              beachCard('Bristow', [
                'Without quite meaning to, you take a stick of charcoal from the fire and give the ball two eyes, a nose, and a crooked smile.',
                'You name him after the cask. It is good to have someone to talk to.',
              ], [leave('take him back to camp', 'Bristow sits by the fire now. He is a good listener.', 'lore')], { ball: 1 });
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
      id: 'lastRaft', limit: 1, weight: 3,
      when: () => S.day >= 2 && G.remains() && G.remains().sea,
      run() {
        const last = G.remains();
        G.clearRemains();
        strangerRaft(last);
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
            fn: () => {
              G.achieve('skates');
              beachCard('A Parcel', [
                'Inside, wrapped in greased paper: a pair of Dutch skates. Skates, in the South Seas. Somebody\'s Christmas present, once.',
                gainLine(`The steel blades will serve: ${gain({ iron: 2 })}.`),
              ], [leave('return to camp')]);
            },
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
      when: () => S.flags.wreckCabin && !S.flags.metHollis,
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
      id: 'gullRaid', limit: 6, weight: 2.5,
      when: () => G.armed() && !watched() && S.res.food > 2 && !isNight(),
      run: () => fight('gulls', {
        onWin: () => {
          log('You stand over your stores, bleeding from a dozen pecks, and the gulls keep their distance.');
          closeModal();
        },
        onFlee: () => {
          add('food', -2);
          notice('The Gulls', ['You run for cover with your arms over your head. When you creep back, the gulls have had their fill.', gainLine('You lose 2 provisions.')],
            'The gulls had two of your provisions.', ART.foe('gulls'));
        },
      }),
    },
    {
      id: 'boarRaid', limit: 3, weight: 0.6,
      when: () => G.armed() && !watched() && isNight() && S.visits.jungle,
      run: () => fight('boar', {
        ambush: true,
        intro: 'A crash in the dark. A boar has come down out of the hills, and is rooting through your stores.',
        onWin: () => {
          log(`You drag the boar to the fire and butcher it by its light: ${gain({ food: 4, hide: 1 })}.`);
          closeModal();
        },
        onFlee: () => {
          add('food', -3);
          notice('The Boar', ['You scramble up a palm and cling there in the dark while the boar roots through your stores. At last it goes back to the hills.', gainLine('You lose 3 provisions.')],
            'A boar ate three of your provisions.', ART.scene('night'));
        },
      }),
    },
    {
      id: 'crabRaid', limit: 4, weight: 1,
      when: () => G.armed() && !watched() && isNight(),
      run: () => fight('crab', {
        ambush: true,
        intro: 'Something clicks and scrapes in the dark beside your stores: a land crab, big as a dinner plate, after your food.',
        onWin: () => {
          log(`Crab, roasted on the coals: ${gain({ food: 2 })}.`);
          closeModal();
        },
        onFlee: () => {
          add('food', -1);
          notice('The Crab', ['You back off into the dark, and the crab drags its prize away into the dunes.', gainLine('You lose 1 provisions.')],
            'A crab made off with a provision.', ART.scene('night'));
        },
      }),
    },
    {
      id: 'gull', limit: 4, weight: 2,
      when: () => !G.armed() && S.res.food > 3,
      run() {
        add('food', -1);
        notice('A Thief', ['A gull swoops on your stores and makes off with a strip of dried fish. You throw a stone after it, and miss.', gainLine('You lose 1 provisions.')],
          'A gull stole a provision.', ART.scene('beach'));
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
      id: 'bean', limit: 1,
      when: () => S.day >= 6 && !isNight(),
      run() {
        S.items.bean = 1;
        log('Mending a tear in your jacket, you find something hard caught in the lining of the pocket: a single dried black bean. You do not remember putting it there. You turn it over in your fingers for a long time, and then you put it back.', 'lore');
      },
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
      id: 'groan', limit: 2,
      when: () => isNight() && S.flags.wreckCabin && !S.visits.blowhole,
      run: () => log('From somewhere along the shore comes a long, low groan, like something breathing. Then silence. You do not sleep for a long time.', 'lore'),
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
      id: 'bristowTalk', weight: 0.5,
      when: () => S.items.bristow,
      run: () => log(pick([
        'You tell Bristow about your day. He takes it well.',
        'You and Bristow disagree about the weather. You win.',
        "Bristow's face has faded in the sun. You touch it up.",
        'You ask Bristow what he thinks of your chances. He keeps his own counsel.',
      ])),
    },
    {
      id: 'jemTalk', weight: 0.5,
      when: () => G.withJem(),
      run: () => log(pick(G.withHollis()
        ? ['Jem and Hollis eat on opposite sides of the fire, and watch each other over it.', 'Hollis shows Jem how to snare a bird. Jem does not say thank you, but he watches.', 'You hear Jem ask Hollis how long he has been here. Hollis tells him. Jem does not ask anything else that day.']
        : ['Jem keeps looking at the sea, as if he expects to see a sail he does not want to see.', 'Jem whistles while he works, and stops himself, and looks round.', 'Jem asks you whether you believe in Jonahs. You do not answer, and he does not ask again.'])),
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

  /** Something happens around the camp (or wherever the castaway is cast away), if anything can. */
  G.happening = () => (G.atHome() ? happen(AT_CAMP) : G.awayHappening());

  G.happen = happen;

  /** Things the tide brings in, found while combing the beach. Returns whether one turned up. */
  G.washedUp = () => happen(AT_CAMP.filter((e) => ['bristow', 'lastRaft', 'parcel', 'crusoe', 'boot', 'turtle'].includes(e.id)));

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
      id: 'nothing',
      run: () => wanderCard(pick([
        'You walk until your feet bleed: scrub, rock, and more scrub. Nothing worth putting on the map.',
        'You lose your way among the dunes and come back at dusk, no wiser.',
        'From a rise you see the whole western shore: empty beach, as far as the eye can follow it.',
      ])),
    },
    {
      id: 'forage', weight: 1.5,
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
        G.afflict('ankle');
        wanderCard('You put your foot in a hole hidden by the grass and wrench your ankle. You limp home empty-handed, and it will be a day or two before it bears your weight.');
      },
    },
    {
      id: 'idol', limit: 1,
      when: () => S.visits.platform,
      run() {
        modal({
          art: ART.scene('platform'),
          title: 'Exploring',
          text: ['In a cleft of the rock near the old platform, wrapped in rotted bark cloth, is a small carved figure of some dark wood, arms folded across its belly, its eyes inlaid with shell. It is beautiful. It is looking at you.'],
          choices: [
            {
              label: 'take it',
              fn: () => {
                S.items.idol = 1;
                log('You take the little figure home. It is heavier than it looks.', 'lore');
                closeModal();
              },
            },
            leave('leave it where it is', 'You leave the figure in its cleft, and feel its eyes on your back all the way home.'),
          ],
        });
      },
    },
    {
      id: 'crab', weight: 0.5,
      when: G.armed,
      run: () => fight('crab', { onWin: () => wanderCard('Its meat is sweet as lobster.', { food: 3 }) }),
    },
    {
      id: 'seep',
      run: () => wanderCard('Nothing new, but a seep of fresh water in a fold of the rock. You drink, and fill what you carry.', { water: rand(2, 3) }),
    },
    {
      id: 'flint',
      run: () => wanderCard('Nothing new, but a seam of good flint in a dry stream bed.', { stone: rand(2, 4) }),
    },
    {
      id: 'deadfall',
      run: () => wanderCard('A tree felled by some old storm, dry and light. You break off what you can carry.', S.items.axe ? { wood: 3, timber: 2 } : { wood: rand(3, 4) }),
    },
    {
      id: 'nest',
      run: () => wanderCard('A ground nest of some great seabird, unguarded, the eggs still warm.', { food: 2 }),
    },
    {
      id: 'overhang', weight: 0.7,
      when: () => S.health < G.maxHealth(),
      run() {
        G.heal(2);
        wanderCard('You shelter from the noon heat under an overhang of rock, and sleep an hour in the cool. You wake the better for it.');
      },
    },
    {
      id: 'rope', limit: 1,
      when: () => S.mapped.wreck,
      run: () => wanderCard("In a gully above the eastern shore, tangled in the roots of a tree: a coil of tarred rope from the <i>Calliope</i>, carried there by some great storm.", { rope: 3 }),
    },
    {
      id: 'carcass', limit: 2,
      when: () => S.visits.jungle,
      run: () => wanderCard('At the foot of a crag lies a boar that has fallen in the night. It is fresh. You take what you can carry.', { food: 2, hide: 1 }),
    },
    {
      id: 'initials', limit: 1,
      when: () => S.flags.wreckCabin && !S.flags.metHollis,
      run: () => wanderCard('Carved into a palm, the bark grown thick around it: <i>T.H. 1826</i>. Lower down, newer: <i>T.H.</i>, and a row of notches that goes round the trunk and does not stop.'),
    },
    {
      id: 'cairnGrave', limit: 1,
      run: () => wanderCard('A low mound of piled stones: no name, no cross. Older than the sealers, older than Hale. Whoever lies here, someone loved them enough to carry all these stones.'),
    },
    {
      id: 'beacon', limit: 1,
      when: () => S.mapped.wreck,
      run: () => wanderCard('On a rise above the sea, a ring of stones and a heap of old ash, grown over. Somebody kept a signal fire here, once, and in the end gave up.'),
    },
    {
      id: 'lost', weight: 0.7,
      when: () => S.health > 2,
      run() {
        add('water', -1);
        add('food', -1);
        damage(1, 'cold');
        if (!S.flags.ally) G.setFire(S.fire - 2, true);
        wanderCard(`The scrub all looks the same, and then the sun goes behind cloud. By the time you have your bearings it is too late to go back. You spend the night in the open, cold and bitten and hungry, and come home at dawn${S.flags.ally ? ' to find Hollis has kept the fire' : ' to a fire burned low'}.`);
      },
    },
    {
      id: 'soaked', weight: 0.6,
      when: () => S.res.food > 2,
      run() {
        add('food', -2);
        wanderCard('A squall catches you on open ground. By the time it passes, the provisions in your pack are a sodden, ruined mess. You throw two away.');
      },
    },
    {
      id: 'spilled', weight: 0.5,
      when: () => S.res.water > 2,
      run() {
        add('water', -2);
        wanderCard('You slip on a wet rock and fall hard, and your water goes into the sand before you can save it.');
      },
    },
    {
      id: 'thorns', weight: 0.6,
      when: () => S.health > 3,
      run() {
        AU.sfx('hurt');
        damage(1, 'fall');
        wanderCard('You force a way through a brake of thorn and come out bleeding from a dozen cuts, with nothing to show for it.');
      },
    },
    {
      id: 'wasps', weight: 0.5,
      when: () => S.health > 3,
      run() {
        AU.sfx('hurt');
        damage(1, 'fall');
        wanderCard("You put your hand on a wasps' nest under a ledge. You run, and they follow, and you do not stop until you reach the sea.");
      },
    },
    {
      id: 'fever', limit: 2, weight: 0.4,
      when: () => S.health > 4,
      run() {
        damage(2, 'fever');
        G.afflict('fever');
        wanderCard('Something in the low, wet ground disagrees with you. By evening you are shaking with fever, and you crawl home the last mile. Rest, and drink, and wait for it to break.');
      },
    },
    {
      id: 'boar', weight: 0.5,
      when: () => G.armed() && S.visits.jungle,
      run: () => fight('boar', {
        ambush: true,
        intro: 'You blunder into a thicket and something in it explodes toward you, all tusks and bristles.',
        onWin: () => wanderCard('You butcher it where it fell.', { food: 4, hide: 1 }),
      }),
    },
    {
      id: 'bones', limit: 1, weight: 3,
      when: () => S.day >= 3 && G.remains() && !G.remains().sea,
      run() {
        const last = G.remains();
        G.clearRemains();
        strangerBones(last);
      },
    },
    {
      id: 'viper', weight: 0.4,
      when: () => G.armed() && S.flags.spring,
      run: () => fight('viper', {
        ambush: true,
        intro: 'You step over a log, and the log hisses.',
        onWin: () => wanderCard('You go the rest of the way with your eyes on the ground.'),
      }),
    },
  ];

  /** Something turns up on a trip that found no new place. */
  G.wander = () => happen(EXPLORING);
})();
