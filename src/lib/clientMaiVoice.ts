/**
 * Browser playback for /api/tts (MAI-Voice). Falls back to caller when unavailable.
 */

export type MaiVoicePersona = "warm" | "professional" | "energetic";

export interface MaiVoiceSpeakOptions {
  text: string;
  language: string;
  voiceStyle?: MaiVoicePersona;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error?: string) => void;
}

export interface MaiVoiceSpeaker {
  speak: (options: MaiVoiceSpeakOptions) => Promise<boolean>;
  cancel: () => void;
  isSpeaking: () => boolean;
}

let audioUnlocked = false;

/** Call from a user gesture (mic tap) so later async TTS can play audio. */
export function unlockBrowserAudio(): void {
  if (audioUnlocked || typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    void ctx.resume().then(() => {
      audioUnlocked = true;
      void ctx.close();
    });
  } catch {
    const silent = new Audio(
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
    );
    silent.volume = 0.001;
    void silent.play().then(() => {
      audioUnlocked = true;
    }).catch(() => {});
  }
}

export function createMaiVoiceSpeaker(): MaiVoiceSpeaker {
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;
  let speaking = false;

  const cleanup = () => {
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.onplay = null;
      audio.pause();
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    speaking = false;
  };

  return {
    cancel: cleanup,
    isSpeaking: () => speaking,
    async speak(options) {
      cleanup();

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            text: options.text,
            language: options.language,
            voiceStyle: options.voiceStyle ?? "warm",
          }),
        });

        if (res.status === 501 || res.status === 422) return false;
        if (!res.ok) return false;

        const blob = await res.blob();
        if (!blob.size) return false;

        objectUrl = URL.createObjectURL(blob);
        audio = new Audio(objectUrl);

        const played = await new Promise<boolean>((resolve) => {
          if (!audio) {
            resolve(false);
            return;
          }

          let settled = false;
          const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            if (!ok) {
              speaking = false;
              options.onError?.(ok ? undefined : "Audio playback failed");
              cleanup();
            }
            resolve(ok);
          };

          audio.onplay = () => {
            speaking = true;
            options.onStart?.();
          };

          audio.onended = () => {
            speaking = false;
            options.onEnd?.();
            cleanup();
            finish(true);
          };

          audio.onerror = () => finish(false);

          void audio.play().then(() => {
            audioUnlocked = true;
          }).catch(() => finish(false));
        });

        return played;
      } catch {
        cleanup();
        options.onError?.("TTS request failed");
        return false;
      }
    },
  };
}
