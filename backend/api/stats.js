import { getPool, ensureSchema } from '../lib/db.js';
import { applyCommonChecks } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { recordMatchResult } from '../lib/stats.js';
import { checkAchievements } from '../lib/achievements.js';

const MODES = ['ai', 'friend', 'random'];
const OUTCOMES = ['win', 'loss', 'push'];

// friend/random results are server-authoritative and only ever written by matches.js;
// this endpoint is for the client-simulated vs-Computer mode only.
async function record(req, res, auth) {
  const { outcome, isBlackjack, cardCount } = req.body || {};
  if (!OUTCOMES.includes(outcome)) {
    res.status(400).json({ error: 'outcome must be win/loss/push' });
    return;
  }

  const row = await recordMatchResult({
    userId: auth.userId,
    mode: 'ai',
    outcome,
    isBlackjack: Boolean(isBlackjack),
  });

  await checkAchievements({
    userId: auth.userId,
    mode: 'ai',
    outcome,
    isBlackjackHand: Boolean(isBlackjack),
    cardCount: Number(cardCount) || 2,
    statsRow: row,
  });

  res.status(200).json({ stats: row });
}

async function me(req, res, auth) {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM game_stats WHERE user_id = $1', [auth.userId]);
  const byMode = result.rows;
  const totals = byMode.reduce(
    (acc, row) => ({
      wins: acc.wins + row.wins,
      losses: acc.losses + row.losses,
      pushes: acc.pushes + row.pushes,
      hands_played: acc.hands_played + row.hands_played,
    }),
    { wins: 0, losses: 0, pushes: 0, hands_played: 0 }
  );
  res.status(200).json({ byMode, totals });
}

async function leaderboard(req, res) {
  const sortBy = req.query.sortBy === 'losses' ? 'losses' : 'wins';
  const mode = MODES.includes(req.query.mode) ? req.query.mode : null;

  const pool = getPool();
  const params = [];
  let modeFilter = '';
  if (mode) {
    params.push(mode);
    modeFilter = `WHERE gs.mode = $${params.length}`;
  }

  const orderDirection = sortBy === 'losses' ? 'ASC' : 'DESC';
  const result = await pool.query(
    `SELECT u.username, u.display_name,
            SUM(gs.wins) AS wins, SUM(gs.losses) AS losses,
            SUM(gs.pushes) AS pushes, SUM(gs.hands_played) AS hands_played
     FROM game_stats gs
     JOIN users u ON u.id = gs.user_id
     ${modeFilter}
     GROUP BY u.id, u.username, u.display_name
     HAVING SUM(gs.hands_played) > 0
     ORDER BY ${sortBy} ${orderDirection}, hands_played DESC
     LIMIT 50`,
    params
  );
  res.status(200).json({ leaderboard: result.rows, sortBy, mode });
}

export default async function handler(req, res) {
  if (applyCommonChecks(req, res)) return;

  try {
    await ensureSchema();

    if (req.method === 'GET' && req.query.action === 'leaderboard') {
      return await leaderboard(req, res);
    }

    const auth = requireAuth(req, res);
    if (!auth) return;

    if (req.method === 'GET' && req.query.action === 'me') return await me(req, res, auth);
    if (req.method === 'POST' && req.body?.action === 'record') return await record(req, res, auth);

    res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('stats error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message, code: err.code });
  }
}
