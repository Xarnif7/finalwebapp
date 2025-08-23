# API Setup Guide

## Overview
This project uses Vercel serverless functions for API endpoints. The API endpoints are located in the `/api` directory.

## Required Environment Variables

### Frontend (.env.local)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Backend (Vercel Environment Variables)
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
APP_BASE_URL=https://your-domain.com
STRIPE_PRICE_BASIC=price_basic_id
STRIPE_PRICE_PRO=price_pro_id
STRIPE_PRICE_ENTERPRISE=price_enterprise_id
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## API Endpoints

### 1. Subscription Status
- **Path**: `/api/subscription/status`
- **Method**: GET
- **Auth**: Bearer token required
- **Purpose**: Check user's subscription status

### 2. Stripe Checkout
- **Path**: `/api/stripe/checkout`
- **Method**: POST
- **Auth**: Bearer token required
- **Purpose**: Create Stripe checkout session

### 3. Stripe Webhook
- **Path**: `/api/stripe/webhook`
- **Method**: POST
- **Auth**: Stripe signature verification
- **Purpose**: Handle Stripe webhook events

## Local Development

1. Install dependencies:
```bash
cd api
npm install
```

2. Set up environment variables in your local environment

3. Test endpoints:
```bash
node test-api.js
```

## Deployment

1. Deploy to Vercel:
```bash
vercel --prod
```

2. Set up Stripe webhook:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`

## Database Tables

### subscriptions
- `user_id` (UUID, references auth.users)
- `stripe_subscription_id` (text)
- `plan_tier` (text: 'basic', 'pro', 'enterprise')
- `status` (text: 'active', 'canceled', 'past_due', etc.)
- `current_period_end` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### profiles
- `id` (UUID, references auth.users)
- `onboarding_completed` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### businesses
- `id` (UUID)
- `created_by` (text, user email)
- `onboarding_completed` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)
