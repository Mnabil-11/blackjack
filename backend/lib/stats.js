import { getPool } from './db.js';

// outcome: 'win' | 'loss' | 'push'. A loss resets the win streak; a push leaves it unchanged.
export async function recordMatchResult({ userId, mode, outcome, isBlackjack = false }) {
  const pool = getPool();

  await pool.query(
    `INSERT INTO game_stats (user_id, mode, wins, losses, pushes, blackjacks, current_streak, best_streak, hands_played)
     VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0)
     ON CONFLICT (user_id, mode) DO NOTHING`,
    [userId, mode]
  );

  const winInc = outcome === 'win' ? 1 : 0;
  const lossInc = outcome === 'loss' ? 1 : 0;
  const pushInc = outcome === 'push' ? 1 : 0;
  const blackjackInc = isBlackjack && outcome === 'win' ? 1 : 0;

  const result = await pool.query(
    `UPDATE game_stats SET
       wins = wins + $3,
       losses = losses + $4,
       pushes = pushes + $5,
       blackjacks = blackjacks + $6,
       hands_played = hands_played + 1,
       current_streak = CASE WHEN $3 = 1 THEN current_streak + 1 WHEN $4 = 1 THEN 0 ELSE current_streak END,
       best_streak = GREATEST(best_streak, CASE WHEN $3 = 1 THEN current_streak + 1 ELSE best_streak END),
       updated_at = now()
     WHERE user_id = $1 AND mode = $2
     RETURNING *`,
    [userId, mode, winInc, lossInc, pushInc, blackjackInc]
  );

  return result.rows[0];
}
