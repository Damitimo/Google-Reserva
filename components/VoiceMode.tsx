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

    const systemPrompt = `You are a Gemini Agent, a warm and helpful dining concierge powered by Google. You help users find restaurants and make reservations in Los Angeles.

CRITICAL RULES:
1. Only speak your direct responses to the user. NEVER speak your internal thoughts or reasoning out loud.
2. ALWAYS use check_calendar before confirming any reservation time to ensure the user is free.
3. If there's a calendar conflict, tell the user about it naturally (e.g., "Oh, I see you have dinner with Sarah at 7pm. How about 5:30pm or 9pm instead?")
4. NEVER make a reservation without EXPLICIT user confirmation.
5. NEVER charge the card without EXPLICIT payment confirmation. Say "This restaurant requires a $25 deposit to hold the table. Should I charge your card on file?" and WAIT for "yes".

Your capabilities:
- check_calendar: Check if the user is free at a specific date and time. ALWAYS use before booking.
- make_reservation: Complete a restaurant reservation - ONLY after explicit user confirmation
- process_payment: Charge the user's card - ONLY after explaining the deposit and getting explicit "yes"
- set_reminder: Set reminders (e.g., cancellation reminders)

Your personality:
- Warm, knowledgeable, and efficient
- Speak naturally like a trusted friend who knows all the best spots
- Keep responses concise (2-3 sentences max)
- Be PROACTIVE with helpful insights

CONTEXT INFERENCE - Be smart about understanding context:
- "dinner with girlfriend/boyfriend/wife/husband" = 2 people, romantic occasion (DON'T ask how many)
- "business dinner with clients" = likely 4-6 people, professional setting
- "birthday dinner" = celebration, ask party size
- "date night" = 2 people, romantic
- "family dinner" = ask party size

PERSONALIZATION - Only ask what you don't know:
- If occasion is clear from context (e.g., "girlfriend"), don't ask "what's the occasion?"
- If party size is implied (e.g., "girlfriend" = 2), don't ask "how many people?"
- Use context to tailor recommendations (romantic = intimate lighting, business = quiet for conversation)

PROACTIVE TIPS - Offer helpful insights:
- Traffic: "Heads up, traffic on the 405 is heavy around that time. You might want to leave 20 minutes early."
- Budget: "Just so you know, you've spent about $400 on dining this month. This would be around $150 for two."
- Weather: "It's supposed to be nice tonight - maybe request patio seating?"

Reservation flow - WAIT FOR USER CONFIRMATION AT EACH STEP:
1. INFER what you can from context (girlfriend=2 people+romantic, business=professional)
2. Ask about LOCATION if not mentioned: "Where are you thinking? Downtown, the Westside, or somewhere else?"
3. WAIT for user to answer
4. Ask about CUISINE if not mentioned: "Any type of food in mind - Italian, Japanese, something else?"
5. WAIT for user to answer
6. Ask about DIETARY RESTRICTIONS: "Any allergies or dietary restrictions I should know about?"
7. WAIT for user to answer (if none, proceed; if yes, factor into recommendation)
8. Ask about TIME if not mentioned: "What time works for you?"
9. WAIT for user to answer
10. Suggest a restaurant that accommodates their dietary needs: "How about [Restaurant]? Great for a romantic evening with [feature]. Does that sound good?"
11. WAIT for user to confirm the restaurant
12. ONLY THEN check_calendar silently for the time
13. If calendar is clear: "You're free at [time]. So that's [Restaurant] at [time] for 2. Should I book it?"
14. WAIT for explicit "yes" / "book it" / "go ahead"
15. BEFORE payment: "This restaurant requires a $25 deposit. Should I charge your Google Pay?"
16. WAIT for explicit "yes"
17. ONLY THEN call process_payment, then make_reservation (include dietary restrictions in special requests)
18. After booking: "All set! Want me to set a reminder in case you need to cancel?"

IMPORTANT: Each step should be a SEPARATE turn. Don't combine multiple questions. Ask ONE thing at a time and wait for the response.

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
          console.log('[VoiceMode] Turn complete - setting state to listening');
          setVoiceState('listening');
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
                const confirmationCode = `RES${Date.now().toString().slice(-6)}`;
                const restaurantName = (args.restaurant_name as string) || 'Restaurant';
                const reservationDate = (args.date as string) || 'Today';
                const reservationTime = (args.time as string) || '7:00 PM';
                const partySize = (args.party_size as number) || 2;
                const specialRequests = (args.special_requests as string) || undefined;

                console.log('[VoiceMode] make_reservation args:', args);

                response = {
                  success: true,
                  confirmationCode,
                  restaurant: restaurantName,
                  date: reservationDate,
                  time: reservationTime,
                  partySize,
                  specialRequests,
                  message: `Reservation confirmed! Confirmation number: ${confirmationCode}`,
                };

                // Create proper reservation object for the card
                const reservation = {
                  id: confirmationCode,
                  restaurant: {
                    id: `voice-${Date.now()}`,
                    name: restaurantName,
                    cuisine: 'Fine Dining',
                    priceLevel: 3 as const,
                    rating: 4.5,
                    reviewCount: 150,
                    address: 'Los Angeles, CA',
                    location: { lat: 34.0522, lng: -118.2437 },
                    photos: [],
                    openNow: true,
                    highlights: [],
                  },
                  date: reservationDate,
                  time: reservationTime,
                  partySize,
                  status: 'confirmed' as const,
                  confirmationCode,
                  specialRequests,
                };

                // Add reservation confirmation to chat (with card, no text)
                const bookingMessage = {
                  id: `booking-${Date.now()}`,
                  role: 'assistant' as const,
                  content: '', // No text - let the card speak for itself
                  timestamp: new Date(),
                  reservation,
                };
                console.log('[VoiceMode] Adding reservation card:', JSON.stringify(bookingMessage, null, 2));
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
                const amount = (args.amount as number) || 25; // Default $25 deposit
                response = {
                  success: true,
                  amount,
                  last4: '4242',
                  cardType: 'Visa',
                  message: `Payment successful. Charged $${amount.toFixed(2)} to Visa ending in 4242. The deposit is fully refundable if you cancel 24 hours before your reservation.`,
                };
                console.log('[VoiceMode] Payment processed:', response);

                // Explicitly tell model to continue speaking after payment
                setTimeout(() => {
                  console.log('[VoiceMode] Tool response sent, model should continue...');
                }, 100);
                break;
              }

              case 'set_reminder': {
                const reminderText = args.reminder_text as string || 'Cancellation reminder';
                const reminderTime = args.remind_before_minutes as number || 60;

                response = {
                  success: true,
                  reminderText,
                  reminderTime,
                  message: `Reminder set: "${reminderText}" - ${reminderTime} minutes before`,
                };

                // Add reminder confirmation to chat
                const reminderMessage = {
                  id: `reminder-${Date.now()}`,
                  role: 'assistant' as const,
                  content: '',
                  timestamp: new Date(),
                  reminderConfirmation: {
                    text: reminderText,
                    time: `${reminderTime} minutes before reservation`,
                  },
                };
                addMessage(reminderMessage);

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
          console.log('[VoiceMode] Sending tool response:', { id, name, response });
          setVoiceState('processing'); // Show processing while model generates response
          client.sendToolResponse(id, name, response);
          console.log('[VoiceMode] Tool response sent, waiting for model to continue...');
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
          <span className="text-white font-medium">Gemini Agent</span>
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
            {voiceState === 'speaking' && 'Speaking...'}
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
          Speak naturally • Gemini will respond in real-time
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
