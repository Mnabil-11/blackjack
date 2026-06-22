import bcrypt from 'bcryptjs';
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

    const result = await pool.query(
      'SELECT password_hash, last_score FROM users WHERE username = $1',
      [username]
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { password_hash, last_score } = result.rows[0];
    const valid = await bcrypt.compare(password, password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    res.status(200).json({ username, lastScore: last_score });
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
}
