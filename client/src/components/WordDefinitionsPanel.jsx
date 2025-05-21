import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../assets/css/WordDefinitionsPanel.css';

function WordDefinitionsPanel({ wordDefinitions }) {
    const prevLength = useRef(wordDefinitions.length);
    const listRef = useRef(null);
    const prevWords = useRef(wordDefinitions.map(wd => wd.word));

    useEffect(() => {
        if (!listRef.current) return;
        // If a new word is added and panel is not full, play slide-new-left
        if (wordDefinitions.length > prevLength.current && wordDefinitions.length <= 4) {
            listRef.current.classList.add('slide-new-left');
            const handle = () => {
                listRef.current.classList.remove('slide-new-left');
            };
            listRef.current.addEventListener('animationend', handle, { once: true });
        } else if (
            wordDefinitions.length === 4 &&
            prevLength.current === 4 &&
            wordDefinitions[0].word !== prevWords.current[0] // new word pushed in
        ) {
            // Panel is full, play shift-full animation
            listRef.current.classList.add('shift-full');
            const handle = () => {
                listRef.current.classList.remove('shift-full');
            };
            listRef.current.addEventListener('animationend', handle, { once: true });
        }
        prevLength.current = wordDefinitions.length;
        prevWords.current = wordDefinitions.map(wd => wd.word);
    }, [wordDefinitions]);

    return (
        <div className="definitions-panel-horizontal game-content-like">
            <h3 className="definitions-title">Recent Words & Definitions</h3>
            <div className="definitions-list-horizontal" ref={listRef}>
                {wordDefinitions.length === 0 && (
                    <div className="definition-empty">No words submitted yet.</div>
                )}
                {wordDefinitions.map(({ word, definitions }, idx) => (
                    <div className="wordcontainer-horizontal" key={word + idx}>
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
