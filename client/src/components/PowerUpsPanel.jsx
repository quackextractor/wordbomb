"use client"
import PropTypes from "prop-types"

function PowerUpsPanel({playerPowerUps, handleUsePowerUp, isPlayerTurn}) {
    if (!Object.keys(playerPowerUps).length) return null

    const powerUpIcons = {
        reverse_turn: "🔄",
        trap: "🎯",
        extra_wordpiece: "➕",
    }

    const powerUpNames = {
        reverse_turn: "Reverse Turn Order",
        trap: "Trap Opponent",
        extra_wordpiece: "Extra Wordpiece",
    }

    return (
        <div className="card p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3">Power-ups</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(playerPowerUps).map(
                    ([type, count]) =>
                        count > 0 && (
                            <button
                                key={type}
                                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                                    isPlayerTurn
                                        ? "bg-white/10 hover:bg-white/20 cursor-pointer"
                                        : "bg-white/5 cursor-not-allowed opacity-60"
                                }`}
                                onClick={() => isPlayerTurn && handleUsePowerUp(type)}
                                disabled={!isPlayerTurn}
                            >
                                <div className="flex items-center">
                                    <span className="text-2xl mr-2">{powerUpIcons[type]}</span>
                                    <span className="font-medium">{powerUpNames[type]}</span>
                                </div>
                                <span className="px-2 py-1 bg-white/10 rounded-full text-xs font-bold">x{count}</span>
                            </button>
                        ),
                )}
            </div>
        </div>
    )
}

PowerUpsPanel.propTypes = {
    playerPowerUps: PropTypes.object.isRequired,
    handleUsePowerUp: PropTypes.func.isRequired,
    isPlayerTurn: PropTypes.bool.isRequired,
}

export default PowerUpsPanel
