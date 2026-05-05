import { MINIGAME_TYPES } from 'shared';
import { CoinDash } from './minigames/CoinDash.js';
import { BumperBattle } from './minigames/BumperBattle.js';
import { MemoryMatch } from './minigames/MemoryMatch.js';
import { PlatformRace } from './minigames/PlatformRace.js';
import { VolleyBounce } from './minigames/VolleyBounce.js';

/**
 * MiniGameManager - Manages minigame lifecycle
 */
export default class MiniGameManager {
  /**
   * @param {Object} io - Socket.IO server instance
   * @param {Object} room - Room object
   */
  constructor(io, room) {
    this.io = io;
    this.room = room;
    this.currentGame = null;

    // Map of minigame types to their classes
    this.minigameClasses = {
      [MINIGAME_TYPES.COIN_DASH]: CoinDash,
      [MINIGAME_TYPES.BUMPER_BATTLE]: BumperBattle,
      [MINIGAME_TYPES.MEMORY_MATCH]: MemoryMatch,
      [MINIGAME_TYPES.PLATFORM_RACE]: PlatformRace,
      [MINIGAME_TYPES.VOLLEY_BOUNCE]: VolleyBounce
    };
  }

  /**
   * Start a random minigame
   * @param {Array} players - Array of PlayerState objects
   * @returns {Promise<BaseMinigame>} The started minigame instance
   */
  async startRandomGame(players) {
    const availableGames = this.getAvailableGames();
    const randomType = availableGames[Math.floor(Math.random() * availableGames.length)];
    return this.startSpecificGame(randomType, players);
  }

  /**
   * Start a specific minigame
   * @param {string} type - Minigame type from MINIGAME_TYPES
   * @param {Array} players - Array of PlayerState objects
   * @returns {Promise<BaseMinigame>} The started minigame instance
   */
  async startSpecificGame(type, players) {
    // Validate minigame type
    const GameClass = this.minigameClasses[type];
    if (!GameClass) {
      throw new Error(`Unknown minigame type: ${type}`);
    }

    // Validate player count
    if (!players || players.length === 0) {
      throw new Error('No players available for minigame');
    }

    // End current game if running
    if (this.currentGame && this.currentGame.isRunning) {
      await this.endCurrentGame();
    }

    // Create and start new game
    this.currentGame = new GameClass(this.io, this.room, players);
    await this.currentGame.start();

    console.log(`Started minigame: ${type} in room ${this.room.id} with ${players.length} players`);

    return this.currentGame;
  }

  /**
   * Handle player input for current minigame
   * @param {string} playerId - Player ID
   * @param {Object} data - Input data
   */
  handleInput(playerId, data) {
    if (!this.currentGame) {
      console.warn(`No active minigame to handle input for player ${playerId}`);
      return;
    }

    this.currentGame.handleInput(playerId, data);
  }

  /**
   * End the current minigame
   * @returns {Promise<Array>} Game results
   */
  async endCurrentGame() {
    if (!this.currentGame) {
      return null;
    }

    const results = this.currentGame.end();
    console.log(`Ended minigame: ${this.currentGame.type} in room ${this.room.id}`);

    // Keep reference for a moment to allow cleanup
    const game = this.currentGame;
    this.currentGame = null;

    return results;
  }

  /**
   * Get list of available minigame types
   * @returns {Array<string>} Array of minigame type strings
   */
  getAvailableGames() {
    return Object.keys(this.minigameClasses);
  }

  /**
   * Get current minigame info
   * @returns {Object|null} Current minigame info or null
   */
  getCurrentGameInfo() {
    if (!this.currentGame) {
      return null;
    }

    return {
      type: this.currentGame.type,
      isRunning: this.currentGame.isRunning,
      duration: this.currentGame.duration,
      players: this.currentGame.players.map(p => ({
        id: p.id,
        name: p.name
      }))
    };
  }

  /**
   * Check if a minigame is currently running
   * @returns {boolean}
   */
  isGameRunning() {
    return this.currentGame && this.currentGame.isRunning;
  }
}
