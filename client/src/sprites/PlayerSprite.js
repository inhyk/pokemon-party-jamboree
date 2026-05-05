import { CHARACTERS } from 'shared';

export default class PlayerSprite {
  constructor(scene, x, y, characterId) {
    this.scene = scene;
    this.characterId = characterId;
    this.container = scene.add.container(x, y);
    this.container.setDepth(100);

    this.createSprite();
  }

  createSprite() {
    // Character colors
    const characterColors = {
      mario: 0xff0000,
      luigi: 0x00ff00,
      peach: 0xff69b4,
      yoshi: 0x90ee90
    };

    const color = characterColors[this.characterId] || 0xffffff;

    // Colored circle token (32px diameter)
    this.circle = this.scene.add.circle(0, 0, 16, color);
    this.circle.setStrokeStyle(2, 0x000000);

    // Character initial
    const initial = this.characterId ? this.characterId[0].toUpperCase() : '?';
    this.text = this.scene.add.text(0, 0, initial, {
      fontSize: '16px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Name label below
    this.nameLabel = this.scene.add.text(0, 25, this.characterId, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 3, y: 2 }
    }).setOrigin(0.5);

    this.container.add([this.circle, this.text, this.nameLabel]);
  }

  get x() {
    return this.container.x;
  }

  get y() {
    return this.container.y;
  }

  setHighlight(on) {
    if (on) {
      this.circle.setStrokeStyle(4, 0xffff00);
      this.scene.tweens.add({
        targets: this.container,
        scale: 1.2,
        duration: 300,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.circle.setStrokeStyle(2, 0x000000);
      this.scene.tweens.killTweensOf(this.container);
      this.container.setScale(1);
    }
  }

  async moveTo(x, y, duration) {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        x,
        y,
        duration,
        ease: 'Power2',
        onComplete: () => resolve()
      });
    });
  }

  async bounce() {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        y: this.container.y - 20,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => resolve()
      });
    });
  }

  destroy() {
    this.container.destroy();
  }
}
