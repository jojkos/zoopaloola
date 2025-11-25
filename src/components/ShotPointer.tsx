import type { Vector } from '../game/types';

export function drawAim(
  ctx: CanvasRenderingContext2D,
  start: Vector,
  dragCurrent: Vector,
  _maxPower: number = 25
) {
  const aimVector = { x: start.x - dragCurrent.x, y: start.y - dragCurrent.y };
  const mag = Math.sqrt(aimVector.x * aimVector.x + aimVector.y * aimVector.y);

  // --- 1. AIM DIRECTION (Dashed Line) ---
  // Drawn from ball in the direction of the shot
  let drawEnd = dragCurrent;
  if (mag > 200) {
    const scale = 200 / mag;
    drawEnd = {
      x: start.x - aimVector.x * scale,
      y: start.y - aimVector.y * scale
    };
  }

  // Calculate aim end point (opposite to drag)
  const aimEnd = {
    x: start.x + (start.x - drawEnd.x),
    y: start.y + (start.y - drawEnd.y)
  };

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(aimEnd.x, aimEnd.y);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // White dashed line for visibility
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 10]);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- 2. PULLBACK POWER (Colored Line) ---
  // Drawn from ball to drag position (like a rubber band)
  const powerRatio = Math.min(mag, 200) / 200;

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(drawEnd.x, drawEnd.y);

  // Gradient: Green (Low) -> Red (High)
  const r = Math.floor(255 * powerRatio);
  const g = Math.floor(255 * (1 - powerRatio));
  ctx.strokeStyle = `rgb(${r}, ${g}, 0)`;
  ctx.lineWidth = 5 + (powerRatio * 5);
  ctx.stroke();

  // Knob at the end
  ctx.beginPath();
  ctx.arc(drawEnd.x, drawEnd.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
  ctx.fill();
}
