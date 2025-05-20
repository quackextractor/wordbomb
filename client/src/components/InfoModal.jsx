import React, {useEffect} from 'react';
import '../assets/css/InfoModal.css';

function InfoModal({word, definition, onClose}) {
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
    const formatDefinition = (def) => {
        if (!def) return 'No definition available.';
        if (typeof def === 'string') return def;
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
                    dangerouslySetInnerHTML={{__html: formatDefinition(definition)}}
                />
            </div>
        </div>
    );
}

export default InfoModal;