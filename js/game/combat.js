/* Driftwood — combat.
 * Fights are turn based: the castaway strikes, braces, eats or flees, and
 * then the foe answers. Now and then a foe gathers itself for a heavy blow,
 * which lands in full unless the castaway braces for it. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, $, el, chance, pick, cap, replayAnimation,
    RES, FOES, heal, damage, maxHealth, modal, closeModal, session, log,
  } = G;

  /** Pause between the castaway's move and the foe's answer, in ms. */
  const FOE_DELAY = 700;

  /** Chance, each turn after the first, that the foe winds up for a heavy blow. */
  const WINDUP_CHANCE = 0.22;

  /** Extra damage a heavy blow does. */
  const HEAVY_BONUS = 2;

  /**
   * The castaway's weapons, best last. Only the best blade (or fists, with
   * none) is offered, beside the pistol, which uses powder & shot.
   */
  const BLADES = [
    { id: 'fists', label: 'strike', dmg: 2, has: () => true, snd: 'hit', verb: 'You strike' },
    { id: 'knife', label: 'stab', dmg: 3, has: () => S.items.knife, snd: 'hit', verb: 'You stab' },
    { id: 'spear', label: 'thrust the spear', dmg: 4, has: () => S.items.spear, snd: 'swing', verb: 'You run the spear into' },
    { id: 'cutlass', label: 'swing the cutlass', dmg: 5, has: () => S.items.cutlass, snd: 'swing', verb: 'You cut' },
  ];
  const PISTOL = { id: 'pistol', label: 'fire the pistol', dmg: 8, snd: 'shot', ammo: 'shot', verb: 'The ball takes' };

  /** Whether the castaway has a blade to fight with. Until then, nothing picks a fight with them. */
  G.armed = () => BLADES.some((w) => w.id !== 'fists' && w.has());

  /** The markup of the fight panel: two health bars, the narration of the turn, and the moves. */
  const COMBAT_HTML = (foeName) =>
    '<div class="bars">' +
    '<div><span>you</span><div class="meter"><i class="you"></i></div></div>' +
    `<div><span>${foeName}</span><div class="meter"><i class="foe"></i></div></div>` +
    '</div><div class="ctext"></div><div class="moves"></div>';

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
    const generation = session.generation;
    let over = false;
    let foesTurn = false;
    let turns = 0;
    let winding = false; // the foe is gathering for a heavy blow
    let braced = false; // the castaway braced this turn
    let opening = false; // the foe is off balance: the next blow cannot miss

    AU.setMood('tense');
    if (E.sound) AU.sfx(E.sound);
    modal({ art: ART.foe(E.art), title: cap(E.name), text: [opts.intro || E.intro], choices: [] });

    const box = el('div', 'combat', COMBAT_HTML(E.name));
    $('#modal-choices').appendChild(box);
    const moves = box.querySelector('.moves');
    const ctext = box.querySelector('.ctext');
    const card = $('.modal-card');

    /** Adds a line to the narration of this turn; `cls` styles it. */
    const say = (t, cls) => {
      ctext.appendChild(el('p', cls || '', t));
    };

    /** Redraws both health bars and re-checks which moves are available. */
    function update() {
      box.querySelector('.you').style.width = `${Math.max(0, (S.health / maxHealth()) * 100)}%`;
      box.querySelector('.foe').style.width = `${Math.max(0, (E.hp / maxHp) * 100)}%`;
      moves.querySelectorAll('button').forEach((b) => {
        if (b._upd) b._upd();
      });
    }

    /** The foe lands a blow of `n` with the words `verb`. */
    function struck(n, verb) {
      AU.sfx('hurt');
      replayAnimation(card, 'hurt');
      say(`${cap(E.name)} ${verb}. (−${n})`);
      damage(n, E.name);
    }

    /**
     * The foe's answer: a heavy blow if it wound up last turn (turned aside
     * by bracing), sometimes a wind-up, and otherwise an ordinary attack,
     * half as likely to land on a braced castaway.
     */
    function foeTurn() {
      if (winding) {
        winding = false;
        if (braced) {
          opening = true;
          say(`${cap(E.name)} ${E.heavy} — but you are braced for it, and turn the blow aside. It is off balance.`);
        } else {
          struck(E.dmg + HEAVY_BONUS, E.heavy);
        }
        return;
      }
      if (turns > 1 && chance(WINDUP_CHANCE)) {
        winding = true;
        say(E.tell, 'tell');
        return;
      }
      if (chance(braced ? E.hit / 2 : E.hit)) struck(E.dmg, pick(E.verbs));
      else say(braced ? `You take ${E.name}'s attack on your guard.` : `${cap(E.name)} misses.`);
    }

    /**
     * Plays one turn: the castaway's move `act`, then, after a pause and if
     * the fight goes on, the foe's answer. Moves are locked meanwhile.
     */
    function turn(act) {
      if (over || foesTurn) return;
      turns++;
      braced = false;
      ctext.innerHTML = '';
      act();
      update();
      if (over || S.ended) return;
      foesTurn = true;
      update();
      setTimeout(() => {
        // the fight may have ended, or the game been restarted, in the pause
        if (session.generation !== generation || over || S.ended) return;
        foesTurn = false;
        foeTurn();
        if (!S.ended) update();
      }, FOE_DELAY);
    }

    /** Adds a move button: `label` with an optional `sub` line, usable when `can()` is true. */
    function moveButton(label, sub, can, act) {
      const b = el('button', 'btn', `<span>${label}</span>${sub ? `<span class="cost">${sub}</span>` : ''}`);
      b._upd = () => {
        b.disabled = over || foesTurn || !can();
        b.classList.toggle('urgent', !!b._urgent && b._urgent() && !b.disabled);
      };
      b.onclick = () => {
        if (!b.disabled) turn(act);
      };
      moves.appendChild(b);
      return b;
    }

    /** Attacks with weapon `w`: firearms hit more often, and spend a shot; a foe off balance is hit for sure. */
    function attack(w) {
      AU.sfx(w.snd);
      if (w.ammo) {
        S.res[w.ammo]--;
        w.btn.querySelector('.cost').textContent = `${S.res.shot} ${RES.shot}`;
      }
      const sure = opening;
      opening = false;
      if (!sure && !chance(w.ammo ? 0.9 : 0.8)) {
        say('You miss.');
        return;
      }
      const d = w.dmg + allyBonus;
      E.hp -= d;
      replayAnimation($('#modal-art'), 'hit');
      say(opts.ally ? `You and Hollis strike together. (${d})` : `${w.verb} ${E.name}. (${d})`);
      if (E.hp <= 0) win();
    }

    /** Tries to run: it works more often than not, and otherwise the foe gets its turn. */
    function flee() {
      if (chance(0.6)) {
        over = true;
        AU.setMood('calm');
        log(`You run from ${E.name}, and do not stop until your lungs give out.`);
        closeModal();
        if (opts.onFlee) opts.onFlee();
      } else {
        say('You stumble as you turn!');
      }
    }

    /** The foe is dead: replaces the moves with a single "continue". */
    function win() {
      over = true;
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

    const blade = BLADES.filter((w) => w.has()).pop();
    moveButton(blade.label, `${blade.dmg + allyBonus} damage`, () => true, () => attack(blade));
    if (S.items.pistol) {
      PISTOL.btn = moveButton(PISTOL.label, `${S.res.shot || 0} ${RES.shot}`, () => S.res.shot > 0, () => attack(PISTOL));
    }
    const brace = moveButton('brace yourself', 'turn aside a heavy blow', () => true, () => {
      braced = true;
      say('You set your feet and raise your guard.');
    });
    brace._urgent = () => winding;
    moveButton('snatch a bite', '1 provisions · heal 3', () => S.res.food > 0 && S.health < maxHealth(), () => {
      S.res.food--;
      heal(3);
      say('You wolf down a mouthful and feel stronger.');
    });
    if (opts.canFlee !== false) moveButton('flee', '', () => true, flee);
    say('What will you do?');
    update();
  };
})();
