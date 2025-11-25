import React, { useRef, useEffect, useState } from 'react';
import type { GameState, Vector, Ball, Wall } from '../game/types';
import { drawAim } from './ShotPointer';

interface GameCanvasProps {
  gameState: GameState;
  playerId: 1 | 2;
  onShoot: (ballId: number, vector: Vector, power: number) => void;
  width: number;
  height: number;
  logicalWidth?: number;
  logicalHeight?: number;
  disabled?: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  playerId,
  onShoot,
  width,
  height,
  logicalWidth = 800,
  logicalHeight = 600,
  disabled = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCurrent, setDragCurrent] = useState<Vector | null>(null);
  const [selectedBall, setSelectedBall] = useState<Ball | null>(null);
  const [waterOffset, setWaterOffset] = useState(0);

  // Local lock to prevent double-firing before parent updates 'disabled'
  const processingShot = useRef(false);

  // Reset local lock when disabled prop changes OR turn changes
  useEffect(() => {
    if (!disabled) {
      processingShot.current = false;
    }
  }, [disabled, gameState.turn]);

  // Calculate scale to fit logical game into display area
  // Reserve space for top UI (Turn indicator + scores)
  const TOP_UI_OFFSET = 140; // Approx height of top UI
  const availableHeight = height - TOP_UI_OFFSET;

  const scale = Math.min(width / logicalWidth, availableHeight / logicalHeight);

  // Center horizontally, but push down vertically by TOP_UI_OFFSET
  const offsetX = (width - logicalWidth * scale) / 2;
  const offsetY = TOP_UI_OFFSET + (availableHeight - logicalHeight * scale) / 2;

  // Animation loop for water and rendering
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // Clear
      ctx.clearRect(0, 0, width, height);

      ctx.save();

      // Apply scaling and centering
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Translate to center of logical game
      ctx.translate(logicalWidth / 2, logicalHeight / 2);

      // Draw Island & Water
      drawIsland(ctx, logicalWidth, logicalHeight, waterOffset);

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
  }, [gameState, isDragging, dragCurrent, selectedBall, width, height, logicalWidth, logicalHeight, scale, offsetX, offsetY, waterOffset]);

  const getPos = (clientX: number, clientY: number): Vector => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();

    // Map screen coordinates to logical coordinates
    const screenX = clientX - r.left;
    const screenY = clientY - r.top;
    const relativeX = screenX - offsetX;
    const relativeY = screenY - offsetY;
    const unscaledX = relativeX / scale;
    const unscaledY = relativeY / scale;

    return {
      x: unscaledX - logicalWidth / 2,
      y: unscaledY - logicalHeight / 2
    };
  };

  // Handle Window Events for Dragging
  useEffect(() => {
    if (!isDragging || !selectedBall) return;

    const handleWindowMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      setDragCurrent(getPos(clientX, clientY));
    };

    const handleWindowUp = (e: MouseEvent | TouchEvent) => {
      // Use the last known dragCurrent if available, or calculate from event
      // But dragCurrent state might be stale in closure if not careful?
      // Actually, we can just use the state dragCurrent if we include it in deps.
      // But better to rely on the event if possible? No, event is mouseup, might be anywhere.
      // We rely on dragCurrent state.

      if (selectedBall && dragCurrent) {
        const aimVector = {
          x: selectedBall.pos.x - dragCurrent.x,
          y: selectedBall.pos.y - dragCurrent.y
        };
        const mag = Math.sqrt(aimVector.x * aimVector.x + aimVector.y * aimVector.y);

        if (mag > 10) {
          const MAX_POWER = 25;
          const power = Math.min(mag * 0.15, MAX_POWER);
          const norm = { x: aimVector.x / mag, y: aimVector.y / mag };

          processingShot.current = true;
          onShoot(selectedBall.id, { x: norm.x * power, y: norm.y * power }, power);
        }
      }

      setIsDragging(false);
      setSelectedBall(null);
      setDragCurrent(null);
    };

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchmove', handleWindowMove, { passive: false });
    window.addEventListener('touchend', handleWindowUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('touchend', handleWindowUp);
    };
  }, [isDragging, selectedBall, dragCurrent, onShoot]); // Added dragCurrent to deps

  const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.status !== 'playing') return;
    if (disabled || processingShot.current) return;
    if (gameState.turn !== playerId) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const pos = getPos(clientX, clientY);

    const clickedBall = gameState.balls.find(b => {
      if (b.isDead || b.player !== playerId) return false;
      const dx = b.pos.x - pos.x;
      const dy = b.pos.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) < b.r * 1.5;
    });

    if (clickedBall) {
      setSelectedBall(clickedBall);
      setIsDragging(true);
      setDragCurrent(pos);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="shadow-2xl rounded-lg cursor-pointer touch-none"
      onMouseDown={handleDown}
      onTouchStart={handleDown}
    />
  );
};

// Helper drawing functions
function drawIsland(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  // Water
  ctx.fillStyle = '#2b6cb0';
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

  // Island logic
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
  ctx.fillText("Zoopa", cx, cy - 20);
  ctx.fillStyle = 'rgba(255,255,0,0.5)';
  ctx.fillText("LOLa", cx, cy + 25);
}

function drawWall(ctx: CanvasRenderingContext2D, wall: Wall) {
  ctx.fillStyle = '#4a5568';
  ctx.strokeStyle = '#2d3748';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.roundRect(wall.pos.x - wall.w / 2, wall.pos.y - wall.h / 2, wall.w, wall.h, 8);
  ctx.fill();
  ctx.stroke();

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
  ctx.fillStyle = ball.player === 1 ? '#1a202c' : '#d69e2e';
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
    ctx.fillStyle = '#fefcbf';
    ctx.beginPath();
    ctx.arc(-5, -2, 7, 0, Math.PI * 2);
    ctx.arc(5, -2, 7, 0, Math.PI * 2);
    ctx.ellipse(0, 3, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d69e2e';
    ctx.beginPath(); ctx.arc(-13, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fefcbf';
    ctx.beginPath(); ctx.arc(-13, 0, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#d69e2e';
    ctx.beginPath(); ctx.arc(13, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fefcbf';
    ctx.beginPath(); ctx.arc(13, 0, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(-5, -1, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -1, 2.5, 0, Math.PI * 2); ctx.fill();

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
