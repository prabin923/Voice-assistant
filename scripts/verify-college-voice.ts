import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { isGeminiConfigured } from "../src/lib/gemini";
import { synthesizeWithEdgeTts } from "../src/lib/edgeTts";
import { isSelfHostedSttConfigured } from "../src/lib/selfHostedStt";
import { describeVoiceStack, isFreeVoiceStack, shouldUseWhisperHttpServer } from "../src/lib/voiceStack";

config({ path: ".env.local", override: true });
config({ override: true });

try {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
} catch {
  /* optional */
}

async function main() {
  const stack = describeVoiceStack();
  console.log("College / free voice stack:");
  console.log(`  mode: ${stack.mode}`);
  console.log(`  STT path: ${stack.stt.join(" → ")}`);
  console.log(`  TTS path: ${stack.tts.join(" → ")}`);
  console.log(`  Whisper configured: ${isSelfHostedSttConfigured()}`);
  console.log(`  Whisper HTTP enabled: ${shouldUseWhisperHttpServer()}`);
  console.log(`  Gemini (chat/STT fallback): ${isGeminiConfigured() ? "yes" : "no"}`);

  if (!isFreeVoiceStack()) {
    console.warn("  Set VOICE_STACK=free in .env.local for the open-source college demo.");
  }

  if (!isSelfHostedSttConfigured() && !isGeminiConfigured()) {
    console.error("\nMissing STT. Run: npm run whisper:up");
    process.exitCode = 1;
    return;
  }

  const tts = await synthesizeWithEdgeTts({
    text: "Welcome to the hotel concierge demo.",
    language: "en-US",
    voiceStyle: "warm",
  });

  if (tts.audio?.length) {
    console.log(`\nTTS sample: ok (${tts.audio.length} bytes, ${tts.contentType ?? "audio/mpeg"})`);
  } else {
    console.error(`\nTTS sample failed: ${tts.error ?? "unknown"}`);
    process.exitCode = 1;
  }

  if (!shouldUseWhisperHttpServer() && !process.env.WHISPER_MODEL_PATH?.trim()) {
    console.warn(
      "\nWhisper STT not pointed at local Docker yet. Add to .env.local:\n" +
        "  WHISPER_STT_ENDPOINT=http://127.0.0.1:8000/v1\n" +
        "  WHISPER_STT_MODEL=base\n" +
        "Then run: npm run whisper:up"
    );
  } else if (shouldUseWhisperHttpServer()) {
    console.log("\nNext: npm run whisper:up (if not running), restart npm run dev, open /assistant");
  }
}

void main();
