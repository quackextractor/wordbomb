/**
 * This file exports an empty Map to be used as a shared reference for rooms
 * across different modules. This is needed because we're using ES modules,
 * which have their own scope.
 */

// Create an empty Map to store rooms
const rooms = new Map();

export default rooms;