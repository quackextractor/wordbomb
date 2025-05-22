/**
 * Utility functions for handling word definitions
 */

let currentDefinition = null;
let lastDefinition = null;

/**
 * Get the current definition
 * @returns {Object|string|null} The current definition
 */
export const getDefinition = () => {
    return currentDefinition;
};

/**
 * Set the current definition
 * @param {Object|string} definition - The definition to set
 */
export const setDefinition = (definition) => {
    lastDefinition = currentDefinition;
    currentDefinition = definition;
};
