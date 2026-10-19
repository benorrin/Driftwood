/* Driftwood — interface building blocks.
 * The modal story card, reusable buttons with cooldowns, and the view
 * state (current tab, cached scene) the renderer works from. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const { $, el, paragraph, has, pay, costText, log, save } = G;

  /** What is on screen: the open tab, tabs already visited, and the key of the drawn scene. */
  G.view = { tab: 'beach', seenTabs: { beach: true }, sceneKey: '' };

  /** When each button's cooldown ends, by button key (performance.now() time). */
  G.cooldowns = {};

  /* ---------------- the modal ---------------- */

  /**
   * Opens the modal card. `o` has art (SVG markup), title, text (an array
   * of paragraphs; plain strings are wrapped in <p>) and choices. Each
   * choice is { label, fn, cost? }: a choice with a cost is disabled until
   * it can be paid, and pays it when chosen.
   */
  G.modal = function (o) {
    $('#modal').classList.remove('hidden');
    $('#modal-art').innerHTML = o.art || '';
    $('#modal-title').innerHTML = o.title ? `<span>${o.title}</span>` : '';
    $('#modal-body').innerHTML = (o.text || []).map(paragraph).join('');
    const box = $('#modal-choices');
    box.innerHTML = '';
    (o.choices || []).forEach((ch) => {
      const b = el('button', 'btn', `<span>${ch.label}</span>${ch.cost ? `<span class="cost">${costText(ch.cost)}</span>` : ''}`);
      if (ch.cost && !has(ch.cost)) b.disabled = true;
      b.onclick = () => {
        AU.sfx('click');
        if (ch.cost) {
          if (!has(ch.cost)) return;
          pay(ch.cost);
        }
        ch.fn();
        G.render();
      };
      box.appendChild(b);
    });
    $('#modal').scrollTop = 0;
    const first = box.querySelector('button:not(:disabled)');
    if (first) first.focus({ preventScroll: true });
  };

  /** Whether a notice (the modal card) is open. The clock stands still while one is. */
  G.modalOpen = () => !$('#modal').classList.contains('hidden');

  /** Cards waiting for the one on screen to be closed. */
  const waiting = [];

  /** Opens card `o` (as for `modal`), or, if a card is already open, shows it once that one closes. */
  G.queueModal = function (o) {
    if (G.modalOpen()) waiting.push(o);
    else G.modal(o);
  };

  /** Forgets any waiting cards, as when a game ends or another begins. */
  G.clearQueue = () => {
    waiting.length = 0;
  };

  /**
   * A card telling of a setback: `title`, paragraphs of `text`, and optional
   * `art`. Reading it logs `line` as a warning, so the log keeps a record.
   */
  G.notice = (title, text, line, art) => G.queueModal({ art, title, text, choices: [G.leave('go on', line, 'warn')] });

  /** Closes the modal, calms the music, saves and redraws, then shows the next waiting card, if any. */
  G.closeModal = function () {
    $('#modal').classList.add('hidden');
    AU.setMood('calm');
    save();
    G.render();
    if (waiting.length) G.modal(waiting.shift());
  };

  /** A modal choice that closes the card, first logging `line` (with class `cls`) if given. */
  G.leave = (label, line, cls) => ({
    label,
    fn: () => {
      if (line) log(line, cls);
      G.closeModal();
    },
  });

  /** Asks a yes-or-no question in the modal. */
  G.confirm = function (title, text, yes, no) {
    G.modal({
      title,
      text: [text],
      choices: [yes, no],
    });
  };

  /* ---------------- buttons ---------------- */

  /** Starts the shaded cooldown sweep on a button, lasting `secs` seconds. */
  G.startCooldown = function (btn, secs) {
    btn.classList.add('cooling');
    const cd = btn.querySelector('.cd');
    cd.style.animation = 'none';
    void cd.offsetWidth;
    cd.style.animation = '';
    cd.style.animationDuration = `${secs}s`;
  };

  // Buttons are kept and reused between renders so clicks and cooldowns aren't interrupted.
  G.BTNS = new Map();

  /**
   * Returns the persistent button for `key`, updated with a label, a cost
   * line, whether it is enabled, its click handler and a tooltip. A button
   * still cooling down stays disabled.
   */
  G.button = function (key, label, cost, enabled, onClick, title) {
    let b = G.BTNS.get(key);
    if (!b) {
      b = el('button', 'btn', '<span class="lbl"></span><span class="cost"></span><span class="cd"></span>');
      b.dataset.key = key;
      b.addEventListener('click', () => {
        if (!b.disabled) b._click();
      });
      G.BTNS.set(key, b);
    }
    b._click = onClick;

    const lbl = b.querySelector('.lbl');
    if (lbl.textContent !== label) lbl.textContent = label;
    const ct = cost || '';
    const costEl = b.querySelector('.cost');
    if (costEl.textContent !== ct) costEl.textContent = ct;
    costEl.style.display = ct ? '' : 'none';

    const cooling = G.cooldowns[key] && G.cooldowns[key] > performance.now();
    if (!cooling && b.classList.contains('cooling')) b.classList.remove('cooling');
    b.disabled = cooling || !enabled;
    b.title = title || '';
    return b;
  };

  /**
   * Returns the persistent panel section for `key`: a heading, an optional
   * note, and a row for buttons. The heading and note follow the latest
   * call, as a section can change with where the castaway is.
   */
  G.section = function (key, title, note) {
    let s = G.BTNS.get(`sec:${key}`);
    if (!s) {
      s = el('div', 'section', '<h3></h3><p class="note"></p><div class="btn-row"></div>');
      G.BTNS.set(`sec:${key}`, s);
    }
    if (s._title !== title) {
      s._title = title;
      s.querySelector('h3').innerHTML = title;
    }
    if (s._note !== (note || '')) {
      s._note = note || '';
      const p = s.querySelector('.note');
      p.innerHTML = s._note;
      p.style.display = s._note ? '' : 'none';
    }
    return s;
  };

  /** Fills `container` with `nodes`, touching the DOM only if they differ from what is there. */
  G.fill = function (container, nodes) {
    const cur = Array.from(container.children);
    if (cur.length === nodes.length && cur.every((n, i) => n === nodes[i])) return;
    container.replaceChildren(...nodes);
  };
})();
