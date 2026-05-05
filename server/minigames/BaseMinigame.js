import { SOCKET_EVENTS } from 'shared';

/**
 * Abstract base class for all minigames
 */
export class BaseMinigame {
  /**
   * @param {Object} io - Socket.IO server instance
   * @param {Object} room - Room object
   * @param {Array} players - Array of PlayerState objects
   */
  constructor(io, room, players) {
    this.io = io;
    this.room = room;
    this.players = players;
    this.type = 'base'; // Override in subclass
    this.duration = 30000; // Default 30 seconds
    this.timer = null;
    this.scores = new Map(); // playerId -> score
    this.isRunning = false;

    // Initialize scores
    players.forEach(player => {
      this.scores.set(player.id, 0);
    });
  }

  /**
   * Start the minigame
   */
  async start() {
    this.isRunning = true;

    // Call subclass initialization
    await this.onStart();

    // Start game timer
    this.timer = setTimeout(() => {
      this.end();
    }, this.duration);

    // Broadcast game start
    this.broadcast(SOCKET_EVENTS.MINIGAME_START, {
      type: this.type,
      duration: this.duration,
      rules: this.getRules(),
      players: this.players.map(p => ({ id: p.id, name: p.name }))
    });
  }

  /**
   * Override in subclass for game-specific initialization
   */
  async onStart() {
    // To be implemented by subclasses
  }

  /**
   * Get game rules description
   */
  getRules() {
    return 'Override getRules() in subclass';
  }

  /**
   * Handle player input
   */
  handleInput(playerId, inputData) {
    if (!this.isRunning) {
      return;
    }

    this.onInput(playerId, inputData);
  }

  /**
   * Override in subclass for input handling
   */
  onInput(playerId, data) {
    // To be implemented by subclasses
  }

  /**
   * Game tick for real-time updates
   */
  tick() {
    if (!this.isRunning) {
      return;
    }

    this.onTick();
  }

  /**
   * Override in subclass for tick updates
   */
  onTick() {
    // To be implemented by subclasses
  }

  /**
   * End the minigame
   */
  end() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.isRunning = false;

    this.onEnd();

    return this.getResults();
  }

  /**
   * Override in subclass for cleanup
   */
  onEnd() {
    // To be implemented by subclasses
  }

  /**
   * Get final results sorted by rank
   */
  getResults() {
    const results = Array.from(this.scores.entries()).map(([playerId, score]) => {
      const player = this.players.find(p => p.id === playerId);
      return {
        playerId,
        playerName: player?.name || 'Unknown',
        score
      };
    });

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Assign ranks
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return results;
  }

  /**
   * Broadcast event to all players in room
   */
  broadcast(event, data) {
    this.io.to(this.room.id).emit(event, data);
  }

  /**
   * Send event to specific player
   */
  sendToPlayer(playerId, event, data) {
    const player = this.players.find(p => p.id === playerId);
    if (player && player.socketId) {
      this.io.to(player.socketId).emit(event, data);
    }
  }
}
