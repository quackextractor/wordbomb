import React from 'react';
import PropTypes from 'prop-types';

function PowerUpsPanel({ playerPowerUps, handleUsePowerUp, isPlayerTurn }) {
    if (!Object.keys(playerPowerUps).length) return null;
    return (
        <div className="power-ups-container">
            <h3>Power-ups</h3>
            <div className="power-ups-list">
                {Object.entries(playerPowerUps).map(([type, count]) => (
                    count > 0 && (
                        <div key={type} className="power-up-item">
                            <button
                                className="power-up-btn"
                                onClick={() => handleUsePowerUp(type)}
                                disabled={!isPlayerTurn}
                            >
                                {type === 'reverse_turn' && '🔄 Reverse Turn Order'}
                                {type === 'trap' && '🎯 Trap Opponent'}
                                {type === 'extra_wordpiece' && '➕ Extra Wordpiece'}
                                <span className="power-up-count">x{count}</span>
                            </button>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}

PowerUpsPanel.propTypes = {
    playerPowerUps: PropTypes.object.isRequired,
    handleUsePowerUp: PropTypes.func.isRequired,
    isPlayerTurn: PropTypes.bool.isRequired
};

export default PowerUpsPanel;
