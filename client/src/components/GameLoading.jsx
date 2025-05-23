import PropTypes from "prop-types"

function GameLoading({message, error}) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card p-8 max-w-md w-full text-center">
                <div className="mb-6 flex justify-center">
                    <div
                        className="w-16 h-16 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
                <h2 className="text-xl font-bold mb-4">{message}</h2>
                {error && (
                    <div
                        className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm animate-slide-in">
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}

GameLoading.propTypes = {
    message: PropTypes.string.isRequired,
    error: PropTypes.string,
}

export default GameLoading
