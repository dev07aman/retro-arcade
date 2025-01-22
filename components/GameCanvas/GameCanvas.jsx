'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import io from 'socket.io-client';

// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_HEIGHT = 100;
const PADDLE_SPEED = 400;

const GameCanvas = ({ roomId, isHost }) => {
  const gameRef = useRef(null);
  const socketRef = useRef(null);
  const canvasRef = useRef(null);
  const [score, setScore] = useState({ player1: 0, player2: 0 });
  const [gameOver, setGameOver] = useState(null);
  const [error, setError] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState(roomId);
  const hasConnected = useRef(false);
  const hasCreatedRoom = useRef(false);
  const lastBallUpdate = useRef(0);

  const handlePlayAgain = () => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('playAgain', currentRoomId);
    setGameOver(null);
  };

  // Socket connection setup - outside of effect to prevent recreation
  const setupSocket = () => {
    if (socketRef.current?.connected || hasConnected.current) return;

    console.log('Setting up socket connection...');
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      if (hasConnected.current) return;
      hasConnected.current = true;
      console.log('Connected to server');

      // Only create/join room if we haven't already
      if (isHost && !hasCreatedRoom.current) {
        console.log('Creating room as host');
        hasCreatedRoom.current = true;
        socketRef.current.emit('createRoom', (response) => {
          console.log('Create room response:', response);
          if (response.error) {
            setError(response.error);
          } else if (response.roomId) {
            setCurrentRoomId(response.roomId);
          }
        });
      } else if (currentRoomId && !hasCreatedRoom.current) {
        console.log('Joining room:', currentRoomId);
        hasCreatedRoom.current = true;
        socketRef.current.emit('joinRoom', currentRoomId, (response) => {
          console.log('Join room response:', response);
          if (response.error) {
            setError(response.error);
            hasCreatedRoom.current = false;
          }
        });
      }
    });

    // Socket event handlers
    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('Failed to connect to server');
      hasConnected.current = false;
      hasCreatedRoom.current = false;
    });

    socketRef.current.on('gameUpdate', (state) => {
      if (!gameRef.current) return;
      const scene = gameRef.current.scene.scenes[0];
      if (!scene || !scene.ball) return;

      // Only update if this is a newer state
      if (state.timestamp <= lastBallUpdate.current) return;
      lastBallUpdate.current = state.timestamp;

      // Smoothly interpolate ball position
      const ball = scene.ball;
      const targetX = state.ball.x;
      const targetY = state.ball.y;
      
      // Calculate distance to move
      const dx = targetX - ball.x;
      const dy = targetY - ball.y;
      
      // Move ball towards target position
      ball.x += dx * 0.5;
      ball.y += dy * 0.5;

      // Update velocities
      if (state.ball.velocityX) ball.body.velocity.x = state.ball.velocityX;
      if (state.ball.velocityY) ball.body.velocity.y = state.ball.velocityY;
    });

    socketRef.current.on('paddleUpdate', ({ paddle, y }) => {
      if (!gameRef.current) return;
      const scene = gameRef.current.scene.scenes[0];
      if (!scene) return;
      
      if ((isHost && paddle === 'player2') || (!isHost && paddle === 'player1')) {
        scene.opponentPaddle.y = y;
      }
    });

    socketRef.current.on('scoreUpdate', (newScore) => {
      setScore(newScore);
      if (gameRef.current) {
        const scene = gameRef.current.scene.scenes[0];
        if (scene && scene.scoreText) {
          scene.scoreText.setText(`${newScore.player1} - ${newScore.player2}`);
        }
      }
    });

    socketRef.current.on('gameOver', (data) => {
      setGameOver(data);
    });

    socketRef.current.on('gameRestart', () => {
      setGameOver(null);
      setScore({ player1: 0, player2: 0 });
      if (gameRef.current) {
        const scene = gameRef.current.scene.scenes[0];
        if (scene) {
          scene.scoreText.setText('0 - 0');
          scene.ball.setPosition(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
          scene.ball.body.velocity.set(0, 0);
          scene.playerPaddle.setPosition(
            isHost ? 50 : CANVAS_WIDTH - 50,
            CANVAS_HEIGHT / 2
          );
          scene.opponentPaddle.setPosition(
            isHost ? CANVAS_WIDTH - 50 : 50,
            CANVAS_HEIGHT / 2
          );
        }
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setError('Connection lost. Please refresh the page.');
      hasConnected.current = false;
      hasCreatedRoom.current = false;
    });
  };

  useEffect(() => {
    let mounted = true;

    const initGame = () => {
      if (!window.Phaser) return;
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }

      const config = {
        type: Phaser.AUTO,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        parent: 'game-container',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        },
        scene: {
          create: function() {
            // Create paddles as sprites instead of rectangles
            this.playerPaddle = this.add.rectangle(
              isHost ? 50 : CANVAS_WIDTH - 50,
              CANVAS_HEIGHT / 2,
              20,
              PADDLE_HEIGHT,
              0xFFFFFF
            );
            this.physics.world.enable(this.playerPaddle);
            this.playerPaddle.body.setImmovable(true);
            this.playerPaddle.body.setCollideWorldBounds(true);

            this.opponentPaddle = this.add.rectangle(
              isHost ? CANVAS_WIDTH - 50 : 50,
              CANVAS_HEIGHT / 2,
              20,
              PADDLE_HEIGHT,
              0xFFFFFF
            );
            this.physics.world.enable(this.opponentPaddle);
            this.opponentPaddle.body.setImmovable(true);
            this.opponentPaddle.body.setCollideWorldBounds(true);

            // Create ball
            this.ball = this.add.circle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 10, 0xFFFFFF);
            this.physics.world.enable(this.ball);
            this.ball.body.setCollideWorldBounds(true);
            this.ball.body.setBounce(1, 1);
            this.ball.body.setCircle(10);

            // Add colliders
            this.physics.add.collider(this.ball, this.playerPaddle);
            this.physics.add.collider(this.ball, this.opponentPaddle);

            // Setup input
            this.cursors = this.input.keyboard.createCursorKeys();

            // Add score text
            this.scoreText = this.add.text(
              CANVAS_WIDTH / 2,
              50,
              '0 - 0',
              {
                fontSize: '32px',
                fill: '#fff'
              }
            ).setOrigin(0.5);
          },
          update: function() {
            // Handle paddle movement
            if (this.cursors.up.isDown) {
              this.playerPaddle.y = Math.max(
                PADDLE_HEIGHT / 2,
                this.playerPaddle.y - PADDLE_SPEED * (1/60)
              );
              socketRef.current?.emit('paddleMove', this.playerPaddle.y);
            }
            else if (this.cursors.down.isDown) {
              this.playerPaddle.y = Math.min(
                CANVAS_HEIGHT - PADDLE_HEIGHT / 2,
                this.playerPaddle.y + PADDLE_SPEED * (1/60)
              );
              socketRef.current?.emit('paddleMove', this.playerPaddle.y);
            }
          }
        }
      };

      gameRef.current = new Phaser.Game(config);
    };

    // Initialize game and socket connection
    if (typeof window !== 'undefined') {
      import('phaser').then(() => {
        initGame();
        setupSocket();
      }).catch(error => {
        console.error('Failed to load Phaser:', error);
        setError('Failed to load game engine');
      });
    }

    return () => {
      mounted = false;
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
      // Don't disconnect socket here, let it persist
    };
  }, [isHost]); // Only re-run if isHost changes

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        hasConnected.current = false;
        hasCreatedRoom.current = false;
      }
    };
  }, []);

  return (
    <div className="relative">
      <div id="game-container" className="rounded-lg overflow-hidden bg-black" />
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center">
          {error}
        </div>
      )}
      {gameOver && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 p-4 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
          <p>Winner: {gameOver.winner}</p>
          <p>Score: {gameOver.score.player1} - {gameOver.score.player2}</p>
          {isHost && (
            <button
              onClick={handlePlayAgain}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Play Again
            </button>
          )}
        </div>
      )}
      {currentRoomId && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-80 p-2 rounded text-white">
          Room ID: {currentRoomId}
        </div>
      )}
    </div>
  );
};

export default dynamic(() => Promise.resolve(GameCanvas), { ssr: false });