# Blipp Data Model & Database Schema

## Overview
Blipp uses Supabase Postgres with Row-Level Security (RLS) for multi-tenant data isolation. All tables enforce business-level or user-level access via RLS policies.

## Entity Relationship Diagram (ERD)

```
┌──────────────┐
│   profiles   │  (Supabase auth.users extended)
│──────────────│
│ id (uuid)    │
│ email        │
│ business_id  │──┐
│ role         │  │
└──────────────┘  │
                  │
                  ▼
┌─────────────────────┐
│     businesses      │
│─────────────────────│
│ id (uuid) PK        │◄───────────┐
│ name                │            │
│ created_by (email)  │            │
│ google_review_url   │            │
│ google_place_id     │            │
│ stripe_customer_id  │            │
│ subscription_status │            │
└─────────────────────┘            │
         │                         │
         │ business_id             │
         ▼                         │
┌─────────────────────┐            │
│     customers       │            │
│─────────────────────│            │
│ id (uuid) PK        │            │
│ business_id (fk)    │────────────┘
│ name                │
│ email               │
│ phone               │
│ source              │  (manual, quickbooks, jobber, csv)
│ external_id         │
│ created_at          │
└─────────────────────┘
         │
         │
         ▼
┌──────────────────────────┐
│  customer_enrollments    │
│──────────────────────────│
│ id (uuid) PK             │
│ sequence_id (fk)         │──────┐
│ customer_id (fk)         │      │
│ current_step             │      │
│ status                   │      │
│ enrolled_at              │      │
└──────────────────────────┘      │
                                  │
                                  │
         ┌────────────────────────┘
         │
         ▼
┌──────────────────────┐
│      sequences       │
│──────────────────────│
│ id (uuid) PK         │
│ business_id (fk)     │
│ name                 │
│ trigger_source       │  (quickbooks, jobber, manual)
│ trigger_event_type   │  (invoice_paid, job_completed, etc.)
│ status               │  (active, paused, draft)
│ flow_definition      │  (JSON - step configurations)
│ created_at           │
└──────────────────────┘
         │
         │ sequence_id
         ▼
┌──────────────────────┐
│   sequence_steps     │
│──────────────────────│
│ id (uuid) PK         │
│ sequence_id (fk)     │
│ step_order           │
│ step_type            │  (email, sms, wait, trigger)
│ delay_minutes        │
│ message_purpose      │  (thank_you, follow_up, review, etc.)
│ message_config       │  (JSON - subject, body, variables)
│ created_at           │
└──────────────────────┘
```

## Core Tables

### profiles
Extended user profile linked to Supabase auth.users.
- **Purpose:** Store user metadata and business association
- **RLS:** User can only see/update their own profile
- **Key Fields:**
  - `id`: Matches auth.users.id (UUID)
  - `business_id`: Links user to their business
  - `email`: User email (from auth.users)
  - `role`: User role (owner, admin, member)

### businesses
Multi-tenant business accounts.
- **Purpose:** Top-level tenant entity for data isolation
- **RLS:** User can only access businesses they own (via created_by email match)
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `name`: Business name
  - `created_by`: Email address of owner (TEXT, not UUID for persistence)
  - `google_review_url`: Direct Google Review link
  - `google_place_id`: Google Places API ID
  - `stripe_customer_id`: Stripe customer reference
  - `subscription_status`: active, canceled, incomplete, etc.
  - `website_url`: Business website
  - `phone`: Business phone number

### customers
Customer database with multi-source support.
- **Purpose:** Unified customer records from all sources
- **RLS:** Filtered by business_id matching user's business
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `business_id`: Links to businesses table
  - `name`: Customer full name
  - `email`: Customer email (unique per business)
  - `phone`: Customer phone number
  - `source`: Origin of customer (manual, quickbooks, jobber, csv)
  - `external_id`: ID from external system (QBO customer ID, Jobber client ID)
  - `address`: Full address string
  - `opted_out`: SMS opt-out status (boolean)
  - `tags`: JSONB array of tags

### sequences
Journey/automation definitions.
- **Purpose:** Define multi-step customer journeys
- **RLS:** Filtered by business_id
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `business_id`: Links to businesses table
  - `name`: Journey name
  - `trigger_source`: crm system (quickbooks, jobber, manual)
  - `trigger_event_type`: event name (invoice_paid, job_completed)
  - `status`: active, paused, draft
  - `flow_definition`: JSONB with complete flow graph
  - `settings`: JSONB with journey settings (quiet hours, stop conditions)

### sequence_steps
Individual steps within a journey.
- **Purpose:** Store per-step configuration and message content
- **RLS:** Filtered by sequence_id's business_id
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `sequence_id`: Links to sequences table
  - `step_order`: Position in sequence (integer)
  - `step_type`: email, sms, wait, trigger
  - `delay_minutes`: Time to wait before executing
  - `message_purpose`: thank_you, follow_up, review, rebooking, retention, upsell
  - `message_config`: JSONB with subject, body, variables
  - `channel`: email or sms

### customer_enrollments
Tracks customers enrolled in journeys.
- **Purpose:** Journey execution state management
- **RLS:** Filtered by sequence_id's business_id
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `sequence_id`: Links to sequences table
  - `customer_id`: Links to customers table
  - `current_step`: Current step_order being executed
  - `status`: active, completed, stopped, failed
  - `enrolled_at`: Enrollment timestamp
  - `next_step_at`: When next step should execute
  - `metadata`: JSONB with execution context

## Integration Tables

### integrations_quickbooks
QuickBooks Online connection state.
- **Purpose:** Store OAuth tokens and sync state for QBO
- **RLS:** Filtered by business_id
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `business_id`: Links to businesses table
  - `access_token`: Encrypted OAuth access token
  - `refresh_token`: Encrypted OAuth refresh token
  - `token_expires_at`: Token expiry timestamp
  - `realm_id`: QuickBooks company ID
  - `company_name`: QBO company name
  - `last_customer_sync_at`: Last sync timestamp
  - `connection_status`: connected, token_expired, disconnected

### integrations_jobber
Jobber CRM connection state.
- **Purpose:** Store OAuth tokens and sync state for Jobber
- **RLS:** Filtered by business_id
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `business_id`: Links to businesses table
  - `access_token`: Encrypted OAuth access token
  - `refresh_token`: Encrypted OAuth refresh token
  - `token_expires_at`: Token expiry timestamp
  - `account_id`: Jobber account ID
  - `account_name`: Jobber account name
  - `last_customer_sync_at`: Last sync timestamp
  - `webhook_url`: Registered webhook endpoint

## Feedback & Review Tables

### private_feedback
Internal feedback collection (1-3 star ratings).
- **Purpose:** Collect negative feedback privately without public review
- **RLS:** Filtered by business_id
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `business_id`: Links to businesses table
  - `customer_email`: Feedback submitter email
  - `customer_name`: Feedback submitter name
  - `rating`: Star rating (1-5)
  - `feedback`: Text feedback
  - `source`: Origin (email, qr, sms)
  - `created_at`: Submission timestamp

### qr_codes
QR code management for physical locations.
- **Purpose:** Generate trackable QR codes for in-person feedback
- **RLS:** Filtered by business_id
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `business_id`: Links to businesses table
  - `code`: Unique short code
  - `tech_id`: Associated technician (optional)
  - `label`: QR code label/name
  - `scan_count`: Total scans
  - `created_at`: Creation timestamp

### techs
Technician/team member management.
- **Purpose:** Associate QR codes and feedback with team members
- **RLS:** Filtered by business_id
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `business_id`: Links to businesses table
  - `name`: Technician name
  - `email`: Technician email
  - `active`: Active status (boolean)

## Message Tracking Tables

### review_requests
Tracks sent review requests.
- **Purpose:** Log and monitor review request deliveries
- **RLS:** Filtered by business_id
- **Key Fields:**
  - `id`: Primary key (UUID)
  - `business_id`: Links to businesses table
  - `customer_id`: Links to customers table
  - `template_id`: Template used (optional)
  - `status`: scheduled, sent, delivered, failed, clicked
  - `channel`: email or sms
  - `sent_at`: Send timestamp
  - `metadata`: JSONB with delivery details

## Data Relationships

### One-to-Many Relationships
- `businesses` → `customers` (1:N)
- `businesses` → `sequences` (1:N)
- `businesses` → `private_feedback` (1:N)
- `businesses` → `qr_codes` (1:N)
- `businesses` → `integrations_quickbooks` (1:1)
- `businesses` → `integrations_jobber` (1:1)
- `sequences` → `sequence_steps` (1:N)
- `sequences` → `customer_enrollments` (1:N)

### Multi-Tenant Isolation
All data access is scoped by `business_id`. RLS policies enforce:
```sql
-- Example RLS policy pattern
CREATE POLICY "Users can only access their business data"
  ON customers
  FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE created_by = (auth.jwt() ->> 'email')
    )
  );
```

## Indexes
Key indexes for performance:
- `customers(business_id, email)` - Customer lookups
- `customer_enrollments(sequence_id, status, next_step_at)` - Journey execution
- `sequences(business_id, trigger_event_type, status)` - Trigger matching
- `integrations_quickbooks(business_id)` - CRM lookups
- `integrations_jobber(business_id)` - CRM lookups

## Migration Strategy
- All schema changes are versioned migrations in `supabase/migrations/`
- Migrations are idempotent and safe to run multiple times
- Use `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` patterns
- No destructive changes without explicit backup and rollback plan
- All migrations include RLS policies and helper functions

## Data Retention
- Customer enrollments: Keep completed for 90 days, then archive
- Review requests: Keep indefinitely for analytics
- Private feedback: Keep indefinitely
- OAuth tokens: Rotate every 1 hour (QBO), refresh before expiry
- Session logs: Keep for 30 days

## Backup & Recovery
- Supabase daily automated backups
- Point-in-time recovery available
- Critical tables: businesses, customers, sequences, customer_enrollments
- Export strategy: Supabase admin API for full data export

