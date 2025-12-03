import { useState, useEffect, useRef } from "react";
import { IoClose } from "react-icons/io5";
import { MdSend } from "react-icons/md";

const ChatBox = ({ onClose, positionClass, chatInfo, onChatSend }) => {
  const [text, setText] = useState("");
  const messagesContainerRef = useRef(null);

  // Scroll only the messages container to bottom
  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatInfo.messages.length]); // scroll only when new messages arrive

  const sendMessage = () => {
    if (!text.trim()) return;
    onChatSend(text);
    setText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const opponentName = chatInfo?.OpponentName || "Opponent";

  return (
    <div
      className={`${positionClass}
      w-80 rounded-2xl overflow-hidden shadow-xl
      bg-neutral-800 text-white border border-neutral-700`}
    >
      {/* HEADER */}
      <div className="flex justify-between items-center p-4 border-b border-neutral-700 bg-neutral-900">
        <div className="flex items-center">
          <h2 className="font-semibold text-lg">
            Chat with{" "}
            <span className="text-green-400 ml-1 ">{opponentName}</span>
          </h2>
        </div>
        <button
          className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-700 transition"
          onClick={onClose}
        >
          <IoClose size={20} />
        </button>
      </div>

      {/* MESSAGES */}
      <div
        ref={messagesContainerRef}
        className="h-96 flex flex-col p-4 overflow-y-auto bg-neutral-800 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(100,100,100,0.5) transparent",
        }}
      >
        {chatInfo.messages.length === 0 && (
          <div className="text-center text-neutral-500 italic mt-10">
            Start a conversation!
          </div>
        )}

        {chatInfo.messages.map((msg, i) => (
          <div
            key={i}
            className={`flex mb-3 ${msg.me ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 text-sm md:text-md md:font-semibold font-medium 
              ${
                msg.me
                  ? "bg-[#73a341] text-white rounded-2xl rounded-tr-sm"
                  : "bg-neutral-600 text-white rounded-2xl rounded-tl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="flex gap-3 p-4 border-t border-neutral-700 bg-neutral-900">
        <input
          className="flex-1 bg-neutral-800 h-10 rounded-lg px-3 text-sm text-neutral-200 
          border border-neutral-700 outline-none focus:border-blue-500 transition"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim()}
          className="flex items-center justify-center w-10 h-10 
          bg-blue-600 text-white rounded-lg 
          hover:bg-blue-500 active:scale-95 transition 
          disabled:bg-neutral-700 disabled:text-neutral-500"
        >
          <MdSend size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
