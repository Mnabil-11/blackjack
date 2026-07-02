import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchIncomingInvites, respondToInvite } from '../api';
import useInterval from '../hooks/useInterval';
import './Shell.css';

const Shell = ({ children }) => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);

  const checkInvites = () => {
    fetchIncomingInvites().then((r) => setInvites(r.invites)).catch(() => {});
  };

  useEffect(checkInvites, []);
  useInterval(checkInvites, 4000);

  const respond = async (matchId, accept) => {
    try {
      await respondToInvite(matchId, accept);
      setInvites((prev) => prev.filter((i) => i.match_id !== matchId));
      if (accept) navigate(`/play/match/${matchId}`);
    } catch {
      // invite may have expired/been withdrawn; just refresh silently
      setInvites((prev) => prev.filter((i) => i.match_id !== matchId));
    }
  };

  return (
    <div className="game-container">
      <div className="chip-decoration"></div>
      <div className="chip-decoration"></div>
      <div className="chip-decoration"></div>
      <div className="chip-decoration"></div>

      <h1 className="game-title">BLACKJACK</h1>

      <nav className="app-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Play
        </NavLink>
        <NavLink to="/social" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Social
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Leaderboard
        </NavLink>
        <NavLink to="/achievements" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Achievements
        </NavLink>
        <NavLink to="/ranked" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Ranked
        </NavLink>
        <div className="nav-spacer" />
        <span className="nav-username">{auth?.username}</span>
        <button className="nav-logout" onClick={logout}>Log out</button>
      </nav>

      {invites.map((invite) => (
        <div className="invite-banner" key={invite.match_id}>
          <span><strong>{invite.from_username}</strong> invited you to play Blackjack!</span>
          <button className="btn-small btn-accept" onClick={() => respond(invite.match_id, true)}>
            Accept
          </button>
          <button className="btn-small btn-decline" onClick={() => respond(invite.match_id, false)}>
            Decline
          </button>
        </div>
      ))}

      <div className="app-content">{children}</div>
    </div>
  );
};

export default Shell;
