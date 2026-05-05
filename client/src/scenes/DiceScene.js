import { CONFIG } from 'shared';
import DiceSprite from '../sprites/DiceSprite.js';

export default class DiceScene {
  constructor(scene) {
    this.scene = scene;
    this.isShowing = false;
  }

  show(result, callback) {
    if (this.isShowing) {
      console.warn('[DiceScene] Already showing dice');
      return;
    }

    this.isShowing = true;

    // Create overlay container
    const centerX = 640;
    const centerY = 360;

    const container = this.scene.add.container(centerX, centerY);
    container.setDepth(1000);

    // Semi-transparent background
    const overlay = this.scene.add.rectangle(0, 0, 1280, 720, 0x000000, 0.7)
      .setOrigin(0.5);

    // Create dice sprite
    const dice = new DiceSprite(this.scene, 0, 0);

    container.add([overlay, dice.sprite, dice.text]);

    // Animate dice roll
    dice.roll(result, () => {
      // Wait a moment, then clean up
      this.scene.time.delayedCall(1000, () => {
        container.destroy();
        this.isShowing = false;

        if (callback) {
          callback();
        }
      });
    });
  }
}
