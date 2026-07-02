import { getPool, ensureSchema } from '../lib/db.js';
import { applyCommonChecks } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

async function list(req, res, auth) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT a.code, a.name, a.description, a.icon, ua.unlocked_at
     FROM achievements a
     LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
     ORDER BY a.id`,
    [auth.userId]
  );
  res.status(200).json({ achievements: result.rows });
}

export default async function handler(req, res) {
  if (applyCommonChecks(req, res)) return;

  if (req.method !== 'GET' || req.query.action !== 'list') {
    res.status(400).json({ error: 'Unknown action' });
    return;
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    await ensureSchema();
    await list(req, res, auth);
  } catch (err) {
    console.error('achievements error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message, code: err.code });
  }
}
