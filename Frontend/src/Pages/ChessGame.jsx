import { useState, useCallback, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { socket } from "../socket";
import { useParams, useLocation } from "react-router-dom";
import Navbar from "./../Components/Navbar";
import { useNavigate } from "react-router-dom";
import { FaChessKing, FaChessPawn } from "react-icons/fa";
import { SiChessdotcom } from "react-icons/si";

export default function ChessGame() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [game, setGame] = useState(new Chess());
  const [moveLog, setMoveLog] = useState([]);
  const [myColor, setMyColor] = useState(null);
  const [turn, setTurn] = useState("white");
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [OpponentName, setOpponentName] = useState("");
  const [showPopup, setShowPopup] = useState(true);
  const [opponentLeft, setOpponentLeft] = useState(false);

  // Keep latest game in ref
  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const handleName = () => {
    if (!playerName.trim()) return;
    socket.emit("playerName", { roomId, name: playerName });
    setShowPopup(false);
  };

  // GET PLAYER COLOR
  useEffect(() => {
    if (location.state?.color) {
      setMyColor(location.state.color);
    }
  }, [location]);

  // SOCKET — OPPONENT MOVE
  useEffect(() => {
    const handleOpponentMove = (move) => {
      const current = new Chess(gameRef.current.fen());

      const ok = current.move(move);
      if (!ok) return;

      setGame(current);
      setTurn(current.turn() === "w" ? "white" : "black");
      setMoveLog((prev) => [
        ...prev,
        `${move.color === "w" ? "White" : "Black"}: ${move.san}`,
      ]);

      if (current.isGameOver()) setGameOver(true);
    };

    socket.on("opponent-move", handleOpponentMove);
    return () => socket.off("opponent-move", handleOpponentMove);
  }, []);

  // PREVENT PAGE REFRESH
  useEffect(() => {
    const prevent = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, []);

  // CHESS MOVE HANDLER
  const onDrop = useCallback(
    (from, to) => {
      if (!playerName) return false; // <-- NEW: block until name entered
      if (gameOver) return false;
      if (turn !== myColor) return false;

      const newGame = new Chess(gameRef.current.fen());
      const move = newGame.move({ from, to, promotion: "q" });

      if (!move) return false;

      setGame(newGame);
      setTurn(newGame.turn() === "w" ? "white" : "black");

      setMoveLog((prev) => [
        ...prev,
        `${myColor === "white" ? "White" : "Black"}: ${move.san}`,
      ]);

      socket.emit("move", {
        roomId,
        move: {
          from,
          to,
          promotion: "q",
          san: move.san,
          color: myColor === "white" ? "w" : "b",
        },
      });

      if (newGame.isGameOver()) setGameOver(true);
      return true;
    },
    [playerName, myColor, turn, gameOver, roomId]
  );

  //handling players name
  useEffect(() => {
    socket.on("OpponentName", ({ name }) => {
      if (name !== playerName) {
        setOpponentName(name);
      }
    });

    return () => {
      socket.off("OpponentName");
    };
  }, [playerName]);

  useEffect(() => {
    socket.on("opponent-left", () => {
      setOpponentLeft(true);
    });

    return () => {
      socket.off("opponent-left");
    };
  }, []);

  useEffect(() => {
    if (opponentLeft) {
      const timer = setTimeout(() => {
        // navigate("/"); // go back to home
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [opponentLeft, navigate]);

  // GAME STATUS
  const getGameStatus = () => {
    if (game.isCheckmate()) return "Checkmate!";
    if (game.isStalemate()) return "Stalemate!";
    if (game.isDraw()) return "Draw!";
    if (game.inCheck()) return "Check!";
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  };

  return (
    <>
      {/* NAVBAR */}
      <Navbar />
      {/* NAME POPUP */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-50">
          <div className="w-[90%] max-w-sm bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-2xl shadow-2xl">
            <h2 className="text-2xl font-bold text-white text-center mb-5">
              Enter Your Name
            </h2>

            <input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/20 text-white placeholder-white/40 
          focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-lg transition-all"
            />

            <button
              onClick={handleName}
              className="w-full mt-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
          text-white py-3 rounded-xl font-semibold shadow-lg transition-all"
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {opponentLeft && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-[90%] max-w-sm bg-black/70  border  p-6 rounded-2xl shadow-lg text-white text-center">
            <h2 className="text-2xl font-bold mb-3 text-red-500">
              {OpponentName} Left the game
            </h2>
            <p className="mb-6 text-gray-300">
              The other player has left the game. You will be redirected to the
              home page.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-6 rounded-lg shadow transition-colors"
            >
              Go Home Now
            </button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-[90%] max-w-md bg-gray-900 p-6 rounded-3xl shadow-2xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">
              {game.isCheckmate()
                ? `${turn === "white" ? "Black" : "White"} Wins!`
                : game.isDraw()
                ? "Draw!"
                : "Game Over"}
            </h2>
            {game.isCheckmate() && (
              <p className="mb-6 text-lg">
                Checkmate! Congratulations to{" "}
                <span className="font-semibold">
                  {turn === "white" ? "Black" : "White"}
                </span>
              </p>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate("/")}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl font-semibold transition"
              >
                Go Home
              </button>
              <button
                onClick={() => setGameOver(false)}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl font-semibold transition"
              >
                Show Move Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN UI (disabled while popup is open) */}
      <div
        className={`max-w-[1200px] mt-5 text-white mx-auto flex gap-5 flex-col md:flex-row ${
          showPopup ? "opacity-100 pointer-events-none" : ""
        }`}
      >
        <div className="flex-2 max-w-[600px]">
          <div
            className={`text-center text-lg font-semibold px-4 py-2 rounded-lg w-max mx-auto mb-4 
    ${
      game.isCheckmate()
        ? "bg-red-700 text-white"
        : game.isStalemate() || game.isDraw()
        ? "bg-yellow-600 text-white"
        : game.inCheck()
        ? "bg-red-500 text-white animate-pulse"
        : "bg-white/10 text-white"
    }`}
          >
            {game.isCheckmate()
              ? "Checkmate!"
              : game.isStalemate()
              ? "Stalemate!"
              : game.isDraw()
              ? "Draw!"
              : game.inCheck()
              ? `${game.turn() === "w" ? "White" : "Black"} in Check!`
              : `${game.turn() === "w" ? "White" : "Black"} to move`}
          </div>

          {/* opponentnamediv */}
          <div className="flex items-center gap-3 p-2 mb-0.5 w-max rounded-lg shadow-md">
            <div
              className={`w-6 h-6 flex items-center justify-center  rounded-sm ${
                myColor === "black"
                  ? "text-white bg-[#779952]"
                  : "text-black bg-[#edeed1]"
              }`}
            >
              <SiChessdotcom className="w-4 h-4" />
            </div>
            <span className="text-white font-semibold">
              {OpponentName || "Waiting..."}
            </span>
          </div>

          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardWidth={Math.min(window.innerWidth - 2, 510)}
            boardOrientation={myColor === "black" ? "black" : "white"}
            customBoardStyle={{
              borderRadius: "0",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            }}
            customDarkSquareStyle={{ backgroundColor: "#779952" }}
            customLightSquareStyle={{ backgroundColor: "#edeed1" }}
          />

          {/* theplayers div  */}
          <div className="flex items-center gap-3 p-2 rounded-lg shadow-md w-max">
            <div
              className={`w-6 h-6 flex items-center justify-center  rounded-sm ${
                myColor === "white"
                  ? "text-white bg-[#779952]"
                  : "text-black bg-[#edeed1]"
              }`}
            >
              <SiChessdotcom className=" w-4 h-4" />
            </div>
            <span className="text-white font-semibold">
              {playerName || "Waiting..."}
            </span>
          </div>
        </div>
        <div className="flex-1 border max-h-[94vh] overflow-y-auto border-gray-300 rounded p-4">
          <h2 className="text-lg mb-4 text-center">Move History</h2>
          <div className="h-[90%] overflow-y-auto border border-gray-200 p-2">
            {moveLog.length > 0 ? (
              moveLog.map((move, index) => (
                <div key={index} className="p-2 border-b border-gray-200">
                  {`${Math.floor(index / 2) + 1}. ${move}`}
                </div>
              ))
            ) : (
              <div className="text-center italic text-gray-500">
                No moves yet
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
