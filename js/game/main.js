/* Driftwood — screens and start-up.
 * The title screen, the opening, starting and continuing a game, the
 * visual-style picker, and wiring up the page's controls. Loads last. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const STY = window.DW.styles;
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
    $('#carried').classList.toggle('hidden', !G.carried());
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
    log(G.atHome() ? 'You return to the island. It has not forgotten you.' : 'You return to the islet. The wind has not changed its mind.');
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
          G.achieve('abandon');
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
    ['Survive', 'Gather driftwood and light a fire before night falls, then keep it fed. Each dawn you eat a share of your provisions and drink some fresh water; go without, and your health suffers. Fresh food will not keep in the heat for long unless it is smoked.'],
    ['Make', 'Comb the beach for what the tide brings in. Twist fibre into rope, and make shelter, tools and traps from the <i>Make</i> list. A button greys out while you rest from the last job.'],
    ['Explore', 'Before long you will draw a map. Explore the island to find places to put on it: the story tells you what to look for, a fruitless trip may still bring back a clue, and some places you may spot from somewhere else. Every trip costs supplies, and after dark you will need a torch to see your way. Some places can only be reached when the tide is out.'],
    ['Fight', 'Fights are turn based, and can be long. Strike, eat to heal, or flee. When a foe gathers itself for a heavy blow, brace yourself to turn it aside. Once you carry a blade, the island\'s creatures will start to come for you.'],
    ['Escape', 'There is more than one way off the island, and some of the choices you make along the way will follow you home.'],
    ['Sail', 'In time you may have a boat that will carry you between islands. She runs before the wind: see which way it blows before you choose a passage, and carry water for every day at sea. Load her with what you will need, no more than she will carry; the rest stays at the camp. A camp left to itself suffers; a camp somebody keeps does not.'],
    ['Time', 'Time passes while you play, and stands still while a notice is open, or while you pause the game (press P, or pause at the top). Your progress is saved in this browser.'],
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

  /** What changed in each release, newest first, as headed paragraphs. */
  const NEWS = [
    {
      date: '21 October 2026',
      items: [
        ['Chapter Two', 'The raft was never going to get you home. Where she does get you is the beginning of a second chapter: an archipelago of islands nobody could see from the summit, a chart of them, and a patched boat that only runs before the wind.'],
        ['The wind', 'The trades, a westerly, or a flat calm, shifting every dawn. Fit your boat with leeboards, casks and an outrigger to go further, and in more weathers.'],
        ['Loading', 'Before you put to sea, choose what to take aboard, up to what your boat will carry. Everything else stays at the camp, and will be there when you get back, less what the gulls have had.'],
        ['Five islands', 'An islet, a high island with a stream and an old camp on it, a rock of ten thousand birds, a sandbar, and, far to the south, an island where fires burn at night. The three biggest have charts of their own, and places to find on them, just as your own island does.'],
        ['Who keeps the fire', 'Leave the camp, and Hollis can come with you or keep it. A camp nobody keeps is a camp the gulls have.'],
        ['A deserter', 'Somebody is hiding out among the islands. If you can coax him out, he has a story to tell, one evening at a time.'],
        ['The canoe people', 'They still come back, once a moon, to the old stone platform. How they receive you depends on what you have done.'],
        ['The Meridian', 'She still comes back. But she no longer stops.'],
        ['What the tide brings', 'In the first days on the island, the sea may give back something of the <i>Meridian</i>\'s that you would rather it had kept. And the captain\'s Bible has an inscription you may not have read.'],
        ['Pause', 'Press P, or pause at the top of the screen, and time on the island stands still until you come back.'],
        ['Bound for Valparaíso', 'The second chapter ends aboard a whaler. A castaway who sails in her is kept for the third chapter, which is still to be written.'],
      ],
    },
    {
      date: '20 October 2026',
      items: [
        ['Achievements', 'Deeds, feats, follies and a good many secrets, kept from one tale to the next. See which you have earned from the title screen, or from the top of the game.'],
      ],
    },
    {
      date: '19 October 2026',
      items: [
        ['The last castaway', 'Die on the island, and the next castaway may find your bones, with what you kept and the notches you cut. Take what they had, or bury them. Those lost at sea come back another way.'],
        ['Not every sail', 'Once, a sail from the summit may be the <i>Meridian</i> come back, with Mr Crane aboard. Study a ship before you light the pyre, if you dare to let a whaler slip away while you look.'],
        ['The old canoe', 'With an axe, gum and rope, the outrigger by the lagoon can be made to float again. She is quicker than a raft, and riskier, and she knows the way to an island with a mutiny of its own.'],
        ['Staying', 'Make your peace with the island, and in time you may choose not to leave it at all.'],
        ['A darker ending', 'There is another way off the island now, though not a happy one.'],
        ['Tides', 'The tide comes in and goes out twice a day, a little later each day. The wreck and the tide pools can only be reached at low water, and the ebb leaves shellfish on the beach.'],
        ['Spoilage', 'Fresh food goes bad in the heat. Keep a big store of provisions and some will spoil each dawn, unless you build a smoking rack.'],
        ['Ailments', 'A turned ankle or a fever now lingers for days. Rest by the fire once a day to mend faster.'],
        ['Tom Hollis', 'Once Hollis has joined you, set him to gather wood, fish the reef, or keep watch over the camp by night.'],
        ['The ship\'s log', 'Every tale you finish is written into a log on the title screen: how long each castaway lasted, how they ended, and how many endings are still to find.'],
      ],
    },
    {
      date: '18 October 2026',
      items: [
        ['Storms', 'Storms come in from the west and can tear the camp apart. Hold the camp, or retreat inland.'],
        ['Side stories', 'A light in the sea, and a carved figure best left where it was found.'],
        ['Exploring', 'Six minor places to find, clues to follow, and finds and misfortunes along the way. Keep watch from the summit once the pyre is built.'],
      ],
    },
  ];

  /** Opens the news of recent releases. */
  function openNews() {
    AU.sfx('page');
    const text = [];
    NEWS.forEach((r) => {
      text.push(`<p class="dateline">${r.date}</p>`);
      r.items.forEach(([head, body]) => text.push(`<p><b class="sc">${head}.</b> ${body}</p>`));
    });
    modal({ art: ART.scene('beach', { ball: 1 }), title: "What's New", text, choices: [leave('back')] });
  }

  /* ---------------- pausing ---------------- */

  /** Whether the pause card is the one showing. */
  let paused = false;

  /**
   * Pauses the game: a card over everything, so that, as with any card,
   * time stands still and nothing can be done until it is put away. Not
   * while another card is open, which has stopped the clock already.
   */
  function pause() {
    if (!session.running || G.modalOpen()) return;
    paused = true;
    AU.sfx('page');
    modal({
      art: ART.scene('night'),
      title: 'Paused',
      text: ['The island waits. The tide will not turn, nor the fire burn down, until you come back to it.'],
      choices: [{ label: 'resume', fn: resume }],
    });
  }

  /** Puts the pause card away, and time goes on. */
  function resume() {
    paused = false;
    closeModal();
  }

  /* ---------------- the ship's log ---------------- */

  /** A tale in the ship's log, e.g. "Day 14: killed by the boar", noting the chapter it reached past the first. */
  function taleLine(t) {
    const how = t.end === 'death'
      ? G.DEATH_NOTES[t.cause] || `killed by ${t.cause}`
      : (G.ENDINGS[t.end] ? G.ENDINGS[t.end][1] : G.RETIRED_ENDINGS[t.end]);
    const chapter = t.chapter ? `, ${G.CHAPTERS[t.chapter].toLowerCase()}` : '';
    return `<p><b class="sc">Day ${t.day}${chapter}.</b> ${G.cap(how)}.</p>`;
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
    G.styleSeen(id);
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

  /** Acts on a chart marker: a journey to a place on the island, or a passage to an island on the sea chart. */
  const go = (loc) => (loc.dataset.isle ? G.setSail(loc.dataset.isle) : expedition(loc.dataset.loc));

  /** Draws the title screen, wires up every control, and starts the clock. */
  function boot() {
    ART.install($('#defs'));
    $('#title-art').innerHTML = ART.scene('title');
    refreshContinue();
    G.styleSeen(STY.current);

    $('#btn-new').onclick = newGame;
    $('#btn-continue').onclick = continueGame;
    $('#btn-style').onclick = openStyles;
    $('#btn-style-title').onclick = openStyles;
    $('#btn-help').onclick = openHelp;
    $('#btn-news').onclick = openNews;
    $('#btn-records').onclick = openRecords;
    $('#btn-achievements').onclick = G.openAchievements;
    $('#btn-achievements-game').onclick = G.openAchievements;
    $('#btn-restart').onclick = restart;
    $('#btn-pause').onclick = pause;
    // P pauses, and P again resumes; not while typing anywhere
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'p' && e.key !== 'P') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea')) return;
      if (paused) resume();
      else pause();
    });
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
      if (loc) go(loc);
    });
    $('#scene').addEventListener('keydown', (e) => {
      const loc = locationOf(e);
      if (loc && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        go(loc);
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
    setInterval(tick, 1000);
  }

  boot();
})();
