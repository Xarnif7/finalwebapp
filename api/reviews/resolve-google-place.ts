import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    // Extract place_id from various Google Maps URL formats
    let placeId = null;
    
    // Format 1: https://maps.google.com/?cid=1234567890
    const cidMatch = url.match(/[?&]cid=([^&]+)/);
    if (cidMatch) {
      placeId = cidMatch[1];
    }
    
    // Format 2: https://www.google.com/maps/place/.../data=!4m2!3m1!1s0x...
    const dataMatch = url.match(/data=!4m2!3m1!1s([^!]+)/);
    if (dataMatch) {
      placeId = dataMatch[1];
    }
    
    // Format 3: https://www.google.com/maps/place/.../@lat,lng,17z/data=!4m2!3m1!1s0x...
    const placeMatch = url.match(/place\/[^\/]+\/data=!4m2!3m1!1s([^!]+)/);
    if (placeMatch) {
      placeId = placeMatch[1];
    }

    if (!placeId) {
      return NextResponse.json({ 
        error: 'Could not extract Place ID from URL',
        suggestions: [
          'Make sure you\'re using a Google Maps business URL',
          'Try copying the URL from the "Share" button in Google Maps',
          'The URL should contain "cid=" or "data=" parameters'
        ]
      }, { status: 400 });
    }

    // Validate the place_id format (Google Place IDs are typically long alphanumeric strings)
    if (placeId.length < 20) {
      return NextResponse.json({ 
        warning: 'Place ID seems too short, may not be valid',
        place_id: placeId,
        suggestions: [
          'Verify this is the correct business in Google Maps',
          'Try using the "Share" button to get a fresh URL'
        ]
      });
    }

    return NextResponse.json({
      success: true,
      place_id: placeId,
      message: 'Place ID extracted successfully'
    });

  } catch (error) {
    console.error('Google Place ID resolution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
