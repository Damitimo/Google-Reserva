import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    USE_PLACES_API: process.env.USE_PLACES_API,
    HAS_GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
    HAS_MAPS_KEY: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });
}
