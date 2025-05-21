import React from 'react';
import PropTypes from 'prop-types';

function GameWaiting({ gameSettings, players, leaveRoom, navigate, startGame, isLocalMode }) {
    return (
        <div className="game-waiting">
            <h2>Waiting for players</h2>
            <p>Room ID: <span className="room-id">{gameSettings.roomId}</span></p>
            <p>Share this code with friends to join!</p>
            <div className="players-list">
                <h3>Players:</h3>
                <ul>
                    {players.map(p => (
                        <li key={p.id} className="player-item">
                            {p.isHost && <span className="host-badge">Host</span>}
                            <span className="player-name">{p.name}</span>
                        </li>
                    ))}
                </ul>
            </div>
            {gameSettings.isHost && (
                <button
                    className="start-game-btn"
                    onClick={startGame}
                    disabled={players.length < (gameSettings.mode === 'single' ? 1 : 2)}
                >
                    Start Game
                </button>
            )}
            <button
                className="leave-game-btn"
                onClick={() => {
                    if (!isLocalMode) leaveRoom();
                    navigate('/');
                }}
            >
                Leave Game
            </button>
        </div>
    );
}

GameWaiting.propTypes = {
    gameSettings: PropTypes.object.isRequired,
    players: PropTypes.array.isRequired,
    leaveRoom: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
    startGame: PropTypes.func.isRequired,
    isLocalMode: PropTypes.bool.isRequired
};

export default GameWaiting;
