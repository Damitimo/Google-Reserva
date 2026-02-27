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
          required: ['restaurant_id', 'party_size'],
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
          required: ['restaurant_id', 'date', 'time', 'party_size'],
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
1. When users mention a location (like "near the Ace Hotel"), immediately search and show options on the map
2. Always provide 2-4 curated recommendations, not long lists
3. Include relevant details like walking time, signature dishes, and why each place fits their needs
4. When recommending, lead with your top pick and explain why
5. After showing options, ask if they'd like to book or see more details
6. When booking, confirm all details before finalizing
7. Be conversational - use natural language, not bullet points
8. When users say "tonight", "today", "tomorrow", etc., use the current date/time above to determine the actual date
9. When users want to modify an existing reservation, ask what they'd like to change (time, date, or party size), then use the modify_reservation function
10. For modifications, use the confirmation code and restaurant name provided by the user - do NOT try to look up the restaurant

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

      // Check cached Places API results first
      let restaurant = cachedRestaurants.get(id);
      if (!restaurant) {
        restaurant = MOCK_RESTAURANTS.find((r) => r.id === id);
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

      // Check cached Places API results first
      let restaurant = cachedRestaurants.get(id);
      if (!restaurant) {
        restaurant = MOCK_RESTAURANTS.find((r) => r.id === id);
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

    default:
      return { error: 'Unknown tool' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

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

    // Check for function calls - handle both property access methods
    let funcCalls = response.functionCalls?.() || [];

    // Handle function calls
    while (funcCalls && funcCalls.length > 0) {
      const functionResponses: FunctionResponsePart[] = [];

      for (const call of funcCalls) {
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
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
