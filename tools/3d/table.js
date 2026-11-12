// The three pinball machines (PUFF PUFF, VIRUS, CANDY B), real size, built in code from layout_<name>.json (the same numbers the physics uses). No third-party art.
// Each machine has its own cabinet: PUFF PUFF a rounded pearl-white body, VIRUS a faceted graphite lab unit, CANDY B a bubbly sweet-shop body.
// Cabinet space: origin on the floor under its middle, +z toward the player, +y up. The playfield is a group tilted 6.5°;
// inside it a point of the table (x across, y up the table, h above the wood) is (x − W/2, h, −y).
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- themes. setTheme() is called before anything is built ----------
function cloudShape(c, x, y, s, a = 1) { c.save(); c.globalAlpha = a; c.fillStyle = '#ffffff'; for (const [dx, dy, r] of [[-1.1, 0.2, 0.7], [-0.4, -0.25, 0.95], [0.45, -0.1, 0.85], [1.15, 0.25, 0.6], [0, 0.35, 0.9]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); c.fill(); } c.restore(); }
/** A virus: a round body with knobbed spikes all round and a darker middle. */
function germShape(c, x, y, s, a = 1) { c.save(); c.globalAlpha = a; c.translate(x, y); c.strokeStyle = '#b6ff3a'; c.fillStyle = '#b6ff3a'; c.lineWidth = s * 0.16; c.lineCap = 'round';
  for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(t) * s * 0.6, Math.sin(t) * s * 0.6); c.lineTo(Math.cos(t) * s * 1.12, Math.sin(t) * s * 1.12); c.stroke(); c.beginPath(); c.arc(Math.cos(t) * s * 1.2, Math.sin(t) * s * 1.2, s * 0.15, 0, 7); c.fill(); }
  const g = c.createRadialGradient(-s * 0.2, -s * 0.2, s * 0.1, 0, 0, s * 0.8); g.addColorStop(0, '#e6ffb0'); g.addColorStop(0.6, '#7dff3a'); g.addColorStop(1, '#1f8a2a'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, s * 0.8, 0, 7); c.fill();
  c.fillStyle = 'rgba(6,48,28,0.55)'; for (const [dx, dy, r] of [[-0.25, -0.1, 0.2], [0.25, 0.2, 0.16], [0.1, -0.35, 0.11]]) { c.beginPath(); c.arc(dx * s, dy * s, r * s, 0, 7); c.fill(); } c.restore(); }
/** A lollipop head: a swirl of two colours with a white rim. */
function candyShape(c, x, y, s, a = 1) { c.save(); c.globalAlpha = a; c.translate(x, y); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, s, 0, 7); c.fill();
  for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ff4f9a' : '#fff3c4'; c.beginPath(); c.moveTo(0, 0); for (let k = 0; k <= 12; k++) { const r = s * 0.9 * k / 12, t = i * Math.PI / 4 + k / 12 * 1.5; c.lineTo(Math.cos(t) * r, Math.sin(t) * r); } for (let k = 12; k >= 0; k--) { const r = s * 0.9 * k / 12, t = (i + 1) * Math.PI / 4 + k / 12 * 1.5; c.lineTo(Math.cos(t) * r, Math.sin(t) * r); } c.closePath(); c.fill(); }
  c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = s * 0.1; c.beginPath(); c.arc(0, 0, s * 0.92, 0, 7); c.stroke(); c.restore(); }
export const THEMES = {
  puff: { words: ['PUFF', 'PUFF'], labels: ['P', 'U', 'F', 'F'], multi: 'MULTIBALL', saucer: 'MYSTERY', rule: 'SPELL  P · U · F · F', motif: cloudShape, sky: ['#1a0b3d', '#3b1a78', '#7a2fb0', '#ff5fa8'], a: '#22e0ff', b: '#ff3fa0', y: '#ffe14a', m: '#5dffb0', body: '#f4f1fb', ink: '#2a0a55', mid: '#7a2fb0', inkDeep: '#12052e',
    midY: 0.50, midLights: [[-0.06, 0], [0.06, 0], [0, 0.05]], ruleDy: -0.048, laneText: true,
    how: ['3 balls · hold and let go to shoot', 'Light the 3 top lanes: bonus ×', 'Spell P·U·F·F: 2-ball multiball', 'MYSTERY saucer · jackpot in multiball', 'Spinner 30 turns: kickback'],
    scores: ['Bumper 100 · super 300', 'Letter 250 · all four 5,000', 'Skill shot 2,500', 'Jackpot 20,000', 'Extra ball at 100,000'] },
  virus: { words: ['VIRUS'], labels: ['DNA', 'DNA'], multi: 'OUTBREAK', saucer: '', rule: 'INFECT ALL 5 CELLS', motif: germShape, sky: ['#020a06', '#052415', '#0c5a30', '#5fd02a'], a: '#7dff3a', b: '#ff3a6e', y: '#e8ff4a', m: '#3affd0', body: '#1b1f1d', ink: '#03200f', mid: '#0f6b3a', inkDeep: '#010805',
    midY: 0.44, midLights: [[-0.06, 0], [0.06, 0], [0, -0.05]], ruleDy: 0.036, laneText: false,
    how: ['100 seconds on the clock · no ball count', 'Hit a cell: infected, +2 seconds', 'All 5 cells: OUTBREAK, 3 balls, + time', 'Each outbreak the virus mutates', 'A drain costs 5 seconds'],
    scores: ['Cell 500 × wave', 'Outbreak 5,000 × wave', 'Both DNA targets: kickback', 'Skill shot 2,500', 'Everything ×2 in multiball'] },
  candy: { words: ['CANDY B'], labels: ['CANE', 'CANE'], multi: 'CANDY STORM', saucer: 'JAR', rule: '', motif: candyShape, sky: ['#5a0f40', '#a81f78', '#ff5fa8', '#ffb36b'], a: '#7dfff0', b: '#ffd23a', y: '#fff06a', m: '#9dff8a', body: '#ff8fc8', ink: '#4a0c36', mid: '#c2278a', inkDeep: '#2a061e',
    midY: 0.49, midLights: [[-0.06, 0], [0.06, 0], [0, -0.05]], ruleDy: 0, laneText: true,
    how: ['3 balls · hold and let go to shoot', 'Knock down all 5 sweets: next level', 'Every level: 20 s SUGAR RUSH, all ×2', 'Sweets are worth more each level', 'The JAR: a mystery award'],
    scores: ['Sweet 500 × level', 'Row 3,000 × level', 'Bumper 100 · super 300', 'Skill shot 2,500', 'Extra ball at 100,000'] },
};
let TH = THEMES.puff, NAME = 'puff', SKY = TH.sky, CYAN = TH.a, PINK = TH.b, YELLOW = TH.y, MINT = TH.m;
export function setTheme(name) { NAME = name; TH = THEMES[name]; SKY = TH.sky; CYAN = TH.a; PINK = TH.b; YELLOW = TH.y; MINT = TH.m; }
const H = (col) => new (globalThis.__THREE.Color)(col).getHex();
const cloud = (c, x, y, s, a = 1) => TH.motif(c, x, y, s * (NAME === 'puff' ? 1 : 0.8), a);
const glow = (THREE, name, color, strength = 1.0) => new THREE.MeshStandardMaterial({ name, color: new THREE.Color(color).multiplyScalar(0.15), emissive: new THREE.Color(color), emissiveIntensity: strength, roughness: 0.4 });
const lit = (THREE, name, tex, strength = 1.0) => new THREE.MeshStandardMaterial({ name, map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: strength, roughness: 0.5 });

/** The tilted group everything on the playfield hangs in. */
export function field(THREE, D, name = 'Field') { globalThis.__THREE = THREE; const g = new THREE.Group(); g.name = name; g.position.set(0, D.y0, D.z0); g.rotation.x = THREE.MathUtils.degToRad(D.tilt); return g; }
const at = (D, x, y, h = 0) => [x - D.W / 2, h, -y];

// ---------- art ----------
function logo(c, x, y, size, two = true) {
  const W = TH.words; const one = W.length === 1; if (!one) size *= Math.max(W[0].length, W[1].length) > 4 ? 0.8 : 1; else size *= 1.05; if (!two && !one && (W[0] + W[1]).length > 9) size *= 0.86;
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.font = `900 ${size}px Arial Rounded MT Bold, Arial Black, Arial`;
  if (one) while (c.measureText(W[0]).width > c.canvas.width * 0.86 && size > 20) { size *= 0.94; c.font = `900 ${size}px Arial Rounded MT Bold, Arial Black, Arial`; }
  const line = (t, yy, col) => { c.lineWidth = size * 0.16; c.strokeStyle = TH.ink; c.strokeText(t, x, yy); c.shadowColor = col; c.shadowBlur = size * 0.35; c.fillStyle = '#ffffff'; c.fillText(t, x, yy); c.shadowBlur = 0; c.lineWidth = size * 0.03; c.strokeStyle = col; c.strokeText(t, x, yy); };
  if (one) line(W[0], y, CYAN); else if (two) { line(W[0], y - size * 0.52, PINK); line(W[1], y + size * 0.52, CYAN); } else line(W[0] + ' ' + W[1], y, PINK);
  c.restore();
}
function sky(c, w, h, stars = 160, seed = 5) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, SKY[0]); g.addColorStop(0.45, SKY[1]); g.addColorStop(0.8, SKY[2]); g.addColorStop(1, SKY[3]); c.fillStyle = g; c.fillRect(0, 0, w, h);
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  if (NAME === 'virus') hexGrid(c, w, h, Math.max(26, w / 40));
  if (NAME === 'candy') stripes(c, w, h, Math.max(40, w / 18));
  for (let i = 0; i < stars; i++) { const x = rnd() * w, y = rnd() * h * 0.8, r = 0.6 + rnd() * 2.2;
    if (NAME === 'candy') { c.save(); c.translate(x, y); c.rotate(rnd() * 3); c.fillStyle = ['#ffffff', '#7dfff0', '#ffd23a', '#9dff8a'][i % 4]; c.globalAlpha = 0.75; c.fillRect(-r * 2.4, -r * 0.7, r * 4.8, r * 1.4); c.restore(); }
    else { c.fillStyle = NAME === 'virus' ? `rgba(160,255,120,${0.25 + rnd() * 0.5})` : `rgba(255,255,255,${0.35 + rnd() * 0.6})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }
  return rnd;
}
/** VIRUS: a faint glowing honeycomb, like a microscope slide. */
function hexGrid(c, w, h, r) { c.save(); c.strokeStyle = 'rgba(125,255,58,0.13)'; c.lineWidth = Math.max(1.5, r / 14); const dx = r * Math.sqrt(3), dy = r * 1.5;
  for (let row = -1, y = 0; y < h + r; row++, y = row * dy) for (let x = (row % 2 ? dx / 2 : 0) - dx; x < w + dx; x += dx) { c.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.stroke(); } c.restore(); }
/** CANDY B: soft diagonal candy stripes. */
function stripes(c, w, h, s) { c.save(); c.fillStyle = 'rgba(255,255,255,0.10)'; for (let x = -h; x < w + h; x += s * 2) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + s, 0); c.lineTo(x + s + h * 0.6, h); c.lineTo(x + h * 0.6, h); c.fill(); } c.restore(); }

/** A soft dark patch on the playfield print where a part stands: what makes parts look planted instead of pasted on. */
function contact(c, x, y, r, a = 0.5) { const g = c.createRadialGradient(x, y, r * 0.35, x, y, r); g.addColorStop(0, `rgba(4,2,10,${a})`); g.addColorStop(1, 'rgba(4,2,10,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
function insert(c, x, y, r, col = 'rgba(255,255,255,0.20)') { const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, col); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = 'rgba(4,2,10,0.8)'; c.lineWidth = r * 0.16; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = r * 0.06; c.beginPath(); c.arc(x, y, r * 0.9, 0, 7); c.stroke(); }
function star(c, x, y, r, col) { c.save(); c.translate(x, y); c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); c.fill(); c.restore(); }
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

/** The printed playfield. Canvas top = the far end of the table. */
function playfieldTexture(THREE, kit, D) {
  const PW = 2048, PH = Math.round(PW * D.L / D.W), S = PW / D.W, px = (x) => x * S, py = (y) => (D.L - y) * S;
  const text = (t, x, y, size, col = '#ffffff', weight = 900) => { c0.fillStyle = col; c0.font = `${weight} ${size}px Arial Black, Arial`; c0.textAlign = 'center'; c0.textBaseline = 'middle'; c0.shadowColor = TH.ink; c0.shadowBlur = 8; c0.fillText(t, x, y); c0.shadowBlur = 0; };
  let c0;
  const tex = kit.canvasTexture(PW, PH, (c, w, h) => { c0 = c;
    const rnd = sky(c, w, h, 520);
    for (let i = 0; i < 14; i++) cloud(c, rnd() * w, h * (0.12 + 0.78 * rnd()), 50 + rnd() * 90, 0.10 + rnd() * 0.16);
    // streaks across the upper field
    c.lineCap = 'round'; for (const [x, y, l] of [[0.1, 0.97, 0.09], [0.33, 0.93, 0.07]]) { const g = c.createLinearGradient(px(x), py(y), px(x + l), py(y - l * 0.5)); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 6; c.beginPath(); c.moveTo(px(x), py(y)); c.lineTo(px(x + l), py(y - l * 0.5)); c.stroke(); star(c, px(x), py(y), 13, '#ffffff'); }
    // the shooter lane: a darker strip with chevrons
    c.fillStyle = 'rgba(4,2,10,0.6)'; c.fillRect(px(D.fieldR), py(0.80), px(D.W - D.fieldR), py(0) - py(0.80));
    c.strokeStyle = YELLOW; c.lineWidth = 9; c.lineJoin = 'round'; for (let y = 0.14; y < 0.78; y += 0.06) { c.globalAlpha = 0.35 + 0.65 * (y / 0.78); c.beginPath(); c.moveTo(px(D.fieldR + 0.009), py(y)); c.lineTo(px((D.fieldR + D.W) / 2), py(y + 0.022)); c.lineTo(px(D.W - 0.009), py(y)); c.stroke(); } c.globalAlpha = 1;
    // bumpers: a starburst and a ring under each (VIRUS: each one is a cell in a membrane)
    for (const [x, y] of D.bumpers) {
      const g = c.createRadialGradient(px(x), py(y), 8, px(x), py(y), (D.bumperR + 0.05) * S); g.addColorStop(0, 'rgba(255,255,255,0.6)'); g.addColorStop(0.5, rgba(PINK, 0.4)); g.addColorStop(1, rgba(PINK, 0)); c.fillStyle = g; c.beginPath(); c.arc(px(x), py(y), (D.bumperR + 0.05) * S, 0, 7); c.fill();
      if (D.cells) { c.strokeStyle = rgba(CYAN, 0.8); c.lineWidth = 7; c.setLineDash([16, 10]); c.beginPath(); c.arc(px(x), py(y), (D.bumperR + 0.02) * S, 0, 7); c.stroke(); c.setLineDash([]); }
      else { c.save(); c.translate(px(x), py(y)); c.fillStyle = rgba(YELLOW, 0.5); for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo((D.bumperR + 0.006) * S, -7); c.lineTo((D.bumperR + 0.032) * S, 0); c.lineTo((D.bumperR + 0.006) * S, 7); c.fill(); } c.restore(); }
      c.strokeStyle = CYAN; c.lineWidth = 9; c.beginPath(); c.arc(px(x), py(y), (D.bumperR + 0.017) * S, 0, 7); c.stroke(); contact(c, px(x), py(y), (D.bumperR + 0.013) * S, 0.75); }
    if (D.cells) text('CELLS', px(D.cx), py(0.70), 44, CYAN);
    // the saucer (PUFF: the mystery cloud, CANDY B: the jar)
    if (D.saucer) { const [x, y] = D.saucer; cloud(c, px(x), py(y), 62, 0.95); c.fillStyle = TH.inkDeep; c.beginPath(); c.arc(px(x), py(y), D.saucerR * S, 0, 7); c.fill(); text(TH.saucer, px(x + (x < D.cx - 0.01 ? 0.012 : 0)), py(y - 0.052), 40, YELLOW); }
    // top lanes
    D.lanes.forEach((x) => insert(c, px(x), py((D.laneY0 + D.laneY1) / 2 - 0.045), 0.014 * S));
    if (TH.laneText) text('LIGHT ALL 3  ·  BONUS ×', px(D.cx), py(D.laneY0 - 0.088), 40);
    for (const gx of D.laneGuides) { c.fillStyle = 'rgba(4,2,10,0.45)'; c.beginPath(); c.roundRect(px(gx) - 13, py(D.laneY1) - 6, 30, (D.laneY1 - D.laneY0) * S + 22, 14); c.fill(); }
    // inserts beside the standup targets
    D.targets.forEach((t, i) => { const x = t[0] + t[2] * 0.045, y = t[1]; insert(c, px(x), py(y), 0.017 * S, t[2] > 0 ? rgba(CYAN, 0.3) : rgba(PINK, 0.3));
      const l = TH.labels[i] || ''; c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = `900 ${l.length > 1 ? 30 : 66}px Arial Black, Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(l, px(x), py(y) + 4); contact(c, px(t[0]), py(t[1]), 0.03 * S, 0.5); });
    // CANDY B: the row of sweets (drop targets), each with its insert in front
    if (D.drops.length) { for (const [x, y] of D.drops) { contact(c, px(x), py(y + 0.004), 0.03 * S, 0.6); insert(c, px(x), py(y - 0.028), 0.009 * S, rgba(CYAN, 0.35)); }
      text('SWEETS  ·  LEVEL UP', px(D.cx), py(D.drops[0][1] + 0.034), 34, YELLOW);
      text('SUGAR RUSH ×2', px(D.cx), py(0.628), 40, '#ffffff'); }
    // the spinner lane and the kickback
    if (D.spinner) { const [x0, x1, y] = D.spinner; c.fillStyle = MINT; c.font = '900 30px Arial'; c.textAlign = 'center'; c.save(); c.translate(px((x0 + x1) / 2), py(y - 0.06)); c.rotate(-Math.PI / 2); c.fillText('SPINNER  100', 0, 0); c.restore();
      c.fillStyle = MINT; for (const yy of [y + 0.05, y + 0.08]) { c.beginPath(); c.moveTo(px((x0 + x1) / 2), py(yy + 0.018)); c.lineTo(px((x0 + x1) / 2 + 0.012), py(yy)); c.lineTo(px((x0 + x1) / 2 - 0.012), py(yy)); c.fill(); } }
    insert(c, px(D.kickback[0]), py(D.kickback[1] + 0.05), 0.0125 * S, rgba(YELLOW, 0.3));
    // the name, big, in the middle of the table
    logo(c, px(D.cx), py(0.287), 190);
    const my = TH.midY; cloud(c, px(D.cx), py(my), 88, 0.92);
    c.fillStyle = NAME === 'puff' ? TH.mid : '#ffffff'; c.strokeStyle = TH.ink; c.lineWidth = 8; c.font = `900 ${TH.multi.length > 9 ? 46 : 58}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; if (NAME !== 'puff') c.strokeText(TH.multi, px(D.cx), py(my - 0.003)); c.fillText(TH.multi, px(D.cx), py(my - 0.003));
    if (TH.rule) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.font = '800 32px Arial'; c.fillText(TH.rule, px(D.cx), py(my + TH.ruleDy)); }
    for (const [dx, dy] of TH.midLights) insert(c, px(D.cx + dx), py(my + dy), 0.011 * S, rgba(PINK, 0.3));
    // multiplier inserts, the ball-save insert, arrows up the middle
    for (let k = 2; k <= 6; k++) { const x = px(D.cx + (k - 4) * 0.031), y = py(0.2); insert(c, x, y, 0.0125 * S, rgba(MINT, 0.25)); c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = '800 34px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×' + k, x, y + 2); }
    insert(c, px(D.cx), py(0.07), 0.016 * S, rgba(MINT, 0.25)); c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = '800 20px Arial'; c.fillText(D.cells ? 'TIME' : 'SAVE', px(D.cx), py(0.07) + 2);
    c.fillStyle = YELLOW; for (const y of [0.345, 0.375]) { c.beginPath(); c.moveTo(px(D.cx), py(y + 0.02)); c.lineTo(px(D.cx + 0.014), py(y)); c.lineTo(px(D.cx - 0.014), py(y)); c.fill(); }
    // lower field: shadows under the slingshots and guides, lane inserts
    for (const side of [0, 1]) { const X = (v) => px(side ? D.fieldR - v : v);
      c.fillStyle = 'rgba(4,2,10,0.55)'; c.filter = 'blur(14px)'; c.beginPath(); c.moveTo(X(0.074), py(0.345)); c.lineTo(X(0.155), py(0.195)); c.lineTo(X(0.074), py(0.21)); c.fill();
      c.strokeStyle = 'rgba(4,2,10,0.5)'; c.lineWidth = 22; c.beginPath(); c.moveTo(X(0.045), py(0.335)); c.lineTo(X(0.045), py(0.19)); c.lineTo(X(0.135), py(0.128)); c.stroke(); c.filter = 'none';
      insert(c, X(0.0635), py(0.26), 0.0095 * S, rgba(MINT, 0.35)); insert(c, X(0.0225), py(0.26), 0.0095 * S, rgba(PINK, 0.35)); }
    for (const [x, y] of D.posts) contact(c, px(x), py(y), 0.02 * S, 0.6);
    // a soft shadow all along the walls, and the drain
    c.filter = 'blur(10px)'; c.strokeStyle = 'rgba(4,2,10,0.55)'; c.lineWidth = 26; c.beginPath(); c.moveTo(px(0), py(0)); c.lineTo(px(0), py(D.L - D.W / 2)); c.arc(px(D.W / 2), py(D.L - D.W / 2), D.W / 2 * S, Math.PI, 0); c.lineTo(px(D.W), py(0)); c.stroke();
    c.beginPath(); c.moveTo(px(D.fieldR), py(0)); c.lineTo(px(D.fieldR), py(0.8)); c.stroke(); c.filter = 'none';
    c.fillStyle = 'rgba(4,2,10,0.75)'; c.fillRect(0, py(0.035), px(D.fieldR), py(0) - py(0.035));
  });
  tex.anisotropy = 8; return tex;
}

/** A tube through points (field space), closed or open. */
function tube(THREE, pts, r, mat, name, closed = false, tension = 0.0) { const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', tension); const m = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 12), r, 10, closed), mat); m.name = name; return m; }

/** A flat outline with rounded (or cut, chamfer = true) corners. r: one radius, or one per corner. */
function outline(THREE, pts, r, chamfer = false) {
  const sh = new THREE.Shape(); const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n]; const ri = Array.isArray(r) ? r[i] : r;
    const l0 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); const k = Math.min(ri, l0 / 2.05, l2 / 2.05);
    const a = [p1[0] + (p0[0] - p1[0]) / l0 * k, p1[1] + (p0[1] - p1[1]) / l0 * k], b = [p1[0] + (p2[0] - p1[0]) / l2 * k, p1[1] + (p2[1] - p1[1]) / l2 * k];
    if (i === 0) sh.moveTo(...a); else sh.lineTo(...a);
    if (k < 1e-6) continue; if (chamfer) sh.lineTo(...b); else sh.quadraticCurveTo(p1[0], p1[1], ...b);
  }
  sh.closePath(); return sh;
}
/** Points along an outline (for a glowing tube that follows it), in its own plane. */
const outlinePoints = (sh, n = 120) => sh.getSpacedPoints(n).map((p) => [p.x, p.y]);

// ---------- each machine's own cabinet ----------
/** Side art, the picture on the front, and the big lit picture in the backbox. */
function sideArt(c, w, h) {
  const rnd = sky(c, w, h, 260, 9);
  if (NAME === 'puff') { for (let i = 0; i < 9; i++) cloud(c, rnd() * w, h * (0.25 + 0.7 * rnd()), 60 + rnd() * 90, 0.2 + rnd() * 0.3);
    const g = c.createRadialGradient(w * 0.86, h * 0.22, 10, w * 0.86, h * 0.22, 170); g.addColorStop(0, '#fff8d8'); g.addColorStop(0.4, '#ffe14a'); g.addColorStop(1, 'rgba(255,225,74,0)'); c.fillStyle = g; c.beginPath(); c.arc(w * 0.86, h * 0.22, 170, 0, 7); c.fill(); }
  if (NAME === 'virus') { for (let i = 0; i < 11; i++) germShape(c, rnd() * w, h * (0.15 + 0.75 * rnd()), 26 + rnd() * 60, 0.35 + rnd() * 0.5);
    c.strokeStyle = rgba(CYAN, 0.8); c.lineWidth = 8; c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, h * 0.86 + Math.sin(x / 40) * 18 * Math.sin(x / 310)); c.stroke(); }
  if (NAME === 'candy') { for (let i = 0; i < 8; i++) { const x = rnd() * w, y = h * (0.2 + 0.7 * rnd()), s = 40 + rnd() * 60; c.fillStyle = '#ffffff'; c.fillRect(x - 5, y, 10, s * 1.6); candyShape(c, x, y, s, 0.95); } }
  logo(c, w * 0.47, h * 0.5, 300, false); for (const [x, y, r] of [[0.1, 0.2, 26], [0.3, 0.14, 16], [0.62, 0.17, 20], [0.74, 0.8, 18], [0.18, 0.82, 22]]) star(c, w * x, h * y, r, YELLOW);
}
function translite(c, w, h) {
  const rnd = sky(c, w, h, 240, 21);
  if (NAME === 'puff') { const g = c.createRadialGradient(w * 0.8, h * 0.2, 10, w * 0.8, h * 0.2, 150); g.addColorStop(0, '#fff8d8'); g.addColorStop(0.45, '#ffe14a'); g.addColorStop(1, 'rgba(255,225,74,0)'); c.fillStyle = g; c.beginPath(); c.arc(w * 0.8, h * 0.2, 150, 0, 7); c.fill();
    for (let i = 0; i < 9; i++) cloud(c, rnd() * w, h * (0.66 + 0.3 * rnd()), 60 + rnd() * 70, 0.6 + rnd() * 0.4); cloud(c, w * 0.5, h * 0.5, 120, 0.22); }
  if (NAME === 'virus') { const g = c.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.45, w * 0.5); g.addColorStop(0, 'rgba(125,255,58,0.45)'); g.addColorStop(1, 'rgba(125,255,58,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    germShape(c, w * 0.5, h * 0.44, 150, 0.35); for (let i = 0; i < 10; i++) germShape(c, rnd() * w, h * (0.7 + 0.25 * rnd()), 24 + rnd() * 34, 0.8); }
  if (NAME === 'candy') { for (let i = 0; i < 7; i++) { const x = w * (0.08 + 0.84 * i / 6), y = h * (0.74 + 0.1 * Math.sin(i * 2.1)), s = 46 + (i % 3) * 14; c.fillStyle = '#ffffff'; c.fillRect(x - 5, y, 10, h); candyShape(c, x, y, s, 1); } }
  logo(c, w / 2, h * 0.43, NAME === 'virus' ? 230 : 215);
  // the ball flying over it, with a trail
  const bx = w * 0.2, bY = h * 0.2; const tg = c.createLinearGradient(bx, bY, bx - 190, bY + 80); tg.addColorStop(0, 'rgba(255,255,255,0.8)'); tg.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = tg; c.lineWidth = 46; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx, bY); c.lineTo(bx - 190, bY + 80); c.stroke();
  if (NAME === 'virus') germShape(c, bx, bY, 36, 1); else if (NAME === 'candy') candyShape(c, bx, bY, 44, 1);
  else { const sg = c.createRadialGradient(bx - 14, bY - 16, 4, bx, bY, 44); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.5, '#b8c0d0'); sg.addColorStop(1, '#3a4258'); c.fillStyle = sg; c.beginPath(); c.arc(bx, bY, 44, 0, 7); c.fill(); }
  for (const [x, y, r] of [[0.1, 0.5, 18], [0.9, 0.52, 14], [0.42, 0.1, 16], [0.62, 0.08, 10]]) star(c, w * x, h * y, r, YELLOW);
}

/** A flat picture cut to an outline, standing at z (facing +z), its texture spread over the outline's box. */
function cutPicture(THREE, sh, w, h, mat, name) {
  const g = new THREE.ShapeGeometry(sh, 24); const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  const m = new THREE.Mesh(g, mat); m.name = name; return m;
}

/** The whole machine that does not move or light: cabinet, legs, playfield, guides, bumpers, plastics, apron, backbox. */
export async function build(THREE, kit, D) {
  const m = kit.group('Machine');
  const style = NAME;
  const body = style === 'virus' ? new THREE.MeshStandardMaterial({ name: 'Body', color: H(TH.body), roughness: 0.5, metalness: 0.35 })
    : new THREE.MeshPhysicalMaterial({ name: 'Body', color: H(TH.body), roughness: style === 'candy' ? 0.18 : 0.22, clearcoat: 1, clearcoatRoughness: 0.08, sheen: style === 'puff' ? 0.6 : 0, sheenColor: new THREE.Color('#d8c8ff') });
  const wood = new THREE.MeshStandardMaterial({ name: 'InnerWood', color: H(TH.inkDeep), roughness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ name: 'Chrome', color: 0xe8ebf2, metalness: 1, roughness: 0.14 });
  const steel = new THREE.MeshStandardMaterial({ name: 'Steel', color: 0xc9ced8, metalness: 1, roughness: 0.32 });
  const black = new THREE.MeshStandardMaterial({ name: 'Black', color: 0x101116, roughness: 0.5, metalness: 0.3 });
  const rubber = new THREE.MeshStandardMaterial({ name: 'Rubber', color: 0xf3f3f0, roughness: 0.85 });
  const trim = style === 'virus' ? new THREE.MeshStandardMaterial({ name: 'Trim', color: 0x2b302d, metalness: 0.85, roughness: 0.3 })
    : style === 'candy' ? new THREE.MeshPhysicalMaterial({ name: 'Trim', color: 0xffffff, roughness: 0.15, clearcoat: 1 }) : chrome;
  const icing = new THREE.MeshPhysicalMaterial({ name: 'Icing', color: 0xfffaf4, roughness: 0.2, clearcoat: 1 });
  const neonA = glow(THREE, 'NeonA', CYAN, 2.2), neonB = glow(THREE, 'NeonB', PINK, 2.2);
  const bulb = glow(THREE, 'Bulb', '#fff1c4', 1.6);
  const T = THREE.MathUtils.degToRad(D.tilt), sinT = Math.sin(T), cosT = Math.cos(T);
  const yFar = D.y0 + D.L * sinT, zFar = D.z0 - D.L * cosT;
  const WO = D.W + 0.07, thick = style === 'candy' ? 0.024 : 0.03;
  const zF = D.z0 + 0.10, zB = zFar - 0.03, yb = 0.40, topF = D.y0 + 0.075, topB = yFar + 0.085;
  const topAt = (z) => topB + (topF - topB) * (z - zB) / (zF - zB);

  // ---------- cabinet body: two shaped side slabs, front, back, bottom ----------
  {
    const sideTex = kit.canvasTexture(2048, 1024, sideArt); sideTex.anisotropy = 8;
    const art = new THREE.MeshPhysicalMaterial({ name: 'SideArt', map: sideTex, roughness: style === 'virus' ? 0.45 : 0.3, clearcoat: style === 'virus' ? 0.3 : 0.8 });
    let pts, r, chamfer = false, bevel;
    if (style === 'virus') { pts = [[zB, yb + 0.06], [zB + 0.06, yb], [zF - 0.12, yb], [zF, yb + 0.09], [zF, topF], [zB, topB]]; r = 0.012; chamfer = true; bevel = { bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }; }
    else if (style === 'candy') { pts = [[zB, yb], [zF, yb], [zF, topF], [zB, topB]]; r = [0.1, 0.14, 0.04, 0.04]; bevel = { bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 6 }; }
    else { pts = [[zB, yb], [zF, yb], [zF, topF], [zB, topB]]; r = [0.05, 0.09, 0.025, 0.025]; bevel = { bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 4 }; }
    const sh = outline(THREE, pts, r, chamfer); const edge = outlinePoints(sh, 140);
    for (const sx of [-1, 1]) {
      const geo = new THREE.ExtrudeGeometry(sh, { depth: thick, curveSegments: 18, ...bevel });
      geo.rotateY(-Math.PI / 2); geo.translate(sx > 0 ? WO / 2 : -WO / 2 + thick, 0, 0);
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) { const u = (p.getZ(i) - zB) / (zF - zB); uv.setXY(i, sx > 0 ? 1 - u : u, (p.getY(i) - yb) / (topB - yb)); }
      const side = new THREE.Mesh(geo, [art, body]); side.name = 'Side'; m.add(side);
      const xo = sx * (WO / 2 + (style === 'candy' ? 0.012 : 0.0065));
      if (style !== 'candy') m.add(tube(THREE, edge.map(([z, y]) => [xo, y, z]), style === 'virus' ? 0.0035 : 0.0028, sx < 0 ? neonA : neonB, 'SideNeon', true));
      if (style === 'virus') for (let k = 0; k < 4; k++) m.add(kit.box(0.004, 0.012, 0.11, glow(THREE, 'Vent', CYAN, 2.0), { name: 'Vent', pos: [xo, yb + 0.12 + k * 0.03, zB + 0.25] }));
    }
    // CANDY B: thick icing along the top of each side, dripping
    if (style === 'candy') for (const sx of [-1, 1]) { const xo = sx * (WO / 2 - thick / 2);
      m.add(tube(THREE, [[xo, topAt(zB) + 0.008, zB - 0.01], [xo, topAt((zB + zF) / 2) + 0.008, (zB + zF) / 2], [xo, topAt(zF) + 0.008, zF + 0.012]], 0.017, icing, 'Icing'));
      const drips = []; for (let k = 0; k < 16; k++) { const z = zB + 0.06 + k * (zF - zB - 0.1) / 15, len = 0.03 + ((k * 37) % 7) * 0.012, yt = topAt(z) - 0.004;
        const cyl = new THREE.CylinderGeometry(0.0085, 0.0085, len, 12); cyl.translate(sx * (WO / 2 + 0.01), yt - len / 2, z); drips.push(cyl.toNonIndexed());
        const sp = new THREE.SphereGeometry(0.011, 12, 8); sp.translate(sx * (WO / 2 + 0.01), yt - len, z); drips.push(sp.toNonIndexed()); }
      const dm = new THREE.Mesh(mergeGeometries(drips), icing); dm.name = 'Drips'; m.add(dm); }
    // front, back, bottom between the sides
    const inner = WO - 2 * thick + 0.004;
    const frontTex = kit.canvasTexture(1024, 800, (c, w, h) => { const rnd = sky(c, w, h, 90, 13); for (let i = 0; i < 5; i++) cloud(c, rnd() * w, h * (0.5 + 0.45 * rnd()), 50 + rnd() * 60, 0.25 + rnd() * 0.3); logo(c, w / 2, 130, 120, false); });
    const frontMat = new THREE.MeshPhysicalMaterial({ name: 'FrontArt', map: frontTex, roughness: 0.35, clearcoat: 0.6 });
    const fy0 = style === 'virus' ? yb + 0.09 : yb;
    m.add(kit.box(inner, topF - fy0, 0.02, frontMat, { name: 'Front', pos: [0, (topF + fy0) / 2, zF - 0.01] }));
    if (style === 'virus') { const s = kit.box(inner, Math.hypot(0.12, 0.09), 0.02, body, { name: 'FrontSlope', pos: [0, yb + 0.045, zF - 0.06 - 0.01] }); s.rotation.x = -Math.atan2(0.12, 0.09); m.add(s);
      for (const sx of [-1, 1]) m.add(kit.box(0.006, topF - fy0 - 0.06, 0.006, glow(THREE, 'FrontNeon', CYAN, 2.4), { name: 'FrontNeon', pos: [sx * (inner / 2 - 0.03), (topF + fy0) / 2, zF + 0.002] })); }
    if (style === 'puff') m.add(kit.box(inner - 0.06, 0.006, 0.004, neonB, { name: 'FrontNeon', pos: [0, fy0 + 0.05, zF + 0.001] }));
    if (style === 'candy') for (let k = 0; k < 7; k++) { const g = new THREE.SphereGeometry(0.016, 16, 12); const b = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ name: 'Gumball', color: H([CYAN, YELLOW, MINT, '#ffffff'][k % 4]), roughness: 0.15, clearcoat: 1, emissive: new THREE.Color([CYAN, YELLOW, MINT, '#ffffff'][k % 4]), emissiveIntensity: 0.25 })); b.position.set((k - 3) * 0.07, yb + 0.05, zF + 0.006); b.name = 'Gumball'; m.add(b); }
    const by0 = style === 'virus' ? yb + 0.06 : yb;
    m.add(kit.box(inner, topB - by0, 0.02, body, { name: 'Back', pos: [0, (topB + by0) / 2, zB + 0.01] }));
    m.add(kit.box(inner, 0.02, zF - zB - 0.18, body, { name: 'Bottom', pos: [0, yb + 0.01, (zF + zB) / 2 - 0.03] }));
    // start button, flipper buttons, plunger
    m.add(kit.cylinder(0.024, 0.024, 0.012, trim, { name: 'StartBezel', pos: [-0.2, topF - 0.06, zF + 0.004], rot: [90, 0, 0], segments: 24 }));
    m.add(kit.cylinder(0.019, 0.019, 0.016, glow(THREE, 'StartButton', MINT, 1.6), { name: 'StartButton', pos: [-0.2, topF - 0.06, zF + 0.008], rot: [90, 0, 0], segments: 24 }));
    { const x = (D.fieldR + D.W) / 2 - D.W / 2, y = D.y0 - 0.035;
      m.add(kit.cylinder(0.024, 0.024, 0.012, trim, { name: 'PlungerPlate', pos: [x, y, zF + 0.004], rot: [90, 0, 0], segments: 24 })); m.add(kit.cylinder(0.006, 0.006, 0.07, chrome, { name: 'PlungerRod', pos: [x, y, zF + 0.04], rot: [90, 0, 0], segments: 12 }));
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.019, 24, 16), new THREE.MeshPhysicalMaterial({ name: 'Knob', color: style === 'candy' ? H(PINK) : style === 'virus' ? H(CYAN) : 0x111111, roughness: 0.2, clearcoat: 1 })); knob.position.set(x, y, zF + 0.08); knob.name = 'PlungerKnob'; m.add(knob); }
    for (const sx of [-1, 1]) { m.add(kit.cylinder(0.023, 0.023, 0.006, trim, { name: 'ButtonBezel', pos: [sx * (WO / 2 + 0.004), D.y0 - 0.005, D.z0 + 0.02], rot: [0, 0, 90], segments: 24 })); m.add(kit.cylinder(0.017, 0.017, 0.016, glow(THREE, sx < 0 ? 'ButtonL' : 'ButtonR', sx < 0 ? CYAN : PINK, 1.3), { name: 'FlipperButton', pos: [sx * (WO / 2 + 0.009), D.y0 - 0.005, D.z0 + 0.02], rot: [0, 0, 90], segments: 24 })); }

    // ---------- legs ----------
    for (const sx of [-1, 1]) for (const [z, front] of [[zF - 0.07, true], [zB + 0.07, false]]) {
      const leg = kit.group('Leg', { pos: [sx * (WO / 2 - thick / 2), 0, z] });
      if (style === 'puff') {
        const l = kit.cylinder(0.02, 0.011, yb + 0.01, body, { name: 'LegBar', pos: [0, (yb + 0.01) / 2, 0], segments: 28 }); l.rotation.z = sx * 0.06; l.position.x = sx * 0.012; leg.add(l);
        leg.add(kit.cylinder(0.016, 0.018, 0.008, chrome, { name: 'Foot', pos: [sx * 0.024, 0.004, 0], segments: 24 }));
        leg.add(kit.torus(0.019, 0.0022, front ? neonA : neonB, { name: 'FootGlow', pos: [sx * 0.024, 0.009, 0], rot: [90, 0, 0], segments: 28 }));
      } else if (style === 'virus') {
        const l = kit.cylinder(0.034, 0.02, yb, trim, { name: 'LegBar', pos: [0, yb / 2, 0], segments: 4 }); l.rotation.set(0, Math.PI / 4, sx * 0.08); l.position.x = sx * 0.016; leg.add(l);
        const band = kit.cylinder(0.029, 0.027, 0.012, glow(THREE, 'LegGlow', CYAN, 2.2), { name: 'LegGlow', pos: [sx * 0.022, yb * 0.32, 0], segments: 4 }); band.rotation.set(0, Math.PI / 4, sx * 0.08); leg.add(band);
        leg.add(kit.box(0.06, 0.012, 0.06, black, { name: 'Foot', pos: [sx * 0.032, 0.006, 0] }));
      } else {
        const caneTex = kit.canvasTexture(128, 512, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff3f7a'; for (let y = -h; y < h * 2; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 40); c.lineTo(w, y + 70); c.lineTo(0, y + 30); c.fill(); } });
        leg.add(kit.cylinder(0.023, 0.023, yb - 0.04, new THREE.MeshPhysicalMaterial({ name: 'Cane', map: caneTex, roughness: 0.2, clearcoat: 1 }), { name: 'LegBar', pos: [0, (yb - 0.04) / 2 + 0.04, 0], segments: 24 }));
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 16), new THREE.MeshPhysicalMaterial({ name: 'Gumball', color: H(front ? CYAN : YELLOW), roughness: 0.12, clearcoat: 1 })); ball.position.y = 0.04; ball.name = 'Foot'; leg.add(ball);
      }
      m.add(leg);
    }
  }

  // ---------- the playfield and everything standing on it ----------
  const f = field(THREE, D); m.add(f);
  {
    const geo = new THREE.PlaneGeometry(D.W, D.L); geo.rotateX(-Math.PI / 2);
    const pf = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ name: 'Playfield', map: playfieldTexture(THREE, kit, D), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 })); pf.position.set(0, 0, -D.L / 2); pf.name = 'Playfield'; f.add(pf);
    for (const sx of [-1, 1]) { f.add(kit.box(0.012, 0.075, D.L + 0.02, wood, { name: 'InnerWall', pos: [sx * (D.W / 2 + 0.006), 0.0375, -D.L / 2] })); f.add(kit.box(0.004, 0.004, D.L - 0.02, glow(THREE, 'LedStrip', sx < 0 ? CYAN : PINK, 1.5), { name: 'LedStrip', pos: [sx * (D.W / 2 - 0.001), 0.071, -D.L / 2] })); }
    f.add(kit.box(D.W + 0.024, 0.075, 0.012, wood, { name: 'BackWall', pos: [0, 0.0375, -D.L - 0.006] }));
    const sh = new THREE.Shape(); const yA = D.L - D.W / 2; sh.moveTo(-D.W / 2, yA); sh.lineTo(-D.W / 2, D.L); sh.lineTo(D.W / 2, D.L); sh.lineTo(D.W / 2, yA); sh.absarc(0, yA, D.W / 2, 0, Math.PI, false);
    const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false, curveSegments: 40 }); ag.rotateX(-Math.PI / 2);
    const arch = new THREE.Mesh(ag, new THREE.MeshPhysicalMaterial({ name: 'ArchBlock', color: H(TH.ink), roughness: 0.35, clearcoat: 0.8 })); arch.name = 'ArchBlock'; f.add(arch);
  }
  // steel ball guides: every plain wall the physics has, as a thin stainless band standing on edge
  {
    const Hh = 0.028, bands = [];
    for (const [ax, ay, bx, by, kind] of D.segs) {
      if (kind === 2 || kind === 3 || kind === 4) continue;
      const lane = Math.abs(ax - bx) < 1e-5 && ay >= D.laneY0 - 1e-4 && by <= D.laneY1 + 1e-4 && D.laneGuides.some((g) => Math.abs(g - ax) < 1e-4);
      const sling = (Math.abs(ax - 0.082) < 0.07 || Math.abs(ax - (D.fieldR - 0.082)) < 0.07) && ay <= 0.331 && by >= 0.2 && Math.abs(ax - 0.045) > 0.003 && Math.abs(ax - (D.fieldR - 0.045)) > 0.003 && ax > 0.05 && ax < D.fieldR - 0.05;
      if (lane || sling) continue;
      const len = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
      const b = new THREE.BoxGeometry(len + 0.002, Hh, 0.0022); b.rotateY(ang); b.translate((ax + bx) / 2 - D.W / 2, Hh / 2, -(ay + by) / 2); bands.push(b);
    }
    const bm = new THREE.Mesh(mergeGeometries(bands), steel); bm.name = 'BallGuides'; f.add(bm);
  }
  // pop bumpers: skirt, ribbed body, steel ring, domed cap (a cloud, a cell with its nucleus, a sweet swirl)
  {
    const capTex = kit.canvasTexture(256, 256, (c, w, h) => {
      if (D.cells) { const g = c.createRadialGradient(w * 0.45, h * 0.45, 8, w / 2, h / 2, w / 2); g.addColorStop(0, '#d8ffb0'); g.addColorStop(0.55, '#5fd02a'); g.addColorStop(1, '#0c3a1a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(40,10,60,0.75)'; c.beginPath(); c.arc(w * 0.55, h * 0.5, 34, 0, 7); c.fill(); c.fillStyle = 'rgba(255,58,110,0.8)'; c.beginPath(); c.arc(w * 0.55, h * 0.5, 16, 0, 7); c.fill();
        c.strokeStyle = '#ff3a6e'; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, 7); c.stroke(); return; }
      if (NAME === 'candy') { candyShape(c, w / 2, h / 2, w / 2 - 2, 1); return; }
      const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); g.addColorStop(0, TH.mid); g.addColorStop(1, TH.ink); c.fillStyle = g; c.fillRect(0, 0, w, h); c.save(); c.translate(w / 2, h / 2); c.fillStyle = 'rgba(255,225,74,0.85)'; for (let i = 0; i < 16; i++) { c.rotate(Math.PI / 8); c.beginPath(); c.moveTo(70, -9); c.lineTo(118, 0); c.lineTo(70, 9); c.fill(); } c.restore(); cloud(c, w / 2, h / 2, 40, 1); c.strokeStyle = PINK; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, 7); c.stroke(); });
    const capMat = new THREE.MeshPhysicalMaterial({ name: 'BumperCap', map: capTex, roughness: 0.18, clearcoat: 1 });
    const bodyMat = new THREE.MeshPhysicalMaterial({ name: 'BumperBody', color: D.cells ? 0x1a2a20 : 0xf7f2ff, roughness: 0.25, clearcoat: 0.6, transparent: !!D.cells, opacity: D.cells ? 0.85 : 1 });
    const R = D.bumperR;
    for (const [x, y] of D.bumpers) {
      const p = at(D, x, y); const g = kit.group('Bumper', { pos: [p[0], 0, p[2]] });
      g.add(kit.cylinder(R + 0.002, R + 0.007, 0.006, rubber, { name: 'Skirt', pos: [0, 0.003, 0], segments: 40 }));
      g.add(kit.cylinder(R - 0.009, R - 0.006, 0.032, bodyMat, { name: 'Body', pos: [0, 0.022, 0], segments: 40 }));
      const ribs = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const rb = new THREE.BoxGeometry(0.003, 0.03, 0.004); rb.rotateY(-a); rb.translate(Math.cos(a) * (R - 0.006), 0.022, Math.sin(a) * (R - 0.006)); ribs.push(rb); }
      const rm = new THREE.Mesh(mergeGeometries(ribs), new THREE.MeshPhysicalMaterial({ name: 'BumperRibs', color: H(PINK), roughness: 0.3 })); rm.name = 'Ribs'; g.add(rm);
      g.add(kit.torus(R - 0.001, 0.0022, chrome, { name: 'Ring', pos: [0, 0.013, 0], rot: [90, 0, 0], segments: 40 }));
      const prof = [[0.0001, 0.012], [R * 0.4, 0.0115], [R * 0.8, 0.009], [R + 0.003, 0.004], [R + 0.005, 0.0], [R + 0.003, -0.002], [0.0001, -0.002]].map(([rr, yy]) => new THREE.Vector2(rr, yy));
      const lg = new THREE.LatheGeometry(prof, 48); const u = lg.attributes.uv, q = lg.attributes.position; for (let i = 0; i < q.count; i++) u.setXY(i, 0.5 + q.getX(i) / (2 * (R + 0.005)), 0.5 + q.getZ(i) / (2 * (R + 0.005)));
      const cap = new THREE.Mesh(lg, capMat); cap.position.y = 0.041; cap.name = 'Cap'; g.add(cap);
      f.add(g);
    }
  }
  // star posts with rubber rings
  const post = (x, y, col = H(PINK), h = 0.03) => { const p = at(D, x, y); const g = kit.group('Post', { pos: [p[0], 0, p[2]] });
    g.add(kit.cylinder(0.0035, 0.0045, h, new THREE.MeshPhysicalMaterial({ name: 'PostBody', color: col, roughness: 0.25, clearcoat: 0.8 }), { name: 'PostBody', pos: [0, h / 2, 0], segments: 12 }));
    g.add(kit.cylinder(0.0062, 0.0048, 0.005, new THREE.MeshPhysicalMaterial({ name: 'PostTop', color: col, roughness: 0.25, clearcoat: 0.8 }), { name: 'PostTop', pos: [0, h - 0.0025, 0], segments: 8 }));
    g.add(kit.cylinder(0.0022, 0.0022, 0.004, chrome, { name: 'PostScrew', pos: [0, h + 0.002, 0], segments: 8 })); f.add(g); return g; };
  for (const [x, y] of D.posts) { post(x, y, H(CYAN)).add(kit.torus(D.postR - 0.0015, 0.0026, rubber, { name: 'PostRubber', pos: [0, 0.013, 0], rot: [90, 0, 0], segments: 20 })); }
  // slingshots: three posts, a white rubber band round them, a printed plastic on top, lamps underneath
  {
    const slTex = kit.canvasTexture(256, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, PINK); g.addColorStop(1, TH.mid); c.fillStyle = g; c.fillRect(0, 0, w, h); cloud(c, w * 0.42, h * 0.3, 44, 0.95); star(c, w * 0.4, h * 0.62, 34, YELLOW); star(c, w * 0.62, h * 0.8, 18, '#ffffff'); });
    for (const side of [0, 1]) {
      const X = (v) => (side ? D.fieldR - v : v) - D.W / 2; const tri = [[0.082, 0.33], [0.142, 0.205], [0.082, 0.222]];
      for (const [x, y] of tri) post(side ? D.fieldR - x : x, y, 0xffffff, 0.031);
      const cx = (0.082 + 0.142 + 0.082) / 3, cy = (0.33 + 0.205 + 0.222) / 3; const band = [];
      for (const [x, y] of tri) { const dx = x - cx, dy = y - cy; for (const k of [-0.5, 0, 0.5]) { const a = Math.atan2(dy, dx) + k * 0.9; band.push([X(x + Math.cos(a) * 0.0046), 0.014, -(y + Math.sin(a) * 0.0046)]); } }
      f.add(tube(THREE, band, 0.0026, rubber, 'SlingRubber', true, 0.0));
      const sh = new THREE.Shape(); sh.moveTo(X(0.074), 0.343); sh.lineTo(X(0.153), 0.198); sh.lineTo(X(0.074), 0.21); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: false }); const pp = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pp.count; i++) uv.setXY(i, side ? (pp.getX(i) - X(0.153)) / 0.079 : (pp.getX(i) - X(0.074)) / 0.079, 1 - (pp.getY(i) - 0.198) / 0.145);
      geo.rotateX(-Math.PI / 2);
      const pl = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ name: 'SlingPlastic', map: slTex, roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide })); pl.position.y = 0.0335; pl.name = 'SlingPlastic'; f.add(pl);
      for (const [x, y] of [[0.094, 0.29], [0.118, 0.235]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), bulb); b.position.set(X(x), 0.018, -y); b.name = 'Bulb'; f.add(b); }
    }
  }
  // top lane guides: a rounded plastic rail with a chrome wire over it
  for (const gx of D.laneGuides) { const p0 = at(D, gx, D.laneY0), p1 = at(D, gx, D.laneY1); f.add(kit.roundedBox(0.0065, 0.022, D.laneY1 - D.laneY0 + 0.006, 0.003, new THREE.MeshPhysicalMaterial({ name: 'LaneGuide', color: H(PINK), roughness: 0.25, clearcoat: 0.8 }), { name: 'LaneGuide', pos: [p0[0], 0.011, (p0[2] + p1[2]) / 2] }));
    f.add(tube(THREE, [[p0[0], 0.0, p0[2] + 0.004], [p0[0], 0.027, p0[2] + 0.002], [p0[0], 0.03, (p0[2] + p1[2]) / 2], [p1[0], 0.027, p1[2] - 0.002], [p1[0], 0.0, p1[2] - 0.004]], 0.0016, chrome, 'LaneWire')); }
  // standup targets: a round face on a steel bracket
  D.targets.forEach((t, i) => { const p = at(D, t[0], t[1]); const g = kit.group('Target', { pos: [p[0], 0, p[2]] }); const col = t[2] > 0 ? H(CYAN) : H(PINK);
    g.add(kit.box(0.002, 0.03, D.targetH * 2 - 0.004, steel, { name: 'Bracket', pos: [-t[2] * 0.004, 0.015, 0] }));
    g.add(kit.cylinder(D.targetH - 0.002, D.targetH - 0.002, 0.005, new THREE.MeshPhysicalMaterial({ name: 'TargetFace' + i, color: col, roughness: 0.2, clearcoat: 1 }), { name: 'Face', pos: [-t[2] * 0.0005, 0.02, 0], rot: [0, 0, 90], segments: 28 }));
    g.add(kit.cylinder(D.targetH - 0.008, D.targetH - 0.008, 0.0056, new THREE.MeshPhysicalMaterial({ name: 'TargetDot', color: 0xffffff, roughness: 0.2, clearcoat: 1 }), { name: 'Dot', pos: [-t[2] * 0.0005, 0.02, 0], rot: [0, 0, 90], segments: 24 })); f.add(g); });
  // the saucer: a dark cup with a chrome rim; behind it the cloud (PUFF) or a glass jar of sweets (CANDY B)
  if (D.saucer) { const p = at(D, D.saucer[0], D.saucer[1]); f.add(kit.torus(D.saucerR + 0.002, 0.0028, chrome, { name: 'SaucerRim', pos: [p[0], 0.002, p[2]], rot: [90, 0, 0], segments: 32 }));
    if (NAME === 'candy') {
      const jz = p[2] - 0.042; f.add(kit.cylinder(0.026, 0.026, 0.05, new THREE.MeshPhysicalMaterial({ name: 'JarGlass', color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.32, clearcoat: 1 }), { name: 'Jar', pos: [p[0], 0.025, jz], segments: 32 }));
      f.add(kit.cylinder(0.028, 0.028, 0.008, new THREE.MeshPhysicalMaterial({ name: 'JarLid', color: H(PINK), roughness: 0.2, clearcoat: 1 }), { name: 'JarLid', pos: [p[0], 0.054, jz], segments: 32 }));
      const sweets = []; for (let k = 0; k < 14; k++) { const a = k * 2.4, rr = 0.006 + (k % 3) * 0.006; const s = new THREE.SphereGeometry(0.0062, 10, 8); s.translate(p[0] + Math.cos(a) * rr, 0.007 + Math.floor(k / 5) * 0.011, jz + Math.sin(a) * rr); sweets.push(s); }
      const sw = new THREE.Mesh(mergeGeometries(sweets), new THREE.MeshPhysicalMaterial({ name: 'JarSweets', color: H(YELLOW), roughness: 0.2, clearcoat: 1, emissive: new THREE.Color(PINK), emissiveIntensity: 0.35 })); sw.name = 'JarSweets'; f.add(sw);
    } else {
      const puffs = []; for (const [dx, dz, r] of [[-0.02, -0.03, 0.012], [-0.005, -0.036, 0.016], [0.012, -0.032, 0.013]]) { const s = new THREE.SphereGeometry(r, 16, 12); s.scale(1, 0.75, 1); s.translate(p[0] + dx, 0.026, p[2] + dz); puffs.push(s); }
      const cm = new THREE.Mesh(mergeGeometries(puffs), new THREE.MeshPhysicalMaterial({ name: 'CloudPlastic', color: 0xffffff, roughness: 0.3, clearcoat: 0.6, emissive: 0xfff0ff, emissiveIntensity: 0.25 })); cm.name = 'SaucerCloud'; f.add(cm);
      for (const dx of [-0.018, 0.012]) f.add(kit.cylinder(0.002, 0.002, 0.022, chrome, { name: 'CloudPost', pos: [p[0] + dx, 0.011, p[2] - 0.033], segments: 8 }));
    } }
  // the spinner's frame (the plate itself turns: a separate model)
  if (D.spinner) { const [x0, x1, y] = D.spinner; const a = at(D, x0 + 0.004, y), b = at(D, x1 - 0.004, y); f.add(tube(THREE, [[a[0], 0, a[2]], [a[0], 0.045, a[2]], [(a[0] + b[0]) / 2, 0.048, a[2]], [b[0], 0.045, b[2]], [b[0], 0, b[2]]], 0.0018, chrome, 'SpinnerFrame', false, 0.2)); }
  // CANDY B: the slot strip the sweets drop into
  if (D.drops.length) { const y = D.drops[0][1]; const x0 = D.drops[0][0] - D.dropW - 0.006, x1 = D.drops[D.drops.length - 1][0] + D.dropW + 0.006; const a = at(D, (x0 + x1) / 2, y + 0.004);
    f.add(kit.box(x1 - x0, 0.0016, 0.012, black, { name: 'DropBank', pos: [a[0], 0.0008, a[2]] }));
    for (const [x] of D.drops) { const q = at(D, x, y + 0.004); f.add(kit.box(D.dropW * 2 + 0.002, 0.002, 0.0075, new THREE.MeshStandardMaterial({ name: 'DropSlot', color: 0x050508, roughness: 1 }), { name: 'DropSlot', pos: [q[0], 0.0018, q[2]] })); } }
  // general illumination: warm bulbs round the upper field
  for (const [x, y] of [[0.03, 0.9], [0.09, 0.985], [0.19, 1.035], [0.32, 1.035], [0.42, 0.985], [0.44, 0.84], [0.03, 0.4], [0.435, 0.4]]) { const p = at(D, x, y, 0.012); const b = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 12, 8), bulb); b.position.set(...p); b.name = 'Bulb'; f.add(b); f.add(kit.cylinder(0.005, 0.006, 0.008, black, { name: 'BulbSocket', pos: [p[0], 0.004, p[2]], segments: 10 })); }
  // the apron: a sloped cover over the drain with two instruction cards
  {
    const cardTex = (title, lines) => kit.canvasTexture(512, 320, (c, w, h) => { c.fillStyle = '#fbf7ee'; c.fillRect(0, 0, w, h); c.strokeStyle = TH.mid; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = TH.mid; c.font = '900 46px Arial Black, Arial'; c.textAlign = 'center'; c.fillText(title, w / 2, 62); c.fillStyle = '#1a1a1a'; c.font = '700 25px Arial'; lines.forEach((l, i) => c.fillText(l, w / 2, 112 + i * 38)); });
    const apMat = new THREE.MeshPhysicalMaterial({ name: 'ApronBody', color: H(TH.ink), roughness: 0.3, clearcoat: 0.8 });
    const ap = kit.group('Apron', { pos: [0, 0, 0] });
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.1, 0); sh.lineTo(0.1, 0.012); sh.lineTo(0, 0.04); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: D.W, bevelEnabled: false }); geo.rotateY(Math.PI / 2); geo.translate(-D.W / 2, 0, 0.065);
    const am = new THREE.Mesh(geo, apMat); am.name = 'ApronBody'; ap.add(am);
    const slope = Math.atan2(0.028, 0.1);
    for (const [x, title, lines] of [[-0.135, 'HOW TO PLAY', TH.how], [0.085, 'SCORES', TH.scores]]) {
      const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.085), new THREE.MeshPhysicalMaterial({ name: 'Card', map: cardTex(title, lines), roughness: 0.35, clearcoat: 0.6 })); cm.rotation.x = -Math.PI / 2 + slope; cm.position.set(x, 0.0275, 0.016); cm.name = 'Card'; ap.add(cm); }
    f.add(ap);
  }
  // side rails and the lockdown bar
  for (const sx of [-1, 1]) f.add(kit.roundedBox(0.03, 0.014, D.L + 0.12, 0.005, trim, { name: 'SideRail', pos: [sx * (WO / 2 - 0.014), 0.082, -D.L / 2 + 0.03] }));
  m.add(kit.roundedBox(WO + 0.012, 0.035, 0.07, 0.015, trim, { name: 'LockBar', pos: [0, topF + 0.012, D.z0 + 0.075] }));
  if (style === 'virus') m.add(kit.box(WO - 0.06, 0.004, 0.004, neonA, { name: 'LockNeon', pos: [0, topF + 0.012, D.z0 + 0.111] }));

  // ---------- backbox ----------
  {
    const bw = WO + 0.12, bh = 0.74, by = yFar + 0.1 + bh / 2, bz = zFar - 0.12, front = bz + 0.105;
    let shape, tw = bw - 0.07, th = 0.47, tShape;
    if (style === 'virus') { shape = outline(THREE, [[-bw / 2, -bh / 2], [bw / 2, -bh / 2], [bw / 2, bh / 2], [-bw / 2, bh / 2]], 0.1, true); tShape = outline(THREE, [[-tw / 2, -th / 2], [tw / 2, -th / 2], [tw / 2, th / 2], [-tw / 2, th / 2]], 0.07, true); }
    else if (style === 'candy') { shape = outline(THREE, [[-bw / 2, -bh / 2], [bw / 2, -bh / 2], [bw / 2, bh / 2], [-bw / 2, bh / 2]], [0.05, 0.05, 0.24, 0.24]); tShape = outline(THREE, [[-tw / 2, -th / 2], [tw / 2, -th / 2], [tw / 2, th / 2], [-tw / 2, th / 2]], [0.02, 0.02, 0.2, 0.2]); }
    else { shape = outline(THREE, [[-bw / 2, -bh / 2], [bw / 2, -bh / 2], [bw / 2, bh / 2], [-bw / 2, bh / 2]], 0.06); tShape = outline(THREE, [[-tw / 2, -th / 2], [tw / 2, -th / 2], [tw / 2, th / 2], [-tw / 2, th / 2]], 0.035); }
    const depth = style === 'puff' ? 0.15 : 0.19;
    const bg = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: style === 'virus' ? 0.004 : 0.01, bevelSegments: style === 'virus' ? 1 : 5, curveSegments: 24 }); bg.translate(0, by, front - depth - 0.01);
    const bb = new THREE.Mesh(bg, body); bb.name = 'Backbox'; m.add(bb);
    // the neck it stands on
    if (style === 'puff') for (const sx of [-1, 1]) m.add(kit.roundedBox(0.06, 0.12, 0.08, 0.02, body, { name: 'Neck', pos: [sx * bw * 0.3, yFar + 0.07, bz + 0.01] }));
    else m.add(kit.roundedBox(bw * 0.72, 0.1, 0.17, style === 'candy' ? 0.03 : 0.004, body, { name: 'Neck', pos: [0, yFar + 0.07, bz + 0.01] }));
    const ty = by + bh / 2 - 0.035 - th / 2;
    const tex = kit.canvasTexture(1024, 768, translite); tex.anisotropy = 8;
    const tl = cutPicture(THREE, tShape, tw, th, lit(THREE, 'Translite', tex, 1.0), 'Translite'); tl.position.set(0, ty, front + 0.002); m.add(tl);
    // a light that follows the edge of the picture
    const ring = outlinePoints(tShape, 160).map(([x, y]) => [x, ty + y, front + 0.004]);
    m.add(tube(THREE, ring, style === 'virus' ? 0.004 : 0.0045, style === 'candy' ? glow(THREE, 'BackGlow', '#ffffff', 1.4) : neonB, 'BackGlow', true));
    // speaker panel with the score display between the speakers
    const py2 = by - bh / 2 + 0.11;
    m.add(kit.roundedBox(bw - 0.06, 0.17, 0.006, 0.002, black, { name: 'SpeakerPanel', pos: [0, py2, front + 0.001] }));
    if (style === 'puff') for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) m.add(kit.roundedBox(0.1, 0.008, 0.004, 0.003, k === 1 ? neonA : glow(THREE, 'Slot', '#ffffff', 0.4), { name: 'SpeakerSlot', pos: [sx * (bw / 2 - 0.11), py2 - 0.03 + k * 0.03, front + 0.005] }));
    else { const grillTex = kit.canvasTexture(128, 128, (c, w) => { c.fillStyle = '#0b0b10'; c.fillRect(0, 0, w, w); c.fillStyle = style === 'virus' ? '#2d6a3a' : '#5a3a52'; for (let y = 4; y < w; y += 8) for (let x = (y / 8) % 2 ? 4 : 8; x < w; x += 8) { c.beginPath(); c.arc(x, y, 1.7, 0, 7); c.fill(); } });
      for (const sx of [-1, 1]) { m.add(kit.cylinder(0.062, 0.062, 0.006, new THREE.MeshStandardMaterial({ name: 'Grill', map: grillTex, roughness: 0.6, metalness: 0.4 }), { name: 'Speaker', pos: [sx * (bw / 2 - 0.105), py2, front + 0.004], rot: [90, 0, 0], segments: style === 'virus' ? 6 : 36 }));
        m.add(kit.torus(0.064, 0.004, style === 'virus' ? neonA : icing, { name: 'SpeakerRing', pos: [sx * (bw / 2 - 0.105), py2, front + 0.007], segments: style === 'virus' ? 6 : 36 })); } }
    // the display: the app paints the score on this (mesh "Display")
    const dispTex = kit.canvasTexture(512, 128, (c, w, h) => { c.fillStyle = '#120500'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff7a1a'; c.font = '900 70px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(TH.words.join(' '), w / 2, h / 2 + 4); });
    const dw = bw - 0.37; m.add(kit.box(dw + 0.02, dw / 4 + 0.02, 0.006, trim, { name: 'DisplayBezel', pos: [0, py2, front + 0.003] }));
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(dw, dw / 4), lit(THREE, 'DisplayMat', dispTex, 1.3)); dm.position.set(0, py2, front + 0.0068); dm.name = 'Display'; m.add(dm);
    // what stands on and beside the backbox
    const ty0 = by + bh / 2, cz = front - depth / 2 - 0.01;
    if (style === 'virus') {
      const parts = [new THREE.SphereGeometry(0.1, 28, 20).translate(0, ty0 + 0.13, cz)];
      const spikes = []; const N = 26; for (let i = 0; i < N; i++) { const yy = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - yy * yy), a = i * 2.399963; const d = new THREE.Vector3(Math.cos(a) * rr, yy, Math.sin(a) * rr);
        const cone = new THREE.CylinderGeometry(0.008, 0.014, 0.05, 8); cone.translate(0, 0.12, 0); cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); cone.translate(0, ty0 + 0.13, cz); spikes.push(cone);
        const knob = new THREE.SphereGeometry(0.016, 10, 8); knob.translate(d.x * 0.152, ty0 + 0.13 + d.y * 0.152, cz + d.z * 0.152); spikes.push(knob); }
      const body2 = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ name: 'Topper', color: H('#3fae2a'), roughness: 0.5, emissive: new THREE.Color('#7dff3a'), emissiveIntensity: 0.45 })); body2.name = 'Topper'; m.add(body2);
      const sp = new THREE.Mesh(mergeGeometries(spikes.map((q) => q.toNonIndexed())), new THREE.MeshStandardMaterial({ name: 'TopperSpikes', color: H('#ff3a6e'), roughness: 0.5, emissive: new THREE.Color('#ff3a6e'), emissiveIntensity: 0.5 })); sp.name = 'TopperSpikes'; m.add(sp);
      // two glass test tubes of glowing culture, one each side
      for (const sx of [-1, 1]) { const x = sx * (bw / 2 + 0.05), y = by - 0.02;
        m.add(kit.cylinder(0.03, 0.03, 0.36, new THREE.MeshPhysicalMaterial({ name: 'TubeGlass', color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.25, clearcoat: 1 }), { name: 'TestTube', pos: [x, y, cz], segments: 28 }));
        m.add(kit.cylinder(0.024, 0.024, 0.27, glow(THREE, 'Culture', sx < 0 ? CYAN : PINK, 1.4), { name: 'Culture', pos: [x, y - 0.035, cz], segments: 24 }));
        for (const yy of [y + 0.185, y - 0.185]) m.add(kit.cylinder(0.034, 0.034, 0.018, trim, { name: 'TubeCap', pos: [x, yy, cz], segments: 6 }));
        m.add(kit.box(0.05, 0.012, 0.03, trim, { name: 'TubeArm', pos: [x - sx * 0.035, y + 0.1, cz] })); m.add(kit.box(0.05, 0.012, 0.03, trim, { name: 'TubeArm', pos: [x - sx * 0.035, y - 0.1, cz] })); }
    } else if (style === 'candy') {
      const tex2 = kit.canvasTexture(256, 256, (c, w) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, w); candyShape(c, w / 2, w / 2, w / 2 - 4, 1); });
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.035, 48), [new THREE.MeshPhysicalMaterial({ name: 'LolliEdge', color: 0xffffff, roughness: 0.2, clearcoat: 1 }), lit(THREE, 'Lolli', tex2, 0.5), lit(THREE, 'Lolli', tex2, 0.5)]); head.rotation.x = Math.PI / 2; head.position.set(0, ty0 + 0.22, cz); head.name = 'Topper'; m.add(head);
      m.add(kit.cylinder(0.009, 0.009, 0.12, new THREE.MeshStandardMaterial({ name: 'Stick', color: 0xffffff, roughness: 0.5 }), { name: 'Stick', pos: [0, ty0 + 0.04, cz], segments: 12 }));
      for (const [x, col] of [[-0.26, CYAN], [0.26, YELLOW]]) { const g2 = new THREE.SphereGeometry(0.05, 20, 14); g2.scale(1.35, 0.8, 0.8); const cm = new THREE.Mesh(g2, new THREE.MeshPhysicalMaterial({ name: 'Sweet', color: H(col), roughness: 0.2, clearcoat: 1, emissive: new THREE.Color(col), emissiveIntensity: 0.3 })); cm.position.set(x, ty0 - 0.02, cz); cm.name = 'Sweet'; m.add(cm); }
      // icing over the rounded top
      const top = outlinePoints(shape, 200).filter(([, y]) => y > bh / 2 - 0.26).sort((a, b) => a[0] - b[0]).map(([x, y]) => [x, by + y + 0.006, front - 0.004]);
      if (top.length > 4) m.add(tube(THREE, top, 0.016, icing, 'Icing'));
    } else {
      const puffs = []; for (const [dx, dy, r] of [[-0.2, 0.0, 0.075], [-0.08, 0.045, 0.105], [0.07, 0.03, 0.095], [0.2, -0.005, 0.07], [0.0, -0.02, 0.09]]) { const s2 = new THREE.SphereGeometry(r, 24, 16); s2.scale(1, 0.85, 0.7); s2.translate(dx, ty0 + 0.075 + dy, cz); puffs.push(s2); }
      const cm = new THREE.Mesh(mergeGeometries(puffs), new THREE.MeshStandardMaterial({ name: 'Topper', color: 0xffffff, roughness: 0.6, emissive: 0xffe6f5, emissiveIntensity: 0.55 })); cm.name = 'Topper'; m.add(cm);
    }
  }
  // soft floor shadow
  const shadowTex = kit.canvasTexture(256, 256, (c, w, h) => { const rg = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); rg.addColorStop(0, 'rgba(0,0,0,0.6)'); rg.addColorStop(0.6, 'rgba(0,0,0,0.32)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, w, h); });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 2.0), new THREE.MeshBasicMaterial({ name: 'FloorShadow', map: shadowTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.002, -0.07); shadow.name = 'FloorShadow'; m.add(shadow);
  return m;
}

// ---------- the parts that move ----------
/** The ball. PUFF PUFF: polished steel carrying a faint picture of the room, so you see it roll. VIRUS: a virus with knobbed spikes. CANDY B: a peppermint. */
export function ball(THREE, kit, D) {
  const g = kit.group('Ball');
  if (NAME === 'virus') {
    const r = D.ballR * 0.74; const tex = kit.canvasTexture(256, 128, (c, w, h) => { c.fillStyle = '#4fd62a'; c.fillRect(0, 0, w, h); c.fillStyle = '#17641c'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc((i * 97) % w, (i * 53) % h, 6 + (i % 4) * 4, 0, 7); c.fill(); } c.fillStyle = '#d8ff9a'; for (let i = 0; i < 14; i++) { c.beginPath(); c.arc((i * 61 + 20) % w, (i * 37 + 10) % h, 4, 0, 7); c.fill(); } });
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), lit(THREE, 'VirusBody', tex, 0.7)); b.name = 'Ball'; g.add(b);
    const spikes = [], knobs = []; const N = 18; for (let i = 0; i < N; i++) { const yy = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - yy * yy), th = i * 2.399963; const d = new THREE.Vector3(Math.cos(th) * rr, yy, Math.sin(th) * rr);
      const cone = new THREE.CylinderGeometry(0.0009, 0.0017, D.ballR - r, 6); cone.translate(0, r + (D.ballR - r) / 2 - 0.0008, 0); cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); spikes.push(cone);
      const k = new THREE.SphereGeometry(0.0019, 8, 6); k.translate(d.x * (D.ballR - 0.0019), d.y * (D.ballR - 0.0019), d.z * (D.ballR - 0.0019)); knobs.push(k); }
    const sm = new THREE.Mesh(mergeGeometries([...spikes, ...knobs].map((q) => q.toNonIndexed())), new THREE.MeshStandardMaterial({ name: 'VirusSpikes', color: H('#ff3a6e'), roughness: 0.4, emissive: new THREE.Color('#ff3a6e'), emissiveIntensity: 0.8 })); sm.name = 'Spikes'; g.add(sm);
    return g;
  }
  if (NAME === 'candy') {
    const tex = kit.canvasTexture(512, 256, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8203a'; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(i * w / 8, 0); c.lineTo(i * w / 8 + w / 16, 0); c.lineTo(i * w / 8 + w / 16 + 90, h); c.lineTo(i * w / 8 + 90, h); c.fill(); c.beginPath(); c.moveTo(i * w / 8 - w, 0); c.lineTo(i * w / 8 + w / 16 - w, 0); c.lineTo(i * w / 8 + w / 16 + 90 - w, h); c.lineTo(i * w / 8 + 90 - w, h); c.fill(); } });
    const b = new THREE.Mesh(new THREE.SphereGeometry(D.ballR, 40, 26), new THREE.MeshPhysicalMaterial({ name: 'Peppermint', map: tex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 })); b.name = 'Ball'; g.add(b); return g;
  }
  const tex = kit.canvasTexture(512, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f4f7ff'); gr.addColorStop(0.42, '#aab4cc'); gr.addColorStop(0.5, '#2a2f44'); gr.addColorStop(0.58, '#6a5a8e'); gr.addColorStop(1, '#1a1030'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (const [x, col] of [[60, '#ffffff'], [190, '#ff9ed0'], [320, '#ffffff'], [440, '#9eeaff']]) { c.fillStyle = col; c.globalAlpha = 0.9; c.beginPath(); c.roundRect(x, 34, 46, 60, 10); c.fill(); } c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 9; i++) c.fillRect(i * 60 + 10, 150 + (i % 3) * 22, 30, 8); });
  const b = new THREE.Mesh(new THREE.SphereGeometry(D.ballR, 40, 26), new THREE.MeshStandardMaterial({ name: 'BallSteel', map: tex, metalness: 0.85, roughness: 0.12, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5 })); b.name = 'Ball'; g.add(b); return g; }
/** The ball's shadow on the playfield: a soft dark disc, lying in the x-z plane. */
export function ballShadow(THREE, kit, D) { const tex = kit.canvasTexture(64, 64, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(0.55, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
  const geo = new THREE.PlaneGeometry(D.ballR * 3.4, D.ballR * 3.4); geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ name: 'BallShadow', map: tex, transparent: true, depthWrite: false })); m.name = 'BallShadow'; const g = kit.group('BallShadowRoot'); g.add(m); return g; }
/** A flipper bat: pivot at the origin, blade along +x, lying in the x-z plane. White bat, a rubber ring round it. */
export function flipper(THREE, kit, D) {
  const g = kit.group('Flipper'); const r0 = D.flipR + 0.0025, r1 = D.flipR - 0.0025, len = D.flipLen;
  const outline = (grow) => { const sh = new THREE.Shape(); const a = Math.asin((r0 - r1) / len); sh.absarc(0, 0, r0 + grow, Math.PI / 2 + a, 3 * Math.PI / 2 - a, false); sh.absarc(len, 0, r1 + grow, -Math.PI / 2 - a, Math.PI / 2 + a, false); sh.closePath(); return sh; };
  const geo = new THREE.ExtrudeGeometry(outline(0), { depth: 0.019, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0015, bevelSegments: 3, curveSegments: 20 }); geo.rotateX(-Math.PI / 2);
  const bat = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ name: 'FlipperBat', color: 0xfdfdfd, roughness: 0.18, clearcoat: 1 })); bat.position.y = 0.004; bat.name = 'Bat'; g.add(bat);
  const rg = new THREE.ExtrudeGeometry(outline(0.0024), { depth: 0.0085, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0012, bevelSegments: 3, curveSegments: 20 }); rg.rotateX(-Math.PI / 2);
  const rb = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ name: 'FlipperRubber', color: H(PINK), roughness: 0.7, emissive: H(PINK), emissiveIntensity: 0.35 })); rb.position.y = 0.0095; rb.name = 'Rubber'; g.add(rb);
  g.add(kit.cylinder(0.0055, 0.0055, 0.004, new THREE.MeshStandardMaterial({ name: 'Chrome', color: 0xe8ebf2, metalness: 1, roughness: 0.14 }), { name: 'Pivot', pos: [0, 0.027, 0], segments: 6 }));
  return g;
}
/** The plunger in the shooter lane: tip at the origin, rod and spring toward the player (+z in field space). */
export function plunger(THREE, kit, D) { const g = kit.group('Plunger'); const chrome = new THREE.MeshStandardMaterial({ name: 'Chrome', color: 0xe8ebf2, metalness: 1, roughness: 0.14 });
  g.add(kit.cylinder(0.0105, 0.0105, 0.012, new THREE.MeshStandardMaterial({ name: 'Rubber', color: 0xf3f3f0, roughness: 0.85 }), { name: 'Tip', pos: [0, 0, 0.006], rot: [90, 0, 0], segments: 16 })); g.add(kit.cylinder(0.0045, 0.0045, 0.12, chrome, { name: 'Rod', pos: [0, 0, 0.07], rot: [90, 0, 0], segments: 12 }));
  const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2 * 9; pts.push(new THREE.Vector3(Math.cos(a) * 0.008, Math.sin(a) * 0.008, 0.014 + i / 96 * 0.07)); }
  const sp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.0011, 6, false), chrome); sp.name = 'Spring'; g.add(sp); return g; }
/** The spinner's plate: it turns about the x axis through its middle (the origin). */
export function spinner(THREE, kit, D) { const [x0, x1] = D.spinner, w = x1 - x0 - 0.014;
  const tex = kit.canvasTexture(256, 128, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, ch); g.addColorStop(0, '#22e0ff'); g.addColorStop(1, '#5dffb0'); c.fillStyle = g; c.fillRect(0, 0, cw, ch); star(c, cw / 2, ch / 2, 48, '#ffffff'); c.strokeStyle = TH.body; c.lineWidth = 10; c.strokeRect(5, 5, cw - 10, ch - 10); });
  const g = kit.group('Spinner'); const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.022, 0.0016), [null, null, null, null, 0, 0].map(() => new THREE.MeshPhysicalMaterial({ name: 'SpinnerPlate', map: tex, roughness: 0.2, clearcoat: 1 }))); plate.name = 'Plate'; g.add(plate);
  g.add(kit.cylinder(0.0014, 0.0014, w + 0.012, new THREE.MeshStandardMaterial({ name: 'Chrome', color: 0xe8ebf2, metalness: 1, roughness: 0.14 }), { name: 'Axle', rot: [0, 0, 90], segments: 8 })); return g; }

/** CANDY B's drop target: a wrapped sweet standing on edge, facing the player. Origin at the middle of its foot, on the playfield. */
export function drop(THREE, kit, D) {
  const g = kit.group('Drop'); const w = D.dropW * 2 - 0.002, h = 0.03;
  const tex = kit.canvasTexture(256, 192, (c, cw, ch) => { const gr = c.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, PINK); c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
    c.fillStyle = rgba(TH.mid, 0.9); for (let x = -ch; x < cw; x += 44) { c.beginPath(); c.moveTo(x, ch); c.lineTo(x + 22, ch); c.lineTo(x + 22 + ch, 0); c.lineTo(x + ch, 0); c.fill(); }
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(cw / 2, ch / 2, cw * 0.3, ch * 0.28, 0, 0, 7); c.fill(); star(c, cw / 2, ch / 2, ch * 0.22, YELLOW); });
  const face = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.005), [0, 0, 0, 0, 0, 0].map((_, i) => i === 4 ? new THREE.MeshPhysicalMaterial({ name: 'DropFace', map: tex, roughness: 0.15, clearcoat: 1, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }) : new THREE.MeshPhysicalMaterial({ name: 'DropEdge', color: 0xffffff, roughness: 0.2, clearcoat: 1 })));
  face.position.set(0, h / 2, 0.0025); face.name = 'Face'; g.add(face);
  return g;
}

// ---------- the lights: each is its own small model, already in its place; the app only shows or hides it ----------
const disc = (THREE, D, f, x, y, r, mat, name, h = 0.0012) => { const g = new THREE.CircleGeometry(r, 28); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); const p = at(D, x, y, h); m.position.set(...p); m.name = name; f.add(m); return m; };
export function lights(THREE, kit, D) {
  const out = {}; const mk = (name) => { const root = kit.group(name); const f = field(THREE, D, name + 'Field'); root.add(f); out[name] = root; return f; };
  D.lanes.forEach((x, i) => disc(THREE, D, mk('lane' + i), x, (D.laneY0 + D.laneY1) / 2 - 0.045, 0.0135, glow(THREE, 'LaneLight', YELLOW, 2.2), 'LaneLight'));
  D.targets.forEach((t, i) => { const label = TH.labels[i] || '', col = t[2] > 0 ? CYAN : PINK;
    const tex = kit.canvasTexture(128, 128, (c, w) => { c.fillStyle = col; c.fillRect(0, 0, w, w); c.fillStyle = '#ffffff'; c.font = `900 ${label.length > 1 ? 40 : 96}px Arial Black, Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, w / 2, w / 2 + 6); });
    disc(THREE, D, mk('letter' + i), t[0] + t[2] * 0.045, t[1], 0.0165, lit(THREE, 'Letter' + i, tex, 1.8), 'LetterLight'); });
  D.bumpers.forEach(([x, y], i) => { const f = mk('bumper' + i); const p = at(D, x, y);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(D.bumperR - 0.004, D.bumperR - 0.002, 0.034, 40), glow(THREE, 'BumperFlash', '#fff4c2', 3.0)); c.position.set(p[0], 0.022, p[2]); c.name = 'BumperFlash'; f.add(c);
    const r = new THREE.Mesh(new THREE.TorusGeometry(D.bumperR + 0.016, 0.004, 10, 40), glow(THREE, 'BumperRing', PINK, 2.4)); r.rotation.x = Math.PI / 2; r.position.set(p[0], 0.004, p[2]); r.name = 'BumperRing'; f.add(r); });
  // VIRUS: an infected cell glows toxic green all round, its membrane ring lit on the playfield
  if (D.cells) D.bumpers.forEach(([x, y], i) => { const f = mk('cell' + i); const p = at(D, x, y);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(D.bumperR + 0.006, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ name: 'Infected', color: 0x1a4a10, emissive: new THREE.Color(CYAN), emissiveIntensity: 1.6, transparent: true, opacity: 0.55, depthWrite: false })); dome.position.set(p[0], 0.044, p[2]); dome.name = 'Infected'; f.add(dome);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(D.bumperR + 0.02, 0.003, 8, 48), glow(THREE, 'CellRing', CYAN, 2.6)); ring.rotation.x = Math.PI / 2; ring.position.set(p[0], 0.002, p[2]); ring.name = 'CellRing'; f.add(ring); });
  for (const side of [0, 1]) { const f = mk('sling' + side); const X = (v) => (side ? D.fieldR - v : v) - D.W / 2;
    const sh = new THREE.Shape(); sh.moveTo(X(0.074), 0.343); sh.lineTo(X(0.153), 0.198); sh.lineTo(X(0.074), 0.21); sh.closePath(); const geo = new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: 'SlingFlash', color: 0x332200, emissive: new THREE.Color(YELLOW), emissiveIntensity: 2.6, side: THREE.DoubleSide })); m.position.y = 0.0362; m.name = 'SlingFlash'; f.add(m); }
  if (D.saucer) { const f = mk('saucer'); const t = new THREE.Mesh(new THREE.TorusGeometry(D.saucerR + 0.006, 0.004, 10, 36), glow(THREE, 'SaucerGlow', YELLOW, 2.6)); const p = at(D, D.saucer[0], D.saucer[1], 0.004); t.rotation.x = Math.PI / 2; t.position.set(...p); t.name = 'SaucerGlow'; f.add(t); }
  disc(THREE, D, mk('save'), D.cx, 0.07, 0.016, glow(THREE, 'SaveLight', MINT, 2.4), 'SaveLight');
  { const f = mk('multiball'); for (const [dx, dy] of TH.midLights) disc(THREE, D, f, D.cx + dx, TH.midY + dy, 0.011, glow(THREE, 'MultiLight', PINK, 2.6), 'MultiLight'); }
  disc(THREE, D, mk('kick'), D.kickback[0], D.kickback[1] + 0.05, 0.0118, glow(THREE, 'KickLight', YELLOW, 2.4), 'KickLight');
  // CANDY B: the insert in front of each sweet, and the SUGAR RUSH sign
  D.drops.forEach(([x, y], i) => disc(THREE, D, mk('drop' + i), x, y - 0.028, 0.0088, glow(THREE, 'DropLight', CYAN, 2.4), 'DropLight'));
  if (D.drops.length) { const f = mk('rush'); const tex = kit.canvasTexture(512, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, PINK); g.addColorStop(0.5, YELLOW); g.addColorStop(1, CYAN); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = '900 66px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SUGAR RUSH ×2', w / 2, h / 2 + 4); });
    const geo = new THREE.PlaneGeometry(0.14, 0.035); geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, lit(THREE, 'RushSign', tex, 1.8)); m.position.set(...at(D, D.cx, 0.628, 0.0014)); m.name = 'RushSign'; f.add(m); }
  // the bonus multiplier row ×2 … ×6, above the flippers
  for (let k = 2; k <= 6; k++) { const tex = kit.canvasTexture(96, 96, (c, w) => { c.fillStyle = MINT; c.fillRect(0, 0, w, w); c.fillStyle = TH.inkDeep; c.font = '900 50px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×' + k, w / 2, w / 2 + 3); });
    disc(THREE, D, mk('mult' + k), D.cx + (k - 4) * 0.031, 0.2, 0.0125, lit(THREE, 'Mult' + k, tex, 1.6), 'MultLight'); }
  return out;
}
