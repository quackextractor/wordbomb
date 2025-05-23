const express = require("express")
const cors = require("cors")
const http = require("http")
const { Server } = require("socket.io")
const path = require("path")
const fs = require("fs")
const GameRoom = require("./gameRoom")
const WordManager = require("./wordManager")

const app = express()

// Trust proxy (important if behind a proxy/load balancer)
app.set("trust proxy", 1)

// Log incoming requests and response headers (to debug CORS issues)
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url} Origin: ${req.headers.origin}`)
  res.on("finish", () => {
    console.log("Response headers:", res.getHeaders())
  })
  next()
})

// Apply CORS to all HTTP requests (including engine.io polling)
app.use(
  cors({
    origin: [
      "http://localhost:2139",
      "http://127.0.0.1:2139",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://kingfishfrontend-c3eff4fhandsc0f9.westeurope-01.azurewebsites.net",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  }),
)

// Simple health check
app.get("/", (req, res) => res.send("WordBomb game server is running."))

// Create HTTP server & Socket.IO
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:2139",
      "http://127.0.0.1:2139",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://kingfishfrontend-c3eff4fhandsc0f9.westeurope-01.azurewebsites.net",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  // For debugging CORS & connection issues, force polling only temporarily:
  transports: ["polling", "websocket"],
})

// Initialize word manager
const wordManager = new WordManager()

// Store active game rooms
const gameRooms = new Map()

// Log handshake errors for debugging
io.engine.on("connection_error", (err) => {
  console.error("👾 Engine handshake error:", {
    code: err.code,
    message: err.message,
    reqHeaders: err.req?.headers,
  })
})

io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id)

  // Check if a room exists
  socket.on("room:check", ({ roomId }, callback) => {
    const room = gameRooms.get(roomId)
    if (room) {
      callback({ exists: true })
    } else {
      callback({ exists: false, error: "Room does not exist" })
    }
  })

  // Check if player can reconnect to an ongoing game
  socket.on("room:check_reconnect", ({ roomId, playerId }, callback) => {
    const room = gameRooms.get(roomId)
    if (room) {
      const reconnectState = room.getReconnectionState(playerId)
      callback(reconnectState)
    } else {
      callback({ canReconnect: false, error: "Room does not exist" })
    }
  })

  // Join a room
  socket.on("room:join", (data) => {
    const { roomId, playerId, playerName, playerAvatar, playerColor, isHost } = data

    // Create room if it doesn't exist and player is host
    if (!gameRooms.has(roomId) && isHost) {
      const newRoom = new GameRoom(roomId, wordManager)
      // Set up turn advancement callback for this room
      newRoom.setTurnAdvancedCallback((turnState) => {
        if (turnState.gameOver) {
          io.to(roomId).emit("game:over", {
            finalScores: turnState.finalScores,
            winner: turnState.winner,
          })
          console.log(`Game over in room ${roomId}, winner: ${turnState.winner || "none"}`)
        } else {
          io.to(roomId).emit("game:new_wordpiece", {
            wordpiece: turnState.wordpiece,
            timer: turnState.timer,
            currentTurn: turnState.currentTurn,
            lives: turnState.lives,
            eliminatedPlayers: turnState.eliminatedPlayers,
            usedWords: turnState.usedWords,
          })
        }
      })
      gameRooms.set(roomId, newRoom)
      console.log(`Created new room: ${roomId}`)
    }

    const room = gameRooms.get(roomId)

    if (!room) {
      socket.emit("error", "Room does not exist")
      return
    }

    // Add player to room
    const player = {
      id: playerId,
      name: playerName,
      nickname: playerName,
      avatar: playerAvatar,
      color: playerColor,
      isHost,
      socketId: socket.id,
    }

    const isReconnection = room.addPlayer(player)

    // Join socket.io room
    socket.join(roomId)

    // Send room update to all clients in the room
    io.to(roomId).emit("room:update", room.getRoomState())

    // If this is a reconnection to an active game, send the current game state
    if (isReconnection && room.gameInProgress) {
      socket.emit("game:reconnect", room.getGameState())
    }

    console.log(`Player ${playerName} (${playerId}) joined room ${roomId}`)
  })

  // Leave a room
  socket.on("room:leave", ({ roomId, playerId }) => {
    const room = gameRooms.get(roomId)
    if (room) {
      room.removePlayer(playerId)
      socket.leave(roomId)

      // If room is empty, delete it
      if (room.players.length === 0) {
        gameRooms.delete(roomId)
        console.log(`Room ${roomId} deleted (empty)`)
      } else {
        // Otherwise, send room update
        io.to(roomId).emit("room:update", room.getRoomState())
      }

      console.log(`Player ${playerId} left room ${roomId}`)
    }
  })

  // Start game with countdown
  socket.on("game:start_countdown", ({ roomId, countdown = 3 }) => {
    const room = gameRooms.get(roomId)
    if (room) {
      // Broadcast countdown to all players
      io.to(roomId).emit("game:countdown", { countdown })

      console.log(`Starting game countdown in room ${roomId}: ${countdown} seconds`)
    }
  })

  // Start game
  socket.on("game:start", ({ roomId, mode }) => {
    const room = gameRooms.get(roomId)
    if (room) {
      room.startGame(mode)

      // Send game start event to all clients in the room
      io.to(roomId).emit("game:start", room.getGameState())

      console.log(`Game started in room ${roomId} with mode ${mode}`)
    }
  })

  // Submit word - updated to handle async validation
  socket.on("game:submit", async ({ roomId, playerId, word, wordpiece }) => {
    const room = gameRooms.get(roomId)
    if (room) {
      console.log(`Player ${playerId} submitting word "${word}" in room ${roomId}`)

      try {
        // Call the async submitWord method
        const result = await room.submitWord(playerId, word, wordpiece)

        if (result.valid) {
          console.log(`Word "${word}" is valid, sending result to all clients`)

          // Send submission result to all clients with definition
          io.to(roomId).emit("game:submission_result", {
            playerId,
            word,
            scores: room.getScores(),
            definition: result.definition,
          })

          // Generate new wordpiece and update turn
          const newState = room.nextTurn()

          if (newState.gameOver) {
            // Game is over, send game over event
            io.to(roomId).emit("game:over", {
              finalScores: newState.finalScores,
              winner: newState.winner,
            })
            console.log(`Game over in room ${roomId}, winner: ${newState.winner || "none"}`)
          } else {
            // Send new wordpiece to all clients
            io.to(roomId).emit("game:new_wordpiece", {
              wordpiece: newState.wordpiece,
              timer: newState.timer,
              currentTurn: newState.currentTurn,
              lives: newState.lives,
              eliminatedPlayers: newState.eliminatedPlayers,
              usedWords: newState.usedWords, // Include used words in the update
            })
          }

          console.log(`Player ${playerId} submitted valid word "${word}" in room ${roomId}`)
        } else {
          console.log(`Word "${word}" is invalid: ${result.error}`)
          // Send error only to the submitting client
          socket.emit("error", result.error || "Invalid word")
        }
      } catch (error) {
        console.error("Error processing word submission:", error)
        socket.emit("error", "Server error processing your submission")
      }
    }
  })

  // Use power-up
  socket.on("game:use_power_up", ({ roomId, playerId, powerUpType, targetPlayerId }) => {
    const room = gameRooms.get(roomId)
    if (room) {
      const result = room.usePowerUp(playerId, powerUpType, targetPlayerId)

      if (result.success) {
        // Send power-up result to all clients
        io.to(roomId).emit("game:power_up_used", {
          powerUps: room.getPowerUps(),
          type: powerUpType,
          turnOrder: result.turnOrder,
          lives: room.getLives(),
          eliminatedPlayers: Array.from(room.eliminatedPlayers),
        })

        console.log(`Player ${playerId} used power-up ${powerUpType} in room ${roomId}`)
      } else {
        // Send error only to the using client
        socket.emit("error", result.error || "Failed to use power-up")
      }
    }
  })

  // Request word definition
  socket.on("game:request_definition", async ({ roomId, word }) => {
    const room = gameRooms.get(roomId)
    if (room) {
      // Use the same async definition fetching as in submitWord
      const definitions = await room.fetchDefinition(word)
      const definition = {
        word,
        definitions: definitions || [],
      }
      // Send definition to all clients in the room
      io.to(roomId).emit("game:definition", definition)
    } else {
      // Fallback to wordManager if no room
      const definition = wordManager.getDefinition(word)
      io.to(roomId).emit("game:definition", definition)
    }
  })

  // Optionally, add a handler for explicit timeout simulation (for debugging or client-side timeout triggers)
  socket.on("game:timeout", ({ roomId }) => {
    const room = gameRooms.get(roomId)
    if (room && room.gameInProgress) {
      const newState = room.handleTimeout()
      if (newState && newState.gameOver) {
        io.to(roomId).emit("game:over", {
          finalScores: newState.finalScores,
          winner: newState.winner,
        })
        console.log(`Game over in room ${roomId} (timeout), winner: ${newState.winner || "none"}`)
      } else if (newState) {
        io.to(roomId).emit("game:new_wordpiece", {
          wordpiece: newState.wordpiece,
          timer: newState.timer,
          currentTurn: newState.currentTurn,
          lives: newState.lives,
          eliminatedPlayers: newState.eliminatedPlayers,
          usedWords: newState.usedWords,
        })
      }
    }
  })

  // Request game state update (for clients that might have missed events)
  socket.on("game:request_state", ({ roomId }) => {
    const room = gameRooms.get(roomId)
    if (room && room.gameInProgress) {
      socket.emit("game:state_update", room.getGameState())
    }
  })

  // Handle disconnects
  socket.on("disconnect", (reason) => {
    console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`)

    // Find all rooms this socket is in
    for (const [roomId, room] of gameRooms.entries()) {
      const player = room.players.find((p) => p.socketId === socket.id)

      if (player) {
        // Handle player disconnect
        room.handlePlayerDisconnect(player.id)

        // If room is empty, delete it
        if (room.players.length === 0) {
          gameRooms.delete(roomId)
          console.log(`Room ${roomId} deleted (all players disconnected)`)
        } else {
          // Otherwise, send room update
          io.to(roomId).emit("room:update", room.getRoomState())

          // If game is in progress, handle turn changes if needed
          if (room.gameInProgress && room.currentTurn === player.id) {
            const newState = room.nextTurn()

            if (newState.gameOver) {
              // Game is over, send game over event with a slight delay to ensure clients receive it
              setTimeout(() => {
                io.to(roomId).emit("game:over", {
                  finalScores: newState.finalScores,
                  winner: newState.winner,
                })
              }, 500)
              console.log(`Game over in room ${roomId}, winner: ${newState.winner || "none"}`)
            } else {
              // Send new wordpiece to all clients
              io.to(roomId).emit("game:new_wordpiece", {
                wordpiece: newState.wordpiece,
                timer: newState.timer,
                currentTurn: newState.currentTurn,
                lives: newState.lives,
                eliminatedPlayers: newState.eliminatedPlayers,
                usedWords: newState.usedWords, // Include used words in the update
              })
            }
          }
        }

        console.log(`Player ${player.id} disconnected from room ${roomId}`)
      }
    }
  })
})

// Start server
const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`🚀 WordBomb server listening on port ${PORT}`))
