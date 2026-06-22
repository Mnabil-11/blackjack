import React from 'react';
import './Leaderboard.css';

const Leaderboard = ({ scores }) => {
  if (!scores.length) return null;

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <ol>
        {scores.map((s) => (
          <li key={s.username}>
            <span>{s.username}</span>
            <span>{s.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Leaderboard;
