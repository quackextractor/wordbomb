// OOP model for PowerUp
export default class PowerUp {
    constructor({ addedTime = 0, addedScore = 0, scoreMult = 1, addedHp = 0, targetPlayerId = null }) {
        this.addedTime = addedTime;
        this.addedScore = addedScore;
        this.scoreMult = scoreMult;
        this.addedHp = addedHp;
        this.targetPlayerId = targetPlayerId;
    }
}
