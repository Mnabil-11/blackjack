import { useCallback, useEffect, useState } from 'react';
import {
  searchUsers,
  fetchOnlineUsers,
  fetchFriends,
  fetchPendingRequests,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
} from '../api';
import useInterval from '../hooks/useInterval';

const SocialHub = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [online, setOnline] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState({ incoming: [], outgoing: [] });
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadFriendsData = useCallback(() => {
    fetchFriends().then((r) => setFriends(r.friends)).catch(() => {});
    fetchPendingRequests().then(setPending).catch(() => {});
    fetchOnlineUsers().then((r) => setOnline(r.users)).catch(() => {});
  }, []);

  useEffect(() => {
    loadFriendsData();
  }, [loadFriendsData]);

  useInterval(loadFriendsData, 10000);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      searchUsers(trimmed).then((r) => setResults(r.users)).catch((e) => setError(e.message));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const friendIds = new Set(friends.map((f) => f.id));
  const outgoingIds = new Set(pending.outgoing.map((r) => r.user_id));

  const handleAdd = async (username) => {
    setError('');
    setBusyId(username);
    try {
      await sendFriendRequest(username);
      loadFriendsData();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRespond = async (requestId, accept) => {
    setBusyId(requestId);
    try {
      await respondFriendRequest(requestId, accept);
      loadFriendsData();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (friendId) => {
    setBusyId(friendId);
    try {
      await removeFriend(friendId);
      loadFriendsData();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="panel">
        <h3>Find Players</h3>
        <div className="search-row">
          <input
            placeholder="Search by username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
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
            {results.length === 0 && (
              <tr className="empty-row">
                <td colSpan={3}>{query.trim().length < 2 ? 'Type at least 2 characters' : 'No users found'}</td>
              </tr>
            )}
            {results.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>
                  <span className={`status-dot${u.online ? ' online' : ''}`} />
                  {u.online ? 'Online' : 'Offline'}
                </td>
                <td>
                  {friendIds.has(u.id) ? (
                    <span>Friends</span>
                  ) : outgoingIds.has(u.id) ? (
                    <span>Requested</span>
                  ) : (
                    <button
                      className="btn-small btn-add"
                      disabled={busyId === u.username}
                      onClick={() => handleAdd(u.username)}
                    >
                      Add Friend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>Pending Requests</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.incoming.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={2}>No incoming requests</td>
                </tr>
              )}
              {pending.incoming.map((r) => (
                <tr key={r.request_id}>
                  <td>{r.username}</td>
                  <td>
                    <button
                      className="btn-small btn-accept"
                      disabled={busyId === r.request_id}
                      onClick={() => handleRespond(r.request_id, true)}
                      style={{ marginRight: 6 }}
                    >
                      Accept
                    </button>
                    <button
                      className="btn-small btn-decline"
                      disabled={busyId === r.request_id}
                      onClick={() => handleRespond(r.request_id, false)}
                    >
                      Decline
                    </button>
                  </td>
                </tr>
              ))}
              {pending.outgoing.map((r) => (
                <tr key={`out-${r.request_id}`}>
                  <td>{r.username}</td>
                  <td style={{ color: 'rgba(255,255,255,0.6)' }}>Waiting...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h3>Friends</h3>
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
                  <td colSpan={3}>No friends yet</td>
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
                    <button
                      className="btn-small btn-decline"
                      disabled={busyId === f.id}
                      onClick={() => handleRemove(f.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Online Users</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
            </tr>
          </thead>
          <tbody>
            {online.length === 0 && (
              <tr className="empty-row">
                <td>No one else is online right now</td>
              </tr>
            )}
            {online.map((u) => (
              <tr key={u.id}>
                <td>
                  <span className="status-dot online" />
                  {u.username}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SocialHub;
