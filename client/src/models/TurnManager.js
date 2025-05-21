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
        this.turnNumber = 0; // Start at 0, GameManager.startGame will set to 1
        this.currentPlayerIndex = -1; // To track current player in playerIds
    }

    setPlayers(playerIds) {
        this.playerIds = [...playerIds];
        this.turnNumber = 0; // GameManager.startGame will set to 1 before first turn
        this.currentPlayerIndex = -1;
        this.currentPlayerId = null;
        this.maxTurnTime = this.baseTurnTime; // Reset maxTurnTime
        this.currentTurnTime = this.baseTurnTime; // Reset currentTurnTime
    }

    updateMaxTurnTime() {
        // Example: decrease max turn time every 5 turns, minimum 5 seconds
        const effectiveTurnNumber = Math.max(1, this.turnNumber); // Ensure turnNumber is at least 1 for calculation
        this.maxTurnTime = Math.max(5, this.baseTurnTime - Math.floor(effectiveTurnNumber / 5));
    }

    // Added overrideTurnTime parameter
    startTurn(playerId, overrideTurnTime) {
        this.currentPlayerId = playerId;
        const playerIndex = this.playerIds.indexOf(playerId);
        if (playerIndex !== -1) {
            this.currentPlayerIndex = playerIndex;
        }
        
        // this.updateMaxTurnTime() should have been called by endTurn (or startGame for the very first turn)
        // to set this.maxTurnTime based on the current this.turnNumber.
        // If an override is provided (e.g., for a retry after failure), use that for currentTurnTime.
        this.currentTurnTime = overrideTurnTime !== undefined ? overrideTurnTime : this.maxTurnTime;
        
        console.log(`Starting turn ${this.turnNumber} for player ${this.currentPlayerId}. Max time for this turn: ${this.currentTurnTime}. (Calculated max for turn number ${this.turnNumber}: ${this.maxTurnTime})`);
    }

    nextTurn() { // This method is largely superseded by endTurn for standard game flow.
                  // It might be used for admin actions like skipping a player.
        if (!this.playerIds.length || !this.currentPlayerId) return null;

        // Find current player in the master list to cycle correctly
        let currentIndex = this.playerIds.indexOf(this.currentPlayerId);
        if (currentIndex === -1) { // Fallback if current player not in master list (should not happen)
            currentIndex = this.currentPlayerIndex !== -1 ? this.currentPlayerIndex : 0;
        }
        
        this.currentPlayerIndex = (currentIndex + 1) % this.playerIds.length;
        this.currentPlayerId = this.playerIds[this.currentPlayerIndex];
        
        // When nextTurn is called (e.g. skip), it implies a new turn segment.
        // It should arguably also increment turnNumber and update max time.
        // For now, let's assume it uses the existing maxTurnTime.
        // If this needs to be a full turn progression, it should call endTurn(false, ...)
        this.startTurn(this.currentPlayerId, this.maxTurnTime); 
        return this.currentPlayerId;
    }

    reverseTurnOrder() {
        if (this.playerIds.length < 2) return; 
        this.playerIds.reverse();
        if (this.currentPlayerId) {
            const newIndex = this.playerIds.indexOf(this.currentPlayerId);
            if (newIndex !== -1) {
                this.currentPlayerIndex = newIndex;
            } else {
                // If current player was removed or something unexpected, default to first player
                this.currentPlayerIndex = 0;
                this.currentPlayerId = this.playerIds[0]; // This might not be an active player.
                                                        // The caller (LocalGameEngine) should verify.
            }
        }
    }

    // New endTurn method
    // playingPlayerIds: array of IDs of players currently in the game (active players).
    // gameMode: 'single' or 'local'
    endTurn(didScore, playingPlayerIds, gameMode) {
        if (!playingPlayerIds || playingPlayerIds.length === 0) {
            console.error("TurnManager.endTurn called with no playingPlayerIds. Game should be over or ending.");
            return null; 
        }

        this.turnNumber++; // Increment for the new turn that is about to start.
        this.updateMaxTurnTime(); // Calculate the standard this.maxTurnTime for this new (incremented) turnNumber.

        let timeForThisNextImmediateTurn;
        if (!didScore) {
            // If player failed, their next attempt (or next player's turn if current player is out/multiplayer)
            // uses baseTurnTime for this specific attempt.
            timeForThisNextImmediateTurn = this.baseTurnTime;
        } else {
            // If player scored, the next turn uses the newly calculated this.maxTurnTime.
            timeForThisNextImmediateTurn = this.maxTurnTime;
        }

        // Determine next player
        let nextPlayerId;
        if (gameMode === 'single') {
            // In single player, the player is always the one in playingPlayerIds (should be only one)
            if (playingPlayerIds.length > 0) {
                nextPlayerId = playingPlayerIds[0]; 
            } else {
                 console.error("endTurn (single mode): playingPlayerIds is empty. Game should be over.");
                 return null; 
            }
        } else { // 'local' multiplayer
            let lastPlayerOriginalIndex = this.playerIds.indexOf(this.currentPlayerId);

            if (lastPlayerOriginalIndex === -1) {
                console.warn(`Current player ${this.currentPlayerId} not found in TurnManager's master player list during endTurn. Attempting fallback.`);
                // Fallback: if currentPlayerId is in playingPlayerIds, use its index from there to find a "next"
                // This is complex. A robust solution would be GameManager ensuring TurnManager.currentPlayerId is always valid.
                // For now, assume this.currentPlayerId is the one who just played.
                // If it's not in playerIds, we have a state issue. Let's try to find the "next" active player.
                // If it's not in playerIds, we have a state issue. Let's try to find the "next" active player.
                const _currentPlayerInPlaying = playingPlayerIds.indexOf(this.currentPlayerId);
                if (_currentPlayerInPlaying !== -1) {
                    const nextPlayerIndexInPlaying = (_currentPlayerInPlaying + 1) % playingPlayerIds.length;
                    nextPlayerId = playingPlayerIds[nextPlayerIndexInPlaying];
                } else if (playingPlayerIds.length > 0) {
                    nextPlayerId = playingPlayerIds[0]; // Default to first active player
                } else {
                    console.error("endTurn (local mode): playingPlayerIds is empty, cannot determine next player.");
                    return null;
                }
            } else {
                // Cycle through the original playerIds list to find the next player who is still in playingPlayerIds
                let attempts = 0;
                let nextPlayerOriginalIndex = lastPlayerOriginalIndex;
                do {
                    nextPlayerOriginalIndex = (nextPlayerOriginalIndex + 1) % this.playerIds.length;
                    nextPlayerId = this.playerIds[nextPlayerOriginalIndex];
                    attempts++;
                } while (!playingPlayerIds.includes(nextPlayerId) && attempts <= this.playerIds.length);

                if (!playingPlayerIds.includes(nextPlayerId)) {
                    // If loop completes and no such player found (e.g. all other players are out)
                    // and if there are still players in playingPlayerIds (e.g. current player is the only one left)
                    if (playingPlayerIds.length > 0) {
                        nextPlayerId = playingPlayerIds[0]; // Default to the first available in playingPlayerIds
                                                            // This would typically be the current player if they are the only one left.
                    } else {
                        console.error("endTurn (local mode): No active player found for the next turn.");
                        return null; // Game should be over.
                    }
                }
            }
        }
        
        // Update current player in TurnManager
        this.currentPlayerId = nextPlayerId;
        this.currentPlayerIndex = this.playerIds.indexOf(nextPlayerId); // Update index based on original list
        
        this.startTurn(this.currentPlayerId, timeForThisNextImmediateTurn);
        return this.currentPlayerId;
    }
}
