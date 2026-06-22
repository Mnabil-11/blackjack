import React from 'react';
import './Card.css';

const Card = ({ card, hidden = false }) => {
  if (!card || hidden) {
    return <div className="card flipped"></div>;
  }

  const suitSymbols = {
    'H': '♥',
    'D': '♦',
    'C': '♣',
    'S': '♠'
  };

  const isRed = card.suit === 'H' || card.suit === 'D';
  const suitSymbol = suitSymbols[card.suit];

  return (
    <div className={`card ${isRed ? 'red' : 'black'}`}>
      <div className="card-corner top">
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit-small">{suitSymbol}</div>
      </div>
      <div className="card-center">{suitSymbol}</div>
      <div className="card-corner bottom">
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit-small">{suitSymbol}</div>
      </div>
    </div>
  );
};

export default Card;