import NetworkManager from '../NetworkManager.js';
import { SOCKET_EVENTS, TURN_PHASES, CONFIG, TILE_TYPES } from 'shared';
import HUD from '../ui/HUD.js';
import PlayerPanel from '../ui/PlayerPanel.js';
import BoardTile from '../sprites/BoardTile.js';
import PlayerSprite from '../sprites/PlayerSprite.js';
import DiceScene from './DiceScene.js';

export default class BoardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BoardScene' });
    this.tiles = new Map();
    this.playerSprites = new Map();
    this.diceHelper = null;
    this.hud = null;
    this.playerPanel = null;
    this.gameState = null;
  }

  create(data) {
    console.log('[BoardScene] create with data:', data);
    this.gameState = data.gameState;

    // Background
    this.add.rectangle(0, 0, 1280, 720, 0x1a1a2e).setOrigin(0);

    // Create UI components
    this.hud = new HUD(this);
    this.playerPanel = new PlayerPanel(this);
    this.diceHelper = new DiceScene(this);

    // Render board tiles
    this.renderBoard(data.gameState.board);

    // Render player tokens
    this.renderPlayers(data.gameState.players);

    // Update UI
    this.updateUI(data.gameState);

    // Setup socket listeners
    this.setupSocketListeners();

    this.events.on('shutdown', this.shutdown, this);
  }

  renderBoard(board) {
    console.log('[BoardScene] Rendering board with', board.tiles.length, 'tiles');

    board.tiles.forEach(tileData => {
      const tile = new BoardTile(this, tileData);
      this.tiles.set(tileData.id, tile);
    });
  }

  renderPlayers(players) {
    console.log('[BoardScene] Rendering', players.length, 'players');

    players.forEach(player => {
      const tile = this.tiles.get(player.position);
      if (!tile) {
        console.warn('[BoardScene] Player position tile not found:', player.position);
        return;
      }

      const sprite = new PlayerSprite(
        this,
        tile.x,
        tile.y,
        player.character
      );
      this.playerSprites.set(player.id, sprite);
    });
  }

  setupSocketListeners() {
    const nm = NetworkManager;

    nm.on(SOCKET_EVENTS.TURN_START, (data) => {
      console.log('[BoardScene] TURN_START:', data);
      this.handleTurnStart(data);
    });

    nm.on(SOCKET_EVENTS.DICE_RESULT, (data) => {
      console.log('[BoardScene] DICE_RESULT:', data);
      this.handleDiceResult(data);
    });

    nm.on(SOCKET_EVENTS.PLAYER_MOVE, (data) => {
      console.log('[BoardScene] PLAYER_MOVE:', data);
      this.handlePlayerMove(data);
    });

    nm.on(SOCKET_EVENTS.TILE_EFFECT, (data) => {
      console.log('[BoardScene] TILE_EFFECT:', data);
      this.handleTileEffect(data);
    });

    nm.on(SOCKET_EVENTS.JUNCTION_PROMPT, (data) => {
      console.log('[BoardScene] JUNCTION_PROMPT:', data);
      this.handleJunctionPrompt(data);
    });

    nm.on(SOCKET_EVENTS.STAR_PROMPT, (data) => {
      console.log('[BoardScene] STAR_PROMPT:', data);
      this.handleStarPrompt(data);
    });

    nm.on(SOCKET_EVENTS.MINIGAME_ANNOUNCE, (data) => {
      console.log('[BoardScene] MINIGAME_ANNOUNCE:', data);
      this.handleMinigameAnnounce(data);
    });

    nm.on(SOCKET_EVENTS.GAME_STATE, (data) => {
      console.log('[BoardScene] GAME_STATE update');
      this.gameState = data;
      this.updateUI(data);
    });

    nm.on(SOCKET_EVENTS.GAME_END, (data) => {
      console.log('[BoardScene] GAME_END:', data);
      this.handleGameEnd(data);
    });
  }

  handleTurnStart(data) {
    const { playerId, phase } = data;
    this.gameState.currentPlayer = playerId;
    this.gameState.phase = phase;

    this.updateUI(this.gameState);

    // Highlight current player
    this.playerSprites.forEach((sprite, pid) => {
      sprite.setHighlight(pid === playerId);
    });

    // Show "Your turn!" if local player
    const nm = NetworkManager;
    if (nm.playerId === playerId) {
      this.showPopup('당신의 차례!', 640, 360, 0x00ff00);

      // Enable dice button after brief delay
      this.time.delayedCall(1000, () => {
        this.showDiceButton();
      });
    }
  }

  handleDiceResult(data) {
    const { playerId, diceValue } = data;

    // Show dice animation
    this.diceHelper.show(diceValue, () => {
      console.log('[BoardScene] Dice animation complete, result:', diceValue);
    });
  }

  async handlePlayerMove(data) {
    const { playerId, path } = data;
    await this.animateMovement(playerId, path);
  }

  handleTileEffect(data) {
    const { playerId, effect, value } = data;
    const sprite = this.playerSprites.get(playerId);
    if (!sprite) return;

    let text = '';
    let color = 0xffffff;

    switch (effect) {
      case 'coins':
        text = value > 0 ? `+${value} 코인!` : `${value} 코인!`;
        color = value > 0 ? 0xffff00 : 0xff0000;
        break;
      case 'item':
        text = '아이템 획득!';
        color = 0x00ff00;
        break;
      default:
        text = effect;
    }

    this.showPopup(text, sprite.x, sprite.y - 50, color);
  }

  handleJunctionPrompt(data) {
    const { playerId, paths } = data;
    const nm = NetworkManager;

    if (nm.playerId !== playerId) return;

    // Show choice arrows on junction paths
    const sprite = this.playerSprites.get(playerId);
    if (!sprite) return;

    // Create choice UI
    const choiceContainer = this.add.container(sprite.x, sprite.y - 100);
    const bg = this.add.rectangle(0, 0, 300, 100, 0x000000, 0.8);
    const text = this.add.text(0, -30, '경로를 선택하세요:', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    choiceContainer.add([bg, text]);

    paths.forEach((pathIndex, idx) => {
      const btn = this.add.text(-100 + idx * 100, 20, `경로 ${pathIndex + 1}`, {
        fontSize: '16px',
        color: '#00ff00',
        backgroundColor: '#333333',
        padding: { x: 10, y: 5 }
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          nm.emit(SOCKET_EVENTS.JUNCTION_CHOICE, { pathIndex });
          choiceContainer.destroy();
        });

      choiceContainer.add(btn);
    });
  }

  handleStarPrompt(data) {
    const { playerId } = data;
    const nm = NetworkManager;

    if (nm.playerId !== playerId) return;

    // Show buy star dialog
    const centerX = 640;
    const centerY = 360;

    const dialog = this.add.container(centerX, centerY);
    const bg = this.add.rectangle(0, 0, 400, 200, 0x000000, 0.9);
    const text = this.add.text(0, -40, '스타를 20 코인에 구매하시겠습니까?', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const yesBtn = this.add.text(-80, 40, '예', {
      fontSize: '20px',
      color: '#00ff00',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        nm.emit(SOCKET_EVENTS.STAR_CHOICE, { buy: true });
        dialog.destroy();
      });

    const noBtn = this.add.text(80, 40, '아니오', {
      fontSize: '20px',
      color: '#ff0000',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        nm.emit(SOCKET_EVENTS.STAR_CHOICE, { buy: false });
        dialog.destroy();
      });

    dialog.add([bg, text, yesBtn, noBtn]);
  }

  handleMinigameAnnounce(data) {
    const { minigameId } = data;

    // Transition to MinigameTransitionScene
    this.scene.start('MinigameTransitionScene', {
      minigameId,
      gameState: this.gameState
    });
  }

  handleGameEnd(data) {
    // Transition to ResultScene
    this.scene.start('ResultScene', {
      results: data,
      gameState: this.gameState
    });
  }

  async animateMovement(playerId, path) {
    const sprite = this.playerSprites.get(playerId);
    if (!sprite) return;

    for (const tileId of path) {
      const tile = this.tiles.get(tileId);
      if (!tile) continue;

      await sprite.moveTo(tile.x, tile.y, CONFIG.movement.duration);
      await sprite.bounce();
    }
  }

  showPopup(text, x, y, color = 0xffffff) {
    const popup = this.add.text(x, y, text, {
      fontSize: '24px',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: y - 50,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => popup.destroy()
    });
  }

  showDiceButton() {
    const btn = this.add.text(640, 600, '주사위 굴리기', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#ff6b6b',
      padding: { x: 30, y: 15 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const nm = NetworkManager;
        nm.emit(SOCKET_EVENTS.ROLL_DICE);
        btn.destroy();
      });

    this.tweens.add({
      targets: btn,
      scale: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  updateUI(gameState) {
    this.hud.update(gameState);
    this.playerPanel.update(gameState.players, gameState.currentPlayer);
  }

  shutdown() {
    const nm = NetworkManager;
    nm.removeAllListeners();
  }
}
