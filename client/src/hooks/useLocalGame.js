import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateWordpiece } from '../utils/wordpieceUtils';
import GameManager from '../models/GameManager';
import Player from '../models/Player';
import PowerUp from '../models/PowerUp';
import TurnManager from '../models/TurnManager';
import WordPiece, { Difficulty } from '../models/WordPiece';

/**
 * Custom hook for managing local (single/local multiplayer) game state and logic
 */
export default function useLocalGame(player, gameSettings) {
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const [localGameState, setLocalGameState] = useState(null);
    const [localPlayers, setLocalPlayers] = useState([]);
    // Use OOP GameManager instance
    const gameManagerRef = useRef(null);

    // Initialize local game
    const initializeLocalGame = () => {
        // Create Player objects
    
        const gamePlayers = [
            new Player({
                id: player.id,
                name: player.nickname,
                avatar: player.avatar,
                color: player.color,
                isHost: true
            })
        ];
        if (gameSettings.mode === 'local') {
            gamePlayers.push(new Player({
                id: 'player2',
                name: 'Player 2',
                avatar: null,
                color: '#a777e3',
                isHost: false
            }));
        }
        setLocalPlayers(gamePlayers);
        // Create GameManager instance
        gameManagerRef.current = new GameManager(gamePlayers);
        gameManagerRef.current.startGame();
        // Set initial state
        setLocalGameState({
            status: 'playing',
            currentWordpiece: generateWordpiece(),
            timer: gameManagerRef.current.turnManager.maxTurnTime,
            usedWords: new Set(),
            // Map player state for UI
            scores: Object.fromEntries(gamePlayers.map(p => [p.id, p.score])),
            lives: Object.fromEntries(gamePlayers.map(p => [p.id, p.hp])),
            powerUps: Object.fromEntries(gamePlayers.map(p => [p.id, {...p.powerUps}])),
            turnOrder: gamePlayers.map(p => p.id),
            currentTurn: gamePlayers[0].id
        });
        startLocalTimer();
    };

    // Timer logic
    const startLocalTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        timerRef.current = setInterval(() => {
            setLocalGameState(prev => {
                if (!prev) return null;
                const newTimer = prev.timer - 1;
                if (newTimer <= 0) {
                    clearInterval(timerRef.current);
                    // Use OOP: damage player, check game over, advance turn
                    const gm = gameManagerRef.current;
                    gm.changePlayerHp(-1, prev.currentTurn);
                    gm.checkGameOver();
                    // Remove player if dead
                    const nextTurnOrder = prev.turnOrder.filter(id => gm.playingPlayers.some(p => p.id === id && p.isPlaying));
                    let nextPlayerId = nextTurnOrder[0];
                    if (gameSettings.mode === 'local') {
                        const currentIndex = nextTurnOrder.indexOf(prev.currentTurn);
                        const nextIndex = (currentIndex + 1) % nextTurnOrder.length;
                        nextPlayerId = nextTurnOrder[nextIndex];
                    }
                    // End game if only one left
                    if (gm.playingPlayers.length <= 1) {
                        setTimeout(() => {
                            navigate('/game-over', {
                                state: {
                                    scores: Object.fromEntries(gm.allPlayers.map(p => [p.id, p.score])),
                                    mode: gameSettings.mode
                                }
                            });
                        }, 1000);
                        return {
                            ...prev,
                            status: 'over',
                            timer: 0,
                            lives: Object.fromEntries(gm.allPlayers.map(p => [p.id, p.hp]))
                        };
                    }
                    setTimeout(() => startLocalTimer(), 100);
                    return {
                        ...prev,
                        timer: gm.turnManager.maxTurnTime,
                        currentWordpiece: generateWordpiece(),
                        lives: Object.fromEntries(gm.allPlayers.map(p => [p.id, p.hp])),
                        turnOrder: nextTurnOrder,
                        currentTurn: nextPlayerId
                    };
                }
                return {
                    ...prev,
                    timer: newTimer
                };
            });
        }, 1000);
    };

    // Word submission logic
    const handleLocalSubmitWord = (word) => {
        if (!localGameState) return;
        const { currentWordpiece, currentTurn, usedWords } = localGameState;
        if (!word.toLowerCase().includes(currentWordpiece.toLowerCase())) return;
        if (usedWords.has(word.toLowerCase())) return;
        setLocalGameState(prev => {
            const gm = gameManagerRef.current;
            const newUsedWords = new Set(prev.usedWords);
            newUsedWords.add(word.toLowerCase());
            // Award score based on wordpiece difficulty (stub: use word length)
            const score = Math.max(1, word.length - currentWordpiece.length + 1);
            const player = gm.playingPlayers.find(p => p.id === currentTurn);
            if (player) player.changeScore(score);
            // PowerUp chance
            if (word.length > 7 && Math.random() < 0.25) {
                const types = ['reverse_turn', 'trap', 'extra_wordpiece'];
                const type = types[Math.floor(Math.random() * types.length)];
                if (player) player.powerUps[type] = (player.powerUps[type] || 0) + 1;
            }
            // Next player
            let nextPlayerId = currentTurn;
            if (gameSettings.mode === 'local') {
                const currentIndex = prev.turnOrder.indexOf(currentTurn);
                const nextIndex = (currentIndex + 1) % prev.turnOrder.length;
                nextPlayerId = prev.turnOrder[nextIndex];
            }
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeout(() => startLocalTimer(), 100);
            return {
                ...prev,
                usedWords: newUsedWords,
                scores: Object.fromEntries(gm.allPlayers.map(p => [p.id, p.score])),
                powerUps: Object.fromEntries(gm.allPlayers.map(p => [p.id, {...p.powerUps}])),
                timer: gm.turnManager.maxTurnTime,
                currentWordpiece: generateWordpiece(),
                currentTurn: nextPlayerId
            };
        });
    };

    // Power-up logic
    const handleLocalUsePowerUp = (type, targetId) => {
        if (!localGameState) return;
        setLocalGameState(prev => {
            const gm = gameManagerRef.current;
            const currentPlayer = gm.playingPlayers.find(p => p.id === prev.currentTurn);
            if (!currentPlayer || !currentPlayer.usePowerUp(type)) return prev;
            let newTurnOrder = [...prev.turnOrder];
            let newCurrentTurn = prev.currentTurn;
            if (type === 'reverse_turn' && gameSettings.mode === 'local') {
                newTurnOrder.reverse();
                const currentIndex = newTurnOrder.indexOf(currentPlayer.id);
                const nextIndex = (currentIndex + 1) % newTurnOrder.length;
                newCurrentTurn = newTurnOrder[nextIndex];
            }
            // Other powerup effects can be added here
            return {
                ...prev,
                powerUps: Object.fromEntries(gm.allPlayers.map(p => [p.id, {...p.powerUps}])),
                turnOrder: newTurnOrder,
                currentTurn: newCurrentTurn
            };
        });
    };

    return {
        localGameState,
        localPlayers,
        initializeLocalGame,
        handleLocalSubmitWord,
        handleLocalUsePowerUp,
        timerRef
    };
}