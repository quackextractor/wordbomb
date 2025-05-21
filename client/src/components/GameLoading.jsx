import React from 'react';
import PropTypes from 'prop-types';

function GameLoading({ message, error }) {
    return (
        <div className="game-loading">
            <h2>{message}</h2>
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

GameLoading.propTypes = {
    message: PropTypes.string.isRequired,
    error: PropTypes.string
};

export default GameLoading;
