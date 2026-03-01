/**
 * Audio Utilities for Gemini Live API
 * Handles microphone capture at 16kHz and playback at 24kHz
 */

/**
 * Audio Recorder - Captures microphone at 16kHz 16-bit PCM
 */
export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private onAudioData: ((pcmData: ArrayBuffer) => void) | null = null;
  private isRecording = false;

  /**
   * Start recording from microphone
   * @param onAudioData - Callback receiving PCM audio chunks
   */
  async start(onAudioData: (pcmData: ArrayBuffer) => void): Promise<void> {
    this.onAudioData = onAudioData;

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create audio context at 16kHz
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      // Create source from microphone
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Use ScriptProcessor for audio processing (AudioWorklet preferred but more complex)
      const processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      processorNode.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = this.float32ToPCM16(inputData);

        if (this.onAudioData) {
          this.onAudioData(pcmData);
        }
      };

      // Connect nodes
      this.sourceNode.connect(processorNode);
      processorNode.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('[AudioRecorder] Started recording at 16kHz');
    } catch (error) {
      console.error('[AudioRecorder] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  stop(): void {
    this.isRecording = false;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.sourceNode = null;
    this.workletNode = null;
    console.log('[AudioRecorder] Stopped recording');
  }

  /**
   * Check if currently recording
   */
  get recording(): boolean {
    return this.isRecording;
  }

  /**
   * Convert Float32 audio to 16-bit PCM
   */
  private float32ToPCM16(float32Array: Float32Array): ArrayBuffer {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16.buffer;
  }
}

/**
 * Audio Player - Plays back 24kHz 16-bit PCM audio
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextPlayTime = 0;
  private onPlaybackStart: (() => void) | null = null;
  private onPlaybackEnd: (() => void) | null = null;

  constructor() {
    // Initialize audio context at 24kHz for playback
    if (typeof window !== 'undefined') {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }
  }

  /**
   * Set playback callbacks
   */
  setCallbacks(onStart: () => void, onEnd: () => void): void {
    this.onPlaybackStart = onStart;
    this.onPlaybackEnd = onEnd;
  }

  /**
   * Add audio chunk to queue and play
   */
  addToQueue(pcmData: ArrayBuffer): void {
    this.audioQueue.push(pcmData);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /**
   * Play next audio chunk from queue
   */
  private async playNext(): Promise<void> {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.onPlaybackEnd?.();
      return;
    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onPlaybackStart?.();
      this.nextPlayTime = this.audioContext.currentTime;
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const pcmData = this.audioQueue.shift()!;
    const audioBuffer = this.pcm16ToAudioBuffer(pcmData);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Schedule playback
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;

    // Queue next chunk
    source.onended = () => {
      if (this.audioQueue.length > 0) {
        this.playNext();
      } else {
        this.isPlaying = false;
        this.onPlaybackEnd?.();
      }
    };

    this.currentSource = source;
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    this.audioQueue = [];
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignore if already stopped
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.onPlaybackEnd?.();
  }

  /**
   * Interrupt playback (for barge-in)
   */
  interrupt(): void {
    this.stop();
    console.log('[AudioPlayer] Playback interrupted');
  }

  /**
   * Check if currently playing
   */
  get playing(): boolean {
    return this.isPlaying;
  }

  /**
   * Convert 16-bit PCM to AudioBuffer
   */
  private pcm16ToAudioBuffer(pcmData: ArrayBuffer): AudioBuffer {
    const pcm16 = new Int16Array(pcmData);
    const float32 = new Float32Array(pcm16.length);

    for (let i = 0; i < pcm16.length; i++) {
      // Convert 16-bit to float [-1, 1]
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
    }

    const audioBuffer = this.audioContext!.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    return audioBuffer;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Voice Activity Detection (simple energy-based)
 */
export class VoiceActivityDetector {
  private threshold: number;
  private speaking = false;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private onSpeechStart: (() => void) | null = null;
  private onSpeechEnd: (() => void) | null = null;

  constructor(threshold = 0.01) {
    this.threshold = threshold;
  }

  /**
   * Set VAD callbacks
   */
  setCallbacks(onStart: () => void, onEnd: () => void): void {
    this.onSpeechStart = onStart;
    this.onSpeechEnd = onEnd;
  }

  /**
   * Process audio chunk and detect voice activity
   */
  process(pcmData: ArrayBuffer): boolean {
    const pcm16 = new Int16Array(pcmData);
    let sum = 0;

    for (let i = 0; i < pcm16.length; i++) {
      const normalized = pcm16[i] / 0x7fff;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / pcm16.length);
    const isSpeaking = rms > this.threshold;

    if (isSpeaking && !this.speaking) {
      this.speaking = true;
      this.onSpeechStart?.();
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
    } else if (!isSpeaking && this.speaking) {
      // Wait for sustained silence before triggering end
      if (!this.silenceTimeout) {
        this.silenceTimeout = setTimeout(() => {
          this.speaking = false;
          this.onSpeechEnd?.();
          this.silenceTimeout = null;
        }, 500); // 500ms of silence to end
      }
    }

    return isSpeaking;
  }

  /**
   * Reset state
   */
  reset(): void {
    this.speaking = false;
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }
}
