"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import AvatarCanvas from "../components/AvatarCanvas"

function LocalMultiplayerSetup({ player, setGameSettings }) {
  const navigate = useNavigate()
  const [localPlayers, setLocalPlayers] = useState([
    {
      id: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      color: player.color,
      isHost: true,
    },
    {
      id: "player2",
      nickname: "",
      avatar: null,
      color: "#a777e3",
      isHost: false,
    },
  ])
  const [error, setError] = useState("")

  const handleAddPlayer = () => {
    if (localPlayers.length >= 4) {
      setError("Maximum 4 players allowed")
      return
    }

    setLocalPlayers([
      ...localPlayers,
      {
        id: `player${localPlayers.length + 1}`,
        nickname: "",
        avatar: null,
        color: getRandomColor(),
        isHost: false,
      },
    ])
    setError("")
  }

  const handleRemovePlayer = (index) => {
    if (localPlayers.length <= 2) {
      setError("Minimum 2 players required")
      return
    }

    if (index === 0) {
      setError("Cannot remove host player")
      return
    }

    const updatedPlayers = [...localPlayers]
    updatedPlayers.splice(index, 1)
    setLocalPlayers(updatedPlayers)
    setError("")
  }

  const handleNicknameChange = (index, value) => {
    const updatedPlayers = [...localPlayers]
    updatedPlayers[index].nickname = value
    setLocalPlayers(updatedPlayers)
  }

  const handleColorChange = (index, color) => {
    const updatedPlayers = [...localPlayers]
    updatedPlayers[index].color = color
    setLocalPlayers(updatedPlayers)
  }

  const handleAvatarCreated = (index, avatarDataUrl) => {
    const updatedPlayers = [...localPlayers]
    updatedPlayers[index].avatar = avatarDataUrl
    setLocalPlayers(updatedPlayers)
  }

  const handleStartGame = () => {
    // Validate all players have nicknames
    const emptyNicknames = localPlayers.filter((p) => !p.nickname.trim())
    if (emptyNicknames.length > 0) {
      setError("All players must have a nickname")
      return
    }

    // Check for duplicate nicknames
    const nicknames = localPlayers.map((p) => p.nickname.trim())
    const uniqueNicknames = new Set(nicknames)
    if (uniqueNicknames.size !== localPlayers.length) {
      setError("All players must have unique nicknames")
      return
    }

    // Set game settings and navigate to game
    setGameSettings((prev) => ({
      ...prev,
      mode: "local",
      isHost: true,
      localPlayers: localPlayers,
      lives: 3, // Default lives
      turnTime: 15, // Default turn time
    }))

    navigate("/game", {
      state: {
        mode: "local",
        isHost: true,
        localPlayers: localPlayers,
      },
    })
  }

  const getRandomColor = () => {
    const colors = ["#4287f5", "#f54242", "#42f54e", "#f5d442", "#f542f2", "#42f5f5"]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  return (
    <div className="game-container py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          Local Multiplayer Setup
        </h1>

        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm animate-slide-in">
            {error}
          </div>
        )}

        <div className="card p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Players ({localPlayers.length}/4)</h2>
            <button
              onClick={handleAddPlayer}
              disabled={localPlayers.length >= 4}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center ${
                localPlayers.length >= 4
                  ? "bg-white/5 text-white/30 cursor-not-allowed"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Player
            </button>
          </div>

          <div className="space-y-6">
            {localPlayers.map((player, index) => (
              <div key={player.id} className="bg-white/5 rounded-lg p-4 animate-slide-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">
                    Player {index + 1} {index === 0 && <span className="text-yellow-400">(Host)</span>}
                  </h3>
                  {index !== 0 && (
                    <button
                      onClick={() => handleRemovePlayer(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor={`nickname-${index}`} className="block text-white/80 mb-2">
                      Nickname:
                    </label>
                    <input
                      type="text"
                      id={`nickname-${index}`}
                      value={player.nickname}
                      onChange={(e) => handleNicknameChange(index, e.target.value)}
                      placeholder="Enter nickname"
                      maxLength={15}
                      className="input-field"
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center mb-2">
                      <label htmlFor={`color-${index}`} className="mr-3 text-white/80">
                        Avatar Color:
                      </label>
                      <input
                        type="color"
                        id={`color-${index}`}
                        value={player.color}
                        onChange={(e) => handleColorChange(index, e.target.value)}
                        className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-white/20"
                      />
                    </div>
                    <AvatarCanvas
                      color={player.color}
                      onAvatarCreated={(avatarDataUrl) => handleAvatarCreated(index, avatarDataUrl)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleStartGame}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl focus:ring-purple-500"
          >
            Start Game
          </button>
          <button
            onClick={() => navigate("/mode-select")}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white focus:ring-white"
          >
            Back to Mode Select
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocalMultiplayerSetup
