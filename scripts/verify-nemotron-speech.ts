import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { getNemotronAsrEndpoint, getNemotronTtsEndpoint, getNvidiaApiKey } from "../src/lib/nemotronSpeech";
import { isNemotronVoiceConfigured, resolveNemotronVoice, synthesizeWithNemotronVoice } from "../src/lib/nemotronVoice";
import { isNemotronAsrConfigured } from "../src/lib/nemotronTranscribe";
import { getMinimaxApiBase, getMinimaxGroupId, isMinimaxTtsConfigured, synthesizeWithMinimaxTts } from "../src/lib/minimaxTts";

config({ path: ".env.local", override: true });
config({ override: true });

try {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    process.env[key] = value;
  }
} catch {
  // ignore if .env.local is absent
}

async function main() {
  const minimaxConfigured = isMinimaxTtsConfigured();
  console.log("MiniMax TTS checks:");
  console.log(`  API base: ${getMinimaxApiBase()}`);
  console.log(`  Group ID: ${getMinimaxGroupId() ? "set" : "missing — set MINIMAX_GROUP_ID"}`);
  console.log(`  TTS configured: ${minimaxConfigured}`);

  if (minimaxConfigured) {
    const minimaxSample = await synthesizeWithMinimaxTts({
      text: "Welcome to the hotel.",
      language: "en-US",
      voiceStyle: "warm",
    });
    if (minimaxSample.audio?.length) {
      console.log(
        `  TTS sample: ok (${minimaxSample.audio.length} bytes, ${minimaxSample.contentType ?? "audio/mpeg"})`
      );
      return;
    }
    console.error(`  TTS sample failed: ${minimaxSample.error ?? "unknown"}`);
    process.exitCode = 1;
    return;
  }

  const asrEndpoint = getNemotronAsrEndpoint();
  const ttsEndpoint = getNemotronTtsEndpoint();
  const apiKey = getNvidiaApiKey();

  console.log("Nemotron Speech checks:");
  console.log(`  ASR endpoint: ${asrEndpoint ?? "missing — set NEMOTRON_ASR_ENDPOINT"}`);
  console.log(`  TTS endpoint: ${ttsEndpoint ?? "missing — set NEMOTRON_TTS_ENDPOINT"}`);
  console.log(`  API key: ${apiKey ? "set" : "optional for local NIM"}`);
  console.log(`  ASR configured: ${isNemotronAsrConfigured()}`);
  console.log(`  TTS configured: ${isNemotronVoiceConfigured()}`);

  const voice = resolveNemotronVoice("en-US", "warm");
  console.log(`  Voice (en-US warm): ${voice?.voiceName ?? "unsupported"}`);

  if (!isNemotronVoiceConfigured()) {
    process.exitCode = 1;
    return;
  }

  const sample = await synthesizeWithNemotronVoice({
    text: "Welcome to the hotel.",
    language: "en-US",
    voiceStyle: "warm",
  });

  if (sample.audio?.length) {
    console.log(`  TTS sample: ok (${sample.audio.length} bytes, ${sample.contentType ?? "audio/wav"})`);
  } else {
    console.error(`  TTS sample failed: ${sample.error ?? "unknown"}`);
    process.exitCode = 1;
  }
}

void main();
