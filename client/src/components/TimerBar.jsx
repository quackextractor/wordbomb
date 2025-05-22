import PropTypes from "prop-types"

function TimerBar({ maxTime, timeLeft }) {
    let percent = timeLeft <= 0 ? 0 : (timeLeft / maxTime) * 100
    percent = Math.max(0, Math.min(100, percent))

    // Determine color based on time remaining
    let timerColor = "bg-green-500"
    let textColor = "text-green-200"

    if (percent <= 33) {
        timerColor = "bg-red-500"
        textColor = "text-red-200"
    } else if (percent <= 66) {
        timerColor = "bg-yellow-500"
        textColor = "text-yellow-200"
    }

    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-medium ${textColor}`}>Time Remaining</span>
                <span className={`text-sm font-bold ${textColor}`}>{timeLeft}s</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-200 ${timerColor}`}
                    style={{ width: `${percent}%` }}
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
