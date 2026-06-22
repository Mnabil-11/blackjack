import fs from 'fs';
import path from 'path';

// Vercel's deployment filesystem is read-only except for /tmp.
// /tmp is wiped on cold starts/redeploys, so scores aren't durable in production —
// fine for a simple leaderboard, not for data you can't afford to lose.
const DATA_FILE = process.env.VERCEL
  ? '/tmp/scores.json'
  : path.join(process.cwd(), 'data', 'scores.json');

function readScores() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeScores(scores) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2));
}

export default function handler(req, res) {
  // Frontend and backend are separate Vercel projects on different domains, so CORS is required.
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const password = process.env.PASSWORD;
  if (!password) {
    res.status(500).json({ error: 'Server misconfigured: PASSWORD env var not set' });
    return;
  }

  if (req.method === 'GET') {
    const scores = readScores().sort((a, b) => b.score - a.score);
    res.status(200).json(scores);
    return;
  }

  if (req.method === 'POST') {
    const { username, score, password: submittedPassword } = req.body || {};

    if (submittedPassword !== password) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    if (!username || typeof score !== 'number') {
      res.status(400).json({ error: 'username and numeric score are required' });
      return;
    }

    const scores = readScores();
    const existing = scores.find((s) => s.username === username);

    if (existing) {
      if (score > existing.score) existing.score = score;
    } else {
      scores.push({ username, score });
    }

    writeScores(scores);
    res.status(200).json(scores.sort((a, b) => b.score - a.score));
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
