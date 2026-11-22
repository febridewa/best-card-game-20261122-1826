// Ember Court — the table renderer.
// Turns the game state into DOM. It never changes the rules: it reads
// state.js, builds the table, the hands, the HUD and the overlays, and
// reports clicks back to main.js through data attributes.

import { ELEMENTS } from './cards.js';
import { whoseTurn } from './state.js';

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// One card face: cost gem, element band with glyph, name, rules text and
// attack/health pips. Colours and glyphs carry the element, never text alone.
export function cardFace(def, opts = {}) {
  const e = def ? ELEMENTS[def.element] : null;
  const cls = ['card'];
  if (def) cls.push(`el-${def.element}`);
  if (opts.playable) cls.push('playable');
  if (opts.selected) cls.push('selected');
  if (opts.targetable) cls.push('targetable');
  if (opts.faceDown) cls.push('facedown');
  const keywords = def ? [def.ward ? 'Ward' : '', def.swift ? 'Swift' : ''].filter(Boolean).join(' · ') : '';
  const stats = !def
    ? ''
    : def.kind === 'creature'
      ? `<span class="pip atk" title="Attack">${def.atk}</span><span class="pip hp" title="Health">${def.hp}</span>`
      : `<span class="pip spell-pip">✦</span>`;
  const body = opts.faceDown
    ? `<div class="card-back"><span class="back-glyph">🔥</span><span class="back-word">EMBER<br>COURT</span></div>`
    : `
      <div class="cost">${def.cost}</div>
      <div class="art" style="background:linear-gradient(150deg, ${e.color}, ${e.dark})">
        <span class="glyph">${e.glyph}</span>
      </div>
      <div class="cname">${esc(def.name)}</div>
      <div class="ckind">${def.kind === 'creature' ? 'Creature' : 'Spell'} · ${e.name}${keywords ? ` · ${keywords}` : ''}</div>
      <div class="ctext">${esc(def.text)}</div>
      <div class="pips">${stats}</div>`;
  const node = el(`<div class="${cls.join(' ')}" ${opts.attrs || ''}>${body}</div>`);
  return node;
}

function manaPips(p) {
  let out = '';
  for (let i = 0; i < 10; i++) {
    out += `<span class="mana-pip ${i < p.mana ? 'full' : ''} ${i < p.manaMax ? '' : 'locked'}">◆</span>`;
  }
  return out;
}

function hpBar(p) {
  const pct = Math.max(0, Math.round((p.hp / p.maxHp) * 100));
  const low = pct <= 33 ? ' low' : '';
  return `<div class="hpbar${low}"><div class="hpfill" style="width:${pct}%"></div><span class="hptext">❤ ${p.hp} / ${p.maxHp}</span></div>`;
}

function heroBlock(game, who, interactive) {
  const p = game.players[who];
  const isActive = game.phase === 'play' && whoseTurn(game) === who;
  const node = el(`
    <div class="hero ${who === 0 ? 'hero-you' : 'hero-foe'} ${isActive ? 'active' : ''}">
      <div class="hero-face">${who === 0 ? '🔥' : '👑'}</div>
      <div class="hero-info">
        <div class="hero-name">${esc(p.name)} <span class="hero-title">${esc(p.title)}</span></div>
        ${hpBar(p)}
        <div class="hero-meta">Mana ${manaPips(p)} <span class="deck-count">🂠 Deck ${p.deck.length} · Fatigue ${p.fatigue}</span></div>
      </div>
      ${who === 1 && interactive ? `<button class="hero-target" data-action="target-hero" title="Attack the Regent">⚔</button>` : ''}
    </div>`);
  return node;
}

function fieldRow(game, who, interactive) {
  const p = game.players[who];
  const row = el(`<div class="field ${who === 0 ? 'field-you' : 'field-foe'}"></div>`);
  if (p.field.length === 0) {
    row.appendChild(el(`<div class="field-empty">— empty field —</div>`));
    return row;
  }
  for (const c of p.field) {
    const def = c.def;
    const face = cardFace({ ...def, atk: c.atk, hp: c.hp }, {
      selected: game.selected === c.uid,
      targetable: interactive && who === 1 && game.selected,
      attrs: interactive && who === 0
        ? `data-action="select-creature" data-uid="${c.uid}"`
        : interactive && who === 1
          ? `data-action="target-creature" data-uid="${c.uid}"`
          : '',
    });
    face.classList.add('on-field');
    if (who === 0 && !c.canAttack) face.classList.add('tired');
    if (who === 0 && c.canAttack) face.classList.add('ready');
    row.appendChild(face);
  }
  return row;
}

function handRow(game, interactive) {
  const p = game.players[0];
  const row = el(`<div class="hand"></div>`);
  p.hand.forEach((entry, i) => {
    const def = entry.def;
    const playable = interactive && game.phase === 'play' && whoseTurn(game) === 0 && def.cost <= p.mana;
    const face = cardFace(def, {
      playable,
      selected: game.targeting === i,
      attrs: interactive ? `data-action="play-card" data-index="${i}"` : '',
    });
    face.style.setProperty('--i', i);
    row.appendChild(face);
  });
  return row;
}

function foeHandRow(game) {
  const p = game.players[1];
  const row = el(`<div class="hand foe-hand"></div>`);
  for (let i = 0; i < p.hand.length; i++) {
    row.appendChild(cardFace(null, { faceDown: true }));
  }
  return row;
}

// Rebuild the whole table from the state. Cheap and simple: the table is
// small, and a full re-render keeps every derived display honest.
export function renderTable(game, mount) {
  const interactive = game.phase === 'play' && whoseTurn(game) === 0;
  mount.innerHTML = '';
  const table = el('<div class="table"></div>');

  const foeZone = el('<div class="zone zone-foe"></div>');
  foeZone.appendChild(heroBlock(game, 1, interactive));
  foeZone.appendChild(foeHandRow(game));
  foeZone.appendChild(fieldRow(game, 1, interactive));
  table.appendChild(foeZone);

  const mid = el('<div class="midbar"></div>');
  const turnLabel = el(`<div class="turn-label">Turn ${game.turn} · ${interactive ? 'Your move' : game.phase === 'play' ? 'The Regent is thinking…' : 'Duel over'}</div>`);
  mid.appendChild(turnLabel);
  const endBtn = el(`<button class="end-turn" data-action="end-turn" ${interactive ? '' : 'disabled'}>End Turn ⏎</button>`);
  mid.appendChild(endBtn);
  const hint = el(`<div class="hint">${game.message || (game.targeting !== null ? 'Choose a target for your spell — click an enemy creature or the Regent. Esc cancels.' : game.selected ? 'Choose a target — an enemy creature, or the Regent. Esc cancels.' : 'Click a card to play it · click a creature, then a target, to attack · 1–7 play cards · Space ends turn')}</div>`);
  mid.appendChild(hint);
  table.appendChild(mid);

  const youZone = el('<div class="zone zone-you"></div>');
  youZone.appendChild(fieldRow(game, 0, interactive));
  youZone.appendChild(handRow(game, interactive));
  youZone.appendChild(heroBlock(game, 0, false));
  table.appendChild(youZone);

  const logEl = el('<div class="log"></div>');
  for (const line of game.log.slice(0, 6)) {
    logEl.appendChild(el(`<div class="log-line">${esc(line)}</div>`));
  }
  table.appendChild(logEl);

  mount.appendChild(table);
}

// Title screen, win screen and loss screen are overlays on the table.
export function renderOverlay(game, mount) {
  mount.innerHTML = '';
  if (game.phase === 'title') {
    mount.appendChild(el(`
      <div class="overlay title-screen">
        <div class="title-kicker">A TURN-BASED CARD DUEL · 20 LIFE · MANA THAT GROWS</div>
        <h1>EMBER<br>COURT</h1>
        <div class="title-sub">Duel of the Ashen Isles</div>
        <p class="title-blurb">You are the Ember Warden. The Ashen Regent holds the court and your
        flame is the price of it. Build your board, spend your mana, break
        their Ward — and bring their life to zero before yours burns out.</p>
        <div class="title-buttons">
          <button class="btn-primary" data-action="start-game">▶ &nbsp;Play the duel</button>
          <button class="btn-ghost" data-action="show-help">How to play</button>
        </div>
        <div class="title-foot">18 original cards · 4 elements · keyboard + mouse · plays offline</div>
      </div>`));
  } else if (game.phase === 'win' || game.phase === 'loss') {
    const won = game.phase === 'win';
    mount.appendChild(el(`
      <div class="overlay ${won ? 'win-screen' : 'loss-screen'}">
        <div class="end-kicker">${won ? 'THE COURT IS YOURS' : 'THE FLAME GUTTERS OUT'}</div>
        <h1>${won ? 'VICTORY' : 'DEFEAT'}</h1>
        <p class="end-blurb">${won
          ? 'The Ashen Regent falls. The Ember Court burns bright again — your name is sung in the halls tonight.'
          : 'The Regent keeps the court… for now. Shuffle the deck, learn the board, and challenge them again.'}</p>
        <div class="end-score">Final life — You ${Math.max(0, game.players[0].hp)} · Regent ${Math.max(0, game.players[1].hp)} · ${game.turn} turns</div>
        <div class="title-buttons">
          <button class="btn-primary" data-action="start-game">↻ &nbsp;Play again</button>
        </div>
      </div>`));
  }
}

export function renderHelp(mount, visible) {
  if (!visible) {
    mount.innerHTML = '';
    return;
  }
  mount.appendChild(el(`
    <div class="overlay help-screen">
      <h2>HOW TO PLAY</h2>
      <div class="help-cols">
        <div>
          <h3>Goal</h3>
          <p>Reduce the Ashen Regent from 20 life to 0 before they do the same to you.</p>
          <h3>Each turn</h3>
          <p>Mana grows by 1 (up to 10) and refills. Draw a card. Play creatures and
          spells from your hand, then attack with your creatures.</p>
          <h3>Creatures</h3>
          <p>Cost mana to summon. Attack once per turn; a creature cannot attack
          the turn it arrives unless it is <b>Swift</b>. <b>Ward</b> creatures must
          be attacked before anything else.</p>
        </div>
        <div>
          <h3>Spells</h3>
          <p><b>Fireball</b> — 3 damage to any target. <b>Healing Rain</b> — restore 5 life.
          <b>Wild Growth</b> — draw 2. <b>Lightning Gale</b> — 2 damage to all enemy creatures.</p>
          <h3>Fatigue</h3>
          <p>An empty deck hurts: drawing from it deals 1, then 2, then 3… damage to you.</p>
          <h3>Controls</h3>
          <p>Mouse: click to play, select and target. Keys: <b>1–7</b> play a card,
          <b>Space</b> ends the turn, <b>Enter</b> starts or restarts, <b>Esc</b> cancels,
          <b>M</b> mutes.</p>
        </div>
      </div>
      <div class="title-buttons"><button class="btn-primary" data-action="hide-help">Got it — back to the table</button></div>
    </div>`));
}
