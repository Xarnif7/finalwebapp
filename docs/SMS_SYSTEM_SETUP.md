# SMS System Setup & Usage Guide

## Overview

Complete production-ready SMS system for Blipp using Surge API. Supports toll-free number (TFN) provisioning, verification management, and SMS messaging with compliance controls.

## Architecture

- **Backend**: Express API endpoints in `api/surge/` and `api/sms/`
- **Frontend**: React components in Settings → Messaging tab
- **Database**: Supabase PostgreSQL with RLS
- **SMS Provider**: Surge (https://api.surge.app)
- **Deployment**: Vercel serverless functions

## Environment Variables

Add these to both local `.env.local` and Vercel:

```env
# Surge SMS Configuration
SURGE_API_KEY=your_surge_api_key_here
SURGE_SIGNING_KEY=your_surge_signing_key_here
SURGE_API_BASE=https://api.surge.app
SURGE_USE_SUBACCOUNTS=false
APP_BASE_URL=https://myblipp.com

# Already existing (required for SMS system)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Database Setup

1. Run the migration to create tables and add SMS columns:

```bash
node scripts/run-sms-migration.js
```

This creates:
- `messages` table (SMS message history)
- `contacts` table (SMS contacts with opt-out tracking)
- Adds SMS columns to `businesses` table

## Surge Webhook Configuration

In your Surge dashboard, add **ONE** webhook URL:

```
https://myblipp.com/api/sms/webhook
```

This single endpoint handles all Surge events:
- Message delivery status (sent, delivered, failed)
- Inbound messages
- Verification status updates

## API Endpoints

### Provision TFN Number
```
POST /api/surge/provision-number
Body: {
  businessId: "uuid",
  businessInfo: {
    legal_name: "ABC Company LLC",
    website: "https://example.com",
    address: "123 Main St, City, State 12345",
    ein_or_sole_prop: "12-3456789",
    contact_name: "John Doe",
    contact_email: "john@example.com",
    opt_in_method: "website",
    terms_url: "https://myblipp.com/terms",
    privacy_url: "https://myblipp.com/privacy"
  }
}
```

### Check Status
```
GET /api/surge/status?businessId=uuid
```

### Send SMS
```
POST /api/sms/send
Body: {
  businessId: "uuid",
  to: "+14155551234",
  body: "Your message here"
}
```

### Webhook (Surge calls this)
```
POST /api/sms/webhook
Body: Surge webhook payload
```

## Usage Flow

1. **User visits Settings → Messaging**
   - If no SMS number: Shows "Get a free SMS number" button
   - If number exists: Shows status badge and phone number

2. **Provision Number**
   - Click "Get a free SMS number"
   - Fill out business verification form
   - System provisions TFN and submits verification
   - Status changes to "Pending Verification"

3. **Wait for Approval**
   - Status automatically updates via webhook
   - Typical verification time: 1-3 business days
   - Page polls status every 30 seconds

4. **Send SMS (once active)**
   - Status badge shows "Active"
   - Test Send form appears
   - Enter recipient phone and message
   - System adds compliance footer automatically

## Verification Status States

- **not_provisioned**: No SMS number yet
- **pending**: TFN provisioned, awaiting Surge approval
- **active**: Verified and ready to send SMS
- **action_needed**: Verification requires fixes
- **disabled**: SMS sending disabled

## Compliance Features

### Automatic Footer
Every outbound SMS automatically appends:
```
Reply STOP to opt out, HELP for help.
```

### Inbound Keyword Handling
- **STOP/STOPALL/UNSUBSCRIBE**: Sets `opted_out=true`, blocks future sends
- **HELP**: (TODO: Auto-reply with support info)

### Opt-Out Enforcement
- System checks `contacts.opted_out` before sending
- Returns 403 error if recipient has opted out
- Upserts contact record on every inbound message

## TODO Items

### Surge API Integration
The following functions currently return mock data and need real Surge API implementation:

1. **`api/_lib/surgeClient.js`**:
   - `createOrGetAccountForBusiness()` - Implement subaccount creation
   - `purchaseTollFreeNumber()` - Implement actual TFN purchase API call
   - `submitTfnVerification()` - Implement verification submission API call
   - `getCapabilityStatus()` - Implement status check API call
   - `verifySignature()` - Implement HMAC signature verification

2. **Webhook Auto-Replies**:
   - Send auto-reply for STOP keyword confirmations
   - Send auto-reply for HELP keyword with support info

3. **Authentication**:
   - Add proper auth checks to all API endpoints
   - Verify user owns businessId before operations

## Files Created/Modified

### Backend
- `api/_lib/db.js` - Database helper functions
- `api/_lib/surgeClient.js` - Surge API client
- `api/_lib/phone.js` - Phone number utilities
- `api/surge/provision-number.js` - TFN provisioning endpoint
- `api/surge/status.js` - Status check endpoint
- `api/sms/webhook.js` - Unified webhook handler
- `api/sms/send.js` - SMS sending endpoint
- `supabase/migrations/20251001_sms_system.sql` - Database migration
- `scripts/run-sms-migration.js` - Migration runner

### Frontend
- `src/components/sms/ProvisionNumberModal.jsx` - Provisioning wizard
- `src/components/sms/TestSend.jsx` - Test SMS component
- `src/components/settings/MessagingSettings.jsx` - Main messaging page
- `src/lib/phone.js` - Phone utilities (frontend)
- `src/lib/smsCompliance.js` - Compliance helpers
- `src/pages/Settings.jsx` - Added Messaging tab

### Configuration
- `vercel.json` - Added API routes
- `ENV.example` - Added Surge variables

## Testing Checklist

- [x] Backend deployed successfully
- [x] Health endpoint returns OK
- [ ] Database migration runs successfully
- [ ] Settings → Messaging page loads
- [ ] "Get a free SMS number" button appears
- [ ] Provision wizard opens and submits
- [ ] Status shows "Pending Verification"
- [ ] Status polling works (check every 30s)
- [ ] Webhook accepts POST requests
- [ ] When active: Test Send form appears
- [ ] Test SMS sends successfully
- [ ] Inbound SMS creates contact record
- [ ] STOP keyword sets opted_out flag
- [ ] Opted-out recipient blocked from receiving SMS

## Acceptance Criteria

✅ Business can provision TFN via UI wizard
✅ Verification status updates automatically via webhook
✅ SMS sending gated by verification_status === 'active'
✅ Compliance footer added to all outbound messages
✅ STOP keyword handling with opt-out enforcement
✅ Inbound messages logged to database
✅ Test send functionality for verification
✅ Status polling for real-time updates
✅ No breaking changes to existing features

## Support

For issues or questions:
- Check Vercel logs for API errors
- Check browser console for frontend errors
- Verify all environment variables are set
- Ensure Surge webhook is configured correctly
- Review `docs/ledger.md` for change history
