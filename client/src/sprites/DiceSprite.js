import { CONFIG } from 'shared';

export default class DiceSprite {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.createDice();
  }

  createDice() {
    // White square background
    this.sprite = this.scene.add.rectangle(this.x, this.y, 80, 80, 0xffffff);
    this.sprite.setStrokeStyle(4, 0x000000);

    // Number text
    this.text = this.scene.add.text(this.x, this.y, '?', {
      fontSize: '48px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  roll(finalValue, callback) {
    const animDuration = CONFIG.dice?.animDuration || 2000;
    const rollInterval = 100;
    const rollCount = Math.floor(animDuration / rollInterval);

    let currentRoll = 0;

    // Bounce and shake animation
    this.scene.tweens.add({
      targets: [this.sprite, this.text],
      angle: 360,
      scale: 1.2,
      duration: animDuration,
      ease: 'Bounce.easeOut'
    });

    // Number cycling
    const rollTimer = this.scene.time.addEvent({
      delay: rollInterval,
      callback: () => {
        currentRoll++;

        if (currentRoll >= rollCount) {
          // Show final value
          this.text.setText(finalValue.toString());
          rollTimer.destroy();

          // Final flash
          this.scene.tweens.add({
            targets: [this.sprite, this.text],
            scale: 1.5,
            duration: 200,
            yoyo: true,
            onComplete: () => {
              if (callback) {
                callback();
              }
            }
          });
        } else {
          // Show random number 1-10
          const randomNum = Phaser.Math.Between(1, 10);
          this.text.setText(randomNum.toString());
        }
      },
      repeat: rollCount
    });
  }

  destroy() {
    this.sprite.destroy();
    this.text.destroy();
  }
}
