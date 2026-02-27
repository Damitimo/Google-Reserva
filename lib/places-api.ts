import { Restaurant, Review, DepositPolicy } from '@/types';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

interface PlaceResult {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  currentOpeningHours?: {
    openNow: boolean;
  };
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
  }>;
  types?: string[];
  primaryType?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  reviews?: Array<{
    name: string;
    relativePublishTimeDescription: string;
    rating: number;
    text: {
      text: string;
      languageCode: string;
    };
    authorAttribution: {
      displayName: string;
      uri: string;
      photoUri: string;
    };
  }>;
}

// Map Google place types to cuisine categories
function extractCuisine(types: string[] | undefined, primaryType: string | undefined, name: string): string {
  const cuisineMap: Record<string, string> = {
    'italian_restaurant': 'Italian',
    'mexican_restaurant': 'Mexican',
    'japanese_restaurant': 'Japanese',
    'chinese_restaurant': 'Chinese',
    'thai_restaurant': 'Thai',
    'indian_restaurant': 'Indian',
    'french_restaurant': 'French',
    'korean_restaurant': 'Korean',
    'vietnamese_restaurant': 'Vietnamese',
    'american_restaurant': 'American',
    'seafood_restaurant': 'Seafood',
    'steak_house': 'Steakhouse',
    'pizza_restaurant': 'Pizza',
    'sushi_restaurant': 'Japanese',
    'mediterranean_restaurant': 'Mediterranean',
    'greek_restaurant': 'Greek',
    'spanish_restaurant': 'Spanish',
    'cafe': 'Café',
    'bakery': 'Bakery',
    'bar': 'Bar & Grill',
    'ramen_restaurant': 'Japanese',
    'barbecue_restaurant': 'BBQ',
    'hamburger_restaurant': 'American',
    'brunch_restaurant': 'Brunch',
  };

  // Check primary type first
  if (primaryType && cuisineMap[primaryType]) {
    return cuisineMap[primaryType];
  }

  // Check all types
  if (types) {
    for (const type of types) {
      if (cuisineMap[type]) {
        return cuisineMap[type];
      }
    }
  }

  // Fallback: check restaurant name for cuisine hints
  const nameLower = name.toLowerCase();
  if (nameLower.includes('italian') || nameLower.includes('pizz') || nameLower.includes('pasta') || nameLower.includes('trattoria')) return 'Italian';
  if (nameLower.includes('mexican') || nameLower.includes('taco') || nameLower.includes('burrito') || nameLower.includes('cantina')) return 'Mexican';
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('ramen') || nameLower.includes('izakaya')) return 'Japanese';
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('szechuan')) return 'Chinese';
  if (nameLower.includes('thai')) return 'Thai';
  if (nameLower.includes('indian') || nameLower.includes('curry') || nameLower.includes('tandoori')) return 'Indian';
  if (nameLower.includes('french') || nameLower.includes('bistro') || nameLower.includes('brasserie')) return 'French';
  if (nameLower.includes('korean') || nameLower.includes('bbq') || nameLower.includes('bulgogi')) return 'Korean';

  return 'Restaurant';
}

// Convert new API price level to number
function convertPriceLevel(priceLevel: string | undefined): 1 | 2 | 3 | 4 {
  const map: Record<string, 1 | 2 | 3 | 4> = {
    'PRICE_LEVEL_FREE': 1,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  };
  return map[priceLevel || ''] || 2;
}

// Generate deposit policy based on restaurant characteristics
function generateDepositPolicy(place: PlaceResult): DepositPolicy | undefined {
  const priceLevel = convertPriceLevel(place.priceLevel);
  const rating = place.rating || 4.0;

  // Higher-end restaurants more likely to require deposits
  const depositChance = priceLevel >= 3 ? 0.9 : priceLevel === 2 ? 0.5 : 0.2;

  if (Math.random() > depositChance) {
    return undefined; // No deposit required
  }

  // Fine dining ($$$$) - per person deposits
  if (priceLevel === 4) {
    return {
      type: 'per_person',
      amount: rating >= 4.5 ? 75 : 50,
    };
  }

  // Upscale ($$$) - mix of per-person and flat
  if (priceLevel === 3) {
    if (Math.random() > 0.5) {
      return {
        type: 'per_person',
        amount: rating >= 4.5 ? 35 : 25,
      };
    }
    return {
      type: 'flat',
      amount: 50,
      minPartySize: 4,
    };
  }

  // Moderate ($$) - flat deposits for larger parties
  if (priceLevel === 2) {
    if (Math.random() > 0.7) {
      return {
        type: 'hold_only',
        amount: 0,
      };
    }
    return {
      type: 'flat',
      amount: 25,
      minPartySize: 6,
    };
  }

  // Budget ($) - usually just card hold
  return {
    type: 'hold_only',
    amount: 0,
  };
}

// Generate mock available times (since real-time availability requires reservation API integration)
function generateAvailableTimes(): string[] {
  const times = ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'];
  // Return a random subset of times
  const shuffled = times.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * 4) + 3).sort();
}

// Generate highlights based on rating, price level, and types
function generateHighlights(place: PlaceResult): string[] {
  const highlights: string[] = [];

  if (place.rating && place.rating >= 4.5) {
    highlights.push('Highly rated');
  }
  if (place.userRatingCount && place.userRatingCount > 1000) {
    highlights.push('Popular spot');
  }
  if (place.priceLevel === 'PRICE_LEVEL_INEXPENSIVE') {
    highlights.push('Budget friendly');
  } else if (place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE') {
    highlights.push('Fine dining');
  }
  if (place.currentOpeningHours?.openNow) {
    highlights.push('Open now');
  }

  // Add generic highlights to fill
  const genericHighlights = [
    'Great atmosphere',
    'Excellent service',
    'Fresh ingredients',
    'Cozy ambiance',
    'Good for groups',
    'Romantic setting',
  ];

  while (highlights.length < 4) {
    const random = genericHighlights[Math.floor(Math.random() * genericHighlights.length)];
    if (!highlights.includes(random)) {
      highlights.push(random);
    }
  }

  return highlights.slice(0, 4);
}

// Get photo URL - use Unsplash food images for reliable demo
function getPhotoUrl(photoName: string, maxWidth: number = 400): string {
  // Use Unsplash food images for reliable display in demo
  // Generate consistent image based on photo name hash
  const hash = photoName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const foodKeywords = ['restaurant', 'food', 'dining', 'cuisine', 'dish', 'meal'];
  const keyword = foodKeywords[hash % foodKeywords.length];
  return `https://source.unsplash.com/${maxWidth}x${Math.round(maxWidth * 0.75)}/?${keyword},${hash % 100}`;
}

// Convert Places API reviews to our Review type
function convertReviews(placeReviews: PlaceResult['reviews']): Review[] {
  if (!placeReviews) return [];
  return placeReviews.map(review => ({
    authorName: review.authorAttribution.displayName,
    authorPhoto: review.authorAttribution.photoUri,
    rating: review.rating,
    text: review.text.text,
    relativeTime: review.relativePublishTimeDescription,
  }));
}

// Convert Places API result to our Restaurant type
function placeToRestaurant(place: PlaceResult): Restaurant {
  return {
    id: place.id,
    name: place.displayName.text,
    cuisine: extractCuisine(place.types, place.primaryType, place.displayName.text),
    priceLevel: convertPriceLevel(place.priceLevel),
    rating: place.rating || 4.0,
    reviewCount: place.userRatingCount || 0,
    address: place.formattedAddress,
    location: {
      lat: place.location.latitude,
      lng: place.location.longitude,
    },
    photos: place.photos?.length
      ? place.photos.slice(0, 5).map(photo => getPhotoUrl(photo.name))
      : ['/default-restaurant.jpg'],
    openNow: place.currentOpeningHours?.openNow ?? true,
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    highlights: generateHighlights(place),
    availableTimes: generateAvailableTimes(),
    reviews: convertReviews(place.reviews),
    depositPolicy: generateDepositPolicy(place),
  };
}

// Search for restaurants using Places API (New) Text Search
export async function searchRestaurants(params: {
  query?: string;
  location?: { lat: number; lng: number };
  radius?: number; // in meters
  cuisine?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<Restaurant[]> {
  if (!GOOGLE_API_KEY) {
    console.error('Google API key not configured');
    return [];
  }

  try {
    // Build the search query
    let textQuery = params.cuisine ? `${params.cuisine} restaurant` : 'restaurant';
    if (params.query) {
      textQuery = params.query;
    }

    const requestBody: Record<string, unknown> = {
      textQuery,
      languageCode: 'en',
      maxResultCount: 10,
    };

    // Add location bias if provided
    if (params.location) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: params.location.lat,
            longitude: params.location.lng,
          },
          radius: params.radius || 3000,
        },
      };
    }

    // Add price level filter if provided
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      const priceLevels = [];
      const levelMap = ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'];
      const min = params.minPrice || 0;
      const max = params.maxPrice || 4;
      for (let i = min; i <= max; i++) {
        priceLevels.push(levelMap[i]);
      }
      requestBody.priceLevels = priceLevels;
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.photos,places.types,places.primaryType,places.nationalPhoneNumber,places.websiteUri,places.reviews',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Places API error:', response.status, errorText);
      return [];
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      console.log('No places found for query:', textQuery);
      return [];
    }

    const places: PlaceResult[] = data.places;
    return places.map(placeToRestaurant);
  } catch (error) {
    console.error('Error searching restaurants:', error);
    return [];
  }
}

// Search for restaurants using Nearby Search (new API)
export async function searchNearbyRestaurants(params: {
  location: { lat: number; lng: number };
  radius?: number; // in meters
  includedTypes?: string[];
}): Promise<Restaurant[]> {
  if (!GOOGLE_API_KEY) {
    console.error('Google API key not configured');
    return [];
  }

  try {
    const requestBody: Record<string, unknown> = {
      includedTypes: params.includedTypes || ['restaurant'],
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: {
            latitude: params.location.lat,
            longitude: params.location.lng,
          },
          radius: params.radius || 3000,
        },
      },
    };

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.photos,places.types,places.primaryType',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Places API error:', response.status, errorText);
      return [];
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      return [];
    }

    const places: PlaceResult[] = data.places;
    return places.map(placeToRestaurant);
  } catch (error) {
    console.error('Error searching nearby restaurants:', error);
    return [];
  }
}

// Get detailed information about a specific place
export async function getPlaceDetails(placeId: string): Promise<Restaurant | null> {
  if (!GOOGLE_API_KEY) {
    console.error('Google API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,currentOpeningHours,photos,types,primaryType,nationalPhoneNumber,websiteUri',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Places API error:', response.status, errorText);
      return null;
    }

    const place: PlaceResult = await response.json();
    return placeToRestaurant(place);
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}
