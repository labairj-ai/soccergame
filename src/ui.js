import { W, H, HUD_H, CTRL_Y, MATCH_SECONDS } from './constants.js';

export function drawScoreboard(ctx, gs) {
  ctx.fillStyle = '#073b4c';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = '#118ab2';
  ctx.fillRect(0, HUD_H - 2, W, 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = gs.playerTeam.primary;
  ctx.fillText(gs.playerTeam.name, 10, 18);
  ctx.fillStyle = gs.cpuTeam.primary;
  ctx.fillText(gs.cpuTeam.name, 10, 42);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(`${gs.score.player} - ${gs.score.cpu}`, W / 2, 32);
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#d9edf7';
  ctx.fillText(`HALF ${gs.half}`, W / 2, 61);

  const elapsed = MATCH_SECONDS - Math.ceil(gs.clock);
  const minute = Math.min(90, Math.floor((elapsed / MATCH_SECONDS) * 90));
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff4d6';
  ctx.font = 'bold 17px monospace';
  ctx.fillText(`${minute}'`, W - 12, 24);
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillText(gs.possession === 'player' ? 'YOUR BALL' : 'DEFEND', W - 12, 48);
  ctx.font = '8px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.fillText(`UPDATED ${gs.buildLabel}`, W - 12, 64);
}

export function drawControls(ctx, gs) {
  ctx.fillStyle = '#073b4c';
  ctx.fillRect(0, CTRL_Y, W, H - CTRL_Y);
  ctx.fillStyle = '#118ab2';
  ctx.fillRect(0, CTRL_Y, W, 2);

  if (gs.state !== 'playing') {
    drawBigButton(ctx, gs.state === 'menu' ? 'START MATCH' : 'CONTINUE', '#06d6a0');
    return;
  }

  const controls = gs.getControls();
  const bw = controls.length > 3 ? 84 : controls.length > 2 ? 108 : 154;
  const bh = 62;
  const gap = 8;
  const start = (W - bw * controls.length - gap * (controls.length - 1)) / 2;
  controls.forEach((action, i) => {
    const x = start + i * (bw + gap);
    const active = gs.action === action.id;
    ctx.fillStyle = active ? action.color : '#0b4a60';
    ctx.beginPath();
    ctx.roundRect(x, CTRL_Y + 18, bw, bh, 12);
    ctx.fill();
    ctx.strokeStyle = active ? '#fff' : action.color;
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, CTRL_Y + 18, bw, bh, 12);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = active ? '#073b4c' : action.color;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(action.label, x + bw / 2, CTRL_Y + 45);
    ctx.fillStyle = active ? 'rgba(7,59,76,0.72)' : 'rgba(255,255,255,0.55)';
    ctx.font = '9px monospace';
    ctx.fillText(action.sub, x + bw / 2, CTRL_Y + 64);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '11px monospace';
  ctx.fillText(gs.hint, W / 2, CTRL_Y + 104);
  ctx.fillStyle = gs.possession === 'player'
    ? (gs.power > 0.65 ? '#ef476f' : '#ffd166')
    : '#4cc9f0';
  ctx.fillRect(60, CTRL_Y + 120, 270 * (gs.possession === 'player' ? gs.power : gs.defenseCharge), 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(60, CTRL_Y + 120, 270, 8);
}

export function drawMessage(ctx, gs) {
  if (!gs.message) return;
  ctx.save();
  ctx.fillStyle = 'rgba(7,59,76,0.86)';
  ctx.beginPath();
  ctx.roundRect(36, 274, W - 72, 98, 14);
  ctx.fill();
  ctx.strokeStyle = '#fff4d6';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 23px monospace';
  ctx.fillText(gs.message.title, W / 2, 306);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '12px monospace';
  ctx.fillText(gs.message.sub, W / 2, 337);
  ctx.restore();
}

function drawBigButton(ctx, label, color) {
  const x = 58;
  const y = CTRL_Y + 28;
  const w = W - 116;
  const h = 82;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#073b4c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 25px monospace';
  ctx.fillText(label, W / 2, y + h / 2);
}
