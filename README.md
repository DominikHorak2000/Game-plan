# Viktor vs. the Horde

A mobile third-person survival shooter that runs in the browser and installs like an app (PWA).

Viktor stands still on a rugby field. Hordes of Ivetas run at him, and more come over time.
Tap the screen to shoot where you tap.

- **Rifle:** 20 rounds, then a 3-second reload. It reloads by itself when empty, or tap the ammo box (or press `R`) to reload early.
- **Score:** goes up for every second you survive.
- **Animations:** recoil, muzzle flash, tracers, enemy hit flash and fall, and Viktor's death animation.
- **Leaderboard:** scores are saved on the server, or on your phone when offline.

## All game data in one file

Everything you can tune is in **`public/data.js`**: names, colours, ammo, reload time, speeds, wave growth, scoring and all on-screen text.

## Run it

```bash
npm start          # or: node server.js   (Node 18+, no dependencies)
# open http://localhost:3000
```

To play on your phone, open `http://<your-computer-ip>:3000` on the same Wi-Fi.

## Install on your phone

Installing needs **HTTPS** (or localhost). Deploy to any Node host, for example Render, Railway or Fly.io, using the start command `node server.js`.
Then open the site on your phone and:
- **Android / Chrome:** tap **Install app** in the menu, or ⋮ → *Install app*.
- **iPhone / Safari:** Share → *Add to Home Screen*.

Once installed, it works offline. A service worker caches the game.

## Backend API

| Method | Path | Body / query |
|---|---|---|
| GET | `/api/scores?limit=10` | top scores |
| POST | `/api/scores` | `{ "name", "score", "kills", "time" }` |
| GET | `/api/health` | status |

Scores are stored in `data/scores.json`.

## Files

```
public/
  data.js      ← all game data / config
  game.js      ← game engine (canvas rendering, input, waves, HUD)
  index.html, style.css
  manifest.json, sw.js, icons/   ← installable PWA
server.js      ← static server + leaderboard API
```
