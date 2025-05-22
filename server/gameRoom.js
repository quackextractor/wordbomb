const { generateWordpiece } = require("./wordUtils")
const fs = require("fs")
const path = require("path")

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
    this.disconnectedPlayers = new Map() // Track disconnected players by ID
    this.eliminatedPlayers = new Set() // Track eliminated players
    this.wordList = new Set() // Store loaded words
    this.loadWords() // Load words on initialization
  }

  // Load words from file
  loadWords() {
    try {
      const wordsPath = path.join(__dirname, "data", "words.txt")
      const wordsContent = fs.readFileSync(wordsPath, "utf8")
      const wordsList = wordsContent
        .split(/\r?\n/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean)

      wordsList.forEach((word) => {
        this.wordList.add(word)
      })

      console.log(`Loaded ${this.wordList.size} words into game room dictionary`)
    } catch (error) {
      console.error("Error loading words into game room:", error)
    }
  }

  getRoomState() {
    return {
      id: this.id,
      players: this.players,
      gameInProgress: this.gameInProgress,
      turnOrder: this.turnOrder,
      eliminatedPlayers: Array.from(this.eliminatedPlayers),
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
      eliminatedPlayers: Array.from(this.eliminatedPlayers),
    }
  }

  addPlayer(player) {
    // Check if this is a reconnecting player
    const disconnectedPlayer = this.disconnectedPlayers.get(player.id)

    if (disconnectedPlayer && this.gameInProgress) {
      console.log(`Player ${player.id} is reconnecting to the game`)
      // Update the socket ID for the reconnecting player
      disconnectedPlayer.socketId = player.socketId
      disconnectedPlayer.disconnected = false

      // Add the player back to the active players list
      const existingIndex = this.players.findIndex((p) => p.id === player.id)
      if (existingIndex !== -1) {
        this.players[existingIndex] = disconnectedPlayer
      } else {
        this.players.push(disconnectedPlayer)
      }

      // Remove from disconnected players map
      this.disconnectedPlayers.delete(player.id)

      // Return true to indicate this was a reconnection
      return true
    }

    // Regular player join logic
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

    // Return false to indicate this was not a reconnection
    return false
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
    // Find the player
    const player = this.players.find((p) => p.id === playerId)
    if (player) {
      // Mark player as disconnected
      player.disconnected = true

      // Store in disconnected players map for potential reconnection
      this.disconnectedPlayers.set(playerId, player)

      console.log(`Player ${playerId} disconnected and added to reconnection list`)

      // If all players are disconnected, end the game
      if (this.players.every((p) => p.disconnected)) {
        this.endGame()
        return
      }

      // If it's the disconnected player's turn, move to next turn
      if (this.currentTurn === playerId && this.gameInProgress) {
        console.log(`Current turn player ${playerId} disconnected, advancing to next turn`)
        this.nextTurn()
      }
    }
  }

  startGame(mode) {
    this.gameInProgress = true
    this.gameMode = mode
    this.usedWords.clear()
    this.currentWordpiece = generateWordpiece()
    this.eliminatedPlayers.clear()

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

    console.log(`Starting turn timer for player ${this.currentTurn}, ${this.turnTime} seconds`)

    this.turnTimer = setTimeout(() => {
      console.log(`Turn timer expired for player ${this.currentTurn}`)
      this.handleTimeout()
    }, this.turnTime * 1000)
  }

  handleTimeout() {
    if (!this.gameInProgress) return

    console.log(`Handling timeout for player ${this.currentTurn}`)

    // Player loses a life on timeout
    if (this.currentTurn) {
      this.lives[this.currentTurn]--
      console.log(`Player ${this.currentTurn} lost a life, now has ${this.lives[this.currentTurn]} lives`)

      // Check if player is eliminated
      if (this.lives[this.currentTurn] <= 0) {
        console.log(`Player ${this.currentTurn} has been eliminated`)
        // Add to eliminated players set
        this.eliminatedPlayers.add(this.currentTurn)
        // Remove player from turn order
        this.turnOrder = this.turnOrder.filter((id) => id !== this.currentTurn)
      }
    }

    // Move to next turn
    return this.nextTurn()
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
      console.log("Game over condition met: only one or zero players left")
      this.endGame()
      return {
        gameOver: true,
        finalScores: this.scores,
        winner: this.turnOrder.length === 1 ? this.turnOrder[0] : null,
      }
    }

    // Get next player
    const currentIndex = this.turnOrder.indexOf(this.currentTurn)
    const nextIndex = (currentIndex + 1) % this.turnOrder.length
    this.currentTurn = this.turnOrder[nextIndex]

    console.log(`Moving to next turn, player ${this.currentTurn}`)

    // Generate new wordpiece
    this.currentWordpiece = generateWordpiece()
    this.usedWords.clear()

    // Start new turn timer
    this.startTurnTimer()

    return {
      wordpiece: this.currentWordpiece,
      timer: this.turnTime,
      currentTurn: this.currentTurn,
      lives: this.lives,
      eliminatedPlayers: Array.from(this.eliminatedPlayers),
    }
  }

  // Enhanced word validation using the same logic as client
  validateWord(word, wordpiece) {
    const wordLower = word.toLowerCase()
    const wordpieceLower = wordpiece.toLowerCase()

    // Check if word contains wordpiece
    if (!wordLower.includes(wordpieceLower)) {
      return { valid: false, error: `Word must contain "${wordpiece}"` }
    }

    // Check if word has been used already
    if (this.usedWords.has(wordLower)) {
      return { valid: false, error: "Word already used" }
    }

    // Check if word is in dictionary
    if (!this.wordList.has(wordLower) && !this.wordManager.isValidWord(wordLower)) {
      return { valid: false, error: "Word not found in dictionary" }
    }

    return { valid: true }
  }

  // Fetch definition from external API
  async fetchDefinition(word) {
    try {
      const response = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`)
      const data = await response.json()

      if (data && data[0] && Array.isArray(data[0].defs) && data[0].defs.length > 0) {
        return data[0].defs.slice(0, 3).map((def) => def.replace(/^\w+\t/, ""))
      }
    } catch (error) {
      console.error("Error fetching definition:", error)
    }

    // Fallback to wordManager if API fails
    const fallbackDef = this.wordManager.getDefinition(word)
    if (fallbackDef && fallbackDef.definitions) {
      return fallbackDef.definitions
    }

    return [`Definition for ${word}`]
  }

  // Updated submitWord with enhanced validation and definition fetching
  async submitWord(playerId, word, wordpiece) {
    if (!this.gameInProgress || this.currentTurn !== playerId) {
      return { valid: false, error: "Not your turn" }
    }

    const validation = this.validateWord(word, wordpiece)
    if (!validation.valid) {
      return validation
    }

    // Word is valid - add to used words
    const wordLower = word.toLowerCase()
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

    // Fetch definition
    try {
      const definitions = await this.fetchDefinition(wordLower)

      return {
        valid: true,
        score,
        definition: {
          word: wordLower,
          definitions: definitions || [],
        },
      }
    } catch (error) {
      console.error("Error getting definition:", error)

      // Return success even if definition fetch fails
      return {
        valid: true,
        score,
        definition: {
          word: wordLower,
          definitions: [],
        },
      }
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
            this.eliminatedPlayers.add(targetPlayerId)
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

  isPlayerDisconnected(playerId) {
    return this.disconnectedPlayers.has(playerId)
  }

  getReconnectionState(playerId) {
    if (this.gameInProgress && this.disconnectedPlayers.has(playerId)) {
      return {
        canReconnect: true,
        gameState: this.getGameState(),
      }
    }
    return { canReconnect: false }
  }
}

module.exports = GameRoom
