import NetworkManager from '../NetworkManager.js';
import { SOCKET_EVENTS, ITEMS, CONFIG } from 'shared';

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  create(data) {
    const { items = [], playerCoins = 0 } = data;

    // Dark semi-transparent overlay background
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.85
    );

    // Title
    this.add.text(
      this.cameras.main.centerX,
      100,
      '포켓몬 상점',
      { fontSize: '48px', color: '#ffdd00', fontStyle: 'bold' }
    ).setOrigin(0.5);

    // Display player coins
    this.coinsText = this.add.text(
      this.cameras.main.centerX,
      160,
      `보유 코인: ${playerCoins}`,
      { fontSize: '28px', color: '#ffffff' }
    ).setOrigin(0.5);

    // Store current coins
    this.playerCoins = playerCoins;

    // Display items in a row
    const startX = this.cameras.main.centerX - 300;
    const itemY = 300;
    const spacing = 300;

    this.itemBoxes = [];

    items.forEach((item, index) => {
      const x = startX + index * spacing;
      const canAfford = this.playerCoins >= item.cost;

      // Item box background
      const boxColor = canAfford ? 0x333333 : 0x555555;
      const borderColor = canAfford ? 0xffffff : 0x880000;

      const box = this.add.rectangle(x, itemY, 250, 300, boxColor);
      box.setStrokeStyle(4, borderColor);

      // Item name
      const nameText = this.add.text(
        x,
        itemY - 100,
        item.name,
        { fontSize: '24px', color: canAfford ? '#ffffff' : '#999999', fontStyle: 'bold', wordWrap: { width: 230 } }
      ).setOrigin(0.5);

      // Cost (coins icon + number)
      const costText = this.add.text(
        x,
        itemY - 50,
        `🪙 ${item.cost}`,
        { fontSize: '28px', color: canAfford ? '#ffdd00' : '#cc9900' }
      ).setOrigin(0.5);

      // Description
      const descText = this.add.text(
        x,
        itemY + 30,
        item.desc || '',
        { fontSize: '18px', color: canAfford ? '#cccccc' : '#777777', align: 'center', wordWrap: { width: 230 } }
      ).setOrigin(0.5);

      // Make interactive if can afford
      if (canAfford) {
        box.setInteractive({ useHandCursor: true });
        box.on('pointerdown', () => this.buyItem(item.id, index));
        box.on('pointerover', () => {
          box.setStrokeStyle(4, 0xffdd00);
        });
        box.on('pointerout', () => {
          box.setStrokeStyle(4, borderColor);
        });
      }

      this.itemBoxes.push({
        box,
        nameText,
        costText,
        descText,
        itemId: item.id,
        cost: item.cost
      });
    });

    // Leave Shop button
    const leaveButton = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.height - 100,
      '상점 나가기',
      { fontSize: '32px', color: '#ffffff', backgroundColor: '#aa0000', padding: { x: 20, y: 10 } }
    ).setOrigin(0.5);

    leaveButton.setInteractive({ useHandCursor: true });
    leaveButton.on('pointerdown', () => {
      this.scene.stop();
    });
    leaveButton.on('pointerover', () => {
      leaveButton.setStyle({ backgroundColor: '#ff0000' });
    });
    leaveButton.on('pointerout', () => {
      leaveButton.setStyle({ backgroundColor: '#aa0000' });
    });

    // Listen for shop result
    NetworkManager.on(SOCKET_EVENTS.SHOP_RESULT, this.handleShopResult, this);

    this.events.on('shutdown', this.shutdown, this);
  }

  buyItem(itemId, index) {
    NetworkManager.emit(SOCKET_EVENTS.SHOP_BUY, { itemId });
  }

  handleShopResult(data) {
    const { success, item, coins, message } = data;

    if (success) {
      // Show purchase message
      const purchaseText = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 100,
        `${item.name} 구매 완료!`,
        { fontSize: '36px', color: '#00ff00', fontStyle: 'bold', backgroundColor: '#000000', padding: { x: 20, y: 10 } }
      ).setOrigin(0.5);

      // Fade out purchase text after 2 seconds
      this.tweens.add({
        targets: purchaseText,
        alpha: 0,
        duration: 500,
        delay: 1500,
        onComplete: () => purchaseText.destroy()
      });

      // Update coins
      this.playerCoins = coins;
      this.coinsText.setText(`보유 코인: ${this.playerCoins}`);

      // Disable bought item
      const itemBox = this.itemBoxes.find(ib => ib.itemId === item.id);
      if (itemBox) {
        itemBox.box.disableInteractive();
        itemBox.box.setStrokeStyle(4, 0x555555);
        itemBox.box.setFillStyle(0x333333);
        itemBox.nameText.setColor('#777777');
        itemBox.costText.setColor('#777777');
        itemBox.descText.setColor('#555555');
      }

      // Update affordability of other items
      this.itemBoxes.forEach(itemBox => {
        if (itemBox.itemId !== item.id) {
          const canAfford = this.playerCoins >= itemBox.cost;
          if (!canAfford && itemBox.box.input && itemBox.box.input.enabled) {
            itemBox.box.disableInteractive();
            itemBox.box.setStrokeStyle(4, 0x880000);
            itemBox.box.setFillStyle(0x555555);
            itemBox.nameText.setColor('#999999');
            itemBox.costText.setColor('#cc9900');
            itemBox.descText.setColor('#777777');
          }
        }
      });
    } else {
      // Show error message
      const errorText = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 100,
        message || '구매 실패',
        { fontSize: '32px', color: '#ff0000', fontStyle: 'bold', backgroundColor: '#000000', padding: { x: 20, y: 10 } }
      ).setOrigin(0.5);

      this.tweens.add({
        targets: errorText,
        alpha: 0,
        duration: 500,
        delay: 1500,
        onComplete: () => errorText.destroy()
      });
    }
  }

  shutdown() {
    NetworkManager.off(SOCKET_EVENTS.SHOP_RESULT, this.handleShopResult, this);
  }
}
