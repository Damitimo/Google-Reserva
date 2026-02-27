'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Message, Restaurant, Reservation } from '@/types';
import RestaurantCard from './RestaurantCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Sparkles, Calendar, Users, MapPin, Edit3, X, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    setInput('');
    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
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

      // Update map with restaurants if returned
      if (data.restaurants && data.restaurants.length > 0) {
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

      // Update assistant message
      updateLastMessage({
        content: data.content,
        toolCalls: data.toolCalls,
        restaurants: data.restaurants,
        reservation: updatedReservation,
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
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">Sarah Chen</p>
              <p className="text-xs text-gray-500">Google Pay linked</p>
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
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} isLoading={isLoading} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 md:p-4 border-t border-gray-100 bg-white safe-area-inset-bottom overflow-hidden">
        <div className="flex items-end gap-2 max-w-full">
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
              className="absolute right-2 bottom-1.5 md:bottom-2 p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors"
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

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
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
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-gray-900">{reservation.restaurant.name}</h4>
          <p className="text-sm text-gray-500">{reservation.restaurant.cuisine}</p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="whitespace-nowrap">{reservation.date} at {reservation.time}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="whitespace-nowrap">{reservation.partySize} guests</span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-500">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <span>{reservation.restaurant.address}</span>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">Confirmation: <span className="font-mono">{reservation.confirmationCode}</span></p>
        </div>
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

function MessageBubble({ message, isLoading }: { message: Message; isLoading: boolean }) {
  const isUser = message.role === 'user';
  const isLastMessage = useAppStore.getState().messages[useAppStore.getState().messages.length - 1]?.id === message.id;
  const showLoading = isLoading && isLastMessage && !message.content;

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

            {/* Restaurant cards - horizontal scroll */}
            {message.restaurants && message.restaurants.length > 0 && (
              <div className="mt-2 -mr-4 md:-mr-6 h-[440px] md:h-[460px]">
                <div className="flex gap-3 overflow-x-auto overflow-y-hidden h-full pb-2 pr-4 md:pr-6 scrollbar-hide snap-x snap-mandatory">
                  {message.restaurants.map((restaurant, index) => (
                    <div key={restaurant.id} className="flex-shrink-0 w-[280px] md:w-72 h-[420px] md:h-[440px] snap-start">
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
          </div>
        )}
      </div>
    </motion.div>
  );
}
