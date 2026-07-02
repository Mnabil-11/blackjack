import { useEffect, useState } from 'react';
import { fetchAchievements } from '../api';
import './Achievements.css';

const Achievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAchievements()
      .then((r) => setAchievements(r.achievements))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="panel">
      <h3>Achievements</h3>
      {error && <p className="inline-error">{error}</p>}
      <div className="achievement-grid">
        {achievements.map((a) => (
          <div key={a.code} className={`achievement-badge${a.unlocked_at ? ' unlocked' : ''}`}>
            <div className="achievement-icon">{a.icon}</div>
            <div className="achievement-name">{a.name}</div>
            <div className="achievement-desc">{a.description}</div>
            {a.unlocked_at && (
              <div className="achievement-date">
                Unlocked {new Date(a.unlocked_at).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Achievements;
