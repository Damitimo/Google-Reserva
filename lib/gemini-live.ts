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

  private setupComplete = false;
  private setupPromiseResolve: (() => void) | null = null;

  constructor(apiKey: string, config: LiveAPIConfig = {}) {
    this.apiKey = apiKey;
    this.config = {
      // Use model that supports both native audio and function calling
      model: config.model || 'gemini-2.5-flash-native-audio-preview-12-2025',
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
      // Use v1beta for the Live API
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

      console.log('[GeminiLive] Connecting to:', wsUrl.replace(this.apiKey, 'API_KEY_HIDDEN'));

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (e) {
        console.error('[GeminiLive] WebSocket creation failed:', e);
        reject(e);
        return;
      }

      console.log('[GeminiLive] WebSocket created, readyState:', this.ws.readyState);

      // Timeout for connection
      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          console.error('[GeminiLive] Connection timed out, readyState:', this.ws?.readyState);
          this.disconnect();
          reject(new Error('Connection timed out'));
        }
      }, 5000);

      // Timeout for setup
      const setupTimeout = setTimeout(() => {
        if (!this.setupComplete) {
          console.error('[GeminiLive] Setup timed out after connection');
          this.disconnect();
          reject(new Error('Setup timed out'));
        }
      }, 10000);

      this.ws.onopen = () => {
        console.log('[GeminiLive] WebSocket OPEN');
        clearTimeout(connectionTimeout);
        this.sendSetup();
        this.isConnected = true;

        // Wait for setup complete before resolving
        this.setupPromiseResolve = () => {
          clearTimeout(setupTimeout);
          resolve();
        };
      };

      this.ws.onclose = (event) => {
        console.log('[GeminiLive] WebSocket closed', event.code, event.reason);
        clearTimeout(setupTimeout);
        this.isConnected = false;
        this.setupComplete = false;
        this.emit('close', event);
      };

      this.ws.onerror = (error) => {
        console.error('[GeminiLive] WebSocket error', error);
        clearTimeout(setupTimeout);
        this.emit('error', error);
        reject(error);
      };

      this.ws.onmessage = async (event) => {
        // Handle both text and blob data
        let data = event.data;
        if (data instanceof Blob) {
          data = await data.text();
        }
        this.handleMessage(data);
      };
    });
  }

  /**
   * Send initial setup message with configuration
   */
  private sendSetup(): void {
    // Setup for Live API model with audio and tools
    const setup: Record<string, unknown> = {
      model: `models/${this.config.model}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: this.config.voiceName || 'Aoede',
            },
          },
        },
      },
    };

    // System instruction as Content object
    if (this.config.systemInstruction) {
      setup.systemInstruction = {
        role: 'user',
        parts: [{ text: this.config.systemInstruction }],
      };
    }

    // Add tools if configured
    if (this.config.tools && this.config.tools.length > 0) {
      setup.tools = this.config.tools;
    }

    const setupMessage = { setup };
    console.log('[GeminiLive] Sending setup:', JSON.stringify(setupMessage, null, 2).substring(0, 3000));
    console.log('[GeminiLive] Tools included:', setup.tools ? 'YES' : 'NO');
    this.send(setupMessage);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string | ArrayBuffer): void {
    try {
      console.log('[GeminiLive] Raw message received:', typeof data === 'string' ? data.substring(0, 300) : 'ArrayBuffer');
      const message = JSON.parse(data as string);
      console.log('[GeminiLive] Parsed message keys:', Object.keys(message));

      // Setup complete
      if (message.setupComplete) {
        console.log('[GeminiLive] Setup complete!');
        this.setupComplete = true;
        this.emit('open');
        if (this.setupPromiseResolve) {
          this.setupPromiseResolve();
          this.setupPromiseResolve = null;
        }
        return;
      }

      // Server content (audio/text response)
      if (message.serverContent) {
        const content = message.serverContent;
        console.log('[GeminiLive] Server content:', JSON.stringify(content).substring(0, 200));

        // Model turn (response in progress)
        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            // Audio response - check both inlineData and direct audio field
            const audioData = part.inlineData || part.audio;
            if (audioData?.mimeType?.startsWith('audio/') || audioData?.data) {
              console.log('[GeminiLive] Received audio chunk');
              const buffer = this.base64ToArrayBuffer(audioData.data);
              this.audioQueue.push(buffer);
              this.emit('audio', buffer);
            }
            // Text response
            if (part.text) {
              console.log('[GeminiLive] Received text:', part.text.substring(0, 50));
              this.emit('text', part.text);
            }
          }
        }

        // Turn complete
        if (content.turnComplete) {
          console.log('[GeminiLive] Turn complete');
          this.emit('turn_complete');
        }

        // Interrupted (user started speaking)
        if (content.interrupted) {
          console.log('[GeminiLive] Interrupted by user');
          this.emit('interrupted');
        }
      }

      // Handle error responses
      if (message.error) {
        console.error('[GeminiLive] API Error:', message.error);
        this.emit('error', new Error(message.error.message || 'API Error'));
      }

      // Tool call - comes as separate toolCall message
      if (message.toolCall) {
        console.log('[GeminiLive] Tool call received:', JSON.stringify(message.toolCall));
        const calls = message.toolCall.functionCalls || [];
        for (const call of calls) {
          this.emit('tool_call', {
            id: call.id, // Include the ID for response matching
            name: call.name,
            args: call.args || {},
          });
        }
      }

      // Tool call might also be in serverContent.modelTurn.parts
      if (message.serverContent?.modelTurn?.parts) {
        for (const part of message.serverContent.modelTurn.parts) {
          if (part.functionCall) {
            console.log('[GeminiLive] Function call in part:', JSON.stringify(part.functionCall));
            this.emit('tool_call', {
              id: part.functionCall.id || `call-${Date.now()}`,
              name: part.functionCall.name,
              args: part.functionCall.args || {},
            });
          }
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
    if (!this.isConnected || !this.ws || !this.setupComplete) return;

    const base64Audio = this.arrayBufferToBase64(pcmData);

    // Use the new format with audio field directly (mediaChunks is deprecated)
    this.send({
      realtimeInput: {
        audio: {
          mimeType: 'audio/pcm;rate=16000',
          data: base64Audio,
        },
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
   * @param id - The function call ID to match with the request
   * @param name - The function name
   * @param response - The response object
   */
  sendToolResponse(id: string, name: string, response: object): void {
    if (!this.isConnected || !this.ws) {
      console.log('[GeminiLive] Cannot send tool response - not connected');
      return;
    }

    const toolResponseMsg = {
      toolResponse: {
        functionResponses: [{
          id,
          name,
          response,
        }],
      },
    };
    console.log('[GeminiLive] Sending tool response:', JSON.stringify(toolResponseMsg));
    this.send(toolResponseMsg);
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
