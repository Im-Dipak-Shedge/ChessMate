import { useParams } from "react-router-dom";
import { useEffect } from "react";

export default function WaitingRoom() {
  const { roomId } = useParams();

  useEffect(() => {
    // Example: listen for server event to start the game
    // socket.on("start-game", () => navigate(`/game/${roomId}`));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl text-center">
        <h1 className="text-3xl font-bold text-white mb-4 tracking-wide">
          ♟️ Waiting for Opponent
        </h1>

        <p className="text-white/70 mb-6 text-sm">
          Share this room code with your friend
        </p>

        {/* Room Code Box */}
        <div className="bg-white/20 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-6">
          <p className="text-white text-2xl font-mono tracking-widest">
            {roomId}
          </p>
        </div>

        {/* Copy Button */}
        <button
          onClick={() => navigator.clipboard.writeText(roomId)}
          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white py-3 rounded-xl text-lg font-semibold shadow-lg mb-8 transition-all"
        >
          Copy Room Code
        </button>

        {/* Loading Animation */}
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-10 w-10 border-4 border-white/30 border-t-white rounded-full"></div>
          <p className="text-white/70">Waiting for another player to join...</p>
        </div>
      </div>
    </div>
  );
}
