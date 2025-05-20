import {getDefinition, validateWord} from '../validation/validate.js';

/**
 * Socket.IO handlers for game functionality
 */
const setupGameHandlers = (io, socket, rooms, games) => {
    /**
     * Start a new game
     */
    socket.on('game:start', async (data) => {
        try {
            const {roomId, mode} = data;

            if (!roomId || !mode) {
                socket.emit('error', 'Missing required fields');
                return;
            }

            if (!rooms.has(roomId)) {
                socket.emit('error', 'Room not found');
                return;
            }

            const room = rooms.get(roomId);

            if (room.hostId !== socket.id) {
                socket.emit('error', 'Only the host can start the game');
                return;
            }

            room.mode = mode;
            room.status = 'playing';

            const gameState = {
                roomId,
                mode,
                status: 'playing',
                currentWordpiece: generateWordpiece(),
                timer: mode === 'wordmaster' ? 30 : 15,
                scores: {},
                lives: {},
                powerUps: {},
                turnOrder: [...room.players.map(p => p.id)],
                currentTurn: room.players[0]?.id || null,
                round: 1,
                usedWordpieces: new Set(),
                usedWords: new Set()
            };

            room.players.forEach(player => {
                gameState.scores[player.id] = 0;
                gameState.lives[player.id] = 3;
                gameState.powerUps[player.id] = {
                    reverse_turn: 0,
                    trap: 0,
                    extra_wordpiece: 0
                };
            });

            games.set(roomId, gameState);

            startGameTimer(io, roomId, gameState, rooms);

            io.to(roomId).emit('game:start', {
                wordpiece: gameState.currentWordpiece,
                timer: gameState.timer,
                scores: gameState.scores,
                lives: gameState.lives,
                powerUps: gameState.powerUps,
                turnOrder: gameState.turnOrder,
                currentTurn: gameState.currentTurn
            });

            console.log(`Game started in room ${roomId}, mode: ${mode}`);
        } catch (error) {
            console.error('Error in game:start handler:', error);
            socket.emit('error', 'Failed to start game');
        }
    });

    /**
     * Handle word submission
     */
    socket.on('game:submit', async (data) => {
        try {
            const {roomId, playerId, word, wordpiece} = data;

            if (!roomId || !playerId || !word || !wordpiece) {
                socket.emit('error', 'Missing required fields');
                return;
            }

            if (!games.has(roomId)) {
                socket.emit('error', 'Game not found');
                return;
            }

            const gameState = games.get(roomId);
            const room = rooms.get(roomId);

            if (gameState.status !== 'playing') {
                socket.emit('error', 'Game is not in progress');
                return;
            }

            if (gameState.mode !== 'single' && gameState.currentTurn !== playerId) {
                socket.emit('error', 'Not your turn');
                return;
            }

            if (!word.toLowerCase().includes(wordpiece.toLowerCase())) {
                socket.emit('error', `Word must contain "${wordpiece}"`);
                return;
            }

            if (gameState.usedWords.has(word.toLowerCase())) {
                socket.emit('error', 'Word has already been used');
                return;
            }

            const validationResult = await validateWord(word, wordpiece);

            if (validationResult.valid) {
                gameState.usedWords.add(word.toLowerCase());

                const score = Math.max(1, word.length - wordpiece.length + 1);

                gameState.scores[playerId] += score;

                if (word.length > 7 && Math.random() < 0.25) {
                    const powerUps = ['reverse_turn', 'trap', 'extra_wordpiece'];
                    const randomPowerUp = powerUps[Math.floor(Math.random() * powerUps.length)];

                    gameState.powerUps[playerId][randomPowerUp] += 1;

                    socket.emit('game:power_up_awarded', {
                        type: randomPowerUp
                    });
                }

                const definition = await getDefinition(word);

                io.to(roomId).emit('game:submission_result', {
                    playerId,
                    word,
                    valid: true,
                    scores: gameState.scores,
                    definition
                });

                if (gameState.mode !== 'single') {
                    moveToNextTurn(io, roomId, gameState, rooms);
                } else {
                    generateNewWordpiece(io, roomId, gameState, rooms);
                }
            } else {
                socket.emit('error', validationResult.message || 'Invalid word');

                if (gameState.mode !== 'single') {
                    gameState.lives[playerId] -= 1;

                    if (gameState.lives[playerId] <= 0) {
                        gameState.turnOrder = gameState.turnOrder.filter(id => id !== playerId);

                        if (gameState.turnOrder.length <= 1) {
                            endGame(io, roomId, gameState, rooms);
                            return;
                        }
                    }

                    io.to(roomId).emit('game:player_update', {
                        lives: gameState.lives,
                        scores: gameState.scores
                    });

                    moveToNextTurn(io, roomId, gameState, rooms);
                } else {
                    gameState.lives[playerId] -= 1;

                    io.to(roomId).emit('game:player_update', {
                        lives: gameState.lives,
                        scores: gameState.scores
                    });

                    if (gameState.lives[playerId] <= 0) {
                        endGame(io, roomId, gameState, rooms);
                        return;
                    }

                    generateNewWordpiece(io, roomId, gameState, rooms);
                }
            }
        } catch (error) {
            console.error('Error in game:submit handler:', error);
            socket.emit('error', 'Failed to process word submission');
        }
    });

    /**
     * Handle power-up usage
     */
    socket.on('game:use_power_up', (data) => {
        try {
            const {roomId, playerId, powerUpType, targetPlayerId} = data;

            if (!roomId || !playerId || !powerUpType) {
                socket.emit('error', 'Missing required fields');
                return;
            }

            if (!games.has(roomId)) {
                socket.emit('error', 'Game not found');
                return;
            }

            const gameState = games.get(roomId);

            if (gameState.status !== 'playing') {
                socket.emit('error', 'Game is not in progress');
                return;
            }

            if (!gameState.powerUps[playerId] || gameState.powerUps[playerId][powerUpType] <= 0) {
                socket.emit('error', 'You do not have this power-up');
                return;
            }

            gameState.powerUps[playerId][powerUpType] -= 1;

            switch (powerUpType) {
                case 'reverse_turn':
                    gameState.turnOrder.reverse();

                    const currentIndex = gameState.turnOrder.indexOf(playerId);

                    const nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
                    gameState.currentTurn = gameState.turnOrder[nextIndex];

                    io.to(roomId).emit('game:turn_update', {
                        turnOrder: gameState.turnOrder,
                        currentTurn: gameState.currentTurn
                    });
                    break;

                case 'trap':
                    if (!targetPlayerId) {
                        socket.emit('error', 'Target player is required for this power-up');
                        return;
                    }

                    if (!gameState.trapEffects) {
                        gameState.trapEffects = {};
                    }

                    gameState.trapEffects[targetPlayerId] = true;

                    io.to(roomId).emit('game:power_up_used', {
                        type: powerUpType,
                        sourcePlayerId: playerId,
                        targetPlayerId,
                        powerUps: gameState.powerUps
                    });
                    break;

                case 'extra_wordpiece':
                    if (!targetPlayerId) {
                        socket.emit('error', 'Target player is required for this power-up');
                        return;
                    }

                    if (!gameState.extraWordpieceEffects) {
                        gameState.extraWordpieceEffects = {};
                    }

                    gameState.extraWordpieceEffects[targetPlayerId] = true;

                    io.to(roomId).emit('game:power_up_used', {
                        type: powerUpType,
                        sourcePlayerId: playerId,
                        targetPlayerId,
                        powerUps: gameState.powerUps
                    });
                    break;

                default:
                    socket.emit('error', 'Unknown power-up type');
                    return;
            }

            io.to(roomId).emit('game:power_up_used', {
                type: powerUpType,
                sourcePlayerId: playerId,
                targetPlayerId,
                powerUps: gameState.powerUps,
                turnOrder: gameState.turnOrder,
                currentTurn: gameState.currentTurn
            });
        } catch (error) {
            console.error('Error in game:use_power_up handler:', error);
            socket.emit('error', 'Failed to use power-up');
        }
    });

    /**
     * Handle definition request
     */
    socket.on('game:request_definition', async (data) => {
        try {
            const {roomId, word} = data;

            if (!roomId || !word) {
                socket.emit('error', 'Missing required fields');
                return;
            }

            const definition = await getDefinition(word);

            io.to(roomId).emit('game:definition', definition);
        } catch (error) {
            console.error('Error in game:request_definition handler:', error);
            socket.emit('error', 'Failed to get definition');
        }
    });
};

/**
 * Start the game timer
 */
function startGameTimer(io, roomId, gameState, rooms) {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    gameState.timerInterval = setInterval(() => {
        gameState.timer -= 1;

        io.to(roomId).emit('game:timer', gameState.timer);

        if (gameState.timer <= 0) {
            clearInterval(gameState.timerInterval);

            if (gameState.mode === 'single') {
                const playerId = Object.keys(gameState.lives)[0];
                gameState.lives[playerId] -= 1;

                io.to(roomId).emit('game:player_update', {
                    lives: gameState.lives,
                    scores: gameState.scores
                });

                if (gameState.lives[playerId] <= 0) {
                    endGame(io, roomId, gameState, rooms);
                    return;
                }

                generateNewWordpiece(io, roomId, gameState, rooms);
            } else {
                const currentPlayerId = gameState.currentTurn;

                if (currentPlayerId && gameState.lives[currentPlayerId] > 0) {
                    gameState.lives[currentPlayerId] -= 1;

                    io.to(roomId).emit('game:player_update', {
                        lives: gameState.lives,
                        scores: gameState.scores
                    });

                    if (gameState.lives[currentPlayerId] <= 0) {
                        gameState.turnOrder = gameState.turnOrder.filter(id => id !== currentPlayerId);

                        if (gameState.turnOrder.length <= 1) {
                            endGame(io, roomId, gameState, rooms);
                            return;
                        }
                    }
                }

                moveToNextTurn(io, roomId, gameState, rooms);
            }
        }
    }, 1000);
}

/**
 * Move to the next player's turn
 */
function moveToNextTurn(io, roomId, gameState, rooms) {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    const currentIndex = gameState.turnOrder.indexOf(gameState.currentTurn);

    const nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
    gameState.currentTurn = gameState.turnOrder[nextIndex];

    generateNewWordpiece(io, roomId, gameState, rooms);
}

/**
 * Generate a new wordpiece
 */
function generateNewWordpiece(io, roomId, gameState, rooms) {
    let newWordpiece = generateWordpiece();

    if (gameState.trapEffects && gameState.trapEffects[gameState.currentTurn]) {
        newWordpiece = generateHardWordpiece();

        delete gameState.trapEffects[gameState.currentTurn];
    }

    gameState.currentWordpiece = newWordpiece;

    gameState.timer = gameState.mode === 'wordmaster' ? 30 : 15;

    startGameTimer(io, roomId, gameState, rooms);

    io.to(roomId).emit('game:new_wordpiece', {
        wordpiece: gameState.currentWordpiece,
        timer: gameState.timer,
        currentTurn: gameState.currentTurn
    });
}

/**
 * End the game
 */
function endGame(io, roomId, gameState, rooms) {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    gameState.status = 'over';

    io.to(roomId).emit('game:over', {
        finalScores: gameState.scores,
        winner: gameState.turnOrder[0] || null
    });

    if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.status = 'waiting';
    }
}

/**
 * Generate a random wordpiece
 */
function generateWordpiece() {
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
}

/**
 * Generate a harder wordpiece
 */
function generateHardWordpiece() {
    const hardWordpieces = [
        'qu', 'z', 'x', 'j', 'v', 'ph', 'gh', 'rh',
        'kn', 'gn', 'ps', 'mn', 'pt', 'wr', 'mb', 'bt',
        'zz', 'ff', 'gg', 'pp', 'cc', 'dd', 'bb', 'mm',
        'nn', 'll', 'rr', 'tt', 'ss', 'ck', 'dg', 'ng',
        'ght', 'tch', 'dge', 'sch', 'scr', 'spl', 'spr', 'str',
        'thm', 'chm', 'chr', 'thr', 'shr', 'squ', 'scl'
    ];

    return hardWordpieces[Math.floor(Math.random() * hardWordpieces.length)];
}

export default setupGameHandlers;