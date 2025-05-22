"use client"
import { useLocation, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import PropTypes from "prop-types"

/**
 * Game over screen showing final scores and rankings
 */
function GameOver({ player, gameSettings }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Log received data for debugging
  useEffect(() => {
    console.log("GameOver component mounted with state:", location.state)
    console.log("Player:", player)
    console.log("Game settings:", gameSettings)
  }, [location.state, player, gameSettings])

  const { scores = {}, roomId, mode, localPlayers, setupPlayers } = location.state || {}

  // Ensure we have valid scores
  useEffect(() => {
    if (!scores || Object.keys(scores).length === 0) {
      console.error("No scores received in GameOver screen")
    }
  }, [scores])

  console.log("GameOver received scores:", scores)
  console.log("GameOver received localPlayers:", localPlayers)
  console.log("GameOver received setupPlayers:", setupPlayers)

  // Get player name from scores or localPlayers
  const getPlayerName = (playerId) => {
    // First check if the score object has nickname info (from enhanced scores)
    if (scores[playerId] && typeof scores[playerId] === "object" && scores[playerId].nickname) {
      return scores[playerId].nickname
    }

    // Then check localPlayers
    if (localPlayers) {
      const localPlayer = localPlayers.find((p) => p.id === playerId)
      if (localPlayer && (localPlayer.nickname || localPlayer.name)) {
        return localPlayer.nickname || localPlayer.name
      }
    }

    // Then check setupPlayers
    if (setupPlayers) {
      const setupPlayer = setupPlayers.find((p) => p.id === playerId)
      if (setupPlayer && (setupPlayer.nickname || setupPlayer.name)) {
        return setupPlayer.nickname || setupPlayer.name
      }
    }

    // Fallback to player ID
    return playerId === player.id ? player.nickname : `Player ${playerId.slice(-1)}`
  }

  // Get player index for display
  const getPlayerIndex = (playerId) => {
    if (playerId === player.id) return "You"

    // Try to get index from setupPlayers first (original order)
    if (setupPlayers) {
      const index = setupPlayers.findIndex((p) => p.id === playerId)
      if (index !== -1) return `P${index + 1}`
    }

    // Then try localPlayers
    if (localPlayers) {
      const index = localPlayers.findIndex((p) => p.id === playerId)
      if (index !== -1) return `P${index + 1}`
    }

    return playerId.startsWith("player") ? `P${playerId.slice(-1)}` : ""
  }

  // Get player score
  const getPlayerScore = (playerId) => {
    const scoreData = scores[playerId]
    if (typeof scoreData === "object") {
      return scoreData.score || 0
    }
    return scoreData || 0
  }

  // Get player avatar
  const getPlayerAvatar = (playerId) => {
    // First check enhanced scores
    if (scores[playerId] && typeof scores[playerId] === "object" && scores[playerId].avatar) {
      return scores[playerId].avatar
    }

    // Then check localPlayers
    if (localPlayers) {
      const localPlayer = localPlayers.find((p) => p.id === playerId)
      if (localPlayer && localPlayer.avatar) {
        return localPlayer.avatar
      }
    }

    // Then check setupPlayers
    if (setupPlayers) {
      const setupPlayer = setupPlayers.find((p) => p.id === playerId)
      if (setupPlayer && setupPlayer.avatar) {
        return setupPlayer.avatar
      }
    }

    // If it's the current player, use their avatar
    if (playerId === player.id && player.avatar) {
      return player.avatar
    }

    return null
  }

  // Get player color
  const getPlayerColor = (playerId) => {
    // First check enhanced scores
    if (scores[playerId] && typeof scores[playerId] === "object" && scores[playerId].color) {
      return scores[playerId].color
    }

    // Then check localPlayers
    if (localPlayers) {
      const localPlayer = localPlayers.find((p) => p.id === playerId)
      if (localPlayer && localPlayer.color) {
        return localPlayer.color
      }
    }

    // Then check setupPlayers
    if (setupPlayers) {
      const setupPlayer = setupPlayers.find((p) => p.id === playerId)
      if (setupPlayer && setupPlayer.color) {
        return setupPlayer.color
      }
    }

    // If it's the current player, use their color
    if (playerId === player.id && player.color) {
      return player.color
    }

    return "#4287f5" // Default color
  }

  const sortedPlayers = Object.keys(scores)
      .map((id) => ({
        id,
        score: getPlayerScore(id),
        nickname: getPlayerName(id),
        playerIndex: getPlayerIndex(id),
        avatar: getPlayerAvatar(id),
        color: getPlayerColor(id),
      }))
      .sort((a, b) => b.score - a.score)

  const playerRank = sortedPlayers.findIndex((p) => p.id === player.id) + 1

  const handlePlayAgain = () => {
    if (mode === "single") {
      navigate("/game", {
        state: {
          mode: "single",
          isHost: true,
        },
      })
    } else if (mode === "local") {
      navigate("/local-setup", {
        state: {
          previousPlayers: setupPlayers || localPlayers, // Pass previous players for convenience
        },
      })
    } else if (mode === "online" || mode === "wordmaster") {
      // For online modes, go back to mode select
      navigate("/mode-select")
    } else {
      navigate("/mode-select")
    }
  }

  const handleReturnToLobby = () => {
    navigate("/")
  }

  return (
      <div className="game-container flex flex-col items-center justify-center min-h-screen py-8">
        <div className="card max-w-2xl w-full p-6 md:p-8 animate-bounce-in">
          <h1 className="text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Game Over
          </h1>

          <div className="bg-white/5 rounded-lg p-6 mb-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Your Score: {getPlayerScore(player.id)}</h2>
            <p className="text-white/70">
              Rank: <span className="text-xl font-bold text-yellow-400">{playerRank}</span> of {sortedPlayers.length}
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-center">Leaderboard</h2>
            <div className="overflow-hidden rounded-lg border border-white/10">
              <table className="w-full">
                <thead>
                <tr className="bg-white/10">
                  <th className="py-3 px-4 text-left">Rank</th>
                  <th className="py-3 px-4 text-left">Player</th>
                  <th className="py-3 px-4 text-right">Score</th>
                </tr>
                </thead>
                <tbody>
                {sortedPlayers.map((p, index) => (
                    <tr
                        key={p.id}
                        className={`border-t border-white/10 ${p.id === player.id ? "bg-purple-500/20" : "hover:bg-white/5"}`}
                    >
                      <td className="py-3 px-4">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center">
                          {p.avatar ? (
                              <img src={p.avatar || "/placeholder.svg"} alt="" className="w-8 h-8 rounded-full mr-3" />
                          ) : (
                              <div
                                  className="w-8 h-8 rounded-full mr-3 flex items-center justify-center text-sm font-bold"
                                  style={{ backgroundColor: p.color }}
                              >
                                {p.nickname.charAt(0).toUpperCase()}
                              </div>
                          )}
                          <div>
                            {p.nickname}
                            {p.playerIndex && p.playerIndex !== "You" && (
                                <span className="ml-2 text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
                              {p.playerIndex}
                            </span>
                            )}
                            {p.playerIndex === "You" && (
                                <span className="ml-2 text-xs text-purple-200 bg-purple-500/30 px-2 py-0.5 rounded-full">
                              {p.playerIndex}
                            </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold">{p.score}</td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                className="px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl focus:ring-purple-500"
                onClick={handlePlayAgain}
            >
              Play Again
            </button>
            <button
                className="px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white focus:ring-white"
                onClick={handleReturnToLobby}
            >
              Return to Lobby
            </button>
          </div>
        </div>
      </div>
  )
}

GameOver.propTypes = {
  player: PropTypes.object.isRequired,
  gameSettings: PropTypes.object,
}

export default GameOver
