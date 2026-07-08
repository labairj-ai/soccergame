export const W = 390;
export const H = 700;
export const HUD_H = 74;
export const CTRL_Y = 560;

export const FIELD = {
  x: 24,
  y: HUD_H + 14,
  w: 342,
  h: CTRL_Y - HUD_H - 28,
};

export const GOAL_W = 108;
export const MATCH_SECONDS = 180;
export const HALVES = 2;

export const S = {
  MENU: 'menu',
  PLAYING: 'playing',
  GOAL: 'goal',
  HALFTIME: 'halftime',
  GAME_OVER: 'game_over',
};

export const OFFENSE_ACTIONS = [
  { id: 'pass', label: 'PASS', sub: 'find a teammate', color: '#ffd166' },
  { id: 'shoot', label: 'SHOOT', sub: 'test the keeper', color: '#ef476f' },
];

export const DEFENSE_ACTIONS = [
  { id: 'tackle', label: 'TACKLE', sub: 'close down', color: '#4cc9f0' },
  { id: 'slide', label: 'SLIDE', sub: 'long reach', color: '#f4a261' },
];

export const PLAYER_FORMATION = [
  { role: 'GK', x: 195, y: 515 },
  { role: 'D', x: 125, y: 452 },
  { role: 'D', x: 265, y: 452 },
  { role: 'M', x: 195, y: 365 },
  { role: 'F', x: 195, y: 270 },
];

export const CPU_FORMATION = [
  { role: 'GK', x: 195, y: 120 },
  { role: 'D', x: 125, y: 190 },
  { role: 'D', x: 265, y: 190 },
  { role: 'M', x: 195, y: 275 },
  { role: 'F', x: 195, y: 375 },
];

export const SKINS = ['#FDDCB4', '#D4956A', '#F0C27D', '#8D5524', '#C68642'];
