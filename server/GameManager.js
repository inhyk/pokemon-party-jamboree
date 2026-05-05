import {
  GAME_PHASES,
  SOCKET_EVENTS,
  MINIGAME_TYPES,
  CONFIG,
  GAME
} from 'shared';
import BoardGame from './BoardGame.js';
import TurnManager from './TurnManager.js';
import defaultBoard from './boards/defaultBoard.js';
import { ItemSystem } from './ItemSystem.js';
import { EventSystem } from './EventSystem.js';
import MiniGameManager from './MiniGameManager.js';

export default class GameManager {
  constructor(io, room) {
    this.io = io;
    this.room = room;
    this.players = new Map(); // socketId -> PlayerState
    this.boardGame = null;
    this.turnManager = null;
    this.itemSystem = null;
    this.eventSystem = null;
    this.miniGameManager = null;
    this.currentMinigame = null;
    this.movementState = null; // Track ongoing movement
  }

  /**
   * Initialize the game with all players
   */
  initGame() {
    console.log(`Initializing game for room ${this.room.id}`);

    // Create player states from room players
    this.room.players.forEach(player => {
      const playerState = {
        id: player.id,
        socketId: player.id,
        name: player.name,
        character: player.characterId,
        coins: GAME.STARTING_COINS,
        stars: 0,
        tileId: 0, // Start at tile 0
        items: [],
        doubleDiceNextRoll: false,
        combinedDiceNextRoll: false,
        stats: {
          minigameWins: 0,
          coinsEarned: 0,
          eventTilesLanded: 0,
        },
        connected: true,
      };

      this.players.set(player.socketId, playerState);
    });

    // Initialize board game
    const playerArray = Array.from(this.players.values());
    this.boardGame = new BoardGame(defaultBoard, playerArray);

    // Initialize turn manager
    this.turnManager = new TurnManager(this);

    // Initialize subsystems
    this.itemSystem = new ItemSystem(this);
    this.eventSystem = new EventSystem(this);
    this.miniGameManager = new MiniGameManager(this.io, this.room);

    // Update room phase
    this.room.phase = GAME_PHASES.BOARD_GAME;

    // Emit game start
    this.io.to(this.room.id).emit(SOCKET_EVENTS.GAME_START, {
      players: playerArray,
      board: this.boardGame.getBoardState(),
      maxTurns: this.turnManager.maxTurns,
    });

    // Broadcast initial state
    this.broadcastState();

    // Start first turn after a delay
    setTimeout(() => {
      this.turnManager.startTurn();
    }, 2000);
  }

  /**
   * Get current game state
   */
  getGameState() {
    return {
      phase: this.room.phase,
      players: Array.from(this.players.values()),
      currentTurn: this.turnManager.currentTurn,
      maxTurns: this.turnManager.maxTurns,
      turnPhase: this.turnManager.phase,
      currentPlayerId: this.turnManager.getCurrentPlayer()?.id,
      board: this.boardGame.getBoardState(),
    };
  }

  /**
   * Move a player a certain number of steps
   */
  async movePlayer(player, steps) {
    const result = await this.boardGame.movePlayer(
      player,
      steps,
      this.io,
      this.room.id
    );

    if (result.type === 'junction') {
      // Player reached a junction - prompt for choice
      this.movementState = result;
      this.turnManager.setWaitingForJunction(true);

      const tile = this.boardGame.getTile(result.currentTileId);

      this.io.to(this.room.id).emit(SOCKET_EVENTS.JUNCTION_PROMPT, {
        playerId: player.id,
        tileId: result.currentTileId,
        options: result.options.map(optId => ({
          tileId: optId,
          tile: this.boardGame.getTile(optId),
        })),
        stepsRemaining: result.stepsRemaining,
      });

      // Emit movement path so far
      this.emitMovementPath(player, result.path);

    } else if (result.type === 'star') {
      // Player landed on star - prompt for purchase
      this.turnManager.setWaitingForStar(true);

      this.io.to(this.room.id).emit(SOCKET_EVENTS.STAR_PROMPT, {
        playerId: player.id,
        coins: player.coins,
        cost: GAME.STAR_COST,
      });

      // Emit movement path
      this.emitMovementPath(player, result.path);

    } else {
      // Movement complete
      this.emitMovementPath(player, result.path);

      this.io.to(this.room.id).emit(SOCKET_EVENTS.MOVE_COMPLETE, {
        playerId: player.id,
        tileId: result.tileId,
      });

      // Apply tile effect after movement animation
      setTimeout(() => {
        this.turnManager.applyCurrentTileEffect();
      }, 500);
    }

    this.broadcastState();
  }

  /**
   * Continue movement after junction choice
   */
  async continueMovement(player, chosenTileId) {
    if (!this.movementState) {
      console.error('No movement state found');
      return;
    }

    const result = await this.boardGame.continueMovementFromJunction(
      player,
      chosenTileId,
      this.movementState.stepsRemaining - 1, // -1 because we're stepping onto the chosen tile
      this.io,
      this.room.id
    );

    if (result.type === 'junction') {
      // Another junction
      this.movementState = result;
      this.turnManager.setWaitingForJunction(true);

      const tile = this.boardGame.getTile(result.currentTileId);

      this.io.to(this.room.id).emit(SOCKET_EVENTS.JUNCTION_PROMPT, {
        playerId: player.id,
        tileId: result.currentTileId,
        options: result.options.map(optId => ({
          tileId: optId,
          tile: this.boardGame.getTile(optId),
        })),
        stepsRemaining: result.stepsRemaining,
      });

      this.emitMovementPath(player, result.path);

    } else if (result.type === 'star') {
      this.movementState = null;
      this.turnManager.setWaitingForStar(true);

      this.io.to(this.room.id).emit(SOCKET_EVENTS.STAR_PROMPT, {
        playerId: player.id,
        coins: player.coins,
        cost: GAME.STAR_COST,
      });

      this.emitMovementPath(player, result.path);

    } else {
      this.movementState = null;

      this.emitMovementPath(player, result.path);

      this.io.to(this.room.id).emit(SOCKET_EVENTS.MOVE_COMPLETE, {
        playerId: player.id,
        tileId: result.tileId,
      });

      setTimeout(() => {
        this.turnManager.applyCurrentTileEffect();
      }, 500);
    }

    this.broadcastState();
  }

  /**
   * Emit movement path with animation
   */
  emitMovementPath(player, path) {
    this.io.to(this.room.id).emit(SOCKET_EVENTS.PLAYER_MOVE, {
      playerId: player.id,
      path: path,
    });
  }

  /**
   * Handle tile effect application
   */
  handleTileEffect(player, tileId) {
    const effect = this.boardGame.applyTileEffect(player, tileId, this.io, this.room.id);

    if (effect) {
      // Track stats
      if (effect.type === 'event') {
        player.stats.eventTilesLanded++;
      }

      if (effect.coins && effect.coins > 0) {
        player.stats.coinsEarned += effect.coins;
      }

      this.io.to(this.room.id).emit(SOCKET_EVENTS.TILE_EFFECT, effect);
    }

    this.broadcastState();
  }

  /**
   * Start a minigame
   */
  startMinigame() {
    const minigameTypes = Object.values(MINIGAME_TYPES);
    const randomType = minigameTypes[Math.floor(Math.random() * minigameTypes.length)];

    this.currentMinigame = {
      type: randomType,
      players: Array.from(this.players.values()).map(p => p.id),
      results: {},
    };

    // Announce minigame
    this.io.to(this.room.id).emit(SOCKET_EVENTS.MINIGAME_ANNOUNCE, {
      type: randomType,
      name: this.getMinigameName(randomType),
      transitionTime: CONFIG.minigame.transitionTime,
    });

    // Start minigame after transition
    setTimeout(() => {
      const playerArray = Array.from(this.players.values());
      this.miniGameManager.startSpecificGame(randomType, playerArray);
    }, CONFIG.minigame.transitionTime);
  }

  /**
   * Get minigame display name
   */
  getMinigameName(type) {
    const names = {
      [MINIGAME_TYPES.COIN_DASH]: '코인 대시',
      [MINIGAME_TYPES.BUMPER_BATTLE]: '범퍼 배틀',
      [MINIGAME_TYPES.MEMORY_MATCH]: '메모리 매치',
      [MINIGAME_TYPES.PLATFORM_RACE]: '플랫폼 레이스',
      [MINIGAME_TYPES.VOLLEY_BOUNCE]: '발리 바운스',
    };

    return names[type] || type;
  }

  /**
   * End the current minigame with results
   */
  endMinigame(results) {
    // results = { playerId: score, ... }
    const sortedPlayers = Object.entries(results)
      .sort((a, b) => b[1] - a[1])
      .map(([playerId, score]) => ({ playerId, score }));

    // Award coins based on placement
    const rewards = [
      CONFIG.minigame.coinReward.first,
      CONFIG.minigame.coinReward.second,
      CONFIG.minigame.coinReward.third,
      CONFIG.minigame.coinReward.fourth,
    ];

    sortedPlayers.forEach((playerResult, index) => {
      const player = Array.from(this.players.values()).find(p => p.id === playerResult.playerId);
      if (player) {
        const coinsAwarded = rewards[index] || 0;
        player.coins += coinsAwarded;
        player.stats.coinsEarned += coinsAwarded;

        if (index === 0) {
          player.stats.minigameWins++;
        }

        playerResult.coinsAwarded = coinsAwarded;
      }
    });

    // Emit results
    this.io.to(this.room.id).emit(SOCKET_EVENTS.MINIGAME_RESULT, {
      results: sortedPlayers,
    });

    this.currentMinigame = null;
    this.broadcastState();

    // Continue to next round
    setTimeout(() => {
      this.turnManager.nextRound();
    }, 5000);
  }

  /**
   * End the game and calculate final results
   */
  endGame() {
    this.room.phase = GAME_PHASES.GAME_END;

    // Calculate bonus stars
    const bonusStars = this.calculateBonusStars();

    this.io.to(this.room.id).emit(SOCKET_EVENTS.BONUS_STARS, bonusStars);

    // Determine winner
    setTimeout(() => {
      const winner = this.determineWinner();
      const finalResults = {
        winner: winner,
        players: Array.from(this.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          character: p.character,
          stars: p.stars,
          coins: p.coins,
          stats: p.stats,
        })),
      };

      this.io.to(this.room.id).emit(SOCKET_EVENTS.GAME_END, finalResults);
      this.io.to(this.room.id).emit(SOCKET_EVENTS.FINAL_RESULTS, finalResults);
    }, 5000);
  }

  /**
   * Calculate and award bonus stars
   */
  calculateBonusStars() {
    const players = Array.from(this.players.values());
    const bonusStars = [];

    // Minigame Star - most minigame wins
    const minigameWinner = players.reduce((max, p) =>
      p.stats.minigameWins > max.stats.minigameWins ? p : max
    );
    if (minigameWinner.stats.minigameWins > 0) {
      minigameWinner.stars++;
      bonusStars.push({
        type: 'minigame_star',
        playerId: minigameWinner.id,
        playerName: minigameWinner.name,
      });
    }

    // Coin Star - most coins earned
    const coinWinner = players.reduce((max, p) =>
      p.stats.coinsEarned > max.stats.coinsEarned ? p : max
    );
    if (coinWinner.stats.coinsEarned > 0) {
      coinWinner.stars++;
      bonusStars.push({
        type: 'coin_star',
        playerId: coinWinner.id,
        playerName: coinWinner.name,
      });
    }

    // Event Star - most event tiles landed
    const eventWinner = players.reduce((max, p) =>
      p.stats.eventTilesLanded > max.stats.eventTilesLanded ? p : max
    );
    if (eventWinner.stats.eventTilesLanded > 0) {
      eventWinner.stars++;
      bonusStars.push({
        type: 'event_star',
        playerId: eventWinner.id,
        playerName: eventWinner.name,
      });
    }

    return bonusStars;
  }

  /**
   * Determine the game winner
   */
  determineWinner() {
    const players = Array.from(this.players.values());

    // Sort by stars first, then coins
    const sorted = players.sort((a, b) => {
      if (a.stars !== b.stars) {
        return b.stars - a.stars;
      }
      return b.coins - a.coins;
    });

    return sorted[0];
  }

  /**
   * Handle player disconnect
   */
  handleDisconnect(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      player.connected = false;
      console.log(`Player ${player.name} disconnected`);

      // TODO: Implement AI turns for disconnected players
      // For now, just mark as disconnected

      this.broadcastState();
    }
  }

  /**
   * Handle player reconnect
   */
  handleReconnect(socketId, newSocketId) {
    const player = this.players.get(socketId);
    if (player) {
      player.connected = true;
      player.socketId = newSocketId;

      // Update players map
      this.players.delete(socketId);
      this.players.set(newSocketId, player);

      console.log(`Player ${player.name} reconnected`);

      // Send current state to reconnected player
      this.io.to(newSocketId).emit(SOCKET_EVENTS.RECONNECT_STATE, this.getGameState());

      this.broadcastState();
    }
  }

  /**
   * Broadcast current game state to all players
   */
  broadcastState() {
    this.io.to(this.room.id).emit(SOCKET_EVENTS.GAME_STATE, this.getGameState());
  }

  /**
   * Get players as array (helper method)
   */
  getPlayersArray() {
    return Array.from(this.players.values());
  }
}
