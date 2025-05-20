import express from 'express';
import http from 'http';
import {Server} from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

import roomsRouter from './routes/rooms.js';
import validateRouter from './routes/validate.js';

import setupLobbyHandlers from './sockets/lobby.js';
import setupGameHandlers from './sockets/game.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api/rooms', roomsRouter);
app.use('/api/validate', validateRouter);

app.get('/health', (req, res) => {
    res.status(200).json({status: 'ok'});
});

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const rooms = new Map();
const games = new Map();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    setupLobbyHandlers(io, socket, rooms, games);

    setupGameHandlers(io, socket, rooms, games);

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        for (const [roomId, room] of rooms.entries()) {
            room.players = room.players.filter(player => player.id !== socket.id);

            if (room.players.length === 0) {
                rooms.delete(roomId);
                games.delete(roomId);
                console.log(`Room ${roomId} removed (empty)`);
            } else if (room.hostId === socket.id && room.players.length > 0) {
                room.hostId = room.players[0].id;
                room.players[0].isHost = true;
                console.log(`New host assigned in room ${roomId}: ${room.hostId}`);

                io.to(roomId).emit('room:update', room);
            } else if (room.players.length > 0) {
                io.to(roomId).emit('room:update', room);
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;