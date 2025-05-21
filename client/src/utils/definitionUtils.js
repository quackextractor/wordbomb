/**
 * Utility functions for handling word definitions
 */

let currentDefinition = null;

/**
 * Get the current definition
 * @returns {Object|string|null} The current definition
 */
export const getDefinition = () => {
    return currentDefinition;
};