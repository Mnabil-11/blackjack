import bcrypt from 'bcryptjs';
import { getPool, ensureSchema } from '../lib/db.js';
import { applyCommonChecks } from '../lib/http.js';

export default async function handler(req, res) {
  if (applyCommonChecks(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { username, password, score } = req.body || {};
  if (!username || !password || typeof score !== 'number') {
    res.status(400).json({ error: 'username, password and numeric score are required' });
    return;
  }

  try {
    await ensureSchema();
    const pool = getPool();

    const result = await pool.query('SELECT password_hash FROM users WHERE username = $1', [username]);
    if (!result.rows.length) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await pool.query('UPDATE users SET last_score = $1 WHERE username = $2', [score, username]);
    res.status(200).json({ username, lastScore: score });
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
}
