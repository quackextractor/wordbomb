import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import WordInput from './WordInput';
import InfoModal from './InfoModal';
import useGameSocket from '../hooks/useGameSocket';
import { setDefinition } from '../utils/definitionUtils'; // Import setDefinition
import '../assets/css/GameBoard.css';

/**
 * Main game board component that handles game state and rendering
 */
function GameBoard({ player, gameSettings: initialGameSettings }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Merge initial game settings with any passed via location state
  const [gameSettings, setGameSettings] = useState(() => {
    const locationState = location.state || {};
    return {
      ...initialGameSettings,
      ...locationState
    };
  });
  
  const [showDefinition, setShowDefinition] = useState(false);
  const [lastSubmittedWord, setLastSubmittedWord] = useState('');
  
  // Local game state for single player and local multiplayer
  const [localGameState, setLocalGameState] = useState(null);
  const [localPlayers, setLocalPlayers] = useState([]);
  const timerRef = useRef(null);
  
  // Initialize game socket connection for online modes
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

  // Initialize local game for single player or local multiplayer
  useEffect(() => {
    if (gameSettings.mode === 'single' || gameSettings.mode === 'local') {
      initializeLocalGame();
    }
  }, [gameSettings.mode]);

  // Initialize local game state
  const initializeLocalGame = () => {
    // Create local players array
    const gamePlayers = [
      {
        id: player.id,
        name: player.nickname,
        avatar: player.avatar,
        color: player.color,
        isHost: true
      }
    ];
    
    // For local multiplayer, add a second player
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
    
    // Initialize game state
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
    
    // Initialize scores and lives
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
  
  // Start local game timer
  const startLocalTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setLocalGameState(prev => {
        if (!prev) return null;
        
        const newTimer = prev.timer - 1;
        
        // If timer reaches 0, handle time up
        if (newTimer <= 0) {
          clearInterval(timerRef.current);
          
          // Current player loses a life
          const currentPlayerId = prev.currentTurn;
          const newLives = { ...prev.lives };
          newLives[currentPlayerId] = newLives[currentPlayerId] - 1;
          
          // Check if game is over
          if (newLives[currentPlayerId] <= 0) {
            if (gameSettings.mode === 'single' || 
                Object.values(newLives).filter(life => life > 0).length <= 1) {
              // Game over
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
            
            // Remove player from turn order
            const newTurnOrder = prev.turnOrder.filter(id => id !== currentPlayerId);
            
            // Move to next player
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
          
          // Move to next player for local multiplayer
          let nextPlayerId = currentPlayerId;
          if (gameSettings.mode === 'local') {
            const currentIndex = prev.turnOrder.indexOf(currentPlayerId);
            const nextIndex = (currentIndex + 1) % prev.turnOrder.length;
            nextPlayerId = prev.turnOrder[nextIndex];
          }
          
          // Start new timer
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
  
  // Generate a random wordpiece for local games
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

  // Create or join room on component mount for online modes
  useEffect(() => {
    if (gameSettings.mode !== 'single' && gameSettings.mode !== 'local') {
      const initializeGame = async () => {
        try {
          if (gameSettings.isHost && !gameSettings.roomId) {
            // Create a new room if host and no room ID
            const roomId = await createRoom(gameSettings.mode);
            setGameSettings(prev => ({ ...prev, roomId }));
          } else if (gameSettings.roomId) {
            // Join existing room
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
    
    // Clean up on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (gameSettings.mode !== 'single' && gameSettings.mode !== 'local') {
        leaveRoom();
      }
    };
  }, [connected, gameSettings.isHost, gameSettings.roomId, gameSettings.mode]);

  // Start game automatically for online multiplayer
  useEffect(() => {
    if (gameSettings.isHost && gameSettings.mode === 'online' && room) {
      startGame();
    }
  }, [gameSettings.isHost, gameSettings.mode, room]);

  // Navigate to game over screen when game ends
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

  // Handle word submission
  const handleSubmitWord = (word) => {
    if (gameSettings.mode === 'single' || gameSettings.mode === 'local') {
      handleLocalSubmitWord(word);
    } else {
      submitWord(word);
    }
    setLastSubmittedWord(word);
  };
  
  // Handle local word submission
  const handleLocalSubmitWord = (word) => {
    if (!localGameState) return;
    
    const { currentWordpiece, currentTurn, usedWords } = localGameState;
    
    // Basic validation
    if (!word.toLowerCase().includes(currentWordpiece.toLowerCase())) {
      // Invalid word - doesn't contain wordpiece
      return;
    }
    
    if (usedWords.has(word.toLowerCase())) {
      // Word already used
      return;
    }
    
    // In a real implementation, we would validate against a dictionary
    // For now, we'll assume all words are valid if they contain the wordpiece
    
    // Update game state
    setLocalGameState(prev => {
      // Add word to used words
      const newUsedWords = new Set(prev.usedWords);
      newUsedWords.add(word.toLowerCase());
      
      // Calculate score based on word length
      const score = Math.max(1, word.length - currentWordpiece.length + 1);
      
      // Update player score
      const newScores = { ...prev.scores };
      newScores[currentTurn] = newScores[currentTurn] + score;
      
      // Check if word is long enough for a power-up (25% chance for words longer than 7 chars)
      const newPowerUps = { ...prev.powerUps };
      if (word.length > 7 && Math.random() < 0.25) {
        // Award a random power-up
        const powerUpTypes = ['reverse_turn', 'trap', 'extra_wordpiece'];
        const randomPowerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        newPowerUps[currentTurn] = {
          ...newPowerUps[currentTurn],
          [randomPowerUp]: (newPowerUps[currentTurn][randomPowerUp] || 0) + 1
        };
      }
      
      // For local multiplayer, move to next player's turn
      let nextPlayerId = currentTurn;
      if (gameSettings.mode === 'local') {
        const currentIndex = prev.turnOrder.indexOf(currentTurn);
        const nextIndex = (currentIndex + 1) % prev.turnOrder.length;
        nextPlayerId = prev.turnOrder[nextIndex];
      }
      
      // Clear existing timer and start a new one
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
    
    // Fetch definition (in a real implementation)
    // For now, just set a mock definition
    setTimeout(() => {
      setDefinition({
        'n': [`A ${word} is a type of word`],
        'v': [`To ${word} means to use this word`]
      });
    }, 300);
  };

  // Handle definition request
  const handleRequestDefinition = (word) => {
    if (gameSettings.mode === 'single' || gameSettings.mode === 'local') {
      // Mock definition for local games
      setDefinition({
        'n': [`A ${word} is a type of word`],
        'v': [`To ${word} means to use this word`]
      });
      setShowDefinition(true);
    } else {
      requestDefinition(word);
      setShowDefinition(true);
    }
  };

  // Close definition modal
  const handleCloseDefinition = () => {
    setShowDefinition(false);
  };

  // Handle power-up usage
  const handleUsePowerUp = (type, targetId) => {
    if (gameSettings.mode === 'single' || gameSettings.mode === 'local') {
      handleLocalUsePowerUp(type, targetId);
    } else {
      // For online modes, use the socket handler
      if (['trap', 'extra_wordpiece'].includes(type)) {
        // Simple implementation - just pick the first other player
        const otherPlayer = players.find(p => p.id !== player.id);
        if (otherPlayer) {
          usePowerUp(type, otherPlayer.id);
        }
      } else {
        usePowerUp(type);
      }
    }
  };
  
  // Handle local power-up usage
  const handleLocalUsePowerUp = (type, targetId) => {
    if (!localGameState) return;
    
    setLocalGameState(prev => {
      // Reduce power-up count
      const newPowerUps = { ...prev.powerUps };
      const currentPlayerId = prev.currentTurn;
      
      if (!newPowerUps[currentPlayerId][type] || newPowerUps[currentPlayerId][type] <= 0) {
        return prev; // No power-up available
      }
      
      newPowerUps[currentPlayerId] = {
        ...newPowerUps[currentPlayerId],
        [type]: newPowerUps[currentPlayerId][type] - 1
      };
      
      // Apply power-up effect
      let newTurnOrder = [...prev.turnOrder];
      let newCurrentTurn = prev.currentTurn;
      
      if (type === 'reverse_turn' && gameSettings.mode === 'local') {
        // Reverse turn order
        newTurnOrder.reverse();
        
        // Find the index of the current player in the new order
        const currentIndex = newTurnOrder.indexOf(currentPlayerId);
        
        // Set the next player's turn (skip the current player)
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

  // Determine which game state to use based on mode
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

  // Render loading state
  if (!connected && !isLocalMode) {
    return (
      <div className="game-loading">
        <h2>Connecting to game server...</h2>
        {error && <p className="error-message">{error}</p>}
      </div>
    );
  }

  // Render waiting for players state for online mode
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

  // Wait for local game state to initialize
  if (isLocalMode && !localGameState) {
    return (
      <div className="game-loading">
        <h2>Initializing game...</h2>
      </div>
    );
  }

  // Determine if it's the current player's turn
  const isPlayerTurn = activeGameState?.currentTurn === player.id;
  
  // Get player score and lives
  const playerScore = activeGameState?.scores[player.id] || 0;
  const playerLives = activeGameState?.lives[player.id] || 3;
  
  // Get player power-ups
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
            {Array.from({ length: playerLives }).map((_, i) => (
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
                <img src={p.avatar || "/placeholder.svg"} alt={p.name} className="player-avatar" />
              ) : (
                <div 
                  className="player-avatar-placeholder"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="player-details">
                <span className="player-name">{p.name}</span>
                <span className="player-score">Score: {activeGameState?.scores[p.id] || 0}</span>
                <div className="player-lives">
                  {Array.from({ length: activeGameState?.lives[p.id] || 3 }).map((_, i) => (
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