/**
 * Gemini Live API Client
 * Handles WebSocket connection for real-time voice conversations
 *
 * WebSocket URL: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
 * Audio Input: 16-bit PCM at 16kHz mono
 * Audio Output: 16-bit PCM at 24kHz mono
 */

export type LiveAPIEventType =
  | 'open'
  | 'close'
  | 'error'
  | 'audio'
  | 'text'
  | 'interrupted'
  | 'turn_complete'
  | 'tool_call';

export interface LiveAPIConfig {
  model?: string;
  systemInstruction?: string;
  voiceName?: string;
  tools?: Array<{
    functionDeclarations: Array<{
      name: string;
      description: string;
      parameters?: object;
    }>;
  }>;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

type EventCallback = (...args: unknown[]) => void;

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private config: LiveAPIConfig;
  private listeners: Map<LiveAPIEventType, Set<EventCallback>> = new Map();
  private isConnected = false;
  private audioQueue: ArrayBuffer[] = [];

  constructor(apiKey: string, config: LiveAPIConfig = {}) {
    this.apiKey = apiKey;
    this.config = {
      model: config.model || 'gemini-2.0-flash-live-001',
      systemInstruction: config.systemInstruction,
      voiceName: config.voiceName || 'Aoede', // Female voice
      tools: config.tools,
    };
  }

  /**
   * Connect to the Gemini Live API
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[GeminiLive] WebSocket connected');
        this.sendSetup();
        this.isConnected = true;
        this.emit('open');
        resolve();
      };

      this.ws.onclose = (event) => {
        console.log('[GeminiLive] WebSocket closed', event.code, event.reason);
        this.isConnected = false;
        this.emit('close', event);
      };

      this.ws.onerror = (error) => {
        console.error('[GeminiLive] WebSocket error', error);
        this.emit('error', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  /**
   * Send initial setup message with configuration
   */
  private sendSetup(): void {
    const setupMessage: Record<string, unknown> = {
      setup: {
        model: `models/${this.config.model}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.config.voiceName,
              },
            },
          },
        },
      },
    };

    if (this.config.systemInstruction) {
      (setupMessage.setup as Record<string, unknown>).systemInstruction = {
        parts: [{ text: this.config.systemInstruction }],
      };
    }

    if (this.config.tools) {
      (setupMessage.setup as Record<string, unknown>).tools = this.config.tools;
    }

    this.send(setupMessage);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string | ArrayBuffer): void {
    try {
      const message = JSON.parse(data as string);

      // Setup complete
      if (message.setupComplete) {
        console.log('[GeminiLive] Setup complete');
        return;
      }

      // Server content (audio/text response)
      if (message.serverContent) {
        const content = message.serverContent;

        // Model turn (response in progress)
        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            // Audio response
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              const audioData = this.base64ToArrayBuffer(part.inlineData.data);
              this.audioQueue.push(audioData);
              this.emit('audio', audioData);
            }
            // Text response
            if (part.text) {
              this.emit('text', part.text);
            }
          }
        }

        // Turn complete
        if (content.turnComplete) {
          this.emit('turn_complete');
        }

        // Interrupted (user started speaking)
        if (content.interrupted) {
          this.emit('interrupted');
        }
      }

      // Tool call
      if (message.toolCall) {
        const calls = message.toolCall.functionCalls || [];
        for (const call of calls) {
          this.emit('tool_call', {
            name: call.name,
            args: call.args,
          });
        }
      }
    } catch (error) {
      console.error('[GeminiLive] Error parsing message:', error);
    }
  }

  /**
   * Send audio data to the API
   * @param pcmData - 16-bit PCM audio at 16kHz
   */
  sendAudio(pcmData: ArrayBuffer): void {
    if (!this.isConnected || !this.ws) return;

    const base64Audio = this.arrayBufferToBase64(pcmData);

    this.send({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm;rate=16000',
          data: base64Audio,
        }],
      },
    });
  }

  /**
   * Send text message to the API
   */
  sendText(text: string): void {
    if (!this.isConnected || !this.ws) return;

    this.send({
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }],
        }],
        turnComplete: true,
      },
    });
  }

  /**
   * Send tool response
   */
  sendToolResponse(name: string, response: object): void {
    if (!this.isConnected || !this.ws) return;

    this.send({
      toolResponse: {
        functionResponses: [{
          name,
          response,
        }],
      },
    });
  }

  /**
   * Disconnect from the API
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Event listener registration
   */
  on(event: LiveAPIEventType, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: LiveAPIEventType, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: LiveAPIEventType, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((callback) => callback(...args));
  }

  /**
   * Send JSON message through WebSocket
   */
  private send(message: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
