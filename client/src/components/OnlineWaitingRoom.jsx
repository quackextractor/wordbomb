"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import PropTypes from "prop-types"

function OnlineWaitingRoom({ room, players, gameSettings, startGame, leaveRoom }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState(null)

  const copyRoomId = () => {
    navigator.clipboard.writeText(gameSettings.roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartGame = () => {
    // Start a countdown before starting the game
    setCountdown(3)
  }

  useEffect(() => {
    if (countdown === null) return

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // Start the game when countdown reaches 0
      startGame()
    }
  }, [countdown, startGame])

  const handleLeaveRoom = () => {
    leaveRoom()
    navigate("/")
  }

  return (
    <div className="game-container flex items-center justify-center min-h-screen py-8">
      <div className="card max-w-md w-full p-6 md:p-8 animate-bounce-in">
        <h2 className="text-2xl font-bold text-center mb-6">Online Multiplayer</h2>

        <div className="bg-black/20 rounded-lg p-4 mb-6">
          <p className="mb-2 text-center">Room ID:</p>
          <div className="flex items-center justify-center gap-2">
            <div className="text-xl font-mono bg-white/10 rounded-lg py-2 px-4 inline-block">{gameSettings.roomId}</div>
            <button
              onClick={copyRoomId}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Copy Room ID"
            >
              {copied ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-3 text-white/70 text-sm text-center">Share this code with friends to join!</p>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Players ({players.length}/4):</h3>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center bg-white/5 rounded-lg p-3 transition-colors hover:bg-white/10"
              >
                {p.avatar ? (
                  <img src={p.avatar || "/placeholder.svg"} alt={p.name} className="w-8 h-8 rounded-full mr-3" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full mr-3 flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium">{p.name}</span>
                {p.isHost && (
                  <span className="ml-2 text-xs text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded-full">Host</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {countdown !== null && (
          <div className="mb-6 text-center">
            <div className="text-4xl font-bold text-purple-400">{countdown}</div>
            <p className="text-white/70">Game starting...</p>
          </div>
        )}

        <div className="space-y-3">
          {gameSettings.isHost && (
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl focus:ring-purple-500 w-full ${
                players.length < 2 || countdown !== null ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={handleStartGame}
              disabled={players.length < 2 || countdown !== null}
            >
              {countdown !== null ? "Starting..." : "Start Game"}
            </button>
          )}
          <button
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 w-full"
            onClick={handleLeaveRoom}
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}

OnlineWaitingRoom.propTypes = {
  room: PropTypes.object,
  players: PropTypes.array.isRequired,
  gameSettings: PropTypes.object.isRequired,
  startGame: PropTypes.func.isRequired,
  leaveRoom: PropTypes.func.isRequired,
}

export default OnlineWaitingRoom
