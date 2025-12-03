import React, { useState } from "react";
import { PiSpeakerHighFill, PiSpeakerXFill } from "react-icons/pi";
import { IoMdMic, IoMdMicOff } from "react-icons/io";
import { BsChatDotsFill } from "react-icons/bs";
import ChatBox from "./ChatBox";

const Interaction = ({ chatInfo, onChatSend }) => {
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="relative  hover:shadow-lg shadow-stone-900 rounded-xl">
      <div className="px-4 flex cursor-move items-center justify-center gap-3 py-2 w-max bg-neutral-700 rounded-xl my-2">
        {/* MIC BUTTON */}
        <button
          onClick={() => setMicOn((prev) => !prev)}
          className={`w-12 h-12 bg-stone-800 cursor-pointer rounded-full flex items-center justify-center text-xl active:scale-90 
            ${micOn ? "text-green-400" : "text-red-500"}`}
        >
          {micOn ? <IoMdMic size={20} /> : <IoMdMicOff size={20} />}
        </button>

        {/* SPEAKER BUTTON */}
        <button
          onClick={() => setSpeakerOn((prev) => !prev)}
          className={`w-12 h-12 bg-stone-800 cursor-pointer rounded-full flex items-center justify-center text-xl active:scale-90
            ${speakerOn ? "text-green-400" : "text-red-500"}`}
        >
          {speakerOn ? (
            <PiSpeakerHighFill size={20} />
          ) : (
            <PiSpeakerXFill size={20} />
          )}
        </button>

        {/* CHAT BUTTON */}
        <button
          onClick={() => setChatOpen((prev) => !prev)}
          className={`w-12 h-12 cursor-pointer bg-stone-800 rounded-full flex items-center justify-center text-xl active:scale-90
    text-white`}
        >
          <BsChatDotsFill size={20} />
        </button>
      </div>

      {/* Popup Chat Box */}
      {chatOpen && (
        <ChatBox
          chatInfo={chatInfo}
          onChatSend={onChatSend}
          onClose={() => setChatOpen(false)}
          positionClass="
            absolute right-0
            bottom-[4.8rem]
            md:top-[4.8rem] md:bottom-auto
            w-75 md:w-120
          "
        />
      )}
    </div>
  );
};

export default Interaction;
