import { create } from 'zustand';
import { Message, Restaurant, Reservation, MapState } from '@/types';

interface AppStore {
  // Messages
  messages: Message[];
  addMessage: (message: Message) => void;
  updateLastMessage: (updates: Partial<Message>) => void;

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
