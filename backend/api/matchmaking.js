import { getPool, ensureSchema } from '../lib/db.js';
import { applyCommonChecks } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { createDeck, shuffleDeck } from '../lib/blackjack.js';

async function join(req, res, auth) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO matchmaking_queue (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [auth.userId]
  );
  res.status(200).json({ ok: true });
}

async function leave(req, res, auth) {
  const pool = getPool();
  await pool.query('DELETE FROM matchmaking_queue WHERE user_id = $1', [auth.userId]);
  res.status(200).json({ ok: true });
}

// Polled by the client. If we're already matched, return the match id.
// Otherwise, opportunistically try to pair with another waiting player.
async function status(req, res, auth) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const mine = await client.query(
      'SELECT matched_id FROM matchmaking_queue WHERE user_id = $1 FOR UPDATE',
      [auth.userId]
    );
    if (!mine.rows.length) {
      await client.query('COMMIT');
      res.status(200).json({ status: 'not_queued' });
      return;
    }
    if (mine.rows[0].matched_id) {
      const matchId = mine.rows[0].matched_id;
      await client.query('DELETE FROM matchmaking_queue WHERE user_id = $1', [auth.userId]);
      await client.query('COMMIT');
      res.status(200).json({ status: 'matched', matchId });
      return;
    }

    const opponent = await client.query(
      `SELECT user_id FROM matchmaking_queue
       WHERE matched_id IS NULL AND user_id <> $1
       ORDER BY queued_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1`,
      [auth.userId]
    );

    if (!opponent.rows.length) {
      await client.query('COMMIT');
      res.status(200).json({ status: 'waiting' });
      return;
    }

    const opponentId = opponent.rows[0].user_id;
    const deck = shuffleDeck(createDeck());
    const state = {
      deck,
      hands: { p1: [deck.pop(), deck.pop()], p2: [deck.pop(), deck.pop()] },
      standing: { p1: false, p2: false },
      busted: { p1: false, p2: false },
    };

    const match = await client.query(
      `INSERT INTO matches (mode, status, player1_id, player2_id, state)
       VALUES ('random', 'active', $1, $2, $3) RETURNING id`,
      [auth.userId, opponentId, JSON.stringify(state)]
    );
    const matchId = match.rows[0].id;

    await client.query('UPDATE matchmaking_queue SET matched_id = $1 WHERE user_id = ANY($2)', [
      matchId,
      [auth.userId, opponentId],
    ]);

    await client.query('COMMIT');
    res.status(200).json({ status: 'matched', matchId });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default async function handler(req, res) {
  if (applyCommonChecks(req, res)) return;

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    await ensureSchema();

    if (req.method === 'POST') {
      const action = req.body?.action;
      if (action === 'join') return await join(req, res, auth);
      if (action === 'leave') return await leave(req, res, auth);
      res.status(400).json({ error: 'Unknown action' });
      return;
    }

    if (req.method === 'GET' && req.query.action === 'status') {
      return await status(req, res, auth);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('matchmaking error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message, code: err.code });
  }
}
