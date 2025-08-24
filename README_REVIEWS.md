# Reviews Integration System

This system allows businesses to automatically import and manage customer reviews from Google, Facebook, and Yelp platforms.

## Features

- **Google Places Integration**: Read-only access to Google Places reviews via Places API
- **Facebook Integration**: OAuth-based access to Facebook Page ratings and reviews
- **Yelp Integration**: API-based access to Yelp business reviews (max 3 per sync)
- **AI Reply Generation**: OpenAI-powered reply suggestions for customer reviews
- **Automated Syncing**: Cron job runs every 6 hours to sync new reviews
- **Review Management**: Filter, search, and respond to reviews with platform-specific actions

## Environment Variables

Set these in your Vercel project dashboard under Settings → Environment Variables:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_PLACES_API_KEY` | Google Places API key for reading reviews | `AIzaSy...` |
| `YELP_API_KEY` | Yelp Fusion API key | `Bearer...` |
| `FB_APP_ID` | Facebook App ID for OAuth | `123456789` |
| `FB_APP_SECRET` | Facebook App Secret for OAuth | `abcdef...` |
| `FB_REDIRECT_URL` | Facebook OAuth redirect URL | `https://yourdomain.com/api/auth/facebook/callback` |
| `OPENAI_API_KEY` | OpenAI API key for AI reply generation | `sk-...` |
| `INTERNAL_API_KEY` | Internal API key for cron job security | `your-secret-key` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_GOOGLE_MAPS_KEY` | Google Maps JavaScript API key for Places Autocomplete | `AIzaSy...` |

## Setup Instructions

### 1. Google Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Places API
3. Create credentials (API Key)
4. Restrict to Places API only
5. Add to Vercel as `GOOGLE_PLACES_API_KEY`

**Note**: Google Places API is read-only. Replies will be "Copy & Open" only.

### 2. Yelp Fusion API

1. Go to [Yelp Developers](https://www.yelp.com/developers)
2. Create an app
3. Get your API key
4. Add to Vercel as `YELP_API_KEY`

**Note**: Yelp Fusion API returns max 3 reviews per sync call.

### 3. Facebook App Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs:
   - Production: `https://yourdomain.com/api/auth/facebook/callback`
   - Preview: `https://your-preview-alias.vercel.app/api/auth/facebook/callback`
5. Add required permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `pages_manage_engagement` (for posting replies)
6. Add to Vercel:
   - `FB_APP_ID`
   - `FB_APP_SECRET`
   - `FB_REDIRECT_URL`

### 4. OpenAI API

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add to Vercel as `OPENAI_API_KEY`

### 5. Internal API Key

1. Generate a random string for internal API communication
2. Add to Vercel as `INTERNAL_API_KEY`

## Database Setup

Run the SQL migration in your Supabase SQL editor:

```sql
-- Run database-reviews-migration.sql
```

This creates:
- `review_sources` table for platform connections
- `reviews` table for imported reviews
- Proper indexes and RLS policies
- Audit logging

## Usage

### 1. Connect Platforms

1. Go to Settings → Integrations tab
2. For each platform:
   - Google: Use Places search or paste Maps URL
   - Facebook: Click "Connect Facebook" and select a Page
   - Yelp: Paste business URL to extract Business ID

### 2. Sync Reviews

1. Click "Test Connection" to verify API access
2. Click "Sync Now" to import reviews
3. Reviews will appear in the Review Inbox

### 3. Manage Reviews

1. Go to Review Inbox
2. Filter by platform, sentiment, or search text
3. Select a review to view details
4. Use "AI Assist" to generate reply suggestions
5. Respond based on platform capabilities:
   - Facebook: Direct reply posting (if permissions allow)
   - Google/Yelp: Copy reply and post manually

### 4. Automated Syncing

The system automatically syncs reviews every 6 hours via Vercel Cron.

## Platform Limitations

### Google Places
- **Access**: Read-only via Places API
- **Reviews**: Limited recent reviews (typically 5-10)
- **Replies**: Copy & Open only (no API posting)

### Facebook
- **Access**: OAuth-based Page access
- **Reviews**: Page ratings and review text
- **Replies**: Direct posting if `pages_manage_engagement` permission granted
- **Fallback**: Copy & Open if permissions insufficient

### Yelp
- **Access**: API key-based
- **Reviews**: Max 3 reviews per sync call
- **Replies**: Copy & Open only (no API posting)

## Security Features

- All API keys stored server-side only
- RLS policies ensure business data isolation
- Internal API key protects cron endpoints
- OAuth tokens encrypted and masked in logs
- Audit logging for all operations

## Troubleshooting

### Common Issues

1. **"API key not configured"**: Check environment variables in Vercel
2. **"No connected review sources"**: Complete platform setup in Integrations tab
3. **"Permission denied"**: Facebook OAuth may need additional scopes
4. **"No reviews found"**: Check if business has reviews on the platform

### Debug Steps

1. Check environment variable status in Integrations tab
2. Verify API keys are valid and have correct permissions
3. Check Vercel function logs for detailed error messages
4. Ensure database tables exist and RLS is properly configured

## Development Notes

- Built with Vite/React frontend
- Vercel serverless functions for API endpoints
- Supabase for database and authentication
- OpenAI integration for AI reply generation
- Platform-specific API handling with fallbacks

## Support

For issues or questions:
1. Check Vercel function logs
2. Verify environment variable configuration
3. Test individual platform connections
4. Review database schema and RLS policies
