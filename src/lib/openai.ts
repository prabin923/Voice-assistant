/** Shared OpenAI API key resolution for chat and Whisper STT. */
export function getOpenAiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (key && key !== "your_openai_api_key_here") return key;
  return undefined;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(getOpenAiApiKey());
}
