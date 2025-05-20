import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import roomsRouter from './routes/rooms.js';
import validateRouter from './routes/validate.js';

// Import socket handlers
import setupLobbyHandlers from './sockets/lobby.js';
import setupGameHandlers from './sockets/game.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/rooms', roomsRouter);
app.use('/api/validate', validateRouter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// In-memory data store for rooms and games
const rooms = new Map();
const games = new Map();

// Set up socket handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Set up lobby handlers (create/join room)
  setupLobbyHandlers(io, socket, rooms, games);
  
  // Set up game handlers (gameplay)
  setupGameHandlers(io, socket, rooms, games);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find and clean up any rooms where this socket was the only player
    for (const [roomId, room] of rooms.entries()) {
      // Remove player from room
      room.players = room.players.filter(player => player.id !== socket.id);
      
      // If room is empty, remove it
      if (room.players.length === 0) {
        rooms.delete(roomId);
        games.delete(roomId);
        console.log(`Room ${roomId} removed (empty)`);
      } 
      // If host left, assign new host
      else if (room.hostId === socket.id && room.players.length > 0) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
        console.log(`New host assigned in room ${roomId}: ${room.hostId}`);
        
        // Notify remaining players
        io.to(roomId).emit('room:update', room);
      }
      // Otherwise just update the room
      else if (room.players.length > 0) {
        io.to(roomId).emit('room:update', room);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;