import { MINIGAME_TYPES } from 'shared';

export default class MinigameTransitionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MinigameTransitionScene' });
  }

  create(data) {
    const { type, rules } = data;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Minigame name
    const nameText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 150,
      this.getMinigameName(type),
      {
        fontSize: '64px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5);

    // Rules text
    const rulesText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      rules || '',
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#cccccc',
        align: 'center',
        wordWrap: { width: 600 }
      }
    ).setOrigin(0.5);

    // Countdown text
    const countdownText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      '3',
      {
        fontSize: '128px',
        fontFamily: 'Arial',
        color: '#ffcc00',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Countdown sequence
    let count = 3;
    const countdownTimer = this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        if (count > 1) {
          count--;
          countdownText.setText(count.toString());
        } else if (count === 1) {
          countdownText.setText('시작!');
          countdownText.setColor('#00ff00');
          count--;
        } else {
          // Transition to minigame scene
          this.transitionToMinigame(type);
        }
      }
    });
  }

  getMinigameName(type) {
    const names = {
      [MINIGAME_TYPES.COIN_DASH]: '코인 대시',
      [MINIGAME_TYPES.BUMPER_BATTLE]: '범퍼 배틀',
      [MINIGAME_TYPES.MEMORY_MATCH]: '메모리 매치',
      [MINIGAME_TYPES.PLATFORM_RACE]: '플랫폼 레이스',
      [MINIGAME_TYPES.VOLLEY_BOUNCE]: '발리 바운스'
    };
    return names[type] || '미니게임';
  }

  transitionToMinigame(type) {
    const sceneMap = {
      [MINIGAME_TYPES.COIN_DASH]: 'CoinDashScene',
      [MINIGAME_TYPES.BUMPER_BATTLE]: 'BumperBattleScene',
      [MINIGAME_TYPES.MEMORY_MATCH]: 'MemoryMatchScene',
      [MINIGAME_TYPES.PLATFORM_RACE]: 'PlatformRaceScene',
      [MINIGAME_TYPES.VOLLEY_BOUNCE]: 'VolleyBounceScene'
    };

    const sceneName = sceneMap[type] || 'BoardScene';
    this.scene.start(sceneName);
  }
}
