import "dotenv/config";
import { config as loadEnvLocal } from "dotenv";
import { buildAzureTtsUrl, resolveAzureSpeechRegion } from "../src/lib/azureSpeech";
import { isMaiTranscribeConfigured } from "../src/lib/maiTranscribe";
import { isMaiVoiceConfigured, resolveMaiVoice, synthesizeWithMaiVoice } from "../src/lib/maiVoice";

loadEnvLocal({ path: ".env.local", override: true });

function detectEndpointIssue(): string | undefined {
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT?.trim();
  if (!endpoint) return "AZURE_SPEECH_ENDPOINT is not set";

  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    if (url.pathname.includes("/portal") || host === "speech.microsoft.com" || host === "portal.azure.com") {
      return "AZURE_SPEECH_ENDPOINT looks like the Azure Portal URL. Use Keys and Endpoint → Endpoint from your Speech resource, or the Foundry Project endpoint (*.services.ai.azure.com).";
    }
    if (
      !host.includes("cognitiveservices.azure.com") &&
      !host.includes("services.ai.azure.com") &&
      !host.includes("api.cognitive.microsoft.com") &&
      !host.includes("speech.microsoft.com")
    ) {
      return "AZURE_SPEECH_ENDPOINT hostname does not look like an Azure Speech API endpoint.";
    }
  } catch {
    return "AZURE_SPEECH_ENDPOINT is not a valid URL";
  }

  return undefined;
}

async function main() {
  const region = resolveAzureSpeechRegion();
  const ttsUrl = buildAzureTtsUrl();
  const transcribeReady = isMaiTranscribeConfigured();
  const voiceReady = isMaiVoiceConfigured();
  const voice = resolveMaiVoice("en-US", "warm");

  console.log("Azure Speech checks:");
  console.log(`  Region resolved: ${region ? "yes" : "optional (using resource endpoint)"}`);
  console.log(`  TTS endpoint: ${ttsUrl ? "ready" : "missing — need AZURE_SPEECH_KEY + AZURE_SPEECH_ENDPOINT"}`);
  console.log(`  MAI-Transcribe: ${transcribeReady ? "configured" : "not configured"}`);
  console.log(`  MAI-Voice: ${voiceReady ? "configured" : "not configured"}`);
  if (voice) console.log(`  Default voice (en-US): ${voice.voiceName}`);

  const endpointIssue = detectEndpointIssue();
  if (endpointIssue) {
    console.error(`\n❌ ${endpointIssue}`);
    process.exit(1);
  }

  if (!voiceReady) {
    process.exit(1);
  }

  const sample = await synthesizeWithMaiVoice({
    text: "Welcome to the hotel. How may I help you today?",
    language: "en-US",
    voiceStyle: "warm",
  });

  if (sample.audio?.length) {
    console.log(`  TTS synthesis test: OK (${sample.audio.length} bytes audio)`);
    console.log("✅ MAI-Voice is working");
    return;
  }

  console.error("❌ TTS synthesis failed:", sample.error ?? "unknown error");
  process.exit(1);
}

main().catch((err) => {
  console.error("❌ Verification failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
