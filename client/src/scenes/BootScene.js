import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.createPlaceholderGraphics();
  }

  createPlaceholderGraphics() {
    // Tile textures (64x64)
    const tileSize = 64;
    const tileColors = {
      tile_blue: 0x4a90e2,
      tile_red: 0xe74c3c,
      tile_event: 0x9b59b6,
      tile_item: 0xf39c12,
      tile_shop: 0x27ae60,
      tile_star: 0xf1c40f,
      tile_bowser: 0x34495e,
      tile_start: 0x1abc9c,
      tile_junction: 0x95a5a6
    };

    for (const [key, color] of Object.entries(tileColors)) {
      const graphics = this.add.graphics();
      graphics.fillStyle(color, 1);
      graphics.fillRect(0, 0, tileSize, tileSize);
      graphics.lineStyle(2, 0x000000, 1);
      graphics.strokeRect(0, 0, tileSize, tileSize);
      graphics.generateTexture(key, tileSize, tileSize);
      graphics.destroy();
    }

    // Character textures (32x32 circles)
    const charSize = 32;
    const characters = {
      pikachu: 0xffff00,
      bulbasaur: 0x78c850,
      charmander: 0xff6f00,
      squirtle: 0x6890f0,
      snorlax: 0x3b4a5a,
      mew: 0xff80ff
    };

    for (const [key, color] of Object.entries(characters)) {
      const graphics = this.add.graphics();
      graphics.fillStyle(color, 1);
      graphics.fillCircle(charSize / 2, charSize / 2, charSize / 2 - 2);
      graphics.lineStyle(2, 0x000000, 1);
      graphics.strokeCircle(charSize / 2, charSize / 2, charSize / 2 - 2);
      graphics.generateTexture(key, charSize, charSize);
      graphics.destroy();
    }

    // Dice texture (48x48)
    const diceSize = 48;
    const diceGraphics = this.add.graphics();
    diceGraphics.fillStyle(0xffffff, 1);
    diceGraphics.fillRoundedRect(0, 0, diceSize, diceSize, 4);
    diceGraphics.lineStyle(2, 0x000000, 1);
    diceGraphics.strokeRoundedRect(0, 0, diceSize, diceSize, 4);
    diceGraphics.generateTexture('dice', diceSize, diceSize);
    diceGraphics.destroy();

    // Coin texture (16x16)
    const coinSize = 16;
    const coinGraphics = this.add.graphics();
    coinGraphics.fillStyle(0xffd700, 1);
    coinGraphics.fillCircle(coinSize / 2, coinSize / 2, coinSize / 2 - 1);
    coinGraphics.lineStyle(2, 0xffa500, 1);
    coinGraphics.strokeCircle(coinSize / 2, coinSize / 2, coinSize / 2 - 1);
    coinGraphics.generateTexture('coin', coinSize, coinSize);
    coinGraphics.destroy();

    // Button texture (200x50)
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonGraphics = this.add.graphics();
    buttonGraphics.fillStyle(0x3498db, 1);
    buttonGraphics.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 10);
    buttonGraphics.lineStyle(2, 0x2980b9, 1);
    buttonGraphics.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 10);
    buttonGraphics.generateTexture('button', buttonWidth, buttonHeight);
    buttonGraphics.destroy();
  }

  create() {
    this.scene.start('LobbyScene');
  }
}
