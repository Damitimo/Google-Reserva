import { Restaurant } from '@/types';

// Mock restaurants near Los Angeles (for demo purposes)
export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: 'Bestia',
    cuisine: 'Italian',
    priceLevel: 3,
    rating: 4.7,
    reviewCount: 3842,
    address: '2121 E 7th Pl, Los Angeles, CA 90021',
    location: { lat: 34.0339, lng: -118.2321 },
    photos: ['/bestia.jpg'],
    openNow: true,
    phone: '(213) 514-5724',
    website: 'https://bestiala.com',
    highlights: ['Housemade pasta', 'Wood-fired dishes', 'Great wine list', 'Vegetarian options'],
    availableTimes: ['6:00 PM', '6:30 PM', '7:15 PM', '8:30 PM', '9:00 PM'],
  },
  {
    id: '2',
    name: 'Republique',
    cuisine: 'French',
    priceLevel: 3,
    rating: 4.6,
    reviewCount: 2156,
    address: '624 S La Brea Ave, Los Angeles, CA 90036',
    location: { lat: 34.0625, lng: -118.3444 },
    photos: ['/republique.jpg'],
    openNow: true,
    phone: '(310) 362-6115',
    website: 'https://republiquela.com',
    highlights: ['Historic building', 'Excellent brunch', 'Fresh pastries', 'Romantic ambiance'],
    availableTimes: ['5:30 PM', '7:00 PM', '7:45 PM', '9:15 PM'],
  },
  {
    id: '3',
    name: 'Osteria Mozza',
    cuisine: 'Italian',
    priceLevel: 4,
    rating: 4.5,
    reviewCount: 1893,
    address: '6602 Melrose Ave, Los Angeles, CA 90038',
    location: { lat: 34.0836, lng: -118.3367 },
    photos: ['/mozza.jpg'],
    openNow: true,
    phone: '(323) 297-0100',
    website: 'https://osteriamozza.com',
    highlights: ['Celebrity chef', 'Mozzarella bar', 'Award-winning', 'Intimate setting'],
    availableTimes: ['6:15 PM', '7:30 PM', '8:00 PM', '9:30 PM'],
  },
  {
    id: '4',
    name: 'Providence',
    cuisine: 'Seafood',
    priceLevel: 4,
    rating: 4.8,
    reviewCount: 1245,
    address: '5955 Melrose Ave, Los Angeles, CA 90038',
    location: { lat: 34.0833, lng: -118.3246 },
    photos: ['/providence.jpg'],
    openNow: true,
    phone: '(323) 460-4170',
    website: 'https://providencela.com',
    highlights: ['2 Michelin stars', 'Sustainable seafood', 'Tasting menu', 'Exceptional service'],
    availableTimes: ['5:45 PM', '8:15 PM', '9:00 PM'],
  },
  {
    id: '5',
    name: 'Guisados',
    cuisine: 'Mexican',
    priceLevel: 1,
    rating: 4.6,
    reviewCount: 4521,
    address: '2100 E Cesar E Chavez Ave, Los Angeles, CA 90033',
    location: { lat: 34.0482, lng: -118.2104 },
    photos: ['/guisados.jpg'],
    openNow: true,
    phone: '(323) 264-7201',
    website: 'https://guisados.co',
    highlights: ['Authentic braised meats', 'Handmade tortillas', 'Family recipes', 'Casual vibe'],
    availableTimes: ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM'],
  },
  {
    id: '6',
    name: 'n/naka',
    cuisine: 'Japanese',
    priceLevel: 4,
    rating: 4.9,
    reviewCount: 892,
    address: '3455 Overland Ave, Los Angeles, CA 90034',
    location: { lat: 34.0268, lng: -118.4226 },
    photos: ['/nnaka.jpg'],
    openNow: true,
    phone: '(310) 836-6252',
    website: 'https://n-naka.com',
    highlights: ['Modern kaiseki', 'Chef Niki Nakayama', 'Seasonal ingredients', 'Omakase only'],
    availableTimes: ['6:00 PM', '8:30 PM'],
  },
  {
    id: '7',
    name: 'Petit Trois',
    cuisine: 'French',
    priceLevel: 2,
    rating: 4.5,
    reviewCount: 2034,
    address: '718 N Highland Ave, Los Angeles, CA 90038',
    location: { lat: 34.0844, lng: -118.3384 },
    photos: ['/petittrois.jpg'],
    openNow: true,
    phone: '(323) 468-8916',
    website: 'https://petittrois.com',
    highlights: ['Classic French', 'Famous omelette', 'No reservations', 'Cozy counter seating'],
    availableTimes: ['Walk-in only'],
  },
  {
    id: '8',
    name: 'Majordomo',
    cuisine: 'Asian Fusion',
    priceLevel: 3,
    rating: 4.4,
    reviewCount: 2876,
    address: '1725 Naud St, Los Angeles, CA 90012',
    location: { lat: 34.0634, lng: -118.2298 },
    photos: ['/majordomo.jpg'],
    openNow: true,
    phone: '(323) 545-4880',
    website: 'https://majordomo.la',
    highlights: ['David Chang', 'Whole plate short rib', 'Industrial chic', 'Creative cocktails'],
    availableTimes: ['5:30 PM', '6:00 PM', '7:30 PM', '8:00 PM', '9:15 PM'],
  },
  // More Italian restaurants
  {
    id: '9',
    name: 'Rossoblu',
    cuisine: 'Italian',
    priceLevel: 3,
    rating: 4.6,
    reviewCount: 1534,
    address: '1124 San Julian St, Los Angeles, CA 90015',
    location: { lat: 34.0378, lng: -118.2567 },
    photos: ['/rossoblu.jpg'],
    openNow: true,
    phone: '(213) 749-1099',
    website: 'https://rossoblula.com',
    highlights: ['Bologna-inspired', 'Handmade pasta', 'Industrial space', 'Great cocktails'],
    availableTimes: ['5:30 PM', '6:00 PM', '7:00 PM', '7:30 PM', '8:30 PM'],
  },
  {
    id: '10',
    name: 'Pecorino',
    cuisine: 'Italian',
    priceLevel: 2,
    rating: 4.4,
    reviewCount: 892,
    address: '3001 S Figueroa St, Los Angeles, CA 90007',
    location: { lat: 34.0198, lng: -118.2790 },
    photos: ['/pecorino.jpg'],
    openNow: true,
    phone: '(213) 741-0020',
    website: 'https://pecorinola.com',
    highlights: ['Near USC', 'Roman cuisine', 'Cacio e pepe', 'Casual dining'],
    availableTimes: ['5:00 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM'],
  },
  {
    id: '11',
    name: 'The Manufactory',
    cuisine: 'Italian',
    priceLevel: 2,
    rating: 4.3,
    reviewCount: 1245,
    address: '757 S Alameda St, Los Angeles, CA 90021',
    location: { lat: 34.0357, lng: -118.2378 },
    photos: ['/manufactory.jpg'],
    openNow: true,
    phone: '(213) 537-0535',
    website: 'https://themanufactory.com',
    highlights: ['All-day café', 'Artisan bread', 'Italian market', 'Fresh pasta'],
    availableTimes: ['5:00 PM', '5:30 PM', '6:00 PM', '7:00 PM', '8:00 PM'],
  },
  {
    id: '12',
    name: 'Angelini Osteria',
    cuisine: 'Italian',
    priceLevel: 3,
    rating: 4.5,
    reviewCount: 1678,
    address: '7313 Beverly Blvd, Los Angeles, CA 90036',
    location: { lat: 34.0766, lng: -118.3516 },
    photos: ['/angelini.jpg'],
    openNow: true,
    phone: '(323) 297-0070',
    website: 'https://angeliniosteria.com',
    highlights: ['LA classic', 'Lasagna verde', 'Cozy atmosphere', 'Excellent wine'],
    availableTimes: ['6:00 PM', '7:00 PM', '7:30 PM', '8:30 PM', '9:00 PM'],
  },
  {
    id: '13',
    name: "Felix",
    cuisine: 'Italian',
    priceLevel: 3,
    rating: 4.4,
    reviewCount: 2134,
    address: '1023 Abbot Kinney Blvd, Venice, CA 90291',
    location: { lat: 33.9917, lng: -118.4682 },
    photos: ['/felix.jpg'],
    openNow: true,
    phone: '(424) 387-8622',
    website: 'https://felixla.com',
    highlights: ['Venice hotspot', 'Wood-fired pizza', 'Evan Funke', 'Handmade pasta'],
    availableTimes: ['5:30 PM', '6:00 PM', '7:15 PM', '8:00 PM', '9:30 PM'],
  },
  // More cuisines near USC
  {
    id: '14',
    name: 'Chichen Itza',
    cuisine: 'Mexican',
    priceLevel: 2,
    rating: 4.7,
    reviewCount: 3421,
    address: '3655 S Grand Ave, Los Angeles, CA 90007',
    location: { lat: 34.0165, lng: -118.2782 },
    photos: ['/chichenitza.jpg'],
    openNow: true,
    phone: '(213) 741-1075',
    website: 'https://chichenitzarestaurant.com',
    highlights: ['Yucatan cuisine', 'Near USC', 'Cochinita pibil', 'Family owned'],
    availableTimes: ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM'],
  },
  {
    id: '15',
    name: 'Bacaro LA',
    cuisine: 'Italian',
    priceLevel: 2,
    rating: 4.3,
    reviewCount: 567,
    address: '2308 S Union Ave, Los Angeles, CA 90007',
    location: { lat: 34.0248, lng: -118.2796 },
    photos: ['/bacaro.jpg'],
    openNow: true,
    phone: '(213) 748-7520',
    website: 'https://bacarola.com',
    highlights: ['USC area', 'Venetian tapas', 'Wine bar', 'Intimate space'],
    availableTimes: ['5:00 PM', '6:00 PM', '6:30 PM', '7:00 PM', '8:00 PM', '8:30 PM'],
  },
  {
    id: '16',
    name: 'Pizzeria Mozza',
    cuisine: 'Italian',
    priceLevel: 2,
    rating: 4.4,
    reviewCount: 2567,
    address: '641 N Highland Ave, Los Angeles, CA 90036',
    location: { lat: 34.0841, lng: -118.3384 },
    photos: ['/pizzeriamozza.jpg'],
    openNow: true,
    phone: '(323) 297-0101',
    website: 'https://pizzeriamozza.com',
    highlights: ['Nancy Silverton', 'Wood-fired pizza', 'Burrata', 'Casual sister restaurant'],
    availableTimes: ['5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '9:00 PM'],
  },
  {
    id: '17',
    name: "Chi Spacca",
    cuisine: 'Italian',
    priceLevel: 4,
    rating: 4.6,
    reviewCount: 876,
    address: '6610 Melrose Ave, Los Angeles, CA 90038',
    location: { lat: 34.0836, lng: -118.3361 },
    photos: ['/chispacca.jpg'],
    openNow: true,
    phone: '(323) 297-1133',
    website: 'https://chispacca.com',
    highlights: ['Butcher shop style', 'Bistecca fiorentina', 'Meat focused', 'Nancy Silverton'],
    availableTimes: ['6:00 PM', '7:30 PM', '8:00 PM', '9:00 PM'],
  },
  {
    id: '18',
    name: 'Cosa Buona',
    cuisine: 'Italian',
    priceLevel: 2,
    rating: 4.5,
    reviewCount: 1123,
    address: '2100 Sunset Blvd, Los Angeles, CA 90026',
    location: { lat: 34.0775, lng: -118.2666 },
    photos: ['/cosabuona.jpg'],
    openNow: true,
    phone: '(213) 908-5211',
    website: 'https://cosabuonala.com',
    highlights: ['Echo Park', 'Red sauce joint', 'NY style pizza', 'Family friendly'],
    availableTimes: ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '8:00 PM'],
  },
];

export const LANDMARK_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  'ace hotel': { lat: 34.0440, lng: -118.2558, name: 'Ace Hotel Downtown LA' },
  'hollywood': { lat: 34.0928, lng: -118.3287, name: 'Hollywood' },
  'santa monica': { lat: 34.0195, lng: -118.4912, name: 'Santa Monica' },
  'dtla': { lat: 34.0407, lng: -118.2468, name: 'Downtown Los Angeles' },
  'downtown': { lat: 34.0407, lng: -118.2468, name: 'Downtown Los Angeles' },
  'beverly hills': { lat: 34.0736, lng: -118.4004, name: 'Beverly Hills' },
  'koreatown': { lat: 34.0577, lng: -118.3009, name: 'Koreatown' },
  'silverlake': { lat: 34.0869, lng: -118.2702, name: 'Silver Lake' },
  'silver lake': { lat: 34.0869, lng: -118.2702, name: 'Silver Lake' },
  'venice': { lat: 33.9850, lng: -118.4695, name: 'Venice Beach' },
  'culver city': { lat: 34.0211, lng: -118.3965, name: 'Culver City' },
  'pasadena': { lat: 34.1478, lng: -118.1445, name: 'Pasadena' },
  'usc': { lat: 34.0224, lng: -118.2851, name: 'USC' },
  'university of southern california': { lat: 34.0224, lng: -118.2851, name: 'USC' },
  'ucla': { lat: 34.0689, lng: -118.4452, name: 'UCLA' },
  'lax': { lat: 33.9425, lng: -118.4081, name: 'LAX Airport' },
  'staples center': { lat: 34.0430, lng: -118.2673, name: 'Crypto.com Arena' },
  'crypto arena': { lat: 34.0430, lng: -118.2673, name: 'Crypto.com Arena' },
  'little tokyo': { lat: 34.0503, lng: -118.2397, name: 'Little Tokyo' },
  'arts district': { lat: 34.0404, lng: -118.2317, name: 'Arts District' },
  'echo park': { lat: 34.0781, lng: -118.2606, name: 'Echo Park' },
  'los feliz': { lat: 34.1064, lng: -118.2884, name: 'Los Feliz' },
  'west hollywood': { lat: 34.0900, lng: -118.3617, name: 'West Hollywood' },
  'weho': { lat: 34.0900, lng: -118.3617, name: 'West Hollywood' },
};

export function findLandmark(query: string): { lat: number; lng: number; name: string } | null {
  const normalized = query.toLowerCase();
  for (const [key, value] of Object.entries(LANDMARK_LOCATIONS)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  return null;
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function filterRestaurants(
  restaurants: Restaurant[],
  filters: {
    cuisine?: string;
    priceLevel?: number[];
    maxDistance?: number;
    referencePoint?: { lat: number; lng: number };
    minRating?: number;
  }
): Restaurant[] {
  return restaurants.filter((r) => {
    if (filters.cuisine && !r.cuisine.toLowerCase().includes(filters.cuisine.toLowerCase())) {
      return false;
    }
    if (filters.priceLevel && !filters.priceLevel.includes(r.priceLevel)) {
      return false;
    }
    if (filters.minRating && r.rating < filters.minRating) {
      return false;
    }
    if (filters.maxDistance && filters.referencePoint) {
      const distance = calculateDistance(
        filters.referencePoint.lat,
        filters.referencePoint.lng,
        r.location.lat,
        r.location.lng
      );
      if (distance > filters.maxDistance) {
        return false;
      }
    }
    return true;
  }).map((r) => {
    if (filters.referencePoint) {
      const distance = calculateDistance(
        filters.referencePoint.lat,
        filters.referencePoint.lng,
        r.location.lat,
        r.location.lng
      );
      // Approximate walking time: 80m per minute
      return { ...r, walkingTime: Math.round(distance / 80) };
    }
    return r;
  });
}
