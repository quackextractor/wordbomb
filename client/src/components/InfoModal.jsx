import React, { useEffect } from 'react';
import '../assets/css/InfoModal.css';

/**
 * Modal component for displaying word definitions
 */
function InfoModal({ word, definition, onClose }) {
  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Format definition for display
  const formatDefinition = (def) => {
    if (!def) return 'No definition available.';
    
    // If definition is already a string, return it
    if (typeof def === 'string') return def;
    
    // If definition is an object with parts of speech
    if (typeof def === 'object') {
      return Object.entries(def)
        .map(([partOfSpeech, meanings]) => {
          return `<strong>${partOfSpeech}</strong>: ${Array.isArray(meanings) ? meanings.join('; ') : meanings}`;
        })
        .join('<br><br>');
    }
    
    return 'No definition available.';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2 className="modal-title">{word}</h2>
        
        <div 
          className="modal-definition"
          dangerouslySetInnerHTML={{ __html: formatDefinition(definition) }}
        />
      </div>
    </div>
  );
}

export default InfoModal;