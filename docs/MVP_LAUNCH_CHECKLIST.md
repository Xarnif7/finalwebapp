# Blipp MVP Launch Checklist

## Pre-Launch Verification (Complete This First)

### ✅ Core Documentation
- [x] scope.md created with MVP features defined
- [x] data-model.md created with complete ERD and schema
- [x] ledger.md tracking all changes
- [x] ENV.example with all required variables
- [x] Build succeeds without compilation errors

### 🔧 Environment Configuration

#### Supabase (Database & Auth)
- [ ] Production Supabase project created
- [ ] All migrations applied from `supabase/migrations/` folder
- [ ] RLS policies enabled and tested
- [ ] Service role key secured (server-side only)
- [ ] Anon key configured for client
- [ ] Email templates configured in Supabase Auth
- [ ] OAuth providers configured (Google, if needed)
- [ ] Daily backups enabled

#### Stripe (Billing)
- [ ] Production Stripe account connected
- [ ] Products created (Basic, Standard, Pro, Enterprise)
- [ ] Price IDs added to env vars
- [ ] Webhook endpoint configured: `https://app.myblipp.com/api/stripe/webhook`
- [ ] Webhook secret added to env vars
- [ ] Customer Portal configuration completed
- [ ] Test subscription flow end-to-end
- [ ] Payment method update works
- [ ] Plan changes work with proration

#### QuickBooks Online Integration
- [ ] QBO Production app created at developer.intuit.com
- [ ] OAuth credentials (client ID + secret) configured
- [ ] Redirect URI whitelisted: `https://app.myblipp.com/api/qbo/oauth/callback`
- [ ] Scopes configured: `com.intuit.quickbooks.accounting`
- [ ] Webhook endpoint configured: `https://app.myblipp.com/api/qbo/webhook`
- [ ] Webhook verifier token configured
- [ ] Test OAuth connection flow
- [ ] Test customer sync
- [ ] Test invoice.paid trigger automation
- [ ] Token auto-refresh verified (hourly cron)

#### Jobber CRM Integration
- [ ] Jobber OAuth app created
- [ ] OAuth credentials configured
- [ ] Redirect URI whitelisted: `https://app.myblipp.com/api/crm/jobber/callback`
- [ ] Webhook endpoint registered (if available)
- [ ] Test OAuth connection flow
- [ ] Test customer sync
- [ ] Test job_completed trigger automation
- [ ] Token auto-refresh verified

#### Resend (Email Service)
- [ ] Production Resend account created
- [ ] API key configured
- [ ] Domain verified (app.myblipp.com or myblipp.com)
- [ ] SPF/DKIM records added to DNS
- [ ] DMARC policy configured
- [ ] Test email delivery
- [ ] Check spam score
- [ ] Email templates verified

#### Twilio/Surge (SMS Service)
- [ ] Production SMS account created
- [ ] API credentials configured
- [ ] Phone number(s) provisioned
- [ ] A2P registration completed (if required)
- [ ] Webhook configured for inbound SMS: `https://app.myblipp.com/api/sms/webhook`
- [ ] STOP/HELP auto-replies tested
- [ ] Test SMS delivery
- [ ] Opt-out mechanism working
- [ ] Compliance verified (TCPA, CTIA)

#### OpenAI (AI Features)
- [ ] Production API key configured
- [ ] Usage limits set
- [ ] Billing configured
- [ ] Test AI reply generation
- [ ] Test template matching logic

#### Google Places API (Optional)
- [ ] API key configured
- [ ] Billing enabled
- [ ] Test business search functionality

### 🚀 Vercel Deployment

#### Frontend Build
- [ ] Vercel project created
- [ ] GitHub repo connected
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variables configured (all VITE_* vars)
- [ ] Custom domain configured: app.myblipp.com
- [ ] SSL certificate active
- [ ] Deploy preview working

#### Serverless API
- [ ] API routes configured in vercel.json
- [ ] All environment variables set (server-side: STRIPE_SECRET_KEY, RESEND_API_KEY, etc.)
- [ ] Test all API endpoints
- [ ] Error logging configured
- [ ] Request/response logging working

#### Cron Jobs
- [ ] Vercel Cron configured in vercel.json
- [ ] Journey executor cron: `0 * * * *` (hourly) → `/api/_cron/journey-executor`
- [ ] Token refresh cron: `0 * * * *` (hourly) → `/api/cron/refresh-qbo-tokens`
- [ ] CRON_SECRET configured and verified
- [ ] Test cron execution manually
- [ ] Monitor cron logs

### 🔒 Security Audit

#### Authentication & Authorization
- [ ] All routes protected with auth guards
- [ ] RLS policies tested (no cross-tenant access)
- [ ] Email-based data persistence working
- [ ] Session expiry configured
- [ ] Logout functionality working
- [ ] Password reset flow working

#### Webhook Security
- [ ] Stripe webhook signature verification enabled
- [ ] QuickBooks webhook HMAC verification enabled
- [ ] Jobber webhook signature verification enabled (if available)
- [ ] SMS webhook security configured

#### Data Protection
- [ ] No secrets in client-side code
- [ ] All env vars properly scoped (VITE_* for client, no prefix for server)
- [ ] OAuth tokens encrypted/secured
- [ ] Sensitive data masked in logs
- [ ] CORS configured properly
- [ ] Rate limiting on sensitive endpoints

### 🧪 Core User Flows Testing

#### 1. Sign Up & Onboarding
- [ ] User can sign up with email/password
- [ ] Email verification works
- [ ] Business profile creation works
- [ ] Google Review URL can be set
- [ ] Profile completes successfully
- [ ] User lands on Dashboard after onboarding

#### 2. Subscription & Billing
- [ ] Free trial available (or direct payment)
- [ ] User can select plan
- [ ] Stripe Checkout works
- [ ] Subscription activates after payment
- [ ] User can access all features with active subscription
- [ ] Paywall blocks access without subscription
- [ ] User can open Stripe Customer Portal
- [ ] User can change plan
- [ ] User can update payment method
- [ ] User can cancel subscription

#### 3. Customer Management
- [ ] User can manually add customers
- [ ] CSV import works
- [ ] QuickBooks connection works (OAuth flow)
- [ ] Customers auto-sync from QBO
- [ ] Jobber connection works (OAuth flow)
- [ ] Customers auto-sync from Jobber
- [ ] Customer list displays all sources
- [ ] Customer details page works
- [ ] Manual sync buttons work

#### 4. Journey Creation
- [ ] User can create new journey
- [ ] CRM trigger selection works (QBO, Jobber, Manual)
- [ ] Flow builder works (drag & drop)
- [ ] Can add email steps
- [ ] Can add SMS steps
- [ ] Can add wait/delay steps
- [ ] Per-step message editor works
- [ ] Message templates load correctly
- [ ] Variables resolve properly ({{customer.name}}, etc.)
- [ ] Journey saves successfully
- [ ] Journey activates successfully

#### 5. Automation Triggering
- [ ] Manual enrollment works
- [ ] QuickBooks invoice.paid triggers journey
- [ ] Jobber job_completed triggers journey
- [ ] Customer enrolls in correct sequence
- [ ] Enrollment status tracked properly
- [ ] Multiple enrollments don't conflict

#### 6. Message Sending
- [ ] Email messages send via Resend
- [ ] SMS messages send via Twilio/Surge
- [ ] Messages respect wait/delay times
- [ ] Messages respect quiet hours
- [ ] Variables resolve correctly in message content
- [ ] Tracking links work (if configured)
- [ ] Unsubscribe links work
- [ ] Opt-out mechanism works for SMS

#### 7. Review Collection
- [ ] Review request email received
- [ ] Review request SMS received
- [ ] 4-5 star ratings redirect to Google Reviews
- [ ] 1-3 star ratings collect private feedback
- [ ] Private feedback saves to database
- [ ] QR codes generate correctly
- [ ] QR code scan redirects properly
- [ ] QR feedback form works
- [ ] Feedback appears in Collected Feedback tab

#### 8. Reviews Inbox
- [ ] Can connect Google Business (if integration exists)
- [ ] Reviews display properly
- [ ] Can filter/sort reviews
- [ ] Review metrics display correctly
- [ ] AI reply suggestions work (if enabled)

### 📊 Monitoring & Observability

#### Logging
- [ ] Application logs configured (console, file, or service)
- [ ] Error logs captured
- [ ] Webhook logs captured (delivery, failures)
- [ ] Cron job logs captured
- [ ] User activity logs captured (important actions)

#### Error Monitoring
- [ ] Error tracking configured (Sentry, LogRocket, or similar)
- [ ] Production errors alert team
- [ ] Error boundaries in React app
- [ ] API error responses clear and helpful

#### Performance
- [ ] Page load times acceptable (<3s)
- [ ] API response times acceptable (<1s)
- [ ] Database queries optimized
- [ ] Indexes created for common queries
- [ ] No N+1 query problems

### 📝 Content & Legal

#### User-Facing Content
- [ ] Landing page complete (myblipp.com)
- [ ] Feature descriptions accurate
- [ ] Pricing page up to date
- [ ] Dashboard tab labels clear
- [ ] Help tooltips added where needed
- [ ] Error messages user-friendly

#### Legal Pages
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Cookie policy (if needed)
- [ ] GDPR compliance (if EU users)
- [ ] TCPA compliance (SMS)
- [ ] CAN-SPAM compliance (email)

### 📱 User Experience

#### Design & UI
- [ ] Responsive on mobile (test on real devices)
- [ ] Responsive on tablet
- [ ] Desktop experience polished
- [ ] Loading states for all async actions
- [ ] Empty states for all lists
- [ ] Error states handled gracefully
- [ ] Toast notifications work properly
- [ ] Modals/dialogs accessible (keyboard nav, focus trap)
- [ ] Icons load correctly (lucide-react)

#### Accessibility
- [ ] Semantic HTML used
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader tested (basic flow)
- [ ] Forms have proper labels

### 🔄 Data Integrity

#### Database State
- [ ] All required tables exist
- [ ] Indexes created
- [ ] Foreign keys configured
- [ ] RLS policies active
- [ ] Default values set where needed
- [ ] No orphaned records

#### Data Migration
- [ ] Old crm_connections data migrated (if applicable)
- [ ] User profiles linked to businesses
- [ ] Existing customers preserved
- [ ] Historical review requests intact

### 📦 Backup & Recovery

#### Backup Strategy
- [ ] Supabase daily backups enabled
- [ ] Point-in-time recovery available
- [ ] Backup retention policy set (30+ days)
- [ ] Backup restoration tested once
- [ ] Critical tables identified: businesses, customers, sequences, customer_enrollments

#### Disaster Recovery Plan
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined
- [ ] Incident response plan documented
- [ ] Team contact list updated
- [ ] Rollback plan for deployments

### 🎯 Launch Day Tasks

#### Pre-Launch (1 Hour Before)
- [ ] Verify all cron jobs running
- [ ] Check error logs (should be clean)
- [ ] Smoke test: sign up → onboard → create journey → trigger
- [ ] Verify Stripe is in production mode
- [ ] Verify email/SMS credits are sufficient
- [ ] Clear any test data from production DB
- [ ] Final deployment to Vercel
- [ ] DNS propagation verified (app.myblipp.com)

#### Launch Moment
- [ ] Set production environment variables
- [ ] Enable production domain
- [ ] Turn off maintenance mode (if applicable)
- [ ] Announce launch (social, email, etc.)

#### Post-Launch (First 24 Hours)
- [ ] Monitor error logs continuously
- [ ] Check webhook delivery rates
- [ ] Monitor Stripe events
- [ ] Watch email/SMS delivery rates
- [ ] Check user sign-up flow (live users)
- [ ] Monitor database performance
- [ ] Verify cron jobs executed successfully
- [ ] Check for any RLS policy violations
- [ ] Respond to user feedback/issues quickly

### 🐛 Known Issues & Limitations

#### Documented Limitations
- [ ] Analytics tab shows "Coming Soon" (expected)
- [ ] Only English language support (documented)
- [ ] US-based SMS only (documented)
- [ ] Limited to 2 CRM integrations (QBO + Jobber)

#### Post-Launch Improvements
- [ ] Clean up unused imports (linter warnings)
- [ ] Add prop-types validation
- [ ] Fix React Hooks dependency warnings
- [ ] Optimize bundle size (code splitting)
- [ ] Add comprehensive error boundaries

### 📞 Support Readiness

#### Documentation
- [ ] User onboarding guide created
- [ ] FAQ page created
- [ ] Troubleshooting guide created
- [ ] Integration setup guides (QBO, Jobber)
- [ ] Video tutorials (optional)

#### Support Channels
- [ ] Support email configured (support@myblipp.com)
- [ ] In-app chat/intercom (if applicable)
- [ ] Response time SLA defined
- [ ] Support team trained

### 🎉 Success Metrics

#### Week 1 Goals
- [ ] 10+ users sign up
- [ ] 5+ users complete onboarding
- [ ] 3+ users connect CRM integration
- [ ] 5+ journeys created
- [ ] 20+ messages sent (email + SMS)
- [ ] 10+ review requests delivered
- [ ] Zero critical bugs

#### 30-Day Goals
- [ ] 50+ active users
- [ ] 25+ paying subscribers
- [ ] 100+ journeys created
- [ ] 1000+ messages sent
- [ ] 100+ reviews collected
- [ ] <5% error rate on critical flows
- [ ] 95% webhook delivery success

---

## Launch Approval Sign-Off

### Technical Lead
- [ ] Code review complete
- [ ] Security audit passed
- [ ] Performance acceptable
- [ ] Signed: __________ Date: __________

### Product Owner
- [ ] All core features working
- [ ] User flows tested
- [ ] Content approved
- [ ] Signed: __________ Date: __________

### Business Owner
- [ ] Legal compliance verified
- [ ] Billing configured
- [ ] Support ready
- [ ] Signed: __________ Date: __________

---

## Emergency Contacts

- **Technical Issues:** [Your Email]
- **Supabase Support:** support@supabase.io
- **Stripe Support:** support@stripe.com
- **Vercel Support:** support@vercel.com
- **Resend Support:** help@resend.com
- **Twilio Support:** support@twilio.com

---

## Rollback Plan

If critical issues occur post-launch:

1. **Immediate Actions:**
   - Revert Vercel deployment to previous version
   - Enable maintenance mode if needed
   - Notify active users via email

2. **Database Rollback:**
   - Restore from Supabase backup (if data corruption)
   - Document which version to restore to

3. **Communication:**
   - Post status update on status page
   - Email all users with ETA for fix
   - Update social media channels

4. **Post-Mortem:**
   - Document what went wrong
   - Create action items to prevent recurrence
   - Update deployment checklist

---

**Status: Ready for Launch when all critical items checked** ✅

