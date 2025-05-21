// TurnManager class
// import WordPiece, { Difficulty } from './WordPiece'; // WordPiece is managed by LocalGameEngine/GameManager

export default class TurnManager {
    constructor(playerIds = [], baseTurnTime = 15) {
        this.playerIds = [...playerIds]; // Store the order of player IDs
        this.baseTurnTime = baseTurnTime;
        this.maxTurnTime = baseTurnTime;
        this.currentTurnTime = baseTurnTime;
        // this.currentWordPiece = null; // Managed by LocalGameEngine/GameManager
        this.currentPlayerId = null;
        this.turnNumber = 0; // Start at 0, first turn will be 1
        this.currentPlayerIndex = -1; // To track current player in playerIds
    }

    setPlayers(playerIds) {
        this.playerIds = [...playerIds];
        this.turnNumber = 0;
        this.currentPlayerIndex = -1;
        this.currentPlayerId = null;
    }

    updateMaxTurnTime() {
        // Example: decrease max turn time every 5 turns, minimum 5 seconds
        this.maxTurnTime = Math.max(5, this.baseTurnTime - Math.floor(this.turnNumber / 5));
    }

    startTurn(playerId) {
        this.currentPlayerId = playerId;
        const playerIndex = this.playerIds.indexOf(playerId);
        if (playerIndex !== -1) {
            this.currentPlayerIndex = playerIndex;
        }
        // this.currentWordPiece = wordPiece; // Wordpiece is handled by the engine
        this.currentTurnTime = this.maxTurnTime; // Reset timer to current maxTurnTime
        if (this.turnNumber === 0 || this.playerIds[this.currentPlayerIndex] === this.playerIds[0]) {
            // Increment turn number only when a full cycle of players is about to begin or on the very first turn
            this.turnNumber++; 
        }
        this.updateMaxTurnTime(); // Update maxTurnTime based on the new turnNumber
    }

    nextTurn() {
        if (!this.playerIds.length) return null;
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerIds.length;
        this.currentPlayerId = this.playerIds[this.currentPlayerIndex];
        // Logic for when a full round of turns completes and turnNumber should increment
        if (this.currentPlayerIndex === 0) { // Back to the first player
            this.turnNumber++;
            this.updateMaxTurnTime();
        }
        this.startTurn(this.currentPlayerId); // Start the turn for the new player
        return this.currentPlayerId;
    }

    reverseTurnOrder() {
        if (this.playerIds.length < 2) return; // No change if less than 2 players
        this.playerIds.reverse();
        // Update currentPlayerIndex to maintain the current player if possible,
        // or set to the new player at the same "reversed" position.
        if (this.currentPlayerId) {
            const newIndex = this.playerIds.indexOf(this.currentPlayerId);
            if (newIndex !== -1) {
                this.currentPlayerIndex = newIndex;
            } else {
                // If current player was removed or something unexpected, default to first player
                this.currentPlayerIndex = 0;
                this.currentPlayerId = this.playerIds[0];
            }
        }
    }

    // endTurn and updateTimer are effectively handled by LocalGameEngine's timeout and submission logic
}
