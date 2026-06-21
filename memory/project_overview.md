---
name: project-overview
description: StayNep AI Voice Receptionist — full project context, stack, architecture, and key conventions
metadata:
  type: project
---

# StayNep AI Voice Receptionist

**What it is:** A production-ready AI voice receptionist for hotels. Guests speak (or type) in any of 34 languages and the system autonomously checks availability, creates/modifies/cancels room bookings, handles dining reservations, escalates only when required (human request, emergencies, billing disputes), and sends email/SMS confirmations — all without front-desk involvement.

Built as a module of **StayNep**, a hotel management platform targeting Nepal's hospitality industry.

**Why:** 24/7 multilingual guest support with zero front-desk handoff for routine operations.

**How to apply:** All feature work should respect the autonomous-first design: AI handles bookings end-to-end; staff only notified via FYI email or escalation ticket when warranted.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, glassmorphism dark theme
- **AI / LLM:** Google Gemini (primary), OpenAI GPT-4o-mini (fallback) — provider swappable via `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`
- **STT:** NVIDIA Nemotron ASR, self-hosted Whisper (Docker/local cpp), Gemini STT fallback, browser Web Speech API
- **TTS:** Edge TTS (free/default), NVIDIA Nemotron TTS, MiniMax, OpenAI TTS, browser SpeechSynthesis fallback
- **Database:** Prisma ORM + PostgreSQL (Prisma Postgres cloud); local SQLite `hotel.db` for dev
- **Email:** Nodemailer (guest confirmations + staff FYI + escalations)
- **SMS:** TingTing API (optional booking confirmations)
- **Telephony:** Telnyx TeXML integration + generic webhook
- **Testing:** Vitest

---

## Database Models (Prisma)

| Model | Purpose |
|---|---|
| `Hotel` | Multi-tenant: hotel row stores `config` JSON blob |
| `Guest` | Guest accounts with password auth, loyalty counters |
| `Booking` | Room reservations with status, special requests |
| `DiningReservation` | Restaurant table bookings |
| `RoomInventoryDefault` | Default room counts per type |
| `RoomInventoryOverride` | Per-date inventory overrides |
| `SupportTicket` | Escalation tickets (human-only, not FYI bookings) |
| `Interaction` | Every AI conversation turn logged |
| `KnowledgeGap` | FAQ questions the AI couldn't answer — for admin review |
| `KnowledgeChunk` | RAG embeddings of hotel knowledge |
| `Feedback` | Guest ratings per message |
| `AuthAuditLog` | Login/security events |
| `PasswordResetToken` | Time-limited password reset tokens |

---

## Multi-tenant Architecture

Each `Hotel` row in the DB has a `slug` (URL-friendly identifier). The `/embed/[slug]` route and `hotel` query param on `/api/chat` enable per-hotel embedding. `tenantContext.ts` uses `AsyncLocalStorage` to run each request in the correct hotel's config context, with a 60s cache. `TenantNotFoundError` → 404 on unknown slug.

---

## Key Config Structure (`HotelConfig`)

Stored as JSON in `Hotel.config`. Fields:
- `branding`: hotel name, tagline, accent color, logo, welcome/farewell messages
- `contact`: phone, email, website, address, city, country
- `policies`: check-in/out times, cancellation, pets, smoking, extra bed, children
- `rooms[]`: name, category, price, currency, description, maxOccupancy, imageUrl
- `dining[]`: venue name, cuisine, hours, description
- `amenities[]`: name, description, hours
- `customFAQ[]`: question-answer pairs (editable in admin)
- `receptionistPersona`: system prompt override
- `voiceStyle`: warm | professional | energetic
- `language`: default BCP-47 code
- `supportedLanguages[]`: list of BCP-47 codes
- `telephony`: Telnyx/webhook config

Default config uses "Aurelian Grand" hotel as demo template.

---

## Voice Pipeline

1. Guest taps mic orb in `/assistant`
2. Audio recorded via `MediaRecorder` → VAD (RMS-based silence detection) → blob sent to `/api/stt`
3. STT transcribes → sanitized/junk-filtered transcript
4. Sent to `/api/chat/stream` (voice mode) — SSE response
5. Chat API runs `handleGuestServiceFlow` (booking/dining intent router) first; if not handled → Gemini/OpenAI
6. Tokens streamed back; UI pre-fetches TTS audio per sentence
7. Audio played via Nemotron TTS or browser SpeechSynthesis fallback
8. After speaking, auto-resumes listening (turn-taking loop)

Voice stack selectable via `VOICE_STACK=free|cloud` env var.

---

## Chat/Booking Intent Flow

Every message goes through `guestServiceFlow.ts` → `bookingFlow.ts` and `diningFlow.ts` via `shouldRunGuestServiceFlow`. Intents detected by regex + keyword matching:
- **Cancel**: `cancelBookingSafe` → FYI email, guest confirmation
- **Modify**: `modifyBookingSafe` → availability re-check, alternatives if conflict
- **Availability**: live inventory snapshot from DB
- **New booking**: collect dates → room → name+phone → confirm summary → `createBookingSafe` → guest email + SMS + staff FYI
- **Dining**: collect venue+date+time+partySize+contact → `createDiningReservationSafe`
- **Special request**: append note to existing booking, notify staff
- **Escalation**: `[ESCALATE]` tag in LLM reply triggers support ticket + urgent staff email

---

## RAG System

`src/lib/rag/` — hotel config chunked into embeddings stored in `KnowledgeChunk` table. Each user message retrieves top relevant chunks via cosine similarity, injected as `HOTEL FACTS` into the LLM prompt per turn. Gemini Live mode uses full hotel data in system prompt instead.

---

## Admin / Settings

- `/settings` — full hotel config editor (branding, rooms, FAQ gaps, inventory calendar, bookings list, staff notification center)
- `/admin/analytics` — interaction volume, escalation rate, language distribution, satisfaction
- `/admin/support` — escalation-only inbox (not routine booking FYIs)
- `/admin/login`, `/admin/register`, `/admin/forgot-password`, `/admin/reset-password`

---

## Key File Map

```
src/lib/
  bookingFlow.ts        # Intent router: book/modify/cancel/availability/special-requests
  diningFlow.ts         # Dining reservation flow
  guestServiceFlow.ts   # Unified service flow combining booking + dining
  bookingService.ts     # Transactional create/modify/cancel (DB writes)
  bookingNotify.ts      # Post-booking guest email + SMS + staff FYI
  responseEngine.ts     # LLM streaming (Gemini/OpenAI), system prompt builder
  hotelConfig.ts        # Config schema, defaults, load/update/reset
  tenantContext.ts      # AsyncLocalStorage multi-tenant request scoping
  escalation.ts         # [ESCALATE] tag detection → support ticket
  rag/augmentMessage.ts # RAG retrieval + hotel fact injection per turn
  voiceStack.ts         # free vs cloud voice provider selection
  voiceSilence.ts       # VAD constants
  voiceActivity.ts      # RMS measurement helpers

src/app/api/
  chat/route.ts         # Text chat endpoint (JSON)
  chat/stream/route.ts  # Voice chat SSE streaming
  stt/route.ts          # Speech-to-text (delegates to configured STT)
  tts/route.ts          # Text-to-speech (delegates to configured TTS)
  telephony/            # Telnyx + generic webhook
  bookings/             # Direct booking CRUD
  guest/                # Guest auth + guest bookings

src/components/
  BookingSummaryCard.tsx    # Booking confirmation card in chat
  DiningSummaryCard.tsx     # Dining confirmation card
  MyStayPanel.tsx           # Guest upcoming stays sidebar
  QuickActionsBar.tsx       # Sticky chat action chips
  ServiceHealthBar.tsx      # AI/DB/STT/SMS/email status indicators
  ConciergeAvatar.tsx       # Animated AI avatar
  VoicePresenceBar.tsx      # Waveform/presence animation
```
