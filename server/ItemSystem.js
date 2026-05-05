import { ITEMS, SOCKET_EVENTS } from 'shared';

export class ItemSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  /**
   * Use an item from player's inventory
   * @param {Object} player - The player using the item
   * @param {string} itemId - The ID of the item to use
   * @param {Object} targetData - Additional data needed for targeted items
   * @returns {Object} Result of using the item
   */
  useItem(player, itemId, targetData = {}) {
    // Validate player has the item
    const itemIndex = player.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('플레이어가 이 아이템을 가지고 있지 않습니다');
    }

    // Remove item from inventory
    player.items.splice(itemIndex, 1);

    // Get item definition
    const itemDef = Object.values(ITEMS).find(i => i.id === itemId);
    if (!itemDef) {
      throw new Error('잘못된 아이템 ID입니다');
    }

    let result;

    // Apply item effect based on type
    switch (itemId) {
      case 'mushroom':
        player.doubleDiceNextRoll = true;
        result = {
          type: 'mushroom',
          message: '다음 턴에 주사위 2개를 굴립니다!',
          player: player.name
        };
        break;

      case 'double_dice':
        player.combinedDiceNextRoll = true;
        result = {
          type: 'double_dice',
          message: '다음 턴에 주사위를 합산합니다!',
          player: player.name
        };
        break;

      case 'warp_pipe':
        if (!targetData.targetPlayerId) {
          throw new Error('워프 파이프에는 대상 플레이어가 필요합니다');
        }
        const targetPlayer = Array.from(this.gameManager.players.values()).find(p => p.id === targetData.targetPlayerId);
        if (!targetPlayer) {
          throw new Error('대상 플레이어를 찾을 수 없습니다');
        }
        if (targetPlayer.id === player.id) {
          throw new Error('자기 자신과는 위치를 교환할 수 없습니다');
        }

        // Swap positions
        const tempPosition = player.tileId;
        player.tileId = targetPlayer.tileId;
        targetPlayer.tileId = tempPosition;

        result = {
          type: 'warp_pipe',
          message: `${player.name}이(가) ${targetPlayer.name}와(과) 위치 교환!`,
          player: player.name,
          swappedWith: targetPlayer.name,
          newPosition: player.tileId,
          targetNewPosition: targetPlayer.tileId
        };
        break;

      case 'coin_thief':
        if (!targetData.targetPlayerId) {
          throw new Error('코인 도둑에는 대상 플레이어가 필요합니다');
        }
        const victim = Array.from(this.gameManager.players.values()).find(p => p.id === targetData.targetPlayerId);
        if (!victim) {
          throw new Error('대상 플레이어를 찾을 수 없습니다');
        }
        if (victim.id === player.id) {
          throw new Error('자기 자신에게서는 훔칠 수 없습니다');
        }

        // Steal coins
        const stolenAmount = Math.min(10, victim.coins);
        victim.coins -= stolenAmount;
        player.coins += stolenAmount;

        result = {
          type: 'coin_thief',
          message: `${player.name}이(가) ${victim.name}에게서 ${stolenAmount}코인을 빼앗았다!`,
          player: player.name,
          stolenAmount,
          from: victim.name
        };
        break;

      case 'master_ball':
        // Move player to current star tile
        const starTileId = this.gameManager.boardGame.starTileId;
        if (!starTileId) {
          throw new Error('사용 가능한 스타 칸이 없습니다');
        }

        player.tileId = starTileId;

        result = {
          type: 'master_ball',
          message: `${player.name}이(가) 스타로 순간이동!`,
          player: player.name,
          newPosition: starTileId
        };
        break;

      default:
        throw new Error('알 수 없는 아이템 타입입니다');
    }

    // Emit item effect event
    this.gameManager.io.to(this.gameManager.room.id).emit(SOCKET_EVENTS.ITEM_EFFECT, result);

    return result;
  }

  /**
   * Get available items for the shop
   * @returns {Array} List of available items
   */
  getAvailableItems() {
    return Object.values(ITEMS);
  }

  /**
   * Give a random item to a player
   * @param {Object} player - The player receiving the item
   * @returns {Object} The item given
   */
  giveRandomItem(player) {
    const itemsArray = Object.values(ITEMS);
    const randomItem = itemsArray[Math.floor(Math.random() * itemsArray.length)];
    player.items.push({ id: randomItem.id });
    return randomItem;
  }

  /**
   * Get random items for shop display
   * @returns {Array} 3 random items
   */
  getShopItems() {
    const shuffled = [...Object.values(ITEMS)].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }
}
