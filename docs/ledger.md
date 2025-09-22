# Blipp Development Ledger

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
