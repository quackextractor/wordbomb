"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import WordInput from "./WordInput"
import useGameSocket from "../hooks/useGameSocket"
import GameHeader from "./GameHeader"
import WordpieceDisplay from "./WordpieceDisplay"
import PlayersList from "./PlayersList"
import PowerUpsPanel from "./PowerUpsPanel"
import GameWaiting from "./GameWaiting"
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
  const { localGameState, localPlayers, initializeLocalGame, handleLocalSubmitWord, handleLocalUsePowerUp } =
    useLocalGame(player, gameSettings)
  const {
    connected,
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
    createRoom,
    joinRoom,
    startGame,
    submitWord,
    usePowerUp,
    leaveRoom,
  } = useGameSocket(player, gameSettings)

  const isLocalMode = gameSettings.mode === "single" || gameSettings.mode === "local"
  const isOnlineMode = gameSettings.mode === "online" || gameSettings.mode === "wordmaster"

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
      }

  const activePlayers = isLocalMode ? localPlayers : players

  // Debug log to check player data - only log once when players change
  useEffect(() => {
    if (activePlayers && activePlayers.length > 0) {
      console.log("Active players in GameBoard:", activePlayers)
    }
  }, [activePlayers]) // Only depend on the length to avoid excessive re-renders

  const handleLeaveGame = useCallback(() => {
    setShowLeaveConfirm(true)
  }, [])

  const confirmLeaveGame = useCallback(() => {
    if (!isLocalMode) {
      leaveRoom()
    }

    // Navigate to local setup with previous players in local mode
    if (gameSettings.mode === "local") {
      navigate("/local-setup", {
        state: {
          previousPlayers: gameSettings.localPlayers, // Use initial setup players
        },
      })
    } else {
      navigate("/") // Default navigation for other modes
    }
    setShowLeaveConfirm(false)
  }, [isLocalMode, leaveRoom, navigate, gameSettings.mode, gameSettings.localPlayers])

  // Add this new function to handle canceling the leave game dialog
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

  useEffect(() => {
    if (gameSettings.mode === "single" || gameSettings.mode === "local") {
      // Only initialize if not already initialized
      if (!localGameState) {
        initializeLocalGame()
      }
    }
  }, [gameSettings.mode, initializeLocalGame, localGameState])

  useEffect(() => {
    if (isOnlineMode) {
      const initializeGame = async () => {
        try {
          if (gameSettings.isHost && !gameSettings.roomId) {
            const roomId = await createRoom(gameSettings.mode)
            setGameSettings((prev) => ({ ...prev, roomId }))
          } else if (gameSettings.roomId) {
            joinRoom(gameSettings.roomId)
          }
        } catch (err) {
          console.error("Error initializing game:", err)
        }
      }

      if (connected) {
        initializeGame()
      }
    }

    return () => {
      if (isOnlineMode) {
        leaveRoom()
      }
    }
  }, [
    connected,
    gameSettings.isHost,
    gameSettings.roomId,
    gameSettings.mode,
    createRoom,
    joinRoom,
    leaveRoom,
    isOnlineMode,
  ])

  useEffect(() => {
    // Only proceed if we have a game over state
    const isGameOver = gameStatus === "over" || (localGameState && localGameState.status === "over")

    if (isGameOver && !showLeaveConfirm) {
      // Add check to prevent navigation during leave confirmation
      // Get the complete player data from the setup
      const setupPlayers = gameSettings.localPlayers || []

      // Create enhanced scores object with player information for the GameOver screen
      const enhancedScores = {}
      const gameScores = isLocalMode ? localGameState?.scores || {} : scores || {}

      // For each player ID in the scores...
      Object.keys(gameScores).forEach((playerId) => {
        // First try to find the player in activePlayers (which has the most up-to-date data)
        let playerInfo = activePlayers.find((p) => p.id === playerId)

        // If not found, try to find in the setup players
        if (!playerInfo && setupPlayers.length > 0) {
          playerInfo = setupPlayers.find((p) => p.id === playerId)
        }

        // If still not found, create a minimal player object
        if (!playerInfo) {
          playerInfo = {
            id: playerId,
            nickname: playerId === player.id ? player.nickname : `Player ${playerId.slice(-1)}`,
            avatar: null,
            color: "#4287f5",
          }
        }

        // Add the player data to the enhanced scores
        enhancedScores[playerId] = {
          score: gameScores[playerId] || 0,
          nickname: playerInfo.nickname || playerInfo.name || `Player ${playerId}`,
          avatar: playerInfo.avatar,
          color: playerInfo.color,
        }
      })

      console.log("Enhanced scores being passed to GameOver:", enhancedScores)

      navigate("/game-over", {
        state: {
          scores: enhancedScores,
          roomId: gameSettings.roomId,
          mode: gameSettings.mode,
          localPlayers: activePlayers, // Pass the complete player list
          setupPlayers: setupPlayers, // Also pass the original setup players
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

  useEffect(() => {
    if (!activeGameState?.lives || !player?.id) return

    // Only check for damage if we have previous lives data
    if (Object.keys(prevLivesRef.current).length > 0) {
      // For all players, check if they lost a life
      Object.entries(activeGameState.lives).forEach(([playerId, currentLives]) => {
        const previousLives = prevLivesRef.current[playerId] || currentLives

        // Only show damage effect if lives decreased from the previous state
        // AND this isn't just the initial state being set
        if (currentLives < previousLives && previousLives !== 0) {
          console.log(`Player ${playerId} lost a life! Current: ${currentLives}, Previous: ${previousLives}`)
          setShowDamageEffect(true)

          const timer = setTimeout(() => {
            setShowDamageEffect(false)
          }, 500)

          return () => clearTimeout(timer)
        }
      })
    }

    // Update the previous lives reference
    prevLivesRef.current = { ...activeGameState.lives }
  }, [activeGameState?.lives])

  useEffect(() => {
    if (activeGameState?.lives && Object.keys(activeGameState.lives).length > 0) {
      if (Object.keys(prevLivesRef.current).length === 0) {
        prevLivesRef.current = { ...activeGameState.lives }
      }
    }
  }, [activeGameState?.lives])

  if (!connected && isOnlineMode) {
    return <GameLoading message="Connecting to game server..." error={error} />
  }

  // Show online waiting room for online modes
  if (isOnlineMode && gameStatus === "waiting") {
    return (
      <OnlineWaitingRoom
        room={room}
        players={players}
        gameSettings={gameSettings}
        startGame={startGame}
        leaveRoom={leaveRoom}
      />
    )
  }

  // Show local waiting room for local modes
  if (!isOnlineMode && !isLocalMode && gameStatus === "waiting") {
    return (
      <GameWaiting
        gameSettings={gameSettings}
        players={players}
        leaveRoom={leaveRoom}
        navigate={navigate}
        startGame={startGame}
        isLocalMode={isLocalMode}
      />
    )
  }

  if (isLocalMode && !localGameState) {
    return <GameLoading message="Initializing game..." />
  }

  // For local multiplayer, we need to find the current player based on turn
  const currentPlayerId = activeGameState?.currentTurn
  const currentPlayer = activePlayers.find((p) => p.id === currentPlayerId) || {
    id: "",
    nickname: "Unknown Player",
    avatar: null,
    color: "#4287f5",
  }

  // In local multiplayer, we don't disable the input - we just show who should be playing
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

        {isLocalMultiplayer && <CurrentPlayerIndicator currentPlayer={currentPlayer} players={activePlayers} />}

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
