# StayNep AI Voice Receptionist

> **An intelligent, multilingual voice assistant for hotel guest services — powered by Next.js 16, Google Gemini, and autonomous booking.**

A production-ready AI voice receptionist that provides 24/7 multilingual guest support for hotels. Guests speak in any of 34 supported languages and receive instant, spoken responses with hotel-specific knowledge. The assistant handles **live availability checks**, **end-to-end bookings**, **modifications**, and **cancellations** on its own — staff are notified only when a booking is completed (FYI) or when a situation truly needs a human.

Built as the foundation for **StayNep** — a comprehensive hotel management platform for Nepal's hospitality industry.

---

## Features

| Feature | Description |
|---------|-------------|
| **Voice-to-Voice Chat** | Tap to speak, get spoken AI responses in real-time |
| **Autonomous Booking** | Check availability, book, modify, and cancel — without front-desk handoff |
| **Live Inventory** | Real-time room availability from Prisma Postgres |
| **Smart Alternatives** | Suggests other room types or nearby dates when sold out |
| **Tiered Staff Alerts** | FYI emails on completed bookings; escalation tickets only when critical |
| **Rich Hotel Context** | Dining, FAQ, full policies, amenities, and room details in AI prompt |
| **Conversation Memory** | Multi-turn booking — collect dates, room, name, and phone across messages |
| **34 Languages** | Full multilingual support via Gemini — Arabic to Vietnamese |
| **MAI-Voice TTS** | Azure MAI-Voice with browser fallback |
| **Guest Accounts** | Sign-in pre-fills name, phone, and links bookings |
| **Admin Dashboard** | Settings, analytics, calendar inventory, support inbox |
| **Telephony** | Telnyx / generic webhook voice integration |

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Glassmorphism |
| AI Engine | Google Gemini / OpenAI (configurable) |
| STT | MAI-Transcribe (Azure) + Gemini + browser |
| TTS | MAI-Voice (Azure) + Web Speech Synthesis |
| Database | Prisma ORM + Prisma Postgres |
| Email | Nodemailer (guest confirmations + staff FYI + escalations) |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/prabin923/Voice-assistant.git
cd Voice-assistant
npm install
```

### 2. Environment setup

Create a `.env.local` for app secrets (see `.env.example`). Link Prisma Postgres for the database:

```bash
npx prisma postgres link --database <your-database-id>
npx prisma migrate dev
npx prisma db seed   # optional sample data
```

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_key_from_aistudio.google.com
JWT_SECRET=your_random_secret_here
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
WEBHOOK_SECRET=your_webhook_shared_secret

# Optional: Azure Speech (MAI-Voice + MAI-Transcribe)
AZURE_SPEECH_KEY=...
AZURE_SPEECH_ENDPOINT=https://your-resource.cognitiveservices.azure.com

# Optional: SMTP for guest confirmations, staff FYI, and escalation alerts
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

Open [http://localhost:3000/assistant](http://localhost:3000/assistant).

---

## Architecture Flowcharts

### 1. Guest message routing

Every message to `/api/chat` is routed by intent before the general AI is invoked.

```mermaid
flowchart TD
  A[Guest message] --> B{Intent router}
  B -->|Cancel booking| C[Cancel flow]
  B -->|Modify booking| D[Modify flow]
  B -->|Availability query| E[Live inventory lookup]
  B -->|New booking| F[Booking state machine]
  B -->|Booking context in history| F
  B -->|General question| G[AI + full hotel context]

  C --> H[Guest reply]
  D --> H
  E --> H
  F --> H
  G --> I{Escalate?}
  I -->|No| H
  I -->|Yes| J[Support ticket + alert email]
  J --> H
```

### 2. Autonomous booking flow

Bookings complete without staff involvement during the conversation. Staff receive an **informational FYI email** after success.

```mermaid
flowchart TD
  A[Booking intent detected] --> B{Dates known?}
  B -->|No| C[Ask for check-in / check-out]
  B -->|Yes| D[Query live availability]
  D --> E{Room type known?}
  E -->|No| F[List available rooms + rates]
  E -->|Yes| G{Room available?}
  G -->|No| H[Suggest alternatives — other rooms or dates]
  G -->|Yes| I{Name + phone?}
  I -->|No| J[Ask for guest details]
  I -->|Yes| K[createBookingSafe — transactional]
  K --> L{Success?}
  L -->|Yes| M[Guest confirmation email]
  M --> N[Staff FYI email — no ticket]
  N --> O[BookingSummaryCard in chat]
  L -->|Conflict| H
  C --> P[Wait for next message]
  F --> P
  J --> P
  H --> P
```

### 3. Cancel and modify flows

```mermaid
flowchart TD
  A[Cancel or modify intent] --> B{Find booking}
  B -->|By confirmation ID| C[Lookup in database]
  B -->|Guest signed in| D[Latest guest booking]
  B -->|Not found| E[Ask for booking ID or sign-in]
  C --> F{Action}
  D --> F
  F -->|Cancel| G[cancelBookingSafe]
  F -->|Modify| H{New dates or room?}
  H -->|Missing| I[Ask what to change]
  H -->|Provided| J[modifyBookingSafe]
  G --> K[Staff FYI email]
  J --> L{Available?}
  L -->|Yes| K
  L -->|No| M[Suggest alternatives — no escalation]
  K --> N[Confirm to guest]
```

### 4. Staff notification tiers

```mermaid
flowchart LR
  subgraph autonomous [Handled by AI — no ticket]
    A1[FAQ / amenities / dining]
    A2[Availability check]
    A3[Book / modify / cancel]
  end

  subgraph fyi [Staff FYI — informational email]
    B1[Booking confirmed]
    B2[Booking modified]
    B3[Booking cancelled]
  end

  subgraph escalate [Escalation — ticket + urgent email]
    C1[Guest asks for human]
    C2[Emergency / safety]
    C3[Billing dispute / refund]
    C4[Serious complaint]
    C5[Policy exception]
    C6[AI service failure]
  end

  autonomous --> Guest[Guest satisfied]
  fyi --> Guest
  escalate --> Staff[Support inbox + staff action]
```

### 5. Voice assistant session

```mermaid
sequenceDiagram
  participant G as Guest
  participant UI as Assistant UI
  participant STT as STT API
  participant Chat as /api/chat
  participant BF as Booking flow
  participant AI as Response engine
  participant TTS as MAI-Voice TTS

  G->>UI: Tap orb / speak
  UI->>STT: Audio
  STT-->>UI: Transcript
  UI->>Chat: message + history + channel voice
  Chat->>BF: handleGuestBookingFlow
  alt Booking / availability handled
    BF-->>Chat: reply + booking card
  else General question
    Chat->>AI: getAssistantResponse
    AI-->>Chat: reply
  end
  Chat-->>UI: JSON response
  UI->>TTS: Speak reply
  TTS-->>G: Audio
  UI->>UI: Auto-listen for next turn
```

### 6. Data and configuration

```mermaid
flowchart TB
  subgraph config [Hotel config — Settings UI]
    C1[Branding]
    C2[Rooms + inventory defaults]
    C3[Policies + FAQ + Dining]
    C4[AI persona]
  end

  subgraph runtime [Runtime]
    R1[responseEngine — full HOTEL DATA in prompt]
    R2[bookingFlow — live availability]
    R3[bookingService — transactional writes]
  end

  subgraph storage [Prisma Postgres]
    S1[bookings]
    S2[room_inventory]
    S3[support_tickets]
    S4[interactions]
  end

  config --> R1
  config --> R2
  R2 --> S2
  R3 --> S1
  R1 --> S4
```

---

## Project Structure

```
src/lib/
├── bookingFlow.ts          # Intent router: book / modify / cancel / availability
├── bookingService.ts       # Transactional create, modify, cancel
├── dateParsing.ts          # Natural language + ISO date extraction
├── availabilityQuery.ts    # Live inventory + alternative suggestions
├── staffNotifications.ts   # FYI emails after booking events
├── responseEngine.ts       # AI prompt with full hotel context
├── escalation.ts           # Support tickets for human handoff
└── email.ts                # Guest confirmations + staff FYI + escalations

src/app/api/chat/route.ts   # Main guest conversation endpoint
```

---

## Booking API

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/chat` | Guest rate limit | Conversation + autonomous booking |
| `POST /api/bookings` | Guest / public | Direct booking creation |
| `PATCH /api/bookings/[id]` | Guest session | Modify booking |
| `GET /api/availability` | Admin | Calendar inventory (Settings) |

---

## Email notifications

| Event | Recipient | Type |
|-------|-----------|------|
| Booking confirmed | Guest (if email provided) | Confirmation |
| Booking confirmed / modified / cancelled | Staff (`contact.email`) | FYI — no ticket |
| Escalation (complaint, emergency, human request) | Staff | Urgent ticket + email |

Without SMTP, all emails are logged to the server console.

---

## Admin Features

### Settings (`/settings`)
Branding, contact, policies, rooms, dining, amenities, FAQ, AI persona, calendar inventory, bookings list, and staff notification center.

### Support Inbox (`/admin/support`)
Priority-sorted **escalation** tickets only — not routine bookings.

### Analytics (`/admin/analytics`)
Interaction volume, escalation rate, language distribution, guest satisfaction.

---

## Auth Flow

1. Hotel admin registers at `/admin/register`
2. Login at `/admin/login`
3. Authenticated users access `/settings`, analytics, and support
4. Guest sign-in on the assistant pre-fills booking details

---

## About StayNep

This voice assistant is a core module of **StayNep** — a hotel management system for Nepal's hospitality industry.

---

## License & Credits

Built by **Prabin Sharma** ([@prabin923](https://github.com/prabin923)).
Powered by Next.js 16, Tailwind CSS v4, Google Gemini, and Azure Speech.
