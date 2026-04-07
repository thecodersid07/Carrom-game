import { BOARD_PLAYFIELD_INSET } from '../utils/constants';

export function percentToCanvas(size, value) {
  return (size * value) / 100;
}

export function canvasToPercent(size, value) {
  return (value / size) * 100;
}

export function getCoinRadius(size, type) {
  return percentToCanvas(size, 2.35);
}

export function getStrikerRadius(size) {
  return percentToCanvas(size, 2.9);
}

export function getPocketRadius(size) {
  return percentToCanvas(size, 4.4);
}

export function isPointInsideCircle(pointX, pointY, circleX, circleY, radius) {
  return Math.hypot(pointX - circleX, pointY - circleY) <= radius;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCoinRadiusPercent(type) {
  return 2.35;
}

function getStrikerRadiusPercent() {
  return 2.7;
}

function getPocketCenters() {
  const pocketRadiusPercent = 4.4;
  const pocketOffset = BOARD_PLAYFIELD_INSET + pocketRadiusPercent * 0.98;

  return [
    { x: pocketOffset, y: pocketOffset },
    { x: 100 - pocketOffset, y: pocketOffset },
    { x: pocketOffset, y: 100 - pocketOffset },
    { x: 100 - pocketOffset, y: 100 - pocketOffset },
  ];
}

export function createInitialBoardState({
  coinPositions,
  strikerPosition,
  shootingRange,
  placementBuffer = 0,
  spawnProtectionFrames = 0,
}) {
  const boardState = {
    coins: coinPositions.map((coin) => ({
      ...coin,
      vx: 0,
      vy: 0,
    })),
    striker: {
      ...strikerPosition,
      vx: 0,
      vy: 0,
      isPocketed: false,
    },
    strikerHomePosition: { ...strikerPosition },
    pendingStrikerReset: false,
    shotInProgress: false,
    coinsPocketedThisTurn: 0,
    pocketedCoinTypesThisTurn: [],
    strikerPocketedThisTurn: false,
    strikerSpawnProtectionFrames: 0,
    strikerPlacementConfig: {
      shootingRange,
      placementBuffer,
      spawnProtectionFrames,
    },
  };

  placeStrikerSafely(
    boardState,
    strikerPosition,
    shootingRange,
    placementBuffer,
    spawnProtectionFrames
  );

  return boardState;
}

function canPlaceStrikerAt(boardState, candidateX, candidateY, bufferDistance) {
  const strikerRadius = getStrikerRadiusPercent();

  return !boardState.coins.some((coin) => {
    const minDistance =
      strikerRadius + getCoinRadiusPercent(coin.type) + bufferDistance;
    const distance = Math.hypot(candidateX - coin.x, candidateY - coin.y);

    return distance < minDistance;
  });
}

function getClosestTouchingPlacement(
  boardState,
  baselineY,
  minX,
  maxX,
  bufferDistance,
  preferredX,
  preferredDirection = 0
) {
  const strikerRadius = getStrikerRadiusPercent();
  const direction = preferredDirection === 0 ? 0 : Math.sign(preferredDirection);
  const placementCandidates = [];

  boardState.coins.forEach((coin) => {
    const minDistance =
      strikerRadius + getCoinRadiusPercent(coin.type) + bufferDistance;
    const verticalOffset = Math.abs(baselineY - coin.y);

    if (verticalOffset >= minDistance) {
      return;
    }

    const horizontalReach = Math.sqrt(minDistance ** 2 - verticalOffset ** 2);
    const leftCandidate = clamp(coin.x - horizontalReach, minX, maxX);
    const rightCandidate = clamp(coin.x + horizontalReach, minX, maxX);

    placementCandidates.push(leftCandidate, rightCandidate);
  });

  const validCandidates = placementCandidates
    .filter((candidateX) => canPlaceStrikerAt(boardState, candidateX, baselineY, bufferDistance))
    .map((candidateX) => ({
      x: candidateX,
      distance: Math.abs(candidateX - preferredX),
    }));

  if (validCandidates.length === 0) {
    return null;
  }

  const directionalCandidates =
    direction === 0
      ? validCandidates
      : validCandidates.filter(({ x }) =>
          direction < 0 ? x <= preferredX : x >= preferredX
        );

  const candidatesToSort =
    directionalCandidates.length > 0 ? directionalCandidates : validCandidates;

  candidatesToSort.sort((first, second) => first.distance - second.distance);

  return {
    x: candidatesToSort[0].x,
    y: baselineY,
  };
}

export function findSafeStrikerPlacement(
  boardState,
  strikerPosition,
  shootingRange,
  placementBuffer = 0,
  preferredDirection = 0
) {
  const baselineY = strikerPosition.y;
  const minX = shootingRange?.minX ?? getStrikerRadiusPercent();
  const maxX = shootingRange?.maxX ?? 100 - getStrikerRadiusPercent();
  const preferredX = clamp(strikerPosition.x, minX, maxX);
  const stepSize = 0.4;
  const scanDirection = preferredDirection === 0 ? 0 : Math.sign(preferredDirection);

  if (canPlaceStrikerAt(boardState, preferredX, baselineY, placementBuffer)) {
    return {
      x: preferredX,
      y: baselineY,
    };
  }

  const touchingPlacement = getClosestTouchingPlacement(
    boardState,
    baselineY,
    minX,
    maxX,
    placementBuffer,
    preferredX,
    preferredDirection
  );

  if (touchingPlacement) {
    return touchingPlacement;
  }

  if (scanDirection !== 0) {
    for (
      let candidateX = preferredX + stepSize * scanDirection;
      candidateX >= minX && candidateX <= maxX;
      candidateX += stepSize * scanDirection
    ) {
      if (canPlaceStrikerAt(boardState, candidateX, baselineY, placementBuffer)) {
        return {
          x: candidateX,
          y: baselineY,
        };
      }
    }

    return {
      x: clamp(boardState.striker.x, minX, maxX),
      y: baselineY,
    };
  }

  const maxOffset = Math.max(preferredX - minX, maxX - preferredX);

  for (let offset = stepSize; offset <= maxOffset + stepSize; offset += stepSize) {
    const leftX = clamp(preferredX - offset, minX, maxX);

    if (canPlaceStrikerAt(boardState, leftX, baselineY, placementBuffer)) {
      return {
        x: leftX,
        y: baselineY,
      };
    }

    const rightX = clamp(preferredX + offset, minX, maxX);

    if (canPlaceStrikerAt(boardState, rightX, baselineY, placementBuffer)) {
      return {
        x: rightX,
        y: baselineY,
      };
    }
  }

  return {
    x: preferredX,
    y: baselineY,
  };
}

function isCoinPlacementClear(boardState, candidateX, candidateY, coinType) {
  const candidateRadius = getCoinRadiusPercent(coinType);

  const overlapsCoin = boardState.coins.some((coin) => {
    const minDistance = candidateRadius + getCoinRadiusPercent(coin.type);
    const distance = Math.hypot(candidateX - coin.x, candidateY - coin.y);

    return distance < minDistance;
  });

  if (overlapsCoin) {
    return false;
  }

  if (!boardState.striker.isPocketed) {
    const strikerDistance = Math.hypot(
      candidateX - boardState.striker.x,
      candidateY - boardState.striker.y
    );
    const minStrikerDistance = candidateRadius + getStrikerRadiusPercent();

    if (strikerDistance < minStrikerDistance) {
      return false;
    }
  }

  return true;
}

export function respotCoin(
  boardState,
  coin,
  preferredPosition
) {
  const maxRadius = 18;
  const step = 1.2;

  if (isCoinPlacementClear(boardState, preferredPosition.x, preferredPosition.y, coin.type)) {
    boardState.coins.push({
      ...coin,
      x: preferredPosition.x,
      y: preferredPosition.y,
      vx: 0,
      vy: 0,
    });
    return;
  }

  for (let radius = step; radius <= maxRadius; radius += step) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const candidateX = clamp(preferredPosition.x + Math.cos(angle) * radius, 0, 100);
      const candidateY = clamp(preferredPosition.y + Math.sin(angle) * radius, 0, 100);

      if (isCoinPlacementClear(boardState, candidateX, candidateY, coin.type)) {
        boardState.coins.push({
          ...coin,
          x: candidateX,
          y: candidateY,
          vx: 0,
          vy: 0,
        });
        return;
      }
    }
  }

  boardState.coins.push({
    ...coin,
    x: preferredPosition.x,
    y: preferredPosition.y,
    vx: 0,
    vy: 0,
  });
}

function stopSmallVelocity(piece, minVelocity) {
  if (Math.abs(piece.vx) < minVelocity) {
    piece.vx = 0;
  }

  if (Math.abs(piece.vy) < minVelocity) {
    piece.vy = 0;
  }
}

function keepPieceInsideBounds(piece, radiusPercent) {
  const minX = BOARD_PLAYFIELD_INSET + radiusPercent;
  const maxX = 100 - BOARD_PLAYFIELD_INSET - radiusPercent;
  const minY = BOARD_PLAYFIELD_INSET + radiusPercent;
  const maxY = 100 - BOARD_PLAYFIELD_INSET - radiusPercent;

  piece.x = clamp(piece.x, minX, maxX);
  piece.y = clamp(piece.y, minY, maxY);
}

function updatePieceWithWalls(piece, radiusPercent, physics) {
  const { frictionPerFrame, minVelocity, wallBounceDamping } = physics;
  const minX = BOARD_PLAYFIELD_INSET + radiusPercent;
  const maxX = 100 - BOARD_PLAYFIELD_INSET - radiusPercent;
  const minY = BOARD_PLAYFIELD_INSET + radiusPercent;
  const maxY = 100 - BOARD_PLAYFIELD_INSET - radiusPercent;

  piece.x += piece.vx;
  piece.y += piece.vy;

  if (piece.x < minX) {
    piece.x = minX;
    piece.vx = Math.abs(piece.vx) * wallBounceDamping;
  } else if (piece.x > maxX) {
    piece.x = maxX;
    piece.vx = -Math.abs(piece.vx) * wallBounceDamping;
  }

  if (piece.y < minY) {
    piece.y = minY;
    piece.vy = Math.abs(piece.vy) * wallBounceDamping;
  } else if (piece.y > maxY) {
    piece.y = maxY;
    piece.vy = -Math.abs(piece.vy) * wallBounceDamping;
  }

  piece.vx *= frictionPerFrame;
  piece.vy *= frictionPerFrame;
  stopSmallVelocity(piece, minVelocity);
}

function resolvePieceCollision(firstPiece, secondPiece, physics, audioEvents) {
  const dx = secondPiece.x - firstPiece.x;
  const dy = secondPiece.y - firstPiece.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = firstPiece.radius + secondPiece.radius;
  const overlap = minDistance - distance;

  if (overlap <= 0) {
    return;
  }

  const normalX = distance === 0 ? 1 : dx / distance;
  const normalY = distance === 0 ? 0 : dy / distance;
  const slop = 0.02;
  const correction = Math.max(overlap - slop, 0);
  const separationX = normalX * (overlap / 2);
  const separationY = normalY * (overlap / 2);

  firstPiece.x -= correction > 0 ? normalX * (correction / 2) : separationX;
  firstPiece.y -= correction > 0 ? normalY * (correction / 2) : separationY;
  secondPiece.x += correction > 0 ? normalX * (correction / 2) : separationX;
  secondPiece.y += correction > 0 ? normalY * (correction / 2) : separationY;

  keepPieceInsideBounds(firstPiece, firstPiece.radius);
  keepPieceInsideBounds(secondPiece, secondPiece.radius);

  const relativeVelocityX = secondPiece.vx - firstPiece.vx;
  const relativeVelocityY = secondPiece.vy - firstPiece.vy;
  const velocityAlongNormal =
    relativeVelocityX * normalX + relativeVelocityY * normalY;

  if (velocityAlongNormal > 0) {
    return;
  }

  const collisionStrength = Math.abs(velocityAlongNormal);
  const tangentX = -normalY;
  const tangentY = normalX;
  const firstNormalVelocity =
    firstPiece.vx * normalX + firstPiece.vy * normalY;
  const secondNormalVelocity =
    secondPiece.vx * normalX + secondPiece.vy * normalY;
  const firstTangentVelocity =
    firstPiece.vx * tangentX + firstPiece.vy * tangentY;
  const secondTangentVelocity =
    secondPiece.vx * tangentX + secondPiece.vy * tangentY;
  const restitution = physics.collisionBounceDamping;
  const tangentDamping = physics.collisionTangentialDamping ?? 1;
  const strikerHitTransferBoost = physics.strikerHitTransferBoost ?? 1;
  const strikerGlancingTransferBoost =
    physics.strikerGlancingTransferBoost ?? 1;
  const strikerGlancingTangentBoost =
    physics.strikerGlancingTangentBoost ?? 1;
  const nextFirstNormalVelocity =
    ((1 - restitution) * firstNormalVelocity +
      (1 + restitution) * secondNormalVelocity) /
    2;
  const nextSecondNormalVelocity =
    ((1 + restitution) * firstNormalVelocity +
      (1 - restitution) * secondNormalVelocity) /
    2;

  firstPiece.vx =
    nextFirstNormalVelocity * normalX +
    firstTangentVelocity * tangentX * tangentDamping;
  firstPiece.vy =
    nextFirstNormalVelocity * normalY +
    firstTangentVelocity * tangentY * tangentDamping;
  secondPiece.vx =
    nextSecondNormalVelocity * normalX +
    secondTangentVelocity * tangentX * tangentDamping;
  secondPiece.vy =
    nextSecondNormalVelocity * normalY +
    secondTangentVelocity * tangentY * tangentDamping;

  if (firstPiece.key === 'striker' && secondPiece.key !== 'striker') {
    const strikerSpeed = Math.hypot(firstNormalVelocity, firstTangentVelocity);
    const glancingFactor =
      strikerSpeed > 0
        ? Math.max(0, 1 - Math.abs(firstNormalVelocity) / strikerSpeed)
        : 0;
    const transferBoost =
      strikerHitTransferBoost +
      (strikerGlancingTransferBoost - 1) * glancingFactor;
    const tangentBoost =
      1 + (strikerGlancingTangentBoost - 1) * glancingFactor;

    secondPiece.vx *= strikerHitTransferBoost;
    secondPiece.vy *= strikerHitTransferBoost;
    secondPiece.vx += secondTangentVelocity * tangentX * (tangentBoost - 1);
    secondPiece.vy += secondTangentVelocity * tangentY * (tangentBoost - 1);
    secondPiece.vx *= transferBoost / strikerHitTransferBoost;
    secondPiece.vy *= transferBoost / strikerHitTransferBoost;
  } else if (secondPiece.key === 'striker' && firstPiece.key !== 'striker') {
    const strikerSpeed = Math.hypot(secondNormalVelocity, secondTangentVelocity);
    const glancingFactor =
      strikerSpeed > 0
        ? Math.max(0, 1 - Math.abs(secondNormalVelocity) / strikerSpeed)
        : 0;
    const transferBoost =
      strikerHitTransferBoost +
      (strikerGlancingTransferBoost - 1) * glancingFactor;
    const tangentBoost =
      1 + (strikerGlancingTangentBoost - 1) * glancingFactor;

    firstPiece.vx *= strikerHitTransferBoost;
    firstPiece.vy *= strikerHitTransferBoost;
    firstPiece.vx += firstTangentVelocity * tangentX * (tangentBoost - 1);
    firstPiece.vy += firstTangentVelocity * tangentY * (tangentBoost - 1);
    firstPiece.vx *= transferBoost / strikerHitTransferBoost;
    firstPiece.vy *= transferBoost / strikerHitTransferBoost;
  }

  if (audioEvents) {
    audioEvents.push({
      type:
        firstPiece.key === 'striker' || secondPiece.key === 'striker'
          ? 'striker-hit'
          : 'coin-collision',
      intensity: collisionStrength,
    });
  }
}

function getBoardPieces(boardState, boardSize) {
  const pieces = [];

  if (
    !boardState.striker.isPocketed &&
    boardState.strikerSpawnProtectionFrames <= 0
  ) {
    const strikerRadius = canvasToPercent(boardSize, getStrikerRadius(boardSize));
    pieces.push({
      ...boardState.striker,
      key: 'striker',
      radius: strikerRadius,
      source: boardState.striker,
    });
  }

  boardState.coins.forEach((coin) => {
    pieces.push({
      ...coin,
      key: coin.id,
      radius: canvasToPercent(boardSize, getCoinRadius(boardSize, coin.type)),
      source: coin,
    });
  });

  return pieces;
}

function syncPieceState(pieces) {
  pieces.forEach((piece) => {
    piece.source.x = piece.x;
    piece.source.y = piece.y;
    piece.source.vx = piece.vx;
    piece.source.vy = piece.vy;
  });
}

function isPieceInPocket(piece, pocketRadiusPercent) {
  return getPocketCenters().some((pocket) => {
    const distance = Math.hypot(piece.x - pocket.x, piece.y - pocket.y);
    return distance <= pocketRadiusPercent - piece.radius * 0.35;
  });
}

function handlePocketedPieces(boardState, boardSize, audioEvents) {
  const pocketRadiusPercent = canvasToPercent(boardSize, getPocketRadius(boardSize));
  let pocketedCoinCount = 0;
  const pocketedCoinTypes = [];

  boardState.coins = boardState.coins.filter((coin) => {
    const coinRadius = canvasToPercent(boardSize, getCoinRadius(boardSize, coin.type));
    const isPocketed = isPieceInPocket(
      { ...coin, radius: coinRadius },
      pocketRadiusPercent
    );

    if (isPocketed) {
      pocketedCoinCount += 1;
      pocketedCoinTypes.push(coin.type);
    }

    return !isPocketed;
  });

  boardState.coinsPocketedThisTurn += pocketedCoinCount;
  boardState.pocketedCoinTypesThisTurn.push(...pocketedCoinTypes);

  if (pocketedCoinCount > 0 && audioEvents) {
    audioEvents.push({
      type: 'coin-pocketed',
      count: pocketedCoinCount,
    });
  }

  if (!boardState.striker.isPocketed) {
    const strikerRadius = canvasToPercent(boardSize, getStrikerRadius(boardSize));
    const strikerInPocket = isPieceInPocket(
      { ...boardState.striker, radius: strikerRadius },
      pocketRadiusPercent
    );

    if (strikerInPocket) {
      boardState.striker.isPocketed = true;
      boardState.pendingStrikerReset = true;
      boardState.strikerPocketedThisTurn = true;
      boardState.striker.vx = 0;
      boardState.striker.vy = 0;
    }
  }

  const coinsMoving = boardState.coins.some(
    (coin) => coin.vx !== 0 || coin.vy !== 0
  );

  if (boardState.pendingStrikerReset && !coinsMoving) {
    placeStrikerSafely(
      boardState,
      boardState.strikerHomePosition,
      boardState.strikerPlacementConfig?.shootingRange,
      boardState.strikerPlacementConfig?.placementBuffer,
      boardState.strikerPlacementConfig?.spawnProtectionFrames
    );
  }
}

export function isAnyPieceMoving(boardState, minVelocity) {
  const { striker, coins } = boardState;

  if (
    !striker.isPocketed &&
    (Math.abs(striker.vx) > minVelocity || Math.abs(striker.vy) > minVelocity)
  ) {
    return true;
  }

  return coins.some(
    (coin) => Math.abs(coin.vx) > minVelocity || Math.abs(coin.vy) > minVelocity
  );
}

export function getPointerPosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const boardSize = canvas.clientWidth;

  return {
    x: clamp(event.clientX - rect.left, 0, boardSize),
    y: clamp(event.clientY - rect.top, 0, boardSize),
  };
}

export function isStrikerOverlappingCoin(boardState, boardSize) {
  if (boardState.striker.isPocketed) {
    return false;
  }

  const strikerRadius = canvasToPercent(boardSize, getStrikerRadius(boardSize));

  return boardState.coins.some((coin) => {
    const coinRadius = canvasToPercent(boardSize, getCoinRadius(boardSize, coin.type));
    const distance = Math.hypot(
      boardState.striker.x - coin.x,
      boardState.striker.y - coin.y
    );

    return distance < strikerRadius + coinRadius;
  });
}

export function updateBoardState(boardState, boardSize, physics, audioEvents = []) {
  const pieces = getBoardPieces(boardState, boardSize);

  pieces.forEach((piece) => {
    updatePieceWithWalls(piece, piece.radius, physics);
  });

  for (let pass = 0; pass < 3; pass += 1) {
    for (let firstIndex = 0; firstIndex < pieces.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < pieces.length;
        secondIndex += 1
      ) {
        resolvePieceCollision(
          pieces[firstIndex],
          pieces[secondIndex],
          physics,
          audioEvents
        );
      }
    }
  }

  pieces.forEach((piece) => {
    keepPieceInsideBounds(piece, piece.radius);
    stopSmallVelocity(piece, physics.minVelocity);
  });

  syncPieceState(pieces);
  handlePocketedPieces(boardState, boardSize, audioEvents);

  if (boardState.strikerSpawnProtectionFrames > 0) {
    boardState.strikerSpawnProtectionFrames -= 1;
  }
}

export function startShot(boardState) {
  boardState.shotInProgress = true;
  boardState.coinsPocketedThisTurn = 0;
  boardState.pocketedCoinTypesThisTurn = [];
  boardState.strikerPocketedThisTurn = false;
}

export function placeStrikerSafely(
  boardState,
  strikerPosition = { x: 50, y: 82 },
  shootingRange,
  placementBuffer = 0,
  spawnProtectionFrames = 0,
  preferredDirection = 0
) {
  const safePlacement = findSafeStrikerPlacement(
    boardState,
    strikerPosition,
    shootingRange,
    placementBuffer,
    preferredDirection
  );

  boardState.strikerHomePosition = { ...safePlacement };
  boardState.striker.x = safePlacement.x;
  boardState.striker.y = safePlacement.y;
  boardState.striker.vx = 0;
  boardState.striker.vy = 0;
  boardState.striker.isPocketed = false;
  boardState.pendingStrikerReset = false;
  boardState.strikerSpawnProtectionFrames = spawnProtectionFrames;
  boardState.strikerPlacementConfig = {
    shootingRange,
    placementBuffer,
    spawnProtectionFrames,
  };
}

export function resetStriker(
  boardState,
  strikerPosition = { x: 50, y: 82 },
  shootingRange,
  placementBuffer = 0,
  spawnProtectionFrames = 0
) {
  placeStrikerSafely(
    boardState,
    strikerPosition,
    shootingRange,
    placementBuffer,
    spawnProtectionFrames
  );
}

export function finishShot(boardState) {
  const shotSummary = {
    coinsPocketed: boardState.coinsPocketedThisTurn,
    pocketedCoinTypes: [...boardState.pocketedCoinTypesThisTurn],
    strikerPocketed: boardState.strikerPocketedThisTurn,
  };

  boardState.shotInProgress = false;
  boardState.coinsPocketedThisTurn = 0;
  boardState.pocketedCoinTypesThisTurn = [];
  boardState.strikerPocketedThisTurn = false;

  return shotSummary;
}
