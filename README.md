# 🎙️ Universal Voice Receptionist

> **AI-powered, multi-language voice assistant built to be integrated into any hotel management system.**

A plug-and-play virtual receptionist that handles guest inquiries through voice — supporting **34 languages**, fully configurable branding, and a real-time admin dashboard. Designed as a universal package that any hotel can adopt without code changes.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎤 **Voice Input/Output** | Browser-native Speech-to-Text and Text-to-Speech via Web Speech API |
| 🌐 **34 Languages** | English, Spanish, French, German, Japanese, Chinese, Hindi, Nepali, Korean, Arabic, Portuguese, Russian, Italian, Turkish, Thai, Vietnamese, and 18 more |
| 🏨 **Universal Config** | Plug in any hotel's data — name, rooms, policies, dining, amenities, FAQ |
| 🎨 **Dynamic Branding** | Hotel name, accent color, tagline, and messages update across the entire UI |
| 🧠 **15+ Intent Categories** | Greetings, bookings, pricing, check-in/out, dining, amenities, policies, complaints, human agent transfers |
| 📝 **Custom FAQ** | Hotels can add keyword-triggered custom responses |
| 🤖 **AI Persona** | Configurable system prompt — ready for LLM integration (OpenAI / Gemini) |
| ⚙️ **Admin Dashboard** | Full settings panel with 8 configurable tabs |
| 📱 **Responsive** | Works seamlessly on desktop, tablet, and mobile |

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Voice:** Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Icons:** Lucide React

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A modern browser (Chrome or Edge recommended for Speech API)

### Installation

```bash
# Clone the repository
git clone https://github.com/prabin923/Voice-assistant.git
cd Voice-assistant

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                # Voice assistant UI (main interface)
│   ├── layout.tsx              # Root layout with global styles
│   ├── globals.css             # Tailwind & custom animations
│   ├── settings/
│   │   └── page.tsx            # Admin configuration dashboard
│   └── api/
│       ├── chat/
│       │   └── route.ts        # Chat API — processes voice input
│       └── config/
│           └── route.ts        # Config API — GET/PUT/DELETE hotel config
├── lib/
│   ├── hotelConfig.ts          # Hotel config schema & in-memory store
│   ├── responseEngine.ts       # Intent detection & response generation
│   └── languages.ts            # 34 languages, keywords, templates
```

---

## 🌐 Supported Languages

The assistant supports **34 languages** across speech recognition, text-to-speech, and intent detection:

| | | | |
|---|---|---|---|
| 🇺🇸 English (US) | 🇬🇧 English (UK) | 🇪🇸 Spanish | 🇫🇷 French |
| 🇩🇪 German | 🇮🇹 Italian | 🇧🇷 Portuguese | 🇯🇵 Japanese |
| 🇰🇷 Korean | 🇨🇳 Chinese (Mandarin) | 🇹🇼 Chinese (Taiwan) | 🇸🇦 Arabic |
| 🇮🇳 Hindi | 🇳🇵 Nepali | 🇷🇺 Russian | 🇹🇷 Turkish |
| 🇹🇭 Thai | 🇻🇳 Vietnamese | 🇮🇩 Indonesian | 🇲🇾 Malay |
| 🇳🇱 Dutch | 🇵🇱 Polish | 🇸🇪 Swedish | 🇩🇰 Danish |
| 🇫🇮 Finnish | 🇬🇷 Greek | 🇮🇱 Hebrew | 🇺🇦 Ukrainian |
| 🇨🇿 Czech | 🇷🇴 Romanian | 🇧🇩 Bengali | 🇮🇳 Tamil |
| 🇮🇳 Telugu | 🇵🇭 Filipino | | |

---

## ⚙️ Configuration

### For Hotel Admins

1. Navigate to `/settings`
2. Configure your hotel across **8 tabs**:
   - **Branding** — Hotel name, tagline, accent color, welcome/farewell messages
   - **Contact** — Phone, email, address, website
   - **Policies** — Check-in/out times, cancellation, pets, smoking, children
   - **Rooms** — Room types with pricing, occupancy, descriptions
   - **Dining** — Restaurants, cuisines, hours
   - **Amenities** — Pool, gym, spa, Wi-Fi, parking, etc.
   - **Custom FAQ** — Add keyword-triggered custom answers
   - **AI Persona** — Receptionist personality & language setting
3. Click **Save Changes** — the assistant updates immediately

### For Developers

The configuration is managed through a REST API:

```bash
# Get current config
GET /api/config

# Update config
PUT /api/config
Content-Type: application/json
{ "branding": { "hotelName": "Grand Palace Hotel", ... } }

# Reset to defaults
DELETE /api/config
```

---

## 🏗️ Architecture

```
Guest Voice Input
       │
       ▼
┌──────────────┐    ┌───────────────┐    ┌────────────────┐
│  Web Speech  │───▶│  POST /api/   │───▶│   Response     │
│  Recognition │    │    chat       │    │   Engine       │
│  (STT)       │    │              │    │ (Intent +      │
└──────────────┘    └───────────────┘    │  Templates)    │
                          │              └───────┬────────┘
                          │                      │
                          ▼                      ▼
                   ┌──────────────┐    ┌─────────────────┐
                   │   Hotel      │◀──▶│  Language       │
                   │   Config     │    │  Module         │
                   │   Store      │    │  (34 langs)     │
                   └──────────────┘    └─────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  Web Speech  │
                   │  Synthesis   │───▶ Guest hears reply
                   │  (TTS)       │
                   └──────────────┘

Admin Panel (/settings) ───▶ PUT /api/config ───▶ Config Store
```

---

## 🔧 How It Works

1. **Guest taps the microphone** — browser starts capturing audio
2. **Speech-to-Text** — Web Speech API converts voice to text in the selected language
3. **Intent Detection** — the response engine matches the message against language-specific keywords (15+ intent categories)
4. **Response Generation** — a localized template is filled with the hotel's configured data
5. **Text-to-Speech** — the reply is spoken back using a voice matching the selected language

---

## 🔮 Production Roadmap

| Priority | Task | Status |
|----------|------|--------|
| 🔴 High | Replace in-memory config with database (MongoDB/PostgreSQL) | Planned |
| 🔴 High | Add authentication to `/settings` admin panel | Planned |
| 🟡 Medium | Integrate LLM (OpenAI/Gemini) for dynamic responses | Ready (persona field exists) |
| 🟡 Medium | Add WebSocket for real-time call simulation | Planned |
| 🟢 Low | Add analytics dashboard (query volume, popular intents) | Planned |
| 🟢 Low | Deploy to Vercel/Railway with environment variables | Planned |

---

## 🤝 Integration Guide

This assistant is designed to be embedded into any hotel management system:

```typescript
// 1. Set the hotel config programmatically
await fetch('/api/config', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    branding: {
      hotelName: 'Grand Palace Hotel',
      tagline: 'Luxury Redefined',
      accentColor: '#8b5cf6',
      welcomeMessage: 'Welcome to Grand Palace! How can I help?',
      farewellMessage: 'Thank you for staying with us!',
    },
    contact: { phone: '+1-555-1234', email: 'info@grandpalace.com', ... },
    rooms: [...],
    dining: [...],
    // ... full config
  }),
});

// 2. Embed the assistant in an iframe or route
<iframe src="https://your-deployment.com" />
```

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Prabin Sharma**  
GitHub: [@prabin923](https://github.com/prabin923)

---

<p align="center">
  <strong>Universal Voice Receptionist</strong> • Built with Next.js, TypeScript & Tailwind CSS<br/>
  🎤 34 Languages • 🏨 Any Hotel • ⚡ Zero Config
</p>
