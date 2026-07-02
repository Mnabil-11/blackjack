import { getPool, ensureSchema } from '../lib/db.js';
import { applyCommonChecks } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { createDeck, shuffleDeck, calculateScore, isBlackjack, compareHands } from '../lib/blackjack.js';
import { recordMatchResult } from '../lib/stats.js';
import { checkAchievements } from '../lib/achievements.js';
import { applyRankedResult } from '../lib/ranked.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function dealInitialState() {
  const deck = shuffleDeck(createDeck());
  return {
    deck,
    hands: { p1: [deck.pop(), deck.pop()], p2: [deck.pop(), deck.pop()] },
    standing: { p1: false, p2: false },
    busted: { p1: false, p2: false },
  };
}

function seatFor(match, userId) {
  if (match.player1_id === userId) return 'p1';
  if (match.player2_id === userId) return 'p2';
  return null;
}

// Client-facing view: never leak the undrawn deck.
function toView(match, userId) {
  const seat = seatFor(match, userId);
  const { deck: _deck, ...state } = match.state;
  return {
    id: match.id,
    mode: match.mode,
    status: match.status,
    you: seat,
    hands: state.hands,
    standing: state.standing,
    busted: state.busted,
    scores: {
      p1: calculateScore(state.hands.p1),
      p2: calculateScore(state.hands.p2),
    },
    winnerId: match.winner_id,
    player1Id: match.player1_id,
    player2Id: match.player2_id,
  };
}

async function invite(req, res, auth) {
  const { username } = req.body || {};
  if (!username) {
    res.status(400).json({ error: 'username is required' });
    return;
  }

  const pool = getPool();
  const friend = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (!friend.rows.length) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const friendId = friend.rows[0].id;

  const friendship = await pool.query(
    `SELECT 1 FROM friend_requests
     WHERE status = 'accepted'
       AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
    [auth.userId, friendId]
  );
  if (!friendship.rows.length) {
    res.status(400).json({ error: 'You can only invite friends' });
    return;
  }

  const inserted = await pool.query(
    `INSERT INTO matches (mode, status, player1_id, player2_id, state)
     VALUES ('friend', 'pending_invite', $1, $2, '{}'::jsonb) RETURNING id`,
    [auth.userId, friendId]
  );
  res.status(201).json({ matchId: inserted.rows[0].id });
}

async function incoming(req, res, auth) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT m.id AS match_id, u.username AS from_username, m.created_at
     FROM matches m JOIN users u ON u.id = m.player1_id
     WHERE m.player2_id = $1 AND m.status = 'pending_invite'
     ORDER BY m.created_at DESC`,
    [auth.userId]
  );
  res.status(200).json({ invites: result.rows });
}

async function respondInvite(req, res, auth) {
  const { matchId, accept } = req.body || {};
  if (!matchId || typeof accept !== 'boolean' || !UUID_RE.test(matchId)) {
    res.status(400).json({ error: 'matchId and boolean accept are required' });
    return;
  }

  const pool = getPool();
  if (!accept) {
    const declined = await pool.query(
      `UPDATE matches SET status = 'declined', updated_at = now()
       WHERE id = $1 AND player2_id = $2 AND status = 'pending_invite' RETURNING id`,
      [matchId, auth.userId]
    );
    if (!declined.rows.length) {
      res.status(404).json({ error: 'No pending invite found' });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  const state = dealInitialState();
  const accepted = await pool.query(
    `UPDATE matches SET status = 'active', state = $3, updated_at = now()
     WHERE id = $1 AND player2_id = $2 AND status = 'pending_invite' RETURNING id`,
    [matchId, auth.userId, JSON.stringify(state)]
  );
  if (!accepted.rows.length) {
    res.status(404).json({ error: 'No pending invite found' });
    return;
  }
  res.status(200).json({ ok: true, matchId });
}

async function state(req, res, auth) {
  const { matchId } = req.query;
  if (!matchId || !UUID_RE.test(matchId)) {
    res.status(400).json({ error: 'matchId is required' });
    return;
  }

  const pool = getPool();
  const result = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
  if (!result.rows.length) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  const match = result.rows[0];
  if (seatFor(match, auth.userId) === null) {
    res.status(403).json({ error: 'Not a participant in this match' });
    return;
  }

  res.status(200).json(toView(match, auth.userId));
}

async function finalizeIfDone(client, match, state) {
  const p1Done = state.standing.p1 || state.busted.p1;
  const p2Done = state.standing.p2 || state.busted.p2;
  if (!p1Done || !p2Done) return { status: 'active', winnerId: null };

  const outcome = compareHands(state.hands.p1, state.hands.p2);
  const winnerId = outcome === 'a' ? match.player1_id : outcome === 'b' ? match.player2_id : null;

  const p1Outcome = outcome === 'a' ? 'win' : outcome === 'b' ? 'loss' : 'push';
  const p2Outcome = outcome === 'b' ? 'win' : outcome === 'a' ? 'loss' : 'push';

  const p1Stats = await recordMatchResult({
    userId: match.player1_id,
    mode: match.mode,
    outcome: p1Outcome,
    isBlackjack: p1Outcome === 'win' && isBlackjack(state.hands.p1),
  });
  const p2Stats = await recordMatchResult({
    userId: match.player2_id,
    mode: match.mode,
    outcome: p2Outcome,
    isBlackjack: p2Outcome === 'win' && isBlackjack(state.hands.p2),
  });

  await checkAchievements({
    userId: match.player1_id,
    mode: match.mode,
    outcome: p1Outcome,
    isBlackjackHand: isBlackjack(state.hands.p1),
    cardCount: state.hands.p1.length,
    statsRow: p1Stats,
  });
  await checkAchievements({
    userId: match.player2_id,
    mode: match.mode,
    outcome: p2Outcome,
    isBlackjackHand: isBlackjack(state.hands.p2),
    cardCount: state.hands.p2.length,
    statsRow: p2Stats,
  });

  if (match.mode === 'random') {
    await applyRankedResult(match.player1_id, p1Outcome);
    await applyRankedResult(match.player2_id, p2Outcome);
  }

  return { status: 'completed', winnerId };
}

async function move(req, res, auth) {
  const { matchId, move: action } = req.body || {};
  if (!matchId || !UUID_RE.test(matchId) || !['hit', 'stand'].includes(action)) {
    res.status(400).json({ error: 'matchId and move (hit|stand) are required' });
    return;
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const match = result.rows[0];
    const seat = seatFor(match, auth.userId);
    if (seat === null) {
      await client.query('ROLLBACK');
      res.status(403).json({ error: 'Not a participant in this match' });
      return;
    }
    if (match.status !== 'active') {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Match is not active' });
      return;
    }

    const gameState = match.state;
    if (gameState.standing[seat] || gameState.busted[seat]) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'You have already finished this hand' });
      return;
    }

    if (action === 'hit') {
      const card = gameState.deck.pop();
      gameState.hands[seat].push(card);
      if (calculateScore(gameState.hands[seat]) > 21) {
        gameState.busted[seat] = true;
      }
    } else {
      gameState.standing[seat] = true;
    }

    const { status: newStatus, winnerId } = await finalizeIfDone(client, match, gameState);

    await client.query(
      `UPDATE matches SET state = $2, status = $3, winner_id = $4, version = version + 1, updated_at = now()
       WHERE id = $1`,
      [matchId, JSON.stringify(gameState), newStatus, winnerId]
    );

    await client.query('COMMIT');

    match.state = gameState;
    match.status = newStatus;
    match.winner_id = winnerId;
    res.status(200).json(toView(match, auth.userId));
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
      if (action === 'invite') return await invite(req, res, auth);
      if (action === 'respondInvite') return await respondInvite(req, res, auth);
      if (action === 'move') return await move(req, res, auth);
      res.status(400).json({ error: 'Unknown action' });
      return;
    }

    if (req.method === 'GET') {
      if (req.query.action === 'state') return await state(req, res, auth);
      if (req.query.action === 'incoming') return await incoming(req, res, auth);
      res.status(400).json({ error: 'Unknown action' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('matches error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message, code: err.code });
  }
}
