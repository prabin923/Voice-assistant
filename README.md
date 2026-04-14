# StayNep AI Voice Receptionist

> **An intelligent, multilingual voice assistant for hotel guest services — powered by Next.js 16 and Google Gemini 2.5 Flash Lite.**

A production-ready AI voice receptionist that provides 24/7 multilingual guest support for hotels. Guests speak in any of 34 supported languages and receive instant, spoken responses with hotel-specific knowledge. Built as the foundation for **StayNep** — a comprehensive hotel management platform for Nepal's hospitality industry.

---

## Features

| Feature | Description |
|---------|-------------|
| **Voice-to-Voice Chat** | Tap to speak, get spoken AI responses in real-time |
| **34 Languages** | Full multilingual support via Gemini — Arabic, Bengali, Chinese, French, Hindi, Japanese, Korean, Nepali, Spanish, and 25 more |
| **Hotel Admin Auth** | Secure registration and login system for hotel administrators (JWT + bcrypt) |
| **Admin Dashboard** | 8-tab configuration panel — Branding, Contact, Policies, Rooms, Dining, Amenities, FAQ, AI Persona |
| **Route Protection** | Next.js 16 proxy-based middleware protecting admin routes |
| **Telephony Integration** | Phone call support via TingTing/Twilio webhook |
| **Glassmorphic UI** | Premium dark-themed interface with frosted glass effects and animations |
| **Concierge Call Mode** | In-app telephony interface for direct voice calls |

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Glassmorphism |
| AI Engine | Google Gemini 2.5 Flash Lite |
| STT | Gemini multimodal (audio transcription) |
| TTS | Web Speech Synthesis API |
| Auth | jose (JWT), bcryptjs, HTTP-only cookies |
| Database | SQLite (better-sqlite3) |
| Telephony | TingTing/Twilio webhooks |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/prabin923/Voice-assistant.git
cd Voice-assistant
npm install
```

### 2. Environment setup

Create a `.env.local` file:

```bash
# Get your key from https://aistudio.google.com/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Database
DATABASE_URL="file:./dev.db"

# JWT Secret (generate your own)
JWT_SECRET=your_random_secret_here
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the voice assistant is ready.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main voice assistant UI
│   ├── settings/page.tsx           # Admin configuration dashboard
│   ├── admin/
│   │   ├── login/page.tsx          # Hotel admin login
│   │   └── register/page.tsx       # Hotel admin registration
│   ├── api/
│   │   ├── chat/route.ts           # Gemini chat endpoint
│   │   ├── stt/route.ts            # Gemini speech-to-text
│   │   ├── config/route.ts         # Hotel config CRUD
│   │   ├── auth/                   # Auth endpoints (register/login/logout/me)
│   │   └── telephony/webhook/      # Phone call webhook
│   ├── globals.css                 # Design system & animations
│   └── layout.tsx                  # Root layout
├── lib/
│   ├── responseEngine.ts           # Shared Gemini AI brain
│   ├── hotelConfig.ts              # Hotel configuration schema
│   ├── auth.ts                     # JWT + password utilities
│   └── db.ts                       # SQLite database
├── components/
│   └── CallOverlay.tsx             # Telephony call UI
└── proxy.ts                        # Route protection (Next.js 16 middleware)
```

---

## Supported Languages (34)

Arabic, Bengali, Bulgarian, Chinese (Mandarin), Croatian, Czech, Danish, Dutch, English (US), English (UK), Estonian, Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Lithuanian, Nepali, Norwegian, Polish, Portuguese (BR), Romanian, Russian, Spanish, Swahili, Thai, Turkish, Vietnamese

---

## Auth Flow

1. Hotel admin registers at `/admin/register` (hotel name, email, password)
2. Login at `/admin/login`
3. Authenticated users access `/settings` to configure their hotel
4. `/settings` and `/api/config` are protected — unauthenticated users are redirected
5. Sessions stored as HTTP-only JWT cookies (7-day expiry)

---

## Admin Dashboard

The settings panel at `/settings` provides 8 configuration tabs:

- **Branding** — Hotel name, tagline, accent color, welcome/farewell messages
- **Contact** — Phone, email, website, address
- **Policies** — Check-in/out times, cancellation, pet, smoking, child policies
- **Rooms** — Room types with pricing, currency, capacity
- **Dining** — Restaurant names, cuisine, hours
- **Amenities** — Facilities with descriptions and hours
- **Custom FAQ** — Trigger keywords mapped to custom responses
- **AI Persona** — System prompt to shape the receptionist's personality

---

## About StayNep

This voice assistant is a core module of **StayNep** — a hotel management system being built for Nepal's growing hospitality industry. Future integrations include booking management, housekeeping coordination, analytics, and multi-property support.

---

## License & Credits

Built by **Prabin Sharma** ([@prabin923](https://github.com/prabin923)).
Powered by Next.js 16, Tailwind CSS v4, and Google Gemini.
