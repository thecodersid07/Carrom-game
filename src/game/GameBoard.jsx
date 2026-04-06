import { useEffect, useRef, useState } from 'react';
import useGameDimensions from '../hooks/useGameDimensions';
import {
  COLLISION_BOUNCE_DAMPING,
  COLLISION_TANGENTIAL_DAMPING,
  COIN_POSITIONS,
  FRICTION_PER_FRAME,
  MAX_SHOT_DRAG,
  MIN_VELOCITY,
  MIN_SHOT_DRAG,
  PERFECT_SHOT_BOOST,
  PERFECT_SHOT_RANGE,
  PLAYER_STRIKER_POSITIONS,
  POWER_METER_CYCLE_MS,
  QUEEN_HOME_POSITION,
  SHOT_POWER_CURVE_EXPONENT,
  STRIKER_PLACEMENT_BUFFER,
  STRIKER_SPAWN_PROTECTION_FRAMES,
  STRIKER_SHOOTING_RANGE,
  STRIKER_SHOT_POWER,
  STRIKER_HIT_TRANSFER_BOOST,
  TURN_TIMER_SECONDS,
  WALL_BOUNCE_DAMPING,
  WINNING_SCORE,
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
  placeStrikerSafely,
  percentToCanvas,
  resetStriker,
  respotCoin,
  startShot,
  updateBoardState,
} from './boardHelpers';
import createSoundManager from './createSoundManager';
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
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIMER_SECONDS);
  const [shotPower, setShotPower] = useState(0);
  const [perfectShotActive, setPerfectShotActive] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [turnFlashVisible, setTurnFlashVisible] = useState(false);
  const [comboState, setComboState] = useState({
    count: 0,
    points: 0,
    visible: false,
  });
  const [coinPocketState, setCoinPocketState] = useState({
    visible: false,
    label: '',
  });
  const canvasRef = useRef(null);
  const hasLoggedDebugRef = useRef(false);
  const activePlayerRef = useRef(1);
  const gameOverRef = useRef(false);
  const shotPowerRef = useRef(0);
  const perfectShotTimeoutRef = useRef(0);
  const comboTimeoutRef = useRef(0);
  const coinPocketTimeoutRef = useRef(0);
  const turnFlashTimeoutRef = useRef(0);
  const turnTimerIntervalRef = useRef(0);
  const turnTimerLastTickRef = useRef(0);
  const turnTimeLeftRef = useRef(TURN_TIMER_SECONDS * 1000);
  const turnTimerExpiredRef = useRef(false);
  const soundManagerRef = useRef(null);
  const hasMountedTurnRef = useRef(false);
  const pendingQueenCoverRef = useRef(null);
  const placementInputRef = useRef({
    leftPressed: false,
    rightPressed: false,
  });
  const placementMotionRef = useRef({
    lastFrameTime: 0,
    velocity: 0,
  });
  const getPlayerStrikerPosition = (player) =>
    PLAYER_STRIKER_POSITIONS[player] ?? PLAYER_STRIKER_POSITIONS[1];
  const boardStateRef = useRef(
    createInitialBoardState({
      coinPositions: COIN_POSITIONS,
      strikerPosition: getPlayerStrikerPosition(1),
      shootingRange: STRIKER_SHOOTING_RANGE,
      placementBuffer: STRIKER_PLACEMENT_BUFFER,
      spawnProtectionFrames: STRIKER_SPAWN_PROTECTION_FRAMES,
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
  const powerMeterRef = useRef({
    startTime: 0,
  });

  if (!soundManagerRef.current) {
    soundManagerRef.current = createSoundManager();
  }

  const setCurrentShotPower = (value) => {
    const clampedValue = clamp(value, 0, 1);

    shotPowerRef.current = clampedValue;
    setShotPower(clampedValue);
  };

  const resetPowerMeter = () => {
    powerMeterRef.current.startTime = 0;
    setCurrentShotPower(0);
  };

  const resetTurnTimer = () => {
    turnTimerExpiredRef.current = false;
    turnTimerLastTickRef.current = 0;
    turnTimeLeftRef.current = TURN_TIMER_SECONDS * 1000;
    setTurnTimeLeft(TURN_TIMER_SECONDS);
  };

  const resetPlacementMotion = () => {
    placementMotionRef.current.lastFrameTime = 0;
    placementMotionRef.current.velocity = 0;
  };

  const moveStrikerByKeyboardStep = (directionStep) => {
    const boardState = boardStateRef.current;

    if (
      gameOverRef.current ||
      boardState.shotInProgress ||
      isAnyPieceMoving(boardState, MIN_VELOCITY) ||
      interactionRef.current.mode !== 'idle'
    ) {
      return;
    }

    placeStrikerSafely(
      boardState,
      {
        x: boardState.striker.x + directionStep,
        y: getPlayerStrikerPosition(activePlayerRef.current).y,
      },
      STRIKER_SHOOTING_RANGE,
      STRIKER_PLACEMENT_BUFFER,
      STRIKER_SPAWN_PROTECTION_FRAMES,
      directionStep
    );
  };

  const endTurnOnTimeout = () => {
    if (gameOverRef.current) {
      return;
    }

    if (
      boardStateRef.current.shotInProgress ||
      isAnyPieceMoving(boardStateRef.current, MIN_VELOCITY)
    ) {
      return;
    }

    const nextPlayer = activePlayerRef.current === 1 ? 2 : 1;

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
    resetPlacementMotion();
    resetPowerMeter();
    resetComboFeedback();
    resetCoinPocketFeedback();
    setActivePlayer(nextPlayer);
    resetStriker(
      boardStateRef.current,
      getPlayerStrikerPosition(nextPlayer),
      STRIKER_SHOOTING_RANGE,
      STRIKER_PLACEMENT_BUFFER,
      STRIKER_SPAWN_PROTECTION_FRAMES
    );
  };

  const showPerfectShotFeedback = () => {
    setPerfectShotActive(true);
    soundManagerRef.current?.playPerfectShot();
    window.clearTimeout(perfectShotTimeoutRef.current);
    perfectShotTimeoutRef.current = window.setTimeout(() => {
      setPerfectShotActive(false);
    }, 900);
  };

  const resetComboFeedback = () => {
    setComboState({
      count: 0,
      points: 0,
      visible: false,
    });
  };

  const showComboFeedback = (count, points) => {
    setComboState({
      count,
      points,
      visible: true,
    });
    window.clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = window.setTimeout(() => {
      resetComboFeedback();
    }, 1100);
  };

  const resetCoinPocketFeedback = () => {
    setCoinPocketState({
      visible: false,
      label: '',
    });
  };

  const showCoinPocketFeedback = (points) => {
    setCoinPocketState({
      visible: true,
      label: `+${points}`,
    });
    window.clearTimeout(coinPocketTimeoutRef.current);
    coinPocketTimeoutRef.current = window.setTimeout(() => {
      resetCoinPocketFeedback();
    }, 850);
  };

  const resetGame = () => {
    boardStateRef.current = createInitialBoardState({
      coinPositions: COIN_POSITIONS,
      strikerPosition: getPlayerStrikerPosition(1),
      shootingRange: STRIKER_SHOOTING_RANGE,
      placementBuffer: STRIKER_PLACEMENT_BUFFER,
      spawnProtectionFrames: STRIKER_SPAWN_PROTECTION_FRAMES,
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
    resetPlacementMotion();
    resetPowerMeter();
    setPerfectShotActive(false);
    resetComboFeedback();
    resetCoinPocketFeedback();
    window.clearTimeout(perfectShotTimeoutRef.current);
    window.clearTimeout(comboTimeoutRef.current);
    window.clearTimeout(coinPocketTimeoutRef.current);
    window.clearTimeout(turnFlashTimeoutRef.current);
    setTurnFlashVisible(false);
    pendingQueenCoverRef.current = null;
    setActivePlayer(1);
    setScores({
      player1: 0,
      player2: 0,
    });
    setGameOver(false);
    setWinnerMessage('');
    resetTurnTimer();
  };

  useEffect(() => {
    activePlayerRef.current = activePlayer;
  }, [activePlayer]);

  useEffect(() => {
    if (!hasMountedTurnRef.current) {
      hasMountedTurnRef.current = true;
      return;
    }

    setTurnFlashVisible(true);
    window.clearTimeout(turnFlashTimeoutRef.current);
    turnFlashTimeoutRef.current = window.setTimeout(() => {
      setTurnFlashVisible(false);
    }, 900);
  }, [activePlayer]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) {
      turnTimerExpiredRef.current = false;
      turnTimerLastTickRef.current = 0;
      turnTimeLeftRef.current = 0;
      setTurnTimeLeft(0);
      return;
    }

    resetTurnTimer();
  }, [activePlayer, gameOver]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') {
        return;
      }

      event.preventDefault();

      if (event.code === 'ArrowLeft') {
        placementInputRef.current.leftPressed = true;
      } else {
        placementInputRef.current.rightPressed = true;
      }

      if (!event.repeat) {
        moveStrikerByKeyboardStep(event.code === 'ArrowLeft' ? -0.35 : 0.35);
      }
    };

    const handleKeyUp = (event) => {
      if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') {
        return;
      }

      if (event.code === 'ArrowLeft') {
        placementInputRef.current.leftPressed = false;
      } else {
        placementInputRef.current.rightPressed = false;
      }
    };

    const handleWindowBlur = () => {
      placementInputRef.current.leftPressed = false;
      placementInputRef.current.rightPressed = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    if (gameOver) {
      soundManagerRef.current?.playWin();
    }
  }, [gameOver]);

  useEffect(() => {
    turnTimerIntervalRef.current = window.setInterval(() => {
      if (gameOverRef.current) {
        turnTimerLastTickRef.current = 0;
        return;
      }

      const now = performance.now();

      if (turnTimerLastTickRef.current === 0) {
        turnTimerLastTickRef.current = now;
        return;
      }

      const elapsed = now - turnTimerLastTickRef.current;
      const nextTimeLeft = Math.max(0, turnTimeLeftRef.current - elapsed);

      turnTimerLastTickRef.current = now;
      turnTimeLeftRef.current = nextTimeLeft;

      const nextSeconds = Math.ceil(nextTimeLeft / 1000);

      setTurnTimeLeft((currentTimeLeft) =>
        currentTimeLeft === nextSeconds ? currentTimeLeft : nextSeconds
      );

      if (nextTimeLeft === 0 && !turnTimerExpiredRef.current) {
        turnTimerExpiredRef.current = true;
        endTurnOnTimeout();
      }
    }, 100);

    return () => {
      window.clearInterval(turnTimerIntervalRef.current);
    };
  }, []);

  const getWinnerMessage = (nextScores) => {
    if (nextScores.player1 >= WINNING_SCORE) {
      return 'Player 1 wins!';
    }

    if (nextScores.player2 >= WINNING_SCORE) {
      return 'Player 2 wins!';
    }

    if (nextScores.player1 > nextScores.player2) {
      return 'Player 1 wins!';
    }

    if (nextScores.player2 > nextScores.player1) {
      return 'Player 2 wins!';
    }

    return "It's a tie!";
  };

  const hasWinnerByScore = (nextScores) =>
    nextScores.player1 >= WINNING_SCORE || nextScores.player2 >= WINNING_SCORE;

  const getShotScore = (pocketedCoinTypes) => {
    const blackCount = pocketedCoinTypes.filter((type) => type === 'black').length;
    const whiteCount = pocketedCoinTypes.filter((type) => type === 'white').length;

    let score = blackCount * 10 + whiteCount * 20;

    return score;
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
      soundManagerRef.current?.unlock();

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
      resetPlacementMotion();

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

      if (interactionRef.current.mode === 'pending') {
        if (dragPercent > MIN_SHOT_DRAG) {
          interactionRef.current.mode = 'aiming';
        }
      }

      if (interactionRef.current.mode !== 'aiming') {
        return;
      }

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
      interactionRef.current = {
        mode: 'idle',
        startPointerX: 0,
        startPointerY: 0,
      };
      resetPowerMeter();
    };

    const handlePointerUp = (event) => {
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
          const baseVelocityX = -limitedDragX * STRIKER_SHOT_POWER;
          const baseVelocityY = -limitedDragY * STRIKER_SHOT_POWER;
          const isPerfectShot =
            shotPowerRef.current >= PERFECT_SHOT_RANGE.min &&
            shotPowerRef.current <= PERFECT_SHOT_RANGE.max;
          const curvedPower = Math.pow(shotPowerRef.current, SHOT_POWER_CURVE_EXPONENT);
          const appliedPower = isPerfectShot
            ? Math.min(1, curvedPower * PERFECT_SHOT_BOOST)
            : curvedPower;

          startShot(boardState);
          boardState.striker.vx = baseVelocityX * appliedPower;
          boardState.striker.vy = baseVelocityY * appliedPower;

          if (isPerfectShot) {
            showPerfectShotFeedback();
          }
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
      const now = performance.now();
      const previousFrameTime = placementMotionRef.current.lastFrameTime;
      placementMotionRef.current.lastFrameTime = now;

      if (previousFrameTime) {
        const deltaSeconds = Math.min((now - previousFrameTime) / 1000, 0.05);
        const moveDirection =
          (placementInputRef.current.rightPressed ? 1 : 0) -
          (placementInputRef.current.leftPressed ? 1 : 0);
        const targetVelocity = moveDirection * 26;
        const easing = Math.min(deltaSeconds * 16, 1);

        placementMotionRef.current.velocity +=
          (targetVelocity - placementMotionRef.current.velocity) * easing;

        if (Math.abs(placementMotionRef.current.velocity) < 0.05) {
          placementMotionRef.current.velocity = 0;
        }

        if (placementMotionRef.current.velocity !== 0) {
          moveStrikerByKeyboardStep(
            placementMotionRef.current.velocity * deltaSeconds
          );
        }
      }

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
      const audioEvents = [];
      updateBoardState(
        boardStateRef.current,
        displaySize,
        {
          collisionBounceDamping: COLLISION_BOUNCE_DAMPING,
          collisionTangentialDamping: COLLISION_TANGENTIAL_DAMPING,
          frictionPerFrame: FRICTION_PER_FRAME,
          minVelocity: MIN_VELOCITY,
          strikerHitTransferBoost: STRIKER_HIT_TRANSFER_BOOST,
          wallBounceDamping: WALL_BOUNCE_DAMPING,
        },
        audioEvents
      );

      audioEvents.forEach((audioEvent) => {
        if (audioEvent.type === 'striker-hit') {
          soundManagerRef.current?.playStrikerHit(audioEvent.intensity);
        } else if (audioEvent.type === 'coin-collision') {
          soundManagerRef.current?.playCoinCollision(audioEvent.intensity);
        } else if (audioEvent.type === 'coin-pocketed') {
          soundManagerRef.current?.playPocket();
        }
      });

      if (interactionRef.current.mode === 'aiming' && aimStateRef.current.isDragging) {
        if (!powerMeterRef.current.startTime) {
          powerMeterRef.current.startTime = performance.now();
        }

        const elapsed = performance.now() - powerMeterRef.current.startTime;
        const phase = (elapsed % POWER_METER_CYCLE_MS) / POWER_METER_CYCLE_MS;
        const nextPower = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;

        if (Math.abs(nextPower - shotPowerRef.current) > 0.01) {
          setCurrentShotPower(nextPower);
        }
      } else if (shotPowerRef.current !== 0) {
        resetPowerMeter();
      }

      const isMovingNow = isAnyPieceMoving(boardStateRef.current, MIN_VELOCITY);
      const dimStriker =
        !isMovingNow && isStrikerOverlappingCoin(boardStateRef.current, displaySize);

      if (boardStateRef.current.shotInProgress && !isMovingNow) {
        const shotSummary = finishShot(boardStateRef.current);
        const scorePenalty = shotSummary.strikerPocketed ? 1 : 0;
        const blackCount = shotSummary.pocketedCoinTypes.filter(
          (type) => type === 'black'
        ).length;
        const whiteCount = shotSummary.pocketedCoinTypes.filter(
          (type) => type === 'white'
        ).length;
        const queenCount = shotSummary.pocketedCoinTypes.filter(
          (type) => type === 'queen'
        ).length;
        const hasFollowCoin = blackCount > 0 || whiteCount > 0;
        let queenBonus = 0;

        if (pendingQueenCoverRef.current?.player === activePlayerRef.current) {
          if (hasFollowCoin) {
            queenBonus = 50;
          } else {
            respotCoin(
              boardStateRef.current,
              { id: 'queen', type: 'queen' },
              QUEEN_HOME_POSITION
            );
          }

          pendingQueenCoverRef.current = null;
        }

        if (shotSummary.coinsPocketed > 0) {
          const playerKey =
            activePlayerRef.current === 1 ? 'player1' : 'player2';
          const currentPlayerPosition = getPlayerStrikerPosition(
            activePlayerRef.current
          );
          const comboCount = shotSummary.coinsPocketed;
          const comboBonus = comboCount > 1 ? comboCount - 1 : 0;
          const shotScore = getShotScore(shotSummary.pocketedCoinTypes);
          const earnedPoints = shotScore + queenBonus + comboBonus;

          resetStriker(
            boardStateRef.current,
            currentPlayerPosition,
            STRIKER_SHOOTING_RANGE,
            STRIKER_PLACEMENT_BUFFER,
            STRIKER_SPAWN_PROTECTION_FRAMES
          );
          setScores((currentScores) => {
            const nextScores = {
              ...currentScores,
              [playerKey]:
                Math.max(
                  0,
                  currentScores[playerKey] +
                    shotScore +
                    queenBonus +
                    comboBonus -
                    scorePenalty
                ),
            };

            if (hasWinnerByScore(nextScores) || boardStateRef.current.coins.length === 0) {
              setGameOver(true);
              setWinnerMessage(getWinnerMessage(nextScores));
            }

            return nextScores;
          });

          if (comboCount > 1) {
            showComboFeedback(comboCount, earnedPoints);
          } else {
            resetComboFeedback();
          }

          if (earnedPoints > 0) {
            showCoinPocketFeedback(earnedPoints);
          } else {
            resetCoinPocketFeedback();
          }

          if (queenCount > 0) {
            pendingQueenCoverRef.current = {
              player: activePlayerRef.current,
            };
          }
        } else if (boardStateRef.current.coins.length === 0) {
          resetComboFeedback();
          resetCoinPocketFeedback();
          resetStriker(
            boardStateRef.current,
            getPlayerStrikerPosition(activePlayerRef.current),
            STRIKER_SHOOTING_RANGE,
            STRIKER_PLACEMENT_BUFFER,
            STRIKER_SPAWN_PROTECTION_FRAMES
          );
          if (scorePenalty > 0) {
            const playerKey =
              activePlayerRef.current === 1 ? 'player1' : 'player2';
            const nextScores = {
              ...scores,
              [playerKey]: Math.max(0, scores[playerKey] - scorePenalty),
            };

            setScores(nextScores);
            if (hasWinnerByScore(nextScores) || boardStateRef.current.coins.length === 0) {
              setGameOver(true);
              setWinnerMessage(getWinnerMessage(nextScores));
            }
          } else {
            setGameOver(true);
            setWinnerMessage(getWinnerMessage(scores));
          }
        } else {
          resetComboFeedback();
          resetCoinPocketFeedback();

          if (queenBonus > 0) {
            const playerKey =
              activePlayerRef.current === 1 ? 'player1' : 'player2';

            setScores((currentScores) => {
              const nextScores = {
                ...currentScores,
                [playerKey]: currentScores[playerKey] + queenBonus,
              };

              if (hasWinnerByScore(nextScores) || boardStateRef.current.coins.length === 0) {
                setGameOver(true);
                setWinnerMessage(getWinnerMessage(nextScores));
              }

              return nextScores;
            });
          }

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
          resetStriker(
            boardStateRef.current,
            getPlayerStrikerPosition(nextPlayer),
            STRIKER_SHOOTING_RANGE,
            STRIKER_PLACEMENT_BUFFER,
            STRIKER_SPAWN_PROTECTION_FRAMES
          );
        }
      }

      drawBoardScene(
        context,
        displaySize,
        boardStateRef.current,
        aimStateRef.current,
        {
          dimStriker,
          perfectShotActive,
        }
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
      window.clearTimeout(perfectShotTimeoutRef.current);
      window.clearTimeout(comboTimeoutRef.current);
      window.clearTimeout(coinPocketTimeoutRef.current);
      window.clearTimeout(turnFlashTimeoutRef.current);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleSoundToggle = () => {
    soundManagerRef.current?.unlock();
    const nextMuted = soundManagerRef.current?.toggleMuted() ?? false;
    setIsSoundMuted(nextMuted);
  };

  const boardWinnerMessage =
    winnerMessage === "It's a tie!"
      ? "It's a Draw!"
      : winnerMessage.replace('wins!', 'Wins!');

  return (
    <section className="game-layout" aria-label="Carrom game area">
      <div className="board-wrapper">
        <div className="board-canvas-shell" style={{ width: boardSize, height: boardSize }}>
          <div
            className={`board-perfect-shot-banner ${perfectShotActive ? 'board-perfect-shot-banner-visible' : ''}`}
            aria-hidden={!perfectShotActive}
          >
            Perfect Shot!
          </div>
          <div
            className={`board-combo-banner ${comboState.visible ? 'board-combo-banner-visible' : ''}`}
            aria-hidden={!comboState.visible}
          >
            Combo x{comboState.count}
            {comboState.points > 0 ? `  +${comboState.points}` : ''}
          </div>
          <div
            className={`board-coin-pocket-banner ${coinPocketState.visible ? 'board-coin-pocket-banner-visible' : ''}`}
            aria-hidden={!coinPocketState.visible}
          >
            {coinPocketState.label}
          </div>
          {gameOver ? (
            <div className="board-game-over-overlay" role="dialog" aria-modal="true">
              <div className="board-game-over-card">
                <p className="board-game-over-kicker">Match Complete</p>
                <h3 className="board-game-over-title">{boardWinnerMessage}</h3>
                <button type="button" className="restart-button" onClick={resetGame}>
                  Play Again
                </button>
              </div>
            </div>
          ) : null}
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
        <div
          className={`turn-change-banner ${turnFlashVisible ? 'turn-change-banner-visible' : ''}`}
          aria-hidden={!turnFlashVisible}
        >
          Turn Changed
        </div>
        <div className="panel-header">
          <p className="panel-kicker">Match Status</p>
        </div>
        <button
          type="button"
          className="sound-toggle"
          onClick={handleSoundToggle}
          aria-pressed={isSoundMuted}
        >
          {isSoundMuted ? 'Unmute' : 'Mute'}
        </button>
        <div className="turn-panel">
          <p className="turn-label">
            Current Turn
            <span>Player {activePlayer} Turn</span>
          </p>
          <div className="score-card">
            <div className={`score-row ${activePlayer === 2 ? 'score-row-active' : ''}`}>
              <span>Player 2</span>
              <div className="score-row-meta">
                <span
                  className={`score-row-timer ${activePlayer === 2 ? 'score-row-timer-active' : ''} ${activePlayer === 2 && turnTimeLeft <= 10 ? 'score-row-timer-warning' : ''}`}
                >
                  {activePlayer === 2 ? `${turnTimeLeft}s` : `${TURN_TIMER_SECONDS}s`}
                </span>
                <strong>{scores.player2}</strong>
              </div>
            </div>
            <div className={`score-row ${activePlayer === 1 ? 'score-row-active' : ''}`}>
              <span>Player 1</span>
              <div className="score-row-meta">
                <span
                  className={`score-row-timer ${activePlayer === 1 ? 'score-row-timer-active' : ''} ${activePlayer === 1 && turnTimeLeft <= 10 ? 'score-row-timer-warning' : ''}`}
                >
                  {activePlayer === 1 ? `${turnTimeLeft}s` : `${TURN_TIMER_SECONDS}s`}
                </span>
                <strong>{scores.player1}</strong>
              </div>
            </div>
          </div>
        </div>
        {gameOver ? (
          <p className="game-over-message">{winnerMessage}</p>
        ) : null}
        <p className="striker-placement-hint">Use ← and → for moving and adjusting striker</p>
        <div className="power-meter">
          <div className="power-meter-label">
            <span>Shot Power</span>
            <strong>{Math.round(shotPower * 100)}%</strong>
          </div>
          <div className="power-meter-track">
            <div
              className="power-meter-perfect-zone"
              style={{
                left: `${PERFECT_SHOT_RANGE.min * 100}%`,
                width: `${(PERFECT_SHOT_RANGE.max - PERFECT_SHOT_RANGE.min) * 100}%`,
              }}
            />
            <div
              className="power-meter-fill"
              style={{ width: `${shotPower * 100}%` }}
            />
            <div
              className={`power-meter-indicator ${perfectShotActive ? 'power-meter-indicator-perfect' : ''}`}
              style={{ left: `calc(${shotPower * 100}% - 9px)` }}
            />
          </div>
          <div className="power-meter-scale" aria-hidden="true">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
          <p className={`perfect-shot-message ${perfectShotActive ? 'perfect-shot-message-visible' : ''}`}>
            Perfect Shot!
          </p>
        </div>
        <button type="button" className="restart-button" onClick={resetGame}>
          Restart Game
        </button>
      </aside>
    </section>
  );
}

export default GameBoard;
