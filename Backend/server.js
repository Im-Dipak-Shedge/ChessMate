const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

const roomPlayers = {};
const roomGames = {};

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // JOIN ROOM
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


    //Handle name
    socket.on("playerName", ({ roomId, name }) => {
        io.to(roomId).emit("OpponentName", { name });
    });

    // HANDLE MOVE
    socket.on("move", ({ roomId, move }) => {
        const game = roomGames[roomId];
        const players = roomPlayers[roomId];
        if (!game) return;

        // Identify color
        let playerColor = null;
        if (players.white === socket.id) playerColor = "w";
        if (players.black === socket.id) playerColor = "b";

        // ❌ Block wrong turn
        if (game.turn() !== playerColor) return;

        const result = game.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q",
        });

        if (!result) return;

        // Send only to opponent
        socket.to(roomId).emit("opponent-move", result);

        // Sync board for reconnection correctness
        io.in(roomId).emit("board-state", game.fen());
    });

    // DISCONNECT
    // DISCONNECTING
    socket.on("disconnecting", () => {
        for (const roomId of socket.rooms) {
            if (roomId === socket.id) continue; // skip the socket's own room

            const room = roomPlayers[roomId];
            if (!room) continue;

            // Remove the player from the room
            if (room.white === socket.id) room.white = null;
            if (room.black === socket.id) room.black = null;

            // Notify the other player in the room
            socket.to(roomId).emit("opponent-left", { id: socket.id });
        }
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });

});

server.listen(3000, () => console.log("Server running on port 3000"));
