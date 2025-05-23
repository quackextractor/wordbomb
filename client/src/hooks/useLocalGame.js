"use client"

import {useCallback, useEffect, useRef, useState} from "react"
import {useNavigate} from "react-router-dom"
import LocalGameEngine from "../models/LocalGameEngine"

/**
 * Custom hook for managing local (single/local multiplayer) game state and logic,
 * acting as an adapter for the LocalGameEngine.
 */
export default function useLocalGame(player, gameSettings) {
    const navigate = useNavigate()
    const [localGameState, setLocalGameState] = useState(null)
    const [localPlayers, setLocalPlayers] = useState([])
    const gameEngineRef = useRef(null)

    const isLocalGameMode = gameSettings?.mode === "single" || gameSettings?.mode === "local"

    // Callback for the engine to update React state
    const handleEngineStateUpdate = useCallback((newState) => {
        setLocalGameState((prevState) => ({...prevState, ...newState}))
    }, [])

    // Callback for the engine to handle game over
    const handleEngineGameOver = useCallback(
        (scores) => {
            // Don't try to format scores here - just pass them to the navigation
            navigate("/game-over", {
                state: {
                    scores: scores, // Pass raw scores
                    mode: gameSettings.mode,
                    localPlayers: localPlayers,
                    setupPlayers: gameSettings.localPlayers || [],
                },
            })
        },
        [navigate, gameSettings],
    )

    // Initialize game engine
    const initializeLocalGame = useCallback(() => {
        if (!player || !gameSettings || !isLocalGameMode) return

        // Ensure previous engine is cleaned up if any
        if (gameEngineRef.current) {
            gameEngineRef.current.cleanup()
        }

        // For local multiplayer, use the players from gameSettings
        const gameSettingsToUse = {
            ...gameSettings,
            // Default values if not provided
            lives: gameSettings.lives || 3,
            turnTime: gameSettings.turnTime || 15,
        }

        const engine = new LocalGameEngine(player, gameSettingsToUse, handleEngineStateUpdate, handleEngineGameOver)

        gameEngineRef.current = engine

        // Initialize the game and get the initial players
        let initialPlayers

        if (gameSettings.mode === "local" && gameSettings.localPlayers && gameSettings.localPlayers.length > 0) {
            // Use the players from the setup screen for local multiplayer
            initialPlayers = engine.initializeGameWithPlayers(gameSettings.localPlayers)
        } else {
            // Default initialization for single player
            initialPlayers = engine.initializeGame()
        }

        console.log("Initial players in useLocalGame:", initialPlayers)
        setLocalPlayers(initialPlayers)
        // Initial state is set by the engine via handleEngineStateUpdate
    }, [player, gameSettings, handleEngineStateUpdate, handleEngineGameOver, isLocalGameMode]) // initializeLocalGame is now stable due to useCallback

    // Word submission logic
    const handleLocalSubmitWord = useCallback((word) => {
        if (gameEngineRef.current) {
            gameEngineRef.current.submitWord(word)
        }
    }, [])

    // Power-up logic
    const handleLocalUsePowerUp = useCallback((type, targetId) => {
        if (gameEngineRef.current) {
            gameEngineRef.current.usePowerUp(type, targetId)
        }
    }, [])

    // Effect to initialize and clean up the game
    useEffect(() => {
        // Initialize on mount if player and gameSettings are available and mode is appropriate
        initializeLocalGame()

        // Cleanup on unmount
        return () => {
            if (gameEngineRef.current) {
                gameEngineRef.current.cleanup()
            }
        }
    }, [player, gameSettings, initializeLocalGame, isLocalGameMode]) // initializeLocalGame is now stable due to useCallback

    return {
        localGameState,
        localPlayers,
        initializeLocalGame, // Can still be called to re-initialize if needed
        handleLocalSubmitWord,
        handleLocalUsePowerUp,
        // timerRef is no longer exposed as timer is managed by the engine
    }
}
