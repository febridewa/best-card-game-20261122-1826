// Ember Court — the Ashen Regent's brain.
// A real heuristic, not a random player: it spends its mana on the best-value
// cards it can afford, fires removal and healing when they matter, takes
// lethal when it sees it, trades up when it can, and only then goes face.
// The same planner drives the AI turn step by step from main.js.

import { CARD_BY_ID } from './cards.js';
import { FIELD_LIMIT } from './state.js';

// Value of a creature on the table: stats per mana, with a premium for
// Ward (it protects the hero) and Swift (it hits at once).
function creatureValue(def) {
  let v = def.atk + def.hp;
  if (def.ward) v += 2;
  if (def.swift) v += 1.5;
  return v / Math.max(1, def.cost);
}

function enemyWardExists(game, who) {
  return game.players[1 - who].field.some((c) => c.def.ward);
}

// Decide the next thing the given side should do, or null when it is done.
// Returned actions are plain data; state.js executes them.
export function planAiAction(game, who = 1) {
  const me = game.players[who];
  const foe = game.players[1 - who];

  // 1. Spells that change the game right now.
  for (let i = 0; i < me.hand.length; i++) {
    const def = me.hand[i].def;
    if (def.kind !== 'spell' || def.cost > me.mana) continue;
    const fx = def.effect;
    if (fx.type === 'heal' && me.hp <= 16) return { type: 'play', handIndex: i };
    if (fx.type === 'draw' && me.hand.length <= 3) return { type: 'play', handIndex: i };
    if (fx.type === 'sweep' && foe.field.length >= 2 && foe.field.some((c) => c.hp <= 2)) {
      return { type: 'play', handIndex: i };
    }
    if (fx.type === 'damage') {
      // Lethal first.
      if (fx.amount >= foe.hp) return { type: 'play', handIndex: i, target: 'hero' };
      // Remove a creature that would otherwise kill us or out-value the spell.
      const prey = foe.field
        .filter((c) => c.hp <= fx.amount && c.atk >= 4)
        .sort((a, b) => b.atk - a.atk)[0];
      if (prey) return { type: 'play', handIndex: i, target: prey.uid };
      // Late game, unanswered board pressure: burn face.
      if (game.turn >= 7 && foe.field.length === 0) return { type: 'play', handIndex: i, target: 'hero' };
    }
  }

  // 2. Play the best-value affordable creature — if there is room.
  let best = -1;
  let bestValue = 0;
  if (me.field.length < FIELD_LIMIT) {
    for (let i = 0; i < me.hand.length; i++) {
      const def = me.hand[i].def;
      if (def.kind !== 'creature' || def.cost > me.mana) continue;
      const v = creatureValue(def);
      if (v > bestValue) {
        bestValue = v;
        best = i;
      }
    }
  }
  if (best >= 0) return { type: 'play', handIndex: best };

  // 3. Attack with every creature that can, in a sensible order.
  const attackers = me.field.filter((c) => c.canAttack);
  if (attackers.length === 0) return null;

  const wardUp = enemyWardExists(game, who);
  const faceDamage = attackers.reduce((sum, c) => sum + c.atk, 0);

  // Lethal: every attacker goes face — but only when no Ward stands in
  // the way. A Ward wall must be answered on the board, never ignored.
  if (!wardUp && faceDamage >= foe.hp) {
    const a = attackers[0];
    return { type: 'attack', attacker: a.uid, target: 'hero' };
  }

  // Board dominance: when our field hits harder than theirs, press the
  // advantage and go face instead of trading pieces away.
  const myBoardAtk = me.field.reduce((s, c) => s + c.atk, 0);
  const foeBoardAtk = foe.field.reduce((s, c) => s + c.atk, 0);
  if (myBoardAtk > foeBoardAtk + 2 && !wardUp) {
    const strongest = attackers.slice().sort((a, b) => b.atk - a.atk)[0];
    return { type: 'attack', attacker: strongest.uid, target: 'hero' };
  }

  // Favourable trades first — but only against real threats or when we
  // survive the exchange. Chipping a 1-attack creature is not worth
  // leaving the hero alone: an unanswered board should be hitting face.
  for (const a of attackers) {
    const targets = foe.field
      .filter((t) => (wardUp ? t.def.ward : true) && t.hp <= a.atk && (t.atk >= 3 || a.hp > t.atk))
      .sort((x, y) => y.atk - x.atk);
    if (targets.length > 0) return { type: 'attack', attacker: a.uid, target: targets[0].uid };
  }

  // A Ward wall must come down even at a bad price: chip it with the
  // strongest attacker rather than passing the turn and stalling the duel.
  if (wardUp) {
    const wall = foe.field.filter((t) => t.def.ward).sort((x, y) => x.hp - y.hp)[0];
    if (wall) {
      const strongest = attackers.slice().sort((a, b) => b.atk - a.atk)[0];
      return { type: 'attack', attacker: strongest.uid, target: wall.uid };
    }
  }

  // Otherwise: go face with the strongest attacker.
  const strongest = attackers.slice().sort((a, b) => b.atk - a.atk)[0];
  return { type: 'attack', attacker: strongest.uid, target: 'hero' };
}

// How many turns the AI is allowed to think in one go is a main.js concern;
// this helper just tells it whether anything remains to do.
export function aiHasMoves(game, who = 1) {
  return planAiAction(game, who) !== null;
}

export { CARD_BY_ID };
