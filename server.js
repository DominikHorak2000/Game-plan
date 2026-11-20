// Minimal backend: serves the game and a leaderboard API. No dependencies.
//   node server.js           -> http://localhost:3000
// API:
//   GET  /api/scores?limit=10   top scores
//   POST /api/scores            {name, score, kills, time}
//   GET  /api/health
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");
const DB_FILE = path.join(__dirname, "data", "scores.json");
const MAX_STORED = 500;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon"
};

function loadScores() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch { return []; }
}
function saveScores(list) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE + ".tmp", JSON.stringify(list, null, 2));
  fs.renameSync(DB_FILE + ".tmp", DB_FILE);
}
let scores = loadScores();

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > limit) { reject(new Error("too large")); req.destroy(); } });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const clean = (s) => String(s || "").replace(/[^\p{L}\p{N} _.\-]/gu, "").trim().slice(0, 16) || "Anon";
const num = (v, max) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };

async function handleApi(req, res, url) {
  if (url.pathname === "/api/health") return sendJson(res, 200, { ok: true, scores: scores.length });
  if (url.pathname !== "/api/scores") return sendJson(res, 404, { error: "not found" });

  if (req.method === "GET") {
    const limit = Math.min(100, num(url.searchParams.get("limit"), 100) || 10);
    return sendJson(res, 200, scores.slice(0, limit).map(({ name, score, kills, time }) => ({ name, score, kills, time })));
  }
  if (req.method === "POST") {
    try {
      const b = JSON.parse(await readBody(req));
      const entry = { name: clean(b.name), score: num(b.score, 1e7), kills: num(b.kills, 1e6), time: num(b.time, 1e6), at: new Date().toISOString() };
      scores.push(entry);
      scores.sort((a, c) => c.score - a.score);
      scores = scores.slice(0, MAX_STORED);
      saveScores(scores);
      return sendJson(res, 201, { ok: true, rank: scores.indexOf(entry) + 1 });
    } catch {
      return sendJson(res, 400, { error: "bad request" });
    }
  }
  sendJson(res, 405, { error: "method not allowed" });
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
  serveStatic(req, res, url);
}).listen(PORT, () => console.log(`Viktor vs. the Horde running on http://localhost:${PORT}`));
