// GameManager class
import Player from './Player';
import TurnManager from './TurnManager';

export default class GameManager {
    constructor(players = []) {
        this.allPlayers = players;
        this.playingPlayers = [...players];
        this.roundManager = null; // Placeholder for future round logic
        this.turnManager = new TurnManager();
    }

    startGame() {
        // Initialize or reset game state
        this.playingPlayers = [...this.allPlayers];
        this.turnManager.turnNumber = 1;
        this.turnManager.updateMaxTurnTime();
    }

    endGame() {
        // Handle end game logic
        this.playingPlayers = [];
    }

    checkGameOver() {
        // Remove players who are not playing
        this.playingPlayers = this.playingPlayers.filter(player => player.isPlaying);
        return this.playingPlayers.length <= 1;
    }

    handlePlayerInput(word, usedWordsSet) {
        // Validate input, check used words, award score, call turnManager.endTurn
        // (actual implementation should be in integration with UI logic)
    }

    getCurrentPlayer() {
        return this.turnManager.currentPlayerId
            ? this.playingPlayers.find(p => p.id === this.turnManager.currentPlayerId)
            : null;
    }

    changePlayerHp(amount, playerId) {
        const player = this.playingPlayers.find(p => p.id === playerId);
        if (player) player.changeHp(amount);
    }
}
