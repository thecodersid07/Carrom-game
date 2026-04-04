import { useEffect, useRef, useState } from 'react';
import useGameDimensions from '../hooks/useGameDimensions';
import {
  COLLISION_BOUNCE_DAMPING,
  COIN_POSITIONS,
  FRICTION_PER_FRAME,
  MAX_SHOT_DRAG,
  MIN_VELOCITY,
  MIN_SHOT_DRAG,
  PLAYER_STRIKER_POSITIONS,
  STRIKER_INTERACTION_THRESHOLD,
  STRIKER_SHOOTING_RANGE,
  STRIKER_SHOT_POWER,
  WALL_BOUNCE_DAMPING,
} from '../utils/constants';
import {
  clamp,
  canvasToPercent,
  createInitialBoardState,
  finishShot,
  getPointerPosition,
  isAnyPieceMoving,
  isPointInsideCircle,
  isStrikerOverlappingCoin,
  percentToCanvas,
  resetStriker,
  startShot,
  updateBoardState,
} from './boardHelpers';
import { drawBoardScene } from './boardRenderer';

function GameBoard() {
  const { boardSize } = useGameDimensions();
  const [activePlayer, setActivePlayer] = useState(1);
  const [scores, setScores] = useState({
    player1: 0,
    player2: 0,
  });
  const [gameOver, setGameOver] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState('');
  const [shotPower, setShotPower] = useState(0);
  const canvasRef = useRef(null);
  const hasLoggedDebugRef = useRef(false);
  const activePlayerRef = useRef(1);
  const gameOverRef = useRef(false);
  const getPlayerStrikerPosition = (player) =>
    PLAYER_STRIKER_POSITIONS[player] ?? PLAYER_STRIKER_POSITIONS[1];
  const boardStateRef = useRef(
    createInitialBoardState({
      coinPositions: COIN_POSITIONS,
      strikerPosition: getPlayerStrikerPosition(1),
    })
  );
  const aimStateRef = useRef({
    isDragging: false,
    pointerX: 0,
    pointerY: 0,
  });
  const interactionRef = useRef({
    mode: 'idle',
    startPointerX: 0,
    startPointerY: 0,
  });

  const resetGame = () => {
    boardStateRef.current = createInitialBoardState({
      coinPositions: COIN_POSITIONS,
      strikerPosition: getPlayerStrikerPosition(1),
    });
    aimStateRef.current = {
      isDragging: false,
      pointerX: 0,
      pointerY: 0,
    };
    interactionRef.current = {
      mode: 'idle',
      startPointerX: 0,
      startPointerY: 0,
    };
    setShotPower(0);
    setActivePlayer(1);
    setScores({
      player1: 0,
      player2: 0,
    });
    setGameOver(false);
    setWinnerMessage('');
  };

  useEffect(() => {
    activePlayerRef.current = activePlayer;
  }, [activePlayer]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  const getWinnerMessage = (nextScores) => {
    if (nextScores.player1 > nextScores.player2) {
      return 'Player 1 wins!';
    }

    if (nextScores.player2 > nextScores.player1) {
      return 'Player 2 wins!';
    }

    return "It's a tie!";
  };

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return undefined;
    }

    let animationFrameId = 0;

    const handlePointerDown = (event) => {
      const boardState = boardStateRef.current;

      if (gameOverRef.current || isAnyPieceMoving(boardState, MIN_VELOCITY)) {
        return;
      }

      const pointer = getPointerPosition(canvas, event);
      const strikerX = percentToCanvas(canvas.clientWidth, boardState.striker.x);
      const strikerY = percentToCanvas(canvas.clientWidth, boardState.striker.y);
      const distanceFromStriker = Math.hypot(
        pointer.x - strikerX,
        pointer.y - strikerY
      );
      const strikerRadius = percentToCanvas(canvas.clientWidth, 3.7);

      if (
        !isPointInsideCircle(
          pointer.x,
          pointer.y,
          strikerX,
          strikerY,
          strikerRadius * 1.45
        )
      ) {
        return;
      }

      interactionRef.current = {
        mode: 'pending',
        startPointerX: pointer.x,
        startPointerY: pointer.y,
      };

      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (interactionRef.current.mode === 'idle') {
        return;
      }

      const pointer = getPointerPosition(canvas, event);
      const striker = boardStateRef.current.striker;
      const strikerX = percentToCanvas(canvas.clientWidth, striker.x);
      const strikerY = percentToCanvas(canvas.clientWidth, striker.y);
      const dragDistance = Math.hypot(pointer.x - strikerX, pointer.y - strikerY);
      const dragPercent = clamp(
        canvasToPercent(canvas.clientWidth, dragDistance),
        0,
        MAX_SHOT_DRAG
      );
      const moveX = pointer.x - interactionRef.current.startPointerX;
      const moveY = pointer.y - interactionRef.current.startPointerY;
      const horizontalMovePercent = Math.abs(
        canvasToPercent(canvas.clientWidth, moveX)
      );
      const verticalMovePercent = Math.abs(
        canvasToPercent(canvas.clientWidth, moveY)
      );

      if (interactionRef.current.mode === 'pending') {
        if (
          horizontalMovePercent > STRIKER_INTERACTION_THRESHOLD &&
          horizontalMovePercent >= verticalMovePercent
        ) {
          interactionRef.current.mode = 'placing';
        } else if (
          verticalMovePercent > STRIKER_INTERACTION_THRESHOLD ||
          dragPercent > MIN_SHOT_DRAG
        ) {
          interactionRef.current.mode = 'aiming';
        }
      }

      if (interactionRef.current.mode === 'placing') {
        striker.x = clamp(
          canvasToPercent(canvas.clientWidth, pointer.x),
          STRIKER_SHOOTING_RANGE.minX,
          STRIKER_SHOOTING_RANGE.maxX
        );
        striker.y = getPlayerStrikerPosition(activePlayerRef.current).y;
        striker.vx = 0;
        striker.vy = 0;
        setShotPower(0);
        return;
      }

      if (interactionRef.current.mode !== 'aiming') {
        return;
      }

      aimStateRef.current = {
        isDragging: true,
        pointerX: pointer.x,
        pointerY: pointer.y,
      };
      setShotPower(dragPercent / MAX_SHOT_DRAG);
    };

    const stopDragging = () => {
      aimStateRef.current = {
        isDragging: false,
        pointerX: 0,
        pointerY: 0,
      };
      interactionRef.current = {
        mode: 'idle',
        startPointerX: 0,
        startPointerY: 0,
      };
      setShotPower(0);
    };

    const handlePointerUp = (event) => {
      if (interactionRef.current.mode === 'placing') {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }

        stopDragging();
        return;
      }

      if (!aimStateRef.current.isDragging) {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }

        stopDragging();
        return;
      }

      const boardState = boardStateRef.current;

      if (!gameOverRef.current && !isAnyPieceMoving(boardState, MIN_VELOCITY)) {
        const pointer = getPointerPosition(canvas, event);
        const strikerX = percentToCanvas(canvas.clientWidth, boardState.striker.x);
        const strikerY = percentToCanvas(canvas.clientWidth, boardState.striker.y);
        const dragX = pointer.x - strikerX;
        const dragY = pointer.y - strikerY;
        const dragDistancePercent = canvasToPercent(
          canvas.clientWidth,
          Math.hypot(dragX, dragY)
        );

        if (dragDistancePercent >= MIN_SHOT_DRAG) {
          const limitedDragDistance = clamp(
            dragDistancePercent,
            MIN_SHOT_DRAG,
            MAX_SHOT_DRAG
          );
          const dragScale = limitedDragDistance / dragDistancePercent;
          const limitedDragX = canvasToPercent(canvas.clientWidth, dragX) * dragScale;
          const limitedDragY = canvasToPercent(canvas.clientWidth, dragY) * dragScale;

          startShot(boardState);
          boardState.striker.vx = -limitedDragX * STRIKER_SHOT_POWER;
          boardState.striker.vy = -limitedDragY * STRIKER_SHOT_POWER;
        }
      }

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      stopDragging();
    };

    const handlePointerCancel = (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      stopDragging();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);

    const renderFrame = () => {
      const displaySize = canvas.clientWidth;

      if (!displaySize) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
        return;
      }

      const pixelRatio = window.devicePixelRatio || 1;
      const internalSize = Math.floor(displaySize * pixelRatio);

      if (canvas.width !== internalSize || canvas.height !== internalSize) {
        canvas.width = internalSize;
        canvas.height = internalSize;
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      updateBoardState(boardStateRef.current, displaySize, {
        collisionBounceDamping: COLLISION_BOUNCE_DAMPING,
        frictionPerFrame: FRICTION_PER_FRAME,
        minVelocity: MIN_VELOCITY,
        wallBounceDamping: WALL_BOUNCE_DAMPING,
      });

      const isMovingNow = isAnyPieceMoving(boardStateRef.current, MIN_VELOCITY);
      const dimStriker =
        !isMovingNow && isStrikerOverlappingCoin(boardStateRef.current, displaySize);

      if (boardStateRef.current.shotInProgress && !isMovingNow) {
        const shotSummary = finishShot(boardStateRef.current);
        const scorePenalty = shotSummary.strikerPocketed ? 1 : 0;

        if (shotSummary.coinsPocketed > 0) {
          const playerKey =
            activePlayerRef.current === 1 ? 'player1' : 'player2';
          const currentPlayerPosition = getPlayerStrikerPosition(
            activePlayerRef.current
          );

          resetStriker(boardStateRef.current, currentPlayerPosition);
          setScores((currentScores) => {
            const nextScores = {
              ...currentScores,
              [playerKey]:
                Math.max(
                  0,
                  currentScores[playerKey] +
                    shotSummary.coinsPocketed -
                    scorePenalty
                ),
            };

            if (boardStateRef.current.coins.length === 0) {
              setGameOver(true);
              setWinnerMessage(getWinnerMessage(nextScores));
            }

            return nextScores;
          });
        } else if (boardStateRef.current.coins.length === 0) {
          resetStriker(
            boardStateRef.current,
            getPlayerStrikerPosition(activePlayerRef.current)
          );
          if (scorePenalty > 0) {
            const playerKey =
              activePlayerRef.current === 1 ? 'player1' : 'player2';
            const nextScores = {
              ...scores,
              [playerKey]: Math.max(0, scores[playerKey] - scorePenalty),
            };

            setScores(nextScores);
            setGameOver(true);
            setWinnerMessage(getWinnerMessage(nextScores));
          } else {
            setGameOver(true);
            setWinnerMessage(getWinnerMessage(scores));
          }
        } else {
          if (scorePenalty > 0) {
            const playerKey =
              activePlayerRef.current === 1 ? 'player1' : 'player2';

            setScores((currentScores) => ({
              ...currentScores,
              [playerKey]: Math.max(0, currentScores[playerKey] - scorePenalty),
            }));
          }

          const nextPlayer = activePlayerRef.current === 1 ? 2 : 1;

          setActivePlayer(nextPlayer);
          resetStriker(boardStateRef.current, getPlayerStrikerPosition(nextPlayer));
        }
      }

      drawBoardScene(
        context,
        displaySize,
        boardStateRef.current,
        aimStateRef.current,
        { dimStriker }
      );

      if (!hasLoggedDebugRef.current) {
        hasLoggedDebugRef.current = true;
        console.debug('Carrom canvas render running', {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          displaySize,
          striker: boardStateRef.current.striker,
          firstCoin: boardStateRef.current.coins[0],
        });
      }

      animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    animationFrameId = window.requestAnimationFrame(renderFrame);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className="game-layout" aria-label="Carrom game area">
      <div className="board-wrapper">
        <div className="board-canvas-shell" style={{ width: boardSize, height: boardSize }}>
          <canvas
            ref={canvasRef}
            className="board-canvas"
            aria-label="Carrom board canvas"
            width="600"
            height="600"
          />
        </div>
      </div>

      <aside className="info-panel">
        <div className="panel-header">
          <p className="panel-kicker">Match Status</p>
          <h2>Game Board</h2>
        </div>
        <p className="turn-label">Current Turn: <span>Player {activePlayer}</span></p>
        <div className="score-card">
          <div className={`score-row ${activePlayer === 1 ? 'score-row-active' : ''}`}>
            <span>Player 1</span>
            <strong>{scores.player1}</strong>
          </div>
          <div className={`score-row ${activePlayer === 2 ? 'score-row-active' : ''}`}>
            <span>Player 2</span>
            <strong>{scores.player2}</strong>
          </div>
        </div>
        {gameOver ? (
          <p className="game-over-message">{winnerMessage}</p>
        ) : null}
        <div className="power-meter">
          <div className="power-meter-label">
            <span>Shot Power</span>
            <strong>{Math.round(shotPower * 100)}%</strong>
          </div>
          <div className="power-meter-track">
            <div
              className="power-meter-fill"
              style={{ width: `${shotPower > 0 ? Math.max(6, shotPower * 100) : 0}%` }}
            />
          </div>
        </div>
        <p className="rules-copy">
          Player 1 shoots from the bottom line, Player 2 shoots from the top
          line. Turn ends only after every moving piece stops.
        </p>
        <button type="button" className="restart-button" onClick={resetGame}>
          Restart Game
        </button>
      </aside>
    </section>
  );
}

export default GameBoard;
