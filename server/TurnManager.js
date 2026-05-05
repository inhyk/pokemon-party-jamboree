import { GAME, TURN_PHASES, SOCKET_EVENTS } from 'shared';

export default class TurnManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.currentPlayerIndex = 0;
    this.currentTurn = 1;
    this.maxTurns = GAME.DEFAULT_TURNS;
    this.phase = TURN_PHASES.TURN_START;
    this.playersCompletedThisRound = new Set();
    this.waitingForJunctionChoice = false;
    this.waitingForStarPurchase = false;
  }

  /**
   * Start a new turn for the current player
   */
  startTurn() {
    const player = this.getCurrentPlayer();
    if (!player) {
      console.error('No current player found');
      return;
    }

    this.phase = TURN_PHASES.TURN_START;
    this.waitingForJunctionChoice = false;
    this.waitingForStarPurchase = false;

    this.gameManager.io.to(this.gameManager.room.id).emit(SOCKET_EVENTS.TURN_START, {
      playerId: player.id,
      playerName: player.name,
      turn: this.currentTurn,
      maxTurns: this.maxTurns,
      coins: player.coins,
      stars: player.stars,
    });

    this.phase = TURN_PHASES.DICE_ROLL;
  }

  /**
   * Roll a single dice for the current player
   */
  rollDice(playerId) {
    const player = this.getCurrentPlayer();

    if (!player || player.id !== playerId) {
      console.error('Not this player\'s turn');
      return;
    }

    if (this.phase !== TURN_PHASES.DICE_ROLL) {
      console.error('Cannot roll dice in current phase:', this.phase);
      return;
    }

    const diceResult = Math.floor(Math.random() * GAME.DICE_MAX) + GAME.DICE_MIN;

    this.gameManager.io.to(this.gameManager.room.id).emit(SOCKET_EVENTS.DICE_RESULT, {
      playerId: player.id,
      result: diceResult,
      total: diceResult,
    });

    this.phase = TURN_PHASES.PLAYER_MOVE;

    // Start movement after dice animation
    setTimeout(() => {
      this.gameManager.movePlayer(player, diceResult);
    }, 2000);
  }

  /**
   * Roll two dice (for mushroom/double_dice items)
   */
  rollTwoDice(playerId) {
    const player = this.getCurrentPlayer();

    if (!player || player.id !== playerId) {
      console.error('Not this player\'s turn');
      return;
    }

    if (this.phase !== TURN_PHASES.DICE_ROLL) {
      console.error('Cannot roll dice in current phase:', this.phase);
      return;
    }

    const dice1 = Math.floor(Math.random() * GAME.DICE_MAX) + GAME.DICE_MIN;
    const dice2 = Math.floor(Math.random() * GAME.DICE_MAX) + GAME.DICE_MIN;
    const total = dice1 + dice2;

    this.gameManager.io.to(this.gameManager.room.id).emit(SOCKET_EVENTS.DICE_RESULT, {
      playerId: player.id,
      result: [dice1, dice2],
      total: total,
      doubleDice: true,
    });

    this.phase = TURN_PHASES.PLAYER_MOVE;

    // Start movement after dice animation
    setTimeout(() => {
      this.gameManager.movePlayer(player, total);
    }, 2000);
  }

  /**
   * Handle player's choice at a junction
   */
  handleJunctionChoice(playerId, nextTileId) {
    const player = this.getCurrentPlayer();

    if (!player || player.id !== playerId) {
      console.error('Not this player\'s turn');
      return;
    }

    if (!this.waitingForJunctionChoice) {
      console.error('Not waiting for junction choice');
      return;
    }

    this.waitingForJunctionChoice = false;

    // Continue movement through GameManager
    this.gameManager.continueMovement(player, nextTileId);
  }

  /**
   * Handle star purchase response
   */
  handleStarResponse(playerId, purchase) {
    const player = this.getCurrentPlayer();

    if (!player || player.id !== playerId) {
      console.error('Not this player\'s turn');
      return;
    }

    if (!this.waitingForStarPurchase) {
      console.error('Not waiting for star purchase');
      return;
    }

    this.waitingForStarPurchase = false;

    if (purchase) {
      this.gameManager.boardGame.buyStar(player);
    }

    // Continue to tile effect after star decision
    this.applyCurrentTileEffect();
  }

  /**
   * Apply the effect of the tile the player landed on
   */
  applyCurrentTileEffect() {
    const player = this.getCurrentPlayer();
    if (!player) return;

    this.phase = TURN_PHASES.TILE_EFFECT;
    this.gameManager.handleTileEffect(player, player.tileId);

    // End turn after tile effect
    setTimeout(() => {
      this.endTurn();
    }, 1500);
  }

  /**
   * End the current player's turn
   */
  endTurn() {
    const player = this.getCurrentPlayer();
    if (!player) return;

    this.phase = TURN_PHASES.TURN_END;

    this.gameManager.io.to(this.gameManager.room.id).emit(SOCKET_EVENTS.TURN_END, {
      playerId: player.id,
    });

    // Mark this player as completed
    this.playersCompletedThisRound.add(player.id);

    // Check if all players have completed this round
    const allPlayers = Array.from(this.gameManager.players.values());
    const allCompleted = allPlayers.every(p => this.playersCompletedThisRound.has(p.id));

    if (allCompleted) {
      // All players done - trigger minigame
      this.playersCompletedThisRound.clear();

      setTimeout(() => {
        this.phase = TURN_PHASES.MINIGAME_SELECT;
        this.gameManager.startMinigame();
      }, 2000);
    } else {
      // Move to next player
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % allPlayers.length;

      setTimeout(() => {
        this.startTurn();
      }, 1500);
    }
  }

  /**
   * Move to the next round after minigame
   */
  nextRound() {
    this.currentTurn++;

    if (this.currentTurn > this.maxTurns) {
      // Game over
      this.gameManager.endGame();
      return;
    }

    // Reset to first player
    this.currentPlayerIndex = 0;
    this.playersCompletedThisRound.clear();

    // Start next round
    setTimeout(() => {
      this.startTurn();
    }, 1000);
  }

  /**
   * Get the current player
   */
  getCurrentPlayer() {
    const players = Array.from(this.gameManager.players.values());
    return players[this.currentPlayerIndex] || null;
  }

  /**
   * Set junction waiting state
   */
  setWaitingForJunction(waiting) {
    this.waitingForJunctionChoice = waiting;
  }

  /**
   * Set star purchase waiting state
   */
  setWaitingForStar(waiting) {
    this.waitingForStarPurchase = waiting;
  }
}
