import { SKINS } from './constants.js';

const PLAYER_POOL = [
  { name: 'KYLE', kick: 9, pace: 5, control: 7, skin: SKINS[0],
    avatar: { type: 'dog', color: '#438f8d', accent: '#397f80' } },
  { name: 'JESS', kick: 5, pace: 10, control: 9, skin: SKINS[1],
    avatar: { type: 'fuzzy', color: '#168ba5', accent: '#277f91' } },
  { name: 'MARCUS', kick: 7, pace: 7, control: 7, skin: SKINS[2],
    avatar: { type: 'ghost', color: '#252a25', accent: '#a8241c' } },
  { name: 'TARA', kick: 6, pace: 8, control: 9, skin: SKINS[3],
    avatar: { type: 'alien', color: '#6d7162', accent: '#eee2bd' } },
  { name: 'DEVON', kick: 10, pace: 4, control: 6, skin: SKINS[4],
    avatar: { type: 'flame', color: '#ed6b0b', accent: '#a8241c' } },
  { name: 'GIGGLES', kick: 8, pace: 6, control: 8, skin: SKINS[0],
    avatar: { type: 'teeGoblin', color: '#d5a038', accent: '#b9821d' } },
  { name: 'FETCH', kick: 4, pace: 10, control: 7, skin: SKINS[1],
    avatar: { type: 'pup', color: '#d9b15c', accent: '#c99331' } },
  { name: 'INKY', kick: 7, pace: 6, control: 10, skin: SKINS[2],
    avatar: { type: 'octo', color: '#438f8d', accent: '#397f80' } },
  { name: 'EMBER', kick: 10, pace: 3, control: 5, skin: SKINS[3],
    avatar: { type: 'flame', color: '#f26a08', accent: '#a8241c' } },
  { name: 'NIBS', kick: 5, pace: 8, control: 8, skin: SKINS[4],
    avatar: { type: 'redCritter', color: '#b53135', accent: '#8d2328' } },
  { name: 'PUDGE', kick: 8, pace: 4, control: 9, skin: SKINS[0],
    avatar: { type: 'orangeOrb', color: '#c46b2c', accent: '#8f421d' } },
  { name: 'SMOKEY', kick: 6, pace: 6, control: 10, skin: SKINS[1],
    avatar: { type: 'chimney', color: '#242620', accent: '#a8241c' } },
  { name: 'BLIP', kick: 4, pace: 9, control: 9, skin: SKINS[2],
    avatar: { type: 'bean', color: '#3e9384', accent: '#277f91' } },
];

function clonePlayer(player) {
  return {
    ...player,
    avatar: player.avatar ? { ...player.avatar } : null,
  };
}

function shuffledPlayers() {
  const copy = PLAYER_POOL.map(clonePlayer);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createRandomTeams() {
  const players = shuffledPlayers();
  return {
    playerTeam: {
      name: 'PARKSIDE KICKS',
      primary: '#06d6a0',
      secondary: '#073b4c',
      players: players.slice(0, 5),
    },
    cpuTeam: {
      name: 'ALLEY ATHLETIC',
      primary: '#ef476f',
      secondary: '#fff4d6',
      players: players.slice(5, 10),
    },
  };
}

export function drawPlayer(ctx, x, y, team, player, size = 17, active = false) {
  const bob = active ? Math.sin(Date.now() / 90) * 2 : 0;
  const avatar = player.avatar;
  const bodyColor = avatar?.color ?? player.skin;
  const trim = avatar?.accent ?? team.secondary;

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 11, size * 0.78, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = avatar ? bodyColor : '#222';
  ctx.beginPath();
  ctx.roundRect(-size * 0.32, 2, size * 0.18, size * 0.58, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(size * 0.14, 2, size * 0.18, size * 0.58, 3);
  ctx.fill();

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(-size * 0.23, size * 0.64, size * 0.19, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(size * 0.24, size * 0.64, size * 0.19, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = avatar ? bodyColor : player.skin;
  ctx.beginPath();
  ctx.roundRect(-size * 0.56, -size * 0.34, size * 0.2, size * 0.5, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(size * 0.36, -size * 0.34, size * 0.2, size * 0.5, 4);
  ctx.fill();

  ctx.fillStyle = team.primary;
  ctx.beginPath();
  ctx.roundRect(-size * 0.5, -size * 0.6, size, size * 0.86, 5);
  ctx.fill();

  ctx.fillStyle = team.secondary;
  ctx.fillRect(-size * 0.42, -size * 0.5, size * 0.84, size * 0.12);
  ctx.fillStyle = trim;
  ctx.fillRect(-size * 0.09, -size * 0.56, size * 0.18, size * 0.78);

  ctx.font = `bold ${size * 0.42}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = team.secondary;
  ctx.fillText(player.name[0], 0, -size * 0.16);

  drawHead(ctx, 0, 0, size, avatar?.type, bodyColor, player.skin);

  if (active) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -size * 0.28, size * 0.98, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHead(ctx, x, y, size, type, color, fallbackSkin) {
  const cy = y - size * 1.08;
  ctx.fillStyle = color ?? fallbackSkin;

  if (type === 'dog') {
    ctx.beginPath(); ctx.ellipse(x, cy, size * 0.58, size * 0.47, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + size * 0.48, cy - size * 0.22, size * 0.25, size * 0.48, -0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#173b3c';
    ctx.beginPath(); ctx.ellipse(x + size * 0.32, cy + size * 0.05, size * 0.12, size * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'ghost') {
    ctx.beginPath(); ctx.roundRect(x - size * 0.43, cy - size * 0.55, size * 0.86, size * 1.04, size * 0.18); ctx.fill();
    ctx.fillStyle = '#090b09';
    ctx.beginPath(); ctx.ellipse(x - size * 0.17, cy - size * 0.12, size * 0.1, size * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + size * 0.17, cy - size * 0.12, size * 0.1, size * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, cy + size * 0.2, size * 0.12, size * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    return;
  } else if (type === 'alien') {
    ctx.beginPath(); ctx.ellipse(x, cy, size * 0.43, size * 0.58, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8d5ad';
    ctx.beginPath(); ctx.arc(x - size * 0.17, cy - size * 0.08, size * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + size * 0.17, cy - size * 0.08, size * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20231d';
    ctx.beginPath(); ctx.arc(x - size * 0.17, cy - size * 0.08, size * 0.055, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + size * 0.17, cy - size * 0.08, size * 0.055, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'teeGoblin') {
    ctx.beginPath(); ctx.ellipse(x, cy, size * 0.55, size * 0.48, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.08, cy - size * 0.45);
    ctx.quadraticCurveTo(x + size * 0.08, cy - size * 1.03, x + size * 0.22, cy - size * 0.45);
    ctx.fill();
    ctx.fillStyle = '#3b2516';
    ctx.beginPath(); ctx.arc(x - size * 0.15, cy - size * 0.02, size * 0.055, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + size * 0.15, cy - size * 0.02, size * 0.055, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = size * 0.045;
    ctx.strokeStyle = '#3b2516';
    ctx.beginPath(); ctx.arc(x, cy + size * 0.08, size * 0.28, 0.12, Math.PI - 0.12); ctx.stroke();
    return;
  } else if (type === 'pup') {
    ctx.beginPath(); ctx.ellipse(x, cy, size * 0.46, size * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - size * 0.28, cy - size * 0.08, size * 0.17, size * 0.26, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + size * 0.28, cy - size * 0.08, size * 0.17, size * 0.26, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a2d18';
    ctx.beginPath(); ctx.ellipse(x, cy + size * 0.07, size * 0.11, size * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'octo') {
    ctx.beginPath(); ctx.ellipse(x, cy - size * 0.04, size * 0.48, size * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    [-0.34, -0.16, 0.08, 0.28].forEach((offset, i) => {
      ctx.beginPath();
      ctx.moveTo(x + size * offset, cy + size * 0.32);
      ctx.quadraticCurveTo(
        x + size * (offset + (i % 2 ? 0.2 : -0.15)),
        cy + size * 0.66,
        x + size * (offset + (i % 2 ? 0.34 : -0.28)),
        cy + size * 0.9
      );
      ctx.stroke();
    });
    ctx.lineCap = 'butt';
  } else if (type === 'redCritter') {
    ctx.beginPath(); ctx.ellipse(x, cy, size * 0.42, size * 0.62, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = size * 0.055;
    ctx.strokeStyle = color;
    [-0.25, 0.08].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(x + size * offset, cy - size * 0.48);
      ctx.quadraticCurveTo(x + size * (offset + 0.03), cy - size * 0.9, x + size * (offset + 0.18), cy - size * 1.08);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(x + size * 0.34, cy + size * 0.28);
    ctx.quadraticCurveTo(x + size * 0.73, cy + size * 0.42, x + size * 0.64, cy + size * 0.82);
    ctx.stroke();
  } else if (type === 'orangeOrb') {
    ctx.beginPath(); ctx.ellipse(x, cy, size * 0.56, size * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = size * 0.055;
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(x - size * 0.55, cy - size * 0.08); ctx.lineTo(x - size * 0.85, cy - size * 0.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + size * 0.55, cy - size * 0.08); ctx.lineTo(x + size * 0.85, cy - size * 0.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, cy + size * 0.48); ctx.lineTo(x - size * 0.1, cy + size * 0.9); ctx.stroke();
  } else if (type === 'chimney') {
    ctx.beginPath(); ctx.roundRect(x - size * 0.38, cy - size * 0.6, size * 0.76, size * 1.05, size * 0.08); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = size * 0.06;
    ctx.beginPath(); ctx.arc(x - size * 0.06, cy - size * 0.86, size * 0.25, 4.8, 6.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + size * 0.1, cy - size * 1.02, size * 0.2, 4.3, 5.7); ctx.stroke();
  } else if (type === 'bean') {
    ctx.beginPath(); ctx.ellipse(x, cy, size * 0.43, size * 0.6, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = size * 0.055;
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(x - size * 0.43, cy); ctx.lineTo(x - size * 0.7, cy + size * 0.04); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + size * 0.43, cy); ctx.lineTo(x + size * 0.7, cy + size * 0.04); ctx.stroke();
  } else if (type === 'fuzzy' || type === 'flame') {
    const points = 18;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2;
      const r = size * (i % 2 ? 0.48 : 0.58);
      const px = x + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    if (type === 'flame') {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.28, cy - size * 0.4);
      ctx.lineTo(x - size * 0.05, cy - size * 0.85);
      ctx.lineTo(x + size * 0.1, cy - size * 0.42);
      ctx.lineTo(x + size * 0.32, cy - size * 0.72);
      ctx.lineTo(x + size * 0.38, cy - size * 0.3);
      ctx.closePath(); ctx.fill();
    }
  } else {
    ctx.beginPath(); ctx.arc(x, cy, size * 0.45, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = type === 'fuzzy' || type === 'flame' ? '#e9bd35' : '#222';
  ctx.beginPath(); ctx.arc(x - size * 0.14, cy - size * 0.03, size * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + size * 0.14, cy - size * 0.03, size * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#34302b';
  ctx.lineWidth = size * 0.05;
  ctx.beginPath(); ctx.arc(x, cy + size * 0.12, size * 0.15, 0.15, Math.PI - 0.15); ctx.stroke();
}
