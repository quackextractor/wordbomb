import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../assets/css/WordInput.css';

/**
 * Word input component for submitting words
 */
function WordInput({ onSubmit, disabled, wordpiece }) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Focus input when component mounts or disabled state changes
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Reset input when wordpiece changes
  useEffect(() => {
    setInputValue('');
    setError('');
  }, [wordpiece]);

  
  
  
  
  // Validate word against dictionary API
  const validateWord = async (word) => {
    const term = word.trim().toLowerCase();

    // Multiple blacklisted terms
    const blacklistedTerms = ["initialism"]; // Add more as needed

    try {
      const response = await axios.get('https://api.datamuse.com/words', {
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
          console.log('Word:', word, 'First definition:', firstDef);
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('Validation error:', err);
      return false;
    }
  };






  // Handle input change
  const handleChange = (e) => {
    setInputValue(e.target.value);
    setError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const word = inputValue.trim().toLowerCase();

    // Validate input
    if (!word) {
      setError('Please enter a word');
      return;
    }

    // Check if word contains the wordpiece
    if (!word.includes(wordpiece.toLowerCase())) {
      setError(`Word must contain "${wordpiece}"`);
      return;
    }

    // Check if word is valid dictionary word
    const isValid = await validateWord(word);
    if (!isValid) {
      setError('Invalid word - not in dictionary');
      return;
    }

    // Submit word
    onSubmit(word);

    // Clear input
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
            <button
                type="submit"
                disabled={disabled || !inputValue.trim()}
            >
              Submit
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </form>

        <div className="input-help">
          <p>
            Type any word containing <strong>"{wordpiece}"</strong>
          </p>
        </div>
      </div>
  );
}

export default WordInput;
