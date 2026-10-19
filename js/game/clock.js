/* Driftwood — the clock.
 * Each second is a tick. Fires burn down, catchers fill, traps catch fish,
 * and Hollis (once befriended) gathers wood or fishes; now and then something
 * happens; night falls and day breaks, and every dawn the castaway must
 * eat and drink. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, chance, pick, DAWNS, NIGHTFALLS, DAY_LEN, NIGHT_AT, FIRE_DECAY, TRADE_WINDS_DAY,
    gainLine, add, log, heal, damage, setFire, save, session, modal, queueModal, notice, leave, modalOpen, closeModal, rescueEnding,
  } = G;

  /** How often, in ticks, something may happen around the camp, and the chance it does. */
  const EVENT_EVERY = 30;
  const EVENT_CHANCE = 0.3;

  /** The hour of the afternoon at which a storm may come in. */
  const STORM_AT = 45;

  /** What runs short each dawn, and how its lack is felt. */
  const NEEDS = [
    ['water', 'Your tongue is thick with thirst. There is no fresh water left.'],
    ['food', 'Hunger gnaws at you. There is nothing left to eat.'],
  ];

  /**
   * Fresh food keeps only so long in the heat: without a smoking rack, each
   * dawn one in every SPOIL_SHARE provisions above SPOIL_FROM goes bad.
   */
  const SPOIL_FROM = 6;
  const SPOIL_SHARE = 4;

  /** Some of the provisions rot, unless there is a smoking rack to keep them. */
  function spoil() {
    if (S.built.rack) return;
    const n = Math.floor((S.res.food - SPOIL_FROM) / SPOIL_SHARE);
    if (n <= 0) return;
    add('food', -n);
    log(`${n} of your provisions ${n === 1 ? 'has' : 'have'} spoiled in the heat. A smoking rack would keep them.`, 'warn');
  }

  /** The chance, each dawn of a fever, that it does the castaway harm. */
  const FEVER_HARM = 0.3;

  /**
   * Daybreak: eat and drink (or suffer for the lack), heal a little unless
   * fevered, mend ailments, lose food that has spoiled, and,
   * with the pyre built and the trade winds turned, watch for a sail; the
   * longer the wait, the likelier.
   */
  function dawn() {
    AU.sfx('bell');
    let hurt = 0;
    const lack = [];
    let short = '';
    const fevered = !!S.ail.fever;
    NEEDS.forEach(([k, msg]) => {
      // a fever doubles the thirst
      const need = k === 'water' && fevered ? 2 : 1;
      if (S.res[k] >= need) {
        S.res[k] -= need;
      } else {
        S.res[k] = 0;
        hurt += 2;
        lack.push(msg);
        short = k;
      }
    });
    log(`Day ${S.day}`, 'day');
    if (S.day % 7 === 5 && !S.events.friday) {
      // the first Friday by the notches on the palm
      S.events.friday = 1;
      log('By your notches it is a Friday. You find yourself watching the sand for footprints, as a boy in a book once did.', 'lore');
    } else {
      log(pick(DAWNS));
    }
    if (hurt) damage(hurt, 'thirst');
    else if (!fevered) heal(S.built.leanto && G.atHome() ? 2 : 1);
    if (S.ended) return;
    if (fevered && chance(FEVER_HARM)) {
      damage(1, 'fever');
      if (S.ended) return;
      notice('Fever', ['You burn all night and shiver all morning, and wake not knowing where you are.', gainLine('You lose 1 health. Rest, and drink, and wait for it to break.')],
        'The fever burned all night.', ART.scene('night'));
    }
    G.mend();
    spoil();
    if (hurt) {
      const title = lack.length > 1 ? 'Hunger and Thirst' : short === 'water' ? 'Thirst' : 'Hunger';
      notice(title, lack.concat(gainLine(`You lose ${hurt} health. Find food and water before another dawn.`)),
        lack.length > 1 ? 'You woke hungry and parched.' : lack[0], ART.scene('beach'));
    }

    if (S.day >= TRADE_WINDS_DAY && !S.flags.trades) {
      S.flags.trades = 1;
      const line = 'The wind has gone round into the south-east in the night, steady and warm. The trade winds have turned.';
      if (S.built.pyre || S.flags.summit) {
        queueModal({
          art: ART.scene('summit', { pyre: S.built.pyre }),
          title: 'The Trade Winds',
          text: [line, S.built.pyre
            ? 'Hale wrote that the whalers pass the north headland when the trade winds turn. From now on, any morning may bring a sail. When one comes, you will have your chance to light the pyre.'
            : 'Hale wrote that the whalers pass the north headland when the trade winds turn. A great fire on the summit might be seen by one of them now.'],
          choices: [leave('go on', line, 'lore')],
        });
      } else {
        log(line, 'lore');
      }
    }
    if (S.chapter >= 2) G.shiftWind();
    G.jemDawn();
    G.offerStay();
    if (S.built.pyre && S.flags.trades && !S.flags.sailing && G.atHome()) {
      S.n.pyreDays++;
      if (chance(0.1 + S.n.pyreDays * 0.06)) G.sailSighted();
    }
  }

  /**
   * Nightfall: without a fire (or a lean-to) the cold bites, and once the
   * footprints have been found, whoever made them raids the stores unless
   * a big fire keeps them off.
   */
  function nightfall() {
    log(pick(NIGHTFALLS));
    const text = [];
    const lines = [];
    if (S.fire === 0) {
      if (!S.built.leanto || !G.atHome()) {
        damage(1, 'cold');
        if (S.ended) return;
        text.push('There is no fire, and no shelter. The cold finds you in the dark, and you lie shaking until dawn.',
          gainLine(`You lose 1 health. Keep a fire burning at night${G.atHome() ? ', or build a lean-to' : ''}.`));
        lines.push('The cold found you in the dark.');
      } else {
        log('You huddle under the lean-to. The night is long without a fire.');
      }
    }

    if (S.flags.footprints && !S.flags.hollisDone && G.atHome()) {
      if (S.fire >= 3) {
        log('Beyond the firelight, two eyes catch the glow — and are gone.', 'lore');
      } else if (S.res.food > 0) {
        const n = Math.max(1, Math.ceil(S.res.food * 0.25));
        S.res.food -= n;
        text.push('You wake to a rustle in the dark, and by the time you are on your feet it has gone. Something has been at your stores.',
          gainLine(`${n} provisions gone. A big fire, burning all night, might keep it off.`));
        lines.push(`Something took ${n} provisions in the night.`);
      }
    }
    if (text.length) notice('In the Night', text, lines.join(' '), ART.scene('night'));
    G.jemTale();
  }

  /** The chance that a sail is the Meridian come back, until she has been seen once. */
  const MERIDIAN_CHANCE = 0.35;

  /** The chance that a whaler sails out of sight while the castaway studies her. */
  const LOST_WHILE_LOOKING = 0.3;

  /** What the Meridian looks like, close enough to know. */
  const KNOW_MERIDIAN = 'There is a square of new canvas in her fore-topsail, and you know it, because you sewed it yourself off the Horn. She is the <i>Meridian</i>. Mr Crane has brought her back north.';

  /** What a whaler looks like, close enough to know. */
  const KNOW_WHALER = 'She is deep-laden and slow, her boats hanging in davits along her side, and a smudge of greasy smoke hangs over her deck from the try-works. A whaler.';

  /** Lets the sail go by. Whoever she was, the wait begins again. */
  function letPass(meridian, known) {
    S.n.pyreDays = 0;
    if (meridian && known) G.achieve('meridian');
    log(meridian && known
      ? 'The <i>Meridian</i> sails on into the south, and takes Mr Crane with her. Good riddance.'
      : 'The sail drops below the horizon. You chose this.', 'lore');
    closeModal();
  }

  /**
   * The pyre is lit for the Meridian. She comes close, heaves to off the
   * reef, and Crane looks the island over through a glass; then she sails
   * on. Nobody lands: the castaway will not see her crew again until
   * Valparaíso. `known` is whether the castaway knew her before lighting
   * it. The pyre burns away either way, and must be built again.
   */
  function meridianPasses(known) {
    AU.sfx('fire');
    S.built.pyre = 0;
    S.n.pyreDays = 0;
    S.flags.meridianClose = 1;
    modal({
      art: ART.scene('summit', { ship: 1, pyre: 1, lit: 1 }),
      title: 'The Pyre',
      text: known
        ? ['You know what she is, and you light it all the same. It goes up with a roar you feel in your teeth: a pillar of smoke a mile high.', 'For an hour she holds her course. Then, slowly, she comes about.']
        : ['You run. Up the loose stones, up the narrow crack, lungs on fire, and put a burning stick to the pyre. It goes up with a roar you feel in your teeth: a pillar of smoke a mile high.',
          'For an hour the ship holds her course. Then, slowly, she comes about, and as she comes on you see the patch in her fore-topsail, which you sewed yourself off the Horn. She is the <i>Meridian</i>. Mr Crane has brought her back north.'],
      choices: [{
        label: 'watch her come',
        fn: () => modal({
          art: ART.scene('summit', { ship: 1 }),
          title: 'The Meridian',
          text: [
            'She comes in under topsails until you can count the men on her deck, and there are not enough of them. A mile off the reef she heaves to, and lies rolling in the swell with her sails slatting.',
            'On her quarterdeck a man has a glass to his eye, and it is turned on you. You know the set of his shoulders. Mr Crane.',
            'He looks for a long time. No boat is lowered. Nobody waves. Then he lowers the glass and says something to the man at the wheel, and the yards come round, and she fills, and stands away to the north.',
            S.flags.ally ? 'Of Captain Ashby there is no sign. Beside you, Hollis lets out a breath he has been holding a long while.' : 'Of Captain Ashby there is no sign.',
            gainLine('The pyre is ash, and must be built again.'),
          ],
          choices: [leave('go down to the camp', 'The Meridian came close enough to count her crew, and Crane watched you through a glass, and sailed on. Of Captain Ashby there was no sign.', 'lore')],
        }),
      }],
    });
  }

  /** Studies the sail before lighting the pyre. Knowing her takes time, and a whaler may not wait. */
  function studyShip(meridian) {
    if (!meridian && chance(LOST_WHILE_LOOKING)) {
      G.achieve('hullDown');
      modal({
        art: ART.scene('summit', { pyre: 1 }),
        title: 'Hull Down',
        text: [
          'You shade your eyes and watch her until they water. Boats in davits. Smoke off her deck. A whaler, surely, but by the time you are sure, she is hull down to the south and running.',
          gainLine('Light the pyre now, and nobody will see it.'),
        ],
        choices: [leave('let her go', 'You watched too long, and the whaler sailed out of sight.', 'lore')],
      });
      return;
    }
    modal({
      art: ART.scene('summit', { ship: 1, pyre: 1 }),
      title: meridian ? 'The Meridian' : 'A Whaler',
      text: ['You shade your eyes and watch her come on.', meridian ? KNOW_MERIDIAN : KNOW_WHALER],
      choices: [
        { label: meridian ? 'light the pyre anyway' : 'light the pyre!', fn: meridian ? () => meridianPasses(true) : rescueEnding },
        { label: 'let her pass', fn: () => letPass(meridian, true) },
      ],
    });
  }

  /**
   * A ship on the horizon: light the pyre, study her first, or let her pass.
   * Once, she may be the Meridian, come back with the mutineers aboard.
   * Hollis knows a whaler when he sees one, and says so.
   */
  G.sailSighted = function sailSighted() {
    AU.sfx('sail');
    const meridian = !S.flags.meridian && chance(MERIDIAN_CHANCE);
    if (meridian) S.flags.meridian = 1;
    const text = [
      S.flags.ally
        ? 'Hollis comes running down the headland, shouting, waving his arms like a madman.'
        : 'From the headland you see it, and do not believe it, and look again.',
      'A fleck of white on the northern horizon. A ship, beating south under topsails, five miles off and passing.',
    ];
    const choices = [{ label: 'light the pyre!', fn: meridian ? () => meridianPasses(S.flags.ally) : rescueEnding }];
    if (S.flags.ally) {
      text.push(meridian
        ? `Hollis squints at her a long while. "No whaler, that," he says. "No boats on her davits, and she's in a hurry." Then you know her yourself. ${KNOW_MERIDIAN}`
        : '"Whaler!" Hollis shouts. "See the smoke off her deck? That\'s her try-works. Light it, man, light it!"');
    } else {
      choices.push({ label: 'study her first', fn: () => studyShip(meridian) });
    }
    choices.push({ label: 'let her pass', fn: () => letPass(meridian, S.flags.ally) });
    queueModal({ art: ART.scene('summit', { ship: 1, pyre: 1 }), title: 'A Sail!', text, choices });
  };

  /** Counts `S.ticks[key]` up and runs `fn` (resetting the count) every `n` ticks. */
  function every(key, n, fn) {
    if (++S.ticks[key] >= n) {
      S.ticks[key] = 0;
      fn();
    }
  }

  /**
   * The fire burns down a level every FIRE_DECAY ticks. Hollis keeps a low
   * fire from dying: he holds it at "flickering", or at "burning" while he
   * keeps watch, spending wood to do so.
   */
  function tendFire() {
    if (S.fire === 0 || ++S.fireT < FIRE_DECAY) return;
    const hold = G.hollisJob() === 'watch' ? 3 : 2;
    if (G.withHollis() && S.fire <= hold) {
      S.fireT = 0;
      if (S.res.wood > 0 && S.fire < hold) {
        S.res.wood--;
        setFire(S.fire + 1, true);
      }
    } else {
      setFire(S.fire - 1);
    }
  }

  /**
   * Advances the game by one tick (one second). Time stands still while a
   * notice is open, so nothing happens behind it while it is being read.
   */
  G.tick = function () {
    if (!session.running || S.ended || modalOpen()) return;
    S.t++;
    tendFire();
    if (G.atHome()) {
      if (S.built.catcher) every('catcher', 30, () => add('water', S.built.catcher));
      if (S.built.trap) every('trap', 40, () => add('food', S.built.trap * (S.built.rack ? 2 : 1)));
    }
    if (G.withJem()) every('jem', 40, G.jemWorks);
    if (G.withHollis()) {
      every('ally', 30, () => {
        const job = G.hollisJob();
        if (job === 'gather') {
          add('wood', 2);
          add('fibre', 1);
        } else if (job === 'fish') {
          add('food', 1);
        }
      });
    }
    if (S.day > 1) every('event', EVENT_EVERY, () => chance(EVENT_CHANCE) && G.happening());
    if (S.t === STORM_AT && G.atHome()) G.stormCheck();
    if (S.t === NIGHT_AT) nightfall();
    if (S.t >= DAY_LEN) {
      S.t = 0;
      S.day++;
      dawn();
    }
    if (S.t % 5 === 0) save();
    G.render();
  };

})();
