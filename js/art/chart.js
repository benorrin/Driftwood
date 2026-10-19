/* Driftwood — the charts.
 * A hand-drawn map of the island in the old style: echoing coastlines,
 * hachured hills, a compass rose, a sea serpent, and a clickable marker for
 * each place the castaway knows of. And in the second chapter, a chart of
 * the archipelago, with the wind. */
(function () {
  'use strict';

  const DW = window.DW;
  const draw = DW.draw;
  const { pal, f, rng, uid, svg, frame, P, circle, at, smooth, palm } = draw;

  const W = 600;
  const H = 340;

  /** The island's outline, clockwise from the west. */
  const ISLAND = [
    [118, 192], [132, 150], [168, 128], [196, 98], [232, 72], [270, 58], [306, 52], [338, 66],
    [372, 86], [418, 90], [458, 108], [488, 138], [502, 176], [486, 206], [462, 236], [430, 252],
    [386, 260], [340, 274], [300, 276], [254, 266], [206, 258], [168, 244], [134, 222],
  ];

  /** Path data for the coast of outline `outline`: the outline with a wobbling midpoint added along every edge. */
  function coastline(r, outline) {
    const pts = [];
    outline.forEach((p, i) => {
      const q = outline[(i + 1) % outline.length];
      pts.push(p);
      const mx = (p[0] + q[0]) / 2;
      const my = (p[1] + q[1]) / 2;
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const l = Math.hypot(dx, dy);
      const off = (r() - 0.5) * 12;
      pts.push([mx + (-dy / l) * off, my + (dx / l) * off]);
    });
    return smooth(pts, true);
  }

  /** Sparse horizontal lines across the open sea. */
  function seaLines(r) {
    let d = '';
    for (let y = 8; y < H; y += 9) {
      let x = r() * 40;
      while (x < W) {
        const len = 20 + r() * 70;
        if (r() < 0.35) d += `M${f(x)} ${y}h${f(len)}`;
        x += len + 20 + r() * 60;
      }
    }
    return P(d, null, 0.4);
  }

  /**
   * The island itself: the coast drawn as a stack of ever-larger echoes
   * (as old charts show the shallows), filled with paper and stippled
   * along the beaches. `cid` is the id the coast path is defined under,
   * and the echoes spread from the island's centre (`cx`, `cy`).
   */
  function island(coast, cid, cx, cy) {
    let s = `<defs><path id="${cid}" d="${coast}"/></defs>`;
    for (let k = 7; k >= 1; k--) {
      const scale = 1 + k * 0.028;
      s += `<use href="#${cid}" transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})" ` +
        `fill="${k === 7 ? 'none' : pal.paper}" stroke="${pal.ink}" stroke-width="${0.9 - k * 0.09}"/>`;
    }
    s += `<use href="#${cid}" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="1.6"/>`;
    s += `<clipPath id="${cid}c"><use href="#${cid}"/></clipPath><g clip-path="url(#${cid}c)">` +
      `<use href="#${cid}" fill="none" stroke="url(#dots2)" stroke-width="14"/>` + '</g>';
    return s;
  }

  /** The hills to the north, each a peak with its eastern face hatched. */
  function hills() {
    let s = '';
    [[300, 82, 26], [268, 92, 18], [334, 92, 20], [236, 104, 14], [372, 104, 14]].forEach(([x, y, size]) => {
      s += P(`M${x - size} ${y + size * 0.5}L${x} ${y - size * 0.5}L${x + size} ${y + size * 0.5}`, pal.paper, 1.1);
      s += P(`M${x} ${y - size * 0.5}L${x + size} ${y + size * 0.5}L${x + 2} ${y + size * 0.5}Z`, 'url(#h2)', 0);
    });
    return s;
  }

  /** The jungle: clumps of little round trees, leaving a clearing for the spring. */
  function jungle(r) {
    let s = '';
    for (let i = 0; i < 46; i++) {
      const tx = 300 + (r() - 0.4) * 190;
      const ty = 130 + r() * 75;
      if (Math.hypot(tx - 260, ty - 175) < 22) continue;
      const size = 4 + r() * 3;
      s += P(`M${f(tx)} ${f(ty + size * 0.6)}v4`, null, 0.9) +
        circle(f(tx), f(ty), f(size * 0.85), pal.paper, 0.8) +
        P(`M${f(tx)} ${f(ty - size * 0.8)}a${f(size * 0.85)} ${f(size * 0.85)} 0 0 1 0 ${f(size * 1.7)}Z`, 'url(#h2)', 0);
    }
    return s;
  }

  /** An eight-pointed compass rose centred on (rx, ry), each point half ink, half paper. */
  function compassRose(rx, ry) {
    let s = `<circle cx="${rx}" cy="${ry}" r="30" fill="${pal.paper}" stroke="${pal.ink}"/>` +
      `<circle cx="${rx}" cy="${ry}" r="26" fill="none" stroke="${pal.ink}" stroke-width="0.5"/>`;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const L = i % 2 ? 18 : 34;
      const tipx = rx + Math.cos(a) * L;
      const tipy = ry + Math.sin(a) * L;
      const lx = rx + Math.cos(a - Math.PI / 2) * 5;
      const ly = ry + Math.sin(a - Math.PI / 2) * 5;
      const qx = rx + Math.cos(a + Math.PI / 2) * 5;
      const qy = ry + Math.sin(a + Math.PI / 2) * 5;
      s += P(`M${f(rx)} ${f(ry)}L${f(tipx)} ${f(tipy)}L${f(lx)} ${f(ly)}Z`, pal.ink, 0.6) +
        P(`M${f(rx)} ${f(ry)}L${f(tipx)} ${f(tipy)}L${f(qx)} ${f(qy)}Z`, pal.paper, 0.6);
    }
    return s;
  }

  /**
   * A clickable marker for a known location `l` (id, name, x, y, visited,
   * blocked): filled once visited, a question mark until then. `data` is
   * the attribute naming it for the click handler (by default, `data-loc`).
   */
  function marker(l, font, data) {
    const blocked = l.blocked ? ' blocked' : '';
    const mark = l.visited
      ? `<circle class="marker" cx="0" cy="0" r="5.5" fill="${pal.ink}" stroke="${pal.ink}"/>`
      : `<circle class="marker" cx="0" cy="0" r="6" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="1.3"/>` +
        `<text x="0" y="3.5" font-size="9" text-anchor="middle" ${font}>?</text>`;
    // labels near the edges are aligned inward so they stay on the chart
    const anchor = l.x > 440 ? 'end' : l.x < 170 ? 'start' : 'middle';
    const lx = anchor === 'end' ? 8 : anchor === 'start' ? -8 : 0;
    return `<g class="loc${blocked}" ${data || `data-loc="${l.id}"`} tabindex="0" role="button" aria-label="${l.name}" transform="translate(${l.x} ${l.y})">` +
      `<circle r="16" fill="transparent"/>${mark}` +
      `<text x="${lx}" y="-11" text-anchor="${anchor}" font-size="13" font-style="italic" ${font} stroke="${pal.paper}" stroke-width="3" paint-order="stroke">${l.name}</text></g>`;
  }

  /** Little round trees in a clump about (x, y), `w` wide and `h` deep. */
  function trees(r, x, y, w, h, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const tx = x + (r() - 0.5) * w;
      const ty = y + (r() - 0.5) * h;
      const size = 4 + r() * 3;
      s += P(`M${f(tx)} ${f(ty + size * 0.6)}v4`, null, 0.9) +
        circle(f(tx), f(ty), f(size * 0.85), pal.paper, 0.8) +
        P(`M${f(tx)} ${f(ty - size * 0.8)}a${f(size * 0.85)} ${f(size * 0.85)} 0 0 1 0 ${f(size * 1.7)}Z`, 'url(#h2)', 0);
    }
    return s;
  }

  /** A peak at (x, y) of `size`, its eastern face hatched. */
  const peak = (x, y, size) => P(`M${x - size} ${y + size * 0.5}L${x} ${y - size * 0.5}L${x + size} ${y + size * 0.5}`, pal.paper, 1.1) +
    P(`M${x} ${y - size * 0.5}L${x + size} ${y + size * 0.5}L${x + 2} ${y + size * 0.5}Z`, 'url(#h2)', 0);

  /** A dotted line of reef. */
  const reef = (d) => P(d, null, 1, 'stroke-dasharray="2 4"');

  /**
   * The islands that have charts: each an outline (clockwise from the
   * west), the centre its shallows spread from, a title, and its features.
   */
  const SHAPES = {
    home: {
      outline: ISLAND, cx: 310, cy: 165, title: 'A CHART of the ISLAND',
      features(r) {
        let b = hills() + jungle(r);
        // palms by the grove
        for (let i = 0; i < 5; i++) b += palm(r, 192 + i * 9, 246 - (i % 2) * 8, 16, 3, 0.18);
        return b + reef('M492 262 q14 -6 26 2 t28 4 t26 -6') + reef('M500 280 q16 6 32 -2 t30 2');
      },
    },
    high: {
      outline: [[140, 200], [150, 150], [190, 110], [240, 82], [300, 70], [360, 80], [410, 110], [450, 150], [462, 200], [440, 240], [400, 268], [340, 282], [280, 284], [220, 272], [170, 245]],
      cx: 300, cy: 178, title: 'A CHART of the HIGH ISLAND',
      features(r) {
        let b = peak(296, 112, 30) + peak(256, 124, 18) + peak(336, 122, 20);
        b += trees(r, 250, 205, 120, 70, 28) + trees(r, 380, 190, 60, 50, 10);
        // the stream, from the falls down to the beach
        b += P('M330 150 q20 20 40 24 t50 30 t22 14', null, 1.1);
        return b + P('M24 60 q14 -8 30 0 q14 -8 30 0', null, 0.9);
      },
    },
    rock: {
      outline: [[200, 200], [215, 150], [250, 120], [300, 104], [350, 112], [390, 140], [405, 185], [385, 225], [340, 250], [280, 256], [230, 240]],
      cx: 300, cy: 180, title: 'A CHART of the BIRD ROCK',
      features(r) {
        let b = P('M240 200 L270 140 L300 120 L340 132 L370 176 L350 220 L290 236Z', 'url(#h1)', 0.8);
        for (let i = 0; i < 9; i++) b += P(`M${f(150 + r() * 320)} ${f(60 + r() * 50)}q4 -4 8 0q4 -4 8 0`, null, 0.9);
        return b;
      },
    },
    smoke: {
      outline: [[90, 190], [110, 140], [160, 100], [230, 80], [310, 70], [390, 82], [460, 105], [510, 145], [520, 195], [490, 240], [430, 268], [350, 282], [260, 282], [180, 265], [120, 235]],
      cx: 305, cy: 180, title: 'A CHART of the ISLAND of FIRES',
      features(r) {
        let b = peak(300, 120, 34) + peak(250, 132, 22) + peak(360, 128, 24) + peak(420, 140, 16);
        b += trees(r, 200, 190, 110, 60, 22) + trees(r, 400, 190, 90, 50, 14);
        // houses above the beach
        for (let i = 0; i < 6; i++) b += P(`M${236 + i * 14} 238 l6 -8 l6 8Z`, 'url(#h2)', 0.8);
        return b + reef('M150 300 q40 -8 80 0 t80 2 t80 -4 t80 2') + reef('M480 270 q20 10 40 4');
      },
    },
  };

  /**
   * Draws the chart of island `isle` (by default the castaway's own), with
   * a marker for each of `locs` and the camp at `camp` ([x, y]).
   */
  DW.art.chart = function (locs, camp, isle) {
    const shape = SHAPES[isle] || SHAPES.home;
    const r = rng(11);
    const coast = coastline(r, shape.outline);
    const cid = uid('coast');

    let b = seaLines(r);
    b += island(coast, cid, shape.cx, shape.cy);
    b += shape.features(r);
    const rx = 72;
    const ry = 282;
    b += compassRose(rx, ry);
    // a sea serpent, as all good charts have
    b += P('M520 52 q8 -12 16 0 t16 0 t16 0', null, 2.4) + P('M568 52 q6 -10 12 -6 l4 4', null, 2.4) + circle(579, 46, 1, pal.paper);

    // labels and markers sit above the roughening filter so they stay crisp
    const font = `font-family="'IM Fell English', Georgia, serif" fill="${pal.ink}"`;
    let top = `<g ${font}><text x="${rx}" y="${ry - 38}" text-anchor="middle" font-size="12">N</text>` +
      `<text x="18" y="30" font-size="20" letter-spacing="2">${shape.title}</text>` +
      '<text x="18" y="48" font-size="12" font-style="italic">as observed by a Castaway, 1846</text>' +
      '<text x="510" y="78" font-size="10" font-style="italic">here be monsters</text></g>';
    top += at(camp[0], camp[1], 1, 1, P('M-7 4 L0 -8 L7 4 Z', pal.paper, 1.2) + P('M0 -8 V4', null, 0.8)) +
      `<text x="${camp[0]}" y="${camp[1] + 18}" text-anchor="middle" font-size="12" font-style="italic" ${font}>Camp</text>`;
    locs.forEach((l) => {
      top += marker(l, font);
    });
    top += frame(W, H);
    return svg(W, H, b, top, 'A hand-drawn chart of the island');
  };

  /* ---------------- the archipelago ---------------- */

  /** A small island at (x, y), `w` wide, as an outline with an echo or two of shallows around it. */
  function islet(r, x, y, w, h, fill) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const k = 0.8 + r() * 0.35;
      pts.push([x + Math.cos(a) * w * k, y + Math.sin(a) * h * k]);
    }
    const d = smooth(pts, true);
    const echo = (s) => `<path d="${d}" transform="translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})" fill="none" stroke="${pal.ink}" stroke-width="${f(1 / s * 0.5)}"/>`;
    return echo(1.5) + echo(1.25) + P(d, fill || pal.paper, 1.3);
  }

  /** How each island of the archipelago is drawn on the sea chart, by id. */
  const ISLE_ART = {
    islet: (r, x, y) => islet(r, x, y, 9, 6, 'url(#dots2)'),
    high: (r, x, y) => islet(r, x, y, 26, 17) +
      P(`M${x - 16} ${y + 6}L${x} ${y - 12}L${x + 16} ${y + 6}`, pal.paper, 1.1) + P(`M${x} ${y - 12}L${x + 16} ${y + 6}L${x + 2} ${y + 6}Z`, 'url(#h2)', 0) +
      P(`M${x - 22} ${y - 22}q8 -8 18 -2q10 -8 20 0q8 -2 10 6`, null, 0.9),
    rock: (r, x, y) => islet(r, x, y, 7, 6, 'url(#h1)'),
    sandbar: (r, x, y) => islet(r, x, y, 18, 4, 'url(#dots2)'),
    smoke: (r, x, y) => islet(r, x, y, 30, 14) + P(`M${x - 8} ${y - 8}c-4 -8 4 -12 0 -20M${x + 10} ${y - 6}c-4 -8 4 -12 0 -20`, null, 0.9),
  };

  /** Feathered arrows across the open sea, flying the way the wind blows, or a note of the calm. */
  function windArrows(wind, font) {
    if (wind === 'calm') return `<text x="300" y="104" text-anchor="middle" font-size="13" font-style="italic" ${font}>a flat calm</text>`;
    const dir = wind === 'westerly' ? 1 : -1;
    let s = '';
    [[250, 96], [310, 112], [370, 96]].forEach(([x, y]) => {
      const tip = x + dir * 26;
      const tail = x - dir * 26;
      s += P(`M${tail} ${y}H${tip}M${tip - dir * 7} ${y - 4}L${tip} ${y}L${tip - dir * 7} ${y + 4}`, null, 1.1) +
        P(`M${tail} ${y}l${-dir * 4} -5M${tail + dir * 5} ${y}l${-dir * 4} -5`, null, 0.9);
    });
    return s + `<text x="310" y="132" text-anchor="middle" font-size="11" font-style="italic" ${font}>${wind === 'westerly' ? 'a westerly' : 'the trades'}</text>`;
  }

  /**
   * Draws the chart of the archipelago: the castaway's island at `home`,
   * each charted island in `isles` (id, name, x, y, visited, blocked) with
   * a marker that sails there, a little boat where the castaway is
   * (`here`), and the `wind`. Away from home, the island itself is the
   * marker to sail for.
   */
  DW.art.sea = function (st) {
    const r = rng(29);
    const font = `font-family="'IM Fell English', Georgia, serif" fill="${pal.ink}"`;
    const [hx, hy] = st.home;
    let b = seaLines(r);

    // the castaway's island, the same coast as the island chart in little
    const pts = ISLAND.map(([x, y]) => [hx + (x - 310) * 0.26, hy + (y - 165) * 0.26]);
    const coast = smooth(pts, true);
    b += P(coast, 'none', 0.5, `transform="translate(${hx} ${hy}) scale(1.3) translate(${-hx} ${-hy})"`) + P(coast, pal.paper, 1.4);
    b += P(`M${hx - 8} ${hy - 14}L${hx} ${hy - 24}L${hx + 8} ${hy - 14}`, pal.paper, 1);

    // dashed tracks to the islands already landed on
    st.isles.filter((l) => l.visited).forEach((l) => {
      b += P(`M${hx} ${hy}L${l.x} ${l.y}`, null, 0.7, 'stroke-dasharray="3 5"');
    });
    st.isles.forEach((l) => {
      b += ISLE_ART[l.id](rng(l.x * 7 + l.y), l.x, l.y);
    });
    b += compassRose(548, 286);

    let top = `<g ${font}><text x="548" y="248" text-anchor="middle" font-size="12">N</text>` +
      '<text x="18" y="30" font-size="20" letter-spacing="2">A CHART of the ISLANDS</text>' +
      '<text x="18" y="48" font-size="12" font-style="italic">and of the Winds that govern them</text></g>';
    top += windArrows(st.wind, font);

    // the boat, off the west shore of home or beside whichever island the castaway is on
    const here = st.isles.find((i) => i.id === st.here);
    const boat = here ? [here.x + 18, here.y + 16] : [hx - 66, hy + 6];
    top += at(boat[0], boat[1], 1, 1, P('M-8 0h16l-3 4h-10Z', pal.ink, 0.8) + P('M0 0V-12', null, 1) + P('M1 -11l6 9h-6Z', pal.paper, 0.8));

    const homeMarker = { id: 'home', name: 'Your Island', x: hx, y: hy, visited: true, blocked: st.here === 'home' || st.homeBlocked };
    top += st.here === 'home'
      ? `<text x="${hx}" y="${hy + 46}" text-anchor="middle" font-size="12" font-style="italic" ${font}>Your Island</text>`
      : marker(homeMarker, font, 'data-isle="home"');
    st.isles.forEach((l) => {
      top += st.here === 'home'
        ? marker(l, font, `data-isle="${l.id}"`)
        : `<text x="${l.x}" y="${l.y - 14}" text-anchor="middle" font-size="12" font-style="italic" ${font} stroke="${pal.paper}" stroke-width="3" paint-order="stroke">${l.name}</text>`;
    });
    top += frame(W, H);
    return svg(W, H, b, top, 'A hand-drawn chart of the archipelago');
  };
})();
