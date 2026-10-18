/* Driftwood — adversaries.
 * The illustrations (600 × 240) shown during combat. */
(function () {
  'use strict';

  const DW = window.DW;
  const draw = DW.draw;
  const {
    pal, f, rng, SW, framed, P, circle, backdrop, ground, bez,
    seascape, rock, tufts, leaf, raft,
  } = draw;

  const FOES = {
    /** A giant land crab, claws raised, drawn as a mirrored half. */
    crab() {
      const r = rng(201);
      let b = seascape(r, 90, 130);
      b += ground('M0 128 C150 120 300 136 600 124', 'url(#dots)', 1);
      const cx = 300;
      const cy = 172;

      // one half: four legs, the claw arm, the claw, and an eye on its stalk
      let legs = '';
      for (let i = 0; i < 4; i++) {
        legs += `M${cx - 42} ${cy - 4 + i * 6}L${cx - 82 - i * 10} ${cy - 26 + i * 12}L${cx - 104 - i * 6} ${cy + 30 + i * 4}`;
      }
      let half = P(legs, null, 5.5) + P(legs, null, 2.6, `stroke="${pal.paper}" stroke-dasharray="8 4"`);
      half += P(`M${cx - 40} ${cy - 22}L${cx - 78} ${cy - 46}L${cx - 92} ${cy - 76}`, null, 8);
      const px = cx - 92;
      const py = cy - 76;
      half += P(`M${px} ${py}C${px - 30} ${py - 6} ${px - 38} ${py - 34} ${px - 16} ${py - 50}C${px - 18} ${py - 34} ${px - 8} ${py - 20} ${px + 8} ${py - 16}Z`, 'url(#h3)', 1.3);
      half += P(`M${px + 2} ${py - 10}C${px + 16} ${py - 26} ${px + 8} ${py - 40} ${px - 4} ${py - 46}C${px + 2} ${py - 32} ${px - 4} ${py - 20} ${px - 6} ${py - 12}Z`, 'url(#h2)', 1.1);
      half += P(`M${cx - 12} ${cy - 36}L${cx - 18} ${cy - 62}`, null, 2.4) + circle(cx - 18, cy - 64, 4, pal.ink);
      b += half + `<g transform="translate(${cx * 2} 0) scale(-1 1)">${half}</g>`;

      // the shell
      b += P(`M${cx - 56} ${cy}Q${cx - 50} ${cy - 44} ${cx} ${cy - 44}Q${cx + 50} ${cy - 44} ${cx + 56} ${cy}Q${cx + 40} ${cy + 24} ${cx} ${cy + 26}Q${cx - 40} ${cy + 24} ${cx - 56} ${cy}Z`, 'url(#h2)', 1.6);
      b += P(`M${cx - 30} ${cy - 28}q30 -12 60 0M${cx - 20} ${cy - 14}q20 -8 40 0`, null, 2, `stroke="${pal.paper}"`);
      return framed(b, 'A giant land crab');
    },

    /** A wild boar bursting out of the undergrowth, bristles up. */
    boar() {
      const r = rng(211);
      let b = backdrop('url(#h2)', SW, 150);
      b += ground('M0 150 C200 140 400 156 600 146', pal.paper, 1);
      b += tufts(r, 0, 600, 230, 18);
      for (let i = 0; i < 6; i++) {
        b += leaf(i < 3 ? 20 + i * 40 : 440 + (i - 3) * 50, 160, 70, i < 3 ? -60 : -120, 0.25);
      }
      // far legs, then the body
      b += P('M232 200 L228 218 L238 218 L240 200 M330 196 L336 218 L346 218 L340 196', pal.ink, 1);
      b += P('M170 140 L172 162 Q190 170 210 164 Q225 176 245 176 L250 212 L262 212 L262 184 Q300 190 340 188 L345 212 L357 212 L362 182 Q395 178 405 160 Q415 150 425 156 Q418 146 410 140 Q400 110 360 100 Q310 84 270 90 Q250 92 240 98 L236 78 L226 102 Q205 110 190 126 Q178 134 170 140Z', 'url(#h3)', 1.6);
      // bristles along the spine
      let bristle = '';
      for (let t = 0; t <= 1; t += 0.05) {
        const p = bez([238, 98], [310, 76], [404, 112], t);
        bristle += `M${f(p[0])} ${f(p[1])}l${f(4 + t * 3)} ${f(-8 + t * 3)}`;
      }
      b += P(bristle, null, 1.4);
      // tusk, eye and snout
      b += P('M196 162 Q182 156 188 142', pal.paper, 2) + P('M196 162 Q182 156 188 142', null, 3.5, `stroke="${pal.paper}"`);
      b += circle(208, 128, 3, pal.paper) + circle(208, 128, 1.2, pal.ink);
      b += `<ellipse cx="173" cy="150" rx="3" ry="9" fill="${pal.ink}"/>`;
      return framed(b, 'A wild boar');
    },

    /** A banded viper coiled on warm stones, head raised. */
    viper() {
      const r = rng(221);
      let b = backdrop('url(#h1)');
      b += rock(r, 300, 250, 520, 120);
      const body = 'M200 210 C150 210 150 176 196 168 S300 172 318 196 S258 226 236 206 S300 150 344 140 S360 110 368 104';
      b += P(body, null, 15) + P(body, null, 9, `stroke="${pal.paper}" stroke-dasharray="7 9"`) + P(body, null, 2.5, 'stroke-dasharray="3 13"');
      b += P('M356 108 Q372 92 396 102 Q404 110 396 118 Q374 126 358 116Z', 'url(#h3)', 1.4);
      b += circle(384, 106, 2.4, pal.paper);
      b += P('M402 112 l14 -2 l6 -6 M416 110 l6 4', null, 1);
      return framed(b, 'A viper coiled on the stones');
    },

    /** Thomas Hollis, the wild man: rags, a spear, and hair to his waist. */
    hollis() {
      const r = rng(231);
      let b = backdrop('url(#h2)');
      b += `<ellipse cx="300" cy="140" rx="150" ry="120" fill="${pal.paper}" opacity="0.85"/>`;
      b += ground('M0 216 C200 208 400 222 600 212', pal.paper, 1);
      for (let i = 0; i < 6; i++) {
        b += leaf(i < 3 ? 30 + i * 36 : 460 + (i - 3) * 40, 230, 80, i < 3 ? -50 - i * 10 : -130 + (i - 3) * 10, 0.25);
      }
      // spear
      b += P('M366 12 L340 226', null, 3) + P('M362 0 L372 14 L360 20Z', pal.ink, 1);
      // legs, ragged breeches, body and arms
      b += P('M290 150 L280 214 M310 150 L322 214', null, 13);
      b += P('M272 176 l8 6 l6 -6 l6 6 l6 -6 M300 180 l8 6 l6 -6 l6 6 l8 -4', null, 3, `stroke="${pal.paper}"`);
      b += P('M274 96 L326 96 L320 156 L280 156Z', pal.ink, 1);
      b += P('M277 102 L256 140 L262 162 M323 102 L348 92 L356 70', null, 8);
      // head, wild hair and beard, and staring eyes
      b += circle(300, 74, 15, pal.ink);
      let hair = '';
      for (let a = -170; a <= -10; a += 16) {
        const rad = (a * Math.PI) / 180;
        hair += `M${f(300 + Math.cos(rad) * 13)} ${f(74 + Math.sin(rad) * 13)}l${f(Math.cos(rad) * (12 + r() * 10))} ${f(Math.sin(rad) * (12 + r() * 10) + 4)}`;
      }
      b += P(hair, null, 3);
      b += P('M282 70 L270 120 L278 112 L282 128 L290 114 L296 132 L302 116 L310 130 L314 112 L322 120 L318 70', pal.ink, 1);
      b += P('M282 70 l-12 40 M318 70 l10 44', null, 2.5);
      b += circle(294, 72, 2, pal.paper) + circle(306, 72, 2, pal.paper);
      return framed(b, 'A wild man with a spear');
    },

    /** A shark's fin and tail circling the raft. */
    shark() {
      const r = rng(241);
      let b = seascape(r, 70);
      b += `<ellipse cx="330" cy="190" rx="150" ry="26" fill="url(#h2)" opacity="0.8"/>`;
      b += P('M268 160 Q290 102 344 82 Q332 122 350 160Z', pal.ink, 1.4);
      b += P('M462 158 L486 124 L478 160Z', pal.ink, 1);
      let wake = '';
      for (let i = 0; i < 10; i++) wake += `M${250 + i * 12} ${160 + (i % 2) * 2}q6 -5 12 0`;
      b += P(wake, null, 1);
      b += raft(10, 238, { hull: 1, mast: 0, sail: 0, casks: 0 }, 0.7);
      return framed(b, 'A shark circling');
    },
  };

  /** Draws the named adversary, falling back to the crab. */
  DW.art.foe = function (name) {
    return (FOES[name] || FOES.crab)();
  };

  DW.art.names = Object.assign(DW.art.names || {}, { foes: Object.keys(FOES) });
})();
