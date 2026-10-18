/* Driftwood — game utilities.
 * Small DOM, randomness and text helpers shared by the game modules.
 *
 * The game is split across several scripts that share `DW.game`. Each file
 * takes what it needs from the files loaded before it at the top, like
 * imports. The few references that must reach "up" to a later file
 * (render, renderLog, die, toTitle, LOCS, mapArt, happening, washedUp and
 * wander) are looked up on `G` at the moment they are used instead. */
(function () {
  'use strict';

  const G = (window.DW.game = {});

  /** Returns the first element matching the CSS selector `s`. */
  G.$ = (s) => document.querySelector(s);

  /** Creates a `tag` element with an optional class name and inner HTML. */
  G.el = function (tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  /** Restarts a CSS animation by removing `cls`, forcing a reflow, and adding it back. */
  G.replayAnimation = function (node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  };

  /** A random integer from a to b inclusive. */
  G.rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  /** True with probability p. */
  G.chance = (p) => Math.random() < p;

  /** A random element of the array a. */
  G.pick = (a) => a[Math.floor(Math.random() * a.length)];

  /** The string with its first letter capitalised. */
  G.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /** Wraps plain text in a <p>; markup that is already a paragraph passes through. */
  G.paragraph = (p) => (p.startsWith('<p') ? p : `<p>${p}</p>`);

  /** A quoted passage (a letter, a journal entry, speech) for a story card. */
  G.quote = (text) => `<p class="quote">${text}</p>`;

  /** A muted line recording what was gained, for a story card. */
  G.gainLine = (text) => `<p class="gain">${text}</p>`;
})();
