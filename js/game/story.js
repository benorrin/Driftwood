/* Driftwood — the story.
 * What happens at the wreck of the Calliope, in the cave of the dead, and
 * at the wild man's hut; and the card that ends every visit. */
(function () {
  'use strict';

  const G = window.DW.game;
  const AU = window.DW.audio;
  const ART = window.DW.art;
  const { S, quote, gainLine, gain, log, heal, modal, leave, fight } = G;

  /**
   * The end of a visit to `id`: a card of `text`, the resources `got` (if
   * any), and a "return to camp" that logs `logLine` as lore.
   */
  function done(id, text, got, logLine) {
    const L = G.LOCS[id];
    const g = got ? gain(got) : '';
    modal({
      art: ART.scene(L.art),
      title: L.name,
      text: [text].concat(g ? [gainLine(`You return with ${g}.`)] : []),
      choices: [leave('return to camp', logLine, 'lore')],
    });
  }

  /* ---------------- the wreck ---------------- */

  /** Aboard the wreck of the Calliope: the cabin and the hold may each be searched once. */
  function wreck(first) {
    const intro = first
      ? 'At the lowest ebb the reef stands clear of the water, and on it lies what is left of the <i>Calliope</i>: her ribs bare as a whale\'s, her mainmast snapped and trailing. You make your line fast to a coral head and haul yourself aboard.'
      : "The Calliope's bones creak in the swell. Her decks tilt like a roof.";
    const choices = [];
    if (!S.flags.wreckCabin) choices.push({ label: "search the captain's cabin", fn: wreckCabin });
    if (!S.flags.wreckHold) choices.push({ label: 'go down into the hold', fn: wreckHold });
    choices.push(leave('return to camp'));
    modal({ art: ART.scene('wreck'), title: 'The Wreck of the Calliope', text: [intro], choices });
  }

  /** The captain's cabin: a cutlass, dry powder, and a log page that points to the cave. */
  function wreckCabin() {
    S.flags.wreckCabin = 1;
    S.flags.caveKnown = 1;
    S.items.cutlass = 1;
    AU.sfx('pickup');
    modal({
      art: ART.scene('wreck'),
      title: "The Captain's Cabin",
      text: [
        'The cabin is a grotto of weed and sand. In a sea-chest, wrapped in oilcloth: a cutlass, bright still beneath its grease, and a tin of powder and ball the sea has somehow spared. The log is pulp, save for the last page:',
        quote('Fever among the men. I have moved the sick to the cave beneath the north headland, where it is dry. The boy Hollis will not come. He says the island is watching us.'),
        gainLine(`You take the cutlass and ${gain({ shot: 2 })}.`),
      ],
      choices: [{ label: 'go on', fn: () => wreck(false) }],
    });
  }

  /** The hold: salvage, and the carpenter's tools that make a raft possible. */
  function wreckHold() {
    S.flags.wreckHold = 1;
    S.flags.raftPlans = 1;
    AU.sfx('pickup');
    modal({
      art: ART.scene('wreck'),
      title: 'The Hold',
      text: [
        "The hold is half full of sand and black water. Your hands find barrel hoops, bolts of canvas — some still sound — and a carpenter's chest, its tools rusted but whole: adze, auger, mallet, and a book of ship's lines.",
        'With tools like these, you could build something that floats. Something to carry you over the horizon.',
        gainLine(`You take ${gain({ iron: 6, cloth: 4, timber: 2 })}.`),
      ],
      choices: [{
        label: 'go on',
        fn: () => {
          log('With the carpenter\'s tools, a raft might be possible.', 'lore');
          wreck(false);
        },
      }],
    });
  }

  /* ---------------- the cave ---------------- */

  /** Captain Hale's journal, which tells of the summit; then a choice to bury the dead. */
  function journal() {
    S.items.journal = 1;
    S.flags.summitKnown = 1;
    AU.sfx('page');
    const summitLine = 'You know the way to the summit now.';
    modal({
      art: ART.scene('bones'),
      title: "Hale's Journal",
      text: [
        'You lift the book gently. The bones do not object. The ink is brown and the hand unsteady.',
        quote('April 2nd. Buried Mr Tewkes. That makes six.'),
        quote('April 19th. The boy Hollis says the whalers pass the north headland when the trades turn — he has seen their topsails from the high rock. I have not the strength to climb. If any man reads this: light a fire upon the summit. A great fire.'),
        quote('The boy has not come back. I pray he lives. I pray he does not.'),
        gainLine(`Beside the body, a powder horn: ${gain({ shot: 3 })}.`),
      ],
      choices: [
        {
          label: 'bury the dead',
          fn: () => {
            S.flags.buried = 1;
            heal(2);
            done('cave', 'It takes until dusk to carry them out and lay them under the sand, above the tide line. You say what you can remember of the burial service. It is not much, but it is something.', null, summitLine);
          },
        },
        { label: 'leave them be', fn: () => done('cave', 'You leave the dead to their darkness.', null, summitLine) },
      ],
    });
  }

  /* ---------------- the wild man ---------------- */

  /** The wild man's hut: feed him, fight him, or leave him be. */
  function hut() {
    const first = !S.flags.metHollis;
    S.flags.metHollis = 1;
    modal({
      art: ART.scene('hut'),
      title: "The Wild Man's Hut",
      text: first
        ? [
          'In a clearing stands a hut of lashed poles and palm thatch. Boar skulls grin from stakes around it. A cookfire smoulders.',
          'Then a man steps out of the doorway — or the ruin of one: naked but for rags, hair to his waist, a spear in his fist and twenty years of solitude in his eyes. He stares at you as if you were a ghost.',
          quote('"<i>Calliope</i>?" he croaks. "Did the <i>Calliope</i> send you?"'),
        ]
        : ['The wild man watches you from the doorway, spear in hand, perfectly still.'],
      choices: [
        { label: 'offer him food', cost: { food: 5 }, fn: hollisPeace },
        { label: 'draw your weapon', fn: () => fight('hollis', { canFlee: true, onWin: hollisKilled }) },
        leave('back away slowly', 'You leave him to his clearing. The thefts will go on.'),
      ],
    });
  }

  /** Hollis, fed, tells his story and joins the castaway. */
  function hollisPeace() {
    S.flags.hollisDone = 1;
    S.flags.ally = 1;
    S.flags.summitKnown = 1;
    modal({
      art: ART.foe('hollis'),
      title: 'Thomas Hollis',
      text: [
        'He eats like a starving dog, then weeps like a child. His name is Thomas Hollis. He was cabin boy on the <i>Calliope</i>, fourteen years old when she struck. He buried the others one by one, until there was no one left to bury him.',
        quote('"The ships," he says. "I\'ve seen \'em, from the high rock, when the trades turn. I lit fires. They never came. Too small, my fires." He looks at you. "Two of us could make a bigger one."'),
        gainLine(`He gives you ${gain({ hide: 3, rope: 4 })}, and shows you the way to the summit.`),
      ],
      choices: [leave('walk back together', 'Hollis comes back to the beach with you. He does not say much, but he works, and he keeps the fire.', 'lore')],
    });
  }

  /** Hollis is dead, and his hut is plundered. */
  function hollisKilled() {
    S.flags.hollisDone = 1;
    S.flags.killedHollis = 1;
    modal({
      art: ART.scene('hut'),
      title: 'The Hut',
      text: [
        'He falls, and does not rise. In the hut you find his stores: hides, cord, smoked meat, a cabin boy\'s brass buttons strung on a thread.',
        'Scratched into the doorpost, row upon row upon row, are notches. Thousands of them.',
        gainLine(`You take ${gain({ hide: 4, rope: 5, food: 4 })}.`),
      ],
      choices: [leave('return to camp', 'You do not sleep well that night.', 'lore')],
    });
  }

  Object.assign(G, { done, wreck, journal, hut });
})();
