import Phaser from 'phaser';
import NetworkManager from '../NetworkManager.js';
import { SOCKET_EVENTS, CHARACTERS } from 'shared';

export default class CharSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharSelectScene' });
  }

  create() {
    this.selectedCharacter = null;
    this.takenCharacters = new Map(); // playerId -> characterId
    this.characterButtons = {};

    this.add.text(640, 60, '포켓몬을 선택하세요', {
      fontSize: '40px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.infoText = this.add.text(640, 110, '캐릭터를 클릭하여 선택하세요', {
      fontSize: '20px', color: '#95a5a6'
    }).setOrigin(0.5);

    // Character grid (2x3)
    const chars = Object.values(CHARACTERS);
    const startX = 320;
    const startY = 240;
    const spacingX = 320;
    const spacingY = 200;

    chars.forEach((char, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      // Background circle
      const bg = this.add.circle(x, y, 45, 0x333333);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.selectChar(char.id));
      bg.on('pointerover', () => { if (!this.isCharTaken(char.id)) bg.setFillStyle(0x555555); });
      bg.on('pointerout', () => { if (!this.isCharTaken(char.id)) bg.setFillStyle(this.selectedCharacter === char.id ? 0x886600 : 0x333333); });

      // Character image
      const sprite = this.add.image(x, y, char.id).setScale(2);

      // Name
      const name = this.add.text(x, y + 60, char.name, {
        fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);

      // Selection ring (hidden)
      const ring = this.add.circle(x, y, 48, 0x000000, 0).setStrokeStyle(4, 0xffff00).setVisible(false);

      // Taken overlay (hidden)
      const overlay = this.add.circle(x, y, 45, 0x000000, 0.6).setVisible(false);
      const takenLabel = this.add.text(x, y, '선택 불가', {
        fontSize: '14px', color: '#ff4444', fontStyle: 'bold'
      }).setOrigin(0.5).setVisible(false);

      this.characterButtons[char.id] = { bg, sprite, name, ring, overlay, takenLabel, x, y };
    });

    // Start button (hidden until ALL_READY)
    this.startBtn = this.add.text(640, 620, '  게임 시작  ', {
      fontSize: '32px', color: '#ffffff', backgroundColor: '#e74c3c', padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.startBtn.on('pointerdown', () => {
      NetworkManager.emit(SOCKET_EVENTS.GAME_START, { roomId: NetworkManager.roomId });
    });

    // Event listeners
    this._onCharUpdate = (data) => this.handleCharUpdate(data);
    this._onAllReady = () => this.handleAllReady();
    this._onGameStart = (data) => this.handleGameStart(data);
    this._onRoomUpdate = (data) => this.handleRoomUpdate(data);

    NetworkManager.on(SOCKET_EVENTS.CHARACTER_UPDATE, this._onCharUpdate);
    NetworkManager.on(SOCKET_EVENTS.ALL_READY, this._onAllReady);
    NetworkManager.on(SOCKET_EVENTS.GAME_START, this._onGameStart);
    NetworkManager.on(SOCKET_EVENTS.ROOM_UPDATE, this._onRoomUpdate);

    this.events.on('shutdown', this.shutdown, this);
  }

  isCharTaken(charId) {
    for (const [pid, cid] of this.takenCharacters) {
      if (cid === charId && pid !== NetworkManager.playerId) return true;
    }
    return false;
  }

  selectChar(charId) {
    if (this.isCharTaken(charId)) return;

    // Clear old selection
    if (this.selectedCharacter && this.characterButtons[this.selectedCharacter]) {
      this.characterButtons[this.selectedCharacter].ring.setVisible(false);
      this.characterButtons[this.selectedCharacter].bg.setFillStyle(0x333333);
    }

    this.selectedCharacter = charId;
    this.characterButtons[charId].ring.setVisible(true);
    this.characterButtons[charId].bg.setFillStyle(0x886600);

    const charName = Object.values(CHARACTERS).find(c => c.id === charId)?.name || charId;
    this.infoText.setText(`선택: ${charName}`);

    // Emit to server
    NetworkManager.emit(SOCKET_EVENTS.SELECT_CHARACTER, {
      roomId: NetworkManager.roomId,
      characterId: charId
    });
  }

  handleCharUpdate(data) {
    // data: { playerId, characterId }
    this.takenCharacters.set(data.playerId, data.characterId);

    // Update visual for taken characters
    Object.entries(this.characterButtons).forEach(([charId, btn]) => {
      const taken = this.isCharTaken(charId);
      btn.overlay.setVisible(taken);
      btn.takenLabel.setVisible(taken);
      if (taken) {
        btn.bg.disableInteractive();
      }
    });
  }

  handleRoomUpdate(data) {
    // Sync character selections from room state
    const room = data.room;
    if (!room) return;

    room.players.forEach(p => {
      if (p.characterId) {
        this.takenCharacters.set(p.id, p.characterId);
      }
    });

    // Update visuals
    Object.entries(this.characterButtons).forEach(([charId, btn]) => {
      const taken = this.isCharTaken(charId);
      btn.overlay.setVisible(taken);
      btn.takenLabel.setVisible(taken);
    });

    // Check all ready directly from room state
    const allSelected = room.players.length >= 2 &&
      room.players.every(p => p.characterId !== null && p.ready);
    if (allSelected && !this.startBtn.visible) {
      this.handleAllReady();
    }
  }

  handleAllReady() {
    this.infoText.setText('모두 준비 완료! 호스트가 게임을 시작합니다');
    this.startBtn.setVisible(true);
  }

  handleGameStart(data) {
    this.scene.start('BoardScene', { gameState: data });
  }

  shutdown() {
    NetworkManager.off(SOCKET_EVENTS.CHARACTER_UPDATE, this._onCharUpdate);
    NetworkManager.off(SOCKET_EVENTS.ALL_READY, this._onAllReady);
    NetworkManager.off(SOCKET_EVENTS.GAME_START, this._onGameStart);
    NetworkManager.off(SOCKET_EVENTS.ROOM_UPDATE, this._onRoomUpdate);
  }
}
