export interface Review {
  authorName: string;
  authorPhoto?: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface DepositPolicy {
  type: 'flat' | 'per_person' | 'hold_only';
  amount: number; // dollar amount
  minPartySize?: number; // only require deposit for parties >= this size
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  priceLevel: 1 | 2 | 3 | 4;
  rating: number;
  reviewCount: number;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  photos: string[];
  openNow: boolean;
  phone?: string;
  website?: string;
  walkingTime?: number; // minutes from reference point
  highlights: string[];
  availableTimes?: string[];
  reviews?: Review[];
  depositPolicy?: DepositPolicy;
}

export interface SearchFilters {
  location?: string;
  cuisine?: string;
  priceLevel?: number[];
  radius?: number; // meters
  mood?: string;
  partySize?: number;
  date?: string;
  time?: string;
}

export interface Reservation {
  id: string;
  restaurant: Restaurant;
  date: string;
  time: string;
  partySize: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmationCode?: string;
  specialRequests?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  restaurants?: Restaurant[];
  reservation?: Reservation;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface MapState {
  center: { lat: number; lng: number };
  zoom: number;
  markers: Restaurant[];
  selectedRestaurant: Restaurant | null;
  searchRadius?: number;
  radiusCenter?: { lat: number; lng: number };
}

export interface AppState {
  messages: Message[];
  mapState: MapState;
  isLoading: boolean;
  currentReservation: Reservation | null;
  userPreferences: {
    dietaryRestrictions: string[];
    favoriteCuisines: string[];
    pricePreference: number[];
  };
}
