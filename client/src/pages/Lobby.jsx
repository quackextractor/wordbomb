"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { io } from "socket.io-client"
import AvatarCanvas from "../components/AvatarCanvas"

/**
 * Lobby component for player setup and game joining
 */
function Lobby({ player, setPlayer }) {
    const [nickname, setNickname] = useState(player.nickname || "")
    const [roomId, setRoomId] = useState("")
    const [error, setError] = useState("")
    const [avatarColor, setAvatarColor] = useState(player.color || "#4287f5")
    const [socket, setSocket] = useState(null)
    const [isCheckingRoom, setIsCheckingRoom] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin
        const newSocket = io(socketUrl, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        setSocket(newSocket)

        return () => {
            if (newSocket) {
                newSocket.disconnect()
            }
        }
    }, [])

    const handleAvatarCreated = (avatarDataUrl) => {
        setPlayer((prev) => ({ ...prev, avatar: avatarDataUrl }))
    }

    const handleColorChange = (e) => {
        const color = e.target.value
        setAvatarColor(color)
        setPlayer((prev) => ({ ...prev, color }))
    }

    const handleNicknameChange = (e) => {
        setNickname(e.target.value)
    }

    const handleRoomIdChange = (e) => {
        setRoomId(e.target.value)
        setError("")
    }

    const handleCreateGame = () => {
        if (!validateNickname()) return

        setPlayer((prev) => ({
            ...prev,
            nickname,
            id: prev.id || Math.random().toString(36).substring(2, 9),
        }))

        navigate("/mode-select")
    }

    const handleJoinGame = () => {
        if (!validateNickname()) return
        if (!roomId.trim()) {
            setError("Please enter a room ID")
            return
        }

        setIsCheckingRoom(true)

        if (socket && !socket.connected) {
            socket.connect()
        }

        if (socket) {
            socket.emit("room:check", { roomId }, (response) => {
                setIsCheckingRoom(false)

                if (response.error) {
                    setError(response.error)
                    return
                }

                if (!response.exists) {
                    setError("Room does not exist")
                    return
                }

                setPlayer((prev) => ({
                    ...prev,
                    nickname,
                    id: prev.id || Math.random().toString(36).substring(2, 9),
                }))

                navigate("/game", {
                    state: {
                        roomId,
                        isHost: false,
                        mode: "online",
                    },
                })
            })
        } else {
            setError("Unable to connect to server")
            setIsCheckingRoom(false)
        }
    }

    const validateNickname = () => {
        if (!nickname.trim()) {
            setError("Please enter a nickname")
            return false
        }
        if (nickname.length < 3 || nickname.length > 15) {
            setError("Nickname must be between 3 and 15 characters")
            return false
        }
        setError("")
        return true
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card max-w-md w-full p-6 md:p-8 animate-bounce-in">
                <h1 className="text-center text-3xl md:text-4xl font-bold mb-8 pb-1 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                    WordBomb Kingfish
                </h1>

                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-center">Create Your Avatar</h2>
                    <div className="flex items-center justify-center mb-4">
                        <label htmlFor="avatar-color" className="mr-3 text-white/80">
                            Avatar Color:
                        </label>
                        <input
                            type="color"
                            id="avatar-color"
                            value={avatarColor}
                            onChange={handleColorChange}
                            className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-white/20"
                        />
                    </div>
                    <div className="flex justify-center">
                        <AvatarCanvas color={avatarColor} onAvatarCreated={handleAvatarCreated} />
                    </div>
                </div>

                <div className="mb-6">
                    <label htmlFor="nickname" className="block text-white/80 mb-2">
                        Nickname:
                    </label>
                    <input
                        type="text"
                        id="nickname"
                        value={nickname}
                        onChange={handleNicknameChange}
                        placeholder="Enter your nickname"
                        maxLength={15}
                        className="input-field"
                    />
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm animate-slide-in">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        className="px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl focus:ring-purple-500 w-full"
                        onClick={handleCreateGame}
                    >
                        Create Game
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-purple-900/50 text-white/60">or join existing game</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={roomId}
                            onChange={handleRoomIdChange}
                            placeholder="Enter Room ID"
                            className="input-field sm:flex-1"
                        />
                        <button
                            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white focus:ring-white"
                            onClick={handleJoinGame}
                            disabled={isCheckingRoom}
                        >
                            {isCheckingRoom ? (
                                <span className="flex items-center justify-center">
                  <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                  >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    ></circle>
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Checking...
                </span>
                            ) : (
                                "Join Game"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Lobby
