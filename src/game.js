import {
  W, FIELD, GOAL_W, MATCH_SECONDS, HALVES, S, ACTIONS, PLAYER_FORMATION, CPU_FORMATION,
} from './constants.js';
import { drawField } from './field.js';
import { createRandomTeams, drawPlayer } from './characters.js';
import { drawScoreboard, drawControls, drawMessage } from './ui.js';
import { playGoal, playKick, playPass, playSave, playTackle, playWhistle } from './sounds.js';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function moveToward(entity, target, speed, dt) {
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return;
  const step = Math.min(d, speed * dt);
  entity.x += (dx / d) * step;
  entity.y += (dy / d) * step;
}

class Ball {
  constructor() {
    this.x = W / 2;
    this.y = FIELD.y + FIELD.h / 2;
    this.vx = 0;
    this.vy = 0;
    this.owner = null;
    this.trail = [];
  }

  update(dt) {
    if (this.owner) {
      this.x = this.owner.x;
      this.y = this.owner.y + (this.owner.side === 'player' ? -16 : 16);
      this.vx = 0;
      this.vy = 0;
      return;
    }
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 12) this.trail.shift();
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.pow(0.72, dt);
    this.vy *= Math.pow(0.72, dt);
    if (Math.abs(this.vx) + Math.abs(this.vy) < 10) {
      this.vx = 0;
      this.vy = 0;
    }
    this.x = clamp(this.x, FIELD.x + 6, FIELD.x + FIELD.w - 6);
  }

  kickToward(target, speed) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    this.owner = null;
    this.vx = (dx / d) * speed;
    this.vy = (dy / d) * speed;
    playKick();
  }

  draw(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      ctx.fillStyle = `rgba(255,255,255,${i / this.trail.length * 0.28})`;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.beginPath();
    ctx.ellipse(this.x + 1, this.y + 5, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x - 5, this.y);
    ctx.lineTo(this.x + 5, this.y);
    ctx.moveTo(this.x, this.y - 5);
    ctx.lineTo(this.x, this.y + 5);
    ctx.stroke();
  }
}

class GamePlayer {
  constructor(side, team, player, home) {
    this.side = side;
    this.team = team;
    this.player = player;
    this.role = home.role;
    this.home = { x: home.x, y: home.y };
    this.x = home.x;
    this.y = home.y;
    this.target = { x: home.x, y: home.y };
    this.cooldown = 0;
  }

  get speed() {
    return 70 + this.player.pace * 9 + (this.role === 'GK' ? 8 : 0);
  }

  update(dt) {
    moveToward(this, this.target, this.speed, dt);
    this.x = clamp(this.x, FIELD.x + 10, FIELD.x + FIELD.w - 10);
    this.y = clamp(this.y, FIELD.y + 10, FIELD.y + FIELD.h - 10);
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  draw(ctx, active) {
    drawPlayer(ctx, this.x, this.y, this.team, this.player, this.role === 'GK' ? 18 : 16, active);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.textAlign = 'center';
    ctx.font = '8px monospace';
    ctx.fillText(this.role, this.x, this.y + 27);
  }
}

export class Game {
  constructor() {
    this.teams = createRandomTeams();
    this.playerTeam = this.teams.playerTeam;
    this.cpuTeam = this.teams.cpuTeam;
    this.state = S.MENU;
    this.ball = new Ball();
    this.action = ACTIONS[0].id;
    this.hint = 'Tap a button, then tap the field.';
    this.message = { title: 'PARK SOCCER', sub: 'Tap start to kick off' };
    this.score = { player: 0, cpu: 0 };
    this.half = 1;
    this.clock = MATCH_SECONDS;
    this.power = 0.4;
    this.possession = 'player';
    this.target = { x: W / 2, y: FIELD.y + FIELD.h / 2 };
    this.resetPlayers();
  }

  resetPlayers(starter = 'player') {
    this.players = [
      ...PLAYER_FORMATION.map((home, i) => new GamePlayer('player', this.playerTeam, this.playerTeam.players[i], home)),
      ...CPU_FORMATION.map((home, i) => new GamePlayer('cpu', this.cpuTeam, this.cpuTeam.players[i], home)),
    ];
    this.controlled = this.players.find(p => p.side === starter && p.role === 'M') ?? this.players[3];
    this.ball.owner = this.controlled;
    this.ball.x = this.controlled.x;
    this.ball.y = this.controlled.y;
    this.possession = starter;
  }

  pointerDown(pos) {
    if (pos.y >= 560) {
      if (this.state !== S.PLAYING) {
        this.startOrContinue();
        return;
      }
      const idx = Math.floor((pos.x - 12) / 126);
      if (idx >= 0 && idx < ACTIONS.length) {
        this.action = ACTIONS[idx].id;
      }
      return;
    }
    if (this.state !== S.PLAYING) return;
    this.target = {
      x: clamp(pos.x, FIELD.x + 12, FIELD.x + FIELD.w - 12),
      y: clamp(pos.y, FIELD.y + 12, FIELD.y + FIELD.h - 12),
    };
    if (this.possession === 'player') this.performPlayerAction(this.target);
  }

  pointerMove() {}
  pointerUp() {}

  startOrContinue() {
    if (this.state === S.MENU) {
      this.state = S.PLAYING;
      this.message = null;
      playWhistle();
      return;
    }
    if (this.state === S.GOAL) {
      this.state = S.PLAYING;
      this.message = null;
      this.resetPlayers(this.possession === 'player' ? 'cpu' : 'player');
      playWhistle();
      return;
    }
    if (this.state === S.HALFTIME) {
      this.half = 2;
      this.clock = MATCH_SECONDS;
      this.state = S.PLAYING;
      this.message = null;
      this.resetPlayers('cpu');
      playWhistle();
      return;
    }
    if (this.state === S.GAME_OVER) {
      this.score = { player: 0, cpu: 0 };
      this.half = 1;
      this.clock = MATCH_SECONDS;
      this.state = S.PLAYING;
      this.message = null;
      this.resetPlayers('player');
      playWhistle();
    }
  }

  performPlayerAction(target) {
    const owner = this.ball.owner;
    if (!owner || owner.side !== 'player') return;
    if (this.action === 'dribble') {
      owner.target = target;
      this.hint = 'Dribble into space. Switch to shoot near the box.';
      return;
    }
    if (this.action === 'pass') {
      const mate = this.closestTeammate(target, owner);
      this.ball.kickToward(mate, 330 + owner.player.control * 12);
      this.controlled = mate;
      playPass();
      this.hint = `Pass looking for ${mate.player.name}.`;
      return;
    }
    this.shoot(owner, target, 'player');
  }

  closestTeammate(target, owner) {
    const mates = this.players.filter(p => p.side === owner.side && p !== owner && p.role !== 'GK');
    return mates.reduce((best, p) => dist(p, target) < dist(best, target) ? p : best, mates[0]);
  }

  shoot(owner, target, side) {
    const goalY = side === 'player' ? FIELD.y - 8 : FIELD.y + FIELD.h + 8;
    const goalX = clamp(target.x, W / 2 - GOAL_W / 2 + 8, W / 2 + GOAL_W / 2 - 8);
    const kick = owner.player.kick + rand(-2, 2);
    const accuracy = (owner.player.control + kick) / 20;
    const miss = (1 - accuracy) * rand(-90, 90);
    this.ball.kickToward({ x: goalX + miss, y: goalY }, 440 + kick * 18);
    this.hint = side === 'player' ? 'Shot away!' : 'They shoot!';
  }

  update(dt) {
    if (this.state !== S.PLAYING) return;
    this.clock -= dt;
    this.power = 0.35 + Math.abs(Math.sin(Date.now() / 700)) * 0.65;
    if (this.clock <= 0) {
      this.endPeriod();
      return;
    }

    this.updateAI(dt);
    this.players.forEach(p => p.update(dt));
    this.ball.update(dt);
    this.resolvePossession();
    this.checkGoalOrSave();
  }

  updateAI(dt) {
    const owner = this.ball.owner;
    const attacking = owner?.side ?? this.possession;
    for (const p of this.players) {
      if (p.role === 'GK') {
        p.target = { x: clamp(this.ball.x, 140, 250), y: p.side === 'player' ? FIELD.y + FIELD.h - 36 : FIELD.y + 36 };
      } else if (p.side === attacking) {
        const dir = p.side === 'player' ? -1 : 1;
        p.target = { x: p.home.x + Math.sin(Date.now() / 700 + p.x) * 24, y: p.home.y + dir * 38 };
      } else {
        p.target = { x: this.ball.x + rand(-28, 28), y: this.ball.y + rand(-22, 22) };
      }
    }

    if (owner?.side === 'cpu') {
      owner.target = { x: this.ball.x + rand(-18, 18), y: FIELD.y + FIELD.h - 34 };
      const goalDistance = FIELD.y + FIELD.h - owner.y;
      if (goalDistance < 145 && Math.random() < dt * 1.1) this.shoot(owner, { x: W / 2 + rand(-34, 34), y: FIELD.y + FIELD.h + 10 }, 'cpu');
      else if (Math.random() < dt * 0.45) {
        const mate = this.closestTeammate({ x: W / 2 + rand(-90, 90), y: owner.y + rand(25, 80) }, owner);
        this.ball.kickToward(mate, 300);
        playPass();
      }
    }
  }

  resolvePossession() {
    if (this.ball.owner) {
      this.possession = this.ball.owner.side;
      for (const defender of this.players.filter(p => p.side !== this.possession && p.cooldown <= 0)) {
        const carrier = this.ball.owner;
        if (dist(defender, carrier) < 22) {
          const chance = 0.18 + defender.player.control * 0.035 - carrier.player.control * 0.02;
          if (Math.random() < chance) {
            this.ball.owner = defender;
            this.possession = defender.side;
            defender.cooldown = 1;
            playTackle();
            this.hint = defender.side === 'player' ? 'Won it back.' : 'Tackled away.';
            return;
          }
        }
      }
      return;
    }
    for (const p of this.players) {
      if (dist(p, this.ball) < (p.role === 'GK' ? 24 : 17)) {
        this.ball.owner = p;
        this.possession = p.side;
        if (p.side === 'player') this.controlled = p;
        return;
      }
    }
  }

  checkGoalOrSave() {
    const topGoal = this.ball.y <= FIELD.y - 4;
    const bottomGoal = this.ball.y >= FIELD.y + FIELD.h + 4;
    if (!topGoal && !bottomGoal) return;

    const inMouth = this.ball.x > W / 2 - GOAL_W / 2 && this.ball.x < W / 2 + GOAL_W / 2;
    const scoringSide = topGoal ? 'player' : 'cpu';
    const keeper = this.players.find(p => p.side !== scoringSide && p.role === 'GK');
    const saveChance = keeper ? clamp(0.62 - Math.abs(this.ball.x - keeper.x) / 130, 0.18, 0.72) : 0.2;
    if (!inMouth || Math.random() < saveChance) {
      this.ball.vx = 0;
      this.ball.vy = topGoal ? 220 : -220;
      this.ball.y = topGoal ? FIELD.y + 22 : FIELD.y + FIELD.h - 22;
      this.ball.owner = keeper;
      this.possession = keeper.side;
      playSave();
      this.hint = inMouth ? 'Keeper saves.' : 'Just wide.';
      return;
    }

    this.score[scoringSide] += 1;
    this.possession = scoringSide;
    this.state = S.GOAL;
    this.message = {
      title: scoringSide === 'player' ? 'GOAL!' : 'THEY SCORE',
      sub: `${this.score.player} - ${this.score.cpu}`,
    };
    playGoal();
  }

  endPeriod() {
    playWhistle();
    if (this.half < HALVES) {
      this.state = S.HALFTIME;
      this.message = { title: 'HALFTIME', sub: `${this.score.player} - ${this.score.cpu}` };
      return;
    }
    this.state = S.GAME_OVER;
    const result = this.score.player > this.score.cpu ? 'YOU WIN' : this.score.player < this.score.cpu ? 'FULL TIME' : 'DRAW';
    this.message = { title: result, sub: `${this.score.player} - ${this.score.cpu}` };
  }

  draw(ctx) {
    drawScoreboard(ctx, this);
    drawField(ctx);
    this.drawTarget(ctx);
    [...this.players].sort((a, b) => a.y - b.y).forEach(p => p.draw(ctx, p === this.ball.owner || p === this.controlled));
    this.ball.draw(ctx);
    drawControls(ctx, this);
    drawMessage(ctx, this);
  }

  drawTarget(ctx) {
    if (this.state !== S.PLAYING || this.possession !== 'player') return;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(this.target.x, this.target.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
