/** Shared NVIDIA Nemotron Speech NIM configuration (ASR + TTS). */

export interface NemotronSpeechConfig {
  apiKey?: string;
  asrEndpoint: string;
  ttsEndpoint: string;
}

function trimEndpoint(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : undefined;
}

export function getNvidiaApiKey(): string | undefined {
  return (
    process.env.NVIDIA_API_KEY?.trim() ||
    process.env.NGC_API_KEY?.trim() ||
    undefined
  );
}

export function getNemotronAsrEndpoint(): string | undefined {
  return (
    trimEndpoint(process.env.NEMOTRON_ASR_ENDPOINT) ||
    trimEndpoint(process.env.NEMOTRON_SPEECH_ENDPOINT)
  );
}

export function getNemotronTtsEndpoint(): string | undefined {
  return (
    trimEndpoint(process.env.NEMOTRON_TTS_ENDPOINT) ||
    trimEndpoint(process.env.NEMOTRON_SPEECH_ENDPOINT)
  );
}

export function getNemotronSpeechConfig(): NemotronSpeechConfig | undefined {
  const asrEndpoint = getNemotronAsrEndpoint();
  const ttsEndpoint = getNemotronTtsEndpoint();
  if (!asrEndpoint && !ttsEndpoint) return undefined;

  return {
    apiKey: getNvidiaApiKey(),
    asrEndpoint: asrEndpoint ?? ttsEndpoint!,
    ttsEndpoint: ttsEndpoint ?? asrEndpoint!,
  };
}

export function isNemotronAsrConfigured(): boolean {
  return Boolean(getNemotronAsrEndpoint());
}

export function isNemotronTtsConfigured(): boolean {
  return Boolean(getNemotronTtsEndpoint());
}

export function nemotronAuthHeaders(): Record<string, string> {
  const apiKey = getNvidiaApiKey();
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}
