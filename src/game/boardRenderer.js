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

function drawEllipse(ctx, x, y, radiusX, radiusY, fillStyle) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function drawBoardFrame(ctx, size) {
  const frameRadius = percentToCanvas(size, 5.8);
  const surfaceInset = percentToCanvas(size, 3.3);

  const frameGradient = ctx.createLinearGradient(0, 0, size, size);
  frameGradient.addColorStop(0, '#4f2d16');
  frameGradient.addColorStop(0.32, '#7b4a26');
  frameGradient.addColorStop(0.68, '#9a6434');
  frameGradient.addColorStop(1, '#5c3317');

  ctx.fillStyle = frameGradient;
  createRoundedRectPath(ctx, 0, 0, size, size, frameRadius);
  ctx.fill();

  const surfaceGradient = ctx.createLinearGradient(
    surfaceInset,
    surfaceInset,
    size - surfaceInset,
    size - surfaceInset
  );
  surfaceGradient.addColorStop(0, '#e8c79a');
  surfaceGradient.addColorStop(0.4, '#d5ab74');
  surfaceGradient.addColorStop(0.72, '#c89458');
  surfaceGradient.addColorStop(1, '#b97f45');

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

  const grainCount = 9;
  for (let index = 0; index < grainCount; index += 1) {
    const y = surfaceInset + ((size - surfaceInset * 2) / grainCount) * (index + 0.5);
    const grainGradient = ctx.createLinearGradient(surfaceInset, y, size - surfaceInset, y);
    grainGradient.addColorStop(0, 'rgba(120, 70, 32, 0)');
    grainGradient.addColorStop(0.2, 'rgba(120, 70, 32, 0.08)');
    grainGradient.addColorStop(0.5, 'rgba(255, 236, 205, 0.06)');
    grainGradient.addColorStop(0.8, 'rgba(120, 70, 32, 0.1)');
    grainGradient.addColorStop(1, 'rgba(120, 70, 32, 0)');

    ctx.strokeStyle = grainGradient;
    ctx.lineWidth = percentToCanvas(size, 0.38);
    ctx.beginPath();
    ctx.moveTo(surfaceInset + percentToCanvas(size, 1.8), y);
    ctx.bezierCurveTo(
      size * 0.32,
      y - percentToCanvas(size, 0.45),
      size * 0.68,
      y + percentToCanvas(size, 0.45),
      size - surfaceInset - percentToCanvas(size, 1.8),
      y
    );
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(84, 46, 19, 0.55)';
  ctx.lineWidth = percentToCanvas(size, 0.55);
  ctx.stroke();
}

function drawBoardMarkings(ctx, size) {
  const center = size / 2;
  const baselineInset = percentToCanvas(size, 21);
  drawRing(
    ctx,
    center,
    center,
    percentToCanvas(size, 11.2),
    percentToCanvas(size, 1),
    'rgba(140, 43, 33, 0.78)'
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

  ctx.strokeStyle = 'rgba(128, 47, 37, 0.34)';
  ctx.lineWidth = percentToCanvas(size, 0.34);
  ctx.strokeRect(
    percentToCanvas(size, 16),
    percentToCanvas(size, 16),
    percentToCanvas(size, 68),
    percentToCanvas(size, 68)
  );

  ctx.strokeStyle = 'rgba(128, 47, 37, 0.18)';
  ctx.lineWidth = percentToCanvas(size, 0.22);
  ctx.strokeRect(
    percentToCanvas(size, 28),
    percentToCanvas(size, 28),
    percentToCanvas(size, 44),
    percentToCanvas(size, 44)
  );

  ctx.strokeStyle = 'rgba(128, 47, 37, 0.26)';
  ctx.lineWidth = percentToCanvas(size, 0.22);
  ctx.beginPath();
  ctx.moveTo(percentToCanvas(size, 27.3), percentToCanvas(size, 27.3));
  ctx.lineTo(percentToCanvas(size, 72.7), percentToCanvas(size, 72.7));
  ctx.moveTo(percentToCanvas(size, 72.7), percentToCanvas(size, 27.3));
  ctx.lineTo(percentToCanvas(size, 27.3), percentToCanvas(size, 72.7));
  ctx.stroke();

  drawStrikerLanes(ctx, size, baselineInset);
}

function drawStrikerLanes(ctx, size, baselineInset) {
  const innerRadiusPercent = 0.8;
  const ringWidth = percentToCanvas(size, 0.38);
  const strikerRadius = getStrikerRadius(size);
  const outerRadius = strikerRadius - ringWidth / 2;
  const laneSpanStart = percentToCanvas(size, 25);
  const laneSpanEnd = percentToCanvas(size, 75);
  const laneGap = strikerRadius * 2;
  const laneHalfGap = laneGap / 2;
  const innerRadius = percentToCanvas(size, innerRadiusPercent);
  const lineInset = outerRadius + percentToCanvas(size, 0.6);
  const leftLaneX = baselineInset - laneHalfGap;
  const rightLaneX = baselineInset + laneHalfGap;
  const topLaneY = baselineInset - laneHalfGap;
  const bottomLaneY = baselineInset + laneHalfGap;

  ctx.strokeStyle = 'rgba(146, 48, 39, 0.74)';
  ctx.lineWidth = percentToCanvas(size, 0.48);
  ctx.beginPath();
  ctx.moveTo(laneSpanStart + lineInset, topLaneY);
  ctx.lineTo(laneSpanEnd - lineInset, topLaneY);
  ctx.moveTo(laneSpanStart + lineInset, bottomLaneY);
  ctx.lineTo(laneSpanEnd - lineInset, bottomLaneY);
  ctx.moveTo(laneSpanStart + lineInset, size - topLaneY);
  ctx.lineTo(laneSpanEnd - lineInset, size - topLaneY);
  ctx.moveTo(laneSpanStart + lineInset, size - bottomLaneY);
  ctx.lineTo(laneSpanEnd - lineInset, size - bottomLaneY);
  ctx.moveTo(leftLaneX, laneSpanStart + lineInset);
  ctx.lineTo(leftLaneX, laneSpanEnd - lineInset);
  ctx.moveTo(rightLaneX, laneSpanStart + lineInset);
  ctx.lineTo(rightLaneX, laneSpanEnd - lineInset);
  ctx.moveTo(size - leftLaneX, laneSpanStart + lineInset);
  ctx.lineTo(size - leftLaneX, laneSpanEnd - lineInset);
  ctx.moveTo(size - rightLaneX, laneSpanStart + lineInset);
  ctx.lineTo(size - rightLaneX, laneSpanEnd - lineInset);
  ctx.stroke();

  const guidePoints = [
    { x: laneSpanStart, y: baselineInset },
    { x: laneSpanEnd, y: baselineInset },
    { x: laneSpanStart, y: size - baselineInset },
    { x: laneSpanEnd, y: size - baselineInset },
    { x: baselineInset, y: laneSpanStart },
    { x: baselineInset, y: laneSpanEnd },
    { x: size - baselineInset, y: laneSpanStart },
    { x: size - baselineInset, y: laneSpanEnd },
  ];

  guidePoints.forEach((guide) => {
    drawRing(
      ctx,
      guide.x,
      guide.y,
      outerRadius,
      ringWidth,
      'rgba(146, 48, 39, 0.88)'
    );
    drawCircle(ctx, guide.x, guide.y, innerRadius, 'rgba(146, 48, 39, 0.9)');
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
    const innerRadius = pocketRadius * 0.86;

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
      rim: '#08090b',
      outer: '#17191d',
      mid: '#31343b',
      core: '#0b0c0e',
      topHighlight: 'rgba(230, 234, 240, 0.2)',
      specular: 'rgba(255, 255, 255, 0.16)',
      border: 'rgba(255, 255, 255, 0.08)',
      bevelLight: 'rgba(255, 255, 255, 0.08)',
      bevelDark: 'rgba(0, 0, 0, 0.34)',
      grooveShadow: 'rgba(0, 0, 0, 0.48)',
      grooveLight: 'rgba(255, 255, 255, 0.14)',
      centerFill: '#1d2026',
      centerEdge: '#050506',
      shadow: 'rgba(28, 18, 10, 0.24)',
      glow: null,
    };
  }

  if (type === 'queen') {
    return {
      rim: '#82140f',
      outer: '#c11d16',
      mid: '#f54233',
      core: '#9c130f',
      topHighlight: 'rgba(255, 224, 214, 0.34)',
      specular: 'rgba(255, 247, 243, 0.24)',
      border: 'rgba(255, 230, 223, 0.22)',
      bevelLight: 'rgba(255, 238, 232, 0.16)',
      bevelDark: 'rgba(108, 13, 10, 0.24)',
      grooveShadow: 'rgba(109, 12, 8, 0.34)',
      grooveLight: 'rgba(255, 238, 232, 0.18)',
      centerFill: '#ea1f19',
      centerEdge: '#98110d',
      shadow: 'rgba(58, 18, 14, 0.24)',
      glow: 'rgba(211, 47, 39, 0.12)',
    };
  }

  return {
    rim: '#ddc8aa',
    outer: '#f2e0c4',
    mid: '#fff6e8',
    core: '#d8bf9f',
    topHighlight: 'rgba(255, 255, 255, 0.5)',
    specular: 'rgba(255, 255, 255, 0.3)',
    border: 'rgba(133, 101, 66, 0.16)',
    bevelLight: 'rgba(255, 255, 255, 0.18)',
    bevelDark: 'rgba(122, 89, 54, 0.16)',
    grooveShadow: 'rgba(151, 115, 74, 0.22)',
    grooveLight: 'rgba(255, 255, 255, 0.3)',
    centerFill: '#f7ead6',
    centerEdge: '#d4ba96',
    shadow: 'rgba(81, 57, 33, 0.18)',
    glow: null,
  };
}

function drawCoin(ctx, size, coin, renderOptions = {}) {
  const {
    opacity = 1,
    rotation = 0,
    scale = 1,
    xPercent = coin.x,
    yPercent = coin.y,
  } = renderOptions;
  const x = percentToCanvas(size, xPercent);
  const y = percentToCanvas(size, yPercent);
  const radius = getCoinRadius(size, coin.type) * scale;
  const palette = getCoinPalette(coin.type);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.translate(-x, -y);

  if (palette.glow) {
    ctx.save();
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = radius * 0.7;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    drawCircle(ctx, x, y, radius * 0.98, 'rgba(255, 255, 255, 0.02)');
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = palette.shadow;
  ctx.shadowBlur = radius * 0.5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(1, radius * 0.24);
  drawEllipse(ctx, x, y + radius * 0.22, radius * 0.9, radius * 0.4, 'rgba(50, 29, 12, 0.16)');
  ctx.restore();

  const bodyGradient = ctx.createRadialGradient(
    x - radius * 0.2,
    y - radius * 0.24,
    radius * 0.08,
    x,
    y,
    radius
  );
  bodyGradient.addColorStop(0, palette.mid);
  bodyGradient.addColorStop(0.42, palette.outer);
  bodyGradient.addColorStop(0.8, palette.core);
  bodyGradient.addColorStop(1, palette.rim);

  drawCircle(ctx, x, y, radius, bodyGradient);

  drawRing(ctx, x, y, radius * 0.98, Math.max(1, radius * 0.08), palette.border);

  const outerGroove = ctx.createRadialGradient(
    x - radius * 0.08,
    y - radius * 0.12,
    radius * 0.18,
    x,
    y,
    radius * 0.84
  );
  outerGroove.addColorStop(0, 'rgba(255, 255, 255, 0)');
  outerGroove.addColorStop(0.72, 'rgba(255, 255, 255, 0)');
  outerGroove.addColorStop(0.9, palette.grooveShadow);
  outerGroove.addColorStop(1, 'rgba(255, 255, 255, 0)');
  drawCircle(ctx, x, y, radius * 0.82, outerGroove);

  drawRing(ctx, x, y, radius * 0.63, Math.max(1, radius * 0.1), palette.grooveLight);
  drawRing(ctx, x, y, radius * 0.56, Math.max(1, radius * 0.075), palette.grooveShadow);
  drawRing(ctx, x, y, radius * 0.36, Math.max(1, radius * 0.08), palette.grooveLight);
  drawRing(ctx, x, y, radius * 0.29, Math.max(1, radius * 0.06), palette.grooveShadow);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const rimHighlight = ctx.createRadialGradient(
    x - radius * 0.24,
    y - radius * 0.3,
    radius * 0.04,
    x,
    y,
    radius * 0.92
  );
  rimHighlight.addColorStop(0, palette.bevelLight);
  rimHighlight.addColorStop(0.55, 'rgba(255, 255, 255, 0.05)');
  rimHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
  drawCircle(ctx, x, y, radius * 0.94, rimHighlight);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const topHighlight = ctx.createRadialGradient(
    x - radius * 0.18,
    y - radius * 0.24,
    radius * 0.02,
    x - radius * 0.04,
    y - radius * 0.08,
    radius * 0.42
  );
  topHighlight.addColorStop(0, palette.topHighlight);
  topHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.07)');
  topHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
  drawCircle(ctx, x, y, radius * 0.62, topHighlight);
  ctx.restore();

  const centerGradient = ctx.createRadialGradient(
    x - radius * 0.08,
    y - radius * 0.1,
    radius * 0.04,
    x,
    y,
    radius * 0.24
  );
  centerGradient.addColorStop(0, palette.mid);
  centerGradient.addColorStop(0.35, palette.centerFill);
  centerGradient.addColorStop(1, palette.centerEdge);
  drawCircle(ctx, x, y, radius * 0.24, centerGradient);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  drawEllipse(
    ctx,
    x - radius * 0.1,
    y - radius * 0.14,
    radius * 0.18,
    radius * 0.1,
    palette.specular
  );
  ctx.restore();
  ctx.restore();
}

function drawPocketAnimation(ctx, size, animation) {
  const easedProgress = easeInOutCubic(animation.progress);
  const pullProgress = Math.pow(easedProgress, 0.82);
  const xPercent =
    animation.startX + (animation.pocketX - animation.startX) * pullProgress;
  const yPercent =
    animation.startY + (animation.pocketY - animation.startY) * pullProgress;
  const scale = 1 - easedProgress * 0.7;
  const opacity = 1 - Math.max(0, easedProgress - 0.18) / 0.82;
  const sinkShadowScale = 1 + easedProgress * 1.3;
  const sinkShadowOpacity = (1 - easedProgress) * 0.22;
  const pocketRadius = getPocketRadius(size);
  const x = percentToCanvas(size, xPercent);
  const y = percentToCanvas(size, yPercent);

  ctx.save();
  ctx.globalAlpha = sinkShadowOpacity;
  drawEllipse(
    ctx,
    x,
    y,
    pocketRadius * 0.42 * sinkShadowScale,
    pocketRadius * 0.2 * sinkShadowScale,
    'rgba(28, 12, 5, 0.9)'
  );
  ctx.restore();

  drawCoin(ctx, size, animation, {
    opacity,
    rotation: animation.rotation,
    scale,
    xPercent,
    yPercent,
  });
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
  gradient.addColorStop(0, isDimmed ? '#efe4d1' : '#fff4df');
  gradient.addColorStop(0.55, isDimmed ? '#dcc6a3' : '#f3d6ab');
  gradient.addColorStop(1, isDimmed ? '#b39168' : '#d5ae75');

  drawCircle(ctx, x, y, radius, gradient);
  drawRing(
    ctx,
    x,
    y,
    radius * 0.94,
    Math.max(1.5, radius * 0.15),
    isDimmed
      ? 'rgba(151, 115, 78, 0.88)'
      : isPerfectShotActive
        ? 'rgba(71, 163, 84, 0.95)'
        : 'rgba(248, 237, 216, 0.9)'
  );
  drawRing(
    ctx,
    x,
    y,
    radius * 0.83,
    Math.max(1.1, radius * 0.07),
    isDimmed
      ? 'rgba(111, 22, 18, 0.76)'
      : isPerfectShotActive
        ? 'rgba(71, 163, 84, 0.9)'
        : 'rgba(162, 13, 15, 0.92)'
  );
  drawCircle(
    ctx,
    x,
    y,
    radius * 0.78,
    isDimmed ? 'rgba(132, 100, 72, 0.12)' : 'rgba(255, 246, 231, 0.22)'
  );
  drawRing(
    ctx,
    x,
    y,
    radius * 0.75,
    Math.max(1, radius * 0.06),
    isDimmed
      ? 'rgba(32, 27, 22, 0.72)'
      : isPerfectShotActive
        ? 'rgba(46, 118, 60, 0.9)'
        : 'rgba(20, 18, 17, 0.92)'
  );

  ctx.save();
  ctx.translate(x, y);

  for (let index = 0; index < 8; index += 1) {
    ctx.save();
    ctx.rotate((Math.PI / 4) * index);
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.16);
    ctx.lineTo(radius * 0.12, -radius * 0.16);
    ctx.lineTo(0, -radius * 0.64);
    ctx.lineTo(-radius * 0.12, -radius * 0.16);
    ctx.closePath();
    ctx.fillStyle =
      index % 2 === 0
        ? isDimmed
          ? '#8b2a27'
          : '#b40f17'
        : isDimmed
          ? '#26211d'
          : '#121212';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.24);
    ctx.lineTo(radius * 0.055, -radius * 0.24);
    ctx.lineTo(0, -radius * 0.41);
    ctx.lineTo(-radius * 0.055, -radius * 0.24);
    ctx.closePath();
    ctx.fillStyle = index % 2 === 0 ? '#f6ead7' : '#efe0c9';
    ctx.globalAlpha = isDimmed ? 0.35 : 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.strokeStyle = isDimmed ? 'rgba(129, 33, 27, 0.68)' : 'rgba(171, 14, 18, 0.9)';
  ctx.lineWidth = Math.max(1, radius * 0.055);
  ctx.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const startAngle = -Math.PI / 2 + index * (Math.PI / 4) + Math.PI / 12;
    const endAngle = startAngle + Math.PI / 6;
    ctx.arc(0, 0, radius * 0.6, startAngle, endAngle);
  }
  ctx.stroke();

  for (let index = 0; index < 8; index += 1) {
    const angle = -Math.PI / 2 + index * (Math.PI / 4);
    drawCircle(
      ctx,
      Math.cos(angle) * radius * 0.61,
      Math.sin(angle) * radius * 0.61,
      radius * 0.07,
      isDimmed ? '#2d2824' : '#111111'
    );
  }

  const centerGradient = ctx.createRadialGradient(
    -radius * 0.12,
    -radius * 0.14,
    radius * 0.04,
    0,
    0,
    radius * 0.28
  );
  centerGradient.addColorStop(0, isDimmed ? '#cf3e39' : '#f22b27');
  centerGradient.addColorStop(0.45, isDimmed ? '#a51012' : '#c30008');
  centerGradient.addColorStop(1, isDimmed ? '#5a0707' : '#6d0004');

  drawCircle(ctx, 0, 0, radius * 0.27, centerGradient);
  drawRing(
    ctx,
    0,
    0,
    radius * 0.27,
    Math.max(1.1, radius * 0.08),
    isDimmed ? 'rgba(92, 18, 16, 0.75)' : 'rgba(123, 7, 7, 0.95)'
  );
  drawCircle(ctx, 0, 0, radius * 0.09, isDimmed ? '#7d0d0d' : '#cc1112');

  ctx.restore();
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
  const strikerRadius = getStrikerRadius(size);

  if (aimLength < 1) {
    return;
  }

  const normalizedAimX = aimVectorX / aimLength;
  const normalizedAimY = aimVectorY / aimLength;
  const arrowStartOffset = strikerRadius * 1.2;
  const arrowLength = Math.min(size * 0.22, Math.max(size * 0.12, aimLength * 0.9));
  const guideEndX = strikerX + normalizedAimX * (arrowStartOffset + arrowLength);
  const guideEndY = strikerY + normalizedAimY * (arrowStartOffset + arrowLength);
  const arrowStartX = strikerX + normalizedAimX * arrowStartOffset;
  const arrowStartY = strikerY + normalizedAimY * arrowStartOffset;
  const pullLineStartX = strikerX - normalizedAimX * (strikerRadius * 0.9);
  const pullLineStartY = strikerY - normalizedAimY * (strikerRadius * 0.9);
  const pullGradient = ctx.createLinearGradient(
    pullLineStartX,
    pullLineStartY,
    pullEndX,
    pullEndY
  );
  pullGradient.addColorStop(0, 'rgba(108, 34, 25, 0.2)');
  pullGradient.addColorStop(0.45, 'rgba(155, 55, 40, 0.72)');
  pullGradient.addColorStop(1, 'rgba(255, 247, 234, 0.96)');
  const guideGradient = ctx.createLinearGradient(
    arrowStartX,
    arrowStartY,
    guideEndX,
    guideEndY
  );
  guideGradient.addColorStop(0, 'rgba(255, 248, 234, 0.78)');
  guideGradient.addColorStop(1, 'rgba(155, 55, 40, 0.96)');

  ctx.save();
  ctx.strokeStyle = pullGradient;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2.25, size * 0.006);
  ctx.beginPath();
  ctx.moveTo(pullLineStartX, pullLineStartY);
  ctx.lineTo(pullEndX, pullEndY);
  ctx.stroke();

  ctx.setLineDash([Math.max(7, size * 0.018), Math.max(5, size * 0.013)]);
  ctx.strokeStyle = 'rgba(255, 248, 234, 0.5)';
  ctx.lineWidth = Math.max(1.1, size * 0.0028);
  ctx.beginPath();
  ctx.moveTo(pullLineStartX, pullLineStartY);
  ctx.lineTo(pullEndX, pullEndY);
  ctx.stroke();
  ctx.setLineDash([]);

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

  boardState.pocketAnimations?.forEach((animation) => {
    drawPocketAnimation(ctx, size, animation);
  });

  if (!boardState.striker.isPocketed) {
    drawAimGuide(ctx, size, aimState, boardState.striker);
    drawStriker(
      ctx,
      size,
      boardState.striker,
      renderState.dimStriker,
      renderState.perfectShotActive
    );
  }
}
