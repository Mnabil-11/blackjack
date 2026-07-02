import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFriends, inviteFriend, fetchMatchState } from '../api';
import useInterval from '../hooks/useInterval';

const FriendPicker = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState('');
  const [waitingMatchId, setWaitingMatchId] = useState(null);
  const [waitingFor, setWaitingFor] = useState('');

  useEffect(() => {
    fetchFriends().then((r) => setFriends(r.friends)).catch((e) => setError(e.message));
  }, []);

  useInterval(() => {
    if (!waitingMatchId) return;
    fetchMatchState(waitingMatchId)
      .then((match) => {
        if (match.status === 'active') navigate(`/play/match/${waitingMatchId}`, { replace: true });
        if (match.status === 'declined') {
          setError(`${waitingFor} declined your invite`);
          setWaitingMatchId(null);
        }
      })
      .catch((e) => setError(e.message));
  }, waitingMatchId ? 1500 : null);

  const invite = async (username) => {
    setError('');
    try {
      const { matchId } = await inviteFriend(username);
      setWaitingMatchId(matchId);
      setWaitingFor(username);
    } catch (e) {
      setError(e.message);
    }
  };

  if (waitingMatchId) {
    return (
      <div className="lobby">
        <div className="message-box">Waiting for {waitingFor} to accept...</div>
        {error && <p className="leaderboard-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Invite a Friend</h3>
      {error && <p className="inline-error">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {friends.length === 0 && (
            <tr className="empty-row">
              <td colSpan={3}>Add a friend first from the Social page</td>
            </tr>
          )}
          {friends.map((f) => (
            <tr key={f.id}>
              <td>{f.username}</td>
              <td>
                <span className={`status-dot${f.online ? ' online' : ''}`} />
                {f.online ? 'Online' : 'Offline'}
              </td>
              <td>
                <button className="btn-small btn-add" onClick={() => invite(f.username)}>
                  Invite
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FriendPicker;
