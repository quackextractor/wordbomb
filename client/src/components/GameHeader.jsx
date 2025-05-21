import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

function GameHeader({ gameSettings, isLocalMode, activeGameState, playerScore, playerLives }) {
    const [prevScore, setPrevScore] = useState(playerScore);
    const [scoreAnim, setScoreAnim] = useState(false);
    const [prevLives, setPrevLives] = useState(playerLives);
    const [lifeAnim, setLifeAnim] = useState(false);

    // Timer color logic
    const maxTime = activeGameState?.maxTurnTimeForTurn || (gameSettings.mode === 'wordmaster' ? 30 : 15);
    const timeLeft = Math.max(0, activeGameState?.timer || 0);
    // If 1 or less seconds left, bar is empty
    let percent = (timeLeft <= 1) ? 0 : (timeLeft / maxTime) * 100;
    percent = Math.max(0, Math.min(100, percent)); // Clamp to [0, 100]
    let timerColor = 'timer-green';
    if (percent <= 33) timerColor = 'timer-red';
    else if (percent <= 66) timerColor = 'timer-yellow';

    // Score animation
    useEffect(() => {
        if (playerScore > prevScore) {
            setScoreAnim(true);
            setTimeout(() => setScoreAnim(false), 700);
        }
        setPrevScore(playerScore);
    }, [playerScore]);

    // Health animation
    useEffect(() => {
        if (playerLives < prevLives) {
            setLifeAnim(true);
            setTimeout(() => setLifeAnim(false), 700);
        }
        setPrevLives(playerLives);
    }, [playerLives]);

    return (
        <div className="game-header">
            <div className="room-info">
                <span>Mode: {gameSettings.mode}</span>
                {!isLocalMode && <span>Room: {gameSettings.roomId}</span>}
            </div>
            <div className="timerbar-outer">
                <div
                    className={`timerbar-inner ${timerColor}`}
                    style={{ width: `${percent}%` }}
                    data-timer-color={timerColor}
                />
                <div className={`timerbar-label ${timerColor}`}>{timeLeft}s</div>
            </div>
            <div className="player-info">
                <span className={`score-label${scoreAnim ? ' score-anim' : ''}`}>Score: {playerScore}</span>
                <div className="lives">
                    {Array.from({ length: playerLives }).map((_, i) => (
                        <span key={i} className={`life-icon${lifeAnim && i === playerLives - 1 ? ' life-anim' : ''}`}>❤️</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

GameHeader.propTypes = {
    gameSettings: PropTypes.object.isRequired,
    isLocalMode: PropTypes.bool.isRequired,
    activeGameState: PropTypes.object,
    playerScore: PropTypes.number,
    playerLives: PropTypes.number
};

export default GameHeader;
