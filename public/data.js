/*
 * GAME DATA — every tunable value and text in the game lives here.
 * Edit this file to change characters, weapon, difficulty, colours and texts.
 */
window.GAME_DATA = {
  version: "1.0.0",
  title: "Viktor vs. the Horde",

  // ---- Main character (the player) ----
  hero: {
    name: "Viktor",
    photo: "viktor.jpg",      // portrait shown on the menu and game-over screens
    skin: "#e8b49a",
    hair: "#8a7d72",          // short grey-brown buzz cut
    shirtStripes: ["#e8321e", "#f7d417"], // red / yellow rugby hoops
    shorts: "#c41a14",
    socks: ["#e8321e", "#f7d417"],
    boots: "#1b1b1b",
    deathDuration: 1.6        // seconds the death animation lasts
  },

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

  // ---- Weapon ----
  weapon: {
    name: "Rifle",
    magazine: 20,
    reloadTime: 3.0,          // seconds
    fireCooldown: 0.12,       // seconds between shots
    hitPadding: 10            // extra px around enemies that still counts as a hit
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
    tapToStart: "Tap to start",
    subtitle: "Tap the screen to shoot. Survive as long as you can!",
    reloading: "RELOADING…",
    gameOver: "GAME OVER",
    yourScore: "Score",
    kills: "Kills",
    time: "Time",
    playAgain: "Play again",
    leaderboard: "Leaderboard",
    enterName: "Your name",
    submit: "Save score",
    saved: "Saved!",
    offline: "Offline – score saved on this device only",
    install: "Install app"
  }
};
