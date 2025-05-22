import PropTypes from "prop-types"
import HeartIcon from "./HeartIcon"

function PlayersList({ activePlayers, activeGameState }) {
    return (
        <div className="card p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3">Players</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {activePlayers.map((p) => {
                    const playerLives = activeGameState?.lives[p.id] || 0
                    const isPlayerDead = playerLives <= 0
                    const isCurrentTurn = activeGameState?.currentTurn === p.id

                    return (
                        <div
                            key={p.id}
                            className={`bg-white/5 rounded-lg p-3 flex items-center transition-all duration-300 
                ${isPlayerDead ? "opacity-50 grayscale" : ""} 
                ${isCurrentTurn ? "ring-2 ring-purple-500 bg-purple-500/10" : "hover:bg-white/10"}`}
                        >
                            {isPlayerDead && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="bg-red-500/70 text-white px-3 py-1 rounded-full text-sm font-bold transform rotate-[-15deg]">
                    ELIMINATED
                  </span>
                                </div>
                            )}

                            {p.avatar ? (
                                <img
                                    src={p.avatar || "/placeholder.svg"}
                                    alt={p.nickname || p.name}
                                    className={`w-10 h-10 rounded-full mr-3 ${isPlayerDead ? "opacity-50" : ""}`}
                                />
                            ) : (
                                <div
                                    className={`w-10 h-10 rounded-full mr-3 flex items-center justify-center text-lg font-bold ${isPlayerDead ? "opacity-50" : ""}`}
                                    style={{ backgroundColor: p.color }}
                                >
                                    {(p.nickname || p.name || "").charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0 relative">
                                <div className="font-medium truncate">
                                    {p.nickname || p.name}
                                    {isCurrentTurn && !isPlayerDead && (
                                        <span className="ml-2 inline-block w-2 h-2 bg-purple-500 rounded-full animate-pulse-custom"></span>
                                    )}
                                </div>
                                <div className="flex items-center text-sm text-white/70">
                                    <span className="mr-2">Score: {activeGameState?.scores[p.id] || 0}</span>
                                    <div className="flex">
                                        {Array.from({ length: playerLives }).map((_, i) => (
                                            <HeartIcon key={i} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

PlayersList.propTypes = {
    activePlayers: PropTypes.array.isRequired,
    activeGameState: PropTypes.object,
}

export default PlayersList
