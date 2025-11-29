import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./Pages/Home";
import ChessGame from "./Pages/ChessGame";
import WaitingRoom from "./Pages/WaitingRoom";
// src/App.jsx or main entry
import { socket } from "./socket";
import Navbar from "./Components/Navbar";

const App = () => {
  socket.connect(); // ensures socket.id is valid before any component emits
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<WaitingRoom />} />
        <Route path="/game/:roomId" element={<ChessGame />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
