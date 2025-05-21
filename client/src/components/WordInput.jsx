import React, {useEffect, useRef, useState, forwardRef, useImperativeHandle} from 'react';
import axios from 'axios';
import '../assets/css/WordInput.css';
import {setDefinition} from '../utils/definitionUtils';
import PropTypes from 'prop-types';


const WordInput = forwardRef(function WordInput({onSubmit, disabled, wordpiece}, ref) {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');
    const [usedWords, setUsedWords] = useState(new Set());
    const [wordList, setWordList] = useState(null);
    const inputRef = useRef(null);

    useImperativeHandle(ref, () => ({
        clearUsedWords: () => setUsedWords(new Set())
    }), []);

    useEffect(() => {
        if (!disabled && inputRef.current) {
            inputRef.current.focus();
        }
    }, [disabled]);

    useEffect(() => {
        setInputValue('');
        setError('');
    }, [wordpiece]);

    // Load words.txt into memory once (client-side fetch)
    useEffect(() => {
        // Fetch words.txt from public/data or relative path
        fetch('/data/words.txt')
            .then(res => res.text())
            .then(text => {
                // Split by newlines, trim, and filter out empty lines
                const words = new Set(text.split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(Boolean));
                setWordList(words);
            });
    }, []);

    const validateWord = async (word) => {
        const term = word.trim().toLowerCase();

        if (usedWords.has(term)) {
            setError('Word can only be used once.');
            return false;
        }

        // Check against local word list first
        if (wordList && !wordList.has(term)) {
            setError('Word not found in local dictionary.');
            console.log(`Word "${term}" not found in local dictionary.`);
        } else {
            setError('');
            return true;
        }



        /*
        const blacklistedTerms = ["initialism", "slang", "dialects"];

        try {
            const response = await axios.get(import.meta.env.VITE_DATAMUSE_API_URL || 'https://api.datamuse.com/words', {
                params: {
                    sp: term,
                    md: 'd',
                    max: 5,
                },
            });

            const firstEntry = response.data[0];

            if (
                firstEntry &&
                firstEntry.word.toLowerCase() === term &&
                Array.isArray(firstEntry.defs) &&
                firstEntry.defs.length > 0
            ) {
                const firstDef = firstEntry.defs[0].toLowerCase();

                const isBlacklisted = blacklistedTerms.some(blacklisted =>
                    firstDef.includes(blacklisted.toLowerCase())
                );

                if (!isBlacklisted) {
                    setDefinition(firstDef);
                    return true;
                }
            }

            

            return false;

        } catch (err) {
            setError('Error validating word. Please try again.');
            return false;
        }

        */

        return false;
    };

        

    const handleChange = (e) => {
        setInputValue(e.target.value);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const word = inputValue.trim().toLowerCase();

        if (!word) {
            setError('Please enter a word');
            return;
        }

        if (!word.includes(wordpiece?.toLowerCase())) {
            setError(`Word must contain "${wordpiece}"`);
            return;
        }

        const isValid = await validateWord(word);
        if (!isValid) {
            // Only set error if not already set by validateWord
            if (!error && !usedWords.has(word)) {
                setError('Word not found in dictionary.');
            }
            return;
        }

        setUsedWords(prev => new Set(prev).add(word));
        onSubmit(word);
        setInputValue('');
    };

    return (
        <div className="word-input-container">
            <form onSubmit={handleSubmit}>
                <div className="input-wrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleChange}
                        placeholder={
                            disabled
                                ? 'Wait for your turn...'
                                : 'Type a word containing the wordpiece'
                        }
                        disabled={disabled}
                        autoComplete="off"
                        className={error ? 'error' : ''}
                    />
                    <button type="submit" disabled={disabled || !inputValue.trim()}>Submit</button>
                </div>
                {error && <div className="error-message">{error}</div>}
            </form>

            <div className="input-help">
                <p>Type any word containing <strong>"{wordpiece}"</strong></p>
            </div>
        </div>
    );
});

WordInput.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    wordpiece: PropTypes.string
};

export default WordInput;