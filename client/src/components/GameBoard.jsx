import React, {useEffect, useState} from 'react';
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
import useLocalGame from '../hooks/useLocalGame';

function GameBoard({player, gameSettings: initialGameSettings}) {
    const navigate = useNavigate();
    const location = useLocation();


    // Use custom hook for local game logic
    const {
        localGameState,
        localPlayers,
        initializeLocalGame,
        handleLocalSubmitWord,
        handleLocalUsePowerUp,
        timerRef
    } = useLocalGame(player, initialGameSettings);


    const [gameSettings, setGameSettings] = useState(() => {
        const locationState = location.state || {};
        return {
            ...initialGameSettings,
            ...locationState
        };
    });

    const [showDefinition, setShowDefinition] = useState(false);
    const [lastSubmittedWord, setLastSubmittedWord] = useState('');


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


    // Use localGameState/localPlayers from hook
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

    // Fix: define handleSubmitWord and handleUsePowerUp in the correct scope
    const handleSubmitWord = (word) => {
        if (isLocalMode) {
            handleLocalSubmitWord(word);
        } else {
            submitWord(word);
        }
        setLastSubmittedWord(word);
    };

    const handleUsePowerUp = (type, targetId) => {
        if (isLocalMode) {
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