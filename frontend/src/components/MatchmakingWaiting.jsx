import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinMatchmaking, leaveMatchmaking, matchmakingStatus } from '../api';
import useInterval from '../hooks/useInterval';
import './Game.css';

const MatchmakingWaiting = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const matchedRef = useRef(false);

  const checkStatus = () => {
    matchmakingStatus()
      .then((r) => {
        if (r.status === 'matched') {
          matchedRef.current = true;
          navigate(`/play/match/${r.matchId}`, { replace: true });
        }
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    joinMatchmaking()
      .then(checkStatus)
      .catch((e) => setError(e.message));
    return () => {
      if (!matchedRef.current) leaveMatchmaking().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInterval(() => setSeconds((s) => s + 1), 1000);
  useInterval(checkStatus, 1500);

  const cancel = () => {
    leaveMatchmaking().catch(() => {});
    navigate('/');
  };

  return (
    <div className="lobby">
      <div className="message-box">Searching for an opponent... {seconds}s</div>
      {error && <p className="leaderboard-error">{error}</p>}
      <table className="data-table" style={{ maxWidth: 300, margin: '20px 0' }}>
        <tbody>
          <tr>
            <td>Status</td>
            <td>In queue</td>
          </tr>
        </tbody>
      </table>
      <div className="controls">
        <button className="btn btn-stand" onClick={cancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MatchmakingWaiting;
