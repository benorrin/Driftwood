/* Driftwood — the prologue.
 * The Calliope, 1826: Tom Hollis, cabin boy, aged fourteen, on the night the
 * brig strikes the reef and the weeks after, up to the first fever. A short
 * telling on the intro screen, page by page, with a few small choices that
 * change a line and nothing else. It stops before the cave, which is
 * Chapter 1's to find from Hale's letter, log and journal, and it must agree
 * with them. Played before a browser's first tale, and from the developer tools. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const { $, paragraph, quote } = G;

  /** Where the prologue remembers that it has been seen. */
  const SEEN_KEY = 'driftwood-prologue-v1';

  /** Whether this browser has seen the prologue, to the end or skipped. */
  G.prologueSeen = () => !!DW.storage.get(SEEN_KEY);

  /**
   * The pages, in order. Each has a scene picture, a music mood, and its
   * paragraphs, shown one per click. A page may end with `choices`, each a
   * button label and the paragraphs that follow from it.
   */
  const PAGES = [
    {
      art: 'tempest', mood: 'tense',
      text: [
        '<p class="dateline">The brig <i>Calliope</i>, of Liverpool. The 9th of March, 1826.</p>',
        'You are Thomas Hollis, cabin boy, fourteen years old, and you have never been so frightened in your life.',
        'Three days the gale has blown, and for three days Captain Hale has had no sight of the sun. Ahead of you, by his reckoning, is open sea for a thousand miles.',
        'In the middle watch the lookout screams. Not "breakers ahead": only a scream, and then everyone can hear them, a long white roar across the bow where there should be nothing at all.',
        'She strikes. The whole ship jumps like a kicked dog, the foremast goes over the side, and the sea comes aboard green.',
      ],
      choices: [
        ['run for the longboat', [
          'You run for the longboat, because that is what the men are doing. A sea lifts her off the chocks before anyone reaches her and carries her away into the dark, and you would have gone with her if Mr Price, the second mate, had not caught you by the collar.',
        ]],
        ['hold fast to the rail', [
          'You wrap both arms round the rail and hold on. Mr Price, the second mate, passes a line round you and makes it fast, and goes forward again into the dark. A sea takes the longboat off her chocks and away, and nobody sees where.',
        ]],
      ],
      after: [
        'Somewhere in the dark a falling spar takes Mr Price across the chest. You hear it. You do not see it.',
        'At first light the gale blows itself out. The <i>Calliope</i> lies on the reef with her back broken, and beyond the reef is an island: high and green, cloud on its peak, and on no chart in the captain\'s cabin.',
      ],
    },
    {
      art: 'beach', mood: 'calm',
      text: [
        '<p class="dateline">The eastern rocks</p>',
        'They rig a line from the wreck to the rocks and come ashore along it one at a time, and Captain Hale counts them as they come. Eleven. He counts again, as if he might have made a mistake.',
        'Mr Price is carried ashore last. He does not complain. He asks for water, and then for you, and then he does not ask for anything.',
        'He dies a little after noon, in the shade of the rocks, with his head in your lap.',
        'The captain asks who will dig. Nobody answers; they are all done in. So you go up above the tide line where the sand is dry, and you dig with your hands, because there is no spade, until your nails break.',
      ],
      choices: [
        ['say the Lord\'s Prayer', [
          'When he is in the ground you say the Lord\'s Prayer over him, the way your mother taught you, and you get it right all the way to the end.',
        ]],
        ['say nothing', [
          'When he is in the ground you cannot think of anything to say. Captain Hale says it for you, and puts his hand on your shoulder, and leaves it there.',
        ]],
      ],
    },
    {
      art: 'bottle', mood: 'calm',
      text: [
        '<p class="dateline">The weeks</p>',
        'They make their camp by the eastern rocks, and at low water they go out to the wreck and bring back what the sea has left them: canvas, biscuit, the carpenter\'s chest, the captain\'s cutlass and his log.',
        'One evening Captain Hale writes a letter by the fire, slowly, and reads it over twice, and rolls it up into an empty bottle and seals the neck with wax. Then he gives it to you.',
        quote('To any Christian soul who finds this. The brig <i>Calliope</i>, of Liverpool, struck upon a reef off this island the 9th of March, 1826. Eleven of us came ashore. We are camped by the eastern rocks. God send a ship. — J. Hale, Captain.'),
        '"You have the best arm of any of us," he says. "Throw it as far as you can."',
      ],
      choices: [
        ['throw it', [
          'You throw it as far as you can. It turns over and over against the sunset, and the tide takes it out, and does not bring it back.',
        ]],
      ],
      after: [
        'The next day you cut your name into a palm above the camp with Mr Price\'s knife, so that somebody will know: <i>T.H. 1826</i>.',
      ],
    },
    {
      art: 'night', mood: 'calm',
      text: [
        '<p class="dateline">The island at night</p>',
        'At night the island makes a noise. It comes from somewhere along the north shore when the tide is going out: a long, low moan, and then a muttering, like a man talking in his sleep.',
        'The men say it is the wind in the rocks. You lie awake and listen to it, and you think it is not talking in its sleep at all. You think it is awake.',
        'One night, very late, you see lights far out on the sea to the south, a great many of them, low on the water, like a town. In the morning they are gone. Nobody else saw them, and Mr Tewkes tells you not to be a fool.',
      ],
      choices: [
        ['tell the captain', [
          '"The island is watching us," you tell Captain Hale. He looks at you for a long time, and he does not laugh.',
        ]],
        ['keep it to yourself', [
          'You keep it to yourself. But after that you sleep with your back to the rock, facing the dark.',
        ]],
      ],
    },
    {
      art: 'grave', mood: 'calm',
      text: [
        '<p class="dateline">Mr Tewkes</p>',
        'Mr Tewkes, the mate, had his leg crushed when the foremast went, and has not walked since. He is a hard man, and he does not complain either. By the end of March the leg has gone black, and he talks to people who are not there.',
        'He dies on the first night of April. In the morning you dig again, beside Mr Price, with a piece of the <i>Calliope</i>\'s planking this time. Your hands remember how.',
        '"That makes two," says Captain Hale, when it is done. He says it to nobody.',
        'That evening, by the fire, one of the hands begins to shiver, though the night is warm. The captain lays a hand on his forehead, and keeps it there, and says nothing for a long time.',
      ],
    },
    {
      art: 'summit', mood: 'calm',
      text: [
        '<p class="dateline">The high rock</p>',
        'In the morning you climb. You do not mean to; you mean only to be away from the camp for an hour. But you go up and up, through the jungle and over the bare rock, until there is nothing above you but the sky.',
        'From up here you can see the whole island, and the reef, and the wreck on it like a dead bird, and the empty sea all round, whichever way you look.',
        'You sit down with your knees drawn up. You do not want to go back down.',
        '<p class="dateline">Twenty years later</p>',
      ],
    },
  ];

  /**
   * Plays the prologue on the intro screen, then calls `done`. The intro's
   * skip link skips the rest of it. Either way it counts as seen.
   */
  G.playPrologue = (done) => G.playPages(PAGES, () => {
    DW.storage.set(SEEN_KEY, '1');
    done();
  });

  /**
   * Plays `pages` (shaped like PAGES) on the intro screen, one paragraph
   * per click, then calls `done`. The intro's skip link skips the rest.
   */
  G.playPages = function (pages, done) {
    const box = $('#intro-text');
    const art = $('#intro-art');
    const next = $('#btn-intro-next');
    const picks = $('#intro-choices');
    let page = 0;
    let lines = [];
    let i = 0;
    let asked = false;

    /** Puts away the pages' furniture and moves on. */
    const finish = () => {
      art.classList.add('hidden');
      art.innerHTML = '';
      picks.innerHTML = '';
      next.classList.remove('hidden');
      AU.setMood('calm');
      done();
    };

    /** Clears the screen for page `n` and shows its first paragraph. */
    const open = (n) => {
      const p = pages[n];
      box.innerHTML = '';
      art.innerHTML = ART.scene(p.art);
      art.classList.remove('hidden');
      AU.setMood(p.mood);
      lines = p.text.slice();
      i = 0;
      asked = false;
      step();
    };

    /** Offers the page's choices in place of the next button. */
    const offer = (p) => {
      asked = true;
      next.classList.add('hidden');
      picks.innerHTML = '';
      p.choices.forEach(([label, then]) => {
        const b = document.createElement('button');
        b.className = 'btn';
        b.innerHTML = `<span>${label}</span>`;
        b.onclick = () => {
          picks.innerHTML = '';
          next.classList.remove('hidden');
          lines = lines.concat(then, p.after || []);
          step();
        };
        picks.appendChild(b);
      });
    };

    /** Shows the next paragraph, or the page's choices, or the next page. */
    const step = () => {
      const p = pages[page];
      if (i < lines.length) {
        AU.sfx('page');
        box.insertAdjacentHTML('beforeend', paragraph(lines[i]));
        i++;
        const ask = i >= lines.length && p.choices && !asked;
        next.querySelector('span').textContent = !ask && i >= lines.length && page === pages.length - 1 ? 'go on' : '…';
        if (ask) offer(p);
        return;
      }
      page++;
      if (page >= pages.length) finish();
      else open(page);
    };

    $('#intro-text').innerHTML = '';
    $('#intro').classList.remove('hidden');
    $('#title-screen').classList.add('hidden');
    $('#game').classList.add('hidden');
    window.scrollTo(0, 0);
    next.onclick = step;
    $('#btn-intro-skip').onclick = finish;
    open(0);
  };
})();
