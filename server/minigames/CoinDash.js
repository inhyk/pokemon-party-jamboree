import { BaseMinigame } from './BaseMinigame.js';
import { SOCKET_EVENTS } from 'shared';

/**
 * CoinDash - FFA coin collection minigame
 */
export class CoinDash extends BaseMinigame {
  constructor(io, room, players) {
    super(io, room, players);
    this.type = 'coin-dash';
    this.duration = 30000;

    this.playerPositions = new Map();
    this.coins = [];
    this.coinIdCounter = 0;
    this.playerSpeed = 5;
    this.coinCollectionRadius = 30;
    this.maxCoins = 10;
    this.bounds = { width: 800, height: 600 };
  }

  getRules() {
    return 'Collect as many coins as possible! Move around to grab coins before your opponents do!';
  }

  async onStart() {
    // Initialize player positions at random starting points
    this.players.forEach(player => {
      this.playerPositions.set(player.id, {
        x: Math.random() * this.bounds.width,
        y: Math.random() * this.bounds.height
      });
    });

    // Spawn initial coins
    for (let i = 0; i < 20; i++) {
      this.spawnCoin();
    }

    // Start tick interval for real-time updates
    this.tickInterval = setInterval(() => this.tick(), 50);

    // Broadcast initial state
    this.broadcastState();
  }

  spawnCoin() {
    this.coins.push({
      id: this.coinIdCounter++,
      x: Math.random() * this.bounds.width,
      y: Math.random() * this.bounds.height
    });
  }

  onInput(playerId, data) {
    const position = this.playerPositions.get(playerId);
    if (!position) return;

    const { direction } = data;

    // Update position based on direction
    switch (direction) {
      case 'up':
        position.y = Math.max(0, position.y - this.playerSpeed);
        break;
      case 'down':
        position.y = Math.min(this.bounds.height, position.y + this.playerSpeed);
        break;
      case 'left':
        position.x = Math.max(0, position.x - this.playerSpeed);
        break;
      case 'right':
        position.x = Math.min(this.bounds.width, position.x + this.playerSpeed);
        break;
    }
  }

  onTick() {
    // Check coin collection for all players
    this.players.forEach(player => {
      const position = this.playerPositions.get(player.id);
      if (!position) return;

      // Check collision with coins
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        const distance = Math.sqrt(
          Math.pow(position.x - coin.x, 2) +
          Math.pow(position.y - coin.y, 2)
        );

        if (distance < this.coinCollectionRadius) {
          // Collect coin
          this.coins.splice(i, 1);
          const currentScore = this.scores.get(player.id) || 0;
          this.scores.set(player.id, currentScore + 1);

          // Notify player
          this.sendToPlayer(player.id, SOCKET_EVENTS.MINIGAME_UPDATE, {
            event: 'coin-collected',
            coinId: coin.id,
            score: this.scores.get(player.id)
          });
        }
      }
    });

    // Spawn new coins if below max
    while (this.coins.length < this.maxCoins) {
      this.spawnCoin();
    }

    // Broadcast updated state
    this.broadcastState();
  }

  broadcastState() {
    const positions = {};
    this.playerPositions.forEach((pos, playerId) => {
      positions[playerId] = pos;
    });

    const scores = {};
    this.scores.forEach((score, playerId) => {
      scores[playerId] = score;
    });

    this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
      type: 'state',
      positions,
      coins: this.coins,
      scores
    });
  }

  onEnd() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // Broadcast final results
    this.broadcast(SOCKET_EVENTS.MINIGAME_END, {
      type: this.type,
      results: this.getResults()
    });
  }
}
