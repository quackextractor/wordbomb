import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import '../assets/css/WordDefinitionsPanel.css';

function WordDefinitionsPanel({ wordDefinitions }) {
    const [displayedDefs, setDisplayedDefs] = useState(wordDefinitions);
    const [isShifting, setIsShifting] = useState(false);
    const listRef = useRef(null);
    const prevWords = useRef(wordDefinitions.map(wd => wd.word));

    useEffect(() => {
        // If a new word is added and panel is full, animate out the last card, then shift
        if (
            wordDefinitions.length === 4 &&
            displayedDefs.length === 4 &&
            wordDefinitions[0].word !== prevWords.current[0]
        ) {
            setIsShifting(true);
            // Wait for fade-out animation (300ms), then update displayedDefs
            setTimeout(() => {
                setDisplayedDefs(wordDefinitions);
                setIsShifting(false);
            }, 300);
        } else {
            setDisplayedDefs(wordDefinitions);
        }
        prevWords.current = wordDefinitions.map(wd => wd.word);
    }, [wordDefinitions]);

    return (
        <div className="definitions-panel-horizontal game-content-like wider-panel">
            <h3 className="definitions-title">Recent Words & Definitions</h3>
            <div
                className={`definitions-list-horizontal${isShifting ? ' shift-out' : ''}`}
                ref={listRef}
            >
                {displayedDefs.length === 0 && (
                    <div className="definition-empty">No words submitted yet.</div>
                )}
                {displayedDefs.map(({ word, definitions }, idx) => (
                    <div
                        className={
                            'wordcontainer-horizontal' +
                            (isShifting && idx === 3 ? ' fade-out' : '')
                        }
                        key={word + idx}
                    >
                        <div className="word-title">{word}</div>
                        <ul className="word-def-list">
                            {definitions.length > 0 ? (
                                definitions.map((def, i) => (
                                    <React.Fragment key={i}>
                                        <li className="word-def-item">{def}</li>
                                        {i < definitions.length - 1 && <hr className="def-separator" />}
                                    </React.Fragment>
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
