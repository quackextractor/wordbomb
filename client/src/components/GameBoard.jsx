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

    const handleLeaveGame = useCallback(() => {
        setShowLeaveConfirm(true)
    }, [])

    const confirmLeaveGame = useCallback(() => {
        if (!isLocalMode) {
            leaveRoom()
        }
        navigate("/")
        setShowLeaveConfirm(false)
    }, [isLocalMode, leaveRoom, navigate])

    const cancelLeaveGame = useCallback(() => {
        setShowLeaveConfirm(false)
    }, [])

    useEffect(() => {
        if (gameSettings.mode === "single" || gameSettings.mode === "local") {
            initializeLocalGame()
        }
    }, [gameSettings.mode, initializeLocalGame])

    useEffect(() => {
        if (gameSettings.mode !== "single" && gameSettings.mode !== "local") {
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
            if (gameSettings.mode !== "single" && gameSettings.mode !== "local") {
                leaveRoom()
            }
        }
    }, [connected, gameSettings.isHost, gameSettings.roomId, gameSettings.mode, createRoom, joinRoom, leaveRoom])

    useEffect(() => {
        if (gameSettings.isHost && gameSettings.mode === "online" && room) {
            startGame()
        }
    }, [gameSettings.isHost, gameSettings.mode, room, startGame])

    useEffect(() => {
        if (gameStatus === "over") {
            navigate("/game-over", {
                state: {
                    scores,
                    roomId: gameSettings.roomId,
                    mode: gameSettings.mode,
                },
            })
        }
    }, [gameStatus, navigate, scores, gameSettings.roomId, gameSettings.mode])

    useEffect(() => {
        if (wordInputRef.current && typeof wordInputRef.current.clearUsedWords === "function") {
            wordInputRef.current.clearUsedWords()
        }
    }, [startGame])

    useEffect(() => {
        if (!activeGameState?.lives || !player?.id) return

        const currentLives = activeGameState.lives[player.id] || 3
        const previousLives = prevLivesRef.current[player.id] || currentLives

        console.debug(
            `Lives check - Player: ${player.id}, Current: ${currentLives}, Previous: ${previousLives}, Show Effect: ${currentLives < previousLives}`,
        )

        if (currentLives < previousLives) {
            console.log(`Player ${player.id} lost a life! Current: ${currentLives}, Previous: ${previousLives}`)
            setShowDamageEffect(true)

            const timer = setTimeout(() => {
                setShowDamageEffect(false)
            }, 500)

            return () => clearTimeout(timer)
        }

        prevLivesRef.current = { ...activeGameState.lives }
    }, [activeGameState?.lives, player?.id])

    useEffect(() => {
        if (activeGameState?.lives && Object.keys(activeGameState.lives).length > 0) {
            if (Object.keys(prevLivesRef.current).length === 0) {
                prevLivesRef.current = { ...activeGameState.lives }
            }
        }
    }, [activeGameState?.lives])

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
        [isLocalMode, handleLocalUsePowerUp, players, player.id, usePowerUp],
    )

    if (!connected && !isLocalMode) {
        return <GameLoading message="Connecting to game server..." error={error} />
    }

    if (!isLocalMode && gameStatus === "waiting") {
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

    const isPlayerTurn = activeGameState?.currentTurn === player.id
    const playerScore = activeGameState?.scores[player.id] || 0
    const playerLives = activeGameState?.lives[player.id] || 3
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
                    playerScore={playerScore}
                    playerLives={playerLives}
                />

                <div className="card p-6 mb-4">
                    <WordpieceDisplay wordpiece={activeGameState?.currentWordpiece} />
                    <WordInput
                        ref={wordInputRef}
                        onSubmit={handleSubmitWord}
                        disabled={gameSettings.mode !== "single" && !isPlayerTurn}
                        wordpiece={activeGameState?.currentWordpiece}
                    />
                </div>

                <WordDefinitionsPanel wordDefinitions={wordDefinitions} />
                <PlayersList activePlayers={activePlayers} activeGameState={activeGameState} />

                {Object.keys(playerPowerUps).length > 0 && (
                    <PowerUpsPanel
                        playerPowerUps={playerPowerUps}
                        handleUsePowerUp={handleUsePowerUp}
                        isPlayerTurn={isPlayerTurn}
                    />
                )}
            </div>
        </div>
    )
}

export default GameBoard