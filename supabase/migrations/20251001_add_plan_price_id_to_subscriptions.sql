-- Add plan_price_id column to subscriptions table
-- This column stores the Stripe price ID for the current plan
-- Required for webhook sync when subscription plans change

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS plan_price_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_price_id 
ON subscriptions(plan_price_id);

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.plan_price_id IS 'Stripe price ID (e.g., price_1Rvn5oFr7CPBk7jl2CryiFFX) for the current subscription plan';

