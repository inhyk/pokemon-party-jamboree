import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from 'shared';

class NetworkManager {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.playerId = null;
  }

  connect() {
    if (this.socket && this.socket.connected) {
      return Promise.resolve();
    }

    const serverUrl = import.meta.env.PROD
      ? window.location.origin
      : 'http://localhost:3000';

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        this.playerId = this.socket.id;
        console.log('Connected to server:', this.playerId);
        resolve();
      });
      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });
    });
  }

  createRoom() {
    return new Promise((resolve, reject) => {
      const onUpdate = (data) => {
        this.roomId = data.roomId;
        this.off(SOCKET_EVENTS.ROOM_UPDATE, onUpdate);
        this.off(SOCKET_EVENTS.ROOM_ERROR, onError);
        resolve(data);
      };
      const onError = (data) => {
        this.off(SOCKET_EVENTS.ROOM_UPDATE, onUpdate);
        this.off(SOCKET_EVENTS.ROOM_ERROR, onError);
        reject(new Error(data.message));
      };
      this.on(SOCKET_EVENTS.ROOM_UPDATE, onUpdate);
      this.on(SOCKET_EVENTS.ROOM_ERROR, onError);
      this.emit(SOCKET_EVENTS.CREATE_ROOM);
    });
  }

  joinRoom(roomId) {
    return new Promise((resolve, reject) => {
      const onUpdate = (data) => {
        this.roomId = data.roomId;
        this.off(SOCKET_EVENTS.ROOM_UPDATE, onUpdate);
        this.off(SOCKET_EVENTS.ROOM_ERROR, onError);
        resolve(data);
      };
      const onError = (data) => {
        this.off(SOCKET_EVENTS.ROOM_UPDATE, onUpdate);
        this.off(SOCKET_EVENTS.ROOM_ERROR, onError);
        reject(new Error(data.message));
      };
      this.on(SOCKET_EVENTS.ROOM_UPDATE, onUpdate);
      this.on(SOCKET_EVENTS.ROOM_ERROR, onError);
      this.emit(SOCKET_EVENTS.JOIN_ROOM, roomId);
    });
  }

  on(event, callback) {
    if (this.socket) this.socket.on(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) this.socket.off(event, callback);
      else this.socket.removeAllListeners(event);
    }
  }

  emit(event, data) {
    if (this.socket) this.socket.emit(event, data);
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }
}

export default new NetworkManager();
