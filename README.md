# 🎙️ Global AI Hotel Receptionist (Gemini Edition)

> **Production-grade, AI-powered hotel receptionist built to handle guest inquiries via Web and Phone.**

This is a universal, multi-language voice assistant powered by **Google Gemini 2.5 Flash Lite**. It handles real-time natural language conversations, supports **34 languages**, and includes a robust **Standard Telephony** integration for real phone calls.

---

## ✨ Key Features (New!)

| Feature | Description |
|---------|-------------|
| 🧠 **Gemini 2.5 Brain** | Powered by high-speed **Google Gemini 2.5 Flash Lite** for intelligent, context-aware hotel responses. |
| 🛡️ **STT Failover** | Automatically switches to **Server-Side Transcription** if browser-native recognition fails (Network Error resilience). |
| 📞 **Telephony Integration** | Built-in **Webhook API** for real phone calls (compatible with Twilio, TingTing, and SIP providers). |
| 🌍 **34 Native Languages** | Seamlessly switches between languages like English, Nepali, Hindi, Spanish, Japanese, and more. |
| 🎨 **Dynamic Branding** | Instantly customize Hotel Name, Tagline, Logo, and **Receptionist Persona** via the admin panel. |
| 📱 **Call Overlay UI** | Immersive "Call Desk" experience with ringing animations and full-screen interaction. |

---

## 🚀 Technical Upgrades

- **AI Engine:** Google Gemini 2.5 Flash Lite (`/api/chat`)
- **Voice System:** Dual-mode Speech-to-Text (Browser Native + Gemini STT fallback)
- **Telephony:** Standard Webhook implementation (`/api/telephony/webhook`)
- **Shared Intelligence:** Unique `responseEngine.ts` shared across Web and Phone interfaces.

---

## 🛠️ Getting Started

### 1. Environment Variables
Rename `.env.example` to `.env.local` and add your keys:
```bash
# Required for Assistant Intelligence & Voice Transcription
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here

# Required for Telephony Webhooks
TELEPHONY_WEBHOOK_URL=/api/telephony/webhook
```

### 2. Configuration & Customization
To customize your hotel's details (like the **Telephone Number**), edit `src/lib/hotelConfig.ts` or use the Admin Panel:

```typescript
// Example: Customizing your Hotel's Phone Number
export const DEFAULT_HOTEL_CONFIG: HotelConfig = {
  branding: {
    hotelName: "Willow Hotel", // 🏨 Change your Hotel Name here
    tagline: "Virtual Receptionist AI",
    ...
  },
  contact: {
    phone: "+977-9800000000", // 📞 Customize your phone number here!
    email: "frontdesk@willowhotel.com",
    address: "Kathmandu, Nepal",
    ...
  },
  ...
};
```

---

## 📁 New API Routes

| Route | Purpose |
|-------|---------|
| `/api/chat` | Main AI response engine (Gemini-powered). |
| `/api/stt` | Fallback Speech-To-Text API (Gemini-powered). |
| `/api/telephony/webhook` | Receives real phone calls from your telephony provider. |
| `/api/config` | Manages global hotel settings and persona. |

---

## 🤝 Telephony Integration Guide

1. **Deploy** your project to a public URL (e.g., Vercel).
2. **Setup your Provider**: Sign up for Twilio or a similar SIP provider.
3. **Configure Webhook**: Point your phone number's "Voice Webhook" to `https://your-domain.com/api/telephony/webhook`.
4. **Call It**: The assistant will automatically greet callers and answer questions as the **Willow Hotel Receptionist**.

---

## 📜 License & Credits

Built with ❤️ by **Prabin Sharma** ([@prabin923](https://github.com/prabin923)).  
Powered by Next.js 16, Tailwind CSS v4, and Google Gemini.
