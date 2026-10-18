/* Driftwood — natural features.
 * Sky, sea, sun and moon, birds, palms, rocks, grass, headlands and leaves.
 * Functions that take `r` draw their irregularities from that seeded
 * random generator, so the same seed always draws the same picture. */
(function () {
  'use strict';

  const DW = window.DW;
  const draw = DW.draw;
  const { pal, f, P, circle, bez, bezTan, smooth, uid } = draw;

  /**
   * An engraver's sky from y0 to y1, `w` wide: horizontal strokes, denser
   * toward the top, with a few cloud-banks. At night it is almost solid.
   */
  function sky(r, w, y0, y1, night) {
    let d = '';
    let y = y0 + 2;
    while (y < y1 - 3) {
      const k = (y - y0) / (y1 - y0);
      const density = night ? 0.97 : Math.max(0, 0.75 - k * 1.1);
      let x = -10 + r() * 30;
      while (x < w) {
        const len = 20 + r() * (night ? 260 : 140);
        if (r() < density) d += `M${f(x)} ${f(y)}h${f(len)}`;
        x += len + (night ? 2 + r() * 8 : 10 + r() * 50);
      }
      y += night ? 2.4 + k * 1.2 : 3 + k * 7;
    }
    // a few cloud-banks of denser line
    if (!night) {
      for (let c = 0; c < 3; c++) {
        const cx = r() * w;
        const cy = y0 + 15 + r() * (y1 - y0) * 0.5;
        for (let i = 0; i < 6; i++) {
          const len = 40 + r() * 90 - i * 8;
          d += `M${f(cx - len / 2 + r() * 10)} ${f(cy + i * 2.4)}h${f(len)}`;
        }
      }
    }
    return P(d, null, night ? 0.85 : 0.55);
  }

  /**
   * Sea from the horizon y0 down to y1: rows of wavelets that grow larger,
   * bolder and further apart toward the viewer. `dark` packs them tighter.
   */
  function sea(r, w, y0, y1, dark) {
    let out = '';
    const bands = [[0, 0.35, 0.5], [0.35, 0.7, 0.75], [0.7, 1.01, 1.05]];
    bands.forEach(([a, b, sw]) => {
      let d = '';
      let y = y0 + 1.5 + (y1 - y0) * a;
      while (y < y0 + (y1 - y0) * b && y < y1) {
        const k = (y - y0) / (y1 - y0);
        let x = r() * 20 - 20;
        while (x < w) {
          const len = (8 + r() * 30) * (0.5 + k * 1.6);
          if (r() < (dark ? 0.96 : 0.72)) {
            const q = len / 4;
            const amp = 0.5 + k * 2.2;
            d += `M${f(x)} ${f(y)}q${f(q)} ${f(-amp)} ${f(q * 2)} 0t${f(q * 2)} 0`;
          }
          x += len + 2 + r() * 12 * (1 + k);
        }
        y += (dark ? 1.8 : 2.4) + k * 6;
      }
      out += P(d, null, sw);
    });
    return out + P(`M0 ${y0}H${w}`, null, 0.9);
  }

  /** Sky above the horizon `hz` and sea below it down to `seaEnd` (default: scene bottom). */
  function seascape(r, hz, seaEnd, night) {
    return sky(r, draw.SW, 0, hz, night) + sea(r, draw.SW, hz, seaEnd || draw.SH, night);
  }

  /** The sun at (x, y), optionally with a ring of alternating long and short rays. */
  function sun(x, y, rad, rays) {
    let s = `<circle cx="${x}" cy="${y}" r="${rad}" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="1.1"/>`;
    if (rays) {
      let d = '';
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const l = i % 2 ? rad * 0.35 : rad * 0.7;
        const r0 = rad + 4;
        d += `M${f(x + Math.cos(a) * r0)} ${f(y + Math.sin(a) * r0)}L${f(x + Math.cos(a) * (r0 + l))} ${f(y + Math.sin(a) * (r0 + l))}`;
      }
      s += P(d, null, 0.8);
    }
    return s;
  }

  /** A hatched crescent moon at (x, y), cut out of the night sky by a paper halo. */
  function moon(x, y, rad) {
    const cx = x + rad * 0.2;
    return circle(x, y, rad + 6, pal.paper) +
      circle(x, y, rad, pal.paper, 1) +
      `<path d="M${cx} ${y - rad}A${rad} ${rad} 0 0 1 ${cx} ${y + rad}A${rad * 0.7} ${rad} 0 0 0 ${cx} ${y - rad}Z" fill="url(#h1)"/>` +
      circle(x - rad * 0.3, y - rad * 0.2, rad * 0.18, 'url(#h1)');
  }

  /** Twenty-six cross-shaped stars scattered over a `w` × `h` sky. */
  function stars(r, w, h) {
    let s = '';
    for (let i = 0; i < 26; i++) {
      const x = f(r() * w);
      const y = f(r() * h);
      const z = 1.2 + r() * 2;
      s += circle(x, y, z + 1.5, pal.paper) + P(`M${x - z} ${y}h${z * 2}M${x} ${y - z}v${z * 2}`, null, 0.7);
    }
    return s;
  }

  /** `n` distant gulls, drawn as shallow "m" shapes scattered around (x, y). */
  function birds(r, x, y, n, spread) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const bx = x + (r() - 0.5) * spread;
      const by = y + (r() - 0.5) * spread * 0.4;
      const s = 3 + r() * 3;
      d += `M${f(bx - s)} ${f(by)}q${f(s / 2)} ${f(-s * 0.7)} ${f(s)} 0q${f(s / 2)} ${f(-s * 0.7)} ${f(s)} 0`;
    }
    return P(d, null, 0.9);
  }

  /**
   * A coconut palm rooted at (x, y), `h` tall, its crown leaning `lean`
   * sideways, scaled by `sc`: a ringed, curving trunk, nine feathered fronds
   * and a cluster of nuts.
   */
  function palm(r, x, y, h, lean, sc) {
    sc = sc || 1;
    const top = [x + lean, y - h];
    const ctl = [x + lean * 0.1, y - h * 0.55];
    const base = [x, y];
    const bw = 7 * sc;
    const tw = 3.4 * sc;
    let s = P(
      `M${x - bw} ${y}Q${f(ctl[0] - bw * 0.7)} ${f(ctl[1])} ${f(top[0] - tw)} ${f(top[1])}` +
      `L${f(top[0] + tw)} ${f(top[1])}Q${f(ctl[0] + bw * 0.7)} ${f(ctl[1])} ${x + bw} ${y}Z`,
      'url(#h1)', 1.1,
    );

    // trunk rings and shadow side
    let rings = '';
    let shade = '';
    for (let t = 0.04; t < 0.97; t += 0.055) {
      const p = bez(base, ctl, top, t);
      const wt = bw + (tw - bw) * t;
      rings += `M${f(p[0] - wt)} ${f(p[1])}q${f(wt)} ${f(2.4 * sc)} ${f(wt * 2)} 0`;
      shade += `M${f(p[0] + wt * 0.2)} ${f(p[1] + 1)}l${f(wt * 0.7)} ${f(-1.5)}`;
    }
    s += P(rings, null, 0.8) + P(shade, null, 0.9);

    // fronds: a curved rib, with leaflets hanging from both sides
    const angles = [-172, -145, -120, -95, -70, -45, -18, 8, 188];
    let ribs = '';
    let leaves = '';
    angles.forEach((deg) => {
      const a = ((deg + (r() - 0.5) * 14) * Math.PI) / 180;
      const len = (46 + r() * 22) * sc;
      const end = [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len + len * 0.42];
      const c = [top[0] + Math.cos(a) * len * 0.55, top[1] + Math.sin(a) * len * 0.55 - len * 0.22];
      ribs += `M${f(top[0])} ${f(top[1])}Q${f(c[0])} ${f(c[1])} ${f(end[0])} ${f(end[1])}`;
      for (let t = 0.1; t <= 1; t += 0.065) {
        const p = bez(top, c, end, t);
        const tg = bezTan(top, c, end, t);
        const L = 14 * sc * (1 - t * 0.6);
        [-1, 1].forEach((side) => {
          const ex = p[0] + -tg[1] * side * L * 0.75 + tg[0] * L * 0.35;
          const ey = p[1] + tg[0] * side * L * 0.75 + tg[1] * L * 0.35 + L * 0.55;
          leaves += `M${f(p[0])} ${f(p[1])}Q${f((p[0] + ex) / 2)} ${f((p[1] + ey) / 2 - 2)} ${f(ex)} ${f(ey)}`;
        });
      }
    });
    s += P(leaves, null, 0.8) + P(ribs, null, 1.3);

    // coconuts
    for (let i = 0; i < 3; i++) {
      s += circle(f(top[0] - 4 * sc + i * 4 * sc), f(top[1] + 4 * sc + (i % 2) * 2), f(3.2 * sc), 'url(#h3)', 0.8);
    }
    return s;
  }

  /** A boulder `w` wide and `h` tall sitting on (x, y): a lumpy dome, hatched darker on its shadow side. */
  function rock(r, x, y, w, h) {
    const pts = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      const rr = 0.8 + r() * 0.3;
      pts.push([x + Math.cos(a) * (w / 2) * rr, y + Math.sin(a) * h * rr]);
    }
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + 'Z';
    const id = uid('rk');
    const cracks = `M${f(x - w * 0.25)} ${f(y - h * 0.7)}l${f(w * 0.12)} ${f(h * 0.3)}l${f(-w * 0.05)} ${f(h * 0.3)}` +
      `M${f(x + w * 0.15)} ${f(y - h * 0.9)}l${f(-w * 0.08)} ${f(h * 0.4)}`;
    return `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
      P(d, pal.paper, 0) +
      `<g clip-path="url(#${id})">` +
      `<rect x="${f(x + w * 0.05)}" y="${f(y - h * 1.3)}" width="${f(w)}" height="${f(h * 1.4)}" fill="url(#h2)"/>` +
      `<rect x="${f(x - w)}" y="${f(y - h * 0.3)}" width="${f(w * 2)}" height="${f(h)}" fill="url(#h1)"/>` +
      P(cracks, null, 0.8) +
      '</g>' + P(d, null, 1.2);
  }

  /** `n` tufts of dune grass scattered between x0 and x1 around height y. */
  function tufts(r, x0, x1, y, n) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0);
      const yy = y + (r() - 0.5) * 10;
      for (let j = 0; j < 4; j++) d += `M${f(x + j * 1.5)} ${f(yy)}q${f(-2 + j * 1.5)} -5 ${f(-4 + j * 3)} ${f(-7 - r() * 4)}`;
    }
    return P(d, null, 0.7);
  }

  /** A hatched headland rising from (x, y), `w` wide and up to `h` tall, with a few tiny palms. */
  function headland(r, x, y, w, h, palms) {
    const pts = [[x, y]];
    const n = 8;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([x + w * t, y - h * Math.sin(Math.PI * Math.pow(t, 0.8)) * (0.85 + r() * 0.3)]);
    }
    pts.push([x + w, y]);
    let s = P(smooth(pts, false) + 'Z', 'url(#h1)', 1);
    for (let i = 0; i < palms; i++) {
      const px = x + w * (0.2 + r() * 0.6);
      s += palm(r, px, y - h * 0.75 + 4, 16 + r() * 8, (r() - 0.5) * 6, 0.22);
    }
    return s;
  }

  /** A broad hatched leaf from (x, y), `len` long at `ang` degrees, with paper-white midrib and veins. */
  function leaf(x, y, len, ang, wide) {
    const a = (ang * Math.PI) / 180;
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;
    const nx = -Math.sin(a) * len * (wide || 0.28);
    const ny = Math.cos(a) * len * (wide || 0.28);
    const mx = (x + ex) / 2;
    const my = (y + ey) / 2;
    let veins = '';
    for (let t = 0.2; t < 0.9; t += 0.14) {
      const px = x + (ex - x) * t;
      const py = y + (ey - y) * t;
      veins += `M${f(px)} ${f(py)}l${f(nx * 0.6 + (ex - x) * 0.08)} ${f(ny * 0.6 + (ey - y) * 0.08)}`;
    }
    const paperStroke = `stroke="${pal.paper}"`;
    return P(`M${f(x)} ${f(y)}Q${f(mx + nx)} ${f(my + ny)} ${f(ex)} ${f(ey)}Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)}Z`, 'url(#h2)', 1) +
      P(`M${f(x)} ${f(y)}L${f(ex)} ${f(ey)}`, null, 0.8, paperStroke) +
      P(veins, null, 0.5, paperStroke);
  }

  Object.assign(draw, { sky, sea, seascape, sun, moon, stars, birds, palm, rock, tufts, headland, leaf });
})();
