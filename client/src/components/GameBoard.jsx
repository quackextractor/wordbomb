"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
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
  const [wordDefinitions, setWordDefinitions] = useState([])
  const prevLivesRef = useRef({})
  const gameStateRef = useRef(null)
  const [usePowerUpHook, setUsePowerUpHook] = useState(null)

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
  } = useGameSocket(player, gameSettings, setWordDefinitions) // Pass setWordDefinitions

  const { localGameState, localPlayers, initializeLocalGame, handleLocalSubmitWord, handleLocalUsePowerUp } =
    useLocalGame(player, gameSettings)

  // Determine game mode
  const isLocalMode = gameSettings.mode === "single" || gameSettings.mode === "local"
  const isOnlineMode = gameSettings.mode === "online" || gameSettings.mode === "wordmaster"

  // Memoized active game state to prevent unnecessary re-renders
  const activeGameState = useMemo(() => {
    const state = isLocalMode
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
          maxTurnTimeForTurn: gameSettings.mode === "wordmaster" ? 30 : 15,
          usedWords: currentWordpiece ? room?.usedWords || [] : [],
        }

    // Store reference for comparison
    gameStateRef.current = state
    return state
  }, [
    isLocalMode,
    localGameState,
    currentWordpiece,
    timer,
    scores,
    lives,
    powerUps,
    turnOrder,
    currentTurn,
    gameStatus,
    eliminatedPlayers,
    gameSettings.mode,
    room?.usedWords,
  ])

  const activePlayers = useMemo(() => {
    return isLocalMode ? localPlayers : players
  }, [isLocalMode, localPlayers, players])

  console.log("GameBoard - Active game state:", activeGameState)
  console.log("GameBoard - Timer value:", activeGameState?.timer)

  const handleLeaveGame = useCallback(() => {
    setShowLeaveConfirm(true)
  }, [])

  const confirmLeaveGame = useCallback(() => {
    if (isOnlineMode) {
      leaveRoom()
    }

    if (gameSettings.mode === "local") {
      navigate("/local-setup", {
        state: {
          previousPlayers: gameSettings.localPlayers,
        },
      })
    } else {
      navigate("/")
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
          usePowerUpHook(type, otherPlayer.id)
        } else {
          usePowerUpHook(type)
        }
      }
    },
    [players, player.id, usePowerUpHook, isLocalMode, handleLocalUsePowerUp],
  )

  // Initialize usePowerUpHook
  const initializeUsePowerUpHook = useCallback(() => {
    setUsePowerUpHook(usePowerUp)
  }, [usePowerUp])

  useEffect(() => {
    initializeUsePowerUpHook()
  }, [initializeUsePowerUpHook])

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
          }
        } catch (err) {
          console.error("Error initializing online game:", err)
        }
      }

      initializeOnlineGame()
    }
  }, [isOnlineMode, connected, gameSettings.isHost, gameSettings.roomId, gameSettings.mode, createRoom])

  // Improved game over detection and navigation
  useEffect(() => {
    // Check for game over state from either local or online game
    const isGameOver = (isOnlineMode && gameStatus === "over") || (isLocalMode && localGameState?.status === "over")

    if (isGameOver && !showLeaveConfirm) {
      console.log("Game over detected, preparing to navigate to game over screen")

      // Short delay to ensure all state is updated
      const navigationTimeout = setTimeout(() => {
        const setupPlayers = gameSettings.localPlayers || []
        const enhancedScores = {}
        const gameScores = isLocalMode ? localGameState?.scores || {} : scores || {}

        // Prepare enhanced scores with player info
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

        console.log("Navigating to game over with scores:", enhancedScores)

        navigate("/game-over", {
          state: {
            scores: enhancedScores,
            roomId: gameSettings.roomId,
            mode: gameSettings.mode,
            localPlayers: activePlayers,
            setupPlayers: setupPlayers,
          },
        })
      }, 500) // Short delay to ensure all state updates are processed

      return () => clearTimeout(navigationTimeout)
    }
  }, [
    gameStatus,
    localGameState?.status,
    showLeaveConfirm,
    navigate,
    gameSettings,
    isLocalMode,
    isOnlineMode,
    scores,
    localGameState?.scores,
    player,
    activePlayers,
  ])

  // Enhanced damage effects with better state tracking
  useEffect(() => {
    if (!activeGameState?.lives || !player?.id) return

    const currentLives = activeGameState.lives
    const previousLives = prevLivesRef.current

    if (Object.keys(previousLives).length > 0) {
      Object.entries(currentLives).forEach(([playerId, currentLife]) => {
        const previousLife = previousLives[playerId]

        if (previousLife !== undefined && currentLife < previousLife && previousLife > 0) {
          console.log(`Player ${playerId} lost health: ${previousLife} -> ${currentLife}`)
          setShowDamageEffect(true)
          setTimeout(() => {
            setShowDamageEffect(false)
          }, 500)
        }
      })
    }

    prevLivesRef.current = { ...currentLives }
  }, [activeGameState?.lives, player?.id])

  // Update the useEffect hook that handles word definitions
  useEffect(() => {
    // Update wordDefinitions when a new definition is received
    if (localGameState?.definition) {
      setWordDefinitions((prev) => {
        const newDef = {
          word: localGameState.definition.word,
          definitions: localGameState.definition.definitions || [],
        }

        return [newDef, ...prev.filter((wd) => wd.word !== newDef.word)].slice(0, 4) // Keep only the 4 most recent definitions
      })
    }
  }, [localGameState?.definition])

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

  if (!activeGameState) {
    return <GameLoading message="Loading game state..." />
  }

  // Main game UI
  const currentPlayerId = activeGameState.currentTurn
  const currentPlayer = activePlayers.find((p) => p.id === currentPlayerId) || {
    id: "",
    nickname: "Unknown Player",
    avatar: null,
    color: "#4287f5",
  }

  const isLocalMultiplayer = gameSettings.mode === "local"
  const disableInput =
    (isOnlineMode && (gameStatus !== "playing" || currentPlayerId !== player.id)) ||
    (isLocalMultiplayer && localGameState?.status !== "playing")

  const playerPowerUps = activeGameState.powerUps?.[player.id] || {}

  const handleSubmitWord = (word) => {
    if (isLocalMode) {
      handleLocalSubmitWord(word)
      setLastSubmittedWord(word)
    } else {
      submitWord(word)
      setLastSubmittedWord(word)
    }
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

        <TimerBar maxTime={activeGameState.maxTurnTimeForTurn || 15} timeLeft={activeGameState.timer || 0} />

        <GameHeader
          gameSettings={gameSettings}
          isLocalMode={isLocalMode}
          activeGameState={activeGameState}
          player={player}
        />

        {isLocalMode && <CurrentPlayerIndicator currentPlayer={currentPlayer} players={activePlayers} />}

        {isOnlineMode && <OnlineGameStatus currentTurn={currentPlayerId} player={player} players={activePlayers} />}

        <div className="card p-6 mb-4">
          <WordpieceDisplay wordpiece={activeGameState.currentWordpiece} />
          <WordInput
            ref={wordInputRef}
            onSubmit={handleSubmitWord}
            disabled={disableInput}
            wordpiece={activeGameState.currentWordpiece}
            currentPlayerId={currentPlayerId}
            usedWords={activeGameState.usedWords} // Pass used words from game state
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
