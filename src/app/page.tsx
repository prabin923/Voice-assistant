"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Mic, Volume2, Loader2, Phone, Settings, Globe, ChevronDown } from "lucide-react";

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

// All supported languages — mirror of languages.ts for the client
const ALL_LANGUAGES: LanguageOption[] = [
  { code: "en-US",  name: "English (US)",       nativeName: "English",       flag: "🇺🇸", ttsLang: "en-US" },
  { code: "en-GB",  name: "English (UK)",       nativeName: "English",       flag: "🇬🇧", ttsLang: "en-GB" },
  { code: "es-ES",  name: "Spanish",            nativeName: "Español",       flag: "🇪🇸", ttsLang: "es-ES" },
  { code: "fr-FR",  name: "French",             nativeName: "Français",      flag: "🇫🇷", ttsLang: "fr-FR" },
  { code: "de-DE",  name: "German",             nativeName: "Deutsch",       flag: "🇩🇪", ttsLang: "de-DE" },
  { code: "it-IT",  name: "Italian",            nativeName: "Italiano",      flag: "🇮🇹", ttsLang: "it-IT" },
  { code: "pt-BR",  name: "Portuguese (BR)",    nativeName: "Português",     flag: "🇧🇷", ttsLang: "pt-BR" },
  { code: "ja-JP",  name: "Japanese",           nativeName: "日本語",          flag: "🇯🇵", ttsLang: "ja-JP" },
  { code: "ko-KR",  name: "Korean",             nativeName: "한국어",          flag: "🇰🇷", ttsLang: "ko-KR" },
  { code: "zh-CN",  name: "Chinese (Mandarin)", nativeName: "中文",           flag: "🇨🇳", ttsLang: "zh-CN" },
  { code: "zh-TW",  name: "Chinese (Taiwan)",   nativeName: "繁體中文",        flag: "🇹🇼", ttsLang: "zh-TW" },
  { code: "ar-SA",  name: "Arabic",             nativeName: "العربية",       flag: "🇸🇦", ttsLang: "ar-SA" },
  { code: "hi-IN",  name: "Hindi",              nativeName: "हिन्दी",          flag: "🇮🇳", ttsLang: "hi-IN" },
  { code: "ne-NP",  name: "Nepali",             nativeName: "नेपाली",         flag: "🇳🇵", ttsLang: "ne-NP" },
  { code: "ru-RU",  name: "Russian",            nativeName: "Русский",       flag: "🇷🇺", ttsLang: "ru-RU" },
  { code: "tr-TR",  name: "Turkish",            nativeName: "Türkçe",        flag: "🇹🇷", ttsLang: "tr-TR" },
  { code: "th-TH",  name: "Thai",               nativeName: "ไทย",            flag: "🇹🇭", ttsLang: "th-TH" },
  { code: "vi-VN",  name: "Vietnamese",         nativeName: "Tiếng Việt",    flag: "🇻🇳", ttsLang: "vi-VN" },
  { code: "id-ID",  name: "Indonesian",         nativeName: "Bahasa Indonesia", flag: "🇮🇩", ttsLang: "id-ID" },
  { code: "ms-MY",  name: "Malay",              nativeName: "Bahasa Melayu", flag: "🇲🇾", ttsLang: "ms-MY" },
  { code: "nl-NL",  name: "Dutch",              nativeName: "Nederlands",    flag: "🇳🇱", ttsLang: "nl-NL" },
  { code: "pl-PL",  name: "Polish",             nativeName: "Polski",        flag: "🇵🇱", ttsLang: "pl-PL" },
  { code: "sv-SE",  name: "Swedish",            nativeName: "Svenska",       flag: "🇸🇪", ttsLang: "sv-SE" },
  { code: "da-DK",  name: "Danish",             nativeName: "Dansk",         flag: "🇩🇰", ttsLang: "da-DK" },
  { code: "fi-FI",  name: "Finnish",            nativeName: "Suomi",         flag: "🇫🇮", ttsLang: "fi-FI" },
  { code: "el-GR",  name: "Greek",              nativeName: "Ελληνικά",      flag: "🇬🇷", ttsLang: "el-GR" },
  { code: "he-IL",  name: "Hebrew",             nativeName: "עברית",         flag: "🇮🇱", ttsLang: "he-IL" },
  { code: "uk-UA",  name: "Ukrainian",          nativeName: "Українська",    flag: "🇺🇦", ttsLang: "uk-UA" },
  { code: "cs-CZ",  name: "Czech",              nativeName: "Čeština",       flag: "🇨🇿", ttsLang: "cs-CZ" },
  { code: "ro-RO",  name: "Romanian",           nativeName: "Română",        flag: "🇷🇴", ttsLang: "ro-RO" },
  { code: "bn-BD",  name: "Bengali",            nativeName: "বাংলা",          flag: "🇧🇩", ttsLang: "bn-BD" },
  { code: "ta-IN",  name: "Tamil",              nativeName: "தமிழ்",          flag: "🇮🇳", ttsLang: "ta-IN" },
  { code: "te-IN",  name: "Telugu",             nativeName: "తెలుగు",         flag: "🇮🇳", ttsLang: "te-IN" },
  { code: "fil-PH", name: "Filipino",           nativeName: "Filipino",      flag: "🇵🇭", ttsLang: "fil-PH" },
];

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(ALL_LANGUAGES[0]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [branding, setBranding] = useState<BrandingConfig>({
    hotelName: "Voice Receptionist",
    tagline: "AI-Powered Hotel Assistant",
    accentColor: "#f43f5e",
    welcomeMessage: "Welcome! How may I assist you today?",
  });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Load branding & language from config API
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

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close language menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLanguageMenu(false);
        setLanguageSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = selectedLanguage.code;

        recognitionRef.current.onresult = (event: any) => {
          const currentTranscript = event.results[0][0].transcript;
          setTranscript(currentTranscript);
          setErrorMessage(null);
          handleUserAudioComplete(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          const errorType = event.error as string;
          setIsListening(false);
          setIsProcessing(false);

          switch (errorType) {
            case "network":
              setErrorMessage(
                "Network error: Speech recognition requires an internet connection."
              );
              break;
            case "not-allowed":
            case "service-not-allowed":
              setErrorMessage(
                "Microphone access denied. Please allow microphone permissions."
              );
              break;
            case "no-speech":
              setErrorMessage(
                "No speech detected. Please tap the microphone and speak clearly."
              );
              break;
            case "aborted":
              break;
            default:
              setErrorMessage(`Speech recognition error: ${errorType}.`);
          }
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
  }, [selectedLanguage]);

  // Ensure voices are loaded
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const handleUserAudioComplete = useCallback(async (text: string) => {
    setIsListening(false);
    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language: selectedLanguage.code }),
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
  }, [selectedLanguage]);

  const speakText = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage.ttsLang;

    const voices = synthRef.current.getVoices();
    // Try to find a voice that matches the selected language
    const matchingVoice = voices.find(v => v.lang === selectedLanguage.ttsLang) ||
      voices.find(v => v.lang.startsWith(selectedLanguage.ttsLang.split("-")[0])) ||
      voices.find(v => v.name.includes("Female") || v.name.includes("Google")) ||
      null;

    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, [selectedLanguage]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      synthRef.current?.cancel();
      setIsSpeaking(false);

      // Update recognition language before starting
      if (recognitionRef.current) {
        recognitionRef.current.lang = selectedLanguage.code;
      }

      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setTranscript("");
      } catch (e) {
        console.warn("[Voice Assistant] Error starting recognition", e);
      }
    }
  };

  const changeLanguage = (lang: LanguageOption) => {
    setSelectedLanguage(lang);
    setShowLanguageMenu(false);
    setLanguageSearch("");

    // Re-initialize recognition with new language
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang.code;
    }
  };

  const filteredLanguages = ALL_LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(languageSearch.toLowerCase()) ||
    l.code.toLowerCase().includes(languageSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-rose-500/30">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-neutral-950 -z-10" />

      {/* Header */}
      <header className="px-6 sm:px-8 py-5 flex justify-between items-center border-b border-white/5 bg-neutral-950/50 backdrop-blur-xl sticky top-0 z-20">
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
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-300 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-all bg-neutral-900/50"
            >
              <Globe className="w-4 h-4" />
              <span className="text-base">{selectedLanguage.flag}</span>
              <span className="hidden sm:inline">{selectedLanguage.nativeName}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showLanguageMenu ? "rotate-180" : ""}`} />
            </button>

            {showLanguageMenu && (
              <div className="absolute right-0 mt-2 w-72 max-h-80 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden z-30 animate-in">
                {/* Search */}
                <div className="p-3 border-b border-neutral-800">
                  <input
                    type="text"
                    placeholder="Search language..."
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
                    autoFocus
                  />
                </div>
                {/* Language List */}
                <div className="max-h-60 overflow-y-auto scrollbar-thin">
                  {filteredLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang)}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm text-left hover:bg-neutral-800 transition-colors ${
                        selectedLanguage.code === lang.code
                          ? "bg-neutral-800/80 text-white"
                          : "text-neutral-300"
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{lang.nativeName}</div>
                        <div className="text-xs text-neutral-500">{lang.name}</div>
                      </div>
                      {selectedLanguage.code === lang.code && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: branding.accentColor }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status */}
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
                style={{ borderColor: `${branding.accentColor}20`, animationDuration: "2.5s" }}
              />
            </>
          )}
          {isListening && (
            <>
              <div
                className="absolute inset-0 rounded-full border-2 animate-ping"
                style={{ borderColor: `${branding.accentColor}40`, animationDuration: "1.5s" }}
              />
              <div
                className="absolute inset-2 rounded-full border animate-ping"
                style={{ borderColor: `${branding.accentColor}30`, animationDuration: "1.8s" }}
              />
            </>
          )}
          <button
            onClick={toggleListening}
            disabled={isProcessing || !isSupported}
            className={`
              relative z-10 flex flex-col items-center justify-center cursor-pointer
              w-36 h-36 sm:w-40 sm:h-40 rounded-full transition-all duration-500 ease-out
              ${isListening
                  ? "scale-110 shadow-2xl"
                  : isSpeaking
                  ? "scale-105 shadow-xl"
                  : ""
              }
              ${!isListening && !isSpeaking
                  ? "bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 hover:scale-105"
                  : ""
              }
              ${isProcessing ? "opacity-70 cursor-wait" : ""}
              ${!isSupported ? "opacity-50 cursor-not-allowed" : ""}
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
              <p className="text-lg mb-1">{branding.welcomeMessage}</p>
              <p className="text-sm">Tap the microphone and ask me anything.</p>
              <p className="text-xs mt-2 text-neutral-600">
                {selectedLanguage.flag} Speaking in {selectedLanguage.nativeName}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 animate-in ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={
                    msg.role === "assistant"
                      ? { backgroundColor: `${branding.accentColor}15`, borderWidth: 1, borderColor: `${branding.accentColor}30` }
                      : { backgroundColor: "rgba(115,115,115,0.2)" }
                  }
                >
                  {msg.role === "assistant" ? (
                    <Phone className="w-3.5 h-3.5" style={{ color: branding.accentColor }} />
                  ) : (
                    <span className="text-xs">You</span>
                  )}
                </div>
                <div
                  className={`px-5 py-4 rounded-2xl max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-neutral-800/60 border border-neutral-700/50"
                      : "rounded-tl-sm"
                  }`}
                  style={
                    msg.role === "assistant"
                      ? { backgroundColor: `${branding.accentColor}10`, borderWidth: 1, borderColor: `${branding.accentColor}20` }
                      : {}
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isProcessing && (
            <div className="flex items-start gap-3 animate-in">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                style={{ backgroundColor: `${branding.accentColor}15`, borderWidth: 1, borderColor: `${branding.accentColor}30` }}
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
        Universal Voice Receptionist • Powered by AI • {ALL_LANGUAGES.length} Languages Supported
      </footer>
    </div>
  );
}
