// Ember Court — the rules engine.
// One object owns the whole duel: both heroes, their decks, hands and
// fields, the turn and mana clocks, the action log and the win/loss state.
// Rendering (render.js) only reads this object; input (main.js) only calls
// its methods. Nothing here touches the DOM.

import { buildDeck, drawCard, HAND_LIMIT } from './deck.js';
import { CARD_BY_ID } from './cards.js';

export const MAX_HP = 20;
export const MAX_MANA = 10;
export const FIELD_LIMIT = 6;

let uidCounter = 1;
function nextUid() {
  return `c${uidCounter++}`;
}

function makePlayer(name, title, seed, isAi) {
  return {
    name,
    title,
    isAi,
    hp: MAX_HP,
    maxHp: MAX_HP,
    mana: 0,
    manaMax: 0,
    fatigue: 0,
    deck: buildDeck(seed),
    hand: [],
    field: [],
  };
}

export function createGame(seed = 20261123) {
  uidCounter = 1;
  const game = {
    seed,
    turn: 1,
    phase: 'title', // title | play | win | loss
    winner: null,
    players: [
      makePlayer('You', 'Ember Warden', seed, false),
      makePlayer('Ashen Regent', 'Rival of the Ashen Isles', seed + 7919, true),
    ],
    log: [],
    selected: null, // uid of the player's creature chosen to attack
    targeting: null, // hand index of a spell waiting for a target
    message: '',
  };
  return game;
}

export function log(game, text) {
  game.log.unshift(text);
  if (game.log.length > 40) game.log.length = 40;
}

function dealOpeningHands(game) {
  for (const p of game.players) {
    for (let i = 0; i < 3; i++) drawCard(p);
  }
}

export function startGame(game) {
  game.phase = 'play';
  game.turn = 1;
  game.winner = null;
  game.log = [];
  game.selected = null;
  game.targeting = null;
  dealOpeningHands(game);
  beginTurn(game, 0);
  log(game, 'The duel begins. Your move, Warden.');
}

function beginTurn(game, who) {
  const p = game.players[who];
  // Mana grows with YOUR OWN turn count, not the global clock: the player
  // who moves second is not a mana behind for the whole duel.
  p.turnsTaken = (p.turnsTaken ?? 0) + 1;
  p.manaMax = Math.min(MAX_MANA, p.turnsTaken);
  p.mana = p.manaMax;
  for (const c of p.field) c.canAttack = true;
  const drawn = drawCard(p);
  if (drawn.kind === 'fatigue') {
    log(game, `${p.name} draws from an empty deck — fatigue ${drawn.amount}.`);
  } else if (drawn.kind === 'burned') {
    log(game, `${p.name}'s hand is full — ${drawn.card.def.name} is discarded.`);
  }
  checkEnd(game);
}

// The player whose turn it is: odd turns are yours, even turns the Regent's.
// (Turn 1 is yours; the counter only advances on End Turn.)
export function whoseTurn(game) {
  return game.turn % 2 === 1 ? 0 : 1;
}

export function endTurn(game) {
  if (game.phase !== 'play') return;
  game.selected = null;
  game.targeting = null;
  game.turn += 1;
  const who = whoseTurn(game);
  beginTurn(game, who);
  log(game, who === 0 ? 'Your turn.' : 'The Regent takes the table.');
}

function summon(game, who, def) {
  const p = game.players[who];
  const creature = {
    uid: nextUid(),
    cardId: def.id,
    def,
    atk: def.atk,
    hp: def.hp,
    maxHp: def.hp,
    canAttack: def.swift === true,
  };
  p.field.push(creature);
  return creature;
}

function damageCreature(game, who, uid, amount) {
  const p = game.players[who];
  const c = p.field.find((x) => x.uid === uid);
  if (!c) return false;
  c.hp -= amount;
  if (c.hp <= 0) {
    p.field = p.field.filter((x) => x.uid !== uid);
    log(game, `${c.def.name} is destroyed.`);
  }
  return true;
}

function damageHero(game, who, amount) {
  const p = game.players[who];
  p.hp -= amount;
  checkEnd(game);
}

export function checkEnd(game) {
  if (game.phase !== 'play') return;
  const [you, foe] = game.players;
  if (foe.hp <= 0 && you.hp <= 0) {
    game.phase = 'win';
    game.winner = 0;
    log(game, 'Both heroes fall — but the Ember Court stands with you.');
  } else if (foe.hp <= 0) {
    game.phase = 'win';
    game.winner = 0;
    log(game, 'The Ashen Regent falls. The Ember Court is yours.');
  } else if (you.hp <= 0) {
    game.phase = 'loss';
    game.winner = 1;
    log(game, 'Your flame gutters out. The Regent keeps the court… for now.');
  }
}

// Can this hand card be played right now? Returns a reason string or null.
export function playBlockReason(game, who, handIndex) {
  const p = game.players[who];
  const entry = p.hand[handIndex];
  if (!entry) return 'no such card';
  const def = entry.def;
  if (def.cost > p.mana) return `needs ${def.cost} mana`;
  if (def.kind === 'creature' && p.field.length >= FIELD_LIMIT) return 'field is full';
  return null;
}

// Play a card from a hand. For a damage spell pass targetUid ('hero' for the
// enemy hero, or a creature uid); other spells need no target.
export function playCard(game, who, handIndex, targetUid = null) {
  const p = game.players[who];
  const foe = game.players[1 - who];
  const reason = playBlockReason(game, who, handIndex);
  if (reason) return { ok: false, reason };
  const entry = p.hand[handIndex];
  const def = entry.def;
  p.hand.splice(handIndex, 1);
  p.mana -= def.cost;

  if (def.kind === 'creature') {
    const c = summon(game, who, def);
    log(game, `${p.name} summons ${def.name} (${def.atk}/${def.hp}).`);
    checkEnd(game);
    return { ok: true, creature: c };
  }

  const fx = def.effect;
  if (fx.type === 'damage') {
    if (targetUid === 'hero') {
      damageHero(game, 1 - who, fx.amount);
      log(game, `${p.name} hurls Fireball at ${foe.name} for ${fx.amount}.`);
    } else if (targetUid) {
      damageCreature(game, 1 - who, targetUid, fx.amount);
      log(game, `${p.name} hurls Fireball for ${fx.amount}.`);
    } else {
      return { ok: false, reason: 'choose a target' };
    }
  } else if (fx.type === 'heal') {
    const healed = Math.min(fx.amount, p.maxHp - p.hp);
    p.hp += healed;
    log(game, `${p.name} is healed for ${healed}.`);
  } else if (fx.type === 'draw') {
    for (let i = 0; i < fx.amount; i++) {
      const drawn = drawCard(p);
      if (drawn.kind === 'fatigue') log(game, `${p.name} draws from an empty deck — fatigue ${drawn.amount}.`);
      else if (drawn.kind === 'burned') log(game, `${p.name}'s hand is full — ${drawn.card.def.name} is discarded.`);
    }
    log(game, `${p.name} draws ${fx.amount} cards.`);
  } else if (fx.type === 'sweep') {
    const victims = foe.field.slice();
    for (const v of victims) damageCreature(game, 1 - who, v.uid, fx.amount);
    log(game, `Lightning Gale strikes every enemy creature for ${fx.amount}.`);
  }
  checkEnd(game);
  return { ok: true };
}

// Attack with one of your creatures. targetUid 'hero' hits the enemy hero;
// a creature uid hits that creature. Ward creatures must be attacked first.
export function attack(game, who, attackerUid, targetUid) {
  const p = game.players[who];
  const foe = game.players[1 - who];
  const a = p.field.find((c) => c.uid === attackerUid);
  if (!a) return { ok: false, reason: 'no such attacker' };
  if (!a.canAttack) return { ok: false, reason: 'already attacked' };
  if (game.phase !== 'play') return { ok: false, reason: 'duel is over' };

  if (targetUid === 'hero') {
    const wards = foe.field.filter((c) => c.def.ward);
    if (wards.length > 0) return { ok: false, reason: 'a Ward creature blocks the way' };
    damageHero(game, 1 - who, a.atk);
    log(game, `${a.def.name} strikes ${foe.name} for ${a.atk}.`);
  } else {
    const t = foe.field.find((c) => c.uid === targetUid);
    if (!t) return { ok: false, reason: 'no such target' };
    const wards = foe.field.filter((c) => c.def.ward);
    if (wards.length > 0 && !t.def.ward) return { ok: false, reason: 'a Ward creature blocks the way' };
    t.hp -= a.atk;
    a.hp -= t.atk;
    log(game, `${a.def.name} hits ${t.def.name} for ${a.atk}; ${t.def.name} hits back for ${t.atk}.`);
    if (t.hp <= 0) foe.field = foe.field.filter((c) => c.uid !== t.uid);
    if (a.hp <= 0) p.field = p.field.filter((c) => c.uid !== a.uid);
    if (t.hp <= 0) log(game, `${t.def.name} is destroyed.`);
    if (a.hp <= 0) log(game, `${a.def.name} is destroyed.`);
  }
  a.canAttack = false;
  checkEnd(game);
  return { ok: true };
}

// A deterministic mid-game position for screenshots and playtests:
// turn 5, both fields staffed, hands full, life totals already dented.
export function buildShotState(kind) {
  const game = createGame(20261123);
  game.phase = 'play';
  game.turn = 5;
  const [you, foe] = game.players;

  const put = (player, ids, canAttack) => {
    player.field = ids.map((id) => {
      const def = CARD_BY_ID[id];
      return { uid: nextUid(), cardId: id, def, atk: def.atk, hp: def.hp, maxHp: def.hp, canAttack };
    });
  };
  const hand = (player, ids) => {
    player.hand = ids.map((id) => ({ cardId: id, def: CARD_BY_ID[id] }));
  };

  you.manaMax = 5;
  you.mana = 3;
  you.hp = 16;
  foe.manaMax = 5;
  foe.mana = 0;
  foe.hp = 13;
  you.deck = you.deck.slice(0, 14);
  foe.deck = foe.deck.slice(0, 15);

  put(you, ['flame-knight', 'grove-sapling', 'cinder-hound'], true);
  put(foe, ['deep-serpent', 'reef-guardian'], false);
  hand(you, ['ash-dragon', 'fireball', 'storm-crow', 'healing-rain', 'tide-sprite', 'wild-growth']);
  hand(foe, ['ember-imp', 'thorn-wolf', 'gale-wisp']);
  // The table shows a fight already in progress.
  you.field[1].hp = 2;
  foe.field[0].hp = 3;

  game.log = [
    'The Regent summons Deep Serpent (5/4).',
    'Your Flame Knight strikes the Regent for 4.',
    'Reef Guardian holds the line — Ward.',
    'Your turn. 5 mana, 6 cards in hand.',
  ];
  if (kind === 'win') {
    foe.hp = 0;
    game.phase = 'win';
    game.winner = 0;
    game.log.unshift('Your board breaks through the Ward — lethal.');
  } else if (kind === 'loss') {
    you.hp = 0;
    game.phase = 'loss';
    game.winner = 1;
    game.log.unshift('The Regent’s board breaks through — lethal.');
  }
  return game;
}
