import { TILE_TYPES, TILE_EFFECTS, GAME, EVENTS, ITEMS, SOCKET_EVENTS } from 'shared';

export default class BoardGame {
  constructor(board, players) {
    // Convert board array to Map for fast lookup
    this.board = new Map();
    board.forEach(tile => {
      this.board.set(tile.id, tile);
    });

    this.players = players;
    this.starTileId = this.findInitialStarTile();
    this.eventTiles = board.filter(t => t.type === TILE_TYPES.EVENT).map(t => t.id);
  }

  /**
   * Find the initial star tile on the board
   */
  findInitialStarTile() {
    for (const [id, tile] of this.board) {
      if (tile.type === TILE_TYPES.STAR) {
        return id;
      }
    }
    return null;
  }

  /**
   * Move a player a certain number of steps
   * Returns a promise that resolves when movement is complete
   */
  async movePlayer(player, steps, io, roomId) {
    let currentTileId = player.tileId;
    let stepsRemaining = steps;
    let path = [currentTileId];

    while (stepsRemaining > 0) {
      const currentTile = this.board.get(currentTileId);

      if (!currentTile) {
        console.error('Invalid tile:', currentTileId);
        break;
      }

      // Check for junction
      if (currentTile.next.length > 1) {
        // Emit junction prompt and wait for choice
        return {
          type: 'junction',
          currentTileId,
          options: currentTile.next,
          stepsRemaining,
          path,
        };
      }

      // Move to next tile
      const nextTileId = currentTile.next[0];
      currentTileId = nextTileId;
      stepsRemaining--;
      path.push(nextTileId);

      // Check if passing star tile (not landing on it yet)
      if (stepsRemaining > 0 && nextTileId === this.starTileId) {
        // Emit star passing event
        io.to(roomId).emit(SOCKET_EVENTS.STAR_MOVED, {
          playerId: player.id,
          passing: true,
        });
      }
    }

    // Update player position
    player.tileId = currentTileId;

    // Check if landed on star tile
    if (currentTileId === this.starTileId && player.coins >= GAME.STAR_COST) {
      // Prompt for star purchase
      return {
        type: 'star',
        tileId: currentTileId,
        path,
      };
    }

    return {
      type: 'complete',
      tileId: currentTileId,
      path,
    };
  }

  /**
   * Continue movement from a junction with chosen path
   */
  async continueMovementFromJunction(player, chosenTileId, stepsRemaining, io, roomId) {
    let currentTileId = chosenTileId;
    let path = [currentTileId];
    let steps = stepsRemaining;

    while (steps > 0) {
      const currentTile = this.board.get(currentTileId);

      if (!currentTile) break;

      if (currentTile.next.length > 1) {
        // Another junction
        return {
          type: 'junction',
          currentTileId,
          options: currentTile.next,
          stepsRemaining: steps,
          path,
        };
      }

      const nextTileId = currentTile.next[0];
      currentTileId = nextTileId;
      steps--;
      path.push(nextTileId);

      if (steps > 0 && nextTileId === this.starTileId) {
        io.to(roomId).emit(SOCKET_EVENTS.STAR_MOVED, {
          playerId: player.id,
          passing: true,
        });
      }
    }

    player.tileId = currentTileId;

    if (currentTileId === this.starTileId && player.coins >= GAME.STAR_COST) {
      return {
        type: 'star',
        tileId: currentTileId,
        path,
      };
    }

    return {
      type: 'complete',
      tileId: currentTileId,
      path,
    };
  }

  /**
   * Apply the effect of a tile
   */
  applyTileEffect(player, tileId, io, roomId) {
    const tile = this.board.get(tileId);
    if (!tile) return null;

    const effect = {
      type: tile.type,
      tileId,
      playerId: player.id,
    };

    switch (tile.type) {
      case TILE_TYPES.BLUE:
        player.coins += TILE_EFFECTS[TILE_TYPES.BLUE];
        effect.coins = TILE_EFFECTS[TILE_TYPES.BLUE];
        effect.message = `+${TILE_EFFECTS[TILE_TYPES.BLUE]} 코인`;
        break;

      case TILE_TYPES.RED:
        player.coins += TILE_EFFECTS[TILE_TYPES.RED]; // negative value
        if (player.coins < 0) player.coins = 0;
        effect.coins = TILE_EFFECTS[TILE_TYPES.RED];
        effect.message = `${TILE_EFFECTS[TILE_TYPES.RED]} 코인`;
        break;

      case TILE_TYPES.BOWSER:
        player.coins += TILE_EFFECTS[TILE_TYPES.BOWSER]; // negative value
        if (player.coins < 0) player.coins = 0;
        effect.coins = TILE_EFFECTS[TILE_TYPES.BOWSER];
        effect.message = '쿠파가 코인을 훔쳤다!';
        break;

      case TILE_TYPES.EVENT:
        const eventResult = this.triggerRandomEvent(player, io, roomId);
        effect.event = eventResult;
        effect.message = eventResult.message;
        break;

      case TILE_TYPES.ITEM:
        const item = this.giveRandomItem(player);
        effect.item = item;
        effect.message = `${item.name} 획득!`;
        break;

      case TILE_TYPES.SHOP:
        effect.message = '상점에 오신 것을 환영합니다!';
        effect.shopItems = this.getShopItems();
        break;

      case TILE_TYPES.STAR:
        // Already handled in movement
        effect.message = '스타 칸!';
        break;

      default:
        effect.message = '';
    }

    return effect;
  }

  /**
   * Trigger a random event
   */
  triggerRandomEvent(player, io, roomId) {
    const eventTypes = Object.values(EVENTS);
    const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const result = {
      type: randomEvent,
      playerId: player.id,
    };

    switch (randomEvent) {
      case EVENTS.COIN_GIFT:
        const gift = Math.floor(Math.random() * 10) + 5; // 5-14 coins
        player.coins += gift;
        result.coins = gift;
        result.message = `${gift} 코인 획득!`;
        break;

      case EVENTS.COIN_PLUNDER:
        const loss = Math.floor(Math.random() * 10) + 5;
        player.coins = Math.max(0, player.coins - loss);
        result.coins = -loss;
        result.message = `${loss} 코인 잃음!`;
        break;

      case EVENTS.STAR_SHUFFLE:
        this.moveStarToNewLocation();
        result.message = '스타가 이동했습니다!';
        result.newStarTile = this.starTileId;
        break;

      case EVENTS.POSITION_SWAP:
        // Requires target selection - handled by GameManager
        result.message = '위치를 교환할 플레이어를 선택하세요!';
        result.requiresTarget = true;
        break;

      case EVENTS.ROCKET_RAID:
        // Team Rocket steals random item if player has any
        if (player.items && player.items.length > 0) {
          const randomIndex = Math.floor(Math.random() * player.items.length);
          const stolenItem = player.items.splice(randomIndex, 1)[0];
          result.item = stolenItem;
          result.message = `로켓단이 ${stolenItem.name}을(를) 훔쳐갔다!`;
        } else {
          result.message = '로켓단이 훔칠 것이 없었다!';
        }
        break;

      case EVENTS.LUCKY_ROULETTE:
        // 50/50 chance to gain or lose coins
        const amount = Math.floor(Math.random() * 15) + 5;
        const isWin = Math.random() > 0.5;
        if (isWin) {
          player.coins += amount;
          result.coins = amount;
          result.message = `행운! ${amount} 코인 획득!`;
        } else {
          player.coins = Math.max(0, player.coins - amount);
          result.coins = -amount;
          result.message = `불운! ${amount} 코인 잃음!`;
        }
        break;
    }

    return result;
  }

  /**
   * Give a random item to the player
   */
  giveRandomItem(player) {
    const itemList = Object.values(ITEMS);
    const randomItem = itemList[Math.floor(Math.random() * itemList.length)];

    if (!player.items) {
      player.items = [];
    }

    player.items.push(randomItem);
    return randomItem;
  }

  /**
   * Get available shop items
   */
  getShopItems() {
    return Object.values(ITEMS).slice(0, 3); // Return first 3 items
  }

  /**
   * Move star to a new random location
   */
  moveStarToNewLocation() {
    const validTiles = [];

    for (const [id, tile] of this.board) {
      // Exclude current star, special tiles, and junctions
      if (
        id !== this.starTileId &&
        tile.type !== TILE_TYPES.BOWSER &&
        tile.type !== TILE_TYPES.STAR &&
        tile.type !== TILE_TYPES.START &&
        tile.type !== TILE_TYPES.JUNCTION
      ) {
        validTiles.push(id);
      }
    }

    if (validTiles.length > 0) {
      const newStarTileId = validTiles[Math.floor(Math.random() * validTiles.length)];
      this.starTileId = newStarTileId;
      return newStarTileId;
    }

    return this.starTileId;
  }

  /**
   * Purchase a star
   */
  buyStar(player) {
    if (player.coins >= GAME.STAR_COST && player.tileId === this.starTileId) {
      player.coins -= GAME.STAR_COST;
      player.stars++;

      // Move star to new location
      this.moveStarToNewLocation();

      return true;
    }

    return false;
  }

  /**
   * Get all players on a specific tile
   */
  getPlayersAtTile(tileId) {
    return this.players.filter(player => player.tileId === tileId);
  }

  /**
   * Get tile by ID
   */
  getTile(tileId) {
    return this.board.get(tileId);
  }

  /**
   * Get board state for serialization
   */
  getBoardState() {
    return {
      tiles: Array.from(this.board.values()),
      starTileId: this.starTileId,
    };
  }
}
