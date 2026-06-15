import { isEdgeTtsAvailable } from "@/lib/edgeTts";
import { isNemotronVoiceConfigured } from "@/lib/nemotronVoice";
import { isOpenAiTtsConfigured } from "@/lib/openaiTts";

/** True when /api/tts can synthesize speech on the server. */
export function isServerTtsConfigured(): boolean {
  return isNemotronVoiceConfigured() || isOpenAiTtsConfigured() || isEdgeTtsAvailable();
}
