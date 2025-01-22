require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 10;
const INITIAL_BALL_SPEED = 400;
const WINNING_SCORE = 5;
const COUNTDOWN_SECONDS = 3;
const TICK_RATE = 60;
const BALL_UPDATE_INTERVAL = 1000 / 20;

// Server Setup
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6
});

// Game State Management
const rooms = new Map();

// Helper Functions
const generateRoomId = () => Math.random().toString().substr(2, 5);
const createInitialBallState = () => ({
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT / 2,
  velocityX: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
  velocityY: INITIAL_BALL_SPEED * (Math.random() * 2 - 1)
});

// Game Loop Logic
const runGameLoop = (roomId) => {
  const room = rooms.get(roomId);
  if (!room || !room.isActive) return;

  let lastUpdate = Date.now();
  
  const gameLoop = setInterval(() => {
    if (!room.isActive) {
      clearInterval(gameLoop);
      return;
    }

    const now = Date.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;

    // Update ball position
    const ball = room.gameState.ball;
    ball.x += ball.velocityX * delta;
    ball.y += ball.velocityY * delta;

    // Ball collisions with walls
    if (ball.y <= BALL_SIZE || ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      ball.velocityY *= -1;
      ball.y = ball.y <= BALL_SIZE ? BALL_SIZE : CANVAS_HEIGHT - BALL_SIZE;
    }

    // Ball collisions with paddles
    const leftPaddle = room.gameState.paddles.player1;
    const rightPaddle = room.gameState.paddles.player2;
    
    // Left paddle collision
    if (ball.x <= 50 + BALL_SIZE && 
        ball.y >= leftPaddle - PADDLE_HEIGHT/2 && 
        ball.y <= leftPaddle + PADDLE_HEIGHT/2) {
      const relativeY = (ball.y - leftPaddle) / (PADDLE_HEIGHT/2);
      const bounceAngle = relativeY * Math.PI/4; // 45 degrees max
      const speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
      
      ball.velocityX = Math.cos(bounceAngle) * speed * 1.1; // Increase speed slightly
      ball.velocityY = Math.sin(bounceAngle) * speed;
      ball.x = 50 + BALL_SIZE; // Prevent sticking
    }

    // Right paddle collision
    if (ball.x >= CANVAS_WIDTH - 50 - BALL_SIZE && 
        ball.y >= rightPaddle - PADDLE_HEIGHT/2 && 
        ball.y <= rightPaddle + PADDLE_HEIGHT/2) {
      const relativeY = (ball.y - rightPaddle) / (PADDLE_HEIGHT/2);
      const bounceAngle = relativeY * Math.PI/4; // 45 degrees max
      const speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
      
      ball.velocityX = -Math.cos(bounceAngle) * speed * 1.1; // Increase speed slightly
      ball.velocityY = Math.sin(bounceAngle) * speed;
      ball.x = CANVAS_WIDTH - 50 - BALL_SIZE; // Prevent sticking
    }

    // Scoring
    if (ball.x <= 0 || ball.x >= CANVAS_WIDTH) {
      const scorer = ball.x <= 0 ? 'player2' : 'player1';
      room.gameState.score[scorer]++;
      io.to(roomId).emit('scoreUpdate', room.gameState.score);

      // Check for game over
      if (room.gameState.score[scorer] >= WINNING_SCORE) {
        room.isActive = false;
        io.to(roomId).emit('gameOver', {
          winner: scorer,
          score: room.gameState.score
        });
        clearInterval(gameLoop);
        return;
      }

      // Reset ball with delay
      setTimeout(() => {
        if (room.isActive) {
          Object.assign(room.gameState.ball, createInitialBallState());
          io.to(roomId).emit('gameUpdate', {
            ...room.gameState,
            timestamp: Date.now()
          });
        }
      }, 1000);

      // Stop ball temporarily
      ball.velocityX = 0;
      ball.velocityY = 0;
      ball.x = CANVAS_WIDTH / 2;
      ball.y = CANVAS_HEIGHT / 2;
    }

    // Broadcast game state with timestamp
    if (now - room.lastBroadcast > BALL_UPDATE_INTERVAL) {
      io.to(roomId).emit('gameUpdate', {
        ...room.gameState,
        timestamp: Date.now()
      });
      room.lastBroadcast = now;
    }
  }, 1000 / TICK_RATE);

  room.gameLoop = gameLoop;
};

// Game Management Functions
const resetBall = (roomId) => {
  const room = rooms.get(roomId);
  Object.assign(room.gameState.ball, createInitialBallState());
  io.to(roomId).emit('ballReset', room.gameState.ball);
};

const endGame = (roomId, winner) => {
  const room = rooms.get(roomId);
  room.isActive = false;
  io.to(roomId).emit('gameOver', { winner, score: room.gameState.score });
  setTimeout(() => rooms.delete(roomId), 5000);
};

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  let currentRoom = null;

  socket.on('createRoom', (callback) => {
    try {
      console.log('Creating room for socket:', socket.id);
      const roomId = generateRoomId();
      
      // Create new room
      rooms.set(roomId, {
        players: [socket.id],
        gameState: {
          ball: createInitialBallState(),
          paddles: { player1: CANVAS_HEIGHT / 2, player2: CANVAS_HEIGHT / 2 },
          score: { player1: 0, player2: 0 }
        },
        isActive: false,
        lastBroadcast: Date.now()
      });
      
      currentRoom = roomId;
      socket.join(roomId);
      console.log(`Room ${roomId} created by ${socket.id}`);
      
      // Send room ID back to client
      callback({ roomId });
    } catch (error) {
      console.error('Room creation error:', error);
      callback({ error: 'Failed to create room' });
    }
  });

  socket.on('joinRoom', (roomId, callback) => {
    try {
      console.log(`Socket ${socket.id} attempting to join room ${roomId}`);
      
      if (!rooms.has(roomId)) {
        console.log(`Room ${roomId} not found`);
        return callback({ error: 'Room not found' });
      }

      const room = rooms.get(roomId);
      
      // Check if room is full
      if (room.players.length >= 2) {
        console.log(`Room ${roomId} is full`);
        return callback({ error: 'Room is full' });
      }

      // Check if player is already in room
      if (room.players.includes(socket.id)) {
        console.log(`Socket ${socket.id} already in room ${roomId}`);
        return callback({ error: 'Already in room' });
      }

      // Join room
      room.players.push(socket.id);
      currentRoom = roomId;
      socket.join(roomId);
      
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      console.log(`Room ${roomId} now has ${room.players.length} players`);

      // Start game if room is full
      if (room.players.length === 2) {
        console.log(`Starting game in room ${roomId}`);
        room.isActive = true;
        io.to(roomId).emit('gameUpdate', room.gameState);
        runGameLoop(roomId);
      }

      callback({ success: true });
    } catch (error) {
      console.error('Join room error:', error);
      callback({ error: 'Failed to join room' });
    }
  });

  socket.on('paddleMove', (y) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (!room) return;

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex === -1) return;

    const paddle = playerIndex === 0 ? 'player1' : 'player2';
    room.gameState.paddles[paddle] = Math.max(PADDLE_HEIGHT / 2, 
      Math.min(y, CANVAS_HEIGHT - PADDLE_HEIGHT / 2));
    
    socket.to(currentRoom).emit('paddleUpdate', { paddle, y: room.gameState.paddles[paddle] });
  });

  socket.on('playAgain', (roomId) => {
    console.log(`Play again requested for room ${roomId}`);
    const room = rooms.get(roomId);
    if (!room) return;

    // Reset game state
    room.gameState = {
      ball: createInitialBallState(),
      paddles: { player1: CANVAS_HEIGHT / 2, player2: CANVAS_HEIGHT / 2 },
      score: { player1: 0, player2: 0 }
    };
    room.isActive = true;
    room.lastBroadcast = Date.now();

    // Notify clients
    io.to(roomId).emit('gameRestart');
    
    // Start new game loop
    runGameLoop(roomId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        console.log(`Removing player ${socket.id} from room ${currentRoom}`);
        room.players = room.players.filter(id => id !== socket.id);
        
        if (room.players.length === 0) {
          console.log(`Deleting empty room ${currentRoom}`);
          rooms.delete(currentRoom);
        } else {
          // Notify remaining players
          room.isActive = false;
          io.to(currentRoom).emit('gameOver', { 
            winner: 'Opponent disconnected', 
            score: room.gameState.score 
          });
        }
      }
    }
  });
});

// Start Server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});