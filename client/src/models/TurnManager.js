// TurnManager class
import WordPiece, { Difficulty } from './WordPiece';

export default class TurnManager {
    constructor(baseTurnTime = 15) {
        this.baseTurnTime = baseTurnTime;
        this.maxTurnTime = baseTurnTime;
        this.currentTurnTime = baseTurnTime;
        this.currentWordPiece = null;
        this.currentPlayerId = null;
        this.turnNumber = 1;
    }

    updateMaxTurnTime() {
        // Example: decrease max turn time every 5 turns
        this.maxTurnTime = Math.max(5, this.baseTurnTime - Math.floor(this.turnNumber / 5));
    }

    startTurn(playerId, wordPiece) {
        this.currentPlayerId = playerId;
        this.currentWordPiece = wordPiece;
        this.currentTurnTime = this.maxTurnTime;
    }

    endTurn(didScore) {
        if (didScore) {
            // Choose a new word piece for next round
            // (actual word piece selection logic should be handled by GameManager)
        } else {
            // Keep old word piece, damage player, reset timer
            this.currentTurnTime = this.baseTurnTime;
        }
        this.turnNumber++;
        this.updateMaxTurnTime();
    }

    updateTimer() {
        this.currentTurnTime--;
        if (this.currentTurnTime <= 0) {
            this.endTurn(false);
        }
    }
}
