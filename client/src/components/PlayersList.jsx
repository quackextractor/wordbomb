import React from 'react';
import PropTypes from 'prop-types';

function PlayersList({ activePlayers, activeGameState }) {
    return (
        <div className="players-container">
            <h3>Players</h3>
            <div className="players-grid">
                {activePlayers.map(p => (
                    <div
                        key={p.id}
                        className={`player-card ${activeGameState?.currentTurn === p.id ? 'current-turn' : ''}`}
                    >
                        {p.avatar ? (
                            <img src={p.avatar || "/placeholder.svg"} alt={p.nickname || p.name} className="player-avatar"/>
                        ) : (
                            <div
                                className="player-avatar-placeholder"
                                style={{backgroundColor: p.color}}
                            >
                                {(p.nickname || p.name || '').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="player-details">
                            <span className="player-name">{p.nickname || p.name}</span>
                            <span className="player-score">Score: {activeGameState?.scores[p.id] || 0}</span>
                            <div className="player-lives">
                                {Array.from({length: activeGameState?.lives[p.id] || 3}).map((_, i) => (
                                    <span key={i} className="life-icon-small">❤️</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

PlayersList.propTypes = {
    activePlayers: PropTypes.array.isRequired,
    activeGameState: PropTypes.object
};

export default PlayersList;
