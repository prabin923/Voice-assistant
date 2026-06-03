# Innovation Project Report

---

## Project Title

**StayNep AI Voice Receptionist** — An Intelligent Multilingual Voice Assistant for Hotel Guest Services

---

## Group Members

| S.N. | Name | Student ID |
|------|------|------------|
| 1.   | [Member 1 Name] | [Student ID] |
| 2.   | [Member 2 Name] | [Student ID] |
| 3.   | [Member 3 Name] | [Student ID] |
| 4.   | [Member 4 Name] | [Student ID] |

---

## Problem Statement

The hospitality industry in Nepal and across South Asia faces a critical operational challenge: providing **24/7 multilingual guest support** without incurring the high costs of round-the-clock multilingual staffing. Hotels, especially small to mid-sized properties, struggle with:

- **Language barriers**: Nepal's tourism industry serves guests from around the world, but most hotel staff are limited to Nepali and basic English, leading to miscommunication and poor guest experiences.
- **24/7 availability**: Front desk operations are often understaffed during night shifts and peak hours, causing long wait times and missed guest inquiries.
- **Inconsistent service quality**: Human receptionists vary in knowledge, mood, and availability. Guests frequently receive inaccurate or incomplete information about hotel policies, amenities, and local services.
- **High operational costs**: Hiring multilingual staff for 24/7 coverage is financially prohibitive for most hotels in Nepal, where average room rates are significantly lower than international standards.
- **Scalability**: As hotel chains grow, maintaining consistent service quality across multiple properties becomes increasingly difficult.

These problems directly impact guest satisfaction scores, online reviews, and ultimately revenue — the lifeblood of the hospitality business.

---

## Proposed Solution

**StayNep AI Voice Receptionist** is a web-based, AI-powered voice assistant that acts as a virtual front desk receptionist for hotels. It provides instant, accurate, and multilingual responses to guest inquiries through natural voice conversation.

### How it works:

1. **Voice Input**: Guests tap a microphone button and speak their question in any language. The audio is captured and sent to **OpenAI Whisper**, a state-of-the-art speech-to-text engine supporting 99+ languages.

2. **AI Processing**: The transcribed text is processed by **GPT-4o**, which has been configured with the specific hotel's data — room types, pricing, policies, amenities, dining options, and a custom AI persona. The AI generates a contextually relevant, warm, and professional response.

3. **Voice Output**: The response is spoken back to the guest using the browser's Speech Synthesis API in their preferred language, creating a natural conversational experience.

4. **Admin Dashboard**: Hotel administrators can register, log in, and fully customize their hotel's configuration — branding, policies, room types, dining venues, amenities, FAQs, and the AI's persona — through a secure, authenticated admin panel.

5. **Telephony Integration**: The system also supports phone-based interactions via webhook integration with telephony providers (TingTing/Twilio), enabling guests to call and interact with the AI receptionist.

### Key architectural decisions:
- **Multi-tenant ready**: Each hotel registers its own account with isolated configuration
- **Secure authentication**: JWT-based auth with HTTP-only cookies and bcrypt password hashing
- **Real-time voice interaction**: Sub-second response times for natural conversation flow
- **Responsive design**: Works on desktop, tablet, and mobile devices

---

## Innovative Idea

What makes StayNep AI Voice Receptionist unique:

1. **Voice-first, multilingual by design**: Unlike chatbot solutions that are text-based and English-centric, our system is built from the ground up for voice interaction in 99+ languages. A Japanese tourist can speak in Japanese and receive a spoken response in Japanese — no typing, no translation apps.

2. **Zero-code hotel customization**: Hotel owners with no technical background can fully configure the AI's knowledge base, personality, and branding through an intuitive admin dashboard. The AI immediately reflects these changes in guest interactions.

3. **Dual-channel support (Web + Phone)**: The same AI brain serves both web-based voice interactions and traditional phone calls through telephony integration — a single system for all guest touchpoints.

4. **Glassmorphic premium UI**: The interface features a modern glassmorphism design with animated interactions, making it visually appealing enough to be deployed as an in-room tablet interface or lobby kiosk.

5. **Nepal-focused with global capability**: Built specifically for the Nepali hospitality market (StayNep) but architecturally designed to serve hotels worldwide. Supports Nepali, Hindi, and all major tourist languages out of the box.

6. **Integration-ready for hotel management systems**: Designed as a modular component that will integrate into the broader StayNep hotel management platform, connecting guest inquiries with booking systems, housekeeping, and billing.

---

## SDG Goal Alignment

### SDG 8: Decent Work and Economic Growth
- Enhances productivity of hotel operations by automating repetitive front-desk inquiries
- Enables small hotels in Nepal to compete with larger chains by providing world-class guest service at a fraction of the cost
- Supports tourism growth — a key economic driver for Nepal (contributing ~7.9% of GDP)

### SDG 9: Industry, Innovation and Infrastructure
- Applies cutting-edge AI technology (GPT-4o, Whisper) to solve real hospitality industry challenges
- Builds digital infrastructure for Nepal's hotel industry, which is still largely manual
- Demonstrates how AI can be practically deployed in developing economies

### SDG 11: Sustainable Cities and Communities
- Improves the tourist experience in Nepali cities, contributing to sustainable tourism
- Reduces the need for physical infrastructure (multiple reception desks, call centers) through digital solutions

---

## Minimum Viable Product (MVP) Features

The current working prototype includes:

- **Voice-to-voice conversation**: Tap to speak, get spoken responses in real-time
- **Multilingual support**: Speech recognition and responses in 99+ languages via OpenAI Whisper + GPT-4o
- **Hotel admin authentication**: Secure registration and login system for hotel administrators
- **Admin configuration dashboard** with 8 customizable sections:
  - Hotel branding (name, tagline, accent color, welcome/farewell messages)
  - Contact information (phone, email, website, address)
  - Hotel policies (check-in/out, cancellation, pet, smoking, child policies)
  - Room types (name, price, currency, description, max occupancy)
  - Dining venues (name, cuisine, hours, description)
  - Amenities (name, description, hours)
  - Custom FAQ (trigger keywords and responses)
  - AI Persona (system prompt customization)
- **Route protection**: Secure middleware preventing unauthorized access to admin features
- **Telephony webhook**: Phone call integration endpoint for voice-based phone interactions
- **Concierge call mode**: Direct telephony interface within the web app
- **Responsive glassmorphic UI**: Premium dark-themed interface with animations
- **Conversation history**: In-session chat log showing user and assistant messages

---

## Future Additions/Enhancements

After the MVP stage, we plan to implement:

1. **Multi-tenant database**: Persist each hotel's configuration in the database (currently in-memory), enabling true multi-hotel support
2. **Booking integration**: Allow guests to check room availability and make reservations through voice commands
3. **StayNep platform integration**: Connect the voice assistant with the full StayNep hotel management system (PMS, billing, housekeeping)
4. **Analytics dashboard**: Track guest inquiry patterns, peak hours, common questions, and satisfaction metrics
5. **Custom voice cloning**: Allow hotels to create a unique AI voice that matches their brand identity
6. **Offline mode**: Cache common responses for areas with poor internet connectivity (critical for Nepal)
7. **WhatsApp/Viber integration**: Extend the AI to messaging platforms popular in Nepal
8. **Multi-property management**: Single admin account managing multiple hotel properties
9. **Guest feedback collection**: Post-interaction satisfaction surveys
10. **Smart escalation**: Automatically route complex queries to human staff with full conversation context

---

## Target Audience

| Segment | Description |
|---------|-------------|
| **Small to mid-sized hotels in Nepal** | Properties with 10-100 rooms that cannot afford 24/7 multilingual staff |
| **Tourist-area hotels** | Hotels in Kathmandu, Pokhara, Chitwan, and Lumbini serving international tourists |
| **Hotel chains** | Growing chains like StayNep that need consistent service across properties |
| **Boutique and heritage hotels** | Properties seeking a premium tech-forward guest experience |
| **International tourists** | Guests who need information in their native language |
| **Domestic travelers** | Nepali-speaking guests who prefer voice interaction over text |

---

## Technology/Tools Used

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Frontend** | Next.js 16, React 19, TypeScript | Web application framework |
| **Styling** | Tailwind CSS v4 | Utility-first CSS with glassmorphism design |
| **Speech-to-Text** | OpenAI Whisper API | Multilingual audio transcription (99+ languages) |
| **AI Chat** | OpenAI GPT-4o | Intelligent, context-aware hotel receptionist responses |
| **Text-to-Speech** | Web Speech Synthesis API | Browser-native spoken responses |
| **Authentication** | jose (JWT), bcryptjs | Secure token-based auth with password hashing |
| **Database** | SQLite (better-sqlite3) | Lightweight hotel account storage |
| **Telephony** | TingTing/Twilio webhooks | Phone call integration |
| **Deployment** | Vercel (planned) | Serverless hosting with edge network |
| **Version Control** | Git, GitHub | Source code management |
| **Package Manager** | npm | Dependency management |
| **Dev Tools** | Turbopack, ESLint | Fast development builds and code quality |

---

## Project Timeline/Milestones

| Phase | Timeline | Milestone | Status |
|-------|----------|-----------|--------|
| **Phase 1** | Week 1-2 | Project ideation, research, and tech stack selection | Completed |
| **Phase 2** | Week 3-4 | Core voice assistant with Gemini integration | Completed |
| **Phase 3** | Week 5-6 | Premium glassmorphic UI, multilingual support, telephony integration | Completed |
| **Phase 4** | Week 7 | Authentication system, admin dashboard security | Completed |
| **Phase 5** | Week 8 | Migration to OpenAI (Whisper + GPT-4o) for better multilingual support | Completed |
| **Phase 6** | Week 9-10 | Testing, bug fixes, documentation, and project report | In Progress |
| **Phase 7** | Week 11-12 | Presentation preparation and demo | Upcoming |
| **Phase 8** | Post-submission | StayNep platform integration and production deployment | Planned |

---

## Potential Challenges

| Challenge | Impact | Mitigation Strategy |
|-----------|--------|---------------------|
| **API costs** | OpenAI API usage incurs per-request charges that scale with users | Implement response caching, use cheaper models for simple queries, set rate limits per hotel |
| **Internet dependency** | Nepal has inconsistent internet, especially outside Kathmandu | Implement offline fallback mode with cached FAQs, use browser Speech API as STT fallback |
| **Audio quality** | Background noise in hotel lobbies can affect transcription accuracy | Use noise suppression, allow text input as fallback, tune Whisper language hints |
| **Latency** | Voice interactions need sub-2-second response times for natural feel | Use streaming responses, optimize prompt length, deploy on edge servers close to Nepal |
| **Data privacy** | Guest voice data must be handled responsibly | Process audio server-side without storage, use HTTPS, implement data retention policies |
| **Language accuracy** | Some low-resource languages may have lower transcription accuracy | Prioritize testing with Nepali, Hindi, Chinese, Japanese, Korean — the top tourist languages |
| **Adoption resistance** | Hotel staff may resist AI tools due to job displacement fears | Position as a staff augmentation tool, not replacement; handle overflow and after-hours only |

---

## Market Research

### Nepal Hotel Industry Overview
- Nepal has **1,200+ registered hotels** and **3,500+ accommodation providers**
- Tourism contributed **NPR 240 billion** (~$1.8B USD) to Nepal's economy in 2024
- Nepal welcomed **1.2 million+ international tourists** in 2025, with a government target of **2.5 million by 2030**
- **68%** of tourists cite "communication difficulty" as a challenge during their Nepal stay (Nepal Tourism Board Survey)

### Competitive Landscape
| Solution | Limitation |
|----------|-----------|
| Traditional reception | Limited hours, language barriers, inconsistent quality |
| Generic chatbots (Tidio, Drift) | Text-only, English-centric, no hotel-specific knowledge |
| IVR phone systems | Rigid menu trees, frustrating user experience, no AI |
| Connie by Hilton (AI concierge) | Enterprise-only, prohibitively expensive for Nepali hotels |

### Our Advantage
- **Price point**: Designed for Nepal's market where average room rates are $20-80/night
- **Multilingual voice-first**: No competitor offers voice-based multilingual support for small hotels
- **StayNep ecosystem**: Future integration with a full hotel management platform creates a unique value proposition
- **Local market understanding**: Built by Nepali developers who understand the specific challenges of Nepal's hospitality industry

### Revenue Model (Post-College)
- **Freemium**: Basic voice assistant free for up to 100 interactions/month
- **Pro**: NPR 2,000/month (~$15) for unlimited interactions + analytics
- **Enterprise**: Custom pricing for hotel chains with multi-property support

---

## Visual Representations

### System Architecture

```
                        +------------------+
                        |   Hotel Guest    |
                        | (Web / Phone)    |
                        +--------+---------+
                                 |
                    Voice Input / Phone Call
                                 |
                        +--------v---------+
                        |   Next.js App    |
                        |  (Frontend UI)   |
                        +--------+---------+
                                 |
                 +---------------+---------------+
                 |               |               |
          +------v------+ +-----v------+ +------v------+
          | /api/stt    | | /api/chat  | | /api/       |
          | (Whisper)   | | (GPT-4o)   | | telephony   |
          +------+------+ +-----+------+ +------+------+
                 |               |               |
                 v               v               v
          +------+------+ +-----+------+ +------+------+
          |   OpenAI    | |  OpenAI    | | Response    |
          | Whisper API | | GPT-4o API | | Engine      |
          +-------------+ +-----+------+ +-------------+
                               |
                        +------v------+
                        | Hotel Config|
                        | (In-Memory) |
                        +-------------+

        +------------------+     +-------------------+
        |  Admin Panel     |     |  Auth System      |
        |  /settings       |<--->|  JWT + SQLite     |
        |  (8 config tabs) |     |  proxy.ts guard   |
        +------------------+     +-------------------+
```

### User Interaction Flow

```
  Guest speaks       Audio recorded      Whisper STT        GPT-4o generates
  in any language --> by browser    -->  transcribes   -->  contextual response
       |                                 to text            using hotel data
       |                                                         |
       +-- Spoken response <-- Speech Synthesis <-- AI Reply ----+
           in guest's language
```

### Admin Authentication Flow

```
  Hotel Admin          Register/Login       JWT Token          Protected
  visits /admin  -->  with email &    -->  stored in     -->  /settings
  /login               password           HTTP-only cookie    accessible
```

---

*This project is developed as part of our college innovation initiative and serves as the foundation for StayNep — a comprehensive hotel management platform for Nepal's growing hospitality industry.*
