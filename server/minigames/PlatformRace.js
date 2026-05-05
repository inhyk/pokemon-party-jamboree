import { BaseMinigame } from './BaseMinigame.js';
import { SOCKET_EVENTS } from 'shared';

/**
 * PlatformRace - FFA vertical racing minigame
 */
export class PlatformRace extends BaseMinigame {
  constructor(io, room, players) {
    super(io, room, players);
    this.type = 'platform-race';
    this.duration = 45000;

    this.playerPositions = new Map();
    this.playerVelocities = new Map();
    this.playerOnGround = new Map();
    this.platforms = [];
    this.finishLine = 0;
    this.startY = 550;
    this.gravity = 0.5;
    this.jumpForce = -12;
    this.moveSpeed = 4;
    this.platformWidth = 100;
    this.playerWidth = 30;
    this.playerHeight = 40;
    this.bounds = { width: 800, height: 600 };
  }

  getRules() {
    return 'Race to the top! Jump on platforms to climb higher. First to reach the finish line wins!';
  }

  async onStart() {
    // Generate platforms from bottom to top
    this.platforms = [];
    let currentY = this.startY - 80;

    for (let i = 0; i < 30; i++) {
      this.platforms.push({
        x: Math.random() * (this.bounds.width - this.platformWidth),
        y: currentY,
        width: this.platformWidth
      });
      currentY -= Math.random() * 40 + 30; // Random spacing between platforms
    }

    this.finishLine = currentY - 50;

    // Initialize player positions at bottom
    const spacing = this.bounds.width / (this.players.length + 1);
    this.players.forEach((player, index) => {
      this.playerPositions.set(player.id, {
        x: spacing * (index + 1),
        y: this.startY
      });
      this.playerVelocities.set(player.id, { vx: 0, vy: 0 });
      this.playerOnGround.set(player.id, false);
    });

    // Start tick interval
    this.tickInterval = setInterval(() => this.tick(), 50);

    // Broadcast initial state
    this.broadcastState();
  }

  onInput(playerId, data) {
    const position = this.playerPositions.get(playerId);
    const velocity = this.playerVelocities.get(playerId);
    const onGround = this.playerOnGround.get(playerId);

    if (!position || !velocity) return;

    const { action } = data;

    switch (action) {
      case 'left':
        position.x = Math.max(0, position.x - this.moveSpeed);
        break;
      case 'right':
        position.x = Math.min(this.bounds.width - this.playerWidth, position.x + this.moveSpeed);
        break;
      case 'jump':
        if (onGround) {
          velocity.vy = this.jumpForce;
          this.playerOnGround.set(playerId, false);
        }
        break;
    }
  }

  onTick() {
    this.players.forEach(player => {
      const position = this.playerPositions.get(player.id);
      const velocity = this.playerVelocities.get(player.id);

      if (!position || !velocity) return;

      // Apply gravity
      velocity.vy += this.gravity;

      // Update position
      position.y += velocity.vy;

      // Check platform collisions
      let onPlatform = false;

      if (velocity.vy > 0) { // Only check when falling
        for (const platform of this.platforms) {
          const playerBottom = position.y + this.playerHeight;
          const playerLeft = position.x;
          const playerRight = position.x + this.playerWidth;
          const platformTop = platform.y;
          const platformBottom = platform.y + 10;
          const platformLeft = platform.x;
          const platformRight = platform.x + platform.width;

          // Check if player is landing on platform
          if (
            playerBottom >= platformTop &&
            playerBottom <= platformBottom &&
            playerRight > platformLeft &&
            playerLeft < platformRight
          ) {
            // Land on platform
            position.y = platform.y - this.playerHeight;
            velocity.vy = 0;
            onPlatform = true;
            break;
          }
        }
      }

      // Check ground collision
      if (position.y + this.playerHeight >= this.startY) {
        position.y = this.startY - this.playerHeight;
        velocity.vy = 0;
        onPlatform = true;
      }

      this.playerOnGround.set(player.id, onPlatform);

      // Check finish line
      if (position.y <= this.finishLine) {
        const score = 1000 - Math.floor(position.y);
        this.scores.set(player.id, score);

        this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
          event: 'player-finished',
          playerId: player.id,
          playerName: player.name
        });

        // End game when first player finishes
        this.end();
        return;
      }

      // Update score based on height (higher = better)
      const score = 1000 - Math.floor(position.y);
      this.scores.set(player.id, Math.max(0, score));
    });

    // Broadcast state
    this.broadcastState();
  }

  broadcastState() {
    const positions = {};
    const velocities = {};
    const scores = {};

    this.playerPositions.forEach((pos, playerId) => {
      positions[playerId] = pos;
    });
    this.playerVelocities.forEach((vel, playerId) => {
      velocities[playerId] = vel;
    });
    this.scores.forEach((score, playerId) => {
      scores[playerId] = score;
    });

    this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
      type: 'state',
      positions,
      velocities,
      scores,
      platforms: this.platforms,
      finishLine: this.finishLine
    });
  }

  onEnd() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.broadcast(SOCKET_EVENTS.MINIGAME_END, {
      type: this.type,
      results: this.getResults()
    });
  }
}
