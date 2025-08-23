# Review Integration Environment Variables

## Required Environment Variables for Vercel

Set these in your Vercel project dashboard under Settings → Environment Variables:

### Google Integration
- `GOOGLE_PLACES_API_KEY` - Google Places API key for reading reviews (server-only)

### Yelp Integration  
- `YELP_API_KEY` - Yelp Fusion API key for reading reviews (server-only)

### Facebook Integration
- `FB_APP_ID` - Facebook App ID for OAuth (server-only)
- `FB_APP_SECRET` - Facebook App Secret for OAuth (server-only)
- `FB_REDIRECT_URL` - Facebook OAuth redirect URL (e.g., https://yourdomain.com/api/auth/facebook/callback)

### Internal API Security
- `INTERNAL_API_KEY` - Simple internal API key for serverless function communication (server-only)

### AI Integration
- `OPENAI_API_KEY` - OpenAI API key for generating review replies (server-only)

## Setup Instructions

1. **Google Places API**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Places API
   - Create credentials (API Key)
   - Restrict to Places API only

2. **Yelp Fusion API**:
   - Go to [Yelp Developers](https://www.yelp.com/developers)
   - Create an app
   - Get your API key

3. **Facebook App**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app
   - Add Facebook Login product
   - Configure OAuth redirect URIs

4. **OpenAI**:
   - Go to [OpenAI Platform](https://platform.openai.com/)
   - Create an API key

## Security Notes

- All keys are server-side only and never exposed to the client
- The `INTERNAL_API_KEY` is a simple string used for internal serverless function communication
- RLS policies ensure users can only access their own business data
- Review platform terms of service are respected (e.g., Yelp's 3-review limit)

## Testing

After setting environment variables:

1. Go to Settings → Integrations tab
2. Connect your review platforms
3. Use "Test Connection" to verify API access
4. Use "Sync Now" to import reviews
5. Check the Review Inbox to see imported reviews

## Cron Job

The system automatically syncs reviews every 6 hours via Vercel Cron:
- Schedule: `0 */6 * * *` (every 6 hours)
- Endpoint: `/api/reviews/sync/all`
- Only syncs businesses with connected review sources
