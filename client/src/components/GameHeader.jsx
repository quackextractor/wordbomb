"use client"

import {useEffect, useRef, useState} from "react"
import PropTypes from "prop-types"
import HeartIcon from "./HeartIcon"

function GameHeader({gameSettings, isLocalMode, activeGameState, player}) {
    const [prevScore, setPrevScore] = useState(0)
    const [scoreAnim, setScoreAnim] = useState(false)
    const [prevLives, setPrevLives] = useState(3)
    const [lifeAnim, setLifeAnim] = useState(false)
    const [animatingHeartIndex, setAnimatingHeartIndex] = useState(-1)
    const animationTimeoutRef = useRef(null)

    // Get the current player's ID (in local multiplayer, this is the active player)
    const currentPlayerId = isLocalMode && activeGameState?.currentTurn ? activeGameState.currentTurn : player.id

    // Get the current player's score and lives
    const currentPlayerScore = activeGameState?.scores?.[currentPlayerId] || 0
    const currentPlayerLives = activeGameState?.lives?.[currentPlayerId] || 0

    // Find the current player object to get their name
    const currentPlayer =
        isLocalMode && gameSettings.localPlayers
            ? gameSettings.localPlayers.find((p) => p.id === currentPlayerId) || player
            : player

    // Score animation
    useEffect(() => {
        if (currentPlayerScore > prevScore) {
            setScoreAnim(true)
            const timeout = setTimeout(() => setScoreAnim(false), 700)
            return () => clearTimeout(timeout)
        }
        setPrevScore(currentPlayerScore)
    }, [currentPlayerScore, prevScore])

    // Health animation
    useEffect(() => {
        if (currentPlayerLives < prevLives) {
            setLifeAnim(true)
            // Set the index of the heart that's being lost
            setAnimatingHeartIndex(currentPlayerLives)

            // Clear any existing timeout to prevent conflicts
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current)
            }

            // Set new timeout and store the reference
            animationTimeoutRef.current = setTimeout(() => {
                setLifeAnim(false)
                setAnimatingHeartIndex(-1)
                animationTimeoutRef.current = null
            }, 700)

            // Cleanup function to clear timeout if component unmounts or effect runs again
            return () => {
                if (animationTimeoutRef.current) {
                    clearTimeout(animationTimeoutRef.current)
                    animationTimeoutRef.current = null
                }
            }
        }
        setPrevLives(currentPlayerLives)
    }, [currentPlayerLives, prevLives])

    // Reset animations when player changes
    useEffect(() => {
        setPrevScore(currentPlayerScore)
        setPrevLives(currentPlayerLives)
        setScoreAnim(false)
        setLifeAnim(false)
        setAnimatingHeartIndex(-1)

        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current)
            animationTimeoutRef.current = null
        }
    }, [currentPlayerId, currentPlayerScore, currentPlayerLives])

    return (
        <div
            className="bg-black/20 backdrop-blur-sm rounded-lg p-3 mb-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div
                    className="px-3 py-1 bg-purple-500/30 rounded-full text-sm font-medium">Mode: {gameSettings.mode}</div>
                {!isLocalMode && (
                    <div
                        className="px-3 py-1 bg-indigo-500/30 rounded-full text-sm font-medium">Room: {gameSettings.roomId}</div>
                )}
                {isLocalMode && (
                    <div className="px-3 py-1 bg-indigo-500/30 rounded-full text-sm font-medium">
                        Current Player: {currentPlayer.nickname || currentPlayer.name}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-6">
                <div
                    className={`text-lg font-bold transition-all duration-300 ${scoreAnim ? "scale-125 text-green-400" : ""}`}>
                    Score: {currentPlayerScore}
                </div>
                <div className="flex">
                    {Array.from({length: currentPlayerLives}).map((_, i) => (
                        <HeartIcon key={i} isAnimating={i === animatingHeartIndex}/>
                    ))}
                    {lifeAnim && <HeartIcon key="lost-heart" isAnimating={true}/>}
                </div>
            </div>
        </div>
    )
}

GameHeader.propTypes = {
    gameSettings: PropTypes.object.isRequired,
    isLocalMode: PropTypes.bool.isRequired,
    activeGameState: PropTypes.object,
    player: PropTypes.object.isRequired,
}

export default GameHeader
