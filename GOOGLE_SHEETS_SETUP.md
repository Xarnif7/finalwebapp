# Google Sheets Integration Setup

## Environment Variables for Vercel

Add these environment variables to your Vercel project dashboard under Settings → Environment Variables:

### Required Variables

```bash
# Google Sheets OAuth Integration (separate from main Google OAuth)
GOOGLE_SHEETS_CLIENT_ID=your_google_sheets_client_id_here
GOOGLE_SHEETS_CLIENT_SECRET=your_google_sheets_client_secret_here
GOOGLE_SHEETS_REDIRECT_URI=https://myblipp.com/api/google/sheets/callback
```

## Google Cloud Console Setup

### 1. Create a New OAuth 2.0 Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Choose **Web application**
6. Set the name: `Blipp Google Sheets Integration`

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace)
3. Fill in the required fields:
   - App name: `Blipp`
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/spreadsheets.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`

### 3. Configure OAuth Client

1. In **OAuth client ID** settings:
   - **Authorized JavaScript origins**: 
     - `https://myblipp.com`
     - `http://localhost:5173` (for development)
   - **Authorized redirect URIs**:
     - `https://myblipp.com/api/google/sheets/callback`
     - `http://localhost:5173/api/google/sheets/callback` (for development)

### 4. Enable Required APIs

1. Go to **APIs & Services** → **Library**
2. Enable these APIs:
   - **Google Sheets API**
   - **Google Drive API**

### 5. Get Your Credentials

1. Copy the **Client ID** and **Client Secret** from your OAuth client
2. Add them to Vercel environment variables:
   - `GOOGLE_SHEETS_CLIENT_ID` = your client ID
   - `GOOGLE_SHEETS_CLIENT_SECRET` = your client secret
   - `GOOGLE_SHEETS_REDIRECT_URI` = `https://myblipp.com/api/google/sheets/callback`

## Testing

After setting up the environment variables:

1. Deploy your application to Vercel
2. Go to the Customers tab
3. Click "Google Sheets" button
4. Test the OAuth flow
5. Try importing customers from a Google Sheet

## Security Notes

- These credentials are separate from your main Google OAuth credentials
- The Google Sheets integration only requests read-only access
- All operations are scoped to the user's business (RLS enforced)
- Tokens are encrypted and stored securely in the database

## Troubleshooting

### Common Issues

1. **"Invalid client" error**: Check that your Client ID is correct
2. **"Redirect URI mismatch"**: Ensure the redirect URI matches exactly
3. **"Access denied"**: Check that the required APIs are enabled
4. **"Scope not authorized"**: Verify the OAuth consent screen has the required scopes

### Debug Steps

1. Check Vercel environment variables are set correctly
2. Verify the redirect URI matches your OAuth client configuration
3. Ensure the Google Sheets and Drive APIs are enabled
4. Check the OAuth consent screen is properly configured
