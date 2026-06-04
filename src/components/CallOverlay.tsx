"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, MicOff, Mic, Volume2, VolumeX } from "lucide-react";
import { GUEST_STAFF_HANDOFF_MESSAGE } from "@/lib/escalationMessages";
import { GeminiLiveSession } from "@/lib/geminiLiveSession";
import {
  VOICE_MAX_RECORD_MS,
  VOICE_SILENCE_SUBMIT_MS,
  VOICE_SILENCE_THRESHOLD,
  VOICE_SPEECH_MIN_MS,
} from "@/lib/voiceSilence";

type CallState = "ringing" | "connected" | "ended";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
const PREMIUM_VOICE_HINTS = [
  "neural",
  "wavenet",
  "studio",
  "premium",
  "enhanced",
  "natural",
  "siri",
  "samantha",
  "daniel",
  "karen",
  "moira",
  "ava",
  "serena",
  "alloy",
  "nova",
];
const ROBOTIC_VOICE_HINTS = ["compact", "espeak", "mbrola", "festival", "old", "legacy"];

export interface CallHistoryRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  languageCode: string;
  mode: "native" | "server";
  transcriptPreview: string;
  totalTurns: number;
}

interface CallOverlayProps {
  hotelName: string;
  accentColor: string;
  languageCode: string;
  ttsLang: string;
  voiceStyle: "warm" | "professional" | "energetic";
  aiReady?: boolean;
  geminiLiveReady?: boolean;
  onEnd: (record?: CallHistoryRecord) => void;
}

export default function CallOverlay({
  hotelName,
  accentColor,
  languageCode,
  ttsLang,
  voiceStyle,
  aiReady = true,
  geminiLiveReady = false,
  onEnd,
}: CallOverlayProps) {
  const [callState, setCallState] = useState<CallState>("ringing");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [callLog, setCallLog] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const callStartedAtRef = useRef(Date.now());
  const callStateRef = useRef<CallState>("ringing");
  const endingCallRef = useRef(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const nativeSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeDraftTranscriptRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoListenRef = useRef(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [useServerMode, setUseServerMode] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const liveStartedRef = useRef(false);
  const preAcquiredMicRef = useRef<MediaStream | null>(null);
  const useServerModeRef = useRef(false);
  const startListeningRef = useRef<() => void>(() => {});
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelFrameRef = useRef<number>(0);
  const audioLevelRef = useRef(0);
  const lastAudioLevelUpdateRef = useRef(0);
  useServerModeRef.current = useServerMode;
  callStateRef.current = callState;

  // Acquire mic while the user's click gesture is still valid (before the 2s ring delay).
  useEffect(() => {
    let cancelled = false;

    const acquireMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (!cancelled) preAcquiredMicRef.current = stream;
      } catch {
        if (!cancelled) preAcquiredMicRef.current = null;
      }
    };

    void acquireMic();

    return () => {
      cancelled = true;
      preAcquiredMicRef.current?.getTracks().forEach((track) => track.stop());
      preAcquiredMicRef.current = null;
    };
  }, []);

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

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioLevelFrameRef.current) cancelAnimationFrame(audioLevelFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Pick best voice for language
  const pickBestVoice = useCallback((langCode: string): SpeechSynthesisVoice | null => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    if (!voices.length) return null;
    const langPrimary = langCode.split("-")[0];
    const candidates = voices.filter(v => v.lang === langCode || v.lang.startsWith(langPrimary));
    if (!candidates.length) return null;

    const scored = candidates.map(v => {
      const nameL = v.name.toLowerCase();
      let score = 0;
      if (PREMIUM_VOICE_HINTS.some(k => nameL.includes(k))) score += 14;
      if (ROBOTIC_VOICE_HINTS.some(k => nameL.includes(k))) score -= 25;
      if (!v.localService) score += 5;
      if (["female", "woman", "samantha", "serena", "karen", "moira", "ava"].some((k) => nameL.includes(k))) score += 4;
      if (v.lang === langCode) score += 3;
      return { voice: v, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].voice;
  }, []);

  const toHumanSpeechText = useCallback((text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\s+/g, " ")
      .replace(/\s*([,.;!?])\s*/g, "$1 ")
      .replace(/([a-z])\s*-\s*([a-z])/gi, "$1 $2")
      .trim();
  }, []);

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
    const utt = new SpeechSynthesisUtterance(toHumanSpeechText(text));
    utt.lang = ttsLang;
    const bestVoice = pickBestVoice(ttsLang);
    if (bestVoice) utt.voice = bestVoice;
    if (voiceStyle === "professional") {
      utt.rate = 0.88;
      utt.pitch = 0.95;
    } else if (voiceStyle === "energetic") {
      utt.rate = 0.97;
      utt.pitch = 1.04;
    } else {
      utt.rate = 0.9;
      utt.pitch = 0.98;
    }
    utt.volume = 1.0;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => {
      setIsSpeaking(false);
      // Auto-listen after speaking (continuous call)
      if (autoListenRef.current) setTimeout(() => startListeningRef.current(), 400);
    };
    utt.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utt);
  }, [ttsLang, isSpeakerOff, pickBestVoice, toHumanSpeechText, voiceStyle]);

  // Send to chat API
  const sendMessage = useCallback(async (text: string) => {
    if (!aiReady) {
      const err = "Gemini API Key not configured on the server.";
      setCallLog((prev) => [...prev, { role: "assistant", text: err }]);
      speak(err);
      return;
    }
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
      if (data.escalated) {
        setCallLog((prev) => [...prev, { role: "assistant", text: GUEST_STAFF_HANDOFF_MESSAGE }]);
        autoListenRef.current = false;
      }
      speak(reply);
      if (data.escalated) {
        window.setTimeout(() => speak(GUEST_STAFF_HANDOFF_MESSAGE), 400);
      }
    } catch {
      const err = "I'm sorry, I'm having trouble right now.";
      setCallLog((prev) => [...prev, { role: "assistant", text: err }]);
      speak(err);
    } finally {
      setIsProcessing(false);
    }
  }, [aiReady, languageCode, speak]);

  // Stop server listening
  const stopServerListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
    if (audioLevelFrameRef.current) {
      cancelAnimationFrame(audioLevelFrameRef.current);
      audioLevelFrameRef.current = 0;
    }
    audioLevelRef.current = 0;
    lastAudioLevelUpdateRef.current = 0;
    setAudioLevel(0);
  }, []);

  const endCall = useCallback(() => {
    endingCallRef.current = true;
    autoListenRef.current = false;
    if (nativeSilenceTimerRef.current) {
      clearTimeout(nativeSilenceTimerRef.current);
      nativeSilenceTimerRef.current = null;
    }
    nativeDraftTranscriptRef.current = "";
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    stopServerListening();
    liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    synthRef.current?.cancel();
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    setCallState("ended");
    setIsListening(false);
    setIsSpeaking(false);
    const endedAt = Date.now();
    const lastUserText = [...callLog].reverse().find((entry) => entry.role === "user")?.text ?? "No guest speech captured";
    const transcriptPreview = lastUserText.length > 140 ? `${lastUserText.slice(0, 137)}...` : lastUserText;
    const record: CallHistoryRecord = {
      id: `${callStartedAtRef.current}-${endedAt}`,
      startedAt: callStartedAtRef.current,
      endedAt,
      durationSec: duration,
      languageCode,
      mode: liveMode ? "server" : useServerModeRef.current ? "server" : "native",
      transcriptPreview,
      totalTurns: callLog.length,
    };
    setTimeout(() => onEnd(record), 1200);
  }, [callLog, duration, languageCode, liveMode, onEnd, stopServerListening]);

  const fallbackToStandardCall = useCallback(() => {
    liveStartedRef.current = false;
    setLiveMode(false);
    liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    const greeting = "Hello! Thank you for calling. How may I assist you today?";
    setCallLog([{ role: "assistant", text: greeting }]);
    speak(greeting);
  }, [speak]);

  const startGeminiLiveCall = useCallback(async () => {
    if (liveStartedRef.current || !geminiLiveReady) return;
    liveStartedRef.current = true;

    const attachLiveMic = async (session: GeminiLiveSession) => {
      let stream = preAcquiredMicRef.current;
      if (!stream?.active) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        preAcquiredMicRef.current = stream;
      }
      await session.startMic(stream);
      setIsListening(true);
      setLiveTranscript("");
    };

    try {
      const res = await fetch("/api/gemini/live-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.token || !data.model) {
        throw new Error(data.error || "Live token unavailable");
      }

      const session = new GeminiLiveSession();
      liveSessionRef.current = session;
      setLiveMode(true);
      autoListenRef.current = true;

      let pendingUser = "";
      let pendingAssistant = "";

      await session.connect(data.token, data.model, {
        onOpen: () => {
          void (async () => {
            try {
              await attachLiveMic(session);
              session.sendGreeting(
                `A guest just connected to ${hotelName} front desk. Greet them warmly in ${languageCode} and ask how you can help.`
              );
            } catch {
              fallbackToStandardCall();
            }
          })();
        },
        onInputTranscript: (text) => {
          pendingUser = text;
          setLiveTranscript(text);
        },
        onOutputTranscript: (text) => {
          pendingAssistant = text;
          setCallLog((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && liveMode) {
              return [...prev.slice(0, -1), { role: "assistant", text }];
            }
            return [...prev, { role: "assistant", text }];
          });
        },
        onSpeakingChange: (speaking) => {
          setIsSpeaking(speaking);
          if (!speaking && pendingUser) {
            setCallLog((prev) => [...prev, { role: "user", text: pendingUser }]);
            pendingUser = "";
            setLiveTranscript("");
          }
          if (!speaking && pendingAssistant) {
            pendingAssistant = "";
          }
        },
        onError: (message) => {
          setCallLog((prev) => [...prev, { role: "assistant", text: message }]);
          if (!endingCallRef.current && callStateRef.current === "connected") {
            fallbackToStandardCall();
          }
        },
      });
    } catch {
      fallbackToStandardCall();
    }
  }, [fallbackToStandardCall, geminiLiveReady, hotelName, languageCode]);

  const pickCallRecorderMimeType = (): string | undefined => {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return undefined;
  };

  // Server-side recording with silence detection & audio level visualization
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
        // Stop audio level monitoring
        if (audioLevelFrameRef.current) {
          cancelAnimationFrame(audioLevelFrameRef.current);
          audioLevelFrameRef.current = 0;
        }
        audioLevelRef.current = 0;
        lastAudioLevelUpdateRef.current = 0;
        setAudioLevel(0);

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

      // ── Silence detection using Web Audio API ──
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = VOICE_SILENCE_THRESHOLD;
      const SILENCE_DURATION_MS = VOICE_SILENCE_SUBMIT_MS;
      const SPEECH_MIN_MS = VOICE_SPEECH_MIN_MS;
      const MAX_RECORD_MS = VOICE_MAX_RECORD_MS;

      let silenceStart: number | null = null;
      let hasHeardSpeech = false;
      const recordStart = Date.now();
      let stopped = false;

      const checkSilence = () => {
        if (stopped) return;
        if (recorder.state !== "recording") return;

        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;

        // Throttle visual updates to avoid rerendering the full call UI on every frame.
        const normalized = Math.min(avg / 80, 1);
        const now = Date.now();
        if (
          now - lastAudioLevelUpdateRef.current > 80 ||
          Math.abs(normalized - audioLevelRef.current) >= 0.08
        ) {
          audioLevelRef.current = normalized;
          lastAudioLevelUpdateRef.current = now;
          setAudioLevel(normalized);
        }

        if (avg > SILENCE_THRESHOLD) {
          hasHeardSpeech = true;
          silenceStart = null;
        } else {
          if (silenceStart === null) silenceStart = Date.now();
        }

        const elapsed = Date.now() - recordStart;

        // Auto-stop: silence detected after speech was heard
        if (hasHeardSpeech && silenceStart && (Date.now() - silenceStart > SILENCE_DURATION_MS) && elapsed > SPEECH_MIN_MS) {
          stopped = true;
          recorder.stop();
          audioCtx.close().catch(() => {});
          return;
        }

        // Safety timeout
        if (elapsed > MAX_RECORD_MS) {
          stopped = true;
          recorder.stop();
          audioCtx.close().catch(() => {});
          return;
        }

        audioLevelFrameRef.current = requestAnimationFrame(checkSilence);
      };

      recorder.start(250);
      setIsListening(true);

      // Wait before starting silence detection to let mic warm up
      setTimeout(() => {
        if (!stopped && recorder.state === "recording") {
          checkSilence();
        }
      }, 300);

    } catch { setIsListening(false); }
  }, [isMuted, languageCode, sendMessage]);

  // Start listening — tries native Web Speech API first, falls back to server STT
  const startListening = useCallback(() => {
    if (isMuted || !autoListenRef.current) return;
    if (useServerModeRef.current) {
      startServerListening();
      return;
    }

    const win = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      useServerModeRef.current = true;
      setUseServerMode(true);
      startServerListening();
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = languageCode;

    const clearNativeSilenceTimer = () => {
      if (nativeSilenceTimerRef.current) {
        clearTimeout(nativeSilenceTimerRef.current);
        nativeSilenceTimerRef.current = null;
      }
    };

    const scheduleNativeSilenceSubmit = () => {
      clearNativeSilenceTimer();
      nativeSilenceTimerRef.current = setTimeout(() => {
        if (!autoListenRef.current) return;
        const text = nativeDraftTranscriptRef.current.trim();
        nativeDraftTranscriptRef.current = "";
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
        setLiveTranscript("");
        if (text) {
          sendMessage(text);
        } else {
          setTimeout(() => startListeningRef.current(), 300);
        }
      }, VOICE_SILENCE_SUBMIT_MS);
    };

    rec.onstart = () => {
      setIsListening(true);
      nativeDraftTranscriptRef.current = "";
      setLiveTranscript("");
      scheduleNativeSilenceSubmit();
    };

    rec.onresult = (e: SpeechRecognitionEventLike) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      nativeDraftTranscriptRef.current = transcript;
      setLiveTranscript(transcript);
      if (transcript.trim()) scheduleNativeSilenceSubmit();
    };

    rec.onerror = (e: { error: string }) => {
      clearNativeSilenceTimer();
      setIsListening(false);
      if (e.error === "network") {
        useServerModeRef.current = true;
        setUseServerMode(true);
        setTimeout(() => startServerListening(), 100);
      } else if (e.error === "no-speech" && autoListenRef.current) {
        setTimeout(() => startListeningRef.current(), 500);
      }
    };

    rec.onend = () => {
      clearNativeSilenceTimer();
      setIsListening(false);
    };

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
        if (geminiLiveReady) {
          setCallLog([]);
          startGeminiLiveCall();
        } else {
          const greeting = "Hello! Thank you for calling. How may I assist you today?";
          setCallLog([{ role: "assistant", text: greeting }]);
          speak(greeting);
        }
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [callState, geminiLiveReady, speak, startGeminiLiveCall]);

  // Toggle mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (nextMuted) {
      recognitionRef.current?.stop();
      stopServerListening();
      if (liveMode && preAcquiredMicRef.current) {
        preAcquiredMicRef.current.getTracks().forEach((track) => {
          track.enabled = false;
        });
        setIsListening(false);
      } else {
        liveSessionRef.current?.disconnect();
        liveSessionRef.current = null;
        setLiveMode(false);
        setIsListening(false);
      }
    } else if (callState === "connected" && !isSpeaking && !isProcessing) {
      if (liveMode && preAcquiredMicRef.current) {
        preAcquiredMicRef.current.getTracks().forEach((track) => {
          track.enabled = true;
        });
        setIsListening(true);
      } else if (geminiLiveReady && liveStartedRef.current) {
        startGeminiLiveCall();
      } else {
        startListening();
      }
    }
    setIsMuted(nextMuted);
  };

  // Audio-reactive wave bars
  const WaveBars = ({ level, color = "#4ade80" }: { level?: number; color?: string }) => {
    const bars = 7;
    return (
      <div className="flex items-center gap-[3px] h-10">
        {Array.from({ length: bars }).map((_, i) => {
          const center = (bars - 1) / 2;
          const dist = Math.abs(i - center) / center; // 0 at center, 1 at edges
          const baseH = 6;
          const maxH = 32;
          const l = level ?? 0.5;
          const h = baseH + (maxH - baseH) * l * (1 - dist * 0.6);
          return (
            <div
              key={i}
              className="w-[3px] rounded-full transition-all duration-75"
              style={{
                height: `${h}px`,
                backgroundColor: color,
                opacity: 0.5 + l * 0.5,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 animate-slide-up" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)" }}>
      <div className="h-full flex flex-col items-center justify-between py-12 px-6">
        {/* Top: Status */}
        <div className="text-center">
          {callState === "ringing" && (
            <p className="text-green-400 text-sm font-medium animate-pulse tracking-widest uppercase">Calling...</p>
          )}
          {callState === "connected" && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-green-400 text-sm font-mono tracking-widest">{formatTime(duration)}</p>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                <span className="text-[9px] font-bold tracking-widest text-neutral-500 uppercase">
                  {liveMode ? "Live voice" : useServerMode ? "AI Speech" : "Native Speech"}
                </span>
              </div>
            </div>
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
            {isListening && (
              <div
                className="absolute rounded-full border-2 border-red-400/30 transition-all duration-150"
                style={{
                  inset: `${-4 - audioLevel * 12}px`,
                  opacity: 0.3 + audioLevel * 0.5,
                }}
              />
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
            <div className="text-center min-h-[56px] flex flex-col items-center justify-center">
              {isSpeaking && (
                <div className="flex flex-col items-center gap-2">
                  <WaveBars level={0.7} color="#4ade80" />
                  <p className="text-green-400/70 text-xs">Receptionist speaking...</p>
                </div>
              )}
              {isListening && !isSpeaking && (
                <div className="flex flex-col items-center gap-2">
                  <WaveBars level={audioLevel} color="#f87171" />
                  <p className="text-neutral-400 text-xs">{liveTranscript || "Listening..."}</p>
                </div>
              )}
              {isProcessing && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-neutral-500 text-xs">Processing...</p>
                </div>
              )}
              {!isListening && !isSpeaking && !isProcessing && (
                <p className="text-neutral-600 text-xs">Waiting...</p>
              )}
            </div>
          )}

          {/* Call log (scrollable) */}
          {callState === "connected" && callLog.length > 0 && (
            <div className="w-full max-w-sm max-h-44 overflow-y-auto scrollbar-thin space-y-2 px-2">
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
