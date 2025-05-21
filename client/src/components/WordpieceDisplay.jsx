import React from 'react';

function WordpieceDisplay({ wordpiece }) {
    return (
        <div className="wordpiece-container">
            <h2>Current Wordpiece:</h2>
            <div className="wordpiece">{wordpiece}</div>
        </div>
    );
}

export default WordpieceDisplay;
