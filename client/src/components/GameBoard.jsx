import React, {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import WordInput from './WordInput';
import InfoModal from './InfoModal';
import useGameSocket from '../hooks/useGameSocket';
import {getDefinition} from '../utils/definitionUtils';
import '../assets/css/GameBoard.css';
import GameHeader from './GameHeader';
import WordpieceDisplay from './WordpieceDisplay';
import PlayersList from './PlayersList';
import PowerUpsPanel from './PowerUpsPanel';
import GameWaiting from './GameWaiting';
import GameLoading from './GameLoading';

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
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
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
            timerRef.current = null;
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
            <GameLoading message="Connecting to game server..." error={error} />
        );
    }

    if (!isLocalMode && gameStatus === 'waiting') {
        return (
            <GameWaiting
                gameSettings={gameSettings}
                players={players}
                leaveRoom={leaveRoom}
                navigate={navigate}
                startGame={startGame}
                isLocalMode={isLocalMode}
            />
        );
    }

    if (isLocalMode && !localGameState) {
        return (
            <GameLoading message="Initializing game..." />
        );
    }


    const isPlayerTurn = activeGameState?.currentTurn === player.id;


    const playerScore = activeGameState?.scores[player.id] || 0;
    const playerLives = activeGameState?.lives[player.id] || 3;


    const playerPowerUps = activeGameState?.powerUps[player.id] || {};

    function handleRequestDefinition() {
        if (!lastSubmittedWord) return;
        requestDefinition(lastSubmittedWord);
        setShowDefinition(true);
    }

    function handleCloseDefinition() {
        setShowDefinition(false);
    }

    return (
        <div className="game-board">
            <GameHeader
                gameSettings={gameSettings}
                isLocalMode={isLocalMode}
                activeGameState={activeGameState}
                playerScore={playerScore}
                playerLives={playerLives}
            />
            <div className="game-content">
                <WordpieceDisplay wordpiece={activeGameState?.currentWordpiece} />
                <WordInput
                    onSubmit={handleSubmitWord}
                    disabled={gameSettings.mode !== 'single' && !isPlayerTurn}
                    wordpiece={activeGameState?.currentWordpiece}
                />
                {lastSubmittedWord && (
                    <button
                        className="definition-btn"
                        onClick={() => handleRequestDefinition()}
                    >
                        Show definition for "{lastSubmittedWord}"
                    </button>
                )}
            </div>
            <PlayersList activePlayers={activePlayers} activeGameState={activeGameState} />
            <PowerUpsPanel
                playerPowerUps={playerPowerUps}
                handleUsePowerUp={handleUsePowerUp}
                isPlayerTurn={isPlayerTurn}
            />
            {showDefinition && (
                <InfoModal
                    word={lastSubmittedWord}
                    definition={getDefinition() || 'No definition found.'}
                    onClose={handleCloseDefinition}
                />
            )}
        </div>
    );
}

export default GameBoard;