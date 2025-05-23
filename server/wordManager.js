const fs = require("fs")
const path = require("path")

class WordManager {
    constructor() {
        this.words = new Set()
        this.definitions = new Map()
        this.loadWords()
    }

    loadWords() {
        try {
            // Load words from words.txt
            const wordsPath = path.join(__dirname, "data", "words.txt")
            const wordsContent = fs.readFileSync(wordsPath, "utf8")
            const wordsList = wordsContent
                .split(/\r?\n/)
                .map((w) => w.trim().toLowerCase())
                .filter(Boolean)

            wordsList.forEach((word) => {
                this.words.add(word)
            })

            console.log(`Loaded ${this.words.size} words from dictionary`)
        } catch (error) {
            console.error("Error loading words:", error)
        }
    }

    isValidWord(word) {
        return this.words.has(word.toLowerCase())
    }

    getDefinition(word) {
        // In a real implementation, this would fetch from a dictionary API
        // For now, we'll return a simple placeholder
        return {
            word,
            definitions: [`Definition for ${word}`],
        }
    }
}

module.exports = WordManager
