import { useState, useCallback, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { socket } from "../socket";
import { useParams } from "react-router-dom";

export default function ChessGame() {
  const { roomId } = useParams();
  const [game, setGame] = useState(new Chess());
  const [moveLog, setMoveLog] = useState([]);
  const [myColor, setMyColor] = useState(null);
  const [turn, setTurn] = useState("white");
  const [isConnected, setIsConnected] = useState(false);
  const [gameStarted, setgameStarted] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Run only once
    const handleColor = (color) => {
      console.log("Received color:", color);
      setMyColor(color);
    };

    const handleOpponentMove = (data) => {
      const { move } = data;
      const updatedGame = new Chess(game.fen());
      updatedGame.move({
        from: move.from,
        to: move.to,
        promotion: "q",
      });
      setGame(updatedGame);
      setTurn(updatedGame.turn() === "w" ? "white" : "black");
    };

    socket.on("player-color", handleColor);
    socket.on("opponent-move", handleOpponentMove);

    return () => {
      socket.off("player-color", handleColor);
      socket.off("opponent-move", handleOpponentMove);
    };
  }, []); // <-- empty dependency!!! VERY IMPORTANT

  useEffect(() => {
    console.log("Updated myColor:", myColor);
  }, [myColor]);

  // --- Prevent page refresh ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const onDrop = useCallback(
    (sourceSquare, targetSquare) => {
      if (turn !== myColor) return false; // enforce turn

      const newGame = new Chess(game.fen());
      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
      if (!move) return false;

      setGame(newGame);
      setMoveLog((prev) => [
        ...prev,
        `${myColor === "white" ? "White" : "Black"}: ${move.san}`,
      ]);
      setTurn(newGame.turn() === "w" ? "white" : "black");

      socket.emit("move", {
        roomId,
        move: {
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
          san: move.san,
          color: myColor === "white" ? "w" : "b",
        },
      });

      return true;
    },
    [game, myColor, turn, roomId]
  );

  const getGameStatus = () => {
    if (game.isGameOver()) {
      if (game.isCheckmate()) return "Checkmate!";
      if (game.isDraw()) return "Draw!";
      if (game.isStalemate()) return "Stalemate!";
      return "Game Over!";
    }
    if (game.inCheck()) return "Check!";
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  };

  return (
    <div className="max-w-[1200px] text-white mx-auto p-5 flex gap-5 flex-col md:flex-row">
      <div className="flex-2 max-w-[600px]">
        <div
          className={`text-center text-xl mb-4 ${game.inCheck() ? "text-red-600" : "text-white"
            }`}
        >
          {getGameStatus()}
        </div>

        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardWidth={500}
          boardOrientation={myColor === "black" ? "black" : "white"}
          customBoardStyle={{
            borderRadius: "0.5rem",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          }}
          customDarkSquareStyle={{ backgroundColor: "#779952" }}
          customLightSquareStyle={{ backgroundColor: "#edeed1" }}
        />
      </div>

      <div className="h-fit p-4 rounded-2xl  bg-amber-300 text-black">
        this is {myColor}
      </div>

      <div className="flex-1 border max-h-[94vh] scroll-auto overflow-y-auto border-gray-300 rounded p-4">
        <h2 className="text-lg mb-4 text-center">Move History</h2>
        <div className="h-[90%] overflow-y-auto border border-gray-200 p-2">
          {moveLog.length > 0 ? (
            moveLog.map((move, index) => (
              <div key={index} className="p-2 border-b border-gray-200">
                {`${Math.floor(index / 2) + 1}. ${move}`}
              </div>
            ))
          ) : (
            <div className="text-center italic text-gray-500">No moves yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
