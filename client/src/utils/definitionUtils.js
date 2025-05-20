/**
 * Utility functions for handling word definitions
 */

// Store for the current and last definitions
let currentDefinition = null;
let lastDefinition = null;

/**
 * Set the current definition
 * @param {Object|string} definition - The definition to set
 */
export const setDefinition = (definition) => {
  lastDefinition = currentDefinition;
  currentDefinition = definition;
};

/**
 * Get the current definition
 * @returns {Object|string|null} The current definition
 */
export const getDefinition = () => {
  return currentDefinition;
};

/**
 * Get the last definition
 * @returns {Object|string|null} The last definition
 */
export const getLastDefinition = () => {
  console.log('lastDefinition:', lastDefinition);
  return lastDefinition;
};

/**
 * Clear the current definition
 */
export const clearDefinition = () => {
  lastDefinition = currentDefinition;
  currentDefinition = null;
};

/**
 * Format a definition for display
 * @param {Object|string} definition - The definition to format
 * @returns {string} Formatted definition HTML
 */
export const formatDefinition = (definition) => {
  if (!definition) return 'No definition available.';

  // If definition is already a string, return it
  if (typeof definition === 'string') return definition;

  // If definition is an object with parts of speech
  if (typeof definition === 'object') {
    return Object.entries(definition)
        .map(([partOfSpeech, meanings]) => {
          return `<strong>${partOfSpeech}</strong>: ${Array.isArray(meanings) ? meanings.join('; ') : meanings}`;
        })
        .join('<br><br>');
  }

  return 'No definition available.';
};