import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {io} from 'socket.io-client';
import AvatarCanvas from '../components/AvatarCanvas';
import '../assets/css/Lobby.css';

/**
 * Lobby component for player setup and game joining
 */
function Lobby({player, setPlayer}) {
    const [nickname, setNickname] = useState(player.nickname || '');
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState('');
    const [avatarColor, setAvatarColor] = useState(player.color || '#4287f5');
    const [socket, setSocket] = useState(null);
    const [isCheckingRoom, setIsCheckingRoom] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
        const newSocket = io(socketUrl, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, []);

    const handleAvatarCreated = (avatarDataUrl) => {
        setPlayer(prev => ({...prev, avatar: avatarDataUrl}));
    };

    const handleColorChange = (e) => {
        const color = e.target.value;
        setAvatarColor(color);
        setPlayer(prev => ({...prev, color}));
    };

    const handleNicknameChange = (e) => {
        setNickname(e.target.value);
    };

    const handleRoomIdChange = (e) => {
        setRoomId(e.target.value);
        setError('');
    };

    const handleCreateGame = () => {
        if (!validateNickname()) return;

        setPlayer(prev => ({
            ...prev,
            nickname,
            id: prev.id || Math.random().toString(36).substring(2, 9)
        }));

        navigate('/mode-select');
    };

    const handleJoinGame = () => {
        if (!validateNickname()) return;
        if (!roomId.trim()) {
            setError('Please enter a room ID');
            return;
        }

        setIsCheckingRoom(true);

        if (socket && !socket.connected) {
            socket.connect();
        }

        if (socket) {
            socket.emit('room:check', {roomId}, (response) => {
                setIsCheckingRoom(false);

                if (response.error) {
                    setError(response.error);
                    return;
                }

                if (!response.exists) {
                    setError('Room does not exist');
                    return;
                }

                setPlayer(prev => ({
                    ...prev,
                    nickname,
                    id: prev.id || Math.random().toString(36).substring(2, 9)
                }));

                navigate('/game', {
                    state: {
                        roomId,
                        isHost: false,
                        mode: 'online'
                    }
                });
            });
        } else {
            setError('Unable to connect to server');
            setIsCheckingRoom(false);
        }
    };

    const validateNickname = () => {
        if (!nickname.trim()) {
            setError('Please enter a nickname');
            return false;
        }
        if (nickname.length < 3 || nickname.length > 15) {
            setError('Nickname must be between 3 and 15 characters');
            return false;
        }
        setError('');
        return true;
    };

    return (
        <div className="lobby-container">
            <div className="lobby-card">
                <h1 className="lobby-title">WordBomb Kingfish</h1>

                <div className="avatar-section">
                    <h2>Create Your Avatar</h2>
                    <div className="color-picker">
                        <label htmlFor="avatar-color">Avatar Color:</label>
                        <input
                            type="color"
                            id="avatar-color"
                            value={avatarColor}
                            onChange={handleColorChange}
                        />
                    </div>
                    <AvatarCanvas
                        color={avatarColor}
                        onAvatarCreated={handleAvatarCreated}
                    />
                </div>

                <div className="nickname-section">
                    <label htmlFor="nickname">Nickname:</label>
                    <input
                        type="text"
                        id="nickname"
                        value={nickname}
                        onChange={handleNicknameChange}
                        placeholder="Enter your nickname"
                        maxLength={15}
                    />
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="buttons-section">
                    <button
                        className="create-game-btn"
                        onClick={handleCreateGame}
                    >
                        Create Game
                    </button>

                    <div className="join-game-section">
                        <input
                            type="text"
                            value={roomId}
                            onChange={handleRoomIdChange}
                            placeholder="Enter Room ID"
                        />
                        <button
                            className="join-game-btn"
                            onClick={handleJoinGame}
                            disabled={isCheckingRoom}
                        >
                            {isCheckingRoom ? 'Checking...' : 'Join Game'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Lobby;