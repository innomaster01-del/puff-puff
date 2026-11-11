// PUFF PUFF pinball machine, real size, built in code from layout.json (the same numbers the physics uses). No third-party art.
// Cabinet space: origin on the floor under its middle, +z toward the player, +y up. The playfield is a group tilted 6.5°;
// inside it a point of the table (x across, y up the table, h above the wood) is (x − W/2, h, −y).
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SKY = ['#1a0b3d', '#3b1a78', '#7a2fb0', '#ff5fa8'];
const CYAN = '#22e0ff', PINK = '#ff3fa0', YELLOW = '#ffe14a', MINT = '#5dffb0';
const glow = (THREE, name, color, strength = 1.0) => new THREE.MeshStandardMaterial({ name, color: new THREE.Color(color).multiplyScalar(0.15), emissive: new THREE.Color(color), emissiveIntensity: strength, roughness: 0.4 });
const lit = (THREE, name, tex, strength = 1.0) => new THREE.MeshStandardMaterial({ name, map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: strength, roughness: 0.5 });

/** The tilted group everything on the playfield hangs in. */
export function field(THREE, D, name = 'Field') { const g = new THREE.Group(); g.name = name; g.position.set(0, D.y0, D.z0); g.rotation.x = THREE.MathUtils.degToRad(D.tilt); return g; }
const at = (D, x, y, h = 0) => [x - D.W / 2, h, -y];

// ---------- art ----------
function cloud(c, x, y, s, a = 1) { c.save(); c.globalAlpha = a; c.fillStyle = '#ffffff'; for (const [dx, dy, r] of [[-1.1, 0.2, 0.7], [-0.4, -0.25, 0.95], [0.45, -0.1, 0.85], [1.15, 0.25, 0.6], [0, 0.35, 0.9]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); c.fill(); } c.restore(); }
function logo(c, x, y, size, two = true) {
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${size}px Arial Rounded MT Bold, Arial Black, Arial`;
  const line = (t, yy, col) => { c.lineWidth = size * 0.16; c.strokeStyle = '#2a0a55'; c.strokeText(t, x, yy); c.shadowColor = col; c.shadowBlur = size * 0.35; c.fillStyle = '#ffffff'; c.fillText(t, x, yy); c.shadowBlur = 0; c.lineWidth = size * 0.03; c.strokeStyle = col; c.strokeText(t, x, yy); };
  if (two) { line('PUFF', y - size * 0.52, PINK); line('PUFF', y + size * 0.52, CYAN); } else line('PUFF PUFF', y, PINK);
  c.restore();
}
function sky(c, w, h, stars = 160, seed = 5) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, SKY[0]); g.addColorStop(0.45, SKY[1]); g.addColorStop(0.8, SKY[2]); g.addColorStop(1, SKY[3]); c.fillStyle = g; c.fillRect(0, 0, w, h);
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < stars; i++) { const x = rnd() * w, y = rnd() * h * 0.8, r = 0.6 + rnd() * 2.2; c.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.6})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  return rnd;
}

/** A soft dark patch on the playfield print where a part stands: what makes parts look planted instead of pasted on. */
function contact(c, x, y, r, a = 0.5) { const g = c.createRadialGradient(x, y, r * 0.35, x, y, r); g.addColorStop(0, `rgba(8,2,24,${a})`); g.addColorStop(1, 'rgba(8,2,24,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
function insert(c, x, y, r, col = 'rgba(255,255,255,0.20)') { const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, col); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = 'rgba(10,4,30,0.8)'; c.lineWidth = r * 0.16; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = r * 0.06; c.beginPath(); c.arc(x, y, r * 0.9, 0, 7); c.stroke(); }
function star(c, x, y, r, col) { c.save(); c.translate(x, y); c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); c.fill(); c.restore(); }

/** The printed playfield. Canvas top = the far end of the table. */
function playfieldTexture(THREE, kit, D) {
  const PW = 2048, PH = Math.round(PW * D.L / D.W), S = PW / D.W, px = (x) => x * S, py = (y) => (D.L - y) * S;
  const tex = kit.canvasTexture(PW, PH, (c, w, h) => {
    const rnd = sky(c, w, h, 520);
    for (let i = 0; i < 14; i++) cloud(c, rnd() * w, h * (0.12 + 0.78 * rnd()), 50 + rnd() * 90, 0.10 + rnd() * 0.16);
    // shooting stars across the upper field
    c.lineCap = 'round'; for (const [x, y, l] of [[0.1, 0.97, 0.09], [0.33, 0.93, 0.07], [0.4, 0.66, 0.06]]) { const g = c.createLinearGradient(px(x), py(y), px(x + l), py(y - l * 0.5)); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 6; c.beginPath(); c.moveTo(px(x), py(y)); c.lineTo(px(x + l), py(y - l * 0.5)); c.stroke(); star(c, px(x), py(y), 13, '#ffffff'); }
    // the shooter lane: a darker strip with chevrons and a strength gauge
    c.fillStyle = 'rgba(10,4,30,0.6)'; c.fillRect(px(D.fieldR), py(0.80), px(D.W - D.fieldR), py(0) - py(0.80));
    c.strokeStyle = YELLOW; c.lineWidth = 9; c.lineJoin = 'round'; for (let y = 0.14; y < 0.78; y += 0.06) { c.globalAlpha = 0.35 + 0.65 * (y / 0.78); c.beginPath(); c.moveTo(px(D.fieldR + 0.009), py(y)); c.lineTo(px((D.fieldR + D.W) / 2), py(y + 0.022)); c.lineTo(px(D.W - 0.009), py(y)); c.stroke(); } c.globalAlpha = 1;
    // bumpers: a starburst and a ring under each
    for (const [x, y] of D.bumpers) { const g = c.createRadialGradient(px(x), py(y), 8, px(x), py(y), 0.08 * S); g.addColorStop(0, 'rgba(255,255,255,0.6)'); g.addColorStop(0.5, 'rgba(255,63,160,0.4)'); g.addColorStop(1, 'rgba(255,63,160,0)'); c.fillStyle = g; c.beginPath(); c.arc(px(x), py(y), 0.08 * S, 0, 7); c.fill();
      c.save(); c.translate(px(x), py(y)); c.fillStyle = 'rgba(255,225,74,0.5)'; for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0.036 * S, -7); c.lineTo(0.062 * S, 0); c.lineTo(0.036 * S, 7); c.fill(); } c.restore();
      c.strokeStyle = CYAN; c.lineWidth = 9; c.beginPath(); c.arc(px(x), py(y), 0.047 * S, 0, 7); c.stroke(); contact(c, px(x), py(y), 0.043 * S, 0.75); }
    // the cloud saucer
    { const [x, y] = D.saucer; cloud(c, px(x), py(y), 62, 0.95); c.fillStyle = '#06020f'; c.beginPath(); c.arc(px(x), py(y), D.saucerR * S, 0, 7); c.fill();
      c.fillStyle = YELLOW; c.font = '900 40px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#2a0a55'; c.shadowBlur = 8; c.fillText('MYSTERY', px(x + 0.012), py(y - 0.052)); c.shadowBlur = 0; }
    // top lanes
    D.lanes.forEach((x) => insert(c, px(x), py((D.laneY0 + D.laneY1) / 2 - 0.045), 0.014 * S));
    c.fillStyle = '#ffffff'; c.font = '900 40px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#2a0a55'; c.shadowBlur = 8; c.fillText('LIGHT ALL 3  ·  BONUS ×', px(D.cx), py(D.laneY0 - 0.088)); c.shadowBlur = 0;
    for (const gx of D.laneGuides) { c.fillStyle = 'rgba(8,2,24,0.45)'; c.beginPath(); c.roundRect(px(gx) - 13, py(D.laneY1) - 6, 30, (D.laneY1 - D.laneY0) * S + 22, 14); c.fill(); }
    // letter inserts beside the standup targets
    D.targets.forEach((t, i) => { const x = t[0] + t[2] * 0.045, y = t[1]; insert(c, px(x), py(y), 0.017 * S, i < 2 ? 'rgba(34,224,255,0.30)' : 'rgba(255,63,160,0.30)');
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = '900 66px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PUFF'[i], px(x), py(y) + 4); contact(c, px(t[0]), py(t[1]), 0.03 * S, 0.5); });
    // the spinner lane and the kickback
    { const [x0, x1, y] = D.spinner; c.fillStyle = MINT; c.font = '900 30px Arial'; c.textAlign = 'center'; c.save(); c.translate(px((x0 + x1) / 2), py(y - 0.06)); c.rotate(-Math.PI / 2); c.fillText('SPINNER  100', 0, 0); c.restore();
      c.fillStyle = MINT; for (const yy of [y + 0.05, y + 0.08]) { c.beginPath(); c.moveTo(px((x0 + x1) / 2), py(yy + 0.018)); c.lineTo(px((x0 + x1) / 2 + 0.012), py(yy)); c.lineTo(px((x0 + x1) / 2 - 0.012), py(yy)); c.fill(); } }
    insert(c, px(D.kickback[0]), py(D.kickback[1] + 0.05), 0.0125 * S, 'rgba(255,225,74,0.3)');
    // the name, big, in the middle of the table
    logo(c, px(D.cx), py(0.287), 190);
    cloud(c, px(D.cx), py(0.50), 88, 0.92); c.fillStyle = '#7a2fb0'; c.font = '900 58px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MULTIBALL', px(D.cx), py(0.497));
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.font = '800 32px Arial'; c.fillText('SPELL  P · U · F · F', px(D.cx), py(0.452));
    for (const [dx, dy] of [[-0.06, 0], [0.06, 0], [0, 0.05]]) insert(c, px(D.cx + dx), py(0.5 + dy), 0.011 * S, 'rgba(255,63,160,0.3)');
    // multiplier inserts, the ball-save insert, arrows up the middle
    for (let k = 2; k <= 6; k++) { const x = px(D.cx + (k - 4) * 0.031), y = py(0.2); insert(c, x, y, 0.0125 * S, 'rgba(93,255,176,0.25)'); c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = '800 34px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×' + k, x, y + 2); }
    insert(c, px(D.cx), py(0.07), 0.016 * S, 'rgba(93,255,176,0.25)'); c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = '800 20px Arial'; c.fillText('SAVE', px(D.cx), py(0.07) + 2);
    c.fillStyle = YELLOW; for (const y of [0.345, 0.375]) { c.beginPath(); c.moveTo(px(D.cx), py(y + 0.02)); c.lineTo(px(D.cx + 0.014), py(y)); c.lineTo(px(D.cx - 0.014), py(y)); c.fill(); }
    // lower field: shadows under the slingshots and guides, lane inserts
    for (const side of [0, 1]) { const X = (v) => px(side ? D.fieldR - v : v);
      c.fillStyle = 'rgba(8,2,24,0.55)'; c.filter = 'blur(14px)'; c.beginPath(); c.moveTo(X(0.074), py(0.345)); c.lineTo(X(0.155), py(0.195)); c.lineTo(X(0.074), py(0.21)); c.fill();
      c.strokeStyle = 'rgba(8,2,24,0.5)'; c.lineWidth = 22; c.beginPath(); c.moveTo(X(0.045), py(0.335)); c.lineTo(X(0.045), py(0.19)); c.lineTo(X(0.135), py(0.128)); c.stroke(); c.filter = 'none';
      insert(c, X(0.0635), py(0.26), 0.0095 * S, 'rgba(93,255,176,0.35)'); insert(c, X(0.0225), py(0.26), 0.0095 * S, 'rgba(255,63,160,0.35)'); }
    for (const [x, y] of D.posts) contact(c, px(x), py(y), 0.02 * S, 0.6);
    // a soft shadow all along the walls, and the drain
    c.filter = 'blur(10px)'; c.strokeStyle = 'rgba(8,2,24,0.55)'; c.lineWidth = 26; c.beginPath(); c.moveTo(px(0), py(0)); c.lineTo(px(0), py(D.L - D.W / 2)); c.arc(px(D.W / 2), py(D.L - D.W / 2), D.W / 2 * S, Math.PI, 0); c.lineTo(px(D.W), py(0)); c.stroke();
    c.beginPath(); c.moveTo(px(D.fieldR), py(0)); c.lineTo(px(D.fieldR), py(0.8)); c.stroke(); c.filter = 'none';
    c.fillStyle = 'rgba(8,2,24,0.75)'; c.fillRect(0, py(0.035), px(D.fieldR), py(0) - py(0.035));
  });
  tex.anisotropy = 8; return tex;
}

/** A tube through points (field space), closed or open. */
function tube(THREE, pts, r, mat, name, closed = false, tension = 0.0) { const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', tension); const m = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 12), r, 10, closed), mat); m.name = name; return m; }

/** The whole machine that does not move or light: cabinet, legs, playfield, guides, bumpers, plastics, apron, backbox. */
export async function build(THREE, kit, D) {
  const m = kit.group('PuffPuff');
  const body = new THREE.MeshPhysicalMaterial({ name: 'Body', color: 0x1a0b3d, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const wood = new THREE.MeshStandardMaterial({ name: 'InnerWood', color: 0x0d0620, roughness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ name: 'Chrome', color: 0xe8ebf2, metalness: 1, roughness: 0.14 });
  const steel = new THREE.MeshStandardMaterial({ name: 'Steel', color: 0xc9ced8, metalness: 1, roughness: 0.32 });
  const black = new THREE.MeshStandardMaterial({ name: 'Black', color: 0x101116, roughness: 0.5, metalness: 0.3 });
  const rubber = new THREE.MeshStandardMaterial({ name: 'Rubber', color: 0xf3f3f0, roughness: 0.85 });
  const bulb = glow(THREE, 'Bulb', '#fff1c4', 1.6);
  const T = THREE.MathUtils.degToRad(D.tilt), sinT = Math.sin(T), cosT = Math.cos(T);
  const yFar = D.y0 + D.L * sinT, zFar = D.z0 - D.L * cosT;
  const WO = D.W + 0.07;

  // ---------- cabinet body ----------
  const zF = D.z0 + 0.10, zB = zFar - 0.03, yb = 0.40, topF = D.y0 + 0.075, topB = yFar + 0.085;
  {
    const sideTex = kit.canvasTexture(2048, 1024, (c, w, h) => { const rnd = sky(c, w, h, 260, 9); for (let i = 0; i < 9; i++) cloud(c, rnd() * w, h * (0.25 + 0.7 * rnd()), 60 + rnd() * 90, 0.2 + rnd() * 0.3);
      const g = c.createRadialGradient(w * 0.86, h * 0.22, 10, w * 0.86, h * 0.22, 170); g.addColorStop(0, '#fff8d8'); g.addColorStop(0.4, '#ffe14a'); g.addColorStop(1, 'rgba(255,225,74,0)'); c.fillStyle = g; c.beginPath(); c.arc(w * 0.86, h * 0.22, 170, 0, 7); c.fill();
      logo(c, w * 0.47, h * 0.5, 300, false); for (const [x, y, r] of [[0.1, 0.2, 26], [0.3, 0.14, 16], [0.62, 0.17, 20], [0.74, 0.8, 18], [0.18, 0.82, 22]]) star(c, w * x, h * y, r, YELLOW); });
    sideTex.anisotropy = 8;
    const sideMat = new THREE.MeshPhysicalMaterial({ name: 'SideArt', map: sideTex, roughness: 0.4, clearcoat: 0.5, side: THREE.DoubleSide });
    for (const sx of [-1, 1]) {
      const sh = new THREE.Shape(); sh.moveTo(zB, yb); sh.lineTo(zF, yb); sh.lineTo(zF, topF); sh.lineTo(zB, topB); sh.closePath();
      const geo = new THREE.ShapeGeometry(sh); const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, sx > 0 ? 1 - (p.getX(i) - zB) / (zF - zB) : (p.getX(i) - zB) / (zF - zB), 1 - (p.getY(i) - yb) / (topB - yb));
      geo.rotateY(-Math.PI / 2 * sx); geo.translate(sx * WO / 2, 0, 0);
      const side = new THREE.Mesh(geo, sideMat); side.name = 'Side'; m.add(side);
      // the inside of the same wall, dark, so the box has thickness
      const sh2 = new THREE.Shape(); sh2.moveTo(zB, yb); sh2.lineTo(zF, yb); sh2.lineTo(zF, topF); sh2.lineTo(zB, topB); sh2.closePath();
      const g2 = new THREE.ExtrudeGeometry(sh2, { depth: 0.018, bevelEnabled: false }); g2.rotateY(-Math.PI / 2); g2.translate(sx > 0 ? WO / 2 - 0.001 : -WO / 2 + 0.019, 0, 0);
      const inner = new THREE.Mesh(g2, wood); inner.name = 'SideInner'; m.add(inner);
    }
    const frontTex = kit.canvasTexture(1024, 800, (c, w, h) => { const rnd = sky(c, w, h, 90, 13); for (let i = 0; i < 5; i++) cloud(c, rnd() * w, h * (0.5 + 0.45 * rnd()), 50 + rnd() * 60, 0.25 + rnd() * 0.3); logo(c, w / 2, 110, 110, false); });
    m.add(kit.box(WO, topF - yb, 0.02, new THREE.MeshPhysicalMaterial({ name: 'FrontArt', map: frontTex, roughness: 0.4, clearcoat: 0.5 }), { name: 'Front', pos: [0, (topF + yb) / 2, zF - 0.01] }));
    m.add(kit.box(WO, topB - yb, 0.02, body, { name: 'Back', pos: [0, (topB + yb) / 2, zB + 0.01] }));
    m.add(kit.box(WO, 0.02, zF - zB, body, { name: 'Bottom', pos: [0, yb + 0.01, (zF + zB) / 2] }));
    // coin door: frame, door, two lit coin slots, lock
    const door = kit.group('CoinDoor', { pos: [0, 0.60, zF] });
    door.add(kit.roundedBox(0.24, 0.26, 0.012, 0.012, steel, { name: 'DoorFrame', pos: [0, 0, 0.004] })); door.add(kit.roundedBox(0.215, 0.235, 0.012, 0.01, black, { name: 'Door', pos: [0, 0, 0.009] }));
    for (const x of [-0.05, 0.05]) { door.add(kit.roundedBox(0.045, 0.07, 0.006, 0.006, glow(THREE, 'CoinSlot', '#ff5a2a', 1.3), { name: 'CoinSlot', pos: [x, 0.045, 0.017] })); door.add(kit.box(0.006, 0.03, 0.004, black, { name: 'Slot', pos: [x, 0.05, 0.021] })); }
    door.add(kit.cylinder(0.009, 0.009, 0.006, chrome, { name: 'Lock', pos: [0, -0.06, 0.018], rot: [90, 0, 0], segments: 16 }));
    m.add(door);
    m.add(kit.cylinder(0.024, 0.024, 0.012, chrome, { name: 'StartBezel', pos: [-0.21, 0.80, zF + 0.004], rot: [90, 0, 0], segments: 24 }));
    m.add(kit.cylinder(0.019, 0.019, 0.016, glow(THREE, 'StartButton', MINT, 1.4), { name: 'StartButton', pos: [-0.21, 0.80, zF + 0.008], rot: [90, 0, 0], segments: 24 }));
    // plunger: housing, rod, spring, knob
    { const x = (D.fieldR + D.W) / 2 - D.W / 2, y = D.y0 - 0.035;
      m.add(kit.cylinder(0.024, 0.024, 0.012, chrome, { name: 'PlungerPlate', pos: [x, y, zF + 0.004], rot: [90, 0, 0], segments: 24 })); m.add(kit.cylinder(0.006, 0.006, 0.07, chrome, { name: 'PlungerRod', pos: [x, y, zF + 0.04], rot: [90, 0, 0], segments: 12 }));
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.019, 24, 16), new THREE.MeshPhysicalMaterial({ name: 'Knob', color: 0x111111, roughness: 0.2, clearcoat: 1 })); knob.position.set(x, y, zF + 0.08); knob.name = 'PlungerKnob'; m.add(knob); }
    for (const sx of [-1, 1]) { m.add(kit.cylinder(0.023, 0.023, 0.006, chrome, { name: 'ButtonBezel', pos: [sx * (WO / 2 + 0.002), D.y0 - 0.005, D.z0 + 0.02], rot: [0, 0, 90], segments: 24 })); m.add(kit.cylinder(0.017, 0.017, 0.016, glow(THREE, sx < 0 ? 'ButtonL' : 'ButtonR', sx < 0 ? CYAN : PINK, 1.3), { name: 'FlipperButton', pos: [sx * (WO / 2 + 0.006), D.y0 - 0.005, D.z0 + 0.02], rot: [0, 0, 90], segments: 24 })); }
    // legs: angled chrome with bolts and levellers
    for (const sx of [-1, 1]) for (const [z, front] of [[zF - 0.03, true], [zB + 0.03, false]]) {
      const leg = kit.group('Leg', { pos: [sx * (WO / 2 + 0.002), 0, z + (front ? 0.012 : -0.012)] });
      leg.add(kit.box(0.042, yb + 0.16, 0.042, chrome, { name: 'LegBar', pos: [0, (yb + 0.16) / 2 + 0.02, 0] }));
      for (const y of [yb + 0.05, yb + 0.12]) leg.add(kit.cylinder(0.009, 0.009, 0.008, steel, { name: 'LegBolt', pos: [0, y, front ? 0.024 : -0.024], rot: [90, 0, 0], segments: 6 }));
      leg.add(kit.cylinder(0.006, 0.006, 0.03, steel, { name: 'Leveller', pos: [0, 0.018, 0], segments: 10 })); leg.add(kit.cylinder(0.026, 0.03, 0.01, black, { name: 'Foot', pos: [0, 0.005, 0], segments: 20 }));
      m.add(leg);
    }
  }

  // ---------- the playfield and everything standing on it ----------
  const f = field(THREE, D); m.add(f);
  {
    const geo = new THREE.PlaneGeometry(D.W, D.L); geo.rotateX(-Math.PI / 2);
    const pf = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ name: 'Playfield', map: playfieldTexture(THREE, kit, D), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 })); pf.position.set(0, 0, -D.L / 2); pf.name = 'Playfield'; f.add(pf);
    // the cabinet's inner walls rise above the playfield; an LED strip runs along their top edge
    for (const sx of [-1, 1]) { f.add(kit.box(0.012, 0.075, D.L + 0.02, wood, { name: 'InnerWall', pos: [sx * (D.W / 2 + 0.006), 0.0375, -D.L / 2] })); f.add(kit.box(0.004, 0.004, D.L - 0.02, glow(THREE, 'LedStrip', sx < 0 ? CYAN : PINK, 1.5), { name: 'LedStrip', pos: [sx * (D.W / 2 - 0.001), 0.071, -D.L / 2] })); }
    f.add(kit.box(D.W + 0.024, 0.075, 0.012, wood, { name: 'BackWall', pos: [0, 0.0375, -D.L - 0.006] }));
    // the wooden arch block behind the steel guide, so the corners are filled
    const sh = new THREE.Shape(); const yA = D.L - D.W / 2; sh.moveTo(-D.W / 2, yA); sh.lineTo(-D.W / 2, D.L); sh.lineTo(D.W / 2, D.L); sh.lineTo(D.W / 2, yA); sh.absarc(0, yA, D.W / 2, 0, Math.PI, false);
    const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false, curveSegments: 40 }); ag.rotateX(-Math.PI / 2);          // shape y → up the table, depth → height
    const arch = new THREE.Mesh(ag, new THREE.MeshPhysicalMaterial({ name: 'ArchBlock', color: 0x2a0f55, roughness: 0.35, clearcoat: 0.8 })); arch.name = 'ArchBlock'; f.add(arch);
  }
  // steel ball guides: every plain wall the physics has, as a thin stainless band standing on edge
  {
    const H = 0.028, bands = [];
    for (const [ax, ay, bx, by, kind] of D.segs) {
      if (kind === 2 || kind === 3) continue;
      const lane = Math.abs(ax - bx) < 1e-5 && ay >= D.laneY0 - 1e-4 && by <= D.laneY1 + 1e-4 && D.laneGuides.some((g) => Math.abs(g - ax) < 1e-4);
      const sling = (Math.abs(ax - 0.082) < 0.07 || Math.abs(ax - (D.fieldR - 0.082)) < 0.07) && ay <= 0.331 && by >= 0.2 && Math.abs(ax - 0.045) > 0.003 && Math.abs(ax - (D.fieldR - 0.045)) > 0.003 && ax > 0.05 && ax < D.fieldR - 0.05;
      if (lane || sling) continue;
      const len = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
      const b = new THREE.BoxGeometry(len + 0.002, H, 0.0022); b.rotateY(ang); b.translate((ax + bx) / 2 - D.W / 2, H / 2, -(ay + by) / 2); bands.push(b);
    }
    const bm = new THREE.Mesh(mergeGeometries(bands), steel); bm.name = 'BallGuides'; f.add(bm);
  }
  // pop bumpers: skirt, ribbed body, steel ring, domed cap with the cloud on it
  {
    const capTex = kit.canvasTexture(256, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); g.addColorStop(0, '#a04fd8'); g.addColorStop(1, '#2a0a55'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.save(); c.translate(w / 2, h / 2); c.fillStyle = 'rgba(255,225,74,0.85)'; for (let i = 0; i < 16; i++) { c.rotate(Math.PI / 8); c.beginPath(); c.moveTo(70, -9); c.lineTo(118, 0); c.lineTo(70, 9); c.fill(); } c.restore(); cloud(c, w / 2, h / 2, 40, 1); c.strokeStyle = PINK; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, 7); c.stroke(); });
    const capMat = new THREE.MeshPhysicalMaterial({ name: 'BumperCap', map: capTex, roughness: 0.18, clearcoat: 1 });
    const bodyMat = new THREE.MeshPhysicalMaterial({ name: 'BumperBody', color: 0xf7f2ff, roughness: 0.25, clearcoat: 0.6 });
    for (const [x, y] of D.bumpers) {
      const p = at(D, x, y); const g = kit.group('Bumper', { pos: [p[0], 0, p[2]] });
      g.add(kit.cylinder(D.bumperR + 0.002, D.bumperR + 0.007, 0.006, rubber, { name: 'Skirt', pos: [0, 0.003, 0], segments: 40 }));
      g.add(kit.cylinder(D.bumperR - 0.009, D.bumperR - 0.006, 0.032, bodyMat, { name: 'Body', pos: [0, 0.022, 0], segments: 40 }));
      const ribs = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const r = new THREE.BoxGeometry(0.003, 0.03, 0.004); r.rotateY(-a); r.translate(Math.cos(a) * (D.bumperR - 0.006), 0.022, Math.sin(a) * (D.bumperR - 0.006)); ribs.push(r); }
      const rm = new THREE.Mesh(mergeGeometries(ribs), new THREE.MeshPhysicalMaterial({ name: 'BumperRibs', color: 0xff3fa0, roughness: 0.3 })); rm.name = 'Ribs'; g.add(rm);
      g.add(kit.torus(D.bumperR - 0.001, 0.0022, chrome, { name: 'Ring', pos: [0, 0.013, 0], rot: [90, 0, 0], segments: 40 }));
      const prof = [[0.0001, 0.012], [0.012, 0.0115], [0.024, 0.009], [D.bumperR + 0.003, 0.004], [D.bumperR + 0.005, 0.0], [D.bumperR + 0.003, -0.002], [0.0001, -0.002]].map(([r, yy]) => new THREE.Vector2(r, yy));
      const lg = new THREE.LatheGeometry(prof, 48); const u = lg.attributes.uv, q = lg.attributes.position; for (let i = 0; i < q.count; i++) u.setXY(i, 0.5 + q.getX(i) / (2 * (D.bumperR + 0.005)), 0.5 + q.getZ(i) / (2 * (D.bumperR + 0.005)));
      const cap = new THREE.Mesh(lg, capMat); cap.position.y = 0.041; cap.name = 'Cap'; g.add(cap);
      f.add(g);
    }
  }
  // star posts with rubber rings
  const post = (x, y, col = 0xff3fa0, h = 0.03) => { const p = at(D, x, y); const g = kit.group('Post', { pos: [p[0], 0, p[2]] });
    g.add(kit.cylinder(0.0035, 0.0045, h, new THREE.MeshPhysicalMaterial({ name: 'PostBody', color: col, roughness: 0.25, clearcoat: 0.8 }), { name: 'PostBody', pos: [0, h / 2, 0], segments: 12 }));
    g.add(kit.cylinder(0.0062, 0.0048, 0.005, new THREE.MeshPhysicalMaterial({ name: 'PostTop', color: col, roughness: 0.25, clearcoat: 0.8 }), { name: 'PostTop', pos: [0, h - 0.0025, 0], segments: 8 }));
    g.add(kit.cylinder(0.0022, 0.0022, 0.004, chrome, { name: 'PostScrew', pos: [0, h + 0.002, 0], segments: 8 })); f.add(g); return g; };
  for (const [x, y] of D.posts) { post(x, y, 0x22e0ff).add(kit.torus(D.postR - 0.0015, 0.0026, rubber, { name: 'PostRubber', pos: [0, 0.013, 0], rot: [90, 0, 0], segments: 20 })); }
  // slingshots: three posts, a white rubber band round them, a printed plastic on top, lamps underneath
  {
    const slTex = kit.canvasTexture(256, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ff3fa0'); g.addColorStop(1, '#7a2fb0'); c.fillStyle = g; c.fillRect(0, 0, w, h); cloud(c, w * 0.42, h * 0.3, 44, 0.95); star(c, w * 0.4, h * 0.62, 34, YELLOW); star(c, w * 0.62, h * 0.8, 18, '#ffffff'); });
    for (const side of [0, 1]) {
      const X = (v) => (side ? D.fieldR - v : v) - D.W / 2; const tri = [[0.082, 0.33], [0.142, 0.205], [0.082, 0.222]];
      for (const [x, y] of tri) post(side ? D.fieldR - x : x, y, 0xffffff, 0.031);
      // the band sits just outside the posts' centres
      const cx = (0.082 + 0.142 + 0.082) / 3, cy = (0.33 + 0.205 + 0.222) / 3; const band = [];
      for (const [x, y] of tri) { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy); for (const k of [-0.5, 0, 0.5]) { const a = Math.atan2(dy, dx) + k * 0.9; band.push([X(x + Math.cos(a) * 0.0046 - (dx / l) * 0), 0.014, -(y + Math.sin(a) * 0.0046)]); } }
      f.add(tube(THREE, band, 0.0026, rubber, 'SlingRubber', true, 0.0));
      const sh = new THREE.Shape(); sh.moveTo(X(0.074), 0.343); sh.lineTo(X(0.153), 0.198); sh.lineTo(X(0.074), 0.21); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: false }); const pp = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pp.count; i++) uv.setXY(i, side ? (pp.getX(i) - X(0.153)) / 0.079 : (pp.getX(i) - X(0.074)) / 0.079, 1 - (pp.getY(i) - 0.198) / 0.145);
      geo.rotateX(-Math.PI / 2);
      const pl = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ name: 'SlingPlastic', map: slTex, roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide })); pl.position.y = 0.0335; pl.name = 'SlingPlastic'; f.add(pl);
      for (const [x, y] of [[0.094, 0.29], [0.118, 0.235]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), bulb); b.position.set(X(x), 0.018, -y); b.name = 'Bulb'; f.add(b); }
    }
  }
  // top lane guides: a rounded plastic rail with a chrome wire over it
  for (const gx of D.laneGuides) { const p0 = at(D, gx, D.laneY0), p1 = at(D, gx, D.laneY1); f.add(kit.roundedBox(0.0065, 0.022, D.laneY1 - D.laneY0 + 0.006, 0.003, new THREE.MeshPhysicalMaterial({ name: 'LaneGuide', color: 0xff3fa0, roughness: 0.25, clearcoat: 0.8 }), { name: 'LaneGuide', pos: [p0[0], 0.011, (p0[2] + p1[2]) / 2] }));
    f.add(tube(THREE, [[p0[0], 0.0, p0[2] + 0.004], [p0[0], 0.027, p0[2] + 0.002], [p0[0], 0.03, (p0[2] + p1[2]) / 2], [p1[0], 0.027, p1[2] - 0.002], [p1[0], 0.0, p1[2] - 0.004]], 0.0016, chrome, 'LaneWire')); }
  // standup targets: a round face on a steel bracket
  D.targets.forEach((t, i) => { const p = at(D, t[0], t[1]); const g = kit.group('Target', { pos: [p[0], 0, p[2]] }); const col = i < 2 ? 0x22e0ff : 0xff3fa0;
    g.add(kit.box(0.002, 0.03, D.targetH * 2 - 0.004, steel, { name: 'Bracket', pos: [-t[2] * 0.004, 0.015, 0] }));
    g.add(kit.cylinder(D.targetH - 0.002, D.targetH - 0.002, 0.005, new THREE.MeshPhysicalMaterial({ name: 'TargetFace' + i, color: col, roughness: 0.2, clearcoat: 1 }), { name: 'Face', pos: [-t[2] * 0.0005, 0.02, 0], rot: [0, 0, 90], segments: 28 }));
    g.add(kit.cylinder(D.targetH - 0.008, D.targetH - 0.008, 0.0056, new THREE.MeshPhysicalMaterial({ name: 'TargetDot', color: 0xffffff, roughness: 0.2, clearcoat: 1 }), { name: 'Dot', pos: [-t[2] * 0.0005, 0.02, 0], rot: [0, 0, 90], segments: 24 })); f.add(g); });
  // the saucer: a dark cup, a chrome rim, a cloud plastic behind it
  { const p = at(D, D.saucer[0], D.saucer[1]); f.add(kit.torus(D.saucerR + 0.002, 0.0028, chrome, { name: 'SaucerRim', pos: [p[0], 0.002, p[2]], rot: [90, 0, 0], segments: 32 }));
    const puffs = []; for (const [dx, dz, r] of [[-0.02, -0.03, 0.012], [-0.005, -0.036, 0.016], [0.012, -0.032, 0.013]]) { const s = new THREE.SphereGeometry(r, 16, 12); s.scale(1, 0.75, 1); s.translate(p[0] + dx, 0.026, p[2] + dz); puffs.push(s); }
    const cm = new THREE.Mesh(mergeGeometries(puffs), new THREE.MeshPhysicalMaterial({ name: 'CloudPlastic', color: 0xffffff, roughness: 0.3, clearcoat: 0.6, emissive: 0xfff0ff, emissiveIntensity: 0.25 })); cm.name = 'SaucerCloud'; f.add(cm);
    for (const dx of [-0.018, 0.012]) f.add(kit.cylinder(0.002, 0.002, 0.022, chrome, { name: 'CloudPost', pos: [p[0] + dx, 0.011, p[2] - 0.033], segments: 8 })); }
  // the spinner's frame (the plate itself turns: a separate model)
  { const [x0, x1, y] = D.spinner; const a = at(D, x0 + 0.004, y), b = at(D, x1 - 0.004, y); f.add(tube(THREE, [[a[0], 0, a[2]], [a[0], 0.045, a[2]], [(a[0] + b[0]) / 2, 0.048, a[2]], [b[0], 0.045, b[2]], [b[0], 0, b[2]]], 0.0018, chrome, 'SpinnerFrame', false, 0.2)); }
  // general illumination: warm bulbs round the upper field
  for (const [x, y] of [[0.03, 0.9], [0.09, 0.985], [0.19, 1.035], [0.32, 1.035], [0.42, 0.985], [0.44, 0.84], [0.03, 0.62], [0.435, 0.66], [0.03, 0.4], [0.435, 0.4]]) { const p = at(D, x, y, 0.012); const b = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 12, 8), bulb); b.position.set(...p); b.name = 'Bulb'; f.add(b); f.add(kit.cylinder(0.005, 0.006, 0.008, black, { name: 'BulbSocket', pos: [p[0], 0.004, p[2]], segments: 10 })); }
  // the apron: a sloped cover over the drain with two instruction cards, and the shooter lane cover
  {
    const cardTex = (title, lines) => kit.canvasTexture(512, 320, (c, w, h) => { c.fillStyle = '#fbf7ee'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a2fb0'; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#ff3fa0'; c.font = '900 46px Arial Black, Arial'; c.textAlign = 'center'; c.fillText(title, w / 2, 62); c.fillStyle = '#1a0b3d'; c.font = '700 25px Arial'; lines.forEach((l, i) => c.fillText(l, w / 2, 112 + i * 38)); });
    const apMat = new THREE.MeshPhysicalMaterial({ name: 'ApronBody', color: 0x241046, roughness: 0.3, clearcoat: 0.8 });
    const ap = kit.group('Apron', { pos: [0, 0, 0] });
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.1, 0); sh.lineTo(0.1, 0.012); sh.lineTo(0, 0.04); sh.closePath();             // profile: high at the player's end, low toward the field
    const geo = new THREE.ExtrudeGeometry(sh, { depth: D.W, bevelEnabled: false }); geo.rotateY(Math.PI / 2); geo.translate(-D.W / 2, 0, 0.065);
    const am = new THREE.Mesh(geo, apMat); am.name = 'ApronBody'; ap.add(am);
    const slope = Math.atan2(0.028, 0.1);
    for (const [x, title, lines] of [[-0.135, 'HOW TO PLAY', ['3 balls · hold and release to shoot', 'Light the 3 top lanes: bonus ×', 'Spell P·U·F·F: MULTIBALL', 'Cloud: mystery · Spinner: kickback', 'Extra ball at 100,000']], [0.085, 'SCORES', ['Bumper 100 · super 300', 'Target 250 · all four 5,000', 'Skill shot 2,500', 'Jackpot 10,000 in multiball', 'Everything ×2 in multiball']]]) {
      const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.085), new THREE.MeshPhysicalMaterial({ name: 'Card', map: cardTex(title, lines), roughness: 0.35, clearcoat: 0.6 })); cm.rotation.x = -Math.PI / 2 + slope; cm.position.set(x, 0.0275, 0.016); cm.name = 'Card'; ap.add(cm); }
    f.add(ap);
  }
  // chrome side rails and the lockdown bar
  for (const sx of [-1, 1]) f.add(kit.roundedBox(0.03, 0.014, D.L + 0.12, 0.005, chrome, { name: 'SideRail', pos: [sx * (WO / 2 - 0.01), 0.082, -D.L / 2 + 0.03] }));
  m.add(kit.roundedBox(WO + 0.012, 0.035, 0.07, 0.015, chrome, { name: 'LockBar', pos: [0, topF + 0.012, D.z0 + 0.075] }));

  // ---------- backbox: the lit picture, the speaker panel with the score display, the cloud on top ----------
  {
    const bw = WO + 0.12, bh = 0.74, by = yFar + 0.1 + bh / 2, bz = zFar - 0.12, front = bz + 0.105;
    m.add(kit.roundedBox(bw, bh, 0.21, 0.02, body, { name: 'Backbox', pos: [0, by, bz] }));
    m.add(kit.box(bw * 0.72, 0.1, 0.17, body, { name: 'Neck', pos: [0, yFar + 0.07, bz + 0.01] }));
    const th = 0.47, ty = by + bh / 2 - 0.035 - th / 2;
    const tex = kit.canvasTexture(1024, 768, (c, w, h) => { const rnd = sky(c, w, h, 240, 21);
      const g = c.createRadialGradient(w * 0.8, h * 0.2, 10, w * 0.8, h * 0.2, 150); g.addColorStop(0, '#fff8d8'); g.addColorStop(0.45, '#ffe14a'); g.addColorStop(1, 'rgba(255,225,74,0)'); c.fillStyle = g; c.beginPath(); c.arc(w * 0.8, h * 0.2, 150, 0, 7); c.fill();
      for (let i = 0; i < 9; i++) cloud(c, rnd() * w, h * (0.66 + 0.3 * rnd()), 60 + rnd() * 70, 0.6 + rnd() * 0.4);
      cloud(c, w * 0.5, h * 0.5, 120, 0.22); logo(c, w / 2, h * 0.43, 215);
      // a steel ball flying over the clouds, with a trail
      const bx = w * 0.2, bY = h * 0.2; const tg = c.createLinearGradient(bx, bY, bx - 190, bY + 80); tg.addColorStop(0, 'rgba(255,255,255,0.8)'); tg.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = tg; c.lineWidth = 46; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx, bY); c.lineTo(bx - 190, bY + 80); c.stroke();
      const sg = c.createRadialGradient(bx - 14, bY - 16, 4, bx, bY, 44); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.5, '#b8c0d0'); sg.addColorStop(1, '#3a4258'); c.fillStyle = sg; c.beginPath(); c.arc(bx, bY, 44, 0, 7); c.fill();
      for (const [x, y, r] of [[0.1, 0.5, 18], [0.9, 0.52, 14], [0.42, 0.1, 16], [0.62, 0.08, 10]]) star(c, w * x, h * y, r, YELLOW); });
    tex.anisotropy = 8;
    m.add(kit.box(bw - 0.07, th, 0.004, lit(THREE, 'Translite', tex, 1.0), { name: 'Translite', pos: [0, ty, front] }));
    for (const [w2, h2, x, y] of [[bw - 0.045, 0.012, 0, ty + th / 2 + 0.008], [bw - 0.045, 0.012, 0, ty - th / 2 - 0.008], [0.012, th + 0.03, -bw / 2 + 0.03, ty], [0.012, th + 0.03, bw / 2 - 0.03, ty]]) m.add(kit.box(w2, h2, 0.008, glow(THREE, 'BackGlow', PINK, 1.3), { name: 'BackGlow', pos: [x, y, front + 0.001] }));
    // speaker panel: two speakers and the display between them
    const py2 = by - bh / 2 + 0.11;
    m.add(kit.box(bw - 0.05, 0.17, 0.006, black, { name: 'SpeakerPanel', pos: [0, py2, front] }));
    const grillTex = kit.canvasTexture(128, 128, (c, w) => { c.fillStyle = '#0b0b10'; c.fillRect(0, 0, w, w); c.fillStyle = '#3a3d4a'; for (let y = 4; y < w; y += 8) for (let x = (y / 8) % 2 ? 4 : 8; x < w; x += 8) { c.beginPath(); c.arc(x, y, 1.7, 0, 7); c.fill(); } });
    for (const sx of [-1, 1]) { m.add(kit.cylinder(0.062, 0.062, 0.006, new THREE.MeshStandardMaterial({ name: 'Grill', map: grillTex, roughness: 0.6, metalness: 0.4 }), { name: 'Speaker', pos: [sx * (bw / 2 - 0.105), py2, front + 0.004], rot: [90, 0, 0], segments: 36 })); m.add(kit.torus(0.064, 0.004, chrome, { name: 'SpeakerRing', pos: [sx * (bw / 2 - 0.105), py2, front + 0.007], segments: 36 })); }
    // the display: the app paints the score on this (mesh "Display")
    const dispTex = kit.canvasTexture(512, 128, (c, w, h) => { c.fillStyle = '#120500'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff7a1a'; c.font = '900 70px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PUFF PUFF', w / 2, h / 2 + 4); });
    const dw = bw - 0.37; m.add(kit.box(dw + 0.02, dw / 4 + 0.02, 0.006, chrome, { name: 'DisplayBezel', pos: [0, py2, front + 0.003] }));
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(dw, dw / 4), lit(THREE, 'DisplayMat', dispTex, 1.3)); dm.position.set(0, py2, front + 0.0068); dm.name = 'Display'; m.add(dm);
    // the cloud on top of the machine, softly lit
    const puffs = []; for (const [dx, dy, r] of [[-0.2, 0.0, 0.075], [-0.08, 0.045, 0.105], [0.07, 0.03, 0.095], [0.2, -0.005, 0.07], [0.0, -0.02, 0.09]]) { const s = new THREE.SphereGeometry(r, 24, 16); s.scale(1, 0.85, 0.7); s.translate(dx, by + bh / 2 + 0.075 + dy, bz); puffs.push(s); }
    const cm = new THREE.Mesh(mergeGeometries(puffs), new THREE.MeshStandardMaterial({ name: 'Topper', color: 0xffffff, roughness: 0.6, emissive: 0xffe6f5, emissiveIntensity: 0.55 })); cm.name = 'Topper'; m.add(cm);
  }
  // soft floor shadow
  const shadowTex = kit.canvasTexture(256, 256, (c, w, h) => { const rg = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); rg.addColorStop(0, 'rgba(0,0,0,0.6)'); rg.addColorStop(0.6, 'rgba(0,0,0,0.32)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, w, h); });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 2.0), new THREE.MeshBasicMaterial({ name: 'FloorShadow', map: shadowTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.002, -0.07); shadow.name = 'FloorShadow'; m.add(shadow);
  return m;
}

// ---------- the parts that move ----------
/** The ball: polished steel. It carries a faint picture of the room it would mirror, so you can see it roll. */
export function ball(THREE, kit, D) {
  const tex = kit.canvasTexture(512, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f4f7ff'); g.addColorStop(0.42, '#aab4cc'); g.addColorStop(0.5, '#2a2f44'); g.addColorStop(0.58, '#6a5a8e'); g.addColorStop(1, '#1a1030'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (const [x, col] of [[60, '#ffffff'], [190, '#ff9ed0'], [320, '#ffffff'], [440, '#9eeaff']]) { c.fillStyle = col; c.globalAlpha = 0.9; c.beginPath(); c.roundRect(x, 34, 46, 60, 10); c.fill(); } c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 9; i++) c.fillRect(i * 60 + 10, 150 + (i % 3) * 22, 30, 8); });
  const g = kit.group('Ball'); const b = new THREE.Mesh(new THREE.SphereGeometry(D.ballR, 40, 26), new THREE.MeshStandardMaterial({ name: 'BallSteel', map: tex, metalness: 0.85, roughness: 0.12, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5 })); b.name = 'Ball'; g.add(b); return g; }
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
  const rb = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ name: 'FlipperRubber', color: 0xff2f92, roughness: 0.7, emissive: 0xff2f92, emissiveIntensity: 0.35 })); rb.position.y = 0.0095; rb.name = 'Rubber'; g.add(rb);
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
  const tex = kit.canvasTexture(256, 128, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, ch); g.addColorStop(0, '#22e0ff'); g.addColorStop(1, '#5dffb0'); c.fillStyle = g; c.fillRect(0, 0, cw, ch); star(c, cw / 2, ch / 2, 48, '#ffffff'); c.strokeStyle = '#1a0b3d'; c.lineWidth = 10; c.strokeRect(5, 5, cw - 10, ch - 10); });
  const g = kit.group('Spinner'); const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.022, 0.0016), [null, null, null, null, 0, 0].map(() => new THREE.MeshPhysicalMaterial({ name: 'SpinnerPlate', map: tex, roughness: 0.2, clearcoat: 1 }))); plate.name = 'Plate'; g.add(plate);
  g.add(kit.cylinder(0.0014, 0.0014, w + 0.012, new THREE.MeshStandardMaterial({ name: 'Chrome', color: 0xe8ebf2, metalness: 1, roughness: 0.14 }), { name: 'Axle', rot: [0, 0, 90], segments: 8 })); return g; }

// ---------- the lights: each is its own small model, already in its place; the app only shows or hides it ----------
const disc = (THREE, D, f, x, y, r, mat, name, h = 0.0012) => { const g = new THREE.CircleGeometry(r, 28); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); const p = at(D, x, y, h); m.position.set(...p); m.name = name; f.add(m); return m; };
export function lights(THREE, kit, D) {
  const out = {}; const mk = (name) => { const root = kit.group(name); const f = field(THREE, D, name + 'Field'); root.add(f); out[name] = root; return f; };
  D.lanes.forEach((x, i) => disc(THREE, D, mk('lane' + i), x, (D.laneY0 + D.laneY1) / 2 - 0.045, 0.0135, glow(THREE, 'LaneLight', YELLOW, 2.2), 'LaneLight'));
  D.targets.forEach((t, i) => { const letter = 'PUFF'[i], col = i < 2 ? CYAN : PINK;
    const tex = kit.canvasTexture(128, 128, (c, w) => { c.fillStyle = col; c.fillRect(0, 0, w, w); c.fillStyle = '#ffffff'; c.font = '900 96px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(letter, w / 2, w / 2 + 6); });
    disc(THREE, D, mk('letter' + i), t[0] + t[2] * 0.045, t[1], 0.0165, lit(THREE, 'Letter' + i, tex, 1.8), 'LetterLight'); });
  D.bumpers.forEach(([x, y], i) => { const f = mk('bumper' + i); const p = at(D, x, y);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(D.bumperR - 0.004, D.bumperR - 0.002, 0.034, 40), glow(THREE, 'BumperFlash', '#fff4c2', 3.0)); c.position.set(p[0], 0.022, p[2]); c.name = 'BumperFlash'; f.add(c);
    const r = new THREE.Mesh(new THREE.TorusGeometry(D.bumperR + 0.016, 0.004, 10, 40), glow(THREE, 'BumperRing', PINK, 2.4)); r.rotation.x = Math.PI / 2; r.position.set(p[0], 0.004, p[2]); r.name = 'BumperRing'; f.add(r); });
  for (const side of [0, 1]) { const f = mk('sling' + side); const X = (v) => (side ? D.fieldR - v : v) - D.W / 2;
    const sh = new THREE.Shape(); sh.moveTo(X(0.074), 0.343); sh.lineTo(X(0.153), 0.198); sh.lineTo(X(0.074), 0.21); sh.closePath(); const geo = new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: 'SlingFlash', color: 0x332200, emissive: new THREE.Color(YELLOW), emissiveIntensity: 2.6, side: THREE.DoubleSide })); m.position.y = 0.0362; m.name = 'SlingFlash'; f.add(m); }
  { const f = mk('saucer'); const t = new THREE.Mesh(new THREE.TorusGeometry(D.saucerR + 0.006, 0.004, 10, 36), glow(THREE, 'SaucerGlow', YELLOW, 2.6)); const p = at(D, D.saucer[0], D.saucer[1], 0.004); t.rotation.x = Math.PI / 2; t.position.set(...p); t.name = 'SaucerGlow'; f.add(t); }
  // ball-save light between the flippers, and the three multiball lights round the cloud
  disc(THREE, D, mk('save'), D.cx, 0.07, 0.016, glow(THREE, 'SaveLight', MINT, 2.4), 'SaveLight');
  { const f = mk('multiball'); for (const [dx, dy] of [[-0.06, 0], [0.06, 0], [0, 0.05]]) disc(THREE, D, f, D.cx + dx, 0.5 + dy, 0.011, glow(THREE, 'MultiLight', PINK, 2.6), 'MultiLight'); }
  disc(THREE, D, mk('kick'), D.kickback[0], D.kickback[1] + 0.05, 0.0118, glow(THREE, 'KickLight', YELLOW, 2.4), 'KickLight');
  // the bonus multiplier row ×2 … ×6, above the flippers
  for (let k = 2; k <= 6; k++) { const tex = kit.canvasTexture(96, 96, (c, w) => { c.fillStyle = MINT; c.fillRect(0, 0, w, w); c.fillStyle = '#12052e'; c.font = '900 50px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×' + k, w / 2, w / 2 + 3); });
    disc(THREE, D, mk('mult' + k), D.cx + (k - 4) * 0.031, 0.2, 0.0125, lit(THREE, 'Mult' + k, tex, 1.6), 'MultLight'); }
  return out;
}
