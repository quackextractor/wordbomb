import React, {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import WordInput from './WordInput';
import InfoModal from './InfoModal';
import useGameSocket from '../hooks/useGameSocket';
import {getDefinition} from '../utils/definitionUtils';
import '../assets/css/GameBoard.css';

function handleRequestDefinition() {
    console.log(getDefinition());
}

/**
 * Main game board component that handles game state and rendering
 */
function GameBoard({player, gameSettings: initialGameSettings}) {
    const navigate = useNavigate();
    const location = useLocation();


    const [gameSettings, setGameSettings] = useState(() => {
        const locationState = location.state || {};
        return {
            ...initialGameSettings,
            ...locationState
        };
    });

    const [showDefinition, setShowDefinition] = useState(false);
    const [lastSubmittedWord, setLastSubmittedWord] = useState('');


    const [localGameState, setLocalGameState] = useState(null);
    const [localPlayers, setLocalPlayers] = useState([]);
    const timerRef = useRef(null);


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
        definition,
        error,
        createRoom,
        joinRoom,
        startGame,
        submitWord,
        usePowerUp,
        requestDefinition,
        leaveRoom
    } = useGameSocket(player, gameSettings);

    useEffect(() => {
        if (gameSettings.mode === 'single' || gameSettings.mode === 'local') {
            initializeLocalGame();
        }
    }, [gameSettings.mode]);

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
    const startLocalTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        timerRef.current = setInterval(() => {
            setLocalGameState(prev => {
                if (!prev) return null;

                const newTimer = prev.timer - 1;


                if (newTimer <= 0) {
                    clearInterval(timerRef.current);


                    const currentPlayerId = prev.currentTurn;
                    const newLives = {...prev.lives};
                    newLives[currentPlayerId] = newLives[currentPlayerId] - 1;


                    if (newLives[currentPlayerId] <= 0) {
                        if (gameSettings.mode === 'single' ||
                            Object.values(newLives).filter(life => life > 0).length <= 1) {

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


    const generateWordpiece = () => {
        const commonWordpieces = [
            'ing', 'er', 'tion', 'ed', 'es', 'ly', 'ment',
            'al', 'ity', 'ive', 'ize', 'ous', 'ful', 'less',
            'able', 'ible', 'ance', 'ence', 'ism', 'ist', 'ness',
            're', 'un', 'in', 'im', 'dis', 'en', 'em', 'non',
            'de', 'ex', 'pre', 'pro', 'com', 'con', 'per',
            'sub', 'sup', 'inter', 'trans', 'over', 'under',
            'an', 'at', 'en', 'in', 'on', 'or', 'th', 'ch',
            'sh', 'ph', 'wh', 'qu', 'sc', 'sp', 'st', 'tr'
        ];

        return commonWordpieces[Math.floor(Math.random() * commonWordpieces.length)];
    };


    useEffect(() => {
        if (gameSettings.mode !== 'single' && gameSettings.mode !== 'local') {
            const initializeGame = async () => {
                try {
                    if (gameSettings.isHost && !gameSettings.roomId) {

                        const roomId = await createRoom(gameSettings.mode);
                        setGameSettings(prev => ({...prev, roomId}));
                    } else if (gameSettings.roomId) {

                        joinRoom(gameSettings.roomId);
                    }
                } catch (err) {
                    console.error('Error initializing game:', err);
                }
            };

            if (connected) {
                initializeGame();
            }
        }


        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            if (gameSettings.mode !== 'single' && gameSettings.mode !== 'local') {
                leaveRoom();
            }
        };
    }, [connected, gameSettings.isHost, gameSettings.roomId, gameSettings.mode]);


    useEffect(() => {
        if (gameSettings.isHost && gameSettings.mode === 'online' && room) {
            startGame();
        }
    }, [gameSettings.isHost, gameSettings.mode, room]);


    useEffect(() => {
        if (gameStatus === 'over') {
            navigate('/game-over', {
                state: {
                    scores,
                    roomId: gameSettings.roomId,
                    mode: gameSettings.mode
                }
            });
        }
    }, [gameStatus]);


    const handleSubmitWord = (word) => {
        if (gameSettings.mode === 'single' || gameSettings.mode === 'local') {
            handleLocalSubmitWord(word);
        } else {
            submitWord(word);
        }
        setLastSubmittedWord(word);
    };


    const handleLocalSubmitWord = (word) => {
        if (!localGameState) return;

        const {currentWordpiece, currentTurn, usedWords} = localGameState;


        if (!word.toLowerCase().includes(currentWordpiece.toLowerCase())) {

            return;
        }

        if (usedWords.has(word.toLowerCase())) {

            return;
        }


        setLocalGameState(prev => {

            const newUsedWords = new Set(prev.usedWords);
            newUsedWords.add(word.toLowerCase());


            const score = Math.max(1, word.length - currentWordpiece.length + 1);


            const newScores = {...prev.scores};
            newScores[currentTurn] = newScores[currentTurn] + score;


            const newPowerUps = {...prev.powerUps};
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


            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
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
    }


    const handleUsePowerUp = (type, targetId) => {
        if (gameSettings.mode === 'single' || gameSettings.mode === 'local') {
            handleLocalUsePowerUp(type, targetId);
        } else {

            if (['trap', 'extra_wordpiece'].includes(type)) {

                const otherPlayer = players.find(p => p.id !== player.id);
                if (otherPlayer) {
                    usePowerUp(type, otherPlayer.id);
                }
            } else {
                usePowerUp(type);
            }
        }
    };


    const handleLocalUsePowerUp = (type, targetId) => {
        if (!localGameState) return;

        setLocalGameState(prev => {

            const newPowerUps = {...prev.powerUps};
            const currentPlayerId = prev.currentTurn;

            if (!newPowerUps[currentPlayerId][type] || newPowerUps[currentPlayerId][type] <= 0) {
                return prev;
            }

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


    const isLocalMode = gameSettings.mode === 'single' || gameSettings.mode === 'local';
    const activeGameState = isLocalMode ? localGameState : {
        currentWordpiece,
        timer,
        scores,
        lives,
        powerUps,
        turnOrder,
        currentTurn,
        status: gameStatus
    };
    const activePlayers = isLocalMode ? localPlayers : players;


    if (!connected && !isLocalMode) {
        return (
            <div className="game-loading">
                <h2>Connecting to game server...</h2>
                {error && <p className="error-message">{error}</p>}
            </div>
        );
    }


    if (!isLocalMode && gameStatus === 'waiting') {
        return (
            <div className="game-waiting">
                <h2>Waiting for players</h2>
                <p>Room ID: <span className="room-id">{gameSettings.roomId}</span></p>
                <p>Share this code with friends to join!</p>

                <div className="players-list">
                    <h3>Players:</h3>
                    <ul>
                        {players.map(p => (
                            <li key={p.id} className="player-item">
                                {p.isHost && <span className="host-badge">Host</span>}
                                <span className="player-name">{p.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {gameSettings.isHost && (
                    <button
                        className="start-game-btn"
                        onClick={startGame}
                        disabled={players.length < (gameSettings.mode === 'single' ? 1 : 2)}
                    >
                        Start Game
                    </button>
                )}

                <button
                    className="leave-game-btn"
                    onClick={() => {
                        if (!isLocalMode) leaveRoom();
                        navigate('/');
                    }}
                >
                    Leave Game
                </button>
            </div>
        );
    }


    if (isLocalMode && !localGameState) {
        return (
            <div className="game-loading">
                <h2>Initializing game...</h2>
            </div>
        );
    }


    const isPlayerTurn = activeGameState?.currentTurn === player.id;


    const playerScore = activeGameState?.scores[player.id] || 0;
    const playerLives = activeGameState?.lives[player.id] || 3;


    const playerPowerUps = activeGameState?.powerUps[player.id] || {};

    return (
        <div className="game-board">
            <div className="game-header">
                <div className="room-info">
                    <span>Mode: {gameSettings.mode}</span>
                    {!isLocalMode && <span>Room: {gameSettings.roomId}</span>}
                </div>

                <div className="timer-container">
                    <div className="timer" style={{
                        '--progress': `${(activeGameState?.timer / (gameSettings.mode === 'wordmaster' ? 30 : 15)) * 100}%`
                    }}>
                        {activeGameState?.timer}s
                    </div>
                </div>

                <div className="player-info">
                    <span>Score: {playerScore}</span>
                    <div className="lives">
                        {Array.from({length: playerLives}).map((_, i) => (
                            <span key={i} className="life-icon">❤️</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="game-content">
                <div className="wordpiece-container">
                    <h2>Current Wordpiece:</h2>
                    <div className="wordpiece">{activeGameState?.currentWordpiece}</div>
                </div>

                <WordInput
                    onSubmit={handleSubmitWord}
                    disabled={gameSettings.mode !== 'single' && !isPlayerTurn}
                    wordpiece={activeGameState?.currentWordpiece}
                />

                {lastSubmittedWord && (
                    <button
                        className="definition-btn"
                        onClick={() => handleRequestDefinition(lastSubmittedWord)}
                    >
                        Show definition for "{lastSubmittedWord}"
                    </button>
                )}
            </div>

            <div className="players-container">
                <h3>Players</h3>
                <div className="players-grid">
                    {activePlayers.map(p => (
                        <div
                            key={p.id}
                            className={`player-card ${activeGameState?.currentTurn === p.id ? 'current-turn' : ''}`}
                        >
                            {p.avatar ? (
                                <img src={p.avatar || "/placeholder.svg"} alt={p.name} className="player-avatar"/>
                            ) : (
                                <div
                                    className="player-avatar-placeholder"
                                    style={{backgroundColor: p.color}}
                                >
                                    {p.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="player-details">
                                <span className="player-name">{p.name}</span>
                                <span className="player-score">Score: {activeGameState?.scores[p.id] || 0}</span>
                                <div className="player-lives">
                                    {Array.from({length: activeGameState?.lives[p.id] || 3}).map((_, i) => (
                                        <span key={i} className="life-icon-small">❤️</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {Object.keys(playerPowerUps).length > 0 && (
                <div className="power-ups-container">
                    <h3>Power-ups</h3>
                    <div className="power-ups-list">
                        {Object.entries(playerPowerUps).map(([type, count]) => (
                            count > 0 && (
                                <div key={type} className="power-up-item">
                                    <button
                                        className="power-up-btn"
                                        onClick={() => handleUsePowerUp(type)}
                                        disabled={!isPlayerTurn}
                                    >
                                        {type === 'reverse_turn' && '🔄 Reverse Turn Order'}
                                        {type === 'trap' && '🎯 Trap Opponent'}
                                        {type === 'extra_wordpiece' && '➕ Extra Wordpiece'}
                                        <span className="power-up-count">x{count}</span>
                                    </button>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}

            {showDefinition && definition && (
                <InfoModal
                    word={lastSubmittedWord}
                    definition={definition}
                    onClose={handleCloseDefinition}
                />
            )}
        </div>
    );
}

export default GameBoard;