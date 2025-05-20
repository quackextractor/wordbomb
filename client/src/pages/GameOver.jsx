import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../assets/css/GameOver.css';

/**
 * Game over screen showing final scores and rankings
 */
function GameOver({ player }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get scores and game settings from location state
  const { scores = {}, roomId, mode } = location.state || {};
  
  // Sort players by score in descending order
  const sortedPlayers = Object.entries(scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
  
  // Get player's rank
  const playerRank = sortedPlayers.findIndex(p => p.id === player.id) + 1;
  
  // Handle play again
  const handlePlayAgain = () => {
    if (mode === 'single') {
      // For single player, go directly to game with same mode
      navigate('/game', { 
        state: { 
          mode: 'single',
          isHost: true
        } 
      });
    } else {
      // For multiplayer, go to mode select
      navigate('/mode-select');
    }
  };
  
  // Handle return to lobby
  const handleReturnToLobby = () => {
    navigate('/');
  };

  return (
    <div className="game-over-container">
      <h1 className="game-over-title">Game Over</h1>
      
      <div className="player-result">
        <h2>Your Score: {scores[player.id] || 0}</h2>
        <p>Rank: {playerRank} of {sortedPlayers.length}</p>
      </div>
      
      <div className="leaderboard">
        <h2>Leaderboard</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p, index) => (
              <tr 
                key={p.id} 
                className={p.id === player.id ? 'current-player' : ''}
              >
                <td>{index + 1}</td>
                <td>{p.id === player.id ? player.nickname : `Player ${index + 1}`}</td>
                <td>{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="game-over-buttons">
        <button 
          className="play-again-btn"
          onClick={handlePlayAgain}
        >
          Play Again
        </button>
        <button 
          className="return-lobby-btn"
          onClick={handleReturnToLobby}
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
}

export default GameOver;