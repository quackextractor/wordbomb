import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Lobby from './pages/Lobby';
import ModeSelect from './pages/ModeSelect';
import GameBoard from './components/GameBoard';
import GameOver from './pages/GameOver';

function App() {
  // Global state for player info and game settings
  const [player, setPlayer] = useState({
    id: '',
    nickname: '',
    avatar: null,
    color: '#4287f5',
  });
  
  const [gameSettings, setGameSettings] = useState({
    roomId: null,
    mode: null,
    isHost: false,
  });

  // Guard route to ensure player has a nickname before accessing game routes
  const ProtectedRoute = ({ children }) => {
    if (!player.nickname) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <div className="app">
      <Routes>
        <Route 
          path="/" 
          element={<Lobby player={player} setPlayer={setPlayer} />} 
        />
        <Route 
          path="/mode-select" 
          element={
            <ProtectedRoute>
              <ModeSelect 
                player={player} 
                gameSettings={gameSettings} 
                setGameSettings={setGameSettings} 
              />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game" 
          element={
            <ProtectedRoute>
              <GameBoard 
                player={player} 
                gameSettings={gameSettings} 
              />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game-over" 
          element={
            <ProtectedRoute>
              <GameOver 
                player={player} 
                gameSettings={gameSettings} 
              />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;