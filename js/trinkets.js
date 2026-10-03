/* JF Go trinkets: small procedural 3D collectibles (three.js), shared by the prototype, the beam demo and the gym scene.
   mountTrinket(canvas, kind, {spin, size, glow}) -> {setKind, dispose, renderer, scene, camera, group}
   buildTrinket(kind) -> THREE.Group, unit-sized and centred, for use inside another scene. */
import * as THREE from "../vendor/three/three.module.min.js";
import { RoomEnvironment } from "../vendor/three/RoomEnvironment.js";
import { RoundedBoxGeometry } from "../vendor/three/RoundedBoxGeometry.js";

export const CATALOGUE = {
  dumbbell:  { name: "Golden dumbbell", rarity: "Gold",   line: "Heavier than it looks. Lighter than leg day." },
  kettlebell:{ name: "Kettlebell",      rarity: "Common", line: "Swing it, don't curl it." },
  jfi:       { name: "JFI plushie",     rarity: "Rare",   line: "Soft. Still keeping an eye on your steps." },
  shaker:    { name: "Shaker",          rarity: "Common", line: "Still smells faintly of vanilla." },
  medal:     { name: "Park medal",      rarity: "Rare",   line: "For showing up somewhere you didn't have to." },
  key:       { name: "Gym key",         rarity: "Gym",    line: "Only turns up during a session." },
  rope:      { name: "Skipping rope",   rarity: "Common", line: "Tangled, like every one ever." },
  flower:    { name: "Spring wattle",   rarity: "Season", line: "Spring set. Gone in November." },
  crate:     { name: "Sealed crate",    rarity: "Crate",  line: "Opens with steps." },
  crateGold: { name: "Gold crate",      rarity: "Crate",  line: "Opens at 10,000 steps." },
};

const gold = () => new THREE.MeshPhysicalMaterial({ color: 0xF2C14E, metalness: 1, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2 });
const ink = (c = 0x23262E, r = 0.45) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.1, roughness: r, clearcoat: 0.4 });
const chrome = () => new THREE.MeshPhysicalMaterial({ color: 0xD9DEE6, metalness: 1, roughness: 0.18 });

function jfTexture(bg = "#141B33", fg = "#9CC9FF", txt = "JF") {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  g.fillStyle = fg; g.font = "800 120px -apple-system, Inter, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(txt, 128, 136);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function dumbbell() {
  const g = new THREE.Group(), m = gold();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 24), m); bar.rotation.z = Math.PI / 2; g.add(bar);
  for (const s of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.34, 6), m); head.rotation.z = Math.PI / 2; head.position.x = s * 0.58; g.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24), m); cap.rotation.z = Math.PI / 2; cap.position.x = s * 0.78; g.add(cap);
  }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.62, 24), new THREE.MeshPhysicalMaterial({ color: 0xC99A2E, metalness: 1, roughness: 0.55 }));
  grip.rotation.z = Math.PI / 2; g.add(grip);
  g.rotation.set(0.35, 0.5, 0.25); return g;
}
function kettlebell() {
  const g = new THREE.Group(), body = ink(0x1F2025, 0.5);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), body); ball.scale.y = 0.92; g.add(ball);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.08, 40), body); base.position.y = -0.46; g.add(base);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 20, 48, Math.PI * 1.1), body);
  handle.position.y = 0.42; handle.rotation.z = -0.05 * Math.PI; g.add(handle);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.25, 16), body); leg.position.set(s * 0.29, 0.38, 0); g.add(leg); }
  const label = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), new THREE.MeshBasicMaterial({ map: jfTexture("#1F2025", "#9CC9FF") }));
  label.position.set(0, 0, 0.465); g.add(label);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.018, 12, 64), new THREE.MeshPhysicalMaterial({ color: 0x8BD42A, roughness: 0.4 }));
  band.rotation.x = Math.PI / 2; band.position.y = -0.08; band.scale.set(1, 1, 1); g.add(band);
  g.position.y = -0.05; g.rotation.set(0.15, -0.5, 0); return g;
}
function jfi() {
  const g = new THREE.Group();
  const fur = new THREE.MeshPhysicalMaterial({ color: 0x6FB2FF, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xDDEEFF), sheenRoughness: 0.5 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 64, 48), fur); b.scale.set(1, 0.94, 0.9); g.add(b);
  const eyeM = new THREE.MeshPhysicalMaterial({ color: 0x0F1630, roughness: 0.15, clearcoat: 1 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), eyeM); e.scale.set(0.8, 1.15, 0.5); e.position.set(s * 0.17, 0.08, 0.47); g.add(e); }
  const blush = new THREE.MeshBasicMaterial({ color: 0xFF9FB6, transparent: true, opacity: 0.55 });
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), blush); c.position.set(s * 0.3, -0.06, 0.45); c.rotation.y = s * 0.45; g.add(c); }
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), fur); ear.scale.set(0.7, 1.1, 0.5); ear.position.set(s * 0.33, 0.45, 0); ear.rotation.z = -s * 0.5; g.add(ear); }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.012, 8, 80), new THREE.MeshBasicMaterial({ color: 0xBFE0FF, transparent: true, opacity: 0.8 }));
  halo.rotation.x = Math.PI / 2.4; g.add(halo);
  g.rotation.y = -0.25; return g;
}
function shaker() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.9, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.85, roughness: 0.15, thickness: 0.2, side: THREE.DoubleSide }));
  g.add(body);
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.5, 40), new THREE.MeshPhysicalMaterial({ color: 0xF4E3C6, roughness: 0.6 })); liquid.position.y = -0.18; g.add(liquid);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.16, 40), ink(0x1F2025)); lid.position.y = 0.53; g.add(lid);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.14, 24), ink(0x8BD42A, 0.35)); spout.position.set(0.12, 0.66, 0); g.add(spout);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.287, 0.272, 0.26, 40, 1, true, -0.7, 1.4), new THREE.MeshBasicMaterial({ map: jfTexture("#1F2025", "#9CC9FF") }));
  label.position.y = 0.05; g.add(label);
  g.rotation.set(0.15, 0.3, 0.12); return g;
}
function medal() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.07, 64), gold()); disc.rotation.x = Math.PI / 2; disc.position.y = -0.15; g.add(disc);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.28, 48), new THREE.MeshBasicMaterial({ map: jfTexture("#C99A2E", "#FFF4D6") })); face.position.set(0, -0.15, 0.037); g.add(face);
  const rib = new THREE.MeshPhysicalMaterial({ color: 0x4DA3FF, roughness: 0.5, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.65), rib); r.position.set(s * 0.11, 0.38, -0.02); r.rotation.z = s * 0.28; g.add(r); }
  g.rotation.y = -0.3; return g;
}
function key() {
  const g = new THREE.Group(), m = chrome();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 20, 48), m); bow.position.x = -0.42; g.add(bow);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 20), m); shaft.rotation.z = Math.PI / 2; shaft.position.x = 0.18; g.add(shaft);
  for (const [x, h] of [[0.42, 0.18], [0.54, 0.12], [0.3, 0.1]]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.06), m); t.position.set(x, -h / 2 - 0.02, 0); g.add(t); }
  const tag = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.24, 0.04, 4, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x8BD42A, roughness: 0.5 }));
  tag.position.set(-0.78, -0.12, 0); tag.rotation.z = 0.4; g.add(tag);
  g.rotation.set(0.3, 0.4, -0.15); g.position.x = 0.12; return g;
}
function rope() {
  const g = new THREE.Group();
  const pts = []; for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a) * 0.45, Math.cos(a) * 0.32 - 0.1 + Math.sin(a * 3) * 0.04, Math.sin(a * 2) * 0.15)); }
  const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.025, 10, true), new THREE.MeshPhysicalMaterial({ color: 0xFF5E3A, roughness: 0.5 }));
  g.add(cord);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.32, 8, 16), ink(0x1F2025)); h.position.set(s * 0.18, 0.42, 0.05); h.rotation.z = s * 0.3; g.add(h); }
  return g;
}
function flower() {
  const g = new THREE.Group(), y = new THREE.MeshPhysicalMaterial({ color: 0xFFD23F, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xFFF2A8) });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.9, 12), new THREE.MeshPhysicalMaterial({ color: 0x5E8C3A, roughness: 0.6 })); stem.position.y = -0.3; g.add(stem);
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
  for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.075 + rnd() * 0.04, 16, 12), y); const a = rnd() * Math.PI * 2, r = rnd() * 0.32; p.position.set(Math.cos(a) * r, 0.18 + rnd() * 0.3, Math.sin(a) * r); g.add(p); }
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x7FA65A, roughness: 0.6 })); l.scale.set(0.35, 1, 0.12); l.position.set(s * 0.12, -0.35, 0); l.rotation.z = -s * 0.7; g.add(l); }
  return g;
}
function crate(goldCrate = false) {
  const g = new THREE.Group();
  const wood = new THREE.MeshPhysicalMaterial({ color: goldCrate ? 0xE9B949 : 0xD9AE74, metalness: goldCrate ? 0.9 : 0, roughness: goldCrate ? 0.28 : 0.6, clearcoat: 0.5 });
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.75, 0.75, 6, 0.09), wood); g.add(box);
  const strap = goldCrate ? new THREE.MeshPhysicalMaterial({ color: 0x8C6418, metalness: 1, roughness: 0.4 }) : new THREE.MeshPhysicalMaterial({ color: 0x6B4A2B, roughness: 0.5, metalness: 0.2 });
  for (const x of [-0.3, 0.3]) { const s = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.79, 0.79, 3, 0.03), strap); s.position.x = x; g.add(s); }
  const lid = new THREE.Mesh(new RoundedBoxGeometry(0.99, 0.08, 0.79, 3, 0.03), strap); lid.position.y = 0.22; g.add(lid);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: jfTexture("#141B33", "#9CC9FF") })); badge.position.set(0, -0.06, 0.381); g.add(badge);
  g.rotation.set(0.32, -0.55, 0); return g;
}

export function buildTrinket(kind) {
  const f = { dumbbell, kettlebell, jfi, shaker, medal, key, rope, flower, crate: () => crate(false), crateGold: () => crate(true) }[kind] || dumbbell;
  const inner = f(); const g = new THREE.Group(); g.add(inner);
  const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  inner.position.sub(c); const s = 1.25 / Math.max(size.x, size.y, size.z); g.scale.setScalar(s); g.userData.kind = kind; return g;
}

const envs = new WeakMap();
export function envFor(renderer) {
  if (!envs.has(renderer)) envs.set(renderer, new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture);
  return envs.get(renderer);
}

/* A self-contained little stage: a trinket spinning slowly with a soft floor shadow. */
export function mountTrinket(canvas, kind, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.keep });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2.5)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50); camera.position.set(0, 0.25, 3.6); camera.lookAt(0, 0, 0);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2, 3, 2.5); scene.add(key);
  let group = buildTrinket(kind); scene.add(group);
  let shadow;
  if (opts.shadow !== false) {
    const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
    const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(20,30,60,.35)"); gr.addColorStop(1, "rgba(20,30,60,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.82; scene.add(shadow);
  }
  const size = () => { const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  size(); const ro = new ResizeObserver(size); ro.observe(canvas);
  let raf, t0 = performance.now(), alive = true;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tick = (t) => {
    if (!alive) return; const dt = (t - t0) / 1000;
    if (opts.spin !== false && !reduce) { group.rotation.y = dt * (opts.speed || 0.7); group.position.y = Math.sin(dt * 1.6) * 0.05; }
    renderer.render(scene, camera); raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return {
    renderer, scene, camera, get group() { return group; },
    setKind(k) { scene.remove(group); group = buildTrinket(k); scene.add(group); },
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); },
  };
}

/* One shared offscreen renderer turns any trinket into a still PNG (for lists, map markers, crates). */
let snapR = null, snapScene = null, snapCam = null;
const snapCache = new Map();
export function snapshot(kind, px = 256, angle = 0.6) {
  const k = `${kind}:${px}:${angle}`; if (snapCache.has(k)) return snapCache.get(k);
  if (!snapR) {
    const c = document.createElement("canvas"); snapR = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    snapR.toneMapping = THREE.ACESFilmicToneMapping; snapR.toneMappingExposure = 1.05; snapR.setPixelRatio(1);
    snapScene = new THREE.Scene(); snapScene.environment = envFor(snapR);
    const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(2, 3, 2.5); snapScene.add(l);
    snapCam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); snapCam.position.set(0, 0.25, 3.5); snapCam.lookAt(0, 0, 0);
  }
  snapR.setSize(px, px, false);
  const g = buildTrinket(kind); g.rotation.y += angle; snapScene.add(g);
  snapR.render(snapScene, snapCam); const url = snapR.domElement.toDataURL("image/png");
  snapScene.remove(g); snapCache.set(k, url); return url;
}
