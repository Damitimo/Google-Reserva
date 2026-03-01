'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Volume2 } from 'lucide-react';
import { GeminiLiveClient } from '@/lib/gemini-live';
import { AudioRecorder, AudioPlayer, VoiceActivityDetector } from '@/lib/audio-utils';
import { useAppStore } from '@/lib/store';
import { GeminiIcon } from './ChromeFrame';

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
}

type VoiceState = 'connecting' | 'listening' | 'processing' | 'speaking' | 'idle';

export default function VoiceMode({ isOpen, onClose }: VoiceModeProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const responseRef = useRef<string>('');
  const isConnectingRef = useRef(false); // Prevent multiple connections

  const addMessage = useAppStore((state) => state.addMessage);

  // Initialize and connect
  useEffect(() => {
    if (!isOpen) return;

    const systemPrompt = `You are Donna, a warm and helpful dining concierge powered by Google. You help users find restaurants and make reservations in Los Angeles.

Your personality:
- Warm, knowledgeable, and efficient
- You speak naturally like a trusted friend who knows all the best spots
- Keep responses concise and conversational (2-3 sentences max)
- Be proactive about suggesting options

When users ask about restaurants, ask about:
- Location preference
- Cuisine type
- Party size
- Any dietary restrictions
- Time/date preference

Remember this is a voice conversation, so be natural and conversational.`;

    const recorder = new AudioRecorder();
    const player = new AudioPlayer();
    const vad = new VoiceActivityDetector(0.015);

    recorderRef.current = recorder;
    playerRef.current = player;
    vadRef.current = vad;

    // Set up player callbacks - mute mic while speaking to prevent echo
    player.setCallbacks(
      () => {
        setVoiceState('speaking');
        recorderRef.current?.mute(); // Mute mic while AI speaks
      },
      () => {
        setVoiceState('listening');
        recorderRef.current?.unmute(); // Unmute when AI stops
      }
    );

    // Set up VAD callbacks
    vad.setCallbacks(
      () => {
        // User started speaking - interrupt AI if speaking
        if (playerRef.current?.playing) {
          playerRef.current.interrupt();
        }
        setVoiceState('listening');
      },
      () => {
        // User stopped speaking
        setVoiceState('processing');
      }
    );

    // Connect to Live API
    const connect = async () => {
      // Prevent multiple simultaneous connections
      if (isConnectingRef.current || clientRef.current?.connected) {
        console.log('[VoiceMode] Already connecting or connected, skipping');
        return;
      }
      isConnectingRef.current = true;

      try {
        setVoiceState('connecting');
        setError(null);

        // Fetch API key from backend
        const tokenResponse = await fetch('/api/live-token');
        const tokenData = await tokenResponse.json();

        if (!tokenData.apiKey) {
          throw new Error('Failed to get API key');
        }

        const client = new GeminiLiveClient(tokenData.apiKey, {
          systemInstruction: systemPrompt,
          voiceName: 'Aoede', // Female voice
        });

        clientRef.current = client;

        await client.connect();
        console.log('[VoiceMode] Connected to Gemini Live API');

        // Set up event listeners
        client.on('audio', (audioData) => {
          console.log('[VoiceMode] Received audio, adding to player');
          player.addToQueue(audioData as ArrayBuffer);
        });

        client.on('text', (text) => {
          const newText = text as string;
          responseRef.current += newText;
          setResponse(responseRef.current);
        });

        client.on('turn_complete', () => {
          // Save the conversation to chat
          if (responseRef.current) {
            addMessage({
              id: `voice-${Date.now()}`,
              role: 'assistant',
              content: responseRef.current,
              timestamp: new Date(),
            });
          }
          responseRef.current = '';
          setResponse('');
        });

        client.on('interrupted', () => {
          player.interrupt();
        });

        client.on('error', (err) => {
          console.error('[VoiceMode] Client error:', err);
          setError('Connection error. Please try again.');
          setVoiceState('idle');
        });

        client.on('close', () => {
          setVoiceState('idle');
        });

        // Start recording
        let audioChunkCount = 0;
        let lastLevelUpdate = 0;
        await recorder.start((pcmData) => {
          // Calculate audio level for visualization (throttled to ~10fps)
          const now = Date.now();
          if (now - lastLevelUpdate > 100) {
            const level = calculateAudioLevel(pcmData);
            setAudioLevel(level);
            lastLevelUpdate = now;
          }

          // Process VAD
          vad.process(pcmData);

          // Send audio to API
          client.sendAudio(pcmData);

          audioChunkCount++;
          if (audioChunkCount % 100 === 0) {
            console.log('[VoiceMode] Sent', audioChunkCount, 'audio chunks');
          }
        });

        setVoiceState('listening');
      } catch (err) {
        console.error('[VoiceMode] Connection failed:', err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(`Connection failed: ${errorMsg}`);
        setVoiceState('idle');
        isConnectingRef.current = false;
      }
    };

    connect();

    // Cleanup
    return () => {
      recorder.stop();
      player.dispose();
      clientRef.current?.disconnect();
      vad.reset();
      isConnectingRef.current = false;
    };
  }, [isOpen]);

  // Calculate audio level for visualization
  const calculateAudioLevel = useCallback((pcmData: ArrayBuffer): number => {
    const pcm16 = new Int16Array(pcmData);
    let sum = 0;
    for (let i = 0; i < pcm16.length; i++) {
      sum += Math.abs(pcm16[i]);
    }
    const avg = sum / pcm16.length;
    return Math.min(1, avg / 0x4000); // Normalize to 0-1
  }, []);

  // Handle close
  const handleClose = () => {
    recorderRef.current?.stop();
    playerRef.current?.dispose();
    clientRef.current?.disconnect();
    vadRef.current?.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Header */}
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <GeminiIcon className="w-8 h-8" />
          <span className="text-white font-medium">Donna</span>
        </div>

        {/* Main visualization */}
        <div className="relative flex items-center justify-center mb-12">
          {/* Animated rings */}
          <motion.div
            className="absolute w-48 h-48 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(155, 114, 203, 0.2), rgba(217, 101, 112, 0.2))',
            }}
            animate={{
              scale: voiceState === 'listening' ? 1 + audioLevel * 0.2 : voiceState === 'speaking' ? [1, 1.15, 1] : 1,
            }}
            transition={{
              duration: voiceState === 'speaking' ? 0.8 : 0.3,
              repeat: voiceState === 'speaking' ? Infinity : 0,
              ease: 'easeOut',
            }}
          />
          <motion.div
            className="absolute w-40 h-40 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(155, 114, 203, 0.3), rgba(217, 101, 112, 0.3))',
            }}
            animate={{
              scale: voiceState === 'listening' ? 1 + audioLevel * 0.25 : voiceState === 'speaking' ? [1, 1.2, 1] : 1,
            }}
            transition={{
              duration: voiceState === 'speaking' ? 0.7 : 0.3,
              repeat: voiceState === 'speaking' ? Infinity : 0,
              delay: voiceState === 'speaking' ? 0.1 : 0,
              ease: 'easeOut',
            }}
          />
          <motion.div
            className="absolute w-32 h-32 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.5), rgba(155, 114, 203, 0.5), rgba(217, 101, 112, 0.5))',
            }}
            animate={{
              scale: voiceState === 'listening' ? 1 + audioLevel * 0.3 : voiceState === 'speaking' ? [1, 1.25, 1] : 1,
            }}
            transition={{
              duration: voiceState === 'speaking' ? 0.6 : 0.3,
              repeat: voiceState === 'speaking' ? Infinity : 0,
              delay: voiceState === 'speaking' ? 0.2 : 0,
              ease: 'easeOut',
            }}
          />

          {/* Center icon */}
          <motion.div
            className="w-24 h-24 rounded-full flex items-center justify-center z-10"
            style={{
              background: 'linear-gradient(135deg, #4285F4, #9B72CB, #D96570)',
            }}
            animate={{
              scale: voiceState === 'connecting' ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: 0.8,
              repeat: voiceState === 'connecting' ? Infinity : 0,
            }}
          >
            {voiceState === 'speaking' ? (
              <Volume2 className="w-10 h-10 text-white" />
            ) : (
              <Mic className="w-10 h-10 text-white" />
            )}
          </motion.div>
        </div>

        {/* Status text */}
        <motion.div
          key={voiceState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-white/80 text-lg">
            {voiceState === 'connecting' && 'Connecting...'}
            {voiceState === 'listening' && 'Listening...'}
            {voiceState === 'processing' && 'Processing...'}
            {voiceState === 'speaking' && 'Donna is speaking...'}
            {voiceState === 'idle' && 'Ready'}
          </p>
        </motion.div>

        {/* Transcript/Response */}
        <div className="max-w-md mx-auto px-6 text-center">
          {transcript && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white/60 text-sm mb-4"
            >
              You: "{transcript}"
            </motion.p>
          )}
          {response && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white text-lg"
            >
              {response}
            </motion.p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/30 rounded-xl px-6 py-3"
          >
            <p className="text-red-300 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Bottom hint */}
        <div className="absolute bottom-8 text-white/40 text-sm">
          Speak naturally • Donna will respond in real-time
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
