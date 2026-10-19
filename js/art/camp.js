/* Driftwood — the camp.
 * The beach scene above the action buttons, which grows as the castaway
 * builds, and darkens at night to a pool of firelight. */
(function () {
  'use strict';

  const DW = window.DW;
  const draw = DW.draw;
  const {
    pal, rng, svg, frame, P, ground, darkness,
    sky, sea, sun, moon, stars, birds, palm, rock, tufts, headland,
    fire, sitter, leanto, catcher, weir, rack, raft,
  } = draw;

  /** The shoreline's curve: the wet edge of the sand. */
  const SHORE = 'M0 212 C120 200 220 224 320 214 S520 202 600 216';

  /**
   * Draws the camp. `st` describes it: night, fire (0–4), leanto, catcher
   * and trap (counts), rack, raft (parts built), raftStarted, ally (Hollis
   * by the fire), jem (Jem Rudd beside him) and pyreLit.
   */
  DW.art.camp = function (st) {
    const r = rng(7);
    const W = 600;
    const H = 300;
    const hz = 140;

    // sky, sea and the far headland
    let b = sky(r, W, 0, hz, st.night);
    b += st.night ? moon(470, 46, 15) + stars(r, W, hz - 20) : sun(470, 62, 17, true) + birds(r, 200, 60, 4, 70);
    b += sea(r, W, hz, 220, st.night);
    if (st.pyreLit) b += P(`M560 ${hz}c-4 -14 6 -20 0 -34`, null, 1, 'class="smoke"');
    b += headland(r, 520, hz, 80, 22, 1);
    if (st.trap) b += weir(420, 196, st.trap);

    // the beach
    b += ground(SHORE, 'url(#dots)', 0, W, H);
    b += P(SHORE, null, 1.2) + P('M0 207 C110 196 230 220 320 209 S510 197 600 210', null, 0.6, 'stroke-dasharray="6 5"');
    b += tufts(r, 0, 120, 262, 6) + tufts(r, 470, 600, 282, 5);
    b += rock(r, 520, 266, 100, 46) + rock(r, 580, 274, 64, 30);
    b += palm(r, 64, 292, 205, 46) + palm(r, 130, 290, 150, 22, 0.78) + palm(r, 556, 252, 120, -26, 0.7);

    // whatever has been built
    if (st.leanto) b += leanto(150, 272);
    for (let i = 0; i < (st.catcher || 0); i++) b += catcher(372 + i * 44, 252 + (i % 2) * 6);
    if (st.rack) b += rack(470, 290);
    if (st.raftStarted) b += raft(176, 296, st.raft, 0.9);
    if (st.ally) b += sitter(343, 266, 1.05, -1, true);
    if (st.jem) b += sitter(224, 270, 1.05, 1);
    b += sitter(266, 266, 1.1, 1);

    // night falls over everything but the firelight; the fire itself stays crisp
    let top = '';
    if (st.night) top += darkness(W, H, 305, 250, st.fire ? 50 + st.fire * 32 : 0, 0.75);
    top += `<g>${fire(305, 266, st.fire, 1)}</g>` + frame(W, H);
    return svg(W, H, b, top, 'The castaway\'s camp on the beach');
  };

  /**
   * Draws the shore of an island of the second chapter in place of the
   * camp: a hump of sand in the open sea, the castaway's own island far off,
   * and the boat on the sand. `st` has night, fire, boat (the parts
   * patched), ally, jem, and `isle`, which shapes the shore: the High Island
   * rises steep and green behind it, the Bird Rock is bare black rock,
   * the Sandbar is barely above the sea, and the Island of Fires has its
   * village above the beach.
   */
  DW.art.islet = function (st) {
    const r = rng(17);
    const W = 600;
    const H = 300;
    const hz = 140;

    let b = sky(r, W, 0, hz, st.night);
    b += st.night ? moon(120, 46, 15) + stars(r, W, hz - 20) : sun(130, 58, 16, true) + birds(r, 260, 50, 9, 160);
    b += sea(r, W, hz, H, st.night);
    const isle = st.isle || 'islet';
    if (isle === 'high' || isle === 'smoke') {
      // the island's own heights, and the cloud that sits on them
      b += headland(r, 300, hz + 80, 320, 170, 6);
      b += P('M380 40 q20 -16 46 -6 q24 -14 50 0 q22 0 26 14 q-60 8 -122 -8Z', pal.paper, 1);
    } else {
      // other islands far off on the horizon
      b += headland(r, 370, hz, 200, 26, 2) + headland(r, 24, hz, 56, 6, 1) + headland(r, 110, hz, 28, 4, 0);
    }

    // the shore, with the surf on its reef
    const shore = {
      islet: ['M-10 300 C40 262 140 222 300 218 S540 244 610 300Z', 'url(#dots)'],
      high: ['M-10 300 C40 256 160 226 300 222 S540 232 610 262 V300Z', 'url(#dots)'],
      rock: ['M-10 300 C30 250 120 214 240 206 C330 196 420 214 500 236 S590 270 610 300Z', 'url(#h1)'],
      sandbar: ['M-10 300 C60 274 180 252 300 250 S540 262 610 300Z', 'url(#dots)'],
      smoke: ['M-10 300 C40 256 160 226 300 222 S540 232 610 262 V300Z', 'url(#dots)'],
    }[isle];
    b += P(shore[0], shore[1], 1.2);
    b += P('M0 262 q40 -14 70 -26 M540 238 q36 10 60 24', null, 0.7, 'stroke-dasharray="5 6"');
    if (isle === 'islet' || isle === 'high' || isle === 'smoke') {
      b += tufts(r, 380, 560, 262, 4);
      b += palm(r, 470, 262, 130, -22, 0.85) + palm(r, 528, 266, 96, 16, 0.7);
    }
    if (isle === 'smoke') {
      // the village above the beach, smoke going up, and canoes drawn up on the sand
      for (let i = 0; i < 4; i++) {
        const hx = 330 + i * 34;
        b += P(`M${hx - 14} 228 L${hx} 208 L${hx + 14} 228Z`, 'url(#h2)', 1) + P(`M${hx - 10} 228 V236 M${hx + 10} 228 V236`, null, 1);
        if (i % 2 === 0) b += P(`M${hx} 206 c-4 -10 4 -16 0 -28`, null, 0.8);
      }
      b += P('M150 268 q50 10 100 0 l4 -6 q-54 8 -108 0Z', 'url(#h3)', 1) + P('M160 252 h80', null, 2);
    }
    if (isle === 'rock') b += birds(r, 300, 150, 14, 260);

    // the wreck, patched as far as it has been
    b += raft(70, 286, { hull: 1, mast: st.boat.mast, sail: st.boat.sail }, 0.85);
    if (st.ally) b += sitter(372, 270, 1.05, -1, true);
    if (st.jem) b += sitter(250, 274, 1.05, 1);
    b += sitter(292, 270, 1.1, 1);

    let top = '';
    if (st.night) top += darkness(W, H, 332, 256, st.fire ? 50 + st.fire * 32 : 0, 0.75);
    top += `<g>${fire(332, 272, st.fire, 1)}</g>` + frame(W, H);
    return svg(W, H, b, top, 'The castaway on a small islet, their island far off on the horizon');
  };
})();
