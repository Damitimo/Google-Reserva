import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

  const { searchParams } = new URL(request.url);
  const photoName = searchParams.get('name');
  const maxWidth = searchParams.get('maxWidth') || '400';

  if (!photoName) {
    return NextResponse.json({ error: 'Missing photo name' }, { status: 400 });
  }

  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY not found in environment');
    return NextResponse.json({ error: 'API key not configured', hasKey: !!GOOGLE_API_KEY }, { status: 500 });
  }

  try {
    // Fetch the photo from Google Places API
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_API_KEY}&maxWidthPx=${maxWidth}`;
    console.log('Fetching photo:', photoName.substring(0, 50) + '...');

    const response = await fetch(photoUrl, {
      redirect: 'follow',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Photo fetch failed:', response.status, errorText);
      return NextResponse.json({ error: 'Photo not found', status: response.status, details: errorText.substring(0, 200) }, { status: 404 });
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
