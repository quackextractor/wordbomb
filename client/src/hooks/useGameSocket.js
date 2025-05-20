import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

/**
 * Custom hook for managing Socket.IO connection and game events
 * @param {Object} player - Player information (id, nickname, avatar)
 * @param {Object} gameSettings - Game settings (roomId, mode, isHost)
 * @returns {Object} Socket connection and game state management functions
 */
const useGameSocket = (player, gameSettings) => {
  // Socket reference to prevent recreation on re-renders
  const socketRef = useRef(null);
  
  // Game state
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentWordpiece, setCurrentWordpiece] = useState('');
  const [timer, setTimer] = useState(0);
  const [scores, setScores] = useState({});
  const [lives, setLives] = useState({});
  const [powerUps, setPowerUps] = useState({});
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentTurn, setCurrentTurn] = useState('');
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, over
  const [definition, setDefinition] = useState(null);
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    // Create socket connection if it doesn't exist
    if (!socketRef.current) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
      socketRef.current = io(socketUrl, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }

    // Connect to socket server
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }

    // Set up event listeners
    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      setError(null);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to game server');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      setConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socketRef.current.connect();
      }
    });

    socketRef.current.on('error', (errorMsg) => {
      console.error('Socket error:', errorMsg);
      setError(errorMsg);
    });

    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Join room when game settings change
  useEffect(() => {
    if (connected && gameSettings.roomId && player.nickname && !isJoining) {
      setIsJoining(true);
      joinRoom(gameSettings.roomId)
        .finally(() => setIsJoining(false));
    }
  }, [connected, gameSettings.roomId, player.nickname]);

  // Set up game event listeners
  useEffect(() => {
    if (!socketRef.current) return;

    // Room events
    socketRef.current.on('room:update', (roomData) => {
      console.log('Room update received:', roomData);
      setRoom(roomData);
      setPlayers(roomData.players || []);
      setTurnOrder(roomData.turnOrder || []);
    });

    // Game events
    socketRef.current.on('game:start', (gameData) => {
      console.log('Game start received:', gameData);
      setGameStatus('playing');
      setCurrentWordpiece(gameData.wordpiece);
      setTimer(gameData.timer);
      setScores(gameData.scores || {});
      setLives(gameData.lives || {});
      setPowerUps(gameData.powerUps || {});
      setTurnOrder(gameData.turnOrder || []);
      setCurrentTurn(gameData.currentTurn);
    });

    socketRef.current.on('game:new_wordpiece', (data) => {
      setCurrentWordpiece(data.wordpiece);
      setTimer(data.timer);
      setCurrentTurn(data.currentTurn);
    });

    socketRef.current.on('game:timer', (time) => {
      setTimer(time);
    });

    socketRef.current.on('game:submission_result', (result) => {
      setScores(result.scores);
      if (result.definition) {
        setDefinition(result.definition);
      }
    });

    socketRef.current.on('game:turn_update', (data) => {
      setCurrentTurn(data.currentTurn);
      setTurnOrder(data.turnOrder);
    });

    socketRef.current.on('game:power_up_used', (data) => {
      setPowerUps(data.powerUps);
      // Handle specific power-up effects
      if (data.type === 'reverse_turn') {
        setTurnOrder(data.turnOrder);
      }
    });

    socketRef.current.on('game:player_update', (data) => {
      setLives(data.lives);
      setScores(data.scores);
    });

    socketRef.current.on('game:over', (results) => {
      setGameStatus('over');
      setScores(results.finalScores);
    });

    socketRef.current.on('game:definition', (def) => {
      setDefinition(def);
    });

    // Clean up listeners on unmount
    return () => {
      socketRef.current.off('room:update');
      socketRef.current.off('game:start');
      socketRef.current.off('game:new_wordpiece');
      socketRef.current.off('game:timer');
      socketRef.current.off('game:submission_result');
      socketRef.current.off('game:turn_update');
      socketRef.current.off('game:power_up_used');
      socketRef.current.off('game:player_update');
      socketRef.current.off('game:over');
      socketRef.current.off('game:definition');
      socketRef.current.off('error');
    };
  }, []);

  // Function to create a new game room
  const createRoom = useCallback(async (mode) => {
    try {
      // Generate a random room ID (6 characters)
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      console.log(`Creating room ${roomId} with mode ${mode}`);
      
      // Join the room via socket
      socketRef.current.emit('room:join', {
        roomId,
        playerId: player.id,
        playerName: player.nickname,
        playerAvatar: player.avatar,
        playerColor: player.color,
        isHost: true
      });
      
      return roomId;
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err.message || 'Failed to create room');
      throw err;
    }
  }, [player]);

  // Function to join an existing game room
  const joinRoom = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Joining room ${roomId} as ${player.nickname} (${player.id})`);
        
        // Set up a one-time listener for room update to resolve the promise
        const onRoomUpdate = (roomData) => {
          socketRef.current.off('room:update', onRoomUpdate);
          resolve(roomData);
        };
        
        // Set up a one-time listener for errors
        const onError = (errorMsg) => {
          socketRef.current.off('error', onError);
          reject(new Error(errorMsg));
        };
        
        socketRef.current.once('room:update', onRoomUpdate);
        socketRef.current.once('error', onError);
        
        // Join the room
        socketRef.current.emit('room:join', {
          roomId,
          playerId: player.id,
          playerName: player.nickname,
          playerAvatar: player.avatar,
          playerColor: player.color,
          isHost: gameSettings.isHost
        });
        
        // Set a timeout to reject the promise if no response is received
        setTimeout(() => {
          socketRef.current.off('room:update', onRoomUpdate);
          socketRef.current.off('error', onError);
          reject(new Error('Timeout joining room'));
        }, 5000);
      } catch (error) {
        reject(error);
      }
    });
  }, [player, gameSettings.isHost]);

  // Function to start the game
  const startGame = useCallback(() => {
    if (!gameSettings.roomId) return;
    
    console.log(`Starting game in room ${gameSettings.roomId} with mode ${gameSettings.mode}`);
    
    socketRef.current.emit('game:start', {
      roomId: gameSettings.roomId,
      mode: gameSettings.mode
    });
  }, [gameSettings]);

  // Function to submit a word
  const submitWord = useCallback((word) => {
    socketRef.current.emit('game:submit', {
      roomId: gameSettings.roomId,
      playerId: player.id,
      word,
      wordpiece: currentWordpiece
    });
  }, [gameSettings.roomId, player.id, currentWordpiece]);

  // Function to use a power-up
  const usePowerUp = useCallback((powerUpType, targetPlayerId) => {
    socketRef.current.emit('game:use_power_up', {
      roomId: gameSettings.roomId,
      playerId: player.id,
      powerUpType,
      targetPlayerId
    });
  }, [gameSettings.roomId, player.id]);

  // Function to request a word definition
  const requestDefinition = useCallback((word) => {
    socketRef.current.emit('game:request_definition', {
      roomId: gameSettings.roomId,
      word
    });
  }, [gameSettings.roomId]);

  // Function to leave the room
  const leaveRoom = useCallback(() => {
    if (gameSettings.roomId) {
      socketRef.current.emit('room:leave', {
        roomId: gameSettings.roomId,
        playerId: player.id
      });
    }
  }, [gameSettings.roomId, player.id]);

  return {
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
    leaveRoom,
    socket: socketRef.current
  };
};

export default useGameSocket;