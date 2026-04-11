"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Mic, Volume2, Loader2, Phone, PhoneCall, Settings, Globe, ChevronDown, Check } from "lucide-react";
import CallOverlay from "@/components/CallOverlay";

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

// All supported languages
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
].sort((a, b) => a.nativeName.localeCompare(b.nativeName));

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
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(ALL_LANGUAGES.find(l => l.code === "en-US") || ALL_LANGUAGES[0]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [inCall, setInCall] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig>({
    hotelName: "Willow Hotel",
    tagline: "Premium AI Concierge",
    accentColor: "#f43f5e",
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

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speakText = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage.ttsLang;

    const voices = synthRef.current.getVoices();
    const matchingVoice = voices.find(v => v.lang === selectedLanguage.ttsLang) ||
      voices.find(v => v.lang.startsWith(selectedLanguage.ttsLang.split("-")[0])) ||
      null;

    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [selectedLanguage]);

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
      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : !response.ok
              ? ui.errorConnection
              : ui.errorGeneric;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      speakText(reply);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: ui.errorConnection }]);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedLanguage, speakText, ui.errorConnection, ui.errorGeneric]);

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
      recorder.start(250);
      setIsListening(true);
    } catch {
      setErrorMessage(ui.errorMicDenied);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
      setIsListening(false);
    } else {
      setErrorMessage(null);
      synthRef.current?.cancel();
      setIsSpeaking(false);
      
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR || useServerSTT) {
        startServerRecording();
        return;
      }

      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage.code;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
        }
        if (final) {
          recognition.stop();
          handleUserAudioComplete(final);
        }
      };
      recognition.onerror = (e: any) => {
        if (e.error === "network") setUseServerSTT(true);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
      recognitionRef.current = recognition;
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-rose-500/30 overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Premium Background */}
      <div className="fixed inset-0 -z-10 bg-[#050505]">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 animate-float"
          style={{ backgroundColor: branding.accentColor }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] opacity-10 animate-float"
          style={{ backgroundColor: branding.accentColor, animationDelay: '2s' }}
        />
      </div>

      {/* Glass Header */}
      <header className="px-6 py-6 flex justify-between items-center sticky top-0 z-20 glass-morphic border-b border-white/[0.03]">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
          <div
            className="h-11 w-11 rounded-2xl flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500"
            style={{
              background: `linear-gradient(135deg, ${branding.accentColor}, #fb923c)`,
              boxShadow: `0 10px 30px -10px ${branding.accentColor}80`,
            }}
          >
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">{branding.hotelName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${useServerSTT ? "bg-cyan-400" : "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"}`} />
              <span className="text-[9px] font-black tracking-widest text-neutral-500 uppercase">
                {useServerSTT ? "AI Mode" : "Native Mode"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="glass px-4 py-2.5 rounded-2xl text-[13px] font-medium text-neutral-300 hover:text-white transition-all flex items-center gap-3 active:scale-95"
            >
              <span className="text-lg">{selectedLanguage.flag}</span>
              <span className="hidden sm:inline tracking-tight">{selectedLanguage.nativeName}</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-40 transition-transform duration-500 ${showLanguageMenu ? "rotate-180" : ""}`} />
            </button>

            {showLanguageMenu && (
              <div className="absolute right-0 mt-3 w-80 max-h-96 glass-morphic rounded-3xl shadow-2xl overflow-hidden z-30 animate-in slide-in-from-top-2" dir="ltr">
                <div className="p-4 border-b border-white/[0.05]">
                  <input
                    type="text"
                    placeholder="Search language..."
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm outline-none font-medium"
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto scrollbar-premium py-2">
                  {filteredLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang)}
                      className={`w-full px-5 py-3.5 flex items-center gap-4 text-sm transition-all group ${
                        selectedLanguage.code === lang.code ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">{lang.flag}</span>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-bold truncate">{lang.nativeName}</div>
                        <div className="text-[10px] uppercase font-bold tracking-widest opacity-40 mt-0.5">{lang.name}</div>
                      </div>
                      {selectedLanguage.code === lang.code && <Check className="w-4 h-4 text-rose-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/settings"
            className="h-10 w-10 glass flex items-center justify-center rounded-2xl text-neutral-400 hover:text-white transition-all active:scale-90"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-5xl w-full mx-auto relative overflow-y-auto scrollbar-hide">
        <div className="w-full flex flex-col items-center gap-16">
          <div className="relative group cursor-pointer" onClick={toggleListening}>
            {/* Outer glass ring */}
            <div className={`absolute -inset-4 rounded-full transition-all duration-700 ${isListening ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'}`}
              style={{
                background: isListening
                  ? `conic-gradient(from 0deg, ${branding.accentColor}40, #f43f5e40, #fb923c40, ${branding.accentColor}40)`
                  : 'conic-gradient(from 0deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02), rgba(255,255,255,0.06))',
                filter: 'blur(1px)',
              }}
            />

            {isListening && (
              <div className="absolute -inset-20">
                <div className="ripple-ring scale-150" style={{ animationDelay: '0s', borderColor: branding.accentColor, opacity: 0.4 }} />
                <div className="ripple-ring scale-150" style={{ animationDelay: '0.8s', borderColor: branding.accentColor, opacity: 0.2 }} />
              </div>
            )}

            <div className={`
              glass-circle relative z-10 w-56 h-56 sm:w-64 sm:h-64 rounded-full
              flex flex-col items-center justify-center overflow-hidden
              hover:scale-105 active:scale-95 transition-all duration-700 ease-out
              ${isListening ? 'scale-110 border-white/30' : 'border-white/[0.08] group-hover:border-white/20'}
              ${isProcessing ? 'animate-pulse' : ''}
              ${isSpeaking ? 'scale-105 border-white/20' : ''}
            `}
            style={{
              background: isListening
                ? `radial-gradient(circle at 30% 30%, ${branding.accentColor}30, rgba(244,63,94,0.15), rgba(0,0,0,0.2))`
                : isSpeaking
                ? `radial-gradient(circle at 30% 30%, ${branding.accentColor}20, rgba(251,146,60,0.1), rgba(0,0,0,0.2))`
                : undefined,
              borderWidth: 1,
              boxShadow: isListening
                ? `0 0 80px -10px ${branding.accentColor}40, inset 0 1px 0 0 rgba(255,255,255,0.1)`
                : isSpeaking
                ? `0 0 60px -10px ${branding.accentColor}30, inset 0 1px 0 0 rgba(255,255,255,0.1)`
                : undefined,
            }}>
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-16 h-16 text-white/80 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30 animate-pulse">Processing</span>
                </div>
              ) : isListening ? (
                <Mic className="w-20 h-20 text-white/90 animate-pulse" />
              ) : isSpeaking ? (
                <Volume2 className="w-20 h-20 text-white/90 animate-pulse-soft" />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="glass-inner-circle w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center border border-white/[0.08] group-hover:bg-white/[0.08] group-hover:border-white/15 transition-all duration-500">
                    <Mic className="w-10 h-10 text-neutral-400 group-hover:text-white/90 transition-colors duration-500" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] text-neutral-500 group-hover:text-neutral-300 transition-colors duration-500">
                      {ui.tapToSpeak.split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-600 group-hover:text-neutral-400 transition-colors duration-500">
                      {ui.tapToSpeak.split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                </div>
              )}

              {/* Glass highlight - top edge light refraction */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.08] via-transparent to-transparent pointer-events-none" />
              {/* Glass highlight - side light */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />
            </div>
            
            {/* Status Label */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="flex flex-col items-center gap-2">
                <span className={`text-[12px] font-black uppercase tracking-[0.5em] transition-all duration-700 ${isListening ? 'text-rose-400' : 'text-neutral-600'}`}>
                  {isListening ? ui.listening : isSpeaking ? ui.speaking : ui.ready}
                </span>
                {!isListening && !isSpeaking && !isProcessing && (
                  <div className="w-12 h-0.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="w-full h-full bg-rose-500/20 animate-shimmer" />
                  </div>
                )}
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="absolute -bottom-36 left-1/2 -translate-x-1/2 max-w-sm px-4 py-2 rounded-2xl text-center text-xs font-medium text-amber-200/90 bg-amber-950/40 border border-amber-500/20"
              >
                {errorMessage}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-6 mt-8">
            <button
              onClick={() => setInCall(true)}
              className="group flex items-center gap-4 px-8 py-4 rounded-full glass hover:bg-white/[0.05] transition-all active:scale-95 border-emerald-500/20 hover:border-emerald-500/40"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20">
                <PhoneCall className="w-5 h-5 group-hover:animate-ring" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-[13px] font-bold text-white tracking-tight">Concierge Call</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Telephony Mode</span>
              </div>
            </button>
            
            <p className="text-[11px] font-bold text-neutral-500 text-center max-w-xs leading-loose tracking-widest uppercase opacity-60">
              {branding.tagline}
            </p>
          </div>
        </div>

        <div className="w-full max-w-2xl mt-16 space-y-8 z-10">
          {messages.length === 0 ? (
            <div className="text-center animate-in backdrop-blur-sm p-12 rounded-[50px] border border-white/[0.02]">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient mb-4">
                {branding.welcomeMessage}
              </h2>
              <p className="text-neutral-500 text-sm font-medium leading-relaxed max-w-sm mx-auto opacity-70">
                {ui.welcomeHint}
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-20">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-2 animate-in slide-in-from-bottom-2 ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className={`
                    px-6 py-4 rounded-3xl max-w-[90%] sm:max-w-[80%] text-[15px] font-medium leading-relaxed
                    ${msg.role === "user" 
                      ? "bg-white/5 text-neutral-200 rounded-tr-none border border-white/10" 
                      : "glass text-white rounded-tl-none border-rose-500/20 shadow-xl shadow-rose-950/20"}
                  `}>
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                      {msg.role === "user" ? ui.you : branding.hotelName}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-[10px] font-bold tracking-[0.2em] text-neutral-600 border-t border-white/[0.02] uppercase bg-black/20 backdrop-blur-md">
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
