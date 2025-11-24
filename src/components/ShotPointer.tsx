import type { Vector } from '../game/types';

export function drawAim(
  ctx: CanvasRenderingContext2D, 
  start: Vector, 
  dragCurrent: Vector, 
  _maxPower: number = 25
) {
  const aimVector = { x: start.x - dragCurrent.x, y: start.y - dragCurrent.y };
  const mag = Math.sqrt(aimVector.x * aimVector.x + aimVector.y * aimVector.y);
  
  let drawEnd = dragCurrent;
  if (mag > 200) {
    const scale = 200 / mag;
    drawEnd = {
      x: start.x - aimVector.x * scale,
      y: start.y - aimVector.y * scale
    };
  }

  // Draw dashed line (pullback)
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(drawEnd.x, drawEnd.y);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 10]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw power arrow
  const powerRatio = Math.min(mag, 200) / 200;
  const shootDir = { x: aimVector.x / mag, y: aimVector.y / mag };
  const arrowLen = 60 + (powerRatio * 150);
  const arrowEnd = {
    x: start.x + shootDir.x * arrowLen,
    y: start.y + shootDir.y * arrowLen
  };
  
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(arrowEnd.x, arrowEnd.y);
  
  const r = Math.floor(255 * powerRatio);
  const g = Math.floor(255 * (1 - powerRatio));
  ctx.strokeStyle = `rgb(${r}, ${g}, 0)`;
  ctx.lineWidth = 5 + (powerRatio * 5);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(arrowEnd.x, arrowEnd.y, 8, 0, Math.PI*2);
  ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
  ctx.fill();
}
