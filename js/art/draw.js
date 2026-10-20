/* Driftwood — drawing toolkit.
 * Every picture is drawn procedurally as SVG in the manner of a
 * nineteenth-century wood engraving: hatching, stipple and ink line,
 * roughened by a displacement filter so nothing is quite ruler-straight.
 * This file holds the palette, the shared SVG patterns, and the low-level
 * helpers the drawing modules build on. */
(function () {
  'use strict';

  const DW = window.DW;

  /** The two colours every drawing is made of; swapped by the visual styles. */
  const pal = { ink: '#1c1915', paper: '#f2ede1' };

  let defsHost = null;
  let uidN = 0;

  /** Size of the location and combat illustrations. */
  const SW = 600;
  const SH = 240;

  /** Returns a document-unique id with prefix `p`, for clips and masks. */
  const uid = (p) => `${p}${++uidN}`;

  /** Rounds to one decimal place, to keep path data short. */
  const f = (v) => Math.round(v * 10) / 10;

  /** Returns a seeded random generator (mulberry32), so each picture is drawn the same every time. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- shared patterns ---------------- */

  /** A pattern of parallel lines `size` apart, `sw` thick, rotated by `angle` degrees. */
  const hatch = (id, size, sw, angle) =>
    `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">` +
    `<line x1="0" y1="0" x2="0" y2="${size}" stroke="${pal.ink}" stroke-width="${sw}"/></pattern>`;

  /**
   * The hatching and stipple patterns, roughening filter and glow gradient
   * that drawings refer to by id. They bake in the ink colour, so they are
   * rebuilt whenever the palette changes.
   */
  const defs = () => {
    const ink = pal.ink;
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>\n' +
      [
        hatch('h1', 5, 0.6, 40),
        hatch('h2', 3.2, 0.9, 40),
        hatch('h3', 2.3, 1.15, 40),
        `<pattern id="hx" width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V3.6M0 0H3.6" stroke="${ink}" stroke-width="0.8"/></pattern>`,
        hatch('hr', 4, 0.7, -50),
        `<pattern id="hh" width="9" height="3" patternUnits="userSpaceOnUse"><line x1="0" y1="1.5" x2="9" y2="1.5" stroke="${ink}" stroke-width="0.75"/></pattern>`,
        `<pattern id="hv" width="3" height="9" patternUnits="userSpaceOnUse"><line x1="1.5" y1="0" x2="1.5" y2="9" stroke="${ink}" stroke-width="0.7"/></pattern>`,
        `<pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.55" fill="${ink}"/><circle cx="5" cy="4.6" r="0.45" fill="${ink}"/></pattern>`,
        `<pattern id="dots2" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.6" fill="${ink}"/><circle cx="3" cy="3" r="0.5" fill="${ink}"/></pattern>`,
        '<filter id="rough" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>',
        '<radialGradient id="glow"><stop offset="0" stop-color="#000"/><stop offset="0.55" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>',
      ].join('\n') +
      '\n</defs></svg>';
  };

  /* ---------------- SVG building blocks ---------------- */

  /**
   * Wraps a drawing in an <svg> of `w` × `h` on a paper background. `body`
   * is roughened by the engraving filter; `top` is laid over it crisp.
   */
  function svg(w, h, body, top, label) {
    return `<svg class="art" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label || ''}">` +
      `<rect width="${w}" height="${h}" fill="${pal.paper}"/>` +
      `<g filter="url(#rough)">${body}</g>${top || ''}</svg>`;
  }

  /** A plain ink border around a `w` × `h` drawing. */
  function frame(w, h) {
    return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="${pal.ink}" stroke-width="2"/>`;
  }

  /** Wraps a body as a framed scene illustration (SW × SH), with optional crisp overlay `top`. */
  function framed(body, label, top) {
    return svg(SW, SH, body, (top || '') + frame(SW, SH), label);
  }

  /** Whether `fill` is one of the hatch or stipple patterns, which are clear between their lines. */
  const patterned = (fill) => !!fill && fill.startsWith('url(#') && fill !== 'url(#glow)';

  /**
   * A path in ink. `fill` defaults to none and `sw` (stroke width) to 1;
   * a width of 0 means no stroke. `extra` is appended as raw attributes and
   * may override the stroke colour, e.g. `stroke="…paper…"` for a highlight.
   * A hatched or stippled fill is laid on paper, so the shape hides what is
   * drawn behind it, as it would in an engraving.
   */
  function P(d, fill, sw, extra) {
    extra = extra || '';
    const stroke = /(^|\s)stroke="/.test(extra) ? '' : `stroke="${sw === 0 ? 'none' : pal.ink}" `;
    const under = patterned(fill) ? `<path d="${d}" fill="${pal.paper}" stroke="none"/>` : '';
    return `${under}<path d="${d}" fill="${fill || 'none'}" ${stroke}stroke-width="${sw == null ? 1 : sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  }

  /** A circle filled with `fill` (on paper, if patterned); given a stroke width `sw`, it is also outlined in ink. */
  function circle(cx, cy, r, fill, sw) {
    const stroke = sw == null ? '' : ` stroke="${pal.ink}" stroke-width="${sw}"`;
    const under = patterned(fill) ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pal.paper}"/>` : '';
    return `${under}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${stroke}/>`;
  }

  /** Places `body` in a group translated to (x, y) and scaled by (sx, sy). */
  function at(x, y, sx, sy, body) {
    return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${body}</g>`;
  }

  /** A full-size background rectangle filled with `fill` (usually a hatch pattern). */
  function backdrop(fill, w, h) {
    return `<rect width="${w || SW}" height="${h || SH}" fill="${fill}"/>`;
  }

  /** Ground below the open curve `d`, filled down to the bottom of a scene of width `w` and height `h`. */
  function ground(d, fill, sw, w, h) {
    return P(`${d} L${w || SW} ${h || SH} L0 ${h || SH}Z`, fill, sw);
  }

  /**
   * Night: hatching laid over the whole picture, except for a soft circle
   * of firelight of radius `rad` (none if 0) centred at (cx, cy).
   */
  function darkness(w, h, cx, cy, rad, opacity) {
    const id = uid('m');
    const light = rad ? `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="url(#glow)"/>` : '';
    return `<mask id="${id}"><rect width="${w}" height="${h}" fill="#fff"/>${light}</mask>` +
      `<rect width="${w}" height="${h}" fill="url(#h1)" opacity="${opacity}" mask="url(#${id})"/>`;
  }

  /* ---------------- geometry ---------------- */

  /** Point at `t` along the quadratic Bézier p0 → p1 → p2. */
  function bez(p0, p1, p2, t) {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  }

  /** Unit tangent at `t` along the quadratic Bézier p0 → p1 → p2. */
  function bezTan(p0, p1, p2, t) {
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }

  /** Path data for a smooth Catmull-Rom curve through `pts`, optionally closed. */
  function smooth(pts, closed) {
    const n = pts.length;
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ` +
        `${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return closed ? d + 'Z' : d;
  }

  DW.draw = {
    pal, SW, SH, uid, f, rng,
    svg, frame, framed, P, circle, at, backdrop, ground, darkness,
    bez, bezTan, smooth,
  };

  /* ---------------- public API ---------------- */

  const art = (DW.art = DW.art || {});

  /** Installs the shared patterns and filters into `host`, which must stay in the page. */
  art.install = function (host) {
    defsHost = host;
    host.innerHTML = defs();
  };

  /** Recolours all future drawings; the patterns are rebuilt since they bake in the ink. */
  art.setPalette = function (ink, paper) {
    pal.ink = ink;
    pal.paper = paper;
    if (defsHost) defsHost.innerHTML = defs();
  };
})();
