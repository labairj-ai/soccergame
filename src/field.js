import { FIELD, GOAL_W, HUD_H, CTRL_Y, W } from './constants.js';

export function drawField(ctx) {
  ctx.fillStyle = '#082238';
  ctx.fillRect(0, HUD_H, W, CTRL_Y - HUD_H);

  const stripeH = FIELD.h / 9;
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? '#267434' : '#2d813b';
    ctx.fillRect(FIELD.x, FIELD.y + i * stripeH, FIELD.w, stripeH);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth = 3;
  ctx.strokeRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h);

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(FIELD.x, FIELD.y + FIELD.h / 2);
  ctx.lineTo(FIELD.x + FIELD.w, FIELD.y + FIELD.h / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(FIELD.x + FIELD.w / 2, FIELD.y + FIELD.h / 2, 48, 0, Math.PI * 2);
  ctx.stroke();

  drawPenaltyArea(ctx, true);
  drawPenaltyArea(ctx, false);
  drawGoal(ctx, true);
  drawGoal(ctx, false);
}

function drawPenaltyArea(ctx, top) {
  const boxW = 172;
  const boxH = 72;
  const x = FIELD.x + (FIELD.w - boxW) / 2;
  const y = top ? FIELD.y : FIELD.y + FIELD.h - boxH;
  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, boxW, boxH);
  ctx.strokeRect(FIELD.x + (FIELD.w - 78) / 2, top ? FIELD.y : FIELD.y + FIELD.h - 28, 78, 28);
}

function drawGoal(ctx, top) {
  const x = FIELD.x + (FIELD.w - GOAL_W) / 2;
  const y = top ? FIELD.y - 10 : FIELD.y + FIELD.h;
  ctx.fillStyle = '#d9edf7';
  ctx.fillRect(x, y, GOAL_W, 10);
  ctx.strokeStyle = 'rgba(7,59,76,0.42)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const lx = x + (GOAL_W / 6) * i;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(lx, y + 10);
    ctx.stroke();
  }
}
