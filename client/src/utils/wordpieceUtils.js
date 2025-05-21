// Utility for generating random wordpieces
export function generateWordpiece() {
    const commonWordpieces = [
        'ing'
    ];
    return commonWordpieces[Math.floor(Math.random() * commonWordpieces.length)];
}
