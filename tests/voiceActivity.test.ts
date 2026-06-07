import { describe, it, expect } from "vitest";
import { measureMicRms, isSpeechLevel } from "@/lib/voiceActivity";
import { VOICE_RMS_THRESHOLD } from "@/lib/voiceSilence";

describe("voiceActivity", () => {
  it("detects silence vs speech RMS levels", () => {
    expect(isSpeechLevel(1.5, VOICE_RMS_THRESHOLD)).toBe(false);
    expect(isSpeechLevel(8, VOICE_RMS_THRESHOLD)).toBe(true);
  });

  it("computes zero RMS for flat silence buffer", () => {
    const analyser = {
      fftSize: 128,
      getByteTimeDomainData(arr: Uint8Array) {
        arr.fill(128);
      },
    } as AnalyserNode;
    expect(measureMicRms(analyser, new Uint8Array(128))).toBe(0);
  });
});
