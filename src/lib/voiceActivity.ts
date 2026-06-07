/** RMS mic level from time-domain samples (0–100 scale, speech usually > 4). */
export function measureMicRms(analyser: AnalyserNode, buffer: Uint8Array): number {
  analyser.getByteTimeDomainData(buffer as Uint8Array<ArrayBuffer>);
  if (buffer.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const sample = (buffer[i] - 128) / 128;
    sum += sample * sample;
  }
  return Math.sqrt(sum / buffer.length) * 100;
}

export function isSpeechLevel(rms: number, threshold: number): boolean {
  return rms > threshold;
}
