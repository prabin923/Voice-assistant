/**
 * Browser playback for /api/tts (Nemotron Speech TTS). Falls back to caller when unavailable.
 */

export type NemotronVoicePersona = "warm" | "professional" | "energetic";

export interface NemotronVoiceSpeakOptions {
  text: string;
  language: string;
  voiceStyle?: NemotronVoicePersona;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error?: string) => void;
}

export interface NemotronVoiceSpeaker {
  speak: (options: NemotronVoiceSpeakOptions) => Promise<boolean>;
  cancel: () => void;
  isSpeaking: () => boolean;
  prefetch: (options: Pick<NemotronVoiceSpeakOptions, "text" | "language" | "voiceStyle">) => void;
}

let audioUnlocked = false;
let sharedAudioContext: AudioContext | null = null;

const ttsPrefetch = new Map<string, Promise<Blob | null>>();

function prefetchKey(text: string, language: string, voiceStyle: NemotronVoicePersona): string {
  return `${language}|${voiceStyle}|${text}`;
}

async function fetchTtsBlob(
  text: string,
  language: string,
  voiceStyle: NemotronVoicePersona
): Promise<Blob | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text, language, voiceStyle }),
    });
    if (res.status === 501 || res.status === 422 || !res.ok) return null;
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

/** Start fetching TTS audio before speak() — hides network latency during streaming. */
export function prefetchServerTts(
  text: string,
  language: string,
  voiceStyle: NemotronVoicePersona = "warm"
): void {
  const key = prefetchKey(text, language, voiceStyle);
  if (!ttsPrefetch.has(key)) {
    ttsPrefetch.set(key, fetchTtsBlob(text, language, voiceStyle));
    if (ttsPrefetch.size > 12) {
      const oldest = ttsPrefetch.keys().next().value;
      if (oldest) ttsPrefetch.delete(oldest);
    }
  }
}

const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

/** Call from a user gesture (mic tap) so later async TTS can play audio. */
export function unlockBrowserAudio(): void {
  if (typeof window === "undefined") return;
  if (audioUnlocked) return;

  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContext();
    }
    void sharedAudioContext.resume().then(() => {
      audioUnlocked = true;
    });
  } catch {
    /* fall through to silent clip */
  }

  const silent = new Audio(SILENT_WAV);
  silent.volume = 0.001;
  void silent.play().then(() => {
    audioUnlocked = true;
  }).catch(() => {});
}

/** Safe to call before every playback attempt (after LLM/TTS latency). */
export function ensureAudioUnlocked(): void {
  unlockBrowserAudio();
  if (sharedAudioContext && sharedAudioContext.state === "suspended") {
    void sharedAudioContext.resume();
  }
}

export function createNemotronVoiceSpeaker(): NemotronVoiceSpeaker {
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
    prefetch(options) {
      prefetchServerTts(
        options.text,
        options.language,
        options.voiceStyle ?? "warm"
      );
    },
    async speak(options) {
      cleanup();
      ensureAudioUnlocked();

      const style = options.voiceStyle ?? "warm";
      const key = prefetchKey(options.text, options.language, style);
      const prefetched = ttsPrefetch.get(key);
      if (prefetched) ttsPrefetch.delete(key);

      try {
        const blob = prefetched ? await prefetched : await fetchTtsBlob(options.text, options.language, style);
        if (!blob) return false;

        objectUrl = URL.createObjectURL(blob);
        audio = new Audio(objectUrl);

        const played = await new Promise<boolean>((resolve) => {
          if (!audio) {
            resolve(false);
            return;
          }

          let settled = false;
          let started = false;
          const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(playTimeout);
            if (!ok) {
              speaking = false;
              options.onError?.("Audio playback failed");
              cleanup();
            }
            resolve(ok);
          };

          const playTimeout = window.setTimeout(() => {
            if (!started) finish(false);
          }, 12_000);

          audio.onplay = () => {
            started = true;
            speaking = true;
            audioUnlocked = true;
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
