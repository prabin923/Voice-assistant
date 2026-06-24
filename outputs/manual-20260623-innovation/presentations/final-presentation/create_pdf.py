from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import textwrap


ROOT = Path("/Users/prabinsharma/voice-assistant")
OUT = ROOT / "outputs/manual-20260623-innovation/presentations/final-presentation/output/Innovation Project Final Presentation Format.pdf"
LOGO = ROOT / "public/logos/staynep-light.png"

W, H = 1920, 1080
BG = "#071114"
PAPER = "#F5F1E8"
INK = "#ECF4EE"
MUTED = "#A9B7AF"
GREEN = "#36D399"
GOLD = "#F6C56D"
BLUE = "#7CC7F2"
RED = "#FF7A7A"
LINE = "#24413A"

FONT_DIR = Path("/System/Library/Fonts")
SUP = FONT_DIR / "Supplemental"


def font(size, bold=False, serif=False):
    if serif:
        path = FONT_DIR / "NewYork.ttf"
    elif bold:
        path = FONT_DIR / "HelveticaNeue.ttc"
    else:
        path = FONT_DIR / "Avenir.ttc"
    try:
        return ImageFont.truetype(str(path), size=size)
    except Exception:
        return ImageFont.load_default(size=size)


F_TITLE = font(74, bold=True, serif=True)
F_H1 = font(50, bold=True, serif=True)
F_H2 = font(34, bold=True)
F_BODY = font(29)
F_SMALL = font(23)
F_TINY = font(18)
F_NUM = font(66, bold=True)


def text_box(draw, xy, text, fnt, fill=INK, width=42, line_gap=10, anchor=None):
    lines = []
    for para in str(text).split("\n"):
        if not para:
            lines.append("")
        else:
            lines.extend(textwrap.wrap(para, width=width, break_long_words=False))
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill, anchor=anchor)
        y += fnt.size + line_gap
    return y


def rounded(draw, box, fill, outline=None, radius=28, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def base(slide_no, kicker, title, subtitle=None):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, H), fill=BG)
    d.rectangle((0, 0, 80, H), fill="#0D2A24")
    d.line((150, 910, 1770, 910), fill=LINE, width=2)
    d.ellipse((138, 82, 158, 102), fill=GREEN)
    d.text((178, 73), kicker.upper(), font=F_TINY, fill=GREEN)
    d.text((150, 120), title, font=F_H1, fill=INK)
    if subtitle:
        text_box(d, (152, 200), subtitle, F_SMALL, fill=MUTED, width=95, line_gap=8)
    d.text((1730, 952), f"{slide_no:02d} / 18", font=F_TINY, fill=MUTED)
    d.text((150, 952), "StayNep AI Voice Receptionist", font=F_TINY, fill=MUTED)
    return im, d


def metric(d, x, y, value, label, color=GREEN):
    d.text((x, y), value, font=F_NUM, fill=color)
    text_box(d, (x, y + 78), label, F_SMALL, fill=INK, width=17, line_gap=6)


def card(d, x, y, w, h, title, body, color=GREEN):
    rounded(d, (x, y, x + w, y + h), "#10211E", outline="#294A43", radius=24, width=2)
    d.rectangle((x, y, x + 8, y + h), fill=color)
    d.text((x + 34, y + 28), title, font=F_H2, fill=INK)
    text_box(d, (x + 34, y + 84), body, F_TINY, fill=MUTED, width=max(22, int(w / 18)), line_gap=5)


def flow(d, items, y):
    x0, gap, bw, bh = 130, 36, 315, 165
    for i, (num, title, body) in enumerate(items):
        x = x0 + i * (bw + gap)
        rounded(d, (x, y, x + bw, y + bh), "#10211E", outline="#2C524A", radius=22)
        d.text((x + 24, y + 24), num, font=F_SMALL, fill=GOLD)
        d.text((x + 24, y + 58), title, font=F_H2, fill=INK)
        text_box(d, (x + 24, y + 110), body, F_TINY, fill=MUTED, width=26, line_gap=5)
        if i < len(items) - 1:
            ax = x + bw + 8
            d.line((ax, y + bh / 2, ax + gap - 16, y + bh / 2), fill=GREEN, width=4)
            d.polygon([(ax + gap - 16, y + bh / 2 - 8), (ax + gap - 16, y + bh / 2 + 8), (ax + gap - 4, y + bh / 2)], fill=GREEN)


slides = []

# 1
im = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(im)
d.rectangle((0, 0, W, H), fill=BG)
d.rectangle((0, 0, 620, H), fill="#0D2A24")
if LOGO.exists():
    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((260, 120))
    im.paste(logo, (150, 110), logo)
d.text((150, 280), "AI Voice Receptionist", font=F_TITLE, fill=INK)
d.text((150, 375), "for Hotels & Hospitality", font=F_H1, fill=GREEN)
text_box(d, (150, 500), "Intelligent 24/7 multilingual hotel reception powered by generative AI, live inventory, and autonomous booking.", F_BODY, fill=PAPER, width=49, line_gap=12)
card(d, 860, 190, 780, 130, "Group Name", "Team Think", GOLD)
card(d, 860, 360, 780, 260, "Team Members", "Prabin Sharma\nNikesh Kumar Sah\nDhrub Narayan Yadav\nRiyaj Khadka", BLUE)
card(d, 860, 660, 780, 160, "Project", "StayNep AI Voice Receptionist", GREEN)
d.text((150, 952), "Innovation Project Final Presentation", font=F_TINY, fill=MUTED)
slides.append(im)

# 2
im, d = base(2, "Executive Summary", "Hotels get an always-on multilingual front desk.", "What the project is, who it serves, and why it matters.")
card(d, 150, 300, 760, 170, "One-sentence pitch", "A voice-first AI receptionist that answers guest questions, checks availability, and completes bookings without front-desk handoff.", GREEN)
card(d, 970, 300, 760, 170, "Problem", "Hotels lose guest trust and bookings when staff are busy, offline, or unable to speak the guest's language.", RED)
card(d, 150, 520, 760, 170, "Solution", "StayNep combines speech, Gemini/OpenAI reasoning, hotel-specific knowledge, live inventory, and confirmations in one assistant.", BLUE)
card(d, 970, 520, 760, 170, "Target users", "Hotels, resorts, guesthouses, homestays, and travel operators that need affordable 24/7 guest service.", GOLD)
metric(d, 180, 745, "34", "supported languages", GREEN)
metric(d, 480, 745, "24/7", "guest support", BLUE)
metric(d, 780, 745, "0", "routine handoff target", GOLD)
slides.append(im)

# 3
im, d = base(3, "Problem Statement", "Routine hotel service still depends on staff availability.", "The pain is most visible during off-hours, peak season, and multilingual guest interactions.")
for x, value, label, color in [(150, "Off-hours", "Guests still expect answers after reception desks slow down.", RED), (585, "Language gaps", "International and domestic travelers may not share one service language.", GOLD), (1020, "Missed bookings", "Slow replies turn high-intent inquiries into lost revenue.", BLUE), (1455, "Staff load", "Front desks repeat the same FAQ and booking tasks every day.", GREEN)]:
    rounded(d, (x, 310, x + 350, 570), "#10211E", outline="#294A43", radius=28)
    d.text((x + 28, 345), value, font=F_H2, fill=color)
    text_box(d, (x + 28, 420), label, F_SMALL, fill=INK, width=24, line_gap=8)
text_box(d, (220, 685), "Real-life example: a guest asks about room availability late at night, wants a reply in their own language, and expects confirmation immediately. A traditional desk may need a callback; StayNep can continue the workflow in the same conversation.", F_BODY, fill=PAPER, width=88, line_gap=12)
slides.append(im)

# 4
im, d = base(4, "Customer Discovery & Empathy", "The strongest signal is operational friction, not lack of websites.", "Discovery focused on hotel owners, reception teams, guests, and tourism businesses.")
quotes = [
    ("Hotel owner", "Hiring and retaining reception staff is expensive and inconsistent.", "Need: lower routine-service cost."),
    ("Reception team", "Peak-hour calls and repeated questions interrupt higher-value work.", "Need: triage and automation."),
    ("Guest", "I want answers in my language without waiting for a person.", "Need: instant, natural support."),
    ("Tourism operator", "Slow inquiry follow-up can lose group bookings.", "Need: faster conversion.")
]
for i, (role, q, learn) in enumerate(quotes):
    x = 150 + (i % 2) * 850
    y = 310 + (i // 2) * 240
    card(d, x, y, 760, 185, role, f'"{q}"\n{learn}', [GREEN, GOLD, BLUE, RED][i])
text_box(d, (190, 830), "What we learned: guests do not want another static FAQ; hotels need an assistant that understands intent, checks real data, and knows when a human is truly required.", F_BODY, fill=PAPER, width=88, line_gap=12)
slides.append(im)

# 5
im, d = base(5, "Proposed Solution", "A complete guest-service workflow runs inside the conversation.", "Voice input becomes action: answer, availability check, booking, dining reservation, cancellation, or escalation.")
flow(d, [("01", "Guest speaks", "Mic, phone, embed, or text input"), ("02", "STT", "Transcript is sanitized and validated"), ("03", "Intent router", "Booking, dining, FAQ, or escalation"), ("04", "Live data", "Prisma inventory and hotel config"), ("05", "Response", "Streaming answer plus TTS")], 330)
card(d, 220, 650, 430, 150, "Value", "Guests get immediate service without waiting for reception.", GREEN)
card(d, 745, 650, 430, 150, "Hotel benefit", "Staff handle exceptions while AI handles routine volume.", GOLD)
card(d, 1270, 650, 430, 150, "Proof in repo", "Booking, dining, RAG, guest auth, admin, and telephony routes are implemented.", BLUE)
slides.append(im)

# 6
im, d = base(6, "Innovation & Uniqueness", "StayNep moves from 'chatbot' to autonomous receptionist.", "The Blue Ocean is voice + multilingual hospitality context + live operations.")
card(d, 130, 300, 500, 390, "Me Too: basic chatbot", "Text-only FAQ\nScripted answers\nNo inventory awareness\nNo booking transaction\nWeak language switching", RED)
card(d, 710, 300, 500, 390, "Traditional desk", "Human warmth\nLimited hours\nSingle-location capacity\nHigh recurring cost\nPeak-hour overload", GOLD)
card(d, 1290, 300, 500, 390, "Only Me: StayNep", "Voice-to-voice service\n34-language support\nHotel-specific RAG\nAutonomous booking/dining\nFYI vs escalation routing", GREEN)
text_box(d, (210, 770), "Competitive advantage: the assistant connects natural conversation to real hotel operations, so it can complete service rather than only describe service.", F_BODY, fill=PAPER, width=85, line_gap=12)
slides.append(im)

# 7
im, d = base(7, "Features Overview", "The product system covers guest, staff, and admin workflows.", "Major capabilities visible in the application and codebase.")
features = [
    ("Voice-to-voice chat", "STT, streaming response, TTS"),
    ("Autonomous booking", "create, modify, cancel"),
    ("Live inventory", "availability and alternatives"),
    ("Dining reservations", "venue, time, party size"),
    ("Guest accounts", "My Stay panel and history"),
    ("Admin settings", "hotel config, FAQ, inventory"),
    ("Staff notifications", "FYI emails and urgent tickets"),
    ("Embed/telephony", "web widget, Telnyx, WhatsApp")
]
for i, (t, b) in enumerate(features):
    x = 150 + (i % 4) * 435
    y = 300 + (i // 4) * 245
    card(d, x, y, 370, 175, t, b, [GREEN, BLUE, GOLD, RED][i % 4])
slides.append(im)

# 8
im, d = base(8, "AI Integration", "AI is the reasoning layer that turns speech into service.", "Without AI, the product becomes a static form plus FAQ.")
flow(d, [("A", "Transcribe", "Speech becomes validated text"), ("B", "Understand", "Intent, dates, room type, language"), ("C", "Retrieve", "Hotel facts and relevant knowledge chunks"), ("D", "Decide", "Book, answer, ask, or escalate"), ("E", "Speak", "Natural response in guest language")], 310)
card(d, 250, 620, 620, 175, "AI functionality", "Gemini/OpenAI response engine, RAG augmentation, multilingual replies, booking-state reasoning, and escalation detection.", GREEN)
card(d, 1010, 620, 620, 175, "If AI is removed", "The system loses natural language understanding, voice conversation, multilingual adaptability, and autonomous service decisions.", RED)
slides.append(im)

# 9
im, d = base(9, "Technology Stack", "The architecture is modern, typed, and deployment-ready.", "Core technologies used by the current repository.")
stack = [
    ("Frontend", "Next.js 16\nReact 19\nTypeScript\nTailwind CSS v4"),
    ("Backend", "App Router API routes\nSSE streaming\nAuth, rate limits\nValidation"),
    ("Database", "Prisma ORM\nPostgreSQL / Prisma Postgres\nHotel, booking, guest models"),
    ("AI tools", "Google Gemini\nOpenAI fallback\nRAG embeddings\nPrompt engine"),
    ("Voice/APIs", "Nemotron/Whisper/Gemini STT\nEdge/Nemotron/OpenAI TTS\nTelnyx, WhatsApp, TingTing"),
    ("Hosting", "Vercel\nEdge-ready routes\nService health checks")
]
for i, (t, b) in enumerate(stack):
    x = 150 + (i % 3) * 555
    y = 300 + (i // 3) * 280
    card(d, x, y, 490, 215, t, b, [GREEN, BLUE, GOLD][i % 3])
slides.append(im)

# 10
im, d = base(10, "Business Model", "A subscription model converts hotel automation into recurring revenue.", "Pricing can scale from small guesthouses to hotel groups.")
plans = [("Starter", "$49/mo", "Small hotels\n1 AI receptionist\nCore FAQ + voice\nEmail support"), ("Professional", "$149/mo", "Mid-size hotels\nBooking + dining flows\nAnalytics\nPriority support"), ("Enterprise", "Custom", "Hotel chains\nCustom integrations\nTelephony volume\nDedicated setup")]
for i, (name, price, body) in enumerate(plans):
    x = 190 + i * 570
    rounded(d, (x, 310, x + 490, 475), "#12342C", outline="#3B665B", radius=28)
    d.text((x + 32, 340), name, font=F_H2, fill=INK)
    d.text((x + 32, 395), price, font=F_NUM, fill=[GREEN, GOLD, BLUE][i])
    card(d, x, 500, 490, 250, "Includes", body, [GREEN, GOLD, BLUE][i])
text_box(d, (250, 815), "Future sustainability: subscriptions, setup fees, PMS/CRM integration packages, and usage-based telephony or message volume.", F_BODY, fill=PAPER, width=80, line_gap=12)
slides.append(im)

# 11
im, d = base(11, "Market & Competitor Analysis", "Customers choose the option that combines availability, language, and action.", "Simple comparison table across realistic alternatives.")
cols = ["Criteria", "Human desk", "FAQ bot", "Generic AI tool", "StayNep"]
rows = [
    ["24/7 service", "Limited", "Yes", "Yes", "Yes"],
    ["Voice support", "Yes", "No", "Partial", "Yes"],
    ["Hotel-specific data", "Yes", "Static", "Manual setup", "Built in"],
    ["Live booking action", "Manual", "No", "No", "Yes"],
    ["Multilingual scale", "Limited", "Low", "Medium", "34 languages"],
    ["Staff workload", "High", "Medium", "Medium", "Lower"]
]
x0, y0, cw, rh = 150, 290, 330, 76
for c, htxt in enumerate(cols):
    d.rectangle((x0 + c*cw, y0, x0 + (c+1)*cw, y0 + rh), fill="#12342C", outline=LINE)
    d.text((x0 + c*cw + 20, y0 + 22), htxt, font=F_SMALL, fill=GREEN if c == 4 else INK)
for r, row in enumerate(rows):
    for c, val in enumerate(row):
        fill = "#0C1A18" if r % 2 else "#10211E"
        d.rectangle((x0 + c*cw, y0 + (r+1)*rh, x0 + (c+1)*cw, y0 + (r+2)*rh), fill=fill, outline=LINE)
        d.text((x0 + c*cw + 20, y0 + (r+1)*rh + 22), val, font=F_SMALL, fill=GREEN if c == 4 else INK)
card(d, 1180, 815, 510, 110, "Market opportunity", "Nepal's hotels and SMEs need affordable automation that feels local, multilingual, and operationally useful.", GOLD)
slides.append(im)

# 12
im, d = base(12, "SDG Alignment", "The project supports economic growth and digital innovation.", "StayNep aligns most directly with SDG 8 and SDG 9.")
card(d, 210, 310, 650, 380, "SDG 8: Decent Work & Economic Growth", "Reduces routine operational pressure.\nHelps small hotels serve guests continuously.\nCreates room for staff to focus on higher-value hospitality.\nSupports tourism-driven business growth.", GREEN)
card(d, 1060, 310, 650, 380, "SDG 9: Industry, Innovation & Infrastructure", "Applies generative AI to hospitality infrastructure.\nMakes advanced automation accessible to SMEs.\nEncourages local technology adoption.\nBuilds scalable digital service channels.", BLUE)
text_box(d, (250, 770), "Impact: better guest service, stronger small-hotel competitiveness, and more efficient use of human staff.", F_BODY, fill=PAPER, width=82, line_gap=12)
slides.append(im)

# 13
im, d = base(13, "Development Journey", "The project moved from concept to working product through staged delivery.", "Timeline summary for the Innovation Fest build.")
milestones = [("Week 1-2", "Problem discovery", GREEN), ("Week 3-4", "Research and stack", BLUE), ("Week 5-6", "UI and app shell", GOLD), ("Week 7-9", "Booking + admin", GREEN), ("Week 10-11", "AI + voice stack", BLUE), ("Week 12", "Testing and fixes", GOLD), ("Week 13", "Deployment prep", GREEN)]
x1, y = 180, 510
d.line((x1, y, 1710, y), fill=LINE, width=8)
for i, (wk, label, color) in enumerate(milestones):
    x = x1 + i * 255
    d.ellipse((x - 20, y - 20, x + 20, y + 20), fill=color)
    d.text((x - 75, y - 120), wk, font=F_SMALL, fill=color)
    text_box(d, (x - 85, y + 45), label, F_SMALL, fill=INK, width=14, line_gap=6)
card(d, 330, 730, 1260, 130, "Milestones achieved", "Working voice assistant, autonomous booking flows, dining reservations, RAG knowledge, admin settings, analytics/support screens, guest auth, service health, and deployment configuration.", GREEN)
slides.append(im)

# 14
im, d = base(14, "Challenges & Lessons Learned", "The hard parts were reliability, context, and production behavior.", "Each challenge led to an implementation improvement.")
items = [
    ("Speech accuracy", "Added multiple STT options, validation, and silence detection."),
    ("Hotel-specific answers", "Built config-driven prompts and RAG knowledge chunks."),
    ("Booking conflicts", "Used transactional booking service and alternative suggestions."),
    ("Escalation noise", "Separated routine FYI notifications from urgent tickets."),
    ("Multi-tenant context", "Introduced slug-based tenant routing and scoped config."),
    ("Deployment readiness", "Added env examples, health route, tests, and provider fallbacks.")
]
for i, (t, b) in enumerate(items):
    x = 150 + (i % 2) * 850
    y = 285 + (i // 2) * 190
    card(d, x, y, 760, 135, t, b, [RED, GOLD, BLUE, GREEN, GOLD, BLUE][i])
slides.append(im)

# 15
im, d = base(15, "Future Enhancements", "One more month would deepen integrations and reliability.", "Roadmap from near-term demo polish to scalable product.")
road = [("Week 1", "Demo hardening\nSeed data, offline video, QA scripts"), ("Week 2", "WhatsApp + telephony\nProduction call flows and logs"), ("Week 3", "PMS integration\nReal hotel booking-system connector"), ("Week 4", "Analytics + learning\nFAQ gap review and CSAT improvements"), ("Later", "Mobile app + CRM\nGuest memory, loyalty, IoT controls")]
flow(d, [(a, b.split("\n")[0], "\n".join(b.split("\n")[1:])) for a, b in road], 350)
card(d, 300, 650, 560, 160, "Scaling strategy", "Package the assistant as an embeddable widget plus managed onboarding for hotels.", GREEN)
card(d, 1060, 650, 560, 160, "More AI features", "Voice personalization, better multilingual evaluation, and smarter service recovery.", BLUE)
slides.append(im)

# 16
im, d = base(16, "Live Demo", "The demo should prove the core workflow in under five minutes.", "Show login only if needed; move quickly to voice, booking, and output.")
steps = [("01", "Open assistant", "Show branded hotel UI"), ("02", "Ask availability", "Use voice or text input"), ("03", "Confirm booking", "Collect dates, room, name, phone"), ("04", "Show result", "Booking card + confirmation"), ("05", "Switch language", "Repeat a simple guest question")]
flow(d, steps, 300)
card(d, 220, 630, 460, 180, "AI features to show", "Speech-to-text, streamed response, TTS, multilingual reply, RAG hotel facts.", GREEN)
card(d, 730, 630, 460, 180, "Operational output", "Live availability, booking confirmation, staff FYI, guest My Stay panel.", GOLD)
card(d, 1240, 630, 460, 180, "Demo backup", "Keep sample data ready, stable internet/hotspot, and a short recorded backup.", BLUE)
slides.append(im)

# 17
im, d = base(17, "Impact & Conclusion", "StayNep creates measurable value for hotels and guests.", "The project solves a real service bottleneck with a working technical system.")
metric(d, 220, 310, "24/7", "continuous guest service", GREEN)
metric(d, 560, 310, "34", "language coverage", BLUE)
metric(d, 900, 310, "Live", "inventory and booking", GOLD)
metric(d, 1240, 310, "FYI", "not ticket spam", GREEN)
card(d, 220, 600, 410, 170, "Problem solved", "Guests get answers and actions without waiting for reception.", GREEN)
card(d, 755, 600, 410, 170, "Value created", "Hotels reduce routine workload and recover missed inquiries.", GOLD)
card(d, 1290, 600, 410, 170, "Innovation achieved", "Voice AI is connected to real hospitality operations.", BLUE)
slides.append(im)

# 18
im, d = base(18, "Final Pitch", "Every hotel deserves a receptionist that never sleeps.", "Why users should adopt it, and why investors should believe in it.")
card(d, 170, 300, 500, 330, "Why users adopt", "Faster responses\nService in the guest's language\nBooking without waiting\nConsistent answers from hotel data", GREEN)
card(d, 710, 300, 500, 330, "Why hotels buy", "Lower routine workload\nMore captured inquiries\nScalable front desk capacity\nClear escalation path", GOLD)
card(d, 1250, 300, 500, 330, "Why investors believe", "Subscription revenue\nLarge hospitality SME market\nExpandable integrations\nBuilt product foundation", BLUE)
text_box(d, (250, 735), "The future of hospitality is not only a person behind a desk. It is a service layer that is always available, multilingual, and connected to the hotel's real operations.", F_BODY, fill=PAPER, width=80, line_gap=12)
d.text((770, 900), "Team Think  |  StayNep AI Voice Receptionist", font=F_SMALL, fill=GREEN)
slides.append(im)

OUT.parent.mkdir(parents=True, exist_ok=True)
slides[0].save(OUT, save_all=True, append_images=slides[1:], resolution=144.0)
print(OUT)
