import { BaseMinigame } from './BaseMinigame.js';
import { SOCKET_EVENTS } from 'shared';

/**
 * MemoryMatch - FFA card matching minigame
 */
export class MemoryMatch extends BaseMinigame {
  constructor(io, room, players) {
    super(io, room, players);
    this.type = 'memory-match';
    this.duration = 45000;

    this.cards = [];
    this.currentPlayerIndex = 0;
    this.flippedCards = [];
    this.isProcessing = false;
    this.cardValues = [
      'Pikachu', 'Charizard', 'Bulbasaur', 'Squirtle',
      'Meowth', 'Jigglypuff', 'Snorlax', 'Eevee'
    ];
  }

  getRules() {
    return 'Take turns flipping cards to find matching pairs! Match the most pairs to win!';
  }

  async onStart() {
    // Create 16 cards (8 pairs)
    const cardDeck = [];
    this.cardValues.forEach(value => {
      cardDeck.push({ value, matched: false, revealed: false });
      cardDeck.push({ value, matched: false, revealed: false });
    });

    // Shuffle cards
    for (let i = cardDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardDeck[i], cardDeck[j]] = [cardDeck[j], cardDeck[i]];
    }

    // Assign IDs
    this.cards = cardDeck.map((card, index) => ({
      ...card,
      id: index
    }));

    // Initialize scores
    this.players.forEach(player => {
      this.scores.set(player.id, 0);
    });

    // Broadcast initial state
    this.broadcastState();
    this.announceCurrentPlayer();
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  announceCurrentPlayer() {
    const currentPlayer = this.getCurrentPlayer();
    this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
      event: 'turn-change',
      currentPlayerId: currentPlayer.id,
      currentPlayerName: currentPlayer.name
    });
  }

  onInput(playerId, data) {
    const currentPlayer = this.getCurrentPlayer();

    // Validate it's this player's turn
    if (playerId !== currentPlayer.id) {
      this.sendToPlayer(playerId, SOCKET_EVENTS.MINIGAME_UPDATE, {
        event: 'error',
        message: 'Not your turn!'
      });
      return;
    }

    // Validate not processing
    if (this.isProcessing) {
      return;
    }

    // Validate card selection
    const { cardIndex } = data;
    if (cardIndex < 0 || cardIndex >= this.cards.length) {
      return;
    }

    const card = this.cards[cardIndex];

    // Can't flip already matched or revealed cards
    if (card.matched || card.revealed) {
      return;
    }

    // Flip the card
    card.revealed = true;
    this.flippedCards.push(cardIndex);

    // Broadcast card flip
    this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
      event: 'card-flipped',
      cardIndex,
      cardValue: card.value
    });

    // Check if 2 cards are flipped
    if (this.flippedCards.length === 2) {
      this.isProcessing = true;
      this.checkMatch();
    }
  }

  checkMatch() {
    const [index1, index2] = this.flippedCards;
    const card1 = this.cards[index1];
    const card2 = this.cards[index2];

    const isMatch = card1.value === card2.value;

    setTimeout(() => {
      if (isMatch) {
        // Mark as matched
        card1.matched = true;
        card2.matched = true;

        const currentPlayer = this.getCurrentPlayer();
        const currentScore = this.scores.get(currentPlayer.id);
        this.scores.set(currentPlayer.id, currentScore + 1);

        this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
          event: 'match-found',
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          score: this.scores.get(currentPlayer.id),
          cardIndexes: [index1, index2]
        });

        // Same player continues
      } else {
        // Flip cards back
        card1.revealed = false;
        card2.revealed = false;

        this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
          event: 'no-match',
          cardIndexes: [index1, index2]
        });

        // Next player's turn
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.announceCurrentPlayer();
      }

      // Clear flipped cards
      this.flippedCards = [];
      this.isProcessing = false;

      // Broadcast updated state
      this.broadcastState();

      // Check if all matched
      const allMatched = this.cards.every(card => card.matched);
      if (allMatched) {
        this.end();
      }
    }, 1000);
  }

  broadcastState() {
    const cardStates = this.cards.map(card => ({
      id: card.id,
      value: card.matched || card.revealed ? card.value : null,
      matched: card.matched,
      revealed: card.revealed
    }));

    const scores = {};
    this.scores.forEach((score, playerId) => {
      scores[playerId] = score;
    });

    this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
      type: 'state',
      cards: cardStates,
      scores,
      currentPlayerId: this.getCurrentPlayer().id
    });
  }

  onEnd() {
    this.broadcast(SOCKET_EVENTS.MINIGAME_END, {
      type: this.type,
      results: this.getResults()
    });
  }
}
