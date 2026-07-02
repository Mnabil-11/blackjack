import { getPool, ensureSchema } from '../lib/db.js';
import { applyCommonChecks } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

async function sendRequest(req, res, auth) {
  const { username } = req.body || {};
  if (!username) {
    res.status(400).json({ error: 'username is required' });
    return;
  }

  const pool = getPool();
  const target = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (!target.rows.length) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const addresseeId = target.rows[0].id;
  if (addresseeId === auth.userId) {
    res.status(400).json({ error: "You can't friend yourself" });
    return;
  }

  const existing = await pool.query(
    `SELECT id, status, requester_id FROM friend_requests
     WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)
     ORDER BY id DESC LIMIT 1`,
    [auth.userId, addresseeId]
  );
  if (existing.rows.length) {
    const row = existing.rows[0];
    if (row.status === 'accepted') {
      res.status(409).json({ error: 'Already friends' });
      return;
    }
    if (row.status === 'pending') {
      res.status(409).json({ error: 'A pending request already exists' });
      return;
    }
  }

  const inserted = await pool.query(
    `INSERT INTO friend_requests (requester_id, addressee_id) VALUES ($1, $2) RETURNING id`,
    [auth.userId, addresseeId]
  );
  res.status(201).json({ requestId: inserted.rows[0].id });
}

async function respond(req, res, auth) {
  const { requestId, accept } = req.body || {};
  if (!requestId || typeof accept !== 'boolean') {
    res.status(400).json({ error: 'requestId and boolean accept are required' });
    return;
  }

  const pool = getPool();
  const result = await pool.query(
    `UPDATE friend_requests
     SET status = $1, responded_at = now()
     WHERE id = $2 AND addressee_id = $3 AND status = 'pending'
     RETURNING id`,
    [accept ? 'accepted' : 'declined', requestId, auth.userId]
  );

  if (!result.rows.length) {
    res.status(404).json({ error: 'No pending request found' });
    return;
  }

  res.status(200).json({ ok: true });
}

async function remove(req, res, auth) {
  const { friendId } = req.body || {};
  if (!friendId) {
    res.status(400).json({ error: 'friendId is required' });
    return;
  }

  const pool = getPool();
  await pool.query(
    `DELETE FROM friend_requests
     WHERE status = 'accepted'
       AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
    [auth.userId, friendId]
  );
  res.status(200).json({ ok: true });
}

async function list(req, res, auth) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT u.id, u.username, u.display_name,
            (u.last_seen_at > now() - interval '60 seconds') AS online
     FROM friend_requests fr
     JOIN users u ON u.id = CASE WHEN fr.requester_id = $1 THEN fr.addressee_id ELSE fr.requester_id END
     WHERE fr.status = 'accepted' AND (fr.requester_id = $1 OR fr.addressee_id = $1)
     ORDER BY u.username`,
    [auth.userId]
  );
  res.status(200).json({ friends: result.rows });
}

async function pending(req, res, auth) {
  const pool = getPool();
  const incoming = await pool.query(
    `SELECT fr.id AS request_id, u.id AS user_id, u.username, fr.created_at
     FROM friend_requests fr JOIN users u ON u.id = fr.requester_id
     WHERE fr.addressee_id = $1 AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [auth.userId]
  );
  const outgoing = await pool.query(
    `SELECT fr.id AS request_id, u.id AS user_id, u.username, fr.created_at
     FROM friend_requests fr JOIN users u ON u.id = fr.addressee_id
     WHERE fr.requester_id = $1 AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [auth.userId]
  );
  res.status(200).json({ incoming: incoming.rows, outgoing: outgoing.rows });
}

export default async function handler(req, res) {
  if (applyCommonChecks(req, res)) return;

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    await ensureSchema();

    if (req.method === 'POST') {
      const action = req.body?.action;
      if (action === 'request') return await sendRequest(req, res, auth);
      if (action === 'respond') return await respond(req, res, auth);
      if (action === 'remove') return await remove(req, res, auth);
      res.status(400).json({ error: 'Unknown action' });
      return;
    }

    if (req.method === 'GET') {
      if (req.query.action === 'list') return await list(req, res, auth);
      if (req.query.action === 'pending') return await pending(req, res, auth);
      res.status(400).json({ error: 'Unknown action' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('friends error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message, code: err.code });
  }
}
