"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"

/**
 * Custom hook for managing Socket.IO connection and game events
 * @param {Object} player - Player information (id, nickname, avatar)
 * @param {Object} gameSettings - Game settings (roomId, mode, isHost)
 * @returns {Object} Socket connection and game state management functions
 */
const useGameSocket = (player, gameSettings) => {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [currentWordpiece, setCurrentWordpiece] = useState("")
  const [timer, setTimer] = useState(0)
  const [scores, setScores] = useState({})
  const [lives, setLives] = useState({})
  const [powerUps, setPowerUps] = useState({})
  const [turnOrder, setTurnOrder] = useState([])
  const [currentTurn, setCurrentTurn] = useState("")
  const [gameStatus, setGameStatus] = useState("waiting")
  const [definition, setDefinition] = useState(null)
  const [error, setError] = useState(null)
  const [isJoining, setIsJoining] = useState(false)
  const timerIntervalRef = useRef(null)

  // Initialize socket connection once
  useEffect(() => {
    if (!socketRef.current && (gameSettings.mode === "online" || gameSettings.mode === "wordmaster")) {
      console.log("Initializing socket connection...")
      setConnecting(true)

      const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000"
      console.log("Connecting to socket URL:", socketUrl)

      socketRef.current = io(socketUrl, {
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      })

      socketRef.current.on("connect", () => {
        console.log("✅ Connected with socket id:", socketRef.current.id)
        setConnected(true)
        setConnecting(false)
        setError(null)
      })

      socketRef.current.on("connect_error", (err) => {
        console.error("❌ Socket connect_error:", err.message)
        setConnecting(false)
        setError(`Failed to connect to game server: ${err.message}`)
      })

      socketRef.current.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason)
        setConnected(false)
        if (reason === "io server disconnect") {
          socketRef.current.connect()
        }
      })

      socketRef.current.on("error", (msg) => {
        console.error("Socket error:", msg)
        setError(msg)
      })
    }

    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection")
        socketRef.current.disconnect()
        socketRef.current = null
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [gameSettings.mode])

  // Join room when ready
  useEffect(() => {
    if (connected && gameSettings.roomId && player.nickname && !isJoining) {
      console.log("Attempting to join room:", gameSettings.roomId)
      setIsJoining(true)
      joinRoom(gameSettings.roomId)
        .then(() => {
          console.log("Successfully joined room")
        })
        .catch((err) => {
          console.error("Failed to join room:", err)
          setError(err.message)
        })
        .finally(() => setIsJoining(false))
    }
  }, [connected, gameSettings.roomId, player.nickname])

  // Setup game event listeners
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const handlers = {
      "room:update": (data) => {
        console.log("Room update received:", data)
        setRoom(data)
        setPlayers(data.players || [])
        setTurnOrder(data.turnOrder || [])
      },
      "game:start": (data) => {
        console.log("Game start received:", data)
        setGameStatus("playing")
        setCurrentWordpiece(data.wordpiece)
        setTimer(data.timer)
        setScores(data.scores || {})
        setLives(data.lives || {})
        setPowerUps(data.powerUps || {})
        setTurnOrder(data.turnOrder || [])
        setCurrentTurn(data.currentTurn)

        // Start client-side timer
        startClientTimer(data.timer)
      },
      "game:new_wordpiece": ({ wordpiece, timer, currentTurn }) => {
        console.log("New wordpiece received:", wordpiece, "Timer:", timer, "Current turn:", currentTurn)
        setCurrentWordpiece(wordpiece)
        setTimer(timer)
        setCurrentTurn(currentTurn)

        // Reset and start client-side timer
        startClientTimer(timer)
      },
      "game:timer": (newTimer) => {
        setTimer(newTimer)
      },
      "game:submission_result": (res) => {
        console.log("Submission result received:", res)
        setScores(res.scores)
        res.definition && setDefinition(res.definition)
      },
      "game:turn_update": ({ currentTurn, turnOrder }) => {
        console.log("Turn update received:", currentTurn, turnOrder)
        setCurrentTurn(currentTurn)
        setTurnOrder(turnOrder)
      },
      "game:power_up_used": (data) => {
        console.log("Power-up used:", data)
        setPowerUps(data.powerUps)
        if (data.type === "reverse_turn") setTurnOrder(data.turnOrder)
      },
      "game:player_update": ({ scores, lives }) => {
        console.log("Player update received:", scores, lives)
        setScores(scores)
        setLives(lives)
      },
      "game:over": (res) => {
        console.log("Game over received:", res)
        setGameStatus("over")
        setScores(res.finalScores)

        // Clear timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
      },
      "game:definition": (def) => {
        console.log("Definition received:", def)
        setDefinition(def)
      },
    }

    Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn))

    return () => {
      Object.entries(handlers).forEach(([event, fn]) => socket.off(event, fn))
      socket.off("error")

      // Clear timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [])

  // Function to start client-side timer
  const startClientTimer = useCallback((initialTime) => {
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }

    // Set initial time
    setTimer(initialTime)

    // Start countdown
    let timeLeft = initialTime
    timerIntervalRef.current = setInterval(() => {
      timeLeft--
      setTimer(timeLeft)

      if (timeLeft <= 0) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }, 1000)
  }, [])

  const createRoom = useCallback(
    async (mode) => {
      if (!socketRef.current || !connected) {
        throw new Error("Not connected to server")
      }

      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
      console.log("Creating room:", roomId)

      socketRef.current.emit("room:join", {
        roomId,
        playerId: player.id,
        playerName: player.nickname,
        playerAvatar: player.avatar,
        playerColor: player.color,
        isHost: true,
      })
      return roomId
    },
    [player, connected],
  )

  const joinRoom = useCallback(
    (roomId) => {
      return new Promise((resolve, reject) => {
        const socket = socketRef.current

        if (!socket || !connected) {
          reject(new Error("Not connected to server"))
          return
        }

        const cleanup = () => {
          clearTimeout(timeoutId)
          socket.off("room:update", onRoomUpdate)
          socket.off("error", onError)
        }

        const onRoomUpdate = (data) => {
          cleanup()
          resolve(data)
        }

        const onError = (errMsg) => {
          cleanup()
          reject(new Error(errMsg))
        }

        socket.once("room:update", onRoomUpdate)
        socket.once("error", onError)

        socket.emit("room:join", {
          roomId,
          playerId: player.id,
          playerName: player.nickname,
          playerAvatar: player.avatar,
          playerColor: player.color,
          isHost: gameSettings.isHost,
        })

        const timeoutId = setTimeout(() => {
          cleanup()
          reject(new Error("Timeout joining room"))
        }, 10000)
      })
    },
    [player, gameSettings.isHost, connected],
  )

  const startGame = useCallback(() => {
    if (gameSettings.roomId && socketRef.current) {
      console.log("Starting game in room:", gameSettings.roomId, "Mode:", gameSettings.mode)
      socketRef.current.emit("game:start", { roomId: gameSettings.roomId, mode: gameSettings.mode })
    }
  }, [gameSettings])

  const submitWord = useCallback(
    (word) => {
      if (socketRef.current) {
        console.log("Submitting word:", word, "Room:", gameSettings.roomId, "Player:", player.id)
        socketRef.current.emit("game:submit", {
          roomId: gameSettings.roomId,
          playerId: player.id,
          word,
          wordpiece: currentWordpiece,
        })
      }
    },
    [gameSettings.roomId, player.id, currentWordpiece],
  )

  const usePowerUp = useCallback(
    (type, targetId) => {
      if (socketRef.current) {
        console.log("Using power-up:", type, "Target:", targetId)
        socketRef.current.emit("game:use_power_up", {
          roomId: gameSettings.roomId,
          playerId: player.id,
          powerUpType: type,
          targetPlayerId: targetId,
        })
      }
    },
    [gameSettings.roomId, player.id],
  )

  const requestDefinition = useCallback(
    (word) => {
      if (socketRef.current) {
        console.log("Requesting definition for:", word)
        socketRef.current.emit("game:request_definition", { roomId: gameSettings.roomId, word })
      }
    },
    [gameSettings.roomId],
  )

  const leaveRoom = useCallback(() => {
    if (gameSettings.roomId && socketRef.current) {
      console.log("Leaving room:", gameSettings.roomId)
      socketRef.current.emit("room:leave", { roomId: gameSettings.roomId, playerId: player.id })
    }

    // Clear timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }, [gameSettings.roomId, player.id])

  return {
    connected,
    connecting,
    room,
    players,
    currentWordpiece,
    timer,
    scores,
    lives,
    powerUps,
    turnOrder,
    currentTurn,
    gameStatus,
    definition,
    error,
    createRoom,
    joinRoom,
    startGame,
    submitWord,
    usePowerUp,
    requestDefinition,
    leaveRoom,
    socket: socketRef.current,
  }
}

export default useGameSocket
