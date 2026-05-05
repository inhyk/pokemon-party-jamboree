import NetworkManager from '../../NetworkManager.js';
import { SOCKET_EVENTS } from 'shared';

export default class BumperBattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BumperBattleScene' });
    this.players = new Map();
    this.timeRemaining = 0;
  }

  create() {
    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(this.cameras.main.centerX, 30, '범퍼 배틀', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Timer bar
    this.timerBarBg = this.add.rectangle(
      this.cameras.main.centerX,
      70,
      400,
      20,
      0x333333
    );

    this.timerBar = this.add.rectangle(
      this.cameras.main.centerX - 200,
      70,
      400,
      20,
      0xffcc00
    ).setOrigin(0, 0.5);

    // Draw circular platform
    this.platform = this.add.circle(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      250,
      0x666666
    );

    // Platform outline
    this.platformOutline = this.add.circle(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      250
    );
    this.platformOutline.setStrokeStyle(4, 0xffffff);
    this.platformOutline.isFilled = false;

    // Lives display container
    this.livesTexts = new Map();

    // Input handling
    this.cursors = this.input.keyboard.createCursorKeys();

    // Listen for updates
    NetworkManager.on(SOCKET_EVENTS.MINIGAME_UPDATE, this.handleMinigameUpdate.bind(this));
    NetworkManager.on(SOCKET_EVENTS.MINIGAME_END, this.handleMinigameEnd.bind(this));

    this.events.on('shutdown', this.shutdown, this);
  }

  update() {
    const input = {
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
      up: this.cursors.up.isDown,
      down: this.cursors.down.isDown
    };

    if (input.left || input.right || input.up || input.down) {
      NetworkManager.emit(SOCKET_EVENTS.MINIGAME_INPUT, input);
    }
  }

  handleMinigameUpdate(data) {
    const { players, timeRemaining } = data;

    // Update timer
    this.timeRemaining = timeRemaining;
    const timerPercent = Math.max(0, timeRemaining / 60); // Assuming 60s max
    this.timerBar.width = 400 * timerPercent;

    // Update players
    if (players) {
      players.forEach(player => {
        let playerSprite = this.players.get(player.id);

        if (!playerSprite) {
          // Create player sprite
          playerSprite = this.add.circle(
            player.x,
            player.y,
            25,
            parseInt(player.color.replace('#', '0x'))
          );
          this.players.set(player.id, playerSprite);

          // Create lives text
          const livesText = this.add.text(
            100 + this.livesTexts.size * 150,
            100,
            `P${player.playerNumber}: 목숨 ${player.lives || 3}`,
            {
              fontSize: '18px',
              fontFamily: 'Arial',
              color: player.color
            }
          );
          this.livesTexts.set(player.id, livesText);
        } else {
          // Update position
          playerSprite.x = player.x;
          playerSprite.y = player.y;
        }

        // Update opacity if eliminated or off platform
        if (player.lives <= 0 || player.eliminated) {
          playerSprite.setAlpha(0.3);
        } else {
          playerSprite.setAlpha(1.0);
        }

        // Update lives display
        const livesText = this.livesTexts.get(player.id);
        if (livesText) {
          livesText.setText(`P${player.playerNumber}: 목숨 ${player.lives || 0}`);
          if (player.lives <= 0) {
            livesText.setAlpha(0.5);
          }
        }
      });
    }
  }

  handleMinigameEnd(data) {
    const { results } = data;

    // Create results overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      800,
      600,
      0x000000,
      0.8
    );

    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 200,
      '배틀 결과',
      {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Display rankings
    results.forEach((result, index) => {
      const yPos = this.cameras.main.centerY - 100 + index * 60;

      this.add.text(
        this.cameras.main.centerX,
        yPos,
        `${index + 1}위. 플레이어 ${result.playerNumber}: 목숨 ${result.lives} (+${result.reward} 코인)`,
        {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: result.color
        }
      ).setOrigin(0.5);
    });

    // Transition back after 3 seconds
    this.time.delayedCall(3000, () => {
      this.cleanup();
      this.scene.start('BoardScene');
    });
  }

  cleanup() {
    NetworkManager.off(SOCKET_EVENTS.MINIGAME_UPDATE, this.handleMinigameUpdate.bind(this));
    NetworkManager.off(SOCKET_EVENTS.MINIGAME_END, this.handleMinigameEnd.bind(this));

    this.players.clear();
    this.livesTexts.clear();
  }

  shutdown() {
    this.cleanup();
  }
}
