import { TILE_TYPES } from 'shared';

export default class BoardTile {
  constructor(scene, tileData) {
    this.scene = scene;
    this.tileData = tileData;
    this.x = tileData.x;
    this.y = tileData.y;

    this.container = scene.add.container(this.x, this.y);
    this.container.setDepth(10);

    this.createTile();
  }

  createTile() {
    const { type, id } = this.tileData;

    // Tile colors based on type
    const tileColors = {
      [TILE_TYPES.BLUE]: 0x4a90e2,
      [TILE_TYPES.RED]: 0xe74c3c,
      [TILE_TYPES.EVENT]: 0x9b59b6,
      [TILE_TYPES.STAR]: 0xf1c40f,
      [TILE_TYPES.CHANCE]: 0xe67e22,
      [TILE_TYPES.JUNCTION]: 0x95a5a6
    };

    const color = tileColors[type] || 0x7f8c8d;

    // Tile square (64x64)
    this.square = this.scene.add.rectangle(0, 0, 64, 64, color);
    this.square.setStrokeStyle(2, 0x000000);

    // Type label
    const typeLabels = {
      [TILE_TYPES.BLUE]: 'B',
      [TILE_TYPES.RED]: 'R',
      [TILE_TYPES.EVENT]: 'E',
      [TILE_TYPES.STAR]: '★',
      [TILE_TYPES.CHANCE]: '?',
      [TILE_TYPES.JUNCTION]: 'J'
    };

    const label = typeLabels[type] || '?';
    this.label = this.scene.add.text(0, 0, label, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    // Tile ID (small, for debugging)
    this.idText = this.scene.add.text(0, 25, id.toString(), {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 2, y: 1 }
    }).setOrigin(0.5);

    this.container.add([this.square, this.label, this.idText]);
  }

  highlight(on) {
    if (on) {
      this.square.setStrokeStyle(4, 0xffff00);
      this.scene.tweens.add({
        targets: this.square,
        alpha: 0.8,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.square.setStrokeStyle(2, 0x000000);
      this.scene.tweens.killTweensOf(this.square);
      this.square.setAlpha(1);
    }
  }

  showEffect(text) {
    const effectText = this.scene.add.text(this.x, this.y - 40, text, {
      fontSize: '18px',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    effectText.setDepth(200);

    this.scene.tweens.add({
      targets: effectText,
      y: this.y - 80,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => effectText.destroy()
    });
  }

  destroy() {
    this.container.destroy();
  }
}
