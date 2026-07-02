import { useEffect, useState } from 'react';
import { fetchLeaderboard, fetchMyStats } from '../api';

const MODES = [
  { value: '', label: 'All Modes' },
  { value: 'ai', label: 'vs Computer' },
  { value: 'friend', label: 'vs Friend' },
  { value: 'random', label: 'Play Random' },
];

const Leaderboard = () => {
  const [sortBy, setSortBy] = useState('wins');
  const [mode, setMode] = useState('');
  const [rows, setRows] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard(sortBy, mode || undefined)
      .then((r) => setRows(r.leaderboard))
      .catch((e) => setError(e.message));
  }, [sortBy, mode]);

  useEffect(() => {
    fetchMyStats().then(setMyStats).catch(() => {});
  }, []);

  return (
    <div>
      {myStats && (
        <div className="panel">
          <h3>Your Record</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mode</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Pushes</th>
                <th>Best Streak</th>
                <th>Hands</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Total</strong></td>
                <td>{myStats.totals.wins}</td>
                <td>{myStats.totals.losses}</td>
                <td>{myStats.totals.pushes}</td>
                <td>-</td>
                <td>{myStats.totals.hands_played}</td>
              </tr>
              {myStats.byMode.map((row) => (
                <tr key={row.mode}>
                  <td>{MODES.find((m) => m.value === row.mode)?.label || row.mode}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.pushes}</td>
                  <td>{row.best_streak}</td>
                  <td>{row.hands_played}</td>
                </tr>
              ))}
              {myStats.byMode.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={6}>Play a game to start your record</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <h3>Global Leaderboard</h3>
        <div className="search-row">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="wins">Sort by Most Wins</option>
            <option value="losses">Sort by Fewest Losses</option>
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {error && <p className="inline-error">{error}</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Hands Played</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={5}>No stats recorded yet</td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.username}>
                <td>{i + 1}</td>
                <td>{row.display_name || row.username}</td>
                <td>{row.wins}</td>
                <td>{row.losses}</td>
                <td>{row.hands_played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
