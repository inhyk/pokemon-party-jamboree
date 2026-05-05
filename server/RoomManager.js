import { GAME, GAME_PHASES, SOCKET_EVENTS } from 'shared';
import GameManager from './GameManager.js';

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
  }

  /**
   * Generate a random 4-character room code
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure unique
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  /**
   * Create a new room with the connecting socket as host
   */
  createRoom(socket) {
    const roomId = this.generateRoomCode();
    const player = {
      id: socket.id,
      name: 'Player 1',
      characterId: null,
      ready: false,
    };

    const room = {
      id: roomId,
      players: [player],
      host: socket.id,
      phase: GAME_PHASES.LOBBY,
      gameManager: null,
    };

    this.rooms.set(roomId, room);
    socket.join(roomId);

    console.log(`Room created: ${roomId} by ${socket.id}`);

    socket.emit(SOCKET_EVENTS.ROOM_UPDATE, {
      roomId,
      room: this.getRoomData(room),
    });
  }

  /**
   * Join an existing room
   */
  joinRoom(socket, roomId) {
    const room = this.rooms.get(roomId);

    // Validation
    if (!room) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: '방을 찾을 수 없습니다' });
      return;
    }

    if (room.phase !== GAME_PHASES.LOBBY) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: '이미 게임이 진행 중입니다' });
      return;
    }

    if (room.players.length >= GAME.MAX_PLAYERS) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: '방이 가득 찼습니다' });
      return;
    }

    // Check if player already in room
    if (room.players.some(p => p.id === socket.id)) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: '이미 이 방에 있습니다' });
      return;
    }

    // Add player
    const playerNumber = room.players.length + 1;
    const player = {
      id: socket.id,
      name: `Player ${playerNumber}`,
      characterId: null,
      ready: false,
    };

    room.players.push(player);
    socket.join(roomId);

    console.log(`Player ${socket.id} joined room ${roomId}`);

    // Notify all players in room
    this.io.to(roomId).emit(SOCKET_EVENTS.ROOM_UPDATE, {
      roomId,
      room: this.getRoomData(room),
    });
  }

  /**
   * Leave the current room
   */
  leaveRoom(socket) {
    let roomToDelete = null;

    for (const [roomId, room] of this.rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        // Remove player
        room.players.splice(playerIndex, 1);
        socket.leave(roomId);

        console.log(`Player ${socket.id} left room ${roomId}`);

        // If room is empty, delete it
        if (room.players.length === 0) {
          roomToDelete = roomId;
        } else {
          // If host left, assign new host
          if (room.host === socket.id) {
            room.host = room.players[0].id;
            console.log(`New host for room ${roomId}: ${room.host}`);
          }

          // Update remaining players
          this.io.to(roomId).emit(SOCKET_EVENTS.ROOM_UPDATE, {
            roomId,
            room: this.getRoomData(room),
          });
        }
        break;
      }
    }

    if (roomToDelete) {
      this.rooms.delete(roomToDelete);
      console.log(`Room ${roomToDelete} deleted (empty)`);
    }
  }

  /**
   * Select a character for a player
   */
  selectCharacter(socket, roomId, characterId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: '방을 찾을 수 없습니다' });
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: '방에 없는 플레이어입니다' });
      return;
    }

    // Check if character already taken
    if (room.players.some(p => p.id !== socket.id && p.characterId === characterId)) {
      socket.emit(SOCKET_EVENTS.ROOM_ERROR, { message: '이미 선택된 캐릭터입니다' });
      return;
    }

    // Set character and ready status
    player.characterId = characterId;
    player.ready = true;

    console.log(`Player ${socket.id} selected character ${characterId}`);

    // Notify room
    this.io.to(roomId).emit(SOCKET_EVENTS.CHARACTER_UPDATE, {
      playerId: socket.id,
      characterId,
    });

    // Check if all players have selected characters
    const allReady = room.players.length >= GAME.MIN_PLAYERS &&
                     room.players.every(p => p.characterId !== null && p.ready);

    console.log(`All ready check: ${allReady} (players: ${room.players.length}, all have char: ${room.players.every(p => p.characterId !== null)}, all ready: ${room.players.every(p => p.ready)})`);

    if (allReady) {
      console.log(`ALL_READY emitted for room ${roomId}`);
      this.io.to(roomId).emit(SOCKET_EVENTS.ALL_READY);
    }

    // Send room update
    this.io.to(roomId).emit(SOCKET_EVENTS.ROOM_UPDATE, {
      roomId,
      room: this.getRoomData(room),
    });
  }

  /**
   * Start the game for a room (2-phase)
   */
  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.players.length < GAME.MIN_PLAYERS) {
      this.io.to(roomId).emit(SOCKET_EVENTS.GAME_ERROR, {
        message: '시작하려면 플레이어가 더 필요합니다',
      });
      return;
    }

    // Phase 1: LOBBY -> CHARACTER_SELECT
    if (room.phase === GAME_PHASES.LOBBY) {
      room.phase = GAME_PHASES.CHARACTER_SELECT;
      console.log(`Room ${roomId} moved to CHARACTER_SELECT`);
      this.io.to(roomId).emit(SOCKET_EVENTS.ROOM_UPDATE, {
        roomId,
        room: this.getRoomData(room),
      });
      return;
    }

    // Phase 2: CHARACTER_SELECT -> BOARD_GAME (requires all ready)
    if (room.phase === GAME_PHASES.CHARACTER_SELECT) {
      if (!room.players.every(p => p.characterId !== null && p.ready)) {
        this.io.to(roomId).emit(SOCKET_EVENTS.GAME_ERROR, {
          message: '모든 플레이어가 준비되지 않았습니다',
        });
        return;
      }

      // Create and initialize GameManager
      const gameManager = new GameManager(this.io, room);
      room.gameManager = gameManager;
      room.phase = GAME_PHASES.BOARD_GAME;
      console.log(`Game started in room ${roomId}`);
      gameManager.initGame();
      return;
    }
  }

  /**
   * Get room by ID
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Get room by player socket ID
   */
  getRoomByPlayer(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.some(p => p.id === socketId)) {
        return room;
      }
    }
    return null;
  }

  /**
   * Get sanitized room data for client
   */
  getRoomData(room) {
    return {
      id: room.id,
      players: room.players,
      host: room.host,
      phase: room.phase,
    };
  }
}

export default RoomManager;
