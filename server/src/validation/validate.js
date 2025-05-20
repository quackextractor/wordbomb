import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {LRUCache} from 'lru-cache';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const englishWordsPath = path.join(__dirname, '../../data/english-words.txt');
const explicitWordsPath = path.join(__dirname, '../../data/explicit-english-words.txt');

let englishWords = new Set();
let explicitWords = new Set();

const definitionCache = new LRUCache({
    max: 1000,
    ttl: 1000 * 60 * 60 * 24
});

try {
    const englishWordsContent = fs.readFileSync(englishWordsPath, 'utf8');
    englishWordsContent.split('\n').forEach(word => {
        if (word.trim() && !word.startsWith('#')) {
            englishWords.add(word.trim().toLowerCase());
        }
    });

    const explicitWordsContent = fs.readFileSync(explicitWordsPath, 'utf8');
    explicitWordsContent.split('\n').forEach(word => {
        if (word.trim() && !word.startsWith('#')) {
            explicitWords.add(word.trim().toLowerCase());
        }
    });

    console.log(`Loaded ${englishWords.size} English words and ${explicitWords.size} explicit words`);
} catch (error) {
    console.error('Error loading word lists:', error);

    englishWords = new Set(['test', 'word', 'game', 'play', 'hello', 'world']);
    explicitWords = new Set(['badword1', 'badword2']);
}

/**
 * Validate a word
 * @param {string} word - The word to validate
 * @param {string} wordpiece - The wordpiece that must be contained in the word
 * @returns {Object} Validation result
 */
export async function validateWord(word, wordpiece) {
    const lowerWord = word.trim().toLowerCase();
    const lowerWordpiece = wordpiece.trim().toLowerCase();

    if (!lowerWord.includes(lowerWordpiece)) {
        return {
            valid: false,
            message: `Word must contain "${wordpiece}"`
        };
    }

    if (!englishWords.has(lowerWord)) {
        return {
            valid: false,
            message: 'Not a valid English word'
        };
    }

    if (explicitWords.has(lowerWord)) {
        return {
            valid: false,
            message: 'Word not allowed'
        };
    }

    const definition = await getDefinition(lowerWord);

    return {
        valid: true,
        definition
    };
}

/**
 * Get the definition of a word
 * @param {string} word - The word to get the definition for
 * @returns {Object|string|null} Word definition
 */
export async function getDefinition(word) {
    if (definitionCache.has(word)) {
        return definitionCache.get(word);
    }

    try {
        const response = await axios.get(`${process.env.DATAMUSE_URL || 'https://api.datamuse.com'}/words`, {
            params: {
                sp: word,
                md: 'd',
                max: 1
            },
            timeout: 5000
        });

        if (response.data && response.data.length > 0 && response.data[0].defs) {
            const definitions = response.data[0].defs;

            const formattedDefinitions = {};

            definitions.forEach(def => {
                const [pos, meaning] = def.split('\t');

                if (!formattedDefinitions[pos]) {
                    formattedDefinitions[pos] = [];
                }

                formattedDefinitions[pos].push(meaning);
            });

            definitionCache.set(word, formattedDefinitions);
            return formattedDefinitions;
        }

        return 'No definition available';
    } catch (error) {
        console.error(`Error fetching definition for "${word}":`, error);
        return 'Definition unavailable';
    }
}