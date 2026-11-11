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

/** The printed playfield. Canvas top = the far end of the table. */
function playfieldTexture(THREE, kit, D) {
  const PW = 1024, PH = Math.round(PW * D.L / D.W), S = PW / D.W, px = (x) => x * S, py = (y) => (D.L - y) * S;
  const tex = kit.canvasTexture(PW, PH, (c, w, h) => {
    const rnd = sky(c, w, h, 260);
    for (let i = 0; i < 11; i++) cloud(c, rnd() * w, h * (0.12 + 0.78 * rnd()), 26 + rnd() * 46, 0.10 + rnd() * 0.16);
    // the shooter lane: a darker strip with chevrons
    c.fillStyle = 'rgba(10,4,30,0.55)'; c.fillRect(px(D.fieldR), py(0.80), px(D.W - D.fieldR), py(0) - py(0.80));
    c.strokeStyle = YELLOW; c.lineWidth = 5; for (let y = 0.12; y < 0.78; y += 0.06) { c.beginPath(); c.moveTo(px(D.fieldR + 0.008), py(y)); c.lineTo(px((D.fieldR + D.W) / 2), py(y + 0.022)); c.lineTo(px(D.W - 0.008), py(y)); c.stroke(); }
    // rings under the bumpers, a halo under the saucer
    for (const [x, y] of D.bumpers) { const g = c.createRadialGradient(px(x), py(y), 4, px(x), py(y), 0.075 * S); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,63,160,0.35)'); g.addColorStop(1, 'rgba(255,63,160,0)'); c.fillStyle = g; c.beginPath(); c.arc(px(x), py(y), 0.075 * S, 0, 7); c.fill();
      c.strokeStyle = CYAN; c.lineWidth = 5; c.beginPath(); c.arc(px(x), py(y), 0.046 * S, 0, 7); c.stroke(); }
    { const [x, y] = D.saucer; cloud(c, px(x), py(y), 30, 0.85); c.fillStyle = '#12052e'; c.beginPath(); c.arc(px(x), py(y), D.saucerR * S, 0, 7); c.fill(); c.strokeStyle = YELLOW; c.lineWidth = 4; c.stroke();
      c.fillStyle = YELLOW; c.font = '800 20px Arial'; c.textAlign = 'center'; c.fillText('MYSTERY', px(x), py(y - 0.047)); }
    // top lanes: an insert under each, and the word above them
    D.lanes.forEach((x, i) => { c.fillStyle = 'rgba(255,255,255,0.14)'; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3; c.beginPath(); c.arc(px(x), py((D.laneY0 + D.laneY1) / 2 - 0.045), 0.014 * S, 0, 7); c.fill(); c.stroke(); });
    c.fillStyle = '#ffffff'; c.font = '800 22px Arial'; c.textAlign = 'center'; c.fillText('LIGHT ALL 3  ·  BONUS ×', px(D.cx), py(D.laneY0 - 0.085));
    // letter inserts beside the standup targets
    D.targets.forEach((t, i) => { const x = t[0] + t[2] * 0.045, y = t[1]; c.fillStyle = 'rgba(255,255,255,0.14)'; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3; c.beginPath(); c.arc(px(x), py(y), 0.017 * S, 0, 7); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = '900 34px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PUFF'[i], px(x), py(y) + 2); });
    // the name, big, in the middle of the table
    logo(c, px(D.cx), py(0.285), 96);
    cloud(c, px(D.cx), py(0.50), 44, 0.9); c.fillStyle = '#7a2fb0'; c.font = '900 30px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MULTIBALL', px(D.cx), py(0.497));
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = '700 17px Arial'; c.fillText('SPELL  P · U · F · F', px(D.cx), py(0.452));
    for (let k = 2; k <= 6; k++) { c.fillStyle = 'rgba(255,255,255,0.14)'; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3; c.beginPath(); c.arc(px(D.cx + (k - 4) * 0.031), py(0.2), 0.0125 * S, 0, 7); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = '800 18px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×' + k, px(D.cx + (k - 4) * 0.031), py(0.2) + 1); }
    // arrows up the middle and out to the targets
    c.fillStyle = YELLOW; for (const y of [0.345, 0.375]) { c.beginPath(); c.moveTo(px(D.cx), py(y + 0.02)); c.lineTo(px(D.cx + 0.014), py(y)); c.lineTo(px(D.cx - 0.014), py(y)); c.fill(); }
    // slingshot shadows, inlane marks
    for (const side of [0, 1]) { const X = (v) => px(side ? D.fieldR - v : v); c.fillStyle = 'rgba(10,4,30,0.35)'; c.beginPath(); c.moveTo(X(0.082), py(0.33)); c.lineTo(X(0.142), py(0.205)); c.lineTo(X(0.082), py(0.222)); c.fill();
      c.fillStyle = MINT; c.beginPath(); c.arc(X(0.0635), py(0.26), 0.009 * S, 0, 7); c.fill(); c.fillStyle = PINK; c.beginPath(); c.arc(X(0.0225), py(0.26), 0.009 * S, 0, 7); c.fill(); }
    // the drain
    c.fillStyle = 'rgba(10,4,30,0.6)'; c.fillRect(0, py(0.03), px(D.fieldR), py(0) - py(0.03));
  });
  tex.anisotropy = 8; return tex;
}

/** The whole machine that does not move or light: cabinet, legs, playfield, rails, bumpers, plastics, apron, backbox. */
export async function build(THREE, kit, D) {
  const m = kit.group('PuffPuff');
  const body = new THREE.MeshPhysicalMaterial({ name: 'Body', color: 0x1a0b3d, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const chrome = kit.mat.metal('#d9dde6', 0.18), black = kit.mat.metal('#15161c', 0.45), rubber = kit.mat.rubber('#f4f4f4');
  const T = THREE.MathUtils.degToRad(D.tilt), sinT = Math.sin(T), cosT = Math.cos(T);
  const yFar = D.y0 + D.L * sinT, zFar = D.z0 - D.L * cosT;                                   // the far end of the playfield
  const WO = D.W + 0.06;                                                                       // outside width

  // ---------- cabinet body: a box whose top slopes with the playfield; sides carry the art ----------
  {
    const zF = D.z0 + 0.09, zB = zFar - 0.03, yb = 0.42, topF = D.y0 + 0.05, topB = yFar + 0.055;
    const sideTex = kit.canvasTexture(1024, 512, (c, w, h) => { const rnd = sky(c, w, h, 120, 9); for (let i = 0; i < 7; i++) cloud(c, rnd() * w, h * (0.2 + 0.7 * rnd()), 28 + rnd() * 40, 0.2 + rnd() * 0.25); logo(c, w * 0.5, h * 0.5, 150, false); });
    const sideMat = new THREE.MeshStandardMaterial({ name: 'SideArt', map: sideTex, roughness: 0.5 });
    for (const sx of [-1, 1]) {
      const sh = new THREE.Shape(); sh.moveTo(zB, yb); sh.lineTo(zF, yb); sh.lineTo(zF, topF); sh.lineTo(zB, topB); sh.closePath();
      const geo = new THREE.ShapeGeometry(sh); const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, sx > 0 ? 1 - (p.getX(i) - zB) / (zF - zB) : (p.getX(i) - zB) / (zF - zB), 1 - (p.getY(i) - yb) / (topB - yb));
      geo.rotateY(-Math.PI / 2 * sx); geo.translate(sx * WO / 2, 0, 0); if (sx < 0) { /* faces −x */ } 
      const side = new THREE.Mesh(geo, sideMat); side.name = 'Side'; side.material.side = THREE.DoubleSide; m.add(side);
    }
    m.add(kit.box(WO, D.y0 + 0.05 - yb, 0.02, body, { name: 'Front', pos: [0, (D.y0 + 0.05 + yb) / 2, zF - 0.01] }));
    m.add(kit.box(WO, topB - yb, 0.02, body, { name: 'Back', pos: [0, (topB + yb) / 2, zB + 0.01] }));
    m.add(kit.box(WO, 0.02, zF - zB, body, { name: 'Bottom', pos: [0, yb + 0.01, (zF + zB) / 2] }));
    // coin door, start button, plunger knob, flipper buttons
    m.add(kit.roundedBox(0.2, 0.2, 0.012, 0.01, black, { name: 'CoinDoor', pos: [0, 0.60, zF + 0.004] }));
    m.add(kit.cylinder(0.022, 0.022, 0.014, glow(THREE, 'StartButton', MINT, 1.2), { name: 'StartButton', pos: [-0.2, 0.80, zF + 0.006], rot: [90, 0, 0], segments: 24 }));
    m.add(kit.cylinder(0.02, 0.02, 0.05, chrome, { name: 'PlungerKnob', pos: [(D.fieldR + D.W) / 2 - D.W / 2, D.y0 - 0.05, zF + 0.03], rot: [90, 0, 0], segments: 20 }));
    for (const sx of [-1, 1]) m.add(kit.cylinder(0.02, 0.02, 0.012, glow(THREE, sx < 0 ? 'ButtonL' : 'ButtonR', sx < 0 ? CYAN : PINK, 1.2), { name: 'FlipperButton', pos: [sx * (WO / 2 + 0.004), D.y0 - 0.02, D.z0 - 0.02], rot: [0, 0, 90], segments: 20 }));
    // legs
    for (const sx of [-1, 1]) for (const z of [zF - 0.05, zB + 0.05]) { m.add(kit.box(0.035, yb + 0.12, 0.035, chrome, { name: 'Leg', pos: [sx * (WO / 2 - 0.01), (yb + 0.12) / 2, z] })); m.add(kit.cylinder(0.03, 0.03, 0.012, black, { name: 'Foot', pos: [sx * (WO / 2 - 0.01), 0.006, z], segments: 16 })); }
  }

  // ---------- the playfield and everything standing on it ----------
  const f = field(THREE, D); m.add(f);
  {
    const geo = new THREE.PlaneGeometry(D.W, D.L); geo.rotateX(-Math.PI / 2);
    const pf = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ name: 'Playfield', map: playfieldTexture(THREE, kit, D), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 })); pf.position.set(0, 0, -D.L / 2); pf.name = 'Playfield'; f.add(pf);
  }
  // rails: every wall the physics has, as a low strip (the arch in chrome, the rest in dark wood with a glowing top line)
  {
    const H = 0.027, walls = [], tops = [], arch = [];
    for (const [ax, ay, bx, by, kind] of D.segs) {
      if (kind === 2 || kind === 3) continue;
      const len = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax), isArch = ay > D.L - D.W / 2 - 1e-4 && by > D.L - D.W / 2 - 1e-4 && len < 0.04;
      const mk = (h, th, y) => { const b = new THREE.BoxGeometry(len + th, h, th); b.rotateY(ang); b.translate((ax + bx) / 2 - D.W / 2, y, -(ay + by) / 2); return b; };
      if (isArch) arch.push(mk(H, 0.006, H / 2)); else { walls.push(mk(H, 0.007, H / 2)); tops.push(mk(0.0025, 0.0075, H + 0.0012)); }
    }
    const wm = new THREE.Mesh(mergeGeometries(walls), new THREE.MeshPhysicalMaterial({ name: 'Rails', color: 0x241046, roughness: 0.35, clearcoat: 0.8 })); wm.name = 'Rails'; f.add(wm);
    const tm = new THREE.Mesh(mergeGeometries(tops), glow(THREE, 'RailGlow', CYAN, 1.2)); tm.name = 'RailGlow'; f.add(tm);
    const am = new THREE.Mesh(mergeGeometries(arch), chrome); am.name = 'Arch'; f.add(am);
  }
  // pop bumpers: a white skirt, a body, and a cap with a cloud on it (the lit cap is a separate model)
  {
    const capTex = kit.canvasTexture(256, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); g.addColorStop(0, '#7a2fb0'); g.addColorStop(1, '#2a0a55'); c.fillStyle = g; c.fillRect(0, 0, w, h); cloud(c, w / 2, h / 2, 46, 1); c.strokeStyle = PINK; c.lineWidth = 12; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 10, 0, 7); c.stroke(); });
    const capMat = new THREE.MeshPhysicalMaterial({ name: 'BumperCap', map: capTex, roughness: 0.2, clearcoat: 1 });
    for (const [x, y] of D.bumpers) {
      const p = at(D, x, y);
      f.add(kit.cylinder(D.bumperR, D.bumperR + 0.004, 0.012, rubber, { name: 'BumperSkirt', pos: [p[0], 0.006, p[2]], segments: 32 }));
      f.add(kit.cylinder(D.bumperR - 0.007, D.bumperR - 0.004, 0.03, new THREE.MeshPhysicalMaterial({ name: 'BumperBody', color: 0xffffff, roughness: 0.15, transparent: true, opacity: 0.85 }), { name: 'BumperBody', pos: [p[0], 0.027, p[2]], segments: 32 }));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(D.bumperR + 0.004, D.bumperR + 0.004, 0.008, 40), [chrome, capMat, chrome]); cap.position.set(p[0], 0.046, p[2]); cap.name = 'BumperCap'; f.add(cap);
    }
  }
  // posts with rubber rings, lane guides get chrome caps
  for (const [x, y] of D.posts) { const p = at(D, x, y); f.add(kit.cylinder(D.postR - 0.003, D.postR - 0.003, 0.03, chrome, { name: 'Post', pos: [p[0], 0.015, p[2]], segments: 16 })); f.add(kit.torus(D.postR - 0.002, 0.003, rubber, { name: 'PostRubber', pos: [p[0], 0.012, p[2]], rot: [90, 0, 0], segments: 20 })); }
  // slingshots: a clear plastic over each triangle with a star on it, rubber along the kicking face
  for (const side of [0, 1]) {
    const X = (v) => (side ? D.fieldR - v : v) - D.W / 2;
    const sh = new THREE.Shape(); sh.moveTo(X(0.078), -0.336); sh.lineTo(X(0.148), -0.2); sh.lineTo(X(0.078), -0.216); sh.closePath();
    const geo = new THREE.ShapeGeometry(sh); geo.rotateX(Math.PI / 2);                      // shape y → −z … so pass −y above
    const pl = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ name: 'SlingPlastic', color: 0xff3fa0, roughness: 0.15, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); pl.position.y = 0.033; pl.name = 'SlingPlastic'; f.add(pl);
    for (const [x, y] of [[0.082, 0.33], [0.142, 0.205], [0.082, 0.222]]) f.add(kit.cylinder(0.004, 0.004, 0.033, chrome, { name: 'SlingPost', pos: [X(x), 0.0165, -y], segments: 12 }));
  }
  // standup targets: a white face on a small bracket
  D.targets.forEach((t, i) => { const p = at(D, t[0] - t[2] * 0.004, t[1]); f.add(kit.box(0.006, 0.026, D.targetH * 2, new THREE.MeshPhysicalMaterial({ name: 'TargetFace' + i, color: i < 2 ? 0x22e0ff : 0xff3fa0, roughness: 0.2, clearcoat: 1 }), { name: 'Target', pos: [p[0], 0.015, p[2]] })); });
  // the saucer: a chrome rim around the hole
  { const p = at(D, D.saucer[0], D.saucer[1]); f.add(kit.torus(D.saucerR + 0.002, 0.003, chrome, { name: 'SaucerRim', pos: [p[0], 0.002, p[2]], rot: [90, 0, 0], segments: 28 })); }
  // the apron over the drain, with the rules on it
  {
    const apTex = kit.canvasTexture(1024, 256, (c, w, h) => { sky(c, w, h, 40, 3); cloud(c, 150, 130, 50, 0.9); cloud(c, w - 150, 130, 50, 0.9);
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.font = '900 44px Arial Black, Arial'; c.fillText('PUFF PUFF', w / 2, 62);
      c.font = '700 24px Arial'; c.fillText('3 BALLS  ·  LIGHT THE TOP LANES FOR BONUS ×', w / 2, 112); c.fillText('SPELL P·U·F·F FOR MULTIBALL  ·  CLOUD = MYSTERY', w / 2, 150); c.fillText('EXTRA BALL AT 100,000', w / 2, 188); });
    const ap = new THREE.Mesh(new THREE.BoxGeometry(D.fieldR, 0.03, 0.085), [body, body, new THREE.MeshStandardMaterial({ name: 'Apron', map: apTex, roughness: 0.4 }), body, body, body]); ap.position.set(D.fieldR / 2 - D.W / 2, 0.015, 0.012); ap.name = 'Apron'; f.add(ap);
  }
  // the lockdown bar and side rails around the glass line
  m.add(kit.roundedBox(WO + 0.01, 0.03, 0.06, 0.012, chrome, { name: 'LockBar', pos: [0, D.y0 + 0.055, D.z0 + 0.065] }));
  for (const sx of [-1, 1]) { const r = kit.box(0.02, 0.012, D.L + 0.06, chrome, { name: 'SideRail', pos: [sx * (WO / 2 - 0.005), 0.056, -D.L / 2] }); f.add(r); }

  // ---------- backbox: the lit picture ----------
  {
    const bw = WO + 0.1, bh = 0.62, by = yFar + 0.06 + bh / 2, bz = zFar - 0.11;
    m.add(kit.roundedBox(bw, bh, 0.2, 0.02, body, { name: 'Backbox', pos: [0, by, bz] }));
    const tex = kit.canvasTexture(1024, 896, (c, w, h) => { const rnd = sky(c, w, h, 220, 21);
      // a moon, and the clouds the name sits on
      const g = c.createRadialGradient(w * 0.78, h * 0.2, 10, w * 0.78, h * 0.2, 150); g.addColorStop(0, '#fff8d8'); g.addColorStop(0.45, '#ffe14a'); g.addColorStop(1, 'rgba(255,225,74,0)'); c.fillStyle = g; c.beginPath(); c.arc(w * 0.78, h * 0.2, 150, 0, 7); c.fill();
      for (let i = 0; i < 9; i++) cloud(c, rnd() * w, h * (0.62 + 0.3 * rnd()), 60 + rnd() * 70, 0.55 + rnd() * 0.4);
      cloud(c, w * 0.5, h * 0.47, 120, 0.25);
      logo(c, w / 2, h * 0.42, 210);
      c.fillStyle = '#ffffff'; c.font = '800 44px Arial'; c.textAlign = 'center'; c.shadowColor = CYAN; c.shadowBlur = 18; c.fillText('P I N B A L L', w / 2, h * 0.78); });
    tex.anisotropy = 8;
    m.add(kit.box(bw - 0.06, bh - 0.08, 0.004, lit(THREE, 'Translite', tex, 1.0), { name: 'Translite', pos: [0, by, bz + 0.102] }));
    for (const [w2, h2, x, y] of [[bw - 0.03, 0.012, 0, by + bh / 2 - 0.022], [bw - 0.03, 0.012, 0, by - bh / 2 + 0.022], [0.012, bh - 0.03, -bw / 2 + 0.022, by], [0.012, bh - 0.03, bw / 2 - 0.022, by]]) m.add(kit.box(w2, h2, 0.006, glow(THREE, 'BackGlow', PINK, 1.3), { name: 'BackGlow', pos: [x, y, bz + 0.104] }));
    m.add(kit.box(bw * 0.7, 0.07, 0.16, body, { name: 'Neck', pos: [0, yFar + 0.045, bz + 0.01] }));
  }
  // soft floor shadow
  const shadowTex = kit.canvasTexture(256, 256, (c, w, h) => { const rg = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); rg.addColorStop(0, 'rgba(0,0,0,0.55)'); rg.addColorStop(0.6, 'rgba(0,0,0,0.3)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, w, h); });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.9), new THREE.MeshBasicMaterial({ name: 'FloorShadow', map: shadowTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.002, -0.05); shadow.name = 'FloorShadow'; m.add(shadow);
  return m;
}

// ---------- the parts that move ----------
export function ball(THREE, kit, D) { const g = kit.group('Ball'); const b = new THREE.Mesh(new THREE.SphereGeometry(D.ballR, 32, 20), new THREE.MeshPhysicalMaterial({ name: 'Steel', color: 0xf2f4f8, metalness: 1, roughness: 0.12, emissive: 0x9fb6ff, emissiveIntensity: 0.25 })); b.name = 'Ball'; g.add(b); return g; }
/** A flipper bat: pivot at the origin, blade along +x, lying in the x-z plane. */
export function flipper(THREE, kit, D) {
  const g = kit.group('Flipper'); const r0 = D.flipR + 0.004, r1 = D.flipR - 0.001, len = D.flipLen;
  const sh = new THREE.Shape(); const a = Math.asin((r0 - r1) / len); sh.absarc(0, 0, r0, Math.PI / 2 + a, 3 * Math.PI / 2 - a, false); sh.absarc(len, 0, r1, -Math.PI / 2 - a + 0, Math.PI / 2 + a, false); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 16 }); geo.rotateX(-Math.PI / 2); geo.scale(1, 1, 1);
  const bat = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ name: 'FlipperBat', color: 0xffffff, roughness: 0.2, clearcoat: 1 })); bat.position.y = 0.004; bat.name = 'Bat'; g.add(bat);
  const rb = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0028, bevelSegments: 2, curveSegments: 16 }).rotateX(-Math.PI / 2), glow(THREE, 'FlipperRubber', PINK, 1.0)); rb.position.y = 0.01; rb.name = 'Rubber'; g.add(rb);
  g.add(kit.cylinder(0.006, 0.006, 0.004, kit.mat.metal('#d9dde6', 0.18), { name: 'Pivot', pos: [0, 0.027, 0], segments: 16 }));
  return g;
}
/** The plunger rod in the shooter lane: tip at the origin, rod toward the player (+z in field space). */
export function plunger(THREE, kit, D) { const g = kit.group('Plunger'); g.add(kit.cylinder(0.011, 0.011, 0.012, kit.mat.rubber('#f4f4f4'), { name: 'Tip', pos: [0, 0, 0.006], rot: [90, 0, 0], segments: 16 })); g.add(kit.cylinder(0.005, 0.005, 0.12, kit.mat.metal('#d9dde6', 0.18), { name: 'Rod', pos: [0, 0, 0.07], rot: [90, 0, 0], segments: 12 })); return g; }

// ---------- the lights: each is its own small model, already in its place; the app only shows or hides it ----------
const disc = (THREE, D, f, x, y, r, mat, name, h = 0.0012) => { const g = new THREE.CircleGeometry(r, 28); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); const p = at(D, x, y, h); m.position.set(...p); m.name = name; f.add(m); return m; };
export function lights(THREE, kit, D) {
  const out = {}; const mk = (name) => { const root = kit.group(name); const f = field(THREE, D, name + 'Field'); root.add(f); out[name] = root; return f; };
  D.lanes.forEach((x, i) => disc(THREE, D, mk('lane' + i), x, (D.laneY0 + D.laneY1) / 2 - 0.045, 0.0135, glow(THREE, 'LaneLight', YELLOW, 2.2), 'LaneLight'));
  D.targets.forEach((t, i) => { const letter = 'PUFF'[i], col = i < 2 ? CYAN : PINK;
    const tex = kit.canvasTexture(128, 128, (c, w) => { c.fillStyle = col; c.fillRect(0, 0, w, w); c.fillStyle = '#ffffff'; c.font = '900 96px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(letter, w / 2, w / 2 + 6); });
    disc(THREE, D, mk('letter' + i), t[0] + t[2] * 0.045, t[1], 0.0165, lit(THREE, 'Letter' + i, tex, 1.8), 'LetterLight'); });
  D.bumpers.forEach(([x, y], i) => { const f = mk('bumper' + i); const p = at(D, x, y);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(D.bumperR + 0.006, D.bumperR + 0.006, 0.01, 40), glow(THREE, 'BumperFlash', '#ffffff', 3.0)); c.position.set(p[0], 0.047, p[2]); c.name = 'BumperFlash'; f.add(c);
    const r = new THREE.Mesh(new THREE.TorusGeometry(D.bumperR + 0.016, 0.004, 10, 40), glow(THREE, 'BumperRing', PINK, 2.4)); r.rotation.x = Math.PI / 2; r.position.set(p[0], 0.004, p[2]); r.name = 'BumperRing'; f.add(r); });
  for (const side of [0, 1]) { const f = mk('sling' + side); const X = (v) => (side ? D.fieldR - v : v) - D.W / 2;
    const sh = new THREE.Shape(); sh.moveTo(X(0.078), -0.336); sh.lineTo(X(0.148), -0.2); sh.lineTo(X(0.078), -0.216); sh.closePath(); const geo = new THREE.ShapeGeometry(sh); geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: 'SlingFlash', color: 0x331122, emissive: new THREE.Color(YELLOW), emissiveIntensity: 2.4, side: THREE.DoubleSide })); m.position.y = 0.0345; m.name = 'SlingFlash'; f.add(m); }
  { const f = mk('saucer'); const t = new THREE.Mesh(new THREE.TorusGeometry(D.saucerR + 0.006, 0.004, 10, 36), glow(THREE, 'SaucerGlow', YELLOW, 2.6)); const p = at(D, D.saucer[0], D.saucer[1], 0.004); t.rotation.x = Math.PI / 2; t.position.set(...p); t.name = 'SaucerGlow'; f.add(t); }
  // ball-save light between the flippers, and the three multiball lights round the cloud
  disc(THREE, D, mk('save'), D.cx, 0.07, 0.016, glow(THREE, 'SaveLight', MINT, 2.4), 'SaveLight');
  { const f = mk('multiball'); for (const [dx, dy] of [[-0.06, 0], [0.06, 0], [0, 0.05]]) disc(THREE, D, f, D.cx + dx, 0.5 + dy, 0.011, glow(THREE, 'MultiLight', PINK, 2.6), 'MultiLight'); }
  // the bonus multiplier row ×2 … ×6, above the flippers
  for (let k = 2; k <= 6; k++) { const tex = kit.canvasTexture(96, 96, (c, w) => { c.fillStyle = MINT; c.fillRect(0, 0, w, w); c.fillStyle = '#12052e'; c.font = '900 50px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×' + k, w / 2, w / 2 + 3); });
    disc(THREE, D, mk('mult' + k), D.cx + (k - 4) * 0.031, 0.2, 0.0125, lit(THREE, 'Mult' + k, tex, 1.6), 'MultLight'); }
  return out;
}
