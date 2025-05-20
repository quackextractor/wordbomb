import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LRUCache } from 'lru-cache';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to word lists
const englishWordsPath = path.join(__dirname, '../../data/english-words.txt');
const explicitWordsPath = path.join(__dirname, '../../data/explicit-english-words.txt');

// Word sets
let englishWords = new Set();
let explicitWords = new Set();

// Definition cache
const definitionCache = new LRUCache({
  max: 1000, // Store up to 1000 definitions
  ttl: 1000 * 60 * 60 * 24 // Cache for 24 hours
});

// Load word lists
try {
  // Load English words
  const englishWordsContent = fs.readFileSync(englishWordsPath, 'utf8');
  englishWordsContent.split('\n').forEach(word => {
    if (word.trim() && !word.startsWith('#')) {
      englishWords.add(word.trim().toLowerCase());
    }
  });
  
  // Load explicit words
  const explicitWordsContent = fs.readFileSync(explicitWordsPath, 'utf8');
  explicitWordsContent.split('\n').forEach(word => {
    if (word.trim() && !word.startsWith('#')) {
      explicitWords.add(word.trim().toLowerCase());
    }
  });
  
  console.log(`Loaded ${englishWords.size} English words and ${explicitWords.size} explicit words`);
} catch (error) {
  console.error('Error loading word lists:', error);
  
  // Initialize with some sample words for testing
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
  // Convert to lowercase for case-insensitive comparison
  const lowerWord = word.trim().toLowerCase();
  const lowerWordpiece = wordpiece.trim().toLowerCase();
  
  // Check if word contains the wordpiece
  if (!lowerWord.includes(lowerWordpiece)) {
    return {
      valid: false,
      message: `Word must contain "${wordpiece}"`
    };
  }
  
  // Check if word is in the English dictionary
  if (!englishWords.has(lowerWord)) {
    return {
      valid: false,
      message: 'Not a valid English word'
    };
  }
  
  // Check if word is in the explicit words list
  if (explicitWords.has(lowerWord)) {
    return {
      valid: false,
      message: 'Word not allowed'
    };
  }
  
  // Get definition
  const definition = await getDefinition(lowerWord);
  
  // Word is valid
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
  // Check cache first
  if (definitionCache.has(word)) {
    return definitionCache.get(word);
  }
  
  try {
    // Fetch definition from Datamuse API
    const response = await axios.get(`${process.env.DATAMUSE_URL || 'https://api.datamuse.com'}/words`, {
      params: {
        sp: word,
        md: 'd', // Include definitions
        max: 1
      },
      timeout: 5000 // 5 second timeout
    });
    
    // Check if we got a valid response with definitions
    if (response.data && response.data.length > 0 && response.data[0].defs) {
      const definitions = response.data[0].defs;
      
      // Process definitions
      const formattedDefinitions = {};
      
      definitions.forEach(def => {
        // Datamuse format is "pos\tmeaning"
        const [pos, meaning] = def.split('\t');
        
        if (!formattedDefinitions[pos]) {
          formattedDefinitions[pos] = [];
        }
        
        formattedDefinitions[pos].push(meaning);
      });
      
      // Cache and return the formatted definitions
      definitionCache.set(word, formattedDefinitions);
      return formattedDefinitions;
    }
    
    // No definition found
    return 'No definition available';
  } catch (error) {
    console.error(`Error fetching definition for "${word}":`, error);
    return 'Definition unavailable';
  }
}