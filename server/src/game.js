// Simplified and modular game logic for Wordbomb
// Handles game state, turns, word validation, and power-ups

import { validateWord, getDefinition } from './validation/validate.js';

export class Game {
    constructor(roomId, mode, players) {
        this.roomId = roomId;
        this.mode = mode;
        this.status = 'waiting';
        this.players = players.map(p => p.id);
        this.scores = {};
        this.lives = {};
        this.powerUps = {};
        this.turnOrder = [...this.players];
        this.currentTurn = this.turnOrder[0] || null;
        this.round = 1;
        this.usedWords = new Set();
        this.currentWordpiece = this.generateWordpiece();
        this.timer = mode === 'wordmaster' ? 30 : 15;
        this.timerInterval = null;
        this.trapEffects = {};
        this.extraWordpieceEffects = {};
        this.initPlayers(players);
    }

    initPlayers(players) {
        players.forEach(player => {
            this.scores[player.id] = 0;
            this.lives[player.id] = 3;
            this.powerUps[player.id] = { reverse_turn: 0, trap: 0, extra_wordpiece: 0 };
        });
    }

    generateWordpiece() {
        const pieces = [
            'ing', 'er', 'tion', 'ed', 'es', 'ly', 'ment',
            'al', 'ity', 'ive', 'ize', 'ous', 'ful', 'less',
            'able', 'ible', 'ance', 'ence', 'ism', 'ist', 'ness',
            're', 'un', 'in', 'im', 'dis', 'en', 'em', 'non',
            'de', 'ex', 'pre', 'pro', 'com', 'con', 'per',
            'sub', 'sup', 'inter', 'trans', 'over', 'under',
            'an', 'at', 'en', 'in', 'on', 'or', 'th', 'ch',
            'sh', 'ph', 'wh', 'qu', 'sc', 'sp', 'st', 'tr'
        ];
        return pieces[Math.floor(Math.random() * pieces.length)];
    }

    generateHardWordpiece() {
        const hard = [
            'qu', 'z', 'x', 'j', 'v', 'ph', 'gh', 'rh',
            'kn', 'gn', 'ps', 'mn', 'pt', 'wr', 'mb', 'bt',
            'zz', 'ff', 'gg', 'pp', 'cc', 'dd', 'bb', 'mm',
            'nn', 'll', 'rr', 'tt', 'ss', 'ck', 'dg', 'ng',
            'ght', 'tch', 'dge', 'sch', 'scr', 'spl', 'spr', 'str',
            'thm', 'chm', 'chr', 'thr', 'shr', 'squ', 'scl'
        ];
        return hard[Math.floor(Math.random() * hard.length)];
    }

    toState() {
        return {
            roomId: this.roomId,
            mode: this.mode,
            status: this.status,
            scores: this.scores,
            lives: this.lives,
            powerUps: this.powerUps,
            turnOrder: this.turnOrder,
            currentTurn: this.currentTurn,
            round: this.round,
            currentWordpiece: this.currentWordpiece,
            timer: this.timer
        };
    }

    async getDefinition(word) {
        return await getDefinition(word);
    }
}

export function createGame(roomId, mode, players) {
    return new Game(roomId, mode, players);
}
