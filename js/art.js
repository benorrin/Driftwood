/* Driftwood — illustrations.
 * Every picture is drawn procedurally as SVG in the manner of a
 * nineteenth-century wood engraving: hatching, stipple and ink line,
 * roughened by a displacement filter so nothing is quite ruler-straight. */
(function () {
  'use strict';

  const ART = (window.DWArt = {});
  let INK = '#1c1915';
  let PAPER = '#f2ede1';
  let defsHost = null;
  let uidN = 0;
  const uid = (p) => `${p}${++uidN}`;
  const f = (v) => Math.round(v * 10) / 10;

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

  const defs = () => `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<pattern id="h1" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="5" stroke="${INK}" stroke-width="0.6"/></pattern>
<pattern id="h2" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="3.2" stroke="${INK}" stroke-width="0.9"/></pattern>
<pattern id="h3" width="2.3" height="2.3" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="2.3" stroke="${INK}" stroke-width="1.15"/></pattern>
<pattern id="hx" width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V3.6M0 0H3.6" stroke="${INK}" stroke-width="0.8"/></pattern>
<pattern id="hr" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-50)"><line x1="0" y1="0" x2="0" y2="4" stroke="${INK}" stroke-width="0.7"/></pattern>
<pattern id="hh" width="9" height="3" patternUnits="userSpaceOnUse"><line x1="0" y1="1.5" x2="9" y2="1.5" stroke="${INK}" stroke-width="0.75"/></pattern>
<pattern id="hv" width="3" height="9" patternUnits="userSpaceOnUse"><line x1="1.5" y1="0" x2="1.5" y2="9" stroke="${INK}" stroke-width="0.7"/></pattern>
<pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.55" fill="${INK}"/><circle cx="5" cy="4.6" r="0.45" fill="${INK}"/></pattern>
<pattern id="dots2" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.6" fill="${INK}"/><circle cx="3" cy="3" r="0.5" fill="${INK}"/></pattern>
<filter id="rough" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>
<radialGradient id="glow"><stop offset="0" stop-color="#000"/><stop offset="0.55" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>
</defs></svg>`;

  ART.install = function (host) {
    defsHost = host;
    host.innerHTML = defs();
  };

  // recolour all future drawings; patterns are rebuilt since they bake in the ink
  ART.setPalette = function (ink, paper) {
    INK = ink;
    PAPER = paper;
    if (defsHost) defsHost.innerHTML = defs();
  };

  function svg(w, h, body, top, label) {
    return `<svg class="art" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label || ''}">` +
      `<rect width="${w}" height="${h}" fill="${PAPER}"/>` +
      `<g filter="url(#rough)">${body}</g>${top || ''}</svg>`;
  }

  // a path; `extra` may override the stroke colour (e.g. a paper highlight)
  const P = (d, fill, sw, extra) => {
    extra = extra || '';
    const stroke = /(^|\s)stroke="/.test(extra) ? '' : `stroke="${sw === 0 ? 'none' : INK}" `;
    return `<path d="${d}" fill="${fill || 'none'}" ${stroke}stroke-width="${sw == null ? 1 : sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  };

  function bez(p0, p1, p2, t) {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  }
  function bezTan(p0, p1, p2, t) {
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }

  function smooth(pts, closed) {
    const n = pts.length;
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return closed ? d + 'Z' : d;
  }

  /* ---------------- primitives ---------------- */

  // engraver's sky: horizontal strokes, thicker toward the top
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

  function sun(x, y, rad, rays) {
    let s = `<circle cx="${x}" cy="${y}" r="${rad}" fill="${PAPER}" stroke="${INK}" stroke-width="1.1"/>`;
    if (rays) {
      let d = '';
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const l = i % 2 ? rad * 0.35 : rad * 0.7;
        d += `M${f(x + Math.cos(a) * (rad + 4))} ${f(y + Math.sin(a) * (rad + 4))}L${f(x + Math.cos(a) * (rad + 4 + l))} ${f(y + Math.sin(a) * (rad + 4 + l))}`;
      }
      s += P(d, null, 0.8);
    }
    return s;
  }

  function moon(x, y, rad) {
    return `<circle cx="${x}" cy="${y}" r="${rad + 6}" fill="${PAPER}"/>` +
      `<circle cx="${x}" cy="${y}" r="${rad}" fill="${PAPER}" stroke="${INK}" stroke-width="1"/>` +
      `<path d="M${x + rad * 0.2} ${y - rad}A${rad} ${rad} 0 0 1 ${x + rad * 0.2} ${y + rad}A${rad * 0.7} ${rad} 0 0 0 ${x + rad * 0.2} ${y - rad}Z" fill="url(#h1)"/>` +
      `<circle cx="${x - rad * 0.3}" cy="${y - rad * 0.2}" r="${rad * 0.18}" fill="url(#h1)"/>`;
  }

  function stars(r, w, h) {
    let s = '';
    for (let i = 0; i < 26; i++) {
      const x = f(r() * w);
      const y = f(r() * h);
      const z = 1.2 + r() * 2;
      s += `<circle cx="${x}" cy="${y}" r="${z + 1.5}" fill="${PAPER}"/>` + P(`M${x - z} ${y}h${z * 2}M${x} ${y - z}v${z * 2}`, null, 0.7);
    }
    return s;
  }

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

  function palm(r, x, y, h, lean, sc) {
    sc = sc || 1;
    const top = [x + lean, y - h];
    const ctl = [x + lean * 0.1, y - h * 0.55];
    const base = [x, y];
    const bw = 7 * sc;
    const tw = 3.4 * sc;
    let s = P(`M${x - bw} ${y}Q${f(ctl[0] - bw * 0.7)} ${f(ctl[1])} ${f(top[0] - tw)} ${f(top[1])}L${f(top[0] + tw)} ${f(top[1])}Q${f(ctl[0] + bw * 0.7)} ${f(ctl[1])} ${x + bw} ${y}Z`, 'url(#h1)', 1.1);
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
    // fronds
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
    for (let i = 0; i < 3; i++) {
      s += `<circle cx="${f(top[0] - 4 * sc + i * 4 * sc)}" cy="${f(top[1] + 4 * sc + (i % 2) * 2)}" r="${f(3.2 * sc)}" fill="url(#h3)" stroke="${INK}" stroke-width="0.8"/>`;
    }
    return s;
  }

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
    return `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
      P(d, PAPER, 0) +
      `<g clip-path="url(#${id})"><rect x="${f(x + w * 0.05)}" y="${f(y - h * 1.3)}" width="${f(w)}" height="${f(h * 1.4)}" fill="url(#h2)"/>` +
      `<rect x="${f(x - w)}" y="${f(y - h * 0.3)}" width="${f(w * 2)}" height="${f(h)}" fill="url(#h1)"/>` +
      P(`M${f(x - w * 0.25)} ${f(y - h * 0.7)}l${f(w * 0.12)} ${f(h * 0.3)}l${f(-w * 0.05)} ${f(h * 0.3)}M${f(x + w * 0.15)} ${f(y - h * 0.9)}l${f(-w * 0.08)} ${f(h * 0.4)}`, null, 0.8) +
      '</g>' + P(d, null, 1.2);
  }

  function tufts(r, x0, x1, y, n) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0);
      const yy = y + (r() - 0.5) * 10;
      for (let j = 0; j < 4; j++) d += `M${f(x + j * 1.5)} ${f(yy)}q${f(-2 + j * 1.5)} -5 ${f(-4 + j * 3)} ${f(-7 - r() * 4)}`;
    }
    return P(d, null, 0.7);
  }

  function fire(x, y, level, sc) {
    sc = sc || 1;
    let s = '';
    // ring of stones
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      if (Math.sin(a) < -0.2) continue;
      s += `<ellipse cx="${f(x + Math.cos(a) * 22 * sc)}" cy="${f(y + Math.sin(a) * 6 * sc)}" rx="${f(5.5 * sc)}" ry="${f(3.8 * sc)}" fill="url(#h2)" stroke="${INK}" stroke-width="0.9"/>`;
    }
    s += P(`M${f(x - 18 * sc)} ${f(y + 1)}L${f(x + 14 * sc)} ${f(y - 8 * sc)}M${f(x - 14 * sc)} ${f(y - 8 * sc)}L${f(x + 18 * sc)} ${f(y + 1)}`, null, 5.5 * sc);
    s += `<circle cx="${f(x - 18 * sc)}" cy="${f(y + 1)}" r="${f(2.2 * sc)}" fill="${PAPER}"/><circle cx="${f(x + 18 * sc)}" cy="${f(y + 1)}" r="${f(2.2 * sc)}" fill="${PAPER}"/>`;
    if (level <= 0) {
      return s + `<path class="smoke" d="M${x} ${y - 6}c-6 -10 6 -18 0 -28s6 -18 0 -28" fill="none" stroke="${INK}" stroke-width="0.7"/>`;
    }
    const H = [0, 12, 22, 34, 48][level] * sc;
    const tongues = [[0, 1], [-7, 0.7], [7, 0.75], [-12, 0.45], [12, 0.5]].slice(0, level + 1);
    tongues.forEach(([dx, k], i) => {
      const h = H * k;
      const w = (6 + level) * sc * (0.6 + k * 0.4);
      const bx = x + dx * sc;
      const by = y - 4 * sc;
      const outer = `M${f(bx)} ${f(by)}C${f(bx - w)} ${f(by - h * 0.25)} ${f(bx - w * 0.4)} ${f(by - h * 0.7)} ${f(bx + w * 0.15)} ${f(by - h)}C${f(bx + w * 0.1)} ${f(by - h * 0.6)} ${f(bx + w)} ${f(by - h * 0.35)} ${f(bx)} ${f(by)}Z`;
      const ih = h * 0.55;
      const iw = w * 0.45;
      const inner = `M${f(bx)} ${f(by)}C${f(bx - iw)} ${f(by - ih * 0.3)} ${f(bx - iw * 0.3)} ${f(by - ih * 0.7)} ${f(bx + iw * 0.1)} ${f(by - ih)}C${f(bx + iw * 0.2)} ${f(by - ih * 0.5)} ${f(bx + iw)} ${f(by - ih * 0.3)} ${f(bx)} ${f(by)}Z`;
      s += `<g class="flame f${(i % 3) + 1}">${P(outer, 'url(#h2)', 1)}${P(inner, PAPER, 0.7)}</g>`;
    });
    if (level >= 3) {
      for (let i = 0; i < level; i++) {
        s += `<circle class="spark" style="animation-delay:${-i * 0.45}s" cx="${f(x + (i - level / 2) * 6 * sc)}" cy="${f(y - H - 2)}" r="1" fill="${INK}"/>`;
      }
    }
    if (level >= 2) {
      s += `<path class="smoke" d="M${x} ${f(y - H)}c-8 -12 8 -20 0 -32s8 -20 0 -32" fill="none" stroke="${INK}" stroke-width="0.7"/>`;
    }
    return s;
  }

  // a castaway sitting with knees drawn up, facing right (flip with dir=-1)
  function sitter(x, y, sc, dir, wild) {
    const hat = wild
      ? P('M-4 -36 l-4 -6 l4 2 l1 -6 l3 5 l3 -6 l1 6 l4 -3 l-2 7', INK, 0.6) + P('M-1 -31 l4 9 l3 -9', INK, 0.5)
      : `<ellipse cx="2" cy="-37.5" rx="8.5" ry="1.7" fill="${INK}"/>` + P('M-3 -37.5 L-2 -44 Q2 -46 6 -44 L7 -37.5 Z', INK, 0.6);
    return `<g transform="translate(${x} ${y}) scale(${sc * dir} ${sc})">` +
      P('M-8 0 C-11 -8 -10 -20 -4 -27 L1 -29 L5 -26 L12 -20 L14 -19 L16 -12 L17 -2 L21 -1 L21 0 Z', INK, 0.6) +
      `<circle cx="2" cy="-34" r="5" fill="${INK}"/>` + hat + P('M4 -24 L13 -17', PAPER, 0.6) + '</g>';
  }

  function stander(x, y, sc, dir, opts) {
    opts = opts || {};
    const arm = opts.wave
      ? P('M4 -26 L10 -36 L12 -44', null, 3)
      : P('M4 -26 L8 -16 L7 -10', null, 3);
    return `<g transform="translate(${x} ${y}) scale(${sc * dir} ${sc})">` +
      P('M-5 -29 L5 -29 L6 -14 L3.5 0 L1 0 L0 -12 L-1 0 L-3.5 0 L-6 -14 Z', INK, 0.6) +
      `<circle cx="0" cy="-34" r="4.6" fill="${INK}"/>` +
      `<ellipse cx="0" cy="-37.4" rx="7.5" ry="1.5" fill="${INK}"/>` + P('M-4 -37.4 L-3 -43 Q0 -45 4 -43 L4.6 -37.4Z', INK, 0.5) +
      P('M-4 -26 L-7 -16 L-6 -10', null, 3) + arm + '</g>';
  }

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

  function catcher(x, y) {
    return P(`M${x} ${y}L${x} ${y - 30}M${x + 34} ${y - 3}L${x + 34} ${y - 33}`, null, 1.8) +
      P(`M${x} ${y - 28}Q${x + 17} ${y - 10} ${x + 34} ${y - 31}L${x + 34} ${y - 33}Q${x + 17} ${y - 26} ${x} ${y - 30}Z`, 'url(#h1)', 1) +
      P(`M${x + 11} ${y + 1}a7 4 0 0 0 14 0Z`, 'url(#h2)', 1) +
      P(`M${x + 18} ${y - 15}v10`, null, 0.6, 'stroke-dasharray="2 2"');
  }

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

  function rack(x, y) {
    let s = P(`M${x} ${y}L${x + 14} ${y - 40}L${x + 28} ${y}M${x + 40} ${y}L${x + 54} ${y - 40}L${x + 68} ${y}M${x + 8} ${y - 34}H${x + 62}`, null, 1.8);
    for (let i = 0; i < 4; i++) {
      const fx = x + 19 + i * 10;
      s += P(`M${fx} ${y - 34}v4`, null, 0.6) + P(`M${fx} ${y - 30}c-3 3 -3 9 0 13c3 -4 3 -10 0 -13Zm0 13l-3 4h6Z`, 'url(#h2)', 0.8);
    }
    return s;
  }

  function cask(x, y, sc) {
    sc = sc || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">` +
      P('M-9 0 Q-11 -11 -9 -22 L9 -22 Q11 -11 9 0 Z', 'url(#hv)', 1) +
      P('M-10 -5H10M-10.6 -17H10.6', null, 1.6) + `<ellipse cx="0" cy="-22" rx="9" ry="2.5" fill="${PAPER}" stroke="${INK}"/></g>`;
  }

  function raft(x, y, parts, sc) {
    sc = sc || 1;
    let s = '';
    if (parts.hull) {
      for (let i = 0; i < 9; i++) {
        const lx = x + i * 11 * sc;
        s += P(`M${f(lx)} ${f(y - 4 * sc)}l${f(18 * sc)} ${f(-18 * sc)}`, null, 9 * sc) + P(`M${f(lx)} ${f(y - 4 * sc)}l${f(18 * sc)} ${f(-18 * sc)}`, null, 6.5 * sc, `stroke="${PAPER}"`);
        s += `<circle cx="${f(lx + 18 * sc)}" cy="${f(y - 22 * sc)}" r="${f(3.6 * sc)}" fill="${PAPER}" stroke="${INK}" stroke-width="0.8"/>`;
      }
      s += P(`M${f(x + 4 * sc)} ${f(y - 8 * sc)}l${f(96 * sc)} 0M${f(x + 12 * sc)} ${f(y - 16 * sc)}l${f(96 * sc)} 0`, null, 1.2);
    } else {
      // a pile of timber waiting
      for (let i = 0; i < 4; i++) s += P(`M${x + i * 5} ${y - i * 4}h70`, null, 5);
      return s;
    }
    const mx = x + 58 * sc;
    const my = y - 12 * sc;
    if (parts.mast) s += P(`M${f(mx)} ${f(my)}V${f(my - 90 * sc)}M${f(mx - 24 * sc)} ${f(my - 80 * sc)}H${f(mx + 24 * sc)}`, null, 2.4);
    if (parts.sail && parts.mast) s += P(`M${f(mx - 23 * sc)} ${f(my - 79 * sc)}Q${f(mx - 4 * sc)} ${f(my - 60 * sc)} ${f(mx - 26 * sc)} ${f(my - 26 * sc)}L${f(mx + 26 * sc)} ${f(my - 26 * sc)}Q${f(mx + 34 * sc)} ${f(my - 55 * sc)} ${f(mx + 23 * sc)} ${f(my - 79 * sc)}Z`, 'url(#h1)', 1.1);
    if (parts.casks) s += cask(x + 28 * sc, y - 12 * sc, 0.8 * sc) + cask(x + 92 * sc, y - 12 * sc, 0.8 * sc);
    return s;
  }

  // a square-rigged barque; waterline at local y=0
  function ship(x, y, sc, dir) {
    dir = dir || 1;
    const sail = (cx, top, bot, w) => {
      const a = w / 2;
      return P(`M${cx - a} ${top}Q${cx} ${top - 3} ${cx + a} ${top}L${cx + a * 0.92} ${bot}Q${cx} ${bot + 6} ${cx - a * 0.92} ${bot}Z`, PAPER, 1) +
        P(`M${cx + a * 0.2} ${top + 2}L${cx + a * 0.25} ${bot + 3}M${cx + a * 0.55} ${top + 1}L${cx + a * 0.6} ${bot + 1}`, null, 0.6);
    };
    let s = '';
    s += P('M-30 -72 L-50 -6 M0 -84 L-50 -6 M0 -84 L52 -10 M28 -74 L74 -24 M-30 -64 L0 -74', null, 0.5);
    s += P('M-30 -8 V-68 M0 -8 V-86 M28 -8 V-76', null, 1.6);
    [[-30, 26, [[-14, -32], [-34, -50], [-52, -64]]], [0, 30, [[-14, -36], [-38, -58], [-60, -78]]], [28, 26, [[-14, -32], [-34, -52], [-54, -68]]]].forEach(([cx, w, ys]) => {
      ys.forEach(([b, t], i) => { s += sail(cx, t, b, w - i * 6); });
    });
    s += P('M28 -70 L74 -24 L44 -16 Z', PAPER, 0.9) + P('M48 -10 L76 -24', null, 1.4);
    s += P('M-50 -10 L46 -10 L54 -16 Q48 0 36 4 L-42 4 Q-50 0 -50 -10 Z', INK, 1) + P('M-46 -5 H44', null, 0.6, `stroke="${PAPER}" stroke-dasharray="3 4"`);
    s += P('M0 -86 l10 3 l-10 3', INK, 0.5);
    return `<g transform="translate(${x} ${y}) scale(${sc * dir} ${sc})">${s}</g>`;
  }

  function longboat(x, y, sc) {
    return `<g transform="translate(${x} ${y}) scale(${sc})">` +
      P('M-22 -4 L22 -4 Q18 4 10 5 L-14 5 Q-20 2 -22 -4Z', INK, 0.8) +
      P('M-14 -4 l-8 10 M-4 -4 l-8 10 M6 -4 l-8 10 M14 -4 l-8 10', null, 1) +
      `<circle cx="-10" cy="-9" r="2.6" fill="${INK}"/><circle cx="0" cy="-9" r="2.6" fill="${INK}"/><circle cx="10" cy="-9" r="2.6" fill="${INK}"/>` +
      P('M-12 -6 v-2 M-2 -6 v-2 M8 -6 v-2', null, 4) + '</g>';
  }

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
    return P(`M${f(x)} ${f(y)}Q${f(mx + nx)} ${f(my + ny)} ${f(ex)} ${f(ey)}Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)}Z`, 'url(#h2)', 1) +
      P(`M${f(x)} ${f(y)}L${f(ex)} ${f(ey)}`, null, 0.8, `stroke="${PAPER}"`) + P(veins, null, 0.5, `stroke="${PAPER}"`);
  }

  function frame(w, h) {
    return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="${INK}" stroke-width="2"/>`;
  }

  /* ---------------- the camp ---------------- */

  ART.camp = function (st) {
    const r = rng(7);
    const W = 600;
    const H = 300;
    const hz = 140;
    let b = sky(r, W, 0, hz, st.night);
    b += st.night ? moon(470, 46, 15) + stars(r, W, hz - 20) : sun(470, 62, 17, true) + birds(r, 200, 60, 4, 70);
    b += sea(r, W, hz, 220, st.night);
    if (st.pyreLit) b += P(`M560 ${hz}c-4 -14 6 -20 0 -34`, null, 1, 'class="smoke"');
    b += headland(r, 520, hz, 80, 22, 1);
    if (st.trap) b += weir(420, 196, st.trap);
    const shore = 'M0 212 C120 200 220 224 320 214 S520 202 600 216';
    b += P(shore + 'L600 300L0 300Z', 'url(#dots)', 0);
    b += P(shore, null, 1.2) + P('M0 207 C110 196 230 220 320 209 S510 197 600 210', null, 0.6, 'stroke-dasharray="6 5"');
    b += tufts(r, 0, 120, 262, 6) + tufts(r, 470, 600, 282, 5);
    b += rock(r, 520, 266, 100, 46) + rock(r, 580, 274, 64, 30);
    b += palm(r, 64, 292, 205, 46) + palm(r, 130, 290, 150, 22, 0.78) + palm(r, 556, 252, 120, -26, 0.7);
    if (st.leanto) b += leanto(150, 272);
    for (let i = 0; i < (st.catcher || 0); i++) b += catcher(372 + i * 44, 252 + (i % 2) * 6);
    if (st.rack) b += rack(470, 290);
    if (st.raftStarted) b += raft(176, 296, st.raft, 0.9);
    if (st.ally) b += sitter(343, 266, 1.05, -1, true);
    b += sitter(266, 266, 1.1, 1);
    let top = '';
    if (st.night) {
      const id = uid('m');
      const rad = st.fire ? 50 + st.fire * 32 : 0;
      top += `<mask id="${id}"><rect width="${W}" height="${H}" fill="#fff"/>${rad ? `<circle cx="305" cy="250" r="${rad}" fill="url(#glow)"/>` : ''}</mask>` +
        `<rect width="${W}" height="${H}" fill="url(#h1)" opacity="0.75" mask="url(#${id})"/>`;
    }
    top += `<g>${fire(305, 266, st.fire, 1)}</g>` + frame(W, H);
    return svg(W, H, b, top, 'The castaway\'s camp on the beach');
  };

  /* ---------------- the chart ---------------- */

  const ISLAND = [[118, 192], [132, 150], [168, 128], [196, 98], [232, 72], [270, 58], [306, 52], [338, 66], [372, 86], [418, 90], [458, 108], [488, 138], [502, 176], [486, 206], [462, 236], [430, 252], [386, 260], [340, 274], [300, 276], [254, 266], [206, 258], [168, 244], [134, 222]];

  ART.chart = function (locs, camp) {
    const r = rng(11);
    const W = 600;
    const H = 340;
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
    const coast = smooth(pts, true);
    const cid = uid('coast');
    const cx = 310;
    const cy = 165;
    let b = '';
    // sparse sea lines
    let sl = '';
    for (let y = 8; y < H; y += 9) {
      let x = r() * 40;
      while (x < W) {
        const len = 20 + r() * 70;
        if (r() < 0.35) sl += `M${f(x)} ${y}h${f(len)}`;
        x += len + 20 + r() * 60;
      }
    }
    b += P(sl, null, 0.4);
    b += `<defs><path id="${cid}" d="${coast}"/></defs>`;
    for (let k = 7; k >= 1; k--) {
      const s = 1 + k * 0.028;
      b += `<use href="#${cid}" transform="translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})" fill="${k === 7 ? 'none' : PAPER}" stroke="${INK}" stroke-width="${0.9 - k * 0.09}"/>`;
    }
    b += `<use href="#${cid}" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/>`;
    // stipple along the beaches
    b += `<clipPath id="${cid}c"><use href="#${cid}"/></clipPath><g clip-path="url(#${cid}c)">` +
      `<use href="#${cid}" fill="none" stroke="url(#dots2)" stroke-width="14"/>` + '</g>';
    // hills to the north
    let hills = '';
    [[300, 82, 26], [268, 92, 18], [334, 92, 20], [236, 104, 14], [372, 104, 14]].forEach(([x, y, s]) => {
      hills += P(`M${x - s} ${y + s * 0.5}L${x} ${y - s * 0.5}L${x + s} ${y + s * 0.5}`, PAPER, 1.1);
      let h = '';
      for (let i = 1; i < s; i += 2.4) h += `M${f(x + i * 0.2)} ${f(y - s * 0.5 + i)}l${f(s - i)} ${f((s - i) * 0)}`;
      hills += P(`M${x} ${y - s * 0.5}L${x + s} ${y + s * 0.5}L${x + 2} ${y + s * 0.5}Z`, 'url(#h2)', 0);
    });
    b += hills;
    // jungle: clumped trees
    let trees = '';
    for (let i = 0; i < 46; i++) {
      const tx = 300 + (r() - 0.4) * 190;
      const ty = 130 + r() * 75;
      if (Math.hypot(tx - 260, ty - 175) < 22) continue;
      const s = 4 + r() * 3;
      trees += P(`M${f(tx)} ${f(ty + s * 0.6)}v4`, null, 0.9) +
        `<circle cx="${f(tx)}" cy="${f(ty)}" r="${f(s * 0.85)}" fill="${PAPER}" stroke="${INK}" stroke-width="0.8"/>` +
        P(`M${f(tx)} ${f(ty - s * 0.8)}a${f(s * 0.85)} ${f(s * 0.85)} 0 0 1 0 ${f(s * 1.7)}Z`, 'url(#h2)', 0);
    }
    b += trees;
    // palms by the grove
    for (let i = 0; i < 5; i++) b += palm(r, 192 + i * 9, 246 - (i % 2) * 8, 16, 3, 0.18);
    // reef
    b += P('M492 262 q14 -6 26 2 t28 4 t26 -6', null, 1, 'stroke-dasharray="2 4"') +
      P('M500 280 q16 6 32 -2 t30 2', null, 1, 'stroke-dasharray="2 4"');
    // compass rose
    const rx = 72;
    const ry = 282;
    let rose = `<circle cx="${rx}" cy="${ry}" r="30" fill="${PAPER}" stroke="${INK}"/><circle cx="${rx}" cy="${ry}" r="26" fill="none" stroke="${INK}" stroke-width="0.5"/>`;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const L = i % 2 ? 18 : 34;
      const tipx = rx + Math.cos(a) * L;
      const tipy = ry + Math.sin(a) * L;
      const lx = rx + Math.cos(a - Math.PI / 2) * 5;
      const ly = ry + Math.sin(a - Math.PI / 2) * 5;
      const qx = rx + Math.cos(a + Math.PI / 2) * 5;
      const qy = ry + Math.sin(a + Math.PI / 2) * 5;
      rose += P(`M${f(rx)} ${f(ry)}L${f(tipx)} ${f(tipy)}L${f(lx)} ${f(ly)}Z`, INK, 0.6) + P(`M${f(rx)} ${f(ry)}L${f(tipx)} ${f(tipy)}L${f(qx)} ${f(qy)}Z`, PAPER, 0.6);
    }
    b += rose;
    // a sea serpent, as all good charts have
    b += P('M520 52 q8 -12 16 0 t16 0 t16 0', null, 2.4) + P('M568 52 q6 -10 12 -6 l4 4', null, 2.4) + `<circle cx="579" cy="46" r="1" fill="${PAPER}"/>`;

    // labels and markers sit above the roughening filter so they stay crisp
    const font = `font-family="'IM Fell English', Georgia, serif" fill="${INK}"`;
    let top = `<g ${font}><text x="${rx}" y="${ry - 38}" text-anchor="middle" font-size="12">N</text>` +
      `<text x="18" y="30" font-size="20" letter-spacing="2">A CHART of the ISLAND</text>` +
      '<text x="18" y="48" font-size="12" font-style="italic">as observed by a Castaway, 1846</text>' +
      `<text x="510" y="78" font-size="10" font-style="italic">here be monsters</text></g>`;
    top += `<g transform="translate(${camp[0]} ${camp[1]})">${P('M-7 4 L0 -8 L7 4 Z', PAPER, 1.2)}${P('M0 -8 V4', null, 0.8)}</g>` +
      `<text x="${camp[0]}" y="${camp[1] + 18}" text-anchor="middle" font-size="12" font-style="italic" ${font}>Camp</text>`;
    locs.forEach((l) => {
      const blocked = l.blocked ? ' blocked' : '';
      const mark = l.visited
        ? `<circle class="marker" cx="0" cy="0" r="5.5" fill="${INK}" stroke="${INK}"/>`
        : `<circle class="marker" cx="0" cy="0" r="6" fill="${PAPER}" stroke="${INK}" stroke-width="1.3"/><text x="0" y="3.5" font-size="9" text-anchor="middle" ${font}>?</text>`;
      const anchor = l.x > 440 ? 'end' : l.x < 170 ? 'start' : 'middle';
      const lx = anchor === 'end' ? 8 : anchor === 'start' ? -8 : 0;
      top += `<g class="loc${blocked}" data-loc="${l.id}" tabindex="0" role="button" aria-label="${l.name}" transform="translate(${l.x} ${l.y})">` +
        `<circle r="16" fill="transparent"/>${mark}` +
        `<text x="${lx}" y="-11" text-anchor="${anchor}" font-size="13" font-style="italic" ${font} stroke="${PAPER}" stroke-width="3" paint-order="stroke">${l.name}</text></g>`;
    });
    top += frame(W, H);
    return svg(W, H, b, top, 'A hand-drawn chart of the island');
  };

  /* ---------------- location scenes (600 x 240) ---------------- */

  const SW = 600;
  const SH = 240;

  const SCENES = {
    title() {
      const r = rng(3);
      const hz = 150;
      let b = sky(r, SW, 0, hz, false) + sun(430, hz, 34, true);
      b += `<rect x="380" y="${hz}" width="110" height="10" fill="${PAPER}"/>`;
      b += sea(r, SW, hz, SH, false);
      b += ship(452, hz + 4, 0.55, 1) + birds(r, 330, 70, 5, 80);
      b += headland(r, -10, hz + 2, 260, 64, 0);
      b += palm(r, 60, hz - 30, 60, 10, 0.45) + palm(r, 90, hz - 38, 70, -6, 0.5) + palm(r, 150, hz - 34, 56, 8, 0.42);
      b += longboat(330, 196, 0.9);
      b += P(`M0 ${SH - 20}C120 ${SH - 30} 200 ${SH - 10} 300 ${SH - 18}S500 ${SH - 10} 600 ${SH - 22}L600 ${SH}L0 ${SH}Z`, 'url(#dots)', 1);
      b += sitter(220, SH - 8, 1.2, 1);
      return svg(SW, SH, b, frame(SW, SH), 'A barque sails away from an island at dawn');
    },
    beach() {
      const r = rng(21);
      let b = sky(r, SW, 0, 120, false) + sea(r, SW, 120, 175, false);
      b += P('M0 170 C150 160 300 182 600 168 L600 240 L0 240Z', 'url(#dots)', 1.1);
      b += palm(r, 520, 230, 170, -30) + rock(r, 90, 214, 110, 40);
      b += P('M300 205 l18 -5 q4 -1 6 2 l1 5 q-12 6 -24 2Z', 'url(#h3)', 0.8);
      return svg(SW, SH, b, frame(SW, SH), 'The beach');
    },
    bottle() {
      const r = rng(23);
      let b = sky(r, SW, 0, 110, false) + sea(r, SW, 110, 160, false);
      b += P('M0 156 C150 146 300 166 600 152 L600 240 L0 240Z', 'url(#dots)', 1.1);
      b += `<g transform="translate(300 182) rotate(-18)">${P('M-50 -14 H24 Q34 -14 38 -8 H54 V8 H38 Q34 14 24 14 H-50 Q-56 14 -56 0 Q-56 -14 -50 -14Z', 'url(#h1)', 1.4)}` +
        `${P('M54 -8 h8 v16 h-8', 'url(#h3)', 1)}${P('M-44 -9 H20', null, 1, `stroke="${PAPER}" stroke-width="3"`)}` +
        `${P('M-30 -6 q20 6 40 0 v8 q-20 6 -40 0Z', PAPER, 0.8)}</g>`;
      b += tufts(r, 0, 600, 220, 8);
      return svg(SW, SH, b, frame(SW, SH), 'A bottle half-buried in the sand');
    },
    grove() {
      const r = rng(31);
      let b = sky(r, SW, 0, 150, false) + sea(r, SW, 150, 160, false);
      b += P('M0 165 C200 158 400 172 600 162 L600 240 L0 240Z', 'url(#dots)', 0);
      [[40, 220, 190, 20], [130, 228, 210, -10], [250, 214, 170, 30], [360, 226, 205, -18], [450, 216, 160, 14], [560, 230, 200, -26]].forEach(([x, y, h, l]) => {
        b += palm(r, x, y, h, l, 0.95);
      });
      let fr = '';
      for (let i = 0; i < 9; i++) {
        const x = r() * 560 + 20;
        const y = 205 + r() * 30;
        fr += `M${f(x)} ${f(y)}q30 -8 60 4`;
        for (let j = 0; j < 8; j++) fr += `M${f(x + j * 7)} ${f(y - 1 + j * 0.3)}l-4 7`;
      }
      b += P(fr, null, 0.8);
      for (let i = 0; i < 6; i++) b += `<circle cx="${f(r() * 560 + 20)}" cy="${f(218 + r() * 16)}" r="5" fill="url(#h3)" stroke="${INK}"/>`;
      return svg(SW, SH, b, frame(SW, SH), 'A grove of coconut palms');
    },
    tidepools() {
      const r = rng(41);
      let b = sky(r, SW, 0, 100, false) + sea(r, SW, 100, 150, false) + birds(r, 420, 40, 3, 60);
      b += rock(r, 120, 190, 280, 70) + rock(r, 470, 200, 300, 80) + rock(r, 300, 250, 420, 70);
      [[180, 205, 50], [400, 215, 64], [300, 230, 40]].forEach(([x, y, w]) => {
        b += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * 0.22}" fill="url(#hh)" stroke="${INK}" stroke-width="1.2"/>`;
        b += `<ellipse cx="${x - w * 0.2}" cy="${y}" rx="${w * 0.3}" ry="${w * 0.06}" fill="none" stroke="${PAPER}" stroke-width="1.5"/>`;
      });
      let star = '';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        star += `${i ? 'L' : 'M'}${f(400 + Math.cos(a) * 9)} ${f(214 + Math.sin(a) * 4)}L${f(400 + Math.cos(a + 0.63) * 3)} ${f(214 + Math.sin(a + 0.63) * 1.5)}`;
      }
      b += P(star + 'Z', INK, 0.6);
      return svg(SW, SH, b, frame(SW, SH), 'Rock pools at low tide');
    },
    spring() {
      const r = rng(51);
      let b = `<rect width="${SW}" height="${SH}" fill="url(#h1)"/>`;
      b += rock(r, 120, 240, 300, 240) + rock(r, 490, 240, 300, 230);
      b += P('M268 30 Q300 22 330 32 L318 196 L282 196Z', PAPER, 1.2);
      let falls = '';
      for (let x = 272; x < 328; x += 4) falls += `M${x} ${f(32 + r() * 6)}L${f(x + (x - 300) * 0.15 + (r() - 0.5) * 3)} 196`;
      b += P(falls, null, 0.7, 'stroke-dasharray="14 3"');
      b += `<ellipse cx="300" cy="205" rx="140" ry="22" fill="url(#hh)" stroke="${INK}" stroke-width="1.2"/>`;
      b += `<ellipse cx="300" cy="200" rx="46" ry="8" fill="${PAPER}" stroke="${INK}" stroke-width="0.8"/><ellipse cx="300" cy="200" rx="70" ry="13" fill="none" stroke="${INK}" stroke-width="0.6"/>`;
      for (let i = 0; i < 8; i++) {
        const x = i < 4 ? 20 + i * 40 : 440 + (i - 4) * 40;
        b += leaf(x, 236, 60 + r() * 30, -60 - r() * 60, 0.2);
      }
      return svg(SW, SH, b, frame(SW, SH), 'A spring falling into a pool');
    },
    wreck() {
      const r = rng(61);
      const hz = 120;
      let b = sky(r, SW, 0, hz, false) + sea(r, SW, hz, SH, false) + birds(r, 140, 50, 6, 90);
      // hull on her beam ends
      b += `<g transform="translate(330 175) rotate(-14)">` +
        P('M-170 0 Q-160 50 -90 58 L120 58 Q170 40 186 -6 L150 -10 L-170 -10Z', 'url(#h2)', 1.6) +
        P('M-170 -10 L150 -10', null, 2) +
        P('M40 -10 Q60 30 50 58 M70 -10 Q90 30 80 58 M100 -10 Q118 26 110 58', null, 3, `stroke="${PAPER}"`) +
        P('M40 -10 Q60 30 50 58 M70 -10 Q90 30 80 58 M100 -10 Q118 26 110 58', null, 1.3) +
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
      return svg(SW, SH, b, frame(SW, SH), 'The wreck of the Calliope upon the reef');
    },
    jungle() {
      const r = rng(71);
      let b = `<rect width="${SW}" height="${SH}" fill="url(#h3)"/>`;
      b += P('M240 240 Q280 140 300 60 Q320 140 380 240Z', PAPER, 0);
      b += `<path d="M240 240 Q280 140 300 60 Q320 140 380 240Z" fill="url(#h1)" opacity="0.6"/>`;
      [40, 110, 170, 430, 500, 560].forEach((x, i) => {
        const w = 14 + (i % 3) * 6;
        b += P(`M${x - w / 2} 240 L${x - w / 3} 0 L${x + w / 3} 0 L${x + w / 2} 240Z`, PAPER, 1.2);
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
      return svg(SW, SH, b, frame(SW, SH), 'A path through dense jungle');
    },
    cave() {
      const r = rng(81);
      let b = `<rect width="${SW}" height="${SH}" fill="url(#hx)"/>`;
      b += rock(r, 300, 250, 600, 260);
      const mouth = 'M160 240 Q170 70 300 56 Q430 70 440 240Z';
      b += P(mouth, INK, 2);
      let tites = '';
      for (let x = 190; x < 420; x += 18 + r() * 10) {
        const y = 60 + Math.abs(x - 300) * 0.5;
        tites += `M${f(x - 6)} ${f(y)}L${f(x)} ${f(y + 16 + r() * 22)}L${f(x + 6)} ${f(y)}Z`;
      }
      b += P(tites, 'url(#h2)', 0.8, `stroke="${PAPER}"`);
      b += P('M120 240 Q140 200 180 210 Q210 200 220 240Z', 'url(#h2)', 1) + leaf(470, 236, 70, -70, 0.25) + leaf(500, 236, 60, -40, 0.25);
      return svg(SW, SH, b, frame(SW, SH), 'The mouth of a cave');
    },
    bones() {
      let b = `<rect width="${SW}" height="${SH}" fill="url(#hx)"/>`;
      b += `<circle cx="300" cy="140" r="180" fill="${PAPER}" opacity="0.75"/>`;
      b += `<circle cx="300" cy="140" r="120" fill="${PAPER}"/>`;
      // skull
      b += P('M276 104 Q276 74 300 72 Q324 74 324 104 Q324 116 316 120 L316 130 L284 130 L284 120 Q276 116 276 104Z', PAPER, 1.6);
      b += `<ellipse cx="290" cy="104" rx="7" ry="8" fill="${INK}"/><ellipse cx="310" cy="104" rx="7" ry="8" fill="${INK}"/>` + P('M300 112 l-4 8 h8Z', INK, 0.6) + P('M288 124 V130 M294 124 V130 M300 124 V130 M306 124 V130 M312 124 V130', null, 0.8);
      // ribs and arms
      let ribs = '';
      for (let i = 0; i < 5; i++) ribs += `M300 ${142 + i * 9}q-${26 - i * 2} -2 -${30 - i * 2} 10M300 ${142 + i * 9}q${26 - i * 2} -2 ${30 - i * 2} 10`;
      b += P('M300 136 V196', null, 3) + P(ribs, null, 1.6);
      b += P('M264 146 L246 186 L264 206 M336 146 L356 182 L330 200', null, 3);
      b += P('M286 200 L250 226 M314 200 L360 228', null, 4);
      // the journal
      b += P('M318 196 l40 -6 l6 22 l-40 6Z', 'url(#h2)', 1.2) + P('M322 197 l4 22', null, 2);
      b += P('M40 240 Q120 200 200 236 M400 236 Q480 196 560 240', 'url(#h2)', 1);
      return svg(SW, SH, b, frame(SW, SH), 'A skeleton in the cave, a journal in its lap');
    },
    hut() {
      const r = rng(91);
      let b = sky(r, SW, 0, 110, false);
      b += `<rect y="70" width="${SW}" height="80" fill="url(#h2)"/>`;
      b += palm(r, 60, 200, 170, 20) + palm(r, 540, 200, 180, -24);
      b += P('M0 190 C200 182 400 196 600 186 L600 240 L0 240Z', 'url(#dots)', 1);
      b += P('M240 100 Q300 40 360 100 L376 130 L224 130Z', 'url(#h2)', 1.3);
      let thatch = '';
      for (let x = 230; x < 372; x += 5) thatch += `M${x} 130 l${(x - 300) * 0.06} -${12 + (x % 3) * 3}`;
      b += P(thatch, null, 0.8);
      let poles = '';
      for (let x = 238; x <= 362; x += 7) poles += `M${x} 130 V196`;
      b += `<rect x="236" y="130" width="128" height="66" fill="${PAPER}"/>` + P(poles, null, 1.6);
      b += P('M286 196 V150 Q300 140 314 150 V196Z', INK, 1);
      b += P('M300 46 c-8 -10 8 -18 0 -28', null, 0.8, 'class="smoke"');
      [[180, 200], [420, 202], [470, 198]].forEach(([x, y]) => {
        b += P(`M${x} ${y} V${y - 50}`, null, 2) +
          P(`M${x - 10} ${y - 56} Q${x} ${y - 70} ${x + 10} ${y - 56} L${x + 6} ${y - 44} L${x - 6} ${y - 44}Z`, PAPER, 1.2) +
          `<circle cx="${x - 4}" cy="${y - 55}" r="2.5" fill="${INK}"/><circle cx="${x + 4}" cy="${y - 55}" r="2.5" fill="${INK}"/>` +
          P(`M${x - 8} ${y - 46} q-8 4 -6 12 M${x + 8} ${y - 46} q8 4 6 12`, null, 1.6);
      });
      return svg(SW, SH, b, frame(SW, SH), 'A hut of poles and thatch, boar skulls on stakes');
    },
    summit(opts) {
      const r = rng(101);
      const hz = 70;
      let b = sky(r, SW, 0, hz, false) + sea(r, SW, hz, SH, false);
      if (opts && opts.ship) b += ship(470, hz + 6, 0.32, -1);
      b += birds(r, 320, 140, 4, 60);
      b += P('M0 110 Q60 104 120 120 Q170 140 200 180 Q230 210 250 240 L0 240Z', 'url(#h2)', 1.6);
      b += P('M0 110 Q60 104 120 120 Q170 140 200 180', null, 2.5);
      b += tufts(r, 10, 160, 122, 8);
      if (opts && opts.pyre) {
        let logs = '';
        for (let i = 0; i < 9; i++) logs += `M${70 + i * 3} 116 L${100 + (i - 4) * 4} ${44 + i}`;
        b += P(logs, null, 3) + P('M68 118 L100 40 L132 118Z', 'url(#h1)', 1);
        if (opts.lit) b += P('M100 40 c-14 -14 10 -24 -4 -40', null, 2) + P('M88 60 q12 -40 12 -60 q4 30 14 60Z', 'url(#h2)', 1);
      } else {
        b += stander(96, 116, 1.6, 1);
      }
      return svg(SW, SH, b, frame(SW, SH), 'The view from the summit');
    },
    raft() {
      const r = rng(111);
      const hz = 120;
      let b = sky(r, SW, 0, hz, false) + sun(140, 50, 16, true) + sea(r, SW, hz, SH, false);
      b += `<g class="bob">${raft(240, 200, { hull: 1, mast: 1, sail: 1, casks: 1 }, 1)}${stander(320, 180, 1.1, 1)}</g>`;
      b += birds(r, 470, 60, 3, 40);
      return svg(SW, SH, b, frame(SW, SH), 'A raft under sail on open sea');
    },
    storm() {
      const r = rng(121);
      let b = sky(r, SW, 0, 240, true);
      let rain = '';
      for (let i = 0; i < 140; i++) {
        const x = r() * 700;
        const y = r() * 240;
        rain += `M${f(x)} ${f(y)}l-12 26`;
      }
      b += P(rain, null, 0.7, `stroke="${PAPER}"`);
      b += P('M0 190 Q90 120 180 160 Q240 190 300 150 Q380 90 460 150 Q520 196 600 170 L600 240 L0 240Z', PAPER, 1.6);
      b += P('M0 200 Q90 130 180 170 Q240 200 300 160 Q380 100 460 160 Q520 206 600 180 L600 240 L0 240Z', 'url(#h1)', 0);
      b += P('M380 100 q20 -10 30 6 q-14 -2 -18 10', null, 1.4);
      b += `<g transform="rotate(-18 300 150)">${raft(250, 166, { hull: 1, mast: 1, sail: 0, casks: 1 }, 0.8)}</g>`;
      return svg(SW, SH, b, frame(SW, SH), 'A raft in a storm');
    },
    rescue() {
      const r = rng(131);
      const hz = 120;
      let b = sky(r, SW, 0, hz, false) + sun(90, 46, 14, true) + sea(r, SW, hz, SH, false);
      b += headland(r, 0, hz, 140, 40, 3);
      b += P('M70 82 c-8 -16 10 -24 0 -40 c-8 -14 6 -20 0 -34', null, 2);
      b += ship(400, 178, 1.15, -1) + longboat(220, 206, 1);
      return svg(SW, SH, b, frame(SW, SH), 'A whaling ship lowers a boat');
    },
    landfall() {
      const r = rng(141);
      const hz = 130;
      let b = sky(r, SW, 0, hz, false) + sea(r, SW, hz, SH, false);
      b += headland(r, 260, hz + 2, 340, 60, 5) + birds(r, 200, 50, 7, 120);
      b += `<g class="bob">${raft(80, 220, { hull: 1, mast: 1, sail: 1, casks: 0 }, 0.8)}</g>`;
      for (let i = 0; i < 4; i++) b += P(`M${300 + i * 30} ${hz + 6} l-10 14 h20Z`, 'url(#h2)', 0.8) + P(`M${300 + i * 30} ${hz + 6} v-8`, null, 1);
      return svg(SW, SH, b, frame(SW, SH), 'Landfall: an inhabited island');
    },
    grave() {
      const r = rng(151);
      const hz = 130;
      let b = sky(r, SW, 0, hz, true) + moon(120, 50, 14) + sea(r, SW, hz, 180, true);
      b += P('M0 176 C150 166 300 186 600 172 L600 240 L0 240Z', 'url(#dots)', 1.1);
      b += palm(r, 520, 228, 170, -28);
      b += P('M260 222 Q300 200 340 222Z', 'url(#h2)', 1.2);
      b += P('M300 216 V140 M282 160 H318', null, 4.5) + P('M296 156 l8 8 M304 156 l-8 8', null, 1.2, `stroke="${PAPER}"`);
      b += P('M250 226 q6 -4 12 0 M330 228 q6 -4 12 0', null, 0.9);
      return svg(SW, SH, b, frame(SW, SH), 'A driftwood cross above the tide line');
    },
    night() {
      const r = rng(161);
      let b = sky(r, SW, 0, 140, true) + stars(r, SW, 110) + moon(480, 50, 13) + sea(r, SW, 140, 190, true);
      b += P('M0 186 C150 178 300 196 600 182 L600 240 L0 240Z', 'url(#dots)', 1.1);
      b += palm(r, 70, 236, 170, 30);
      let top = '';
      const id = uid('m');
      top += `<mask id="${id}"><rect width="${SW}" height="${SH}" fill="#fff"/><circle cx="300" cy="210" r="110" fill="url(#glow)"/></mask>` +
        `<rect width="${SW}" height="${SH}" fill="url(#h1)" opacity="0.7" mask="url(#${id})"/>`;
      top += fire(300, 222, 3, 1) + sitter(260, 224, 1.1, 1);
      top += `<circle cx="520" cy="196" r="2" fill="${PAPER}"/><circle cx="530" cy="196" r="2" fill="${PAPER}"/>`;
      return svg(SW, SH, b, top + frame(SW, SH), 'Eyes beyond the firelight');
    },
  };

  /* ---------------- adversaries ---------------- */

  const FOES = {
    crab() {
      const r = rng(201);
      let b = sky(r, SW, 0, 90, false) + sea(r, SW, 90, 130, false);
      b += P('M0 128 C150 120 300 136 600 124 L600 240 L0 240Z', 'url(#dots)', 1);
      const cx = 300;
      const cy = 172;
      let half = '';
      let legs = '';
      for (let i = 0; i < 4; i++) {
        legs += `M${cx - 42} ${cy - 4 + i * 6}L${cx - 82 - i * 10} ${cy - 26 + i * 12}L${cx - 104 - i * 6} ${cy + 30 + i * 4}`;
      }
      half += P(legs, null, 5.5) + P(legs, null, 2.6, `stroke="${PAPER}" stroke-dasharray="8 4"`);
      half += P(`M${cx - 40} ${cy - 22}L${cx - 78} ${cy - 46}L${cx - 92} ${cy - 76}`, null, 8);
      const px = cx - 92;
      const py = cy - 76;
      half += P(`M${px} ${py}C${px - 30} ${py - 6} ${px - 38} ${py - 34} ${px - 16} ${py - 50}C${px - 18} ${py - 34} ${px - 8} ${py - 20} ${px + 8} ${py - 16}Z`, 'url(#h3)', 1.3);
      half += P(`M${px + 2} ${py - 10}C${px + 16} ${py - 26} ${px + 8} ${py - 40} ${px - 4} ${py - 46}C${px + 2} ${py - 32} ${px - 4} ${py - 20} ${px - 6} ${py - 12}Z`, 'url(#h2)', 1.1);
      half += P(`M${cx - 12} ${cy - 36}L${cx - 18} ${cy - 62}`, null, 2.4) + `<circle cx="${cx - 18}" cy="${cy - 64}" r="4" fill="${INK}"/>`;
      b += half + `<g transform="translate(${cx * 2} 0) scale(-1 1)">${half}</g>`;
      b += P(`M${cx - 56} ${cy}Q${cx - 50} ${cy - 44} ${cx} ${cy - 44}Q${cx + 50} ${cy - 44} ${cx + 56} ${cy}Q${cx + 40} ${cy + 24} ${cx} ${cy + 26}Q${cx - 40} ${cy + 24} ${cx - 56} ${cy}Z`, 'url(#h2)', 1.6);
      b += P(`M${cx - 30} ${cy - 28}q30 -12 60 0M${cx - 20} ${cy - 14}q20 -8 40 0`, null, 2, `stroke="${PAPER}"`);
      return svg(SW, SH, b, frame(SW, SH), 'A giant land crab');
    },
    boar() {
      const r = rng(211);
      let b = `<rect width="${SW}" height="150" fill="url(#h2)"/>`;
      b += P('M0 150 C200 140 400 156 600 146 L600 240 L0 240Z', PAPER, 1);
      b += tufts(r, 0, 600, 230, 18);
      for (let i = 0; i < 6; i++) b += leaf(i < 3 ? 20 + i * 40 : 440 + (i - 3) * 50, 160, 70, i < 3 ? -60 : -120, 0.25);
      b += P('M232 200 L228 218 L238 218 L240 200 M330 196 L336 218 L346 218 L340 196', INK, 1);
      b += P('M170 140 L172 162 Q190 170 210 164 Q225 176 245 176 L250 212 L262 212 L262 184 Q300 190 340 188 L345 212 L357 212 L362 182 Q395 178 405 160 Q415 150 425 156 Q418 146 410 140 Q400 110 360 100 Q310 84 270 90 Q250 92 240 98 L236 78 L226 102 Q205 110 190 126 Q178 134 170 140Z', 'url(#h3)', 1.6);
      let bristle = '';
      for (let t = 0; t <= 1; t += 0.05) {
        const p = bez([238, 98], [310, 76], [404, 112], t);
        bristle += `M${f(p[0])} ${f(p[1])}l${f(4 + t * 3)} ${f(-8 + t * 3)}`;
      }
      b += P(bristle, null, 1.4);
      b += P('M196 162 Q182 156 188 142', PAPER, 2) + P('M196 162 Q182 156 188 142', null, 3.5, `stroke="${PAPER}"`);
      b += `<circle cx="208" cy="128" r="3" fill="${PAPER}"/><circle cx="208" cy="128" r="1.2" fill="${INK}"/>`;
      b += `<ellipse cx="173" cy="150" rx="3" ry="9" fill="${INK}"/>`;
      return svg(SW, SH, b, frame(SW, SH), 'A wild boar');
    },
    viper() {
      const r = rng(221);
      let b = `<rect width="${SW}" height="${SH}" fill="url(#h1)"/>`;
      b += rock(r, 300, 250, 520, 120);
      const body = 'M200 210 C150 210 150 176 196 168 S300 172 318 196 S258 226 236 206 S300 150 344 140 S360 110 368 104';
      b += P(body, null, 15) + P(body, null, 9, `stroke="${PAPER}" stroke-dasharray="7 9"`) + P(body, null, 2.5, 'stroke-dasharray="3 13"');
      b += P('M356 108 Q372 92 396 102 Q404 110 396 118 Q374 126 358 116Z', 'url(#h3)', 1.4);
      b += `<circle cx="384" cy="106" r="2.4" fill="${PAPER}"/>`;
      b += P('M402 112 l14 -2 l6 -6 M416 110 l6 4', null, 1);
      return svg(SW, SH, b, frame(SW, SH), 'A viper coiled on the stones');
    },
    hollis() {
      const r = rng(231);
      let b = `<rect width="${SW}" height="${SH}" fill="url(#h2)"/>`;
      b += `<ellipse cx="300" cy="140" rx="150" ry="120" fill="${PAPER}" opacity="0.85"/>`;
      b += P('M0 216 C200 208 400 222 600 212 L600 240 L0 240Z', PAPER, 1);
      for (let i = 0; i < 6; i++) b += leaf(i < 3 ? 30 + i * 36 : 460 + (i - 3) * 40, 230, 80, i < 3 ? -50 - i * 10 : -130 + (i - 3) * 10, 0.25);
      b += P('M366 12 L340 226', null, 3) + P('M362 0 L372 14 L360 20Z', INK, 1);
      b += P('M290 150 L280 214 M310 150 L322 214', null, 13);
      b += P('M272 176 l8 6 l6 -6 l6 6 l6 -6 M300 180 l8 6 l6 -6 l6 6 l8 -4', null, 3, `stroke="${PAPER}"`);
      b += P('M274 96 L326 96 L320 156 L280 156Z', INK, 1);
      b += P('M277 102 L256 140 L262 162 M323 102 L348 92 L356 70', null, 8);
      b += `<circle cx="300" cy="74" r="15" fill="${INK}"/>`;
      let hair = '';
      for (let a = -170; a <= -10; a += 16) {
        const rad = (a * Math.PI) / 180;
        hair += `M${f(300 + Math.cos(rad) * 13)} ${f(74 + Math.sin(rad) * 13)}l${f(Math.cos(rad) * (12 + r() * 10))} ${f(Math.sin(rad) * (12 + r() * 10) + 4)}`;
      }
      b += P(hair, null, 3);
      b += P('M282 70 L270 120 L278 112 L282 128 L290 114 L296 132 L302 116 L310 130 L314 112 L322 120 L318 70', INK, 1);
      b += P('M282 70 l-12 40 M318 70 l10 44', null, 2.5);
      b += `<circle cx="294" cy="72" r="2" fill="${PAPER}"/><circle cx="306" cy="72" r="2" fill="${PAPER}"/>`;
      return svg(SW, SH, b, frame(SW, SH), 'A wild man with a spear');
    },
    shark() {
      const r = rng(241);
      const hz = 70;
      let b = sky(r, SW, 0, hz, false) + sea(r, SW, hz, SH, false);
      b += `<ellipse cx="330" cy="190" rx="150" ry="26" fill="url(#h2)" opacity="0.8"/>`;
      b += P('M268 160 Q290 102 344 82 Q332 122 350 160Z', INK, 1.4);
      b += P('M462 158 L486 124 L478 160Z', INK, 1);
      let w = '';
      for (let i = 0; i < 10; i++) w += `M${250 + i * 12} ${160 + (i % 2) * 2}q6 -5 12 0`;
      b += P(w, null, 1);
      b += raft(10, 238, { hull: 1, mast: 0, sail: 0, casks: 0 }, 0.7);
      return svg(SW, SH, b, frame(SW, SH), 'A shark circling');
    },
  };

  ART.scene = function (name, opts) {
    const fn = SCENES[name] || SCENES.beach;
    return fn(opts);
  };
  ART.foe = function (name) {
    return (FOES[name] || FOES.crab)();
  };
  ART.names = { scenes: Object.keys(SCENES), foes: Object.keys(FOES) };
})();
