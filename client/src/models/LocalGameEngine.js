import { generateWordpiece } from '../utils/wordpieceUtils';
import GameManager from './GameManager';
import Player from './Player';
import PowerUp from './PowerUp'; // Assuming PowerUp is handled within Player or GameManager
import TurnManager from './TurnManager'; // Assuming TurnManager is part of GameManager

export default class LocalGameEngine {
    constructor(playerInfo, gameSettings, onStateUpdate, onGameOver) {
        this.playerInfo = playerInfo;
        this.gameSettings = gameSettings;
        this.onStateUpdate = onStateUpdate; // Callback to update React state
        this.onGameOver = onGameOver; // Callback for game over navigation
        this.gameManager = null;
        this.timerInterval = null;
        this.usedWords = new Set();
        this.currentWordpiece = null;
        this.maxTurnTime = gameSettings.turnTime || 15; // Default to 15 seconds
    }

    initializeGame() {
        const gamePlayers = [
            new Player({
                id: this.playerInfo.id,
                name: this.playerInfo.nickname,
                avatar: this.playerInfo.avatar,
                color: this.playerInfo.color,
                isHost: true,
                hp: this.gameSettings.lives // Initialize HP from game settings
            })
        ];

        if (this.gameSettings.mode === 'local') {
            gamePlayers.push(new Player({
                id: 'player2',
                name: 'Player 2',
                avatar: null,
                color: '#a777e3',
                isHost: false,
                hp: this.gameSettings.lives // Initialize HP for player 2
            }));
        }

        this.gameManager = new GameManager(gamePlayers);
        this.gameManager.startGame();
        this.currentWordpiece = generateWordpiece();
        this.usedWords.clear();
        
        this._updateState();
        this.startTimer();
        
        // Return initial player list for the hook to set
        return gamePlayers;
    }

    _getCurrentPlayer() {
        if (!this.gameManager) return null; // Check GameManager instance
        return this.gameManager.getCurrentPlayer(); // Delegate to GameManager's method
    }
    
    _updateState(newState = {}) {
        const currentPlayer = this._getCurrentPlayer();
        // Use playerIds from TurnManager for turn order
        const turnOrder = this.gameManager.turnManager && this.gameManager.turnManager.playerIds
            ? [...this.gameManager.turnManager.playerIds]
            : [];
        const baseState = {
            status: this.gameManager.isGameOver ? 'over' : 'playing',
            currentWordpiece: this.currentWordpiece,
            timer: this.maxTurnTime, // Reset timer display on state update
            usedWords: new Set(this.usedWords), // Send a copy
            scores: Object.fromEntries(this.gameManager.allPlayers.map(p => [p.id, p.score])),
            lives: Object.fromEntries(this.gameManager.allPlayers.map(p => [p.id, p.hp])),
            powerUps: Object.fromEntries(this.gameManager.allPlayers.map(p => [p.id, {...p.powerUps}])),
            turnOrder,
            currentTurn: currentPlayer ? currentPlayer.id : null,
        };
        this.onStateUpdate({...baseState, ...newState});
    }

    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        let timeLeft = this.maxTurnTime;
        this.onStateUpdate({ timer: timeLeft }); // Initial timer display

        this.timerInterval = setInterval(() => {
            timeLeft--;
            this.onStateUpdate({ timer: timeLeft });

            if (timeLeft <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    handleTimeout() {
        this.stopTimer();
        const currentPlayer = this._getCurrentPlayer();
        if (!currentPlayer) return;

        this.gameManager.changePlayerHp(-1, currentPlayer.id);
        
        if (this.gameManager.checkGameOver()) {
            this._updateState({ status: 'over' });
            this.onGameOver(Object.fromEntries(this.gameManager.allPlayers.map(p => [p.id, p.score])));
            return;
        }

        // In single-player, if HP is lost, it's still the same player's turn with a new word.
        // The HP bug fix: In single player, don't advance turn on timeout, just reset word & timer.
        if (this.gameSettings.mode === 'single' && this.gameManager.playingPlayers.length === 1) {
             this.currentWordpiece = generateWordpiece();
        } else {
            // Advance turn for local multiplayer
            this.gameManager.turnManager.nextTurn();
            this.currentWordpiece = generateWordpiece(); // New word for next player
        }
        
        this.usedWords.clear(); // Clear used words for the new turn/wordpiece
        this._updateState();
        this.startTimer(); // Restart timer for the current/next player
    }

    submitWord(word) {
        const currentPlayer = this._getCurrentPlayer();
        if (!currentPlayer || !this.currentWordpiece) return false;

        const wordLower = word.toLowerCase();
        const wordpieceLower = this.currentWordpiece.toLowerCase();

        if (!wordLower.includes(wordpieceLower)) {
            // Invalid: word doesn't contain wordpiece
            return false; 
        }
        if (this.usedWords.has(wordLower)) {
            // Invalid: word already used this turn
            return false; 
        }

        this.stopTimer();
        this.usedWords.add(wordLower);

        // Award score
        const score = Math.max(1, word.length - this.currentWordpiece.length + 1);
        currentPlayer.changeScore(score);

        // PowerUp chance
        if (word.length > 7 && Math.random() < 0.25) {
            const types = ['reverse_turn', 'trap', 'extra_wordpiece']; // Example types
            const type = types[Math.floor(Math.random() * types.length)];
            currentPlayer.addPowerUp(type, 1); // Assuming addPowerUp method in Player
        }
        
        // Check game over (e.g. if score target reached, though not in original logic)
        if (this.gameManager.checkGameOver()) { // Though typically game over is by HP
            this._updateState({ status: 'over' });
            this.onGameOver(Object.fromEntries(this.gameManager.allPlayers.map(p => [p.id, p.score])));
            return true;
        }

        // Advance turn
        if (this.gameSettings.mode === 'local' || this.gameManager.playingPlayers.length > 1) {
            this.gameManager.turnManager.nextTurn();
        }
        // For single player, it remains their turn, but they get a new word.
        
        this.currentWordpiece = generateWordpiece();
        this.usedWords.clear(); // Clear used words for the new turn
        this._updateState();
        this.startTimer();
        return true;
    }

    usePowerUp(type, targetId) {
        const currentPlayer = this._getCurrentPlayer();
        if (!currentPlayer || !currentPlayer.usePowerUp(type)) { // usePowerUp should return true if successful
            this._updateState(); // Update to reflect power-up count change even if effect fails
            return false;
        }

        let turnOrderChanged = false;
        if (type === 'reverse_turn' && this.gameSettings.mode === 'local') {
            this.gameManager.turnManager.reverseTurnOrder();
            turnOrderChanged = true;
        }
        // Add other power-up effects here, e.g., affecting targetId
        // if (type === 'trap' && targetId) { ... }

        this._updateState(); // Update UI with new powerUp counts and potentially turn order
        
        // If turn order was reversed, the current player might change immediately
        // The timer should continue for the (potentially new) current player
        if (turnOrderChanged) {
            this.stopTimer();
            this.startTimer();
        }
        return true;
    }

    cleanup() {
        this.stopTimer();
        // Any other cleanup logic
    }

    
}
