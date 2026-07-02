import { Pool } from 'pg';

let pool;
let schemaReady;

export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

// Runs once per cold start; CREATE TABLE IF NOT EXISTS is idempotent so repeat calls are cheap no-ops.
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        last_score INTEGER NOT NULL DEFAULT 0,
        last_seen_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS friend_requests (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        responded_at TIMESTAMPTZ,
        CHECK (requester_id <> addressee_id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS one_pending_request_per_pair
        ON friend_requests (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
        WHERE status = 'pending';

      CREATE INDEX IF NOT EXISTS friend_requests_addressee_idx ON friend_requests (addressee_id, status);
      CREATE INDEX IF NOT EXISTS friend_requests_requester_idx ON friend_requests (requester_id, status);

      CREATE TABLE IF NOT EXISTS game_stats (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mode TEXT NOT NULL CHECK (mode IN ('ai', 'friend', 'random')),
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        pushes INTEGER NOT NULL DEFAULT 0,
        blackjacks INTEGER NOT NULL DEFAULT 0,
        current_streak INTEGER NOT NULL DEFAULT 0,
        best_streak INTEGER NOT NULL DEFAULT 0,
        hands_played INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, mode)
      );

      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mode TEXT NOT NULL CHECK (mode IN ('friend', 'random')),
        status TEXT NOT NULL DEFAULT 'pending_invite'
          CHECK (status IN ('pending_invite', 'active', 'completed', 'declined', 'abandoned')),
        player1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        player2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        state JSONB NOT NULL DEFAULT '{}'::jsonb,
        winner_id INTEGER REFERENCES users(id),
        version INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS matches_player1_idx ON matches (player1_id, status);
      CREATE INDEX IF NOT EXISTS matches_player2_idx ON matches (player2_id, status);

      CREATE TABLE IF NOT EXISTS matchmaking_queue (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        matched_id UUID REFERENCES matches(id)
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL
      );

      INSERT INTO achievements (code, name, description, icon) VALUES
        ('first_win', 'First Win', 'Win your first hand', '🎉'),
        ('win_streak_3', 'On a Roll', 'Win 3 hands in a row', '🔥'),
        ('win_streak_5', 'Hot Streak', 'Win 5 hands in a row', '🔥🔥'),
        ('win_streak_10', 'Unstoppable', 'Win 10 hands in a row', '🚀'),
        ('natural_blackjack', 'Natural 21', 'Get a natural blackjack dealt on the first two cards', '♠️'),
        ('five_card_charlie', 'Five Card Charlie', 'Win a hand with 5 or more cards without busting', '🃏'),
        ('century_club', 'Century Club', 'Win 100 hands total', '💯'),
        ('ranked_debut', 'Ranked Debut', 'Play your first Play Random match', '🏅'),
        ('friend_rival', 'Friendly Rivalry', 'Win 5 matches against friends', '🤝')
      ON CONFLICT (code) DO NOTHING;

      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, achievement_id)
      );

      CREATE TABLE IF NOT EXISTS seasons (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true
      );

      CREATE UNIQUE INDEX IF NOT EXISTS one_active_season ON seasons (is_active) WHERE is_active;

      CREATE TABLE IF NOT EXISTS user_season_stats (
        season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rank_points INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (season_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS season_rewards (
        id SERIAL PRIMARY KEY,
        season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
        tier TEXT NOT NULL CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Diamond')),
        name TEXT NOT NULL,
        UNIQUE (season_id, tier)
      );

      CREATE TABLE IF NOT EXISTS user_rewards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        season_reward_id INTEGER NOT NULL REFERENCES season_rewards(id) ON DELETE CASCADE,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, season_reward_id)
      );
    `);
  }
  return schemaReady;
}
