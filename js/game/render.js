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
    S, $, el, RES, RES_ORDER, ITEMS, HOLLIS_JOBS, JEM_JOBS, FIRE_NAMES, NIGHT_AT, CAMP_POS, LAUNCH_COST, LOG_MAX, WINDS, PATCH, ISLES, HOME_POS,
    has, costText, builtCount, maxHealth, isNight, atHome, withHollis, bumps, session, view,
    workBoat, boatMended, upgradesLeft, destinations, sailBlocked, passageCost, passageDays, setSail,
    button, section, fill, ACTIONS, RECIPES, RAFT, LOCS,
    doAction, make, buildRaft, launch, expedition, knownLocs, blockedReason, scout, SCOUT_COST, darkness, tripCost,
  } = G;

  /* ---------------- the action panel ---------------- */

  /** Whether recipe `rc` should be offered: shown, makeable here, and not already owned or built to its limit. */
  const recipeAvailable = (rc) =>
    rc.show() && (atHome() || rc.anywhere) && !(rc.item && S.items[rc.item]) && !(rc.max && builtCount(rc.id) >= rc.max);

  /** The name of the shore the castaway is on: the beach at home, or the island they have sailed to. */
  const shoreName = () => (atHome() ? 'The Beach' : G.isle().name);

  /** The beach tab's sections: the camp actions, the island's own places when away, and things to make. */
  function beachSections() {
    const camp = section('camp', shoreName());
    fill(camp.querySelector('.btn-row'), ACTIONS.filter((a) => a.show()).map((a) => {
      const enabled = (!a.cost || has(a.cost)) && (!a.enabled || a.enabled());
      const note = a.cost ? costText(a.cost) : (a.note && a.note()) || '';
      return button(a.id, a.label, note, enabled, () => doAction(a));
    }));
    const secs = [camp];

    const job = G.hollisJob();
    if (job) {
      const hollis = section('hollis', 'Tom Hollis', 'Set Hollis to work. He keeps the fire from going out, whatever he is doing.');
      fill(hollis.querySelector('.btn-row'), Object.keys(HOLLIS_JOBS).map((id) =>
        button(`hollis:${id}`, HOLLIS_JOBS[id][0], id === job ? 'his work now' : '', id !== job, () => {
          G.setHollisJob(id);
          G.render();
        })));
      secs.push(hollis);
    }

    const jemJob = G.jemJob();
    if (jemJob) {
      const jem = section('jem', 'Jem Rudd', 'He works for his keep, and eats a share of the provisions every dawn.');
      fill(jem.querySelector('.btn-row'), Object.keys(JEM_JOBS).map((id) =>
        button(`jem:${id}`, JEM_JOBS[id][0], id === jemJob ? 'his work now' : '', id !== jemJob, () => {
          G.setJemJob(id);
          G.render();
        })));
      secs.push(jem);
    }

    const places = atHome() ? [] : G.isle().places.filter((p) => !p.show || p.show());
    if (places.length) {
      const sec = section('places', 'Explore');
      fill(sec.querySelector('.btn-row'), places.map((p) => {
        const a = { id: `place:${p.id}`, cd: p.cd, cost: p.cost, run: p.run };
        const enabled = (!p.cost || has(p.cost)) && (!p.enabled || p.enabled());
        const note = (p.note && p.note()) || (p.cost ? costText(p.cost) : '');
        return button(a.id, p.label, note, enabled, () => doAction(a));
      }));
      secs.push(sec);
    }

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
    const sec = section('chart', 'The Island', 'Explore to find new places, or choose a destination on your map. Every trip costs supplies, and at night a torch as well.');
    const dark = darkness();
    const scoutCost = tripCost(SCOUT_COST);
    const sub = dark || costText(scoutCost) + (G.somethingToFind() ? '' : ' · nothing new to find yet');
    const explore = button('scout', 'explore the island', sub, !dark && has(scoutCost), scout, dark || 'Search for places not yet on your map');
    fill(sec.querySelector('.btn-row'), [explore].concat(knownLocs().map((l) => {
      const L = LOCS[l.id];
      const why = blockedReason(L);
      const cost = tripCost(L.cost);
      const sub = why || costText(cost) + (S.visits[l.id] ? ` · visited ${S.visits[l.id]}×` : '');
      return button(`loc:${l.id}`, L.name, sub, !why && has(cost), () => expedition(l.id), why || '');
    })));
    return [sec];
  }

  /** A button for each of `parts` (patches or upgrades) still to be done, each waiting on any part it `needs`. */
  function boatButtons(parts) {
    return parts.filter((p) => !S.boat[p.id]).map((p) => {
      const ready = !p.needs || S.boat[p.needs];
      const sub = ready ? costText(p.cost) : `first: ${parts.find((q) => q.id === p.needs).label}`;
      return button(`boat:${p.id}`, p.label, sub, ready && has(p.cost), () => {
        workBoat(p);
        G.render();
      }, p.note);
    });
  }

  /** The boat tab's section in the second chapter: patching the wreck, then fitting her out at home. */
  function boatSections() {
    const name = S.boat.kind === 'canoe' ? 'The Canoe' : 'The Raft';
    let note;
    let nodes = [];
    if (!boatMended()) {
      note = 'Broken on the reef. Patch her, and she will carry you home on a westerly. She will only ever run before the wind.';
      nodes = boatButtons(PATCH);
    } else if (atHome()) {
      nodes = boatButtons(G.UPGRADES);
      note = nodes.length
        ? 'Patched, and drawn up above the tide line. Fit her out, and she will go further, and in more weathers.'
        : 'Fitted out as well as she will ever be. Choose a passage from the sea chart.';
    } else {
      note = 'Drawn up on the beach. Sail for home from the sea chart when the wind serves.';
    }
    const sec = section('raft', name, note);
    fill(sec.querySelector('.btn-row'), nodes);
    return [sec];
  }

  /** The sea tab's section: the wind, and a passage button for every place the boat can make for from here. */
  function seaSections() {
    const note = S.isle === 'smoke'
      ? `The wind is ${WINDS[S.wind][0]}. One of Tavake's canoes will see you home whatever its quarter, and they send water with you.`
      : `The wind is ${WINDS[S.wind][0]}. She can only run before it${S.boat.leeboards ? ', or cross it with a leeboard down' : ''}. Every day at sea costs a day's water and food.`;
    const sec = section('sea', 'The Sea', note);
    fill(sec.querySelector('.btn-row'), destinations().map((id) => {
      const why = sailBlocked(id);
      const cost = passageCost(id);
      const days = passageDays(id);
      const name = id === 'home' ? 'sail for home' : ISLES[id].name;
      const sub = why || `${costText(cost)} · ${days} day${days === 1 ? '' : 's'}${id !== 'home' && S.landed[id] ? ' · landed' : ''}`;
      return button(`sail:${id}`, name, sub, !why && has(cost), () => setSail(id), why || '');
    }));
    return [sec];
  }

  /** The raft tab's section: the unbuilt parts and, once all are done, the launch. */
  function raftSections() {
    if (S.chapter >= 2) return boatSections();
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

  const PANELS = { beach: beachSections, chart: chartSections, raft: raftSections, sea: seaSections };

  /** Draws the action panel for the open tab. */
  function renderPanel() {
    fill($('#panel'), PANELS[view.tab] ? PANELS[view.tab]() : []);
  }

  /* ---------------- tabs and scene ---------------- */

  /** Draws the tab bar, once there is more than one tab; unvisited tabs are marked new. */
  function renderTabs() {
    const tabs = [['beach', shoreName()]];
    if (S.flags.chart && atHome()) tabs.push(['chart', 'The Map']);
    if (S.flags.raftPlans || S.chapter >= 2) tabs.push(['raft', S.boat.kind === 'canoe' ? 'The Canoe' : 'The Raft']);
    if (S.chapter >= 2) tabs.push(['sea', 'The Sea']);
    const nav = $('#tabs');
    if (tabs.length < 2) {
      nav.innerHTML = '';
      return;
    }
    const key = tabs.map((t) => t.join(':')).join() + view.tab + Object.keys(view.seenTabs).join();
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
      ally: withHollis(),
      jem: G.withJem(),
    };
  }

  /** What the islet picture depends on. */
  function isletState() {
    return { night: isNight(), fire: S.fire, boat: S.boat, ally: withHollis(), jem: G.withJem(), isle: S.isle };
  }

  /** What the sea chart depends on: the charted islands, where the castaway is, and the wind. */
  function seaState() {
    const isles = Object.keys(ISLES).filter((id) => S.charted[id]).map((id) => ({
      id, name: ISLES[id].name, x: ISLES[id].x, y: ISLES[id].y, visited: !!S.landed[id], blocked: !!sailBlocked(atHome() ? id : 'home'),
    }));
    return { isles, here: S.isle, home: HOME_POS, wind: S.wind, homeBlocked: !atHome() && !!sailBlocked('home') };
  }

  /** Draws the map (on the map tab), the camp or the islet, if it has changed since last drawn. */
  function renderScene() {
    const chart = view.tab === 'chart';
    const kind = chart ? 'chart' : view.tab === 'sea' ? 'sea' : atHome() ? 'camp' : 'islet';
    const data = chart ? knownLocs() : { sea: seaState, camp: campState, islet: isletState }[kind]();
    const key = kind + JSON.stringify(data);
    if (key === view.sceneKey) return;
    view.sceneKey = key;
    $('#scene').innerHTML = chart ? ART.chart(data, CAMP_POS) : ART[kind](data);
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

  /** The castaway's ailments, each with the days it has left to run. */
  const ailments = () => Object.keys(S.ail).map((k) =>
    `<div class="ail">${G.AILMENTS[k][0]} <i>${S.ail[k]} day${S.ail[k] === 1 ? '' : 's'}</i></div>`).join('');

  /** Draws the clock, the castaway's health, and the fire. */
  function renderStatus() {
    const wind = S.chapter >= 2 && S.wind ? `, ${WINDS[S.wind][0]}` : '';
    $('#clock').textContent = `Day ${S.day}, ${phase()}${G.tideKnown() ? `, ${G.lowTide() ? 'low' : 'high'} tide` : ''}${wind}`;
    const hp = Math.max(0, S.health);
    const mh = maxHealth();
    $('#status').innerHTML =
      `<div class="stat"><h3>Condition</h3>health ${hp} / ${mh}${meter((hp / mh) * 100, hp <= 3)}${ailments()}</div>` +
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
    if (!atHome()) {
      const patched = PATCH.filter((p) => S.boat[p.id]).length;
      built.push(row(S.boat.kind === 'canoe' ? 'the canoe' : 'the raft', null, patched < PATCH.length ? `${patched} of ${PATCH.length} patched` : 'drawn up on the beach'));
      if (withHollis()) built.push(row('Tom Hollis', null, HOLLIS_JOBS[G.hollisJob()][1]));
      if (G.withJem()) built.push(row('Jem Rudd', null, JEM_JOBS[G.jemJob()][1]));
      $('#stores').innerHTML = list('Stores', res) + list('Possessions', items) + list(G.isle().name, built);
      return;
    }
    if (S.built.leanto) built.push(row('lean-to'));
    if (S.built.catcher) built.push(row('rain catchers', S.built.catcher));
    if (S.built.trap) built.push(row('fish traps', S.built.trap));
    if (S.built.rack) built.push(row('smoking rack'));
    if (S.built.pyre) built.push(row('signal pyre', null, S.flags.trades ? 'watching for a sail' : 'waiting for the trade winds'));
    const mended = G.CANOE.filter((p) => S.canoe[p.id]).length;
    if (mended) built.push(row('outrigger canoe', null, mended < G.CANOE.length ? `${mended} of ${G.CANOE.length} mended` : 'ready at the lagoon'));
    if (S.flags.ally) built.push(row('Tom Hollis', null, HOLLIS_JOBS[G.hollisJob()][1]));
    if (G.withJem()) built.push(row('Jem Rudd', null, JEM_JOBS[G.jemJob()][1]));
    if (S.chapter >= 2) built.push(row(`the ${G.boatName()}`, null, `${G.UPGRADES.length - upgradesLeft().length} of ${G.UPGRADES.length} fittings`));

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

  /** Redraws the game screen, if a game is running, and awards any achievements the state has earned. */
  G.render = function () {
    if (!session.running) return;
    renderTabs();
    renderScene();
    renderPanel();
    renderStatus();
    renderStores();
    G.checkAchievements();
  };
})();
