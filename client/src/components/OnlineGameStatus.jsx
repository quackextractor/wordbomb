import PropTypes from "prop-types"

function OnlineGameStatus({currentTurn, player, players}) {
    // Find the current player object
    const currentPlayer = players.find((p) => p.id === currentTurn)

    if (!currentPlayer) return null

    const isYourTurn = currentTurn === player.id

    return (
        <div
            className={`rounded-lg p-4 mb-4 text-center ${
                isYourTurn ? "bg-green-500/20 border border-green-500/30" : "bg-purple-500/20 border border-purple-500/30"
            }`}
        >
            <div className="flex items-center justify-center">
                {currentPlayer.avatar ? (
                    <img
                        src={currentPlayer.avatar || "/placeholder.svg"}
                        alt={currentPlayer.name}
                        className="w-10 h-10 rounded-full mr-3"
                    />
                ) : (
                    <div
                        className="w-10 h-10 rounded-full mr-3 flex items-center justify-center text-lg font-bold"
                        style={{backgroundColor: currentPlayer.color}}
                    >
                        {currentPlayer.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div>
                    {isYourTurn ? (
                        <div>
                            <span className="font-bold text-lg">Your Turn!</span>
                            <p className="text-white/70 text-sm">Type a word containing the wordpiece</p>
                        </div>
                    ) : (
                        <div>
                            <span className="font-bold text-lg">{currentPlayer.name}'s Turn</span>
                            <p className="text-white/70 text-sm">Waiting for their move...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

OnlineGameStatus.propTypes = {
    currentTurn: PropTypes.string.isRequired,
    player: PropTypes.object.isRequired,
    players: PropTypes.array.isRequired,
}

export default OnlineGameStatus
