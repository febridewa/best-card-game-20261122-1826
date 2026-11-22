// Ember Court — boot, input and the duel's clock.
// Wires the rules engine (state.js) to the table (render.js) and the
// Regent's brain (ai.js): clicks and keys become plays and attacks, the
// End Turn button hands the table to the AI, and the AI's moves play out
// one at a time so the player can watch them land.
//
// Screenshot states: ?shot=start|play|win|loss renders a fixed, seeded
// position of the game — the same pixels every time — so the entry's
// screenshots are real renders of this code and nothing else.

import { createGame, startGame, endTurn, playCard, attack, whoseTurn, buildShotState, checkEnd } from './state.js';
import { renderTable, renderOverlay, renderHelp } from './render.js';
import { planAiAction } from './ai.js';
import { sfx, setMuted, isMuted } from './audio.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const SHOTS = new Set(['start', 'play', 'win', 'loss']);

let game;
let helpVisible = false;
let aiTimer = null;

const tableMount = document.getElementById('table');
const overlayMount = document.getElementById('overlay');
const helpMount = document.getElementById('help');

function render() {
  renderTable(game, tableMount);
  renderOverlay(game, overlayMount);
  renderHelp(helpMount, helpVisible);
  document.body.classList.toggle('targeting', game.targeting !== null || game.selected !== null);
}

function stopAi() {
  if (aiTimer !== null) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }
}

// One AI step every 650 ms: play or attack, re-render, then schedule the
// next step until the planner says the Regent is done.
function runAiTurn() {
  stopAi();
  if (game.phase !== 'play' || whoseTurn(game) !== 1) return;
  const step = () => {
    if (game.phase !== 'play' || whoseTurn(game) !== 1) return;
    const action = planAiAction(game);
    if (!action) {
      endTurn(game);
      sfx.turn();
      render();
      if (game.phase !== 'play') finishDuel();
      return;
    }
    if (action.type === 'play') {
      const res = playCard(game, 1, action.handIndex, action.target ?? null);
      if (!res.ok) {
        // The plan went stale (a full field, a spent card): hand the turn over.
        endTurn(game);
        render();
        return;
      }
      sfx.playCard();
    } else if (action.type === 'attack') {
      const res = attack(game, 1, action.attacker, action.target);
      if (!res.ok) {
        endTurn(game);
        render();
        return;
      }
      sfx.hit();
    }
    render();
    if (game.phase !== 'play') {
      finishDuel();
      return;
    }
    aiTimer = setTimeout(step, 650);
  };
  aiTimer = setTimeout(step, 700);
}

function finishDuel() {
  stopAi();
  if (game.phase === 'win') sfx.win();
  else if (game.phase === 'loss') sfx.lose();
  render();
}

function startDuel() {
  stopAi();
  helpVisible = false;
  game = createGame(20261123 + Math.floor(Math.random() * 100000));
  startGame(game);
  sfx.turn();
  render();
}

function maybeRunAi() {
  if (game.phase === 'play' && whoseTurn(game) === 1) runAiTurn();
}

// --- input ---------------------------------------------------------------

function onPlayCard(index) {
  if (game.phase !== 'play' || whoseTurn(game) !== 0) return;
  const entry = game.players[0].hand[index];
  if (!entry) return;
  if (entry.def.kind === 'spell' && entry.def.effect.type === 'damage') {
    game.targeting = index;
    game.selected = null;
    sfx.click();
    render();
    return;
  }
  const res = playCard(game, 0, index);
  if (res.ok) {
    sfx.playCard();
    if (entry.def.effect && entry.def.effect.type === 'heal') sfx.heal();
    if (entry.def.effect && entry.def.effect.type === 'draw') sfx.draw();
  } else {
    game.message = res.reason;
  }
  game.targeting = null;
  render();
  checkEnd(game);
  if (game.phase !== 'play') finishDuel();
}

function onSelectCreature(uid) {
  if (game.phase !== 'play' || whoseTurn(game) !== 0) return;
  const c = game.players[0].field.find((x) => x.uid === uid);
  if (!c || !c.canAttack) return;
  game.selected = game.selected === uid ? null : uid;
  game.targeting = null;
  sfx.click();
  render();
}

function onTarget(targetUid) {
  if (game.phase !== 'play' || whoseTurn(game) !== 0) return;
  if (game.targeting !== null) {
    const idx = game.targeting;
    game.targeting = null;
    const res = playCard(game, 0, idx, targetUid);
    if (res.ok) sfx.playCard();
    else game.message = res.reason;
    render();
    if (game.phase !== 'play') finishDuel();
    return;
  }
  if (game.selected) {
    const uid = game.selected;
    game.selected = null;
    const res = attack(game, 0, uid, targetUid);
    if (res.ok) sfx.hit();
    else game.message = res.reason;
    render();
    if (game.phase !== 'play') finishDuel();
  }
}

document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-action]');
  if (!t) {
    // Clicking empty table space cancels a pending selection.
    if (game.selected !== null || game.targeting !== null) {
      game.selected = null;
      game.targeting = null;
      render();
    }
    return;
  }
  const action = t.dataset.action;
  if (action === 'start-game') {
    startDuel();
  } else if (action === 'show-help') {
    helpVisible = true;
    sfx.click();
    render();
  } else if (action === 'hide-help') {
    helpVisible = false;
    sfx.click();
    render();
  } else if (action === 'end-turn') {
    if (game.phase === 'play' && whoseTurn(game) === 0) {
      sfx.click();
      endTurn(game);
      render();
      maybeRunAi();
    }
  } else if (action === 'play-card') {
    onPlayCard(Number(t.dataset.index));
  } else if (action === 'select-creature') {
    onSelectCreature(t.dataset.uid);
  } else if (action === 'target-creature') {
    onTarget(t.dataset.uid);
  } else if (action === 'target-hero') {
    onTarget('hero');
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    if (game.phase === 'title' || game.phase === 'win' || game.phase === 'loss') startDuel();
    return;
  }
  if (ev.key === 'Escape') {
    game.selected = null;
    game.targeting = null;
    helpVisible = false;
    render();
    return;
  }
  if (ev.key === 'm' || ev.key === 'M') {
    setMuted(!isMuted());
    return;
  }
  if (game.phase !== 'play' || whoseTurn(game) !== 0) return;
  if (ev.key === ' ' || ev.key === 'Spacebar') {
    ev.preventDefault();
    endTurn(game);
    render();
    maybeRunAi();
    return;
  }
  const n = Number(ev.key);
  if (n >= 1 && n <= 7) onPlayCard(n - 1);
});

// --- boot ----------------------------------------------------------------

if (shot && SHOTS.has(shot)) {
  // Deterministic screenshot position: no timers, no AI, no randomness.
  document.body.classList.add('shot-mode');
  if (shot === 'start') {
    game = createGame(20261123);
  } else {
    game = buildShotState(shot);
  }
  render();
} else {
  game = createGame(20261123);
  render();
}
