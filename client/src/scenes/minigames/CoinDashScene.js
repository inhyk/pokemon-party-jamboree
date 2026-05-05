import NetworkManager from '../../NetworkManager.js';
import { SOCKET_EVENTS } from 'shared';

export default class CoinDashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CoinDashScene' });
    this.players = new Map();
    this.coins = new Map();
    this.scores = new Map();
    this.timeRemaining = 0;
  }

  create() {
    // Background
    this.cameras.main.setBackgroundColor('#2d5016');

    // Title
    this.add.text(this.cameras.main.centerX, 30, '코인 대시', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Timer bar container
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

    // Score display container
    this.scoreTexts = new Map();

    // Input handling
    this.cursors = this.input.keyboard.createCursorKeys();

    // Listen for minigame updates
    NetworkManager.on(SOCKET_EVENTS.MINIGAME_UPDATE, this.handleMinigameUpdate.bind(this));
    NetworkManager.on(SOCKET_EVENTS.MINIGAME_END, this.handleMinigameEnd.bind(this));

    this.events.on('shutdown', this.shutdown, this);
  }

  update() {
    // Send input to server
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
    const { players, coins, timeRemaining } = data;

    // Update timer
    this.timeRemaining = timeRemaining;
    const timerPercent = Math.max(0, timeRemaining / 30); // Assuming 30s max
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
            20,
            parseInt(player.color.replace('#', '0x'))
          );
          this.players.set(player.id, playerSprite);

          // Create score text
          const scoreText = this.add.text(
            100 + this.scoreTexts.size * 150,
            100,
            `P${player.playerNumber}: ${player.score || 0}`,
            {
              fontSize: '20px',
              fontFamily: 'Arial',
              color: player.color
            }
          );
          this.scoreTexts.set(player.id, scoreText);
        } else {
          // Update position
          playerSprite.x = player.x;
          playerSprite.y = player.y;
        }

        // Update score
        const scoreText = this.scoreTexts.get(player.id);
        if (scoreText) {
          scoreText.setText(`P${player.playerNumber}: ${player.score || 0}`);
        }
      });
    }

    // Update coins
    if (coins) {
      // Remove collected coins
      this.coins.forEach((coinSprite, coinId) => {
        if (!coins.find(c => c.id === coinId)) {
          coinSprite.destroy();
          this.coins.delete(coinId);
        }
      });

      // Add/update coins
      coins.forEach(coin => {
        let coinSprite = this.coins.get(coin.id);

        if (!coinSprite) {
          coinSprite = this.add.circle(coin.x, coin.y, 15, 0xffd700);
          this.coins.set(coin.id, coinSprite);
        } else {
          coinSprite.x = coin.x;
          coinSprite.y = coin.y;
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
      '결과',
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
        `${index + 1}위. 플레이어 ${result.playerNumber}: ${result.score} 코인 (+${result.reward} 코인)`,
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
    this.coins.clear();
    this.scores.clear();
    this.scoreTexts.clear();
  }

  shutdown() {
    this.cleanup();
  }
}
