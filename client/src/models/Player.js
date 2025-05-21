// OOP model for Player
export default class Player {
    constructor({ id, name, avatar, color, isHost = false }) {
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.color = color;
        this.isHost = isHost;
        this.hp = 3;
        this.score = 0;
        this.isPlaying = true;
        this.powerUps = {
            reverse_turn: 0,
            trap: 0,
            extra_wordpiece: 0
        };
    }

    changeHp(amount) {
        this.hp += amount;
        if (this.hp <= 0) {
            this.isPlaying = false;
            this.hp = 0;
        }
    }

    changeScore(amount) {
        this.score += amount;
    }

    usePowerUp(type) {
        if (this.powerUps[type] > 0) {
            this.powerUps[type]--;
            return true;
        }
        return false;
    }
}
