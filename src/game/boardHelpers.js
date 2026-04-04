export function percentToCanvas(size, value) {
  return (size * value) / 100;
}

export function canvasToPercent(size, value) {
  return (value / size) * 100;
}

export function getCoinRadius(size, type) {
  return percentToCanvas(size, type === 'queen' ? 2.95 : 2.675);
}

export function getStrikerRadius(size) {
  return percentToCanvas(size, 3.7);
}

export function getPocketRadius(size) {
  return percentToCanvas(size, 6);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPocketCenters() {
  const pocketOffset = 9.4;

  return [
    { x: pocketOffset, y: pocketOffset },
    { x: 100 - pocketOffset, y: pocketOffset },
    { x: pocketOffset, y: 100 - pocketOffset },
    { x: 100 - pocketOffset, y: 100 - pocketOffset },
  ];
}

export function createInitialBoardState({ coinPositions, strikerPosition }) {
  return {
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
    pendingStrikerReset: false,
    shotInProgress: false,
    coinsPocketedThisTurn: 0,
  };
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
  const minX = radiusPercent;
  const maxX = 100 - radiusPercent;
  const minY = radiusPercent;
  const maxY = 100 - radiusPercent;

  piece.x = clamp(piece.x, minX, maxX);
  piece.y = clamp(piece.y, minY, maxY);
}

function updatePieceWithWalls(piece, radiusPercent, physics) {
  const { frictionPerFrame, minVelocity, wallBounceDamping } = physics;
  const minX = radiusPercent;
  const maxX = 100 - radiusPercent;
  const minY = radiusPercent;
  const maxY = 100 - radiusPercent;

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

function resolvePieceCollision(firstPiece, secondPiece, physics) {
  const dx = secondPiece.x - firstPiece.x;
  const dy = secondPiece.y - firstPiece.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = firstPiece.radius + secondPiece.radius;

  if (distance >= minDistance) {
    return;
  }

  const normalX = distance === 0 ? 1 : dx / distance;
  const normalY = distance === 0 ? 0 : dy / distance;
  const overlap = minDistance - distance;
  const separationX = normalX * (overlap / 2);
  const separationY = normalY * (overlap / 2);

  firstPiece.x -= separationX;
  firstPiece.y -= separationY;
  secondPiece.x += separationX;
  secondPiece.y += separationY;

  keepPieceInsideBounds(firstPiece, firstPiece.radius);
  keepPieceInsideBounds(secondPiece, secondPiece.radius);

  const relativeVelocityX = secondPiece.vx - firstPiece.vx;
  const relativeVelocityY = secondPiece.vy - firstPiece.vy;
  const velocityAlongNormal =
    relativeVelocityX * normalX + relativeVelocityY * normalY;

  if (velocityAlongNormal > 0) {
    return;
  }

  const impulse =
    (-(1 + physics.collisionBounceDamping) * velocityAlongNormal) / 2;
  const impulseX = impulse * normalX;
  const impulseY = impulse * normalY;

  firstPiece.vx -= impulseX;
  firstPiece.vy -= impulseY;
  secondPiece.vx += impulseX;
  secondPiece.vy += impulseY;
}

function getBoardPieces(boardState, boardSize) {
  const pieces = [];

  if (!boardState.striker.isPocketed) {
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

function handlePocketedPieces(boardState, boardSize) {
  const pocketRadiusPercent = canvasToPercent(boardSize, getPocketRadius(boardSize));
  let pocketedCoinCount = 0;

  boardState.coins = boardState.coins.filter((coin) => {
    const coinRadius = canvasToPercent(boardSize, getCoinRadius(boardSize, coin.type));
    const isPocketed = isPieceInPocket(
      { ...coin, radius: coinRadius },
      pocketRadiusPercent
    );

    if (isPocketed) {
      pocketedCoinCount += 1;
    }

    return !isPocketed;
  });

  boardState.coinsPocketedThisTurn += pocketedCoinCount;

  if (!boardState.striker.isPocketed) {
    const strikerRadius = canvasToPercent(boardSize, getStrikerRadius(boardSize));
    const strikerInPocket = isPieceInPocket(
      { ...boardState.striker, radius: strikerRadius },
      pocketRadiusPercent
    );

    if (strikerInPocket) {
      boardState.striker.isPocketed = true;
      boardState.pendingStrikerReset = true;
      boardState.striker.vx = 0;
      boardState.striker.vy = 0;
    }
  }

  const coinsMoving = boardState.coins.some(
    (coin) => coin.vx !== 0 || coin.vy !== 0
  );

  if (boardState.pendingStrikerReset && !coinsMoving) {
    boardState.striker.x = 50;
    boardState.striker.y = 82;
    boardState.striker.vx = 0;
    boardState.striker.vy = 0;
    boardState.striker.isPocketed = false;
    boardState.pendingStrikerReset = false;
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

export function updateBoardState(boardState, boardSize, physics) {
  const pieces = getBoardPieces(boardState, boardSize);

  pieces.forEach((piece) => {
    updatePieceWithWalls(piece, piece.radius, physics);
  });

  for (let pass = 0; pass < 2; pass += 1) {
    for (let firstIndex = 0; firstIndex < pieces.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < pieces.length;
        secondIndex += 1
      ) {
        resolvePieceCollision(pieces[firstIndex], pieces[secondIndex], physics);
      }
    }
  }

  pieces.forEach((piece) => {
    keepPieceInsideBounds(piece, piece.radius);
    stopSmallVelocity(piece, physics.minVelocity);
  });

  syncPieceState(pieces);
  handlePocketedPieces(boardState, boardSize);
}

export function startShot(boardState) {
  boardState.shotInProgress = true;
  boardState.coinsPocketedThisTurn = 0;
}

export function finishShot(boardState) {
  const shotSummary = {
    coinsPocketed: boardState.coinsPocketedThisTurn,
  };

  boardState.shotInProgress = false;
  boardState.coinsPocketedThisTurn = 0;

  return shotSummary;
}
