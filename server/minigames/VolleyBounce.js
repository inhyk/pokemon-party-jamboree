import { BaseMinigame } from './BaseMinigame.js';
import { SOCKET_EVENTS } from 'shared';

/**
 * VolleyBounce - 2v2 volleyball minigame
 */
export class VolleyBounce extends BaseMinigame {
  constructor(io, room, players) {
    super(io, room, players);
    this.type = 'volley-bounce';
    this.duration = 60000;

    this.ball = { x: 400, y: 100, vx: 0, vy: 0 };
    this.teams = { team1: [], team2: [] };
    this.teamScores = [0, 0];
    this.playerPositions = new Map();
    this.courtWidth = 800;
    this.courtHeight = 400;
    this.netX = 400;
    this.playerRadius = 25;
    this.hitRadius = 40;
    this.gravity = 0.4;
    this.ballRadius = 15;
    this.maxScore = 5;
    this.isServing = true;
    this.servingTeam = 0;
  }

  getRules() {
    return '2v2 Volleyball! First team to 5 points wins. Hit the ball over the net!';
  }

  async onStart() {
    // Split players into teams (p1,p3 vs p2,p4)
    this.teams.team1 = [this.players[0], this.players[2]].filter(p => p);
    this.teams.team2 = [this.players[1], this.players[3]].filter(p => p);

    // Initialize player positions
    // Team 1 on left side
    this.teams.team1.forEach((player, index) => {
      this.playerPositions.set(player.id, {
        x: 100 + index * 100,
        y: this.courtHeight - 50
      });
    });

    // Team 2 on right side
    this.teams.team2.forEach((player, index) => {
      this.playerPositions.set(player.id, {
        x: 500 + index * 100,
        y: this.courtHeight - 50
      });
    });

    // Serve the ball
    this.serveBall();

    // Start tick interval
    this.tickInterval = setInterval(() => this.tick(), 50);

    // Broadcast initial state
    this.broadcastState();
  }

  serveBall() {
    this.isServing = true;
    const servingSide = this.servingTeam === 0 ? 200 : 600;
    this.ball = {
      x: servingSide,
      y: 100,
      vx: this.servingTeam === 0 ? 8 : -8,
      vy: -5
    };

    this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
      event: 'serve',
      servingTeam: this.servingTeam
    });

    setTimeout(() => {
      this.isServing = false;
    }, 500);
  }

  onInput(playerId, data) {
    const position = this.playerPositions.get(playerId);
    if (!position) return;

    const { direction, action } = data;

    // Movement
    if (direction === 'left') {
      position.x = Math.max(this.playerRadius, position.x - 5);
    } else if (direction === 'right') {
      position.x = Math.min(this.courtWidth - this.playerRadius, position.x + 5);
    }

    // Keep players on their side
    const isTeam1 = this.teams.team1.some(p => p.id === playerId);
    if (isTeam1) {
      position.x = Math.min(this.netX - this.playerRadius, position.x);
    } else {
      position.x = Math.max(this.netX + this.playerRadius, position.x);
    }

    // Hit action
    if (action === 'hit') {
      const distance = Math.sqrt(
        Math.pow(this.ball.x - position.x, 2) +
        Math.pow(this.ball.y - position.y, 2)
      );

      if (distance < this.hitRadius) {
        // Calculate hit direction based on player position
        const isTeam1 = this.teams.team1.some(p => p.id === playerId);
        const targetDirection = isTeam1 ? 1 : -1; // 1 = right, -1 = left

        // Apply velocity to ball
        this.ball.vx = targetDirection * 12;
        this.ball.vy = -8;

        this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
          event: 'ball-hit',
          playerId,
          ballPosition: { x: this.ball.x, y: this.ball.y }
        });
      }
    }
  }

  onTick() {
    if (!this.isServing) {
      // Update ball physics
      this.ball.vy += this.gravity;
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;

      // Ball bounce on floor
      if (this.ball.y + this.ballRadius >= this.courtHeight) {
        // Ball hit the ground - point scored
        const scoringTeam = this.ball.x < this.netX ? 1 : 0; // Team on opposite side scores
        this.teamScores[scoringTeam]++;

        this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
          event: 'point-scored',
          scoringTeam,
          teamScores: this.teamScores
        });

        // Update player scores
        const winningTeam = scoringTeam === 0 ? this.teams.team1 : this.teams.team2;
        winningTeam.forEach(player => {
          if (player) {
            this.scores.set(player.id, this.teamScores[scoringTeam] * 100);
          }
        });

        // Check for game end
        if (this.teamScores[0] >= this.maxScore || this.teamScores[1] >= this.maxScore) {
          this.end();
          return;
        }

        // Serve from losing side
        this.servingTeam = scoringTeam === 0 ? 1 : 0;
        this.serveBall();
      }

      // Ball bounce on ceiling
      if (this.ball.y - this.ballRadius <= 0) {
        this.ball.y = this.ballRadius;
        this.ball.vy = Math.abs(this.ball.vy) * 0.7;
      }

      // Ball bounce on walls
      if (this.ball.x - this.ballRadius <= 0) {
        this.ball.x = this.ballRadius;
        this.ball.vx = Math.abs(this.ball.vx) * 0.7;
      }
      if (this.ball.x + this.ballRadius >= this.courtWidth) {
        this.ball.x = this.courtWidth - this.ballRadius;
        this.ball.vx = -Math.abs(this.ball.vx) * 0.7;
      }

      // Net collision (simplified - just reverse horizontal velocity)
      if (Math.abs(this.ball.x - this.netX) < this.ballRadius) {
        this.ball.vx *= -0.8;
      }
    }

    // Broadcast state
    this.broadcastState();
  }

  broadcastState() {
    const positions = {};
    this.playerPositions.forEach((pos, playerId) => {
      positions[playerId] = pos;
    });

    this.broadcast(SOCKET_EVENTS.MINIGAME_UPDATE, {
      type: 'state',
      ball: this.ball,
      positions,
      teamScores: this.teamScores,
      netX: this.netX,
      courtWidth: this.courtWidth,
      courtHeight: this.courtHeight
    });
  }

  onEnd() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.broadcast(SOCKET_EVENTS.MINIGAME_END, {
      type: this.type,
      results: this.getResults(),
      finalScores: this.teamScores
    });
  }
}
