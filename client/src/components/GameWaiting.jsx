"use client"
import PropTypes from "prop-types"

function GameWaiting({ gameSettings, players, leaveRoom, navigate, startGame, isLocalMode }) {
    return (
        <div className="game-container flex items-center justify-center min-h-screen py-8">
            <div className="card max-w-md w-full p-6 md:p-8 animate-bounce-in">
                <h2 className="text-2xl font-bold text-center mb-6">Waiting for players</h2>

                <div className="bg-black/20 rounded-lg p-4 mb-6 text-center">
                    <p className="mb-2">Room ID:</p>
                    <div className="text-xl font-mono bg-white/10 rounded-lg py-2 px-4 inline-block">{gameSettings.roomId}</div>
                    <p className="mt-3 text-white/70 text-sm">Share this code with friends to join!</p>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">Players:</h3>
                    <ul className="space-y-2">
                        {players.map((p) => (
                            <li
                                key={p.id}
                                className="flex items-center bg-white/5 rounded-lg p-3 transition-colors hover:bg-white/10"
                            >
                                {p.isHost && (
                                    <span className="inline-flex items-center px-2 py-1 mr-2 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-300">
                    Host
                  </span>
                                )}
                                <span className="font-medium">{p.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="space-y-3">
                    {gameSettings.isHost && (
                        <button
                            className={`btn-primary w-full ${players.length < (gameSettings.mode === "single" ? 1 : 2) ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={startGame}
                            disabled={players.length < (gameSettings.mode === "single" ? 1 : 2)}
                        >
                            Start Game
                        </button>
                    )}
                    <button
                        className="btn-danger w-full"
                        onClick={() => {
                            if (!isLocalMode) leaveRoom()
                            navigate("/")
                        }}
                    >
                        Leave Game
                    </button>
                </div>
            </div>
        </div>
    )
}

GameWaiting.propTypes = {
    gameSettings: PropTypes.object.isRequired,
    players: PropTypes.array.isRequired,
    leaveRoom: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
    startGame: PropTypes.func.isRequired,
    isLocalMode: PropTypes.bool.isRequired,
}

export default GameWaiting
