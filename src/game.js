import {
  W, FIELD, GOAL_W, MATCH_SECONDS, HALVES, S, OFFENSE_ACTIONS, DEFENSE_ACTIONS, PLAYER_FORMATION, CPU_FORMATION, CTRL_Y,
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
    this.lastKicker = null;
    this.kickerCooldown = 0;
  }

  update(dt) {
    if (this.owner) {
      this.x = this.owner.x;
      this.y = this.owner.y + (this.owner.side === 'player' ? -16 : 16);
      this.vx = 0;
      this.vy = 0;
      return;
    }
    this.kickerCooldown = Math.max(0, this.kickerCooldown - dt);
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

  kickToward(target, speed, kicker = null) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    this.owner = null;
    this.lastKicker = kicker;
    this.kickerCooldown = kicker ? 0.5 : 0;
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
  constructor(side, team, player, home, index) {
    this.side = side;
    this.team = team;
    this.player = player;
    this.role = home.role;
    this.index = index;
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
    this.hint = 'Tap PASS or SHOOT!';
    this.message = { title: 'PARK SOCCER', sub: 'Tap start to kick off' };
    this.score = { player: 0, cpu: 0 };
    this.half = 1;
    this.clock = MATCH_SECONDS;
    this.power = 0.4;
    this.defenseCharge = 0.35;
    this.flow = 0;
    this.possession = 'player';
    this.target = null;
    this.resetPlayers();
  }

  resetPlayers(starter = 'player') {
    this.players = [
      ...PLAYER_FORMATION.map((home, i) => new GamePlayer('player', this.playerTeam, this.playerTeam.players[i], home, i)),
      ...CPU_FORMATION.map((home, i) => new GamePlayer('cpu', this.cpuTeam, this.cpuTeam.players[i], home, i)),
    ];
    this.controlled = this.players.find(p => p.side === starter && p.role === 'M') ?? this.players[3];
    this.ball.owner = this.controlled;
    this.ball.x = this.controlled.x;
    this.ball.y = this.controlled.y;
    this.possession = starter;
    this.action = starter === 'player' ? OFFENSE_ACTIONS[0].id : DEFENSE_ACTIONS[0].id;
    this.target = null;
    this.hint = starter === 'player' ? 'Tap PASS or SHOOT!' : 'Tap TACKLE or SLIDE!';
  }

  pointerDown(pos) {
    if (this.state !== S.GAME_OVER) startMusic();
    if (pos.y >= CTRL_Y) {
      if (this.state !== S.PLAYING) {
        this.startOrContinue();
        return;
      }
      const controls = this.getControls();
      const bw = controls.length === 1 ? 250 : 170;
      const gap = 10;
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
    // Field tap: steer the ball carrier toward the tapped spot
    const tapped = {
      x: clamp(pos.x, FIELD.x + 12, FIELD.x + FIELD.w - 12),
      y: clamp(pos.y, FIELD.y + 12, FIELD.y + FIELD.h - 12),
    };
    this.target = tapped;
    const carrier = this.ball.owner;
    if (carrier?.side === 'player' && carrier.role !== 'GK') {
      carrier.target = tapped;
    }
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
      return [{ id: 'keeper-kick', label: 'KICK OUT', sub: 'clear the ball!', color: '#ffd166' }];
    }
    return this.possession === 'player' ? OFFENSE_ACTIONS : DEFENSE_ACTIONS;
  }

  performInstantAction(actionId) {
    if (actionId === 'keeper-kick' || actionId === 'pass') {
      const owner = this.ball.owner;
      if (!owner || owner.side !== 'player') return;
      const mate = this.mostOpenTeammate(owner);
      if (mate) this.passTo(mate);
      return;
    }
    if (actionId === 'shoot') {
      const owner = this.ball.owner;
      if (!owner || owner.side !== 'player' || owner.role === 'GK') return;
      this.shoot(owner, { x: W / 2, y: FIELD.y - 8 }, 'player');
      return;
    }
    if (actionId === 'tackle' || actionId === 'slide') {
      if (this.possession !== 'player') this.performDefenseAction(actionId);
    }
  }

  passTo(mate) {
    const owner = this.ball.owner;
    if (!owner || owner.side !== 'player') return;
    this.ball.kickToward(mate, owner.role === 'GK' ? 245 : 220 + owner.player.control * 8, owner);
    this.controlled = mate;
    this.target = null;
    playPass();
    this.hint = `${mate.player.name} gets it!`;
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
      this.hint = 'Running to get it...';
      return;
    }
    const gap = dist(defender, carrier);
    if (gap > reach) {
      this.hint = 'Get closer! Tap again!';
      return;
    }

    const odds = clamp(chance + defender.player.control * 0.025 - carrier.player.control * 0.01, 0.42, 0.92);
    defender.cooldown = recovery;
    if (Math.random() < odds) {
      this.ball.owner = defender;
      this.possession = 'player';
      this.action = OFFENSE_ACTIONS[0].id;
      this.hint = `${defender.player.name} got the ball!`;
      playTackle();
      return;
    }
    const shove = label === 'Slide' ? 16 : 8;
    defender.x = clamp(defender.x + rand(-shove, shove), FIELD.x + 10, FIELD.x + FIELD.w - 10);
    defender.y = clamp(defender.y + (label === 'Slide' ? 18 : 8), FIELD.y + 10, FIELD.y + FIELD.h - 10);
    this.hint = 'Missed! Tap TACKLE again!';
    playTackle();
  }

  closestTeammate(target, owner) {
    const mates = this.players.filter(p => p.side === owner.side && p !== owner && p.role !== 'GK');
    return mates.reduce((best, p) => dist(p, target) < dist(best, target) ? p : best, mates[0]);
  }

  mostOpenTeammate(owner) {
    const mates = this.players.filter(p => p.side === owner.side && p !== owner && p.role !== 'GK');
    return mates.reduce((best, p) => this.openPassScore(owner, p) > this.openPassScore(owner, best) ? p : best, mates[0]);
  }

  openPassScore(owner, mate) {
    const opponents = this.players.filter(p => p.side !== owner.side);
    const nearestOpponent = opponents.reduce((nearest, p) => Math.min(nearest, dist(p, mate)), 999);
    const lanePressure = opponents.reduce((pressure, p) => pressure + Math.max(0, 28 - this.distanceToSegment(p, owner, mate)), 0);
    const forward = owner.side === 'player' ? owner.y - mate.y : mate.y - owner.y;
    const passDistance = dist(owner, mate);
    const roleBonus = mate.role === 'F' ? 18 : mate.role === 'M' ? 10 : 2;
    return nearestOpponent * 1.8 + clamp(forward, -30, 90) + roleBonus - lanePressure * 2.4 - Math.abs(passDistance - 115) * 0.35;
  }

  distanceToSegment(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy || 1;
    const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq, 0, 1);
    return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
  }

  shoot(owner, target, side) {
    const goalY = side === 'player' ? FIELD.y - 8 : FIELD.y + FIELD.h + 8;
    const goalX = clamp(target.x, W / 2 - GOAL_W / 2 + 8, W / 2 + GOAL_W / 2 - 8);
    const kidFriendly = side === 'player';
    const kick = owner.player.kick + rand(kidFriendly ? -0.5 : -3, kidFriendly ? 2.5 : 1);
    const accuracy = clamp((owner.player.control + kick) / (kidFriendly ? 17 : 24), 0.35, 0.96);
    const miss = (1 - accuracy) * rand(kidFriendly ? -48 : -120, kidFriendly ? 48 : 120);
    this.ball.kickToward({ x: goalX + miss, y: goalY }, kidFriendly ? 315 + kick * 10 : 255 + kick * 8);
    if (side === 'player') this.target = null;
    this.hint = side === 'player' ? 'Go in! Go in!' : 'They shoot!';
  }

  update(dt) {
    if (this.state !== S.PLAYING) return;
    this.clock -= dt;
    this.power = 0.35 + Math.abs(Math.sin(Date.now() / 700)) * 0.65;
    this.defenseCharge = Math.max(0.28, this.defenseCharge - dt * 0.9);
    this.updateFieldFlow(dt);
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
    const defending = attacking === 'player' ? 'cpu' : 'player';
    // When the keeper has the ball, defending team retreats — no pressing
    const keeperHasBall = owner?.role === 'GK';
    const pressers = keeperHasBall
      ? []
      : this.getPressers(defending, owner ?? this.ball, owner ? 1 : 2);
    for (const p of this.players) {
      if (p.role === 'GK') {
        p.target = { x: clamp(this.ball.x, 140, 250), y: p.side === 'player' ? FIELD.y + FIELD.h - 36 : FIELD.y + 36 };
      } else if (owner === p) {
        p.target = this.carrierTarget(p);
      } else if (p.side === attacking) {
        p.target = this.supportTarget(p, owner);
      } else if (pressers.includes(p)) {
        p.target = this.pressTarget(p, owner ?? this.ball);
      } else if (keeperHasBall && p.side === defending) {
        p.target = this.retreatTarget(p);
      } else {
        p.target = this.zoneTarget(p, owner ?? this.ball);
      }
    }

    if (owner?.side === 'cpu') {
      owner.target = { x: this.ball.x + rand(-14, 14), y: FIELD.y + FIELD.h - 72 };
      const goalDistance = FIELD.y + FIELD.h - owner.y;
      if (goalDistance < 105 && Math.random() < dt * 0.22) this.shoot(owner, { x: W / 2 + rand(-54, 54), y: FIELD.y + FIELD.h + 10 }, 'cpu');
      else if (Math.random() < dt * 0.25) {
        const mate = this.mostOpenTeammate(owner);
        this.ball.kickToward(mate, 190, owner);
        playPass();
      }
    }
  }

  updateFieldFlow(dt) {
    const target = this.possession === 'player' ? 1 : -1;
    this.flow += (target - this.flow) * Math.min(1, dt * 0.75);
  }

  getPressers(side, target, count) {
    return this.players
      .filter(p => p.side === side && p.role !== 'GK' && p.cooldown <= 0)
      .sort((a, b) => dist(a, target) - dist(b, target))
      .slice(0, count);
  }

  carrierTarget(player) {
    const attackDir = player.side === 'player' ? -1 : 1;
    const autoAdvance = {
      x: clamp(player.x + Math.sin(Date.now() / 1100 + player.index) * 18, FIELD.x + 46, FIELD.x + FIELD.w - 46),
      y: clamp(player.y + attackDir * 58, FIELD.y + 56, FIELD.y + FIELD.h - 56),
    };
    if (player.side === 'player') {
      const dx = player.target.x - player.x;
      const dy = player.target.y - player.y;
      return Math.hypot(dx, dy) > 24 ? player.target : autoAdvance;
    }
    return {
      x: autoAdvance.x,
      y: autoAdvance.y,
    };
  }

  supportTarget(player, owner) {
    const dir = player.side === 'player' ? -1 : 1;
    const lane = player.home.x < W / 2 ? -1 : player.home.x > W / 2 ? 1 : 0;
    const phasePush = (player.side === 'player' ? -this.flow : this.flow) * 58;
    const wave = Math.sin(Date.now() / 1300 + player.index * 1.7) * 20;
    const baseX = owner ? owner.x + lane * 86 + wave : player.home.x + lane * 26;
    const roleLead = player.role === 'F' ? 108 : player.role === 'M' ? 64 : -18;
    return {
      x: clamp(baseX, FIELD.x + 34, FIELD.x + FIELD.w - 34),
      y: clamp((owner?.y ?? player.home.y) + dir * roleLead + phasePush, FIELD.y + 42, FIELD.y + FIELD.h - 42),
    };
  }

  pressTarget(player, target) {
    const offset = player.home.x < W / 2 ? -18 : 18;
    return {
      x: clamp(target.x + offset, FIELD.x + 18, FIELD.x + FIELD.w - 18),
      y: clamp(target.y + (player.side === 'player' ? 20 : -20), FIELD.y + 24, FIELD.y + FIELD.h - 24),
    };
  }

  // Zone defense: each player tracks the ball only within their horizontal zone
  zoneTarget(player, target) {
    const sideGoalY = player.side === 'player' ? FIELD.y + FIELD.h : FIELD.y;
    const flowShift = (player.side === 'player' ? -this.flow : this.flow) * 48;
    // Clamp the ball's x to this player's zone radius before computing x offset
    const zoneRadius = FIELD.w * 0.24;
    const ballInZone = clamp(target.x, player.home.x - zoneRadius, player.home.x + zoneRadius);
    const xTracking = (ballInZone - player.home.x) * 0.45;
    const towardBall = clamp((target.y - player.home.y) * 0.25, -46, 46);
    const protectGoal = player.role === 'D' ? (player.side === 'player' ? -22 : 22) : 0;
    return {
      x: clamp(player.home.x + xTracking, FIELD.x + 28, FIELD.x + FIELD.w - 28),
      y: clamp(player.home.y + towardBall + protectGoal + flowShift, FIELD.y + 38, FIELD.y + FIELD.h - 38),
    };
  }

  // When the keeper has the ball, drop into a compact mid-block
  retreatTarget(player) {
    const ownGoalY = player.side === 'player' ? FIELD.y + FIELD.h : FIELD.y;
    const midY = FIELD.y + FIELD.h / 2;
    // Defenders drop deeper into own half; midfielders sit just behind midfield
    const blockDepth = player.role === 'D' ? 0.45 : 0.2;
    const blockY = midY + (ownGoalY - midY) * blockDepth;
    return {
      x: clamp(player.home.x, FIELD.x + 28, FIELD.x + FIELD.w - 28),
      y: clamp(blockY, FIELD.y + 38, FIELD.y + FIELD.h - 38),
    };
  }

  resolvePossession() {
    if (this.ball.owner) {
      this.possession = this.ball.owner.side;
      for (const defender of this.players.filter(p => p.side !== this.possession && p.cooldown <= 0)) {
        const carrier = this.ball.owner;
        // Goalkeepers are protected from auto-tackles — use manual TACKLE button
        if (carrier.role === 'GK') continue;
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
            this.hint = defender.side === 'player' ? 'Got the ball! Tap PASS or SHOOT!' : 'They took it! Tap TACKLE!';
            return;
          }
        }
      }
      return;
    }
    for (const p of this.players) {
      if (dist(p, this.ball) < (p.role === 'GK' ? 24 : 17)) {
        if (p === this.ball.lastKicker && this.ball.kickerCooldown > 0) continue;
        this.ball.owner = p;
        this.possession = p.side;
        if (p.side === 'player') {
          this.controlled = p;
          this.action = p.role === 'GK' ? 'keeper-kick' : OFFENSE_ACTIONS[0].id;
          this.hint = p.role === 'GK' ? 'Tap KICK OUT!' : 'Tap PASS or SHOOT!';
        } else {
          this.action = DEFENSE_ACTIONS[0].id;
          this.hint = 'Tap TACKLE or SLIDE!';
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
      if (keeper.side === 'player') {
        this.controlled = keeper;
        this.action = 'keeper-kick';
        this.hint = 'Great save! Tap KICK OUT!';
      } else {
        this.action = DEFENSE_ACTIONS[0].id;
        this.hint = inMouth ? 'Great save!' : 'Just missed!';
      }
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
    if (this.state !== S.PLAYING || !this.target || this.possession !== 'player' || this.ball.owner?.role === 'GK') return;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(this.target.x, this.target.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
