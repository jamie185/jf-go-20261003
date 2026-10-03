/* Photo-to-3D look-around scene. A real photo plus an AI depth map becomes a displaced mesh seen from where the
   camera stood, so turning the phone gives true parallax and anything placed "behind" a machine is hidden by it
   (the depth buffer does the occlusion). Used for the gym hunt and the park beam in the prototype.
   createPhotoScene(canvas, {img, depth, hfov, near, far, targets:[{u,v,behind,kind,beam}], onTarget, onCollect}) */
import * as THREE from "../vendor/three/three.module.min.js";
import { buildTrinket, envFor } from "./trinkets.js";

const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = no; i.src = src; });

export const BEAM = { gold: 0xFFC94D, rare: 0x7FC4FF, gym: 0x9BE15D, common: 0xFFFFFF };

export function beamMesh(color = BEAM.gold, height = 8, radius = 0.32) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uFade: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uFade; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float rim=pow(abs(dot(vN,vV)),1.6); float h=vUv.y;
        float fall=(1.-smoothstep(.15,1.,h))*smoothstep(0.,.04,h);
        float streak=.75+.25*sin(h*38.-uTime*5.)*sin(h*9.+uTime*1.3);
        float core=rim*fall*streak; vec3 c=mix(uColor,vec3(1.),rim*.55);
        gl_FragColor=vec4(c*core*1.25*uFade, core*uFade); }`,
  });
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.15, height, 40, 1, true), mat);
  outer.position.y = height / 2; g.add(outer);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.32, radius * 0.4, height, 24, 1, true), mat.clone());
  inner.material.uniforms.uColor.value = new THREE.Color(0xffffff); inner.position.y = height / 2; g.add(inner);
  /* ground glow */
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  const gr = x.createRadialGradient(64, 64, 2, 64, 64, 62); const col = new THREE.Color(color);
  gr.addColorStop(0, `rgba(255,255,255,.95)`); gr.addColorStop(.25, `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},.55)`); gr.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(radius * 7, radius * 7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; g.add(glow);
  g.userData.tick = (t) => { outer.material.uniforms.uTime.value = t; inner.material.uniforms.uTime.value = t * 1.3; };
  g.userData.fade = (f) => { outer.material.uniforms.uFade.value = f; inner.material.uniforms.uFade.value = f; glow.material.opacity = f; };
  return g;
}

export async function createPhotoScene(canvas, o) {
  const [img, dep] = await Promise.all([loadImg(o.img), loadImg(o.depth)]);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101216);
  scene.environment = envFor(renderer);
  const aspectImg = img.width / img.height;
  const hfov = (o.hfov || 72) * Math.PI / 180, tx = Math.tan(hfov / 2), ty = tx / aspectImg;
  const near = o.near || 2.2, far = o.far || 14;

  /* depth samples */
  const dc = document.createElement("canvas"); const DW = 320, DH = Math.round(320 / aspectImg); dc.width = DW; dc.height = DH;
  const dx = dc.getContext("2d", { willReadFrequently: true }); dx.drawImage(dep, 0, 0, DW, DH);
  const dd = dx.getImageData(0, 0, DW, DH).data;
  const depthAt = (u, v) => { const X = Math.min(DW - 1, Math.max(0, Math.round(u * (DW - 1)))), Y = Math.min(DH - 1, Math.max(0, Math.round(v * (DH - 1)))); return dd[(Y * DW + X) * 4] / 255; };
  const distOf = (d) => d < (o.sky ?? -1) ? far * 25 : 1 / (1 / far + (1 / near - 1 / far) * Math.pow(d, o.gamma || 1.15));
  const ray = (u, v, z) => new THREE.Vector3((u * 2 - 1) * tx * z, (1 - v * 2) * ty * z, -z);

  /* displaced photo mesh */
  const SX = 220, SY = Math.round(220 / aspectImg);
  const geo = new THREE.PlaneGeometry(1, 1, SX, SY), pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) { const u = uv.getX(i), v = 1 - uv.getY(i); const p = ray(u, v, distOf(depthAt(u, v))); pos.setXYZ(i, p.x, p.y, p.z); }
  geo.computeVertexNormals();
  const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.needsUpdate = true;
  const photo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scene.add(photo);
  /* a dim world-light so trinkets sit in the room, not on top of it */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, o.light ?? 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(-1, 3, 2); scene.add(sun);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 5000);
  const state = { yaw: o.startYaw || 0, pitch: 0, targetYaw: o.startYaw || 0, targetPitch: 0, t: 0, alive: true };

  /* targets: trinket + beam placed at a photo point, pushed back by `behind` metres so the photo's own geometry hides it */
  const targets = (o.targets || []).map((t) => {
    const d0 = distOf(depthAt(t.u, t.v)); const z = d0 + (t.behind || 0);
    const base = ray(t.u, t.v, z);
    const grp = new THREE.Group(); grp.position.copy(base); scene.add(grp);
    let trinket = null, beam = null;
    if (t.kind) { trinket = buildTrinket(t.kind); trinket.scale.multiplyScalar(t.size || 0.55); trinket.position.y = (t.lift ?? 0.35); grp.add(trinket); }
    if (t.beam) { beam = beamMesh(BEAM[t.beam] || t.beam, t.beamHeight || 9, t.beamRadius || 0.28); grp.add(beam); }
    return { ...t, grp, trinket, beam, world: base.clone() };
  });

  const resize = () => { const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); camera.aspect = w / h;
    /* vertical fov chosen so the photo's height fills the view */
    const c = o.crop ?? 0.86; camera.fov = Math.min(o.vfov || 999, 2 * Math.atan(Math.min(ty * c, tx * c / camera.aspect)) * 180 / Math.PI); camera.updateProjectionMatrix(); };
  resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);

  /* input: drag to look; device orientation when granted */
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, yaw: state.targetYaw, pitch: state.targetPitch, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; const k = 0.0042; drag.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    state.targetYaw = drag.yaw - (e.clientX - drag.x) * k; state.targetPitch = drag.pitch - (e.clientY - drag.y) * k * 0.5; });
  canvas.addEventListener("pointerup", (e) => { const tap = drag && drag.moved < 6; drag = null; if (tap) pick(e); });
  const ray2 = new THREE.Raycaster();
  function pick(e) {
    const r = canvas.getBoundingClientRect(); const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray2.setFromCamera(m, camera);
    for (const t of targets) { if (!t.trinket || !t.grp.visible) continue;
      const centre = t.grp.position.clone().add(new THREE.Vector3(0, t.lift ?? 0.35, 0));
      /* hidden behind the photo's own geometry (a machine, a tree)? then it can't be tapped yet */
      const toT = centre.clone().sub(camera.position), dT = toT.length(); const occ = new THREE.Raycaster(camera.position, toT.normalize(), 0.05, dT - 0.15).intersectObject(photo)[0];
      if (occ) continue;
      const hit = ray2.intersectObject(t.trinket, true)[0]; const sp = centre.clone().project(camera);
      const near2 = sp.z < 1 && Math.hypot(sp.x - m.x, (sp.y - m.y) / camera.aspect) < 0.16;
      if (hit || near2) { o.onCollect && o.onCollect(t); return; } }
  }
  let gyro = null;
  const onOri = (ev) => { if (ev.gamma == null) return; if (!gyro) gyro = { a: ev.alpha || 0, b: ev.beta || 0, yaw: state.targetYaw };
    const da = (((ev.alpha || 0) - gyro.a + 540) % 360) - 180; state.targetYaw = gyro.yaw - da * Math.PI / 180 * 0.9; state.targetPitch = ((ev.beta || 90) - 90) * Math.PI / 180 * 0.5; };
  const enableGyro = async () => { try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) { const p = await DeviceOrientationEvent.requestPermission(); if (p !== "granted") return false; } addEventListener("deviceorientation", onOri); return true; } catch { return false; } };

  const tmp = new THREE.Vector3();
  let raf; const t0 = performance.now();
  const loop = (now) => {
    if (!state.alive) return; const t = (now - t0) / 1000;
    const halfVis = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect); const yawMax = Math.max(0, hfov / 2 - halfVis - (o.margin ?? 0.05));
    state.targetYaw = Math.max(-yawMax, Math.min(yawMax, state.targetYaw)); state.targetPitch = Math.max(-0.12, Math.min(0.12, state.targetPitch));
    state.yaw += (state.targetYaw - state.yaw) * 0.12; state.pitch += (state.targetPitch - state.pitch) * 0.12;
    /* a person turning also shifts a little: translation gives the parallax that reveals what's behind */
    const sway = o.sway ?? 0.55;
    camera.position.set(Math.sin(state.yaw) * sway + Math.sin(t * 0.7) * 0.015, Math.sin(t * 0.9) * 0.01 + (o.eye || 0), 0);
    camera.rotation.set(-state.pitch, -state.yaw, 0, "YXZ"); camera.updateMatrixWorld(true);
    for (const tg of targets) {
      if (tg.trinket) { tg.trinket.rotation.y = t * 0.9; tg.trinket.position.y = (tg.lift ?? 0.35) + Math.sin(t * 1.8) * 0.05; }
      if (tg.beam) tg.beam.userData.tick(t);
      tmp.copy(tg.grp.position).project(camera);
      tg.screen = { x: tmp.x, y: tmp.y, behind: tmp.z > 1 };
    }
    o.onFrame && o.onFrame(targets, state);
    renderer.render(scene, camera); raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return {
    targets, enableGyro, state, camera, scene, renderer,
    look(yaw, smooth) { state.targetYaw = yaw; if (!smooth) state.yaw = yaw; },
    setKind(id, kind) { const t = targets.find((x) => x.id === id); if (!t || !t.trinket || t.kind === kind) return; t.grp.remove(t.trinket); const n = buildTrinket(kind); n.scale.multiplyScalar(t.size || 0.55); n.position.y = t.lift ?? 0.35; t.grp.add(n); t.trinket = n; t.kind = kind; },
    dispose() { state.alive = false; cancelAnimationFrame(raf); ro.disconnect(); removeEventListener("deviceorientation", onOri); renderer.dispose(); },
  };
}
