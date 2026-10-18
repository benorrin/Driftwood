/* Driftwood — the game.
 * A slow incremental survival tale: gather, build, explore the island,
 * uncover what became of the brig Calliope, and find a way home. */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const chance = (p) => Math.random() < p;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const AU = window.DWAudio;
  const ART = window.DWArt;
  const sfx = (n) => AU.sfx(n);

  const SAVE_KEY = 'driftwood-save-v1';
  const DAY_LEN = 120;
  const NIGHT_AT = 84;
  const FIRE_DECAY = 40;
  const FIRE_NAMES = ['cold', 'smouldering', 'flickering', 'burning', 'roaring'];

  const RES = {
    water: 'fresh water', food: 'provisions', wood: 'driftwood', fibre: 'palm fibre', rope: 'cordage',
    stone: 'stone', timber: 'timber', cloth: 'sailcloth', iron: 'iron nails', hide: 'boar hide',
    torch: 'torches', shot: 'powder & shot',
  };
  const RES_ORDER = ['water', 'food', 'wood', 'fibre', 'rope', 'stone', 'timber', 'cloth', 'iron', 'hide', 'torch', 'shot'];
  const ITEMS = {
    pistol: ['flintlock pistol', 'one ball, one choice'],
    bible: ["the ship's Bible", 'its flyleaf a chart'],
    knife: ['stone knife', ''],
    spear: ['fishing spear', ''],
    axe: ['stone axe', ''],
    cutlass: ['cutlass', 'from the Calliope'],
    waterskin: ['waterskin', ''],
    journal: ["Hale's journal", ''],
  };

  let S = null;
  let tab = 'beach';
  let seenTabs = { beach: true };
  let sceneKey = '';
  let running = false;
  const cooldowns = {};
  const bumps = {};

  /* ---------------- state ---------------- */

  function fresh() {
    return {
      v: 1, day: 1, t: 8, health: 10, fire: 0, fireT: 0,
      res: { water: 3, food: 3, shot: 1 },
      seen: { water: 1, food: 1, shot: 1 },
      items: { pistol: 1, bible: 1 },
      built: {}, raft: {}, flags: {}, visits: {}, log: [],
      n: { comb: 0, salvage: 0, pyreDays: 0 },
      ticks: { catcher: 0, trap: 0, ally: 0 },
      ended: false,
    };
  }

  const has = (cost) => Object.keys(cost || {}).every((k) => (S.res[k] || 0) >= cost[k]);
  const pay = (cost) => { for (const k in cost) S.res[k] -= cost[k]; };
  const costText = (cost) => Object.entries(cost || {}).map(([k, v]) => `${v} ${RES[k]}`).join(', ');
  const maxHealth = () => 10 + (S.built.leanto ? 2 : 0);
  const isNight = () => S.t >= NIGHT_AT;

  function add(k, n) {
    if (!n) return;
    S.res[k] = Math.max(0, (S.res[k] || 0) + n);
    if (n > 0) S.seen[k] = 1;
    bumps[k] = 1;
  }

  // add several resources; returns e.g. "2 driftwood, 1 stone"
  function gain(obj) {
    const parts = [];
    for (const k in obj) {
      if (obj[k] > 0) {
        add(k, obj[k]);
        parts.push(`${obj[k]} ${RES[k]}`);
      }
    }
    return parts.join(', ');
  }

  function log(msg, cls) {
    S.log.unshift({ m: msg, c: cls || '' });
    if (S.log.length > 50) S.log.length = 50;
    renderLog();
  }

  function heal(n) { S.health = Math.min(maxHealth(), S.health + n); }

  function damage(n, cause) {
    S.health -= n;
    if (S.health <= 0) die(cause);
  }

  function setFire(level, quiet) {
    const prev = S.fire;
    S.fire = Math.max(0, Math.min(4, level));
    S.fireT = 0;
    AU.setFire(S.fire);
    if (quiet || prev === S.fire) return;
    if (S.fire === 0) log('The fire has gone out.', 'warn');
    else log(`The fire is ${FIRE_NAMES[S.fire]}.`);
  }

  /* ---------------- persistence ---------------- */

  function save() {
    if (!S || S.ended) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      return s && s.v === 1 && !s.ended ? s : null;
    } catch (e) { return null; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  /* ---------------- camp actions ---------------- */

  const ACTIONS = [
    {
      id: 'gather', label: 'gather driftwood', cd: 5, show: () => true,
      run() {
        const n = R(1, 3) + (S.items.axe ? 1 : 0);
        add('wood', n);
        sfx('gather');
        if (!S.flags.firstWood) {
          S.flags.firstWood = 1;
          log('Bleached wood, light as bone. The sea gives it up grudgingly.');
        } else log(pick([`You drag ${n} driftwood above the tide line.`, `${n} driftwood, salt-white and dry.`, `The wrack line yields ${n} driftwood.`]));
      },
    },
    {
      id: 'light', label: 'light a fire', cd: 3, cost: { wood: 3 }, show: () => S.fire === 0 && S.seen.wood,
      run() {
        sfx('fire');
        if (!S.flags.fireLit) {
          S.flags.fireLit = 1;
          log("You prime the pistol's pan with a pinch of powder and strike the flint over dry fronds. A spark. Another. Then smoke, and flame.", 'lore');
          log('Light, and warmth. The night will be kinder now.');
        }
        setFire(2);
      },
    },
    {
      id: 'stoke', label: 'stoke the fire', cd: 4, cost: { wood: 1 }, show: () => S.fire > 0, enabled: () => S.fire < 4,
      run() { sfx('stoke'); setFire(S.fire + 1); },
    },
    { id: 'comb', label: 'comb the beach', cd: 8, show: () => S.flags.fireLit, run: comb },
    {
      id: 'climb', label: 'climb a palm', cd: 12, show: () => S.flags.climb,
      run() {
        sfx('gather');
        if (chance(0.08)) {
          sfx('hurt');
          log('A frond gives way. You fall hard onto the roots.', 'warn');
          damage(1, 'fall');
          return;
        }
        log(`From the crown of the palm: ${gain({ food: R(1, 2), water: 1, fibre: R(1, 2) })}.`);
      },
    },
    {
      id: 'water', label: 'fetch water', cd: 15, show: () => S.flags.spring,
      run() {
        sfx('water');
        log(`You carry ${gain({ water: R(3, 5) + (S.items.waterskin ? 2 : 0) })} back from the spring.`);
      },
    },
    {
      id: 'fish', label: 'spear fish', cd: 12, show: () => S.items.spear,
      run() {
        sfx('splash');
        if (chance(0.25)) log(pick(['The fish are wiser than you today.', 'A flash of silver, and nothing on the spear.', 'You stand in the shallows until your legs go numb. Nothing.']));
        else log(`You wade back with ${gain({ food: R(2, 3) })}.`);
      },
    },
    {
      id: 'fell', label: 'fell timber', cd: 10, show: () => S.items.axe,
      run() { sfx('chop'); log(`The stone axe bites slowly. ${cap(gain({ timber: R(2, 3) }))}.`); },
    },
    {
      id: 'salvage', label: 'salvage the wreck', cd: 25, show: () => S.flags.wreckHold,
      run() {
        sfx('chop');
        S.n.salvage++;
        const got = { iron: R(1, 2), cloth: chance(0.5) ? 1 : 0, timber: chance(0.5) ? 1 : 0 };
        if (S.n.salvage % 6 === 0) got.shot = 1;
        log(`Out on the reef at low water, you prise loose ${gain(got)}.`);
      },
    },
    {
      id: 'read', label: 'read by firelight', cd: 45, show: () => S.items.bible && S.fire > 0 && isNight(),
      run() {
        sfx('page');
        log(`"${pick(VERSES)}"`, 'lore');
        heal(1);
      },
    },
  ];

  const VERSES = [
    'They that go down to the sea in ships, that do business in great waters; these see the works of the LORD, and his wonders in the deep.',
    'The waters compassed me about, even to the soul: the depth closed me round about, the weeds were wrapped about my head.',
    'If I take the wings of the morning, and dwell in the uttermost parts of the sea; even there shall thy hand lead me.',
    'The LORD on high is mightier than the noise of many waters, yea, than the mighty waves of the sea.',
    'And so it came to pass, that they escaped all safe to land.',
    'He maketh the storm a calm, so that the waves thereof are still.',
  ];

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function comb() {
    S.n.comb++;
    const c = S.n.comb;
    sfx('comb');
    if (c === 1) {
      add('fibre', 3);
      log('Dead palm fronds tangled in the wrack. Their fibres could be twisted into cord.');
    } else if (c === 2) {
      add('stone', 2);
      log('Smooth grey stones, heavy in the hand. Some are flint-hard and hold an edge.');
    } else if (c === 3) {
      S.flags.chart = 1;
      add('fibre', 2);
      log('From the crest of the dune you can see the shape of the land. You draw a chart on the flyleaf of the Bible with a burnt stick.', 'lore');
    } else if (c === 4) {
      add('cloth', 1);
      log("A rag of canvas half-buried in the sand. Somebody else's sail, once.");
    } else if (c === 6 && !S.flags.bottle) {
      bottle();
    } else {
      const roll = Math.random();
      if (roll < 0.36) log(`You gather ${gain({ fibre: R(2, 3) })} from the dune grass.`);
      else if (roll < 0.58) log(`${cap(gain({ stone: R(1, 2) }))}, worn smooth by the surf.`);
      else if (roll < 0.76) log(`A fallen coconut: ${gain({ food: 1, water: 1 })}.`);
      else if (roll < 0.88) log(`A crab, too slow: ${gain({ food: 1 })}.`);
      else if (roll < 0.96) log(`A strip of canvas, washed up from somewhere: ${gain({ cloth: 1 })}.`);
      else log(`${cap(gain({ wood: R(2, 4) }))} — a broken spar, by the look of it.`);
    }
  }

  function bottle() {
    S.flags.bottle = 1;
    sfx('pickup');
    modal({
      art: ART.scene('bottle'),
      title: 'A Message',
      text: [
        'Green glass glints in the wrack. A bottle, its neck sealed with wax gone grey with age. Inside, a curl of paper.',
        '<p class="quote">To any Christian soul who finds this. The brig <i>Calliope</i>, of Liverpool, struck upon a reef off this island the 9th of March, 1826. Eleven of us came ashore. We are camped by the eastern rocks. God send a ship. — J. Hale, Master.</p>',
        'Twenty years ago. You look east, toward the rocks.',
      ],
      choices: [{ label: 'mark it on your chart', fn: () => { log('Somewhere to the east lies the wreck of the Calliope.', 'lore'); closeModal(); } }],
    });
  }

  /* ---------------- making things ---------------- */

  const RECIPES = [
    { id: 'rope', label: 'twist cordage', cost: { fibre: 3 }, gives: { rope: 1 }, show: () => S.seen.fibre, msg: 'You roll palm fibre against your thigh until it becomes cord.' },
    { id: 'leanto', label: 'lean-to', cost: { wood: 8, fibre: 6 }, max: 1, show: () => S.flags.fireLit && S.seen.fibre, msg: 'A roof of fronds over a ridge-pole. It is not much, but the dew no longer finds you.' },
    { id: 'knife', label: 'stone knife', cost: { stone: 2, rope: 1 }, item: 'knife', show: () => S.seen.stone && S.seen.rope, msg: 'You knap a flake of stone to an edge and bind a handle. A tool. A weapon.' },
    { id: 'spear', label: 'fishing spear', cost: { wood: 4, rope: 1 }, item: 'spear', show: () => S.items.knife, msg: 'A long straight pole, its point split four ways and spread with a wedge. For fish. Or worse.' },
    { id: 'axe', label: 'stone axe', cost: { stone: 3, wood: 3, rope: 2 }, item: 'axe', show: () => S.items.knife, msg: 'Heavy, ugly, and it will fell a tree — eventually.' },
    { id: 'catcher', label: 'rain catcher', cost: { cloth: 2, wood: 4, rope: 1 }, max: 3, show: () => S.seen.cloth && S.seen.rope, msg: 'Canvas stretched between two posts, sagging to a shell. When it rains, you will drink.' },
    { id: 'trap', label: 'fish weir', cost: { wood: 6, rope: 2 }, max: 3, show: () => S.items.knife, msg: 'A crescent of stakes in the shallows. The tide brings the fish in and forgets to take them out.' },
    { id: 'rack', label: 'smoking rack', cost: { timber: 4, rope: 2 }, max: 1, show: () => S.seen.timber && S.built.trap, msg: 'Fish split and hung over green smoke will keep. The weirs now feed you twice over.' },
    { id: 'torch', label: 'torch', cost: { wood: 1, fibre: 2 }, gives: { torch: 1 }, show: () => S.flags.caveKnown, msg: 'Fibre bound tight about a stick. It will burn an hour, perhaps.' },
    { id: 'waterskin', label: 'waterskin', cost: { hide: 2, rope: 1 }, item: 'waterskin', show: () => S.seen.hide, msg: 'Hide sewn into a bag and sealed with fat. You can go further now.' },
    { id: 'pyre', label: 'signal pyre', cost: { wood: 30, timber: 10, fibre: 10 }, max: 1, show: () => S.flags.summit, msg: 'You haul it all up the headland, armful by armful, and build a pyre taller than a man. Now you watch the north. And wait.' },
  ];

  const RAFT = [
    { id: 'hull', label: 'lash the hull', cost: { timber: 16, rope: 8 }, note: 'twelve logs, bound and pinned', msg: 'Twelve logs, lashed and pinned with treenails. It floats. It actually floats.' },
    { id: 'mast', label: 'step the mast', cost: { timber: 6, iron: 4, rope: 3 }, needs: 'hull', note: 'a mast and yard, iron-banded', msg: 'The mast stands. You lean on it and it does not give.' },
    { id: 'sail', label: 'sew the sail', cost: { cloth: 8, rope: 4 }, needs: 'mast', note: 'a square of patched canvas', msg: "You sew the Calliope's canvas into a sail with a bone needle. Her ghost will carry you." },
    { id: 'casks', label: 'cooper water casks', cost: { timber: 4, iron: 6 }, needs: 'hull', note: 'staves and hoops from the wreck', msg: 'Two casks, tight enough. Water for a fortnight, if you are careful.' },
  ];
  const LAUNCH_COST = { water: 12, food: 12 };

  function make(rc) {
    if (!has(rc.cost)) return;
    pay(rc.cost);
    sfx('craft');
    if (rc.gives) gain(rc.gives);
    else if (rc.item) S.items[rc.item] = 1;
    else S.built[rc.id] = (S.built[rc.id] || 0) + 1;
    log(rc.msg);
    if (rc.id === 'leanto') heal(2);
    if (rc.id === 'pyre') S.n.pyreDays = 0;
    save();
  }

  function buildRaft(p) {
    if (!has(p.cost)) return;
    pay(p.cost);
    sfx('craft');
    S.raft[p.id] = 1;
    log(p.msg);
    save();
  }

  /* ---------------- adversaries ---------------- */

  const FOES = {
    crab: { name: 'the land crab', art: 'crab', hp: 7, dmg: 1, speed: 2.4, hit: 0.7, verbs: ['clamps a claw on your leg', 'nips your hand to the bone'], intro: 'It rears up on its legs, claws wide, big as a dinner plate and twice as hard.' },
    boar: { name: 'the boar', art: 'boar', hp: 12, dmg: 2, speed: 2.2, hit: 0.65, verbs: ['gores your thigh', 'slams into you', 'rakes you with a tusk'], intro: 'A grunt, a crash of undergrowth, and a boar bursts onto the path, tusked and furious.', sound: 'growl' },
    viper: { name: 'the viper', art: 'viper', hp: 4, dmg: 3, speed: 3, hit: 0.5, verbs: ['strikes', 'sinks its fangs into your wrist'], intro: 'Something on the warm stones uncoils, and lifts its flat head.', sound: 'hiss' },
    hollis: { name: 'the wild man', art: 'hollis', hp: 15, dmg: 2, speed: 2, hit: 0.7, verbs: ['jabs with his spear', 'screams and lunges', 'catches you with the spear-butt'], intro: 'He howls, and comes at you with the spear.' },
    shark: { name: 'the shark', art: 'shark', hp: 14, dmg: 3, speed: 2.6, hit: 0.6, verbs: ['tears at the logs, and at you', 'lunges from the water'], intro: 'It rises. Its jaws close on the logs at your feet.' },
  };

  const WEAPONS = [
    { id: 'fists', label: 'strike', dmg: 1, cd: 1, has: () => !S.items.knife && !S.items.spear && !S.items.cutlass, snd: 'hit' },
    { id: 'knife', label: 'stab', dmg: 2, cd: 1.2, has: () => S.items.knife, snd: 'hit' },
    { id: 'spear', label: 'thrust the spear', dmg: 3, cd: 1.6, has: () => S.items.spear, snd: 'swing' },
    { id: 'cutlass', label: 'swing the cutlass', dmg: 4, cd: 1.5, has: () => S.items.cutlass, snd: 'swing' },
    { id: 'pistol', label: 'fire the pistol', dmg: 8, cd: 4, has: () => S.items.pistol, ammo: 'shot', snd: 'shot' },
  ];

  function fight(key, opts) {
    opts = opts || {};
    const E = Object.assign({}, FOES[key]);
    const maxHp = E.hp;
    let over = false;
    const allyBonus = opts.ally ? 1 : 0;
    AU.setMood('tense');
    if (E.sound) sfx(E.sound);
    modal({ art: ART.foe(E.art), title: cap(E.name), text: [opts.intro || E.intro], choices: [] });

    const box = el('div', 'combat');
    box.innerHTML = `<div class="bars"><div><span>you</span><div class="meter"><i class="you"></i></div></div>` +
      `<div><span>${E.name}</span><div class="meter"><i class="foe"></i></div></div></div><div class="moves"></div><div class="ctext"></div>`;
    $('#modal-choices').appendChild(box);
    const moves = box.querySelector('.moves');
    const say = (t) => { box.querySelector('.ctext').textContent = t; };
    const card = $('.modal-card');

    function upd() {
      box.querySelector('.you').style.width = `${Math.max(0, (S.health / maxHealth()) * 100)}%`;
      box.querySelector('.foe').style.width = `${Math.max(0, (E.hp / maxHp) * 100)}%`;
      moves.querySelectorAll('button').forEach((b) => { if (b._upd) b._upd(); });
    }

    function enemyAttack() {
      if (over || S.ended) return;
      if (chance(E.hit)) {
        sfx('hurt');
        card.classList.remove('hurt');
        void card.offsetWidth;
        card.classList.add('hurt');
        say(`${cap(E.name)} ${pick(E.verbs)}.`);
        damage(E.dmg, E.name);
      } else say(`${cap(E.name)} misses.`);
      if (!S.ended) upd();
    }

    let next = performance.now() + E.speed * 1000 + 800;
    const loop = setInterval(() => {
      if (over || S.ended || !document.body.contains(box)) { clearInterval(loop); return; }
      if (performance.now() >= next) {
        next += E.speed * 1000 * (0.85 + Math.random() * 0.3);
        enemyAttack();
      }
    }, 100);

    function moveBtn(label, sub, cd, can, act) {
      const b = el('button', 'btn', `<span>${label}</span>${sub ? `<span class="cost">${sub}</span>` : ''}<span class="cd"></span>`);
      let until = 0;
      b._upd = () => { b.disabled = over || performance.now() < until || !can(); };
      b.onclick = () => {
        if (b.disabled) return;
        act();
        if (over) return;
        until = performance.now() + cd * 1000;
        startCooldown(b, cd);
        b._upd();
        setTimeout(() => { if (b._upd) b._upd(); }, cd * 1000 + 20);
        upd();
      };
      moves.appendChild(b);
    }

    WEAPONS.filter((w) => w.has()).forEach((w) => {
      moveBtn(w.label, w.ammo ? `${S.res.shot || 0} ${RES.shot}` : '', w.cd, () => !w.ammo || S.res[w.ammo] > 0, () => {
        sfx(w.snd);
        if (w.ammo) {
          S.res[w.ammo]--;
          moves.querySelectorAll('.cost').forEach((c) => { if (c.textContent.includes(RES.shot)) c.textContent = `${S.res.shot} ${RES.shot}`; });
        }
        if (chance(w.ammo ? 0.9 : 0.8)) {
          const d = w.dmg + allyBonus;
          E.hp -= d;
          const art = $('#modal-art');
          art.classList.remove('hit');
          void art.offsetWidth;
          art.classList.add('hit');
          say(opts.ally ? `You and Hollis strike together. (${d})` : `You hit ${E.name}. (${d})`);
          if (E.hp <= 0) win();
        } else say('You miss.');
      });
    });
    moveBtn('eat', '1 provisions · heal 3', 5, () => S.res.food > 0 && S.health < maxHealth(), () => {
      S.res.food--;
      heal(3);
      say('You wolf down a mouthful and feel stronger.');
    });
    if (opts.canFlee !== false) {
      moveBtn('flee', '', 2, () => true, () => {
        if (chance(0.6)) {
          over = true;
          clearInterval(loop);
          AU.setMood('calm');
          log(`You run from ${E.name}, and do not stop until your lungs give out.`);
          closeModal();
          if (opts.onFlee) opts.onFlee();
        } else {
          say('You stumble as you turn!');
          enemyAttack();
        }
      });
    }
    upd();

    function win() {
      over = true;
      clearInterval(loop);
      sfx('victory');
      AU.setMood('calm');
      say(`${cap(E.name)} is dead.`);
      upd();
      moves.innerHTML = '';
      const b = el('button', 'btn', '<span>continue</span>');
      b.onclick = () => { sfx('click'); opts.onWin(); };
      moves.appendChild(b);
      b.focus();
    }
  }

  /* ---------------- the island ---------------- */

  const LOCS = {
    grove: {
      name: 'The Palm Grove', x: 204, y: 232, cost: { water: 1 }, time: 4, art: 'grove',
      known: () => S.flags.chart,
      first() {
        S.flags.climb = 1;
        modal({
          art: ART.scene('grove'), title: 'The Palm Grove',
          text: [
            'Beyond the dunes, a hundred coconut palms lean together against the wind. Fallen fronds lie thick as thatch underfoot, and green nuts hang in clusters high overhead.',
            'Fibre. Fruit. Shade. You could climb these, with patience and bark-skinned knees.',
            `<p class="gain">You gather ${gain({ fibre: 4, food: 2, water: 2 })}.</p>`,
          ],
          choices: [{ label: 'return to camp', fn: () => { log('You can climb the palms for coconuts now.'); closeModal(); } }],
        });
      },
      repeat() {
        if (chance(0.22)) {
          fight('crab', { intro: 'Among the fallen nuts, a land crab big as a dinner plate turns to face you, claws raised.', onWin: () => done('grove', 'Its meat is sweet as lobster.', { food: 3 }) });
          return;
        }
        done('grove', pick(['The palms creak and sigh above you as you work.', 'Wind in the fronds like distant surf.']), { fibre: R(3, 5), food: R(1, 2), water: R(1, 2) });
      },
    },
    tidepools: {
      name: 'The Tide Pools', x: 446, y: 236, cost: { water: 1, food: 1 }, time: 5, art: 'tidepools',
      known: () => S.visits.grove || S.flags.bottle,
      first() {
        modal({
          art: ART.scene('tidepools'), title: 'The Tide Pools',
          text: [
            'Black rock shelves step down into the sea, and at low water each holds a pool: anemones, darting fish, starfish red as wounds. Stone here is plentiful, and the pools are full of life.',
            'Then a scraping, clattering sound — and from a crevice drags something huge.',
          ],
          choices: [{
            label: 'stand your ground',
            fn: () => fight('crab', {
              canFlee: false,
              intro: 'A crab the size of a cartwheel, its shell crusted with barnacles, claws open wide enough to take your hand.',
              onWin: () => {
                S.flags.wreckSeen = 1;
                done('tidepools', 'You sit on the rocks, shaking, and eat crab until you can eat no more. Far out on the reef to the south-east, something that is not rock catches the light: the ribs of a ship.', { food: 4, stone: 4 });
              },
            }),
          }],
        });
      },
      repeat() {
        if (chance(0.25)) {
          fight('crab', { onWin: () => done('tidepools', 'The pools are yours again.', { food: 3, stone: R(1, 2) }) });
          return;
        }
        done('tidepools', pick(['You pry limpets from the rocks and gather stones.', 'Small fish trapped by the ebb make easy catching.']), { food: R(2, 4), stone: R(2, 3) });
      },
    },
    spring: {
      name: 'The Spring', x: 252, y: 176, cost: { food: 1 }, time: 5, art: 'spring',
      known: () => S.visits.tidepools,
      blocked: () => (!S.items.knife ? 'the thicket is too dense without a blade' : null),
      first() {
        modal({
          art: ART.scene('spring'), title: 'The Spring',
          text: ['You hack through a wall of thorn and vine until your arms ache — and then you hear it: water, falling over stone. A spring wells out of the hillside into a clear, cold pool.'],
          choices: [{
            label: 'drink',
            fn: () => fight('viper', {
              intro: 'As you kneel at the edge of the pool, something on the warm stones uncoils.',
              onWin: () => {
                S.flags.spring = 1;
                S.flags.footprints = 1;
                done('spring', 'You drink until your belly aches. Then you see it, pressed into the mud at the water\'s edge: a footprint. Bare, broad, and not your own.', { water: 5 }, 'The island is not empty.');
              },
              onFlee: () => log('You will have to go back for that water.'),
            }),
          }],
        });
      },
      repeat() {
        if (!S.flags.spring) { this.first(); return; }
        if (chance(0.15)) {
          fight('viper', { onWin: () => done('spring', 'You fill up and go.', { water: 5 }) });
          return;
        }
        done('spring', 'The water is cold enough to make your teeth ache.', { water: R(5, 7) });
      },
    },
    wreck: {
      name: 'The Wreck', x: 540, y: 284, cost: { water: 1, food: 1 }, time: 6, art: 'wreck',
      known: () => S.flags.bottle || S.flags.wreckSeen,
      blocked: () => {
        if (S.flags.wreckCabin && S.flags.wreckHold) return 'picked clean (salvage from camp)';
        return (S.res.rope || 0) < 3 ? 'needs 3 cordage to cross the reef' : null;
      },
      first() { wreck(true); },
      repeat() { wreck(false); },
    },
    jungle: {
      name: 'The Jungle', x: 356, y: 158, cost: { water: 2, food: 1 }, time: 6, art: 'jungle',
      known: () => S.visits.spring,
      blocked: () => (!S.items.axe ? 'you need an axe to cut a path' : null),
      first() {
        modal({
          art: ART.scene('jungle'), title: 'The Jungle',
          text: ['The jungle closes over you like deep water. Green light, the shriek of birds you never see, the smell of rot and flowers. Your axe bites into vine after vine.'],
          choices: [{
            label: 'press on',
            fn: () => fight('boar', {
              canFlee: false,
              onWin: () => {
                S.flags.trail = 1;
                S.flags.footprints = 1;
                done('jungle', 'You butcher the boar where it fell. Further on you find a trail: narrow, worn smooth, and blazed with old knife-cuts. It winds north, toward a thread of smoke above the trees.', { food: 5, hide: 2, timber: 2 }, 'Someone else lives on this island.');
              },
            }),
          }],
        });
      },
      repeat() {
        modal({
          art: ART.scene('jungle'), title: 'The Jungle',
          text: ['The green closes behind you. What will you look for?'],
          choices: [
            { label: 'hunt boar', fn: () => fight('boar', { onWin: () => done('jungle', 'Meat, and hide for the curing.', { food: 5, hide: 2 }) }) },
            { label: 'cut timber', fn: () => { sfx('chop'); done('jungle', 'Straight young hardwoods, felled and trimmed.', { timber: R(4, 6) }); } },
            { label: 'forage', fn: () => done('jungle', 'Breadfruit, wild yams, vines for cord.', { food: R(2, 3), fibre: R(3, 4) }) },
          ],
        });
      },
    },
    cave: {
      name: 'The Cave', x: 216, y: 106, cost: { water: 1, food: 1, torch: 1 }, time: 6, art: 'cave',
      known: () => S.flags.caveKnown,
      first() {
        sfx('bats');
        modal({
          art: ART.scene('cave'), title: 'The Cave',
          text: [
            'The cave mouth breathes cold air. Your torch throws shadows up the walls, and above you something shifts and squeaks — then the bats come, a thousand of them, pouring past your head into the daylight.',
            'Deeper in, where the floor is dry, eight shapes lie in a row beneath rotted blankets. A ninth sits apart against the wall, a book in its lap.',
          ],
          choices: [{ label: 'take the book', fn: journal }],
        });
      },
      repeat() {
        done('cave', S.flags.buried ? 'The cave is quiet. You do not stay long.' : 'The dead keep their silence.', { stone: R(3, 5) });
      },
    },
    hut: {
      name: "The Wild Man's Hut", x: 420, y: 124, cost: { water: 1, food: 1 }, time: 6, art: 'hut',
      known: () => S.flags.trail && !S.flags.hollisDone,
      first: hut,
      repeat: hut,
    },
    summit: {
      name: 'The Summit', x: 300, y: 70, cost: { water: 2, food: 2 }, time: 8, art: 'summit',
      known: () => S.flags.summitKnown,
      blocked: () => (!S.items.waterskin ? 'too long a climb without a waterskin' : null),
      first() {
        S.flags.summit = 1;
        modal({
          art: ART.scene('summit'), title: 'The Summit',
          text: [
            'The climb takes the whole of the morning: thorn, scree, a chimney of crumbling rock where only the waterskin keeps you going. Then the top. The whole island beneath you, small as a hand, and all around it the sea. The great empty sea.',
            'To the north the water is darker where a current runs. A sea lane. If ships pass this island at all, they pass here — and from here, a great fire would be seen for thirty miles.',
          ],
          choices: [{ label: 'descend', fn: () => { log('A signal pyre on the summit might be seen by a passing ship.', 'lore'); closeModal(); } }],
        });
      },
      repeat() {
        const msg = S.built.pyre ? 'The pyre stands ready. The horizon stays empty. You gather eggs from the cliff nests.' : pick(['Whales blow, far to the north.', 'You watch the empty sea, and gather eggs from the cliff nests.']);
        modal({ art: ART.scene('summit', { pyre: S.built.pyre }), title: 'The Summit', text: [msg, `<p class="gain">${gain({ food: R(2, 3) })}</p>`], choices: [{ label: 'descend', fn: closeModal }] });
      },
    },
  };
  const CAMP_POS = [310, 258];

  function done(id, text, got, logLine) {
    const g = got ? gain(got) : '';
    modal({
      art: ART.scene(LOCS[id].art),
      title: LOCS[id].name,
      text: [text].concat(g ? [`<p class="gain">You return with ${g}.</p>`] : []),
      choices: [{ label: 'return to camp', fn: () => { if (logLine) log(logLine, 'lore'); closeModal(); } }],
    });
  }

  function wreck(first) {
    const intro = first
      ? 'At the lowest ebb the reef stands clear of the water, and on it lies what is left of the <i>Calliope</i>: her ribs bare as a whale\'s, her mainmast snapped and trailing. You make your line fast to a coral head and haul yourself aboard.'
      : "The Calliope's bones creak in the swell. Her decks tilt like a roof.";
    const choices = [];
    if (!S.flags.wreckCabin) {
      choices.push({
        label: "search the captain's cabin",
        fn: () => {
          S.flags.wreckCabin = 1;
          S.flags.caveKnown = 1;
          S.items.cutlass = 1;
          sfx('pickup');
          modal({
            art: ART.scene('wreck'), title: "The Captain's Cabin",
            text: [
              'The cabin is a grotto of weed and sand. In a sea-chest, wrapped in oilcloth: a cutlass, bright still beneath its grease, and a tin of powder and ball the sea has somehow spared. The log is pulp, save for the last page:',
              '<p class="quote">Fever among the men. I have moved the sick to the cave beneath the north headland, where it is dry. The boy Hollis will not come. He says the island is watching us.</p>',
              `<p class="gain">You take the cutlass and ${gain({ shot: 2 })}.</p>`,
            ],
            choices: [{ label: 'go on', fn: () => wreck(false) }],
          });
        },
      });
    }
    if (!S.flags.wreckHold) {
      choices.push({
        label: 'go down into the hold',
        fn: () => {
          S.flags.wreckHold = 1;
          S.flags.raftPlans = 1;
          sfx('pickup');
          modal({
            art: ART.scene('wreck'), title: 'The Hold',
            text: [
              "The hold is half full of sand and black water. Your hands find barrel hoops, bolts of canvas — some still sound — and a carpenter's chest, its tools rusted but whole: adze, auger, mallet, and a book of ship's lines.",
              'With tools like these, you could build something that floats. Something to carry you over the horizon.',
              `<p class="gain">You take ${gain({ iron: 6, cloth: 4, timber: 2 })}.</p>`,
            ],
            choices: [{ label: 'go on', fn: () => { log('With the carpenter\'s tools, a raft might be possible.', 'lore'); wreck(false); } }],
          });
        },
      });
    }
    choices.push({ label: 'return to camp', fn: closeModal });
    modal({ art: ART.scene('wreck'), title: 'The Wreck of the Calliope', text: [intro], choices });
  }

  function journal() {
    S.items.journal = 1;
    S.flags.summitKnown = 1;
    sfx('page');
    modal({
      art: ART.scene('bones'), title: "Hale's Journal",
      text: [
        'You lift the book gently. The bones do not object. The ink is brown and the hand unsteady.',
        '<p class="quote">April 2nd. Buried Mr Tewkes. That makes six.</p>',
        '<p class="quote">April 19th. The boy Hollis says the whalers pass the north headland when the trades turn — he has seen their topsails from the high rock. I have not the strength to climb. If any man reads this: light a fire upon the summit. A great fire.</p>',
        '<p class="quote">The boy has not come back. I pray he lives. I pray he does not.</p>',
        `<p class="gain">Beside the body, a powder horn: ${gain({ shot: 3 })}.</p>`,
      ],
      choices: [
        { label: 'bury the dead', fn: () => { S.flags.buried = 1; heal(2); done('cave', 'It takes until dusk to carry them out and lay them under the sand, above the tide line. You say what you can remember of the burial service. It is not much, but it is something.', null, 'You know the way to the summit now.'); } },
        { label: 'leave them be', fn: () => done('cave', 'You leave the dead to their darkness.', null, 'You know the way to the summit now.') },
      ],
    });
  }

  function hut() {
    const first = !S.flags.metHollis;
    S.flags.metHollis = 1;
    modal({
      art: ART.scene('hut'), title: "The Wild Man's Hut",
      text: first
        ? [
          'In a clearing stands a hut of lashed poles and palm thatch. Boar skulls grin from stakes around it. A cookfire smoulders.',
          'Then a man steps out of the doorway — or the ruin of one: naked but for rags, hair to his waist, a spear in his fist and twenty years of solitude in his eyes. He stares at you as if you were a ghost.',
          '<p class="quote">"<i>Calliope</i>?" he croaks. "Did the <i>Calliope</i> send you?"</p>',
        ]
        : ['The wild man watches you from the doorway, spear in hand, perfectly still.'],
      choices: [
        { label: 'offer him food', cost: { food: 5 }, fn: hollisPeace },
        { label: 'draw your weapon', fn: () => fight('hollis', { canFlee: true, onWin: hollisKilled }) },
        { label: 'back away slowly', fn: () => { log('You leave him to his clearing. The thefts will go on.'); closeModal(); } },
      ],
    });
  }

  function hollisPeace() {
    S.flags.hollisDone = 1;
    S.flags.ally = 1;
    S.flags.summitKnown = 1;
    modal({
      art: ART.foe('hollis'), title: 'Thomas Hollis',
      text: [
        'He eats like a starving dog, then weeps like a child. His name is Thomas Hollis. He was cabin boy on the <i>Calliope</i>, fourteen years old when she struck. He buried the others one by one, until there was no one left to bury him.',
        '<p class="quote">"The ships," he says. "I\'ve seen \'em, from the high rock, when the trades turn. I lit fires. They never came. Too small, my fires." He looks at you. "Two of us could make a bigger one."</p>',
        `<p class="gain">He gives you ${gain({ hide: 3, rope: 4 })}, and shows you the way to the summit.</p>`,
      ],
      choices: [{ label: 'walk back together', fn: () => { log('Hollis comes back to the beach with you. He does not say much, but he works, and he keeps the fire.', 'lore'); closeModal(); } }],
    });
  }

  function hollisKilled() {
    S.flags.hollisDone = 1;
    S.flags.killedHollis = 1;
    modal({
      art: ART.scene('hut'), title: 'The Hut',
      text: [
        'He falls, and does not rise. In the hut you find his stores: hides, cord, smoked meat, a cabin boy\'s brass buttons strung on a thread.',
        'Scratched into the doorpost, row upon row upon row, are notches. Thousands of them.',
        `<p class="gain">You take ${gain({ hide: 4, rope: 5, food: 4 })}.</p>`,
      ],
      choices: [{ label: 'return to camp', fn: () => { log('You do not sleep well that night.', 'lore'); closeModal(); } }],
    });
  }

  function expedition(id) {
    const L = LOCS[id];
    if (!L) return;
    const why = L.blocked && L.blocked();
    if (why) { log(`${L.name}: ${why}.`); return; }
    if (!has(L.cost)) { log(`You lack the supplies for that journey: ${costText(L.cost)}.`); return; }
    pay(L.cost);
    sfx('step');
    const s0 = S;
    modal({ art: ART.scene(L.art), title: L.name, text: [`You set out for ${L.name.toLowerCase()}…`], choices: [] });
    const bar = el('div', 'travel', '<div></div>');
    bar.firstChild.style.animationDuration = `${L.time}s`;
    $('#modal-choices').appendChild(bar);
    const steps = setInterval(() => sfx('step'), 650);
    setTimeout(() => {
      clearInterval(steps);
      if (S !== s0 || S.ended) return;
      S.visits[id] = (S.visits[id] || 0) + 1;
      if (S.visits[id] === 1) L.first();
      else L.repeat();
      save();
      render();
    }, L.time * 1000);
  }

  /* ---------------- days and nights ---------------- */

  const DAWNS = [
    'Grey light over grey water.', 'The gulls wake before you.', 'You cut another notch in the palm by the fire.',
    'Dawn, and the same empty horizon.', 'The tide is out. The sand is cold.', 'A pink sky. Sailors would call it a warning.',
  ];

  function dawn() {
    sfx('bell');
    let hurt = 0;
    const lack = [];
    if (S.res.water > 0) S.res.water--; else { hurt += 2; lack.push('Your tongue is thick with thirst.'); }
    if (S.res.food > 0) S.res.food--; else { hurt += 2; lack.push('Hunger gnaws at you.'); }
    log(`Day ${S.day}. ${pick(DAWNS)}`);
    lack.forEach((m) => log(m, 'warn'));
    if (hurt) damage(hurt, 'thirst');
    else heal(S.built.leanto ? 2 : 1);
    if (S.ended) return;
    if (S.built.pyre && !S.flags.sailing) {
      S.n.pyreDays++;
      if (!document.querySelector('#modal:not(.hidden)') && chance(0.15 + S.n.pyreDays * 0.15)) sailSighted();
    }
  }

  function nightfall() {
    log(pick(['Night falls quickly in these latitudes.', 'The sun drops into the sea. Darkness.', 'Night. The stars are strange here.']));
    if (S.fire === 0) {
      if (!S.built.leanto) {
        log('The cold finds you in the dark.', 'warn');
        damage(1, 'cold');
      } else log('You huddle under the lean-to. The night is long without a fire.');
    }
    if (S.ended) return;
    if (S.flags.footprints && !S.flags.hollisDone) {
      if (S.fire >= 3) log('Beyond the firelight, two eyes catch the glow — and are gone.', 'lore');
      else if (S.res.food > 0) {
        const n = Math.max(1, Math.ceil(S.res.food * 0.25));
        S.res.food -= n;
        log(`Something has been at your stores in the night. ${n} provisions gone.`, 'warn');
      }
    }
  }

  function sailSighted() {
    sfx('sail');
    modal({
      art: ART.scene('summit', { ship: 1, pyre: 1 }), title: 'A Sail!',
      text: [
        S.flags.ally ? 'Hollis comes running down the headland, shouting, waving his arms like a madman.' : 'From the headland you see it, and do not believe it, and look again.',
        'A fleck of white on the northern horizon. A ship, beating south under topsails, five miles off and passing.',
      ],
      choices: [
        { label: 'light the pyre!', fn: rescueEnding },
        { label: 'let her pass', fn: () => { S.n.pyreDays = 0; log('The sail drops below the horizon. You chose this.', 'lore'); closeModal(); } },
      ],
    });
  }

  /* ---------------- endings ---------------- */

  function epilogue() {
    const lines = [];
    if (S.flags.ally) lines.push('Tom Hollis stands at the rail long after the island has sunk from sight. You do not disturb him.');
    if (S.flags.killedHollis) lines.push('You never speak of the man in the jungle. But you count the notches, some nights, when you cannot sleep.');
    if (S.flags.buried) lines.push('Captain Hale\'s journal you send to his widow in Liverpool, if she still lives. You never learn whether it reaches her.');
    lines.push('In Valparaíso, months later, you give your testimony before the British consul. The <i>Meridian</i> was taken off Callao; Mr Crane hanged. You are asked if you have anything to add. You think of the surf, the fire, the long nights. "No," you say. "Nothing."');
    lines.push(`<p class="gain">${S.day} days upon the island.</p>`);
    return lines;
  }

  function finish(art, title, text) {
    S.ended = true;
    clearSave();
    AU.setMood('ending');
    AU.setFire(0);
    modal({ art, title, text, choices: [{ label: 'begin again', fn: () => { closeModal(); toTitle(); } }] });
  }

  function rescueEnding() {
    sfx('fire');
    modal({
      art: ART.scene('summit', { ship: 1, pyre: 1, lit: 1 }), title: 'The Pyre',
      text: [
        'You run. Up the scree, up the chimney, lungs on fire, and put a brand to the pyre. It goes up with a roar you feel in your teeth: a pillar of smoke a mile high.',
        'For an hour the ship holds her course. Then, slowly, she comes about.',
      ],
      choices: [{
        label: 'go down to the beach',
        fn: () => finish(ART.scene('rescue'), 'Rescue', [
          'She is the whaler <i>Perseverance</i>, of New Bedford, three years out. Her master, a lean Nantucket Quaker named Eli Swain, hears your story without a word, and then says only: "Thee had better come aboard."',
        ].concat(epilogue(), ['<p class="dateline">THE END</p>'])),
      }],
    });
  }

  function launch() {
    if (!has(LAUNCH_COST)) return;
    pay(LAUNCH_COST);
    S.flags.sailing = 1;
    sfx('splash');
    modal({
      art: ART.scene('raft'), title: 'Put to Sea',
      text: [
        `You and the raft go down to the water at the top of the tide${S.flags.ally ? ', Hollis pushing beside you, laughing like a boy' : ''}. The surf lifts you, drops you, lifts you — and then you are over the bar and the sail fills.`,
        'The island falls behind: green, then grey, then gone. The raft rides better than you dared to hope.',
      ],
      choices: [{ label: 'sail on', fn: storm }],
    });
  }

  function storm() {
    modal({
      art: ART.scene('storm'), title: 'The Fourth Day',
      text: ['The western sky turns the colour of a bruise. By noon the swells are taller than the mast, and the raft climbs each one like a cart on a hill and plunges down the far side.'],
      choices: [
        { label: 'lash yourself to the mast', fn: () => { sfx('hurt'); damage(3, 'storm'); if (!S.ended) afterStorm('The sea beats you black and blue through the night, but the raft holds, and so do you.'); } },
        { label: 'cut the sail loose', fn: () => { add('food', -4); add('water', -2); afterStorm('The sail goes whirling away into the dark, and the raft rides easier. You will be slower now, and hungrier.'); } },
      ],
    });
  }

  function afterStorm(text) {
    modal({
      art: ART.scene('raft'), title: 'Calm',
      text: [text, 'Dawn comes up pale and still. Something grey moves beneath the logs.'],
      choices: [{ label: 'take up your weapon', fn: () => fight('shark', { canFlee: false, ally: S.flags.ally, onWin: landfall }) }],
    });
  }

  function landfall() {
    finish(ART.scene('landfall'), 'Landfall', [
      'On the eleventh day, gulls. Then a smudge on the horizon that does not move as clouds move.',
      'The people of the island wade out to meet you, laughing, and haul the raft up through the surf. You are in the Society Islands, they tell you, in a mixture of French, English and signs. A mission schooner calls at Papeete within the month.',
    ].concat(epilogue(), ['<p class="dateline">THE END</p>']));
  }

  function die(cause) {
    if (S.ended) return;
    S.health = 0;
    S.ended = true;
    clearSave();
    AU.setMood('silent');
    AU.setFire(0);
    sfx('death');
    const why = {
      thirst: 'Thirst and hunger did what the mutineers would not. Your bones whiten above the tide line beside a fire long gone out.',
      cold: 'The night was long, and cold, and in the end it was enough.',
      fall: 'A fall from a palm. Such a small thing, after all the sea had done.',
      storm: 'The storm took the raft, and you with it. The sea keeps what it is given.',
    }[cause] || `You fell to ${cause}. The island is patient; it was always going to win.`;
    modal({
      art: ART.scene('grave'), title: 'Here Lies a Sailor',
      text: [why, `<p class="gain">You survived ${S.day} day${S.day === 1 ? '' : 's'} upon the island.</p>`],
      choices: [{ label: 'begin again', fn: () => { closeModal(); toTitle(); } }],
    });
  }

  /* ---------------- modal ---------------- */

  function modal(o) {
    $('#modal').classList.remove('hidden');
    $('#modal-art').innerHTML = o.art || '';
    $('#modal-title').innerHTML = o.title ? `<span>${o.title}</span>` : '';
    $('#modal-body').innerHTML = (o.text || []).map((p) => (p.startsWith('<p') ? p : `<p>${p}</p>`)).join('');
    const c = $('#modal-choices');
    c.innerHTML = '';
    (o.choices || []).forEach((ch) => {
      const b = el('button', 'btn', `<span>${ch.label}</span>${ch.cost ? `<span class="cost">${costText(ch.cost)}</span>` : ''}`);
      if (ch.cost && !has(ch.cost)) b.disabled = true;
      b.onclick = () => {
        sfx('click');
        if (ch.cost) {
          if (!has(ch.cost)) return;
          pay(ch.cost);
        }
        ch.fn();
        render();
      };
      c.appendChild(b);
    });
    $('#modal').scrollTop = 0;
    const first = c.querySelector('button:not(:disabled)');
    if (first) first.focus({ preventScroll: true });
  }

  function closeModal() {
    $('#modal').classList.add('hidden');
    AU.setMood('calm');
    save();
    render();
  }

  /* ---------------- rendering ---------------- */

  function startCooldown(btn, secs) {
    btn.classList.add('cooling');
    const cd = btn.querySelector('.cd');
    cd.style.animation = 'none';
    void cd.offsetWidth;
    cd.style.animation = '';
    cd.style.animationDuration = `${secs}s`;
  }

  // Buttons are kept and reused between renders so clicks and cooldowns aren't interrupted.
  const BTNS = new Map();
  function button(key, label, cost, enabled, onClick, title) {
    let b = BTNS.get(key);
    if (!b) {
      b = el('button', 'btn', '<span class="lbl"></span><span class="cost"></span><span class="cd"></span>');
      b.dataset.key = key;
      b.addEventListener('click', () => { if (!b.disabled) b._click(); });
      BTNS.set(key, b);
    }
    b._click = onClick;
    const lbl = b.querySelector('.lbl');
    if (lbl.textContent !== label) lbl.textContent = label;
    const ct = cost || '';
    const costEl = b.querySelector('.cost');
    if (costEl.textContent !== ct) costEl.textContent = ct;
    costEl.style.display = ct ? '' : 'none';
    const cooling = cooldowns[key] && cooldowns[key] > performance.now();
    if (!cooling && b.classList.contains('cooling')) b.classList.remove('cooling');
    b.disabled = cooling || !enabled;
    b.title = title || '';
    return b;
  }

  function fill(container, nodes) {
    const cur = Array.from(container.children);
    if (cur.length === nodes.length && cur.every((n, i) => n === nodes[i])) return;
    container.replaceChildren(...nodes);
  }

  function section(key, title, note) {
    let s = BTNS.get(`sec:${key}`);
    if (!s) {
      s = el('div', 'section', `<h3>${title}</h3>${note ? `<p class="note">${note}</p>` : ''}<div class="btn-row"></div>`);
      BTNS.set(`sec:${key}`, s);
    }
    return s;
  }

  function doAction(a) {
    if (a.cost && !has(a.cost)) return;
    if (a.cost) pay(a.cost);
    cooldowns[a.id] = performance.now() + a.cd * 1000;
    const b = BTNS.get(a.id);
    startCooldown(b, a.cd);
    setTimeout(render, a.cd * 1000 + 30);
    a.run();
    render();
  }

  function renderPanel() {
    const panel = $('#panel');
    const secs = [];
    if (tab === 'beach') {
      const camp = section('camp', 'The Beach');
      fill(camp.querySelector('.btn-row'), ACTIONS.filter((a) => a.show()).map((a) =>
        button(a.id, a.label, a.cost ? costText(a.cost) : '', (!a.cost || has(a.cost)) && (!a.enabled || a.enabled()), () => doAction(a))));
      secs.push(camp);
      const recipes = RECIPES.filter((rc) => rc.show() && !(rc.item && S.items[rc.item]) && !(rc.max && (S.built[rc.id] || 0) >= rc.max));
      if (recipes.length) {
        const mk = section('make', 'Make');
        fill(mk.querySelector('.btn-row'), recipes.map((rc) => {
          const count = rc.max > 1 ? ` (${S.built[rc.id] || 0}/${rc.max})` : '';
          return button(`mk:${rc.id}`, rc.label + count, costText(rc.cost), has(rc.cost), () => { make(rc); render(); });
        }));
        secs.push(mk);
      }
    } else if (tab === 'chart') {
      const sec = section('chart', 'The Island', 'Choose a destination on the chart. Each journey costs supplies.');
      fill(sec.querySelector('.btn-row'), knownLocs().map((l) => {
        const L = LOCS[l.id];
        const why = L.blocked && L.blocked();
        const sub = why || costText(L.cost) + (S.visits[l.id] ? ` · visited ${S.visits[l.id]}×` : '');
        return button(`loc:${l.id}`, L.name, sub, !why && has(L.cost), () => expedition(l.id), why || '');
      }));
      secs.push(sec);
    } else if (tab === 'raft') {
      const sec = section('raft', 'The Raft', 'Built from the Calliope\'s bones, to carry you over the horizon.');
      const nodes = RAFT.filter((p) => !S.raft[p.id]).map((p) => {
        const ready = !p.needs || S.raft[p.needs];
        return button(`raft:${p.id}`, p.label, ready ? costText(p.cost) : `first: ${RAFT.find((q) => q.id === p.needs).label}`, ready && has(p.cost), () => { buildRaft(p); render(); }, p.note);
      });
      if (RAFT.every((p) => S.raft[p.id])) {
        nodes.push(button('launch', 'put to sea', `${costText(LAUNCH_COST)} · there is no coming back`, has(LAUNCH_COST), launch));
      }
      fill(sec.querySelector('.btn-row'), nodes);
      secs.push(sec);
    }
    fill(panel, secs);
  }

  function knownLocs() {
    return Object.keys(LOCS).filter((id) => LOCS[id].known()).map((id) => ({
      id, name: LOCS[id].name, x: LOCS[id].x, y: LOCS[id].y, visited: !!S.visits[id], blocked: !!(LOCS[id].blocked && LOCS[id].blocked()),
    }));
  }

  function renderTabs() {
    const tabs = [['beach', 'The Beach']];
    if (S.flags.chart) tabs.push(['chart', 'The Chart']);
    if (S.flags.raftPlans) tabs.push(['raft', 'The Raft']);
    const nav = $('#tabs');
    if (tabs.length < 2) { nav.innerHTML = ''; return; }
    const key = tabs.map((t) => t[0]).join() + tab + Object.keys(seenTabs).join();
    if (nav.dataset.key === key) return;
    nav.dataset.key = key;
    nav.innerHTML = '';
    tabs.forEach(([id, name]) => {
      const b = el('button', (id === tab ? 'on' : '') + (seenTabs[id] ? '' : ' new'), name);
      b.onclick = () => { sfx('page'); tab = id; seenTabs[id] = true; render(); };
      nav.appendChild(b);
    });
  }

  function renderScene() {
    let key;
    let html;
    if (tab === 'chart') {
      const locs = knownLocs();
      key = 'chart' + JSON.stringify(locs);
      if (key !== sceneKey) html = ART.chart(locs, CAMP_POS);
    } else {
      const st = {
        night: isNight(), fire: S.fire, leanto: S.built.leanto, catcher: S.built.catcher || 0, trap: S.built.trap || 0,
        rack: S.built.rack, raft: S.raft, raftStarted: S.flags.raftPlans && Object.keys(S.raft).length > 0, ally: S.flags.ally,
      };
      key = 'camp' + JSON.stringify(st);
      if (key !== sceneKey) html = ART.camp(st);
    }
    if (key === sceneKey) return;
    sceneKey = key;
    $('#scene').innerHTML = html;
  }

  function renderStatus() {
    const phase = S.t < 12 ? 'dawn' : S.t < 40 ? 'morning' : S.t < 70 ? 'afternoon' : S.t < NIGHT_AT ? 'dusk' : 'night';
    $('#clock').textContent = `Day ${S.day}, ${phase}`;
    const hp = Math.max(0, S.health);
    const mh = maxHealth();
    $('#status').innerHTML =
      `<div class="stat"><h3>Condition</h3>health ${hp} / ${mh}<div class="meter${hp <= 3 ? ' low' : ''}"><i style="width:${(hp / mh) * 100}%"></i></div></div>` +
      (S.flags.fireLit ? `<div class="stat">the fire is ${FIRE_NAMES[S.fire]}<div class="meter"><i style="width:${S.fire * 25}%"></i></div></div>` : '');
  }

  function renderStores() {
    const rows = RES_ORDER.filter((k) => S.seen[k]).map((k) => {
      const warn = (k === 'water' || k === 'food') && !S.res[k] ? ' <span class="sub">none!</span>' : '';
      return `<li class="${bumps[k] ? 'bump' : ''}"><span>${RES[k]}${warn}</span><span>${S.res[k] || 0}</span></li>`;
    });
    Object.keys(bumps).forEach((k) => delete bumps[k]);
    const items = Object.keys(ITEMS).filter((k) => S.items[k]).map((k) => `<li><span>${ITEMS[k][0]}</span><span class="sub">${ITEMS[k][1]}</span></li>`);
    const built = [];
    if (S.built.leanto) built.push('<li><span>lean-to</span></li>');
    if (S.built.catcher) built.push(`<li><span>rain catchers</span><span>${S.built.catcher}</span></li>`);
    if (S.built.trap) built.push(`<li><span>fish weirs</span><span>${S.built.trap}</span></li>`);
    if (S.built.rack) built.push('<li><span>smoking rack</span></li>');
    if (S.built.pyre) built.push('<li><span>signal pyre</span><span class="sub">on the summit</span></li>');
    if (S.flags.ally) built.push('<li><span>Tom Hollis</span><span class="sub">companion</span></li>');
    $('#stores').innerHTML = `<h3>Stores</h3><ul class="rows">${rows.join('')}</ul>` +
      `<h3>Possessions</h3><ul class="rows">${items.join('')}</ul>` +
      (built.length ? `<h3>Camp</h3><ul class="rows">${built.join('')}</ul>` : '');
  }

  function renderLog() {
    $('#log').innerHTML = S.log.map((e, i) => `<p class="${e.c}" style="opacity:${Math.max(0.18, 1 - i * 0.07).toFixed(2)}">${e.m}</p>`).join('');
  }

  function render() {
    if (!S || !running) return;
    renderTabs();
    renderScene();
    renderPanel();
    renderStatus();
    renderStores();
  }

  /* ---------------- the clock ---------------- */

  function tick() {
    if (!S || !running || S.ended) return;
    S.t++;
    if (S.fire > 0 && ++S.fireT >= FIRE_DECAY) {
      if (S.flags.ally && S.fire <= 2) {
        S.fireT = 0;
        if (S.res.wood > 0 && S.fire < 2) { S.res.wood--; setFire(S.fire + 1, true); }
      } else setFire(S.fire - 1);
    }
    if (S.built.catcher && ++S.ticks.catcher >= 30) { S.ticks.catcher = 0; add('water', S.built.catcher); }
    if (S.built.trap && ++S.ticks.trap >= 40) { S.ticks.trap = 0; add('food', S.built.trap * (S.built.rack ? 2 : 1)); }
    if (S.flags.ally && ++S.ticks.ally >= 30) { S.ticks.ally = 0; add('wood', 2); add('fibre', 1); }
    if (S.t === NIGHT_AT) nightfall();
    if (S.t >= DAY_LEN) {
      S.t = 0;
      S.day++;
      dawn();
    }
    if (S.t % 5 === 0) save();
    render();
  }

  /* ---------------- screens ---------------- */

  const INTRO = [
    '<p class="dateline">The South Pacific. The Year of Our Lord 1846.</p>',
    'You were bosun\'s mate aboard the barque <i>Meridian</i>, eleven months out of Bristol, carrying iron for Valparaíso and a captain whose temper was harder than his cargo.',
    'When the crew rose against Captain Ashby, you would not stand with them. Nor would you stand against them. Mr Crane, the first mate, said that a man who would choose no side might have an island all to himself.',
    'They rowed you ashore at first light, as the old custom demands: a flintlock with a single ball, a flask of water, a tin of ship\'s biscuit — and the Bible, so that you might make your peace.',
    'The <i>Meridian</i>\'s sails grow small against the sun. Behind you the island waits, green and silent. The tide is coming in.',
  ];

  function show(id) {
    ['#title-screen', '#intro', '#game'].forEach((s) => $(s).classList.toggle('hidden', s !== id));
    window.scrollTo(0, 0);
  }

  function toTitle() {
    running = false;
    S = null;
    AU.setMood('calm');
    $('#btn-continue').classList.toggle('hidden', !load());
    show('#title-screen');
  }

  function playIntro() {
    let i = 0;
    const box = $('#intro-text');
    box.innerHTML = '';
    show('#intro');
    const next = $('#btn-intro-next');
    const step = () => {
      if (i >= INTRO.length) { startGame(); return; }
      sfx('page');
      const p = INTRO[i];
      box.insertAdjacentHTML('beforeend', p.startsWith('<p') ? p : `<p>${p}</p>`);
      i++;
      next.querySelector('span').textContent = i >= INTRO.length ? 'wake' : '…';
    };
    next.onclick = step;
    $('#btn-intro-skip').onclick = startGame;
    step();
  }

  function startGame() {
    S = fresh();
    log('You wake on wet sand. The tide has reached your boots.');
    log('The <i>Meridian</i> is gone.', 'lore');
    log('It will be cold when the sun goes down. You will want a fire.');
    enterGame();
  }

  function enterGame() {
    tab = 'beach';
    seenTabs = { beach: true, chart: !!S.flags.chart, raft: !!S.flags.raftPlans };
    sceneKey = '';
    BTNS.clear();
    $('#panel').innerHTML = '';
    show('#game');
    running = true;
    AU.setFire(S.fire);
    AU.setMood('calm');
    renderLog();
    render();
    save();
  }

  /* ---------------- visual styles ---------------- */

  const STY = window.DWStyles;

  function openStyles() {
    modal({
      art: ART.camp({ night: false, fire: 3, leanto: 1, catcher: 1, trap: 1 }),
      title: 'Visual Style',
      text: ['Choose how the island is drawn. The change takes effect at once.'],
      choices: [{ label: 'done', fn: closeModal }],
    });
    const grid = el('div', 'styles');
    STY.list.forEach((st) => {
      const b = el('button', `btn${st.id === STY.current ? ' on' : ''}`,
        `<span>${st.name}</span><span class="cost">${st.desc}</span>` +
        `<span class="swatch"><i style="background:${st.paper}"></i><i style="background:${st.ink}"></i></span>`);
      b.setAttribute('aria-pressed', st.id === STY.current);
      b.onclick = () => {
        sfx('click');
        STY.apply(st.id);
        $('#title-art').innerHTML = ART.scene('title');
        sceneKey = '';
        render();
        openStyles();
        const on = $('.styles .btn.on');
        if (on) on.focus({ preventScroll: true });
      };
      grid.appendChild(b);
    });
    $('#modal-choices').prepend(grid);
  }

  function syncToggles() {
    $('#tgl-music').textContent = `music: ${AU.music() ? 'on' : 'off'}`;
    $('#tgl-sfx').textContent = `sound: ${AU.sound() ? 'on' : 'off'}`;
  }

  function boot() {
    ART.install($('#defs'));
    $('#title-art').innerHTML = ART.scene('title');
    $('#btn-continue').classList.toggle('hidden', !load());
    $('#btn-new').onclick = () => {
      AU.init();
      if (load()) {
        modal({
          title: 'Begin Again?', text: ['A castaway is already stranded on this island. Starting anew will forget them.'],
          choices: [
            { label: 'begin anew', fn: () => { clearSave(); closeModal(); playIntro(); } },
            { label: 'never mind', fn: () => $('#modal').classList.add('hidden') },
          ],
        });
        return;
      }
      playIntro();
    };
    $('#btn-continue').onclick = () => {
      AU.init();
      S = load();
      if (!S) return;
      log('You return to the island. It has not forgotten you.');
      enterGame();
    };
    $('#btn-style').onclick = openStyles;
    $('#btn-style-title').onclick = openStyles;
    $('#tgl-music').onclick = () => { AU.toggleMusic(); syncToggles(); };
    $('#tgl-sfx').onclick = () => { AU.toggleSfx(); syncToggles(); };
    $('#btn-restart').onclick = () => modal({
      title: 'Abandon This Life?', text: ['Your progress will be lost, and the tale begun anew.'],
      choices: [
        { label: 'begin again', fn: () => { clearSave(); S.ended = true; closeModal(); toTitle(); } },
        { label: 'stay', fn: closeModal },
      ],
    });
    $('#scene').addEventListener('click', (e) => {
      const g = e.target.closest('.loc');
      if (g) expedition(g.dataset.loc);
    });
    $('#scene').addEventListener('keydown', (e) => {
      const g = e.target.closest('.loc');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); expedition(g.dataset.loc); }
    });
    document.addEventListener('pointerdown', () => AU.init(), { once: true });
    window.addEventListener('beforeunload', save);
    syncToggles();
    setInterval(tick, 1000);
  }

  boot();
})();
