/* JF Go clickable prototype. Fixture data around the Chelsea Heights gym (map: OpenStreetMap contributors, ODbL). */
import { mountTrinket, snapshot, CATALOGUE } from "./trinkets.js";
import { createPhotoScene } from "./scene3d.js";
window.__dbg = {};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Math.round(n).toLocaleString("en-AU");
const solo = new URLSearchParams(location.search).has("solo");
if (solo) document.body.classList.add("solo");

/* ------------------------------------------------------------------ fixture world (metres from the gym, x east, y south) */
const W = 3000, H = 4400;
const ME = { x: -153, y: 700 };
const ROUTE = [[-153, 700], [-60, 905], [8, 1092], [75, 1075], [120, 1118], [155, 1150]];
const DROPS = [
  { id: "d1", kind: "dumbbell", rarity: "gold", label: "Gold drop", place: "Heights Park", x: 155, y: 1150, m: 650, steps: 874, pts: 46, crate: "Big crate", route: ROUTE },
  { id: "d2", kind: "kettlebell", rarity: "common", label: "Drop", place: "Beazley Reserve", x: -292, y: 1301, m: 780, steps: 1040, pts: 26, crate: "Small crate" },
  { id: "d3", kind: "shaker", rarity: "common", label: "Drop", place: "Long Beach Trail", x: -485, y: 850, m: 450, steps: 600, pts: 19, crate: null },
  { id: "r1", kind: "jfi", rarity: "rare", label: "Rare drop · this week", place: "Bicentennial Park", x: -615, y: 1437, m: 1050, steps: 1400, pts: 62, crate: "Gold crate", shared: 14 },
];
const GYMS = { CH: { name: "Chelsea Heights", c: "#4DA3FF" }, LB: { name: "Lynbrook", c: "#F5A524" }, BR: { name: "Botanic Ridge", c: "#8C7CF6" } };

/* ------------------------------------------------------------------ small art */
const JF_MARK = `<svg viewBox="0 0 40 40"><path d="M9 11h12v3h-4.2v10.4c0 4.4-2.6 6.6-6.3 6.6H9v-3.3h1.3c2 0 3.1-1 3.1-3.3V14H9z" fill="#9CC9FF"/><path d="M23.5 11H33v3h-6.1v4.5h5.4v3h-5.4V31h-3.4z" fill="#9CC9FF"/></svg>`;
function avatarSVG(size = 56) {
  return `<svg width="${size}" height="${size * 1.25}" viewBox="0 0 80 100">
    <ellipse cx="40" cy="96" rx="20" ry="4" fill="rgba(20,30,60,.22)"/>
    <path d="M18 92c0-16 9-27 22-27s22 11 22 27z" fill="#141B33"/><path d="M33 66h14l-7 6z" fill="#E8B48A"/>
    <text x="40" y="86" text-anchor="middle" font-family="-apple-system,Inter,sans-serif" font-weight="800" font-size="11" fill="#9CC9FF">JF</text>
    <circle cx="40" cy="40" r="23" fill="#E8B48A"/><circle cx="17.5" cy="42" r="4.5" fill="#E8B48A"/><circle cx="62.5" cy="42" r="4.5" fill="#E8B48A"/>
    <path d="M17 38c0-15 10-22 23-22s23 7 23 22c-5-7-13-10-23-10s-18 3-23 10z" fill="#4A3426"/>
    <circle cx="31.5" cy="42" r="3.2" fill="#1B1D23"/><circle cx="48.5" cy="42" r="3.2" fill="#1B1D23"/><circle cx="32.5" cy="41" r="1" fill="#fff"/><circle cx="49.5" cy="41" r="1" fill="#fff"/>
    <path d="M32 52q8 6 16 0" stroke="#8C3A2E" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`;
}

/* ------------------------------------------------------------------ hex blocks (pointy-top, 200 m edge) */
const HEX = 200, SQ3 = Math.sqrt(3);
const hexCenter = (q, r) => [HEX * SQ3 * (q + r / 2), HEX * 1.5 * r];
const hexPath = (cx, cy, s = HEX * 0.965) => { let d = ""; for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); d += (i ? "L" : "M") + (cx + s * Math.cos(a)).toFixed(0) + " " + (cy + s * Math.sin(a)).toFixed(0); } return d + "Z"; };
function hash(a, b) { let h = (a * 374761393 + b * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
const BLOCKS = [];
for (let r = -12; r <= 12; r++) for (let q = -14; q <= 14; q++) {
  const [x, y] = hexCenter(q, r); if (Math.abs(x) > W / 2 + 200 || Math.abs(y) > H / 2 + 200) continue;
  const d = Math.hypot(x, y), n = hash(q + 50, r + 50), n2 = hash(r + 7, q + 91);
  let owner = null, strength = 0;
  const pCH = Math.max(0, 0.95 - d / 2600);
  if (n < pCH) { owner = "CH"; strength = 0.35 + 0.65 * n2; }
  if (x > 650 && n2 < 0.5 + (x - 650) / 1800) { owner = "LB"; strength = 0.3 + 0.6 * n; }
  if (y > 1500 && x > -200 && n < 0.45) { owner = "BR"; strength = 0.3 + 0.5 * n2; }
  if (q === 0 && r === 0) { owner = "CH"; strength = 1; }
  const mine = owner === "CH" && Math.hypot(x - ME.x, y - ME.y) < 900 && n2 > 0.45;
  const home = Math.hypot(x - ME.x, y - ME.y) < HEX * 1.05;
  BLOCKS.push({ q, r, x, y, owner: home ? null : owner, strength, mine: mine && !home, home });
}

/* ------------------------------------------------------------------ the map */
function createMap(el, o = {}) {
  const S = o.scale || 0.5, tilt = o.tilt ?? 50; let rot = o.rot ?? 160;
  el.innerHTML = `<div class="persp"><div class="plane" style="width:${W * S}px;height:${H * S}px">
    <img src="data/map-chelsea.svg" alt="">
    <svg class="hex" viewBox="${-W / 2} ${-H / 2} ${W} ${H}" preserveAspectRatio="none"><g class="hexes"></g><g class="routeg"></g></svg>
    <div class="stands"></div></div></div>${o.fade ? `<div class="fadeTop ${o.fade}"></div>` : ""}`;
  const plane = $(".plane", el), stands = $(".stands", el), hexG = $(".hexes", el), routeG = $(".routeg", el);
  const st = { fx: o.fx ?? ME.x, fy: o.fy ?? ME.y, tx: null, ty: null, mode: "drops" };
  const place = (node, x, y) => { node.style.left = (x + W / 2) * S + "px"; node.style.top = (y + H / 2) * S + "px"; node.style.transform = `rotateZ(${-rot}deg) rotateX(${-tilt}deg)`; };
  const apply = () => {
    const cx = el.clientWidth / 2, cy = el.clientHeight * (o.anchorY ?? 0.56);
    const px = (st.fx + W / 2) * S, py = (st.fy + H / 2) * S;
    plane.style.left = cx - px + "px"; plane.style.top = cy - py + "px"; plane.style.transformOrigin = `${px}px ${py}px`;
    plane.style.transform = `rotateX(${tilt}deg) rotateZ(${rot}deg)`;
  };
  /* blocks */
  hexG.innerHTML = BLOCKS.map((b) => {
    const c = b.owner ? GYMS[b.owner].c : "#9AA3B2";
    const fo = b.owner ? 0.12 + 0.3 * b.strength : 0.05;
    return `<path d="${hexPath(b.x, b.y)}" fill="${c}" fill-opacity="${fo}" stroke="${b.mine ? "#1A5DB3" : c}" stroke-opacity="${b.mine ? 0.9 : b.owner ? 0.5 : 0.25}" stroke-width="${b.mine ? 9 : 4}" ${b.home ? 'stroke-dasharray="18 14"' : ""}/>`;
  }).join("");
  const setMode = (m) => { st.mode = m; hexG.style.opacity = m === "blocks" ? 1 : 0; hexG.style.transition = "opacity .6s"; $$(".drop-stand", el).forEach((d) => d.style.opacity = m === "blocks" ? 0 : 1); };
  /* stands: gym, drops, me */
  const gym = document.createElement("div"); gym.className = "stand"; gym.innerHTML = `<div class="gympin"><div class="tile">${JF_MARK}</div></div>`; place(gym, 0, 0); stands.appendChild(gym);
  const dropNodes = {};
  if (o.drops !== false) for (const d of DROPS) {
    const n = document.createElement("div"); n.className = "stand drop-stand"; n.style.transition = "opacity .5s";
    n.innerHTML = `<div class="beam ${d.rarity}"><i></i><i></i><b></b></div><img class="drop-icon" src="${snapshot(d.kind, 160)}" alt="">${o.tags ? `<div class="tag">${d.place}</div>` : ""}`;
    place(n, d.x, d.y); stands.appendChild(n); dropNodes[d.id] = n;
    n.addEventListener("click", (e) => { e.stopPropagation(); o.onDrop && o.onDrop(d); });
  }
  const me = document.createElement("div"); me.className = "stand"; if (o.me === false) me.style.display = "none"; me.innerHTML = `<div class="me"><div class="ring"></div>${avatarSVG(56)}</div>`; place(me, ME.x, ME.y); stands.appendChild(me);
  /* drag to pan */
  if (o.interactive) {
    let d0 = null;
    el.addEventListener("pointerdown", (e) => { d0 = { x: e.clientX, y: e.clientY, fx: st.fx, fy: st.fy, id: e.pointerId, cap: false }; st.tx = null; });
    el.addEventListener("pointermove", (e) => { if (!d0) return; if (!d0.cap) { if (Math.hypot(e.clientX - d0.x, e.clientY - d0.y) < 6) return; d0.cap = true; el.setPointerCapture(d0.id); } const a = -rot * Math.PI / 180, sx = (e.clientX - d0.x) / S, sy = (e.clientY - d0.y) / S / Math.cos(tilt * Math.PI / 180) * 0.8;
      st.fx = d0.fx - (sx * Math.cos(a) - sy * Math.sin(a)); st.fy = d0.fy - (sx * Math.sin(a) + sy * Math.cos(a)); clampF(); apply(); });
    el.addEventListener("pointerup", () => d0 = null);
  }
  const clampF = () => { st.fx = Math.max(-W / 2 + 300, Math.min(W / 2 - 300, st.fx)); st.fy = Math.max(-H / 2 + 600, Math.min(H / 2 - 300, st.fy)); };
  /* smooth focus */
  let raf;
  const glide = () => { if (st.tx == null) return; st.fx += (st.tx - st.fx) * 0.08; st.fy += (st.ty - st.fy) * 0.08; apply(); if (Math.hypot(st.tx - st.fx, st.ty - st.fy) > 0.5) raf = requestAnimationFrame(glide); else st.tx = null; };
  new ResizeObserver(apply).observe(el); apply(); setMode("drops");
  return {
    el, st, setMode, apply,
    focus(x, y, now) { if (now) { st.fx = x; st.fy = y; st.tx = null; apply(); return; } st.tx = x; st.ty = y; cancelAnimationFrame(raf); raf = requestAnimationFrame(glide); },
    moveMe(x, y) { place(me, x, y); },
    highlight(id) { for (const [k, n] of Object.entries(dropNodes)) n.querySelector(".drop-icon").style.transform = k === id ? "scale(1.25)" : ""; },
    hideDrop(id) { if (dropNodes[id]) dropNodes[id].remove(); delete dropNodes[id]; },
    route(pts, done = 0) {
      if (!pts) { routeG.innerHTML = ""; return; }
      const d = "M" + pts.map((p) => p.join(" ")).join(" L");
      routeG.innerHTML = `<path d="${d}" fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="#1F2025" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 22" />
        <path class="done" d="${d}" fill="none" stroke="#8BD42A" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`;
      const p = routeG.querySelector(".done"); const L = p.getTotalLength(); p.style.strokeDasharray = `${L * done} ${L}`; routeG._len = L;
    },
    routeDone(f) { const p = routeG.querySelector(".done"); if (p) p.style.strokeDasharray = `${routeG._len * f} ${routeG._len}`; },
  };
}

/* ------------------------------------------------------------------ router + scenes */
const SCENES = [
  { id: "lock", t: "The ding", s: "lock", run: () => lockScreen("lunch"),
    n: ["One ding, at most once a day.", "It only comes when you're behind your usual steps for this time of day, in a window you picked (here, lunch), in daylight and dry weather. Never during a session.", "It names a real place near you and how many steps it is. No streak guilt, no countdown."] },
  { id: "challenge", t: "Challenge tab", s: "challenge",
    n: ["It lives in the Challenge tab you already have.", "Go is the live mode of the JF club map. Crates, your gym's blocks and the collection sit in the same list as habits and scoring.", "No new app, no new tab."] },
  { id: "map", t: "Today's drops", s: "map", run: () => mapMode("drops"),
    n: ["Three drops a day, in real parks near you.", "They land on footpaths inside public parks and reserves (from OpenStreetMap), 400 m to 1.5 km from your home area. Never on roads, at schools or on private land.", "Each one shows the walk in steps, not just metres. The rare one is shared by your gym this week: 14 people have found it.", "Tap a drop or the cards along the bottom. Drag the map."] },
  { id: "walk", t: "Walk there", s: "map", run: () => startWalk(),
    n: ["You have to actually be there.", "The drop opens only when your phone's GPS is within about 40 m. It also checks you walked the last 300 m (not a car) and that your step count rose to match. Prizes stay small, so it's not worth cheating.", "Drove most of the way? Walk the last bit and you still get it, at half points."] },
  { id: "cam", t: "Look around", s: "cam", run: () => camFar(),
    n: ["The beam: optional, and it works today.", "Camera plus compass plus GPS, in the web layer JF Coach already uses for the meal scanner. A column of light points toward the drop. The arrow turns you to it.", "This scene is a real park photo turned 3D with an AI depth map, so the trees hide the bottom of the beam. Drag to look around, or tap Use motion on a phone.", "The live camera version is on the explainer page. Try it outside."] },
  { id: "near", t: "You're there", s: "cam", run: () => camNear(),
    n: ["Close enough: it's there on the grass.", "Tap the trinket to collect it. Points follow the walk: 10, plus 2 for every 100 m. Gold drops count double. That's sized against what steps already earn (8,000 steps is 16 points), so drops add to the challenge without swamping workouts and habits."] },
  { id: "collect", t: "Collect", s: "cam", run: () => { camNear(); collectT = setTimeout(() => openCollect(DROPS[0]), 400); },
    n: ["What you get.", "A trinket for the collection, points, and usually a sealed crate.", "The push-ups bonus is optional and honour-based. If people do them, great. The steps are the point."] },
  { id: "crates", t: "Crates", s: "crates", run: () => renderCrates(),
    n: ["Crates open with steps, walked anywhere.", "Inspired by Pokémon Go's eggs: any walk moves it forward, even if you never chase a drop. Apple Health does the counting.", "Everyone gets a free crate every Monday, so even people who never chase a drop get something for their normal walking. You can carry three; drops refill them."] },
  { id: "blocks", t: "Blocks", s: "map", run: () => mapMode("blocks"),
    n: ["Territory, but for gyms.", "The map is cut into blocks about 350 m across. Walk in one and your steps count for your gym. A block belongs to the gym with the most steps in it over the last 7 days, so it fades if nobody walks there.", "Your home block never records you. Others see gym colours only, a day late, never names or paths, and only once 3+ people from a gym have walked a block.", "Scores divide by the square root of members, so small gyms can win."] },
  { id: "gymlock", t: "In-session ding", s: "lock", run: () => lockScreen("gym"),
    n: ["Gabrielle's idea: one in every gym, 3× points.", "It appears as your booked session ends, at that gym, so nobody is on their phone mid-set. The phone dings once, with the clue."] },
  { id: "gym", t: "Find it in the gym", s: "gym", run: () => gymScene(),
    n: ["Hidden behind real equipment.", "This is one Chelsea Heights photo from Snap's club page, given depth by an AI model so it behaves like 3D. The glow sits behind the plate tree, hidden by the machines in front of it. Drag to look around.", "In the real gym: a small JF plaque on a machine, moved weekly by the trainer. The camera recognises it and the trinket pops out on top.", "The clue photo shows the corner. Indoors GPS can't point, so the photo does."] },
  { id: "collection", t: "Collection", s: "collection", run: () => renderGrid(),
    n: ["Sixteen things, then the set changes.", "Small, finishable sets beat an endless catalogue. Seasonal pieces (Spring wattle) leave on a date, which brings people back.", "Trinkets can also unlock JFmoji wearables in the inventory you already have."] },
  { id: "settings", t: "Settings", s: "settings",
    n: ["You choose where and when.", "Home and work areas are suburbs, never addresses. Max distance and step-free places make it work for anyone.", "Nudges are capped at one a day."] },
];
let cur = null, collectT = null;
function show(id) {
  $$(".screen").forEach((s) => { const on = s.id === "s-" + id; if (!on && s.classList.contains("on")) { s.classList.remove("on"); } s.classList.toggle("on", on); });
  $("#app").classList.toggle("dark", id === "lock" || id === "cam" || id === "gym");
  if (id !== "cam") camPause(); if (id !== "gym") gymPause();
}
function scene(id) {
  const sc = SCENES.find((s) => s.id === id) || SCENES[0]; cur = sc.id;
  closeCollect(true); if (sc.id !== "walk") stopWalk(true); clearTimeout(collectT); show(sc.s); sc.run && sc.run();
  $$("#scenes button").forEach((b) => b.classList.toggle("on", b.dataset.id === sc.id));
  $("#notes").innerHTML = `<h3>${sc.n[0]}</h3>${sc.n.slice(1).map((p) => `<p>${p}</p>`).join("")}<p class="tip">Scene ${SCENES.indexOf(sc) + 1} of ${SCENES.length}. Use the arrow keys to step through.</p>`;
  if (!solo) history.replaceState(null, "", "#" + sc.id);
}
$("#scenes").insertAdjacentHTML("beforeend", SCENES.map((s, i) => `<button data-id="${s.id}"><b>${i + 1}</b>${s.t}</button>`).join(""));
$$("#scenes button").forEach((b) => b.onclick = () => scene(b.dataset.id));
addEventListener("keydown", (e) => { const i = SCENES.findIndex((s) => s.id === cur); if (e.key === "ArrowDown" || e.key === "ArrowRight") scene(SCENES[Math.min(SCENES.length - 1, i + 1)].id); if (e.key === "ArrowUp" || e.key === "ArrowLeft") scene(SCENES[Math.max(0, i - 1)].id); });
const BACK = { map: "challenge", cam: "map", walk: "map", near: "map", collect: "map", crates: "challenge", blocks: "challenge", gym: "challenge", collection: "challenge", settings: "challenge", challenge: "lock" };
$$("[data-back]").forEach((b) => b.onclick = () => scene(BACK[cur] || "challenge"));
$$("[data-go]").forEach((b) => b.onclick = () => scene(b.dataset.go));
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); }

/* fit the phone to the window */
function fit() { const d = $("#device"); if (innerWidth <= 760) { d.style.transform = ""; return; } const s = Math.min(1, (innerHeight - 60) / 852); d.style.transform = `scale(${s})`; }
addEventListener("resize", fit); fit();

/* ------------------------------------------------------------------ lock screens */
function lockScreen(kind) {
  const gym = kind === "gym";
  $("#locktime").textContent = gym ? "6:58" : "12:41"; $("#clock").textContent = gym ? "6:58" : "12:41";
  $("#lockdate").textContent = gym ? "Friday 9 October" : "Wednesday 7 October";
  $(".lock .wall").style.backgroundImage = gym ? "url(img/gym-chelsea-heights-07.jpg)" : "url(img/park-02.jpg)"; $(".lock .wall").style.filter = gym ? "blur(2px) brightness(.45) saturate(1.1)" : "";
  const n = gym
    ? { h: "Session done. One more thing", b: "There's a gym drop near the plate tree by the red pillar. Worth 3× today.", go: "gym" }
    : { h: "Lunch walk?", b: "A drop landed in Heights Park. About 870 steps from you.", go: "map" };
  $("#lockstack").innerHTML = `<div class="notif" style="top:${gym ? 300 : 300}px"><div class="ai">${JF_MARK}</div><div class="nt"><div class="h">${n.h}<span>now</span></div>${n.b}</div></div>`;
  $(".lock .notif").onclick = () => scene(n.go);
}

/* ------------------------------------------------------------------ challenge card mini map */
$("#heroAv").innerHTML = avatarSVG(62);
$("#rowCrate").src = snapshot("crate", 120, 0); $("#rowColl").src = snapshot("jfi", 96);
const mini = createMap($("#miniMap"), { scale: 0.3, tilt: 54, fx: -230, fy: 1000, anchorY: 0.62, drops: true, interactive: false, me: false });
$("#goCard").onclick = () => scene("map");

/* ------------------------------------------------------------------ Go map */
let map = null, sel = DROPS[0], collected = new Set();
function ensureMap() { if (map) return; map = createMap($("#map"), { scale: 0.5, tilt: 50, interactive: true, fade: "", tags: true, onDrop: (d) => select(d) }); }
function select(d) {
  sel = d; map.highlight(d.id); map.focus((ME.x + d.x) / 2, (ME.y + d.y) / 2 + 60);
  $("#dropCard").innerHTML = `<div class="pic ${d.rarity}"><img src="${snapshot(d.kind, 200)}" alt=""></div><div class="t"><small class="${d.rarity}">${d.label}</small><b>${CATALOGUE[d.kind].name}</b><span>${d.place} · ${d.m} m<br><em>About ${fmt(d.steps)} steps</em> · +${d.pts} points${d.shared ? `<br>${d.shared} from your gym have found it` : ""}</span></div>`;
  $$("#others button").forEach((b) => b.classList.toggle("on", b.dataset.id === d.id));
}
function renderOthers() {
  $("#others").innerHTML = DROPS.filter((d) => !collected.has(d.id)).map((d) => `<button data-id="${d.id}"><img src="${snapshot(d.kind, 96)}" alt=""><div>${d.place}<span>${fmt(d.steps)} steps</span></div></button>`).join("");
  $$("#others button").forEach((b) => b.onclick = () => select(DROPS.find((d) => d.id === b.dataset.id)));
}
function mapMode(m) {
  ensureMap(); stopWalk(true);
  $$("#seg button").forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
  map.setMode(m); map.route(null); map.moveMe(ME.x, ME.y);
  $("#sheetDrops").classList.toggle("hide", m !== "drops"); $("#sheetBlocks").classList.toggle("hide", m !== "blocks"); $("#sheetWalk").classList.add("hide");
  if (m === "drops") { renderOthers(); select(DROPS.find((d) => !collected.has(d.id)) || DROPS[0]); }
  else { map.focus(150, 500); renderBoard(); }
  setSteps(6214);
}
$$("#seg button").forEach((b) => b.onclick = () => { cur = b.dataset.mode === "blocks" ? "blocks" : "map"; mapMode(b.dataset.mode); });
function setSteps(n) { $("#stepsNum").textContent = fmt(n); $("#stepsArc").style.strokeDashoffset = 88 - 88 * Math.min(1, n / 8100); }
function renderBoard() {
  const rows = [["CH", "Chelsea Heights", 214, 18, "You walked 31 of them"], ["LB", "Lynbrook", 166, 12, "Up 9 this week"], ["BR", "Botanic Ridge", 131, 10, "6 new blocks this week"]];
  $("#board").innerHTML = rows.map(([k, n, b, m, s], i) => `<div class="r ${k === "CH" ? "mine" : ""}"><div class="n">${i + 1}</div><div class="hx" style="background:${GYMS[k].c}"></div><div class="g">${n}<span>${m} walkers · ${s}</span></div><div class="s">${(b / Math.sqrt(m)).toFixed(1)}<small>score · ${b} blocks</small></div></div>`).join("");
}

/* walking: the avatar follows the route, steps count up */
let walkRaf = null;
function stopWalk(silent) { cancelAnimationFrame(walkRaf); walkRaf = null; if (!silent) mapMode("drops"); }
function startWalk() {
  ensureMap(); const d = sel && !collected.has(sel.id) ? sel : DROPS[0];
  mapMode("drops"); select(d); cur = "walk";
  $("#sheetDrops").classList.add("hide"); $("#sheetWalk").classList.remove("hide");
  const pts = d.route || [[ME.x, ME.y], [d.x, d.y]];
  map.route(pts, 0); $("#wTo").textContent = "to " + d.place;
  const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  const at = (f) => { let t = f * L; for (let i = 0; i < seg.length; i++) { if (t <= seg[i]) { const k = t / seg[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } t -= seg[i]; } return pts[pts.length - 1]; };
  const arrive = $("#btnArrive"); arrive.style.opacity = .35; arrive.style.pointerEvents = "none"; arrive.textContent = "Opens within 40 m"; $("#btnSee").style.display = "none";
  const dur = 13000, t0 = performance.now();
  const step = (now) => {
    const f = Math.min(1, (now - t0) / dur), e = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    const [x, y] = at(e); map.moveMe(x, y); map.focus(x, y + 80, true); map.routeDone(e);
    const left = Math.max(0, d.m * (1 - e));
    $("#wSteps").textContent = fmt(d.steps * e); $("#wDist").textContent = left < 40 ? "Here" : Math.round(left / 10) * 10 + " m"; $("#wBar").style.width = e * 100 + "%";
    setSteps(6214 + d.steps * e);
    if (left < 40 && arrive.style.pointerEvents !== "auto") { arrive.style.opacity = 1; arrive.style.pointerEvents = "auto"; arrive.textContent = "Collect"; $("#btnSee").style.display = ""; }
    if (f < 1) walkRaf = requestAnimationFrame(step); else { walkRaf = null; toast("You're at Heights Park. Collect it, or see it in the camera."); }
  };
  walkRaf = requestAnimationFrame(step);
}
$("#btnWalk").onclick = () => startWalk();
$("#btnStop").onclick = () => { cur = "map"; stopWalk(); };
$("#btnArrive").onclick = () => openCollect(sel || DROPS[0]);
$("#btnSee").onclick = () => scene("near");
$("#btnLook").onclick = () => scene("cam");

/* ------------------------------------------------------------------ camera: park beam */
let cam = null, camP = null, camState = "far";
async function ensureCam() {
  if (cam) return cam;
  if (camP) return camP;
  camP = createPhotoScene($("#camGL"), {
    img: "img/park-02.jpg", depth: "img/park-02-depth.png", sky: 0.035, hfov: 74, near: 1.5, far: 45, gamma: 1.3, sway: 0.3, margin: 0.09, eye: 0, light: 1.3,
    targets: [
      { id: "far", u: 0.315, v: 0.475, behind: 9, beam: "gold", beamHeight: 30, beamRadius: 0.6 },
      { id: "near", u: 0.66, v: 0.66, behind: 0.2, kind: "dumbbell", size: 0.62, lift: 0.5, beam: "gold", beamHeight: 6, beamRadius: 0.18 },
    ],
    onFrame: camFrame, onCollect: (t) => { if (t.id === "near" && camState === "near") openCollect(sel || DROPS[0]); },
  }).then((c) => (cam = c));
  return camP;
}
let lastCamFrame = 0;
function camFrame(targets, state) {
  const tgt = targets.find((t) => t.id === (camState === "far" ? "far" : "near")); if (!tgt || !tgt.screen) return;
  const s = tgt.screen, arrow = $("#camArrow"), ret = $("#camRet");
  edgeArrow(arrow, s, $("#s-cam"));
  const r = { width: $("#s-cam").clientWidth, height: $("#s-cam").clientHeight };
  const inView = Math.abs(s.x) < 0.75 && !s.behind;
  ret.style.opacity = camState === "near" && inView ? 1 : 0;
  ret.style.left = ((s.x + 1) / 2) * r.width + "px"; ret.style.top = ((1 - s.y) / 2) * r.height - 30 + "px";
  if (performance.now() - lastCamFrame > 300) { lastCamFrame = performance.now();
    $("#camHint").textContent = camState === "far" ? (inView ? "That's it, behind the trees. Keep walking toward the light." : "Turn until the light is in front of you. Drag to look around.") : (inView ? "Tap it to collect." : "It's close. Look around for the glow.");
  }
}
function edgeArrow(arrow, s, host) {
  const r = { width: host.clientWidth, height: host.clientHeight };
  const off = Math.abs(s.x) > 0.8 || s.behind;
  arrow.style.opacity = off ? 1 : 0;
  if (!off) return;
  const right = s.behind ? s.x < 0 : s.x > 0;
  arrow.style.left = (right ? r.width - 44 : 44) + "px"; arrow.style.top = r.height * 0.5 + "px";
  arrow.querySelector("svg").style.transform = right ? "" : "rotate(180deg)";
}
async function camFar() {
  camState = "far"; const c = await ensureCam(); resumeScene(c); if (camState !== "far") return;
  c.targets.find((t) => t.id === "near").grp.visible = false; c.targets.find((t) => t.id === "far").grp.visible = true;
  c.look(-0.3); $("#camDist").innerHTML = `<b>180 m</b><span>${CATALOGUE[(sel || DROPS[0]).kind].name} · ${(sel || DROPS[0]).place}</span>`;
  $("#camCloser").style.display = "";
}
async function camNear() {
  camState = "near"; const c = await ensureCam(); resumeScene(c); if (camState !== "near") return; c.setKind("near", (sel || DROPS[0]).kind);
  c.targets.find((t) => t.id === "near").grp.visible = true; c.targets.find((t) => t.id === "far").grp.visible = false;
  c.look(0.3); $("#camDist").innerHTML = `<b>12 m</b><span>It's here. Tap to collect</span>`;
  $("#camCloser").style.display = "none";
}
$("#camCloser").onclick = () => scene("near");
function resumeScene(c) { if (!c.state.running) { c.state.running = true; } }
function camPause() {}
function gymPause() {}
async function gyroOn(c, btn) { const ok = await c.enableGyro(); btn.textContent = ok ? "Following your phone" : "Motion not available"; }
$("#gyroBtn").onclick = async () => gyroOn(await ensureCam(), $("#gyroBtn"));

/* ------------------------------------------------------------------ collect sheet */
let stageT = null;
function openCollect(d, opts = {}) {
  const k = d.kind, c = CATALOGUE[k];
  $("#cName").textContent = c.name; $("#cFlav").textContent = c.line;
  $("#cStage").className = "stagec " + (opts.gym ? "gym" : d.rarity === "rare" ? "rare" : "");
  $("#cPts").textContent = "+" + (opts.pts || d.pts);
  $("#cSteps").textContent = opts.gym ? "3×" : fmt(d.steps); $("#cSteps").nextElementSibling.textContent = opts.gym ? "session drop" : "steps to get here";
  $("#cBlocks").textContent = opts.gym ? "1" : "4"; $("#cBlocks").nextElementSibling.textContent = opts.gym ? "of 1 this week" : "blocks walked";
  $("#cCrate").style.display = d.crate ? "" : "none";
  if (d.crate) { $("#cCrateImg").src = snapshot(d.crate === "Gold crate" ? "crateGold" : "crate", 96); $("#cCrate .t").innerHTML = `${d.crate} added<span>Opens after ${d.crate === "Big crate" ? "5,000" : d.crate === "Gold crate" ? "10,000" : "2,000"} more steps, anywhere</span>`; }
  $("#cBonus").style.display = opts.gym ? "none" : ""; $("#cBonusBtn").textContent = "+20"; $("#cBonusBtn").disabled = false;
  $("#collect").classList.add("on");
  requestAnimationFrame(() => { if (stageT) stageT.dispose(); stageT = mountTrinket($("#cCanvas"), k, { speed: 0.9 }); burst(opts.gym ? "#9BE15D" : d.rarity === "rare" ? "#79BEFF" : "#FFC94D"); });
  $("#cDone").onclick = () => {
    closeCollect(); collected.add(d.id);
    if (opts.gym) { toast("Gym key added. +" + (opts.pts || d.pts) + " points"); scene("collection"); return; }
    if (map) map.hideDrop(d.id);
    scene("map"); toast(`${c.name} added. ${d.crate ? d.crate + " is sealed." : ""}`);
  };
}
$("#cBonusBtn").onclick = (e) => { e.target.textContent = "Done"; e.target.disabled = true; toast("Nice. +20 points"); };
function closeCollect(instant) { $("#collect").classList.remove("on"); if (stageT && instant) { stageT.dispose(); stageT = null; } }
$("#collect").addEventListener("click", (e) => { if (e.target.id === "collect") closeCollect(); });
function burst(color) {
  const cv = $("#burst"), r = cv.getBoundingClientRect(); cv.width = r.width * 2; cv.height = r.height * 2; const g = cv.getContext("2d");
  const P = Array.from({ length: 46 }, () => ({ a: Math.random() * Math.PI * 2, v: 2 + Math.random() * 7, s: 2 + Math.random() * 4, l: 1 }));
  const cx = cv.width / 2, cy = cv.height * 0.52; let t = 0;
  const f = () => { g.clearRect(0, 0, cv.width, cv.height); t++;
    for (const p of P) { const d = p.v * t * (1 - t / 140); g.globalAlpha = Math.max(0, 1 - t / 70); g.fillStyle = Math.random() < .3 ? "#fff" : color; g.beginPath(); g.arc(cx + Math.cos(p.a) * d * 2, cy + Math.sin(p.a) * d * 2 + t * t * 0.02, p.s, 0, 7); g.fill(); }
    if (t < 70) requestAnimationFrame(f); else g.clearRect(0, 0, cv.width, cv.height); };
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) f();
}

/* ------------------------------------------------------------------ crates */
function renderCrates() {
  const rows = [
    { k: "crateGold", n: "Gold crate", have: 6870, need: 10000, from: "Rare drop, Bicentennial Park" },
    { k: "crate", n: "Big crate", have: 5000, need: 5000, from: "Monday crate" },
    { k: "crate", n: "Small crate", have: 214, need: 2000, from: "Drop, Long Beach Trail" },
  ];
  $("#crateList").innerHTML = rows.map((c, i) => `<div class="crate" data-i="${i}"><div class="img"><img src="${snapshot(c.k, 200, 0)}" alt=""></div><div class="t"><b>${c.n}</b><span>${c.have >= c.need ? "Ready to open" : fmt(c.need - c.have) + " steps to go · " + c.from}</span><div class="bar"><i style="width:${Math.min(100, (c.have / c.need) * 100)}%"></i></div></div>${c.have >= c.need ? `<button class="open">Open</button>` : ""}</div>`).join("");
  const ob = $("#crateList .open");
  if (ob) ob.onclick = () => { const row = ob.closest(".crate"); row.querySelector(".img img").style.transition = "transform .5s"; row.querySelector(".img img").style.transform = "scale(1.3) rotate(-8deg)";
    setTimeout(() => openCollect({ kind: "medal", rarity: "rare", pts: 30, steps: 5000, crate: null, id: "crate" }), 450); };
}

/* ------------------------------------------------------------------ gym hunt */
let gym = null, gymP = null;
async function gymScene() {
  if (!gym) {
    if (gymP) { await gymP; gym.look(0.13); return; }
    gymP = createPhotoScene($("#gymGL"), {
      img: "img/gym-chelsea-heights-07.jpg", depth: "img/gym-chelsea-heights-07-depth.png", hfov: 78, near: 1.6, far: 16, gamma: 1.1, sway: 0.6, light: 1.0,
      targets: [{ id: "key", u: 0.637, v: 0.6, behind: 0.9, kind: "key", size: 0.5, lift: 0.45, beam: "gym", beamHeight: 3.2, beamRadius: 0.22 }],
      onFrame: (ts) => { const t = ts[0]; if (!t.screen) return; edgeArrow($("#gymArrow"), t.screen, $("#s-gym"));
        const r = { width: $("#s-gym").clientWidth, height: $("#s-gym").clientHeight }, inView = Math.abs(t.screen.x) < 0.7;
        $("#gymRet").style.opacity = inView ? 1 : 0; $("#gymRet").style.left = ((t.screen.x + 1) / 2) * r.width + "px"; $("#gymRet").style.top = ((1 - t.screen.y) / 2) * r.height - 25 + "px";
        $("#gymHint").textContent = inView ? "Behind the plate tree. Tap it, or drag to see around the machine." : "Something's glowing behind the machines. Drag to look around."; },
      onCollect: () => openCollect({ kind: "key", rarity: "gym", pts: 45, steps: 0, crate: "Small crate", id: "gymkey" }, { gym: true, pts: 45 }),
    }); gym = await gymP;
    const clue = $("#clueImg"); if (clue) { const div = document.createElement("div");
    div.style.cssText = "width:128px;height:96px;background:url(img/gym-chelsea-heights-07.jpg) 66% 62%/520% auto no-repeat";
    clue.replaceWith(div); }
  }
  gym.look(0.13); window.__dbg.gym = gym;
}
$("#gymGyro").onclick = async () => { if (gym) gyroOn(gym, $("#gymGyro")); };

/* ------------------------------------------------------------------ collection */
function renderGrid() {
  const found = ["dumbbell", "kettlebell", "jfi", "shaker", "medal", "key", "rope", "flower"];
  const locked = ["Foam roller", "Chalk bag", "Myki card", "Footy", "Long black", "Sweat towel", "Water bottle", "Resistance band"];
  $("#grid").innerHTML = found.map((k) => `<div class="it"><img src="${snapshot(k, 180)}" alt=""><b>${CATALOGUE[k].name}</b><span>${CATALOGUE[k].rarity}</span></div>`).join("")
    + locked.map((n) => `<div class="it locked"><div style="width:76px;height:76px;margin:0 auto 4px;border-radius:38px;border:1.5px dashed #D3D8E1;display:grid;place-items:center;color:#B7BECB;font:700 22px/1 var(--fd)">?</div><b>${n}</b><span>Not found yet</span></div>`).join("");
}

/* ------------------------------------------------------------------ go */
const start = (location.hash || "").slice(1);
scene(SCENES.some((s) => s.id === start) ? start : "lock");
addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h && h !== cur) scene(h); });
