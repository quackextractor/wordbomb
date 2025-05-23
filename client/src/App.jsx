"use client"

import {useState} from "react"
import {Navigate, Route, Routes} from "react-router-dom"
import Lobby from "./pages/Lobby"
import ModeSelect from "./pages/ModeSelect"
import LocalMultiplayerSetup from "./pages/LocalMultiplayerSetup"
import GameBoard from "./components/GameBoard"
import GameOver from "./pages/GameOver"

function App() {
    const [player, setPlayer] = useState({
        id: "",
        nickname: "",
        avatar: null,
        color: "#4287f5",
    })

    const [gameSettings, setGameSettings] = useState({
        roomId: null,
        mode: null,
        isHost: false,
        localPlayers: [],
        lives: 3,
        turnTime: 15,
    })

    const ProtectedRoute = ({children}) => {
        if (!player.nickname) {
            return <Navigate to="/" replace/>
        }
        return children
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-purple-900 text-white font-sans">
            <div className="max-w-7xl mx-auto">
                <Routes>
                    <Route path="/" element={<Lobby player={player} setPlayer={setPlayer}/>}/>
                    <Route
                        path="/mode-select"
                        element={
                            <ProtectedRoute>
                                <ModeSelect player={player} gameSettings={gameSettings}
                                            setGameSettings={setGameSettings}/>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/local-setup"
                        element={
                            <ProtectedRoute>
                                <LocalMultiplayerSetup player={player} setGameSettings={setGameSettings}/>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/game"
                        element={
                            <ProtectedRoute>
                                <GameBoard player={player} gameSettings={gameSettings}/>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/game-over"
                        element={
                            <ProtectedRoute>
                                <GameOver player={player} gameSettings={gameSettings}/>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </div>
        </div>
    )
}

export default App
