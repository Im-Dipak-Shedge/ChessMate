import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function ChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [moveLog, setMoveLog] = useState([]);

  const onDrop = useCallback(
    (sourceSquare, targetSquare) => {
      const newGame = new Chess(game.fen());
      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
      if (!move) return false;

      setGame(newGame);

      const moveNotation = `${game.turn() === "w" ? "Black" : "White"}: ${
        move.san
      }`;
      setMoveLog((prev) => [...prev, moveNotation]);

      return true;
    },
    [game]
  );

  const resetGame = () => {
    setGame(new Chess());
    setMoveLog([]);
  };

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
    <div className="max-w-[1200px] text-white  mx-auto p-5 flex gap-5 flex-col md:flex-row">
      {/* Chessboard Section */}
      <div className="flex-2 max-w-[600px]">
        <div
          className={`text-center text-xl mb-4 ${
            game.inCheck() ? "text-red-600" : "text-white"
          }`}
        >
          {getGameStatus()}
        </div>

        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardWidth={500}
          customBoardStyle={{
            borderRadius: "0.5rem",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          }}
          customDarkSquareStyle={{ backgroundColor: "#779952" }}
          customLightSquareStyle={{ backgroundColor: "#edeed1" }}
        />

        <button
          onClick={resetGame}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          New Game
        </button>
      </div>

      {/* Move Log Section */}
      <div className="flex-1 border  max-h-[94vh] scroll-auto overflow-y-auto border-gray-300 rounded p-4">
        <h2 className="text-lg mb-4 text-center">Move History</h2>
        <div className="h-[90%] overflow-y-auto border border-gray-200 p-2">
          {moveLog.length > 0 ? (
            moveLog.map((move, index) => (
              <div key={index} className="p-2 border-b  border-gray-200 ">
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
