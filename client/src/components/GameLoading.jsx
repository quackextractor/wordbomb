import React from 'react';

function GameLoading({ message, error }) {
    return (
        <div className="game-loading">
            <h2>{message}</h2>
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default GameLoading;
