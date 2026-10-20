/* Driftwood — location scenes.
 * The illustrations (600 × 240) at the head of story and journey cards. */
(function () {
  'use strict';

  const DW = window.DW;
  const draw = DW.draw;
  const {
    pal, f, rng, SW, SH, framed, P, circle, at, backdrop, ground, darkness,
    sky, sea, seascape, sun, moon, stars, birds, palm, rock, tufts, headland, leaf,
    fire, sitter, stander, raft, ship, longboat, cask,
  } = draw;

  /**
   * A boar's skull on a stake planted at (x, y): a broad brow narrowing to a
   * long snout, with short tusks curling up beside it.
   */
  function skullStake(x, y) {
    return P(`M${x} ${y} V${y - 50}`, null, 2) +
      P(`M${x - 11} ${y - 62} Q${x} ${y - 72} ${x + 11} ${y - 62} L${x + 5} ${y - 36} Q${x} ${y - 33} ${x - 5} ${y - 36}Z`, pal.paper, 1.2) +
      circle(x - 4.5, y - 59, 2.4, pal.ink) + circle(x + 4.5, y - 59, 2.4, pal.ink) +
      circle(x - 1.6, y - 38, 0.9, pal.ink) + circle(x + 1.6, y - 38, 0.9, pal.ink) +
      P(`M${x - 5} ${y - 40} q-4 -1 -4 -7 M${x + 5} ${y - 40} q4 -1 4 -7`, null, 1.4);
  }

  /** Hollis, the wild man, standing at (x, y): bareheaded, hair to his shoulders, a spear upright in his fist. */
  function wildMan(x, y, sc) {
    return at(x, y, sc, sc,
      P('M-5 -29 L5 -29 L6 -14 L3.5 0 L1 0 L0 -12 L-1 0 L-3.5 0 L-6 -14 Z', pal.ink, 0.6) +
      circle(0, -34, 4.6, pal.ink) +
      P('M-4 -37 l-4 11 M-2 -38 l-3 9 M4 -37 l4 11 M2 -38 l3 9', null, 1.2) +
      P('M-4 -26 L-7 -16 L-6 -10 M4 -26 L10 -21', null, 3) +
      P('M11 4 V-52', null, 1.4) + P('M9 -50 L11 -59 L13 -50Z', pal.ink, 0.6));
  }

  /**
   * One of the people of the Island of Fires standing at (x, y), facing
   * right (flip with dir = -1): bareheaded, hair tied up, a cloth wrapped
   * at the waist; `opts.torch` puts a burning torch in the raised hand.
   */
  function islander(x, y, sc, dir, opts) {
    opts = opts || {};
    const arm = opts.torch
      ? P('M4 -26 L10 -34 L12 -42', null, 3) + P('M12 -42 l2 -10', null, 2) + fire(14, -50, 2, 0.18)
      : P('M4 -26 L8 -16 L7 -10', null, 3);
    return at(x, y, sc * dir, sc,
      P('M-5 -29 L5 -29 L5 -16 L-5 -16 Z', pal.ink, 0.6) +
      P('M-7 -16 L7 -16 L6 -8 L-6 -8 Z', 'url(#h2)', 0.8) +
      P('M-3 -8 L-3.5 0 M3 -8 L3.5 0', null, 2.6) +
      circle(0, -34, 4.6, pal.ink) + circle(1, -40, 2.4, pal.ink) +
      P('M-4 -26 L-7 -16 L-6 -10', null, 3) + arm);
  }

  /** The mended outrigger canoe under sail, its hull's left end at (x, y). */
  function canoe(x, y) {
    return P(`M${x} ${y - 8} Q${x + 90} ${y + 6} ${x + 180} ${y - 8} L${x + 186} ${y - 18} Q${x + 90} ${y - 4} ${x - 6} ${y - 18}Z`, 'url(#h3)', 1.3) +
      P(`M${x + 50} ${y - 12} L${x + 46} ${y - 30} M${x + 120} ${y - 12} L${x + 124} ${y - 30}`, null, 2) +
      P(`M${x + 30} ${y - 30} H${x + 140}`, null, 3) +
      P(`M${x + 86} ${y - 12} V${y - 96}`, null, 2.4) +
      P(`M${x + 88} ${y - 94} Q${x + 140} ${y - 70} ${x + 150} ${y - 22} L${x + 90} ${y - 18}Z`, 'url(#h1)', 1.2);
  }

  /** The signal pyre on the summit, optionally lit and pouring smoke. */
  function pyre(lit) {
    let logs = '';
    for (let i = 0; i < 9; i++) logs += `M${70 + i * 3} 116 L${100 + (i - 4) * 4} ${44 + i}`;
    let s = P(logs, null, 3) + P('M68 118 L100 40 L132 118Z', 'url(#h1)', 1);
    if (lit) s += P('M100 40 c-14 -14 10 -24 -4 -40', null, 2) + P('M88 60 q12 -40 12 -60 q4 30 14 60Z', 'url(#h2)', 1);
    return s;
  }

  const SCENES = {
    /** The title screen: the Meridian sails away as the longboat rows back. */
    title() {
      const r = rng(3);
      const hz = 150;
      let b = sky(r, SW, 0, hz, false) + sun(430, hz, 34, true);
      b += `<rect x="380" y="${hz}" width="110" height="10" fill="${pal.paper}"/>`;
      b += sea(r, SW, hz, SH, false);
      b += ship(452, hz + 4, 0.55, 1) + birds(r, 330, 70, 5, 80);
      b += headland(r, -10, hz + 2, 260, 64, 0);
      b += palm(r, 60, hz - 30, 60, 10, 0.45) + palm(r, 90, hz - 38, 70, -6, 0.5) + palm(r, 150, hz - 34, 56, 8, 0.42);
      b += longboat(330, 196, 0.9);
      b += ground(`M0 ${SH - 20}C120 ${SH - 30} 200 ${SH - 10} 300 ${SH - 18}S500 ${SH - 10} 600 ${SH - 22}`, 'url(#dots)', 1);
      b += sitter(220, SH - 8, 1.2, 1);
      return framed(b, 'A barque sails away from an island at dawn');
    },

    /**
     * The beach, with a palm, a rock and a piece of flotsam. `opts.ship`
     * puts a sail on the horizon and the castaway on the sand watching it;
     * `opts.ball` adds a leather ball with a face drawn on in charcoal.
     */
    beach(opts) {
      opts = opts || {};
      const r = rng(21);
      let b = seascape(r, 120, 175);
      if (opts.ship) b += ship(400, 126, 0.3, 1);
      b += ground('M0 170 C150 160 300 182 600 168', 'url(#dots)', 1.1);
      b += palm(r, 520, 230, 170, -30) + rock(r, 90, 214, 110, 40);
      b += P('M300 205 l18 -5 q4 -1 6 2 l1 5 q-12 6 -24 2Z', 'url(#h3)', 0.8);
      if (opts.ship) b += stander(250, 200, 1.4, 1, { wave: 1 });
      if (opts.ball) {
        b += circle(380, 196, 22, pal.paper, 1.4) +
          P('M380 174 q-10 22 0 44 M380 174 q10 22 0 44', null, 0.6) +
          circle(374, 192, 2.4, pal.ink) + circle(386, 192, 2.4, pal.ink) +
          P('M373 203 q7 6 14 0', null, 1.4);
      }
      return framed(b, opts.ship ? 'A sail on the horizon, seen from the beach' : 'The beach');
    },

    /** A message in a bottle, half-buried in the sand. */
    bottle() {
      const r = rng(23);
      let b = seascape(r, 110, 160);
      b += ground('M0 156 C150 146 300 166 600 152', 'url(#dots)', 1.1);
      b += '<g transform="translate(300 182) rotate(-18)">' +
        P('M-50 -14 H24 Q34 -14 38 -8 H54 V8 H38 Q34 14 24 14 H-50 Q-56 14 -56 0 Q-56 -14 -50 -14Z', 'url(#h1)', 1.4) +
        P('M54 -8 h8 v16 h-8', 'url(#h3)', 1) +
        P('M-44 -9 H20', null, 1, `stroke="${pal.paper}" stroke-width="3"`) +
        P('M-30 -6 q20 6 40 0 v8 q-20 6 -40 0Z', pal.paper, 0.8) +
        '</g>';
      b += tufts(r, 0, 600, 220, 8);
      return framed(b, 'A bottle half-buried in the sand');
    },

    /** The palm grove: tall palms over a floor of fallen fronds and nuts. */
    grove() {
      const r = rng(31);
      let b = seascape(r, 150, 160);
      b += ground('M0 165 C200 158 400 172 600 162', 'url(#dots)', 0);
      [[40, 220, 190, 20], [130, 228, 210, -10], [250, 214, 170, 30], [360, 226, 205, -18], [450, 216, 160, 14], [560, 230, 200, -26]].forEach(([x, y, h, l]) => {
        b += palm(r, x, y, h, l, 0.95);
      });
      let fronds = '';
      for (let i = 0; i < 9; i++) {
        const x = r() * 560 + 20;
        const y = 205 + r() * 30;
        fronds += `M${f(x)} ${f(y)}q30 -8 60 4`;
        for (let j = 0; j < 8; j++) fronds += `M${f(x + j * 7)} ${f(y - 1 + j * 0.3)}l-4 7`;
      }
      b += P(fronds, null, 0.8);
      for (let i = 0; i < 6; i++) b += circle(f(r() * 560 + 20), f(218 + r() * 16), 5, 'url(#h3)', 1);
      return framed(b, 'A grove of coconut palms');
    },

    /** Rock pools at low tide, with a starfish. */
    tidepools() {
      const r = rng(41);
      let b = seascape(r, 100, 150) + birds(r, 420, 40, 3, 60);
      b += rock(r, 120, 190, 280, 70) + rock(r, 470, 200, 300, 80) + rock(r, 300, 250, 420, 70);
      [[180, 205, 50], [400, 215, 64], [300, 230, 40]].forEach(([x, y, w]) => {
        b += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * 0.22}" fill="${pal.paper}"/>`;
        b += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * 0.22}" fill="url(#hh)" stroke="${pal.ink}" stroke-width="1.2"/>`;
        b += `<ellipse cx="${x - w * 0.2}" cy="${y}" rx="${w * 0.3}" ry="${w * 0.06}" fill="none" stroke="${pal.paper}" stroke-width="1.5"/>`;
      });
      let star = '';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        star += `${i ? 'L' : 'M'}${f(400 + Math.cos(a) * 9)} ${f(214 + Math.sin(a) * 4)}L${f(400 + Math.cos(a + 0.63) * 3)} ${f(214 + Math.sin(a + 0.63) * 1.5)}`;
      }
      b += P(star + 'Z', pal.ink, 0.6);
      return framed(b, 'Rock pools at low tide');
    },

    /** A spring falling between rocks into a clear pool. */
    spring() {
      const r = rng(51);
      let b = backdrop('url(#h1)');
      b += rock(r, 120, 240, 300, 240) + rock(r, 490, 240, 300, 230);
      b += P('M268 30 Q300 22 330 32 L318 196 L282 196Z', pal.paper, 1.2);
      let falls = '';
      for (let x = 272; x < 328; x += 4) falls += `M${x} ${f(32 + r() * 6)}L${f(x + (x - 300) * 0.15 + (r() - 0.5) * 3)} 196`;
      b += P(falls, null, 0.7, 'stroke-dasharray="14 3"');
      b += `<ellipse cx="300" cy="205" rx="140" ry="22" fill="url(#hh)" stroke="${pal.ink}" stroke-width="1.2"/>`;
      b += `<ellipse cx="300" cy="200" rx="46" ry="8" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="0.8"/>` +
        `<ellipse cx="300" cy="200" rx="70" ry="13" fill="none" stroke="${pal.ink}" stroke-width="0.6"/>`;
      for (let i = 0; i < 8; i++) {
        const x = i < 4 ? 20 + i * 40 : 440 + (i - 4) * 40;
        b += leaf(x, 236, 60 + r() * 30, -60 - r() * 60, 0.2);
      }
      return framed(b, 'A spring falling into a pool');
    },

    /** The wreck of the Calliope on her beam ends upon the reef. */
    wreck() {
      const r = rng(61);
      let b = seascape(r, 120) + birds(r, 140, 50, 6, 90);
      const ribs = 'M40 -10 Q60 30 50 58 M70 -10 Q90 30 80 58 M100 -10 Q118 26 110 58';
      b += '<g transform="translate(330 175) rotate(-14)">' +
        P('M-170 0 Q-160 50 -90 58 L120 58 Q170 40 186 -6 L150 -10 L-170 -10Z', 'url(#h2)', 1.6) +
        P('M-170 -10 L150 -10', null, 2) +
        P(ribs, null, 3, `stroke="${pal.paper}"`) +
        P(ribs, null, 1.3) +
        P('M-130 -10 L-110 -120 M-110 -120 l-18 -6', null, 4) +
        P('M-60 -10 L-10 -70 l6 -14', null, 4) +
        P('M-110 -110 Q-80 -96 -86 -70 L-96 -40 Q-104 -70 -122 -66Z', 'url(#h1)', 1) +
        P('M-110 -120 Q-60 -60 -20 -10 M-10 -70 Q30 -50 60 -10', null, 0.6) +
        '</g>';
      let foam = '';
      for (let i = 0; i < 26; i++) {
        const x = 120 + r() * 420;
        const y = 220 + r() * 14;
        foam += `M${f(x)} ${f(y)}q6 -6 12 0`;
      }
      b += P(foam, null, 1) + rock(r, 140, 236, 110, 20) + rock(r, 520, 238, 120, 22);
      return framed(b, 'The wreck of the Calliope upon the reef');
    },

    /** A path through dense jungle: trunks, hanging vines and broad leaves. */
    jungle() {
      const r = rng(71);
      let b = backdrop('url(#h3)');
      b += P('M240 240 Q280 140 300 60 Q320 140 380 240Z', pal.paper, 0);
      b += '<path d="M240 240 Q280 140 300 60 Q320 140 380 240Z" fill="url(#h1)" opacity="0.6"/>';
      [40, 110, 170, 430, 500, 560].forEach((x, i) => {
        const w = 14 + (i % 3) * 6;
        b += P(`M${x - w / 2} 240 L${x - w / 3} 0 L${x + w / 3} 0 L${x + w / 2} 240Z`, pal.paper, 1.2);
        b += `<rect x="${x}" y="0" width="${w / 2}" height="240" fill="url(#h2)"/>`;
      });
      let vines = '';
      for (let i = 0; i < 9; i++) {
        const x = r() * 600;
        vines += `M${f(x)} 0 C${f(x + 30)} 60 ${f(x - 30)} 120 ${f(x + 10)} ${f(140 + r() * 60)}`;
      }
      b += P(vines, null, 1.4);
      for (let i = 0; i < 16; i++) {
        const left = i % 2 === 0;
        const x = left ? r() * 220 : 380 + r() * 220;
        b += leaf(x, 200 + r() * 40, 50 + r() * 50, left ? -20 - r() * 70 : -110 - r() * 70, 0.3);
      }
      return framed(b, 'A path through dense jungle');
    },

    /** The black mouth of a cave, toothed with stalactites. */
    cave() {
      const r = rng(81);
      let b = backdrop('url(#hx)');
      b += rock(r, 300, 250, 600, 260);
      b += P('M160 240 Q170 70 300 56 Q430 70 440 240Z', pal.ink, 2);
      let tites = '';
      for (let x = 190; x < 420; x += 18 + r() * 10) {
        const y = 60 + Math.abs(x - 300) * 0.5;
        tites += `M${f(x - 6)} ${f(y)}L${f(x)} ${f(y + 16 + r() * 22)}L${f(x + 6)} ${f(y)}Z`;
      }
      b += P(tites, 'url(#h2)', 0.8, `stroke="${pal.paper}"`);
      b += P('M120 240 Q140 200 180 210 Q210 200 220 240Z', 'url(#h2)', 1) + leaf(470, 236, 70, -70, 0.25) + leaf(500, 236, 60, -40, 0.25);
      return framed(b, 'The mouth of a cave');
    },

    /** Captain Hale's skeleton in the cave, his journal in his lap. */
    bones() {
      let b = backdrop('url(#hx)');
      b += `<circle cx="300" cy="140" r="180" fill="${pal.paper}" opacity="0.75"/>`;
      b += circle(300, 140, 120, pal.paper);
      // skull
      b += P('M276 104 Q276 74 300 72 Q324 74 324 104 Q324 116 316 120 L316 130 L284 130 L284 120 Q276 116 276 104Z', pal.paper, 1.6);
      b += `<ellipse cx="290" cy="104" rx="7" ry="8" fill="${pal.ink}"/><ellipse cx="310" cy="104" rx="7" ry="8" fill="${pal.ink}"/>` +
        P('M300 112 l-4 8 h8Z', pal.ink, 0.6) +
        P('M288 124 V130 M294 124 V130 M300 124 V130 M306 124 V130 M312 124 V130', null, 0.8);
      // ribs and arms
      let ribs = '';
      for (let i = 0; i < 5; i++) {
        ribs += `M300 ${142 + i * 9}q-${26 - i * 2} -2 -${30 - i * 2} 10M300 ${142 + i * 9}q${26 - i * 2} -2 ${30 - i * 2} 10`;
      }
      b += P('M300 136 V196', null, 3) + P(ribs, null, 1.6);
      b += P('M264 146 L246 186 L264 206 M336 146 L356 182 L330 200', null, 3);
      b += P('M286 200 L250 226 M314 200 L360 228', null, 4);
      // the journal
      b += P('M318 196 l40 -6 l6 22 l-40 6Z', 'url(#h2)', 1.2) + P('M322 197 l4 22', null, 2);
      b += P('M40 240 Q120 200 200 236 M400 236 Q480 196 560 240', 'url(#h2)', 1);
      return framed(b, 'A skeleton in the cave, a journal in its lap');
    },

    /** The wild man's hut of poles and thatch, ringed by boar skulls on stakes. */
    /** The wild man's hut, ringed by boar skulls; `opts.man` puts him before it. */
    hut(opts) {
      opts = opts || {};
      const r = rng(91);
      let b = sky(r, SW, 0, 110, false);
      b += `<rect y="70" width="${SW}" height="80" fill="url(#h2)"/>`;
      b += palm(r, 60, 200, 170, 20) + palm(r, 540, 200, 180, -24);
      b += ground('M0 190 C200 182 400 196 600 186', 'url(#dots)', 1);
      b += P('M240 100 Q300 40 360 100 L376 130 L224 130Z', 'url(#h2)', 1.3);
      let thatch = '';
      for (let x = 230; x < 372; x += 5) thatch += `M${x} 130 l${(x - 300) * 0.06} -${12 + (x % 3) * 3}`;
      b += P(thatch, null, 0.8);
      let poles = '';
      for (let x = 238; x <= 362; x += 7) poles += `M${x} 130 V196`;
      b += `<rect x="236" y="130" width="128" height="66" fill="${pal.paper}"/>` + P(poles, null, 1.6);
      b += P('M286 196 V150 Q300 140 314 150 V196Z', pal.ink, 1);
      b += P('M300 46 c-8 -10 8 -18 0 -28', null, 0.8, 'class="smoke"');
      [[180, 200], [440, 202], [490, 198]].forEach(([x, y]) => {
        b += skullStake(x, y);
      });
      if (opts.man) b += wildMan(392, 200, 1.5);
      return framed(b, opts.man ? 'A wild man with a spear before his hut, boar skulls on stakes' : 'A hut of poles and thatch, boar skulls on stakes');
    },

    /**
     * The view from the summit over the sea lane. `opts.pyre` replaces the
     * watching figure with the signal pyre (`opts.lit` sets it alight);
     * `opts.ship` puts a sail on the horizon.
     */
    summit(opts) {
      opts = opts || {};
      const r = rng(101);
      const hz = 70;
      let b = seascape(r, hz);
      if (opts.ship) b += ship(470, hz + 6, 0.32, -1);
      b += birds(r, 320, 140, 4, 60);
      b += P('M0 110 Q60 104 120 120 Q170 140 200 180 Q230 210 250 240 L0 240Z', 'url(#h2)', 1.6);
      b += P('M0 110 Q60 104 120 120 Q170 140 200 180', null, 2.5);
      b += tufts(r, 10, 160, 122, 8);
      b += opts.pyre ? pyre(opts.lit) : stander(96, 116, 1.6, 1);
      return framed(b, 'The view from the summit');
    },

    /** A still lagoon behind the reef, with an old outrigger canoe drawn up on the sand. */
    lagoon() {
      const r = rng(131);
      let b = seascape(r, 90, 130) + birds(r, 260, 50, 3, 60);
      b += P('M0 128 Q150 122 300 130 T600 126', null, 1, 'stroke-dasharray="2 4"');
      b += ground('M0 140 C200 132 400 146 600 138', 'url(#dots)', 1);
      b += `<ellipse cx="300" cy="176" rx="250" ry="26" fill="url(#hh)" stroke="${pal.ink}" stroke-width="1.2"/>` +
        `<ellipse cx="250" cy="172" rx="90" ry="6" fill="none" stroke="${pal.paper}" stroke-width="1.6"/>`;
      b += palm(r, 50, 206, 150, 12) + palm(r, 556, 210, 140, -16);
      // the canoe: hull, outrigger float and booms, and a carved face on the prow
      b += P('M196 214 Q300 228 404 214 L412 202 Q300 218 190 204Z', 'url(#h3)', 1.3);
      b += P('M220 196 L224 186 M300 202 L302 186 M380 196 L376 186', null, 2) + P('M206 184 Q300 180 394 184', null, 3);
      b += circle(414, 200, 6, pal.paper, 1.2) + circle(412, 199, 1.2, pal.ink) + circle(417, 199, 1.2, pal.ink) + P('M411 203 q3 2 6 0', null, 1);
      b += tufts(r, 0, 600, 232, 10);
      return framed(b, 'An old outrigger canoe beside a lagoon');
    },

    /** The ruins of a sealers' camp: a fallen hut, a rusted try-pot and a cross. */
    sealers() {
      const r = rng(141);
      let b = seascape(r, 110, 160);
      b += ground('M0 160 C150 150 350 168 600 156', pal.paper, 1.1);
      b += rock(r, 560, 214, 130, 54);
      b += P('M110 214 L168 124 L236 216 M140 176 L262 204', null, 3);
      b += P('M150 140 L250 170 L236 196 L130 168Z', 'url(#h2)', 1.2);
      b += P('M320 192 Q320 226 352 226 Q384 226 384 192Z', 'url(#h3)', 1.4) +
        `<ellipse cx="352" cy="192" rx="32" ry="6" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="1.2"/>`;
      b += P('M450 216 V156 M434 172 H466', null, 3.4);
      b += tufts(r, 0, 600, 226, 12);
      return framed(b, "The ruins of a sealers' camp");
    },

    /** Sea cliffs white with birds, a figurehead wedged high in the rock. */
    cliffs() {
      const r = rng(151);
      let b = seascape(r, 120, SH);
      b += P('M320 240 L334 126 Q356 60 420 40 L600 28 L600 240Z', 'url(#h2)', 1.6);
      b += P('M354 120 h70 M362 160 h120 M346 200 h150 M420 80 h90', null, 2, `stroke="${pal.paper}"`);
      // the figurehead: a carved woman, head bowed, arms crossed, her base lodged in a crack
      b += P('M474 128 L470 90 Q472 78 486 76 Q500 78 502 90 L498 128Z', pal.paper, 1.3) +
        circle(486, 66, 9, pal.paper, 1.3) + P('M477 62 q9 -12 18 0 q2 14 -4 20', 'url(#h3)', 0.8) +
        P('M474 98 L498 92 M498 100 L474 94', null, 1.6) + P('M466 128 h40', null, 2.4);
      b += birds(r, 260, 60, 9, 220) + birds(r, 470, 120, 6, 120);
      b += rock(r, 300, 236, 220, 36);
      return framed(b, 'Sea cliffs crowded with birds');
    },

    /**
     * The Bird Rock: a tooth of black rock standing out of the open sea,
     * streaked white with the droppings of the birds that wheel about it,
     * with the surf breaking at its foot. `opts.ribs` shows the old Salem
     * ship's timbers jammed into the cleft on its lee side.
     */
    birdrock(opts) {
      opts = opts || {};
      const r = rng(173);
      let b = seascape(r, 150);
      b += P('M282 206 L292 176 L300 162 L306 140 L318 120 L322 104 L336 90 L344 66 L356 52 L364 34 L372 30 L380 38 L388 36 L396 54 L404 70 L412 96 L424 108 L432 132 L446 150 L452 174 L466 186 L474 206Z', pal.ink, 1.4);
      // ledges, and the white streaks that run down from them
      b += P('M326 110 h44 M308 150 h70 M402 120 h30 M396 166 h56 M360 82 h22', null, 1.6, `stroke="${pal.paper}"`);
      let streaks = '';
      for (let i = 0; i < 18; i++) streaks += `M${f(310 + r() * 140)} ${f(70 + r() * 110)}v${f(6 + r() * 16)}`;
      b += P(streaks, null, 1.4, `stroke="${pal.paper}"`);
      // the cleft on the lee side, and in it, if shown, the bones of the Salem ship
      b += P('M316 206 L326 176 L332 152 L338 172 L346 206', null, 1.2, `stroke="${pal.paper}"`);
      if (opts.ribs) {
        let ribs = '';
        for (let i = 0; i < 6; i++) ribs += `M${300 + i * 9} 196 q-8 -22 4 -42`;
        b += P(ribs, null, 2.6, `stroke="${pal.paper}"`) + P('M296 198 L352 186', null, 3, `stroke="${pal.paper}"`);
      }
      // the surf at its foot
      b += P('M262 208 q14 -8 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0', pal.paper, 1.1);
      b += birds(r, 380, 70, 16, 240) + birds(r, 230, 110, 8, 160) + birds(r, 520, 90, 6, 120);
      return framed(b, opts.ribs ? 'The bones of an old ship jammed into a cleft in a black rock' : 'A black rock in the open sea, streaked white, and wheeling with birds');
    },

    /** The Bird Rock's cleft, with the Salem ship's bones in it. */
    salem: () => SCENES.birdrock({ ribs: 1 }),

    /* ---------------- the places of the other islands ---------------- */

    /** The Meridian's watering camp on the High Island: a stream across the sand, an old fire, cut stumps and a cask stave. */
    watering() {
      const r = rng(211);
      let b = seascape(r, 96, 150);
      // the forest behind the beach
      b += P('M0 150 Q80 98 160 112 Q240 84 330 106 Q420 86 500 110 Q560 98 600 106 L600 160 L0 160Z', 'url(#h3)', 1);
      b += ground('M0 158 C150 150 350 168 600 156', 'url(#dots)', 1.1);
      // the stream coming down over the sand to the sea
      b += P('M430 158 Q404 186 432 208 Q468 228 448 240 L506 240 Q526 224 486 204 Q456 186 464 158Z', pal.paper, 1.1);
      b += P('M446 178 q10 4 14 12 M466 212 q10 4 16 12', null, 0.7);
      // stumps of saplings cut with an axe
      [[80, 192], [112, 200], [150, 188], [552, 190]].forEach(([x, y]) => {
        b += P(`M${x - 5} ${y} V${y - 14} L${x + 5} ${y - 18} V${y}Z`, pal.paper, 1.1) + P(`M${x - 5} ${y - 14} L${x + 5} ${y - 18}`, null, 0.6);
      });
      // the old fire: a ring of stones round charred ends
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        b += circle(f(276 + Math.cos(a) * 30), f(206 + Math.sin(a) * 7), 4.5, pal.paper, 1);
      }
      b += P('M258 206 L292 198 M262 198 L296 210 M272 194 L282 212', null, 3.5);
      // a broken cask stave on the sand
      b += P('M318 226 Q350 216 382 226 L380 232 Q350 224 320 232Z', 'url(#h2)', 1) + P('M334 222 v6 M366 222 v6', null, 1.2);
      b += tufts(r, 0, 400, 228, 8);
      return framed(b, 'An old camp by a stream: a ring of fire-stones, cut stumps and a broken cask stave');
    },

    /** The grave on the rise above the watering camp: a long mound and a cross of two sticks, facing the sea. */
    rise() {
      const r = rng(221);
      let b = seascape(r, 120) + birds(r, 440, 60, 5, 90);
      b += P('M0 240 L0 160 Q120 138 250 146 Q360 154 430 196 Q460 218 480 240Z', 'url(#dots)', 1.4);
      b += tufts(r, 10, 400, 170, 10);
      // the mound, dug deep and long, and the cross at its head
      b += P('M150 182 Q210 160 290 176 Q220 194 150 182Z', 'url(#h2)', 1.2);
      b += P('M150 182 V114 M134 130 H166', null, 3.6) + P('M144 124 l12 12 M156 124 l-12 12', null, 1, `stroke="${pal.paper}"`);
      return framed(b, 'A grave on a rise above the sea, under a cross of two sticks');
    },

    /** The High Island's forest: great buttressed trunks, a roof of leaves, tree ferns, and light along the stream. */
    forest() {
      const r = rng(231);
      let b = backdrop('url(#h2)');
      // the light that comes down the stream's course
      b += P('M260 240 Q286 180 292 120 Q300 60 306 0 L356 0 Q350 80 342 140 Q334 190 366 240Z', pal.paper, 0);
      b += P('M300 240 Q312 214 318 196 Q324 180 322 160', null, 0.7, 'stroke-dasharray="8 6"');
      // great trunks with buttress roots, shadowed on one side
      [[70, 26], [190, 18], [450, 30], [560, 20]].forEach(([x, w]) => {
        b += P(`M${x - w * 2.2} 240 Q${x - w} 220 ${x - w / 2} 170 L${x - w / 2} 0 L${x + w / 2} 0 L${x + w / 2} 170 Q${x + w} 220 ${x + w * 2.2} 240Z`, pal.paper, 1.3);
        b += `<rect x="${f(x + w * 0.1)}" y="0" width="${f(w * 0.4)}" height="200" fill="url(#h3)"/>`;
      });
      // the roof of leaves
      for (let i = 0; i < 16; i++) b += circle(f(r() * 640 - 20), f(4 + r() * 30), f(24 + r() * 16), 'url(#h3)', 1);
      // tree ferns, their fronds arching out from a crown
      [[130, 200], [380, 206], [520, 214]].forEach(([x, y]) => {
        b += P(`M${x} 240 V${y}`, null, 4);
        for (let i = 0; i < 7; i++) b += leaf(x, y, 46 + r() * 16, -170 + i * 27 + (r() - 0.5) * 10, 0.16);
      });
      return framed(b, 'Tall forest with buttressed trees and tree ferns');
    },

    /** The waterfall pool: a narrow fall from a wall of fern into a deep pool, a dark hollow behind it, a flat stone at its edge. */
    falls() {
      const r = rng(241);
      let b = backdrop('url(#hx)');
      // the hollow in the rock behind the falls
      b += P('M238 204 Q238 120 300 106 Q362 120 362 204Z', pal.ink, 1);
      // the fall: a white ribbon from the lip to the pool
      b += P('M284 0 L316 0 Q320 100 330 198 L270 198 Q280 100 284 0Z', pal.paper, 1.1);
      let falls = '';
      for (let x = 288; x < 314; x += 4) falls += `M${x} ${f(r() * 8)}L${f(x + (x - 300) * 0.4)} 198`;
      b += P(falls, null, 0.7, 'stroke-dasharray="16 3"');
      // ferns hanging from the lip and sprouting from the walls
      for (let i = 0; i < 10; i++) {
        const x = i < 5 ? 20 + i * 46 : 360 + (i - 5) * 50;
        b += leaf(x, 4 + r() * 20, 60 + r() * 30, 60 + r() * 60, 0.18);
      }
      // the deep pool, and the flat stone at its edge where food may be left
      b += `<ellipse cx="300" cy="212" rx="200" ry="24" fill="${pal.paper}"/>` +
        `<ellipse cx="300" cy="212" rx="200" ry="24" fill="url(#h2)" stroke="${pal.ink}" stroke-width="1.2"/>` +
        `<ellipse cx="300" cy="202" rx="40" ry="5" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="0.8"/>`;
      b += P('M430 226 Q474 210 520 222 L516 234 Q474 224 434 238Z', pal.paper, 1.4);
      return framed(b, 'A waterfall dropping into a deep pool, with a flat stone at its edge');
    },

    /** The ridge of bare rock above the forest, cloud in the valleys, and the smoke of the Island of Fires far to the south. */
    ridge() {
      const r = rng(251);
      const hz = 118;
      let b = seascape(r, hz);
      b += headland(r, 380, hz, 120, 16, 0) + P(`M420 ${hz - 14} c-4 -10 4 -18 0 -30 M452 ${hz - 16} c-4 -10 4 -18 0 -30`, null, 0.8);
      b += P('M0 148 Q60 134 120 146 Q180 130 250 148 Q320 136 380 150 Q460 138 540 152 Q580 144 600 148 L600 172 L0 172Z', pal.paper, 1);
      b += P('M0 240 L0 190 L40 176 L70 184 L110 160 L150 172 L190 152 L230 166 L270 158 L320 180 L380 170 L430 190 L480 182 L540 200 L600 196 L600 240Z', 'url(#h2)', 1.6);
      b += P('M60 200 l30 -8 M150 186 l40 -10 M260 182 l36 6 M420 206 l40 -6', null, 1.6, `stroke="${pal.paper}"`);
      b += stander(190, 154, 1.3, 1);
      return framed(b, 'A bare ridge above the cloud, with smoke rising from a far island');
    },

    /** The old lookout on the headland: a cairn of stones with a carved spar lashed upright, and a bed of fern in its lee. */
    lookout() {
      const r = rng(261);
      const hz = 132;
      let b = seascape(r, hz) + birds(r, 440, 70, 6, 120);
      b += P('M0 240 L0 182 Q120 170 260 178 Q360 186 420 212 Q446 226 464 240Z', 'url(#h1)', 1.4);
      b += tufts(r, 10, 380, 194, 9);
      // the spar, lashed upright and carved all over
      b += P('M222 186 V40', null, 6) + P('M222 186 V40', null, 3.4, `stroke="${pal.paper}"`);
      b += P('M220 60 h4 M220 70 h4 M220 82 h4 M220 92 h4 M220 104 h4', null, 0.8) + circle(222, 124, 4, pal.paper, 1.2);
      // the cairn, stones piled round its foot
      for (let k = 0; k < 4; k++) {
        const n = 5 - k;
        for (let i = 0; i < n; i++) {
          b += `<ellipse cx="${222 - (n - 1) * 8 + i * 16}" cy="${186 - k * 11}" rx="9" ry="6.5" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="1.1"/>`;
        }
      }
      b += P('M214 150 l16 6 M214 158 l16 -6', null, 1.2);
      // the bed of fern in its lee
      for (let i = 0; i < 5; i++) b += leaf(280 + i * 14, 196, 40, -150 + i * 12, 0.2);
      return framed(b, 'A cairn on a headland, a carved spar standing up from it');
    },

    /** The Bird Rock's ledges: the black face of the rock, ledge above ledge crowded with sitting birds. */
    ledges() {
      const r = rng(271);
      let b = sky(r, SW, 0, 190, false) + sea(r, 220, 190, SH, false);
      b += P('M150 240 L210 0 L600 0 L600 240Z', pal.ink, 1.2);
      [[40, 236], [92, 222], [144, 206], [196, 190]].forEach(([y, x0]) => {
        b += P(`M${x0} ${y} L600 ${y - 4} L600 ${y + 7} L${x0 - 2} ${y + 8}Z`, pal.paper, 1);
        for (let x = x0 + 10; x < 590; x += 20 + r() * 10) {
          b += P(`M${f(x)} ${y} q8 -15 18 0Z`, pal.paper, 1) + circle(f(x + 14), y - 11, 3, pal.paper, 1) + P(`M${f(x + 17)} ${y - 11} l5 1`, null, 1);
          if (r() < 0.25) b += `<ellipse cx="${f(x - 4)}" cy="${y + 1}" rx="3" ry="2.2" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="0.8"/>`;
        }
      });
      let streaks = '';
      for (let i = 0; i < 30; i++) streaks += `M${f(220 + r() * 380)} ${f(10 + r() * 220)}v${f(6 + r() * 14)}`;
      b += P(streaks, null, 1.3, `stroke="${pal.paper}"`);
      b += birds(r, 90, 90, 12, 140);
      return framed(b, 'Ledge after ledge of nesting birds on a black rock');
    },

    /** The top of the Bird Rock: hand-cut steps, a slab carved with the Salem crew's words, and the wind. */
    rocktop() {
      const r = rng(281);
      const hz = 148;
      let b = seascape(r, hz) + P(`M460 ${hz} q30 -5 60 0`, null, 1.4);
      b += P('M0 240 L0 178 Q150 166 300 172 Q450 166 600 182 L600 240Z', pal.ink, 1.2);
      let steps = '';
      for (let i = 0; i < 6; i++) steps += `M${30 + i * 20} ${238 - i * 10}h24v-10`;
      b += P(steps, null, 1.6, `stroke="${pal.paper}"`);
      b += P('M326 176 L334 104 L446 98 L452 172Z', pal.paper, 1.4);
      let words = '';
      for (let row = 0; row < 5; row++) {
        for (let x = 346 + r() * 6; x < 430; x += 10 + r() * 14) words += `M${f(x)} ${116 + row * 11}h${f(4 + r() * 8)}`;
      }
      b += P(words, null, 1.4);
      let wind = '';
      for (let i = 0; i < 9; i++) wind += `M${f(r() * 300)} ${f(30 + r() * 100)}q40 -6 ${f(60 + r() * 60)} 0`;
      b += P(wind, null, 0.6);
      return framed(b, 'Words carved in a slab on top of a rock, steps cut up to it');
    },

    /** The canoe sheds on the Island of Fires: long open sheds with canoes in their shade, and a hull in the making. */
    sheds() {
      const r = rng(291);
      let b = seascape(r, 104, 146) + ground('M0 146 C200 138 400 152 600 142', 'url(#dots)', 1.1);
      [[40, 250], [340, 200]].forEach(([x, w]) => {
        b += P(`M${x} 196 V140 M${x + w / 2} 196 V140 M${x + w} 196 V140`, null, 2.4);
        b += `<rect x="${x}" y="140" width="${w}" height="56" fill="url(#h1)"/>`;
        b += P(`M${x + 16} 190 Q${x + w / 2} 200 ${x + w - 16} 190 L${x + w - 10} 182 Q${x + w / 2} 192 ${x + 10} 182Z`, 'url(#h3)', 1.2);
        b += P(`M${x - 20} 144 L${x} 112 L${x + w} 112 L${x + w + 20} 144Z`, 'url(#h2)', 1.2);
        let thatch = '';
        for (let tx = x - 12; tx < x + w + 14; tx += 6) thatch += `M${tx} 144 l4 -10`;
        b += P(thatch, null, 0.7);
      });
      b += palm(r, 566, 232, 190, -18);
      // a hull in the making on trestles, and the chips from the adze
      b += P('M200 220 L208 236 M216 220 L208 236 M386 220 L394 236 M402 220 L394 236', null, 2);
      b += P('M190 214 Q300 228 410 214 L414 204 Q300 216 186 204Z', pal.paper, 1.3) + P('M220 208 Q300 216 380 208', null, 0.8);
      let chips = '';
      for (let i = 0; i < 14; i++) chips += `M${f(180 + r() * 250)} ${f(230 + r() * 8)}l4 -2`;
      b += P(chips, null, 1.2);
      return framed(b, 'Long open sheds with canoes in their shade, and a new hull on trestles');
    },

    /** Tavake's house: long and low under a breadfruit tree, set a little apart, a ring of pebbles on the mat before it. */
    tavake() {
      const r = rng(301);
      let b = seascape(r, 116, 156) + ground('M0 156 C200 148 400 164 600 152', 'url(#dots)', 1.1);
      // the house, thatched almost to the ground, its doorway dark
      b += P('M300 192 L334 110 L536 110 L570 192Z', 'url(#h2)', 1.3);
      let thatch = '';
      for (let x = 306; x < 566; x += 6) thatch += `M${x} 192 l${f((x - 435) * 0.04)} -14`;
      b += P(thatch, null, 0.7) + P('M420 192 V164 Q434 154 448 164 V192Z', pal.ink, 1);
      // the mat before the door, with the night's lesson laid out on it in pebbles
      b += P('M380 206 L500 206 L510 222 L370 222Z', 'url(#hh)', 1);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        b += circle(f(440 + Math.cos(a) * 26), f(214 + Math.sin(a) * 5), 1.8, pal.ink);
      }
      // the breadfruit tree: a thick trunk, broad leaves, round fruit
      b += P('M140 234 Q150 170 146 110 L172 110 Q172 170 182 234Z', 'url(#h1)', 1.2);
      b += P('M146 118 Q120 100 96 104 M172 116 Q200 96 226 100', null, 4);
      b += P('M60 112 Q40 60 100 40 Q140 6 200 26 Q262 30 262 76 Q276 116 226 124 Q160 136 100 128 Q60 130 60 112Z', 'url(#h3)', 1.2);
      for (let i = 0; i < 22; i++) {
        const x = 80 + r() * 170;
        const y = 34 + r() * 80;
        b += leaf(f(x), f(y), 34 + r() * 16, f(r() * 360), 0.36);
      }
      [[110, 108], [186, 112], [150, 120], [220, 92]].forEach(([x, y]) => {
        b += circle(x, y, 7, 'url(#dots2)', 1);
      });
      return framed(b, 'A long low house under a breadfruit tree');
    },

    /** The village on the Island of Fires: long low houses under the palms, smoke going up, canoes on the sand. */
    village() {
      const r = rng(311);
      let b = seascape(r, 104, 150);
      b += headland(r, 330, 104, 270, 40, 0);
      b += ground('M0 150 C200 140 400 158 600 146', 'url(#dots)', 1.1);
      [[30, 150], [200, 140], [362, 116]].forEach(([x, w]) => {
        b += P(`M${x} 170 L${x + 20} 118 L${x + w - 20} 118 L${x + w} 170Z`, 'url(#h2)', 1.2);
        let thatch = '';
        for (let tx = x + 6; tx < x + w; tx += 6) thatch += `M${tx} 170 l2 -12`;
        b += P(thatch, null, 0.7) + P(`M${x + w / 2 - 8} 170 V154 h16 V170Z`, pal.ink, 0.8);
        b += P(`M${x + w / 2} 112 c-6 -12 6 -20 0 -34 c-6 -12 4 -18 0 -28`, null, 0.8, 'class="smoke"');
      });
      b += palm(r, 186, 186, 150, -10, 0.85) + palm(r, 520, 190, 160, 14, 0.9);
      // canoes drawn up on the sand, and people about the houses
      b += P('M260 214 Q320 224 380 214 l4 -6 Q320 218 256 208Z', 'url(#h3)', 1) + P('M268 200 h96 M286 200 v10 M346 200 v10', null, 1.6);
      b += P('M420 222 Q470 230 520 222 l4 -6 Q470 226 416 216Z', 'url(#h3)', 1);
      b += islander(120, 200, 1.1, 1) + islander(160, 204, 0.8, -1) + islander(470, 196, 1.05, -1);
      return framed(b, 'A village of long thatched houses under palms, canoes on the beach');
    },

    /** The night reef: torches out along the reef in the dark, each canoe's light on the water. */
    nightreef() {
      const r = rng(321);
      let b = sky(r, SW, 0, 100, true) + stars(r, SW, 90) + sea(r, SW, 100, SH, true);
      b += P('M0 150 q40 -8 80 -2 q60 8 120 -2 q70 -8 140 2 q60 6 120 -4 q60 -6 140 2', pal.paper, 1);
      let top = '';
      [[70, 142, 0.5], [170, 146, 0.55], [280, 140, 0.6], [400, 146, 0.55], [520, 140, 0.5], [120, 198, 1], [360, 210, 1.1]].forEach(([x, y, s]) => {
        top += P(`M${x - 40 * s} ${y} Q${x} ${y + 10 * s} ${x + 40 * s} ${y} L${x + 44 * s} ${y - 6 * s} Q${x} ${y + 2 * s} ${x - 44 * s} ${y - 6 * s}Z`, pal.ink, 0.8);
        top += P(`M${x + 30 * s} ${y - 4 * s} V${y - 30 * s}`, null, 1.6 * s) + fire(x + 30 * s, y - 32 * s, 2, 0.24 * s * 2);
        top += P(`M${x + 24 * s} ${y + 8 * s} h12 M${x + 26 * s} ${y + 14 * s} h8 M${x + 28 * s} ${y + 20 * s} h4`, null, 1.2 * s, `stroke="${pal.paper}"`);
      });
      top += islander(374, 204, 1.1, -1);
      return framed(b, 'Torches on canoes along a reef at night', top);
    },

    /** The anchorage: a deep still bay between two points, rotted water casks on the beach and an old whaleboat; `opts.ship` puts a whaler at anchor in it. */
    anchorage(opts) {
      opts = opts || {};
      const r = rng(331);
      const hz = 100;
      let b = sky(r, SW, 0, hz, false) + sea(r, SW, hz, 120, false);
      b += headland(r, -20, hz + 6, 230, 70, 2) + headland(r, 400, hz + 4, 230, 60, 2);
      // the bay, still as a pond
      b += P('M0 120 H600 V196 H0Z', pal.paper, 0);
      let still = '';
      for (let y = 126; y < 196; y += 6 + (y - 120) * 0.05) still += `M${f(20 + r() * 80)} ${f(y)}h${f(120 + r() * 200)}M${f(360 + r() * 80)} ${f(y)}h${f(80 + r() * 120)}`;
      b += P(still, null, 0.5);
      if (opts.ship) b += ship(330, 168, 0.75, -1) + P('M300 140 c-6 -12 6 -20 0 -34', null, 0.8);
      b += ground('M0 196 C150 188 350 204 600 192', 'url(#dots)', 1.1);
      b += cask(130, 226, 1.2) + cask(156, 230, 1.1) + `<g transform="rotate(80 186 224)">${cask(186, 224, 1.1)}</g>`;
      b += P('M330 222 Q400 236 470 222 L478 210 Q400 226 322 210Z', 'url(#h3)', 1.2) + P('M352 216 v-6 M400 220 v-6 M448 216 v-6', null, 1.4);
      return framed(b, opts.ship ? 'A whaling ship at anchor in a still bay' : 'A deep still bay, with old casks and a whaleboat on the beach');
    },

    /** A stand of tall pale trees, their trunks scored and weeping gum. */
    gumwood() {
      const r = rng(161);
      let b = backdrop('url(#h1)');
      b += ground('M0 210 C200 200 400 216 600 206', pal.paper, 1);
      [70, 170, 300, 430, 530].forEach((x, i) => {
        const w = i === 2 ? 22 : 14;
        b += P(`M${x - w} 214 Q${x - w * 0.6} 100 ${x - w * 0.3} 0 L${x + w * 0.3} 0 Q${x + w * 0.6} 100 ${x + w} 214Z`, pal.paper, 1.4);
      });
      // herringbone tapping cuts on the great trunk, each with a bead of gum beneath
      let cuts = '';
      for (let y = 70; y < 190; y += 18) cuts += `M288 ${y}L300 ${y + 9}L312 ${y}`;
      b += P(cuts, null, 1.4) + P('M300 194 v6', null, 3) + circle(300, 202, 3, pal.ink);
      b += circle(176, 120, 2.4, pal.ink) + circle(432, 150, 2.4, pal.ink);
      b += tufts(r, 0, 600, 228, 14);
      return framed(b, 'Tall trees weeping gum');
    },

    /** A blowhole in a shelf of black rock, throwing up a plume of spray. */
    blowhole() {
      const r = rng(171);
      let b = seascape(r, 90, SH);
      b += P('M0 168 Q150 150 300 166 Q450 150 600 172 L600 240 L0 240Z', 'url(#h2)', 1.6);
      b += `<ellipse cx="300" cy="168" rx="26" ry="6" fill="${pal.ink}"/>`;
      b += P('M288 166 Q268 96 236 54 Q290 70 298 26 Q308 70 362 50 Q330 96 312 166Z', pal.paper, 1.2);
      b += P('M296 160 L284 70 M304 160 L318 70 M300 160 V40', null, 0.6, 'stroke-dasharray="6 5"');
      for (let i = 0; i < 18; i++) b += circle(f(220 + r() * 160), f(20 + r() * 50), f(1 + r() * 2), pal.paper, 0.8);
      return framed(b, 'A blowhole throwing up spray');
    },

    /** An old stepped platform of fitted stones, upright slabs along its top, half swallowed by jungle. */
    platform(opts) {
      opts = opts || {};
      const r = rng(181);
      let b = backdrop('url(#h1)');
      b += ground('M0 214 C200 206 400 220 600 210', pal.paper, 1);
      for (let k = 0; k < 3; k++) {
        const w = 460 - k * 110;
        const x = 300 - w / 2;
        const y = 214 - (k + 1) * 26;
        let joints = '';
        for (let jx = x + 20 + r() * 20; jx < x + w - 10; jx += 26 + r() * 20) joints += `M${f(jx)} ${y}v26`;
        b += P(`M${x} ${y}h${w}v26h${-w}Z`, pal.paper, 1.4) + P(joints, null, 0.8);
      }
      // the upright stones, each on its plinth, and the empty plinth in the middle of the row
      [196, 244, 288, 332, 380].forEach((x) => {
        b += P(`M${x - 4} 136 h36 v-8 h-36Z`, pal.paper, 1.1);
        if (x !== 288) b += P(`M${x} 128 l4 -50 l20 0 l4 50Z`, 'url(#h3)', 1.2);
      });
      if (opts.shells || opts.people) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          b += circle(f(306 + Math.cos(a) * 26), f(132 + Math.sin(a) * 5), 1.8, pal.paper, 0.6);
        }
      }
      for (let i = 0; i < 6; i++) b += leaf(i < 3 ? 10 + i * 30 : 500 + (i - 3) * 34, 220, 70 + r() * 20, i < 3 ? -50 : -130, 0.25);
      if (!opts.people) return framed(b, opts.shells ? 'The old stone platform, a ring of shells around its empty plinth' : 'An old stone platform in the jungle');

      // night, and the people of the Island of Fires on the steps, by torchlight
      let top = darkness(SW, SH, 306, 140, 170, 0.8);
      top += islander(268, 162, 1.2, 1, { torch: 1 }) + islander(306, 136, 1.15, -1) + islander(352, 188, 1.25, -1, { torch: 1 }) + islander(230, 214, 1.3, 1);
      return framed(b, 'People with torches on the old stone platform at night', top);
    },

    /** A storm breaking on the beach: palms bent flat, driving rain, the surf over the camp. */
    tempest() {
      const r = rng(191);
      let b = sky(r, SW, 0, 120, true) + sea(r, SW, 120, 200, true);
      b += P('M0 170 Q60 130 130 160 Q190 186 250 150 Q320 110 380 160 Q440 196 520 150 Q570 128 600 150 L600 200 L0 200Z', pal.paper, 1.4);
      b += ground('M0 200 C150 192 300 208 600 196', 'url(#dots)', 1.1);
      b += palm(r, 90, 236, 150, 80) + palm(r, 470, 236, 130, 90);
      // the lean-to, torn half away
      b += P('M246 230 L290 196 L342 228 M300 230 L318 206', null, 3) + P('M258 222 L292 194 L336 214 L300 236Z', 'url(#h2)', 1.2);
      let rain = '';
      for (let i = 0; i < 160; i++) rain += `M${f(r() * 700)} ${f(r() * 240)}l-16 24`;
      b += P(rain, null, 0.7, `stroke="${pal.paper}"`);
      return framed(b, 'A storm breaking over the beach');
    },

    /** Night beyond the reef, and a patch of the sea glowing with a steady light. */
    glow() {
      const r = rng(201);
      let b = sky(r, SW, 0, 110, true) + stars(r, SW, 100) + `<rect x="0" y="110" width="${SW}" height="130" fill="url(#hx)"/>`;
      b += `<ellipse cx="380" cy="168" rx="130" ry="24" fill="${pal.paper}" opacity="0.4"/>` +
        `<ellipse cx="380" cy="168" rx="80" ry="14" fill="${pal.paper}" opacity="0.75"/>`;
      for (let i = 0; i < 40; i++) {
        const a = r() * Math.PI * 2;
        const d = 40 + r() * 70;
        b += circle(f(380 + Math.cos(a) * d), f(168 + Math.sin(a) * d * 0.2), f(0.8 + r() * 1.4), pal.paper);
      }
      b += P('M0 218 C80 210 190 214 270 240 L0 240Z', pal.paper, 1.2);
      b += stander(120, 232, 1.1, 1);
      return framed(b, 'A glowing light in the sea at night');
    },

    /**
     * The islet of the second chapter: a hump of sand and palms in the open
     * sea, the castaway's island far off to the east. `opts.wreck` puts the
     * broken raft on the reef in the foreground.
     */
    islet(opts) {
      opts = opts || {};
      const r = rng(171);
      const hz = 112;
      let b = seascape(r, hz) + headland(r, 430, hz, 150, 20, 2) + birds(r, 250, 40, 9, 150);
      b += P('M170 196 C220 176 280 166 340 166 S470 178 520 196Z', 'url(#dots)', 1.2);
      b += palm(r, 318, 170, 80, -14, 0.56) + palm(r, 364, 170, 64, 18, 0.46);
      if (opts.wreck) {
        // the reef's breakers, and the raft hung up on them with her mast snapped
        b += P('M0 206 q40 -12 80 -4 q40 8 90 -4', null, 0.9, 'stroke-dasharray="6 5"');
        b += `<g transform="rotate(-10 90 214)">${raft(30, 224, { hull: 1 }, 0.8)}</g>`;
        b += P('M86 206 l8 -30 M94 176 l-22 -10', null, 2.4);
      }
      return framed(b, opts.wreck ? 'A broken raft on the reef of a small islet' : 'A small islet in the open sea, another island far off');
    },

    /** The finished raft under sail on the open sea. */
    raft() {
      const r = rng(111);
      const hz = 120;
      let b = sky(r, SW, 0, hz, false) + sun(140, 50, 16, true) + sea(r, SW, hz, SH, false);
      b += `<g class="bob">${raft(240, 200, { hull: 1, mast: 1, sail: 1, casks: 1 }, 1)}${stander(320, 180, 1.1, 1)}</g>`;
      b += birds(r, 470, 60, 3, 40);
      return framed(b, 'A raft under sail on open sea');
    },

    /** The raft, its sail gone, pitching among storm waves in driving rain. */
    storm() {
      const r = rng(121);
      let b = sky(r, SW, 0, 240, true);
      let rain = '';
      for (let i = 0; i < 140; i++) {
        const x = r() * 700;
        const y = r() * 240;
        rain += `M${f(x)} ${f(y)}l-12 26`;
      }
      b += P(rain, null, 0.7, `stroke="${pal.paper}"`);
      b += P('M0 190 Q90 120 180 160 Q240 190 300 150 Q380 90 460 150 Q520 196 600 170 L600 240 L0 240Z', pal.paper, 1.6);
      b += P('M0 200 Q90 130 180 170 Q240 200 300 160 Q380 100 460 160 Q520 206 600 180 L600 240 L0 240Z', 'url(#h1)', 0);
      b += P('M380 100 q20 -10 30 6 q-14 -2 -18 10', null, 1.4);
      b += `<g transform="rotate(-18 300 150)">${raft(250, 166, { hull: 1, mast: 1, sail: 0, casks: 1 }, 0.8)}</g>`;
      return framed(b, 'A raft in a storm');
    },

    /** Rescue: a whaler lowers a boat off the island as the pyre smokes. */
    rescue() {
      const r = rng(131);
      const hz = 120;
      let b = sky(r, SW, 0, hz, false) + sun(90, 46, 14, true) + sea(r, SW, hz, SH, false);
      b += headland(r, 0, hz, 140, 40, 3);
      b += P('M70 82 c-8 -16 10 -24 0 -40 c-8 -14 6 -20 0 -34', null, 2);
      b += ship(400, 178, 1.15, -1) + longboat(220, 206, 1);
      return framed(b, 'A whaling ship lowers a boat');
    },

    /** Landfall: the raft (or, with `opts.canoe`, the canoe) comes in toward an inhabited island. */
    landfall(opts) {
      opts = opts || {};
      const r = rng(141);
      const hz = 130;
      let b = seascape(r, hz);
      b += headland(r, 260, hz + 2, 340, 60, 5) + birds(r, 200, 50, 7, 120);
      b += `<g class="bob">${opts.canoe ? canoe(30, 222) : raft(80, 220, { hull: 1, mast: 1, sail: 1, casks: 0 }, 0.8)}</g>`;
      for (let i = 0; i < 4; i++) {
        b += P(`M${300 + i * 30} ${hz + 6} l-10 14 h20Z`, 'url(#h2)', 0.8) + P(`M${300 + i * 30} ${hz + 6} v-8`, null, 1);
      }
      return framed(b, 'Landfall: an inhabited island');
    },

    /** Death: a driftwood cross above the tide line, by moonlight. */
    grave() {
      const r = rng(151);
      const hz = 130;
      let b = sky(r, SW, 0, hz, true) + moon(120, 50, 14) + sea(r, SW, hz, 180, true);
      b += ground('M0 176 C150 166 300 186 600 172', 'url(#dots)', 1.1);
      b += palm(r, 520, 228, 170, -28);
      b += P('M260 222 Q300 200 340 222Z', 'url(#h2)', 1.2);
      b += P('M300 216 V140 M282 160 H318', null, 4.5) + P('M296 156 l8 8 M304 156 l-8 8', null, 1.2, `stroke="${pal.paper}"`);
      b += P('M250 226 q6 -4 12 0 M330 228 q6 -4 12 0', null, 0.9);
      return framed(b, 'A driftwood cross above the tide line');
    },

    /** A gam: two whalers hove to within hail of each other, and a boat pulling between them. */
    gam() {
      const r = rng(211);
      const hz = 126;
      let b = sky(r, SW, 0, hz, false) + sun(300, 40, 13, true) + sea(r, SW, hz, SH, false);
      b += ship(150, 186, 0.95, 1) + ship(452, 180, 0.85, -1);
      b += P('M180 152 c-6 -12 6 -20 0 -34 M420 148 c-6 -12 6 -20 0 -34', null, 0.8);
      b += longboat(300, 212, 1.1) + P('M276 216 q-30 4 -60 0 M324 216 q30 4 60 0', null, 0.6, 'stroke-dasharray="4 5"');
      return framed(b, 'Two whaling ships hove to, and a boat pulling between them');
    },

    /** The hunt: a whaleboat fast to a sperm whale, the line taut, the harpooner standing in the bow. */
    hunt() {
      const r = rng(221);
      const hz = 100;
      let b = sky(r, SW, 0, hz, false) + sea(r, SW, hz, SH, false);
      // the whale's great square head and back, rolling up out of the sea, and the white water about it
      b += P('M330 196 Q336 150 390 146 Q460 142 520 160 Q560 172 600 190 L600 214 Q470 204 330 214Z', pal.ink, 1.2);
      b += P('M352 170 q10 -6 22 -4', null, 1.4, `stroke="${pal.paper}"`) + circle(372, 184, 2.4, pal.paper);
      b += P('M332 156 q-10 -26 -26 -36 M336 154 q-2 -26 -12 -40 M340 154 q6 -22 2 -38', null, 1);
      let foam = '';
      for (let i = 0; i < 30; i++) foam += `M${f(320 + r() * 280)} ${f(206 + r() * 14)}q6 -5 12 0`;
      b += P(foam, null, 1, `stroke="${pal.paper}"`);
      // the boat, her crew at the oars and the harpooner up in the bow, the line running out to the whale
      b += P('M70 210 L250 210 Q238 226 210 228 L100 228 Q76 224 70 210Z', 'url(#h3)', 1.4);
      b += P('M96 210 l-18 20 M126 210 l-18 20 M156 210 l-18 20 M186 210 l-18 20', null, 1.6);
      [92, 122, 152, 182].forEach((x) => {
        b += circle(x, 198, 4.6, pal.ink) + P(`M${x - 4} 208 v-6`, null, 6);
      });
      b += stander(236, 210, 1.3, 1) + P('M76 206 l-22 -24', null, 2);
      b += P('M250 196 Q300 200 352 178', null, 1);
      return framed(b, 'A whaleboat fast to a sperm whale');
    },

    /** Juan Fernández: sheer green peaks under a cap of cloud, and a ship anchored in the bay beneath them. */
    juan() {
      const r = rng(231);
      const hz = 170;
      let b = sky(r, SW, 0, hz, false) + sea(r, SW, hz, SH, false);
      b += P('M0 172 L40 120 L70 132 L112 64 L140 90 L176 30 L196 58 L226 44 L262 92 L300 80 L340 120 L388 110 L430 150 L470 140 L520 172Z', 'url(#h2)', 1.4);
      b += P('M112 64 L120 120 M176 30 L170 100 M226 44 L236 112 M300 80 L292 140', null, 0.8);
      b += P('M150 40 q20 -20 50 -10 q30 -16 60 0 q20 4 16 16 q-60 10 -126 -6Z', pal.paper, 1);
      b += ship(420, 204, 0.7, -1);
      return framed(b, 'Sheer green peaks under a cap of cloud, and a ship at anchor beneath them');
    },

    /** Valparaíso: a town climbing its hills round a crowded bay, and the mountains far beyond. */
    valparaiso() {
      const r = rng(241);
      const hz = 150;
      let b = sky(r, SW, 0, hz, false);
      b += P('M0 70 L60 50 L110 62 L170 22 L210 48 L260 40 L330 60 L380 34 L430 56 L520 44 L600 64 V90 H0Z', pal.paper, 0.9);
      b += P('M170 22 l-10 14 h20Z M380 34 l-8 10 h16Z', 'url(#h1)', 0);
      b += P('M0 150 Q60 90 140 104 Q200 70 280 96 Q360 76 430 104 Q520 88 600 120 V150Z', 'url(#dots)', 1.2);
      // the houses, crowded up the hillsides
      for (let i = 0; i < 46; i++) {
        const x = f(20 + r() * 560);
        const y = f(108 + r() * 36 - (x > 120 && x < 460 ? 12 : 0));
        b += P(`M${x} ${y}h9v7h-9Z`, pal.paper, 0.8) + P(`M${x - 1} ${y}l5.5 -4l5.5 4`, null, 0.8);
      }
      b += sea(r, SW, hz, SH, false);
      b += ship(140, 200, 0.6, 1) + ship(460, 210, 0.75, -1) + ship(300, 184, 0.45, 1);
      return framed(b, 'A town on its hills round a crowded bay');
    },

    /** The corposants: blue fire burning at the yard-arms of a ship in a black night of rain. */
    corposants() {
      const r = rng(251);
      let b = sky(r, SW, 0, SH, true);
      let rain = '';
      for (let i = 0; i < 120; i++) rain += `M${f(r() * 700)} ${f(r() * 240)}l-12 26`;
      b += P(rain, null, 0.7, `stroke="${pal.paper}"`);
      b += P('M190 240 V20 M410 240 V30', null, 5);
      [[190, 60, 120], [190, 120, 150], [410, 70, 120], [410, 130, 150]].forEach(([x, y, w]) => {
        b += P(`M${x - w / 2} ${y} H${x + w / 2}`, null, 3);
        [x - w / 2, x + w / 2].forEach((ex) => {
          b += circle(ex, y - 4, 7, pal.paper) + P(`M${ex - 14} ${y - 4}h6M${ex + 8} ${y - 4}h6M${ex} ${y - 18}v6`, null, 1, `stroke="${pal.paper}"`);
        });
      });
      b += circle(190, 18, 6, pal.paper) + circle(410, 28, 6, pal.paper);
      b += P('M0 210 Q150 196 300 214 Q450 230 600 206 V240 H0Z', pal.ink, 1);
      return framed(b, 'Blue fire burning at the yard-arms in the night');
    },

    /** The master's cabin of a whaler: a swinging lamp, a table with paper and ink, and the stern windows over the wake. */
    cabin() {
      const r = rng(261);
      let b = `<rect width="${SW}" height="${SH}" fill="url(#h1)"/>`;
      // the stern windows, and the sea astern through them
      b += P('M150 30 H450 V120 H150Z', pal.paper, 2);
      b += at(150, 0, 0.5, 1, sea(r, SW, 80, 118, false));
      b += P('M150 80 H450', null, 0.8) + P('M225 30 V120 M300 30 V120 M375 30 V120 M150 75 H450', null, 2.4);
      // the lamp on its gimbals, and the table
      b += P('M300 0 V44', null, 1.2) + P('M290 44 h20 l-4 18 h-12Z', pal.paper, 1.2);
      b += P('M60 180 H540 L560 200 H40Z', 'url(#h2)', 1.4) + P('M80 200 V240 M520 200 V240', null, 6);
      b += P('M220 172 l70 -6 l8 12 l-70 6Z', pal.paper, 1) + P('M232 174 h48 M234 178 h40', null, 0.5);
      b += P('M330 170 h16 v-10 h-16Z', pal.ink, 1) + P('M340 160 l22 -26', null, 1);
      b += P('M390 176 h44 v-12 h-44Z', 'url(#h3)', 1);
      return framed(b, 'A ship\'s cabin by lamplight, paper and ink on the table');
    },

    /** Night by the fire, and a pair of eyes beyond the firelight. */
    night() {
      const r = rng(161);
      let b = sky(r, SW, 0, 140, true) + stars(r, SW, 110) + moon(480, 50, 13) + sea(r, SW, 140, 190, true);
      b += ground('M0 186 C150 178 300 196 600 182', 'url(#dots)', 1.1);
      b += palm(r, 70, 236, 170, 30);
      let top = darkness(SW, SH, 300, 210, 110, 0.7);
      top += fire(300, 222, 3, 1) + sitter(260, 224, 1.1, 1);
      top += circle(520, 196, 2, pal.paper) + circle(530, 196, 2, pal.paper);
      return framed(b, 'Eyes beyond the firelight', top);
    },
  };

  /** Draws the named location scene (falling back to the beach), passing `opts` through. */
  DW.art.scene = function (name, opts) {
    const fn = SCENES[name] || SCENES.beach;
    return fn(opts);
  };

  DW.art.names = Object.assign(DW.art.names || {}, { scenes: Object.keys(SCENES) });
})();
