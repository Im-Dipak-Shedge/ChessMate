import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { socket } from "../socket";

export default function WaitingRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [myColor, setMyColor] = useState(null);

  useEffect(() => {
    const join = () => {
      console.log("Joining room:", roomId);
      socket.emit("join-room", roomId);
    };

    if (socket.connected) {
      join();
    } else {
      socket.once("connect", join);
    }

    // RECEIVE COLOR
    socket.on("player-color", (color) => {
      console.log("Assigned color:", color);
      setMyColor(color);
      window.assignedColor = color; // store color safely
    });

    // BOTH PLAYERS READY → SEND COLOR + GO TO GAME
    socket.on("both-joined", () => {
      console.log("Both players joined → starting game");
      navigate(`/game/${roomId}`, { state: { color: window.assignedColor } });
    });

    socket.on("room-full", () => {
      alert("Room is full!");
      navigate("/");
    });

    return () => {
      socket.off("player-color");
      socket.off("both-joined");
      socket.off("room-full");
      socket.off("connect", join);
    };
  }, [roomId, navigate]); // ✔️ FIXED

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl text-center">
        <h1 className="text-3xl font-bold text-white mb-4 tracking-wide">
          ♟️ Waiting for Opponent
        </h1>

        <p className="text-white/70 mb-6 text-sm">
          Share this room code with your friend
        </p>

        <div className="bg-white/20 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-6">
          <p className="text-white text-2xl font-mono tracking-widest">
            {roomId}
          </p>
        </div>

        <button
          onClick={() => navigator.clipboard.writeText(roomId)}
          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white py-3 rounded-xl text-lg font-semibold shadow-lg mb-8 cursor-pointer transition-all"
        >
          Copy Room Code
        </button>

        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-10 w-10 border-4 border-white/30 border-t-white rounded-full"></div>
          <p className="text-white/70">Waiting for another player to join...</p>

          {myColor && (
            <p className="text-white text-lg mt-2">
              Your color: <b>{myColor}</b>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
