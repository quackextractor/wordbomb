import React, { useState, useEffect, useRef } from 'react';
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

  // Handle input change
  const handleChange = (e) => {
    setInputValue(e.target.value);
    setError('');
  };

  // Handle form submission
  const handleSubmit = (e) => {
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
            placeholder={disabled ? "Wait for your turn..." : "Type a word containing the wordpiece"}
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
        <p>Type any word containing <strong>"{wordpiece}"</strong></p>
      </div>
    </div>
  );
}

export default WordInput;