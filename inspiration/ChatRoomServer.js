const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// Trust proxy (important if behind Azure proxy/load balancer)
app.set('trust proxy', 1);

// Log incoming requests and response headers (to debug CORS issues)
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url} Origin: ${req.headers.origin}`);
  res.on('finish', () => {
    console.log('Response headers:', res.getHeaders());
  });
  next();
});

// Apply CORS to all HTTP requests (including engine.io polling)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://kingfishfrontend-c3eff4fhandsc0f9.westeurope-01.azurewebsites.net'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

// Simple health check
app.get('/', (req, res) => res.send('Chat backend is up.'));

// Create HTTP server & Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://kingfishfrontend-c3eff4fhandsc0f9.westeurope-01.azurewebsites.net'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  // For debugging CORS & connection issues, force polling only temporarily:
  transports: ['polling']
});

// Log handshake errors for debugging
io.engine.on('connection_error', (err) => {
  console.error('👾 Engine handshake error:', {
    code: err.code,
    message: err.message,
    reqHeaders: err.req?.headers
  });
});

io.on('connection', (socket) => {
  console.log('✅ New WS client connected:', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
    console.log(`→ ${socket.id} joined room ${room}`);
  });

  socket.on('message', ({ room, text }) => {
    io.to(room).emit('message', text);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', reason);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
