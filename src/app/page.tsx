"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Mic, Volume2, User, Loader2, Phone, Settings } from "lucide-react";

interface BrandingConfig {
  hotelName: string;
  tagline: string;
  accentColor: string;
  welcomeMessage: string;
}

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [branding, setBranding] = useState<BrandingConfig>({
    hotelName: "Voice Receptionist",
    tagline: "AI-Powered Hotel Assistant",
    accentColor: "#f43f5e",
    welcomeMessage: "Welcome! How may I assist you today?",
  });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load branding from config API
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data?.branding) setBranding(data.branding);
      })
      .catch(console.error);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          const currentTranscript = event.results[0][0].transcript;
          setTranscript(currentTranscript);
          setErrorMessage(null);
          handleUserAudioComplete(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          // Use console.warn instead of console.error to prevent
          // Next.js dev overlay from showing for expected browser errors
          const errorType = event.error as string;
          setIsListening(false);
          setIsProcessing(false);

          switch (errorType) {
            case "network":
              setErrorMessage(
                "Network error: Speech recognition requires an internet connection. Please check your connectivity and try again."
              );
              break;
            case "not-allowed":
            case "service-not-allowed":
              setErrorMessage(
                "Microphone access denied. Please allow microphone permissions in your browser settings."
              );
              break;
            case "no-speech":
              setErrorMessage(
                "No speech detected. Please tap the microphone and speak clearly."
              );
              break;
            case "aborted":
              // User or system aborted — no need to show an error
              break;
            default:
              setErrorMessage(
                `Speech recognition error: ${errorType}. Please try again.`
              );
          }

          // Clear error after 6 seconds
          setTimeout(() => setErrorMessage(null), 6000);
          console.warn("[Voice Assistant] Speech recognition event:", errorType);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setIsSupported(false);
        setErrorMessage(
          "Speech recognition is not supported in this browser. Please use Chrome or Edge."
        );
      }

      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Ensure voices are loaded
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const handleUserAudioComplete = async (text: string) => {
    setIsListening(false);
    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();
      const reply = data.reply;

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      speakText(reply);
    } catch (error) {
      console.warn("[Voice Assistant] Failed to fetch response:", error);
      const errorMsg = "I'm sorry, I'm having trouble connecting right now.";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
      speakText(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(
      (voice) =>
        voice.name.includes("Female") ||
        voice.name.includes("Google UK English Female") ||
        voice.lang === "en-GB"
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      synthRef.current?.cancel();
      setIsSpeaking(false);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setTranscript("");
      } catch (e) {
        console.error("Error starting recognition", e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-rose-500/30">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-neutral-950 -z-10" />

      {/* Header */}
      <header className="px-6 sm:px-8 py-5 flex justify-between items-center border-b border-white/5 bg-neutral-950/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${branding.accentColor}, #fb923c)`,
              boxShadow: `0 8px 24px -8px ${branding.accentColor}40`,
            }}
          >
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">{branding.hotelName}</h1>
            <p className="text-xs text-neutral-400">{branding.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isListening && (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: branding.accentColor }} />
                <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: branding.accentColor }} />
              </span>
            )}
            <span className="text-sm font-medium text-neutral-400 hidden sm:inline">
              {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Ready"}
            </span>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configure</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 sm:p-8 max-w-4xl w-full mx-auto relative">
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: branding.accentColor }}
        />

        {/* Interaction Orb */}
        <div className="relative my-12 flex justify-center items-center h-56 w-56 sm:h-64 sm:w-64">
          {isSpeaking && (
            <>
              <div
                className="absolute inset-0 rounded-full border animate-ping"
                style={{ borderColor: `${branding.accentColor}30`, animationDuration: "2s" }}
              />
              <div
                className="absolute inset-4 rounded-full border animate-ping"
                style={{ borderColor: `${branding.accentColor}50`, animationDuration: "1.5s", animationDelay: "0.5s" }}
              />
            </>
          )}
          {isListening && (
            <>
              <div
                className="absolute inset-0 rounded-full border-2 animate-ping"
                style={{ borderColor: `${branding.accentColor}60`, animationDuration: "1.2s" }}
              />
              <div
                className="absolute -inset-4 rounded-full border animate-ping"
                style={{ borderColor: `${branding.accentColor}20`, animationDuration: "1.8s" }}
              />
            </>
          )}
          <button
            onClick={toggleListening}
            disabled={isProcessing || !isSupported}
            className={`
              relative z-10 flex flex-col items-center justify-center cursor-pointer
              w-36 h-36 sm:w-40 sm:h-40 rounded-full transition-all duration-500 ease-out
              ${
                isListening
                  ? "scale-110"
                  : isSpeaking
                  ? ""
                  : "bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 hover:scale-105"
              }
              ${isProcessing ? "opacity-70 cursor-wait" : ""}
            `}
            style={
              isListening
                ? { backgroundColor: branding.accentColor, boxShadow: `0 0 60px -10px ${branding.accentColor}99` }
                : isSpeaking
                ? { background: `linear-gradient(135deg, ${branding.accentColor}, #fb923c)`, boxShadow: `0 0 40px -10px ${branding.accentColor}66` }
                : {}
            }
          >
            {isProcessing ? (
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            ) : isListening ? (
              <Mic className="w-14 h-14 text-white animate-pulse" />
            ) : isSpeaking ? (
              <Volume2 className="w-14 h-14 text-white" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Mic className="w-10 h-10 text-neutral-300" />
                <span className="text-xs text-neutral-400 font-medium">Tap to Speak</span>
              </div>
            )}
          </button>
        </div>

        {/* Conversation View */}
        <div className="w-full space-y-5 max-h-[45vh] overflow-y-auto px-2 sm:px-4 z-10 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
          {messages.length === 0 ? (
            <div className="text-center text-neutral-500 py-8">
              <p className="text-lg">{branding.welcomeMessage}</p>
              <p className="text-sm mt-2 text-neutral-600">Tap the microphone and ask me anything.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                    style={{ borderColor: `${branding.accentColor}30`, backgroundColor: `${branding.accentColor}10` }}
                  >
                    <Phone className="w-3.5 h-3.5" style={{ color: branding.accentColor }} />
                  </div>
                )}
                <div
                  className={`px-5 py-3.5 rounded-2xl max-w-[80%] text-[15px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-neutral-800 text-neutral-200 rounded-tr-sm border border-neutral-700"
                      : "rounded-tl-sm"
                  }`}
                  style={
                    msg.role === "assistant"
                      ? {
                          backgroundColor: `${branding.accentColor}10`,
                          borderWidth: 1,
                          borderColor: `${branding.accentColor}20`,
                        }
                      : {}
                  }
                >
                  <p>{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700">
                    <Mic className="w-3.5 h-3.5 text-neutral-400" />
                  </div>
                )}
              </div>
            ))
          )}
          {isProcessing && (
            <div className="flex gap-3 justify-start">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                style={{ borderColor: `${branding.accentColor}30`, backgroundColor: `${branding.accentColor}10` }}
              >
                <Phone className="w-3.5 h-3.5" style={{ color: branding.accentColor }} />
              </div>
              <div className="px-5 py-4 rounded-2xl rounded-tl-sm" style={{ backgroundColor: `${branding.accentColor}10`, borderWidth: 1, borderColor: `${branding.accentColor}20` }}>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="w-full mt-4 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3 z-10 animate-in">
            <span className="text-red-400 text-lg">⚠</span>
            <p>{errorMessage}</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-neutral-600 border-t border-white/5">
        Universal Voice Receptionist • Powered by AI • Configurable for any hotel
      </footer>
    </div>
  );
}
