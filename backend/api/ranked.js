import { getPool, ensureSchema } from '../lib/db.js';
import { applyCommonChecks } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { getOrCreateActiveSeason, tierForPoints } from '../lib/ranked.js';

async function me(req, res, auth) {
  const season = await getOrCreateActiveSeason();
  const pool = getPool();
  const result = await pool.query(
    'SELECT rank_points, wins, losses FROM user_season_stats WHERE season_id = $1 AND user_id = $2',
    [season.id, auth.userId]
  );
  const row = result.rows[0] || { rank_points: 0, wins: 0, losses: 0 };

  res.status(200).json({
    season: { id: season.id, name: season.name, endsAt: season.ends_at },
    rankPoints: row.rank_points,
    tier: tierForPoints(row.rank_points),
    wins: row.wins,
    losses: row.losses,
  });
}

async function leaderboard(req, res) {
  const season = await getOrCreateActiveSeason();
  const pool = getPool();
  const result = await pool.query(
    `SELECT u.username, u.display_name, uss.rank_points, uss.wins, uss.losses
     FROM user_season_stats uss
     JOIN users u ON u.id = uss.user_id
     WHERE uss.season_id = $1
     ORDER BY uss.rank_points DESC
     LIMIT 50`,
    [season.id]
  );
  const leaderboardRows = result.rows.map((row) => ({ ...row, tier: tierForPoints(row.rank_points) }));
  res.status(200).json({ season: { id: season.id, name: season.name }, leaderboard: leaderboardRows });
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

    res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('ranked error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message, code: err.code });
  }
}
