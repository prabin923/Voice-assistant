/** Shared Azure Speech credentials for MAI-Transcribe and MAI-Voice. */

export interface AzureSpeechConfig {
  apiKey: string;
  endpoint: string;
  region?: string;
}

function speechEndpointOrigin(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return endpoint.replace(/\/$/, "");
  }
}

export function normalizeSpeechEndpoint(endpoint: string): string {
  const trimmed = endpoint.replace(/\/$/, "");
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();

    // Foundry project endpoint → Speech resource endpoint (same resource name)
    const foundry = host.match(/^([a-z0-9-]+)\.services\.ai\.azure\.com$/i);
    if (foundry) {
      return `https://${foundry[1].toLowerCase()}.cognitiveservices.azure.com`;
    }
  } catch {
    /* use raw endpoint */
  }
  return trimmed;
}

export function getAzureSpeechConfig(): AzureSpeechConfig | undefined {
  const apiKey = process.env.AZURE_SPEECH_KEY?.trim();
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT?.trim();
  if (!apiKey || !endpoint) return undefined;

  return {
    apiKey,
    endpoint: normalizeSpeechEndpoint(endpoint),
    region: resolveAzureSpeechRegion(),
  };
}

export function resolveAzureSpeechRegion(): string | undefined {
  const explicit = process.env.AZURE_SPEECH_REGION?.trim();
  if (explicit) return explicit.toLowerCase();

  const fromEndpoint = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    try {
      const host = new URL(url).hostname;
      const patterns = [
        /^([a-z0-9-]+)\.tts\.speech\.microsoft\.com$/i,
        /^([a-z0-9-]+)\.stt\.speech\.microsoft\.com$/i,
        /^([a-z0-9-]+)\.speech\.microsoft\.com$/i,
        /^([a-z0-9-]+)\.api\.cognitive\.microsoft\.com$/i,
      ];
      for (const pattern of patterns) {
        const match = host.match(pattern);
        if (match) return match[1].toLowerCase();
      }
    } catch {
      /* ignore */
    }
    return undefined;
  };

  return (
    fromEndpoint(process.env.MAI_VOICE_TTS_ENDPOINT?.trim()) ??
    fromEndpoint(process.env.AZURE_SPEECH_ENDPOINT?.trim())
  );
}

export function buildAzureTtsUrl(): string | undefined {
  const custom = process.env.MAI_VOICE_TTS_ENDPOINT?.trim();
  if (custom) {
    return custom.endsWith("/cognitiveservices/v1")
      ? custom
      : `${custom.replace(/\/$/, "")}/cognitiveservices/v1`;
  }

  const config = getAzureSpeechConfig();
  if (!config) return undefined;

  const origin = speechEndpointOrigin(config.endpoint);

  if (origin.includes(".tts.speech.microsoft.com")) {
    return `${origin}/cognitiveservices/v1`;
  }

  if (config.region) {
    return `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  }

  if (origin.includes("cognitiveservices.azure.com")) {
    return `${origin}/tts/cognitiveservices/v1`;
  }

  if (origin.includes(".speech.microsoft.com")) {
    return `${origin}/cognitiveservices/v1`;
  }

  return undefined;
}
