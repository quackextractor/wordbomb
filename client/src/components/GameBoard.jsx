"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import WordInput from "./WordInput"
import useGameSocket from "../hooks/useGameSocket"
import GameHeader from "./GameHeader"
import WordpieceDisplay from "./WordpieceDisplay"
import PlayersList from "./PlayersList"
import PowerUpsPanel from "./PowerUpsPanel"
import GameLoading from "./GameLoading"
import useLocalGame from "../hooks/useLocalGame"
import WordDefinitionsPanel from "./WordDefinitionsPanel"
import TimerBar from "./TimerBar"
import DamageOverlay from "./DamageOverlay"
import CurrentPlayerIndicator from "./CurrentPlayerIndicator"
import OnlineWaitingRoom from "./OnlineWaitingRoom"
import OnlineGameStatus from "./OnlineGameStatus"

function GameBoard({ player, gameSettings: initialGameSettings }) {
  const navigate = useNavigate()
  const location = useLocation()
  const wordInputRef = useRef(null)
  const [showDamageEffect, setShowDamageEffect] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [gameSettings, setGameSettings] = useState(() => {
    const locationState = location.state || {}
    return {
      ...initialGameSettings,
      ...locationState,
    }
  })
  const [lastSubmittedWord, setLastSubmittedWord] = useState("")
  const [wordDefinitions, setWordDefinitions] = useState([]) // [{word, definitions: []}]
  const prevLivesRef = useRef({})
  const [usePowerUpHook, setUsePowerUpHook] = useState(null)
  const [countdownState, setCountdownState] = useState(null)

  const {
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
    error,
    eliminatedPlayers,
    createRoom,
    joinRoom,
    startGame,
    submitWord,
    usePowerUp,
    leaveRoom,
    startGameWithCountdown,
    countdown,
  } = useGameSocket(player, gameSettings)

  const { localGameState, localPlayers, initializeLocalGame, handleLocalSubmitWord, handleLocalUsePowerUp } =
      useLocalGame(player, gameSettings)

  // Determine game mode
  const isLocalMode = gameSettings.mode === "single" || gameSettings.mode === "local"
  const isOnlineMode = gameSettings.mode === "online" || gameSettings.mode === "wordmaster"

  console.log("GameBoard - Game mode:", gameSettings.mode, "isLocalMode:", isLocalMode, "isOnlineMode:", isOnlineMode)

  // Determine active game state and players
  const activeGameState = isLocalMode
      ? localGameState
      : {
        currentWordpiece,
        timer,
        scores,
        lives,
        powerUps,
        turnOrder,
        currentTurn,
        status: gameStatus,
        eliminatedPlayers,
      }

  const activePlayers = isLocalMode ? localPlayers : players

  console.log("GameBoard - Active game state:", activeGameState)
  console.log("GameBoard - Active players:", activePlayers)

  const handleLeaveGame = useCallback(() => {
    setShowLeaveConfirm(true)
  }, [])

  const confirmLeaveGame = useCallback(() => {
    if (isOnlineMode) {
      leaveRoom()
    }

    // Navigate to local setup with previous players in local mode
    if (gameSettings.mode === "local") {
      navigate("/local-setup", {
        state: {
          previousPlayers: gameSettings.localPlayers,
        },
      })
    } else {
      navigate("/") // Default navigation for other modes
    }
    setShowLeaveConfirm(false)
  }, [isOnlineMode, leaveRoom, navigate, gameSettings.mode, gameSettings.localPlayers])

  const cancelLeaveGame = useCallback(() => {
    setShowLeaveConfirm(false)
  }, [])

  const handleUsePowerUp = useCallback(
      (type, targetId) => {
        if (isLocalMode) {
          handleLocalUsePowerUp(type, targetId)
        } else {
          const otherPlayer = players.find((p) => p.id !== player.id)
          if (otherPlayer) {
            usePowerUp(type, otherPlayer.id)
          } else {
            usePowerUp(type)
          }
        }
      },
      [players, player.id, usePowerUp, isLocalMode, handleLocalUsePowerUp],
  )

  // Initialize local game
  useEffect(() => {
    if (isLocalMode && !localGameState) {
      console.log("Initializing local game...")
      initializeLocalGame()
    }
  }, [isLocalMode, localGameState, initializeLocalGame])

  // Initialize online game
  useEffect(() => {
    if (isOnlineMode && connected) {
      const initializeOnlineGame = async () => {
        try {
          if (gameSettings.isHost && !gameSettings.roomId) {
            console.log("Creating new room as host...")
            const roomId = await createRoom(gameSettings.mode)
            setGameSettings((prev) => ({ ...prev, roomId }))
          } else if (gameSettings.roomId) {
            console.log("Joining existing room:", gameSettings.roomId)
            // joinRoom is handled in the useGameSocket hook
          }
        } catch (err) {
          console.error("Error initializing online game:", err)
        }
      }

      initializeOnlineGame()
    }
  }, [isOnlineMode, connected, gameSettings.isHost, gameSettings.roomId, gameSettings.mode, createRoom])

  // Handle game over navigation
  useEffect(() => {
    const isGameOver = gameStatus === "over" || (localGameState && localGameState.status === "over")

    if (isGameOver && !showLeaveConfirm) {
      const setupPlayers = gameSettings.localPlayers || []
      const enhancedScores = {}
      const gameScores = isLocalMode ? localGameState?.scores || {} : scores || {}

      Object.keys(gameScores).forEach((playerId) => {
        let playerInfo = activePlayers.find((p) => p.id === playerId)

        if (!playerInfo && setupPlayers.length > 0) {
          playerInfo = setupPlayers.find((p) => p.id === playerId)
        }

        if (!playerInfo) {
          playerInfo = {
            id: playerId,
            nickname: playerId === player.id ? player.nickname : `Player ${playerId.slice(-1)}`,
            avatar: null,
            color: "#4287f5",
          }
        }

        enhancedScores[playerId] = {
          score: gameScores[playerId] || 0,
          nickname: playerInfo.nickname || playerInfo.name || `Player ${playerId}`,
          avatar: playerInfo.avatar,
          color: playerInfo.color,
        }
      })

      navigate("/game-over", {
        state: {
          scores: enhancedScores,
          roomId: gameSettings.roomId,
          mode: gameSettings.mode,
          localPlayers: activePlayers,
          setupPlayers: setupPlayers,
        },
      })
    }
  }, [
    gameStatus,
    localGameState?.status,
    showLeaveConfirm,
    navigate,
    gameSettings.roomId,
    gameSettings.mode,
    gameSettings.localPlayers,
    isLocalMode,
    scores,
    localGameState?.scores,
    player.id,
    player.nickname,
    activePlayers,
  ])

  // Handle damage effects
  useEffect(() => {
    if (!activeGameState?.lives || !player?.id) return

    if (Object.keys(prevLivesRef.current).length > 0) {
      Object.entries(activeGameState.lives).forEach(([playerId, currentLives]) => {
        const previousLives = prevLivesRef.current[playerId] || currentLives

        if (currentLives < previousLives && previousLives !== 0) {
          setShowDamageEffect(true)
          const timer = setTimeout(() => {
            setShowDamageEffect(false)
          }, 500)
          return () => clearTimeout(timer)
        }
      })
    }

    prevLivesRef.current = { ...activeGameState.lives }
  }, [activeGameState?.lives])

  // Show loading states
  if (isOnlineMode && connecting) {
    return <GameLoading message="Connecting to game server..." error={error} />
  }

  if (isOnlineMode && !connected && error) {
    return <GameLoading message="Failed to connect to server" error={error} />
  }

  if (isOnlineMode && connected && gameStatus === "waiting") {
    return (
        <OnlineWaitingRoom
            room={room}
            players={players}
            gameSettings={gameSettings}
            startGame={startGame}
            startGameWithCountdown={startGameWithCountdown}
            leaveRoom={leaveRoom}
            countdown={countdown}
        />
    )
  }

  if (isLocalMode && !localGameState) {
    return <GameLoading message="Initializing game..." />
  }

  // Main game UI
  const currentPlayerId = activeGameState?.currentTurn
  const currentPlayer = activePlayers.find((p) => p.id === currentPlayerId) || {
    id: "",
    nickname: "Unknown Player",
    avatar: null,
    color: "#4287f5",
  }

  const isLocalMultiplayer = gameSettings.mode === "local"
  const disableInput =
      (!isLocalMultiplayer && currentPlayerId !== player.id) || (isOnlineMode && currentPlayerId !== player.id)

  const playerPowerUps = activeGameState?.powerUps[player.id] || {}

  async function fetchDefinitions(word) {
    try {
      const response = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`)
      const data = await response.json()
      if (data && data[0] && Array.isArray(data[0].defs) && data[0].defs.length > 0) {
        return data[0].defs.slice(0, 3).map((def) => def.replace(/^\w+\t/, ""))
      }
    } catch (e) {
      // ignore
    }
    return []
  }

  const handleSubmitWord = (word) => {
    if (isLocalMode) {
      handleLocalSubmitWord(word)
    } else {
      submitWord(word)
    }
    setLastSubmittedWord(word)
    fetchDefinitions(word).then((defs) => {
      setWordDefinitions((prev) => {
        const newDefs = [{ word, definitions: defs.length ? defs : [] }, ...prev.filter((wd) => wd.word !== word)]
        return newDefs.slice(0, 4)
      })
    })
  }

  return (
      <div className="game-container py-4 relative">
        <DamageOverlay isActive={showDamageEffect} />

        {showLeaveConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-indigo-950 border border-white/20 rounded-lg p-6 max-w-md w-full shadow-2xl animate-bounce-in">
                <h3 className="text-xl font-bold mb-4">Leave Game?</h3>
                <p className="text-white/70 mb-6">Are you sure you want to leave the game? Your progress will be lost.</p>
                <div className="flex gap-3">
                  <button
                      onClick={confirmLeaveGame}
                      className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
                  >
                    Leave Game
                  </button>
                  <button
                      onClick={cancelLeaveGame}
                      className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
                  >
                    Continue Playing
                  </button>
                </div>
              </div>
            </div>
        )}

        <div className="max-w-5xl mx-auto">
          <div className="flex justify-end mb-4">
            <button
                onClick={handleLeaveGame}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
              >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Leave Game
            </button>
          </div>

          <TimerBar
              maxTime={activeGameState?.maxTurnTimeForTurn || (gameSettings.mode === "wordmaster" ? 30 : 15)}
              timeLeft={Math.max(0, activeGameState?.timer || 0)}
          />

          <GameHeader
              gameSettings={gameSettings}
              isLocalMode={isLocalMode}
              activeGameState={activeGameState}
              player={player}
          />

          {isLocalMode && <CurrentPlayerIndicator currentPlayer={currentPlayer} players={activePlayers} />}

          {isOnlineMode && <OnlineGameStatus currentTurn={currentPlayerId} player={player} players={activePlayers} />}

          <div className="card p-6 mb-4">
            <WordpieceDisplay wordpiece={activeGameState?.currentWordpiece} />
            <WordInput
                ref={wordInputRef}
                onSubmit={handleSubmitWord}
                disabled={disableInput}
                wordpiece={activeGameState?.currentWordpiece}
                currentPlayerId={currentPlayerId}
            />
          </div>

          <WordDefinitionsPanel wordDefinitions={wordDefinitions} />
          <PlayersList activePlayers={activePlayers} activeGameState={activeGameState} />

          {Object.keys(playerPowerUps).length > 0 && (
              <PowerUpsPanel
                  playerPowerUps={playerPowerUps}
                  handleUsePowerUp={handleUsePowerUp}
                  isPlayerTurn={currentPlayerId === player.id}
              />
          )}
        </div>
      </div>
  )
}

export default GameBoard
