"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Mic, Volume2, Loader2, PhoneCall, ChevronDown, ChevronLeft, ChevronRight, Check, ThumbsUp, ThumbsDown, History, ChevronUp, Send, MessageSquare, Globe2, X } from "lucide-react";
import CallOverlay, { type CallHistoryRecord } from "@/components/CallOverlay";
import {
  BookingSummaryCard,
  type BookingSummary,
  type PendingBooking,
} from "@/components/BookingSummaryCard";
import {
  DiningSummaryCard,
  type DiningSummary,
  type PendingDining,
} from "@/components/DiningSummaryCard";
import {
  SpaSummaryCard,
  type SpaSummary,
} from "@/components/SpaSummaryCard";
import type { PendingSpa } from "@/lib/spaFlow";
import type { PendingServiceRequest } from "@/lib/guestServiceFlow";
import { MyStayPanel } from "@/components/MyStayPanel";
import { QuickActionsBar } from "@/components/QuickActionsBar";
import { ServiceHealthBar } from "@/components/ServiceHealthBar";
import { GuestAuthPanel, loadGuestProfile } from "@/components/GuestAuthPanel";
import type { GuestProfile } from "@/lib/clientGuestAuth";
import { guestAuthHeaders } from "@/lib/clientGuestAuth";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { vapiPanelShell } from "@/lib/vapiUi";
import { useHotelPublicConfig } from "@/hooks/useHotelPublicConfig";
import { tenantApiUrl, useTenantSlug } from "@/hooks/useTenantSlug";
import { usePathname } from "next/navigation";
import { GUEST_STAFF_HANDOFF_MESSAGE } from "@/lib/escalationMessages";
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
import { measureMicRms, isSpeechLevel } from "@/lib/voiceActivity";
import {
  createNemotronVoiceSpeaker,
  ensureAudioUnlocked,
  type NemotronVoiceSpeaker,
  unlockBrowserAudio,
} from "@/lib/clientNemotronVoice";
import { sanitizeForSpeech, trimForVoiceReply, VOICE_STATUS } from "@/lib/humanizeSpeech";
import { getUIStrings, type UIStrings } from "@/lib/languages";
import { isJunkTranscription, sanitizeTranscription } from "@/lib/sttValidation";
import { VoicePresenceBar } from "@/components/VoicePresenceBar";
import { ConciergeAvatar } from "@/components/ConciergeAvatar";

type VoiceStyle = "warm" | "professional" | "energetic";
type InputMode = "voice" | "text";
type VoiceProvider = "browser" | "server";

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  ttsLang: string;
}


function RoomImageCarousel({ images, isDark }: { images: string[]; isDark: boolean }) {
  // Parent always passes a stable key={images.join("|")} so this component
  // remounts when the image set changes — no effect needed to reset index.
  const [index, setIndex] = useState(0);

  if (!images.length) return null;

  const hasMultiple = images.length > 1;
  const current = images[index];

  return (
    <div className={`mt-3 mb-1 ${isDark ? "bg-black/10" : "bg-white"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt="Room image"
        loading="lazy"
        decoding="async"
        className="w-full max-w-[240px] rounded-xl border border-white/10 bg-black/10"
      />

      {hasMultiple && (
        <div className="flex items-center justify-between gap-3 mt-2">
          <button
            type="button"
            onClick={() => setIndex((v) => Math.max(0, v - 1))}
            disabled={index === 0}
            className={`p-1 rounded-lg ${
              isDark
                ? "text-neutral-300 hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent"
                : "text-neutral-600 hover:bg-neutral-200/70 disabled:opacity-40 disabled:hover:bg-transparent"
            }`}
            aria-label="Previous room image"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Room image ${i + 1}`}
                className={`h-1.5 w-6 rounded-full ${
                  i === index
                    ? isDark
                      ? "bg-amber-300"
                      : "bg-[#163a5f]"
                    : isDark
                      ? "bg-white/15"
                      : "bg-neutral-300"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIndex((v) => Math.min(images.length - 1, v + 1))}
            disabled={index === images.length - 1}
            className={`p-1 rounded-lg ${
              isDark
                ? "text-neutral-300 hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent"
                : "text-neutral-600 hover:bg-neutral-200/70 disabled:opacity-40 disabled:hover:bg-transparent"
            }`}
            aria-label="Next room image"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
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
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const CALL_HISTORY_STORAGE_KEY = "staynep-call-history";

// Languages where Chrome/Edge Web Speech API has no support or very poor quality.
// For these, we skip native STT entirely and go straight to server STT (Gemini/Whisper).
const BROWSER_STT_UNRELIABLE = new Set([
  "ne-NP",  // Nepali — limited/no Chrome STT support
  "sw-KE",  // Swahili
  "et-EE",  // Estonian
  "lt-LT",  // Lithuanian
  "fil-PH", // Filipino
  "ms-MY",  // Malay — inconsistent
  "uk-UA",  // Ukrainian — inconsistent
  "bn-BD",  // Bengali — limited
]);
const STT_MODE_STORAGE_KEY = "assistant-stt-mode";
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
  { code: "sw-KE",  name: "Swahili",            nativeName: "Kiswahili",        flag: "🇰🇪", ttsLang: "sw-KE" },
  { code: "th-TH",  name: "Thai",               nativeName: "ไทย",              flag: "🇹🇭", ttsLang: "th-TH" },
  { code: "tr-TR",  name: "Turkish",            nativeName: "Türkçe",           flag: "🇹🇷", ttsLang: "tr-TR" },
  { code: "uk-UA",  name: "Ukrainian",          nativeName: "Українська",       flag: "🇺🇦", ttsLang: "uk-UA" },
  { code: "vi-VN",  name: "Vietnamese",         nativeName: "Tiếng Việt",       flag: "🇻🇳", ttsLang: "vi-VN" },
  { code: "ms-MY",  name: "Malay",              nativeName: "Bahasa Melayu",    flag: "🇲🇾", ttsLang: "ms-MY" },
  { code: "sv-SE",  name: "Swedish",            nativeName: "Svenska",          flag: "🇸🇪", ttsLang: "sv-SE" },
  { code: "zh-TW",  name: "Chinese (Taiwan)",   nativeName: "繁體中文",           flag: "🇹🇼", ttsLang: "zh-TW" },
  { code: "fil-PH", name: "Filipino",           nativeName: "Filipino",         flag: "🇵🇭", ttsLang: "fil-PH" },
  { code: "ta-IN",  name: "Tamil",              nativeName: "தமிழ்",             flag: "🇮🇳", ttsLang: "ta-IN" },
  { code: "te-IN",  name: "Telugu",             nativeName: "తెలుగు",            flag: "🇮🇳", ttsLang: "te-IN" },
].sort((a, b) => a.name.localeCompare(b.name));

// UI translations
// UI strings sourced from languages.ts — covers all 40+ languages natively
function getUI(langCode: string): UIStrings {
  return getUIStrings(langCode);
}

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export default function VoiceAssistant() {
  const pathname = usePathname();
  const tenantSlug = useTenantSlug();
  const embedMode = Boolean(tenantSlug) || pathname?.startsWith("/embed/");
  const { branding, suggestedQuestions, config: hotelConfig, welcomeHeadline, welcomeSubtext } =
    useHotelPublicConfig(tenantSlug);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; booking?: BookingSummary; dining?: DiningSummary; spa?: SpaSummary; serviceRequest?: any }[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inConversation, setInConversation] = useState(false);
  const inConversationRef = useRef(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, "up" | "down">>({});
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(ALL_LANGUAGES.find(l => l.code === "en-US") || ALL_LANGUAGES[0]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [inCall, setInCall] = useState(false);
  const [callHistory, setCallHistory] = useState<CallHistoryRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>("warm");
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [sttReady, setSttReady] = useState<boolean | null>(null);
  const [geminiLiveReady, setGeminiLiveReady] = useState<boolean | null>(null);
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [showGuestAuth, setShowGuestAuth] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [chatDraft, setChatDraft] = useState("");
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [pendingDining, setPendingDining] = useState<PendingDining | null>(null);
  const [pendingSpa, setPendingSpa] = useState<PendingSpa | null>(null);
  const [pendingServiceRequest, setPendingServiceRequest] = useState<PendingServiceRequest | null>(null);
  const pendingBookingRef = useRef<PendingBooking | null>(null);
  const pendingDiningRef = useRef<PendingDining | null>(null);
  const pendingSpaRef = useRef<PendingSpa | null>(null);
  const pendingServiceRequestRef = useRef<PendingServiceRequest | null>(null);
  pendingBookingRef.current = pendingBooking;
  pendingDiningRef.current = pendingDining;
  pendingSpaRef.current = pendingSpa;
  pendingServiceRequestRef.current = pendingServiceRequest;
  const chatInputRef = useRef<HTMLInputElement>(null);
  const conciergeName = useMemo(() => {
    const match = hotelConfig?.receptionistPersona?.match(/You are (\w+)/i);
    return match?.[1] ?? "Alex";
  }, [hotelConfig?.receptionistPersona]);

  const ui = useMemo(() => getUI(selectedLanguage.code), [selectedLanguage]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const nativeSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeDraftTranscriptRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const nemotronVoiceRef = useRef<NemotronVoiceSpeaker | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [useServerSTT, setUseServerSTT] = useState(false);
  const useServerSTTRef = useRef(false);
  useServerSTTRef.current = useServerSTT;
  const voiceStackRef = useRef<"free" | "cloud">("free");
  // Tracks consecutive no-speech failures so we switch to server STT after 2
  const nativeSttNoSpeechCountRef = useRef(0);
  const lastServerSttAtRef = useRef(0);
  const serverSttFailCountRef = useRef(0);
  const autoListenAfterSpeakRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const lastSubmittedTranscriptRef = useRef("");
  const lastSubmittedAtRef = useRef(0);
  isProcessingRef.current = isProcessing;
  isSpeakingRef.current = isSpeaking;
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const selectedLanguageRef = useRef(selectedLanguage);
  selectedLanguageRef.current = selectedLanguage;
  const inputModeRef = useRef(inputMode);
  inputModeRef.current = inputMode;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    void loadGuestProfile().then(setGuestProfile).catch(() => setGuestProfile(null));
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CALL_HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setCallHistory(parsed.filter(Boolean).slice(0, 30));
      }
    } catch {
      // ignore storage parse errors
    }
  }, []);

  useEffect(() => {
    const savedInputMode = window.localStorage.getItem("assistant-input-mode");
    if (savedInputMode === "voice" || savedInputMode === "text") {
      setInputMode(savedInputMode);
    }

    const savedSttMode = window.localStorage.getItem(STT_MODE_STORAGE_KEY);
    if (savedSttMode === "whisper") {
      setUseServerSTT(true);
      useServerSTTRef.current = true;
    } else if (savedSttMode === "native") {
      setUseServerSTT(false);
      useServerSTTRef.current = false;
    }

    const savedLang = window.localStorage.getItem("assistant-language");
    if (savedLang) {
      const lang = ALL_LANGUAGES.find((l) => l.code === savedLang);
      if (lang) setSelectedLanguage(lang);
    }
  }, []);

  useEffect(() => {
    setAiReady(typeof hotelConfig.aiReady === "boolean" ? hotelConfig.aiReady : null);
    setSttReady(typeof hotelConfig.sttReady === "boolean" ? hotelConfig.sttReady : null);
    setGeminiLiveReady(typeof hotelConfig.geminiLiveReady === "boolean" ? hotelConfig.geminiLiveReady : null);
    if (hotelConfig.voiceStyle && ["warm", "professional", "energetic"].includes(hotelConfig.voiceStyle)) {
      setVoiceStyle(hotelConfig.voiceStyle as VoiceStyle);
    }
    voiceStackRef.current = hotelConfig.voiceStack === "cloud" ? "cloud" : "free";
    const savedSttMode = window.localStorage.getItem(STT_MODE_STORAGE_KEY);
    if (savedSttMode === "whisper") {
      setUseServerSTT(true);
      useServerSTTRef.current = true;
    } else if (savedSttMode === "native") {
      setUseServerSTT(false);
      useServerSTTRef.current = false;
    } else if (hotelConfig.sttReady === true && typeof window !== "undefined") {
      const win = window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      };
      const hasNativeStt = Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
      if (!hasNativeStt) {
        setUseServerSTT(true);
        useServerSTTRef.current = true;
      }
    }
    if (hotelConfig.language) {
      const lang = ALL_LANGUAGES.find(
        (l) => l.code === hotelConfig.language || l.code.startsWith(hotelConfig.language)
      );
      if (lang) setSelectedLanguage(lang);
    }
  }, [hotelConfig]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  useEffect(() => {
    if (!showLanguageMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLanguageMenu(false);
        setLanguageSearch("");
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showLanguageMenu]);

  useEffect(() => {
    nemotronVoiceRef.current = createNemotronVoiceSpeaker();
    return () => nemotronVoiceRef.current?.cancel();
  }, []);

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

    // Score each candidate
    const scored = candidates.map(v => {
      const nameL = v.name.toLowerCase();
      let score = 0;
      // Premium indicators
      if (PREMIUM_VOICE_HINTS.some(k => nameL.includes(k))) score += 14;
      // Robotic indicators (penalize)
      if (ROBOTIC_VOICE_HINTS.some(k => nameL.includes(k))) score -= 25;
      // Prefer non-local (cloud) voices
      if (!v.localService) score += 5;
      // Prefer female-leaning concierge tone (when available)
      if (["female", "woman", "samantha", "serena", "karen", "moira", "ava"].some((k) => nameL.includes(k))) score += 4;
      // Exact lang match bonus
      if (v.lang === langCode) score += 3;
      return { voice: v, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].voice;
  }, []);

  const toHumanSpeechText = useCallback(
    (text: string) => trimForVoiceReply(sanitizeForSpeech(text)),
    []
  );

  const renderAssistantMessageContent = (content: string) => {
    const lines = content.split("\n");

    const isSafeImageUrl = (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return false;
      // Allow local paths and http(s) URLs; block other schemes for safety.
      return (
        trimmed.startsWith("/") ||
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://")
      );
    };

    const IMAGE_PREFIX = "IMAGE:";
    const mdImageRegex = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/;

    const safeImages: string[] = [];
    const safeImageLineIndices = new Set<number>();
    let firstSafeImageLineIndex: number | null = null;

    // Collect safe image URLs first, so we can render a single carousel.
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (trimmed.toUpperCase().startsWith(IMAGE_PREFIX)) {
        const url = trimmed.slice(IMAGE_PREFIX.length).trim();
        if (isSafeImageUrl(url)) {
          if (firstSafeImageLineIndex === null) firstSafeImageLineIndex = i;
          safeImages.push(url);
          safeImageLineIndices.add(i);
        }
        continue;
      }

      const mdMatch = trimmed.match(mdImageRegex);
      if (mdMatch) {
        const url = mdMatch[2];
        if (isSafeImageUrl(url)) {
          if (firstSafeImageLineIndex === null) firstSafeImageLineIndex = i;
          safeImages.push(url);
          safeImageLineIndices.add(i);
        }
        continue;
      }
    }

    const shouldInsertCarouselAt = firstSafeImageLineIndex ?? -1;
    let carouselInserted = false;

    const rendered: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (!carouselInserted && shouldInsertCarouselAt === i && safeImages.length > 0) {
        carouselInserted = true;
        rendered.push(<RoomImageCarousel key={`carousel-${safeImages.join("|")}`} images={safeImages} isDark={isDark} />);
        continue;
      }

      // Skip safe image lines; they get represented by the carousel instead.
      if (safeImageLineIndices.has(i)) continue;

      const trimmed = lines[i].trim();
      if (!trimmed) {
        rendered.push(<br key={`br-${i}`} />);
        continue;
      }

      rendered.push(
        <span key={`t-${i}`}>
          {lines[i]}
          {i < lines.length - 1 ? <br /> : null}
        </span>
      );
    }

    // If images exist but the carousel line got skipped (unlikely), append at the end.
    if (!carouselInserted && safeImages.length > 0) {
      rendered.push(<RoomImageCarousel key={`carousel-end-${safeImages.join("|")}`} images={safeImages} isDark={isDark} />);
    }

    return <>{rendered}</>;
  };

  // Start listening (extracted so it can be called from auto-listen)
  const startListeningInternal = useCallback(() => {
    if (isProcessingRef.current || isSpeakingRef.current) return;
    if (!inConversationRef.current && !autoListenAfterSpeakRef.current) return;

    setErrorMessage(null);
    synthRef.current?.cancel();
    nemotronVoiceRef.current?.cancel();
    setIsSpeaking(false);

    if (aiReady === false && sttReady === false) {
      setErrorMessage("Configure GOOGLE_GENERATIVE_AI_API_KEY for chat, or WHISPER_MODEL_PATH / WHISPER_STT_ENDPOINT for self-hosted STT.");
      return;
    }

    const win = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR || useServerSTT) {
      if (sttReady === false) {
        setErrorMessage("Speech-to-text not configured. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local and restart.");
        return;
      }
      startServerRecordingRef.current();
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguageRef.current.code;

    const clearNativeSilenceTimer = () => {
      if (nativeSilenceTimerRef.current) {
        clearTimeout(nativeSilenceTimerRef.current);
        nativeSilenceTimerRef.current = null;
      }
    };

    const scheduleNativeSilenceSubmit = () => {
      clearNativeSilenceTimer();
      nativeSilenceTimerRef.current = setTimeout(() => {
        if (!inConversationRef.current) return;
        const text = nativeDraftTranscriptRef.current.trim();
        nativeDraftTranscriptRef.current = "";
        try {
          recognition.stop();
        } catch {
          /* already stopped */
        }
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
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
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
          setErrorMessage("Browser speech recognition failed. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local and restart.");
        }
      } else if (e.error === "not-allowed") {
        setErrorMessage(ui.errorMicDenied);
      } else if (e.error === "no-speech") {
        nativeSttNoSpeechCountRef.current += 1;
        // After 2 consecutive no-speech failures, switch to server STT.
        // This catches languages where the browser simply doesn't recognise the audio.
        if (nativeSttNoSpeechCountRef.current >= 2 && sttReady !== false) {
          nativeSttNoSpeechCountRef.current = 0;
          useServerSTTRef.current = true;
          setUseServerSTT(true);
          window.localStorage.setItem(STT_MODE_STORAGE_KEY, "whisper");
          setErrorMessage(null);
          if (inConversationRef.current) {
            setTimeout(() => startServerRecordingRef.current(), 100);
          }
        } else if (autoListenAfterSpeakRef.current) {
          setTimeout(() => {
            if (inConversationRef.current) startListeningInternalRef.current();
          }, VOICE_STT_RETRY_MS);
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
    recognition.start();
    recognitionRef.current = recognition;
  }, [useServerSTT, aiReady, sttReady, ui.errorMicDenied]);

  // Refs for callbacks used in auto-listen
  const startListeningInternalRef = useRef(startListeningInternal);
  startListeningInternalRef.current = startListeningInternal;
  const startServerRecordingRef = useRef(() => {});
  const handleUserAudioCompleteRef = useRef<(incomingText: string) => void>(() => {});

  const speakWithBrowser = useCallback(
    (
      text: string,
      resumeListenAfter = true,
      chain = false,
      onSpeechStart?: () => void
    ): Promise<boolean> =>
      new Promise((resolve) => {
        const synth = synthRef.current;
        if (!synth) {
          resolve(false);
          return;
        }

        ensureAudioUnlocked();
        if (synth.paused) synth.resume();

        const cleaned = toHumanSpeechText(text);
        if (!cleaned) {
          resolve(false);
          return;
        }

        let settled = false;
        let started = false;
        let retried = false;

        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(startTimeout);
          resolve(ok);
        };

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

          if (voiceStyle === "professional") {
            utterance.rate = 0.94;
            utterance.pitch = 0.96;
          } else if (voiceStyle === "energetic") {
            utterance.rate = 1.02;
            utterance.pitch = 1.05;
          } else {
            utterance.rate = 0.92;
            utterance.pitch = 1.0;
          }
          utterance.volume = 1.0;

          utterance.onstart = () => {
            started = true;
            setIsSpeaking(true);
            onSpeechStart?.();
          };
          utterance.onend = () => {
            setIsSpeaking(false);
            if (resumeListenAfter && inConversationRef.current) {
              setTimeout(() => {
                if (inConversationRef.current) {
                  startListeningInternalRef.current();
                }
              }, VOICE_RESUME_LISTEN_MS);
            }
            finish(true);
          };
          utterance.onerror = () => {
            setIsSpeaking(false);
            if (!retried) {
              retried = true;
              window.setTimeout(speakOnce, 120);
              return;
            }
            finish(false);
          };

          synth.speak(utterance);
        };

        const startTimeout = window.setTimeout(() => {
          if (!started) {
            if (!retried) {
              retried = true;
              speakOnce();
              return;
            }
            finish(false);
          }
        }, 1500);

        speakOnce();
      }),
    [pickBestVoice, toHumanSpeechText, voiceStyle]
  );

  const speakText = useCallback(async (
    text: string,
    options?: { chain?: boolean; onSpeechStart?: () => void; forceProvider?: VoiceProvider }
  ): Promise<boolean> => {
    const cleaned = toHumanSpeechText(text);
    if (!cleaned) return false;

    ensureAudioUnlocked();
    const resumeListenAfter = !options?.chain;
    const forceProvider = options?.forceProvider;

    if (!options?.chain) {
      synthRef.current?.cancel();
      nemotronVoiceRef.current?.cancel();
    }

    // Neural server TTS (Edge) sounds far more natural than browser speech.
    if (forceProvider === "server" || !forceProvider) {
      if (nemotronVoiceRef.current) {
        const used = await nemotronVoiceRef.current.speak({
          text: cleaned,
          language: selectedLanguageRef.current.ttsLang,
          voiceStyle,
          onStart: () => {
            setIsSpeaking(true);
            options?.onSpeechStart?.();
          },
          onEnd: () => {
            setIsSpeaking(false);
            if (resumeListenAfter && inConversationRef.current) {
              setTimeout(() => {
                if (inConversationRef.current) {
                  startListeningInternalRef.current();
                }
              }, VOICE_RESUME_LISTEN_MS);
            }
          },
          onError: () => setIsSpeaking(false),
        });
        if (used) return true;
      }
      if (forceProvider === "server") return false;
    }

    if (forceProvider === "browser" || !forceProvider) {
      const browserOk = await speakWithBrowser(
        cleaned,
        resumeListenAfter,
        Boolean(options?.chain),
        options?.onSpeechStart
      );
      if (browserOk) return true;
      if (forceProvider === "browser") return false;
    }

    return false;
  }, [speakWithBrowser, toHumanSpeechText, voiceStyle]);

  const applyChatPayload = useCallback(
    (
      data: {
        reply?: string;
        error?: string;
        requiresGuestAuth?: boolean;
        escalated?: boolean;
        guest?: { loyaltyTier?: GuestProfile["loyaltyTier"] };
        booking?: BookingSummary;
        dining?: DiningSummary;
        spa?: SpaSummary;
        serviceRequest?: any;
        pendingBooking?: PendingBooking | null;
        pendingDining?: PendingDining | null;
        pendingSpa?: PendingSpa | null;
        pendingServiceRequest?: PendingServiceRequest | null;
      },
      ok: boolean
    ) => {
      const apiError = typeof data.error === "string" && data.error.trim() ? data.error.trim() : "";
      if (data.requiresGuestAuth) {
        setShowGuestAuth(true);
        setErrorMessage(apiError || "Sign in for higher limits and saved bookings.");
      }
      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : apiError
            ? apiError
            : !ok
              ? ui.errorConnection
              : ui.errorGeneric;
      if (apiError && !data.requiresGuestAuth) setErrorMessage(apiError);
      if (data.guest && guestProfile) {
        setGuestProfile((prev) =>
          prev
            ? {
                ...prev,
                messageCount: prev.messageCount + 1,
                loyaltyTier: data.guest?.loyaltyTier ?? prev.loyaltyTier,
              }
            : prev
        );
      }
      if (data.pendingBooking !== undefined) {
        setPendingBooking(data.pendingBooking);
      }
      if (data.pendingDining !== undefined) {
        setPendingDining(data.pendingDining);
      }
      if (data.pendingSpa !== undefined) {
        setPendingSpa(data.pendingSpa);
      }
      if (data.pendingServiceRequest !== undefined) {
        setPendingServiceRequest(data.pendingServiceRequest);
      }
      const booking =
        data.booking && typeof data.booking === "object" && typeof data.booking.id === "string"
          ? data.booking
          : undefined;
      const dining =
        data.dining && typeof data.dining === "object" && typeof data.dining.id === "string"
          ? data.dining
          : undefined;
      const spa =
        data.spa && typeof data.spa === "object" && typeof data.spa.id === "string"
          ? data.spa
          : undefined;
      const serviceRequest =
        data.serviceRequest && typeof data.serviceRequest === "object" && typeof data.serviceRequest.id === "string"
          ? data.serviceRequest
          : undefined;
      return { reply, booking, dining, spa, serviceRequest, escalated: Boolean(data.escalated) };
    },
    [guestProfile, ui.errorConnection, ui.errorGeneric]
  );

  const handleUserMessage = useCallback(async (text: string, speakReply = inputModeRef.current === "voice") => {
    setIsListening(false);
    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    const payload = {
      message: text,
      language: selectedLanguage.code,
      history: messagesRef.current.slice(-4),
      channel: inputModeRef.current === "voice" ? "voice" : "text",
      pendingBooking: pendingBookingRef.current,
      pendingDining: pendingDiningRef.current,
      pendingSpa: pendingSpaRef.current,
      pendingServiceRequest: pendingServiceRequestRef.current,
      ...(tenantSlug ? { hotel: tenantSlug } : {}),
    };

    try {
      if (speakReply) {
        ensureAudioUnlocked();
        const response = await fetch(tenantApiUrl("/api/chat/stream", tenantSlug), {
          method: "POST",
          headers: guestAuthHeaders({ "Content-Type": "application/json" }),
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!response.ok || !response.body) {
          const fallback = await response.json().catch(() => ({}));
          const { reply, booking, dining, spa, serviceRequest, escalated } = applyChatPayload(fallback, response.ok);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: reply,
              ...(booking ? { booking } : {}),
              ...(dining ? { dining } : {}),
              ...(spa ? { spa } : {}),
              ...(serviceRequest ? { serviceRequest } : {}),
            },
          ]);
          if (escalated) {
            setMessages((prev) => [...prev, { role: "assistant", content: GUEST_STAFF_HANDOFF_MESSAGE }]);
            autoListenAfterSpeakRef.current = false;
          } else {
            autoListenAfterSpeakRef.current = true;
            await speakText(reply);
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

        const markHeard = () => {
          heardAudio = true;
        };

        const prefetchReplyAudio = (text: string) => {
          const spoken = toHumanSpeechText(text);
          if (spoken.length < 12 || !nemotronVoiceRef.current) return;
          nemotronVoiceRef.current.prefetch({
            text: spoken,
            language: selectedLanguageRef.current.ttsLang,
            voiceStyle,
          });
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
              const event = JSON.parse(line.slice(6)) as {
                type?: string;
                text?: string;
                reply?: string;
                error?: string;
                escalated?: boolean;
                booking?: BookingSummary;
                dining?: DiningSummary;
                spa?: SpaSummary;
                serviceRequest?: any;
                pendingBooking?: PendingBooking | null;
                pendingDining?: PendingDining | null;
                pendingSpa?: PendingSpa | null;
                pendingServiceRequest?: PendingServiceRequest | null;
              };
              if (event.type === "error") {
                const err =
                  typeof event.error === "string" && event.error.trim()
                    ? event.error.trim()
                    : ui.errorGeneric;
                fullReply = err;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = { ...last, content: err };
                  }
                  return next;
                });
              } else if (event.type === "delta" && event.text) {
                fullReply += event.text;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = { ...last, content: fullReply };
                  }
                  return next;
                });
                prefetchReplyAudio(fullReply);
              } else if (event.type === "done") {
                donePayload = event;
              }
            } catch {
              /* ignore malformed SSE */
            }
          }
        }

        const finalReply =
          (typeof donePayload?.reply === "string" && donePayload.reply.trim()) || fullReply.trim();
        const { booking, dining, spa, serviceRequest, escalated } = applyChatPayload(
          {
            reply: finalReply,
            escalated: Boolean(donePayload?.escalated),
            booking: donePayload?.booking as BookingSummary | undefined,
            dining: donePayload?.dining as DiningSummary | undefined,
            spa: donePayload?.spa as SpaSummary | undefined,
            serviceRequest: donePayload?.serviceRequest,
            pendingBooking: donePayload?.pendingBooking as PendingBooking | null | undefined,
            pendingDining: donePayload?.pendingDining as PendingDining | null | undefined,
            pendingSpa: donePayload?.pendingSpa as PendingSpa | null | undefined,
            pendingServiceRequest: donePayload?.pendingServiceRequest as PendingServiceRequest | null | undefined,
          },
          true
        );

        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content: finalReply,
              ...(booking ? { booking } : {}),
              ...(dining ? { dining } : {}),
              ...(spa ? { spa } : {}),
              ...(serviceRequest ? { serviceRequest } : {}),
            };
          }
          return next;
        });

        const tail = finalReply.trim();
        if (escalated) {
          setMessages((prev) => [...prev, { role: "assistant", content: GUEST_STAFF_HANDOFF_MESSAGE }]);
          autoListenAfterSpeakRef.current = false;
        } else if (tail) {
          autoListenAfterSpeakRef.current = true;
          prefetchReplyAudio(tail);
          if (!heardAudio) {
            await speakText(tail, { onSpeechStart: markHeard, forceProvider: "server" });
          } else if (inConversationRef.current) {
            setTimeout(() => {
              if (inConversationRef.current) {
                startListeningInternalRef.current();
              }
            }, VOICE_RESUME_LISTEN_MS);
          }
        } else {
          autoListenAfterSpeakRef.current = false;
        }
        return;
      }

      const response = await fetch(tenantApiUrl("/api/chat", tenantSlug), {
        method: "POST",
        headers: guestAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      const { reply, booking, dining, spa, serviceRequest, escalated } = applyChatPayload(data, response.ok);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          ...(booking ? { booking } : {}),
          ...(dining ? { dining } : {}),
          ...(spa ? { spa } : {}),
          ...(serviceRequest ? { serviceRequest } : {}),
        },
      ]);
      if (escalated) {
        setMessages((prev) => [...prev, { role: "assistant", content: GUEST_STAFF_HANDOFF_MESSAGE }]);
        autoListenAfterSpeakRef.current = false;
      } else if (speakReply) {
        autoListenAfterSpeakRef.current = true;
        await speakText(reply);
      } else {
        autoListenAfterSpeakRef.current = false;
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: ui.errorConnection }]);
    } finally {
      setIsProcessing(false);
    }
  }, [applyChatPayload, selectedLanguage, speakText, tenantSlug, toHumanSpeechText, voiceStyle, ui.errorConnection, ui.errorGeneric]);

  const handleUserAudioComplete = useCallback(
    (rawText: string) => {
      const text = sanitizeTranscription(rawText);
      if (!text || isJunkTranscription(text)) {
        if (inConversationRef.current) {
          setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS);
        }
        return;
      }
      if (isProcessingRef.current || isSpeakingRef.current) return;

      const now = Date.now();
      if (
        text === lastSubmittedTranscriptRef.current &&
        now - lastSubmittedAtRef.current < 2500
      ) {
        return;
      }
      lastSubmittedTranscriptRef.current = text;
      lastSubmittedAtRef.current = now;
      nativeSttNoSpeechCountRef.current = 0; // reset on successful transcript

      void handleUserMessage(text, inputModeRef.current === "voice");
    },
    [handleUserMessage],
  );

  const handleSuggestedQuestion = useCallback((question: string) => {
    if (isProcessing || isListening || isSpeaking || aiReady === false) return;
    setErrorMessage(null);
    const useVoice = inputModeRef.current === "voice";
    if (useVoice && !inConversationRef.current) {
      inConversationRef.current = true;
      setInConversation(true);
      autoListenAfterSpeakRef.current = true;
    }
    void handleUserMessage(question, useVoice);
  }, [aiReady, handleUserMessage, isListening, isProcessing, isSpeaking]);

  const submitChatMessage = useCallback(() => {
    const trimmed = chatDraft.trim();
    if (!trimmed || isProcessing || isListening || isSpeaking || aiReady === false) return;
    setErrorMessage(null);
    setChatDraft("");
    void handleUserMessage(trimmed, false);
  }, [aiReady, chatDraft, handleUserMessage, isListening, isProcessing, isSpeaking]);

  // Keep refs up to date for use inside callbacks
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
    const noSpeech =
      status === 422 ||
      /no speech detected|recording too short|too short/i.test(message);
    if (noSpeech && inConversationRef.current) {
      setErrorMessage(null);
      setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS);
      return;
    }
    setErrorMessage(message);
  }, []);

  const startServerRecording = async () => {
    const now = Date.now();
    if (now - lastServerSttAtRef.current < 600) {
      if (inConversationRef.current) {
        setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS);
      }
      return;
    }
    lastServerSttAtRef.current = now;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      // Guard: session was stopped while waiting for mic permission
      if (!inConversationRef.current && !autoListenAfterSpeakRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      const blobType = recorder.mimeType || mimeType || "audio/webm";
      const heardSpeechRef = { current: false };

      const retryListen = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (inConversationRef.current) {
          setErrorMessage(null);
          setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS);
        } else {
          setIsListening(false);
        }
      };

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        if (!heardSpeechRef.current) {
          retryListen();
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        if (audioBlob.size < VOICE_MIN_BLOB_BYTES) {
          retryListen();
          return;
        }

        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('language', selectedLanguageRef.current.code);
        try {
          const res = await fetch(tenantApiUrl("/api/stt", tenantSlug), { method: "POST", headers: guestAuthHeaders(), credentials: "include", body: formData });
          const data = await res.json();
          const transcribed = typeof data.text === "string" ? sanitizeTranscription(data.text) : "";
          if (transcribed && !isJunkTranscription(transcribed)) {
            stream.getTracks().forEach((t) => t.stop());
            serverSttFailCountRef.current = 0;
            handleUserAudioComplete(transcribed);
          } else if (inConversationRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            if (data.fallbackNative && serverSttFailCountRef.current >= 1) {
              const win = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
              if (win.SpeechRecognition || win.webkitSpeechRecognition) {
                serverSttFailCountRef.current = 0;
                setUseServerSTT(false);
                useServerSTTRef.current = false;
                setErrorMessage(null);
                setTimeout(() => startListeningInternalRef.current(), VOICE_STT_RETRY_MS);
                return;
              }
            }
            serverSttFailCountRef.current += 1;
            handleSttFailure(
              typeof data.error === "string" && data.error.trim() ? data.error.trim() : ui.errorNoSpeech,
              res.status
            );
          } else {
            stream.getTracks().forEach((t) => t.stop());
            handleSttFailure(
              typeof data.error === "string" && data.error.trim() ? data.error.trim() : ui.errorNoSpeech,
              res.status
            );
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
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      const timeDomainBuffer = new Uint8Array(analyser.fftSize);
      const SILENCE_DURATION_MS = VOICE_SILENCE_SUBMIT_MS;
      const MAX_RECORD_MS = VOICE_MAX_RECORD_MS;

      let silenceStart: number | null = null;
      let speechStartedAt: number | null = null;
      const recordStart = Date.now();
      let stopped = false;

      const stopRecording = () => {
        if (stopped) return;
        stopped = true;
        try {
          if (recorder.state === "recording") recorder.requestData();
        } catch { /* ignore */ }
        try {
          if (recorder.state === "recording") recorder.stop();
        } catch { /* ignore */ }
        void audioCtx.close();
      };

      const checkSilence = () => {
        if (stopped) return;
        if (recorder.state !== "recording") return;

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

        if (
          heardSpeechRef.current &&
          silenceStart &&
          Date.now() - silenceStart > SILENCE_DURATION_MS &&
          speechMs >= VOICE_SPEECH_MIN_MS
        ) {
          stopRecording();
          return;
        }

        if (elapsed > MAX_RECORD_MS) {
          stopRecording();
          return;
        }

        requestAnimationFrame(checkSilence);
      };

      recorder.start(VOICE_RECORDER_TIMESLICE_MS);
      setIsListening(true);

      setTimeout(() => {
        if (!stopped && recorder.state === "recording") {
          checkSilence();
        }
      }, VOICE_MIC_WARMUP_MS);

    } catch {
      setErrorMessage(ui.errorMicDenied);
    }
  };

  // Keep server recording ref in sync
  startServerRecordingRef.current = startServerRecording;

  const stopEverything = useCallback(() => {
    inConversationRef.current = false;
    setInConversation(false);
    autoListenAfterSpeakRef.current = false;
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    // Stop recognition
    if (nativeSilenceTimerRef.current) {
      clearTimeout(nativeSilenceTimerRef.current);
      nativeSilenceTimerRef.current = null;
    }
    nativeDraftTranscriptRef.current = "";
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    // Stop speech
    synthRef.current?.cancel();
    nemotronVoiceRef.current?.cancel();
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
  }, []);

  const switchInputMode = useCallback((mode: InputMode) => {
    setInputMode(mode);
    window.localStorage.setItem("assistant-input-mode", mode);
    if (mode === "text") {
      stopEverything();
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [stopEverything]);

  // ── Simple on/off toggle ──
  const toggleListening = () => {
    if (inConversation || isListening || isSpeaking || isProcessing) {
      // STOP everything
      stopEverything();
    } else {
      // START conversation
      setErrorMessage(null);
      unlockBrowserAudio();
      inConversationRef.current = true;
      setInConversation(true);
      autoListenAfterSpeakRef.current = true;
      serverSttFailCountRef.current = 0;
      startListeningInternal();
    }
  };

  const changeLanguage = (lang: LanguageOption) => {
    setSelectedLanguage(lang);
    window.localStorage.setItem("assistant-language", lang.code);
    setShowLanguageMenu(false);
    setLanguageSearch("");
    nativeSttNoSpeechCountRef.current = 0;

    // Auto-switch to server STT for languages with poor/no browser support
    if (BROWSER_STT_UNRELIABLE.has(lang.code) && sttReady !== false) {
      useServerSTTRef.current = true;
      setUseServerSTT(true);
      window.localStorage.setItem(STT_MODE_STORAGE_KEY, "whisper");
    }
  };

  const filteredLanguages = ALL_LANGUAGES.filter(l =>
    l.nativeName.toLowerCase().includes(languageSearch.toLowerCase()) ||
    l.name.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const isRTL = ["ar", "he"].includes(selectedLanguage.code.split("-")[0]);
  const isDark = true;
  const persistCallHistory = useCallback((next: CallHistoryRecord[]) => {
    setCallHistory(next);
    window.localStorage.setItem(CALL_HISTORY_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const handleCallEnd = useCallback((record?: CallHistoryRecord) => {
    setInCall(false);
    if (!record) return;
    setCallHistory((prev) => {
      const next = [record, ...prev].slice(0, 30);
      window.localStorage.setItem(CALL_HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const formatCallTime = (ts: number) =>
    new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatCallDuration = (secs: number) => `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s`;

  const voiceStatusLabel =
    isListening
      ? VOICE_STATUS.listening
      : isSpeaking
        ? VOICE_STATUS.speaking
        : isProcessing
          ? VOICE_STATUS.thinking
          : inConversation
            ? VOICE_STATUS.tapToEnd
            : VOICE_STATUS.ready;

  const voicePresenceMode = isListening
    ? "listening"
    : isSpeaking
      ? "speaking"
      : isProcessing
        ? "thinking"
        : "idle";

  const panelShell = vapiPanelShell;

  const renderVoiceOrb = (compact = false) => {
    const size = compact ? "w-28 h-28" : "w-36 h-36 lg:w-40 lg:h-40";
    const iconSize = compact ? "w-12 h-12" : "w-16 h-16";
    const innerIcon = compact ? "w-7 h-7" : "w-9 h-9";

    return (
      <div className="relative group cursor-pointer mx-auto" onClick={toggleListening}>
        {!compact && <div className="glass-outer-ring absolute -inset-3 rounded-full" />}

        {isListening && (
          <div className={`absolute ${compact ? "-inset-10" : "-inset-14"}`}>
            <div className="ripple-ring scale-150" style={{ animationDelay: "0s", borderColor: branding.accentColor, opacity: 0.35 }} />
            <div className="ripple-ring scale-150" style={{ animationDelay: "0.8s", borderColor: branding.accentColor, opacity: 0.18 }} />
          </div>
        )}

        <div
          className={`glass-circle relative z-10 ${size} rounded-full flex flex-col items-center justify-center overflow-hidden border hover:scale-[1.03] active:scale-95 transition-all duration-500 ease-out animate-morph ${
            isListening ? "scale-105 glass-circle-listening" : isDark ? "border-white/[0.08] group-hover:border-white/20" : "border-neutral-200 group-hover:border-neutral-300"
          } ${isProcessing ? "animate-pulse" : ""} ${isSpeaking ? "scale-[1.02] glass-circle-speaking concierge-speaking" : ""}`}
        >
          {isProcessing ? (
            <Loader2 className={`${iconSize} animate-spin ${isDark ? "text-white/80" : "text-neutral-700"}`} />
          ) : isListening ? (
            <Mic className={`${iconSize} animate-pulse ${isDark ? "text-white/90" : "text-neutral-800"}`} />
          ) : isSpeaking ? (
            <Volume2 className={`${iconSize} animate-pulse-soft ${isDark ? "text-white/90" : "text-neutral-800"}`} />
          ) : (
            <div className={`${compact ? "w-14 h-14" : "w-[4.5rem] h-[4.5rem]"} rounded-full flex items-center justify-center border transition-colors ${
              isDark ? "bg-white/[0.04] border-white/[0.08] group-hover:bg-white/[0.08]" : "bg-white/80 border-neutral-200 group-hover:bg-white"
            }`}>
              <Mic className={`${innerIcon} ${isDark ? "text-neutral-400 group-hover:text-white/90" : "text-neutral-500 group-hover:text-neutral-900"}`} />
            </div>
          )}
          <div className={`absolute inset-0 rounded-full pointer-events-none ${isDark ? "bg-gradient-to-b from-white/[0.06] to-transparent" : "bg-gradient-to-b from-white/70 via-white/20 to-transparent"}`} />
        </div>

        {!compact && (
          <VoicePresenceBar
            active={isListening || isSpeaking || isProcessing}
            mode={voicePresenceMode}
            accentColor={branding.accentColor}
            className="mt-4 w-full max-w-[200px] mx-auto"
          />
        )}
      </div>
    );
  };

  const renderSuggestedChips = () =>
    suggestedQuestions.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {suggestedQuestions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={aiReady === false || isProcessing || isListening || isSpeaking}
            onClick={() => handleSuggestedQuestion(question)}
            className={`rounded-2xl border px-3.5 py-2 text-left text-[12px] font-medium leading-snug transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
              isDark ? "border-white/10 bg-white/[0.04] text-neutral-200 hover:bg-white/[0.08]" : "border-neutral-200 bg-white text-neutral-700 hover:border-sky-200 hover:bg-sky-50/80"
            }`}
          >
            {question}
          </button>
        ))}
      </div>
    ) : null;

  const renderChatComposer = () => (
    <div className={`shrink-0 border-t px-4 py-3 sm:px-5 ${isDark ? "border-white/10" : "border-neutral-200/80"}`}>
      <div className={`flex gap-1 p-1 rounded-xl mb-2.5 ${isDark ? "bg-white/[0.04]" : "bg-neutral-100"}`}>
        <button
          type="button"
          onClick={() => switchInputMode("voice")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
            inputMode === "voice"
              ? isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm"
              : isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Voice
        </button>
        <button
          type="button"
          onClick={() => switchInputMode("text")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
            inputMode === "text"
              ? isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-neutral-900 shadow-sm"
              : isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </button>
      </div>

      {inputMode === "text" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitChatMessage();
          }}
          className="flex gap-2"
        >
          <input
            ref={chatInputRef}
            type="text"
            value={chatDraft}
            onChange={(e) => setChatDraft(e.target.value)}
            placeholder="Type your message…"
            disabled={isProcessing || aiReady === false}
            className={`flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors ${
              isDark
                ? "bg-white/[0.06] border border-white/10 text-white placeholder-neutral-500 focus:border-white/20"
                : "bg-white border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-neutral-300"
            }`}
          />
          <button
            type="submit"
            disabled={!chatDraft.trim() || isProcessing || aiReady === false}
            className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "rgb(var(--hotel-accent-rgb))" }}
            aria-label="Send message"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <p className={`text-center text-[11px] leading-relaxed ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>
          Prefer typing? Switch to <button type="button" onClick={() => switchInputMode("text")} className="font-semibold underline underline-offset-2" style={{ color: "rgb(var(--hotel-accent-bright-rgb))" }}>Chat</button>.
        </p>
      )}
    </div>
  );

  const renderLanguageMenu = () =>
    showLanguageMenu ? (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[60] bg-void-canvas/80"
          aria-label="Close language menu"
          onClick={() => {
            setShowLanguageMenu(false);
            setLanguageSearch("");
          }}
        />
        <div
          className="fixed z-[70] flex max-h-[min(72vh,32rem)] flex-col overflow-hidden rounded-[5.6px] border border-iron-border bg-carbon-surface inset-x-4 top-[4.25rem] sm:inset-x-auto sm:right-6 sm:w-[22rem] lg:right-[calc(340px+1.5rem)]"
          dir="ltr"
          role="dialog"
          aria-modal="true"
          aria-label="Choose language"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-iron-border px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5.6px] border border-iron-border bg-slab-elevated">
                <Globe2 className="h-4 w-4 text-ice-border" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-cream-text">Language</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-mute">
                  {ALL_LANGUAGES.length} supported
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowLanguageMenu(false);
                setLanguageSearch("");
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5.6px] text-zinc-mute transition-colors hover:bg-slab-elevated hover:text-cream-text"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <div className="shrink-0 border-b border-iron-border px-4 py-3">
            <input
              type="text"
              placeholder="Search language..."
              value={languageSearch}
              onChange={(e) => setLanguageSearch(e.target.value)}
              className="w-full rounded-[5.6px] border border-iron-border bg-slab-elevated px-3.5 py-2.5 text-sm text-cream-text outline-none placeholder-zinc-mute focus:border-steel-border"
              autoFocus
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-premium">
            {filteredLanguages.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-mute">
                No languages match your search.
              </p>
            ) : (
              <div className="space-y-0.5">
                {filteredLanguages.map((lang) => {
                  const selected = selectedLanguage.code === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => changeLanguage(lang)}
                      className={`flex w-full items-center gap-3 rounded-[5.6px] px-3 py-2.5 text-sm transition-colors ${
                        selected
                          ? "border border-steel-border bg-slab-elevated text-cream-text"
                          : "text-bone-text hover:bg-slab-elevated/60"
                      }`}
                    >
                      <span className="shrink-0 text-xl leading-none">{lang.flag}</span>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="truncate font-medium leading-snug">{lang.nativeName}</div>
                        <div className="truncate text-[10px] text-zinc-mute">{lang.name}</div>
                      </div>
                      {selected ? (
                        <Check className="h-4 w-4 shrink-0 text-mint-pulse" strokeWidth={2} />
                      ) : (
                        <span className="w-4 shrink-0" aria-hidden />
                      )}
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
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-void-canvas font-sans text-cream-text transition-colors"
      style={{ ["--selection" as string]: `rgba(var(--hotel-accent-rgb), 0.35)` }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {!embedMode && <SiteShellBackdrop />}

      <header className={`sticky top-0 z-30 shrink-0 border-b ${siteHeaderChrome()}`}>
        <div className="mx-auto flex min-h-14 max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {embedMode ? (
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[5.6px] border border-iron-border"
                style={{
                  background: branding.logoUrl ? undefined : branding.accentColor,
                }}
              >
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={branding.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-cream-text">{branding.hotelName?.charAt(0) || "H"}</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-medium text-cream-text">
                  {branding.hotelName}
                </h1>
                <p className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-mute sm:block">
                  AI Concierge
                </p>
              </div>
            </div>
          ) : (
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Back to StayNEP home">
            <span className="hidden text-sm font-semibold text-cream-text sm:inline">STAYNEP</span>
            <div className={`hidden h-9 w-px shrink-0 bg-iron-border sm:block`} aria-hidden />
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[5.6px] border border-iron-border"
              style={{
                background: branding.logoUrl ? undefined : branding.accentColor,
              }}
            >
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-cream-text">{branding.hotelName?.charAt(0) || "H"}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-medium text-cream-text">
                {branding.hotelName}
              </h1>
              <p className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-mute sm:block">
                AI Concierge
              </p>
            </div>
          </Link>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            <GuestAuthPanel
              guest={guestProfile}
              onGuestChange={setGuestProfile}
              preferredLanguage={selectedLanguage.code}
              open={showGuestAuth}
              onOpenChange={setShowGuestAuth}
            />

            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setShowLanguageMenu((open) => !open)}
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
        </div>
      </header>

      {aiReady === false && (
        <div
          role="alert"
          className="mx-auto mt-3 w-full max-w-3xl px-4 sm:px-6"
        >
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/50 px-4 py-3 text-center text-sm text-amber-100">
            Gemini API key is missing. Add <code className="text-amber-200">GOOGLE_GENERATIVE_AI_API_KEY</code> to{" "}
            <code className="text-amber-200">.env.local</code> and restart the dev server.
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col lg:min-h-[calc(100vh-3.5rem-2.5rem)] lg:flex-row">
        {/* ── Conversation column ── */}
        <main className={`flex min-h-0 min-w-0 flex-1 flex-col px-4 pt-4 sm:px-6 lg:h-full lg:pb-6 lg:pt-6 ${inputMode === "voice" ? "pb-28" : "pb-4"}`}>
          <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5.6px] ${panelShell}`}>
            {/* Chat header strip */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-iron-border px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3 min-w-0">
                <ConciergeAvatar
                  name={conciergeName}
                  accentColor={branding.accentColor}
                  size="sm"
                  isDark={isDark}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-cream-text">
                    {messages.length === 0 ? welcomeHeadline : `${conciergeName}, your concierge`}
                  </p>
                  <p className="truncate text-[11px] text-zinc-mute">
                    {selectedLanguage.flag} {selectedLanguage.nativeName} · {messages.length === 0 ? welcomeSubtext : ui.welcomeHint}
                  </p>
                </div>
              </div>
              {guestProfile ? (
                <span className="hidden shrink-0 rounded-full border border-iron-border bg-slab-elevated px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-mute sm:inline">
                  {guestProfile.loyaltyTier} guest
                </span>
              ) : null}
            </div>

            {/* Messages scroll area */}
            <div className="flex-1 overflow-y-auto scrollbar-premium px-4 sm:px-5 py-5">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 sm:py-12">
                  <ConciergeAvatar
                    name={conciergeName}
                    accentColor={branding.accentColor}
                    size="md"
                    isDark={isDark}
                    className="mb-5"
                  />
                  <h2 className="va-welcome-title text-2xl sm:text-3xl text-gradient-brand mb-2 max-w-md text-balance">
                    {welcomeHeadline}
                  </h2>
                  <p className={`text-sm max-w-sm leading-relaxed mb-6 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
                    {welcomeSubtext}
                  </p>
                  {suggestedQuestions.length > 0 && (
                    <div className="w-full max-w-lg">
                      <p className={`mb-3 text-[10px] font-black uppercase tracking-[0.18em] ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                        {ui.suggestedQuestions}
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">{renderSuggestedChips()}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5 pb-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 animate-in slide-in-from-bottom-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      {msg.role === "user" ? (
                        <div
                          className={`shrink-0 h-8 w-8 rounded-xl flex items-center justify-center mt-0.5 ${
                            isDark ? "bg-white/10 text-neutral-300" : "bg-neutral-200 text-neutral-700"
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase">{ui.you.charAt(0)}</span>
                        </div>
                      ) : (
                        <ConciergeAvatar
                          name={conciergeName}
                          accentColor={branding.accentColor}
                          size="sm"
                          isDark={isDark}
                          className="mt-0.5"
                        />
                      )}

                      <div className={`flex flex-col gap-1.5 min-w-0 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div
                          className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed ${
                            msg.role === "user"
                              ? isDark
                                ? "bg-white/[0.08] text-neutral-100 rounded-tr-md border border-white/10"
                                : "bg-[#163a5f] text-white rounded-tr-md shadow-md"
                              : isDark
                                ? "glass text-neutral-100 rounded-tl-md border border-white/10"
                                : "bg-white text-neutral-800 rounded-tl-md border border-neutral-200 shadow-sm"
                          }`}
                          style={
                            msg.role === "assistant"
                              ? { borderColor: "rgba(var(--hotel-accent-rgb), 0.28)" }
                              : undefined
                          }
                        >
                          {renderAssistantMessageContent(msg.content)}
                        </div>

                        {msg.role === "assistant" && msg.booking ? (
                          <BookingSummaryCard booking={msg.booking} hotelName={branding.hotelName} isDark={isDark} />
                        ) : null}
                        {msg.role === "assistant" && msg.dining ? (
                          <DiningSummaryCard dining={msg.dining} hotelName={branding.hotelName} isDark={isDark} />
                        ) : null}
                        {msg.role === "assistant" && msg.spa ? (
                          <SpaSummaryCard spa={msg.spa} hotelName={branding.hotelName} isDark={isDark} />
                        ) : null}

                        <div className={`flex items-center gap-2 px-1 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-neutral-600" : "text-neutral-400"}`}>
                            {msg.role === "user" ? ui.you : conciergeName}
                          </span>
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-0.5">
                              {feedbackGiven[i] ? (
                                <span className={`text-[10px] font-medium ${feedbackGiven[i] === "up" ? "text-emerald-500" : ""}`} style={feedbackGiven[i] === "down" ? { color: "rgb(var(--hotel-accent-rgb))" } : undefined}>
                                  {feedbackGiven[i] === "up" ? "Thanks!" : "Noted"}
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setFeedbackGiven((prev) => ({ ...prev, [i]: "up" }));
                                      fetch("/api/feedback", { method: "POST", headers: guestAuthHeaders({ "Content-Type": "application/json" }), credentials: "include", body: JSON.stringify({ messageContent: msg.content, rating: "up" }) });
                                    }}
                                    className={`p-1 rounded-md transition-all ${isDark ? "text-neutral-600 hover:text-emerald-400" : "text-neutral-400 hover:text-emerald-600"}`}
                                    title="Helpful"
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setFeedbackGiven((prev) => ({ ...prev, [i]: "down" }));
                                      fetch("/api/feedback", { method: "POST", headers: guestAuthHeaders({ "Content-Type": "application/json" }), credentials: "include", body: JSON.stringify({ messageContent: msg.content, rating: "down" }) });
                                    }}
                                    className={`p-1 rounded-md transition-all ${isDark ? "text-neutral-600 hover:text-amber-300" : "text-neutral-400 hover:text-amber-600"}`}
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
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex gap-3 animate-in slide-in-from-bottom-2">
                      <ConciergeAvatar
                        name={conciergeName}
                        accentColor={branding.accentColor}
                        size="sm"
                        isDark={isDark}
                        className="mt-0.5"
                      />
                      <div
                        className={`px-4 py-3 rounded-2xl rounded-tl-md border text-[14px] ${
                          isDark ? "glass border-white/10 text-neutral-300" : "bg-white border-neutral-200 text-neutral-600 shadow-sm"
                        }`}
                        style={{ borderColor: "rgba(var(--hotel-accent-rgb), 0.28)" }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "120ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "240ms" }} />
                          <span className="ml-1 text-[13px]">{VOICE_STATUS.thinking}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {messages.length > 0 && inputMode === "text" ? (
              <QuickActionsBar
                isDark={isDark}
                disabled={isProcessing || isListening || isSpeaking || aiReady === false}
                onAction={(message) => void handleUserMessage(message, false)}
              />
            ) : null}

            {renderChatComposer()}
          </div>
        </main>

        {/* ── Voice control sidebar (desktop) ── */}
        <aside className="hidden w-[340px] shrink-0 flex-col gap-4 border-l border-iron-border px-4 py-6 sm:px-6 lg:flex">
          <div className={`flex flex-col items-center gap-4 rounded-[5.6px] p-5 ${panelShell}`}>
            <div className="flex w-full items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-mute">
                {conciergeName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setUseServerSTT((v) => {
                    const next = !v;
                    useServerSTTRef.current = next;
                    window.localStorage.setItem(STT_MODE_STORAGE_KEY, next ? "whisper" : "native");
                    return next;
                  });
                }}
                className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                  isDark ? "bg-white/[0.06] hover:bg-white/10 text-neutral-400" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                }`}
                title={useServerSTT ? "Whisper STT (open-source, slower)" : "Native speech (faster)"}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${useServerSTT ? "bg-cyan-400" : "bg-emerald-500"}`} />
                {useServerSTT ? "Whisper" : "Native"}
              </button>
            </div>

            {mounted ? renderVoiceOrb(false) : (
              <div className={`w-36 h-36 rounded-full glass-circle border ${isDark ? "border-white/[0.08]" : "border-neutral-200"}`} />
            )}

            <div className="text-center">
              <p
                className={`text-xs font-bold uppercase tracking-[0.25em] ${isListening ? "" : isSpeaking ? "text-sky-400" : isDark ? "text-neutral-400" : "text-neutral-600"}`}
                style={isListening ? { color: "rgb(var(--hotel-accent-bright-rgb))" } : undefined}
              >
                {voiceStatusLabel}
              </p>
              <p className={`mt-1 text-[11px] ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>
                {inConversation ? "Tap orb to stop" : ui.tapToSpeak}
              </p>
            </div>

            {errorMessage && aiReady !== false && (
              <div role="alert" className="w-full rounded-xl px-3 py-2 text-center text-[11px] font-medium text-amber-200/90 bg-amber-950/40 border border-amber-500/20">
                {errorMessage}
              </div>
            )}
          </div>

          {guestProfile ? (
            <MyStayPanel
              guest={guestProfile}
              isDark={isDark}
              onAskAboutBooking={(booking) => {
                void handleUserMessage(
                  `I have a question about my booking #${booking.id.slice(0, 8)} for ${booking.roomType}, ${booking.checkIn} to ${booking.checkOut}.`,
                  inputModeRef.current === "voice"
                );
              }}
            />
          ) : null}

          <button
            onClick={async () => {
              try {
                await navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                  stream.getTracks().forEach((track) => track.stop());
                });
              } catch { /* overlay handles fallback */ }
              setInCall(true);
            }}
            className={`w-full group flex items-center gap-3 rounded-[1.25rem] border px-4 py-3.5 transition-all active:scale-[0.98] ${
              isDark ? "border-emerald-500/25 bg-emerald-500/[0.06] hover:bg-emerald-500/10" : "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50"
            }`}
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className={`text-sm font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>Concierge call</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">Telephony mode</p>
            </div>
          </button>

          <div className={`overflow-hidden rounded-[5.6px] ${panelShell}`}>
            <button
              type="button"
              onClick={() => setShowCallHistory((v) => !v)}
              className={`w-full flex items-center justify-between px-4 py-3.5 ${isDark ? "hover:bg-white/[0.03]" : "hover:bg-neutral-50"}`}
            >
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" style={{ color: "rgb(var(--hotel-accent-rgb))" }} />
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
                  Call history
                </span>
                {callHistory.length > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isDark ? "bg-white/10 text-neutral-400" : "bg-neutral-200 text-neutral-600"}`}>
                    {callHistory.length}
                  </span>
                )}
              </div>
              {showCallHistory ? <ChevronUp className="h-4 w-4 opacity-50" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
            </button>

            {showCallHistory && (
              <div className={`px-4 pb-4 border-t ${isDark ? "border-white/10" : "border-neutral-200/80"}`}>
                {callHistory.length === 0 ? (
                  <p className={`pt-3 text-xs ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>No calls yet.</p>
                ) : (
                  <>
                    <div className="pt-3 space-y-2 max-h-48 overflow-y-auto scrollbar-premium">
                      {callHistory.slice(0, 5).map((item) => (
                        <div key={item.id} className={`rounded-xl border p-2.5 ${isDark ? "border-white/10 bg-white/[0.02]" : "border-neutral-200 bg-white"}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-[9px] font-bold uppercase ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                              {formatCallTime(item.startedAt)}
                            </span>
                            <span className={`text-[9px] font-bold ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                              {formatCallDuration(item.durationSec)}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-snug line-clamp-2 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                            {item.transcriptPreview}
                          </p>
                        </div>
                      ))}
                    </div>
                    {callHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={() => persistCallHistory([])}
                        className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-500 hover:text-neutral-700"}`}
                      >
                        Clear all
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <ServiceHealthBar isDark={isDark} className="justify-center" />

          <p className={`text-[10px] font-semibold text-center uppercase tracking-[0.14em] leading-relaxed px-2 ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>
            {branding.tagline}
          </p>
        </aside>
      </div>

      {/* ── Mobile voice dock (voice mode only) ── */}
      {inputMode === "voice" && (
      <div
        className={`lg:hidden fixed bottom-0 inset-x-0 z-20 border-t backdrop-blur-xl ${
          isDark ? "border-white/10 bg-[#05070d]/90" : "border-neutral-200 bg-white/95"
        }`}
      >
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-4">
          {mounted ? renderVoiceOrb(true) : (
            <div className={`w-28 h-28 rounded-full glass-circle border shrink-0 ${isDark ? "border-white/[0.08]" : "border-neutral-200"}`} />
          )}

          <div className="flex-1 min-w-0">
            <p
              className={`text-[11px] font-bold uppercase tracking-[0.2em] truncate ${isListening ? "" : isDark ? "text-neutral-300" : "text-neutral-700"}`}
              style={isListening ? { color: "rgb(var(--hotel-accent-bright-rgb))" } : undefined}
            >
              {voiceStatusLabel}
            </p>
            {errorMessage && aiReady !== false ? (
              <p role="alert" className="mt-0.5 text-[10px] text-amber-400 line-clamp-2">{errorMessage}</p>
            ) : (
              <p className={`mt-0.5 text-[10px] ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>
                {inConversation ? "Tap to stop" : ui.tapToSpeak}
              </p>
            )}
          </div>

          <button
            onClick={async () => {
              try {
                await navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                  stream.getTracks().forEach((track) => track.stop());
                });
              } catch { /* overlay handles fallback */ }
              setInCall(true);
            }}
            className={`shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
              isDark ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
            }`}
            aria-label="Start concierge call"
          >
            <PhoneCall className="w-5 h-5" />
          </button>
        </div>
      </div>
      )}

      <footer
        className={`hidden lg:block text-center py-4 text-[10px] font-semibold tracking-[0.16em] uppercase shrink-0 ${
          isDark ? "text-neutral-600 border-t border-white/[0.04]" : "text-neutral-500 border-t border-neutral-200"
        }`}
      >
        {branding.hotelName} · {selectedLanguage.flag} {selectedLanguage.nativeName}
      </footer>

      {renderLanguageMenu()}

      {inCall && (
        <CallOverlay
          hotelName={branding.hotelName}
          accentColor={branding.accentColor}
          languageCode={selectedLanguage.code}
          ttsLang={selectedLanguage.ttsLang}
          voiceStyle={voiceStyle}
          aiReady={aiReady !== false}
          geminiLiveReady={geminiLiveReady === true}
          onEnd={handleCallEnd}

        />
      )}
    </div>
  );
}
