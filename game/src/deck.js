// Ember Court — deck building, shuffling and drawing.
// A seeded generator keeps every game reproducible: the same seed deals the
// same opening hands, which is what makes the screenshot states in main.js
// deterministic and the playtests repeatable.

import { CARD_BY_ID, DECK_RECIPE } from './cards.js';

// A hand holds at most this many cards; a draw past it burns the card.
export const HAND_LIMIT = 10;

// mulberry32: a small, fast seeded PRNG with a decent shuffle.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Build a fresh 24-card deck from the recipe, shuffled with the given seed.
export function buildDeck(seed) {
  const ids = [];
  for (const [id, count] of DECK_RECIPE) {
    for (let n = 0; n < count; n++) ids.push(id);
  }
  const rng = makeRng(seed);
  return shuffle(ids, rng).map((id) => ({ cardId: id, def: CARD_BY_ID[id] }));
}

// Draw one card. An empty deck hurts instead: fatigue rises 1, 2, 3…
// and the damage is dealt to the hero who drew. A full hand burns the
// drawn card instead of holding it. Returns what happened.
export function drawCard(player) {
  if (player.deck.length === 0) {
    player.fatigue += 1;
    player.hp -= player.fatigue;
    return { kind: 'fatigue', amount: player.fatigue };
  }
  const card = player.deck.pop();
  if (player.hand.length >= HAND_LIMIT) {
    return { kind: 'burned', card };
  }
  player.hand.push(card);
  return { kind: 'card', card };
}
