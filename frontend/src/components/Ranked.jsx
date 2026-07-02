import { useEffect, useState } from 'react';
import { fetchRankedMe, fetchRankedLeaderboard } from '../api';
import './Ranked.css';

const TIER_THRESHOLDS = { Bronze: 0, Silver: 1000, Gold: 2000, Diamond: 3000 };
const NEXT_TIER = { Bronze: 'Silver', Silver: 'Gold', Gold: 'Diamond', Diamond: null };

const Ranked = () => {
  const [me, setMe] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRankedMe().then(setMe).catch((e) => setError(e.message));
    fetchRankedLeaderboard().then((r) => setLeaderboard(r.leaderboard)).catch((e) => setError(e.message));
  }, []);

  const nextTier = me ? NEXT_TIER[me.tier] : null;
  const progress = me && nextTier
    ? Math.min(100, ((me.rankPoints - TIER_THRESHOLDS[me.tier]) / (TIER_THRESHOLDS[nextTier] - TIER_THRESHOLDS[me.tier])) * 100)
    : 100;

  return (
    <div>
      {error && <p className="inline-error">{error}</p>}
      {me && (
        <div className="panel">
          <h3>{me.season.name}</h3>
          <div className={`tier-badge tier-${me.tier.toLowerCase()}`}>{me.tier}</div>
          <p>{me.rankPoints} ranked points &middot; {me.wins}W / {me.losses}L (Play Random only)</p>
          {nextTier && (
            <div className="tier-progress-track">
              <div className="tier-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
          <p className="tier-progress-label">
            {nextTier ? `${TIER_THRESHOLDS[nextTier] - me.rankPoints} points to ${nextTier}` : 'Top tier reached!'}
          </p>
        </div>
      )}

      <div className="panel">
        <h3>Season Leaderboard</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Tier</th>
              <th>Points</th>
              <th>W</th>
              <th>L</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 && (
              <tr className="empty-row">
                <td colSpan={6}>No ranked matches played yet this season</td>
              </tr>
            )}
            {leaderboard.map((row, i) => (
              <tr key={row.username}>
                <td>{i + 1}</td>
                <td>{row.display_name || row.username}</td>
                <td>
                  <span className={`tier-badge tier-${row.tier.toLowerCase()}`}>{row.tier}</span>
                </td>
                <td>{row.rank_points}</td>
                <td>{row.wins}</td>
                <td>{row.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Ranked;
