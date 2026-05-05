import Phaser from 'phaser';
import NetworkManager from '../NetworkManager.js';
import { SOCKET_EVENTS, GAME_PHASES } from 'shared';

export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
  }

  async create() {
    this.isInRoom = false;
    this.isHost = false;

    this.add.text(640, 80, '포켓몬 파티 잼버리', {
      fontSize: '52px', fontFamily: 'Arial', color: '#ffdd00', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(640, 130, '온라인 멀티플레이 파티 게임', {
      fontSize: '20px', color: '#95a5a6'
    }).setOrigin(0.5);

    try {
      await NetworkManager.connect();
    } catch (error) {
      this.add.text(640, 360, '서버 연결 실패', { fontSize: '24px', color: '#ff0000' }).setOrigin(0.5);
      return;
    }

    // Create Room button
    this.createBtn = this.add.text(640, 300, '  방 만들기  ', {
      fontSize: '28px', color: '#ffffff', backgroundColor: '#3498db', padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.createBtn.on('pointerdown', () => this.handleCreateRoom());
    this.createBtn.on('pointerover', () => this.createBtn.setStyle({ backgroundColor: '#2980b9' }));
    this.createBtn.on('pointerout', () => this.createBtn.setStyle({ backgroundColor: '#3498db' }));

    // Join Room button
    this.joinBtn = this.add.text(640, 400, '  방 참가  ', {
      fontSize: '28px', color: '#ffffff', backgroundColor: '#27ae60', padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.joinBtn.on('pointerdown', () => this.handleJoinRoom());
    this.joinBtn.on('pointerover', () => this.joinBtn.setStyle({ backgroundColor: '#219a52' }));
    this.joinBtn.on('pointerout', () => this.joinBtn.setStyle({ backgroundColor: '#27ae60' }));

    // Waiting room elements (hidden)
    this.roomCodeText = this.add.text(640, 200, '', {
      fontSize: '40px', color: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5).setVisible(false);

    this.playerListText = this.add.text(640, 360, '', {
      fontSize: '22px', color: '#ffffff', align: 'center', lineSpacing: 8
    }).setOrigin(0.5).setVisible(false);

    this.startBtn = this.add.text(640, 550, '  게임 시작  ', {
      fontSize: '32px', color: '#ffffff', backgroundColor: '#e74c3c', padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.startBtn.on('pointerdown', () => {
      NetworkManager.emit(SOCKET_EVENTS.GAME_START, { roomId: NetworkManager.roomId });
    });
    this.startBtn.on('pointerover', () => this.startBtn.setStyle({ backgroundColor: '#c0392b' }));
    this.startBtn.on('pointerout', () => this.startBtn.setStyle({ backgroundColor: '#e74c3c' }));

    this.statusText = this.add.text(640, 480, '', {
      fontSize: '18px', color: '#95a5a6'
    }).setOrigin(0.5).setVisible(false);

    // Event listeners
    this._onRoomUpdate = (data) => this.handleRoomUpdate(data);
    this._onGameStart = (data) => this.handleGameStart(data);
    this._onError = (data) => this.handleError(data);

    NetworkManager.on(SOCKET_EVENTS.ROOM_UPDATE, this._onRoomUpdate);
    NetworkManager.on(SOCKET_EVENTS.GAME_START, this._onGameStart);
    NetworkManager.on(SOCKET_EVENTS.ROOM_ERROR, this._onError);
    NetworkManager.on(SOCKET_EVENTS.GAME_ERROR, this._onError);

    this.events.on('shutdown', this.shutdown, this);
  }

  async handleCreateRoom() {
    try {
      const data = await NetworkManager.createRoom();
      this.enterWaitingRoom(data.roomId, true);
    } catch (error) {
      alert('방 만들기 실패: ' + error.message);
    }
  }

  async handleJoinRoom() {
    const code = prompt('방 코드를 입력하세요:');
    if (!code) return;
    try {
      await NetworkManager.joinRoom(code.toUpperCase());
      this.enterWaitingRoom(code.toUpperCase(), false);
    } catch (error) {
      alert('방 참가 실패: ' + error.message);
    }
  }

  enterWaitingRoom(roomCode, isHost) {
    this.isInRoom = true;
    this.isHost = isHost;
    this.createBtn.setVisible(false);
    this.joinBtn.setVisible(false);
    this.roomCodeText.setText(`방 코드: ${roomCode}`).setVisible(true);
    this.playerListText.setVisible(true);
    this.statusText.setText('플레이어 대기 중...').setVisible(true);
    if (isHost) this.startBtn.setVisible(true);
  }

  handleRoomUpdate(data) {
    const room = data.room;
    if (!room) return;

    // If phase changed to CHARACTER_SELECT, go to CharSelectScene
    if (room.phase === GAME_PHASES.CHARACTER_SELECT) {
      this.scene.start('CharSelectScene');
      return;
    }

    if (!this.isInRoom) return;

    this.isHost = (room.host === NetworkManager.playerId);
    if (this.isHost && !this.startBtn.visible) this.startBtn.setVisible(true);

    let text = `플레이어 (${room.players.length}/4)\n\n`;
    room.players.forEach((p, i) => {
      const host = p.id === room.host ? ' [방장]' : '';
      const me = p.id === NetworkManager.playerId ? ' (나)' : '';
      text += `${i + 1}. ${p.name}${host}${me}\n`;
    });
    this.playerListText.setText(text);

    if (room.players.length >= 2) {
      this.statusText.setText('호스트가 게임을 시작할 수 있습니다');
    } else {
      this.statusText.setText('플레이어 대기 중...');
    }
  }

  handleGameStart(data) {
    // This fires when actual game starts (after character select)
    this.scene.start('BoardScene', { gameState: data });
  }

  handleError(data) {
    console.error('Error:', data.message);
    this.statusText.setText(data.message).setVisible(true);
  }

  shutdown() {
    NetworkManager.off(SOCKET_EVENTS.ROOM_UPDATE, this._onRoomUpdate);
    NetworkManager.off(SOCKET_EVENTS.GAME_START, this._onGameStart);
    NetworkManager.off(SOCKET_EVENTS.ROOM_ERROR, this._onError);
    NetworkManager.off(SOCKET_EVENTS.GAME_ERROR, this._onError);
  }
}
