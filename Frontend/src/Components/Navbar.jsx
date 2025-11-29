import React from "react";

const Navbar = () => {
  return (
    <nav className="w-full bg-neutral-800">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-3xl">♞</span>
          ChessMate
        </h1>
      </div>
    </nav>
  );
};

export default Navbar;
