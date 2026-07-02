import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Hand from './Hand';
import { fetchMatchState, sendMatchMove } from '../api';
import useInterval from '../hooks/useInterval';
import './Game.css';

const LiveMatch = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);

  const poll = () => fetchMatchState(matchId).then(setMatch).catch((e) => setError(e.message));

  useEffect(() => {
    poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useInterval(poll, 1200);

  if (!match) {
    return <div className="message-box">Loading match...</div>;
  }

  const mySeat = match.you;
  const opponentSeat = mySeat === 'p1' ? 'p2' : 'p1';
  const myHand = match.hands[mySeat];
  const opponentHand = match.hands[opponentSeat];
  const myDone = match.standing[mySeat] || match.busted[mySeat];
  const isComplete = match.status === 'completed';

  const myUserId = mySeat === 'p1' ? match.player1Id : match.player2Id;
  let resultMessage = '';
  let resultType = '';
  if (isComplete) {
    if (match.winnerId === null) {
      resultMessage = "🤝 Push! It's a tie.";
      resultType = 'push';
    } else if (match.winnerId === myUserId) {
      resultMessage = '🏆 You win!';
      resultType = 'win';
    } else {
      resultMessage = '😔 Opponent wins.';
      resultType = 'lose';
    }
  }

  const act = async (move) => {
    setActing(true);
    setError('');
    try {
      const updated = await sendMatchMove(matchId, move);
      setMatch(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="game-round">
      <div className={`message-box ${resultType}`}>
        {isComplete ? resultMessage : myDone ? 'Waiting for opponent...' : 'Hit or Stand? 🎲'}
      </div>
      {error && <p className="leaderboard-error">{error}</p>}

      <div className="game-content">
        <div className="dealer-section">
          <Hand title="Opponent" cards={opponentHand} score={match.scores[opponentSeat]} />
        </div>
        <div className="player-section">
          <Hand title="You" cards={myHand} score={match.scores[mySeat]} />
        </div>
      </div>

      <div className="controls">
        <button className="btn btn-hit" onClick={() => act('hit')} disabled={myDone || acting || isComplete}>
          Hit
        </button>
        <button className="btn btn-stand" onClick={() => act('stand')} disabled={myDone || acting || isComplete}>
          Stand
        </button>
        {isComplete && (
          <button className="btn btn-new" onClick={() => navigate('/')}>
            Back to Lobby
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveMatch;
