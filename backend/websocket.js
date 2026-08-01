const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });
  
  // Store active multiplayer rooms
  const rooms = new Map();

  wss.on('connection', (ws) => {
    let userId = null;
    let currentRoom = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'auth':
            // Verify user token
            try {
              const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
              userId = decoded.id;
              ws.send(JSON.stringify({ type: 'auth', status: 'success' }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'auth', status: 'error', error: 'Invalid token' }));
            }
            break;

          case 'create_room':
            if (!userId) break;
            
            const roomId = Math.random().toString(36).substring(7);
            rooms.set(roomId, {
              players: new Map([[userId, { ws, wpm: 0, progress: 0 }]]),
              text: data.text,
              status: 'waiting'
            });
            currentRoom = roomId;
            
            ws.send(JSON.stringify({
              type: 'room_created',
              roomId,
              text: data.text
            }));
            break;

          case 'join_room':
            if (!userId || !rooms.has(data.roomId)) break;
            
            const room = rooms.get(data.roomId);
            if (room.status !== 'waiting') {
              ws.send(JSON.stringify({ type: 'error', error: 'Game already started' }));
              break;
            }
            
            room.players.set(userId, { ws, wpm: 0, progress: 0 });
            currentRoom = data.roomId;
            
            // Notify all players in the room
            room.players.forEach((player) => {
              player.ws.send(JSON.stringify({
                type: 'player_joined',
                players: Array.from(room.players.keys()).length
              }));
            });
            break;

          case 'update_progress':
            if (!userId || !currentRoom || !rooms.has(currentRoom)) break;
            
            const currentGame = rooms.get(currentRoom);
            const player = currentGame.players.get(userId);
            if (player) {
              player.wpm = data.wpm;
              player.progress = data.progress;
              
              // Send progress to all players
              currentGame.players.forEach((p) => {
                if (p.ws !== ws) {
                  p.ws.send(JSON.stringify({
                    type: 'opponent_progress',
                    userId,
                    wpm: data.wpm,
                    progress: data.progress
                  }));
                }
              });
            }
            break;
        }
      } catch (err) {
        console.error('WebSocket error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const room = rooms.get(currentRoom);
        room.players.delete(userId);
        
        if (room.players.size === 0) {
          rooms.delete(currentRoom);
        } else {
          // Notify remaining players
          room.players.forEach((player) => {
            player.ws.send(JSON.stringify({
              type: 'player_left',
              players: room.players.size
            }));
          });
        }
      }
    });
  });

  return wss;
}

module.exports = setupWebSocket; 