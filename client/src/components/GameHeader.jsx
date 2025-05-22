"use client"

import { useEffect, useState } from "react"
import PropTypes from "prop-types"
import HeartIcon from "./HeartIcon"

function GameHeader({ gameSettings, isLocalMode, playerScore, playerLives }) {
    const [prevScore, setPrevScore] = useState(playerScore)
    const [scoreAnim, setScoreAnim] = useState(false)
    const [prevLives, setPrevLives] = useState(playerLives)
    const [lifeAnim, setLifeAnim] = useState(false)
    const [animatingHeartIndex, setAnimatingHeartIndex] = useState(-1)

    // Score animation
    useEffect(() => {
        if (playerScore > prevScore) {
            setScoreAnim(true)
            setTimeout(() => setScoreAnim(false), 700)
        }
        setPrevScore(playerScore)
    }, [playerScore, prevScore])

    // Health animation
    useEffect(() => {
        if (playerLives < prevLives) {
            setLifeAnim(true)
            // Set the index of the heart that's being lost
            setAnimatingHeartIndex(playerLives)
            setTimeout(() => {
                setLifeAnim(false)
                setAnimatingHeartIndex(-1)
            }, 700)
        }
        setPrevLives(playerLives)
    }, [playerLives, prevLives])

    return (
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 mb-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="px-3 py-1 bg-purple-500/30 rounded-full text-sm font-medium">Mode: {gameSettings.mode}</div>
                {!isLocalMode && (
                    <div className="px-3 py-1 bg-indigo-500/30 rounded-full text-sm font-medium">Room: {gameSettings.roomId}</div>
                )}
            </div>
            <div className="flex items-center gap-6">
                <div className={`text-lg font-bold transition-all duration-300 ${scoreAnim ? "scale-125 text-green-400" : ""}`}>
                    Score: {playerScore}
                </div>
                <div className="flex">
                    {Array.from({ length: playerLives }).map((_, i) => (
                        <HeartIcon key={i} isAnimating={i === animatingHeartIndex} />
                    ))}
                    {lifeAnim && <HeartIcon key="lost-heart" isAnimating={true} />}
                </div>
            </div>
        </div>
    )
}

GameHeader.propTypes = {
    gameSettings: PropTypes.object.isRequired,
    isLocalMode: PropTypes.bool.isRequired,
    playerScore: PropTypes.number,
    playerLives: PropTypes.number,
}

export default GameHeader