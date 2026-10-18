/* Driftwood — people and made things.
 * The camp fire, the castaway and Hollis, the camp's buildings, the raft,
 * and the ships of the story. */
(function () {
  'use strict';

  const DW = window.DW;
  const draw = DW.draw;
  const { pal, f, P, circle, at } = draw;

  /** A wisp of animated smoke rising from (x, y). */
  const smoke = (x, y) =>
    `<path class="smoke" d="M${x} ${y}c-6 -10 6 -18 0 -28s6 -18 0 -28" fill="none" stroke="${pal.ink}" stroke-width="0.7"/>`;

  /** A taller wisp of smoke, as rises from a burning fire. */
  const tallSmoke = (x, y) =>
    `<path class="smoke" d="M${x} ${y}c-8 -12 8 -20 0 -32s8 -20 0 -32" fill="none" stroke="${pal.ink}" stroke-width="0.7"/>`;

  /**
   * A camp fire at (x, y) within a ring of stones. `level` runs from 0
   * (crossed logs and a thread of smoke) to 4 (five flickering tongues of
   * flame throwing sparks).
   */
  function fire(x, y, level, sc) {
    sc = sc || 1;
    let s = '';

    // ring of stones, front half only
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      if (Math.sin(a) < -0.2) continue;
      s += `<ellipse cx="${f(x + Math.cos(a) * 22 * sc)}" cy="${f(y + Math.sin(a) * 6 * sc)}" rx="${f(5.5 * sc)}" ry="${f(3.8 * sc)}" fill="url(#h2)" stroke="${pal.ink}" stroke-width="0.9"/>`;
    }

    // crossed logs, their cut ends showing pale
    s += P(`M${f(x - 18 * sc)} ${f(y + 1)}L${f(x + 14 * sc)} ${f(y - 8 * sc)}M${f(x - 14 * sc)} ${f(y - 8 * sc)}L${f(x + 18 * sc)} ${f(y + 1)}`, null, 5.5 * sc);
    s += circle(f(x - 18 * sc), f(y + 1), f(2.2 * sc), pal.paper) + circle(f(x + 18 * sc), f(y + 1), f(2.2 * sc), pal.paper);
    if (level <= 0) return s + smoke(x, y - 6);

    // tongues of flame, each a hatched outer shape around a paper-white core
    const H = [0, 12, 22, 34, 48][level] * sc;
    const tongues = [[0, 1], [-7, 0.7], [7, 0.75], [-12, 0.45], [12, 0.5]].slice(0, level + 1);
    tongues.forEach(([dx, k], i) => {
      const h = H * k;
      const w = (6 + level) * sc * (0.6 + k * 0.4);
      const bx = x + dx * sc;
      const by = y - 4 * sc;
      const outer = `M${f(bx)} ${f(by)}C${f(bx - w)} ${f(by - h * 0.25)} ${f(bx - w * 0.4)} ${f(by - h * 0.7)} ${f(bx + w * 0.15)} ${f(by - h)}` +
        `C${f(bx + w * 0.1)} ${f(by - h * 0.6)} ${f(bx + w)} ${f(by - h * 0.35)} ${f(bx)} ${f(by)}Z`;
      const ih = h * 0.55;
      const iw = w * 0.45;
      const inner = `M${f(bx)} ${f(by)}C${f(bx - iw)} ${f(by - ih * 0.3)} ${f(bx - iw * 0.3)} ${f(by - ih * 0.7)} ${f(bx + iw * 0.1)} ${f(by - ih)}` +
        `C${f(bx + iw * 0.2)} ${f(by - ih * 0.5)} ${f(bx + iw)} ${f(by - ih * 0.3)} ${f(bx)} ${f(by)}Z`;
      s += `<g class="flame f${(i % 3) + 1}">${P(outer, 'url(#h2)', 1)}${P(inner, pal.paper, 0.7)}</g>`;
    });
    if (level >= 3) {
      for (let i = 0; i < level; i++) {
        s += `<circle class="spark" style="animation-delay:${-i * 0.45}s" cx="${f(x + (i - level / 2) * 6 * sc)}" cy="${f(y - H - 2)}" r="1" fill="${pal.ink}"/>`;
      }
    }
    if (level >= 2) s += tallSmoke(x, f(y - H));
    return s;
  }

  /**
   * A castaway sitting with knees drawn up at (x, y), facing right (flip
   * with dir = -1). `wild` gives him Hollis's matted hair instead of a hat.
   */
  function sitter(x, y, sc, dir, wild) {
    const hat = wild
      ? P('M-4 -36 l-4 -6 l4 2 l1 -6 l3 5 l3 -6 l1 6 l4 -3 l-2 7', pal.ink, 0.6) + P('M-1 -31 l4 9 l3 -9', pal.ink, 0.5)
      : `<ellipse cx="2" cy="-37.5" rx="8.5" ry="1.7" fill="${pal.ink}"/>` + P('M-3 -37.5 L-2 -44 Q2 -46 6 -44 L7 -37.5 Z', pal.ink, 0.6);
    return at(x, y, sc * dir, sc,
      P('M-8 0 C-11 -8 -10 -20 -4 -27 L1 -29 L5 -26 L12 -20 L14 -19 L16 -12 L17 -2 L21 -1 L21 0 Z', pal.ink, 0.6) +
      circle(2, -34, 5, pal.ink) + hat + P('M4 -24 L13 -17', pal.paper, 0.6));
  }

  /** A hatted figure standing at (x, y), facing right (flip with dir = -1); `opts.wave` raises an arm. */
  function stander(x, y, sc, dir, opts) {
    opts = opts || {};
    const arm = opts.wave
      ? P('M4 -26 L10 -36 L12 -44', null, 3)
      : P('M4 -26 L8 -16 L7 -10', null, 3);
    return at(x, y, sc * dir, sc,
      P('M-5 -29 L5 -29 L6 -14 L3.5 0 L1 0 L0 -12 L-1 0 L-3.5 0 L-6 -14 Z', pal.ink, 0.6) +
      circle(0, -34, 4.6, pal.ink) +
      `<ellipse cx="0" cy="-37.4" rx="7.5" ry="1.5" fill="${pal.ink}"/>` + P('M-4 -37.4 L-3 -43 Q0 -45 4 -43 L4.6 -37.4Z', pal.ink, 0.5) +
      P('M-4 -26 L-7 -16 L-6 -10', null, 3) + arm);
  }

  /** A lean-to with its front edge at (x, y): two posts and a ridge-pole under a sloping roof of fronds. */
  function leanto(x, y, sc) {
    sc = sc || 1;
    const w = 74 * sc;
    const h = 42 * sc;
    const back = 34 * sc;
    const roof = `M${x} ${y - h}L${x + w} ${y - h}L${x + w + back} ${y - 2}L${x + back} ${y - 2}Z`;
    let fronds = '';
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const sx = x + w * t;
      fronds += `M${f(sx)} ${f(y - h)}L${f(sx + back + 3)} ${f(y - 1)}`;
      fronds += `M${f(sx + 3)} ${f(y - h * 0.6)}l5 4M${f(sx + 6)} ${f(y - h * 0.35)}l5 4`;
    }
    return P(`M${x - 2} ${y + 2}L${x + 2} ${y - h - 6}M${x + w + 2} ${y + 2}L${x + w - 2} ${y - h - 6}`, null, 2.4) +
      P(roof, 'url(#h2)', 1.1) + P(fronds, null, 0.7) +
      P(`M${x - 6} ${y - h}H${x + w + 6}`, null, 2.6) +
      P(`M${x} ${y}L${x + back} ${y - 2}`, null, 0.8);
  }

  /** A rain catcher at (x, y): canvas slung between two posts, dripping into a shell. */
  function catcher(x, y) {
    return P(`M${x} ${y}L${x} ${y - 30}M${x + 34} ${y - 3}L${x + 34} ${y - 33}`, null, 1.8) +
      P(`M${x} ${y - 28}Q${x + 17} ${y - 10} ${x + 34} ${y - 31}L${x + 34} ${y - 33}Q${x + 17} ${y - 26} ${x} ${y - 30}Z`, 'url(#h1)', 1) +
      P(`M${x + 11} ${y + 1}a7 4 0 0 0 14 0Z`, 'url(#h2)', 1) +
      P(`M${x + 18} ${y - 15}v10`, null, 0.6, 'stroke-dasharray="2 2"');
  }

  /** A crescent of stakes in the shallows at (x, y); the arc widens with each of the `n` weirs built. */
  function weir(x, y, n) {
    let d = '';
    for (let i = 0; i < 9 + n * 3; i++) {
      const a = Math.PI * (0.1 + (i / (8 + n * 3)) * 0.8);
      const px = x + Math.cos(a) * (26 + n * 8);
      const py = y - Math.sin(a) * 9;
      d += `M${f(px)} ${f(py)}v-9`;
    }
    return P(d, null, 1.5);
  }

  /** A smoking rack at (x, y): two A-frames and a crossbar hung with four split fish. */
  function rack(x, y) {
    let s = P(`M${x} ${y}L${x + 14} ${y - 40}L${x + 28} ${y}M${x + 40} ${y}L${x + 54} ${y - 40}L${x + 68} ${y}M${x + 8} ${y - 34}H${x + 62}`, null, 1.8);
    for (let i = 0; i < 4; i++) {
      const fx = x + 19 + i * 10;
      s += P(`M${fx} ${y - 34}v4`, null, 0.6) + P(`M${fx} ${y - 30}c-3 3 -3 9 0 13c3 -4 3 -10 0 -13Zm0 13l-3 4h6Z`, 'url(#h2)', 0.8);
    }
    return s;
  }

  /** A hooped water cask standing at (x, y). */
  function cask(x, y, sc) {
    sc = sc || 1;
    return at(x, y, sc, sc,
      P('M-9 0 Q-11 -11 -9 -22 L9 -22 Q11 -11 9 0 Z', 'url(#hv)', 1) +
      P('M-10 -5H10M-10.6 -17H10.6', null, 1.6) + `<ellipse cx="0" cy="-22" rx="9" ry="2.5" fill="${pal.paper}" stroke="${pal.ink}"/>`);
  }

  /**
   * The raft at (x, y), showing whichever `parts` are built (hull, mast,
   * sail, casks). With no hull yet, it is just a pile of waiting timber.
   */
  function raft(x, y, parts, sc) {
    sc = sc || 1;
    let s = '';
    if (!parts.hull) {
      for (let i = 0; i < 4; i++) s += P(`M${x + i * 5} ${y - i * 4}h70`, null, 5);
      return s;
    }

    // nine logs, each an ink outline around a paper core, with pale cut ends
    for (let i = 0; i < 9; i++) {
      const lx = x + i * 11 * sc;
      const log = `M${f(lx)} ${f(y - 4 * sc)}l${f(18 * sc)} ${f(-18 * sc)}`;
      s += P(log, null, 9 * sc) + P(log, null, 6.5 * sc, `stroke="${pal.paper}"`);
      s += circle(f(lx + 18 * sc), f(y - 22 * sc), f(3.6 * sc), pal.paper, 0.8);
    }
    s += P(`M${f(x + 4 * sc)} ${f(y - 8 * sc)}l${f(96 * sc)} 0M${f(x + 12 * sc)} ${f(y - 16 * sc)}l${f(96 * sc)} 0`, null, 1.2);

    const mx = x + 58 * sc;
    const my = y - 12 * sc;
    if (parts.mast) {
      s += P(`M${f(mx)} ${f(my)}V${f(my - 90 * sc)}M${f(mx - 24 * sc)} ${f(my - 80 * sc)}H${f(mx + 24 * sc)}`, null, 2.4);
    }
    if (parts.sail && parts.mast) {
      s += P(
        `M${f(mx - 23 * sc)} ${f(my - 79 * sc)}Q${f(mx - 4 * sc)} ${f(my - 60 * sc)} ${f(mx - 26 * sc)} ${f(my - 26 * sc)}` +
        `L${f(mx + 26 * sc)} ${f(my - 26 * sc)}Q${f(mx + 34 * sc)} ${f(my - 55 * sc)} ${f(mx + 23 * sc)} ${f(my - 79 * sc)}Z`,
        'url(#h1)', 1.1,
      );
    }
    if (parts.casks) s += cask(x + 28 * sc, y - 12 * sc, 0.8 * sc) + cask(x + 92 * sc, y - 12 * sc, 0.8 * sc);
    return s;
  }

  /** One square sail centred on `cx`, from yard `top` down to `bot`, `w` wide. */
  function squareSail(cx, top, bot, w) {
    const a = w / 2;
    return P(`M${cx - a} ${top}Q${cx} ${top - 3} ${cx + a} ${top}L${cx + a * 0.92} ${bot}Q${cx} ${bot + 6} ${cx - a * 0.92} ${bot}Z`, pal.paper, 1) +
      P(`M${cx + a * 0.2} ${top + 2}L${cx + a * 0.25} ${bot + 3}M${cx + a * 0.55} ${top + 1}L${cx + a * 0.6} ${bot + 1}`, null, 0.6);
  }

  /** A three-masted, square-rigged barque at (x, y), its waterline at local y = 0, facing `dir`. */
  function ship(x, y, sc, dir) {
    dir = dir || 1;
    let s = '';
    // rigging, then masts
    s += P('M-30 -72 L-50 -6 M0 -84 L-50 -6 M0 -84 L52 -10 M28 -74 L74 -24 M-30 -64 L0 -74', null, 0.5);
    s += P('M-30 -8 V-68 M0 -8 V-86 M28 -8 V-76', null, 1.6);
    // three tiers of sail on each mast: [mast x, course width, [[bottom, top] per tier]]
    const masts = [
      [-30, 26, [[-14, -32], [-34, -50], [-52, -64]]],
      [0, 30, [[-14, -36], [-38, -58], [-60, -78]]],
      [28, 26, [[-14, -32], [-34, -52], [-54, -68]]],
    ];
    masts.forEach(([cx, w, tiers]) => {
      tiers.forEach(([b, t], i) => {
        s += squareSail(cx, t, b, w - i * 6);
      });
    });
    // jib and bowsprit, hull with a row of painted gunports, pennant
    s += P('M28 -70 L74 -24 L44 -16 Z', pal.paper, 0.9) + P('M48 -10 L76 -24', null, 1.4);
    s += P('M-50 -10 L46 -10 L54 -16 Q48 0 36 4 L-42 4 Q-50 0 -50 -10 Z', pal.ink, 1) +
      P('M-46 -5 H44', null, 0.6, `stroke="${pal.paper}" stroke-dasharray="3 4"`);
    s += P('M0 -86 l10 3 l-10 3', pal.ink, 0.5);
    return at(x, y, sc * dir, sc, s);
  }

  /** A ship's longboat at (x, y) with three rowers at their oars. */
  function longboat(x, y, sc) {
    return at(x, y, sc, sc,
      P('M-22 -4 L22 -4 Q18 4 10 5 L-14 5 Q-20 2 -22 -4Z', pal.ink, 0.8) +
      P('M-14 -4 l-8 10 M-4 -4 l-8 10 M6 -4 l-8 10 M14 -4 l-8 10', null, 1) +
      circle(-10, -9, 2.6, pal.ink) + circle(0, -9, 2.6, pal.ink) + circle(10, -9, 2.6, pal.ink) +
      P('M-12 -6 v-2 M-2 -6 v-2 M8 -6 v-2', null, 4));
  }

  Object.assign(draw, { fire, sitter, stander, leanto, catcher, weir, rack, cask, raft, ship, longboat });
})();
