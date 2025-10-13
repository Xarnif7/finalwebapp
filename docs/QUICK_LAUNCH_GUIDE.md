# Blipp MVP Quick Launch Guide

**Goal:** Ship your MVP to production and onboard your first free users! 🚀

## TL;DR - What You Need to Do

### 1. ✅ **Code is Ready**
Your codebase builds successfully and all core features are implemented:
- ✅ Customer management (manual, CSV, QBO, Jobber)
- ✅ Journey builder with multi-message flows
- ✅ Email automation (Resend)
- ✅ SMS automation (Twilio/Surge)
- ✅ Review collection (4-5 stars → Google, 1-3 stars → private feedback)
- ✅ QR code generation
- ✅ Stripe billing with customer portal
- ✅ Multi-tenant with RLS security
- ✅ QuickBooks Online integration
- ✅ Jobber CRM integration

### 2. 🔧 **Configure External Services**
You need accounts and API keys for:
- **Supabase** (Database + Auth) - Free tier available
- **Vercel** (Hosting) - Free tier available
- **Stripe** (Billing) - Test mode for free users
- **Resend** (Email) - 100 emails/day free
- **Twilio or Surge** (SMS) - Pay as you go
- **QuickBooks** (Optional for CRM integration)
- **Jobber** (Optional for CRM integration)
- **OpenAI** (Optional for AI features)

### 3. 🚀 **Deploy to Vercel**
- Connect your GitHub repo to Vercel
- Add environment variables
- Deploy!

---

## Step-by-Step Launch Plan

### Phase 1: Free User Launch (Onboard 3-5 Users)
**Timeline:** This week  
**Goal:** Get feedback from real users without money involved

#### What to Set Up:
1. **Supabase** (Required)
   - Create project
   - Run migrations from `supabase/migrations/`
   - Get `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

2. **Vercel** (Required)
   - Connect GitHub repo
   - Add environment variables
   - Deploy to `https://your-app.vercel.app`

3. **Resend** (Required for email)
   - Sign up
   - Verify a sender domain (or use free domain)
   - Get `RESEND_API_KEY`

4. **Skip These for Free Users:**
   - ❌ Stripe (no billing yet)
   - ❌ Twilio/SMS (use email only)
   - ❌ QuickBooks (manual customer entry)
   - ❌ Jobber (manual customer entry)

#### Free User Flow:
1. User signs up → email verification
2. Complete onboarding (business profile)
3. Manually add 2-3 test customers
4. Create simple journey: Manual trigger → Email (Thank You)
5. Manually enroll customer
6. Verify email sends via Resend
7. Collect feedback from user

#### What to Test:
- ✅ Sign up and onboarding
- ✅ Add customers manually
- ✅ Create journey (email only)
- ✅ Send test email
- ✅ Review request flow

---

### Phase 2: Stripe Integration (Start Charging)
**Timeline:** Next week  
**Goal:** Convert free users to paying, onboard 5-10 more

#### Additional Setup:
1. **Stripe**
   - Create production account
   - Create products (Basic, Pro, etc.)
   - Add webhook endpoint
   - Get API keys

2. **Configure Paywall**
   - Set `VITE_STRIPE_BASIC_PRICE_ID` etc.
   - Set `STRIPE_SECRET_KEY`
   - Set `STRIPE_WEBHOOK_SECRET`

3. **Test Flow:**
   - New user signs up
   - Hits paywall
   - Completes Stripe checkout
   - Subscription activates
   - Gets full access

---

### Phase 3: SMS + CRM Integrations (Full MVP)
**Timeline:** 2-3 weeks out  
**Goal:** Full-featured platform

#### Additional Setup:
1. **Twilio/Surge SMS**
   - Get API credentials
   - Provision phone number
   - Test SMS delivery

2. **QuickBooks Online**
   - Create production app
   - Get OAuth credentials
   - Test connection + customer sync

3. **Jobber**
   - Create OAuth app
   - Get credentials
   - Test connection + sync

4. **OpenAI** (Optional)
   - Get API key for AI features

---

## Minimum Viable Environment Variables

### For Free User Testing (Phase 1):
```bash
# Supabase (REQUIRED)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend Email (REQUIRED)
RESEND_API_KEY=re_your_key

# Site Configuration
VITE_SITE_URL=https://your-app.vercel.app
APP_BASE_URL=https://your-app.vercel.app
VITE_APP_BASE_URL=https://your-app.vercel.app
```

### For Paid Users (Phase 2):
Add these to Phase 1:
```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
VITE_STRIPE_BASIC_PRICE_ID=price_xxx
VITE_STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### For Full MVP (Phase 3):
Add these to Phase 2:
```bash
# SMS
SURGE_API_KEY=your_surge_key
# OR
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# QuickBooks
QBO_CLIENT_ID=your_qbo_id
QBO_CLIENT_SECRET=your_qbo_secret
QBO_REDIRECT_URI=https://your-app.vercel.app/api/qbo/oauth/callback

# Jobber
JOBBER_CLIENT_ID=your_jobber_id
JOBBER_CLIENT_SECRET=your_jobber_secret
JOBBER_REDIRECT_URI=https://your-app.vercel.app/api/crm/jobber/callback

# OpenAI (Optional)
OPENAI_API_KEY=sk-xxx
```

---

## Vercel Deployment Steps

### 1. Connect Repository
```bash
# Make sure code is pushed to GitHub
git add .
git commit -m "Ready for MVP launch"
git push origin main
```

### 2. Create Vercel Project
- Go to vercel.com
- Click "Import Project"
- Select your GitHub repo
- Configure:
  - Framework: Vite
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Install Command: `npm install`

### 3. Add Environment Variables
In Vercel dashboard:
- Settings → Environment Variables
- Add all variables from above (start with Phase 1 minimum)
- Make sure to add them to "Production" environment

### 4. Deploy
- Click "Deploy"
- Wait for build to complete
- Visit your new URL: `https://your-app.vercel.app`

### 5. Test Deployment
- Sign up with a test account
- Complete onboarding
- Add a customer
- Create a simple journey
- Send a test message
- Verify email arrives

---

## Supabase Setup Steps

### 1. Create Project
- Go to supabase.com
- Create new project
- Note your project URL and anon key

### 2. Run Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

**OR** manually run SQL migrations:
- Go to Supabase Dashboard → SQL Editor
- Copy/paste each file from `supabase/migrations/`
- Run in chronological order

### 3. Configure Auth
- Go to Authentication → Settings
- Set Site URL: `https://your-app.vercel.app`
- Add redirect URLs:
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app.vercel.app/dashboard`
- Enable email provider
- Configure email templates (optional)

### 4. Test Connection
```bash
# From your local machine
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY'
);
supabase.from('businesses').select('count').then(console.log);
"
```

---

## Free User Onboarding Script

Use this script for your first 3-5 users:

### Pre-Onboarding (You Do This):
1. Deploy app to Vercel ✅
2. Test sign-up flow yourself ✅
3. Create a test journey ✅
4. Send yourself a test email ✅

### Onboarding Call with User (30 min):
**Introduction (5 min)**
- "Welcome to Blipp! This is an early MVP, so we're giving you free access in exchange for feedback."
- "The goal today is to get you sending your first automated review request."

**Account Setup (5 min)**
- Help user sign up
- Help complete business profile
- Set Google Review URL (if they have one)

**Add Customers (10 min)**
- Help manually add 2-3 recent customers
- Show CSV import (if they have a spreadsheet)

**Create First Journey (10 min)**
- Walk through journey builder
- Create simple: Manual Trigger → Email (Thank You + Review Request)
- Customize message with their business name
- Activate journey

**Send Test (5 min)**
- Manually enroll one test customer (themselves)
- Show email arrives
- Show review link works

**Next Steps**
- "Try this with 2-3 real customers this week"
- "I'll check in with you in 3 days"
- "Share any feedback or bugs you find"

### Follow-Up (3 Days Later):
- Email: "Hey [Name], how's Blipp working for you?"
- Ask: What worked? What confused you? What's missing?
- Offer: Another call to answer questions

---

## Success Metrics for Free Users

### Week 1:
- 3-5 users signed up ✅
- Each user has sent 1+ message ✅
- Zero critical bugs reported ✅
- Users understand the basic flow ✅

### Week 2:
- Users sending messages without help ✅
- At least 1 user has collected a review ✅
- Feature requests documented ✅
- Ready to add Stripe ✅

---

## Common Issues & Fixes

### Issue: Emails Not Sending
**Fix:**
- Check Resend API key is correct
- Check sender domain is verified
- Check Vercel environment variables
- Check Vercel function logs

### Issue: Sign Up Not Working
**Fix:**
- Check Supabase project is active
- Check auth redirect URLs configured
- Check VITE_SUPABASE_URL is correct
- Check email confirmation is not blocking

### Issue: Journey Not Triggering
**Fix:**
- Check journey status is "active"
- Check cron job is running (Vercel cron configured)
- Check customer is enrolled in journey
- Check enrollment status in database

### Issue: "Business Access Error"
**Fix:**
- User needs to complete onboarding
- Check `profiles.business_id` is set
- Check `businesses` table has entry
- Check RLS policies allow access

---

## Ready to Launch?

### ✅ Pre-Launch Checklist (Minimum for Phase 1):
- [ ] Code builds successfully (`npm run build`)
- [ ] Supabase project created
- [ ] Migrations applied to Supabase
- [ ] Resend account created
- [ ] Vercel project connected
- [ ] Environment variables added to Vercel
- [ ] Deployed to Vercel
- [ ] Tested sign-up flow
- [ ] Tested journey creation
- [ ] Tested email sending
- [ ] 3-5 users identified to onboard

### 🚀 Launch Command:
```bash
# Final check
npm run build

# Commit
git add .
git commit -m "MVP Launch - Phase 1: Free Users"

# Push (this will auto-deploy to Vercel)
git push origin main
```

### 🎉 You're Live!
Share your app URL with your first users and start collecting feedback!

---

## Need Help?

1. Check the full checklist: `docs/MVP_LAUNCH_CHECKLIST.md`
2. Review the ledger for recent changes: `docs/ledger.md`
3. Check the data model: `docs/data-model.md`
4. Review integration guides in `docs/` folder

**Remember:** Start small, get feedback, iterate quickly. You don't need all features perfect on day 1! 🚀

