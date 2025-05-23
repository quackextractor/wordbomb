"use client"
import {useNavigate} from "react-router-dom"
import PropTypes from "prop-types"

/**
 * Mode selection screen for choosing game mode
 */
function ModeSelect({player, gameSettings, setGameSettings}) {
    const navigate = useNavigate()

    const modes = [
        {
            id: "single",
            name: "Single Player",
            description: "Play solo and challenge yourself to beat your high score!",
            icon: "👤",
        },
        {
            id: "local",
            name: "Local Multiplayer",
            description: "Play with friends on the same device, taking turns.",
            icon: "👥",
        },
        {
            id: "online",
            name: "Online Multiplayer",
            description: "Play with friends online in real-time.",
            icon: "🌐",
        },
        {
            id: "wordmaster",
            name: "Wordmaster",
            description: "Elimination mode! Last player standing wins.",
            icon: "👑",
        },
    ]

    const handleModeSelect = async (mode) => {
        try {
            if (mode === "local") {
                // For local multiplayer, navigate to setup screen
                navigate("/local-setup")
                return
            }

            if (mode === "online" || mode === "wordmaster") {
                // For online modes, set up game settings and navigate to game
                setGameSettings((prev) => ({
                    ...prev,
                    mode,
                    isHost: true,
                }))
                navigate("/game", {
                    state: {
                        mode,
                        isHost: true,
                    },
                })
                return
            }

            // For single player
            setGameSettings((prev) => ({
                ...prev,
                mode,
                isHost: true,
            }))
            navigate("/game", {
                state: {
                    mode,
                    isHost: true,
                },
            })
        } catch (error) {
            console.error("Error selecting mode:", error)
        }
    }

    return (
        <div className="game-container py-8 md:py-12">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-center mb-8 md:mb-12 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                    Select Game Mode
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {modes.map((mode) => (
                        <div
                            key={mode.id}
                            className="card p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer group animate-slide-in"
                            onClick={() => handleModeSelect(mode.id)}
                        >
                            <div className="flex items-center mb-4">
                                <span className="text-4xl mr-3">{mode.icon}</span>
                                <h2 className="text-xl font-bold group-hover:text-purple-300 transition-colors">{mode.name}</h2>
                            </div>
                            <p className="text-white/70 group-hover:text-white/90 transition-colors">{mode.description}</p>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center">
                    <button
                        className="px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white focus:ring-white"
                        onClick={() => navigate("/")}
                    >
                        Back to Lobby
                    </button>
                </div>
            </div>
        </div>
    )
}

ModeSelect.propTypes = {
    player: PropTypes.object.isRequired,
    gameSettings: PropTypes.object.isRequired,
    setGameSettings: PropTypes.func.isRequired,
}

export default ModeSelect
