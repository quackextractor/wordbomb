const { generateWordpiece } = require("./wordUtils")

class GameRoom {
  constructor(id, wordManager) {
    this.id = id
    this.players = []
    this.wordManager = wordManager
    this.gameInProgress = false
    this.currentWordpiece = null
    this.currentTurn = null
    this.turnOrder = []
    this.usedWords = new Set()
    this.scores = {}
    this.lives = {}
    this.powerUps = {}
    this.gameMode = null
    this.turnTimer = null
    this.turnTime = 15 // Default turn time in seconds
  }

  getRoomState() {
    return {
      id: this.id,
      players: this.players,
      gameInProgress: this.gameInProgress,
      turnOrder: this.turnOrder,
    }
  }

  getGameState() {
    return {
      wordpiece: this.currentWordpiece,
      timer: this.turnTime,
      scores: this.scores,
      lives: this.lives,
      powerUps: this.powerUps,
      turnOrder: this.turnOrder,
      currentTurn: this.currentTurn,
      usedWords: Array.from(this.usedWords),
    }
  }

  addPlayer(player) {
    // Check if player already exists
    const existingPlayerIndex = this.players.findIndex((p) => p.id === player.id)

    if (existingPlayerIndex !== -1) {
      // Update existing player
      this.players[existingPlayerIndex] = {
        ...this.players[existingPlayerIndex],
        ...player,
      }
    } else {
      // Add new player
      this.players.push(player)

      // Initialize player stats if game is in progress
      if (this.gameInProgress) {
        this.scores[player.id] = 0
        this.lives[player.id] = 3 // Default 3 lives
        this.powerUps[player.id] = {
          reverse_turn: 0,
          trap: 0,
          extra_wordpiece: 0,
        }

        // Add to turn order if not already in
        if (!this.turnOrder.includes(player.id)) {
          this.turnOrder.push(player.id)
        }
      }
    }
  }

  removePlayer(playerId) {
    this.players = this.players.filter((p) => p.id !== playerId)

    // Update turn order
    this.turnOrder = this.turnOrder.filter((id) => id !== playerId)

    // If current turn is the removed player, move to next turn
    if (this.currentTurn === playerId && this.gameInProgress) {
      this.nextTurn()
    }
  }

  handlePlayerDisconnect(playerId) {
    // Mark player as disconnected but keep in the game
    const player = this.players.find((p) => p.id === playerId)
    if (player) {
      player.disconnected = true
    }

    // If all players are disconnected, end the game
    if (this.players.every((p) => p.disconnected)) {
      this.endGame()
    }
  }

  startGame(mode) {
    this.gameInProgress = true
    this.gameMode = mode
    this.usedWords.clear()
    this.currentWordpiece = generateWordpiece()

    // Initialize player stats
    this.players.forEach((player) => {
      this.scores[player.id] = 0
      this.lives[player.id] = 3 // Default 3 lives
      this.powerUps[player.id] = {
        reverse_turn: 0,
        trap: 0,
        extra_wordpiece: 0,
      }
    })

    // Set turn order
    this.turnOrder = this.players.map((p) => p.id)

    // Set first player's turn
    this.currentTurn = this.turnOrder[0]

    // Start turn timer
    this.startTurnTimer()
  }

  endGame() {
    this.gameInProgress = false
    this.currentWordpiece = null
    this.currentTurn = null

    if (this.turnTimer) {
      clearTimeout(this.turnTimer)
      this.turnTimer = null
    }
  }

  startTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer)
    }

    this.turnTimer = setTimeout(() => {
      this.handleTimeout()
    }, this.turnTime * 1000)
  }

  handleTimeout() {
    if (!this.gameInProgress) return

    // Player loses a life on timeout
    if (this.currentTurn) {
      this.lives[this.currentTurn]--

      // Check if player is eliminated
      if (this.lives[this.currentTurn] <= 0) {
        // Remove player from turn order
        this.turnOrder = this.turnOrder.filter((id) => id !== this.currentTurn)
      }
    }

    // Move to next turn
    this.nextTurn()
  }

  nextTurn() {
    if (!this.gameInProgress) return null

    // Clear turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer)
      this.turnTimer = null
    }

    // Check if game is over (only one or zero players left)
    if (this.turnOrder.length <= 1) {
      this.endGame()
      return {
        gameOver: true,
        finalScores: this.scores,
      }
    }

    // Get next player
    const currentIndex = this.turnOrder.indexOf(this.currentTurn)
    const nextIndex = (currentIndex + 1) % this.turnOrder.length
    this.currentTurn = this.turnOrder[nextIndex]

    // Generate new wordpiece
    this.currentWordpiece = generateWordpiece()
    this.usedWords.clear()

    // Start new turn timer
    this.startTurnTimer()

    return {
      wordpiece: this.currentWordpiece,
      timer: this.turnTime,
      currentTurn: this.currentTurn,
    }
  }

  submitWord(playerId, word, wordpiece) {
    if (!this.gameInProgress || this.currentTurn !== playerId) {
      return { valid: false, error: "Not your turn" }
    }

    const wordLower = word.toLowerCase()
    const wordpieceLower = wordpiece.toLowerCase()

    // Validate word
    if (!wordLower.includes(wordpieceLower)) {
      return { valid: false, error: `Word must contain "${wordpiece}"` }
    }

    if (this.usedWords.has(wordLower)) {
      return { valid: false, error: "Word already used" }
    }

    // Check if word is valid (in dictionary)
    if (!this.wordManager.isValidWord(wordLower)) {
      return { valid: false, error: "Word not found in dictionary" }
    }

    // Word is valid
    this.usedWords.add(wordLower)

    // Calculate score
    const score = Math.max(1, word.length - wordpiece.length + 1)
    this.scores[playerId] += score

    // Random chance to get power-up for longer words
    if (word.length > 7 && Math.random() < 0.25) {
      const types = ["reverse_turn", "trap", "extra_wordpiece"]
      const type = types[Math.floor(Math.random() * types.length)]
      this.powerUps[playerId][type]++
    }

    // Get definition
    const definition = this.wordManager.getDefinition(wordLower)

    return {
      valid: true,
      score,
      definition,
    }
  }

  usePowerUp(playerId, type, targetPlayerId) {
    if (!this.gameInProgress || this.currentTurn !== playerId) {
      return { success: false, error: "Not your turn" }
    }

    // Check if player has the power-up
    if (!this.powerUps[playerId] || this.powerUps[playerId][type] <= 0) {
      return { success: false, error: "You don't have this power-up" }
    }

    // Use power-up
    this.powerUps[playerId][type]--

    const result = { success: true }

    // Apply power-up effect
    switch (type) {
      case "reverse_turn":
        this.turnOrder.reverse()
        result.turnOrder = this.turnOrder
        break
      case "trap":
        if (targetPlayerId && this.lives[targetPlayerId]) {
          this.lives[targetPlayerId]--
          // Check if target player is eliminated
          if (this.lives[targetPlayerId] <= 0) {
            this.turnOrder = this.turnOrder.filter((id) => id !== targetPlayerId)
          }
        }
        break
      case "extra_wordpiece":
        // Generate a new wordpiece immediately
        this.currentWordpiece = generateWordpiece()
        this.usedWords.clear()
        result.newWordpiece = this.currentWordpiece
        break
    }

    return result
  }

  getScores() {
    return this.scores
  }

  getLives() {
    return this.lives
  }

  getPowerUps() {
    return this.powerUps
  }
}

module.exports = GameRoom
