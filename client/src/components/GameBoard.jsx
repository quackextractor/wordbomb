"use client"

import { useEffect, useState, useRef } from "react"
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

function GameBoard({ player, gameSettings: initialGameSettings }) {
    const navigate = useNavigate()
    const location = useLocation()
    const wordInputRef = useRef(null)

    // Use custom hook for local game logic
    const { localGameState, localPlayers, initializeLocalGame, handleLocalSubmitWord, handleLocalUsePowerUp } =
        useLocalGame(player, initialGameSettings)

    const [gameSettings, setGameSettings] = useState(() => {
        const locationState = location.state || {}
        return {
            ...initialGameSettings,
            ...locationState,
        }
    })

    const [lastSubmittedWord, setLastSubmittedWord] = useState("")
    const [wordDefinitions, setWordDefinitions] = useState([]) // [{word, definitions: []}]

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

    const handleUsePowerUp = (type, targetId) => {
        const otherPlayer = players.find((p) => p.id !== player.id)
        if (otherPlayer) {
            usePowerUp(type, otherPlayer.id)
        } else {
            usePowerUp(type)
        }
    }

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
    }, [gameSettings.isHost, gameSettings.mode, room])

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
    }, [gameStatus])

    // Clear used words on game start
    useEffect(() => {
        if (wordInputRef.current && typeof wordInputRef.current.clearUsedWords === "function") {
            wordInputRef.current.clearUsedWords()
        }
    }, [startGame])

    // Use localGameState/localPlayers from hook
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

    // Fetch definitions from Datamuse API (async, non-blocking)
    async function fetchDefinitions(word) {
        try {
            const response = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`)
            const data = await response.json()
            if (data && data[0] && Array.isArray(data[0].defs) && data[0].defs.length > 0) {
                // Up to 3 definitions
                return data[0].defs.slice(0, 3).map((def) => def.replace(/^\w+\t/, ""))
            }
        } catch (e) {
            // ignore
        }
        return []
    }

    // When a word is submitted, fetch its definition in the background
    const handleSubmitWord = (word) => {
        if (isLocalMode) {
            handleLocalSubmitWord(word)
        } else {
            submitWord(word)
        }
        setLastSubmittedWord(word)
        // Fetch definition async, update state when done
        fetchDefinitions(word).then((defs) => {
            setWordDefinitions((prev) => {
                // Allow up to 4 words in the panel
                const newDefs = [{ word, definitions: defs.length ? defs : [] }, ...prev.filter((wd) => wd.word !== word)]
                return newDefs.slice(0, 4) // keep only last 4
            })
        })
    }

    return (
        <div className="game-container py-4">
            <div className="max-w-5xl mx-auto">
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
