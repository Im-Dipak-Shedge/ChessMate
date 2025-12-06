// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");
// const { Chess } = require("chess.js");

// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, { cors: { origin: "*" } });

// const roomPlayers = {};
// const roomGames = {};

// io.on("connection", (socket) => {
//     console.log("Client connected:", socket.id);

//     // JOIN ROOM
//     socket.on("join-room", (roomId) => {
//         if (!roomPlayers[roomId]) {
//             roomPlayers[roomId] = { white: null, black: null };
//             roomGames[roomId] = new Chess();
//         }

//         const room = roomPlayers[roomId];

//         if (room.white && room.black) {
//             socket.emit("room-full");
//             return;
//         }

//         socket.join(roomId);

//         let assignedColor;
//         if (!room.white) {
//             room.white = socket.id;
//             assignedColor = "white";
//         } else if (!room.black) {
//             room.black = socket.id;
//             assignedColor = "black";
//         }

//         socket.emit("player-color", assignedColor);

//         // Send current board
//         socket.emit("board-state", roomGames[roomId].fen());

//         // Both players ready
//         if (room.white && room.black) {
//             io.to(roomId).emit("both-joined");
//             io.to(roomId).emit("board-state", roomGames[roomId].fen());
//         }
//     });


//     //Handle name
//     socket.on("playerName", ({ roomId, name }) => {
//         io.to(roomId).emit("OpponentName", { name });
//     });

//     // HANDLE MOVE
//     socket.on("move", ({ roomId, move }) => {
//         const game = roomGames[roomId];
//         const players = roomPlayers[roomId];
//         if (!game) return;

//         // Identify color
//         let playerColor = null;
//         if (players.white === socket.id) playerColor = "w";
//         if (players.black === socket.id) playerColor = "b";

//         // ❌ Block wrong turn
//         if (game.turn() !== playerColor) return;

//         const result = game.move({
//             from: move.from,
//             to: move.to,
//             promotion: move.promotion || "q",
//             flags: move.flags,
//         });

//         if (!result) return;

//         // Send only to opponent
//         socket.to(roomId).emit("opponent-move", result);

//         // Sync board for reconnection correctness
//         io.in(roomId).emit("board-state", game.fen());
//     });

//     //msg passing in chatbox

//     socket.on("send-message", ({ roomId, message }) => {
//         socket.to(roomId).emit("receive-message", message);
//     });



//     // DISCONNECTING
//     socket.on("disconnecting", () => {
//         for (const roomId of socket.rooms) {
//             if (roomId === socket.id) continue; // skip the socket's own room

//             const room = roomPlayers[roomId];
//             if (!room) continue;

//             // Remove the player from the room
//             if (room.white === socket.id) room.white = null;
//             if (room.black === socket.id) room.black = null;

//             // Notify the other player in the room
//             socket.to(roomId).emit("opponent-left", { id: socket.id });
//         }
//     });

//     socket.on("disconnect", () => {
//         console.log("Client disconnected:", socket.id);
//     });

// });

// server.listen(3000, () => console.log("Server running on port 3000"));


    const express = require("express");
    const http = require("http");
    const { Server } = require("socket.io");
    const { Chess } = require("chess.js");

    const app = express();
    const server = http.createServer(app);

    const io = new Server(server, { cors: { origin: "*" } });

    /* ----------------------------------------------
    CHESS ROOM STATE
    ---------------------------------------------- */
    const roomPlayers = {};
    const roomGames = {};

    /* ----------------------------------------------
    AUDIO ROOM STATE
    ---------------------------------------------- */
    const audioRooms = {};  // { roomId: [socketIds...] }

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        /* ---------------------------------------------------------
        CHESS: JOIN ROOM
        --------------------------------------------------------- */
        socket.on("join-room", (roomId) => {
            if (!roomPlayers[roomId]) {
                roomPlayers[roomId] = { white: null, black: null };
                roomGames[roomId] = new Chess();
            }

            const room = roomPlayers[roomId];

            if (room.white && room.black) {
                socket.emit("room-full");
                return;
            }

            socket.join(roomId);

            let assignedColor;
            if (!room.white) {
                room.white = socket.id;
                assignedColor = "white";
            } else if (!room.black) {
                room.black = socket.id;
                assignedColor = "black";
            }

            socket.emit("player-color", assignedColor);

            // Send current board
            socket.emit("board-state", roomGames[roomId].fen());

            // Both players ready
            if (room.white && room.black) {
                io.to(roomId).emit("both-joined");
                io.to(roomId).emit("board-state", roomGames[roomId].fen());
            }
        });

        /* ---------------------------------------------------------
        PLAYER NAME
        --------------------------------------------------------- */
        socket.on("playerName", ({ roomId, name }) => {
            io.to(roomId).emit("OpponentName", { name });
        });

        /* ---------------------------------------------------------
        MOVE HANDLING
        --------------------------------------------------------- */
        socket.on("move", ({ roomId, move }) => {
            const game = roomGames[roomId];
            const players = roomPlayers[roomId];
            if (!game) return;

            let playerColor = null;
            if (players.white === socket.id) playerColor = "w";
            if (players.black === socket.id) playerColor = "b";

            if (game.turn() !== playerColor) return;

            const result = game.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion || "q",
                flags: move.flags,
            });

            if (!result) return;

            socket.to(roomId).emit("opponent-move", result);
            io.in(roomId).emit("board-state", game.fen());
        });

        /* ---------------------------------------------------------
        CHAT
        --------------------------------------------------------- */
        socket.on("send-message", ({ roomId, message }) => {
            socket.to(roomId).emit("receive-message", message);
        });

        /* ---------------------------------------------------------
        AUDIO JOIN (WebRTC)
        --------------------------------------------------------- */
        socket.on("audio-join", (roomId) => {
            if (!audioRooms[roomId]) audioRooms[roomId] = [];

            socket.join(roomId);
            audioRooms[roomId].push(socket.id);

            console.log("🎧 AUDIO JOIN →", roomId, audioRooms[roomId]);

            // First peer
            if (audioRooms[roomId].length === 1) {
                socket.emit("audio-room-created");
            }
            // Second peer
            else if (audioRooms[roomId].length === 2) {
                socket.emit("audio-room-joined");
                socket.to(roomId).emit("audio-peer-joined");
            }
        });

        /* ---------------------------------------------------------
        AUDIO SIGNALING (WebRTC)
        --------------------------------------------------------- */

        socket.on("audio-offer", ({ roomId, offer }) => {
            socket.to(roomId).emit("audio-offer", offer);
        });

        socket.on("audio-answer", ({ roomId, answer }) => {
            socket.to(roomId).emit("audio-answer", answer);
        });

        socket.on("audio-ice", ({ roomId, candidate }) => {
            socket.to(roomId).emit("audio-ice", candidate);
        });

        /* ---------------------------------------------------------
        DISCONNECT
        --------------------------------------------------------- */
        socket.on("disconnecting", () => {
            for (const roomId of socket.rooms) {
                if (roomId === socket.id) continue;

                // Chess cleanup
                const room = roomPlayers[roomId];
                if (room) {
                    if (room.white === socket.id) room.white = null;
                    if (room.black === socket.id) room.black = null;
                    socket.to(roomId).emit("opponent-left");
                }

                // Audio cleanup
                if (audioRooms[roomId]) {
                    audioRooms[roomId] = audioRooms[roomId].filter(id => id !== socket.id);
                    socket.to(roomId).emit("audio-peer-left");
                }
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    server.listen(3000, () => console.log("Server running on port 3000"));

    