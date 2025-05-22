// TurnManager class
// import WordPiece, { Difficulty } from './WordPiece'; // WordPiece is managed by LocalGameEngine/GameManager

export default class TurnManager {
    constructor(playerIds = [], baseTurnTime = 15) {
        this.playerIds = [...playerIds] // Store the order of player IDs
        this.baseTurnTime = baseTurnTime
        this.maxTurnTime = baseTurnTime
        this.currentTurnTime = baseTurnTime
        // this.currentWordPiece = null; // Managed by LocalGameEngine/GameManager
        this.currentPlayerId = null
        this.turnNumber = 0 // Start at 0, GameManager.startGame will set to 1
        this.currentPlayerIndex = -1 // To track current player in playerIds
    }

    setPlayers(playerIds) {
        this.playerIds = [...playerIds]
        this.turnNumber = 0 // GameManager.startGame will set to 1 before first turn
        this.currentPlayerIndex = -1
        this.currentPlayerId = null
        this.maxTurnTime = this.baseTurnTime // Reset maxTurnTime
        this.currentTurnTime = this.baseTurnTime // Reset currentTurnTime
    }

    updateMaxTurnTime() {
        // Example: decrease max turn time every 5 turns, minimum 5 seconds
        const effectiveTurnNumber = Math.max(1, this.turnNumber) // Ensure turnNumber is at least 1 for calculation
        this.maxTurnTime = Math.max(5, this.baseTurnTime - Math.floor(effectiveTurnNumber / 5))
    }

    // Added overrideTurnTime parameter
    startTurn(playerId, overrideTurnTime) {
        this.currentPlayerId = playerId
        const playerIndex = this.playerIds.indexOf(playerId)
        if (playerIndex !== -1) {
            this.currentPlayerIndex = playerIndex
        }

        // this.updateMaxTurnTime() should have been called by endTurn (or startGame for the very first turn)
        // to set this.maxTurnTime based on the current this.turnNumber.
        // If an override is provided (e.g., for a retry after failure), use that for currentTurnTime.
        this.currentTurnTime = overrideTurnTime !== undefined ? overrideTurnTime : this.maxTurnTime

        console.log(
            `Starting turn ${this.turnNumber} for player ${this.currentPlayerId}. Max time for this turn: ${this.currentTurnTime}. (Calculated max for turn number ${this.turnNumber}: ${this.maxTurnTime})`,
        )
    }

    nextTurn() {
        // This method is largely superseded by endTurn for standard game flow.
        // It might be used for admin actions like skipping a player.
        if (!this.playerIds.length || !this.currentPlayerId) return null

        // Find current player in the master list to cycle correctly
        let currentIndex = this.playerIds.indexOf(this.currentPlayerId)
        if (currentIndex === -1) {
            // Fallback if current player not in master list (should not happen)
            currentIndex = this.currentPlayerIndex !== -1 ? this.currentPlayerIndex : 0
        }

        this.currentPlayerIndex = (currentIndex + 1) % this.playerIds.length
        this.currentPlayerId = this.playerIds[this.currentPlayerIndex]

        // When nextTurn is called (e.g. skip), it implies a new turn segment.
        // It should arguably also increment turnNumber and update max time.
        // For now, let's assume it uses the existing maxTurnTime.
        // If this needs to be a full turn progression, it should call endTurn(false, ...)
        this.startTurn(this.currentPlayerId, this.maxTurnTime)
        return this.currentPlayerId
    }

    reverseTurnOrder() {
        if (this.playerIds.length < 2) return
        this.playerIds.reverse()
        if (this.currentPlayerId) {
            const newIndex = this.playerIds.indexOf(this.currentPlayerId)
            if (newIndex !== -1) {
                this.currentPlayerIndex = newIndex
            } else {
                // If current player was removed or something unexpected, default to first player
                this.currentPlayerIndex = 0
                this.currentPlayerId = this.playerIds[0] // This might not be an active player.
                // The caller (LocalGameEngine) should verify.
            }
        }
    }

    // New endTurn method
    // playingPlayerIds: array of IDs of players currently in the game (active players).
    // gameMode: 'single' or 'local'
    endTurn(didScore, playingPlayerIds, gameMode) {
        if (!playingPlayerIds || playingPlayerIds.length === 0) {
            console.error("TurnManager.endTurn called with no playingPlayerIds. Game should be over or ending.")
            return null
        }

        this.turnNumber++ // Increment for the new turn that is about to start.
        this.updateMaxTurnTime() // Calculate the standard this.maxTurnTime for this new (incremented) turnNumber.

        let timeForThisNextImmediateTurn
        if (!didScore) {
            // If player failed, their next attempt (or next player's turn if current player is out/multiplayer)
            // uses baseTurnTime for this specific attempt.
            timeForThisNextImmediateTurn = this.baseTurnTime
        } else {
            // If player scored, the next turn uses the newly calculated this.maxTurnTime.
            timeForThisNextImmediateTurn = this.maxTurnTime
        }

        // Determine next player
        let nextPlayerId
        if (gameMode === "single") {
            // In single player, the player is always the one in playingPlayerIds (should be only one)
            if (playingPlayerIds.length > 0) {
                nextPlayerId = playingPlayerIds[0]
            } else {
                console.error("endTurn (single mode): playingPlayerIds is empty. Game should be over.")
                return null
            }
        } else {
            // 'local' multiplayer
            // Get the index of the current player in the master player list
            const currentPlayerIndex = this.playerIds.indexOf(this.currentPlayerId)

            if (currentPlayerIndex === -1) {
                console.warn(
                    `Current player ${this.currentPlayerId} not found in TurnManager's master player list during endTurn. Attempting fallback.`,
                )
                // If current player not found in master list, default to first active player
                if (playingPlayerIds.length > 0) {
                    nextPlayerId = playingPlayerIds[0]
                } else {
                    console.error("endTurn (local mode): playingPlayerIds is empty, cannot determine next player.")
                    return null
                }
            } else {
                // Start from the next player in the master list
                let nextIndex = (currentPlayerIndex + 1) % this.playerIds.length
                let attempts = 0

                // Loop through the master list until we find an active player or we've checked all players
                while (attempts < this.playerIds.length) {
                    const candidatePlayerId = this.playerIds[nextIndex]

                    // If this player is active, select them as the next player
                    if (playingPlayerIds.includes(candidatePlayerId)) {
                        nextPlayerId = candidatePlayerId
                        break
                    }

                    // Move to the next player in the master list
                    nextIndex = (nextIndex + 1) % this.playerIds.length
                    attempts++
                }

                // If we couldn't find an active player, default to the first active player
                if (!nextPlayerId && playingPlayerIds.length > 0) {
                    nextPlayerId = playingPlayerIds[0]
                } else if (!nextPlayerId) {
                    console.error("endTurn (local mode): No active player found for the next turn.")
                    return null // Game should be over.
                }
            }
        }

        // Update current player in TurnManager
        this.currentPlayerId = nextPlayerId
        this.currentPlayerIndex = this.playerIds.indexOf(nextPlayerId) // Update index based on original list

        this.startTurn(this.currentPlayerId, timeForThisNextImmediateTurn)
        return this.currentPlayerId
    }
}
