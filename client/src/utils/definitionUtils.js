/**
 * Utility functions for handling word definitions
 */

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
    // Removed console.log for production
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

    if (typeof definition === 'string') return definition;

    if (typeof definition === 'object') {
        return Object.entries(definition)
            .map(([partOfSpeech, meanings]) => {
                return `<strong>${partOfSpeech}</strong>: ${Array.isArray(meanings) ? meanings.join('; ') : meanings}`;
            })
            .join('<br><br>');
    }

    return 'No definition available.';
};