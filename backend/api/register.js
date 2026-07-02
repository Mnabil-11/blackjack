import { getPool, ensureSchema } from '../lib/db.js';
import { applyCommonChecks } from '../lib/http.js';

export default async function handler(req, res) {
  if (applyCommonChecks(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  try {
    await ensureSchema();
    const pool = getPool();

    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, password]
    );

    res.status(201).json({ username, lastScore: 0 });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Database error', detail: err.message, code: err.code });
  }
}
