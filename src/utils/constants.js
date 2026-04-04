export const APP_TITLE = 'Carrom Game';

export const APP_SUBTITLE =
  'A clean React + Vite structure ready for future carrom gameplay.';

export const BOARD_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export const STRIKER_SHOOTING_RANGE = {
  minX: 23,
  maxX: 77,
};

export const PLAYER_STRIKER_POSITIONS = {
  1: {
    x: 50,
    y: 82,
  },
  2: {
    x: 50,
    y: 18,
  },
};

export const STRIKER_SHOT_POWER = 0.13;
export const FRICTION_PER_FRAME = 0.985;
export const MIN_VELOCITY = 0.02;
export const WALL_BOUNCE_DAMPING = 0.92;
export const COLLISION_BOUNCE_DAMPING = 0.96;
export const MIN_SHOT_DRAG = 1.4;
export const MAX_SHOT_DRAG = 14;
export const STRIKER_INTERACTION_THRESHOLD = 1.5;

export const COIN_POSITIONS = [
  { id: 'queen', x: 50, y: 50, type: 'queen' },
  { id: 'inner-top', x: 50, y: 44.8, type: 'black' },
  { id: 'inner-top-right', x: 54.5, y: 47.4, type: 'white' },
  { id: 'inner-bottom-right', x: 54.5, y: 52.6, type: 'black' },
  { id: 'inner-bottom', x: 50, y: 55.2, type: 'white' },
  { id: 'inner-bottom-left', x: 45.5, y: 52.6, type: 'black' },
  { id: 'inner-top-left', x: 45.5, y: 47.4, type: 'white' },
  { id: 'outer-top', x: 50, y: 39.6, type: 'white' },
  { id: 'outer-top-right', x: 59, y: 44.8, type: 'black' },
  { id: 'outer-bottom-right', x: 59, y: 55.2, type: 'white' },
  { id: 'outer-bottom', x: 50, y: 60.4, type: 'black' },
  { id: 'outer-bottom-left', x: 41, y: 55.2, type: 'white' },
  { id: 'outer-top-left', x: 41, y: 44.8, type: 'black' },
];
