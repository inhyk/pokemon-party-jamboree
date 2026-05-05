import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import LobbyScene from './scenes/LobbyScene.js';
import CharSelectScene from './scenes/CharSelectScene.js';
import BoardScene from './scenes/BoardScene.js';
import DiceScene from './scenes/DiceScene.js';
import ShopScene from './scenes/ShopScene.js';
import MinigameTransitionScene from './scenes/MinigameTransitionScene.js';
import ResultScene from './scenes/ResultScene.js';
import CoinDashScene from './scenes/minigames/CoinDashScene.js';
import BumperBattleScene from './scenes/minigames/BumperBattleScene.js';
import MemoryMatchScene from './scenes/minigames/MemoryMatchScene.js';
import PlatformRaceScene from './scenes/minigames/PlatformRaceScene.js';
import VolleyBounceScene from './scenes/minigames/VolleyBounceScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#1a1a2e',
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    LobbyScene,
    CharSelectScene,
    BoardScene,
    DiceScene,
    ShopScene,
    MinigameTransitionScene,
    ResultScene,
    CoinDashScene,
    BumperBattleScene,
    MemoryMatchScene,
    PlatformRaceScene,
    VolleyBounceScene
  ]
};

const game = new Phaser.Game(config);
