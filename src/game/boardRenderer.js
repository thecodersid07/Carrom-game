import { BOARD_CORNERS, BOARD_PLAYFIELD_INSET } from '../utils/constants';
import {
  getCoinRadius,
  getPocketRadius,
  getStrikerRadius,
  percentToCanvas,
} from './boardHelpers';

function createRoundedRectPath(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawCircle(ctx, x, y, radius, fillStyle) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawRing(ctx, x, y, radius, lineWidth, strokeStyle) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
}

function drawBoardFrame(ctx, size) {
  const frameRadius = percentToCanvas(size, 5.8);
  const surfaceInset = percentToCanvas(size, 3.3);

  const frameGradient = ctx.createLinearGradient(0, 0, size, size);
  frameGradient.addColorStop(0, '#70411c');
  frameGradient.addColorStop(0.5, '#8e5827');
  frameGradient.addColorStop(1, '#5f3415');

  ctx.fillStyle = frameGradient;
  createRoundedRectPath(ctx, 0, 0, size, size, frameRadius);
  ctx.fill();

  const surfaceGradient = ctx.createLinearGradient(
    surfaceInset,
    surfaceInset,
    size - surfaceInset,
    size - surfaceInset
  );
  surfaceGradient.addColorStop(0, '#efcf9f');
  surfaceGradient.addColorStop(0.52, '#ddb37a');
  surfaceGradient.addColorStop(1, '#d09a5a');

  ctx.fillStyle = surfaceGradient;
  createRoundedRectPath(
    ctx,
    surfaceInset,
    surfaceInset,
    size - surfaceInset * 2,
    size - surfaceInset * 2,
    percentToCanvas(size, 3.3)
  );
  ctx.fill();

  ctx.strokeStyle = 'rgba(120, 61, 22, 0.45)';
  ctx.lineWidth = percentToCanvas(size, 0.55);
  ctx.stroke();
}

function drawBoardMarkings(ctx, size) {
  const center = size / 2;

  drawRing(
    ctx,
    center,
    center,
    percentToCanvas(size, 13.5),
    percentToCanvas(size, 1),
    'rgba(140, 43, 33, 0.78)'
  );
  drawRing(
    ctx,
    center,
    center,
    percentToCanvas(size, 16),
    percentToCanvas(size, 0.7),
    'rgba(255, 240, 214, 0.45)'
  );
  drawCircle(
    ctx,
    center,
    center,
    percentToCanvas(size, 2.75),
    '#8b2f29'
  );
  drawRing(
    ctx,
    center,
    center,
    percentToCanvas(size, 4.2),
    percentToCanvas(size, 0.45),
    'rgba(253, 233, 202, 0.75)'
  );

  ctx.strokeStyle = 'rgba(128, 47, 37, 0.45)';
  ctx.lineWidth = percentToCanvas(size, 0.5);
  ctx.strokeRect(
    percentToCanvas(size, 16),
    percentToCanvas(size, 16),
    percentToCanvas(size, 68),
    percentToCanvas(size, 68)
  );

  ctx.strokeStyle = 'rgba(128, 47, 37, 0.28)';
  ctx.strokeRect(
    percentToCanvas(size, 28),
    percentToCanvas(size, 28),
    percentToCanvas(size, 44),
    percentToCanvas(size, 44)
  );

  ctx.strokeStyle = 'rgba(128, 47, 37, 0.4)';
  ctx.lineWidth = percentToCanvas(size, 0.35);
  ctx.beginPath();
  ctx.moveTo(percentToCanvas(size, 26.7), percentToCanvas(size, 26.7));
  ctx.lineTo(percentToCanvas(size, 73.3), percentToCanvas(size, 73.3));
  ctx.moveTo(percentToCanvas(size, 73.3), percentToCanvas(size, 26.7));
  ctx.lineTo(percentToCanvas(size, 26.7), percentToCanvas(size, 73.3));
  ctx.stroke();

  ctx.strokeStyle = 'rgba(128, 47, 37, 0.55)';
  ctx.beginPath();
  ctx.moveTo(percentToCanvas(size, 20), percentToCanvas(size, 21));
  ctx.lineTo(percentToCanvas(size, 80), percentToCanvas(size, 21));
  ctx.moveTo(percentToCanvas(size, 20), percentToCanvas(size, 79));
  ctx.lineTo(percentToCanvas(size, 80), percentToCanvas(size, 79));
  ctx.stroke();

  drawCornerArrows(ctx, size);
}

function drawCornerArrows(ctx, size) {
  const arrows = [
    { x: 18, y: 18, rotation: 45 },
    { x: 82, y: 18, rotation: 135 },
    { x: 18, y: 82, rotation: -45 },
    { x: 82, y: 82, rotation: -135 },
  ];

  ctx.strokeStyle = 'rgba(128, 47, 37, 0.65)';
  ctx.lineWidth = percentToCanvas(size, 0.5);

  arrows.forEach((arrow) => {
    ctx.save();
    ctx.translate(percentToCanvas(size, arrow.x), percentToCanvas(size, arrow.y));
    ctx.rotate((arrow.rotation * Math.PI) / 180);
    const arm = percentToCanvas(size, 9);
    ctx.beginPath();
    ctx.moveTo(0, arm);
    ctx.lineTo(0, 0);
    ctx.lineTo(arm, 0);
    ctx.stroke();
    ctx.restore();
  });
}

function drawPockets(ctx, size) {
  const pocketRadius = getPocketRadius(size);
  const playfieldInset = percentToCanvas(size, BOARD_PLAYFIELD_INSET);
  const pocketOffset = playfieldInset + pocketRadius * 0.98;
  const positions = {
    'top-left': [pocketOffset, pocketOffset],
    'top-right': [size - pocketOffset, pocketOffset],
    'bottom-left': [pocketOffset, size - pocketOffset],
    'bottom-right': [size - pocketOffset, size - pocketOffset],
  };

  BOARD_CORNERS.forEach((corner) => {
    const [x, y] = positions[corner];
    const outerRadius = pocketRadius * 1.08;
    const innerRadius = pocketRadius * 0.88;

    const glowGradient = ctx.createRadialGradient(
      x,
      y,
      innerRadius * 0.4,
      x,
      y,
      outerRadius * 1.45
    );
    glowGradient.addColorStop(0, 'rgba(255, 228, 186, 0.04)');
    glowGradient.addColorStop(0.7, 'rgba(94, 54, 20, 0.12)');
    glowGradient.addColorStop(1, 'rgba(94, 54, 20, 0)');

    const collarGradient = ctx.createRadialGradient(
      x - outerRadius * 0.16,
      y - outerRadius * 0.16,
      outerRadius * 0.12,
      x,
      y,
      outerRadius
    );
    collarGradient.addColorStop(0, '#8b5825');
    collarGradient.addColorStop(0.6, '#5a3213');
    collarGradient.addColorStop(1, '#301707');

    const pocketGradient = ctx.createRadialGradient(
      x - innerRadius * 0.12,
      y - innerRadius * 0.14,
      innerRadius * 0.08,
      x,
      y,
      innerRadius
    );
    pocketGradient.addColorStop(0, '#2a160d');
    pocketGradient.addColorStop(0.38, '#120905');
    pocketGradient.addColorStop(1, '#040302');

    drawCircle(ctx, x, y, outerRadius * 1.22, glowGradient);
    drawCircle(ctx, x, y, outerRadius, collarGradient);
    drawCircle(ctx, x, y, innerRadius, pocketGradient);
    drawRing(
      ctx,
      x,
      y,
      outerRadius,
      Math.max(1.05, percentToCanvas(size, 0.26)),
      'rgba(255, 229, 193, 0.16)'
    );
    drawRing(
      ctx,
      x,
      y,
      innerRadius * 0.96,
      Math.max(0.95, percentToCanvas(size, 0.18)),
      'rgba(255, 246, 224, 0.08)'
    );

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    drawCircle(
      ctx,
      x - innerRadius * 0.22,
      y - innerRadius * 0.24,
      innerRadius * 0.16,
      'rgba(255, 235, 206, 0.08)'
    );
    ctx.restore();
  });
}

function getCoinPalette(type) {
  if (type === 'black') {
    return {
      base: '#2a2a2a',
      edge: '#111111',
      highlight: 'rgba(255, 255, 255, 0.2)',
      ring: 'rgba(255, 255, 255, 0.08)',
    };
  }

  if (type === 'queen') {
    return {
      base: '#b32822',
      edge: '#811712',
      highlight: 'rgba(255, 219, 199, 0.35)',
      ring: 'rgba(255, 238, 214, 0.5)',
    };
  }

  return {
    base: '#f3eadb',
    edge: '#d7c5aa',
    highlight: 'rgba(255, 255, 255, 0.5)',
    ring: 'rgba(115, 79, 49, 0.14)',
  };
}

function drawCoin(ctx, size, coin) {
  const x = percentToCanvas(size, coin.x);
  const y = percentToCanvas(size, coin.y);
  const radius = getCoinRadius(size, coin.type);
  const palette = getCoinPalette(coin.type);

  const gradient = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.4,
    radius * 0.1,
    x,
    y,
    radius
  );
  gradient.addColorStop(0, palette.highlight);
  gradient.addColorStop(0.35, palette.base);
  gradient.addColorStop(1, palette.edge);

  drawCircle(ctx, x, y, radius, gradient);
  drawRing(ctx, x, y, radius * 0.66, Math.max(1, radius * 0.12), palette.ring);
}

function drawStriker(ctx, size, striker, isDimmed = false, isPerfectShotActive = false) {
  const x = percentToCanvas(size, striker.x);
  const y = percentToCanvas(size, striker.y);
  const radius = getStrikerRadius(size);

  if (isPerfectShotActive) {
    ctx.save();
    ctx.shadowColor = 'rgba(102, 217, 120, 0.75)';
    ctx.shadowBlur = radius * 1.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    drawCircle(ctx, x, y, radius * 0.98, 'rgba(176, 255, 186, 0.3)');
    ctx.restore();
  }

  const gradient = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.4,
    radius * 0.2,
    x,
    y,
    radius
  );
  gradient.addColorStop(0, isDimmed ? '#d9d2c4' : '#fffdf8');
  gradient.addColorStop(0.5, isDimmed ? '#c7baa4' : '#efe1c8');
  gradient.addColorStop(1, isDimmed ? '#aa9478' : '#d2b896');

  drawCircle(ctx, x, y, radius, gradient);
  drawRing(
    ctx,
    x,
    y,
    radius * 0.7,
    Math.max(1.5, radius * 0.14),
    isDimmed
      ? 'rgba(108, 89, 66, 0.72)'
      : isPerfectShotActive
        ? 'rgba(71, 163, 84, 0.9)'
        : 'rgba(153, 69, 45, 0.62)'
  );
  drawCircle(
    ctx,
    x,
    y,
    radius * 0.28,
    isDimmed ? '#6e6354' : isPerfectShotActive ? '#4fae58' : '#9b3728'
  );
}

function drawAimGuide(ctx, size, aimState, striker) {
  if (!aimState?.isDragging) {
    return;
  }

  const strikerX = percentToCanvas(size, striker.x);
  const strikerY = percentToCanvas(size, striker.y);
  const pullEndX = aimState.pointerX;
  const pullEndY = aimState.pointerY;
  const aimVectorX = strikerX - pullEndX;
  const aimVectorY = strikerY - pullEndY;
  const aimLength = Math.hypot(aimVectorX, aimVectorY);

  if (aimLength < 1) {
    return;
  }

  const normalizedAimX = aimVectorX / aimLength;
  const normalizedAimY = aimVectorY / aimLength;
  const arrowStartOffset = getStrikerRadius(size) * 1.2;
  const arrowLength = Math.min(size * 0.22, Math.max(size * 0.12, aimLength * 0.9));
  const guideEndX = strikerX + normalizedAimX * (arrowStartOffset + arrowLength);
  const guideEndY = strikerY + normalizedAimY * (arrowStartOffset + arrowLength);
  const arrowStartX = strikerX + normalizedAimX * arrowStartOffset;
  const arrowStartY = strikerY + normalizedAimY * arrowStartOffset;
  const guideGradient = ctx.createLinearGradient(
    arrowStartX,
    arrowStartY,
    guideEndX,
    guideEndY
  );
  guideGradient.addColorStop(0, 'rgba(255, 248, 234, 0.78)');
  guideGradient.addColorStop(1, 'rgba(155, 55, 40, 0.96)');

  ctx.save();
  ctx.strokeStyle = guideGradient;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2.5, size * 0.007);
  ctx.beginPath();
  ctx.moveTo(arrowStartX, arrowStartY);
  ctx.lineTo(guideEndX, guideEndY);
  ctx.stroke();

  const arrowHeadLength = Math.max(12, size * 0.03);
  const arrowHeadAngle = Math.PI / 7;
  const arrowAngle = Math.atan2(normalizedAimY, normalizedAimX);

  ctx.fillStyle = 'rgba(155, 55, 40, 0.96)';
  ctx.beginPath();
  ctx.moveTo(guideEndX, guideEndY);
  ctx.lineTo(
    guideEndX - Math.cos(arrowAngle - arrowHeadAngle) * arrowHeadLength,
    guideEndY - Math.sin(arrowAngle - arrowHeadAngle) * arrowHeadLength
  );
  ctx.lineTo(
    guideEndX - Math.cos(arrowAngle + arrowHeadAngle) * arrowHeadLength,
    guideEndY - Math.sin(arrowAngle + arrowHeadAngle) * arrowHeadLength
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawCircle(
    ctx,
    pullEndX,
    pullEndY,
    Math.max(5, size * 0.013),
    'rgba(155, 55, 40, 0.18)'
  );
  drawRing(
    ctx,
    pullEndX,
    pullEndY,
    Math.max(9, size * 0.024),
    Math.max(1.5, size * 0.004),
    'rgba(255, 248, 234, 0.78)'
  );
}

export function drawBoardScene(ctx, size, boardState, aimState, renderState = {}) {
  ctx.clearRect(0, 0, size, size);
  drawBoardFrame(ctx, size);
  drawBoardMarkings(ctx, size);
  drawPockets(ctx, size);

  boardState.coins.forEach((coin) => {
    drawCoin(ctx, size, coin);
  });

  if (!boardState.striker.isPocketed) {
    drawStriker(
      ctx,
      size,
      boardState.striker,
      renderState.dimStriker,
      renderState.perfectShotActive
    );
    drawAimGuide(ctx, size, aimState, boardState.striker);
  }
}
