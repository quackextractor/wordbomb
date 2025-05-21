import React from 'react';
import {useNavigate} from 'react-router-dom';
import PropTypes from 'prop-types';
import '../assets/css/ModeSelect.css';

/**
 * Mode selection screen for choosing game mode
 */
function ModeSelect({player, gameSettings, setGameSettings}) {
    const navigate = useNavigate();

    const modes = [
        {
            id: 'single',
            name: 'Single Player',
            description: 'Play solo and challenge yourself to beat your high score!'
        },
        {
            id: 'local',
            name: 'Local Multiplayer',
            description: 'Play with friends on the same device, taking turns.'
        },
        {
            id: 'online',
            name: 'Online Multiplayer',
            description: 'Play with friends online in real-time.'
        },
        {
            id: 'wordmaster',
            name: 'Wordmaster',
            description: 'Elimination mode! Last player standing wins.'
        }
    ];

    const handleModeSelect = async (mode) => {
        try {
            setGameSettings(prev => ({
                ...prev,
                mode,
                isHost: true
            }));
            navigate('/game', {
                state: {
                    mode,
                    isHost: true
                }
            });
        } catch (error) {
            console.error('Error selecting mode:', error);
        }
    };

    return (
        <div className="mode-select-container">
            <h1 className="mode-select-title">Select Game Mode</h1>

            <div className="modes-grid">
                {modes.map(mode => (
                    <div
                        key={mode.id}
                        className="mode-card"
                        onClick={() => handleModeSelect(mode.id)}
                    >
                        <h2>{mode.name}</h2>
                        <p>{mode.description}</p>
                    </div>
                ))}
            </div>

            <button
                className="back-button"
                onClick={() => navigate('/')}
            >
                Back to Lobby
            </button>
        </div>
    );
}

ModeSelect.propTypes = {
    player: PropTypes.object.isRequired,
    gameSettings: PropTypes.object.isRequired,
    setGameSettings: PropTypes.func.isRequired
};

export default ModeSelect;