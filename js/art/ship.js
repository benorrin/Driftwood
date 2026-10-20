/* Driftwood — aboard the whaler.
 * The third chapter's pictures: the deck of the Perseverance in place of
 * the camp, the chart of her passage to Valparaíso, and the deck plan of
 * the Meridian on which the castaway's recollections are laid out. */
(function () {
  'use strict';

  const DW = window.DW;
  const draw = DW.draw;
  const {
    pal, f, rng, uid, svg, frame, P, circle, at, darkness,
    sky, sea, sun, moon, stars, birds, fire, sitter, stander, smooth,
  } = draw;

  /** The chart lettering, in the engraver's face. */
  const font = () => `font-family="'IM Fell English', Georgia, serif" fill="${pal.ink}"`;

  /** A paper halo behind chart lettering, so it reads over the hatching. */
  const halo = () => `stroke="${pal.paper}" stroke-width="5" stroke-linejoin="round" paint-order="stroke"`;

  /** Spouts on the horizon, each leaning forward the way a sperm whale's does, from (x, y). */
  function spouts(xs, y) {
    return xs.map((x) => P(`M${x} ${y}q-2 -7 -9 -12M${x} ${y}q-1 -9 -5 -14M${x} ${y}q1 -6 -2 -11`, null, 0.9) +
      P(`M${x - 6} ${y + 2}q6 -3 12 0`, null, 1.4)).join('');
  }

  /** Thick smoke from the try-works at (x, y), rolling away to leeward. */
  function trySmoke(x, y) {
    return P(`M${x} ${y}C${x - 10} ${y - 40} ${x + 40} ${y - 60} ${x + 30} ${y - 100}C${x + 20} ${y - 130} ${x + 80} ${y - 150} ${x + 110} ${y - 170}`, null, 9, `stroke="${pal.ink}" opacity="0.55"`) +
      P(`M${x + 6} ${y - 6}C${x - 4} ${y - 44} ${x + 46} ${y - 62} ${x + 36} ${y - 102}`, null, 3, `stroke="${pal.paper}" opacity="0.6"`);
  }

  /**
   * Draws the deck of the Perseverance in place of the camp. `st` has
   * night, trying (the try-works alight), wind ('fair', 'foul', 'calm' or
   * 'gale'), blows (whales in sight), and the shipmates aboard: tupa,
   * hollis and jem.
   */
  DW.art.deck = function (st) {
    const r = rng(43);
    const W = 600;
    const H = 300;
    const hz = 150;
    const gale = st.wind === 'gale';

    let b = sky(r, W, 0, hz, st.night || gale);
    if (!gale) b += st.night ? moon(480, 44, 14) + stars(r, W, hz - 20) : sun(470, 58, 16, true) + birds(r, 330, 70, 3, 60);
    b += sea(r, W, hz, 212, st.night || gale);
    if (st.blows && !st.night) b += spouts([238, 262, 300], hz - 1);

    // the mainmast and its shrouds, coming down to the channels at the rail
    b += P('M84 300 V0', null, 9) + P('M84 300 V0', null, 5, `stroke="${pal.paper}"`);
    let ratlines = '';
    for (let y = 30; y < 190; y += 13) {
      const k = y / 196;
      ratlines += `M${f(100 + 26 * k)} ${y}H${f(100 + 62 * k)}`;
    }
    b += P('M100 0 L126 196 M100 0 L144 196 M100 0 L162 196', null, 1.2) + P(ratlines, null, 0.7);

    // the whaleboat hanging in her davits over the side
    b += P('M432 198 V142 Q432 130 446 130 M548 198 V142 Q548 130 534 130', null, 3.2);
    b += P('M446 130 V166 M534 130 V166', null, 0.8);
    b += P('M410 168 Q490 190 570 168 L560 180 Q490 198 420 180Z', 'url(#h3)', 1.2) + P('M418 170 Q490 186 562 170', null, 0.8, `stroke="${pal.paper}"`);

    // the bulwark and its rail, and the deck planking below
    b += P('M0 192 Q300 204 600 190 L600 216 Q300 226 0 216Z', 'url(#hh)', 1.3);
    b += P('M0 192 Q300 204 600 190', null, 3);
    let stanchions = '';
    for (let x = 30; x < 600; x += 46) stanchions += `M${x} ${f(193 + Math.sin((x / 600) * Math.PI) * 10)}v22`;
    b += P(stanchions, null, 2);
    b += P('M0 216 Q300 226 600 216 L600 300 L0 300Z', pal.paper, 1);
    let seams = '';
    [232, 248, 266, 286].forEach((y, i) => {
      seams += `M0 ${y}H600`;
      for (let x = (i * 70) % 140; x < 600; x += 140 + i * 10) seams += `M${x} ${y}v${i * 2 + 14}`;
    });
    b += P(seams, null, 0.6);

    // the try-works: a brick furnace with two great pots, between the masts
    b += P('M196 270 V214 H316 V270Z', 'url(#hx)', 1.4);
    b += `<ellipse cx="226" cy="214" rx="22" ry="6" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="1.2"/>` +
      `<ellipse cx="286" cy="214" rx="22" ry="6" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="1.2"/>`;
    b += P('M236 270 V250 Q256 238 276 250 V270Z', pal.ink, 1);
    if (st.trying) b += trySmoke(256, 206);

    // the shipmates, and the castaway among them
    if (st.hollis) b += sitter(150, 276, 1.05, 1, true);
    if (st.jem) b += sitter(470, 278, 1.05, -1);
    if (st.tupa) b += stander(400, 282, 1.15, -1);
    b += stander(360, 282, 1.15, 1);

    if (gale) {
      let rain = '';
      for (let i = 0; i < 150; i++) rain += `M${f(r() * 700)} ${f(r() * 300)}l-14 26`;
      b += P(rain, null, 0.7, `stroke="${pal.paper}"`);
    }

    // night over everything but the furnace's glow, or the binnacle lamp's
    let top = '';
    if (st.night || gale) {
      top += st.trying ? darkness(W, H, 256, 250, 160, 0.75) : darkness(W, H, 330, 236, st.night ? 70 : 0, gale ? 0.5 : 0.75);
    }
    top += st.trying ? `<g>${fire(256, 270, 3, 0.7)}</g>` : '';
    if (st.night && !st.trying) top += P('M324 222 h12 v14 h-12Z', pal.paper, 1.2) + P('M330 222 v-6', null, 1.2);
    top += frame(W, H);
    return svg(W, H, b, top, st.trying ? 'The deck of a whaler, her try-works alight' : 'The deck of a whaler at sea');
  };

  /** An eight-pointed compass rose centred on (rx, ry), each point half ink, half paper. */
  function rose(rx, ry, rad) {
    let s = circle(rx, ry, rad, pal.paper, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const L = i % 2 ? rad * 0.6 : rad * 1.1;
      const tip = [rx + Math.cos(a) * L, ry + Math.sin(a) * L];
      const side = (d) => [rx + Math.cos(a + d) * 4, ry + Math.sin(a + d) * 4];
      const [lx, ly] = side(-Math.PI / 2);
      const [qx, qy] = side(Math.PI / 2);
      s += P(`M${rx} ${ry}L${f(tip[0])} ${f(tip[1])}L${f(lx)} ${f(ly)}Z`, pal.ink, 0.6) +
        P(`M${rx} ${ry}L${f(tip[0])} ${f(tip[1])}L${f(qx)} ${f(qy)}Z`, pal.paper, 0.6);
    }
    return s;
  }

  /** Where a ship `miles` from Valparaíso stands on the passage chart, out of a passage of `total` miles. */
  function onChart(miles, total) {
    const p = Math.max(0, Math.min(1, 1 - miles / total));
    return [50 + p * 470, 104 + 84 * Math.sin((p * Math.PI) / 2)];
  }

  /**
   * Draws the chart of the passage from the islands to Valparaíso. `st`
   * has miles (still to run), total (the whole passage), noons (the miles
   * left at each noon so far, pricked off along the track), marks (things
   * that happened on the way: { miles, label }), juan (whether Juan
   * Fernández has been raised) and wind.
   */
  DW.art.passage = function (st) {
    const r = rng(53);
    const W = 600;
    const H = 300;
    const ft = font();
    const pos = (m) => onChart(m, st.total);

    // the sea, ruled faintly, and the coast of Chile with the Andes behind it
    let b = '';
    for (let y = 14; y < H; y += 18) b += P(`M0 ${y}H${W}`, null, 0.35, 'stroke-dasharray="1 5"');
    const coast = [];
    for (let y = -10; y <= H + 10; y += 14) coast.push([548 + (r() - 0.5) * 14 + (y > 180 && y < 200 ? -10 : 0), y]);
    b += P(`${smooth(coast, false)} L610 ${H + 10} L610 -10Z`, 'url(#h1)', 1.4);
    for (let y = 30; y < H; y += 38) b += P(`M${574 + (y % 3) * 6} ${y + 8}l8 -14l8 14`, pal.paper, 1);

    // the islands astern, and Juan Fernández ahead
    b += P('M40 92 q8 -8 18 -2 q6 8 -4 12 q-10 2 -14 -10Z', 'url(#h2)', 1) + P('M70 112 q4 -4 9 0 q2 5 -4 6 q-6 0 -5 -6Z', 'url(#h2)', 0.9);
    const [jx, jy] = pos(360);
    b += P(`M${jx - 14} ${jy + 14} q4 -12 12 -10 q6 -10 12 0 q6 2 2 10 q-12 6 -26 0Z`, st.juan ? 'url(#h2)' : 'url(#h1)', 1);

    // the track so far, a noon prick for each day, and the ship where she is now
    const [sx, sy] = pos(st.total);
    const [nx, ny] = pos(st.miles);
    const pts = [];
    for (let m = st.total; m > st.miles; m -= 40) pts.push(pos(m));
    pts.push([nx, ny]);
    if (pts.length > 1) b += P(smooth(pts, false), null, 1.1, 'stroke-dasharray="5 4"');
    const ahead = [];
    for (let m = st.miles; m > 0; m -= 40) ahead.push(pos(m));
    ahead.push(pos(0));
    if (ahead.length > 1) b += P(smooth(ahead, false), null, 0.5, 'stroke-dasharray="1 6"');
    (st.noons || []).forEach((m) => {
      const [x, y] = pos(m);
      b += circle(f(x), f(y), 2, pal.ink);
    });
    b += rose(68, 246, 26);

    let top = `<g ${ft}>` +
      '<text x="18" y="30" font-size="20" letter-spacing="2">The PASSAGE to VALPARAÍSO</text>' +
      '<text x="18" y="48" font-size="12" font-style="italic">pricked off at noon, in the <tspan font-style="normal">Perseverance</tspan></text>' +
      `<text x="${sx - 6}" y="${sy - 24}" font-size="12" font-style="italic" ${halo()}>the Island of Fires</text>` +
      `<text x="${jx}" y="${jy + 32}" text-anchor="middle" font-size="12" font-style="italic" ${halo()}>${st.juan ? 'Juan Fernández' : 'Juan Fernández?'}</text>` +
      `<text x="586" y="${pos(0)[1] + 28}" text-anchor="end" font-size="13" font-style="italic" ${halo()}>Valparaíso</text>` +
      `<text x="590" y="70" text-anchor="end" font-size="12" letter-spacing="3" ${halo()}>CHILE</text>` +
      `<text x="68" y="212" text-anchor="middle" font-size="11">N</text>` +
      `<text x="300" y="286" text-anchor="middle" font-size="12" font-style="italic" ${halo()}>${st.windName}</text></g>`;
    top += circle(f(pos(0)[0] + 4), f(pos(0)[1] + 8), 4, pal.ink, 1);
    (st.marks || []).forEach((mk) => {
      const [x, y] = pos(mk.miles);
      top += P(`M${f(x - 4)} ${f(y - 4)}l8 8M${f(x + 4)} ${f(y - 4)}l-8 8`, null, 1.2) +
        `<text x="${f(x)}" y="${f(y - 10)}" text-anchor="middle" font-size="11" font-style="italic" ${ft} ${halo()}>${mk.label}</text>`;
    });
    // the ship herself, a little hull and sail at the head of the track
    top += at(f(nx), f(ny), 1, 1, P('M-9 0h18l-4 5h-10Z', pal.ink, 0.8) + P('M0 0V-14', null, 1) + P('M-6 -13h12l-1 10h-10Z', pal.paper, 0.8));
    top += frame(W, H);
    return svg(W, H, b, top, 'A chart of the passage from the islands to Valparaíso');
  };

  /** The outline of the Meridian's deck, seen from above, stern to the left and bow to the right. */
  const HULL = 'M40 78 Q300 56 470 72 Q556 92 580 120 Q556 148 470 168 Q300 184 40 162 Z';

  /**
   * Draws the deck plan of the Meridian on which a recollection is laid
   * out, in the manner of the charts. `figs` are the figures in it, each
   * { n, x, y, below }: numbered markers where men stood, dashed if they
   * were below decks. `opts` may have night (dark but for a lantern at
   * `opts.light`, [x, y, radius]), fire (blue fire on the yards) and calm
   * (the sea about her flat).
   */
  DW.art.deckPlan = function (figs, opts) {
    opts = opts || {};
    const r = rng(61);
    const W = 600;
    const H = 240;
    const ft = font();
    const clip = uid('c');

    // the sea about her, and her wake
    let b = `<rect width="${W}" height="${H}" fill="url(#${opts.calm ? 'hh' : 'h1'})"/>`;
    if (!opts.calm) {
      let waves = '';
      for (let i = 0; i < 26; i++) waves += `M${f(r() * W)} ${f(r() * H)}q6 -4 12 0`;
      b += P(waves, null, 1.2, `stroke="${pal.paper}"`);
    }
    b += P('M40 100 Q10 98 -10 92 M40 140 Q10 142 -10 148', null, 1.4, `stroke="${pal.paper}"`);

    // the deck: planking inside the hull, the bulwarks, the poop and its break
    b += `<clipPath id="${clip}"><path d="${HULL}"/></clipPath>`;
    b += P(HULL, pal.paper, 2.4);
    let planks = '';
    for (let y = 66; y < 180; y += 7) planks += `M30 ${y}H590`;
    b += `<g clip-path="url(#${clip})">${P(planks, null, 0.35)}</g>`;
    b += P('M48 84 Q300 64 468 80 Q546 98 566 120 Q546 142 468 160 Q300 176 48 156', null, 0.8);
    b += P('M160 72 V168', null, 1.6);
    b += P('M580 120 H600', null, 3);

    // the yards across her, and the masts
    [[170, 56], [300, 50], [430, 54]].forEach(([x, half]) => {
      b += P(`M${x} ${120 - half - 12} V${120 + half + 12}`, null, 1, 'stroke-dasharray="7 3"');
      b += circle(x, 120, 7, pal.ink);
    });

    // the wheel, the skylight over the master's cabin, and its door at the break of the poop
    b += circle(62, 120, 9, pal.paper, 1.2) + P('M53 120h18M62 111v18M56 114l12 12M68 114l-12 12', null, 0.7);
    b += P('M104 108 H138 V132 H104Z', 'url(#hv)', 1.2);
    b += P('M160 112 h-6 v16 h6', null, 1.4);
    // the longboat on her chocks, the main hatch, the galley, the fore hatch and the fo'c'sle scuttle
    b += P('M214 112 Q246 104 278 112 Q284 120 278 128 Q246 136 214 128 Q208 120 214 112Z', 'url(#h2)', 1.1);
    b += P('M330 106 H366 V134 H330Z', 'url(#hx)', 1.2);
    b += P('M374 100 H412 V140 H374Z', pal.paper, 1.4) + circle(404, 108, 3, pal.ink);
    b += P('M452 112 H470 V128 H452Z', 'url(#hx)', 1);
    b += P('M506 114 H518 V126 H506Z', pal.ink, 1);

    if (opts.fire) {
      // the corposants: blue fire at every yard-arm
      [[170, 52], [170, 188], [300, 58], [300, 182], [430, 54], [430, 186]].forEach(([x, y]) => {
        b += circle(x, y, 5, pal.paper, 1) + P(`M${x - 9} ${y}h4M${x + 5} ${y}h4M${x} ${y - 9}v4M${x} ${y + 5}v4`, null, 0.8);
      });
    }

    let top = '';
    if (opts.night) {
      const [lx, ly, lr] = opts.light || [300, 120, 0];
      top += darkness(W, H, lx, ly, lr, 0.55);
    }
    if (opts.labels !== false) {
      top += `<g ${ft} font-size="10" font-style="italic">` +
        `<text x="62" y="146" text-anchor="middle" ${halo()}>wheel</text>` +
        `<text x="121" y="100" text-anchor="middle" ${halo()}>skylight</text>` +
        `<text x="186" y="150" text-anchor="middle" ${halo()}>cabin door</text>` +
        `<text x="348" y="148" text-anchor="middle" ${halo()}>main hatch</text>` +
        `<text x="393" y="94" text-anchor="middle" ${halo()}>galley</text>` +
        `<text x="512" y="142" text-anchor="middle" ${halo()}>fo'c'sle</text></g>`;
    }
    figs.forEach((g) => {
      top += g.below
        ? `<circle cx="${g.x}" cy="${g.y}" r="9" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="1.2" stroke-dasharray="3 2"/>` +
          `<text x="${g.x}" y="${g.y + 4}" text-anchor="middle" font-size="11" ${ft}>${g.n}</text>`
        : `<circle cx="${g.x}" cy="${g.y}" r="9" fill="${pal.ink}" stroke="${pal.paper}" stroke-width="1.5"/>` +
          `<text x="${g.x}" y="${g.y + 4}" text-anchor="middle" font-size="11" font-family="'IM Fell English', Georgia, serif" fill="${pal.paper}">${g.n}</text>`;
    });
    top += frame(W, H);
    return svg(W, H, b, top, 'A plan of the Meridian\'s deck, with numbered figures where men stood');
  };
})();
