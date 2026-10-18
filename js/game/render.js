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
    S, $, el, RES, RES_ORDER, ITEMS, FIRE_NAMES, NIGHT_AT, CAMP_POS, LAUNCH_COST,
    has, costText, builtCount, maxHealth, isNight, bumps, session, view,
    button, section, fill, ACTIONS, RECIPES, RAFT, LOCS,
    doAction, make, buildRaft, launch, expedition, knownLocs, blockedReason,
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

  /** The chart tab's section: a journey button for every known place. */
  function chartSections() {
    const sec = section('chart', 'The Island', 'Choose a destination on the chart. Each journey costs supplies.');
    fill(sec.querySelector('.btn-row'), knownLocs().map((l) => {
      const L = LOCS[l.id];
      const why = blockedReason(L);
      const sub = why || costText(L.cost) + (S.visits[l.id] ? ` · visited ${S.visits[l.id]}×` : '');
      return button(`loc:${l.id}`, L.name, sub, !why && has(L.cost), () => expedition(l.id), why || '');
    }));
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
    if (S.flags.chart) tabs.push(['chart', 'The Chart']);
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

  /** Draws the chart (on the chart tab) or the camp, if it has changed since last drawn. */
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
    if (S.built.trap) built.push(row('fish weirs', S.built.trap));
    if (S.built.rack) built.push(row('smoking rack'));
    if (S.built.pyre) built.push(row('signal pyre', null, 'on the summit'));
    if (S.flags.ally) built.push(row('Tom Hollis', null, 'companion'));

    $('#stores').innerHTML = list('Stores', res) + list('Possessions', items) + (built.length ? list('Camp', built) : '');
  }

  /** Draws the log, newest first, each older line a little fainter. */
  G.renderLog = function () {
    $('#log').innerHTML = S.log.map((e, i) => {
      const opacity = Math.max(0.18, 1 - i * 0.07).toFixed(2);
      return `<p class="${e.c}" style="opacity:${opacity}">${e.m}</p>`;
    }).join('');
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
