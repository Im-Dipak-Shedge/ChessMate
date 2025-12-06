import React, { useEffect, useRef, useState } from "react";
import { PiSpeakerHighFill, PiSpeakerXFill } from "react-icons/pi";
import { IoMdMic, IoMdMicOff } from "react-icons/io";
import { BsChatDotsFill } from "react-icons/bs";
import ChatBox from "./ChatBox";
import { socket } from "../socket";

export default function Interaction({ chatInfo, onChatSend }) {
  const roomId = chatInfo?.roomId;

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isOffering, setIsOffering] = useState(false);

  // Track new chat messages
  useEffect(() => {
    if (!chatOpen && chatInfo?.messages?.length > 0) {
      setHasNewMessage(true);
    }
  }, [chatInfo.messages]);

  // Create RTCPeerConnection factory
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:global.turn.twilio.com:3478?transport=udp",
          username: "ChessMate",
          credential: "ChessMate",
        },
      ],
    });

    // When remote track arrives, attach to audio element
    pc.ontrack = (event) => {
      console.log("🔊 ontrack: got remote stream", event.streams[0]);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        // play only if speaker is enabled
        if (speakerOn) remoteAudioRef.current.play().catch(() => {});
      }
    };

    // ICE candidate -> send to other peer through socket
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log("📡 pc.onicecandidate -> sending candidate", e.candidate);
        socket.emit("audio-ice", { roomId, candidate: e.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state ->", pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state ->", pc.connectionState);
    };

    return pc;
  };

  // getUserMedia helper: tries to select TWS/hands-free mic if present
  const getLocalStream = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");

      // prefer hands-free / bluetooth / tws labels (case-insensitive)
      const preferred = inputs.find(
        (d) => d.label && /hands-?free|bluetooth|tws/i.test(d.label)
      );

      const constraints = preferred
        ? {
            audio: {
              deviceId: preferred.deviceId,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          }
        : { audio: true };

      const s = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("🎤 getLocalStream obtained:", s);
      return s;
    } catch (err) {
      console.error("❌ getLocalStream failed:", err);
      throw err;
    }
  };

  // Adds all audio tracks from localStream to PC (idempotent)
  const addLocalTracksToPc = (pc, stream) => {
    if (!pc || !stream) return;

    const existingSenders = pc.getSenders().map((s) => s.track && s.track.id);
    stream.getAudioTracks().forEach((track) => {
      if (!existingSenders.includes(track.id)) {
        pc.addTrack(track, stream);
        console.log("🎤 Added track to PC:", track.label || track.id);
      }
    });
  };

  // Start local audio and attach to pc
  const ensureLocalAudioAndAttach = async () => {
    if (!localStreamRef.current) {
      localStreamRef.current = await getLocalStream();
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = micOn; // micOn is false initially → track.disabled
      });
    }

    if (!pcRef.current) pcRef.current = createPeerConnection();

    addLocalTracksToPc(pcRef.current, localStreamRef.current);

    // Also attach local preview if you want (not added to UI here)
    // return the stream so callers can await it
    return localStreamRef.current;
  };

  // Main socket + WebRTC lifecycle
  useEffect(() => {
    if (!roomId) return;

    console.log("🔵 Interaction mounted for room:", roomId);

    // create pc early so onicecandidate is set
    pcRef.current = createPeerConnection();

    // Fast path: join audio room
    socket.emit("audio-join", roomId);
    setIsJoined(true);

    // The server forwards raw offer/answer/candidate objects (not wrapped), so accept them directly.

    // When the other peer joins the room (server emits "audio-peer-joined")
    const onAudioPeerJoined = async () => {
      console.log("👥 audio-peer-joined received");
      try {
        await ensureLocalAudioAndAttach();
      } catch (err) {
        console.error("Failed to get local audio before offer:", err);
        return;
      }

      if (isOffering) return;
      setIsOffering(true);
      try {
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket.emit("audio-offer", { roomId, offer }); // server expects wrapped here when sending
        console.log("📡 Sent OFFER");
      } finally {
        setIsOffering(false);
      }
    };

    // IMPORTANT: server emits the raw offer object, so the handler receives the SDP object directly (not { offer })
    const onAudioOffer = async (offer) => {
      console.log("📥 audio-offer received", offer);

      try {
        if (!pcRef.current) pcRef.current = createPeerConnection();

        // ensure local tracks exist so answer contains proper m= lines
        try {
          await ensureLocalAudioAndAttach();
        } catch (e) {
          console.warn("Local audio attach failed before answer:", e);
        }

        // offer must be a valid RTCSessionDescriptionInit-like object: { type: 'offer', sdp: 'v=0...' }
        await pcRef.current.setRemoteDescription(offer);
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit("audio-answer", { roomId, answer }); // server expects wrapped when sending
        console.log("📡 Sent ANSWER");
      } catch (err) {
        console.error("Error handling audio-offer:", err);
      }
    };

    // Server forwards raw answer object — accept it directly
    const onAudioAnswer = async (answer) => {
      console.log("📥 audio-answer received", answer);
      try {
        if (!pcRef.current) return console.warn("pcRef missing on answer");
        await pcRef.current.setRemoteDescription(answer);
      } catch (err) {
        console.error("Error setting remote description (answer):", err);
      }
    };

    // Server forwards raw candidate object — accept it directly
    const onAudioIce = async (candidate) => {
      console.log("📥 audio-ice received", candidate);
      try {
        if (candidate) await pcRef.current?.addIceCandidate(candidate);
      } catch (err) {
        console.error("❌ addIceCandidate failed:", err);
      }
    };

    socket.on("audio-peer-joined", onAudioPeerJoined);
    socket.on("audio-offer", onAudioOffer);
    socket.on("audio-answer", onAudioAnswer);
    socket.on("audio-ice", onAudioIce);

    // expose a small delay to start microphone to avoid some Android races
    const startTimeout = setTimeout(() => {
      // don't await — ensureLocalAudioAndAttach will make sure tracks exist when we need them
      ensureLocalAudioAndAttach().catch((e) =>
        console.warn("Initial mic attach failed:", e)
      );
    }, 250);

    return () => {
      clearTimeout(startTimeout);

      socket.off("audio-peer-joined", onAudioPeerJoined);
      socket.off("audio-offer", onAudioOffer);
      socket.off("audio-answer", onAudioAnswer);
      socket.off("audio-ice", onAudioIce);

      // Close pc and stop tracks
      try {
        if (pcRef.current) {
          pcRef.current.getSenders().forEach((s) => {
            try {
              if (s.track) s.track.stop();
            } catch (e) {}
          });
          pcRef.current.close();
          pcRef.current = null;
        }
      } catch (e) {
        console.warn("Error closing pc:", e);
      }

      try {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
          localStreamRef.current = null;
        }
      } catch (e) {
        console.warn("Error stopping local stream:", e);
      }

      console.log("🔴 Interaction cleanup complete");
    };
  }, [roomId]);

  // toggle mic on/off
  const toggleMic = () => {
    setMicOn((p) => !p);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      console.log("🎤 Mic toggled ->", t.enabled);
    });
  };

  // toggle speaker mute/unmute
  const toggleSpeaker = () => {
    setSpeakerOn((p) => !p);
    if (remoteAudioRef.current) {
      // note: remoteAudio.muted = true means muted. so invert speakerOn
      remoteAudioRef.current.muted = speakerOn; // if speakerOn true -> muted true (we're toggling)
      if (!remoteAudioRef.current.muted)
        remoteAudioRef.current.play().catch(() => {});
      console.log("🔊 Speaker muted? ->", remoteAudioRef.current.muted);
    }
  };

  return (
    <div className="relative hover:shadow-lg shadow-stone-900 rounded-xl">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="px-4 flex cursor-move items-center justify-center gap-3 py-2 w-max bg-neutral-700 rounded-xl my-2">
        {/* MIC */}
        <button
          onClick={toggleMic}
          className={`w-12 h-12 bg-stone-800 rounded-full flex items-center justify-center text-xl active:scale-90 ${
            micOn ? "text-green-400" : "text-red-500"
          }`}
        >
          {micOn ? <IoMdMic size={20} /> : <IoMdMicOff size={20} />}
        </button>

        {/* SPEAKER */}
        <button
          onClick={toggleSpeaker}
          className={`w-12 h-12 bg-stone-800 rounded-full flex items-center justify-center text-xl active:scale-90 ${
            speakerOn ? "text-green-400" : "text-red-500"
          }`}
        >
          {speakerOn ? (
            <PiSpeakerHighFill size={20} />
          ) : (
            <PiSpeakerXFill size={20} />
          )}
        </button>

        {/* CHAT */}
        <button
          onClick={() => {
            setChatOpen((prev) => !prev);
            setHasNewMessage(false);
          }}
          className="relative w-12 h-12 bg-stone-800 rounded-full flex items-center justify-center text-xl active:scale-90 text-white transition-all"
        >
          <BsChatDotsFill size={20} />
          {hasNewMessage && (
            <>
              <span className="absolute top-2 right-2 h-3 w-3 bg-green-500 rounded-full animate-ping"></span>
              <span className="absolute top-2 right-2 h-3 w-3 bg-green-400 rounded-full"></span>
            </>
          )}
        </button>
      </div>

      {/* Chat Box */}
      {chatOpen && (
        <ChatBox
          chatInfo={chatInfo}
          onChatSend={onChatSend}
          onClose={() => setChatOpen(false)}
          positionClass="absolute right-0 bottom-[4.8rem] md:top-[4.8rem] md:bottom-auto w-75 md:w-120"
        />
      )}
    </div>
  );
}
