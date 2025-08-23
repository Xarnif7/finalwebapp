import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    // Extract business ID from Yelp URL
    let businessId = null;
    
    // Format: https://www.yelp.com/biz/business-name-identifier
    const bizMatch = url.match(/\/biz\/([^\/\?]+)/);
    if (bizMatch) {
      businessId = bizMatch[1];
    }
    
    // Format: https://yelp.com/biz/business-name-identifier
    const yelpMatch = url.match(/yelp\.com\/biz\/([^\/\?]+)/);
    if (yelpMatch) {
      businessId = yelpMatch[1];
    }

    if (!businessId) {
      return NextResponse.json({ 
        error: 'Could not extract Business ID from Yelp URL',
        suggestions: [
          'Make sure you\'re using a Yelp business page URL',
          'The URL should contain "/biz/" followed by the business identifier',
          'Example: https://www.yelp.com/biz/your-business-name'
        ]
      }, { status: 400 });
    }

    // Clean up the business ID (remove any query parameters or fragments)
    businessId = businessId.split('?')[0].split('#')[0];

    return NextResponse.json({
      success: true,
      business_id: businessId,
      message: 'Yelp Business ID extracted successfully'
    });

  } catch (error) {
    console.error('Yelp Business ID resolution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
