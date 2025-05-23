"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"

const useGameSocket = (player, gameSettings, setWordDefinitions) => {
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
  const [countdown, setCountdown] = useState(null)
  const [eliminatedPlayers, setEliminatedPlayers] = useState([])
  const [wordDefinitionsList, setWordDefinitionsList] = useState([])

  // Timer management refs
  const timerIntervalRef = useRef(null)
  const timerStartTimeRef = useRef(null)
  const timerDurationRef = useRef(0)

  // Connection state refs
  const reconnectingRef = useRef(false)
  const stateUpdateIntervalRef = useRef(null)
  const lastStateUpdateRef = useRef(0)

  const isOnlineGameMode = gameSettings?.mode === "online" || gameSettings?.mode === "wordmaster"

  // Improved timer management with ref-based approach
  const startClientTimer = useCallback((initialTime) => {
    console.log(`Starting client timer with ${initialTime} seconds`)

    // Always stop any existing timer first
    stopClientTimer()

    // Validate the initial time
    const validInitialTime = Math.max(1, initialTime || 15)

    // Store timer metadata
    timerStartTimeRef.current = Date.now()
    timerDurationRef.current = validInitialTime

    // Set initial timer state
    setTimer(validInitialTime)

    // Use ref-based timer to avoid closure issues
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartTimeRef.current) / 1000)
      const remaining = Math.max(0, timerDurationRef.current - elapsed)

      // Update the timer state
      setTimer(remaining)

      // Log timer updates for debugging
      if (remaining % 5 === 0 || remaining <= 3) {
        console.log(`Timer update: ${remaining}s remaining`)
      }

      if (remaining <= 0) {
        console.log("Client timer expired")
        stopClientTimer()
      }
    }, 100) // Update more frequently for smoother countdown

    // Safety cleanup after expected duration + buffer
    setTimeout(
      () => {
        if (timerIntervalRef.current) {
          console.log("Safety cleanup of timer")
         // stopClientTimer()
        }
      },
      (validInitialTime + 2) * 1000,
    )
  }, [])

  const stopClientTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
      console.log("Client timer stopped")
    }
    timerStartTimeRef.current = null
    timerDurationRef.current = 0
  }, [])

  // Initialize socket connection once
  useEffect(() => {
    if (!socketRef.current && isOnlineGameMode) {
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

        // Check if we can reconnect to an ongoing game
        if (gameSettings.roomId && player.id && !reconnectingRef.current) {
          checkReconnection(gameSettings.roomId, player.id)
        }
      })

      socketRef.current.on("connect_error", (err) => {
        console.error("❌ Socket connect_error:", err.message)
        setConnecting(false)
        setError(`Failed to connect to game server: ${err.message}`)
      })

      socketRef.current.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason)
        setConnected(false)
        stopClientTimer()
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
      stopClientTimer()
      if (stateUpdateIntervalRef.current) {
        clearInterval(stateUpdateIntervalRef.current)
      }
    }
  }, [isOnlineGameMode, stopClientTimer])

  // Improved state update batching
  const updateGameState = useCallback(
    (updates) => {
      const timestamp = Date.now()
      lastStateUpdateRef.current = timestamp

      // Batch state updates to prevent race conditions
      if (updates.wordpiece !== undefined) setCurrentWordpiece(updates.wordpiece)
      if (updates.timer !== undefined) {
        setTimer(updates.timer)
        if (updates.startTimer) {
          startClientTimer(updates.timer)
        }
      }
      if (updates.scores !== undefined) setScores(updates.scores)
      if (updates.lives !== undefined) setLives(updates.lives)
      if (updates.powerUps !== undefined) setPowerUps(updates.powerUps)
      if (updates.turnOrder !== undefined) setTurnOrder(updates.turnOrder)
      if (updates.currentTurn !== undefined) setCurrentTurn(updates.currentTurn)
      if (updates.eliminatedPlayers !== undefined) setEliminatedPlayers(updates.eliminatedPlayers)
      if (updates.gameStatus !== undefined) setGameStatus(updates.gameStatus)

      console.log("Game state updated:", updates)
    },
    [startClientTimer],
  )

  // Check if player can reconnect to an ongoing game
  const checkReconnection = useCallback(
    (roomId, playerId) => {
      if (!socketRef.current || !connected || reconnectingRef.current) return

      console.log(`Checking if player ${playerId} can reconnect to room ${roomId}`)
      reconnectingRef.current = true

      socketRef.current.emit("room:check_reconnect", { roomId, playerId }, (response) => {
        if (response.canReconnect) {
          console.log("Player can reconnect to ongoing game:", response)
          joinRoom(roomId, true)
            .then(() => {
              console.log("Reconnection successful")
            })
            .catch((err) => {
              console.error("Reconnection failed:", err)
              reconnectingRef.current = false
            })
        } else {
          console.log("Player cannot reconnect:", response.error || "No ongoing game")
          reconnectingRef.current = false
        }
      })
    },
    [connected],
  )

  // Join room when ready
  useEffect(() => {
    if (
      connected &&
      gameSettings.roomId &&
      player.nickname &&
      !isJoining &&
      !reconnectingRef.current &&
      isOnlineGameMode
    ) {
      console.log("Attempting to join room:", gameSettings.roomId)
      setIsJoining(true)
      joinRoom(gameSettings.roomId)
        .then(() => {
          console.log("Successfully joined room")

          // Set up periodic state update requests
          if (stateUpdateIntervalRef.current) {
            clearInterval(stateUpdateIntervalRef.current)
          }

          stateUpdateIntervalRef.current = setInterval(() => {
            if (socketRef.current && gameSettings.roomId && gameStatus === "playing") {
              socketRef.current.emit("game:request_state", { roomId: gameSettings.roomId })
            }
          }, 3000) // Request state update every 3 seconds
        })
        .catch((err) => {
          console.error("Failed to join room:", err)
          setError(err.message)
        })
        .finally(() => setIsJoining(false))
    }
  }, [connected, gameSettings.roomId, player.nickname, isOnlineGameMode, gameStatus])

  // Setup game event listeners with improved error handling
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const handlers = {
      "room:update": (data) => {
        console.log("Room update received:", data)
        setRoom(data)
        setPlayers(data.players || [])
        setTurnOrder(data.turnOrder || [])
        if (data.eliminatedPlayers) {
          setEliminatedPlayers(data.eliminatedPlayers)
        }
      },

      "game:countdown": (data) => {
        console.log("Game countdown received:", data)
        setCountdown(data.countdown)
      },

      "game:start": (data) => {
        console.log("Game start received:", data)
        updateGameState({
          gameStatus: "playing",
          wordpiece: data.wordpiece,
          timer: data.timer,
          scores: data.scores || {},
          lives: data.lives || {},
          powerUps: data.powerUps || {},
          turnOrder: data.turnOrder || [],
          currentTurn: data.currentTurn,
          eliminatedPlayers: data.eliminatedPlayers || [],
          startTimer: true,
        })
        setCountdown(null)
      },

      "game:reconnect": (data) => {
        console.log("Game reconnect state received:", data)
        updateGameState({
          gameStatus: "playing",
          wordpiece: data.wordpiece,
          timer: data.timer,
          scores: data.scores || {},
          lives: data.lives || {},
          powerUps: data.powerUps || {},
          turnOrder: data.turnOrder || [],
          currentTurn: data.currentTurn,
          eliminatedPlayers: data.eliminatedPlayers || [],
          startTimer: true,
        })

        // Mark reconnection as complete
        setTimeout(() => {
          reconnectingRef.current = false
        }, 1000)
      },

      "game:state_update": (data) => {
        console.log("Game state update received:", data)
        if (gameStatus === "playing") {
          updateGameState({
            wordpiece: data.wordpiece,
            scores: data.scores || {},
            lives: data.lives || {},
            powerUps: data.powerUps || {},
            turnOrder: data.turnOrder || [],
            currentTurn: data.currentTurn,
            eliminatedPlayers: data.eliminatedPlayers || [],
          })
        }
      },

      "game:new_wordpiece": (data) => {
        console.log("New wordpiece received:", data)

        // Stop any existing timer first
        stopClientTimer()

        // Update state with new data
        updateGameState({
          wordpiece: data.wordpiece,
          timer: data.timer,
          currentTurn: data.currentTurn,
          lives: data.lives,
          eliminatedPlayers: data.eliminatedPlayers,
          usedWords: data.usedWords || new Set(), // Update used words from server
        })

        // Start a fresh timer with the full time
        startClientTimer(data.timer)
      },

      "game:submission_result": (res) => {
        console.log("Submission result received:", res)
        updateGameState({
          scores: res.scores,
        })

        // Add the word and definition to the definitions list
        if (res.definition && setWordDefinitions) {
          setDefinition(res.definition)

          // Update word definitions list with the server-provided definition
          setWordDefinitionsList((prev) => {
            const newDefs = [
              {
                word: res.word,
                definitions: res.definition.definitions || [],
              },
              ...prev.filter((wd) => wd.word !== res.word),
            ].slice(0, 4)

            return newDefs
          })
        }
      },

      "game:turn_update": ({ currentTurn, turnOrder, lives, eliminatedPlayers }) => {
        console.log("Turn update received:", currentTurn, turnOrder)
        updateGameState({
          currentTurn,
          turnOrder,
          lives,
          eliminatedPlayers,
        })
      },

      "game:power_up_used": (data) => {
        console.log("Power-up used:", data)
        updateGameState({
          powerUps: data.powerUps,
          turnOrder: data.type === "reverse_turn" ? data.turnOrder : undefined,
          lives: data.lives,
          eliminatedPlayers: data.eliminatedPlayers,
        })
      },

      "game:player_update": ({ scores, lives, eliminatedPlayers }) => {
        console.log("Player update received:", scores, lives)
        updateGameState({
          scores,
          lives,
          eliminatedPlayers,
        })
      },

      "game:over": (res) => {
        console.log("Game over received:", res)

        // Stop timer immediately
        stopClientTimer()

        // Force game status to "over" immediately
        setGameStatus("over")

        // Update all relevant state
        updateGameState({
          gameStatus: "over",
          scores: res.finalScores || res.scores || scores,
          timer: 0,
        })

        // Clear all intervals
        if (stateUpdateIntervalRef.current) {
          clearInterval(stateUpdateIntervalRef.current)
          stateUpdateIntervalRef.current = null
        }

        // Log for debugging
        console.log("Game over state set, scores:", res.finalScores || res.scores || scores)

        // Force a small delay before navigation to ensure state is updated
        setTimeout(() => {
          if (gameStatus !== "over") {
            console.log("Forcing game status to 'over'")
            setGameStatus("over")
          }
        }, 200)
      },

      "game:definition": (data) => {
        console.log("Definition received:", data)
        setDefinition(data)
      },
    }

    Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn))

    return () => {
      Object.entries(handlers).forEach(([event, fn]) => socket.off(event, fn))
      socket.off("error")
    }
  }, [updateGameState, stopClientTimer, gameStatus])

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
    (roomId, isReconnecting = false) => {
      return new Promise((resolve, reject) => {
        const socket = socketRef.current

        if (!socket || !connected) {
          reject(new Error("Not connected to server"))
          return
        }

        const cleanup = () => {
          clearTimeout(timeoutId)
          socket.off("room:update", onRoomUpdate)
          socket.off("game:reconnect", onGameReconnect)
          socket.off("error", onError)
        }

        const onRoomUpdate = (data) => {
          cleanup()
          if (!isReconnecting) {
            reconnectingRef.current = false
          }
          resolve(data)
        }

        const onGameReconnect = (data) => {
          cleanup()
          resolve(data)
        }

        const onError = (errMsg) => {
          cleanup()
          reconnectingRef.current = false
          reject(new Error(errMsg))
        }

        socket.once("room:update", onRoomUpdate)
        socket.once("game:reconnect", onGameReconnect)
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
          reconnectingRef.current = false
          reject(new Error("Timeout joining room"))
        }, 10000)
      })
    },
    [player, gameSettings.isHost, connected],
  )

  const startGameWithCountdown = useCallback(
    (countdownSeconds = 3) => {
      if (gameSettings.roomId && socketRef.current) {
        console.log(`Starting game countdown in room ${gameSettings.roomId}: ${countdownSeconds} seconds`)
        socketRef.current.emit("game:start_countdown", {
          roomId: gameSettings.roomId,
          countdown: countdownSeconds,
        })

        setCountdown(countdownSeconds)

        setTimeout(() => {
          startGame()
        }, countdownSeconds * 1000)
      }
    },
    [gameSettings.roomId],
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

    stopClientTimer()

    if (stateUpdateIntervalRef.current) {
      clearInterval(stateUpdateIntervalRef.current)
      stateUpdateIntervalRef.current = null
    }
  }, [gameSettings.roomId, player.id, stopClientTimer])

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
    countdown,
    eliminatedPlayers,
    wordDefinitionsList,
    createRoom,
    joinRoom,
    startGame,
    startGameWithCountdown,
    submitWord,
    usePowerUp,
    requestDefinition,
    leaveRoom,
    socket: socketRef.current,
    setWordDefinitions: setWordDefinitionsList, // Add this to the return object
  }
}

export default useGameSocket
