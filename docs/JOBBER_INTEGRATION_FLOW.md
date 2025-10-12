# Jobber Integration Flow - Complete End-to-End Documentation

## Overview
The Jobber integration allows Blipp users to:
1. Connect their Jobber account via OAuth
2. Automatically sync customers from Jobber to Blipp
3. Receive webhook events when jobs are completed
4. Automatically trigger review request journeys

## Database Schema

### Table: `integrations_jobber`
```sql
- id (UUID, primary key)
- business_id (UUID, foreign key to businesses table, unique)
- access_token (TEXT, encrypted OAuth token)
- refresh_token (TEXT, for token refresh)
- token_expires_at (TIMESTAMPTZ)
- account_id (TEXT, Jobber account ID)
- account_name (TEXT, displayed in UI)
- connection_status (TEXT: 'pending', 'connected', 'disconnected', 'error')
- error_message (TEXT)
- last_customer_sync_at (TIMESTAMPTZ)
- last_job_sync_at (TIMESTAMPTZ)
- last_webhook_at (TIMESTAMPTZ)
- webhook_id (TEXT, Jobber webhook ID)
- webhook_url (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- connected_at (TIMESTAMPTZ)
```

## OAuth Flow

### 1. User Clicks "Connect Jobber"
**File:** `src/components/crm/JobberConnectionCard.jsx`
- User clicks "Connect Jobber" button
- Calls `/api/crm/jobber/connect` API

### 2. Generate OAuth URL
**File:** `api/crm/jobber/connect.js`
- Receives `business_id` from request
- Generates Jobber OAuth URL with:
  - `client_id`: Jobber app client ID
  - `redirect_uri`: `https://myblipp.com/api/crm/jobber/callback`
  - `scope`: `read:all` (full read access)
  - `state`: `business_id` (used to identify which business is connecting)
- Returns OAuth URL to frontend

### 3. Open OAuth Popup/Redirect
**File:** `src/components/crm/JobberConnectionCard.jsx`
- Opens Jobber OAuth URL in popup window
- If popup blocked, fallbacks to redirect main window
- Listens for `postMessage` from callback

### 4. User Authorizes in Jobber
- User logs into Jobber
- Grants permissions to Blipp
- Jobber redirects to callback URL with authorization code

### 5. Exchange Code for Tokens
**File:** `api/crm/jobber/callback.js`
- Receives authorization `code` and `state` from Jobber
- Exchanges code for access_token and refresh_token
- Fetches Jobber account info (ID and name) via GraphQL
- Saves to `integrations_jobber` table with:
  - `business_id` from state
  - `access_token` and `refresh_token`
  - `account_id` and `account_name`
  - `connection_status`: 'connected'
  - `connected_at`: current timestamp

### 6. Setup Webhook
**File:** `api/crm/jobber/callback.js` - `setupJobberWebhook()`
- Creates webhook in Jobber to listen for:
  - `job:complete` - When job is marked complete
  - `job:close` - When job is closed
- Webhook URL: `https://myblipp.com/api/crm/jobber/webhook`
- Saves webhook_id to database

### 7. Initial Customer Sync
**File:** `api/crm/jobber/callback.js`
- Triggers `/api/crm/jobber/sync-customers` API
- Imports all Jobber customers into Blipp

### 8. Close Popup & Update UI
**File:** `api/crm/jobber/callback.js`
- Returns HTML page with JavaScript
- Sends `postMessage` to parent window: `{ type: 'JOBBER_CONNECTED', accountName: '...' }`
- Closes popup window
- UI receives message and updates connection status

## Token Refresh Flow

### Automatic Token Refresh
**File:** `api/crm/jobber/status.js`, `api/crm/jobber/sync-customers.js`
- Tokens expire after ~1 hour
- Before making API calls, check if token is expired
- If expired and `refresh_token` exists:
  1. Call Jobber token endpoint with `grant_type: refresh_token`
  2. Get new `access_token` and `refresh_token`
  3. Update `integrations_jobber` table with new tokens
  4. Update `token_expires_at`
- This prevents disconnection after 3-4 hours

## Customer Sync Flow

### Manual Sync (User Clicks "Sync Customers")
**File:** `src/components/crm/JobberConnectionCard.jsx` → `/api/crm/jobber/sync-customers`

1. **Get Jobber Integration**
   - Query `integrations_jobber` for business_id
   - Check connection_status = 'connected'

2. **Refresh Token if Needed**
   - Check if token expires within 1 hour
   - Auto-refresh if needed

3. **Fetch Customers from Jobber**
   - GraphQL query to get clients (first 100)
   - Fields: id, name, emails, phones, property address

4. **Sync to Database**
   - For each customer:
     - Extract primary email and phone
     - Build full address string
     - Upsert to `customers` table with:
       - `business_id`
       - `external_id`: Jobber customer ID
       - `source`: 'jobber'
       - `full_name`, `email`, `phone`, `address`
       - `status`: 'active'
       - `last_synced_at`: current timestamp
   - Use `onConflict: 'business_id,email'` to avoid duplicates

5. **Update Last Sync Time**
   - Update `integrations_jobber.last_customer_sync_at`

6. **Return Results**
   - `synced`: count of customers synced
   - `errors`: count of errors
   - `total`: total customers from Jobber

### Automatic Sync (Webhook-triggered)
**File:** `api/crm/jobber/webhook.js`
- When Jobber sends webhook for job completion:
  1. Verify webhook signature
  2. Extract customer info from job
  3. Sync that specific customer to database
  4. Trigger review request journey if applicable

## Status Check Flow

### Check Connection Status
**File:** `/api/crm/jobber/status`
- Query `integrations_jobber` by `business_id`
- If not found: return `{ connected: false }`
- If found:
  - Check if token is expired
  - If expired, auto-refresh token
  - Return connection data:
    ```json
    {
      "connected": true,
      "connectionStatus": "connected",
      "account_name": "Company Name",
      "last_sync": "2025-10-12T03:27:49.112Z",
      "token_expires_at": "2025-10-12T04:27:49.112Z",
      "connection": {
        "account_name": "Company Name",
        "last_sync": "2025-10-12T03:27:49.112Z",
        "connected_at": "2025-10-12T03:27:49.112Z"
      }
    }
    ```

## UI Update Flow

### Connection Card States
**File:** `src/components/crm/JobberConnectionCard.jsx`

**Disconnected State:**
- Shows "Connect Jobber" button
- No connection info displayed

**Connected State:**
- Shows account name as card title
- Green banner: "Connected to Jobber"
- Stats grid:
  - Customer count (from `/api/customers/count?source=jobber`)
  - Last sync date
- Buttons:
  - "Sync Customers" - triggers manual sync
  - "Disconnect" - removes integration
- Webhook status indicator

### Immediate Update After OAuth
1. OAuth popup sends `postMessage` with `JOBBER_CONNECTED`
2. UI receives message
3. Calls `checkConnectionStatus()` to get latest data
4. Fetches customer count
5. Updates UI with real connection info
6. No fake data - all info comes from database

## Webhook Flow

### Receive Job Completion Event
**File:** `api/crm/jobber/webhook.js`

1. **Verify Webhook**
   - Check webhook signature (if Jobber provides one)
   - Validate payload structure

2. **Extract Job Data**
   - Job ID, customer ID, completion date
   - Customer name, email, phone

3. **Sync Customer**
   - Ensure customer exists in database
   - Update if exists, create if new

4. **Trigger Review Request Journey**
   - Check if business has active automation
   - Trigger journey for this customer
   - Send review request via SMS/email

5. **Update Last Webhook Time**
   - Update `integrations_jobber.last_webhook_at`

## Error Handling

### Token Expired
- Auto-refresh using refresh_token
- If refresh fails: mark as 'error', show reconnect button

### Webhook Failure
- Don't fail connection if webhook setup fails
- Log error but continue with connection

### Sync Failure
- Log individual customer errors
- Return count of successes and failures
- Don't fail entire sync if one customer fails

### API Failures
- Retry with exponential backoff
- Show user-friendly error messages
- Maintain connection status in database

## Security

### Token Storage
- Access tokens stored encrypted in database
- Refresh tokens stored encrypted
- Tokens never exposed to frontend

### Webhook Verification
- Verify webhook signatures
- Check webhook origin
- Validate payload structure

### Business Isolation
- All queries filtered by business_id
- RLS policies enforce tenant isolation
- No cross-business data access

## Testing Checklist

### ✅ OAuth Flow
- [ ] User can click "Connect Jobber"
- [ ] OAuth popup opens to Jobber
- [ ] User can authorize in Jobber
- [ ] Callback receives code and exchanges for tokens
- [ ] Account name is fetched from Jobber
- [ ] Data is saved to database
- [ ] Popup closes automatically
- [ ] UI updates immediately
- [ ] Connection shows real account name

### ✅ Customer Sync
- [ ] Manual sync imports customers from Jobber
- [ ] Customers appear in customers table
- [ ] Customer count updates in UI
- [ ] Duplicate customers are handled properly
- [ ] Last sync time updates

### ✅ Token Refresh
- [ ] Tokens auto-refresh before expiry
- [ ] Connection stays active after 3+ hours
- [ ] Refresh happens transparently
- [ ] No user action required

### ✅ Webhooks
- [ ] Webhook is created in Jobber
- [ ] Webhook receives job completion events
- [ ] Customer is synced from webhook
- [ ] Review journey is triggered

### ✅ UI Display
- [ ] Disconnected state shows "Connect" button
- [ ] Connected state shows account name
- [ ] Customer count is accurate
- [ ] Last sync date is correct
- [ ] All data is real (no fake data)
- [ ] "Sync Customers" button works
- [ ] "Disconnect" button works

## Troubleshooting

### Connection not saving
- Check if `business_id` is valid UUID
- Check if `integrations_jobber` table exists
- Check database RLS policies

### Tokens expiring too quickly
- Check if token_expires_at is calculated correctly
- Verify refresh_token is being saved
- Check if refresh logic is working

### Webhook not receiving events
- Check if webhook URL is publicly accessible
- Verify webhook is created in Jobber account
- Check webhook signature verification

### Customers not syncing
- Check if Jobber API credentials are correct
- Verify access_token has correct scopes (`read:all`)
- Check if customers table has correct schema
- Verify business_id matches

