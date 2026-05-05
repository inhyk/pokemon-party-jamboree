import { GAME } from 'shared';

class PlayerState {
  constructor(id, name, characterId) {
    this.id = id;
    this.name = name;
    this.characterId = characterId;
    this.position = 0;
    this.coins = GAME.STARTING_COINS;
    this.stars = 0;
    this.items = [];
    this.stats = {
      minigameWins: 0,
      totalCoinsEarned: 0,
      eventTilesLanded: 0,
    };
  }

  /**
   * Add coins to player (can be negative for removing)
   */
  addCoins(amount) {
    this.coins += amount;
    if (amount > 0) {
      this.stats.totalCoinsEarned += amount;
    }
  }

  /**
   * Remove coins from player (ensures minimum of 0)
   */
  removeCoins(amount) {
    this.coins = Math.max(0, this.coins - amount);
  }

  /**
   * Add a star to player
   */
  addStar() {
    this.stars++;
  }

  /**
   * Remove a star from player (ensures minimum of 0)
   */
  removeStar() {
    this.stars = Math.max(0, this.stars - 1);
  }

  /**
   * Add an item to player's inventory
   */
  addItem(item) {
    this.items.push({
      ...item,
      itemId: `${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  /**
   * Remove an item from player's inventory by itemId
   */
  removeItem(itemId) {
    const index = this.items.findIndex(item => item.itemId === itemId);
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if player has a specific item by item id
   */
  hasItem(itemId) {
    return this.items.some(item => item.itemId === itemId);
  }

  /**
   * Get serializable state for client
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      characterId: this.characterId,
      position: this.position,
      coins: this.coins,
      stars: this.stars,
      items: this.items,
      stats: this.stats,
    };
  }
}

export default PlayerState;
