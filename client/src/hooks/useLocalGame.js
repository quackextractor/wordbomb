import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LocalGameEngine from '../models/LocalGameEngine';

/**
 * Custom hook for managing local (single/local multiplayer) game state and logic,
 * acting as an adapter for the LocalGameEngine.
 */
export default function useLocalGame(player, gameSettings) {
    const navigate = useNavigate();
    const [localGameState, setLocalGameState] = useState(null);
    const [localPlayers, setLocalPlayers] = useState([]);
    const gameEngineRef = useRef(null);

    // Callback for the engine to update React state
    const handleEngineStateUpdate = useCallback((newState) => {
        setLocalGameState(prevState => ({ ...prevState, ...newState }));
    }, []);

    // Callback for the engine to handle game over
    const handleEngineGameOver = useCallback((scores) => {
        navigate('/game-over', {
            state: {
                scores: scores,
                mode: gameSettings.mode
            }
        });
    }, [navigate, gameSettings.mode]);

    // Initialize game engine
    const initializeLocalGame = useCallback(() => {
        if (!player || !gameSettings) return;

        // Ensure previous engine is cleaned up if any
        if (gameEngineRef.current) {
            gameEngineRef.current.cleanup();
        }

        const engine = new LocalGameEngine(player, gameSettings, handleEngineStateUpdate, handleEngineGameOver);
        gameEngineRef.current = engine;
        const initialPlayers = engine.initializeGame();
        setLocalPlayers(initialPlayers);
        // Initial state is set by the engine via handleEngineStateUpdate
    }, [player, gameSettings, handleEngineStateUpdate, handleEngineGameOver]);

    // Word submission logic
    const handleLocalSubmitWord = useCallback((word) => {
        if (gameEngineRef.current) {
            gameEngineRef.current.submitWord(word);
        }
    }, []);

    // Power-up logic
    const handleLocalUsePowerUp = useCallback((type, targetId) => {
        if (gameEngineRef.current) {
            gameEngineRef.current.usePowerUp(type, targetId);
        }
    }, []);

    // Effect to initialize and clean up the game
    useEffect(() => {
        // Initialize on mount if player and gameSettings are available
        if (player && gameSettings) {
            initializeLocalGame();
        }

        // Cleanup on unmount
        return () => {
            if (gameEngineRef.current) {
                gameEngineRef.current.cleanup();
            }
        };
    }, [player, gameSettings, initializeLocalGame]); // initializeLocalGame is now stable due to useCallback

    return {
        localGameState,
        localPlayers,
        initializeLocalGame, // Can still be called to re-initialize if needed
        handleLocalSubmitWord,
        handleLocalUsePowerUp,
        // timerRef is no longer exposed as timer is managed by the engine
    };
}