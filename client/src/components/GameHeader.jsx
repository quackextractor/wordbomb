import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

function GameHeader({ gameSettings, isLocalMode, playerScore, playerLives }) {
    const [prevScore, setPrevScore] = useState(playerScore);
    const [scoreAnim, setScoreAnim] = useState(false);
    const [prevLives, setPrevLives] = useState(playerLives);
    const [lifeAnim, setLifeAnim] = useState(false);

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
    playerScore: PropTypes.number,
    playerLives: PropTypes.number
};

export default GameHeader;
