# Blipp Development Ledger

## 2025-01-29: Stripe Customer Portal Integration

### What Changed
- **STRIPE CUSTOMER PORTAL INTEGRATION**: Implemented full Stripe Customer Portal integration for subscription management
- Created `/api/billing/portal` endpoint that creates Stripe Customer Portal sessions
- Added `/api/stripe/webhook` endpoint for subscription sync with proper signature verification
- Updated Settings.jsx to use Customer Portal instead of custom plan change modal
- Added proper error handling and loading states for portal access
- Implemented fallback for users without Stripe customer IDs
- Added environment variables for Stripe webhook secret and price IDs
- Removed unused plan change modal and related code

### Why This Was Needed
- User requested Stripe Customer Portal integration for better subscription management
- Portal provides professional billing interface with proration, plan changes, and payment method management
- Webhook ensures database stays in sync with Stripe subscription changes
- Reduces maintenance burden by using Stripe's built-in billing interface
- Provides better UX for subscription management compared to custom modal

### Files Touched
- `server.js` - Added `/api/billing/portal` and `/api/stripe/webhook` endpoints
- `src/pages/Settings.jsx` - Updated to use Customer Portal, removed plan modal
- `ENV.example` - Added Stripe webhook secret and price ID environment variables

### How Verified
- `/api/billing/portal` endpoint properly authenticates users and looks up stripe_customer_id
- Webhook endpoint verifies Stripe signatures and updates subscription data
- Settings page now opens Stripe Customer Portal instead of custom modal
- Proper error handling for users without Stripe customer IDs
- Loading states and toast notifications for better UX
- All existing billing functionality preserved (cancel/resume, payment methods)

## 2025-01-29: Feedback UI Improvements - Gradient Icons and Button Styling

### What Changed
- **FEEDBACK FORM UI ENHANCEMENTS**: Updated all feedback screens with consistent gradient styling
- Applied cool gradient MessageSquare icon to main feedback form (already had it)
- Added gradient styling to submit feedback button (already had it)
- Removed empty green box from 1-3 star thank you screen
- Added gradient close button to 1-3 star thank you screen
- Updated 4-5 star screen to remove green box and keep "Maybe Later" button functionality
- Applied gradient styling to QR code feedback buttons for consistency
- Updated ReviewLanding.jsx button to use gradient styling

### Why This Was Needed
- User requested consistent gradient icon styling across all feedback screens
- Empty green boxes looked bad and served no purpose
- Buttons needed consistent gradient styling for better visual appeal
- "Maybe Later" button should close window as expected
- Close button on 1-3 star screen needed gradient and should just say "Close"

### Files Touched
- `src/pages/FeedbackCollection.jsx` - Updated 1-3 star and 4-5 star thank you screens
- `src/pages/QRRedirect.jsx` - Applied gradient to Google Review button
- `src/pages/ReviewLanding.jsx` - Applied gradient to Leave Review button

### How Verified
- Main feedback form already had gradient icon and submit button
- 1-3 star screen now has gradient close button without external link icon
- 4-5 star screen has clean layout without empty green box
- QR feedback buttons have consistent gradient styling
- All buttons maintain proper functionality while looking more polished

## 2025-01-29: QR Builder Complete Implementation

### What Changed
- **COMPLETE QR BUILDER SYSTEM**: Implemented full QR code generation and customer feedback flow
- Created QR Builder tab in Feedback section (moved from Settings)
- Added database migration for `qr_codes` and `techs` tables with RLS policies
- Implemented QR redirect endpoint (`/api/r/[code]`) with scan tracking
- Created public feedback form (`/feedback-form/:businessId`) with same UX as existing forms
- Added public review flow: 4-5 stars → Google Reviews redirect, 1-3 stars → website redirect
- Fixed Select component error in QR Builder (empty string value issue)
- Integrated QR feedback with existing private feedback system

### Why This Was Needed
- User needed QR codes for physical business locations to collect customer feedback
- QR codes should redirect to branded feedback forms, not generic review pages
- Feedback flow should match existing email-based feedback system exactly
- System needed to track QR code scans and manage technician attribution
- QR feedback should integrate with existing Collected Feedback tab

### Files Touched
- `src/components/feedback/QrBuilder.jsx` - Fixed Select component error, improved UX
- `src/pages/FeedbackForm.jsx` - Created public feedback form with same template system
- `src/pages/Feedback.jsx` - Added QR Builder tab to feedback section
- `src/pages/Settings.jsx` - Removed QR Builder and Integrations tabs
- `api/r/[code].js` - Created QR redirect endpoint with scan tracking
- `api/qr/download/[code].js` - QR code download endpoint
- `api/qr/png/[code].js` - QR code PNG serving endpoint
- `api/techs.js` - Technician management endpoint
- `vercel.json` - Added routing for new endpoints
- `supabase/migrations/20250129_qr_code_setup.sql` - Database schema and functions
- `package.json` - Added qrcode library dependency

### How Verified
- QR Builder tab loads without Select component errors
- QR code generation works and creates unique codes
- QR redirect endpoint properly tracks scans and redirects to feedback form
- Feedback form uses same API and UX as existing feedback system
- Public review flow works: 4-5 stars → Google Reviews, 1-3 stars → website
- Feedback submissions appear in Collected Feedback tab
- Database migration applied successfully with RLS policies

## 2025-01-29: QuickBooks Online Integration End-to-End Implementation

### What Changed
- **COMPLETE QBO INTEGRATION**: Implemented full end-to-end QuickBooks Online automation flow
- Fixed `review_requests` table schema alignment (changed `email_status` to `status`)
- Updated template selection logic to use `automation_templates` table with `config_json` triggers
- Added HMAC webhook signature verification for QBO webhooks
- Created comprehensive test endpoints and automation scripts for validation
- Implemented AI-assisted template matching based on invoice descriptions and keywords

### Why This Was Needed
- User needed QBO invoice events to automatically trigger review request automations
- Templates in the Automations tab needed to be respected and used for trigger logic
- System needed to match invoice descriptions to appropriate templates (e.g., "grass mowed" → "Grass Cutting" template)
- End-to-end verification was required to ensure the complete flow works

### Files Touched
- `server.js` - Updated QBO webhook handling, template selection, and review request creation
- `scripts/simulate-qbo.js` - Test script for QBO invoice simulation
- `scripts/seed-and-simulate-qbo.js` - Complete test script with data seeding
- `scripts/inspect-review-requests.js` - Database schema inspection tool
- `ENV.example` - Added `QBO_WEBHOOK_VERIFIER_TOKEN` documentation

### How Verified
- ✅ **Seeding**: Created test business, QBO integration, customer, and default template
- ✅ **Simulation**: Successfully processed "grass mowed" invoice description
- ✅ **Template Matching**: Found and used "Grass Cutting Review Request" template
- ✅ **Review Request Creation**: New entry created in `review_requests` table
- ✅ **Email Scheduling**: Scheduled job queued for automated email sending
- ✅ **End-to-End Flow**: QBO webhook → Template selection → Review request → Email queue

### Technical Details
- Template selection uses `automation_templates` table with `config_json.triggers` and `config_json.keywords`
- AI (GPT-4o-mini) assists in matching invoice descriptions to template keywords
- HMAC signature verification ensures webhook security
- Schema alignment fixed: `review_requests.status` instead of `review_requests.email_status`
- Test endpoints: `/api/qbo/test-seed`, `/api/qbo/test-simulate-invoice`, `/api/qbo/test-review-requests`

## 2025-01-21: Email-Based Data Persistence Implementation

### What Changed
- **CRITICAL FIX**: Implemented email-based data persistence to prevent customer data loss during subscription changes
- Changed `businesses.created_by` and `customers.created_by` from UUID to TEXT to store email addresses
- Updated all RLS policies to use email-based ownership instead of UUID-based
- Created helper functions for business lookup and creation by email
- Fixed foreign key constraints that were blocking the migration

### Why This Was Needed
- Customer data was being lost when subscriptions expired and were renewed
- UUID-based ownership was fragile and didn't persist across subscription changes
- Email-based ownership ensures data is always tied to the user's email address
- Multi-tenant system now works reliably for all business owners

### Files Touched
- `supabase/migrations/20250121_fix_email_based_data_persistence.sql` - Main migration
- `server.js` - Updated business detection logic to use email-based lookup
- `src/hooks/useCustomersData.js` - Added email-based fallback for business detection

### How Verified
- All 4 profiles now properly linked to their businesses
- Email addresses correctly stored as `created_by` values
- RLS policies updated to use `auth.jwt() ->> 'email'` for access control
- Foreign key constraints properly handled during migration

### Database State After Migration
- 4 profiles with proper business links
- All businesses owned by correct email addresses
- Customer data now persists across subscription changes
- Multi-tenant Zapier integration ready for all users

### Next Steps
- Test complete automation flow with email-based persistence
- Verify customer data survives subscription expiration/renewal
- Test multi-tenant functionality with different business owners

## 2025-01-21: Complete Email Automation System Implementation

### What Changed
- **COMPLETE AUTOMATION SYSTEM**: Implemented full email automation flow with premade templates and sequence creation
- Fixed RLS policies to use email-based authentication for automation_templates and business_integrations
- Created automation_executions table to track automation runs with proper scheduling
- Implemented trigger_automation() and execute_scheduled_automations() database functions
- Built automation trigger API endpoint (/api/automation/trigger) for manual automation triggering
- Created automation executor cron job (/api/_cron/automation-executor) for scheduled execution
- Updated Sequences page with real data integration and sequence creation functionality
- Enhanced AutomatedRequests page to display premade templates with toggle controls
- Added template management API endpoints (/api/templates/[businessId] and /api/templates/[businessId]/[templateId])

### Why This Was Needed
- Premade automation templates were not connected to actual email sending
- Sequence creation modal was empty and non-functional
- No way to trigger automations based on customer events
- Missing automation execution system with proper timing and scheduling
- UI showed mock data instead of real automation templates

### Files Touched
- `supabase/migrations/20250121_fix_automation_rls_and_system.sql` - Complete automation system migration
- `api/automation/trigger.js` - Automation trigger endpoint
- `api/_cron/automation-executor.js` - Automation execution cron job
- `api/templates/[businessId].js` - Template management API
- `api/templates/[businessId]/[templateId].js` - Individual template operations
- `src/pages/Sequences.jsx` - Real sequence management with creation functionality
- `src/pages/AutomatedRequests.jsx` - Connected to real templates with toggle controls
- `test-automation-api.js` - API endpoint testing script

### How Verified
- All API endpoints respond correctly (tested with test-automation-api.js)
- Database migration creates all required tables and functions
- RLS policies updated to use email-based authentication
- UI components connect to real data instead of mock data
- Sequence creation modal is fully functional
- Premade templates can be toggled on/off and tested
- Automation system ready for end-to-end testing

### Database State After Migration
- automation_templates table with email-based RLS policies
- automation_executions table for tracking automation runs
- trigger_automation() function for manual automation triggering
- execute_scheduled_automations() function for cron execution
- All automation tables properly indexed and secured
- Default automation templates created for existing businesses

### Next Steps
- Run database migration in production
- Test complete automation flow with real customer data
- Set up cron job to run automation-executor every 15 minutes
- Verify email delivery through the automation system

## 2025-01-21: Fix Business Creation RLS Policy Violation

### What Changed
- **CRITICAL FIX**: Fixed business creation logic to use email-based ownership
- Updated `Onboarding.jsx` to use `user.email` for `created_by` field instead of `user.id`
- Updated `tenancy.ts` business creation to include `created_by: user.email`
- Resolved RLS policy violation that was preventing new business creation

### Why This Was Needed
- New users were getting "Business Access Error" when trying to access the dashboard
- Business creation was failing due to RLS policy requiring `created_by` field
- The tenancy logic was trying to create businesses without proper ownership
- Email-based ownership ensures consistent data persistence

### Files Touched
- `src/pages/Onboarding.jsx` - Fixed business creation to use email
- `src/lib/tenancy.ts` - Fixed automatic business creation for new users

### How Verified
- Deployed fixes to production
- New users should now be able to create businesses successfully
- Email-based ownership maintains data consistency across subscription changes
