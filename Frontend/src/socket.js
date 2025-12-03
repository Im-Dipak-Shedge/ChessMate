// src/socket.js
import { io } from "socket.io-client";

export const socket = io("http://192.168.0.103:3000", {
    autoConnect: false, // important
});

socket.connect();

socket.on("connect", () => console.log("Socket connected:", socket.id));
socket.on("connect_error", (err) => console.error("Socket connect_error:", err.message));
