import { getPool, ensureSchema } from '../lib/db.js';
import { applyCommonChecks } from '../lib/http.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from '../lib/auth.js';

async function register(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }
  if (username.length < 3 || username.length > 24 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    res.status(400).json({ error: 'username must be 3-24 characters, letters/numbers/underscore only' });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: 'password must be at least 4 characters' });
    return;
  }

  const pool = getPool();
  const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const inserted = await pool.query(
    `INSERT INTO users (username, password_hash, display_name, last_seen_at)
     VALUES ($1, $2, $1, now()) RETURNING id, username`,
    [username, passwordHash]
  );
  const user = inserted.rows[0];

  res.status(201).json({ token: signToken(user.id, user.username), username: user.username });
}

async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const pool = getPool();
  const result = await pool.query(
    'SELECT id, username, password_hash FROM users WHERE username = $1',
    [username]
  );
  if (!result.rows.length) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const user = result.rows[0];
  const isBcryptHash = user.password_hash.startsWith('$2');
  let valid;

  if (isBcryptHash) {
    valid = await verifyPassword(password, user.password_hash);
  } else {
    // Lazy-migrate legacy plaintext rows created before password hashing was added.
    valid = password === user.password_hash;
    if (valid) {
      const newHash = await hashPassword(password);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
    }
  }

  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  await pool.query('UPDATE users SET last_seen_at = now() WHERE id = $1', [user.id]);
  res.status(200).json({ token: signToken(user.id, user.username), username: user.username });
}

async function heartbeat(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  await getPool().query('UPDATE users SET last_seen_at = now() WHERE id = $1', [auth.userId]);
  res.status(200).json({ ok: true });
}

async function me(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const pool = getPool();
  const userResult = await pool.query(
    'SELECT id, username, display_name, created_at FROM users WHERE id = $1',
    [auth.userId]
  );
  if (!userResult.rows.length) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const statsResult = await pool.query('SELECT * FROM game_stats WHERE user_id = $1', [auth.userId]);
  res.status(200).json({ user: userResult.rows[0], stats: statsResult.rows });
}

export default async function handler(req, res) {
  if (applyCommonChecks(req, res)) return;

  try {
    await ensureSchema();

    if (req.method === 'POST') {
      const action = req.body?.action;
      if (action === 'register') return await register(req, res);
      if (action === 'login') return await login(req, res);
      if (action === 'heartbeat') return await heartbeat(req, res);
      res.status(400).json({ error: 'Unknown action' });
      return;
    }

    if (req.method === 'GET' && req.query.action === 'me') {
      return await me(req, res);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('auth error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message, code: err.code });
  }
}
