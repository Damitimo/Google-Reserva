import { GoogleGenerativeAI, SchemaType, Tool, FunctionResponsePart, Part } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { MOCK_RESTAURANTS, findLandmark, filterRestaurants } from '@/lib/mock-data';
import { searchRestaurants as searchPlacesAPI, getPlaceDetails } from '@/lib/places-api';
import { Restaurant } from '@/types';

// Toggle this to use real Places API or mock data
const USE_PLACES_API = process.env.USE_PLACES_API === 'true';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_restaurants',
        description: 'Search for restaurants based on location, cuisine, price, and other preferences. Use this when the user wants to find places to eat.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            location: {
              type: SchemaType.STRING,
              description: 'Location or landmark to search near (e.g., "Ace Hotel", "Downtown LA", "Hollywood")',
            },
            cuisine: {
              type: SchemaType.STRING,
              description: 'Type of cuisine (e.g., "Italian", "Japanese", "Mexican")',
            },
            price_level: {
              type: SchemaType.STRING,
              description: 'Price level: "budget" ($), "moderate" ($$), "upscale" ($$$), or "fine dining" ($$$$)',
            },
            mood: {
              type: SchemaType.STRING,
              description: 'The vibe or occasion (e.g., "romantic", "casual", "business dinner", "celebration")',
            },
            party_size: {
              type: SchemaType.NUMBER,
              description: 'Number of people in the party',
            },
            walking_distance: {
              type: SchemaType.BOOLEAN,
              description: 'If true, only show restaurants within walking distance (about 15 min walk)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_restaurant_details',
        description: 'Get detailed information about a specific restaurant including reviews, photos, and current availability.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            restaurant_id: {
              type: SchemaType.STRING,
              description: 'The ID of the restaurant to get details for',
            },
            restaurant_name: {
              type: SchemaType.STRING,
              description: 'The name of the restaurant (if ID is not known)',
            },
          },
          required: [],
        },
      },
      {
        name: 'check_availability',
        description: 'Check table availability at a restaurant for a specific date, time, and party size.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            restaurant_id: {
              type: SchemaType.STRING,
              description: 'The ID of the restaurant',
            },
            restaurant_name: {
              type: SchemaType.STRING,
              description: 'The name of the restaurant (use if ID is not available)',
            },
            date: {
              type: SchemaType.STRING,
              description: 'The date for the reservation (e.g., "Saturday", "tomorrow", "2024-02-15")',
            },
            time: {
              type: SchemaType.STRING,
              description: 'Preferred time (e.g., "7pm", "19:00", "around 8")',
            },
            party_size: {
              type: SchemaType.NUMBER,
              description: 'Number of guests',
            },
          },
          required: ['party_size'],
        },
      },
      {
        name: 'make_reservation',
        description: 'Book a table at a restaurant. Only call this when the user has confirmed they want to book.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            restaurant_id: {
              type: SchemaType.STRING,
              description: 'The ID of the restaurant',
            },
            restaurant_name: {
              type: SchemaType.STRING,
              description: 'The name of the restaurant (use if ID is not available)',
            },
            date: {
              type: SchemaType.STRING,
              description: 'The date for the reservation',
            },
            time: {
              type: SchemaType.STRING,
              description: 'The time slot to book',
            },
            party_size: {
              type: SchemaType.NUMBER,
              description: 'Number of guests',
            },
            special_requests: {
              type: SchemaType.STRING,
              description: 'Any special requests (dietary, seating preferences, occasion)',
            },
          },
          required: ['date', 'time', 'party_size'],
        },
      },
      {
        name: 'update_map',
        description: 'Update the map view to focus on a location or show search results. Use this to help the user visualize options.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            center_location: {
              type: SchemaType.STRING,
              description: 'Location to center the map on',
            },
            show_radius: {
              type: SchemaType.BOOLEAN,
              description: 'Whether to show a search radius circle',
            },
            radius_meters: {
              type: SchemaType.NUMBER,
              description: 'Radius in meters for the search area',
            },
          },
          required: [],
        },
      },
      {
        name: 'modify_reservation',
        description: 'Modify an existing reservation. Use this when the user wants to change the time, date, or party size of a confirmed reservation.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            confirmation_code: {
              type: SchemaType.STRING,
              description: 'The confirmation code of the reservation to modify',
            },
            restaurant_name: {
              type: SchemaType.STRING,
              description: 'The name of the restaurant',
            },
            new_date: {
              type: SchemaType.STRING,
              description: 'The new date for the reservation (if changing)',
            },
            new_time: {
              type: SchemaType.STRING,
              description: 'The new time for the reservation (if changing)',
            },
            new_party_size: {
              type: SchemaType.NUMBER,
              description: 'The new party size (if changing)',
            },
          },
          required: ['confirmation_code', 'restaurant_name'],
        },
      },
      {
        name: 'collect_booking_info',
        description: 'Use this when the user wants to book a restaurant. This starts a conversational flow to collect party size, date, and time. Call this to track what info we have and what we still need.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            restaurant_id: {
              type: SchemaType.STRING,
              description: 'The ID of the restaurant to book',
            },
            restaurant_name: {
              type: SchemaType.STRING,
              description: 'The name of the restaurant',
            },
            party_size: {
              type: SchemaType.NUMBER,
              description: 'Number of people (if already mentioned by user)',
            },
            dietary_restrictions: {
              type: SchemaType.STRING,
              description: 'Any dietary restrictions mentioned (e.g., "vegetarian", "gluten-free", "nut allergy", "none")',
            },
            date: {
              type: SchemaType.STRING,
              description: 'The date (if already mentioned, e.g., "tonight", "tomorrow", "Saturday")',
            },
            time: {
              type: SchemaType.STRING,
              description: 'The time (if already mentioned, e.g., "7pm", "around 8")',
            },
          },
          required: ['restaurant_id', 'restaurant_name'],
        },
      },
    ],
  },
];

function getSystemPrompt(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  };
  const currentDateTime = now.toLocaleString('en-US', options);

  return `You are Reserva, an intelligent dining concierge powered by Google. You help users discover restaurants and make reservations seamlessly.

Current date and time: ${currentDateTime} (Pacific Time, Los Angeles)

Your personality:
- Warm, knowledgeable, and efficient
- You speak like a trusted local friend who knows all the best spots
- You're proactive about suggesting options but not pushy
- You understand context and remember preferences within the conversation

Your capabilities:
- Search for restaurants based on location, cuisine, mood, price, and other criteria
- Get detailed information about restaurants including reviews and availability
- Make reservations on behalf of the user
- Modify existing reservations (change time, date, or party size)
- Update the map to show relevant locations and search areas

Guidelines:
1. When users mention a location (like "near the Ace Hotel"), immediately search and show options
2. Always provide 2-4 curated recommendations, not long lists
3. Include relevant details like walking time, signature dishes, and why each place fits their needs
4. When recommending, lead with your top pick and explain why
5. After showing options, ask if they'd like to book or see more details
6. Be conversational - use natural language, not bullet points
7. When users say "tonight", "today", "tomorrow", etc., use the current date/time above to determine the actual date
8. When users want to modify an existing reservation, ask what they'd like to change (time, date, or party size), then use the modify_reservation function
9. For modifications, use the confirmation code and restaurant name provided by the user - do NOT try to look up the restaurant
10. NEVER say "I've updated the map" or reference the map - just present the restaurants naturally

IMPORTANT - Conversational Booking Flow:
When a user wants to book a restaurant, you MUST use the collect_booking_info tool:
- ALWAYS call collect_booking_info for EVERY step of the booking conversation - this generates quick reply buttons
- Call it when user first says they want to book, and call it again with updated info as they provide each piece
- If the restaurant was shown in previous search results, use collect_booking_info to start booking
- If the user mentions a restaurant NOT from recent results, FIRST use search_restaurants to find it, then proceed with booking
- Extract any info already mentioned (e.g., "book for 4 tomorrow" = party_size: 4, date: "tomorrow")
- ONLY ask for information that hasn't been provided yet
- If party size is missing, ask "How many people?"
- If dietary restrictions is missing, ask "Any dietary restrictions I should note?" (after party size)
- If date is missing, ask "When would you like to go?"
- If time is missing, ask "What time works for you?"
- NEVER say "Checking your calendar" or "You're free" in your responses - the UI handles this automatically when a time is selected
- When user selects a date, just acknowledge it simply like "Great, tomorrow it is! What time works for you?"
- When all info is collected, show a brief summary and let user confirm
- DO NOT open a booking modal - the conversation handles everything until final payment confirmation
- If collect_booking_info returns an error, apologize and offer to search for the restaurant

Example flow (ALWAYS call collect_booking_info at each step to generate quick reply buttons):
User: "Book Sushi Gen"
You: [call collect_booking_info with restaurant_name: "Sushi Gen"] "Great choice! How many people will be joining?"
User: "4"
You: [call collect_booking_info with restaurant_name: "Sushi Gen", party_size: 4] "Any dietary restrictions I should note?"
User: "No dietary restrictions"
You: [call collect_booking_info with restaurant_name: "Sushi Gen", party_size: 4, dietary_restrictions: "none"] "Great! When would you like to go?"
User: "Tomorrow"
You: [call collect_booking_info with restaurant_name: "Sushi Gen", party_size: 4, dietary_restrictions: "none", date: "Tomorrow"] "Tomorrow it is! What time works for you?"
User: "7:30 PM"
You: [call collect_booking_info with all info] "Perfect! Here's your booking summary."

CRITICAL: You MUST call collect_booking_info at EVERY step - each response in the booking flow requires calling this tool with ALL previously collected info plus any new info. The quick reply buttons only appear if you call this tool.

CRITICAL RULE - NO RESTAURANT SEARCHES DURING BOOKING:
Once a user starts booking a restaurant (says "book X" or clicks to book), you MUST NOT call search_restaurants again until the booking is complete or explicitly cancelled. This rule applies even when:
- User provides party size (e.g., "4 people", "2") - use collect_booking_info, NOT search_restaurants
- User provides date (e.g., "tomorrow", "tonight", "Saturday") - use collect_booking_info, NOT search_restaurants
- User provides time (e.g., "7 PM", "around 8") - use collect_booking_info, NOT search_restaurants
- User says anything during the booking flow - ALWAYS use collect_booking_info

ONLY use collect_booking_info during booking. Restaurant cards should NOT appear during booking - only quick reply buttons and booking summary.

Remember: You're not just searching, you're curating an experience. Every recommendation should feel personal and considered.`;
}

// Store for caching restaurants from Places API during the session
let cachedRestaurants: Map<string, Restaurant> = new Map();

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_restaurants': {
      const location = args.location as string | undefined;
      const cuisine = args.cuisine as string | undefined;
      const priceLevel = args.price_level as string | undefined;
      const walkingDistance = args.walking_distance as boolean | undefined;

      let referencePoint = location ? findLandmark(location) : null;
      if (!referencePoint) {
        referencePoint = { lat: 34.0522, lng: -118.2437, name: 'Los Angeles' };
      }

      const priceMap: Record<string, number[]> = {
        budget: [1],
        moderate: [2],
        upscale: [3],
        'fine dining': [4],
      };

      const priceLevels = priceLevel ? priceMap[priceLevel.toLowerCase()] : undefined;

      // Try Places API first if enabled
      if (USE_PLACES_API) {
        try {
          const query = cuisine
            ? `${cuisine} restaurant near ${location || 'Los Angeles'}`
            : `restaurant near ${location || 'Los Angeles'}`;

          const placesResults = await searchPlacesAPI({
            query,
            location: referencePoint,
            radius: walkingDistance ? 1200 : 5000,
            cuisine,
            minPrice: priceLevels?.[0],
            maxPrice: priceLevels?.[priceLevels.length - 1],
          });

          if (placesResults.length > 0) {
            // Cache the results for later lookups
            placesResults.forEach(r => cachedRestaurants.set(r.id, r));

            const sorted = placesResults.sort((a, b) => b.rating - a.rating).slice(0, 6);
            return {
              restaurants: sorted,
              searchCenter: referencePoint,
              searchRadius: walkingDistance ? 1200 : 3000,
              source: 'places_api',
            };
          }
        } catch (error) {
          console.error('Places API error, falling back to mock data:', error);
        }
      }

      // Fallback to mock data
      const filtered = filterRestaurants(MOCK_RESTAURANTS, {
        cuisine,
        priceLevel: priceLevels,
        maxDistance: walkingDistance ? 1200 : 5000,
        referencePoint,
      });

      const sorted = filtered.sort((a, b) => b.rating - a.rating).slice(0, 6);

      return {
        restaurants: sorted,
        searchCenter: referencePoint,
        searchRadius: walkingDistance ? 1200 : 3000,
        source: 'mock_data',
      };
    }

    case 'get_restaurant_details': {
      const id = args.restaurant_id as string | undefined;
      const restaurantName = args.restaurant_name as string | undefined;

      // Check cache first (for Places API results)
      if (id && cachedRestaurants.has(id)) {
        return cachedRestaurants.get(id);
      }

      // Try Places API if ID looks like a Google Place ID
      if (USE_PLACES_API && id && id.startsWith('ChI')) {
        try {
          const details = await getPlaceDetails(id);
          if (details) {
            cachedRestaurants.set(details.id, details);
            return details;
          }
        } catch (error) {
          console.error('Places API details error:', error);
        }
      }

      // Fallback to mock data
      let restaurant = null;
      if (id) {
        restaurant = MOCK_RESTAURANTS.find((r) => r.id === id);
      } else if (restaurantName) {
        restaurant = MOCK_RESTAURANTS.find((r) =>
          r.name.toLowerCase().includes(restaurantName.toLowerCase())
        );
      }

      return restaurant || { error: 'Restaurant not found' };
    }

    case 'check_availability': {
      const id = args.restaurant_id as string;
      const restaurantName = args.restaurant_name as string | undefined;

      // Check cached Places API results first
      let restaurant = cachedRestaurants.get(id);
      if (!restaurant) {
        restaurant = MOCK_RESTAURANTS.find((r) => r.id === id);
      }
      // Try finding by name if ID didn't work
      if (!restaurant && restaurantName) {
        restaurant = MOCK_RESTAURANTS.find((r) =>
          r.name.toLowerCase().includes(restaurantName.toLowerCase())
        );
      }

      if (!restaurant) {
        return { error: 'Restaurant not found' };
      }

      return {
        restaurant_name: restaurant.name,
        available_times: restaurant.availableTimes,
        date: args.date || 'tonight',
        party_size: args.party_size,
      };
    }

    case 'make_reservation': {
      const id = args.restaurant_id as string;
      const restaurantName = args.restaurant_name as string | undefined;

      // Check cached Places API results first
      let restaurant = cachedRestaurants.get(id);
      if (!restaurant) {
        restaurant = MOCK_RESTAURANTS.find((r) => r.id === id);
      }
      // Try finding by name if ID didn't work
      if (!restaurant && restaurantName) {
        restaurant = MOCK_RESTAURANTS.find((r) =>
          r.name.toLowerCase().includes(restaurantName.toLowerCase())
        );
      }

      if (!restaurant) {
        return { error: 'Restaurant not found' };
      }

      const confirmationCode = `RES${Date.now().toString(36).toUpperCase()}`;

      return {
        success: true,
        confirmation_code: confirmationCode,
        restaurant_name: restaurant.name,
        date: args.date,
        time: args.time,
        party_size: args.party_size,
        address: restaurant.address,
        phone: restaurant.phone,
      };
    }

    case 'update_map': {
      const location = args.center_location as string | undefined;
      const referencePoint = location ? findLandmark(location) : null;

      return {
        center: referencePoint || { lat: 34.0522, lng: -118.2437 },
        showRadius: args.show_radius || false,
        radius: args.radius_meters || 1000,
      };
    }

    case 'modify_reservation': {
      const confirmationCode = args.confirmation_code as string;
      const restaurantName = args.restaurant_name as string;
      const newDate = args.new_date as string | undefined;
      const newTime = args.new_time as string | undefined;
      const newPartySize = args.new_party_size as number | undefined;

      // Simulate UCP modification via aggregator gateway
      const newConfirmationCode = `RES${Date.now().toString(36).toUpperCase()}`;

      return {
        success: true,
        original_confirmation_code: confirmationCode,
        new_confirmation_code: newConfirmationCode,
        restaurant_name: restaurantName,
        changes_made: {
          date: newDate || 'unchanged',
          time: newTime || 'unchanged',
          party_size: newPartySize || 'unchanged',
        },
        message: `Reservation at ${restaurantName} has been successfully modified via UCP.`,
      };
    }

    case 'collect_booking_info': {
      const restaurantId = args.restaurant_id as string;
      const restaurantName = args.restaurant_name as string;
      const partySize = args.party_size as number | undefined;
      const dietaryRestrictions = args.dietary_restrictions as string | undefined;
      const date = args.date as string | undefined;
      const time = args.time as string | undefined;

      // Get restaurant from cache or mock
      let restaurant = cachedRestaurants.get(restaurantId);
      if (!restaurant) {
        restaurant = MOCK_RESTAURANTS.find((r) => r.id === restaurantId);
      }
      // Try finding by name if ID didn't work
      if (!restaurant && restaurantName) {
        restaurant = MOCK_RESTAURANTS.find((r) =>
          r.name.toLowerCase().includes(restaurantName.toLowerCase())
        );
        // If still not found and using Places API, search for it
        if (!restaurant && USE_PLACES_API) {
          try {
            const searchResults = await searchPlacesAPI({
              query: `${restaurantName} restaurant Los Angeles`,
              location: { lat: 34.0522, lng: -118.2437 },
              radius: 10000,
            });
            if (searchResults.length > 0) {
              restaurant = searchResults[0];
              cachedRestaurants.set(restaurant.id, restaurant);
            }
          } catch (e) {
            console.error('Error searching for restaurant:', e);
          }
        }
      }

      // If restaurant still not found, return error with suggestion to search first
      if (!restaurant) {
        return {
          status: 'error',
          error: 'restaurant_not_found',
          restaurant_name: restaurantName,
          message: `Could not find "${restaurantName}". Please search for restaurants first so I can show you available options.`,
        };
      }

      // Determine what's missing
      const missing: string[] = [];
      if (!partySize) missing.push('party_size');
      if (!dietaryRestrictions) missing.push('dietary_restrictions');
      if (!date) missing.push('date');
      if (!time) missing.push('time');

      // Generate quick reply options based on what's missing
      let quickReplies: Array<{ label: string; value: string; action?: string }> = [];

      if (missing.includes('party_size')) {
        quickReplies = [
          { label: '2 people', value: '2 people' },
          { label: '4 people', value: '4 people' },
          { label: '6 people', value: '6 people' },
        ];
      } else if (missing.includes('dietary_restrictions')) {
        quickReplies = [
          { label: 'None', value: 'No dietary restrictions' },
          { label: 'Vegetarian', value: 'Vegetarian' },
          { label: 'Vegan', value: 'Vegan' },
          { label: 'Gluten-free', value: 'Gluten-free' },
        ];
      } else if (missing.includes('date')) {
        quickReplies = [
          { label: 'Tonight', value: 'Tonight' },
          { label: 'Tomorrow', value: 'Tomorrow' },
          { label: 'This weekend', value: 'This weekend' },
        ];
      } else if (missing.includes('time')) {
        // Use restaurant's available times if available
        const times = restaurant?.availableTimes?.slice(0, 4) || ['6:00 PM', '7:00 PM', '7:30 PM', '8:00 PM'];
        quickReplies = times.map(t => ({ label: t, value: t }));
      } else {
        // All info collected, ready to confirm
        // Calculate deposit if applicable
        let depositAmount = 0;
        if (restaurant?.depositPolicy && partySize) {
          if (restaurant.depositPolicy.type === 'per_person') {
            depositAmount = restaurant.depositPolicy.amount * partySize;
          } else if (restaurant.depositPolicy.type === 'flat') {
            if (!restaurant.depositPolicy.minPartySize || partySize >= restaurant.depositPolicy.minPartySize) {
              depositAmount = restaurant.depositPolicy.amount;
            }
          }
        }

        quickReplies = [
          { label: depositAmount > 0 ? `Confirm & Pay $${depositAmount}` : 'Confirm Reservation', value: 'confirm', action: 'confirm_booking' },
          { label: 'Change details', value: 'change', action: 'change_details' },
        ];

        return {
          status: 'ready_to_confirm',
          restaurant_id: restaurantId,
          restaurant_name: restaurantName,
          party_size: partySize,
          dietary_restrictions: dietaryRestrictions,
          date: date,
          time: time,
          deposit_amount: depositAmount,
          quick_replies: quickReplies,
          booking_summary: restaurant ? {
            restaurant: restaurant,
            partySize: partySize,
            dietaryRestrictions: dietaryRestrictions,
            date: date,
            time: time,
            depositAmount: depositAmount,
            depositPolicy: restaurant.depositPolicy || null,
          } : null,
        };
      }

      return {
        status: 'collecting',
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        collected: {
          party_size: partySize || null,
          dietary_restrictions: dietaryRestrictions || null,
          date: date || null,
          time: time || null,
        },
        missing: missing,
        next_question: missing[0],
        quick_replies: quickReplies,
      };
    }

    default:
      return { error: 'Unknown tool' };
  }
}

// Helper function to detect if we're in an active booking flow
function isBookingFlowActive(messages: Array<{ role: string; content: string }>): boolean {
  // Look at the last few messages to detect booking context
  const recentMessages = messages.slice(-8);

  // Check for cancellation - if a reservation was cancelled, we're NOT in booking flow
  const cancellationIndicators = [
    /cancel.*reservation/i,
    /reservation.*cancel/i,
    /unfortunately.*cancel/i,
    /had to cancel/i,
    /need to cancel/i,
    /I just (heard|received word) from/i,  // Donna's cancellation message
    /find.*alternative/i,
    /Find me.*restaurants.*with availability/i,  // User searching after cancellation
  ];

  for (const msg of recentMessages.slice(-4)) {  // Check last 4 messages for cancellation
    for (const pattern of cancellationIndicators) {
      if (pattern.test(msg.content)) {
        console.log('[Booking Detection] Cancellation detected, not in booking flow');
        return false;
      }
    }
  }

  // Strong indicators that we're in a booking flow
  const strongBookingStart = [
    /\bbook\b/i,                    // "book", "Book it", "book that"
    /\breserve\b/i,                 // "reserve", "make a reservation"
    /\bI('ll| will)? take\b/i,      // "I'll take it", "I'll take that one"
  ];

  // Questions the agent asks during booking
  const agentBookingQuestions = [
    /how many (people|guests)/i,
    /what time/i,
    /when would you like/i,
    /what date/i,
    /party size/i,
  ];

  // User responses during booking (short answers)
  const userBookingResponses = [
    /^\d+\s*(people|guests|persons)?$/i,  // "4", "4 people"
    /^(tonight|tomorrow|today|this weekend|next \w+)$/i,  // date responses
    /^\d{1,2}(:\d{2})?\s*(am|pm)?$/i,     // "7", "7:30", "7:30 PM"
    /^(2|two|3|three|4|four|5|five|6|six)\s*(people)?$/i,  // written numbers
  ];

  let hasBookingStart = false;
  let hasAgentQuestion = false;
  let hasUserResponse = false;

  for (const msg of recentMessages) {
    const content = msg.content.trim();

    // Check for booking initiation
    for (const pattern of strongBookingStart) {
      if (pattern.test(content)) {
        hasBookingStart = true;
        break;
      }
    }

    // Check for agent's booking questions
    if (msg.role === 'assistant') {
      for (const pattern of agentBookingQuestions) {
        if (pattern.test(content)) {
          hasAgentQuestion = true;
          break;
        }
      }
    }

    // Check for user's booking responses (typically short)
    if (msg.role === 'user' && content.length < 30) {
      for (const pattern of userBookingResponses) {
        if (pattern.test(content)) {
          hasUserResponse = true;
          break;
        }
      }
    }
  }

  // We're in booking flow if:
  // 1. User started booking AND agent asked a question, OR
  // 2. Agent asked a booking question AND user gave a booking response
  const inBookingFlow = (hasBookingStart && hasAgentQuestion) || (hasAgentQuestion && hasUserResponse);

  if (inBookingFlow) {
    console.log('[Booking Detection] In booking flow:', { hasBookingStart, hasAgentQuestion, hasUserResponse });
  }

  return inBookingFlow;
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    // Detect if we're in an active booking flow
    const inBookingFlow = isBookingFlowActive(messages);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools,
      systemInstruction: getSystemPrompt(),
    });

    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);

    let response = result.response;
    const toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = [];
    let restaurants: Restaurant[] = [];
    let mapUpdate = null;
    let modifiedReservation = null;
    let quickReplies: Array<{ label: string; value: string; action?: string }> | null = null;
    let bookingSummary: { restaurant: Restaurant; partySize: number; date: string; time: string; depositAmount?: number } | null = null;

    // Check for function calls - handle both property access methods
    let funcCalls = response.functionCalls?.() || [];

    // Handle function calls
    while (funcCalls && funcCalls.length > 0) {
      const functionResponses: FunctionResponsePart[] = [];

      for (const call of funcCalls) {
        // SERVER-SIDE ENFORCEMENT: Block search_restaurants during active booking flow
        if (call.name === 'search_restaurants' && inBookingFlow) {
          console.log('[Booking Guard] Blocked search_restaurants during active booking flow');
          // Return a message telling the LLM to use collect_booking_info instead
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: {
                blocked: true,
                message: 'Cannot search for restaurants during an active booking. Please use collect_booking_info to continue the current booking conversation.',
              },
            },
          });
          continue; // Skip executing this tool
        }

        const toolResult = await executeTool(call.name, call.args as Record<string, unknown>);
        toolCalls.push({
          name: call.name,
          args: call.args as Record<string, unknown>,
          result: toolResult,
        });

        if (call.name === 'search_restaurants' && toolResult && typeof toolResult === 'object' && 'restaurants' in toolResult) {
          const searchResult = toolResult as { restaurants: Restaurant[]; searchCenter: { lat: number; lng: number }; searchRadius: number };
          restaurants = searchResult.restaurants;
          mapUpdate = {
            center: searchResult.searchCenter,
            radius: searchResult.searchRadius,
          };
        }

        if (call.name === 'update_map') {
          mapUpdate = toolResult;
        }

        if (call.name === 'modify_reservation' && toolResult && typeof toolResult === 'object' && 'success' in toolResult) {
          modifiedReservation = toolResult;
        }

        if (call.name === 'collect_booking_info' && toolResult && typeof toolResult === 'object') {
          const bookingResult = toolResult as { quick_replies?: Array<{ label: string; value: string; action?: string }>; booking_summary?: { restaurant: Restaurant; partySize: number; date: string; time: string; depositAmount?: number } };
          if (bookingResult.quick_replies) {
            quickReplies = bookingResult.quick_replies;
          }
          if (bookingResult.booking_summary) {
            bookingSummary = bookingResult.booking_summary;
          }
        }

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult as object,
          },
        });
      }

      const functionResult = await chat.sendMessage(functionResponses as Part[]);
      response = functionResult.response;
      funcCalls = response.functionCalls?.() || [];
    }

    // Get text - might be empty if only function calls
    let text = '';
    try {
      text = response.text();
    } catch {
      // No text response, that's ok
    }

    return NextResponse.json({
      content: text,
      toolCalls,
      restaurants,
      mapUpdate,
      modifiedReservation,
      quickReplies,
      bookingSummary,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
