"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, MicOff, Mic, Volume2, VolumeX } from "lucide-react";

type CallState = "ringing" | "connected" | "ended";

interface CallOverlayProps {
  hotelName: string;
  accentColor: string;
  languageCode: string;
  ttsLang: string;
  onEnd: () => void;
}

export default function CallOverlay({ hotelName, accentColor, languageCode, ttsLang, onEnd }: CallOverlayProps) {
  const [callState, setCallState] = useState<CallState>("ringing");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [callLog, setCallLog] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoListenRef = useRef(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [useServerMode, setUseServerMode] = useState(false);
  const useServerModeRef = useRef(false);
  const startListeningRef = useRef<() => void>(() => {});
  useServerModeRef.current = useServerMode;

  // Scroll call log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [callLog]);

  // Call timer
  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  // Format mm:ss
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Init TTS
  useEffect(() => { synthRef.current = window.speechSynthesis; }, []);

  // Speak helper
  const speak = useCallback((text: string) => {
    if (!synthRef.current || isSpeakerOff) {
      // If speaker off, skip TTS but still auto-listen after
      setTimeout(() => {
        if (autoListenRef.current) startListeningRef.current();
      }, 500);
      return;
    }
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = ttsLang;
    const voices = synthRef.current.getVoices();
    const v = voices.find((v) => v.lang === ttsLang) || voices.find((v) => v.lang.startsWith(ttsLang.split("-")[0]));
    if (v) utt.voice = v;
    utt.rate = 1.0; utt.pitch = 1.1;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => {
      setIsSpeaking(false);
      // Auto-listen after speaking (continuous call)
      if (autoListenRef.current) setTimeout(() => startListeningRef.current(), 400);
    };
    utt.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utt);
  }, [ttsLang, isSpeakerOff]);

  // Send to chat API
  const sendMessage = useCallback(async (text: string) => {
    setIsProcessing(true);
    setCallLog((prev) => [...prev, { role: "user", text }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language: languageCode }),
      });
      const data = await res.json();
      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "I'm sorry, I'm having trouble right now.";
      setCallLog((prev) => [...prev, { role: "assistant", text: reply }]);
      speak(reply);
    } catch {
      const err = "I'm sorry, I'm having trouble right now.";
      setCallLog((prev) => [...prev, { role: "assistant", text: err }]);
      speak(err);
    } finally {
      setIsProcessing(false);
    }
  }, [languageCode, speak]);

  // Init speech recognition
  // Speaker/Mute logic
  const stopServerListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const endCall = useCallback(() => {
    autoListenRef.current = false;
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    stopServerListening();
    synthRef.current?.cancel();
    setCallState("ended");
    setIsListening(false);
    setIsSpeaking(false);
    setTimeout(() => onEnd(), 1200);
  }, [onEnd, stopServerListening]);

  const pickCallRecorderMimeType = (): string | undefined => {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return undefined;
  };

  // Server-side recording for Calls
  const startServerListening = useCallback(async () => {
    if (isMuted || !autoListenRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickCallRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      const blobType = recorder.mimeType || mimeType || "audio/webm";
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: blobType });
        const fd = new FormData();
        fd.append('audio', blob);
        fd.append('language', languageCode);
        try {
          const res = await fetch('/api/stt', { method: 'POST', body: fd });
          const data = await res.json();
          const transcribed = typeof data.text === "string" ? data.text.trim() : "";
          if (transcribed) sendMessage(transcribed);
          else if (autoListenRef.current) setTimeout(() => startListeningRef.current(), 400);
        } catch {
          if (autoListenRef.current) setTimeout(() => startListeningRef.current(), 1000);
        } finally { stream.getTracks().forEach(t => t.stop()); }
      };
      recorder.start(250);
      setIsListening(true);
      setLiveTranscript("Listening (AI Mode)...");
    } catch { setIsListening(false); }
  }, [isMuted, languageCode, sendMessage]);

  const startListening = useCallback(() => {
    if (isMuted || !autoListenRef.current) return;
    if (useServerModeRef.current) {
      startServerListening();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      useServerModeRef.current = true;
      setUseServerMode(true);
      startServerListening();
      return;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = languageCode;

    rec.onresult = (e: any) => {
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) {
        setLiveTranscript("");
        sendMessage(final);
      }
    };

    rec.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === "network") {
        useServerModeRef.current = true;
        setUseServerMode(true);
        setTimeout(() => startServerListening(), 100);
      } else if (e.error === "no-speech" && autoListenRef.current) {
        setTimeout(() => startListeningRef.current(), 500);
      }
    };

    rec.onend = () => setIsListening(false);

    try {
      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
    } catch { /* already started */ }
  }, [languageCode, isMuted, sendMessage, startServerListening]);

  startListeningRef.current = startListening;

  // Ringing → auto-answer after 2s
  useEffect(() => {
    if (callState === "ringing") {
      const t = setTimeout(() => {
        setCallState("connected");
        // Greeting
        const greeting = "Hello! Thank you for calling. How may I assist you today?";
        setCallLog([{ role: "assistant", text: greeting }]);
        speak(greeting);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [callState, speak]);

  // Toggle mute
  const toggleMute = () => {
    if (!isMuted) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (callState === "connected" && !isSpeaking && !isProcessing) startListening();
    }
    setIsMuted(!isMuted);
  };

  // Voice waveform bars
  const WaveBars = () => (
    <div className="flex items-center gap-1 h-8">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-green-400"
          style={{
            animation: `waveBar 0.8s ease-in-out ${i * 0.15}s infinite`,
            height: 8,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 animate-slide-up" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)" }}>
      <div className="h-full flex flex-col items-center justify-between py-12 px-6">
        {/* Top: Status */}
        <div className="text-center">
          {callState === "ringing" && (
            <p className="text-green-400 text-sm font-medium animate-pulse tracking-widest uppercase">Calling...</p>
          )}
          {callState === "connected" && (
            <p className="text-green-400 text-sm font-mono tracking-widest">{formatTime(duration)}</p>
          )}
          {callState === "ended" && (
            <p className="text-red-400 text-sm font-medium tracking-widest uppercase">Call Ended</p>
          )}
        </div>

        {/* Center: Avatar + Info */}
        <div className="flex flex-col items-center gap-6 flex-1 justify-center">
          {/* Avatar */}
          <div className="relative">
            {callState === "ringing" && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-green-400/30 animate-ping" style={{ animationDuration: "1.5s" }} />
                <div className="absolute -inset-3 rounded-full border border-green-400/20 animate-ping" style={{ animationDuration: "2s" }} />
              </>
            )}
            {isSpeaking && (
              <div className="absolute -inset-2 rounded-full border-2 border-green-400/40 animate-ping" style={{ animationDuration: "1.2s" }} />
            )}
            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${callState === "ringing" ? "animate-call-pulse" : ""}`}
              style={{ background: `linear-gradient(135deg, ${accentColor}, #fb923c)` }}
            >
              <Phone className={`w-12 h-12 text-white ${callState === "ringing" ? "animate-ring" : ""}`} />
            </div>
          </div>

          {/* Name */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white">{hotelName}</h2>
            <p className="text-neutral-400 text-sm mt-1">
              {callState === "connected" ? "Connected" : callState === "ringing" ? "Front Desk" : "Disconnected"}
            </p>
          </div>

          {/* Live status */}
          {callState === "connected" && (
            <div className="text-center min-h-[48px]">
              {isSpeaking && (
                <div className="flex flex-col items-center gap-2">
                  <WaveBars />
                  <p className="text-green-400/70 text-xs">Receptionist speaking...</p>
                </div>
              )}
              {isListening && !isSpeaking && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </div>
                  <p className="text-neutral-400 text-xs">{liveTranscript || "Listening..."}</p>
                </div>
              )}
              {isProcessing && (
                <p className="text-neutral-500 text-xs animate-pulse">Processing...</p>
              )}
              {!isListening && !isSpeaking && !isProcessing && (
                <p className="text-neutral-600 text-xs">Waiting...</p>
              )}
            </div>
          )}

          {/* Call log (scrollable, small) */}
          {callState === "connected" && callLog.length > 0 && (
            <div className="w-full max-w-sm max-h-36 overflow-y-auto scrollbar-thin space-y-2 px-2">
              {callLog.map((entry, i) => (
                <div key={i} className={`text-xs px-3 py-2 rounded-xl ${entry.role === "user" ? "bg-neutral-800/60 text-neutral-300 ml-8" : "bg-green-900/20 text-green-300/80 mr-8"}`}>
                  <span className="font-medium text-[10px] uppercase tracking-wider opacity-60 block mb-0.5">
                    {entry.role === "user" ? "You" : "Receptionist"}
                  </span>
                  {entry.text}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>

        {/* Bottom: Controls */}
        <div className="flex items-center gap-6">
          {callState === "connected" && (
            <>
              {/* Mute */}
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? "bg-red-500/20 text-red-400" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* End Call */}
              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-lg shadow-red-600/30"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>

              {/* Speaker */}
              <button
                onClick={() => setIsSpeakerOff(!isSpeakerOff)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isSpeakerOff ? "bg-red-500/20 text-red-400" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {isSpeakerOff ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </>
          )}

          {callState === "ringing" && (
            <>
              <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-600/30">
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
            </>
          )}

          {callState === "ended" && (
            <div className="text-neutral-500 text-sm">
              Call ended • {formatTime(duration)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
