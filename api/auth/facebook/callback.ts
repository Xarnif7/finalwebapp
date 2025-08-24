import { NextRequest, NextResponse } from 'next/server';

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FacebookPage {
  access_token: string;
  category: string;
  name: string;
  id: string;
  tasks: string[];
}

interface FacebookPagesResponse {
  data: FacebookPage[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      return NextResponse.json(
        { error: `Facebook OAuth error: ${error}` },
        { status: 400 }
      );
    }
    
    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code received' },
        { status: 400 }
      );
    }

    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const redirectUri = process.env.FB_REDIRECT_URL;
    
    if (!appId || !appSecret || !redirectUri) {
      return NextResponse.json(
        { error: 'Facebook OAuth not configured' },
        { status: 500 }
      );
    }

    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
    
    const tokenResponse = await fetch(tokenUrl);
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData: FacebookTokenResponse = await tokenResponse.json();
    const userAccessToken = tokenData.access_token;

    // Get user's pages
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`;
    
    const pagesResponse = await fetch(pagesUrl);
    if (!pagesResponse.ok) {
      throw new Error(`Pages fetch failed: ${pagesResponse.status}`);
    }

    const pagesData: FacebookPagesResponse = await pagesResponse.json();
    
    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.json({
        error: 'No Facebook pages found for this user',
        pages: []
      });
    }

    // Return pages for user to select
    return NextResponse.json({
      success: true,
      pages: pagesData.data.map(page => ({
        id: page.id,
        name: page.name,
        category: page.category,
        access_token: page.access_token,
        tasks: page.tasks
      }))
    });

  } catch (error) {
    console.error('Facebook callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
