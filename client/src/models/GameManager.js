// GameManager class
import Player from './Player';
import TurnManager from './TurnManager';

export default class GameManager {
    constructor(players = []) {
        this.allPlayers = players.map(p => new Player(p)); // Ensure Player objects
        this.playingPlayers = [...this.allPlayers];
        this.roundManager = null; // Placeholder for future round logic
        // Initialize TurnManager with player IDs from allPlayers
        this.turnManager = new TurnManager(this.allPlayers.map(p => p.id));
        this.isGameOver = false;
    }

    startGame() {
        this.playingPlayers = this.allPlayers.filter(p => p.isPlaying); // Start with only active players
        this.turnManager.setPlayers(this.playingPlayers.map(p => p.id)); // Set players for turn manager
        this.isGameOver = false;
        
        if (this.playingPlayers.length > 0) {
            // Start the first turn with the first player in the playing list
            this.turnManager.startTurn(this.playingPlayers[0].id);
        }
    }

    endGame() {
        this.isGameOver = true;
        // Further cleanup if needed
    }

    checkGameOver() {
        // Update the list of players who are still actively playing
        this.playingPlayers = this.allPlayers.filter(player => player.isPlaying && this.playingPlayers.some(p => p.id === player.id));

        // Check for game over condition
        if (this.allPlayers.length === 1) { // Single-player mode detection
            if (this.playingPlayers.length === 0) { // Game over if the single player is out
                this.isGameOver = true;
                return true;
            }
        } else { // Multiplayer mode
            if (this.playingPlayers.length <= 1) { // Game over if one or zero players remain
                this.isGameOver = true;
                return true;
            }
        }

        this.isGameOver = false;
        return false;
    }

    // handlePlayerInput is effectively managed by LocalGameEngine.submitWord

    getCurrentPlayer() {
        if (!this.turnManager.currentPlayerId) return null;
        return this.playingPlayers.find(p => p.id === this.turnManager.currentPlayerId);
    }

    changePlayerHp(amount, playerId) {
        const player = this.allPlayers.find(p => p.id === playerId);
        if (player) {
            player.changeHp(amount);
            if (!player.isPlaying) {
                // Update playingPlayers list if a player is eliminated
                this.playingPlayers = this.playingPlayers.filter(p => p.id !== playerId);
                // If the current player is eliminated, advance the turn
                if (this.turnManager.currentPlayerId === playerId) {
                    if (!this.checkGameOver()) { // only advance if game not over
                        this.turnManager.nextTurn();
                    }
                }
                 // Update TurnManager's list of playerIds
                this.turnManager.setPlayers(this.playingPlayers.map(p => p.id));
            }
        }
    }
}
