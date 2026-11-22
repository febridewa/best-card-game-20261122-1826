// Ember Court — the hand-in program (Node 22, standard library only).
//
// It copies this repository's game/ and screenshots/ into /output and
// writes /output/dossier.json with the vendored make.fun library, exactly
// the summary the judge reads. Run it twice and both runs write the same
// bytes; the grader runs it in a fresh container with no network, a
// read-only copy of this repository and a writable /output.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The game itself: plain static files a desktop browser loads offline.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

// The screenshots: real renders of the game's own code, taken in Chrome.
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier, byte-for-byte what the library writes from game/ and
// screenshots/. The caps mirror the sealed gate's: at most 4 screenshots
// of 256 KiB, at most 993 game files totalling 48 MiB, paths under 1000
// bytes, and 160 KiB of dossier text.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
