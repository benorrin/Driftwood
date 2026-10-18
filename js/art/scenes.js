/* Driftwood — location scenes.
 * The illustrations (600 × 240) at the head of story and journey cards. */
(function () {
  'use strict';

  const DW = window.DW;
  const draw = DW.draw;
  const {
    pal, f, rng, SW, SH, framed, P, circle, backdrop, ground, darkness,
    sky, sea, seascape, sun, moon, stars, birds, palm, rock, tufts, headland, leaf,
    fire, sitter, stander, raft, ship, longboat,
  } = draw;

  /** A boar's skull on a stake planted at (x, y). */
  function skullStake(x, y) {
    return P(`M${x} ${y} V${y - 50}`, null, 2) +
      P(`M${x - 10} ${y - 56} Q${x} ${y - 70} ${x + 10} ${y - 56} L${x + 6} ${y - 44} L${x - 6} ${y - 44}Z`, pal.paper, 1.2) +
      circle(x - 4, y - 55, 2.5, pal.ink) + circle(x + 4, y - 55, 2.5, pal.ink) +
      P(`M${x - 8} ${y - 46} q-8 4 -6 12 M${x + 8} ${y - 46} q8 4 6 12`, null, 1.6);
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
    hut() {
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
      [[180, 200], [420, 202], [470, 198]].forEach(([x, y]) => {
        b += skullStake(x, y);
      });
      return framed(b, 'A hut of poles and thatch, boar skulls on stakes');
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
    platform() {
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
      [214, 262, 314, 366].forEach((x) => {
        b += P(`M${x} 136 l4 -54 l20 0 l4 54Z`, 'url(#h3)', 1.2);
      });
      for (let i = 0; i < 6; i++) b += leaf(i < 3 ? 10 + i * 30 : 500 + (i - 3) * 34, 220, 70 + r() * 20, i < 3 ? -50 : -130, 0.25);
      return framed(b, 'An old stone platform in the jungle');
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

    /** Landfall: the raft comes in toward an inhabited island. */
    landfall() {
      const r = rng(141);
      const hz = 130;
      let b = seascape(r, hz);
      b += headland(r, 260, hz + 2, 340, 60, 5) + birds(r, 200, 50, 7, 120);
      b += `<g class="bob">${raft(80, 220, { hull: 1, mast: 1, sail: 1, casks: 0 }, 0.8)}</g>`;
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
