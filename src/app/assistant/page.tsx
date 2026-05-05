"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Mic, Volume2, Loader2, Phone, PhoneCall, Settings, Globe, ChevronDown, Check, ThumbsUp, ThumbsDown, Sun, Moon } from "lucide-react";
import CallOverlay from "@/components/CallOverlay";
import { StaynepLogo } from "@/components/StaynepLogo";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";

interface BrandingConfig {
  hotelName: string;
  tagline: string;
  accentColor: string;
  welcomeMessage: string;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  ttsLang: string;
}

interface UIStrings {
  tapToSpeak: string;
  listening: string;
  speaking: string;
  ready: string;
  configure: string;
  searchLanguage: string;
  welcomeHint: string;
  speakingIn: string;
  footer: string;
  you: string;
  errorNetwork: string;
  errorMicDenied: string;
  errorNoSpeech: string;
  errorGeneric: string;
  errorUnsupported: string;
  errorConnection: string;
  virtualReceptionist: string;
  poweredByAI: string;
  languagesSupported: string;
}

// 34 languages supported by Gemini
const ALL_LANGUAGES: LanguageOption[] = [
  { code: "en-US",  name: "English (US)",       nativeName: "English",       flag: "🇺🇸", ttsLang: "en-US" },
  { code: "en-GB",  name: "English (UK)",       nativeName: "English (UK)",  flag: "🇬🇧", ttsLang: "en-GB" },
  { code: "ar-SA",  name: "Arabic",             nativeName: "العربية",       flag: "🇸🇦", ttsLang: "ar-SA" },
  { code: "bn-BD",  name: "Bengali",            nativeName: "বাংলা",          flag: "🇧🇩", ttsLang: "bn-BD" },
  { code: "bg-BG",  name: "Bulgarian",          nativeName: "Български",     flag: "🇧🇬", ttsLang: "bg-BG" },
  { code: "zh-CN",  name: "Chinese (Mandarin)", nativeName: "中文",           flag: "🇨🇳", ttsLang: "zh-CN" },
  { code: "hr-HR",  name: "Croatian",           nativeName: "Hrvatski",      flag: "🇭🇷", ttsLang: "hr-HR" },
  { code: "cs-CZ",  name: "Czech",              nativeName: "Čeština",       flag: "🇨🇿", ttsLang: "cs-CZ" },
  { code: "da-DK",  name: "Danish",             nativeName: "Dansk",         flag: "🇩🇰", ttsLang: "da-DK" },
  { code: "nl-NL",  name: "Dutch",              nativeName: "Nederlands",    flag: "🇳🇱", ttsLang: "nl-NL" },
  { code: "et-EE",  name: "Estonian",           nativeName: "Eesti",         flag: "🇪🇪", ttsLang: "et-EE" },
  { code: "fi-FI",  name: "Finnish",            nativeName: "Suomi",         flag: "🇫🇮", ttsLang: "fi-FI" },
  { code: "fr-FR",  name: "French",             nativeName: "Français",      flag: "🇫🇷", ttsLang: "fr-FR" },
  { code: "de-DE",  name: "German",             nativeName: "Deutsch",       flag: "🇩🇪", ttsLang: "de-DE" },
  { code: "el-GR",  name: "Greek",              nativeName: "Ελληνικά",      flag: "🇬🇷", ttsLang: "el-GR" },
  { code: "he-IL",  name: "Hebrew",             nativeName: "עברית",         flag: "🇮🇱", ttsLang: "he-IL" },
  { code: "hi-IN",  name: "Hindi",              nativeName: "हिन्दी",          flag: "🇮🇳", ttsLang: "hi-IN" },
  { code: "hu-HU",  name: "Hungarian",          nativeName: "Magyar",        flag: "🇭🇺", ttsLang: "hu-HU" },
  { code: "id-ID",  name: "Indonesian",         nativeName: "Bahasa Indonesia", flag: "🇮🇩", ttsLang: "id-ID" },
  { code: "it-IT",  name: "Italian",            nativeName: "Italiano",      flag: "🇮🇹", ttsLang: "it-IT" },
  { code: "ja-JP",  name: "Japanese",           nativeName: "日本語",          flag: "🇯🇵", ttsLang: "ja-JP" },
  { code: "ko-KR",  name: "Korean",             nativeName: "한국어",          flag: "🇰🇷", ttsLang: "ko-KR" },
  { code: "lt-LT",  name: "Lithuanian",         nativeName: "Lietuvių",      flag: "🇱🇹", ttsLang: "lt-LT" },
  { code: "ne-NP",  name: "Nepali",             nativeName: "नेपाली",         flag: "🇳🇵", ttsLang: "ne-NP" },
  { code: "no-NO",  name: "Norwegian",          nativeName: "Norsk",         flag: "🇳🇴", ttsLang: "no-NO" },
  { code: "pl-PL",  name: "Polish",             nativeName: "Polski",        flag: "🇵🇱", ttsLang: "pl-PL" },
  { code: "pt-BR",  name: "Portuguese (BR)",    nativeName: "Português",     flag: "🇧🇷", ttsLang: "pt-BR" },
  { code: "ro-RO",  name: "Romanian",           nativeName: "Română",        flag: "🇷🇴", ttsLang: "ro-RO" },
  { code: "ru-RU",  name: "Russian",            nativeName: "Русский",       flag: "🇷🇺", ttsLang: "ru-RU" },
  { code: "es-ES",  name: "Spanish",            nativeName: "Español",       flag: "🇪🇸", ttsLang: "es-ES" },
  { code: "sw-KE",  name: "Swahili",            nativeName: "Kiswahili",     flag: "🇰🇪", ttsLang: "sw-KE" },
  { code: "th-TH",  name: "Thai",               nativeName: "ไทย",           flag: "🇹🇭", ttsLang: "th-TH" },
  { code: "tr-TR",  name: "Turkish",            nativeName: "Türkçe",        flag: "🇹🇷", ttsLang: "tr-TR" },
  { code: "vi-VN",  name: "Vietnamese",         nativeName: "Tiếng Việt",    flag: "🇻🇳", ttsLang: "vi-VN" },
].sort((a, b) => a.name.localeCompare(b.name));

// UI translations
const UI_TRANSLATIONS: Record<string, UIStrings> = {
  en: { tapToSpeak: "Tap to Speak", listening: "Listening...", speaking: "Speaking...", ready: "Ready", configure: "Configure", searchLanguage: "Search language...", welcomeHint: "Tap the microphone and ask me anything.", speakingIn: "Speaking in", footer: "Universal Voice Receptionist", you: "You", errorNetwork: "Network error", errorMicDenied: "Mic access denied", errorNoSpeech: "No speech detected", errorGeneric: "Error", errorUnsupported: "Not supported", errorConnection: "Connection error", virtualReceptionist: "Virtual Receptionist", poweredByAI: "AI Assistant", languagesSupported: "Languages" },
};

function getUI(langCode: string): UIStrings {
  const primary = langCode.split("-")[0];
  return UI_TRANSLATIONS[primary] || UI_TRANSLATIONS["en"];
}

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [inConversation, setInConversation] = useState(false);
  const inConversationRef = useRef(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, "up" | "down">>({});
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(ALL_LANGUAGES.find(l => l.code === "en-US") || ALL_LANGUAGES[0]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [inCall, setInCall] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [branding, setBranding] = useState<BrandingConfig>({
    hotelName: "Willow Hotel",
    tagline: "Premium AI Concierge",
    accentColor: "#c9a227",
    welcomeMessage: "Welcome to Willow Hotel. How may I assist you today?",
  });

  const ui = useMemo(() => getUI(selectedLanguage.code), [selectedLanguage]);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [useServerSTT, setUseServerSTT] = useState(false);
  const autoListenAfterSpeakRef = useRef(false);
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const selectedLanguageRef = useRef(selectedLanguage);
  selectedLanguageRef.current = selectedLanguage;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : (systemPrefersDark ? "dark" : "light");
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data?.branding) setBranding(data.branding);
        if (data?.language) {
          const lang = ALL_LANGUAGES.find(l => l.code === data.language || l.code.startsWith(data.language));
          if (lang) setSelectedLanguage(lang);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Preload voices — some browsers lazy-load them
  useEffect(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synthRef.current = synth;
    // Force voice loading
    synth.getVoices();
    const handleVoicesChanged = () => { cachedVoiceRef.current = null; };
    synth.addEventListener("voiceschanged", handleVoicesChanged);
    return () => synth.removeEventListener("voiceschanged", handleVoicesChanged);
  }, []);

  // Pick the most natural/premium voice for the selected language
  const pickBestVoice = useCallback((langCode: string): SpeechSynthesisVoice | null => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    if (!voices.length) return null;

    const langPrimary = langCode.split("-")[0];
    const candidates = voices.filter(v =>
      v.lang === langCode || v.lang.startsWith(langPrimary)
    );
    if (!candidates.length) return null;

    // Prefer premium/natural voices — these names indicate high-quality engines
    const premiumKeywords = ["premium", "enhanced", "natural", "neural", "wavenet", "google", "samantha", "daniel", "karen", "moira", "tessa", "fiona"];
    const roboticKeywords = ["compact", "espeak", "mbrola"];

    // Score each candidate
    const scored = candidates.map(v => {
      const nameL = v.name.toLowerCase();
      let score = 0;
      // Premium indicators
      if (premiumKeywords.some(k => nameL.includes(k))) score += 10;
      // Robotic indicators (penalize)
      if (roboticKeywords.some(k => nameL.includes(k))) score -= 20;
      // Prefer non-local (cloud) voices
      if (!v.localService) score += 5;
      // Exact lang match bonus
      if (v.lang === langCode) score += 3;
      return { voice: v, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].voice;
  }, []);

  // Start listening (extracted so it can be called from auto-listen)
  const startListeningInternal = useCallback(() => {
    setErrorMessage(null);
    synthRef.current?.cancel();
    setIsSpeaking(false);

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || useServerSTT) {
      startServerRecordingRef.current();
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedLanguageRef.current.code;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
      }
      if (final) {
        recognition.stop();
        handleUserAudioCompleteRef.current(final);
      }
    };
    recognition.onerror = (e: any) => {
      if (e.error === "network") setUseServerSTT(true);
      setIsListening(false);
      autoListenAfterSpeakRef.current = false;
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
  }, [useServerSTT]);

  // Refs for callbacks used in auto-listen
  const startListeningInternalRef = useRef(startListeningInternal);
  startListeningInternalRef.current = startListeningInternal;
  const startServerRecordingRef = useRef(() => {});
  const handleUserAudioCompleteRef = useRef((_text: string) => {});

  const speakText = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const lang = selectedLanguageRef.current.ttsLang;
    utterance.lang = lang;

    // Use cached voice or find the best one
    if (!cachedVoiceRef.current || cachedVoiceRef.current.lang.split("-")[0] !== lang.split("-")[0]) {
      cachedVoiceRef.current = pickBestVoice(lang);
    }
    if (cachedVoiceRef.current) utterance.voice = cachedVoiceRef.current;

    // Natural speech tuning
    utterance.rate = 0.93;  // Slightly slower than default for clarity
    utterance.pitch = 1.0;  // Natural pitch
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Auto-listen after AI finishes — only if conversation is still active
      if (inConversationRef.current) {
        setTimeout(() => {
          if (inConversationRef.current) {
            startListeningInternalRef.current();
          }
        }, 400);
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    synthRef.current.speak(utterance);
  }, [pickBestVoice]);

  const handleUserAudioComplete = useCallback(async (text: string) => {
    setIsListening(false);
    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          language: selectedLanguage.code,
          history: messages.slice(-10),
        }),
      });
      const data = await response.json();
      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : !response.ok
              ? ui.errorConnection
              : ui.errorGeneric;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (data.escalated) {
        setMessages((prev) => [...prev, { role: "assistant", content: "A hotel staff member has been notified and will follow up with you shortly." }]);
      }
      autoListenAfterSpeakRef.current = true;
      speakText(reply);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: ui.errorConnection }]);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedLanguage, speakText, ui.errorConnection, ui.errorGeneric]);

  // Keep refs up to date for use inside callbacks
  handleUserAudioCompleteRef.current = handleUserAudioComplete;

  const startServerRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      const blobType = recorder.mimeType || mimeType || "audio/webm";

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('language', selectedLanguage.code);
        try {
          const res = await fetch('/api/stt', { method: 'POST', body: formData });
          const data = await res.json();
          const transcribed = typeof data.text === "string" ? data.text.trim() : "";
          if (transcribed) handleUserAudioComplete(transcribed);
          else {
            setErrorMessage(
              typeof data.error === "string" && data.error.trim() ? data.error.trim() : ui.errorNoSpeech
            );
            setIsListening(false);
          }
        } catch {
          setErrorMessage(ui.errorNetwork);
          setIsListening(false);
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      // ── Silence detection using Web Audio API ──
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = 15;      // Audio level below this = silence
      const SILENCE_DURATION_MS = 1500;   // Stop after 1.5s of silence
      const SPEECH_MIN_MS = 500;          // Must hear speech for at least 0.5s before silence can trigger stop
      const MAX_RECORD_MS = 15000;        // Safety: max 15 seconds

      let silenceStart: number | null = null;
      let hasHeardSpeech = false;
      const recordStart = Date.now();
      let stopped = false;

      const checkSilence = () => {
        if (stopped) return;
        if (recorder.state !== "recording") return;

        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;

        if (avg > SILENCE_THRESHOLD) {
          // Sound detected
          hasHeardSpeech = true;
          silenceStart = null;
        } else {
          // Silence
          if (silenceStart === null) silenceStart = Date.now();
        }

        const elapsed = Date.now() - recordStart;

        // Auto-stop: silence detected after speech was heard
        if (hasHeardSpeech && silenceStart && (Date.now() - silenceStart > SILENCE_DURATION_MS)) {
          stopped = true;
          recorder.stop();
          audioCtx.close();
          return;
        }

        // Safety timeout
        if (elapsed > MAX_RECORD_MS) {
          stopped = true;
          recorder.stop();
          audioCtx.close();
          return;
        }

        requestAnimationFrame(checkSilence);
      };

      recorder.start(250);
      setIsListening(true);

      // Wait a moment before starting silence detection to let mic warm up
      setTimeout(() => {
        if (!stopped && recorder.state === "recording") {
          checkSilence();
        }
      }, 300);

    } catch {
      setErrorMessage(ui.errorMicDenied);
    }
  };

  // Keep server recording ref in sync
  startServerRecordingRef.current = startServerRecording;

  // ── Master stop: kills everything ──
  const stopEverything = useCallback(() => {
    inConversationRef.current = false;
    setInConversation(false);
    autoListenAfterSpeakRef.current = false;
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    // Stop recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    // Stop speech
    synthRef.current?.cancel();
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
  }, []);

  // ── Simple on/off toggle ──
  const toggleListening = () => {
    if (inConversation || isListening || isSpeaking || isProcessing) {
      // STOP everything
      stopEverything();
    } else {
      // START conversation
      setErrorMessage(null);
      inConversationRef.current = true;
      setInConversation(true);
      autoListenAfterSpeakRef.current = true;
      startListeningInternal();
    }
  };

  const changeLanguage = (lang: LanguageOption) => {
    setSelectedLanguage(lang);
    setShowLanguageMenu(false);
    setLanguageSearch("");
  };

  const filteredLanguages = ALL_LANGUAGES.filter(l =>
    l.nativeName.toLowerCase().includes(languageSearch.toLowerCase()) ||
    l.name.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const isRTL = ["ar", "he"].includes(selectedLanguage.code.split("-")[0]);
  const isDark = theme === "dark";

  return (
    <div
      className={`relative min-h-screen flex flex-col font-sans selection:bg-yellow-600/35 dark:selection:bg-[#e4c449]/35 overflow-hidden transition-colors ${
        isDark ? "text-neutral-100" : "text-neutral-900"
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <SiteShellBackdrop isDark={isDark} />

      {/* Nav — same chrome as marketing + admin */}
      <header className={`sticky top-0 z-20 shrink-0 border-b backdrop-blur-xl ${siteHeaderChrome(isDark)}`}>
        <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 sm:gap-4 cursor-pointer min-w-0" aria-label="Back to StayNEP home">
          <StaynepLogo isDark={isDark} size="sm" />
          <div className={`hidden sm:block h-10 w-px shrink-0 ${isDark ? "bg-white/10" : "bg-neutral-200"}`} aria-hidden />
          <div
            className="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500"
            style={{
              background: `linear-gradient(135deg, ${branding.accentColor}, #fb923c)`,
              boxShadow: `0 10px 30px -10px ${branding.accentColor}80`,
            }}
          >
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className={`text-sm font-bold tracking-tight leading-tight ${isDark ? "text-white" : "text-neutral-900"}`}>{branding.hotelName}</h1>
            <div className="hidden sm:flex items-center gap-2 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${useServerSTT ? "bg-cyan-400" : "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"}`} />
              <span className={`text-[9px] font-black tracking-widest uppercase ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
                {useServerSTT ? "AI Mode" : "Native Mode"}
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            className={`h-10 w-10 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
              isDark
                ? "glass text-neutral-400 hover:text-white"
                : "bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900"
            }`}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className={`px-4 py-2.5 rounded-2xl text-[13px] font-medium transition-all flex items-center gap-3 active:scale-95 ${
                isDark
                  ? "glass text-neutral-300 hover:text-white"
                  : "bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-900"
              }`}
            >
              <span className="text-lg">{selectedLanguage.flag}</span>
              <span className="hidden sm:inline tracking-tight">{selectedLanguage.nativeName}</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-40 transition-transform duration-500 ${showLanguageMenu ? "rotate-180" : ""}`} />
            </button>

            {showLanguageMenu && (
              <div
                className={`absolute right-0 mt-3 w-80 max-h-96 rounded-3xl shadow-2xl overflow-hidden z-30 animate-in slide-in-from-top-2 ${
                  isDark ? "glass-morphic" : "bg-white border border-neutral-200"
                }`}
                dir="ltr"
              >
                <div className={`p-4 border-b ${isDark ? "border-white/[0.05]" : "border-neutral-200"}`}>
                  <input
                    type="text"
                    placeholder="Search language..."
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl text-sm outline-none font-medium ${
                      isDark
                        ? "bg-white/5 border border-white/10 text-white"
                        : "bg-neutral-50 border border-neutral-200 text-neutral-900"
                    }`}
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto scrollbar-premium py-2">
                  {filteredLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang)}
                      className={`w-full px-5 py-3.5 flex items-center gap-4 text-sm transition-all group ${
                        selectedLanguage.code === lang.code
                          ? (isDark ? "bg-white/10 text-white" : "bg-neutral-100 text-neutral-900")
                          : (isDark ? "text-neutral-400 hover:bg-white/[0.03]" : "text-neutral-600 hover:bg-neutral-50")
                      }`}
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">{lang.flag}</span>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-bold truncate">{lang.nativeName}</div>
                        <div className="text-[10px] uppercase font-bold tracking-widest opacity-40 mt-0.5">{lang.name}</div>
                      </div>
                      {selectedLanguage.code === lang.code && <Check className="w-4 h-4 text-[#c9a227] dark:text-[#e4c449]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/settings"
            className={`h-10 w-10 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
              isDark
                ? "glass text-neutral-400 hover:text-white"
                : "bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 max-w-5xl w-full mx-auto relative overflow-y-auto scrollbar-hide">
        <div className="w-full flex flex-col items-center gap-16">
          {mounted ? (
          <div className="relative group cursor-pointer" onClick={toggleListening}>
            <div className="glass-outer-ring absolute -inset-4 rounded-full" />

            {isListening && (
              <div className="absolute -inset-20">
                <div className="ripple-ring scale-150" style={{ animationDelay: '0s', borderColor: branding.accentColor, opacity: 0.4 }} />
                <div className="ripple-ring scale-150" style={{ animationDelay: '0.8s', borderColor: branding.accentColor, opacity: 0.2 }} />
              </div>
            )}

            <div className={`glass-circle relative z-10 w-56 h-56 sm:w-64 sm:h-64 rounded-full flex flex-col items-center justify-center overflow-hidden border hover:scale-105 active:scale-95 transition-all duration-700 ease-out animate-morph ${isListening ? "scale-110 glass-circle-listening" : (isDark ? "border-white/[0.08] group-hover:border-white/20" : "border-neutral-200 group-hover:border-neutral-300")} ${isProcessing ? "animate-pulse" : ""} ${isSpeaking ? "scale-105 glass-circle-speaking" : ""}`}>
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className={`w-16 h-16 animate-spin ${isDark ? "text-white/80" : "text-neutral-700"}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest animate-pulse ${isDark ? "text-white/30" : "text-neutral-500"}`}>Processing</span>
                </div>
              ) : isListening ? (
                <Mic className={`w-20 h-20 animate-pulse ${isDark ? "text-white/90" : "text-neutral-800"}`} />
              ) : isSpeaking ? (
                <Volume2 className={`w-20 h-20 animate-pulse-soft ${isDark ? "text-white/90" : "text-neutral-800"}`} />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center border transition-colors duration-300 ${
                    isDark
                      ? "bg-white/[0.04] border-white/[0.08] group-hover:bg-white/[0.08] group-hover:border-white/15"
                      : "bg-white/80 border-neutral-200 group-hover:bg-white group-hover:border-neutral-300"
                  }`}>
                    <Mic className={`w-10 h-10 transition-colors duration-300 ${isDark ? "text-neutral-400 group-hover:text-white/90" : "text-neutral-500 group-hover:text-neutral-900"}`} />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-[11px] font-black uppercase tracking-[0.4em] transition-colors duration-300 ${isDark ? "text-neutral-500 group-hover:text-neutral-300" : "text-neutral-600 group-hover:text-neutral-800"}`}>
                      {ui.tapToSpeak.split(' ')[0]}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 ${isDark ? "text-neutral-600 group-hover:text-neutral-400" : "text-neutral-500 group-hover:text-neutral-700"}`}>
                      {ui.tapToSpeak.split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                </div>
              )}

              <div className={`absolute inset-0 rounded-full pointer-events-none ${isDark ? "bg-gradient-to-b from-white/[0.06] to-transparent" : "bg-gradient-to-b from-white/70 via-white/20 to-transparent"}`} />
            </div>

            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="flex flex-col items-center gap-2">
                <span className={`text-[12px] font-black uppercase tracking-[0.5em] transition-all duration-700 ${isListening ? 'text-[#e4c449]' : isSpeaking ? 'text-[#7eb8e8]' : inConversation ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  {isListening ? ui.listening : isSpeaking ? ui.speaking : isProcessing ? 'Processing' : inConversation ? 'Tap to End' : ui.ready}
                </span>
                {!isListening && !isSpeaking && !isProcessing && (
                  <div className={`w-12 h-0.5 rounded-full overflow-hidden ${isDark ? "bg-white/5" : "bg-neutral-300/70"}`}>
                    <div className="w-full h-full bg-[#c9a227]/25 animate-shimmer" />
                  </div>
                )}
              </div>
            </div>

            {errorMessage && (
              <div role="alert" className="absolute -bottom-36 left-1/2 -translate-x-1/2 max-w-sm px-4 py-2 rounded-2xl text-center text-xs font-medium text-amber-200/90 bg-amber-950/40 border border-amber-500/20">
                {errorMessage}
              </div>
            )}
          </div>
          ) : (
          <div className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full glass-circle flex flex-col items-center justify-center border ${isDark ? "border-white/[0.08]" : "border-neutral-200"}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center border ${isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-white/80 border-neutral-200"}`}>
              <Mic className={`w-10 h-10 ${isDark ? "text-neutral-400" : "text-neutral-500"}`} />
            </div>
          </div>
          )}

          <div className="flex flex-col items-center gap-6 mt-8">
            <button
              onClick={() => setInCall(true)}
              className={`group flex items-center gap-4 px-8 py-4 rounded-full transition-all active:scale-95 ${
                isDark
                  ? "glass hover:bg-white/[0.05] border-emerald-500/20 hover:border-emerald-500/40"
                  : "bg-white border border-emerald-200 hover:border-emerald-300 shadow-[0_8px_28px_rgba(16,185,129,0.08)]"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20">
                <PhoneCall className="w-5 h-5 group-hover:animate-ring" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className={`text-[13px] font-bold tracking-tight ${isDark ? "text-white" : "text-neutral-900"}`}>Concierge Call</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Telephony Mode</span>
              </div>
            </button>
            
            <p className={`text-[11px] font-bold text-center max-w-xs leading-loose tracking-widest uppercase opacity-70 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
              {branding.tagline}
            </p>
          </div>
        </div>

        <div className="w-full max-w-2xl mt-16 space-y-8 z-10">
          {messages.length === 0 ? (
            <div className={`glass-panel text-center animate-in rounded-[48px] border p-12 sm:p-14 ${
              isDark
                ? "border-white/10"
                : "border-neutral-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
            }`}>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient mb-4">
                {branding.welcomeMessage}
              </h2>
              <p className={`text-sm font-medium leading-relaxed max-w-sm mx-auto opacity-80 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
                {ui.welcomeHint}
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 pb-20">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className={`
                    px-4 sm:px-6 py-3 sm:py-4 rounded-3xl max-w-[95%] sm:max-w-[80%] text-[14px] sm:text-[15px] font-medium leading-relaxed
                    ${msg.role === "user" 
                      ? (isDark
                          ? "bg-white/5 text-neutral-200 rounded-tr-none border border-white/10"
                          : "bg-white text-neutral-800 rounded-tr-none border border-neutral-200 shadow-[0_10px_30px_rgba(15,23,42,0.08)]")
                      : (isDark
                          ? "glass text-white rounded-tl-none border-[#c9a227]/35 shadow-xl shadow-black/35"
                          : "bg-gradient-to-br from-amber-50 to-sky-50 text-neutral-800 rounded-tl-none border border-[#163a5f]/25 shadow-[0_12px_34px_rgba(22,58,95,0.12)]")}
                  `}>
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>
                      {msg.role === "user" ? ui.you : branding.hotelName}
                    </span>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1 ml-1">
                        {feedbackGiven[i] ? (
                          <span className={`text-[10px] font-bold ${feedbackGiven[i] === "up" ? "text-emerald-500" : "text-amber-600 dark:text-[#e4c449]"}`}>
                            {feedbackGiven[i] === "up" ? "👍 Thanks!" : "👎 Noted"}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setFeedbackGiven(prev => ({ ...prev, [i]: "up" }));
                                fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageContent: msg.content, rating: "up" }) });
                              }}
                              className={`p-1 rounded-lg transition-all ${isDark ? "text-neutral-600 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-neutral-500 hover:text-emerald-600 hover:bg-emerald-500/10"}`}
                              title="Helpful"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                setFeedbackGiven(prev => ({ ...prev, [i]: "down" }));
                                fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageContent: msg.content, rating: "down" }) });
                              }}
                              className={`p-1 rounded-lg transition-all ${isDark ? "text-neutral-600 hover:text-[#e4c449] hover:bg-[#163a5f]/30" : "text-neutral-500 hover:text-amber-700 hover:bg-yellow-600/15"}`}
                              title="Not helpful"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <footer
        className={`text-center py-6 text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-md ${
          isDark
            ? "text-neutral-600 border-t border-white/[0.02] bg-black/20"
            : "text-neutral-500 border-t border-neutral-200 bg-white/70"
        }`}
      >
        {branding.hotelName} concierge • {selectedLanguage.flag} {selectedLanguage.nativeName}
      </footer>

      {inCall && (
        <CallOverlay
          hotelName={branding.hotelName}
          accentColor={branding.accentColor}
          languageCode={selectedLanguage.code}
          ttsLang={selectedLanguage.ttsLang}
          onEnd={() => setInCall(false)}
        />
      )}
    </div>
  );
}
