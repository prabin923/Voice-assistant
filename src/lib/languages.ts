// ============================================================
// MULTI-LANGUAGE SUPPORT
// ============================================================
// Defines all supported languages, BCP-47 locale codes, and
// translated response templates for the universal receptionist.
// ============================================================

export interface LanguageDefinition {
  code: string;            // BCP-47 code for SpeechRecognition
  name: string;            // English name
  nativeName: string;      // Name in the native script
  flag: string;            // Emoji flag
  ttsLang: string;         // BCP-47 for TTS voice matching
}

// Comprehensive list of supported languages
export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
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

// ============================================================
// INTENT KEYWORDS — per language
// We store keywords for major languages; others fall back to English
// ============================================================

export type IntentKey =
  | "greeting" | "booking" | "room_info" | "pricing" | "checkin"
  | "checkout" | "dining" | "amenities" | "policies" | "contact"
  | "shuttle" | "laundry" | "thanks" | "complaint" | "human_agent"
  | "farewell";

// Primary language code (first 2 chars) → intent → keywords
const MULTILANG_KEYWORDS: Record<string, Record<IntentKey, string[]>> = {
  en: {
    greeting:    ["hello", "hi", "hey", "good morning", "good evening", "good afternoon", "greetings"],
    booking:     ["book", "reserve", "reservation", "availability", "available", "stay", "night"],
    room_info:   ["room", "suite", "deluxe", "standard", "accommodation", "bed"],
    pricing:     ["price", "cost", "rate", "how much", "tariff", "charges", "fee", "expensive", "cheap"],
    checkin:     ["check-in", "checkin", "check in", "arrive", "arrival", "early check"],
    checkout:    ["check-out", "checkout", "check out", "leave", "departure", "late check"],
    dining:      ["breakfast", "lunch", "dinner", "food", "restaurant", "dining", "menu", "eat", "meal", "café", "bar"],
    amenities:   ["pool", "gym", "fitness", "spa", "wifi", "wi-fi", "internet", "parking", "amenities", "facilities"],
    policies:    ["policy", "cancel", "cancellation", "pet", "smoke", "smoking", "child", "children", "extra bed", "crib"],
    contact:     ["address", "location", "where", "phone", "call", "email", "contact", "directions"],
    shuttle:     ["shuttle", "airport", "transport", "transfer", "taxi", "cab", "pickup"],
    laundry:     ["laundry", "dry clean", "iron", "washing"],
    thanks:      ["thank", "thanks", "appreciate", "grateful"],
    complaint:   ["complaint", "complain", "issue", "problem", "not working", "broken", "dirty", "noisy"],
    human_agent: ["human", "operator", "manager", "reception", "front desk", "real person", "agent"],
    farewell:    ["bye", "goodbye", "see you", "good night", "farewell"],
  },
  es: {
    greeting:    ["hola", "buenos días", "buenas tardes", "buenas noches", "saludos"],
    booking:     ["reservar", "reserva", "reservación", "disponibilidad", "disponible", "noche"],
    room_info:   ["habitación", "suite", "cuarto", "cama", "alojamiento"],
    pricing:     ["precio", "costo", "tarifa", "cuánto", "caro", "barato"],
    checkin:     ["check-in", "registro", "llegar", "llegada", "entrada"],
    checkout:    ["check-out", "salida", "dejar"],
    dining:      ["desayuno", "almuerzo", "cena", "comida", "restaurante", "menú", "comer"],
    amenities:   ["piscina", "gimnasio", "spa", "wifi", "estacionamiento", "servicios"],
    policies:    ["política", "cancelar", "cancelación", "mascota", "fumar", "niños", "cama extra"],
    contact:     ["dirección", "ubicación", "dónde", "teléfono", "llamar", "correo", "contacto"],
    shuttle:     ["transporte", "aeropuerto", "taxi", "traslado"],
    laundry:     ["lavandería", "lavar", "planchar"],
    thanks:      ["gracias", "agradezco"],
    complaint:   ["queja", "problema", "no funciona", "roto", "sucio", "ruidoso"],
    human_agent: ["humano", "operador", "gerente", "recepción", "persona real", "agente"],
    farewell:    ["adiós", "hasta luego", "buenas noches", "chao"],
  },
  fr: {
    greeting:    ["bonjour", "salut", "bonsoir", "bonne journée"],
    booking:     ["réserver", "réservation", "disponibilité", "disponible", "nuit"],
    room_info:   ["chambre", "suite", "lit", "hébergement"],
    pricing:     ["prix", "coût", "tarif", "combien", "cher"],
    checkin:     ["enregistrement", "arrivée", "check-in"],
    checkout:    ["départ", "check-out", "quitter"],
    dining:      ["petit-déjeuner", "déjeuner", "dîner", "nourriture", "restaurant", "menu", "manger"],
    amenities:   ["piscine", "salle de sport", "spa", "wifi", "parking", "équipements"],
    policies:    ["politique", "annuler", "annulation", "animal", "fumer", "enfant", "lit supplémentaire"],
    contact:     ["adresse", "emplacement", "où", "téléphone", "appeler", "email", "contact"],
    shuttle:     ["navette", "aéroport", "transport", "taxi"],
    laundry:     ["blanchisserie", "laver", "repasser"],
    thanks:      ["merci", "je vous remercie"],
    complaint:   ["plainte", "problème", "ne fonctionne pas", "cassé", "sale", "bruyant"],
    human_agent: ["humain", "opérateur", "directeur", "réception", "personne réelle", "agent"],
    farewell:    ["au revoir", "bonne nuit", "à bientôt", "adieu"],
  },
  de: {
    greeting:    ["hallo", "guten morgen", "guten tag", "guten abend"],
    booking:     ["buchen", "reservieren", "reservierung", "verfügbarkeit", "nacht"],
    room_info:   ["zimmer", "suite", "bett", "unterkunft"],
    pricing:     ["preis", "kosten", "tarif", "wie viel", "teuer", "günstig"],
    checkin:     ["einchecken", "check-in", "ankunft", "anreise"],
    checkout:    ["auschecken", "check-out", "abreise", "verlassen"],
    dining:      ["frühstück", "mittagessen", "abendessen", "essen", "restaurant", "menü"],
    amenities:   ["pool", "fitnessstudio", "spa", "wlan", "wifi", "parkplatz", "einrichtungen"],
    policies:    ["richtlinie", "stornieren", "stornierung", "haustier", "rauchen", "kinder", "zusatzbett"],
    contact:     ["adresse", "standort", "wo", "telefon", "anrufen", "email", "kontakt"],
    shuttle:     ["shuttle", "flughafen", "transport", "taxi", "transfer"],
    laundry:     ["wäscherei", "waschen", "bügeln"],
    thanks:      ["danke", "vielen dank", "dankeschön"],
    complaint:   ["beschwerde", "problem", "funktioniert nicht", "kaputt", "schmutzig", "laut"],
    human_agent: ["mensch", "mitarbeiter", "manager", "rezeption", "agent"],
    farewell:    ["tschüss", "auf wiedersehen", "gute nacht"],
  },
  ja: {
    greeting:    ["こんにちは", "おはよう", "こんばんは", "はじめまして"],
    booking:     ["予約", "空室", "泊まる", "泊"],
    room_info:   ["部屋", "スイート", "ベッド", "客室"],
    pricing:     ["料金", "値段", "価格", "いくら"],
    checkin:     ["チェックイン", "到着"],
    checkout:    ["チェックアウト", "出発"],
    dining:      ["朝食", "昼食", "夕食", "食事", "レストラン", "メニュー"],
    amenities:   ["プール", "ジム", "スパ", "Wi-Fi", "駐車場", "設備"],
    policies:    ["ポリシー", "キャンセル", "ペット", "喫煙", "子供"],
    contact:     ["住所", "場所", "電話", "メール", "連絡"],
    shuttle:     ["シャトル", "空港", "送迎", "タクシー"],
    laundry:     ["ランドリー", "洗濯", "アイロン"],
    thanks:      ["ありがとう", "感謝"],
    complaint:   ["苦情", "問題", "壊れ", "汚い", "うるさい"],
    human_agent: ["スタッフ", "マネージャー", "フロント", "人間"],
    farewell:    ["さようなら", "おやすみ", "またね"],
  },
  zh: {
    greeting:    ["你好", "早上好", "下午好", "晚上好"],
    booking:     ["预订", "预约", "订房", "入住"],
    room_info:   ["房间", "套房", "床", "客房"],
    pricing:     ["价格", "费用", "多少钱", "贵"],
    checkin:     ["入住", "登记", "到达"],
    checkout:    ["退房", "离开"],
    dining:      ["早餐", "午餐", "晚餐", "餐厅", "菜单", "吃"],
    amenities:   ["游泳池", "健身房", "水疗", "WiFi", "停车", "设施"],
    policies:    ["政策", "取消", "宠物", "吸烟", "儿童"],
    contact:     ["地址", "位置", "电话", "邮件", "联系"],
    shuttle:     ["班车", "机场", "接送", "出租车"],
    laundry:     ["洗衣", "熨烫"],
    thanks:      ["谢谢", "感谢"],
    complaint:   ["投诉", "问题", "坏了", "脏", "吵"],
    human_agent: ["人工", "经理", "前台", "工作人员"],
    farewell:    ["再见", "晚安", "拜拜"],
  },
  hi: {
    greeting:    ["नमस्ते", "नमस्कार", "प्रणाम"],
    booking:     ["बुक", "आरक्षण", "कमरा बुक", "रिज़र्व"],
    room_info:   ["कमरा", "रूम", "सुइट", "बेड"],
    pricing:     ["कीमत", "दाम", "कितना", "महंगा", "सस्ता"],
    checkin:     ["चेक-इन", "आगमन"],
    checkout:    ["चेक-आउट", "प्रस्थान"],
    dining:      ["नाश्ता", "दोपहर का खाना", "रात का खाना", "खाना", "रेस्तरां", "मेनू"],
    amenities:   ["स्विमिंग पूल", "जिम", "स्पा", "वाईफाई", "पार्किंग", "सुविधाएं"],
    policies:    ["नीति", "रद्द", "पालतू", "धूम्रपान", "बच्चे"],
    contact:     ["पता", "स्थान", "फोन", "ईमेल", "संपर्क"],
    shuttle:     ["शटल", "हवाई अड्डा", "टैक्सी"],
    laundry:     ["लॉन्ड्री", "धुलाई", "इस्त्री"],
    thanks:      ["धन्यवाद", "शुक्रिया"],
    complaint:   ["शिकायत", "समस्या", "टूटा", "गंदा", "शोर"],
    human_agent: ["इंसान", "मैनेजर", "रिसेप्शन", "कर्मचारी"],
    farewell:    ["अलविदा", "शुभ रात्रि", "फिर मिलेंगे"],
  },
  ne: {
    greeting:    ["नमस्कार", "नमस्ते"],
    booking:     ["बुक", "आरक्षण", "कोठा"],
    room_info:   ["कोठा", "रुम", "सुइट", "बेड"],
    pricing:     ["मूल्य", "कति", "महँगो", "सस्तो"],
    checkin:     ["चेक-इन", "आगमन"],
    checkout:    ["चेक-आउट", "प्रस्थान"],
    dining:      ["खाजा", "खाना", "रेस्टुरेन्ट", "मेनु"],
    amenities:   ["पौडी पोखरी", "जिम", "स्पा", "वाइफाइ", "पार्किंग"],
    policies:    ["नीति", "रद्द", "पालतू", "धुम्रपान", "बच्चा"],
    contact:     ["ठेगाना", "स्थान", "फोन", "इमेल", "सम्पर्क"],
    shuttle:     ["शटल", "विमानस्थल", "ट्याक्सी"],
    laundry:     ["लन्ड्री", "धुलाई"],
    thanks:      ["धन्यवाद"],
    complaint:   ["गुनासो", "समस्या", "भाँचिएको", "फोहोर"],
    human_agent: ["मानिस", "म्यानेजर", "रिसेप्सन", "कर्मचारी"],
    farewell:    ["बिदा", "शुभरात्रि"],
  },
  ko: {
    greeting:    ["안녕하세요", "안녕"],
    booking:     ["예약", "방 예약", "숙박"],
    room_info:   ["방", "객실", "스위트", "침대"],
    pricing:     ["가격", "요금", "얼마"],
    checkin:     ["체크인", "도착"],
    checkout:    ["체크아웃", "출발"],
    dining:      ["아침식사", "점심", "저녁", "식당", "메뉴", "음식"],
    amenities:   ["수영장", "헬스장", "스파", "와이파이", "주차", "시설"],
    policies:    ["정책", "취소", "반려동물", "흡연", "아이"],
    contact:     ["주소", "위치", "전화", "이메일", "연락처"],
    shuttle:     ["셔틀", "공항", "택시"],
    laundry:     ["세탁", "다림질"],
    thanks:      ["감사합니다", "고맙습니다"],
    complaint:   ["불만", "문제", "고장", "더러운", "시끄러운"],
    human_agent: ["직원", "매니저", "프론트", "사람"],
    farewell:    ["안녕히", "또 만나요", "잘 가세요"],
  },
  ar: {
    greeting:    ["مرحبا", "السلام عليكم", "أهلا", "صباح الخير", "مساء الخير"],
    booking:     ["حجز", "حجر", "غرفة", "متاح"],
    room_info:   ["غرفة", "جناح", "سرير"],
    pricing:     ["سعر", "كم", "تكلفة", "غالي", "رخيص"],
    checkin:     ["تسجيل الدخول", "وصول"],
    checkout:    ["تسجيل الخروج", "مغادرة"],
    dining:      ["فطور", "غداء", "عشاء", "مطعم", "طعام", "أكل"],
    amenities:   ["مسبح", "صالة رياضة", "سبا", "واي فاي", "مواقف"],
    policies:    ["سياسة", "إلغاء", "حيوان", "تدخين", "أطفال"],
    contact:     ["عنوان", "موقع", "هاتف", "بريد", "اتصال"],
    shuttle:     ["نقل", "مطار", "تاكسي"],
    laundry:     ["غسيل", "كي"],
    thanks:      ["شكرا", "جزاك الله"],
    complaint:   ["شكوى", "مشكلة", "معطل", "وسخ", "ضوضاء"],
    human_agent: ["موظف", "مدير", "استقبال"],
    farewell:    ["مع السلامة", "تصبح على خير", "وداعا"],
  },
  pt: {
    greeting:    ["olá", "oi", "bom dia", "boa tarde", "boa noite"],
    booking:     ["reservar", "reserva", "disponível", "disponibilidade", "noite"],
    room_info:   ["quarto", "suíte", "cama", "acomodação"],
    pricing:     ["preço", "custo", "tarifa", "quanto", "caro", "barato"],
    checkin:     ["check-in", "chegada", "entrada"],
    checkout:    ["check-out", "saída", "partida"],
    dining:      ["café da manhã", "almoço", "jantar", "comida", "restaurante", "menu", "comer"],
    amenities:   ["piscina", "academia", "spa", "wifi", "estacionamento", "instalações"],
    policies:    ["política", "cancelar", "cancelamento", "animal", "fumar", "crianças", "cama extra"],
    contact:     ["endereço", "localização", "onde", "telefone", "ligar", "email", "contato"],
    shuttle:     ["transfer", "aeroporto", "transporte", "táxi"],
    laundry:     ["lavanderia", "lavar", "passar"],
    thanks:      ["obrigado", "obrigada", "agradeço"],
    complaint:   ["reclamação", "problema", "não funciona", "quebrado", "sujo", "barulhento"],
    human_agent: ["humano", "gerente", "recepção", "atendente"],
    farewell:    ["tchau", "até logo", "boa noite", "adeus"],
  },
  ru: {
    greeting:    ["здравствуйте", "привет", "доброе утро", "добрый день", "добрый вечер"],
    booking:     ["бронировать", "бронь", "забронировать", "доступность", "ночь"],
    room_info:   ["номер", "комната", "люкс", "кровать"],
    pricing:     ["цена", "стоимость", "сколько", "дорого", "дёшево"],
    checkin:     ["заселение", "прибытие", "регистрация"],
    checkout:    ["выселение", "выезд", "отъезд"],
    dining:      ["завтрак", "обед", "ужин", "еда", "ресторан", "меню"],
    amenities:   ["бассейн", "тренажёрный зал", "спа", "вай-фай", "парковка"],
    policies:    ["политика", "отмена", "отменить", "животное", "курение", "дети"],
    contact:     ["адрес", "расположение", "телефон", "почта", "контакт"],
    shuttle:     ["трансфер", "аэропорт", "такси"],
    laundry:     ["прачечная", "стирка", "глажка"],
    thanks:      ["спасибо", "благодарю"],
    complaint:   ["жалоба", "проблема", "не работает", "сломано", "грязно", "шумно"],
    human_agent: ["человек", "менеджер", "администратор", "ресепшн"],
    farewell:    ["до свидания", "спокойной ночи", "пока"],
  },
  it: {
    greeting:    ["ciao", "buongiorno", "buonasera", "salve"],
    booking:     ["prenotare", "prenotazione", "disponibilità", "notte"],
    room_info:   ["camera", "suite", "letto", "alloggio"],
    pricing:     ["prezzo", "costo", "tariffa", "quanto", "costoso"],
    checkin:     ["check-in", "arrivo", "registrazione"],
    checkout:    ["check-out", "partenza", "uscita"],
    dining:      ["colazione", "pranzo", "cena", "cibo", "ristorante", "menù", "mangiare"],
    amenities:   ["piscina", "palestra", "spa", "wifi", "parcheggio", "servizi"],
    policies:    ["politica", "cancellare", "cancellazione", "animale", "fumare", "bambini"],
    contact:     ["indirizzo", "posizione", "dove", "telefono", "email", "contatto"],
    shuttle:     ["navetta", "aeroporto", "trasporto", "taxi"],
    laundry:     ["lavanderia", "lavare", "stirare"],
    thanks:      ["grazie", "ringrazio"],
    complaint:   ["reclamo", "problema", "non funziona", "rotto", "sporco", "rumoroso"],
    human_agent: ["umano", "direttore", "reception", "persona"],
    farewell:    ["arrivederci", "buonanotte", "ciao"],
  },
  tr: {
    greeting:    ["merhaba", "günaydın", "iyi akşamlar", "selam"],
    booking:     ["rezervasyon", "yer ayırtmak", "müsait", "gece"],
    room_info:   ["oda", "suit", "yatak"],
    pricing:     ["fiyat", "ücret", "ne kadar", "pahalı", "ucuz"],
    checkin:     ["giriş", "check-in", "varış"],
    checkout:    ["çıkış", "check-out", "ayrılış"],
    dining:      ["kahvaltı", "öğle yemeği", "akşam yemeği", "yemek", "restoran", "menü"],
    amenities:   ["havuz", "spor salonu", "spa", "wifi", "otopark", "tesis"],
    policies:    ["politika", "iptal", "evcil hayvan", "sigara", "çocuk"],
    contact:     ["adres", "konum", "nerede", "telefon", "e-posta", "iletişim"],
    shuttle:     ["servis", "havalimanı", "ulaşım", "taksi"],
    laundry:     ["çamaşırhane", "yıkama", "ütü"],
    thanks:      ["teşekkür", "teşekkürler", "sağ olun"],
    complaint:   ["şikayet", "sorun", "bozuk", "kirli", "gürültülü"],
    human_agent: ["görevli", "müdür", "resepsiyon"],
    farewell:    ["hoşça kalın", "iyi geceler", "güle güle"],
  },
};

// Get keywords for a given language code (falls back to English)
export function getKeywordsForLanguage(langCode: string): Record<IntentKey, string[]> {
  const primary = langCode.split("-")[0];
  return MULTILANG_KEYWORDS[primary] || MULTILANG_KEYWORDS["en"];
}

// ============================================================
// RESPONSE TEMPLATES — per language
// Parameterized templates that get filled with hotel-config data
// ============================================================

interface ResponseTemplates {
  greeting: string;
  bookingOffer: string;
  roomListHeader: string;
  roomListFooter: string;
  pricingRange: string;
  checkIn: string;
  checkOut: string;
  diningHeader: string;
  diningEmpty: string;
  amenitiesHeader: string;
  amenitiesEmpty: string;
  contactInfo: string;
  complaint: string;
  humanAgent: string;
  thanks: string;
  farewell: string;
  unknown: string;
  diningFooter: string;
  amenitiesFooter: string;
}

const TEMPLATES: Record<string, ResponseTemplates> = {
  en: {
    greeting:       "Hello! Welcome to {hotel}. I'm your virtual receptionist. How may I assist you today?",
    bookingOffer:   "I'd be happy to help you with a reservation at {hotel}! We have {roomCount} room types, starting from {currency} {cheapest}/night for our {cheapestName}. Could you provide your check-in and check-out dates?",
    roomListHeader: "Here are our available room types at {hotel}:",
    roomListFooter: "Would you like to book one, or need more details?",
    pricingRange:   "Room rates at {hotel} range from {currency} {cheapest}/night ({cheapestName}) to {currency} {expensive}/night ({expensiveName}). Would you like to check availability?",
    checkIn:        "Standard check-in time at {hotel} is {time}. If you need early check-in, please let us know and we'll do our best.",
    checkOut:       "Check-out time at {hotel} is {time}. For late check-out, please contact us — subject to availability.",
    diningHeader:   "Dining options at {hotel}:",
    diningEmpty:    "{hotel} offers dining for guests. Please contact the front desk for details.",
    diningFooter:   "Would you like to make a reservation?",
    amenitiesHeader:"Amenities at {hotel}:",
    amenitiesEmpty: "{hotel} offers various amenities. Please ask for details.",
    amenitiesFooter:"Anything specific you'd like to know?",
    contactInfo:    "Reach {hotel} at:\n📍 {address}, {city}, {country}\n📞 {phone}\n✉️ {email}",
    complaint:      "I'm sorry about this issue. Your comfort is our priority at {hotel}. Let me connect you with our team at {phone}.",
    humanAgent:     "Let me transfer you to our team at {hotel}. You can also reach them at {phone} or {email}.",
    thanks:         "You're welcome! If there's anything else, please ask. {farewell}",
    farewell:       "{farewell} We look forward to welcoming you at {hotel}. Goodbye!",
    unknown:        "I apologize, I didn't fully understand. At {hotel} I can help with bookings, amenities, dining, and more. Could you rephrase, or shall I connect you with a staff member?",
  },
  es: {
    greeting:       "¡Hola! Bienvenido a {hotel}. Soy su recepcionista virtual. ¿En qué puedo ayudarle hoy?",
    bookingOffer:   "Con gusto le ayudo con una reservación en {hotel}. Tenemos {roomCount} tipos de habitación, desde {currency} {cheapest}/noche ({cheapestName}). ¿Podría indicar sus fechas de entrada y salida?",
    roomListHeader: "Estos son los tipos de habitación disponibles en {hotel}:",
    roomListFooter: "¿Desea reservar alguna o necesita más información?",
    pricingRange:   "Las tarifas en {hotel} van desde {currency} {cheapest}/noche ({cheapestName}) hasta {currency} {expensive}/noche ({expensiveName}). ¿Desea consultar disponibilidad?",
    checkIn:        "El horario de check-in en {hotel} es a las {time}. Si necesita entrada anticipada, avísenos.",
    checkOut:       "El check-out en {hotel} es a las {time}. Para salida tardía, contáctenos según disponibilidad.",
    diningHeader:   "Opciones de comida en {hotel}:",
    diningEmpty:    "{hotel} ofrece opciones gastronómicas. Consulte en recepción.",
    diningFooter:   "¿Le gustaría hacer una reservación?",
    amenitiesHeader:"Servicios en {hotel}:",
    amenitiesEmpty: "{hotel} ofrece diversos servicios. Pregunte para más detalles.",
    amenitiesFooter:"¿Algo específico que le gustaría saber?",
    contactInfo:    "Contacte a {hotel}:\n📍 {address}, {city}, {country}\n📞 {phone}\n✉️ {email}",
    complaint:      "Lamento mucho esta situación. Su comodidad es nuestra prioridad en {hotel}. Le conecto con nuestro equipo al {phone}.",
    humanAgent:     "Le transfiero a nuestro equipo en {hotel}. También puede llamar al {phone} o escribir a {email}.",
    thanks:         "¡De nada! Si necesita algo más, no dude en preguntar. {farewell}",
    farewell:       "{farewell} Esperamos darle la bienvenida en {hotel}. ¡Hasta pronto!",
    unknown:        "Disculpe, no entendí completamente. En {hotel} puedo ayudarle con reservas, servicios, comidas y más. ¿Podría reformular su pregunta?",
  },
  fr: {
    greeting:       "Bonjour ! Bienvenue à {hotel}. Je suis votre réceptionniste virtuel. Comment puis-je vous aider ?",
    bookingOffer:   "Je serais ravi de vous aider avec une réservation au {hotel}. Nous avons {roomCount} types de chambres, à partir de {currency} {cheapest}/nuit ({cheapestName}). Quelles sont vos dates ?",
    roomListHeader: "Voici les types de chambres au {hotel} :",
    roomListFooter: "Souhaitez-vous en réserver une ?",
    pricingRange:   "Les tarifs au {hotel} vont de {currency} {cheapest}/nuit ({cheapestName}) à {currency} {expensive}/nuit ({expensiveName}). Vérifier la disponibilité ?",
    checkIn:        "L'enregistrement au {hotel} est à {time}. Pour un enregistrement anticipé, contactez-nous.",
    checkOut:       "Le départ du {hotel} est à {time}. Départ tardif possible selon disponibilité.",
    diningHeader:   "Options de restauration au {hotel} :",
    diningEmpty:    "{hotel} propose des options de restauration. Renseignez-vous à la réception.",
    diningFooter:   "Souhaitez-vous réserver une table ?",
    amenitiesHeader:"Équipements du {hotel} :",
    amenitiesEmpty: "{hotel} offre diverses installations. Demandez pour plus de détails.",
    amenitiesFooter:"Quelque chose de spécifique ?",
    contactInfo:    "Contactez {hotel} :\n📍 {address}, {city}, {country}\n📞 {phone}\n✉️ {email}",
    complaint:      "Je suis désolé pour ce désagrément. Votre confort est notre priorité au {hotel}. Je vous mets en contact avec notre équipe au {phone}.",
    humanAgent:     "Je vous transfère à notre équipe au {hotel}. Vous pouvez aussi appeler le {phone} ou écrire à {email}.",
    thanks:         "Je vous en prie ! N'hésitez pas si vous avez d'autres questions. {farewell}",
    farewell:       "{farewell} Nous avons hâte de vous accueillir au {hotel}. Au revoir !",
    unknown:        "Excusez-moi, je n'ai pas bien compris. Au {hotel}, je peux vous aider avec les réservations, services et plus. Pourriez-vous reformuler ?",
  },
  // Default fallback — English
  default: {
    greeting:       "Hello! Welcome to {hotel}. I'm your virtual receptionist. How may I assist you today?",
    bookingOffer:   "I'd be happy to help with a reservation at {hotel}! Starting from {currency} {cheapest}/night. What are your dates?",
    roomListHeader: "Available rooms at {hotel}:",
    roomListFooter: "Would you like to book?",
    pricingRange:   "Rates at {hotel}: {currency} {cheapest} — {currency} {expensive}/night. Check availability?",
    checkIn:        "Check-in at {hotel}: {time}.",
    checkOut:       "Check-out at {hotel}: {time}.",
    diningHeader:   "Dining at {hotel}:",
    diningEmpty:    "Contact front desk for dining info.",
    diningFooter:   "Would you like a reservation?",
    amenitiesHeader:"Amenities at {hotel}:",
    amenitiesEmpty: "Ask for amenity details.",
    amenitiesFooter:"Need more info?",
    contactInfo:    "{hotel}: 📍 {address}, {city}, {country} 📞 {phone} ✉️ {email}",
    complaint:      "Sorry about this. Contact us at {phone}.",
    humanAgent:     "Transferring you. Call {phone} or email {email}.",
    thanks:         "You're welcome! {farewell}",
    farewell:       "{farewell} Goodbye!",
    unknown:        "Sorry, I didn't understand. Can you rephrase?",
  },
};

export function getTemplatesForLanguage(langCode: string): ResponseTemplates {
  const primary = langCode.split("-")[0];
  return TEMPLATES[primary] || TEMPLATES["default"];
}

export function getLanguageByCode(code: string): LanguageDefinition | undefined {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}
