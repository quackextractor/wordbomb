import { validateWord, getDefinition } from '../validation/validate.js';

/**
 * Socket.IO handlers for game functionality
 */
const setupGameHandlers = (io, socket, rooms, games) => {
  /**
   * Start a new game
   */
  socket.on('game:start', async (data) => {
    try {
      const { roomId, mode } = data;
      
      // Validate required data
      if (!roomId || !mode) {
        socket.emit('error', 'Missing required fields');
        return;
      }
      
      // Check if room exists
      if (!rooms.has(roomId)) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      const room = rooms.get(roomId);
      
      // Check if socket is the host
      if (room.hostId !== socket.id) {
        socket.emit('error', 'Only the host can start the game');
        return;
      }
      
      // Update room mode and status
      room.mode = mode;
      room.status = 'playing';
      
      // Initialize game state
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
      
      // Initialize scores, lives, and power-ups for all players
      room.players.forEach(player => {
        gameState.scores[player.id] = 0;
        gameState.lives[player.id] = 3;
        gameState.powerUps[player.id] = {
          reverse_turn: 0,
          trap: 0,
          extra_wordpiece: 0
        };
      });
      
      // Store game state
      games.set(roomId, gameState);
      
      // Start game timer
      startGameTimer(io, roomId, gameState, rooms);
      
      // Broadcast game start to all players
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
      const { roomId, playerId, word, wordpiece } = data;
      
      // Validate required data
      if (!roomId || !playerId || !word || !wordpiece) {
        socket.emit('error', 'Missing required fields');
        return;
      }
      
      // Check if game exists
      if (!games.has(roomId)) {
        socket.emit('error', 'Game not found');
        return;
      }
      
      const gameState = games.get(roomId);
      const room = rooms.get(roomId);
      
      // Check if game is in progress
      if (gameState.status !== 'playing') {
        socket.emit('error', 'Game is not in progress');
        return;
      }
      
      // For turn-based modes, check if it's the player's turn
      if (gameState.mode !== 'single' && gameState.currentTurn !== playerId) {
        socket.emit('error', 'Not your turn');
        return;
      }
      
      // Check if the word contains the current wordpiece
      if (!word.toLowerCase().includes(wordpiece.toLowerCase())) {
        socket.emit('error', `Word must contain "${wordpiece}"`);
        return;
      }
      
      // Check if the word has been used before
      if (gameState.usedWords.has(word.toLowerCase())) {
        socket.emit('error', 'Word has already been used');
        return;
      }
      
      // Validate the word
      const validationResult = await validateWord(word, wordpiece);
      
      if (validationResult.valid) {
        // Add word to used words
        gameState.usedWords.add(word.toLowerCase());
        
        // Calculate score based on word length
        const score = Math.max(1, word.length - wordpiece.length + 1);
        
        // Update player score
        gameState.scores[playerId] += score;
        
        // Check if word is long enough for a power-up (25% chance for words longer than 7 chars)
        if (word.length > 7 && Math.random() < 0.25) {
          // Award a random power-up
          const powerUps = ['reverse_turn', 'trap', 'extra_wordpiece'];
          const randomPowerUp = powerUps[Math.floor(Math.random() * powerUps.length)];
          
          gameState.powerUps[playerId][randomPowerUp] += 1;
          
          // Notify player of power-up
          socket.emit('game:power_up_awarded', {
            type: randomPowerUp
          });
        }
        
        // Get definition for the word
        const definition = await getDefinition(word);
        
        // Broadcast submission result
        io.to(roomId).emit('game:submission_result', {
          playerId,
          word,
          valid: true,
          scores: gameState.scores,
          definition
        });
        
        // For turn-based modes, move to next player's turn
        if (gameState.mode !== 'single') {
          moveToNextTurn(io, roomId, gameState, rooms);
        } else {
          // For single player, generate a new wordpiece
          generateNewWordpiece(io, roomId, gameState, rooms);
        }
      } else {
        // Invalid word
        socket.emit('error', validationResult.message || 'Invalid word');
        
        // For turn-based modes, player loses a life and move to next turn
        if (gameState.mode !== 'single') {
          // Reduce player's lives
          gameState.lives[playerId] -= 1;
          
          // Check if player is eliminated
          if (gameState.lives[playerId] <= 0) {
            // Remove player from turn order
            gameState.turnOrder = gameState.turnOrder.filter(id => id !== playerId);
            
            // Check if game is over (only one player left)
            if (gameState.turnOrder.length <= 1) {
              endGame(io, roomId, gameState, rooms);
              return;
            }
          }
          
          // Update all players with new lives count
          io.to(roomId).emit('game:player_update', {
            lives: gameState.lives,
            scores: gameState.scores
          });
          
          // Move to next turn
          moveToNextTurn(io, roomId, gameState, rooms);
        } else {
          // For single player, reduce life and check if game over
          gameState.lives[playerId] -= 1;
          
          // Update player with new lives count
          io.to(roomId).emit('game:player_update', {
            lives: gameState.lives,
            scores: gameState.scores
          });
          
          // Check if game is over (no lives left)
          if (gameState.lives[playerId] <= 0) {
            endGame(io, roomId, gameState, rooms);
            return;
          }
          
          // Generate a new wordpiece
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
      const { roomId, playerId, powerUpType, targetPlayerId } = data;
      
      // Validate required data
      if (!roomId || !playerId || !powerUpType) {
        socket.emit('error', 'Missing required fields');
        return;
      }
      
      // Check if game exists
      if (!games.has(roomId)) {
        socket.emit('error', 'Game not found');
        return;
      }
      
      const gameState = games.get(roomId);
      
      // Check if game is in progress
      if (gameState.status !== 'playing') {
        socket.emit('error', 'Game is not in progress');
        return;
      }
      
      // Check if player has the power-up
      if (!gameState.powerUps[playerId] || gameState.powerUps[playerId][powerUpType] <= 0) {
        socket.emit('error', 'You do not have this power-up');
        return;
      }
      
      // Use the power-up
      gameState.powerUps[playerId][powerUpType] -= 1;
      
      // Apply power-up effect
      switch (powerUpType) {
        case 'reverse_turn':
          // Reverse turn order
          gameState.turnOrder.reverse();
          
          // Find the index of the current player in the new order
          const currentIndex = gameState.turnOrder.indexOf(playerId);
          
          // Set the next player's turn (skip the current player)
          const nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
          gameState.currentTurn = gameState.turnOrder[nextIndex];
          
          // Broadcast turn order update
          io.to(roomId).emit('game:turn_update', {
            turnOrder: gameState.turnOrder,
            currentTurn: gameState.currentTurn
          });
          break;
          
        case 'trap':
          // Require target player to solve a harder wordpiece
          if (!targetPlayerId) {
            socket.emit('error', 'Target player is required for this power-up');
            return;
          }
          
          // Store the trap effect for the next turn of the target player
          if (!gameState.trapEffects) {
            gameState.trapEffects = {};
          }
          
          gameState.trapEffects[targetPlayerId] = true;
          
          // Notify all players
          io.to(roomId).emit('game:power_up_used', {
            type: powerUpType,
            sourcePlayerId: playerId,
            targetPlayerId,
            powerUps: gameState.powerUps
          });
          break;
          
        case 'extra_wordpiece':
          // Target player must solve an additional wordpiece
          if (!targetPlayerId) {
            socket.emit('error', 'Target player is required for this power-up');
            return;
          }
          
          // Store the extra wordpiece effect for the next turn of the target player
          if (!gameState.extraWordpieceEffects) {
            gameState.extraWordpieceEffects = {};
          }
          
          gameState.extraWordpieceEffects[targetPlayerId] = true;
          
          // Notify all players
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
      
      // Broadcast updated power-ups
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
      const { roomId, word } = data;
      
      // Validate required data
      if (!roomId || !word) {
        socket.emit('error', 'Missing required fields');
        return;
      }
      
      // Get definition for the word
      const definition = await getDefinition(word);
      
      // Broadcast definition to all players in the room
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
  // Clear any existing timer
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  // Set up timer interval
  gameState.timerInterval = setInterval(() => {
    // Decrement timer
    gameState.timer -= 1;
    
    // Broadcast timer update
    io.to(roomId).emit('game:timer', gameState.timer);
    
    // Check if time is up
    if (gameState.timer <= 0) {
      // Clear timer
      clearInterval(gameState.timerInterval);
      
      // Handle time up based on game mode
      if (gameState.mode === 'single') {
        // In single player, player loses a life
        const playerId = Object.keys(gameState.lives)[0];
        gameState.lives[playerId] -= 1;
        
        // Update player with new lives count
        io.to(roomId).emit('game:player_update', {
          lives: gameState.lives,
          scores: gameState.scores
        });
        
        // Check if game is over (no lives left)
        if (gameState.lives[playerId] <= 0) {
          endGame(io, roomId, gameState, rooms);
          return;
        }
        
        // Generate a new wordpiece
        generateNewWordpiece(io, roomId, gameState, rooms);
      } else {
        // In multiplayer modes, current player loses a life
        const currentPlayerId = gameState.currentTurn;
        
        if (currentPlayerId && gameState.lives[currentPlayerId] > 0) {
          gameState.lives[currentPlayerId] -= 1;
          
          // Update all players with new lives count
          io.to(roomId).emit('game:player_update', {
            lives: gameState.lives,
            scores: gameState.scores
          });
          
          // Check if player is eliminated
          if (gameState.lives[currentPlayerId] <= 0) {
            // Remove player from turn order
            gameState.turnOrder = gameState.turnOrder.filter(id => id !== currentPlayerId);
            
            // Check if game is over (only one player left)
            if (gameState.turnOrder.length <= 1) {
              endGame(io, roomId, gameState, rooms);
              return;
            }
          }
        }
        
        // Move to next turn
        moveToNextTurn(io, roomId, gameState, rooms);
      }
    }
  }, 1000);
}

/**
 * Move to the next player's turn
 */
function moveToNextTurn(io, roomId, gameState, rooms) {
  // Clear any existing timer
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  // Find the index of the current player
  const currentIndex = gameState.turnOrder.indexOf(gameState.currentTurn);
  
  // Set the next player's turn
  const nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
  gameState.currentTurn = gameState.turnOrder[nextIndex];
  
  // Generate a new wordpiece
  generateNewWordpiece(io, roomId, gameState, rooms);
}

/**
 * Generate a new wordpiece
 */
function generateNewWordpiece(io, roomId, gameState, rooms) {
  // Generate a new wordpiece
  let newWordpiece = generateWordpiece();
  
  // Check if the current player has a trap effect
  if (gameState.trapEffects && gameState.trapEffects[gameState.currentTurn]) {
    // Generate a harder wordpiece (longer or with uncommon letters)
    newWordpiece = generateHardWordpiece();
    
    // Remove the trap effect
    delete gameState.trapEffects[gameState.currentTurn];
  }
  
  // Set the new wordpiece
  gameState.currentWordpiece = newWordpiece;
  
  // Reset the timer
  gameState.timer = gameState.mode === 'wordmaster' ? 30 : 15;
  
  // Start the timer
  startGameTimer(io, roomId, gameState, rooms);
  
  // Broadcast new wordpiece
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
  // Clear any existing timer
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  // Set game status to over
  gameState.status = 'over';
  
  // Broadcast game over
  io.to(roomId).emit('game:over', {
    finalScores: gameState.scores,
    winner: gameState.turnOrder[0] || null
  });
  
  // Update room status
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    room.status = 'waiting';
  }
}

/**
 * Generate a random wordpiece
 */
function generateWordpiece() {
  // Common wordpieces that are part of many English words
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
  
  // Select a random wordpiece
  return commonWordpieces[Math.floor(Math.random() * commonWordpieces.length)];
}

/**
 * Generate a harder wordpiece
 */
function generateHardWordpiece() {
  // Harder wordpieces with uncommon letters or combinations
  const hardWordpieces = [
    'qu', 'z', 'x', 'j', 'v', 'ph', 'gh', 'rh',
    'kn', 'gn', 'ps', 'mn', 'pt', 'wr', 'mb', 'bt',
    'zz', 'ff', 'gg', 'pp', 'cc', 'dd', 'bb', 'mm',
    'nn', 'll', 'rr', 'tt', 'ss', 'ck', 'dg', 'ng',
    'ght', 'tch', 'dge', 'sch', 'scr', 'spl', 'spr', 'str',
    'thm', 'chm', 'chr', 'thr', 'shr', 'squ', 'scl'
  ];
  
  // Select a random hard wordpiece
  return hardWordpieces[Math.floor(Math.random() * hardWordpieces.length)];
}

export default setupGameHandlers;