(() => {
  "use strict";
  const D = window.GAME_DATA;
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
    shot: () => noise(0.18, 2200, 0.5),
    empty: () => tone(900, 700, 0.05, 0.08),
    reload: () => { tone(300, 200, 0.08, 0.1); setTimeout(() => tone(500, 400, 0.08, 0.1), 2700); },
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
    deathT: 0, shake: 0
  };

  function reset() {
    Object.assign(S, {
      state: "playing", time: 0, kills: 0, score: 0,
      ammo: D.weapon.magazine, reloading: 0, cooldown: 0,
      enemies: [], particles: [], tracers: [],
      spawnTimer: 0.5, spawnInterval: D.spawn.startInterval,
      recoil: 0, flash: 0, deathT: 0, shake: 0
    });
    S.aim = { x: CX, y: HORIZON };
    $("hud").classList.remove("hidden");
    updateHud();
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
        hp: en.hp, phase: Math.random() * 6.28,
        hitT: 0, dead: false, deadT: 0, fallDir: Math.random() < 0.5 ? -1 : 1
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
    if (S.ammo <= 0) { sfx.empty(); startReload(); return; }
    S.ammo--; S.cooldown = D.weapon.fireCooldown;
    S.recoil = 1; S.flash = 1; S.shake = Math.max(S.shake, 4);
    sfx.shot();

    // hitscan: nearest living enemy under the tap
    const pad = D.weapon.hitPadding;
    let target = null;
    for (const e of S.enemies) {
      if (e.dead) continue;
      const b = enemyBox(e);
      if (px >= b.x1 - pad && px <= b.x2 + pad && py >= b.y1 - pad && py <= b.y2 + pad) {
        if (!target || e.d < target.d) target = e;
      }
    }
    const g = heroGeom();
    S.tracers.push({ x1: g.muzzle.x, y1: g.muzzle.y, x2: px, y2: py, t: 0.09 });
    if (target) {
      // splash: everyone standing within splashRadius (world metres) of the target is hit too
      const R = D.weapon.splashRadius, tx = enemyX(target);
      const victims = S.enemies.filter((e) => !e.dead && Math.hypot(enemyX(e) - tx, e.d - target.d) <= R);
      sfx.hit();
      S.particles.push({ x: px, y: py, vx: 0, vy: 0, t: 0.25, c: "#ffe27a", r: sizeAt(R, target.d), ring: true });
      for (const v of victims) {
        const vb = enemyBox(v), hx = v === target ? px : vb.sx, hy = v === target ? py : vb.fy - vb.h * 0.6;
        v.hp--; v.hitT = 0.12;
        for (let i = 0; i < 8; i++) S.particles.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.8) * 300, t: 0.4, c: "#ffe27a", r: 3 });
        if (v.hp <= 0) {
          v.dead = true; S.kills++;
          for (let i = 0; i < 6; i++) S.particles.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 200, t: 0.8, c: "#fff", r: 4, star: true });
        }
      }
    } else {
      S.particles.push({ x: px, y: py, vx: 0, vy: -40, t: 0.35, c: "#c9b99a", r: 6, dust: true });
    }
    if (S.ammo === 0) startReload();
    updateHud();
  }

  function startReload() {
    if (S.reloading > 0 || S.ammo === D.weapon.magazine || S.state !== "playing") return;
    S.reloading = D.weapon.reloadTime; sfx.reload(); updateHud();
  }

  // ---------- Update ----------
  function update(dt) {
    S.recoil = Math.max(0, S.recoil - dt * 8);
    S.flash = Math.max(0, S.flash - dt * 14);
    S.shake = Math.max(0, S.shake - dt * 30);
    S.tracers = S.tracers.filter((t) => (t.t -= dt) > 0);
    S.particles = S.particles.filter((p) => {
      p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.dust && !p.ring) p.vy += 600 * dt; return p.t > 0;
    });

    if (S.state === "playing") {
      S.time += dt;
      S.score = Math.floor(S.time * D.score.perSecond + S.kills * D.score.perKill);
      S.cooldown = Math.max(0, S.cooldown - dt);
      if (S.reloading > 0) {
        S.reloading -= dt;
        if (S.reloading <= 0) { S.reloading = 0; S.ammo = D.weapon.magazine; }
      }
      S.spawnTimer -= dt;
      if (S.spawnTimer <= 0) {
        spawnHorde();
        S.spawnInterval = Math.max(D.spawn.minInterval, S.spawnInterval * D.spawn.intervalDecay);
        S.spawnTimer = S.spawnInterval;
      }
      for (const e of S.enemies) {
        if (e.dead) continue;
        e.d -= e.speed * dt; e.phase += dt * (6 + e.speed);
        e.hitT = Math.max(0, e.hitT - dt);
        if (e.d <= D.spawn.reachDepth) { die(); break; }
      }
      updateHud();
    } else if (S.state === "dying") {
      S.deathT += dt;
      if (S.deathT >= D.hero.deathDuration) gameOver();
    }
    for (const e of S.enemies) if (e.dead) e.deadT += dt;
    S.enemies = S.enemies.filter((e) => !e.dead || e.deadT < D.enemy.deathDuration);
  }

  function die() {
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

  const heroImg = new Image();
  heroImg.src = D.hero.photo;

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
    // neck + collar (polo with placket)
    g.fillStyle = hero.skin; g.fillRect(CX - u * 0.06, y0 - u * 0.1, u * 0.12, u * 0.09);
    g.fillStyle = hero.shirtStripes[0];
    g.beginPath(); g.moveTo(CX - u * 0.13, y0 - u * 0.05); g.lineTo(CX, y0 + u * 0.08); g.lineTo(CX - u * 0.03, y0 - u * 0.04); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(CX + u * 0.13, y0 - u * 0.05); g.lineTo(CX, y0 + u * 0.08); g.lineTo(CX + u * 0.03, y0 - u * 0.04); g.closePath(); g.fill();
    g.fillStyle = "#c41a14"; g.fillRect(CX - u * 0.015, y0 + u * 0.02, u * 0.03, u * 0.14);

    // rifle across the chest, magazine out → in animation
    const prog = 1 - S.reloading / D.weapon.reloadTime;
    g.save(); g.translate(CX, y0 + u * 0.3); g.rotate(-0.45);
    g.fillStyle = "#5a3a22"; roundRect(g, -u * 0.34, -u * 0.035, u * 0.18, u * 0.07, u * 0.015); g.fill();
    g.fillStyle = "#2b2b2e"; roundRect(g, -u * 0.17, -u * 0.04, u * 0.3, u * 0.08, u * 0.015); g.fill();
    g.fillStyle = "#111"; g.fillRect(u * 0.12, -u * 0.012, u * 0.24, u * 0.024);
    const magDrop = prog < 0.5 ? Math.min(1, prog * 4) : Math.max(0, 1 - (prog - 0.5) * 4);
    g.fillStyle = "#1d1d20"; roundRect(g, -u * 0.04, u * 0.03 + magDrop * u * 0.12, u * 0.06, u * 0.12, u * 0.01); g.fill();
    g.restore();
    // arms: right hand on grip, left hand on the magazine
    const arm = (sx, sy, ex, ey, c) => {
      g.lineCap = "round";
      g.strokeStyle = hero.skin; g.lineWidth = u * 0.085; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = c; g.lineWidth = u * 0.11; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (ex - sx) * 0.35, sy + (ey - sy) * 0.35); g.stroke();
    };
    const magY = y0 + u * 0.36 + magDrop * u * 0.1;
    arm(CX - tw * 0.42, y0 + u * 0.05, CX - u * 0.12, y0 + u * 0.38, hero.shirtStripes[1]);
    arm(CX + tw * 0.42, y0 + u * 0.05, CX + u * 0.02, magY, hero.shirtStripes[0]);

    // head: the real photo
    const hx = CX, hy = y0 - u * 0.22, rx = u * 0.15, ry = u * 0.185;
    g.save();
    g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, 7); g.clip();
    if (heroImg.complete && heroImg.naturalWidth) {
      const [sx, sy, sw, sh2] = hero.faceCrop.map((v) => v * heroImg.naturalWidth);
      g.drawImage(heroImg, sx, sy, sw, sh2, hx - rx, hy - ry, rx * 2, ry * 2);
    } else { g.fillStyle = hero.skin; g.fillRect(hx - rx, hy - ry, rx * 2, ry * 2); }
    g.restore();
    g.strokeStyle = "#0004"; g.lineWidth = 2; g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, 7); g.stroke();
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
    g.fillStyle = hero.shirtStripes[0];
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
    arm(lsh, fore, hero.shirtStripes[1]);

    // rifle (tapers with perspective)
    const px = -G.dir.y, py = G.dir.x;
    const pt = (t, w) => [G.stock.x + G.dir.x * G.gunLen * t + px * w, G.stock.y + G.dir.y * G.gunLen * t + py * w];
    const poly = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    poly([pt(0, -u * 0.045), pt(0, u * 0.045), pt(0.3, u * 0.03), pt(0.3, -u * 0.03)], "#5a3a22");           // stock
    poly([pt(0.25, -u * 0.035), pt(0.25, u * 0.035), pt(0.72, u * 0.02), pt(0.72, -u * 0.02)], "#2b2b2e");    // receiver
    poly([pt(0.38, u * 0.02), pt(0.36, u * 0.075), pt(0.44, u * 0.07), pt(0.46, u * 0.02)], "#1d1d20");     // magazine
    poly([pt(0.7, -u * 0.009), pt(0.7, u * 0.009), pt(1, u * 0.007), pt(1, -u * 0.007)], "#111");             // barrel
    poly([pt(0.4, -u * 0.035), pt(0.4, -u * 0.05), pt(0.55, -u * 0.045), pt(0.55, -u * 0.03)], "#444");     // sight rail

    arm(rsh, grip, hero.shirtStripes[0]);

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


    // muzzle flash
    if (S.flash > 0) {
      const r = u * 0.09 * (0.6 + S.flash);
      const grd = g.createRadialGradient(G.muzzle.x, G.muzzle.y, 0, G.muzzle.x, G.muzzle.y, r);
      grd.addColorStop(0, "#fffbe0"); grd.addColorStop(0.4, "#ffd23a"); grd.addColorStop(1, "#ff6a0000");
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

    // enemies far → near
    const sorted = S.enemies.slice().sort((a, b) => b.d - a.d);
    for (const e of sorted) drawIveta(e);

    // tracers
    for (const t of S.tracers) {
      ctx.strokeStyle = `rgba(255,230,120,${t.t / 0.09})`; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
    }
    // particles
    for (const p of S.particles) {
      ctx.globalAlpha = Math.min(1, p.t * 3);
      ctx.fillStyle = p.c;
      if (p.ring) { ctx.strokeStyle = p.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (1.2 - p.t * 0.8), p.r * 0.5 * (1.2 - p.t * 0.8), 0, 0, 7); ctx.stroke(); }
      else if (p.star) { drawStar(p.x, p.y, p.r * 1.6); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.dust ? p.r * (1.5 - p.t) * 2 : p.r, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    drawViktor();

    // crosshair at last aim
    if (S.state === "playing") {
      ctx.strokeStyle = "#fffc"; ctx.lineWidth = 2;
      const { x, y } = S.aim, r = 12;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
      ctx.moveTo(x - r - 6, y); ctx.lineTo(x - r + 4, y); ctx.moveTo(x + r - 4, y); ctx.lineTo(x + r + 6, y);
      ctx.moveTo(x, y - r - 6); ctx.lineTo(x, y - r + 4); ctx.moveTo(x, y + r - 4); ctx.lineTo(x, y + r + 6); ctx.stroke();
    }
    ctx.restore();

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
  let lastHud = "";
  function updateHud() {
    const ammoTxt = S.reloading > 0 ? "⟳ " + S.reloading.toFixed(1) : `${S.ammo} / ${D.weapon.magazine}`;
    const key = S.score + "|" + S.kills + "|" + ammoTxt;
    if (key === lastHud) return; lastHud = key;
    $("score").textContent = S.score;
    $("kills").textContent = `${T.kills} ${S.kills}`;
    $("ammoText").textContent = ammoTxt;
    $("reloadBar").firstElementChild.style.width = S.reloading > 0 ? `${(1 - S.reloading / D.weapon.reloadTime) * 100}%` : `${(S.ammo / D.weapon.magazine) * 100}%`;
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
      const a = document.createElement("span"); a.textContent = `${i + 1}. ${s.name}`;
      const b = document.createElement("span"); b.textContent = s.score;
      li.append(a, b); el.append(li);
    });
    if (!list.length) el.innerHTML = "<li><span>—</span><span></span></li>";
  }

  async function submitScore(name) {
    const entry = { name: name.slice(0, 16) || "Anon", score: S.score, kills: S.kills, time: Math.round(S.time) };
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
    $("hud").classList.add("hidden");
    $("stats").innerHTML = `${T.yourScore}: <b>${S.score}</b><br>${T.kills}: ${S.kills} · ${T.time}: ${Math.floor(S.time)}s`;
    $("saveMsg").textContent = "";
    $("nameForm").classList.remove("hidden");
    try { $("nameInput").value = localStorage.getItem("viktor-name") || ""; } catch (e) {}
    $("over").classList.remove("hidden");
    renderBoard($("lbOver"));
  }

  function start() {
    audio(); if (actx && actx.state === "suspended") actx.resume();
    $("menu").classList.add("hidden"); $("over").classList.add("hidden");
    reset();
  }

  // ---------- Input ----------
  canvas.addEventListener("pointerdown", (ev) => { ev.preventDefault(); shoot(ev.clientX, ev.clientY); });
  $("ammo").addEventListener("pointerdown", (ev) => { ev.stopPropagation(); startReload(); });
  window.addEventListener("keydown", (ev) => { if (ev.key === "r" || ev.key === "R") startReload(); });
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
  document.querySelectorAll(".portrait").forEach((el) => { el.src = D.hero.photo; el.alt = D.hero.name; });
  document.title = D.title;
  $("title").textContent = D.title;
  $("subtitle").textContent = T.subtitle;
  $("startBtn").textContent = T.tapToStart;
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
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
