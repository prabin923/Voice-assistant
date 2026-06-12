import "dotenv/config";
import { getNemotronAsrEndpoint, getNemotronTtsEndpoint, getNvidiaApiKey } from "../src/lib/nemotronSpeech";
import { isNemotronVoiceConfigured, resolveNemotronVoice, synthesizeWithNemotronVoice } from "../src/lib/nemotronVoice";
import { isNemotronAsrConfigured } from "../src/lib/nemotronTranscribe";

async function main() {
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
