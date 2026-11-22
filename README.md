# Ember Court — Duel of the Ashen Isles

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/febridewa/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/febridewa/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Ember Court** is an original turn-based card battler that plays offline in a desktop browser. You are the Ember Warden, duelling the Ashen Regent for the Ember Court: 20 life each, mana that grows by 1 every turn (up to 10), a 24-card deck drawn from 18 original cards across four elements — Ember, Tide, Grove and Gale — each told apart by colour and glyph.

## How it plays

- **Creatures** cost mana and fight on the table with attack and health. **Ward** creatures must be attacked first; **Swift** creatures strike the turn they arrive.
- **Spells** bend the duel: Fireball (3 damage to any target), Healing Rain (restore 5 life), Wild Growth (draw 2), Lightning Gale (2 damage to every enemy creature).
- **Fatigue**: an empty deck hurts — drawing from it deals 1, then 2, then 3… damage.
- The **Ashen Regent** is a real opponent: it plays its best-value cards, fires removal and healing when they matter, takes lethal when it sees it, trades up, and only then goes face.
- A full duel lasts about 6–12 turns. Mouse and keyboard: click to play, select and target; `1–7` play a card, `Space` ends the turn, `Enter` starts or restarts, `Esc` cancels, `M` mutes the synthesised WebAudio sounds.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network request, every file it loads lives under `game/`.

## Layout

- `game/` — the game itself: `index.html`, `style.css`, `src/cards.js` (the catalogue), `src/deck.js` (seeded decks and fatigue), `src/state.js` (the rules engine), `src/ai.js` (the Regent's heuristic), `src/render.js` (the table), `src/audio.js` (synthesised sound), `src/main.js` (input, the AI clock, screenshot states).
- `screenshots/` — real renders of the game's own code: title, mid-game table, victory, defeat.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `shots.json` — the four screenshot states (`?shot=start|play|win|loss`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=6etrfz79&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
