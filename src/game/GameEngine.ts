import type { Ball, Wall, GameState, Vector } from './types';
export type GameEvent = { type: 'hit' | 'wall' | 'win' | 'splash', data?: any };

// Constants
export const FRICTION = 0.985;
export const WALL_BOUNCE = 0.7;
export const BALL_BOUNCE = 0.85;
export const MAX_POWER = 25;
export const MIN_VELOCITY = 0.05;

export class Vec2 implements Vector {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(v: Vector): Vec2 { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v: Vector): Vec2 { return new Vec2(this.x - v.x, this.y - v.y); }
  mult(n: number): Vec2 { return new Vec2(this.x * n, this.y * n); }
  mag(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }
  norm(): Vec2 { 
    const m = this.mag(); 
    return m === 0 ? new Vec2(0,0) : this.mult(1/m); 
  }
  dist(v: Vector): number { 
    return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2)); 
  }
  dot(v: Vector): number { return this.x * v.x + this.y * v.y; }
}

export class GameEngine {
  walls: Wall[] = [];
  events: GameEvent[] = [];
  bounds: { width: number; height: number; cx: number; cy: number; rx: number; ry: number };

  constructor(width: number, height: number) {
    const padding = 50;
    const maxWidth = 800;
    const w = Math.min(width - padding, maxWidth);
    const h = Math.min(height - padding, w * 0.7);
    
    this.bounds = {
      width: w,
      height: h,
      cx: width / 2,
      cy: height / 2,
      rx: w / 2,
      ry: h / 2
    };

    this.createWalls();
  }

  createWalls() {
    const { cx, cy, rx, ry } = this.bounds;
    const wallThick = 35;
    const wallLen = rx * 1.1;

    this.walls = [
      { pos: { x: cx - rx, y: cy }, w: wallThick, h: wallLen, type: 'vertical' },
      { pos: { x: cx + rx, y: cy }, w: wallThick, h: wallLen, type: 'vertical' },
      { pos: { x: cx, y: cy - ry }, w: wallLen * 0.6, h: wallThick, type: 'horizontal' },
      { pos: { x: cx, y: cy + ry }, w: wallLen * 0.6, h: wallThick, type: 'horizontal' }
    ];
  }

  initGame(): GameState {
    const balls: Ball[] = [];
    const r = this.bounds.width * 0.035;
    const count = 12;
    const circleR = this.bounds.ry * 0.55;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const x = this.bounds.cx + Math.cos(angle) * circleR;
      const y = this.bounds.cy + Math.sin(angle) * circleR;
      const p = (i % 2 === 0) ? 1 : 2;
      
      balls.push({
        id: i,
        player: p,
        pos: { x, y },
        vel: { x: 0, y: 0 },
        r,
        isDead: false,
        scale: 1,
        rotation: 0,
        animOffset: Math.random() * 100
      });
    }

    // Add extra balls
    balls.push({
      id: 99,
      player: 1,
      pos: { x: this.bounds.cx - r*1.5, y: this.bounds.cy },
      vel: { x: 0, y: 0 },
      r,
      isDead: false,
      scale: 1,
      rotation: 0,
      animOffset: Math.random() * 100
    });

    balls.push({
      id: 100,
      player: 2,
      pos: { x: this.bounds.cx + r*1.5, y: this.bounds.cy },
      vel: { x: 0, y: 0 },
      r,
      isDead: false,
      scale: 1,
      rotation: 0,
      animOffset: Math.random() * 100
    });

    return {
      balls,
      walls: this.walls,
      turn: 1,
      scores: { p1: 7, p2: 7 },
      status: 'playing'
    };
  }

  update(state: GameState): { state: GameState, events: GameEvent[] } {
    this.events = [];
    const newState = { ...state, balls: [...state.balls], walls: state.walls };
    // let moving = false;

    // Update balls
    newState.balls.forEach(b => {
      if (b.isDead) {
        if (b.scale > 0) b.scale -= 0.1;
        return;
      }

      const pos = new Vec2(b.pos.x, b.pos.y);
      let vel = new Vec2(b.vel.x, b.vel.y);

      pos.x += vel.x;
      pos.y += vel.y;
      vel = vel.mult(FRICTION);

      b.rotation += vel.x * 0.1;

      if (vel.mag() < MIN_VELOCITY) {
        vel = new Vec2(0, 0);
      }

      b.pos = pos;
      b.vel = vel;

      // Check Walls
      this.walls.forEach(w => this.checkWallCollision(b, w));

      // Check Bounds
      const { cx, cy, rx, ry } = this.bounds;
      // Stricter bounds check: if center of ball passes the island edge, it dies.
      // This prevents balls from "floating" or getting stuck in the void.
      if (b.pos.x < cx - rx || b.pos.x > cx + rx ||
          b.pos.y < cy - ry || b.pos.y > cy + ry) {
        if (!b.isDead) {
          b.isDead = true;
          this.events.push({ type: 'splash', data: b.player });
        }
      }
    });

    this.checkBallCollisions(newState.balls);
    this.updateScores(newState);

    return { state: newState, events: this.events };
  }

  checkWallCollision(ball: Ball, wall: Wall) {
    let testX = ball.pos.x;
    let testY = ball.pos.y;
    
    const rx = wall.pos.x - wall.w/2;
    const ry = wall.pos.y - wall.h/2;
    
    if (ball.pos.x < rx) testX = rx;
    else if (ball.pos.x > rx + wall.w) testX = rx + wall.w;
    
    if (ball.pos.y < ry) testY = ry;
    else if (ball.pos.y > ry + wall.h) testY = ry + wall.h;
    
    const distX = ball.pos.x - testX;
    const distY = ball.pos.y - testY;
    const distance = Math.sqrt((distX*distX) + (distY*distY));
    
    if (distance <= ball.r) {
      const overlap = ball.r - distance;
      let nx = distX / distance;
      let ny = distY / distance;
      
      if (distance === 0) { nx = 1; ny = 0; }

      ball.pos.x += nx * overlap;
      ball.pos.y += ny * overlap;

      let n = new Vec2(nx, ny);
      if (Math.abs(distX) > Math.abs(distY)) {
        n = new Vec2(Math.sign(distX), 0);
      } else {
        n = new Vec2(0, Math.sign(distY));
      }
      
      const v = new Vec2(ball.vel.x, ball.vel.y);
      const vDotN = v.dot(n);
      
      if (vDotN < 0) {
        const newVel = v.sub(n.mult(2 * vDotN)).mult(WALL_BOUNCE);
        ball.vel = newVel;
        this.events.push({ type: 'wall' });
      }
    }
  }

  checkBallCollisions(balls: Ball[]) {
    // Static resolution
    for (let k=0; k<2; k++) {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];
          if (b1.isDead || b2.isDead) continue;

          const v1 = new Vec2(b1.pos.x, b1.pos.y);
          const v2 = new Vec2(b2.pos.x, b2.pos.y);
          const distV = v1.sub(v2);
          const dist = distV.mag();
          const minDist = b1.r + b2.r;

          if (dist < minDist) {
            const overlap = minDist - dist;
            const n = distV.norm();
            const correction = n.mult(overlap * 0.51);
            
            b1.pos.x += correction.x;
            b1.pos.y += correction.y;
            b2.pos.x -= correction.x;
            b2.pos.y -= correction.y;
          }
        }
      }
    }

    // Dynamic resolution
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const b1 = balls[i];
        const b2 = balls[j];
        if (b1.isDead || b2.isDead) continue;
        
        const v1 = new Vec2(b1.pos.x, b1.pos.y);
        const v2 = new Vec2(b2.pos.x, b2.pos.y);
        const dist = v1.dist(v2);
        const minDist = b1.r + b2.r + 1;

        if (dist <= minDist) {
          const n = v1.sub(v2).norm();
          const vel1 = new Vec2(b1.vel.x, b1.vel.y);
          const vel2 = new Vec2(b2.vel.x, b2.vel.y);
          const vRel = vel1.sub(vel2);
          const speed = vRel.dot(n);

          if (speed > 0) continue;

          const impulseScalar = -(1 + BALL_BOUNCE) * speed / 2;
          const impulse = n.mult(impulseScalar);
          
          b1.vel = vel1.add(impulse);
          b2.vel = vel2.sub(impulse);
        }
      }
    }
  }

  updateScores(state: GameState) {
    state.scores.p1 = state.balls.filter(b => b.player === 1 && !b.isDead).length;
    state.scores.p2 = state.balls.filter(b => b.player === 2 && !b.isDead).length;
    
    if (state.scores.p1 === 0) {
      state.status = 'finished';
      state.winner = 2;
    } else if (state.scores.p2 === 0) {
      state.status = 'finished';
      state.winner = 1;
      this.events.push({ type: 'win' });
    }
  }
}
