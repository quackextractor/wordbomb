import React from 'react';

function GameHeader({ gameSettings, isLocalMode, activeGameState, playerScore, playerLives }) {
    return (
        <div className="game-header">
            <div className="room-info">
                <span>Mode: {gameSettings.mode}</span>
                {!isLocalMode && <span>Room: {gameSettings.roomId}</span>}
            </div>
            <div className="timer-container">
                <div className="timer" style={{
                    '--progress': `${(activeGameState?.timer / (gameSettings.mode === 'wordmaster' ? 30 : 15)) * 100}%`
                }}>
                    {activeGameState?.timer}s
                </div>
            </div>
            <div className="player-info">
                <span>Score: {playerScore}</span>
                <div className="lives">
                    {Array.from({length: playerLives}).map((_, i) => (
                        <span key={i} className="life-icon">❤️</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default GameHeader;
