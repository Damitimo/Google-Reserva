'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Calendar, Clock, Users, MessageSquare, Loader2, CheckCircle2, CalendarPlus, Share2, CreditCard, Wallet, Shield } from 'lucide-react';

type BookingStep = 'details' | 'linkPayment' | 'review' | 'processing' | 'confirmed';

// Helper to calculate deposit amount based on policy and party size
function calculateDeposit(policy: { type: string; amount: number; minPartySize?: number } | undefined, partySize: number): number {
  if (!policy || policy.type === 'hold_only') return 0;

  // Check if party size threshold applies
  if (policy.minPartySize && partySize < policy.minPartySize) return 0;

  if (policy.type === 'per_person') {
    return policy.amount * partySize;
  }

  return policy.amount; // flat deposit
}

// Helper to format deposit display
function formatDepositLabel(policy: { type: string; amount: number; minPartySize?: number } | undefined, partySize: number): string {
  if (!policy) return '';

  if (policy.type === 'hold_only') {
    return 'Card hold only';
  }

  if (policy.minPartySize && partySize < policy.minPartySize) {
    return `Deposit required for ${policy.minPartySize}+ guests`;
  }

  if (policy.type === 'per_person') {
    return `$${policy.amount}/person × ${partySize}`;
  }

  return 'Reservation deposit';
}

export default function BookingModal() {
  const { showBookingModal, bookingRestaurant, closeBookingModal, setCurrentReservation, addMessage } = useAppStore();
  const [step, setStep] = useState<BookingStep>('details');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [isGooglePayLinked, setIsGooglePayLinked] = useState(false);
  const [isLinkingPayment, setIsLinkingPayment] = useState(false);

  useEffect(() => {
    if (showBookingModal) {
      setStep('details');
      setSelectedTime(bookingRestaurant?.availableTimes?.[0] || '');
      setPartySize(2);
      setSpecialRequests('');
      setCalendarAdded(false);
    }
  }, [showBookingModal, bookingRestaurant]);

  const handleContinueToPayment = () => {
    if (isGooglePayLinked) {
      setStep('review');
    } else {
      setStep('linkPayment');
    }
  };

  const handleLinkGooglePay = async () => {
    setIsLinkingPayment(true);
    // Simulate Google Pay linking
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGooglePayLinked(true);
    setIsLinkingPayment(false);
    setStep('review');
  };

  const handleBook = async () => {
    setStep('processing');

    // Simulate booking process with steps (includes payment)
    await new Promise(resolve => setTimeout(resolve, 1800));
    await new Promise(resolve => setTimeout(resolve, 1800));
    await new Promise(resolve => setTimeout(resolve, 1800));

    const code = `RES${Date.now().toString(36).toUpperCase()}`;
    setConfirmationCode(code);

    if (bookingRestaurant) {
      setCurrentReservation({
        id: code,
        restaurant: bookingRestaurant,
        date: 'Tonight',
        time: selectedTime,
        partySize,
        status: 'confirmed',
        confirmationCode: code,
        specialRequests,
      });
    }

    setStep('confirmed');
  };

  const handleAddToCalendar = () => {
    if (!bookingRestaurant) return;
    // Simulate adding to Google Calendar via API
    setCalendarAdded(true);
  };

  const handleDone = () => {
    if (bookingRestaurant && confirmationCode) {
      const reservation = {
        id: confirmationCode,
        restaurant: bookingRestaurant,
        date: 'Tonight',
        time: selectedTime,
        partySize,
        status: 'confirmed' as const,
        confirmationCode,
        specialRequests,
      };

      addMessage({
        id: `res-${Date.now()}`,
        role: 'assistant',
        content: `Your reservation at **${bookingRestaurant.name}** is confirmed for **${selectedTime}** tonight, party of ${partySize}.`,
        timestamp: new Date(),
        reservation,
      });
    }
    closeBookingModal();
  };

  if (!showBookingModal || !bookingRestaurant) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && step !== 'processing' && closeBookingModal()}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="booking-modal bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="relative p-6 border-b border-gray-100">
            <button
              onClick={closeBookingModal}
              disabled={step === 'processing'}
              className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 pr-8">
              {step === 'confirmed' ? 'Reservation Confirmed!' : `Reserve at ${bookingRestaurant.name}`}
            </h2>
            <p className="text-gray-500 mt-1">{bookingRestaurant.cuisine} • {bookingRestaurant.address}</p>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'details' && (
              <div className="space-y-5">
                {/* Date */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    Date
                  </label>
                  <div className="flex gap-2">
                    {['Tonight', 'Tomorrow', 'Sat', 'Sun'].map((date) => (
                      <button
                        key={date}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          date === 'Tonight'
                            ? 'bg-google-blue text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {date}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    Time
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {bookingRestaurant.availableTimes?.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedTime === time
                            ? 'bg-google-blue text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Party Size */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    Party size
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPartySize(Math.max(1, partySize - 1))}
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-medium"
                    >
                      −
                    </button>
                    <span className="text-2xl font-semibold w-8 text-center">{partySize}</span>
                    <button
                      onClick={() => setPartySize(Math.min(12, partySize + 1))}
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-medium"
                    >
                      +
                    </button>
                    <span className="text-gray-500 text-sm">
                      {partySize === 1 ? 'guest' : 'guests'}
                    </span>
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare className="w-4 h-4 mr-2 text-gray-400" />
                    Special requests
                  </label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Allergies, occasion, seating preference..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none h-20 text-sm"
                  />
                </div>

                {/* Deposit Notice */}
                {bookingRestaurant.depositPolicy && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-amber-800 font-medium">
                        {bookingRestaurant.depositPolicy.type === 'hold_only'
                          ? 'Card hold required'
                          : formatDepositLabel(bookingRestaurant.depositPolicy, partySize)}
                      </span>
                    </div>
                    {calculateDeposit(bookingRestaurant.depositPolicy, partySize) > 0 && (
                      <span className="text-sm font-bold text-amber-900">
                        ${calculateDeposit(bookingRestaurant.depositPolicy, partySize)}.00
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 'linkPayment' && (
              <div className="py-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-google-blue/10 flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-google-blue" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Link Google Pay</h3>
                  <p className="text-sm text-gray-500">
                    Connect your Google Pay to complete reservations with deposits securely.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-google-green" />
                    <span className="text-sm font-medium text-gray-700">Secure & Protected</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-google-green mt-0.5 flex-shrink-0" />
                      <span>Your card details are encrypted and never shared with restaurants</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-google-green mt-0.5 flex-shrink-0" />
                      <span>Deposits are fully refundable if cancelled 24hrs in advance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-google-green mt-0.5 flex-shrink-0" />
                      <span>One-tap payments for future reservations</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleLinkGooglePay}
                  disabled={isLinkingPayment}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-70"
                >
                  {isLinkingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span>Continue with Google Pay</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setStep('details')}
                  className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to details
                </button>
              </div>
            )}

            {step === 'review' && (
              <div className="py-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review & Confirm</h3>

                {/* Reservation Summary */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">Date</p>
                      <p className="font-medium">Tonight</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Time</p>
                      <p className="font-medium">{selectedTime}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Party Size</p>
                      <p className="font-medium">{partySize} guests</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Restaurant</p>
                      <p className="font-medium truncate">{bookingRestaurant?.name}</p>
                    </div>
                  </div>
                  {specialRequests && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-400 text-xs">Special Requests</p>
                      <p className="text-sm text-gray-700">{specialRequests}</p>
                    </div>
                  )}
                </div>

                {/* Payment Details */}
                <div className="border border-gray-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Payment Method</span>
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="text-sm text-gray-600">••••4242</span>
                    </div>
                  </div>
                  {calculateDeposit(bookingRestaurant?.depositPolicy, partySize) > 0 ? (
                    <>
                      <div className="flex items-center justify-between py-3 border-t border-gray-100">
                        <span className="text-sm text-gray-600">
                          {formatDepositLabel(bookingRestaurant?.depositPolicy, partySize)}
                        </span>
                        <span className="text-sm font-medium">
                          ${calculateDeposit(bookingRestaurant?.depositPolicy, partySize)}.00
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <span className="text-sm font-semibold text-gray-900">Total to pay now</span>
                        <span className="text-lg font-bold text-gray-900">
                          ${calculateDeposit(bookingRestaurant?.depositPolicy, partySize)}.00
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between py-3 border-t border-gray-100">
                      <span className="text-sm text-gray-600">Card hold only</span>
                      <span className="text-sm font-medium text-gray-400">No charge</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-400 text-center mb-4">
                  Deposit is refundable if cancelled 24 hours in advance
                </p>

                <button
                  onClick={handleBook}
                  className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>
                    {calculateDeposit(bookingRestaurant?.depositPolicy, partySize) > 0
                      ? `Confirm & Pay $${calculateDeposit(bookingRestaurant?.depositPolicy, partySize)}`
                      : 'Confirm Reservation'}
                  </span>
                </button>

                <button
                  onClick={() => setStep('details')}
                  className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to details
                </button>
              </div>
            )}

            {step === 'processing' && (
              <div className="py-6 space-y-4">
                {/* UCP Protocol Badge */}
                <div className="flex items-center justify-center gap-2 mb-4 py-2 px-3 bg-gray-50 rounded-lg mx-auto w-fit">
                  <div className="w-2 h-2 bg-google-green rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-gray-600">Universal Commerce Protocol</span>
                </div>

                <ProcessingStep
                  label="Connecting via UCP"
                  sublabel="Protocol handshake"
                  status="completed"
                  delay={0}
                />
                <ProcessingStep
                  label="Checking real-time availability"
                  sublabel="OpenTable Gateway"
                  status="completed"
                  delay={1000}
                />
                <ProcessingStep
                  label="Securing your table"
                  sublabel="Inventory locked"
                  status="completed"
                  delay={2000}
                />
                {calculateDeposit(bookingRestaurant?.depositPolicy, partySize) > 0 ? (
                  <ProcessingStep
                    label={`Processing $${calculateDeposit(bookingRestaurant?.depositPolicy, partySize)} deposit`}
                    sublabel="Google Pay • ••••4242"
                    status="completed"
                    delay={3000}
                    icon={<CreditCard className="w-5 h-5 text-google-blue" />}
                  />
                ) : (
                  <ProcessingStep
                    label="Authorizing card hold"
                    sublabel="Google Pay • ••••4242"
                    status="completed"
                    delay={3000}
                    icon={<CreditCard className="w-5 h-5 text-google-blue" />}
                  />
                )}
                <ProcessingStep
                  label="Confirming with restaurant"
                  sublabel="Finalizing reservation"
                  status="loading"
                  delay={4000}
                />
              </div>
            )}

            {step === 'confirmed' && (
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-google-green/10 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-google-green" />
                </motion.div>

                {/* UCP Gateway Badge */}
                <div className="flex items-center justify-center gap-2 mb-4 py-2 px-3 bg-gray-50 rounded-lg mx-auto w-fit">
                  <div className="w-2 h-2 bg-google-green rounded-full" />
                  <span className="text-xs text-gray-500">Booked via</span>
                  <span className="text-xs font-medium text-gray-700">OpenTable</span>
                  <span className="text-xs text-gray-400">• UCP Gateway</span>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Date</p>
                      <p className="font-medium">Tonight</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Time</p>
                      <p className="font-medium">{selectedTime}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Party</p>
                      <p className="font-medium">{partySize} guests</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Confirmation</p>
                      <p className="font-medium font-mono">{confirmationCode}</p>
                    </div>
                  </div>
                </div>

                {/* Deposit Info */}
                <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-google-blue" />
                    <span className="text-sm text-gray-700">
                      {calculateDeposit(bookingRestaurant?.depositPolicy, partySize) > 0
                        ? 'Deposit charged'
                        : 'Card on hold'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {calculateDeposit(bookingRestaurant?.depositPolicy, partySize) > 0
                        ? `$${calculateDeposit(bookingRestaurant?.depositPolicy, partySize)}.00`
                        : 'No charge'}
                    </span>
                    <p className="text-xs text-gray-500">Google Pay ••••4242</p>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  Confirmation sent to your phone
                </p>

                <div className="flex gap-3">
                  {calendarAdded ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-google-green/10 border border-google-green/20 rounded-xl"
                    >
                      <Check className="w-4 h-4 text-google-green" />
                      <span className="text-sm font-medium text-google-green">Added to Calendar</span>
                    </motion.div>
                  ) : (
                    <button
                      onClick={handleAddToCalendar}
                      className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <CalendarPlus className="w-4 h-4 text-google-blue" />
                      <span className="text-sm font-medium">Add to Calendar</span>
                    </button>
                  )}
                  <button
                    className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">Share</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {step === 'details' && (
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleContinueToPayment}
                disabled={!selectedTime}
                className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Payment
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                Free cancellation up to 24 hours before
              </p>
            </div>
          )}

          {step === 'confirmed' && (
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleDone}
                className="w-full btn-primary py-3 text-base"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ProcessingStep({
  label,
  sublabel,
  status,
  delay,
  icon,
}: {
  label: string;
  sublabel?: string;
  status: 'pending' | 'loading' | 'completed';
  delay: number;
  icon?: React.ReactNode;
}) {
  const [currentStatus, setCurrentStatus] = useState<'pending' | 'loading' | 'completed'>('pending');

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentStatus(status === 'completed' ? 'completed' : 'loading');
    }, delay);

    const completeTimer = setTimeout(() => {
      if (status === 'loading') {
        setCurrentStatus('completed');
      }
    }, delay + 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [delay, status]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 1000 }}
      className="flex items-center gap-3"
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {currentStatus === 'pending' && (
          <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
        )}
        {currentStatus === 'loading' && (
          <Loader2 className="w-5 h-5 text-google-blue animate-spin" />
        )}
        {currentStatus === 'completed' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {icon || <Check className="w-5 h-5 text-google-green" />}
          </motion.div>
        )}
      </div>
      <div className="flex-1">
        <span className={`text-sm ${currentStatus === 'completed' ? 'text-gray-900' : 'text-gray-500'}`}>
          {label}
        </span>
        {sublabel && (
          <span className={`block text-xs ${currentStatus === 'completed' ? 'text-gray-400' : 'text-gray-300'}`}>
            {sublabel}
          </span>
        )}
      </div>
    </motion.div>
  );
}
