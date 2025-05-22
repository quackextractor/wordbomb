"use client"
import { useLocation, useNavigate } from "react-router-dom"
import PropTypes from "prop-types"

/**
 * Game over screen showing final scores and rankings
 */
function GameOver({ player }) {
    const navigate = useNavigate()
    const location = useLocation()

    const { scores = {}, roomId, mode } = location.state || {}

    const sortedPlayers = Object.entries(scores)
        .map(([id, score]) => ({
            id,
            score,
            nickname: id === player.id ? player.nickname : score.nickname || `Player`,
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
                    <h2 className="text-2xl font-bold mb-2">Your Score: {scores[player.id] || 0}</h2>
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
                                    <td className="py-3 px-4 font-medium">{p.nickname}</td>
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
