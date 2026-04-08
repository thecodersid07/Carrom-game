export const APP_TITLE = 'Carrom Game';

export const APP_SUBTITLE =
  'A clean React + Vite structure ready for future carrom gameplay.';

export const BOARD_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const BOARD_PLAYFIELD_INSET = 3.3;

export const STRIKER_SHOOTING_RANGE = {
  minX: 25,
  maxX: 75,
};

export const PLAYER_STRIKER_POSITIONS = {
  1: {
    x: 50,
    y: 79,
  },
  2: {
    x: 50,
    y: 21,
  },
};

export const QUEEN_HOME_POSITION = {
  x: 50,
  y: 50,
};

export const STRIKER_SHOT_POWER = 0.68;
export const SHOT_POWER_CURVE_EXPONENT = 0.82;
export const FRICTION_PER_FRAME = 0.968;
export const MIN_VELOCITY = 0.02;
export const WALL_BOUNCE_DAMPING = 0.84;
export const COLLISION_BOUNCE_DAMPING = 0.92;
export const COLLISION_TANGENTIAL_DAMPING = 0.95;
export const STRIKER_HIT_TRANSFER_BOOST = 1.24;
export const STRIKER_GLANCING_TRANSFER_BOOST = 1.18;
export const STRIKER_GLANCING_TANGENT_BOOST = 1.12;
export const MIN_SHOT_DRAG = 1.4;
export const MAX_SHOT_DRAG = 14;
export const STRIKER_INTERACTION_THRESHOLD = 1.5;
export const POWER_METER_CYCLE_MS = 1500;
export const STRIKER_PLACEMENT_BUFFER = 0.6;
export const STRIKER_SPAWN_PROTECTION_FRAMES = 2;
export const WINNING_SCORE = 160;
export const TURN_TIMER_SECONDS = 30;
export const PERFECT_SHOT_RANGE = {
  min: 0.45,
  max: 0.55,
};
export const PERFECT_SHOT_BOOST = 1.12;

export const COIN_POSITIONS = [
  { id: 'queen', x: 50, y: 50, type: 'queen' },
  { id: 'inner-top', x: 50, y: 45.6, type: 'black' },
  { id: 'inner-top-right', x: 53.8, y: 47.8, type: 'white' },
  { id: 'inner-bottom-right', x: 53.8, y: 52.2, type: 'black' },
  { id: 'inner-bottom', x: 50, y: 54.4, type: 'white' },
  { id: 'inner-bottom-left', x: 46.2, y: 52.2, type: 'black' },
  { id: 'inner-top-left', x: 46.2, y: 47.8, type: 'white' },
  { id: 'outer-01', x: 50, y: 41.2, type: 'white' },
  { id: 'outer-02', x: 54.4, y: 42.4, type: 'black' },
  { id: 'outer-03', x: 57.6, y: 45.6, type: 'white' },
  { id: 'outer-04', x: 58.8, y: 50, type: 'black' },
  { id: 'outer-05', x: 57.6, y: 54.4, type: 'white' },
  { id: 'outer-06', x: 54.4, y: 57.6, type: 'black' },
  { id: 'outer-07', x: 50, y: 58.8, type: 'white' },
  { id: 'outer-08', x: 45.6, y: 57.6, type: 'black' },
  { id: 'outer-09', x: 42.4, y: 54.4, type: 'white' },
  { id: 'outer-10', x: 41.2, y: 50, type: 'black' },
  { id: 'outer-11', x: 42.4, y: 45.6, type: 'white' },
  { id: 'outer-12', x: 45.6, y: 42.4, type: 'black' },
];
