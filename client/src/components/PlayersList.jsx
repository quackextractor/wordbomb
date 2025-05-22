import PropTypes from "prop-types"
import HeartIcon from "./HeartIcon"

function PlayersList({ activePlayers, activeGameState }) {
    return (
        <div className="card p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3">Players</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {activePlayers.map((p) => (
                    <div
                        key={p.id}
                        className={`bg-white/5 rounded-lg p-3 flex items-center transition-all duration-300 ${activeGameState?.currentTurn === p.id ? "ring-2 ring-purple-500 bg-purple-500/10" : "hover:bg-white/10"}`}
                    >
                        {p.avatar ? (
                            <img
                                src={p.avatar || "/placeholder.svg"}
                                alt={p.nickname || p.name}
                                className="w-10 h-10 rounded-full mr-3"
                            />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-full mr-3 flex items-center justify-center text-lg font-bold"
                                style={{ backgroundColor: p.color }}
                            >
                                {(p.nickname || p.name || "").charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                                {p.nickname || p.name}
                                {activeGameState?.currentTurn === p.id && (
                                    <span className="ml-2 inline-block w-2 h-2 bg-purple-500 rounded-full animate-pulse-custom"></span>
                                )}
                            </div>
                            <div className="flex items-center text-sm text-white/70">
                                <span className="mr-2">Score: {activeGameState?.scores[p.id] || 0}</span>
                                <div className="flex">
                                    {Array.from({ length: activeGameState?.lives[p.id] || 3 }).map((_, i) => (
                                        <HeartIcon key={i} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

PlayersList.propTypes = {
    activePlayers: PropTypes.array.isRequired,
    activeGameState: PropTypes.object,
}

export default PlayersList