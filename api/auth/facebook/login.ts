import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const appId = process.env.FB_APP_ID;
    const redirectUri = process.env.FB_REDIRECT_URL;
    
    if (!appId || !redirectUri) {
      return NextResponse.json(
        { error: 'Facebook OAuth not configured' },
        { status: 500 }
      );
    }

    // Generate Facebook OAuth URL
    const scope = 'pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_engagement';
    const state = Math.random().toString(36).substring(7); // Simple state for CSRF protection
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&response_type=code`;
    
    return NextResponse.json({
      auth_url: authUrl,
      state
    });

  } catch (error) {
    console.error('Facebook login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
