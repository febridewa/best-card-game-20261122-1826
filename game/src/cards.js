// Ember Court — the card catalogue.
// Every card in the game is defined here: its element, cost, stats and rules
// text. The deck builder in deck.js picks from this list; the rules engine in
// state.js reads the same definitions, so a card means the same thing
// everywhere in the game.

export const ELEMENTS = {
  ember: { name: 'Ember', glyph: '🔥', color: '#e8491d', dark: '#7a1e05', text: '#ffd9a0' },
  tide: { name: 'Tide', glyph: '💧', color: '#1d9be8', dark: '#063a5e', text: '#cfeeff' },
  grove: { name: 'Grove', glyph: '🌿', color: '#3fae5a', dark: '#0f3d1c', text: '#d6ffd9' },
  gale: { name: 'Gale', glyph: '🌪️', color: '#e8b81d', dark: '#5e4303', text: '#fff3c4' },
};

// kind: 'creature' fights on the table; 'spell' resolves and leaves.
// keywords: ward (must be attacked first), swift (attacks the turn it is played).
// spell.effect: damage (to any target), heal (own hero), draw, sweep (all enemy creatures).
export const CARDS = [
  { id: 'ember-imp', name: 'Ember Imp', element: 'ember', cost: 1, kind: 'creature', atk: 2, hp: 1, text: 'A spark with teeth.' },
  { id: 'tide-sprite', name: 'Tide Sprite', element: 'tide', cost: 1, kind: 'creature', atk: 1, hp: 2, text: 'Slips between the waves.' },
  { id: 'grove-sapling', name: 'Grove Sapling', element: 'grove', cost: 1, kind: 'creature', atk: 1, hp: 3, ward: true, text: 'Ward. Roots hold the line.' },
  { id: 'gale-wisp', name: 'Gale Wisp', element: 'gale', cost: 1, kind: 'creature', atk: 2, hp: 1, swift: true, text: 'Swift. Strikes the turn it arrives.' },
  { id: 'cinder-hound', name: 'Cinder Hound', element: 'ember', cost: 2, kind: 'creature', atk: 3, hp: 2, text: 'It hunts by the smell of smoke.' },
  { id: 'reef-guardian', name: 'Reef Guardian', element: 'tide', cost: 2, kind: 'creature', atk: 2, hp: 4, ward: true, text: 'Ward. The reef does not move.' },
  { id: 'thorn-wolf', name: 'Thorn Wolf', element: 'grove', cost: 2, kind: 'creature', atk: 3, hp: 3, text: 'Brambles run where it runs.' },
  { id: 'storm-crow', name: 'Storm Crow', element: 'gale', cost: 3, kind: 'creature', atk: 4, hp: 2, swift: true, text: 'Swift. Thunder on black wings.' },
  { id: 'flame-knight', name: 'Flame Knight', element: 'ember', cost: 3, kind: 'creature', atk: 4, hp: 3, text: 'Sworn to the Ember Court.' },
  { id: 'deep-serpent', name: 'Deep Serpent', element: 'tide', cost: 4, kind: 'creature', atk: 5, hp: 4, text: 'The tide keeps its old promises.' },
  { id: 'ancient-oak', name: 'Ancient Oak', element: 'grove', cost: 4, kind: 'creature', atk: 3, hp: 7, ward: true, text: 'Ward. Older than the court itself.' },
  { id: 'sky-roc', name: 'Sky Roc', element: 'gale', cost: 5, kind: 'creature', atk: 6, hp: 5, text: 'Its shadow is a weather front.' },
  { id: 'ash-dragon', name: 'Ash Dragon', element: 'ember', cost: 6, kind: 'creature', atk: 7, hp: 6, text: 'The court bows when it wakes.' },
  { id: 'tidal-leviathan', name: 'Tidal Leviathan', element: 'tide', cost: 6, kind: 'creature', atk: 6, hp: 7, ward: true, text: 'Ward. The sea, given a spine.' },
  { id: 'fireball', name: 'Fireball', element: 'ember', cost: 2, kind: 'spell', effect: { type: 'damage', amount: 3 }, text: 'Deal 3 damage to any target.' },
  { id: 'healing-rain', name: 'Healing Rain', element: 'tide', cost: 2, kind: 'spell', effect: { type: 'heal', amount: 5 }, text: 'Restore 5 life to your hero.' },
  { id: 'wild-growth', name: 'Wild Growth', element: 'grove', cost: 2, kind: 'spell', effect: { type: 'draw', amount: 2 }, text: 'Draw 2 cards.' },
  { id: 'lightning-gale', name: 'Lightning Gale', element: 'gale', cost: 4, kind: 'spell', effect: { type: 'sweep', amount: 2 }, text: 'Deal 2 damage to all enemy creatures.' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

// The 24-card deck recipe both duelists use. Two copies of the cheap
// openers, one or two of everything else, so the mana curve plays out
// across a 6–12 turn game instead of stalling on turn three.
export const DECK_RECIPE = [
  ['ember-imp', 2],
  ['tide-sprite', 2],
  ['grove-sapling', 2],
  ['gale-wisp', 2],
  ['cinder-hound', 2],
  ['reef-guardian', 1],
  ['thorn-wolf', 1],
  ['storm-crow', 1],
  ['flame-knight', 2],
  ['deep-serpent', 1],
  ['ancient-oak', 1],
  ['sky-roc', 1],
  ['ash-dragon', 1],
  ['tidal-leviathan', 1],
  ['fireball', 1],
  ['healing-rain', 1],
  ['wild-growth', 1],
  ['lightning-gale', 1],
];
