import { isEdgeTtsAvailable } from "@/lib/edgeTts";
import { isMinimaxTtsConfigured } from "@/lib/minimaxTts";
import { isNemotronVoiceConfigured } from "@/lib/nemotronVoice";
import { isOpenAiTtsConfigured } from "@/lib/openaiTts";

/** True when /api/tts can synthesize speech on the server. */
export function isServerTtsConfigured(): boolean {
  return (
    isMinimaxTtsConfigured() ||
    isNemotronVoiceConfigured() ||
    isOpenAiTtsConfigured() ||
    isEdgeTtsAvailable()
  );
}
