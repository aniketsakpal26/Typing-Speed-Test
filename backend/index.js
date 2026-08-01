const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const WebSocket = require('ws');
const http = require('http');
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/typetest", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ MongoDB Connected");
})
.catch(err => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/typing", require("./routes/typing"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// Store active rooms
const rooms = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(ws, data);
    } catch (err) {
      console.error('WebSocket message error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    handlePlayerDisconnect(ws);
  });
});

function handleWebSocketMessage(ws, data) {
  switch (data.type) {
    case 'createRoom':
      createRoom(ws, data);
      break;
    case 'joinRoom':
      joinRoom(ws, data);
      break;
    case 'leaveRoom':
      leaveRoom(ws);
      break;
    case 'toggleReady':
      toggleReady(ws, data);
      break;
    case 'startGame':
      startGame(ws, data);
      break;
    case 'progress':
      updateProgress(ws, data);
      break;
    case 'gameEnd':
      handleGameEnd(ws, data);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

function createRoom(ws, data) {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const room = {
    code: roomCode,
    host: ws,
    players: [{
      ws,
      username: data.username,
      isHost: true,
      ready: true,
      progress: 0,
      wpm: 0,
      accuracy: 0,
      finished: false
    }],
    inGame: false,
    gameText: null
  };
  
  rooms.set(roomCode, room);
  ws.roomCode = roomCode;
  
  ws.send(JSON.stringify({
    type: 'roomCreated',
    roomCode,
    isHost: true
  }));

  broadcastToRoom(room, {
    type: 'playerJoined',
    players: getPlayerList(room)
  });
}

function joinRoom(ws, data) {
  const room = rooms.get(data.roomCode);
  
  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }
  
  if (room.players.length >= 4) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
    return;
  }
  
  if (room.inGame) {
    ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress' }));
    return;
  }
  
  room.players.push({
    ws,
    username: data.username,
    isHost: false,
    ready: false,
    progress: 0,
    wpm: 0,
    accuracy: 0,
    finished: false
  });
  
  ws.roomCode = data.roomCode;
  
  ws.send(JSON.stringify({
    type: 'roomJoined',
    roomCode: data.roomCode,
    isHost: false,
    players: getPlayerList(room)
  }));

  broadcastToRoom(room, {
    type: 'playerJoined',
    players: getPlayerList(room)
  });
}

function toggleReady(ws, data) {
  const room = rooms.get(data.roomCode);
  if (!room) return;

  const player = room.players.find(p => p.ws === ws);
  if (!player || player.isHost) return;

  player.ready = !player.ready;

  broadcastToRoom(room, {
    type: 'playerReady',
    players: getPlayerList(room)
  });
}

function leaveRoom(ws) {
  const roomCode = ws.roomCode;
  if (!roomCode) return;
  
  const room = rooms.get(roomCode);
  if (!room) return;
  
  room.players = room.players.filter(p => p.ws !== ws);
  
  if (room.players.length === 0) {
    rooms.delete(roomCode);
  } else {
    if (ws === room.host) {
      room.host = room.players[0].ws;
      room.players[0].isHost = true;
    }
    
    broadcastToRoom(room, {
      type: 'playerLeft',
      players: getPlayerList(room)
    });
  }
  
  delete ws.roomCode;
}

function handlePlayerDisconnect(ws) {
  leaveRoom(ws);
}

function startGame(ws, data) {
  const room = rooms.get(data.roomCode);
  
  if (!room || ws !== room.host) return;
  
  const readyPlayers = room.players.filter(p => p.ready || p.isHost).length;
  if (readyPlayers < 2) return;
  
  room.inGame = true;
  room.gameText = getRandomText();
  
  broadcastToRoom(room, {
    type: 'gameStarting',
    text: room.gameText
  });

  // Reset player progress
  room.players.forEach(player => {
    player.progress = 0;
    player.wpm = 0;
  });
}

function updateProgress(ws, data) {
  const room = rooms.get(data.roomCode);
  if (!room) return;
  
  const player = room.players.find(p => p.ws === ws);
  if (!player) return;

  player.progress = data.progress;
  player.wpm = data.wpm;
  
  broadcastToRoom(room, {
    type: 'gameUpdate',
    username: player.username,
    wpm: data.wpm,
    progress: data.progress
  });
}

function handleGameEnd(ws, data) {
  const room = rooms.get(data.roomCode);
  if (!room) return;
  
  const player = room.players.find(p => p.ws === ws);
  if (!player) return;

  player.progress = 100;
  player.wpm = data.wpm;
  player.accuracy = data.accuracy;
  player.finished = true;
  
  broadcastToRoom(room, {
    type: 'playerFinished',
    username: player.username,
    wpm: data.wpm,
    accuracy: data.accuracy
  });

  // Check if all players finished
  const allFinished = room.players.every(p => p.progress === 100 || p.finished);
  if (allFinished) {
    room.inGame = false;
    room.gameText = null;
    
    // Prepare final results
    const finalResults = room.players.map(p => ({
      username: p.username,
      wpm: p.wpm || 0,
      accuracy: p.accuracy || 0,
      isHost: p.isHost
    }));
    
    // Reset ready states and finished flags
    room.players.forEach(p => {
      if (!p.isHost) p.ready = false;
      p.finished = false;
      p.progress = 0;
    });
    
    broadcastToRoom(room, {
      type: 'gameEnded',
      players: getPlayerList(room),
      finalResults: finalResults
    });
  }
}

function getPlayerList(room) {
  return room.players.map(p => ({
    username: p.username,
    isHost: p.isHost,
    ready: p.ready,
    progress: p.progress,
    wpm: p.wpm
  }));
}

function broadcastToRoom(room, message) {
  room.players.forEach(player => {
    try {
      player.ws.send(JSON.stringify(message));
    } catch (err) {
      console.error('Error sending message to player:', err);
    }
  });
}

function getRandomText() {
  const texts = [
    "The quick brown fox jumps over the lazy dog while the sun sets in the horizon creating a beautiful scene.",
    "Programming is the art of telling another human what one wants the computer to do in a way that is both precise and readable.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts in the face of adversity.",
    "Life is like riding a bicycle. To keep your balance, you must keep moving forward through all challenges.",
    "In three words I can sum up everything I've learned about life: it goes on, regardless of circumstances."
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
