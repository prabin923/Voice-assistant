# StayNep AI Voice Receptionist

> **An intelligent, multilingual voice assistant for hotel guest services — powered by Next.js 16 and Google Gemini 2.5 Flash Lite.**

A production-ready AI voice receptionist that provides 24/7 multilingual guest support for hotels. Guests speak in any of 34 supported languages and receive instant, spoken responses with hotel-specific knowledge. Built as the foundation for **StayNep** — a comprehensive hotel management platform for Nepal's hospitality industry.

---

## Features

| Feature | Description |
|---------|-------------|
| **Voice-to-Voice Chat** | Tap to speak, get spoken AI responses in real-time |
| **Conversation Memory** | Multi-turn context — the AI remembers what you said earlier in the session |
| **34 Languages** | Full multilingual support via Gemini — Arabic to Vietnamese |
| **Natural TTS** | Smart voice selection prefers premium voices, 0.93x speech rate for human-like pacing |
| **Silence Detection** | Auto-stops recording when the user stops talking (Web Audio API) |
| **Seamless Conversation** | Tap once to start, auto-listen loop after each response, tap again to stop |
| **Guest Feedback** | Thumbs up/down on every AI response, stored and tracked |
| **Hotel Admin Auth** | Secure registration and login system (JWT + bcrypt) |
| **Admin Dashboard** | 8-tab configuration panel (Persisted to SQLite) — Branding, Contact, Policies, Rooms, Dining, Amenities, FAQ, AI Persona |
| **Analytics Dashboard** | 7 KPI cards, daily trends, peak hours, language distribution, activity heatmap, guest satisfaction |
| **Support Inbox** | Priority-sorted escalation tickets with auto-refresh and email alerts |
| **Email Alerts** | Staff notified via sanitized HTML email when AI escalates a guest issue |
| **Toast Notifications** | Visual feedback on add/delete actions in settings |
| **Telephony Integration** | Phone call support via TingTing/Twilio webhook (Secured with WEBHOOK_SECRET) |
| **Concierge Call Mode** | In-app telephony interface |
| **Rate Limiting** | Brute-force protection (5/min for login, 3/hr for register, 60/min for chat) |
| **Security Hardened** | Masked error messages, crypto IDs, SSL/SameSite strict cookies, path-traversal protection |
| **Mobile Responsive** | Fully responsive across all pages |
| **Performance Optimized** | GPU-friendly CSS, no stacked backdrop-filter blurs |

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Glassmorphism |
| AI Engine | Google Gemini 2.5 Flash Lite |
| STT | Gemini multimodal (audio transcription) |
| TTS | Web Speech Synthesis API (premium voice selection) |
| Auth | jose (JWT), bcryptjs, HTTP-only cookies |
| Database | SQLite (better-sqlite3) |
| Email | Nodemailer (SMTP) |
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
# Required: Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_key_from_aistudio.google.com

# Database
DATABASE_URL="file:./dev.db"

# JWT Secret for Auth sessions
JWT_SECRET=your_random_secret_here

# Required for telephony webhook authentication
WEBHOOK_SECRET=your_webhook_shared_secret

# Optional: Email notifications on escalation
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=ai-receptionist@yourhotel.com
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
│   │   ├── register/page.tsx       # Hotel admin registration
│   │   ├── analytics/page.tsx      # Analytics dashboard (KPIs, charts, heatmap)
│   │   └── support/page.tsx        # Support inbox (escalation tickets)
│   ├── api/
│   │   ├── chat/route.ts           # Gemini chat with conversation memory
│   │   ├── stt/route.ts            # Gemini speech-to-text
│   │   ├── config/route.ts         # Hotel config CRUD
│   │   ├── analytics/route.ts      # Analytics data aggregation
│   │   ├── support/route.ts        # Support ticket management
│   │   ├── feedback/route.ts       # Guest feedback (thumbs up/down)
│   │   ├── auth/                   # Auth endpoints (register/login/logout/me)
│   │   └── telephony/webhook/      # Phone call webhook
│   ├── globals.css                 # Design system & animations
│   └── layout.tsx                  # Root layout
├── lib/
│   ├── responseEngine.ts           # Gemini AI with conversation memory + retry
│   ├── hotelConfig.ts              # Hotel configuration schema
│   ├── auth.ts                     # JWT + password utilities
│   ├── db.ts                       # SQLite (interactions, tickets, feedback)
│   ├── email.ts                    # Nodemailer escalation alerts
│   └── rateLimit.ts                # In-memory rate limiter
├── components/
│   └── CallOverlay.tsx             # Telephony call UI
└── proxy.ts                        # Route protection (Next.js 16 middleware)
```

---

## Voice Assistant Flow

```
Guest taps orb → Microphone activates
     ↓
Guest speaks → Silence detected → Auto-stops recording
     ↓
Audio sent to Gemini STT → Transcribed text
     ↓
Text + conversation history sent to Gemini Chat
     ↓
AI responds (with hotel context + memory)
     ↓
Response spoken via premium TTS voice
     ↓
400ms pause → Auto-listens for next message
     ↓
Guest taps orb again → Everything stops
```

---

## Supported Languages (34)

Arabic, Bengali, Bulgarian, Chinese (Mandarin), Croatian, Czech, Danish, Dutch, English (US), English (UK), Estonian, Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Lithuanian, Nepali, Norwegian, Polish, Portuguese (BR), Romanian, Russian, Spanish, Swahili, Thai, Turkish, Vietnamese

---

## Admin Features

### Settings (`/settings`)
8-tab configuration panel with toast notifications on add/delete:
- **Branding** — Hotel name, tagline, accent color, welcome/farewell messages
- **Contact** — Phone, email, website, address
- **Policies** — Check-in/out, cancellation, pet, smoking, child policies
- **Rooms** — Room types with pricing, currency, capacity
- **Dining** — Restaurants with cuisine and hours
- **Amenities** — Facilities with descriptions and hours
- **Custom FAQ** — Trigger keywords mapped to custom responses
- **AI Persona** — System prompt to shape the receptionist's personality

### Analytics (`/admin/analytics`)
Real-time dashboard with auto-refresh (30s):
- 7 KPI cards: Total interactions, Today, Daily avg, Escalation rate, AI handled %, Avg resolution time, Guest satisfaction
- Daily interaction trend (30-day bar chart)
- Peak hours heatmap
- Language distribution
- Escalation summary strip

### Support Inbox (`/admin/support`)
Priority-sorted escalation tickets with auto-refresh (15s):
- Urgent/High/Medium/Normal priority detection
- Color-coded borders and ticket age display
- Staff resolution with toast feedback
- Email alert to staff on new escalations

---

## Email Alerts

When the AI detects a guest issue requiring human help (complaint, booking change, emergency), it:
1. Adds `[ESCALATE]` to the response
2. Creates a support ticket in the database
3. Sends a styled HTML email to the hotel's configured email address

To enable email alerts, add SMTP credentials to `.env.local` (see Setup section). Without SMTP config, escalations are logged to console.

---

## Auth Flow

1. Hotel admin registers at `/admin/register`
2. Login at `/admin/login`
3. Authenticated users access `/settings`, analytics, and support
4. Protected routes redirect unauthenticated users
5. Sessions stored as HTTP-only JWT cookies (24-hour expiry, SameSite: Strict)
6. Brute-force protection on auth endpoints and expensive AI routes (STT/Chat)

---

## About StayNep

This voice assistant is a core module of **StayNep** — a hotel management system being built for Nepal's growing hospitality industry. Future integrations include booking management, housekeeping coordination, and multi-property support.

---

## License & Credits

Built by **Prabin Sharma** ([@prabin923](https://github.com/prabin923)).
Powered by Next.js 16, Tailwind CSS v4, and Google Gemini.
