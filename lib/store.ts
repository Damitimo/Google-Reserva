import { create } from 'zustand';
import { Message, Restaurant, Reservation, MapState } from '@/types';

// Booking context for conversational flow
export interface BookingContext {
  restaurant: Restaurant | null;
  partySize: number | null;
  date: string | null; // "tonight", "tomorrow", "2024-03-15"
  time: string | null; // "7:30 PM"
  specialRequests: string | null;
  step: 'idle' | 'collecting' | 'confirming' | 'processing' | 'confirmed';
}

// Notification for merchant agent messages (unhappy flow)
export interface MerchantNotification {
  id: string;
  type: 'cancellation' | 'modification' | 'alert';
  title: string;
  message: string;
  restaurantName: string;
  timestamp: Date;
  reservation?: Reservation;
}

interface AppStore {
  // Messages
  messages: Message[];
  addMessage: (message: Message) => void;
  updateLastMessage: (updates: Partial<Message>) => void;

  // Merchant notifications (unhappy flow)
  merchantNotification: MerchantNotification | null;
  showMerchantNotification: (notification: MerchantNotification) => void;
  dismissMerchantNotification: () => void;
  handleNotificationClick: () => void;

  // Booking flow lock - prevents restaurant cards from showing during booking
  isInBookingFlow: boolean;
  setIsInBookingFlow: (inFlow: boolean) => void;

  // Pending booking chat (triggered from restaurant card)
  pendingBookingMessage: string | null;
  triggerBookingChat: (restaurantName: string, time?: string) => void;
  clearPendingBookingMessage: () => void;

  // Map state
  mapState: MapState;
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapZoom: (zoom: number) => void;
  setMarkers: (markers: Restaurant[]) => void;
  addMarkerWithDelay: (marker: Restaurant, delay: number) => void;
  selectRestaurant: (restaurant: Restaurant | null) => void;
  setSearchRadius: (center: { lat: number; lng: number }, radius: number) => void;
  clearSearchRadius: () => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Reservation
  currentReservation: Reservation | null;
  setCurrentReservation: (reservation: Reservation | null) => void;

  // Booking context (conversational flow)
  bookingContext: BookingContext;
  updateBookingContext: (updates: Partial<BookingContext>) => void;
  resetBookingContext: () => void;
  startBooking: (restaurant: Restaurant, context?: Partial<BookingContext>) => void;

  // Booking modal
  showBookingModal: boolean;
  bookingRestaurant: Restaurant | null;
  openBookingModal: (restaurant: Restaurant) => void;
  closeBookingModal: () => void;

  // Reviews modal
  showReviewsModal: boolean;
  reviewsRestaurant: Restaurant | null;
  reviewsSummary: string | null;
  openReviewsModal: (restaurant: Restaurant) => void;
  closeReviewsModal: () => void;
  setReviewsSummary: (summary: string) => void;

  // Map modal (for mobile)
  showMapModal: boolean;
  mapModalRestaurant: Restaurant | null;
  openMapModal: (restaurant: Restaurant) => void;
  closeMapModal: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Messages
  messages: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (updates) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = { ...messages[messages.length - 1], ...updates };
      }
      return { messages };
    }),

  // Merchant notifications (unhappy flow)
  merchantNotification: null,
  showMerchantNotification: (notification) => set({ merchantNotification: notification }),
  dismissMerchantNotification: () => set({ merchantNotification: null }),
  handleNotificationClick: () => {
    const { merchantNotification, addMessage, dismissMerchantNotification, setIsInBookingFlow, resetBookingContext, setCurrentReservation } = get();
    if (!merchantNotification) return;

    // Reset booking flow state since the reservation was cancelled
    setIsInBookingFlow(false);
    resetBookingContext();
    setCurrentReservation(null);

    // Add merchant agent message to chat
    const merchantMessage: Message = {
      id: `merchant-${Date.now()}`,
      role: 'assistant',
      content: '',
      merchantAgent: {
        name: merchantNotification.restaurantName,
        message: merchantNotification.type === 'cancellation'
          ? `We're very sorry, but we need to cancel your reservation for ${merchantNotification.reservation?.partySize || 4} guests on ${merchantNotification.reservation?.date || 'the requested date'}. We had an unexpected private event booking that conflicts with your time slot. We sincerely apologize for the inconvenience.`
          : merchantNotification.message,
        type: merchantNotification.type,
      },
    };
    addMessage(merchantMessage);

    // Add Donna's response with rebooking options
    setTimeout(() => {
      const restaurant = merchantNotification.reservation?.restaurant;
      const cuisine = restaurant?.cuisine || 'similar';
      const location = restaurant?.address?.split(',')[1]?.trim() || 'nearby';

      const donnaResponse: Message = {
        id: `donna-rebook-${Date.now()}`,
        role: 'assistant',
        content: `I just received word from ${merchantNotification.restaurantName} that they unfortunately need to cancel your reservation. I'm so sorry about this!\n\nDon't worry though - I can help you find an alternative. Would you like me to:\n\n• **Rebook at ${merchantNotification.restaurantName}** for a different time\n• **Find similar restaurants** nearby that have availability\n• **Check your other saved options** from earlier`,
        quickReplies: [
          { label: `Rebook at ${merchantNotification.restaurantName}`, value: `I'd like to rebook at ${merchantNotification.restaurantName} for a different time` },
          { label: 'Find similar restaurants', value: `Find me ${cuisine} restaurants ${location} with availability for ${merchantNotification.reservation?.partySize || 4} people ${merchantNotification.reservation?.date || 'tonight'}` },
          { label: 'Show other options', value: 'Show me other restaurant options from my earlier search' },
        ],
      };
      addMessage(donnaResponse);
    }, 1500);

    dismissMerchantNotification();
  },

  // Booking flow lock - prevents restaurant cards from showing during booking
  isInBookingFlow: false,
  setIsInBookingFlow: (inFlow) => set({ isInBookingFlow: inFlow }),

  // Pending booking chat (triggered from restaurant card)
  pendingBookingMessage: null,
  triggerBookingChat: (() => {
    let lastTrigger = 0;
    return (restaurantName: string, time?: string) => {
      const now = Date.now();
      if (now - lastTrigger < 1000) return;
      lastTrigger = now;

      const message = time
        ? `Book ${restaurantName} for ${time}`
        : `I'd like to book ${restaurantName}`;
      set({ pendingBookingMessage: message });
    };
  })(),
  clearPendingBookingMessage: () => set({ pendingBookingMessage: null }),

  // Map state - default to Los Angeles
  mapState: {
    center: { lat: 34.0522, lng: -118.2437 },
    zoom: 12,
    markers: [],
    selectedRestaurant: null,
  },
  setMapCenter: (center) =>
    set((state) => ({ mapState: { ...state.mapState, center } })),
  setMapZoom: (zoom) =>
    set((state) => ({ mapState: { ...state.mapState, zoom } })),
  setMarkers: (markers) =>
    set((state) => ({ mapState: { ...state.mapState, markers } })),
  addMarkerWithDelay: (marker, delay) => {
    setTimeout(() => {
      set((state) => ({
        mapState: {
          ...state.mapState,
          markers: [...state.mapState.markers, marker],
        },
      }));
    }, delay);
  },
  selectRestaurant: (restaurant) =>
    set((state) => ({
      mapState: {
        ...state.mapState,
        selectedRestaurant: restaurant,
        // Pan to restaurant location when selected
        center: restaurant ? restaurant.location : state.mapState.center,
      },
    })),
  setSearchRadius: (center, radius) =>
    set((state) => ({
      mapState: { ...state.mapState, radiusCenter: center, searchRadius: radius },
    })),
  clearSearchRadius: () =>
    set((state) => ({
      mapState: { ...state.mapState, radiusCenter: undefined, searchRadius: undefined },
    })),

  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Reservation
  currentReservation: null,
  setCurrentReservation: (reservation) => set({ currentReservation: reservation }),

  // Booking context (conversational flow)
  bookingContext: {
    restaurant: null,
    partySize: null,
    date: null,
    time: null,
    specialRequests: null,
    step: 'idle',
  },
  updateBookingContext: (updates) =>
    set((state) => ({
      bookingContext: { ...state.bookingContext, ...updates },
    })),
  resetBookingContext: () =>
    set({
      bookingContext: {
        restaurant: null,
        partySize: null,
        date: null,
        time: null,
        specialRequests: null,
        step: 'idle',
      },
    }),
  startBooking: (restaurant, context = {}) =>
    set({
      bookingContext: {
        restaurant,
        partySize: context.partySize || null,
        date: context.date || null,
        time: context.time || null,
        specialRequests: context.specialRequests || null,
        step: 'collecting',
      },
    }),

  // Booking modal
  showBookingModal: false,
  bookingRestaurant: null,
  openBookingModal: (restaurant) =>
    set({ showBookingModal: true, bookingRestaurant: restaurant }),
  closeBookingModal: () =>
    set({ showBookingModal: false, bookingRestaurant: null }),

  // Reviews modal
  showReviewsModal: false,
  reviewsRestaurant: null,
  reviewsSummary: null,
  openReviewsModal: (restaurant) =>
    set({ showReviewsModal: true, reviewsRestaurant: restaurant, reviewsSummary: null }),
  closeReviewsModal: () =>
    set({ showReviewsModal: false, reviewsRestaurant: null, reviewsSummary: null }),
  setReviewsSummary: (summary) =>
    set({ reviewsSummary: summary }),

  // Map modal (for mobile)
  showMapModal: false,
  mapModalRestaurant: null,
  openMapModal: (restaurant) =>
    set({ showMapModal: true, mapModalRestaurant: restaurant }),
  closeMapModal: () =>
    set({ showMapModal: false, mapModalRestaurant: null }),
}));
