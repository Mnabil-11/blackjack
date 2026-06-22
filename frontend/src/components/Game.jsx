import React, { useState, useEffect } from 'react';
import Hand from './Hand';
import Leaderboard from './Leaderboard';
import { fetchScores, submitScore } from '../api';
import './Game.css';

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
  const [username, setUsername] = useState('');
  const [wins, setWins] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState('');

  const loadLeaderboard = () => {
    fetchScores()
      .then(setLeaderboard)
      .catch((err) => setLeaderboardError(err.message));
  };

  useEffect(() => {
    startNewGame();
    loadLeaderboard();
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
      let won = false;
      if (score > 21) {
        setMessage('🎉 Dealer busts! You win!');
        setMessageType('win');
        won = true;
      } else if (score > pScore) {
        setMessage('😔 Dealer wins.');
        setMessageType('lose');
      } else if (score < pScore) {
        setMessage('🏆 You win!');
        setMessageType('win');
        won = true;
      } else {
        setMessage('🤝 Push! It\'s a tie.');
        setMessageType('push');
      }
      setGameOver(true);
      if (won && username) {
        const newWins = wins + 1;
        setWins(newWins);
        submitScore(username, newWins, import.meta.env.VITE_API_PASSWORD)
          .then(setLeaderboard)
          .catch((err) => setLeaderboardError(err.message));
      }
    }, 600);
  };

  const playerStands = () => {
    if (gameOver) return;
    dealerTurn();
  };

  return (
    <div className="game-container">
      <div className="chip-decoration"></div>
      <div className="chip-decoration"></div>
      <div className="chip-decoration"></div>
      <div className="chip-decoration"></div>
      
      <h1 className="game-title">BLACKJACK</h1>

      <div className="username-box">
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <span>Wins: {wins}</span>
      </div>

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

      {leaderboardError && <p className="leaderboard-error">{leaderboardError}</p>}
      <Leaderboard scores={leaderboard} />
    </div>
  );
};

export default Game;