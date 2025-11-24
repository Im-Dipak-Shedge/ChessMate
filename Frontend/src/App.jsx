import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./Pages/Home";
import ChessGame from "./Pages/ChessGame";
import WaitingRoom from "./Pages/WaitingRoom";
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:roomId" element={<ChessGame />} />
        <Route path="/room/:roomId" element={<WaitingRoom />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
