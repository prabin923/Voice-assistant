"use client";

import { GoogleGenAI, Modality, type LiveServerMessage } from "@google/genai";

export interface GeminiLiveCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (message: string) => void;
  onInputTranscript?: (text: string) => void;
  onOutputTranscript?: (text: string) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

type LiveSession = Awaited<ReturnType<GoogleGenAI["live"]["connect"]>>;

/** Browser client for Gemini 3.1 Flash Live (WebSocket, native audio). */
export class GeminiLiveSession {
  private session: LiveSession | null = null;
  private micStream: MediaStream | null = null;
  private captureContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private playbackContext: AudioContext | null = null;
  private nextPlayTime = 0;

  async connect(token: string, model: string, callbacks: GeminiLiveCallbacks): Promise<void> {
    const ai = new GoogleGenAI({
      apiKey: token,
      httpOptions: { apiVersion: "v1alpha" },
    });

    this.playbackContext = new AudioContext({ sampleRate: 24000 });
    if (this.playbackContext.state === "suspended") {
      await this.playbackContext.resume();
    }

    this.session = await ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => callbacks.onOpen?.(),
        onerror: (e) => callbacks.onError?.(e.message ?? "Live API error"),
        onclose: () => callbacks.onClose?.(),
        onmessage: (message: LiveServerMessage) => this.handleMessage(message, callbacks),
      },
    });
  }

  private handleMessage(message: LiveServerMessage, callbacks: GeminiLiveCallbacks): void {
    const content = message.serverContent;
    if (!content) return;

    if (content.inputTranscription?.text?.trim()) {
      callbacks.onInputTranscript?.(content.inputTranscription.text.trim());
    }
    if (content.outputTranscription?.text?.trim()) {
      callbacks.onOutputTranscript?.(content.outputTranscription.text.trim());
    }

    const parts = content.modelTurn?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          callbacks.onSpeakingChange?.(true);
          this.playPcm(part.inlineData.data);
        }
      }
    }
    if (content.turnComplete) {
      callbacks.onSpeakingChange?.(false);
    }
  }

  private async ensurePlaybackReady(): Promise<void> {
    if (!this.playbackContext) return;
    if (this.playbackContext.state === "suspended") {
      await this.playbackContext.resume();
    }
  }

  private playPcm(base64: string): void {
    if (!this.playbackContext) return;
    void this.ensurePlaybackReady();

    const raw = atob(base64);
    const sampleCount = raw.length / 2;
    const pcm = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      pcm[i] = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8);
    }

    const float32 = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) float32[i] = pcm[i] / 32768;

    const buffer = this.playbackContext.createBuffer(1, sampleCount, 24000);
    buffer.copyToChannel(float32, 0);

    const source = this.playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackContext.destination);

    const now = this.playbackContext.currentTime;
    const start = Math.max(now, this.nextPlayTime);
    source.start(start);
    this.nextPlayTime = start + buffer.duration;
  }

  async startMic(existingStream?: MediaStream): Promise<void> {
    if (!this.session) throw new Error("Live session not connected");

    this.micStream =
      existingStream?.active === true
        ? existingStream
        : await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

    this.captureContext = new AudioContext({ sampleRate: 16000 });
    if (this.captureContext.state === "suspended") {
      await this.captureContext.resume();
    }

    const source = this.captureContext.createMediaStreamSource(this.micStream);
    const processor = this.captureContext.createScriptProcessor(4096, 1, 1);
    const silentGain = this.captureContext.createGain();
    silentGain.gain.value = 0;

    processor.onaudioprocess = (event) => {
      if (!this.session) return;
      const input = event.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const sample = Math.max(-1, Math.min(1, input[i]));
        pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
      }
      const bytes = new Uint8Array(pcm.buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

      this.session.sendRealtimeInput({
        audio: {
          data: btoa(binary),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    };

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(this.captureContext.destination);
    this.processor = processor;
  }

  sendGreeting(text: string): void {
    this.session?.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
    });
  }

  disconnect(): void {
    this.processor?.disconnect();
    this.captureContext?.close().catch(() => {});
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.playbackContext?.close().catch(() => {});
    this.session?.close();
    this.session = null;
    this.processor = null;
    this.captureContext = null;
    this.micStream = null;
    this.playbackContext = null;
    this.nextPlayTime = 0;
  }
}
