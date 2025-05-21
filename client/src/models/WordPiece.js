// OOP model for WordPiece
export const Difficulty = Object.freeze({
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
});

export default class WordPiece {
    constructor(content, difficulty = Difficulty.EASY) {
        this.content = content;
        this.difficulty = difficulty;
    }
}
