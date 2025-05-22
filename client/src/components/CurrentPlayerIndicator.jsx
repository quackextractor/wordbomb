"use client"

function CurrentPlayerIndicator({ currentPlayer, players }) {
  if (!currentPlayer) return null

  return (
    <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 mb-4 animate-pulse-slow">
      <div className="flex items-center justify-center">
        <div className="flex items-center">
          {currentPlayer.avatar ? (
            <img
              src={currentPlayer.avatar || "/placeholder.svg"}
              alt={currentPlayer.nickname}
              className="w-10 h-10 rounded-full mr-3 border-2 border-purple-500"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full mr-3 flex items-center justify-center text-lg font-bold border-2 border-purple-500"
              style={{ backgroundColor: currentPlayer.color }}
            >
              {currentPlayer.nickname.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <span className="font-bold text-lg">{currentPlayer.nickname}'s Turn</span>
            <p className="text-white/70 text-sm">Pass the device to this player</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CurrentPlayerIndicator
