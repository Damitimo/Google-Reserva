'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Message, Restaurant, Reservation, QuickReply } from '@/types';
import RestaurantCard from './RestaurantCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Sparkles, Calendar, Users, MapPin, Edit3, X, CheckCircle2, XCircle, CreditCard, Clock, ChevronDown, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Module-level lock to prevent double booking submissions (survives React re-renders)
let isProcessingBooking = false;
let lastProcessedMessage = '';

const SUGGESTED_PROMPTS = [
  "Find me a romantic Italian spot near the Ace Hotel",
  "What's good for a business dinner in Beverly Hills?",
  "I want authentic Mexican food, casual vibe, under $30pp",
  "Best sushi within walking distance of Downtown LA",
];

export default function Chat() {
  const messages = useAppStore((state) => state.messages);
  const addMessage = useAppStore((state) => state.addMessage);
  const updateLastMessage = useAppStore((state) => state.updateLastMessage);
  const isLoading = useAppStore((state) => state.isLoading);
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const setMarkers = useAppStore((state) => state.setMarkers);
  const setSearchRadius = useAppStore((state) => state.setSearchRadius);
  const setMapCenter = useAppStore((state) => state.setMapCenter);
  const currentReservation = useAppStore((state) => state.currentReservation);
  const setCurrentReservation = useAppStore((state) => state.setCurrentReservation);
  const bookingContext = useAppStore((state) => state.bookingContext);
  const updateBookingContext = useAppStore((state) => state.updateBookingContext);
  const openBookingModal = useAppStore((state) => state.openBookingModal);
  const pendingBookingMessage = useAppStore((state) => state.pendingBookingMessage);
  const clearPendingBookingMessage = useAppStore((state) => state.clearPendingBookingMessage);
  const isInBookingFlow = useAppStore((state) => state.isInBookingFlow);
  const setIsInBookingFlow = useAppStore((state) => state.setIsInBookingFlow);

  const [input, setInput] = useState('');
  const [calendarCheckAfterMessageId, setCalendarCheckAfterMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-submit when a booking is triggered from restaurant card
  useEffect(() => {
    // Use module-level variables to prevent double submission
    if (pendingBookingMessage &&
        !isLoading &&
        !isProcessingBooking &&
        pendingBookingMessage !== lastProcessedMessage) {
      isProcessingBooking = true;
      lastProcessedMessage = pendingBookingMessage;
      const message = pendingBookingMessage;
      clearPendingBookingMessage();
      handleSubmit(message).finally(() => {
        isProcessingBooking = false;
        // Reset lastProcessedMessage after a delay to allow rebooking same restaurant
        setTimeout(() => {
          lastProcessedMessage = '';
        }, 2000);
      });
    }
  }, [pendingBookingMessage]);

  const handleSubmit = async (text?: string, customMessageId?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    // Clear calendar check if this is not a time selection (no customMessageId)
    if (!customMessageId) {
      setCalendarCheckAfterMessageId(null);
    }

    setInput('');
    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: customMessageId || Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    // Add placeholder assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    addMessage(assistantMessage);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      // Update map with restaurants if returned (but NOT during booking flow)
      // If quickReplies exist, we're in booking flow - don't update map markers
      if (data.restaurants && data.restaurants.length > 0 && !data.quickReplies) {
        // Clear existing markers first
        setMarkers([]);

        // Add markers with staggered animation
        data.restaurants.forEach((restaurant: Restaurant, index: number) => {
          setTimeout(() => {
            useAppStore.getState().setMarkers([
              ...useAppStore.getState().mapState.markers,
              restaurant,
            ]);
          }, index * 200);
        });

        // Set search radius if provided
        if (data.mapUpdate?.center) {
          setMapCenter(data.mapUpdate.center);
          if (data.mapUpdate.radius) {
            setSearchRadius(data.mapUpdate.center, data.mapUpdate.radius);
          }
        }
      }

      // Handle modified reservation
      let updatedReservation = undefined;
      if (data.modifiedReservation && currentReservation) {
        const mod = data.modifiedReservation;
        updatedReservation = {
          id: mod.new_confirmation_code,
          restaurant: currentReservation.restaurant,
          date: mod.changes_made.date !== 'unchanged' ? mod.changes_made.date : currentReservation.date,
          time: mod.changes_made.time !== 'unchanged' ? mod.changes_made.time : currentReservation.time,
          partySize: mod.changes_made.party_size !== 'unchanged' ? mod.changes_made.party_size : currentReservation.partySize,
          status: 'confirmed' as const,
          confirmationCode: mod.new_confirmation_code,
          specialRequests: currentReservation.specialRequests,
        };
        setCurrentReservation(updatedReservation);
      }

      // Update booking context if booking summary is returned
      if (data.bookingSummary) {
        updateBookingContext({
          restaurant: data.bookingSummary.restaurant,
          partySize: data.bookingSummary.partySize,
          date: data.bookingSummary.date,
          time: data.bookingSummary.time,
          step: 'collecting',
        });
      }

      // CLIENT-SIDE BOOKING LOCK: Track when we're in booking flow
      // Enter booking flow when quickReplies appear (from collect_booking_info)
      if (data.quickReplies && data.quickReplies.length > 0) {
        setIsInBookingFlow(true);
      }
      // Exit booking flow when booking is complete (confirmed) or there's a booking summary with confirm action
      if (data.bookingSummary && data.quickReplies?.some((r: { action?: string }) => r.action === 'confirm_booking')) {
        // Still in booking flow until confirmed
      } else if (!data.quickReplies && !data.bookingSummary && isInBookingFlow) {
        // If we're in booking flow but this response has no quick replies or summary,
        // check if it looks like a normal search response - if so, we exited booking
        if (data.restaurants && data.restaurants.length > 0) {
          setIsInBookingFlow(false);
        }
      }

      // STRICTER FILTERING: If quickReplies exist (booking flow), ignore any restaurants
      // This prevents restaurant cards from appearing during booking conversations
      const filteredRestaurants = data.quickReplies ? undefined : data.restaurants;

      // Update assistant message
      updateLastMessage({
        content: data.content,
        toolCalls: data.toolCalls,
        restaurants: filteredRestaurants,
        reservation: updatedReservation,
        quickReplies: data.quickReplies,
        bookingSummary: data.bookingSummary,
      });
    } catch (error) {
      console.error('Chat error:', error);
      updateLastMessage({
        content: "I'm sorry, I encountered an error. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickReply = async (reply: QuickReply) => {
    if (reply.action === 'confirm_booking' && bookingContext.restaurant) {
      // Open booking modal for final confirmation
      setCalendarCheckAfterMessageId(null); // Clear calendar check
      updateBookingContext({ step: 'confirming' });
      setIsInBookingFlow(false); // Reset booking flow lock when confirming
      openBookingModal(bookingContext.restaurant);
    } else if (reply.action === 'change_details') {
      // Let user type what they want to change
      handleSubmit("I'd like to change the booking details");
    } else {
      // Check if this is a time selection (matches time pattern like "7:00 PM", "7:30 PM")
      const isTimeSelection = /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(reply.value);

      if (isTimeSelection) {
        // Set the message ID after which calendar check should appear
        const messageId = Date.now().toString();
        setCalendarCheckAfterMessageId(messageId);
        handleSubmit(reply.value, messageId);
      } else {
        // Regular quick reply - send as user message
        handleSubmit(reply.value);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-x-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-google-blue via-google-red to-google-yellow flex items-center justify-center">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm md:text-base">Donna</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-google-green rounded-full animate-pulse" />
                <p className="text-xs md:text-sm text-gray-500">Agent active</p>
              </div>
            </div>
          </div>
          {/* User Profile */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs sm:text-sm font-medium text-gray-900">Sarah Chen</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Google Pay linked</p>
            </div>
            <img
              src="https://i.pravatar.cc/150?img=47"
              alt="Sarah Chen"
              className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-google-blue"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-sm"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-google-blue via-google-red to-google-yellow flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Where would you like to eat?
              </h2>
              <p className="text-gray-500 mb-6">
                Tell me what you're in the mood for and I'll find the perfect spot.
              </p>

              <div className="space-y-2">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSubmit(prompt)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-700 transition-colors"
                  >
                    "{prompt}"
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={message.id}>
                <MessageBubble message={message} isLoading={isLoading} onQuickReply={handleQuickReply} isLastMessage={index === messages.length - 1} />
                {/* Calendar check animation - appears after the time selection message */}
                {calendarCheckAfterMessageId === message.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start mt-3"
                  >
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" fill="#4285F4"/>
                        <path d="M12 13h5v5h-5z" fill="#34A853"/>
                      </svg>
                      <span className="text-sm text-gray-700">Checking your calendar...</span>
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex items-center gap-1 text-google-green"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">You're free!</span>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 md:p-4 border-t border-gray-100 bg-white safe-area-inset-bottom overflow-hidden">
        <div className="flex items-center gap-2 max-w-full">
          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Find me a restaurant..."
              rows={1}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 pr-10 md:pr-12 border border-gray-200 rounded-2xl resize-none text-sm focus:border-google-blue focus:ring-2 focus:ring-google-blue/20 transition-all"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Voice input (coming soon)"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-google-blue text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-google-blue/30"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2 hidden md:block">
          Powered by Google Gemini & Maps
        </p>
      </div>
    </div>
  );
}

function CancelReminderPrompt() {
  const [reminderState, setReminderState] = useState<'prompt' | 'added' | 'dismissed'>('prompt');

  if (reminderState === 'added') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 bg-google-green/10 border border-google-green/20 rounded-xl px-4 py-3"
      >
        <CheckCircle2 className="w-4 h-4 text-google-green flex-shrink-0" />
        <span className="text-sm text-gray-700">Reminder added to your device</span>
      </motion.div>
    );
  }

  if (reminderState === 'dismissed') {
    return null;
  }

  return (
    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
      <p className="text-sm text-gray-700 mb-2">Want me to remind you to cancel if your plans change?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setReminderState('added')}
          className="px-3 py-1.5 bg-google-blue text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors"
        >
          Yes please
        </button>
        <button
          onClick={() => setReminderState('dismissed')}
          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors"
        >
          I'm all set
        </button>
      </div>
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const setCurrentReservation = useAppStore((state) => state.setCurrentReservation);
  const addMessage = useAppStore((state) => state.addMessage);
  const updateLastMessage = useAppStore((state) => state.updateLastMessage);
  const messages = useAppStore((state) => state.messages);

  const isCancelled = reservation.status === 'cancelled';

  const handleModify = async () => {
    if (isModifying) return;
    setIsModifying(true);

    const userContent = `I need to modify my reservation at ${reservation.restaurant.name}. Current reservation: ${reservation.date} at ${reservation.time}, party of ${reservation.partySize}. Confirmation code: ${reservation.confirmationCode}.`;

    const userMessage = {
      id: `modify-${Date.now()}`,
      role: 'user' as const,
      content: userContent,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    // Add placeholder for assistant response
    addMessage({
      id: `modify-response-${Date.now()}`,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date(),
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      // If there's a modified reservation, create a new reservation object
      let updatedReservation = undefined;
      if (data.modifiedReservation) {
        const mod = data.modifiedReservation;
        updatedReservation = {
          id: mod.new_confirmation_code,
          restaurant: reservation.restaurant,
          date: mod.changes_made.date !== 'unchanged' ? mod.changes_made.date : reservation.date,
          time: mod.changes_made.time !== 'unchanged' ? mod.changes_made.time : reservation.time,
          partySize: mod.changes_made.party_size !== 'unchanged' ? mod.changes_made.party_size : reservation.partySize,
          status: 'confirmed' as const,
          confirmationCode: mod.new_confirmation_code,
          specialRequests: reservation.specialRequests,
        };
        setCurrentReservation(updatedReservation);
      }

      updateLastMessage({
        content: data.content,
        reservation: updatedReservation,
      });
    } catch (error) {
      console.error('Modify error:', error);
      updateLastMessage({
        content: "I can help you modify your reservation. What would you like to change - the time, date, or party size?",
      });
    } finally {
      setIsModifying(false);
    }
  };

  const handleCancel = () => {
    setShowCancelConfirm(false);
    const cancelledReservation = {
      ...reservation,
      status: 'cancelled' as const,
    };
    setCurrentReservation(null);
    addMessage({
      id: `cancel-${Date.now()}`,
      role: 'assistant',
      content: `Your reservation at **${reservation.restaurant.name}** has been cancelled. Your deposit will be refunded within 3-5 business days. Would you like me to find you another restaurant?`,
      timestamp: new Date(),
      reservation: cancelledReservation,
    });
  };

  // Cancelled reservation card
  if (isCancelled) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-sm"
      >
        {/* Header */}
        <div className="bg-red-50 px-4 py-3 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-500" />
          <span className="font-medium text-red-600">Reservation Cancelled</span>
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-gray-900">{reservation.restaurant.name}</h4>
            <p className="text-sm text-gray-500">{reservation.restaurant.cuisine}</p>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-400 line-through">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">{reservation.date} at {reservation.time}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 line-through">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">{reservation.partySize} guests</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">Cancelled booking: <span className="font-mono">{reservation.confirmationCode}</span></p>
          </div>

          {/* Refund info */}
          <div className="bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-google-blue flex-shrink-0" />
            <span className="text-xs text-gray-600">Deposit refund processing (3-5 business days)</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-sm"
    >
      {/* Header */}
      <div className="bg-google-green/10 px-4 py-3 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-google-green" />
        <span className="font-medium text-google-green">Reservation Confirmed</span>
      </div>

      {/* Details */}
      <div className="p-4 space-y-2">
        <div>
          <h4 className="font-semibold text-gray-900">{reservation.restaurant.name}</h4>
          <p className="text-sm text-gray-500">{reservation.restaurant.cuisine}</p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="whitespace-nowrap">{reservation.date} at {reservation.time}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="whitespace-nowrap">{reservation.partySize} guests</span>
          </div>
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          {showDetails ? 'Hide details' : 'Show details'}
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2"
            >
              <div className="flex items-start gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{reservation.restaurant.address}</span>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">Confirmation: <span className="font-mono">{reservation.confirmationCode}</span></p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      {showCancelConfirm ? (
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600 mb-3">Cancel this reservation?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Keep it
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600"
            >
              Yes, cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex border-t border-gray-100">
          <button
            onClick={handleModify}
            disabled={isModifying}
            className="flex-1 py-3 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Edit3 className={`w-4 h-4 ${isModifying ? 'animate-spin' : ''}`} />
            {isModifying ? 'Modifying...' : 'Modify'}
          </button>
          <div className="w-px bg-gray-100" />
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="flex-1 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}
    </motion.div>
  );
}

function MessageBubble({ message, isLoading, onQuickReply, isLastMessage }: { message: Message; isLoading: boolean; onQuickReply: (reply: QuickReply) => void; isLastMessage: boolean }) {
  const isUser = message.role === 'user';
  const showLoading = isLoading && isLastMessage && !message.content;
  const buttonsActive = isLastMessage && !isLoading;
  // Get global booking flow state to hide restaurant cards during booking
  const isInBookingFlow = useAppStore((state) => state.isInBookingFlow);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] ${
          isUser
            ? 'bg-google-blue text-white rounded-2xl rounded-br-md px-4 py-3'
            : ''
        }`}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : showLoading ? (
          <div className="typing-indicator bg-gray-100 rounded-2xl rounded-bl-md">
            <span></span>
            <span></span>
            <span></span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Text content */}
            {message.content && (
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="text-sm text-gray-800 prose prose-sm prose-gray max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Booking summary card */}
            {message.bookingSummary && (
              <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                    {message.bookingSummary.restaurant.photos?.[0] ? (
                      <img
                        src={message.bookingSummary.restaurant.photos[0]}
                        alt={message.bookingSummary.restaurant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">🍽️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{message.bookingSummary.restaurant.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        {message.bookingSummary.partySize} people
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        {message.bookingSummary.date}
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        {message.bookingSummary.time}
                      </span>
                    </div>
                    {(message.bookingSummary.depositAmount ?? 0) > 0 ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-1">
                          <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Deposit: ${message.bookingSummary.depositAmount}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-xs text-gray-500 mt-0.5">
                          <Shield className="w-3.5 h-3.5 flex-shrink-0 text-google-green mt-0.5" />
                          <span>Refundable if cancelled 5hrs before, I'll remind you</span>
                        </div>
                      </>
                    ) : message.bookingSummary.depositPolicy ? (
                      <div className="flex items-start gap-1.5 text-xs text-gray-500 mt-1">
                        <Shield className="w-3.5 h-3.5 flex-shrink-0 text-google-green mt-0.5" />
                        <span>No deposit required for {message.bookingSummary.partySize} guests</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-google-green mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>No payment required</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick reply buttons - only show on last message */}
            {message.quickReplies && message.quickReplies.length > 0 && buttonsActive && (
              <div className="flex flex-wrap gap-2">
                {message.quickReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => onQuickReply(reply)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      reply.action === 'confirm_booking'
                        ? 'bg-google-blue text-white hover:bg-blue-600'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {reply.label}
                  </button>
                ))}
              </div>
            )}

            {/* Restaurant cards - horizontal scroll (don't show during booking flow) */}
            {/* Additional guard: also hide if global isInBookingFlow is true */}
            {message.restaurants && message.restaurants.length > 0 && !message.quickReplies && !message.bookingSummary && !isInBookingFlow && (
              <div className="mt-2 -mr-4 md:-mr-6 h-[360px] md:h-[420px]">
                <div className="flex gap-3 overflow-x-auto overflow-y-hidden h-full pb-2 pr-4 md:pr-6 scrollbar-hide snap-x snap-mandatory">
                  {message.restaurants.map((restaurant, index) => (
                    <div key={restaurant.id} className="flex-shrink-0 w-[240px] md:w-72 h-[340px] md:h-[400px] snap-start">
                      <RestaurantCard
                        restaurant={restaurant}
                        index={index}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reservation confirmation card */}
            {message.reservation && (
              <ReservationCard reservation={message.reservation} />
            )}

            {/* Added to calendar confirmation - shows after confirmed reservation */}
            {message.reservation && message.reservation.status === 'confirmed' && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm mt-2"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" fill="#4285F4"/>
                    <path d="M12 13h5v5h-5z" fill="#34A853"/>
                  </svg>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">Added to Google Calendar</span>
                    <p className="text-xs text-gray-500">{message.reservation.time} · {message.reservation.date}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-google-green flex-shrink-0" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="mt-2"
                >
                  <CancelReminderPrompt />
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
