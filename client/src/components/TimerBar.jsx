"use client"

import PropTypes from "prop-types"
import { useEffect, useState } from "react"

function TimerBar({ maxTime, timeLeft }) {
  const [displayTime, setDisplayTime] = useState(timeLeft)
  const [isWarning, setIsWarning] = useState(false)

  // Smooth timer updates and validation
  useEffect(() => {
    // Validate and clamp the time values
    const validMaxTime = Math.max(1, maxTime || 15)
    const validTimeLeft = Math.max(0, Math.min(validMaxTime, timeLeft || 0))

    setDisplayTime(validTimeLeft)
    setIsWarning(validTimeLeft <= validMaxTime * 0.3) // Warning at 30% remaining
  }, [timeLeft, maxTime])

  let percent = displayTime <= 0 ? 0 : (displayTime / (maxTime || 15)) * 100
  percent = Math.max(0, Math.min(100, percent))

  // Determine color based on time remaining
  let timerColor = "bg-green-500"
  let textColor = "text-green-200"
  let pulseClass = ""

  if (percent <= 20) {
    timerColor = "bg-red-500"
    textColor = "text-red-200"
    pulseClass = "animate-pulse"
  } else if (percent <= 50) {
    timerColor = "bg-yellow-500"
    textColor = "text-yellow-200"
  }

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-sm font-medium ${textColor} ${pulseClass}`}>Time Remaining</span>
        <span className={`text-sm font-bold ${textColor} ${pulseClass}`}>{Math.ceil(displayTime)}s</span>
      </div>
      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${timerColor} ${pulseClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {isWarning && (
        <div className="text-center mt-1">
          <span className="text-xs text-red-300 animate-pulse">⚠️ Time running out!</span>
        </div>
      )}
    </div>
  )
}

TimerBar.propTypes = {
  maxTime: PropTypes.number.isRequired,
  timeLeft: PropTypes.number.isRequired,
}

export default TimerBar
