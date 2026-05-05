import { BaseMinigame } from './BaseMinigame.js';
import { SOCKET_EVENTS } from 'shared';

/**
 * BumperBattle - FFA bumper push minigame
 */
export class BumperBattle extends BaseMinigame {
  constructor(io, room, players) {
    super(io, room, players);
    this.type = 'bumper-battle';
    this.duration = 30000;

    this.playerPositions = new Map();
    this.playerVelocities = new Map();
    this.playerLives = new Map();
    this.platformRadius = 250;
    this.platformCenter = { x: 400, y: 300 };
    this.moveForce = 0.8;
    this.friction = 0.95;
    this.bumpForce = 15;
    this.playerRadius = 20;
    this.startTime = Date.now();
  }

  getRules() {
    return 'Bump opponents off the platform! You have 3 lives. Last one standing wins!';
  }

  async onStart() {
    // Place players at cardinal points around platform
    const angleStep = (2 * Math.PI) / this.players.length;
    const spawnRadius = this.platformRadius * 0.6;

    this.players.forEach((player, index) => {
      const angle = angleStep * index;
      this.playerPositions.set(player.id, {
        x: this.platformCenter.x + Math.cos(angle) * spawnRadius,
        y: this.platformCenter.y + Math.sin(angle) * spawnRadius
      });
      this.playerVelocities.set(player.id, { vx: 0, vy: 0 });
      this.playerLives.set(player.id, 3);
    });

    // Start tick interval
    this.tickInterval = setInterval(() => this.tick(), 50);

    // Broadcast initial state
    this.broadcastState();
  }

  onInput(playerId, data) {
    const velocity = this.playerVelocities.get(playerId);
    if (!velocity) return;

    const { direction } = data;

    // Apply force in direction
    switch (direction) {
      case 'up':
        velocity.vy -= this.moveForce;
        break;
      case 'down':
        velocity.vy += this.moveForce;
        break;
      case 'left':
        velocity.vx -= this.moveForce;
        break;
      case 'right':
        velocity.vx += this.moveForce;
        break;
    }
  }

  onTick() {
    // Update positions and apply physics
    this.players.forEach(player => {
      const position = this.playerPositions.get(player.id);
      const velocity = this.playerVelocities.get(player.id);
      const lives = this.playerLives.get(player.id);

      if (!position || !velocity || lives <= 0) return;

      // Update position
      position.x += velocity.vx;
      position.y += velocity.vy;

      // Apply friction
      velocity.vx *= this.friction;
      velocity.vy *= this.friction;

      // Check out of bounds
      const distanceFromCenter = Math.sqrt(
        Math.pow(position.x - this.platformCenter.x, 2) +
        Math.pow(position.y - this.platformCenter.y, 2)
      );

      if (distanceFromCenter > this.platformRadius) {
        // Player fell off - lose a life
        const newLives = lives - 1;
        this.playerLives.set(player.id, newLives);

        if (newLives > 0) {
          // Respawn at center
          position.x = this.platformCenter.x;
          position.y = this.platformCenter.y;
          velocity.vx = 0;
          velocity.vy = 0;

          this.sendToPlayer(player.id, SOCKET_EVENTS.MINIGAME_UPDATE, {
            event: 'fell-off',
            livesRemaining: newLives
          });
        } else {
          this.sendToPlayer(player.id, SOCKET_EVENTS.MINIGAME_UPDATE, {
            event: 'eliminated'
          });
        }
      }
    });

    // Check collisions between players
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const p1 = this.players[i];
        const p2 = this.players[j];

        const lives1 = this.playerLives.get(p1.id);
        const lives2 = this.playerLives.get(p2.id);

        if (lives1 <= 0 || lives2 <= 0) continue;

        const pos1 = this.playerPositions.get(p1.id);
        const pos2 = this.playerPositions.get(p2.id);
        const vel1 = this.playerVelocities.get(p1.id);
        const vel2 = this.playerVelocities.get(p2.id);

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.playerRadius * 2) {
          // Collision detected - bump apart
          const angle = Math.atan2(dy, dx);
          const force = this.bumpForce;

          vel1.vx -= Math.cos(angle) * force;
          vel1.vy -= Math.sin(angle) * force;
          vel2.vx += Math.cos(angle) * force;
          vel2.vy += Math.sin(angle) * force;

          // Separate overlapping players
          const overlap = (this.playerRadius * 2 - distance) / 2;
          pos1.x -= Math.cos(angle) * overlap;
          pos1.y -= Math.sin(angle) * overlap;
          pos2.x += Math.cos(angle) * overlap;
          pos2.y += Math.sin(angle) * overlap;
        }
      }
    }

    // Calculate scores
    const currentTime = Date.now();
    const timeSurvived = currentTime - this.startTime;

    this.players.forEach(player => {
      const lives = this.playerLives.get(player.id);
      this.scores.set(player.id, lives * 100 + Math.floor(timeSurvived / 100));
    });

    // Check if only one player remains
    const activePlayers = this.players.filter(p => this.playerLives.get(p.id) > 0);
    if (activePlayers.length <= 1) {
      this.end();
      return;
    }

    // Broadcast state
    this.broadcastState();
  }

  broadcastState() {
    const positions = {};
    const velocities = {};
    const lives = {};

    this.playerPositions.forEach((pos, playerId) => {
      positions[playerId] = pos;
    });
    this.playerVelocities.forEach((vel, playerId) => {
      velocities[playerId] = vel;
    });
    this.playerLives.forEach((l, playerId) => {
      lives[playerId] = l;
    });

    this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
      type: 'state',
      positions,
      velocities,
      lives,
      platformCenter: this.platformCenter,
      platformRadius: this.platformRadius
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
