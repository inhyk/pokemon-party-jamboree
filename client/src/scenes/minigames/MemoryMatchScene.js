import NetworkManager from '../../NetworkManager.js';
import { SOCKET_EVENTS } from 'shared';

export default class MemoryMatchScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MemoryMatchScene' });
    this.cards = [];
    this.pairCounts = new Map();
  }

  create() {
    // Background
    this.cameras.main.setBackgroundColor('#16213e');

    // Title
    this.add.text(this.cameras.main.centerX, 30, '메모리 매치', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Current turn display
    this.turnText = this.add.text(
      this.cameras.main.centerX,
      80,
      '대기 중...',
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffcc00'
      }
    ).setOrigin(0.5);

    // Pair counts display
    this.pairTexts = new Map();

    // Create 4x4 grid of cards
    const cardSize = 80;
    const gap = 10;
    const gridWidth = 4 * cardSize + 3 * gap;
    const gridHeight = 4 * cardSize + 3 * gap;
    const startX = this.cameras.main.centerX - gridWidth / 2 + cardSize / 2;
    const startY = this.cameras.main.centerY - gridHeight / 2 + cardSize / 2 + 50;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cardIndex = row * 4 + col;
        const x = startX + col * (cardSize + gap);
        const y = startY + row * (cardSize + gap);

        // Card back (blue square)
        const cardBack = this.add.rectangle(x, y, cardSize, cardSize, 0x3366cc);
        cardBack.setStrokeStyle(2, 0xffffff);

        // Card front (hidden initially)
        const cardFront = this.add.rectangle(x, y, cardSize, cardSize, 0x33cc66);
        cardFront.setStrokeStyle(2, 0xffffff);
        cardFront.setVisible(false);

        // Card value text (hidden initially)
        const cardText = this.add.text(x, y, '', {
          fontSize: '32px',
          fontFamily: 'Arial',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        cardText.setVisible(false);

        // Make card interactive
        cardBack.setInteractive({ useHandCursor: true });
        cardBack.on('pointerdown', () => {
          NetworkManager.emit(SOCKET_EVENTS.MINIGAME_INPUT, { cardIndex });
        });

        this.cards.push({
          index: cardIndex,
          back: cardBack,
          front: cardFront,
          text: cardText
        });
      }
    }

    // Listen for updates
    NetworkManager.on(SOCKET_EVENTS.MINIGAME_UPDATE, this.handleMinigameUpdate.bind(this));
    NetworkManager.on(SOCKET_EVENTS.MINIGAME_END, this.handleMinigameEnd.bind(this));

    this.events.on('shutdown', this.shutdown, this);
  }

  handleMinigameUpdate(data) {
    const { currentTurn, cards, playerPairs } = data;

    // Update turn display
    if (currentTurn) {
      this.turnText.setText(`플레이어 ${currentTurn.playerNumber} 차례`);
      this.turnText.setColor(currentTurn.color);
    }

    // Update cards
    if (cards) {
      cards.forEach((cardData, index) => {
        const card = this.cards[index];
        if (!card) return;

        if (cardData.revealed || cardData.matched) {
          // Show card front
          card.back.setVisible(false);
          card.front.setVisible(true);
          card.text.setVisible(true);
          card.text.setText(cardData.value || '?');

          // Matched cards get green tint
          if (cardData.matched) {
            card.front.setFillStyle(0x33cc66);
            card.back.disableInteractive();
          } else {
            card.front.setFillStyle(0x6699ff);
          }
        } else {
          // Show card back
          card.back.setVisible(true);
          card.front.setVisible(false);
          card.text.setVisible(false);
        }
      });
    }

    // Update pair counts
    if (playerPairs) {
      playerPairs.forEach((count, playerId) => {
        let pairText = this.pairTexts.get(playerId);

        if (!pairText) {
          const playerInfo = data.players?.find(p => p.id === playerId);
          pairText = this.add.text(
            100 + this.pairTexts.size * 150,
            130,
            `P${playerInfo?.playerNumber || '?'}: 짝 ${count}개`,
            {
              fontSize: '18px',
              fontFamily: 'Arial',
              color: playerInfo?.color || '#ffffff'
            }
          );
          this.pairTexts.set(playerId, pairText);
        } else {
          const playerInfo = data.players?.find(p => p.id === playerId);
          pairText.setText(`P${playerInfo?.playerNumber || '?'}: 짝 ${count}개`);
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
      '메모리 매치 결과',
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
        `${index + 1}위. 플레이어 ${result.playerNumber}: 짝 ${result.pairs}개 (+${result.reward} 코인)`,
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

    this.cards = [];
    this.pairCounts.clear();
    this.pairTexts.clear();
  }

  shutdown() {
    this.cleanup();
  }
}
