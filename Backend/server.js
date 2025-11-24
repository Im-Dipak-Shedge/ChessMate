const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("send_message", (msg) => {
        console.log("Received from client:", msg);

        // 🔥 broadcast to ALL clients
        io.emit("broadcast_message", msg);
    });
});

server.listen(3000, () => console.log("Server running on 3000"));
