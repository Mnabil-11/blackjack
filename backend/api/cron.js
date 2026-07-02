import { ensureSchema } from '../lib/db.js';
import { rolloverSeasonsIfDue } from '../lib/ranked.js';

// Triggered daily by Vercel Cron (see vercel.json). Vercel automatically sends
// `Authorization: Bearer <CRON_SECRET>` on cron-triggered requests when CRON_SECRET is set.
export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const header = req.headers.authorization || '';
    if (header !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  try {
    await ensureSchema();
    const rolledOver = await rolloverSeasonsIfDue();
    res.status(200).json({ ok: true, seasonsRolledOver: rolledOver });
  } catch (err) {
    console.error('cron error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message, code: err.code });
  }
}
