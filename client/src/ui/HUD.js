export default class HUD {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(900);

    // Background bar
    this.bg = scene.add.rectangle(640, 25, 1280, 50, 0x000000, 0.8)
      .setOrigin(0.5);

    // Text elements
    this.turnText = scene.add.text(50, 25, '턴: 1/10', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.currentPlayerText = scene.add.text(640, 25, 'Current Player: -', {
      fontSize: '20px',
      color: '#ffff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.phaseText = scene.add.text(1230, 25, '단계: -', {
      fontSize: '18px',
      color: '#cccccc'
    }).setOrigin(1, 0.5);

    this.container.add([this.bg, this.turnText, this.currentPlayerText, this.phaseText]);
  }

  update(gameState) {
    const { turn, currentPlayer, phase, players } = gameState;

    // Update turn counter
    this.turnText.setText(`턴: ${turn}/10`);

    // Find current player name
    const player = players.find(p => p.id === currentPlayer);
    const playerName = player ? player.name : '-';
    this.currentPlayerText.setText(`Current Player: ${playerName}`);

    // Update phase
    const phaseDisplay = this.getPhaseDisplay(phase);
    this.phaseText.setText(`단계: ${phaseDisplay}`);
  }

  getPhaseDisplay(phase) {
    const phaseNames = {
      DICE: 'Dice Roll',
      MOVE: 'Moving',
      EVENT: 'Event',
      MINIGAME: 'Minigame'
    };

    return phaseNames[phase] || phase || '-';
  }

  destroy() {
    this.container.destroy();
  }
}
