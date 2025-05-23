// Update the Player class to properly handle player names
export default class Player {
    constructor({id, name, nickname, avatar, color, isHost = false}) {
        this.id = id
        this.name = name || nickname || "Player" // Ensure we have a name
        this.nickname = nickname || name || "Player" // Ensure we have a nickname
        this.avatar = avatar
        this.color = color
        this.isHost = isHost
        this.hp = 3
        this.score = 0
        this.isPlaying = true
        this.powerUps = {
            reverse_turn: 0,
            trap: 0,
            extra_wordpiece: 0,
        }
    }

    changeHp(amount) {
        this.hp += amount
        if (this.hp <= 0) {
            this.isPlaying = false
            this.hp = 0
        }
    }

    changeScore(amount) {
        this.score += amount
    }

    addPowerUp(type, amount = 1) {
        // Added amount parameter, defaults to 1
        if (this.powerUps.hasOwnProperty(type)) {
            this.powerUps[type] += amount
        } else {
            // Optionally handle unknown power-up types, e.g., by logging an error
            console.warn(`Attempted to add unknown power-up type: ${type}`)
        }
    }

    usePowerUp(type) {
        if (this.powerUps[type] > 0) {
            this.powerUps[type]--
            return true
        }
        return false
    }
}
