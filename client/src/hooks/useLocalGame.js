import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateWordpiece } from '../utils/wordpieceUtils';

/**
 * Custom hook for managing local (single/local multiplayer) game state and logic
 */
export default function useLocalGame(player, gameSettings) {
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const [localGameState, setLocalGameState] = useState(null);
    const [localPlayers, setLocalPlayers] = useState([]);

    // Initialize local game
    const initializeLocalGame = () => {
        const gamePlayers = [
            {
                id: player.id,
                name: player.nickname,
                avatar: player.avatar,
                color: player.color,
                isHost: true
            }
        ];
        if (gameSettings.mode === 'local') {
            gamePlayers.push({
                id: 'player2',
                name: 'Player 2',
                avatar: null,
                color: '#a777e3',
                isHost: false
            });
        }
        setLocalPlayers(gamePlayers);
        const initialState = {
            status: 'playing',
            currentWordpiece: generateWordpiece(),
            timer: 15,
            scores: {},
            lives: {},
            powerUps: {},
            turnOrder: gamePlayers.map(p => p.id),
            currentTurn: gamePlayers[0].id,
            usedWords: new Set()
        };
        gamePlayers.forEach(p => {
            initialState.scores[p.id] = 0;
            initialState.lives[p.id] = 3;
            initialState.powerUps[p.id] = {
                reverse_turn: 0,
                trap: 0,
                extra_wordpiece: 0
            };
        });
        setLocalGameState(initialState);
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
                    const currentPlayerId = prev.currentTurn;
                    const newLives = { ...prev.lives };
                    newLives[currentPlayerId] = newLives[currentPlayerId] - 1;
                    if (newLives[currentPlayerId] <= 0) {
                        if (gameSettings.mode === 'single' || Object.values(newLives).filter(life => life > 0).length <= 1) {
                            setTimeout(() => {
                                navigate('/game-over', {
                                    state: {
                                        scores: prev.scores,
                                        mode: gameSettings.mode
                                    }
                                });
                            }, 1000);
                            return {
                                ...prev,
                                status: 'over',
                                timer: 0,
                                lives: newLives
                            };
                        }
                        const newTurnOrder = prev.turnOrder.filter(id => id !== currentPlayerId);
                        const nextPlayerId = newTurnOrder[0];
                        return {
                            ...prev,
                            timer: 15,
                            currentWordpiece: generateWordpiece(),
                            lives: newLives,
                            turnOrder: newTurnOrder,
                            currentTurn: nextPlayerId
                        };
                    }
                    let nextPlayerId = currentPlayerId;
                    if (gameSettings.mode === 'local') {
                        const currentIndex = prev.turnOrder.indexOf(currentPlayerId);
                        const nextIndex = (currentIndex + 1) % prev.turnOrder.length;
                        nextPlayerId = prev.turnOrder[nextIndex];
                    }
                    setTimeout(() => startLocalTimer(), 100);
                    return {
                        ...prev,
                        timer: 15,
                        currentWordpiece: generateWordpiece(),
                        lives: newLives,
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
            const newUsedWords = new Set(prev.usedWords);
            newUsedWords.add(word.toLowerCase());
            const score = Math.max(1, word.length - currentWordpiece.length + 1);
            const newScores = { ...prev.scores };
            newScores[currentTurn] = newScores[currentTurn] + score;
            const newPowerUps = { ...prev.powerUps };
            if (word.length > 7 && Math.random() < 0.25) {
                const powerUpTypes = ['reverse_turn', 'trap', 'extra_wordpiece'];
                const randomPowerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                newPowerUps[currentTurn] = {
                    ...newPowerUps[currentTurn],
                    [randomPowerUp]: (newPowerUps[currentTurn][randomPowerUp] || 0) + 1
                };
            }
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
                scores: newScores,
                powerUps: newPowerUps,
                timer: 15,
                currentWordpiece: generateWordpiece(),
                currentTurn: nextPlayerId
            };
        });
    };

    // Power-up logic
    const handleLocalUsePowerUp = (type, targetId) => {
        if (!localGameState) return;
        setLocalGameState(prev => {
            const newPowerUps = { ...prev.powerUps };
            const currentPlayerId = prev.currentTurn;
            if (!newPowerUps[currentPlayerId][type] || newPowerUps[currentPlayerId][type] <= 0) return prev;
            newPowerUps[currentPlayerId] = {
                ...newPowerUps[currentPlayerId],
                [type]: newPowerUps[currentPlayerId][type] - 1
            };
            let newTurnOrder = [...prev.turnOrder];
            let newCurrentTurn = prev.currentTurn;
            if (type === 'reverse_turn' && gameSettings.mode === 'local') {
                newTurnOrder.reverse();
                const currentIndex = newTurnOrder.indexOf(currentPlayerId);
                const nextIndex = (currentIndex + 1) % newTurnOrder.length;
                newCurrentTurn = newTurnOrder[nextIndex];
            }
            return {
                ...prev,
                powerUps: newPowerUps,
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
