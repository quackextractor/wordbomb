import React from 'react';
import PropTypes from 'prop-types';
import '../assets/css/InfoModal.css';

function WordDefinitionsPanel({ wordDefinitions }) {
    return (
        <div className="definitions-panel">
            <h3 className="definitions-title">Recent Words & Definitions</h3>
            <div className="definitions-list">
                {wordDefinitions.length === 0 && (
                    <div className="definition-empty">No words submitted yet.</div>
                )}
                {wordDefinitions.map(({ word, definitions }, idx) => (
                    <div className="wordcontainer" key={word + idx}>
                        <div className="word-title">{word}</div>
                        <ul className="word-def-list">
                            {definitions.length > 0 ? (
                                definitions.map((def, i) => (
                                    <li className="word-def-item" key={i}>{def}</li>
                                ))
                            ) : (
                                <li className="word-def-item">No definition found.</li>
                            )}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

WordDefinitionsPanel.propTypes = {
    wordDefinitions: PropTypes.arrayOf(
        PropTypes.shape({
            word: PropTypes.string.isRequired,
            definitions: PropTypes.arrayOf(PropTypes.string).isRequired
        })
    ).isRequired
};

export default WordDefinitionsPanel;
