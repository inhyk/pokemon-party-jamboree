import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import RoomManager from './RoomManager.js';
import { SOCKET_EVENTS, ITEMS } from 'shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Socket.IO setup with CORS for development
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Initialize room manager
const roomManager = new RoomManager(io);

// Socket.IO connection handling
io.on(SOCKET_EVENTS.CONNECT, (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Room events
  socket.on(SOCKET_EVENTS.CREATE_ROOM, () => {
    roomManager.createRoom(socket);
  });

  socket.on(SOCKET_EVENTS.JOIN_ROOM, (roomId) => {
    roomManager.joinRoom(socket, roomId);
  });

  socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
    roomManager.leaveRoom(socket);
  });

  socket.on(SOCKET_EVENTS.SELECT_CHARACTER, ({ roomId, characterId }) => {
    roomManager.selectCharacter(socket, roomId, characterId);
  });

  socket.on(SOCKET_EVENTS.GAME_START, ({ roomId }) => {
    roomManager.startGame(roomId);
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    console.log(`Client disconnected: ${socket.id}`);
    roomManager.leaveRoom(socket);
  });

  // Dice roll
  socket.on(SOCKET_EVENTS.REQUEST_DICE, () => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (room?.gameManager) {
      room.gameManager.turnManager.rollDice(socket.id);
    }
  });

  // Junction choice
  socket.on(SOCKET_EVENTS.JUNCTION_CHOICE, ({ tileId }) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (room?.gameManager) {
      room.gameManager.turnManager.handleJunctionChoice(socket.id, tileId);
    }
  });

  // Star purchase response
  socket.on(SOCKET_EVENTS.STAR_RESPONSE, ({ purchase }) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (room?.gameManager) {
      room.gameManager.turnManager.handleStarResponse(socket.id, purchase);
    }
  });

  // Item use
  socket.on(SOCKET_EVENTS.USE_ITEM, ({ itemId, targetData }) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (room?.gameManager) {
      try {
        const player = room.gameManager.players.get(socket.id);
        if (player && room.gameManager.itemSystem) {
          room.gameManager.itemSystem.useItem(player, itemId, targetData);
          room.gameManager.broadcastState();
        }
      } catch (e) {
        socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: e.message });
      }
    }
  });

  // Shop buy
  socket.on(SOCKET_EVENTS.SHOP_BUY, ({ itemId }) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (room?.gameManager) {
      const player = room.gameManager.players.get(socket.id);
      if (player) {
        const item = Object.values(ITEMS).find(i => i.id === itemId);
        if (item && player.coins >= item.cost) {
          player.coins -= item.cost;
          player.items.push(item);
          socket.emit(SOCKET_EVENTS.SHOP_RESULT, { success: true, item, coins: player.coins });
          room.gameManager.broadcastState();
        } else {
          socket.emit(SOCKET_EVENTS.SHOP_RESULT, { success: false, message: 'Not enough coins' });
        }
      }
    }
  });

  // Minigame input
  socket.on(SOCKET_EVENTS.MINIGAME_INPUT, (data) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (room?.gameManager?.miniGameManager?.currentGame) {
      room.gameManager.miniGameManager.handleInput(socket.id, data);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
