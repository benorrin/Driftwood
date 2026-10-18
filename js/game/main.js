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

  /** Offers "continue" on the title screen only when there is a saved game. */
  function refreshContinue() {
    $('#btn-continue').classList.toggle('hidden', !load());
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
    ['Fight', 'Fights are turn based. Strike, eat to heal, or flee. When a foe gathers itself for a heavy blow, brace yourself to turn it aside.'],
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
    $('#btn-restart').onclick = restart;
    $('#tgl-music').onclick = () => {
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

    document.addEventListener('pointerdown', () => AU.init(), { once: true });
    window.addEventListener('beforeunload', save);
    syncToggles();
    setInterval(tick, 1000);
  }

  boot();
})();
