import React from 'react';
import Card from './Card';
import './Hand.css';

const Hand = ({ title, cards, score, hideFirstCard = false }) => {
  return (
    <div className="hand-container">
      <h2 className="hand-title">{title}</h2>
      <div className="hand">
        {cards.map((card, index) => (
          <Card 
            key={index} 
            card={card} 
            hidden={hideFirstCard && index === 0}
          />
        ))}
      </div>
      {score !== undefined && (
        <div style={{ textAlign: 'center' }}>
          <span className="score-badge">
            Score: {hideFirstCard ? '?' : score}
          </span>
        </div>
      )}
    </div>
  );
};

export default Hand;