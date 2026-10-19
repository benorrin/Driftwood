/* Driftwood — screens and start-up.
 * The title screen, the opening, starting and continuing a game, the
 * visual-style picker, and wiring up the page's controls. Loads last. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const STY = window.DW.styles;
  const storage = window.DW.storage;
  const {
    S, $, el, paragraph, INTRO, BTNS, view, session,
    freshState, replaceState, log, save, load, clearSave,
    modal, closeModal, leave, confirm, render, renderLog, expedition, tick,
  } = G;

  const SCREENS = ['#title-screen', '#intro', '#game'];

  /** Shows the screen `id`, hiding the others. */
  function show(id) {
    SCREENS.forEach((s) => $(s).classList.toggle('hidden', s !== id));
    window.scrollTo(0, 0);
  }

  /** Offers "continue" only when there is a saved game, and the ship's log once a tale has ended. */
  function refreshContinue() {
    $('#btn-continue').classList.toggle('hidden', !load());
    $('#btn-records').classList.toggle('hidden', !G.records().tales);
  }

  /** Stops the game and returns to the title screen. */
  G.toTitle = function () {
    session.running = false;
    AU.setMood('calm');
    refreshContinue();
    show('#title-screen');
  };

  /** Plays the opening one paragraph per click, then wakes the castaway on the beach. */
  function playIntro() {
    let i = 0;
    const box = $('#intro-text');
    box.innerHTML = '';
    show('#intro');
    const next = $('#btn-intro-next');
    const step = () => {
      if (i >= INTRO.length) {
        startGame();
        return;
      }
      AU.sfx('page');
      box.insertAdjacentHTML('beforeend', paragraph(INTRO[i]));
      i++;
      next.querySelector('span').textContent = i >= INTRO.length ? 'wake' : '…';
    };
    next.onclick = step;
    $('#btn-intro-skip').onclick = startGame;
    step();
  }

  /** Begins a new game; the first lines of the log arrive once the beach is in view. */
  function startGame() {
    replaceState(freshState());
    enterGame();
    log('Day 1', 'day');
    log('You wake on wet sand. The tide has reached your boots.');
    log('The <i>Meridian</i> is gone.', 'lore');
    log('It will be cold when the sun goes down. You will want a fire.');
  }

  /** Continues the saved game, if there is one. */
  function continueGame() {
    AU.init();
    const saved = load();
    if (!saved) return;
    replaceState(saved);
    enterGame();
    log('You return to the island. It has not forgotten you.');
  }

  /** Shows the game screen for the current state, with fresh buttons and sounds to match. */
  function enterGame() {
    G.clearQueue();
    view.tab = 'beach';
    view.seenTabs = { beach: true, chart: !!S.flags.chart, raft: !!S.flags.raftPlans };
    view.sceneKey = '';
    BTNS.clear();
    $('#panel').innerHTML = '';
    show('#game');
    session.running = true;
    AU.setFire(S.fire);
    AU.setMood('calm');
    renderLog(true);
    render();
    save();
  }

  /** Starts a new game, first asking before overwriting a saved one. */
  function newGame() {
    AU.init();
    if (!load()) {
      playIntro();
      return;
    }
    confirm(
      'Begin Again?',
      'A castaway is already stranded on this island. Starting anew will forget them.',
      {
        label: 'begin anew',
        fn: () => {
          clearSave();
          closeModal();
          playIntro();
        },
      },
      { label: 'never mind', fn: () => $('#modal').classList.add('hidden') },
    );
  }

  /** Asks before abandoning the game in progress. */
  function restart() {
    confirm(
      'Abandon This Life?',
      'Your progress will be lost, and the tale begun anew.',
      {
        label: 'begin again',
        fn: () => {
          clearSave();
          S.ended = true;
          closeModal();
          G.toTitle();
        },
      },
      leave('stay'),
    );
  }

  /* ---------------- how to play ---------------- */

  /** The rules, briefly, as headed paragraphs. */
  const HOW_TO_PLAY = [
    ['Survive', 'Gather driftwood and light a fire before night falls, then keep it fed. Each dawn you eat a share of your provisions and drink some fresh water; go without, and your health suffers.'],
    ['Make', 'Comb the beach for what the tide brings in. Twist fibre into rope, and make shelter, tools and traps from the <i>Make</i> list. A button greys out while you rest from the last job.'],
    ['Explore', 'Before long you will draw a map. Explore the island to find places to put on it: the story tells you what to look for, a fruitless trip may still bring back a clue, and some places you may spot from somewhere else. Every trip costs supplies, and after dark you will need a torch to see your way.'],
    ['Fight', 'Fights are turn based, and can be long. Strike, eat to heal, or flee. When a foe gathers itself for a heavy blow, brace yourself to turn it aside. Once you carry a blade, the island\'s creatures will start to come for you.'],
    ['Escape', 'There is more than one way off the island, and some of the choices you make along the way will follow you home.'],
    ['Time', 'Time passes while you play, and stands still while a notice is open. Your progress is saved in this browser.'],
  ];

  /** Opens the rules of the game. */
  function openHelp() {
    AU.sfx('page');
    modal({
      art: ART.scene('beach'),
      title: 'How to Play',
      text: HOW_TO_PLAY.map(([head, body]) => `<p><b class="sc">${head}.</b> ${body}</p>`),
      choices: [leave('back')],
    });
  }

  /* ---------------- what's new ---------------- */

  /** Where the newest release the player has read about is remembered. */
  const NEWS_KEY = 'driftwood-news';

  /**
   * Things stored only once someone has played, which mark a returning
   * player. The visual style is stored on every visit, so it can't.
   */
  const VISITED_KEYS = [G.SAVE_KEY, G.REMAINS_KEY, G.RECORDS_KEY, 'driftwood-audio'];

  /** What changed in each release, newest first, as headed paragraphs. */
  const NEWS = [
    {
      id: '2026-10-19',
      date: '19 October 2026',
      items: [
        ['The last castaway', 'Die on the island, and the next castaway may find your bones, with what you kept and the notches you cut. Take what they had, or bury them. Those lost at sea come back another way.'],
        ['Not every sail', 'Once, a sail from the summit may be the <i>Meridian</i> come back, with Mr Crane aboard. Study a ship before you light the pyre, if you dare to let a whaler slip away while you look.'],
        ['The old canoe', 'With an axe, gum and rope, the outrigger by the lagoon can be made to float again. She is quicker than a raft, and riskier, and she knows the way to an island with a mutiny of its own.'],
        ['Staying', 'Make your peace with the island, and in time you may choose not to leave it at all.'],
        ['A darker ending', 'There is another way off the island now, though not a happy one.'],
        ['Ailments', 'A turned ankle or a fever now lingers for days. Rest by the fire once a day to mend faster.'],
        ['Tom Hollis', 'Once Hollis has joined you, set him to gather wood, fish the reef, or keep watch over the camp by night.'],
        ['The ship\'s log', 'Every tale you finish is written into a log on the title screen: how long each castaway lasted, how they ended, and how many endings are still to find.'],
      ],
    },
    {
      id: '2026-10-18',
      date: '18 October 2026',
      items: [
        ['Storms', 'Storms come in from the west and can tear the camp apart. Hold the camp, or retreat inland.'],
        ['Side stories', 'A light in the sea, and a carved figure best left where it was found.'],
        ['Exploring', 'Six minor places to find, clues to follow, and finds and misfortunes along the way. Keep watch from the summit once the pyre is built.'],
      ],
    },
  ];

  /** Opens the news of recent releases, and remembers that it has been read. */
  function openNews() {
    AU.sfx('page');
    storage.set(NEWS_KEY, NEWS[0].id);
    const text = [];
    NEWS.forEach((r) => {
      text.push(`<p class="dateline">${r.date}</p>`);
      r.items.forEach(([head, body]) => text.push(`<p><b class="sc">${head}.</b> ${body}</p>`));
    });
    modal({ art: ART.scene('beach', { ball: 1 }), title: "What's New", text, choices: [leave('back')] });
  }

  /**
   * Shows the news once for each new release to a returning player. A first
   * visit has nothing to compare, so it is simply recorded as read.
   */
  function announceNews() {
    const seen = storage.get(NEWS_KEY);
    if (seen === NEWS[0].id) return;
    if (!seen && !VISITED_KEYS.some((k) => storage.get(k) != null)) {
      storage.set(NEWS_KEY, NEWS[0].id);
      return;
    }
    openNews();
  }

  /* ---------------- the ship's log ---------------- */

  /** A tale in the ship's log, e.g. "Day 14: killed by the boar". */
  function taleLine(t) {
    const how = t.end === 'death'
      ? G.DEATH_NOTES[t.cause] || `killed by ${t.cause}`
      : G.ENDINGS[t.end][1];
    return `<p><b class="sc">Day ${t.day}.</b> ${G.cap(how)}.</p>`;
  }

  /** Opens the record of every tale told in this browser, with the endings still to find hidden. */
  function openRecords() {
    AU.sfx('page');
    const r = G.records();
    const ends = Object.keys(G.ENDINGS);
    const found = ends.filter((id) => r.found[id]);
    const text = [
      `${r.tales} castaway${r.tales === 1 ? '' : 's'} put ashore. The longest lasted ${r.best} day${r.best === 1 ? '' : 's'}.`,
      `<p class="dateline">Endings found: ${found.length} of ${ends.length}</p>`,
      `<p class="endings">${ends.map((id) => (r.found[id] ? G.ENDINGS[id][0] : '? ? ?')).join(' &middot; ')}</p>`,
      '<p class="dateline">Lately</p>',
    ].concat(r.recent.map(taleLine));
    modal({ art: ART.scene('summit'), title: "The Ship's Log", text, choices: [leave('back')] });
  }

  /* ---------------- visual styles ---------------- */

  /** Applies style `id` and redraws every picture in the new palette. */
  function chooseStyle(id) {
    AU.sfx('click');
    STY.apply(id);
    $('#title-art').innerHTML = ART.scene('title');
    view.sceneKey = '';
    render();
    openStyles();
    const on = $('.styles .btn.on');
    if (on) on.focus({ preventScroll: true });
  }

  /** Opens the style picker: a button for each style, with a swatch of its two colours. */
  function openStyles() {
    modal({
      art: ART.camp({ night: false, fire: 3, leanto: 1, catcher: 1, trap: 1 }),
      title: 'Visual Style',
      text: ['Choose how the island is drawn. The change takes effect at once.'],
      choices: [leave('done')],
    });
    const grid = el('div', 'styles');
    STY.list.forEach((st) => {
      const current = st.id === STY.current;
      const b = el('button', `btn${current ? ' on' : ''}`,
        `<span>${st.name}</span><span class="cost">${st.desc}</span>` +
        `<span class="swatch"><i style="background:${st.paper}"></i><i style="background:${st.ink}"></i></span>`);
      b.setAttribute('aria-pressed', current);
      b.onclick = () => chooseStyle(st.id);
      grid.appendChild(b);
    });
    $('#modal-choices').prepend(grid);
  }

  /* ---------------- start-up ---------------- */

  /** Updates the music and sound toggles' labels. */
  function syncToggles() {
    $('#tgl-music').textContent = `music: ${AU.music() ? 'on' : 'off'}`;
    $('#tgl-music-title').textContent = `music: ${AU.music() ? 'on' : 'off'}`;
    $('#tgl-sfx').textContent = `sound: ${AU.sound() ? 'on' : 'off'}`;
  }

  /** The chart location a click or keypress landed on, if any. */
  const locationOf = (e) => e.target.closest('.loc');

  /** Draws the title screen, wires up every control, and starts the clock. */
  function boot() {
    ART.install($('#defs'));
    $('#title-art').innerHTML = ART.scene('title');
    refreshContinue();

    $('#btn-new').onclick = newGame;
    $('#btn-continue').onclick = continueGame;
    $('#btn-style').onclick = openStyles;
    $('#btn-style-title').onclick = openStyles;
    $('#btn-help').onclick = openHelp;
    $('#btn-news').onclick = openNews;
    $('#btn-records').onclick = openRecords;
    $('#btn-restart').onclick = restart;
    $('#tgl-music').onclick = $('#tgl-music-title').onclick = () => {
      AU.init();
      AU.toggleMusic();
      syncToggles();
    };
    $('#tgl-sfx').onclick = () => {
      AU.toggleSfx();
      syncToggles();
    };

    // the chart's location markers act as buttons
    $('#scene').addEventListener('click', (e) => {
      const loc = locationOf(e);
      if (loc) expedition(loc.dataset.loc);
    });
    $('#scene').addEventListener('keydown', (e) => {
      const loc = locationOf(e);
      if (loc && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        expedition(loc.dataset.loc);
      }
    });

    // Start the music on the title screen. Browsers that allow sound before the
    // player has interacted will play it at once; the rest start it at the
    // first click, tap or key press.
    AU.init();
    document.addEventListener('pointerdown', () => AU.init(), { once: true });
    document.addEventListener('keydown', () => AU.init(), { once: true });
    window.addEventListener('beforeunload', save);
    syncToggles();
    announceNews();
    setInterval(tick, 1000);
  }

  boot();
})();
