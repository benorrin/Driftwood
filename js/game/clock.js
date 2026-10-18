/* Driftwood — the clock.
 * Each second is a tick. Fires burn down, catchers fill, weirs trap fish,
 * and Hollis (once befriended) gathers wood; night falls and day breaks,
 * and every dawn the castaway must eat and drink. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, chance, pick, DAWNS, NIGHTFALLS, DAY_LEN, NIGHT_AT, FIRE_DECAY,
    add, log, heal, damage, setFire, save, session, modal, closeModal, rescueEnding,
  } = G;

  /** What runs short each dawn, and how its lack is felt. */
  const NEEDS = [
    ['water', 'Your tongue is thick with thirst.'],
    ['food', 'Hunger gnaws at you.'],
  ];

  /**
   * Daybreak: eat and drink (or suffer for the lack), heal a little, and,
   * with the pyre built, watch for a sail; the longer the wait, the likelier.
   */
  function dawn() {
    AU.sfx('bell');
    let hurt = 0;
    const lack = [];
    NEEDS.forEach(([k, msg]) => {
      if (S.res[k] > 0) {
        S.res[k]--;
      } else {
        hurt += 2;
        lack.push(msg);
      }
    });
    log(`Day ${S.day}. ${pick(DAWNS)}`);
    lack.forEach((m) => log(m, 'warn'));
    if (hurt) damage(hurt, 'thirst');
    else heal(S.built.leanto ? 2 : 1);
    if (S.ended) return;

    if (S.built.pyre && !S.flags.sailing) {
      S.n.pyreDays++;
      const modalOpen = document.querySelector('#modal:not(.hidden)');
      if (!modalOpen && chance(0.15 + S.n.pyreDays * 0.15)) sailSighted();
    }
  }

  /**
   * Nightfall: without a fire (or a lean-to) the cold bites, and once the
   * footprints have been found, whoever made them raids the stores unless
   * a big fire keeps them off.
   */
  function nightfall() {
    log(pick(NIGHTFALLS));
    if (S.fire === 0) {
      if (!S.built.leanto) {
        log('The cold finds you in the dark.', 'warn');
        damage(1, 'cold');
      } else {
        log('You huddle under the lean-to. The night is long without a fire.');
      }
    }
    if (S.ended) return;

    if (S.flags.footprints && !S.flags.hollisDone) {
      if (S.fire >= 3) {
        log('Beyond the firelight, two eyes catch the glow — and are gone.', 'lore');
      } else if (S.res.food > 0) {
        const n = Math.max(1, Math.ceil(S.res.food * 0.25));
        S.res.food -= n;
        log(`Something has been at your stores in the night. ${n} provisions gone.`, 'warn');
      }
    }
  }

  /** A ship on the horizon: light the pyre, or let her pass. */
  function sailSighted() {
    AU.sfx('sail');
    modal({
      art: ART.scene('summit', { ship: 1, pyre: 1 }),
      title: 'A Sail!',
      text: [
        S.flags.ally
          ? 'Hollis comes running down the headland, shouting, waving his arms like a madman.'
          : 'From the headland you see it, and do not believe it, and look again.',
        'A fleck of white on the northern horizon. A ship, beating south under topsails, five miles off and passing.',
      ],
      choices: [
        { label: 'light the pyre!', fn: rescueEnding },
        {
          label: 'let her pass',
          fn: () => {
            S.n.pyreDays = 0;
            log('The sail drops below the horizon. You chose this.', 'lore');
            closeModal();
          },
        },
      ],
    });
  }

  /** Counts `S.ticks[key]` up and runs `fn` (resetting the count) every `n` ticks. */
  function every(key, n, fn) {
    if (++S.ticks[key] >= n) {
      S.ticks[key] = 0;
      fn();
    }
  }

  /**
   * The fire burns down a level every FIRE_DECAY ticks. Hollis keeps a low
   * fire from dying: he holds it at "flickering", spending wood to do so.
   */
  function tendFire() {
    if (S.fire === 0 || ++S.fireT < FIRE_DECAY) return;
    if (S.flags.ally && S.fire <= 2) {
      S.fireT = 0;
      if (S.res.wood > 0 && S.fire < 2) {
        S.res.wood--;
        setFire(S.fire + 1, true);
      }
    } else {
      setFire(S.fire - 1);
    }
  }

  /** Advances the game by one tick (one second). */
  G.tick = function () {
    if (!session.running || S.ended) return;
    S.t++;
    tendFire();
    if (S.built.catcher) every('catcher', 30, () => add('water', S.built.catcher));
    if (S.built.trap) every('trap', 40, () => add('food', S.built.trap * (S.built.rack ? 2 : 1)));
    if (S.flags.ally) {
      every('ally', 30, () => {
        add('wood', 2);
        add('fibre', 1);
      });
    }
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
