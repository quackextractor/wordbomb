/**
 * Socket.IO handlers for lobby functionality (creating/joining rooms)
 */
const setupLobbyHandlers = (io, socket, rooms, games) => {
  /**
   * Handle room creation and joining
   */
  socket.on('room:join', (data) => {
    try {
      const { roomId, playerId, playerName, playerAvatar, playerColor, isHost } = data;
      
      // Validate required data
      if (!roomId || !playerId || !playerName) {
        socket.emit('error', 'Missing required fields');
        return;
      }
      
      // Check if room exists for non-host players
      if (!isHost && !rooms.has(roomId)) {
        socket.emit('error', 'Room does not exist');
        return;
      }
      
      // Check if player is already in a room
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });
      
      // Join the socket room
      socket.join(roomId);
      
      // Create room if it doesn't exist (only for hosts)
      if (!rooms.has(roomId)) {
        if (!isHost) {
          socket.emit('error', 'Room does not exist');
          socket.leave(roomId);
          return;
        }
        
        const newRoom = {
          id: roomId,
          hostId: playerId,
          players: [],
          mode: null,
          status: 'waiting',
          createdAt: new Date()
        };
        rooms.set(roomId, newRoom);
        console.log(`New room created: ${roomId} by host ${playerName} (${playerId})`);
      }
      
      // Get the room
      const room = rooms.get(roomId);
      
      // If this is the first player and no host is set, make them the host
      let playerIsHost = isHost;
      if (room.players.length === 0 && !room.hostId) {
        room.hostId = playerId;
        playerIsHost = true;
      }
      
      // Check if player is already in the room
      const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);
      
      if (existingPlayerIndex >= 0) {
        // Update existing player
        room.players[existingPlayerIndex] = {
          id: playerId,
          name: playerName,
          avatar: playerAvatar,
          color: playerColor,
          isHost: room.hostId === playerId
        };
      } else {
        // Add new player
        room.players.push({
          id: playerId,
          name: playerName,
          avatar: playerAvatar,
          color: playerColor,
          isHost: room.hostId === playerId
        });
      }
      
      // Broadcast room update to all players
      io.to(roomId).emit('room:update', room);
      
      console.log(`Player ${playerName} (${playerId}) joined room ${roomId}`);
      console.log(`Room ${roomId} now has ${room.players.length} players`);
    } catch (error) {
      console.error('Error in room:join handler:', error);
      socket.emit('error', 'Failed to join room');
    }
  });
  
  /**
   * Handle player leaving a room
   */
  socket.on('room:leave', (data) => {
    try {
      const { roomId, playerId } = data;
      
      // Validate required data
      if (!roomId || !playerId) {
        socket.emit('error', 'Missing required fields');
        return;
      }
      
      // Leave the socket room
      socket.leave(roomId);
      
      // Check if room exists
      if (!rooms.has(roomId)) {
        return;
      }
      
      const room = rooms.get(roomId);
      
      // Remove player from room
      room.players = room.players.filter(player => player.id !== playerId);
      
      // If room is empty, remove it
      if (room.players.length === 0) {
        rooms.delete(roomId);
        games.delete(roomId);
        console.log(`Room ${roomId} removed (empty)`);
        return;
      }
      
      // If host left, assign new host
      if (room.hostId === playerId && room.players.length > 0) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
        console.log(`New host assigned in room ${roomId}: ${room.hostId}`);
      }
      
      // Broadcast room update to all players
      io.to(roomId).emit('room:update', room);
      
      console.log(`Player ${playerId} left room ${roomId}`);
    } catch (error) {
      console.error('Error in room:leave handler:', error);
      socket.emit('error', 'Failed to leave room');
    }
  });
  
  /**
   * Handle room existence check
   */
  socket.on('room:check', (data, callback) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        callback({ exists: false, error: 'Room ID is required' });
        return;
      }
      
      const exists = rooms.has(roomId);
      callback({ exists });
    } catch (error) {
      console.error('Error in room:check handler:', error);
      callback({ exists: false, error: 'Failed to check room' });
    }
  });
};

export default setupLobbyHandlers;