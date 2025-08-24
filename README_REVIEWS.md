# Review Inbox Implementation

## Overview
This document outlines the implementation of the Review Inbox feature that integrates with Google, Facebook, and Yelp to automatically import and manage business reviews.

## Features Implemented

### 1. Database Schema
- `review_sources` table: Stores platform connections and credentials
- `reviews` table: Stores imported reviews with sentiment analysis
- `audit_log` table: Tracks all review sync activities
- RLS policies ensure data isolation by `business_id`

### 2. API Endpoints
- `/api/reviews/sync` - Sync specific platform or all platforms
- `/api/reviews/sync/all` - Sync all connected platforms
- All endpoints protected with `INTERNAL_API_KEY`

### 3. Security Implementation
- **INTERNAL_API_KEY Protection**: All sync routes require `x-internal-key` header or `?key=` query parameter
- Server-side only API keys (Google Places, Yelp, Facebook)
- RLS policies secure data by business tenant

### 4. Frontend Integration
- Settings > Integrations tab with platform cards
- Connection status, test connection, and sync now buttons
- Progress indicators and toast notifications
- Environment variable status display

### 5. Automated Syncing
- Vercel Cron job runs every 6 hours
- Calls `/api/reviews/sync/all?key=INTERNAL_API_KEY_VALUE`
- Updates `last_synced_at` timestamps

## Environment Variables Required

### Vercel Environment Variables (Server-side only)
```bash
GOOGLE_PLACES_API_KEY=your_google_places_api_key
YELP_API_KEY=your_yelp_fusion_api_key
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret
FB_REDIRECT_URL=your_facebook_redirect_url
INTERNAL_API_KEY=your_secure_internal_key
```

### Client-side Environment Variables
```bash
VITE_INTERNAL_API_KEY=your_internal_api_key
```

## Deployment Steps

### 1. Set Environment Variables in Vercel
1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add all required server-side variables
4. Add `VITE_INTERNAL_API_KEY` for client-side access

### 2. Update Vercel Cron Configuration
The `vercel.json` includes a cron job that runs every 6 hours:
```json
{
  "crons": [
    {
      "path": "/api/reviews/sync/all?key=INTERNAL_API_KEY_VALUE",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Important**: Replace `INTERNAL_API_KEY_VALUE` with your actual internal key value.

### 3. Deploy to Production
```bash
git add .
git commit -m "Implement Review Inbox with INTERNAL_API_KEY protection"
vercel --prod
```

## API Usage

### Manual Sync (with INTERNAL_API_KEY)
```javascript
// Individual platform sync
const response = await fetch('/api/reviews/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-internal-key': 'your-internal-key'
  },
  body: JSON.stringify({ business_id: 'uuid', platform: 'google' })
});

// Sync all platforms
const response = await fetch('/api/reviews/sync/all', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-internal-key': 'your-internal-key'
  },
  body: JSON.stringify({ business_id: 'uuid' })
});
```

### Cron Job Sync
The Vercel cron automatically calls:
```
GET /api/reviews/sync/all?key=INTERNAL_API_KEY_VALUE
```

## Security Notes

1. **Never expose INTERNAL_API_KEY in client-side code**
2. **All API keys stored server-side only**
3. **RLS policies enforce business data isolation**
4. **Audit logging tracks all sync activities**

## Testing

### Test Connection
1. Go to Settings > Integrations
2. Configure platform credentials
3. Click "Test Connection" to verify API access
4. Check environment variable status

### Manual Sync
1. Click "Sync Now" for individual platforms
2. Click "Sync All Platforms" for bulk sync
3. Monitor progress and results in toast notifications

## Troubleshooting

### Common Issues
1. **401 Unauthorized**: Check INTERNAL_API_KEY in headers/query
2. **Missing API Keys**: Verify environment variables in Vercel
3. **RLS Errors**: Ensure user has valid business_id in profiles table
4. **Cron Failures**: Verify INTERNAL_API_KEY in vercel.json cron path

### Debug Steps
1. Check Vercel function logs for API errors
2. Verify environment variables are set correctly
3. Test manual sync before relying on cron
4. Check RLS policies and business_id relationships

## Next Steps

### Planned Enhancements
1. **Google Business Profile OAuth**: Full reply posting capability
2. **Facebook Reply Posting**: Direct reply to Facebook reviews
3. **Advanced Sentiment Analysis**: AI-powered sentiment classification
4. **Review Response Templates**: Pre-built response suggestions
5. **Bulk Operations**: Archive, export, and bulk reply features

### Integration Opportunities
1. **Slack Notifications**: Alert team of new reviews
2. **Email Digests**: Daily/weekly review summaries
3. **Analytics Dashboard**: Review performance metrics
4. **Competitor Monitoring**: Track competitor review trends
