import { SKINS } from './constants.js';

const PLAYER_POOL = [
  { name: 'KYLE', kick: 8, pace: 6, control: 7, skin: SKINS[0], hair: '#2d2118' },
  { name: 'JESS', kick: 5, pace: 10, control: 8, skin: SKINS[1], hair: '#1d1d1d' },
  { name: 'MARCUS', kick: 7, pace: 7, control: 7, skin: SKINS[2], hair: '#3a2417' },
  { name: 'TARA', kick: 6, pace: 8, control: 9, skin: SKINS[3], hair: '#111' },
  { name: 'DEVON', kick: 10, pace: 4, control: 6, skin: SKINS[4], hair: '#5b2b13' },
  { name: 'PIP', kick: 4, pace: 9, control: 9, skin: SKINS[0], hair: '#634126' },
  { name: 'NOVA', kick: 9, pace: 5, control: 7, skin: SKINS[1], hair: '#2f2017' },
  { name: 'MILO', kick: 6, pace: 8, control: 7, skin: SKINS[2], hair: '#171717' },
  { name: 'ZEE', kick: 7, pace: 6, control: 10, skin: SKINS[3], hair: '#4a2412' },
  { name: 'RAY', kick: 8, pace: 7, control: 5, skin: SKINS[4], hair: '#25190f' },
];

function clonePlayer(player) {
  return { ...player };
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
  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 11, size * 0.75, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.roundRect(-size * 0.32, 3, size * 0.18, size * 0.55, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(size * 0.14, 3, size * 0.18, size * 0.55, 3);
  ctx.fill();

  ctx.fillStyle = player.skin;
  ctx.beginPath();
  ctx.roundRect(-size * 0.55, -size * 0.36, size * 0.22, size * 0.5, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(size * 0.33, -size * 0.36, size * 0.22, size * 0.5, 4);
  ctx.fill();

  ctx.fillStyle = team.primary;
  ctx.beginPath();
  ctx.roundRect(-size * 0.48, -size * 0.58, size * 0.96, size * 0.85, 5);
  ctx.fill();
  ctx.fillStyle = team.secondary;
  ctx.fillRect(-size * 0.08, -size * 0.54, size * 0.16, size * 0.78);
  ctx.font = `bold ${size * 0.45}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(player.name[0], 0, -size * 0.18);

  ctx.fillStyle = player.skin;
  ctx.beginPath();
  ctx.arc(0, -size * 1.05, size * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.hair;
  ctx.beginPath();
  ctx.ellipse(0, -size * 1.25, size * 0.48, size * 0.24, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#171717';
  ctx.beginPath();
  ctx.arc(-size * 0.14, -size * 1.06, size * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.14, -size * 1.06, size * 0.045, 0, Math.PI * 2);
  ctx.fill();

  if (active) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -size * 0.28, size * 0.92, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
