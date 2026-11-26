/*
 * GAME DATA — every tunable value and text in the game lives here.
 * Edit this file to change characters, weapon, difficulty, colours and texts.
 */
window.GAME_DATA = {
  version: "1.0.0",
  title: "Viktor Shooter",

  // ---- Playable characters (picked on the character select screen) ----
  // Each character has its own look ("hero"), its own gun ("weapon") and which abilities it gets.
  characters: [
    {
      id: "viktor",
      name: "Viktor",
      tagline: "Rifle · Broom · Tractor · Milena",
      broom: true,            // has the broom ability
      tractor: true,          // has the tractor ability
      milena: true,           // the wild Milena can appear
      hero: {
        name: "Viktor",
        photo: "viktor.jpg",      // portrait on menus, and his face when he turns around to reload
        faceCrop: [0.22, 0.02, 0.62, 0.78], // x, y, w, h of the face inside the photo (fractions of photo width)
        turnTime: 0.3,            // seconds to turn around at start/end of reload
        skin: "#e8b49a",
        hair: "#8a7d72",          // short grey-brown buzz cut
        shirtStripes: ["#e8321e", "#f7d417"], // red / yellow rugby hoops
        sleeves: ["#f7d417", "#e8321e"],      // left, right sleeve
        collar: "#e8321e",
        placket: "#c41a14",
        outfit: "polo",
        glasses: false,
        deathDuration: 1.6        // seconds the death animation lasts
      },
      weapon: {
        name: "Rifle",
        look: "rifle",
        magazine: 20,
        reloadTime: 3.0,          // seconds
        fireCooldown: 0.12,       // seconds between shots
        auto: false,              // false = one shot per tap
        shotsToKill: 1,           // hits needed to take down one Iveta
        hitPadding: 10,           // extra px around enemies that still counts as a hit
        splashRadius: 1.0         // metres: Ivetas this close to the one you hit also go down (0 = single target)
      }
    },
    {
      id: "petr",
      name: "Petr Burget",
      tagline: "Money gun · Boss mode · Dolla",
      broom: false,
      milena: false,
      nuke: true,             // has the Boss mode ability (see "nuke" below)
      dolla: true,            // has the "Hundred dolla dolla" ability (see "dolla" below)
      shotgun: true,          // shotgun button appears when ammo is above shotgun.showAbove
      powerHero: {            // look changes while Boss mode is active
        hat: "tophat"
      },
      hero: {
        name: "Petr",
        photo: "petr.jpg",
        faceCrop: [0.16, 0.0, 0.69, 0.87],
        turnTime: 0.3,
        skin: "#eabba0",
        hair: "#7a5c45",          // short brown
        shirtStripes: ["#1f2a44", "#1f2a44"], // navy suit jacket
        sleeves: ["#1f2a44", "#1f2a44"],
        collar: "#cfe0f5",        // light blue shirt collar
        placket: "#cfe0f5",
        outfit: "suit",
        glasses: true,
        deathDuration: 1.6
      },
      weapon: {
        name: "Money gun",
        look: "money",
        magazine: 45,
        reloadTime: 3.0,
        fireCooldown: 0.08,       // hold the screen to keep firing
        auto: true,               // true = hold to fire
        shotsToKill: 2,
        hitPadding: 10,
        splashRadius: 0
      }
    }
  ],
  defaultCharacter: "viktor",

  // ---- Enemies ----
  enemy: {
    name: "Iveta",
    skin: "#f1c6a8",
    hair: "#d9b56a",          // blonde
    hairShadow: "#b8914a",
    top: "#b02a22",           // red blouse
    pants: "#2d3a55",
    shoes: "#3a2a20",
    hp: 1,                    // hits to take down
    baseSpeed: 2.6,           // world units / second at start
    speedGrowth: 0.05,        // extra speed per second survived
    maxSpeed: 7.5,
    deathDuration: 0.9
  },

  // ---- Broom ability ----
  broom: {
    cooldown: 10,             // seconds to charge
    laneWidth: 2.4,           // metres wide sweep
    length: 40,               // how far forward it sweeps
    sweepTime: 0.8,           // seconds for the broom to travel the whole lane
    startDepth: 1.5,          // where the sweep starts (in front of Viktor)
    aimSlowMo: 0.35           // game speed while you are aiming the broom
  },

  // ---- Viktor's tractor stampede ----
  tractor: {
    cooldown: 30,             // seconds to charge
    duration: 6,              // seconds the stampede lasts; the whole field is clear at the end
    crossTime: 2.0,           // seconds one tractor takes to cross the field
    firstRow: 4.5,            // nearest row of tractors (metres in front of Viktor)
    lastRow: 38,              // farthest row
    rowSpacing: 3.5,          // metres between rows
    size: 1.9,                // how big a tractor is (metres)
    hitRadius: 1.2            // metres: Ivetas this close to a tractor get run over
  },

  // ---- Petr's Boss mode: infinite ammo + nukes ----
  nuke: {
    cooldown: 18,             // seconds to charge
    duration: 8,              // seconds Boss mode lasts
    interval: 0.9,            // average seconds between nukes
    radius: 6,                // metres: every Iveta this close to the impact goes down
    fallTime: 1.0,            // seconds a nuke takes to fall
    depth: [8, 32],           // where on the field they land
    spreadX: 7
  },

  // ---- Petr's "Hundred dolla dolla" ----
  dolla: {
    cooldown: 17,             // seconds to charge
    duration: 6,              // seconds the price tags are active (new Ivetas spawn with one too)
    min: 10,                  // smallest price tag
    max: 50                   // biggest price tag; a kill adds the tag to Petr's ammo
  },

  // ---- Petr's money shotgun ----
  shotgun: {
    showAbove: 100,           // button appears when Petr has more ammo than this (or during Boss mode)
    ammoPerShot: 50,          // ammo spent per blast
    maxKills: 3,              // most Ivetas one blast can take down
    pellets: 20,              // banknotes fired per blast
    spread: 80,               // spread radius in pixels around where you tap
    cooldown: 0.33            // seconds between blasts (hold the screen to keep blasting)
  },

  // ---- Milena (white dog ally) ----
  milena: {
    name: "Milena",
    appearScore: 350,         // she shows up once per game at this score
    color: "#ffffff",
    size: 0.45,               // metres tall
    spawnDepth: [10, 16],     // how far away she appears
    spawnSpreadX: 3.5,
    joinTime: 0.9,            // seconds to run over to Viktor after being shot
    homeX: -0.75,             // where she waits next to Viktor
    homeDepth: 3.4,
    attackInterval: 2.0,      // seconds between her attacks
    pounceRadius: 3.5,        // metres: she lands in a group and takes out every Iveta this close
    leapTime: 0.35,           // seconds for a jump out (and back)
    maxReach: 30              // only attacks Ivetas closer than this
  },

  // ---- Waves / difficulty ----
  spawn: {
    startInterval: 2.2,       // seconds between hordes at the start
    minInterval: 0.6,
    intervalDecay: 0.985,     // interval multiplier after each horde
    startHordeSize: 1,
    hordeGrowthEvery: 12,     // +1 Iveta per horde every N seconds
    maxHordeSize: 9,
    spawnDepth: 34,           // how far away they appear
    reachDepth: 2.6,          // depth at which they reach Viktor
    spreadX: 7                // horizontal spread of spawn
  },

  // ---- Score ----
  score: {
    perSecond: 10,            // points for every second survived
    perKill: 0                // set > 0 to also reward kills
  },

  // ---- World / camera ----
  world: {
    focal: 1.0,               // perspective strength
    cameraHeight: 1.6,
    personHeight: 1.75,
    sky: ["#7fb6ea", "#cfe6f7"],
    grass: ["#3d8b3a", "#4fa048"],
    hills: "#5c8f55",
    trees: "#3f6b3a"
  },

  // ---- Backend ----
  api: {
    scores: "/api/scores",
    topN: 10
  },

  // ---- Texts ----
  text: {
    tapToPlay: "Tap to play",
    tapToStart: "Start game",
    changeCharacter: "Change character",
    subtitle: "Tap the screen to shoot. Survive as long as you can!",
    reloading: "RELOADING…",
    gameOver: "GAME OVER",
    yourScore: "Score",
    kills: "Kills",
    time: "Time",
    playAgain: "Play again",
    leaderboard: "Leaderboard",
    enterName: "Your name",
    chooseCharacter: "Choose your fighter",
    submit: "Save score",
    saved: "Saved!",
    offline: "Offline – score saved on this device only",
    install: "Install app",
    milenaAppears: "A wild Milena\nhas appeared!",
    milenaJoins: "Milena joined\nyour side!",
    powerOn: "Burget\nspecial spell!",
    dollaOn: "Hundred\ndolla dolla!",
    tractorOn: "TRAKTOR TIME!",
    broomAim: "Hold & drag to aim – release to sweep!"
  }
};
