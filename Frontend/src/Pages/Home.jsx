import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = () => {
    const newRoomCode = generateRoomCode();
    navigate(`/room/${newRoomCode}`);
  };

  const joinRoom = () => {
    if (!roomCode.trim()) return alert("Please enter a room id");

    navigate(`/room/${roomCode.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black  flex items-center justify-center  p-6">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-white text-center mb-8 tracking-wide">
          ♟️ Chess Multiplayer
        </h1>

        {/* Create Room */}
        <button
          onClick={createRoom}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl cursor-pointer text-lg font-semibold shadow-lg transition-all duration-200"
        >
          Create Room
        </button>

        <div className="my-8 flex items-center">
          <div className="flex-grow h-px bg-white/20"></div>
          <span className="mx-3 text-white/60 text-sm">OR</span>
          <div className="flex-grow h-px bg-white/20"></div>
        </div>

        {/* Join Room */}
        <div>
          <label className="text-white/80 text-sm">Enter Room Code</label>
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="e.g. 4F9P12"
            className="w-full mt-2 p-3 rounded-xl bg-white/20 font-bold text-white placeholder-white/40 
            focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-lg transition-all"
          />

          <button
            onClick={joinRoom}
            className="mt-4 w-full cursor-pointer bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-lg font-semibold shadow-lg transition-all"
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
