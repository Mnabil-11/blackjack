export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Handles CORS preflight and the site-wide kill switch shared by every endpoint.
// Returns true if the caller already sent a response and the handler should stop.
export function applyCommonChecks(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  if (!process.env.PASSWORD) {
    res.status(500).json({ error: 'Server misconfigured: PASSWORD env var not set' });
    return true;
  }

  return false;
}
