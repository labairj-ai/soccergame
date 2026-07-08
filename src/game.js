import {
  W, FIELD, GOAL_W, MATCH_SECONDS, HALVES, S, OFFENSE_ACTIONS, DEFENSE_ACTIONS, PLAYER_FORMATION, CPU_FORMATION,
} from './constants.js';
import { drawField } from './field.js';
import { createRandomTeams, drawPlayer } from './characters.js';
import { drawScoreboard, drawControls, drawMessage } from './ui.js';
import { playGoal, playKick, playPass, playSave, playTackle, playWhistle, startMusic, stopMusic } from './sounds.js';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const BUILD_STAMP = typeof __BUILD_TIME__ === 'undefined' ? new Date().toISOString() : __BUILD_TIME__;

function buildLabel() {
  try {
    return new Date(BUILD_STAMP).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'NOW';
  }
}

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
    const sideBoost = this.side === 'player' ? 1 : 0.84;
    return (44 + this.player.pace * 5 + (this.role === 'GK' ? 5 : 0)) * sideBoost;
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
    this.buildLabel = buildLabel();
    this.ball = new Ball();
    this.action = OFFENSE_ACTIONS[0].id;
    this.hint = 'Tap a button, then tap the field.';
    this.message = { title: 'PARK SOCCER', sub: 'Tap start to kick off' };
    this.score = { player: 0, cpu: 0 };
    this.half = 1;
    this.clock = MATCH_SECONDS;
    this.power = 0.4;
    this.defenseCharge = 0.35;
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
    this.action = starter === 'player' ? OFFENSE_ACTIONS[0].id : DEFENSE_ACTIONS[0].id;
  }

  pointerDown(pos) {
    if (this.state !== S.GAME_OVER) startMusic();
    if (pos.y >= 560) {
      if (this.state !== S.PLAYING) {
        this.startOrContinue();
        return;
      }
      const controls = this.getControls();
      const bw = controls.length > 3 ? 84 : controls.length > 2 ? 108 : 154;
      const gap = 8;
      const start = (W - bw * controls.length - gap * (controls.length - 1)) / 2;
      const idx = Math.floor((pos.x - start) / (bw + gap));
      const hit = controls[idx];
      if (hit && pos.x >= start + idx * (bw + gap) && pos.x <= start + idx * (bw + gap) + bw) {
        this.action = hit.id;
        this.performInstantAction(hit.id);
      }
      return;
    }
    if (this.state !== S.PLAYING) return;
    this.target = {
      x: clamp(pos.x, FIELD.x + 12, FIELD.x + FIELD.w - 12),
      y: clamp(pos.y, FIELD.y + 12, FIELD.y + FIELD.h - 12),
    };
    if (this.possession === 'player') this.performPlayerAction(this.target);
    else this.performDefenseAction(this.action);
  }

  pointerMove() {}
  pointerUp() {}

  startOrContinue() {
    if (this.state === S.MENU) {
      this.state = S.PLAYING;
      this.message = null;
      startMusic();
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
      startMusic();
      playWhistle();
    }
  }

  getControls() {
    const owner = this.ball.owner;
    if (owner?.side === 'player' && owner.role === 'GK') {
      return this.players
        .filter(p => p.side === 'player' && (p.role === 'M' || p.role === 'F'))
        .map(p => ({
          id: `keeper-pass-${p.role}-${p.player.name}`,
          label: p.role === 'F' ? 'FWD' : 'MID',
          sub: p.player.name,
          color: '#ffd166',
          target: p,
        }));
    }
    return this.possession === 'player' ? OFFENSE_ACTIONS : DEFENSE_ACTIONS;
  }

  performInstantAction(actionId) {
    if (actionId.startsWith('keeper-pass-')) {
      const target = this.getControls().find(control => control.id === actionId)?.target;
      if (target) this.passTo(target);
      return;
    }
    if (this.possession !== 'player' && (actionId === 'tackle' || actionId === 'slide')) {
      this.performDefenseAction(actionId);
    }
  }

  performPlayerAction(target) {
    const owner = this.ball.owner;
    if (!owner || owner.side !== 'player') return;
    if (owner.role === 'GK') {
      this.hint = 'Keeper must choose MID or FWD.';
      return;
    }
    if (this.action === 'pass') {
      const mate = this.closestTeammate(target, owner);
      this.passTo(mate);
      return;
    }
    this.shoot(owner, target, 'player');
  }

  passTo(mate) {
    const owner = this.ball.owner;
    if (!owner || owner.side !== 'player') return;
    this.ball.kickToward(mate, owner.role === 'GK' ? 245 : 220 + owner.player.control * 8);
    this.controlled = mate;
    playPass();
    this.hint = owner.role === 'GK'
      ? `Keeper rolls it to ${mate.player.name}.`
      : `Pass looking for ${mate.player.name}.`;
  }

  performDefenseAction(actionId) {
    const carrier = this.ball.owner?.side === 'cpu' ? this.ball.owner : null;
    const defender = this.bestDefender();
    if (!defender) return;

    defender.target = carrier ?? this.ball;
    this.controlled = defender;

    if (actionId === 'slide') {
      this.defenseCharge = 1;
      this.tryManualChallenge(defender, carrier, 44, 0.68, 0.95, 'Slide');
      return;
    }

    this.defenseCharge = 0.72;
    this.tryManualChallenge(defender, carrier, 32, 0.78, 0.45, 'Tackle');
  }

  bestDefender() {
    const available = this.players.filter(p => p.side === 'player' && p.role !== 'GK');
    const target = this.ball.owner?.side === 'cpu' ? this.ball.owner : this.ball;
    return available.reduce((best, p) => dist(p, target) < dist(best, target) ? p : best, available[0]);
  }

  tryManualChallenge(defender, carrier, reach, chance, recovery, label) {
    if (!carrier || defender.cooldown > 0) {
      this.hint = `${label}: closing down the ball.`;
      return;
    }
    const gap = dist(defender, carrier);
    if (gap > reach) {
      this.hint = `${label}: get closer.`;
      return;
    }

    const odds = clamp(chance + defender.player.control * 0.025 - carrier.player.control * 0.01, 0.42, 0.92);
    defender.cooldown = recovery;
    if (Math.random() < odds) {
      this.ball.owner = defender;
      this.possession = 'player';
      this.action = OFFENSE_ACTIONS[0].id;
      this.hint = `${label} won by ${defender.player.name}.`;
      playTackle();
      return;
    }
    const shove = label === 'Slide' ? 16 : 8;
    defender.x = clamp(defender.x + rand(-shove, shove), FIELD.x + 10, FIELD.x + FIELD.w - 10);
    defender.y = clamp(defender.y + (label === 'Slide' ? 18 : 8), FIELD.y + 10, FIELD.y + FIELD.h - 10);
    this.hint = `${label} missed.`;
    playTackle();
  }

  closestTeammate(target, owner) {
    const mates = this.players.filter(p => p.side === owner.side && p !== owner && p.role !== 'GK');
    return mates.reduce((best, p) => dist(p, target) < dist(best, target) ? p : best, mates[0]);
  }

  shoot(owner, target, side) {
    const goalY = side === 'player' ? FIELD.y - 8 : FIELD.y + FIELD.h + 8;
    const goalX = clamp(target.x, W / 2 - GOAL_W / 2 + 8, W / 2 + GOAL_W / 2 - 8);
    const kidFriendly = side === 'player';
    const kick = owner.player.kick + rand(kidFriendly ? -0.5 : -3, kidFriendly ? 2.5 : 1);
    const accuracy = clamp((owner.player.control + kick) / (kidFriendly ? 17 : 24), 0.35, 0.96);
    const miss = (1 - accuracy) * rand(kidFriendly ? -48 : -120, kidFriendly ? 48 : 120);
    this.ball.kickToward({ x: goalX + miss, y: goalY }, kidFriendly ? 315 + kick * 10 : 255 + kick * 8);
    this.hint = side === 'player' ? 'Shot away!' : 'They shoot!';
  }

  update(dt) {
    if (this.state !== S.PLAYING) return;
    this.clock -= dt;
    this.power = 0.35 + Math.abs(Math.sin(Date.now() / 700)) * 0.65;
    this.defenseCharge = Math.max(0.28, this.defenseCharge - dt * 0.9);
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
        const supportDistance = p.side === 'player' ? 32 : 22;
        p.target = { x: p.home.x + Math.sin(Date.now() / 900 + p.x) * 16, y: p.home.y + dir * supportDistance };
      } else {
        p.target = { x: this.ball.x + rand(-24, 24), y: this.ball.y + rand(-18, 18) };
      }
    }

    if (owner?.side === 'cpu') {
      owner.target = { x: this.ball.x + rand(-14, 14), y: FIELD.y + FIELD.h - 72 };
      const goalDistance = FIELD.y + FIELD.h - owner.y;
      if (goalDistance < 105 && Math.random() < dt * 0.22) this.shoot(owner, { x: W / 2 + rand(-54, 54), y: FIELD.y + FIELD.h + 10 }, 'cpu');
      else if (Math.random() < dt * 0.25) {
        const mate = this.closestTeammate({ x: W / 2 + rand(-90, 90), y: owner.y + rand(25, 80) }, owner);
        this.ball.kickToward(mate, 190);
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
          const chance = defender.side === 'player'
            ? 0.28 + defender.player.control * 0.035 - carrier.player.control * 0.012
            : 0.07 + defender.player.control * 0.018 - carrier.player.control * 0.025;
          if (Math.random() < chance) {
            this.ball.owner = defender;
            this.possession = defender.side;
            if (defender.side === 'player') this.action = OFFENSE_ACTIONS[0].id;
            else this.action = DEFENSE_ACTIONS[0].id;
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
        if (p.side === 'player') {
          this.controlled = p;
          this.action = OFFENSE_ACTIONS[0].id;
        } else {
          this.action = DEFENSE_ACTIONS[0].id;
        }
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
    const baseSave = keeper?.side === 'cpu' ? 0.32 : 0.78;
    const saveChance = keeper ? clamp(baseSave - Math.abs(this.ball.x - keeper.x) / 150, keeper.side === 'cpu' ? 0.08 : 0.38, keeper.side === 'cpu' ? 0.42 : 0.86) : 0.2;
    if (!inMouth || Math.random() < saveChance) {
      this.ball.vx = 0;
      this.ball.vy = topGoal ? 145 : -145;
      this.ball.y = topGoal ? FIELD.y + 22 : FIELD.y + FIELD.h - 22;
      this.ball.owner = keeper;
      this.possession = keeper.side;
      this.action = keeper.side === 'player'
        ? this.getControls()[0]?.id ?? OFFENSE_ACTIONS[0].id
        : DEFENSE_ACTIONS[0].id;
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
    stopMusic();
    const result = this.score.player >= this.score.cpu ? 'YOU WIN' : 'FULL TIME';
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
    if (this.state !== S.PLAYING || this.possession !== 'player' || this.ball.owner?.role === 'GK') return;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(this.target.x, this.target.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
