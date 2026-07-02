import { getPool } from './db.js';

export const WIN_POINTS = 20;
export const LOSS_POINTS = -15;

export const TIERS = [
  { name: 'Diamond', min: 3000 },
  { name: 'Gold', min: 2000 },
  { name: 'Silver', min: 1000 },
  { name: 'Bronze', min: 0 },
];

export function tierForPoints(points) {
  return TIERS.find((t) => points >= t.min).name;
}

// Only Play Random matches are ranked; friend/AI games don't move the ladder.
export async function applyRankedResult(userId, outcome) {
  if (outcome === 'push') return;

  const pool = getPool();
  const season = await getOrCreateActiveSeason();
  const delta = outcome === 'win' ? WIN_POINTS : LOSS_POINTS;
  const winInc = outcome === 'win' ? 1 : 0;
  const lossInc = outcome === 'loss' ? 1 : 0;

  await pool.query(
    `INSERT INTO user_season_stats (season_id, user_id, rank_points, wins, losses)
     VALUES ($1, $2, GREATEST($3, 0), $4, $5)
     ON CONFLICT (season_id, user_id) DO UPDATE SET
       rank_points = GREATEST(user_season_stats.rank_points + $3, 0),
       wins = user_season_stats.wins + $4,
       losses = user_season_stats.losses + $5`,
    [season.id, userId, delta, winInc, lossInc]
  );
}

function monthBounds(date) {
  const starts_at = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const ends_at = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { starts_at, ends_at };
}

export async function getOrCreateActiveSeason() {
  const pool = getPool();
  const existing = await pool.query('SELECT * FROM seasons WHERE is_active LIMIT 1');
  if (existing.rows.length) return existing.rows[0];

  const now = new Date();
  const { starts_at, ends_at } = monthBounds(now);
  const name = now.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const inserted = await pool.query(
    `INSERT INTO seasons (name, starts_at, ends_at, is_active) VALUES ($1, $2, $3, true)
     ON CONFLICT (is_active) WHERE is_active DO NOTHING
     RETURNING *`,
    [name, starts_at, ends_at]
  );
  if (inserted.rows.length) return inserted.rows[0];

  const retry = await pool.query('SELECT * FROM seasons WHERE is_active LIMIT 1');
  return retry.rows[0];
}

// Closes any active season whose end date has passed: snapshots final-tier rewards, then opens the next month's season.
export async function rolloverSeasonsIfDue() {
  const pool = getPool();
  const due = await pool.query('SELECT * FROM seasons WHERE is_active AND ends_at <= now()');

  for (const season of due.rows) {
    const standings = await pool.query(
      'SELECT user_id, rank_points FROM user_season_stats WHERE season_id = $1',
      [season.id]
    );

    for (const row of standings.rows) {
      const tier = tierForPoints(row.rank_points);
      const reward = await pool.query(
        `INSERT INTO season_rewards (season_id, tier, name) VALUES ($1, $2, $3)
         ON CONFLICT (season_id, tier) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [season.id, tier, `${season.name} ${tier} Badge`]
      );
      await pool.query(
        `INSERT INTO user_rewards (user_id, season_reward_id) VALUES ($1, $2)
         ON CONFLICT (user_id, season_reward_id) DO NOTHING`,
        [row.user_id, reward.rows[0].id]
      );
    }

    await pool.query('UPDATE seasons SET is_active = false WHERE id = $1', [season.id]);
  }

  if (due.rows.length) await getOrCreateActiveSeason();
  return due.rows.length;
}
