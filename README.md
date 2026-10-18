# Driftwood

*A castaway's tale of the South Seas, 1846.*

A slow, text-driven survival game in the spirit of *A Dark Room*. You are the bosun's mate of the barque *Meridian*, marooned by mutineers with a pistol, a single ball and the ship's Bible. Gather driftwood, keep your fire alive, explore the island, learn what happened to the brig *Calliope* twenty years before you, and find a way home.

## Playing

Open `index.html` in a browser. There's no build step and no server, and it works straight from `file://`. Progress is saved to `localStorage` automatically.

To host it, publish the folder as-is on any static host (GitHub Pages, Netlify, etc.).

## Visual styles

Choose **style** in the top bar, or **visual style** on the title screen, to change how the island is drawn. The idea comes from the monitor palettes in *Return of the Obra Dinn*. There are eight styles: Engraving (the default), Night Watch, a 1-bit Macintosh, IBM 5151 green phosphor, Zenith amber, Commodore 1084, IBM 8503, and a pocket LCD. The CRT styles add scanlines, a phosphor glow and a terminal font. Your choice is remembered in the browser.

To add a style, add an entry to the list in `js/styles.js` with an ink colour, a paper colour, a font, and optionally a screen effect (`crt`, `mac` or `lcd`). Every illustration is drawn in exactly those two colours, so nothing else needs to change.

## How it's made

- **No asset files.** The illustrations are SVG drawn by code (`js/art.js`) in the style of a 19th-century wood engraving: hatching, stipple and ink line, roughened with an SVG displacement filter.
- **Music and sound** are synthesised live with the Web Audio API (`js/audio.js`): breaking surf, a crackling fire, an original fiddle lament in D dorian, a heartbeat drum for fights, ship's bells at dawn, and every sound effect.
- **The game** (`js/game.js`) covers resources, crafting, a day/night cycle, fire upkeep, hunger and thirst, an explorable chart of the island, real-time combat, a story told through events, and two different endings.

The only external dependencies are three fonts from Google Fonts: *IM Fell English*, plus *VT323* and *Space Mono* for the retro styles. When you're offline the page falls back to Georgia or Courier.

## Spoiler-light hints

- Keep the fire burning at night. Some things on this island are afraid of it.
- Twist palm fibre into cordage. Almost everything needs it.
- Read every bottle and journal you find. They tell you where to go next.
- There is more than one way off the island, and more than one way to treat the man in the jungle.
