import NetworkManager from '../NetworkManager.js';
import { SOCKET_EVENTS } from 'shared';

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data) {
    const { players = [], bonusStars = [], winner = null } = data;

    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0033, 0x1a0033, 0x000033, 0x000033, 1);
    bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    // Store player scores for updates
    this.playerScoreTexts = {};

    // Start animation sequence
    this.showAnimatedResults(players, bonusStars, winner);
  }

  async showAnimatedResults(players, bonusStars, winner) {
    // 1. Title "Game Over!" with fade in
    const title = this.add.text(
      this.cameras.main.centerX,
      100,
      '게임 종료!',
      { fontSize: '64px', color: '#ffdd00', fontStyle: 'bold' }
    ).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 500
    });

    await this.wait(800);

    // 2. Show player scores - each slides in from left
    const startY = 200;
    const spacing = 80;

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const y = startY + i * spacing;

      const scoreContainer = this.add.container(-300, y);

      // Player name and character
      const nameText = this.add.text(
        0, 0,
        `${player.name}`,
        { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }
      );

      // Stars
      const starsText = this.add.text(
        300, 0,
        `★ ${player.stars}`,
        { fontSize: '28px', color: '#ffdd00' }
      );

      // Coins
      const coinsText = this.add.text(
        450, 0,
        `🪙 ${player.coins}`,
        { fontSize: '28px', color: '#ffffff' }
      );

      scoreContainer.add([nameText, starsText, coinsText]);

      // Store reference for later updates
      this.playerScoreTexts[player.name] = { starsText, stars: player.stars };

      // Slide in animation
      this.tweens.add({
        targets: scoreContainer,
        x: 100,
        duration: 400,
        delay: i * 300,
        ease: 'Back.easeOut'
      });
    }

    await this.wait(players.length * 300 + 600);

    // 3. Bonus stars section
    if (bonusStars.length > 0) {
      const bonusTitle = this.add.text(
        this.cameras.main.centerX,
        startY + players.length * spacing + 50,
        '보너스 스타!',
        { fontSize: '48px', color: '#ffaa00', fontStyle: 'bold' }
      ).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: bonusTitle,
        alpha: 1,
        duration: 500
      });

      await this.wait(800);

      // Reveal each bonus star
      const bonusY = startY + players.length * spacing + 130;

      for (let i = 0; i < bonusStars.length; i++) {
        const bonus = bonusStars[i];

        // Bonus star info
        const bonusText = this.add.text(
          this.cameras.main.centerX,
          bonusY + i * 100,
          `${bonus.name}\n${bonus.desc}\nAwarded to: ${bonus.awardedTo}`,
          { fontSize: '24px', color: '#ffdd00', align: 'center', backgroundColor: '#000000aa', padding: { x: 20, y: 10 } }
        ).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
          targets: bonusText,
          alpha: 1,
          duration: 500
        });

        await this.wait(600);

        // Update player's star count with +1 animation
        const playerScore = this.playerScoreTexts[bonus.awardedTo];
        if (playerScore) {
          playerScore.stars += 1;

          // Create +1 animation
          const plusOne = this.add.text(
            playerScore.starsText.x + 80,
            playerScore.starsText.y - 30,
            '+1',
            { fontSize: '36px', color: '#00ff00', fontStyle: 'bold' }
          ).setAlpha(0);

          this.tweens.add({
            targets: plusOne,
            alpha: 1,
            y: playerScore.starsText.y - 50,
            duration: 500,
            onComplete: () => {
              // Update star text
              playerScore.starsText.setText(`★ ${playerScore.stars}`);

              // Flash effect
              this.tweens.add({
                targets: playerScore.starsText,
                scale: 1.3,
                duration: 200,
                yoyo: true,
                onComplete: () => {
                  plusOne.destroy();
                }
              });
            }
          });
        }

        await this.wait(1000);
      }

      await this.wait(1000);
    }

    // 4. Winner announcement
    if (winner) {
      const winnerText = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 50,
        `우승!\n${winner.name}`,
        { fontSize: '56px', color: '#ffff00', fontStyle: 'bold', align: 'center', stroke: '#ff0000', strokeThickness: 4 }
      ).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: winnerText,
        alpha: 1,
        scale: { from: 0.5, to: 1.2 },
        duration: 800,
        ease: 'Bounce.easeOut'
      });

      // Confetti-like particle effect
      this.createConfetti();
    }

    await this.wait(2000);

    // Show buttons
    this.createButtons();
  }

  createConfetti() {
    const colors = [0xffdd00, 0xff0000, 0x00ff00, 0x0000ff, 0xff00ff];

    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, this.cameras.main.width);
      const y = Phaser.Math.Between(-100, 0);
      const color = Phaser.Utils.Array.GetRandom(colors);

      const particle = this.add.circle(x, y, 8, color);

      this.tweens.add({
        targets: particle,
        y: this.cameras.main.height + 100,
        x: x + Phaser.Math.Between(-100, 100),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 500),
        onComplete: () => particle.destroy()
      });
    }
  }

  createButtons() {
    // Play Again button
    const playAgainButton = this.add.text(
      this.cameras.main.centerX - 150,
      this.cameras.main.height - 80,
      '다시 하기',
      { fontSize: '32px', color: '#ffffff', backgroundColor: '#00aa00', padding: { x: 20, y: 10 } }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playAgainButton.on('pointerdown', () => {
      this.scene.start('LobbyScene');
    });
    playAgainButton.on('pointerover', () => {
      playAgainButton.setStyle({ backgroundColor: '#00ff00' });
    });
    playAgainButton.on('pointerout', () => {
      playAgainButton.setStyle({ backgroundColor: '#00aa00' });
    });

    // Leave button
    const leaveButton = this.add.text(
      this.cameras.main.centerX + 150,
      this.cameras.main.height - 80,
      '나가기',
      { fontSize: '32px', color: '#ffffff', backgroundColor: '#aa0000', padding: { x: 20, y: 10 } }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });

    leaveButton.on('pointerdown', () => {
      this.scene.start('LobbyScene');
    });
    leaveButton.on('pointerover', () => {
      leaveButton.setStyle({ backgroundColor: '#ff0000' });
    });
    leaveButton.on('pointerout', () => {
      leaveButton.setStyle({ backgroundColor: '#aa0000' });
    });

    // Fade in buttons
    this.tweens.add({
      targets: [playAgainButton, leaveButton],
      alpha: { from: 0, to: 1 },
      duration: 500
    });
  }

  wait(ms) {
    return new Promise(resolve => {
      this.time.delayedCall(ms, resolve);
    });
  }
}
