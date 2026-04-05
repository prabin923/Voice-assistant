"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Mic, Volume2, Loader2, Phone, PhoneCall, Settings, Globe, ChevronDown } from "lucide-react";
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

// UI string translations — keyed by primary language code
const UI_TRANSLATIONS: Record<string, UIStrings> = {
  en: { tapToSpeak: "Tap to Speak", listening: "Listening...", speaking: "Speaking...", ready: "Ready", configure: "Configure", searchLanguage: "Search language...", welcomeHint: "Tap the microphone and ask me anything.", speakingIn: "Speaking in", footer: "Universal Voice Receptionist", you: "You", errorNetwork: "Network error: Speech recognition requires an internet connection.", errorMicDenied: "Microphone access denied. Please allow microphone permissions.", errorNoSpeech: "No speech detected. Please tap the microphone and speak clearly.", errorGeneric: "Speech recognition error", errorUnsupported: "Speech recognition is not supported in this browser. Please use Chrome or Edge.", errorConnection: "I'm sorry, I'm having trouble connecting right now.", virtualReceptionist: "Virtual Receptionist", poweredByAI: "Powered by AI", languagesSupported: "Languages Supported" },
  es: { tapToSpeak: "Toca para hablar", listening: "Escuchando...", speaking: "Hablando...", ready: "Listo", configure: "Configurar", searchLanguage: "Buscar idioma...", welcomeHint: "Toca el micrófono y pregúntame lo que necesites.", speakingIn: "Hablando en", footer: "Recepcionista Virtual Universal", you: "Tú", errorNetwork: "Error de red: El reconocimiento de voz requiere conexión a internet.", errorMicDenied: "Acceso al micrófono denegado. Permite los permisos del micrófono.", errorNoSpeech: "No se detectó voz. Toca el micrófono y habla claramente.", errorGeneric: "Error de reconocimiento de voz", errorUnsupported: "El reconocimiento de voz no está soportado en este navegador. Use Chrome o Edge.", errorConnection: "Lo siento, tengo problemas de conexión en este momento.", virtualReceptionist: "Recepcionista Virtual", poweredByAI: "Impulsado por IA", languagesSupported: "Idiomas soportados" },
  fr: { tapToSpeak: "Appuyez pour parler", listening: "Écoute en cours...", speaking: "En cours de parole...", ready: "Prêt", configure: "Configurer", searchLanguage: "Rechercher une langue...", welcomeHint: "Appuyez sur le microphone et posez-moi une question.", speakingIn: "Parlant en", footer: "Réceptionniste Virtuel Universel", you: "Vous", errorNetwork: "Erreur réseau : La reconnaissance vocale nécessite une connexion internet.", errorMicDenied: "Accès au microphone refusé. Veuillez autoriser les permissions du microphone.", errorNoSpeech: "Aucune parole détectée. Appuyez sur le microphone et parlez clairement.", errorGeneric: "Erreur de reconnaissance vocale", errorUnsupported: "La reconnaissance vocale n'est pas supportée dans ce navigateur. Utilisez Chrome ou Edge.", errorConnection: "Désolé, j'ai des difficultés de connexion en ce moment.", virtualReceptionist: "Réceptionniste Virtuel", poweredByAI: "Propulsé par l'IA", languagesSupported: "Langues prises en charge" },
  de: { tapToSpeak: "Tippen zum Sprechen", listening: "Zuhören...", speaking: "Sprechen...", ready: "Bereit", configure: "Konfigurieren", searchLanguage: "Sprache suchen...", welcomeHint: "Tippen Sie auf das Mikrofon und fragen Sie mich.", speakingIn: "Spricht in", footer: "Universeller Virtueller Rezeptionist", you: "Sie", errorNetwork: "Netzwerkfehler: Die Spracherkennung benötigt eine Internetverbindung.", errorMicDenied: "Mikrofonzugriff verweigert. Bitte erlauben Sie die Mikrofonberechtigungen.", errorNoSpeech: "Keine Sprache erkannt. Tippen Sie auf das Mikrofon und sprechen Sie deutlich.", errorGeneric: "Spracherkennungsfehler", errorUnsupported: "Die Spracherkennung wird in diesem Browser nicht unterstützt. Verwenden Sie Chrome oder Edge.", errorConnection: "Entschuldigung, ich habe gerade Verbindungsprobleme.", virtualReceptionist: "Virtueller Rezeptionist", poweredByAI: "KI-gestützt", languagesSupported: "Unterstützte Sprachen" },
  ja: { tapToSpeak: "タップして話す", listening: "聞いています...", speaking: "話しています...", ready: "準備完了", configure: "設定", searchLanguage: "言語を検索...", welcomeHint: "マイクをタップして何でもお聞きください。", speakingIn: "使用言語", footer: "ユニバーサル・バーチャル・レセプショニスト", you: "あなた", errorNetwork: "ネットワークエラー：音声認識にはインターネット接続が必要です。", errorMicDenied: "マイクへのアクセスが拒否されました。", errorNoSpeech: "音声が検出されませんでした。マイクをタップしてはっきりと話してください。", errorGeneric: "音声認識エラー", errorUnsupported: "このブラウザでは音声認識がサポートされていません。ChromeまたはEdgeをご使用ください。", errorConnection: "申し訳ございません、現在接続に問題があります。", virtualReceptionist: "バーチャル受付", poweredByAI: "AI搭載", languagesSupported: "対応言語" },
  zh: { tapToSpeak: "点击说话", listening: "正在聆听...", speaking: "正在播放...", ready: "就绪", configure: "配置", searchLanguage: "搜索语言...", welcomeHint: "点击麦克风，随时向我提问。", speakingIn: "当前语言", footer: "通用虚拟接待员", you: "您", errorNetwork: "网络错误：语音识别需要互联网连接。", errorMicDenied: "麦克风访问被拒绝。请允许麦克风权限。", errorNoSpeech: "未检测到语音。请点击麦克风并清晰说话。", errorGeneric: "语音识别错误", errorUnsupported: "此浏览器不支持语音识别。请使用Chrome或Edge。", errorConnection: "抱歉，目前连接出现问题。", virtualReceptionist: "虚拟接待员", poweredByAI: "AI驱动", languagesSupported: "支持的语言" },
  ko: { tapToSpeak: "탭하여 말하기", listening: "듣고 있습니다...", speaking: "말하고 있습니다...", ready: "준비됨", configure: "설정", searchLanguage: "언어 검색...", welcomeHint: "마이크를 탭하고 무엇이든 물어보세요.", speakingIn: "사용 언어", footer: "유니버설 가상 안내원", you: "나", errorNetwork: "네트워크 오류: 음성 인식에는 인터넷 연결이 필요합니다.", errorMicDenied: "마이크 접근이 거부되었습니다.", errorNoSpeech: "음성이 감지되지 않았습니다.", errorGeneric: "음성 인식 오류", errorUnsupported: "이 브라우저에서는 음성 인식이 지원되지 않습니다.", errorConnection: "죄송합니다, 현재 연결에 문제가 있습니다.", virtualReceptionist: "가상 안내원", poweredByAI: "AI 기반", languagesSupported: "지원 언어" },
  hi: { tapToSpeak: "बोलने के लिए टैप करें", listening: "सुन रहा हूँ...", speaking: "बोल रहा हूँ...", ready: "तैयार", configure: "सेटिंग्स", searchLanguage: "भाषा खोजें...", welcomeHint: "माइक्रोफ़ोन पर टैप करें और कुछ भी पूछें।", speakingIn: "भाषा", footer: "यूनिवर्सल वर्चुअल रिसेप्शनिस्ट", you: "आप", errorNetwork: "नेटवर्क त्रुटि: वाक् पहचान के लिए इंटरनेट आवश्यक है।", errorMicDenied: "माइक्रोफ़ोन एक्सेस अस्वीकृत।", errorNoSpeech: "कोई आवाज़ नहीं मिली।", errorGeneric: "वाक् पहचान त्रुटि", errorUnsupported: "इस ब्राउज़र में वाक् पहचान समर्थित नहीं है।", errorConnection: "क्षमा करें, अभी कनेक्शन में समस्या है।", virtualReceptionist: "वर्चुअल रिसेप्शनिस्ट", poweredByAI: "AI संचालित", languagesSupported: "समर्थित भाषाएँ" },
  ne: { tapToSpeak: "बोल्नको लागि ट्याप गर्नुहोस्", listening: "सुनिरहेको छ...", speaking: "बोलिरहेको छ...", ready: "तयार", configure: "सेटिङ", searchLanguage: "भाषा खोज्नुहोस्...", welcomeHint: "माइक्रोफोनमा ट्याप गर्नुहोस् र जे पनि सोध्नुहोस्।", speakingIn: "भाषा", footer: "युनिभर्सल भर्चुअल रिसेप्सनिस्ट", you: "तपाईं", errorNetwork: "नेटवर्क त्रुटि: भाषण पहिचानका लागि इन्टरनेट आवश्यक छ।", errorMicDenied: "माइक्रोफोन पहुँच अस्वीकार।", errorNoSpeech: "कुनै आवाज फेला परेन।", errorGeneric: "भाषण पहिचान त्रुटि", errorUnsupported: "यो ब्राउजरमा भाषण पहिचान समर्थित छैन।", errorConnection: "माफ गर्नुहोस्, अहिले जडान समस्या छ।", virtualReceptionist: "भर्चुअल रिसेप्सनिस्ट", poweredByAI: "AI द्वारा संचालित", languagesSupported: "समर्थित भाषाहरू" },
  ar: { tapToSpeak: "انقر للتحدث", listening: "جارٍ الاستماع...", speaking: "جارٍ التحدث...", ready: "جاهز", configure: "إعدادات", searchLanguage: "ابحث عن لغة...", welcomeHint: "انقر على الميكروفون واسألني أي شيء.", speakingIn: "اللغة الحالية", footer: "موظف استقبال افتراضي عالمي", you: "أنت", errorNetwork: "خطأ في الشبكة: التعرف على الكلام يتطلب اتصالاً بالإنترنت.", errorMicDenied: "تم رفض الوصول إلى الميكروفون.", errorNoSpeech: "لم يتم اكتشاف أي كلام.", errorGeneric: "خطأ في التعرف على الكلام", errorUnsupported: "التعرف على الكلام غير مدعوم في هذا المتصفح.", errorConnection: "عذراً، أواجه مشكلة في الاتصال حالياً.", virtualReceptionist: "موظف استقبال افتراضي", poweredByAI: "بدعم الذكاء الاصطناعي", languagesSupported: "اللغات المدعومة" },
  pt: { tapToSpeak: "Toque para falar", listening: "Ouvindo...", speaking: "Falando...", ready: "Pronto", configure: "Configurar", searchLanguage: "Pesquisar idioma...", welcomeHint: "Toque no microfone e pergunte o que quiser.", speakingIn: "Falando em", footer: "Recepcionista Virtual Universal", you: "Você", errorNetwork: "Erro de rede: reconhecimento de voz requer internet.", errorMicDenied: "Acesso ao microfone negado.", errorNoSpeech: "Nenhuma fala detectada.", errorGeneric: "Erro de reconhecimento de voz", errorUnsupported: "Reconhecimento de voz não suportado neste navegador.", errorConnection: "Desculpe, problemas de conexão.", virtualReceptionist: "Recepcionista Virtual", poweredByAI: "Impulsionado por IA", languagesSupported: "Idiomas suportados" },
  ru: { tapToSpeak: "Нажмите, чтобы говорить", listening: "Слушаю...", speaking: "Говорю...", ready: "Готов", configure: "Настройки", searchLanguage: "Поиск языка...", welcomeHint: "Нажмите на микрофон и задайте любой вопрос.", speakingIn: "Язык", footer: "Универсальный виртуальный портье", you: "Вы", errorNetwork: "Ошибка сети: для распознавания речи требуется интернет.", errorMicDenied: "Доступ к микрофону запрещён.", errorNoSpeech: "Речь не обнаружена.", errorGeneric: "Ошибка распознавания речи", errorUnsupported: "Распознавание речи не поддерживается.", errorConnection: "Извините, проблемы с подключением.", virtualReceptionist: "Виртуальный портье", poweredByAI: "На базе ИИ", languagesSupported: "Поддерживаемые языки" },
  it: { tapToSpeak: "Tocca per parlare", listening: "Ascolto...", speaking: "Parlando...", ready: "Pronto", configure: "Configura", searchLanguage: "Cerca lingua...", welcomeHint: "Tocca il microfono e chiedimi qualsiasi cosa.", speakingIn: "Lingua attiva", footer: "Receptionist Virtuale Universale", you: "Tu", errorNetwork: "Errore di rete: riconoscimento vocale richiede internet.", errorMicDenied: "Accesso al microfono negato.", errorNoSpeech: "Nessun discorso rilevato.", errorGeneric: "Errore riconoscimento vocale", errorUnsupported: "Riconoscimento vocale non supportato.", errorConnection: "Problemi di connessione.", virtualReceptionist: "Receptionist Virtuale", poweredByAI: "Con IA", languagesSupported: "Lingue supportate" },
  tr: { tapToSpeak: "Konuşmak için dokunun", listening: "Dinliyor...", speaking: "Konuşuyor...", ready: "Hazır", configure: "Ayarlar", searchLanguage: "Dil ara...", welcomeHint: "Mikrofona dokunun ve istediğinizi sorun.", speakingIn: "Konuşma dili", footer: "Evrensel Sanal Resepsiyonist", you: "Siz", errorNetwork: "Ağ hatası: internet bağlantısı gerekiyor.", errorMicDenied: "Mikrofon erişimi reddedildi.", errorNoSpeech: "Konuşma algılanmadı.", errorGeneric: "Konuşma tanıma hatası", errorUnsupported: "Bu tarayıcıda konuşma tanıma desteklenmiyor.", errorConnection: "Bağlantı sorunları yaşıyorum.", virtualReceptionist: "Sanal Resepsiyonist", poweredByAI: "Yapay Zeka ile", languagesSupported: "Desteklenen diller" },
};

function getUI(langCode: string): UIStrings {
  const primary = langCode.split("-")[0];
  return UI_TRANSLATIONS[primary] || UI_TRANSLATIONS["en"];
}

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
  const [inCall, setInCall] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig>({
    hotelName: "Voice Receptionist",
    tagline: "AI-Powered Hotel Assistant",
    accentColor: "#f43f5e",
    welcomeMessage: "Welcome! How may I assist you today?",
  });

  // Derive current UI strings from selected language
  const ui = useMemo(() => getUI(selectedLanguage.code), [selectedLanguage]);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [useServerSTT, setUseServerSTT] = useState(false);

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => { window.speechSynthesis.getVoices(); };
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
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
      const currentUI = getUI(selectedLanguage.code);
      setMessages((prev) => [...prev, { role: "assistant", content: currentUI.errorConnection }]);
      speakText(currentUI.errorConnection);
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

  // Server-side STT logic using MediaRecorder
  const startServerRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsProcessing(true);
        
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('language', selectedLanguage.code);

        try {
          const res = await fetch('/api/stt', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.text) {
            handleUserAudioComplete(data.text);
          } else {
            console.error("STT Failed:", data.error);
            setErrorMessage(ui.errorNoSpeech);
          }
        } catch (err) {
          setErrorMessage(ui.errorConnection);
        } finally {
          setIsProcessing(false);
          // Stop all tracks to release mic
          stream.getTracks().forEach(t => t.stop());
        }
      };

      recorder.start();
      setIsListening(true);
      setTranscript("");
    } catch (err) {
      setErrorMessage(ui.errorMicDenied);
    }
  };

  const stopServerRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (useServerSTT) {
        stopServerRecording();
      } else if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
        setIsListening(false);
      }
    } else {
      synthRef.current?.cancel();
      setIsSpeaking(false);
      setErrorMessage(null);

      // If we already know the browser is broken, use server STT directly
      if (useServerSTT) {
        startServerRecording();
        return;
      }

      const performStart = async (retryCount = 0) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
        } catch (e) {
          setErrorMessage(ui.errorMicDenied);
          setIsListening(false);
          return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setUseServerSTT(true);
          startServerRecording();
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = retryCount > 0 ? "en-US" : selectedLanguage.code;

        let hasEnded = false;

        recognition.onstart = () => {
          setIsListening(true);
          setTranscript("");
        };

        recognition.onresult = (event: any) => {
          let final = "";
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript;
            else interim += event.results[i][0].transcript;
          }
          setTranscript(final || interim);
          if (final && !hasEnded) {
            hasEnded = true;
            try { recognition.stop(); } catch(e) {}
            handleUserAudioComplete(final);
          }
        };

        recognition.onerror = (event: any) => {
          const err = event.error;
          console.error("Native STT Error:", err);
          
          if (err === "network") {
            // Auto-switch to Server STT on network error
            console.log("Switching to Server-Side STT...");
            setUseServerSTT(true);
            setIsListening(false);
            setTimeout(() => startServerRecording(), 100);
          } else {
            setErrorMessage(`${ui.errorGeneric}: ${err}`);
            setIsListening(false);
          }
        };

        setTimeout(() => {
          try {
            recognition.start();
            recognitionRef.current = recognition;
          } catch (e) { setIsListening(false); }
        }, 150);
      };

      performStart(0);
    }
  };

  const changeLanguage = (lang: LanguageOption) => {
    setSelectedLanguage(lang);
    setShowLanguageMenu(false);
    setLanguageSearch("");

    if (recognitionRef.current) {
      recognitionRef.current.lang = lang.code;
    }
  };

  const filteredLanguages = ALL_LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(languageSearch.toLowerCase()) ||
    l.code.toLowerCase().includes(languageSearch.toLowerCase())
  );

  // RTL direction for Arabic/Hebrew
  const isRTL = ["ar", "he"].includes(selectedLanguage.code.split("-")[0]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-rose-500/30" dir={isRTL ? "rtl" : "ltr"}>
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
              <div className="absolute right-0 mt-2 w-72 max-h-80 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden z-30 animate-in" dir="ltr">
                <div className="p-3 border-b border-neutral-800">
                  <input
                    type="text"
                    placeholder={ui.searchLanguage}
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
                    autoFocus
                  />
                </div>
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
              {isListening ? ui.listening : isSpeaking ? ui.speaking : ui.ready}
            </span>
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">{ui.configure}</span>
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
                <span className="text-xs text-neutral-400 font-medium">{ui.tapToSpeak}</span>
              </div>
            )}
          </button>
        </div>

        {/* Call Receptionist Button */}
        <button
          onClick={() => setInCall(true)}
          disabled={!isSupported}
          className="group flex items-center gap-3 px-6 py-3 rounded-2xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 hover:border-green-500/50 text-green-400 hover:text-green-300 transition-all duration-300 mb-4"
        >
          <PhoneCall className="w-5 h-5 group-hover:animate-ring" />
          <span className="text-sm font-medium">Call Receptionist</span>
        </button>

        {/* Conversation View */}
        <div className="w-full space-y-5 max-h-[45vh] overflow-y-auto px-2 sm:px-4 z-10 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
          {messages.length === 0 ? (
            <div className="text-center text-neutral-500 py-8">
              <p className="text-lg mb-1">{branding.welcomeMessage}</p>
              <p className="text-sm">{ui.welcomeHint}</p>
              <p className="text-xs mt-2 text-neutral-600">
                {selectedLanguage.flag} {ui.speakingIn} {selectedLanguage.nativeName}
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
                    <span className="text-xs">{ui.you}</span>
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
        {ui.footer} • {ui.poweredByAI} • {ALL_LANGUAGES.length} {ui.languagesSupported}
      </footer>

      {/* Phone Call Overlay */}
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
