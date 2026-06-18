/** Shared voice activity / silence timing for mic capture. */

/** RMS threshold — time-domain level; speech typically > 4. */
export const VOICE_RMS_THRESHOLD = 4;
/** @deprecated Use VOICE_RMS_THRESHOLD via measureMicRms */
export const VOICE_SILENCE_THRESHOLD = 15;

/** End turn after this much silence following speech (~0.7s). */
export const VOICE_SILENCE_SUBMIT_MS = 700;

/** Minimum speech duration before auto-submit on silence. */
export const VOICE_SPEECH_MIN_MS = 300;

export const VOICE_MAX_RECORD_MS = 12000;

/** Delay before mic opens after assistant finishes speaking. */
export const VOICE_RESUME_LISTEN_MS = 400;

/** Delay before retrying mic after empty STT / no speech. */
export const VOICE_STT_RETRY_MS = 200;

/** Let mic hardware settle before VAD starts. */
export const VOICE_MIC_WARMUP_MS = 200;

/** Minimum recorded blob size before sending to STT. */
export const VOICE_MIN_BLOB_BYTES = 1000;

/** MediaRecorder timeslice interval (ms). */
export const VOICE_RECORDER_TIMESLICE_MS = 120;
