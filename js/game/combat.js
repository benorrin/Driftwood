/* Driftwood — combat.
 * Fights are real time: the foe attacks on its own clock while the
 * castaway strikes, eats or flees, each move with its own cooldown. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, $, el, chance, pick, cap, replayAnimation,
    RES, FOES, log, heal, damage, maxHealth, modal, closeModal, startCooldown,
  } = G;

  /** Delay before the foe's first attack, beyond its usual interval, in ms. */
  const FIRST_ATTACK_GRACE = 800;

  /**
   * The castaway's attacks. Only the best bare-handed option shows: fists
   * appear only with no blade. The pistol uses powder & shot.
   */
  const WEAPONS = [
    { id: 'fists', label: 'strike', dmg: 1, cd: 1, has: () => !S.items.knife && !S.items.spear && !S.items.cutlass, snd: 'hit' },
    { id: 'knife', label: 'stab', dmg: 2, cd: 1.2, has: () => S.items.knife, snd: 'hit' },
    { id: 'spear', label: 'thrust the spear', dmg: 3, cd: 1.6, has: () => S.items.spear, snd: 'swing' },
    { id: 'cutlass', label: 'swing the cutlass', dmg: 4, cd: 1.5, has: () => S.items.cutlass, snd: 'swing' },
    { id: 'pistol', label: 'fire the pistol', dmg: 8, cd: 4, has: () => S.items.pistol, ammo: 'shot', snd: 'shot' },
  ];

  /** The markup of the fight panel: two health bars, the moves, and a line of narration. */
  const COMBAT_HTML = (foeName) =>
    '<div class="bars">' +
    '<div><span>you</span><div class="meter"><i class="you"></i></div></div>' +
    `<div><span>${foeName}</span><div class="meter"><i class="foe"></i></div></div>` +
    '</div><div class="moves"></div><div class="ctext"></div>';

  /**
   * Fights the foe `key` from FOES. Options:
   *   intro    — text to open with, instead of the foe's own
   *   onWin    — called when the castaway clicks "continue" after winning
   *   onFlee   — called after a successful escape
   *   canFlee  — false to offer no escape
   *   ally     — Hollis fights alongside, adding 1 to every hit
   */
  G.fight = function (key, opts) {
    opts = opts || {};
    const E = Object.assign({}, FOES[key]);
    const maxHp = E.hp;
    const allyBonus = opts.ally ? 1 : 0;
    let over = false;

    AU.setMood('tense');
    if (E.sound) AU.sfx(E.sound);
    modal({ art: ART.foe(E.art), title: cap(E.name), text: [opts.intro || E.intro], choices: [] });

    const box = el('div', 'combat', COMBAT_HTML(E.name));
    $('#modal-choices').appendChild(box);
    const moves = box.querySelector('.moves');
    const card = $('.modal-card');

    /** Sets the narration line. */
    const say = (t) => {
      box.querySelector('.ctext').textContent = t;
    };

    /** Redraws both health bars and re-checks which moves are available. */
    function update() {
      box.querySelector('.you').style.width = `${Math.max(0, (S.health / maxHealth()) * 100)}%`;
      box.querySelector('.foe').style.width = `${Math.max(0, (E.hp / maxHp) * 100)}%`;
      moves.querySelectorAll('button').forEach((b) => {
        if (b._upd) b._upd();
      });
    }

    /** Ends the fight, stopping the foe's attacks. */
    function stop() {
      over = true;
      clearInterval(loop);
    }

    /** The foe attacks: it may hit (shaking the card) or miss. */
    function enemyAttack() {
      if (over || S.ended) return;
      if (chance(E.hit)) {
        AU.sfx('hurt');
        replayAnimation(card, 'hurt');
        say(`${cap(E.name)} ${pick(E.verbs)}.`);
        damage(E.dmg, E.name);
      } else {
        say(`${cap(E.name)} misses.`);
      }
      if (!S.ended) update();
    }

    // the foe attacks on its own clock, a little irregularly
    let next = performance.now() + E.speed * 1000 + FIRST_ATTACK_GRACE;
    const loop = setInterval(() => {
      if (over || S.ended || !document.body.contains(box)) {
        clearInterval(loop);
        return;
      }
      if (performance.now() >= next) {
        next += E.speed * 1000 * (0.85 + Math.random() * 0.3);
        enemyAttack();
      }
    }, 100);

    /**
     * Adds a move button: `label` with an optional `sub` line, usable when
     * `can()` is true, running `act` and then cooling down for `cd` seconds.
     */
    function moveButton(label, sub, cd, can, act) {
      const b = el('button', 'btn', `<span>${label}</span>${sub ? `<span class="cost">${sub}</span>` : ''}<span class="cd"></span>`);
      let until = 0;
      b._upd = () => {
        b.disabled = over || performance.now() < until || !can();
      };
      b.onclick = () => {
        if (b.disabled) return;
        act();
        if (over) return;
        until = performance.now() + cd * 1000;
        startCooldown(b, cd);
        b._upd();
        setTimeout(() => {
          if (b._upd) b._upd();
        }, cd * 1000 + 20);
        update();
      };
      moves.appendChild(b);
    }

    /** Strikes with weapon `w`: firearms hit more often, and spend a shot. */
    function attack(w) {
      AU.sfx(w.snd);
      if (w.ammo) {
        S.res[w.ammo]--;
        moves.querySelectorAll('.cost').forEach((c) => {
          if (c.textContent.includes(RES.shot)) c.textContent = `${S.res.shot} ${RES.shot}`;
        });
      }
      if (!chance(w.ammo ? 0.9 : 0.8)) {
        say('You miss.');
        return;
      }
      const d = w.dmg + allyBonus;
      E.hp -= d;
      replayAnimation($('#modal-art'), 'hit');
      say(opts.ally ? `You and Hollis strike together. (${d})` : `You hit ${E.name}. (${d})`);
      if (E.hp <= 0) win();
    }

    /** Tries to run: it works more often than not, and otherwise gives the foe a free attack. */
    function flee() {
      if (chance(0.6)) {
        stop();
        AU.setMood('calm');
        log(`You run from ${E.name}, and do not stop until your lungs give out.`);
        closeModal();
        if (opts.onFlee) opts.onFlee();
      } else {
        say('You stumble as you turn!');
        enemyAttack();
      }
    }

    /** The foe is dead: replaces the moves with a single "continue". */
    function win() {
      stop();
      AU.sfx('victory');
      AU.setMood('calm');
      say(`${cap(E.name)} is dead.`);
      update();
      moves.innerHTML = '';
      const b = el('button', 'btn', '<span>continue</span>');
      b.onclick = () => {
        AU.sfx('click');
        opts.onWin();
      };
      moves.appendChild(b);
      b.focus();
    }

    WEAPONS.filter((w) => w.has()).forEach((w) => {
      const sub = w.ammo ? `${S.res.shot || 0} ${RES.shot}` : '';
      moveButton(w.label, sub, w.cd, () => !w.ammo || S.res[w.ammo] > 0, () => attack(w));
    });
    moveButton('eat', '1 provisions · heal 3', 5, () => S.res.food > 0 && S.health < maxHealth(), () => {
      S.res.food--;
      heal(3);
      say('You wolf down a mouthful and feel stronger.');
    });
    if (opts.canFlee !== false) moveButton('flee', '', 2, () => true, flee);
    update();
  };
})();
