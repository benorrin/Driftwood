/* Driftwood — rendering.
 * Draws the game screen from the state: the scene, the tabs, the action
 * panel, the castaway's condition, the stores and the log. Rendering runs
 * every tick, so each part avoids touching the DOM when nothing changed. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const {
    S, $, el, RES, RES_ORDER, ITEMS, FIRE_NAMES, NIGHT_AT, CAMP_POS, LAUNCH_COST, LOG_MAX,
    has, costText, builtCount, maxHealth, isNight, bumps, session, view,
    button, section, fill, ACTIONS, RECIPES, RAFT, LOCS,
    doAction, make, buildRaft, launch, expedition, knownLocs, blockedReason, scout, SCOUT_COST,
  } = G;

  /* ---------------- the action panel ---------------- */

  /** Whether recipe `rc` should be offered: shown, and not already owned or built to its limit. */
  const recipeAvailable = (rc) =>
    rc.show() && !(rc.item && S.items[rc.item]) && !(rc.max && builtCount(rc.id) >= rc.max);

  /** The beach tab's sections: the camp actions, and things to make. */
  function beachSections() {
    const camp = section('camp', 'The Beach');
    fill(camp.querySelector('.btn-row'), ACTIONS.filter((a) => a.show()).map((a) => {
      const enabled = (!a.cost || has(a.cost)) && (!a.enabled || a.enabled());
      return button(a.id, a.label, a.cost ? costText(a.cost) : '', enabled, () => doAction(a));
    }));
    const secs = [camp];

    const recipes = RECIPES.filter(recipeAvailable);
    if (recipes.length) {
      const mk = section('make', 'Make');
      fill(mk.querySelector('.btn-row'), recipes.map((rc) => {
        const count = rc.max > 1 ? ` (${builtCount(rc.id)}/${rc.max})` : '';
        return button(`mk:${rc.id}`, rc.label + count, costText(rc.cost), has(rc.cost), () => {
          make(rc);
          G.render();
        });
      }));
      secs.push(mk);
    }
    return secs;
  }

  /** The map tab's section: a button to go exploring, and a journey button for every known place. */
  function chartSections() {
    const sec = section('chart', 'The Island', 'Explore to find new places, or choose a destination on your map. Every trip costs supplies.');
    const explore = button('scout', 'explore the island', costText(SCOUT_COST), has(SCOUT_COST), scout, 'Search for places not yet on your map');
    fill(sec.querySelector('.btn-row'), [explore].concat(knownLocs().map((l) => {
      const L = LOCS[l.id];
      const why = blockedReason(L);
      const sub = why || costText(L.cost) + (S.visits[l.id] ? ` · visited ${S.visits[l.id]}×` : '');
      return button(`loc:${l.id}`, L.name, sub, !why && has(L.cost), () => expedition(l.id), why || '');
    })));
    return [sec];
  }

  /** The raft tab's section: the unbuilt parts and, once all are done, the launch. */
  function raftSections() {
    const sec = section('raft', 'The Raft', 'Built from the Calliope\'s bones, to carry you over the horizon.');
    const nodes = RAFT.filter((p) => !S.raft[p.id]).map((p) => {
      const ready = !p.needs || S.raft[p.needs];
      const sub = ready ? costText(p.cost) : `first: ${RAFT.find((q) => q.id === p.needs).label}`;
      return button(`raft:${p.id}`, p.label, sub, ready && has(p.cost), () => {
        buildRaft(p);
        G.render();
      }, p.note);
    });
    if (RAFT.every((p) => S.raft[p.id])) {
      nodes.push(button('launch', 'put to sea', `${costText(LAUNCH_COST)} · there is no coming back`, has(LAUNCH_COST), launch));
    }
    fill(sec.querySelector('.btn-row'), nodes);
    return [sec];
  }

  const PANELS = { beach: beachSections, chart: chartSections, raft: raftSections };

  /** Draws the action panel for the open tab. */
  function renderPanel() {
    fill($('#panel'), PANELS[view.tab] ? PANELS[view.tab]() : []);
  }

  /* ---------------- tabs and scene ---------------- */

  /** Draws the tab bar, once there is more than one tab; unvisited tabs are marked new. */
  function renderTabs() {
    const tabs = [['beach', 'The Beach']];
    if (S.flags.chart) tabs.push(['chart', 'The Map']);
    if (S.flags.raftPlans) tabs.push(['raft', 'The Raft']);
    const nav = $('#tabs');
    if (tabs.length < 2) {
      nav.innerHTML = '';
      return;
    }
    const key = tabs.map((t) => t[0]).join() + view.tab + Object.keys(view.seenTabs).join();
    if (nav.dataset.key === key) return;
    nav.dataset.key = key;
    nav.innerHTML = '';
    tabs.forEach(([id, name]) => {
      const b = el('button', (id === view.tab ? 'on' : '') + (view.seenTabs[id] ? '' : ' new'), name);
      b.onclick = () => {
        AU.sfx('page');
        view.tab = id;
        view.seenTabs[id] = true;
        G.render();
      };
      nav.appendChild(b);
    });
  }

  /** What the camp picture depends on; it is redrawn only when this changes. */
  function campState() {
    return {
      night: isNight(),
      fire: S.fire,
      leanto: S.built.leanto,
      catcher: builtCount('catcher'),
      trap: builtCount('trap'),
      rack: S.built.rack,
      raft: S.raft,
      raftStarted: S.flags.raftPlans && Object.keys(S.raft).length > 0,
      ally: S.flags.ally,
    };
  }

  /** Draws the map (on the map tab) or the camp, if it has changed since last drawn. */
  function renderScene() {
    const chart = view.tab === 'chart';
    const data = chart ? knownLocs() : campState();
    const key = (chart ? 'chart' : 'camp') + JSON.stringify(data);
    if (key === view.sceneKey) return;
    view.sceneKey = key;
    $('#scene').innerHTML = chart ? ART.chart(data, CAMP_POS) : ART.camp(data);
  }

  /* ---------------- the side columns ---------------- */

  /** The name of the time of day. */
  function phase() {
    if (S.t < 12) return 'dawn';
    if (S.t < 40) return 'morning';
    if (S.t < 70) return 'afternoon';
    if (S.t < NIGHT_AT) return 'dusk';
    return 'night';
  }

  /** A meter bar filled to `pct` percent; `low` hatches it as a warning. */
  const meter = (pct, low) => `<div class="meter${low ? ' low' : ''}"><i style="width:${pct}%"></i></div>`;

  /** Draws the clock, the castaway's health, and the fire. */
  function renderStatus() {
    $('#clock').textContent = `Day ${S.day}, ${phase()}`;
    const hp = Math.max(0, S.health);
    const mh = maxHealth();
    $('#status').innerHTML =
      `<div class="stat"><h3>Condition</h3>health ${hp} / ${mh}${meter((hp / mh) * 100, hp <= 3)}</div>` +
      (S.flags.fireLit ? `<div class="stat">the fire is ${FIRE_NAMES[S.fire]}${meter(S.fire * 25)}</div>` : '');
  }

  /** One row of a list in the stores: a label, and an optional value or italic note. */
  const row = (label, value, note) =>
    `<li><span>${label}</span>` +
    (value != null ? `<span>${value}</span>` : '') +
    (note != null ? `<span class="sub">${note}</span>` : '') + '</li>';

  /** A headed list for the stores column. */
  const list = (title, rows) => `<h3>${title}</h3><ul class="rows">${rows.join('')}</ul>`;

  /** Draws the stores, possessions and camp, flashing any resource that just changed. */
  function renderStores() {
    const res = RES_ORDER.filter((k) => S.seen[k]).map((k) => {
      const warn = (k === 'water' || k === 'food') && !S.res[k] ? ' <span class="sub">none!</span>' : '';
      return `<li class="${bumps[k] ? 'bump' : ''}"><span>${RES[k]}${warn}</span><span>${S.res[k] || 0}</span></li>`;
    });
    Object.keys(bumps).forEach((k) => delete bumps[k]);

    const items = Object.keys(ITEMS).filter((k) => S.items[k]).map((k) => row(ITEMS[k][0], null, ITEMS[k][1]));

    const built = [];
    if (S.built.leanto) built.push(row('lean-to'));
    if (S.built.catcher) built.push(row('rain catchers', S.built.catcher));
    if (S.built.trap) built.push(row('fish traps', S.built.trap));
    if (S.built.rack) built.push(row('smoking rack'));
    if (S.built.pyre) built.push(row('signal pyre', null, 'on the summit'));
    if (S.flags.ally) built.push(row('Tom Hollis', null, 'companion'));

    $('#stores').innerHTML = list('Stores', res) + list('Possessions', items) + (built.length ? list('Camp', built) : '');
  }

  /* ---------------- the log ---------------- */

  /** Gap between lines that arrive together, in ms, so each can be read in turn. */
  const LOG_STAGGER = 800;

  /** The newest entry already drawn, when the last queued line is due, and the queued lines' timers. */
  let logTop = null;
  let logFreeAt = 0;
  let logTimers = [];

  /** The element for a log entry: a line of text, or a divider marking a new day. */
  function logLine(e) {
    if (e.c === 'day') return el('p', 'day', `<span>${e.m}</span>`);
    return el('p', e.c, e.m);
  }

  /** Fades each line by its age, so the eye goes to the newest first. */
  function fadeLog(box) {
    Array.from(box.children).forEach((p, i) => {
      p.style.opacity = Math.max(0.35, 1 - i * 0.05).toFixed(2);
    });
  }

  /** Adds one entry to the top of the log, sliding it in. */
  function showLine(box, e) {
    const p = logLine(e);
    p.classList.add('arriving');
    box.prepend(p);
    while (box.children.length > LOG_MAX) box.lastChild.remove();
    fadeLog(box);
  }

  /**
   * Draws the log, newest first. New entries are queued and added to the
   * top one at a time, oldest first, LOG_STAGGER apart, so a burst of
   * messages can be read in turn. `reset` redraws everything at once, as
   * when a game is loaded.
   */
  G.renderLog = function (reset) {
    const box = $('#log');
    const known = reset ? -1 : S.log.indexOf(logTop);
    if (known === -1) {
      logTimers.forEach(clearTimeout);
      logTimers = [];
      logFreeAt = 0;
      box.replaceChildren(...S.log.map(logLine));
      fadeLog(box);
    } else {
      const now = performance.now();
      let at = Math.max(now, logFreeAt);
      S.log.slice(0, known).reverse().forEach((e) => {
        if (at <= now) showLine(box, e);
        else logTimers.push(setTimeout(() => showLine(box, e), at - now));
        at += LOG_STAGGER;
      });
      logFreeAt = at;
    }
    logTop = S.log[0] || null;
  };

  /** Redraws the game screen, if a game is running. */
  G.render = function () {
    if (!session.running) return;
    renderTabs();
    renderScene();
    renderPanel();
    renderStatus();
    renderStores();
  };
})();
