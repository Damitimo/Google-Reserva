import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const photoName = searchParams.get('name');
  const maxWidth = searchParams.get('maxWidth') || '400';

  if (!photoName) {
    return NextResponse.json({ error: 'Missing photo name' }, { status: 400 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    // Fetch the photo from Google Places API
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_API_KEY}&maxWidthPx=${maxWidth}`;

    const response = await fetch(photoUrl, {
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error('Photo fetch failed:', response.status, await response.text());
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error fetching photo:', error);
    return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 500 });
  }
}
