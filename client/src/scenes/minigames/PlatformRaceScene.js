import NetworkManager from '../../NetworkManager.js';
import { SOCKET_EVENTS } from 'shared';

export default class PlatformRaceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlatformRaceScene' });
    this.players = new Map();
    this.platforms = [];
    this.localPlayerId = null;
  }

  create() {
    // Background
    this.cameras.main.setBackgroundColor('#0d1b2a');

    // Title
    this.titleText = this.add.text(this.cameras.main.centerX, 30, '플랫폼 레이스', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.titleText.setScrollFactor(0);

    // Height indicator
    this.heightText = this.add.text(20, 80, '높이: 0m', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff'
    });
    this.heightText.setScrollFactor(0);

    // Progress bar background
    this.progressBarBg = this.add.rectangle(
      this.cameras.main.width - 50,
      this.cameras.main.centerY,
      30,
      400,
      0x333333
    );
    this.progressBarBg.setScrollFactor(0);

    // Progress bar fill
    this.progressBar = this.add.rectangle(
      this.cameras.main.width - 50,
      this.cameras.main.centerY + 200,
      30,
      0,
      0x00ff00
    );
    this.progressBar.setOrigin(0.5, 1);
    this.progressBar.setScrollFactor(0);

    // Input handling
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Get local player ID
    this.localPlayerId = NetworkManager.playerId;

    // Listen for updates
    NetworkManager.on(SOCKET_EVENTS.MINIGAME_UPDATE, this.handleMinigameUpdate.bind(this));
    NetworkManager.on(SOCKET_EVENTS.MINIGAME_END, this.handleMinigameEnd.bind(this));

    this.events.on('shutdown', this.shutdown, this);
  }

  update() {
    const input = {
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
      jump: Phaser.Input.Keyboard.JustDown(this.spaceKey)
    };

    if (input.left || input.right || input.jump) {
      NetworkManager.emit(SOCKET_EVENTS.MINIGAME_INPUT, input);
    }
  }

  handleMinigameUpdate(data) {
    const { players, platforms, maxHeight } = data;

    // Update platforms
    if (platforms) {
      // Clear existing platforms
      this.platforms.forEach(p => p.destroy());
      this.platforms = [];

      // Create new platforms
      platforms.forEach(platformData => {
        const platform = this.add.rectangle(
          platformData.x,
          platformData.y,
          platformData.width,
          platformData.height,
          0xffffff
        );
        this.platforms.push(platform);
      });
    }

    // Update players
    if (players) {
      let localPlayer = null;

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

          // Add player number label
          const label = this.add.text(
            player.x,
            player.y - 30,
            `P${player.playerNumber}`,
            {
              fontSize: '16px',
              fontFamily: 'Arial',
              color: '#ffffff'
            }
          ).setOrigin(0.5);
          playerSprite.label = label;
        } else {
          // Update position
          playerSprite.x = player.x;
          playerSprite.y = player.y;
          playerSprite.label.x = player.x;
          playerSprite.label.y = player.y - 30;
        }

        // Track local player
        if (player.id === this.localPlayerId) {
          localPlayer = player;
        }
      });

      // Follow local player with camera
      if (localPlayer) {
        this.cameras.main.scrollY = localPlayer.y - this.cameras.main.centerY;

        // Update height display
        const height = Math.max(0, Math.floor(-localPlayer.y / 10));
        this.heightText.setText(`높이: ${height}m`);

        // Update progress bar
        if (maxHeight) {
          const progress = Math.min(1, Math.max(0, -localPlayer.y / maxHeight));
          this.progressBar.height = 400 * progress;
        }
      }
    }
  }

  handleMinigameEnd(data) {
    const { results } = data;

    // Create results overlay (fixed to camera)
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      800,
      600,
      0x000000,
      0.8
    );
    overlay.setScrollFactor(0);

    const resultsTitle = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 200,
      '레이스 결과',
      {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    resultsTitle.setScrollFactor(0);

    // Display rankings
    results.forEach((result, index) => {
      const yPos = this.cameras.main.centerY - 100 + index * 60;

      const resultText = this.add.text(
        this.cameras.main.centerX,
        yPos,
        `${index + 1}위. 플레이어 ${result.playerNumber}: ${result.height}m (+${result.reward} 코인)`,
        {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: result.color
        }
      ).setOrigin(0.5);
      resultText.setScrollFactor(0);
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
    this.platforms.forEach(p => p.destroy());
    this.platforms = [];
  }

  shutdown() {
    this.cleanup();
  }
}
