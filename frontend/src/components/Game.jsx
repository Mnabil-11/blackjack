import React, { useState, useEffect } from 'react';
import Hand from './Hand';
import Login from './Login';
import { updateScore } from '../api';
import './Game.css';

const winConfettiPieces = Array.from({ length: 28 }, (_, index) => index);

const Game = () => {
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [message, setMessage] = useState('Place your bets! 🎰');
  const [gameOver, setGameOver] = useState(false);
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [messageType, setMessageType] = useState('');
  const [auth, setAuth] = useState(null);
  const [lastScore, setLastScore] = useState(0);
  const [scoreError, setScoreError] = useState('');

  const handleLogin = (username, password, initialLastScore) => {
    setAuth({ username, password });
    setLastScore(initialLastScore);
  };

  const recordRoundResult = (finalPlayerScore) => {
    if (!auth) return;
    updateScore(auth.username, auth.password, finalPlayerScore)
      .then((result) => setLastScore(result.lastScore))
      .catch((err) => setScoreError(err.message));
  };

  useEffect(() => {
    startNewGame();
  }, []);

  useEffect(() => {
    setPlayerScore(calculateScore(playerHand));
    if (dealerRevealed) {
      setDealerScore(calculateScore(dealerHand));
    }
  }, [playerHand, dealerHand, dealerRevealed]);

  const createDeck = () => {
    const suits = ['H', 'D', 'C', 'S'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let newDeck = [];
    for (let suit of suits) {
      for (let rank of ranks) {
        newDeck.push({ suit, rank });
      }
    }
    return newDeck;
  };

  const shuffleDeck = (deck) => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  };

  const startNewGame = () => {
    const newDeck = shuffleDeck(createDeck());
    const newPlayerHand = [newDeck.pop(), newDeck.pop()];
    const newDealerHand = [newDeck.pop(), newDeck.pop()];

    setDeck(newDeck);
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setMessage('Hit or Stand? 🎲');
    setGameOver(false);
    setDealerRevealed(false);
    setMessageType('');
  };

  const getCardValue = (card) => {
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    if (card.rank === 'A') return 11;
    return parseInt(card.rank);
  };

  const calculateScore = (hand) => {
    let score = 0;
    let aceCount = 0;
    for (let card of hand) {
      score += getCardValue(card);
      if (card.rank === 'A') aceCount++;
    }
    while (score > 21 && aceCount > 0) {
      score -= 10;
      aceCount--;
    }
    return score;
  };

  const playerHits = () => {
    if (gameOver) return;
    const newDeck = [...deck];
    const newPlayerHand = [...playerHand, newDeck.pop()];
    setDeck(newDeck);
    setPlayerHand(newPlayerHand);
    
    if (calculateScore(newPlayerHand) > 21) {
      setMessage('💥 Bust! Dealer wins.');
      setGameOver(true);
      setDealerRevealed(true);
      setMessageType('lose');
      recordRoundResult(calculateScore(newPlayerHand));
    } else if (calculateScore(newPlayerHand) === 21) {
      playerStands();
    }
  };

  const dealerTurn = () => {
    setDealerRevealed(true);
    let newDeck = [...deck];
    let newDealerHand = [...dealerHand];
    let score = calculateScore(newDealerHand);
    
    while (score < 17) {
      const newCard = newDeck.pop();
      newDealerHand.push(newCard);
      score = calculateScore(newDealerHand);
    }
    
    setDeck(newDeck);
    setDealerHand(newDealerHand);

    const pScore = calculateScore(playerHand);
    setTimeout(() => {
      if (score > 21) {
        setMessage('🎉 Dealer busts! You win!');
        setMessageType('win');
      } else if (score > pScore) {
        setMessage('😔 Dealer wins.');
        setMessageType('lose');
      } else if (score < pScore) {
        setMessage('🏆 You win!');
        setMessageType('win');
      } else {
        setMessage('🤝 Push! It\'s a tie.');
        setMessageType('push');
      }
      setGameOver(true);
      recordRoundResult(pScore);
    }, 600);
  };

  const playerStands = () => {
    if (gameOver) return;
    dealerTurn();
  };

  if (!auth) {
    return (
      <div className="game-container">
        <h1 className="game-title">BLACKJACK</h1>
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className={`game-container ${messageType === 'win' ? 'win-active' : ''}`}>
      {messageType === 'win' && (
        <div className="win-celebration" aria-hidden="true">
          <div className="win-burst"></div>
          {winConfettiPieces.map((piece) => (
            <span
              key={piece}
              className="confetti-piece"
              style={{
                '--x': `${(piece * 37) % 100}%`,
                '--delay': `${(piece % 9) * 0.08}s`,
                '--spin': `${(piece % 2 === 0 ? 1 : -1) * (180 + piece * 19)}deg`,
                '--fall': `${74 + (piece % 7) * 8}vh`
              }}
            />
          ))}
        </div>
      )}
      <div className="chip-decoration"></div>
      <div className="chip-decoration"></div>
      <div className="chip-decoration"></div>
      <div className="chip-decoration"></div>

      <h1 className="game-title">BLACKJACK</h1>

      <div className="username-box">
        <span>Welcome, {auth.username}</span>
        <span>Last score: {lastScore}</span>
      </div>
      {scoreError && <p className="leaderboard-error">{scoreError}</p>}

      <div className={`message-box ${messageType}`}>
        {message}
      </div>
      
      <div className="game-content">
        <div className="dealer-section">
          <Hand 
            title="Dealer's Hand" 
            cards={dealerHand} 
            score={dealerScore}
            hideFirstCard={!dealerRevealed && !gameOver}
          />
        </div>
        
        <div className="player-section">
          <Hand 
            title="Player's Hand" 
            cards={playerHand} 
            score={playerScore}
          />
        </div>
      </div>
      
      <div className="controls">
        <button 
          className="btn btn-hit" 
          onClick={playerHits} 
          disabled={gameOver}
        >
          Hit
        </button>
        <button 
          className="btn btn-stand" 
          onClick={playerStands} 
          disabled={gameOver}
        >
          Stand
        </button>
        <button
          className="btn btn-new"
          onClick={startNewGame}
        >
          New Game
        </button>
      </div>
    </div>
  );
};

export default Game;
