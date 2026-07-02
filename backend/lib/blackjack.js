const SUITS = ['H', 'D', 'C', 'S'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

function getCardValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank, 10);
}

export function calculateScore(hand) {
  let score = 0;
  let aceCount = 0;
  for (const card of hand) {
    score += getCardValue(card);
    if (card.rank === 'A') aceCount++;
  }
  while (score > 21 && aceCount > 0) {
    score -= 10;
    aceCount--;
  }
  return score;
}

export function isBlackjack(hand) {
  return hand.length === 2 && calculateScore(hand) === 21;
}

// Compares two finished hands (both stood or busted) for the PvP duel format:
// closer to 21 without busting wins; natural blackjack beats a non-blackjack 21; equal totals push.
export function compareHands(handA, handB) {
  const scoreA = calculateScore(handA);
  const scoreB = calculateScore(handB);
  const bustA = scoreA > 21;
  const bustB = scoreB > 21;

  if (bustA && bustB) return 'push';
  if (bustA) return 'b';
  if (bustB) return 'a';

  const blackjackA = isBlackjack(handA);
  const blackjackB = isBlackjack(handB);
  if (blackjackA && !blackjackB) return 'a';
  if (blackjackB && !blackjackA) return 'b';

  if (scoreA > scoreB) return 'a';
  if (scoreB > scoreA) return 'b';
  return 'push';
}
