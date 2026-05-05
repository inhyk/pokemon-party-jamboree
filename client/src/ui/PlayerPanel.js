import ItemSlot from './ItemSlot.js';

export default class PlayerPanel {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(1000, 100);
    this.container.setDepth(900);

    this.playerCards = [];
    this.itemSlots = new Map();

    this.createPanel();
  }

  createPanel() {
    // Background
    const bg = this.scene.add.rectangle(0, 0, 260, 600, 0x000000, 0.7)
      .setOrigin(0);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(130, 20, '플레이어', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);

    // Create 4 player card slots
    for (let i = 0; i < 4; i++) {
      const card = this.createPlayerCard(i);
      this.playerCards.push(card);
      this.container.add(card.container);
    }
  }

  createPlayerCard(index) {
    const yPos = 60 + index * 130;
    const container = this.scene.add.container(10, yPos);

    // Card background
    const bg = this.scene.add.rectangle(0, 0, 240, 120, 0x333333, 0.9)
      .setOrigin(0);

    // Character icon placeholder (colored circle)
    const icon = this.scene.add.circle(30, 30, 20, 0xffffff);

    // Player name
    const nameText = this.scene.add.text(60, 15, 'Player ?', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    // Coins
    const coinsText = this.scene.add.text(60, 40, '코인: 0', {
      fontSize: '14px',
      color: '#ffff00'
    });

    // Stars
    const starsText = this.scene.add.text(60, 60, '스타: 0', {
      fontSize: '14px',
      color: '#00ffff'
    });

    // Items label
    const itemsLabel = this.scene.add.text(10, 85, '아이템:', {
      fontSize: '12px',
      color: '#cccccc'
    });

    container.add([bg, icon, nameText, coinsText, starsText, itemsLabel]);

    return {
      container,
      bg,
      icon,
      nameText,
      coinsText,
      starsText,
      itemSlots: []
    };
  }

  update(players, currentPlayerId) {
    players.forEach((player, index) => {
      if (index >= this.playerCards.length) return;

      const card = this.playerCards[index];

      // Update character icon color
      const characterColors = {
        mario: 0xff0000,
        luigi: 0x00ff00,
        peach: 0xff69b4,
        yoshi: 0x00ff00
      };
      const color = characterColors[player.character] || 0xffffff;
      card.icon.setFillStyle(color);

      // Update texts
      card.nameText.setText(player.name);
      card.coinsText.setText(`코인: ${player.coins}`);
      card.starsText.setText(`스타: ${player.stars}`);

      // Highlight current player
      if (player.id === currentPlayerId) {
        card.bg.setFillStyle(0x444444, 1);
        card.bg.setStrokeStyle(3, 0xffff00);
      } else {
        card.bg.setFillStyle(0x333333, 0.9);
        card.bg.setStrokeStyle(0);
      }

      // Update items
      this.updatePlayerItems(card, player);
    });
  }

  updatePlayerItems(card, player) {
    // Clear existing item slots
    card.itemSlots.forEach(slot => slot.destroy());
    card.itemSlots = [];

    // Create new item slots
    player.items.forEach((item, index) => {
      if (index >= 3) return; // Max 3 items shown

      const slot = new ItemSlot(
        this.scene,
        card.container.x + 60 + index * 50,
        card.container.y + 95,
        item
      );

      card.itemSlots.push(slot);
      this.container.add(slot.container);
    });
  }

  destroy() {
    this.container.destroy();
  }
}
