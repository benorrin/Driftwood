/* Driftwood — visual styles.
 * Each style is a two-colour palette (ink and paper) plus an optional font
 * and screen effect. The art is drawn in exactly those two colours, so a
 * palette swap restyles everything, after the manner of old monitors. */
(function () {
  'use strict';

  const FELL = "'IM Fell English', Georgia, 'Times New Roman', serif";
  const FELL_SC = "'IM Fell English SC', 'IM Fell English', Georgia, serif";
  const VT = "'VT323', 'Courier New', monospace";
  const MONO = "'Space Mono', 'Courier New', monospace";

  const STYLES = [
    { id: 'engraving', name: 'Engraving', desc: 'ink on rag paper', ink: '#1c1915', paper: '#f2ede1', font: FELL, fontSc: FELL_SC, size: 18 },
    { id: 'nightwatch', dark: true, name: 'Night Watch', desc: 'chalk on slate', ink: '#ece4d2', paper: '#1d1b18', font: FELL, fontSc: FELL_SC, size: 18 },
    { id: 'macintosh', name: 'Macintosh', desc: '1-bit, 1984', ink: '#000000', paper: '#ffffff', font: FELL, fontSc: FELL_SC, size: 18, fx: 'mac' },
    { id: 'ibm5151', dark: true, name: 'IBM 5151', desc: 'green phosphor', ink: '#3dff74', paper: '#0b1a10', font: VT, fontSc: VT, size: 23, fx: 'crt', mono: true },
    { id: 'zenith', dark: true, name: 'Zenith ZVM-1240', desc: 'amber phosphor', ink: '#ffb20f', paper: '#1c1206', font: VT, fontSc: VT, size: 23, fx: 'crt', mono: true },
    { id: 'commodore', dark: true, name: 'Commodore 1084', desc: 'cyan on violet', ink: '#9be3ec', paper: '#3d2f86', font: VT, fontSc: VT, size: 23, fx: 'crt', mono: true },
    { id: 'ibm8503', name: 'IBM 8503', desc: 'grey-white mono', ink: '#2e3037', paper: '#ebe5ce', font: MONO, fontSc: MONO, size: 15, mono: true },
    { id: 'lcd', name: 'Pocket LCD', desc: 'four shades of pea', ink: '#0f380f', paper: '#9bbc0f', font: MONO, fontSc: MONO, size: 15, fx: 'lcd', mono: true },
  ];

  const KEY = 'driftwood-style';
  const T = (window.DWStyles = { list: STYLES, current: STYLES[0].id });

  T.get = (id) => STYLES.find((s) => s.id === id) || STYLES[0];

  T.apply = function (id) {
    const s = T.get(id);
    const root = document.documentElement;
    root.style.setProperty('--ink', s.ink);
    root.style.setProperty('--paper', s.paper);
    root.style.setProperty('--font', s.font);
    root.style.setProperty('--font-sc', s.fontSc);
    root.style.setProperty('--size', `${s.size}px`);
    root.style.colorScheme = s.dark ? 'dark' : 'light';
    root.dataset.style = s.id;
    root.dataset.fx = s.fx || '';
    if (s.mono) root.dataset.mono = '1';
    else delete root.dataset.mono;
    window.DWArt.setPalette(s.ink, s.paper);
    T.current = s.id;
    try { localStorage.setItem(KEY, s.id); } catch (e) { /* storage unavailable */ }
  };

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
  T.apply(saved);
})();
