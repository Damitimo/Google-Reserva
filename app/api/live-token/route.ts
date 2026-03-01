import { NextResponse } from 'next/server';

/**
 * API Route to provide the Gemini Live API key to the client
 *
 * Note: For production, you should implement ephemeral tokens instead.
 * This is a simplified approach for demo purposes.
 *
 * Ephemeral tokens can be generated via:
 * POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * with ephemeralToken generation parameters
 */
export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  // For demo purposes, return the API key directly
  // In production, generate an ephemeral token instead
  return NextResponse.json({ apiKey });
}
