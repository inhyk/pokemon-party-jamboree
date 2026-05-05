import NetworkManager from '../../NetworkManager.js';
import { SOCKET_EVENTS } from 'shared';

export default class VolleyBounceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VolleyBounceScene' });
    this.players = new Map();
    this.ball = null;
    this.team1Score = 0;
    this.team2Score = 0;
  }

  create() {
    // Background (sand color)
    this.cameras.main.setBackgroundColor('#c2b280');

    // Title
    this.add.text(this.cameras.main.centerX, 30, '발리 바운스', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Score display
    this.scoreText = this.add.text(
      this.cameras.main.centerX,
      80,
      '팀 1: 0 - 팀 2: 0',
      {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);

    // Court boundaries (visual)
    const courtWidth = 600;
    const courtHeight = 400;
    const courtX = this.cameras.main.centerX - courtWidth / 2;
    const courtY = this.cameras.main.centerY - courtHeight / 2 + 100;

    // Court outline
    this.courtOutline = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      courtWidth,
      courtHeight
    );
    this.courtOutline.setStrokeStyle(4, 0x8b4513);
    this.courtOutline.isFilled = false;

    // Net line at center
    this.net = this.add.line(
      0,
      0,
      this.cameras.main.centerX,
      courtY,
      this.cameras.main.centerX,
      courtY + courtHeight,
      0x333333
    );
    this.net.setLineWidth(4);
    this.net.setOrigin(0);

    // Net top (higher than court)
    this.netTop = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100 - 50,
      4,
      100,
      0x333333
    );

    // Team labels
    this.add.text(
      this.cameras.main.centerX - 150,
      courtY - 30,
      '팀 1',
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ff6b6b',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    this.add.text(
      this.cameras.main.centerX + 150,
      courtY - 30,
      '팀 2',
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#4ecdc4',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Create ball (initially invisible)
    this.ball = this.add.circle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      15,
      0xffffff
    );
    this.ball.setStrokeStyle(2, 0x000000);

    // Input handling
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

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
      down: this.cursors.down.isDown,
      hit: Phaser.Input.Keyboard.JustDown(this.spaceKey)
    };

    if (input.left || input.right || input.up || input.down || input.hit) {
      NetworkManager.emit(SOCKET_EVENTS.MINIGAME_INPUT, input);
    }
  }

  handleMinigameUpdate(data) {
    const { players, ball, scores } = data;

    // Update scores
    if (scores) {
      this.team1Score = scores.team1 || 0;
      this.team2Score = scores.team2 || 0;
      this.scoreText.setText(`팀 1: ${this.team1Score} - 팀 2: ${this.team2Score}`);
    }

    // Update ball
    if (ball) {
      this.ball.x = ball.x;
      this.ball.y = ball.y;
      this.ball.setVisible(true);
    }

    // Update players
    if (players) {
      players.forEach(player => {
        let playerSprite = this.players.get(player.id);

        const teamColor = player.team === 1 ? 0xff6b6b : 0x4ecdc4;

        if (!playerSprite) {
          // Create player sprite with team color
          playerSprite = this.add.circle(
            player.x,
            player.y,
            20,
            teamColor
          );
          playerSprite.setStrokeStyle(3, parseInt(player.color.replace('#', '0x')));
          this.players.set(player.id, playerSprite);

          // Add player number label
          const label = this.add.text(
            player.x,
            player.y,
            `P${player.playerNumber}`,
            {
              fontSize: '14px',
              fontFamily: 'Arial',
              color: '#ffffff',
              fontStyle: 'bold'
            }
          ).setOrigin(0.5);
          playerSprite.label = label;
        } else {
          // Update position
          playerSprite.x = player.x;
          playerSprite.y = player.y;
          playerSprite.label.x = player.x;
          playerSprite.label.y = player.y;

          // Update team color if changed
          playerSprite.setFillStyle(teamColor);
        }
      });
    }
  }

  handleMinigameEnd(data) {
    const { results, winner } = data;

    // Create results overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      800,
      600,
      0x000000,
      0.8
    );

    // Winner announcement
    const winnerText = winner === 1 ? '팀 1 승리!' : winner === 2 ? '팀 2 승리!' : '무승부!';
    const winnerColor = winner === 1 ? '#ff6b6b' : winner === 2 ? '#4ecdc4' : '#ffffff';

    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 200,
      winnerText,
      {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: winnerColor,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 140,
      `최종 점수: ${this.team1Score} - ${this.team2Score}`,
      {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff'
      }
    ).setOrigin(0.5);

    // Display individual player rewards
    if (results) {
      results.forEach((result, index) => {
        const yPos = this.cameras.main.centerY - 60 + index * 50;

        this.add.text(
          this.cameras.main.centerX,
          yPos,
          `플레이어 ${result.playerNumber} (팀 ${result.team}): +${result.reward} 코인`,
          {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: result.color
          }
        ).setOrigin(0.5);
      });
    }

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
  }

  shutdown() {
    this.cleanup();
  }
}
