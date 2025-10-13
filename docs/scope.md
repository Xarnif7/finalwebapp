# Blipp MVP - Product Scope Charter

## Vision
Blipp is a multi-tenant review automation SaaS that helps service businesses collect reviews, manage customer feedback, and automate follow-up journeys via email and SMS.

## Target Users
- Service-based businesses (lawn care, HVAC, plumbing, home services)
- Small to medium teams (1-50 employees)
- Businesses using QuickBooks Online or Jobber CRM

## Core MVP Features

### 1. Customer Management
- ✅ CSV import
- ✅ CRM integration (QuickBooks Online, Jobber)
- ✅ Automatic customer sync from integrations
- ✅ Multi-source customer tracking (manual, quickbooks, jobber, csv)

### 2. Review Automation & Journeys
- ✅ Multi-step customer journey builder (drag-and-drop flow)
- ✅ Email + SMS messaging (Resend + Twilio/Surge)
- ✅ Per-step message templates (Thank You, Follow-up, Review Request, Rebooking, Retention, Upsell)
- ✅ Trigger-based automation (Invoice Paid, Job Completed, Manual enrollment)
- ✅ Wait/delay steps with quiet hours support
- ✅ AI-powered optimal send timing
- ✅ Journey execution engine (cron-based)

### 3. Review Collection & Management
- ✅ Review inbox (Google, Facebook, other platforms)
- ✅ Private feedback collection
- ✅ QR code generation for physical locations
- ✅ Public feedback forms with rating-based routing (4-5 stars → Google, 1-3 stars → website)
- ✅ AI-powered review replies (planned)

### 4. Integrations
- ✅ QuickBooks Online (OAuth, customer sync, webhook triggers, auto token refresh)
- ✅ Jobber CRM (OAuth, customer sync, job completion triggers)
- ✅ Stripe (subscription billing, customer portal)
- ✅ Resend (transactional email)
- ✅ Surge/Twilio (SMS with STOP/HELP handling)
- ✅ Google Sheets (data sync via Zapier)

### 5. Multi-Tenancy & Security
- ✅ Supabase authentication
- ✅ Row-level security (RLS) policies
- ✅ Email-based data persistence (survives subscription changes)
- ✅ Business isolation and tenant scoping
- ✅ Webhook signature verification (Stripe, QuickBooks, Jobber)

### 6. Billing & Subscriptions
- ✅ Stripe Customer Portal integration
- ✅ Multiple plan tiers (Basic, Standard, Pro, Enterprise)
- ✅ Subscription webhooks for status sync
- ✅ Payment method management
- ✅ Proration and plan changes

### 7. Dashboard & Analytics
- ✅ Main dashboard with KPIs
- ⏳ Analytics (Coming Soon placeholder)
- ✅ Settings management
- ✅ Team management capabilities

## Out of Scope for MVP v1
- Advanced analytics and reporting dashboards
- Multi-channel social media posting
- Advanced AI features beyond basic reply suggestions
- White-label/agency features
- Mobile apps (web-only for MVP)
- Conversation threading/inbox
- Advanced workflow branching/conditions

## Tech Stack
- **Frontend:** Vite + React + Tailwind CSS + shadcn/ui + lucide-react
- **Backend:** Node.js (Vercel serverless) + Supabase (Postgres + Auth + RLS)
- **Integrations:** Stripe, Resend, Twilio/Surge, OpenAI, QuickBooks, Jobber
- **Deployment:** Vercel (frontend + API), Supabase (database + auth)
- **Cron Jobs:** Vercel Cron for journey execution, token refresh, status polling

## Success Metrics for MVP Launch
1. Users can sign up, onboard, and create a business profile
2. Users can connect QuickBooks or Jobber and sync customers
3. Users can create and activate customer journeys
4. Journeys trigger automatically from CRM events
5. Email and SMS messages send successfully with proper tracking
6. Review requests route to Google Reviews for 4-5 stars
7. Private feedback collected for 1-3 star ratings
8. Billing works end-to-end with Stripe
9. Multi-tenant isolation verified (no cross-tenant data access)
10. Core user path works: sign-in → onboarding → connect CRM → create journey → journey triggers → messages send

## Known Limitations for v1
- Analytics tab is "Coming Soon"
- Only English language support
- US-based SMS sending only
- Limited to 2 CRM integrations (QBO + Jobber)
- Basic message templates (user can customize)
- No advanced segmentation or conditional logic

## Next Phase (Post-MVP)
- Full analytics dashboards with revenue attribution
- Additional CRM integrations (ServiceTitan, Housecall Pro)
- Advanced journey conditions and branching
- Multi-language support
- Webhook replay and retry system
- Advanced AI features (sentiment analysis, auto-categorization)
- Team collaboration features (assignments, notes, internal chat)

## Launch Readiness Checklist
- [ ] All environment variables documented in ENV.example
- [ ] Database migrations applied to production Supabase
- [ ] Stripe webhooks configured in production
- [ ] QuickBooks OAuth app approved and in production
- [ ] Jobber OAuth app credentials configured
- [ ] Resend domain verified and sending
- [ ] Twilio/Surge phone numbers provisioned
- [ ] Vercel cron jobs configured and running
- [ ] Core user flows tested end-to-end
- [ ] Security audit (RLS policies, auth checks, webhook verification)
- [ ] Error monitoring configured (logs, alerts)
- [ ] Backup and disaster recovery plan documented

