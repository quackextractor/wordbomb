function WordpieceDisplay({wordpiece}) {
    return (
        <div className="text-center mb-6">
            <h2 className="text-lg font-medium text-white/70 mb-2">Current Wordpiece:</h2>
            <div
                className="text-4xl md:text-5xl pb-1 font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text animate-pulse-custom">
                {wordpiece}
            </div>
        </div>
    )
}

export default WordpieceDisplay
