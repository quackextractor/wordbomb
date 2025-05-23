"use client"

import PropTypes from "prop-types"
import {useEffect, useRef, useState} from "react"

function TimerBar({maxTime, timeLeft}) {
    const [displayTime, setDisplayTime] = useState(timeLeft)
    const rafRef = useRef(null)

    useEffect(() => {
        // sanitize inputs
        const validMax = Math.max(1, maxTime)
        const validLeft = Math.max(0, Math.min(validMax, timeLeft))

        // compute when the timer should hit zero
        const endTs = Date.now() + validLeft * 1000

        const tick = () => {
            const remainingSec = (endTs - Date.now()) / 1000
            setDisplayTime(Math.max(0, remainingSec))

            if (remainingSec > 0) {
                rafRef.current = requestAnimationFrame(tick)
            }
        }

        // start animation
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(tick)

        // cleanup on unmount or next effect
        return () => cancelAnimationFrame(rafRef.current)
    }, [timeLeft, maxTime])

    // compute percentage for width
    const pct = Math.max(0, Math.min(100, (displayTime / maxTime) * 100))

    // choose colors / pulsing exactly as before
    let timerColor = "bg-green-500"
    let textColor = "text-green-200"
    let pulseClass = ""
    if (pct <= 20) {
        timerColor = "bg-red-500"
        textColor = "text-red-200"
        pulseClass = "animate-pulse"
    } else if (pct <= 50) {
        timerColor = "bg-yellow-500"
        textColor = "text-yellow-200"
    }

    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
        <span className={`text-sm font-medium ${textColor} ${pulseClass}`}>
          Time Remaining
        </span>
                <span className={`text-sm font-bold ${textColor} ${pulseClass}`}>
          {Math.ceil(displayTime)}s
        </span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${timerColor} ${pulseClass}`}
                    style={{
                        width: `${pct}%`,
                        transition: "width 0.1s linear", // tiny smoothing if you like
                    }}
                />
            </div>
        </div>
    )
}

TimerBar.propTypes = {
    maxTime: PropTypes.number.isRequired,
    timeLeft: PropTypes.number.isRequired,
}

export default TimerBar
