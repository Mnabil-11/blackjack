import { useNavigate } from 'react-router-dom';
import './Game.css';

const Lobby = () => {
  const navigate = useNavigate();

  return (
    <div className="lobby">
      <div className="message-box">Choose a game mode</div>
      <div className="controls lobby-controls">
        <button className="btn btn-hit" onClick={() => navigate('/play/ai')}>
          vs Computer
        </button>
        <button className="btn btn-stand" onClick={() => navigate('/play/friend')}>
          vs Friend
        </button>
        <button className="btn btn-new" onClick={() => navigate('/play/random')}>
          Play Random
        </button>
      </div>
    </div>
  );
};

export default Lobby;
