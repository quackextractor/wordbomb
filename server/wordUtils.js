// Utility for generating random wordpieces
function generateWordpiece() {
  const commonWordpieces = [
    "ing"
  ]
  return commonWordpieces[Math.floor(Math.random() * commonWordpieces.length)]
}

module.exports = {
  generateWordpiece,
}
