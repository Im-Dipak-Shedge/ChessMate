const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {

    socket.on("join-room", (roomId) => {

        const clients = io.sockets.adapter.rooms.get(roomId);

        // If room exists and already has 2 players → FULL
        if (clients && clients.size === 2) {
            socket.emit("room-full");
            return;
        }

        // Join the room
        socket.join(roomId);

        // Count again AFTER joining
        const updated = io.sockets.adapter.rooms.get(roomId);
        const playerCount = updated ? updated.size : 0;

        // ASSIGN COLOR
        if (playerCount === 1) {
            // First player → White
            console.log("room created");
            socket.emit("assign-color", "white");
        }
        else if (playerCount === 2) {
            // Second player → Black
            console.log("room joined");
            socket.emit("assign-color", "black");

            // Tell both to start game
            io.to(roomId).emit("both-joined");
        }
    });

});

server.listen(3000, () => console.log("Server running on 3000"));
