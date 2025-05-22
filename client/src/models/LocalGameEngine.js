import { generateWordpiece } from "../utils/wordpieceUtils"
import GameManager from "./GameManager"
import Player from "./Player"

export default class LocalGameEngine {
    constructor(playerInfo, gameSettings, onStateUpdate, onGameOver) {
        this.playerInfo = playerInfo
        this.gameSettings = gameSettings
        this.onStateUpdate = onStateUpdate // Callback to update React state
        this.onGameOver = onGameOver // Callback for game over navigation
        this.gameManager = null
        this.timerInterval = null
        this.usedWords = new Set()
        this.currentWordpiece = null
    }

    initializeGame() {
        const gamePlayers = [
            new Player({
                id: this.playerInfo.id,
                name: this.playerInfo.nickname,
                avatar: this.playerInfo.avatar,
                color: this.playerInfo.color,
                isHost: true,
                hp: this.gameSettings.lives, // Initialize HP from game settings
            }),
        ]

        if (this.gameSettings.mode === "local") {
            gamePlayers.push(
                new Player({
                    id: "player2",
                    name: "Player 2",
                    avatar: null,
                    color: "#a777e3",
                    isHost: false,
                    hp: this.gameSettings.lives, // Initialize HP for player 2
                }),
            )
        }

        // Pass gameSettings to GameManager constructor
        this.gameManager = new GameManager(gamePlayers, this.gameSettings)
        this.gameManager.startGame()
        this.currentWordpiece = generateWordpiece()
        this.usedWords.clear()

        this._updateState()
        this.startTimer()

        // Return initial player list for the hook to set
        return gamePlayers
    }

    // New method to initialize game with custom players for local multiplayer
    initializeGameWithPlayers(players) {
        const gamePlayers = players.map(
            (p) =>
                new Player({
                    id: p.id,
                    name: p.nickname,
                    avatar: p.avatar,
                    color: p.color,
                    isHost: p.isHost,
                    hp: this.gameSettings.lives, // Initialize HP from game settings
                }),
        )

        // Pass gameSettings to GameManager constructor
        this.gameManager = new GameManager(gamePlayers, this.gameSettings)
        this.gameManager.startGame()
        this.currentWordpiece = generateWordpiece()
        this.usedWords.clear()

        this._updateState()
        this.startTimer()

        // Return initial player list for the hook to set
        return gamePlayers
    }

    _getCurrentPlayer() {
        if (!this.gameManager || !this.gameManager.turnManager) return null
        const currentPlayerId = this.gameManager.turnManager.currentPlayerId
        return this.gameManager.allPlayers.find((p) => p.id === currentPlayerId)
    }

    _updateState(newState = {}) {
        const currentPlayer = this._getCurrentPlayer()
        const baseState = {
            status: this.gameManager.isGameOver ? "over" : "playing",
            currentWordpiece: this.currentWordpiece,
            // Timer reflects currentTurnTime from TurnManager
            timer: this.gameManager.turnManager
                ? this.gameManager.turnManager.currentTurnTime
                : this.gameSettings.turnTime || 15,
            usedWords: new Set(this.usedWords),
            scores: Object.fromEntries(this.gameManager.allPlayers.map((p) => [p.id, p.score])),
            lives: Object.fromEntries(this.gameManager.allPlayers.map((p) => [p.id, p.hp])),
            powerUps: Object.fromEntries(this.gameManager.allPlayers.map((p) => [p.id, { ...p.powerUps }])),
            turnOrder:
                this.gameManager.turnManager && this.gameManager.turnManager.playerIds
                    ? [...this.gameManager.turnManager.playerIds]
                    : [],
            currentTurn: currentPlayer ? currentPlayer.id : null,
            // Add turnNumber and maxTurnTime for potential UI display or debugging
            turnNumber: this.gameManager.turnManager ? this.gameManager.turnManager.turnNumber : 0,
            maxTurnTimeForTurn: this.gameManager.turnManager
                ? this.gameManager.turnManager.maxTurnTime
                : this.gameSettings.turnTime || 15,
        }
        this.onStateUpdate({ ...baseState, ...newState })
    }

    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval)
        }
        if (!this.gameManager || !this.gameManager.turnManager) return

        // timeLeft should be currentTurnTime as set by TurnManager.startTurn
        let timeLeft = this.gameManager.turnManager.currentTurnTime
        this.onStateUpdate({ timer: timeLeft })

        this.timerInterval = setInterval(() => {
            timeLeft--
            this.onStateUpdate({ timer: timeLeft })

            if (timeLeft <= 0) {
                this.handleTimeout()
            }
        }, 1000)
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval)
            this.timerInterval = null
        }
    }

    handleTimeout() {
        this.stopTimer()
        const currentPlayer = this._getCurrentPlayer()
        if (!currentPlayer) {
            console.error("handleTimeout: No current player found. Game might be over or in an inconsistent state.")
            // Potentially check game over again or force an update.
            if (this.gameManager.checkGameOver()) {
                this._updateState({ status: "over", timer: 0 })
                this.onGameOver(Object.fromEntries(this.gameManager.allPlayers.map((p) => [p.id, p.score])))
            }
            return
        }

        this.gameManager.changePlayerHp(-1, currentPlayer.id)

        if (this.gameManager.checkGameOver()) {
            this._updateState({ status: "over", timer: 0 })
            this.onGameOver(Object.fromEntries(this.gameManager.allPlayers.map((p) => [p.id, p.score])))
            return
        }

        // Wordpiece remains the same on timeout.
        // Call endTurn with didScore = false.
        const activePlayerIds = this.gameManager.playingPlayers.map((p) => p.id)
        const nextPlayerId = this.gameManager.turnManager.endTurn(false, activePlayerIds, this.gameSettings.mode)

        if (nextPlayerId) {
            this.usedWords.clear() // Clear used words for the next attempt/player
            this._updateState() // Update state to reflect new turn's time, current player etc.
            this.startTimer()
        } else {
            // This case should ideally be caught by checkGameOver earlier or within endTurn.
            // If endTurn returns null, it implies no next player could be determined (e.g., all players out).
            console.warn("handleTimeout: endTurn returned no next player. Game should be over.")
            this._updateState({ status: "over" })
            this.onGameOver(Object.fromEntries(this.gameManager.allPlayers.map((p) => [p.id, p.score])))
        }
    }

    submitWord(word) {
        const currentPlayer = this._getCurrentPlayer()
        if (!currentPlayer || !this.currentWordpiece) return false

        const wordLower = word.toLowerCase()
        const wordpieceLower = this.currentWordpiece.toLowerCase()

        if (!wordLower.includes(wordpieceLower)) {
            return false
        }
        if (this.usedWords.has(wordLower)) {
            return false
        }

        this.stopTimer()
        this.usedWords.add(wordLower)

        const score = Math.max(1, word.length - this.currentWordpiece.length + 1)
        currentPlayer.changeScore(score)

        if (word.length > 7 && Math.random() < 0.25) {
            const types = ["reverse_turn", "trap", "extra_wordpiece"]
            const type = types[Math.floor(Math.random() * types.length)]
            currentPlayer.addPowerUp(type, 1)
        }

        // Check game over (e.g., if HP depleted due to a trap or other mechanic not yet implemented)
        // Or if a score limit is reached (not currently a feature for local game)
        if (this.gameManager.checkGameOver()) {
            this._updateState({ status: "over", timer: 0 })
            this.onGameOver(Object.fromEntries(this.gameManager.allPlayers.map((p) => [p.id, p.score])))
            return true
        }

        // On successful submission, generate a new wordpiece.
        this.currentWordpiece = generateWordpiece()

        // Call endTurn with didScore = true.
        const activePlayerIds = this.gameManager.playingPlayers.map((p) => p.id)
        const nextPlayerId = this.gameManager.turnManager.endTurn(true, activePlayerIds, this.gameSettings.mode)

        if (nextPlayerId) {
            this.usedWords.clear() // Clear used words for the next player/turn
            this._updateState() // Update state to reflect new turn's time, current player, new wordpiece etc.
            this.startTimer()
        } else {
            // This case should ideally be caught by checkGameOver earlier or within endTurn.
            console.warn("submitWord: endTurn returned no next player. Game should be over.")
            this._updateState({ status: "over" })
            this.onGameOver(Object.fromEntries(this.gameManager.allPlayers.map((p) => [p.id, p.score])))
        }
        return true
    }

    usePowerUp(type, targetId) {
        const currentPlayer = this._getCurrentPlayer()
        if (!currentPlayer) {
            this._updateState()
            return false
        }

        const powerUpUsed = currentPlayer.usePowerUp(type)
        if (!powerUpUsed) {
            this._updateState()
            return false
        }

        let turnOrderChanged = false
        if (type === "reverse_turn" && this.gameSettings.mode === "local" && this.gameManager.playingPlayers.length > 1) {
            this.gameManager.turnManager.reverseTurnOrder()
            // After reversing, the TurnManager's currentPlayerId might need to be re-established
            // if the current player index logic in reverseTurnOrder isn't perfectly aligned with active players.
            // However, endTurn should handle picking the correct next player based on the new order.
            // For now, we assume reverseTurnOrder correctly sets currentPlayerId or it will be corrected by next endTurn.
            turnOrderChanged = true
            // The current turn continues for the player who used the power-up,
            // but the *next* player will be based on the reversed order.
        }
        // Add other power-up effects here

        this._updateState()

        // If turn order was reversed, the timer continues for the current player.
        // The next call to endTurn will determine the actual next player based on the new order.
        // No need to restart timer here unless the power-up itself ends the turn or changes current player immediately.
        return true
    }

    cleanup() {
        this.stopTimer()
    }
}