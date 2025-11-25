import React, { useRef, useEffect, useState } from 'react';
import type { GameState, Vector, Ball, Wall } from '../game/types';
import { drawAim } from './ShotPointer';

interface GameCanvasProps {
  gameState: GameState;
  playerId: 1 | 2;
  onShoot: (ballId: number, vector: Vector, power: number) => void;
  width: number;
  height: number;
  disabled?: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  playerId,
  onShoot,
  width,
  height,
  disabled = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // const [dragStart, setDragStart] = useState<Vector | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Vector | null>(null);
  const [selectedBall, setSelectedBall] = useState<Ball | null>(null);
  const [waterOffset, setWaterOffset] = useState(0);

  // Animation loop for water and rendering
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Translate to center
      ctx.save();
      ctx.translate(width / 2, height / 2);

      // Draw Island & Water
      drawIsland(ctx, width, height, waterOffset);

      // Draw Walls
      gameState.walls?.forEach(wall => drawWall(ctx, wall));

      // Draw Balls
      gameState.balls.forEach(ball => drawBall(ctx, ball, selectedBall?.id === ball.id));

      // Draw Aim
      if (isDragging && selectedBall && dragCurrent) {
        drawAim(ctx, selectedBall.pos, dragCurrent);
      }

      ctx.restore();

      setWaterOffset(prev => prev + 0.05);
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, isDragging, dragCurrent, selectedBall, width, height, waterOffset]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Vector => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // Map to centered coordinates
    return {
      x: clientX - r.left - width / 2,
      y: clientY - r.top - height / 2
    };
  };

  const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.status !== 'playing') return;
    if (disabled) return;
    // Only allow shooting if it's my turn
    if (gameState.turn !== playerId) return;

    const pos = getPos(e);

    // Find clicked ball
    const clickedBall = gameState.balls.find(b => {
      if (b.isDead || b.player !== playerId) return false;
      const dx = b.pos.x - pos.x;
      const dy = b.pos.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) < b.r * 1.5;
    });

    if (clickedBall) {
      setSelectedBall(clickedBall);
      setIsDragging(true);
      // setDragStart(pos);
      setDragCurrent(pos);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    setDragCurrent(getPos(e));
  };

  const handleUp = () => {
    if (!isDragging || !selectedBall || !dragCurrent) return;

    const aimVector = {
      x: selectedBall.pos.x - dragCurrent.x,
      y: selectedBall.pos.y - dragCurrent.y
    };
    const mag = Math.sqrt(aimVector.x * aimVector.x + aimVector.y * aimVector.y);

    if (mag > 10) {
      const MAX_POWER = 25;
      const power = Math.min(mag * 0.15, MAX_POWER);
      const norm = { x: aimVector.x / mag, y: aimVector.y / mag };

      onShoot(selectedBall.id, { x: norm.x * power, y: norm.y * power }, power);
    }

    setIsDragging(false);
    setSelectedBall(null);
    // setDragStart(null);
    setDragCurrent(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="shadow-2xl rounded-lg cursor-pointer touch-none"
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
      onTouchStart={handleDown}
      onTouchMove={handleMove}
      onTouchEnd={handleUp}
    />
  );
};

// Helper drawing functions (ported from original)
function drawIsland(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  // Water
  ctx.fillStyle = '#2b6cb0';
  // Fill relative to center
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Waves
  ctx.strokeStyle = '#4299e1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = -h / 2; y < h / 2; y += 50) {
    const shift = Math.sin((y + offset) * 0.04) * 25;
    ctx.moveTo(-w / 2, y);
    ctx.lineTo(w / 2, y + shift);
  }
  ctx.stroke();

  // Island logic (simplified for now, assuming centered)
  const padding = 50;
  const maxWidth = 800;
  const islandW = Math.min(w - padding, maxWidth);
  const islandH = Math.min(h - padding, islandW * 0.7);
  const cx = 0;
  const cy = 0;
  const rx = islandW / 2;
  const ry = islandH / 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.roundRect(cx - rx, cy - ry + 20, rx * 2, ry * 2, 40);
  ctx.fill();

  // Side
  ctx.fillStyle = '#90cdf4';
  ctx.beginPath();
  ctx.roundRect(cx - rx, cy - ry, rx * 2, ry * 2, 40);
  ctx.fill();

  // Top
  ctx.fillStyle = '#c3ddfd';
  ctx.beginPath();
  ctx.roundRect(cx - rx + 10, cy - ry + 10, rx * 2 - 20, ry * 2 - 20, 30);
  ctx.fill();

  // Logo
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("ZOO", cx, cy - 20);
  ctx.fillText("BUMPERS", cx, cy + 25);
}

function drawWall(ctx: CanvasRenderingContext2D, wall: Wall) {
  ctx.fillStyle = '#4a5568'; // stone
  ctx.strokeStyle = '#2d3748'; // stoneDark
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.roundRect(wall.pos.x - wall.w / 2, wall.pos.y - wall.h / 2, wall.w, wall.h, 8);
  ctx.fill();
  ctx.stroke();

  // Detail
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(wall.pos.x - wall.w / 4, wall.pos.y - wall.h / 4, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, isSelected: boolean) {
  if (ball.scale <= 0) return;

  ctx.save();
  ctx.translate(ball.pos.x, ball.pos.y);
  ctx.scale(ball.scale, ball.scale);
  ctx.rotate(ball.rotation * 0.15);

  // Body
  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = ball.player === 1 ? '#1a202c' : '#fefcbf'; // Penguin Black vs Monkey Beige
  if (ball.player === 2) ctx.fillStyle = '#fefcbf';
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (ball.player === 1) {
    // Penguin details
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(0, 3, ball.r * 0.7, ball.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(-5, -6, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -6, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ed8936';
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(0, 6);
    ctx.fill();
  } else {
    // Monkey details
    // Face (Heart shape-ish)
    ctx.fillStyle = '#fefcbf';
    ctx.beginPath();
    ctx.arc(-5, -2, 7, 0, Math.PI * 2);
    ctx.arc(5, -2, 7, 0, Math.PI * 2);
    ctx.ellipse(0, 3, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#d69e2e';
    ctx.beginPath(); ctx.arc(-13, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fefcbf';
    ctx.beginPath(); ctx.arc(-13, 0, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#d69e2e';
    ctx.beginPath(); ctx.arc(13, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fefcbf';
    ctx.beginPath(); ctx.arc(13, 0, 2, 0, Math.PI * 2); ctx.fill();

    // Eyes
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(-5, -1, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -1, 2.5, 0, Math.PI * 2); ctx.fill();

    // Mouth
    ctx.beginPath();
    ctx.arc(0, 5, 4, 0, Math.PI, false);
    ctx.strokeStyle = '#744210';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(0, 0, ball.r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}
