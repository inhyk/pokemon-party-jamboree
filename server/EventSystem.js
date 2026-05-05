import { EVENTS, SOCKET_EVENTS } from 'shared';

export class EventSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  /**
   * Trigger a random event when landing on an event tile
   * @param {Object} player - The player triggering the event
   * @returns {Object} Result of the event
   */
  triggerRandomEvent(player) {
    const eventTypes = Object.keys(EVENTS);
    const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    return this.triggerEvent(randomEventType, player);
  }

  /**
   * Trigger a specific event
   * @param {string} eventType - The type of event to trigger
   * @param {Object} player - The player triggering the event
   * @returns {Object} Result of the event
   */
  triggerEvent(eventType, player) {
    let result;

    // Emit event trigger notification
    this.gameManager.io.to(this.gameManager.room.id).emit(SOCKET_EVENTS.EVENT_TRIGGER, {
      eventType,
      player: player.name
    });

    switch (eventType) {
      case 'coin_gift':
        result = this.coinGift(player);
        break;
      case 'coin_plunder':
        result = this.coinPlunder(player);
        break;
      case 'star_shuffle':
        result = this.starShuffle(player);
        break;
      case 'position_swap':
        result = this.positionSwap(player);
        break;
      case 'rocket_raid':
        result = this.rocketRaid(player);
        break;
      case 'lucky_roulette':
        result = this.luckyRoulette(player);
        break;
      default:
        throw new Error('Unknown event type');
    }

    // Emit event result
    this.gameManager.io.to(this.gameManager.room.id).emit(SOCKET_EVENTS.EVENT_RESULT, result);

    return result;
  }

  /**
   * Coin Gift - All players receive random coins
   */
  coinGift(player) {
    const amounts = {};

    Array.from(this.gameManager.players.values()).forEach(p => {
      const amount = Math.floor(Math.random() * 11) + 5; // 5-15 coins
      p.coins += amount;
      amounts[p.id] = amount;
    });

    return {
      type: 'coin_gift',
      message: '모든 플레이어가 코인을 받았습니다!',
      amounts
    };
  }

  /**
   * Coin Plunder - Triggering player steals coins from all others
   */
  coinPlunder(player) {
    let totalStolen = 0;
    const stolenFrom = {};

    Array.from(this.gameManager.players.values()).forEach(p => {
      if (p.id !== player.id) {
        const amount = Math.min(5, p.coins);
        p.coins -= amount;
        totalStolen += amount;
        stolenFrom[p.id] = amount;
      }
    });

    player.coins += totalStolen;

    return {
      type: 'coin_plunder',
      message: `${player.name}이(가) 다른 플레이어들로부터 ${totalStolen}코인을 훔쳤습니다!`,
      totalStolen,
      stolenFrom,
      thief: player.name
    };
  }

  /**
   * Star Shuffle - Randomly redistribute stars among all players
   */
  starShuffle(player) {
    // Calculate total stars
    const totalStars = Array.from(this.gameManager.players.values()).reduce((sum, p) => sum + p.stars, 0);

    if (totalStars === 0) {
      return {
        type: 'star_shuffle',
        message: '별이 없어서 재분배할 수 없습니다!',
        newStarCounts: {}
      };
    }

    // Reset all stars
    Array.from(this.gameManager.players.values()).forEach(p => {
      p.stars = 0;
    });

    // Randomly redistribute
    const newStarCounts = {};
    const playersArray = Array.from(this.gameManager.players.values());
    for (let i = 0; i < totalStars; i++) {
      const randomPlayer = playersArray[Math.floor(Math.random() * playersArray.length)];
      randomPlayer.stars++;
    }

    Array.from(this.gameManager.players.values()).forEach(p => {
      newStarCounts[p.id] = p.stars;
    });

    return {
      type: 'star_shuffle',
      message: '모든 별이 무작위로 재분배되었습니다!',
      newStarCounts
    };
  }

  /**
   * Position Swap - Triggering player swaps with random other player
   */
  positionSwap(player) {
    const otherPlayers = Array.from(this.gameManager.players.values()).filter(p => p.id !== player.id);

    if (otherPlayers.length === 0) {
      return {
        type: 'position_swap',
        message: '위치를 바꿀 다른 플레이어가 없습니다!',
        swappedWith: null,
        newPositions: {}
      };
    }

    const randomPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];

    // Swap positions
    const tempPosition = player.tileId;
    player.tileId = randomPlayer.tileId;
    randomPlayer.tileId = tempPosition;

    const newPositions = {
      [player.id]: player.tileId,
      [randomPlayer.id]: randomPlayer.tileId
    };

    return {
      type: 'position_swap',
      message: `${player.name}과(와) ${randomPlayer.name}의 위치가 바뀌었습니다!`,
      swappedWith: randomPlayer.name,
      newPositions
    };
  }

  /**
   * Rocket Raid - Random player loses coins to Team Rocket
   */
  rocketRaid(player) {
    const playersArray = Array.from(this.gameManager.players.values());
    const victim = playersArray[Math.floor(Math.random() * playersArray.length)];
    const amount = Math.min(Math.floor(Math.random() * 16) + 5, victim.coins); // 5-20 coins, but not more than they have

    victim.coins -= amount;

    return {
      type: 'rocket_raid',
      message: `로켓단이 ${victim.name}으로부터 ${amount}코인을 훔쳐갔습니다!`,
      victim: victim.name,
      amount
    };
  }

  /**
   * Lucky Roulette - Spin for random outcome
   */
  luckyRoulette(player) {
    const roll = Math.random();
    let outcome;

    if (roll < 0.25) {
      // Double coins
      const originalCoins = player.coins;
      player.coins *= 2;
      outcome = {
        type: 'double_coins',
        message: `${player.name}의 코인이 2배가 되었습니다! (${originalCoins} → ${player.coins})`,
        newCoins: player.coins
      };
    } else if (roll < 0.5) {
      // +1 star
      player.stars += 1;
      outcome = {
        type: 'bonus_star',
        message: `${player.name}이(가) 별 1개를 획득했습니다!`,
        newStars: player.stars
      };
    } else if (roll < 0.75) {
      // Free item
      const itemSystem = this.gameManager.itemSystem;
      const item = itemSystem.giveRandomItem(player);
      outcome = {
        type: 'free_item',
        message: `${player.name}이(가) ${item.name}을(를) 획득했습니다!`,
        item: item.name
      };
    } else {
      // Lose half coins
      const lostCoins = Math.floor(player.coins / 2);
      player.coins -= lostCoins;
      outcome = {
        type: 'lose_coins',
        message: `${player.name}이(가) 코인 절반을 잃었습니다! (-${lostCoins})`,
        lostCoins,
        newCoins: player.coins
      };
    }

    return {
      type: 'lucky_roulette',
      message: `${player.name}이(가) 럭키 룰렛을 돌렸습니다!`,
      outcome
    };
  }
}
