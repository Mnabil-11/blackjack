import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const TOKEN_TTL = '30d';

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(userId, username) {
  return jwt.sign({ sub: userId, username }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Reads and verifies the Authorization: Bearer <token> header.
// On failure, sends a 401 itself and returns null so callers can `if (!auth) return;`.
export function requireAuth(req, res) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  return { userId: payload.sub, username: payload.username };
}
