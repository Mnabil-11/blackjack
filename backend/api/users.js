import { getPool, ensureSchema } from '../lib/db.js';
import { applyCommonChecks } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

const ONLINE_WINDOW = "60 seconds";

async function search(req, res, auth) {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    res.status(200).json({ users: [] });
    return;
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT id, username, display_name,
            (last_seen_at > now() - interval '${ONLINE_WINDOW}') AS online
     FROM users
     WHERE username ILIKE $1 AND id <> $2
     ORDER BY username
     LIMIT 20`,
    [`%${q}%`, auth.userId]
  );
  res.status(200).json({ users: result.rows });
}

async function online(req, res, auth) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, username, display_name, last_seen_at
     FROM users
     WHERE last_seen_at > now() - interval '${ONLINE_WINDOW}' AND id <> $1
     ORDER BY username`,
    [auth.userId]
  );
  res.status(200).json({ users: result.rows });
}

export default async function handler(req, res) {
  if (applyCommonChecks(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    await ensureSchema();

    if (req.query.action === 'search') return await search(req, res, auth);
    if (req.query.action === 'online') return await online(req, res, auth);

    res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('users error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message, code: err.code });
  }
}
