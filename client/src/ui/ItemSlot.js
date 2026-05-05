import NetworkManager from '../NetworkManager.js';
import { SOCKET_EVENTS } from 'shared';

export default class ItemSlot {
  constructor(scene, x, y, item) {
    this.scene = scene;
    this.item = item;
    this.container = scene.add.container(x, y);
    this.container.setDepth(910);

    this.createSlot();
  }

  createSlot() {
    // Icon background (small square)
    this.bg = this.scene.add.rectangle(0, 0, 40, 40, 0x555555, 0.9)
      .setOrigin(0.5);

    // Item icon (colored circle based on item type)
    const itemColors = {
      mushroom: 0xff0000,
      star: 0xffff00,
      coin: 0xffd700,
      swap: 0x00ffff
    };
    const color = itemColors[this.item] || 0xffffff;

    this.icon = this.scene.add.circle(0, 0, 12, color);

    // Item name (abbreviated)
    const itemLabels = {
      mushroom: 'M',
      star: 'S',
      coin: 'C',
      swap: 'W'
    };
    const label = itemLabels[this.item] || '?';

    this.text = this.scene.add.text(0, 0, label, {
      fontSize: '14px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.container.add([this.bg, this.icon, this.text]);

    // Make interactive by default (disabled state set later)
    this.setInteractive(false);
  }

  setInteractive(enabled) {
    if (enabled) {
      this.bg.setInteractive({ useHandCursor: true });
      this.bg.on('pointerdown', () => this.useItem());
      this.bg.on('pointerover', () => {
        this.bg.setFillStyle(0x777777, 1);
      });
      this.bg.on('pointerout', () => {
        this.bg.setFillStyle(0x555555, 0.9);
      });
    } else {
      this.bg.disableInteractive();
      this.bg.removeAllListeners();
    }
  }

  useItem() {
    console.log('[ItemSlot] Using item:', this.item);
    const nm = NetworkManager;
    nm.emit(SOCKET_EVENTS.USE_ITEM, { item: this.item });

    // Visual feedback
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      onComplete: () => {
        this.destroy();
      }
    });
  }

  destroy() {
    this.container.destroy();
  }
}
