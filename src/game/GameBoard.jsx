import { useEffect, useRef, useState } from 'react';
import useGameDimensions from '../hooks/useGameDimensions';
import {
  COLLISION_BOUNCE_DAMPING,
  COIN_POSITIONS,
  FRICTION_PER_FRAME,
  MIN_VELOCITY,
  STRIKER_POSITION,
  STRIKER_SHOT_POWER,
  WALL_BOUNCE_DAMPING,
} from '../utils/constants';
import {
  canvasToPercent,
  createInitialBoardState,
  finishShot,
  getPointerPosition,
  isAnyPieceMoving,
  percentToCanvas,
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
  const canvasRef = useRef(null);
  const hasLoggedDebugRef = useRef(false);
  const wasMovingRef = useRef(false);
  const activePlayerRef = useRef(1);
  const gameOverRef = useRef(false);
  const boardStateRef = useRef(
    createInitialBoardState({
      coinPositions: COIN_POSITIONS,
      strikerPosition: STRIKER_POSITION,
    })
  );
  const aimStateRef = useRef({
    isDragging: false,
    pointerX: 0,
    pointerY: 0,
  });

  const resetGame = () => {
    boardStateRef.current = createInitialBoardState({
      coinPositions: COIN_POSITIONS,
      strikerPosition: STRIKER_POSITION,
    });
    aimStateRef.current = {
      isDragging: false,
      pointerX: 0,
      pointerY: 0,
    };
    wasMovingRef.current = false;
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

      if (distanceFromStriker > strikerRadius * 1.6) {
        return;
      }

      aimStateRef.current = {
        isDragging: true,
        pointerX: pointer.x,
        pointerY: pointer.y,
      };

      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!aimStateRef.current.isDragging) {
        return;
      }

      const pointer = getPointerPosition(canvas, event);
      aimStateRef.current = {
        isDragging: true,
        pointerX: pointer.x,
        pointerY: pointer.y,
      };
    };

    const stopDragging = () => {
      aimStateRef.current = {
        isDragging: false,
        pointerX: 0,
        pointerY: 0,
      };
    };

    const handlePointerUp = (event) => {
      if (!aimStateRef.current.isDragging) {
        return;
      }

      const boardState = boardStateRef.current;

      if (!gameOverRef.current && !isAnyPieceMoving(boardState, MIN_VELOCITY)) {
        const pointer = getPointerPosition(canvas, event);
        const strikerX = percentToCanvas(canvas.clientWidth, boardState.striker.x);
        const strikerY = percentToCanvas(canvas.clientWidth, boardState.striker.y);
        const dragX = pointer.x - strikerX;
        const dragY = pointer.y - strikerY;

        startShot(boardState);
        boardState.striker.vx =
          -canvasToPercent(canvas.clientWidth, dragX) * STRIKER_SHOT_POWER;
        boardState.striker.vy =
          -canvasToPercent(canvas.clientWidth, dragY) * STRIKER_SHOT_POWER;
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

      if (
        boardStateRef.current.shotInProgress &&
        wasMovingRef.current &&
        !isMovingNow
      ) {
        const shotSummary = finishShot(boardStateRef.current);

        if (shotSummary.coinsPocketed > 0) {
          const playerKey =
            activePlayerRef.current === 1 ? 'player1' : 'player2';
          setScores((currentScores) => {
            const nextScores = {
              ...currentScores,
              [playerKey]:
                currentScores[playerKey] + shotSummary.coinsPocketed,
            };

            if (boardStateRef.current.coins.length === 0) {
              setGameOver(true);
              setWinnerMessage(getWinnerMessage(nextScores));
            }

            return nextScores;
          });
        } else if (boardStateRef.current.coins.length === 0) {
          setGameOver(true);
          setWinnerMessage(getWinnerMessage(scores));
        } else {
          setActivePlayer((currentPlayer) => (currentPlayer === 1 ? 2 : 1));
        }
      }

      wasMovingRef.current = isMovingNow;

      drawBoardScene(
        context,
        displaySize,
        boardStateRef.current,
        aimStateRef.current
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
        <p className="rules-copy">
          Turn ends only after every moving piece stops. Pocket a coin and the
          same player continues. Miss the pocket and the turn switches.
        </p>
        <button type="button" className="restart-button" onClick={resetGame}>
          Restart Game
        </button>
      </aside>
    </section>
  );
}

export default GameBoard;
