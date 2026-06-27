"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Mic,
  Volume2,
  Loader2,
  ChevronDown,
  Check,
  Send,
  MessageSquare,
  Globe2,
  X,
} from "lucide-react";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { vapiPanelShell, vapiTabActive, vapiTabIdle } from "@/lib/vapiUi";
import { ConciergeAvatar } from "@/components/ConciergeAvatar";
import { VoicePresenceBar } from "@/components/VoicePresenceBar";
import { ServiceHealthBar } from "@/components/ServiceHealthBar";
import {
  createNemotronVoiceSpeaker,
  ensureAudioUnlocked,
  unlockBrowserAudio,
  type NemotronVoiceSpeaker,
} from "@/lib/clientNemotronVoice";
import { sanitizeForSpeech, trimForVoiceReply, VOICE_STATUS } from "@/lib/humanizeSpeech";
import { getUIStrings, type UIStrings } from "@/lib/languages";
import { measureMicRms, isSpeechLevel } from "@/lib/voiceActivity";
import {
  VOICE_MAX_RECORD_MS,
  VOICE_MIC_WARMUP_MS,
  VOICE_MIN_BLOB_BYTES,
  VOICE_RECORDER_TIMESLICE_MS,
  VOICE_RESUME_LISTEN_MS,
  VOICE_RMS_THRESHOLD,
  VOICE_SILENCE_SUBMIT_MS,
  VOICE_SPEECH_MIN_MS,
  VOICE_STT_RETRY_MS,
} from "@/lib/voiceSilence";
import { isJunkTranscription, sanitizeTranscription } from "@/lib/sttValidation";

const STAYNEP_ACCENT = "#e96b34";
const CONCIERGE_NAME = "StayNep";
const STT_STORAGE_KEY = "staynep-stt-mode";

const SUGGESTED_QUESTIONS = [
  "Which hotels are on StayNep?",
  "Find a hotel with a pool",
  "What are the cheapest rooms?",
  "Hotels in Nepal",
  "Compare amenities",
  "I want to book a hotel",
];

// Languages where Chrome/Edge Web Speech API has no support or very poor quality
const BROWSER_STT_UNRELIABLE = new Set([
  "ne-NP", "sw-KE", "et-EE", "lt-LT", "fil-PH", "ms-MY", "uk-UA", "bn-BD",
]);

const PREMIUM_VOICE_HINTS = [
  "premium", "enhanced", "natural", "neural", "wavenet", "studio", "journey",
  "news", "casual", "polyglot", "eloquence", "samantha", "karen", "moira",
  "serena", "ava", "susan", "allison", "google", "microsoft",
  "helena", "hazel", "zira", "mark", "nova",
];
const ROBOTIC_VOICE_HINTS = ["compact", "espeak", "mbrola", "festival", "old", "legacy"];

type VoiceStyle = "warm" | "professional" | "energetic";
type InputMode = "voice" | "text";

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  ttsLang: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
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
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const ALL_LANGUAGES: LanguageOption[] = [
  { code: "en-US",  name: "English (US)",       nativeName: "English",          flag: "🇺🇸", ttsLang: "en-US" },
  { code: "en-GB",  name: "English (UK)",       nativeName: "English (UK)",     flag: "🇬🇧", ttsLang: "en-GB" },
  { code: "ar-SA",  name: "Arabic",             nativeName: "العربية",          flag: "🇸🇦", ttsLang: "ar-SA" },
  { code: "zh-CN",  name: "Chinese (Mandarin)", nativeName: "中文",              flag: "🇨🇳", ttsLang: "zh-CN" },
  { code: "fr-FR",  name: "French",             nativeName: "Français",         flag: "🇫🇷", ttsLang: "fr-FR" },
  { code: "de-DE",  name: "German",             nativeName: "Deutsch",          flag: "🇩🇪", ttsLang: "de-DE" },
  { code: "hi-IN",  name: "Hindi",              nativeName: "हिन्दी",            flag: "🇮🇳", ttsLang: "hi-IN" },
  { code: "id-ID",  name: "Indonesian",         nativeName: "Bahasa Indonesia", flag: "🇮🇩", ttsLang: "id-ID" },
  { code: "it-IT",  name: "Italian",            nativeName: "Italiano",         flag: "🇮🇹", ttsLang: "it-IT" },
  { code: "ja-JP",  name: "Japanese",           nativeName: "日本語",            flag: "🇯🇵", ttsLang: "ja-JP" },
  { code: "ko-KR",  name: "Korean",             nativeName: "한국어",            flag: "🇰🇷", ttsLang: "ko-KR" },
  { code: "ne-NP",  name: "Nepali",             nativeName: "नेपाली",           flag: "🇳🇵", ttsLang: "ne-NP" },
  { code: "pl-PL",  name: "Polish",             nativeName: "Polski",           flag: "🇵🇱", ttsLang: "pl-PL" },
  { code: "pt-BR",  name: "Portuguese (BR)",    nativeName: "Português",        flag: "🇧🇷", ttsLang: "pt-BR" },
  { code: "ru-RU",  name: "Russian",            nativeName: "Русский",          flag: "🇷🇺", ttsLang: "ru-RU" },
  { code: "es-ES",  name: "Spanish",            nativeName: "Español",          flag: "🇪🇸", ttsLang: "es-ES" },
  { code: "th-TH",  name: "Thai",               nativeName: "ไทย",              flag: "🇹🇭", ttsLang: "th-TH" },
  { code: "tr-TR",  name: "Turkish",            nativeName: "Türkçe",           flag: "🇹🇷", ttsLang: "tr-TR" },
  { code: "vi-VN",  name: "Vietnamese",         nativeName: "Tiếng Việt",       flag: "🇻🇳", ttsLang: "vi-VN" },
].sort((a, b) => a.name.localeCompare(b.name));

function getUI(code: string): UIStrings {
  return getUIStrings(code);
}

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export default function StayNepAssistant() {
  const isDark = true;

  const [isListening, setIsListening]       = useState(false);
  const [isProcessing, setIsProcessing]     = useState(false);
  const [isSpeaking, setIsSpeaking]         = useState(false);
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage]     = useState<string | null>(null);
  const [inConversation, setInConversation] = useState(false);
  const inConversationRef                   = useRef(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(
    ALL_LANGUAGES.find((l) => l.code === "en-US") ?? ALL_LANGUAGES[0]
  );
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [inputMode, setInputMode]           = useState<InputMode>("voice");
  const [chatDraft, setChatDraft]           = useState("");
  const [mounted, setMounted]               = useState(false);
  const [aiReady, setAiReady]               = useState<boolean | null>(null);
  const [sttReady, setSttReady]             = useState<boolean | null>(null);
  const [useServerSTT, setUseServerSTT]     = useState(false);

  const isProcessingRef             = useRef(false);
  const isSpeakingRef               = useRef(false);
  const selectedLanguageRef         = useRef(selectedLanguage);
  const inputModeRef                = useRef(inputMode);
  const useServerSTTRef             = useRef(false);
  const autoListenAfterSpeakRef     = useRef(false);
  const lastSubmittedTranscriptRef  = useRef("");
  const lastSubmittedAtRef          = useRef(0);
  const nativeSttNoSpeechCountRef   = useRef(0);
  const lastServerSttAtRef          = useRef(0);
  const serverSttFailCountRef       = useRef(0);
  const nativeDraftTranscriptRef    = useRef("");
  const messagesEndRef              = useRef<HTMLDivElement>(null);
  const messagesRef                 = useRef(messages);
  const langMenuRef                 = useRef<HTMLDivElement>(null);
  const chatInputRef                = useRef<HTMLInputElement>(null);
  const recognitionRef              = useRef<SpeechRecognitionLike | null>(null);
  const nativeSilenceTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef            = useRef<MediaRecorder | null>(null);
  const chunksRef                   = useRef<Blob[]>([]);
  const synthRef                    = useRef<SpeechSynthesis | null>(null);
  const nemotronVoiceRef            = useRef<NemotronVoiceSpeaker | null>(null);
  const cachedVoiceRef              = useRef<SpeechSynthesisVoice | null>(null);
  const startListeningInternalRef   = useRef<() => void>(() => {});
  const handleUserAudioCompleteRef  = useRef<(text: string) => void>(() => {});
  const startServerRecordingRef     = useRef<() => void>(() => {});

  isProcessingRef.current     = isProcessing;
  isSpeakingRef.current       = isSpeaking;
  selectedLanguageRef.current = selectedLanguage;
  inputModeRef.current        = inputMode;
  useServerSTTRef.current     = useServerSTT;
  messagesRef.current         = messages;
  inConversationRef.current   = inConversation;

  const ui = useMemo(() => getUI(selectedLanguage.code), [selectedLanguage]);

  useEffect(() => {
    setMounted(true);
    void fetch("/api/health")
      .then((r) => r.json())
      .then((d: Record<string, boolean>) => {
        setAiReady(d.ai ?? null);
        setSttReady(d.stt ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const savedMode = window.localStorage.getItem("staynep-input-mode");
    if (savedMode === "voice" || savedMode === "text") setInputMode(savedMode);

    const savedStt = window.localStorage.getItem(STT_STORAGE_KEY);
    if (savedStt === "whisper") { setUseServerSTT(true); useServerSTTRef.current = true; }
    else if (savedStt === "native") { setUseServerSTT(false); useServerSTTRef.current = false; }

    const savedLang = window.localStorage.getItem("staynep-language");
    if (savedLang) {
      const lang = ALL_LANGUAGES.find((l) => l.code === savedLang);
      if (lang) setSelectedLanguage(lang);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  useEffect(() => {
    if (!showLanguageMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShowLanguageMenu(false); setLanguageSearch(""); }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKeyDown); };
  }, [showLanguageMenu]);

  useEffect(() => {
    nemotronVoiceRef.current = createNemotronVoiceSpeaker();
    return () => nemotronVoiceRef.current?.cancel();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synthRef.current = synth;
    synth.getVoices();
    const onVoicesChanged = () => { cachedVoiceRef.current = null; };
    synth.addEventListener("voiceschanged", onVoicesChanged);
    return () => synth.removeEventListener("voiceschanged", onVoicesChanged);
  }, []);

  const toHumanSpeechText = useCallback(
    (text: string) => trimForVoiceReply(sanitizeForSpeech(text)),
    []
  );

  const pickBestVoice = useCallback((langCode: string): SpeechSynthesisVoice | null => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    if (!voices.length) return null;
    const primary = langCode.split("-")[0];
    const candidates = voices.filter((v) => v.lang === langCode || v.lang.startsWith(primary));
    if (!candidates.length) return null;
    const scored = candidates.map((v) => {
      const n = v.name.toLowerCase();
      let score = 0;
      if (PREMIUM_VOICE_HINTS.some((k) => n.includes(k))) score += 14;
      if (ROBOTIC_VOICE_HINTS.some((k) => n.includes(k))) score -= 25;
      if (!v.localService) score += 5;
      if (["female", "woman", "samantha", "serena", "karen", "moira", "ava"].some((k) => n.includes(k))) score += 4;
      if (v.lang === langCode) score += 3;
      return { voice: v, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].voice;
  }, []);

  const speakWithBrowser = useCallback(
    (text: string, resumeListenAfter = true, chain = false, onSpeechStart?: () => void): Promise<boolean> =>
      new Promise((resolve) => {
        const synth = synthRef.current;
        if (!synth) { resolve(false); return; }
        ensureAudioUnlocked();
        if (synth.paused) synth.resume();
        const cleaned = toHumanSpeechText(text);
        if (!cleaned) { resolve(false); return; }

        let settled = false; let started = false; let retried = false;
        const finish = (ok: boolean) => { if (settled) return; settled = true; window.clearTimeout(startTimeout); resolve(ok); };

        const speakOnce = () => {
          if (!chain) synth.cancel();
          if (synth.paused) synth.resume();
          const utterance = new SpeechSynthesisUtterance(cleaned);
          const lang = selectedLanguageRef.current.ttsLang;
          utterance.lang = lang;
          if (!cachedVoiceRef.current || cachedVoiceRef.current.lang.split("-")[0] !== lang.split("-")[0]) {
            cachedVoiceRef.current = pickBestVoice(lang);
          }
          if (cachedVoiceRef.current) utterance.voice = cachedVoiceRef.current;
          utterance.rate = 0.92; utterance.pitch = 1.0; utterance.volume = 1.0;
          utterance.onstart = () => { started = true; setIsSpeaking(true); onSpeechStart?.(); };
          utterance.onend = () => {
            setIsSpeaking(false);
            if (resumeListenAfter && inConversationRef.current) {
              setTimeout(() => { if (inConversationRef.current) startListeningInternalRef.current(); }, VOICE_RESUME_LISTEN_MS);
            }
            finish(true);
          };
          utterance.onerror = () => {
            setIsSpeaking(false);
            if (!retried) { retried = true; window.setTimeout(speakOnce, 120); return; }
            finish(false);
          };
          synth.speak(utterance);
        };

        const startTimeout = window.setTimeout(() => {
          if (!started) { if (!retried) { retried = true; speakOnce(); return; } finish(false); }
        }, 1500);
        speakOnce();
      }),
    [pickBestVoice, toHumanSpeechText]
  );

  const speakText = useCallback(async (
    text: string,
    options?: { chain?: boolean; onSpeechStart?: () => void; forceProvider?: "browser" | "server" }
  ): Promise<boolean> => {
    const cleaned = toHumanSpeechText(text);
    if (!cleaned) return false;
    ensureAudioUnlocked();
    const resumeListenAfter = !options?.chain;
    if (!options?.chain) { synthRef.current?.cancel(); nemotronVoiceRef.current?.cancel(); }

    const forceProvider = options?.forceProvider;
    if (forceProvider !== "browser") {
      if (nemotronVoiceRef.current) {
        const used = await nemotronVoiceRef.current.speak({
          text: cleaned,
          language: selectedLanguageRef.current.ttsLang,
          voiceStyle: "warm" as VoiceStyle,
          onStart: () => { setIsSpeaking(true); options?.onSpeechStart?.(); },
          onEnd: () => {
            setIsSpeaking(false);
            if (resumeListenAfter && inConversationRef.current) {
              setTimeout(() => { if (inConversationRef.current) startListeningInternalRef.current(); }, VOICE_RESUME_LISTEN_MS);
            }
          },
          onError: () => setIsSpeaking(false),
        });
        if (used) return true;
      }
    }

    if (forceProvider !== "server") {
      const ok = await speakWithBrowser(cleaned, resumeListenAfter, Boolean(options?.chain), options?.onSpeechStart);
      if (ok) return true;
    }
    return false;
  }, [speakWithBrowser, toHumanSpeechText]);

  const handleUserMessage = useCallback(async (text: string, speakReply = inputModeRef.current === "voice") => {
    setIsListening(false);
    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    const payload = {
      message: text,
      language: selectedLanguageRef.current.code,
      history: messagesRef.current.slice(-4),
      channel: inputModeRef.current === "voice" ? "voice" : "text",
    };

    try {
      if (speakReply) {
        ensureAudioUnlocked();
        const response = await fetch("/api/staynep-chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok || !response.body) {
          const fallback = await response.json().catch(() => ({})) as { reply?: string; error?: string };
          const reply = typeof fallback.reply === "string" && fallback.reply.trim()
            ? fallback.reply.trim()
            : typeof fallback.error === "string" && fallback.error.trim()
              ? fallback.error.trim()
              : ui.errorConnection;
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
          if (inConversationRef.current) {
            autoListenAfterSpeakRef.current = true;
            const spoken = await speakText(reply);
            if (!spoken && inConversationRef.current) {
              setTimeout(() => { if (inConversationRef.current) startListeningInternalRef.current(); }, VOICE_RESUME_LISTEN_MS);
            }
          }
          return;
        }

        synthRef.current?.cancel();
        nemotronVoiceRef.current?.cancel();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullReply = "";
        let donePayload: Record<string, unknown> | null = null;
        let heardAudio = false;
        const markHeard = () => { heardAudio = true; };

        const prefetchReplyAudio = (t: string) => {
          const spoken = toHumanSpeechText(t);
          if (spoken.length < 12 || !nemotronVoiceRef.current) return;
          nemotronVoiceRef.current.prefetch({ text: spoken, language: selectedLanguageRef.current.ttsLang, voiceStyle: "warm" });
        };

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as { type?: string; text?: string; reply?: string; error?: string };
              if (event.type === "error") {
                const err = typeof event.error === "string" && event.error.trim()
                  ? event.error.trim() : ui.errorGeneric;
                fullReply = err;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") next[next.length - 1] = { ...last, content: err };
                  return next;
                });
              } else if (event.type === "delta" && event.text) {
                fullReply += event.text;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") next[next.length - 1] = { ...last, content: fullReply };
                  return next;
                });
                prefetchReplyAudio(fullReply);
              } else if (event.type === "done") {
                donePayload = event;
              }
            } catch { /* ignore */ }
          }
        }

        const finalReply = (typeof donePayload?.reply === "string" && donePayload.reply.trim()) || fullReply.trim();
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") next[next.length - 1] = { ...last, content: finalReply };
          return next;
        });

        if (finalReply && inConversationRef.current) {
          autoListenAfterSpeakRef.current = true;
          prefetchReplyAudio(finalReply);
          if (!heardAudio) {
            const spoken = await speakText(finalReply, { onSpeechStart: markHeard, forceProvider: "server" });
            // If server TTS unavailable, fall back to re-listening directly
            if (!spoken && inConversationRef.current) {
              setTimeout(() => { if (inConversationRef.current) startListeningInternalRef.current(); }, VOICE_RESUME_LISTEN_MS);
            }
          } else if (inConversationRef.current) {
            setTimeout(() => { if (inConversationRef.current) startListeningInternalRef.current(); }, VOICE_RESUME_LISTEN_MS);
          }
        } else {
          autoListenAfterSpeakRef.current = false;
        }
        return;
      }

      // Text mode
      const response = await fetch("/api/staynep-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { reply?: string; error?: string };
      const reply = typeof data.reply === "string" && data.reply.trim()
        ? data.reply.trim()
        : typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : ui.errorGeneric;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: ui.errorConnection }]);
    } finally {
      setIsProcessing(false);
    }
  }, [speakText, toHumanSpeechText, ui.errorConnection, ui.errorGeneric]);

  const handleUserAudioComplete = useCallback((rawText: string) => {
    const text = sanitizeTranscription(rawText);
    if (!text || isJunkTranscription(text)) {
      if (inConversationRef.current) setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS);
      return;
    }
    if (isProcessingRef.current || isSpeakingRef.current) return;
    const now = Date.now();
    if (text === lastSubmittedTranscriptRef.current && now - lastSubmittedAtRef.current < 2500) return;
    lastSubmittedTranscriptRef.current = text;
    lastSubmittedAtRef.current = now;
    nativeSttNoSpeechCountRef.current = 0;
    void handleUserMessage(text, inputModeRef.current === "voice");
  }, [handleUserMessage]);
  handleUserAudioCompleteRef.current = handleUserAudioComplete;

  const handleSttFailure = useCallback((message: string, status?: number) => {
    setIsListening(false);
    if (status === 429) {
      setErrorMessage(message);
      setUseServerSTT(false);
      autoListenAfterSpeakRef.current = false;
      inConversationRef.current = false;
      setInConversation(false);
      return;
    }
    const noSpeech = status === 422 || /no speech detected|recording too short|too short/i.test(message);
    if (noSpeech && inConversationRef.current) {
      setErrorMessage(null);
      setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS);
      return;
    }
    setErrorMessage(message);
  }, []);

  const startServerRecording = useCallback(async () => {
    const now = Date.now();
    if (now - lastServerSttAtRef.current < 600) {
      if (inConversationRef.current) setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS);
      return;
    }
    lastServerSttAtRef.current = now;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      // Guard: session was stopped while waiting for mic permission
      if (!inConversationRef.current && !autoListenAfterSpeakRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      const blobType = recorder.mimeType || mimeType || "audio/webm";
      const heardSpeechRef = { current: false };

      const retryListen = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (inConversationRef.current) { setErrorMessage(null); setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS); }
        else setIsListening(false);
      };

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        if (!heardSpeechRef.current) { retryListen(); return; }
        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        if (audioBlob.size < VOICE_MIN_BLOB_BYTES) { retryListen(); return; }

        const formData = new FormData();
        formData.append("audio", audioBlob);
        formData.append("language", selectedLanguageRef.current.code);
        try {
          const res = await fetch("/api/stt", { method: "POST", body: formData });
          const data = await res.json() as { text?: string; error?: string; fallbackNative?: boolean };
          const transcribed = typeof data.text === "string" ? sanitizeTranscription(data.text) : "";
          if (transcribed && !isJunkTranscription(transcribed)) {
            stream.getTracks().forEach((t) => t.stop());
            serverSttFailCountRef.current = 0;
            handleUserAudioCompleteRef.current(transcribed);
          } else if (inConversationRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            if (data.fallbackNative && serverSttFailCountRef.current >= 1) {
              const win = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
              if (win.SpeechRecognition || win.webkitSpeechRecognition) {
                serverSttFailCountRef.current = 0;
                setUseServerSTT(false); useServerSTTRef.current = false;
                setErrorMessage(null);
                setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS);
                return;
              }
            }
            serverSttFailCountRef.current += 1;
            handleSttFailure(typeof data.error === "string" && data.error.trim() ? data.error.trim() : ui.errorNoSpeech, res.status);
          } else {
            stream.getTracks().forEach((t) => t.stop());
            handleSttFailure(typeof data.error === "string" && data.error.trim() ? data.error.trim() : ui.errorNoSpeech, res.status);
          }
        } catch {
          stream.getTracks().forEach((t) => t.stop());
          handleSttFailure(ui.errorNetwork);
        }
      };

      const audioCtx = new AudioContext();
      void audioCtx.resume();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      const timeDomainBuffer = new Uint8Array(analyser.fftSize);
      let silenceStart: number | null = null;
      let speechStartedAt: number | null = null;
      const recordStart = Date.now();
      let stopped = false;

      const stopRecording = () => {
        if (stopped) return; stopped = true;
        try { if (recorder.state === "recording") recorder.requestData(); } catch { /* ignore */ }
        try { if (recorder.state === "recording") recorder.stop(); } catch { /* ignore */ }
        void audioCtx.close();
      };

      const checkSilence = () => {
        if (stopped || recorder.state !== "recording") return;
        const rms = measureMicRms(analyser, timeDomainBuffer);
        if (isSpeechLevel(rms, VOICE_RMS_THRESHOLD)) {
          heardSpeechRef.current = true;
          if (speechStartedAt === null) speechStartedAt = Date.now();
          silenceStart = null;
        } else if (heardSpeechRef.current && silenceStart === null) {
          silenceStart = Date.now();
        }
        const elapsed = Date.now() - recordStart;
        const speechMs = speechStartedAt ? Date.now() - speechStartedAt : 0;
        if (heardSpeechRef.current && silenceStart && Date.now() - silenceStart > VOICE_SILENCE_SUBMIT_MS && speechMs >= VOICE_SPEECH_MIN_MS) { stopRecording(); return; }
        if (elapsed > VOICE_MAX_RECORD_MS) { stopRecording(); return; }
        requestAnimationFrame(checkSilence);
      };

      recorder.start(VOICE_RECORDER_TIMESLICE_MS);
      setIsListening(true);
      setTimeout(() => { if (!stopped && recorder.state === "recording") checkSilence(); }, VOICE_MIC_WARMUP_MS);
    } catch {
      handleSttFailure(ui.errorMicDenied);
    }
  }, [handleSttFailure, ui.errorMicDenied, ui.errorNoSpeech, ui.errorNetwork]);
  startServerRecordingRef.current = startServerRecording;

  const startListeningInternal = useCallback(() => {
    if (isProcessingRef.current || isSpeakingRef.current) return;
    if (!inConversationRef.current && !autoListenAfterSpeakRef.current) return;

    setErrorMessage(null);
    synthRef.current?.cancel();
    nemotronVoiceRef.current?.cancel();
    setIsSpeaking(false);

    const win = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR || useServerSTTRef.current) {
      void startServerRecordingRef.current();
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguageRef.current.code;

    const clearNativeSilenceTimer = () => {
      if (nativeSilenceTimerRef.current) { clearTimeout(nativeSilenceTimerRef.current); nativeSilenceTimerRef.current = null; }
    };

    const scheduleNativeSilenceSubmit = () => {
      clearNativeSilenceTimer();
      nativeSilenceTimerRef.current = setTimeout(() => {
        if (!inConversationRef.current) return;
        const text = nativeDraftTranscriptRef.current.trim();
        nativeDraftTranscriptRef.current = "";
        try { recognition.stop(); } catch { /* already stopped */ }
        if (text) {
          handleUserAudioCompleteRef.current(text);
        } else if (autoListenAfterSpeakRef.current) {
          setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS);
        }
      }, VOICE_SILENCE_SUBMIT_MS);
    };

    recognition.onstart = () => {
      setIsListening(true);
      nativeDraftTranscriptRef.current = "";
      scheduleNativeSilenceSubmit();
    };
    recognition.onresult = (e: SpeechRecognitionEventLike) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; ++i) {
        transcript += e.results[i][0].transcript;
      }
      nativeDraftTranscriptRef.current = transcript;
      if (transcript.trim()) scheduleNativeSilenceSubmit();
    };
    recognition.onerror = (e: { error: string }) => {
      clearNativeSilenceTimer();
      if (e.error === "network") {
        if (sttReady !== false) {
          useServerSTTRef.current = true;
          setUseServerSTT(true);
          setErrorMessage(null);
          setTimeout(() => startServerRecordingRef.current(), 100);
        } else {
          setErrorMessage("Browser speech recognition failed. Check your connection.");
        }
      } else if (e.error === "not-allowed") {
        setErrorMessage(ui.errorMicDenied);
        inConversationRef.current = false;
        setInConversation(false);
      } else if (e.error === "no-speech") {
        nativeSttNoSpeechCountRef.current += 1;
        if (nativeSttNoSpeechCountRef.current >= 2 && sttReady !== false) {
          nativeSttNoSpeechCountRef.current = 0;
          useServerSTTRef.current = true;
          setUseServerSTT(true);
          window.localStorage.setItem(STT_STORAGE_KEY, "whisper");
          setErrorMessage(null);
          if (inConversationRef.current) setTimeout(() => startServerRecordingRef.current(), 100);
        } else if (autoListenAfterSpeakRef.current) {
          setTimeout(() => { if (inConversationRef.current) startListeningInternalRef.current(); }, VOICE_STT_RETRY_MS);
        }
      }
      setIsListening(false);
      if (e.error !== "no-speech") {
        autoListenAfterSpeakRef.current = false;
        nativeSttNoSpeechCountRef.current = 0;
      }
    };
    recognition.onend = () => {
      clearNativeSilenceTimer();
      setIsListening(false);
    };

    recognitionRef.current?.abort();
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setIsListening(false); }
  }, [sttReady, ui.errorMicDenied]);
  startListeningInternalRef.current = startListeningInternal;

  const stopEverything = useCallback(() => {
    inConversationRef.current = false;
    setInConversation(false);
    autoListenAfterSpeakRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (nativeSilenceTimerRef.current) {
      clearTimeout(nativeSilenceTimerRef.current);
      nativeSilenceTimerRef.current = null;
    }
    nativeDraftTranscriptRef.current = "";
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    synthRef.current?.cancel();
    nemotronVoiceRef.current?.cancel();
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    setErrorMessage(null);
  }, []);

  const toggleListening = useCallback(() => {
    if (inConversation || isListening || isSpeaking || isProcessing) {
      stopEverything();
    } else {
      setErrorMessage(null);
      unlockBrowserAudio();
      inConversationRef.current = true;
      setInConversation(true);
      autoListenAfterSpeakRef.current = true;
      serverSttFailCountRef.current = 0;
      startListeningInternal();
    }
  }, [inConversation, isListening, isProcessing, isSpeaking, startListeningInternal, stopEverything]);

  const switchInputMode = useCallback((mode: InputMode) => {
    setInputMode(mode);
    window.localStorage.setItem("staynep-input-mode", mode);
    if (mode === "text") {
      stopEverything();
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [stopEverything]);

  const changeLanguage = useCallback((lang: LanguageOption) => {
    setSelectedLanguage(lang);
    window.localStorage.setItem("staynep-language", lang.code);
    setShowLanguageMenu(false);
    setLanguageSearch("");
    nativeSttNoSpeechCountRef.current = 0;
    if (BROWSER_STT_UNRELIABLE.has(lang.code) && sttReady !== false) {
      useServerSTTRef.current = true;
      setUseServerSTT(true);
      window.localStorage.setItem(STT_STORAGE_KEY, "whisper");
    }
  }, [sttReady]);

  const handleSuggestedQuestion = useCallback((q: string) => {
    if (isProcessing || isListening || isSpeaking) return;
    setErrorMessage(null);
    const useVoice = inputModeRef.current === "voice";
    if (useVoice && !inConversationRef.current) { inConversationRef.current = true; setInConversation(true); autoListenAfterSpeakRef.current = true; }
    void handleUserMessage(q, useVoice);
  }, [handleUserMessage, isListening, isProcessing, isSpeaking]);

  const submitChatMessage = useCallback(() => {
    const trimmed = chatDraft.trim();
    if (!trimmed || isProcessing || isListening || isSpeaking) return;
    setErrorMessage(null);
    setChatDraft("");
    void handleUserMessage(trimmed, false);
  }, [chatDraft, handleUserMessage, isListening, isProcessing, isSpeaking]);

  const voicePresenceMode: "idle" | "listening" | "speaking" | "thinking" =
    isListening ? "listening" : isSpeaking ? "speaking" : isProcessing ? "thinking" : "idle";

  const voiceStatusLabel =
    isListening  ? VOICE_STATUS.listening
    : isSpeaking   ? VOICE_STATUS.speaking
    : isProcessing ? VOICE_STATUS.thinking
    : inConversation ? VOICE_STATUS.tapToEnd
    : ui.tapToSpeak;

  const filteredLanguages = useMemo(() => {
    const q = languageSearch.toLowerCase().trim();
    if (!q) return ALL_LANGUAGES;
    return ALL_LANGUAGES.filter((l) =>
      l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q)
    );
  }, [languageSearch]);

  if (!mounted) return null;

  const renderVoiceOrb = (compact = false) => {
    const size = compact ? "w-20 h-20" : "w-32 h-32";
    const iconSize = compact ? "w-8 h-8" : "w-12 h-12";
    const innerIcon = compact ? "w-6 h-6" : "w-8 h-8";
    return (
      <div className="relative group mx-auto cursor-pointer" onClick={toggleListening}>
        {isListening && (
          <div className={`absolute ${compact ? "-inset-8" : "-inset-12"}`}>
            <div className="ripple-ring scale-150" style={{ animationDelay: "0s", borderColor: STAYNEP_ACCENT, opacity: 0.35 }} />
            <div className="ripple-ring scale-150" style={{ animationDelay: "0.8s", borderColor: STAYNEP_ACCENT, opacity: 0.18 }} />
          </div>
        )}
        <div
          className={`glass-circle relative z-10 ${size} rounded-full flex flex-col items-center justify-center overflow-hidden border hover:scale-[1.03] active:scale-95 transition-all duration-500 ease-out animate-morph ${
            isListening ? "scale-105 glass-circle-listening" : "border-white/[0.08] group-hover:border-white/20"
          } ${isProcessing ? "animate-pulse" : ""} ${isSpeaking ? "scale-[1.02] glass-circle-speaking concierge-speaking" : ""}`}
        >
          {isProcessing ? (
            <Loader2 className={`${iconSize} animate-spin text-white/80`} />
          ) : isListening ? (
            <Mic className={`${iconSize} animate-pulse text-white/90`} />
          ) : isSpeaking ? (
            <Volume2 className={`${iconSize} animate-pulse-soft text-white/90`} />
          ) : (
            <div className={`${compact ? "w-12 h-12" : "w-16 h-16"} rounded-full flex items-center justify-center border bg-white/[0.04] border-white/[0.08] group-hover:bg-white/[0.08] transition-colors`}>
              <Mic className={`${innerIcon} text-neutral-400 group-hover:text-white/90`} />
            </div>
          )}
          <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-b from-white/[0.06] to-transparent" />
        </div>
      </div>
    );
  };

  const languageModal = showLanguageMenu ? (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-void-canvas/80"
        aria-label="Close language menu"
        onClick={() => { setShowLanguageMenu(false); setLanguageSearch(""); }}
      />
      <div
        className="fixed z-50 flex max-h-[min(72vh,32rem)] flex-col overflow-hidden rounded-[5.6px] border border-iron-border bg-carbon-surface inset-x-4 top-[4.25rem] sm:inset-x-auto sm:right-6 sm:w-[22rem]"
        role="dialog"
        aria-modal="true"
        aria-label="Choose language"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-iron-border px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5.6px] border border-iron-border bg-slab-elevated">
              <Globe2 className="h-4 w-4 text-ice-border" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-cream-text">Language</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-mute">{ALL_LANGUAGES.length} supported</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowLanguageMenu(false); setLanguageSearch(""); }}
            className="flex h-8 w-8 items-center justify-center rounded-[5.6px] text-zinc-mute transition-colors hover:bg-slab-elevated hover:text-cream-text"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="shrink-0 border-b border-iron-border px-4 py-3">
          <input
            type="text"
            autoFocus
            placeholder="Search language..."
            value={languageSearch}
            onChange={(e) => setLanguageSearch(e.target.value)}
            className="w-full rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2 text-sm text-cream-text placeholder-zinc-mute outline-none focus:border-steel-border"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-premium">
          {filteredLanguages.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-mute">No languages match.</p>
          ) : (
            <div className="space-y-0.5">
              {filteredLanguages.map((lang) => {
                const selected = lang.code === selectedLanguage.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => changeLanguage(lang)}
                    className={`flex w-full items-center gap-3 rounded-[5.6px] px-3 py-2.5 text-sm transition-colors ${
                      selected ? "border border-steel-border bg-slab-elevated text-cream-text" : "text-bone-text hover:bg-slab-elevated/60"
                    }`}
                  >
                    <span className="shrink-0 text-xl leading-none">{lang.flag}</span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate font-medium leading-snug">{lang.nativeName}</div>
                      <div className="truncate text-[10px] text-zinc-mute">{lang.name}</div>
                    </div>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-mint-pulse" strokeWidth={2} /> : <span className="w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="shrink-0 border-t border-iron-border bg-slab-elevated px-4 py-2.5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-mute">
            Speaking: {selectedLanguage.flag} {selectedLanguage.nativeName}
          </p>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-void-canvas font-sans text-cream-text">
      <SiteShellBackdrop />

      {/* Header */}
      <header className={`sticky top-0 z-30 shrink-0 border-b ${siteHeaderChrome()}`}>
        <div className="mx-auto flex min-h-14 max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Back to StayNEP home">
            <span className="hidden text-sm font-semibold text-cream-text sm:inline">STAYNEP</span>
            <div className="hidden h-9 w-px shrink-0 bg-iron-border sm:block" aria-hidden />
            <ConciergeAvatar name={CONCIERGE_NAME} accentColor={STAYNEP_ACCENT} size="sm" isDark={isDark} />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-medium text-cream-text">StayNep</h1>
              <p className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-mute sm:block">
                Platform Assistant
              </p>
            </div>
          </Link>

          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setShowLanguageMenu((o) => !o)}
              className={`flex items-center gap-2 rounded-[5.6px] border px-3 py-2 text-[13px] font-medium transition-all active:scale-95 ${
                showLanguageMenu
                  ? "border-steel-border bg-slab-elevated text-cream-text"
                  : "border-iron-border bg-carbon-surface text-bone-text hover:border-steel-border"
              }`}
              aria-expanded={showLanguageMenu}
              aria-haspopup="dialog"
            >
              <span className="text-base">{selectedLanguage.flag}</span>
              <span className="hidden max-w-[5.5rem] truncate sm:inline">{selectedLanguage.nativeName}</span>
              <ChevronDown className={`h-3.5 w-3.5 opacity-40 transition-transform ${showLanguageMenu ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {aiReady === false && (
        <div role="alert" className="mx-auto mt-3 w-full max-w-3xl px-4 sm:px-6">
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/50 px-4 py-3 text-center text-sm text-amber-100">
            Gemini API key is missing. Add <code className="text-amber-200">GOOGLE_GENERATIVE_AI_API_KEY</code> to{" "}
            <code className="text-amber-200">.env.local</code> and restart.
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col lg:min-h-[calc(100vh-3.5rem-2.5rem)] lg:flex-row">
        {/* Conversation column */}
        <main className={`flex min-h-0 min-w-0 flex-1 flex-col px-4 pt-4 sm:px-6 lg:h-full lg:pb-6 lg:pt-6 ${inputMode === "voice" ? "pb-32" : "pb-4"}`}>
          <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5.6px] ${vapiPanelShell}`}>
            {/* Chat header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-iron-border px-4 py-3.5 sm:px-5">
              <ConciergeAvatar name={CONCIERGE_NAME} accentColor={STAYNEP_ACCENT} size="sm" isDark={isDark} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-cream-text">
                  {messages.length === 0 ? "StayNep" : "StayNep, your travel guide"}
                </p>
                <p className="truncate text-[11px] text-zinc-mute">
                  {selectedLanguage.flag} {selectedLanguage.nativeName} · {messages.length === 0 ? "Find your perfect stay" : ui.welcomeHint}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-premium px-4 py-5 sm:px-5">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-8 text-center sm:py-12">
                  <ConciergeAvatar name={CONCIERGE_NAME} accentColor={STAYNEP_ACCENT} size="md" isDark={isDark} className="mb-5" />
                  <h2 className="va-welcome-title text-gradient-brand mb-2 max-w-md text-balance text-2xl sm:text-3xl">
                    StayNep
                  </h2>
                  <p className="mb-6 max-w-sm text-sm leading-relaxed text-neutral-500">
                    How can I help you find the perfect hotel today?
                  </p>
                  <div className="w-full max-w-lg">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                      {ui.suggestedQuestions}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSuggestedQuestion(q)}
                          disabled={isProcessing || isListening || isSpeaking}
                          className="rounded-full border border-iron-border bg-carbon-surface px-3 py-1.5 text-[13px] text-bone-text transition-colors hover:border-steel-border hover:text-cream-text disabled:pointer-events-none disabled:opacity-40"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 pb-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 animate-in slide-in-from-bottom-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      {msg.role === "user" ? (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-neutral-300">
                          <span className="text-[10px] font-black uppercase">{ui.you.charAt(0)}</span>
                        </div>
                      ) : (
                        <ConciergeAvatar name={CONCIERGE_NAME} accentColor={STAYNEP_ACCENT} size="sm" isDark={isDark} className="mt-0.5" />
                      )}
                      <div className={`flex min-w-0 max-w-[85%] flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div
                          className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                            msg.role === "user"
                              ? "rounded-tr-md border border-white/10 bg-white/[0.08] text-neutral-100"
                              : "glass rounded-tl-md border border-white/10 text-neutral-100"
                          }`}
                          style={msg.role === "assistant" ? { borderColor: `${STAYNEP_ACCENT}33` } : undefined}
                        >
                          {msg.content || (
                            <span className="flex items-center gap-1.5 text-neutral-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "120ms" }} />
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "240ms" }} />
                            </span>
                          )}
                        </div>
                        <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                          {msg.role === "user" ? ui.you : "StayNep"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isProcessing && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-3 animate-in slide-in-from-bottom-2">
                      <ConciergeAvatar name={CONCIERGE_NAME} accentColor={STAYNEP_ACCENT} size="sm" isDark={isDark} className="mt-0.5" />
                      <div
                        className="glass rounded-2xl rounded-tl-md border border-white/10 px-4 py-3"
                        style={{ borderColor: `${STAYNEP_ACCENT}33` }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "120ms" }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "240ms" }} />
                          <span className="ml-1 text-[13px] text-neutral-400">{VOICE_STATUS.thinking}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t border-iron-border px-4 py-3 sm:px-5">
              <div className={`flex gap-1 p-1 rounded-xl mb-2.5 bg-white/[0.04]`}>
                <button
                  type="button"
                  onClick={() => switchInputMode("voice")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
                    inputMode === "voice" ? vapiTabActive : vapiTabIdle
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" strokeWidth={2} />
                  Voice
                </button>
                <button
                  type="button"
                  onClick={() => switchInputMode("text")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
                    inputMode === "text" ? vapiTabActive : vapiTabIdle
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
                  Chat
                </button>
              </div>

              {inputMode === "text" ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); submitChatMessage(); }}
                  className="flex gap-2"
                >
                  <input
                    ref={chatInputRef}
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    placeholder="Type your message…"
                    disabled={isProcessing}
                    className="flex-1 rounded-xl border border-iron-border bg-carbon-surface px-3.5 py-2.5 text-sm text-cream-text placeholder-zinc-mute outline-none focus:border-steel-border"
                  />
                  <button
                    type="submit"
                    disabled={!chatDraft.trim() || isProcessing}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: STAYNEP_ACCENT }}
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              ) : (
                <p className="text-center text-[11px] text-neutral-600">
                  Prefer typing? Switch to <button type="button" onClick={() => switchInputMode("text")} className="font-semibold underline underline-offset-2" style={{ color: STAYNEP_ACCENT }}>Chat</button>.
                </p>
              )}
            </div>
          </div>
        </main>

        {/* Sidebar (desktop) */}
        <aside className="hidden w-[300px] shrink-0 flex-col gap-4 border-l border-iron-border px-4 py-6 sm:px-5 lg:flex xl:w-[320px]">
          {/* Voice orb panel */}
          <div className={`flex flex-col items-center gap-4 rounded-[5.6px] p-5 ${vapiPanelShell}`}>
            <div className="flex w-full items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-mute">StayNep</span>
              <button
                type="button"
                onClick={() => {
                  setUseServerSTT((v) => {
                    const next = !v;
                    useServerSTTRef.current = next;
                    window.localStorage.setItem(STT_STORAGE_KEY, next ? "whisper" : "native");
                    return next;
                  });
                }}
                className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-400 transition-colors hover:bg-white/10"
                title={useServerSTT ? "Whisper STT (open-source)" : "Native speech (faster)"}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${useServerSTT ? "bg-cyan-400" : "bg-emerald-500"}`} />
                {useServerSTT ? "Whisper" : "Native"}
              </button>
            </div>

            {renderVoiceOrb(false)}

            <VoicePresenceBar
              active={isListening || isSpeaking || isProcessing}
              mode={voicePresenceMode}
              accentColor={STAYNEP_ACCENT}
              className="w-full max-w-[180px] mx-auto"
            />

            <div className="text-center">
              <p
                className={`text-xs font-bold uppercase tracking-[0.25em] ${isListening ? "" : isSpeaking ? "text-sky-400" : "text-neutral-400"}`}
                style={isListening ? { color: STAYNEP_ACCENT } : undefined}
              >
                {voiceStatusLabel}
              </p>
              <p className="mt-1 text-[11px] text-neutral-600">
                {inConversation ? "Tap orb to stop" : ui.tapToSpeak}
              </p>
            </div>

            {errorMessage && aiReady !== false && (
              <div role="alert" className="w-full rounded-xl border border-amber-500/20 bg-amber-950/40 px-3 py-2 text-center text-[11px] font-medium text-amber-200/90">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Service health */}
          <div className={`rounded-[5.6px] p-4 ${vapiPanelShell}`}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-mute">
              Service status
            </p>
            <ServiceHealthBar isDark={isDark} />
          </div>

          <p className="text-center font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-mute/50">
            Powered by StayNep
          </p>
        </aside>
      </div>

      {/* Mobile voice dock */}
      {inputMode === "voice" && (
        <div className="fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-[#05070d]/90 backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-4">
            {renderVoiceOrb(true)}
            <div className="flex-1 min-w-0">
              <p
                className={`text-[11px] font-bold uppercase tracking-[0.2em] truncate ${isListening ? "" : "text-neutral-300"}`}
                style={isListening ? { color: STAYNEP_ACCENT } : undefined}
              >
                {voiceStatusLabel}
              </p>
              {errorMessage && aiReady !== false ? (
                <p role="alert" className="mt-0.5 text-[10px] text-amber-400 line-clamp-2">{errorMessage}</p>
              ) : (
                <p className="mt-0.5 text-[10px] text-neutral-600">
                  {inConversation ? "Tap to stop" : ui.tapToSpeak}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {languageModal}
    </div>
  );
}
