import React from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import PropTypes from 'prop-types';
import '../assets/css/GameOver.css';

/**
 * Game over screen showing final scores and rankings
 */
function GameOver({player}) {
    const navigate = useNavigate();
    const location = useLocation();

    const {scores = {}, roomId, mode} = location.state || {};

    const sortedPlayers = Object.entries(scores)
        .map(([id, score]) => ({id, score, nickname: id === player.id ? player.nickname : (scores[id]?.nickname || `Player ${sortedPlayers ? sortedPlayers.length : 1}`)}))
        .sort((a, b) => b.score - a.score);

    const playerRank = sortedPlayers.findIndex(p => p.id === player.id) + 1;

    const handlePlayAgain = () => {
        if (mode === 'single') {
            navigate('/game', {
                state: {
                    mode: 'single',
                    isHost: true
                }
            });
        } else {
            navigate('/mode-select');
        }
    };

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
                            <td>{p.nickname}</td>
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

GameOver.propTypes = {
    player: PropTypes.object.isRequired,
    gameSettings: PropTypes.object
};

export default GameOver;