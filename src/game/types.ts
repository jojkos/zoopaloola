export interface Vector {
  x: number;
  y: number;
}

export interface Ball {
  id: number;
  player: 1 | 2;
  pos: Vector;
  vel: Vector;
  r: number;
  isDead: boolean;
  scale: number;
  rotation: number;
  animOffset: number;
}

export interface Wall {
  pos: Vector;
  w: number;
  h: number;
  type: 'vertical' | 'horizontal';
}

export interface GameState {
  balls: Ball[];
  walls: Wall[];
  turn: 1 | 2;
  scores: {
    p1: number;
    p2: number;
  };
  status: 'waiting' | 'playing' | 'finished';
  winner?: 1 | 2;
}

export interface ShotVector {
  x: number;
  y: number;
  power: number;
}
