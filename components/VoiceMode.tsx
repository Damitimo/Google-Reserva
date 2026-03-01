'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Volume2 } from 'lucide-react';
import { GeminiLiveClient } from '@/lib/gemini-live';
import { AudioRecorder, AudioPlayer, VoiceActivityDetector } from '@/lib/audio-utils';
import { GeminiIcon } from './ChromeFrame';
import { useAppStore } from '@/lib/store';

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
}

type VoiceState = 'connecting' | 'listening' | 'processing' | 'speaking' | 'idle';

// Module-level singleton to prevent multiple connections across component remounts
let activeConnectionId: string | null = null;

export default function VoiceMode({ isOpen, onClose }: VoiceModeProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const connectionIdRef = useRef<string | null>(null);

  const addMessage = useAppStore((state) => state.addMessage);
  const updateBookingContext = useAppStore((state) => state.updateBookingContext);

  // Initialize and connect
  useEffect(() => {
    if (!isOpen) return;

    // Generate unique ID for this connection attempt
    const myConnectionId = `${Date.now()}-${Math.random()}`;

    // Prevent multiple simultaneous connections using module-level singleton
    if (activeConnectionId !== null) {
      console.log('[VoiceMode] Already connecting or connected, skipping. Active:', activeConnectionId);
      return;
    }
    activeConnectionId = myConnectionId;
    connectionIdRef.current = myConnectionId;
    console.log('[VoiceMode] Starting connection:', myConnectionId);

    const systemPrompt = `You are Donna, a warm and helpful dining concierge powered by Google. You help users find restaurants and make reservations in Los Angeles.

CRITICAL RULES:
1. Only speak your direct responses to the user. NEVER speak your internal thoughts or reasoning out loud.
2. ALWAYS use check_calendar before confirming any reservation time to ensure the user is free.
3. If there's a calendar conflict, tell the user about it naturally (e.g., "Oh, I see you have dinner with Sarah at 7pm. How about 5:30pm or 9pm instead?")

Your capabilities:
- check_calendar: Check if user is free at a specific time. ALWAYS use this before booking.
- make_reservation: Complete a restaurant reservation
- process_payment: Charge the user's card for reservation deposits ($25 typical)
- set_reminder: Set reminders (e.g., "Would you like me to remind you to cancel if your plans change?")

Your personality:
- Warm, knowledgeable, and efficient
- Speak naturally like a trusted friend who knows all the best spots
- Keep responses concise (2-3 sentences max)
- Be proactive about checking calendar and offering reminders

Reservation flow:
1. Gather preferences (location, cuisine, party size, time, dietary needs)
2. Suggest a restaurant
3. ALWAYS check_calendar for the proposed time
4. If conflict, suggest alternatives from the calendar response
5. Once time is confirmed, process_payment for deposit
6. make_reservation to confirm
7. Offer to set_reminder for cancellation

Remember this is a voice conversation. Be natural and conversational.`;

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
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'check_calendar',
                  description:
                    'Check if the user is free at a specific date and time. Always call this before confirming a reservation.',
                  parameters: {
                    type: 'object',
                    properties: {
                      date: {
                        type: 'string',
                        description: 'The date to check (e.g., "tomorrow", "Friday", "2024-03-15")',
                      },
                      time: {
                        type: 'string',
                        description: 'The time to check (e.g., "7pm", "19:30")',
                      },
                    },
                    required: ['date', 'time'],
                  },
                },
                {
                  name: 'make_reservation',
                  description:
                    'Complete a restaurant reservation after confirming availability and getting user approval.',
                  parameters: {
                    type: 'object',
                    properties: {
                      restaurant_name: { type: 'string', description: 'Name of the restaurant' },
                      date: { type: 'string', description: 'Reservation date' },
                      time: { type: 'string', description: 'Reservation time' },
                      party_size: { type: 'number', description: 'Number of guests' },
                      special_requests: {
                        type: 'string',
                        description: 'Any special requests or dietary restrictions',
                      },
                    },
                    required: ['restaurant_name', 'date', 'time', 'party_size'],
                  },
                },
                {
                  name: 'process_payment',
                  description: 'Process payment for a reservation deposit or prepayment.',
                  parameters: {
                    type: 'object',
                    properties: {
                      amount: { type: 'number', description: 'Amount to charge in dollars' },
                      description: { type: 'string', description: 'Payment description' },
                    },
                    required: ['amount'],
                  },
                },
                {
                  name: 'set_reminder',
                  description: 'Set a reminder for the user (e.g., to cancel reservation if plans change).',
                  parameters: {
                    type: 'object',
                    properties: {
                      reminder_text: { type: 'string', description: 'What to remind the user about' },
                      remind_before_minutes: {
                        type: 'number',
                        description: 'How many minutes before the event to remind',
                      },
                    },
                    required: ['reminder_text'],
                  },
                },
              ],
            },
          ],
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
          // Note: For native audio model, text output is internal "thinking"
          // which shouldn't be displayed to users. The audio IS the response.
          // Only log for debugging, don't show in UI.
          console.log('[VoiceMode] Text (internal):', (text as string).substring(0, 100));
        });

        client.on('turn_complete', () => {
          // Turn complete - audio response finished
          console.log('[VoiceMode] Turn complete');
        });

        client.on('interrupted', () => {
          player.interrupt();
        });

        // Handle tool calls from the model
        client.on('tool_call', async (toolCall) => {
          const { id, name, args } = toolCall as { id: string; name: string; args: Record<string, unknown> };
          console.log('[VoiceMode] Tool call:', id, name, args);

          let response: Record<string, unknown> = {};

          try {
            switch (name) {
              case 'check_calendar': {
                const calendarRes = await fetch('/api/calendar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'check_availability',
                    date: args.date,
                    time: args.time,
                  }),
                });
                const calendarData = await calendarRes.json();

                if (calendarData.available) {
                  response = {
                    available: true,
                    message: 'The user is free at this time.',
                  };
                } else {
                  response = {
                    available: false,
                    conflict: calendarData.conflict?.title || 'another event',
                    suggestedTimes: calendarData.suggestedTimes,
                    message: `The user has "${calendarData.conflict?.title}" at that time. Suggest these alternative times: ${calendarData.suggestedTimes?.join(', ')}`,
                  };
                }
                break;
              }

              case 'make_reservation': {
                // Simulate making a reservation
                const confirmationNumber = `RES${Date.now().toString().slice(-6)}`;
                response = {
                  success: true,
                  confirmationNumber,
                  restaurant: args.restaurant_name,
                  date: args.date,
                  time: args.time,
                  partySize: args.party_size,
                  message: `Reservation confirmed! Confirmation number: ${confirmationNumber}`,
                };

                // Add booking confirmation to chat
                const bookingMessage = {
                  id: `booking-${Date.now()}`,
                  role: 'assistant' as const,
                  content: `Your reservation has been confirmed!`,
                  timestamp: new Date(),
                  booking: {
                    restaurant: {
                      name: args.restaurant_name as string,
                      cuisine: 'Fine Dining',
                      priceLevel: 3,
                      rating: 4.5,
                      address: 'Los Angeles, CA',
                    },
                    date: args.date as string,
                    time: args.time as string,
                    partySize: args.party_size as number,
                    confirmationNumber,
                  },
                };
                addMessage(bookingMessage);

                // Update booking context in store
                updateBookingContext({
                  date: args.date as string,
                  time: args.time as string,
                  partySize: args.party_size as number,
                  step: 'confirmed',
                });

                console.log('[VoiceMode] Reservation made:', response);
                break;
              }

              case 'process_payment': {
                // Simulate payment processing
                const amount = args.amount as number;
                response = {
                  success: true,
                  amount,
                  last4: '4242',
                  message: `Successfully charged $${amount.toFixed(2)} to card ending in 4242.`,
                };
                console.log('[VoiceMode] Payment processed:', response);
                break;
              }

              case 'set_reminder': {
                response = {
                  success: true,
                  reminderText: args.reminder_text,
                  message: `Reminder set: "${args.reminder_text}"`,
                };
                console.log('[VoiceMode] Reminder set:', response);
                break;
              }

              default:
                response = { error: `Unknown tool: ${name}` };
            }
          } catch (err) {
            console.error('[VoiceMode] Tool call error:', err);
            response = { error: 'Failed to execute tool' };
          }

          // Send tool response back to the model
          client.sendToolResponse(id, name, response);
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

        // Send initial greeting to start the conversation
        // The model will respond with audio, starting the interaction
        setTimeout(() => {
          if (client.connected) {
            client.sendText('Hello, I would like to make a dinner reservation for tomorrow at 7pm.');
            console.log('[VoiceMode] Sent initial greeting to start conversation');
          }
        }, 1000);
      } catch (err) {
        console.error('[VoiceMode] Connection failed:', err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(`Connection failed: ${errorMsg}`);
        setVoiceState('idle');
        // Clear the singleton on error so retry is possible
        if (activeConnectionId === myConnectionId) {
          activeConnectionId = null;
        }
      }
    };

    connect();

    // Cleanup
    return () => {
      console.log('[VoiceMode] Cleanup for connection:', myConnectionId);
      recorder.stop();
      player.dispose();
      clientRef.current?.disconnect();
      vad.reset();
      // Only clear the singleton if this is the active connection
      if (activeConnectionId === myConnectionId) {
        activeConnectionId = null;
      }
      connectionIdRef.current = null;
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
