(() => {
  "use strict";
  const D = window.GAME_DATA;
  // ---------- Characters ----------
  let CHAR = D.characters[0];
  const heroImgs = {};
  D.characters.forEach((c) => { const im = new Image(); im.src = c.hero.photo; heroImgs[c.id] = im; });
  function setCharacter(id) {
    CHAR = D.characters.find((c) => c.id === id) || D.characters[0];
    D.hero = CHAR.hero; D.weapon = CHAR.weapon;
    try { localStorage.setItem("viktor-char", CHAR.id); } catch (e) {}
  }
  let savedChar = D.defaultCharacter;
  try { savedChar = localStorage.getItem("viktor-char") || savedChar; } catch (e) {}
  setCharacter(savedChar);
  const T = D.text;
  const $ = (id) => document.getElementById(id);

  // ---------- Canvas ----------
  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1, F = 1, HORIZON = 0, CX = 0;
  let bg = null; // pre-rendered background

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    HORIZON = H * 0.40;
    CX = W / 2;
    F = Math.min(H, W * 1.6) * 0.9 * D.world.focal;
    renderBackground();
  }

  // world -> screen
  const groundY = (d) => HORIZON + (F * D.world.cameraHeight) / d;
  const screenX = (x, d) => CX + (F * x) / d;
  const sizeAt = (worldH, d) => (F * worldH) / d;

  // ---------- Background ----------
  function renderBackground() {
    bg = document.createElement("canvas");
    bg.width = canvas.width; bg.height = canvas.height;
    const g = bg.getContext("2d");
    g.scale(DPR, DPR);
    const w = D.world;

    // sky
    const sky = g.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, w.sky[0]); sky.addColorStop(1, w.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, W, HORIZON + 2);
    // sun
    g.fillStyle = "#fff6c8"; g.beginPath(); g.arc(W * 0.78, HORIZON * 0.3, Math.min(W, H) * 0.06, 0, 7); g.fill();
    // clouds
    g.fillStyle = "#ffffffcc";
    [[0.2, 0.25], [0.55, 0.15], [0.9, 0.45]].forEach(([fx, fy]) => {
      const x = W * fx, y = HORIZON * fy, r = Math.min(W, H) * 0.035;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r, y - r * 0.4, r * 1.2, 0, 7); g.arc(x + r * 2.1, y, r * 0.9, 0, 7); g.fill();
    });
    // hills
    g.fillStyle = w.hills; g.beginPath(); g.moveTo(0, HORIZON);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, HORIZON - 18 - Math.sin(x * 0.012) * 12 - Math.sin(x * 0.031 + 1) * 6);
    g.lineTo(W, HORIZON); g.fill();
    // tree line
    g.fillStyle = w.trees;
    for (let x = -10; x < W + 10; x += 14) {
      const r = 9 + ((x * 7919) % 7);
      g.beginPath(); g.arc(x, HORIZON - r * 0.6, r, 0, 7); g.fill();
    }
    // floodlight poles
    g.strokeStyle = "#9aa"; g.lineWidth = 2;
    [0.1, 0.92].forEach((fx) => {
      g.beginPath(); g.moveTo(W * fx, HORIZON); g.lineTo(W * fx, HORIZON * 0.35); g.stroke();
      g.fillStyle = "#ccd"; g.fillRect(W * fx - 7, HORIZON * 0.35 - 5, 14, 6);
    });
    // grass mowing stripes in perspective
    g.fillStyle = w.grass[0]; g.fillRect(0, HORIZON, W, H - HORIZON);
    for (let d = 60, i = 0; d > 0.6; d -= 2.5, i++) {
      const y1 = groundY(d), y2 = groundY(Math.max(d - 2.5, 0.6));
      g.fillStyle = w.grass[i % 2];
      g.fillRect(0, y1, W, Math.min(y2, H) - y1 + 1);
      if (y2 > H) break;
    }
    // field lines
    g.strokeStyle = "#ffffffaa"; g.lineWidth = 2;
    [-9, 9].forEach((x) => { g.beginPath(); g.moveTo(screenX(x, 60), groundY(60)); g.lineTo(screenX(x, 1), groundY(1)); g.stroke(); });
    [10, 22].forEach((d) => { g.beginPath(); g.moveTo(screenX(-9, d), groundY(d)); g.lineTo(screenX(9, d), groundY(d)); g.stroke(); });
    // rugby goal posts
    const gd = 40, py = groundY(gd);
    g.strokeStyle = "#fff"; g.lineWidth = Math.max(2, sizeAt(0.12, gd));
    [-2.8, 2.8].forEach((x) => { g.beginPath(); g.moveTo(screenX(x, gd), py); g.lineTo(screenX(x, gd), py - sizeAt(9, gd)); g.stroke(); });
    g.beginPath(); g.moveTo(screenX(-2.8, gd), py - sizeAt(3, gd)); g.lineTo(screenX(2.8, gd), py - sizeAt(3, gd)); g.stroke();
  }

  // ---------- Audio (synthesized, no files) ----------
  let actx = null;
  function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return actx; }
  function noise(dur, freq, vol) {
    const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq;
    const gn = a.createGain(); gn.gain.value = vol;
    src.connect(f).connect(gn).connect(a.destination); src.start();
  }
  function tone(f1, f2, dur, vol, type = "square") {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), gn = a.createGain(); o.type = type;
    o.frequency.setValueAtTime(f1, a.currentTime); o.frequency.exponentialRampToValueAtTime(f2, a.currentTime + dur);
    gn.gain.setValueAtTime(vol, a.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(gn).connect(a.destination); o.start(); o.stop(a.currentTime + dur);
  }
  const sfx = {
    shot: () => D.weapon.look === "money" ? (noise(0.05, 4000, 0.22), tone(1400, 900, 0.04, 0.03, "triangle")) : noise(0.18, 2200, 0.5),
    empty: () => tone(900, 700, 0.05, 0.08),
    reload: () => { tone(300, 200, 0.08, 0.1); setTimeout(() => tone(500, 400, 0.08, 0.1), 2700); },
    bark: () => { tone(700, 380, 0.09, 0.15, "square"); setTimeout(() => tone(760, 420, 0.1, 0.15, "square"), 130); },
    sweep: () => { noise(0.9, 900, 0.5); tone(200, 80, 0.6, 0.12, "triangle"); },
    whistle: () => tone(1800, 500, 0.7, 0.05, "sine"),
    boom: () => { noise(1.4, 300, 0.9); tone(90, 30, 1.0, 0.3, "sawtooth"); },
    shotgun: () => { noise(0.35, 1500, 0.8); tone(160, 60, 0.25, 0.15, "sawtooth"); tone(1600, 1000, 0.08, 0.05, "triangle"); },
    cash: () => { tone(1500, 1500, 0.06, 0.08, "square"); setTimeout(() => tone(2000, 2000, 0.12, 0.08, "square"), 70); },
    horn: () => { tone(330, 320, 0.35, 0.12, "square"); setTimeout(() => tone(262, 255, 0.45, 0.12, "square"), 380); },
    squash: () => { tone(220, 60, 0.18, 0.12, "triangle"); noise(0.12, 800, 0.2); },
    ready: () => { tone(600, 900, 0.12, 0.1, "triangle"); setTimeout(() => tone(900, 1300, 0.15, 0.1, "triangle"), 120); },
    hit: () => tone(500, 120, 0.15, 0.08, "triangle"),
    death: () => { tone(300, 40, 1.2, 0.2, "sawtooth"); noise(0.6, 400, 0.4); }
  };

  // ---------- Game state ----------
  const S = {
    state: "menu", // menu | playing | dying | over
    time: 0, kills: 0, score: 0,
    ammo: D.weapon.magazine, reloading: 0, cooldown: 0,
    enemies: [], particles: [], tracers: [],
    spawnTimer: 0, spawnInterval: D.spawn.startInterval,
    aim: { x: 0, y: 0 }, recoil: 0, flash: 0,
    deathT: 0, shake: 0,
    broomCharge: 0, broomAiming: false, broomAim: null, broomHold: false, sweep: null, power: null, nukes: [], booms: [], nukeTimer: 0, whiteFlash: 0, tractor: null, tractorCharge: 0, dolla: null, shotgun: false,
      dog: null, milenaSpawned: false, banner: null
  };

  function reset() {
    Object.assign(S, {
      state: "playing", time: 0, kills: 0, score: 0,
      ammo: D.weapon.magazine, reloading: 0, cooldown: 0,
      enemies: [], particles: [], tracers: [],
      spawnTimer: 0.5, spawnInterval: D.spawn.startInterval,
      recoil: 0, flash: 0, deathT: 0, shake: 0,
      broomCharge: 0, broomAiming: false, broomAim: null, broomHold: false, sweep: null, power: null, nukes: [], booms: [], nukeTimer: 0, whiteFlash: 0, tractor: null, tractorCharge: 0, dolla: null, shotgun: false,
      dog: null, milenaSpawned: false, banner: null
    });
    S.aim = { x: CX, y: HORIZON };
    $("hud").classList.remove("hidden"); $("broom").classList.toggle("hidden", !(CHAR.broom || CHAR.nuke)); S.hold = null;
    D.hero = CHAR.hero; document.querySelector("#broom .ico").textContent = CHAR.nuke ? "☢️" : "🧹";
    $("tractorBtn").classList.toggle("hidden", !(CHAR.tractor || CHAR.dolla));
    document.querySelector("#tractorBtn .ico").textContent = CHAR.dolla ? "💵" : "🚜"; updateTractorBtn();
    updateHud(); updateBroomBtn();
  }

  function spawnHorde() {
    const sp = D.spawn, en = D.enemy;
    const size = Math.min(sp.maxHordeSize, sp.startHordeSize + Math.floor(S.time / sp.hordeGrowthEvery));
    const speed = Math.min(en.maxSpeed, en.baseSpeed + en.speedGrowth * S.time);
    for (let i = 0; i < size; i++) {
      S.enemies.push({
        x0: (Math.random() * 2 - 1) * sp.spreadX,
        lane: (Math.random() * 2 - 1) * 0.9,
        d: sp.spawnDepth + Math.random() * 6,
        speed: speed * (0.85 + Math.random() * 0.3),
        hp: en.hp * (D.weapon.shotsToKill || 1), phase: Math.random() * 6.28,
        hitT: 0, dead: false, deadT: 0, fallDir: Math.random() < 0.5 ? -1 : 1,
        bounty: S.dolla ? randBounty() : 0
      });
    }
  }

  // enemy world x converges toward Viktor as they get closer
  const enemyX = (e) => e.x0 * (e.d / D.spawn.spawnDepth) * 0.9 + e.lane;

  function enemyBox(e) {
    const h = sizeAt(D.world.personHeight, e.d), fy = groundY(e.d), sx = screenX(enemyX(e), e.d);
    return { sx, fy, h, x1: sx - h * 0.17, x2: sx + h * 0.17, y1: fy - h, y2: fy };
  }

  // ---------- Viktor geometry ----------
  function heroGeom() {
    const u = Math.min(H * 0.42, W * 0.75);
    const y0 = H - u * 0.62;        // shoulder line
    const stock = { x: CX + u * 0.24, y: y0 + u * 0.08 };
    let dx = S.aim.x - stock.x, dy = S.aim.y - stock.y;
    if (dy > -20) dy = -20;
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const back = S.recoil * u * 0.06;
    stock.x -= dx * back; stock.y -= dy * back;
    const gunLen = u * 0.55;
    const muzzle = { x: stock.x + dx * gunLen, y: stock.y + dy * gunLen };
    return { u, y0, stock, dir: { x: dx, y: dy }, gunLen, muzzle };
  }

  // ---------- Shooting ----------
  function shoot(px, py) {
    if (S.state !== "playing") return;
    S.aim = { x: px, y: py };
    if (S.reloading > 0 || S.cooldown > 0) return;
    if (S.shotgun) { fireShotgun(px, py); return; }
    if (S.ammo <= 0 && !S.power) { sfx.empty(); startReload(); return; }
    if (!S.power) S.ammo--;
    S.cooldown = D.weapon.fireCooldown;
    S.recoil = 1; S.flash = 1; S.shake = Math.max(S.shake, 4);
    sfx.shot();
    fireAt(px, py, false);
    if (S.ammo === 0) startReload();
    updateHud();
  }

  // Petr's shotgun: one blast spends 20 ammo and sprays 20 banknotes around the tap point
  function fireShotgun(px, py) {
    const SG = D.shotgun;
    if (!S.power && S.ammo < SG.ammoPerShot) { S.shotgun = false; updateHud(); return; }
    if (!S.power) S.ammo -= SG.ammoPerShot;
    S.cooldown = SG.cooldown;
    S.recoil = 1.6; S.flash = 1.4; S.shake = Math.max(S.shake, 10);
    sfx.shotgun();
    for (let i = 0; i < SG.pellets; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * SG.spread;
      fireAt(px + Math.cos(a) * r, py + Math.sin(a) * r * 0.7, i > 0);
    }
    if (!S.power && S.ammo < SG.ammoPerShot) S.shotgun = false;
    if (S.ammo === 0) startReload();
    updateHud();
  }

  // one bullet / banknote landing at (px, py)
  function fireAt(px, py, quiet) {
    const pad = D.weapon.hitPadding;
    // shooting the wild Milena makes her join Viktor
    if (S.dog && S.dog.state === "wild") {
      const b = dogBox();
      if (px >= b.x1 - pad && px <= b.x2 + pad && py >= b.y1 - pad * 2 && py <= b.y2 + pad) {
        const g0 = heroGeom();
        S.tracers.push({ x1: g0.muzzle.x, y1: g0.muzzle.y, x2: px, y2: py, t: 0.09 });
        befriendDog(); return;
      }
    }
    // hitscan: nearest living enemy under the tap
    let target = null;
    for (const e of S.enemies) {
      if (e.dead) continue;
      const b = enemyBox(e);
      if (px >= b.x1 - pad && px <= b.x2 + pad && py >= b.y1 - pad && py <= b.y2 + pad) {
        if (!target || e.d < target.d) target = e;
      }
    }
    const g = heroGeom(), money = D.weapon.look === "money";
    if (money) {
      // a banknote flies from the gun to the tap point
      const ft = 0.14;
      S.particles.push({ x: g.muzzle.x, y: g.muzzle.y, vx: (px - g.muzzle.x) / ft, vy: (py - g.muzzle.y) / ft, t: ft, c: "#7bc67e", r: 12, bill: true, rot: Math.random() * 6, life: ft });
    } else S.tracers.push({ x1: g.muzzle.x, y1: g.muzzle.y, x2: px, y2: py, t: 0.09 });
    const spark = money ? "#9be7a1" : "#ffe27a";
    if (target) {
      // splash: everyone standing within splashRadius (world metres) of the target is hit too
      const R = D.weapon.splashRadius, tx = enemyX(target);
      const victims = S.enemies.filter((e) => !e.dead && Math.hypot(enemyX(e) - tx, e.d - target.d) <= R);
      if (!quiet) sfx.hit();
      if (R > 0) S.particles.push({ x: px, y: py, vx: 0, vy: 0, t: 0.25, c: "#ffe27a", r: sizeAt(R, target.d), ring: true });
      for (const v of victims) {
        const vb = enemyBox(v), hx = v === target ? px : vb.sx, hy = v === target ? py : vb.fy - vb.h * 0.6;
        v.hp--; v.hitT = 0.12;
        for (let i = 0; i < 8; i++) S.particles.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.8) * 300, t: 0.4, c: spark, r: 3 });
        if (v.hp <= 0) {
          v.dead = true; S.kills++;
          for (let i = 0; i < 6; i++) S.particles.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 200, t: 0.8, c: "#fff", r: 4, star: true });
        }
      }
    } else {
      S.particles.push({ x: px, y: py, vx: 0, vy: -40, t: 0.35, c: "#c9b99a", r: 6, dust: true });
    }
  }

  function startReload() {
    if (S.reloading > 0 || S.ammo === D.weapon.magazine || S.state !== "playing" || S.power) return;
    S.reloading = D.weapon.reloadTime; sfx.reload(); updateHud();
  }

  // ---------- Broom ability ----------
  // screen point -> ground position in world (x, depth)
  function screenToGround(px, py) {
    const maxD = D.broom.length;
    const d = py > HORIZON + 1 ? Math.min(maxD, (F * D.world.cameraHeight) / (py - HORIZON)) : maxD;
    return { x: ((px - CX) * d) / F, d };
  }
  // lane from Viktor towards the aimed ground point
  function broomLane(px, py) {
    const o = { x: 0, d: D.broom.startDepth }, t = screenToGround(px, py);
    let dx = t.x - o.x, dd = t.d - o.d;
    if (dd < 0.5) dd = 0.5;
    const l = Math.hypot(dx, dd);
    return { o, ux: dx / l, ud: dd / l };
  }
  const abilityCd = () => (CHAR.nuke ? D.nuke.cooldown : D.broom.cooldown);
  const broomReady = () => S.broomCharge >= abilityCd();

  function toggleBroomAim() {
    if (S.state !== "playing" || S.sweep || S.power) return;
    if (!broomReady()) return;
    if (CHAR.nuke) { activatePower(); return; }
    S.broomAiming = !S.broomAiming;
    S.broomAim = S.broomAiming ? { x: CX, y: HORIZON + (H - HORIZON) * 0.2 } : null;
    updateBroomBtn();
  }

  function fireBroom(px, py) {
    S.broomAiming = false; S.broomCharge = 0;
    S.sweep = { lane: broomLane(px, py), s: 0 };
    S.shake = Math.max(S.shake, 8); sfx.sweep();
    updateBroomBtn();
  }

  // ground quad of the lane from distance a to b (screen points)
  function laneQuad(lane, a, b) {
    const hw = D.broom.laneWidth / 2, px = lane.ud, pd = -lane.ux; // perpendicular
    const P = (s, side) => {
      const x = lane.o.x + lane.ux * s + px * hw * side, d = Math.max(0.6, lane.o.d + lane.ud * s + pd * hw * side);
      return [screenX(x, d), groundY(d)];
    };
    return [P(a, -1), P(a, 1), P(b, 1), P(b, -1)];
  }
  function fillQuad(q, style) {
    ctx.fillStyle = style; ctx.beginPath(); q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  }

  function updateSweep(dt) {
    const sw = S.sweep; if (!sw) return;
    const B = D.broom, lane = sw.lane, prev = sw.s;
    sw.s += (B.length / B.sweepTime) * dt;
    for (const e of S.enemies) {
      if (e.dead) continue;
      const rx = enemyX(e) - lane.o.x, rd = e.d - lane.o.d;
      const along = rx * lane.ux + rd * lane.ud, across = Math.abs(rx * lane.ud - rd * lane.ux);
      if (across <= B.laneWidth / 2 + 0.3 && along <= sw.s && along >= -1) {
        e.dead = true; e.hp = 0; S.kills++;
        const b = enemyBox(e);
        for (let i = 0; i < 6; i++) S.particles.push({ x: b.sx, y: b.fy - b.h * 0.5, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 260, t: 0.8, c: "#fff", r: 4, star: true });
      }
    }
    // dust behind the broom head
    const hx = lane.o.x + lane.ux * sw.s, hd = lane.o.d + lane.ud * sw.s;
    if (hd > 3 && sw.s > prev) for (let i = 0; i < 3; i++)
      S.particles.push({ x: screenX(hx + (Math.random() - 0.5) * B.laneWidth, hd), y: groundY(hd), vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, t: 0.4, c: "#d8c9a3aa", r: Math.min(10, Math.max(2, sizeAt(0.08, hd))), dust: true });
    if (sw.s >= B.length) S.sweep = null;
  }

  function drawBroomLane() {
    if (S.broomAiming && S.broomAim) {
      const lane = broomLane(S.broomAim.x, S.broomAim.y);
      fillQuad(laneQuad(lane, 0, D.broom.length), "rgba(255,255,255,0.22)");
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.setLineDash([10, 8]); ctx.lineWidth = 2;
      const q = laneQuad(lane, 0, D.broom.length);
      ctx.beginPath(); ctx.moveTo(...q[0]); ctx.lineTo(...q[3]); ctx.moveTo(...q[1]); ctx.lineTo(...q[2]); ctx.stroke(); ctx.setLineDash([]);
    }
    if (S.sweep) fillQuad(laneQuad(S.sweep.lane, 0, S.sweep.s), "rgba(255,240,180,0.25)");
  }

  function drawBroom() {
    const sw = S.sweep; if (!sw) return;
    const B = D.broom, lane = sw.lane;
    const s = Math.max(sw.s, 0.6);
    const x = lane.o.x + lane.ux * s, d = Math.max(0.9, lane.o.d + lane.ud * s);
    const cx = screenX(x, d), gy = groundY(d);
    const hw = (F * B.laneWidth) / 2 / d, bh = sizeAt(0.45, d), hb = sizeAt(0.18, d);
    const g = ctx; g.save();
    // handle (leaning back towards Viktor)
    g.strokeStyle = "#8a5a2b"; g.lineWidth = Math.max(3, sizeAt(0.09, d)); g.lineCap = "round";
    g.beginPath(); g.moveTo(cx, gy - bh); g.lineTo(cx - lane.ux * hw * 0.2, gy - bh - sizeAt(1.8, d)); g.stroke();
    // head block
    g.fillStyle = "#c0392b"; roundRect(g, cx - hw, gy - bh - hb, hw * 2, hb, hb * 0.4); g.fill();
    // bristles
    g.fillStyle = "#e9c46a"; g.beginPath(); g.moveTo(cx - hw, gy - bh); g.lineTo(cx + hw, gy - bh); g.lineTo(cx + hw * 1.05, gy); g.lineTo(cx - hw * 1.05, gy); g.closePath(); g.fill();
    g.strokeStyle = "#b8893a"; g.lineWidth = 1.5;
    for (let i = 0; i <= 14; i++) { const t = -1 + (2 * i) / 14; g.beginPath(); g.moveTo(cx + hw * t, gy - bh); g.lineTo(cx + hw * t * 1.05, gy); g.stroke(); }
    g.restore();
  }

  // ---------- Milena (the dog) ----------
  function showBanner(text, dur = 3) { S.banner = { text, t: 0, dur }; }

  function spawnDog() {
    const M = D.milena;
    S.milenaSpawned = true;
    S.dog = { state: "wild", x: (Math.random() * 2 - 1) * M.spawnSpreadX, d: M.spawnDepth[0] + Math.random() * (M.spawnDepth[1] - M.spawnDepth[0]),
      t: 0, cd: M.attackInterval, phase: 0, face: 1, target: null };
    showBanner(D.text.milenaAppears, 3); sfx.ready();
  }

  function befriendDog() {
    const M = D.milena, dog = S.dog;
    dog.state = "joining"; dog.t = 0; dog.fx = dog.x; dog.fd = dog.d; dog.cd = M.attackInterval;
    showBanner(D.text.milenaJoins, 2.2); sfx.bark();
    for (let i = 0; i < 10; i++) { const b = dogBox(); S.particles.push({ x: (b.x1 + b.x2) / 2, y: b.y1, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 220, t: 0.9, c: "#ff7aa8", r: 5, star: true }); }
  }

  function dogBox() {
    const dog = S.dog, h = sizeAt(D.milena.size, dog.d), fy = groundY(dog.d), sx = screenX(dog.x, dog.d);
    return { sx, fy, h, x1: sx - h * 0.8, x2: sx + h * 0.8, y1: fy - h, y2: fy };
  }

  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => k * k * (3 - 2 * k);

  function updateDog(dt) {
    const dog = S.dog; if (!dog) return;
    const M = D.milena;
    dog.t += dt; dog.phase += dt * 10;
    if (dog.state === "wild") {
      dog.x += Math.sin(dog.t * 0.8) * dt * 0.8; dog.face = Math.cos(dog.t * 0.8) >= 0 ? 1 : -1;
    } else if (dog.state === "joining") {
      const k = Math.min(1, dog.t / M.joinTime);
      dog.x = lerp(dog.fx, M.homeX, ease(k)); dog.d = lerp(dog.fd, M.homeDepth, ease(k)); dog.face = M.homeX > dog.fx ? 1 : -1;
      if (k >= 1) { dog.state = "home"; dog.t = 0; }
    } else if (dog.state === "home") {
      dog.x = M.homeX; dog.d = M.homeDepth; dog.face = 1;
      dog.cd -= dt;
      if (dog.cd <= 0) {
        // jump at the biggest group of Ivetas (closest group wins a tie)
        const alive = S.enemies.filter((e) => !e.dead && e.d < M.maxReach);
        let best = null, bestScore = -1;
        for (const e of alive) {
          const ex = enemyX(e);
          const n = alive.filter((o) => Math.hypot(enemyX(o) - ex, o.d - e.d) <= M.pounceRadius).length;
          const sc = n * 100 - e.d; // group size first, then closeness
          if (sc > bestScore) { bestScore = sc; best = e; }
        }
        if (best) { dog.state = "leap"; dog.t = 0; dog.target = best; dog.face = enemyX(best) >= dog.x ? 1 : -1; }
        else dog.cd = 0.3;
      }
    } else if (dog.state === "leap") {
      const e = dog.target, k = Math.min(1, dog.t / M.leapTime);
      dog.x = lerp(M.homeX, enemyX(e), ease(k)); dog.d = lerp(M.homeDepth, Math.max(M.homeDepth, e.d - 0.2), ease(k));
      if (k >= 1) {
        // landing shockwave: every Iveta within pounceRadius goes down
        const lx = dog.x, ld = Math.max(dog.d, e.d);
        sfx.bark(); S.shake = Math.max(S.shake, 6);
        S.particles.push({ x: screenX(lx, ld), y: groundY(ld), vx: 0, vy: 0, t: 0.35, c: "#ff7aa8", r: sizeAt(M.pounceRadius, ld), ring: true });
        for (const o of S.enemies) {
          if (o.dead || Math.hypot(enemyX(o) - lx, o.d - ld) > M.pounceRadius) continue;
          o.dead = true; o.hp = 0; S.kills++;
          const b = enemyBox(o);
          for (let i = 0; i < 6; i++) S.particles.push({ x: b.sx, y: b.fy - b.h * 0.5, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 240, t: 0.8, c: "#fff", r: 4, star: true });
        }
        dog.state = "back"; dog.t = 0; dog.bx = dog.x; dog.bd = dog.d;
      }
    } else if (dog.state === "back") {
      const k = Math.min(1, dog.t / M.leapTime);
      dog.x = lerp(dog.bx, M.homeX, ease(k)); dog.d = lerp(dog.bd, M.homeDepth, ease(k)); dog.face = M.homeX >= dog.bx ? 1 : -1;
      if (k >= 1) { dog.state = "home"; dog.t = 0; dog.cd = M.attackInterval; }
    }
  }

  // small fluffy white dog
  function drawDog() {
    const dog = S.dog; if (!dog) return;
    const M = D.milena, b = dogBox(), h = b.h, g = ctx;
    const airborne = dog.state === "leap" || dog.state === "back" || dog.state === "joining";
    const hop = airborne ? Math.sin(Math.min(1, dog.t / (dog.state === "joining" ? M.joinTime : M.leapTime)) * Math.PI) * h * 1.2
      : dog.state === "wild" ? Math.abs(Math.sin(dog.phase * 0.5)) * h * 0.25 : 0;
    g.fillStyle = "#0003"; g.beginPath(); g.ellipse(b.sx, b.fy, h * 0.6, h * 0.12, 0, 0, 7); g.fill();
    g.save(); g.translate(b.sx, b.fy - hop); g.scale(dog.face, 1);
    const fur = M.color, legSw = airborne ? 0.6 : Math.sin(dog.phase) * 0.3;
    // legs
    g.strokeStyle = fur; g.lineCap = "round"; g.lineWidth = h * 0.16;
    [[-0.3, 1], [-0.15, -1], [0.25, 1], [0.38, -1]].forEach(([lx, s2]) => {
      g.beginPath(); g.moveTo(h * lx, -h * 0.35); g.lineTo(h * (lx + legSw * 0.2 * s2), -h * 0.06); g.stroke();
    });
    // tail
    g.lineWidth = h * 0.14; g.beginPath(); g.moveTo(-h * 0.45, -h * 0.5); g.quadraticCurveTo(-h * 0.7, -h * (0.9 + Math.sin(dog.phase * 2) * 0.1), -h * 0.5, -h * 0.85); g.stroke();
    // body (fluffy)
    g.fillStyle = fur;
    for (const [cx, cy, r] of [[-0.25, -0.5, 0.26], [0.05, -0.52, 0.28], [0.3, -0.5, 0.25], [0, -0.38, 0.24]]) { g.beginPath(); g.arc(h * cx, h * cy, h * r, 0, 7); g.fill(); }
    // head
    g.beginPath(); g.arc(h * 0.5, -h * 0.8, h * 0.24, 0, 7); g.fill();
    g.beginPath(); g.ellipse(h * 0.7, -h * 0.74, h * 0.13, h * 0.1, 0, 0, 7); g.fill();
    // ears
    g.fillStyle = "#ececec"; g.beginPath(); g.ellipse(h * 0.33, -h * 0.75, h * 0.08, h * 0.17, 0.3, 0, 7); g.fill();
    // outline hint so she shows on bright grass
    g.strokeStyle = "#0002"; g.lineWidth = 1.2; g.beginPath(); g.arc(h * 0.5, -h * 0.8, h * 0.24, 0, 7); g.stroke();
    // face
    g.fillStyle = "#111";
    g.beginPath(); g.arc(h * 0.56, -h * 0.86, h * 0.04, 0, 7); g.fill();
    g.beginPath(); g.arc(h * 0.82, -h * 0.76, h * 0.045, 0, 7); g.fill();
    if (dog.state !== "wild") { g.fillStyle = "#e8321e"; g.fillRect(h * 0.32, -h * 0.66, h * 0.3, h * 0.06); } // red collar once she's on your side
    else { g.fillStyle = "#ff7aa8"; g.beginPath(); g.ellipse(h * 0.74, -h * 0.64, h * 0.05, h * 0.07, 0, 0, 7); g.fill(); } // tongue
    g.restore();
    // marker above the wild dog so you can find her
    if (dog.state === "wild") {
      const bounce = Math.sin(dog.t * 6) * 4;
      g.fillStyle = "#ff7aa8"; g.font = "800 18px system-ui, sans-serif"; g.textAlign = "center";
      g.fillText("▼ " + M.name, b.sx, b.fy - h - hop - 10 + bounce);
    }
  }

  function drawBanner() {
    const bn = S.banner; if (!bn) return;
    const k = bn.t / bn.dur, scale = Math.min(1, bn.t * 5) * (1 + Math.max(0, 0.15 - bn.t) * 2);
    const alpha = k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(CX, H * 0.3); ctx.scale(scale, scale);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = bn.text.split("\n");
    const size = Math.min(48, W / 9);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    lines.forEach((ln, i) => {
      const y = (i - (lines.length - 1) / 2) * size * 1.1;
      ctx.lineWidth = size * 0.18; ctx.strokeStyle = "#e8321e"; ctx.lineJoin = "round"; ctx.strokeText(ln, 0, y);
      ctx.fillStyle = "#f7d417"; ctx.fillText(ln, 0, y);
    });
    ctx.restore();
  }

  // ---------- Petr's power-up: outfit change, infinite ammo, nukes from the sky ----------
  function activatePower() {
    const N = D.nuke;
    S.broomCharge = 0;
    S.power = { t: N.duration };
    S.reloading = 0; S.ammo = D.weapon.magazine;
    D.hero = Object.assign({}, CHAR.hero, CHAR.powerHero || {});
    S.nukeTimer = 0.2;
    showBanner(D.text.powerOn, 2); sfx.ready();
    updateBroomBtn(); updateHud();
  }
  function endPower() {
    if (!S.power) return;
    S.power = null; D.hero = CHAR.hero; updateBroomBtn();
  }
  function updatePower(dt) {
    const N = D.nuke;
    if (S.power) {
      S.power.t -= dt;
      S.nukeTimer -= dt;
      if (S.nukeTimer <= 0) {
        S.nukeTimer = N.interval * (0.6 + Math.random() * 0.8);
        S.nukes.push({ x: (Math.random() * 2 - 1) * N.spreadX, d: N.depth[0] + Math.random() * (N.depth[1] - N.depth[0]), t: 0 });
        sfx.whistle();
      }
      if (S.power.t <= 0) endPower();
      updateBroomBtn();
    }
    // falling bombs (keep falling even after the power ends)
    for (const n of S.nukes) {
      n.t += dt;
      if (n.t >= N.fallTime && !n.done) {
        n.done = true;
        S.booms.push({ x: n.x, d: n.d, t: 0 });
        S.shake = Math.max(S.shake, 16); S.whiteFlash = 0.5; sfx.boom();
        for (const e of S.enemies) {
          if (e.dead || Math.hypot(enemyX(e) - n.x, e.d - n.d) > N.radius) continue;
          e.dead = true; e.hp = 0; S.kills++;
        }
      }
    }
    S.nukes = S.nukes.filter((n) => !n.done);
    S.booms = S.booms.filter((b) => (b.t += dt) < 1.1);
    S.whiteFlash = Math.max(0, S.whiteFlash - dt * 1.5);
  }
  function drawNukes() {
    const N = D.nuke, g = ctx;
    for (const n of S.nukes) {
      const k = Math.min(1, n.t / N.fallTime), gx = screenX(n.x, n.d), gy = groundY(n.d);
      // shadow / target circle on the ground
      g.strokeStyle = `rgba(255,60,40,${0.3 + 0.5 * k})`; g.lineWidth = 2; g.setLineDash([6, 6]);
      g.beginPath(); g.ellipse(gx, gy, (F * N.radius) / n.d, (F * N.radius) / n.d * 0.18, 0, 0, 7); g.stroke(); g.setLineDash([]);
      // the bomb
      const by = lerp(-60, gy - sizeAt(0.6, n.d), k * k), sz = Math.max(10, sizeAt(1.1, n.d));
      g.save(); g.translate(gx, by);
      g.fillStyle = "#3b3f45"; g.beginPath(); g.ellipse(0, 0, sz * 0.3, sz * 0.55, 0, 0, 7); g.fill();
      g.fillStyle = "#f7d417"; g.fillRect(-sz * 0.3, -sz * 0.1, sz * 0.6, sz * 0.12);
      g.fillStyle = "#555"; g.beginPath(); g.moveTo(-sz * 0.3, -sz * 0.45); g.lineTo(-sz * 0.45, -sz * 0.8); g.lineTo(sz * 0.45, -sz * 0.8); g.lineTo(sz * 0.3, -sz * 0.45); g.closePath(); g.fill();
      g.fillStyle = "#111"; g.font = `${Math.max(8, sz * 0.35)}px system-ui`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("☢", 0, sz * 0.15);
      g.restore();
    }
    for (const b of S.booms) {
      const k = b.t / 1.1, gx = screenX(b.x, b.d), gy = groundY(b.d), R = (F * N.radius) / b.d;
      g.save(); g.globalAlpha = 1 - k;
      // ground shockwave
      g.strokeStyle = "#ffe27a"; g.lineWidth = 4;
      g.beginPath(); g.ellipse(gx, gy, R * Math.min(1, k * 3), R * 0.18 * Math.min(1, k * 3), 0, 0, 7); g.stroke();
      // stem + mushroom cap
      const capR = R * 0.35 * (0.5 + k), capY = gy - R * 0.9 * Math.min(1, k * 2);
      g.fillStyle = "#c8581f"; g.fillRect(gx - capR * 0.25, capY, capR * 0.5, gy - capY);
      const grd = g.createRadialGradient(gx, capY, 0, gx, capY, capR);
      grd.addColorStop(0, "#fff6c8"); grd.addColorStop(0.35, "#ffb02e"); grd.addColorStop(0.75, "#e8321e"); grd.addColorStop(1, "#5a2a1a00");
      g.fillStyle = grd; g.beginPath(); g.ellipse(gx, capY, capR, capR * 0.65, 0, 0, 7); g.fill();
      g.restore();
    }
  }

  // ---------- Petr's "Hundred dolla dolla" ----------
  // Every Iveta wears a price tag; killing one adds that number to Petr's ammo.
  const secondCd = () => (CHAR.dolla ? D.dolla.cooldown : D.tractor.cooldown);
  const randBounty = () => D.dolla.min + Math.floor(Math.random() * (D.dolla.max - D.dolla.min + 1));
  function activateDolla() {
    if (!CHAR.dolla || S.state !== "playing" || S.dolla || S.tractorCharge < D.dolla.cooldown) return;
    S.tractorCharge = 0;
    S.dolla = { t: D.dolla.duration };
    for (const e of S.enemies) if (!e.dead) e.bounty = randBounty();
    showBanner(D.text.dollaOn, 2); sfx.ready();
    updateTractorBtn();
  }
  function updateDolla(dt) {
    if (!S.dolla) return;
    S.dolla.t -= dt;
    if (S.dolla.t <= 0) {
      S.dolla = null;
      for (const e of S.enemies) if (!e.dead) e.bounty = 0; // price tags disappear
    }
    updateTractorBtn();
  }
  function payBounty(e) {
    e.paid = true;
    if (S.state !== "playing") return;
    S.ammo += e.bounty;
    if (S.reloading > 0) S.reloading = 0; // cash in hand cancels the reload
    const b = enemyBox(e);
    S.particles.push({ x: b.sx, y: b.fy - b.h - 6, vx: 0, vy: -70, t: 1.1, c: "#9be7a1", r: Math.max(16, Math.min(30, b.h * 0.18)), text: "+" + e.bounty });
    sfx.cash(); updateHud();
  }
  function drawBounty(e) {
    if (!e.bounty || e.dead) return;
    const b = enemyBox(e), size = Math.max(11, Math.min(26, b.h * 0.16));
    const g = ctx; g.save();
    g.font = `900 ${size}px system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "bottom";
    const txt = "$" + e.bounty, w = g.measureText(txt).width + size * 0.5, y = b.fy - b.h - 4;
    g.fillStyle = "#1b4d23e6"; roundRect(g, b.sx - w / 2, y - size * 1.15, w, size * 1.2, size * 0.3); g.fill();
    g.fillStyle = "#9be7a1"; g.fillText(txt, b.sx, y);
    g.restore();
  }

  // ---------- Viktor's tractor stampede ----------
  // Rows of tractors (each driven by a Viktor) cross the field from the left and the right and clear everything.
  function activateTractor() {
    const T2 = D.tractor;
    if (!CHAR.tractor || S.state !== "playing" || S.tractor || S.tractorCharge < T2.cooldown) return;
    S.tractorCharge = 0;
    const rows = [];
    let i = 0;
    for (let d = T2.firstRow; d <= T2.lastRow; d += T2.rowSpacing, i++) {
      rows.push({ d, dir0: i % 2 ? -1 : 1, dir: i % 2 ? -1 : 1, start: Math.random() * T2.crossTime * 0.6, x: null, prevX: null, pass: -1, dist: 0 });
    }
    S.tractor = { t: T2.duration, elapsed: 0, rows };
    showBanner(D.text.tractorOn, 1.8); sfx.horn();
    updateTractorBtn();
  }
  function endTractor() {
    // whatever is still standing gets flattened at the end: the field is clear
    for (const e of S.enemies) if (!e.dead) killBy(e, "#fff");
    S.tractor = null;
    S.spawnTimer = Math.max(S.spawnTimer, 1.0);
    updateTractorBtn();
  }
  function killBy(e, c) {
    e.dead = true; e.hp = 0; S.kills++;
    const b = enemyBox(e);
    for (let i = 0; i < 5; i++) S.particles.push({ x: b.sx, y: b.fy - b.h * 0.5, vx: (Math.random() - 0.5) * 240, vy: -Math.random() * 260, t: 0.8, c, r: 4, star: true });
  }
  const halfFieldAt = (d) => (CX + 120) * d / F; // world half-width that covers the screen at depth d

  function updateTractor(dt) {
    const tr = S.tractor; if (!tr) return;
    const T2 = D.tractor;
    tr.t -= dt; tr.elapsed += dt;
    let squashed = false;
    for (const r of tr.rows) {
      // each row keeps crossing back and forth until the stampede ends
      const tt = (tr.elapsed - r.start) / T2.crossTime;
      if (tt < 0) { r.x = null; continue; }
      const pass = Math.floor(tt), k = tt - pass;
      const hw = halfFieldAt(r.d);
      if (pass !== r.pass) { r.pass = pass; r.dir = pass % 2 ? -r.dir0 : r.dir0; r.x = null; }
      r.prevX = r.x == null ? -r.dir * hw : r.x;
      r.x = -r.dir * hw + r.dir * 2 * hw * k;
      r.dist += Math.abs(r.x - r.prevX);
      const lo = Math.min(r.prevX, r.x) - T2.hitRadius, hi = Math.max(r.prevX, r.x) + T2.hitRadius;
      for (const e of S.enemies) {
        if (e.dead || Math.abs(e.d - r.d) > T2.rowSpacing * 0.6) continue;
        const ex = enemyX(e);
        if (ex >= lo && ex <= hi) { killBy(e, "#fff"); squashed = true; }
      }
      if (Math.random() < dt * 10) {
        const s2 = sizeAt(T2.size, r.d);
        S.particles.push({ x: screenX(r.x, r.d) - r.dir * s2 * 0.25, y: groundY(r.d) - s2 * 0.95, vx: -r.dir * 30, vy: -50, t: 0.6, c: "#55555588", r: Math.max(3, s2 * 0.05), dust: true });
      }
    }
    if (squashed) { sfx.squash(); S.shake = Math.max(S.shake, 4); }
    updateTractorBtn();
    if (tr.t <= 0) endTractor();
  }

  // a tractor seen from the side, driving left or right, Viktor at the wheel
  function drawTractorRow(r) {
    if (r.x == null) return;
    const g = ctx, s = sizeAt(D.tractor.size, r.d), sx = screenX(r.x, r.d), gy = groundY(r.d);
    g.fillStyle = "#0004"; g.beginPath(); g.ellipse(sx, gy, s * 0.6, s * 0.08, 0, 0, 7); g.fill();
    g.save(); g.translate(sx, gy); g.scale(r.dir, 1);
    const bob = Math.sin(r.dist * 4) * s * 0.012; g.translate(0, bob);
    // body + bonnet
    g.fillStyle = "#c62828"; roundRect(g, -s * 0.45, -s * 0.62, s * 0.55, s * 0.3, s * 0.04); g.fill();
    roundRect(g, s * 0.05, -s * 0.52, s * 0.42, s * 0.22, s * 0.04); g.fill();
    g.fillStyle = "#8e1b1b"; g.fillRect(s * 0.3, -s * 0.5, s * 0.03, s * 0.18); g.fillRect(s * 0.37, -s * 0.5, s * 0.03, s * 0.18);
    // exhaust
    g.fillStyle = "#333"; g.fillRect(s * 0.22, -s * 0.8, s * 0.04, s * 0.3);
    // cabin frame + roof
    g.strokeStyle = "#222"; g.lineWidth = Math.max(2, s * 0.025);
    g.beginPath(); g.moveTo(-s * 0.42, -s * 0.62); g.lineTo(-s * 0.42, -s * 1.12); g.lineTo(-s * 0.02, -s * 1.12); g.lineTo(0, -s * 0.62); g.stroke();
    g.fillStyle = "#c62828"; g.fillRect(-s * 0.47, -s * 1.17, s * 0.5, s * 0.06);
    // Viktor at the wheel (striped shirt + photo face)
    const hero = CHAR.hero;
    g.save(); roundRect(g, -s * 0.33, -s * 0.84, s * 0.22, s * 0.22, s * 0.03); g.clip();
    for (let i = 0; i < 5; i++) { g.fillStyle = hero.shirtStripes[i % 2]; g.fillRect(-s * 0.33, -s * 0.84 + i * s * 0.045, s * 0.22, s * 0.045); }
    g.restore();
    const hx = -s * 0.22, hy = -s * 0.94, hr = s * 0.1;
    g.scale(r.dir, 1); // don't mirror the face
    const img = heroImgs[CHAR.id], fx = hx * r.dir;
    g.save(); g.beginPath(); g.ellipse(fx, hy, hr * 0.85, hr, 0, 0, 7); g.clip();
    if (img.complete && img.naturalWidth) { const [a, b2, c, d2] = hero.faceCrop.map((v) => v * img.naturalWidth); g.drawImage(img, a, b2, c, d2, fx - hr * 0.85, hy - hr, hr * 1.7, hr * 2); }
    else { g.fillStyle = hero.skin; g.fillRect(fx - hr, hy - hr, hr * 2, hr * 2); }
    g.restore();
    g.scale(r.dir, 1);
    // wheels: big rear, small front, spinning spokes
    const wheel = (wx, wr) => {
      g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(wx, -wr, wr, 0, 7); g.fill();
      g.fillStyle = "#f7d417"; g.beginPath(); g.arc(wx, -wr, wr * 0.45, 0, 7); g.fill();
      g.strokeStyle = "#1a1a1a"; g.lineWidth = Math.max(1, wr * 0.1);
      const a0 = r.dist * 3 / Math.max(0.1, wr / s);
      for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2; g.beginPath(); g.moveTo(wx, -wr); g.lineTo(wx + Math.cos(a) * wr * 0.45, -wr + Math.sin(a) * wr * 0.45); g.stroke(); }
    };
    wheel(-s * 0.28, s * 0.3); wheel(s * 0.33, s * 0.17);
    g.restore();
  }

  // ---------- Update ----------
  function update(dt) {
    S.recoil = Math.max(0, S.recoil - dt * 8);
    S.flash = Math.max(0, S.flash - dt * 14);
    S.shake = Math.max(0, S.shake - dt * 30);
    S.tracers = S.tracers.filter((t) => (t.t -= dt) > 0);
    if (S.banner && (S.banner.t += dt) >= S.banner.dur) S.banner = null;
    S.particles = S.particles.filter((p) => {
      p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.dust && !p.ring && !p.bill && !p.text) p.vy += 600 * dt; if (p.bill) p.rot += dt * 14; return p.t > 0;
    });

    if (S.state === "playing") {
      S.time += dt;
      S.score = Math.floor(S.time * D.score.perSecond + S.kills * D.score.perKill);
      S.cooldown = Math.max(0, S.cooldown - dt);
      if (S.hold && D.weapon.auto && S.cooldown <= 0 && S.reloading <= 0) shoot(S.hold.x, S.hold.y);
      if ((CHAR.tractor || CHAR.dolla) && !S.tractor && !S.dolla && S.tractorCharge < secondCd()) {
        S.tractorCharge = Math.min(secondCd(), S.tractorCharge + dt);
        if (S.tractorCharge >= secondCd()) sfx.ready();
        updateTractorBtn();
      }
      updateTractor(dt);
      updateDolla(dt);
      if ((CHAR.broom || CHAR.nuke) && !S.sweep && !S.broomAiming && !S.power && S.broomCharge < abilityCd()) {
        S.broomCharge = Math.min(abilityCd(), S.broomCharge + dt);
        if (broomReady()) sfx.ready();
        updateBroomBtn();
      }
      updateSweep(dt);
      updatePower(dt);
      if (CHAR.milena && !S.milenaSpawned && S.score >= D.milena.appearScore) spawnDog();
      updateDog(dt);
      if (S.reloading > 0) {
        S.reloading -= dt;
        if (S.reloading <= 0) { S.reloading = 0; S.ammo = D.weapon.magazine; }
      }
      if (!S.tractor) S.spawnTimer -= dt;
      if (S.spawnTimer <= 0) {
        spawnHorde();
        S.spawnInterval = Math.max(D.spawn.minInterval, S.spawnInterval * D.spawn.intervalDecay);
        S.spawnTimer = S.spawnInterval;
      }
      for (const e of S.enemies) {
        if (e.dead) continue;
        e.d -= e.speed * dt; e.phase += dt * (6 + e.speed);
        e.hitT = Math.max(0, e.hitT - dt);
        if (e.d <= D.spawn.reachDepth) {
          die(); break;
        }
      }
      updateHud();
    } else if (S.state === "dying") {
      S.deathT += dt;
      if (S.deathT >= D.hero.deathDuration) gameOver();
    }
    for (const e of S.enemies) {
      if (!e.dead) continue;
      e.deadT += dt;
      if (e.bounty && !e.paid) payBounty(e);
    }
    S.enemies = S.enemies.filter((e) => !e.dead || e.deadT < D.enemy.deathDuration);
  }

  function die() {
    S.broomAiming = false; S.sweep = null; endPower(); S.tractor = null; S.dolla = null; updateBroomBtn();
    S.state = "dying"; S.deathT = 0; S.shake = 18; sfx.death();
    if (navigator.vibrate) navigator.vibrate([80, 60, 200]);
  }

  // ---------- Drawing ----------
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  function drawIveta(e) {
    const b = enemyBox(e), h = b.h, en = D.enemy;
    const g = ctx;
    // shadow
    g.fillStyle = "#0003"; g.beginPath(); g.ellipse(b.sx, b.fy, h * 0.16, h * 0.035, 0, 0, 7); g.fill();
    g.save();
    g.translate(b.sx, b.fy);
    if (e.dead) {
      const k = Math.min(1, e.deadT / (en.deathDuration * 0.6));
      g.globalAlpha = 1 - Math.max(0, (e.deadT - en.deathDuration * 0.5) / (en.deathDuration * 0.5));
      g.rotate(e.fallDir * k * k * 1.45);
    }
    const sw = e.dead ? 0 : Math.sin(e.phase);
    const bob = e.dead ? 0 : Math.abs(Math.cos(e.phase)) * h * 0.015;
    g.translate(0, -bob);

    // legs
    g.fillStyle = en.pants;
    [-1, 1].forEach((s) => {
      g.save(); g.translate(s * h * 0.045, -h * 0.48); g.rotate(-s * sw * 0.25);
      roundRect(g, -h * 0.035, 0, h * 0.07, h * 0.46, h * 0.02); g.fill();
      g.fillStyle = en.shoes; roundRect(g, -h * 0.04, h * 0.44, h * 0.08, h * 0.04, h * 0.015); g.fill();
      g.fillStyle = en.pants; g.restore();
    });
    // hair behind
    g.fillStyle = en.hairShadow;
    roundRect(g, -h * 0.1, -h * 0.97, h * 0.2, h * 0.2, h * 0.07); g.fill();
    // arms
    [-1, 1].forEach((s) => {
      g.save(); g.translate(s * h * 0.13, -h * 0.79); g.rotate(s * 0.12 + s * sw * 0.3);
      g.fillStyle = en.top; roundRect(g, -h * 0.03, 0, h * 0.06, h * 0.17, h * 0.03); g.fill();
      g.fillStyle = en.skin; roundRect(g, -h * 0.025, h * 0.15, h * 0.05, h * 0.15, h * 0.025); g.fill();
      g.restore();
    });
    // torso
    g.fillStyle = en.top;
    roundRect(g, -h * 0.14, -h * 0.82, h * 0.28, h * 0.36, h * 0.05); g.fill();
    // v-neck
    g.fillStyle = en.skin;
    g.beginPath(); g.moveTo(-h * 0.04, -h * 0.82); g.lineTo(h * 0.04, -h * 0.82); g.lineTo(0, -h * 0.74); g.closePath(); g.fill();
    // neck + head
    g.fillRect(-h * 0.025, -h * 0.86, h * 0.05, h * 0.05);
    g.beginPath(); g.ellipse(0, -h * 0.905, h * 0.06, h * 0.072, 0, 0, 7); g.fill();
    // hair front: parted, long sides
    g.fillStyle = en.hair;
    g.beginPath();
    g.ellipse(0, -h * 0.94, h * 0.068, h * 0.045, 0, Math.PI, 0); g.fill();
    roundRect(g, -h * 0.085, -h * 0.95, h * 0.035, h * 0.16, h * 0.015); g.fill();
    roundRect(g, h * 0.05, -h * 0.95, h * 0.035, h * 0.16, h * 0.015); g.fill();
    // face
    if (h > 40) {
      g.fillStyle = "#3a5a40";
      g.beginPath(); g.arc(-h * 0.022, -h * 0.91, h * 0.007, 0, 7); g.arc(h * 0.022, -h * 0.91, h * 0.007, 0, 7); g.fill();
      g.strokeStyle = "#a0524a"; g.lineWidth = Math.max(1, h * 0.006);
      g.beginPath(); g.arc(0, -h * 0.885, h * 0.018, 0.2, Math.PI - 0.2); g.stroke();
    }
    // hit flash
    if (e.hitT > 0) {
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = "#ffffffaa"; g.fillRect(-h * 0.2, -h, h * 0.4, h);
    }
    g.restore();
  }


  function turnAmount() {
    if (S.reloading <= 0 || S.state !== "playing") return 0;
    const tt = D.hero.turnTime, elapsed = D.weapon.reloadTime - S.reloading;
    return Math.max(0, Math.min(1, elapsed / tt, S.reloading / tt));
  }

  // Viktor seen from the front: real photo as his face, rifle held across the body while reloading
  function drawViktorFront(u, y0) {
    const hero = D.hero, g = ctx, tw = u * 0.62, bw = u * 0.56;
    const bodyPath = () => {
      g.beginPath();
      g.moveTo(CX - tw / 2, y0 + u * 0.06);
      g.quadraticCurveTo(CX - tw / 2, y0 - u * 0.02, CX - tw * 0.2, y0 - u * 0.03);
      g.lineTo(CX + tw * 0.2, y0 - u * 0.03);
      g.quadraticCurveTo(CX + tw / 2, y0 - u * 0.02, CX + tw / 2, y0 + u * 0.06);
      g.lineTo(CX + bw / 2, H + 20); g.lineTo(CX - bw / 2, H + 20); g.closePath();
    };
    // torso
    g.save(); bodyPath(); g.clip();
    const band = u * 0.075;
    for (let y = y0 - u * 0.05, i = 0; y < H + 30; y += band, i++) { g.fillStyle = hero.shirtStripes[i % 2]; g.fillRect(CX - tw, y, tw * 2, band + 1); }
    const sh = g.createLinearGradient(CX - tw / 2, 0, CX + tw / 2, 0);
    sh.addColorStop(0, "#0003"); sh.addColorStop(0.5, "#0000"); sh.addColorStop(1, "#0004");
    g.fillStyle = sh; g.fillRect(CX - tw, y0 - u * 0.1, tw * 2, H);
    g.restore();
    // neck + collar
    g.fillStyle = hero.skin; g.fillRect(CX - u * 0.06, y0 - u * 0.1, u * 0.12, u * 0.09);
    if (hero.outfit === "suit") {
      // light-blue open-collar shirt between navy lapels
      g.fillStyle = hero.collar;
      g.beginPath(); g.moveTo(CX - u * 0.1, y0 - u * 0.05); g.lineTo(CX + u * 0.1, y0 - u * 0.05); g.lineTo(CX + u * 0.06, y0 + u * 0.45); g.lineTo(CX - u * 0.06, y0 + u * 0.45); g.closePath(); g.fill();
      g.fillStyle = hero.skin; g.beginPath(); g.moveTo(CX - u * 0.05, y0 - u * 0.05); g.lineTo(CX + u * 0.05, y0 - u * 0.05); g.lineTo(CX, y0 + u * 0.05); g.closePath(); g.fill();
      g.fillStyle = "#16203a";
      g.beginPath(); g.moveTo(CX - u * 0.15, y0 - u * 0.04); g.lineTo(CX - u * 0.04, y0 + u * 0.1); g.lineTo(CX - u * 0.06, y0 + u * 0.5); g.lineTo(CX - u * 0.2, y0 + u * 0.1); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(CX + u * 0.15, y0 - u * 0.04); g.lineTo(CX + u * 0.04, y0 + u * 0.1); g.lineTo(CX + u * 0.06, y0 + u * 0.5); g.lineTo(CX + u * 0.2, y0 + u * 0.1); g.closePath(); g.fill();
    } else {
      g.fillStyle = hero.collar;
      g.beginPath(); g.moveTo(CX - u * 0.13, y0 - u * 0.05); g.lineTo(CX, y0 + u * 0.08); g.lineTo(CX - u * 0.03, y0 - u * 0.04); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(CX + u * 0.13, y0 - u * 0.05); g.lineTo(CX, y0 + u * 0.08); g.lineTo(CX + u * 0.03, y0 - u * 0.04); g.closePath(); g.fill();
      g.fillStyle = hero.placket; g.fillRect(CX - u * 0.015, y0 + u * 0.02, u * 0.03, u * 0.14);
    }

    // rifle across the chest, magazine out → in animation
    const prog = 1 - S.reloading / D.weapon.reloadTime;
    g.save(); g.translate(CX, y0 + u * 0.3); g.rotate(-0.45);
    const magDrop = prog < 0.5 ? Math.min(1, prog * 4) : Math.max(0, 1 - (prog - 0.5) * 4);
    if (D.weapon.look === "money") {
      // money gun: green body, gold flared barrel, a wad of cash as the "magazine"
      g.fillStyle = "#1f7a3a"; roundRect(g, -u * 0.22, -u * 0.06, u * 0.32, u * 0.12, u * 0.03); g.fill();
      g.fillStyle = "#e0b43a"; g.beginPath(); g.moveTo(u * 0.1, -u * 0.04); g.lineTo(u * 0.26, -u * 0.07); g.lineTo(u * 0.26, u * 0.07); g.lineTo(u * 0.1, u * 0.04); g.closePath(); g.fill();
      g.fillStyle = "#e0b43a"; g.fillRect(-u * 0.22, -u * 0.012, u * 0.32, u * 0.024);
      g.fillStyle = "#7bc67e"; roundRect(g, -u * 0.08, u * 0.05 + magDrop * u * 0.12, u * 0.12, u * 0.07, u * 0.008); g.fill();
      g.strokeStyle = "#2e7d32"; g.lineWidth = 1; g.strokeRect(-u * 0.08, u * 0.05 + magDrop * u * 0.12, u * 0.12, u * 0.07);
    } else {
      g.fillStyle = "#5a3a22"; roundRect(g, -u * 0.34, -u * 0.035, u * 0.18, u * 0.07, u * 0.015); g.fill();
      g.fillStyle = "#2b2b2e"; roundRect(g, -u * 0.17, -u * 0.04, u * 0.3, u * 0.08, u * 0.015); g.fill();
      g.fillStyle = "#111"; g.fillRect(u * 0.12, -u * 0.012, u * 0.24, u * 0.024);
      g.fillStyle = "#1d1d20"; roundRect(g, -u * 0.04, u * 0.03 + magDrop * u * 0.12, u * 0.06, u * 0.12, u * 0.01); g.fill();
    }
    g.restore();
    // arms: right hand on grip, left hand on the magazine
    const arm = (sx, sy, ex, ey, c) => {
      g.lineCap = "round";
      g.strokeStyle = hero.skin; g.lineWidth = u * 0.085; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = c; g.lineWidth = u * 0.11; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (ex - sx) * 0.35, sy + (ey - sy) * 0.35); g.stroke();
    };
    const magY = y0 + u * 0.36 + magDrop * u * 0.1;
    arm(CX - tw * 0.42, y0 + u * 0.05, CX - u * 0.12, y0 + u * 0.38, hero.sleeves[0]);
    arm(CX + tw * 0.42, y0 + u * 0.05, CX + u * 0.02, magY, hero.sleeves[1]);

    // head: the real photo
    const hx = CX, hy = y0 - u * 0.22, rx = u * 0.15, ry = u * 0.185;
    g.save();
    g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, 7); g.clip();
    const heroImg = heroImgs[CHAR.id];
    if (heroImg.complete && heroImg.naturalWidth) {
      const [sx, sy, sw, sh2] = hero.faceCrop.map((v) => v * heroImg.naturalWidth);
      g.drawImage(heroImg, sx, sy, sw, sh2, hx - rx, hy - ry, rx * 2, ry * 2);
    } else { g.fillStyle = hero.skin; g.fillRect(hx - rx, hy - ry, rx * 2, ry * 2); }
    g.restore();
    g.strokeStyle = "#0004"; g.lineWidth = 2; g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, 7); g.stroke();
    if (hero.hat === "tophat") drawTopHat(hx, hy - ry * 0.78, rx * 1.2);
  }

  // top hat (worn during Petr's Boss mode); cx/brimY = where the brim sits, w = head width
  function drawTopHat(cx, brimY, w) {
    const g = ctx;
    g.fillStyle = "#151515";
    roundRect(g, cx - w * 0.62, brimY - w * 1.15, w * 1.24, w * 1.15, w * 0.08); g.fill();   // crown
    g.fillStyle = "#b3261e"; g.fillRect(cx - w * 0.62, brimY - w * 0.32, w * 1.24, w * 0.18); // band
    g.fillStyle = "#151515"; g.beginPath(); g.ellipse(cx, brimY, w * 0.95, w * 0.17, 0, 0, 7); g.fill(); // brim
    g.fillStyle = "#ffffff22"; g.fillRect(cx - w * 0.5, brimY - w * 1.1, w * 0.12, w * 0.75);  // shine
  }

  function drawViktor() {
    const hero = D.hero, g = ctx, G = heroGeom(), u = G.u;
    g.save();
    if (S.state === "dying" || S.state === "over") {
      const k = Math.min(1, S.deathT / hero.deathDuration);
      const e = k * k;
      g.translate(CX, H);
      g.rotate(-e * 0.9);
      g.translate(-CX, -H + e * u * 0.25 - Math.sin(k * Math.PI) * u * 0.05);
    }
    // turn around to face the camera while reloading (horizontal flip animation)
    const f = turnAmount(), flip = Math.cos(Math.PI * f);
    if (f > 0) { g.translate(CX, 0); g.scale(Math.max(0.04, Math.abs(flip)), 1); g.translate(-CX, 0); }
    if (flip < 0) { drawViktorFront(u, G.y0); g.restore(); return; }
    const y0 = G.y0;
    const tw = u * 0.62, bw = u * 0.56;

    // left arm (behind gun) to foregrip
    const fore = { x: G.stock.x + G.dir.x * G.gunLen * 0.55, y: G.stock.y + G.dir.y * G.gunLen * 0.55 };
    const grip = { x: G.stock.x + G.dir.x * G.gunLen * 0.18, y: G.stock.y + G.dir.y * G.gunLen * 0.18 };
    const lsh = { x: CX - tw * 0.42, y: y0 + u * 0.05 }, rsh = { x: CX + tw * 0.42, y: y0 + u * 0.05 };

    // torso with hoops
    g.save();
    g.beginPath();
    g.moveTo(CX - tw / 2, y0 + u * 0.06);
    g.quadraticCurveTo(CX - tw / 2, y0 - u * 0.02, CX - tw * 0.2, y0 - u * 0.03);
    g.lineTo(CX + tw * 0.2, y0 - u * 0.03);
    g.quadraticCurveTo(CX + tw / 2, y0 - u * 0.02, CX + tw / 2, y0 + u * 0.06);
    g.lineTo(CX + bw / 2, H + 20); g.lineTo(CX - bw / 2, H + 20); g.closePath();
    g.clip();
    const band = u * 0.075;
    for (let y = y0 - u * 0.05, i = 0; y < H + 30; y += band, i++) {
      g.fillStyle = hero.shirtStripes[i % 2]; g.fillRect(CX - tw, y, tw * 2, band + 1);
    }
    // shading
    const sh = g.createLinearGradient(CX - tw / 2, 0, CX + tw / 2, 0);
    sh.addColorStop(0, "#0004"); sh.addColorStop(0.5, "#0000"); sh.addColorStop(1, "#0003");
    g.fillStyle = sh; g.fillRect(CX - tw, y0 - u * 0.1, tw * 2, H);
    g.restore();
    // collar
    g.fillStyle = hero.collar;
    roundRect(g, CX - u * 0.12, y0 - u * 0.06, u * 0.24, u * 0.06, u * 0.02); g.fill();

    // arms helper
    const arm = (from, to, sleeveColor) => {
      g.lineCap = "round";
      g.strokeStyle = hero.skin; g.lineWidth = u * 0.085;
      g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(to.x, to.y); g.stroke();
      const sx = from.x + (to.x - from.x) * 0.35, sy = from.y + (to.y - from.y) * 0.35;
      g.strokeStyle = sleeveColor; g.lineWidth = u * 0.11;
      g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(sx, sy); g.stroke();
    };
    arm(lsh, fore, hero.sleeves[0]);

    // rifle (tapers with perspective)
    const px = -G.dir.y, py = G.dir.x;
    const pt = (t, w) => [G.stock.x + G.dir.x * G.gunLen * t + px * w, G.stock.y + G.dir.y * G.gunLen * t + py * w];
    const poly = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    if (D.weapon.look === "money") {
      poly([pt(0, -u * 0.05), pt(0, u * 0.05), pt(0.7, u * 0.035), pt(0.7, -u * 0.035)], "#1f7a3a");           // body
      poly([pt(0.05, -u * 0.012), pt(0.05, u * 0.012), pt(0.7, u * 0.01), pt(0.7, -u * 0.01)], "#e0b43a");      // gold stripe
      poly([pt(0.68, -u * 0.03), pt(0.68, u * 0.03), pt(1, u * 0.05), pt(1, -u * 0.05)], "#e0b43a");          // flared barrel
      poly([pt(0.3, -u * 0.035), pt(0.3, -u * 0.075), pt(0.55, -u * 0.065), pt(0.55, -u * 0.03)], "#7bc67e");  // cash stack on top
      poly([pt(0.33, -u * 0.05), pt(0.33, -u * 0.055), pt(0.52, -u * 0.05), pt(0.52, -u * 0.045)], "#2e7d32");
    } else {
      poly([pt(0, -u * 0.045), pt(0, u * 0.045), pt(0.3, u * 0.03), pt(0.3, -u * 0.03)], "#5a3a22");           // stock
      poly([pt(0.25, -u * 0.035), pt(0.25, u * 0.035), pt(0.72, u * 0.02), pt(0.72, -u * 0.02)], "#2b2b2e");    // receiver
      poly([pt(0.38, u * 0.02), pt(0.36, u * 0.075), pt(0.44, u * 0.07), pt(0.46, u * 0.02)], "#1d1d20");     // magazine
      poly([pt(0.7, -u * 0.009), pt(0.7, u * 0.009), pt(1, u * 0.007), pt(1, -u * 0.007)], "#111");             // barrel
      poly([pt(0.4, -u * 0.035), pt(0.4, -u * 0.05), pt(0.55, -u * 0.045), pt(0.55, -u * 0.03)], "#444");     // sight rail
    }

    arm(rsh, grip, hero.sleeves[1]);

    // neck & head (seen from behind)
    g.fillStyle = hero.skin;
    g.fillRect(CX - u * 0.065, y0 - u * 0.13, u * 0.13, u * 0.1);
    g.beginPath(); g.ellipse(CX - u * 0.125, y0 - u * 0.2, u * 0.025, u * 0.04, 0, 0, 7); g.ellipse(CX + u * 0.125, y0 - u * 0.2, u * 0.025, u * 0.04, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(CX, y0 - u * 0.21, u * 0.125, u * 0.15, 0, 0, 7); g.fill();
    // buzz cut (head seen from behind: mostly hair, skin at the nape)
    g.save();
    g.beginPath(); g.ellipse(CX, y0 - u * 0.21, u * 0.125, u * 0.15, 0, 0, 7); g.clip();
    g.fillStyle = hero.hair;
    g.beginPath(); g.ellipse(CX, y0 - u * 0.25, u * 0.14, u * 0.15, 0, 0, 7); g.fill();
    g.fillStyle = "#0002";
    for (let i = 0; i < 60; i++) {
      const a = i * 2.4, r = (i % 9) / 9;
      g.fillRect(CX + Math.cos(a) * u * 0.11 * r, y0 - u * 0.25 + Math.sin(a) * u * 0.12 * r, 2, 2);
    }
    g.restore();
    if (hero.glasses) {
      // glasses temples visible from behind, hooked over the ears
      g.strokeStyle = "#222"; g.lineWidth = u * 0.012; g.lineCap = "round";
      [-1, 1].forEach((sd) => { g.beginPath(); g.moveTo(CX + sd * u * 0.135, y0 - u * 0.24); g.quadraticCurveTo(CX + sd * u * 0.13, y0 - u * 0.2, CX + sd * u * 0.11, y0 - u * 0.18); g.stroke(); });
    }
    if (hero.hat === "tophat") drawTopHat(CX, y0 - u * 0.31, u * 0.18);


    // muzzle flash
    if (S.flash > 0) {
      const r = u * 0.09 * (0.6 + S.flash);
      const grd = g.createRadialGradient(G.muzzle.x, G.muzzle.y, 0, G.muzzle.x, G.muzzle.y, r);
      const money = D.weapon.look === "money";
      grd.addColorStop(0, "#fffbe0"); grd.addColorStop(0.4, money ? "#9be7a1" : "#ffd23a"); grd.addColorStop(1, money ? "#2e7d3200" : "#ff6a0000");
      g.fillStyle = grd; g.beginPath(); g.arc(G.muzzle.x, G.muzzle.y, r, 0, 7); g.fill();
      g.fillStyle = "#fff6";
      for (let i = 0; i < 5; i++) {
        const a = Math.atan2(G.dir.y, G.dir.x) + (i - 2) * 0.35;
        g.beginPath(); g.moveTo(G.muzzle.x, G.muzzle.y);
        g.lineTo(G.muzzle.x + Math.cos(a - 0.08) * r * 1.4, G.muzzle.y + Math.sin(a - 0.08) * r * 1.4);
        g.lineTo(G.muzzle.x + Math.cos(a + 0.08) * r * 1.4, G.muzzle.y + Math.sin(a + 0.08) * r * 1.4); g.fill();
      }
    }
    g.restore();
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sx = (Math.random() - 0.5) * S.shake, sy = (Math.random() - 0.5) * S.shake;
    ctx.save(); ctx.translate(sx, sy);
    ctx.drawImage(bg, 0, 0, W, H);

    drawBroomLane();
    // enemies far → near
    const sorted = S.enemies.slice().sort((a, b) => b.d - a.d);
    // Ivetas and tractors, far to near
    const items = sorted.map((e) => ({ d: e.d, f: () => { drawIveta(e); drawBounty(e); } }));
    if (S.tractor) for (const r of S.tractor.rows) items.push({ d: r.d, f: () => drawTractorRow(r) });
    items.sort((a, b) => b.d - a.d).forEach((it) => it.f());
    drawBroom();
    drawNukes();
    drawDog();

    // tracers
    for (const t of S.tracers) {
      ctx.strokeStyle = `rgba(255,230,120,${t.t / 0.09})`; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
    }
    // particles
    for (const p of S.particles) {
      ctx.globalAlpha = Math.min(1, p.t * 3);
      ctx.fillStyle = p.c;
      if (p.bill) {
        const k = p.t / p.life, w = p.r * (0.4 + 0.6 * k);
        ctx.globalAlpha = 1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = "#7bc67e"; ctx.fillRect(-w, -w * 0.5, w * 2, w); ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 1; ctx.strokeRect(-w, -w * 0.5, w * 2, w);
        ctx.fillStyle = "#2e7d32"; ctx.beginPath(); ctx.arc(0, 0, w * 0.28, 0, 7); ctx.fill(); ctx.restore();
      } else if (p.ring) { ctx.strokeStyle = p.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (1.2 - p.t * 0.8), p.r * 0.5 * (1.2 - p.t * 0.8), 0, 0, 7); ctx.stroke(); }
      else if (p.text) { ctx.font = `900 ${p.r}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#1b4d23"; ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y); }
      else if (p.star) { drawStar(p.x, p.y, p.r * 1.6); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.dust ? p.r * (1.5 - p.t) * 2 : p.r, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    drawViktor();

    // crosshair at last aim
    if (S.state === "playing" && !S.broomAiming) {
      ctx.strokeStyle = "#fffc"; ctx.lineWidth = 2;
      const { x, y } = S.aim, r = 12;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
      ctx.moveTo(x - r - 6, y); ctx.lineTo(x - r + 4, y); ctx.moveTo(x + r - 4, y); ctx.lineTo(x + r + 6, y);
      ctx.moveTo(x, y - r - 6); ctx.lineTo(x, y - r + 4); ctx.moveTo(x, y + r - 4); ctx.lineTo(x, y + r + 6); ctx.stroke();
    }
    ctx.restore();

    if (S.state === "playing" && S.broomAiming) {
      ctx.fillStyle = "#fff"; ctx.font = "800 22px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.shadowColor = "#000"; ctx.shadowBlur = 6; ctx.fillText(T.broomAim, CX, H * 0.25); ctx.shadowBlur = 0;
    }
    if (S.whiteFlash > 0) { ctx.fillStyle = `rgba(255,250,220,${S.whiteFlash})`; ctx.fillRect(0, 0, W, H); }
    drawBanner();
    // reload text
    if (S.state === "playing" && S.reloading > 0) {
      ctx.fillStyle = "#fff"; ctx.font = "800 26px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.shadowColor = "#000"; ctx.shadowBlur = 6;
      ctx.fillText(`${T.reloading} ${S.reloading.toFixed(1)}s`, CX, H * 0.18); ctx.shadowBlur = 0;
    }
    // death tint
    if (S.state === "dying" || S.state === "over") {
      const k = Math.min(1, S.deathT / D.hero.deathDuration);
      ctx.fillStyle = `rgba(120,0,0,${0.55 * k})`; ctx.fillRect(0, 0, W, H);
    }
  }

  function drawStar(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
      i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  // ---------- HUD ----------
  function updateTractorBtn() {
    const btn = $("tractorBtn"), cd = secondCd(), act = S.tractor || S.dolla;
    const k = act ? act.t / (S.tractor ? D.tractor.duration : D.dolla.duration) : Math.min(1, S.tractorCharge / cd);
    btn.style.setProperty("--p", `${k * 360}deg`);
    btn.classList.toggle("ready", !act && k >= 1);
    btn.classList.toggle("aiming", !!act);
    $("tractorTime").textContent = act ? Math.ceil(act.t) + "s" : k >= 1 ? "" : Math.ceil(cd - S.tractorCharge);
  }
  function updateBroomBtn() {
    const btn = $("broom"), cd = abilityCd();
    const k = S.power ? S.power.t / D.nuke.duration : Math.min(1, S.broomCharge / cd);
    btn.style.setProperty("--p", `${k * 360}deg`);
    btn.classList.toggle("ready", !S.power && k >= 1);
    btn.classList.toggle("aiming", S.broomAiming || !!S.power);
    $("broomTime").textContent = S.power ? Math.ceil(S.power.t) + "s" : k >= 1 ? "" : Math.ceil(cd - S.broomCharge);
  }
  function updateShotgunBtn() {
    const SG = D.shotgun, btn = $("shotgunBtn");
    if (!CHAR.shotgun || S.state !== "playing") { btn.classList.add("hidden"); S.shotgun = false; return; }
    if (S.shotgun && !S.power && S.ammo < SG.ammoPerShot) S.shotgun = false;
    const avail = S.power || S.ammo > SG.showAbove || S.shotgun;
    btn.classList.toggle("hidden", !avail);
    btn.classList.toggle("aiming", S.shotgun);
    btn.classList.toggle("ready", avail && !S.shotgun);
  }
  let lastHud = "";
  function updateHud() {
    updateShotgunBtn();
    const ammoTxt = S.power ? "∞" : S.reloading > 0 ? "⟳ " + S.reloading.toFixed(1) : `${S.ammo} / ${D.weapon.magazine}`;
    const key = S.score + "|" + S.kills + "|" + ammoTxt;
    if (key === lastHud) return; lastHud = key;
    $("score").textContent = S.score;
    $("kills").textContent = `${T.kills} ${S.kills}`;
    $("ammoText").textContent = ammoTxt;
    $("reloadBar").firstElementChild.style.width = S.reloading > 0 ? `${(1 - S.reloading / D.weapon.reloadTime) * 100}%` : `${Math.min(1, S.ammo / D.weapon.magazine) * 100}%`;
  }

  // ---------- Leaderboard / backend ----------
  const LOCAL_KEY = "viktor-scores";
  const localScores = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch (e) { return []; } };
  const saveLocal = (entry) => {
    try {
      const all = localScores().concat(entry).sort((a, b) => b.score - a.score).slice(0, 50);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch (e) {}
  };

  async function fetchScores() {
    try {
      const r = await fetch(`${D.api.scores}?limit=${D.api.topN}`, { cache: "no-store" });
      if (!r.ok) throw 0;
      return await r.json();
    } catch (e) { return localScores().slice(0, D.api.topN); }
  }

  async function renderBoard(el) {
    const list = await fetchScores();
    el.innerHTML = "";
    list.forEach((s, i) => {
      const li = document.createElement("li");
      const a = document.createElement("span"); a.textContent = `${i + 1}. ${s.name}${s.hero ? " · " + s.hero : ""}`;
      const b = document.createElement("span"); b.textContent = s.score;
      li.append(a, b); el.append(li);
    });
    if (!list.length) el.innerHTML = "<li><span>—</span><span></span></li>";
  }

  async function submitScore(name) {
    const entry = { name: name.slice(0, 16) || "Anon", hero: CHAR.name, score: S.score, kills: S.kills, time: Math.round(S.time) };
    saveLocal(entry);
    try {
      const r = await fetch(D.api.scores, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) });
      if (!r.ok) throw 0;
      $("saveMsg").textContent = T.saved;
    } catch (e) { $("saveMsg").textContent = T.offline; }
    renderBoard($("lbOver"));
  }

  // ---------- Screens ----------
  function gameOver() {
    S.state = "over";
    $("hud").classList.add("hidden"); $("broom").classList.add("hidden"); $("tractorBtn").classList.add("hidden"); $("shotgunBtn").classList.add("hidden");
    $("stats").innerHTML = `${T.yourScore}: <b>${S.score}</b><br>${T.kills}: ${S.kills} · ${T.time}: ${Math.floor(S.time)}s`;
    $("saveMsg").textContent = "";
    $("nameForm").classList.remove("hidden");
    try { $("nameInput").value = localStorage.getItem("viktor-name") || ""; } catch (e) {}
    $("over").classList.remove("hidden");
    renderBoard($("lbOver"));
  }

  function start() {
    audio(); if (actx && actx.state === "suspended") actx.resume();
    ["menu", "select", "over"].forEach((id) => $(id).classList.add("hidden"));
    reset();
  }

  // ---------- Input ----------
  canvas.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    if (S.broomAiming) { S.broomAim = { x: ev.clientX, y: ev.clientY }; S.broomHold = true; canvas.setPointerCapture?.(ev.pointerId); }
    else { shoot(ev.clientX, ev.clientY); if (D.weapon.auto) S.hold = { x: ev.clientX, y: ev.clientY }; }
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (S.hold) S.hold = { x: ev.clientX, y: ev.clientY };
  });
  $("shotgunBtn").addEventListener("pointerdown", (ev) => {
    ev.stopPropagation(); ev.preventDefault();
    if (S.state !== "playing") return;
    S.shotgun = !S.shotgun; S.hold = null; updateHud();
  });
  const activateSecond = () => (CHAR.dolla ? activateDolla() : activateTractor());
  $("tractorBtn").addEventListener("pointerdown", (ev) => { ev.stopPropagation(); ev.preventDefault(); activateSecond(); });
  window.addEventListener("keydown", (ev) => { if (ev.key === "t" || ev.key === "T") activateSecond(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => canvas.addEventListener(t, () => { S.hold = null; }));
  // broom: touch and hold to aim, drag to adjust, release to sweep
  canvas.addEventListener("pointermove", (ev) => { if (S.broomAiming) S.broomAim = { x: ev.clientX, y: ev.clientY }; });
  const releaseBroom = (ev) => {
    if (!S.broomHold) return;
    S.broomHold = false;
    if (S.broomAiming && S.state === "playing") fireBroom(ev.clientX, ev.clientY);
  };
  canvas.addEventListener("pointerup", releaseBroom);
  canvas.addEventListener("pointercancel", () => { S.broomHold = false; });
  $("broom").addEventListener("pointerdown", (ev) => { ev.stopPropagation(); ev.preventDefault(); toggleBroomAim(); });
  window.addEventListener("keydown", (ev) => { if (ev.key === "b" || ev.key === "B") toggleBroomAim(); });
  $("ammo").addEventListener("pointerdown", (ev) => { ev.stopPropagation(); startReload(); });
  window.addEventListener("keydown", (ev) => { if (ev.key === "r" || ev.key === "R") startReload(); });
  // title screen -> character select -> game
  function showSelect() {
    ["menu", "over"].forEach((id) => $(id).classList.add("hidden"));
    $("select").classList.remove("hidden");
    audio(); if (actx && actx.state === "suspended") actx.resume();
    renderBoard($("lbMenu"));
  }
  $("menu").addEventListener("click", (ev) => { if (ev.target.id !== "installBtn") showSelect(); });
  $("changeBtn").addEventListener("click", showSelect);
  $("startBtn").addEventListener("click", start);
  $("againBtn").addEventListener("click", start);
  $("nameForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const n = $("nameInput").value.trim();
    try { localStorage.setItem("viktor-name", n); } catch (e) {}
    $("nameForm").classList.add("hidden");
    submitScore(n);
  });

  // ---------- Install (PWA) ----------
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; $("installBtn").classList.remove("hidden"); });
  $("installBtn").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $("installBtn").classList.add("hidden");
  });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

  // ---------- Texts ----------
  function refreshPortraits() {
    document.querySelectorAll(".portrait").forEach((el) => { el.src = D.hero.photo; el.alt = CHAR.name; });
    document.querySelectorAll(".char-card").forEach((el) => el.classList.toggle("selected", el.dataset.id === CHAR.id));
  }
  // character select cards
  const cs = $("charSelect");
  D.characters.forEach((c) => {
    const b = document.createElement("button");
    b.className = "char-card"; b.dataset.id = c.id; b.type = "button";
    const img = document.createElement("img"); img.src = c.hero.photo; img.alt = c.name;
    const nm = document.createElement("b"); nm.textContent = c.name;
    const tg = document.createElement("small"); tg.textContent = c.tagline;
    const st = document.createElement("small"); st.className = "stats";
    st.textContent = `${c.weapon.magazine} ammo · ${c.weapon.auto ? "hold to fire" : "tap to fire"} · ${c.weapon.shotsToKill} hit${c.weapon.shotsToKill > 1 ? "s" : ""}/kill`;
    b.append(img, nm, tg, st);
    b.addEventListener("click", () => { setCharacter(c.id); refreshPortraits(); });
    cs.append(b);
  });
  $("charTitle").textContent = T.chooseCharacter;
  refreshPortraits();
  document.title = D.title;
  $("title").textContent = D.title;
  $("subtitle").textContent = T.subtitle;
  $("startBtn").textContent = T.tapToStart;
  $("playBtn").textContent = T.tapToPlay;
  $("changeBtn").textContent = T.changeCharacter;
  $("installBtn").textContent = T.install;
  $("overTitle").textContent = T.gameOver;
  $("againBtn").textContent = T.playAgain;
  $("submitBtn").textContent = T.submit;
  $("nameInput").placeholder = T.enterName;
  document.querySelectorAll(".lb-title").forEach((el) => (el.textContent = T.leaderboard));

  // ---------- Loop ----------
  window.addEventListener("resize", resize);
  resize();
  renderBoard($("lbMenu"));
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(S.broomAiming ? dt * D.broom.aimSlowMo : dt); draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
