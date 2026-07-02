import { getPool } from './db.js';

async function unlock(pool, userId, code) {
  await pool.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     SELECT $1, id FROM achievements WHERE code = $2
     ON CONFLICT (user_id, achievement_id) DO NOTHING`,
    [userId, code]
  );
}

// Called right after a match result has been written to game_stats.
// isBlackjackHand/cardCount describe the player's final hand for this round.
export async function checkAchievements({ userId, mode, outcome, isBlackjackHand, cardCount, statsRow }) {
  const pool = getPool();

  if (outcome === 'win') {
    await unlock(pool, userId, 'first_win');
    if (statsRow.current_streak >= 3) await unlock(pool, userId, 'win_streak_3');
    if (statsRow.current_streak >= 5) await unlock(pool, userId, 'win_streak_5');
    if (statsRow.current_streak >= 10) await unlock(pool, userId, 'win_streak_10');
    if (isBlackjackHand) await unlock(pool, userId, 'natural_blackjack');
    if (cardCount >= 5) await unlock(pool, userId, 'five_card_charlie');

    if (mode === 'friend' && statsRow.wins >= 5) await unlock(pool, userId, 'friend_rival');

    const totalWins = await pool.query(
      'SELECT COALESCE(SUM(wins), 0) AS total FROM game_stats WHERE user_id = $1',
      [userId]
    );
    if (Number(totalWins.rows[0].total) >= 100) await unlock(pool, userId, 'century_club');
  }

  if (mode === 'random' && statsRow.hands_played === 1) {
    await unlock(pool, userId, 'ranked_debut');
  }
}
