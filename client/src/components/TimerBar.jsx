import React from 'react';
import PropTypes from 'prop-types';
import '../assets/css/GameBoard.css';

function TimerBar({ maxTime, timeLeft }) {
    let percent = (timeLeft <= 1) ? 0 : (timeLeft / maxTime) * 100;
    percent = Math.max(0, Math.min(100, percent));
    let timerColor = 'timer-green';
    if (percent <= 33) timerColor = 'timer-red';
    else if (percent <= 66) timerColor = 'timer-yellow';

    return (
        <div className="timerbar-section">
            <div className={`timerbar-time-remaining ${timerColor}`}>{timeLeft}s</div>
            <div className="timerbar-outer">
                <div
                    className={`timerbar-inner ${timerColor}`}
                    style={{ width: `${percent}%` }}
                    data-timer-color={timerColor}
                />
            </div>
        </div>
    );
}

TimerBar.propTypes = {
    maxTime: PropTypes.number.isRequired,
    timeLeft: PropTypes.number.isRequired
};

export default TimerBar;
