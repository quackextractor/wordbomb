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
import { createGame } from './game.js';

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

    // Lobby events
    socket.on('room:create', ({ roomId, player }) => {
        if (rooms.has(roomId)) {
            socket.emit('error', 'Room already exists');
            return;
        }
        const room = {
            id: roomId,
            hostId: player.id,
            players: [player],
            status: 'waiting',
            createdAt: new Date()
        };
        rooms.set(roomId, room);
        socket.join(roomId);
        socket.emit('room:created', room);
        io.to(roomId).emit('room:update', room);
    });

    socket.on('room:join', ({ roomId, player }) => {
        if (!rooms.has(roomId)) {
            socket.emit('error', 'Room does not exist');
            return;
        }
        const room = rooms.get(roomId);
        if (room.players.find(p => p.id === player.id)) {
            socket.emit('error', 'Player already in room');
            return;
        }
        room.players.push(player);
        socket.join(roomId);
        io.to(roomId).emit('room:update', room);
    });

    socket.on('room:leave', ({ roomId, playerId }) => {
        if (!rooms.has(roomId)) return;
        const room = rooms.get(roomId);
        room.players = room.players.filter(p => p.id !== playerId);
        if (room.players.length === 0) {
            rooms.delete(roomId);
            games.delete(roomId);
        } else if (room.hostId === playerId) {
            room.hostId = room.players[0].id;
        }
        io.to(roomId).emit('room:update', room);
    });

    // Game events
    socket.on('game:start', ({ roomId, mode }) => {
        if (!rooms.has(roomId)) {
            socket.emit('error', 'Room not found');
            return;
        }
        const room = rooms.get(roomId);
        if (room.hostId !== socket.id) {
            socket.emit('error', 'Only the host can start the game');
            return;
        }
        const game = createGame(roomId, mode, room.players);
        game.status = 'playing';
        games.set(roomId, game);
        io.to(roomId).emit('game:start', game.toState());
    });

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