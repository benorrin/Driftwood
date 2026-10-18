/* Driftwood — the chart.
 * A hand-drawn map of the island in the old style: echoing coastlines,
 * hachured hills, a compass rose, a sea serpent, and a clickable marker for
 * each place the castaway knows of. */
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

  /** Path data for the coast: the outline with a wobbling midpoint added along every edge. */
  function coastline(r) {
    const pts = [];
    ISLAND.forEach((p, i) => {
      const q = ISLAND[(i + 1) % ISLAND.length];
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
   * along the beaches. `cid` is the id the coast path is defined under.
   */
  function island(coast, cid) {
    const cx = 310;
    const cy = 165;
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
   * blocked): filled once visited, a question mark until then.
   */
  function marker(l, font) {
    const blocked = l.blocked ? ' blocked' : '';
    const mark = l.visited
      ? `<circle class="marker" cx="0" cy="0" r="5.5" fill="${pal.ink}" stroke="${pal.ink}"/>`
      : `<circle class="marker" cx="0" cy="0" r="6" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="1.3"/>` +
        `<text x="0" y="3.5" font-size="9" text-anchor="middle" ${font}>?</text>`;
    // labels near the edges are aligned inward so they stay on the chart
    const anchor = l.x > 440 ? 'end' : l.x < 170 ? 'start' : 'middle';
    const lx = anchor === 'end' ? 8 : anchor === 'start' ? -8 : 0;
    return `<g class="loc${blocked}" data-loc="${l.id}" tabindex="0" role="button" aria-label="${l.name}" transform="translate(${l.x} ${l.y})">` +
      `<circle r="16" fill="transparent"/>${mark}` +
      `<text x="${lx}" y="-11" text-anchor="${anchor}" font-size="13" font-style="italic" ${font} stroke="${pal.paper}" stroke-width="3" paint-order="stroke">${l.name}</text></g>`;
  }

  /** Draws the chart, with a marker for each of `locs` and the camp at `camp` ([x, y]). */
  DW.art.chart = function (locs, camp) {
    const r = rng(11);
    const coast = coastline(r);
    const cid = uid('coast');

    let b = seaLines(r);
    b += island(coast, cid);
    b += hills();
    b += jungle(r);
    // palms by the grove
    for (let i = 0; i < 5; i++) b += palm(r, 192 + i * 9, 246 - (i % 2) * 8, 16, 3, 0.18);
    // the reef
    b += P('M492 262 q14 -6 26 2 t28 4 t26 -6', null, 1, 'stroke-dasharray="2 4"') +
      P('M500 280 q16 6 32 -2 t30 2', null, 1, 'stroke-dasharray="2 4"');
    const rx = 72;
    const ry = 282;
    b += compassRose(rx, ry);
    // a sea serpent, as all good charts have
    b += P('M520 52 q8 -12 16 0 t16 0 t16 0', null, 2.4) + P('M568 52 q6 -10 12 -6 l4 4', null, 2.4) + circle(579, 46, 1, pal.paper);

    // labels and markers sit above the roughening filter so they stay crisp
    const font = `font-family="'IM Fell English', Georgia, serif" fill="${pal.ink}"`;
    let top = `<g ${font}><text x="${rx}" y="${ry - 38}" text-anchor="middle" font-size="12">N</text>` +
      '<text x="18" y="30" font-size="20" letter-spacing="2">A CHART of the ISLAND</text>' +
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
})();
