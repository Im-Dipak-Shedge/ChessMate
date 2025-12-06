import { useState, useCallback, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { socket } from "../socket";
import { useParams, useLocation } from "react-router-dom";
import Navbar from "./../Components/Navbar";
import { useNavigate } from "react-router-dom";
import { SiChessdotcom } from "react-icons/si";
import Interaction from "./../Components/Interaction";
import Draggable from "react-draggable";

export default function ChessGame() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const chessComPieces = {
    wP: ({ squareWidth }) => (
      <img src="/pieces/wp.png" style={{ width: squareWidth }} />
    ),
    wR: ({ squareWidth }) => (
      <img src="/pieces/wr.png" style={{ width: squareWidth }} />
    ),
    wN: ({ squareWidth }) => (
      <img src="/pieces/wn.png" style={{ width: squareWidth }} />
    ),
    wB: ({ squareWidth }) => (
      <img src="/pieces/wb.png" style={{ width: squareWidth }} />
    ),
    wQ: ({ squareWidth }) => (
      <img src="/pieces/wq.png" style={{ width: squareWidth }} />
    ),
    wK: ({ squareWidth }) => (
      <img src="/pieces/wk.png" style={{ width: squareWidth }} />
    ),

    bP: ({ squareWidth }) => (
      <img src="/pieces/bp.png" style={{ width: squareWidth }} />
    ),
    bR: ({ squareWidth }) => (
      <img src="/pieces/br.png" style={{ width: squareWidth }} />
    ),
    bN: ({ squareWidth }) => (
      <img src="/pieces/bn.png" style={{ width: squareWidth }} />
    ),
    bB: ({ squareWidth }) => (
      <img src="/pieces/bb.png" style={{ width: squareWidth }} />
    ),
    bQ: ({ squareWidth }) => (
      <img src="/pieces/bq.png" style={{ width: squareWidth }} />
    ),
    bK: ({ squareWidth }) => (
      <img src="/pieces/bk.png" style={{ width: squareWidth }} />
    ),
  };

  //Sounds
  const moveSound = new Audio("/sounds/move.mp3");
  const captureSound = new Audio("/sounds/capture.mp3");
  const checkSound = new Audio("/sounds/check.mp3");
  const castleSound = new Audio("/sounds/castle.mp3");
  const notifySound = new Audio("/sounds/notify.mp3");
  const msgAlert = new Audio("/sounds/messageAlert.mp3");

  const [game, setGame] = useState(new Chess());
  const [moveLog, setMoveLog] = useState([]);
  const [myColor, setMyColor] = useState(null);
  const [turn, setTurn] = useState("white");
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [OpponentName, setOpponentName] = useState("");
  const [showPopup, setShowPopup] = useState(true);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const dragRef = useRef(null);
  const isMobile = window.innerWidth < 768;

  //for chatbox
  const [messages, setMessages] = useState([]);

  const chatInfo = {
    playerName,
    OpponentName,
    opponentLeft,
    myColor,
    roomId,
    messages,
  };

  //For audio feature
  const pcRef = useRef(null);
  const localStream = useRef(null);
  const remoteAudio = useRef(null);

  //  winner color and name
  const isCheckmate = game.isCheckmate();

  let winnerColor = null;
  let winnerName = null;

  if (isCheckmate) {
    // game.turn() is the side THAT WOULD MOVE next — that side lost.
    winnerColor = game.turn() === "w" ? "black" : "white";
    // Map color to the correct name (myColor is either "white" or "black")
    if (myColor) {
      winnerName = winnerColor === myColor ? playerName : OpponentName;
    } else {
      // fallback if myColor not known (shouldn't happen in normal flow)
      winnerName =
        winnerColor === "white"
          ? playerName || OpponentName
          : OpponentName || playerName;
    }
  }

  // Keep latest game in ref
  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const handleName = () => {
    if (!playerName.trim()) return;
    socket.emit("playerName", { roomId, name: playerName });
    setShowPopup(false);
    notifySound.play();
  };

  // GET PLAYER COLOR
  useEffect(() => {
    if (location.state?.color) {
      setMyColor(location.state.color);
    }
  }, [location]);

  useEffect(() => {
    const isDesktop = window.innerWidth >= 768; // desktop only
    if (isDesktop) {
      document.body.style.overflow = "hidden"; // block main scroll
    }

    return () => {
      document.body.style.overflow = "auto"; // restore scroll on unmount
    };
  }, []);

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

      if (move.flags.includes("c") || move.flags.includes("e")) {
        captureSound.play();
      } else if (move.flags.includes("k") || move.flags.includes("q")) {
        castleSound.play();
      } else if (current.inCheck()) {
        checkSound.play();
      } else {
        moveSound.play();
      }

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
      if (window.innerWidth < 768) return false; //disabling the dragevent on mobile
      if (!playerName) return false;
      if (gameOver) return false;
      if (turn !== myColor) return false;

      const newGame = new Chess(gameRef.current.fen());
      const move = newGame.move({ from, to, promotion: "q" });

      if (!move) {
        setGame((g) => new Chess(g.fen()));
        return false;
      }

      //sound handeling
      if (move.flags.includes("c") || move.flags.includes("e")) {
        // capture or en passant
        captureSound.play();
      } else if (move.flags.includes("k") || move.flags.includes("q")) {
        // castling
        castleSound.play();
      } else if (newGame.inCheck()) {
        checkSound.play();
      } else {
        // normal move
        moveSound.play();
      }
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
          flags: move.flags,
        },
      });

      if (newGame.isGameOver()) setGameOver(true);
      return true;
    },
    [playerName, myColor, turn, gameOver, roomId]
  );

  //mobile drag issue

  useEffect(() => {
    if (showPopup) {
      notifySound.play();
    }
  }, [showPopup]);

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
    if (gameOver) {
      notifySound.play(); // play when checkmate/draw popup shows
    }
  }, [gameOver]);

  useEffect(() => {
    if (opponentLeft) {
      notifySound.play();
      const timer = setTimeout(() => {
        navigate("/"); // go back to home
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [opponentLeft, navigate]);

  //msg handeling
  const sendMessage = (msg) => {
    socket.emit("send-message", { roomId, message: msg });
    setMessages((prev) => [...prev, { me: true, text: msg }]);
  };

  const handleChatMessage = (msg) => {
    sendMessage(msg);
  };

  // Receive message
  useEffect(() => {
    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, { me: false, text: msg }]);
      msgAlert.play();
    });

    return () => socket.off("receive-message");
  }, []);

  const [highlightSquares, setHighlightSquares] = useState({});
  const [selectedSquare, setSelectedSquare] = useState(null);

  const onSquareClick = (square) => {
    if (!playerName) return;
    if (gameOver) return;
    if (turn !== myColor) return;
    const piece = game.get(square); // piece on clicked square
    const moves = game.moves({ square, verbose: true });

    // 1️⃣ No piece selected yet → try to select
    if (!selectedSquare) {
      if (!piece || moves.length === 0) return; // invalid selection
      const highlights = {};
      moves.forEach((move) => {
        const targetPiece = game.get(move.to);
        const movingPiece = game.get(square);

        if (targetPiece && targetPiece.color !== movingPiece.color) {
          // capture → hollow ring
          highlights[move.to] = {
            background: "transparent",
            boxShadow: "inset 0 0 0 4px rgba(0,0,0,0.2)",
            borderRadius: "50%",
          };
        } else {
          // normal move → small dot
          highlights[move.to] = {
            background:
              "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)",
            borderRadius: "50%",
          };
        }
      });

      setHighlightSquares(highlights);

      setSelectedSquare(square);
      return;
    }

    // 2️⃣ Already selected → click another own piece → switch selection
    const selectedPiece = game.get(selectedSquare);
    if (piece && piece.color === selectedPiece?.color) {
      if (moves.length === 0) {
        // clicked own piece with no moves → keep old selection
        return;
      }
      const highlights = {};
      moves.forEach((move) => {
        const targetPiece = game.get(move.to);
        const movingPiece = game.get(square);

        if (targetPiece && targetPiece.color !== movingPiece.color) {
          // capture → hollow ring
          highlights[move.to] = {
            background: "transparent",
            boxShadow: "inset 0 0 0 4px rgba(0,0,0,0.2)",
            borderRadius: "50%",
          };
        } else {
          // normal move → small dot
          highlights[move.to] = {
            background:
              "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)",
            borderRadius: "50%",
          };
        }
      });

      setHighlightSquares(highlights);

      setSelectedSquare(square);
      return;
    }

    // 3️⃣ Attempt move
    const newGame = new Chess(gameRef.current.fen());
    let move;
    try {
      move = newGame.move({ from: selectedSquare, to: square, promotion: "q" });
    } catch (err) {
      console.log("chess.js threw invalid move error:", err);
      setSelectedSquare(null);
      setHighlightSquares({});
      return;
    }

    if (!move) {
      // invalid move → reset selection & highlights
      setSelectedSquare(null);
      setHighlightSquares({});
      return;
    }

    // 4️⃣ Valid move → update game
    setGame(newGame);
    setTurn(newGame.turn() === "w" ? "white" : "black");

    setMoveLog((prev) => [
      ...prev,
      `${myColor === "white" ? "White" : "Black"}: ${move.san}`,
    ]);

    socket.emit("move", {
      roomId,
      move: {
        from: selectedSquare,
        to: square,
        promotion: "q",
        san: move.san,
        color: myColor === "white" ? "w" : "b",
        flags: move.flags,
      },
    });

    // play sounds
    if (move.flags.includes("c") || move.flags.includes("e"))
      captureSound.play();
    else if (move.flags.includes("k") || move.flags.includes("q"))
      castleSound.play();
    else if (newGame.inCheck()) checkSound.play();
    else moveSound.play();

    if (newGame.isGameOver()) setGameOver(true);

    // clear selection & highlights after move
    setSelectedSquare(null);
    setHighlightSquares({});
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
            <h2 className="text-2xl font-bold mb-3 text-red-600">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-[90%] max-w-md bg-stone-900 p-6 rounded-3xl shadow-2xl text-white text-center">
            <div className="flex justify-center mb-4">
              <span className="text-5xl">
                {isCheckmate ? (
                  winnerColor === "black" ? (
                    "♟️"
                  ) : (
                    <SiChessdotcom className="h-10 w-10 text-white" />
                  )
                ) : (
                  "⚖️"
                )}
              </span>
            </div>

            {isCheckmate ? (
              <>
                <h2 className="text-3xl font-bold mb-2">
                  {winnerName ? `${winnerName} Wins!` : `${winnerColor} Wins!`}
                </h2>
                <p className="mb-6 text-lg">
                  Checkmate! Congratulations to{" "}
                  <span className="font-semibold text-blue-400">
                    {winnerName || winnerColor}
                  </span>
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-2">Draw!</h2>
                <p className="mb-6 text-lg text-gray-300">
                  The game ended in a draw.
                </p>
              </>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate("/")}
                className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-xl font-semibold shadow-md transition"
              >
                Go Home
              </button>

              <button
                onClick={() => setGameOver(false)}
                className="bg-stone-700 hover:bg-stone-600 px-5 py-2 rounded-xl font-semibold shadow-md transition"
              >
                View Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {!showPopup && !opponentLeft && !gameOver && (
        <Draggable nodeRef={dragRef} bounds="parent">
          <div ref={dragRef} className="absolute top-20 right-135 z-50">
            <div className="hidden  md:block text-white">
              <Interaction
                chatInfo={chatInfo}
                socket={socket}
                pcRef={pcRef}
                localStream={localStream}
                remoteAudio={remoteAudio}
                onChatSend={handleChatMessage}
              />
            </div>
          </div>
        </Draggable>
      )}
      {/* MAIN UI  */}
      <div className="relative w-full h-screen md:overflow-hidden ">
        <div
          className={`max-w-[1200px] mt-5 text-white mx-auto flex gap-5 flex-col md:flex-row  ${
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
            <div className="flex  items-center gap-3 p-2 px-4 mb-0.5 w-max rounded-lg shadow-md">
              <div
                className={`w-6 h-6 flex items-center justify-center  rounded-sm ${
                  myColor === "black"
                    ? "text-white bg-[#779952]"
                    : "text-black bg-[#edeed1]"
                }`}
              >
                <SiChessdotcom className="w-4 h-4" />
              </div>
              <span className="text-white  font-semibold">
                {OpponentName || "Waiting..."}
              </span>
            </div>

            <Chessboard
              key={myColor}
              animationDuration={myColor == "white" ? 100 : 0}
              customSquareStyles={highlightSquares}
              position={game.fen()}
              onPieceDrop={onDrop}
              onSquareClick={onSquareClick}
              selectedSquare={selectedSquare}
              arePiecesDraggable={window.innerWidth >= 768}
              boardWidth={Math.min(window.innerWidth - 2, 510)}
              boardOrientation={myColor === "black" ? "black" : "white"}
              customPieces={chessComPieces}
              customBoardStyle={{
                borderRadius: "0",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
              customDarkSquareStyle={{ backgroundColor: "#779952" }}
              customLightSquareStyle={{ backgroundColor: "#edeed1" }}
            />

            {/* players div  */}
            <div className="flex items-center justify-between px-2 pr-4">
              <div className="flex gap-3 p-2 w-max">
                <div
                  className={`w-6 h-6 flex items-center justify-center  rounded-sm ${
                    myColor === "white"
                      ? "text-white bg-[#779952]"
                      : "text-black bg-[#edeed1]"
                  }`}
                >
                  <SiChessdotcom className=" w-4 h-4" />
                </div>
                <span className="text-white  font-semibold">
                  {playerName || "Waiting..."}
                </span>
              </div>

              {/* Interaction — MOBILE ONLY */}
              <div className="md:hidden">
                <Interaction
                  chatInfo={chatInfo}
                  onChatSend={handleChatMessage}
                  socket={socket}
                  pcRef={pcRef}
                  localStream={localStream}
                  remoteAudio={remoteAudio}
                />
              </div>
            </div>
          </div>
          <div className="relative flex-1 md:pt-20">
            {/* Move log container (keeps full size) */}
            <div className=" overflow-y-auto bg-[#1e1e1e] rounded-xl p-4 shadow-lg">
              <h2 className="text-lg mb-4 text-center font-semibold text-white">
                Move History
              </h2>

              <div className="h-[90%] overflow-y-auto space-y-2 pr-2  md:max-h-[73vh]">
                {/* move log list */}
                {moveLog.length > 0 ? (
                  moveLog
                    .reduce((rows, move, index) => {
                      const rowIndex = Math.floor(index / 2);
                      if (!rows[rowIndex])
                        rows[rowIndex] = { white: "", black: "" };

                      if (index % 2 === 0) rows[rowIndex].white = move;
                      else rows[rowIndex].black = move;

                      return rows;
                    }, [])
                    .map((row, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[40px_1fr_1fr] items-center bg-[#2a2a2a] rounded-lg px-3 py-2 text-gray-200 hover:bg-[#333] transition"
                      >
                        <div className="text-gray-400 font-semibold">
                          {i + 1}.
                        </div>
                        <div className="font-medium">{row.white}</div>
                        <div className="font-medium">{row.black}</div>
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
        </div>
        <audio ref={remoteAudio} autoPlay playsInline />
      </div>
    </>
  );
}
